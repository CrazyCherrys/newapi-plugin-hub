import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../plugin.js', import.meta.url), 'utf8');
const plugin = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const golden = JSON.parse(await readFile(new URL('./golden.json', import.meta.url), 'utf8'));

for (const fixture of golden.cases) {
  test(fixture.name, () => {
    let hook = plugin[fixture.hook];
    for (const part of fixture.path ?? []) hook = hook[part];
    if (fixture.expectedError) {
      assert.throws(() => hook(...fixture.args), error => error.message.includes(fixture.expectedError));
    } else {
      assert.deepEqual(hook(...fixture.args), fixture.expected);
    }
  });
}

const model = 'metaso-minimax-h3';
const { decodeRequest, render } = plugin.protocols.openai_video;

function decode(value) {
  return decodeRequest({ model, operation: 'create', body: { kind: 'json', value } });
}

function image(role, url = 'https://cdn.example.com/ref.png') {
  return { type: 'image_url', role, image_url: { url } };
}

test('all four size presets map to the documented resolution and ratio', () => {
  const presets = [
    ['1280x720', '768P', '16:9'],
    ['720x1280', '768P', '9:16'],
    ['1792x1024', '2K', '16:9'],
    ['1024x1792', '2K', '9:16'],
  ];
  for (const [size, resolution, ratio] of presets) {
    const { requestBody } = decode({ size, prompt: 'A flower opening', seconds: 15 });
    assert.equal(requestBody.resolution, resolution, size);
    assert.equal(requestBody.ratio, ratio, size);
    assert.equal(requestBody.duration, 15);
  }
  const upstreamExample = decode({
    prompt: 'A flower opening',
    metadata: { metaso_resolution: '2K', metaso_ratio: '16:9' },
  });
  assert.equal(upstreamExample.requestBody.ratio, '16:9');
  assert.equal(plugin.extractUsage(upstreamExample).resolution, '2K');
  assert.throws(() => decode({ size: '1280x720', resolution: '2K', prompt: 'A flower opening' }), /size conflicts/);
  assert.throws(() => decode({ resolution: '4K', prompt: 'A flower opening' }), /resolution must be 768P or 2K/);
  for (const seconds of [3, 16, 6.5, true]) {
    assert.throws(() => decode({ seconds, prompt: 'A flower opening' }), /seconds must be an integer/);
  }
});

test('standard prompt precedes reference content and five images are free', () => {
  const refs = ['1', '2', '3', '4'].map(id => image('reference_image', `mm_file://${id}`));
  const intent = decode({
    prompt: 'Animate only the foreground',
    input_reference: { file_id: '18446744073709551615' },
    metadata: { metaso_content: refs },
  });
  assert.equal(intent.action, 'image_to_video');
  assert.deepEqual(intent.requestBody.content, [
    { type: 'text', text: 'Animate only the foreground' },
    ...refs,
    image('reference_image', 'mm_file://18446744073709551615'),
  ]);
  assert.deepEqual(plugin.extractUsage(intent), { seconds: 4, resolution: '768P', image_count_after_free: 0 });
  assert.deepEqual(Object.keys(plugin.meta.usageSchema).sort(), Object.keys(plugin.extractUsage(intent)).sort());
  assert.throws(() => decode({ prompt: 'Animate the still', input_reference: { file_id: 2 ** 60 } }), /Invalid reference file ID/);
});

test('invalid references, reordered keyframes and excessive image counts are rejected', () => {
  const withReferences = (refs) => decode({ prompt: 'Animate the still', metadata: { metaso_content: refs } });
  assert.throws(() => withReferences([image('reference_image', 'ftp://cdn.example.com/ref.jpg')]), /requires an HTTP\(S\) URL/);
  assert.throws(() => withReferences([image('last_frame'), image('first_frame')]), /must precede/);
  const nineImages = Array.from({ length: 9 }, (_, index) => image('reference_image', `mm_file://${index + 1}`));
  assert.equal(plugin.extractUsage(withReferences(nineImages)).image_count_after_free, 4);
  assert.throws(() => withReferences([...nineImages, image('reference_image')]), /At most nine/);
});

test('multipart audio uses the data URL placeholder and rejects video files before pricing', () => {
  const fields = { prompt: ['Match the motion to the beat'] };
  const submit = file => decodeRequest({ model, operation: 'create', body: { kind: 'multipart', fields, files: [file] } });
  const intent = submit({ field: 'reference_audio', ref: 'file-1', size: 8, mimeType: 'audio/mpeg' });
  assert.equal(intent.action, 'multimodal_to_video');
  assert.deepEqual(intent.requestBody.content[1], {
    type: 'audio_url', role: 'reference_audio',
    audio_url: { url: { __fileRef: 'file-1', encoding: 'dataUrl', mimeType: 'audio/mpeg', maxBytes: 15728640 } },
  });
  assert.throws(() => submit({ field: 'reference_video', ref: 'file-1', size: 8, mimeType: 'video/mp4' }), /requires host-side duration measurement/);
});

test('completion ignores unrecognized or out-of-range metering data', () => {
  const result = { status: 'SUCCESS' };
  assert.deepEqual(plugin.extractUsageOnComplete({}, result, { task: { duration: 16, resolution: '4K' } }), {});
  assert.deepEqual(plugin.extractUsageOnComplete({}, result, { task: { duration: '12', resolution: '4K' } }), { seconds: 12 });
  assert.deepEqual(plugin.extractUsageOnComplete({}, result, { task: { duration: 3, resolution: '2K' } }), { resolution: '2K' });
});

test('pending, running, and successful tasks publish the appropriate artifact state', () => {
  const url = 'https://cdn.example.com/result.mp4';
  const data = { task: { status: 'completed', content: { url } } };
  assert.deepEqual(plugin.parseTaskResult({}, { task: { status: 'pending' } }), { status: 'QUEUED', progress: '0%' });
  assert.deepEqual(plugin.parseTaskResult({}, { task: { status: 'running', progress: 40 } }), { status: 'IN_PROGRESS', progress: '40%' });
  assert.deepEqual(plugin.parseTaskResult({}, data), { status: 'SUCCESS', progress: '100%' });
  assert.deepEqual(plugin.parseTaskResult({}, { status: 'done', content: { url } }), { status: 'SUCCESS', progress: '100%' });
  assert.deepEqual(plugin.parseTaskResult({}, { status: 'expired' }),
    { status: 'FAILURE', progress: '100%', reason: 'Video generation failed' });
  assert.deepEqual(plugin.listArtifacts({ status: 'IN_PROGRESS', data }), []);
  assert.deepEqual(plugin.listArtifacts({ status: 'SUCCESS', data }), [{ key: 'video', type: 'video', mimeType: 'video/mp4' }]);
  assert.deepEqual(plugin.parseTaskResult({}, { task: { status: 'completed', content: { url: 'file:///tmp/test.mp4' } } }),
    { status: 'FAILURE', progress: '100%', reason: 'Video generation failed' });
  assert.throws(() => plugin.buildContentRequest({ data, artifactKey: 'thumbnail' }), /artifact_not_found/);
});

test('immediate terminal transitions can settle without leaking vendor details', () => {
  const url = 'https://cdn.example.com/result.mp4';
  const body = {
    request_id: 'provider-fixture',
    task: { id: 'upstream-id', status: 'succeeded', duration: 6, resolution: '2K', content: { url }, internal: 'provider-fixture' },
  };
  assert.deepEqual(plugin.parseSubmitResponse({}, { body }), {
    taskId: 'upstream-id',
    taskData: { status: 'succeeded', duration: 6, resolution: '2K', content: { url } },
    immediate: { status: 'SUCCESS', progress: '100%' },
  });
  const failed = { task_id: 'public-id', status: 'FAILURE', progress: '100%', fail_reason: 'provider-fixture' };
  assert.deepEqual(render({}, failed).error, { code: 'video_generation_failed', message: 'Video generation failed' });
});

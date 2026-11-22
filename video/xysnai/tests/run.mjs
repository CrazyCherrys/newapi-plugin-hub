// Offline hook-contract tests. No HTTP calls and no live generation charges.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const source = await fs.readFile(new URL('../plugin.js', import.meta.url), 'utf8');
const plugin = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const catalog = JSON.parse(await fs.readFile(new URL('../model-catalog.json', import.meta.url), 'utf8'));
const summary = JSON.parse(await fs.readFile(new URL('./test-summary.json', import.meta.url), 'utf8'));
const examples = await Promise.all(['minimax', 'wan', 'sd', 'mg', 'upscale'].map(async name =>
  JSON.parse(await fs.readFile(new URL('../examples/' + name + '.json', import.meta.url), 'utf8'))));
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  process.stdout.write('PASS ' + name + '\n');
}
function decode(model, payload, extra = {}) {
  return plugin.protocols.openai_video.decodeRequest({
    model: model, upstreamModel: model,
    protocol: 'openai_video', operation: 'create', method: 'POST', path: '/v1/videos',
    body: { kind: 'json', value: { model: model, ...payload } }, ...extra
  });
}
function driver(model, payload, extra = {}) {
  const intent = decode(model, payload);
  return {
    model: intent.model, upstreamModel: intent.model, action: intent.action,
    baseUrl: 'https://xysnai.cn/', apiKey: 'test-channel-key', authHeader: 'test-channel-key',
    requestBody: intent.requestBody, files: [], upstream: { kind: 'vendor' }, ...extra
  };
}
function profile(model) {
  return plugin.meta.usageProfiles.find(p => p.models.includes(model))?.schema || plugin.meta.usageSchema;
}
function assertUsage(model, facts) {
  const schema = profile(model);
  for (const [name, value] of Object.entries(facts)) {
    assert.ok(Object.hasOwn(schema, name), name + ' missing from schema for ' + model);
    const rule = schema[name];
    if (rule.enum) assert.ok(rule.enum.includes(value), 'Bad enum ' + name);
    else if (rule.type === 'number') {
      assert.equal(typeof value, 'number');
      assert.ok(Number.isFinite(value) && value >= 0);
      if (rule.unit === 'second') assert.ok(value <= 3600);
      if (rule.unit === 'count') assert.ok(value <= 128);
    }
  }
}

test('Hub catalog, published source checksum and request examples match the plugin', () => {
  assert.equal(createHash('sha256').update(source).digest('hex'), summary.sha256);
  assert.deepEqual(catalog.models.map(m => m.public_model).sort(), plugin.meta.models.toSorted());
  for (const example of examples) {
    const model = example.model;
    assert.equal(plugin.buildSubmitRequest(driver(model, example)).body.model, model);
  }
});
test('manifest declares 19 upstream model names, one protocol, and no legacy channel takeover', () => {
  assert.equal(plugin.meta.key, 'crazycherrys_xysnai-video');
  assert.equal(plugin.meta.name, 'DreamStudio Video');
  assert.equal(plugin.meta.version, '1.3.1');
  assert.equal(plugin.meta.author.name, 'CrazyCherrys');
  assert.equal(plugin.meta.author.url, 'https://github.com/CrazyCherrys');
  assert.equal(plugin.meta.models.length, 19);
  assert.equal(new Set(plugin.meta.models).size, 19);
  assert.deepEqual(plugin.meta.protocols, ['openai_video']);
  assert.equal(plugin.meta.channelTypes, undefined);
  assert.deepEqual(plugin.meta.upstreams, ['vendor']);
  const profiled = plugin.meta.usageProfiles.flatMap(p => p.models);
  assert.equal(new Set(profiled).size, 19);
  assert.deepEqual(profiled.toSorted(), plugin.meta.models.toSorted());
});
test('public models and pricing profiles use upstream names without a provider prefix', () => {
  assert.deepEqual(plugin.meta.models.toSorted(), catalog.models.map(m => m.upstream_model).sort());
  assert.ok(plugin.meta.models.every(model => !model.includes('/')));
  for (const profile of plugin.meta.usageProfiles) {
    assert.ok(profile.models.every(model => !model.includes('/')));
  }
  const payload = { prompt: 'cat', seconds: 5, size: '1376x768' };
  assert.throws(() => decode('xysnai/minimax-h3', payload), /Unsupported XYSNAI model/);
  const ctx = driver('minimax-h3', payload);
  assert.throws(() => plugin.buildSubmitRequest({ ...ctx, upstreamModel: 'xysnai/minimax-h3' }), /Unsupported XYSNAI model/);
  const submit = plugin.buildSubmitRequest(ctx);
  assert.equal(submit.body.model, 'minimax-h3');
  assert.equal(submit.rewriteModel, 'minimax-h3');
});
test('H3 accepts numeric and string seconds, sends a number, preserves arrays/false/zero/extra fields', () => {
  for (const seconds of [5, '5']) {
    const payload = { prompt: 'cat', seconds, size: '1376x768', images: ['https://example.com/a.jpg'],
      prompt_enhance: false, seed: 0, custom: { nested: [1, false] } };
    const ctx = driver('minimax-h3', payload);
    const output = plugin.buildSubmitRequest(ctx);
    assert.equal(output.url, 'https://xysnai.cn/v1/videos');
    assert.equal(output.body.model, 'minimax-h3');
    assert.equal(output.body.seconds, 5);
    assert.equal(output.body.prompt_enhance, false);
    assert.equal(output.body.seed, 0);
    assert.deepEqual(output.body.custom, payload.custom);
    assert.deepEqual(output.body.images, payload.images);
    assert.equal(output.headers.Authorization, 'Bearer test-channel-key');
    const usage = plugin.extractUsage(ctx);
    assert.equal(usage.seconds, 5);
    assert.equal(usage.size, '1376x768');
    assert.equal(usage.input_images, 1);
    assertUsage(ctx.model, usage);
  }
});
test('all 26 documented H3 sizes pass request and usage validation', () => {
  const sizes = profile('minimax-h3').size.enum;
  assert.equal(sizes.length, 26);
  for (const size of sizes) {
    const ctx = driver('minimax-h3', { prompt: 'cat', seconds: 5, size });
    assert.equal(plugin.buildSubmitRequest(ctx).body.size, size);
    const usage = plugin.extractUsage(ctx);
    assertUsage(ctx.model, usage);
    assert.ok(usage.resolution, size + ' is missing its pricing tier');
  }
  assert.throws(() => driver('minimax-h3', { prompt: 'cat', seconds: 5, size: '768P' }), /size/);
});
test('H3 defaults and common size aliases are reflected in both upstream requests and usage', () => {
  const cases = [
    [undefined, '768x1376', '768P'],
    ['1280x720', '1376x768', '768P'], ['720x1280', '768x1376', '768P'],
    ['1792x1024', '1920x1088', '1080P'], ['1024x1792', '1088x1920', '1080P'],
    ['1920x1080', '1920x1088', '1080P'], ['1080x1920', '1088x1920', '1080P']
  ];
  for (const [clientSize, size, resolution] of cases) {
    const ctx = driver('minimax-h3', { prompt: 'cat', size: clientSize });
    const result = plugin.buildSubmitRequest(ctx);
    assert.equal(result.body.seconds, 4);
    assert.equal(result.body.size, size);
    const facts = plugin.extractUsage({ ...ctx, usagePurpose: 'facts' });
    assert.equal(facts.seconds, result.body.seconds);
    assert.equal(facts.size, result.body.size);
    assert.equal(facts.resolution, resolution);
  }
  for (const size of [null, '', ['1280x720'], 'foo', '1920X1080', '1366x768', 'constructor']) {
    assert.throws(() => driver('minimax-h3', { prompt: 'cat', size }), /size/);
  }
  assert.throws(() => driver('wan3.0-video', { resolution: '720P' }), /seconds/);
});
test('H3 converts standard JSON image objects to billable images without altering the caller object', () => {
  const imageUrl = 'https://example.com/ref.jpg?sig=example%2Baccess';
  const original = { prompt: 'cat', seconds: '8', size: '1280x720', input_reference: { image_url: imageUrl } };
  for (const model of ['minimax-h3', 'minimax-h3-lh']) {
    const ctx = driver(model, original);
    const request = plugin.buildSubmitRequest(ctx);
    assert.equal(ctx.action, 'reference_to_video');
    assert.deepEqual(request.body, { model, prompt: 'cat', seconds: 8, size: '1376x768', images: [imageUrl] });
    const facts = plugin.extractUsage({ ...ctx, usagePurpose: 'facts' });
    assert.equal(facts.input_images, 1);
    assert.equal(facts.input_references, 0);
    assert.equal(facts.seconds, 8);
  }
  assert.deepEqual(original.input_reference, { image_url: imageUrl });
  assert.throws(() => driver('minimax-h3-fl2v', original), /first or last frames/);
  assert.throws(() => driver('minimax-h3', { ...original, images: [imageUrl] }), /use either/);
  for (const input_reference of [{ file_id: 'file-1' }, { image_url: imageUrl, file_id: 'file-1' },
    { image_url: 'data:image/png;base64,Zg==' }, { image_url: 'https://user@example.com/ref' }, { image_url: 'https://a.test/a\n.png' }]) {
    assert.throws(() => driver('minimax-h3', { ...original, input_reference }), /image_url/);
  }
  const legacy = driver('minimax-h3', { ...original, input_reference: imageUrl });
  assert.equal(plugin.buildSubmitRequest(legacy).body.input_reference, imageUrl);
  assert.equal(plugin.extractUsage(legacy).input_references, 1);
});
test('H3 honours documented optional fields and reports billable dimensions without legacy multipliers', () => {
  const payload = { prompt: 'cat', seconds: 5, size: '1568x672', aspect_ratio: '21:9', mode: 'example',
    images: Array.from({ length: 6 }, (_, i) => `https://example.com/${i}.png`),
    reference_video: 'https://example.com/input.mp4', input_reference: 'https://example.com/media' };
  const ctx = driver('minimax-h3', payload);
  assert.equal(plugin.buildSubmitRequest(ctx).body.aspect_ratio, '21:9');
  assert.equal(plugin.buildSubmitRequest(ctx).body.mode, 'example');
  const facts = plugin.extractUsage({ ...ctx, usagePurpose: 'facts' });
  assert.deepEqual(facts, { requests: 1, input_images: 6, input_videos: 1, input_audios: 0,
    input_references: 1, seconds: 5, size: '1568x672', resolution: '768P' });
  assert.equal(plugin.extractUsage({ ...ctx, usagePurpose: 'billing_ratios' }), null);
  assert.deepEqual(plugin.extractUsageOnComplete(ctx, { status: 'SUCCESS' }, { cost: '0.40' }), {});
  const knownSizes = [['640x640', '480P'], ['1024x1024', '768P'], ['1440x1440', '1080P'], ['2K', '2K'], ['4K', '4K']];
  for (const [size, tier] of knownSizes) {
    assert.equal(plugin.extractUsage(driver('minimax-h3', { ...payload, size })).resolution, tier);
  }
  for (const field of ['images', 'reference_videos', 'reference_audios']) {
    assert.throws(() => decode('minimax-h3', { ...payload, [field]: [] }), /at least 1 reference/);
  }
  assert.throws(() => decode('minimax-h3', { ...payload, aspect_ratio: 'adaptive' }), /aspect_ratio/);
  assert.throws(() => decode('minimax-h3', { ...payload, mode: 7 }), /mode must be a string/);
});
test('all 19 model examples build one common create route with valid profile facts', () => {
  for (const model of plugin.meta.models) {
    let req;
    if (model === 'wan3.0-video') req = { seconds: 5, resolution: '720P', generate_audio: false, seed: 0 };
    else if (model.startsWith('minimax-h3')) req = { prompt: 'cat', seconds: 5, size: '1376x768' };
    else if (model.startsWith('sd-')) req = { prompt: 'cat', seconds: 5, resolution: '720p' };
    else if (model === 'Video-upscale2.6') req = { reference_video: 'https://example.com/in.mp4', scale: 2, enhancement_strength: 1 };
    else req = { prompt: 'cat', seconds: 5, aspect_ratio: '16:9' };
    const ctx = driver(model, req);
    const upstream = plugin.buildSubmitRequest(ctx);
    assert.equal(upstream.url, 'https://xysnai.cn/v1/videos');
    assert.equal(upstream.body.model, model);
    assertUsage(ctx.model, plugin.extractUsage(ctx));
  }
});
test('explicit invalid durations are rejected without clamping or defaulting', () => {
  for (const seconds of [null, true, [], ['5'], '', 0, -1, 3, 16, 5.5, Infinity, 'NaN']) {
    assert.throws(() => driver('minimax-h3', { prompt: 'cat', seconds, size: '1376x768' }), /seconds/);
  }
  for (const seconds of [2, 30]) assert.doesNotThrow(() => driver('wan3.0-video', { seconds, resolution: '480P' }));
});
test('Wan and sd keep distinct documented resolution spelling and media fields', () => {
  const wan = plugin.buildSubmitRequest(driver('wan3.0-video', {
    seconds: 5, resolution: '720P', first_image: 'https://example.com/first.png',
    last_image: 'https://example.com/last.png', reference_images: ['https://example.com/ref.png'],
    reference_audios: ['https://example.com/ref.mp3'], reference_videos: ['https://example.com/ref.mp4'],
    aspect_ratio: 'adaptive', watermark: false, prompt_extend: false
  })).body;
  assert.equal(wan.resolution, '720P');
  assert.equal(wan.watermark, false);
  assert.equal(wan.prompt_extend, false);
  assert.equal(wan.reference_videos.length, 1);
  assert.throws(() => driver('wan3.0-video', { seconds: 5, resolution: '720p' }), /resolution/);
  assert.throws(() => driver('sd-2.5', { prompt: 'cat', seconds: 5, resolution: '720P' }), /resolution/);
});
test('Seedance fixed-tier models do not inject Sora defaults', () => {
  const ctx = driver('mg-seedance-2.5-720p', { prompt: 'cat', seconds: 5, aspect_ratio: '16:9',
    reference_image_urls: ['https://example.com/1.jpg', 'https://example.com/2.jpg'], quality: 'high' });
  const req = plugin.buildSubmitRequest(ctx).body;
  assert.equal(req.size, undefined);
  assert.equal(req.resolution, undefined);
  assert.equal(req.reference_image_urls.length, 2);
  assert.equal(plugin.extractUsage(ctx).quality, 'high');
});
test('audio pricing distinguishes omitted, enabled, and disabled without changing upstream defaults', () => {
  for (const [value, expected] of [[undefined, 'unspecified'], [true, 'on'], [false, 'off']]) {
    const payload = { seconds: 5, resolution: '720P' };
    if (value !== undefined) payload.generate_audio = value;
    const ctx = driver('wan3.0-video', payload);
    assert.equal(plugin.extractUsage(ctx).audio_mode, expected);
    assert.equal(plugin.buildSubmitRequest(ctx).body.generate_audio, value);
    assertUsage(ctx.model, plugin.extractUsage(ctx));
  }
  assert.throws(() => driver('wan3.0-video', { seconds: 5, resolution: '720P', generate_audio: 'false' }), /boolean/);
});
test('multipart preserves repeated strings, JSON-array strings, file refs, filenames, and false/zero text', () => {
  const files = [
    { ref: 'opaque-file-1', field: 'reference_images', filename: '一.png', mimeType: 'image/png', size: 500 },
    { ref: 'opaque-file-2', field: 'reference_images', filename: 'two.png', mimeType: 'image/png', size: 500 },
    { ref: 'opaque-video', field: 'reference_videos', filename: 'in.mp4', mimeType: 'video/mp4', size: 500 }
  ];
  const fields = { model: ['wan3.0-video'], seconds: ['5'], resolution: ['720P'],
    reference_images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    reference_audios: ['["https://example.com/a.mp3","https://example.com/b.mp3"]'],
    watermark: ['false'], seed: ['0'], custom: ['one', 'two'] };
  const intent = decode('wan3.0-video', {}, { body: { kind: 'multipart', fields, files } });
  const ctx = { ...driver('wan3.0-video', { seconds: 5, resolution: '720P' }), requestBody: intent.requestBody, files };
  const req = plugin.buildSubmitRequest(ctx);
  assert.equal(req.bodyType, 'multipart');
  assert.equal(req.headers['Content-Type'], undefined);
  assert.deepEqual(req.parts.filter(p => p.name === 'reference_images').map(p => p.value || p.fileRef),
    ['https://example.com/a.jpg', 'https://example.com/b.jpg', 'opaque-file-1', 'opaque-file-2']);
  assert.equal(req.parts.find(p => p.name === 'model').value, 'wan3.0-video');
  assert.equal(req.parts.find(p => p.name === 'watermark').value, 'false');
  assert.equal(req.parts.find(p => p.name === 'seed').value, '0');
  assert.deepEqual(req.parts.filter(p => p.name === 'custom').map(p => p.value), ['one', 'two']);
  assert.equal(req.parts.find(p => p.name === 'reference_audios').value, fields.reference_audios[0]);
  assert.equal(req.parts.find(p => p.fileRef === 'opaque-file-1').filename, '一.png');
  const usage = plugin.extractUsage(ctx);
  assert.equal(usage.input_images, 4);
  assert.equal(usage.input_videos, 1);
  assert.equal(usage.input_audios, 2);
  assertUsage(ctx.model, usage);
});
test('multipart without files still preserves form representation and repeated values', () => {
  const fields = { model: ['mg-seedance-2.5-720p'], prompt: ['cat'], seconds: ['5'], aspect_ratio: ['16:9'],
    reference_image_urls: ['https://example.com/1.png', 'https://example.com/2.png'] };
  const intent = decode('mg-seedance-2.5-720p', {}, { body: { kind: 'multipart', fields, files: [] } });
  const ctx = { ...driver('mg-seedance-2.5-720p', { prompt: 'cat', seconds: 5, aspect_ratio: '16:9' }), requestBody: intent.requestBody };
  assert.equal(plugin.buildSubmitRequest(ctx).parts.filter(p => p.name === 'reference_image_urls').length, 2);
});
test('multipart rejects ambiguous scalar aliases so usage matches the transmitted values', () => {
  const fields = { model: ['minimax-h3'], prompt: ['cat'], seconds: ['5'],
    size: ['1376x768'], 'size[]': ['2K'] };
  assert.throws(() => decode('minimax-h3', {}, { body: { kind: 'multipart', fields, files: [] } }), /provided once/);
});
test('H3 multipart sends the same default dimensions and image that are used for pricing', () => {
  const model = 'minimax-h3';
  const imageUrl = 'https://example.com/ref.jpg';
  const base = { kind: 'multipart', fields: { model: [model], prompt: ['cat'], size: ['1280x720'],
    'input_reference[image_url]': [imageUrl] }, files: [] };
  const context = body => ({ ...driver(model, { prompt: 'cat' }), files: body.files,
    requestBody: decode(model, {}, { body }).requestBody });
  const ctx = context(base);
  const parts = plugin.buildSubmitRequest(ctx).parts;
  assert.deepEqual(Object.fromEntries(parts.map(p => [p.name, p.value])),
    { model, prompt: 'cat', size: '1376x768', images: imageUrl, seconds: '4' });
  const facts = plugin.extractUsage(ctx);
  assert.equal(facts.size, '1376x768');
  assert.equal(facts.seconds, 4);
  assert.equal(facts.input_images, 1);
  assert.equal(facts.input_references, 0);
  const ref = { ref: 'file:input_reference:0', field: 'input_reference', filename: 'ref.jpg', mimeType: 'image/jpeg', size: 100 };
  const native = context({ kind: 'multipart', fields: { model: [model], prompt: ['cat'] }, files: [ref] });
  const sent = plugin.buildSubmitRequest(native).parts;
  assert.ok(sent.some(p => p.name === 'size' && p.value === '768x1376'));
  assert.ok(sent.some(p => p.name === 'seconds' && p.value === '4'));
  assert.ok(sent.some(p => p.name === ref.field && p.fileRef === ref.ref));
  assert.equal(plugin.extractUsage(native).input_references, 1);
  assert.throws(() => context({ ...base, files: [ref] }), /use either/);
  assert.throws(() => context({ ...base, fields: { ...base.fields, 'input_reference[file_id]': ['file-1'] } }), /exactly one image_url/);
});
test('documented media limits count files plus URL references', () => {
  const fields = { model: ['minimax-h3'], prompt: ['cat'], seconds: ['5'], size: ['1376x768'],
    images: Array.from({ length: 9 }, (_, i) => 'https://example.com/' + i + '.png') };
  assert.throws(() => decode('minimax-h3', {}, { body: { kind: 'multipart', fields,
    files: [{ ref: 'opaque', field: 'images', filename: 'extra.png', mimeType: 'image/png', size: 10 }] } }), /at most 9/);
});
test('channel aliases preserve public identity while using the selected upstream model', () => {
  const intent = decode('minimax-h3', { prompt: 'cat', seconds: 5, size: '1376x768' },
    { model: 'my-private-h3', upstreamModel: 'minimax-h3' });
  assert.equal(intent.model, 'my-private-h3');
  const ctx = { ...driver('minimax-h3', { prompt: 'cat', seconds: 5, size: '1376x768' }),
    model: 'my-private-h3', upstreamModel: 'minimax-h3', requestBody: intent.requestBody };
  assert.equal(plugin.buildSubmitRequest(ctx).body.model, 'minimax-h3');
  assert.throws(() => driver('minimax-h3', { prompt: 'cat', seconds: 5, size: '1376x768' },
    { upstreamModel: 'wan3.0-video' }) && plugin.buildSubmitRequest(driver('minimax-h3',
    { prompt: 'cat', seconds: 5, size: '1376x768' }, { upstreamModel: 'wan3.0-video' })), /Cross-family/);
});
test('submission accepts 202 task shape and query/content use upstream rather than public IDs', () => {
  const ctx = driver('minimax-h3', { prompt: 'cat', seconds: 5, size: '1376x768' });
  const submit = plugin.parseSubmitResponse(ctx, { statusCode: 202, body: { id: 'task/upstream', status: 'queued' } });
  assert.equal(submit.taskId, 'task/upstream');
  const query = plugin.buildQueryRequest({ ...ctx, requestBody: undefined, taskId: submit.taskId, publicTaskId: 'public-1', state: submit.state });
  assert.equal(query.url, 'https://xysnai.cn/v1/videos/task%2Fupstream');
  assert.throws(() => plugin.parseSubmitResponse(ctx, { statusCode: 202, body: { status: 'queued' } }), /missing/);
});
test('documented states, failures, immediate completion, and unknown state handling', () => {
  const states = { queued: 'QUEUED', in_progress: 'IN_PROGRESS', completed: 'SUCCESS', failed: 'FAILURE' };
  for (const [input, expected] of Object.entries(states)) assert.equal(plugin.parseTaskResult({}, { status: input }).status, expected);
  assert.equal(plugin.parseTaskResult({}, { status: 'surprise' }).status, 'UNKNOWN');
  assert.equal(plugin.parseTaskResult({}, { status: '__proto__' }).status, 'UNKNOWN');
  assert.equal(plugin.parseTaskResult({}, null).status, 'UNKNOWN');
  assert.equal(plugin.parseTaskResult({}, { status: 'failed', error: { message: 'upstream failed' } }).reason, 'upstream failed');
  const ctx = driver('minimax-h3', { prompt: 'cat', seconds: 5, size: '1376x768' });
  assert.equal(plugin.parseSubmitResponse(ctx, { body: { id: 'done', status: 'completed' } }).immediate.status, 'SUCCESS');
});
test('client renderer emits public ID and gateway content path without upstream financial data', () => {
  const data = { id: 'upstream-id', model: 'minimax-h3', status: 'completed', progress: 100, cost: '0.4',
    balance: '0.6', billing_amount: '0.4', result_url: 'http://upstream/private-task', api_key: 'must-not-leak' };
  const output = plugin.protocols.openai_video.render({}, { task_id: 'public-id', status: 'SUCCESS', data,
    properties: { origin_model_name: 'minimax-h3' }, created_at: 123 });
  assert.equal(output.id, 'public-id');
  assert.equal(output.model, 'minimax-h3');
  assert.equal(output.result_url, '/v1/videos/public-id/content');
  for (const key of ['cost', 'balance', 'billing_amount', 'api_key']) assert.equal(output[key], undefined);
  assert.equal(data.id, 'upstream-id');
});
test('content descriptor preserves HEAD/Range but never forwards client credentials', () => {
  const ctx = driver('minimax-h3', { prompt: 'cat', seconds: 5, size: '1376x768' });
  const req = plugin.buildContentRequest({ ...ctx, artifactKey: 'video', upstreamTaskId: 'upstream-id',
    clientRequest: { method: 'HEAD', headers: { range: 'bytes=0-100', 'If-None-Match': 'abc', Authorization: 'Bearer client-key', Cookie: 'secret' } } });
  assert.equal(req.method, 'HEAD');
  assert.equal(req.headers.Range, 'bytes=0-100');
  assert.equal(req.headers['If-None-Match'], 'abc');
  assert.equal(req.headers.Authorization, 'Bearer test-channel-key');
  assert.equal(req.headers.Cookie, undefined);
  assert.equal(req.url, 'https://xysnai.cn/v1/videos/upstream-id/content');
  assert.deepEqual(plugin.listArtifacts({ status: 'QUEUED' }), []);
  assert.equal(plugin.listArtifacts({ status: 'SUCCESS' })[0].key, 'video');
  assert.throws(() => plugin.buildContentRequest({ ...ctx, artifactKey: 'thumbnail' }), /artifact_not_found/);
});
test('upscale needs one source and never fabricates output or billing seconds', () => {
  const ctx = driver('Video-upscale2.6', { reference_video: 'https://example.com/in.mp4', scale: 2 });
  assert.equal(plugin.buildSubmitRequest(ctx).body.prompt, undefined);
  assert.equal(plugin.extractUsage(ctx).seconds, undefined);
  assert.equal(plugin.extractUsage(ctx).billing_seconds, undefined);
  assert.deepEqual(plugin.extractUsageOnComplete(ctx, { status: 'SUCCESS' }, { billing_seconds: null }), {});
  assert.deepEqual(plugin.extractUsageOnComplete(ctx, { status: 'SUCCESS' }, { billing_seconds: '12.5' }), { billing_seconds: 12.5 });
  assert.throws(() => plugin.extractUsageOnComplete(ctx, { status: 'SUCCESS' }, { billing_seconds: 7200 }), /range/);
  assert.throws(() => driver('Video-upscale2.6', {}), /exactly one/);
  assert.throws(() => driver('Video-upscale2.6', { reference_videos: ['https://example.com/1', 'https://example.com/2'] }), /at most 1/);
});
test('rejects malformed base URL and missing channel key locally', () => {
  const ctx = driver('minimax-h3', { prompt: 'cat', seconds: 5, size: '1376x768' });
  assert.throws(() => plugin.buildSubmitRequest({ ...ctx, baseUrl: 'https://xysnai.cn/v1' }), /Base URL/);
  assert.throws(() => plugin.buildSubmitRequest({ ...ctx, apiKey: '' }), /API key/);
  assert.throws(() => decode('minimax-h3', { prompt: 'cat', seconds: 5, size: '1376x768' },
    { operation: 'submit', path: '/v1/videos/public-id/remix' }), /remix is not documented/);
});
const golden = JSON.parse(await fs.readFile(new URL('./golden.json', import.meta.url), 'utf8'));
test('official host-format golden fixtures agree with the independent expected results', () => {
  for (const fixture of golden.cases) {
    let hook = plugin[fixture.hook];
    for (const member of fixture.path || []) hook = hook[member];
    if (fixture.member) hook = hook[fixture.member];
    if (fixture.expectedError) {
      assert.throws(() => hook(...fixture.args), error => error.message.includes(fixture.expectedError), fixture.name);
    } else {
      assert.deepEqual(hook(...fixture.args), fixture.expected, fixture.name);
    }
  }
});
process.stdout.write('\n' + passed + ' offline test groups passed, including ' + golden.cases.length + ' host-format golden cases. No live HTTP requests were made.\n');

// Local hook tests only. They do not start New API or contact Leonardo.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as plugin from '../plugin.js';

const tests = [];
const add = (name, fn) => tests.push({ name, fn });
const copy = x => JSON.parse(JSON.stringify(x));
function freeze(x) {
  if (x && typeof x === 'object') {
    Object.values(x).forEach(freeze);
    Object.freeze(x);
  }
  return x;
}
function call(name, ...args) {
  const frozen = freeze(copy(args));
  const before = JSON.stringify(frozen);
  const fn = name.split('.').reduce((obj, key) => obj[key], plugin);
  assert.equal(typeof fn, 'function', name + ' is exported');
  const value = fn(...frozen);
  assert.equal(JSON.stringify(frozen), before, 'hook mutated a host argument');
  assert.ok(!(value instanceof Promise), 'hook returned a Promise');
  return value;
}
const MODEL = 'veo-3.1-fast-generate-001';
const ID = 'a4ea7f06-57c8-41f6-9469-c2ab71a3ef84';
const VIDEO_URL = 'https://cdn.leonardo.ai/mock/video.mp4?signature=synthetic';
const raw = { model: MODEL, prompt: 'A paper boat on a quiet pond' };
const normalized = {
  ...raw, seconds: 8, size: '1280x720',
  provider_options: { leonardo: { generate_audio: true } }
};
const driver = body => ({
  requestBody: body, requestHeaders: { Authorization: 'Bearer user-key-must-not-leak' },
  action: 'text_to_video', model: body.model, upstreamModel: MODEL,
  baseUrl: 'https://cloud.leonardo.ai', apiKey: 'test-only-not-a-real-key',
  authHeader: 'test-only-not-a-real-key', upstream: { kind: 'vendor' },
  files: [], publicTaskId: 'task_example'
});
const query = state => ({
  taskId: ID, publicTaskId: 'task_example', action: 'text_to_video',
  model: MODEL, upstreamModel: MODEL, baseUrl: 'https://cloud.leonardo.ai',
  apiKey: 'test-only-not-a-real-key', authHeader: 'test-only-not-a-real-key',
  upstream: { kind: 'vendor' }, data: {}, state: state || {}
});
const decode = body => ({
  method: 'POST', path: '/v1/videos', params: {}, query: {},
  protocol: 'openai_video', operation: 'create', model: body.model,
  stream: false, body: { kind: 'json', value: body }
});
const completed = url => ({ generations_by_pk: {
  id: ID, status: 'COMPLETE', prompt: raw.prompt, imageWidth: 1280, imageHeight: 720,
  generated_images: [{ id: 'image-id', nsfw: false, url: 'https://cdn.leonardo.ai/cover.jpg', motionMP4URL: url }]
}});
const httpOK = { status: 200, headers: {} };
const expectError = (name, args, code) => assert.throws(() => call(name, ...args), new RegExp('^Error: ' + code + ':'));
const hooks = [
  'buildSubmitRequest', 'parseSubmitResponse', 'buildQueryRequest', 'parseTaskResult',
  'extractUsage', 'extractUsageOnComplete', 'listArtifacts', 'buildContentRequest'
];

add('required exports and compatible metadata', () => {
  hooks.forEach(h => assert.equal(typeof plugin[h], 'function'));
  assert.equal(plugin.meta.apiVersion, 1);
  assert.equal(plugin.meta.baseUrl, undefined, 'channel Base URL must be configured manually for hosts rejecting meta.baseUrl');
  assert.equal(plugin.meta.key, 'leonardo-video');
  assert.equal(plugin.meta.fetchMode, 'per_task');
  assert.deepEqual(plugin.meta.protocols, ['openai_video']);
  assert.equal(plugin.meta.upstreams, undefined, 'vendor is implicit; omit optional declaration for older hosts');
  assert.equal(plugin.meta.channelTypes, undefined);
  assert.equal(plugin.meta.routes, undefined);
  assert.deepEqual(plugin.meta.models, ['veo-3.1-generate-001', 'veo-3.1-fast-generate-001', 'hailuo-03']);
});
add('usage examples match declared fact types', () => {
  for (const example of plugin.meta.usageExamples) {
    assert.deepEqual(Object.keys(example.facts).sort(), Object.keys(plugin.meta.usageSchema).sort());
    for (const [k, v] of Object.entries(example.facts)) {
      const schema = plugin.meta.usageSchema[k];
      if (schema.enum) assert.ok(schema.enum.includes(v));
      else assert.equal(typeof v, schema.type);
    }
  }
});
add('plugin executes in isolated JS context with no Node globals', () => {
  const source = fs.readFileSync(new URL('../plugin.js', import.meta.url), 'utf8');
  const transformed = source.replace(/^export /gm, '') + '\n({meta,protocols,buildSubmitRequest});';
  const sandboxed = vm.runInNewContext(transformed, Object.create(null), { timeout: 1000 });
  const descriptor = sandboxed.buildSubmitRequest(freeze(driver(raw)));
  assert.equal(descriptor.body.parameters.duration, 8);
  // This is a restricted V8 test, NOT a substitute for New API's runtime.
});
add('decode normalizes defaults without changing input', () => {
  assert.deepEqual(call('protocols.openai_video.decodeRequest', decode(raw)), {
    kind: 'submit', model: MODEL, action: 'text_to_video', requestBody: normalized
  });
});
for (const seconds of [4, 6, 8, '4', '6', '8']) {
  add('seconds accepted: ' + JSON.stringify(seconds), () => {
    const result = call('protocols.openai_video.decodeRequest', decode({ ...raw, seconds }));
    assert.equal(result.requestBody.seconds, Number(seconds));
  });
}
for (const seconds of [0, 5, 7, 9, -1, 4.5, '', '4.0', '4e0', ' 4', true, null]) {
  add('seconds rejected: ' + JSON.stringify(seconds), () => {
    expectError('buildSubmitRequest', [driver({ ...raw, seconds })], 'invalid_parameter');
  });
}
for (const size of ['1280x720', '720x1280', '1920x1080', '1080x1920']) {
  add('size mapped: ' + size, () => {
    const d = call('buildSubmitRequest', driver({ ...raw, size, seconds: 8 }));
    assert.equal(d.body.parameters.width, Number(size.split('x')[0]));
    assert.equal(d.body.parameters.height, Number(size.split('x')[1]));
  });
}
for (const size of ['1024x1024', '3840x2160', 'auto', '1280X720', '__proto__', null]) {
  add('unsupported size rejected: ' + size, () => {
    expectError('buildSubmitRequest', [driver({ ...raw, size })], 'unsupported_size');
  });
}
add('1080p short clip blocked by explicit phase-1 restriction', () => {
  expectError('buildSubmitRequest', [driver({ ...raw, size: '1920x1080', seconds: 4 })], 'unsupported_combination');
});
for (const [key, value] of Object.entries({
  first_frame: {}, n: 2, quantity: 2, public: true, stream: true,
  callback_url: 'https://example.com/callback', metadata: {},
  resolution: '1080p', aspect_ratio: '16:9', extra_body: {},
  seconds_typo: 8
})) {
  add('unknown top-level field rejected: ' + key, () => {
    expectError('buildSubmitRequest', [driver({ ...raw, [key]: value })], 'unsupported_parameter');
  });
}
add('prototype key rejected as unknown JSON field', () => {
  const b = JSON.parse(JSON.stringify(raw).slice(0, -1) + ',"__proto__":{"polluted":true}}');
  expectError('buildSubmitRequest', [driver(b)], 'unsupported_parameter');
  assert.equal({}.polluted, undefined);
});
add('strict provider options and boolean', () => {
  expectError('buildSubmitRequest', [driver({ ...raw, provider_options: { other: {} } })], 'unsupported_parameter');
  expectError('buildSubmitRequest', [driver({ ...raw, provider_options: { leonardo: { public: true } } })], 'unsupported_parameter');
  expectError('buildSubmitRequest', [driver({ ...raw, provider_options: { leonardo: { generate_audio: 'false' } } })], 'invalid_parameter');
});
add('silent audio, zero seed and negative prompt survive mapping', () => {
  const options = { generate_audio: false, seed: 0, negative_prompt: 'blur' };
  const d = call('buildSubmitRequest', driver({ ...raw, provider_options: { leonardo: options } }));
  assert.equal(d.body.parameters.motion_has_audio, false);
  assert.equal(d.body.parameters.seed, 0);
  assert.equal(d.body.parameters.negative_prompt, 'blur');
});
add('seed upper bound and overflows', () => {
  const b = { ...raw, provider_options: { leonardo: { seed: 4294967295 } } };
  assert.equal(call('buildSubmitRequest', driver(b)).body.parameters.seed, 4294967295);
  b.provider_options.leonardo.seed += 1;
  expectError('buildSubmitRequest', [driver(b)], 'invalid_parameter');
});
add('prompt validation', () => {
  for (const prompt of ['', '   ', 123, 'x'.repeat(10000)]) {
    expectError('buildSubmitRequest', [driver({ ...raw, prompt })], 'invalid_parameter');
  }
});
add('multipart text fields decode', () => {
  const ctx = decode(raw);
  ctx.body = { kind: 'multipart', files: [], fields: {
    model: [MODEL], prompt: [raw.prompt], seconds: ['4'], size: ['720x1280'],
    provider_options: ['{"leonardo":{"generate_audio":false}}']
  }};
  const r = call('protocols.openai_video.decodeRequest', ctx).requestBody;
  assert.equal(r.seconds, 4);
  assert.equal(r.provider_options.leonardo.generate_audio, false);
});
add('duplicate multipart fields rejected', () => {
  const ctx = decode(raw);
  ctx.body = { kind: 'multipart', files: [], fields: { model: [MODEL], prompt: ['a', 'b'] } };
  expectError('protocols.openai_video.decodeRequest', [ctx], 'invalid_parameter');
});
add('multipart files rejected before upstream submission', () => {
  const ctx = decode(raw);
  ctx.body = { kind: 'multipart', fields: {}, files: [{ ref: 'file:input_reference:0' }] };
  expectError('protocols.openai_video.decodeRequest', [ctx], 'unsupported_input');
});
add('malformed multipart options rejected', () => {
  const ctx = decode(raw);
  ctx.body = { kind: 'form', fields: { model: [MODEL], prompt: ['x'], provider_options: ['{bad'] } };
  expectError('protocols.openai_video.decodeRequest', [ctx], 'invalid_json');
});
add('non-POST and streaming rejected', () => {
  expectError('protocols.openai_video.decodeRequest', [{ ...decode(raw), method: 'GET' }], 'invalid_method');
  expectError('protocols.openai_video.decodeRequest', [{ ...decode(raw), stream: true }], 'unsupported_parameter');
});
add('vendor model mapping does not rewrite public identity', () => {
  const ctx = driver({ ...raw, model: 'my-veo-alias' });
  const d = call('buildSubmitRequest', ctx);
  assert.equal(d.body.model, MODEL);
  assert.equal(d.model, undefined);
  assert.equal(d.rewriteModel, undefined);
  assert.equal(ctx.requestBody.model, 'my-veo-alias');
});
add('pinned model mismatch rejected', () => {
  expectError('buildSubmitRequest', [{ ...driver(raw), model: 'different' }], 'model_mismatch');
});
add('unsupported upstream model rejected', () => {
  expectError('buildSubmitRequest', [{ ...driver(raw), upstreamModel: 'kling-3.0' }], 'unsupported_model');
});
add('auth comes only from channel context', () => {
  const d = call('buildSubmitRequest', driver(raw));
  assert.equal(d.headers.Authorization, 'Bearer test-only-not-a-real-key');
  assert.equal(d.body.public, false);
  assert.equal(d.body.parameters.quantity, 1);
  assert.ok(!JSON.stringify(d).includes('user-key-must-not-leak'));
});
add('auth fallback and missing key', () => {
  assert.equal(call('buildSubmitRequest', { ...driver(raw), authHeader: '' }).headers.Authorization, 'Bearer test-only-not-a-real-key');
  expectError('buildSubmitRequest', [{ ...driver(raw), authHeader: '', apiKey: '' }], 'missing_credentials');
});
for (const credentials of [
  { apiKey: 'channel-key', authHeader: 'channel-key' },
  { apiKey: 'channel-key', authHeader: 'Bearer different-header-key' },
  { apiKey: 'channel-key', authHeader: '' },
  { apiKey: '', authHeader: 'channel-key' },
  { apiKey: '', authHeader: 'Bearer channel-key' },
  { apiKey: 'Bearer channel-key', authHeader: 'Bearer channel-key' }
]) {
  add('channel credentials normalized for submit and query: ' + JSON.stringify(credentials), () => {
    for (const [hook, ctx] of [['buildSubmitRequest', driver(raw)], ['buildQueryRequest', query()]]) {
      const result = call(hook, { ...ctx, ...credentials });
      assert.equal(result.headers.Authorization, 'Bearer channel-key');
    }
  });
}
for (const credential of ['', 'Bearer ', 'Bearer Bearer channel-key', 'key with spaces', 'key\r\nX-Injected: yes']) {
  add('invalid channel credential rejected: ' + JSON.stringify(credential), () => {
    for (const [hook, ctx] of [['buildSubmitRequest', driver(raw)], ['buildQueryRequest', query()]]) {
      expectError(hook, [{ ...ctx, apiKey: credential, authHeader: credential }], 'missing_credentials');
    }
  });
}
for (const baseUrl of ['http://cloud.leonardo.ai', 'https://cloud.leonardo.ai/v1', 'https://u:p@cloud.leonardo.ai', 'https://cloud.leonardo.ai?q=1']) {
  add('unsafe/misconfigured API root rejected: ' + baseUrl, () => {
    expectError('buildSubmitRequest', [{ ...driver(raw), baseUrl }], 'invalid_base_url');
  });
}
add('trailing API-root slash normalized', () => {
  const d = call('buildSubmitRequest', { ...driver(raw), baseUrl: 'https://cloud.leonardo.ai/' });
  assert.equal(d.url, 'https://cloud.leonardo.ai/api/rest/v2/generations');
});
add('type-60 upstream disallowed', () => {
  expectError('buildSubmitRequest', [{ ...driver(raw), upstream: { kind: 'new_api' } }], 'unsupported_upstream');
  const legacy = driver(raw);
  delete legacy.upstream;
  assert.deepEqual(call('buildSubmitRequest', legacy), call('buildSubmitRequest', driver(raw)), 'missing upstream context defaults to vendor');
  const legacyQuery = query();
  delete legacyQuery.upstream;
  assert.deepEqual(call('buildQueryRequest', legacyQuery), call('buildQueryRequest', query()));
});
for (const envelope of ['root', 'generate', 'generation', 'generationJob', 'sdGenerationJob', 'motionVideoGenerationJob', 'data']) {
  add('generationId envelope: ' + envelope, () => {
    const body = envelope === 'root' ? { generationId: ID } : { [envelope]: { generationId: ID } };
    const parsed = call('parseSubmitResponse', driver(raw), { statusCode: 200, headers: {}, body });
    assert.equal(parsed.taskId, ID);
    assert.deepEqual(parsed.state.request, normalized);
    assert.ok(!JSON.stringify(parsed).includes('test-only-not-a-real-key'));
  });
}
add('submit response accepts JSON string', () => {
  const r = call('parseSubmitResponse', driver(raw), { statusCode: 200, headers: {}, body: JSON.stringify({ generationId: ID }) });
  assert.equal(r.taskId, ID);
});
add('missing, generic or conflicting upstream IDs are not guessed', () => {
  for (const body of [{}, { id: ID }, { generationId: '../other' }, { generationId: ID, generate: { generationId: 'other-id' } }]) {
    expectError('parseSubmitResponse', [driver(raw), { statusCode: 200, body }], 'invalid_upstream_response');
  }
});
add('submit errors are not interpreted as accepted tasks', () => {
  expectError('parseSubmitResponse', [driver(raw), { statusCode: 401, body: {} }], 'upstream_submit_failed');
  expectError('parseSubmitResponse', [driver(raw), { statusCode: 200, body: { generationId: ID, errors: [{ message: 'no' }] } }], 'upstream_submit_failed');
});
add('query uses private upstream ID and v1', () => {
  const d = call('buildQueryRequest', query());
  assert.equal(d.url, 'https://cloud.leonardo.ai/api/rest/v1/generations/' + ID);
  assert.ok(!d.url.includes('task_example'));
  assert.equal(d.method, 'GET');
});
add('query ID path injection rejected', () => {
  expectError('buildQueryRequest', [{ ...query(), taskId: '../../users' }], 'invalid_task_id');
});
add('PENDING queued, COMPLETE success, FAILED failure', () => {
  assert.deepEqual(call('parseTaskResult', query(), { generations_by_pk: { id: ID, status: 'PENDING', generated_images: [] } }, httpOK), { status: 'QUEUED', progress: '0%' });
  assert.deepEqual(call('parseTaskResult', query(), completed(VIDEO_URL), httpOK), { status: 'SUCCESS', progress: '100%', url: VIDEO_URL });
  assert.equal(call('parseTaskResult', query(), { generations_by_pk: { status: 'FAILED' } }, httpOK).status, 'FAILURE');
});
add('unknown/empty/mismatched responses do not become permanent in-progress tasks', () => {
  for (const body of [{}, 'not-json', { generations_by_pk: null }, { generations_by_pk: { status: 'NEW_STATUS' } }, { generations_by_pk: { status: 'COMPLETE', id: 'wrong' } }]) {
    assert.equal(call('parseTaskResult', query(), body, httpOK).status, 'UNKNOWN');
  }
  assert.equal(call('parseTaskResult', query(), completed(VIDEO_URL), { status: 429, headers: {} }).status, 'UNKNOWN');
});
add('missing MP4 observations persist across simulated restart and stop at three', () => {
  let state = { version: 1, request: normalized, missingVideoPolls: 0 };
  for (let observation = 1; observation <= 3; observation++) {
    const r = call('parseTaskResult', query(copy(state)), completed(null), httpOK);
    assert.equal(r.status, observation < 3 ? 'IN_PROGRESS' : 'FAILURE');
    state = copy(r.state);
    assert.equal(state.missingVideoPolls, observation);
    assert.deepEqual(state.request, normalized);
  }
});
add('late MP4 arrival succeeds before retry limit', () => {
  const state = { version: 1, request: normalized, missingVideoPolls: 2 };
  assert.equal(call('parseTaskResult', query(state), completed(VIDEO_URL), httpOK).status, 'SUCCESS');
});
add('safety-flagged output is not returned', () => {
  const body = completed(VIDEO_URL);
  body.generations_by_pk.generated_images[0].nsfw = true;
  assert.equal(call('parseTaskResult', query(), body, httpOK).status, 'IN_PROGRESS');
  assert.deepEqual(call('listArtifacts', { status: 'SUCCESS', data: body }), []);
});
for (const url of ['http://cdn.leonardo.ai/a.mp4', 'https://127.0.0.1/a.mp4', 'https://localhost/a.mp4', 'https://a.internal/a.mp4', 'https://u:p@cdn.leonardo.ai/a.mp4', 'https://cdn.leonardo.ai\\@127.0.0.1/a', 'file:///tmp/a.mp4', 'https://cdn.leonardo.ai/a.mp4#x']) {
  add('unsafe video VIDEO_URL rejected: ' + url, () => {
    assert.deepEqual(call('listArtifacts', { status: 'SUCCESS', data: completed(url) }), []);
  });
}
add('artifact uses MP4, never image preview VIDEO_URL', () => {
  assert.deepEqual(call('listArtifacts', { status: 'SUCCESS', data: completed(VIDEO_URL) }), [{ key: 'video', type: 'video', mimeType: 'video/mp4' }]);
  assert.deepEqual(call('listArtifacts', { status: 'IN_PROGRESS', data: completed(VIDEO_URL) }), []);
  assert.deepEqual(call('listArtifacts', { status: 'SUCCESS', data: completed(null) }), []);
});
for (const method of ['GET', 'HEAD']) {
  add('credentialless video content ' + method, () => {
    const descriptor = call('buildContentRequest', {
      artifactKey: 'video', status: 'SUCCESS', data: completed(VIDEO_URL),
      apiKey: 'never-leak-this', authHeader: 'Bearer never-leak-this',
      clientRequest: { method, headers: { Range: 'bytes=0-100', Authorization: 'Bearer never-forward' } }
    });
    assert.deepEqual(descriptor, { url: VIDEO_URL, method, credentialless: true });
    assert.equal(descriptor.headers, undefined);
    assert.equal(descriptor.body, undefined);
  });
}
add('invalid artifact, method and premature content rejected', () => {
  expectError('buildContentRequest', [{ artifactKey: 'thumbnail', data: completed(VIDEO_URL) }], 'unsupported_artifact');
  expectError('buildContentRequest', [{ artifactKey: 'video', data: completed(VIDEO_URL), clientRequest: { method: 'POST' } }], 'invalid_method');
  expectError('buildContentRequest', [{ artifactKey: 'video', data: completed(null) }], 'video_not_ready');
});
add('facts measure requested seconds, not credits or token quota', () => {
  assert.deepEqual(call('extractUsage', { ...driver(raw), usagePurpose: 'facts' }), { seconds: 8, resolution: '720p', generate_audio: true });
  assert.deepEqual(call('extractUsage', { ...driver(raw), usagePurpose: 'billing_ratios' }), {});
});
add('completion facts preserve frozen request and omit unknowns', () => {
  const state = { version: 1, request: normalized, missingVideoPolls: 0 };
  const facts = { seconds: 8, resolution: '720p', generate_audio: true };
  assert.deepEqual(call('extractUsageOnComplete', query(state), { status: 'SUCCESS' }, completed(VIDEO_URL)), facts);
  assert.deepEqual(call('extractUsageOnComplete', query(state), { Status: 'SUCCESS' }, completed(VIDEO_URL)), facts);
  assert.deepEqual(call('extractUsageOnComplete', query(), { status: 'SUCCESS' }, completed(VIDEO_URL)), {});
  assert.deepEqual(call('extractUsageOnComplete', query(state), { status: 'FAILURE' }, completed(VIDEO_URL)), {});
});
add('create renderer echoes metadata but never private IDs/keys/costs', () => {
  const parsed = call('parseSubmitResponse', driver(raw), { statusCode: 200, body: { generate: { generationId: ID, apiCreditCost: 1234 } } });
  const r = call('protocols.openai_video.render', {}, {
    task_id: 'task_public', status: 'QUEUED', created_at: 1700000000,
    properties: { origin_model_name: 'my-alias' }, data: parsed.taskData
  });
  assert.equal(r.id, 'task_public');
  assert.equal(r.model, 'my-alias');
  assert.equal(r.seconds, '8');
  assert.equal(r.size, '1280x720');
  assert.ok(!JSON.stringify(r).includes(ID));
  assert.ok(!JSON.stringify(r).includes('apiCreditCost'));
});
add('poll renderer does not invent unavailable duration', () => {
  const r = call('protocols.openai_video.render', {}, {
    task_id: 'task_public', status: 'SUCCESS', created_at: 1700000000,
    properties: { origin_model_name: MODEL }, data: completed(VIDEO_URL)
  });
  assert.equal(r.status, 'completed');
  assert.equal(r.progress, 100);
  assert.equal(r.size, '1280x720');
  assert.equal(r.seconds, undefined);
  assert.ok(!JSON.stringify(r).includes(VIDEO_URL));
  assert.ok(!JSON.stringify(r).includes(ID));
});
add('renderer does not echo sensitive upstream failure text', () => {
  const r = call('protocols.openai_video.render', {}, {
    task_id: 'task_public', status: 'FAILURE', fail_reason: 'Bearer secret', data: {}
  });
  assert.equal(r.error.code, 'video_generation_failed');
  assert.ok(!JSON.stringify(r).includes('secret'));
});
add('independent tasks do not share state', () => {
  const a = call('parseTaskResult', query(), completed(null), httpOK);
  const b = call('parseTaskResult', query(), completed(null), httpOK);
  assert.equal(a.state.missingVideoPolls, 1);
  assert.equal(b.state.missingVideoPolls, 1);
});

const OSS_URL = 'https://example-bucket.oss-cn-hangzhou.aliyuncs.com/start.png?Expires=2000000000&Signature=synthetic%2Bsig';
const END_URL = 'https://assets.example.com/end.jpg';
const h3Driver = body => ({ ...driver(body), upstreamModel: 'hailuo-03' });
for (const value of [OSS_URL, { image_url: OSS_URL }, { url: OSS_URL }, { type: 'URL', url: OSS_URL }]) {
  add('OSS input_reference normalizes: ' + JSON.stringify(value), () => {
    const intent = call('protocols.openai_video.decodeRequest', decode({ ...raw, input_reference: value }));
    assert.equal(intent.action, 'image_to_video');
    const ctx = driver(intent.requestBody);
    const result = call('buildSubmitRequest', ctx);
    assert.deepEqual(result.body.parameters.guidances, { start_frame: [{ image: { type: 'URL', url: OSS_URL } }] });
    assert.equal(result.url, 'https://cloud.leonardo.ai/api/rest/v2/generations');
    const parsed = call('parseSubmitResponse', ctx, { statusCode: 200, body: { generationId: ID } });
    assert.ok(!JSON.stringify(parsed).includes('Signature='));
    assert.ok(!JSON.stringify(parsed).includes('oss-cn'));
    assert.deepEqual(call('extractUsageOnComplete', query(parsed.state), { status: 'SUCCESS' }, completed(VIDEO_URL)), { seconds: 8, resolution: '720p', generate_audio: true });
  });
}
add('multipart accepts an OSS URL as a text input_reference', () => {
  const ctx = decode(raw);
  ctx.body = { kind: 'multipart', fields: { model: [MODEL], prompt: [raw.prompt], input_reference: [OSS_URL] }, files: [] };
  const intent = call('protocols.openai_video.decodeRequest', ctx);
  assert.equal(intent.action, 'image_to_video');
  assert.equal(intent.requestBody.provider_options.leonardo.start_frame.url, OSS_URL);
});
add('start and end frames preserve order and Leonardo image IDs', () => {
  const body = { ...raw, provider_options: { leonardo: { start_frame: OSS_URL, end_frame: { type: 'UPLOADED', id: ID } } } };
  const d = call('buildSubmitRequest', driver(body));
  assert.deepEqual(d.body.parameters.guidances, {
    start_frame: [{ image: { type: 'URL', url: OSS_URL } }], end_frame: [{ image: { type: 'UPLOADED', id: ID } }]
  });
});
for (const url of ['http://assets.example.com/a.png', 'https://localhost/a.png', 'https://127.0.0.1/a.png', 'https://[::1]/a.png', 'https://user:pass@assets.example.com/a.png', 'https://assets.example.com/a.png#hash', 'file:///tmp/a.png', 'data:image/png;base64,abc', 'https://assets.example.com/a\n.png', 'https://assets.example.com\\@127.0.0.1/a.png']) {
  add('unsafe image URL rejected: ' + JSON.stringify(url), () => {
    expectError('buildSubmitRequest', [driver({ ...raw, input_reference: url })], 'invalid_image_url');
  });
}
add('ambiguous or malformed image inputs fail before upstream', () => {
  expectError('buildSubmitRequest', [driver({ ...raw, input_reference: OSS_URL, provider_options: { leonardo: { start_frame: END_URL } } })], 'conflicting_images');
  expectError('buildSubmitRequest', [driver({ ...raw, provider_options: { leonardo: { end_frame: END_URL } } })], 'unsupported_combination');
  expectError('buildSubmitRequest', [driver({ ...raw, input_reference: { type: 'UPLOADED', id: 'invalid' } })], 'invalid_image');
  expectError('buildSubmitRequest', [driver({ ...raw, input_reference: { type: 'URL', url: OSS_URL, headers: { Authorization: 'secret' } } })], 'unsupported_parameter');
});
add('regular Veo reference images are separate from first-frame guidance', () => {
  const body = { ...raw, model: 'veo-3.1-generate-001', seconds: 8, provider_options: { leonardo: { reference_images: [OSS_URL, END_URL] } } };
  const ctx = { ...driver(body), upstreamModel: body.model };
  const intent = call('protocols.openai_video.decodeRequest', decode(body));
  assert.equal(intent.action, 'image_to_video');
  assert.deepEqual(call('buildSubmitRequest', ctx).body.parameters.guidances, { image_reference: [{ image: { type: 'URL', url: OSS_URL } }, { image: { type: 'URL', url: END_URL } }] });
  expectError('buildSubmitRequest', [{ ...ctx, upstreamModel: MODEL }], 'unsupported_combination');
  expectError('buildSubmitRequest', [{ ...ctx, requestBody: { ...body, seconds: 4 } }], 'unsupported_combination');
  expectError('buildSubmitRequest', [{ ...ctx, requestBody: { ...body, input_reference: END_URL } }], 'conflicting_images');
  for (const references of [[], [OSS_URL, END_URL, OSS_URL, END_URL], 'not-an-array']) {
    expectError('buildSubmitRequest', [{ ...ctx, requestBody: { ...body, provider_options: { leonardo: { reference_images: references } } } }], 'invalid_images');
  }
});
add('H3 text/video defaults use 5 seconds, 480p and fixed TURBO audio', () => {
  const body = { model: 'hailuo-03', prompt: 'A ball rolling slowly.' };
  const intent = call('protocols.openai_video.decodeRequest', decode(body));
  assert.equal(intent.action, 'text_to_video');
  const ctx = h3Driver(intent.requestBody);
  const d = call('buildSubmitRequest', ctx);
  assert.deepEqual(d.body, { model: 'hailuo-03', public: false, parameters: { prompt: body.prompt, duration: 5, width: 856, height: 480, quantity: 1, motion_has_audio: true, quality: 'TURBO' } });
  const facts = { seconds: 5, resolution: '480p', generate_audio: true };
  assert.deepEqual(call('extractUsage', ctx), facts);
  const parsed = call('parseSubmitResponse', ctx, { statusCode: 200, body: { generationId: ID } });
  assert.deepEqual(call('extractUsageOnComplete', query(parsed.state), { status: 'SUCCESS' }, completed(VIDEO_URL)), facts);
});
for (const [size, resolution] of [['856x480', '480p'], ['480x856', '480p'], ['1376x768', '768p'], ['768x1376', '768p'], ['2560x1440', '2k'], ['1440x2560', '2k'], ['1440x1440', '2k']]) {
  add('H3 image video and billing tier: ' + size, () => {
    const ctx = h3Driver({ model: 'hailuo-03', prompt: raw.prompt, size, seconds: 15, input_reference: OSS_URL });
    const p = call('buildSubmitRequest', ctx).body.parameters;
    assert.equal(p.width, Number(size.split('x')[0]));
    assert.equal(p.height, Number(size.split('x')[1]));
    assert.equal(p.duration, 15);
    assert.equal(p.guidances.start_frame[0].image.url, OSS_URL);
    assert.equal(call('extractUsage', ctx).resolution, resolution);
  });
}
add('H3 reference limit and unsupported options are enforced', () => {
  const body = { model: 'hailuo-03', prompt: raw.prompt };
  for (const extra of [{ seconds: 4 }, { seconds: 16 }, { seconds: 5.5 }]) expectError('buildSubmitRequest', [h3Driver({ ...body, ...extra })], 'invalid_parameter');
  for (const size of ['0x0', '1280x720', '3840x2160']) expectError('buildSubmitRequest', [h3Driver({ ...body, size })], 'unsupported_size');
  for (const options of [{ generate_audio: false }, { seed: 0 }, { negative_prompt: 'blur' }, { quality: 'STANDARD' }]) expectError('buildSubmitRequest', [h3Driver({ ...body, provider_options: { leonardo: options } })], 'unsupported_parameter');
  const references = [OSS_URL, END_URL, OSS_URL, END_URL, OSS_URL];
  const ctx = h3Driver({ ...body, provider_options: { leonardo: { reference_images: references } } });
  assert.equal(call('buildSubmitRequest', ctx).body.parameters.guidances.image_reference.length, 5);
  ctx.requestBody.provider_options.leonardo.reference_images.push(END_URL);
  expectError('buildSubmitRequest', [ctx], 'invalid_images');
  expectError('buildSubmitRequest', [h3Driver({ ...body, prompt: 'x'.repeat(2001) })], 'invalid_parameter');
});
add('mapped H3 context keeps public identity and validates upstream-specific defaults', () => {
  const body = { model: 'my-h3', prompt: raw.prompt, input_reference: OSS_URL };
  const intent = call('protocols.openai_video.decodeRequest', { ...decode(body), upstreamModel: 'hailuo-03' });
  assert.equal(intent.model, 'my-h3');
  const ctx = h3Driver(intent.requestBody);
  assert.equal(call('buildSubmitRequest', ctx).body.model, 'hailuo-03');
  const parsed = call('parseSubmitResponse', ctx, { statusCode: 200, body: { generationId: ID } });
  assert.equal(call('extractUsageOnComplete', query(parsed.state), { status: 'SUCCESS' }, completed(VIDEO_URL)).resolution, '480p');
});

// CLI-compatible fixtures exercise driver hooks and nested protocol members.
const golden = JSON.parse(fs.readFileSync(new URL('./golden.json', import.meta.url), 'utf8'));
for (const c of golden.cases) {
  add('golden: ' + c.name, () => {
    const hook = [c.hook, ...(c.path || (c.member ? [c.member] : []))].join('.');
    if (c.expectedError) assert.throws(() => call(hook, ...c.args), e => e.message.includes(c.expectedError));
    else assert.deepEqual(call(hook, ...c.args), c.expected);
  });
}

let passed = 0;
const failures = [];
for (const t of tests) {
  try { t.fn(); passed++; console.log('PASS ' + t.name); }
  catch (err) { failures.push(t.name); console.error('FAIL ' + t.name + '\n' + err.stack); }
}
const report = {
  generated_at: new Date().toISOString(), node: process.version,
  passed, failed: failures.length, total: tests.length, failures,
  validation: {
    node_hook_tests: true,
    isolated_v8_without_node_globals: true,
    actual_new_api_cli: false,
    actual_new_api_host_lifecycle: false,
    actual_leonardo_api: false,
    note: 'Synthetic fixtures only; no network, no API credits consumed. V8 tests do not certify host runtime compatibility.'
  }
};
fs.writeFileSync(new URL('./test-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(`\n${passed}/${tests.length} passed; ${failures.length} failed`);
process.exitCode = failures.length ? 1 : 0;

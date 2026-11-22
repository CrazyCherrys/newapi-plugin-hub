// Deterministic fixture authoring data. Expected values come from the protocol
// contract, not from calling the implementation under test.
import fs from 'node:fs/promises';
const context = {
  model: 'minimax-h3', upstreamModel: 'minimax-h3',
  baseUrl: 'https://xysnai.cn', apiKey: 'fixture-key', authHeader: 'fixture-key',
  upstream: { kind: 'vendor' }, files: [], action: 'text_to_video',
  requestBody: { payload: { model: 'minimax-h3', prompt: 'cat', seconds: 5, size: '1376x768' }, formFields: null }
};
const auth = { Authorization: 'Bearer fixture-key' };
const usageCommon = { requests: 1, input_images: 0, input_videos: 0, input_audios: 0, input_references: 0 };
const compatImage = 'https://example.com/ref.jpg';
const compatPayload = { model: 'minimax-h3', prompt: 'cat', seconds: 4, size: '1376x768', images: [compatImage] };
const compatDriver = { ...context, action: 'reference_to_video', requestBody: { payload: compatPayload, formFields: null } };
const fixture = {
  unixNow: 1700000000,
  cases: [
    {
      name: 'H3 numeric seconds decoder', hook: 'protocols', path: ['openai_video', 'decodeRequest'],
      args: [{ model: 'minimax-h3', upstreamModel: 'minimax-h3', operation: 'create',
        body: { kind: 'json', value: { model: 'minimax-h3', prompt: 'cat', seconds: 5, size: '1376x768' } } }],
      expected: { kind: 'submit', model: 'minimax-h3', action: 'text_to_video', requestBody: context.requestBody }
    },
    {
      name: 'H3 string seconds normalized', hook: 'protocols', path: ['openai_video', 'decodeRequest'],
      args: [{ model: 'minimax-h3', upstreamModel: 'minimax-h3', operation: 'create',
        body: { kind: 'json', value: { model: 'minimax-h3', prompt: 'cat', seconds: '5', size: '1376x768' } } }],
      expected: { kind: 'submit', model: 'minimax-h3', action: 'text_to_video', requestBody: context.requestBody }
    },
    {
      name: 'H3 standard size and JSON image object normalize before pricing', hook: 'protocols', path: ['openai_video', 'decodeRequest'],
      args: [{ model: 'minimax-h3', operation: 'create', body: { kind: 'json', value: {
        model: 'minimax-h3', prompt: 'cat', size: '1280x720', input_reference: { image_url: compatImage }
      } } }],
      expected: { kind: 'submit', model: 'minimax-h3', action: 'reference_to_video', requestBody: compatDriver.requestBody }
    },
    {
      name: 'H3 normalized dimensions and image are billable usage', hook: 'extractUsage',
      args: [{ ...compatDriver, usagePurpose: 'facts' }],
      expected: { ...usageCommon, seconds: 4, size: '1376x768', resolution: '768P', input_images: 1 }
    },
    {
      name: 'H3 multipart forwarding writes normalized size and inserts the default seconds', hook: 'buildSubmitRequest',
      args: [{ ...compatDriver, requestBody: { payload: compatPayload, formFields: {
        images: [compatImage], model: ['minimax-h3'], prompt: ['cat'], size: ['1280x720']
      } } }],
      expected: { url: 'https://xysnai.cn/v1/videos', method: 'POST', headers: auth, bodyType: 'multipart',
        parts: [{ name: 'images', value: compatImage }, { name: 'model', value: 'minimax-h3' }, { name: 'prompt', value: 'cat' },
          { name: 'size', value: '1376x768' }, { name: 'seconds', value: '4' }],
        rewriteModel: 'minimax-h3' }
    },
    {
      name: 'Invalid H3 enum rejected before upstream', hook: 'protocols', path: ['openai_video', 'decodeRequest'],
      args: [{ model: 'minimax-h3', body: { kind: 'json', value: { prompt: 'cat', seconds: 5, size: '768P' } } }],
      expectedError: 'size must be one of'
    },
    {
      name: 'Wan retains false zero arrays', hook: 'protocols', path: ['openai_video', 'decodeRequest'],
      args: [{ model: 'wan3.0-video', body: { kind: 'json', value: { seconds: '5', resolution: '720P', generate_audio: false,
        seed: 0, reference_images: ['https://example.com/a.png'] } } }],
      expected: { kind: 'submit', model: 'wan3.0-video', action: 'reference_to_video',
        requestBody: { payload: { model: 'wan3.0-video', seconds: 5, resolution: '720P', generate_audio: false,
          seed: 0, reference_images: ['https://example.com/a.png'] }, formFields: null } }
    },
    {
      name: 'JSON submit sends vendor model and Bearer key', hook: 'buildSubmitRequest', args: [context],
      expected: { url: 'https://xysnai.cn/v1/videos', method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: { model: 'minimax-h3', prompt: 'cat', seconds: 5, size: '1376x768' }, rewriteModel: 'minimax-h3' }
    },
    {
      name: '202 accepted task captures upstream identity', hook: 'parseSubmitResponse',
      args: [context, { statusCode: 202, body: { id: 'task_upstream', object: 'video', status: 'queued', progress: 0 } }],
      expected: { taskId: 'task_upstream', taskData: { id: 'task_upstream', object: 'video', status: 'queued', progress: 0 }, state: { upstreamModel: 'minimax-h3' } }
    },
    {
      name: 'Query is independent of submit requestBody', hook: 'buildQueryRequest',
      args: [{ baseUrl: 'https://xysnai.cn/', apiKey: 'fixture-key', taskId: 'task/upstream', publicTaskId: 'task_public' }],
      expected: { url: 'https://xysnai.cn/v1/videos/task%2Fupstream', method: 'GET', headers: auth }
    },
    {
      name: 'Completed status', hook: 'parseTaskResult', args: [{}, { id: 'task_upstream', status: 'completed', progress: 100 }],
      expected: { status: 'SUCCESS', progress: '100%' }
    },
    {
      name: 'Failed status has reason', hook: 'parseTaskResult', args: [{}, { status: 'failed', error: { message: 'upstream task failed' } }],
      expected: { status: 'FAILURE', reason: 'upstream task failed' }
    },
    {
      name: 'Unknown status is not fabricated as running', hook: 'parseTaskResult', args: [{}, { status: 'unrecognized' }],
      expected: { status: 'UNKNOWN', reason: 'Unknown XYSNAI task status: unrecognized' }
    },
    {
      name: 'H3 usage matches sent duration and size', hook: 'extractUsage', args: [context],
      expected: { ...usageCommon, seconds: 5, size: '1376x768', resolution: '768P' }
    },
    {
      name: 'Fixed per-call price has no usage multipliers', hook: 'extractUsage',
      args: [{ ...context, usagePurpose: 'billing_ratios' }], expected: null
    },
    {
      name: 'Wan omitted audio retains unspecified pricing dimension', hook: 'extractUsage',
      args: [{ ...context, model: 'wan3.0-video', upstreamModel: 'wan3.0-video',
        requestBody: { payload: { model: 'wan3.0-video', seconds: 5, resolution: '720P' }, formFields: null } }],
      expected: { ...usageCommon, seconds: 5, resolution: '720P', audio_mode: 'unspecified' }
    },
    {
      name: 'No invented upscale billing seconds', hook: 'extractUsageOnComplete',
      args: [{ model: 'Video-upscale2.6', upstreamModel: 'Video-upscale2.6' }, { status: 'SUCCESS' }, { billing_seconds: null }],
      expected: {}
    },
    {
      name: 'Client view does not expose upstream balance and cost', hook: 'protocols', path: ['openai_video', 'render'],
      args: [{}, { task_id: 'task_public', status: 'SUCCESS', created_at: 1700000000,
        properties: { origin_model_name: 'minimax-h3' },
        data: { id: 'task_upstream', model: 'minimax-h3', progress: 100, cost: '0.4', balance: '0.6', result_url: 'http://upstream/secret' } }],
      expected: { id: 'task_public', object: 'video', model: 'minimax-h3', status: 'completed', progress: 100,
        created_at: 1700000000, result_url: '/v1/videos/task_public/content' }
    },
    {
      name: 'Completed task has one MP4 artifact', hook: 'listArtifacts', args: [{ status: 'SUCCESS' }],
      expected: [{ key: 'video', type: 'video', mimeType: 'video/mp4' }]
    },
    {
      name: 'HEAD range content stays on upstream task and channel key', hook: 'buildContentRequest',
      args: [{ ...context, artifactKey: 'video', upstreamTaskId: 'task_upstream',
        clientRequest: { method: 'HEAD', headers: { Range: 'bytes=0-100', Authorization: 'Bearer ignored-client-key' } } }],
      expected: { url: 'https://xysnai.cn/v1/videos/task_upstream/content', method: 'HEAD',
        headers: { ...auth, Range: 'bytes=0-100' } }
    }
  ]
};
await fs.writeFile(new URL('./golden.json', import.meta.url), JSON.stringify(fixture, null, 2) + '\n');

/**
 * Leonardo Video — New API Task Plugin API v1, phase 1.
 * Target contract: QuantumNous/new-api v1.0.0-rc.41.
 * Only this file is uploaded to New API; it has no Node.js dependencies.
 *
 * Text-to-video only. No fetch, async, imports, timers or global task cache.
 * All HTTP, task persistence, polling and settlement belong to the host.
 * Documentation, limits and test instructions: README.md.
 */

const MODELS = ["veo-3.1-generate-001", "veo-3.1-fast-generate-001"];
const DEFAULT_BASE = "https://cloud.leonardo.ai";
const MISSING_VIDEO_LIMIT = 3;
const SIZES = {
  "1280x720": { width: 1280, height: 720, resolution: "720p" },
  "720x1280": { width: 720, height: 1280, resolution: "720p" },
  "1920x1080": { width: 1920, height: 1080, resolution: "1080p" },
  "1080x1920": { width: 1080, height: 1920, resolution: "1080p" }
};

export const meta = {
  apiVersion: 1,
  key: "leonardo-video",
  name: "Leonardo Video",
  version: "0.1.2",
  author: { name: "Independent Leonardo Video Adapter" },
  description: {
    en: "Veo 3.1 text-to-video through Leonardo; asynchronous video API and MP4 download.",
    zh: "通过 Leonardo 调用 Veo 3.1 文生视频，支持异步任务与 MP4 下载。"
  },
  auth: "api_key",
  upstreams: ["vendor"],
  fetchMode: "per_task",
  models: MODELS.slice(),
  protocols: ["openai_video"],
  usageSchema: {
    seconds: {
      type: "number", unit: "second",
      description: { en: "Requested video duration", zh: "请求的视频时长" }
    },
    resolution: {
      enum: ["720p", "1080p"],
      description: { en: "Requested resolution tier", zh: "请求分辨率档位" }
    },
    generate_audio: {
      type: "boolean",
      description: { en: "Requested native audio", zh: "是否请求原生音频" }
    }
  },
  usageExamples: [
    { label: "720p / 4s / audio", facts: { seconds: 4, resolution: "720p", generate_audio: true } },
    { label: "720p / 8s / silent", facts: { seconds: 8, resolution: "720p", generate_audio: false } },
    { label: "1080p / 8s / audio", facts: { seconds: 8, resolution: "1080p", generate_audio: true } }
  ]
};

function fail(code, message) {
  throw new Error(code + ": " + message);
}
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
function onlyKeys(object, allowed, name) {
  if (!record(object)) fail("invalid_parameter", name + " must be an object");
  Object.keys(object).forEach(function (key) {
    if (allowed.indexOf(key) < 0) {
      // Never echo an attacker-controlled value, header or complete body.
      fail("unsupported_parameter", name + " contains an unsupported field");
    }
  });
}
function jsonObject(value, name) {
  if (typeof value === "string") {
    try { value = JSON.parse(value); }
    catch (_) { fail("invalid_json", name + " is not valid JSON"); }
  }
  if (!record(value)) fail("invalid_json", name + " must be a JSON object");
  return value;
}
function integer(value, name, min, max) {
  if (typeof value === "string" && /^[0-9]+$/.test(value)) value = Number(value);
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    fail("invalid_parameter", name + " must be an integer in the supported range");
  }
  return value;
}
function text(value, name, max, allowEmpty) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "") || value.length > max) {
    fail("invalid_parameter", name + " must be a string of at most " + max + " UTF-16 code units");
  }
  return value;
}
function upstreamModel(ctx) {
  const model = ctx.upstreamModel || ctx.model;
  if (MODELS.indexOf(model) < 0) fail("unsupported_model", "This plugin supports Veo 3.1 regular and Fast only");
  return model;
}

// The same validation is applied at decode, driver and usage boundaries.
function normalize(body, expectedModel) {
  onlyKeys(body, ["model", "prompt", "seconds", "size", "provider_options"], "request");
  const model = text(body.model, "model", 200, false);
  if (expectedModel && model !== expectedModel) fail("model_mismatch", "Request model differs from the pinned model");
  const prompt = text(body.prompt, "prompt", 9999, false);
  const seconds = own(body, "seconds") ? integer(body.seconds, "seconds", 4, 8) : 8;
  if ([4, 6, 8].indexOf(seconds) < 0) fail("invalid_parameter", "seconds must be 4, 6 or 8");
  const size = own(body, "size") ? body.size : "1280x720";
  if (typeof size !== "string" || !own(SIZES, size)) {
    fail("unsupported_size", "size must be 1280x720, 720x1280, 1920x1080 or 1080x1920");
  }
  // Deliberate phase-1 safety restriction, not a claim about all Leonardo modes.
  if (SIZES[size].resolution === "1080p" && seconds !== 8) {
    fail("unsupported_combination", "Phase 1 allows 1080p only with seconds=8");
  }
  let options = {};
  if (own(body, "provider_options")) {
    onlyKeys(body.provider_options, ["leonardo"], "provider_options");
    if (own(body.provider_options, "leonardo")) options = body.provider_options.leonardo;
  }
  onlyKeys(options, ["generate_audio", "seed", "negative_prompt"], "provider_options.leonardo");
  const audio = own(options, "generate_audio") ? options.generate_audio : true;
  if (typeof audio !== "boolean") fail("invalid_parameter", "generate_audio must be a JSON boolean");
  const clean = { generate_audio: audio };
  if (own(options, "seed")) clean.seed = integer(options.seed, "seed", 0, 4294967295);
  if (own(options, "negative_prompt")) clean.negative_prompt = text(options.negative_prompt, "negative_prompt", 1000, true);
  return { model: model, prompt: prompt, seconds: seconds, size: size, provider_options: { leonardo: clean } };
}
function readProtocolBody(ctx) {
  const body = ctx.body || {};
  if (body.kind === "json") {
    if (!record(body.value)) fail("invalid_json", "Request body must be an object");
    return body.value;
  }
  if (body.kind !== "multipart" && body.kind !== "form") {
    fail("unsupported_content_type", "Use JSON or form data containing text fields only");
  }
  if (body.files && body.files.length) fail("unsupported_input", "Phase 1 does not accept input_reference or uploaded files");
  const fields = body.fields || {};
  onlyKeys(fields, ["model", "prompt", "seconds", "size", "provider_options"], "form");
  const result = {};
  Object.keys(fields).forEach(function (key) {
    const values = fields[key];
    if (!Array.isArray(values) || values.length !== 1 || typeof values[0] !== "string") {
      fail("invalid_parameter", "Form fields must occur exactly once");
    }
    result[key] = key === "provider_options" ? jsonObject(values[0], "provider_options") : values[0];
  });
  return result;
}
function baseURL(ctx) {
  if (ctx.upstream && ctx.upstream.kind !== "vendor") fail("unsupported_upstream", "Use a vendor Task Plugin channel, not a New API upstream");
  const base = (ctx.baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
  // Admin-controlled API root only. Never accept a client-supplied URL or key.
  if (!/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?$/.test(base)) {
    fail("invalid_base_url", "Base URL must be an HTTPS origin without /v1, /api/rest, query or credentials");
  }
  return base;
}
function authHeaders(ctx) {
  let authorization = ctx.authHeader;
  if (!authorization && typeof ctx.apiKey === "string" && ctx.apiKey.trim()) authorization = "Bearer " + ctx.apiKey.trim();
  if (typeof authorization !== "string" || !/^Bearer [^\s]+$/i.test(authorization)) {
    fail("missing_credentials", "Configure a Leonardo API key in the channel");
  }
  return { Authorization: authorization, "Content-Type": "application/json", Accept: "application/json" };
}
function normalizedContext(ctx) {
  if (ctx.files && ctx.files.length) fail("unsupported_input", "Phase 1 accepts text-to-video only");
  return normalize(ctx.requestBody, ctx.model);
}
function requestFacts(request) {
  return {
    seconds: request.seconds,
    resolution: SIZES[request.size].resolution,
    generate_audio: request.provider_options.leonardo.generate_audio
  };
}
function validId(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,190}$/.test(value);
}
function generationId(body) {
  // Explicit defensive envelope compatibility; no arbitrary `id` fallback.
  // Live v2 envelope verification remains part of the billable smoke test.
  const containers = [body];
  ["generate", "generation", "generationJob", "sdGenerationJob", "motionVideoGenerationJob", "data"].forEach(function (key) {
    if (record(body[key])) containers.push(body[key]);
  });
  let found = "";
  containers.forEach(function (item) {
    if (!own(item, "generationId")) return;
    const candidate = item.generationId;
    if (!validId(candidate)) fail("invalid_upstream_response", "Leonardo returned an invalid generationId");
    if (found && candidate !== found) fail("invalid_upstream_response", "Conflicting generation IDs; do not automatically resubmit");
    found = candidate;
  });
  if (!found) {
    fail("invalid_upstream_response", "No generationId in a recognized envelope; check the upstream response before resubmitting a billable request");
  }
  return found;
}
function generation(value) {
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch (_) { return null; }
  }
  return record(value) && record(value.generations_by_pk) ? value.generations_by_pk : null;
}
function publicVideoURL(value) {
  if (typeof value !== "string" || value.length > 16384 || /[\s\\\u0000-\u001f\u007f]/.test(value)) return "";
  const match = /^https:\/\/([A-Za-z0-9.-]+)(?::443)?(\/[^#]*)$/.exec(value);
  if (!match) return "";
  const host = match[1].toLowerCase();
  if (host.indexOf(".") < 0 || host.endsWith(".") || /^[0-9.]+$/.test(host) ||
      /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) return "";
  // Defense in depth only. Host must still perform DNS/IP + redirect SSRF checks.
  return value;
}
function videoURL(data) {
  const item = generation(data);
  if (!item || item.status !== "COMPLETE" || !Array.isArray(item.generated_images)) return "";
  for (let i = 0; i < item.generated_images.length; i++) {
    const output = item.generated_images[i];
    if (!record(output) || output.nsfw === true) continue;
    const url = publicVideoURL(output.motionMP4URL);
    if (url) return url;
  }
  return "";
}
function safeState(value) {
  // Recreate, never mutate, host-owned containers. Do not copy arbitrary fields.
  const input = record(value) ? value : {};
  const state = { version: 1, missingVideoPolls: 0 };
  if (record(input.request)) {
    try {
      const request = normalize(input.request, "");
      state.request = request;
    } catch (_) { /* Old/invalid optional state does not prevent polling. */ }
  }
  if (Number.isInteger(input.missingVideoPolls) && input.missingVideoPolls >= 0) {
    state.missingVideoPolls = Math.min(input.missingVideoPolls, MISSING_VIDEO_LIMIT);
  }
  return state;
}

export function buildSubmitRequest(ctx) {
  const request = normalizedContext(ctx);
  const model = upstreamModel(ctx);
  const size = SIZES[request.size];
  const options = request.provider_options.leonardo;
  const parameters = {
    prompt: request.prompt, duration: request.seconds,
    width: size.width, height: size.height,
    quantity: 1, motion_has_audio: options.generate_audio
  };
  if (own(options, "seed")) parameters.seed = options.seed;
  if (own(options, "negative_prompt")) parameters.negative_prompt = options.negative_prompt;
  return {
    url: baseURL(ctx) + "/api/rest/v2/generations",
    method: "POST", headers: authHeaders(ctx),
    body: { model: model, public: false, parameters: parameters }
  };
}

export function parseSubmitResponse(ctx, response) {
  if (!response || response.statusCode < 200 || response.statusCode >= 300) {
    fail("upstream_submit_failed", "Leonardo did not accept the submit request");
  }
  const body = jsonObject(response.body, "Leonardo response");
  if (body.success === false || body.error || (Array.isArray(body.errors) && body.errors.length)) {
    fail("upstream_submit_failed", "Leonardo returned an application-level error; check task logs before resubmitting");
  }
  const id = generationId(body);
  const request = normalizedContext(ctx);
  // taskData supplies create-response metadata. Host polling later replaces it.
  return {
    taskId: id,
    taskData: { _leonardo_phase1: { request: request } },
    state: { version: 1, request: request, missingVideoPolls: 0 }
  };
}

export function buildQueryRequest(ctx) {
  if (!validId(ctx.taskId)) fail("invalid_task_id", "Missing or invalid upstream generation ID");
  return {
    url: baseURL(ctx) + "/api/rest/v1/generations/" + encodeURIComponent(ctx.taskId),
    method: "GET", headers: authHeaders(ctx)
  };
}

export function parseTaskResult(ctx, body, response) {
  if (response && typeof response.status === "number" && (response.status < 200 || response.status >= 300)) {
    return { status: "UNKNOWN", reason: "Leonardo query returned a non-success HTTP status" };
  }
  const item = generation(body);
  if (!item || typeof item.status !== "string") {
    return { status: "UNKNOWN", reason: "Missing generations_by_pk.status in Leonardo query response" };
  }
  if (item.id && item.id !== ctx.taskId) {
    return { status: "UNKNOWN", reason: "Leonardo query returned a different generation ID" };
  }
  const status = item.status.toUpperCase();
  if (status === "PENDING") {
    return { status: "QUEUED", progress: "0%" };
  }
  if (status === "FAILED") {
    return { status: "FAILURE", reason: "Leonardo video generation failed; inspect the upstream task in the administrator logs" };
  }
  if (status !== "COMPLETE") {
    return { status: "UNKNOWN", reason: "Unrecognized Leonardo generation status" };
  }
  const url = videoURL(body);
  if (url) return { status: "SUCCESS", progress: "100%", url: url };
  // Do not return a thumbnail as MP4 or keep an incomplete task alive forever.
  const state = safeState(ctx.state);
  state.missingVideoPolls += 1;
  if (state.missingVideoPolls >= MISSING_VIDEO_LIMIT) {
    return {
      status: "FAILURE",
      reason: "Leonardo reported COMPLETE without a usable, unflagged motionMP4URL after three observations",
      state: state
    };
  }
  return { status: "IN_PROGRESS", progress: "0%", state: state };
}

export function extractUsage(ctx) {
  // Keep legacy per-call pricing from accidentally multiplying seconds twice.
  // Use the documented expression-based pricing to charge per requested second.
  if (ctx.usagePurpose === "billing_ratios") return {};
  return requestFacts(normalizedContext(ctx));
}

export function extractUsageOnComplete(ctx, result, data) {
  // Host may call this before terminal success. Never invent zero costs or dollars.
  const status = result && (result.status || result.Status);
  if (status !== "SUCCESS" || !videoURL(data)) return {};
  const state = safeState(ctx.state);
  return state.request ? requestFacts(state.request) : {};
}

export function listArtifacts(task) {
  if (!task || task.status !== "SUCCESS" || !videoURL(task.data)) return [];
  return [{ key: "video", type: "video", mimeType: "video/mp4" }];
}

export function buildContentRequest(ctx) {
  if (ctx.artifactKey !== "video") fail("unsupported_artifact", "Only the video artifact is supported");
  if (ctx.status && ctx.status !== "SUCCESS") fail("video_not_ready", "The video is not ready");
  const url = videoURL(ctx.data);
  if (!url) fail("video_not_ready", "A safe motionMP4URL is not available");
  const method = ctx.clientRequest && ctx.clientRequest.method ? ctx.clientRequest.method : "GET";
  if (method !== "GET" && method !== "HEAD") fail("invalid_method", "Video content supports GET and HEAD only");
  // Deliberately no headers/body. Never forward the Leonardo or New API key to CDN.
  return { url: url, method: method, credentialless: true };
}

function renderVideo(ctx, task) {
  const properties = record(task.properties) ? task.properties : {};
  const statuses = { SUCCESS: "completed", FAILURE: "failed", IN_PROGRESS: "in_progress" };
  const result = {
    id: task.task_id,
    object: "video",
    model: properties.origin_model_name || "",
    status: statuses[task.status] || "queued",
    progress: task.status === "SUCCESS" ? 100 : 0,
    created_at: typeof task.created_at === "number" ? task.created_at : 0,
    error: task.status === "FAILURE" ? {
      code: "video_generation_failed",
      message: "Video generation failed. Contact the gateway administrator with this task ID."
    } : null
  };
  const data = record(task.data) ? task.data : {};
  const cached = record(data._leonardo_phase1) ? data._leonardo_phase1.request : null;
  if (record(cached)) {
    try {
      const request = normalize(cached, "");
      result.seconds = String(request.seconds);
      result.size = request.size;
      result.prompt = request.prompt;
    } catch (_) { /* No guessed request metadata. */ }
  }
  const item = generation(task.data);
  if (item) {
    if (typeof item.prompt === "string") result.prompt = item.prompt;
    if (Number.isInteger(item.imageWidth) && Number.isInteger(item.imageHeight)) {
      result.size = String(item.imageWidth) + "x" + String(item.imageHeight);
    }
    // Do not read private state in TaskView or guess duration from the model.
    // The public query contract does not reliably expose the original seconds.
  }
  // New API owns public ID/model/status/progress/timestamps and overwrites them.
  return result;
}

export const protocols = {
  openai_video: {
    decodeRequest: function (ctx) {
      if (ctx.method !== "POST") fail("invalid_method", "Video creation requires POST");
      if (ctx.stream === true) fail("unsupported_parameter", "Phase 1 uses asynchronous tasks, not streaming");
      const request = normalize(readProtocolBody(ctx), ctx.model);
      return { kind: "submit", model: request.model, action: "text_to_video", requestBody: request };
    },
    render: renderVideo
  }
};

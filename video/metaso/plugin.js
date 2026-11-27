// Independent New API adapter for the documented MetaSo MiniMax H3 task protocol.
const MODEL = "metaso-minimax-h3";
const RESOLUTIONS = ["768P", "2K"];
const SIZES = {
  "1280x720": ["768P", "16:9"],
  "720x1280": ["768P", "9:16"],
  "1792x1024": ["2K", "16:9"],
  "1024x1792": ["2K", "9:16"]
};
const RATIOS = ["adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
const IMAGES = ["reference_image", "first_frame", "last_frame"];
const FAILURE = "Video generation failed";
const USAGE = {
  seconds: { type: "number", unit: "second", description: { en: "Output video duration", zh: "输出视频时长" } },
  resolution: { enum: RESOLUTIONS, description: { en: "Output resolution", zh: "输出分辨率" } },
  image_count_after_free: {
    type: "number", unit: "count", description: { en: "Reference images after the first five", zh: "超过前五张的输入图片" }
  }
};
const USAGE_EXAMPLES = [
  { label: "768P 4s", facts: { seconds: 4, resolution: "768P", image_count_after_free: 0 } },
  { label: "2K 8s", facts: { seconds: 8, resolution: "2K", image_count_after_free: 2 } }
];

export const meta = {
  apiVersion: 1,
  key: "crazycherrys_metaso-h3",
  name: "MetaSo H3 Video",
  description: { en: "MiniMax H3 video generation with image and audio references", zh: "MiniMax H3 视频生成，支持图片和音频参考素材" },
  version: "1.0.0",
  author: { name: "CrazyCherrys", url: "https://github.com/CrazyCherrys" },
  website: "https://metaso.cn/minimax-h3/new-api-guide",
  baseUrl: "https://metaso.cn/api",
  auth: "api_key",
  upstreams: ["vendor"],
  fetchMode: "per_task",
  protocols: ["openai_video"],
  models: [MODEL],
  usageSchema: USAGE,
  usageExamples: USAGE_EXAMPLES,
  usageProfiles: [{ models: [MODEL], schema: USAGE, examples: USAGE_EXAMPLES }]
};

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function own(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function string(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readBody(body) {
  if (body && body.kind === "json" && object(body.value)) return body.value;
  if (!body || body.kind !== "multipart") throw new Error("Expected a JSON object or multipart/form-data");
  const req = Object.create(null);
  for (const [key, values] of Object.entries(body.fields || {})) {
    if (values.length !== 1) throw new Error("Each multipart text field must be provided once");
    req[key] = values[0];
  }
  if (own(req, "metadata")) {
    try {
      req.metadata = JSON.parse(req.metadata);
    } catch (_) {
      throw new Error("metadata must be a JSON object");
    }
  }
  return req;
}

function referenceVideoError() {
  return new Error("Reference video requires host-side duration measurement");
}

function referenceURL(value) {
  const ref = object(value) ? value : { url: value };
  const fileId = ref.file_id;
  if (fileId !== undefined) {
    if (typeof fileId === "number" && !Number.isSafeInteger(fileId)) throw new Error("Invalid reference file ID");
    const id = String(fileId).replace(/^mm_file:\/\//, "");
    if (!/^\d+$/.test(id)) throw new Error("Invalid reference file ID");
    return "mm_file://" + id;
  }
  const url = string(ref.url);
  if (/^mm_file:\/\/\d+$/.test(url) || /^https?:\/\/[^\s/?#@\\]+(?:[/?#][^\s\\]*)?$/i.test(url)) return url;
  throw new Error("Reference media requires an HTTP(S) URL or a valid file ID");
}

function media(type, role, url) {
  return { type, role, [type]: { url } };
}

function contentItem(item) {
  if (!object(item)) throw new Error("Each content item must be an object");
  if (item.type === "text") {
    const text = string(item.text);
    if (!text) throw new Error("Content text must be non-empty");
    return { type: "text", text };
  }
  if (item.type === "video_url") throw referenceVideoError();
  if (item.type === "image_url") {
    const role = item.role === undefined ? "reference_image" : item.role;
    if (!IMAGES.includes(role)) throw new Error("Unsupported image role");
    return media("image_url", role, referenceURL(item.image_url));
  }
  if (item.type === "audio_url" && (item.role === undefined || item.role === "reference_audio")) {
    return media("audio_url", "reference_audio", referenceURL(item.audio_url));
  }
  throw new Error("Unsupported content item type or role");
}

function uploadedMedia(file) {
  if (file.field === "reference_video" || file.field === "video_reference") throw referenceVideoError();
  const audio = file.field === "reference_audio";
  if (!audio && file.field !== "input_reference" && file.field !== "reference_image") {
    throw new Error("Unsupported media upload field");
  }
  const mimeType = string(file.mimeType).toLowerCase();
  const allowed = audio ? ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav"] :
    ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(mimeType)) throw new Error("Unsupported media upload type");
  const maxBytes = (audio ? 15 : 30) * 1024 * 1024;
  if (typeof file.size === "number" && file.size > maxBytes) throw new Error("Media upload exceeds the size limit");
  return media(audio ? "audio_url" : "image_url", audio ? "reference_audio" : "reference_image", {
    __fileRef: file.ref,
    encoding: "dataUrl",
    mimeType,
    maxBytes
  });
}

function buildContent(req, metadata, files) {
  if (own(req, "content") || own(req, "metaso_content")) throw new Error("Use metadata.metaso_content for ordered references");
  for (const name of ["reference_video", "video_reference"]) {
    if (own(req, name) || own(metadata, name)) throw referenceVideoError();
  }
  const entries = metadata.metaso_content === undefined ? [] : metadata.metaso_content;
  if (!Array.isArray(entries)) throw new Error("metadata.metaso_content must be an array");
  const content = entries.map(contentItem);
  if (req.input_reference !== undefined) {
    const ref = req.input_reference;
    const value = object(ref) && own(ref, "image_url") ? ref.image_url : ref;
    content.push(media("image_url", "reference_image", referenceURL(value)));
  }
  for (const file of files) content.push(uploadedMedia(file));
  if (!content.some(item => item.type === "text")) {
    const text = string(req.prompt);
    if (!text) throw new Error("A prompt or content text is required");
    content.unshift({ type: "text", text });
  }
  const images = content.filter(item => item.type === "image_url");
  if (images.length > 9) throw new Error("At most nine input images are supported");
  if (content.filter(item => item.type === "audio_url").length > 3) throw new Error("At most three input audios are supported");
  const first = images.filter(item => item.role === "first_frame").length;
  const last = images.filter(item => item.role === "last_frame").length;
  if (first > 1 || last > 1 || last > first) throw new Error("Provide at most one first frame, followed by an optional last frame");
  if (last && images.findIndex(item => item.role === "last_frame") < images.findIndex(item => item.role === "first_frame")) {
    throw new Error("The first frame must precede the last frame");
  }
  return content;
}

function output(req, metadata) {
  const size = string(req.size);
  const preset = own(SIZES, size) ? SIZES[size] : null;
  if (req.size !== undefined && !preset) throw new Error("Unsupported size for this video model");
  const resolution = req.resolution ?? metadata.resolution ?? req.metaso_resolution ?? metadata.metaso_resolution ?? (preset ? preset[0] : "768P");
  const ratio = req.ratio ?? metadata.ratio ?? req.metaso_ratio ?? metadata.metaso_ratio ?? (preset ? preset[1] : "9:16");
  if (!RESOLUTIONS.includes(resolution)) throw new Error("resolution must be 768P or 2K");
  if (!RATIOS.includes(ratio)) throw new Error("Unsupported video aspect ratio");
  if (preset && (preset[0] !== resolution || preset[1] !== ratio)) {
    throw new Error("size conflicts with resolution or ratio");
  }
  const duration = req.seconds ?? req.duration ?? 4;
  const seconds = typeof duration === "number" || /^\d+$/.test(string(duration)) ? Number(duration) : NaN;
  if (!Number.isInteger(seconds) || seconds < 4 || seconds > 15) throw new Error("seconds must be an integer from 4 to 15");
  return { duration: seconds, resolution, ratio };
}

const STATUS = {
  submitted: "QUEUED",
  pending: "QUEUED",
  queued: "QUEUED",
  running: "IN_PROGRESS",
  processing: "IN_PROGRESS",
  succeeded: "SUCCESS",
  success: "SUCCESS",
  completed: "SUCCESS",
  done: "SUCCESS",
  failed: "FAILURE",
  fail: "FAILURE",
  failure: "FAILURE",
  expired: "FAILURE",
  error: "FAILURE",
  cancelled: "FAILURE",
  canceled: "FAILURE"
};

const PUBLIC_STATUS = {
  NOT_START: "queued",
  SUBMITTED: "queued",
  QUEUED: "queued",
  IN_PROGRESS: "in_progress",
  SUCCESS: "completed",
  FAILURE: "failed"
};

export const protocols = {
  openai_video: {
    decodeRequest(ctx) {
      if (ctx.model !== MODEL) throw new Error("Unsupported video model");
      if (ctx.operation === "remix" || /\/remix\/?$/.test(ctx.path || "")) throw new Error("Video remix is not supported");
      const req = readBody(ctx.body);
      const metadata = req.metadata === undefined ? {} : req.metadata;
      if (!object(metadata)) throw new Error("metadata must be a JSON object");
      const content = buildContent(req, metadata, ctx.body.files || []);
      let action = "text_to_video";
      if (content.some(item => item.type === "image_url")) action = "image_to_video";
      if (content.some(item => item.type === "audio_url")) action = "multimodal_to_video";
      return { kind: "submit", model: MODEL, action, requestBody: { ...output(req, metadata), content } };
    },
    render(_ctx, task) {
      const status = own(PUBLIC_STATUS, task.status) ? PUBLIC_STATUS[task.status] : "unknown";
      const reply = {
        id: task.task_id,
        object: "video",
        model: MODEL,
        status,
        progress: progress(task.progress),
        created_at: Number(task.created_at || 0)
      };
      if (status === "completed") {
        reply.progress = 100;
        reply.result_url = "/v1/videos/" + encodeURIComponent(task.task_id) + "/content";
        if (task.finished_at || task.updated_at) reply.completed_at = Number(task.finished_at || task.updated_at);
      }
      if (status === "failed") reply.error = { code: "video_generation_failed", message: FAILURE };
      return reply;
    }
  }
};

function base(ctx) {
  return String(ctx.baseUrl || "https://metaso.cn/api").replace(/\/+$/, "");
}

function auth(ctx) {
  const key = string(ctx.apiKey);
  if (!key) throw new Error("Video channel API key is missing");
  return { Authorization: "Bearer " + key, Accept: "application/json" };
}

export function buildSubmitRequest(ctx) {
  const req = ctx.requestBody;
  return {
    url: base(ctx) + "/minimax/v2/video_generation",
    method: "POST",
    headers: { ...auth(ctx), "Content-Type": "application/json" },
    body: {
      model: "MiniMax-H3",
      duration: req.duration,
      resolution: req.resolution,
      ratio: req.ratio,
      content: req.content,
      context_ir_enabled: false
    },
    action: ctx.action
  };
}

function taskData(body) {
  if (!object(body)) return {};
  return object(body.task) ? body.task : body;
}

function artifactURL(body) {
  const task = taskData(body);
  const url = object(task.content) ? string(task.content.url) : "";
  return /^https?:\/\/[^\s/?#@\\]+(?:[/?#][^\s\\]*)?$/i.test(url) ? url : "";
}

function progress(value) {
  const number = Number(String(value ?? "").replace(/%$/, ""));
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0;
}

export function parseSubmitResponse(ctx, response) {
  const body = object(response.body) ? response.body : {};
  const task = taskData(body);
  const id = body.task_id ?? task.id ?? task.task_id;
  if (!(typeof id === "string" && id.trim()) && !(Number.isSafeInteger(id) && id >= 0)) {
    throw new Error("Video submission response is missing a task ID");
  }
  const result = parseTaskResult(ctx, body);
  const output = { taskId: String(id), taskData: {} };
  if (result.status === "SUCCESS" || result.status === "FAILURE") {
    output.immediate = result;
    // Completion billing and artifacts may need these fields if the vendor completed immediately.
    output.taskData = { status: task.status, duration: task.duration, resolution: task.resolution, content: { url: artifactURL(body) } };
  }
  return output;
}

export function buildQueryRequest(ctx) {
  if (!string(ctx.taskId)) throw new Error("Video task ID is missing");
  return {
    url: base(ctx) + "/minimax/v2/query/video_generation/" + encodeURIComponent(ctx.taskId),
    method: "GET",
    headers: auth(ctx)
  };
}

export function parseTaskResult(_ctx, body) {
  const task = taskData(body);
  const value = string(task.status).toLowerCase();
  const status = own(STATUS, value) ? STATUS[value] : "UNKNOWN";
  if (status === "SUCCESS" && artifactURL(body)) return { status, progress: "100%" };
  if (status === "FAILURE" || status === "SUCCESS") return { status: "FAILURE", progress: "100%", reason: FAILURE };
  if (status === "IN_PROGRESS") return { status, progress: (task.progress === undefined ? 50 : progress(task.progress)) + "%" };
  if (status === "QUEUED") return { status, progress: "0%" };
  return { status };
}

export function extractUsage(ctx) {
  if (ctx.usagePurpose === "billing_ratios") return null;
  const req = ctx.requestBody;
  const images = req.content.filter(item => item.type === "image_url").length;
  return { seconds: req.duration, resolution: req.resolution, image_count_after_free: Math.max(images - 5, 0) };
}

export function extractUsageOnComplete(_ctx, result, body) {
  if (result.status !== "SUCCESS") return {};
  const task = taskData(body);
  const facts = {};
  const seconds = typeof task.duration === "number" || /^\d+$/.test(string(task.duration)) ? Number(task.duration) : NaN;
  if (Number.isInteger(seconds) && seconds >= 4 && seconds <= 15) facts.seconds = seconds;
  if (RESOLUTIONS.includes(task.resolution)) facts.resolution = task.resolution;
  return facts;
}

export function listArtifacts(task) {
  return task.status === "SUCCESS" && artifactURL(task.data) ? [{ key: "video", type: "video", mimeType: "video/mp4" }] : [];
}

export function buildContentRequest(ctx) {
  const url = artifactURL(ctx.data);
  if (ctx.artifactKey !== "video" || !url) throw new Error("artifact_not_found");
  const method = (ctx.clientRequest || {}).method || "GET";
  if (method !== "GET" && method !== "HEAD") throw new Error("Unsupported video content method");
  return { url, method, credentialless: true };
}

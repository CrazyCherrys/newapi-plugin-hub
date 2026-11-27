/*
 * DreamStudio Video — New API Task Plugin API v1
 * MiniMax contracts checked against XYSNAI public video docs, 2026-11-27.
 * Configure a type-61 channel, Base URL https://xysnai.cn, and its API key.
 * Public model names match the upstream model names directly.
 * No prices are included. Configure each model's task usage pricing separately.
 * Offline contract tests accompany this file; live New API/XYSNAI deployment
 * has not been exercised. Multipart and HEAD need a live integration check.
 */

// New API reads these declarations without executing the plugin in its market preview.
const WAN = "wan3.0-video";
const H3 = "minimax-h3";
const H3_FL2V = "minimax-h3-fl2v";
const H3_LH = "minimax-h3-lh";
const H3_15S = "MiniMax-H3-15S";
const H3_30S = "MiniMax-H3-30S";
const H3_2K = "MiniMax-H3-2K-武庚纪";
const MG_2_0_720P = "mg-seedance-2.0-720p";
const MG_2_5_480P = "mg-seedance-2.5-480p";
const MG_2_5_4K = "mg-seedance-2.5-4k";
const MG_2_5_720P = "mg-seedance-2.5-720p";
const OV_1080P = "ov-seedance-2.5-1080p-nv";
const OV_480P = "ov-seedance-2.5-480p-nv";
const OV_720P = "ov-seedance-2.5-720p-nv";
const SD_2_0 = "sd-2.0";
const SD_2_5 = "sd-2.5";
const SALE_V2_720P = "特价V2seedance-2.5-720p-30s";
const SALE_480P = "特价seedance-2.5-480p-30s";
const SALE_NV_1080P = "特价seedance-2.5-nv-1080p-30s";
const SALE_NV_480P = "特价seedance-2.5-nv-480p";
const SALE_NV_720P = "特价seedance-2.5-nv-720p-30s";
const UPSCALE = "Video-upscale2.6";
const UPSTREAM_MODELS = [
  WAN, H3, H3_FL2V, H3_LH, H3_15S, H3_30S, H3_2K,
  MG_2_0_720P, MG_2_5_480P, MG_2_5_4K, MG_2_5_720P,
  OV_1080P, OV_480P, OV_720P, SD_2_0, SD_2_5,
  SALE_V2_720P, SALE_480P, SALE_NV_1080P, SALE_NV_480P, SALE_NV_720P, UPSCALE
];
// XYSNAI groups portrait, landscape and square sizes into explicit price tiers.
const H3_SIZES_BY_TIER = {
  "480P": ["864x480", "480x864", "640x640", "544x800", "800x544", "576x736", "736x576", "992x416"],
  "768P": ["1376x768", "768x1376", "1024x1024", "832x1248", "1248x832", "896x1184", "1184x896", "1568x672"],
  "1080P": ["1920x1088", "1088x1920", "1440x1440", "1184x1760", "1760x1184", "1248x1664", "1664x1248", "2208x960"],
  "2K": ["2K"],
  "4K": ["4K"]
};
const H3_TIERS = Object.keys(H3_SIZES_BY_TIER);
const H3_SIZES = H3_TIERS.flatMap(function (tier) { return H3_SIZES_BY_TIER[tier]; });
const H3_COMPAT_SIZES = {
  "1280x720": "1376x768",
  "720x1280": "768x1376",
  "1792x1024": "1920x1088",
  "1024x1792": "1088x1920",
  "1920x1080": "1920x1088",
  "1080x1920": "1088x1920"
};
const REFERENCE_OBJECT_FIELD = /^input_reference\[[^\]]+\]/;
const H3_ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
const VIDEO_FAILURE_MESSAGE = "Video generation failed";
const ARRAY_FIELDS = ["images", "reference_images", "reference_image_urls",
  "reference_videos", "reference_audios"];
const MEDIA_FIELDS = ARRAY_FIELDS.concat(["input_reference", "first_image",
  "last_image", "reference_video", "reference_audio"]);
const BOOLEAN_FIELDS = ["generate_audio", "watermark", "prompt_extend", "prompt_enhance"];
const SCALAR_FIELDS = ["model", "prompt", "seconds", "size", "resolution", "aspect_ratio", "mode",
  "quality", "scale", "enhancement_strength", "seed", "input_reference", "first_image",
  "last_image", "reference_video", "reference_audio"].concat(BOOLEAN_FIELDS);
const COMMON_USAGE = {
  requests: { type: "number", unit: "count", description: { en: "Task unit price", zh: "任务单价" } },
  input_images: { type: "number", unit: "count", description: { en: "Input image unit price", zh: "输入图片单价" } },
  input_videos: { type: "number", unit: "count", description: { en: "Input video reference unit price", zh: "输入视频参考单价" } },
  input_audios: { type: "number", unit: "count", description: { en: "Input audio reference unit price", zh: "输入音频参考单价" } },
  input_references: { type: "number", unit: "count", description: { en: "Untyped input reference unit price", zh: "未区分类型的 input_reference 单价" } }
};
const SECONDS = { type: "number", unit: "second", description: { en: "Video generation unit price", zh: "视频生成单价" } };
const H3_FIXED_USAGE = { requests: COMMON_USAGE.requests };
const H3_2K_USAGE = { seconds: SECONDS };
const AUDIO_MODE = { enum: ["unspecified", "on", "off"], description: { en: "Generate audio option", zh: "生成音频选项" } };
const H3_USAGE = Object.assign({}, COMMON_USAGE, {
  seconds: SECONDS,
  resolution: { enum: H3_TIERS, description: { en: "Video resolution tier", zh: "视频分辨率计费档位" } }
});
const WAN_USAGE = Object.assign({}, COMMON_USAGE, { seconds: SECONDS, resolution: { enum: ["480P", "720P", "1080P"] }, audio_mode: AUDIO_MODE });
const SD_USAGE = Object.assign({}, COMMON_USAGE, { seconds: SECONDS, resolution: { enum: ["480p", "720p", "1080p", "2k", "4k"] }, audio_mode: AUDIO_MODE });
const SEEDANCE_USAGE = Object.assign({}, COMMON_USAGE, {
  seconds: SECONDS,
  quality: { enum: ["unspecified", "low", "medium", "high"] }
});
const UPSCALE_USAGE = Object.assign({}, COMMON_USAGE, {
  billing_seconds: { type: "number", unit: "second", description: { en: "Upstream billing time unit price", zh: "上游计费时长单价" } }
});

function family(model) {
  if (model === "wan3.0-video") return "wan";
  if (model === "Video-upscale2.6") return "upscale";
  if (model === "sd-2.0" || model === "sd-2.5") return "sd";
  if (model.indexOf("minimax-h3") === 0) return "h3";
  if (model === H3_15S || model === H3_30S) return "h3_fixed";
  if (model === H3_2K) return "h3_2k";
  return "seedance";
}
export const meta = {
  apiVersion: 1,
  key: "crazycherrys_xysnai-video",
  name: "DreamStudio Video",
  description: { en: "Video generation and upscaling via XYSNAI", zh: "通过 XYSNAI 生成视频和超分" },
  version: "1.4.0",
  author: { name: "CrazyCherrys", url: "https://github.com/CrazyCherrys" },
  website: "https://xysnai.cn/zh/docs",
  baseUrl: "https://xysnai.cn",
  auth: "api_key",
  upstreams: ["vendor"],
  fetchMode: "per_task",
  protocols: ["openai_video"],
  models: UPSTREAM_MODELS,
  // No channelTypes: do not capture the official Sora/OpenAI/MiniMax providers.
  usageSchema: COMMON_USAGE,
  usageProfiles: [
    { models: [H3, H3_FL2V, H3_LH], schema: H3_USAGE },
    { models: [H3_15S, H3_30S], schema: H3_FIXED_USAGE },
    { models: [H3_2K], schema: H3_2K_USAGE },
    { models: [WAN], schema: WAN_USAGE },
    { models: [SD_2_0, SD_2_5], schema: SD_USAGE },
    { models: [
      MG_2_0_720P, MG_2_5_480P, MG_2_5_4K, MG_2_5_720P, OV_1080P, OV_480P, OV_720P,
      SALE_V2_720P, SALE_480P, SALE_NV_1080P, SALE_NV_480P, SALE_NV_720P
    ], schema: SEEDANCE_USAGE },
    { models: [UPSCALE], schema: UPSCALE_USAGE }
  ]
};

function own(object, name) { return Object.prototype.hasOwnProperty.call(object, name); }
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function fieldName(value) { return String(value).replace(/\[\]$/, ""); }
function upstreamModel(ctx) {
  const model = String(ctx.upstreamModel || ctx.model || "");
  if (UPSTREAM_MODELS.indexOf(model) < 0) throw new Error("Unsupported video model");
  const source = String(ctx.model || "");
  // Cross-family remapping could select the wrong pricing profile.
  if (UPSTREAM_MODELS.indexOf(source) >= 0 && family(source) !== family(model)) {
    throw new Error("Cross-family video model mapping is not supported");
  }
  return model;
}
function base(ctx) {
  // The marketplace parser treats references to the manifest as potential mutations.
  const value = String(ctx.baseUrl || "https://xysnai.cn").replace(/\/+$/, "");
  if (/\/v1$/.test(value)) throw new Error("Video channel base URL must not end in /v1");
  return value;
}
function auth(ctx) {
  const key = String(ctx.apiKey || "").trim();
  if (!key) throw new Error("Video channel API key is missing");
  return { Authorization: "Bearer " + key };
}
function number(value, name) {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") {
    throw new Error(name + " must be a number");
  }
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(name + " must be finite");
  return result;
}
function inRange(value, name, min, max, integer) {
  const result = number(value, name);
  if ((integer && !Number.isInteger(result)) || result < min || result > max) {
    throw new Error(name + " must be " + (integer ? "an integer " : "") + "between " + min + " and " + max);
  }
  return result;
}
function enumValue(value, name, values, required) {
  if (value === undefined && !required) return;
  if (typeof value !== "string" || values.indexOf(value) < 0) {
    throw new Error(name + " must be one of " + values.join(", "));
  }
}
function countField(req, files, key) {
  const value = req[key];
  let count = value === undefined || value === null || value === "" ? 0 : Array.isArray(value) ? value.length : 1;
  for (const file of files) if (fieldName(file.field) === key) count++;
  return count;
}
function checkArray(req, files, key, max, min = 0) {
  if (req[key] !== undefined && !Array.isArray(req[key])) throw new Error(key + " must be an array");
  if (Array.isArray(req[key])) {
    for (const value of req[key]) {
      if (typeof value !== "string" || !value.trim()) throw new Error(key + " must contain nonempty URL strings");
    }
  }
  const count = countField(req, files, key);
  if (req[key] !== undefined && count < min) throw new Error(key + " requires at least " + min + " reference when provided");
  if (count > max) throw new Error(key + " accepts at most " + max + " references");
}
function validateH3Variant(req, files, model) {
  if (Array.from(req.prompt).length > 20000) throw new Error("prompt exceeds 20000 characters");
  checkArray(req, files, "reference_images", 9);
  checkArray(req, files, "reference_videos", 3);
  checkArray(req, files, "reference_audios", 3);
  if (model === H3_2K) {
    req.seconds = inRange(req.seconds, "seconds", 5, 28, true);
    enumValue(req.resolution, "resolution", ["2k"], false);
    enumValue(req.aspect_ratio, "aspect_ratio", ["9:16", "16:9", "1:1"], false);
    enumValue(req.generation_mode, "generation_mode", ["reference", "multimodal", "text", "image_video", "image_audio"], false);
    for (const name of ["first_frame", "last_frame"]) {
      if (req[name] !== undefined && (typeof req[name] !== "string" || !req[name].trim())) throw new Error(name + " must be a nonempty URL string");
      if (countField(req, files, name) > 1) throw new Error(name + " must be provided once");
    }
  } else {
    enumValue(req.aspect_ratio, "aspect_ratio", ["16:9"], false);
    if (model === H3_30S) {
      req.seconds = req.seconds === undefined ? 30 : inRange(req.seconds, "seconds", 30, 30, true);
    } else {
      req.seconds = number(req.seconds, "seconds");
      if (![4, 6, 8, 12, 15].includes(req.seconds)) throw new Error("seconds must be one of 4, 6, 8, 12, 15");
    }
  }
}
function validate(req, files, model) {
  const kind = family(model);
  for (const key of BOOLEAN_FIELDS) {
    if (req[key] !== undefined && typeof req[key] !== "boolean") throw new Error(key + " must be a boolean");
  }
  if (kind !== "wan" && kind !== "upscale" && (typeof req.prompt !== "string" || !req.prompt.trim())) {
    throw new Error("prompt is required for " + model);
  }
  if (req.prompt !== undefined && typeof req.prompt !== "string") throw new Error("prompt must be a string");
  if (kind === "h3_fixed" || kind === "h3_2k") return validateH3Variant(req, files, model);
  if (kind !== "upscale") req.seconds = inRange(req.seconds, "seconds", kind === "wan" ? 2 : 4, kind === "h3" ? 15 : 30, true);
  else if (req.seconds !== undefined) throw new Error("Video-upscale2.6 does not use the seconds field");
  if (kind === "h3") {
    enumValue(req.size, "size", H3_SIZES, true);
    enumValue(req.aspect_ratio, "aspect_ratio", H3_ASPECT_RATIOS, false);
    if (req.mode !== undefined && typeof req.mode !== "string") throw new Error("mode must be a string");
    checkArray(req, files, "images", 9, 1);
    checkArray(req, files, "reference_audios", 3, 1);
    checkArray(req, files, "reference_videos", 3, 1);
  } else if (kind === "wan") {
    enumValue(req.resolution, "resolution", ["480P", "720P", "1080P"], true);
    checkArray(req, files, "reference_images", 10);
    checkArray(req, files, "reference_audios", 5);
    checkArray(req, files, "reference_videos", 5);
  } else if (kind === "sd") {
    enumValue(req.resolution, "resolution", ["480p", "720p", "1080p", "2k", "4k"], true);
    checkArray(req, files, "reference_images", 30);
    checkArray(req, files, "reference_audios", 10);
    checkArray(req, files, "reference_videos", 10);
  } else if (kind === "seedance") {
    enumValue(req.aspect_ratio, "aspect_ratio", ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"], true);
    enumValue(req.quality, "quality", ["low", "medium", "high"], false);
    checkArray(req, files, "reference_image_urls", 30);
    checkArray(req, files, "reference_audios", 10);
    checkArray(req, files, "reference_videos", 10);
  } else {
    checkArray(req, files, "reference_videos", 1);
    if (countField(req, files, "reference_video") + countField(req, files, "reference_videos") !== 1) {
      throw new Error("Video-upscale2.6 requires exactly one reference_video or reference_videos item");
    }
    if (req.scale !== undefined) req.scale = inRange(req.scale, "scale", 1, 4, false);
    if (req.enhancement_strength !== undefined) req.enhancement_strength = inRange(req.enhancement_strength, "enhancement_strength", 0.5, 1.5, false);
  }
  for (const key of MEDIA_FIELDS) {
    if (ARRAY_FIELDS.indexOf(key) >= 0) continue;
    if (req[key] !== undefined && (typeof req[key] !== "string" || !req[key].trim())) throw new Error(key + " must be a nonempty URL string");
    if (countField(req, files, key) > 1) throw new Error(key + " must be provided once");
  }
}

function readBody(ctx, model) {
  const body = ctx.body || {};
  if (body.kind === "json") {
    if (!isObject(body.value)) throw new Error("JSON object required");
    return { payload: copy(body.value), files: [], fields: null };
  }
  if (body.kind !== "multipart") throw new Error("JSON or multipart/form-data body required");
  const fields = copy(body.fields || {});
  const req = Object.create(null);
  const scalars = model === H3_2K ? SCALAR_FIELDS.concat(["first_frame", "last_frame", "generation_mode"]) : SCALAR_FIELDS;
  for (const originalName of Object.keys(fields)) {
    const name = fieldName(originalName);
    const values = fields[originalName];
    if (!Array.isArray(values)) throw new Error("Invalid multipart field: " + originalName);
    let value;
    if (ARRAY_FIELDS.indexOf(name) >= 0) {
      value = values.slice();
      if (values.length === 1 && /^\s*\[/.test(values[0])) {
        try { value = JSON.parse(values[0]); } catch (_) { throw new Error(name + " must be a valid JSON array or repeated form field"); }
        if (!Array.isArray(value)) throw new Error(name + " must be an array");
      }
      req[name] = (req[name] || []).concat(value);
      continue;
    }
    if (scalars.indexOf(name) >= 0 && (values.length !== 1 || own(req, name))) {
      throw new Error(name + " must be provided once, including [] aliases");
    }
    req[name] = values.length === 1 ? values[0] : values.slice();
    if (BOOLEAN_FIELDS.indexOf(name) >= 0) {
      if (req[name] !== "true" && req[name] !== "false") throw new Error(name + " must be true or false");
      req[name] = req[name] === "true";
    }
  }
  return { payload: req, files: body.files || [], fields };
}

function normalizeH3Request(parsed, model) {
  const { payload, files, fields } = parsed;
  if (payload.seconds === undefined) payload.seconds = 4;
  if (payload.size === undefined) payload.size = "720x1280";
  if (typeof payload.size === "string" && own(H3_COMPAT_SIZES, payload.size)) {
    payload.size = H3_COMPAT_SIZES[payload.size];
  }

  let reference = payload.input_reference;
  // Standard SDKs can encode an object as a multipart bracket field.
  const referenceFields = fields ? Object.keys(fields).filter(name => REFERENCE_OBJECT_FIELD.test(name)) : [];
  if (files.some(file => REFERENCE_OBJECT_FIELD.test(file.field))) {
    throw new Error("input_reference image_url must be an HTTP(S) URL, not a file part");
  }
  if (referenceFields.length) {
    const name = referenceFields[0];
    if (reference !== undefined || referenceFields.length !== 1 || name !== "input_reference[image_url]" || fields[name].length !== 1) {
      throw new Error("input_reference image objects require exactly one image_url field");
    }
    reference = { image_url: fields[name][0] };
    delete fields[name];
  }
  if (!isObject(reference)) return;
  if (model === "minimax-h3-fl2v") {
    throw new Error("minimax-h3-fl2v does not map input_reference image objects to first or last frames");
  }
  const url = reference.image_url;
  if (Object.keys(reference).length !== 1 || !own(reference, "image_url") || typeof url !== "string"
      || !/^https?:\/\/[^\s/?#@\\\x00-\x1f\x7f]+(?:[/?#][^\s\\\x00-\x1f\x7f]*)?$/i.test(url)) {
    throw new Error("input_reference image objects require a publicly accessible HTTP(S) image_url");
  }
  if (payload.images !== undefined || files.some(file => ["images", "input_reference"].includes(fieldName(file.field)))) {
    throw new Error("use either the input_reference image object or uploaded/referenced images");
  }
  delete payload.input_reference;
  for (const name of referenceFields) delete payload[name];
  payload.images = [url];
  if (fields) fields.images = [url];
}

export const protocols = {
  openai_video: {
    decodeRequest: function (ctx) {
      if (/remix/i.test(String(ctx.operation || "")) || /\/remix\/?$/.test(String(ctx.path || ""))) {
        throw new Error("Video remix is not supported");
      }
      const model = upstreamModel(ctx);
      const parsed = readBody(ctx, model);
      if (family(model) === "h3") normalizeH3Request(parsed, model);
      validate(parsed.payload, parsed.files, model);
      parsed.payload.model = ctx.model;
      let mediaCount = parsed.files.length;
      for (const key of MEDIA_FIELDS) mediaCount += countField(parsed.payload, [], key);
      if (model === H3_2K) mediaCount += countField(parsed.payload, [], "first_frame") + countField(parsed.payload, [], "last_frame");
      return {
        kind: "submit",
        model: ctx.model,
        action: family(model) === "upscale" ? "video_upscale" : mediaCount ? "reference_to_video" : "text_to_video",
        // This internal envelope preserves repeated form strings for forwarding.
        requestBody: { payload: parsed.payload, formFields: parsed.fields }
      };
    },
    render: function (ctx, task) {
      const states = { NOT_START: "queued", SUBMITTED: "queued", QUEUED: "queued", IN_PROGRESS: "in_progress", SUCCESS: "completed", FAILURE: "failed" };
      const data = isObject(task.data) ? task.data : {};
      const knownModel = UPSTREAM_MODELS.indexOf(data.model) >= 0 ? data.model : "";
      const output = {
        id: task.task_id,
        object: "video",
        model: (task.properties || {}).origin_model_name || knownModel,
        status: own(states, task.status) ? states[task.status] : "unknown",
        progress: progress(task.progress === undefined ? data.progress : task.progress),
        created_at: Number(task.created_at || data.created_at || 0)
      };
      if (task.status === "SUCCESS") {
        output.progress = 100;
        output.result_url = "/v1/videos/" + encodeURIComponent(task.task_id) + "/content";
        const completedAt = Number(task.finished_at || task.updated_at || 0);
        if (completedAt > 0) output.completed_at = completedAt;
      }
      if (task.status === "FAILURE") output.error = { code: "video_generation_failed", message: VIDEO_FAILURE_MESSAGE };
      // Deliberate allowlist: no upstream balance/cost/billing_amount or raw result_url.
      return output;
    }
  }
};

function request(ctx) {
  const internal = ctx.requestBody;
  if (!isObject(internal) || !isObject(internal.payload)) throw new Error("Video request must pass through its protocol decoder");
  const req = copy(internal.payload);
  validate(req, ctx.files || [], upstreamModel(ctx));
  return req;
}

export function buildSubmitRequest(ctx) {
  const req = request(ctx);
  req.model = upstreamModel(ctx);
  const headers = auth(ctx);
  const fields = ctx.requestBody.formFields;
  if (fields !== null && fields !== undefined) {
    const parts = [];
    const seen = Object.create(null);
    const h3 = family(req.model) === "h3";
    for (const name of Object.keys(fields)) {
      const canonical = fieldName(name);
      seen[canonical] = true;
      if (canonical === "model" || canonical === "seconds" || canonical === "scale" || canonical === "enhancement_strength" || (h3 && canonical === "size")) {
        parts.push({ name, value: String(req[canonical]) });
      } else {
        for (const value of fields[name]) parts.push({ name, value });
      }
    }
    if (!seen.model) parts.push({ name: "model", value: req.model });
    if (req.model === H3_30S && !seen.seconds) parts.push({ name: "seconds", value: String(req.seconds) });
    if (h3) {
      for (const name of ["seconds", "size"]) if (!seen[name]) parts.push({ name, value: String(req[name]) });
    }
    for (const file of ctx.files || []) parts.push({ name: file.field, fileRef: file.ref, filename: file.filename });
    return { url: base(ctx) + "/v1/videos", method: "POST", headers, bodyType: "multipart", parts, rewriteModel: req.model };
  }
  if ((ctx.files || []).length) throw new Error("File uploads require multipart/form-data");
  headers["Content-Type"] = "application/json";
  return { url: base(ctx) + "/v1/videos", method: "POST", headers, body: req, rewriteModel: req.model };
}

export function parseSubmitResponse(ctx, response) {
  const body = response && response.body;
  if (!isObject(body) || typeof body.id !== "string" || !body.id.trim()) throw new Error("Video submission response is missing a task ID");
  const result = { taskId: body.id, taskData: body, state: { upstreamModel: upstreamModel(ctx) } };
  if (body.status === "completed" || body.status === "failed") result.immediate = parseTaskResult({}, body);
  return result;
}

export function buildQueryRequest(ctx) {
  if (typeof ctx.taskId !== "string" || !ctx.taskId) throw new Error("Video task ID is missing");
  return { url: base(ctx) + "/v1/videos/" + encodeURIComponent(ctx.taskId), method: "GET", headers: auth(ctx) };
}
function progress(value) {
  if (value === undefined || value === null || value === "") return 0;
  const result = Number(String(value).replace(/%$/, ""));
  return Number.isFinite(result) ? Math.min(100, Math.max(0, result)) : 0;
}
export function parseTaskResult(ctx, body) {
  if (!isObject(body)) return { status: "UNKNOWN", reason: "Invalid video task response" };
  const states = { queued: "QUEUED", in_progress: "IN_PROGRESS", completed: "SUCCESS", failed: "FAILURE" };
  const status = own(states, body.status) ? states[body.status] : undefined;
  if (!status) return { status: "UNKNOWN", reason: "Unrecognized video task status" };
  const result = { status };
  if (body.progress !== undefined && body.progress !== null) result.progress = progress(body.progress) + "%";
  if (status === "SUCCESS") result.progress = "100%";
  if (status === "FAILURE") result.reason = VIDEO_FAILURE_MESSAGE;
  return result;
}

export function extractUsage(ctx) {
  // New API's fixed per-call path multiplies every positive numeric ratio.
  // Usage facts below are quantities for task expressions, never price ratios.
  if (ctx.usagePurpose === "billing_ratios") return null;
  const req = request(ctx);
  const files = ctx.files || [];
  const kind = family(upstreamModel(ctx));
  if (kind === "h3_fixed") return { requests: 1 };
  if (kind === "h3_2k") return { seconds: req.seconds };
  const facts = { requests: 1, input_images: 0, input_videos: 0, input_audios: 0, input_references: 0 };
  const imageFields = kind === "h3" ? ["images"] : ["images", "reference_images", "reference_image_urls", "first_image", "last_image"];
  for (const name of imageFields) facts.input_images += countField(req, files, name);
  for (const name of ["reference_video", "reference_videos"]) facts.input_videos += countField(req, files, name);
  for (const name of ["reference_audio", "reference_audios"]) facts.input_audios += countField(req, files, name);
  // A URL input_reference can be an image OR a video. Do not guess its MIME type.
  facts.input_references = countField(req, files, "input_reference");
  if (kind !== "upscale") facts.seconds = req.seconds;
  if (kind === "h3") {
    // Existing size-based prices can still read this fact on New API hosts
    // that allow legacy fields. Only resolution is a pricing editor dimension.
    facts.size = req.size;
    facts.resolution = H3_TIERS.find(function (tier) { return H3_SIZES_BY_TIER[tier].indexOf(req.size) >= 0; });
  }
  if (kind === "wan" || kind === "sd") {
    facts.resolution = req.resolution;
    facts.audio_mode = req.generate_audio === undefined ? "unspecified" : req.generate_audio ? "on" : "off";
  }
  if (kind === "seedance") facts.quality = req.quality === undefined ? "unspecified" : req.quality;
  return facts;
}

export function extractUsageOnComplete(ctx, result, body) {
  if (result.status !== "SUCCESS" || !isObject(body)) return {};
  // No guessed currency conversion and no zero for unknown usage.
  // Upscale's actual billing_seconds semantic/availability still needs a live check.
  const model = upstreamModel(ctx);
  if (family(model) === "upscale" && body.billing_seconds !== undefined && body.billing_seconds !== null) {
    const seconds = number(body.billing_seconds, "billing_seconds");
    if (seconds < 0 || seconds > 3600) throw new Error("billing_seconds exceeds the host's supported range");
    return { billing_seconds: seconds };
  }
  return {};
}

export function listArtifacts(task) {
  return task.status === "SUCCESS" ? [{ key: "video", type: "video", mimeType: "video/mp4" }] : [];
}
export function buildContentRequest(ctx) {
  if (ctx.artifactKey !== "video") throw new Error("artifact_not_found");
  if (typeof ctx.upstreamTaskId !== "string" || !ctx.upstreamTaskId) throw new Error("Video task ID is missing");
  const client = ctx.clientRequest || { method: "GET", headers: {} };
  if (client.method !== "GET" && client.method !== "HEAD") throw new Error("Unsupported video content method");
  const headers = auth(ctx);
  const allowed = { range: "Range", "if-range": "If-Range", "if-none-match": "If-None-Match", "if-modified-since": "If-Modified-Since" };
  for (const name of Object.keys(client.headers || {})) {
    const target = own(allowed, name.toLowerCase()) ? allowed[name.toLowerCase()] : undefined;
    if (target) headers[target] = client.headers[name];
  }
  return { url: base(ctx) + "/v1/videos/" + encodeURIComponent(ctx.upstreamTaskId) + "/content", method: client.method, headers };
}

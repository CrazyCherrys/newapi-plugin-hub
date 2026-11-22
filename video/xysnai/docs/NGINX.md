# 在 Nginx 上保护视频 API 响应

在对外提供 DreamStudio Video 的 HTTPS 域名上加载 [Nginx 配置](nginx-video-privacy.conf)。配置保留 `/v1/videos` 的创建、查询和下载，以及其他未列出的站点路由。创建请求转发给 New API 一次，视频下载继续支持 `GET`、`HEAD` 和 `Range`。

## 加载配置

将配置保存到 Nginx 所在机器的 `/etc/nginx/snippets/dreamstudio-video-privacy.conf`。在现有的公网 HTTPS `server` 块中加入以下一行。

```nginx
include /etc/nginx/snippets/dreamstudio-video-privacy.conf;
```

配置默认连接 `127.0.0.1:3000`。如果 Nginx 和 New API 使用容器网络，按实际部署把 `proxy_pass` 换成 Nginx 可访问的 New API 地址。上传大小默认 `128m`，读取及发送等待时间为 300 秒，可按实例配置调整。保留现有 TLS 和其他路由。若有覆盖这些路径的 `location =`、`location ^~` 或更靠前的正则规则，需先合并规则，让本配置接管视频和阻断路径。保留默认的 `merge_slashes on`。

让公网流量经过这一层代理。若公网还能直接访问 New API 的端口、另一个代理入口或其他域名，同样的限制也需在那些入口生效。管理后台可以放在独立域名并限制访问。

```bash
sudo nginx -t && sudo nginx -s reload
```

## 用户能看到什么

| 路由 | 公网行为 |
|---|---|
| `/v1/videos` 及其子路径 | 转发给 New API。常规 HTTP 4xx 和 5xx 保留状态码并返回通用 JSON。HTTP 跳转改为 502。 |
| `/v1/video` 及其子路径 | 返回 404。旧版视频创建和兼容查询均不可用。 |
| `/v1/tasks` 及其子路径 | 返回 404。通用任务创建、查询和产物接口均不可用。 |
| `/api/task/self` | 返回 404。普通用户的控制台任务列表不可用。 |
| `/api/pricing` | 返回 404。此域名的模型广场无法显示价格和提供方信息。 |

下载保留 `Content-Type`、`Content-Length` 和区间信息，移除上游文件名、`ETag` 和 `Last-Modified`。客户端仍可请求字节区间，使用原文件验证器的条件请求会变成普通请求。HTTP 200 包含 `status: failed` 时由插件生成失败消息，部署时启用 DreamStudio Video 1.3.4 或以上版本。Nginx 不改写 HTTP 200 的响应正文。公开插件市场及已发布的源码仍可查到插件的默认上游地址。

如果 Nginx 与 New API 之间另有认证代理，其 `WWW-Authenticate` 应只写面向客户端公开的信息。Nginx 拦截 HTTP 401 时仍保留该头。[Nginx 401 处理源码](https://github.com/nginx/nginx/blob/release-1.28.0/src/http/ngx_http_upstream.c#L2737-L2764)

## 验证

用已有的成功任务检查下载。把网址、令牌和任务 ID 替换为实际值。

```bash
export NEW_API_BASE_URL='https://api.example.com'
export NEW_API_TOKEN='替换为 New API 令牌'
export VIDEO_ID='替换为已完成的任务 ID'

curl -sSI -H "Authorization: Bearer $NEW_API_TOKEN" \
  "$NEW_API_BASE_URL/v1/videos/$VIDEO_ID/content"

curl -sS -D - -o /dev/null -H "Authorization: Bearer $NEW_API_TOKEN" \
  -H 'Range: bytes=0-1023' "$NEW_API_BASE_URL/v1/videos/$VIDEO_ID/content"

for path in "/v1/video/generations/$VIDEO_ID" "/v1/tasks/$VIDEO_ID" /api/task/self /api/pricing; do
  curl -sS -o /dev/null -w '%{http_code}\n' "$NEW_API_BASE_URL$path"
done
```

`HEAD` 应返回文件信息。上游支持字节区间时，区间请求应返回 `206` 和 `Content-Range`。循环中的四个请求都应返回 `404`。另外可用无效令牌调用 `/v1/videos`，检查响应保留拒绝状态码且只返回通用错误。

[Nginx 代理模块文档](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) · [Nginx `error_page` 文档](https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page)

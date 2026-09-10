---
title: MCP 开发与 OAuth 授权踩坑记录
date: 2026-09-10 21:30:00
tags:
  - MCP
  - OAuth
  - ChatGPT
  - Node.js
  - Docker
categories: 技术教程
description: 整理 MCP 服务接入 AI 客户端时的通用排查思路，涵盖 OAuth discovery、PKCE、redirect_uri、网关路由和 MCP Apps UI，使用虚构示例说明协议边界。
---

## 前言

给 MCP 服务接入 OAuth 时，目标通常是让 ChatGPT 这类 AI 客户端在用户授权后调用业务工具。

一开始以为这只是“把后端接口包成 MCP 工具”的工作，实际做下来发现坑主要不在工具本身，而在 **OAuth 发现、授权回调、网关路由、Token 交换、部署环境** 这些边界上。

这篇文章整理通用协议知识与排查思路。除协议标准路径外，文中的业务域名、路径、配置名和资源标识均为虚构示例，不对应任何实际项目的架构、接口或部署配置。

## 协议角色

先区分几个协议角色。它们可以由不同组件承担，下面的示意不代表实际部署拓扑：

```text
AI 客户端
  │
  │ 发现受保护资源及其授权服务器
  ▼
MCP 资源服务器
https://mcp.example.com/mcp
  │
  │ 根据元数据进入授权流程
  ▼
授权服务器 / 用户授权页面
  │
  │ 用户授权后，经浏览器回到客户端
  ▼
AI 客户端
  │
  │ 使用授权码和 PKCE verifier 换取 token
  ▼
授权服务器的 token endpoint
  │
  │ 客户端携带面向 MCP 资源的 token 发起请求
  ▼
MCP 资源服务器
```

排查时常见的入口包括：

- `POST /mcp`：MCP Streamable HTTP 主入口
- `/.well-known/oauth-protected-resource/mcp`：资源服务器发现
- `/.well-known/oauth-authorization-server`：授权服务器元数据，位于对应 issuer 下
- token endpoint：以授权服务器元数据为准
- registration endpoint：仅在支持动态客户端注册时提供

用户授权页面、Token 交换与业务接口的具体路径由服务自行定义，不应从 MCP 入口路径推断。

## 坑 1：不能只代理 `/mcp`

最开始很容易以为 ChatGPT 只需要访问 MCP 入口：

```text
https://mcp-dev.example.com/mcp
```

但如果启用 OAuth，客户端还需要访问发现地址和元数据指定的 Token endpoint；支持动态注册时还可能访问 registration endpoint。

所以网关需要覆盖实际承载的协议入口。对于专门承载这些入口的示例域名，可以采用统一转发：

```text
https://mcp-dev.example.com/*
  -> http://mcp-service:3000/*
```

如果只配 `/mcp`，ChatGPT 可能直接报：

```text
MCP server does not implement OAuth
```

或者：

```text
获取 OAuth 配置时出错
Request timeout
```

这个时候不要只盯业务工具。先 curl 发现地址：

```bash
curl -i https://mcp-dev.example.com/.well-known/oauth-authorization-server
curl -i https://mcp-dev.example.com/.well-known/oauth-protected-resource/mcp
```

在两类元数据都由这个域名承载的部署中，这两个地址应该返回 200 和 JSON。若资源元数据的 `authorization_servers` 指向其他 issuer，则应去对应位置检查授权服务器元数据，不能要求 MCP 域名一定同时提供两者。

## 坑 2：`.well-known` 404 要看是谁返回的

业务 API 的 `.well-known` 返回 404，不一定是问题。资源元数据和授权服务器元数据可能位于不同域名，应根据发现流程确定请求地址。

如果示例中两类元数据恰好位于同一域名，需要检查：

```text
https://mcp-dev.example.com/.well-known/oauth-authorization-server
https://mcp-dev.example.com/.well-known/oauth-protected-resource/mcp
```

如果授权服务器位于独立域名，则应检查对应 issuer 的元数据地址。

## 坑 3：`GET /oauth/token` 返回 404 不代表 Token 接口坏了

浏览器里直接打开：

```text
https://mcp-dev.example.com/oauth/token
```

看到 404 很容易误判。

但 OAuth Token endpoint 本来就是给客户端 POST 的，不是给浏览器 GET 打开的。应该测试 POST 请求，或者看 ChatGPT 实际换 Token 时的请求日志。

所以判断 `/oauth/token` 是否正常，重点看：

- ChatGPT 是否发了 `POST /oauth/token`
- Content-Type 是否是 `application/x-www-form-urlencoded`
- 请求里是否有 `grant_type`
- 授权码交换是否带了 `code_verifier`（刷新请求不使用它）
- 后端返回的是标准 OAuth token body 还是业务 envelope

## 坑 4：区分公网 TLS 和内部链路加密

公网 MCP URL 必须是 HTTPS，例如：

```text
https://mcp-dev.example.com/mcp
```

Kubernetes Ingress 或 nginx 做 TLS 终止后，如果内部信任边界和安全要求允许，内部服务可以走 HTTP，例如：

```text
Ingress HTTPS
  -> http://example-mcp:3000
```

一开始如果把“公网必须 HTTPS”理解成“容器也必须 HTTPS”，部署会复杂很多，还容易引入 `X-Forwarded-Proto`、源 IP 白名单之类的问题。

部署时需要区分：

- 公网对 ChatGPT：HTTPS
- 网关到内部服务：是否使用 HTTP，取决于信任边界与安全要求
- 跨越不可信网络的链路：仍需要加密保护

## 坑 5：Host 白名单不是源 IP 白名单

中间遇到过：

```json
{ "error": "Request host is not allowed." }
```

这不是网关源 IP 不固定的问题，而是 MCP 收到的 `Host` 不在白名单里。

例如公网域名是：

```text
mcp-dev.example.com
```

那 MCP 配置里应该允许：

```dotenv
EXAMPLE_MCP_ALLOWED_HOSTS=mcp-dev.example.com
```

网关要保留原始 Host：

```nginx
proxy_set_header Host $http_host;
```

Kubernetes 里网关源 IP 经常变，这不应该参与 Host 校验。Host 校验的是请求域名，不是来源地址。

## 坑 6：基础 URL 和接口路径的拼接要有明确约定

接入上游 API 时，基础 URL 可能包含路径前缀。例如以下虚构配置：

```dotenv
EXAMPLE_API_BASE_URL=https://api.example.com/api/
```

使用 URL API 时，相对路径 `items` 会保留 `/api/` 前缀，而 `/items` 会从域名根路径开始。基础 URL 是否以 `/` 结尾也会影响解析结果。

建议明确这些约定：

- 基础 URL 是纯 origin，还是包含路径前缀
- 接口路径是相对路径，还是从根开始的绝对路径
- 不同上游是否需要分别配置基础 URL

至少检查一次预期路径和一次带前导斜杠的路径，避免请求落到错误入口。

## 坑 7：`redirect_uri` 应该是客户端登记的回调地址

ChatGPT 发起授权时，会带一个这样的参数：

```text
redirect_uri=https://chatgpt.com/connector/oauth/...
```

这个是正确的。

OAuth 的实际流程是：

1. 用户在授权页面确认连接
2. 授权服务器验证客户端、回调地址和授权请求
3. 授权服务器签发 authorization code
4. 浏览器携带 `code` 和原样返回的 `state` 跳转到客户端回调地址
5. ChatGPT 再拿 code 调 `/oauth/token` 换 token

这里不要求后端服务器主动访问 ChatGPT。即使后端所在网络访问不了 ChatGPT，也不影响“返回一个回调 URL 给浏览器”这件事。

在这个由 ChatGPT 直接作为 OAuth 客户端的流程里，不能把 `redirect_uri` 随意改成前端首页或 MCP 地址。其他客户端或采用 OAuth 代理的架构可能有不同回调地址，应以实际客户端登记信息为准。

## 坑 8：`redirect_uri` 必须校验，PKCE 不能替代它

`client_id` 是公开信息，不能当秘密用。如果后端允许任意 `redirect_uri`，攻击者可以构造授权链接，把 code 发到自己的站点。

所以后端应该校验：

- `client_id` 是否存在且启用
- `redirect_uri` 是否属于该客户端允许的回调地址
- Token 交换时的 `redirect_uri` 是否和签发 code 时一致
- `code_verifier` 是否能匹配授权时的 `code_challenge`

PKCE 很重要，但它不是 `redirect_uri` 校验的替代品。

S256 的过程是：客户端生成随机的 `code_verifier`，授权时只发送它的 SHA-256 摘要经 Base64URL 编码后的 `code_challenge`，换 token 时再提交原始 verifier。授权服务器必须把 challenge 与授权码绑定并验证；仅在前端生成这两个字段，并不代表 PKCE 已经生效。授权码还应短期有效且只能使用一次。

回调地址通常应与登记值精确匹配，不能只判断字符串包含某个域名。请求里的 `state` 则由客户端生成并在回调时验证，用来关联本次授权、防止请求被替换；授权页面应原样传递它。若授权请求本身无效，尤其是回调地址未通过校验，不应向该地址重定向。

## 坑 9：固定 client_id 和 DCR 的取舍

ChatGPT 这类客户端可能会尝试 Dynamic Client Registration，也就是访问：

```text
POST /oauth/register
```

动态客户端注册与预注册客户端是不同的接入方式，应根据客户端能力和授权服务器支持情况选择。

使用预注册的 public client 时，需要确认：

- 授权服务器已登记该客户端
- 该 client 支持 public client
- `token_endpoint_auth_method` 是 `none`
- 使用 PKCE S256
- redirect URI 仍由后端按规则校验

支持 DCR 时，注册响应需要符合协议，并与回调地址等注册信息保持一致。

还要区分“固定 ID 的兼容入口”和标准 DCR：给所有注册请求返回同一个预注册 `client_id`，不等于完成了动态注册。不同客户端提交的回调地址、权限和认证方式可能不同，不能只回一个 ID 就假装这些信息已登记。固定 ID 可以用于明确限定的预注册集成，但不能据此宣称支持任意客户端的 DCR，也不能为了兼容而放开任意回调地址。

## 坑 10：MCP 的 OAuth 接入还包含发现协议

在 MCP 的授权接入中，除了授权与 Token 交换，客户端还需要发现授权服务器和受保护资源的元数据。这些要求来自 MCP 授权规范及相关 OAuth 扩展，不能笼统说成所有 OAuth 2.0 系统都必须提供这些发现接口。PKCE 也是独立扩展；接口名称里写着 v1 或 v2，并不能说明是否实现了它。

也就是说：

授权服务器负责：

```text
授权入口
Token endpoint
授权服务器元数据
```

资源服务器负责：

```text
/.well-known/oauth-protected-resource/mcp
/mcp
```

把这两层混在一起排查，会浪费很多时间。

## 坑 11：前端不能把所有 401 都叫“登录失效”

例如，授权页可能提示：

```text
登录已失效，请重新登录后确认连接。
```

但响应表达的实际含义是客户端校验失败。以下仅为标准 OAuth 错误示例：

```json
{ "error": "invalid_client" }
```

这不是用户登录过期，而是 OAuth client 没通过后端校验。

前端应该先识别业务错误码：

- `invalid_client`：提示服务端客户端配置问题
- 真正的 401 登录过期：再提示重新登录

否则用户会反复重登，但问题永远不会解决。

## 坑 12：MCP Apps UI 只是资源，不是新的公网页面

工具结果可以关联一个 MCP Apps UI，例如用简洁的界面展示任务状态。

在这种实现中，UI 通过 MCP resource 提供，无需另开一个公网 `/ui` 路由：

```text
ui://example/task-status-v1.html
```

工具通过 `_meta.ui.resourceUri` 关联这个资源。支持 MCP Apps 的客户端会展示卡片，不支持的客户端继续看文本和 `structuredContent`。

这里也有几个细节：

- HTML、CSS、JS、SVG logo 全部内联，避免额外资源请求
- 不把 token、原始用户数据或个人联系方式传给 UI
- 只显示完成任务所需的信息
- 更新资源时设计版本与缓存策略，避免客户端展示旧内容

资源还需要声明客户端支持的 HTML MIME 类型（MCP Apps 使用 `text/html;profile=mcp-app`），并通过宿主提供的桥接机制接收工具结果。若引用外部资源，应按客户端要求声明 CSP；内联所有资源只是简化部署的选择。工具返回成功也不代表卡片已经正确渲染，仍要在目标客户端确认展示与失败状态。

## 坑 13：自动刷新由客户端发起，不是 MCP 主动推送

拿到 access token 不代表刷新链路已经打通。只有授权服务器签发了 refresh token、支持对应 grant，且客户端实现了刷新，才可能在 access token 过期后继续使用。

典型流程是客户端向 Token endpoint 发送 `grant_type=refresh_token` 和 refresh token，服务器返回新的 access token。若同时轮换 refresh token，客户端必须保存新值；刷新被撤销或返回 `invalid_grant` 时，应重新授权。MCP 不会凭空生成后端不支持的刷新能力，也不是后台定时把新 token 推给 Agent。

所以“授权码换 token 成功”和“refresh 成功”必须分开确认。只有实际完成刷新并用新 token 调用受保护工具，才能说这条链路通过了。

## 坑 14：协议适配不等于可以任意透传 Token

Token endpoint 可以把标准表单请求转换为上游接口需要的格式，再把业务响应转换为标准 OAuth JSON，例如 `access_token`、`token_type`、`expires_in`，以及可选的 `refresh_token` 和 `scope`。错误也应转换为 OAuth 错误语义，不能把失败 envelope 当作成功响应。

这不一定需要重新加密封装一个 token。但能否复用上游 token，取决于它是否明确签发给当前 MCP 资源、是否有合适的权限与校验机制。不能把原本签发给另一个 API 的 token 无条件收进来再转发；这种 token passthrough 不符合 MCP 的授权安全要求。“后端会对伪造 token 返回 401”也不足以证明受众和权限隔离正确。

如果 MCP 与上游属于同一受保护资源体系，也要明确由谁执行有效性、受众和 scope 校验；如果是不同资源，应采用适合该架构的独立授权或 token exchange。加密包一层本身不能解决这些边界问题。

## 我最后留下的部署 checklist

MCP 服务上线前，我会按下面顺序查：

```bash
curl -i https://mcp-dev.example.com/.well-known/oauth-authorization-server
curl -i https://mcp-dev.example.com/.well-known/oauth-protected-resource/mcp
curl -i -X POST https://mcp-dev.example.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"example-check","version":"1.0.0"}}}'
```

期望结果：

- authorization server metadata：200
- protected resource metadata：200
- 未带 token 的 `/mcp`：401，并带 `WWW-Authenticate`

这里假设所有工具都需要认证，且两类元数据由同一域名承载。`WWW-Authenticate` 应提供正确的 `resource_metadata` 地址；JSON-RPC 示例中的协议版本应换成服务实际支持的版本。只做这几步能证明发现与鉴权入口可达，不能证明完整 OAuth 和工具调用已经成功。

然后看网关配置：

- 路由覆盖资源元数据及该服务实际承载的 OAuth 入口
- 保留原始 Host
- 保留 Authorization
- 公网 443 正常
- 服务监听端口与网关目标端口一致

再看 OAuth：

- `authorization_endpoint` 指向可访问的授权入口
- `token_endpoint` 与授权服务器元数据一致
- `resource` 是完整 MCP URL，例如 `https://mcp-dev.example.com/mcp`
- `client_id` 与后端配置一致
- `redirect_uri` 是 ChatGPT 给的回调地址
- PKCE 是 S256
- Token 交换返回标准 OAuth token body

最后再测业务工具：

- 有效且面向该资源的 token 能通过校验
- 过期、无效或受众不匹配的 token 会被拒绝
- 已授权工具能返回预期结果
- 未授权的调用被正确拒绝
- 若支持 refresh，刷新后使用新 token 调用成功，失效 refresh token 能正确触发重新授权
- 错误返回不要泄露 token、code、手机号等敏感信息

## 总结

MCP 工具本身并不难，真正容易出错的是“谁负责哪一层协议”。

我的经验是：

- 客户端通过资源元数据定位授权服务器，再获取对应元数据
- Token endpoint 的行为需要符合 OAuth 协议
- `redirect_uri` 是浏览器回跳地址，不是后端主动回调地址
- 网关路由要覆盖服务实际承载的协议入口
- 公网 resource URL 使用 HTTPS，内部链路按信任边界决定加密要求
- 401 要看业务错误码，不要一律当登录失效

把这些边界拆清楚后，排查会快很多。

## 参考规范

- [MCP Authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization)
- [MCP 安全最佳实践：Token passthrough](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- [OAuth 2.0（RFC 6749）](https://www.rfc-editor.org/rfc/rfc6749)
- [PKCE（RFC 7636）](https://www.rfc-editor.org/rfc/rfc7636)
- [动态客户端注册（RFC 7591）](https://www.rfc-editor.org/rfc/rfc7591)
- [授权服务器元数据（RFC 8414）](https://www.rfc-editor.org/rfc/rfc8414)
- [受保护资源元数据（RFC 9728）](https://www.rfc-editor.org/rfc/rfc9728)
- [OAuth 2.0 安全最佳实践（RFC 9700）](https://www.rfc-editor.org/rfc/rfc9700)

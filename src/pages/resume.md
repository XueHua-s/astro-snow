---
layout: ../layouts/ResumeLayout.astro
title: 'snow Resume'
description: 'snow 的公开简历：React / TypeScript 前端、全栈开发、文档渲染与跨端工程实践。'
---

# snow

**前端 / 全栈工程师 · React / TypeScript**

工作经验：4 年以上（2022.03 起）  
意向城市：苏州 / 上海 / 武汉  
求职方向：React Web 前端 / 全栈开发 / Electron 桌面端开发  
邮箱：[xuehualjx@gmail.com](mailto:xuehualjx@gmail.com)  
GitHub：[XueHua-s](https://github.com/XueHua-s)

## 职业概述 / Professional Summary

4 年以上开发经验，以 React / TypeScript 为主栈，参与 Doc2X 文档解析、AI 翻译、国际站与 Electron 桌面端研发。关注复杂文档渲染、异步任务状态一致性和跨端资源管理，具备服务端、数据库、权限控制与部署实践。向 office-open-xml-viewer、Naive UI 等开源项目贡献已合并代码，并持续建设 CLI、MCP 与 Agent Skills 工具链。

## 核心技能 / Skills

- **前端与交互**：React、TypeScript、JavaScript、Vue、Zustand、Pinia、Canvas、IndexedDB、i18next、ECharts、Cesium；具备文档预览、图层编辑、多语言与复杂业务系统开发经验。
- **桌面与文档处理**：Electron、Rust、WASM、NAPI-RS、Web Worker / Worker Pool、OOXML、PDFium；涉及 Markdown / 公式渲染、Office 预览与 PDF / PPTX 导出。
- **服务端与数据**：Node.js / Bun、Hono、NestJS、Elysia、Actix-Web、PostgreSQL / MySQL、Drizzle / SQLx、Redis / BullMQ、pgvector；具备数据建模、权限设计、任务队列与向量检索实践。
- **工程化与交付**：Vite、Tsup、pnpm、Nx、Turbo、Changesets、monorepo、Vitest、Playwright、CI/CD、Docker、Nginx、Linux；维护共享 SDK、npm 包与跨端构建发布流程。
- **AI 工具与编排**：MCP、OAuth / PKCE、Agent Skills；使用 Superset、Codex、ChatGPT、Claude / Claude Code 辅助开发，具备 Agent Harness 外围设计、上下文管理与 n8n 工作流设计经验。

## 工作经历 / Work Experience

### 武汉市智识无根科技有限公司（Doc2X / NoEdgeAI） | 前端开发工程师

2024.04 - 2026.10

- 负责 Doc2X / DocCopilot 的文档解析、AI 翻译、对话、画板与导出模块，参与国际站、Electron 桌面端、SDK 及共享库建设。
- 维护异步任务、跨端通信、构建发布与回归测试，处理任务取消、历史恢复、账户隔离和导出状态等问题。
- 参与文档渲染与 Rust 跨端处理能力建设，维护 MCP、CLI、Agent Skills 与 Zotero 插件等工具生态。
- 与产品、后端及算法团队协作，完成需求拆解、接口联调与持续交付。

### 苏州奔雷云信息科技有限公司（外包派遣公司） | 前端开发工程师

2022.03 - 2024.03

- 参与车联网 Portal、PMIS、IOT 设备监控与智慧牧场等 B 端项目，负责前端核心模块、需求评审、接口联调与交付。
- 在智慧牧场项目中参与 NestJS 中间层开发，对接 Java SSO，通过 TCP 处理坐标与三维路径数据，支撑 GIS / Cesium 展示。
- 与客户产品、后端团队协作，推进多阶段交付并同步进度与风险。

## 精选项目 / Selected Projects

### Doc2X / DocCopilot | 文档解析、AI 翻译与国际站

项目类型：商业项目 · 前端 / Electron 开发  
线上地址：[国内站](https://doc2x.noedgeai.com) · [国际站](https://doc2x.com)  
技术栈：React、TypeScript、Zustand、Electron、Web Worker、IndexedDB、i18next、Doc2X SDK

- **业务闭环**：串联文档上传、解析 / 翻译、结果预览与多格式导出，维护上传队列、任务轮询、历史恢复及国际站多语言体验。
- **PDF 导出优化**：修复双栏 PDF 合并时共享资源重复复制的问题，在 216 页真实样本中，导出文件由约 1.78 GB 降至 108 MB，同时保持版式、左右顺序与书签。
- **状态一致性**：隔离双文档滚动协调器，合并更新并抑制回环；完善任务取消、账户隔离、轮询清理与导出状态恢复。
- **画板编辑**：支持图层 / 公式编辑、撤销重做与历史恢复，结合 IndexedDB 缓存和云端回退处理记录失效、资源缺失等情况；通过状态机与防抖调度管理“魔法消除”异步任务。
- **PPT 工作流**：参与主题 / 大纲生成、图片生成、人工修订、画板精修与可编辑 PPTX 导出，处理批量任务并发、失败重试、取消与重复解析防护。

### RaidenShinBoot | AI 助手与运营管理平台

项目类型：个人全栈项目  
项目源码：[XueHua-s/RaidenShinBoot](https://github.com/XueHua-s/RaidenShinBoot)  
技术栈：React、Refine、Hono、PostgreSQL、Drizzle、pgvector、Redis、BullMQ、Docker

- **前后端一体化**：使用 React / Refine 与 Hono 实现管理后台、类型化 API 和机器人服务，设计管理员、会话、消息与记忆数据模型，以 Drizzle 管理数据关系及迁移。
- **权限与会话安全**：实现角色权限、scrypt 密码哈希、HttpOnly 会话 Cookie、CSRF 校验、会话撤销与审计。
- **AI 与异步任务**：基于 pgvector 检索长期记忆，通过 Redis / BullMQ 处理图片、提醒与记忆任务；按用户隔离缓存，以稳定任务标识去重，避免消息重投导致重复创建。
- **部署与验证**：配置 Docker Compose、数据库迁移与管理员初始化，维护 API 和机器人核心业务路径测试。

### Doc2X | 文档渲染与跨端处理专项

项目类型：商业项目 · 文档处理与共享能力建设  
技术栈：React、TypeScript、OOXML、Rust、WASM / NAPI-RS、PDFium、Web Worker、Electron

- **Office 本地预览**：封装 DOCX / PPTX 预览，支持虚拟化页面、渐进式分页与双文档语义同步；为旧版 DOC / PPT 提供文本 / HTML 提取式预览。
- **Rust 处理引擎**：以同一核心适配浏览器 WASM 与 Node.js / Electron N-API，完成原始图像提取、区域回退渲染和导出资源替换。
- **资源治理**：将计算密集任务移出主线程，对归档、像素与输出设置上限，通过并发互斥和背压限制资源占用，并补充跨端回归测试。
- **Markdown 渲染**：基于 unified 组织解析与 AST 插件，支持 MathJax / Temml 公式渲染，处理表格、特殊字符及 HTML 导出兼容问题，通过 Worker Pool 分担解析与公式计算。
- **桌面与复用**：维护 Electron IPC / 文件系统桥接、批量任务暂停恢复及发布流程，通过共享 SDK 与 monorepo 复用 Web、国际站和桌面端能力。

### Doc2X | MCP 与开发者工具

项目类型：商业项目 · MCP / CLI / Agent Skills  
技术栈：TypeScript、Node.js、MCP、Streamable HTTP、OAuth / PKCE、Doc2X SDK、Vitest、Docker  
进展：远端 MCP / OAuth 接入迭代中

- **MCP 服务**：开发共享业务核心的 stdio / Streamable HTTP 服务，封装文档解析、翻译、任务与导出工具；按 SDK 类型生成工具 schema，通过测试保持参数契约一致。
- **授权与交互**：实现明确同意授权、PKCE / state 校验及会话保护，迭代远端 OAuth 接入、账号额度卡片与文本降级体验。
- **CLI 工具链**：维护 `@noedgeai/doc2x-cli`，支持解析、翻译、批量处理、术语表、JSON 输出与标准退出码；处理 client session 复用、OAuth 登录、串行批处理和失败报告。
- **Agent Skills**：组织命令参考、任务限制、错误处理与安装说明，约束 Agent 的批量执行方式，避免触发服务端并发任务限制；维护插件发布与 Docker 部署文档。

### Agent Harness / n8n | 编排方案设计

项目性质：方案设计与探索

- **Harness 外围设计**：围绕中心 Agent 组织工具、Skills 与子 Agent，设计动态任务拆分与调用、上下文压缩及历史信息检索。
- **n8n 工作流设计**：规划多模型分工与并行 Agent 协作，将 n8n 封装为内部编排层，统一承接用户任务。

### SF 数据分析平台

项目类型：个人全栈项目  
项目源码：[XueHua-s/sfCollectionHistory](https://github.com/XueHua-s/sfCollectionHistory)  
技术栈：Next.js、Rust、Actix-Web、SQLx、MySQL

- 实现数据采集、存储、历史趋势与排行榜查询，串联前端展示、服务端接口和数据库访问。

### Server-Status-Panel | Linux 实时监控

项目类型：个人全栈项目  
项目源码：[XueHua-s/Server-Status-Panel](https://github.com/XueHua-s/Server-Status-Panel)  
技术栈：React、Elysia、Bun、WebSocket、Linux、systemd、Nginx

- 实现 Linux 指标采集、WebSocket 实时推送与断线重连，提供 systemd / Nginx 部署配置。

## 开源贡献与个人作品 / Open Source

### office-open-xml-viewer

已合并 PR：[#1425](https://github.com/yukiyokotani/office-open-xml-viewer/pull/1425) · [#1437](https://github.com/yukiyokotani/office-open-xml-viewer/pull/1437)

- 贡献 TIFF / 大图有界解码，按最终绘制尺寸分配位图，并修复跨格式 Worker 图像交接与释放。

### <img class="resume-title-icon" src="/img/resume/naive-ui.svg" alt="Naive UI icon" width="22" height="22" />Naive UI

已合并 PR：[#5582](https://github.com/tusen-ai/naive-ui/pull/5582) · [#5669](https://github.com/tusen-ai/naive-ui/pull/5669)

- 为 NSplit 增加受控尺寸能力，支持通过 props 控制分割区域大小。
- 为 NFormItem 增加校验反馈位置配置，支持反馈文案的上下位置与水平对齐。

### vue-markdown-next

已合并 PR：[#10](https://github.com/UnboundedWeb/vue-markdown-next/pull/10) · [#12](https://github.com/UnboundedWeb/vue-markdown-next/pull/12)

- 修复 Vite Worker 路径与兼容接口，实现流式 Markdown、不完整内容修复和未变化块复用。

### moe-copy-ai

已合并 PR：[#19](https://github.com/yusixian/moe-copy-ai/pull/19)

- 使用 unified / rehype / remark 重构 HTML → Markdown 转换管线，完善清理、链接与异步处理。

### <img class="resume-title-icon" src="/img/resume/fast-md5-web.jpeg" alt="fast-md5-web icon" width="22" height="22" />fast-md5-web

个人开源项目：[XueHua-s/fast-md5-web](https://github.com/XueHua-s/fast-md5-web)

- 基于 Rust / WASM 与 Web Worker 实现浏览器大文件 MD5 计算和多文件并行处理，避免阻塞主线程。
- 适用于文件版本管理、增量拉取与本地缓存一致性校验等场景。

### node-unzipper

已合并 PR：[#350](https://github.com/ZJONSSON/node-unzipper/pull/350)

- 修正文档示例中解压完成事件的使用。

## 早期项目与生态维护 / Additional Experience

- **上海城建建材 PMIS**：开发审批流、定制甘特图与可视化模块；基于 KeepAlive / Pinia 实现标签页状态缓存，以 Node.js / Vite / SFTP 构建多环境发布流程。
- **上汽集团车联网 / 营销 Portal**：对接统一身份认证与 SSO，以 iframe 方案集成多个业务系统，支持菜单权限、主题定制、工作台布局与多语言。
- **钛锟云 IOT**：使用 WebSocket / MQTT 实现设备与报警状态同步，开发 ECharts 可视化、工单、巡检、保养和 Excel 导出。
- **现代牧业智慧牧场**：负责前端核心模块并参与 NestJS 中间层，对接 Java SSO，通过 TCP 处理坐标与三维路径数据，支撑 GIS / Cesium 可视化。
- **Doc2X Zotero 插件与共享库**：参与 Zotero 7 插件解析 / 导入、连接稳定性和版本发布；维护前端 SDK、Markdown 渲染、PDF Viewer 与 Canvas 共享能力，通过 pnpm / Turbo / Changesets 管理构建和包发布。

## 教育背景 / Education

国家开放大学 | 成人本科在读 | 2025.09 - 2028.01（预计毕业）

襄阳汽车职业技术学院 | 移动通信 | 专科 | 2020.06 - 2022.09

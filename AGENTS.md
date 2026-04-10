# Repository Guidelines — astro-snow

## First Read

- `CLAUDE.md` 是 Claude 的入口文件。
- `.claude/skills.md`（Claude Code）和 `.agents/skills.md`（Codex CLI）提供技能路由。
- 默认入口技能：`skills/doccopilot-project-standards/SKILL.md`。

## Project Overview

astro-snow 是一个基于 Astro 5 + React 19 + TypeScript 的个人博客主题，具有 ACG/动漫风格的粉蓝配色设计系统。

## Project Structure

```
src/
├── components/        # React & Astro 组件
│   ├── category/      # 分类组件
│   ├── comment/       # 评论系统（Giscus）
│   ├── common/        # 通用组件
│   ├── control/       # 控制组件
│   ├── embed/         # 嵌入处理（tweet、link）
│   ├── friends/       # 友链组件
│   ├── home/          # 首页组件
│   ├── layout/        # 布局组件
│   ├── markdown/      # Markdown 增强
│   ├── post/          # 文章展示组件
│   ├── svg/           # SVG 组件
│   ├── theme/         # 主题切换
│   └── ui/            # UI 基础组件
├── assets/            # 静态资源（图片、SVG）
├── cache/             # 构建缓存（lqips、similarities、summaries）
├── config/            # 配置文件（博客、功能、友链等）
├── constants/         # 常量与设计令牌
│   ├── anim/          # 动画配置
│   └── design-tokens/ # 颜色、阴影、圆角令牌
├── content/           # 内容集合配置
├── hooks/             # React 自定义 hooks
├── layouts/           # Astro 布局（BaseLayout、Layout、AboutLayout）
├── lib/               # 工具库
│   ├── content/       # 内容工具
│   ├── code-block-enhancer/   # 代码块 Mac 风格
│   ├── fullscreen/    # 全屏代码预览
│   ├── image-enhancer/# 图片优化
│   ├── markdown/      # remark/rehype 插件
│   ├── mermaid-enhancer/      # Mermaid 图表增强
│   ├── sanitize/      # HTML 清理
│   └── utils.ts       # cn() 等通用工具
├── pages/             # Astro 页面路由
├── store/             # 状态管理（nanostores + zustand）
├── styles/            # 全局 CSS 与主题样式
├── types/             # TypeScript 类型定义
└── scripts/           # 辅助脚本
```

其他关键目录：

```
skills/                # Claude Code / Codex 技能
tests/                 # 单元测试（Vitest）
tests/e2e/             # E2E 测试（Playwright）
scripts/               # 构建脚本（LQIP、相似度、摘要生成）
source/posts/          # 博客文章源文件（Markdown）
public/                # 静态资源（字体、图片）
```

## Skill Routing

| 技能                           | 适用场景                                                    |
| ------------------------------ | ----------------------------------------------------------- |
| `doccopilot-project-standards` | 默认入口：功能开发、依赖复用、cn 工具、健壮性规范、校验命令 |
| `software-design-philosophy`   | 模块设计、复杂度分析、接口收敛、深浅模块判断                |
| `code-review-expert`           | 审查 diff、Bug 排查、安全风险、测试缺口                     |
| `frontend-design`              | 页面与组件设计、交互体验、视觉品质                          |
| `vercel-react-best-practices`  | 性能优化、Bundle 体积、瀑布流、重渲染、数据获取             |

## Working Rules

### Environment

- Node >= 22，仅使用 pnpm
- 框架：Astro 5（SSG）+ React 19（交互组件）+ TypeScript 5（严格模式）
- 样式：Tailwind CSS 3 + PostCSS（nesting）

### Dependencies First

- 编码前先读 `package.json`，优先复用已有依赖。
- 引入新依赖前必须说明：预期收益、现有依赖为何不能覆盖、迁移成本。

### Key Conventions

- 使用 `cn` from `@/lib/utils` 组合 className（clsx + tailwind-merge）
- 优先复用 `react-use` hooks（debounce、throttle、storage、media、event）
- 状态管理：React 内用 `zustand`，跨框架用 `nanostores`（@nanostores/react）
- 日期：`dayjs`；浮层：`@floating-ui/react`；UI 原语：`@radix-ui/react-*`
- 工具函数：`es-toolkit`
- 标记关键代码：添加 `FIXED:` 注释

### Astro / React Boundaries

- **Astro**：页面结构、静态内容、组合与分发、路由
- **React**：状态、交互、副作用、动态行为
- 避免在 Astro 页面文件中放置复杂交互逻辑

### Testing

- 单元测试放在 `tests/`（Vitest）
- E2E 测试放在 `tests/e2e/`（Playwright）
- 改动至少覆盖主路径 + 1 个失败路径

## Build And Verification

```bash
# 安装
pnpm install

# 开发
pnpm dev

# 构建
pnpm build:ci

# 校验（代码变更后至少执行以下命令）
pnpm check          # Astro 类型检查
pnpm run lint       # ESLint
pnpm run typecheck  # TypeScript 类型检查
pnpm test           # 单元测试

# 涉及交互链路变更时
pnpm run test:e2e   # Playwright E2E 测试

# 代码格式化
pnpm run format     # Prettier
pnpm run format:check

# 内容生成
pnpm run generate:lqips          # 低质量图片占位
pnpm run generate:similarities   # 文章相似度
pnpm run generate:summaries      # AI 摘要
```

## Git And Scope

- 基础分支：`main`
- 提交规范：Conventional Commits（由 commitlint + husky 强制执行）
- 预提交：lint-staged 自动执行 lint

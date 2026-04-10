# Codex Skills Guide — astro-snow

不要一次加载整个 skills/ 目录。
先找最小匹配技能集，按需读取 references。

## How To Use

- 技能入口：`skills/*/SKILL.md`
- 默认从 `doccopilot-project-standards/SKILL.md` 开始，除非任务明确匹配其他技能。
- 先读 `SKILL.md`，再按需加载 `references/*`。

## Skill Routing

| 关键词 / 场景                                                              | 技能                           |
| -------------------------------------------------------------------------- | ------------------------------ |
| 功能开发、依赖选择、cn 工具、react-use hooks、健壮性、边界处理、校验命令   | `doccopilot-project-standards` |
| 模块分解、接口设计、复杂度、信息隐藏、深浅模块                             | `software-design-philosophy`   |
| 代码审查、diff 检查、Bug 排查、安全风险、测试覆盖                          | `code-review-expert`           |
| 页面设计、组件视觉、交互体验、美学方向                                     | `frontend-design`              |
| 性能优化、Bundle 体积、瀑布流消除、重渲染、数据获取（69 条规则，8 个类别） | `vercel-react-best-practices`  |

## Local Conventions To Reuse

- `cn` from `src/lib/utils.ts` — className 组合（clsx + tailwind-merge）
- `react-use` — debounce、throttle、storage、media query、事件绑定等优先复用
- `zustand` / `nanostores` — 状态管理（React 用 zustand，跨框架用 nanostores）
- `dayjs` — 日期处理
- `@floating-ui/react` — 浮层与 tooltip 定位
- `@radix-ui/react-*` — 无障碍 UI 原语
- `es-toolkit` — 通用工具函数
- 测试放在 `tests/`（单元）和 `tests/e2e/`（E2E）

## Guardrails

- 不要在查阅相关技能之前引入新库或新模式。
- 不要批量加载 references/ 文件。
- 优先信任当前代码结构，最小化改动。

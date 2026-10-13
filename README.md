

# snow-koharu

“snow” 风格的 Astro 博客主题。

没什么太大的含义, snow就是我的称呼。我的博客主题代码自然是我的名字，也没什么问题吧？

灵感没有，直接照搬，做了一些优化。
[astro-koharu](https://github.com/cosZone/astro-koharu)

## 功能优化

在基于 [astro-koharu](https://github.com/cosZone/astro-koharu) 的基础做了以下修整。

删除了一些可能大多数人都不太想要的一些功能, 和增加 / 更改了一些东西

- 增加了引导页
- 增加了github-action构建配置自动部署GitHubPage, AI摘要Action配置.
- 提取了一些配置到 src/config 中，方便快速修改站点。
- 增加了 @ 路径修饰符。
- 删除RSS-XML抓取生成页功能
- 删除了大多数人用不到的 Mermaid 优化脚本
- 移除了svg图标使用 @fortawesome/fontawesome-fre 字体图标库
- 删除了周刊功能
- 调整了部分项目架构布局。ai摘要数据位置从 src/assets/summaries.json 改为 src/cache/summaries.json
- 增加了随机背景图生成方法, `source/img/backgrounds` 放置二次元图床(仅支持webp格式)
- 调整md文章为自动生成，根据文章的 `date` 字段排序生成目标文章html页路径。如`https://host/post/number`
- 移除了二级分类 & 精选分类
- 精选分类位置 更换为生成。修改为构建时根据`source/posts/**.md`的 `categories` 字段进行分类
- 优化部分代码, 拆分为ReactHook, 使用react-use简化监听操作。
- 评论插件更换为github 应用, giscus. 使用更加简单。
- 一些比较重逻辑的astro组件删除，重写为react组件。
- 尽量保持 astro 提供layout. 和内容生成.
- 优化了header的背景动画

## 风格描述

- 基于 **Astro**，静态输出，加载轻快
- 萌系 / 二次元 / 粉蓝配色，适合 ACG、前端、手账向个人站
- 支持多分类、多标签，但不会强迫你用复杂信息架构
- 尽可能的减少首屏JS性能开销
- 使用 pagefind 实现无后端的全站搜索
- LQIP（低质量图片占位符），图片加载前显示渐变色占位

### 本地开发

1. 克隆项目到本地

```bash
git clone https://github.com/XueHua-s/astro-snow
```

2. 进入项目目录并安装依赖

```bash
pnpm i
```

3. 启动项目

```bash
pnpm dev
```

## 功能特性

- 提交自动部署GithubPage
- 构建时自动ai摘要
- 基于 Astro 5.x，静态站点生成，性能优异
- 优雅的深色/浅色主题切换
- 基于 Pagefind 的无后端全站搜索
- 完整的 Markdown 增强功能（GFM、代码高亮、自动目录、Mermaid 图表）
- 灵活的多级分类与标签系统
- 响应式设计
- 阅读进度条与阅读时间估算
- 智能目录导航，支持 CSS 计数器自动编号（可按文章关闭）
- 移动端文章阅读头部（显示当前章节标题、圆形阅读进度、可展开目录）
- 友链系统与归档页面
- [可开关] 基于语义相似度的智能文章推荐系统，使用 [transformers.js](https://huggingface.co/docs/transformers.js) 在本地生成文章嵌入向量，计算文章间的语义相似度

## 🙏 鸣谢

使用字体[寒蝉全圆体](https://chinese-font.netlify.app/zh-cn/fonts/hcqyt/ChillRoundFRegular)

感谢cosine姐的开源
[astro-koharu](https://github.com/cosZone/astro-koharu)
[cosine](https://github.com/yusixian)
...

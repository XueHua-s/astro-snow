import { describe, expect, it } from 'vitest';
import {
  buildFallbackSummary,
  isSummaryAcceptable,
  normalizeSummaryText,
} from '../scripts/lib/summaries/quality';

describe('summary quality guards', () => {
  it('accepts Chinese-first technical summaries', () => {
    const summary =
      '文章讨论 Electron 在大厂场景下受欢迎的原因，核心在于 Chromium 环境可控、UI 表现稳定且能复用 Web 技术栈。作者也指出原生能力应交给 Rust 等方案处理，技术选型本质上是在稳定性与成本之间做取舍。';

    expect(isSummaryAcceptable(summary)).toBe(true);
  });

  it('accepts technical summaries that contain generic type syntax', () => {
    const summary =
      '深入理解 Rust 中 trait 实现的灵活性：为什么可以为 Vec<String> 这样的泛型类型具体实例实现 trait？探讨 Rust 类型系统中的类型特化（Type Specialization）、trait 实现的作用范围，以及如何利用这一特性编写更灵活的代码。';

    expect(isSummaryAcceptable(summary)).toBe(true);
  });

  it('rejects English-heavy or malformed summaries', () => {
    const summary =
      '$Voiceless velar approximant$ 技术选型没有银弹，只有trade-off。';

    expect(isSummaryAcceptable(summary)).toBe(false);
  });

  it('rejects placeholder and tagged summaries', () => {
    expect(isSummaryAcceptable('[END]。')).toBe(false);
    expect(
      isSummaryAcceptable(
        '<answer>React中useEffect依赖管理的核心原则是依赖必须与代码匹配。</answer>。',
      ),
    ).toBe(false);
    expect(
      isSummaryAcceptable(
        '喵呜...主人给的文章是"emj"喵，这个没办法总结呢喵！可能是复制的时候出了点问题？重新发一下喵，猫猫在这里等着喵～✨。',
      ),
    ).toBe(false);
    expect(
      isSummaryAcceptable(
        '喵～铲屎官，偶好像没看到文章内容呢，空空如也呀～可以把文章贴上来吗？偶就能帮你变成可爱的摘要啦～。',
      ),
    ).toBe(false);
    expect(
      isSummaryAcceptable(
        '喵～没有原文的话我也编不出魔法呀！(>ω<) 请提供需要总结的文章内容，我就能帮你变出可爱的博客摘要喵~ ✨。',
      ),
    ).toBe(false);
    expect(
      isSummaryAcceptable(
        '喵～你没有粘贴文章内容呀！请把文章贴上来，喵娘我就能帮你总结核心要点啦～。',
      ),
    ).toBe(false);
  });

  it('normalizes whitespace and trailing punctuation', () => {
    const summary =
      '  文章解释 Electron 的优势在于环境可控和跨端复用，适合大厂桌面端工程化落地。   第二句补充原生能力应交给 Rust 处理 ';

    expect(normalizeSummaryText(summary)).toBe(
      '文章解释 Electron 的优势在于环境可控和跨端复用，适合大厂桌面端工程化落地。 第二句补充原生能力应交给 Rust 处理。',
    );
  });

  it('builds a readable fallback summary from article text', () => {
    const text =
      'Electron 在大厂桌面端常被选中，核心原因是 Chromium 环境可控、UI 稳定且能复用 Web 技术栈。文章同时指出，涉及高性能和原生能力时应配合 Rust 等原生模块。最后总结技术选型没有银弹，本质是权衡稳定性、体积和开发成本。';

    expect(buildFallbackSummary(text)).toBe(
      'Electron 在大厂桌面端常被选中，核心原因是 Chromium 环境可控、UI 稳定且能复用 Web 技术栈。文章同时指出，涉及高性能和原生能力时应配合 Rust 等原生模块。',
    );
  });

  it('builds an acceptable fallback for short diary-like content', () => {
    const text =
      '哭哭，不知道咋了。自从来了武汉，经常发烧头疼。呕吐。今天又发烧了37.5度。早上起床吃了布洛芬，一觉睡到了晚上。';

    const summary = buildFallbackSummary(text, '发烧了呜呜呜');

    expect(summary).toContain('发烧');
    expect(summary).toContain('武汉');
    expect(isSummaryAcceptable(summary)).toBe(true);
  });

  it('builds a Chinese-first fallback for note-style technical text', () => {
    const text =
      'Vue3基础 Volar Vue3版本语法插件 Vite Vue3项目使用Vite进行构建 ESlint 组合式API 增强可维护性可读性 setup内部不能访问组件实例功能 reactive 用来定义响应式对象';

    const summary = buildFallbackSummary(text, 'Vue3学习笔记');

    expect(summary).toContain('可维护性');
    expect(summary).not.toContain('Vite');
    expect(isSummaryAcceptable(summary)).toBe(true);
  });

  it('falls back to a title-based summary for placeholder content', () => {
    const summary = buildFallbackSummary('emj', '不知道怎么过年');

    expect(summary).toContain('不知道怎么过年');
    expect(summary).toContain('记录和想法');
    expect(isSummaryAcceptable(summary)).toBe(true);
  });

  it('falls back to a title-based summary for outline-style posts', () => {
    const text =
      '前端工程化开发 系统环境变量 模块成员导出与导入 包管理器 工程脚手架 自动化构建 按需加载 代码规范 发布部署';

    const summary = buildFallbackSummary(text, '前端工程化开发');

    expect(summary).toContain('前端工程化开发');
    expect(isSummaryAcceptable(summary)).toBe(true);
  });
});

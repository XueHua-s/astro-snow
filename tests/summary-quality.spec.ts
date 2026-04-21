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

    const summary = buildFallbackSummary(text);

    expect(summary).toContain('发烧');
    expect(summary).toContain('武汉');
    expect(isSummaryAcceptable(summary)).toBe(true);
  });

  it('builds a Chinese-first fallback for note-style technical text', () => {
    const text =
      'Vue3基础 Volar Vue3版本语法插件 Vite Vue3项目使用Vite进行构建 ESlint 组合式API 增强可维护性可读性 setup内部不能访问组件实例功能 reactive 用来定义响应式对象';

    const summary = buildFallbackSummary(text);

    expect(summary).toContain('可维护性');
    expect(summary).not.toContain('Vite');
    expect(isSummaryAcceptable(summary)).toBe(true);
  });
});

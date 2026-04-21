import { describe, expect, it } from 'vitest';
import {
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

  it('normalizes whitespace and trailing punctuation', () => {
    const summary =
      '  文章解释 Electron 的优势在于环境可控和跨端复用，适合大厂桌面端工程化落地。   第二句补充原生能力应交给 Rust 处理 ';

    expect(normalizeSummaryText(summary)).toBe(
      '文章解释 Electron 的优势在于环境可控和跨端复用，适合大厂桌面端工程化落地。 第二句补充原生能力应交给 Rust 处理。',
    );
  });
});

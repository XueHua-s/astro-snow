import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
}));

vi.mock('@xsai/generate-text', () => ({
  generateText: generateTextMock,
}));

import { generateSummary } from '../scripts/lib/summaries/api';
import { isSummaryAcceptable } from '../scripts/lib/summaries/quality';

describe('summary api fallback', () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });

  it('falls back to local summary generation when api requests fail', async () => {
    generateTextMock.mockRejectedValue(new Error('provider unavailable'));

    const text =
      'Ajax网络编程与Axios库 Ajax基础 Ajax概述 应用场景 原生Ajax xhr对象 open()方法开启请求 send()方法发送请求 setRequestHeader()方法设置请求头 Axios API 全局配置默认值 axios拦截器';

    const summary = await generateSummary(
      'Ajax网络编程与Axios库',
      text,
      'test-model',
    );

    expect(summary).toContain('Ajax网络编程与Axios库');
    expect(isSummaryAcceptable(summary)).toBe(true);
  });

  it('can reject local fallback when strict AI generation is required', async () => {
    generateTextMock.mockRejectedValue(new Error('provider unavailable'));

    const text =
      'Ajax网络编程与Axios库 Ajax基础 Ajax概述 应用场景 原生Ajax xhr对象 open()方法开启请求 send()方法发送请求 setRequestHeader()方法设置请求头 Axios API 全局配置默认值 axios拦截器';

    await expect(
      generateSummary('Ajax网络编程与Axios库', text, 'test-model', {
        allowLocalFallback: false,
      }),
    ).rejects.toThrow('provider unavailable');
  });

  it('skips api generation for very short placeholder-like content', async () => {
    const summary = await generateSummary('JS对象数组深拷贝', '', 'test-model');

    expect(generateTextMock).not.toHaveBeenCalled();
    expect(summary).toContain('JS对象数组深拷贝');
    expect(isSummaryAcceptable(summary)).toBe(true);
  });
});

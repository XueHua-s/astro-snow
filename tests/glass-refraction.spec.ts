import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const component = readFileSync(
  new URL('../src/components/common/GlassFilterDefs.astro', import.meta.url),
  'utf8',
);
const gate = component.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
if (!gate) throw new Error('Refraction feature gate is missing');

describe('glass refraction progressive enhancement', () => {
  it('opts a supporting Chromium browser into refraction', () => {
    const add = vi.fn();
    runInNewContext(gate, {
      navigator: { userAgent: 'Chrome/130', maxTouchPoints: 0 },
      CSS: { supports: () => true },
      document: { documentElement: { classList: { add } } },
    });
    expect(add).toHaveBeenCalledWith('glass-refract-supported');
  });

  it.each([
    { name: 'false support', ua: 'Chrome/130', css: { supports: () => false } },
    { name: 'missing CSS', ua: 'Chrome/130', css: undefined },
    { name: 'missing supports', ua: 'Chrome/130', css: {} },
    {
      name: 'throwing supports',
      ua: 'Chrome/130',
      css: {
        supports: () => {
          throw new Error('unsupported API');
        },
      },
    },
    { name: 'Firefox', ua: 'Firefox/130', css: { supports: () => true } },
    {
      name: 'iOS Chromium',
      ua: 'iPhone Chrome/130',
      css: { supports: () => true },
    },
  ])('keeps baseline material with $name', ({ ua, css }) => {
    const add = vi.fn();
    expect(() => {
      runInNewContext(gate, {
        navigator: { userAgent: ua, maxTouchPoints: 0 },
        CSS: css,
        document: { documentElement: { classList: { add } } },
      });
    }).not.toThrow();
    expect(add).not.toHaveBeenCalled();
  });
});

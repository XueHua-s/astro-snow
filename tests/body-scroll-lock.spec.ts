import { afterEach, describe, expect, it, vi } from 'vitest';
import { lockBodyScroll } from '../src/lib/body-scroll-lock';

afterEach(() => vi.unstubAllGlobals());

function body(overflow = '') {
  const element = { style: { overflow } };
  vi.stubGlobal('document', { body: element });
  return element;
}

describe('owned body scroll locks', () => {
  it.each([true, false])(
    'keeps the other owner locked in either close order (%s)',
    (firstClosesFirst) => {
      const element = body('auto');
      const first = lockBodyScroll();
      const second = lockBodyScroll();
      const [close, remaining] = firstClosesFirst
        ? [first, second]
        : [second, first];
      close();
      close();
      expect(element.style.overflow).toBe('hidden');
      remaining();
      remaining();
      expect(element.style.overflow).toBe('auto');
    },
  );

  it('does not let a stale owner release a new acquisition', () => {
    const element = body();
    const stale = lockBodyScroll();
    stale();
    const current = lockBodyScroll();
    stale();
    expect(element.style.overflow).toBe('hidden');
    current();
    expect(element.style.overflow).toBe('');
  });

  it('releases the original body after an SPA body replacement', () => {
    const original = body('scroll');
    const releaseOld = lockBodyScroll();
    const destination = body();
    const releaseNew = lockBodyScroll();
    releaseOld();
    expect(original.style.overflow).toBe('scroll');
    expect(destination.style.overflow).toBe('hidden');
    releaseNew();
    expect(destination.style.overflow).toBe('');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getViewportHeadingStore } from '../src/hooks/heading-viewport-store';
import {
  getHeadingTree,
  subscribeToArticleHeadings,
} from '../src/hooks/useHeadingTree/dom-store';

const subscriptions: Array<() => void> = [];

afterEach(() => {
  subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
  vi.unstubAllGlobals();
});

function heading(
  id: string,
  tagName: string,
  textContent: string,
  inPreview = false,
) {
  const bounds = { top: 110 };
  return {
    id,
    tagName,
    textContent,
    closest: () => (inPreview ? {} : null),
    bounds,
    getBoundingClientRect: vi.fn(() => bounds),
  };
}

type TestHeading = ReturnType<typeof heading>;

function mockBrowser(headings?: TestHeading[]) {
  let article = headings ? { querySelectorAll: () => headings } : null;
  const document = Object.assign(new EventTarget(), {
    querySelector: () => article,
  });
  const window = new EventTarget();
  const mutations: Array<{
    notify: () => void;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const intersections: Array<{
    notify: (target: TestHeading, isIntersecting?: boolean) => void;
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const frames = new Map<number, () => void>();
  let frameId = 0;

  vi.stubGlobal('document', document);
  vi.stubGlobal('window', window);
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(notify: () => void) {
        mutations.push({ notify, disconnect: this.disconnect });
      }
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: unknown[]) => void) {
        intersections.push({
          observe: this.observe,
          disconnect: this.disconnect,
          notify: (target, isIntersecting = true) =>
            callback([
              {
                target,
                isIntersecting,
                boundingClientRect: target.bounds,
              },
            ]),
        });
      }
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );

  return {
    document,
    window,
    intersections,
    mutations,
    frames,
    flushFrame() {
      const pending = Array.from(frames.values());
      frames.clear();
      pending.forEach((callback) => callback());
    },
    swap(next?: TestHeading[]) {
      article = next ? { querySelectorAll: () => next } : null;
      document.dispatchEvent(new Event('astro:after-swap'));
    },
  };
}

describe('article heading observers', () => {
  it('shares the observer and publishes a changed tree to each subscriber', () => {
    const articleHeading = heading('chapter', 'H2', 'Chapter');
    const previewHeading = heading('preview', 'H2', 'Link preview', true);
    const browser = mockBrowser([articleHeading, previewHeading]);
    const active = getViewportHeadingStore(120, 'toc');
    const first = vi.fn();
    const second = vi.fn();
    const treeFirst = vi.fn();
    const treeSecond = vi.fn();

    const unsubscribeFirst = active.subscribe(first);
    subscriptions.push(unsubscribeFirst, active.subscribe(second));
    subscriptions.push(
      subscribeToArticleHeadings(treeFirst),
      subscribeToArticleHeadings(treeSecond),
    );

    expect(browser.mutations).toHaveLength(1);
    expect(browser.intersections).toHaveLength(1);
    const [observer] = browser.intersections;
    expect(observer.observe.mock.calls).toEqual([[articleHeading]]);
    observer.notify(articleHeading);
    expect(active.getSnapshot()?.id).toBe('chapter');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    expect(observer.disconnect).not.toHaveBeenCalled();
    articleHeading.textContent = 'Updated chapter';
    browser.mutations[0].notify();
    browser.flushFrame();
    expect(getHeadingTree()).toEqual([
      { id: 'chapter', text: 'Updated chapter', level: 2, children: [] },
    ]);
    expect(treeFirst).toHaveBeenCalledTimes(1);
    expect(treeSecond).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('resets subscribers on a route swap and ignores the old observer', () => {
    const previous = heading('chapter', 'H2', 'Previous');
    const next = heading('chapter', 'H2', 'Next');
    const deep = heading('detail', 'H4', 'Detail');
    const browser = mockBrowser([previous]);
    const current = getViewportHeadingStore(80, 'current');
    const listener = vi.fn();
    subscriptions.push(current.subscribe(listener));
    const [original] = browser.intersections;
    original.notify(previous);
    expect(current.getSnapshot()?.text).toBe('Previous');

    browser.swap([next, deep]);
    expect(current.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    original.notify(previous);
    expect(current.getSnapshot()).toBeNull();

    browser.flushFrame();
    const replacement = browser.intersections[1];
    expect(replacement.observe.mock.calls).toEqual([[next]]);
    replacement.notify(next);
    expect(current.getSnapshot()?.text).toBe('Next');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('tracks the preceding heading when scrolling between gaps and clears it above the article', () => {
    const headings = Array.from({ length: 64 }, (_, index) =>
      heading(`chapter-${index}`, 'H2', `Chapter ${index}`),
    );
    const browser = mockBrowser(headings);
    const current = getViewportHeadingStore(80, 'current');
    subscriptions.push(current.subscribe(vi.fn()));
    const [observer] = browser.intersections;
    const jumpTo = (position: number) => {
      headings.forEach((heading, index) => {
        heading.bounds.top = 700 + index * 1000 - position;
      });
      browser.window.dispatchEvent(new Event('scroll'));
    };

    observer.notify(headings[0]);
    expect(current.getSnapshot()?.id).toBe('chapter-0');

    jumpTo(1000);
    observer.notify(headings[0], false);
    browser.flushFrame();
    expect(current.getSnapshot()?.id).toBe('chapter-0');

    jumpTo(11_000);
    jumpTo(13_000);
    expect(browser.frames.size).toBe(1);
    browser.flushFrame();
    expect(current.getSnapshot()?.id).toBe('chapter-12');

    // Neither endpoint has a heading inside the observer's viewport band.
    jumpTo(0);
    browser.flushFrame();
    expect(current.getSnapshot()).toBeNull();
    expect(
      headings.reduce(
        (count, element) =>
          count + element.getBoundingClientRect.mock.calls.length,
        0,
      ),
    ).toBeLessThan(headings.length);
  });

  it('waits for a route event when the article is absent and cancels pending frames on unmount', () => {
    const browser = mockBrowser();
    const active = getViewportHeadingStore(120, 'toc');
    const listener = vi.fn();
    const unsubscribe = active.subscribe(listener);
    subscriptions.push(unsubscribe);
    browser.document.dispatchEvent(new Event('astro:page-load'));
    browser.flushFrame();
    expect(browser.frames.size).toBe(0);
    expect(browser.mutations).toHaveLength(0);
    expect(browser.intersections).toHaveLength(0);

    const chapter = heading('chapter', 'H2', 'Chapter');
    browser.swap([chapter]);
    browser.flushFrame();
    expect(browser.frames.size).toBe(1);
    const [observer] = browser.intersections;
    unsubscribe();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(browser.mutations[0].disconnect).toHaveBeenCalledTimes(1);
    expect(browser.frames.size).toBe(0);
    browser.window.dispatchEvent(new Event('scroll'));
    expect(browser.frames.size).toBe(0);
    observer.notify(chapter);
    expect(active.getSnapshot()).toBeNull();
    expect(listener).not.toHaveBeenCalled();
  });
});

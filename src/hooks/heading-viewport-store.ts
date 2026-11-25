import {
  getArticleHeadings,
  subscribeToArticleHeadings,
} from './useHeadingTree/dom-store';

type ArticleHeading = ReturnType<typeof getArticleHeadings>[number];
type HeadingMode = 'toc' | 'current';

function findPrecedingHeading(headings: ArticleHeading[], offsetTop: number) {
  let start = 0;
  let end = headings.length;
  while (start < end) {
    const index = Math.floor((start + end) / 2);
    if (headings[index].element.getBoundingClientRect().top <= offsetTop) {
      start = index + 1;
    } else {
      end = index;
    }
  }
  return headings[start - 1] ?? null;
}

function createViewportStore(offsetTop: number, mode: HeadingMode) {
  const listeners = new Set<() => void>();
  let current: ArticleHeading | null = null;
  let stopWatchingHeadings: (() => void) | undefined;
  let stopCheckingGaps: (() => void) | undefined;
  let observer: IntersectionObserver | null = null;
  let frame: number | null = null;

  function publish(heading: ArticleHeading | null) {
    if (current === heading) return;
    current = heading;
    listeners.forEach((listener) => listener());
  }

  function stopObserving() {
    stopCheckingGaps?.();
    stopCheckingGaps = undefined;
    observer?.disconnect();
    observer = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    publish(null);
  }

  function refresh() {
    stopObserving();
    const headings = getArticleHeadings().filter(
      ({ level }) => mode === 'toc' || level === 2 || level === 3,
    );
    if (!headings.length) return;

    const headingByElement = new Map(
      headings.map((heading) => [heading.element, heading]),
    );
    const visible = new Map<ArticleHeading, number>();

    const scheduleGapCheck = () => {
      if (visible.size > 0 || frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (visible.size === 0) {
          publish(findPrecedingHeading(headings, offsetTop));
        }
      });
    };

    // FIXED: A scroll can jump between two gaps without producing an intersection event.
    window.addEventListener('scroll', scheduleGapCheck, { passive: true });
    window.addEventListener('resize', scheduleGapCheck);
    stopCheckingGaps = () => {
      window.removeEventListener('scroll', scheduleGapCheck);
      window.removeEventListener('resize', scheduleGapCheck);
    };

    if (typeof IntersectionObserver !== 'undefined') {
      const nextObserver = new IntersectionObserver(
        (entries) => {
          // FIXED: Ignore callbacks already queued for a previous article.
          if (observer !== nextObserver) return;
          for (const entry of entries) {
            const heading = headingByElement.get(entry.target as HTMLElement);
            if (!heading) continue;
            if (entry.isIntersecting)
              visible.set(heading, entry.boundingClientRect.top);
            else visible.delete(heading);
          }

          let nearest: ArticleHeading | null = null;
          let top = Infinity;
          for (const [heading, position] of visible) {
            if (position < top) {
              nearest = heading;
              top = position;
            }
          }
          if (nearest) publish(nearest);
          else scheduleGapCheck();
        },
        { rootMargin: `-${offsetTop}px 0px -70% 0px`, threshold: 0 },
      );
      observer = nextObserver;
      headings.forEach(({ element }) => nextObserver.observe(element));
    }

    scheduleGapCheck();
  }

  return {
    subscribe: (listener: () => void) => {
      const subscription = () => listener();
      listeners.add(subscription);
      if (listeners.size === 1) {
        stopWatchingHeadings = subscribeToArticleHeadings(refresh);
        if (!observer && frame === null) refresh();
      }
      return () => {
        if (!listeners.delete(subscription) || listeners.size > 0) return;
        stopWatchingHeadings?.();
        stopWatchingHeadings = undefined;
        stopObserving();
      };
    },
    getSnapshot: () => current,
  };
}

const viewportStores = {
  toc: new Map<number, ReturnType<typeof createViewportStore>>(),
  current: new Map<number, ReturnType<typeof createViewportStore>>(),
};

export function getViewportHeadingStore(offsetTop: number, mode: HeadingMode) {
  const stores = viewportStores[mode];
  let store = stores.get(offsetTop);
  if (!store) {
    store = createViewportStore(offsetTop, mode);
    stores.set(offsetTop, store);
  }
  return store;
}

export function subscribeToNoHeadings(): () => void {
  return () => {};
}

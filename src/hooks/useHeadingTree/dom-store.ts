import { buildHeadingTree, EMPTY_HEADINGS } from './tree-utils';
import type { Heading } from '../useHeadingTree';

interface ArticleHeading {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

const EMPTY_ARTICLE_HEADINGS: ArticleHeading[] = [];
const listeners = new Set<() => void>();
let article: Element | null = null;
let observer: MutationObserver | null = null;
let frame: number | null = null;
let articleHeadings = EMPTY_ARTICLE_HEADINGS;
let headingTree = EMPTY_HEADINGS;

function readHeadings(article: Element): ArticleHeading[] {
  const elements = Array.from(
    article.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'),
  ).filter((heading) => !heading.closest('.link-preview-block'));
  const usedIds = new Set(elements.map(({ id }) => id));

  return elements.map((element, index) => {
    const text = element.textContent?.trim() ?? '';
    if (!element.id) {
      const base =
        text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-') || `heading-${index}`;
      let id = base;
      for (let suffix = 1; usedIds.has(id); suffix++) id = `${base}-${suffix}`;
      element.id = id;
      usedIds.add(id);
    }
    return { id: element.id, text, level: Number(element.tagName[1]), element };
  });
}

function publish(next: ArticleHeading[]) {
  if (
    next.length === articleHeadings.length &&
    next.every(({ id, text, level, element }, index) => {
      const previous = articleHeadings[index];
      return (
        id === previous.id &&
        text === previous.text &&
        level === previous.level &&
        element === previous.element
      );
    })
  ) {
    return;
  }

  articleHeadings = next;
  headingTree = next.length
    ? buildHeadingTree(next.map(({ id, text, level }) => ({ id, text, level })))
    : EMPTY_HEADINGS;
  listeners.forEach((listener) => listener());
}

function refresh() {
  const target =
    document.querySelector('.custom-content') ??
    document.querySelector('article');
  if (target !== article) {
    observer?.disconnect();
    observer = null;
    article = target;
    if (article && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(scheduleRefresh);
      observer.observe(article, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['id'],
      });
    }
  }

  publish(article ? readHeadings(article) : EMPTY_ARTICLE_HEADINGS);
}

function scheduleRefresh() {
  if (listeners.size === 0 || frame !== null) return;
  frame = requestAnimationFrame(() => {
    frame = null;
    refresh();
  });
}

function disconnect() {
  observer?.disconnect();
  observer = null;
  article = null;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  publish(EMPTY_ARTICLE_HEADINGS);
}

function handleSwap() {
  // FIXED: Release DOM references and publish the reset before reading the new page.
  disconnect();
  scheduleRefresh();
}

export function subscribeToArticleHeadings(listener: () => void): () => void {
  if (typeof document === 'undefined') return () => {};

  const subscription = () => listener();
  listeners.add(subscription);
  if (listeners.size === 1) {
    document.addEventListener('astro:after-swap', handleSwap);
    document.addEventListener('astro:page-load', scheduleRefresh);
    refresh();
  }

  return () => {
    if (!listeners.delete(subscription) || listeners.size > 0) return;
    document.removeEventListener('astro:after-swap', handleSwap);
    document.removeEventListener('astro:page-load', scheduleRefresh);
    disconnect();
  };
}

export function getArticleHeadings(): ArticleHeading[] {
  return articleHeadings;
}

export function getHeadingTree(): Heading[] {
  return headingTree;
}

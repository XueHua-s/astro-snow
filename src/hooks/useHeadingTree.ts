import { useMemo, useSyncExternalStore } from 'react';
import {
  getHeadingTree,
  subscribeToArticleHeadings,
} from './useHeadingTree/dom-store';
import { subscribeToNoHeadings } from './heading-viewport-store';
import {
  buildHeadingTree,
  EMPTY_HEADINGS,
  normalizeHeadingInputs,
  type HeadingInput,
} from './useHeadingTree/tree-utils';

export interface Heading {
  id: string;
  text: string;
  level: number;
  children: Heading[];
  parent?: Heading;
}

const emptyHeadingTree = () => EMPTY_HEADINGS;

export function useHeadingTree(
  sourceHeadings?: HeadingInput[],
  enabled = true,
): Heading[] {
  const domHeadings = useSyncExternalStore(
    enabled ? subscribeToArticleHeadings : subscribeToNoHeadings,
    enabled ? getHeadingTree : emptyHeadingTree,
    emptyHeadingTree,
  );

  return useMemo(() => {
    if (domHeadings.length > 0) return domHeadings;
    if (sourceHeadings && sourceHeadings.length > 0) {
      return buildHeadingTree(normalizeHeadingInputs(sourceHeadings));
    }
    return domHeadings;
  }, [domHeadings, sourceHeadings]);
}

export function findHeadingById(
  headings: Heading[],
  id: string,
): Heading | null {
  for (const heading of headings) {
    if (heading.id === id) return heading;
    const found = findHeadingById(heading.children, id);
    if (found) return found;
  }
  return null;
}

export function getParentIds(heading: Heading): string[] {
  const parentIds: string[] = [];
  let current = heading.parent;
  while (current) {
    parentIds.push(current.id);
    current = current.parent;
  }
  return parentIds;
}

export function getSiblingIds(
  targetHeading: Heading,
  allHeadings: Heading[],
): string[] {
  const siblings: string[] = [];

  if (!targetHeading.parent) {
    allHeadings.forEach((heading) => {
      if (heading.id !== targetHeading.id && heading.children.length > 0) {
        siblings.push(heading.id);
      }
    });
    return siblings;
  }

  targetHeading.parent.children.forEach((heading) => {
    if (heading.id !== targetHeading.id && heading.children.length > 0) {
      siblings.push(heading.id);
    }
  });

  return siblings;
}

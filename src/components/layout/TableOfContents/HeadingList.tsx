/**
 * HeadingList Component
 *
 * Renders a list of heading items with accordion behavior.
 * Handles the recursive rendering logic for nested headings.
 */

import { memo } from 'react';
import type { Heading } from '@hooks/useHeadingTree';
import { HeadingTreeItem } from './HeadingTreeItem';

interface HeadingListProps {
  /** Array of heading nodes to render */
  headings: Heading[];
  /** Current nesting depth (0 for top level) */
  depth?: number;
  /** ID of the currently active heading */
  activeId: string | null;
  /** Set of expanded heading IDs */
  expandedIds: Set<string>;
  /** Callback when a heading is clicked */
  onHeadingClick: (id: string) => void;
}

/**
 * HeadingList - Renders a recursive list of table of contents headings
 */
const HeadingListComponent = ({
  headings,
  depth = 0,
  activeId,
  expandedIds,
  onHeadingClick,
}: HeadingListProps) => {
  return (
    <>
      {headings.map((heading) => (
        <HeadingTreeItem
          key={heading.id}
          heading={heading}
          depth={depth}
          activeId={activeId}
          expandedIds={expandedIds}
          onHeadingClick={onHeadingClick}
        />
      ))}
    </>
  );
};

/**
 * Memoized HeadingList for performance optimization
 * Prevents unnecessary re-renders when props haven't changed
 */
export const HeadingList = memo(HeadingListComponent);

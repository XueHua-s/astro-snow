/**
 * HeadingTreeItem Component
 *
 * Renders a single heading item in the table of contents tree.
 * Supports nesting, active state highlighting, and recursive rendering of children.
 */

import { memo } from 'react';
import type { Heading } from '@hooks/useHeadingTree';
import { cn } from '@/lib/utils';

// Constants
const INDENT_BASE = 0.75; // Base left padding in rem
const INDENT_PER_LEVEL = 1; // Additional padding per nesting level in rem

interface HeadingTreeItemProps {
  /** The heading node to render */
  heading: Heading;
  /** Current nesting depth (0 for top level) */
  depth?: number;
  /** ID of the currently active heading */
  activeId: string | null;
  /** Set of expanded heading IDs */
  expandedIds: Set<string>;
  /** Callback when heading is clicked */
  onHeadingClick: (id: string) => void;
}

/**
 * HeadingTreeItem - A single item in the table of contents tree
 */
const HeadingTreeItemComponent = ({
  heading,
  depth = 0,
  activeId,
  expandedIds,
  onHeadingClick,
}: HeadingTreeItemProps) => {
  const hasChildren = heading.children.length > 0;
  const isActive = activeId === heading.id;
  const isExpanded = expandedIds.has(heading.id);

  return (
    <div key={heading.id} className="heading-tree-item relative">
      <a
        href={`#${heading.id}`}
        onClick={(e) => {
          e.preventDefault();
          onHeadingClick(heading.id);
        }}
        className={cn(
          'heading-link group hover:bg-foreground/5 relative flex items-center rounded-md py-2 text-sm transition-all duration-200 hover:border-l-2',
          {
            'bg-primary/10 text-primary border-l-primary hover:text-primary hover:bg-primary/10 font-medium':
              isActive,
          },
        )}
        style={{
          paddingLeft: `${INDENT_BASE + depth * INDENT_PER_LEVEL}rem`,
          paddingRight: hasChildren ? '0.5rem' : '0.75rem',
        }}
        data-level={heading.level}
        aria-label={heading.text}
        aria-current={isActive ? 'location' : undefined}>
        {/* Heading text - numbering will be added via CSS ::before */}
        <span className="heading-text block flex-1 truncate leading-relaxed">
          {heading.text}
        </span>
        {/* Active state indicator */}
        {isActive && <span className="text-primary ml-2 text-xs">•</span>}
      </a>

      {/* Render children nested within this item */}
      {hasChildren && isExpanded && (
        <div className="heading-children">
          {heading.children.map((child) => (
            <HeadingTreeItem
              key={child.id}
              heading={child}
              depth={depth + 1}
              activeId={activeId}
              expandedIds={expandedIds}
              onHeadingClick={onHeadingClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Memoized HeadingTreeItem for performance optimization
 * Prevents unnecessary re-renders when props haven't changed
 */
export const HeadingTreeItem = memo(HeadingTreeItemComponent);

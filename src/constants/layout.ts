/**
 * Unified layout spacing constants
 *
 * This file defines standardized spacing values for consistent horizontal
 * and vertical spacing across all pages and components.
 */

/**
 * Content area padding for main content blocks
 */
export const CONTENT_PADDING = {
  // Standard content with top spacing
  standard: 'px-8 py-6 tablet:px-5 tablet:pt-5 tablet:pb-2',
  // Content without extra top spacing
  normal: 'px-8 py-4 tablet:px-5',
  // Compact content (for nested items)
  compact: 'px-4 py-2 tablet:px-2 tablet:py-1',
} as const;

/**
 * Max width constraints
 */
export const MAX_WIDTH = {
  // Main content container (1400px)
  content: 'max-w-7xl',
} as const;

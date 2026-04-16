import { describe, expect, it } from 'vitest';
import { hasItems } from '../src/lib/utils';

describe('hasItems', () => {
  it('returns true for non-empty arrays', () => {
    expect(hasItems(['category'])).toBe(true);
  });

  it('returns false for empty or missing arrays', () => {
    expect(hasItems([])).toBe(false);
    expect(hasItems(undefined)).toBe(false);
    expect(hasItems(null)).toBe(false);
  });
});

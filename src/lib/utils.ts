import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// FIXED: Astro/React will render numeric 0, so template guards must resolve to booleans.
export function hasItems<T>(items?: readonly T[] | null): boolean {
  return items != null && items.length > 0;
}

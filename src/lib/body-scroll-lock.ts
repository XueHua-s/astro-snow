/**
 * Body scroll lock with reference counting.
 *
 * Multiple components (drawer, search dialog, fullscreen overlays) may need to
 * lock body scroll simultaneously. A simple `document.body.style.overflow = 'hidden'`
 * breaks when the second locker unlocks — it clears the lock for the first.
 *
 * This module uses a counter: overflow is set to 'hidden' on the first lock and
 * cleared only when the last locker releases.
 */

let lockCount = 0;

export function lockBodyScroll(): void {
  lockCount++;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}

export function unlockBodyScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}

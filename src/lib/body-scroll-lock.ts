/** Each acquisition owns an idempotent release; one overlay cannot unlock another. */
const locks = new WeakMap<HTMLElement, { count: number; overflow: string }>();

export function lockBodyScroll(): () => void {
  const body = document.body;
  let lock = locks.get(body);
  if (!lock) {
    lock = { count: 0, overflow: body.style.overflow };
    locks.set(body, lock);
  }
  lock.count++;
  body.style.overflow = 'hidden';

  // FIXED: Delayed/duplicate cleanup only releases this owner's acquisition,
  // including after Astro has replaced the original body during navigation.
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--lock.count === 0) {
      body.style.overflow = lock.overflow;
      locks.delete(body);
    }
  };
}

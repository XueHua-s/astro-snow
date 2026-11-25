export function animateHero(hero: HTMLElement) {
  const specular = hero.querySelector<HTMLElement>('.glass-specular');
  const view = hero.ownerDocument.defaultView;
  if (!specular || !view) return;

  const reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = view.matchMedia('(pointer: coarse)');
  const motionAllowed = () => !reducedMotion.matches && !coarsePointer.matches;

  let frame: number | undefined;
  let x = 50;
  let y = 0;

  const reset = () => {
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    frame = undefined;
    x = 50;
    y = 0;
    specular.style.removeProperty('--sheen-x');
    specular.style.removeProperty('--sheen-y');
  };

  function syncPreferences() {
    if (!motionAllowed()) reset();
  }

  const schedule = () => {
    if (!motionAllowed() || frame !== undefined) return;
    const scheduledFrame = view.requestAnimationFrame(() => {
      if (frame !== scheduledFrame) return;
      frame = undefined;
      // FIXED: The preference may change before the queued paint runs.
      if (!motionAllowed()) {
        reset();
        return;
      }
      specular.style.setProperty('--sheen-x', `${x}%`);
      specular.style.setProperty('--sheen-y', `${y}%`);
    });
    frame = scheduledFrame;
  };

  function move(event: PointerEvent) {
    if (!motionAllowed()) return;
    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    x = ((event.clientX - rect.left) / rect.width) * 100;
    y = ((event.clientY - rect.top) / rect.height) * 100;
    schedule();
  }

  function leave() {
    x = 50;
    y = 0;
    schedule();
  }

  hero.addEventListener('pointermove', move, { passive: true });
  hero.addEventListener('pointerleave', leave, { passive: true });
  reducedMotion.addEventListener('change', syncPreferences);
  coarsePointer.addEventListener('change', syncPreferences);

  return () => {
    reset();
    hero.removeEventListener('pointermove', move);
    hero.removeEventListener('pointerleave', leave);
    reducedMotion.removeEventListener('change', syncPreferences);
    coarsePointer.removeEventListener('change', syncPreferences);
  };
}

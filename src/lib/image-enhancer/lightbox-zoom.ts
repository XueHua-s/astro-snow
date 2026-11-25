interface Point {
  x: number;
  y: number;
}

interface TrackedPointer {
  point: Point;
  target: Element;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

function getPoint(event: MouseEvent): Point {
  return { x: event.clientX, y: event.clientY };
}

function clampOffset(offset: number, size: number, viewport: number): number {
  const limit = Math.max(0, (size - viewport) / 2 + viewport * 0.3);
  return Math.max(-limit, Math.min(limit, offset));
}

function getGesture(pointers: Map<number, TrackedPointer>) {
  const [first, second] = pointers.values();
  if (!second) return { center: first.point, distance: 0 };

  const x = second.point.x - first.point.x;
  const y = second.point.y - first.point.y;
  return {
    center: { x: first.point.x + x / 2, y: first.point.y + y / 2 },
    distance: Math.hypot(x, y),
  };
}

/** Bind the gestures for this image, and return a reset for each new viewing session. */
export function bindLightboxGestures(
  container: HTMLElement,
  img: HTMLImageElement,
): () => void {
  const pointers = new Map<number, TrackedPointer>();
  let scale = MIN_SCALE;
  let offset = { x: 0, y: 0 };

  const apply = () => {
    if (scale === MIN_SCALE) {
      offset = { x: 0, y: 0 };
      img.style.transform = '';
      img.style.cursor = 'zoom-in';
      return;
    }

    offset.x = clampOffset(
      offset.x,
      img.offsetWidth * scale,
      window.innerWidth,
    );
    offset.y = clampOffset(
      offset.y,
      img.offsetHeight * scale,
      window.innerHeight,
    );
    img.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
    img.style.cursor = pointers.size === 1 ? 'grabbing' : 'grab';
  };

  // FIXED: Every gesture uses the same transform, anchored to the visible image.
  const adjust = (oldPoint: Point, newPoint: Point, targetScale: number) => {
    const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));
    const ratio = nextScale / scale;
    const { left, top, width, height } = img.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    offset.x += newPoint.x - centerX - (oldPoint.x - centerX) * ratio;
    offset.y += newPoint.y - centerY - (oldPoint.y - centerY) * ratio;
    scale = nextScale;
    apply();
  };

  img.addEventListener('dblclick', (event) => {
    event.preventDefault();
    const point = getPoint(event);
    adjust(point, point, scale === MIN_SCALE ? 2 : MIN_SCALE);
  });

  container.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (event.deltaY === 0) return;
      const point = getPoint(event);
      adjust(point, point, scale * (event.deltaY > 0 ? 0.9 : 1.1));
    },
    { passive: false },
  );

  container.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || pointers.size === 2) return;
    const isTouch = event.pointerType === 'touch';
    if (!isTouch && (event.target !== img || scale === MIN_SCALE)) return;

    const target = event.target as Element;
    target.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { point: getPoint(event), target });
    apply();
  });

  container.addEventListener('pointermove', (event) => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;

    const previous = getGesture(pointers);
    pointer.point = getPoint(event);
    const current = getGesture(pointers);
    const ratio =
      previous.distance > 0 && current.distance > 0
        ? current.distance / previous.distance
        : 1;
    adjust(previous.center, current.center, scale * ratio);
  });

  const finish = (event: PointerEvent) => {
    if (pointers.delete(event.pointerId)) apply();
  };

  container.addEventListener('pointerup', finish);
  container.addEventListener('pointercancel', finish);
  container.addEventListener('lostpointercapture', finish);
  img.addEventListener('dragstart', (event) => event.preventDefault());

  return () => {
    for (const [id, { target }] of pointers) {
      if (target.hasPointerCapture(id)) target.releasePointerCapture(id);
    }
    pointers.clear();
    scale = MIN_SCALE;
    apply();
  };
}

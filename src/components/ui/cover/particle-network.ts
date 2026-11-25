export const particleColors = ['#80dbff', '#ffafd9', '#ffffff'] as const;

export const connectionStroke = { color: '#c9ddf0', width: 0.95 } as const;

const TAU = Math.PI * 2;
const connectionRange = 55;
const minimumOpacity = 0.012;
const margin = 100;

function between(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function ease(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function createParticle(x: number, color: number) {
  const depth = Math.random();
  return {
    x,
    point: { x, y: 0, radius: 0, opacity: 0, color },
    depth,
    speed: between(46, 120),
    offset: between(-0.23, 0.23),
    radius: between(1.18, 1.58) + depth * 0.4,
    phase: between(0, TAU),
    turn: between(0.52, 1.02),
    drift: between(5, 16),
    life: Math.random(),
    lifetime: between(4.6, 9.4),
    lift: between(22, 44),
  };
}

interface Point {
  x: number;
  y: number;
  opacity: number;
  color: number;
}

/** Visit each visible edge once. Points are sorted in place along the flow so the
 * still image and the animated stream use exactly the same neighbourhood. */
export function forEachConnection<T extends Point>(
  points: T[],
  visit: (a: T, b: T, opacity: number) => void,
) {
  points.sort((a, b) => a.x - b.x);
  for (let i = 0; i < points.length; i++) {
    const first = points[i];
    for (let j = i + 1; j < points.length; j++) {
      const second = points[j];
      const dx = second.x - first.x;
      if (dx >= connectionRange) break;
      if (first.color === second.color) continue;
      const dy = second.y - first.y;
      const squaredDistance = dx * dx + dy * dy;
      if (squaredDistance >= connectionRange * connectionRange) continue;
      const strength = ease(
        (connectionRange - Math.sqrt(squaredDistance)) / 40,
      );
      const opacity = 0.76 * Math.min(first.opacity, second.opacity) * strength;
      if (opacity >= minimumOpacity) visit(first, second, opacity);
    }
  }
}

/** Enhance the cover while visible. Disposing it restores the static artwork. */
export function animateCoverNetwork(cover: HTMLElement) {
  const canvas = cover.querySelector('canvas');
  if (!canvas) return;
  let context: CanvasRenderingContext2D | null | undefined;
  const reducedEffects = window.matchMedia(
    '(prefers-reduced-motion: reduce), (forced-colors: active)',
  );
  const particles: ReturnType<typeof createParticle>[] = [];
  const visiblePoints: ReturnType<typeof createParticle>['point'][] = [];
  let width = 0;
  let height = 0;
  let visible = false;
  let frame: number | null = null;
  let previousFrame: number | null = null;
  let time = 0;

  function paint(timestamp: number) {
    const ctx = context;
    if (!ctx) return;
    const dt = Math.min(
      0.05,
      (timestamp - (previousFrame ?? timestamp)) / 1000,
    );
    previousFrame = timestamp;
    time += dt;
    visiblePoints.length = 0;
    const wavelength = Math.max(470, Math.min(920, width * 0.8));
    const mobileScale = Math.min(1, 0.6 + width / 2400);

    for (const particle of particles) {
      particle.x += dt * particle.speed * mobileScale;
      if (particle.x > width + margin) particle.x -= width + margin * 2;
      particle.life = (particle.life + dt / particle.lifetime) % 1;

      // The broad wave carries free points at different speeds. Each eddy and fade has its own phase.
      const crest = TAU * (particle.x / wavelength - time * 0.059);
      const turn = particle.phase + time * particle.turn;
      const lift = ease((particle.life - 0.64) / 0.36);
      const x =
        particle.x +
        particle.drift * Math.cos(turn) -
        lift * particle.lift * 0.55;
      const y =
        height * (0.54 + particle.offset + 0.145 * Math.sin(crest)) +
        particle.drift * Math.sin(turn) -
        lift * particle.lift;
      const lifeAlpha =
        ease(particle.life / 0.11) * (1 - ease((particle.life - 0.67) / 0.33));
      const opacity =
        (0.72 + particle.depth * 0.25) *
        lifeAlpha *
        ease(Math.min(x, width - x) / 32);
      if (opacity < minimumOpacity) continue;
      const point = particle.point;
      point.x = x;
      point.y = y;
      point.opacity = opacity;
      point.radius = particle.radius * (1 - 0.55 * lift);
      visiblePoints.push(point);
    }

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = connectionStroke.color;
    ctx.lineWidth = connectionStroke.width;
    forEachConnection(visiblePoints, (a, b, opacity) => {
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    for (const point of visiblePoints) {
      ctx.fillStyle = particleColors[point.color];
      ctx.globalAlpha = point.opacity;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, TAU);
      ctx.fill();
    }
    frame = requestAnimationFrame(paint);
  }

  function stop() {
    if (frame === null) return;
    cancelAnimationFrame(frame);
    frame = null;
    previousFrame = null;
    cover.removeAttribute('data-particles-active');
  }

  const sync = () => {
    if (!visible || document.hidden || reducedEffects.matches) return stop();
    const nextWidth = cover.clientWidth;
    const nextHeight = cover.clientHeight;
    if (!nextWidth || !nextHeight) return stop();

    // FIXED: Static-only covers need neither a drawing context nor a high-DPI backing bitmap.
    if (context === undefined) context = canvas.getContext('2d');
    if (!context) return;
    const oldWidth = width;
    width = nextWidth;
    height = nextHeight;
    const count = Math.min(92, Math.ceil((width + 2 * margin) / 27));
    if (oldWidth !== width) {
      for (const particle of particles) {
        particle.x =
          ((particle.x + margin) / (oldWidth + 2 * margin)) *
            (width + 2 * margin) -
          margin;
      }
    }
    while (particles.length < count) {
      const x = between(-margin, width + margin);
      particles.push(
        createParticle(x, particles.length % particleColors.length),
      );
    }
    particles.length = count;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (frame === null) {
      cover.setAttribute('data-particles-active', '');
      frame = requestAnimationFrame(paint);
    }
  };
  const resize = new ResizeObserver(sync);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });

  resize.observe(cover);
  intersection.observe(cover);
  reducedEffects.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  return () => {
    stop();
    resize.disconnect();
    intersection.disconnect();
    reducedEffects.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
  };
}

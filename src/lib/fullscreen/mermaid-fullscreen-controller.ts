import {
  mermaidFullscreenData,
  openMermaidFullscreen,
  closeMermaidFullscreen,
  type MermaidFullscreenData,
} from '@store/ui';
import { copyToClipboard } from '@lib/code-block-enhancer';
import { lockBodyScroll } from '@lib/body-scroll-lock';

interface Elements {
  overlay: HTMLElement;
  dialog: HTMLElement;
  content: HTMLElement;
  closeBtn: HTMLElement;
  resetBtn: HTMLElement;
  copyBtn: HTMLElement;
  copyIcon: HTMLElement;
  checkIcon: HTMLElement;
  copyText: HTMLElement;
  viewport: HTMLElement;
  svgContainer: HTMLElement;
  zoomLevel: HTMLElement;
}

function getElements(): Elements | null {
  const byId = (id: string) => document.getElementById(id);
  const elements = {
    overlay: byId('mermaid-fullscreen-overlay'),
    dialog: byId('mermaid-fullscreen-dialog'),
    content: byId('mermaid-fullscreen-content'),
    closeBtn: byId('mermaid-fullscreen-close'),
    resetBtn: byId('mermaid-fullscreen-reset'),
    copyBtn: byId('mermaid-fullscreen-copy'),
    copyIcon: byId('mermaid-fullscreen-copy-icon'),
    checkIcon: byId('mermaid-fullscreen-check-icon'),
    copyText: byId('mermaid-fullscreen-copy-text'),
    viewport: byId('mermaid-fullscreen-viewport'),
    svgContainer: byId('mermaid-fullscreen-svg'),
    zoomLevel: byId('mermaid-zoom-level'),
  };

  if (Object.values(elements).some((el) => !el)) return null;
  return elements as Elements;
}

export function initMermaidFullscreenController() {
  const elements = getElements();
  if (!elements) return () => {};

  let currentData: MermaidFullscreenData | null = null;
  let copyTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let closeTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let frameId: number | null = null;
  let releaseScroll: (() => void) | null = null;
  const listeners = new AbortController();
  const { signal } = listeners;

  const cancelAnimation = () => {
    if (closeTimeoutId !== null) clearTimeout(closeTimeoutId);
    if (frameId !== null) cancelAnimationFrame(frameId);
    closeTimeoutId = null;
    frameId = null;
  };
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let lastTranslateX = 0;
  let lastTranslateY = 0;
  let initialPinchDistance = 0;
  let initialPinchScale = 1;

  const applyTransform = () => {
    elements.svgContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    elements.zoomLevel.textContent = `${Math.round(scale * 100)}%`;
  };

  const close = () => {
    currentData = null;
    // Initial null subscriptions never acquired a lock or opened the overlay.
    if (!releaseScroll) return;
    cancelAnimation();
    elements.overlay.classList.replace('opacity-100', 'opacity-0');
    elements.content.classList.replace('opacity-100', 'opacity-0');
    closeTimeoutId = setTimeout(() => {
      closeTimeoutId = null;
      elements.overlay.dataset.state = 'closed';
      elements.dialog.dataset.state = 'closed';
      releaseScroll?.();
      releaseScroll = null;
      elements.svgContainer.innerHTML = '';
    }, 200);
  };

  const open = (data: MermaidFullscreenData) => {
    // FIXED: Reopening cancels stale close work and keeps one lock per owner.
    cancelAnimation();
    releaseScroll ??= lockBodyScroll();
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
    elements.svgContainer.innerHTML = data.svg;
    elements.overlay.dataset.state = 'open';
    elements.dialog.dataset.state = 'open';
    frameId = requestAnimationFrame(() => {
      frameId = null;
      elements.overlay.classList.replace('opacity-0', 'opacity-100');
      elements.content.classList.replace('opacity-0', 'opacity-100');
    });
  };

  const unsubscribe = mermaidFullscreenData.subscribe((data) => {
    if (data) {
      currentData = data;
      open(data);
    } else {
      close();
    }
  });

  const onCopy = async () => {
    if (!currentData) return;
    const data = currentData;
    const success = await copyToClipboard(data.source);
    if (!success || signal.aborted || currentData !== data) return;

    if (copyTimeoutId) clearTimeout(copyTimeoutId);
    elements.copyIcon.classList.add('hidden');
    elements.checkIcon.classList.remove('hidden');
    elements.copyBtn.classList.add('text-primary');
    elements.copyText.textContent = 'Copied';
    copyTimeoutId = setTimeout(() => {
      elements.copyIcon.classList.remove('hidden');
      elements.checkIcon.classList.add('hidden');
      elements.copyBtn.classList.remove('text-primary');
      elements.copyText.textContent = 'Copy';
      copyTimeoutId = null;
    }, 2000);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const newScale = Math.min(
      Math.max(0.5, scale * (e.deltaY > 0 ? 0.9 : 1.1)),
      5,
    );
    const rect = elements.viewport.getBoundingClientRect();
    const cursorX = e.clientX - rect.left - rect.width / 2;
    const cursorY = e.clientY - rect.top - rect.height / 2;
    const factor = newScale / scale;
    translateX = cursorX - (cursorX - translateX) * factor;
    translateY = cursorY - (cursorY - translateY) * factor;
    scale = newScale;
    applyTransform();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    translateX = lastTranslateX + (e.clientX - dragStartX);
    translateY = lastTranslateY + (e.clientY - dragStartY);
    applyTransform();
  };

  document.addEventListener(
    'keydown',
    (e) =>
      e.key === 'Escape' &&
      mermaidFullscreenData.get() &&
      closeMermaidFullscreen(),
    { signal },
  );
  elements.closeBtn.addEventListener('click', () => closeMermaidFullscreen(), {
    signal,
  });
  elements.dialog.addEventListener(
    'click',
    (e) => e.target === elements.dialog && closeMermaidFullscreen(),
    { signal },
  );
  elements.copyBtn.addEventListener('click', () => void onCopy(), { signal });
  elements.resetBtn.addEventListener(
    'click',
    () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      applyTransform();
    },
    { signal },
  );
  elements.viewport.addEventListener('wheel', onWheel, {
    passive: false,
    signal,
  });
  elements.viewport.addEventListener(
    'mousedown',
    (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      lastTranslateX = translateX;
      lastTranslateY = translateY;
    },
    { signal },
  );
  document.addEventListener('mousemove', onMouseMove, { signal });
  document.addEventListener(
    'mouseup',
    () => {
      isDragging = false;
    },
    { signal },
  );
  elements.viewport.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
        initialPinchScale = scale;
      }
    },
    { passive: false, signal },
  );
  elements.viewport.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      scale = Math.min(
        Math.max(0.5, initialPinchScale * (dist / initialPinchDistance)),
        5,
      );
      applyTransform();
    },
    { passive: false, signal },
  );

  const customEventListener = ((e: CustomEvent<MermaidFullscreenData>) => {
    openMermaidFullscreen(e.detail);
  }) as EventListener;
  window.addEventListener('open-mermaid-fullscreen', customEventListener, {
    signal,
  });

  return () => {
    if (copyTimeoutId) clearTimeout(copyTimeoutId);
    cancelAnimation();
    currentData = null;
    releaseScroll?.();
    releaseScroll = null;
    listeners.abort();
    unsubscribe();
  };
}

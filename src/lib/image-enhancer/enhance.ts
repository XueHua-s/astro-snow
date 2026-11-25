import { groupPortraitImages } from './grouping';
import { openLightbox } from './lightbox';

function createFullscreenButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'markdown-image-fullscreen';
  button.setAttribute('type', 'button');
  button.setAttribute('aria-label', '全屏查看');
  button.title = '全屏查看';
  button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
  return button;
}

function createErrorPlaceholder(img: HTMLImageElement): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'markdown-image-error';
  placeholder.setAttribute('role', 'img');
  placeholder.setAttribute(
    'aria-label',
    img.alt ? `图片加载失败: ${img.alt}` : '图片加载失败',
  );

  const icon = document.createElement('span');
  icon.className = 'markdown-image-error-icon';
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'markdown-image-error-text';
  text.textContent = '图片加载失败';

  placeholder.appendChild(icon);
  placeholder.appendChild(text);

  return placeholder;
}

function enhanceImage(
  img: HTMLImageElement,
  onSettled: () => void,
  signal?: AbortSignal,
): () => void {
  const wrapper = img.closest('.markdown-image-wrapper');
  let control: HTMLElement | undefined;
  const settle = (event?: Event) => {
    img.removeEventListener('load', settle);
    img.removeEventListener('error', settle);
    img.classList.remove('pending');

    const loaded = event?.type !== 'error' && img.naturalWidth > 0;
    img.classList.add(loaded ? 'loaded' : 'error');

    if (wrapper) {
      wrapper.classList.toggle(
        'portrait',
        loaded && img.naturalHeight > img.naturalWidth * 1.2,
      );
      control = loaded ? createFullscreenButton() : createErrorPlaceholder(img);
      wrapper.append(control);
    }
    onSettled();
  };

  if (img.complete) {
    settle();
  } else {
    // FIXED: Let a progressively displayed native image stay visible on hydration.
    if (img.naturalWidth === 0) img.classList.add('pending');
    img.addEventListener('load', settle, { signal });
    img.addEventListener('error', settle, { signal });
  }

  return () => {
    img.classList.remove('pending', 'loaded', 'error');
    wrapper?.classList.remove('portrait');
    control?.remove();
  };
}

function handleImageClick(e: Event): void {
  const { target } = e;
  if (!(target instanceof Element)) return;

  if (
    target instanceof HTMLImageElement &&
    target.matches('.markdown-image.loaded')
  ) {
    openLightbox(target.src, target.alt || '图片');
  } else if (target.closest('.markdown-image-fullscreen')) {
    const wrapper = target.closest('.markdown-image-wrapper');
    const img = wrapper?.querySelector<HTMLImageElement>(
      '.markdown-image.loaded',
    );
    if (img) {
      e.stopPropagation();
      openLightbox(img.src, img.alt || '图片');
    }
  }
}

export function enhanceImages(container: Element, signal?: AbortSignal): void {
  if (signal?.aborted) return;
  const images =
    container.querySelectorAll<HTMLImageElement>('.markdown-image');
  if (images.length === 0) return;

  let remaining = images.length;
  let undoGrouping: (() => void) | undefined;

  container.addEventListener('click', handleImageClick, { signal });

  const onSettled = () => {
    remaining--;
    if (remaining === 0) undoGrouping = groupPortraitImages(container);
  };

  const cleanups = Array.from(images, (img) =>
    enhanceImage(img, onSettled, signal),
  );
  signal?.addEventListener(
    'abort',
    () => {
      undoGrouping?.();
      for (const cleanup of cleanups) cleanup();
    },
    { once: true },
  );
}

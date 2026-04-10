import { groupPortraitImages } from './grouping';
import { openLightbox } from './lightbox';

const enhancedImages = new WeakSet<HTMLImageElement>();

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

function handleImageLoaded(img: HTMLImageElement): void {
  img.classList.add('loaded');

  const isPortrait = img.naturalHeight > img.naturalWidth * 1.2;
  if (isPortrait) {
    img.closest('.markdown-image-wrapper')?.classList.add('portrait');
  }

  const wrapper = img.closest('.markdown-image-wrapper');
  if (!wrapper || wrapper.querySelector('.markdown-image-fullscreen')) return;

  const fullscreenBtn = createFullscreenButton();
  wrapper.appendChild(fullscreenBtn);
  img.style.cursor = 'zoom-in';
}

function handleImageError(img: HTMLImageElement): void {
  img.classList.add('error');
  const wrapper = img.closest('.markdown-image-wrapper');
  if (wrapper && !wrapper.querySelector('.markdown-image-error')) {
    const placeholder = createErrorPlaceholder(img);
    wrapper.appendChild(placeholder);
  }
}

function handleImageClick(e: Event): void {
  const target = e.target as HTMLElement;

  if (target.classList.contains('markdown-image')) {
    const img = target as HTMLImageElement;
    openLightbox(img.src, img.alt || '图片');
  } else if (target.closest('.markdown-image-fullscreen')) {
    const wrapper = target.closest('.markdown-image-wrapper');
    const img = wrapper?.querySelector('.markdown-image') as HTMLImageElement;
    if (img) {
      e.stopPropagation();
      openLightbox(img.src, img.alt || '图片');
    }
  }
}

export function enhanceImages(container: Element, signal?: AbortSignal): void {
  const images =
    container.querySelectorAll<HTMLImageElement>('.markdown-image');
  let loadedCount = 0;
  const totalImages = images.length;

  container.addEventListener('click', handleImageClick, { signal });

  const checkAllLoaded = () => {
    loadedCount++;
    if (loadedCount >= totalImages) {
      groupPortraitImages(container);
    }
  };

  images.forEach((img) => {
    if (enhancedImages.has(img)) {
      checkAllLoaded();
      return;
    }
    enhancedImages.add(img);

    if (img.complete && img.naturalWidth > 0) {
      handleImageLoaded(img);
      checkAllLoaded();
      return;
    }

    if (img.complete && img.naturalWidth === 0) {
      handleImageError(img);
      checkAllLoaded();
      return;
    }

    img.addEventListener(
      'load',
      () => {
        handleImageLoaded(img);
        checkAllLoaded();
      },
      { once: true },
    );

    img.addEventListener(
      'error',
      () => {
        handleImageError(img);
        checkAllLoaded();
      },
      { once: true },
    );
  });

  if (totalImages === 0) {
    groupPortraitImages(container);
  }
}

import { bindLightboxGestures } from './lightbox-zoom';

let lightbox: ReturnType<typeof createLightbox> | undefined;

function handleLightboxKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    closeLightbox();
  }
}

function createLightbox() {
  const overlay = document.createElement('div');
  overlay.className = 'markdown-image-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '图片全屏查看');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'markdown-image-lightbox-close';
  closeBtn.setAttribute('type', 'button');
  closeBtn.setAttribute('aria-label', '关闭');
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  const imgContainer = document.createElement('div');
  imgContainer.className = 'markdown-image-lightbox-content';

  const img = document.createElement('img');
  img.className = 'markdown-image-lightbox-img';
  img.addEventListener('load', () => {
    if (img.complete && img.naturalWidth > 0) img.classList.add('loaded');
  });

  imgContainer.appendChild(img);
  overlay.appendChild(closeBtn);
  overlay.appendChild(imgContainer);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === imgContainer) {
      closeLightbox();
    }
  });

  closeBtn.addEventListener('click', closeLightbox);
  const reset = bindLightboxGestures(imgContainer, img);
  document.body.appendChild(overlay);
  return { overlay, img, reset };
}

export function openLightbox(imgSrc: string, imgAlt: string): void {
  if (!lightbox?.overlay.isConnected) lightbox = createLightbox();
  const { overlay, img, reset } = lightbox;

  reset();
  img.classList.remove('loaded');
  img.alt = imgAlt;
  img.src = imgSrc;
  if (img.complete && img.naturalWidth > 0) img.classList.add('loaded');

  overlay.classList.add('active');
  document.body.classList.add('lightbox-open');
  document.addEventListener('keydown', handleLightboxKeydown);
  document.addEventListener('astro:before-swap', closeLightbox);
}

export function closeLightbox(): void {
  if (!lightbox) return;

  const { overlay, img, reset } = lightbox;
  overlay.classList.remove('active');
  img.removeAttribute('src');
  img.classList.remove('loaded');
  reset();
  document.body.classList.remove('lightbox-open');
  document.removeEventListener('keydown', handleLightboxKeydown);
  document.removeEventListener('astro:before-swap', closeLightbox);
}

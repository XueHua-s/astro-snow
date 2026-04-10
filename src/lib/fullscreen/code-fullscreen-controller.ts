import {
  codeFullscreenData,
  closeCodeFullscreen,
  openCodeFullscreen,
  type CodeBlockData,
} from '@store/ui';
import { copyToClipboard } from '@lib/code-block-enhancer';
import { lockBodyScroll, unlockBodyScroll } from '@lib/body-scroll-lock';

interface Elements {
  overlay: HTMLElement;
  dialog: HTMLElement;
  content: HTMLElement;
  closeBtn: HTMLElement;
  copyBtn: HTMLElement;
  copyIcon: HTMLElement;
  checkIcon: HTMLElement;
  copyText: HTMLElement;
  language: HTMLElement;
  pre: HTMLElement;
  code: HTMLElement;
}

function getElements(): Elements | null {
  const byId = (id: string) => document.getElementById(id);
  const elements = {
    overlay: byId('code-fullscreen-overlay'),
    dialog: byId('code-fullscreen-dialog'),
    content: byId('code-fullscreen-content'),
    closeBtn: byId('code-fullscreen-close'),
    copyBtn: byId('code-fullscreen-copy'),
    copyIcon: byId('code-fullscreen-copy-icon'),
    checkIcon: byId('code-fullscreen-check-icon'),
    copyText: byId('code-fullscreen-copy-text'),
    language: byId('code-fullscreen-language'),
    pre: byId('code-fullscreen-pre'),
    code: byId('code-fullscreen-code'),
  };

  if (Object.values(elements).some((el) => !el)) return null;
  return elements as Elements;
}

function applyInlineStyles(element: HTMLElement, styleString: string): void {
  if (!styleString) return;
  styleString
    .split(';')
    .filter(Boolean)
    .forEach((declaration) => {
      const colonIndex = declaration.indexOf(':');
      if (colonIndex === -1) return;
      const property = declaration.slice(0, colonIndex).trim();
      const value = declaration.slice(colonIndex + 1).trim();
      if (!property || !value) return;
      element.style.setProperty(property, value);
    });
}

export function initCodeFullscreenController() {
  const elements = getElements();
  if (!elements) return () => {};

  let currentData: CodeBlockData | null = null;
  let copyTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const open = (data: CodeBlockData) => {
    elements.language.textContent = data.language;
    elements.pre.className = `${data.preClassName} p-4`;
    elements.pre.removeAttribute('style');
    applyInlineStyles(elements.pre, data.preStyle);
    elements.code.className = data.codeClassName;
    elements.code.innerHTML = data.codeHTML;

    elements.overlay.dataset.state = 'open';
    elements.dialog.dataset.state = 'open';
    lockBodyScroll();
    requestAnimationFrame(() => {
      elements.overlay.classList.replace('opacity-0', 'opacity-100');
      elements.content.classList.replace('opacity-0', 'opacity-100');
    });
  };

  const close = () => {
    elements.overlay.classList.replace('opacity-100', 'opacity-0');
    elements.content.classList.replace('opacity-100', 'opacity-0');
    setTimeout(() => {
      elements.overlay.dataset.state = 'closed';
      elements.dialog.dataset.state = 'closed';
      unlockBodyScroll();
    }, 200);
    currentData = null;
  };

  const onCopy = async () => {
    if (!currentData) return;
    const success = await copyToClipboard(currentData.code);
    if (!success) return;

    if (copyTimeoutId) clearTimeout(copyTimeoutId);
    elements.copyIcon.classList.add('hidden');
    elements.checkIcon.classList.remove('hidden');
    elements.copyBtn.classList.add('text-primary');
    elements.copyText.textContent = '已复制';
    copyTimeoutId = setTimeout(() => {
      elements.copyIcon.classList.remove('hidden');
      elements.checkIcon.classList.add('hidden');
      elements.copyBtn.classList.remove('text-primary');
      elements.copyText.textContent = '复制';
      copyTimeoutId = null;
    }, 2000);
  };

  const unsubscribe = codeFullscreenData.subscribe((data) => {
    if (data) {
      currentData = data;
      open(data);
    } else {
      close();
    }
  });

  document.addEventListener(
    'keydown',
    (e) =>
      e.key === 'Escape' && codeFullscreenData.get() && closeCodeFullscreen(),
  );
  elements.closeBtn.addEventListener('click', () => closeCodeFullscreen());
  elements.dialog.addEventListener(
    'click',
    (e) => e.target === elements.dialog && closeCodeFullscreen(),
  );
  elements.copyBtn.addEventListener('click', () => void onCopy());

  const customEventListener = ((e: CustomEvent<CodeBlockData>) => {
    openCodeFullscreen(e.detail);
  }) as EventListener;
  window.addEventListener('open-code-fullscreen', customEventListener);

  return () => {
    if (copyTimeoutId) clearTimeout(copyTimeoutId);
    unsubscribe();
    window.removeEventListener('open-code-fullscreen', customEventListener);
  };
}

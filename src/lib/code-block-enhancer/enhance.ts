import {
  type CodeBlockInfo,
  extractCode,
  extractCodeClassName,
  extractCodeHTML,
  extractLanguage,
  extractPreClassName,
  extractPreStyle,
} from './extractors';
import { copyToClipboard, createCopyCheckmarkSvg } from './clipboard';
import { createToolbar, type ToolbarOptions } from './toolbar';

export interface EnhanceOptions {
  onCopy?: (code: string) => void;
  onFullscreen?: (info: CodeBlockInfo) => void;
  enableCopy?: boolean;
  enableFullscreen?: boolean;
  /** AbortSignal for cleaning up event listeners on re-enhancement */
  signal?: AbortSignal;
}

export function enhanceCodeBlock(
  preElement: HTMLElement,
  options: ToolbarOptions = {},
): CodeBlockInfo | null {
  if (preElement.dataset.enhanced === 'true') {
    return null;
  }

  const language = extractLanguage(preElement);
  if (language === 'mermaid') {
    return null;
  }

  const code = extractCode(preElement);
  const codeHTML = extractCodeHTML(preElement);
  const preClassName = extractPreClassName(preElement);
  const preStyle = extractPreStyle(preElement);
  const codeClassName = extractCodeClassName(preElement);

  const wrapper = document.createElement('div');
  wrapper.className = 'code-block-wrapper';

  preElement.parentNode?.insertBefore(wrapper, preElement);
  wrapper.appendChild(preElement);
  preElement.insertAdjacentHTML(
    'beforebegin',
    createToolbar(language, options),
  );

  preElement.dataset.enhanced = 'true';
  preElement.dataset.language = language;

  return {
    element: preElement,
    language,
    code,
    codeHTML,
    preClassName,
    preStyle,
    codeClassName,
  };
}

export function enhanceAllCodeBlocks(
  container: Element,
  options: EnhanceOptions = {},
): void {
  const { enableCopy = true, enableFullscreen = true, signal } = options;
  if (signal?.aborted) return;
  const codeBlocks = container.querySelectorAll('pre');

  codeBlocks.forEach((pre) => {
    const preElement = pre as HTMLElement;
    const originalLanguage = preElement.dataset.language;
    const info = enhanceCodeBlock(preElement, { enableCopy, enableFullscreen });
    if (!info) return;

    const wrapper = preElement.parentElement;
    let copyTimeout: ReturnType<typeof setTimeout> | undefined;
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(copyTimeout);
        if (wrapper && preElement.parentElement === wrapper)
          wrapper.replaceWith(preElement);
        delete preElement.dataset.enhanced;
        if (originalLanguage === undefined) delete preElement.dataset.language;
        else preElement.dataset.language = originalLanguage;
      },
      { once: true },
    );

    if (enableCopy) {
      const copyBtn = wrapper?.querySelector('.code-block-copy');
      if (copyBtn) {
        const originalSvg = copyBtn.innerHTML;
        const checkmarkSvg = createCopyCheckmarkSvg('checkmark-anim');

        const handleCopy = async () => {
          const success = await copyToClipboard(info.code);
          if (success && !signal?.aborted) {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = checkmarkSvg;
            options.onCopy?.(info.code);
            clearTimeout(copyTimeout);
            copyTimeout = setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = originalSvg;
            }, 2000);
          }
        };

        copyBtn.addEventListener(
          'click',
          () => {
            void handleCopy();
          },
          { signal },
        );
      }
    }

    if (enableFullscreen) {
      const fullscreenBtn = wrapper?.querySelector('.code-block-fullscreen');
      if (fullscreenBtn) {
        fullscreenBtn.addEventListener(
          'click',
          () => {
            options.onFullscreen?.(info);
          },
          { signal },
        );
      }
    }
  });
}

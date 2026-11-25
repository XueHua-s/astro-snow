import { copyToClipboard } from '../code-block-enhancer';

function createMermaidToolbar(): string {
  return `
    <div class="mermaid-toolbar">
      <div class="mermaid-dots">
        <span class="mermaid-dot red"></span>
        <span class="mermaid-dot yellow"></span>
        <span class="mermaid-dot green"></span>
        <span class="mermaid-language">mermaid</span>
      </div>
      <div class="mermaid-actions">
        <button type="button" class="mermaid-button mermaid-fullscreen" aria-label="Fullscreen" title="Fullscreen" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>
        <button type="button" class="mermaid-button mermaid-copy" aria-label="Copy source" title="Copy source">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 448 512" fill="currentColor">
            <path d="M192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-200.6c0-17.4-7.1-34.1-19.7-46.2L370.6 17.8C358.7 6.4 342.8 0 326.3 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-64 0 0 16-192 0 0-256 16 0 0-64-16 0z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function createCheckmarkSvg(): string {
  const id = `checkmark-mermaid-${Date.now()}`;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
      <mask id="${id}">
        <g fill="none" stroke="#fff" stroke-dasharray="24" stroke-dashoffset="24" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
          <path d="M2 13.5l4 4l10.75 -10.75"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="24;0"/></path>
          <path stroke="#000" stroke-width="6" d="M7.5 13.5l4 4l10.75 -10.75"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="24;0"/></path>
          <path d="M7.5 13.5l4 4l10.75 -10.75"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="24;0"/></path>
        </g>
      </mask>
      <rect width="24" height="24" fill="currentColor" mask="url(#${id})"/>
    </svg>`;
}

export function setMermaidFullscreenEnabled(
  pre: HTMLPreElement,
  enabled: boolean,
): void {
  const wrapper = pre.parentElement;
  if (!wrapper?.classList.contains('mermaid-wrapper')) return;

  const button = wrapper.querySelector<HTMLButtonElement>(
    '.mermaid-fullscreen',
  );
  if (button) button.disabled = !enabled;
}

export function enhanceMermaidDiagram(
  mermaidElement: HTMLPreElement,
  source: string,
): void {
  if (mermaidElement.parentElement?.classList.contains('mermaid-wrapper'))
    return;

  const wrapper = document.createElement('div');
  wrapper.className = 'mermaid-wrapper';

  mermaidElement.parentNode?.insertBefore(wrapper, mermaidElement);
  wrapper.appendChild(mermaidElement);
  mermaidElement.insertAdjacentHTML('beforebegin', createMermaidToolbar());

  const copyBtn = wrapper.querySelector('.mermaid-copy');
  if (copyBtn) {
    const originalSvg = copyBtn.innerHTML;
    const handleCopy = async () => {
      const success = await copyToClipboard(source);
      if (success) {
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = createCheckmarkSvg();
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = originalSvg;
        }, 2000);
      }
    };

    copyBtn.addEventListener('click', () => {
      void handleCopy();
    });
  }

  const fullscreenBtn = wrapper.querySelector('.mermaid-fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      const svg = mermaidElement.querySelector('svg')?.outerHTML;
      if (!svg) return;
      window.dispatchEvent(
        new CustomEvent('open-mermaid-fullscreen', {
          detail: { svg, source },
        }),
      );
    });
  }
}

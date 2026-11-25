import {
  renderMermaidDiagrams,
  type MermaidTheme,
} from './mermaid-enhancer/render';

let initialized = false;

function getTheme(): MermaidTheme {
  const theme =
    document.documentElement.dataset.theme ?? document.body.dataset.theme;
  return theme === 'dark' ? 'dark' : 'default';
}

/** Own Mermaid rendering for the initial document and every Astro navigation. */
export function initMermaidEnhancer(): void {
  if (initialized) return;
  initialized = true;

  let requestedBody: HTMLElement | undefined;
  let requestedTheme: MermaidTheme | undefined;
  let controller: AbortController | undefined;
  let swapping = false;
  let renderQueue = Promise.resolve();

  const refresh = () => {
    if (swapping) return;
    const body = document.body;
    const theme = getTheme();
    if (requestedBody === body && requestedTheme === theme) return;

    requestedBody = body;
    requestedTheme = theme;
    controller?.abort();

    const diagrams = body.querySelectorAll<HTMLPreElement>('pre.mermaid');
    if (diagrams.length === 0) return;

    controller = new AbortController();
    const { signal } = controller;
    // FIXED: Mermaid's config is global. Serialize work and discard stale results.
    renderQueue = renderQueue
      .then(() => renderMermaidDiagrams(diagrams, theme, signal))
      .catch((error: unknown) => {
        if (!signal.aborted)
          console.error('[Mermaid] Could not render diagrams:', error);
      });
  };

  const themeObserver = new MutationObserver(refresh);
  const themeOptions = { attributeFilter: ['data-theme'] };
  const startPage = () => {
    swapping = false;
    themeObserver.disconnect();
    themeObserver.observe(document.documentElement, themeOptions);
    themeObserver.observe(document.body, themeOptions);
    refresh();
  };

  document.addEventListener('astro:before-swap', () => {
    swapping = true;
    controller?.abort();
    requestedBody = undefined;
    themeObserver.disconnect();
  });
  document.addEventListener('astro:page-load', startPage);
  startPage();
}

import { enhanceMermaidDiagram, setMermaidFullscreenEnabled } from './toolbar';

export type MermaidTheme = 'default' | 'dark';
type Mermaid = typeof import('mermaid').default;

let nextId = 0;

function showSource(pre: HTMLPreElement, source: string) {
  const code = document.createElement('code');
  code.className = 'language-mermaid';
  code.textContent = source;
  pre.replaceChildren(code);
  pre.dataset.mermaidState = 'fallback';
  pre.removeAttribute('data-processed');
  setMermaidFullscreenEnabled(pre, false);
}

export async function renderMermaidDiagrams(
  diagrams: NodeListOf<HTMLPreElement>,
  theme: MermaidTheme,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return;

  const sources = Array.from(diagrams, (pre) => {
    const source = pre.dataset.diagram ?? pre.textContent ?? '';
    pre.dataset.diagram = source;
    if (!pre.closest('[data-mermaid-toolbar="off"]'))
      enhanceMermaidDiagram(pre, source);
    if (pre.dataset.mermaidState !== 'ready')
      pre.dataset.mermaidState = 'loading';
    return { pre, source };
  });

  let mermaid: Mermaid;
  try {
    ({ default: mermaid } = await import('mermaid'));
    if (signal.aborted) return;
    mermaid.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      theme,
      gitGraph: {
        mainBranchName: 'main',
        showCommitLabel: true,
        showBranches: true,
        rotateCommitLabel: true,
      },
    });
  } catch (error) {
    if (signal.aborted) return;
    console.error('[Mermaid] Could not initialize renderer:', error);
    for (const { pre, source } of sources) showSource(pre, source);
    return;
  }

  // Mermaid needs layout to measure SVG labels. Its working elements stay outside the content.
  const scratch = document.createElement('div');
  scratch.setAttribute('aria-hidden', 'true');
  scratch.style.cssText =
    'position:absolute;left:-10000px;top:0;visibility:hidden';
  document.body.append(scratch);

  try {
    for (const { pre, source } of sources) {
      if (signal.aborted) return;
      try {
        const { svg, bindFunctions } = await mermaid.render(
          `mermaid-${++nextId}`,
          source,
          scratch,
        );
        if (signal.aborted || !pre.isConnected) return;
        pre.innerHTML = svg;
        bindFunctions?.(pre);
        pre.dataset.mermaidState = 'ready';
        pre.dataset.processed = 'true';
        setMermaidFullscreenEnabled(pre, true);
      } catch (error) {
        if (signal.aborted || !pre.isConnected) return;
        console.error('[Mermaid] Could not render diagram:', error);
        showSource(pre, source);
      }
    }
  } finally {
    scratch.remove();
  }
}

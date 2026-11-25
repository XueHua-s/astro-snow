import type { Root } from 'hast';
import { visit } from 'unist-util-visit';

/** Mark Mermaid fences while retaining their escaped source as the HTML fallback. */
export function rehypeMermaid() {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'pre' || node.children.length !== 1) return;
      const [code] = node.children;
      if (code.type !== 'element' || code.tagName !== 'code') return;

      const language = code.properties.className;
      if (Array.isArray(language) && language.includes('language-mermaid')) {
        const existing = node.properties.className;
        node.properties.className = [
          ...(Array.isArray(existing) ? existing : []),
          'mermaid',
        ];
      }
    });
  };
}

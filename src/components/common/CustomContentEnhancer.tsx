import { useEffect, useRef } from 'react';
import type { ContentConfig } from '@constants/content-config';
import { enhanceAllCodeBlocks } from '@lib/code-block-enhancer';
import { enhanceImages } from '@lib/image-enhancer';

interface CustomContentEnhancerProps {
  config: ContentConfig;
}

const DATA_ENHANCED = 'data-enhanced';

function enhanceContent(
  contentContainer: Element,
  config: ContentConfig,
  signal: AbortSignal,
) {
  if (config.addBlankTarget) {
    const links = contentContainer.querySelectorAll('a[href]');
    links.forEach((link: Element) => {
      const anchor = link as HTMLAnchorElement;
      const href = anchor.getAttribute('href') || '';

      if (href.startsWith('http') || href.startsWith('//')) {
        anchor.setAttribute('target', '_blank');
      }
    });
  }

  if (config.smoothScroll) {
    const anchorLinks = contentContainer.querySelectorAll(
      'a.anchor-link[href^="#"]',
    );
    anchorLinks.forEach((link: Element) => {
      const anchor = link as HTMLAnchorElement;

      anchor.addEventListener(
        'click',
        (event) => {
          event.preventDefault();

          const targetId = anchor.getAttribute('href')?.substring(1);
          if (!targetId) return;

          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });

            history.pushState(null, '', `#${targetId}`);
          }
        },
        { signal },
      );
    });
  }

  if (config.addHeadingLevel) {
    const headings = contentContainer.querySelectorAll(
      'h1, h2, h3, h4, h5, h6',
    );
    headings.forEach((heading: Element) => {
      const level = heading.tagName[1];
      heading.setAttribute('data-level', `H${level}`);
    });
  }

  if (config.enhanceCodeBlock) {
    enhanceAllCodeBlocks(contentContainer, {
      enableCopy: config.enableCodeCopy,
      enableFullscreen: config.enableCodeFullscreen,
      signal,
      onFullscreen: (info) => {
        window.dispatchEvent(
          new CustomEvent('open-code-fullscreen', {
            detail: {
              code: info.code,
              codeHTML: info.codeHTML,
              language: info.language,
              preClassName: info.preClassName,
              preStyle: info.preStyle,
              codeClassName: info.codeClassName,
            },
          }),
        );
      },
    });
  }

  enhanceImages(contentContainer, signal);
  contentContainer.setAttribute(DATA_ENHANCED, 'true');
}

export function CustomContentEnhancer({ config }: CustomContentEnhancerProps) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = marker.current?.closest('.custom-content');
    if (!container || container.hasAttribute(DATA_ENHANCED)) return;
    const abortController = new AbortController();

    // FIXED: The Astro island owns its own content for the lifetime of this mount.
    enhanceContent(container, config, abortController.signal);

    return () => {
      abortController.abort();
      container.removeAttribute(DATA_ENHANCED);
    };
  }, [config]);

  return <span hidden ref={marker} />;
}

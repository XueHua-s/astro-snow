import { ErrorBoundary, ErrorFallback } from '@components/common';
import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const TWEET_SELECTOR = '[data-tweet-embed][data-tweet-id]:not([data-hydrated])';

/** Hydrate the tweet placeholders in this Markdown island only when needed. */
export function EmbedHydrator() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = marker.current?.closest('.custom-content');
    const placeholders =
      container?.querySelectorAll<HTMLElement>(TWEET_SELECTOR);
    if (!placeholders?.length) return;

    const roots = new Map<HTMLElement, Root>();
    let disposed = false;

    void import('./TweetEmbed')
      .then(({ TweetEmbed }) => {
        if (disposed) return;
        for (const element of placeholders) {
          const tweetId = element.dataset.tweetId;
          if (
            !tweetId ||
            !element.isConnected ||
            element.hasAttribute('data-hydrated')
          )
            continue;

          const root = createRoot(element);
          roots.set(element, root);
          element.dataset.hydrated = 'true';
          root.render(
            <ErrorBoundary
              fallbackRender={(props) => (
                <ErrorFallback {...props} title="TweetEmbed Error" />
              )}>
              <TweetEmbed tweetId={tweetId} />
            </ErrorBoundary>,
          );
        }
      })
      .catch((error: unknown) => {
        if (!disposed) console.error('[Tweet Embed] Failed to load:', error);
      });

    return () => {
      disposed = true;
      for (const [element, root] of roots) {
        delete element.dataset.hydrated;
        // React runs this cleanup while unmounting the containing island.
        queueMicrotask(() => root.unmount());
      }
    };
  }, []);

  return <span hidden ref={marker} />;
}

export default EmbedHydrator;

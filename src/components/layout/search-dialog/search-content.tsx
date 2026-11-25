import { useLayoutEffect, useRef } from 'react';
import { cn } from '@lib/utils';
import { usePagefindSearch } from './use-pagefind-search';

// Pagefind excerpts contain escaped text and <mark> highlights. Keep the
// highlight contract without injecting index-supplied HTML into the document.
function Excerpt({ text }: { text: string }) {
  const parts = text.split(/(<\/?mark>)/g);
  let marked = false;
  return parts.map((part, index) => {
    if (part === '<mark>' || part === '</mark>') {
      marked = part === '<mark>';
      return null;
    }
    const decoded = part.replace(
      /&(amp|lt|gt|quot|#39);/g,
      (entity) =>
        ({
          '&amp;': '&',
          '&lt;': '<',
          '&gt;': '>',
          '&quot;': '"',
          '&#39;': "'",
        })[entity] ?? entity,
    );
    return marked ? <mark key={index}>{decoded}</mark> : decoded;
  });
}

export function SearchContent({ isOpen }: { isOpen: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const pendingFocusRef = useRef<number | null>(null);
  const {
    term,
    results,
    total,
    status,
    error,
    showResults,
    changeTerm,
    loadMore,
  } = usePagefindSearch(isOpen, (firstNewIndex) => {
    // Continue from the focused pagination button when the final page removes it.
    if (document.activeElement === moreRef.current) {
      pendingFocusRef.current = firstNewIndex;
    }
  });

  useLayoutEffect(() => {
    const index = pendingFocusRef.current;
    pendingFocusRef.current = null;
    if (!isOpen || index === null) return;
    listRef.current
      ?.querySelectorAll<HTMLAnchorElement>('.pagefind-ui__result-link')
      .item(index)
      ?.focus({ preventScroll: true });
  }, [isOpen, results]);

  return (
    <div
      id="search-for-dialog"
      className="pagefind-ui svelte-e9gkc3"
      data-pagefind-ui>
      <form
        className="pagefind-ui__form svelte-e9gkc3"
        role="search"
        aria-label="搜索本站"
        onSubmit={(event) => event.preventDefault()}>
        <input
          ref={inputRef}
          className="pagefind-ui__search-input svelte-e9gkc3 glass-input"
          type="text"
          placeholder="请输入关键词搜索"
          aria-label="请输入关键词搜索"
          autoCapitalize="none"
          enterKeyHint="search"
          value={term}
          onChange={(event) => changeTerm(event.target.value)}
        />
        <button
          type="button"
          className={cn(
            'pagefind-ui__search-clear svelte-e9gkc3 glass-tint',
            !term && 'pagefind-ui__suppressed',
          )}
          onClick={() => {
            changeTerm('');
            inputRef.current?.focus();
          }}>
          清空
        </button>
        <div
          className={cn(
            'pagefind-ui__drawer svelte-e9gkc3',
            status === 'idle' && 'pagefind-ui__hidden',
          )}>
          <div
            className="pagefind-ui__results-area svelte-e9gkc3"
            aria-busy={status === 'loading' || status === 'loading-more'}>
            {status !== 'idle' && (
              <p
                className="pagefind-ui__message svelte-e9gkc3"
                role={status === 'error' ? 'alert' : 'status'}>
                {status === 'error'
                  ? error === 'module'
                    ? '搜索模块加载失败，请重新加载页面后重试。'
                    : '搜索索引加载失败，请检查网络并重新加载页面。'
                  : status === 'loading'
                    ? term
                      ? `搜索 ${term}...`
                      : '正在加载搜索...'
                    : total
                      ? `${total} 个结果`
                      : '没有找到结果'}
              </p>
            )}
            {status === 'error' && (
              <button
                type="button"
                id="search-reload"
                className="pagefind-ui__button svelte-e9gkc3"
                onClick={() => window.location.reload()}>
                重新加载页面
              </button>
            )}
            {showResults && (
              <>
                <ol
                  ref={listRef}
                  className="pagefind-ui__results svelte-e9gkc3">
                  {results.map((result) => (
                    <li
                      className="pagefind-ui__result svelte-j9e30"
                      key={result.id}>
                      <div className="pagefind-ui__result-inner svelte-j9e30">
                        <p className="pagefind-ui__result-title svelte-j9e30">
                          <a
                            className="pagefind-ui__result-link svelte-j9e30"
                            href={result.url}>
                            {result.title}
                          </a>
                        </p>
                        <p className="pagefind-ui__result-excerpt svelte-j9e30">
                          <Excerpt text={result.excerpt} />
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                {total > results.length && (
                  <button
                    ref={moreRef}
                    type="button"
                    className="pagefind-ui__button svelte-e9gkc3"
                    aria-disabled={status === 'loading-more'}
                    aria-busy={status === 'loading-more'}
                    onClick={loadMore}>
                    加载更多结果
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

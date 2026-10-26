import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@lib/utils';
import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
} from './pagefind-types';

// Retain the installed default-ui stylesheet scopes and public class/ID contract.
const PAGE_SIZE = 5;
const SEARCH_TIMEOUT_MS = 15000;
const QUERY_DEBOUNCE_MS = 300;

type SearchEngine = { worker: Worker; id: number };

function getBundlePath() {
  const base = import.meta.env.BASE_URL;
  return new URL(`${base.replace(/\/?$/, '/')}pagefind/`, location.origin).href;
}

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
  const [term, setTerm] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [resultQuery, setResultQuery] = useState('');
  const query = term.trim();
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'loading-more' | 'ready' | 'error'
  >('idle');
  const [error, setError] = useState<'module' | 'index'>('module');
  const workerRef = useRef<SearchEngine | null>(null);
  const requestRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const pendingFocusRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const index = pendingFocusRef.current;
    if (index === null) return;
    pendingFocusRef.current = null;
    listRef.current
      ?.querySelectorAll<HTMLAnchorElement>('.pagefind-ui__result-link')
      .item(index)
      ?.focus({ preventScroll: true });
  }, [results]);

  useEffect(() => {
    return () => {
      // FIXED: Cancel the old query immediately, before the new debounce fires.
      // Each query has a fresh engine; pagination alone keeps its cached index.
      workerRef.current?.worker.terminate();
      workerRef.current = null;
      pendingFocusRef.current = null;
    };
  }, [isOpen, query]);

  useEffect(() => {
    if (!isOpen || status === 'error') return;
    if (!query) {
      setResults([]);
      setTotal(0);
      setResultQuery('');
      setStatus('idle');
      return;
    }
    let engine: SearchEngine | null = null;
    let timeout: ReturnType<typeof setTimeout>;
    let onMessage: ((event: MessageEvent<SearchResponse>) => void) | undefined;
    let onError: (() => void) | undefined;
    const incremental = resultQuery === query && results.length > 0;
    setStatus(incremental ? 'loading-more' : 'loading');
    const debounce = setTimeout(
      () => {
        const fail = (kind: 'module' | 'index') => {
          if (!engine || workerRef.current !== engine) return;
          clearTimeout(timeout);
          setError(kind);
          setStatus('error');
          engine.worker.terminate();
        };
        try {
          // Construction/import are debounced too, not just the search message.
          workerRef.current ??= {
            worker: new Worker(
              new URL('./pagefind.worker.ts', import.meta.url),
              {
                type: 'module',
              },
            ),
            id: ++requestRef.current,
          };
          engine = workerRef.current;
        } catch {
          setError('module');
          setStatus('error');
          return;
        }
        const { worker, id } = engine;
        onMessage = ({ data }) => {
          if (data.id !== id || workerRef.current !== engine) return;
          clearTimeout(timeout);
          if ('error' in data) return fail(data.error);
          // When the final page removes its focused button, continue at the first
          // newly added link without moving the reader's scroll position.
          if (
            incremental &&
            data.results.length >= data.total &&
            document.activeElement === moreRef.current
          ) {
            pendingFocusRef.current = results.length;
          }
          setResults(data.results);
          setTotal(data.total);
          setResultQuery(query);
          setStatus('ready');
        };
        onError = () => fail('module');
        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError);
        const request: SearchRequest = {
          id,
          term: query,
          limit,
          bundlePath: getBundlePath(),
          language: document.documentElement.lang || 'en',
        };
        worker.postMessage(request);
        timeout = setTimeout(() => fail('index'), SEARCH_TIMEOUT_MS);
      },
      workerRef.current ? 0 : QUERY_DEBOUNCE_MS,
    );
    return () => {
      clearTimeout(debounce);
      clearTimeout(timeout);
      if (onMessage) engine?.worker.removeEventListener('message', onMessage);
      if (onError) engine?.worker.removeEventListener('error', onError);
    };
    // Result/status updates are outputs, not reasons to repeat a request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, query, limit]);

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
          className="pagefind-ui__search-input svelte-e9gkc3"
          type="text"
          placeholder="请输入关键词搜索"
          aria-label="请输入关键词搜索"
          autoCapitalize="none"
          enterKeyHint="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            if (event.target.value.trim() !== query) setLimit(PAGE_SIZE);
          }}
        />
        <button
          type="button"
          className={cn(
            'pagefind-ui__search-clear svelte-e9gkc3',
            !term && 'pagefind-ui__suppressed',
          )}
          onClick={() => {
            setTerm('');
            setLimit(PAGE_SIZE);
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
            {resultQuery === query &&
              (status === 'ready' || status === 'loading-more') && (
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
                      onClick={() => {
                        if (status === 'ready')
                          setLimit((value) => value + PAGE_SIZE);
                      }}>
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

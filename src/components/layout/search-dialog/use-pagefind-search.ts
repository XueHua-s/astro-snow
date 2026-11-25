import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
} from './pagefind-types';

const PAGE_SIZE = 5;
const SEARCH_TIMEOUT_MS = 15000;
const QUERY_DEBOUNCE_MS = 300;

type SearchStatus = 'idle' | 'loading' | 'loading-more' | 'ready';
type SearchError = 'module' | 'index';
type SearchEngine = { worker: Worker; id: number };

interface SearchPage {
  query: string;
  results: SearchResult[];
  total: number;
}

const EMPTY_PAGE: SearchPage = { query: '', results: [], total: 0 };

function getBundlePath() {
  const base = import.meta.env.BASE_URL;
  return new URL(`${base.replace(/\/?$/, '/')}pagefind/`, location.origin).href;
}

export function usePagefindSearch(
  isOpen: boolean,
  onFinalPage: (firstNewIndex: number) => void,
) {
  const [term, setTerm] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [page, setPage] = useState(EMPTY_PAGE);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<SearchError | null>(null);
  const query = term.trim();
  const engineRef = useRef<SearchEngine | null>(null);
  const requestRef = useRef(0);
  const loadedCount = useEffectEvent((query: string) =>
    page.query === query ? page.results.length : 0,
  );
  const completePage = useEffectEvent(onFinalPage);

  useEffect(() => {
    return () => {
      // FIXED: Retire the query's engine before the next debounce starts.
      // Loading more alone keeps the worker and its Pagefind cache alive.
      engineRef.current?.worker.terminate();
      engineRef.current = null;
    };
  }, [isOpen, query]);

  useEffect(() => {
    if (!isOpen || error) return;
    if (!query) {
      setPage(EMPTY_PAGE);
      setStatus('idle');
      return;
    }

    let engine: SearchEngine | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let onMessage: ((event: MessageEvent<SearchResponse>) => void) | undefined;
    let onError: (() => void) | undefined;
    const previousCount = loadedCount(query);
    setStatus(previousCount ? 'loading-more' : 'loading');

    const debounce = setTimeout(
      () => {
        const fail = (kind: SearchError) => {
          if (!engine || engineRef.current !== engine) return;
          clearTimeout(timeout);
          engineRef.current = null;
          engine.worker.terminate();
          setError(kind);
        };

        try {
          engineRef.current ??= {
            worker: new Worker(
              new URL('./pagefind.worker.ts', import.meta.url),
              {
                type: 'module',
              },
            ),
            id: ++requestRef.current,
          };
          engine = engineRef.current;
        } catch {
          setError('module');
          return;
        }

        const { worker, id } = engine;
        onMessage = ({ data }) => {
          if (data.id !== id || engineRef.current !== engine) return;
          clearTimeout(timeout);
          if ('error' in data) return fail(data.error);
          if (previousCount > 0 && data.results.length >= data.total) {
            completePage(previousCount);
          }
          setPage({ query, results: data.results, total: data.total });
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
        try {
          worker.postMessage(request);
          timeout = setTimeout(() => fail('index'), SEARCH_TIMEOUT_MS);
        } catch {
          fail('module');
        }
      },
      engineRef.current ? 0 : QUERY_DEBOUNCE_MS,
    );

    return () => {
      clearTimeout(debounce);
      clearTimeout(timeout);
      if (onMessage) engine?.worker.removeEventListener('message', onMessage);
      if (onError) engine?.worker.removeEventListener('error', onError);
    };
  }, [isOpen, query, limit, error]);

  return {
    term,
    results: page.results,
    total: page.total,
    status: error ? ('error' as const) : status,
    error,
    showResults:
      !error &&
      page.query === query &&
      (status === 'ready' || status === 'loading-more'),
    changeTerm: (nextTerm: string) => {
      setTerm(nextTerm);
      if (nextTerm.trim() !== query) setLimit(PAGE_SIZE);
    },
    loadMore: () => {
      if (status === 'ready' && page.total > page.results.length) {
        setLimit((value) => value + PAGE_SIZE);
      }
    },
  };
}

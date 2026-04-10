import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { openSearch, searchOpen } from '@store/ui';
import '@pagefind/default-ui/css/ui.css';

type PagefindUiOptions = {
  showImages?: boolean;
  resetStyles?: boolean;
  translations?: Record<string, string>;
};

type PagefindUiModule = {
  PagefindUI: new (
    options: PagefindUiOptions & { element: HTMLElement; bundlePath: string },
  ) => unknown;
};

const getBundlePath = () => {
  const baseUrl = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}pagefind/`;
};

export default function SearchWithDialog() {
  const searchRootRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  const uiOptions = useMemo(
    () => ({
      showImages: false,
      resetStyles: false,
      translations: {
        placeholder: '请输入关键词搜索',
        clear_search: '清空',
        load_more: '加载更多结果',
        search_label: '搜索本站',
        filters_label: '过滤项',
        zero_results: '没有找到结果',
        many_results: '[COUNT] 个结果',
        one_result: '[COUNT] 个结果',
        alt_search: '没有找到结果。显示 [DIFFERENT_TERM] 的结果',
        search_suggestion: '没有找到结果。尝试以下搜索：',
        searching: '搜索 [SEARCH_TERM]...',
      },
    }),
    [],
  );

  const initPagefind = useCallback(async () => {
    if (initializedRef.current || !searchRootRef.current) return;

    if (searchRootRef.current.querySelector('.pagefind-ui__search-input')) {
      initializedRef.current = true;
      return;
    }

    const module =
      (await import('@pagefind/default-ui')) as unknown as PagefindUiModule;
    const { PagefindUI } = module;
    new PagefindUI({
      element: searchRootRef.current,
      bundlePath: getBundlePath(),
      ...uiOptions,
    });
    initializedRef.current = true;
  }, [uiOptions]);

  const moveSearchToDialog = useCallback(() => {
    const dialogContainer = document.getElementById('search-dialog-container');
    const searchComponent = searchRootRef.current;
    if (!dialogContainer || !searchComponent) return;
    if (dialogContainer.contains(searchComponent)) return;
    dialogContainer.appendChild(searchComponent);
  }, []);

  const moveSearchBack = useCallback(() => {
    const searchPortal = document.getElementById('search-component-portal');
    const searchComponent = searchRootRef.current;
    if (!searchPortal || !searchComponent) return;
    if (!searchPortal.contains(searchComponent)) {
      searchPortal.appendChild(searchComponent);
    }
  }, []);

  // FIXED: Subscribe to store directly instead of relying on custom events
  const isSearchOpen = useStore(searchOpen);

  useEffect(() => {
    if (isSearchOpen) {
      void initPagefind().then(() => {
        requestAnimationFrame(() => {
          moveSearchToDialog();
        });
      });
    } else {
      moveSearchBack();
    }
  }, [isSearchOpen, initPagefind, moveSearchToDialog, moveSearchBack]);

  useEffect(() => {
    const handleAstroPageLoad = () => {
      if (!initializedRef.current) return;
      void initPagefind();
    };

    document.addEventListener('astro:page-load', handleAstroPageLoad);
    return () => {
      document.removeEventListener('astro:page-load', handleAstroPageLoad);
    };
  }, [initPagefind]);

  return (
    <>
      <button
        id="search-trigger"
        className="group cursor-pointer transition duration-300 hover:scale-125"
        aria-label="搜索"
        title="搜索 (⌘K)"
        suppressHydrationWarning
        onClick={openSearch}>
        <i
          className="fa-solid fa-magnifying-glass text-2xl"
          aria-hidden="true"></i>
      </button>

      <div
        id="search-component-portal"
        style={{
          display: 'none',
          position: 'absolute',
          pointerEvents: 'none',
          visibility: 'hidden',
        }}>
        <div
          id="search-for-dialog"
          ref={searchRootRef}
          className="pagefind-ui"
          data-pagefind-ui
        />
      </div>

      <style>{`
        .scroll-feather-mask {
          container-type: scroll-state;
        }
        @container scroll-state(scrollable: bottom) {
          .scroll-feather-mask::before {
            content: '';
            background: linear-gradient(
              to bottom,
              transparent 0%,
              var(--gradient-bg-start) var(--scroll-mask-middle, 70%),
              var(--gradient-bg-start) var(--scroll-mask-end, 100%)
            );
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10;
            display: block;
            height: var(--scroll-mask-height, 5rem);
          }
        }
      `}</style>
    </>
  );
}

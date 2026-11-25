import { useEffect, useRef, type MouseEvent } from 'react';
import { cn } from '@lib/utils';
import { SearchContent } from './search-content';

interface SearchDialogPanelViewProps {
  state: 'open' | 'closed';
  isOpen: boolean;
  active: boolean;
  onDialogBackgroundClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onDialogClose: () => void;
}

export function SearchDialogPanelView({
  state,
  isOpen,
  active,
  onDialogBackgroundClick,
  onDialogClose,
}: SearchDialogPanelViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // FIXED: toggle the fade mask on the scroll viewport itself, since the
  // mask was previously applied to the content-sized inner container where
  // the fade band scrolled away with the content.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || state === 'closed') return;

    const update = () => {
      const hasOverflow = scroller.scrollHeight > scroller.clientHeight + 4;
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      scroller.classList.toggle(
        'scroll-feather-active',
        hasOverflow && !atBottom,
      );
    };

    update();
    scroller.addEventListener('scroll', update, { passive: true });

    // Pagefind replaces the results container contents, so its height changes
    // without a window resize; observe both the viewport and the content.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scroller);
    const container = document.getElementById('search-dialog-container');
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      scroller.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
  }, [state]);

  const overlayClassName = cn(
    'fixed inset-0 z-40 bg-black/40 glass-scrim transition-opacity duration-200 motion-reduce:transition-none',
    active ? 'opacity-100' : 'opacity-0',
    state === 'closed' && 'hidden',
  );

  const dialogClassName = cn(
    'fixed inset-0 z-50 grid items-start justify-items-center px-4 pt-[min(11dvh,6rem)]',
    state === 'closed' && 'hidden',
  );

  const contentClassName = cn(
    'glass glass-overlay w-full max-w-2xl overflow-hidden transition-opacity duration-200 motion-reduce:transition-none',
    active ? 'opacity-100' : 'opacity-0',
  );

  return (
    <>
      <button
        id="search-overlay"
        type="button"
        data-state={state}
        className={overlayClassName}
        aria-label="关闭搜索"
        onClick={onDialogBackgroundClick}
      />
      <div
        id="search-dialog"
        data-state={state}
        className={dialogClassName}
        role="dialog"
        aria-labelledby="search-dialog-title"
        aria-modal="true">
        <div id="search-dialog-content" className={contentClassName}>
          <div className="p-5 md:p-3">
            <div className="search-dialog">
              <div className="relative mb-4 flex items-center justify-between">
                <h2
                  id="search-dialog-title"
                  className="flex items-center gap-2 text-lg font-semibold md:text-base">
                  <i
                    className="fa-solid fa-magnifying-glass text-base md:text-sm"
                    aria-hidden="true"
                  />
                  搜索文章
                </h2>
                <button
                  id="search-dialog-close"
                  className="glass-tint flex size-8 items-center justify-center rounded-full transition-colors duration-300 hover:bg-[hsl(var(--glass-surface-hsl)/0.14)] md:size-7"
                  aria-label="关闭搜索"
                  onClick={onDialogClose}>
                  <i
                    className="fa-solid fa-xmark text-base md:text-sm"
                    aria-hidden="true"
                  />
                </button>
              </div>
              <div
                ref={scrollRef}
                className="vertical-scrollbar scroll-feather-mask -mx-5 max-h-[max(3rem,calc(86dvh-8rem))] overflow-auto px-5 py-1 md:-mx-3 md:px-3">
                <div id="search-dialog-container">
                  <SearchContent isOpen={isOpen} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 border-t border-[var(--glass-border)] pt-3 text-xs text-muted-foreground">
              <span>
                <kbd className="glass-tint rounded px-1.5 py-0.5 font-mono text-[0.7rem]">
                  ↑↓
                </kbd>{' '}
                选择
              </span>
              <span>
                <kbd className="glass-tint rounded px-1.5 py-0.5 font-mono text-[0.7rem]">
                  Enter
                </kbd>{' '}
                打开
              </span>
              <span>
                <kbd className="glass-tint rounded px-1.5 py-0.5 font-mono text-[0.7rem]">
                  ESC
                </kbd>{' '}
                关闭
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

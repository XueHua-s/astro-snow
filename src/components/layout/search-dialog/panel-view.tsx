import type { MouseEvent } from 'react';

interface SearchDialogPanelViewProps {
  state: 'open' | 'closed';
  overlayClassName: string;
  dialogClassName: string;
  contentClassName: string;
  onDialogBackgroundClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onDialogClose: () => void;
}

export function SearchDialogPanelView({
  state,
  overlayClassName,
  dialogClassName,
  contentClassName,
  onDialogBackgroundClick,
  onDialogClose,
}: SearchDialogPanelViewProps) {
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
        aria-label="搜索文章"
        aria-modal="true">
        <div id="search-dialog-content" className={contentClassName}>
          <div className="relative p-6 md:p-3">
            <div className="search-dialog">
              <div className="relative mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold md:text-base">
                  <i
                    className="fa-solid fa-magnifying-glass text-base md:text-sm"
                    aria-hidden="true"
                  />
                  搜索文章
                </h2>
                <button
                  id="search-dialog-close"
                  className="flex size-8 items-center justify-center rounded-full bg-[hsl(var(--glass-tint-hsl)/0.18)] transition-colors duration-300 hover:bg-[hsl(var(--glass-tint-hsl)/0.32)] md:size-7"
                  aria-label="关闭搜索"
                  onClick={onDialogClose}>
                  <i
                    className="fa-solid fa-xmark text-base md:text-sm"
                    aria-hidden="true"
                  />
                </button>
              </div>
              <div
                id="search-empty-hint"
                className="search-empty-hint absolute inset-x-0 top-32 text-center text-sm opacity-60 md:top-28">
                <p>输入关键词搜索博客文章</p>
                <p className="mt-1 text-xs">
                  按{' '}
                  <kbd className="rounded bg-[hsl(var(--glass-tint-hsl)/0.18)] px-1.5 py-0.5 font-mono">
                    ESC
                  </kbd>{' '}
                  关闭
                </p>
              </div>
              <div className="vertical-scrollbar scroll-feather-mask -mx-6 h-[calc(80dvh-140px)] overflow-auto scroll-smooth px-6 pb-10 md:-mx-3 md:h-[calc(80dvh-120px)] md:px-3">
                <div id="search-dialog-container" />
              </div>
            </div>
            <div className="bg-background/2 absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-4 px-4 pt-2 pb-4 text-xs text-black/50 dark:border-white/10 dark:text-white/50">
              <span>
                <kbd className="kbd">↑↓</kbd> 选择
              </span>
              <span>
                <kbd className="kbd">Enter</kbd> 打开
              </span>
              <span>
                <kbd className="kbd">ESC</kbd> 关闭
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

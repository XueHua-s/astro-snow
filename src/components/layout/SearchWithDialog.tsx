import { useStore } from '@nanostores/react';
import { openSearch, searchOpen } from '@store/ui';
import '@pagefind/default-ui/css/ui.css';

export default function SearchWithDialog() {
  const isSearchOpen = useStore(searchOpen);

  // FIXED: The hydrated dialog owns search content; the header never mutates
  // another island's server-rendered DOM while it is waiting to hydrate.
  return (
    <>
      <button
        id="search-trigger"
        className="header-icon-button"
        aria-label="搜索"
        aria-controls="search-dialog"
        aria-haspopup="dialog"
        aria-expanded={isSearchOpen}
        title="搜索 (⌘K)"
        data-tooltip-interactive="false"
        suppressHydrationWarning
        onClick={openSearch}>
        <i
          className="fa-solid fa-magnifying-glass text-xl"
          aria-hidden="true"></i>
      </button>
      <style>{`
        .scroll-feather-mask.scroll-feather-active {
          mask-image: linear-gradient(
            to bottom,
            #000 calc(100% - var(--scroll-mask-height, 5rem)),
            transparent
          );
          -webkit-mask-image: linear-gradient(
            to bottom,
            #000 calc(100% - var(--scroll-mask-height, 5rem)),
            transparent
          );
        }
      `}</style>
    </>
  );
}

import { useCallback, useState } from 'react';
import { getSelectableItems } from './selectable-items';

export function useSearchSelection() {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const clearSelectionDom = useCallback(() => {
    const items = getSelectableItems();
    if (selectedIndex >= 0 && selectedIndex < items.length) {
      items[selectedIndex]?.removeAttribute('data-selected');
    }
  }, [selectedIndex]);

  const clearSelection = useCallback(() => {
    clearSelectionDom();
    setSelectedIndex(-1);
  }, [clearSelectionDom]);

  const selectResult = useCallback(
    (index: number) => {
      const items = getSelectableItems();
      if (items.length === 0) {
        setSelectedIndex(-1);
        return;
      }

      const newIndex = Math.max(-1, Math.min(index, items.length - 1));

      if (selectedIndex >= 0 && selectedIndex < items.length) {
        items[selectedIndex]?.removeAttribute('data-selected');
      }

      setSelectedIndex(newIndex);

      if (newIndex >= 0) {
        items[newIndex]?.setAttribute('data-selected', 'true');
        items[newIndex]?.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
        return;
      }

      const searchInput = document.querySelector<HTMLInputElement>(
        '.pagefind-ui__search-input',
      );
      searchInput?.focus();
    },
    [selectedIndex],
  );

  const navigateToSelected = useCallback(() => {
    const items = getSelectableItems();
    if (selectedIndex < 0 || selectedIndex >= items.length) return;

    const selectedItem = items[selectedIndex];
    if (selectedItem.classList.contains('pagefind-ui__button')) {
      selectedItem.click();
      setSelectedIndex(-1);
      return;
    }

    const link = selectedItem.querySelector<HTMLAnchorElement>(
      '.pagefind-ui__result-link',
    );
    // Dispatch the same link action as a pointer click so Astro owns navigation.
    link?.click();
  }, [selectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
    clearSelection,
    clearSelectionDom,
    selectResult,
    navigateToSelected,
  };
}

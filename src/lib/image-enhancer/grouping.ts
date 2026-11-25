function isConsecutiveSibling(el1: Element, el2: Element): boolean {
  let next = el1.nextSibling;
  while (next) {
    if (next.nodeType === Node.TEXT_NODE && next.textContent?.trim() === '') {
      next = next.nextSibling;
      continue;
    }
    return next === el2;
  }
  return false;
}

export function groupPortraitImages(container: Element): () => void {
  const allWrappers = Array.from(
    container.querySelectorAll('.markdown-image-wrapper'),
  );

  let currentGroup: Element[] = [];
  const rows: HTMLDivElement[] = [];

  const flushGroup = () => {
    if (currentGroup.length >= 2) {
      const row = document.createElement('div');
      row.className = 'markdown-image-row';
      currentGroup[0].parentNode?.insertBefore(row, currentGroup[0]);

      const fragment = document.createDocumentFragment();
      currentGroup.forEach((wrapper) => {
        fragment.appendChild(wrapper);
      });
      row.appendChild(fragment);
      rows.push(row);
    }
    currentGroup = [];
  };

  allWrappers.forEach((wrapper, index) => {
    const isPortrait = wrapper.classList.contains('portrait');
    if (wrapper.parentElement?.classList.contains('markdown-image-row')) return;

    if (!isPortrait) {
      flushGroup();
      return;
    }

    const prevWrapper = allWrappers[index - 1];
    if (
      currentGroup.length > 0 &&
      prevWrapper &&
      prevWrapper.classList.contains('portrait') &&
      isConsecutiveSibling(prevWrapper, wrapper)
    ) {
      currentGroup.push(wrapper);
      return;
    }

    flushGroup();
    currentGroup = [wrapper];
  });

  flushGroup();

  return () => {
    for (const row of rows) row.replaceWith(...row.childNodes);
  };
}

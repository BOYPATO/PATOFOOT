/**
 * Global Horizontal Scroll Enhancer (PC, Web & Mobile App)
 *
 * Ensures every horizontally scrollable strip, table, bracket, and calendar grid
 * across all tabs can be scrolled effortlessly left & right:
 * - Touch / trackpad: native smooth pan-x + pan-y scrolling
 * - PC Mouse Wheel:
 *     - Shift + Wheel scrolls any horizontal container left/right
 *     - Plain Wheel over single-axis horizontal strips (tab bars, league bars,
 *       filter ribbons) scrolls left/right without blocking vertical page scroll
 *       over tall tables
 * - PC Click-and-Drag Panning: drag left/right anywhere inside a wide table or
 *   strip (6px movement threshold so clicks on buttons/rows/links work normally)
 */

const INTERACTIVE_EXCLUDE_SELECTOR =
  'input, textarea, select, option, [contenteditable="true"], [draggable="true"], [data-no-drag-scroll]';

let installed = false;

function isHorizontallyScrollable(el: HTMLElement): boolean {
  if (el.scrollWidth <= el.clientWidth + 2) return false;
  const style = window.getComputedStyle(el);
  const ox = style.overflowX;
  return ox === 'auto' || ox === 'scroll';
}

function isHorizontalOnlyStrip(el: HTMLElement): boolean {
  if (!isHorizontallyScrollable(el)) return false;
  const style = window.getComputedStyle(el);
  const oy = style.overflowY;
  const scrollsVertically =
    (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 4;
  return !scrollsVertically;
}

function findHorizontalScrollContainer(
  startEl: EventTarget | null,
  requireHorizontalOnly: boolean
): HTMLElement | null {
  let node = startEl instanceof HTMLElement ? startEl : null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (requireHorizontalOnly ? isHorizontalOnlyStrip(node) : isHorizontallyScrollable(node)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function installHorizontalScrollEnhancer(): void {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  installed = true;

  // 1. Wheel-to-horizontal scroll (Shift+Wheel on any wide area, plain Wheel on horizontal-only tab strips)
  window.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      // Ignore pinch-zoom gestures or events that already carry strong horizontal delta
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.deltaY === 0) return;

      const container = findHorizontalScrollContainer(e.target, !e.shiftKey);
      if (!container) return;

      const atLeftEdge = container.scrollLeft <= 0;
      const atRightEdge =
        Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth - 1;

      if ((e.deltaY < 0 && atLeftEdge) || (e.deltaY > 0 && atRightEdge)) {
        // Release wheel back to normal page vertical scrolling at edges
        return;
      }

      e.preventDefault();
      container.scrollLeft += e.deltaY;
    },
    { passive: false }
  );

  // 2. Desktop Mouse Drag-to-Pan on any horizontally scrollable table or strip
  let dragContainer: HTMLElement | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartScrollLeft = 0;
  let isDragging = false;
  let suppressNextClick = false;

  const endDrag = () => {
    if (dragContainer) {
      dragContainer.classList.remove('patofoot-drag-scrolling');
    }
    if (isDragging) {
      suppressNextClick = true;
      window.setTimeout(() => {
        suppressNextClick = false;
      }, 60);
    }
    dragContainer = null;
    isDragging = false;
  };

  window.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target instanceof HTMLElement ? e.target : null;
    if (!target) return;
    if (target.closest(INTERACTIVE_EXCLUDE_SELECTOR)) return;

    const container = findHorizontalScrollContainer(target, false);
    if (!container) return;
    // Skip strips that already implement their own mouse-drag handler
    if (container.classList.contains('horizontal-league-scroll')) return;

    dragContainer = container;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartScrollLeft = container.scrollLeft;
    isDragging = false;
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!dragContainer) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (!isDragging) {
      // Cancel drag if user clearly intended vertical gesture / text selection
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        dragContainer = null;
        return;
      }
      if (Math.abs(dx) < 6) return;
      isDragging = true;
      dragContainer.classList.add('patofoot-drag-scrolling');
    }

    e.preventDefault();
    dragContainer.scrollLeft = dragStartScrollLeft - dx;
  });

  window.addEventListener('mouseup', endDrag);
  window.addEventListener('blur', endDrag);

  window.addEventListener(
    'click',
    (e: MouseEvent) => {
      if (suppressNextClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressNextClick = false;
      }
    },
    true
  );
}

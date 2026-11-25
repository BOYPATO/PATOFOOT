import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { soundEngine } from '../services/soundEngine';

interface ScrollableTabStripProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  /** Optional active key — triggers auto-centering when changed */
  activeKey?: string;
  scrollStep?: number;
  ariaLabel?: string;
}

/**
 * Reusable horizontal scrollable strip for tabs, filters, and competition ribbons.
 * Works seamlessly across Mobile App (PWA), Mobile Web, and PC:
 * - Touch swipe left/right + native smooth scrolling
 * - Automatic Left/Right chevron buttons when content overflows
 * - PC Mouse wheel & click-drag panning via global enhancer
 * - Auto-centers active tab item when selected
 */
export const ScrollableTabStrip: React.FC<ScrollableTabStripProps> = ({
  children,
  className = '',
  innerClassName = 'flex items-center gap-1.5',
  activeKey,
  scrollStep = 240,
  ariaLabel = 'Abas roláveis',
}) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateScrollState();
    const rafId = window.requestAnimationFrame(updateScrollState);

    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateScrollState);
      ro.observe(el);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollState);
      ro?.disconnect();
    };
  }, [updateScrollState, children]);

  // Smoothly scroll the active tab button into view when activeKey changes
  useEffect(() => {
    if (!activeKey) return;
    const el = scrollerRef.current;
    if (!el) return;
    const activeEl = el.querySelector<HTMLElement>('[data-tab-active="true"], [aria-current="page"]');
    if (!activeEl) return;
    const elRect = el.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();
    const isOutOfView = itemRect.left < elRect.left + 8 || itemRect.right > elRect.right - 8;
    if (isOutOfView) {
      const targetLeft =
        activeEl.offsetLeft - el.clientWidth / 2 + activeEl.clientWidth / 2;
      el.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }, [activeKey]);

  const handleScrollBy = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    soundEngine.playClick();
    el.scrollBy({ left: direction * scrollStep, behavior: 'smooth' });
  };

  return (
    <div
      className={`relative flex items-center gap-1 min-w-0 max-w-full ${className}`}
      role="region"
      aria-label={ariaLabel}
    >
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScrollBy(-1)}
          title="Rolar para a esquerda"
          aria-label="Rolar abas para a esquerda"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900/95 hover:bg-slate-800 border border-slate-700/90 text-sky-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-md"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <div
        ref={scrollerRef}
        className={`flex-1 min-w-0 max-w-full overflow-x-auto pb-1.5 pt-0.5 ${innerClassName}`}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScrollBy(1)}
          title="Rolar para a direita"
          aria-label="Rolar abas para a direita"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900/95 hover:bg-slate-800 border border-slate-700/90 text-sky-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-md"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

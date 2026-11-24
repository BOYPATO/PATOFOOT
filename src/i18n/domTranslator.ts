import { GameLanguage } from '../utils/settingsEngine';
import { translateText } from './translations';

const originalTextNodes = new WeakMap<Text, string>();
const originalAttrValues = new WeakMap<Element, Record<string, string>>();
const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'] as const;

let activeObserver: MutationObserver | null = null;
let currentAppliedLang: GameLanguage = 'pt-BR';
let pendingRafId: number | null = null;
const pendingRoots = new Set<Node>();

function isIgnoredElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (
    tag === 'SCRIPT' ||
    tag === 'STYLE' ||
    tag === 'NOSCRIPT' ||
    tag === 'TEXTAREA' ||
    tag === 'CANVAS' ||
    tag === 'CODE'
  ) {
    return true;
  }
  return Boolean(el.closest('[data-no-i18n="true"]'));
}

function processTextNode(node: Text, lang: GameLanguage): void {
  const parent = node.parentElement;
  if (!parent || isIgnoredElement(parent)) return;

  const currentVal = node.nodeValue || '';
  if (!currentVal.trim()) return;

  if (!originalTextNodes.has(node)) {
    originalTextNodes.set(node, currentVal);
  }
  const sourcePt = originalTextNodes.get(node) || currentVal;

  if (lang === 'pt-BR') {
    if (node.nodeValue !== sourcePt) {
      node.nodeValue = sourcePt;
    }
    return;
  }

  const translated = translateText(sourcePt, lang);
  if (translated !== node.nodeValue) {
    node.nodeValue = translated;
  }
}

function processElementAttributes(el: Element, lang: GameLanguage): void {
  if (isIgnoredElement(el)) return;

  for (const attr of TRANSLATABLE_ATTRS) {
    const val = el.getAttribute(attr);
    if (!val || !val.trim()) continue;

    let saved = originalAttrValues.get(el);
    if (!saved) {
      saved = {};
      originalAttrValues.set(el, saved);
    }
    if (!(attr in saved)) {
      saved[attr] = val;
    }
    const sourcePt = saved[attr];

    if (lang === 'pt-BR') {
      if (val !== sourcePt) {
        el.setAttribute(attr, sourcePt);
      }
      continue;
    }

    const translated = translateText(sourcePt, lang);
    if (translated !== val) {
      el.setAttribute(attr, translated);
    }
  }
}

function walkAndTranslate(root: Node, lang: GameLanguage): void {
  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root as Text, lang);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const rootEl = root as Element;
  if (isIgnoredElement(rootEl)) return;

  processElementAttributes(rootEl, lang);

  const walker = document.createTreeWalker(
    rootEl,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      processTextNode(current as Text, lang);
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      processElementAttributes(current as Element, lang);
    }
    current = walker.nextNode();
  }
}

function flushPendingTranslations(): void {
  pendingRafId = null;
  if (currentAppliedLang === 'pt-BR') {
    pendingRoots.clear();
    return;
  }
  const nodes = Array.from(pendingRoots);
  pendingRoots.clear();
  for (const n of nodes) {
    if (document.contains(n)) {
      walkAndTranslate(n, currentAppliedLang);
    }
  }
}

/**
 * Applies the selected language seamlessly across the rendered DOM tree,
 * preserving lossless Portuguese originals so switching between any languages is instant.
 */
export function applyDomLanguage(lang: GameLanguage): void {
  if (typeof document === 'undefined') return;

  currentAppliedLang = lang;
  document.documentElement.lang = lang;

  const root = document.getElementById('root') || document.body;
  if (!root) return;

  // Pause observer while applying pass to avoid self-trigger loops
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
  if (pendingRafId !== null) {
    cancelAnimationFrame(pendingRafId);
    pendingRafId = null;
  }
  pendingRoots.clear();

  walkAndTranslate(root, lang);

  // Only keep MutationObserver active when a non-Portuguese language is selected
  if (lang !== 'pt-BR') {
    activeObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((node) => pendingRoots.add(node));
        } else if (m.type === 'characterData' && m.target) {
          // If React updated text dynamically with new PT content, update its source cache
          const tNode = m.target as Text;
          const val = tNode.nodeValue || '';
          if (val && translateText(val, currentAppliedLang) !== val) {
            originalTextNodes.set(tNode, val);
            pendingRoots.add(tNode);
          }
        }
      }
      if (pendingRoots.size > 0 && pendingRafId === null) {
        pendingRafId = requestAnimationFrame(flushPendingTranslations);
      }
    });

    activeObserver.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}

export function stopDomLanguageObserver(): void {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
  if (pendingRafId !== null) {
    cancelAnimationFrame(pendingRafId);
    pendingRafId = null;
  }
  pendingRoots.clear();
}

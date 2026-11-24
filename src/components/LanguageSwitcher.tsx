import React, { useEffect, useRef, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { GAME_LANGUAGES_META, GameLanguage } from '../utils/settingsEngine';
import { useLanguage } from '../i18n/LanguageContext';
import { soundEngine } from '../services/soundEngine';

interface LanguageSwitcherProps {
  compact?: boolean;
  align?: 'left' | 'right';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  compact = false,
  align = 'right',
}) => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeMeta =
    GAME_LANGUAGES_META.find((l) => l.code === language) || GAME_LANGUAGES_META[0];

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const handleSelect = (code: GameLanguage) => {
    soundEngine.playClick();
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} data-no-i18n="true" className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          soundEngine.playClick();
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Idioma / Language: ${activeMeta.nativeName}`}
        className={`flex items-center gap-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
          compact ? 'px-2.5 py-2 text-xs font-bold' : 'px-3 py-1.5 text-xs font-bold'
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span aria-hidden="true">{activeMeta.flag}</span>
        <span className="font-mono tracking-tight">{activeMeta.shortCode}</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute mt-1.5 z-50 w-48 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl p-1.5 space-y-0.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {GAME_LANGUAGES_META.map((item) => {
            const selected = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => handleSelect(item.code)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  selected
                    ? 'bg-sky-500/20 text-sky-300 font-bold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white font-medium'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span aria-hidden="true">{item.flag}</span>
                  <span className="truncate">{item.nativeName}</span>
                </span>
                {selected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

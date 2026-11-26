import React, { useEffect, useMemo, useState } from 'react';
import { Club, Fixture, GameSave } from '../types/game';
import {
  buildContextualCoachTips,
  CoachTipActionTarget,
  CoachTipIconKey,
  CoachTipTone,
} from '../utils/coachTipsEngine';
import { soundEngine } from '../services/soundEngine';
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileSignature,
  Flame,
  GraduationCap,
  Handshake,
  HeartPulse,
  Lightbulb,
  ShieldAlert,
  ShoppingBag,
  Trophy,
  Wallet,
  X,
} from 'lucide-react';

interface CoachTipsBarProps {
  userClub: Club;
  gameState: GameSave;
  upcomingFixture?: Fixture | null;
  upcomingOpponent?: Club | null;
  userPosition?: number;
  classicFastMode?: boolean;
  onAction: (target: CoachTipActionTarget) => void;
}

const TONE_STYLES: Record<
  CoachTipTone,
  {
    border: string;
    bg: string;
    iconBg: string;
    iconColor: string;
    tagClass: string;
    ctaClass: string;
  }
> = {
  amber: {
    border: 'border-amber-500/35',
    bg: 'bg-amber-950/20',
    iconBg: 'bg-amber-500/15 border-amber-500/35',
    iconColor: 'text-amber-400',
    tagClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    ctaClass: 'bg-amber-400 hover:bg-amber-300 text-slate-950',
  },
  emerald: {
    border: 'border-emerald-500/35',
    bg: 'bg-emerald-950/20',
    iconBg: 'bg-emerald-500/15 border-emerald-500/35',
    iconColor: 'text-emerald-400',
    tagClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    ctaClass: 'bg-emerald-400 hover:bg-emerald-300 text-slate-950',
  },
  sky: {
    border: 'border-sky-500/35',
    bg: 'bg-sky-950/20',
    iconBg: 'bg-sky-500/15 border-sky-500/35',
    iconColor: 'text-sky-400',
    tagClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    ctaClass: 'bg-sky-400 hover:bg-sky-300 text-slate-950',
  },
  rose: {
    border: 'border-rose-500/40',
    bg: 'bg-rose-950/25',
    iconBg: 'bg-rose-500/15 border-rose-500/35',
    iconColor: 'text-rose-400',
    tagClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    ctaClass: 'bg-rose-500 hover:bg-rose-400 text-white',
  },
  indigo: {
    border: 'border-indigo-500/35',
    bg: 'bg-indigo-950/20',
    iconBg: 'bg-indigo-500/15 border-indigo-500/35',
    iconColor: 'text-indigo-400',
    tagClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    ctaClass: 'bg-indigo-400 hover:bg-indigo-300 text-slate-950',
  },
};

function renderTipIcon(icon: CoachTipIconKey, colorClass: string) {
  const cls = `w-4 h-4 shrink-0 ${colorClass}`;
  switch (icon) {
    case 'flame':
      return <Flame className={cls} />;
    case 'youth':
      return <GraduationCap className={cls} />;
    case 'market':
      return <ShoppingBag className={cls} />;
    case 'alert':
      return <AlertTriangle className={cls} />;
    case 'fitness':
      return <HeartPulse className={cls} />;
    case 'card':
      return <ShieldAlert className={cls} />;
    case 'contract':
      return <FileSignature className={cls} />;
    case 'sponsor':
      return <Handshake className={cls} />;
    case 'scout':
      return <Compass className={cls} />;
    case 'trophy':
      return <Trophy className={cls} />;
    case 'wallet':
      return <Wallet className={cls} />;
    default:
      return <Lightbulb className={cls} />;
  }
}

export const CoachTipsBar: React.FC<CoachTipsBarProps> = ({
  userClub,
  gameState,
  upcomingFixture,
  upcomingOpponent,
  userPosition,
  classicFastMode = false,
  onAction,
}) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const allTips = useMemo(
    () =>
      buildContextualCoachTips({
        userClub,
        gameState,
        upcomingFixture,
        upcomingOpponent,
        userPosition,
        classicFastMode,
      }),
    [userClub, gameState, upcomingFixture, upcomingOpponent, userPosition, classicFastMode]
  );

  const visibleTips = useMemo(
    () => allTips.filter((t) => !dismissedIds.includes(t.id)),
    [allTips, dismissedIds]
  );

  const safeIndex = visibleTips.length > 0 ? activeIndex % visibleTips.length : 0;

  useEffect(() => {
    if (visibleTips.length <= 1 || isHovered) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % visibleTips.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [visibleTips.length, isHovered]);

  if (visibleTips.length === 0) return null;

  const currentTip = visibleTips[safeIndex];
  const style = TONE_STYLES[currentTip.tone];

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Dicas do Treinador"
      className={`rounded-2xl border ${style.border} ${style.bg} px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors`}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-8 h-8 rounded-xl border ${style.iconBg} flex items-center justify-center shrink-0 mt-0.5 sm:mt-0`}
        >
          {renderTipIcon(currentTip.icon, style.iconColor)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-300 shrink-0" />
              <span>Dica do Treinador</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded border text-[10px] font-bold leading-none ${style.tagClass}`}
            >
              {currentTip.tag}
            </span>
            {visibleTips.length > 1 && (
              <span className="text-[10px] font-mono tabular-nums text-slate-500">
                {safeIndex + 1}/{visibleTips.length}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-[13px] font-medium text-slate-100 leading-snug">
            {currentTip.message}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 shrink-0">
        {visibleTips.length > 1 && (
          <div className="flex items-center gap-1 mr-0.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveIndex(
                  (prev) => (prev - 1 + visibleTips.length) % visibleTips.length
                );
              }}
              aria-label="Dica anterior"
              title="Dica anterior"
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveIndex((prev) => (prev + 1) % visibleTips.length);
              }}
              aria-label="Próxima dica"
              title="Próxima dica"
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onAction(currentTip.actionTarget);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${style.ctaClass}`}
        >
          <span>{currentTip.ctaLabel}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setDismissedIds((prev) => [...prev, currentTip.id]);
            setActiveIndex(0);
          }}
          aria-label="Dispensar esta dica"
          title="Dispensar dica"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};

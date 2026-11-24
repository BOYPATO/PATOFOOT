import React, { useMemo, useState } from 'react';
import { Club, GameSave, Player } from '../types/game';
import {
  buildManagementTipsReport,
  MANAGEMENT_TIP_CATEGORY_LABELS,
  ManagementTip,
  ManagementTipActionTarget,
  ManagementTipCategory,
  ManagementTipPriority,
} from '../utils/managementTipsEngine';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import { soundEngine } from '../services/soundEngine';
import {
  ArrowRight,
  CheckCircle2,
  FileSignature,
  GraduationCap,
  Lightbulb,
  RotateCcw,
  ShoppingBag,
  Users,
  Wallet,
  X,
} from 'lucide-react';

interface ManagementTipsPanelProps {
  userClub: Club;
  gameState: GameSave;
  onNavigateTab: (tab: string) => void;
  onOpenContracts: () => void;
  onOpenMarketTarget?: (
    tab: 'ai_director' | 'watchlist' | 'all' | 'free' | 'bosman',
    searchQuery?: string
  ) => void;
}

type CategoryFilter = 'ALL' | ManagementTipCategory;

const PRIORITY_STYLE: Record<
  ManagementTipPriority,
  { label: string; textClass: string }
> = {
  URGENTE: {
    label: 'Urgente',
    textClass: 'text-rose-400',
  },
  ATENCAO: {
    label: 'Atenção',
    textClass: 'text-amber-300',
  },
  OPORTUNIDADE: {
    label: 'Oportunidade',
    textClass: 'text-emerald-400',
  },
};

function renderCategoryIcon(category: ManagementTipCategory) {
  switch (category) {
    case 'CONTRATOS':
      return <FileSignature className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'BASE':
      return <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'FINANCAS':
      return <Wallet className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'ELENCO':
      return <Users className="w-4 h-4 text-indigo-400 shrink-0" />;
    case 'MERCADO':
      return <ShoppingBag className="w-4 h-4 text-cyan-400 shrink-0" />;
  }
}

export const ManagementTipsPanel: React.FC<ManagementTipsPanelProps> = ({
  userClub,
  gameState,
  onNavigateTab,
  onOpenContracts,
  onOpenMarketTarget,
}) => {
  const inspection = usePlayerInspection();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const report = useMemo(
    () => buildManagementTipsReport(gameState, userClub),
    [gameState, userClub]
  );

  const dismissedSet = useMemo(() => new Set(dismissedIds), [dismissedIds]);

  const activeTips = useMemo(
    () => report.tips.filter((tip) => !dismissedSet.has(tip.id)),
    [report.tips, dismissedSet]
  );

  const visibleTips = useMemo(() => {
    if (selectedCategory === 'ALL') return activeTips;
    return activeTips.filter((tip) => tip.category === selectedCategory);
  }, [activeTips, selectedCategory]);

  const hiddenCount = report.tips.length - activeTips.length;

  const handleTipAction = (target: ManagementTipActionTarget) => {
    soundEngine.playClick();
    switch (target) {
      case 'contracts':
        onOpenContracts();
        return;
      case 'youth':
        onNavigateTab('youth');
        return;
      case 'scouting':
        onNavigateTab('scouting');
        return;
      case 'finances':
        onNavigateTab('finances');
        return;
      case 'sponsors':
        onNavigateTab('sponsors');
        return;
      case 'squad':
        onNavigateTab('squad');
        return;
      case 'tactics':
        onNavigateTab('tactics');
        return;
      case 'training':
        onNavigateTab('training');
        return;
      case 'market':
        onNavigateTab('market');
        return;
      case 'market_free':
        if (onOpenMarketTarget) onOpenMarketTarget('free');
        else onNavigateTab('market');
        return;
      case 'market_bosman':
        if (onOpenMarketTarget) onOpenMarketTarget('bosman');
        else onNavigateTab('market');
        return;
    }
  };

  const handleDismissTip = (tipId: string) => {
    soundEngine.playClick();
    setDismissedIds((prev) => (prev.includes(tipId) ? prev : [...prev, tipId]));
  };

  const handleRestoreDismissed = () => {
    soundEngine.playClick();
    setDismissedIds([]);
  };

  const handleInspectPlayer = (player: Player) => {
    if (!inspection) return;
    soundEngine.playClick();
    inspection.inspectPlayer(player, userClub);
  };

  const categories: CategoryFilter[] = [
    'ALL',
    'CONTRATOS',
    'BASE',
    'FINANCAS',
    'ELENCO',
    'MERCADO',
  ];

  return (
    <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 sm:px-6 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="text-base font-bold text-white">Dicas de Gestão</h2>
              <span className="text-xs text-slate-400 tabular-nums">
                {activeTips.length} recomendação(ões) ativa(s)
                {report.urgentCount > 0 ? ` · ${report.urgentCount} urgente(s)` : ''}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{report.healthSummary}</p>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => {
            const count =
              cat === 'ALL'
                ? activeTips.length
                : activeTips.filter((t) => t.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedCategory(cat);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  isActive
                    ? 'bg-sky-400 text-slate-950 font-bold'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'Todas' : MANAGEMENT_TIP_CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={handleRestoreDismissed}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 border border-slate-800 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
              title="Reexibir dicas ocultadas nesta sessão"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar ({hiddenCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Tips List (single-elevation clean rows, no cards-inside-cards) */}
      {visibleTips.length === 0 ? (
        <div className="px-6 py-8 flex flex-col items-center justify-center text-center gap-2">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          <p className="text-sm font-semibold text-white">
            {selectedCategory === 'ALL'
              ? 'Todas as dicas foram atendidas ou ocultadas.'
              : `Nenhum alerta ativo em ${MANAGEMENT_TIP_CATEGORY_LABELS[selectedCategory]}.`}
          </p>
          <p className="text-xs text-slate-400">
            {hiddenCount > 0
              ? 'Você pode restaurar as dicas ocultadas acima ou alternar para outra categoria.'
              : 'Continue avançando no calendário — novas recomendações surgem conforme o clube evolui.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/70">
          {visibleTips.map((tip: ManagementTip) => {
            const priorityMeta = PRIORITY_STYLE[tip.priority];
            return (
              <div
                key={tip.id}
                className="px-5 py-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5">{renderCategoryIcon(tip.category)}</div>
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Unboxed inline metadata line */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold tabular-nums">
                      <span className={priorityMeta.textClass}>{priorityMeta.label}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300">
                        {MANAGEMENT_TIP_CATEGORY_LABELS[tip.category]}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400 font-mono">{tip.metricLabel}</span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">
                      {tip.title}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                      {tip.summary}
                    </p>

                    {tip.featuredPlayers && tip.featuredPlayers.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
                        <span className="text-[11px] text-slate-500">Atletas citados:</span>
                        {tip.featuredPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => handleInspectPlayer(player)}
                            className="text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {player.name} ({player.detailedRole} · {player.overall})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                  <button
                    type="button"
                    onClick={() => handleTipAction(tip.actionTarget)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>{tip.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDismissTip(tip.id)}
                    aria-label={`Ocultar dica: ${tip.title}`}
                    title="Ocultar dica"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

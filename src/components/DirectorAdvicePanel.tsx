import React, { useMemo, useState } from 'react';
import {
  Club,
  DetailedRole,
  Fixture,
  GameSave,
  Player,
  TacticalSettings,
} from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { buildAssistantOptimalLineup } from '../utils/assistantLineupEngine';
import {
  buildDirectorAdviceReport,
  DETAILED_ROLE_LABELS,
  DirectorSigningSuggestion,
  DirectorTacticalSuggestion,
  DirectorWeaknessItem,
} from '../utils/directorAdviceEngine';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Check,
  Compass,
  Crosshair,
  Sliders,
  TrendingUp,
  UserPlus,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { usePlayerInspection } from '../context/PlayerInspectionContext';

type AdviceSubTab = 'overview' | 'weaknesses' | 'signings' | 'tactics';

interface DirectorAdvicePanelProps {
  userClub: Club;
  gameState: GameSave;
  upcomingFixture?: Fixture | null;
  upcomingOpponent?: Club | null;
  onUpdateTactics?: (tactics: TacticalSettings) => void;
  onApplyAssistantLineup?: (updatedSquad: Player[], updatedTactics: TacticalSettings) => void;
  onInspectClubPlayer?: (clubId: string, playerId: string) => void;
  onOpenMarketTarget?: (
    tab: 'ai_director' | 'watchlist' | 'all' | 'free' | 'bosman',
    searchQuery?: string
  ) => void;
  onToggleWatchlistPlayer?: (playerId: string) => void;
  onOpenContracts: () => void;
  onOpenTacticsTab: () => void;
  onOpenSquadTab: () => void;
}

function formatCompactMoney(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toFixed(0)}k`;
  }
  return `${sign}R$ ${abs}`;
}

export const DirectorAdvicePanel: React.FC<DirectorAdvicePanelProps> = ({
  userClub,
  gameState,
  upcomingFixture,
  upcomingOpponent,
  onUpdateTactics,
  onApplyAssistantLineup,
  onInspectClubPlayer,
  onOpenMarketTarget,
  onToggleWatchlistPlayer,
  onOpenContracts,
  onOpenTacticsTab,
  onOpenSquadTab,
}) => {
  const inspection = usePlayerInspection();
  const [activeSubTab, setActiveSubTab] = useState<AdviceSubTab>('overview');
  const [roleFilter, setRoleFilter] = useState<DetailedRole | 'ALL'>('ALL');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const watchlistSet = useMemo(
    () => new Set((gameState.watchlist || []).map((w) => w.playerId)),
    [gameState.watchlist]
  );

  const report = useMemo(
    () =>
      buildDirectorAdviceReport(
        gameState,
        userClub,
        upcomingFixture,
        upcomingOpponent
      ),
    [gameState, userClub, upcomingFixture, upcomingOpponent]
  );

  const actionableTacticsCount = report.tacticalSuggestions.filter(
    (item) => !item.alreadyOptimal
  ).length;
  const criticalWeaknessCount = report.weaknesses.filter(
    (w) => w.severity === 'CRITICA'
  ).length;

  const filteredSignings = useMemo(() => {
    if (roleFilter === 'ALL') return report.signingSuggestions;
    const exact = report.signingSuggestions.filter((s) => s.targetRole === roleFilter);
    return exact.length > 0 ? exact : report.signingSuggestions;
  }, [report.signingSuggestions, roleFilter]);

  const handleApplyTacticalSuggestion = (suggestion: DirectorTacticalSuggestion) => {
    if (suggestion.alreadyOptimal) return;
    soundEngine.playClick();

    const mergedTactics: TacticalSettings = {
      ...userClub.tactics,
      ...(suggestion.tacticsPatch || {}),
    };

    if (suggestion.rearrangeOptimalLineup && onApplyAssistantLineup) {
      const lineupResult = buildAssistantOptimalLineup(
        userClub,
        upcomingFixture?.competition,
        mergedTactics
      );
      onApplyAssistantLineup(lineupResult.updatedSquad, lineupResult.updatedTactics);
      setFeedbackMessage(
        `Ajuste aplicado: ${suggestion.title} (${lineupResult.updatedTactics.formation} · OVR ${lineupResult.avgOverall} · Físico ${lineupResult.avgCondition}%).`
      );
      return;
    }

    if (onUpdateTactics) {
      onUpdateTactics(mergedTactics);
      setFeedbackMessage(`Diretriz tática atualizada: ${suggestion.suggestedSummary}.`);
    } else {
      onOpenTacticsTab();
    }
  };

  const handleQuickApplyOptimalLineup = () => {
    if (!onApplyAssistantLineup) {
      onOpenSquadTab();
      return;
    }
    soundEngine.playClick();
    const lineupResult = buildAssistantOptimalLineup(
      userClub,
      upcomingFixture?.competition,
      userClub.tactics
    );
    onApplyAssistantLineup(lineupResult.updatedSquad, lineupResult.updatedTactics);
    setFeedbackMessage(lineupResult.summaryText);
  };

  const handleInspectOrNegotiateSigning = (signing: DirectorSigningSuggestion) => {
    soundEngine.playClick();
    if (signing.sellerClub && onInspectClubPlayer) {
      onInspectClubPlayer(signing.sellerClub.id, signing.player.id);
      return;
    }
    if (onOpenMarketTarget) {
      const tab =
        signing.dealMode === 'FREE_AGENT'
          ? 'free'
          : signing.dealMode === 'BOSMAN'
          ? 'bosman'
          : 'ai_director';
      onOpenMarketTarget(tab, signing.player.name);
    }
  };

  const handleWeaknessAction = (item: DirectorWeaknessItem) => {
    soundEngine.playClick();
    if (item.actionType === 'APPLY_LINEUP') {
      handleQuickApplyOptimalLineup();
      return;
    }
    if (item.actionType === 'OPEN_CONTRACTS') {
      onOpenContracts();
      return;
    }
    if (item.actionType === 'OPEN_TACTICS_ADVICE') {
      setActiveSubTab('tactics');
      return;
    }
    if (item.actionType === 'OPEN_SIGNINGS') {
      setRoleFilter(item.targetRole || 'ALL');
      setActiveSubTab('signings');
      return;
    }
    if (item.actionType === 'OPEN_MARKET_ROLE') {
      if (onOpenMarketTarget) {
        onOpenMarketTarget('ai_director');
      } else {
        setActiveSubTab('signings');
      }
    }
  };

  const severityLabel = (sev: DirectorWeaknessItem['severity']) => {
    if (sev === 'CRITICA') return { text: 'Urgente', color: 'text-rose-400' };
    if (sev === 'ATENCAO') return { text: 'Atenção', color: 'text-amber-400' };
    return { text: 'Oportunidade', color: 'text-sky-400' };
  };

  return (
    <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
      {/* Top Header & Navigation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Briefcase className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-white font-bold tracking-tight">Conselhos do Diretor</span>
            <span>·</span>
            <span>Diagnóstico do Save em Tempo Real</span>
            <span>·</span>
            <span
              className={`font-mono tabular-nums font-bold ${
                report.squadHealthScore >= 80
                  ? 'text-emerald-400'
                  : report.squadHealthScore >= 65
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              Índice do Plantel {report.squadHealthScore}/100
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
            {report.executiveHeadline}
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-4xl">
            {report.executiveSummary}
          </p>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 p-1 rounded-xl overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveSubTab('overview');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Resumo
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveSubTab('weaknesses');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer font-mono tabular-nums ${
              activeSubTab === 'weaknesses'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Fraquezas ({report.weaknesses.length})
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setRoleFilter('ALL');
              setActiveSubTab('signings');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer font-mono tabular-nums ${
              activeSubTab === 'signings'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Contratações ({report.signingSuggestions.length})
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveSubTab('tactics');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer font-mono tabular-nums ${
              activeSubTab === 'tactics'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Ajustes Táticos ({actionableTacticsCount > 0 ? actionableTacticsCount : report.tacticalSuggestions.length})
          </button>
        </div>
      </div>

      {/* Inline Feedback Toast when User Applies a Tactical / Lineup Change */}
      {feedbackMessage && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 1: RESUMO EXECUTIVO (3-COLUMN DIAGNOSTIC SNAPSHOT)              */}
      {/* ==================================================================== */}
      {activeSubTab === 'overview' && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Column 1 (4 cols): Positional Strength & Depth Matrix */}
          <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-sky-400" />
                  <span>Mapa de Força por Função</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  Média XI {report.diagnosis.avgStarterOverall} OVR
                </span>
              </div>

              <div className="space-y-2.5">
                {report.roleBreakdown.map((stat) => {
                  const isWeakest = stat.role === report.diagnosis.weakestRole;
                  const isShortage = stat.count < stat.idealCount;
                  const barPct = Math.max(
                    18,
                    Math.min(100, Math.round(((stat.avgTopOvr - 45) / 50) * 100))
                  );

                  return (
                    <div key={stat.role} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`font-mono font-bold w-8 ${
                              isWeakest ? 'text-rose-400' : 'text-slate-200'
                            }`}
                          >
                            {stat.role}
                          </span>
                          <span className="text-slate-500">·</span>
                          <span
                            className={`text-[11px] font-mono tabular-nums ${
                              isShortage ? 'text-amber-400 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            {stat.count}/{stat.idealCount} atletas
                          </span>
                          {isWeakest && (
                            <span className="text-[10px] text-rose-400 font-semibold">
                              · Foco #1
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-mono tabular-nums font-bold ${
                            isWeakest
                              ? 'text-rose-400'
                              : stat.avgTopOvr >= report.diagnosis.avgStarterOverall + 1
                              ? 'text-emerald-400'
                              : 'text-white'
                          }`}
                        >
                          {stat.avgTopOvr > 0 ? stat.avgTopOvr.toFixed(1) : '--'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isWeakest
                              ? 'bg-rose-500'
                              : isShortage
                              ? 'bg-amber-400'
                              : 'bg-sky-500'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Verba segura:{' '}
                <strong className="text-emerald-400 font-mono tabular-nums">
                  {formatCompactMoney(report.diagnosis.safeTransferBudget)}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveSubTab('weaknesses');
                }}
                className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Diagnóstico completo</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Column 2 (4 cols): Priority Weakness + Top Signing Recommendation */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {/* Primary Weakness Card */}
            {report.weaknesses[0] && (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <AlertTriangle
                        className={`w-3.5 h-3.5 ${
                          criticalWeaknessCount > 0 ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      />
                      <span>{report.weaknesses[0].categoryLabel}</span>
                    </span>
                    <span
                      className={`font-mono tabular-nums font-bold ${
                        severityLabel(report.weaknesses[0].severity).color
                      }`}
                    >
                      {report.weaknesses[0].metricSummary}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1.5">
                    {report.weaknesses[0].title}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {report.weaknesses[0].diagnosis}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                    +{ Math.max(0, report.weaknesses.length - 1) } alerta(s) mapeado(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleWeaknessAction(report.weaknesses[0])}
                    className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{report.weaknesses[0].actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Top Signing Target Card */}
            {report.signingSuggestions[0] ? (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Alvo #1 · {report.signingSuggestions[0].dealModeLabel}</span>
                    </span>
                    <span className="font-mono tabular-nums text-white font-bold">
                      OVR {report.signingSuggestions[0].player.overall}{' '}
                      {report.signingSuggestions[0].upgradeDeltaOvr > 0 && (
                        <span className="text-emerald-400">
                          (+{report.signingSuggestions[0].upgradeDeltaOvr})
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        inspection?.inspectPlayer(
                          report.signingSuggestions[0].player,
                          report.signingSuggestions[0].sellerClub ?? null
                        );
                      }}
                      className="text-sm font-black text-white hover:text-sky-300 transition-colors truncate text-left cursor-pointer"
                    >
                      {report.signingSuggestions[0].player.name}
                    </button>
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums shrink-0">
                      {report.signingSuggestions[0].player.detailedRole} ·{' '}
                      {report.signingSuggestions[0].player.age}a ·{' '}
                      {report.signingSuggestions[0].sellerClub
                        ? report.signingSuggestions[0].sellerClub.shortName
                        : 'Livre'}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {report.signingSuggestions[0].rationale}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-300 font-mono tabular-nums">
                    {report.signingSuggestions[0].estimatedFee > 0
                      ? `Taxa ~${formatCompactMoney(report.signingSuggestions[0].estimatedFee)}`
                      : 'Sem taxa de passe'}{' '}
                    · Sal. {formatCompactMoney(report.signingSuggestions[0].estimatedWage)}/mês
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleInspectOrNegotiateSigning(report.signingSuggestions[0])
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer transition-colors shrink-0"
                  >
                    Negociar
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex-1 flex flex-col justify-center">
                <div className="text-xs font-bold text-slate-300">
                  Mercado monitorado pelo Diretor
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Abra o Mercado da Bola para filtrar oportunidades internacionais ou agentes livres.
                </p>
              </div>
            )}
          </div>

          {/* Column 3 (4 cols): Tactical Recommendations Preview & 1-Click Execution */}
          <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Prancheta Recomendada</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  Ideal: {report.bestFormationEval.formation}
                </span>
              </div>

              <div className="space-y-3">
                {report.tacticalSuggestions.slice(0, 2).map((tac) => (
                  <div
                    key={tac.id}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-400 font-medium truncate">
                        {tac.categoryLabel}
                      </span>
                      <span className="font-mono tabular-nums text-sky-400 font-semibold shrink-0">
                        {tac.impactMetric}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1">
                      {tac.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
                      Sugestão: <span className="text-emerald-300">{tac.suggestedSummary}</span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-end">
                      {tac.alreadyOptimal ? (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>{tac.actionLabel}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApplyTacticalSuggestion(tac)}
                          className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs cursor-pointer transition-colors"
                        >
                          {tac.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={onOpenTacticsTab}
                className="text-slate-400 hover:text-white font-semibold cursor-pointer"
              >
                Abrir Painel de Táticas
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveSubTab('tactics');
                }}
                className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todos ajustes ({report.tacticalSuggestions.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 2: FRAQUEZAS DO ELENCO & CAMPANHA                               */}
      {/* ==================================================================== */}
      {activeSubTab === 'weaknesses' && (
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {report.weaknesses.map((item) => {
              const sev = severityLabel(item.severity);
              return (
                <div
                  key={item.id}
                  className="bg-slate-900/55 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400 font-medium min-w-0 truncate">
                        <span className={`font-bold ${sev.color}`}>{sev.text}</span>
                        <span>·</span>
                        <span className="truncate">{item.categoryLabel}</span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-slate-200 shrink-0">
                        {item.metricSummary}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white mt-1.5">
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {item.diagnosis}
                    </p>

                    <div className="mt-2.5 text-xs text-slate-300">
                      <span className="text-emerald-400 font-bold">Parecer: </span>
                      {item.recommendation}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/70 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleWeaknessAction(item)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 3: CONTRATAÇÕES SUGERIDAS (COM FILTRO DE FUNÇÃO & AÇÃO DIRETA)  */}
      {/* ==================================================================== */}
      {activeSubTab === 'signings' && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setRoleFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  roleFilter === 'ALL'
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Todos os Alvos ({report.signingSuggestions.length})
              </button>
              {(['GOL', 'LAT', 'ZAG', 'VOL', 'MEI', 'ATA'] as DetailedRole[]).map((role) => {
                const count = report.signingSuggestions.filter(
                  (s) => s.targetRole === role
                ).length;
                if (count === 0 && role !== report.diagnosis.weakestRole) return null;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono tabular-nums cursor-pointer transition-colors ${
                      roleFilter === role
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {role} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="font-mono tabular-nums">
                Caixa livre:{' '}
                <strong className="text-white">
                  {formatCompactMoney(userClub.finances.balance)}
                </strong>{' '}
                · Teto sugerido:{' '}
                <strong className="text-emerald-400">
                  {formatCompactMoney(report.diagnosis.safeTransferBudget)}
                </strong>
              </span>
              {onOpenMarketTarget && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenMarketTarget('watchlist');
                  }}
                  className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 cursor-pointer tabular-nums"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lista de Observação ({watchlistSet.size})</span>
                </button>
              )}
              {onOpenMarketTarget && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenMarketTarget('ai_director');
                  }}
                  className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Central de Mercado</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {filteredSignings.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
              <p className="text-sm font-bold text-slate-300">
                Nenhum alvo imediato filtrado para esta condição orçamentária.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Acesse o Mercado da Bola para consultar empréstimos ou atletas em fim de contrato.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredSignings.map((signing) => (
                <div
                  key={signing.id}
                  className="bg-slate-900/55 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between gap-3 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span
                        className={`font-bold ${
                          signing.priority === 'ALTA'
                            ? 'text-emerald-400'
                            : signing.priority === 'OPORTUNIDADE'
                            ? 'text-sky-400'
                            : 'text-amber-300'
                        }`}
                      >
                        Prioridade {signing.priority} · {signing.dealModeLabel}
                      </span>
                      <span className="font-mono tabular-nums font-bold text-slate-300">
                        {signing.targetRole}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 mt-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <PlayerAvatar
                          player={signing.player}
                          club={signing.sellerClub ?? null}
                          clubPrimaryColor={signing.sellerClub?.colors.primary}
                          clubTextColor={signing.sellerClub?.colors.text}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              inspection?.inspectPlayer(
                                signing.player,
                                signing.sellerClub ?? null
                              );
                            }}
                            className="text-sm font-black text-white hover:text-sky-300 transition-colors truncate block text-left cursor-pointer max-w-full"
                          >
                            {signing.player.name}
                          </button>
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {signing.sellerClub ? signing.sellerClub.name : 'Sem Clube (Agente Livre)'}{' '}
                          · {signing.player.age} anos · Pot.{' '}
                          <span className="font-mono tabular-nums text-slate-300">
                            {signing.player.potential}
                          </span>
                        </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black font-mono tabular-nums text-white">
                          {signing.player.overall}{' '}
                          <span className="text-[11px] font-bold text-slate-400">OVR</span>
                        </div>
                        <div
                          className={`text-[11px] font-mono tabular-nums font-bold ${
                            signing.upgradeDeltaOvr > 0 ? 'text-emerald-400' : 'text-sky-400'
                          }`}
                        >
                          {signing.upgradeDeltaOvr > 0
                            ? `+${signing.upgradeDeltaOvr} vs ${signing.currentStarterOvr}`
                            : signing.fixesShortage
                            ? 'Reposição de setor'
                            : `Equivalente (${signing.currentStarterOvr})`}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                      {signing.rationale}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-300 font-mono tabular-nums">
                      <div>
                        Passe:{' '}
                        <strong className="text-white">
                          {signing.estimatedFee > 0
                            ? formatCompactMoney(signing.estimatedFee)
                            : 'R$ 0 (Livre/Pré)'}
                        </strong>
                      </div>
                      <div className="text-slate-400">
                        Salário est.: {formatCompactMoney(signing.estimatedWage)}/mês
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onToggleWatchlistPlayer && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onToggleWatchlistPlayer(signing.player.id);
                          }}
                          title={
                            watchlistSet.has(signing.player.id)
                              ? 'Remover da Lista de Observação'
                              : 'Guardar na Lista de Observação'
                          }
                          className={`px-2.5 py-2 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                            watchlistSet.has(signing.player.id)
                              ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 hover:bg-rose-950/60 hover:border-rose-500/50 hover:text-rose-200'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
                          }`}
                        >
                          {watchlistSet.has(signing.player.id) ? (
                            <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                          <span>{watchlistSet.has(signing.player.id) ? 'Na Lista' : 'Observar'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleInspectOrNegotiateSigning(signing)}
                        className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>
                          {signing.sellerClub ? 'Negociar' : 'Propor'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 4: AJUSTES TÁTICOS ESPECÍFICOS (APLICAÇÃO EM 1 CLIQUE)          */}
      {/* ==================================================================== */}
      {activeSubTab === 'tactics' && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div>
              Configuração ativa:{' '}
              <strong className="text-white font-mono tabular-nums">
                {userClub.tactics.formation}
              </strong>{' '}
              · {userClub.tactics.mentality} · Marcação {userClub.tactics.marking} · Passe{' '}
              {userClub.tactics.passing}
            </div>
            <button
              type="button"
              onClick={onOpenTacticsTab}
              className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Ir para Prancheta Completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {report.tacticalSuggestions.map((tac) => (
              <div
                key={tac.id}
                className="bg-slate-900/55 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                      <span>{tac.categoryLabel}</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-emerald-400">
                      {tac.impactMetric}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-white mt-1.5">
                    {tac.title}
                  </h4>

                  <div className="mt-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 space-y-1 text-xs font-mono tabular-nums">
                    <div className="text-slate-400">
                      <span className="text-slate-500">Atual: </span>
                      {tac.currentSummary}
                    </div>
                    <div className="text-emerald-300 font-semibold">
                      <span className="text-slate-500 font-normal">Sugerido: </span>
                      {tac.suggestedSummary}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                    {tac.rationale}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-800/70 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">
                    Prioridade: <strong className="text-slate-300">{tac.priority}</strong>
                  </span>

                  {tac.alreadyOptimal ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>{tac.actionLabel}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApplyTacticalSuggestion(tac)}
                      className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs cursor-pointer transition-colors"
                    >
                      {tac.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-950/60 border border-slate-800/70 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Setor prioritário no elenco:{' '}
              <strong className="text-white">
                {DETAILED_ROLE_LABELS[report.diagnosis.weakestRole]}
              </strong>{' '}
              · Melhor formação calculada:{' '}
              <strong className="text-emerald-400 font-mono tabular-nums">
                {report.bestFormationEval.formation}
              </strong>{' '}
              ({report.bestFormationEval.naturalFitCount}/11 na posição de origem)
            </span>
            <button
              type="button"
              onClick={handleQuickApplyOptimalLineup}
              className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
            >
              Reescalar 11 Titulares Ideais
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

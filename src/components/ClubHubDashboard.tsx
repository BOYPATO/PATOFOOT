import React, { useMemo, useState } from 'react';
import {
  Club,
  Fixture,
  GameSave,
  Player,
  SavedLineupProfile,
  SmartAdvanceSummary,
  Standing,
  TacticalPreset,
  TacticalSettings,
} from '../types/game';
import {
  buildRotatedRestedLineup,
  inspectPreMatchReadiness,
} from '../utils/quickLineupEngine';
import { getManagerSpecialtyProfile } from '../utils/managerSpecialtyEngine';
import { evaluateChallengeStatus } from '../utils/careerChallengesEngine';
import { DirectorAdvicePanel } from './DirectorAdvicePanel';
import { ManagementTipsPanel } from './ManagementTipsPanel';
import { ClubCrest, CompetitionCrest } from './ClubCrest';
import { soundEngine } from '../services/soundEngine';
import { getCurrentRealWorldSyncPeriod } from '../services/october2026SquadAiService';
import { formatCalendarDate, daysBetween } from '../utils/calendarUtils';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { getMatchRivalryInfo } from '../utils/rivalryEngine';
import { countActiveSponsors } from '../utils/sponsorEngine';
import { getTransferWindowStatus } from '../utils/transferWindowEngine';
import { getClubSectorRatings } from '../utils/clubRatingsEngine';
import {
  SOUTH_AMERICAN_LEAGUES_META,
  getClubSouthAmericanLeagueId,
} from '../utils/southAmericaLeaguesEngine';
import {
  EUROPEAN_LEAGUES_META,
  getClubEuropeanLeagueId,
} from '../utils/europeLeaguesEngine';
import {
  WORLD_LEAGUES_META,
  getClubWorldLeagueId,
} from '../utils/worldLeaguesEngine';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  FastForward,
  FileSignature,
  Handshake,
  HeartPulse,
  Mail,
  PlayCircle,
  Shield,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  Zap,
  Globe,
  RefreshCw,
  CheckCircle2,
  Flame,
  Compass,
  Sliders,
  Award,
  X,
  AlertTriangle,
  BookmarkCheck,
  ShieldAlert,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';

interface ClubHubDashboardProps {
  userClub: Club;
  allClubs: Club[];
  gameState: GameSave;
  upcomingFixture?: Fixture | null;
  upcomingOpponent?: Club | null;
  isTodayMatchDay: boolean;
  onNavigateTab: (tab: string) => void;
  onOpenContracts: () => void;
  onInspectClub: (clubId: string) => void;
  onInspectClubPlayer?: (clubId: string, playerId: string) => void;
  onOpenMarketTarget?: (
    tab: 'ai_director' | 'watchlist' | 'all' | 'free' | 'bosman',
    searchQuery?: string
  ) => void;
  onToggleWatchlistPlayer?: (playerId: string) => void;
  onUpdateTactics?: (tactics: TacticalSettings) => void;
  onApplyAssistantLineup?: (updatedSquad: Player[], updatedTactics: TacticalSettings) => void;
  onPlayMatch: () => void;
  onInstantResult?: () => void;
  onAdvanceToMatch: () => void;
  onFinishSeason: () => void;
  onSyncOverallsWithAI?: () => void;
  isSyncingOveralls?: boolean;
  overallSyncFeedback?: string | null;
  onOpenOct2026GlobalSyncModal?: () => void;
  onQuickSyncAllClubsOct2026?: () => void;
  onQuickSyncMyClubOct2026?: () => void;
  isSyncingOct2026Global?: boolean;
  isSyncingMyClubOct2026?: boolean;
  oct2026SyncedCount?: number;
  oct2026TotalClubsCount?: number;
  oct2026GlobalStatusText?: string | null;
  hasDismissedOnboarding?: boolean;
  onDismissOnboarding?: () => void;
  isDeadlineDayOpen?: boolean;
  deadlineDayClosesOn?: string;
  onOpenDeadlineDay?: () => void;
  smartAdvanceNotice?: string | null;
  smartAdvanceSummary?: SmartAdvanceSummary | null;
  onDismissSmartAdvanceNotice?: () => void;
  onOpenFirstRunTour?: () => void;
  onLoadTacticalPreset?: (preset: TacticalPreset) => void;
  onLoadLineupProfile?: (profile: SavedLineupProfile) => void;
  classicFastMode?: boolean;
  onToggleClassicFastMode?: () => void;
}

export const ClubHubDashboard: React.FC<ClubHubDashboardProps> = ({
  userClub,
  allClubs,
  gameState,
  upcomingFixture,
  upcomingOpponent,
  isTodayMatchDay,
  onNavigateTab,
  onOpenContracts,
  onInspectClub,
  onInspectClubPlayer,
  onOpenMarketTarget,
  onToggleWatchlistPlayer,
  onUpdateTactics,
  onApplyAssistantLineup,
  onPlayMatch,
  onInstantResult,
  onAdvanceToMatch,
  onFinishSeason,
  onSyncOverallsWithAI,
  isSyncingOveralls = false,
  overallSyncFeedback,
  onOpenOct2026GlobalSyncModal,
  onQuickSyncAllClubsOct2026,
  onQuickSyncMyClubOct2026,
  isSyncingOct2026Global = false,
  isSyncingMyClubOct2026 = false,
  oct2026SyncedCount = 0,
  oct2026TotalClubsCount = 0,
  oct2026GlobalStatusText = null,
  hasDismissedOnboarding = true,
  onDismissOnboarding,
  isDeadlineDayOpen = false,
  deadlineDayClosesOn,
  onOpenDeadlineDay,
  smartAdvanceNotice = null,
  smartAdvanceSummary = null,
  onDismissSmartAdvanceNotice,
  onOpenFirstRunTour,
  onLoadTacticalPreset,
  onLoadLineupProfile,
  classicFastMode = false,
  onToggleClassicFastMode,
}) => {
  const [quickHubFeedback, setQuickHubFeedback] = useState<string | null>(null);
  const [showExtraPanels, setShowExtraPanels] = useState(false);
  const preMatchReadiness = useMemo(
    () => inspectPreMatchReadiness(userClub, upcomingFixture?.competition),
    [userClub, upcomingFixture?.competition]
  );
  const savedLineups = useMemo(() => userClub.savedLineups || [], [userClub.savedLineups]);
  const [completedTourSteps, setCompletedTourSteps] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('patofoot_onboarding_steps_v1');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const markTourStepDone = (stepId: string) => {
    setCompletedTourSteps((prev) => {
      if (prev.includes(stepId)) return prev;
      const next = [...prev, stepId];
      try {
        localStorage.setItem('patofoot_onboarding_steps_v1', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const formatCompact = (val: number) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1_000_000) {
      return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')} mi`;
    }
    if (abs >= 1_000) {
      return `${sign}R$ ${Math.round(abs / 1_000)} mil`;
    }
    return formatCurrency(val);
  };

  const userSectors = useMemo(() => getClubSectorRatings(userClub), [userClub]);
  const oppSectors = useMemo(
    () => (upcomingOpponent ? getClubSectorRatings(upcomingOpponent) : null),
    [upcomingOpponent]
  );

  const monthlyPayroll = useMemo(
    () => userClub.squad.reduce((sum, p) => sum + (p.wage || 0), 0),
    [userClub.squad]
  );

  const activeSponsorsCount = countActiveSponsors(userClub.sponsors);
  const openSponsorSlots = Math.max(0, 4 - activeSponsorsCount);
  const windowStatus = useMemo(
    () => getTransferWindowStatus(gameState.currentDate),
    [gameState.currentDate]
  );

  const rivalry = useMemo(
    () => getMatchRivalryInfo(userClub, upcomingOpponent),
    [userClub, upcomingOpponent]
  );

  // Squad & Club Alerts
  const injuredCount = userClub.squad.filter((p) => p.injuryWeeks > 0).length;
  const suspendedCount = userClub.squad.filter((p) => p.isSuspended).length;
  const expiringContractsCount = userClub.squad.filter(
    (p) => !p.isLoan && p.contractYears <= 1 && !p.retiringAtSeasonEnd && !p.preContractClubId
  ).length;
  const pendingOffersCount = (gameState.transferOffers || []).filter(
    (o) => o.status === 'PENDING'
  ).length;
  const pendingArrivalsCount = (gameState.pendingTransfers || []).length;

  const boardConfidence = gameState.managerCareer?.boardConfidence ?? 75;
  const fanConfidence = gameState.managerCareer?.fanConfidence ?? 75;

  // League Table Slice around User Club
  const leagueSlice = useMemo(() => {
    const div = userClub.division;
    const euLeagueId = div === 'EU' ? getClubEuropeanLeagueId(userClub) : null;
    const saLeagueId = div === 'SA' ? getClubSouthAmericanLeagueId(userClub) : null;
    const wlLeagueId = div === 'WL' ? getClubWorldLeagueId(userClub) : null;

    const rawPool: Standing[] =
      div === 'EU' && euLeagueId
        ? gameState.standingsEurope?.[euLeagueId] || []
        : div === 'SA' && saLeagueId
        ? gameState.standingsSouthAmerica?.[saLeagueId] || []
        : div === 'WL' && wlLeagueId
        ? gameState.standingsWorldLeagues?.[wlLeagueId] || []
        : div === 'B'
        ? gameState.standingsB
        : div === 'C'
        ? gameState.standingsC || []
        : div === 'D'
        ? gameState.standingsD || []
        : div === 'EST'
        ? gameState.standingsEstadual || []
        : gameState.standingsA;

    const userRow = rawPool.find((r) => r.teamId === userClub.id);
    const scopedPool =
      userRow?.group ? rawPool.filter((r) => r.group === userRow.group) : rawPool;

    const sorted = [...scopedPool].sort(
      (a, b) =>
        b.points - a.points ||
        b.won - a.won ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor
    );

    const userIdx = sorted.findIndex((r) => r.teamId === userClub.id);
    const total = sorted.length;
    const sliceSize = 6;
    let start = Math.max(0, userIdx - 2);
    if (start + sliceSize > total) {
      start = Math.max(0, total - sliceSize);
    }

    return {
      compLabel:
        div === 'EU' && euLeagueId
          ? `${EUROPEAN_LEAGUES_META[euLeagueId].flagEmoji} ${EUROPEAN_LEAGUES_META[euLeagueId].name}`
          : div === 'SA' && saLeagueId
          ? `${SOUTH_AMERICAN_LEAGUES_META[saLeagueId].flagEmoji} ${SOUTH_AMERICAN_LEAGUES_META[saLeagueId].name}`
          : div === 'WL' && wlLeagueId
          ? `${WORLD_LEAGUES_META[wlLeagueId].flagEmoji} ${WORLD_LEAGUES_META[wlLeagueId].name}`
          : div === 'B'
          ? 'Brasileirão Série B'
          : div === 'C'
          ? 'Brasileirão Série C'
          : div === 'D'
          ? `Brasileirão Série D${userRow?.group ? ` · ${userRow.group}` : ''}`
          : div === 'EST'
          ? userRow?.group || 'Campeonato Potiguar (RN)'
          : 'Brasileirão Série A',
      userPosition: userIdx >= 0 ? userIdx + 1 : 1,
      rows: sorted.slice(start, start + sliceSize).map((row, idx) => ({
        rank: start + idx + 1,
        row,
        club: allClubs.find((c) => c.id === row.teamId),
      })),
    };
  }, [userClub, gameState, allClubs]);

  const compMeta = upcomingFixture
    ? COMPETITIONS_CATALOG[upcomingFixture.competition]
    : null;
  const daysUntilNextMatch =
    upcomingFixture?.date && gameState.currentDate
      ? Math.max(0, daysBetween(gameState.currentDate, upcomingFixture.date))
      : 0;

  const recentInbox = gameState.inbox.slice(0, 4);
  const managerSpecialty = useMemo(
    () => getManagerSpecialtyProfile(gameState.managerSpecialty),
    [gameState.managerSpecialty]
  );
  const challengeEval = useMemo(
    () => evaluateChallengeStatus(gameState),
    [gameState]
  );
  const savedPresets = userClub.tacticalPresets || [];

  return (
    <div className="space-y-6">
      {/* Unified Smart Advance Digest Card (Summary + Early-Pause Reason) */}
      {(smartAdvanceSummary || smartAdvanceNotice) && (
        <section
          className={`rounded-2xl px-4 sm:px-5 py-3.5 border space-y-2.5 ${
            smartAdvanceNotice || smartAdvanceSummary?.pausedReason
              ? 'bg-amber-950/35 border-amber-500/45'
              : 'bg-sky-950/30 border-sky-500/35'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              {smartAdvanceNotice || smartAdvanceSummary?.pausedReason ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <FastForward className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 space-y-1">
                <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                  {smartAdvanceSummary?.pausedReason || smartAdvanceNotice
                    ? smartAdvanceSummary?.pausedReason || smartAdvanceNotice
                    : `Resumo do Avanço Inteligente: ${smartAdvanceSummary?.daysAdvanced || 0} ${
                        (smartAdvanceSummary?.daysAdvanced || 0) === 1 ? 'dia avançado' : 'dias avançados'
                      } até ${
                        smartAdvanceSummary?.toDate
                          ? formatCalendarDate(smartAdvanceSummary.toDate)
                          : formatCalendarDate(gameState.currentDate)
                      }`}
                </div>

                {smartAdvanceSummary && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
                    <span className="font-mono text-slate-400">
                      {smartAdvanceSummary.daysAdvanced}d simulados
                    </span>
                    {smartAdvanceSummary.medicalRecoveries.length > 0 && (
                      <span className="text-emerald-300 font-semibold flex items-center gap-1">
                        <HeartPulse className="w-3 h-3" />
                        Alta médica: {smartAdvanceSummary.medicalRecoveries.slice(0, 3).join(', ')}
                        {smartAdvanceSummary.medicalRecoveries.length > 3
                          ? ` +${smartAdvanceSummary.medicalRecoveries.length - 3}`
                          : ''}
                      </span>
                    )}
                    {smartAdvanceSummary.newInjuries.length > 0 && (
                      <span className="text-rose-300 font-semibold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        DM: {smartAdvanceSummary.newInjuries.slice(0, 2).join(', ')}
                      </span>
                    )}
                    {smartAdvanceSummary.squadEvolutions.length > 0 && (
                      <span className="text-sky-300 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Evolução CT: {smartAdvanceSummary.squadEvolutions.slice(0, 3).join(', ')}
                        {smartAdvanceSummary.squadEvolutions.length > 3
                          ? ` +${smartAdvanceSummary.squadEvolutions.length - 3}`
                          : ''}
                      </span>
                    )}
                    {smartAdvanceSummary.youthUpdates.length > 0 && (
                      <span className="text-cyan-300 font-semibold">
                        Base: {smartAdvanceSummary.youthUpdates.length}{' '}
                        {smartAdvanceSummary.youthUpdates.length === 1 ? 'atualização' : 'atualizações'}
                      </span>
                    )}
                    {smartAdvanceSummary.scoutingUpdates.length > 0 && (
                      <span className="text-indigo-300 font-semibold">
                        Olheiros: {smartAdvanceSummary.scoutingUpdates.length}{' '}
                        {smartAdvanceSummary.scoutingUpdates.length === 1 ? 'relatório' : 'relatórios'}
                      </span>
                    )}
                    {smartAdvanceSummary.offersReceived > 0 && (
                      <span className="text-amber-300 font-bold">
                        +{smartAdvanceSummary.offersReceived}{' '}
                        {smartAdvanceSummary.offersReceived === 1 ? 'proposta' : 'propostas'} de mercado
                      </span>
                    )}
                    {smartAdvanceSummary.jobOffersReceived > 0 && (
                      <span className="text-amber-300 font-bold">
                        +{smartAdvanceSummary.jobOffersReceived} proposta de clube
                      </span>
                    )}
                    {smartAdvanceSummary.medicalRecoveries.length === 0 &&
                      smartAdvanceSummary.newInjuries.length === 0 &&
                      smartAdvanceSummary.squadEvolutions.length === 0 &&
                      smartAdvanceSummary.youthUpdates.length === 0 &&
                      smartAdvanceSummary.scoutingUpdates.length === 0 &&
                      smartAdvanceSummary.offersReceived === 0 &&
                      smartAdvanceSummary.jobOffersReceived === 0 && (
                        <span className="text-slate-400">
                          Semana tranquila no CT: elenco recuperou condição física sem ocorrências no DM.
                        </span>
                      )}
                  </div>
                )}
              </div>
            </div>

            {onDismissSmartAdvanceNotice && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onDismissSmartAdvanceNotice();
                }}
                aria-label="Dispensar resumo"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/70 cursor-pointer shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* Deadline Day Live Plantão Banner */}
      {isDeadlineDayOpen && onOpenDeadlineDay && (
        <section className="bg-gradient-to-r from-rose-950/55 via-[#0c1424] to-amber-950/45 border border-rose-500/45 rounded-2xl px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black text-white">
                Plantão: Último Dia da Janela (Deadline Day){deadlineDayClosesOn ? ` · Fecha em ${deadlineDayClosesOn}` : ''}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Propostas relâmpago, contratações de última hora com desconto e negociações hora a hora até 23:59.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenDeadlineDay();
            }}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Abrir Plantão ao Vivo</span>
          </button>
        </section>
      )}

      {/* Compact Mode Bar (Classic vs Complete) + Profile & Quick Lineups */}
      <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs min-w-0">
          {onToggleClassicFastMode && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onToggleClassicFastMode();
              }}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                classicFastMode
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title={
                classicFastMode
                  ? 'Modo Clássico Ativo: patrocínios, avisos secundários e baixas no 11 inicial são resolvidos automaticamente.'
                  : 'Ativar Modo Clássico para uma experiência mais direta e rápida, focada nos jogos.'
              }
            >
              {classicFastMode ? (
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              )}
              <span>{classicFastMode ? 'Modo Clássico: ON' : 'Modo Clássico: OFF'}</span>
            </button>
          )}

          {classicFastMode ? (
            <span className="text-[11px] text-slate-400 truncate">
              Patrocínios e baixas no 11 inicial no automático · Foco total nos jogos
            </span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-slate-400">Perfil:</span>
                <strong className="text-white">{managerSpecialty.title}</strong>
              </div>

              {challengeEval && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 hidden sm:inline">|</span>
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-300 font-bold">{challengeEval.active.title}:</span>
                  <span className="text-slate-300 font-mono tabular-nums text-[11px]">
                    {challengeEval.progressText}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {savedLineups.length > 0 && onLoadLineupProfile && (
            <div className="flex items-center gap-1.5 mr-1">
              <BookmarkCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              {savedLineups.map((profile) => (
                <button
                  key={profile.slot}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onLoadLineupProfile(profile);
                    setQuickHubFeedback(`${profile.name} (${profile.formation}) aplicado ao 11 inicial!`);
                    setTimeout(() => setQuickHubFeedback(null), 3500);
                  }}
                  title={`Alternar escalação para ${profile.name} (${profile.formation})`}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-[11px] font-bold text-sky-200 hover:text-white whitespace-nowrap cursor-pointer transition-colors"
                >
                  Time {profile.slot}{' '}
                  <span className="text-sky-400 font-mono">{profile.formation}</span>
                </button>
              ))}
            </div>
          )}

          {!classicFastMode && savedPresets.length > 0 && onLoadTacticalPreset && (
            <div className="flex items-center gap-1.5 mr-1">
              <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {savedPresets.map((preset) => (
                <button
                  key={preset.slotIndex}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onLoadTacticalPreset(preset);
                  }}
                  title={`Aplicar perfil ${preset.name} (${preset.formation})`}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-400/50 text-[11px] font-bold text-slate-200 hover:text-white whitespace-nowrap cursor-pointer transition-colors"
                >
                  {preset.name} <span className="text-sky-400 font-mono">{preset.formation}</span>
                </button>
              ))}
            </div>
          )}

          {!classicFastMode && onOpenFirstRunTour && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenFirstRunTour();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-sky-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Tour 4 Passos</span>
            </button>
          )}
        </div>
      </section>

      {/* Optional Dismissible 5-Step Interactive Onboarding Checklist (hidden in Classic Mode) */}
      {!classicFastMode && !hasDismissedOnboarding && onDismissOnboarding && (() => {
        const onboardingItems = [
          {
            step: '01',
            id: 'squad',
            title: 'Elenco & Tática',
            desc: 'Defina os 11 titulares, esquema tático e batedores oficiais.',
            tab: 'squad',
            cta: 'Abrir Elenco',
          },
          {
            step: '02',
            id: 'sponsors',
            title: 'Finanças & Patrocínios',
            desc: 'Feche cotas de patrocínio para turbinar o caixa da temporada.',
            tab: 'sponsors',
            cta: 'Ver Patrocínios',
          },
          {
            step: '03',
            id: 'market',
            title: 'Mercado & Olheiros',
            desc: 'Avalie reforços, empréstimos, pré-contratos ou peneiras da base.',
            tab: 'market',
            cta: 'Ir ao Mercado',
          },
          {
            step: '04',
            id: 'selecao_mundo',
            title: 'Seleções & FIFA 2026–38',
            desc: 'Acompanhe Eliminatórias, Copas Continentais e a Copa de 48 seleções.',
            tab: 'selecao_mundo',
            cta: 'Ver Seleções',
          },
          {
            step: '05',
            id: 'calendar',
            title: 'Calendário & Jogos',
            desc: 'Avance os dias no CT e entre em campo na próxima rodada.',
            tab: 'calendar',
            cta: 'Ver Calendário',
          },
        ];
        const doneCount = onboardingItems.filter(
          (it) =>
            completedTourSteps.includes(it.id) ||
            (it.id === 'sponsors' && activeSponsorsCount > 0)
        ).length;

        return (
          <section className="bg-[#0c1424] border border-sky-500/35 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                    Guia Rápido do Treinador
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-emerald-300 font-bold">
                    · {doneCount}/{onboardingItems.length} concluídos
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-black text-white mt-0.5">
                  Primeiros Passos no Comando do {userClub.shortName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onDismissOnboarding();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                Entendi, não mostrar novamente
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {onboardingItems.map((item) => {
                const isDone =
                  completedTourSteps.includes(item.id) ||
                  (item.id === 'sponsors' && activeSponsorsCount > 0);
                return (
                  <div
                    key={item.step}
                    className={`rounded-xl p-3 flex flex-col justify-between gap-2.5 border transition-colors ${
                      isDone
                        ? 'bg-emerald-950/20 border-emerald-500/35'
                        : 'bg-slate-950/75 border-slate-800/90'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`text-[10px] font-mono font-bold uppercase tabular-nums ${
                            isDone ? 'text-emerald-400' : 'text-sky-400'
                          }`}
                        >
                          Passo {item.step}
                        </div>
                        {isDone && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="font-bold text-xs text-white mt-0.5">{item.title}</div>
                      <p className="text-[11px] text-slate-400 leading-snug mt-1">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        markTourStepDone(item.id);
                        onNavigateTab(item.tab);
                      }}
                      className={`self-start text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                        isDone
                          ? 'text-emerald-300 hover:text-white'
                          : 'text-sky-300 hover:text-white'
                      }`}
                    >
                      <span>{isDone ? 'Revisitar' : item.cta}</span>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Global Real-World Current Month Live Roster API Banner */}
      {onOpenOct2026GlobalSyncModal && (() => {
        const realSyncPeriod = getCurrentRealWorldSyncPeriod();
        const busy = isSyncingOct2026Global || isSyncingMyClubOct2026;
        return (
        <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/35 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-sky-400" />
            </div>
            <div className="min-w-0 text-xs">
              <div className="font-bold text-white truncate">
                API Mensal de Elencos ({realSyncPeriod.fullLabel}) ·{' '}
                <span className="font-mono tabular-nums text-sky-300">
                  {oct2026SyncedCount}/{oct2026TotalClubsCount} clubes sincronizados
                </span>
              </div>
              <div className="text-slate-400 truncate mt-0.5">
                {oct2026GlobalStatusText
                  ? oct2026GlobalStatusText
                  : `Fusão Multi-API ativa (ESPN Soccer + Wikipedia Live + TheSportsDB + Gemini Search) — atualize elencos todo mês sob demanda.`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onQuickSyncMyClubOct2026 && !busy && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onQuickSyncMyClubOct2026();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Atualizar {userClub.shortName} ({realSyncPeriod.shortLabel})</span>
              </button>
            )}

            {onQuickSyncAllClubsOct2026 && !busy && oct2026SyncedCount < oct2026TotalClubsCount && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onQuickSyncAllClubsOct2026();
                }}
                className="px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Atualizar Todos os Times ({realSyncPeriod.shortLabel})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenOct2026GlobalSyncModal();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-sky-400 shrink-0 ${
                  busy ? 'animate-spin' : ''
                }`}
              />
              <span>
                {busy ? 'Ver Progresso ao Vivo' : `Central API ${realSyncPeriod.shortLabel}`}
              </span>
            </button>
          </div>
        </section>
        );
      })()}

      {/* TOP SPLIT: Next Match Centerpiece (7 cols) + Financial & Window Summary (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Left: Próximo Confronto */}
        <section className="xl:col-span-7 bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          {upcomingFixture && upcomingOpponent ? (
            <>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    {compMeta && <CompetitionCrest meta={compMeta} size="xs" />}
                    <span className="font-semibold text-sky-400">
                      {compMeta?.name || 'Próximo Compromisso'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {upcomingFixture.cupPhase || `Rodada ${upcomingFixture.round}`}
                    </span>
                    {upcomingFixture.stadiumName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{upcomingFixture.stadiumName}</span>
                      </>
                    )}
                  </div>

                  <div className="text-xs font-mono tabular-nums text-slate-300">
                    {upcomingFixture.date
                      ? formatCalendarDate(upcomingFixture.date)
                      : `Rodada ${upcomingFixture.round}`}
                    {daysUntilNextMatch > 0 && (
                      <span className="text-slate-500 ml-1.5">
                        (em {daysUntilNextMatch} {daysUntilNextMatch === 1 ? 'dia' : 'dias'})
                      </span>
                    )}
                  </div>
                </div>

                {/* Matchup Showcase */}
                {(() => {
                  const isUserHome = upcomingFixture.homeTeamId === userClub.id;
                  const homeClub = isUserHome ? userClub : upcomingOpponent;
                  const awayClub = isUserHome ? upcomingOpponent : userClub;
                  const homeSec = isUserHome ? userSectors : oppSectors!;
                  const awaySec = isUserHome ? oppSectors! : userSectors;

                  const formatDelta = (d: number) =>
                    d > 0 ? `+${d}` : d < 0 ? `${d}` : '';

                  return (
                    <>
                      <div className="py-5 grid grid-cols-3 items-center gap-3">
                        <div className="flex flex-col items-center text-center">
                          <ClubCrest club={homeClub} size="xl" rounded="2xl" />
                          <div className="mt-2.5 font-bold text-sm sm:text-base text-white truncate max-w-full">
                            {homeClub.shortName}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                            <span>Mandante · OVR {homeSec.overall}</span>
                            {homeSec.deltaOverall !== 0 && (
                              <span
                                className={
                                  homeSec.deltaOverall > 0
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-rose-400 font-bold'
                                }
                              >
                                ({formatDelta(homeSec.deltaOverall)})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center text-center">
                          <span className="text-xl sm:text-2xl font-black font-mono text-slate-500">
                            VS
                          </span>
                          {rivalry?.isDerby ? (
                            <span className="mt-1.5 text-xs font-semibold text-amber-400">
                              {rivalry.derbyName}
                            </span>
                          ) : (
                            <span className="mt-1.5 text-xs text-slate-500">
                              {upcomingFixture.time || '16:00'}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-center text-center">
                          <ClubCrest club={awayClub} size="xl" rounded="2xl" />
                          <div className="mt-2.5 font-bold text-sm sm:text-base text-white truncate max-w-full">
                            {awayClub.shortName}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                            <span>Visitante · OVR {awaySec.overall}</span>
                            {awaySec.deltaOverall !== 0 && (
                              <span
                                className={
                                  awaySec.deltaOverall > 0
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-rose-400 font-bold'
                                }
                              >
                                ({formatDelta(awaySec.deltaOverall)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Head-to-Head Sector Comparison: DEF / MEI / ATA */}
                      <div className="mb-4 p-3 rounded-xl bg-slate-950/75 border border-slate-800/80 space-y-2">
                        {[
                          {
                            label: 'Defesa',
                            code: 'DEF',
                            h: homeSec.defense,
                            a: awaySec.defense,
                            barH: 'bg-sky-400',
                            barA: 'bg-sky-500/60',
                          },
                          {
                            label: 'Meio-Campo',
                            code: 'MEI',
                            h: homeSec.midfield,
                            a: awaySec.midfield,
                            barH: 'bg-amber-400',
                            barA: 'bg-amber-500/60',
                          },
                          {
                            label: 'Ataque',
                            code: 'ATA',
                            h: homeSec.attack,
                            a: awaySec.attack,
                            barH: 'bg-rose-400',
                            barA: 'bg-rose-500/60',
                          },
                        ].map((row) => {
                          const total = Math.max(1, row.h + row.a);
                          const homePct = Math.round((row.h / total) * 100);
                          return (
                            <div key={row.code} className="grid grid-cols-12 items-center gap-2 text-xs">
                              <span
                                className={`col-span-2 font-mono tabular-nums font-bold ${
                                  row.h >= row.a ? 'text-white' : 'text-slate-400'
                                }`}
                              >
                                {row.h}
                              </span>
                              <div className="col-span-8">
                                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                                  <span>{homeClub.initials}</span>
                                  <span className="font-semibold text-slate-300">{row.label}</span>
                                  <span>{awayClub.initials}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                                  <div
                                    className={`h-full ${row.barH}`}
                                    style={{ width: `${homePct}%` }}
                                  />
                                  <div
                                    className={`h-full ${row.barA}`}
                                    style={{ width: `${100 - homePct}%` }}
                                  />
                                </div>
                              </div>
                              <span
                                className={`col-span-2 text-right font-mono tabular-nums font-bold ${
                                  row.a >= row.h ? 'text-white' : 'text-slate-400'
                                }`}
                              >
                                {row.a}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Alerta Inteligente de Prontidão, Cartões & Cansaço Pré-Jogo (com correção em 1 clique) */}
              {(preMatchReadiness.hasAlerts ||
                preMatchReadiness.penduradosStarters.length > 0 ||
                quickHubFeedback) && (
                <div
                  className={`mb-4 rounded-xl px-3.5 py-2.5 border flex flex-wrap items-center justify-between gap-2.5 text-xs ${
                    preMatchReadiness.unavailableCount > 0
                      ? 'bg-rose-950/35 border-rose-500/45 text-rose-100'
                      : preMatchReadiness.fatiguedStarters.length > 0
                      ? 'bg-amber-950/35 border-amber-500/45 text-amber-100'
                      : preMatchReadiness.penduradosStarters.length > 0
                      ? 'bg-amber-950/25 border-amber-500/35 text-amber-100'
                      : 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {preMatchReadiness.unavailableCount > 0 ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : preMatchReadiness.fatiguedStarters.length > 0 ? (
                      <HeartPulse className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : preMatchReadiness.penduradosStarters.length > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <div className="leading-snug">
                      {quickHubFeedback &&
                      !preMatchReadiness.hasAlerts &&
                      preMatchReadiness.penduradosStarters.length === 0 ? (
                        <span className="font-semibold">{quickHubFeedback}</span>
                      ) : (
                        <>
                          <strong className="mr-1.5">Alerta Pré-Jogo:</strong>
                          {preMatchReadiness.injuredStarters.length > 0 && (
                            <span className="text-rose-300 font-semibold mr-2">
                              {preMatchReadiness.injuredStarters.length} lesionado
                              {preMatchReadiness.injuredStarters.length > 1 ? 's' : ''} no 11 inicial
                            </span>
                          )}
                          {preMatchReadiness.suspendedStarters.length > 0 && (
                            <span className="text-rose-300 font-semibold mr-2">
                              🟥 {preMatchReadiness.suspendedStarters.length} suspenso
                              {preMatchReadiness.suspendedStarters.length > 1 ? 's' : ''} (1 jogo fora)
                            </span>
                          )}
                          {preMatchReadiness.fatiguedStarters.length > 0 && (
                            <span className="text-amber-300 font-semibold mr-2">
                              {preMatchReadiness.fatiguedStarters.length} titular
                              {preMatchReadiness.fatiguedStarters.length > 1 ? 'es' : ''} cansado
                              {preMatchReadiness.fatiguedStarters.length > 1 ? 's' : ''} (&lt;68%) · Média física{' '}
                              {preMatchReadiness.avgStarterCondition}%
                            </span>
                          )}
                          {preMatchReadiness.penduradosStarters.length > 0 && (
                            <span
                              className="text-amber-200 font-semibold"
                              title={`Pendurados com 2 amarelos: ${preMatchReadiness.penduradosStarters
                                .map((p) => p.name)
                                .join(', ')}`}
                            >
                              🟨 {preMatchReadiness.penduradosStarters.length} pendurado
                              {preMatchReadiness.penduradosStarters.length > 1 ? 's' : ''} (2/3:{' '}
                              {preMatchReadiness.penduradosStarters
                                .slice(0, 2)
                                .map((p) => p.name.split(' ')[0])
                                .join(', ')}
                              {preMatchReadiness.penduradosStarters.length > 2 ? '...' : ''})
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {preMatchReadiness.hasAlerts && onApplyAssistantLineup && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        const res = buildRotatedRestedLineup(
                          userClub,
                          upcomingFixture?.competition,
                          75
                        );
                        onApplyAssistantLineup(res.updatedSquad, res.updatedTactics);
                        setQuickHubFeedback(res.summaryText);
                        setTimeout(() => setQuickHubFeedback(null), 4000);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        preMatchReadiness.unavailableCount > 0
                          ? 'bg-rose-500 hover:bg-rose-400 text-white'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>
                        {preMatchReadiness.unavailableCount > 0
                          ? 'Corrigir e Poupar (1 Clique)'
                          : 'Poupar Cansados (1 Clique)'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Match Preparation Actions */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onNavigateTab('squad');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>Escalar Time</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onInspectClub(upcomingOpponent.id);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver {upcomingOpponent.shortName}</span>
                  </button>

                  {onSyncOverallsWithAI && (
                    <button
                      type="button"
                      disabled={isSyncingOveralls}
                      onClick={() => {
                        soundEngine.playClick();
                        onSyncOverallsWithAI();
                      }}
                      title="Calibrar Overalls reais de jogadores e setores via IA Gemini"
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 border border-sky-500/30 text-xs font-semibold text-sky-300 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>{isSyncingOveralls ? 'Calibrando IA...' : 'Overalls IA'}</span>
                    </button>
                  )}
                </div>
                {overallSyncFeedback && (
                  <p className="w-full text-[11px] text-emerald-400 font-medium">
                    {overallSyncFeedback}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  {!isTodayMatchDay && daysUntilNextMatch > 0 && (
                    <button
                      type="button"
                      onClick={onAdvanceToMatch}
                      title="Avança dia a dia até o jogo e pausa automaticamente se chegar proposta, lesão grave ou Deadline Day"
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>Avanço Inteligente</span>
                    </button>
                  )}

                  {onInstantResult && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onInstantResult();
                      }}
                      title="Simular a partida em 1 clique e abrir o resumo pós-jogo"
                      className="px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 hover:text-amber-200 font-bold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Resultado Instantâneo</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onPlayMatch();
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>{isTodayMatchDay ? 'Jogar Hoje' : 'Jogar Rodada'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-3">
              <Trophy className="w-10 h-10 text-amber-400" />
              <h3 className="text-lg font-bold text-white">
                Calendário de Partidas Concluído
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Todas as partidas do seu clube na temporada {gameState.currentSeasonYear} foram disputadas. Confira a retrospectiva comparando o desempenho com as metas da diretoria e avance de temporada.
              </p>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onFinishSeason();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                Abrir Retrospectiva {gameState.currentSeasonYear}
              </button>
            </div>
          )}
        </section>

        {/* Right: Quadro Financeiro, Patrocínios & Janela */}
        <section className="xl:col-span-5 bg-[#0c1424] border border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-white">Gestão & Caixa do Clube</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Orçamento, folha salarial, cotas de patrocínio e janela
                </p>
              </div>
              <Wallet className="w-4 h-4 text-sky-400 shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-4 py-5">
              <div>
                <span className="text-xs text-slate-400 block">Saldo em Caixa</span>
                <strong className="text-lg font-bold font-mono text-sky-400 tabular-nums mt-0.5 block">
                  {formatCompact(userClub.finances.balance)}
                </strong>
                <span className="text-[11px] text-slate-500">Disponível p/ mercado</span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">Folha Mensal</span>
                <strong className="text-lg font-bold font-mono text-rose-300 tabular-nums mt-0.5 block">
                  {formatCompact(monthlyPayroll)}
                </strong>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  {userClub.squad.length} atletas no elenco
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800/60">
                <span className="text-xs text-slate-400 block">Patrocinadores</span>
                <strong className="text-base font-bold font-mono text-emerald-400 tabular-nums mt-0.5 block">
                  {activeSponsorsCount}/4 cotas ativas
                </strong>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  +{formatCompact(userClub.finances.weeklySponsor)} / rodada
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800/60">
                <span className="text-xs text-slate-400 block">Janela de Mercado</span>
                <strong
                  className={`text-base font-bold mt-0.5 block ${
                    windowStatus.isOpen ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {windowStatus.isOpen ? 'Aberta' : 'Fechada'}
                </strong>
                <span className="text-[11px] text-slate-500 truncate block">
                  {windowStatus.isOpen
                    ? `Fecha em ${windowStatus.closesOnDisplay}`
                    : `Reabre em ${windowStatus.nextOpenDisplay}`}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateTab('finances');
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Estádio & CT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateTab('sponsors');
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Handshake className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Patrocínios{openSponsorSlots > 0 ? ` (${openSponsorSlots} livres)` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateTab('market');
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>Mercado</span>
            </button>
          </div>
        </section>
      </div>

      {/* SECOND ROW: League Standings Slice (5 cols) + Department Status (4 cols) + Inbox (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Column 1: Compact League Standings */}
        <section className="lg:col-span-5 bg-[#0c1424] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">{leagueSlice.compLabel}</h3>
              <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                Sua colocação atual: {leagueSlice.userPosition}º lugar
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateTab('standings');
              }}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Tabela completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-500 border-b border-slate-800/80">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">Clube</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold text-slate-300">P</th>
                  <th className="py-2.5 px-2.5 text-right">J</th>
                  <th className="py-2.5 px-2.5 text-right">V</th>
                  <th className="py-2.5 px-3 text-right">SG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leagueSlice.rows.map(({ rank, row, club }) => {
                  if (!club) return null;
                  const isMine = club.id === userClub.id;
                  return (
                    <tr
                      key={row.teamId}
                      className={`transition-colors ${
                        isMine ? 'bg-sky-500/10' : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-400">
                        {rank}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onInspectClub(club.id);
                          }}
                          className="flex items-center gap-2 text-left group cursor-pointer"
                        >
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center font-bold text-[9px] shrink-0"
                            style={{
                              backgroundColor: club.colors.primary,
                              color: club.colors.text,
                            }}
                          >
                            {club.initials.slice(0, 3)}
                          </div>
                          <span
                            className={`truncate ${
                              isMine
                                ? 'font-bold text-sky-300'
                                : 'font-medium text-slate-200 group-hover:text-sky-300'
                            }`}
                          >
                            {club.shortName}
                          </span>
                        </button>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-sky-400 tabular-nums">
                        {row.points}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-400 tabular-nums">
                        {row.played}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-400 tabular-nums">
                        {row.won}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300 tabular-nums">
                        {row.goalDifference > 0
                          ? `+${row.goalDifference}`
                          : row.goalDifference}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Column 2: Alertas Práticos & Confiança */}
        <section className="lg:col-span-4 bg-[#0c1424] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Painel do Treinador</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pendências do elenco e status do cargo
              </p>
            </div>
            <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <div className="divide-y divide-slate-800/60">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateTab('squad');
              }}
              className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <HeartPulse className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">DM & Disciplina</div>
                  <div className="text-[11px] text-slate-400 truncate tabular-nums">
                    {injuredCount} {injuredCount === 1 ? 'lesionado' : 'lesionados'} ·{' '}
                    {suspendedCount} {suspendedCount === 1 ? 'suspenso' : 'suspensos'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenContracts();
              }}
              className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileSignature className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Contratos no Fim</div>
                  <div className="text-[11px] text-slate-400 truncate tabular-nums">
                    {expiringContractsCount > 0
                      ? `${expiringContractsCount} atletas no último ano`
                      : 'Todos os vínculos protegidos'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateTab('market');
              }}
              className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShoppingBag className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Movimentações</div>
                  <div className="text-[11px] text-slate-400 truncate tabular-nums">
                    {pendingOffersCount} propostas · {pendingArrivalsCount} negócios p/ janela
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateTab('board');
              }}
              className="w-full px-5 py-3.5 text-left hover:bg-slate-900/50 transition-colors cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="text-slate-400">Confiança da Diretoria</span>
                <strong className="font-mono text-sky-300">{boardConfidence}%</strong>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full"
                  style={{ width: `${Math.max(5, Math.min(100, boardConfidence))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Apoio da Torcida: {fanConfidence}%</span>
                <span className="text-sky-400 font-semibold">Ver metas →</span>
              </div>
            </button>
          </div>
        </section>

        {/* Column 3: Últimas Notícias */}
        <section className="lg:col-span-3 bg-[#0c1424] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">Notícias</h3>
              <p className="text-xs text-slate-400 mt-0.5">Caixa de entrada</p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateTab('inbox');
              }}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentInbox.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Nenhuma mensagem recente.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentInbox.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onNavigateTab('inbox');
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 tabular-nums">
                    <span>Rodada {msg.round}</span>
                    {!msg.read && (
                      <span className="text-sky-400 font-semibold">Nova</span>
                    )}
                  </div>
                  <div
                    className={`text-xs mt-0.5 line-clamp-2 ${
                      msg.read ? 'text-slate-300 font-medium' : 'text-white font-semibold'
                    }`}
                  >
                    {msg.title}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* COLLAPSIBLE EXTRA ANALYTICS: Director Advice & Management Tips (collapsed by default for clean focus) */}
      <section className="bg-[#0c1424] border border-slate-800/80 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setShowExtraPanels((prev) => !prev);
          }}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-sky-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white truncate">
                Análises do Diretor &amp; Dicas de Gestão
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                Sugestões de contratações, diagnóstico do elenco, contratos e ajustes táticos
              </div>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-sky-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <span>{showExtraPanels ? 'Ocultar' : 'Mostrar Análises'}</span>
            {showExtraPanels ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        </button>

        {showExtraPanels && (
          <div className="p-4 sm:p-5 pt-2 border-t border-slate-800/80 space-y-5">
            <ManagementTipsPanel
              userClub={userClub}
              gameState={gameState}
              onNavigateTab={onNavigateTab}
              onOpenContracts={onOpenContracts}
              onOpenMarketTarget={onOpenMarketTarget}
            />
            <DirectorAdvicePanel
              userClub={userClub}
              gameState={gameState}
              upcomingFixture={upcomingFixture}
              upcomingOpponent={upcomingOpponent}
              onUpdateTactics={onUpdateTactics}
              onApplyAssistantLineup={onApplyAssistantLineup}
              onInspectClubPlayer={onInspectClubPlayer}
              onOpenMarketTarget={onOpenMarketTarget}
              onToggleWatchlistPlayer={onToggleWatchlistPlayer}
              onOpenContracts={onOpenContracts}
              onOpenTacticsTab={() => onNavigateTab('tactics')}
              onOpenSquadTab={() => onNavigateTab('squad')}
            />
          </div>
        )}
      </section>
    </div>
  );
};

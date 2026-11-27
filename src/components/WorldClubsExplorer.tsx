import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Club,
  DetailedRole,
  EuropeanLeagueId,
  Fixture,
  GameSave,
  MAX_SQUAD_SIZE,
  Player,
  SouthAmericanLeagueId,
  Standing,
  WorldLeagueId,
} from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { getCurrentRealWorldSyncPeriod } from '../services/october2026SquadAiService';
import {
  getClubOverdraftLimit,
  isClubUnderTransferBan,
} from '../utils/financialFairPlayEngine';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  DollarSign,
  Dumbbell,
  ExternalLink,
  Eye,
  Flame,
  Globe,
  GraduationCap,
  Handshake,
  HeartPulse,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Wallet,
  X,
  ArrowRightLeft,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  Scale,
} from 'lucide-react';
import { PlayerComparisonModal } from './PlayerComparisonModal';
import { ClubCrest } from './ClubCrest';
import { PlayerAvatar } from './PlayerAvatar';
import { comparePlayersByPosition } from '../utils/playerOrdering';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import confetti from 'canvas-confetti';
import {
  formatPlayerNationalityFull,
  getNationalityInfo,
  isForeignPlayerForClub,
  resolvePlayerNationality,
} from '../utils/nationalityUtils';
import { getMatchRivalryInfo } from '../utils/rivalryEngine';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { formatCalendarDate } from '../utils/calendarUtils';
import { calculatePitchSlots, getPlayerShortName } from '../utils/matchPitchLayout';
import {
  canClubRegisterNewPlayer,
  findPendingTransferForPlayer,
  getTransferWindowStatus,
} from '../utils/transferWindowEngine';
import { computeDefaultReleaseClause } from '../utils/contractLifecycleEngine';
import {
  evaluateLoanProposal,
  getClubSeasonLoanCounts,
  MAX_SEASON_LOANS_IN,
} from '../utils/loanEngine';
import { evaluatePlayerClubWillingness } from '../utils/transferWillingnessEngine';
import { countActiveSponsors } from '../utils/sponsorEngine';
import { getClubSectorRatings } from '../utils/clubRatingsEngine';
import {
  SOUTH_AMERICAN_LEAGUE_IDS,
  SOUTH_AMERICAN_LEAGUES_META,
  getClubSouthAmericanLeagueId,
} from '../utils/southAmericaLeaguesEngine';
import {
  EUROPEAN_LEAGUE_IDS,
  EUROPEAN_LEAGUES_META,
  getClubEuropeanLeagueId,
} from '../utils/europeLeaguesEngine';
import {
  WORLD_LEAGUE_IDS,
  WORLD_LEAGUES_META,
  NORTH_AMERICAN_LEAGUE_IDS,
  ASIA_RUSSIA_LEAGUE_IDS,
  AFRICA_LEAGUE_IDS,
  getClubWorldLeagueId,
} from '../utils/worldLeaguesEngine';
import {
  ESTADUAIS_2026_CONFIG,
  EstadualKey,
  getClubEstadualConfig,
  getEstadualConfigByKey,
} from '../data/estaduais2026Config';

type ClubCategoryFilter =
  | 'ALL'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'EST'
  | 'SA'
  | 'NA'
  | 'EU'
  | 'ASIA_RUS'
  | 'AFRICA'
  | 'WORLD'
  | 'RIVALS';

type SpecificLeagueFilter =
  | 'ALL'
  | 'serie_a'
  | 'serie_b'
  | 'serie_c'
  | 'serie_d'
  | `estadual_${EstadualKey}`
  | 'copa_nordeste'
  | 'copa_verde'
  | 'libertadores'
  | 'sulamericana'
  | 'copa_internacional'
  | 'concacaf_champions'
  | 'afc_champions'
  | 'champions_league'
  | 'europa_league'
  | 'conference_league'
  | EuropeanLeagueId
  | SouthAmericanLeagueId
  | WorldLeagueId;

interface LeaguePillOption {
  id: SpecificLeagueFilter;
  label: string;
  emoji: string;
  count: number;
  accent?: 'sky' | 'emerald' | 'amber';
}

interface ScrollableLeagueBarProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

const ScrollableLeagueBar: React.FC<ScrollableLeagueBarProps> = ({
  title,
  subtitle,
  children,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const dragState = useRef<{
    isDown: boolean;
    startX: number;
    startScrollLeft: number;
    dragged: boolean;
  }>({
    isDown: false,
    startX: 0,
    startScrollLeft: 0,
    dragged: false,
  });

  const updateScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollEdges();

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        updateScrollEdges();
      }
    };

    const resizeObserver = new ResizeObserver(() => updateScrollEdges());
    resizeObserver.observe(el);
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', updateScrollEdges, { passive: true });

    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', updateScrollEdges);
    };
  }, [updateScrollEdges, children]);

  const scrollByStep = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    soundEngine.playClick();
    const step = Math.max(240, Math.round(el.clientWidth * 0.65));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      startScrollLeft: el.scrollLeft,
      dragged: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !dragState.current.isDown) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragState.current.startX;
    if (Math.abs(walk) > 6) {
      dragState.current.dragged = true;
      el.scrollLeft = dragState.current.startScrollLeft - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    dragState.current.isDown = false;
  };

  const handleCaptureClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.dragged) {
      e.stopPropagation();
      e.preventDefault();
      dragState.current.dragged = false;
    }
  };

  return (
    <div className="bg-slate-950/95 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-lg space-y-2">
      {title && (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-300 truncate">
              {title}
            </span>
            {subtitle && (
              <span className="hidden sm:inline text-[11px] text-slate-500 truncate">
                · {subtitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => scrollByStep(-1)}
              disabled={!canScrollLeft}
              title="Rolar ligas para a esquerda"
              className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByStep(1)}
              disabled={!canScrollRight}
              title="Rolar ligas para a direita"
              className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="relative flex items-center gap-1.5">
        {!title && canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByStep(-1)}
            title="Rolar para a esquerda"
            className="w-7 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onClickCapture={handleCaptureClick}
          className="flex items-center gap-1.5 overflow-x-auto horizontal-league-scroll pb-2 pt-0.5 flex-1 min-w-0 select-none cursor-grab active:cursor-grabbing"
        >
          {children}
        </div>

        {!title && canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByStep(1)}
            title="Rolar para a direita"
            className="w-7 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

type ClubSortOption =
  | 'OVR_DESC'
  | 'VALUE_DESC'
  | 'BUDGET_DESC'
  | 'STADIUM_DESC'
  | 'REP_DESC'
  | 'NAME_ASC';

type InspectorSubTab = 'squad' | 'structures' | 'finances' | 'matches';

interface WorldClubsExplorerProps {
  userClub: Club;
  allClubs: Club[];
  careerClubs: Club[];
  allFixtures: Fixture[];
  gameState: GameSave;
  initialClubId?: string;
  initialPlayerId?: string;
  initialInspectNonce?: number;
  onSignPlayer: (
    player: Player,
    transferFee: number,
    wage: number,
    fromClubId?: string,
    swapOutPlayerId?: string,
    contractYears?: number
  ) => boolean;
  onPayReleaseClause: (
    playerId: string,
    sellerClubId: string,
    offeredWage: number,
    contractYears?: number
  ) => { accepted: boolean; feedbackText: string };
  onLoanInPlayer: (
    player: Player,
    fromClubId: string,
    durationRounds: number,
    wageSharePct: number,
    buyOptionFee?: number,
    loanFee?: number
  ) => boolean;
  onApplyToClubJob: (clubId: string) => { accepted: boolean; feedbackText: string };
  onNavigateToMarket: () => void;
  watchlistPlayerIds?: string[];
  onToggleWatchlistPlayer?: (playerId: string) => void;
  onOpenWatchlist?: () => void;
  onCalibrateOverallsWithAI?: (targetClubId?: string) => void;
  isCalibratingOveralls?: boolean;
  overallSyncFeedback?: string | null;
  syncingOct2026Target?: string | null;
  oct2026SyncFeedback?: string | null;
  oct2026GroundingSources?: Array<{ title: string; uri: string }>;
  onSyncClubOct2026Squad?: (clubId: string) => void;
  onDismissOct2026Feedback?: () => void;
  onOpenOct2026GlobalSyncModal?: () => void;
  isSyncingOct2026Global?: boolean;
}

const FACILITY_TIER_LABELS: Record<number, { label: string; badgeClass: string }> = {
  1: {
    label: 'Básico / Modesto',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  2: {
    label: 'Regional Estruturado',
    badgeClass: 'bg-cyan-950/70 text-cyan-300 border-cyan-700/50',
  },
  3: {
    label: 'Profissional Nacional',
    badgeClass: 'bg-sky-950/70 text-sky-300 border-sky-600/50',
  },
  4: {
    label: 'Alto Rendimento',
    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50',
  },
  5: {
    label: 'Padrão FIFA / Elite Mundial',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-500/50',
  },
};

function getClubAverageOverall(club: Club): number {
  return getClubSectorRatings(club).overall;
}

function getClubSquadMarketValue(club: Club): number {
  return club.squad.reduce((acc, p) => acc + (p.marketValue || 0), 0);
}

function getClubMonthlyPayroll(club: Club): number {
  return club.squad.reduce((acc, p) => acc + (p.wage || 0), 0);
}

function getClubDivisionLabel(club: Club): string {
  if (club.id.startsWith('guest_')) return 'Convidado FIFA';
  if (club.division === 'EU') {
    const euLeagueId = getClubEuropeanLeagueId(club);
    if (euLeagueId) {
      return EUROPEAN_LEAGUES_META[euLeagueId].shortName;
    }
    return 'UEFA';
  }
  if (club.division === 'SA') {
    const saLeagueId = getClubSouthAmericanLeagueId(club);
    if (saLeagueId) {
      return SOUTH_AMERICAN_LEAGUES_META[saLeagueId].shortName;
    }
    return 'CONMEBOL';
  }
  if (club.division === 'WL') {
    const wlLeagueId = getClubWorldLeagueId(club);
    if (wlLeagueId) {
      return WORLD_LEAGUES_META[wlLeagueId].shortName;
    }
    return 'Liga Internacional';
  }
  if (club.division === 'EST') return getClubEstadualConfig(club)?.shortName || 'Estadual';
  return `Série ${club.division}`;
}

function getRoleBadgeStyle(role: DetailedRole): string {
  switch (role) {
    case 'GOL':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'ZAG':
    case 'LAT':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    case 'VOL':
    case 'MEI':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'ATA':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

export const WorldClubsExplorer: React.FC<WorldClubsExplorerProps> = ({
  userClub,
  allClubs,
  careerClubs,
  allFixtures,
  gameState,
  initialClubId,
  initialPlayerId,
  initialInspectNonce,
  onSignPlayer,
  onPayReleaseClause,
  onLoanInPlayer,
  onApplyToClubJob,
  onNavigateToMarket,
  watchlistPlayerIds = [],
  onToggleWatchlistPlayer,
  onOpenWatchlist,
  onCalibrateOverallsWithAI,
  isCalibratingOveralls = false,
  overallSyncFeedback,
  syncingOct2026Target = null,
  oct2026SyncFeedback = null,
  oct2026GroundingSources = [],
  onSyncClubOct2026Squad,
  onDismissOct2026Feedback,
  onOpenOct2026GlobalSyncModal,
  isSyncingOct2026Global = false,
}) => {
  const inspection = usePlayerInspection();
  const watchlistSet = useMemo(() => new Set(watchlistPlayerIds), [watchlistPlayerIds]);
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const formatCompactCurrency = (val: number) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1_000_000_000) {
      return `${sign}R$ ${(abs / 1_000_000_000).toFixed(2).replace('.', ',')} bi`;
    }
    if (abs >= 1_000_000) {
      return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')} mi`;
    }
    if (abs >= 1_000) {
      return `${sign}R$ ${Math.round(abs / 1_000)} mil`;
    }
    return formatCurrency(val);
  };

  // Pick a sensible default club to inspect (a top rival or top Série A club other than userClub)
  const defaultOtherClubId = useMemo(() => {
    if (initialClubId && allClubs.some((c) => c.id === initialClubId)) {
      return initialClubId;
    }
    const directRival = allClubs.find(
      (c) => c.id !== userClub.id && getMatchRivalryInfo(userClub, c)?.isDerby
    );
    if (directRival) return directRival.id;
    const otherClub = allClubs.find((c) => c.id !== userClub.id);
    return otherClub ? otherClub.id : userClub.id;
  }, [allClubs, initialClubId, userClub]);

  const [selectedClubId, setSelectedClubId] = useState<string>(defaultOtherClubId);
  const [categoryFilter, setCategoryFilter] = useState<ClubCategoryFilter>('ALL');
  const [specificLeagueFilter, setSpecificLeagueFilter] = useState<SpecificLeagueFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<ClubSortOption>('OVR_DESC');
  const [subTab, setSubTab] = useState<InspectorSubTab>('squad');

  // Squad sub-tab filters
  const [roleFilter, setRoleFilter] = useState<DetailedRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'STARTERS' | 'RESERVES' | 'FOREIGN'>('ALL');
  const [playerSort, setPlayerSort] = useState<'POS' | 'OVR' | 'VALUE' | 'WAGE' | 'AGE' | 'GOALS'>('POS');
  const [showPitchPreview, setShowPitchPreview] = useState<boolean>(true);

  // Career job application feedback
  const [clubFeedback, setClubFeedback] = useState<{
    positive: boolean;
    message: string;
  } | null>(null);
  const [comparingTarget, setComparingTarget] = useState<{
    player: Player;
    club: Club;
  } | null>(null);

  // Selected Player Modal for Inspection & Direct Transfer Negotiation
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);
  const [dealTab, setDealTab] = useState<'BUY' | 'CLAUSE' | 'LOAN'>('BUY');
  const [offerFee, setOfferFee] = useState<number>(0);
  const [offerWage, setOfferWage] = useState<number>(0);
  const [offerContractYears, setOfferContractYears] = useState<number>(3);
  const [loanDuration, setLoanDuration] = useState<19 | 38>(19);
  const [loanWagePct, setLoanWagePct] = useState<number>(70);
  const [loanFeeOffer, setLoanFeeOffer] = useState<number>(0);
  const [loanEnableBuyOption, setLoanEnableBuyOption] = useState<boolean>(true);
  const [loanBuyOptionOffer, setLoanBuyOptionOffer] = useState<number>(0);
  const [loanSuggestedBuyout, setLoanSuggestedBuyout] = useState<number | null>(null);
  const [dealFeedback, setDealFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (initialClubId && allClubs.some((c) => c.id === initialClubId)) {
      setCategoryFilter('ALL');
      setSpecificLeagueFilter('ALL');
      setSearchQuery('');
      setRoleFilter('ALL');
      setStatusFilter('ALL');
      setSubTab('squad');
      setSelectedClubId(initialClubId);

      if (initialPlayerId) {
        const targetClub = allClubs.find((c) => c.id === initialClubId);
        const targetPlayer = targetClub?.squad.find((p) => p.id === initialPlayerId);
        if (targetPlayer) {
          const baseMarket = Math.max(
            10_000,
            targetPlayer.askingPrice || targetPlayer.marketValue || 50_000
          );
          const recommendedOffer = targetPlayer.isListedForSale
            ? baseMarket
            : Math.round(baseMarket * (targetPlayer.isStarter ? 1.18 : 1.05));
          const recommendedWage = Math.max(1_500, Math.round(targetPlayer.wage * 1.12));
          const buyoutStep = baseMarket < 250_000 ? 10_000 : 50_000;

          setInspectedPlayer(targetPlayer);
          setDealTab('BUY');
          setOfferFee(recommendedOffer);
          setOfferWage(recommendedWage);
          setOfferContractYears(
            targetPlayer.age >= 34 ? 2 : targetPlayer.age <= 22 ? 4 : 3
          );
          setLoanDuration(19);
          setLoanWagePct(targetPlayer.overall >= 80 ? 80 : 60);
          setLoanFeeOffer(targetPlayer.isStarter ? Math.round(baseMarket * 0.12) : 0);
          setLoanEnableBuyOption(true);
          setLoanBuyOptionOffer(Math.max(10_000, Math.round((baseMarket * 1.15) / buyoutStep) * buyoutStep));
          setLoanSuggestedBuyout(null);
          setDealFeedback(null);
        } else {
          setInspectedPlayer(null);
        }
      } else {
        setInspectedPlayer(null);
      }
    }
  }, [initialClubId, initialPlayerId, initialInspectNonce, allClubs]);

  // Enrich clubs with computed metrics for fast sorting & display
  const enrichedClubs = useMemo(() => {
    return allClubs.map((club) => {
      const avgOvr = getClubAverageOverall(club);
      const squadValue = getClubSquadMarketValue(club);
      const payroll = getClubMonthlyPayroll(club);
      const isWorldGuest = club.id.startsWith('guest_');
      const rivalry = getMatchRivalryInfo(userClub, club);
      const countryName = club.country || 'Brasil';
      const natInfo = getNationalityInfo(countryName, 'Brasil');

      return {
        club,
        avgOvr,
        squadValue,
        payroll,
        isWorldGuest,
        rivalry,
        countryName,
        natInfo,
      };
    });
  }, [allClubs, userClub]);

  const allEstadualParticipantIds = useMemo(
    () => new Set(ESTADUAIS_2026_CONFIG.flatMap((cfg) => cfg.defaultClubIds)),
    []
  );

  // Fast lookup sets for continental & regional competitions
  const continentalParticipantSets = useMemo(() => {
    const toSet = (rows?: Standing[]) => new Set((rows || []).map((r) => r.teamId));
    const toFixSet = (fixtures?: Fixture[]) => {
      const s = new Set<string>();
      for (const f of fixtures || []) {
        if (!f.homeTeamId.toUpperCase().startsWith('TBD')) s.add(f.homeTeamId);
        if (!f.awayTeamId.toUpperCase().startsWith('TBD')) s.add(f.awayTeamId);
      }
      return s;
    };
    return {
      libertadores: toSet(gameState.standingsLibertadores),
      sulamericana: toSet(gameState.standingsSulamericana),
      champions_league: toSet(gameState.standingsChampionsLeague),
      europa_league: toSet(gameState.standingsEuropaLeague),
      conference_league: toSet(gameState.standingsConferenceLeague),
      copa_nordeste: toSet(gameState.standingsCopaNordeste),
      copa_verde: toSet(gameState.standingsCopaVerde),
      concacaf_champions: toFixSet(gameState.fixturesConcacafChampions),
      afc_champions: toFixSet(gameState.fixturesAfcChampions),
    };
  }, [
    gameState.standingsLibertadores,
    gameState.standingsSulamericana,
    gameState.standingsChampionsLeague,
    gameState.standingsEuropaLeague,
    gameState.standingsConferenceLeague,
    gameState.standingsCopaNordeste,
    gameState.standingsCopaVerde,
    gameState.fixturesConcacafChampions,
    gameState.fixturesAfcChampions,
  ]);

  const matchesSpecificLeague = useCallback(
    (club: Club, isWorldGuest: boolean, leagueId: SpecificLeagueFilter): boolean => {
      if (leagueId === 'ALL') return true;
      if (leagueId === 'serie_a') return club.division === 'A' && !isWorldGuest;
      if (leagueId === 'serie_b') return club.division === 'B' && !isWorldGuest;
      if (leagueId === 'serie_c') return club.division === 'C' && !isWorldGuest;
      if (leagueId === 'serie_d') return club.division === 'D' && !isWorldGuest;
      if (leagueId === 'copa_nordeste') return continentalParticipantSets.copa_nordeste.has(club.id);
      if (leagueId === 'copa_verde') return continentalParticipantSets.copa_verde.has(club.id);
      if (leagueId.startsWith('estadual_')) {
        if (isWorldGuest || club.division === 'EU' || club.division === 'SA' || club.division === 'WL') {
          return false;
        }
        const key = leagueId.replace('estadual_', '');
        const cfg = getEstadualConfigByKey(key);
        if (!cfg) return false;
        return cfg.defaultClubIds.includes(club.id) || (club.division === 'EST' && club.state === cfg.uf);
      }
      if (leagueId === 'libertadores') return continentalParticipantSets.libertadores.has(club.id);
      if (leagueId === 'sulamericana') return continentalParticipantSets.sulamericana.has(club.id);
      if (leagueId === 'concacaf_champions') return continentalParticipantSets.concacaf_champions.has(club.id);
      if (leagueId === 'afc_champions') return continentalParticipantSets.afc_champions.has(club.id);
      if (leagueId === 'champions_league') return continentalParticipantSets.champions_league.has(club.id);
      if (leagueId === 'europa_league') return continentalParticipantSets.europa_league.has(club.id);
      if (leagueId === 'conference_league') return continentalParticipantSets.conference_league.has(club.id);
      if ((EUROPEAN_LEAGUE_IDS as readonly string[]).includes(leagueId)) {
        return club.division === 'EU' && !isWorldGuest && getClubEuropeanLeagueId(club) === leagueId;
      }
      if ((SOUTH_AMERICAN_LEAGUE_IDS as readonly string[]).includes(leagueId)) {
        return club.division === 'SA' && !isWorldGuest && getClubSouthAmericanLeagueId(club) === leagueId;
      }
      if ((WORLD_LEAGUE_IDS as readonly string[]).includes(leagueId)) {
        return club.division === 'WL' && !isWorldGuest && getClubWorldLeagueId(club) === leagueId;
      }
      return true;
    },
    [continentalParticipantSets]
  );

  // Contextual multi-league options for the scrollable bar
  const multiLeagueBarConfig = useMemo((): {
    title: string;
    subtitle: string;
    options: LeaguePillOption[];
  } | null => {
    const countFor = (id: SpecificLeagueFilter) =>
      enrichedClubs.filter((c) => matchesSpecificLeague(c.club, c.isWorldGuest, id)).length;

    const estaduaisOptions: LeaguePillOption[] = ESTADUAIS_2026_CONFIG.map((cfg) => ({
      id: `estadual_${cfg.key}` as SpecificLeagueFilter,
      label: cfg.shortName,
      emoji: '🇧🇷',
      count: countFor(`estadual_${cfg.key}` as SpecificLeagueFilter),
      accent: 'emerald' as const,
    }));

    const regionalCupsOptions: LeaguePillOption[] = (
      [
        { id: 'copa_nordeste' as const, label: 'Copa do Nordeste', emoji: '☀️' },
        { id: 'copa_verde' as const, label: 'Copa Verde', emoji: '🌿' },
      ] as const
    )
      .map((c) => ({ ...c, count: countFor(c.id), accent: 'amber' as const }))
      .filter((c) => c.count > 0);

    const brOptions: LeaguePillOption[] = [
      { id: 'serie_a', label: 'Brasileirão Série A', emoji: '🇧🇷', count: countFor('serie_a'), accent: 'emerald' },
      { id: 'serie_b', label: 'Brasileirão Série B', emoji: '🇧🇷', count: countFor('serie_b'), accent: 'emerald' },
      { id: 'serie_c', label: 'Brasileirão Série C', emoji: '🇧🇷', count: countFor('serie_c'), accent: 'emerald' },
      { id: 'serie_d', label: 'Brasileirão Série D', emoji: '🇧🇷', count: countFor('serie_d'), accent: 'emerald' },
      ...regionalCupsOptions,
      ...estaduaisOptions,
    ];

    const uefaContinentalOptions: LeaguePillOption[] = (
      [
        { id: 'champions_league' as const, label: 'Champions League', emoji: '🏆' },
        { id: 'europa_league' as const, label: 'Europa League', emoji: '🟠' },
        { id: 'conference_league' as const, label: 'Conference League', emoji: '🟢' },
      ] as const
    )
      .map((c) => ({ ...c, count: countFor(c.id), accent: 'amber' as const }))
      .filter((c) => c.count > 0);

    const conmebolContinentalOptions: LeaguePillOption[] = (
      [
        { id: 'libertadores' as const, label: 'CONMEBOL Libertadores', emoji: '🏆' },
        { id: 'sulamericana' as const, label: 'CONMEBOL Sul-Americana', emoji: '🥈' },
      ] as const
    )
      .map((c) => ({ ...c, count: countFor(c.id), accent: 'amber' as const }))
      .filter((c) => c.count > 0);

    const concacafCupOption: LeaguePillOption = {
      id: 'concacaf_champions',
      label: 'Champions Cup CONCACAF',
      emoji: '🏆',
      count: countFor('concacaf_champions'),
      accent: 'amber',
    };
    const afcChampionsOption: LeaguePillOption = {
      id: 'afc_champions',
      label: 'Liga dos Campeões AFC',
      emoji: '🐉',
      count: countFor('afc_champions'),
      accent: 'amber',
    };
    const fifaIntOption: LeaguePillOption = {
      id: 'copa_internacional',
      label: 'Champions Internacional FIFA',
      emoji: '🌐',
      count: countFor('copa_internacional'),
      accent: 'amber',
    };

    const naIntOptions = [concacafCupOption, fifaIntOption].filter((c) => c.count > 0);
    const asiaIntOptions = [afcChampionsOption, fifaIntOption].filter((c) => c.count > 0);
    const africaIntOptions = [fifaIntOption].filter((c) => c.count > 0);
    const worldIntOptions = [concacafCupOption, afcChampionsOption, fifaIntOption].filter(
      (c) => c.count > 0
    );

    const euDomesticOptions: LeaguePillOption[] = EUROPEAN_LEAGUE_IDS.map((euId) => {
      const meta = EUROPEAN_LEAGUES_META[euId];
      return {
        id: euId,
        label: meta.shortName,
        emoji: meta.flagEmoji,
        count: countFor(euId),
        accent: 'sky',
      };
    });

    const saDomesticOptions: LeaguePillOption[] = SOUTH_AMERICAN_LEAGUE_IDS.map((saId) => {
      const meta = SOUTH_AMERICAN_LEAGUES_META[saId];
      return {
        id: saId,
        label: `${meta.country} (${meta.shortName})`,
        emoji: meta.flagEmoji,
        count: countFor(saId),
        accent: 'emerald',
      };
    });

    const mapWorldDomestic = (ids: WorldLeagueId[]): LeaguePillOption[] =>
      ids.map((wlId) => {
        const meta = WORLD_LEAGUES_META[wlId];
        return {
          id: wlId,
          label: `${meta.country} (${meta.shortName})`,
          emoji: meta.flagEmoji,
          count: countFor(wlId),
          accent: 'amber',
        };
      });

    const naDomesticOptions = mapWorldDomestic(NORTH_AMERICAN_LEAGUE_IDS);
    const asiaRusDomesticOptions = mapWorldDomestic(ASIA_RUSSIA_LEAGUE_IDS);
    const africaDomesticOptions = mapWorldDomestic(AFRICA_LEAGUE_IDS);

    if (categoryFilter === 'EU') {
      const totalEu = enrichedClubs.filter((c) => c.club.division === 'EU' && !c.isWorldGuest).length;
      return {
        title: `Ligas Europeias (${euDomesticOptions.length} Nacionais + ${uefaContinentalOptions.length} Continentais UEFA)`,
        subtitle: 'Arraste, use a roda do mouse ou clique nas setas para ver todas',
        options: [
          { id: 'ALL', label: 'Todas da Europa', emoji: '🌍', count: totalEu, accent: 'sky' },
          ...uefaContinentalOptions,
          ...euDomesticOptions,
        ],
      };
    }

    if (categoryFilter === 'SA') {
      const totalSa = enrichedClubs.filter((c) => c.club.division === 'SA' && !c.isWorldGuest).length;
      return {
        title: `Ligas Sul-Americanas (${saDomesticOptions.length} Nacionais + Copas CONMEBOL)`,
        subtitle: 'Arraste, use a roda do mouse ou clique nas setas para ver todas',
        options: [
          { id: 'ALL', label: 'Todas Sul-Americanas', emoji: '🌎', count: totalSa, accent: 'emerald' },
          ...conmebolContinentalOptions,
          ...saDomesticOptions,
        ],
      };
    }

    if (categoryFilter === 'NA') {
      const totalNa = enrichedClubs.filter((c) => {
        const wlId = getClubWorldLeagueId(c.club);
        return c.club.division === 'WL' && !c.isWorldGuest && Boolean(wlId && NORTH_AMERICAN_LEAGUE_IDS.includes(wlId));
      }).length;
      return {
        title: 'América do Norte (EUA, México & Canadá · CONCACAF)',
        subtitle: 'Vagas diretas na Champions Cup CONCACAF, Champions Internacional FIFA e Mundial',
        options: [
          { id: 'ALL', label: 'Todas América do Norte', emoji: '🌎', count: totalNa, accent: 'amber' },
          ...naIntOptions,
          ...naDomesticOptions,
        ],
      };
    }

    if (categoryFilter === 'ASIA_RUS') {
      const totalAsia = enrichedClubs.filter((c) => {
        const wlId = getClubWorldLeagueId(c.club);
        return c.club.division === 'WL' && !c.isWorldGuest && Boolean(wlId && ASIA_RUSSIA_LEAGUE_IDS.includes(wlId));
      }).length;
      return {
        title: 'Ásia & Rússia (AFC Champions + Arábia Saudita, Japão & Rússia)',
        subtitle: 'Vagas diretas na Liga dos Campeões da AFC e no Mundial de Clubes FIFA',
        options: [
          { id: 'ALL', label: 'Todas Ásia & Rússia', emoji: '🌏', count: totalAsia, accent: 'amber' },
          ...asiaIntOptions,
          ...asiaRusDomesticOptions,
        ],
      };
    }

    if (categoryFilter === 'AFRICA') {
      const totalAfrica = enrichedClubs.filter((c) => {
        const wlId = getClubWorldLeagueId(c.club);
        return c.club.division === 'WL' && !c.isWorldGuest && Boolean(wlId && AFRICA_LEAGUE_IDS.includes(wlId));
      }).length;
      return {
        title: 'África (Egito & Marrocos · CAF)',
        subtitle: 'Vagas diretas na Champions Internacional FIFA e no Mundial de Clubes',
        options: [
          { id: 'ALL', label: 'Todas da África', emoji: '🌍', count: totalAfrica, accent: 'amber' },
          ...africaIntOptions,
          ...africaDomesticOptions,
        ],
      };
    }

    if (categoryFilter === 'EST') {
      const totalEst = enrichedClubs.filter(
        (c) =>
          !c.isWorldGuest &&
          c.club.division !== 'EU' &&
          c.club.division !== 'SA' &&
          c.club.division !== 'WL' &&
          (c.club.division === 'EST' || allEstadualParticipantIds.has(c.club.id))
      ).length;
      return {
        title: 'Campeonatos Estaduais 2026 (27 UFs) & Copas Regionais',
        subtitle: 'Selecione um estado ou copa regional para inspecionar todos os clubes participantes',
        options: [
          { id: 'ALL', label: 'Todos dos Estaduais', emoji: '🇧🇷', count: totalEst, accent: 'emerald' },
          ...regionalCupsOptions,
          ...estaduaisOptions,
        ],
      };
    }

    if (categoryFilter === 'ALL') {
      const allOptions: LeaguePillOption[] = [
        { id: 'ALL', label: 'Todas as Ligas', emoji: '🌐', count: enrichedClubs.length, accent: 'sky' },
        ...brOptions,
        ...worldIntOptions,
        ...naDomesticOptions,
        ...asiaRusDomesticOptions,
        ...africaDomesticOptions,
        ...uefaContinentalOptions,
        ...euDomesticOptions,
        ...conmebolContinentalOptions,
        ...saDomesticOptions,
      ];
      return {
        title: `Todas as Ligas & Competições (${allOptions.length - 1} ligas disponíveis)`,
        subtitle: 'Role para o lado para navegar entre Brasil, Américas, Europa, Ásia e África',
        options: allOptions,
      };
    }

    return null;
  }, [categoryFilter, enrichedClubs, matchesSpecificLeague, allEstadualParticipantIds]);

  // Filtered and sorted club directory
  const filteredClubs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = enrichedClubs.filter((item) => {
      const { club, isWorldGuest, rivalry, countryName } = item;

      const isContinentalFilter =
        specificLeagueFilter === 'libertadores' ||
        specificLeagueFilter === 'sulamericana' ||
        specificLeagueFilter === 'copa_internacional' ||
        specificLeagueFilter === 'concacaf_champions' ||
        specificLeagueFilter === 'afc_champions' ||
        specificLeagueFilter === 'champions_league' ||
        specificLeagueFilter === 'europa_league' ||
        specificLeagueFilter === 'conference_league';

      if (categoryFilter === 'A' && (club.division !== 'A' || isWorldGuest)) return false;
      if (categoryFilter === 'B' && (club.division !== 'B' || isWorldGuest)) return false;
      if (categoryFilter === 'C' && (club.division !== 'C' || isWorldGuest)) return false;
      if (categoryFilter === 'D' && (club.division !== 'D' || isWorldGuest)) return false;
      if (categoryFilter === 'EST') {
        if (
          isWorldGuest ||
          club.division === 'EU' ||
          club.division === 'SA' ||
          club.division === 'WL' ||
          !(club.division === 'EST' || allEstadualParticipantIds.has(club.id))
        ) {
          return false;
        }
        if (!matchesSpecificLeague(club, isWorldGuest, specificLeagueFilter)) return false;
      }
      if (categoryFilter === 'SA') {
        if (!isContinentalFilter && (club.division !== 'SA' || isWorldGuest)) return false;
        if (!matchesSpecificLeague(club, isWorldGuest, specificLeagueFilter)) return false;
      }
      if (categoryFilter === 'NA') {
        const wlId = getClubWorldLeagueId(club);
        if (
          !isContinentalFilter &&
          (club.division !== 'WL' || isWorldGuest || !wlId || !NORTH_AMERICAN_LEAGUE_IDS.includes(wlId))
        ) {
          return false;
        }
        if (!matchesSpecificLeague(club, isWorldGuest, specificLeagueFilter)) return false;
      }
      if (categoryFilter === 'ASIA_RUS') {
        const wlId = getClubWorldLeagueId(club);
        if (
          !isContinentalFilter &&
          (club.division !== 'WL' || isWorldGuest || !wlId || !ASIA_RUSSIA_LEAGUE_IDS.includes(wlId))
        ) {
          return false;
        }
        if (!matchesSpecificLeague(club, isWorldGuest, specificLeagueFilter)) return false;
      }
      if (categoryFilter === 'AFRICA') {
        const wlId = getClubWorldLeagueId(club);
        if (
          !isContinentalFilter &&
          (club.division !== 'WL' || isWorldGuest || !wlId || !AFRICA_LEAGUE_IDS.includes(wlId))
        ) {
          return false;
        }
        if (!matchesSpecificLeague(club, isWorldGuest, specificLeagueFilter)) return false;
      }
      if (categoryFilter === 'EU') {
        if (!isContinentalFilter && (club.division !== 'EU' || isWorldGuest)) return false;
        if (!matchesSpecificLeague(club, isWorldGuest, specificLeagueFilter)) return false;
      }
      if (categoryFilter === 'ALL') {
        if (!matchesSpecificLeague(club, isWorldGuest, specificLeagueFilter)) return false;
      }
      if (categoryFilter === 'WORLD' && !isWorldGuest) return false;
      if (categoryFilter === 'RIVALS' && !rivalry?.isDerby) return false;

      if (!q) return true;

      const matchesClubMeta =
        club.name.toLowerCase().includes(q) ||
        club.shortName.toLowerCase().includes(q) ||
        club.initials.toLowerCase().includes(q) ||
        (club.state && club.state.toLowerCase().includes(q)) ||
        countryName.toLowerCase().includes(q) ||
        club.stadium.name.toLowerCase().includes(q) ||
        club.managerName.toLowerCase().includes(q);

      if (matchesClubMeta) return true;

      return club.squad.some((p) => p.name.toLowerCase().includes(q));
    });

    return list.sort((a, b) => {
      if (sortBy === 'OVR_DESC') return b.avgOvr - a.avgOvr || b.squadValue - a.squadValue;
      if (sortBy === 'VALUE_DESC') return b.squadValue - a.squadValue;
      if (sortBy === 'BUDGET_DESC') return b.club.finances.balance - a.club.finances.balance;
      if (sortBy === 'STADIUM_DESC') return b.club.stadium.capacity - a.club.stadium.capacity;
      if (sortBy === 'REP_DESC') return b.club.reputation - a.club.reputation || b.avgOvr - a.avgOvr;
      return a.club.name.localeCompare(b.club.name, 'pt-BR');
    });
  }, [
    enrichedClubs,
    categoryFilter,
    specificLeagueFilter,
    matchesSpecificLeague,
    searchQuery,
    sortBy,
    allEstadualParticipantIds,
  ]);

  useEffect(() => {
    if (
      filteredClubs.length > 0 &&
      !filteredClubs.some((item) => item.club.id === selectedClubId)
    ) {
      setSelectedClubId(filteredClubs[0].club.id);
    }
  }, [categoryFilter, specificLeagueFilter, filteredClubs, selectedClubId]);

  const selectedEntry = useMemo(() => {
    return (
      filteredClubs.find((e) => e.club.id === selectedClubId) ||
      enrichedClubs.find((e) => e.club.id === selectedClubId) ||
      filteredClubs[0] ||
      enrichedClubs[0]
    );
  }, [enrichedClubs, filteredClubs, selectedClubId]);

  const selectedClub = selectedEntry.club;
  const userEntry = useMemo(
    () => enrichedClubs.find((e) => e.club.id === userClub.id) || enrichedClubs[0],
    [enrichedClubs, userClub.id]
  );

  const isSelectedUserClub = selectedClub.id === userClub.id;
  const isCareerClub = useMemo(
    () => careerClubs.some((c) => c.id === selectedClub.id),
    [careerClubs, selectedClub.id]
  );

  const windowStatus = useMemo(
    () => getTransferWindowStatus(gameState.currentDate, userClub),
    [gameState.currentDate, userClub]
  );

  // Open Player Modal with calibrated initial proposal values
  const handleOpenPlayerInspector = (player: Player) => {
    soundEngine.playClick();
    // Always get fresh player reference from selectedClub
    const fresh = selectedClub.squad.find((p) => p.id === player.id) || player;
    const baseMarket = Math.max(10_000, fresh.askingPrice || fresh.marketValue || 50_000);
    const recommendedOffer = fresh.isListedForSale
      ? baseMarket
      : Math.round(baseMarket * (fresh.isStarter ? 1.18 : 1.05));
    const recommendedWage = Math.max(1_500, Math.round(fresh.wage * 1.12));
    const buyoutStep = baseMarket < 250_000 ? 10_000 : 50_000;

    setInspectedPlayer(fresh);
    setDealTab('BUY');
    setOfferFee(recommendedOffer);
    setOfferWage(recommendedWage);
    setOfferContractYears(fresh.age >= 34 ? 2 : fresh.age <= 22 ? 4 : 3);
    setLoanDuration(19);
    setLoanWagePct(fresh.overall >= 80 ? 80 : 60);
    setLoanFeeOffer(fresh.isStarter ? Math.round(baseMarket * 0.12) : 0);
    setLoanEnableBuyOption(true);
    setLoanBuyOptionOffer(Math.max(10_000, Math.round((baseMarket * 1.15) / buyoutStep) * buyoutStep));
    setLoanSuggestedBuyout(null);
    setDealFeedback(null);
  };

  // Filtered & sorted squad of selected club
  const displayedSquad = useMemo(() => {
    const clubCountry = selectedClub.country || 'Brasil';
    const list = selectedClub.squad.filter((p) => {
      if (roleFilter !== 'ALL' && p.detailedRole !== roleFilter) return false;
      if (statusFilter === 'STARTERS' && !p.isStarter) return false;
      if (statusFilter === 'RESERVES' && p.isStarter) return false;
      if (statusFilter === 'FOREIGN' && !isForeignPlayerForClub(p, clubCountry)) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (playerSort === 'POS') return comparePlayersByPosition(a, b);
      if (playerSort === 'OVR') {
        if (b.overall !== a.overall) return b.overall - a.overall;
        return Number(b.isStarter) - Number(a.isStarter);
      }
      if (playerSort === 'VALUE') return (b.marketValue || 0) - (a.marketValue || 0);
      if (playerSort === 'WAGE') return (b.wage || 0) - (a.wage || 0);
      if (playerSort === 'AGE') return a.age - b.age || b.overall - a.overall;
      return (b.goals || 0) - (a.goals || 0) || (b.assists || 0) - (a.assists || 0);
    });
  }, [selectedClub, roleFilter, statusFilter, playerSort]);

  // Starters for 2D Tactical Pitch Preview
  const clubStarters = useMemo(() => {
    const explicit = selectedClub.squad.filter((p) => p.isStarter);
    if (explicit.length >= 11) return explicit.slice(0, 11);
    return [...selectedClub.squad].sort((a, b) => b.overall - a.overall).slice(0, 11);
  }, [selectedClub.squad]);

  const pitchCoordsMap = useMemo(
    () => calculatePitchSlots(clubStarters, true),
    [clubStarters]
  );

  // Nationality distribution for selected club
  const nationalityBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    const clubCountry = selectedClub.country || 'Brasil';
    for (const p of selectedClub.squad) {
      const nat = resolvePlayerNationality(p, clubCountry);
      counts.set(nat, (counts.get(nat) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([country, count]) => ({
        country,
        count,
        meta: getNationalityInfo(country, clubCountry),
      }))
      .sort((a, b) => b.count - a.count);
  }, [selectedClub]);

  // Standings & Competition Participation for selected club
  const clubCompetitionSummaries = useMemo(() => {
    const pools: Array<{
      compKey: keyof typeof COMPETITIONS_CATALOG;
      standings?: Standing[];
    }> = [
      { compKey: 'serie_a', standings: gameState.standingsA },
      { compKey: 'serie_b', standings: gameState.standingsB },
      { compKey: 'serie_c', standings: gameState.standingsC },
      { compKey: 'serie_d', standings: gameState.standingsD },
      ...SOUTH_AMERICAN_LEAGUE_IDS.map((saId) => ({
        compKey: saId as keyof typeof COMPETITIONS_CATALOG,
        standings: gameState.standingsSouthAmerica?.[saId],
      })),
      ...EUROPEAN_LEAGUE_IDS.map((euId) => ({
        compKey: euId as keyof typeof COMPETITIONS_CATALOG,
        standings: gameState.standingsEurope?.[euId],
      })),
      ...WORLD_LEAGUE_IDS.map((wlId) => ({
        compKey: wlId as keyof typeof COMPETITIONS_CATALOG,
        standings: gameState.standingsWorldLeagues?.[wlId],
      })),
      { compKey: 'libertadores', standings: gameState.standingsLibertadores },
      { compKey: 'sulamericana', standings: gameState.standingsSulamericana },
      { compKey: 'champions_league', standings: gameState.standingsChampionsLeague },
      { compKey: 'europa_league', standings: gameState.standingsEuropaLeague },
      { compKey: 'conference_league', standings: gameState.standingsConferenceLeague },
      { compKey: 'copa_nordeste', standings: gameState.standingsCopaNordeste },
      { compKey: 'copa_verde', standings: gameState.standingsCopaVerde },
      { compKey: 'estadual', standings: gameState.standingsEstadual },
    ];

    const results: Array<{
      compId: string;
      compName: string;
      badgeEmoji: string;
      group?: string;
      position: number;
      totalTeams: number;
      row: Standing;
    }> = [];

    for (const pool of pools) {
      if (!pool.standings || pool.standings.length === 0) continue;
      const foundRow = pool.standings.find((s) => s.teamId === selectedClub.id);
      if (!foundRow) continue;

      const peerTable = foundRow.group
        ? pool.standings.filter((s) => s.group === foundRow.group)
        : pool.standings;
      const sortedPeers = [...peerTable].sort(
        (a, b) =>
          b.points - a.points ||
          b.won - a.won ||
          b.goalDifference - a.goalDifference ||
          b.goalsFor - a.goalsFor
      );
      const pos = sortedPeers.findIndex((s) => s.teamId === selectedClub.id) + 1;
      const meta = COMPETITIONS_CATALOG[pool.compKey];

      results.push({
        compId: pool.compKey,
        compName: meta?.name || pool.compKey,
        badgeEmoji: meta?.badgeEmoji || '🏆',
        group: foundRow.group,
        position: pos,
        totalTeams: sortedPeers.length,
        row: foundRow,
      });
    }

    return results;
  }, [gameState, selectedClub.id]);

  // Fixtures involving selected club
  const clubFixtures = useMemo(() => {
    return allFixtures
      .filter(
        (f) => f.homeTeamId === selectedClub.id || f.awayTeamId === selectedClub.id
      )
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [allFixtures, selectedClub.id]);

  const clubTrophies = useMemo(() => {
    return (gameState.trophyHistory || []).filter(
      (t) =>
        t.championTeamName.toLowerCase() === selectedClub.name.toLowerCase() ||
        t.championTeamName.toLowerCase() === selectedClub.shortName.toLowerCase()
    );
  }, [gameState.trophyHistory, selectedClub.name, selectedClub.shortName]);

  // Evaluate direct permanent transfer acceptance when buying from AI club
  const handleExecutePermanentPurchase = () => {
    if (!inspectedPlayer || !isCareerClub || isSelectedUserClub) return;
    soundEngine.playClick();

    const pendingExisting = findPendingTransferForPlayer(
      gameState.pendingTransfers,
      inspectedPlayer.id
    );
    if (pendingExisting) {
      setDealFeedback({
        success: false,
        message: `Este atleta já possui transferência agendada para ${pendingExisting.toClubName} em ${pendingExisting.arrivalDisplayDate}.`,
      });
      return;
    }

    const banCheck = isClubUnderTransferBan(userClub, gameState.currentDate);
    if (banCheck.banned) {
      setDealFeedback({
        success: false,
        message: banCheck.reason || 'Transfer Ban ativo no STJD! Contratações bloqueadas.',
      });
      return;
    }

    if (!canClubRegisterNewPlayer(userClub, gameState.pendingTransfers, false)) {
      setDealFeedback({
        success: false,
        message: `Seu elenco atingiu o limite máximo de ${MAX_SQUAD_SIZE} jogadores (${userClub.squad.length}/${MAX_SQUAD_SIZE}). Venda/empreste um atleta ou faça uma troca no Mercado da Bola antes de contratar.`,
      });
      return;
    }

    const overdraftLimit = getClubOverdraftLimit(userClub);
    if (userClub.finances.balance - offerFee < -overdraftLimit) {
      setDealFeedback({
        success: false,
        message: `Limite bancário excedido no ${userClub.shortName}! Limite máximo no vermelho: -${formatCurrency(
          overdraftLimit
        )}.`,
      });
      return;
    }

    const willingness = evaluatePlayerClubWillingness(userClub, inspectedPlayer, {
      dealType: 'PURCHASE',
      sellerClub: selectedClub,
    });
    if (!willingness.willing) {
      soundEngine.playWhistle(false);
      setDealFeedback({
        success: false,
        message:
          willingness.reason ||
          `${inspectedPlayer.name} (OVR ${inspectedPlayer.overall}) recusou transferir-se para o ${userClub.shortName}.`,
      });
      return;
    }

    const baseVal = Math.max(10_000, inspectedPlayer.askingPrice || inspectedPlayer.marketValue || 50_000);
    const minClubFee = inspectedPlayer.isListedForSale
      ? Math.round(baseVal * 0.92)
      : inspectedPlayer.isStarter
      ? Math.round(baseVal * 1.12)
      : Math.round(baseVal * 0.98);

    if (offerFee < minClubFee) {
      setDealFeedback({
        success: false,
        message: `A diretoria do ${selectedClub.name} recusou a proposta! Eles exigem pelo menos ${formatCurrency(minClubFee)} para liberar ${inspectedPlayer.name}.`,
      });
      return;
    }

    const repDiff = Math.max(0, selectedClub.reputation - userClub.reputation);
    const minPlayerWage = Math.round(inspectedPlayer.wage * (1 + repDiff * 0.08));
    if (offerWage < minPlayerWage) {
      setDealFeedback({
        success: false,
        message: `O empresário de ${inspectedPlayer.name} recusou a proposta salarial. Pedido mínimo: ${formatCurrency(minPlayerWage)}/mês.`,
      });
      return;
    }

    if (inspectedPlayer.age >= 35 && offerContractYears > 3) {
      setDealFeedback({
        success: false,
        message: `${inspectedPlayer.name} (${inspectedPlayer.age} anos) aceita contratos de no máximo 3 anos.`,
      });
      return;
    }

    const ok = onSignPlayer(
      inspectedPlayer,
      offerFee,
      offerWage,
      selectedClub.id,
      undefined,
      offerContractYears
    );
    const yearsLabel = `${offerContractYears} ${offerContractYears === 1 ? 'ano' : 'anos'}`;
    if (ok) {
      soundEngine.playFanfare();
      confetti({ particleCount: 55, spread: 65 });
      setDealFeedback({
        success: true,
        message: windowStatus.isOpen
          ? `Negócio fechado! ${inspectedPlayer.name} assinou contrato de ${yearsLabel} com o ${userClub.name} e já está integrado ao seu elenco!`
          : `Acordo assinado (${yearsLabel})! Como a janela está fechada, ${inspectedPlayer.name} se apresentará ao ${userClub.name} em ${windowStatus.nextOpenDisplay}!`,
      });
    } else {
      setDealFeedback({
        success: false,
        message: 'Não foi possível concluir a negociação neste momento.',
      });
    }
  };

  const handleExecuteReleaseClause = () => {
    if (!inspectedPlayer || !isCareerClub || isSelectedUserClub) return;
    soundEngine.playClick();
    const res = onPayReleaseClause(
      inspectedPlayer.id,
      selectedClub.id,
      offerWage,
      offerContractYears
    );
    if (res.accepted) {
      soundEngine.playFanfare();
      confetti({ particleCount: 65, spread: 70 });
    }
    setDealFeedback({
      success: res.accepted,
      message: res.feedbackText,
    });
  };

  const handleExecuteLoanProposal = (overrideBuyoutValue?: number) => {
    if (!inspectedPlayer || !isCareerClub || isSelectedUserClub) return;
    soundEngine.playClick();

    if (!canClubRegisterNewPlayer(userClub, gameState.pendingTransfers, false)) {
      setDealFeedback({
        success: false,
        message: `Seu elenco atingiu o limite máximo de ${MAX_SQUAD_SIZE} jogadores (${userClub.squad.length}/${MAX_SQUAD_SIZE}). Venda ou empreste um atleta antes de receber reforços por empréstimo.`,
      });
      return;
    }

    const effectiveBuyout = loanEnableBuyOption
      ? overrideBuyoutValue ?? loanBuyOptionOffer
      : undefined;
    if (overrideBuyoutValue !== undefined) {
      setLoanBuyOptionOffer(overrideBuyoutValue);
    }

    const evalRes = evaluateLoanProposal(
      userClub,
      selectedClub,
      inspectedPlayer,
      loanDuration,
      loanWagePct,
      effectiveBuyout,
      loanFeeOffer,
      {
        transferHistory: gameState.transferHistory,
        currentSeasonYear: gameState.currentSeasonYear,
        saSeasonYear: gameState.saSeasonYear,
        europeSeasonYear: gameState.europeSeasonYear,
      }
    );

    if (!evalRes.accepted) {
      setLoanSuggestedBuyout(evalRes.suggestedFee ?? null);
      setDealFeedback({
        success: false,
        message: evalRes.message,
      });
      return;
    }

    const ok = onLoanInPlayer(
      inspectedPlayer,
      selectedClub.id,
      loanDuration,
      loanWagePct,
      effectiveBuyout,
      loanFeeOffer
    );

    if (ok) {
      soundEngine.playFanfare();
      setLoanSuggestedBuyout(null);
      const durationText =
        loanDuration >= 38 ? '1 ano (38 rodadas)' : '6 meses (19 rodadas)';
      setDealFeedback({
        success: true,
        message: windowStatus.isOpen
          ? `Empréstimo fechado! ${inspectedPlayer.name} chegou ao ${userClub.name} por ${durationText}${effectiveBuyout ? ` com passe fixado em ${formatCurrency(effectiveBuyout)}` : ''}.`
          : `Empréstimo de ${durationText} assinado! ${inspectedPlayer.name} se apresentará ao ${userClub.name} na abertura da janela em ${windowStatus.nextOpenDisplay}.`,
      });
    } else {
      setDealFeedback({
        success: false,
        message: 'Não foi possível concluir o empréstimo (cota de 3/temporada ou movimentação pendente).',
      });
    }
  };

  // Estimated stadium matchday attendance & gate revenue for selectedClub
  const estPriceFactor = Math.max(0.3, 1.2 - (selectedClub.stadium.ticketPrice / 100) * 0.6);
  const estAttendance = Math.round(selectedClub.stadium.capacity * estPriceFactor * 0.75);
  const estGateRevenue = estAttendance * selectedClub.stadium.ticketPrice;

  const captainPlayer = selectedClub.squad.find(
    (p) => p.id === selectedClub.tactics.captainId
  ) || clubStarters[0];
  const penaltyPlayer = selectedClub.squad.find(
    (p) => p.id === selectedClub.tactics.penaltyTakerId
  ) || clubStarters[clubStarters.length - 1];

  const categoryTabs: Array<{ id: ClubCategoryFilter; label: string; count: number }> = [
    { id: 'ALL', label: 'Todos', count: enrichedClubs.length },
    {
      id: 'A',
      label: 'Série A',
      count: enrichedClubs.filter((c) => c.club.division === 'A' && !c.isWorldGuest).length,
    },
    {
      id: 'B',
      label: 'Série B',
      count: enrichedClubs.filter((c) => c.club.division === 'B' && !c.isWorldGuest).length,
    },
    {
      id: 'C',
      label: 'Série C',
      count: enrichedClubs.filter((c) => c.club.division === 'C' && !c.isWorldGuest).length,
    },
    {
      id: 'D',
      label: 'Série D',
      count: enrichedClubs.filter((c) => c.club.division === 'D' && !c.isWorldGuest).length,
    },
    {
      id: 'EST',
      label: 'Estaduais (27)',
      count: enrichedClubs.filter(
        (c) =>
          !c.isWorldGuest &&
          c.club.division !== 'EU' &&
          c.club.division !== 'SA' &&
          c.club.division !== 'WL' &&
          (c.club.division === 'EST' || allEstadualParticipantIds.has(c.club.id))
      ).length,
    },
    {
      id: 'SA',
      label: 'Sul-Americanos',
      count: enrichedClubs.filter((c) => c.club.division === 'SA' && !c.isWorldGuest).length,
    },
    {
      id: 'NA',
      label: 'América do Norte',
      count: enrichedClubs.filter((c) => {
        const wlId = getClubWorldLeagueId(c.club);
        return c.club.division === 'WL' && !c.isWorldGuest && Boolean(wlId && NORTH_AMERICAN_LEAGUE_IDS.includes(wlId));
      }).length,
    },
    {
      id: 'EU',
      label: 'Europeus',
      count: enrichedClubs.filter((c) => c.club.division === 'EU' && !c.isWorldGuest).length,
    },
    {
      id: 'ASIA_RUS',
      label: 'Ásia & Rússia',
      count: enrichedClubs.filter((c) => {
        const wlId = getClubWorldLeagueId(c.club);
        return c.club.division === 'WL' && !c.isWorldGuest && Boolean(wlId && ASIA_RUSSIA_LEAGUE_IDS.includes(wlId));
      }).length,
    },
    {
      id: 'AFRICA',
      label: 'África',
      count: enrichedClubs.filter((c) => {
        const wlId = getClubWorldLeagueId(c.club);
        return c.club.division === 'WL' && !c.isWorldGuest && Boolean(wlId && AFRICA_LEAGUE_IDS.includes(wlId));
      }).length,
    },
    {
      id: 'WORLD',
      label: 'Mundiais',
      count: enrichedClubs.filter((c) => c.isWorldGuest).length,
    },
    {
      id: 'RIVALS',
      label: 'Rivais',
      count: enrichedClubs.filter((c) => c.rivalry?.isDerby).length,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Page Title & Global Summary Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Central de Clubes & Outros Times</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 text-sky-300 border border-slate-800 tabular-nums">
                {enrichedClubs.length} clubes mapeados
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspecione elencos completos, esquemas táticos, estádios, centros de treinamento, finanças e faça propostas diretas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 tabular-nums ${
              windowStatus.isOpen
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{windowStatus.shortBadge}</span>
          </div>

          {onOpenOct2026GlobalSyncModal && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenOct2026GlobalSyncModal();
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-md shadow-sky-500/20"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${
                  isSyncingOct2026Global ? 'animate-spin' : ''
                }`}
              />
              <span>
                {isSyncingOct2026Global
                  ? `Sincronizando ${getCurrentRealWorldSyncPeriod().shortLabel}...`
                  : `Atualizar Todos os Times (${getCurrentRealWorldSyncPeriod().shortLabel} IA)`}
              </span>
            </button>
          )}

          {onCalibrateOverallsWithAI && (
            <button
              type="button"
              disabled={isCalibratingOveralls}
              onClick={() => {
                soundEngine.playClick();
                onCalibrateOverallsWithAI(selectedClub.id);
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-60 border border-sky-500/35 text-sky-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {isCalibratingOveralls
                  ? 'Calibrando com IA...'
                  : 'Calibrar Overalls Reais (IA)'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onNavigateToMarket();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
            <span>Ir ao Mercado Geral</span>
          </button>
        </div>
      </div>

      {overallSyncFeedback && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{overallSyncFeedback}</span>
        </div>
      )}

      {/* Category Filter Bar (Scrollable) */}
      <ScrollableLeagueBar>
        {categoryTabs.map((tab) => {
          const active = categoryFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setCategoryFilter(tab.id);
                setSpecificLeagueFilter('ALL');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                active
                  ? 'bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-500/20'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                  active ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-950 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </ScrollableLeagueBar>

      {/* Scrollable Multi-League Bar (All Leagues, European Leagues, or South American Leagues) */}
      {multiLeagueBarConfig && (
        <ScrollableLeagueBar
          title={multiLeagueBarConfig.title}
          subtitle={multiLeagueBarConfig.subtitle}
        >
          {multiLeagueBarConfig.options.map((opt) => {
            const active = specificLeagueFilter === opt.id;
            const activeColors =
              opt.accent === 'emerald'
                ? 'bg-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/20 border-emerald-300'
                : opt.accent === 'amber'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20 border-amber-300'
                : 'bg-sky-400 text-slate-950 font-black shadow-md shadow-sky-500/20 border-sky-300';

            return (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => {
                  soundEngine.playClick();
                  setSpecificLeagueFilter(opt.id);
                  const btn = e.currentTarget;
                  const parent = btn.parentElement;
                  if (parent) {
                    const targetScroll =
                      btn.offsetLeft - parent.clientWidth / 2 + btn.clientWidth / 2;
                    parent.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 border cursor-pointer ${
                  active
                    ? activeColors
                    : 'bg-slate-900/85 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700 hover:bg-slate-800/90'
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                    active ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </ScrollableLeagueBar>
      )}

      {/* Main Split Layout: Left Directory (4 cols) + Right Detailed Club Inspector (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Club Directory & Search */}
        <aside className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-3.5 border-b border-slate-800 space-y-2.5 bg-black/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar time, país, estádio ou jogador..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-sky-500 focus:outline-none text-xs text-white placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                {filteredClubs.length} {filteredClubs.length === 1 ? 'clube' : 'clubes'}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ClubSortOption)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="OVR_DESC">Ordenar: Força (OVR)</option>
                <option value="VALUE_DESC">Ordenar: Valor de Elenco</option>
                <option value="BUDGET_DESC">Ordenar: Saldo em Caixa</option>
                <option value="STADIUM_DESC">Ordenar: Capacidade Arena</option>
                <option value="REP_DESC">Ordenar: Prestígio (★)</option>
                <option value="NAME_ASC">Ordenar: Nome (A–Z)</option>
              </select>
            </div>
          </div>

          <div className="max-h-[540px] lg:max-h-[760px] overflow-y-auto divide-y divide-slate-900">
            {filteredClubs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhum clube encontrado para os filtros aplicados.
              </div>
            ) : (
              filteredClubs.map((item) => {
                const { club, avgOvr, squadValue, rivalry, natInfo } = item;
                const sectors = getClubSectorRatings(club);
                const isSelected = club.id === selectedClub.id;
                const isMine = club.id === userClub.id;
                const q = searchQuery.trim().toLowerCase();
                const matchedPlayer =
                  q.length >= 2 && !club.name.toLowerCase().includes(q)
                    ? club.squad.find((p) => p.name.toLowerCase().includes(q))
                    : undefined;

                return (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedClubId(club.id);
                      setClubFeedback(null);
                    }}
                    className={`w-full text-left px-3.5 py-3 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/15'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ClubCrest club={club} size="md" rounded="xl" />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs sm:text-sm font-bold truncate ${
                              isSelected ? 'text-sky-300' : 'text-white'
                            }`}
                          >
                            {club.name}
                          </span>
                          {isMine && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                              Você
                            </span>
                          )}
                          {rivalry?.isDerby && !isMine && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                              Rival
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                          <span>{natInfo.flag}</span>
                          <span>
                            {club.country && club.country !== 'Brasil'
                              ? club.country
                              : club.state}
                          </span>
                          <span className="text-slate-700">·</span>
                          <span>{getClubDivisionLabel(club)}</span>
                          <span className="text-slate-700">·</span>
                          <span className="font-mono tabular-nums text-[10px] text-slate-400">
                            D:{sectors.defense} M:{sectors.midfield} A:{sectors.attack}
                          </span>
                        </div>

                        {matchedPlayer && (
                          <div className="text-[10px] text-emerald-400 font-semibold truncate mt-0.5">
                            Atleta no elenco: {matchedPlayer.name} (OVR {matchedPlayer.overall})
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-mono font-black text-xs text-sky-300 tabular-nums">
                        <span>{avgOvr}</span>
                        <span className="text-[9px] font-semibold text-slate-500">OVR</span>
                        {sectors.deltaOverall !== 0 && (
                          <span
                            className={`text-[9px] font-bold ${
                              sectors.deltaOverall > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {sectors.deltaOverall > 0 ? `+${sectors.deltaOverall}` : sectors.deltaOverall}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 tabular-nums mt-0.5">
                        {formatCompactCurrency(squadValue)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Detailed Club Inspector */}
        <section className="lg:col-span-8 space-y-5 min-w-0">
          {/* Selected Club Identity & KPI Header */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Club Colors Top Bar */}
            <div
              className="h-2 w-full"
              style={{
                background: `linear-gradient(90deg, ${selectedClub.colors.primary} 0%, ${selectedClub.colors.secondary} 100%)`,
              }}
            />

            <div className="p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <ClubCrest club={selectedClub} size="xl" rounded="2xl" />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {selectedClub.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-bold">
                        {getClubDivisionLabel(selectedClub)}
                      </span>
                      {isSelectedUserClub && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                          Seu Clube Atual
                        </span>
                      )}
                      {selectedEntry.rivalry?.isDerby && !isSelectedUserClub && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          <span>{selectedEntry.rivalry.derbyName}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1.5">
                      <span className="flex items-center gap-1 text-slate-200 font-medium">
                        <span>{selectedEntry.natInfo.flag}</span>
                        <span>
                          {selectedClub.country && selectedClub.country !== 'Brasil'
                            ? selectedClub.country
                            : `Brasil (${selectedClub.state})`}
                        </span>
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className="inline-flex items-center gap-1.5">
                        {selectedClub.managerPhotoUrl && (
                          <img
                            src={selectedClub.managerPhotoUrl}
                            alt={selectedClub.managerName}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                            className="w-5 h-5 rounded-full object-cover object-top border border-white/20 shrink-0"
                          />
                        )}
                        <span>
                          Técnico:{' '}
                          <strong className="text-sky-300">{selectedClub.managerName}</strong>
                        </span>
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className="text-amber-400 font-bold">
                        {'★'.repeat(Math.max(1, Math.min(5, selectedClub.reputation)))}{' '}
                        <span className="text-slate-400 font-normal">
                          ({selectedClub.reputation}/5 Prestígio)
                        </span>
                      </span>
                    </div>

                    {/* Sector Strength Strip: DEF · MEI · ATA + Season Trend */}
                    {(() => {
                      const sec = getClubSectorRatings(selectedClub);
                      return (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {[
                            { label: 'GERAL', val: sec.overall, delta: sec.deltaOverall, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
                            { label: 'DEFESA', val: sec.defense, delta: sec.deltaDefense, color: 'text-sky-300 border-sky-500/30 bg-sky-500/10' },
                            { label: 'MEIO', val: sec.midfield, delta: sec.deltaMidfield, color: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
                            { label: 'ATAQUE', val: sec.attack, delta: sec.deltaAttack, color: 'text-rose-300 border-rose-500/30 bg-rose-500/10' },
                          ].map((badge) => (
                            <div
                              key={badge.label}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-mono tabular-nums flex items-center gap-1.5 ${badge.color}`}
                            >
                              <span className="text-[10px] font-bold opacity-80">{badge.label}</span>
                              <strong className="font-black text-sm">{badge.val}</strong>
                              {badge.delta !== 0 && (
                                <span
                                  className={`text-[10px] font-bold ${
                                    badge.delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  ({badge.delta > 0 ? `+${badge.delta}` : badge.delta})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Career Action & October 2026 AI Squad Sync Buttons */}
                {isCareerClub && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onSyncClubOct2026Squad && (
                      <button
                        type="button"
                        disabled={Boolean(syncingOct2026Target)}
                        onClick={() => {
                          soundEngine.playClick();
                          onSyncClubOct2026Squad(selectedClub.id);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-50 border border-sky-400/40 text-xs font-bold text-sky-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title={`Pesquisar com IA o elenco real de ${getCurrentRealWorldSyncPeriod().fullLabel} deste clube e completar até 30 jogadores`}
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 text-sky-400 ${
                            syncingOct2026Target === `club:${selectedClub.id}` ? 'animate-spin' : ''
                          }`}
                        />
                        <span>
                          {syncingOct2026Target === `club:${selectedClub.id}`
                            ? `Pesquisando ${getCurrentRealWorldSyncPeriod().shortLabel}...`
                            : `Elenco ${getCurrentRealWorldSyncPeriod().shortLabel} IA (30)`}
                        </span>
                      </button>
                    )}

                    {!isSelectedUserClub && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          const res = onApplyToClubJob(selectedClub.id);
                          if (res.accepted) {
                            soundEngine.playFanfare();
                          }
                          setClubFeedback({
                            positive: res.accepted,
                            message: res.feedbackText,
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Enviar currículo para assumir o comando técnico deste clube"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                        <span>Candidatar-se ao Cargo</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {oct2026SyncFeedback && (
                <div className="p-3 rounded-xl bg-sky-950/50 border border-sky-500/40 text-xs text-sky-100 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{oct2026SyncFeedback}</span>
                    </div>
                    {onDismissOct2026Feedback && (
                      <button
                        type="button"
                        onClick={onDismissOct2026Feedback}
                        className="text-slate-400 hover:text-white cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {oct2026GroundingSources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-sky-500/20 text-[11px]">
                      <span className="text-slate-400 font-semibold">Fontes {getCurrentRealWorldSyncPeriod().shortLabel}:</span>
                      {oct2026GroundingSources.slice(0, 5).map((src, idx) => (
                        <a
                          key={`${src.uri}-${idx}`}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-sky-300 hover:text-sky-200 transition-colors"
                        >
                          <span className="truncate max-w-[180px]">{src.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {clubFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 ${
                    clubFeedback.positive
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <span>{clubFeedback.message}</span>
                  <button
                    type="button"
                    onClick={() => setClubFeedback(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 6-Metric Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 pt-2 border-t border-slate-900">
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Força Média
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-lg font-black font-mono text-sky-400 tabular-nums">
                      {selectedEntry.avgOvr}
                    </span>
                    {!isSelectedUserClub && (
                      <span
                        className={`text-[10px] font-mono font-bold tabular-nums ${
                          selectedEntry.avgOvr > userEntry.avgOvr
                            ? 'text-rose-400'
                            : selectedEntry.avgOvr < userEntry.avgOvr
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {selectedEntry.avgOvr - userEntry.avgOvr > 0
                          ? `+${selectedEntry.avgOvr - userEntry.avgOvr} vs você`
                          : selectedEntry.avgOvr - userEntry.avgOvr < 0
                          ? `${selectedEntry.avgOvr - userEntry.avgOvr} vs você`
                          : '= seu time'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Valor do Elenco
                  </span>
                  <span className="text-sm font-black font-mono text-emerald-400 tabular-nums mt-1 block">
                    {formatCompactCurrency(selectedEntry.squadValue)}
                  </span>
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    {selectedClub.squad.length}/{MAX_SQUAD_SIZE} atletas
                  </span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Saldo em Caixa
                  </span>
                  <span className="text-sm font-black font-mono text-white tabular-nums mt-1 block">
                    {formatCompactCurrency(selectedClub.finances.balance)}
                  </span>
                  <span className="text-[10px] text-slate-500">Orçamento atual</span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Folha Mensal
                  </span>
                  <span className="text-sm font-black font-mono text-rose-300 tabular-nums mt-1 block">
                    {formatCompactCurrency(selectedEntry.payroll)}
                  </span>
                  <span className="text-[10px] text-slate-500">Salários do plantel</span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Estádio / Arena
                  </span>
                  <span className="text-sm font-black font-mono text-white tabular-nums mt-1 block">
                    {selectedClub.stadium.capacity.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate block">
                    {selectedClub.stadium.name}
                  </span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Infraestrutura
                  </span>
                  <span className="text-sm font-black font-mono text-amber-300 tabular-nums mt-1 block">
                    CT {selectedClub.finances.trainingFacilityLevel}/5 · Base{' '}
                    {selectedClub.finances.youthAcademyLevel}/5
                  </span>
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    DM Nível {selectedClub.finances.medicalFacilityLevel}/5
                  </span>
                </div>
              </div>

              {/* Inspector Sub-Navigation Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-900 scrollbar-none">
                {[
                  {
                    id: 'squad' as const,
                    label: `Elenco & Tática (${selectedClub.squad.length})`,
                    icon: Users,
                  },
                  {
                    id: 'structures' as const,
                    label: 'Estruturas & Estádio',
                    icon: Building2,
                  },
                  {
                    id: 'finances' as const,
                    label: 'Finanças & Folha',
                    icon: Wallet,
                  },
                  {
                    id: 'matches' as const,
                    label: `Competições & Jogos (${clubFixtures.length})`,
                    icon: Trophy,
                  },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = subTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSubTab(t.id);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                        active
                          ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SUB-TAB 1: ELENCO & TÁTICA                                            */}
          {/* ===================================================================== */}
          {subTab === 'squad' && (
            <div className="space-y-5">
              {/* Tactical DNA + Collapsible 2D Pitch of 11 Starters */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-sky-400" />
                    <h4 className="text-sm font-black text-white">
                      Esquema Tático & Time Titular ({selectedClub.tactics.formation})
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setShowPitchPreview((v) => !v);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-sky-300 cursor-pointer"
                  >
                    {showPitchPreview ? 'Ocultar Campo 2D' : 'Mostrar Campo 2D'}
                  </button>
                </div>

                {showPitchPreview && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
                    {/* Horizontal 2D Tactical Pitch */}
                    <div className="xl:col-span-7 relative h-64 sm:h-72 rounded-2xl overflow-hidden border border-emerald-500/30 bg-gradient-to-r from-emerald-950 via-emerald-900/90 to-emerald-950 shadow-inner select-none">
                      {/* Pitch Lines */}
                      <div className="absolute inset-3 border border-white/20 rounded-lg pointer-events-none" />
                      <div className="absolute top-3 bottom-3 left-1/2 w-px bg-white/20 pointer-events-none" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20 pointer-events-none" />
                      <div className="absolute top-1/4 bottom-1/4 left-3 w-12 border-r border-y border-white/20 pointer-events-none" />
                      <div className="absolute top-1/4 bottom-1/4 right-3 w-12 border-l border-y border-white/20 pointer-events-none" />

                      {clubStarters.map((p) => {
                        const pos = pitchCoordsMap.get(p.id) || { baseX: 50, baseY: 50 };
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleOpenPlayerInspector(p)}
                            style={{
                              left: `${pos.baseX}%`,
                              top: `${pos.baseY}%`,
                            }}
                            title={`${p.name} (${p.detailedRole} · OVR ${p.overall}) — Clique para ver ficha`}
                            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                          >
                            <div
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono font-black text-[11px] border-2 border-white shadow-lg group-hover:scale-110 transition-transform tabular-nums"
                              style={{
                                backgroundColor: selectedClub.colors.primary,
                                color: selectedClub.colors.text,
                              }}
                            >
                              {p.overall}
                            </div>
                            <span className="mt-0.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white whitespace-nowrap max-w-[86px] truncate border border-white/10">
                              {getPlayerShortName(p)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tactical Profile & Nationalities Summary */}
                    <div className="xl:col-span-5 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                          <span className="text-[10px] text-slate-400 uppercase block">
                            Formação Base
                          </span>
                          <strong className="text-white font-mono text-sm">
                            {selectedClub.tactics.formation}
                          </strong>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                          <span className="text-[10px] text-slate-400 uppercase block">
                            Mentalidade
                          </span>
                          <strong className="text-sky-300 text-xs">
                            {selectedClub.tactics.mentality}
                          </strong>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                          <span className="text-[10px] text-slate-400 uppercase block">
                            Estilo de Passe
                          </span>
                          <strong className="text-slate-200 text-xs">
                            {selectedClub.tactics.passing}
                          </strong>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                          <span className="text-[10px] text-slate-400 uppercase block">
                            Marcação
                          </span>
                          <strong className="text-slate-200 text-xs">
                            {selectedClub.tactics.marking}
                          </strong>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Capitão da Equipe:</span>
                          <strong className="text-amber-300 truncate">
                            {captainPlayer ? `${captainPlayer.name} (${captainPlayer.overall})` : '-'}
                          </strong>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Cobrador Oficial:</span>
                          <strong className="text-white truncate">
                            {penaltyPlayer ? penaltyPlayer.name : '-'}
                          </strong>
                        </div>
                      </div>

                      {/* Squad Nationalities Breakdown */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Nacionalidades do Elenco
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {nationalityBreakdown.map((item) => (
                            <span
                              key={item.country}
                              className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-200 font-medium inline-flex items-center gap-1 tabular-nums"
                            >
                              <span>{item.meta.flag}</span>
                              <span>{item.meta.code3}</span>
                              <strong className="text-sky-400 font-mono">{item.count}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Squad Filter Bar & Complete Player Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-black/50">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['ALL', 'GOL', 'LAT', 'ZAG', 'VOL', 'MEI', 'ATA'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setRoleFilter(r);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          roleFilter === r
                            ? 'bg-sky-400 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {r === 'ALL' ? 'Todas Pos.' : r}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(
                          e.target.value as 'ALL' | 'STARTERS' | 'RESERVES' | 'FOREIGN'
                        )
                      }
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="ALL">Todos do Elenco</option>
                      <option value="STARTERS">Apenas Titulares</option>
                      <option value="RESERVES">Apenas Reservas</option>
                      <option value="FOREIGN">Apenas Estrangeiros</option>
                    </select>

                    <select
                      value={playerSort}
                      onChange={(e) =>
                        setPlayerSort(
                          e.target.value as 'POS' | 'OVR' | 'VALUE' | 'WAGE' | 'AGE' | 'GOALS'
                        )
                      }
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="POS">Ordenar: Posição (GOL → ATA)</option>
                      <option value="OVR">Ordenar: Força (OVR)</option>
                      <option value="VALUE">Ordenar: Valor de Mercado</option>
                      <option value="WAGE">Ordenar: Maior Salário</option>
                      <option value="AGE">Ordenar: Mais Jovens</option>
                      <option value="GOALS">Ordenar: Artilharia (Gols)</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3 text-center">#</th>
                        <th className="py-3 px-2.5">Pos</th>
                        <th className="py-3 px-3">Jogador</th>
                        <th className="py-3 px-2.5 text-center">Nac.</th>
                        <th className="py-3 px-2 text-center">Id.</th>
                        <th className="py-3 px-2.5 text-center">OVR</th>
                        <th className="py-3 px-2.5 text-center">J / G / A</th>
                        <th className="py-3 px-3 text-right">Salário</th>
                        <th className="py-3 px-3 text-right">Valor de Passe</th>
                        <th className="py-3 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {displayedSquad.map((player) => {
                        const clubCountry = selectedClub.country || 'Brasil';
                        const nat = resolvePlayerNationality(player, clubCountry);
                        const natMeta = getNationalityInfo(nat, clubCountry);
                        const pendingDeal = findPendingTransferForPlayer(
                          gameState.pendingTransfers,
                          player.id
                        );

                        return (
                          <tr
                            key={player.id}
                            className="hover:bg-slate-900/60 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500 tabular-nums">
                              {player.squadNumber}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded border text-[10px] font-black ${getRoleBadgeStyle(
                                    player.detailedRole
                                  )}`}
                                >
                                  {player.detailedRole}
                                </span>
                                {player.isStarter && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    TIT
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <PlayerAvatar
                                  player={player}
                                  club={selectedClub}
                                  clubPrimaryColor={selectedClub.colors.primary}
                                  clubTextColor={selectedClub.colors.text}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playClick();
                                        inspection?.inspectPlayer(player, selectedClub);
                                      }}
                                      className="hover:text-sky-300 transition-colors cursor-pointer text-left truncate"
                                    >
                                      {player.name}
                                    </button>
                                    {selectedClub.tactics.captainId === player.id && (
                                      <span
                                        className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/40"
                                        title="Capitão"
                                      >
                                        C
                                      </span>
                                    )}
                                    {player.isLoan && (
                                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-500/30">
                                        Emp.
                                      </span>
                                    )}
                                    {player.isListedForSale && (
                                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                                        À Venda
                                      </span>
                                    )}
                                    {pendingDeal && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                                        Acordado ({pendingDeal.arrivalDisplayDate})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {player.specialSkill} · {player.preferredFoot} · Contrato:{' '}
                                    {player.contractYears} {player.contractYears === 1 ? 'ano' : 'anos'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td
                              className="py-2.5 px-2.5 text-center whitespace-nowrap"
                              title={natMeta.fullLabel}
                            >
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-200">
                                <span>{natMeta.flag}</span>
                                <span>{natMeta.code3}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-300 tabular-nums">
                              {player.age}
                            </td>
                            <td className="py-2.5 px-2.5 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-8 py-0.5 rounded font-mono font-black text-xs tabular-nums ${
                                  player.overall >= 82
                                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                    : player.overall >= 75
                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                    : 'bg-slate-900 text-slate-200 border border-slate-800'
                                }`}
                              >
                                {player.overall}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-mono text-slate-300 tabular-nums whitespace-nowrap">
                              {player.matches} / <span className="text-emerald-400">{player.goals}</span> /{' '}
                              <span className="text-sky-400">{player.assists}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                              {formatCompactCurrency(player.wage)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                              {formatCompactCurrency(player.marketValue)}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {!isSelectedUserClub && onToggleWatchlistPlayer && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      soundEngine.playClick();
                                      onToggleWatchlistPlayer(player.id);
                                    }}
                                    title={
                                      watchlistSet.has(player.id)
                                        ? 'Remover atleta da Lista de Observação'
                                        : 'Guardar atleta na Lista de Observação'
                                    }
                                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer ${
                                      watchlistSet.has(player.id)
                                        ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 hover:bg-rose-950/60 hover:border-rose-500/50 hover:text-rose-200'
                                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:border-amber-400/40 hover:text-amber-200'
                                    }`}
                                  >
                                    {watchlistSet.has(player.id) ? (
                                      <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                                    ) : (
                                      <Bookmark className="w-3.5 h-3.5" />
                                    )}
                                    <span className="hidden xl:inline">
                                      {watchlistSet.has(player.id) ? 'Na Lista' : 'Observar'}
                                    </span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenPlayerInspector(player)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer ${
                                    !isSelectedUserClub && isCareerClub
                                      ? 'bg-sky-500/20 hover:bg-sky-400 text-sky-300 hover:text-slate-950 border border-sky-500/40'
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                                  }`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>
                                    {!isSelectedUserClub && isCareerClub ? 'Negociar' : 'Ficha'}
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SUB-TAB 2: ESTRUTURAS, ESTÁDIO & COMPARATIVO                          */}
          {/* ===================================================================== */}
          {subTab === 'structures' && (
            <div className="space-y-5">
              {/* Stadium & Matchday Operations Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-5 h-5 text-sky-400" />
                    <div>
                      <h4 className="text-base font-black text-white">
                        Estádio Oficial: {selectedClub.stadium.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Patrimônio esportivo, bilheteria e quadro social do {selectedClub.shortName}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                      (
                        FACILITY_TIER_LABELS[selectedClub.stadium.level] ||
                        FACILITY_TIER_LABELS[3]
                      ).badgeClass
                    }`}
                  >
                    Arena Nível {selectedClub.stadium.level}/5 ·{' '}
                    {
                      (
                        FACILITY_TIER_LABELS[selectedClub.stadium.level] ||
                        FACILITY_TIER_LABELS[3]
                      ).label
                    }
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                      Capacidade Total
                    </span>
                    <strong className="text-lg font-black font-mono text-white tabular-nums mt-1 block">
                      {selectedClub.stadium.capacity.toLocaleString('pt-BR')}
                    </strong>
                    <span className="text-[10px] text-slate-500">lugares oficiais</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                      Ingresso Médio
                    </span>
                    <strong className="text-lg font-black font-mono text-sky-400 tabular-nums mt-1 block">
                      R$ {selectedClub.stadium.ticketPrice}
                    </strong>
                    <span className="text-[10px] text-slate-500">por torcedor</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                      Sócios-Torcedores
                    </span>
                    <strong className="text-lg font-black font-mono text-emerald-400 tabular-nums mt-1 block">
                      {selectedClub.finances.seasonTicketHolders.toLocaleString('pt-BR')}
                    </strong>
                    <span className="text-[10px] text-slate-500">adimplentes ativos</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                      Renda Est. por Jogo
                    </span>
                    <strong className="text-base font-black font-mono text-amber-300 tabular-nums mt-1 block">
                      {formatCompactCurrency(estGateRevenue)}
                    </strong>
                    <span className="text-[10px] text-slate-500 tabular-nums">
                      ~{estAttendance.toLocaleString('pt-BR')} pagantes
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Core Club Facilities Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Centro de Treinamento (CT)',
                    icon: Dumbbell,
                    level: Math.max(1, Math.min(5, selectedClub.finances.trainingFacilityLevel || 1)),
                    accentBar: 'bg-sky-400',
                    iconColor: 'text-sky-400',
                    desc: 'Estrutura de campos, academia de força e fisiologia para evolução técnica e recuperação pós-jogo.',
                    effect: `+${(selectedClub.finances.trainingFacilityLevel || 1) * 8}% eficiência de treino semanal`,
                  },
                  {
                    title: 'Departamento Médico (DM)',
                    icon: HeartPulse,
                    level: Math.max(1, Math.min(5, selectedClub.finances.medicalFacilityLevel || 1)),
                    accentBar: 'bg-rose-400',
                    iconColor: 'text-rose-400',
                    desc: ' Centro de reabilitação ortopédica, hidroterapia e prevenção de lesões musculares.',
                    effect: `-${(selectedClub.finances.medicalFacilityLevel || 1) * 10}% no tempo de recuperação clínica`,
                  },
                  {
                    title: 'Categorias de Base',
                    icon: GraduationCap,
                    level: Math.max(1, Math.min(5, selectedClub.finances.youthAcademyLevel || 1)),
                    accentBar: 'bg-amber-400',
                    iconColor: 'text-amber-400',
                    desc: 'Alojamento, captação regional e lapidação de joias Sub-15, Sub-17 e Sub-20.',
                    effect: `Potencial de revelações até OVR ${74 + (selectedClub.finances.youthAcademyLevel || 1) * 4}`,
                  },
                ].map((fac) => {
                  const Icon = fac.icon;
                  const tier = FACILITY_TIER_LABELS[fac.level] || FACILITY_TIER_LABELS[2];
                  return (
                    <div
                      key={fac.title}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${fac.iconColor}`} />
                            <h5 className="text-xs font-black text-white">{fac.title}</h5>
                          </div>
                          <span className="font-mono font-black text-xs text-white tabular-nums">
                            {fac.level}/5
                          </span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden mb-2.5 border border-slate-800">
                          <div
                            className={`h-full ${fac.accentBar} transition-all`}
                            style={{ width: `${(fac.level / 5) * 100}%` }}
                          />
                        </div>

                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold mb-2 ${tier.badgeClass}`}
                        >
                          {tier.label}
                        </span>

                        <p className="text-[11px] text-slate-400 leading-relaxed">{fac.desc}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-900 text-[11px] font-mono font-semibold text-emerald-400">
                        {fac.effect}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Side-by-Side Comparison with User's Club */}
              {!isSelectedUserClub && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-sky-400" />
                      <span>
                        Comparativo Institucional: {selectedClub.shortName} vs {userClub.shortName} (Seu Clube)
                      </span>
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        label: 'Força Média do Elenco (OVR)',
                        theirs: selectedEntry.avgOvr,
                        mine: userEntry.avgOvr,
                        fmt: (n: number) => `${n} OVR`,
                      },
                      {
                        label: 'Capacidade do Estádio',
                        theirs: selectedClub.stadium.capacity,
                        mine: userClub.stadium.capacity,
                        fmt: (n: number) => `${n.toLocaleString('pt-BR')} lugares`,
                      },
                      {
                        label: 'Centro de Treinamento (CT)',
                        theirs: selectedClub.finances.trainingFacilityLevel,
                        mine: userClub.finances.trainingFacilityLevel,
                        fmt: (n: number) => `Nível ${n}/5`,
                      },
                      {
                        label: 'Departamento Médico (DM)',
                        theirs: selectedClub.finances.medicalFacilityLevel,
                        mine: userClub.finances.medicalFacilityLevel,
                        fmt: (n: number) => `Nível ${n}/5`,
                      },
                      {
                        label: 'Categorias de Base',
                        theirs: selectedClub.finances.youthAcademyLevel,
                        mine: userClub.finances.youthAcademyLevel,
                        fmt: (n: number) => `Nível ${n}/5`,
                      },
                      {
                        label: 'Valor de Mercado do Elenco',
                        theirs: selectedEntry.squadValue,
                        mine: userEntry.squadValue,
                        fmt: (n: number) => formatCompactCurrency(n),
                      },
                      {
                        label: 'Saldo Disponível em Caixa',
                        theirs: Math.max(0, selectedClub.finances.balance),
                        mine: Math.max(0, userClub.finances.balance),
                        fmt: (n: number) => formatCompactCurrency(n),
                      },
                    ].map((row) => {
                      const total = Math.max(1, row.theirs + row.mine);
                      const theirPct = Math.round((row.theirs / total) * 100);
                      const myPct = 100 - theirPct;

                      return (
                        <div key={row.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs tabular-nums">
                            <span className="font-mono font-bold text-amber-300">
                              {selectedClub.shortName}: {row.fmt(row.theirs)}
                            </span>
                            <span className="text-slate-400 font-semibold text-[11px]">
                              {row.label}
                            </span>
                            <span className="font-mono font-bold text-sky-300">
                              {userClub.shortName}: {row.fmt(row.mine)}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${theirPct}%` }}
                            />
                            <div
                              className="h-full bg-sky-400"
                              style={{ width: `${myPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* SUB-TAB 3: FINANÇAS, PATROCÍNIOS & FOLHA SALARIAL                     */}
          {/* ===================================================================== */}
          {subTab === 'finances' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Saldo Atual em Caixa
                  </span>
                  <strong className="text-xl font-black font-mono text-sky-400 tabular-nums mt-1 block">
                    {formatCurrency(selectedClub.finances.balance)}
                  </strong>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Liquidez imediata para transferências
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Patrocínio por Rodada
                  </span>
                  <strong className="text-xl font-black font-mono text-emerald-400 tabular-nums mt-1 block">
                    {formatCurrency(selectedClub.finances.weeklySponsor)}
                  </strong>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Cotas comerciais e fornecimento esportivo (
                    {countActiveSponsors(selectedClub.sponsors)} contratos extras)
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Folha Salarial Mensal
                  </span>
                  <strong className="text-xl font-black font-mono text-rose-400 tabular-nums mt-1 block">
                    {formatCurrency(selectedEntry.payroll)}
                  </strong>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Média de{' '}
                    {formatCompactCurrency(
                      Math.round(selectedEntry.payroll / Math.max(1, selectedClub.squad.length))
                    )}{' '}
                    por atleta
                  </span>
                </div>
              </div>

              {/* Top 5 Most Valuable Stars & Top 5 Highest Paid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                    <Star className="w-4 h-4" />
                    <span>Top 5 Ativos Mais Valiosos</span>
                  </h4>
                  <div className="divide-y divide-slate-900">
                    {[...selectedClub.squad]
                      .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))
                      .slice(0, 5)
                      .map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleOpenPlayerInspector(p)}
                          className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-900/50 px-2 rounded-lg transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {idx + 1}. {p.name}
                            </div>
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              {p.detailedRole} · {p.age} anos · OVR {p.overall}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-xs text-emerald-400 tabular-nums shrink-0">
                            {formatCompactCurrency(p.marketValue)}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-300 mb-3 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>Top 5 Maiores Salários</span>
                  </h4>
                  <div className="divide-y divide-slate-900">
                    {[...selectedClub.squad]
                      .sort((a, b) => (b.wage || 0) - (a.wage || 0))
                      .slice(0, 5)
                      .map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleOpenPlayerInspector(p)}
                          className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-900/50 px-2 rounded-lg transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {idx + 1}. {p.name}
                            </div>
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              {p.detailedRole} · OVR {p.overall} · Contrato {p.contractYears}a
                            </div>
                          </div>
                          <span className="font-mono font-bold text-xs text-rose-300 tabular-nums shrink-0">
                            {formatCurrency(p.wage)}/mês
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SUB-TAB 4: COMPETIÇÕES, TROFÉUS & JOGOS NA TEMPORADA                  */}
          {/* ===================================================================== */}
          {subTab === 'matches' && (
            <div className="space-y-5">
              {/* Active Standings Summary */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Campanha nas Competições ({gameState.currentSeasonYear})</span>
                </h4>

                {clubCompetitionSummaries.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Este clube participa apenas de confrontos eliminatórios ou torneios convidados nesta temporada.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clubCompetitionSummaries.map((c) => {
                      const pct =
                        c.row.played > 0
                          ? Math.round((c.row.points / (c.row.played * 3)) * 100)
                          : 0;
                      return (
                        <div
                          key={`${c.compId}_${c.group || 'main'}`}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-bold text-white truncate">
                              {c.badgeEmoji} {c.compName}
                              {c.group ? ` · ${c.group}` : ''}
                            </div>
                            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono font-black text-xs tabular-nums shrink-0">
                              {c.position}º / {c.totalTeams}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 tabular-nums">
                            <span>
                              <strong className="text-white">{c.row.points}</strong> pts ·{' '}
                              {c.row.played}J ({c.row.won}V {c.row.drawn}E {c.row.lost}D)
                            </span>
                            <span>
                              SG {c.row.goalDifference >= 0 ? `+${c.row.goalDifference}` : c.row.goalDifference}{' '}
                              · {pct}%
                            </span>
                          </div>

                          {c.row.form.length > 0 && (
                            <div className="flex items-center gap-1 pt-1">
                              <span className="text-[10px] text-slate-500 mr-1">Forma:</span>
                              {c.row.form.slice(-5).map((res, idx) => (
                                <span
                                  key={idx}
                                  className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                                    res === 'V'
                                      ? 'bg-emerald-500 text-slate-950'
                                      : res === 'E'
                                      ? 'bg-amber-500 text-slate-950'
                                      : 'bg-rose-500 text-white'
                                  }`}
                                >
                                  {res}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {clubTrophies.length > 0 && (
                  <div className="pt-3 border-t border-slate-900">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-2">
                      Títulos Conquistados nesta Carreira ({clubTrophies.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {clubTrophies.map((t, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold tabular-nums"
                        >
                          🏆 {t.competition} ({t.year})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Season Fixtures List */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-black/50 flex items-center justify-between">
                  <h4 className="text-sm font-black text-white">
                    Calendário & Resultados do {selectedClub.shortName}
                  </h4>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    {clubFixtures.filter((f) => f.played).length} realizados ·{' '}
                    {clubFixtures.filter((f) => !f.played).length} agendados
                  </span>
                </div>

                {clubFixtures.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Nenhuma partida agendada encontrada para este clube no calendário atual.
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-900">
                    {clubFixtures.map((fix) => {
                      const home = allClubs.find((c) => c.id === fix.homeTeamId);
                      const away = allClubs.find((c) => c.id === fix.awayTeamId);
                      const compMeta = COMPETITIONS_CATALOG[fix.competition];
                      const opponent =
                        fix.homeTeamId === selectedClub.id ? away : home;

                      return (
                        <div
                          key={fix.id}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-900/50"
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                              {fix.date ? formatCalendarDate(fix.date) : `Rodada ${fix.round}`} ·{' '}
                              <span className="text-sky-400 font-sans font-semibold">
                                {compMeta?.shortName || fix.competition}
                              </span>
                              {fix.cupPhase ? ` (${fix.cupPhase})` : ''}
                            </div>
                            <div className="font-bold text-white mt-0.5 flex items-center gap-2 flex-wrap">
                              <span
                                className={
                                  fix.homeTeamId === selectedClub.id ? 'text-sky-300' : 'text-slate-200'
                                }
                              >
                                {home?.shortName || fix.homeTeamId}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono font-black text-xs tabular-nums">
                                {fix.played ? `${fix.homeScore} x ${fix.awayScore}` : 'vs'}
                              </span>
                              <span
                                className={
                                  fix.awayTeamId === selectedClub.id ? 'text-sky-300' : 'text-slate-200'
                                }
                              >
                                {away?.shortName || fix.awayTeamId}
                              </span>
                            </div>
                          </div>

                          {opponent && (
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                setSelectedClubId(opponent.id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white shrink-0 cursor-pointer"
                            >
                              Ver {opponent.shortName} →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE FICHA DO ATLETA & PROPOSTA DIRETA DE CONTRATAÇÃO / EMPRÉSTIMO    */}
      {/* ========================================================================= */}
      {inspectedPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-black/60">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-13 h-13 rounded-2xl flex flex-col items-center justify-center font-mono font-black border border-white/20 shrink-0 px-3 py-2"
                  style={{
                    backgroundColor: selectedClub.colors.primary,
                    color: selectedClub.colors.text,
                  }}
                >
                  <span className="text-lg leading-none tabular-nums">
                    {inspectedPlayer.overall}
                  </span>
                  <span className="text-[9px] font-sans uppercase tracking-wider opacity-90 mt-0.5">
                    {inspectedPlayer.detailedRole}
                  </span>
                </div>

                <div className="min-w-0">
                  <h3 className="text-lg font-black text-white truncate">
                    {inspectedPlayer.name}{' '}
                    <span className="text-slate-500 font-mono text-sm">
                      #{inspectedPlayer.squadNumber}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span>
                      {formatPlayerNationalityFull(
                        inspectedPlayer,
                        selectedClub.country || 'Brasil'
                      )}
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="tabular-nums">{inspectedPlayer.age} anos</span>
                    <span className="text-slate-700">·</span>
                    <span>{inspectedPlayer.preferredFoot}</span>
                  </div>
                  <div className="text-[11px] text-sky-400 font-semibold mt-0.5">
                    Clube atual: {selectedClub.name} ({getClubDivisionLabel(selectedClub)})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setComparingTarget({ player: inspectedPlayer, club: selectedClub });
                  }}
                  title="Comparar lado a lado com titular do seu elenco"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-sky-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                >
                  <Scale className="w-3.5 h-3.5 text-sky-400" />
                  <span>Comparar</span>
                </button>
                {!isSelectedUserClub && onToggleWatchlistPlayer && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onToggleWatchlistPlayer(inspectedPlayer.id);
                    }}
                    title={
                      watchlistSet.has(inspectedPlayer.id)
                        ? 'Remover da Lista de Observação'
                        : 'Adicionar à Lista de Observação'
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      watchlistSet.has(inspectedPlayer.id)
                        ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 hover:bg-rose-950/60 hover:border-rose-500/50 hover:text-rose-200'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-400/50 hover:text-amber-200'
                    }`}
                  >
                    {watchlistSet.has(inspectedPlayer.id) ? (
                      <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {watchlistSet.has(inspectedPlayer.id)
                        ? 'Na Lista · Remover'
                        : 'Observar Atleta'}
                    </span>
                  </button>
                )}
                {!isSelectedUserClub && onOpenWatchlist && watchlistSet.size > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setInspectedPlayer(null);
                      onOpenWatchlist();
                    }}
                    title="Abrir Minha Lista de Observação no Mercado"
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-amber-300 cursor-pointer tabular-nums"
                  >
                    <span>Ver Lista ({watchlistSet.size})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectedPlayer(null)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Player Attributes & Contract Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 block">Valor de Mercado</span>
                  <strong className="font-mono text-emerald-400 tabular-nums">
                    {formatCompactCurrency(inspectedPlayer.marketValue)}
                  </strong>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 block">Salário Atual</span>
                  <strong className="font-mono text-white tabular-nums">
                    {formatCompactCurrency(inspectedPlayer.wage)}/mês
                  </strong>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 block">Multa Rescisória</span>
                  <strong className="font-mono text-amber-300 tabular-nums">
                    {formatCompactCurrency(
                      inspectedPlayer.releaseClause ||
                        computeDefaultReleaseClause(inspectedPlayer, selectedClub)
                    )}
                  </strong>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 block">Temporada (J/G/A)</span>
                  <strong className="font-mono text-sky-300 tabular-nums">
                    {inspectedPlayer.matches}J · {inspectedPlayer.goals}G ·{' '}
                    {inspectedPlayer.assists}A
                  </strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <span>
                  Característica:{' '}
                  <strong className="text-sky-300">{inspectedPlayer.specialSkill}</strong>
                </span>
                <span className="tabular-nums text-slate-400">
                  Condição: <strong className="text-white">{inspectedPlayer.condition}%</strong> ·
                  Moral: <strong className="text-white">{inspectedPlayer.morale}</strong> ·
                  Contrato: <strong className="text-white">{inspectedPlayer.contractYears}a</strong>
                </span>
              </div>

              {/* Direct Negotiation Controls if career club & not user's own club */}
              {!isSelectedUserClub && isCareerClub ? (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      Negociar com {selectedClub.shortName}
                    </span>
                    <span className="text-[11px] font-mono text-sky-300 tabular-nums">
                      Seu Caixa: {formatCurrency(userClub.finances.balance)}
                    </span>
                  </div>

                  {!windowStatus.isOpen && (
                    <div className="px-3 py-2 rounded-xl bg-amber-950/50 border border-amber-500/30 text-[11px] text-amber-200">
                      Janela fechada no momento: você pode fechar a contratação agora e o atleta se apresentará em{' '}
                      <strong className="text-amber-300">{windowStatus.nextOpenDisplay}</strong>.
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    {(
                      [
                        { id: 'BUY', label: 'Compra Definitiva' },
                        { id: 'CLAUSE', label: 'Pagar Multa' },
                        { id: 'LOAN', label: 'Empréstimo' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setDealTab(m.id);
                          setDealFeedback(null);
                        }}
                        className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          dealTab === m.id
                            ? 'bg-sky-400 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const wCheck = evaluatePlayerClubWillingness(userClub, inspectedPlayer, {
                      dealType:
                        dealTab === 'LOAN'
                          ? 'LOAN'
                          : dealTab === 'CLAUSE'
                          ? 'RELEASE_CLAUSE'
                          : 'PURCHASE',
                      sellerClub: selectedClub,
                    });
                    if (wCheck.willing) return null;
                    return (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 leading-relaxed">
                        <strong className="text-rose-300 block mb-0.5">
                          Interesse improvável (Degrau de Divisão/Nível)
                        </strong>
                        <span>{wCheck.reason}</span>
                      </div>
                    );
                  })()}

                  {dealTab === 'BUY' && (
                    <div className="space-y-3 tabular-nums">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                            Oferta de Transferência (R$)
                          </label>
                          <input
                            type="number"
                            step={offerFee < 250_000 ? 10_000 : 100_000}
                            min={0}
                            value={offerFee}
                            onChange={(e) => setOfferFee(Math.max(0, Number(e.target.value)))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs tabular-nums focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                            Salário Mensal Oferecido (R$)
                          </label>
                          <input
                            type="number"
                            step={offerWage < 15_000 ? 500 : 5_000}
                            min={1_500}
                            value={offerWage}
                            onChange={(e) => setOfferWage(Math.max(1_500, Number(e.target.value)))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs tabular-nums focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-semibold">
                            Tempo de Contrato (Anos)
                          </span>
                          <strong className="font-mono text-sky-300">
                            {offerContractYears} {offerContractYears === 1 ? 'ano' : 'anos'}
                          </strong>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((yrs) => {
                            const blockedByAge = inspectedPlayer.age >= 35 && yrs > 3;
                            return (
                              <button
                                key={yrs}
                                type="button"
                                disabled={blockedByAge}
                                onClick={() => {
                                  soundEngine.playClick();
                                  setOfferContractYears(yrs);
                                }}
                                className={`py-1.5 rounded-lg border font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                                  offerContractYears === yrs
                                    ? 'bg-sky-400 text-slate-950 border-sky-300 font-black'
                                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                                }`}
                              >
                                {yrs} {yrs === 1 ? 'ano' : 'anos'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleExecutePermanentPurchase}
                        className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-lg shadow-sky-500/20"
                      >
                        Enviar Proposta Oficial ({formatCurrency(offerFee)} · {offerContractYears}{' '}
                        {offerContractYears === 1 ? 'ano' : 'anos'})
                      </button>
                    </div>
                  )}

                  {dealTab === 'CLAUSE' && (
                    <div className="space-y-3 tabular-nums">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Valor da Multa Rescisória:</span>
                          <strong className="font-mono text-amber-300 tabular-nums">
                            {formatCurrency(
                              inspectedPlayer.releaseClause ||
                                computeDefaultReleaseClause(inspectedPlayer, selectedClub)
                            )}
                          </strong>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Ao depositar a multa integral, o {selectedClub.shortName} não pode bloquear a saída.
                        </p>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                          Salário Mensal Oferecido ao Atleta (R$)
                        </label>
                        <input
                          type="number"
                          step={offerWage < 15_000 ? 500 : 5_000}
                          min={1_500}
                          value={offerWage}
                          onChange={(e) => setOfferWage(Math.max(1_500, Number(e.target.value)))}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs tabular-nums focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-semibold">
                            Tempo de Contrato (Anos)
                          </span>
                          <strong className="font-mono text-amber-300">
                            {offerContractYears} {offerContractYears === 1 ? 'ano' : 'anos'}
                          </strong>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((yrs) => {
                            const blockedByAge = inspectedPlayer.age >= 35 && yrs > 3;
                            return (
                              <button
                                key={yrs}
                                type="button"
                                disabled={blockedByAge}
                                onClick={() => {
                                  soundEngine.playClick();
                                  setOfferContractYears(yrs);
                                }}
                                className={`py-1.5 rounded-lg border font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                                  offerContractYears === yrs
                                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                                }`}
                              >
                                {yrs} {yrs === 1 ? 'ano' : 'anos'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleExecuteReleaseClause}
                        className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer"
                      >
                        Depositar Multa Rescisória ({offerContractYears}{' '}
                        {offerContractYears === 1 ? 'ano' : 'anos'})
                      </button>
                    </div>
                  )}

                  {dealTab === 'LOAN' && (
                    <div className="space-y-3 tabular-nums">
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                          Duração do Empréstimo
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setLoanDuration(19);
                            }}
                            className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              loanDuration === 19
                                ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            6 Meses (19 Rodadas)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setLoanDuration(38);
                            }}
                            className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              loanDuration === 38
                                ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            1 Ano (38 Rodadas)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                            Divisão Salarial
                          </label>
                          <select
                            value={loanWagePct}
                            onChange={(e) => setLoanWagePct(Number(e.target.value))}
                            className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                          >
                            <option value={30}>30% ({formatCompactCurrency(inspectedPlayer.wage * 0.3)})</option>
                            <option value={50}>50% ({formatCompactCurrency(inspectedPlayer.wage * 0.5)})</option>
                            <option value={70}>70% ({formatCompactCurrency(inspectedPlayer.wage * 0.7)})</option>
                            <option value={100}>100% ({formatCompactCurrency(inspectedPlayer.wage)})</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                            Taxa à Vista (R$)
                          </label>
                          <input
                            type="number"
                            step={loanFeeOffer < 100_000 ? 5_000 : 50_000}
                            min={0}
                            value={loanFeeOffer}
                            onChange={(e) => setLoanFeeOffer(Math.max(0, Number(e.target.value)))}
                            className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={loanEnableBuyOption}
                              onChange={(e) => setLoanEnableBuyOption(e.target.checked)}
                              className="w-4 h-4 rounded accent-emerald-400 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-white">
                              Fixar Cláusula de Opção de Compra
                            </span>
                          </label>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {loanEnableBuyOption
                              ? formatCurrency(loanBuyOptionOffer)
                              : 'Sem Opção'}
                          </span>
                        </div>

                        {loanEnableBuyOption && (
                          <>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { label: '100%', mult: 1.0 },
                                { label: '115%', mult: 1.15 },
                                { label: '130%', mult: 1.3 },
                              ].map((preset) => {
                                const baseVal = inspectedPlayer.marketValue || 50_000;
                                const step = baseVal < 250_000 ? 10_000 : 50_000;
                                const val = Math.max(
                                  10_000,
                                  Math.round((baseVal * preset.mult) / step) * step
                                );
                                return (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playClick();
                                      setLoanBuyOptionOffer(val);
                                    }}
                                    className={`py-1 rounded-lg border font-mono font-bold text-[11px] cursor-pointer transition-colors ${
                                      loanBuyOptionOffer === val
                                        ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black'
                                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                );
                              })}
                            </div>
                            <input
                              type="number"
                              step={loanBuyOptionOffer < 250_000 ? 10_000 : 100_000}
                              min={10_000}
                              value={loanBuyOptionOffer}
                              onChange={(e) =>
                                setLoanBuyOptionOffer(Math.max(10_000, Number(e.target.value)))
                              }
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-xs tabular-nums focus:outline-none focus:border-emerald-400"
                            />
                          </>
                        )}
                      </div>

                      {(() => {
                        const loanCounts = getClubSeasonLoanCounts({
                          club: userClub,
                          transferHistory: gameState.transferHistory,
                          currentSeasonYear: gameState.currentSeasonYear,
                          saSeasonYear: gameState.saSeasonYear,
                          europeSeasonYear: gameState.europeSeasonYear,
                        });
                        const quotaFull = loanCounts.loansInCount >= MAX_SEASON_LOANS_IN;
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Empréstimos recebidos nesta temporada:</span>
                              <strong className={quotaFull ? 'text-rose-400 font-mono' : 'text-emerald-300 font-mono'}>
                                {loanCounts.loansInCount}/{MAX_SEASON_LOANS_IN}
                              </strong>
                            </div>
                            <button
                              type="button"
                              disabled={quotaFull}
                              onClick={() => handleExecuteLoanProposal()}
                              className="w-full py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs transition-colors cursor-pointer"
                            >
                              {quotaFull
                                ? `Cota de ${MAX_SEASON_LOANS_IN} Empréstimos Atingida na Temporada`
                                : `Solicitar Empréstimo ao ${selectedClub.shortName}`}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {dealFeedback && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-bold space-y-2 ${
                        dealFeedback.success
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      <div>{dealFeedback.message}</div>
                      {!dealFeedback.success &&
                        dealTab === 'LOAN' &&
                        loanSuggestedBuyout &&
                        loanEnableBuyOption && (
                          <button
                            type="button"
                            onClick={() => handleExecuteLoanProposal(loanSuggestedBuyout)}
                            className="w-full py-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer tabular-nums"
                          >
                            Aceitar Passe Fixado Pedido ({formatCurrency(loanSuggestedBuyout)})
                          </button>
                        )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400">
                  {isSelectedUserClub
                    ? 'Este atleta já pertence ao elenco do seu clube.'
                    : 'Clube convidado internacional FIFA — disponível para inspeção tática e confrontos da Copa Intercontinental.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {comparingTarget && (
        <PlayerComparisonModal
          userClub={userClub}
          targetPlayer={comparingTarget.player}
          targetClub={comparingTarget.club}
          isWatchlisted={watchlistSet.has(comparingTarget.player.id)}
          onToggleWatchlist={onToggleWatchlistPlayer}
          onClose={() => setComparingTarget(null)}
        />
      )}
    </div>
  );
};

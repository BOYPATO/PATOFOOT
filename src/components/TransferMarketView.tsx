import React, { useState, useMemo, useEffect } from 'react';
import {
  Club,
  GameSave,
  MAX_SQUAD_SIZE,
  PendingTransferDeal,
  Player,
  TransferHistoryRecord,
  TransferOffer,
  TransferRumor,
  WatchlistEntry,
} from '../types/game';
import { soundEngine } from '../services/soundEngine';
import {
  getClubOverdraftLimit,
  isClubUnderTransferBan,
} from '../utils/financialFairPlayEngine';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft, 
  DollarSign, 
  Sparkles,
  Handshake,
  Calendar,
  Shield,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  TrendingUp,
  Percent,
  Check,
  Compass,
  FileSignature,
  Zap,
  RefreshCw,
  UserCheck,
  Tag,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Scale,
  Newspaper,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { PlayerComparisonModal } from './PlayerComparisonModal';
import { ClubCrest } from './ClubCrest';
import { PlayerAvatar } from './PlayerAvatar';
import { ScrollableTabStrip } from './ScrollableTabStrip';
import { comparePlayersByPosition } from '../utils/playerOrdering';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import {
  ClausePackageInput,
  computeDefaultMilestoneBonusAmount,
  computePurchaseUpfrontDiscountFactor,
  computeSaleAdjustedUpfrontOffer,
  computeSellOnClauseBuyoutPrice,
} from '../utils/transferClausesEngine';
import confetti from 'canvas-confetti';
import {
  computeRecommendedLoanTerms,
  evaluateLoanProposal,
  formatLoanDurationLabel,
  getClubSeasonLoanCounts,
  MAX_SEASON_LOANS_IN,
  MAX_SEASON_LOANS_OUT,
  previewLoanProposal,
  resolvePlayerFullMonthlyWage,
} from '../utils/loanEngine';
import { evaluatePlayerClubWillingness } from '../utils/transferWillingnessEngine';
import { daysBetween, formatCalendarDate } from '../utils/calendarUtils';
import { computeDefaultReleaseClause } from '../utils/contractLifecycleEngine';
import {
  AiRecommendedSigning,
  buildAiTransferDirectorReport,
  findInstantBuyersForPlayer,
  findSmartLoanDestinations,
  InstantBuyerQuote,
  previewPermanentOffer,
} from '../utils/aiTransferEngine';
import {
  canClubRegisterNewPlayer,
  findPendingTransferForPlayer,
  getClubProjectedSquadSize,
  getTransferWindowStatus,
} from '../utils/transferWindowEngine';
import {
  formatPlayerNationalityFull,
  getNationalityInfo,
  resolvePlayerNationality,
} from '../utils/nationalityUtils';
import {
  WatchlistAvailabilityKind,
  resolveWatchlistItems,
} from '../utils/watchlistEngine';
import {
  fetchAiTransferRumors,
  getCachedTransferRumorsForRound,
} from '../services/transferRumorsAiService';
import {
  buildFallbackTransferRumors,
  selectTransferRumorCandidates,
} from '../utils/transferRumorsEngine';

interface TransferMarketViewProps {
  userClub: Club;
  allClubs: Club[];
  freeAgents: Player[];
  transferHistory?: TransferHistoryRecord[];
  currentSeasonYear?: number;
  onSignPlayer: (
    player: Player,
    transferFee: number,
    wage: number,
    fromClubId?: string,
    swapOutPlayerId?: string,
    contractYears?: number,
    clausePkg?: ClausePackageInput
  ) => boolean;
  onBuyoutTransferClause?: (
    clauseId: string
  ) => { success: boolean; message: string };
  onSellPlayerToClub?: (
    playerId: string,
    buyerClubId: string,
    salePrice: number,
    clausePkg?: ClausePackageInput
  ) => boolean;
  onSellPlayerUrgentDeadline?: (
    playerId: string,
    buyerClubId: string,
    salePrice: number
  ) => boolean;
  onLoanInPlayer?: (
    player: Player,
    fromClubId: string,
    durationRounds: number,
    wageSharePct: number,
    buyOptionFee?: number,
    loanFee?: number
  ) => boolean;
  onLoanOutPlayer?: (
    playerId: string,
    toClubId: string,
    durationRounds: number,
    wageSharePct: number,
    buyOptionFee?: number,
    loanFeeReceived?: number
  ) => boolean;
  onTriggerBuyOption?: (
    player: Player,
    contractYears?: number,
    agreedWage?: number
  ) => boolean;
  onNegotiateLoanBuyOption?: (
    playerId: string,
    proposedBuyOptionFee: number
  ) => { accepted: boolean; message: string; suggestedFee?: number };
  onTerminateLoanEarly?: (player: Player) => boolean;
  onListPlayerForSale: (playerId: string) => void;
  onDelistPlayer: (playerId: string) => void;
  onTogglePlayerLoanList?: (playerId: string) => void;
  onOpenScouting?: () => void;
  initialTab?:
    | 'ai_director'
    | 'rumors'
    | 'sell_squad'
    | 'deadline_day'
    | 'pending_window'
    | 'watchlist'
    | 'all'
    | 'free'
    | 'bosman'
    | 'loans'
    | 'my_loans'
    | 'clauses'
    | 'history';
  initialSearchQuery?: string;
  initialSearchNonce?: number;
  gameState?: GameSave;
  watchlist?: WatchlistEntry[];
  onToggleWatchlistPlayer?: (playerId: string) => void;
  onRemoveWatchlistPlayer?: (playerId: string) => void;
  onClearWatchlist?: () => void;
  transferOffers?: TransferOffer[];
  aiDirectorAutoNegotiate?: boolean;
  onRespondTransferOffer?: (
    offerId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER'
  ) => { success: boolean; feedbackText: string };
  onShopPlayerWithAi?: (
    playerId: string
  ) => { offersGenerated: number; feedbackText: string };
  onToggleAiAutoNegotiate?: () => void;
  onSignPreContract?: (
    playerId: string,
    sellerClubId: string,
    offeredWage: number,
    contractYears: number,
    signingBonus: number
  ) => { accepted: boolean; feedbackText: string };
  onPayReleaseClause?: (
    playerId: string,
    sellerClubId: string,
    offeredWage: number,
    contractYears?: number
  ) => { accepted: boolean; feedbackText: string };
  isSyncingNationalities?: boolean;
  nationalitySyncFeedback?: string | null;
  onSyncNationalitiesWithAI?: () => void;
  onDismissNationalitySyncFeedback?: () => void;
}

export const TransferMarketView: React.FC<TransferMarketViewProps> = ({
  userClub,
  allClubs,
  freeAgents,
  transferHistory = [],
  currentSeasonYear = 2027,
  onSignPlayer,
  onBuyoutTransferClause,
  onSellPlayerToClub,
  onSellPlayerUrgentDeadline,
  onLoanInPlayer,
  onLoanOutPlayer,
  onTriggerBuyOption,
  onNegotiateLoanBuyOption,
  onTerminateLoanEarly,
  onListPlayerForSale,
  onDelistPlayer,
  onTogglePlayerLoanList,
  onOpenScouting,
  initialTab,
  initialSearchQuery,
  initialSearchNonce,
  gameState,
  watchlist,
  onToggleWatchlistPlayer,
  onRemoveWatchlistPlayer,
  onClearWatchlist,
  transferOffers = [],
  aiDirectorAutoNegotiate = false,
  onRespondTransferOffer,
  onShopPlayerWithAi,
  onToggleAiAutoNegotiate,
  onSignPreContract,
  onPayReleaseClause,
  isSyncingNationalities = false,
  nationalitySyncFeedback = null,
  onSyncNationalitiesWithAI,
  onDismissNationalitySyncFeedback,
}) => {
  const inspection = usePlayerInspection();
  const [activeTab, setActiveTab] = useState<
    | 'ai_director'
    | 'rumors'
    | 'sell_squad'
    | 'deadline_day'
    | 'pending_window'
    | 'watchlist'
    | 'all'
    | 'free'
    | 'bosman'
    | 'loans'
    | 'my_loans'
    | 'clauses'
    | 'history'
  >(initialTab || 'ai_director');

  const windowStatus = useMemo(
    () => getTransferWindowStatus(gameState?.currentDate),
    [gameState?.currentDate]
  );
  const pendingTransfers = gameState?.pendingTransfers || [];

  const [aiActionFeedback, setAiActionFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [aiOutgoingSearch, setAiOutgoingSearch] = useState<string>('');
  const [deadlineFeedback, setDeadlineFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedNationality, setSelectedNationality] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<'ALL' | 'BR' | 'EU' | 'SA' | 'WL'>('ALL');
  const [sortBy, setSortBy] = useState<'OVR_DESC' | 'POS_ASC' | 'PRICE_ASC' | 'PRICE_DESC' | 'AGE_ASC' | 'WAGE_ASC'>('OVR_DESC');
  const [onlyWithinBudget, setOnlyWithinBudget] = useState<boolean>(false);
  const [loanFilterMode, setLoanFilterMode] = useState<'EASY' | 'U23' | 'ALL'>('ALL');
  const [marketDisplayLimit, setMarketDisplayLimit] = useState<number>(48);
  const [minOverall, setMinOverall] = useState<number>(initialSearchQuery ? 40 : 60);
  const [onlyWatchlisted, setOnlyWatchlisted] = useState<boolean>(false);
  const [sellSquadFilter, setSellSquadFilter] = useState<'ALL' | 'RESERVES' | 'U23' | 'LISTED'>('ALL');
  const [sellSquadSort, setSellSquadSort] = useState<'POS_ASC' | 'VALUE_DESC' | 'OVR_DESC' | 'WAGE_DESC' | 'AGE_ASC'>('POS_ASC');
  const [sellSquadFeedback, setSellSquadFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [watchlistSearch, setWatchlistSearch] = useState<string>('');
  const [watchlistRoleFilter, setWatchlistRoleFilter] = useState<string>('ALL');
  const [watchlistAvailabilityFilter, setWatchlistAvailabilityFilter] = useState<
    'ALL' | WatchlistAvailabilityKind
  >('ALL');
  const [confirmClearWatchlist, setConfirmClearWatchlist] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'MY_CLUB' | 'SIGNINGS' | 'SALES' | 'LOANS'>('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');
  const userClubCountry = userClub.country || 'Brasil';

  // AI Transfer Rumors state
  const [transferRumors, setTransferRumors] = useState<TransferRumor[]>([]);
  const [rumorsUsedAi, setRumorsUsedAi] = useState<boolean>(false);
  const [isLoadingRumors, setIsLoadingRumors] = useState<boolean>(false);
  const [rumorsError, setRumorsError] = useState<string | null>(null);
  const [rumorsFilter, setRumorsFilter] = useState<
    'ALL' | 'USER_PLAYER_TARGET' | 'OPPORTUNITY' | 'LEAGUE_BUZZ' | 'HOT'
  >('ALL');
  const [rumorsSearch, setRumorsSearch] = useState<string>('');
  const [rumorsLoadedRoundKey, setRumorsLoadedRoundKey] = useState<string>('');
  const [rumorActionFeedback, setRumorActionFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const rumorRoundKey = gameState
    ? `${gameState.userClubId}:${gameState.currentSeasonYear}:${gameState.currentRound}`
    : `${userClub.id}:${currentSeasonYear}:0`;

  const handleLoadTransferRumors = async (forceRefresh: boolean = false) => {
    if (!gameState) return;
    setIsLoadingRumors(true);
    setRumorsError(null);
    const res = await fetchAiTransferRumors(gameState, { forceRefresh });
    setTransferRumors(res.rumors);
    setRumorsUsedAi(res.usedAi);
    setRumorsError(res.errorMessage || null);
    setRumorsLoadedRoundKey(rumorRoundKey);
    setIsLoadingRumors(false);
  };

  useEffect(() => {
    if (!gameState) return;
    const cached = getCachedTransferRumorsForRound(gameState);
    if (cached && cached.rumors.length > 0) {
      setTransferRumors(cached.rumors);
      setRumorsUsedAi(cached.usedAi);
      setRumorsError(cached.errorMessage || null);
      setRumorsLoadedRoundKey(rumorRoundKey);
      return;
    }
    if (activeTab === 'rumors' && rumorsLoadedRoundKey !== rumorRoundKey && !isLoadingRumors) {
      void handleLoadTransferRumors(false);
    }
  }, [activeTab, rumorRoundKey, gameState]);

  const teaserRumor = useMemo(() => {
    if (transferRumors.length > 0) return transferRumors[0];
    if (!gameState) return null;
    const candidates = selectTransferRumorCandidates(gameState, 2);
    const localList = buildFallbackTransferRumors(candidates);
    return localList[0] || null;
  }, [transferRumors, gameState]);

  const filteredRumors = useMemo(() => {
    const q = rumorsSearch.trim().toLowerCase();
    return transferRumors.filter((rumor) => {
      if (rumorsFilter === 'HOT' && rumor.heatLevel !== 'HOT') return false;
      if (
        rumorsFilter !== 'ALL' &&
        rumorsFilter !== 'HOT' &&
        rumor.category !== rumorsFilter
      ) {
        return false;
      }
      if (q) {
        const hay =
          `${rumor.playerName} ${rumor.currentClubName} ${rumor.interestedClubName} ${rumor.headline} ${rumor.summary} ${rumor.sourceOutlet}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transferRumors, rumorsFilter, rumorsSearch]);

  const effectiveWatchlist = watchlist ?? gameState?.watchlist ?? [];
  const watchlistIdSet = useMemo(
    () => new Set(effectiveWatchlist.map((w) => w.playerId)),
    [effectiveWatchlist]
  );

  const resolvedWatchlist = useMemo(
    () =>
      resolveWatchlistItems({
        watchlist: effectiveWatchlist,
        allClubs,
        freeAgents,
        userClub,
        pendingTransfers,
      }),
    [effectiveWatchlist, allClubs, freeAgents, userClub, pendingTransfers]
  );

  const filteredWatchlist = useMemo(() => {
    return resolvedWatchlist.filter((item) => {
      if (watchlistRoleFilter !== 'ALL' && item.player.detailedRole !== watchlistRoleFilter) {
        return false;
      }
      if (
        watchlistAvailabilityFilter !== 'ALL' &&
        item.availabilityKind !== watchlistAvailabilityFilter
      ) {
        return false;
      }
      if (watchlistSearch.trim()) {
        const q = watchlistSearch.toLowerCase();
        const pNat = resolvePlayerNationality(item.player, item.club?.country || 'Brasil');
        const matchesName = item.player.name.toLowerCase().includes(q);
        const matchesClub = item.club ? item.club.name.toLowerCase().includes(q) : 'sem clube livre'.includes(q);
        const matchesNat = pNat.toLowerCase().includes(q);
        if (!matchesName && !matchesClub && !matchesNat) return false;
      }
      return true;
    });
  }, [resolvedWatchlist, watchlistRoleFilter, watchlistAvailabilityFilter, watchlistSearch]);

  const handleToggleWatch = (playerId: string) => {
    if (!onToggleWatchlistPlayer) return;
    soundEngine.playClick();
    onToggleWatchlistPlayer(playerId);
  };

  const handleRemoveWatch = (playerId: string) => {
    soundEngine.playClick();
    if (onRemoveWatchlistPlayer) {
      onRemoveWatchlistPlayer(playerId);
    } else if (onToggleWatchlistPlayer && watchlistIdSet.has(playerId)) {
      onToggleWatchlistPlayer(playerId);
    }
  };

  const renderWatchlistButton = (playerId: string, compact: boolean = false) => {
    if (!onToggleWatchlistPlayer) return null;
    const isWatched = watchlistIdSet.has(playerId);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleWatch(playerId);
        }}
        title={
          isWatched
            ? 'Remover atleta da sua Lista de Observação'
            : 'Guardar atleta na Lista de Observação'
        }
        className={`rounded-lg border font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0 whitespace-nowrap ${
          compact ? 'px-2 py-1.5 text-[11px]' : 'px-2.5 py-1.5 text-xs'
        } ${
          isWatched
            ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 hover:bg-rose-950/60 hover:border-rose-500/50 hover:text-rose-200'
            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
        }`}
      >
        {isWatched ? (
          <BookmarkCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        ) : (
          <Bookmark className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>{isWatched ? 'Na Lista' : 'Observar'}</span>
      </button>
    );
  };

  const renderCompareButton = (player: Player, club?: Club | null, compact: boolean = true) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        soundEngine.playClick();
        setComparingTarget({ player, club });
      }}
      title="Comparar lado a lado com titular do seu elenco"
      className={`rounded-lg border border-sky-500/35 bg-slate-900 hover:bg-sky-500/15 text-sky-300 font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0 whitespace-nowrap ${
        compact ? 'px-2 py-1.5 text-[11px]' : 'px-2.5 py-1.5 text-xs'
      }`}
    >
      <Scale className="w-3.5 h-3.5 text-sky-400 shrink-0" />
      <span>Comparar</span>
    </button>
  );

  useEffect(() => {
    if (initialSearchNonce !== undefined && initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
      setSelectedRole('ALL');
      setSelectedNationality('ALL');
      if (initialSearchQuery.trim().length > 0) {
        setMinOverall(40);
      }
    }
  }, [initialSearchQuery, initialSearchNonce]);

  const [comparingTarget, setComparingTarget] = useState<{
    player: Player;
    club?: Club | null;
  } | null>(null);

  // Permanent Transfer Negotiation Modal
  const [negotiatingPlayer, setNegotiatingPlayer] = useState<{
    player: Player;
    club?: Club;
    discountFactor?: number;
  } | null>(null);
  const [offerFee, setOfferFee] = useState<number>(0);
  const [offerWage, setOfferWage] = useState<number>(0);
  const [offerContractYears, setOfferContractYears] = useState<number>(3);
  const [swapPlayerId, setSwapPlayerId] = useState<string>('');
  const [purchaseSellOnPct, setPurchaseSellOnPct] = useState<number>(0);
  const [purchaseGoalBonus, setPurchaseGoalBonus] = useState<boolean>(false);
  const [purchaseAppsBonus, setPurchaseAppsBonus] = useState<boolean>(false);
  const [clausesFeedback, setClausesFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [negotiationFeedback, setNegotiationFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  const activeTransferClauses = gameState?.transferClauses || [];

  // Bosman Pre-Contract Negotiation Modal
  const [preContractModalPlayer, setPreContractModalPlayer] = useState<{ player: Player; club: Club } | null>(null);
  const [preContractWage, setPreContractWage] = useState<number>(0);
  const [preContractYears, setPreContractYears] = useState<number>(3);
  const [preContractBonus, setPreContractBonus] = useState<number>(0);
  const [preContractFeedback, setPreContractFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Loan Negotiation Modal (6 months = 19 rounds | 1 year = 38 rounds)
  const [loanModalPlayer, setLoanModalPlayer] = useState<{ player: Player; club: Club } | null>(null);
  const [loanDuration, setLoanDuration] = useState<19 | 38>(19);
  const [loanWageShare, setLoanWageShare] = useState<number>(50);
  const [loanFee, setLoanFee] = useState<number>(0);
  const [enableBuyOption, setEnableBuyOption] = useState<boolean>(true);
  const [buyOptionValue, setBuyOptionValue] = useState<number>(0);
  const [loanSuggestedBuyout, setLoanSuggestedBuyout] = useState<number | null>(null);
  const [loanSuggestedWageShare, setLoanSuggestedWageShare] = useState<number | null>(null);
  const [loanSuggestedFee, setLoanSuggestedFee] = useState<number | null>(null);
  const [loanFeedback, setLoanFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Instant Direct Sell Modal (Mesa de Venda Rápida)
  const [sellingPlayer, setSellingPlayer] = useState<Player | null>(null);
  const [instantBuyers, setInstantBuyers] = useState<InstantBuyerQuote[]>([]);
  const [sellBlockReason, setSellBlockReason] = useState<string | undefined>(undefined);
  const [sellClausePct, setSellClausePct] = useState<number>(0);
  const [sellGoalBonus, setSellGoalBonus] = useState<boolean>(false);
  const [counteredClubs, setCounteredClubs] = useState<Record<string, 'BOOSTED' | 'FAILED'>>({});
  const [sellModalFeedback, setSellModalFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Loan Out Player Modal (Loan user's player to partner CPU clubs for 6 months or 1 year)
  const [loanOutPlayer, setLoanOutPlayer] = useState<Player | null>(null);
  const [selectedTargetClubId, setSelectedTargetClubId] = useState<string>('');
  const [loanOutDuration, setLoanOutDuration] = useState<19 | 38>(19);
  const [loanOutWageShare, setLoanOutWageShare] = useState<number>(70);
  const [loanOutEnableBuyOption, setLoanOutEnableBuyOption] = useState<boolean>(true);
  const [loanOutBuyOption, setLoanOutBuyOption] = useState<number>(0);
  const [loanOutUpfrontFee, setLoanOutUpfrontFee] = useState<number>(0);
  const [loanOutFeedback, setLoanOutFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Active Loan Buyout Exercise Modal (choose 1..5 contract years) & Clause Negotiation Modal
  const [buyoutModalPlayer, setBuyoutModalPlayer] = useState<Player | null>(null);
  const [buyoutContractYears, setBuyoutContractYears] = useState<number>(3);
  const [buyoutPermanentWage, setBuyoutPermanentWage] = useState<number>(0);
  const [buyoutFeedback, setBuyoutFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  const [clauseModalPlayer, setClauseModalPlayer] = useState<Player | null>(null);
  const [clauseProposedFee, setClauseProposedFee] = useState<number>(0);
  const [clauseSuggestedFee, setClauseSuggestedFee] = useState<number | null>(null);
  const [clauseFeedback, setClauseFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateShortBR = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Current season completed negotiations
  const seasonHistory = useMemo(
    () => transferHistory.filter((item) => item.seasonYear === currentSeasonYear),
    [transferHistory, currentSeasonYear]
  );

  const userSigningsTotal = useMemo(
    () =>
      seasonHistory
        .filter((item) => item.toClubId === userClub.id)
        .reduce((acc, item) => acc + item.fee, 0),
    [seasonHistory, userClub.id]
  );

  const userSalesTotal = useMemo(
    () =>
      seasonHistory
        .filter((item) => item.fromClubId === userClub.id)
        .reduce((acc, item) => acc + item.fee, 0),
    [seasonHistory, userClub.id]
  );

  const filteredSeasonHistory = useMemo(() => {
    return seasonHistory.filter((item) => {
      if (historyFilter === 'MY_CLUB' && item.fromClubId !== userClub.id && item.toClubId !== userClub.id) {
        return false;
      }
      if (historyFilter === 'SIGNINGS') {
        const isSigning =
          item.category === 'PURCHASE' ||
          item.category === 'SWAP' ||
          item.category === 'RELEASE_CLAUSE' ||
          item.category === 'PRE_CONTRACT' ||
          item.category === 'FREE_AGENT' ||
          item.category === 'BUY_OPTION';
        if (!isSigning) return false;
      }
      if (historyFilter === 'SALES' && item.category !== 'SALE') {
        return false;
      }
      if (historyFilter === 'LOANS' && item.category !== 'LOAN_IN' && item.category !== 'LOAN_OUT') {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchesPlayer = item.playerName.toLowerCase().includes(q);
        const matchesFrom = item.fromClubName.toLowerCase().includes(q);
        const matchesTo = item.toClubName.toLowerCase().includes(q);
        if (!matchesPlayer && !matchesFrom && !matchesTo) return false;
      }
      return true;
    });
  }, [seasonHistory, historyFilter, historySearch, userClub.id]);

  // Compile all players from other clubs
  const otherClubsPlayers: { player: Player; club: Club }[] = [];
  allClubs
    .filter((c) => c.id !== userClub.id)
    .forEach((c) => {
      c.squad.forEach((p) => {
        otherClubsPlayers.push({ player: p, club: c });
      });
    });

  const availableMarketNationalities = useMemo(() => {
    const counts = new Map<string, number>();
    otherClubsPlayers.forEach(({ player, club }) => {
      const nat = resolvePlayerNationality(player, club.country || 'Brasil');
      counts.set(nat, (counts.get(nat) || 0) + 1);
    });
    freeAgents.forEach((p) => {
      const nat = resolvePlayerNationality(p, 'Brasil');
      counts.set(nat, (counts.get(nat) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allClubs, userClub.id, freeAgents]);

  const matchesNationalityFilter = (player: Player, fallbackCountry: string = 'Brasil') => {
    if (selectedNationality === 'ALL') return true;
    const pNat = resolvePlayerNationality(player, fallbackCountry);
    if (selectedNationality === 'FOREIGN') return pNat !== userClubCountry;
    return pNat === selectedNationality;
  };

  const matchesRegionFilter = (club: Club) => {
    if (selectedRegion === 'ALL') return true;
    if (selectedRegion === 'BR') return ['A', 'B', 'C', 'D', 'EST'].includes(club.division);
    if (selectedRegion === 'EU') return club.division === 'EU';
    if (selectedRegion === 'SA') return club.division === 'SA';
    return club.division === 'WL';
  };

  const sortPlayersWithClub = (list: { player: Player; club: Club }[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'POS_ASC') return comparePlayersByPosition(a.player, b.player);
      if (sortBy === 'PRICE_ASC') return a.player.marketValue - b.player.marketValue;
      if (sortBy === 'PRICE_DESC') return b.player.marketValue - a.player.marketValue;
      if (sortBy === 'AGE_ASC') return a.player.age - b.player.age || b.player.overall - a.player.overall;
      if (sortBy === 'WAGE_ASC') return a.player.wage - b.player.wage;
      return b.player.overall - a.player.overall || a.player.age - b.player.age;
    });
  };

  const seasonLoanCounts = useMemo(
    () =>
      getClubSeasonLoanCounts({
        club: userClub,
        transferHistory,
        currentSeasonYear,
        saSeasonYear: gameState?.saSeasonYear,
        europeSeasonYear: gameState?.europeSeasonYear,
      }),
    [userClub, transferHistory, currentSeasonYear, gameState?.saSeasonYear, gameState?.europeSeasonYear]
  );

  const maxSpendBudget = Math.max(0, userClub.finances.balance + getClubOverdraftLimit(userClub));

  // Filtered market list for permanent purchase
  const filteredMarket = sortPlayersWithClub(
    otherClubsPlayers.filter((item) => {
      if (onlyWatchlisted && !watchlistIdSet.has(item.player.id)) return false;
      if (!matchesRegionFilter(item.club)) return false;
      if (onlyWithinBudget && item.player.marketValue * 0.95 > maxSpendBudget) return false;
      const clubCountry = item.club.country || 'Brasil';
      const pNat = resolvePlayerNationality(item.player, clubCountry);
      if (selectedRole !== 'ALL' && item.player.detailedRole !== selectedRole) return false;
      if (!matchesNationalityFilter(item.player, clubCountry)) return false;
      if (item.player.overall < minOverall) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !item.player.name.toLowerCase().includes(q) &&
          !item.club.name.toLowerCase().includes(q) &&
          !pNat.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    })
  );

  // Filtered free agents
  const filteredFreeAgents = [...freeAgents]
    .filter((p) => {
      if (onlyWatchlisted && !watchlistIdSet.has(p.id)) return false;
      const pNat = resolvePlayerNationality(p, 'Brasil');
      if (selectedRole !== 'ALL' && p.detailedRole !== selectedRole) return false;
      if (!matchesNationalityFilter(p, 'Brasil')) return false;
      if (p.overall < minOverall) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !pNat.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'POS_ASC') return comparePlayersByPosition(a, b);
      if (sortBy === 'AGE_ASC') return a.age - b.age || b.overall - a.overall;
      if (sortBy === 'WAGE_ASC') return a.wage - b.wage;
      return b.overall - a.overall;
    });

  // Filtered Bosman pre-contract players (final year of contract at rival clubs)
  const filteredBosmanPlayers = sortPlayersWithClub(
    otherClubsPlayers.filter((item) => {
      if (onlyWatchlisted && !watchlistIdSet.has(item.player.id)) return false;
      if (!matchesRegionFilter(item.club)) return false;
      const clubCountry = item.club.country || 'Brasil';
      const pNat = resolvePlayerNationality(item.player, clubCountry);
      if (item.player.isLoan) return false;
      if (item.player.retiringAtSeasonEnd) return false;
      if ((item.player.contractYears || 2) > 1) return false;
      if (selectedRole !== 'ALL' && item.player.detailedRole !== selectedRole) return false;
      if (!matchesNationalityFilter(item.player, clubCountry)) return false;
      if (item.player.overall < minOverall) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !item.player.name.toLowerCase().includes(q) &&
          !item.club.name.toLowerCase().includes(q) &&
          !pNat.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    })
  );

  // Available players on loan market from other clubs
  const availableLoanPlayers = sortPlayersWithClub(
    otherClubsPlayers.filter((item) => {
      if (item.player.isLoan) return false;
      if (onlyWatchlisted && !watchlistIdSet.has(item.player.id)) return false;
      if (!matchesRegionFilter(item.club)) return false;
      const clubCountry = item.club.country || 'Brasil';
      const pNat = resolvePlayerNationality(item.player, clubCountry);
      const isEasyLoan =
        item.player.isListedForLoan ||
        (item.player.age <= 23 && !item.player.isStarter) ||
        (!item.player.isStarter && item.player.overall <= 80);

      if (loanFilterMode === 'EASY' && !isEasyLoan) return false;
      if (loanFilterMode === 'U23' && (item.player.age > 23 || (item.player.isStarter && item.player.overall >= 83))) {
        return false;
      }
      if (loanFilterMode === 'ALL' && item.player.isStarter && item.player.overall >= 86) {
        // Still allow high starters unless OVR >= 86 untouchable super-stars or listed
        if (!item.player.isListedForLoan) return false;
      }
      if (onlyWithinBudget && item.player.isStarter && item.player.overall >= 83 && item.player.marketValue * 0.16 > maxSpendBudget) {
        return false;
      }

      if (selectedRole !== 'ALL' && item.player.detailedRole !== selectedRole) return false;
      if (!matchesNationalityFilter(item.player, clubCountry)) return false;
      if (item.player.overall < minOverall) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !item.player.name.toLowerCase().includes(q) &&
          !item.club.name.toLowerCase().includes(q) &&
          !pNat.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    })
  );

  // Players borrowed by user currently in squad
  const borrowedPlayers = userClub.squad.filter((p) => p.isLoan);

  // Players owned by user that are loaned out to other clubs
  const loanedOutPlayers: Array<{ player: Player; currentClub: Club }> = [];
  allClubs
    .filter((c) => c.id !== userClub.id)
    .forEach((c) => {
      c.squad.forEach((p) => {
        if (p.isLoan && p.loanParentClubId === userClub.id) {
          loanedOutPlayers.push({ player: p, currentClub: c });
        }
      });
    });

  // Eligible non-loan players in user's squad for Player Swap + Cash deals (requires squad > 16)
  const eligibleSwapPlayers = useMemo(() => {
    if (userClub.squad.length <= 16) return [];
    return [...userClub.squad]
      .filter((p) => !p.isLoan && !findPendingTransferForPlayer(pendingTransfers, p.id))
      .sort((a, b) => b.overall - a.overall);
  }, [userClub.squad, pendingTransfers]);

  const selectedSwapPlayer = useMemo(
    () => eligibleSwapPlayers.find((p) => p.id === swapPlayerId) || null,
    [eligibleSwapPlayers, swapPlayerId]
  );

  const swapEvaluation = useMemo(() => {
    if (!selectedSwapPlayer || !negotiatingPlayer?.club) {
      return { credit: 0, sellerNeedsRole: false };
    }
    const roleCountAtSeller = negotiatingPlayer.club.squad.filter(
      (sp) => sp.detailedRole === selectedSwapPlayer.detailedRole
    ).length;
    const sellerNeedsRole = roleCountAtSeller <= 2;
    const credit = Math.round(
      selectedSwapPlayer.marketValue * (sellerNeedsRole ? 1.08 : 0.92)
    );
    return { credit, sellerNeedsRole };
  }, [selectedSwapPlayer, negotiatingPlayer]);

  // Deadline Day Window Detection (Final week of February & Final week of August)
  const currentRound = gameState?.currentRound || 1;
  const isDeadlineWindow = windowStatus.isDeadlineWeek;

  const deadlineFlashDeals = useMemo(() => {
    const candidates = otherClubsPlayers.filter(
      (item) =>
        !item.player.isLoan &&
        item.player.overall >= 72 &&
        !findPendingTransferForPlayer(pendingTransfers, item.player.id)
    );
    if (candidates.length === 0) return [];
    const seed = currentSeasonYear * 37 + currentRound * 13;
    const picked: Array<{ player: Player; club: Club; flashPrice: number }> = [];
    const step = Math.max(1, Math.floor(candidates.length / 8));
    for (let i = 0; i < candidates.length && picked.length < 6; i += 1) {
      const item = candidates[(seed + i * step) % candidates.length];
      if (!picked.some((p) => p.player.id === item.player.id)) {
        picked.push({
          player: item.player,
          club: item.club,
          flashPrice: Math.round((item.player.marketValue * 0.8) / 50000) * 50000,
        });
      }
    }
    return picked;
  }, [otherClubsPlayers, currentSeasonYear, currentRound, pendingTransfers]);

  const deadlineUrgentBuyouts = useMemo(() => {
    if (userClub.squad.length <= 16) return [];
    const userSellable = [...userClub.squad]
      .filter(
        (p) =>
          !p.isLoan &&
          p.overall >= 68 &&
          !findPendingTransferForPlayer(pendingTransfers, p.id)
      )
      .sort((a, b) => b.overall - a.overall);
    const richBuyers = allClubs
      .filter((c) => c.id !== userClub.id && c.finances.balance >= 8000000)
      .sort((a, b) => b.finances.balance - a.finances.balance);
    if (userSellable.length === 0 || richBuyers.length === 0) return [];
    const seed = currentSeasonYear * 19 + currentRound * 7;
    const offers: Array<{ player: Player; buyerClub: Club; offerPrice: number }> = [];
    for (let i = 0; i < Math.min(3, userSellable.length); i += 1) {
      const p = userSellable[(seed + i * 2) % userSellable.length];
      const buyer = richBuyers[(seed + i) % richBuyers.length];
      if (!offers.some((o) => o.player.id === p.id)) {
        offers.push({
          player: p,
          buyerClub: buyer,
          offerPrice: Math.round((p.marketValue * 1.22) / 50000) * 50000,
        });
      }
    }
    return offers;
  }, [userClub.squad, userClub.id, allClubs, currentSeasonYear, currentRound, pendingTransfers]);

  // Permanent transfer negotiation open
  const openNegotiation = (player: Player, club?: Club, discountFactor: number = 1) => {
    soundEngine.playClick();
    setNegotiatingPlayer({ player, club, discountFactor });
    setSwapPlayerId('');
    setPurchaseSellOnPct(0);
    setPurchaseGoalBonus(false);
    setPurchaseAppsBonus(false);
    const feeStep = player.marketValue < 250_000 ? 10_000 : 50_000;
    setOfferFee(club ? Math.round((player.marketValue * discountFactor) / feeStep) * feeStep : 0);
    setOfferWage(Math.round(player.wage * (discountFactor < 1 ? 1.08 : 1.15)));
    setOfferContractYears(player.age >= 34 ? 2 : player.age <= 22 ? 4 : 3);
    setNegotiationFeedback(null);
  };

  // Bosman Pre-Contract negotiation open
  const openPreContractModal = (player: Player, club: Club) => {
    soundEngine.playClick();
    setPreContractModalPlayer({ player, club });
    const wageStep = player.wage < 15_000 ? 500 : 1_000;
    setPreContractWage(Math.max(1_500, Math.round((player.wage * 1.18) / wageStep) * wageStep));
    setPreContractYears(player.age >= 32 ? 2 : 3);
    setPreContractBonus(0);
    setPreContractFeedback(null);
  };

  const handleConfirmPreContract = () => {
    if (!preContractModalPlayer || !onSignPreContract) return;
    soundEngine.playClick();
    const res = onSignPreContract(
      preContractModalPlayer.player.id,
      preContractModalPlayer.club.id,
      preContractWage,
      preContractYears,
      preContractBonus
    );
    setPreContractFeedback({ success: res.accepted, msg: res.feedbackText });
    if (res.accepted) {
      soundEngine.playFanfare();
      confetti({ particleCount: 85, spread: 80 });
      setTimeout(() => {
        setPreContractModalPlayer(null);
        setPreContractFeedback(null);
      }, 1700);
    } else {
      soundEngine.playWhistle(false);
    }
  };

  const handleTriggerReleaseClauseInModal = () => {
    if (!negotiatingPlayer || !negotiatingPlayer.club || !onPayReleaseClause) return;
    soundEngine.playClick();
    const res = onPayReleaseClause(
      negotiatingPlayer.player.id,
      negotiatingPlayer.club.id,
      offerWage,
      offerContractYears
    );
    setNegotiationFeedback({ success: res.accepted, msg: res.feedbackText });
    if (res.accepted) {
      soundEngine.playFanfare();
      confetti({ particleCount: 95, spread: 85 });
      setTimeout(() => {
        setNegotiatingPlayer(null);
        setNegotiationFeedback(null);
      }, 1700);
    } else {
      soundEngine.playWhistle(false);
    }
  };

  const handleSendOffer = () => {
    if (!negotiatingPlayer) return;
    const { player, club, discountFactor = 1 } = negotiatingPlayer;

    soundEngine.playClick();

    const banCheck = isClubUnderTransferBan(
      userClub,
      gameState?.currentDate || '2027-01-10'
    );
    if (banCheck.banned) {
      setNegotiationFeedback({
        success: false,
        msg: banCheck.reason || 'Transfer Ban ativo no STJD! Contratações bloqueadas.',
      });
      return;
    }

    if (!canClubRegisterNewPlayer(userClub, pendingTransfers, Boolean(selectedSwapPlayer))) {
      setNegotiationFeedback({
        success: false,
        msg: club
          ? `Seu elenco atingiu o limite máximo de ${MAX_SQUAD_SIZE} jogadores (${userClub.squad.length}/${MAX_SQUAD_SIZE}). Selecione um atleta seu na opção de troca abaixo (1 por 1) ou venda/empreste alguém antes de contratar!`
          : `Seu elenco atingiu o limite máximo de ${MAX_SQUAD_SIZE} jogadores (${userClub.squad.length}/${MAX_SQUAD_SIZE}). Venda ou empreste um atleta antes de assinar com agentes livres!`,
      });
      return;
    }

    const totalCost = Math.max(0, offerFee);
    const overdraftLimit = getClubOverdraftLimit(userClub);
    if (userClub.finances.balance - totalCost < -overdraftLimit) {
      setNegotiationFeedback({
        success: false,
        msg: `Limite bancário excedido! Caixa atual: ${formatCurrency(
          userClub.finances.balance
        )} (limite máximo de cheque especial: -${formatCurrency(overdraftLimit)}).`,
      });
      return;
    }

    const willingness = evaluatePlayerClubWillingness(userClub, player, {
      dealType: club ? 'PURCHASE' : 'FREE_AGENT',
      sellerClub: club,
    });
    if (!willingness.willing) {
      soundEngine.playWhistle(false);
      setNegotiationFeedback({
        success: false,
        msg:
          willingness.reason ||
          `${player.name} (OVR ${player.overall}) recusou negociar por considerar o ${userClub.shortName} abaixo do seu nível atual.`,
      });
      return;
    }

    if (player.age >= 35 && offerContractYears > 3) {
      setNegotiationFeedback({
        success: false,
        msg: `${player.name} (${player.age} anos) aceita vínculos de no máximo 3 anos.`,
      });
      return;
    }

    const yearsLabel = `${offerContractYears} ${offerContractYears === 1 ? 'ano' : 'anos'}`;

    if (!club) {
      if (offerWage >= player.wage * 0.9) {
        const ok = onSignPlayer(
          player,
          0,
          offerWage,
          undefined,
          undefined,
          offerContractYears
        );
        if (ok) {
          soundEngine.playFanfare();
          confetti({ particleCount: 70, spread: 70 });
          setNegotiationFeedback({
            success: true,
            msg: windowStatus.isOpen
              ? `Proposta aceita! ${player.name} assinou por ${yearsLabel} e já foi inscrito no ${userClub.name}!`
              : `Pré-acordo assinado! ${player.name} fechou contrato de ${yearsLabel} com o ${userClub.name} e se apresenta na abertura da janela em ${windowStatus.nextOpenDisplay}!`,
          });
          setTimeout(() => {
            setNegotiatingPlayer(null);
          }, 1900);
        } else {
          soundEngine.playWhistle(false);
          setNegotiationFeedback({
            success: false,
            msg: 'Não foi possível registrar o jogador no momento (verifique elenco ou pendências).',
          });
        }
      } else {
        setNegotiationFeedback({
          success: false,
          msg: `${player.name} recusou a proposta salarial! Ele exige pelo menos ${formatCurrency(player.wage)}.`,
        });
      }
      return;
    }

    const activePurchaseClausePkg: ClausePackageInput = {
      sellOnPercentage: purchaseSellOnPct,
      enableGoalBonus: purchaseGoalBonus,
      enableAppearancesBonus: purchaseAppsBonus,
    };
    const clauseDiscount = computePurchaseUpfrontDiscountFactor(activePurchaseClausePkg);
    const hasPurchaseClauses =
      purchaseSellOnPct > 0 || purchaseGoalBonus || purchaseAppsBonus;

    const baseMinFee = Math.round(
      player.marketValue * (discountFactor < 1 ? 0.78 : 0.95) * (1 - clauseDiscount)
    );
    const minAcceptableFee = Math.max(0, baseMinFee - swapEvaluation.credit);
    const minAcceptableWage = Math.round(player.wage * 1.05);

    if (offerFee >= minAcceptableFee && offerWage >= minAcceptableWage) {
      const signed = onSignPlayer(
        player,
        offerFee,
        offerWage,
        club.id,
        selectedSwapPlayer?.id,
        offerContractYears,
        hasPurchaseClauses ? activePurchaseClausePkg : undefined
      );
      if (signed) {
        soundEngine.playFanfare();
        confetti({ particleCount: 80, spread: 80 });
        setNegotiationFeedback({
          success: true,
          msg: windowStatus.isOpen
            ? selectedSwapPlayer
              ? `Negócio de mestre! O ${club.name} aceitou ${selectedSwapPlayer.name} + ${formatCurrency(offerFee)} e ${player.name} assinou por ${yearsLabel} com o ${userClub.name}!`
              : `Contratação fechada! O ${club.name} aceitou a transferência e ${player.name} assinou por ${yearsLabel} com o ${userClub.name}!`
            : selectedSwapPlayer
            ? `Acordo fechado (${yearsLabel}) para a próxima janela! ${player.name} e ${selectedSwapPlayer.name} trocam de clube automaticamente em ${windowStatus.nextOpenDisplay}!`
            : `Contratação garantida! ${player.name} assinou por ${yearsLabel} e se apresenta ao ${userClub.name} assim que a janela abrir em ${windowStatus.nextOpenDisplay}!`,
        });
        setTimeout(() => {
          setNegotiatingPlayer(null);
          setSwapPlayerId('');
        }, 2000);
      }
    } else if (offerFee < minAcceptableFee) {
      setNegotiationFeedback({
        success: false,
        msg: selectedSwapPlayer
          ? `Mesmo incluindo ${selectedSwapPlayer.name} (crédito de ${formatCurrency(swapEvaluation.credit)}), o ${club.name} pede ao menos ${formatCurrency(minAcceptableFee)} de volta em dinheiro.`
          : `O ${club.name} rejeitou a proposta! Eles pedem no mínimo ${formatCurrency(minAcceptableFee)} (ou inclua um atleta na troca).`,
      });
    } else {
      setNegotiationFeedback({
        success: false,
        msg: `${player.name} rejeitou o contrato! Ele pede no mínimo ${formatCurrency(minAcceptableWage)} de salário.`,
      });
    }
  };

  // Open Loan In Negotiation (pre-populated with recommended accepted terms!)
  const openLoanModal = (player: Player, club: Club) => {
    soundEngine.playClick();
    const recTerms = computeRecommendedLoanTerms(player, 19);
    setLoanModalPlayer({ player, club });
    setLoanDuration(recTerms.durationRounds);
    setLoanWageShare(recTerms.wageSharePct);
    setLoanFee(recTerms.loanFee);
    setEnableBuyOption(true);
    setBuyOptionValue(recTerms.buyOptionFee);
    setLoanSuggestedBuyout(null);
    setLoanSuggestedWageShare(null);
    setLoanSuggestedFee(null);
    setLoanFeedback(null);
  };

  // Submit Loan In Proposal
  const handleSendLoanProposal = (overrides?: {
    buyout?: number;
    wageShare?: number;
    fee?: number;
  }) => {
    if (!loanModalPlayer) return;
    const { player, club } = loanModalPlayer;

    soundEngine.playClick();

    const nextWageShare = overrides?.wageShare ?? loanWageShare;
    const nextLoanFee = overrides?.fee ?? loanFee;
    const effectiveBuyout = enableBuyOption
      ? overrides?.buyout ?? buyOptionValue
      : undefined;

    if (overrides?.wageShare !== undefined) setLoanWageShare(overrides.wageShare);
    if (overrides?.fee !== undefined) setLoanFee(overrides.fee);
    if (overrides?.buyout !== undefined) setBuyOptionValue(overrides.buyout);

    const result = evaluateLoanProposal(
      userClub,
      club,
      player,
      loanDuration,
      nextWageShare,
      effectiveBuyout,
      nextLoanFee,
      {
        transferHistory,
        currentSeasonYear,
        saSeasonYear: gameState?.saSeasonYear,
        europeSeasonYear: gameState?.europeSeasonYear,
      }
    );

    if (result.accepted) {
      let ok = true;
      if (onLoanInPlayer) {
        ok = onLoanInPlayer(
          player,
          club.id,
          loanDuration,
          nextWageShare,
          effectiveBuyout,
          nextLoanFee
        );
      }
      if (ok) {
        soundEngine.playFanfare();
        confetti({ particleCount: 90, spread: 80 });
        setLoanSuggestedBuyout(null);
        setLoanSuggestedWageShare(null);
        setLoanSuggestedFee(null);
        setLoanFeedback({
          success: true,
          msg: windowStatus.isOpen
            ? result.message
            : `Empréstimo de ${loanDuration >= 38 ? '1 ano' : '6 meses'} fechado com o ${club.name}! Como a janela está fechada, ${player.name} se apresenta ao ${userClub.shortName} em ${windowStatus.nextOpenDisplay}.`,
        });
        setTimeout(() => {
          setLoanModalPlayer(null);
        }, 1800);
      } else {
        soundEngine.playWhistle(false);
        setLoanFeedback({
          success: false,
          msg: `Não foi possível concluir o empréstimo (limite de ${MAX_SEASON_LOANS_IN} por temporada ou negociação pendente).`,
        });
      }
    } else {
      soundEngine.playWhistle(false);
      setLoanSuggestedBuyout(result.suggestedFee ?? null);
      setLoanSuggestedWageShare(result.suggestedWageShare ?? null);
      setLoanSuggestedFee(result.suggestedLoanFee ?? null);
      setLoanFeedback({
        success: false,
        msg: result.message,
      });
    }
  };

  // Open Instant Sell Modal
  const openSellPlayerModal = (player: Player) => {
    soundEngine.playClick();
    setSellingPlayer(player);
    setSellClausePct(0);
    setSellGoalBonus(false);
    setCounteredClubs({});
    setSellModalFeedback(null);
    if (gameState) {
      const scan = findInstantBuyersForPlayer(gameState, player.id);
      setInstantBuyers(scan.buyers);
      setSellBlockReason(scan.blockReason);
    } else {
      setInstantBuyers([]);
      setSellBlockReason('Dados de mercado indisponíveis no momento.');
    }
  };

  // Smart Loan Destinations Memo
  const smartLoanOutDestinations = useMemo(() => {
    if (!loanOutPlayer || !gameState) return [];
    return findSmartLoanDestinations(gameState, loanOutPlayer.id);
  }, [loanOutPlayer, gameState]);

  // Open Loan Out Modal (auto-select best smart destination!)
  const openLoanOutModal = (player: Player) => {
    soundEngine.playClick();
    setLoanOutPlayer(player);
    const smartList = gameState ? findSmartLoanDestinations(gameState, player.id) : [];
    const best = smartList[0];
    const fallbackClub =
      best?.club ||
      allClubs.find((c) => c.id !== userClub.id && c.division !== 'A') ||
      allClubs.find((c) => c.id !== userClub.id);
    setSelectedTargetClubId(fallbackClub ? fallbackClub.id : '');
    setLoanOutDuration(19);
    setLoanOutWageShare(best?.suggestedWageSharePct ?? 70);
    setLoanOutEnableBuyOption(true);
    const buyoutStep = player.marketValue < 250_000 ? 10_000 : 50_000;
    setLoanOutBuyOption(
      best?.suggestedBuyOptionFee ??
        Math.max(10_000, Math.round((player.marketValue * 1.2) / buyoutStep) * buyoutStep)
    );
    setLoanOutUpfrontFee(best?.suggestedLoanFee ?? 0);
    setLoanOutFeedback(null);
  };

  // Confirm Loan Out to Partner Club
  const handleConfirmLoanOut = () => {
    if (!loanOutPlayer || !selectedTargetClubId) return;
    soundEngine.playClick();

    if (seasonLoanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT) {
      soundEngine.playWhistle(false);
      setLoanOutFeedback({
        success: false,
        msg: `Limite de ${MAX_SEASON_LOANS_OUT} jogadores cedidos por empréstimo na temporada atingido (${seasonLoanCounts.loansOutCount}/${MAX_SEASON_LOANS_OUT}).`,
      });
      return;
    }

    const targetClub = allClubs.find((c) => c.id === selectedTargetClubId);
    if (!targetClub) return;

    const effectiveBuyout =
      loanOutEnableBuyOption && loanOutBuyOption > 0 ? loanOutBuyOption : undefined;
    const durationText =
      loanOutDuration >= 38 ? '1 ano (38 rodadas)' : '6 meses (19 rodadas)';

    let ok = true;
    if (onLoanOutPlayer) {
      ok = onLoanOutPlayer(
        loanOutPlayer.id,
        targetClub.id,
        loanOutDuration,
        loanOutWageShare,
        effectiveBuyout,
        loanOutUpfrontFee
      );
    }

    if (ok) {
      soundEngine.playFanfare();
      confetti({ particleCount: 70, spread: 70 });
      setLoanOutFeedback({
        success: true,
        msg: windowStatus.isOpen
          ? `Acordo selado! ${loanOutPlayer.name} foi cedido por empréstimo ao ${targetClub.name} por ${durationText}${effectiveBuyout ? ` com passe fixado em ${formatCurrency(effectiveBuyout)}` : ''}. O rival arcará com ${loanOutWageShare}% dos salários!`
          : `Empréstimo de ${durationText} agendado! ${loanOutPlayer.name} seguirá atuando no seu time até se apresentar ao ${targetClub.name} na abertura da janela em ${windowStatus.nextOpenDisplay}.`,
      });
      setTimeout(() => {
        setLoanOutPlayer(null);
      }, 2000);
    } else {
      soundEngine.playWhistle(false);
      setLoanOutFeedback({
        success: false,
        msg: `Não foi possível concluir a cessão de ${loanOutPlayer.name} (cota de ${MAX_SEASON_LOANS_OUT} empréstimos na temporada ou pendência).`,
      });
    }
  };

  const openBuyoutModal = (player: Player) => {
    soundEngine.playClick();
    setBuyoutModalPlayer(player);
    setBuyoutContractYears(
      player.age >= 34 ? 2 : player.age <= 22 ? 4 : 3
    );
    setBuyoutPermanentWage(resolvePlayerFullMonthlyWage(player));
    setBuyoutFeedback(null);
  };

  const handleConfirmBuyout = () => {
    if (!buyoutModalPlayer || !onTriggerBuyOption) return;
    soundEngine.playClick();
    const fee = buyoutModalPlayer.loanBuyOptionFee || 0;
    if (userClub.finances.balance < fee) {
      soundEngine.playWhistle(false);
      setBuyoutFeedback({
        success: false,
        msg: `Saldo insuficiente (${formatCurrency(userClub.finances.balance)}) para quitar o passe fixado de ${formatCurrency(fee)}.`,
      });
      return;
    }
    const ok = onTriggerBuyOption(
      buyoutModalPlayer,
      buyoutContractYears,
      buyoutPermanentWage
    );
    if (ok) {
      soundEngine.playFanfare();
      confetti({ particleCount: 95, spread: 80 });
      setBuyoutFeedback({
        success: true,
        msg: `Opção de compra exercida! ${buyoutModalPlayer.name} assinou em definitivo por ${buyoutContractYears} ${buyoutContractYears === 1 ? 'ano' : 'anos'} com o ${userClub.name}!`,
      });
      setTimeout(() => {
        setBuyoutModalPlayer(null);
        setBuyoutFeedback(null);
      }, 1600);
    } else {
      soundEngine.playWhistle(false);
      setBuyoutFeedback({
        success: false,
        msg: 'Não foi possível concluir o exercício da opção de compra.',
      });
    }
  };

  const openClauseModal = (player: Player) => {
    soundEngine.playClick();
    setClauseModalPlayer(player);
    setClauseProposedFee(
      player.loanBuyOptionFee || Math.round((player.marketValue * 1.1) / 50000) * 50000
    );
    setClauseSuggestedFee(null);
    setClauseFeedback(null);
  };

  const handleSubmitClauseNegotiation = (overrideFee?: number) => {
    if (!clauseModalPlayer || !onNegotiateLoanBuyOption) return;
    soundEngine.playClick();
    const feeToPropose = overrideFee ?? clauseProposedFee;
    if (overrideFee !== undefined) {
      setClauseProposedFee(overrideFee);
    }
    const res = onNegotiateLoanBuyOption(clauseModalPlayer.id, feeToPropose);
    setClauseFeedback({ success: res.accepted, msg: res.message });
    if (res.accepted) {
      soundEngine.playFanfare();
      setClauseSuggestedFee(null);
      setTimeout(() => {
        setClauseModalPlayer(null);
        setClauseFeedback(null);
      }, 1500);
    } else {
      soundEngine.playWhistle(false);
      setClauseSuggestedFee(res.suggestedFee ?? null);
    }
  };

  // AI Director Report & Incoming Offers
  const aiReport = useMemo(() => {
    if (!gameState) return null;
    return buildAiTransferDirectorReport(gameState);
  }, [gameState]);

  const pendingOffers = useMemo(
    () => (transferOffers || []).filter((o) => o.status === 'PENDING'),
    [transferOffers]
  );

  const handleOpenAiRecommendedSigning = (rec: AiRecommendedSigning) => {
    soundEngine.playClick();
    const defaultContract =
      rec.player.age >= 34 ? 2 : rec.player.age <= 22 ? 4 : 3;
    if (rec.dealMode === 'FREE_AGENT') {
      setNegotiatingPlayer({ player: rec.player, club: undefined });
      setOfferFee(0);
      setOfferWage(rec.suggestedWage);
      setOfferContractYears(defaultContract);
      setNegotiationFeedback(null);
      return;
    }
    if (rec.dealMode === 'PURCHASE' && rec.sellerClub) {
      setNegotiatingPlayer({ player: rec.player, club: rec.sellerClub });
      setOfferFee(rec.suggestedFee);
      setOfferWage(rec.suggestedWage);
      setOfferContractYears(defaultContract);
      setNegotiationFeedback(null);
      return;
    }
    if (rec.dealMode === 'BOSMAN' && rec.sellerClub) {
      setPreContractModalPlayer({ player: rec.player, club: rec.sellerClub });
      setPreContractWage(rec.suggestedWage);
      setPreContractYears(rec.player.age >= 32 ? 2 : 3);
      setPreContractBonus(0);
      setPreContractFeedback(null);
      return;
    }
    if (rec.dealMode === 'LOAN' && rec.sellerClub) {
      setLoanModalPlayer({ player: rec.player, club: rec.sellerClub });
      setLoanDuration(19);
      setLoanWageShare(70);
      setLoanFee(0);
      setEnableBuyOption(true);
      setBuyOptionValue(Math.round((rec.player.marketValue * 1.15) / 50000) * 50000);
      setLoanSuggestedBuyout(null);
      setLoanFeedback(null);
    }
  };

  const handleOfferDecision = (
    offerId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER'
  ) => {
    if (!onRespondTransferOffer) return;
    soundEngine.playClick();
    const res = onRespondTransferOffer(offerId, action);
    setAiActionFeedback({ ok: res.success, text: res.feedbackText });
    if (res.success && action !== 'REJECT') {
      soundEngine.playFanfare();
      confetti({ particleCount: 65, spread: 70 });
    } else if (!res.success) {
      soundEngine.playWhistle(false);
    }
  };

  const handleShopPlayerClick = (playerId: string) => {
    if (!onShopPlayerWithAi) return;
    soundEngine.playClick();
    const res = onShopPlayerWithAi(playerId);
    setAiActionFeedback({
      ok: res.offersGenerated > 0,
      text: res.feedbackText,
    });
    if (res.offersGenerated > 0) {
      soundEngine.playFanfare();
    }
  };

  const transferableUserSquad = useMemo(() => {
    const q = aiOutgoingSearch.trim().toLowerCase();
    return userClub.squad
      .filter((p) => !p.isLoan && (!q || p.name.toLowerCase().includes(q) || p.detailedRole.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (Boolean(a.isListedForSale) !== Boolean(b.isListedForSale)) {
          return a.isListedForSale ? -1 : 1;
        }
        return b.marketValue - a.marketValue;
      });
  }, [userClub.squad, aiOutgoingSearch]);

  return (
    <div className="space-y-6">
      {/* Official Transfer Window Status Banner (Jan-Feb & Jul-Aug) */}
      <div
        className={`bg-slate-950 border rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 ${
          windowStatus.isOpen ? 'border-emerald-500/40' : 'border-amber-500/40'
        }`}
      >
        <div className="space-y-1 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
            <span
              className={`font-black uppercase tracking-wider ${
                windowStatus.isOpen ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {windowStatus.windowTitle}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-slate-300">
              {windowStatus.isOpen
                ? `Inscrições imediatas liberadas até ${windowStatus.closesOnDisplay} (${windowStatus.daysUntilChange}d restantes)`
                : `Próxima abertura em ${windowStatus.nextOpenDisplay} (faltam ${windowStatus.daysUntilChange} dias)`}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span
              className={
                getClubProjectedSquadSize(userClub, pendingTransfers) >= MAX_SQUAD_SIZE
                  ? 'text-amber-300 font-bold'
                  : 'text-emerald-300 font-bold'
              }
            >
              Elenco: {getClubProjectedSquadSize(userClub, pendingTransfers)}/{MAX_SQUAD_SIZE} atletas
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span
              className={
                seasonLoanCounts.loansInCount >= MAX_SEASON_LOANS_IN
                  ? 'text-rose-300 font-bold'
                  : 'text-sky-300 font-bold'
              }
            >
              Empr. Recebidos: {seasonLoanCounts.loansInCount}/{MAX_SEASON_LOANS_IN}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span
              className={
                seasonLoanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT
                  ? 'text-rose-300 font-bold'
                  : 'text-amber-300 font-bold'
              }
            >
              Cedidos: {seasonLoanCounts.loansOutCount}/{MAX_SEASON_LOANS_OUT}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {windowStatus.isOpen
              ? 'As janelas oficiais abrem de Janeiro a Fevereiro e de Julho a Agosto. Qualquer reforço contratado agora entra imediatamente no seu elenco.'
              : 'A janela de registros está fechada (abre somente em Janeiro–Fevereiro e Julho–Agosto). Você pode negociar e contratar jogadores normalmente agora, mas eles só se apresentam ao elenco quando a janela abrir.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('pending_window');
          }}
          className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors flex items-center gap-2 tabular-nums ${
            activeTab === 'pending_window'
              ? 'bg-sky-400 text-slate-950 font-black'
              : pendingTransfers.length > 0
              ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Aguardando Janela ({pendingTransfers.length})</span>
        </button>
      </div>

      {/* Deadline Day Live Alert Banner when inside closing week */}
      {isDeadlineWindow && activeTab !== 'deadline_day' && (
        <div className="bg-slate-950 border border-amber-500/40 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-black text-amber-300 tabular-nums">
                DEADLINE DAY ATIVO · Reta Final da Janela (Fecha em {windowStatus.closesOnDisplay})
              </div>
              <div className="text-slate-400 mt-0.5">
                Oportunidades relâmpago com 20% de desconto e propostas urgentes de clubes rivais com +22% de ágio!
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('deadline_day');
            }}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            Abrir Plantão Deadline Day
          </button>
        </div>
      )}

      {/* Top Banner & Tab Controls */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-xl">
        <ScrollableTabStrip
          activeKey={activeTab}
          ariaLabel="Abas do Mercado da Bola"
          innerClassName="flex items-center gap-2"
        >
          <button
            data-tab-active={activeTab === 'all' ? 'true' : undefined}
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('all');
              setMarketDisplayLimit(48);
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-500/30'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Mercado Aberto</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('rumors');
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 tabular-nums ${
              activeTab === 'rumors'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25'
                : 'bg-slate-900 text-amber-300 border border-amber-500/35 hover:bg-slate-800'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>
              Rumores IA{transferRumors.length > 0 ? ` (${transferRumors.length})` : ''}
            </span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('loans');
              setMarketDisplayLimit(48);
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 tabular-nums ${
              activeTab === 'loans'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                : 'bg-slate-900 text-amber-300 border border-amber-500/30 hover:bg-slate-800'
            }`}
          >
            <Handshake className="w-4 h-4" />
            <span>Empréstimos ({availableLoanPlayers.length})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('free');
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'free'
                ? 'bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-500/30'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            Jogadores Livres
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('bosman');
              setMarketDisplayLimit(48);
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 tabular-nums ${
              activeTab === 'bosman'
                ? 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/30'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>Pré-Contrato ({filteredBosmanPlayers.length})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('sell_squad');
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 tabular-nums ${
              activeTab === 'sell_squad'
                ? 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25'
                : 'bg-slate-900 text-emerald-300 border border-emerald-500/35 hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Vender & Ceder Elenco ({userClub.squad.filter((p) => !p.isLoan).length})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('my_loans');
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 tabular-nums ${
              activeTab === 'my_loans'
                ? 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/30'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Meus Empréstimos ({borrowedPlayers.length + loanedOutPlayers.length})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('ai_director');
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 tabular-nums ${
              activeTab === 'ai_director'
                ? 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25'
                : pendingOffers.length > 0
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>
              Central IA & Propostas
              {pendingOffers.length > 0 ? ` (${pendingOffers.length})` : ''}
            </span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('pending_window');
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 tabular-nums ${
              activeTab === 'pending_window'
                ? 'bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-500/25'
                : pendingTransfers.length > 0
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40 hover:bg-sky-500/25'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Aguardando Janela ({pendingTransfers.length})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('deadline_day');
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 tabular-nums ${
              activeTab === 'deadline_day'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25'
                : isDeadlineWindow
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isDeadlineWindow ? 'Deadline Day (AO VIVO)' : 'Deadline Day'}</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('watchlist');
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 tabular-nums ${
              activeTab === 'watchlist'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25'
                : resolvedWatchlist.length > 0
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Observados ({resolvedWatchlist.length})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('clauses');
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 tabular-nums ${
              activeTab === 'clauses'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25'
                : activeTransferClauses.length > 0
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Cláusulas ({activeTransferClauses.length})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('history');
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 tabular-nums ${
              activeTab === 'history'
                ? 'bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-500/30'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico ({seasonHistory.length})</span>
          </button>
          {onOpenScouting && (
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenScouting();
              }}
              className="px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 bg-slate-900 text-sky-300 border border-sky-500/30 hover:bg-slate-800"
            >
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Olheiros</span>
            </button>
          )}
        </ScrollableTabStrip>

        {/* Budget & AI Nationality Sync controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onSyncNationalitiesWithAI && (
            <button
              type="button"
              disabled={isSyncingNationalities}
              onClick={() => {
                soundEngine.playClick();
                onSyncNationalitiesWithAI();
              }}
              title="Usar IA para conferir a nacionalidade real de cada jogador no mercado"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 border border-emerald-500/35 text-emerald-300 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingNationalities ? 'animate-spin' : ''}`} />
              <span>{isSyncingNationalities ? 'Verificando IA...' : 'Nacionalidades IA'}</span>
            </button>
          )}
          <div className="flex items-center gap-2 bg-sky-950/40 border border-sky-500/40 px-3 py-1.5 rounded-xl text-sky-300 text-xs font-semibold shadow-inner tabular-nums">
            <DollarSign className="w-4 h-4 text-sky-400" />
            <span>Verba disponível: {formatCurrency(userClub.finances.balance)}</span>
          </div>
        </div>
      </div>

      {nationalitySyncFeedback && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{nationalitySyncFeedback}</span>
          </div>
          {onDismissNationalitySyncFeedback && (
            <button
              type="button"
              onClick={onDismissNationalitySyncFeedback}
              className="text-slate-400 hover:text-white font-semibold cursor-pointer shrink-0"
            >
              Fechar
            </button>
          )}
        </div>
      )}

      {/* Compact Rumor Highlight Strip in Open Market */}
      {activeTab === 'all' && teaserRumor && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex items-start sm:items-center gap-3">
            <Newspaper className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Plantão de Rumores · {teaserRumor.sourceOutlet}
              </div>
              <div className="text-xs sm:text-sm font-bold text-white truncate">
                {teaserRumor.headline}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('rumors');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            Ler Rumores com IA
          </button>
        </div>
      )}

      {/* Filter Bar (for 'all', 'free', 'bosman', and 'loans' tabs) */}
      {(activeTab === 'all' || activeTab === 'free' || activeTab === 'bosman' || activeTab === 'loans') && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search by name */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Jogador, clube ou país..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setMarketDisplayLimit(48);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold shrink-0">Posição:</span>
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setMarketDisplayLimit(48);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-400"
              >
                <option value="ALL">Todas as Posições</option>
                <option value="GOL">Goleiro (GOL)</option>
                <option value="LAT">Lateral (LAT)</option>
                <option value="ZAG">Zagueiro (ZAG)</option>
                <option value="VOL">Volante (VOL)</option>
                <option value="MEI">Meia (MEI)</option>
                <option value="ATA">Atacante (ATA)</option>
              </select>
            </div>

            {/* Nationality Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold shrink-0">País:</span>
              <select
                value={selectedNationality}
                onChange={(e) => {
                  setSelectedNationality(e.target.value);
                  setMarketDisplayLimit(48);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-400"
              >
                <option value="ALL">Todas Nacionalidades</option>
                <option value="FOREIGN">Apenas Estrangeiros</option>
                {availableMarketNationalities.map(([nat, count]) => {
                  const info = getNationalityInfo(nat);
                  return (
                    <option key={nat} value={nat}>
                      {info.flag} {info.country} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Min Overall */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold shrink-0">Força Mín:</span>
              <input
                type="range"
                min="50"
                max="90"
                value={minOverall}
                onChange={(e) => {
                  setMinOverall(Number(e.target.value));
                  setMarketDisplayLimit(48);
                }}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <span className="font-mono font-bold text-sky-400 w-6 text-right tabular-nums">{minOverall}</span>
            </div>

            {/* Watchlist Quick Filter */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setOnlyWatchlisted((prev) => !prev);
                setMarketDisplayLimit(48);
              }}
              className={`px-3 py-2 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer tabular-nums ${
                onlyWatchlisted
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400/50 hover:text-amber-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0" />
              <span>Só na Lista ({resolvedWatchlist.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2.5">
              {activeTab !== 'free' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">Liga / Região:</span>
                  <select
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value as 'ALL' | 'BR' | 'EU' | 'SA' | 'WL');
                      setMarketDisplayLimit(48);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="ALL">Todas as Ligas</option>
                    <option value="BR">Brasil (Séries A–D e Estaduais)</option>
                    <option value="SA">América do Sul</option>
                    <option value="EU">Europa</option>
                    <option value="WL">Resto do Mundo</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as 'OVR_DESC' | 'POS_ASC' | 'PRICE_ASC' | 'PRICE_DESC' | 'AGE_ASC' | 'WAGE_ASC');
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="OVR_DESC">Maior Força (OVR)</option>
                  <option value="POS_ASC">Posição (GOL → ATA)</option>
                  <option value="PRICE_ASC">Menor Passe</option>
                  <option value="PRICE_DESC">Maior Valor de Mercado</option>
                  <option value="AGE_ASC">Mais Jovens</option>
                  <option value="WAGE_ASC">Menor Salário</option>
                </select>
              </div>

              {activeTab !== 'free' && activeTab !== 'bosman' && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setOnlyWithinBudget((prev) => !prev);
                    setMarketDisplayLimit(48);
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    onlyWithinBudget
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500/40'
                  }`}
                >
                  Cabe no Caixa
                </button>
              )}

              {activeTab === 'loans' && (
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  {(
                    [
                      { id: 'ALL', label: 'Todos Negociáveis' },
                      { id: 'EASY', label: 'Aceite Fácil' },
                      { id: 'U23', label: 'Jovens Sub-23' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setLoanFilterMode(mode.id);
                        setMarketDisplayLimit(48);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        loanFilterMode === mode.id
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(searchQuery ||
              selectedRole !== 'ALL' ||
              selectedNationality !== 'ALL' ||
              selectedRegion !== 'ALL' ||
              onlyWithinBudget ||
              onlyWatchlisted ||
              minOverall !== 60 ||
              loanFilterMode !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSearchQuery('');
                  setSelectedRole('ALL');
                  setSelectedNationality('ALL');
                  setSelectedRegion('ALL');
                  setOnlyWithinBudget(false);
                  setOnlyWatchlisted(false);
                  setMinOverall(60);
                  setLoanFilterMode('ALL');
                  setMarketDisplayLimit(48);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold cursor-pointer whitespace-nowrap"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB WATCHLIST: LISTA DE OBSERVAÇÃO DO TÉCNICO */}
      {activeTab === 'watchlist' && (
        <div className="space-y-5">
          {/* Header & Live Metrics */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="text-xs font-semibold text-amber-400">
                Caderno de Alvos do Treinador · Atualizado em Tempo Real
              </div>
              <h3 className="text-lg font-bold text-white">
                Minha Lista de Observação ({resolvedWatchlist.length})
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Guarde jogadores pesquisados no Mercado Aberto, Livres, Outros Clubes ou na Busca Global (Ctrl+K) para acompanhar valores, contratos e negociar no momento ideal. Você pode remover qualquer atleta da lista quando quiser.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {resolvedWatchlist.length > 0 && onClearWatchlist && (
                confirmClearWatchlist ? (
                  <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/40 rounded-xl px-3 py-1.5 text-xs">
                    <span className="text-rose-200 font-semibold">Limpar toda a lista?</span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onClearWatchlist();
                        setConfirmClearWatchlist(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold cursor-pointer"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearWatchlist(false)}
                      className="px-2 py-1 text-slate-300 hover:text-white font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setConfirmClearWatchlist(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Lista</span>
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('all');
                }}
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Pesquisar Novos Alvos
              </button>
            </div>
          </div>

          {resolvedWatchlist.length > 0 && (
            <>
              {/* Quick Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-slate-400 block">Alvos Monitorados</span>
                  <strong className="text-lg font-bold font-mono text-white mt-0.5 block">
                    {resolvedWatchlist.length}
                  </strong>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-slate-400 block">Livres / Pré-Contrato</span>
                  <strong className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                    {
                      resolvedWatchlist.filter(
                        (i) => i.availabilityKind === 'FREE_AGENT' || i.availabilityKind === 'BOSMAN'
                      ).length
                    }
                  </strong>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-slate-400 block">Viáveis p/ Empréstimo</span>
                  <strong className="text-lg font-bold font-mono text-amber-300 mt-0.5 block">
                    {resolvedWatchlist.filter((i) => i.availabilityKind === 'LOAN_LISTED').length}
                  </strong>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-slate-400 block">Dentro da Verba Atual</span>
                  <strong className="text-lg font-bold font-mono text-sky-300 mt-0.5 block">
                    {resolvedWatchlist.filter((i) => i.affordableNow).length}
                  </strong>
                </div>
              </div>

              {/* Watchlist Filter Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar na sua lista por nome, clube ou país..."
                    value={watchlistSearch}
                    onChange={(e) => setWatchlistSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold shrink-0">Posição:</span>
                  <select
                    value={watchlistRoleFilter}
                    onChange={(e) => setWatchlistRoleFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="ALL">Todas as Posições</option>
                    <option value="GOL">Goleiro (GOL)</option>
                    <option value="LAT">Lateral (LAT)</option>
                    <option value="ZAG">Zagueiro (ZAG)</option>
                    <option value="VOL">Volante (VOL)</option>
                    <option value="MEI">Meia (MEI)</option>
                    <option value="ATA">Atacante (ATA)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold shrink-0">Situação:</span>
                  <select
                    value={watchlistAvailabilityFilter}
                    onChange={(e) =>
                      setWatchlistAvailabilityFilter(
                        e.target.value as 'ALL' | WatchlistAvailabilityKind
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="ALL">Todas as Situações</option>
                    <option value="FREE_AGENT">Sem Clube (Custo Zero)</option>
                    <option value="BOSMAN">Último Ano (Pré-Contrato)</option>
                    <option value="LOAN_LISTED">Disponível p/ Empréstimo</option>
                    <option value="UNDER_CONTRACT">Sob Contrato em Clube</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {resolvedWatchlist.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Bookmark className="w-8 h-8 text-amber-400/70 mx-auto" />
              <div className="space-y-1 max-w-md mx-auto">
                <p className="text-sm font-bold text-white">
                  Sua Lista de Observação está vazia no momento.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ao pesquisar jogadores para contratar nas abas Mercado Aberto, Jogadores Livres, Pré-Contrato, Empréstimos, Outros Clubes ou na Busca Global (Ctrl+K), clique em &ldquo;Observar&rdquo; para salvá-los aqui.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Explorar Mercado Aberto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('free');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Ver Jogadores Livres
                </button>
              </div>
            </div>
          ) : filteredWatchlist.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              Nenhum jogador da sua Lista de Observação corresponde aos filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredWatchlist.map(({ entry, player, club, availabilityKind, pendingDeal }) => {
                const statusLabel =
                  availabilityKind === 'FREE_AGENT'
                    ? 'Livre no Mercado'
                    : availabilityKind === 'BOSMAN'
                    ? 'Último Ano (Pré-Contrato)'
                    : availabilityKind === 'LOAN_LISTED'
                    ? 'Disponível p/ Empréstimo'
                    : `Contrato: ${player.contractYears || 2} ${(player.contractYears || 2) === 1 ? 'ano' : 'anos'}`;

                return (
                  <div
                    key={player.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar
                            player={player}
                            club={club ?? null}
                            clubPrimaryColor={club?.colors.primary}
                            clubTextColor={club?.colors.text}
                            size="md"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                inspection?.inspectPlayer(player, club ?? null);
                              }}
                              className="font-bold text-white hover:text-amber-300 transition-colors text-sm truncate block text-left cursor-pointer max-w-full"
                            >
                              {player.name}
                            </button>
                            <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                              <span className="text-amber-300 font-semibold">{player.detailedRole}</span>
                              <span aria-hidden="true"> · </span>
                              <span>{player.age} anos</span>
                              <span aria-hidden="true"> · </span>
                              <span className="text-slate-300">
                                {formatPlayerNationalityFull(player, club?.country)}
                              </span>
                              <span aria-hidden="true"> · </span>
                              <span>{statusLabel}</span>
                            </p>
                          </div>
                        </div>
                        <span className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
                          {player.overall}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mb-3 bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {club ? (
                            <>
                              <ClubCrest club={club} size="xs" rounded="md" />
                              <span className="text-slate-200 font-medium truncate">{club.name}</span>
                            </>
                          ) : (
                            <span className="text-emerald-400 font-semibold">
                              Sem Clube · Custo Zero
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono tabular-nums shrink-0">
                          Salvo {formatDateShortBR(entry.addedAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-800/80 tabular-nums">
                        <div>
                          <span className="text-[10px] text-slate-500 block">
                            {club ? 'Valor de Passe' : 'Luvas / Passe'}
                          </span>
                          <strong className="text-emerald-400 font-mono text-[11px]">
                            {club ? formatCurrency(player.marketValue) : 'R$ 0 (Livre)'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Salário Mensal</span>
                          <strong className="text-slate-200 font-mono text-[11px]">
                            {formatCurrency(player.wage)}/mês
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {pendingDeal ? (
                        <div className="py-2 px-3 rounded-lg bg-sky-500/15 border border-sky-500/35 text-center text-xs font-semibold text-sky-300 tabular-nums">
                          Acordo fechado · Chega em {pendingDeal.arrivalDisplayDate}
                        </div>
                      ) : !club ? (
                        <button
                          type="button"
                          onClick={() => openNegotiation(player)}
                          className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                        >
                          {windowStatus.isOpen
                            ? 'Contratar a Custo Zero'
                            : `Assinar p/ Janela (${windowStatus.nextOpenDisplay})`}
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {availabilityKind === 'BOSMAN' &&
                          !player.preContractClubId &&
                          onSignPreContract ? (
                            <button
                              type="button"
                              onClick={() => openPreContractModal(player, club)}
                              className="py-2 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                              <span>Pré-Contrato</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openLoanModal(player, club)}
                              className="py-2 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Handshake className="w-3.5 h-3.5" />
                              <span>Empréstimo</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openNegotiation(player, club)}
                            className="py-2 px-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {windowStatus.isOpen ? 'Comprar' : 'Contratar p/ Janela'}
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {renderCompareButton(player, club, false)}
                        <button
                          type="button"
                          onClick={() => handleRemoveWatch(player.id)}
                          className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB PENDING WINDOW: ACORDOS FECHADOS AGUARDANDO ABERTURA DA JANELA */}
      {activeTab === 'pending_window' && (
        <div className="space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wider tabular-nums">
                Calendário Oficial de Registros · Janelas em Janeiro–Fevereiro e Julho–Agosto
              </div>
              <h3 className="text-lg font-black text-white">
                Transferências Acertadas Aguardando Abertura da Janela ({pendingTransfers.length})
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Todos os negócios abaixo já foram assinados e liquidados financeiramente. Assim que o calendário atingir a data de reabertura da janela, os atletas se apresentam automaticamente aos novos elencos.
              </p>
            </div>
            <div className="text-right text-xs font-mono tabular-nums text-slate-300">
              <div>
                Status atual:{' '}
                <strong className={windowStatus.isOpen ? 'text-emerald-400' : 'text-amber-300'}>
                  {windowStatus.shortBadge}
                </strong>
              </div>
              {!windowStatus.isOpen && (
                <div className="text-slate-400 mt-0.5">
                  Reabertura: <strong className="text-white">{windowStatus.nextOpenDisplay}</strong>
                </div>
              )}
            </div>
          </div>

          {pendingTransfers.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <p className="text-sm font-bold text-slate-200">
                Nenhuma transferência aguardando abertura de janela no momento.
              </p>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                {windowStatus.isOpen
                  ? 'A janela de transferências está aberta agora! Qualquer contratação ou venda realizada entra em vigor imediatamente.'
                  : `Como a janela está fechada até ${windowStatus.nextOpenDisplay}, qualquer jogador contratado agora no Mercado Aberto, Livres, Empréstimos ou Rede de Olheiros aparecerá listado aqui até o dia da apresentação.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingTransfers.map((deal) => {
                const isIncoming = deal.toClubId === userClub.id;
                const daysLeft = gameState?.currentDate
                  ? Math.max(0, daysBetween(gameState.currentDate, deal.arrivalDate))
                  : 0;
                const kindLabel =
                  deal.dealKind === 'PURCHASE'
                    ? 'Compra Definitiva'
                    : deal.dealKind === 'SWAP'
                    ? `Troca (${deal.swapOutPlayerName || 'Atleta'} incluído)`
                    : deal.dealKind === 'RELEASE_CLAUSE'
                    ? 'Multa Rescisória'
                    : deal.dealKind === 'FREE_AGENT'
                    ? 'Custo Zero (Livre)'
                    : deal.dealKind === 'LOAN_IN'
                    ? `Empréstimo (${deal.loanDurationRounds || 19} rodadas)`
                    : deal.dealKind === 'SCOUT_SIGNING'
                    ? `Olheiro (${deal.scoutRegionName || 'Captação'})`
                    : deal.dealKind === 'SALE_OUT'
                    ? 'Venda Agendada'
                    : `Cessão por Empréstimo`;

                return (
                  <div
                    key={deal.id}
                    className={`bg-slate-950 border rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                      isIncoming ? 'border-emerald-500/35' : 'border-amber-500/35'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-mono tabular-nums text-slate-400">
                            <span className={isIncoming ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                              {isIncoming ? 'CHEGADA AGENDADA' : 'SAÍDA AGENDADA'}
                            </span>
                            {' · '}
                            <span>{kindLabel}</span>
                          </div>
                          <h4 className="text-base font-black text-white mt-0.5">
                            {deal.playerName}{' '}
                            <span className="text-xs font-semibold text-sky-400">
                              ({deal.playerRole} · OVR {deal.playerOverall} · {deal.playerAge}a
                              {deal.player ? ` · ${formatPlayerNationalityFull(deal.player)}` : ''})
                            </span>
                          </h4>
                        </div>
                        <div className="text-right font-mono tabular-nums shrink-0">
                          <div className="text-[11px] text-slate-400">Apresentação</div>
                          <div className="text-sm font-black text-sky-300">
                            {deal.arrivalDisplayDate}
                          </div>
                          {daysLeft > 0 && (
                            <div className="text-[10px] text-slate-500">em {daysLeft} dia(s)</div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center gap-2 py-2 border-y border-slate-800/80 tabular-nums">
                        <span className="text-slate-400 truncate">{deal.fromClubName}</span>
                        <span className="text-sky-400 font-bold shrink-0">➔</span>
                        <strong className="text-white truncate">{deal.toClubName}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                      <span>
                        Valor:{' '}
                        <strong className="text-emerald-400">
                          {deal.fee > 0 ? formatCurrency(deal.fee) : 'R$ 0'}
                        </strong>
                      </span>
                      <span>
                        Salário:{' '}
                        <strong className="text-slate-200">
                          {formatCurrency(deal.offeredWage)}/mês
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB DEADLINE DAY: PLANTÃO DE FECHAMENTO DE JANELA */}
      {activeTab === 'deadline_day' && (
        <div className="space-y-6">
          <div className="bg-slate-950 border border-amber-500/35 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider tabular-nums">
                {isDeadlineWindow
                  ? `Plantão Oficial Aberto · Janela fecha em ${windowStatus.closesOnDisplay}`
                  : `Central de Fechamento de Janela · Picos na última semana de Fevereiro e de Agosto`}
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Deadline Day: Negócios Relâmpago & Assédio de Última Hora
              </h3>
              <p className="text-xs text-slate-300">
                Empresários oferecem atletas com desconto imediato de 20% sobre o valor de mercado (você também pode incluir jogadores na troca!), enquanto clubes com caixa alto tentam tirar titulares do seu elenco pagando +22% acima da cotação.
              </p>
            </div>
            <div className="text-right text-xs font-mono tabular-nums text-slate-300">
              <div>Caixa atual: <strong className="text-emerald-400">{formatCurrency(userClub.finances.balance)}</strong></div>
              <div className="text-slate-400 mt-0.5">Elenco: {userClub.squad.length} atletas</div>
            </div>
          </div>

          {deadlineFeedback && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{deadlineFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setDeadlineFeedback(null)}
                className="text-slate-400 hover:text-white font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Oportunidades Relâmpago (-20% OFF) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Oportunidades Relâmpago (-20% no Passe)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atletas colocados em negociação expressa pelos empresários nesta rodada.
                </p>
              </div>

              <div className="divide-y divide-slate-800/80">
                {deadlineFlashDeals.map(({ player, club, flashPrice }) => (
                  <div
                    key={player.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          inspection?.inspectPlayer(player, club);
                        }}
                        className="text-sm font-bold text-white hover:text-amber-300 transition-colors truncate block text-left cursor-pointer max-w-full"
                      >
                        {player.name}
                      </button>
                      <div className="text-xs text-slate-400 tabular-nums">
                        {player.detailedRole} · OVR {player.overall} · {player.age} anos · {formatPlayerNationalityFull(player, club.country)} · {club.shortName}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-[11px] text-slate-500 line-through">
                          {formatCurrency(player.marketValue)}
                        </div>
                        <div className="text-xs font-bold text-amber-300">
                          {formatCurrency(flashPrice)}
                        </div>
                      </div>
                      {renderWatchlistButton(player.id, true)}
                      <button
                        type="button"
                        onClick={() => openNegotiation(player, club, 0.8)}
                        className="px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs whitespace-nowrap cursor-pointer transition-colors"
                      >
                        Negociar (-20%)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Propostas Urgentes de Última Hora (+22% Ágio) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Investidas Urgentes pelo Seu Elenco (+22% Ágio)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Clubes rivais dispostos a pagar acima do mercado para fechar negócio imediato à vista.
                </p>
              </div>

              {deadlineUrgentBuyouts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Seu elenco está no limite mínimo de atletas ou sem investidas extras no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {deadlineUrgentBuyouts.map(({ player, buyerClub, offerPrice }) => (
                    <div
                      key={player.id}
                      className="py-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            inspection?.inspectPlayer(player, userClub);
                          }}
                          className="text-sm font-bold text-white hover:text-emerald-300 transition-colors truncate block text-left cursor-pointer max-w-full"
                        >
                          {player.name}
                        </button>
                        <div className="text-xs text-slate-400 tabular-nums">
                          {player.detailedRole} · OVR {player.overall} · {formatPlayerNationalityFull(player, userClubCountry)} · Interessado:{' '}
                          <strong className="text-slate-200">{buyerClub.name}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-[11px] text-slate-400">
                            Mercado: {formatCurrency(player.marketValue)}
                          </div>
                          <div className="text-xs font-bold text-emerald-400">
                            À vista: {formatCurrency(offerPrice)}
                          </div>
                        </div>
                        {onSellPlayerUrgentDeadline && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              const sold = onSellPlayerUrgentDeadline(
                                player.id,
                                buyerClub.id,
                                offerPrice
                              );
                                if (sold) {
                                  soundEngine.playFanfare();
                                  setDeadlineFeedback(
                                    windowStatus.isOpen
                                      ? `Venda de última hora concluída! ${player.name} foi negociado com o ${buyerClub.name} por ${formatCurrency(offerPrice)} à vista!`
                                      : `Venda fechada! ${formatCurrency(offerPrice)} creditados à vista, e ${player.name} se apresenta ao ${buyerClub.name} na abertura da janela em ${windowStatus.nextOpenDisplay}!`
                                  );
                                }
                              }}
                              className="px-3 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs whitespace-nowrap cursor-pointer transition-colors"
                            >
                              Vender Agora
                            </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 0: CENTRAL IA & PROPOSTAS (AI TRANSFER DIRECTOR & INCOMING OFFERS) */}
      {activeTab === 'ai_director' && (
        <div className="space-y-6">
          {/* Action feedback banner */}
          {aiActionFeedback && (
            <div
              className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-xs ${
                aiActionFeedback.ok
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {aiActionFeedback.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{aiActionFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setAiActionFeedback(null)}
                className="text-slate-400 hover:text-white font-semibold cursor-pointer shrink-0"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Section 1: AI Squad Diagnosis & Auto-Negotiate Delegation */}
          {aiReport && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="text-xs text-emerald-400 font-semibold">
                    Diretor de Futebol IA · Diagnóstico de Elenco & Negociações
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Planejamento de Contratações e Vendas do {userClub.name}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {aiReport.diagnosis.summaryNote}
                  </p>
                </div>

                {onToggleAiAutoNegotiate && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onToggleAiAutoNegotiate();
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shrink-0 border ${
                      aiDirectorAutoNegotiate
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>
                      {aiDirectorAutoNegotiate
                        ? 'Venda Automática IA Ativa (Listados)'
                        : 'Delegar Venda de Listados à IA'}
                    </span>
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs tabular-nums">
                <div>
                  <div className="text-slate-400">Força Média Titular</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {aiReport.diagnosis.avgStarterOverall} OVR
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Setor Mais Carente</div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">
                    {aiReport.diagnosis.weakestRole} ({aiReport.diagnosis.weakestRoleAvgOvr} OVR)
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Teto Seguro p/ Compras</div>
                  <div className="text-base font-bold text-sky-300 mt-0.5">
                    {formatCurrency(aiReport.diagnosis.safeTransferBudget)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Folha Salarial Mensal</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">
                    {formatCurrency(aiReport.diagnosis.monthlyWageTotal)}/mês
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Incoming Transfer & Loan Offers from CPU Clubs */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white">
                  Propostas Oficiais Recebidas ({pendingOffers.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Clubes rivais monitoram seus destaques e atletas listados a cada rodada. Use a IA para pedir +18% de valorização ou fechar negócio na hora.
                </p>
              </div>
            </div>

            {pendingOffers.length === 0 ? (
              <div className="py-8 text-center border border-slate-800/80 rounded-xl bg-slate-900/30 px-4">
                <p className="text-sm font-semibold text-slate-300">
                  Nenhuma proposta pendente na mesa no momento.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Use a seção &ldquo;Vender & Oferecer Atletas com Ajuda da IA&rdquo; logo abaixo para buscar compradores imediatos para jogadores do seu elenco.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingOffers.map((offer) => {
                  const buyerClub = allClubs.find((c) => c.id === offer.fromClubId);
                  const squadPlayer = userClub.squad.find((p) => p.id === offer.playerId);
                  const pName = offer.playerName || squadPlayer?.name || 'Atleta';
                  const pRole = offer.playerRole || squadPlayer?.detailedRole || 'MEI';
                  const pOvr = offer.playerOverall || squadPlayer?.overall || 70;
                  const pAge = offer.playerAge || squadPlayer?.age || 24;
                  const isLoanOffer = offer.offerType === 'LOAN';

                  return (
                    <div
                      key={offer.id}
                      className="border border-slate-800 rounded-xl p-4 bg-slate-900/40 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-slate-400 tabular-nums">
                              {pRole} · {pAge} anos · OVR {pOvr} · {offer.date}
                            </div>
                            {squadPlayer ? (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  inspection?.inspectPlayer(squadPlayer, userClub);
                                }}
                                className="text-base font-bold text-white hover:text-sky-300 transition-colors mt-0.5 text-left cursor-pointer"
                              >
                                {pName}
                              </button>
                            ) : (
                              <h4 className="text-base font-bold text-white mt-0.5">
                                {pName}
                              </h4>
                            )}
                          </div>
                          <div className="text-right tabular-nums">
                            <div className="text-xs text-slate-400">
                              {isLoanOffer ? 'Empréstimo' : 'Oferta à Vista'}
                            </div>
                            <div className="text-base font-black text-emerald-400">
                              {isLoanOffer
                                ? `${offer.loanWageSharePct || 80}% Salário`
                                : formatCurrency(offer.transferFee)}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-slate-300 tabular-nums">
                          Clube interessado:{' '}
                          <span className="font-semibold text-white">
                            {offer.fromClubName || buyerClub?.name || 'Clube'}
                          </span>
                          {buyerClub ? ` · Série ${buyerClub.division}` : ''}
                          {!isLoanOffer && offer.aiRecommendedPrice ? (
                            <>
                              {' '}
                              · Alvo sugerido pela IA:{' '}
                              <span className="text-sky-300 font-semibold">
                                {formatCurrency(offer.aiRecommendedPrice)}
                              </span>
                            </>
                          ) : null}
                        </div>

                        {offer.reason && (
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {offer.reason}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOfferDecision(offer.id, 'ACCEPT')}
                          className="flex-1 min-w-[110px] py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer text-center"
                        >
                          Aceitar Proposta
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOfferDecision(offer.id, 'COUNTER')}
                          className="flex-1 min-w-[130px] py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer text-center tabular-nums"
                        >
                          {isLoanOffer ? 'Exigir Taxa c/ IA' : 'Pedir +18% com IA'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOfferDecision(offer.id, 'REJECT')}
                          className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: AI-Recommended Signings */}
          {aiReport && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Reforços Recomendados pelo Diretor IA ({aiReport.recommendedSignings.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Jogadores filtrados automaticamente pelo orçamento atual e pelas carências táticas do seu elenco, com valores ótimos de acordo pré-calculados.
                </p>
              </div>

              {aiReport.recommendedSignings.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">
                  Nenhum alvo compatível com o caixa atual encontrado nesta janela.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiReport.recommendedSignings.map((rec) => {
                    const modeLabel =
                      rec.dealMode === 'FREE_AGENT'
                        ? 'Sem Clube (Custo Zero)'
                        : rec.dealMode === 'BOSMAN'
                        ? 'Pré-Contrato Bosman'
                        : rec.dealMode === 'LOAN'
                        ? 'Empréstimo Sugerido'
                        : 'Compra Definitiva';

                    return (
                      <div
                        key={`${rec.dealMode}_${rec.player.id}`}
                        className="border border-slate-800 rounded-xl p-4 bg-slate-900/35 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <PlayerAvatar
                                player={rec.player}
                                club={rec.sellerClub ?? null}
                                clubPrimaryColor={rec.sellerClub?.colors.primary}
                                clubTextColor={rec.sellerClub?.colors.text}
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="text-xs text-slate-400 tabular-nums">
                                  <span className="text-sky-400 font-semibold">
                                    {rec.player.detailedRole}
                                  </span>{' '}
                                  · {rec.player.age} anos · {formatPlayerNationalityFull(rec.player, rec.sellerClub?.country)} · {modeLabel}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick();
                                    inspection?.inspectPlayer(rec.player, rec.sellerClub ?? null);
                                  }}
                                  className="font-bold text-white hover:text-sky-300 transition-colors text-sm mt-0.5 truncate block text-left cursor-pointer max-w-full"
                                >
                                  {rec.player.name}
                                </button>
                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                                  {rec.sellerClub ? (
                                    <>
                                      <ClubCrest club={rec.sellerClub} size="xs" rounded="md" />
                                      <span className="truncate">{rec.sellerClub.name}</span>
                                    </>
                                  ) : (
                                    'Disponível p/ assinatura imediata'
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 tabular-nums">
                              <div className="text-base font-black text-sky-300">
                                {rec.player.overall}
                              </div>
                              {rec.upgradeDeltaOvr > 0 && (
                                <div className="text-[11px] font-semibold text-emerald-400">
                                  +{rec.upgradeDeltaOvr} OVR
                                </div>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">
                            {rec.aiRationale}
                          </p>

                          <div className="text-xs text-slate-400 tabular-nums pt-1">
                            Passe estimado:{' '}
                            <span className="text-white font-semibold">
                              {rec.suggestedFee === 0
                                ? 'R$ 0'
                                : formatCurrency(rec.suggestedFee)}
                            </span>{' '}
                            · Salário alvo:{' '}
                            <span className="text-slate-200 font-semibold">
                              {formatCurrency(rec.suggestedWage)}/mês
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {renderCompareButton(rec.player, rec.sellerClub)}
                          {renderWatchlistButton(rec.player.id)}
                          <button
                            type="button"
                            onClick={() => handleOpenAiRecommendedSigning(rec)}
                            className="flex-1 py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Negociar c/ IA
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Sell & Shop User Squad Players with AI Assistance */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Vender & Oferecer Atletas com Ajuda da IA
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Peça ao Diretor IA para oferecer qualquer jogador do elenco aos clubes do Brasil e da América do Sul e gerar propostas reais na hora.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={aiOutgoingSearch}
                  onChange={(e) => setAiOutgoingSearch(e.target.value)}
                  placeholder="Filtrar atleta do elenco..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {aiReport && aiReport.recommendedOutgoings.length > 0 && !aiOutgoingSearch && (
              <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-900/30 space-y-2">
                <div className="text-xs font-semibold text-amber-300">
                  Sugestões da IA para aliviar folha ou fazer caixa:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {aiReport.recommendedOutgoings.map((out) => (
                    <div
                      key={`rec_out_${out.player.id}`}
                      className="flex items-center justify-between gap-3 border border-slate-800/90 rounded-lg px-3 py-2.5 bg-slate-950/70"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              inspection?.inspectPlayer(out.player, userClub);
                            }}
                            className="hover:text-sky-300 transition-colors cursor-pointer text-left"
                          >
                            {out.player.name}
                          </button>{' '}
                          <span className="font-normal text-slate-400 tabular-nums">
                            · {out.player.detailedRole} · OVR {out.player.overall}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5 tabular-nums">
                          {out.recommendedAction === 'LOAN_OUT'
                            ? `Empréstimo sugerido · Economia ${formatCurrency(out.monthlyWageSaved)}/mês`
                            : `Valor estimado ${formatCurrency(out.estimatedSaleValue)} · Salário ${formatCurrency(out.monthlyWageSaved)}/mês`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleShopPlayerClick(out.player.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        Oferecer via IA
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden">
              {transferableUserSquad.slice(0, 14).map((player) => {
                const hasPendingBid = pendingOffers.some((o) => o.playerId === player.id);
                return (
                  <div
                    key={player.id}
                    className="px-4 py-3 bg-slate-950 hover:bg-slate-900/50 transition-colors flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            inspection?.inspectPlayer(player, userClub);
                          }}
                          className="hover:text-sky-300 transition-colors cursor-pointer text-left"
                        >
                          {player.name}
                        </button>
                        <span className="font-normal text-slate-400 tabular-nums">
                          {player.detailedRole} · {player.age} anos · {formatPlayerNationalityFull(player, userClubCountry)} · OVR {player.overall}
                          {player.isStarter ? ' · Titular' : ' · Reserva'}
                          {player.isListedForSale ? ' · Listado p/ Venda' : ''}
                          {hasPendingBid ? ' · Com Proposta na Mesa' : ''}
                        </span>
                      </div>
                      <div className="text-slate-400 mt-0.5 tabular-nums">
                        Valor de mercado: {formatCurrency(player.marketValue)} · Salário:{' '}
                        {formatCurrency(player.wage)}/mês
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {findPendingTransferForPlayer(pendingTransfers, player.id) ? (
                        <span className="text-xs font-semibold text-sky-300 tabular-nums">
                          Saída em {findPendingTransferForPlayer(pendingTransfers, player.id)?.arrivalDisplayDate}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              if (player.isListedForSale) {
                                onDelistPlayer(player.id);
                              } else {
                                onListPlayerForSale(player.id);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
                              player.isListedForSale
                                ? 'bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-slate-700'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            {player.isListedForSale ? 'Retirar' : 'Listar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openLoanOutModal(player)}
                            disabled={userClub.squad.length <= 16}
                            className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 text-sky-300 border border-sky-500/40 font-bold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Emprestar
                          </button>
                          <button
                            type="button"
                            onClick={() => openSellPlayerModal(player)}
                            disabled={userClub.squad.length <= 16}
                            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-black transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Venda Direta
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShopPlayerClick(player.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Oferta IA
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 0B: VENDER & CEDER ELENCO (GESTÃO PRÁTICA DE SAÍDAS) */}
      {activeTab === 'sell_squad' && (() => {
        const monthlyPayroll = userClub.squad.reduce((acc, p) => acc + p.wage, 0);
        const q = aiOutgoingSearch.trim().toLowerCase();
        const squadRows = [...userClub.squad]
          .filter((p) => {
            if (sellSquadFilter === 'RESERVES' && (p.isStarter || p.isLoan)) return false;
            if (sellSquadFilter === 'U23' && (p.age > 23 || p.isLoan)) return false;
            if (sellSquadFilter === 'LISTED' && ((!p.isListedForSale && !p.isListedForLoan) || p.isLoan)) return false;
            if (q && !p.name.toLowerCase().includes(q) && !p.detailedRole.toLowerCase().includes(q)) return false;
            return true;
          })
          .sort((a, b) => {
            if (sellSquadSort === 'POS_ASC') return comparePlayersByPosition(a, b);
            if (sellSquadSort === 'OVR_DESC') return b.overall - a.overall;
            if (sellSquadSort === 'WAGE_DESC') return b.wage - a.wage;
            if (sellSquadSort === 'AGE_ASC') return a.age - b.age;
            return b.marketValue - a.marketValue;
          });

        return (
          <div className="space-y-4">
            {/* KPI Summary Strip */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    <span>Vender & Ceder Jogadores do {userClub.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Negocie vendas imediatas com interessados reais, ceda jovens por empréstimo com divisão salarial ou liste atletas para receber propostas.
                  </p>
                </div>
                {pendingOffers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveTab('ai_director');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer whitespace-nowrap tabular-nums"
                  >
                    Ver {pendingOffers.length} Proposta(s) Recebida(s) →
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs tabular-nums">
                <div>
                  <div className="text-slate-400">Elenco Atual (mín. 16)</div>
                  <div className="text-base font-black text-white mt-0.5">
                    {userClub.squad.length}/{MAX_SQUAD_SIZE} atletas
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Folha Mensal Total</div>
                  <div className="text-base font-black text-sky-300 mt-0.5">
                    {formatCurrency(monthlyPayroll)}/mês
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Receita em Vendas ({currentSeasonYear})</div>
                  <div className="text-base font-black text-emerald-400 mt-0.5">
                    {formatCurrency(userSalesTotal)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Propostas Pendentes</div>
                  <div className="text-base font-black text-amber-300 mt-0.5">
                    {pendingOffers.length} {pendingOffers.length === 1 ? 'oferta' : 'ofertas'}
                  </div>
                </div>
              </div>
            </div>

            {sellSquadFeedback && (
              <div
                className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-xs ${
                  sellSquadFeedback.ok
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {sellSquadFeedback.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{sellSquadFeedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSellSquadFeedback(null)}
                  className="text-slate-400 hover:text-white font-semibold cursor-pointer shrink-0"
                >
                  Fechar
                </button>
              </div>
            )}

            {/* Squad Filter & Sort Controls */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: `Todos (${userClub.squad.length})` },
                    {
                      id: 'RESERVES',
                      label: `Reservas (${userClub.squad.filter((p) => !p.isStarter && !p.isLoan).length})`,
                    },
                    {
                      id: 'U23',
                      label: `Jovens Sub-23 (${userClub.squad.filter((p) => p.age <= 23 && !p.isLoan).length})`,
                    },
                    {
                      id: 'LISTED',
                      label: `Na Vitrine (${userClub.squad.filter((p) => (p.isListedForSale || p.isListedForLoan) && !p.isLoan).length})`,
                    },
                  ] as const
                ).map((flt) => (
                  <button
                    key={flt.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSellSquadFilter(flt.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      sellSquadFilter === flt.id
                        ? 'bg-emerald-400 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2" />
                  <input
                    type="text"
                    value={aiOutgoingSearch}
                    onChange={(e) => setAiOutgoingSearch(e.target.value)}
                    placeholder="Buscar jogador ou posição..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <select
                  value={sellSquadSort}
                  onChange={(e) =>
                    setSellSquadSort(e.target.value as 'POS_ASC' | 'VALUE_DESC' | 'OVR_DESC' | 'WAGE_DESC' | 'AGE_ASC')
                  }
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="POS_ASC">Posição (GOL → ATA)</option>
                  <option value="VALUE_DESC">Maior Valor</option>
                  <option value="OVR_DESC">Maior Força (OVR)</option>
                  <option value="WAGE_DESC">Maior Salário</option>
                  <option value="AGE_ASC">Mais Jovens</option>
                </select>
              </div>
            </div>

            {/* Squad Action Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 overflow-hidden">
              {squadRows.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nenhum jogador do elenco corresponde ao filtro selecionado.
                </div>
              ) : (
                squadRows.map((player) => {
                  const pendingDeal = findPendingTransferForPlayer(pendingTransfers, player.id);
                  const squadBelowMin = userClub.squad.length <= 16;

                  return (
                    <div
                      key={player.id}
                      className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-slate-900/35 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatar
                          player={player}
                          club={userClub}
                          clubPrimaryColor={userClub.colors.primary}
                          clubTextColor={userClub.colors.text}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                inspection?.inspectPlayer(player, userClub);
                              }}
                              className="font-bold text-white hover:text-sky-300 transition-colors text-sm truncate text-left cursor-pointer"
                            >
                              {player.name}
                            </button>
                            <span className="font-mono font-black text-sky-300 tabular-nums">
                              OVR {player.overall}
                            </span>
                            <span className="text-slate-400 tabular-nums">
                              · #{player.squadNumber} · {player.detailedRole} · {player.age} anos · {formatPlayerNationalityFull(player, userClubCountry)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] tabular-nums">
                            <span className={player.isStarter ? 'text-sky-300 font-semibold' : 'text-slate-400'}>
                              {player.isStarter ? 'Titular' : 'Reserva'}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400">
                              Contrato {player.contractYears || 2} {(player.contractYears || 2) === 1 ? 'ano' : 'anos'}
                            </span>
                            {player.isListedForSale && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-amber-300 font-semibold">Listado p/ Venda</span>
                              </>
                            )}
                            {player.isListedForLoan && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-emerald-300 font-semibold">Disponível p/ Empréstimo</span>
                              </>
                            )}
                            {player.isLoan && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-amber-400 font-semibold">
                                  Emprestado ({allClubs.find((c) => c.id === player.loanParentClubId)?.shortName || 'Clube de Origem'})
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0">
                        <div className="flex items-center gap-4 font-mono tabular-nums">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Valor de Mercado</span>
                            <strong className="text-emerald-400">{formatCurrency(player.marketValue)}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Salário Mensal</span>
                            <strong className="text-slate-200">{formatCurrency(player.wage)}</strong>
                          </div>
                        </div>

                        {pendingDeal ? (
                          <div className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/35 text-sky-300 font-semibold tabular-nums">
                            Saída agendada ({pendingDeal.arrivalDisplayDate})
                          </div>
                        ) : player.isLoan ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setActiveTab('my_loans');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Gerir em Meus Empréstimos →
                          </button>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              disabled={squadBelowMin}
                              onClick={() => openSellPlayerModal(player)}
                              title={
                                squadBelowMin
                                  ? 'Elenco no mínimo de 16 atletas'
                                  : 'Abrir mesa de venda rápida com interessados reais'
                              }
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Vender Agora
                            </button>
                            <button
                              type="button"
                              disabled={squadBelowMin}
                              onClick={() => openLoanOutModal(player)}
                              title={
                                squadBelowMin
                                  ? 'Elenco no mínimo de 16 atletas'
                                  : 'Emprestar para clube parceiro'
                              }
                              className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 text-sky-300 border border-sky-500/40 font-bold transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Emprestar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!onShopPlayerWithAi) return;
                                soundEngine.playClick();
                                const res = onShopPlayerWithAi(player.id);
                                setSellSquadFeedback({
                                  ok: res.offersGenerated > 0,
                                  text: res.feedbackText,
                                });
                                if (res.offersGenerated > 0) soundEngine.playFanfare();
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 font-bold transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Oferta IA
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                if (player.isListedForSale) {
                                  onDelistPlayer(player.id);
                                } else {
                                  onListPlayerForSale(player.id);
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                player.isListedForSale
                                  ? 'bg-slate-800 text-amber-300 border-amber-500/40'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                              }`}
                            >
                              {player.isListedForSale ? 'Retirar' : 'Listar'}
                            </button>
                            {onTogglePlayerLoanList && (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  onTogglePlayerLoanList(player.id);
                                }}
                                title="Sinalizar disponibilidade para receber pedidos de empréstimo de outros clubes"
                                className={`px-2.5 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                  player.isListedForLoan
                                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                                }`}
                              >
                                {player.isListedForLoan ? 'Vitrine Empr.' : '+Empréstimo'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 1: ALL PLAYERS (MERCADO ABERTO) */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {filteredMarket.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-2 text-xs text-slate-400">
              <p>Nenhum jogador encontrado no mercado para os filtros aplicados.</p>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSearchQuery('');
                  setSelectedRole('ALL');
                  setSelectedNationality('ALL');
                  setSelectedRegion('ALL');
                  setOnlyWithinBudget(false);
                  setOnlyWatchlisted(false);
                  setMinOverall(60);
                  setMarketDisplayLimit(48);
                }}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold cursor-pointer"
              >
                Resetar Filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMarket.slice(0, marketDisplayLimit).map(({ player, club }) => {
                  const pendingDeal = findPendingTransferForPlayer(pendingTransfers, player.id);
                  return (
                    <div
                      key={player.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar
                              player={player}
                              club={club}
                              clubPrimaryColor={club.colors.primary}
                              clubTextColor={club.colors.text}
                              size="md"
                            />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  inspection?.inspectPlayer(player, club);
                                }}
                                className="font-bold text-white text-sm hover:text-sky-300 transition-colors truncate block text-left cursor-pointer max-w-full"
                              >
                                {player.name}
                              </button>
                              <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 tabular-nums">
                                <span className="text-sky-400 font-semibold">{player.detailedRole}</span>
                                <span>·</span>
                                <span>{player.age} anos</span>
                                <span>·</span>
                                <span className="text-slate-300">{formatPlayerNationalityFull(player, club.country)}</span>
                                <span>·</span>
                                <span>Pé {player.preferredFoot}</span>
                              </p>
                            </div>
                          </div>
                          <span className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 text-sky-300 font-black text-xs flex items-center justify-center shrink-0 tabular-nums">
                            {player.overall}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-3 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <ClubCrest club={club} size="xs" rounded="md" />
                            <span className="text-slate-300 font-medium truncate">{club.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {renderCompareButton(player, club, true)}
                            {renderWatchlistButton(player.id, true)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-2 tabular-nums">
                          <div className="bg-slate-900/60 p-2 rounded-lg">
                            <span className="text-[10px] text-slate-500 block">Passe · Salário</span>
                            <strong className="text-emerald-400 font-mono text-[11px] block">
                              {formatCurrency(player.marketValue)}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatCurrency(player.wage)}/mês
                            </span>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-lg">
                            <span className="text-[10px] text-slate-500 block">Multa · Vínculo</span>
                            <strong className="text-sky-300 font-mono text-[11px] block">
                              {formatCurrency(player.releaseClause || computeDefaultReleaseClause(player))}
                            </strong>
                            <span
                              className={`text-[10px] font-mono ${
                                (player.contractYears || 2) <= 1 ? 'text-amber-400 font-semibold' : 'text-slate-400'
                              }`}
                            >
                              {player.contractYears || 2} {(player.contractYears || 2) === 1 ? 'ano' : 'anos'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {pendingDeal ? (
                        <div className="pt-2 border-t border-slate-800/80">
                          <div className="py-2 px-3 rounded-lg bg-sky-500/15 border border-sky-500/35 text-center text-xs font-semibold text-sky-300 tabular-nums">
                            Acordo fechado · Chega em {pendingDeal.arrivalDisplayDate}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                          {(player.contractYears || 2) <= 1 &&
                          !player.isLoan &&
                          !player.preContractClubId &&
                          !player.retiringAtSeasonEnd &&
                          onSignPreContract ? (
                            <button
                              onClick={() => openPreContractModal(player, club)}
                              className="py-2 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                              <span>Pré-Contrato</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openLoanModal(player, club)}
                              className="py-2 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <Handshake className="w-3.5 h-3.5" />
                              <span>Empréstimo</span>
                            </button>
                          )}
                          <button
                            onClick={() => openNegotiation(player, club)}
                            className="py-2 px-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-md cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <span>{windowStatus.isOpen ? 'Comprar' : 'Contratar p/ Janela'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs tabular-nums">
                <span className="text-slate-400">
                  Exibindo <strong className="text-white">{Math.min(marketDisplayLimit, filteredMarket.length)}</strong> de{' '}
                  <strong className="text-white">{filteredMarket.length}</strong> jogadores no mercado
                </span>
                {marketDisplayLimit < filteredMarket.length && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setMarketDisplayLimit((prev) => prev + 48);
                    }}
                    className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black cursor-pointer whitespace-nowrap"
                  >
                    Mostrar mais +48 (restam {filteredMarket.length - marketDisplayLimit})
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: FREE AGENTS (LIVRES) */}
      {activeTab === 'free' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFreeAgents.map((player) => {
              const pendingDeal = findPendingTransferForPlayer(pendingTransfers, player.id);
              return (
                <div
                  key={player.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar player={player} size="md" />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              inspection?.inspectPlayer(player, null);
                            }}
                            className="font-bold text-white hover:text-emerald-300 transition-colors text-sm truncate block text-left cursor-pointer max-w-full"
                          >
                            {player.name}
                          </button>
                          <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 tabular-nums">
                            <span className="text-emerald-400 font-semibold">{player.detailedRole}</span>
                            <span>·</span>
                            <span>{player.age} anos</span>
                            <span>·</span>
                            <span className="text-slate-300">{formatPlayerNationalityFull(player)}</span>
                            <span>·</span>
                            <span>Sem Contrato</span>
                          </p>
                        </div>
                      </div>
                      <span className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 font-black text-xs flex items-center justify-center shrink-0">
                        {player.overall}
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-lg text-xs mb-3 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-slate-400">Salário Pedido: </span>
                        <strong className="text-emerald-400 font-mono tabular-nums">
                          {formatCurrency(player.wage)}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {renderCompareButton(player, null, true)}
                        {renderWatchlistButton(player.id, true)}
                      </div>
                    </div>
                  </div>

                  {pendingDeal ? (
                    <div className="py-2 px-3 rounded-lg bg-sky-500/15 border border-sky-500/35 text-center text-xs font-semibold text-sky-300 tabular-nums">
                      Acordo fechado · Chega em {pendingDeal.arrivalDisplayDate}
                    </div>
                  ) : (
                    <button
                      onClick={() => openNegotiation(player)}
                      className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {windowStatus.isOpen
                          ? 'Contratar a Custo Zero'
                          : `Assinar p/ Janela (${windowStatus.nextOpenDisplay})`}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2B: BOSMAN PRE-CONTRACT PLAYERS (FIM DE CONTRATO) */}
      {activeTab === 'bosman' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Lei Bosman: Atletas no Último Ano de Contrato</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Negocie diretamente o salário com atletas em reta final de vínculo sem pagar taxa de transferência ao clube atual. O reforço se apresenta em 15/01/{currentSeasonYear + 1}.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold tabular-nums whitespace-nowrap shrink-0">
              {filteredBosmanPlayers.length} oportunidades
            </span>
          </div>

          {filteredBosmanPlayers.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              Nenhum atleta em último ano de contrato corresponde aos filtros atuais.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredBosmanPlayers.slice(0, marketDisplayLimit).map(({ player, club }) => {
                  const alreadySignedPre = Boolean(player.preContractClubId);
                  const signedWithUser = player.preContractClubId === userClub.id;
                  return (
                    <div
                      key={player.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar
                              player={player}
                              club={club}
                              clubPrimaryColor={club.colors.primary}
                              clubTextColor={club.colors.text}
                              size="md"
                            />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  inspection?.inspectPlayer(player, club);
                                }}
                                className="font-bold text-white hover:text-emerald-300 transition-colors text-sm truncate block text-left cursor-pointer max-w-full"
                              >
                                {player.name}
                              </button>
                              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                                <span className="text-emerald-400 font-semibold">{player.detailedRole}</span>
                                <span aria-hidden="true"> · </span>
                                <span>{player.age} anos</span>
                                <span aria-hidden="true"> · </span>
                                <span className="text-slate-300">{formatPlayerNationalityFull(player, club.country)}</span>
                                <span aria-hidden="true"> · </span>
                                <span className="text-amber-400">Resta 1 ano</span>
                              </p>
                            </div>
                          </div>
                          <span className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
                            {player.overall}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-3 text-xs text-slate-300">
                          <div className="flex items-center gap-2 min-w-0">
                            <ClubCrest club={club} size="xs" rounded="md" />
                            <span className="truncate">{club.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {renderCompareButton(player, club, true)}
                            {renderWatchlistButton(player.id, true)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-3 py-2 border-y border-slate-800/80 tabular-nums">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Valor de Mercado</span>
                            <strong className="text-slate-200 font-mono text-[11px]">
                              {formatCurrency(player.marketValue)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Salário Atual</span>
                            <strong className="text-emerald-400 font-mono text-[11px]">
                              {formatCurrency(player.wage)}/mês
                            </strong>
                          </div>
                        </div>
                      </div>

                      {alreadySignedPre ? (
                        <div
                          className={`py-2 px-3 rounded-lg text-center text-xs font-semibold border ${
                            signedWithUser
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {signedWithUser
                            ? `Chega ao ${userClub.shortName} em 15/01/${currentSeasonYear + 1}`
                            : `Pré-contrato c/ ${player.preContractClubName}`}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => openNegotiation(player, club)}
                            className="py-2 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Comprar Agora
                          </button>
                          <button
                            type="button"
                            onClick={() => openPreContractModal(player, club)}
                            className="py-2 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Pré-Contrato (R$ 0)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {marketDisplayLimit < filteredBosmanPlayers.length && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs tabular-nums">
                  <span className="text-slate-400">
                    Exibindo <strong className="text-white">{Math.min(marketDisplayLimit, filteredBosmanPlayers.length)}</strong> de{' '}
                    <strong className="text-white">{filteredBosmanPlayers.length}</strong> pré-contratos
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setMarketDisplayLimit((prev) => prev + 48);
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer whitespace-nowrap"
                  >
                    Mostrar mais +48 (restam {filteredBosmanPlayers.length - marketDisplayLimit})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: AVAILABLE FOR LOAN (EMPRÉSTIMOS DISPONÍVEIS) */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-amber-500/35 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Handshake className="w-4 h-4 text-amber-400" />
                <span>MERCADO DE EMPRÉSTIMOS DE JOGADORES</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Traga reforços pagando apenas parte do salário com 1 clique nos termos ideais, e opção de compra pré-acordada!
              </p>
            </div>
            <span className="text-xs font-mono text-amber-300 font-bold tabular-nums">
              {availableLoanPlayers.length} atletas negociáveis
            </span>
          </div>

          {availableLoanPlayers.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-2 text-xs text-slate-400">
              <p>Nenhum atleta disponível para empréstimo corresponde aos filtros selecionados.</p>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setLoanFilterMode('ALL');
                  setSelectedRegion('ALL');
                  setSelectedRole('ALL');
                  setMinOverall(60);
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold cursor-pointer"
              >
                Mostrar Todos Negociáveis
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableLoanPlayers.slice(0, marketDisplayLimit).map(({ player, club }) => {
                  const pendingDeal = findPendingTransferForPlayer(pendingTransfers, player.id);
                  const recLoan = computeRecommendedLoanTerms(player, 19);
                  const isEasyLoan =
                    player.isListedForLoan || (player.age <= 23 && !player.isStarter);
                  return (
                    <div
                      key={player.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/50 transition-all shadow-md group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar
                              player={player}
                              club={club}
                              clubPrimaryColor={club.colors.primary}
                              clubTextColor={club.colors.text}
                              size="md"
                            />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  inspection?.inspectPlayer(player, club);
                                }}
                                className="font-bold text-white text-sm hover:text-amber-300 transition-colors truncate block text-left cursor-pointer max-w-full"
                              >
                                {player.name}
                              </button>
                              <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 tabular-nums">
                                <span className="text-amber-400 font-semibold">{player.detailedRole}</span>
                                <span>·</span>
                                <span>{player.age} anos</span>
                                <span>·</span>
                                <span className="text-slate-300">{formatPlayerNationalityFull(player, club.country)}</span>
                                {isEasyLoan && (
                                  <>
                                    <span>·</span>
                                    <span className="text-emerald-400 font-semibold">Aceite Fácil</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <span className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800 text-amber-300 font-black text-xs flex items-center justify-center shrink-0 tabular-nums">
                            {player.overall}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-3 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <ClubCrest club={club} size="xs" rounded="md" />
                            <span className="text-slate-300 font-medium truncate">{club.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {renderCompareButton(player, club, true)}
                            {renderWatchlistButton(player.id, true)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-3 tabular-nums">
                          <div className="bg-slate-900/60 p-2 rounded-lg">
                            <span className="text-[10px] text-slate-500 block">Salário ({recLoan.wageSharePct}% mín.)</span>
                            <strong className="text-slate-200 font-mono text-[11px]">
                              {formatCurrency(Math.round(player.wage * (recLoan.wageSharePct / 100)))}/mês
                            </strong>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-lg">
                            <span className="text-[10px] text-slate-500 block">Passe Fixado Sugerido</span>
                            <strong className="text-emerald-400 font-mono text-[11px]">
                              {formatCurrency(recLoan.buyOptionFee)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {pendingDeal ? (
                        <div className="py-2 px-3 rounded-xl bg-sky-500/15 border border-sky-500/35 text-center text-xs font-semibold text-sky-300 tabular-nums">
                          Acordo fechado · Chega em {pendingDeal.arrivalDisplayDate}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => openNegotiation(player, club)}
                            className="py-2 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Comprar
                          </button>
                          <button
                            type="button"
                            onClick={() => openLoanModal(player, club)}
                            className="col-span-2 py-2 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                          >
                            <Handshake className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                            <span>
                              {windowStatus.isOpen
                                ? 'Pedir Empréstimo'
                                : `Empréstimo (${windowStatus.nextOpenDisplay})`}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {marketDisplayLimit < availableLoanPlayers.length && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs tabular-nums">
                  <span className="text-slate-400">
                    Exibindo <strong className="text-white">{Math.min(marketDisplayLimit, availableLoanPlayers.length)}</strong> de{' '}
                    <strong className="text-white">{availableLoanPlayers.length}</strong> opções de empréstimo
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setMarketDisplayLimit((prev) => prev + 48);
                    }}
                    className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer whitespace-nowrap"
                  >
                    Mostrar mais +48 (restam {availableLoanPlayers.length - marketDisplayLimit})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 4: MY LOANS MANAGEMENT (GESTÃO DE EMPRÉSTIMOS) */}
      {activeTab === 'my_loans' && (
        <div className="space-y-6">
          {/* Section A: Borrowed by user club */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Jogadores Emprestados ao {userClub.name} ({borrowedPlayers.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Atletas cedidos por outros clubes atuando no seu elenco. Você pode exercer a opção de compra fixada ou devolvê-los antecipadamente.
            </p>

            {borrowedPlayers.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800/60 text-slate-500 text-xs">
                Seu clube não possui nenhum jogador contratado por empréstimo no momento. Acesse a aba "Empréstimos Disponíveis" para negociar reforços!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {borrowedPlayers.map((player) => {
                  const parentClub = allClubs.find((c) => c.id === player.loanParentClubId);
                  return (
                    <div
                      key={player.id}
                      className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <PlayerAvatar
                              player={player}
                              club={userClub}
                              clubPrimaryColor={userClub.colors.primary}
                              clubTextColor={userClub.colors.text}
                              size="xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                inspection?.inspectPlayer(player, userClub);
                              }}
                              className="font-black text-white hover:text-amber-300 transition-colors text-sm text-left cursor-pointer"
                            >
                              {player.name}
                            </button>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                              EMP
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                            {player.detailedRole} · Força {player.overall} · {player.age} anos · {formatPlayerNationalityFull(player, parentClub?.country || userClubCountry)}
                          </p>
                          <p className="text-xs text-amber-300 font-semibold mt-1">
                            Clube de Origem: {parentClub?.name || 'Clube Parceiro'}
                          </p>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <span className="text-xs text-slate-400 block">
                            Prazo ({player.loanDurationMonths === 12 ? '1 Ano' : '6 Meses'})
                          </span>
                          <span className="text-sm font-black text-amber-400">
                            {player.loanRoundsRemaining || 0} rodadas
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs grid grid-cols-2 gap-2 tabular-nums">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Seu Custo Salarial</span>
                          <strong className="text-slate-200 font-mono">
                            {formatCurrency(player.wage)}/mês ({player.loanWageContributionPct || 100}%)
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Opção de Compra Fixada</span>
                          <strong className="text-emerald-400 font-mono">
                            {player.loanBuyOptionFee ? formatCurrency(player.loanBuyOptionFee) : 'Sem Cláusula Fixada'}
                          </strong>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {player.loanBuyOptionFee && onTriggerBuyOption && (
                          <button
                            type="button"
                            onClick={() => openBuyoutModal(player)}
                            className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 tabular-nums whitespace-nowrap"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Exercer Compra ({formatCurrency(player.loanBuyOptionFee)})</span>
                          </button>
                        )}
                        {onNegotiateLoanBuyOption && (
                          <button
                            type="button"
                            onClick={() => openClauseModal(player)}
                            className="py-2 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {player.loanBuyOptionFee ? 'Renegociar Passe' : 'Fixar Opção de Compra'}
                          </button>
                        )}
                        {onTerminateLoanEarly && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              onTerminateLoanEarly(player);
                            }}
                            className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
                          >
                            Devolver Antecipado
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Players loaned OUT by user to other clubs */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Jogadores Cedidos a Outros Times ({loanedOutPlayers.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Jovens promessas e atletas do seu clube emprestados por 6 meses ou 1 ano com opção de compra monitorada.
            </p>

            {loanedOutPlayers.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800/60 text-slate-500 text-xs">
                Você não possui nenhum jogador emprestado a outros clubes no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loanedOutPlayers.map(({ player, currentClub }) => (
                  <div
                    key={player.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex flex-col justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <PlayerAvatar
                          player={player}
                          club={currentClub}
                          clubPrimaryColor={currentClub.colors.primary}
                          clubTextColor={currentClub.colors.text}
                          size="xs"
                        />
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              inspection?.inspectPlayer(player, currentClub);
                            }}
                            className="font-black text-white hover:text-emerald-300 transition-colors text-sm text-left cursor-pointer"
                          >
                            {player.name}
                          </button>
                        <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                          {player.detailedRole} · Força {player.overall} · {player.age} anos · {formatPlayerNationalityFull(player, userClubCountry)}
                        </p>
                        <p className="text-xs text-emerald-400 font-semibold mt-1">
                          Jogando no: {currentClub.name}
                        </p>
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <span className="text-xs text-slate-400 block">
                          Prazo ({player.loanDurationMonths === 12 ? '1 Ano' : '6 Meses'})
                        </span>
                        <span className="text-sm font-black text-emerald-400">
                          {player.loanRoundsRemaining || 0} rodadas
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs grid grid-cols-4 gap-2 text-center tabular-nums">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Jogos</span>
                        <strong className="text-white font-mono">{player.matches}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Gols</span>
                        <strong className="text-emerald-400 font-mono">{player.goals}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Evolução</span>
                        <strong className="text-sky-400 font-mono">+{player.evolutionsCount || 0}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Opção Compra</span>
                        <strong className="text-amber-300 font-mono">
                          {player.loanBuyOptionFee ? formatCurrency(player.loanBuyOptionFee) : 'Sem Opção'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section C: List own reserves for loan */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Colocar Jogadores do Meu Elenco para Empréstimo</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Disponibilize reservas e jovens para clubes das Séries B, C e D para que ganhem experiência e evoluam mais rápido.
            </p>

            <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto pr-1">
              {userClub.squad
                .filter((p) => !p.isLoan && !findPendingTransferForPlayer(pendingTransfers, p.id))
                .sort((a, b) => comparePlayersByPosition(a, b))
                .map((player) => (
                  <div key={player.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar
                        player={player}
                        club={userClub}
                        clubPrimaryColor={userClub.colors.primary}
                        clubTextColor={userClub.colors.text}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              inspection?.inspectPlayer(player, userClub);
                            }}
                            className="font-bold text-white hover:text-sky-300 transition-colors text-sm text-left cursor-pointer"
                          >
                            {player.name}
                          </button>
                        <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                          #{player.squadNumber} · {player.isStarter ? 'Titular' : 'Reserva'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                        {player.detailedRole} · Força {player.overall} · {player.age} anos · Salário {formatCurrency(player.wage)}/mês
                      </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={userClub.squad.length <= 16}
                        onClick={() => openSellPlayerModal(player)}
                        className="py-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        Vender Agora
                      </button>
                      <button
                        type="button"
                        disabled={userClub.squad.length <= 16}
                        onClick={() => openLoanOutModal(player)}
                        className="py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all shadow cursor-pointer whitespace-nowrap"
                      >
                        Emprestar c/ Sugestão IA →
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4B: CLÁUSULAS DE MAIS-VALIA (% VENDA FUTURA) E BÔNUS POR METAS */}
      {activeTab === 'clauses' && (
        <div className="space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-2xl space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Engenharia Financeira & Direitos Econômicos
              </div>
              <h3 className="text-lg font-black text-white">
                Cláusulas Ativas de % de Venda Futura (Mais-Valia) & Metas ({activeTransferClauses.length})
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitore porcentagens de revenda futura e bônus de gols/jogos em compras e vendas. Você pode resgatar à vista uma cláusula a receber caso precise de liquidez imediata no caixa.
              </p>
            </div>
            <div className="text-right font-mono text-xs tabular-nums">
              <div className="text-slate-400">Caixa Disponível</div>
              <div className="text-base font-black text-emerald-400">
                {formatCurrency(userClub.finances.balance)}
              </div>
            </div>
          </div>

          {clausesFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
                clausesFeedback.ok
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
              }`}
            >
              <span>{clausesFeedback.text}</span>
              <button
                type="button"
                onClick={() => setClausesFeedback(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                Fechar
              </button>
            </div>
          )}

          {activeTransferClauses.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <Percent className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-200">
                Nenhuma cláusula de venda futura ou bônus pendente no momento.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Ao comprar um jogador no Mercado Aberto (para reduzir o valor à vista) ou ao vender um atleta na Gestão de Elenco (mantendo % de revenda), o contrato aparece monitorado aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTransferClauses.map((cl) => {
                const liveClub = allClubs.find((c) => c.squad.some((p) => p.id === cl.playerId));
                const livePlayer = liveClub?.squad.find((p) => p.id === cl.playerId);
                const liveMv = livePlayer?.marketValue || 2_000_000;
                const buyoutPrice = computeSellOnClauseBuyoutPrice(cl, liveMv);
                const goalsSince = Math.max(0, (livePlayer?.goals || 0) - cl.goalsBaseline);
                const appsSince = Math.max(0, (livePlayer?.matches || 0) - cl.matchesBaseline);
                const isReceivable = cl.direction === 'RECEIVABLE';

                return (
                  <div
                    key={cl.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider tabular-nums">
                            <span className={isReceivable ? 'text-emerald-400' : 'text-amber-300'}>
                              {isReceivable ? 'A Receber pelo Seu Clube' : 'Compromisso a Pagar'}
                            </span>
                            <span className="text-slate-600"> · </span>
                            <span className="text-slate-400">{cl.playerRole}</span>
                          </div>
                          <h4 className="text-base font-black text-white mt-0.5">
                            {cl.playerName}
                          </h4>
                          <p className="text-xs text-slate-400 tabular-nums">
                            Clube atual: <strong className="text-slate-200">{liveClub?.name || cl.currentClubName}</strong> · Contraparte: {cl.counterpartyClubName}
                          </p>
                        </div>

                        {cl.sellOnPercentage > 0 && !cl.settledSellOn && (
                          <div className="text-right font-mono tabular-nums shrink-0">
                            <div className="text-[10px] text-slate-400">Venda Futura</div>
                            <div className="text-base font-black text-amber-300">
                              {cl.sellOnPercentage}%
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
                        <div>
                          <span className="text-[10px] font-sans text-slate-500 block">
                            Meta de Gols
                          </span>
                          {cl.goalBonusAmount && cl.goalBonusTarget ? (
                            <span className={cl.goalBonusPaid ? 'text-emerald-400 font-bold' : 'text-slate-200'}>
                              {cl.goalBonusPaid
                                ? 'Liquidado'
                                : `${goalsSince}/${cl.goalBonusTarget} (${formatCurrency(cl.goalBonusAmount)})`}
                            </span>
                          ) : (
                            <span className="text-slate-500">Não incluída</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-sans text-slate-500 block">
                            Meta de Partidas
                          </span>
                          {cl.appearancesBonusAmount && cl.appearancesBonusTarget ? (
                            <span className={cl.appearancesBonusPaid ? 'text-emerald-400 font-bold' : 'text-slate-200'}>
                              {cl.appearancesBonusPaid
                                ? 'Liquidado'
                                : `${appsSince}/${cl.appearancesBonusTarget} (${formatCurrency(cl.appearancesBonusAmount)})`}
                            </span>
                          ) : (
                            <span className="text-slate-500">Não incluída</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {cl.sellOnPercentage > 0 && !cl.settledSellOn && onBuyoutTransferClause && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs tabular-nums">
                        <span className="text-slate-400">
                          {isReceivable ? 'Liquidez antecipada:' : 'Quitação antecipada:'}{' '}
                          <strong className="font-mono text-white">{formatCurrency(buyoutPrice)}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            const res = onBuyoutTransferClause(cl.id);
                            setClausesFeedback({ ok: res.success, text: res.message });
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors whitespace-nowrap ${
                            isReceivable
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black'
                          }`}
                        >
                          {isReceivable ? 'Vender % à Vista' : 'Quitar % Agora'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: HISTÓRICO DE TRANSFERÊNCIAS DA TEMPORADA */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Season Financial Summary for User Club */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Investido em Contratações ({userClub.shortName})</span>
                <ArrowDownLeft className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-xl font-black font-mono text-white tabular-nums">
                {formatCurrency(userSigningsTotal)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                {seasonHistory.filter((i) => i.toClubId === userClub.id).length} chegadas concluídas em {currentSeasonYear}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Arrecadado em Vendas ({userClub.shortName})</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-black font-mono text-emerald-400 tabular-nums">
                {formatCurrency(userSalesTotal)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                {seasonHistory.filter((i) => i.fromClubId === userClub.id).length} saídas concluídas em {currentSeasonYear}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Balanço Líquido na Janela</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <p
                className={`text-xl font-black font-mono tabular-nums ${
                  userSalesTotal - userSigningsTotal >= 0 ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {userSalesTotal - userSigningsTotal > 0 ? '+' : ''}
                {formatCurrency(userSalesTotal - userSigningsTotal)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Receitas de vendas menos compras na temporada
              </p>
            </div>
          </div>

          {/* Filter & Search Bar for Transfer History */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {(
                [
                  { id: 'ALL', label: `Todas (${seasonHistory.length})` },
                  {
                    id: 'MY_CLUB',
                    label: `${userClub.shortName} (${
                      seasonHistory.filter(
                        (i) => i.fromClubId === userClub.id || i.toClubId === userClub.id
                      ).length
                    })`,
                  },
                  {
                    id: 'SIGNINGS',
                    label: `Contratações (${
                      seasonHistory.filter(
                        (i) =>
                          i.category === 'PURCHASE' ||
                          i.category === 'FREE_AGENT' ||
                          i.category === 'BUY_OPTION'
                      ).length
                    })`,
                  },
                  {
                    id: 'SALES',
                    label: `Vendas (${seasonHistory.filter((i) => i.category === 'SALE').length})`,
                  },
                  {
                    id: 'LOANS',
                    label: `Empréstimos (${
                      seasonHistory.filter(
                        (i) => i.category === 'LOAN_IN' || i.category === 'LOAN_OUT'
                      ).length
                    })`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setHistoryFilter(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer tabular-nums ${
                    historyFilter === tab.id
                      ? 'bg-sky-400 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar jogador ou clube..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Season Completed Transfers Ledger */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  Boletim Oficial de Transferências — Temporada {currentSeasonYear}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registro completo de contratações, vendas definitivas e empréstimos concluídos com valores e datas.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {filteredSeasonHistory.length} registro{filteredSeasonHistory.length === 1 ? '' : 's'}
              </span>
            </div>

            {filteredSeasonHistory.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <History className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">
                  Nenhuma negociação concluída encontrada para este filtro na temporada {currentSeasonYear}.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Assim que você contratar jogadores, assinar atletas livres, concluir vendas ou fechar empréstimos, todas as operações aparecerão registradas aqui com data e valor.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Explorar Mercado Aberto
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('free')}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Ver Jogadores Livres
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-bold">Data & Rodada</th>
                      <th className="py-3 px-4 font-bold">Jogador</th>
                      <th className="py-3 px-4 font-bold">Tipo de Negócio</th>
                      <th className="py-3 px-4 font-bold">Origem ➔ Destino</th>
                      <th className="py-3 px-4 font-bold text-right">Valor & Salário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredSeasonHistory.map((item) => {
                      const fromClubObj = item.fromClubId
                        ? allClubs.find((c) => c.id === item.fromClubId)
                        : undefined;
                      const toClubObj = allClubs.find((c) => c.id === item.toClubId);
                      const involvesUser =
                        item.fromClubId === userClub.id || item.toClubId === userClub.id;
                      const isUserArrival = item.toClubId === userClub.id;
                      const isUserDeparture = item.fromClubId === userClub.id;

                      let categoryLabel = 'Contratação Definitiva';
                      let categoryColor = 'text-sky-300';
                      if (item.category === 'RELEASE_CLAUSE') {
                        categoryLabel = 'Multa Rescisória Paga';
                        categoryColor = 'text-sky-400';
                      } else if (item.category === 'SWAP') {
                        categoryLabel = 'Troca + Compensação';
                        categoryColor = 'text-cyan-300';
                      } else if (item.category === 'PRE_CONTRACT') {
                        categoryLabel = 'Pré-Contrato (Lei Bosman)';
                        categoryColor = 'text-emerald-400';
                      } else if (item.category === 'FREE_AGENT') {
                        categoryLabel = 'Custo Zero (Livre)';
                        categoryColor = 'text-emerald-300';
                      } else if (item.category === 'SALE') {
                        categoryLabel = 'Venda Definitiva';
                        categoryColor = 'text-emerald-400';
                      } else if (item.category === 'BUY_OPTION') {
                        categoryLabel = 'Opção de Compra';
                        categoryColor = 'text-amber-300';
                      } else if (item.category === 'LOAN_IN') {
                        categoryLabel = 'Empréstimo (Chegada)';
                        categoryColor = 'text-amber-300';
                      } else if (item.category === 'LOAN_OUT') {
                        categoryLabel = 'Empréstimo (Saída)';
                        categoryColor = 'text-amber-300';
                      } else if (item.direction === 'CPU') {
                        categoryLabel = 'Transferência no Mercado';
                        categoryColor = 'text-slate-300';
                      }

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            involvesUser
                              ? 'bg-sky-950/15 hover:bg-sky-950/25'
                              : 'hover:bg-slate-900/50'
                          }`}
                        >
                          {/* Date & Round */}
                          <td
                            className="py-3.5 px-4 whitespace-nowrap tabular-nums"
                            title={formatCalendarDate(item.date)}
                          >
                            <div className="font-mono font-bold text-slate-200">
                              {formatDateShortBR(item.date)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Rodada {item.round}
                            </div>
                          </td>

                          {/* Player */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm">{item.playerName}</div>
                            <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                              <span>{item.playerRole}</span>
                              <span aria-hidden="true"> · </span>
                              <span>Força {item.playerOverall}</span>
                              <span aria-hidden="true"> · </span>
                              <span>{item.playerAge} anos</span>
                            </div>
                          </td>

                          {/* Deal Type */}
                          <td className="py-3.5 px-4">
                            <div className={`font-bold ${categoryColor}`}>{categoryLabel}</div>
                            {item.notes && (
                              <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>
                            )}
                          </td>

                          {/* Origin -> Destination */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                {fromClubObj ? (
                                  <span
                                    className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0"
                                    style={{
                                      backgroundColor: fromClubObj.colors.primary,
                                      color: fromClubObj.colors.text,
                                    }}
                                  >
                                    {fromClubObj.initials}
                                  </span>
                                ) : (
                                  <span className="w-5 h-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                                    LIV
                                  </span>
                                )}
                                <span
                                  className={`font-semibold ${
                                    isUserDeparture ? 'text-sky-300 font-bold' : 'text-slate-300'
                                  }`}
                                >
                                  {item.fromClubName}
                                </span>
                              </div>

                              <span className="text-slate-500 font-mono">➔</span>

                              <div className="flex items-center gap-1.5">
                                {toClubObj && (
                                  <span
                                    className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0"
                                    style={{
                                      backgroundColor: toClubObj.colors.primary,
                                      color: toClubObj.colors.text,
                                    }}
                                  >
                                    {toClubObj.initials}
                                  </span>
                                )}
                                <span
                                  className={`font-semibold ${
                                    isUserArrival ? 'text-emerald-300 font-bold' : 'text-white'
                                  }`}
                                >
                                  {item.toClubName}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Fee & Wage */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap tabular-nums">
                            <div
                              className={`font-mono font-black text-sm ${
                                item.fee === 0
                                  ? 'text-slate-300'
                                  : isUserDeparture
                                  ? 'text-emerald-400'
                                  : isUserArrival
                                  ? 'text-sky-300'
                                  : 'text-white'
                              }`}
                            >
                              {item.fee === 0
                                ? 'Custo Zero'
                                : `${isUserDeparture ? '+' : isUserArrival ? '-' : ''}${formatCurrency(item.fee)}`}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Salário: {formatCurrency(item.wage)}/mês
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: RUMORES DE TRANSFERÊNCIA (IA) */}
      {activeTab === 'rumors' && (
        <div className="space-y-4">
          {/* Header & Controls */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="text-amber-400">Bastidores do Mercado</span>
                <span>·</span>
                <span className={rumorsUsedAi ? 'text-emerald-400' : 'text-slate-400'}>
                  {isLoadingRumors
                    ? 'Consultando redação IA...'
                    : rumorsUsedAi
                    ? 'Redigido por Gemini IA com dados da temporada'
                    : 'Boletim de apuração local'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Rumores de Transferência</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl">
                Notas curtas geradas com base no desempenho em campo (jogos, gols, assistências e nota média) e no valor de mercado atualizado dos atletas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isLoadingRumors || !gameState}
                onClick={() => {
                  soundEngine.playClick();
                  void handleLoadTransferRumors(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingRumors ? 'animate-spin' : ''}`}
                />
                <span>
                  {isLoadingRumors ? 'Apurando com IA...' : 'Gerar Novos Rumores (IA)'}
                </span>
              </button>
            </div>
          </div>

          {rumorsError && (
            <div className="bg-amber-950/35 border border-amber-500/40 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{rumorsError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  void handleLoadTransferRumors(true);
                }}
                className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Tentar IA Novamente
              </button>
            </div>
          )}

          {rumorActionFeedback && (
            <div
              className={`rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs border ${
                rumorActionFeedback.ok
                  ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/35 border-rose-500/40 text-rose-200'
              }`}
            >
              <span>{rumorActionFeedback.text}</span>
              <button
                type="button"
                onClick={() => setRumorActionFeedback(null)}
                className="text-slate-400 hover:text-white font-semibold cursor-pointer shrink-0"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {(
                [
                  { id: 'ALL', label: `Todos (${transferRumors.length})` },
                  {
                    id: 'HOT',
                    label: `Quentes (${
                      transferRumors.filter((r) => r.heatLevel === 'HOT').length
                    })`,
                  },
                  {
                    id: 'USER_PLAYER_TARGET',
                    label: `Meu Elenco na Mira (${
                      transferRumors.filter((r) => r.category === 'USER_PLAYER_TARGET').length
                    })`,
                  },
                  {
                    id: 'OPPORTUNITY',
                    label: `Oportunidades p/ ${userClub.shortName} (${
                      transferRumors.filter((r) => r.category === 'OPPORTUNITY').length
                    })`,
                  },
                  {
                    id: 'LEAGUE_BUZZ',
                    label: `Mercado Geral (${
                      transferRumors.filter((r) => r.category === 'LEAGUE_BUZZ').length
                    })`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setRumorsFilter(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer tabular-nums ${
                    rumorsFilter === tab.id
                      ? 'bg-sky-400 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por jogador ou clube..."
                value={rumorsSearch}
                onChange={(e) => setRumorsSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoadingRumors && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 animate-pulse"
                >
                  <div className="h-3 w-48 bg-slate-800 rounded" />
                  <div className="h-5 w-11/12 bg-slate-800 rounded" />
                  <div className="h-3 w-full bg-slate-900 rounded" />
                  <div className="h-3 w-4/5 bg-slate-900 rounded" />
                  <div className="h-9 w-full bg-slate-900 rounded-xl mt-2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoadingRumors && filteredRumors.length === 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Newspaper className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-200">
                Nenhum rumor encontrado para este filtro na rodada atual.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Altere o filtro acima ou gere uma nova rodada de apuração da imprensa com a IA.
              </p>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setRumorsFilter('ALL');
                  setRumorsSearch('');
                  if (transferRumors.length === 0) {
                    void handleLoadTransferRumors(true);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black whitespace-nowrap cursor-pointer transition-colors"
              >
                Exibir Todos os Rumores
              </button>
            </div>
          )}

          {/* Rumor Cards Grid (Single-Elevation Flat Cards, No Static Pills) */}
          {!isLoadingRumors && filteredRumors.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredRumors.map((rumor) => {
                const currentClubObj = allClubs.find((c) => c.id === rumor.currentClubId);
                const interestedClubObj = allClubs.find(
                  (c) => c.id === rumor.interestedClubId
                );
                const livePlayer =
                  currentClubObj?.squad.find((p) => p.id === rumor.playerId) ||
                  allClubs
                    .flatMap((c) => c.squad)
                    .find((p) => p.id === rumor.playerId);

                const isOwnedByUser = currentClubObj?.id === userClub.id;
                const heatLabel =
                  rumor.heatLevel === 'HOT'
                    ? 'QUENTE'
                    : rumor.heatLevel === 'WARM'
                    ? 'AQUECENDO'
                    : 'SONDAGEM';
                const heatColor =
                  rumor.heatLevel === 'HOT'
                    ? 'text-rose-400'
                    : rumor.heatLevel === 'WARM'
                    ? 'text-amber-400'
                    : 'text-sky-400';

                const categoryLabel =
                  rumor.category === 'USER_PLAYER_TARGET'
                    ? 'Alvo no seu Elenco'
                    : rumor.category === 'OPPORTUNITY'
                    ? `Radar ${userClub.shortName}`
                    : 'Bastidores da Janela';

                return (
                  <article
                    key={rumor.id}
                    className={`bg-slate-950 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 border ${
                      isOwnedByUser
                        ? 'border-amber-500/40'
                        : rumor.category === 'OPPORTUNITY'
                        ? 'border-sky-500/35'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Editorial Metadata Line (unboxed text · separator, no pills) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 ${heatColor}`}>
                            {rumor.heatLevel === 'HOT' && (
                              <Flame className="w-3.5 h-3.5 shrink-0" />
                            )}
                            {heatLabel}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-300">{rumor.sourceOutlet}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400">{categoryLabel}</span>
                        </div>
                        <span
                          className={
                            rumor.generatedByAi ? 'text-emerald-400' : 'text-slate-500'
                          }
                        >
                          {rumor.generatedByAi ? 'Via Gemini IA' : 'Nota Local'}
                        </span>
                      </div>

                      {/* Headline & Summary */}
                      <div className="space-y-1.5">
                        <h3 className="text-sm sm:text-base font-black text-white leading-snug">
                          {rumor.headline}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {rumor.summary}
                        </p>
                      </div>

                      {/* Grounded Player & Club Telemetry Row */}
                      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {livePlayer && (
                            <PlayerAvatar
                              player={livePlayer}
                              clubPrimaryColor={currentClubObj?.colors.primary}
                              clubTextColor={currentClubObj?.colors.text}
                              size="sm"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-white truncate">
                              {rumor.playerName}
                            </div>
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              {rumor.playerRole} · {rumor.playerAge} anos · OVR{' '}
                              <span className="text-white font-bold">
                                {rumor.playerOverall}
                              </span>{' '}
                              · {rumor.reasonTag}
                            </div>
                          </div>
                        </div>

                        {/* Club Route */}
                        <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            {currentClubObj && (
                              <ClubCrest club={currentClubObj} size="xs" />
                            )}
                            <span>{rumor.currentClubShortName}</span>
                          </div>
                          <span className="text-slate-500 font-mono">➔</span>
                          <div className="flex items-center gap-1.5 text-amber-300">
                            {interestedClubObj && (
                              <ClubCrest club={interestedClubObj} size="xs" />
                            )}
                            <span>{rumor.interestedClubShortName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Performance & Valuation Strip */}
                      <div className="pt-2.5 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            Temporada
                          </div>
                          <div className="font-bold text-slate-200">
                            {rumor.matches}J · {rumor.goals}G · {rumor.assists}A
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            Nota Média
                          </div>
                          <div className="font-bold text-emerald-400">
                            {rumor.ratingAverage.toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            Valor de Mercado
                          </div>
                          <div className="font-mono font-bold text-white">
                            {formatCurrency(rumor.marketValue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            Estimativa Negócio
                          </div>
                          <div className="font-mono font-bold text-amber-300">
                            {formatCurrency(rumor.estimatedFee)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Actions */}
                    {livePlayer && (
                      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        {isOwnedByUser ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openSellPlayerModal(livePlayer)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Tag className="w-3.5 h-3.5" />
                              <span>Mesa de Venda</span>
                            </button>
                            {!livePlayer.isLoan && (
                              <button
                                type="button"
                                onClick={() => openLoanOutModal(livePlayer)}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                              >
                                Ceder Empréstimo
                              </button>
                            )}
                            {onShopPlayerWithAi && (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  const res = onShopPlayerWithAi(livePlayer.id);
                                  setRumorActionFeedback({
                                    ok: res.offersGenerated > 0,
                                    text: res.feedbackText,
                                  });
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors flex items-center gap-1"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Solicitar Ofertas</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openNegotiation(livePlayer, currentClubObj, 1)
                              }
                              className="px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Handshake className="w-3.5 h-3.5" />
                              <span>Negociar Compra</span>
                            </button>
                            {currentClubObj && onLoanInPlayer && (
                              <button
                                type="button"
                                onClick={() => openLoanModal(livePlayer, currentClubObj)}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                              >
                                Propor Empréstimo
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          {renderCompareButton(livePlayer, currentClubObj || null, true)}
                          {!isOwnedByUser && renderWatchlistButton(livePlayer.id, true)}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LOAN IN NEGOTIATION MODAL */}
      {loanModalPlayer && (() => {
        const recLoanTerms = computeRecommendedLoanTerms(loanModalPlayer.player, loanDuration);
        const liveLoanPreview = previewLoanProposal(
          userClub,
          loanModalPlayer.club,
          loanModalPlayer.player,
          loanDuration,
          loanWageShare,
          enableBuyOption ? buyOptionValue : undefined,
          loanFee,
          {
            transferHistory,
            currentSeasonYear,
            saSeasonYear: gameState?.saSeasonYear,
            europeSeasonYear: gameState?.europeSeasonYear,
          }
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 my-auto">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 text-amber-400">
                  <Handshake className="w-5 h-5" />
                  <h3 className="text-lg font-black text-white">Proposta de Empréstimo</h3>
                </div>
                {renderWatchlistButton(loanModalPlayer.player.id, true)}
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Negocie prazo, divisão salarial e passe fixado com termômetro de aceite ao vivo.
              </p>

              {!windowStatus.isOpen && (
                <div className="mb-3 p-3 rounded-xl bg-amber-950/35 border border-amber-500/40 text-xs text-amber-200">
                  <strong className="text-amber-300">Janela Fechada:</strong> o acordo é assinado agora e o reforço se apresenta ao {userClub.shortName} em{' '}
                  <strong className="text-white font-mono">{windowStatus.nextOpenDisplay}</strong>.
                </div>
              )}

              {/* Player Card Info */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-3.5 text-xs space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-white text-sm truncate">{loanModalPlayer.player.name}</h4>
                    <span className="text-slate-400 tabular-nums">
                      {loanModalPlayer.player.detailedRole} · {loanModalPlayer.player.age} anos · {formatPlayerNationalityFull(loanModalPlayer.player, loanModalPlayer.club.country)} · Força {loanModalPlayer.player.overall}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 block">Clube Cedente</span>
                    <strong className="text-white font-bold">{loanModalPlayer.club.name}</strong>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] tabular-nums">
                  <div>
                    <span className="text-slate-500 block">Salário Mensal Integral:</span>
                    <strong className="text-slate-200 font-mono">
                      {formatCurrency(loanModalPlayer.player.wage)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Valor de Mercado:</span>
                    <strong className="text-emerald-400 font-mono">
                      {formatCurrency(loanModalPlayer.player.marketValue)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 1-Click Preset Strategies */}
              <div className="grid grid-cols-3 gap-1.5 mb-3.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setLoanWageShare(30);
                    setLoanFee(0);
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold cursor-pointer truncate"
                >
                  Econômico (30%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setLoanWageShare(recLoanTerms.wageSharePct);
                    setLoanFee(recLoanTerms.loanFee);
                    setEnableBuyOption(true);
                    setBuyOptionValue(recLoanTerms.buyOptionFee);
                  }}
                  className="py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 font-black cursor-pointer truncate"
                >
                  Pedida Ideal (100%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setLoanFee(0);
                    setLoanWageShare(Math.max(50, recLoanTerms.wageSharePct));
                    setEnableBuyOption(true);
                    setBuyOptionValue(
                      Math.round((loanModalPlayer.player.marketValue * 1.15) / 50000) * 50000
                    );
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold cursor-pointer truncate"
                >
                  Passe 115% (Sem Taxa)
                </button>
              </div>

              {/* Duration Selector: 6 Meses vs 1 Ano */}
              <div className="mb-3.5">
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Duração do Empréstimo:</span>
                </label>
                <div className="grid grid-cols-2 gap-2 tabular-nums">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setLoanDuration(19);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      loanDuration === 19
                        ? 'bg-amber-400 border-amber-300 text-slate-950 font-black shadow'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
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
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      loanDuration === 38
                        ? 'bg-amber-400 border-amber-300 text-slate-950 font-black shadow'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    1 Ano (38 Rodadas)
                  </button>
                </div>
              </div>

              {/* Salary Split Selector */}
              <div className="mb-3.5 tabular-nums">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-sky-400" />
                    <span>Participação Salarial do Seu Clube:</span>
                  </label>
                  <span className="font-mono font-black text-sky-300 text-xs">{loanWageShare}%</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5 mb-2">
                  {[0, 25, 45, 65, 80, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setLoanWageShare(pct)}
                      className={`py-1.5 rounded-lg border text-xs font-bold font-mono transition-all cursor-pointer ${
                        loanWageShare === pct
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] flex justify-between">
                  <span className="text-slate-400">
                    Seu custo:{' '}
                    <strong className="text-white font-mono">
                      {formatCurrency(Math.round(loanModalPlayer.player.wage * (loanWageShare / 100)))}/mês
                    </strong>
                  </span>
                  <span className="text-slate-400">
                    {loanModalPlayer.club.shortName} paga:{' '}
                    <strong className="text-slate-300 font-mono">
                      {formatCurrency(Math.round(loanModalPlayer.player.wage * ((100 - loanWageShare) / 100)))}/mês
                    </strong>
                  </span>
                </div>
              </div>

              {/* Upfront Loan Fee */}
              <div className="mb-3.5 tabular-nums">
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Taxa de Empréstimo ao Clube (Opcional - R$):
                </label>
                <input
                  type="number"
                  step="50000"
                  min="0"
                  value={loanFee}
                  onChange={(e) => setLoanFee(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  placeholder="R$ 0"
                />
              </div>

              {/* Fixed Buy Option Clause */}
              <div className="mb-3.5 bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 tabular-nums">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="buyOptionCheck"
                      checked={enableBuyOption}
                      onChange={(e) => setEnableBuyOption(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                    />
                    <label htmlFor="buyOptionCheck" className="text-xs font-bold text-white cursor-pointer">
                      Fixar Cláusula de Opção de Compra
                    </label>
                  </div>
                  {enableBuyOption && (
                    <span className="text-[11px] text-emerald-400 font-mono font-bold">
                      {formatCurrency(buyOptionValue)}
                    </span>
                  )}
                </div>

                {enableBuyOption && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: '95%', mult: 0.95 },
                        { label: '100%', mult: 1.0 },
                        { label: '115%', mult: 1.15 },
                        { label: '130%', mult: 1.3 },
                      ].map((preset) => {
                        const step = loanModalPlayer.player.marketValue < 250_000 ? 10_000 : 50_000;
                        const val = Math.max(
                          10_000,
                          Math.round((loanModalPlayer.player.marketValue * preset.mult) / step) * step
                        );
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setBuyOptionValue(val);
                            }}
                            className={`py-1 rounded-lg border font-mono font-bold text-[11px] cursor-pointer transition-colors ${
                              buyOptionValue === val
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="number"
                      step={loanModalPlayer.player.marketValue < 250_000 ? 10_000 : 100_000}
                      min={10_000}
                      value={buyOptionValue}
                      onChange={(e) => setBuyOptionValue(Math.max(10_000, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
              </div>

              {/* Live Loan Acceptance Thermometer */}
              <div
                className={`mb-4 p-3 rounded-xl border text-xs space-y-2 tabular-nums ${
                  liveLoanPreview.tone === 'emerald'
                    ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
                    : liveLoanPreview.tone === 'amber'
                    ? 'bg-amber-950/35 border-amber-500/40 text-amber-200'
                    : 'bg-rose-950/35 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">Termômetro: {liveLoanPreview.label}</span>
                  <span className="font-mono font-black">{liveLoanPreview.chancePct}%</span>
                </div>
                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      liveLoanPreview.tone === 'emerald'
                        ? 'bg-emerald-400'
                        : liveLoanPreview.tone === 'amber'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    style={{ width: `${liveLoanPreview.chancePct}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span>{liveLoanPreview.hint}</span>
                  {!liveLoanPreview.willAccept && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setLoanWageShare(liveLoanPreview.minWageShare);
                        setLoanFee(liveLoanPreview.minLoanFee);
                        if (enableBuyOption && liveLoanPreview.minBuyOption) {
                          setBuyOptionValue(liveLoanPreview.minBuyOption);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer whitespace-nowrap"
                    >
                      Ajustar p/ Aceitar Agora
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback message with 1-click counter accepts */}
              {loanFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold mb-4 space-y-2 ${
                    loanFeedback.success
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {loanFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{loanFeedback.msg}</span>
                  </div>
                  {!loanFeedback.success && (
                    <div className="flex flex-wrap gap-1.5">
                      {loanSuggestedWageShare !== null && (
                        <button
                          type="button"
                          onClick={() => handleSendLoanProposal({ wageShare: loanSuggestedWageShare })}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer tabular-nums whitespace-nowrap"
                        >
                          Aceitar {loanSuggestedWageShare}% Salário
                        </button>
                      )}
                      {loanSuggestedFee !== null && loanSuggestedFee > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSendLoanProposal({ fee: loanSuggestedFee })}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer tabular-nums whitespace-nowrap"
                        >
                          Pagar Taxa ({formatCurrency(loanSuggestedFee)})
                        </button>
                      )}
                      {loanSuggestedBuyout && enableBuyOption && (
                        <button
                          type="button"
                          onClick={() => handleSendLoanProposal({ buyout: loanSuggestedBuyout })}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer tabular-nums whitespace-nowrap"
                        >
                          Aceitar Passe ({formatCurrency(loanSuggestedBuyout)})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLoanModalPlayer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSendLoanProposal()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Handshake className="w-4 h-4" />
                  <span>Enviar Proposta de Empréstimo</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LOAN OUT PLAYER MODAL (CEDER JOGADOR DO USUÁRIO POR 6 MESES OU 1 ANO) */}
      {loanOutPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-sky-500/60 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 my-auto">
            <h3 className="text-lg font-black text-white mb-1">
              Emprestar {loanOutPlayer.name} para Outro Clube
            </h3>
            <p className="text-xs text-slate-400 mb-3 tabular-nums">
              {loanOutPlayer.detailedRole} · OVR {loanOutPlayer.overall} · {loanOutPlayer.age} anos · Salário{' '}
              {formatCurrency(loanOutPlayer.wage)}/mês
            </p>

            {!windowStatus.isOpen && (
              <div className="mb-3 p-3 rounded-xl bg-amber-950/35 border border-amber-500/40 text-xs text-amber-200">
                <strong className="text-amber-300">Janela Fechada:</strong> o atleta segue no seu elenco até a abertura oficial da janela em{' '}
                <strong className="text-white font-mono">{windowStatus.nextOpenDisplay}</strong>.
              </div>
            )}

            {/* Smart AI Loan Destination Suggestions */}
            {smartLoanOutDestinations.length > 0 && (
              <div className="mb-4 space-y-2">
                <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Clubes que Precisam da Posição (Sugestão IA):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {smartLoanOutDestinations.map((dest) => {
                    const isSelected = selectedTargetClubId === dest.club.id;
                    return (
                      <button
                        key={dest.club.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedTargetClubId(dest.club.id);
                          setLoanOutWageShare(dest.suggestedWageSharePct);
                          setLoanOutUpfrontFee(dest.suggestedLoanFee);
                          setLoanOutBuyOption(dest.suggestedBuyOptionFee);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer text-xs space-y-1 ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-400 shadow'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ClubCrest club={dest.club} size="xs" rounded="md" />
                            <span className="font-bold text-white truncate">{dest.club.shortName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">
                            {dest.suggestedWageSharePct}% sal.
                          </span>
                        </div>
                        <div className="text-[10px] text-sky-300 font-semibold">{dest.minutesChance}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {dest.fitReason}
                          {dest.suggestedLoanFee > 0 ? ` · Taxa ${formatCurrency(dest.suggestedLoanFee)}` : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-3.5">
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Ou Escolha Qualquer Clube Destino Manualmente:
              </label>
              <select
                value={selectedTargetClubId}
                onChange={(e) => setSelectedTargetClubId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
              >
                {allClubs
                  .filter((c) => c.id !== userClub.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.division ? `Série ${c.division}` : c.state})
                    </option>
                  ))}
              </select>
            </div>

            <div className="mb-3.5 tabular-nums">
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Duração do Empréstimo:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setLoanOutDuration(19);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    loanOutDuration === 19
                      ? 'bg-sky-400 text-slate-950 border-sky-300 font-black'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  6 Meses (19 Rodadas)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setLoanOutDuration(38);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    loanOutDuration === 38
                      ? 'bg-sky-400 text-slate-950 border-sky-300 font-black'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  1 Ano (38 Rodadas)
                </button>
              </div>
            </div>

            <div className="mb-3.5 tabular-nums">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-300">
                  Participação Salarial Paga pelo Clube Destino:
                </label>
                <span className="font-mono text-emerald-400 font-bold text-xs">{loanOutWageShare}%</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[50, 70, 80, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setLoanOutWageShare(pct)}
                    className={`py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer ${
                      loanOutWageShare === pct
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Economia mensal:{' '}
                <strong className="text-emerald-400 font-mono">
                  {formatCurrency(Math.round(loanOutPlayer.wage * (loanOutWageShare / 100)))}/mês
                </strong>
                {loanOutUpfrontFee > 0 && (
                  <>
                    {' · '}Taxa à vista:{' '}
                    <strong className="text-sky-300 font-mono">
                      +{formatCurrency(loanOutUpfrontFee)}
                    </strong>
                  </>
                )}
              </p>
            </div>

            <div className="mb-3.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 tabular-nums">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loanOutEnableBuyOption}
                    onChange={(e) => setLoanOutEnableBuyOption(e.target.checked)}
                    className="w-4 h-4 rounded accent-sky-400 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-white">
                    Fixar Cláusula de Opção de Compra
                  </span>
                </label>
                <span className="text-xs font-mono font-bold text-sky-300">
                  {loanOutEnableBuyOption ? formatCurrency(loanOutBuyOption) : 'Sem Opção'}
                </span>
              </div>
              {loanOutEnableBuyOption && (
                <>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: '100%', mult: 1.0 },
                      { label: '115%', mult: 1.15 },
                      { label: '130%', mult: 1.3 },
                      { label: '150%', mult: 1.5 },
                    ].map((preset) => {
                      const val =
                        Math.round((loanOutPlayer.marketValue * preset.mult) / 50000) * 50000;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setLoanOutBuyOption(val);
                          }}
                          className={`py-1 rounded-lg border font-mono font-bold text-[11px] cursor-pointer transition-colors ${
                            loanOutBuyOption === val
                              ? 'bg-sky-400 text-slate-950 border-sky-300 font-black'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="number"
                    step={loanOutPlayer.marketValue < 250_000 ? 10_000 : 100_000}
                    min={10_000}
                    value={loanOutBuyOption}
                    onChange={(e) => setLoanOutBuyOption(Math.max(10_000, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sky-300 font-mono text-sm focus:outline-none focus:border-sky-400"
                  />
                </>
              )}
            </div>

            {loanOutFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                  loanOutFeedback.success
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {loanOutFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{loanOutFeedback.msg}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 mb-3 tabular-nums">
              <span>Cota anual de jogadores cedidos:</span>
              <strong
                className={
                  seasonLoanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT
                    ? 'text-rose-400 font-mono'
                    : 'text-sky-300 font-mono'
                }
              >
                {seasonLoanCounts.loansOutCount}/{MAX_SEASON_LOANS_OUT}
              </strong>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLoanOutPlayer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={seasonLoanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT}
                onClick={handleConfirmLoanOut}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs shadow-lg cursor-pointer"
              >
                {seasonLoanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT
                  ? `Cota Esgotada (${MAX_SEASON_LOANS_OUT}/${MAX_SEASON_LOANS_OUT})`
                  : 'Confirmar Empréstimo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MESA DE VENDA RÁPIDA MODAL (VENDA DIRETA PARA CLUBES INTERESSADOS) */}
      {sellingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden p-6 my-auto space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <PlayerAvatar
                  player={sellingPlayer}
                  clubPrimaryColor={userClub.colors.primary}
                  clubTextColor={userClub.colors.text}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Mesa de Venda Rápida
                  </div>
                  <h3 className="text-lg font-black text-white truncate">
                    {sellingPlayer.name} ({sellingPlayer.detailedRole} · OVR {sellingPlayer.overall})
                  </h3>
                  <p className="text-xs text-slate-400 tabular-nums">
                    Valor de Mercado: <strong className="text-emerald-400 font-mono">{formatCurrency(sellingPlayer.marketValue)}</strong> · Salário:{' '}
                    <strong className="text-slate-200 font-mono">{formatCurrency(sellingPlayer.wage)}/mês</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSellingPlayer(null)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {!windowStatus.isOpen && (
              <div className="p-3 rounded-xl bg-amber-950/35 border border-amber-500/40 text-xs text-amber-200">
                <strong className="text-amber-300">Janela Fechada:</strong> o valor da venda entra no seu caixa imediatamente e o jogador se apresenta ao novo clube em{' '}
                <strong className="text-white font-mono">{windowStatus.nextOpenDisplay}</strong>.
              </div>
            )}

            {/* Clauses Selector on Sale */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs tabular-nums">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cláusulas Adicionais na Venda (% Mais-Valia & Metas)</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {sellClausePct > 0 || sellGoalBonus
                    ? 'Reduz leve entrada à vista em troca de lucro na revenda/metas'
                    : '100% à vista sem cláusulas futuras'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[0, 10, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSellClausePct(pct);
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-mono font-bold cursor-pointer ${
                      sellClausePct === pct
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {pct === 0 ? 'Sem % Futura' : `${pct}% Venda Futura`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSellGoalBonus((prev) => !prev);
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer ${
                    sellGoalBonus
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  + Bônus por Gols ({formatCurrency(computeDefaultMilestoneBonusAmount(sellingPlayer.marketValue))})
                </button>
              </div>
            </div>

            {sellModalFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  sellModalFeedback.ok
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                }`}
              >
                {sellModalFeedback.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 text-amber-400" />
                )}
                <span>{sellModalFeedback.msg}</span>
              </div>
            )}

            {sellBlockReason || instantBuyers.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-3 text-xs">
                <p className="text-slate-300 font-semibold">
                  {sellBlockReason ||
                    `Nenhum clube possui caixa imediato compatível para fechar compra à vista por ${sellingPlayer.name} (${formatCurrency(
                      sellingPlayer.marketValue
                    )}) neste momento.`}
                </p>
                {!sellBlockReason && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const target = sellingPlayer;
                        setSellingPlayer(null);
                        openLoanOutModal(target);
                      }}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black cursor-pointer"
                    >
                      Ceder por Empréstimo c/ Sugestão IA
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onListPlayerForSale(sellingPlayer.id);
                        setSellSquadFeedback({
                          ok: true,
                          text: `${sellingPlayer.name} foi colocado na Lista de Vendas para receber propostas automáticas nas próximas rodadas.`,
                        });
                        setSellingPlayer(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer"
                    >
                      Colocar na Lista de Vendas
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {instantBuyers.map((buyer) => {
                  const status = counteredClubs[buyer.club.id];
                  const baseFee = status === 'BOOSTED' ? buyer.maxNegotiableFee : buyer.offeredFee;
                  const saleClausePkg: ClausePackageInput = {
                    sellOnPercentage: sellClausePct,
                    enableGoalBonus: sellGoalBonus,
                    enableAppearancesBonus: false,
                  };
                  const finalCashOffer = computeSaleAdjustedUpfrontOffer(baseFee, saleClausePkg);

                  return (
                    <div
                      key={buyer.club.id}
                      className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                        status === 'FAILED'
                          ? 'bg-slate-950/50 border-slate-800/60 opacity-60'
                          : 'bg-slate-950 border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ClubCrest club={buyer.club} size="sm" rounded="md" />
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">
                            {buyer.club.name}{' '}
                            <span className="text-[11px] font-normal text-slate-400">
                              ({buyer.club.division ? `Série ${buyer.club.division}` : buyer.club.country})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {buyer.fitReason}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 tabular-nums">
                        <div className="text-right font-mono">
                          <div className="text-[10px] text-slate-500">
                            {status === 'BOOSTED' ? 'Proposta Reajustada' : 'Oferta à Vista'}
                          </div>
                          <div className="text-sm font-black text-emerald-400">
                            {formatCurrency(finalCashOffer)}
                          </div>
                        </div>

                        {status === 'FAILED' ? (
                          <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-300 font-semibold">
                            Retirou Oferta
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {status !== 'BOOSTED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  const targetRaise = Math.round((buyer.offeredFee * 1.1) / 50000) * 50000;
                                  if (targetRaise <= buyer.maxNegotiableFee) {
                                    setCounteredClubs((prev) => ({
                                      ...prev,
                                      [buyer.club.id]: 'BOOSTED',
                                    }));
                                    setSellModalFeedback({
                                      ok: true,
                                      msg: `${buyer.club.shortName} aceitou subir a proposta para ${formatCurrency(
                                        computeSaleAdjustedUpfrontOffer(buyer.maxNegotiableFee, saleClausePkg)
                                      )} à vista!`,
                                    });
                                  } else {
                                    soundEngine.playWhistle(false);
                                    setCounteredClubs((prev) => ({
                                      ...prev,
                                      [buyer.club.id]: 'FAILED',
                                    }));
                                    setSellModalFeedback({
                                      ok: false,
                                      msg: `${buyer.club.shortName} atingiu o teto de caixa e saiu da negociação.`,
                                    });
                                  }
                                }}
                                className="px-2.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-bold cursor-pointer whitespace-nowrap"
                              >
                                Pedir +10%
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!onSellPlayerToClub}
                              onClick={() => {
                                if (!onSellPlayerToClub) return;
                                soundEngine.playClick();
                                const hasClauses = sellClausePct > 0 || sellGoalBonus;
                                const sold = onSellPlayerToClub(
                                  sellingPlayer.id,
                                  buyer.club.id,
                                  finalCashOffer,
                                  hasClauses ? saleClausePkg : undefined
                                );
                                if (sold) {
                                  soundEngine.playFanfare();
                                  confetti({ particleCount: 90, spread: 80 });
                                  const doneMsg = windowStatus.isOpen
                                    ? `Venda fechada! ${sellingPlayer.name} vendido ao ${buyer.club.name} por ${formatCurrency(
                                        finalCashOffer
                                      )} à vista!`
                                    : `Venda garantida! ${formatCurrency(
                                        finalCashOffer
                                      )} creditados no caixa e ${sellingPlayer.name} sai na abertura da janela (${windowStatus.nextOpenDisplay}).`;
                                  setSellModalFeedback({ ok: true, msg: doneMsg });
                                  setSellSquadFeedback({ ok: true, text: doneMsg });
                                  setTimeout(() => {
                                    setSellingPlayer(null);
                                  }, 1300);
                                } else {
                                  soundEngine.playWhistle(false);
                                  setSellModalFeedback({
                                    ok: false,
                                    msg: 'Não foi possível concluir a venda agora.',
                                  });
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer whitespace-nowrap"
                            >
                              Fechar Venda
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOSMAN PRE-CONTRACT MODAL */}
      {preContractModalPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 my-auto space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Assinar Pré-Contrato (Lei Bosman)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Sem custo de transferência ao {preContractModalPlayer.club.name}. Apresentação oficial em 15/01/{currentSeasonYear + 1}.
                </p>
              </div>
              {renderWatchlistButton(preContractModalPlayer.player.id, true)}
            </div>

            <div className="py-3 border-y border-slate-800 text-xs space-y-1.5 tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Atleta:</span>
                <strong className="text-white">
                  {preContractModalPlayer.player.name} ({preContractModalPlayer.player.detailedRole} · {formatPlayerNationalityFull(preContractModalPlayer.player, preContractModalPlayer.club.country)} · OVR {preContractModalPlayer.player.overall})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Salário Atual no {preContractModalPlayer.club.shortName}:</span>
                <strong className="text-slate-200 font-mono">
                  {formatCurrency(preContractModalPlayer.player.wage)}/mês
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Taxa de Transferência:</span>
                <strong className="text-emerald-400 font-mono">R$ 0 (Fim de Vínculo)</strong>
              </div>
            </div>

            {(() => {
              const wPre = evaluatePlayerClubWillingness(userClub, preContractModalPlayer.player, {
                dealType: 'PRE_CONTRACT',
                sellerClub: preContractModalPlayer.club,
              });
              if (wPre.willing) return null;
              return (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 leading-relaxed">
                  <strong className="text-rose-300 block mb-0.5">
                    Pré-contrato improvável (Degrau de Divisão)
                  </strong>
                  <span>{wPre.reason}</span>
                </div>
              );
            })()}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">
                  Duração do Contrato (a partir de {currentSeasonYear + 1}):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((yrs) => (
                    <button
                      key={yrs}
                      type="button"
                      onClick={() => setPreContractYears(yrs)}
                      className={`py-2 rounded-lg border font-mono font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        preContractYears === yrs
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {yrs} anos
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Salário Mensal Oferecido (R$):
                </label>
                <input
                  type="number"
                  step={preContractWage < 15_000 ? 500 : 5_000}
                  value={preContractWage}
                  onChange={(e) => setPreContractWage(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm tabular-nums focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="font-semibold text-slate-300">Luvas de Assinatura (À Vista):</label>
                  <span className="font-mono text-slate-300 tabular-nums">
                    {preContractBonus > 0 ? formatCurrency(preContractBonus) : 'R$ 0'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.min(
                    Math.max(0, userClub.finances.balance),
                    Math.max(25_000, preContractModalPlayer.player.wage * 6)
                  )}
                  step={preContractModalPlayer.player.wage < 15_000 ? 2_500 : 25_000}
                  value={preContractBonus}
                  onChange={(e) => setPreContractBonus(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            {preContractFeedback && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                  preContractFeedback.success
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {preContractFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{preContractFeedback.msg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreContractModalPlayer(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPreContract}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Formalizar Pré-Contrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT NEGOTIATION MODAL */}
      {negotiatingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 my-auto">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-lg font-bold text-white">
                Negociação de Compra em Definitivo
              </h3>
              {renderWatchlistButton(negotiatingPlayer.player.id, true)}
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Proponha valores de transferência e salário ou acione a multa rescisória para garantir o reforço.
            </p>

            {!windowStatus.isOpen && (
              <div className="mb-4 p-3 rounded-xl bg-amber-950/35 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                <strong className="text-amber-300">Janela Fechada (abre em {windowStatus.nextOpenDisplay}):</strong>{' '}
                você pode fechar a contratação normalmente agora. O atleta só poderá se apresentar e atuar pelo {userClub.shortName} quando a janela abrir em{' '}
                <strong className="text-white font-mono">{windowStatus.nextWindowLabel}</strong>.
              </div>
            )}

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 mb-4 text-xs space-y-1.5 tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Atleta:</span>
                <strong className="text-white">
                  {negotiatingPlayer.player.name} ({negotiatingPlayer.player.detailedRole} · {formatPlayerNationalityFull(negotiatingPlayer.player, negotiatingPlayer.club?.country)} · Força {negotiatingPlayer.player.overall})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Clube Atual:</span>
                <strong className="text-white">
                  {negotiatingPlayer.club ? negotiatingPlayer.club.name : 'Sem Clube (Livre)'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor de Mercado:</span>
                <strong className="text-emerald-400 font-mono">
                  {formatCurrency(negotiatingPlayer.player.marketValue)}
                </strong>
              </div>
              {negotiatingPlayer.club && (
                <div className="flex justify-between pt-1 border-t border-slate-700/60">
                  <span className="text-slate-300 font-semibold">Multa Rescisória:</span>
                  <strong className="text-sky-400 font-mono">
                    {formatCurrency(
                      negotiatingPlayer.player.releaseClause ||
                        computeDefaultReleaseClause(negotiatingPlayer.player, negotiatingPlayer.club)
                    )}
                  </strong>
                </div>
              )}
            </div>

            {/* Player Swap Selector + Input Fee */}
            {negotiatingPlayer.club && (
              <>
                {eligibleSwapPlayers.length > 0 && (
                  <div className="mb-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                    <label className="text-xs font-semibold text-slate-200 flex items-center justify-between gap-2 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Incluir Atleta na Troca (Opcional):</span>
                      </span>
                      {selectedSwapPlayer && (
                        <span className="text-[11px] font-mono text-cyan-300 tabular-nums">
                          Crédito: {formatCurrency(swapEvaluation.credit)}
                        </span>
                      )}
                    </label>
                    <select
                      value={swapPlayerId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setSwapPlayerId(nextId);
                        const chosen = eligibleSwapPlayers.find((p) => p.id === nextId);
                        const disc = negotiatingPlayer.discountFactor || 1;
                        const basePrice = Math.round(
                          (negotiatingPlayer.player.marketValue * disc) / 50000
                        ) * 50000;
                        if (!chosen || !negotiatingPlayer.club) {
                          setOfferFee(basePrice);
                        } else {
                          const cnt = negotiatingPlayer.club.squad.filter(
                            (sp) => sp.detailedRole === chosen.detailedRole
                          ).length;
                          const cr = Math.round(
                            chosen.marketValue * (cnt <= 2 ? 1.08 : 0.92)
                          );
                          setOfferFee(Math.max(0, Math.round((basePrice - cr) / 50000) * 50000));
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">Sem troca (apenas pagamento em dinheiro)</option>
                      {eligibleSwapPlayers.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name} ({sp.detailedRole} · OVR {sp.overall} · Mercado{' '}
                          {formatCurrency(sp.marketValue)})
                        </option>
                      ))}
                    </select>
                    {selectedSwapPlayer && (
                      <div className="mt-1.5 text-[11px] text-slate-400 tabular-nums">
                        {swapEvaluation.sellerNeedsRole
                          ? `O ${negotiatingPlayer.club.shortName} tem carência em ${selectedSwapPlayer.detailedRole} (+8% de valorização na troca).`
                          : `Avaliação comercial padrão de 92% sobre o passe de ${selectedSwapPlayer.name}.`}
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {selectedSwapPlayer
                      ? 'Volta em Dinheiro ao Clube (R$):'
                      : 'Proposta de Compra ao Clube (R$):'}
                  </label>
                  <input
                    type="number"
                    step={offerFee < 250_000 ? 10_000 : 100_000}
                    min="0"
                    value={offerFee}
                    onChange={(e) => setOfferFee(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </>
            )}

            {/* Input wage */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Salário Mensal Oferecido ao Jogador (R$):
              </label>
              <input
                type="number"
                step={offerWage < 15_000 ? 500 : 5_000}
                value={offerWage}
                onChange={(e) => setOfferWage(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Contract Duration Selector (1 to 5 Years) */}
            <div className="mb-4 tabular-nums">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tempo de Contrato Definitivo:</span>
                </label>
                <span className="font-mono font-bold text-emerald-300">
                  {offerContractYears} {offerContractYears === 1 ? 'ano' : 'anos'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((yrs) => {
                  const blockedByAge = negotiatingPlayer.player.age >= 35 && yrs > 3;
                  return (
                    <button
                      key={yrs}
                      type="button"
                      disabled={blockedByAge}
                      onClick={() => {
                        soundEngine.playClick();
                        setOfferContractYears(yrs);
                      }}
                      title={
                        blockedByAge
                          ? 'Atletas com 35+ anos aceitam contratos de até 3 anos'
                          : `${yrs} ${yrs === 1 ? 'ano' : 'anos'} de contrato`
                      }
                      className={`py-2 rounded-lg border font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                        offerContractYears === yrs
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {yrs} {yrs === 1 ? 'ano' : 'anos'}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-mono">
                <span>Salário anual: {formatCurrency(offerWage * 12)}</span>
                <span>
                  Pacote {offerContractYears}a:{' '}
                  {formatCurrency(
                    (negotiatingPlayer.club ? offerFee : 0) +
                      offerWage * 12 * offerContractYears
                  )}
                </span>
              </div>
            </div>

            {/* Sell-On Percentage & Milestone Bonuses to Reduce Upfront Asking Fee */}
            {negotiatingPlayer.club && (() => {
              const disc = computePurchaseUpfrontDiscountFactor({
                sellOnPercentage: purchaseSellOnPct,
                enableGoalBonus: purchaseGoalBonus,
                enableAppearancesBonus: purchaseAppsBonus,
              });
              const discFactor = negotiatingPlayer.discountFactor ?? 1;
              const estMinFee = Math.max(
                0,
                Math.round(
                  negotiatingPlayer.player.marketValue *
                    (discFactor < 1 ? 0.78 : 0.95) *
                    (1 - disc)
                ) - swapEvaluation.credit
              );
              const bonusVal = computeDefaultMilestoneBonusAmount(
                negotiatingPlayer.player.marketValue
              );

              return (
                <div className="mb-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5 text-xs tabular-nums">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cláusulas p/ Reduzir Valor à Vista</span>
                    </span>
                    <span className="font-mono text-[11px] text-emerald-300 font-bold">
                      {disc > 0 ? `-${Math.round(disc * 100)}% na pedida` : 'Sem cláusulas'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 10, 20, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setPurchaseSellOnPct(pct);
                        }}
                        className={`py-1.5 rounded-lg border font-mono font-bold text-xs cursor-pointer transition-colors ${
                          purchaseSellOnPct === pct
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {pct === 0 ? '0%' : `${pct}% Venda`}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setPurchaseGoalBonus((p) => !p);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-left font-semibold cursor-pointer transition-colors ${
                        purchaseGoalBonus
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Bônus Gols ({formatCurrency(bonusVal)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setPurchaseAppsBonus((p) => !p);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-left font-semibold cursor-pointer transition-colors ${
                        purchaseAppsBonus
                          ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Bônus 15J ({formatCurrency(bonusVal)})
                    </button>
                  </div>

                  {disc > 0 && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/70">
                      <span className="text-[11px] text-slate-300">
                        Pedida estimada c/ cláusulas:{' '}
                        <strong className="font-mono text-emerald-300">
                          {formatCurrency(estMinFee)}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setOfferFee(estMinFee);
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                      >
                        Aplicar {formatCurrency(estMinFee)}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Live Permanent Deal Acceptance Thermometer */}
            {negotiatingPlayer.club ? (() => {
              const permPreview = previewPermanentOffer({
                userClub,
                sellerClub: negotiatingPlayer.club,
                player: negotiatingPlayer.player,
                offerFee,
                offerWage,
                discountFactor: negotiatingPlayer.discountFactor ?? 1,
                swapCredit: swapEvaluation.credit,
                clauseDiscount: computePurchaseUpfrontDiscountFactor({
                  sellOnPercentage: purchaseSellOnPct,
                  enableGoalBonus: purchaseGoalBonus,
                  enableAppearancesBonus: purchaseAppsBonus,
                }),
              });
              return (
                <div
                  className={`mb-4 p-3 rounded-xl border text-xs space-y-2 tabular-nums ${
                    permPreview.tone === 'emerald'
                      ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
                      : permPreview.tone === 'amber'
                      ? 'bg-amber-950/35 border-amber-500/40 text-amber-200'
                      : 'bg-rose-950/35 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">Termômetro: {permPreview.statusLabel}</span>
                    <span className="font-mono font-black">{permPreview.probabilityPct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        permPreview.tone === 'emerald'
                          ? 'bg-emerald-400'
                          : permPreview.tone === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${permPreview.probabilityPct}%` }}
                    />
                  </div>
                  <div className="text-[11px]">{permPreview.hint}</div>
                  {!permPreview.willAcceptAll && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {!permPreview.willAcceptClub && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setOfferFee(permPreview.minAcceptableFee);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          Igualar Passe ({formatCurrency(permPreview.minAcceptableFee)})
                        </button>
                      )}
                      {!permPreview.willAcceptPlayer && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setOfferWage(permPreview.minAcceptableWage);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          Igualar Salário ({formatCurrency(permPreview.minAcceptableWage)})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })() : (() => {
              const faWilling = evaluatePlayerClubWillingness(userClub, negotiatingPlayer.player, {
                dealType: 'FREE_AGENT',
              });
              if (!faWilling.willing) {
                return (
                  <div className="mb-4 p-3 rounded-xl border border-rose-500/40 bg-rose-950/35 text-xs text-rose-200 leading-relaxed">
                    <strong className="text-rose-300 block mb-0.5">Recusa do Atleta (Nível)</strong>
                    <span>{faWilling.reason}</span>
                  </div>
                );
              }
              return (
                <div className="mb-4 p-3 rounded-xl border border-slate-700 bg-slate-950/70 text-xs flex items-center justify-between gap-2 tabular-nums">
                  <span className={offerWage >= Math.round(negotiatingPlayer.player.wage * 0.9) ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
                    {offerWage >= Math.round(negotiatingPlayer.player.wage * 0.9)
                      ? `${negotiatingPlayer.player.name} aceita esse salário à vista!`
                      : `Salário mínimo pedido: ${formatCurrency(negotiatingPlayer.player.wage)}/mês`}
                  </span>
                  {offerWage < Math.round(negotiatingPlayer.player.wage * 0.9) && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setOfferWage(negotiatingPlayer.player.wage);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] cursor-pointer whitespace-nowrap"
                    >
                      Igualar Pedido
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Instant Release Clause Trigger */}
            {negotiatingPlayer.club && onPayReleaseClause && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleTriggerReleaseClauseInModal}
                  className="w-full py-2 px-3 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                >
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    Pagar Multa Integral ({offerContractYears}a ·{' '}
                    {formatCurrency(
                      negotiatingPlayer.player.releaseClause ||
                        computeDefaultReleaseClause(negotiatingPlayer.player, negotiatingPlayer.club)
                    )}
                    )
                  </span>
                </button>
              </div>
            )}

            {/* Feedback message */}
            {negotiationFeedback && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold mb-4 flex items-center gap-2 ${
                  negotiationFeedback.success
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {negotiationFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{negotiationFeedback.msg}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setNegotiatingPlayer(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendOffer}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                Enviar Proposta Oficial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXERCER OPÇÃO DE COMPRA EM MEUS EMPRÉSTIMOS (ESCOLHER 1 A 5 ANOS) */}
      {buyoutModalPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl w-full max-w-md shadow-2xl p-6 my-auto space-y-4">
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Exercer Opção de Compra Fixada
              </p>
              <h3 className="text-lg font-black text-white mt-0.5">
                {buyoutModalPlayer.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                {buyoutModalPlayer.detailedRole} · OVR {buyoutModalPlayer.overall} ·{' '}
                {buyoutModalPlayer.age} anos · Passe fixado em{' '}
                <strong className="text-emerald-300 font-mono">
                  {formatCurrency(buyoutModalPlayer.loanBuyOptionFee || 0)}
                </strong>
              </p>
            </div>

            <div className="space-y-3 text-xs tabular-nums">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-200">
                    Duração do Contrato Definitivo:
                  </label>
                  <span className="font-mono font-bold text-emerald-300">
                    {buyoutContractYears} {buyoutContractYears === 1 ? 'ano' : 'anos'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((yrs) => {
                    const blockedByAge = buyoutModalPlayer.age >= 35 && yrs > 3;
                    return (
                      <button
                        key={yrs}
                        type="button"
                        disabled={blockedByAge}
                        onClick={() => {
                          soundEngine.playClick();
                          setBuyoutContractYears(yrs);
                        }}
                        className={`py-2 rounded-lg border font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                          buyoutContractYears === yrs
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {yrs} {yrs === 1 ? 'ano' : 'anos'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">
                  Salário Mensal Definitivo (R$):
                </label>
                <input
                  type="number"
                  step={5000}
                  min={Math.round(resolvePlayerFullMonthlyWage(buyoutModalPlayer) * 0.85)}
                  value={buyoutPermanentWage}
                  onChange={(e) =>
                    setBuyoutPermanentWage(Math.max(5000, Number(e.target.value)))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {buyoutFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  buyoutFeedback.success
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                }`}
              >
                {buyoutFeedback.msg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBuyoutModalPlayer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBuyout}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer tabular-nums"
              >
                Confirmar Compra ({formatCurrency(buyoutModalPlayer.loanBuyOptionFee || 0)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEGOCIAR / FIXAR OPÇÃO DE COMPRA EM EMPRÉSTIMO ATIVO */}
      {clauseModalPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-md shadow-2xl p-6 my-auto space-y-4">
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Negociar Cláusula de Opção de Compra
              </p>
              <h3 className="text-lg font-black text-white mt-0.5">
                {clauseModalPlayer.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                Prazo: {formatLoanDurationLabel(clauseModalPlayer.loanRoundsRemaining, clauseModalPlayer.loanDurationMonths)} · Mercado {formatCurrency(clauseModalPlayer.marketValue)}
              </p>
            </div>

            <div className="space-y-2.5 text-xs tabular-nums">
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '95%', mult: 0.95 },
                  { label: '100%', mult: 1.0 },
                  { label: '115%', mult: 1.15 },
                  { label: '130%', mult: 1.3 },
                ].map((preset) => {
                  const step = clauseModalPlayer.marketValue < 250_000 ? 10_000 : 50_000;
                  const val = Math.max(
                    10_000,
                    Math.round((clauseModalPlayer.marketValue * preset.mult) / step) * step
                  );
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setClauseProposedFee(val);
                      }}
                      className={`py-1.5 rounded-lg border font-mono font-bold text-xs cursor-pointer transition-colors ${
                        clauseProposedFee === val
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                step={clauseModalPlayer.marketValue < 250_000 ? 10_000 : 100_000}
                min={10_000}
                value={clauseProposedFee}
                onChange={(e) => setClauseProposedFee(Math.max(10_000, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            {clauseFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold space-y-2 ${
                  clauseFeedback.success
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                }`}
              >
                <div>{clauseFeedback.msg}</div>
                {!clauseFeedback.success && clauseSuggestedFee && (
                  <button
                    type="button"
                    onClick={() => handleSubmitClauseNegotiation(clauseSuggestedFee)}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer tabular-nums"
                  >
                    Aceitar Contraproposta ({formatCurrency(clauseSuggestedFee)})
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setClauseModalPlayer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => handleSubmitClauseNegotiation()}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer"
              >
                Enviar Proposta de Passe Fixo
              </button>
            </div>
          </div>
        </div>
      )}

      {comparingTarget && (
        <PlayerComparisonModal
          userClub={userClub}
          targetPlayer={comparingTarget.player}
          targetClub={comparingTarget.club}
          isWatchlisted={watchlistIdSet.has(comparingTarget.player.id)}
          onToggleWatchlist={onToggleWatchlistPlayer}
          onNegotiateTarget={(p) => {
            const targetClub = comparingTarget.club || undefined;
            setComparingTarget(null);
            openNegotiation(p, targetClub);
          }}
          onClose={() => setComparingTarget(null)}
        />
      )}
    </div>
  );
};

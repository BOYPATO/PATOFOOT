import React, { useState, useMemo } from 'react';
import { Club, PendingTransferDeal, Player, TransferHistoryRecord } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import {
  getClubSeasonLoanCounts,
  MAX_SEASON_LOANS_OUT,
} from '../utils/loanEngine';
import {
  findPendingTransferForPlayer,
  getTransferWindowStatus,
} from '../utils/transferWindowEngine';
import {
  formatPlayerNationalityFull,
  resolvePlayerNationality,
} from '../utils/nationalityUtils';
import {
  ClausePackageInput,
  computeDefaultMilestoneBonusAmount,
  computeSaleAdjustedUpfrontOffer,
} from '../utils/transferClausesEngine';
import {
  CANONICAL_SECTOR_FILTER_OPTIONS,
  comparePlayersByPosition,
  matchesCanonicalPositionFilter,
} from '../utils/playerOrdering';
import { PlayerAvatar } from './PlayerAvatar';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import confetti from 'canvas-confetti';
import { 
  Users, 
  Search, 
  Tag, 
  Handshake, 
  DollarSign, 
  X, 
  CheckCircle2, 
  TrendingUp, 
  ArrowRightLeft, 
  Shield, 
  Sparkles,
  AlertCircle,
  Building2,
  Percent,
  Clock,
  Filter
} from 'lucide-react';

interface SquadManagementViewProps {
  userClub: Club;
  allClubs: Club[];
  currentDate?: string;
  pendingTransfers?: PendingTransferDeal[];
  transferHistory?: TransferHistoryRecord[];
  currentSeasonYear?: number;
  saSeasonYear?: number;
  europeSeasonYear?: number;
  onUpdateSquad: (squad: Player[]) => void;
  onSellPlayerToClub: (
    playerId: string,
    buyerClubId: string,
    salePrice: number,
    clausePkg?: ClausePackageInput
  ) => boolean;
  onLoanOutPlayer: (
    playerId: string,
    toClubId: string,
    durationRounds: number,
    wageSharePct: number,
    buyOptionFee?: number,
    loanFeeReceived?: number
  ) => boolean;
  onListPlayerForSale: (playerId: string, askingPrice: number) => void;
  onDelistPlayerForSale: (playerId: string) => void;
  onTogglePlayerForLoan: (playerId: string, list: boolean) => void;
}

export const SquadManagementView: React.FC<SquadManagementViewProps> = ({
  userClub,
  allClubs,
  currentDate,
  pendingTransfers = [],
  transferHistory = [],
  currentSeasonYear,
  saSeasonYear,
  europeSeasonYear,
  onUpdateSquad,
  onSellPlayerToClub,
  onLoanOutPlayer,
  onListPlayerForSale,
  onDelistPlayerForSale,
  onTogglePlayerForLoan,
}) => {
  const windowStatus = useMemo(() => getTransferWindowStatus(currentDate), [currentDate]);
  const seasonLoanCounts = useMemo(
    () =>
      getClubSeasonLoanCounts({
        club: userClub,
        transferHistory,
        currentSeasonYear:
          currentSeasonYear || Number((currentDate || '2026-01-01').slice(0, 4)) || 2026,
        saSeasonYear,
        europeSeasonYear,
      }),
    [userClub, transferHistory, currentSeasonYear, currentDate, saSeasonYear, europeSeasonYear]
  );
  const inspection = usePlayerInspection();
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'FOR_SALE' | 'FOR_LOAN' | 'STARTERS' | 'RESERVES'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [saleModalPlayer, setSaleModalPlayer] = useState<Player | null>(null);
  const [loanModalPlayer, setLoanModalPlayer] = useState<Player | null>(null);

  // Sale Modal state
  const [customAskingPrice, setCustomAskingPrice] = useState<number>(0);
  const [saleSellOnPct, setSaleSellOnPct] = useState<number>(0);
  const [saleGoalBonus, setSaleGoalBonus] = useState<boolean>(false);
  const [saleAppsBonus, setSaleAppsBonus] = useState<boolean>(false);
  const [saleFeedback, setSaleFeedback] = useState<string | null>(null);

  // Loan Modal state
  const [loanTargetClubId, setLoanTargetClubId] = useState<string>('');
  const [loanDurationRounds, setLoanDurationRounds] = useState<19 | 38>(19);
  const [loanWageShare, setLoanWageShare] = useState<number>(70);
  const [loanEnableBuyout, setLoanEnableBuyout] = useState<boolean>(true);
  const [loanBuyoutOption, setLoanBuyoutOption] = useState<number>(0);
  const [loanFee, setLoanFee] = useState<number>(0);
  const [loanFeedback, setLoanFeedback] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Squad metrics
  const totalPayroll = userClub.squad.reduce((sum, p) => sum + p.wage, 0);
  const totalSquadValue = userClub.squad.reduce((sum, p) => sum + p.marketValue, 0);
  const forSaleCount = userClub.squad.filter((p) => p.isListedForSale).length;
  const forLoanCount = userClub.squad.filter((p) => p.isListedForLoan).length;

  // Filtered squad list (ordered GOL -> LAT -> ZAG -> VOL -> MEI -> ATA)
  const filteredSquad = useMemo(() => {
    return userClub.squad
      .filter((p) => {
        if (!matchesCanonicalPositionFilter(p, filterRole)) return false;

        if (filterStatus === 'FOR_SALE' && !p.isListedForSale) return false;
        if (filterStatus === 'FOR_LOAN' && !p.isListedForLoan) return false;
        if (filterStatus === 'STARTERS' && !p.isStarter) return false;
        if (filterStatus === 'RESERVES' && p.isStarter) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesName = p.name.toLowerCase().includes(query);
          const matchesRole = p.detailedRole.toLowerCase().includes(query);
          const matchesNat = resolvePlayerNationality(p, userClub.country || 'Brasil')
            .toLowerCase()
            .includes(query);
          if (!matchesName && !matchesRole && !matchesNat) return false;
        }

        return true;
      })
      .sort((a, b) => comparePlayersByPosition(a, b));
  }, [userClub.squad, userClub.country, filterRole, filterStatus, searchQuery]);

  // Open Sale Modal
  const handleOpenSaleModal = (player: Player) => {
    soundEngine.playClick();
    setSaleModalPlayer(player);
    setCustomAskingPrice(player.askingPrice || player.marketValue);
    setSaleSellOnPct(player.age <= 24 ? 10 : 0);
    setSaleGoalBonus(false);
    setSaleAppsBonus(false);
    setSaleFeedback(null);
  };

  // Open Loan Modal
  const handleOpenLoanModal = (player: Player) => {
    soundEngine.playClick();
    setLoanModalPlayer(player);
    const candidateClubs = allClubs.filter(
      (c) => c.id !== userClub.id && (c.division === 'B' || c.division === 'C' || c.division === 'A')
    );
    if (candidateClubs.length > 0) {
      setLoanTargetClubId(candidateClubs[0].id);
    }
    setLoanDurationRounds(19);
    setLoanWageShare(70);
    setLoanEnableBuyout(true);
    const buyoutStep = player.marketValue < 250_000 ? 10_000 : 50_000;
    setLoanBuyoutOption(
      Math.max(10_000, Math.round((player.marketValue * 1.15) / buyoutStep) * buyoutStep)
    );
    setLoanFee(Math.round(player.marketValue * 0.05));
    setLoanFeedback(null);
  };

  // Generate 2-3 genuine interested buyer clubs for a player
  const generatedSaleOffers = useMemo(() => {
    if (!saleModalPlayer) return [];
    const otherClubs = allClubs.filter((c) => c.id !== userClub.id);
    if (otherClubs.length === 0) return [];

    // Filter clubs by division appropriate to overall
    const minOvr = saleModalPlayer.overall;
    const compatibleClubs = otherClubs.filter((c) => {
      if (minOvr >= 80) return c.division === 'A';
      if (minOvr >= 74) return c.division === 'A' || c.division === 'B';
      return true;
    });

    const pool = compatibleClubs.length >= 3 ? compatibleClubs : otherClubs;
    // Deterministic pick based on player ID and club ID
    const shuffled = [...pool].sort((a, b) => {
      const hashA = (a.name.charCodeAt(0) * 17 + saleModalPlayer.overall) % 31;
      const hashB = (b.name.charCodeAt(0) * 17 + saleModalPlayer.overall) % 31;
      return hashA - hashB;
    });

    const selectedClubs = shuffled.slice(0, 3);
    const multipliers = [0.95, 1.05, 1.15];
    const priceStep = saleModalPlayer.marketValue < 250_000 ? 10_000 : 100_000;

    return selectedClubs.map((club, idx) => {
      const mult = multipliers[idx] || 1.0;
      const offeredPrice =
        Math.round((saleModalPlayer.marketValue * mult) / priceStep) * priceStep;
      return {
        club,
        offeredPrice: Math.max(10_000, offeredPrice),
        mult,
      };
    });
  }, [saleModalPlayer, allClubs, userClub.id]);

  const activeSaleClausePkg: ClausePackageInput = useMemo(
    () => ({
      sellOnPercentage: saleSellOnPct,
      enableGoalBonus: saleGoalBonus,
      enableAppearancesBonus: saleAppsBonus,
    }),
    [saleSellOnPct, saleGoalBonus, saleAppsBonus]
  );

  // Execute Sale to Buyer Club
  const handleAcceptOffer = (buyerClub: Club, baseOfferPrice: number) => {
    if (!saleModalPlayer) return;
    soundEngine.playFanfare();
    confetti({ particleCount: 120, spread: 80 });

    const finalUpfrontPrice = computeSaleAdjustedUpfrontOffer(
      baseOfferPrice,
      activeSaleClausePkg
    );
    const hasClauses =
      activeSaleClausePkg.sellOnPercentage > 0 ||
      activeSaleClausePkg.enableGoalBonus ||
      activeSaleClausePkg.enableAppearancesBonus;

    const success = onSellPlayerToClub(
      saleModalPlayer.id,
      buyerClub.id,
      finalUpfrontPrice,
      hasClauses ? activeSaleClausePkg : undefined
    );
    if (success) {
      const clauseLabel =
        activeSaleClausePkg.sellOnPercentage > 0
          ? ` (+${activeSaleClausePkg.sellOnPercentage}% de venda futura)`
          : '';
      setSaleFeedback(
        windowStatus.isOpen
          ? `Sucesso! ${saleModalPlayer.name} foi vendido ao ${buyerClub.name} por ${formatCurrency(finalUpfrontPrice)}${clauseLabel}!`
          : `Venda fechada! Caixa creditado em ${formatCurrency(finalUpfrontPrice)}${clauseLabel}. ${saleModalPlayer.name} seguirá no elenco até se apresentar ao ${buyerClub.name} em ${windowStatus.nextOpenDisplay}!`
      );
      setTimeout(() => {
        setSaleModalPlayer(null);
        setSaleFeedback(null);
      }, 2100);
    }
  };

  // Save Asking Price & List For Sale
  const handleConfirmListForSale = () => {
    if (!saleModalPlayer) return;
    soundEngine.playClick();
    onListPlayerForSale(saleModalPlayer.id, customAskingPrice);
    setSaleFeedback(`Jogador listado para venda por ${formatCurrency(customAskingPrice)}! Clubes interessados farão propostas.`);
    setTimeout(() => {
      setSaleModalPlayer(null);
      setSaleFeedback(null);
    }, 1800);
  };

  // Remove from Sale
  const handleRemoveFromSale = (playerId: string) => {
    soundEngine.playClick();
    onDelistPlayerForSale(playerId);
  };

  // Confirm Loan Out to Partner Club
  const handleConfirmLoanOut = () => {
    if (!loanModalPlayer || !loanTargetClubId) return;
    const destClub = allClubs.find((c) => c.id === loanTargetClubId);
    if (!destClub) return;

    if (seasonLoanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT) {
      soundEngine.playWhistle(false);
      setLoanFeedback(
        `Limite de ${MAX_SEASON_LOANS_OUT} jogadores cedidos por empréstimo na temporada atingido (${seasonLoanCounts.loansOutCount}/${MAX_SEASON_LOANS_OUT}).`
      );
      return;
    }

    const effectiveBuyout =
      loanEnableBuyout && loanBuyoutOption > 0 ? loanBuyoutOption : undefined;
    const durationText =
      loanDurationRounds >= 38 ? '1 ano (38 rodadas)' : '6 meses (19 rodadas)';

    const success = onLoanOutPlayer(
      loanModalPlayer.id,
      loanTargetClubId,
      loanDurationRounds,
      loanWageShare,
      effectiveBuyout,
      loanFee
    );

    if (success) {
      soundEngine.playFanfare();
      confetti({ particleCount: 80, spread: 70 });
      setLoanFeedback(
        windowStatus.isOpen
          ? `Empréstimo firmado com o ${destClub.name} por ${durationText}${effectiveBuyout ? ` · Opção de compra fixada em ${formatCurrency(effectiveBuyout)}` : ''}!`
          : `Empréstimo de ${durationText} agendado com o ${destClub.name}! O atleta seguirá no seu elenco até a reabertura da janela em ${windowStatus.nextOpenDisplay}.`
      );
      setTimeout(() => {
        setLoanModalPlayer(null);
        setLoanFeedback(null);
      }, 2100);
    } else {
      soundEngine.playWhistle(false);
      setLoanFeedback(
        `Não foi possível concluir a cessão de ${loanModalPlayer.name} (cota de ${MAX_SEASON_LOANS_OUT} empréstimos ou movimentação pendente).`
      );
    }
  };

  // Quick List / Unlist For Loan
  const handleQuickToggleLoan = (player: Player) => {
    soundEngine.playClick();
    onTogglePlayerForLoan(player.id, !player.isListedForLoan);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card with Squad Overview */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/40 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-inner">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Gestão do Elenco: Vendas & Empréstimos
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {userClub.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerencie contratos, defina preços de venda, negocie transferências e ceda atletas para ganhar rodagem.{' '}
                <span className={windowStatus.isOpen ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold'}>
                  {windowStatus.isOpen
                    ? `(${windowStatus.shortBadge} · fecha em ${windowStatus.closesOnDisplay})`
                    : `(${windowStatus.shortBadge} · negócios fechados agora transferem o atleta na reabertura)`}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full md:w-auto">
            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Elenco</span>
              <span className="text-sm font-black text-white font-mono">{userClub.squad.length} atletas</span>
            </div>

            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-emerald-400 uppercase font-semibold block">À Venda</span>
              <span className="text-sm font-black text-emerald-300 font-mono">{forSaleCount}</span>
            </div>

            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-amber-400 uppercase font-semibold block">P/ Empréstimo</span>
              <span className="text-sm font-black text-amber-300 font-mono">{forLoanCount}</span>
            </div>

            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center tabular-nums">
              <span className="text-[10px] text-sky-400 uppercase font-semibold block">Cedidos (Temp.)</span>
              <span
                className={`text-sm font-black font-mono ${
                  seasonLoanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT
                    ? 'text-rose-400'
                    : 'text-sky-300'
                }`}
              >
                {seasonLoanCounts.loansOutCount}/{MAX_SEASON_LOANS_OUT}
              </span>
            </div>

            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Folha Mensal</span>
              <span className="text-sm font-black text-rose-400 font-mono">{formatCurrency(totalPayroll)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        {/* Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {CANONICAL_SECTOR_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                soundEngine.playClick();
                setFilterRole(opt.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterRole === opt.id
                  ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => {
              soundEngine.playClick();
              setFilterStatus('ALL');
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setFilterStatus('FOR_SALE');
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'FOR_SALE'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-emerald-300 bg-slate-900'
            }`}
          >
            <Tag className="w-3 h-3 text-emerald-400" />
            <span>À Venda ({forSaleCount})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setFilterStatus('FOR_LOAN');
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'FOR_LOAN'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-amber-300 bg-slate-900'
            }`}
          >
            <Handshake className="w-3 h-3 text-amber-400" />
            <span>Para Empréstimo ({forLoanCount})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setFilterStatus('RESERVES');
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'RESERVES'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            Reservas
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por jogador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Squad Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredSquad.map((player) => {
          const isInjured = player.injuryWeeks > 0 || Boolean(player.injuryDetails);
          const isListedSale = Boolean(player.isListedForSale);
          const isListedLoan = Boolean(player.isListedForLoan);
          const pendingDeal = findPendingTransferForPlayer(pendingTransfers, player.id);

          return (
            <div
              key={player.id}
              className={`rounded-2xl p-4 flex flex-col justify-between transition-all border shadow-lg ${
                pendingDeal
                  ? 'bg-slate-950 border-sky-500/40'
                  : isListedSale
                  ? 'bg-gradient-to-b from-emerald-950/20 to-slate-950 border-emerald-500/40 shadow-emerald-500/10'
                  : isListedLoan
                  ? 'bg-gradient-to-b from-amber-950/20 to-slate-950 border-amber-500/40 shadow-amber-500/10'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header: Avatar, Name, Number, Role, OVR */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <PlayerAvatar
                      player={player}
                      club={userClub}
                      clubPrimaryColor={userClub.colors.primary}
                      clubTextColor={userClub.colors.text}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-slate-400 shrink-0">#{player.squadNumber}</span>
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
                      </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5 tabular-nums">
                      <span className="text-sky-400 font-bold">{player.detailedRole}</span>
                      <span>·</span>
                      <span>{player.age} anos</span>
                      <span>·</span>
                      <span className="text-slate-300">
                        {formatPlayerNationalityFull(player, userClub.country)}
                      </span>
                      <span>·</span>
                      <span>{player.isStarter ? '⭐ Titular' : 'Reserva'}</span>
                      {player.isLoan && (
                        <>
                          <span>·</span>
                          <span className="text-amber-400 font-semibold">Emprestado ao seu time</span>
                        </>
                      )}
                    </p>
                    </div>
                  </div>

                  <span className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-sky-400 font-black text-xs flex items-center justify-center shrink-0 shadow-inner">
                    {player.overall}
                  </span>
                </div>

                {/* Market Status Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {pendingDeal && (
                    <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>
                        Saída agendada p/ {pendingDeal.toClubName} em {pendingDeal.arrivalDisplayDate}
                      </span>
                    </span>
                  )}
                  {!pendingDeal && isListedSale && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-emerald-400" />
                      <span>À VENDA: {formatCurrency(player.askingPrice || player.marketValue)}</span>
                    </span>
                  )}
                  {!pendingDeal && isListedLoan && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Handshake className="w-3 h-3 text-amber-400" />
                      <span>PARA EMPRÉSTIMO</span>
                    </span>
                  )}
                  {isInjured && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      🏥 DM
                    </span>
                  )}
                </div>

                {/* Financials: Market Value & Wage */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Valor de Mercado</span>
                    <strong className="text-emerald-400 font-mono text-[11px] font-bold">
                      {formatCurrency(player.marketValue)}
                    </strong>
                  </div>
                  <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Salário Mensal</span>
                    <strong className="text-slate-300 font-mono text-[11px] font-bold">
                      {formatCurrency(player.wage)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Vender & Emprestar */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                {pendingDeal ? (
                  <div className="py-2 px-3 rounded-xl bg-slate-900/80 border border-sky-500/30 text-center text-xs font-semibold text-sky-300 tabular-nums">
                    Acordo fechado · Transfere em {pendingDeal.arrivalDisplayDate}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Sell Button */}
                      <button
                        onClick={() => handleOpenSaleModal(player)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                          isListedSale
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>{isListedSale ? 'Gerenciar Venda' : 'Vender'}</span>
                      </button>

                      {/* Loan Button */}
                      {!player.isLoan ? (
                        <button
                          onClick={() => handleOpenLoanModal(player)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                            isListedLoan
                              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          <Handshake className="w-3.5 h-3.5" />
                          <span>{isListedLoan ? 'Gerenciar Empréstimo' : 'Emprestar'}</span>
                        </button>
                      ) : (
                        <div className="py-2 px-2 text-center text-[10px] text-slate-500 italic bg-slate-900/50 rounded-xl">
                          Jogador Emprestado
                        </div>
                      )}
                    </div>

                    {/* Quick Toggle / Delist shortcuts */}
                    {(isListedSale || isListedLoan) && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1">
                        {isListedSale && (
                          <button
                            onClick={() => handleRemoveFromSale(player.id)}
                            className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                          >
                            ✕ Retirar da Venda
                          </button>
                        )}
                        {isListedLoan && (
                          <button
                            onClick={() => handleQuickToggleLoan(player)}
                            className="text-slate-400 hover:text-slate-200 hover:underline cursor-pointer ml-auto"
                          >
                            ✕ Tirar de Empréstimo
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: COLOCAR À VENDA & NEGOCIAR PROPOSTAS */}
      {saleModalPlayer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl max-w-xl w-full p-6 my-auto shadow-2xl relative space-y-5 animate-in fade-in duration-200">
            {/* Close Button */}
            <button
              onClick={() => setSaleModalPlayer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 border border-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Tag className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-white">
                    Negociação de Venda: {saleModalPlayer.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {saleModalPlayer.detailedRole} • Força {saleModalPlayer.overall} • {saleModalPlayer.age} anos • Valor: {formatCurrency(saleModalPlayer.marketValue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Closed Window Notice */}
            {!windowStatus.isOpen && (
              <div className="p-3 rounded-xl bg-amber-950/35 border border-amber-500/40 text-xs text-amber-200">
                <strong className="text-amber-300">Janela Fechada:</strong> o valor da venda entra imediatamente no caixa, mas o atleta permanece disponível no seu elenco até a abertura oficial em{' '}
                <strong className="text-white font-mono">{windowStatus.nextOpenDisplay}</strong>.
              </div>
            )}

            {/* Feedback message */}
            {saleFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{saleFeedback}</span>
              </div>
            )}

            {/* Clauses Retainer Box (Sell-on % & Milestones) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs tabular-nums">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cláusulas de Mais-Valia (% Venda Futura) e Bônus por Metas</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {saleSellOnPct > 0 ? `${saleSellOnPct}% retido` : '100% à vista'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[0, 10, 20, 30].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSaleSellOnPct(pct);
                    }}
                    className={`py-1.5 rounded-lg border font-mono font-bold text-xs cursor-pointer transition-colors ${
                      saleSellOnPct === pct
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {pct === 0 ? 'Sem %' : `${pct}% Futura`}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSaleGoalBonus((p) => !p);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-left font-semibold transition-colors cursor-pointer ${
                    saleGoalBonus
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Meta de Gols (+{formatCurrency(computeDefaultMilestoneBonusAmount(saleModalPlayer.marketValue))})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSaleAppsBonus((p) => !p);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-left font-semibold transition-colors cursor-pointer ${
                    saleAppsBonus
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Meta 15 Jogos (+{formatCurrency(computeDefaultMilestoneBonusAmount(saleModalPlayer.marketValue))})
                </button>
              </div>
            </div>

            {/* Section A: Instant Offers from Rival Clubs */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>Propostas Imediatas de Compra de Outros Clubes</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">À vista no caixa</span>
              </div>

              <div className="space-y-2">
                {generatedSaleOffers.map(({ club, offeredPrice, mult }) => {
                  const adjustedUpfront = computeSaleAdjustedUpfrontOffer(
                    offeredPrice,
                    activeSaleClausePkg
                  );
                  return (
                    <div
                      key={club.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shadow shrink-0"
                          style={{ backgroundColor: club.colors.primary, color: club.colors.text }}
                        >
                          {club.initials}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{club.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                            Série {club.division} · {mult >= 1 ? `+${Math.round((mult - 1) * 100)}% do valor` : `-${Math.round((1 - mult) * 100)}%`}
                            {saleSellOnPct > 0 ? ` · +${saleSellOnPct}% mais-valia` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-emerald-400 font-mono tabular-nums">
                          {formatCurrency(adjustedUpfront)}
                        </span>
                        <button
                          onClick={() => handleAcceptOffer(club, offeredPrice)}
                          className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
                        >
                          Aceitar Venda
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section B: Set Custom Asking Price & Keep in Window */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Ou Definir Preço Pedido na Lista de Transferência
                </span>
                <span className="text-sm font-black text-sky-400 font-mono">
                  {formatCurrency(customAskingPrice)}
                </span>
              </div>

              <input
                type="range"
                min={Math.round(saleModalPlayer.marketValue * 0.5)}
                max={Math.round(saleModalPlayer.marketValue * 2.0)}
                step={saleModalPlayer.marketValue < 250_000 ? 10_000 : 250_000}
                value={customAskingPrice}
                onChange={(e) => setCustomAskingPrice(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Mínimo: {formatCurrency(saleModalPlayer.marketValue * 0.5)}</span>
                <span>Mercado: {formatCurrency(saleModalPlayer.marketValue)}</span>
                <span>Máximo: {formatCurrency(saleModalPlayer.marketValue * 2.0)}</span>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={handleConfirmListForSale}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
                >
                  Confirmar Jogador à Venda por {formatCurrency(customAskingPrice)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EMPRESTAR JOGADOR PARA OUTRO CLUBE */}
      {loanModalPlayer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-amber-500/40 rounded-2xl max-w-xl w-full p-6 my-auto shadow-2xl relative space-y-5 animate-in fade-in duration-200">
            {/* Close Button */}
            <button
              onClick={() => setLoanModalPlayer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 border border-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Handshake className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-white">
                    Negociar Empréstimo: {loanModalPlayer.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ceda o jogador para que ganhe minutos de jogo e evolua, economizando a folha salarial do {userClub.name}.
                  </p>
                </div>
              </div>
            </div>

            {/* Closed Window Notice */}
            {!windowStatus.isOpen && (
              <div className="p-3 rounded-xl bg-amber-950/35 border border-amber-500/40 text-xs text-amber-200">
                <strong className="text-amber-300">Janela Fechada:</strong> o empréstimo é assinado agora, e o jogador se apresenta ao clube parceiro na reabertura da janela em{' '}
                <strong className="text-white font-mono">{windowStatus.nextOpenDisplay}</strong>.
              </div>
            )}

            {/* Feedback message */}
            {loanFeedback && (
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{loanFeedback}</span>
              </div>
            )}

            {/* Options Form */}
            <div className="space-y-4 text-xs">
              {/* Destination Club */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">
                  Clube de Destino (Parceiro):
                </label>
                <select
                  value={loanTargetClubId}
                  onChange={(e) => setLoanTargetClubId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-amber-400"
                >
                  {allClubs
                    .filter((c) => c.id !== userClub.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Série {c.division})
                      </option>
                    ))}
                </select>
              </div>

              {/* Duration (6 Meses vs 1 Ano) */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">
                  Duração do Empréstimo:
                </label>
                <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setLoanDurationRounds(19);
                    }}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${
                      loanDurationRounds === 19
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    6 Meses (19 Rodadas)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setLoanDurationRounds(38);
                    }}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${
                      loanDurationRounds === 38
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    1 Ano (38 Rodadas)
                  </button>
                </div>
              </div>

              {/* Wage Contribution */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">
                  Salário Pago pelo Clube Parceiro:
                </label>
                <select
                  value={loanWageShare}
                  onChange={(e) => setLoanWageShare(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-amber-400 tabular-nums"
                >
                  <option value={50}>50% ({formatCurrency(loanModalPlayer.wage * 0.5)}/mês)</option>
                  <option value={70}>70% ({formatCurrency(loanModalPlayer.wage * 0.7)}/mês)</option>
                  <option value={100}>100% Integral ({formatCurrency(loanModalPlayer.wage)}/mês)</option>
                </select>
              </div>

              {/* Upfront Loan Fee */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2 tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">Taxa de Vitrine (Recebida no ato):</span>
                  <strong className="text-emerald-400 font-mono font-bold">
                    {formatCurrency(loanFee)}
                  </strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.round(loanModalPlayer.marketValue * 0.15)}
                  step={loanModalPlayer.marketValue < 250_000 ? 5_000 : 50_000}
                  value={loanFee}
                  onChange={(e) => setLoanFee(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Buyout option with Fixed Value */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2.5 tabular-nums">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loanEnableBuyout}
                      onChange={(e) => setLoanEnableBuyout(e.target.checked)}
                      className="w-4 h-4 rounded accent-sky-400 cursor-pointer"
                    />
                    <span className="text-slate-200 font-bold">
                      Fixar Cláusula de Opção de Compra
                    </span>
                  </label>
                  <strong className="text-sky-400 font-mono font-bold">
                    {loanEnableBuyout && loanBuyoutOption > 0
                      ? formatCurrency(loanBuyoutOption)
                      : 'Sem Opção'}
                  </strong>
                </div>

                {loanEnableBuyout && (
                  <>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: '100%', mult: 1.0 },
                        { label: '115%', mult: 1.15 },
                        { label: '130%', mult: 1.3 },
                        { label: '150%', mult: 1.5 },
                      ].map((p) => {
                        const presetStep = loanModalPlayer.marketValue < 250_000 ? 10_000 : 50_000;
                        const presetVal = Math.max(
                          10_000,
                          Math.round((loanModalPlayer.marketValue * p.mult) / presetStep) *
                            presetStep
                        );
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setLoanBuyoutOption(presetVal);
                            }}
                            className={`py-1 rounded-lg border font-mono font-bold text-[11px] cursor-pointer transition-colors ${
                              loanBuyoutOption === presetVal
                                ? 'bg-sky-400 text-slate-950 border-sky-300 font-black'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="number"
                      min={10_000}
                      step={loanModalPlayer.marketValue < 250_000 ? 10_000 : 100_000}
                      value={loanBuyoutOption}
                      onChange={(e) => setLoanBuyoutOption(Math.max(10_000, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sky-300 font-mono text-xs focus:outline-none focus:border-sky-400"
                    />
                    <p className="text-[11px] text-slate-400">
                      Ao final do empréstimo, se o atleta se destacar no clube parceiro, eles poderão exercer a compra depositando o valor à vista no seu caixa.
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 tabular-nums">
                <span>Cota anual de jogadores cedidos por empréstimo:</span>
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
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => handleQuickToggleLoan(loanModalPlayer)}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-xs cursor-pointer"
              >
                {loanModalPlayer.isListedForLoan ? 'Remover da Vitrine' : 'Apenas Listar no Mercado'}
              </button>

              <button
                onClick={handleConfirmLoanOut}
                disabled={seasonLoanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {seasonLoanCounts.loansOutCount >= MAX_SEASON_LOANS_OUT
                  ? `Limite da Temporada Atingido (${MAX_SEASON_LOANS_OUT}/${MAX_SEASON_LOANS_OUT})`
                  : 'Confirmar Empréstimo com Rival →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Club, Player, CompetitionType, MAX_SQUAD_SIZE } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { getCurrentRealWorldSyncPeriod } from '../services/october2026SquadAiService';
import { Users, Search, ArrowUpDown, HeartPulse, BatteryCharging, Shield, Sparkles, ShieldAlert, Tag, Handshake, ArrowRightLeft, PieChart, FileSignature, RefreshCw, CheckCircle2, ExternalLink, DollarSign, X, Clock, Scale, AlertTriangle } from 'lucide-react';
import { isPlayerSuspendedInCompetition, getPlayerSuspensionInCompetition } from '../utils/suspensionEngine';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { SquadReportPanel } from './SquadReportPanel';
import { PlayerComparisonModal } from './PlayerComparisonModal';
import { PlayerAvatar } from './PlayerAvatar';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import {
  CANONICAL_SECTOR_FILTER_OPTIONS,
  comparePlayersByPosition,
  matchesCanonicalPositionFilter,
} from '../utils/playerOrdering';
import {
  getPlayerVersatilityProfile,
  resolveClubLineupTacticalReport,
} from '../utils/tacticalPositioningEngine';
import {
  formatLoanDurationLabel,
  resolvePlayerFullMonthlyWage,
} from '../utils/loanEngine';
import {
  getNationalityInfo,
  resolvePlayerNationality,
} from '../utils/nationalityUtils';

interface SquadTableProps {
  club: Club;
  allClubs?: Club[];
  upcomingCompetition?: CompetitionType;
  selecaoCalledUpIds?: string[];
  isSyncingNationalities?: boolean;
  nationalitySyncFeedback?: string | null;
  onSyncNationalitiesWithAI?: () => void;
  onDismissNationalitySyncFeedback?: () => void;
  isSyncingOct2026Squad?: boolean;
  oct2026SyncFeedback?: string | null;
  oct2026GroundingSources?: Array<{ title: string; uri: string }>;
  onSyncOct2026SquadWithAI?: () => void;
  onDismissOct2026SyncFeedback?: () => void;
  onOpenOct2026GlobalSyncModal?: () => void;
  onUpdateSquad: (squad: Player[]) => void;
  onTriggerBuyOption?: (player: Player, contractYears?: number, agreedWage?: number) => boolean;
  onNegotiateLoanBuyOption?: (
    playerId: string,
    proposedBuyOptionFee: number
  ) => { accepted: boolean; message: string; suggestedFee?: number };
  onTerminateLoanEarly?: (player: Player) => boolean;
  onOpenManagement?: () => void;
  onOpenContracts?: () => void;
  onOpenSaleModal?: (player: Player) => void;
  onOpenLoanModal?: (player: Player) => void;
  onNavigateToMarket?: () => void;
  onNavigateToScouting?: () => void;
}

export const SquadTable: React.FC<SquadTableProps> = ({ 
  club, 
  allClubs = [],
  upcomingCompetition, 
  selecaoCalledUpIds = [],
  isSyncingNationalities = false,
  nationalitySyncFeedback = null,
  onSyncNationalitiesWithAI,
  onDismissNationalitySyncFeedback,
  isSyncingOct2026Squad = false,
  oct2026SyncFeedback = null,
  oct2026GroundingSources = [],
  onSyncOct2026SquadWithAI,
  onDismissOct2026SyncFeedback,
  onOpenOct2026GlobalSyncModal,
  onUpdateSquad,
  onTriggerBuyOption,
  onNegotiateLoanBuyOption,
  onTerminateLoanEarly,
  onOpenManagement,
  onOpenContracts,
  onOpenSaleModal,
  onOpenLoanModal,
  onNavigateToMarket,
  onNavigateToScouting,
}) => {
  const inspection = usePlayerInspection();
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterNationality, setFilterNationality] = useState<string>('ALL');
  const [filterLoansOnly, setFilterLoansOnly] = useState<boolean>(false);
  const [sortField, setSortField] = useState<keyof Player>('position');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [showReportPanel, setShowReportPanel] = useState<boolean>(true);

  // Modal: Exercise Active Buyout Clause (choose 1..5 contract years + permanent wage)
  const [buyoutModalPlayer, setBuyoutModalPlayer] = useState<Player | null>(null);
  const [buyoutContractYears, setBuyoutContractYears] = useState<number>(3);
  const [buyoutPermanentWage, setBuyoutPermanentWage] = useState<number>(0);
  const [buyoutFeedback, setBuyoutFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Modal: Fix / Renegotiate Loan Buyout Clause with Parent Club
  const [clauseModalPlayer, setClauseModalPlayer] = useState<Player | null>(null);
  const [clauseProposedFee, setClauseProposedFee] = useState<number>(0);
  const [clauseSuggestedFee, setClauseSuggestedFee] = useState<number | null>(null);
  const [clauseFeedback, setClauseFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [comparingPlayer, setComparingPlayer] = useState<Player | null>(null);

  const clubCountry = club.country || 'Brasil';

  const squadNationalities = useMemo(() => {
    const counts = new Map<string, number>();
    club.squad.forEach((p) => {
      const nat = resolvePlayerNationality(p, clubCountry);
      counts.set(nat, (counts.get(nat) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [club.squad, clubCountry]);

  const foreignPlayersCount = useMemo(
    () =>
      club.squad.filter((p) => resolvePlayerNationality(p, clubCountry) !== clubCountry).length,
    [club.squad, clubCountry]
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSort = (field: keyof Player) => {
    soundEngine.playClick();
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'position' || field === 'detailedRole' || field === 'name');
    }
  };

  // Massagista / Fisioterapia: recover +20% condition for all players
  const handleRecoverCondition = () => {
    soundEngine.playClick();
    const updated = club.squad.map((p) => ({
      ...p,
      condition: Math.min(100, p.condition + 20),
    }));
    onUpdateSquad(updated);
  };

  const tacticalReport = useMemo(() => resolveClubLineupTacticalReport(club), [club]);

  const startersCount = club.squad.filter((p) => p.isStarter).length;
  const benchCount = club.squad.filter((p) => !p.isStarter && p.isSubstitute).length;

  const handleToggleBenchStatus = (player: Player) => {
    if (player.isStarter) return;
    if (player.isSubstitute) {
      soundEngine.playClick();
      onUpdateSquad(
        club.squad.map((p) => (p.id === player.id ? { ...p, isSubstitute: false } : p))
      );
      return;
    }

    if (benchCount >= 11) {
      soundEngine.playWhistle(false);
      return;
    }

    soundEngine.playClick();
    onUpdateSquad(
      club.squad.map((p) => (p.id === player.id ? { ...p, isSubstitute: true } : p))
    );
  };

  const loanPlayersCount = useMemo(
    () => club.squad.filter((p) => p.isLoan).length,
    [club.squad]
  );

  const activeBuyOptionsCount = useMemo(
    () => club.squad.filter((p) => p.isLoan && (p.loanBuyOptionFee || 0) > 0).length,
    [club.squad]
  );

  const openBuyoutModal = (player: Player) => {
    soundEngine.playClick();
    const defaultYears = player.age >= 35 ? 2 : player.age >= 32 ? 2 : player.age <= 22 ? 4 : 3;
    setBuyoutModalPlayer(player);
    setBuyoutContractYears(defaultYears);
    setBuyoutPermanentWage(resolvePlayerFullMonthlyWage(player));
    setBuyoutFeedback(null);
  };

  const handleConfirmBuyoutExercise = () => {
    if (!buyoutModalPlayer || !onTriggerBuyOption) return;
    soundEngine.playClick();
    const fee = buyoutModalPlayer.loanBuyOptionFee || 0;
    if (club.finances.balance < fee) {
      soundEngine.playWhistle(false);
      setBuyoutFeedback({
        ok: false,
        text: `Saldo insuficiente em caixa (${formatCurrency(club.finances.balance)}) para quitar o passe fixado de ${formatCurrency(fee)}.`,
      });
      return;
    }
    const ok = onTriggerBuyOption(buyoutModalPlayer, buyoutContractYears, buyoutPermanentWage);
    if (ok) {
      soundEngine.playFanfare();
      setBuyoutFeedback({
        ok: true,
        text: `Opção exercida! ${buyoutModalPlayer.name} assinou contrato definitivo de ${buyoutContractYears} ${buyoutContractYears === 1 ? 'ano' : 'anos'} com o ${club.name}!`,
      });
      setTimeout(() => {
        setBuyoutModalPlayer(null);
        setBuyoutFeedback(null);
      }, 1500);
    } else {
      soundEngine.playWhistle(false);
      setBuyoutFeedback({
        ok: false,
        text: 'Não foi possível concluir o exercício da opção de compra.',
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
    setClauseFeedback({ ok: res.accepted, text: res.message });
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

  const filteredSquad = club.squad.filter((p) => {
    if (filterLoansOnly && !p.isLoan) return false;
    const pNat = resolvePlayerNationality(p, clubCountry);
    if (filterNationality === 'FOREIGN' && pNat === clubCountry) return false;
    if (
      filterNationality !== 'ALL' &&
      filterNationality !== 'FOREIGN' &&
      pNat !== filterNationality
    ) {
      return false;
    }
    return matchesCanonicalPositionFilter(p, filterRole);
  });

  const sortedSquad = [...filteredSquad].sort((a, b) => {
    if (sortField === 'position' || sortField === 'detailedRole') {
      return comparePlayersByPosition(a, b, { ascending: sortAsc });
    }
    if (sortField === 'nationality') {
      const natA = resolvePlayerNationality(a, clubCountry);
      const natB = resolvePlayerNationality(b, clubCountry);
      return sortAsc ? natA.localeCompare(natB) : natB.localeCompare(natA);
    }
    if (sortField === 'loanBuyOptionFee') {
      const feeA = a.isLoan ? a.loanBuyOptionFee || 1 : -1;
      const feeB = b.isLoan ? b.loanBuyOptionFee || 1 : -1;
      return sortAsc ? feeA - feeB : feeB - feeA;
    }
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return comparePlayersByPosition(a, b);
  });

  return (
    <div className="space-y-4">
      {showReportPanel && (
        <SquadReportPanel
          club={club}
          compact
          selectedPositionFilter={filterRole}
          onSelectPositionFilter={(pos) => setFilterRole(pos)}
          onNavigateToMarket={onNavigateToMarket}
          onNavigateToScouting={onNavigateToScouting}
        />
      )}

      {oct2026SyncFeedback && (
        <div className="bg-sky-950/45 border border-sky-500/40 rounded-xl px-4 py-3 space-y-2 text-xs text-sky-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{oct2026SyncFeedback}</span>
            </div>
            {onDismissOct2026SyncFeedback && (
              <button
                type="button"
                onClick={onDismissOct2026SyncFeedback}
                className="text-slate-400 hover:text-white font-semibold cursor-pointer shrink-0"
              >
                Fechar
              </button>
            )}
          </div>
          {oct2026GroundingSources.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-sky-500/20 text-[11px] text-slate-300">
              <span className="text-slate-400 font-semibold">Fontes verificadas:</span>
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

      {/* Top Filter & Actions */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
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
                    ? 'bg-sky-400 text-slate-950 font-black shadow-md shadow-sky-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={filterNationality}
            onChange={(e) => {
              soundEngine.playClick();
              setFilterNationality(e.target.value);
            }}
            aria-label="Filtrar por nacionalidade"
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="ALL">Todas Nacionalidades ({club.squad.length})</option>
            {foreignPlayersCount > 0 && (
              <option value="FOREIGN">Estrangeiros ({foreignPlayersCount})</option>
            )}
            {squadNationalities.map(([nat, count]) => {
              const info = getNationalityInfo(nat);
              return (
                <option key={nat} value={nat}>
                  {info.flag} {info.country} ({count})
                </option>
              );
            })}
          </select>

          {loanPlayersCount > 0 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setFilterLoansOnly((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                filterLoansOnly
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                  : 'bg-slate-900 text-amber-300 border-amber-500/40 hover:bg-slate-800'
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>
                Emprestados ({loanPlayersCount}
                {activeBuyOptionsCount > 0 ? ` · ${activeBuyOptionsCount} c/ opção` : ''})
              </span>
            </button>
          )}

          <div className="text-xs text-slate-400 font-mono tabular-nums flex flex-wrap items-center gap-2 pl-1">
            <span>
              Elenco:{' '}
              <strong
                className={
                  club.squad.length >= MAX_SQUAD_SIZE ? 'text-amber-300' : 'text-emerald-300'
                }
              >
                {club.squad.length}/{MAX_SQUAD_SIZE}
              </strong>
            </span>
            <span>·</span>
            <span>Titulares: <strong className="text-sky-300">{startersCount}/11</strong></span>
            {(tacticalReport.wrongPositionCount > 0 || tacticalReport.criticalCount > 0) && (
              <>
                <span>·</span>
                <span
                  title="Titulares escalados fora da posição natural sofrem redução de Overall"
                  className="inline-flex items-center gap-1 text-rose-400 font-bold"
                >
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>
                    {tacticalReport.wrongPositionCount + tacticalReport.criticalCount} na pos. errada
                  </span>
                </span>
              </>
            )}
            <span>·</span>
            <span>Banco: <strong className="text-amber-300">{benchCount}/11</strong></span>
            {foreignPlayersCount > 0 && (
              <>
                <span>·</span>
                <span>Estrangeiros: <strong className="text-slate-200">{foreignPlayersCount}</strong></span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSyncOct2026SquadWithAI && (
            <button
              type="button"
              disabled={isSyncingOct2026Squad}
              onClick={() => {
                soundEngine.playClick();
                onSyncOct2026SquadWithAI();
              }}
              title={`Pesquisar com IA o elenco real atualizado de ${getCurrentRealWorldSyncPeriod().fullLabel} e completar até 30 jogadores`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-60 text-sky-300 border border-sky-400/40 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className={`w-3.5 h-3.5 text-sky-400 ${isSyncingOct2026Squad ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingOct2026Squad
                  ? `Pesquisando ${getCurrentRealWorldSyncPeriod().shortLabel}...`
                  : `Elenco ${getCurrentRealWorldSyncPeriod().shortLabel} IA (30)`}
              </span>
            </button>
          )}

          {onOpenOct2026GlobalSyncModal && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenOct2026GlobalSyncModal();
              }}
              title={`Atualizar elencos de todos os clubes do jogo com IA (${getCurrentRealWorldSyncPeriod().fullLabel})`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-500/40 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Todos os Times ({getCurrentRealWorldSyncPeriod().shortLabel})</span>
            </button>
          )}

          {onSyncNationalitiesWithAI && (
            <button
              type="button"
              disabled={isSyncingNationalities}
              onClick={() => {
                soundEngine.playClick();
                onSyncNationalitiesWithAI();
              }}
              title="Verificar nacionalidade real de cada jogador com Inteligência Artificial"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-emerald-300 border border-emerald-500/35 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingNationalities ? 'animate-spin' : ''}`} />
              <span>{isSyncingNationalities ? 'Verificando IA...' : 'Nacionalidades IA'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowReportPanel((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <PieChart className="w-3.5 h-3.5 text-sky-400" />
            <span>{showReportPanel ? 'Ocultar Relatório' : 'Relatório de Atletas'}</span>
          </button>

          {onOpenContracts && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenContracts();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileSignature className="w-3.5 h-3.5 text-amber-400" />
              <span>Contratos & Multas</span>
            </button>
          )}

          {onOpenManagement && (
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenManagement();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0"
            >
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vender / Emprestar</span>
            </button>
          )}

          <button
            onClick={handleRecoverCondition}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <BatteryCharging className="w-3.5 h-3.5" />
            <span>Sessão de Fisioterapia (+20% Físico)</span>
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-black text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    <span>Nome</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center cursor-pointer" onClick={() => handleSort('nationality')} title="Nacionalidade real do atleta">
                  Nac.
                </th>
                <th className="py-3 px-2 text-center cursor-pointer" onClick={() => handleSort('detailedRole')}>
                  Pos
                </th>
                <th className="py-3 px-2 text-center cursor-pointer" onClick={() => handleSort('overall')}>
                  <div className="flex items-center justify-center gap-1 text-sky-400">
                    <span>Força</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center cursor-pointer" onClick={() => handleSort('age')}>
                  Idade
                </th>
                <th className="py-3 px-3 text-center cursor-pointer" onClick={() => handleSort('condition')}>
                  Físico
                </th>
                <th className="py-3 px-2 text-center">Moral</th>
                <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort('wage')}>
                  Salário
                </th>
                <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort('marketValue')}>
                  Valor
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer whitespace-nowrap"
                  onClick={() => handleSort('loanBuyOptionFee')}
                  title="Gerenciar cláusulas ativas de Opção de Compra para atletas emprestados"
                >
                  <div className="flex items-center justify-end gap-1 text-amber-300">
                    <span>Opção de Compra</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center cursor-pointer" onClick={() => handleSort('goals')}>
                  Gols
                </th>
                <th className="py-3 px-2 text-center" title="Cartões no campeonato atual e temporada">
                  Cartões
                </th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center text-emerald-400">Venda / Empréstimo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {sortedSquad.map((player) => {
                const isInjured = player.injuryWeeks > 0 || Boolean(player.injuryDetails);
                const daysLeft = player.injuryDetails ? player.injuryDetails.remainingDays : player.injuryWeeks * 7;

                const isSuspended = upcomingCompetition 
                  ? isPlayerSuspendedInCompetition(player, upcomingCompetition)
                  : isPlayerSuspendedInCompetition(player);

                const activeSusp = upcomingCompetition
                  ? getPlayerSuspensionInCompetition(player, upcomingCompetition)
                  : player.suspensions?.find((s) => s.matchesRemaining > 0);

                const compYellows = upcomingCompetition
                  ? player.competitionYellowCards?.[upcomingCompetition] || 0
                  : player.yellowCards;

                const isPendurado = compYellows === 2;
                const starterFit = player.isStarter
                  ? tacticalReport.assignmentByPlayerId.get(player.id)?.fit
                  : undefined;
                const isWrongPos = Boolean(starterFit?.isWrongPosition);
                const isPenalized = Boolean(starterFit && starterFit.overallPenalty > 0);

                let statusBadge = (
                  <button
                    type="button"
                    disabled={benchCount >= 11}
                    onClick={() => handleToggleBenchStatus(player)}
                    title={
                      benchCount >= 11
                        ? 'Banco completo (11/11)'
                        : 'Clique para colocar no Banco de Reservas'
                    }
                    className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap transition-colors ${
                      benchCount >= 11
                        ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-900 hover:bg-amber-500/20 border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-amber-300 cursor-pointer'
                    }`}
                  >
                    {benchCount >= 11 ? 'Não Relacionado' : '+ Pôr no Banco'}
                  </button>
                );

                if (isInjured) {
                  statusBadge = (
                    <span
                      title={player.injuryDetails?.injuryType || 'No Departamento Médico'}
                      className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <HeartPulse className="w-3 h-3 text-rose-400 shrink-0 animate-pulse" />
                      <span>DM ({daysLeft}d)</span>
                    </span>
                  );
                } else if (isSuspended && activeSusp) {
                  const compMeta = COMPETITIONS_CATALOG[activeSusp.competition];
                  const compShort = compMeta ? compMeta.shortName : activeSusp.competition;
                  const reasonText = activeSusp.reason === 'RED_CARD' ? 'Vermelho' : '3º Amarelo';

                  statusBadge = (
                    <span
                      title={`Suspenso por 1 jogo no ${compMeta?.name || compShort} (${reasonText})`}
                      className="text-[10px] px-2 py-0.5 rounded bg-red-950/90 text-rose-300 border border-red-500/50 font-black inline-flex items-center gap-1 shadow-sm whitespace-nowrap"
                    >
                      <span>🟥</span>
                      <span>SUSP ({compShort})</span>
                    </span>
                  );
                } else if (player.isStarter) {
                  statusBadge = (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-black whitespace-nowrap">
                      Titular
                    </span>
                  );
                } else if (player.isSubstitute) {
                  statusBadge = (
                    <button
                      type="button"
                      onClick={() => handleToggleBenchStatus(player)}
                      title="Clique para retirar do Banco de Reservas"
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 hover:bg-rose-500/20 text-amber-300 hover:text-rose-300 border border-amber-500/30 hover:border-rose-500/40 font-bold whitespace-nowrap transition-colors cursor-pointer"
                    >
                      Reserva (Banco)
                    </button>
                  );
                }

                return (
                  <tr 
                    key={player.id} 
                    className={`transition-colors ${
                      isInjured 
                        ? 'bg-rose-950/10 hover:bg-rose-950/20' 
                        : isSuspended 
                        ? 'bg-red-950/15 hover:bg-red-950/25'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                      {player.squadNumber}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar
                          player={player}
                          club={club}
                          clubPrimaryColor={club.colors.primary}
                          clubTextColor={club.colors.text}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                inspection?.inspectPlayer(player, club);
                              }}
                              title={`Ver ficha completa de ${player.name}`}
                              className="font-bold text-white hover:text-sky-300 transition-colors text-sm text-left cursor-pointer"
                            >
                              {player.name}
                            </button>
                          {(() => {
                            const natInfo = getNationalityInfo(
                              resolvePlayerNationality(player, clubCountry)
                            );
                            return selecaoCalledUpIds.includes(player.id) ? (
                              <span
                                className="text-[11px] font-semibold text-amber-300 font-mono tabular-nums"
                                title={`Convocado para a Seleção (${natInfo.country})`}
                              >
                                · Seleção{player.internationalCaps ? ` (${player.internationalCaps}J)` : ''}
                              </span>
                            ) : (player.internationalCaps || 0) > 0 ? (
                              <span
                                className="text-[11px] text-slate-400 font-mono tabular-nums"
                                title={`Convocações acumuladas pela Seleção (${natInfo.country})`}
                              >
                                · {player.internationalCaps}J Seleção
                              </span>
                            ) : null;
                          })()}
                          {isInjured && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-mono font-bold border border-rose-500/30">
                              DM
                            </span>
                          )}
                          {isSuspended && (
                            <span className="px-1.5 py-0.2 rounded bg-red-950 text-rose-400 text-[9px] font-mono font-bold border border-red-500/40">
                              SUSP
                            </span>
                          )}
                          {player.isLoan && (
                            <span
                              className="text-[10px] font-mono font-bold text-amber-300 tabular-nums"
                              title={`Empréstimo (${formatLoanDurationLabel(player.loanRoundsRemaining, player.loanDurationMonths)} · Salário: ${player.loanWageContributionPct || 100}% pago pelo seu clube)`}
                            >
                              · EMP ({player.loanDurationMonths === 12 ? '1a' : '6m'} · {player.loanRoundsRemaining || 0}r)
                            </span>
                          )}
                        </div>
                        {player.isLoan && (
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 tabular-nums">
                            <span className="text-[10px] text-amber-300/90 font-medium">
                              Empréstimo {formatLoanDurationLabel(player.loanRoundsRemaining, player.loanDurationMonths)} · {player.loanWageContributionPct || 100}% salário
                              {player.loanBuyOptionFee ? ` · Passe fixo: ${formatCurrency(player.loanBuyOptionFee)}` : ' · Sem passe fixado'}
                            </span>
                            {player.loanBuyOptionFee && onTriggerBuyOption && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBuyoutModal(player);
                                }}
                                className="px-1.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] cursor-pointer"
                              >
                                Exercer Compra
                              </button>
                            )}
                          </div>
                        )}
                        {isInjured && player.injuryDetails && (
                          <span className="text-[10px] text-rose-400/90 font-medium block mt-0.5">
                            🏥 {player.injuryDetails.injuryType} • {player.injuryDetails.stage} ({daysLeft}d restantes)
                          </span>
                        )}
                        {!isInjured && isSuspended && activeSusp && (
                          <span className="text-[10px] text-rose-400 font-medium block mt-0.5">
                            🟥 Suspenso no {COMPETITIONS_CATALOG[activeSusp.competition]?.name || activeSusp.competition} ({activeSusp.reason === 'RED_CARD' ? 'Expulsão / Cartão Vermelho' : '3º Cartão Amarelo'})
                          </span>
                        )}
                        {!isInjured && !isSuspended && !player.isLoan && (
                          <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                            {player.specialSkill && (
                              <span className="text-sky-400/80">★ {player.specialSkill} · </span>
                            )}
                            <span
                              className={
                                player.retiringAtSeasonEnd
                                  ? 'text-slate-300 font-semibold'
                                  : player.preContractClubId
                                  ? 'text-rose-400 font-semibold'
                                  : player.contractYears <= 1
                                  ? 'text-amber-400 font-semibold'
                                  : 'text-slate-400'
                              }
                            >
                              {player.retiringAtSeasonEnd
                                ? 'Aposenta no fim do ano'
                                : player.preContractClubId
                                ? `Pré-contrato c/ ${player.preContractClubName}`
                                : player.contractYears <= 1
                                ? 'Último ano de contrato'
                                : `Contrato: ${player.contractYears} anos`}
                            </span>
                          </div>
                        )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      {(() => {
                        const natInfo = getNationalityInfo(
                          resolvePlayerNationality(player, clubCountry)
                        );
                        return (
                          <span
                            title={natInfo.country}
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-200 tabular-nums"
                          >
                            <span>{natInfo.flag}</span>
                            <span>{natInfo.code}</span>
                          </span>
                        );
                      })()}
                    </td>

                    <td className="py-2.5 px-2 text-center font-black">
                      {starterFit?.isOutOfPosition ? (
                        <div
                          title={starterFit.reasonText}
                          className="inline-flex flex-col items-center gap-0.5 leading-none"
                        >
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-black tabular-nums ${
                              isWrongPos
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                            <span>
                              {player.detailedRole} → {starterFit.assignedCode}
                            </span>
                          </span>
                          <span
                            className={`text-[9px] font-bold ${
                              isWrongPos ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            {starterFit.shortStatusLabel}
                          </span>
                        </div>
                      ) : (
                        (() => {
                          const versatility = getPlayerVersatilityProfile(player);
                          return (
                            <div
                              title={`Setor ${versatility.sectorName} · Sem perda de OVR: ${versatility.allZeroPenaltyCodes.join(' · ')}`}
                              className="inline-flex flex-col items-center leading-tight"
                            >
                              <span className="text-sky-300">
                                {player.detailedRole === 'LAT' &&
                                (player.pitchRoleCode === 'LD' || player.pitchRoleCode === 'LE')
                                  ? player.pitchRoleCode
                                  : player.detailedRole}
                              </span>
                              {versatility.compactSecondaryHint && (
                                <span className="text-[9px] font-mono font-semibold text-slate-400">
                                  {versatility.compactSecondaryHint}
                                </span>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </td>

                    <td className="py-2.5 px-2 text-center font-mono font-black text-sm tabular-nums">
                      {isPenalized && starterFit ? (
                        <div
                          title={starterFit.reasonText}
                          className="inline-flex flex-col items-center leading-none"
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded border font-black ${
                              isWrongPos
                                ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                                : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            {starterFit.effectiveOverall}{' '}
                            <span className="text-[10px] font-extrabold">
                              (-{starterFit.overallPenalty})
                            </span>
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            Base {player.overall}
                          </span>
                        </div>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-sky-950 font-bold text-sky-300">
                          {player.overall}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-2 text-center text-slate-300">
                      {player.age}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              player.condition > 80 ? 'bg-sky-400' : player.condition > 60 ? 'bg-amber-400' : 'bg-rose-500'
                            }`}
                            style={{ width: `${player.condition}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-300">{player.condition}%</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-center text-[11px] text-slate-300">
                      {player.morale}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {formatCurrency(player.wage)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-sky-300 font-semibold tabular-nums">
                      {formatCurrency(player.marketValue)}
                    </td>

                    <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                      {player.isLoan ? (
                        (() => {
                          const parentClub = allClubs.find(
                            (c) => c.id === player.loanParentClubId
                          );
                          return (
                            <div className="flex flex-col items-end gap-1">
                              {player.loanBuyOptionFee ? (
                                <>
                                  <div className="font-mono font-bold text-emerald-400 text-xs">
                                    {formatCurrency(player.loanBuyOptionFee)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {parentClub?.shortName || 'Cedente'} ·{' '}
                                    {player.loanDurationMonths === 12 ? '1 ano' : '6 meses'} (
                                    {player.loanRoundsRemaining || 0}r)
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {onTriggerBuyOption && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openBuyoutModal(player);
                                        }}
                                        className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] cursor-pointer transition-colors"
                                        title="Exercer cláusula de compra definitiva e definir anos de contrato"
                                      >
                                        Exercer
                                      </button>
                                    )}
                                    {onNegotiateLoanBuyOption && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openClauseModal(player);
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-semibold text-[10px] cursor-pointer transition-colors"
                                        title="Renegociar valor fixado junto ao clube detentor"
                                      >
                                        Renegociar
                                      </button>
                                    )}
                                    {onTerminateLoanEarly && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          soundEngine.playClick();
                                          onTerminateLoanEarly(player);
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-semibold text-[10px] cursor-pointer transition-colors"
                                        title="Devolver atleta antecipadamente ao clube de origem"
                                      >
                                        Devolver
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-[11px] text-slate-400 font-medium">
                                    Sem cláusula ({parentClub?.shortName || 'Cedente'})
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {onNegotiateLoanBuyOption && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openClauseModal(player);
                                        }}
                                        className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-[10px] cursor-pointer transition-colors"
                                        title="Negociar valor fixo de opção de compra com o clube de origem"
                                      >
                                        Fixar Opção
                                      </button>
                                    )}
                                    {onTerminateLoanEarly && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          soundEngine.playClick();
                                          onTerminateLoanEarly(player);
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-semibold text-[10px] cursor-pointer transition-colors"
                                      >
                                        Devolver
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()
                      ) : player.isListedForLoan && player.listedLoanBuyOptionFee ? (
                        <div className="text-[10px] text-amber-300 font-mono">
                          Fixado: {formatCurrency(player.listedLoanBuyOptionFee)}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-400 text-sm">
                      {player.goals}
                    </td>

                    <td className="py-2.5 px-2 text-center font-mono">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${
                            isPendurado
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse'
                              : compYellows > 0
                              ? 'bg-slate-900 text-slate-300 border border-slate-800'
                              : 'text-slate-600'
                          }`}
                          title={`${compYellows}/3 cartões amarelos ${isPendurado ? '(Pendurado - próximo amarelo suspende!)' : ''}`}
                        >
                          <span>🟨</span>
                          <span>{compYellows}/3</span>
                        </span>
                        {player.redCards > 0 && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-0.5"
                            title={`${player.redCards} cartão(ões) vermelho(s) na temporada`}
                          >
                            <span>🟥</span>
                            <span>{player.redCards}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {statusBadge}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.playClick();
                            setComparingPlayer(player);
                          }}
                          className="px-2 py-1 rounded-md bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-sky-300 border border-slate-800 text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          title="Comparar lado a lado com outro atleta do elenco"
                        >
                          <Scale className="w-3 h-3 shrink-0" />
                          <span>Comparar</span>
                        </button>
                        {player.isListedForSale ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenSaleModal) onOpenSaleModal(player);
                              else if (onOpenManagement) onOpenManagement();
                            }}
                            className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 text-[10px] font-extrabold transition-all cursor-pointer shadow-sm"
                            title="Gerenciar venda do atleta"
                          >
                            🏷️ À Venda
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenSaleModal) onOpenSaleModal(player);
                              else if (onOpenManagement) onOpenManagement();
                            }}
                            className="px-2 py-1 rounded-md bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 border border-slate-800 text-[10px] font-bold transition-all cursor-pointer"
                            title="Colocar à venda e ver propostas"
                          >
                            Vender
                          </button>
                        )}

                        {!player.isLoan && (
                          player.isListedForLoan ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenLoanModal) onOpenLoanModal(player);
                                else if (onOpenManagement) onOpenManagement();
                              }}
                              className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-[10px] font-extrabold transition-all cursor-pointer shadow-sm"
                              title="Gerenciar empréstimo do atleta"
                            >
                              🤝 P/ Empréstimo
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenLoanModal) onOpenLoanModal(player);
                                else if (onOpenManagement) onOpenManagement();
                              }}
                              className="px-2 py-1 rounded-md bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-800 text-[10px] font-bold transition-all cursor-pointer"
                              title="Emprestar jogador para rival"
                            >
                              Emprestar
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: EXERCER CLÁUSULA DE OPÇÃO DE COMPRA (ESCOLHER 1 A 5 ANOS DE CONTRATO) */}
      {buyoutModalPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl w-full max-w-md p-6 my-auto shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Exercício de Opção de Compra Fixada
                </p>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {buyoutModalPlayer.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  {buyoutModalPlayer.detailedRole} · OVR {buyoutModalPlayer.overall} ·{' '}
                  {buyoutModalPlayer.age} anos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuyoutModalPlayer(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2 tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Clube Detentor:</span>
                <strong className="text-white">
                  {allClubs.find((c) => c.id === buyoutModalPlayer.loanParentClubId)?.name ||
                    'Clube Cedente'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor Fixado em Contrato:</span>
                <strong className="text-emerald-400 font-mono text-sm">
                  {formatCurrency(buyoutModalPlayer.loanBuyOptionFee || 0)}
                </strong>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-800">
                <span className="text-slate-400">Saldo Disponível no {club.shortName}:</span>
                <strong className="text-sky-300 font-mono">
                  {formatCurrency(club.finances.balance)}
                </strong>
              </div>
            </div>

            <div className="space-y-3 text-xs tabular-nums">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tempo de Contrato Definitivo:</span>
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
                        title={
                          blockedByAge
                            ? 'Atletas com 35+ anos aceitam vínculos de no máximo 3 anos'
                            : `${yrs} ${yrs === 1 ? 'ano' : 'anos'} de contrato`
                        }
                        className={`py-2 rounded-lg border font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                          buyoutContractYears === yrs
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                  <span>
                    Folha anual: {formatCurrency(buyoutPermanentWage * 12)}
                  </span>
                  <span>
                    Pacote {buyoutContractYears}a:{' '}
                    {formatCurrency(
                      (buyoutModalPlayer.loanBuyOptionFee || 0) +
                        buyoutPermanentWage * 12 * buyoutContractYears
                    )}
                  </span>
                </div>
              </div>
            </div>

            {buyoutFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  buyoutFeedback.ok
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                }`}
              >
                {buyoutFeedback.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBuyoutModalPlayer(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBuyoutExercise}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer tabular-nums"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>
                  Comprar por {formatCurrency(buyoutModalPlayer.loanBuyOptionFee || 0)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FIXAR OU RENEGOCIAR OPÇÃO DE COMPRA COM O CLUBE DETENTOR */}
      {clauseModalPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 my-auto shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Negociar Cláusula de Passe Fixado
                </p>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {clauseModalPlayer.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  {clauseModalPlayer.detailedRole} · OVR {clauseModalPlayer.overall} · Mercado{' '}
                  {formatCurrency(clauseModalPlayer.marketValue)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClauseModalPlayer(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-xs space-y-1.5 tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Clube Detentor:</span>
                <strong className="text-white">
                  {allClubs.find((c) => c.id === clauseModalPlayer.loanParentClubId)?.name ||
                    'Clube Cedente'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cláusula Atual:</span>
                <strong className="text-amber-300 font-mono">
                  {clauseModalPlayer.loanBuyOptionFee
                    ? formatCurrency(clauseModalPlayer.loanBuyOptionFee)
                    : 'Sem valor fixado'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Prazo do Empréstimo:</span>
                <strong className="text-slate-200 font-mono">
                  {formatLoanDurationLabel(
                    clauseModalPlayer.loanRoundsRemaining,
                    clauseModalPlayer.loanDurationMonths
                  )}
                </strong>
              </div>
            </div>

            <div className="space-y-2.5 text-xs tabular-nums">
              <label className="font-bold text-slate-200 block">
                Propor Valor Fixado de Compra (R$):
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '95%', mult: 0.95 },
                  { label: '100%', mult: 1.0 },
                  { label: '115%', mult: 1.15 },
                  { label: '130%', mult: 1.3 },
                ].map((preset) => {
                  const val =
                    Math.round((clauseModalPlayer.marketValue * preset.mult) / 50000) * 50000;
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
                step={100000}
                min={100000}
                value={clauseProposedFee}
                onChange={(e) => setClauseProposedFee(Math.max(100000, Number(e.target.value)))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono text-sm focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-slate-400">
                Nenhum valor sai do caixa agora: o passe fica travado em contrato para compra definitiva quando desejar.
              </p>
            </div>

            {clauseFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold space-y-2 ${
                  clauseFeedback.ok
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                }`}
              >
                <div>{clauseFeedback.text}</div>
                {!clauseFeedback.ok && clauseSuggestedFee && (
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
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => handleSubmitClauseNegotiation()}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>Enviar Proposta de Passe Fixo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {comparingPlayer && (
        <PlayerComparisonModal
          userClub={club}
          targetPlayer={comparingPlayer}
          targetClub={club}
          onClose={() => setComparingPlayer(null)}
        />
      )}
    </div>
  );
};

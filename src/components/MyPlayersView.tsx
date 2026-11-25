import React, { useMemo, useState } from 'react';
import { Club, CompetitionType, MAX_SQUAD_SIZE, Player } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { PlayerAvatar } from './PlayerAvatar';
import { ScrollableTabStrip } from './ScrollableTabStrip';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import {
  getPlayerVersatilityProfile,
  resolveClubLineupTacticalReport,
} from '../utils/tacticalPositioningEngine';
import {
  CANONICAL_SECTOR_FILTER_OPTIONS,
  comparePlayersByPosition,
  getSectorGroupFromRole,
  matchesCanonicalPositionFilter,
} from '../utils/playerOrdering';
import {
  getNationalityInfo,
  resolvePlayerNationality,
} from '../utils/nationalityUtils';
import {
  isPlayerSuspendedInCompetition,
  getPlayerSuspensionInCompetition,
} from '../utils/suspensionEngine';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { formatLoanDurationLabel } from '../utils/loanEngine';
import {
  AlertTriangle,
  BatteryCharging,
  Dumbbell,
  FileSignature,
  Grid,
  HeartPulse,
  Layers,
  List,
  Scale,
  Search,
  Tag,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

interface MyPlayersViewProps {
  club: Club;
  upcomingCompetition?: CompetitionType;
  selecaoCalledUpIds?: string[];
  onUpdateSquad: (squad: Player[]) => void;
  onComparePlayer?: (player: Player, club?: Club | null) => void;
  onNavigateTab: (tab: string) => void;
  onNavigateSquadSubView: (
    subView: 'pitch' | 'table' | 'report' | 'contracts' | 'management'
  ) => void;
}

type StatusFilter =
  | 'ALL'
  | 'STARTERS'
  | 'BENCH'
  | 'RESERVES'
  | 'EXPIRING'
  | 'UNAVAILABLE';

type SortOption =
  | 'POS_ASC'
  | 'OVR_DESC'
  | 'VAL_DESC'
  | 'WAGE_DESC'
  | 'AGE_ASC'
  | 'GOALS_DESC';

const SECTOR_SECTIONS: ReadonlyArray<{
  id: 'GOL' | 'LAT' | 'ZAG' | 'MEIO' | 'ATA';
  title: string;
  subtitle: string;
  accentClass: string;
}> = [
  {
    id: 'GOL',
    title: 'Goleiros',
    subtitle: 'GOL',
    accentClass: 'text-amber-300 border-amber-500/30',
  },
  {
    id: 'LAT',
    title: 'Laterais',
    subtitle: 'LE · LD · ALA',
    accentClass: 'text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'ZAG',
    title: 'Zagueiros',
    subtitle: 'ZAG',
    accentClass: 'text-sky-300 border-sky-500/30',
  },
  {
    id: 'MEIO',
    title: 'Meio-campo',
    subtitle: 'VOL · ME · MC · MD · MEI',
    accentClass: 'text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'ATA',
    title: 'Atacantes',
    subtitle: 'PE · PD · CA (PE/PD atuam em ME/MD sem perda)',
    accentClass: 'text-rose-300 border-rose-500/30',
  },
];

export const MyPlayersView: React.FC<MyPlayersViewProps> = ({
  club,
  upcomingCompetition,
  selecaoCalledUpIds = [],
  onUpdateSquad,
  onComparePlayer,
  onNavigateTab,
  onNavigateSquadSubView,
}) => {
  const inspection = usePlayerInspection();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('POS_ASC');
  const [viewMode, setViewMode] = useState<'GROUPED' | 'TABLE'>('GROUPED');

  const clubCountry = club.country || 'Brasil';
  const tacticalReport = useMemo(() => resolveClubLineupTacticalReport(club), [club]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const startersCount = useMemo(
    () => club.squad.filter((p) => p.isStarter).length,
    [club.squad]
  );
  const benchCount = useMemo(
    () => club.squad.filter((p) => !p.isStarter && p.isSubstitute).length,
    [club.squad]
  );
  const monthlyPayroll = useMemo(
    () => club.squad.reduce((sum, p) => sum + (p.wage || 0), 0),
    [club.squad]
  );
  const totalSquadValue = useMemo(
    () => club.squad.reduce((sum, p) => sum + (p.marketValue || 0), 0),
    [club.squad]
  );
  const expiringOrDmCount = useMemo(
    () =>
      club.squad.filter((p) => {
        const injured = p.injuryWeeks > 0 || Boolean(p.injuryDetails);
        const suspended = upcomingCompetition
          ? isPlayerSuspendedInCompetition(p, upcomingCompetition)
          : isPlayerSuspendedInCompetition(p);
        const expiring =
          !p.isLoan && p.contractYears <= 1 && !p.retiringAtSeasonEnd && !p.preContractClubId;
        return injured || suspended || expiring;
      }).length,
    [club.squad, upcomingCompetition]
  );

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: club.squad.length,
      GOL: 0,
      LAT: 0,
      ZAG: 0,
      MEIO: 0,
      ATA: 0,
    };
    club.squad.forEach((p) => {
      const group = getSectorGroupFromRole(p.detailedRole);
      counts[group] = (counts[group] || 0) + 1;
    });
    return counts;
  }, [club.squad]);

  const filteredAndSortedPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = club.squad.filter((p) => {
      if (!matchesCanonicalPositionFilter(p, sectorFilter)) return false;

      const isInjured = p.injuryWeeks > 0 || Boolean(p.injuryDetails);
      const isSuspended = upcomingCompetition
        ? isPlayerSuspendedInCompetition(p, upcomingCompetition)
        : isPlayerSuspendedInCompetition(p);

      if (statusFilter === 'STARTERS' && !p.isStarter) return false;
      if (statusFilter === 'BENCH' && (p.isStarter || !p.isSubstitute)) return false;
      if (statusFilter === 'RESERVES' && (p.isStarter || p.isSubstitute)) return false;
      if (
        statusFilter === 'EXPIRING' &&
        (p.isLoan || p.contractYears > 1 || p.retiringAtSeasonEnd || Boolean(p.preContractClubId))
      ) {
        return false;
      }
      if (statusFilter === 'UNAVAILABLE' && !isInjured && !isSuspended) return false;

      if (q) {
        const nat = resolvePlayerNationality(p, clubCountry).toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesRole = p.detailedRole.toLowerCase().includes(q);
        const matchesSkill = (p.specialSkill || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !nat.includes(q) && !matchesSkill) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'OVR_DESC':
          return b.overall - a.overall || comparePlayersByPosition(a, b);
        case 'VAL_DESC':
          return b.marketValue - a.marketValue || b.overall - a.overall;
        case 'WAGE_DESC':
          return b.wage - a.wage || b.overall - a.overall;
        case 'AGE_ASC':
          return a.age - b.age || b.overall - a.overall;
        case 'GOALS_DESC':
          return (b.goals || 0) - (a.goals || 0) || b.overall - a.overall;
        case 'POS_ASC':
        default:
          return comparePlayersByPosition(a, b);
      }
    });
  }, [club.squad, clubCountry, sectorFilter, statusFilter, searchQuery, sortBy, upcomingCompetition]);

  const groupedSections = useMemo(() => {
    return SECTOR_SECTIONS.map((sec) => ({
      ...sec,
      players: filteredAndSortedPlayers.filter(
        (p) => getSectorGroupFromRole(p.detailedRole) === sec.id
      ),
    })).filter((sec) => sec.players.length > 0);
  }, [filteredAndSortedPlayers]);

  const handleToggleBench = (player: Player) => {
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

  const handleRecoverPhysio = () => {
    soundEngine.playClick();
    onUpdateSquad(
      club.squad.map((p) => ({
        ...p,
        condition: Math.min(100, p.condition + 20),
      }))
    );
  };

  const renderPlayerRow = (player: Player) => {
    const isInjured = player.injuryWeeks > 0 || Boolean(player.injuryDetails);
    const daysLeft = player.injuryDetails
      ? player.injuryDetails.remainingDays
      : player.injuryWeeks * 7;
    const isSuspended = upcomingCompetition
      ? isPlayerSuspendedInCompetition(player, upcomingCompetition)
      : isPlayerSuspendedInCompetition(player);
    const activeSusp = upcomingCompetition
      ? getPlayerSuspensionInCompetition(player, upcomingCompetition)
      : player.suspensions?.find((s) => s.matchesRemaining > 0);
    const natInfo = getNationalityInfo(resolvePlayerNationality(player, clubCountry), clubCountry);
    const starterFit = player.isStarter
      ? tacticalReport.assignmentByPlayerId.get(player.id)?.fit
      : undefined;
    const isCalledUp = selecaoCalledUpIds.includes(player.id);
    const isExpiring =
      !player.isLoan &&
      player.contractYears <= 1 &&
      !player.retiringAtSeasonEnd &&
      !player.preContractClubId;

    return (
      <tr
        key={player.id}
        className={`transition-colors ${
          isInjured
            ? 'bg-rose-950/10 hover:bg-rose-950/20'
            : isSuspended
            ? 'bg-red-950/10 hover:bg-red-950/20'
            : 'hover:bg-slate-900/60'
        }`}
      >
        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 tabular-nums">
          {player.squadNumber}
        </td>

        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2.5 min-w-0">
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
                  className="font-bold text-white hover:text-sky-300 transition-colors text-left text-sm truncate cursor-pointer"
                  title={`Ver ficha completa de ${player.name}`}
                >
                  {player.name}
                </button>
                {isCalledUp && (
                  <span className="text-[10px] font-semibold text-amber-300 font-mono tabular-nums">
                    · Seleção
                  </span>
                )}
                {player.isLoan && (
                  <span className="text-[10px] font-mono font-bold text-cyan-300 tabular-nums">
                    · EMP ({formatLoanDurationLabel(player.loanRoundsRemaining, player.loanDurationMonths)})
                  </span>
                )}
                {isInjured && (
                  <span className="text-[10px] font-mono font-bold text-rose-400 inline-flex items-center gap-0.5 tabular-nums">
                    <HeartPulse className="w-3 h-3" />
                    DM {daysLeft}d
                  </span>
                )}
                {isSuspended && activeSusp && (
                  <span className="text-[10px] font-mono font-bold text-rose-400">
                    SUSP ({COMPETITIONS_CATALOG[activeSusp.competition]?.shortName || activeSusp.competition})
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 tabular-nums">
                <span title={natInfo.country}>
                  {natInfo.flag} {natInfo.code}
                </span>
                {player.detailedRole === 'ATA' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-300" title="Atacantes PE/PD atuam em ME/MD sem perda de OVR">
                      PE/PD · ME/MD
                    </span>
                  </>
                )}
                {player.specialSkill && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-sky-400/80">{player.specialSkill}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </td>

        <td className="py-2.5 px-2 text-center whitespace-nowrap">
          {starterFit?.isOutOfPosition ? (
            <span
              title={starterFit.reasonText}
              className={`font-mono font-black text-xs inline-flex items-center gap-1 ${
                starterFit.isWrongPosition ? 'text-rose-400' : 'text-amber-300'
              }`}
            >
              <span>
                {player.detailedRole}→{starterFit.assignedCode}
              </span>
            </span>
          ) : (
            (() => {
              const versatility = getPlayerVersatilityProfile(player);
              return (
                <div
                  title={`Setor ${versatility.sectorName} · Sem perda de OVR: ${versatility.allZeroPenaltyCodes.join(' · ')}`}
                  className="inline-flex flex-col items-center leading-tight"
                >
                  <span className="font-mono font-bold text-sky-400 text-xs">
                    {player.detailedRole}
                  </span>
                  {versatility.compactSecondaryHint && (
                    <span className="text-[9px] font-mono text-slate-400">
                      {versatility.compactSecondaryHint}
                    </span>
                  )}
                </div>
              );
            })()
          )}
        </td>

        <td className="py-2.5 px-2 text-center font-mono tabular-nums whitespace-nowrap">
          {starterFit && starterFit.overallPenalty > 0 ? (
            <span
              className={`font-black text-sm ${
                starterFit.isWrongPosition ? 'text-rose-400' : 'text-amber-300'
              }`}
              title={`Original ${starterFit.baseOverall} → Efetivo ${starterFit.effectiveOverall}`}
            >
              {starterFit.effectiveOverall}
              <span className="text-[10px] ml-0.5">(-{starterFit.overallPenalty})</span>
            </span>
          ) : (
            <span className="font-black text-sm text-white">{player.overall}</span>
          )}
        </td>

        <td className="py-2.5 px-2 text-center font-mono text-slate-300 tabular-nums">
          {player.age}a
        </td>

        <td className="py-2.5 px-3 text-center tabular-nums">
          <div className="inline-flex items-center gap-1.5">
            <div className="w-10 h-1.5 bg-slate-900 rounded-full overflow-hidden hidden sm:block">
              <div
                className={`h-full ${
                  player.condition >= 80
                    ? 'bg-emerald-400'
                    : player.condition >= 60
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, player.condition))}%` }}
              />
            </div>
            <span
              className={`font-mono font-bold text-[11px] ${
                player.condition >= 80
                  ? 'text-emerald-400'
                  : player.condition >= 60
                  ? 'text-amber-300'
                  : 'text-rose-400'
              }`}
            >
              {player.condition}%
            </span>
          </div>
        </td>

        <td className="py-2.5 px-2 text-center font-mono tabular-nums whitespace-nowrap">
          {player.isLoan ? (
            <span className="text-cyan-300 text-[11px]">
              {player.loanRoundsRemaining || 0}r
            </span>
          ) : (
            <span
              className={`text-xs font-bold ${
                isExpiring ? 'text-amber-400' : 'text-slate-300'
              }`}
            >
              {player.contractYears}a
            </span>
          )}
        </td>

        <td className="py-2.5 px-3 text-right font-mono text-slate-200 tabular-nums whitespace-nowrap">
          {formatCurrency(player.wage)}
        </td>

        <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold tabular-nums whitespace-nowrap">
          {formatCurrency(player.marketValue)}
        </td>

        <td className="py-2.5 px-2 text-center font-mono text-slate-300 tabular-nums whitespace-nowrap">
          {player.goals || 0}G / {player.assists || 0}A
        </td>

        <td className="py-2.5 px-3 text-center whitespace-nowrap">
          {player.isStarter ? (
            <span className="text-[11px] font-bold text-sky-300">Titular</span>
          ) : isInjured || isSuspended ? (
            <span className="text-[11px] font-bold text-rose-400">
              {isInjured ? 'DM' : 'Suspenso'}
            </span>
          ) : (
            <button
              type="button"
              disabled={!player.isSubstitute && benchCount >= 11}
              onClick={() => handleToggleBench(player)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                player.isSubstitute
                  ? 'bg-amber-500/15 hover:bg-rose-500/15 border-amber-500/40 text-amber-300 hover:text-rose-300'
                  : benchCount >= 11
                  ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-sky-500/15 border-slate-700 hover:border-sky-500/40 text-slate-300 hover:text-sky-300'
              }`}
              title={
                player.isSubstitute
                  ? 'Retirar do banco'
                  : benchCount >= 11
                  ? 'Banco completo (11/11)'
                  : 'Colocar no banco de reservas'
              }
            >
              {player.isSubstitute ? (
                <>
                  <UserMinus className="w-3 h-3" />
                  <span>Banco</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3" />
                  <span>+ Banco</span>
                </>
              )}
            </button>
          )}
        </td>

        <td className="py-2.5 px-3 text-right whitespace-nowrap">
          <div className="inline-flex items-center gap-1.5">
            {onComparePlayer && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onComparePlayer(player, club);
                }}
                title={`Comparar ${player.name}`}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                inspection?.inspectPlayer(player, club);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-sky-500 hover:text-slate-950 border border-slate-700 text-sky-300 text-[11px] font-bold transition-colors cursor-pointer"
            >
              Ficha
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderTableHeader = () => (
    <thead className="bg-black/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
      <tr>
        <th className="py-2.5 px-3 w-10 text-center">#</th>
        <th className="py-2.5 px-3">Jogador</th>
        <th className="py-2.5 px-2 text-center">Pos</th>
        <th className="py-2.5 px-2 text-center">OVR</th>
        <th className="py-2.5 px-2 text-center">Idade</th>
        <th className="py-2.5 px-3 text-center">Físico</th>
        <th className="py-2.5 px-2 text-center">Contr.</th>
        <th className="py-2.5 px-3 text-right">Salário</th>
        <th className="py-2.5 px-3 text-right">Valor</th>
        <th className="py-2.5 px-2 text-center">G / A</th>
        <th className="py-2.5 px-3 text-center">Relação</th>
        <th className="py-2.5 px-3 text-right">Ações</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-4">
      {/* Top Header & Quick Navigation Actions */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400 shrink-0" />
              <span>Meus Jogadores · Elenco Organizado</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ordem tática padrão (Goleiro → Laterais → Zagueiros → Meio-campo → Atacantes). Clique no nome ou foto de qualquer jogador para abrir a ficha completa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateSquadSubView('pitch');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Campo Tático</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateSquadSubView('contracts');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Contratos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateSquadSubView('management');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Vender / Emprestar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigateTab('training');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Dumbbell className="w-3.5 h-3.5 text-sky-400" />
              <span>Treinos</span>
            </button>
            <button
              type="button"
              onClick={handleRecoverPhysio}
              className="px-3 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <BatteryCharging className="w-3.5 h-3.5" />
              <span>Fisioterapia (+20%)</span>
            </button>
          </div>
        </div>

        {/* 6-Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-800/80 tabular-nums">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2.5">
            <span className="text-[11px] text-slate-400 block">Elenco Total</span>
            <strong
              className={`text-base font-mono font-black ${
                club.squad.length >= MAX_SQUAD_SIZE ? 'text-amber-300' : 'text-white'
              }`}
            >
              {club.squad.length}/{MAX_SQUAD_SIZE}
            </strong>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2.5">
            <span className="text-[11px] text-slate-400 block">Titulares</span>
            <strong className="text-base font-mono font-black text-sky-400">
              {startersCount}/11
            </strong>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2.5">
            <span className="text-[11px] text-slate-400 block">Banco Reservas</span>
            <strong className="text-base font-mono font-black text-amber-300">
              {benchCount}/11
            </strong>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2.5">
            <span className="text-[11px] text-slate-400 block">Folha Mensal</span>
            <strong className="text-sm font-mono font-black text-rose-400 block mt-0.5 truncate">
              {formatCurrency(monthlyPayroll)}
            </strong>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2.5">
            <span className="text-[11px] text-slate-400 block">Valor do Elenco</span>
            <strong className="text-sm font-mono font-black text-emerald-400 block mt-0.5 truncate">
              {formatCurrency(totalSquadValue)}
            </strong>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2.5">
            <span className="text-[11px] text-slate-400 block">Atenção (Contratos / DM)</span>
            <strong
              className={`text-base font-mono font-black inline-flex items-center gap-1 ${
                expiringOrDmCount > 0 ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {expiringOrDmCount > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{expiringOrDmCount}</span>
            </strong>
          </div>
        </div>
      </div>

      {/* Filter, Search, Sort & View Toolbar */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Canonical Sector Pills */}
          <ScrollableTabStrip
            activeKey={sectorFilter}
            ariaLabel="Filtros de setor do elenco"
            className="w-full lg:w-auto lg:flex-1 max-w-full"
            innerClassName="flex items-center gap-1.5"
          >
            {CANONICAL_SECTOR_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-tab-active={sectorFilter === opt.id ? 'true' : undefined}
                onClick={() => {
                  soundEngine.playClick();
                  setSectorFilter(opt.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  sectorFilter === opt.id
                    ? 'bg-sky-400 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {opt.label} ({sectorCounts[opt.id] ?? 0})
              </button>
            ))}
          </ScrollableTabStrip>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setViewMode('GROUPED');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'GROUPED'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Agrupado por Posição</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setViewMode('TABLE');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'TABLE'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista Única</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar jogador, posição, habilidade ou país..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                soundEngine.playClick();
                setStatusFilter(e.target.value as StatusFilter);
              }}
              aria-label="Filtrar por situação"
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="ALL">Situação: Todos</option>
              <option value="STARTERS">Titulares (11)</option>
              <option value="BENCH">Banco de Reservas</option>
              <option value="RESERVES">Não Relacionados</option>
              <option value="EXPIRING">Último Ano de Contrato</option>
              <option value="UNAVAILABLE">DM / Suspensos</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                soundEngine.playClick();
                setSortBy(e.target.value as SortOption);
              }}
              aria-label="Ordenar jogadores"
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="POS_ASC">Ordenar: Posição (GOL → ATA)</option>
              <option value="OVR_DESC">Ordenar: Maior OVR</option>
              <option value="VAL_DESC">Ordenar: Maior Valor</option>
              <option value="WAGE_DESC">Ordenar: Maior Salário</option>
              <option value="AGE_ASC">Ordenar: Mais Jovens</option>
              <option value="GOALS_DESC">Ordenar: Artilharia</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players List / Grouped Sections */}
      {filteredAndSortedPlayers.length === 0 ? (
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-300">
            Nenhum jogador encontrado com os filtros atuais.
          </p>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setSearchQuery('');
              setSectorFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      ) : viewMode === 'GROUPED' ? (
        <div className="space-y-4">
          {groupedSections.map((section) => (
            <section
              key={section.id}
              className="bg-[#0b1220] border border-slate-800 rounded-2xl overflow-hidden shadow-lg"
            >
              <div
                className={`px-4 py-2.5 bg-slate-950/80 border-b ${section.accentClass} flex items-center justify-between gap-2`}
              >
                <div className="flex items-center gap-2.5">
                  <h3 className={`text-sm font-black ${section.accentClass.split(' ')[0]}`}>
                    {section.title}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {section.subtitle}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-300 tabular-nums">
                  {section.players.length}{' '}
                  {section.players.length === 1 ? 'atleta' : 'atletas'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-xs">
                  {renderTableHeader()}
                  <tbody className="divide-y divide-slate-800/70">
                    {section.players.map((p) => renderPlayerRow(p))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              {renderTableHeader()}
              <tbody className="divide-y divide-slate-800/70">
                {filteredAndSortedPlayers.map((p) => renderPlayerRow(p))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

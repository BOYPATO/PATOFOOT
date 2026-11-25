import React, { useEffect, useMemo } from 'react';
import { Club, CompetitionType, Player } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { PlayerAvatar } from './PlayerAvatar';
import { ClubCrest } from './ClubCrest';
import {
  getNationalityInfo,
  resolvePlayerNationality,
} from '../utils/nationalityUtils';
import { computeDefaultReleaseClause } from '../utils/contractLifecycleEngine';
import {
  formatLoanDurationLabel,
  resolvePlayerFullMonthlyWage,
} from '../utils/loanEngine';
import {
  isPlayerSuspendedInCompetition,
  getPlayerSuspensionInCompetition,
} from '../utils/suspensionEngine';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import {
  getPlayerVersatilityProfile,
  resolveClubLineupTacticalReport,
} from '../utils/tacticalPositioningEngine';
import { ROLE_FULL_LABEL_PT } from '../utils/playerOrdering';
import {
  AlertTriangle,
  Award,
  BatteryCharging,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Calendar,
  Dumbbell,
  FileSignature,
  Footprints,
  Globe,
  Handshake,
  HeartPulse,
  Scale,
  Shield,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface PlayerDetailsModalProps {
  player: Player;
  club?: Club | null;
  userClub: Club;
  allClubs: Club[];
  upcomingCompetition?: CompetitionType;
  isCalledUpToSelecao?: boolean;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (playerId: string) => void;
  onComparePlayer?: (player: Player, club?: Club | null) => void;
  onToggleBench?: (player: Player) => void;
  onNavigateUserArea?: (area: 'pitch' | 'contracts' | 'training' | 'management') => void;
  onOpenMarketForPlayer?: (player: Player) => void;
  onInspectClub?: (clubId: string) => void;
  onClose: () => void;
}

export const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  player,
  club,
  userClub,
  allClubs,
  upcomingCompetition,
  isCalledUpToSelecao = false,
  isWatchlisted = false,
  onToggleWatchlist,
  onComparePlayer,
  onToggleBench,
  onNavigateUserArea,
  onOpenMarketForPlayer,
  onInspectClub,
  onClose,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const isUserPlayer = useMemo(() => {
    if (club?.id === userClub.id) return true;
    return userClub.squad.some((p) => p.id === player.id);
  }, [club?.id, userClub.id, userClub.squad, player.id]);

  // Always resolve freshest copy of player if in userClub or club
  const livePlayer = useMemo(() => {
    if (isUserPlayer) {
      return userClub.squad.find((p) => p.id === player.id) || player;
    }
    if (club) {
      return club.squad.find((p) => p.id === player.id) || player;
    }
    return player;
  }, [isUserPlayer, userClub.squad, club, player]);

  const effectiveClub = useMemo(() => {
    if (club) return club;
    if (isUserPlayer) return userClub;
    return allClubs.find((c) => c.squad.some((p) => p.id === livePlayer.id)) || null;
  }, [club, isUserPlayer, userClub, allClubs, livePlayer.id]);

  const parentLoanClub = useMemo(() => {
    if (!livePlayer.isLoan || !livePlayer.loanParentClubId) return null;
    return allClubs.find((c) => c.id === livePlayer.loanParentClubId) || null;
  }, [livePlayer.isLoan, livePlayer.loanParentClubId, allClubs]);

  const tacticalFit = useMemo(() => {
    if (!isUserPlayer || !livePlayer.isStarter) return null;
    const report = resolveClubLineupTacticalReport(userClub);
    return report.assignmentByPlayerId.get(livePlayer.id)?.fit || null;
  }, [isUserPlayer, livePlayer.isStarter, livePlayer.id, userClub]);

  const clubCountry = effectiveClub?.country || userClub.country || 'Brasil';
  const nationality = resolvePlayerNationality(livePlayer, clubCountry);
  const natInfo = getNationalityInfo(nationality, clubCountry);

  const isInjured = livePlayer.injuryWeeks > 0 || Boolean(livePlayer.injuryDetails);
  const injuryDays = livePlayer.injuryDetails
    ? livePlayer.injuryDetails.remainingDays
    : livePlayer.injuryWeeks * 7;

  const isSuspended = upcomingCompetition
    ? isPlayerSuspendedInCompetition(livePlayer, upcomingCompetition)
    : isPlayerSuspendedInCompetition(livePlayer);
  const activeSuspension = upcomingCompetition
    ? getPlayerSuspensionInCompetition(livePlayer, upcomingCompetition)
    : livePlayer.suspensions?.find((s) => s.matchesRemaining > 0);

  const benchCount = userClub.squad.filter((p) => !p.isStarter && p.isSubstitute).length;
  const canToggleBench =
    isUserPlayer &&
    !livePlayer.isStarter &&
    !isInjured &&
    !isSuspended &&
    (livePlayer.isSubstitute || benchCount < 11);

  const releaseClause =
    livePlayer.releaseClause || computeDefaultReleaseClause(livePlayer);
  const potential = Math.max(livePlayer.overall, livePlayer.potential || livePlayer.overall);
  const overallEvolution =
    typeof livePlayer.seasonStartOverall === 'number'
      ? livePlayer.overall - livePlayer.seasonStartOverall
      : 0;
  const fullWage = livePlayer.isLoan
    ? resolvePlayerFullMonthlyWage(livePlayer)
    : livePlayer.wage;

  const roleLabel = ROLE_FULL_LABEL_PT[livePlayer.detailedRole] || livePlayer.detailedRole;
  const versatilityProfile = useMemo(
    () => getPlayerVersatilityProfile(livePlayer),
    [livePlayer.overall, livePlayer.detailedRole, livePlayer.secondaryRoles]
  );
  const compatibleFunctionsText = useMemo(() => {
    const items: string[] = [
      `Setor ${versatilityProfile.sectorName}: ${versatilityProfile.allZeroPenaltyCodes.join(' · ')} (0 perda de OVR)`,
    ];
    if (versatilityProfile.learnedRoles.length > 0) {
      items.push(`Treinadas no CT: ${versatilityProfile.learnedRoles.join(', ')}`);
    }
    return items.join(' · ');
  }, [versatilityProfile]);

  const contractStatusLabel = livePlayer.isLoan
    ? `Empréstimo (${formatLoanDurationLabel(livePlayer.loanRoundsRemaining, livePlayer.loanDurationMonths)})`
    : livePlayer.retiringAtSeasonEnd
    ? 'Aposentadoria ao fim da temporada'
    : livePlayer.preContractClubId
    ? `Pré-contrato assinado com ${livePlayer.preContractClubName || 'outro clube'}`
    : livePlayer.contractYears <= 1
    ? '1 ano restante (Último ano · Risco Bosman)'
    : `${livePlayer.contractYears} anos restantes`;

  const statusText = isInjured
    ? `DM (${injuryDays}d)`
    : isSuspended
    ? `Suspenso (${activeSuspension ? COMPETITIONS_CATALOG[activeSuspension.competition]?.shortName || activeSuspension.competition : 'Jogo'})`
    : livePlayer.isStarter
    ? 'Titular'
    : livePlayer.isSubstitute
    ? 'Reserva (Banco)'
    : isUserPlayer
    ? 'Não Relacionado'
    : effectiveClub
    ? 'No Elenco'
    : 'Livre no Mercado';

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0b1220] border border-slate-800 rounded-2xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Profile Band */}
        <div className="shrink-0 p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-br from-slate-900/90 via-[#0b1220] to-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative shrink-0">
                <PlayerAvatar
                  player={livePlayer}
                  clubPrimaryColor={effectiveClub?.colors.primary}
                  clubTextColor={effectiveClub?.colors.text}
                  size="xl"
                  disableInspection
                  className="ring-2 ring-slate-700"
                />
                {livePlayer.squadNumber > 0 && (
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-slate-950 border border-slate-700 font-mono text-[10px] font-black text-sky-300 tabular-nums shadow">
                    #{livePlayer.squadNumber}
                  </span>
                )}
              </div>

              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/40 text-sky-300 font-mono font-black text-xs">
                    {livePlayer.detailedRole}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">{roleLabel}</span>
                  {isCalledUpToSelecao && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                      Seleção
                    </span>
                  )}
                  {livePlayer.isLoan && (
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold">
                      Emprestado
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight truncate">
                  {livePlayer.name}
                </h2>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300">
                  {effectiveClub ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isUserPlayer && onInspectClub) {
                          soundEngine.playClick();
                          onClose();
                          onInspectClub(effectiveClub.id);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 ${
                        !isUserPlayer && onInspectClub
                          ? 'hover:text-sky-300 cursor-pointer transition-colors'
                          : 'cursor-default'
                      }`}
                    >
                      <ClubCrest club={effectiveClub} size="xs" rounded="md" />
                      <span className="font-semibold text-white">
                        {effectiveClub.name}
                        {isUserPlayer ? ' (Seu Clube)' : ''}
                      </span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Livre no Mercado</span>
                    </span>
                  )}
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <span>{natInfo.flag}</span>
                    <span>{natInfo.country}</span>
                  </span>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {livePlayer.age} anos
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 shrink-0">
              {/* Overall & Potential Box */}
              <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 tabular-nums text-center">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    OVR
                  </span>
                  <span
                    className={`text-xl font-mono font-black ${
                      tacticalFit && tacticalFit.overallPenalty > 0
                        ? tacticalFit.isWrongPosition
                          ? 'text-rose-400'
                          : 'text-amber-300'
                        : 'text-sky-400'
                    }`}
                  >
                    {tacticalFit ? tacticalFit.effectiveOverall : livePlayer.overall}
                  </span>
                  {tacticalFit && tacticalFit.overallPenalty > 0 && (
                    <span className="block text-[9px] text-rose-400 font-bold">
                      Base {livePlayer.overall}
                    </span>
                  )}
                </div>
                <div className="h-8 w-px bg-slate-800" aria-hidden="true" />
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    POT
                  </span>
                  <span className="text-xl font-mono font-black text-emerald-400">
                    {potential}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                }}
                title="Fechar ficha (Esc)"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tactical Fit or Compatibility Callout */}
          {tacticalFit && tacticalFit.isOutOfPosition ? (
            <div
              className={`mt-3 px-3 py-2 rounded-xl border text-xs flex items-center gap-2 tabular-nums ${
                tacticalFit.isWrongPosition
                  ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{tacticalFit.reasonText}</span>
            </div>
          ) : compatibleFunctionsText ? (
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                <strong className="text-slate-200">Versatilidade Tática:</strong>{' '}
                {compatibleFunctionsText}
              </span>
            </div>
          ) : null}
        </div>

        {/* Scrollable Details Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* 0. Multi-Position Sector Versatility & Effective OVR Matrix */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span>Posições no Setor &amp; Rendimento por Função</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-2 py-0.5 font-bold">
                Sem perda: {versatilityProfile.allZeroPenaltyCodes.join(' · ')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 tabular-nums">
              {versatilityProfile.sectorFitPreviews.map((item) => {
                const isZero = item.penalty === 0;
                const isWrong =
                  item.status === 'WRONG_POSITION' || item.status === 'CRITICAL_MISMATCH';
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 ${
                      isZero
                        ? 'bg-emerald-950/35 border-emerald-500/35'
                        : isWrong
                        ? 'bg-rose-950/30 border-rose-500/30'
                        : 'bg-amber-950/30 border-amber-500/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 text-[11px] truncate">
                        {item.label}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {item.codes}
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <div
                        className={`text-sm font-black leading-none ${
                          isZero
                            ? 'text-emerald-300'
                            : isWrong
                            ? 'text-rose-300'
                            : 'text-amber-300'
                        }`}
                      >
                        {item.effectiveOverall}
                      </div>
                      <div
                        className={`text-[9px] font-bold mt-0.5 ${
                          isZero
                            ? 'text-emerald-400/90'
                            : isWrong
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {isZero ? '0 perda' : `-${item.penalty} OVR`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1. Financial & Contract Highlights */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <FileSignature className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contrato & Valores</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Valor de Mercado</span>
                <strong className="text-sm font-mono font-black text-emerald-400 block mt-0.5">
                  {effectiveClub ? formatCurrency(livePlayer.marketValue) : 'Livre (R$ 0)'}
                </strong>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Salário Mensal</span>
                <strong className="text-sm font-mono font-black text-white block mt-0.5">
                  {formatCurrency(livePlayer.wage)}
                </strong>
                {livePlayer.isLoan && (
                  <span className="text-[10px] text-amber-300 block mt-0.5">
                    {livePlayer.loanWageContributionPct || 100}% de {formatCurrency(fullWage)}
                  </span>
                )}
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Tempo de Contrato</span>
                <strong
                  className={`text-sm font-mono font-black block mt-0.5 ${
                    !livePlayer.isLoan && livePlayer.contractYears <= 1
                      ? 'text-amber-300'
                      : 'text-sky-300'
                  }`}
                >
                  {livePlayer.isLoan
                    ? `${livePlayer.loanRoundsRemaining || 0} rodadas`
                    : `${livePlayer.contractYears} ${
                        livePlayer.contractYears === 1 ? 'ano' : 'anos'
                      }`}
                </strong>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Multa Rescisória</span>
                <strong className="text-sm font-mono font-black text-slate-200 block mt-0.5">
                  {effectiveClub ? formatCurrency(releaseClause) : 'Sem Multa'}
                </strong>
              </div>
            </div>

            <div className="mt-2.5 bg-slate-900/50 border border-slate-800/80 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>
                  <strong className="text-slate-200">Vínculo:</strong> {contractStatusLabel}
                </span>
              </div>
              {livePlayer.isLoan && (
                <span className="text-amber-300 font-semibold tabular-nums">
                  Clube de origem: {parentLoanClub?.name || 'Clube Cedente'}
                  {livePlayer.loanBuyOptionFee
                    ? ` · Opção de compra: ${formatCurrency(livePlayer.loanBuyOptionFee)}`
                    : ''}
                </span>
              )}
            </div>
          </div>

          {/* 2. Profile, Condition & Status */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Perfil Atlético & Situação</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 tabular-nums">
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Footprints className="w-3 h-3 text-slate-400" />
                  <span>Pé Preferido</span>
                </span>
                <strong className="text-white font-bold block mt-1">
                  {livePlayer.preferredFoot}
                </strong>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Habilidade Especial</span>
                </span>
                <strong className="text-sky-300 font-bold block mt-1 truncate">
                  {livePlayer.specialSkill || 'Equilibrado'}
                </strong>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Status no Time</span>
                <strong
                  className={`font-bold block mt-1 ${
                    isInjured || isSuspended
                      ? 'text-rose-400'
                      : livePlayer.isStarter
                      ? 'text-emerald-400'
                      : livePlayer.isSubstitute
                      ? 'text-amber-300'
                      : 'text-slate-200'
                  }`}
                >
                  {statusText}
                </strong>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Condição Física</span>
                  <strong className="font-mono text-white">{livePlayer.condition}%</strong>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full ${
                      livePlayer.condition >= 80
                        ? 'bg-emerald-400'
                        : livePlayer.condition >= 60
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, livePlayer.condition))}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Moral</span>
                <strong className="text-white font-bold block mt-1">{livePlayer.morale}</strong>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>Evolução na Temp.</span>
                </span>
                <strong
                  className={`font-mono font-bold block mt-1 ${
                    overallEvolution > 0
                      ? 'text-emerald-400'
                      : overallEvolution < 0
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {overallEvolution > 0
                    ? `+${overallEvolution} OVR`
                    : overallEvolution < 0
                    ? `${overallEvolution} OVR`
                    : 'Estável (0)'}
                  {livePlayer.retrainingTargetRole && (
                    <span className="text-[10px] text-sky-300 font-normal ml-1.5">
                      · Adapt. {livePlayer.retrainingTargetRole} ({livePlayer.retrainingProgress || 0}%)
                    </span>
                  )}
                </strong>
              </div>
            </div>

            {isInjured && livePlayer.injuryDetails && (
              <div className="mt-2.5 bg-rose-950/35 border border-rose-500/35 rounded-xl p-3 text-rose-200 flex items-start gap-2">
                <HeartPulse className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    {livePlayer.injuryDetails.injuryType} · {livePlayer.injuryDetails.stage} (
                    {injuryDays} dias restantes)
                  </div>
                  <div className="text-[11px] text-rose-300/80 mt-0.5">
                    {livePlayer.injuryDetails.treatmentPlan}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Season & International Statistics */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Estatísticas da Temporada & Seleção</span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 text-center tabular-nums">
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 block">Jogos</span>
                <strong className="text-base font-mono font-black text-white">
                  {livePlayer.matches || 0}
                </strong>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 block">Gols</span>
                <strong className="text-base font-mono font-black text-emerald-400">
                  {livePlayer.goals || 0}
                </strong>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 block">Assist.</span>
                <strong className="text-base font-mono font-black text-sky-400">
                  {livePlayer.assists || 0}
                </strong>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 block">Nota</span>
                <strong className="text-base font-mono font-black text-amber-300">
                  {livePlayer.matches > 0 && livePlayer.ratingAverage > 0
                    ? livePlayer.ratingAverage.toFixed(1)
                    : '—'}
                </strong>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 block">Amarelos</span>
                <strong className="text-base font-mono font-black text-amber-400">
                  {livePlayer.yellowCards || 0}
                </strong>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 block">Seleção</span>
                <strong className="text-base font-mono font-black text-slate-200">
                  {livePlayer.internationalCaps || 0}J / {livePlayer.internationalGoals || 0}G
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Practical Action Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-[#080e1a] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onComparePlayer && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                  onComparePlayer(livePlayer, effectiveClub);
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Comparar Jogador</span>
              </button>
            )}

            {!isUserPlayer && onToggleWatchlist && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onToggleWatchlist(livePlayer.id);
                }}
                className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  isWatchlisted
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 hover:bg-rose-950/60 hover:border-rose-500/50 hover:text-rose-200'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {isWatchlisted ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" />
                )}
                <span>{isWatchlisted ? 'Na Lista de Observação' : 'Observar Alvo'}</span>
              </button>
            )}

            {isUserPlayer && canToggleBench && onToggleBench && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onToggleBench(livePlayer);
                }}
                className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  livePlayer.isSubstitute
                    ? 'bg-amber-500/15 hover:bg-rose-500/20 border-amber-500/40 text-amber-300 hover:text-rose-200'
                    : 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/40 text-sky-300'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{livePlayer.isSubstitute ? 'Retirar do Banco' : 'Colocar no Banco'}</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isUserPlayer && onNavigateUserArea && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onClose();
                    onNavigateUserArea('contracts');
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  <span>Contratos</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onClose();
                    onNavigateUserArea('training');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Dumbbell className="w-3.5 h-3.5 text-sky-400" />
                  <span>Treinar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onClose();
                    onNavigateUserArea('management');
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Vender / Emprestar</span>
                </button>
              </>
            )}

            {!isUserPlayer && onOpenMarketForPlayer && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                  onOpenMarketForPlayer(livePlayer);
                }}
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Negociar no Mercado</span>
              </button>
            )}

            {!isUserPlayer && effectiveClub && onInspectClub && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                  onInspectClub(effectiveClub.id);
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                <span>Ver Clube</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

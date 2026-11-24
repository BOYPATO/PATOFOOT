import React, { useState } from 'react';
import {
  Club,
  IndividualAwardRecord,
  WorldBallonDorAward,
} from '../types/game';
import {
  RetrospectiveGoalComparison,
  RetrospectiveGoalVerdict,
  SeasonRetrospectiveReport,
} from '../utils/seasonRetrospectiveEngine';
import { ClubCrest } from './ClubCrest';
import { soundEngine } from '../services/soundEngine';
import { generateAndShareAchievementCard } from '../utils/shareCardGenerator';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Flame,
  Share2,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

type RetrospectiveTab = 'board' | 'campaign' | 'squad_finance' | 'honors';

export interface SeasonYearbookModalProps {
  seasonLabel: string;
  championName: string;
  userWon: boolean;
  userClub: Club;
  seasonAwards: IndividualAwardRecord[];
  worldBallonDorAward?: WorldBallonDorAward | null;
  financialWarning?: string;
  championsSummary: Array<{ competition: string; champion: string; isUser: boolean }>;
  goldenBoot?: {
    playerName: string;
    clubShortName: string;
    goals: number;
    assists: number;
    isUserClub: boolean;
  } | null;
  bestSigning?: {
    playerName: string;
    role: string;
    fee: number;
    goals: number;
    assists: number;
    fromClubName: string;
  } | null;
  memorableMatch?: {
    scoreline: string;
    competitionLabel: string;
    dateDisplay: string;
  } | null;
  boardConfidence: number;
  retrospective: SeasonRetrospectiveReport;
  nextSeasonLabel: string;
  onClose?: () => void;
  onOpenBoard?: () => void;
  onOpenHistory: () => void;
  onStartNextSeason: () => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);

const formatSignedCurrency = (val: number) =>
  val >= 0 ? `+${formatCurrency(val)}` : formatCurrency(val);

function getVerdictPresentation(verdict: RetrospectiveGoalVerdict) {
  if (verdict === 'EXCEEDED') {
    return {
      label: 'Superou a Meta',
      textClass: 'text-emerald-300',
      barClass: 'bg-emerald-400',
      Icon: TrendingUp,
    };
  }
  if (verdict === 'ACHIEVED') {
    return {
      label: 'Meta Cumprida',
      textClass: 'text-sky-300',
      barClass: 'bg-sky-400',
      Icon: CheckCircle2,
    };
  }
  return {
    label: 'Abaixo da Meta',
    textClass: 'text-rose-300',
    barClass: 'bg-rose-400',
    Icon: XCircle,
  };
}

function getGradeColorClass(grade: SeasonRetrospectiveReport['boardGrade']): string {
  if (grade === 'A+' || grade === 'A') return 'text-emerald-300';
  if (grade === 'B+' || grade === 'B') return 'text-sky-300';
  if (grade === 'C') return 'text-amber-300';
  return 'text-rose-300';
}

const LeagueTargetScale: React.FC<{
  position: number;
  totalTeams: number;
  targetMax: number;
  verdict: RetrospectiveGoalVerdict;
}> = ({ position, totalTeams, targetMax, verdict }) => {
  const safeTotal = Math.max(2, totalTeams);
  // 1st place on right (100%) or left (0%)? Left = 1º (best) to Right = Last (worst) feels intuitive for football tables.
  // Actually: Target zone is [1 .. targetMax] on the left side!
  const targetWidthPct = Math.min(100, Math.max(8, (targetMax / safeTotal) * 100));
  const actualMarkerPct = Math.min(
    98,
    Math.max(2, ((position - 0.5) / safeTotal) * 100)
  );
  const markerColor =
    verdict === 'EXCEEDED'
      ? 'bg-emerald-400 ring-emerald-400/30'
      : verdict === 'ACHIEVED'
      ? 'bg-sky-400 ring-sky-400/30'
      : 'bg-rose-400 ring-rose-400/30';

  return (
    <div className="pt-2.5 space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
        <span>1º lugar</span>
        <span>
          Zona da meta: 1º ao {targetMax}º · Sua posição:{' '}
          <strong className="text-slate-100 font-mono">{position}º</strong> de {safeTotal}
        </span>
        <span>{safeTotal}º</span>
      </div>
      <div className="relative h-2.5 rounded-sm bg-slate-800/90 overflow-visible">
        {/* Target Zone Highlight */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-sm bg-emerald-500/20 border-r border-emerald-400/70"
          style={{ width: `${targetWidthPct}%` }}
        />
        {/* Actual Finish Marker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full ring-4 ${markerColor}`}
          style={{ left: `${actualMarkerPct}%` }}
          title={`Posição final: ${position}º lugar`}
        />
      </div>
    </div>
  );
};

const GoalComparisonRow: React.FC<{ item: RetrospectiveGoalComparison }> = ({ item }) => {
  const pres = getVerdictPresentation(item.verdict);
  const VerdictIcon = pres.Icon;

  return (
    <div className="py-4 px-4 sm:px-5 space-y-3 hover:bg-slate-900/40 transition-colors">
      {/* Row Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">{item.competitionLabel}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                item.priority === 'Principal' ? 'text-amber-300 font-medium' : 'text-slate-400'
              }
            >
              Meta {item.priority}
            </span>
            {item.competitionRecordText && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-400">
                  {item.competitionRecordText}
                </span>
              </>
            )}
          </div>
          <h4 className="text-sm sm:text-base font-bold text-white mt-0.5 leading-snug">
            {item.title}
          </h4>
        </div>

        <div className="flex items-center gap-3 shrink-0 sm:text-right">
          <div>
            <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${pres.textClass}`}>
              <VerdictIcon className="w-4 h-4 shrink-0" />
              <span>{pres.label}</span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
              {item.bonusEarned > 0 ? (
                <span className="text-emerald-400">
                  Bônus recebido: +{formatCurrency(item.bonusEarned)}
                </span>
              ) : (
                <span>Bônus perdido: {formatCurrency(item.rewardBonus)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expected vs Actual Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
        <div className="space-y-0.5">
          <div className="text-[11px] text-slate-400">Meta da Diretoria</div>
          <div className="font-semibold text-slate-200">{item.expectedLabel}</div>
        </div>
        <div className="space-y-0.5 md:border-l md:border-slate-800/80 md:pl-3">
          <div className="text-[11px] text-slate-400">Desempenho Real</div>
          <div className="font-semibold text-white tabular-nums">{item.actualLabel}</div>
        </div>
        <div className="space-y-0.5 md:border-l md:border-slate-800/80 md:pl-3">
          <div className="text-[11px] text-slate-400">Comparativo</div>
          <div className={`font-semibold tabular-nums ${pres.textClass}`}>
            {item.deltaLabel}
          </div>
        </div>
      </div>

      {/* Visual Position Bar for League Goals */}
      {item.category === 'LEAGUE' &&
        item.leaguePosition &&
        item.leagueTotalTeams &&
        item.targetPositionMax && (
          <LeagueTargetScale
            position={item.leaguePosition}
            totalTeams={item.leagueTotalTeams}
            targetMax={item.targetPositionMax}
            verdict={item.verdict}
          />
        )}
    </div>
  );
};

export const SeasonYearbookModal: React.FC<SeasonYearbookModalProps> = ({
  seasonLabel,
  championName,
  userWon,
  userClub,
  seasonAwards,
  worldBallonDorAward,
  financialWarning,
  championsSummary,
  goldenBoot,
  bestSigning,
  memorableMatch,
  boardConfidence,
  retrospective,
  nextSeasonLabel,
  onClose,
  onOpenBoard,
  onOpenHistory,
  onStartNextSeason,
}) => {
  const [activeTab, setActiveTab] = useState<RetrospectiveTab>('board');

  const userDiv =
    userClub.division === 'B' ||
    userClub.division === 'C' ||
    userClub.division === 'D'
      ? userClub.division
      : 'A';
  const filteredAwards = seasonAwards.filter((a) => a.divisionCode === userDiv);
  const userRep = Math.max(1, Math.min(5, userClub.reputation || 2));
  const repProgressPct = Math.max(
    0,
    Math.min(100, Math.round(((userClub.reputationProgress || 0) + 1) * 50))
  );

  const tabs: Array<{ id: RetrospectiveTab; label: string; Icon: React.ElementType }> = [
    { id: 'board', label: 'Metas vs. Desempenho', Icon: Target },
    { id: 'campaign', label: 'Campanha & Números', Icon: BarChart3 },
    { id: 'squad_finance', label: 'Elenco & Finanças', Icon: Users },
    { id: 'honors', label: 'Campeões & Premiações', Icon: Trophy },
  ];

  const {
    boardScore,
    boardGrade,
    boardVerdictTitle,
    boardVerdictSummary,
    fanConfidence,
    managerReputation,
    goalsComparison,
    goalsTotal,
    goalsAchievedCount,
    goalsExceededCount,
    principalTotal,
    principalAchieved,
    totalBonusesEarned,
    totalBonusesPossible,
    trophiesWonCount,
    trophiesWonLabels,
    overall,
    home,
    away,
    leagueContext,
    competitionRuns,
    recentForm,
    longestUnbeatenStreak,
    biggestWin,
    toughestLoss,
    squadSnapshot,
    financeSummary,
  } = retrospective;

  const gradeColor = getGradeColorClass(boardGrade);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b1220] border border-slate-800 rounded-2xl w-full max-w-5xl my-auto max-h-[94vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Executive Header */}
        <header className="px-5 sm:px-7 pt-5 pb-4 border-b border-slate-800 shrink-0 bg-[#0d1628]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <ClubCrest club={userClub} size="lg" rounded="xl" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 tabular-nums">
                  <span className="text-amber-300 font-semibold">
                    Retrospectiva da Temporada {seasonLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{retrospective.leagueName}</span>
                  {leagueContext.position && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-200 font-medium">
                        {leagueContext.position}º lugar ({leagueContext.points} pts)
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5 truncate">
                  Balanço Final — {userClub.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {userWon
                    ? `Temporada coroada com ${trophiesWonCount || 1} ${
                        (trophiesWonCount || 1) === 1 ? 'título oficial' : 'títulos oficiais'
                      }.`
                    : `Campeão da liga: ${championName}. Confira a avaliação da diretoria e os números do ano.`}
                </p>
              </div>
            </div>

            {/* Right: Board Grade Readout + Optional Close */}
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
              <div className="sm:text-right">
                <div className="text-[11px] text-slate-400">Avaliação da Diretoria</div>
                <div className="flex items-baseline sm:justify-end gap-2 mt-0.5">
                  <span className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${gradeColor}`}>
                    {boardGrade}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    {boardScore.toFixed(1)} / 10
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">{boardVerdictTitle}</div>
              </div>

              {onClose && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onClose();
                  }}
                  aria-label="Fechar retrospectiva"
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Segmented Navigation Bar */}
          <nav
            aria-label="Seções da Retrospectiva"
            className="mt-4 flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800/90 rounded-xl overflow-x-auto no-native-scrollbar"
          >
            {tabs.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab(id);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/35'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-5 space-y-6">
          {/* TAB 1: METAS VS. DESEMPENHO */}
          {activeTab === 'board' && (
            <div className="space-y-6">
              {/* 4-Column Executive KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-800 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-800 bg-slate-950/50 tabular-nums">
                <div className="p-4">
                  <div className="text-xs text-slate-400">Metas Cumpridas</div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {goalsAchievedCount}
                    <span className="text-base text-slate-500"> / {goalsTotal}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {principalTotal > 0
                      ? `Principais: ${principalAchieved}/${principalTotal}`
                      : 'Sem meta principal ativa'}
                    {goalsExceededCount > 0 ? ` · ${goalsExceededCount} superada(s)` : ''}
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-xs text-slate-400">Bônus de Metas</div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono mt-1 truncate">
                    {formatCurrency(totalBonusesEarned)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 truncate">
                    de {formatCurrency(totalBonusesPossible)} disponíveis
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-xs text-slate-400">Confiança da Diretoria</div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {boardConfidence}%
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-sm bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        boardConfidence >= 70
                          ? 'bg-emerald-400'
                          : boardConfidence >= 45
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${Math.max(4, Math.min(100, boardConfidence))}%` }}
                    />
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-xs text-slate-400">Torcida & Reputação</div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {fanConfidence}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Reputação técnica: <strong className="text-slate-200">{managerReputation}</strong>/100
                  </div>
                </div>
              </div>

              {/* Board Narrative Verdict */}
              <section className="p-4 sm:p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Parecer do Conselho Diretivo
                  </h3>
                  {trophiesWonLabels.length > 0 && (
                    <span className="text-xs text-amber-300 font-medium">
                      Conquistas do ano: {trophiesWonLabels.join(' · ')}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {boardVerdictSummary}
                </p>
              </section>

              {/* Goal-by-Goal Detailed Comparison List */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Comparativo Detalhado: Meta Esperada vs. Resultado Real
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Auditoria individual de cada objetivo pactuado com a diretoria na temporada {seasonLabel}
                    </p>
                  </div>
                  {onOpenBoard && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onOpenBoard();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Abrir Diretoria & Carreira</span>
                    </button>
                  )}
                </div>

                {goalsComparison.length > 0 ? (
                  <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950/40 overflow-hidden">
                    {goalsComparison.map((item) => (
                      <GoalComparisonRow key={item.goalId} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-xs text-slate-400">
                    Nenhuma meta formal foi registrada para esta edição. O desempenho geral foi avaliado com base nos resultados em campo.
                  </div>
                )}
              </section>

              {financialWarning && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/35 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{financialWarning}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAMPANHA & NÚMEROS */}
          {activeTab === 'campaign' && (
            <div className="space-y-6">
              {/* Overall Competitive KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border border-slate-800 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-800 bg-slate-950/50 tabular-nums">
                <div className="p-4">
                  <div className="text-xs text-slate-400">Partidas Oficiais</div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {overall.played}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    {overall.won}V · {overall.drawn}E · {overall.lost}D
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-xs text-slate-400">Aproveitamento</div>
                  <div className="text-2xl font-bold text-sky-300 font-mono mt-1">
                    {overall.winRatePct}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {leagueContext.pointsPerGame > 0
                      ? `${leagueContext.pointsPerGame.toFixed(2)} pts/jogo na liga`
                      : 'Temporada completa'}
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-xs text-slate-400">Gols Pró / Contra</div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {overall.goalsFor}
                    <span className="text-slate-500"> : </span>
                    {overall.goalsAgainst}
                  </div>
                  <div
                    className={`text-[11px] font-mono mt-1 ${
                      overall.goalDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    Saldo {overall.goalDiff >= 0 ? `+${overall.goalDiff}` : overall.goalDiff}
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-xs text-slate-400">Jogos sem Sofrer Gol</div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {overall.cleanSheets}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {overall.played > 0
                      ? `${Math.round((overall.cleanSheets / overall.played) * 100)}% das partidas`
                      : '—'}
                  </div>
                </div>

                <div className="p-4 col-span-2 sm:col-span-1">
                  <div className="text-xs text-slate-400">Ataque / Defesa (Liga)</div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {leagueContext.attackRank ? `${leagueContext.attackRank}º` : '—'}
                    <span className="text-slate-500"> / </span>
                    {leagueContext.defenseRank ? `${leagueContext.defenseRank}º` : '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Maior invencibilidade: {longestUnbeatenStreak} jogos
                  </div>
                </div>
              </div>

              {/* Home vs Away Split */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 tabular-nums">
                {[
                  { title: 'Desempenho como Mandante', stats: home },
                  { title: 'Desempenho como Visitante', stats: away },
                ].map(({ title, stats }) => (
                  <div
                    key={title}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-200">{title}</h4>
                      <span className="text-xs font-mono font-bold text-sky-300">
                        {stats.winRatePct}% aprov.
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>
                        {stats.played}J · <strong className="text-emerald-400">{stats.won}V</strong>{' '}
                        <strong className="text-slate-300">{stats.drawn}E</strong>{' '}
                        <strong className="text-rose-400">{stats.lost}D</strong>
                      </span>
                      <span>
                        Gols {stats.goalsFor}:{stats.goalsAgainst} (SG{' '}
                        {stats.goalDiff >= 0 ? `+${stats.goalDiff}` : stats.goalDiff})
                      </span>
                    </div>
                    {/* Segmented W/D/L bar */}
                    {stats.played > 0 && (
                      <div className="h-2 w-full rounded-sm overflow-hidden flex bg-slate-800">
                        <div
                          className="bg-emerald-400"
                          style={{ width: `${(stats.won / stats.played) * 100}%` }}
                          title={`Vitórias: ${stats.won}`}
                        />
                        <div
                          className="bg-slate-500"
                          style={{ width: `${(stats.drawn / stats.played) * 100}%` }}
                          title={`Empates: ${stats.drawn}`}
                        />
                        <div
                          className="bg-rose-400"
                          style={{ width: `${(stats.lost / stats.played) * 100}%` }}
                          title={`Derrotas: ${stats.lost}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </section>

              {/* Competition-by-Competition Table */}
              {competitionRuns.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">
                      Desempenho por Competição
                    </h3>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {competitionRuns.length}{' '}
                      {competitionRuns.length === 1 ? 'torneio disputado' : 'torneios disputados'}
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/40">
                    <table className="w-full text-left text-xs tabular-nums">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                          <th className="py-2.5 px-4 font-semibold">Competição</th>
                          <th className="py-2.5 px-2.5 text-right font-semibold">J</th>
                          <th className="py-2.5 px-2.5 text-right font-semibold">V</th>
                          <th className="py-2.5 px-2.5 text-right font-semibold">E</th>
                          <th className="py-2.5 px-2.5 text-right font-semibold">D</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Gols</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Aprov.</th>
                          <th className="py-2.5 px-4 text-right font-semibold">Desfecho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {competitionRuns.map((run) => (
                          <tr
                            key={run.competitionId}
                            className="hover:bg-slate-900/40 transition-colors"
                          >
                            <td className="py-2.5 px-4 font-semibold text-white whitespace-nowrap">
                              {run.competitionName}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-slate-300">
                              {run.played}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-emerald-400">
                              {run.won}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-slate-400">
                              {run.drawn}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-rose-400">
                              {run.lost}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                              {run.goalsFor}:{run.goalsAgainst}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-sky-300">
                              {run.winRatePct}%
                            </td>
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              <span
                                className={`font-semibold ${
                                  run.wonTitle
                                    ? 'text-amber-300'
                                    : run.boardGoalVerdict === 'FAILED'
                                    ? 'text-rose-300'
                                    : 'text-slate-200'
                                }`}
                              >
                                {run.outcomeLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Notable Matches + Recent Form Strip */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-400">
                    Maior Vitória do Ano
                  </div>
                  {biggestWin ? (
                    <>
                      <div className="text-sm font-bold text-white truncate">
                        {biggestWin.scoreline}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {biggestWin.competitionLabel} · {biggestWin.dateDisplay}
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400">Nenhuma vitória registrada.</div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1">
                  <div className="text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Jogo Mais Marcante</span>
                  </div>
                  {memorableMatch ? (
                    <>
                      <div className="text-sm font-bold text-white truncate">
                        {memorableMatch.scoreline}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {memorableMatch.competitionLabel} · {memorableMatch.dateDisplay}
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400">Disponível no Almanaque da temporada.</div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1">
                  <div className="text-[11px] font-semibold text-rose-400">
                    Revés Mais Duro
                  </div>
                  {toughestLoss ? (
                    <>
                      <div className="text-sm font-bold text-white truncate">
                        {toughestLoss.scoreline}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {toughestLoss.competitionLabel} · {toughestLoss.dateDisplay}
                      </div>
                    </>
                  ) : (
                    <div className="text-emerald-300 font-medium">
                      Campanha invicta na temporada!
                    </div>
                  )}
                </div>
              </div>

              {/* Final Stretch Results */}
              {recentForm.length > 0 && (
                <section className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-200">
                      Reta Final (Últimas {recentForm.length} Partidas Oficiais)
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Da mais antiga à rodada final
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] tabular-nums">
                    {recentForm.map((m) => {
                      const outcomeClass =
                        m.outcome === 'V'
                          ? 'text-emerald-300 border-emerald-500/30 bg-emerald-950/20'
                          : m.outcome === 'E'
                          ? 'text-slate-300 border-slate-700 bg-slate-900/60'
                          : 'text-rose-300 border-rose-500/30 bg-rose-950/20';
                      return (
                        <div
                          key={m.fixtureId}
                          className={`px-2.5 py-2 rounded-lg border ${outcomeClass}`}
                          title={`${m.competitionShort} · ${m.dateDisplay} · ${m.opponentName}`}
                        >
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span>{m.outcome}</span>
                            <span>
                              {m.userGoals}×{m.oppGoals}
                            </span>
                          </div>
                          <div className="text-slate-300 truncate mt-0.5">
                            {m.isHome ? 'vs' : '@'} {m.opponentShortName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* TAB 3: ELENCO & FINANÇAS */}
          {activeTab === 'squad_finance' && (
            <div className="space-y-6">
              {/* Squad Leaders Grid */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Destaques Individuais do Elenco
                  </h3>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {squadSnapshot.squadSize} atletas · OVR médio {squadSnapshot.avgOverall.toFixed(1)} · Idade média {squadSnapshot.avgAge.toFixed(1)} anos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs tabular-nums">
                  {[
                    {
                      label: 'Melhor Média (MVP)',
                      accent: 'text-amber-300',
                      leader: squadSnapshot.mvpPlayer,
                      empty: 'Sem partidas suficientes registradas.',
                    },
                    {
                      label: 'Artilheiro do Elenco',
                      accent: 'text-emerald-300',
                      leader: squadSnapshot.topScorer,
                      empty: 'Nenhum gol oficial registrado.',
                    },
                    {
                      label: 'Líder de Assistências',
                      accent: 'text-sky-300',
                      leader: squadSnapshot.topAssister,
                      empty: 'Nenhuma assistência registrada.',
                    },
                    {
                      label: 'Maior Evolução na Temporada',
                      accent: 'text-indigo-300',
                      leader: squadSnapshot.mostImproved,
                      empty: 'Sem evolução líquida de OVR registrada.',
                    },
                    {
                      label: 'Destaque Sub-21',
                      accent: 'text-cyan-300',
                      leader: squadSnapshot.bestYoungster,
                      empty: 'Nenhum atleta Sub-21 com minutagem mínima.',
                    },
                  ].map(({ label, accent, leader, empty }) => (
                    <div
                      key={label}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1.5"
                    >
                      <div className={`text-[11px] font-semibold ${accent}`}>{label}</div>
                      {leader ? (
                        <>
                          <div className="text-sm font-bold text-white truncate">
                            {leader.playerName}{' '}
                            <span className="text-slate-400 font-normal">({leader.role})</span>
                          </div>
                          <div className="text-xs font-mono font-semibold text-slate-100">
                            {leader.primaryMetric}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {leader.secondaryMetric}
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-500">{empty}</div>
                      )}
                    </div>
                  ))}

                  {/* Best Signing */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1.5">
                    <div className="text-[11px] font-semibold text-emerald-300">
                      Melhor Contratação do Ano
                    </div>
                    {bestSigning ? (
                      <>
                        <div className="text-sm font-bold text-white truncate">
                          {bestSigning.playerName}{' '}
                          <span className="text-slate-400 font-normal">({bestSigning.role})</span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-slate-100">
                          {bestSigning.goals}G · {bestSigning.assists}A
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          De {bestSigning.fromClubName} ·{' '}
                          {bestSigning.fee > 0 ? formatCurrency(bestSigning.fee) : 'Sem custos'}
                        </div>
                      </>
                    ) : (
                      <div className="text-[11px] text-slate-500">
                        Base do elenco mantida sem reforços decisivos neste ano.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Financial & Club Prestige Scorecard */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-sky-400" />
                    <span>Balanço Financeiro & Prestígio do Clube</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    Sócios-torcedores: {financeSummary.seasonTicketHolders.toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-800 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-800 bg-slate-950/50 tabular-nums">
                  <div className="p-4">
                    <div className="text-xs text-slate-400">Saldo Inicial</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-slate-200 mt-1 truncate">
                      {formatCurrency(financeSummary.openingBalance)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-400">Receitas da Temporada</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-1 truncate">
                      +{formatCurrency(financeSummary.totalIncome)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-400">Despesas da Temporada</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-rose-400 mt-1 truncate">
                      -{formatCurrency(financeSummary.totalExpenses)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-400">Saldo Final em Caixa</div>
                    <div
                      className={`text-base sm:text-lg font-bold font-mono mt-1 truncate ${
                        financeSummary.closingBalance >= 0 ? 'text-white' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(financeSummary.closingBalance)}
                    </div>
                    <div
                      className={`text-[11px] font-mono mt-0.5 ${
                        financeSummary.operationalResult >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      Resultado: {formatSignedCurrency(financeSummary.operationalResult)}
                    </div>
                  </div>
                </div>

                {/* Revenue vs Expense Ratio + Club Prestige */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs tabular-nums">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold">Equilíbrio Receita vs. Despesa</span>
                      <span className="font-mono text-slate-400">
                        {financeSummary.incomeSharePct}% receitas ·{' '}
                        {100 - financeSummary.incomeSharePct}% despesas
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-sm overflow-hidden flex bg-slate-800">
                      <div
                        className="bg-emerald-400"
                        style={{ width: `${financeSummary.incomeSharePct}%` }}
                      />
                      <div
                        className="bg-rose-400"
                        style={{ width: `${100 - financeSummary.incomeSharePct}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">Prestígio do Clube</span>
                      <span className="font-mono text-amber-300 inline-flex items-center gap-1">
                        {userRep} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> ·{' '}
                        {repProgressPct}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-sm bg-slate-800 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${repProgressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Official End-of-Season Prize Settlement & Next Season Budget Carryover */}
                {userClub.finances.lastSeasonPrizeReport &&
                  userClub.finances.lastSeasonPrizeReport.items.length > 0 && (
                    <div className="rounded-xl border border-emerald-500/30 bg-slate-950/60 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3.5 border-b border-slate-800">
                        <div>
                          <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 shrink-0" />
                            <span>
                              Premiações Oficiais Liquidadas · {userClub.finances.lastSeasonPrizeReport.seasonLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Cotas de participação e posição final creditadas em caixa e mantidas no orçamento de {nextSeasonLabel}.
                          </p>
                        </div>
                        <div className="text-left sm:text-right font-mono tabular-nums shrink-0">
                          <div className="text-sm font-bold text-emerald-400">
                            +{formatCurrency(userClub.finances.lastSeasonPrizeReport.totalSeasonEndAwarded)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Orçamento {nextSeasonLabel}:{' '}
                            <strong className="text-white">
                              {formatCurrency(userClub.finances.lastSeasonPrizeReport.balanceAfterSettlement)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-800/70 text-xs tabular-nums">
                        {userClub.finances.lastSeasonPrizeReport.items.map((item) => (
                          <div
                            key={`${item.competitionId}_${item.positionOrStageLabel}`}
                            className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">
                                {item.competitionName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {item.positionOrStageLabel} · Participação{' '}
                                <span className="font-mono text-slate-300">
                                  {formatCurrency(item.participationAmount)}
                                </span>{' '}
                                · Posição/Mérito{' '}
                                <span className="font-mono text-slate-300">
                                  {formatCurrency(item.positionBonusAmount)}
                                </span>
                              </div>
                            </div>
                            <div className="font-mono font-bold text-emerald-400 shrink-0">
                              +{formatCurrency(item.totalAmount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </section>
            </div>
          )}

          {/* TAB 4: CAMPEÕES & PREMIAÇÕES */}
          {activeTab === 'honors' && (
            <div className="space-y-6">
              {/* Golden Boot + Champions Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs tabular-nums">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1.5">
                  <div className="text-[11px] font-semibold text-amber-300">
                    Chuteira de Ouro · Artilheiro Geral
                  </div>
                  {goldenBoot ? (
                    <>
                      <div className="text-base font-bold text-white truncate">
                        {goldenBoot.playerName}
                      </div>
                      <div className="text-slate-300">
                        {goldenBoot.clubShortName}
                        {goldenBoot.isUserClub ? ' · Seu elenco' : ''}
                      </div>
                      <div className="text-xs font-mono text-amber-300 pt-1">
                        {goldenBoot.goals} gols · {goldenBoot.assists} assistências
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400">
                      Artilharia oficial registrada no Almanaque da Temporada.
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-3">
                  <div className="text-[11px] font-semibold text-slate-300">
                    Quadro de Campeões da Temporada {seasonLabel}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {championsSummary.map((row, idx) => (
                      <div
                        key={`${row.competition}_${idx}`}
                        className={`px-3 py-2 rounded-lg border flex items-center justify-between gap-2 ${
                          row.isUser
                            ? 'bg-sky-950/35 border-sky-500/40'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <span className="text-slate-400 truncate">{row.competition}</span>
                        <span
                          className={`font-bold truncate ${
                            row.isUser ? 'text-sky-300' : 'text-white'
                          }`}
                        >
                          {row.champion}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* World Ballon d'Or Podium */}
              {worldBallonDorAward && (
                <section className="p-4 rounded-xl border border-amber-500/35 bg-slate-950/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-amber-300">
                      Bola de Ouro Mundial ({worldBallonDorAward.year})
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      Premiação ao vencedor: OVR +1 · +R$ 35M valor de passe
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs tabular-nums">
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <div className="text-[11px] font-semibold text-amber-300">
                        1º · Bola de Ouro
                      </div>
                      <div className="text-sm font-bold text-white truncate mt-0.5">
                        {worldBallonDorAward.winner.playerName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {worldBallonDorAward.winner.clubShortName} ·{' '}
                        {worldBallonDorAward.winner.goals}G {worldBallonDorAward.winner.assists}A (
                        {worldBallonDorAward.winner.ballonDorPoints} pts)
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-300">
                        2º · Bola de Prata
                      </div>
                      <div className="text-sm font-bold text-slate-100 truncate mt-0.5">
                        {worldBallonDorAward.silver.playerName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {worldBallonDorAward.silver.clubShortName} ·{' '}
                        {worldBallonDorAward.silver.ballonDorPoints} pts
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                      <div className="text-[11px] font-semibold text-amber-500">
                        3º · Bola de Bronze
                      </div>
                      <div className="text-sm font-bold text-slate-100 truncate mt-0.5">
                        {worldBallonDorAward.bronze.playerName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {worldBallonDorAward.bronze.clubShortName} ·{' '}
                        {worldBallonDorAward.bronze.ballonDorPoints} pts
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Individual Performance Honors */}
              {filteredAwards.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Premiação por Desempenho Individual</span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      Bônus creditado aos clubes vencedores
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/50">
                    {filteredAwards.map((award) => {
                      const isMine = award.userWon || award.clubId === userClub.id;
                      return (
                        <div
                          key={award.id}
                          className={`px-4 py-3 flex items-center justify-between gap-3 ${
                            isMine ? 'bg-sky-950/25' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-amber-400">
                              {award.awardTitle} · {award.competition}
                            </div>
                            <div
                              className={`text-sm font-bold truncate ${
                                isMine ? 'text-sky-300' : 'text-white'
                              }`}
                            >
                              {award.playerName}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate tabular-nums">
                              {award.playerRole} · {award.clubName} · {award.statHighlight}
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono tabular-nums">
                            <div className="text-xs font-bold text-emerald-400">
                              +{formatCurrency(award.prizeAmount)}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              OVR +1 · Passe +{formatCurrency(award.marketValueBoost)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <footer className="px-5 sm:px-7 py-4 border-t border-slate-800 bg-[#0d1628] shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Inspecionar Clube
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                const userTitlesInYear = championsSummary
                  .filter((c) => c.isUser)
                  .map((c) => c.competition);
                const topScorerClub = [...userClub.squad].sort((a, b) => b.goals - a.goals)[0];
                void generateAndShareAchievementCard({
                  kind: 'SEASON',
                  clubName: userClub.name,
                  clubInitials: userClub.initials,
                  primaryColor: userClub.colors.primary,
                  secondaryColor: userClub.colors.secondary,
                  textColor: userClub.colors.text,
                  managerName: userClub.managerName || 'Treinador',
                  headline: userWon ? 'Temporada Campeã!' : `Fim da Temporada ${seasonLabel}`,
                  subtitle:
                    userTitlesInYear.length > 0
                      ? `Títulos: ${userTitlesInYear.slice(0, 2).join(' · ')}`
                      : `Nota da Diretoria: ${retrospective.boardGrade} · Confiança ${boardConfidence}%`,
                  yearLabel: seasonLabel,
                  stats: [
                    { label: 'Jogos', value: String(retrospective.overall.played) },
                    { label: 'Vitórias', value: String(retrospective.overall.won) },
                    {
                      label: 'Gols Pró',
                      value: String(retrospective.overall.goalsFor),
                    },
                    {
                      label: 'Aproveit.',
                      value: `${retrospective.overall.winRatePct}%`,
                    },
                  ],
                  highlightLine: topScorerClub && topScorerClub.goals > 0
                    ? `Artilheiro do Elenco: ${topScorerClub.name} (${topScorerClub.goals} gols · ${topScorerClub.assists} assist.)`
                    : goldenBoot
                    ? `Chuteira de Ouro: ${goldenBoot.playerName} (${goldenBoot.goals} gols)`
                    : undefined,
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-300" />
              <span>Baixar Card PNG</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenHistory();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ver Almanaque & Time do Ano
            </button>
          </div>

          <button
            type="button"
            onClick={onStartNextSeason}
            className="px-6 py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-sky-500/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Iniciar Temporada {nextSeasonLabel}
          </button>
        </footer>
      </div>
    </div>
  );
};

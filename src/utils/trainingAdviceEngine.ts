import {
  Club,
  CoachStaff,
  DetailedRole,
  Fixture,
  GameSave,
  Player,
  Position,
  StaffRoleType,
  TrainingFocus,
} from '../types/game';
import { FORMATION_SLOT_ROLES } from './assistantLineupEngine';
import { AVAILABLE_TECHNICAL_STAFF_POOL } from './coachingCarouselEngine';
import { getAvailableRetrainingRoles, DETAILED_ROLE_LABELS } from './positionRetrainingEngine';
import { COMPETITIONS_CATALOG } from './competitionsEngine';

export type TrainingTipPriority = 'ALTA' | 'MEDIA' | 'OPORTUNIDADE';

export type TrainingTipCategory =
  | 'SETOR'
  | 'FISICO'
  | 'EVOLUCAO'
  | 'POLIVALENCIA'
  | 'COMISSAO';

export interface SectorTrainingDiagnostic {
  id: 'GK' | 'DF' | 'MF' | 'FW';
  label: string;
  shortCode: string;
  recommendedFocus: TrainingFocus;
  focusLabel: string;
  playerCount: number;
  topAvgOvr: number;
  squadAvgGap: number; // negative means weaker than squad outfield/overall baseline
  avgCondition: number;
  avgAge: number;
  evolvableCount: number;
  alignedFocusCount: number;
  isWeakest: boolean;
}

export interface TrainingTipActionPayload {
  teamFocus?: TrainingFocus;
  individualFocusUpdates?: { playerId: string; focus: TrainingFocus }[];
  retrainUpdate?: { playerId: string; targetRole: DetailedRole };
  openStaffRole?: StaffRoleType;
  filterTableRole?: 'ALL' | 'YOUTH' | 'GK' | 'DF' | 'MF' | 'FW' | 'RECOMMENDED';
  highlightPlayerIds?: string[];
}

export interface TrainingTip {
  id: string;
  priority: TrainingTipPriority;
  priorityLabel: string;
  category: TrainingTipCategory;
  categoryLabel: string;
  title: string;
  diagnosis: string;
  evidenceLine: string;
  expectedBenefit: string;
  targetPlayerNames: string[];
  targetPlayerIds: string[];
  actionLabel: string;
  canAlsoExecuteSession: boolean;
  isAlreadyApplied: boolean;
  payload: TrainingTipActionPayload;
}

export type SeasonalTrainingPillar = 'FISICO' | 'TATICO' | 'TECNICO';

export type FatigueLevel = 'BAIXA' | 'MODERADA' | 'ALTA';

export interface SeasonalPillarEvaluation {
  pillar: SeasonalTrainingPillar;
  label: string;
  mappedFocus: TrainingFocus;
  mappedFocusLabel: string;
  isRecommended: boolean;
  summary: string;
  effectNote: string;
}

export interface SeasonalTrainingFocusRecommendation {
  recommendedPillar: SeasonalTrainingPillar;
  recommendedPillarLabel: string;
  recommendedTrainingFocus: TrainingFocus;
  recommendedTrainingFocusLabel: string;
  seasonPhaseLabel: string;
  seasonProgressPct: number;
  avgSquadFatigue: number;
  startersAvgFatigue: number;
  fatigueLevel: FatigueLevel;
  fatigueLevelLabel: string;
  tiredStartersCount: number;
  injuredCount: number;
  daysUntilNextMatch: number | null;
  nextMatchDateLabel: string | null;
  nextMatchCompetitionLabel: string | null;
  isNextMatchDecisive: boolean;
  matchesNext7Days: number;
  matchesNext14Days: number;
  matchesLast7Days: number;
  scheduleDensityLabel: string;
  headline: string;
  rationale: string;
  pillars: SeasonalPillarEvaluation[];
}

export interface SquadTrainingAdviceReport {
  assistantHeadline: string;
  assistantSummary: string;
  overallTopAvg: number;
  avgSquadCondition: number;
  startersAvgCondition: number;
  tiredStartersCount: number;
  unalignedIndividualCount: number;
  recommendedPrimaryFocus: TrainingFocus;
  weakestSector: SectorTrainingDiagnostic;
  sectors: SectorTrainingDiagnostic[];
  tips: TrainingTip[];
  seasonalFocusRecommendation: SeasonalTrainingFocusRecommendation;
}

const POSITION_TO_IDEAL_FOCUS: Record<Position, TrainingFocus> = {
  GK: 'GOLEIRO',
  DF: 'DEFESA',
  MF: 'PASSE',
  FW: 'FINALIZACAO',
};

const FOCUS_LABELS: Record<TrainingFocus, string> = {
  FINALIZACAO: 'Ataque & Finalização',
  DEFESA: 'Defesa & Desarme',
  PASSE: 'Construção & Posse',
  GOLEIRO: 'Treino de Goleiros',
  FISICO: 'Físico & Regeneração',
  EQUILIBRADO: 'Treino Equilibrado',
};

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((acc, v) => acc + v, 0) / nums.length;
}

function topNOvrAverage(players: Player[], n: number): number {
  if (players.length === 0) return 0;
  const sorted = [...players].sort((a, b) => b.overall - a.overall).slice(0, n);
  return Math.round(average(sorted.map((p) => p.overall)) * 10) / 10;
}

function canPlayerStillEvolve(player: Player): boolean {
  const maxPot = player.potential || player.overall + 3;
  return player.overall < maxPot;
}

function extractRecentMatchMetrics(
  club: Club,
  allFixtures?: Fixture[],
  gameState?: GameSave | null
): {
  matchesPlayed: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
} {
  if (allFixtures && allFixtures.length > 0) {
    const played = allFixtures.filter(
      (f) => f.played && (f.homeTeamId === club.id || f.awayTeamId === club.id)
    );
    if (played.length > 0) {
      let gf = 0;
      let ga = 0;
      for (const fx of played) {
        const isHome = fx.homeTeamId === club.id;
        gf += isHome ? fx.homeScore ?? 0 : fx.awayScore ?? 0;
        ga += isHome ? fx.awayScore ?? 0 : fx.homeScore ?? 0;
      }
      return {
        matchesPlayed: played.length,
        goalsForPerMatch: Math.round((gf / played.length) * 100) / 100,
        goalsAgainstPerMatch: Math.round((ga / played.length) * 100) / 100,
      };
    }
  }

  if (gameState) {
    const pools = [
      gameState.standingsA,
      gameState.standingsB,
      gameState.standingsC,
      gameState.standingsD,
      ...Object.values(gameState.standingsSouthAmerica || {}),
      ...Object.values(gameState.standingsEurope || {}),
      ...Object.values(gameState.standingsWorldLeagues || {}),
    ];
    for (const pool of pools) {
      const row = (pool || []).find((s) => s.teamId === club.id);
      if (row && row.played > 0) {
        return {
          matchesPlayed: row.played,
          goalsForPerMatch: Math.round((row.goalsFor / row.played) * 100) / 100,
          goalsAgainstPerMatch: Math.round((row.goalsAgainst / row.played) * 100) / 100,
        };
      }
    }
  }

  // Fallback from squad stats
  const maxMatches = club.squad.reduce((m, p) => Math.max(m, p.matches || 0), 0);
  const totalSquadGoals = club.squad.reduce((s, p) => s + (p.goals || 0), 0);
  return {
    matchesPlayed: maxMatches,
    goalsForPerMatch:
      maxMatches > 0 ? Math.round((totalSquadGoals / maxMatches) * 100) / 100 : 0,
    goalsAgainstPerMatch: 0,
  };
}

function parseIsoDayUtc(isoDate?: string): number | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function formatDateShortBr(isoDate?: string): string | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

export function evaluateSeasonalTrainingFocusRecommendation(params: {
  club: Club;
  allFixtures?: Fixture[];
  gameState?: GameSave | null;
  weakestSector: SectorTrainingDiagnostic;
  avgSquadCondition: number;
  startersAvgCondition: number;
  tiredStartersCount: number;
  matchesPlayed: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
}): SeasonalTrainingFocusRecommendation {
  const {
    club,
    allFixtures = [],
    gameState,
    weakestSector,
    avgSquadCondition,
    startersAvgCondition,
    tiredStartersCount,
    matchesPlayed,
    goalsForPerMatch,
    goalsAgainstPerMatch,
  } = params;

  const squad = club.squad || [];
  const currentDate = gameState?.currentDate || '2026-01-15';
  const currentDay = parseIsoDayUtc(currentDate);
  const currentMonth = Number(currentDate.split('-')[1]) || 1;
  const currentRound = gameState?.currentRound ?? 1;
  const totalRounds = Math.max(1, gameState?.totalRounds ?? 38);
  const seasonProgressPct = Math.min(100, Math.max(0, Math.round((currentRound / totalRounds) * 100)));

  const avgSquadFatigue = Math.max(0, Math.min(100, 100 - avgSquadCondition));
  const startersAvgFatigue = Math.max(0, Math.min(100, 100 - startersAvgCondition));
  const injuredCount = squad.filter(
    (p) => p.injuryWeeks > 0 || Boolean(p.injuryDetails)
  ).length;
  const retrainingCount = squad.filter((p) => Boolean(p.retrainingTargetRole)).length;
  const evolvableYouthCount = squad.filter(
    (p) => p.age <= 23 && canPlayerStillEvolve(p)
  ).length;

  // Analyze club calendar around currentDate
  const clubFixtures = allFixtures.filter(
    (f) => f.homeTeamId === club.id || f.awayTeamId === club.id
  );

  const upcomingClubFixtures = clubFixtures
    .filter((f) => {
      if (f.played) return false;
      const fd = parseIsoDayUtc(f.date);
      if (currentDay === null || fd === null) return true;
      return fd >= currentDay;
    })
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

  const nextFixture = upcomingClubFixtures[0] || null;
  const nextFixtureDay = parseIsoDayUtc(nextFixture?.date);
  const daysUntilNextMatch =
    currentDay !== null && nextFixtureDay !== null
      ? Math.max(0, nextFixtureDay - currentDay)
      : null;

  const matchesNext7Days =
    currentDay !== null
      ? upcomingClubFixtures.filter((f) => {
          const fd = parseIsoDayUtc(f.date);
          return fd !== null && fd >= currentDay && fd <= currentDay + 7;
        }).length
      : 0;

  const matchesNext14Days =
    currentDay !== null
      ? upcomingClubFixtures.filter((f) => {
          const fd = parseIsoDayUtc(f.date);
          return fd !== null && fd >= currentDay && fd <= currentDay + 14;
        }).length
      : 0;

  const matchesLast7Days =
    currentDay !== null
      ? clubFixtures.filter((f) => {
          if (!f.played) return false;
          const fd = parseIsoDayUtc(f.date);
          return fd !== null && fd >= currentDay - 7 && fd <= currentDay;
        }).length
      : 0;

  const isFixtureDecisive = (fx?: Fixture | null): boolean => {
    if (!fx) return false;
    if (fx.cupPhase && !fx.cupPhase.toLowerCase().includes('grupos')) return true;
    return (
      fx.competition === 'supercopa_brasil' ||
      fx.competition === 'recopa_sulamericana' ||
      fx.competition === 'intercontinental' ||
      fx.competition === 'uefa_supercup'
    );
  };

  const isNextMatchDecisive =
    isFixtureDecisive(nextFixture) ||
    upcomingClubFixtures.slice(0, 2).some((f) => {
      const fd = parseIsoDayUtc(f.date);
      return (
        currentDay !== null &&
        fd !== null &&
        fd <= currentDay + 7 &&
        isFixtureDecisive(f)
      );
    });

  // Fatigue classification
  const fatigueLevel: FatigueLevel =
    startersAvgFatigue >= 28 || avgSquadFatigue >= 26 || tiredStartersCount >= 4
      ? 'ALTA'
      : startersAvgFatigue >= 18 || avgSquadFatigue >= 18 || tiredStartersCount >= 2
      ? 'MODERADA'
      : 'BAIXA';

  const fatigueLevelLabel =
    fatigueLevel === 'ALTA'
      ? 'Alta (risco de desgaste)'
      : fatigueLevel === 'MODERADA'
      ? 'Moderada (atenção)'
      : 'Baixa (elenco descansado)';

  // Schedule density label
  const scheduleDensityLabel =
    matchesNext7Days >= 2 || matchesNext14Days >= 4
      ? 'Calendário apertado'
      : matchesNext14Days >= 2
      ? 'Ritmo regular'
      : upcomingClubFixtures.length === 0
      ? 'Entressafra / Livre'
      : 'Semana aberta';

  // Season phase label
  const seasonPhaseLabel =
    matchesNext7Days >= 2 || matchesNext14Days >= 4
      ? 'Maratona de Jogos'
      : seasonProgressPct >= 72 || (isNextMatchDecisive && matchesPlayed >= 10)
      ? 'Reta Final Decisiva'
      : currentMonth <= 2 && matchesPlayed <= 5
      ? 'Início de Temporada'
      : upcomingClubFixtures.length === 0
      ? 'Fechamento de Temporada'
      : 'Temporada Regular';

  // Map each of the 3 pillars to its exact actionable CT TrainingFocus
  const tacticalMappedFocus: TrainingFocus =
    matchesPlayed >= 3 && goalsAgainstPerMatch >= 1.4
      ? 'DEFESA'
      : matchesPlayed >= 3 && goalsForPerMatch < 1.15
      ? 'PASSE'
      : 'EQUILIBRADO';

  const technicalMappedFocus: TrainingFocus = weakestSector.recommendedFocus;

  // Score the 3 pillars objectively using fatigue + calendar + tactical/technical signals
  let fisicoScore = 30;
  let taticoScore = 40;
  let tecnicoScore = 42;

  // Fatigue & physical signals
  if (fatigueLevel === 'ALTA') {
    fisicoScore += 55;
    tecnicoScore -= 18;
    taticoScore -= 8;
  } else if (fatigueLevel === 'MODERADA') {
    fisicoScore += 24;
  } else {
    fisicoScore -= 10;
    tecnicoScore += 14;
  }

  if (injuredCount >= 3) {
    fisicoScore += 14;
  }
  if (matchesLast7Days >= 2) {
    fisicoScore += 16;
  }

  // Calendar congestion & proximity signals
  if (matchesNext7Days >= 2 || matchesNext14Days >= 4) {
    fisicoScore += fatigueLevel === 'BAIXA' ? 14 : 26;
    taticoScore += 10;
    tecnicoScore -= 12;
  } else if (daysUntilNextMatch !== null && daysUntilNextMatch <= 2) {
    fisicoScore += startersAvgFatigue >= 15 ? 24 : 8;
    taticoScore += 16;
    tecnicoScore -= 10;
  } else if (daysUntilNextMatch !== null && daysUntilNextMatch <= 4) {
    taticoScore += 18;
    tecnicoScore += 4;
  } else if (daysUntilNextMatch === null || daysUntilNextMatch >= 5) {
    // Open week or off-season: prime window for technical development & XP
    tecnicoScore += 24;
    if (seasonPhaseLabel === 'Início de Temporada' && startersAvgFatigue >= 14) {
      fisicoScore += 14;
    }
  }

  // Tactical signals (decisive matches, season stretch, defensive/build-up issues, retraining)
  if (isNextMatchDecisive) {
    taticoScore += 24;
  }
  if (seasonPhaseLabel === 'Reta Final Decisiva') {
    taticoScore += 16;
  }
  if (matchesPlayed >= 3 && (goalsAgainstPerMatch >= 1.35 || goalsForPerMatch < 1.1)) {
    taticoScore += 14;
  }
  if (retrainingCount > 0) {
    taticoScore += 8;
  }

  // Technical signals (clear sector bottleneck & youth potential)
  if (weakestSector.squadAvgGap <= -1.2) {
    tecnicoScore += 16;
  }
  if (evolvableYouthCount >= 5 && fatigueLevel === 'BAIXA') {
    tecnicoScore += 10;
  }

  // Pick winning pillar
  const pillarCandidates: { pillar: SeasonalTrainingPillar; score: number }[] = [
    { pillar: 'FISICO', score: fisicoScore },
    { pillar: 'TATICO', score: taticoScore },
    { pillar: 'TECNICO', score: tecnicoScore },
  ];
  const rankedPillars = [...pillarCandidates].sort((a, b) => b.score - a.score);

  const recommendedPillar = rankedPillars[0].pillar;

  const pillarLabels: Record<SeasonalTrainingPillar, string> = {
    FISICO: 'Físico',
    TATICO: 'Tático',
    TECNICO: 'Técnico',
  };

  const recommendedTrainingFocus: TrainingFocus =
    recommendedPillar === 'FISICO'
      ? 'FISICO'
      : recommendedPillar === 'TATICO'
      ? tacticalMappedFocus
      : technicalMappedFocus;

  const nextCompShort = nextFixture
    ? COMPETITIONS_CATALOG[nextFixture.competition]?.shortName || 'Próximo Jogo'
    : null;

  const nextMatchContextText =
    daysUntilNextMatch === null
      ? 'sem jogos imediatos no calendário'
      : daysUntilNextMatch === 0
      ? `com partida hoje (${nextCompShort || 'competição oficial'})`
      : daysUntilNextMatch === 1
      ? `a 1 dia do próximo compromisso (${nextCompShort || 'jogo oficial'})`
      : `com ${daysUntilNextMatch} dias até o próximo jogo (${nextCompShort || 'jogo oficial'})`;

  const headline =
    recommendedPillar === 'FISICO'
      ? `Momento pede Foco Físico: fadiga média em ${avgSquadFatigue}% (titulares ${startersAvgFatigue}%)`
      : recommendedPillar === 'TATICO'
      ? `Momento pede Foco Tático: ajuste coletivo ${nextMatchContextText}`
      : `Momento pede Foco Técnico: janela ideal para elevar o nível de ${weakestSector.label}`;

  const rationale =
    recommendedPillar === 'FISICO'
      ? `Com ${matchesNext14Days} jogo(s) previsto(s) nos próximos 14 dias e ${tiredStartersCount} titular(es) desgastado(s), priorizar ${FOCUS_LABELS.FISICO} recupera fôlego (+14% a +24%) e reduz risco de lesões musculares antes da sequência.`
      : recommendedPillar === 'TATICO'
      ? `O elenco está com fadiga controlada (${startersAvgFatigue}% nos titulares), mas ${
          isNextMatchDecisive
            ? 'há um confronto decisivo/mata-mata no horizonte'
            : seasonPhaseLabel === 'Reta Final Decisiva'
            ? 'a reta final exige máxima compactação coletiva'
            : 'o curto intervalo entre jogos favorece ajustes de organização do ' + club.tactics.formation
        }. Aplicar ${FOCUS_LABELS[tacticalMappedFocus]} maximiza o rendimento imediato em campo.`
      : `O plantel está descansado (fadiga média de ${avgSquadFatigue}%) e ${
          daysUntilNextMatch === null || daysUntilNextMatch >= 5
            ? 'a semana livre abre espaço para carga forte de fundamentos'
            : 'o ritmo do calendário permite foco em evolução individual'
        }. Direcionar o CT para ${FOCUS_LABELS[technicalMappedFocus]} corrige o setor mais carente (${weakestSector.label}, ${weakestSector.topAvgOvr.toFixed(1)} OVR) e acelera o ganho de XP de ${evolvableYouthCount} atleta(s) jovens.`;

  const pillars: SeasonalPillarEvaluation[] = [
    {
      pillar: 'FISICO',
      label: 'Físico',
      mappedFocus: 'FISICO',
      mappedFocusLabel: FOCUS_LABELS.FISICO,
      isRecommended: recommendedPillar === 'FISICO',
      summary:
        fatigueLevel === 'ALTA'
          ? `Prioridade imediata: titulares com ${startersAvgFatigue}% de fadiga e ${tiredStartersCount} atleta(s) abaixo da condição ideal.`
          : matchesNext7Days >= 2
          ? `Boa pedida preventiva: ${matchesNext7Days} partidas nos próximos 7 dias exigem gestão de carga.`
          : `Elenco bem recuperado (${avgSquadCondition}% de condição média); regeneração pode aguardar.`,
      effectNote: 'Recupera +14% a +24% de condição e previne lesões.',
    },
    {
      pillar: 'TATICO',
      label: 'Tático',
      mappedFocus: tacticalMappedFocus,
      mappedFocusLabel: FOCUS_LABELS[tacticalMappedFocus],
      isRecommended: recommendedPillar === 'TATICO',
      summary:
        isNextMatchDecisive
          ? `Confronto decisivo próximo: reforça compactação, movimentação do ${club.tactics.formation} e disciplina coletiva.`
          : matchesPlayed >= 3 && goalsAgainstPerMatch >= 1.4
          ? `Média de ${goalsAgainstPerMatch.toFixed(1)} gols sofridos/jogo pede treino tático defensivo.`
          : `Ajuste coletivo no esquema ${club.tactics.formation} mantendo desgaste moderado entre rodadas.`,
      effectNote:
        tacticalMappedFocus === 'EQUILIBRADO'
          ? 'Evolução coletiva equilibrada em todos os setores.'
          : `Foca em ${FOCUS_LABELS[tacticalMappedFocus]} para corrigir rendimento de jogo.`,
    },
    {
      pillar: 'TECNICO',
      label: 'Técnico',
      mappedFocus: technicalMappedFocus,
      mappedFocusLabel: FOCUS_LABELS[technicalMappedFocus],
      isRecommended: recommendedPillar === 'TECNICO',
      summary:
        fatigueLevel === 'ALTA'
          ? `Carga técnica consome fôlego adicional — aguarde recuperar a condição física do grupo.`
          : `Janela excelente para lapidar fundamentos de ${weakestSector.label} (${weakestSector.topAvgOvr.toFixed(1)} OVR) e evoluir ${evolvableYouthCount} atleta(s) sub-23.`,
      effectNote: `Aplica ${FOCUS_LABELS[technicalMappedFocus]} com bônus máximo de XP por setor.`,
    },
  ];

  return {
    recommendedPillar,
    recommendedPillarLabel: pillarLabels[recommendedPillar],
    recommendedTrainingFocus,
    recommendedTrainingFocusLabel: FOCUS_LABELS[recommendedTrainingFocus],
    seasonPhaseLabel,
    seasonProgressPct,
    avgSquadFatigue,
    startersAvgFatigue,
    fatigueLevel,
    fatigueLevelLabel,
    tiredStartersCount,
    injuredCount,
    daysUntilNextMatch,
    nextMatchDateLabel: formatDateShortBr(nextFixture?.date),
    nextMatchCompetitionLabel: nextCompShort,
    isNextMatchDecisive,
    matchesNext7Days,
    matchesNext14Days,
    matchesLast7Days,
    scheduleDensityLabel,
    headline,
    rationale,
    pillars,
  };
}

export function getIdealIndividualFocusForPlayer(player: Player): TrainingFocus {
  return POSITION_TO_IDEAL_FOCUS[player.position] || 'EQUILIBRADO';
}

export function buildPositionAlignedSquadFocuses(squad: Player[]): Player[] {
  return squad.map((p) => ({
    ...p,
    individualTrainingFocus: getIdealIndividualFocusForPlayer(p),
  }));
}

export function analyzeSquadTrainingNeeds(params: {
  club: Club;
  coaches: CoachStaff[];
  allFixtures?: Fixture[];
  gameState?: GameSave | null;
}): SquadTrainingAdviceReport {
  const { club, coaches, allFixtures, gameState } = params;
  const squad = club.squad || [];
  const currentTeamFocus: TrainingFocus = club.teamTrainingFocus || 'EQUILIBRADO';

  const gks = squad.filter((p) => p.position === 'GK');
  const dfs = squad.filter((p) => p.position === 'DF');
  const mfs = squad.filter((p) => p.position === 'MF');
  const fws = squad.filter((p) => p.position === 'FW');

  const gkTopAvg = topNOvrAverage(gks, 1);
  const dfTopAvg = topNOvrAverage(dfs, 4);
  const mfTopAvg = topNOvrAverage(mfs, 4);
  const fwTopAvg = topNOvrAverage(fws, 3);

  const validAvgs = [gkTopAvg, dfTopAvg, mfTopAvg, fwTopAvg].filter((v) => v > 0);
  const overallTopAvg =
    validAvgs.length > 0 ? Math.round(average(validAvgs) * 10) / 10 : 70;

  const rawSectors: Omit<SectorTrainingDiagnostic, 'isWeakest'>[] = [
    {
      id: 'GK',
      label: 'Goleiros',
      shortCode: 'GOL',
      recommendedFocus: 'GOLEIRO',
      focusLabel: FOCUS_LABELS.GOLEIRO,
      playerCount: gks.length,
      topAvgOvr: gkTopAvg,
      squadAvgGap: Math.round((gkTopAvg - overallTopAvg) * 10) / 10,
      avgCondition: Math.round(average(gks.map((p) => p.condition))),
      avgAge: Math.round(average(gks.map((p) => p.age)) * 10) / 10,
      evolvableCount: gks.filter(canPlayerStillEvolve).length,
      alignedFocusCount: gks.filter((p) => p.individualTrainingFocus === 'GOLEIRO').length,
    },
    {
      id: 'DF',
      label: 'Sistema Defensivo',
      shortCode: 'DEF',
      recommendedFocus: 'DEFESA',
      focusLabel: FOCUS_LABELS.DEFESA,
      playerCount: dfs.length,
      topAvgOvr: dfTopAvg,
      squadAvgGap: Math.round((dfTopAvg - overallTopAvg) * 10) / 10,
      avgCondition: Math.round(average(dfs.map((p) => p.condition))),
      avgAge: Math.round(average(dfs.map((p) => p.age)) * 10) / 10,
      evolvableCount: dfs.filter(canPlayerStillEvolve).length,
      alignedFocusCount: dfs.filter((p) => p.individualTrainingFocus === 'DEFESA').length,
    },
    {
      id: 'MF',
      label: 'Meio-Campo & Criação',
      shortCode: 'MEI',
      recommendedFocus: 'PASSE',
      focusLabel: FOCUS_LABELS.PASSE,
      playerCount: mfs.length,
      topAvgOvr: mfTopAvg,
      squadAvgGap: Math.round((mfTopAvg - overallTopAvg) * 10) / 10,
      avgCondition: Math.round(average(mfs.map((p) => p.condition))),
      avgAge: Math.round(average(mfs.map((p) => p.age)) * 10) / 10,
      evolvableCount: mfs.filter(canPlayerStillEvolve).length,
      alignedFocusCount: mfs.filter((p) => p.individualTrainingFocus === 'PASSE').length,
    },
    {
      id: 'FW',
      label: 'Ataque & Pontaria',
      shortCode: 'ATA',
      recommendedFocus: 'FINALIZACAO',
      focusLabel: FOCUS_LABELS.FINALIZACAO,
      playerCount: fws.length,
      topAvgOvr: fwTopAvg,
      squadAvgGap: Math.round((fwTopAvg - overallTopAvg) * 10) / 10,
      avgCondition: Math.round(average(fws.map((p) => p.condition))),
      avgAge: Math.round(average(fws.map((p) => p.age)) * 10) / 10,
      evolvableCount: fws.filter(canPlayerStillEvolve).length,
      alignedFocusCount: fws.filter((p) => p.individualTrainingFocus === 'FINALIZACAO').length,
    },
  ];

  // Pick weakest sector (preferring outfield tie-breaker when equal, or lowest topAvgOvr)
  const sortedByWeakness = [...rawSectors]
    .filter((s) => s.playerCount > 0)
    .sort((a, b) => {
      if (a.topAvgOvr !== b.topAvgOvr) return a.topAvgOvr - b.topAvgOvr;
      // Tie-breaker: prioritize sector with more evolvable athletes
      return b.evolvableCount - a.evolvableCount;
    });

  const weakestId = sortedByWeakness[0]?.id || 'FW';
  const strongestOvr =
    rawSectors.reduce((max, s) => Math.max(max, s.topAvgOvr), 0) || overallTopAvg;

  const sectors: SectorTrainingDiagnostic[] = rawSectors.map((s) => ({
    ...s,
    isWeakest: s.id === weakestId,
  }));

  const weakestSector = sectors.find((s) => s.id === weakestId) || sectors[3];

  const starters = squad.filter((p) => p.isStarter);
  const avgSquadCondition =
    squad.length > 0 ? Math.round(average(squad.map((p) => p.condition))) : 100;
  const startersAvgCondition =
    starters.length > 0
      ? Math.round(average(starters.map((p) => p.condition)))
      : avgSquadCondition;
  const tiredStarters = starters.filter((p) => p.condition < 72 && p.injuryWeeks === 0);

  const unalignedIndividualCount = squad.filter(
    (p) =>
      canPlayerStillEvolve(p) &&
      p.individualTrainingFocus !== getIdealIndividualFocusForPlayer(p)
  ).length;

  const matchMetrics = extractRecentMatchMetrics(club, allFixtures, gameState);

  const tips: TrainingTip[] = [];

  // -------------------------------------------------------------------------
  // 1. URGENT PHYSICAL FATIGUE CHECK
  // -------------------------------------------------------------------------
  if (avgSquadCondition < 72 || startersAvgCondition < 70 || tiredStarters.length >= 4) {
    const mostTired = [...squad]
      .filter((p) => p.injuryWeeks === 0)
      .sort((a, b) => a.condition - b.condition)
      .slice(0, 4);
    const isCriticalFatigue = avgSquadCondition < 58 || startersAvgCondition < 60;
    const isApplied = currentTeamFocus === 'FISICO';

    tips.push({
      id: 'tip_physical_recovery',
      priority: isCriticalFatigue ? 'ALTA' : 'MEDIA',
      priorityLabel: isCriticalFatigue ? 'Prioridade Alta' : 'Atenção Físico',
      category: 'FISICO',
      categoryLabel: 'Preparação Física',
      title: isCriticalFatigue
        ? 'Recuperar condição física urgente do elenco titular'
        : 'Reduzir desgaste muscular dos titulares antes do próximo jogo',
      diagnosis:
        tiredStarters.length > 0
          ? `${tiredStarters.length} titulares estão abaixo de 72% de energia (${mostTired
              .slice(0, 3)
              .map((p) => `${p.name} ${p.condition}%`)
              .join(', ')}), elevando o risco de queda de rendimento no 2º tempo e lesões musculares.`
          : `A média física geral do elenco caiu para ${avgSquadCondition}%, exigindo sessão regenerativa no CT.`,
      evidenceLine: `Condição titulares ${startersAvgCondition}% · Média do elenco ${avgSquadCondition}% · ${tiredStarters.length} titulares desgastados`,
      expectedBenefit: 'Recupera +14% a +24% de condição física geral sem perda de fôlego',
      targetPlayerNames: mostTired.map((p) => p.name),
      targetPlayerIds: mostTired.map((p) => p.id),
      actionLabel: isApplied ? 'Foco Físico Ativo' : 'Ativar Foco Físico',
      canAlsoExecuteSession: true,
      isAlreadyApplied: isApplied,
      payload: {
        teamFocus: 'FISICO',
        highlightPlayerIds: mostTired.map((p) => p.id),
      },
    });
  }

  // -------------------------------------------------------------------------
  // 2. SECTOR WEAKNESSES (ATAQUE, DEFESA, MEIO-CAMPO, GOLEIRO)
  // -------------------------------------------------------------------------
  // Helper to evaluate each technical sector and emit specific tips when warranted
  const fwEvolvable = [...fws]
    .filter(canPlayerStillEvolve)
    .sort((a, b) => b.overall - a.overall);
  const fwTargets = (fwEvolvable.length > 0 ? fwEvolvable : fws).slice(0, 4);
  const fwLowConversion =
    matchMetrics.matchesPlayed >= 3 && matchMetrics.goalsForPerMatch < 1.15;
  const fwTacticalDemand =
    club.tactics.mentality === 'Ofensivo' ||
    club.tactics.mentality === 'Pressão Total' ||
    club.tactics.formation === '4-3-3' ||
    club.tactics.formation === '3-4-3';
  const fwNeedsAttention =
    weakestId === 'FW' ||
    strongestOvr - fwTopAvg >= 1.5 ||
    fwLowConversion ||
    (fwTacticalDemand && fwTopAvg < overallTopAvg);

  if (fws.length > 0 && fwNeedsAttention) {
    const fwUpdates = fws
      .filter((p) => p.individualTrainingFocus !== 'FINALIZACAO')
      .map((p) => ({ playerId: p.id, focus: 'FINALIZACAO' as TrainingFocus }));
    const isApplied = currentTeamFocus === 'FINALIZACAO' && fwUpdates.length === 0;
    const priority: TrainingTipPriority =
      weakestId === 'FW' || fwLowConversion ? 'ALTA' : 'MEDIA';

    const conversionNote =
      matchMetrics.matchesPlayed >= 3
        ? `A equipe registra média de ${matchMetrics.goalsForPerMatch.toFixed(2)} gol/jogo em ${matchMetrics.matchesPlayed} partidas.`
        : `O setor ofensivo tem média ${fwTopAvg.toFixed(1)} de Força contra ${strongestOvr.toFixed(1)} do setor mais forte do elenco.`;

    tips.push({
      id: 'tip_sector_attack_finishing',
      priority,
      priorityLabel: priority === 'ALTA' ? 'Prioridade Alta' : 'Ajuste Técnico',
      category: 'SETOR',
      categoryLabel: 'Setor Ofensivo',
      title: 'Melhorar finalização dos atacantes',
      diagnosis: `${conversionNote} Sincronizar o treino coletivo e o foco individual de ${fwTargets
        .slice(0, 3)
        .map((p) => `${p.name} (${p.overall})`)
        .join(', ')} acelera o ganho de pontaria e presença de área.`,
      evidenceLine: `Média ATA ${fwTopAvg.toFixed(1)} OVR (${
        fwTopAvg - overallTopAvg >= 0 ? '+' : ''
      }${(fwTopAvg - overallTopAvg).toFixed(1)} vs elenco)${
        matchMetrics.matchesPlayed >= 3
          ? ` · ${matchMetrics.goalsForPerMatch.toFixed(2)} gols/jogo`
          : ''
      } · ${fws.length - fwUpdates.length}/${fws.length} com foco alinhado`,
      expectedBenefit: '+40% XP coletivo em ATA +25% bônus de sinergia individual',
      targetPlayerNames: fwTargets.map((p) => p.name),
      targetPlayerIds: fwTargets.map((p) => p.id),
      actionLabel: isApplied ? 'Plano Aplicado' : 'Focar Finalização',
      canAlsoExecuteSession: avgSquadCondition >= 45,
      isAlreadyApplied: isApplied,
      payload: {
        teamFocus: 'FINALIZACAO',
        individualFocusUpdates: fwUpdates,
        filterTableRole: 'FW',
        highlightPlayerIds: fwTargets.map((p) => p.id),
      },
    });
  }

  // DEFESA
  const dfEvolvable = [...dfs]
    .filter(canPlayerStillEvolve)
    .sort((a, b) => b.overall - a.overall);
  const dfTargets = (dfEvolvable.length > 0 ? dfEvolvable : dfs).slice(0, 4);
  const dfHighConceded =
    matchMetrics.matchesPlayed >= 3 && matchMetrics.goalsAgainstPerMatch >= 1.3;
  const dfNeedsAttention =
    weakestId === 'DF' || strongestOvr - dfTopAvg >= 1.5 || dfHighConceded;

  if (dfs.length > 0 && dfNeedsAttention) {
    const dfUpdates = dfs
      .filter((p) => p.individualTrainingFocus !== 'DEFESA')
      .map((p) => ({ playerId: p.id, focus: 'DEFESA' as TrainingFocus }));
    const isApplied = currentTeamFocus === 'DEFESA' && dfUpdates.length === 0;
    const priority: TrainingTipPriority =
      weakestId === 'DF' || dfHighConceded ? 'ALTA' : 'MEDIA';

    const concededNote =
      matchMetrics.matchesPlayed >= 3 && dfHighConceded
        ? `O time sofreu ${matchMetrics.goalsAgainstPerMatch.toFixed(2)} gols/jogo nas últimas ${matchMetrics.matchesPlayed} partidas.`
        : `A linha defensiva (média ${dfTopAvg.toFixed(1)} OVR) está abaixo do teto competitivo do time (${strongestOvr.toFixed(1)} OVR).`;

    tips.push({
      id: 'tip_sector_defense_marking',
      priority,
      priorityLabel: priority === 'ALTA' ? 'Prioridade Alta' : 'Ajuste Técnico',
      category: 'SETOR',
      categoryLabel: 'Sistema Defensivo',
      title: 'Reforçar desarme e compactação de zagueiros e laterais',
      diagnosis: `${concededNote} Trabalhar bote, cobertura lateral e bola aérea com ${dfTargets
        .slice(0, 3)
        .map((p) => `${p.name} (${p.detailedRole} ${p.overall})`)
        .join(', ')} dará mais segurança ao esquema ${club.tactics.formation}.`,
      evidenceLine: `Média DEF ${dfTopAvg.toFixed(1)} OVR (${
        dfTopAvg - overallTopAvg >= 0 ? '+' : ''
      }${(dfTopAvg - overallTopAvg).toFixed(1)} vs elenco)${
        matchMetrics.matchesPlayed >= 3
          ? ` · ${matchMetrics.goalsAgainstPerMatch.toFixed(2)} gols sofridos/jogo`
          : ''
      } · ${dfs.length - dfUpdates.length}/${dfs.length} alinhados`,
      expectedBenefit: '+40% XP coletivo em ZAG/LAT +25% bônus de sinergia individual',
      targetPlayerNames: dfTargets.map((p) => p.name),
      targetPlayerIds: dfTargets.map((p) => p.id),
      actionLabel: isApplied ? 'Plano Aplicado' : 'Focar Defesa',
      canAlsoExecuteSession: avgSquadCondition >= 45,
      isAlreadyApplied: isApplied,
      payload: {
        teamFocus: 'DEFESA',
        individualFocusUpdates: dfUpdates,
        filterTableRole: 'DF',
        highlightPlayerIds: dfTargets.map((p) => p.id),
      },
    });
  }

  // MEIO-CAMPO
  const mfEvolvable = [...mfs]
    .filter(canPlayerStillEvolve)
    .sort((a, b) => b.overall - a.overall);
  const mfTargets = (mfEvolvable.length > 0 ? mfEvolvable : mfs).slice(0, 4);
  const mfPossessionDemand =
    club.tactics.passing === 'Curto (Posse)' && mfTopAvg < strongestOvr;
  const mfNeedsAttention =
    weakestId === 'MF' || strongestOvr - mfTopAvg >= 1.5 || mfPossessionDemand;

  if (mfs.length > 0 && mfNeedsAttention) {
    const mfUpdates = mfs
      .filter((p) => p.individualTrainingFocus !== 'PASSE')
      .map((p) => ({ playerId: p.id, focus: 'PASSE' as TrainingFocus }));
    const isApplied = currentTeamFocus === 'PASSE' && mfUpdates.length === 0;
    const priority: TrainingTipPriority = weakestId === 'MF' ? 'ALTA' : 'MEDIA';

    tips.push({
      id: 'tip_sector_midfield_passing',
      priority,
      priorityLabel: priority === 'ALTA' ? 'Prioridade Alta' : 'Ajuste Técnico',
      category: 'SETOR',
      categoryLabel: 'Construção & Meio',
      title: 'Aprimorar passe e criação dos meias e volantes',
      diagnosis: `${
        club.tactics.passing === 'Curto (Posse)'
          ? 'O modelo de passe curto exige alta precisão na saída e entrelinhas, mas '
          : 'O setor de criação registra '
      }média ${mfTopAvg.toFixed(1)} OVR. Intensificar triangulações com ${mfTargets
        .slice(0, 3)
        .map((p) => `${p.name} (${p.detailedRole} ${p.overall})`)
        .join(', ')} eleva o controle de posse e o volume de assistências.`,
      evidenceLine: `Média MEI ${mfTopAvg.toFixed(1)} OVR · Estilo ${club.tactics.passing} · ${
        mfs.length - mfUpdates.length
      }/${mfs.length} com foco em Passe`,
      expectedBenefit: '+40% XP coletivo em VOL/MEI +25% bônus de sinergia individual',
      targetPlayerNames: mfTargets.map((p) => p.name),
      targetPlayerIds: mfTargets.map((p) => p.id),
      actionLabel: isApplied ? 'Plano Aplicado' : 'Focar Construção',
      canAlsoExecuteSession: avgSquadCondition >= 45,
      isAlreadyApplied: isApplied,
      payload: {
        teamFocus: 'PASSE',
        individualFocusUpdates: mfUpdates,
        filterTableRole: 'MF',
        highlightPlayerIds: mfTargets.map((p) => p.id),
      },
    });
  }

  // GOLEIROS
  const gkEvolvable = [...gks]
    .filter(canPlayerStillEvolve)
    .sort((a, b) => b.overall - a.overall);
  const gkTargets = (gkEvolvable.length > 0 ? gkEvolvable : gks).slice(0, 2);
  const outfieldAvg = average([dfTopAvg, mfTopAvg, fwTopAvg].filter((v) => v > 0));
  const gkNeedsAttention =
    weakestId === 'GK' || (gks.length > 0 && outfieldAvg - gkTopAvg >= 2.0);

  if (gks.length > 0 && gkNeedsAttention) {
    const gkUpdates = gks
      .filter((p) => p.individualTrainingFocus !== 'GOLEIRO')
      .map((p) => ({ playerId: p.id, focus: 'GOLEIRO' as TrainingFocus }));
    const isApplied = currentTeamFocus === 'GOLEIRO' && gkUpdates.length === 0;
    const priority: TrainingTipPriority =
      outfieldAvg - gkTopAvg >= 3.0 ? 'ALTA' : 'MEDIA';

    tips.push({
      id: 'tip_sector_goalkeeper',
      priority,
      priorityLabel: priority === 'ALTA' ? 'Prioridade Alta' : 'Ajuste Técnico',
      category: 'SETOR',
      categoryLabel: 'Meta & Goleiros',
      title: 'Intensificar reflexos e saída pelo alto dos goleiros',
      diagnosis: `O titular da meta (${gkTargets[0]?.name || 'Goleiro'}, OVR ${gkTopAvg.toFixed(
        0
      )}) está ${(outfieldAvg - gkTopAvg).toFixed(
        1
      )} pts abaixo da média dos titulares de linha (${outfieldAvg.toFixed(
        1
      )}). Sessões específicas para arqueiros rendem o maior multiplicador do CT.`,
      evidenceLine: `Goleiro titular ${gkTopAvg.toFixed(0)} OVR vs Linha ${outfieldAvg.toFixed(
        1
      )} OVR · ${gks.length - gkUpdates.length}/${gks.length} com foco Goleiro`,
      expectedBenefit: '+50% XP específico para GOL +25% bônus de foco individual',
      targetPlayerNames: gkTargets.map((p) => p.name),
      targetPlayerIds: gkTargets.map((p) => p.id),
      actionLabel: isApplied ? 'Plano Aplicado' : 'Focar Goleiros',
      canAlsoExecuteSession: avgSquadCondition >= 45,
      isAlreadyApplied: isApplied,
      payload: {
        teamFocus: 'GOLEIRO',
        individualFocusUpdates: gkUpdates,
        filterTableRole: 'GK',
        highlightPlayerIds: gkTargets.map((p) => p.id),
      },
    });
  }

  // -------------------------------------------------------------------------
  // 3. BREAKTHROUGH CANDIDATES (+1 OVR IMMINENT) OR YOUTH POTENTIAL GEMS
  // -------------------------------------------------------------------------
  const nearEvolutionPlayers = [...squad]
    .filter(
      (p) =>
        canPlayerStillEvolve(p) &&
        (p.trainingProgress || 0) >= 65 &&
        p.injuryWeeks === 0
    )
    .sort((a, b) => (b.trainingProgress || 0) - (a.trainingProgress || 0))
    .slice(0, 4);

  if (nearEvolutionPlayers.length > 0) {
    const focusUpdates = nearEvolutionPlayers
      .filter((p) => p.individualTrainingFocus !== getIdealIndividualFocusForPlayer(p))
      .map((p) => ({
        playerId: p.id,
        focus: getIdealIndividualFocusForPlayer(p),
      }));

    tips.push({
      id: 'tip_near_breakthrough',
      priority: 'OPORTUNIDADE',
      priorityLabel: 'Subida Iminente',
      category: 'EVOLUCAO',
      categoryLabel: 'Lapidação Individual',
      title: 'Acelerar atletas na reta final para subir +1 de Força',
      diagnosis: `${nearEvolutionPlayers
        .slice(0, 3)
        .map((p) => `${p.name} (${p.trainingProgress || 0}% p/ OVR ${p.overall + 1})`)
        .join(', ')} ${
        nearEvolutionPlayers.length === 1 ? 'está muito próximo' : 'estão muito próximos'
      } de evoluir. Um treino individual focado pode destravar o novo nível imediatamente.`,
      evidenceLine: `${nearEvolutionPlayers.length} atleta(s) acima de 65% de progresso · Teto até ★ ${Math.max(
        ...nearEvolutionPlayers.map((p) => p.potential || p.overall + 3)
      )}`,
      expectedBenefit: 'Destrava +1 OVR rápido e valoriza passe de mercado em +15%',
      targetPlayerNames: nearEvolutionPlayers.map((p) => p.name),
      targetPlayerIds: nearEvolutionPlayers.map((p) => p.id),
      actionLabel:
        focusUpdates.length > 0 ? 'Ajustar Foco & Filtrar' : 'Filtrar Atletas na Tabela',
      canAlsoExecuteSession: false,
      isAlreadyApplied: false,
      payload: {
        individualFocusUpdates: focusUpdates,
        filterTableRole: 'RECOMMENDED',
        highlightPlayerIds: nearEvolutionPlayers.map((p) => p.id),
      },
    });
  } else {
    const youthGems = [...squad]
      .filter((p) => p.age <= 21 && (p.potential || p.overall) - p.overall >= 5)
      .sort(
        (a, b) =>
          (b.potential || b.overall) - b.overall - ((a.potential || a.overall) - a.overall)
      )
      .slice(0, 4);

    if (youthGems.length > 0) {
      const youthUpdates = youthGems
        .filter((p) => p.individualTrainingFocus !== getIdealIndividualFocusForPlayer(p))
        .map((p) => ({
          playerId: p.id,
          focus: getIdealIndividualFocusForPlayer(p),
        }));
      const alreadyAligned = youthUpdates.length === 0;

      tips.push({
        id: 'tip_youth_specialization',
        priority: 'OPORTUNIDADE',
        priorityLabel: 'Base & Futuro',
        category: 'EVOLUCAO',
        categoryLabel: 'Jovens Promessas',
        title: 'Especializar treino individual das joias Sub-21 do elenco',
        diagnosis: `Atletas até 21 anos ganham até +60% mais XP por sessão no CT. Especializar o foco de ${youthGems
          .slice(0, 3)
          .map((p) => `${p.name} (${p.age}a, ${p.overall}→★${p.potential || p.overall + 5})`)
          .join(', ')} acelera a transição para titularidade.`,
        evidenceLine: `${youthGems.length} promessa(s) Sub-21 com margem ≥ +5 OVR · ${
          youthGems.length - youthUpdates.length
        }/${youthGems.length} especializados`,
        expectedBenefit: 'Multiplicador jovem (1.6x XP) + especialização por setor',
        targetPlayerNames: youthGems.map((p) => p.name),
        targetPlayerIds: youthGems.map((p) => p.id),
        actionLabel: alreadyAligned ? 'Filtrar Sub-21' : 'Especializar Sub-21',
        canAlsoExecuteSession: false,
        isAlreadyApplied: alreadyAligned,
        payload: {
          individualFocusUpdates: youthUpdates,
          filterTableRole: 'YOUTH',
          highlightPlayerIds: youthGems.map((p) => p.id),
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // 4. REGRESSION / BAD FORM ALERT
  // -------------------------------------------------------------------------
  const regressingPlayers = [...squad]
    .filter((p) => (p.regressionProgress || 0) >= 20)
    .sort((a, b) => (b.regressionProgress || 0) - (a.regressionProgress || 0))
    .slice(0, 4);

  if (regressingPlayers.length > 0) {
    const regUpdates = regressingPlayers
      .filter((p) => p.individualTrainingFocus !== getIdealIndividualFocusForPlayer(p))
      .map((p) => ({
        playerId: p.id,
        focus: getIdealIndividualFocusForPlayer(p),
      }));

    tips.push({
      id: 'tip_regression_alert',
      priority: regressingPlayers.some((p) => (p.regressionProgress || 0) >= 55)
        ? 'ALTA'
        : 'MEDIA',
      priorityLabel: 'Alerta de Fase',
      category: 'EVOLUCAO',
      categoryLabel: 'Recuperação Técnica',
      title: 'Estancar queda técnica de jogadores em má fase',
      diagnosis: `${regressingPlayers
        .slice(0, 3)
        .map((p) => `${p.name} (${p.regressionProgress}% risco)`)
        .join(', ')} acumula desgaste técnico e pode perder -1 de Força ao atingir 100%. Aplique treino individual para retomar confiança.`,
      evidenceLine: `${regressingPlayers.length} atleta(s) sob risco de regressão · Maior índice ${
        regressingPlayers[0]?.regressionProgress || 0
      }%`,
      expectedBenefit: 'Compensa estagnação com ganho direto de XP técnico',
      targetPlayerNames: regressingPlayers.map((p) => p.name),
      targetPlayerIds: regressingPlayers.map((p) => p.id),
      actionLabel: 'Focar Recuperação na Tabela',
      canAlsoExecuteSession: false,
      isAlreadyApplied: false,
      payload: {
        individualFocusUpdates: regUpdates,
        filterTableRole: 'RECOMMENDED',
        highlightPlayerIds: regressingPlayers.map((p) => p.id),
      },
    });
  }

  // -------------------------------------------------------------------------
  // 5. POSITION RETRAINING / SQUAD DEPTH COVERAGE
  // -------------------------------------------------------------------------
  const formationSlots =
    FORMATION_SLOT_ROLES[club.tactics.formation] || FORMATION_SLOT_ROLES['4-3-3'];
  const requiredByRole: Record<DetailedRole, number> = {
    GOL: 0,
    ZAG: 0,
    LAT: 0,
    VOL: 0,
    MEI: 0,
    ATA: 0,
  };
  for (const s of formationSlots) {
    requiredByRole[s.role] += 1;
  }

  const outfieldRoles: DetailedRole[] = ['LAT', 'VOL', 'ZAG', 'MEI', 'ATA'];
  let bestRetrainTip: {
    shortRole: DetailedRole;
    currentCover: number;
    idealCover: number;
    candidate: Player;
  } | null = null;

  for (const role of outfieldRoles) {
    const req = requiredByRole[role];
    if (req <= 0) continue;
    const idealCover = req * 2;
    const coveringPlayers = squad.filter(
      (p) =>
        p.detailedRole === role ||
        (p.secondaryRoles || []).includes(role) ||
        p.retrainingTargetRole === role ||
        (p.detailedRole === 'ZAG' && role === 'LAT') ||
        (p.detailedRole === 'LAT' && role === 'ZAG') ||
        (p.detailedRole === 'VOL' && role === 'MEI') ||
        (p.detailedRole === 'MEI' && role === 'VOL')
    );
    if (coveringPlayers.length < idealCover) {
      // Find a compatible candidate from a role that has surplus players
      const candidate = [...squad]
        .filter((p) => {
          if (p.injuryWeeks > 0 || p.retrainingTargetRole) return false;
          if (!getAvailableRetrainingRoles(p).includes(role)) return false;
          const donorCount = squad.filter((x) => x.detailedRole === p.detailedRole).length;
          const donorReq = Math.max(1, requiredByRole[p.detailedRole]);
          return donorCount > donorReq;
        })
        .sort((a, b) => {
          // Prefer younger versatile players with good overall
          const scoreA = a.overall - a.age * 0.45;
          const scoreB = b.overall - b.age * 0.45;
          return scoreB - scoreA;
        })[0];

      if (candidate) {
        bestRetrainTip = {
          shortRole: role,
          currentCover: coveringPlayers.length,
          idealCover,
          candidate,
        };
        break;
      }
    }
  }

  if (bestRetrainTip) {
    const { shortRole, currentCover, idealCover, candidate } = bestRetrainTip;
    const isApplied =
      candidate.retrainingTargetRole === shortRole ||
      (candidate.secondaryRoles || []).includes(shortRole);

    tips.push({
      id: `tip_retrain_${candidate.id}_${shortRole}`,
      priority: currentCover <= requiredByRole[shortRole] ? 'ALTA' : 'OPORTUNIDADE',
      priorityLabel:
        currentCover <= requiredByRole[shortRole] ? 'Cobertura Crítica' : 'Polivalência Tática',
      category: 'POLIVALENCIA',
      categoryLabel: 'Adaptação de Posição',
      title: `Treinar ${candidate.name} para cobrir carência na função ${shortRole}`,
      diagnosis: `O esquema ${club.tactics.formation} utiliza ${requiredByRole[shortRole]} ${shortRole}(s) titular(es), mas o elenco só conta com ${currentCover} opção(ões) apta(s) (ideal: ${idealCover}). ${candidate.name} (${candidate.detailedRole}, ${candidate.age} anos) tem perfil compatível para dominar ${DETAILED_ROLE_LABELS[shortRole]} sem perda tática.`,
      evidenceLine: `Cobertura atual ${currentCover}/${idealCover} em ${shortRole} · Candidato ${candidate.name} (OVR ${candidate.overall})`,
      expectedBenefit: `Habilita ${shortRole} como função secundária sem improviso na escalação`,
      targetPlayerNames: [candidate.name],
      targetPlayerIds: [candidate.id],
      actionLabel: isApplied ? 'Adaptação Ativa' : `Adaptar para ${shortRole}`,
      canAlsoExecuteSession: false,
      isAlreadyApplied: isApplied,
      payload: {
        retrainUpdate: { playerId: candidate.id, targetRole: shortRole },
        filterTableRole: 'RECOMMENDED',
        highlightPlayerIds: [candidate.id],
      },
    });
  }

  // -------------------------------------------------------------------------
  // 6. COACHING STAFF BOTTLENECK CHECK
  // -------------------------------------------------------------------------
  const sectorToCoachRole: Record<'GK' | 'DF' | 'MF' | 'FW', StaffRoleType> = {
    GK: 'Treinador de Goleiros',
    DF: 'Treinador de Defesa',
    MF: 'Analista de Desempenho',
    FW: 'Treinador de Ataque',
  };

  const priorityStaffRole = sectorToCoachRole[weakestSector.id];
  const currentSectorCoach = coaches.find((c) => c.role === priorityStaffRole);
  const missingImportantRoles: StaffRoleType[] = (
    [
      priorityStaffRole,
      'Preparador Físico',
      'Treinador de Ataque',
      'Treinador de Defesa',
      'Treinador de Goleiros',
      'Analista de Desempenho',
    ] as StaffRoleType[]
  ).filter((role, idx, arr) => arr.indexOf(role) === idx && !coaches.some((c) => c.role === role));

  const targetStaffRole: StaffRoleType | null =
    missingImportantRoles[0] ||
    (currentSectorCoach && currentSectorCoach.stars <= 3 ? priorityStaffRole : null);

  if (targetStaffRole) {
    const existingCoach = coaches.find((c) => c.role === targetStaffRole);
    const topMarketCandidate = [...AVAILABLE_TECHNICAL_STAFF_POOL]
      .filter(
        (cand) =>
          cand.role === targetStaffRole &&
          !coaches.some((c) => c.name.trim() === cand.name.trim()) &&
          cand.stars > (existingCoach?.stars || 0)
      )
      .sort((a, b) => b.stars - a.stars)[0];

    if (topMarketCandidate) {
      tips.push({
        id: `tip_staff_${targetStaffRole}`,
        priority: existingCoach ? 'OPORTUNIDADE' : 'MEDIA',
        priorityLabel: existingCoach ? 'Evolução de Staff' : 'Cargo Vago no CT',
        category: 'COMISSAO',
        categoryLabel: 'Comissão Técnica',
        title: existingCoach
          ? `Elevar nível do ${targetStaffRole} para acelerar treinos`
          : `Contratar ${targetStaffRole} para destravar bônus no CT`,
        diagnosis: existingCoach
          ? `Atualmente ${existingCoach.name} (${existingCoach.stars}★) comanda a área, mas há profissionais até ${topMarketCandidate.stars}★ livres no mercado (ex: ${topMarketCandidate.name.trim()}) para potencializar o setor mais exigido.`
          : `O cargo de ${targetStaffRole} está vago na comissão técnica. Profissionais como ${topMarketCandidate.name.trim()} (${topMarketCandidate.stars}★) estão disponíveis para contratação imediata.`,
        evidenceLine: `${
          existingCoach ? `Atual: ${existingCoach.stars}★` : 'Cargo sem profissional ativo'
        } · Destaque disponível: ${topMarketCandidate.name.trim()} (${topMarketCandidate.stars}★)`,
        expectedBenefit: topMarketCandidate.bonusDescription,
        targetPlayerNames: [],
        targetPlayerIds: [],
        actionLabel: 'Ver Profissionais',
        canAlsoExecuteSession: false,
        isAlreadyApplied: false,
        payload: {
          openStaffRole: targetStaffRole,
        },
      });
    }
  }

  // Sort tips by priority (ALTA -> MEDIA -> OPORTUNIDADE)
  const priorityRank: Record<TrainingTipPriority, number> = {
    ALTA: 0,
    MEDIA: 1,
    OPORTUNIDADE: 2,
  };
  tips.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  const primaryTip = tips[0];
  const recommendedPrimaryFocus: TrainingFocus =
    avgSquadCondition < 60
      ? 'FISICO'
      : weakestSector.recommendedFocus;

  const assistantHeadline =
    avgSquadCondition < 60
      ? `Alerta físico: elenco com ${avgSquadCondition}% de condição pede regeneração antes de carga intensa`
      : `Ponto mais vulnerável do elenco atual: ${weakestSector.label} (média ${weakestSector.topAvgOvr.toFixed(
          1
        )} OVR)`;

  const assistantSummary = primaryTip
    ? `Recomendação principal da comissão: ${primaryTip.title.toLowerCase()}. Foco coletivo indicado: ${FOCUS_LABELS[recommendedPrimaryFocus]}.`
    : `Elenco equilibrado entre os setores (média ${overallTopAvg.toFixed(
        1
      )} OVR). Mantenha os focos individuais alinhados para maximizar o ganho de XP.`;

  const seasonalFocusRecommendation = evaluateSeasonalTrainingFocusRecommendation({
    club,
    allFixtures,
    gameState,
    weakestSector,
    avgSquadCondition,
    startersAvgCondition,
    tiredStartersCount: tiredStarters.length,
    matchesPlayed: matchMetrics.matchesPlayed,
    goalsForPerMatch: matchMetrics.goalsForPerMatch,
    goalsAgainstPerMatch: matchMetrics.goalsAgainstPerMatch,
  });

  return {
    assistantHeadline,
    assistantSummary,
    overallTopAvg,
    avgSquadCondition,
    startersAvgCondition,
    tiredStartersCount: tiredStarters.length,
    unalignedIndividualCount,
    recommendedPrimaryFocus,
    weakestSector,
    sectors,
    tips: tips.slice(0, 5),
    seasonalFocusRecommendation,
  };
}

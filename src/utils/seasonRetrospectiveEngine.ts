import {
  BoardGoalCategory,
  BoardSeasonGoal,
  Club,
  CompetitionType,
  Fixture,
  GameSave,
  Standing,
} from '../types/game';
import { COMPETITIONS_CATALOG } from './competitionsEngine';
import { formatShortDate } from './calendarUtils';
import { formatCurrency } from './individualAwardsEngine';
import {
  EUROPEAN_LEAGUES_META,
  getClubEuropeanLeagueId,
} from './europeLeaguesEngine';
import {
  getClubSouthAmericanLeagueId,
  SOUTH_AMERICAN_LEAGUES_META,
} from './southAmericaLeaguesEngine';
import {
  getClubWorldLeagueId,
  WORLD_LEAGUES_META,
} from './worldLeaguesEngine';
import {
  ESTADUAIS_2026_CONFIG,
  getClubEstadualConfig,
  getEstadualConfigByUf,
} from '../data/estaduais2026Config';

export type RetrospectiveGoalVerdict = 'EXCEEDED' | 'ACHIEVED' | 'FAILED';

export interface RetrospectiveGoalComparison {
  goalId: string;
  category: BoardGoalCategory;
  competitionLabel: string;
  title: string;
  description: string;
  priority: 'Principal' | 'Secundária';
  expectedLabel: string;
  actualLabel: string;
  deltaLabel: string;
  verdict: RetrospectiveGoalVerdict;
  rewardBonus: number;
  bonusEarned: number;
  // Optional league position scale metadata
  leaguePosition?: number;
  leagueTotalTeams?: number;
  targetPositionMax?: number;
  // Optional competition record snapshot
  competitionRecordText?: string;
}

export interface RetrospectiveSplitStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  winRatePct: number;
  cleanSheets: number;
}

export interface RetrospectiveCompetitionRun {
  competitionId: CompetitionType;
  competitionName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  winRatePct: number;
  outcomeLabel: string;
  wonTitle: boolean;
  boardGoalVerdict?: RetrospectiveGoalVerdict;
}

export interface RetrospectiveRecentMatch {
  fixtureId: string;
  opponentShortName: string;
  opponentName: string;
  isHome: boolean;
  userGoals: number;
  oppGoals: number;
  outcome: 'V' | 'E' | 'D';
  competitionShort: string;
  dateDisplay: string;
}

export interface RetrospectiveSquadLeader {
  playerId: string;
  playerName: string;
  role: string;
  age: number;
  overall: number;
  primaryMetric: string;
  secondaryMetric: string;
}

export interface SeasonRetrospectiveReport {
  seasonYear: number;
  seasonLabel: string;
  leagueName: string;
  // Board evaluation summary
  boardScore: number; // 0.0 to 10.0
  boardGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  boardVerdictTitle: string;
  boardVerdictSummary: string;
  boardConfidence: number;
  fanConfidence: number;
  managerReputation: number;
  goalsComparison: RetrospectiveGoalComparison[];
  goalsTotal: number;
  goalsAchievedCount: number;
  goalsExceededCount: number;
  goalsFailedCount: number;
  principalTotal: number;
  principalAchieved: number;
  totalBonusesEarned: number;
  totalBonusesPossible: number;
  trophiesWonCount: number;
  trophiesWonLabels: string[];
  // Campaign & League numbers
  overall: RetrospectiveSplitStats;
  home: RetrospectiveSplitStats;
  away: RetrospectiveSplitStats;
  leagueContext: {
    position: number | null;
    totalTeams: number;
    points: number;
    pointsPerGame: number;
    attackRank: number | null;
    defenseRank: number | null;
    championPoints: number | null;
    pointsGapToChampion: number | null;
    targetPositionMax: number | null;
    pointsGapToTarget: number | null;
  };
  competitionRuns: RetrospectiveCompetitionRun[];
  recentForm: RetrospectiveRecentMatch[];
  longestUnbeatenStreak: number;
  biggestWin: {
    scoreline: string;
    competitionLabel: string;
    dateDisplay: string;
  } | null;
  toughestLoss: {
    scoreline: string;
    competitionLabel: string;
    dateDisplay: string;
  } | null;
  // Squad highlights
  squadSnapshot: {
    squadSize: number;
    avgOverall: number;
    avgAge: number;
    topScorer: RetrospectiveSquadLeader | null;
    topAssister: RetrospectiveSquadLeader | null;
    mvpPlayer: RetrospectiveSquadLeader | null;
    mostImproved: RetrospectiveSquadLeader | null;
    bestYoungster: RetrospectiveSquadLeader | null;
  };
  // Financial scorecard
  financeSummary: {
    openingBalance: number;
    closingBalance: number;
    balanceDelta: number;
    totalIncome: number;
    totalExpenses: number;
    operationalResult: number;
    incomeSharePct: number;
    seasonTicketHolders: number;
  };
}

function getLeagueStandingsAndName(
  state: GameSave,
  club: Club
): { standings: Standing[]; leagueName: string; leagueCompId: CompetitionType } {
  if (club.division === 'EU') {
    const euId = getClubEuropeanLeagueId(club);
    if (euId && state.standingsEurope?.[euId]) {
      return {
        standings: state.standingsEurope[euId] || [],
        leagueName: EUROPEAN_LEAGUES_META[euId]?.name || 'Liga Europeia',
        leagueCompId: euId,
      };
    }
  }
  if (club.division === 'SA') {
    const saId = getClubSouthAmericanLeagueId(club);
    if (saId && state.standingsSouthAmerica?.[saId]) {
      return {
        standings: state.standingsSouthAmerica[saId] || [],
        leagueName: SOUTH_AMERICAN_LEAGUES_META[saId]?.name || 'Liga Sul-Americana',
        leagueCompId: saId,
      };
    }
  }
  if (club.division === 'WL') {
    const wlId = getClubWorldLeagueId(club);
    if (wlId && state.standingsWorldLeagues?.[wlId]) {
      return {
        standings: state.standingsWorldLeagues[wlId] || [],
        leagueName: WORLD_LEAGUES_META[wlId]?.name || 'Liga Nacional',
        leagueCompId: wlId,
      };
    }
  }
  if (club.division === 'EST') {
    const estCfg =
      getClubEstadualConfig(club) ||
      getEstadualConfigByUf('RN') ||
      ESTADUAIS_2026_CONFIG[0];
    return {
      standings: (state.standingsEstadual || []).filter((s) => s.group === estCfg.name),
      leagueName: estCfg.name,
      leagueCompId: 'estadual',
    };
  }
  switch (club.division) {
    case 'B':
      return {
        standings: state.standingsB || [],
        leagueName: 'Brasileirão Série B',
        leagueCompId: 'serie_b',
      };
    case 'C':
      return {
        standings: state.standingsC || [],
        leagueName: 'Brasileirão Série C',
        leagueCompId: 'serie_c',
      };
    case 'D':
      return {
        standings: state.standingsD || [],
        leagueName: 'Brasileirão Série D',
        leagueCompId: 'serie_d',
      };
    default:
      return {
        standings: state.standingsA || [],
        leagueName: 'Brasileirão Série A',
        leagueCompId: 'serie_a',
      };
  }
}

function phaseRank(phase?: string): number {
  const p = (phase || '').toLowerCase();
  if (p.includes('campe')) return 6;
  if (p.includes('grande final') || p.includes('decisão') || p === 'final') return 5;
  if (p.includes('semi')) return 4;
  if (p.includes('quartas')) return 3;
  if (p.includes('oitavas')) return 2;
  if (p.includes('playoff') || p.includes('16 avos') || p.includes('grupos')) return 1;
  return 1;
}

function formatTargetPhaseLabel(phaseKey?: string): string {
  const p = (phaseKey || '').toLowerCase();
  if (p.includes('final') && !p.includes('semi') && !p.includes('quartas') && !p.includes('oitavas')) {
    return 'Chegar à Final';
  }
  if (p.includes('semi')) return 'Chegar às Semifinais';
  if (p.includes('quartas')) return 'Chegar às Quartas de Final';
  if (p.includes('oitavas')) return 'Avançar às Oitavas de Final';
  return 'Avançar de Fase';
}

function computeSplitStats(fixtures: Fixture[], clubId: string): RetrospectiveSplitStats {
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;

  for (const f of fixtures) {
    const isHome = f.homeTeamId === clubId;
    const ug = isHome ? f.homeScore ?? 0 : f.awayScore ?? 0;
    const og = isHome ? f.awayScore ?? 0 : f.homeScore ?? 0;
    goalsFor += ug;
    goalsAgainst += og;
    if (og === 0) cleanSheets += 1;
    if (ug > og) won += 1;
    else if (ug === og) drawn += 1;
    else lost += 1;
  }

  const played = fixtures.length;
  const winRatePct =
    played > 0 ? Math.round(((won * 3 + drawn) / (played * 3)) * 100) : 0;

  return {
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    winRatePct,
    cleanSheets,
  };
}

function resolveGoalCupFixtures(state: GameSave, goal: BoardSeasonGoal): Fixture[] {
  if (goal.category === 'NATIONAL_CUP') {
    return state.fixturesCopaBrasil || [];
  }
  if (goal.category === 'STATE_CUP') {
    return state.fixturesEstadual || [];
  }
  if (goal.category === 'CONTINENTAL') {
    const label = goal.competitionLabel.toLowerCase();
    if (label.includes('afc')) return state.fixturesAfcChampions || [];
    if (label.includes('concacaf')) return state.fixturesConcacafChampions || [];
    if (label.includes('internacional')) return state.fixturesCopaInternacional || [];
    if (label.includes('champions')) return state.fixturesChampionsLeague || [];
    if (label.includes('europa')) return state.fixturesEuropaLeague || [];
    if (label.includes('conference')) return state.fixturesConferenceLeague || [];
    if (label.includes('libertadores')) return state.fixturesLibertadores || [];
    return state.fixturesSulamericana || [];
  }
  return [];
}

function didUserWinCupCompetition(
  state: GameSave,
  seasonYear: number,
  competitionLabel: string
): boolean {
  const norm = competitionLabel.toLowerCase();
  return (state.trophyHistory || []).some((t) => {
    if (t.year !== seasonYear || !t.userWon) return false;
    const comp = t.competition.toLowerCase();
    return (
      comp.includes(norm) ||
      norm.includes(comp) ||
      (norm.includes('libertadores') && comp.includes('libertadores')) ||
      (norm.includes('sul-americana') && comp.includes('sul-americana')) ||
      (norm.includes('copa do brasil') && comp.includes('copa do brasil')) ||
      (norm.includes('champions') && comp.includes('champions')) ||
      (norm.includes('europa league') && comp.includes('europa')) ||
      (norm.includes('conference') && comp.includes('conference')) ||
      (norm.includes('concacaf') && comp.includes('concacaf')) ||
      (norm.includes('afc') && comp.includes('afc'))
    );
  });
}

export function buildSeasonRetrospective(params: {
  gameState: GameSave;
  userClub: Club;
  clubsWithWorldGuests: Club[];
  allCompetitionsFixtures: Fixture[];
  seasonYear: number;
  seasonLabel: string;
}): SeasonRetrospectiveReport {
  const {
    gameState,
    userClub,
    clubsWithWorldGuests,
    allCompetitionsFixtures,
    seasonYear,
    seasonLabel,
  } = params;

  const clubMap = new Map(clubsWithWorldGuests.map((c) => [c.id, c]));
  const career = gameState.managerCareer;
  const boardConfidence = career?.boardConfidence ?? 75;
  const fanConfidence = career?.fanConfidence ?? 72;
  const managerReputation = career?.managerReputation ?? 60;

  const { standings: leagueStandings, leagueName, leagueCompId } =
    getLeagueStandingsAndName(gameState, userClub);

  const userRankIdx = leagueStandings.findIndex((s) => s.teamId === userClub.id);
  const leaguePosition = userRankIdx >= 0 ? userRankIdx + 1 : null;
  const userStanding = userRankIdx >= 0 ? leagueStandings[userRankIdx] : null;
  const leagueTotalTeams = leagueStandings.length;
  const championStanding = leagueStandings[0] || null;

  // Attack & defense rank in league
  const byAttack = [...leagueStandings].sort(
    (a, b) => b.goalsFor - a.goalsFor || b.goalDifference - a.goalDifference
  );
  const byDefense = [...leagueStandings].sort(
    (a, b) => a.goalsAgainst - b.goalsAgainst || b.goalDifference - a.goalDifference
  );
  const attackRankIdx = byAttack.findIndex((s) => s.teamId === userClub.id);
  const defenseRankIdx = byDefense.findIndex((s) => s.teamId === userClub.id);

  // Official user matches played (excluding friendlies for competitive stats, fallback to all if none)
  const allUserPlayed = allCompetitionsFixtures
    .filter(
      (f) =>
        f.played &&
        (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
    )
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.round - b.round);

  const officialUserPlayed = allUserPlayed.filter(
    (f) => f.competition !== 'amistoso_internacional'
  );
  const activeMatches = officialUserPlayed.length > 0 ? officialUserPlayed : allUserPlayed;

  const overall = computeSplitStats(activeMatches, userClub.id);
  const home = computeSplitStats(
    activeMatches.filter((f) => f.homeTeamId === userClub.id),
    userClub.id
  );
  const away = computeSplitStats(
    activeMatches.filter((f) => f.awayTeamId === userClub.id),
    userClub.id
  );

  // Longest unbeaten streak & notable matches
  let longestUnbeatenStreak = 0;
  let currentStreak = 0;
  let biggestWinFix: { f: Fixture; diff: number; gf: number } | null = null;
  let toughestLossFix: { f: Fixture; diff: number; ga: number } | null = null;

  for (const f of activeMatches) {
    const isHome = f.homeTeamId === userClub.id;
    const ug = isHome ? f.homeScore ?? 0 : f.awayScore ?? 0;
    const og = isHome ? f.awayScore ?? 0 : f.homeScore ?? 0;
    const diff = ug - og;

    if (diff >= 0) {
      currentStreak += 1;
      if (currentStreak > longestUnbeatenStreak) {
        longestUnbeatenStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }

    if (diff > 0) {
      if (
        !biggestWinFix ||
        diff > biggestWinFix.diff ||
        (diff === biggestWinFix.diff && ug > biggestWinFix.gf)
      ) {
        biggestWinFix = { f, diff, gf: ug };
      }
    } else if (diff < 0) {
      if (
        !toughestLossFix ||
        diff < toughestLossFix.diff ||
        (diff === toughestLossFix.diff && og > toughestLossFix.ga)
      ) {
        toughestLossFix = { f, diff, ga: og };
      }
    }
  }

  const formatFixtureHighlight = (f: Fixture) => {
    const homeShort = clubMap.get(f.homeTeamId)?.shortName || f.homeTeamId;
    const awayShort = clubMap.get(f.awayTeamId)?.shortName || f.awayTeamId;
    const compLabel =
      COMPETITIONS_CATALOG[f.competition]?.shortName ||
      f.cupPhase ||
      'Partida Oficial';
    return {
      scoreline: `${homeShort} ${f.homeScore ?? 0} × ${f.awayScore ?? 0} ${awayShort}`,
      competitionLabel: compLabel,
      dateDisplay: f.date ? formatShortDate(f.date) : seasonLabel,
    };
  };

  const recentForm: RetrospectiveRecentMatch[] = activeMatches.slice(-10).map((f) => {
    const isHome = f.homeTeamId === userClub.id;
    const oppId = isHome ? f.awayTeamId : f.homeTeamId;
    const opp = clubMap.get(oppId);
    const ug = isHome ? f.homeScore ?? 0 : f.awayScore ?? 0;
    const og = isHome ? f.awayScore ?? 0 : f.homeScore ?? 0;
    const outcome: 'V' | 'E' | 'D' = ug > og ? 'V' : ug === og ? 'E' : 'D';
    return {
      fixtureId: f.id,
      opponentShortName: opp?.shortName || oppId,
      opponentName: opp?.name || oppId,
      isHome,
      userGoals: ug,
      oppGoals: og,
      outcome,
      competitionShort: COMPETITIONS_CATALOG[f.competition]?.shortName || 'Oficial',
      dateDisplay: f.date ? formatShortDate(f.date) : `R${f.round}`,
    };
  });

  // Trophies won this season
  const userSeasonTrophies = (gameState.trophyHistory || []).filter(
    (t) => t.year === seasonYear && t.userWon
  );
  const trophiesWonLabels = userSeasonTrophies.map((t) => t.competition);

  // Build Goal-by-Goal comparison
  const rawGoals = career?.seasonGoals || [];
  let leagueTargetPositionMax: number | null = null;

  const goalsComparison: RetrospectiveGoalComparison[] = rawGoals.map((goal) => {
    if (goal.category === 'LEAGUE' && goal.targetPositionMax) {
      leagueTargetPositionMax = goal.targetPositionMax;
      const targetPos = goal.targetPositionMax;
      const actualPos = leaguePosition ?? leagueTotalTeams;
      const pts = userStanding?.points ?? 0;
      const w = userStanding?.won ?? 0;
      const d = userStanding?.drawn ?? 0;
      const l = userStanding?.lost ?? 0;
      const gd = userStanding?.goalDifference ?? 0;
      const gdStr = gd >= 0 ? `+${gd}` : `${gd}`;

      const diffPositions = targetPos - actualPos; // positive means finished better than target
      let verdict: RetrospectiveGoalVerdict = 'FAILED';
      if (actualPos <= targetPos) {
        verdict =
          actualPos === 1 && targetPos > 1
            ? 'EXCEEDED'
            : diffPositions >= 3
            ? 'EXCEEDED'
            : 'ACHIEVED';
      }

      const expectedLabel =
        targetPos === 1
          ? 'Conquistar o Título (1º lugar)'
          : `Terminar no Top ${targetPos} (${targetPos}º ou melhor)`;
      const actualLabel = leaguePosition
        ? `${leaguePosition}º lugar de ${leagueTotalTeams} · ${pts} pts`
        : goal.currentProgressText;
      const deltaLabel =
        actualPos === 1 && targetPos > 1
          ? `Campeão (${diffPositions} pos. acima da meta)`
          : diffPositions > 0
          ? `+${diffPositions} ${diffPositions === 1 ? 'posição' : 'posições'} acima da meta`
          : diffPositions === 0
          ? 'Meta cumprida na posição exata'
          : `${Math.abs(diffPositions)} ${
              Math.abs(diffPositions) === 1 ? 'posição' : 'posições'
            } abaixo da meta`;

      return {
        goalId: goal.id,
        category: goal.category,
        competitionLabel: goal.competitionLabel,
        title: goal.title,
        description: goal.description,
        priority: goal.priority,
        expectedLabel,
        actualLabel,
        deltaLabel,
        verdict,
        rewardBonus: goal.rewardBonus,
        bonusEarned: verdict !== 'FAILED' ? goal.rewardBonus : 0,
        leaguePosition: leaguePosition ?? undefined,
        leagueTotalTeams: leagueTotalTeams || undefined,
        targetPositionMax: targetPos,
        competitionRecordText: `${w}V · ${d}E · ${l}D · SG ${gdStr}`,
      };
    }

    if (goal.category === 'FINANCE') {
      const opening =
        userClub.finances.seasonStartBalance ??
        userClub.finances.balance -
          (userClub.finances.totalIncomeSeason - userClub.finances.totalExpensesSeason);
      const closing = userClub.finances.balance;
      const operational =
        userClub.finances.totalIncomeSeason - userClub.finances.totalExpensesSeason;
      const achieved = closing >= 0;
      const exceeded = achieved && operational > 0 && closing > opening;
      const verdict: RetrospectiveGoalVerdict = exceeded
        ? 'EXCEEDED'
        : achieved
        ? 'ACHIEVED'
        : 'FAILED';

      return {
        goalId: goal.id,
        category: goal.category,
        competitionLabel: goal.competitionLabel,
        title: goal.title,
        description: goal.description,
        priority: goal.priority,
        expectedLabel: 'Saldo final positivo (≥ R$ 0)',
        actualLabel: `Saldo final: ${formatCurrency(closing)}`,
        deltaLabel:
          operational >= 0
            ? `Superávit operacional de +${formatCurrency(operational)}`
            : `Déficit operacional de ${formatCurrency(operational)}`,
        verdict,
        rewardBonus: goal.rewardBonus,
        bonusEarned: verdict !== 'FAILED' ? goal.rewardBonus : 0,
        competitionRecordText: `Receita ${formatCurrency(
          userClub.finances.totalIncomeSeason
        )} · Despesa ${formatCurrency(userClub.finances.totalExpensesSeason)}`,
      };
    }

    if (goal.category === 'STATE_CUP') {
      const estFixtures = resolveGoalCupFixtures(gameState, goal).filter(
        (f) => f.played && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
      );
      const estStats = computeSplitStats(estFixtures, userClub.id);
      const wonState = didUserWinCupCompetition(gameState, seasonYear, goal.competitionLabel);
      const reachedFinal = estFixtures.some((f) => {
        const ph = (f.cupPhase || '').toLowerCase();
        return ph.includes('final') && !ph.includes('semi');
      });
      const achieved = goal.status === 'ACHIEVED' || wonState || reachedFinal;
      const verdict: RetrospectiveGoalVerdict = wonState
        ? 'EXCEEDED'
        : achieved
        ? 'ACHIEVED'
        : 'FAILED';

      return {
        goalId: goal.id,
        category: goal.category,
        competitionLabel: goal.competitionLabel,
        title: goal.title,
        description: goal.description,
        priority: goal.priority,
        expectedLabel: 'Chegar às Semifinais (Top 4)',
        actualLabel: wonState
          ? 'Campeão Estadual'
          : reachedFinal
          ? 'Vice-Campeão / Finalista'
          : goal.currentProgressText,
        deltaLabel: wonState
          ? 'Título conquistado (acima da meta)'
          : achieved
          ? 'Meta estadual cumprida'
          : 'Eliminado antes da fase alvo',
        verdict,
        rewardBonus: goal.rewardBonus,
        bonusEarned: verdict !== 'FAILED' ? goal.rewardBonus : 0,
        competitionRecordText:
          estStats.played > 0
            ? `${estStats.played}J · ${estStats.won}V ${estStats.drawn}E ${estStats.lost}D`
            : undefined,
      };
    }

    // NATIONAL_CUP or CONTINENTAL
    const cupFixtures = resolveGoalCupFixtures(gameState, goal).filter(
      (f) => f.played && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
    );
    const cupStats = computeSplitStats(cupFixtures, userClub.id);
    const wonCup = didUserWinCupCompetition(gameState, seasonYear, goal.competitionLabel);
    const targetRank = phaseRank(goal.targetCupPhase || 'oitavas');
    const highestReached =
      cupFixtures.length > 0
        ? Math.max(...cupFixtures.map((f) => phaseRank(f.cupPhase)))
        : 0;
    const latestFixture = cupFixtures[cupFixtures.length - 1];
    const reachedLabel = wonCup
      ? 'Campeão do Torneio'
      : latestFixture?.cupPhase || goal.currentProgressText || 'Fase Inicial';

    const effectiveRank = wonCup ? 6 : highestReached;
    const achieved =
      goal.status === 'ACHIEVED' || wonCup || effectiveRank >= targetRank;
    const exceeded = wonCup || (achieved && effectiveRank > targetRank);
    const verdict: RetrospectiveGoalVerdict = exceeded
      ? 'EXCEEDED'
      : achieved
      ? 'ACHIEVED'
      : 'FAILED';

    const phaseGap = effectiveRank - targetRank;
    const deltaLabel = wonCup
      ? 'Título conquistado (superou a meta)'
      : phaseGap > 0
      ? `Avançou ${phaseGap} ${phaseGap === 1 ? 'fase' : 'fases'} além da meta`
      : achieved
      ? 'Fase alvo alcançada'
      : 'Eliminação precoce antes da fase esperada';

    return {
      goalId: goal.id,
      category: goal.category,
      competitionLabel: goal.competitionLabel,
      title: goal.title,
      description: goal.description,
      priority: goal.priority,
      expectedLabel: formatTargetPhaseLabel(goal.targetCupPhase),
      actualLabel: reachedLabel,
      deltaLabel,
      verdict,
      rewardBonus: goal.rewardBonus,
      bonusEarned: verdict !== 'FAILED' ? goal.rewardBonus : 0,
      competitionRecordText:
        cupStats.played > 0
          ? `${cupStats.played}J · ${cupStats.won}V ${cupStats.drawn}E ${cupStats.lost}D · ${cupStats.goalsFor}:${cupStats.goalsAgainst}`
          : undefined,
    };
  });

  // Aggregate goal counts and bonuses
  const goalsTotal = goalsComparison.length;
  const goalsExceededCount = goalsComparison.filter((g) => g.verdict === 'EXCEEDED').length;
  const goalsAchievedCount = goalsComparison.filter((g) => g.verdict !== 'FAILED').length;
  const goalsFailedCount = goalsComparison.filter((g) => g.verdict === 'FAILED').length;
  const principalGoals = goalsComparison.filter((g) => g.priority === 'Principal');
  const principalTotal = principalGoals.length;
  const principalAchieved = principalGoals.filter((g) => g.verdict !== 'FAILED').length;
  const totalBonusesEarned = goalsComparison.reduce((acc, g) => acc + g.bonusEarned, 0);
  const totalBonusesPossible = goalsComparison.reduce((acc, g) => acc + g.rewardBonus, 0);

  // Transparent weighted Board Score (0.0 to 10.0) from real season outcomes
  let weightedEarned = 0;
  let weightedTotal = 0;
  for (const g of goalsComparison) {
    const weight = g.priority === 'Principal' ? 2.5 : 1.0;
    weightedTotal += weight;
    if (g.verdict === 'EXCEEDED') weightedEarned += weight * 1.15;
    else if (g.verdict === 'ACHIEVED') weightedEarned += weight * 0.92;
    else weightedEarned += weight * 0.25;
  }
  const baseGoalRatio = weightedTotal > 0 ? weightedEarned / weightedTotal : 0.7;
  const trophyBonus = Math.min(1.4, trophiesWonLabels.length * 0.7);
  const winRateFactor = (overall.winRatePct / 100) * 1.2;
  const rawScore = Math.min(
    10,
    Math.max(1.5, baseGoalRatio * 7.8 + trophyBonus + winRateFactor)
  );
  const boardScore = Math.round(rawScore * 10) / 10;

  let boardGrade: SeasonRetrospectiveReport['boardGrade'] = 'C';
  let boardVerdictTitle = 'Temporada Regular';
  if (boardScore >= 9.2) {
    boardGrade = 'A+';
    boardVerdictTitle = 'Temporada Histórica · Aprovação Plena';
  } else if (boardScore >= 8.2) {
    boardGrade = 'A';
    boardVerdictTitle = 'Campanha Excelente · Diretoria Satisfeita';
  } else if (boardScore >= 7.2) {
    boardVerdictTitle = 'Desempenho Sólido · Metas Encaminhadas';
    boardGrade = 'B+';
  } else if (boardScore >= 6.0) {
    boardGrade = 'B';
    boardVerdictTitle = 'Temporada Equilibrada · Ajustes Pontuais';
  } else if (boardScore >= 4.5) {
    boardGrade = 'C';
    boardVerdictTitle = 'Abaixo do Esperado · Pressão do Conselho';
  } else {
    boardGrade = 'D';
    boardVerdictTitle = 'Campanha Frustrante · Cobrança Severa';
  }

  // Contextual Board Evaluation Narrative
  let boardVerdictSummary = '';
  if (goalsTotal === 0) {
    boardVerdictSummary = `O ${userClub.name} encerrou a temporada com ${overall.winRatePct}% de aproveitamento em ${overall.played} partidas oficiais.`;
  } else if (goalsFailedCount === 0 && goalsExceededCount > 0) {
    boardVerdictSummary = `Todas as ${goalsTotal} metas da diretoria foram cumpridas — com superação em ${goalsExceededCount} ${
      goalsExceededCount === 1 ? 'objetivo' : 'objetivos'
    }. O conselho destaca o trabalho da comissão técnica e libera ${formatCurrency(
      totalBonusesEarned
    )} em premiações por metas.`;
  } else if (goalsFailedCount === 0) {
    boardVerdictSummary = `Projeto entregue com precisão: ${goalsAchievedCount} de ${goalsTotal} objetivos atingidos e ${formatCurrency(
      totalBonusesEarned
    )} garantidos em bônus de metas. A diretoria mantém respaldo firme para o próximo ciclo.`;
  } else if (principalAchieved === principalTotal && principalTotal > 0) {
    boardVerdictSummary = `As metas principais foram cumpridas (${principalAchieved}/${principalTotal}), sustentando a confiança do conselho, embora ${goalsFailedCount} ${
      goalsFailedCount === 1 ? 'objetivo secundário tenha ficado' : 'objetivos secundários tenham ficado'
    } pelo caminho.`;
  } else if (goalsAchievedCount > 0) {
    boardVerdictSummary = `Campanha de altos e baixos: ${goalsAchievedCount} de ${goalsTotal} metas alcançadas, mas houve tropeço em objetivo principal. A diretoria pede correção de rota e mais consistência na temporada ${
      seasonYear + 1
    }.`;
  } else {
    boardVerdictSummary = `Nenhuma das ${goalsTotal} metas estipuladas no planejamento anual foi atingida. O conselho avalia o desempenho com preocupação e exige resposta imediata na próxima temporada.`;
  }

  // League target points gap
  const targetStanding =
    leagueTargetPositionMax &&
    leagueTargetPositionMax >= 1 &&
    leagueTargetPositionMax <= leagueStandings.length
      ? leagueStandings[leagueTargetPositionMax - 1]
      : null;
  const pointsGapToChampion =
    userStanding && championStanding
      ? userStanding.points - championStanding.points
      : null;
  const pointsGapToTarget =
    userStanding && targetStanding
      ? userStanding.points - targetStanding.points
      : null;

  // Competition-by-competition breakdown
  const byCompMap = new Map<CompetitionType, Fixture[]>();
  for (const f of activeMatches) {
    const arr = byCompMap.get(f.competition) || [];
    arr.push(f);
    byCompMap.set(f.competition, arr);
  }

  const competitionRuns: RetrospectiveCompetitionRun[] = Array.from(byCompMap.entries())
    .map(([compId, fixtures]) => {
      const st = computeSplitStats(fixtures, userClub.id);
      const meta = COMPETITIONS_CATALOG[compId];
      const compName =
        compId === leagueCompId ? leagueName : meta?.name || compId;
      const wonTitle =
        (compId === leagueCompId && leaguePosition === 1) ||
        didUserWinCupCompetition(gameState, seasonYear, compName);

      let outcomeLabel = '';
      if (wonTitle) {
        outcomeLabel = 'Campeão';
      } else if (compId === leagueCompId && leaguePosition) {
        outcomeLabel = `${leaguePosition}º Lugar (${userStanding?.points ?? 0} pts)`;
      } else {
        const lastFix = fixtures[fixtures.length - 1];
        outcomeLabel = lastFix?.cupPhase || 'Participação';
      }

      // Link to matching board goal verdict if any
      const matchedGoal = goalsComparison.find((g) => {
        if (g.category === 'LEAGUE' && compId === leagueCompId) return true;
        if (g.category === 'NATIONAL_CUP' && compId === 'copa_brasil') return true;
        if (g.category === 'STATE_CUP' && compId === 'estadual') return true;
        if (g.category === 'CONTINENTAL') {
          const gl = g.competitionLabel.toLowerCase();
          const cl = compName.toLowerCase();
          return gl.includes(cl) || cl.includes(gl);
        }
        return false;
      });

      return {
        competitionId: compId,
        competitionName: compName,
        played: st.played,
        won: st.won,
        drawn: st.drawn,
        lost: st.lost,
        goalsFor: st.goalsFor,
        goalsAgainst: st.goalsAgainst,
        winRatePct: st.winRatePct,
        outcomeLabel,
        wonTitle,
        boardGoalVerdict: matchedGoal?.verdict,
      };
    })
    .sort((a, b) => {
      if (a.competitionId === leagueCompId) return -1;
      if (b.competitionId === leagueCompId) return 1;
      return b.played - a.played;
    });

  // Squad Highlights
  const squad = userClub.squad || [];
  const avgOverall =
    squad.length > 0
      ? Math.round((squad.reduce((s, p) => s + p.overall, 0) / squad.length) * 10) / 10
      : 0;
  const avgAge =
    squad.length > 0
      ? Math.round((squad.reduce((s, p) => s + p.age, 0) / squad.length) * 10) / 10
      : 0;

  const topScorerPlayer = [...squad]
    .filter((p) => (p.goals || 0) > 0)
    .sort((a, b) => (b.goals || 0) - (a.goals || 0) || (b.assists || 0) - (a.assists || 0))[0];
  const topAssisterPlayer = [...squad]
    .filter((p) => (p.assists || 0) > 0)
    .sort((a, b) => (b.assists || 0) - (a.assists || 0) || (b.goals || 0) - (a.goals || 0))[0];
  const mvpCandidate = [...squad]
    .filter((p) => (p.matches || 0) >= 3 && (p.ratingAverage || 0) > 0)
    .sort(
      (a, b) =>
        (b.ratingAverage || 0) - (a.ratingAverage || 0) ||
        (b.goals || 0) + (b.assists || 0) - ((a.goals || 0) + (a.assists || 0))
    )[0];
  const mostImprovedCandidate = [...squad]
    .map((p) => ({
      player: p,
      delta: p.overall - (p.seasonStartOverall ?? p.overall),
    }))
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta || b.player.overall - a.player.overall)[0];
  const bestYoungsterCandidate = [...squad]
    .filter((p) => p.age <= 21 && (p.matches || 0) >= 2)
    .sort((a, b) => {
      const scoreA =
        (a.goals || 0) * 3 +
        (a.assists || 0) * 2 +
        (a.ratingAverage || 6) * 4 +
        (a.overall - (a.seasonStartOverall ?? a.overall)) * 3;
      const scoreB =
        (b.goals || 0) * 3 +
        (b.assists || 0) * 2 +
        (b.ratingAverage || 6) * 4 +
        (b.overall - (b.seasonStartOverall ?? b.overall)) * 3;
      return scoreB - scoreA;
    })[0];

  // Finance summary
  const totalIncome = userClub.finances.totalIncomeSeason || 0;
  const totalExpenses = userClub.finances.totalExpensesSeason || 0;
  const operationalResult = totalIncome - totalExpenses;
  const closingBalance = userClub.finances.balance || 0;
  const openingBalance =
    userClub.finances.seasonStartBalance ?? closingBalance - operationalResult;
  const balanceDelta = closingBalance - openingBalance;
  const totalVolume = totalIncome + totalExpenses;
  const incomeSharePct =
    totalVolume > 0 ? Math.round((totalIncome / totalVolume) * 100) : 50;

  return {
    seasonYear,
    seasonLabel,
    leagueName,
    boardScore,
    boardGrade,
    boardVerdictTitle,
    boardVerdictSummary,
    boardConfidence,
    fanConfidence,
    managerReputation,
    goalsComparison,
    goalsTotal,
    goalsAchievedCount,
    goalsExceededCount,
    goalsFailedCount,
    principalTotal,
    principalAchieved,
    totalBonusesEarned,
    totalBonusesPossible,
    trophiesWonCount: trophiesWonLabels.length,
    trophiesWonLabels,
    overall,
    home,
    away,
    leagueContext: {
      position: leaguePosition,
      totalTeams: leagueTotalTeams,
      points: userStanding?.points ?? 0,
      pointsPerGame:
        userStanding && userStanding.played > 0
          ? Math.round((userStanding.points / userStanding.played) * 100) / 100
          : 0,
      attackRank: attackRankIdx >= 0 ? attackRankIdx + 1 : null,
      defenseRank: defenseRankIdx >= 0 ? defenseRankIdx + 1 : null,
      championPoints: championStanding?.points ?? null,
      pointsGapToChampion,
      targetPositionMax: leagueTargetPositionMax,
      pointsGapToTarget,
    },
    competitionRuns,
    recentForm,
    longestUnbeatenStreak,
    biggestWin: biggestWinFix ? formatFixtureHighlight(biggestWinFix.f) : null,
    toughestLoss: toughestLossFix ? formatFixtureHighlight(toughestLossFix.f) : null,
    squadSnapshot: {
      squadSize: squad.length,
      avgOverall,
      avgAge,
      topScorer: topScorerPlayer
        ? {
            playerId: topScorerPlayer.id,
            playerName: topScorerPlayer.name,
            role: topScorerPlayer.detailedRole,
            age: topScorerPlayer.age,
            overall: topScorerPlayer.overall,
            primaryMetric: `${topScorerPlayer.goals} gols`,
            secondaryMetric: `${topScorerPlayer.assists} assist. · ${topScorerPlayer.matches} jogos`,
          }
        : null,
      topAssister: topAssisterPlayer
        ? {
            playerId: topAssisterPlayer.id,
            playerName: topAssisterPlayer.name,
            role: topAssisterPlayer.detailedRole,
            age: topAssisterPlayer.age,
            overall: topAssisterPlayer.overall,
            primaryMetric: `${topAssisterPlayer.assists} assist.`,
            secondaryMetric: `${topAssisterPlayer.goals} gols · ${topAssisterPlayer.matches} jogos`,
          }
        : null,
      mvpPlayer: mvpCandidate
        ? {
            playerId: mvpCandidate.id,
            playerName: mvpCandidate.name,
            role: mvpCandidate.detailedRole,
            age: mvpCandidate.age,
            overall: mvpCandidate.overall,
            primaryMetric: `Nota ${mvpCandidate.ratingAverage.toFixed(2)}`,
            secondaryMetric: `${mvpCandidate.goals}G ${mvpCandidate.assists}A · ${mvpCandidate.matches} jogos`,
          }
        : null,
      mostImproved: mostImprovedCandidate
        ? {
            playerId: mostImprovedCandidate.player.id,
            playerName: mostImprovedCandidate.player.name,
            role: mostImprovedCandidate.player.detailedRole,
            age: mostImprovedCandidate.player.age,
            overall: mostImprovedCandidate.player.overall,
            primaryMetric: `+${mostImprovedCandidate.delta} OVR`,
            secondaryMetric: `Evoluiu de ${
              mostImprovedCandidate.player.seasonStartOverall ??
              mostImprovedCandidate.player.overall - mostImprovedCandidate.delta
            } para ${mostImprovedCandidate.player.overall}`,
          }
        : null,
      bestYoungster: bestYoungsterCandidate
        ? {
            playerId: bestYoungsterCandidate.id,
            playerName: bestYoungsterCandidate.name,
            role: bestYoungsterCandidate.detailedRole,
            age: bestYoungsterCandidate.age,
            overall: bestYoungsterCandidate.overall,
            primaryMetric: `${bestYoungsterCandidate.age} anos · OVR ${bestYoungsterCandidate.overall}`,
            secondaryMetric: `${bestYoungsterCandidate.goals}G ${bestYoungsterCandidate.assists}A · Nota ${(
              bestYoungsterCandidate.ratingAverage || 6.5
            ).toFixed(2)}`,
          }
        : null,
    },
    financeSummary: {
      openingBalance,
      closingBalance,
      balanceDelta,
      totalIncome,
      totalExpenses,
      operationalResult,
      incomeSharePct,
      seasonTicketHolders: userClub.finances.seasonTicketHolders || 0,
    },
  };
}

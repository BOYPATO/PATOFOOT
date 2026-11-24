import {
  Club,
  DetailedRole,
  EuropeanLeagueId,
  Fixture,
  GameSave,
  IndividualAwardRecord,
  Player,
  Position,
  SeasonCompetitionArchive,
  SeasonCompetitionRegion,
  SeasonCompetitionTier,
  SeasonContinentScope,
  SeasonHistoryRecord,
  SeasonMajorHonor,
  SeasonPlayerStatSnapshot,
  SeasonTeamOfTheYearSlot,
  SouthAmericanLeagueId,
  Standing,
  TrophyRecord,
} from '../types/game';
import {
  COMPETITIONS_CATALOG,
  ESTADUAL_TOURNAMENT_KEYS,
} from './competitionsEngine';
import {
  EUROPEAN_LEAGUE_IDS,
  EUROPEAN_LEAGUES_META,
  getClubEuropeanLeagueId,
} from './europeLeaguesEngine';
import {
  getClubSouthAmericanLeagueId,
  SOUTH_AMERICAN_LEAGUE_IDS,
  SOUTH_AMERICAN_LEAGUES_META,
} from './southAmericaLeaguesEngine';
import {
  getClubWorldLeagueId,
  isSplitCalendarClub,
  JAN_DEC_WORLD_LEAGUE_IDS,
  SPLIT_YEAR_WORLD_LEAGUE_IDS,
  WORLD_LEAGUE_IDS,
  WORLD_LEAGUES_META,
} from './worldLeaguesEngine';
import { withWorldGuestClubs } from './intercontinentalEngine';
import { computeCompetitionPlayerStats } from './statsCentralEngine';
import { formatEuropeanSeason } from './calendarUtils';
import { computeWorldBallonDorStandings } from './worldBallonDorEngine';

export interface ClubAllTimeTitleEntry {
  clubKey: string;
  clubId?: string;
  clubName: string;
  clubShortName: string;
  clubColors: { primary: string; secondary: string; text: string };
  isUserClub: boolean;
  totalTitles: number;
  runnerUps: number;
  worldTitles: number;
  continentalTitles: number;
  nationalLeagueTitles: number;
  cupTitles: number;
  stateTitles: number;
  seasonsWonLabels: string[];
  titlesByCompetition: Record<string, number>;
}

export interface PlayerAllTimeCareerEntry {
  playerId: string;
  playerName: string;
  position: Position;
  detailedRole: DetailedRole;
  age: number;
  peakOverall: number;
  latestClubId: string;
  latestClubName: string;
  latestClubShortName: string;
  latestClubColors: { primary: string; secondary: string; text: string };
  isUserClubPlayer: boolean;
  isActiveInSquads: boolean;
  seasonsRecorded: number;
  matches: number;
  goals: number;
  assists: number;
  goalContributions: number;
  goalsPerMatch: number;
  avgSeasonRating: number;
  goldenBootsCount: number;
  playmakerAwardsCount: number;
  mvpAwardsCount: number;
  bestKeeperAwardsCount: number;
  revelationAwardsCount: number;
  totyAppearances: number;
  clubsRepresented: string[];
  bestSingleSeasonGoals: number;
  bestSingleSeasonGoalsLabel: string;
  bestSingleSeasonAssists: number;
  bestSingleSeasonAssistsLabel: string;
}

export interface SingleSeasonHistoricalRecord {
  recordType: 'GOALS_SEASON' | 'ASSISTS_SEASON' | 'CONTRIBUTIONS_SEASON' | 'CLUB_TITLES_SEASON';
  label: string;
  holderName: string;
  holderSubLabel: string;
  seasonLabel: string;
  value: number;
  unitLabel: string;
  clubColors: { primary: string; secondary: string; text: string };
  playerId?: string;
  clubId?: string;
}

export interface AllTimeGeneralHistorySummary {
  seasonsEvaluatedCount: number;
  completedSeasonsCount: number;
  totalTitlesDecided: number;
  availableCompetitionsForFilter: { id: string; name: string; region: SeasonCompetitionRegion }[];
  clubTitleRankings: ClubAllTimeTitleEntry[];
  allTimeScorers: PlayerAllTimeCareerEntry[];
  allTimeAssisters: PlayerAllTimeCareerEntry[];
  hallOfFamePlayers: PlayerAllTimeCareerEntry[];
  allTimeTeamOfTheYear: SeasonTeamOfTheYearSlot[];
  singleSeasonRecords: SingleSeasonHistoricalRecord[];
}

const DEFAULT_COLORS = {
  primary: '#1e293b',
  secondary: '#0f172a',
  text: '#f8fafc',
};

function resolveTwoOrSingleFinalResult(
  leg1: Fixture | undefined,
  leg2OrSingle: Fixture | undefined
): {
  champId: string;
  runnerUpId: string;
  summary: string;
} | null {
  if (!leg2OrSingle || !leg2OrSingle.played) return null;

  const h = leg2OrSingle.homeScore ?? 0;
  const a = leg2OrSingle.awayScore ?? 0;

  // Two-legged final
  if (leg1 && leg1.played) {
    const teamA = leg1.homeTeamId;
    const teamB = leg1.awayTeamId;
    const goalsA = (leg1.homeScore ?? 0) + (leg2OrSingle.awayScore ?? 0);
    const goalsB = (leg1.awayScore ?? 0) + (leg2OrSingle.homeScore ?? 0);

    let champId = leg2OrSingle.aggregateWinnerId || '';
    if (!champId) {
      if (
        leg2OrSingle.penaltiesHome !== undefined &&
        leg2OrSingle.penaltiesAway !== undefined &&
        leg2OrSingle.penaltiesHome !== leg2OrSingle.penaltiesAway
      ) {
        champId =
          leg2OrSingle.penaltiesHome > leg2OrSingle.penaltiesAway
            ? leg2OrSingle.homeTeamId
            : leg2OrSingle.awayTeamId;
      } else if (goalsA > goalsB) {
        champId = teamA;
      } else {
        champId = teamB;
      }
    }

    const runnerUpId = champId === teamA ? teamB : teamA;
    const champAgg = champId === teamA ? goalsA : goalsB;
    const runnerAgg = champId === teamA ? goalsB : goalsA;
    const penSuffix =
      leg2OrSingle.penaltiesHome !== undefined &&
      leg2OrSingle.penaltiesAway !== undefined &&
      leg2OrSingle.penaltiesHome !== leg2OrSingle.penaltiesAway
        ? ` (${Math.max(leg2OrSingle.penaltiesHome, leg2OrSingle.penaltiesAway)}–${Math.min(
            leg2OrSingle.penaltiesHome,
            leg2OrSingle.penaltiesAway
          )} pên.)`
        : '';

    return {
      champId,
      runnerUpId,
      summary: `Agr. ${champAgg} x ${runnerAgg}${penSuffix}`,
    };
  }

  // Single-leg final
  let champId = leg2OrSingle.aggregateWinnerId || '';
  if (!champId) {
    if (
      leg2OrSingle.penaltiesHome !== undefined &&
      leg2OrSingle.penaltiesAway !== undefined &&
      leg2OrSingle.penaltiesHome !== leg2OrSingle.penaltiesAway
    ) {
      champId =
        leg2OrSingle.penaltiesHome > leg2OrSingle.penaltiesAway
          ? leg2OrSingle.homeTeamId
          : leg2OrSingle.awayTeamId;
    } else {
      champId = h >= a ? leg2OrSingle.homeTeamId : leg2OrSingle.awayTeamId;
    }
  }

  const runnerUpId =
    champId === leg2OrSingle.homeTeamId ? leg2OrSingle.awayTeamId : leg2OrSingle.homeTeamId;
  const winScore = champId === leg2OrSingle.homeTeamId ? h : a;
  const loseScore = champId === leg2OrSingle.homeTeamId ? a : h;
  const penSuffix =
    leg2OrSingle.penaltiesHome !== undefined &&
    leg2OrSingle.penaltiesAway !== undefined &&
    leg2OrSingle.penaltiesHome !== leg2OrSingle.penaltiesAway
      ? ` (${Math.max(leg2OrSingle.penaltiesHome, leg2OrSingle.penaltiesAway)}–${Math.min(
          leg2OrSingle.penaltiesHome,
          leg2OrSingle.penaltiesAway
        )} pên.)`
      : '';

  return {
    champId,
    runnerUpId,
    summary: `Final ${winScore} x ${loseScore}${penSuffix}`,
  };
}

function extractCompetitionIndividualHighlights(
  fixtures: Fixture[],
  clubs: Club[],
  championClubId?: string
): Pick<SeasonCompetitionArchive, 'topScorer' | 'topAssister' | 'bestPlayer'> {
  const { entries } = computeCompetitionPlayerStats(fixtures, clubs);
  if (entries.length === 0) {
    return {};
  }

  const sortedScorers = [...entries]
    .filter((e) => e.goals > 0)
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (a.matchesPlayed !== b.matchesPlayed) return a.matchesPlayed - b.matchesPlayed;
      return b.player.overall - a.player.overall;
    });

  const sortedAssisters = [...entries]
    .filter((e) => e.assists > 0)
    .sort((a, b) => {
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (b.goals !== a.goals) return b.goals - a.goals;
      return b.player.overall - a.player.overall;
    });

  const sortedMvp = [...entries].sort((a, b) => {
    const champBonusA = a.club.id === championClubId ? 14 : 0;
    const champBonusB = b.club.id === championClubId ? 14 : 0;
    const scoreA =
      a.goals * 4.2 +
      a.assists * 3.0 +
      a.player.overall * 1.15 +
      (a.player.ratingAverage || 6.8) * 5.0 +
      champBonusA;
    const scoreB =
      b.goals * 4.2 +
      b.assists * 3.0 +
      b.player.overall * 1.15 +
      (b.player.ratingAverage || 6.8) * 5.0 +
      champBonusB;
    return scoreB - scoreA;
  });

  const topS = sortedScorers[0];
  const topA = sortedAssisters[0];
  const mvp = sortedMvp[0];

  return {
    topScorer: topS
      ? {
          playerId: topS.player.id,
          playerName: topS.player.name,
          detailedRole: topS.player.detailedRole,
          clubId: topS.club.id,
          clubName: topS.club.name,
          clubShortName: topS.club.shortName,
          goals: topS.goals,
          assists: topS.assists,
          matches: topS.matchesPlayed,
        }
      : undefined,
    topAssister: topA
      ? {
          playerId: topA.player.id,
          playerName: topA.player.name,
          detailedRole: topA.player.detailedRole,
          clubId: topA.club.id,
          clubName: topA.club.name,
          clubShortName: topA.club.shortName,
          assists: topA.assists,
          goals: topA.goals,
          matches: topA.matchesPlayed,
        }
      : undefined,
    bestPlayer: mvp
      ? {
          playerId: mvp.player.id,
          playerName: mvp.player.name,
          detailedRole: mvp.player.detailedRole,
          overall: mvp.player.overall,
          clubId: mvp.club.id,
          clubName: mvp.club.name,
          clubShortName: mvp.club.shortName,
          statHighlight: `${mvp.goals}G · ${mvp.assists}A em ${mvp.matchesPlayed}J`,
        }
      : undefined,
  };
}

function buildLeagueCompetitionArchive(params: {
  competitionId: string;
  competitionName: string;
  shortName: string;
  region: SeasonCompetitionRegion;
  tier: SeasonCompetitionTier;
  standings: Standing[];
  fixtures: Fixture[];
  clubsMap: Map<string, Club>;
  allClubs: Club[];
  userClubId: string;
  forceDecided: boolean;
}): SeasonCompetitionArchive | null {
  const {
    competitionId,
    competitionName,
    shortName,
    region,
    tier,
    standings,
    fixtures,
    clubsMap,
    allClubs,
    userClubId,
    forceDecided,
  } = params;

  if (!standings || standings.length === 0) return null;

  const leaderSt = standings[0];
  const runnerSt = standings[1];
  const leaderClub = leaderSt ? clubsMap.get(leaderSt.teamId) : undefined;
  const runnerClub = runnerSt ? clubsMap.get(runnerSt.teamId) : undefined;
  if (!leaderClub) return null;

  const playedFixturesCount = fixtures.filter((f) => f.played).length;
  const allPlayed = fixtures.length > 0 && playedFixturesCount >= fixtures.length;
  const isDecided = (forceDecided && playedFixturesCount > 0) || allPlayed;

  const sgSign = (leaderSt?.goalDifference ?? 0) >= 0 ? '+' : '';
  const campaignSummary =
    (leaderSt?.played ?? 0) > 0
      ? `${leaderSt.points} pts · ${leaderSt.won}V ${leaderSt.drawn}E ${leaderSt.lost}D · SG ${sgSign}${leaderSt.goalDifference}${
          !isDecided ? ` (${leaderSt.played}J)` : ''
        }`
      : 'Temporada não iniciada';

  const highlights = extractCompetitionIndividualHighlights(
    fixtures,
    allClubs,
    isDecided ? leaderClub.id : undefined
  );

  return {
    competitionId,
    competitionName,
    shortName,
    region,
    tier,
    isDecided,
    championClubId: leaderClub.id,
    championClubName: leaderClub.name,
    championClubShortName: leaderClub.shortName,
    championColors: leaderClub.colors,
    runnerUpClubId: runnerClub?.id,
    runnerUpClubName: runnerClub?.name || 'A definir',
    userWon: isDecided && leaderClub.id === userClubId,
    campaignSummary,
    ...highlights,
  };
}

function buildCupCompetitionArchive(params: {
  competitionId: string;
  competitionName: string;
  shortName: string;
  region: SeasonCompetitionRegion;
  tier: SeasonCompetitionTier;
  fixtures: Fixture[];
  fallbackStandings?: Standing[];
  singleFinalFinder: (list: Fixture[]) => Fixture | undefined;
  twoLeggedFinalFinder?: (list: Fixture[]) => { ida?: Fixture; volta?: Fixture };
  clubsMap: Map<string, Club>;
  allClubs: Club[];
  userClubId: string;
}): SeasonCompetitionArchive | null {
  const {
    competitionId,
    competitionName,
    shortName,
    region,
    tier,
    fixtures,
    fallbackStandings,
    singleFinalFinder,
    twoLeggedFinalFinder,
    clubsMap,
    allClubs,
    userClubId,
  } = params;

  if (!fixtures || fixtures.length === 0) return null;

  const singleFinal = singleFinalFinder(fixtures);
  const twoLegged = twoLeggedFinalFinder ? twoLeggedFinalFinder(fixtures) : undefined;

  const resolvedFinal = singleFinal?.played
    ? resolveTwoOrSingleFinalResult(undefined, singleFinal)
    : twoLegged?.volta?.played
    ? resolveTwoOrSingleFinalResult(twoLegged.ida, twoLegged.volta)
    : null;

  const highlights = extractCompetitionIndividualHighlights(
    fixtures,
    allClubs,
    resolvedFinal?.champId
  );

  if (resolvedFinal) {
    const champClub = clubsMap.get(resolvedFinal.champId);
    const runnerClub = clubsMap.get(resolvedFinal.runnerUpId);
    if (!champClub) return null;

    return {
      competitionId,
      competitionName,
      shortName,
      region,
      tier,
      isDecided: true,
      championClubId: champClub.id,
      championClubName: champClub.name,
      championClubShortName: champClub.shortName,
      championColors: champClub.colors,
      runnerUpClubId: runnerClub?.id,
      runnerUpClubName: runnerClub?.name || 'Vice-Campeão',
      userWon: champClub.id === userClubId,
      campaignSummary: resolvedFinal.summary,
      ...highlights,
    };
  }

  // Live preview fallback when cup final hasn't been played yet
  const playedCount = fixtures.filter((f) => f.played).length;
  if (playedCount === 0) {
    // Check if participants are already scheduled (e.g. Supercopa / Recopa)
    const openingFix = singleFinal || twoLegged?.ida || fixtures[0];
    const teamA = openingFix ? clubsMap.get(openingFix.homeTeamId) : undefined;
    const teamB = openingFix ? clubsMap.get(openingFix.awayTeamId) : undefined;
    return {
      competitionId,
      competitionName,
      shortName,
      region,
      tier,
      isDecided: false,
      championClubId: teamA?.id,
      championClubName: teamA ? `${teamA.shortName} / Em disputa` : 'A definir',
      championClubShortName: teamA?.shortName,
      championColors: teamA?.colors,
      runnerUpClubId: teamB?.id,
      runnerUpClubName: teamB?.name || 'A definir',
      userWon: false,
      campaignSummary: 'Aguardando início',
    };
  }

  let provisionalLeader: Club | undefined;
  let provisionalRunner: Club | undefined;
  if (fallbackStandings && fallbackStandings.length > 0) {
    const sorted = [...fallbackStandings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    provisionalLeader = sorted[0] ? clubsMap.get(sorted[0].teamId) : undefined;
    provisionalRunner = sorted[1] ? clubsMap.get(sorted[1].teamId) : undefined;
  } else {
    const lastPlayed = [...fixtures].reverse().find((f) => f.played);
    if (lastPlayed) {
      const winId =
        (lastPlayed.homeScore ?? 0) >= (lastPlayed.awayScore ?? 0)
          ? lastPlayed.homeTeamId
          : lastPlayed.awayTeamId;
      provisionalLeader = clubsMap.get(winId);
    }
  }

  return {
    competitionId,
    competitionName,
    shortName,
    region,
    tier,
    isDecided: false,
    championClubId: provisionalLeader?.id,
    championClubName: provisionalLeader ? provisionalLeader.name : 'Em andamento',
    championClubShortName: provisionalLeader?.shortName,
    championColors: provisionalLeader?.colors,
    runnerUpClubId: provisionalRunner?.id,
    runnerUpClubName: provisionalRunner?.name || 'Mata-mata em andamento',
    userWon: false,
    campaignSummary: `Em andamento (${playedCount}/${fixtures.length} jogos)`,
    ...highlights,
  };
}

interface EvaluatedSeasonPlayer {
  player: Player;
  club: Club;
  goals: number;
  assists: number;
  matches: number;
  seasonRating: number;
  selectionScore: number;
  titlesWon: number;
  concededPerMatch: number;
}

/**
 * Builds an authentic 4-3-3 Team of the Year ("Time do Ano / Seleção da Temporada")
 * from a pool of clubs and fixtures.
 */
export function buildSeasonTeamOfTheYear(params: {
  clubs: Club[];
  fixtures: Fixture[];
  standingsRankByClubId: Map<string, number>;
  concededPerMatchByClubId: Map<string, number>;
  titlesCountByClubId: Map<string, number>;
}): SeasonTeamOfTheYearSlot[] {
  const {
    clubs,
    fixtures,
    standingsRankByClubId,
    concededPerMatchByClubId,
    titlesCountByClubId,
  } = params;

  if (clubs.length === 0) return [];

  const { entries: compStatEntries } = computeCompetitionPlayerStats(fixtures, clubs);
  const compStatsByPlayerId = new Map(compStatEntries.map((e) => [e.player.id, e]));

  const evaluatedPool: EvaluatedSeasonPlayer[] = [];

  for (const club of clubs) {
    const rank = standingsRankByClubId.get(club.id) ?? 12;
    const titlesWon = titlesCountByClubId.get(club.id) ?? 0;
    const concededPerMatch = concededPerMatchByClubId.get(club.id) ?? 1.25;

    // Identify primary GK so reserve keepers with 0 games don't steal GK selection
    const clubGks = club.squad
      .filter((p) => p.position === 'GK' || p.detailedRole === 'GOL')
      .sort((a, b) => {
        if ((b.matches || 0) !== (a.matches || 0)) return (b.matches || 0) - (a.matches || 0);
        if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
        return b.overall - a.overall;
      });
    const primaryGkId = clubGks[0]?.id;

    for (const player of club.squad) {
      if (
        (player.position === 'GK' || player.detailedRole === 'GOL') &&
        primaryGkId &&
        player.id !== primaryGkId &&
        (player.matches || 0) === 0
      ) {
        continue;
      }

      const compEntry = compStatsByPlayerId.get(player.id);
      const goals = Math.max(player.goals || 0, compEntry?.goals || 0);
      const assists = Math.max(player.assists || 0, compEntry?.assists || 0);
      const matches = Math.max(
        player.matches || 0,
        compEntry?.matchesPlayed || 0,
        goals > 0 || assists > 0 ? 1 : 0
      );

      const rankBonus =
        rank === 1 ? 18 : rank === 2 ? 12 : rank <= 4 ? 8 : rank <= 8 ? 4 : 0;
      const titleBonus = titlesWon * 11;
      const participationFactor =
        matches >= 15 ? 1.0 : matches >= 6 ? 0.92 : matches >= 1 ? 0.82 : player.isStarter ? 0.68 : 0.45;

      let posPerformance = 0;
      if (player.position === 'GK' || player.detailedRole === 'GOL') {
        posPerformance = Math.max(0, (2.05 - concededPerMatch) * 32) + matches * 0.45;
      } else if (player.position === 'DF') {
        posPerformance =
          Math.max(0, (1.95 - concededPerMatch) * 20) +
          goals * 5.2 +
          assists * 4.4 +
          matches * 0.35;
      } else if (player.detailedRole === 'VOL') {
        posPerformance =
          Math.max(0, (1.9 - concededPerMatch) * 12) +
          goals * 4.4 +
          assists * 4.2 +
          matches * 0.4;
      } else if (player.position === 'MF') {
        posPerformance = goals * 4.3 + assists * 4.5 + matches * 0.35;
      } else {
        posPerformance = goals * 5.1 + assists * 3.2 + matches * 0.25;
      }

      const baseRating = player.ratingAverage && player.ratingAverage > 0 ? player.ratingAverage : 6.75;
      const rawSelectionScore =
        (posPerformance +
          player.overall * 1.45 +
          baseRating * 7.5 +
          rankBonus +
          titleBonus) *
        participationFactor;

      const computedRating = Math.min(
        9.9,
        Math.max(
          6.2,
          Math.round(
            (baseRating * 0.55 +
              3.0 +
              (player.overall - 68) * 0.045 +
              Math.min(1.65, goals * 0.045 + assists * 0.038 + titlesWon * 0.18)) *
              10
          ) / 10
        )
      );

      evaluatedPool.push({
        player,
        club,
        goals,
        assists,
        matches,
        seasonRating: computedRating,
        selectionScore: rawSelectionScore,
        titlesWon,
        concededPerMatch,
      });
    }
  }

  // Prefer players who actually played at least 1 match if enough exist
  const activePool = evaluatedPool.filter((e) => e.matches > 0);
  const candidatePool = activePool.length >= 22 ? activePool : evaluatedPool;

  candidatePool.sort((a, b) => {
    if (b.selectionScore !== a.selectionScore) return b.selectionScore - a.selectionScore;
    if (b.goals + b.assists !== a.goals + a.assists) {
      return b.goals + b.assists - (a.goals + a.assists);
    }
    return b.player.overall - a.player.overall;
  });

  const usedPlayerIds = new Set<string>();
  const pickSlot = (
    primaryFn: (c: EvaluatedSeasonPlayer) => boolean,
    fallbackFn: (c: EvaluatedSeasonPlayer) => boolean,
    customSort?: (a: EvaluatedSeasonPlayer, b: EvaluatedSeasonPlayer) => number
  ): EvaluatedSeasonPlayer | null => {
    const source = customSort ? [...candidatePool].sort(customSort) : candidatePool;
    const foundPrimary = source.find((c) => !usedPlayerIds.has(c.player.id) && primaryFn(c));
    if (foundPrimary) {
      usedPlayerIds.add(foundPrimary.player.id);
      return foundPrimary;
    }
    const foundFallback = source.find((c) => !usedPlayerIds.has(c.player.id) && fallbackFn(c));
    if (foundFallback) {
      usedPlayerIds.add(foundFallback.player.id);
      return foundFallback;
    }
    const anyLeft = source.find((c) => !usedPlayerIds.has(c.player.id));
    if (anyLeft) {
      usedPlayerIds.add(anyLeft.player.id);
      return anyLeft;
    }
    return null;
  };

  const formationSlots: {
    slotId: string;
    slotLabel: string;
    pitchX: number;
    pitchY: number;
    primary: (c: EvaluatedSeasonPlayer) => boolean;
    fallback: (c: EvaluatedSeasonPlayer) => boolean;
    customSort?: (a: EvaluatedSeasonPlayer, b: EvaluatedSeasonPlayer) => number;
  }[] = [
    {
      slotId: 'GK',
      slotLabel: 'GOL',
      pitchX: 50,
      pitchY: 88,
      primary: (c) => c.player.position === 'GK' || c.player.detailedRole === 'GOL',
      fallback: (c) => c.player.position === 'GK',
    },
    {
      slotId: 'LB',
      slotLabel: 'LE',
      pitchX: 16,
      pitchY: 67,
      primary: (c) => c.player.detailedRole === 'LAT',
      fallback: (c) => c.player.position === 'DF',
    },
    {
      slotId: 'CB1',
      slotLabel: 'ZAG',
      pitchX: 38,
      pitchY: 72,
      primary: (c) => c.player.detailedRole === 'ZAG',
      fallback: (c) => c.player.position === 'DF',
    },
    {
      slotId: 'CB2',
      slotLabel: 'ZAG',
      pitchX: 62,
      pitchY: 72,
      primary: (c) => c.player.detailedRole === 'ZAG',
      fallback: (c) => c.player.position === 'DF',
    },
    {
      slotId: 'RB',
      slotLabel: 'LD',
      pitchX: 84,
      pitchY: 67,
      primary: (c) => c.player.detailedRole === 'LAT',
      fallback: (c) => c.player.position === 'DF',
    },
    {
      slotId: 'CDM',
      slotLabel: 'VOL',
      pitchX: 50,
      pitchY: 52,
      primary: (c) => c.player.detailedRole === 'VOL',
      fallback: (c) => c.player.position === 'MF',
    },
    {
      slotId: 'CM1',
      slotLabel: 'MEI',
      pitchX: 27,
      pitchY: 43,
      primary: (c) => c.player.detailedRole === 'MEI',
      fallback: (c) => c.player.position === 'MF',
    },
    {
      slotId: 'CM2',
      slotLabel: 'MEI',
      pitchX: 73,
      pitchY: 43,
      primary: (c) => c.player.detailedRole === 'MEI',
      fallback: (c) => c.player.position === 'MF',
    },
    {
      slotId: 'ST',
      slotLabel: 'CA',
      pitchX: 50,
      pitchY: 13,
      primary: (c) => c.player.position === 'FW' || c.player.detailedRole === 'ATA',
      fallback: (c) => c.player.position === 'MF',
      customSort: (a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        return b.selectionScore - a.selectionScore;
      },
    },
    {
      slotId: 'LW',
      slotLabel: 'PE',
      pitchX: 20,
      pitchY: 19,
      primary: (c) => c.player.position === 'FW' || c.player.detailedRole === 'ATA',
      fallback: (c) => c.player.position === 'MF',
    },
    {
      slotId: 'RW',
      slotLabel: 'PD',
      pitchX: 80,
      pitchY: 19,
      primary: (c) => c.player.position === 'FW' || c.player.detailedRole === 'ATA',
      fallback: (c) => c.player.position === 'MF',
    },
  ];

  // Reorder output cleanly from GK -> Defense -> Midfield -> Attack
  const slotDisplayOrder = ['GK', 'LB', 'CB1', 'CB2', 'RB', 'CDM', 'CM1', 'CM2', 'LW', 'ST', 'RW'];
  const pickedMap = new Map<string, { bp: (typeof formationSlots)[number]; chosen: EvaluatedSeasonPlayer }>();

  for (const bp of formationSlots) {
    const chosen = pickSlot(bp.primary, bp.fallback, bp.customSort);
    if (chosen) {
      pickedMap.set(bp.slotId, { bp, chosen });
    }
  }

  let bestMvpPlayerId = '';
  let bestMvpScore = -1;
  pickedMap.forEach(({ chosen }) => {
    if (chosen.selectionScore > bestMvpScore) {
      bestMvpScore = chosen.selectionScore;
      bestMvpPlayerId = chosen.player.id;
    }
  });

  const lineup: SeasonTeamOfTheYearSlot[] = [];
  for (const slotId of slotDisplayOrder) {
    const item = pickedMap.get(slotId);
    if (!item) continue;
    const { bp, chosen } = item;
    lineup.push({
      slotId: bp.slotId,
      slotLabel: bp.slotLabel,
      pitchX: bp.pitchX,
      pitchY: bp.pitchY,
      playerId: chosen.player.id,
      playerName: chosen.player.name,
      position: chosen.player.position,
      detailedRole: chosen.player.detailedRole,
      age: chosen.player.age,
      overall: chosen.player.overall,
      clubId: chosen.club.id,
      clubName: chosen.club.name,
      clubShortName: chosen.club.shortName,
      clubColors: chosen.club.colors,
      goals: chosen.goals,
      assists: chosen.assists,
      matches: chosen.matches,
      seasonRating: chosen.seasonRating,
      isPlayerOfTheYear: chosen.player.id === bestMvpPlayerId,
    });
  }

  return lineup;
}

/**
 * Builds a complete SeasonHistoryRecord snapshot for either South America & Brazil (`SA_BR`)
 * or Europe (`EU`) from the current state of `GameSave`.
 */
export function buildContinentSeasonArchive(
  state: GameSave,
  continentScope: SeasonContinentScope,
  options?: { isLivePreview?: boolean }
): SeasonHistoryRecord {
  const isLivePreview = Boolean(options?.isLivePreview);
  const allClubsWithGuests = withWorldGuestClubs(state.clubs);
  const clubsMap = new Map<string, Club>(allClubsWithGuests.map((c) => [c.id, c]));
  const userClub = clubsMap.get(state.userClubId) || state.clubs[0];

  const year =
    continentScope === 'EU'
      ? state.europeSeasonYear ?? state.currentSeasonYear
      : state.saSeasonYear ?? state.currentSeasonYear;
  const seasonLabel = continentScope === 'EU' ? formatEuropeanSeason(year) : String(year);
  const recordId = continentScope === 'EU' ? `eu_${year}` : `sa_${year}`;

  const competitions: SeasonCompetitionArchive[] = [];
  const continentFixtures: Fixture[] = [];

  if (continentScope === 'SA_BR') {
    // 1. Super Mundial de Clubes FIFA (32 Clubes, 4 em 4 anos) & Mundial Intercontinental
    if (state.fixturesSuperMundial && state.fixturesSuperMundial.length > 0) {
      continentFixtures.push(...state.fixturesSuperMundial);
      const smwcArc = buildCupCompetitionArchive({
        competitionId: 'super_mundial_clubes',
        competitionName: 'Super Mundial de Clubes FIFA (32 Clubes)',
        shortName: 'Super Mundial FIFA',
        region: 'MUNDIAL',
        tier: 'MUNDIAL',
        fixtures: state.fixturesSuperMundial,
        fallbackStandings: state.standingsSuperMundial,
        singleFinalFinder: (list) => list.find((f) => f.id === 'smwc_grande_final'),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (smwcArc) competitions.push(smwcArc);
    }

    if (state.fixturesIntercontinental && state.fixturesIntercontinental.length > 0) {
      continentFixtures.push(...state.fixturesIntercontinental);
      const interArc = buildCupCompetitionArchive({
        competitionId: 'intercontinental',
        competitionName: 'Copa Intercontinental de Clubes',
        shortName: 'Mundial Intercontinental',
        region: 'MUNDIAL',
        tier: 'MUNDIAL',
        fixtures: state.fixturesIntercontinental,
        singleFinalFinder: (list) => list.find((f) => f.id.startsWith('intercont_final')),
        clubsMap,
        allClubs: allClubsWithGuests,
        userClubId: state.userClubId,
      });
      if (interArc) competitions.push(interArc);
    }

    // 2. CONMEBOL Libertadores & Sul-Americana & Recopa
    if (state.fixturesLibertadores && state.fixturesLibertadores.length > 0) {
      continentFixtures.push(...state.fixturesLibertadores);
      const libArc = buildCupCompetitionArchive({
        competitionId: 'libertadores',
        competitionName: 'CONMEBOL Libertadores',
        shortName: 'Libertadores',
        region: 'SUL_AMERICANA',
        tier: 'CONTINENTAL',
        fixtures: state.fixturesLibertadores,
        fallbackStandings: state.standingsLibertadores,
        singleFinalFinder: (list) => list.find((f) => f.id === 'lib_grande_final'),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (libArc) competitions.push(libArc);
    }

    if (state.fixturesSulamericana && state.fixturesSulamericana.length > 0) {
      continentFixtures.push(...state.fixturesSulamericana);
      const sulaArc = buildCupCompetitionArchive({
        competitionId: 'sulamericana',
        competitionName: 'CONMEBOL Sul-Americana',
        shortName: 'Sul-Americana',
        region: 'SUL_AMERICANA',
        tier: 'CONTINENTAL',
        fixtures: state.fixturesSulamericana,
        fallbackStandings: state.standingsSulamericana,
        singleFinalFinder: (list) => list.find((f) => f.id === 'sula_final'),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (sulaArc) competitions.push(sulaArc);
    }

    if (state.fixturesRecopa && state.fixturesRecopa.length > 0) {
      continentFixtures.push(...state.fixturesRecopa);
      const recArc = buildCupCompetitionArchive({
        competitionId: 'recopa_sulamericana',
        competitionName: 'CONMEBOL Recopa Sul-Americana',
        shortName: 'Recopa Sul-Americana',
        region: 'SUL_AMERICANA',
        tier: 'CONTINENTAL',
        fixtures: state.fixturesRecopa,
        singleFinalFinder: (list) => list.find((f) => !f.leg && f.id.includes('recopa')),
        twoLeggedFinalFinder: (list) => ({
          ida: list.find((f) => f.leg === 1),
          volta: list.find((f) => f.leg === 2),
        }),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (recArc) competitions.push(recArc);
    }

    // 3. Brasil: Série A, Copa do Brasil, Supercopa, Séries B, C, D
    continentFixtures.push(...state.fixturesA);
    const serieAArc = buildLeagueCompetitionArchive({
      competitionId: 'serie_a',
      competitionName: COMPETITIONS_CATALOG.serie_a.name,
      shortName: 'Brasileirão Série A',
      region: 'BRASIL',
      tier: 'NACIONAL',
      standings: state.standingsA,
      fixtures: state.fixturesA,
      clubsMap,
      allClubs: state.clubs,
      userClubId: state.userClubId,
      forceDecided: !isLivePreview,
    });
    if (serieAArc) competitions.push(serieAArc);

    if (state.fixturesCopaBrasil && state.fixturesCopaBrasil.length > 0) {
      continentFixtures.push(...state.fixturesCopaBrasil);
      const cdbArc = buildCupCompetitionArchive({
        competitionId: 'copa_brasil',
        competitionName: COMPETITIONS_CATALOG.copa_brasil.name,
        shortName: 'Copa do Brasil',
        region: 'BRASIL',
        tier: 'COPA',
        fixtures: state.fixturesCopaBrasil,
        singleFinalFinder: (list) => list.find((f) => f.id === 'cdb_final_unica'),
        twoLeggedFinalFinder: (list) => ({
          ida: list.find((f) => f.id === 'cdb_final_ida'),
          volta: list.find((f) => f.id === 'cdb_final_volta'),
        }),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (cdbArc) competitions.push(cdbArc);
    }

    if (state.fixturesSupercopa && state.fixturesSupercopa.length > 0) {
      continentFixtures.push(...state.fixturesSupercopa);
      const supArc = buildCupCompetitionArchive({
        competitionId: 'supercopa_brasil',
        competitionName: COMPETITIONS_CATALOG.supercopa_brasil.name,
        shortName: 'Supercopa do Brasil',
        region: 'BRASIL',
        tier: 'COPA',
        fixtures: state.fixturesSupercopa,
        singleFinalFinder: (list) => list[0],
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (supArc) competitions.push(supArc);
    }

    continentFixtures.push(...state.fixturesB);
    const serieBArc = buildLeagueCompetitionArchive({
      competitionId: 'serie_b',
      competitionName: COMPETITIONS_CATALOG.serie_b.name,
      shortName: 'Brasileirão Série B',
      region: 'BRASIL',
      tier: 'NACIONAL',
      standings: state.standingsB,
      fixtures: state.fixturesB,
      clubsMap,
      allClubs: state.clubs,
      userClubId: state.userClubId,
      forceDecided: !isLivePreview,
    });
    if (serieBArc) competitions.push(serieBArc);

    if (state.fixturesC && state.standingsC && state.standingsC.length > 0) {
      continentFixtures.push(...state.fixturesC);
      const serieCArc = buildLeagueCompetitionArchive({
        competitionId: 'serie_c',
        competitionName: COMPETITIONS_CATALOG.serie_c.name,
        shortName: 'Brasileirão Série C',
        region: 'BRASIL',
        tier: 'NACIONAL',
        standings: state.standingsC,
        fixtures: state.fixturesC,
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
        forceDecided: !isLivePreview,
      });
      if (serieCArc) competitions.push(serieCArc);
    }

    if (state.fixturesD && state.fixturesD.length > 0) {
      continentFixtures.push(...state.fixturesD);
      const serieDArc = buildCupCompetitionArchive({
        competitionId: 'serie_d',
        competitionName: COMPETITIONS_CATALOG.serie_d.name,
        shortName: 'Brasileirão Série D',
        region: 'BRASIL',
        tier: 'NACIONAL',
        fixtures: state.fixturesD,
        fallbackStandings: state.standingsD,
        singleFinalFinder: () => undefined,
        twoLeggedFinalFinder: (list) => ({
          ida: list.find((f) => f.id === 'sd_final_ida'),
          volta: list.find((f) => f.id === 'sd_final_volta'),
        }),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (serieDArc) competitions.push(serieDArc);
    }

    // 4. 9 Ligas Sul-Americanas
    for (const saId of SOUTH_AMERICAN_LEAGUE_IDS) {
      const saMeta = SOUTH_AMERICAN_LEAGUES_META[saId];
      const saFixtures = state.fixturesSouthAmerica?.[saId] || [];
      const saStandings = state.standingsSouthAmerica?.[saId] || [];
      continentFixtures.push(...saFixtures);
      const saArc = buildLeagueCompetitionArchive({
        competitionId: saId,
        competitionName: saMeta.name,
        shortName: `${saMeta.flagEmoji} ${saMeta.shortName}`,
        region: 'SUL_AMERICANA',
        tier: 'NACIONAL',
        standings: saStandings,
        fixtures: saFixtures,
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
        forceDecided: !isLivePreview,
      });
      if (saArc) competitions.push(saArc);
    }

    // 4b. Concacaf Champions Cup + Champions Internacional FIFA + Ligas da América do Norte, Ásia/Rússia e África
    if (state.fixturesConcacafChampions && state.fixturesConcacafChampions.length > 0) {
      continentFixtures.push(...state.fixturesConcacafChampions);
      const concacafArc = buildCupCompetitionArchive({
        competitionId: 'concacaf_champions',
        competitionName: 'Copa dos Campeões da CONCACAF',
        shortName: 'Concacaf Champions Cup',
        region: 'NORTE_ASIA_AFRICA',
        tier: 'CONTINENTAL',
        fixtures: state.fixturesConcacafChampions,
        singleFinalFinder: (list) => list.find((f) => f.id === 'conc_final'),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (concacafArc) competitions.push(concacafArc);
    }

    if (state.fixturesCopaInternacional && state.fixturesCopaInternacional.length > 0) {
      continentFixtures.push(...state.fixturesCopaInternacional);
      const cintArc = buildCupCompetitionArchive({
        competitionId: 'copa_internacional',
        competitionName: 'Champions Internacional FIFA',
        shortName: 'Champions Internacional',
        region: 'NORTE_ASIA_AFRICA',
        tier: 'CONTINENTAL',
        fixtures: state.fixturesCopaInternacional,
        fallbackStandings: state.standingsCopaInternacional,
        singleFinalFinder: (list) => list.find((f) => f.id === 'cint_final'),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (cintArc) competitions.push(cintArc);
    }

    for (const wlId of JAN_DEC_WORLD_LEAGUE_IDS) {
      const wlMeta = WORLD_LEAGUES_META[wlId];
      const wlFixtures = state.fixturesWorldLeagues?.[wlId] || [];
      const wlStandings = state.standingsWorldLeagues?.[wlId] || [];
      if (wlFixtures.length === 0 && wlStandings.length === 0) continue;
      continentFixtures.push(...wlFixtures);
      const mlsFinalPlayed =
        wlId === 'usa_mls' && wlFixtures.some((f) => f.id === 'usa_mls_po_final' && f.played);
      const wlArc = mlsFinalPlayed
        ? buildCupCompetitionArchive({
            competitionId: wlId,
            competitionName: `${wlMeta.name} (MLS Cup)`,
            shortName: `${wlMeta.flagEmoji} ${wlMeta.shortName}`,
            region: 'NORTE_ASIA_AFRICA',
            tier: 'NACIONAL',
            fixtures: wlFixtures,
            fallbackStandings: wlStandings,
            singleFinalFinder: (list) => list.find((f) => f.id === 'usa_mls_po_final'),
            clubsMap,
            allClubs: state.clubs,
            userClubId: state.userClubId,
          })
        : buildLeagueCompetitionArchive({
            competitionId: wlId,
            competitionName: wlMeta.name,
            shortName: `${wlMeta.flagEmoji} ${wlMeta.shortName}`,
            region: 'NORTE_ASIA_AFRICA',
            tier: 'NACIONAL',
            standings: wlStandings,
            fixtures: wlFixtures,
            clubsMap,
            allClubs: state.clubs,
            userClubId: state.userClubId,
            forceDecided: !isLivePreview,
          });
      if (wlArc) competitions.push(wlArc);
    }

    // 5. Campeonatos Estaduais & Regionais (12 torneios)
    if (state.fixturesEstadual && state.standingsEstadual && state.standingsEstadual.length > 0) {
      continentFixtures.push(...state.fixturesEstadual);
      const groupNameToKey: Record<string, string> = {
        ...ESTADUAL_TOURNAMENT_KEYS,
        'Copa Sul-Centro-Norte': 'scn',
      };
      const estGroups = Array.from(
        new Set(state.standingsEstadual.map((s) => s.group).filter(Boolean))
      ) as string[];

      for (const grp of estGroups) {
        const key = groupNameToKey[grp] || grp.slice(0, 4);
        const grpStandings = state.standingsEstadual.filter((s) => s.group === grp);
        const grpFixtures = state.fixturesEstadual.filter(
          (f) =>
            f.groupName === grp ||
            (f.cupPhase || '').startsWith(grp) ||
            f.id === `est_semi1_${key}` ||
            f.id === `est_semi2_${key}` ||
            f.id === `est_final_${key}` ||
            f.id === `est_final_${key}_ida` ||
            f.id === `est_final_${key}_volta`
        );

        const estArc = buildCupCompetitionArchive({
          competitionId: `estadual_${key}`,
          competitionName: grp,
          shortName: grp,
          region: 'BRASIL',
          tier: 'ESTADUAL',
          fixtures: grpFixtures,
          fallbackStandings: grpStandings,
          singleFinalFinder: (list) => list.find((f) => f.id === `est_final_${key}`),
          twoLeggedFinalFinder: (list) => ({
            ida: list.find((f) => f.id === `est_final_${key}_ida`),
            volta: list.find((f) => f.id === `est_final_${key}_volta`),
          }),
          clubsMap,
          allClubs: state.clubs,
          userClubId: state.userClubId,
        });
        if (estArc) competitions.push(estArc);
      }
    }

    if (state.fixturesCopaNordeste && state.fixturesCopaNordeste.length > 0) {
      continentFixtures.push(...state.fixturesCopaNordeste);
      const cneArc = buildCupCompetitionArchive({
        competitionId: 'copa_nordeste',
        competitionName: 'Copa do Nordeste',
        shortName: 'Copa do Nordeste',
        region: 'BRASIL',
        tier: 'ESTADUAL',
        fixtures: state.fixturesCopaNordeste,
        fallbackStandings: state.standingsCopaNordeste,
        singleFinalFinder: () => undefined,
        twoLeggedFinalFinder: (list) => ({
          ida: list.find((f) => f.id === 'cne_final_ida'),
          volta: list.find((f) => f.id === 'cne_final_volta'),
        }),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (cneArc) competitions.push(cneArc);
    }

    if (state.fixturesCopaVerde && state.fixturesCopaVerde.length > 0) {
      continentFixtures.push(...state.fixturesCopaVerde);
      const cvArc = buildCupCompetitionArchive({
        competitionId: 'copa_verde',
        competitionName: 'Copa Verde',
        shortName: 'Copa Verde',
        region: 'BRASIL',
        tier: 'ESTADUAL',
        fixtures: state.fixturesCopaVerde,
        fallbackStandings: state.standingsCopaVerde,
        singleFinalFinder: () => undefined,
        twoLeggedFinalFinder: (list) => ({
          ida: list.find((f) => f.id === 'cv_final_ida'),
          volta: list.find((f) => f.id === 'cv_final_volta'),
        }),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (cvArc) competitions.push(cvArc);
    }
  } else {
    // =========================================================================
    // CONTINENT SCOPE: EUROPE (`EU`)
    // =========================================================================
    if (state.fixturesChampionsLeague && state.fixturesChampionsLeague.length > 0) {
      continentFixtures.push(...state.fixturesChampionsLeague);
      const uclArc = buildCupCompetitionArchive({
        competitionId: 'champions_league',
        competitionName: 'UEFA Champions League',
        shortName: 'Champions League',
        region: 'EUROPA',
        tier: 'CONTINENTAL',
        fixtures: state.fixturesChampionsLeague,
        fallbackStandings: state.standingsChampionsLeague,
        singleFinalFinder: (list) => list.find((f) => f.id === 'ucl_final'),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (uclArc) competitions.push(uclArc);
    }

    if (state.fixturesEuropaLeague && state.fixturesEuropaLeague.length > 0) {
      continentFixtures.push(...state.fixturesEuropaLeague);
      const uelArc = buildCupCompetitionArchive({
        competitionId: 'europa_league',
        competitionName: 'UEFA Europa League',
        shortName: 'Europa League',
        region: 'EUROPA',
        tier: 'CONTINENTAL',
        fixtures: state.fixturesEuropaLeague,
        fallbackStandings: state.standingsEuropaLeague,
        singleFinalFinder: (list) => list.find((f) => f.id === 'uel_final'),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (uelArc) competitions.push(uelArc);
    }

    if (state.fixturesConferenceLeague && state.fixturesConferenceLeague.length > 0) {
      continentFixtures.push(...state.fixturesConferenceLeague);
      const ueclArc = buildCupCompetitionArchive({
        competitionId: 'conference_league',
        competitionName: 'UEFA Conference League',
        shortName: 'Conference League',
        region: 'EUROPA',
        tier: 'CONTINENTAL',
        fixtures: state.fixturesConferenceLeague,
        fallbackStandings: state.standingsConferenceLeague,
        singleFinalFinder: (list) => list.find((f) => f.id === 'uecl_final'),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (ueclArc) competitions.push(ueclArc);
    }

    if (state.fixturesUefaSupercup && state.fixturesUefaSupercup.length > 0) {
      continentFixtures.push(...state.fixturesUefaSupercup);
      const uscArc = buildCupCompetitionArchive({
        competitionId: 'uefa_supercup',
        competitionName: 'Supercopa da UEFA (UEFA Super Cup)',
        shortName: 'Supercopa UEFA',
        region: 'EUROPA',
        tier: 'CONTINENTAL',
        fixtures: state.fixturesUefaSupercup,
        singleFinalFinder: (list) => list.find((f) => f.competition === 'uefa_supercup'),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (uscArc) competitions.push(uscArc);
    }

    if (state.fixturesAfcChampions && state.fixturesAfcChampions.length > 0) {
      continentFixtures.push(...state.fixturesAfcChampions);
      const afcArc = buildCupCompetitionArchive({
        competitionId: 'afc_champions',
        competitionName: 'Liga dos Campeões de Elite da AFC',
        shortName: 'AFC Champions Elite',
        region: 'NORTE_ASIA_AFRICA',
        tier: 'CONTINENTAL',
        fixtures: state.fixturesAfcChampions,
        fallbackStandings: state.standingsAfcChampions,
        singleFinalFinder: (list) => list.find((f) => f.id === 'afc_final'),
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
      });
      if (afcArc) competitions.push(afcArc);
    }

    for (const euId of EUROPEAN_LEAGUE_IDS) {
      const euMeta = EUROPEAN_LEAGUES_META[euId];
      const euFixtures = state.fixturesEurope?.[euId] || [];
      const euStandings = state.standingsEurope?.[euId] || [];
      continentFixtures.push(...euFixtures);
      const euArc = buildLeagueCompetitionArchive({
        competitionId: euId,
        competitionName: euMeta.name,
        shortName: `${euMeta.flagEmoji} ${euMeta.shortName}`,
        region: 'EUROPA',
        tier: 'NACIONAL',
        standings: euStandings,
        fixtures: euFixtures,
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
        forceDecided: !isLivePreview,
      });
      if (euArc) competitions.push(euArc);
    }

    for (const wlId of SPLIT_YEAR_WORLD_LEAGUE_IDS) {
      const wlMeta = WORLD_LEAGUES_META[wlId];
      const wlFixtures = state.fixturesWorldLeagues?.[wlId] || [];
      const wlStandings = state.standingsWorldLeagues?.[wlId] || [];
      if (wlFixtures.length === 0 && wlStandings.length === 0) continue;
      continentFixtures.push(...wlFixtures);
      const wlArc = buildLeagueCompetitionArchive({
        competitionId: wlId,
        competitionName: wlMeta.name,
        shortName: `${wlMeta.flagEmoji} ${wlMeta.shortName}`,
        region: 'NORTE_ASIA_AFRICA',
        tier: 'NACIONAL',
        standings: wlStandings,
        fixtures: wlFixtures,
        clubsMap,
        allClubs: state.clubs,
        userClubId: state.userClubId,
        forceDecided: !isLivePreview,
      });
      if (wlArc) competitions.push(wlArc);
    }
  }

  // Build standings rank & goals conceded maps across the continent's clubs
  const continentClubs = state.clubs.filter((c) =>
    continentScope === 'EU' ? isSplitCalendarClub(c) : !isSplitCalendarClub(c)
  );

  const standingsRankByClubId = new Map<string, number>();
  const concededPerMatchByClubId = new Map<string, number>();
  const registerStandingsTable = (table?: Standing[]) => {
    if (!table) return;
    table.forEach((st, idx) => {
      if (!standingsRankByClubId.has(st.teamId)) {
        standingsRankByClubId.set(st.teamId, idx + 1);
      }
      if (st.played > 0 && !concededPerMatchByClubId.has(st.teamId)) {
        concededPerMatchByClubId.set(st.teamId, st.goalsAgainst / st.played);
      }
    });
  };

  if (continentScope === 'SA_BR') {
    registerStandingsTable(state.standingsA);
    registerStandingsTable(state.standingsB);
    registerStandingsTable(state.standingsC);
    registerStandingsTable(state.standingsD);
    for (const saId of SOUTH_AMERICAN_LEAGUE_IDS) {
      registerStandingsTable(state.standingsSouthAmerica?.[saId]);
    }
    for (const wlId of JAN_DEC_WORLD_LEAGUE_IDS) {
      registerStandingsTable(state.standingsWorldLeagues?.[wlId]);
    }
  } else {
    for (const euId of EUROPEAN_LEAGUE_IDS) {
      registerStandingsTable(state.standingsEurope?.[euId]);
    }
    for (const wlId of SPLIT_YEAR_WORLD_LEAGUE_IDS) {
      registerStandingsTable(state.standingsWorldLeagues?.[wlId]);
    }
  }

  const titlesCountByClubId = new Map<string, number>();
  for (const comp of competitions) {
    if (comp.isDecided && comp.championClubId) {
      const weight =
        comp.tier === 'MUNDIAL' || comp.tier === 'CONTINENTAL'
          ? 2
          : comp.tier === 'ESTADUAL'
          ? 0.5
          : 1;
      titlesCountByClubId.set(
        comp.championClubId,
        (titlesCountByClubId.get(comp.championClubId) || 0) + weight
      );
    }
  }

  // 1. Primary Continental Elite Team of the Year (11 Ideais)
  // For SA_BR, prioritize Série A + South American & World 1st divisions so Serie D inflated defense stats don't crowd out continental stars
  const elitePoolClubs =
    continentScope === 'SA_BR'
      ? continentClubs.filter(
          (c) =>
            c.division === 'A' ||
            c.division === 'SA' ||
            (c.division === 'WL' && !isSplitCalendarClub(c))
        )
      : continentClubs.filter((c) => {
          if (c.division === 'WL') return true;
          const lid = getClubEuropeanLeagueId(c);
          return !lid || EUROPEAN_LEAGUES_META[lid].tier === 1;
        });

  const teamOfTheYearTitle =
    continentScope === 'EU'
      ? `Seleção da Temporada Europa & Ásia/Rússia ${seasonLabel}`
      : `Seleção da Temporada Sul-Americana & Internacional ${seasonLabel}`;

  const teamOfTheYear = buildSeasonTeamOfTheYear({
    clubs: elitePoolClubs.length >= 20 ? elitePoolClubs : continentClubs,
    fixtures: continentFixtures,
    standingsRankByClubId,
    concededPerMatchByClubId,
    titlesCountByClubId,
  });

  // 2. User's Specific National League Team of the Year (if user manages in this continent!)
  let userLeagueTeamOfTheYearTitle: string | undefined;
  let userLeagueTeamOfTheYear: SeasonTeamOfTheYearSlot[] | undefined;

  const isUserInThisContinent =
    userClub && (continentScope === 'EU' ? isSplitCalendarClub(userClub) : !isSplitCalendarClub(userClub));

  if (isUserInThisContinent && userClub) {
    let leagueClubs: Club[] = [];
    let leagueFixtures: Fixture[] = [];
    let leagueName = '';

    if (userClub.division === 'WL') {
      const wlId = getClubWorldLeagueId(userClub) || 'usa_mls';
      leagueName = WORLD_LEAGUES_META[wlId].name;
      const ids = new Set((state.standingsWorldLeagues?.[wlId] || []).map((s) => s.teamId));
      leagueClubs = continentClubs.filter((c) => ids.has(c.id));
      leagueFixtures = state.fixturesWorldLeagues?.[wlId] || [];
    } else if (continentScope === 'EU') {
      const euId = getClubEuropeanLeagueId(userClub) || 'eng_premier';
      leagueName = EUROPEAN_LEAGUES_META[euId].name;
      const ids = new Set((state.standingsEurope?.[euId] || []).map((s) => s.teamId));
      leagueClubs = continentClubs.filter((c) => ids.has(c.id));
      leagueFixtures = state.fixturesEurope?.[euId] || [];
    } else if (userClub.division === 'SA') {
      const saId = getClubSouthAmericanLeagueId(userClub) || 'liga_arg';
      leagueName = SOUTH_AMERICAN_LEAGUES_META[saId].name;
      const ids = new Set((state.standingsSouthAmerica?.[saId] || []).map((s) => s.teamId));
      leagueClubs = continentClubs.filter((c) => ids.has(c.id));
      leagueFixtures = state.fixturesSouthAmerica?.[saId] || [];
    } else {
      const div = userClub.division;
      leagueName =
        div === 'B'
          ? 'Brasileirão Série B'
          : div === 'C'
          ? 'Brasileirão Série C'
          : div === 'D'
          ? 'Brasileirão Série D'
          : div === 'EST'
          ? 'Campeonato Potiguar (RN)'
          : 'Brasileirão Série A';
      leagueClubs =
        div === 'EST'
          ? continentClubs.filter((c) => c.state === 'RN' && ['A', 'B', 'C', 'D', 'EST'].includes(c.division))
          : continentClubs.filter((c) => c.division === div);
      leagueFixtures =
        div === 'B'
          ? state.fixturesB
          : div === 'C'
          ? state.fixturesC || []
          : div === 'D'
          ? state.fixturesD || []
          : div === 'EST'
          ? (state.fixturesEstadual || []).filter((f) => f.groupName === 'Campeonato Potiguar (RN)')
          : state.fixturesA;
    }

    if (leagueClubs.length >= 10) {
      userLeagueTeamOfTheYearTitle = `Seleção do Campeonato — ${leagueName} (${seasonLabel})`;
      userLeagueTeamOfTheYear = buildSeasonTeamOfTheYear({
        clubs: leagueClubs,
        fixtures: leagueFixtures,
        standingsRankByClubId,
        concededPerMatchByClubId,
        titlesCountByClubId,
      });
    }
  }

  // Aggregate exact player stats across all competitions of this continent + squad totals
  const { entries: allContinentEntries } = computeCompetitionPlayerStats(
    continentFixtures,
    continentClubs
  );
  const compStatsMap = new Map(allContinentEntries.map((e) => [e.player.id, e]));

  const playerSnapshotsAll: SeasonPlayerStatSnapshot[] = [];
  for (const club of continentClubs) {
    const clubDecidedTitles = competitions.filter(
      (comp) => comp.isDecided && comp.championClubId === club.id
    ).length;

    for (const p of club.squad) {
      const ce = compStatsMap.get(p.id);
      const goals = Math.max(p.goals || 0, ce?.goals || 0);
      const assists = Math.max(p.assists || 0, ce?.assists || 0);
      const matches = Math.max(
        p.matches || 0,
        ce?.matchesPlayed || 0,
        goals > 0 || assists > 0 ? 1 : 0
      );

      const baseRating = p.ratingAverage && p.ratingAverage > 0 ? p.ratingAverage : 6.75;
      const seasonRating =
        Math.round(
          Math.min(
            9.9,
            Math.max(
              6.0,
              baseRating * 0.6 +
                2.7 +
                (p.overall - 68) * 0.04 +
                Math.min(1.5, goals * 0.04 + assists * 0.035)
            )
          ) * 10
        ) / 10;

      playerSnapshotsAll.push({
        playerId: p.id,
        playerName: p.name,
        position: p.position,
        detailedRole: p.detailedRole,
        age: p.age,
        overall: p.overall,
        clubId: club.id,
        clubName: club.name,
        clubShortName: club.shortName,
        clubColors: club.colors,
        goals,
        assists,
        matches,
        seasonRating,
        titlesWonInSeason: clubDecidedTitles,
      });
    }
  }

  const topScorersOverall = [...playerSnapshotsAll]
    .filter((p) => p.goals > 0)
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (a.matches !== b.matches) return a.matches - b.matches;
      return b.overall - a.overall;
    })
    .slice(0, 30);

  const topAssistersOverall = [...playerSnapshotsAll]
    .filter((p) => p.assists > 0)
    .sort((a, b) => {
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (a.matches !== b.matches) return a.matches - b.matches;
      return b.overall - a.overall;
    })
    .slice(0, 30);

  // Build Major Season Honors (7 Categories including Bola de Ouro Mundial)
  const majorHonors: SeasonMajorHonor[] = [];

  // 0) Bola de Ouro Mundial · Melhor Jogador do Mundo
  const savedBallonDor = (state.worldBallonDorHistory || []).find((a) => a.year === year);
  const ballonDorAward = savedBallonDor || computeWorldBallonDorStandings(state, year);
  if (ballonDorAward?.winner) {
    const bw = ballonDorAward.winner;
    majorHonors.push({
      category: 'BOLA_DE_OURO_MUNDIAL',
      title: 'Bola de Ouro Mundial · Melhor do Mundo',
      winnerId: bw.playerId,
      winnerName: bw.playerName,
      winnerRole: bw.detailedRole,
      age: bw.age,
      overall: bw.overall,
      clubId: bw.clubId,
      clubName: bw.clubName,
      clubShortName: bw.clubShortName,
      clubColors: bw.clubColors,
      userWon: bw.clubId === state.userClubId,
      statLine: `${bw.ballonDorPoints} pts · ${bw.goals}G · ${bw.assists}A (${bw.leagueLabel})`,
      goals: bw.goals,
      assists: bw.assists,
      matches: bw.matches,
    });
  }

  // 1) Craque do Ano
  const mvpSlot = teamOfTheYear.find((s) => s.isPlayerOfTheYear) || teamOfTheYear[0];
  if (mvpSlot) {
    majorHonors.push({
      category: 'CRAQUE_DO_ANO',
      title: continentScope === 'EU' ? 'Melhor Jogador da Europa' : 'Rei da América / Craque do Ano',
      winnerId: mvpSlot.playerId,
      winnerName: mvpSlot.playerName,
      winnerRole: mvpSlot.detailedRole,
      age: mvpSlot.age,
      overall: mvpSlot.overall,
      clubId: mvpSlot.clubId,
      clubName: mvpSlot.clubName,
      clubShortName: mvpSlot.clubShortName,
      clubColors: mvpSlot.clubColors,
      userWon: mvpSlot.clubId === state.userClubId,
      statLine: `Nota ${mvpSlot.seasonRating.toFixed(1)} · ${mvpSlot.goals}G · ${mvpSlot.assists}A (${mvpSlot.matches}J)`,
      goals: mvpSlot.goals,
      assists: mvpSlot.assists,
      matches: mvpSlot.matches,
    });
  }

  // 2) Artilheiro da Temporada
  const goldenBoot = topScorersOverall[0];
  if (goldenBoot) {
    majorHonors.push({
      category: 'ARTILHEIRO_GERAL',
      title: 'Chuteira de Ouro · Artilheiro do Ano',
      winnerId: goldenBoot.playerId,
      winnerName: goldenBoot.playerName,
      winnerRole: goldenBoot.detailedRole,
      age: goldenBoot.age,
      overall: goldenBoot.overall,
      clubId: goldenBoot.clubId,
      clubName: goldenBoot.clubName,
      clubShortName: goldenBoot.clubShortName,
      clubColors: goldenBoot.clubColors,
      userWon: goldenBoot.clubId === state.userClubId,
      statLine: `${goldenBoot.goals} gols e ${goldenBoot.assists} assist. em ${goldenBoot.matches} jogos`,
      goals: goldenBoot.goals,
      assists: goldenBoot.assists,
      matches: goldenBoot.matches,
    });
  }

  // 3) Garçom da Temporada
  const topPlaymaker = topAssistersOverall[0];
  if (topPlaymaker) {
    majorHonors.push({
      category: 'GARCOM_DO_ANO',
      title: 'Garçom do Ano · Líder de Assistências',
      winnerId: topPlaymaker.playerId,
      winnerName: topPlaymaker.playerName,
      winnerRole: topPlaymaker.detailedRole,
      age: topPlaymaker.age,
      overall: topPlaymaker.overall,
      clubId: topPlaymaker.clubId,
      clubName: topPlaymaker.clubName,
      clubShortName: topPlaymaker.clubShortName,
      clubColors: topPlaymaker.clubColors,
      userWon: topPlaymaker.clubId === state.userClubId,
      statLine: `${topPlaymaker.assists} assistências e ${topPlaymaker.goals} gols em ${topPlaymaker.matches} jogos`,
      goals: topPlaymaker.goals,
      assists: topPlaymaker.assists,
      matches: topPlaymaker.matches,
    });
  }

  // 4) Melhor Goleiro
  const bestKeeperSlot = teamOfTheYear.find((s) => s.slotId === 'GK');
  if (bestKeeperSlot) {
    const cpm = concededPerMatchByClubId.get(bestKeeperSlot.clubId) ?? 0.95;
    majorHonors.push({
      category: 'MELHOR_GOLEIRO',
      title: 'Luva de Ouro · Melhor Goleiro',
      winnerId: bestKeeperSlot.playerId,
      winnerName: bestKeeperSlot.playerName,
      winnerRole: 'GOL',
      age: bestKeeperSlot.age,
      overall: bestKeeperSlot.overall,
      clubId: bestKeeperSlot.clubId,
      clubName: bestKeeperSlot.clubName,
      clubShortName: bestKeeperSlot.clubShortName,
      clubColors: bestKeeperSlot.clubColors,
      userWon: bestKeeperSlot.clubId === state.userClubId,
      statLine: `Nota ${bestKeeperSlot.seasonRating.toFixed(1)} · Média ${cpm
        .toFixed(2)
        .replace('.', ',')} gol sofrido/J`,
      goals: bestKeeperSlot.goals,
      assists: bestKeeperSlot.assists,
      matches: bestKeeperSlot.matches,
    });
  }

  // 5) Revelação Sub-21
  const eliteIdsSet = new Set(
    (elitePoolClubs.length >= 20 ? elitePoolClubs : continentClubs).map((c) => c.id)
  );
  const u21Candidates = playerSnapshotsAll
    .filter((p) => p.age <= 21 && eliteIdsSet.has(p.clubId) && (p.matches > 0 || p.overall >= 72))
    .sort((a, b) => {
      const scoreA =
        a.goals * 4.0 +
        a.assists * 3.0 +
        a.overall * 1.5 +
        Math.min(a.matches, 30) * 0.6 +
        (a.titlesWonInSeason || 0) * 8;
      const scoreB =
        b.goals * 4.0 +
        b.assists * 3.0 +
        b.overall * 1.5 +
        Math.min(b.matches, 30) * 0.6 +
        (b.titlesWonInSeason || 0) * 8;
      return scoreB - scoreA;
    });

  const bestU21 = u21Candidates[0];
  if (bestU21) {
    majorHonors.push({
      category: 'REVELACAO_SUB21',
      title: 'Revelação Sub-21 da Temporada',
      winnerId: bestU21.playerId,
      winnerName: bestU21.playerName,
      winnerRole: bestU21.detailedRole,
      age: bestU21.age,
      overall: bestU21.overall,
      clubId: bestU21.clubId,
      clubName: bestU21.clubName,
      clubShortName: bestU21.clubShortName,
      clubColors: bestU21.clubColors,
      userWon: bestU21.clubId === state.userClubId,
      statLine: `${bestU21.age} anos · OVR ${bestU21.overall} · ${bestU21.goals}G · ${bestU21.assists}A (${bestU21.matches}J)`,
      goals: bestU21.goals,
      assists: bestU21.assists,
      matches: bestU21.matches,
    });
  }

  // 6) Treinador do Ano
  const coachScores = continentClubs.map((club) => {
    const clubWins = competitions.filter((comp) => comp.isDecided && comp.championClubId === club.id);
    let pts = 0;
    for (const cw of clubWins) {
      if (cw.tier === 'MUNDIAL') pts += 45;
      else if (cw.tier === 'CONTINENTAL') pts += 42;
      else if (cw.tier === 'NACIONAL') pts += 32;
      else if (cw.tier === 'COPA') pts += 26;
      else pts += 10;
    }
    const rank = standingsRankByClubId.get(club.id) ?? 15;
    if (rank === 1) pts += 18;
    else if (rank === 2) pts += 10;
    else if (rank <= 4) pts += 5;

    return {
      club,
      pts,
      titlesLabels: clubWins.map((c) => c.shortName),
    };
  });
  coachScores.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return b.club.reputation - a.club.reputation;
  });

  const topCoachEntry = coachScores[0];
  if (topCoachEntry) {
    const isUserCoachWinner = topCoachEntry.club.id === state.userClubId;
    const coachDisplayName = isUserCoachWinner
      ? state.managerName
      : topCoachEntry.club.managerName || `Técnico do ${topCoachEntry.club.shortName}`;
    const titlesText =
      topCoachEntry.titlesLabels.length > 0
        ? `Campeão: ${topCoachEntry.titlesLabels.slice(0, 3).join(', ')}`
        : `Melhor campanha técnica (${topCoachEntry.club.shortName})`;

    majorHonors.push({
      category: 'TREINADOR_DO_ANO',
      title: 'Treinador do Ano',
      winnerId: `coach_${topCoachEntry.club.id}`,
      winnerName: coachDisplayName,
      winnerRole: 'TEC',
      clubId: topCoachEntry.club.id,
      clubName: topCoachEntry.club.name,
      clubShortName: topCoachEntry.club.shortName,
      clubColors: topCoachEntry.club.colors,
      userWon: isUserCoachWinner,
      statLine: titlesText,
    });
  }

  // Keep a compact multi-season cumulative performer snapshot (all honored + top 220 contributors)
  const honoredIds = new Set<string>([
    ...teamOfTheYear.map((s) => s.playerId),
    ...(userLeagueTeamOfTheYear || []).map((s) => s.playerId),
    ...majorHonors.map((h) => h.winnerId),
  ]);

  const topPerformersSnapshot = [...playerSnapshotsAll]
    .filter((p) => p.goals + p.assists > 0 || honoredIds.has(p.playerId))
    .sort((a, b) => {
      const aMustKeep = honoredIds.has(a.playerId) ? 1 : 0;
      const bMustKeep = honoredIds.has(b.playerId) ? 1 : 0;
      if (bMustKeep !== aMustKeep) return bMustKeep - aMustKeep;
      const contribB = b.goals * 2 + b.assists;
      const contribA = a.goals * 2 + a.assists;
      if (contribB !== contribA) return contribB - contribA;
      return b.overall - a.overall;
    })
    .slice(0, 240);

  return {
    id: recordId,
    continentScope,
    year,
    seasonLabel,
    recordedAtDate: state.currentDate || `${year}-12-31`,
    isLivePreview,
    userClubId: state.userClubId,
    userClubName: userClub?.name || '',
    competitions,
    teamOfTheYearTitle,
    teamOfTheYear,
    userLeagueTeamOfTheYearTitle,
    userLeagueTeamOfTheYear,
    majorHonors,
    topScorersOverall,
    topAssistersOverall,
    topPerformersSnapshot,
  };
}

/**
 * Records a completed continent season into `state.seasonHistoryArchive` (idempotent by season ID)
 * and extracts `TrophyRecord[]` for all officially decided competitions so CPU-won cups & leagues
 * are also permanently registered in `trophyHistory`.
 */
export function recordCompletedSeasonHistory(
  state: GameSave,
  continentScope: SeasonContinentScope
): {
  archiveRecord: SeasonHistoryRecord;
  officialTrophies: TrophyRecord[];
  updatedArchive: SeasonHistoryRecord[];
} {
  const archiveRecord = buildContinentSeasonArchive(state, continentScope, {
    isLivePreview: false,
  });

  const officialTrophies: TrophyRecord[] = archiveRecord.competitions
    .filter((comp) => comp.isDecided && comp.championClubName && comp.championClubId)
    .map((comp) => ({
      year: archiveRecord.year,
      seasonLabel: continentScope === 'EU' ? archiveRecord.seasonLabel : undefined,
      competition: comp.competitionName,
      championTeamName: comp.championClubName,
      runnerUpTeamName: comp.runnerUpClubName || 'Vice-Campeão',
      userWon: comp.userWon,
    }));

  const existing = state.seasonHistoryArchive || [];
  const filteredExisting = existing.filter((r) => r.id !== archiveRecord.id);
  const updatedArchive = [archiveRecord, ...filteredExisting].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.continentScope === 'EU' ? -1 : 1;
  });

  return {
    archiveRecord,
    officialTrophies,
    updatedArchive,
  };
}

/**
 * Synthesizes legacy SeasonHistoryRecords from `trophyHistory` + `individualAwardsHistory`
 * for any past season in older saves that concluded before `seasonHistoryArchive` existed.
 */
function buildBackfilledLegacyRecords(
  state: GameSave,
  archivedIds: Set<string>,
  liveSaYear: number,
  liveEuYear: number
): SeasonHistoryRecord[] {
  const clubsByName = new Map<string, Club>();
  state.clubs.forEach((c) => {
    clubsByName.set(c.name.toLowerCase(), c);
    clubsByName.set(c.shortName.toLowerCase(), c);
  });

  const groupedTrophies = new Map<
    string,
    { scope: SeasonContinentScope; year: number; label: string; trophies: TrophyRecord[] }
  >();

  for (const t of state.trophyHistory || []) {
    const isEu = Boolean(t.seasonLabel && t.seasonLabel.includes('/'));
    const scope: SeasonContinentScope = isEu ? 'EU' : 'SA_BR';
    const recId = isEu ? `eu_${t.year}` : `sa_${t.year}`;

    // Skip if already in rich archive OR if it belongs to the currently active live season
    if (archivedIds.has(recId)) continue;
    if (scope === 'SA_BR' && t.year === liveSaYear) continue;
    if (scope === 'EU' && t.year === liveEuYear) continue;

    let bucket = groupedTrophies.get(recId);
    if (!bucket) {
      bucket = {
        scope,
        year: t.year,
        label: t.seasonLabel || String(t.year),
        trophies: [],
      };
      groupedTrophies.set(recId, bucket);
    }
    bucket.trophies.push(t);
  }

  // Also check individualAwardsHistory for past SA_BR years
  for (const ind of state.individualAwardsHistory || []) {
    const recId = `sa_${ind.year}`;
    if (archivedIds.has(recId) || ind.year === liveSaYear) continue;
    if (!groupedTrophies.has(recId)) {
      groupedTrophies.set(recId, {
        scope: 'SA_BR',
        year: ind.year,
        label: String(ind.year),
        trophies: [],
      });
    }
  }

  const backfilled: SeasonHistoryRecord[] = [];

  groupedTrophies.forEach((bucket, recId) => {
    const yearIndAwards: IndividualAwardRecord[] =
      bucket.scope === 'SA_BR'
        ? (state.individualAwardsHistory || []).filter((a) => a.year === bucket.year)
        : [];

    const competitions: SeasonCompetitionArchive[] = bucket.trophies.map((t, idx) => {
      const champClub = clubsByName.get(t.championTeamName.toLowerCase());
      const runnerClub = clubsByName.get(t.runnerUpTeamName.toLowerCase());
      const compLower = t.competition.toLowerCase();

      const region: SeasonCompetitionRegion =
        bucket.scope === 'EU'
          ? 'EUROPA'
          : compLower.includes('intercontinental') || compLower.includes('mundial')
          ? 'MUNDIAL'
          : compLower.includes('champions internacional') ||
            compLower.includes('major league soccer') ||
            compLower.includes('mls') ||
            compLower.includes('liga bbva mx') ||
            compLower.includes('liga mx') ||
            compLower.includes('saudi') ||
            compLower.includes('j1 league') ||
            compLower.includes('russa') ||
            compLower.includes('egyptian') ||
            compLower.includes('egípcia') ||
            compLower.includes('botola')
          ? 'NORTE_ASIA_AFRICA'
          : compLower.includes('brasileir') ||
            compLower.includes('copa do brasil') ||
            compLower.includes('supercopa')
          ? 'BRASIL'
          : 'SUL_AMERICANA';

      const tier: SeasonCompetitionTier =
        region === 'MUNDIAL'
          ? 'MUNDIAL'
          : compLower.includes('libertadores') ||
            compLower.includes('sul-americana') ||
            compLower.includes('recopa') ||
            compLower.includes('champions') ||
            compLower.includes('europa league') ||
            compLower.includes('conference')
          ? 'CONTINENTAL'
          : compLower.includes('copa') || compLower.includes('supercopa')
          ? 'COPA'
          : 'NACIONAL';

      return {
        competitionId: `legacy_${idx}_${t.competition}`,
        competitionName: t.competition,
        shortName: t.competition,
        region,
        tier,
        isDecided: true,
        championClubId: champClub?.id,
        championClubName: t.championTeamName,
        championClubShortName: champClub?.shortName || t.championTeamName,
        championColors: champClub?.colors || DEFAULT_COLORS,
        runnerUpClubId: runnerClub?.id,
        runnerUpClubName: t.runnerUpTeamName,
        userWon: t.userWon,
        campaignSummary: 'Temporada encerrada',
      };
    });

    const majorHonors: SeasonMajorHonor[] = [];
    const primaryIndAwards = yearIndAwards.filter((a) => a.divisionCode === 'A');
    const sourceAwards = primaryIndAwards.length > 0 ? primaryIndAwards : yearIndAwards;

    for (const aw of sourceAwards) {
      const cat =
        aw.category === 'BEST_PLAYER'
          ? 'CRAQUE_DO_ANO'
          : aw.category === 'TOP_SCORER'
          ? 'ARTILHEIRO_GERAL'
          : aw.category === 'BEST_GOALKEEPER'
          ? 'MELHOR_GOLEIRO'
          : 'REVELACAO_SUB21';
      if (majorHonors.some((m) => m.category === cat)) continue;
      majorHonors.push({
        category: cat,
        title: aw.awardTitle,
        winnerId: aw.playerId,
        winnerName: aw.playerName,
        winnerRole: aw.playerRole,
        age: aw.playerAge,
        overall: aw.playerOverall,
        clubId: aw.clubId,
        clubName: aw.clubName,
        clubShortName: aw.clubName,
        clubColors: aw.clubColors || DEFAULT_COLORS,
        userWon: aw.userWon,
        statLine: aw.statHighlight,
        goals: aw.goals,
        assists: aw.assists,
        matches: aw.matches,
      });
    }

    const topPerformersSnapshot: SeasonPlayerStatSnapshot[] = yearIndAwards.map((aw) => ({
      playerId: aw.playerId,
      playerName: aw.playerName,
      position:
        aw.playerRole === 'GOL'
          ? 'GK'
          : aw.playerRole === 'ZAG' || aw.playerRole === 'LAT'
          ? 'DF'
          : aw.playerRole === 'ATA'
          ? 'FW'
          : 'MF',
      detailedRole: aw.playerRole,
      age: aw.playerAge,
      overall: aw.playerOverall,
      clubId: aw.clubId,
      clubName: aw.clubName,
      clubShortName: aw.clubName,
      clubColors: aw.clubColors || DEFAULT_COLORS,
      goals: aw.goals || 0,
      assists: aw.assists || 0,
      matches: aw.matches || 1,
      seasonRating: 7.8,
      titlesWonInSeason: 0,
    }));

    const topScorersOverall = [...topPerformersSnapshot]
      .filter((p) => p.goals > 0)
      .sort((a, b) => b.goals - a.goals);

    const topAssistersOverall = [...topPerformersSnapshot]
      .filter((p) => p.assists > 0)
      .sort((a, b) => b.assists - a.assists);

    backfilled.push({
      id: recId,
      continentScope: bucket.scope,
      year: bucket.year,
      seasonLabel: bucket.label,
      recordedAtDate: `${bucket.year}-12-31`,
      isBackfilledLegacy: true,
      userClubId: state.userClubId,
      userClubName: state.clubs.find((c) => c.id === state.userClubId)?.name || '',
      competitions,
      teamOfTheYearTitle: `Seleção da Temporada ${bucket.label}`,
      teamOfTheYear: [],
      majorHonors,
      topScorersOverall,
      topAssistersOverall,
      topPerformersSnapshot,
    });
  });

  return backfilled;
}

/**
 * Returns all historical seasons (archived + backfilled) plus live real-time previews
 * of the currently active South American/Brazilian and European seasons.
 */
export function getUnifiedSeasonHistoryRecords(state: GameSave): {
  allSeasons: SeasonHistoryRecord[];
  completedSeasons: SeasonHistoryRecord[];
  livePreviews: SeasonHistoryRecord[];
} {
  const archived = state.seasonHistoryArchive || [];
  const archivedIds = new Set(archived.map((r) => r.id));

  const liveSaYear = state.saSeasonYear ?? state.currentSeasonYear;
  const liveEuYear = state.europeSeasonYear ?? state.currentSeasonYear;

  const backfilled = buildBackfilledLegacyRecords(state, archivedIds, liveSaYear, liveEuYear);
  const completedSeasons = [...archived, ...backfilled].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.continentScope === 'EU' ? -1 : 1;
  });

  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const isUserEu = userClub?.division === 'EU';

  const liveSaPreview = buildContinentSeasonArchive(state, 'SA_BR', { isLivePreview: true });
  const liveEuPreview = buildContinentSeasonArchive(state, 'EU', { isLivePreview: true });

  // Order the user's own active continent first!
  const livePreviews = isUserEu
    ? [
        { ...liveEuPreview, id: `live_${liveEuPreview.id}` },
        { ...liveSaPreview, id: `live_${liveSaPreview.id}` },
      ]
    : [
        { ...liveSaPreview, id: `live_${liveSaPreview.id}` },
        { ...liveEuPreview, id: `live_${liveEuPreview.id}` },
      ];

  return {
    allSeasons: [...livePreviews, ...completedSeasons],
    completedSeasons,
    livePreviews,
  };
}

/**
 * Computes the complete All-Time General History ("Histórico Geral de Todas as Temporadas Jogadas")
 * across every played season in the save.
 */
export function computeAllTimeGeneralHistory(
  state: GameSave,
  includeLiveSeason: boolean = true,
  competitionFilter: string = 'ALL'
): AllTimeGeneralHistorySummary {
  const { completedSeasons, livePreviews } = getUnifiedSeasonHistoryRecords(state);

  // Deduplicate live previews if that exact continent+year was already archived at season end
  const completedBaseIds = new Set(
    completedSeasons.map((s) => `${s.continentScope}_${s.year}`)
  );
  const activeUnarchivedPreviews = livePreviews.filter(
    (lp) => !completedBaseIds.has(`${lp.continentScope}_${lp.year}`)
  );

  const seasonsToAggregate = includeLiveSeason
    ? [...completedSeasons, ...activeUnarchivedPreviews]
    : completedSeasons;

  const allClubsWithGuests = withWorldGuestClubs(state.clubs);
  const clubsById = new Map<string, Club>(allClubsWithGuests.map((c) => [c.id, c]));
  const clubsByName = new Map<string, Club>();
  allClubsWithGuests.forEach((c) => {
    clubsByName.set(c.name.toLowerCase(), c);
    clubsByName.set(c.shortName.toLowerCase(), c);
  });

  const activePlayerMap = new Map<string, { player: Player; club: Club }>();
  state.clubs.forEach((club) => {
    club.squad.forEach((p) => {
      activePlayerMap.set(p.id, { player: p, club });
    });
  });

  // 1. Collect all competitions for filter & aggregate Club Titles
  const compMetaMap = new Map<string, { id: string; name: string; region: SeasonCompetitionRegion }>();
  const clubTitlesMap = new Map<string, ClubAllTimeTitleEntry>();
  const singleSeasonClubTitleCounts: {
    clubName: string;
    clubId?: string;
    clubColors: { primary: string; secondary: string; text: string };
    seasonLabel: string;
    count: number;
    compsLabel: string;
  }[] = [];

  let totalTitlesDecided = 0;

  const ensureClubEntry = (
    clubId: string | undefined,
    clubName: string,
    fallbackColors?: { primary: string; secondary: string; text: string }
  ): ClubAllTimeTitleEntry => {
    const resolvedClub =
      (clubId && clubsById.get(clubId)) || clubsByName.get(clubName.toLowerCase());
    const key = resolvedClub ? resolvedClub.id : `name::${clubName.toLowerCase()}`;
    let entry = clubTitlesMap.get(key);
    if (!entry) {
      entry = {
        clubKey: key,
        clubId: resolvedClub?.id,
        clubName: resolvedClub?.name || clubName,
        clubShortName: resolvedClub?.shortName || clubName,
        clubColors: resolvedClub?.colors || fallbackColors || DEFAULT_COLORS,
        isUserClub: resolvedClub?.id === state.userClubId,
        totalTitles: 0,
        runnerUps: 0,
        worldTitles: 0,
        continentalTitles: 0,
        nationalLeagueTitles: 0,
        cupTitles: 0,
        stateTitles: 0,
        seasonsWonLabels: [],
        titlesByCompetition: {},
      };
      clubTitlesMap.set(key, entry);
    }
    return entry;
  };

  for (const season of seasonsToAggregate) {
    const perClubSeasonWins = new Map<string, { entry: ClubAllTimeTitleEntry; comps: string[] }>();

    for (const comp of season.competitions) {
      if (!comp.isDecided) continue;

      const canonicalCompKey = comp.competitionName;
      if (!compMetaMap.has(canonicalCompKey)) {
        compMetaMap.set(canonicalCompKey, {
          id: canonicalCompKey,
          name: comp.competitionName,
          region: comp.region,
        });
      }

      totalTitlesDecided += 1;

      if (competitionFilter !== 'ALL' && canonicalCompKey !== competitionFilter) {
        continue;
      }

      if (comp.championClubName) {
        const champEntry = ensureClubEntry(
          comp.championClubId,
          comp.championClubName,
          comp.championColors
        );
        champEntry.totalTitles += 1;
        champEntry.titlesByCompetition[canonicalCompKey] =
          (champEntry.titlesByCompetition[canonicalCompKey] || 0) + 1;
        if (!champEntry.seasonsWonLabels.includes(season.seasonLabel)) {
          champEntry.seasonsWonLabels.push(season.seasonLabel);
        }

        if (comp.tier === 'MUNDIAL') champEntry.worldTitles += 1;
        else if (comp.tier === 'CONTINENTAL') champEntry.continentalTitles += 1;
        else if (comp.tier === 'NACIONAL') champEntry.nationalLeagueTitles += 1;
        else if (comp.tier === 'COPA') champEntry.cupTitles += 1;
        else champEntry.stateTitles += 1;

        const bucket = perClubSeasonWins.get(champEntry.clubKey) || {
          entry: champEntry,
          comps: [],
        };
        bucket.comps.push(comp.shortName);
        perClubSeasonWins.set(champEntry.clubKey, bucket);
      }

      if (
        comp.runnerUpClubName &&
        comp.runnerUpClubName !== 'A definir' &&
        comp.runnerUpClubName !== 'Vice-Campeão'
      ) {
        const runnerEntry = ensureClubEntry(comp.runnerUpClubId, comp.runnerUpClubName);
        runnerEntry.runnerUps += 1;
      }
    }

    perClubSeasonWins.forEach((val) => {
      singleSeasonClubTitleCounts.push({
        clubName: val.entry.clubName,
        clubId: val.entry.clubId,
        clubColors: val.entry.clubColors,
        seasonLabel: season.seasonLabel,
        count: val.comps.length,
        compsLabel: val.comps.slice(0, 3).join(', '),
      });
    });
  }

  const clubTitleRankings = Array.from(clubTitlesMap.values())
    .filter((c) => c.totalTitles > 0 || c.runnerUps > 0)
    .sort((a, b) => {
      if (b.totalTitles !== a.totalTitles) return b.totalTitles - a.totalTitles;
      const prestigeB =
        b.worldTitles * 5 + b.continentalTitles * 4 + b.nationalLeagueTitles * 3 + b.cupTitles * 2;
      const prestigeA =
        a.worldTitles * 5 + a.continentalTitles * 4 + a.nationalLeagueTitles * 3 + a.cupTitles * 2;
      if (prestigeB !== prestigeA) return prestigeB - prestigeA;
      return b.runnerUps - a.runnerUps;
    });

  // 2. Aggregate All-Time Career Player Stats & Honors across seasons
  const careerPlayersMap = new Map<
    string,
    PlayerAllTimeCareerEntry & { ratingSum: number; ratingCount: number }
  >();

  const ensurePlayerEntry = (snap: {
    playerId: string;
    playerName: string;
    position: Position;
    detailedRole: DetailedRole;
    age: number;
    overall: number;
    clubId: string;
    clubName: string;
    clubShortName: string;
    clubColors: { primary: string; secondary: string; text: string };
  }) => {
    let entry = careerPlayersMap.get(snap.playerId);
    const liveData = activePlayerMap.get(snap.playerId);

    if (!entry) {
      entry = {
        playerId: snap.playerId,
        playerName: liveData?.player.name || snap.playerName,
        position: liveData?.player.position || snap.position,
        detailedRole: liveData?.player.detailedRole || snap.detailedRole,
        age: liveData?.player.age || snap.age,
        peakOverall: Math.max(liveData?.player.overall || 0, snap.overall),
        latestClubId: liveData?.club.id || snap.clubId,
        latestClubName: liveData?.club.name || snap.clubName,
        latestClubShortName: liveData?.club.shortName || snap.clubShortName,
        latestClubColors: liveData?.club.colors || snap.clubColors || DEFAULT_COLORS,
        isUserClubPlayer: (liveData?.club.id || snap.clubId) === state.userClubId,
        isActiveInSquads: Boolean(liveData),
        seasonsRecorded: 0,
        matches: 0,
        goals: 0,
        assists: 0,
        goalContributions: 0,
        goalsPerMatch: 0,
        avgSeasonRating: 6.8,
        goldenBootsCount: 0,
        playmakerAwardsCount: 0,
        mvpAwardsCount: 0,
        bestKeeperAwardsCount: 0,
        revelationAwardsCount: 0,
        totyAppearances: 0,
        clubsRepresented: [],
        bestSingleSeasonGoals: 0,
        bestSingleSeasonGoalsLabel: '',
        bestSingleSeasonAssists: 0,
        bestSingleSeasonAssistsLabel: '',
        ratingSum: 0,
        ratingCount: 0,
      };
      careerPlayersMap.set(snap.playerId, entry);
    } else {
      entry.peakOverall = Math.max(entry.peakOverall, snap.overall);
      if (!liveData && snap.age >= entry.age) {
        entry.age = snap.age;
      }
    }

    if (snap.clubShortName && !entry.clubsRepresented.includes(snap.clubShortName)) {
      entry.clubsRepresented.push(snap.clubShortName);
    }

    return entry;
  };

  let bestSeasonGoalsRecord: SingleSeasonHistoricalRecord | null = null;
  let bestSeasonAssistsRecord: SingleSeasonHistoricalRecord | null = null;
  let bestSeasonContribRecord: SingleSeasonHistoricalRecord | null = null;

  // Iterate oldest-to-newest so latestClub reflects most recent season when player retired
  const chronologicalSeasons = [...seasonsToAggregate].sort((a, b) => a.year - b.year);

  for (const season of chronologicalSeasons) {
    for (const snap of season.topPerformersSnapshot) {
      const entry = ensurePlayerEntry(snap);
      if (snap.matches > 0 || snap.goals > 0 || snap.assists > 0) {
        entry.seasonsRecorded += 1;
      }
      entry.matches += snap.matches;
      entry.goals += snap.goals;
      entry.assists += snap.assists;
      entry.goalContributions = entry.goals + entry.assists;
      entry.ratingSum += snap.seasonRating;
      entry.ratingCount += 1;

      if (!entry.isActiveInSquads) {
        entry.latestClubId = snap.clubId;
        entry.latestClubName = snap.clubName;
        entry.latestClubShortName = snap.clubShortName;
        entry.latestClubColors = snap.clubColors;
      }

      if (snap.goals > entry.bestSingleSeasonGoals) {
        entry.bestSingleSeasonGoals = snap.goals;
        entry.bestSingleSeasonGoalsLabel = season.seasonLabel;
      }
      if (snap.assists > entry.bestSingleSeasonAssists) {
        entry.bestSingleSeasonAssists = snap.assists;
        entry.bestSingleSeasonAssistsLabel = season.seasonLabel;
      }

      if (
        snap.goals > 0 &&
        (!bestSeasonGoalsRecord || snap.goals > bestSeasonGoalsRecord.value)
      ) {
        bestSeasonGoalsRecord = {
          recordType: 'GOALS_SEASON',
          label: 'Mais Gols em Uma Única Temporada',
          holderName: snap.playerName,
          holderSubLabel: `${snap.clubShortName} (${snap.matches} jogos)`,
          seasonLabel: season.seasonLabel,
          value: snap.goals,
          unitLabel: snap.goals === 1 ? 'gol' : 'gols',
          clubColors: snap.clubColors,
          playerId: snap.playerId,
          clubId: snap.clubId,
        };
      }

      if (
        snap.assists > 0 &&
        (!bestSeasonAssistsRecord || snap.assists > bestSeasonAssistsRecord.value)
      ) {
        bestSeasonAssistsRecord = {
          recordType: 'ASSISTS_SEASON',
          label: 'Mais Assistências em Uma Temporada',
          holderName: snap.playerName,
          holderSubLabel: `${snap.clubShortName} (${snap.matches} jogos)`,
          seasonLabel: season.seasonLabel,
          value: snap.assists,
          unitLabel: 'assist.',
          clubColors: snap.clubColors,
          playerId: snap.playerId,
          clubId: snap.clubId,
        };
      }

      const contrib = snap.goals + snap.assists;
      if (
        contrib > 0 &&
        (!bestSeasonContribRecord || contrib > bestSeasonContribRecord.value)
      ) {
        bestSeasonContribRecord = {
          recordType: 'CONTRIBUTIONS_SEASON',
          label: 'Maior Participação Direta (G+A) no Ano',
          holderName: snap.playerName,
          holderSubLabel: `${snap.clubShortName} (${snap.goals}G + ${snap.assists}A)`,
          seasonLabel: season.seasonLabel,
          value: contrib,
          unitLabel: 'G+A',
          clubColors: snap.clubColors,
          playerId: snap.playerId,
          clubId: snap.clubId,
        };
      }
    }

    // Count Team of the Year appearances (only official completed seasons, or live if no completed exist)
    const countHonorsFromThisSeason = !season.isLivePreview || completedSeasons.length === 0;
    if (countHonorsFromThisSeason) {
      for (const slot of season.teamOfTheYear) {
        const entry = ensurePlayerEntry({
          playerId: slot.playerId,
          playerName: slot.playerName,
          position: slot.position,
          detailedRole: slot.detailedRole,
          age: slot.age,
          overall: slot.overall,
          clubId: slot.clubId,
          clubName: slot.clubName,
          clubShortName: slot.clubShortName,
          clubColors: slot.clubColors,
        });
        entry.totyAppearances += 1;
      }

      for (const mh of season.majorHonors) {
        if (mh.category === 'TREINADOR_DO_ANO') continue;
        const existing = careerPlayersMap.get(mh.winnerId);
        if (!existing) continue;
        if (mh.category === 'CRAQUE_DO_ANO') existing.mvpAwardsCount += 1;
        else if (mh.category === 'ARTILHEIRO_GERAL') existing.goldenBootsCount += 1;
        else if (mh.category === 'GARCOM_DO_ANO') existing.playmakerAwardsCount += 1;
        else if (mh.category === 'MELHOR_GOLEIRO') existing.bestKeeperAwardsCount += 1;
        else if (mh.category === 'REVELACAO_SUB21') existing.revelationAwardsCount += 1;
      }

      // Also count competition-specific Golden Boots
      for (const comp of season.competitions) {
        if (comp.isDecided && comp.topScorer && comp.topScorer.goals >= 3) {
          const scorerEntry = careerPlayersMap.get(comp.topScorer.playerId);
          if (scorerEntry && comp.tier !== 'ESTADUAL') {
            scorerEntry.goldenBootsCount += 1;
          }
        }
      }
    }
  }

  const allCareerPlayers: PlayerAllTimeCareerEntry[] = Array.from(careerPlayersMap.values()).map(
    (p) => ({
      ...p,
      goalsPerMatch: p.matches > 0 ? Math.round((p.goals / p.matches) * 100) / 100 : 0,
      avgSeasonRating:
        p.ratingCount > 0 ? Math.round((p.ratingSum / p.ratingCount) * 10) / 10 : 7.0,
    })
  );

  const allTimeScorers = [...allCareerPlayers]
    .filter((p) => p.goals > 0)
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (a.matches !== b.matches) return a.matches - b.matches;
      return b.peakOverall - a.peakOverall;
    })
    .slice(0, 50);

  const allTimeAssisters = [...allCareerPlayers]
    .filter((p) => p.assists > 0)
    .sort((a, b) => {
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (a.matches !== b.matches) return a.matches - b.matches;
      return b.peakOverall - a.peakOverall;
    })
    .slice(0, 50);

  const hallOfFamePlayers = [...allCareerPlayers]
    .filter(
      (p) =>
        p.mvpAwardsCount > 0 ||
        p.totyAppearances > 0 ||
        p.goldenBootsCount > 0 ||
        p.playmakerAwardsCount > 0 ||
        p.bestKeeperAwardsCount > 0 ||
        p.goalContributions >= 15
    )
    .sort((a, b) => {
      const scoreB =
        b.mvpAwardsCount * 35 +
        b.totyAppearances * 18 +
        b.goldenBootsCount * 14 +
        b.bestKeeperAwardsCount * 14 +
        b.playmakerAwardsCount * 12 +
        b.revelationAwardsCount * 8 +
        b.goals * 0.65 +
        b.assists * 0.5 +
        b.peakOverall * 0.4;
      const scoreA =
        a.mvpAwardsCount * 35 +
        a.totyAppearances * 18 +
        a.goldenBootsCount * 14 +
        a.bestKeeperAwardsCount * 14 +
        a.playmakerAwardsCount * 12 +
        a.revelationAwardsCount * 8 +
        a.goals * 0.65 +
        a.assists * 0.5 +
        a.peakOverall * 0.4;
      return scoreB - scoreA;
    })
    .slice(0, 40);

  // 3. Build All-Time Best XI (4-3-3 Seleção de Todos os Tempos)
  const usedAllTimeIds = new Set<string>();
  const scoredAllTimePool = [...allCareerPlayers].sort((a, b) => {
    const scoreB =
      b.totyAppearances * 26 +
      b.mvpAwardsCount * 34 +
      b.bestKeeperAwardsCount * 22 +
      b.goals * 1.6 +
      b.assists * 1.35 +
      b.peakOverall * 1.4 +
      b.avgSeasonRating * 8;
    const scoreA =
      a.totyAppearances * 26 +
      a.mvpAwardsCount * 34 +
      a.bestKeeperAwardsCount * 22 +
      a.goals * 1.6 +
      a.assists * 1.35 +
      a.peakOverall * 1.4 +
      a.avgSeasonRating * 8;
    return scoreB - scoreA;
  });

  const pickAllTime = (
    primary: (p: PlayerAllTimeCareerEntry) => boolean,
    fallback: (p: PlayerAllTimeCareerEntry) => boolean
  ): PlayerAllTimeCareerEntry | null => {
    const f1 = scoredAllTimePool.find((p) => !usedAllTimeIds.has(p.playerId) && primary(p));
    if (f1) {
      usedAllTimeIds.add(f1.playerId);
      return f1;
    }
    const f2 = scoredAllTimePool.find((p) => !usedAllTimeIds.has(p.playerId) && fallback(p));
    if (f2) {
      usedAllTimeIds.add(f2.playerId);
      return f2;
    }
    const f3 = scoredAllTimePool.find((p) => !usedAllTimeIds.has(p.playerId));
    if (f3) {
      usedAllTimeIds.add(f3.playerId);
      return f3;
    }
    return null;
  };

  const allTimeBlueprint: {
    slotId: string;
    slotLabel: string;
    pitchX: number;
    pitchY: number;
    primary: (p: PlayerAllTimeCareerEntry) => boolean;
    fallback: (p: PlayerAllTimeCareerEntry) => boolean;
  }[] = [
    {
      slotId: 'GK',
      slotLabel: 'GOL',
      pitchX: 50,
      pitchY: 88,
      primary: (p) => p.position === 'GK' || p.detailedRole === 'GOL',
      fallback: (p) => p.position === 'GK',
    },
    {
      slotId: 'LB',
      slotLabel: 'LE',
      pitchX: 16,
      pitchY: 67,
      primary: (p) => p.detailedRole === 'LAT',
      fallback: (p) => p.position === 'DF',
    },
    {
      slotId: 'CB1',
      slotLabel: 'ZAG',
      pitchX: 38,
      pitchY: 72,
      primary: (p) => p.detailedRole === 'ZAG',
      fallback: (p) => p.position === 'DF',
    },
    {
      slotId: 'CB2',
      slotLabel: 'ZAG',
      pitchX: 62,
      pitchY: 72,
      primary: (p) => p.detailedRole === 'ZAG',
      fallback: (p) => p.position === 'DF',
    },
    {
      slotId: 'RB',
      slotLabel: 'LD',
      pitchX: 84,
      pitchY: 67,
      primary: (p) => p.detailedRole === 'LAT',
      fallback: (p) => p.position === 'DF',
    },
    {
      slotId: 'CDM',
      slotLabel: 'VOL',
      pitchX: 50,
      pitchY: 52,
      primary: (p) => p.detailedRole === 'VOL',
      fallback: (p) => p.position === 'MF',
    },
    {
      slotId: 'CM1',
      slotLabel: 'MEI',
      pitchX: 27,
      pitchY: 43,
      primary: (p) => p.detailedRole === 'MEI',
      fallback: (p) => p.position === 'MF',
    },
    {
      slotId: 'CM2',
      slotLabel: 'MEI',
      pitchX: 73,
      pitchY: 43,
      primary: (p) => p.detailedRole === 'MEI',
      fallback: (p) => p.position === 'MF',
    },
    {
      slotId: 'LW',
      slotLabel: 'PE',
      pitchX: 20,
      pitchY: 19,
      primary: (p) => p.position === 'FW' || p.detailedRole === 'ATA',
      fallback: (p) => p.position === 'MF',
    },
    {
      slotId: 'ST',
      slotLabel: 'CA',
      pitchX: 50,
      pitchY: 13,
      primary: (p) => p.position === 'FW' || p.detailedRole === 'ATA',
      fallback: (p) => p.position === 'MF',
    },
    {
      slotId: 'RW',
      slotLabel: 'PD',
      pitchX: 80,
      pitchY: 19,
      primary: (p) => p.position === 'FW' || p.detailedRole === 'ATA',
      fallback: (p) => p.position === 'MF',
    },
  ];

  const allTimeLegendId = hallOfFamePlayers[0]?.playerId || scoredAllTimePool[0]?.playerId || '';
  const allTimeTeamOfTheYear: SeasonTeamOfTheYearSlot[] = [];
  for (const bp of allTimeBlueprint) {
    const chosen = pickAllTime(bp.primary, bp.fallback);
    if (!chosen) continue;
    allTimeTeamOfTheYear.push({
      slotId: bp.slotId,
      slotLabel: bp.slotLabel,
      pitchX: bp.pitchX,
      pitchY: bp.pitchY,
      playerId: chosen.playerId,
      playerName: chosen.playerName,
      position: chosen.position,
      detailedRole: chosen.detailedRole,
      age: chosen.age,
      overall: chosen.peakOverall,
      clubId: chosen.latestClubId,
      clubName: chosen.latestClubName,
      clubShortName: chosen.latestClubShortName,
      clubColors: chosen.latestClubColors,
      goals: chosen.goals,
      assists: chosen.assists,
      matches: chosen.matches,
      seasonRating: chosen.avgSeasonRating,
      isPlayerOfTheYear: chosen.playerId === allTimeLegendId,
    });
  }

  // 4. Single-Season Records
  const singleSeasonRecords: SingleSeasonHistoricalRecord[] = [];
  if (bestSeasonGoalsRecord) singleSeasonRecords.push(bestSeasonGoalsRecord);
  if (bestSeasonAssistsRecord) singleSeasonRecords.push(bestSeasonAssistsRecord);
  if (bestSeasonContribRecord) singleSeasonRecords.push(bestSeasonContribRecord);

  singleSeasonClubTitleCounts.sort((a, b) => b.count - a.count);
  const topClubSingleYear = singleSeasonClubTitleCounts[0];
  if (topClubSingleYear && topClubSingleYear.count > 0) {
    singleSeasonRecords.push({
      recordType: 'CLUB_TITLES_SEASON',
      label: 'Temporada Mais Vitoriosa de um Clube',
      holderName: topClubSingleYear.clubName,
      holderSubLabel: topClubSingleYear.compsLabel,
      seasonLabel: topClubSingleYear.seasonLabel,
      value: topClubSingleYear.count,
      unitLabel: topClubSingleYear.count === 1 ? 'título' : 'títulos',
      clubColors: topClubSingleYear.clubColors,
      clubId: topClubSingleYear.clubId,
    });
  }

  const availableCompetitionsForFilter = Array.from(compMetaMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR')
  );

  return {
    seasonsEvaluatedCount: seasonsToAggregate.length,
    completedSeasonsCount: completedSeasons.length,
    totalTitlesDecided,
    availableCompetitionsForFilter,
    clubTitleRankings,
    allTimeScorers,
    allTimeAssisters,
    hallOfFamePlayers,
    allTimeTeamOfTheYear,
    singleSeasonRecords,
  };
}

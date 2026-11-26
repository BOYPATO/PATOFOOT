import {
  Club,
  CompetitionType,
  EuropeanCupId,
  EuropeanLeagueId,
  Fixture,
  GameSave,
  SouthAmericanCupId,
  SouthAmericanLeagueId,
  Standing,
  WorldCupId,
  WorldLeagueId,
} from '../types/game';
import { simulateQuickMatch } from '../services/matchSimulation';
import { ESTADUAL_TOURNAMENT_KEYS } from './competitionsEngine';
import { withWorldGuestClubs } from './intercontinentalEngine';
import { applyCpuClubsDynamicRatingsAfterFixtures } from './clubRatingsEngine';
import { isSouthAmericanLeague, SOUTH_AMERICAN_LEAGUE_IDS } from './southAmericaLeaguesEngine';
import { EUROPEAN_LEAGUE_IDS, isEuropeanLeague } from './europeLeaguesEngine';
import {
  computeWorldInternationalQualifiers,
  isSplitYearWorldLeague,
  isWorldLeague,
  WORLD_LEAGUE_IDS,
} from './worldLeaguesEngine';
import {
  isMlsPlayoffFixture,
  isMlsSkippedBestOfThreeFixture,
  sortMlsStandings,
  syncMlsPlayoffBracket,
} from './usaMlsEngine';
import { syncSuperMundialKnockoutBracket } from './superClubWorldCupEngine';
import {
  resolveConcacafTieWinner,
  syncConcacafChampionsBracket,
} from './concacafChampionsEngine';
import {
  resolveAfcSingleMatchWinner,
  resolveAfcTwoLegWinner,
  syncAfcChampionsBracket,
} from './afcChampionsEngine';
import {
  BrazilianStateUF,
  ESTADUAIS_2026_CONFIG,
  EstadualCompetitionConfig,
  getEstadualConfigByName,
  getEstadualConfigByUf,
} from '../data/estaduais2026Config';
import { syncEnglishCupsKnockoutBracket } from './englishCupsEngine';
import {
  EUROPEAN_CUP_IDS,
  flattenEuropeanCupsFixtures,
  isEuropeanCup,
  syncEuropeanCupsKnockoutBrackets,
} from './europeanCupsEngine';
import {
  SOUTH_AMERICAN_CUP_IDS,
  flattenSouthAmericanCupsFixtures,
  isSouthAmericanCup,
  syncSouthAmericanCupsKnockoutBrackets,
} from './southAmericanCupsEngine';
import {
  WORLD_CUP_IDS,
  flattenWorldCupsFixtures,
  isWorldCup,
  syncWorldCupsKnockoutBrackets,
} from './worldCupsEngine';
import { resolveCrossCompetitionScheduleConflicts } from './scheduleConflictResolver';

const CLASSIC_LEAGUES_38: CompetitionType[] = ['serie_a', 'serie_b', 'serie_c'];

export function flattenSouthAmericaFixtures(
  fixturesSouthAmerica?: Partial<Record<SouthAmericanLeagueId, Fixture[]>>
): Fixture[] {
  if (!fixturesSouthAmerica) return [];
  const list: Fixture[] = [];
  for (const leagueId of SOUTH_AMERICAN_LEAGUE_IDS) {
    const arr = fixturesSouthAmerica[leagueId];
    if (arr && arr.length > 0) {
      list.push(...arr);
    }
  }
  return list;
}

export function flattenEuropeFixtures(
  fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>
): Fixture[] {
  if (!fixturesEurope) return [];
  const list: Fixture[] = [];
  for (const leagueId of EUROPEAN_LEAGUE_IDS) {
    const arr = fixturesEurope[leagueId];
    if (arr && arr.length > 0) {
      list.push(...arr);
    }
  }
  return list;
}

export function flattenWorldLeaguesFixtures(
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>
): Fixture[] {
  if (!fixturesWorldLeagues) return [];
  const list: Fixture[] = [];
  for (const leagueId of WORLD_LEAGUE_IDS) {
    const arr = fixturesWorldLeagues[leagueId];
    if (arr && arr.length > 0) {
      list.push(...arr);
    }
  }
  return list;
}

/**
 * Determines whether a fixture counts toward league / group-stage standings.
 * Pure knockout phases (1ª–5ª Fase, Oitavas, Quartas, Semifinal, Final, Decisão, or two-legged ties)
 * do not add points to group tables.
 */
export function isStandingsFixture(fixture: Fixture): boolean {
  if (
    fixture.competition === 'copa_brasil' ||
    fixture.competition === 'supercopa_brasil' ||
    fixture.competition === 'recopa_sulamericana' ||
    fixture.competition === 'uefa_supercup' ||
    fixture.competition === 'intercontinental' ||
    fixture.competition === 'concacaf_champions' ||
    fixture.competition === 'eng_community_shield' ||
    fixture.competition === 'eng_fa_cup' ||
    fixture.competition === 'eng_efl_cup' ||
    isEuropeanCup(fixture.competition) ||
    isSouthAmericanCup(fixture.competition) ||
    isWorldCup(fixture.competition)
  ) {
    return false;
  }

  if (fixture.leg !== undefined) return false;
  if (fixture.id.includes('playoff') || isMlsPlayoffFixture(fixture)) return false;

  const phase = (fixture.cupPhase || '').toLowerCase();
  if (
    phase.includes('1ª fase') ||
    phase.includes('2ª fase') ||
    phase.includes('3ª fase') ||
    phase.includes('4ª fase') ||
    phase.includes('5ª fase') ||
    phase.includes('wild card') ||
    phase.includes('primeira rodada') ||
    phase.includes('conferência') ||
    phase.includes('mls cup') ||
    phase.includes('playoff') ||
    phase.includes('oitavas') ||
    phase.includes('quartas') ||
    phase.includes('semifinal') ||
    phase.includes('final') ||
    phase.includes('decisão')
  ) {
    return false;
  }

  if (CLASSIC_LEAGUES_38.includes(fixture.competition)) return true;
  if (isSouthAmericanLeague(fixture.competition)) return true;
  if (isEuropeanLeague(fixture.competition)) return true;
  if (isWorldLeague(fixture.competition)) return true;

  return true;
}

/**
 * Pure, idempotent standings calculator from a competition's fixture list.
 * Preserves group assignments (e.g. 'Grupo A01', 'Grupo A', 'Paulistão (SP)') and never double-counts.
 */
export function recomputeStandingsFromFixtures(
  templateStandings: Standing[],
  fixtures: Fixture[],
  pointDeductionsByClub?: Record<string, number>
): Standing[] {
  const standingsMap = new Map<string, Standing>();

  templateStandings.forEach((st) => {
    const deduction = pointDeductionsByClub?.[st.teamId] || 0;
    standingsMap.set(st.teamId, {
      teamId: st.teamId,
      group: st.group,
      subGroup: st.subGroup,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: deduction > 0 ? -deduction : 0,
      form: [],
    });
  });

  // Sort played fixtures chronologically so recent form (last 5) is accurate
  const playedGroupFixtures = fixtures
    .filter(
      (f) =>
        f.played &&
        f.homeScore !== null &&
        f.awayScore !== null &&
        isStandingsFixture(f)
    )
    .sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return 0;
    });

  playedGroupFixtures.forEach((f) => {
    const hScore = f.homeScore as number;
    const aScore = f.awayScore as number;

    const home = standingsMap.get(f.homeTeamId);
    const away = standingsMap.get(f.awayTeamId);

    if (home) {
      home.played += 1;
      home.goalsFor += hScore;
      home.goalsAgainst += aScore;
      home.goalDifference = home.goalsFor - home.goalsAgainst;

      if (hScore > aScore) {
        home.won += 1;
        home.points += 3;
        home.form.unshift('V');
      } else if (hScore === aScore) {
        home.drawn += 1;
        home.points += 1;
        home.form.unshift('E');
      } else {
        home.lost += 1;
        home.form.unshift('D');
      }
      home.form = home.form.slice(0, 5);
    }

    if (away) {
      away.played += 1;
      away.goalsFor += aScore;
      away.goalsAgainst += hScore;
      away.goalDifference = away.goalsFor - away.goalsAgainst;

      if (aScore > hScore) {
        away.won += 1;
        away.points += 3;
        away.form.unshift('V');
      } else if (aScore === hScore) {
        away.drawn += 1;
        away.points += 1;
        away.form.unshift('E');
      } else {
        away.lost += 1;
        away.form.unshift('D');
      }
      away.form = away.form.slice(0, 5);
    }
  });

  const isMlsTable =
    fixtures.some((f) => f.competition === 'usa_mls') ||
    (!fixtures.some((f) => f.competition === 'afc_champions') &&
      templateStandings.some((s) => s.teamId.startsWith('wl_usa_')) &&
      templateStandings.some(
        (s) => s.group === 'Conferência Leste' || s.group === 'Conferência Oeste'
      ));
  if (isMlsTable) {
    return sortMlsStandings(Array.from(standingsMap.values()), playedGroupFixtures);
  }

  return Array.from(standingsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

/**
 * Recomputes all 7 league and group-stage standings tables from their fixture lists.
 */
export function recomputeAllStandings(state: {
  clubs?: Club[];
  currentSeasonYear?: number;
  standingsA: Standing[];
  standingsB: Standing[];
  standingsC?: Standing[];
  standingsD?: Standing[];
  standingsLibertadores?: Standing[];
  standingsSulamericana?: Standing[];
  standingsEstadual?: Standing[];
  standingsCopaNordeste?: Standing[];
  standingsCopaVerde?: Standing[];
  standingsSouthAmerica?: Partial<Record<SouthAmericanLeagueId, Standing[]>>;
  standingsEurope?: Partial<Record<EuropeanLeagueId, Standing[]>>;
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>;
  standingsChampionsLeague?: Standing[];
  standingsEuropaLeague?: Standing[];
  standingsConferenceLeague?: Standing[];
  standingsCopaInternacional?: Standing[];
  standingsAfcChampions?: Standing[];
  standingsSuperMundial?: Standing[];
  fixturesA: Fixture[];
  fixturesB: Fixture[];
  fixturesC?: Fixture[];
  fixturesD?: Fixture[];
  fixturesLibertadores?: Fixture[];
  fixturesSulamericana?: Fixture[];
  fixturesEstadual?: Fixture[];
  fixturesCopaNordeste?: Fixture[];
  fixturesCopaVerde?: Fixture[];
  fixturesSouthAmerica?: Partial<Record<SouthAmericanLeagueId, Fixture[]>>;
  fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>;
  fixturesChampionsLeague?: Fixture[];
  fixturesEuropaLeague?: Fixture[];
  fixturesConferenceLeague?: Fixture[];
  fixturesCopaInternacional?: Fixture[];
  fixturesAfcChampions?: Fixture[];
  fixturesSuperMundial?: Fixture[];
}) {
  const deductions: Record<string, number> = {};
  if (state.clubs) {
    state.clubs.forEach((c) => {
      const pun = c.finances?.activePunishment;
      if (
        pun &&
        pun.pointsDeducted > 0 &&
        (!state.currentSeasonYear || pun.seasonYearApplied === state.currentSeasonYear)
      ) {
        deductions[c.id] = pun.pointsDeducted;
      }
    });
  }

  const standingsSouthAmerica: Partial<Record<SouthAmericanLeagueId, Standing[]>> = {};
  if (state.standingsSouthAmerica || state.fixturesSouthAmerica) {
    for (const leagueId of SOUTH_AMERICAN_LEAGUE_IDS) {
      const tmpl = state.standingsSouthAmerica?.[leagueId] || [];
      const fixs = state.fixturesSouthAmerica?.[leagueId] || [];
      if (tmpl.length > 0 || fixs.length > 0) {
        standingsSouthAmerica[leagueId] = recomputeStandingsFromFixtures(tmpl, fixs, deductions);
      }
    }
  }

  const standingsEurope: Partial<Record<EuropeanLeagueId, Standing[]>> = {};
  if (state.standingsEurope || state.fixturesEurope) {
    for (const leagueId of EUROPEAN_LEAGUE_IDS) {
      const tmpl = state.standingsEurope?.[leagueId] || [];
      const fixs = state.fixturesEurope?.[leagueId] || [];
      if (tmpl.length > 0 || fixs.length > 0) {
        standingsEurope[leagueId] = recomputeStandingsFromFixtures(tmpl, fixs, deductions);
      }
    }
  }

  const standingsWorldLeagues: Partial<Record<WorldLeagueId, Standing[]>> = {};
  if (state.standingsWorldLeagues || state.fixturesWorldLeagues) {
    for (const leagueId of WORLD_LEAGUE_IDS) {
      const tmpl = state.standingsWorldLeagues?.[leagueId] || [];
      const fixs = state.fixturesWorldLeagues?.[leagueId] || [];
      if (tmpl.length > 0 || fixs.length > 0) {
        standingsWorldLeagues[leagueId] = recomputeStandingsFromFixtures(tmpl, fixs, deductions);
      }
    }
  }

  return {
    standingsA: recomputeStandingsFromFixtures(state.standingsA, state.fixturesA, deductions),
    standingsB: recomputeStandingsFromFixtures(state.standingsB, state.fixturesB, deductions),
    standingsC: recomputeStandingsFromFixtures(
      state.standingsC || [],
      state.fixturesC || [],
      deductions
    ),
    standingsD: recomputeStandingsFromFixtures(
      state.standingsD || [],
      state.fixturesD || [],
      deductions
    ),
    standingsLibertadores: recomputeStandingsFromFixtures(
      state.standingsLibertadores || [],
      state.fixturesLibertadores || []
    ),
    standingsSulamericana: recomputeStandingsFromFixtures(
      state.standingsSulamericana || [],
      state.fixturesSulamericana || []
    ),
    standingsEstadual: recomputeStandingsFromFixtures(
      state.standingsEstadual || [],
      state.fixturesEstadual || []
    ),
    standingsCopaNordeste: recomputeStandingsFromFixtures(
      state.standingsCopaNordeste || [],
      state.fixturesCopaNordeste || []
    ),
    standingsCopaVerde: recomputeStandingsFromFixtures(
      state.standingsCopaVerde || [],
      state.fixturesCopaVerde || []
    ),
    standingsSouthAmerica,
    standingsEurope,
    standingsWorldLeagues,
    standingsChampionsLeague: recomputeStandingsFromFixtures(
      state.standingsChampionsLeague || [],
      state.fixturesChampionsLeague || []
    ),
    standingsEuropaLeague: recomputeStandingsFromFixtures(
      state.standingsEuropaLeague || [],
      state.fixturesEuropaLeague || []
    ),
    standingsConferenceLeague: recomputeStandingsFromFixtures(
      state.standingsConferenceLeague || [],
      state.fixturesConferenceLeague || []
    ),
    standingsCopaInternacional: recomputeStandingsFromFixtures(
      state.standingsCopaInternacional || [],
      state.fixturesCopaInternacional || []
    ),
    standingsAfcChampions: recomputeStandingsFromFixtures(
      state.standingsAfcChampions || [],
      state.fixturesAfcChampions || []
    ),
    standingsSuperMundial: recomputeStandingsFromFixtures(
      state.standingsSuperMundial || [],
      state.fixturesSuperMundial || []
    ),
  };
}

/**
 * Credits CPU players' matches, goals, cards, and home gate revenue from newly simulated CPU fixtures.
 */
export function creditCpuPlayersFromFixtures(
  clubs: Club[],
  completedCpuFixtures: Fixture[],
  skipClubIds: Set<string> = new Set(),
  includeCards: boolean = true
): Club[] {
  if (completedCpuFixtures.length === 0) return clubs;

  const fixturesByClub = new Map<string, Fixture[]>();
  completedCpuFixtures.forEach((fix) => {
    if (!fix.played) return;
    if (!skipClubIds.has(fix.homeTeamId)) {
      const list = fixturesByClub.get(fix.homeTeamId) || [];
      list.push(fix);
      fixturesByClub.set(fix.homeTeamId, list);
    }
    if (!skipClubIds.has(fix.awayTeamId)) {
      const list = fixturesByClub.get(fix.awayTeamId) || [];
      list.push(fix);
      fixturesByClub.set(fix.awayTeamId, list);
    }
  });

  if (fixturesByClub.size === 0) return clubs;

  const userClubId = clubs.find((c) => c.isUser)?.id;

  const creditedClubs = clubs.map((club) => {
    const clubFixtures = fixturesByClub.get(club.id);
    if (!clubFixtures || clubFixtures.length === 0) return club;

    let addedRevenue = 0;
    const goalsByPlayer = new Map<string, number>();
    const assistsByPlayer = new Map<string, number>();
    const yellowsByPlayer = new Map<string, number>();
    const redsByPlayer = new Map<string, number>();

    clubFixtures.forEach((fix) => {
      if (fix.homeTeamId === club.id && fix.ticketRevenue) {
        addedRevenue += fix.ticketRevenue;
      }
      (fix.events || []).forEach((ev) => {
        if (ev.teamId !== club.id) return;
        if (ev.type === 'GOL' || ev.type === 'PENALTI_GOL') {
          if (ev.playerId) {
            goalsByPlayer.set(ev.playerId, (goalsByPlayer.get(ev.playerId) || 0) + 1);
          }
          if (ev.assistPlayerId && ev.assistPlayerId !== ev.playerId) {
            assistsByPlayer.set(ev.assistPlayerId, (assistsByPlayer.get(ev.assistPlayerId) || 0) + 1);
          }
        } else if (includeCards && ev.type === 'CARTAO_AMARELO' && ev.playerId) {
          yellowsByPlayer.set(ev.playerId, (yellowsByPlayer.get(ev.playerId) || 0) + 1);
        } else if (includeCards && ev.type === 'CARTAO_VERMELHO' && ev.playerId) {
          redsByPlayer.set(ev.playerId, (redsByPlayer.get(ev.playerId) || 0) + 1);
        }
      });
    });

    const gamesCount = clubFixtures.length;
    const updatedSquad = club.squad.map((p) => {
      const g = goalsByPlayer.get(p.id) || 0;
      const a = assistsByPlayer.get(p.id) || 0;
      const y = yellowsByPlayer.get(p.id) || 0;
      const r = redsByPlayer.get(p.id) || 0;
      const playedGames = p.isStarter ? gamesCount : g > 0 || a > 0 || y > 0 || r > 0 ? 1 : 0;

      if (playedGames === 0 && g === 0 && a === 0 && y === 0 && r === 0) return p;

      return {
        ...p,
        matches: p.matches + playedGames,
        goals: p.goals + g,
        assists: p.assists + a,
        yellowCards: p.yellowCards + y,
        redCards: p.redCards + r,
      };
    });

    return {
      ...club,
      finances:
        addedRevenue > 0
          ? {
              ...club.finances,
              balance: club.finances.balance + addedRevenue,
              totalIncomeSeason: club.finances.totalIncomeSeason + addedRevenue,
            }
          : club.finances,
      squad: updatedSquad,
    };
  });

  return applyCpuClubsDynamicRatingsAfterFixtures(
    creditedClubs,
    completedCpuFixtures,
    userClubId
  );
}

/**
 * Resolves the winner of a two-legged or single-leg tie.
 */
export function resolveTieWinner(leg1?: Fixture, leg2OrSingle?: Fixture): string | null {
  if (!leg2OrSingle || !leg2OrSingle.played) return null;

  if (leg2OrSingle.competition === 'concacaf_champions') {
    return resolveConcacafTieWinner(leg1, leg2OrSingle);
  }

  if (leg2OrSingle.competition === 'afc_champions') {
    return leg1
      ? resolveAfcTwoLegWinner(leg1, leg2OrSingle)
      : resolveAfcSingleMatchWinner(leg2OrSingle);
  }

  if (leg2OrSingle.aggregateWinnerId) return leg2OrSingle.aggregateWinnerId;

  if (
    leg2OrSingle.penaltiesHome !== undefined &&
    leg2OrSingle.penaltiesAway !== undefined &&
    leg2OrSingle.penaltiesHome !== leg2OrSingle.penaltiesAway
  ) {
    return leg2OrSingle.penaltiesHome > leg2OrSingle.penaltiesAway
      ? leg2OrSingle.homeTeamId
      : leg2OrSingle.awayTeamId;
  }

  if (leg1 && leg1.played) {
    const teamA = leg1.homeTeamId;
    const teamB = leg1.awayTeamId;
    const goalsA = (leg1.homeScore || 0) + (leg2OrSingle.awayScore || 0);
    const goalsB = (leg1.awayScore || 0) + (leg2OrSingle.homeScore || 0);
    if (goalsA > goalsB) return teamA;
    if (goalsB > goalsA) return teamB;
    return teamB;
  }

  const h = leg2OrSingle.homeScore || 0;
  const a = leg2OrSingle.awayScore || 0;
  return h >= a ? leg2OrSingle.homeTeamId : leg2OrSingle.awayTeamId;
}

/**
 * Resolves the champion club ID of a completed cup competition (Copa do Brasil, Libertadores, Sul-Americana, Série D, etc.)
 */
export function resolveCupChampionId(fixtures: Fixture[] = []): string | undefined {
  if (fixtures.length === 0) return undefined;

  // Single-leg final (e.g., Copa do Brasil, Libertadores, Sul-Americana, Supercopas, English/Euro/World Supercups)
  const isSingleFinalFixture = (f: Fixture): boolean =>
    !f.leg &&
    (fixtures.length === 1 ||
      f.id === 'cdb_final_unica' ||
      f.id === 'lib_grande_final' ||
      f.id === 'sula_final' ||
      f.id === 'cint_final' ||
      f.id === 'conc_final' ||
      f.id === 'afc_final' ||
      f.id === 'smwc_grande_final' ||
      f.id.startsWith('intercont_final') ||
      f.id.endsWith('_final') ||
      f.id.includes('_super') ||
      f.id.includes('supercup') ||
      f.id.includes('supercopa') ||
      f.id.includes('comm_shield') ||
      (f.cupPhase || '').toLowerCase().includes('grande final') ||
      (f.cupPhase || '').toLowerCase().includes('supercopa') ||
      (f.cupPhase || '').toLowerCase().includes('supertaça') ||
      (f.cupPhase || '').toLowerCase().includes('decisão'));

  const singleFinal = fixtures.find(isSingleFinalFixture);
  if (singleFinal && singleFinal.played) {
    return resolveTieWinner(undefined, singleFinal) || undefined;
  }

  // Two-legged final (e.g., Recopa, Série D Final, Campeonato Potiguar Final, Copa do Nordeste Final, or legacy CdB final)
  const finalVolta = fixtures.find(
    (f) =>
      f.leg === 2 &&
      (f.id.includes('final_volta') ||
        f.id.endsWith('_final_rn_volta') ||
        (f.cupPhase || '').toLowerCase().includes('grande final') ||
        (f.cupPhase || '').toLowerCase().includes('final da copa do nordeste') ||
        (f.cupPhase || '').toLowerCase().includes('recopa'))
  );
  if (finalVolta && finalVolta.played) {
    const finalIda = fixtures.find(
      (f) =>
        f.leg === 1 &&
        (f.id === finalVolta.id.replace('_volta', '_ida') || f.cupPhase === finalVolta.cupPhase)
    );
    return resolveTieWinner(finalIda, finalVolta) || undefined;
  }

  return undefined;
}

/**
 * Resolves the runner-up club ID of a completed cup competition final
 */
export function resolveCupRunnerUpId(fixtures: Fixture[] = []): string | undefined {
  if (fixtures.length === 0) return undefined;
  const champId = resolveCupChampionId(fixtures);
  if (!champId) return undefined;

  const singleFinal = fixtures.find(
    (f) =>
      !f.leg &&
      (fixtures.length === 1 ||
        f.id === 'cdb_final_unica' ||
        f.id === 'lib_grande_final' ||
        f.id === 'sula_final' ||
        f.id === 'cint_final' ||
        f.id === 'conc_final' ||
        f.id === 'afc_final' ||
        f.id === 'smwc_grande_final' ||
        f.id.startsWith('intercont_final') ||
        f.id.endsWith('_final') ||
        f.id.includes('_super') ||
        f.id.includes('supercup') ||
        f.id.includes('supercopa') ||
        f.id.includes('comm_shield') ||
        (f.cupPhase || '').toLowerCase().includes('grande final') ||
        (f.cupPhase || '').toLowerCase().includes('supercopa') ||
        (f.cupPhase || '').toLowerCase().includes('supertaça') ||
        (f.cupPhase || '').toLowerCase().includes('decisão'))
  );
  if (singleFinal && singleFinal.played) {
    return singleFinal.homeTeamId === champId ? singleFinal.awayTeamId : singleFinal.homeTeamId;
  }

  const finalVolta = fixtures.find(
    (f) =>
      f.leg === 2 &&
      (f.id.includes('final_volta') ||
        f.id.endsWith('_final_rn_volta') ||
        (f.cupPhase || '').toLowerCase().includes('grande final') ||
        (f.cupPhase || '').toLowerCase().includes('final da copa do nordeste') ||
        (f.cupPhase || '').toLowerCase().includes('recopa'))
  );
  if (finalVolta && finalVolta.played) {
    return finalVolta.homeTeamId === champId ? finalVolta.awayTeamId : finalVolta.homeTeamId;
  }

  return undefined;
}

export interface PotiguarFinalClassification {
  rankedClubIds: string[];
  championId?: string;
  runnerUpId?: string;
  top3Ids: string[]; // Vagas Série D + Copa do Brasil
  copaNordesteIds: string[]; // Top 2 -> Vagas Copa do Nordeste
  copaBrasilIds: string[]; // Top 3 -> Vagas Copa do Brasil
  serieDQualifiedIds: string[]; // 3 vagas para a Série D (repassando caso algum do Top 3 já esteja em A/B/C)
}

export interface EstadualStateClassification {
  uf: BrazilianStateUF;
  tournamentName: string;
  shortName: string;
  rankedClubIds: string[];
  championId?: string;
  runnerUpId?: string;
  serieDQualifiedIds: string[];
  copaBrasilIds: string[];
  copaNordesteIds: string[];
  copaVerdeIds: string[];
}

export interface AllEstaduaisClassificationSummary {
  byUf: Record<BrazilianStateUF, EstadualStateClassification>;
  allSerieDQualifiedIds: string[];
  allCopaBrasilQualifiedIds: string[];
  allCopaNordesteQualifiedIds: string[];
  allCopaVerdeQualifiedIds: string[];
}

export function resolveEstadualClassificationForConfig(
  cfg: EstadualCompetitionConfig,
  fixturesEstadual: Fixture[] = [],
  standingsEstadual: Standing[] = [],
  clubs: Club[] = []
): EstadualStateClassification {
  const key = cfg.key;
  const stateName = cfg.name;
  const firstPhaseOrdered = standingsEstadual
    .filter((s) => s.group === stateName)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

  const phaseRankIndex = new Map<string, number>();
  firstPhaseOrdered.forEach((s, idx) => phaseRankIndex.set(s.teamId, idx));
  const sortByFirstPhase = (ids: string[]) =>
    [...ids].sort((a, b) => (phaseRankIndex.get(a) ?? 99) - (phaseRankIndex.get(b) ?? 99));

  const getFix = (id: string) => fixturesEstadual.find((f) => f.id === id);

  let championId: string | undefined;
  let runnerUpId: string | undefined;

  if (cfg.finalLegs === 1) {
    const singleFinal = getFix(`est_final_${key}`);
    if (singleFinal?.played) {
      championId = resolveTieWinner(undefined, singleFinal) || undefined;
      if (championId) {
        runnerUpId =
          singleFinal.homeTeamId === championId ? singleFinal.awayTeamId : singleFinal.homeTeamId;
      }
    }
  } else {
    const finalIda = getFix(`est_final_${key}_ida`);
    const finalVolta = getFix(`est_final_${key}_volta`);
    if (finalVolta?.played) {
      championId = resolveTieWinner(finalIda, finalVolta) || undefined;
      if (championId) {
        runnerUpId =
          finalVolta.homeTeamId === championId ? finalVolta.awayTeamId : finalVolta.homeTeamId;
      }
    }
  }
  if (runnerUpId === 'tbd') runnerUpId = undefined;

  const semiParticipants = new Set<string>();
  for (let s = 0; s < 2; s++) {
    const sfFix =
      cfg.sfLegs === 1 ? getFix(`est_semi_${key}_m${s}`) : getFix(`est_semi_${key}_m${s}_ida`);
    if (sfFix?.homeTeamId && sfFix.homeTeamId !== 'tbd') semiParticipants.add(sfFix.homeTeamId);
    if (sfFix?.awayTeamId && sfFix.awayTeamId !== 'tbd') semiParticipants.add(sfFix.awayTeamId);
  }

  const qfParticipants = new Set<string>();
  for (let q = 0; q < 4; q++) {
    const qfFix =
      cfg.qfLegs === 1 ? getFix(`est_qf_${key}_m${q}`) : getFix(`est_qf_${key}_m${q}_ida`);
    if (qfFix?.homeTeamId && qfFix.homeTeamId !== 'tbd') qfParticipants.add(qfFix.homeTeamId);
    if (qfFix?.awayTeamId && qfFix.awayTeamId !== 'tbd') qfParticipants.add(qfFix.awayTeamId);
  }

  const rankedClubIds: string[] = [];
  const pushUnique = (id?: string) => {
    if (id && id !== 'tbd' && !rankedClubIds.includes(id)) {
      rankedClubIds.push(id);
    }
  };

  pushUnique(championId);
  pushUnique(runnerUpId);
  sortByFirstPhase(Array.from(semiParticipants)).forEach(pushUnique);
  sortByFirstPhase(Array.from(qfParticipants)).forEach(pushUnique);
  firstPhaseOrdered.forEach((s) => pushUnique(s.teamId));

  if (rankedClubIds.length === 0 && clubs.length > 0) {
    clubs
      .filter((c) => c.state === cfg.uf && ['A', 'B', 'C', 'D', 'EST'].includes(c.division))
      .forEach((c) => pushUnique(c.id));
  }

  const clubsById = new Map(clubs.map((c) => [c.id, c]));

  // Série D berths: skip clubs already guaranteed in Série A, B, or C (official CBF rule)
  const serieDQualifiedIds: string[] = [];
  for (const cid of rankedClubIds) {
    if (serieDQualifiedIds.length >= cfg.serieDSpots) break;
    const club = clubsById.get(cid);
    if (club && ['A', 'B', 'C'].includes(club.division)) continue;
    serieDQualifiedIds.push(cid);
  }

  // Copa do Brasil berths: RN preserves strict Top 3; other states pass spots past Série A clubs (which already enter 5ª Fase)
  const copaBrasilIds: string[] = [];
  if (cfg.uf === 'RN') {
    rankedClubIds.slice(0, cfg.copaBrasilSpots).forEach((cid) => copaBrasilIds.push(cid));
  } else {
    for (const cid of rankedClubIds) {
      if (copaBrasilIds.length >= cfg.copaBrasilSpots) break;
      const club = clubsById.get(cid);
      if (club && club.division === 'A') continue;
      copaBrasilIds.push(cid);
    }
    if (copaBrasilIds.length < cfg.copaBrasilSpots) {
      for (const cid of rankedClubIds) {
        if (copaBrasilIds.length >= cfg.copaBrasilSpots) break;
        if (!copaBrasilIds.includes(cid)) copaBrasilIds.push(cid);
      }
    }
  }

  const copaNordesteIds =
    cfg.copaNordesteSpots > 0 ? rankedClubIds.slice(0, cfg.copaNordesteSpots) : [];
  const copaVerdeIds =
    cfg.copaVerdeSpots > 0 ? rankedClubIds.slice(0, cfg.copaVerdeSpots) : [];

  return {
    uf: cfg.uf,
    tournamentName: cfg.name,
    shortName: cfg.shortName,
    rankedClubIds,
    championId,
    runnerUpId,
    serieDQualifiedIds,
    copaBrasilIds,
    copaNordesteIds,
    copaVerdeIds,
  };
}

/**
 * Resolves final classifications and official CBF national & regional competition berths
 * across all 27 Brazilian State Championships (Campeonatos Estaduais).
 */
export function resolveAllEstaduaisFinalClassifications(
  fixturesEstadual: Fixture[] = [],
  standingsEstadual: Standing[] = [],
  clubs: Club[] = []
): AllEstaduaisClassificationSummary {
  const byUf = {} as Record<BrazilianStateUF, EstadualStateClassification>;
  const allSerieDQualifiedIds: string[] = [];
  const allCopaBrasilQualifiedIds: string[] = [];
  const allCopaNordesteQualifiedIds: string[] = [];
  const allCopaVerdeQualifiedIds: string[] = [];

  const pushUniq = (arr: string[], id: string) => {
    if (id && !arr.includes(id)) arr.push(id);
  };

  for (const cfg of ESTADUAIS_2026_CONFIG) {
    const res = resolveEstadualClassificationForConfig(
      cfg,
      fixturesEstadual,
      standingsEstadual,
      clubs
    );
    byUf[cfg.uf] = res;
    res.serieDQualifiedIds.forEach((id) => pushUniq(allSerieDQualifiedIds, id));
    res.copaBrasilIds.forEach((id) => pushUniq(allCopaBrasilQualifiedIds, id));
    res.copaNordesteIds.forEach((id) => pushUniq(allCopaNordesteQualifiedIds, id));
    res.copaVerdeIds.forEach((id) => pushUniq(allCopaVerdeQualifiedIds, id));
  }

  return {
    byUf,
    allSerieDQualifiedIds,
    allCopaBrasilQualifiedIds,
    allCopaNordesteQualifiedIds,
    allCopaVerdeQualifiedIds,
  };
}

/**
 * Resolves the official final classification of Campeonato Potiguar (RN):
 * - Top 3 -> Série D & Copa do Brasil
 * - Top 2 -> Copa do Nordeste
 */
export function resolvePotiguarFinalClassification(
  fixturesEstadual: Fixture[] = [],
  standingsEstadual: Standing[] = [],
  clubs: Club[] = []
): PotiguarFinalClassification {
  const rnCfg = getEstadualConfigByUf('RN')!;
  const res = resolveEstadualClassificationForConfig(
    rnCfg,
    fixturesEstadual,
    standingsEstadual,
    clubs
  );
  return {
    rankedClubIds: res.rankedClubIds,
    championId: res.championId,
    runnerUpId: res.runnerUpId,
    top3Ids: res.rankedClubIds.slice(0, 3),
    copaNordesteIds: res.copaNordesteIds,
    copaBrasilIds: res.copaBrasilIds,
    serieDQualifiedIds: res.serieDQualifiedIds,
  };
}

interface SerieDCampaignStats {
  teamId: string;
  points: number;
  won: number;
  goalDifference: number;
  goalsFor: number;
  played: number;
}

/**
 * Computes accumulated overall campaign across ALL played Brasileirão Série D matches
 * (1ª Fase + Mata-Mata) used by CBF for Quarterfinals (5ª Fase), Semifinals and Final seeding.
 */
export function computeSerieDOverallCampaignMap(
  fixturesD: Fixture[] = [],
  standingsD: Standing[] = []
): Map<string, SerieDCampaignStats> {
  const map = new Map<string, SerieDCampaignStats>();
  const ensure = (id: string): SerieDCampaignStats => {
    let cur = map.get(id);
    if (!cur) {
      cur = { teamId: id, points: 0, won: 0, goalDifference: 0, goalsFor: 0, played: 0 };
      map.set(id, cur);
    }
    return cur;
  };

  let playedMatches = 0;
  for (const f of fixturesD) {
    if (!f.played || f.homeScore === null || f.awayScore === null) continue;
    if (!f.homeTeamId || f.homeTeamId === 'tbd' || !f.awayTeamId || f.awayTeamId === 'tbd') continue;
    playedMatches++;
    const h = ensure(f.homeTeamId);
    const a = ensure(f.awayTeamId);
    h.played++;
    a.played++;
    h.goalsFor += f.homeScore;
    a.goalsFor += f.awayScore;
    h.goalDifference += f.homeScore - f.awayScore;
    a.goalDifference += f.awayScore - f.homeScore;
    if (f.homeScore > f.awayScore) {
      h.points += 3;
      h.won += 1;
    } else if (f.awayScore > f.homeScore) {
      a.points += 3;
      a.won += 1;
    } else {
      h.points += 1;
      a.points += 1;
    }
  }

  // Fallback to standingsD if fixturesD wasn't populated
  if (playedMatches === 0) {
    for (const st of standingsD) {
      map.set(st.teamId, {
        teamId: st.teamId,
        points: st.points,
        won: st.won,
        goalDifference: st.goalDifference,
        goalsFor: st.goalsFor,
        played: st.played,
      });
    }
  }

  return map;
}

function compareSerieDCampaign(
  aId: string,
  bId: string,
  campaignMap: Map<string, SerieDCampaignStats>
): number {
  const a = campaignMap.get(aId) || { points: 0, won: 0, goalDifference: 0, goalsFor: 0 };
  const b = campaignMap.get(bId) || { points: 0, won: 0, goalDifference: 0, goalsFor: 0 };
  if (b.points !== a.points) return b.points - a.points;
  if (b.won !== a.won) return b.won - a.won;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return aId.localeCompare(bId);
}

/**
 * Extracts all clubs that reached the 3ª Fase (16-avos de final — 32 clubs) of the previous Série D.
 * Under official CBF regulation, reaching the 3ª Fase guarantees a berth in next season's Série D
 * if the club does not earn promotion to Série C.
 */
export function resolveSerieDThirdPhaseParticipantIds(
  fixturesD: Fixture[] = [],
  standingsD: Standing[] = []
): string[] {
  const participantSet = new Set<string>();
  for (const f of fixturesD) {
    if (!f.id.startsWith('sd_f3_m')) continue;
    if (f.homeTeamId && f.homeTeamId !== 'tbd') participantSet.add(f.homeTeamId);
    if (f.awayTeamId && f.awayTeamId !== 'tbd') participantSet.add(f.awayTeamId);
  }

  const campaignMap = computeSerieDOverallCampaignMap(fixturesD, standingsD);
  if (participantSet.size > 0) {
    return Array.from(participantSet).sort((a, b) => compareSerieDCampaign(a, b, campaignMap));
  }

  // Fallback if knockout didn't populate 3ª Fase yet: top 32 overall campaigns from standingsD
  return [...standingsD]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    })
    .slice(0, 32)
    .map((s) => s.teamId);
}

/**
 * Applies official CBF Série D 96-club qualification criteria for the upcoming season:
 * 1. 4 rebaixados da Série C
 * 2. 64 vagas via Campeonatos Estaduais (cotas RNF: SP=4; RJ/MG/RS/PR/CE/GO/SC/BA=3; demais 18 UFs=2, pulando clubes em A/B/C)
 * 3. Até 26 vagas para clubes que alcançaram a 3ª Fase da Série D anterior (sem acesso e sem duplicidade)
 * 4. Vagas restantes (mínimo 2 + eventuais remanejamentos de sobreposição) preenchidas pelo Ranking Nacional de Clubes (RNC)
 */
export function applyAllEstaduaisQualificationsAndRebalanceSerieD(
  clubs: Club[],
  allEstaduais: AllEstaduaisClassificationSummary,
  standingsD: Standing[] = [],
  relegatedFromCIds: string[] = [],
  _userClubId?: string,
  fixturesD: Fixture[] = []
): Club[] {
  const TARGET_SERIE_D_CLUBS = 96;
  const eligibleClubs = clubs.filter(
    (c) => (c.division === 'D' || c.division === 'EST') && (!c.country || c.country === 'Brasil')
  );
  const eligibleSet = new Set(eligibleClubs.map((c) => c.id));

  const selectedIds: string[] = [];
  const selectedSet = new Set<string>();
  const addSlot = (id: string) => {
    if (selectedIds.length >= TARGET_SERIE_D_CLUBS) return false;
    if (!id || !eligibleSet.has(id) || selectedSet.has(id)) return false;
    selectedSet.add(id);
    selectedIds.push(id);
    return true;
  };

  // Critério 1: 4 rebaixados da Série C
  relegatedFromCIds.forEach((id) => addSlot(id));

  // Critério 2: 64 vagas via campeonatos estaduais (cotas RNF 4/3/2 já pulando clubes de A/B/C)
  allEstaduais.allSerieDQualifiedIds.forEach((id) => addSlot(id));

  // Critério 3: Até 26 vagas para clubes que chegaram à 3ª fase da Série D anterior (sem acesso)
  const thirdPhaseIds = resolveSerieDThirdPhaseParticipantIds(fixturesD, standingsD);
  let addedFromThirdPhase = 0;
  for (const id of thirdPhaseIds) {
    if (addedFromThirdPhase >= 26 || selectedIds.length >= TARGET_SERIE_D_CLUBS) break;
    if (addSlot(id)) {
      addedFromThirdPhase++;
    }
  }

  // Critério 4: Vagas restantes (2 + remanejamentos de sobreposição) pelo RNC (reputação + força do elenco + estádio)
  if (selectedIds.length < TARGET_SERIE_D_CLUBS) {
    const getSquadAvgOvr = (club: Club) => {
      if (!club.squad || club.squad.length === 0) return 60;
      const top11 = [...club.squad].sort((a, b) => b.overall - a.overall).slice(0, 11);
      return top11.reduce((acc, p) => acc + p.overall, 0) / top11.length;
    };

    const rncCandidates = eligibleClubs
      .filter((c) => !selectedSet.has(c.id))
      .sort((a, b) => {
        if (b.reputation !== a.reputation) return b.reputation - a.reputation;
        const ovrDiff = getSquadAvgOvr(b) - getSquadAvgOvr(a);
        if (Math.abs(ovrDiff) > 0.05) return ovrDiff;
        return (b.stadium?.capacity || 0) - (a.stadium?.capacity || 0);
      });

    for (const c of rncCandidates) {
      if (selectedIds.length >= TARGET_SERIE_D_CLUBS) break;
      addSlot(c.id);
    }
  }

  return clubs.map((c) => {
    if (!eligibleSet.has(c.id)) return c;
    return {
      ...c,
      division: selectedSet.has(c.id) ? ('D' as const) : ('EST' as const),
    };
  });
}

/**
 * Legacy wrapper compatible with existing call sites; delegates to 96-club Série D rebalancing.
 */
export function applyPotiguarQualificationsAndRebalanceSerieD(
  clubs: Club[],
  potiguarClass: PotiguarFinalClassification,
  standingsD: Standing[] = [],
  relegatedFromCIds: string[] = [],
  userClubId?: string,
  allEstaduais?: AllEstaduaisClassificationSummary,
  fixturesD: Fixture[] = []
): Club[] {
  if (allEstaduais) {
    return applyAllEstaduaisQualificationsAndRebalanceSerieD(
      clubs,
      allEstaduais,
      standingsD,
      relegatedFromCIds,
      userClubId,
      fixturesD
    );
  }
  const minimalSummary: AllEstaduaisClassificationSummary = {
    byUf: {
      RN: {
        uf: 'RN',
        tournamentName: 'Campeonato Potiguar (RN)',
        shortName: 'Potiguar (RN)',
        rankedClubIds: potiguarClass.rankedClubIds,
        championId: potiguarClass.championId,
        runnerUpId: potiguarClass.runnerUpId,
        serieDQualifiedIds: potiguarClass.serieDQualifiedIds,
        copaBrasilIds: potiguarClass.copaBrasilIds,
        copaNordesteIds: potiguarClass.copaNordesteIds,
        copaVerdeIds: [],
      },
    } as unknown as Record<BrazilianStateUF, EstadualStateClassification>,
    allSerieDQualifiedIds: potiguarClass.serieDQualifiedIds,
    allCopaBrasilQualifiedIds: potiguarClass.copaBrasilIds,
    allCopaNordesteQualifiedIds: potiguarClass.copaNordesteIds,
    allCopaVerdeQualifiedIds: [],
  };
  return applyAllEstaduaisQualificationsAndRebalanceSerieD(
    clubs,
    minimalSummary,
    standingsD,
    relegatedFromCIds,
    userClubId,
    fixturesD
  );
}

/**
 * Builds TrophyRecord entries for all 27 Campeonatos Estaduais, Copa do Nordeste, and Copa Verde at season end.
 */
export function buildRegionalCupTrophyRecords(
  clubs: Club[],
  seasonYear: number,
  userClubId: string,
  potiguarClass: PotiguarFinalClassification,
  fixturesCopaNordeste: Fixture[] = [],
  allEstaduais?: AllEstaduaisClassificationSummary,
  fixturesCopaVerde: Fixture[] = []
): Array<{
  year: number;
  competition: string;
  championTeamName: string;
  runnerUpTeamName: string;
  userWon: boolean;
}> {
  const records: Array<{
    year: number;
    competition: string;
    championTeamName: string;
    runnerUpTeamName: string;
    userWon: boolean;
  }> = [];
  const clubById = new Map(clubs.map((c) => [c.id, c]));

  if (allEstaduais) {
    for (const cfg of ESTADUAIS_2026_CONFIG) {
      const st = allEstaduais.byUf[cfg.uf];
      if (!st?.championId) continue;
      const champ = clubById.get(st.championId);
      const runner = st.runnerUpId ? clubById.get(st.runnerUpId) : undefined;
      if (champ) {
        records.push({
          year: seasonYear,
          competition: cfg.name,
          championTeamName: champ.name,
          runnerUpTeamName: runner?.name || `Vice-Campeão (${cfg.uf})`,
          userWon: champ.id === userClubId,
        });
      }
    }
  } else if (potiguarClass.championId) {
    const champ = clubById.get(potiguarClass.championId);
    const runner = potiguarClass.runnerUpId ? clubById.get(potiguarClass.runnerUpId) : undefined;
    if (champ) {
      records.push({
        year: seasonYear,
        competition: 'Campeonato Potiguar (RN)',
        championTeamName: champ.name,
        runnerUpTeamName: runner?.name || 'Vice-Campeão Potiguar',
        userWon: champ.id === userClubId,
      });
    }
  }

  const cneChampId = resolveCupChampionId(fixturesCopaNordeste);
  const cneFinalVolta = fixturesCopaNordeste.find((f) => f.id === 'cne_final_volta');
  if (cneChampId && cneFinalVolta?.played) {
    const champ = clubById.get(cneChampId);
    const runnerId =
      cneFinalVolta.homeTeamId === cneChampId
        ? cneFinalVolta.awayTeamId
        : cneFinalVolta.homeTeamId;
    const runner = clubById.get(runnerId);
    if (champ) {
      records.push({
        year: seasonYear,
        competition: 'Copa do Nordeste',
        championTeamName: champ.name,
        runnerUpTeamName: runner?.name || 'Vice-Campeão do Nordeste',
        userWon: champ.id === userClubId,
      });
    }
  }

  const cvChampId = resolveCupChampionId(fixturesCopaVerde);
  const cvFinalVolta = fixturesCopaVerde.find((f) => f.id === 'cv_final_volta');
  if (cvChampId && cvFinalVolta?.played) {
    const champ = clubById.get(cvChampId);
    const runnerId =
      cvFinalVolta.homeTeamId === cvChampId ? cvFinalVolta.awayTeamId : cvFinalVolta.homeTeamId;
    const runner = clubById.get(runnerId);
    if (champ) {
      records.push({
        year: seasonYear,
        competition: 'Copa Verde',
        championTeamName: champ.name,
        runnerUpTeamName: runner?.name || 'Vice-Campeão da Copa Verde',
        userWon: champ.id === userClubId,
      });
    }
  }

  return records;
}

/**
 * Resolves the 4 clubs promoted from Série D to Série C (the 4 Quarterfinal winners / Semifinalists,
 * falling back to top 4 overall campaign if knockout is incomplete).
 */
export function resolveSerieDPromotedIds(
  fixturesD: Fixture[] = [],
  standingsD: Standing[] = []
): string[] {
  const promoted: string[] = [];
  const getFix = (id: string) => fixturesD.find((f) => f.id === id);

  for (let i = 0; i < 4; i++) {
    const w = resolveTieWinner(getFix(`sd_quartas_m${i}_ida`), getFix(`sd_quartas_m${i}_volta`));
    if (w && w !== 'tbd' && !promoted.includes(w)) {
      promoted.push(w);
    }
  }

  if (promoted.length < 4) {
    const sortedCampaign = [...standingsD].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    for (const st of sortedCampaign) {
      if (promoted.length >= 4) break;
      if (st.teamId && st.teamId !== 'tbd' && !promoted.includes(st.teamId)) {
        promoted.push(st.teamId);
      }
    }
  }

  return promoted.slice(0, 4);
}

export function assignSingleLegSlots(
  list: Fixture[],
  fixtureId: string,
  homeId?: string | null,
  awayId?: string | null
): Fixture[] {
  if (!homeId && !awayId) return list;
  return list.map((f) => {
    if (f.id !== fixtureId || f.played) return f;
    return {
      ...f,
      homeTeamId: homeId && homeId !== 'tbd' ? homeId : f.homeTeamId,
      awayTeamId: awayId && awayId !== 'tbd' ? awayId : f.awayTeamId,
    };
  });
}

export function assignTwoLeggedSlots(
  list: Fixture[],
  idaId: string,
  voltaId: string,
  idaHomeId?: string | null,
  idaAwayId?: string | null
): Fixture[] {
  if (!idaHomeId && !idaAwayId) return list;
  return list.map((f) => {
    if (f.id === idaId && !f.played) {
      return {
        ...f,
        homeTeamId: idaHomeId && idaHomeId !== 'tbd' ? idaHomeId : f.homeTeamId,
        awayTeamId: idaAwayId && idaAwayId !== 'tbd' ? idaAwayId : f.awayTeamId,
      };
    }
    if (f.id === voltaId && !f.played) {
      return {
        ...f,
        homeTeamId: idaAwayId && idaAwayId !== 'tbd' ? idaAwayId : f.homeTeamId,
        awayTeamId: idaHomeId && idaHomeId !== 'tbd' ? idaHomeId : f.awayTeamId,
      };
    }
    return f;
  });
}

function syncContinental32Bracket(
  fixtures: Fixture[],
  standings: Standing[],
  prefix: 'lib' | 'sula' | 'ucl' | 'uel' | 'uecl' | 'cint',
  finalId: string
): Fixture[] {
  let list = [...fixtures];
  const getFix = (id: string) => list.find((f) => f.id === id);

  const hasOitavas = list.some((f) => f.id === `${prefix}_oitavas_m0_ida`);
  const groupGames = list.filter((f) => isStandingsFixture(f));
  const allGroupPlayed = groupGames.length > 0 && groupGames.every((f) => f.played);

  if (hasOitavas) {
    if (allGroupPlayed) {
      const topTwoOf = (grp: string): [string | undefined, string | undefined] => {
        const ordered = standings.filter((s) => s.group === grp);
        return [ordered[0]?.teamId, ordered[1]?.teamId];
      };

      const [a1, a2] = topTwoOf('Grupo A');
      const [b1, b2] = topTwoOf('Grupo B');
      const [c1, c2] = topTwoOf('Grupo C');
      const [d1, d2] = topTwoOf('Grupo D');
      const [e1, e2] = topTwoOf('Grupo E');
      const [f1, f2] = topTwoOf('Grupo F');
      const [g1, g2] = topTwoOf('Grupo G');
      const [h1, h2] = topTwoOf('Grupo H');

      const pairings: Array<[string | undefined, string | undefined]> = [
        [b2, a1],
        [d2, c1],
        [f2, e1],
        [h2, g1],
        [a2, b1],
        [c2, d1],
        [e2, f1],
        [g2, h1],
      ];

      pairings.forEach(([idaHome, idaAway], idx) => {
        list = assignTwoLeggedSlots(
          list,
          `${prefix}_oitavas_m${idx}_ida`,
          `${prefix}_oitavas_m${idx}_volta`,
          idaHome,
          idaAway
        );
      });
    }

    // Oitavas (m0..7) -> Quartas (m0..3)
    for (let q = 0; q < 4; q++) {
      const w1 = resolveTieWinner(
        getFix(`${prefix}_oitavas_m${q * 2}_ida`),
        getFix(`${prefix}_oitavas_m${q * 2}_volta`)
      );
      const w2 = resolveTieWinner(
        getFix(`${prefix}_oitavas_m${q * 2 + 1}_ida`),
        getFix(`${prefix}_oitavas_m${q * 2 + 1}_volta`)
      );
      list = assignTwoLeggedSlots(
        list,
        `${prefix}_quartas_m${q}_ida`,
        `${prefix}_quartas_m${q}_volta`,
        w1,
        w2
      );
    }

    // Quartas (m0..3) -> Semifinal (1..2)
    for (let s = 0; s < 2; s++) {
      const w1 = resolveTieWinner(
        getFix(`${prefix}_quartas_m${s * 2}_ida`),
        getFix(`${prefix}_quartas_m${s * 2}_volta`)
      );
      const w2 = resolveTieWinner(
        getFix(`${prefix}_quartas_m${s * 2 + 1}_ida`),
        getFix(`${prefix}_quartas_m${s * 2 + 1}_volta`)
      );
      list = assignTwoLeggedSlots(
        list,
        `${prefix}_semi_${s + 1}_ida`,
        `${prefix}_semi_${s + 1}_volta`,
        w1,
        w2
      );
    }
  } else if (allGroupPlayed) {
    // Legacy 4-group fallback
    const leaderOf = (grp: string) => standings.filter((s) => s.group === grp)[0]?.teamId;
    list = assignTwoLeggedSlots(
      list,
      `${prefix}_semi_1_ida`,
      `${prefix}_semi_1_volta`,
      leaderOf('Grupo A'),
      leaderOf('Grupo B')
    );
    list = assignTwoLeggedSlots(
      list,
      `${prefix}_semi_2_ida`,
      `${prefix}_semi_2_volta`,
      leaderOf('Grupo C'),
      leaderOf('Grupo D')
    );
  }

  // Semifinal -> Grande Final (Jogo Único)
  const fin1 = resolveTieWinner(getFix(`${prefix}_semi_1_ida`), getFix(`${prefix}_semi_1_volta`));
  const fin2 = resolveTieWinner(getFix(`${prefix}_semi_2_ida`), getFix(`${prefix}_semi_2_volta`));
  list = assignSingleLegSlots(list, finalId, fin1, fin2);

  return list;
}

/**
 * Sincroniza o chaveamento oficial atual de 36 clubes da UEFA (Champions, Europa e Conference League):
 * - Tabela única de 36 clubes ("Fase de Liga"):
 *   · 1º ao 8º: Direto às Oitavas de Final (decidem a volta em casa)
 *   · 9º ao 24º: Playoffs do Mata-Mata (Ida e Volta; 9º–16º decidem a volta em casa)
 *   · 25º ao 36º: Eliminados diretamente
 * - Chaveamento estilo tênis (1º e 2º em lados opostos até a Grande Final)
 */
function syncUefaLeague36Bracket(
  fixtures: Fixture[],
  standings: Standing[],
  prefix: 'ucl' | 'uel' | 'uecl',
  finalId: string
): Fixture[] {
  const hasPlayoffs36 = fixtures.some((f) => f.id === `${prefix}_playoffs_m0_ida`);
  if (!hasPlayoffs36) {
    return syncContinental32Bracket(fixtures, standings, prefix, finalId);
  }

  let list = [...fixtures];
  const getFix = (id: string) => list.find((f) => f.id === id);

  const leagueGames = list.filter((f) => isStandingsFixture(f));
  const allLeaguePlayed = leagueGames.length > 0 && leagueGames.every((f) => f.played);

  const ordered = [...standings].sort(
    (a, b) =>
      b.points - a.points ||
      b.won - a.won ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
  );

  if (allLeaguePlayed && ordered.length >= 24) {
    // Playoffs (9º ao 24º): 17º–24º mandam a Ida; 9º–16º decidem a Volta em casa
    const playoffPairings: Array<[string | undefined, string | undefined]> = [
      [ordered[16]?.teamId, ordered[15]?.teamId], // m0: 17º vs 16º -> pega 1º
      [ordered[23]?.teamId, ordered[8]?.teamId],  // m1: 24º vs 9º  -> pega 8º
      [ordered[20]?.teamId, ordered[11]?.teamId], // m2: 21º vs 12º -> pega 5º
      [ordered[19]?.teamId, ordered[12]?.teamId], // m3: 20º vs 13º -> pega 4º
      [ordered[17]?.teamId, ordered[14]?.teamId], // m4: 18º vs 15º -> pega 2º
      [ordered[22]?.teamId, ordered[9]?.teamId],  // m5: 23º vs 10º -> pega 7º
      [ordered[21]?.teamId, ordered[10]?.teamId], // m6: 22º vs 11º -> pega 6º
      [ordered[18]?.teamId, ordered[13]?.teamId], // m7: 19º vs 14º -> pega 3º
    ];

    playoffPairings.forEach(([idaHome, idaAway], idx) => {
      list = assignTwoLeggedSlots(
        list,
        `${prefix}_playoffs_m${idx}_ida`,
        `${prefix}_playoffs_m${idx}_volta`,
        idaHome,
        idaAway
      );
    });

    // Oitavas de Final: Top 8 (1º, 8º, 5º, 4º | 2º, 7º, 6º, 3º) já entram pré-alocados decidindo a Volta em casa!
    const top8SeedIndices = [0, 7, 4, 3, 1, 6, 5, 2];
    for (let idx = 0; idx < 8; idx++) {
      const playoffWinner = resolveTieWinner(
        getFix(`${prefix}_playoffs_m${idx}_ida`),
        getFix(`${prefix}_playoffs_m${idx}_volta`)
      );
      const top8SeedTeamId = ordered[top8SeedIndices[idx]]?.teamId;
      list = assignTwoLeggedSlots(
        list,
        `${prefix}_oitavas_m${idx}_ida`,
        `${prefix}_oitavas_m${idx}_volta`,
        playoffWinner,
        top8SeedTeamId
      );
    }
  }

  // Oitavas (m0..7) -> Quartas (m0..3)
  for (let q = 0; q < 4; q++) {
    const w1 = resolveTieWinner(
      getFix(`${prefix}_oitavas_m${q * 2}_ida`),
      getFix(`${prefix}_oitavas_m${q * 2}_volta`)
    );
    const w2 = resolveTieWinner(
      getFix(`${prefix}_oitavas_m${q * 2 + 1}_ida`),
      getFix(`${prefix}_oitavas_m${q * 2 + 1}_volta`)
    );
    list = assignTwoLeggedSlots(
      list,
      `${prefix}_quartas_m${q}_ida`,
      `${prefix}_quartas_m${q}_volta`,
      w1,
      w2
    );
  }

  // Quartas (m0..3) -> Semifinal (1..2)
  for (let s = 0; s < 2; s++) {
    const w1 = resolveTieWinner(
      getFix(`${prefix}_quartas_m${s * 2}_ida`),
      getFix(`${prefix}_quartas_m${s * 2}_volta`)
    );
    const w2 = resolveTieWinner(
      getFix(`${prefix}_quartas_m${s * 2 + 1}_ida`),
      getFix(`${prefix}_quartas_m${s * 2 + 1}_volta`)
    );
    list = assignTwoLeggedSlots(
      list,
      `${prefix}_semi_${s + 1}_ida`,
      `${prefix}_semi_${s + 1}_volta`,
      w1,
      w2
    );
  }

  // Semifinal -> Grande Final (Jogo Único)
  const fin1 = resolveTieWinner(getFix(`${prefix}_semi_1_ida`), getFix(`${prefix}_semi_1_volta`));
  const fin2 = resolveTieWinner(getFix(`${prefix}_semi_2_ida`), getFix(`${prefix}_semi_2_volta`));
  list = assignSingleLegSlots(list, finalId, fin1, fin2);

  return list;
}

/**
 * Sincroniza os Playoffs de Acesso da EFL Championship (Inglaterra 2ª Divisão):
 * - 3º ao 8º colocados da fase regular disputam os playoffs pela 3ª vaga de acesso à Premier League:
 *   - 1ª Rodada (Jogo Único):
 *     - 5º vs 8º (5º manda o jogo)
 *     - 6º vs 7º (6º manda o jogo)
 *   - 2ª Rodada (Semifinais em Ida e Volta):
 *     - Semifinal A: 3º colocado vs Vencedor de (6º vs 7º) (Ida na casa do Venc 6/7, Volta na casa do 3º)
 *     - Semifinal B: 4º colocado vs Vencedor de (5º vs 8º) (Ida na casa do Venc 5/8, Volta na casa do 4º)
 *   - Grande Final (Jogo Único em Wembley):
 *     - Vencedor Semifinal A vs Vencedor Semifinal B
 *     - O campeão dos Playoffs garante a 3ª vaga de acesso à Premier League!
 */
function syncChampionshipPlayoffBracket(
  fixtures: Fixture[],
  standings?: Standing[]
): Fixture[] {
  const hasPlayoffs = fixtures.some((f) => f.id === 'eng_championship_playoff_r1_5v8');
  if (!hasPlayoffs) return fixtures;

  let list = [...fixtures];
  const getFix = (id: string) => list.find((f) => f.id === id);

  const regularGames = list.filter((f) => isStandingsFixture(f));
  const regularDone = regularGames.length > 0 && regularGames.every((f) => f.played);

  if (regularDone && standings && standings.length >= 8) {
    const ordered = [...standings].sort(
      (a, b) =>
        b.points - a.points ||
        b.won - a.won ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor
    );

    // 3º ao 8º colocados
    const team3 = ordered[2]?.teamId;
    const team4 = ordered[3]?.teamId;
    const team5 = ordered[4]?.teamId;
    const team6 = ordered[5]?.teamId;
    const team7 = ordered[6]?.teamId;
    const team8 = ordered[7]?.teamId;

    // 1ª Rodada (Jogo Único)
    // 5º vs 8º (5º em casa)
    list = assignSingleLegSlots(
      list,
      'eng_championship_playoff_r1_5v8',
      team5,
      team8
    );

    // 6º vs 7º (6º em casa)
    list = assignSingleLegSlots(
      list,
      'eng_championship_playoff_r1_6v7',
      team6,
      team7
    );

    // Vencedores da 1ª Rodada
    const r1Win58 = resolveTieWinner(undefined, getFix('eng_championship_playoff_r1_5v8'));
    const r1Win67 = resolveTieWinner(undefined, getFix('eng_championship_playoff_r1_6v7'));

    // 2ª Rodada: Semifinais (Ida e Volta)
    // Semifinal A: 3º vs Vencedor (6º vs 7º) (Ida na casa do Venc 6/7, Volta na casa do 3º)
    list = assignTwoLeggedSlots(
      list,
      'eng_championship_playoff_semiA_ida',
      'eng_championship_playoff_semiA_volta',
      r1Win67,
      team3
    );

    // Semifinal B: 4º vs Vencedor (5º vs 8º) (Ida na casa do Venc 5/8, Volta na casa do 4º)
    list = assignTwoLeggedSlots(
      list,
      'eng_championship_playoff_semiB_ida',
      'eng_championship_playoff_semiB_volta',
      r1Win58,
      team4
    );

    // Vencedores das Semifinais
    const semiWinnerA = resolveTieWinner(
      getFix('eng_championship_playoff_semiA_ida'),
      getFix('eng_championship_playoff_semiA_volta')
    );
    const semiWinnerB = resolveTieWinner(
      getFix('eng_championship_playoff_semiB_ida'),
      getFix('eng_championship_playoff_semiB_volta')
    );

    // Grande Final em Wembley (Jogo Único)
    if (semiWinnerA || semiWinnerB) {
      list = assignSingleLegSlots(
        list,
        'eng_championship_playoff_final',
        semiWinnerA,
        semiWinnerB
      );
    }
  }

  return list;
}

/**
 * Sincroniza os Playoffs de Acesso da EFL League One (Inglaterra 3ª Divisão):
 * - 3º colocado vs 6º colocado (Semifinal 1 em Ida e Volta - 3º decide em casa)
 * - 4º colocado vs 5º colocado (Semifinal 2 em Ida e Volta - 4º decide em casa)
 * - Vencedor Semi 1 vs Vencedor Semi 2 (Grande Final em Wembley em Jogo Único)
 * - Campeão dos Playoffs garante a 3ª vaga de acesso à EFL Championship!
 */
function syncLeagueOnePlayoffBracket(
  fixtures: Fixture[],
  standings?: Standing[]
): Fixture[] {
  const hasPlayoffs = fixtures.some((f) => f.id === 'eng_league_one_playoff_semi1_ida');
  if (!hasPlayoffs) return fixtures;

  let list = [...fixtures];
  const getFix = (id: string) => list.find((f) => f.id === id);

  const regularGames = list.filter((f) => isStandingsFixture(f));
  const regularDone = regularGames.length > 0 && regularGames.every((f) => f.played);

  if (regularDone && standings && standings.length >= 6) {
    const ordered = [...standings].sort(
      (a, b) =>
        b.points - a.points ||
        b.won - a.won ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor
    );

    // 3º ao 6º colocados
    const team3 = ordered[2]?.teamId;
    const team4 = ordered[3]?.teamId;
    const team5 = ordered[4]?.teamId;
    const team6 = ordered[5]?.teamId;

    // Semifinal 1: 3º vs 6º (6º manda a Ida, 3º decide a Volta em casa)
    list = assignTwoLeggedSlots(
      list,
      'eng_league_one_playoff_semi1_ida',
      'eng_league_one_playoff_semi1_volta',
      team6,
      team3
    );

    // Semifinal 2: 4º vs 5º (5º manda a Ida, 4º decide a Volta em casa)
    list = assignTwoLeggedSlots(
      list,
      'eng_league_one_playoff_semi2_ida',
      'eng_league_one_playoff_semi2_volta',
      team5,
      team4
    );

    const semi1Winner = resolveTieWinner(
      getFix('eng_league_one_playoff_semi1_ida'),
      getFix('eng_league_one_playoff_semi1_volta')
    );
    const semi2Winner = resolveTieWinner(
      getFix('eng_league_one_playoff_semi2_ida'),
      getFix('eng_league_one_playoff_semi2_volta')
    );

    if (semi1Winner || semi2Winner) {
      list = assignSingleLegSlots(
        list,
        'eng_league_one_playoff_final',
        semi1Winner,
        semi2Winner
      );
    }
  }

  return list;
}

/**
 * Sincroniza os Playoffs da EFL League Two (Inglaterra 4ª Divisão):
 * - 4º colocado vs 7º colocado (Semifinal 1 em Ida e Volta - 4º decide em casa)
 * - 5º colocado vs 6º colocado (Semifinal 2 em Ida e Volta - 5º decide em casa)
 * - Vencedor Semi 1 vs Vencedor Semi 2 (Grande Final em Wembley em Jogo Único)
 * - Campeão dos Playoffs garante a 4ª vaga de acesso à EFL League One!
 */
function syncLeagueTwoPlayoffBracket(
  fixtures: Fixture[],
  standings?: Standing[]
): Fixture[] {
  const hasPlayoffs = fixtures.some((f) => f.id === 'eng_league_two_playoff_semi1_ida');
  if (!hasPlayoffs) return fixtures;

  let list = [...fixtures];
  const getFix = (id: string) => list.find((f) => f.id === id);

  const regularGames = list.filter((f) => isStandingsFixture(f));
  const regularDone = regularGames.length > 0 && regularGames.every((f) => f.played);

  if (regularDone && standings && standings.length >= 7) {
    const ordered = [...standings].sort(
      (a, b) =>
        b.points - a.points ||
        b.won - a.won ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor
    );

    // 4º ao 7º colocados
    const team4 = ordered[3]?.teamId;
    const team5 = ordered[4]?.teamId;
    const team6 = ordered[5]?.teamId;
    const team7 = ordered[6]?.teamId;

    // Semifinal 1: 4º vs 7º (7º manda a Ida, 4º decide a Volta em casa)
    list = assignTwoLeggedSlots(
      list,
      'eng_league_two_playoff_semi1_ida',
      'eng_league_two_playoff_semi1_volta',
      team7,
      team4
    );

    // Semifinal 2: 5º vs 6º (6º manda a Ida, 5º decide a Volta em casa)
    list = assignTwoLeggedSlots(
      list,
      'eng_league_two_playoff_semi2_ida',
      'eng_league_two_playoff_semi2_volta',
      team6,
      team5
    );

    const semi1Winner = resolveTieWinner(
      getFix('eng_league_two_playoff_semi1_ida'),
      getFix('eng_league_two_playoff_semi1_volta')
    );
    const semi2Winner = resolveTieWinner(
      getFix('eng_league_two_playoff_semi2_ida'),
      getFix('eng_league_two_playoff_semi2_volta')
    );

    if (semi1Winner || semi2Winner) {
      list = assignSingleLegSlots(
        list,
        'eng_league_two_playoff_final',
        semi1Winner,
        semi2Winner
      );
    }
  }

  return list;
}

/**
 * Sincroniza o Playoff de Acesso do Brasileirão Série C (24 clubes · 46 rodadas):
 * - 1º ao 3º colocados sobem direto à Série B
 * - 4º colocado vs 7º colocado (Semifinal 1 em Ida e Volta - 4º decide em casa)
 * - 5º colocado vs 6º colocado (Semifinal 2 em Ida e Volta - 5º decide em casa)
 * - Vencedor Semi 1 vs Vencedor Semi 2 (Final em Jogo Único, mando da melhor campanha)
 * - Campeão do Playoff garante a 4ª vaga de acesso à Série B!
 */
function syncSerieCPlayoffBracket(
  fixtures: Fixture[],
  standings?: Standing[]
): Fixture[] {
  const hasPlayoffs = fixtures.some((f) => f.id === 'serie_c_playoff_semi1_ida');
  if (!hasPlayoffs) return fixtures;

  let list = [...fixtures];
  const getFix = (id: string) => list.find((f) => f.id === id);

  const regularGames = list.filter((f) => isStandingsFixture(f));
  const regularDone = regularGames.length > 0 && regularGames.every((f) => f.played);

  if (regularDone && standings && standings.length >= 7) {
    const ordered = [...standings].sort(
      (a, b) =>
        b.points - a.points ||
        b.won - a.won ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor
    );
    const rankIndex = new Map<string, number>();
    ordered.forEach((s, idx) => rankIndex.set(s.teamId, idx));

    const team4 = ordered[3]?.teamId;
    const team5 = ordered[4]?.teamId;
    const team6 = ordered[5]?.teamId;
    const team7 = ordered[6]?.teamId;

    // Semifinal 1: 4º vs 7º (7º manda a Ida, 4º decide a Volta em casa)
    list = assignTwoLeggedSlots(
      list,
      'serie_c_playoff_semi1_ida',
      'serie_c_playoff_semi1_volta',
      team7,
      team4
    );

    // Semifinal 2: 5º vs 6º (6º manda a Ida, 5º decide a Volta em casa)
    list = assignTwoLeggedSlots(
      list,
      'serie_c_playoff_semi2_ida',
      'serie_c_playoff_semi2_volta',
      team6,
      team5
    );

    const semi1Winner = resolveTieWinner(
      getFix('serie_c_playoff_semi1_ida'),
      getFix('serie_c_playoff_semi1_volta')
    );
    const semi2Winner = resolveTieWinner(
      getFix('serie_c_playoff_semi2_ida'),
      getFix('serie_c_playoff_semi2_volta')
    );

    if (semi1Winner || semi2Winner) {
      let finalHome = semi1Winner || undefined;
      let finalAway = semi2Winner || undefined;
      if (semi1Winner && semi2Winner) {
        const r1 = rankIndex.get(semi1Winner) ?? 99;
        const r2 = rankIndex.get(semi2Winner) ?? 99;
        if (r2 < r1) {
          finalHome = semi2Winner;
          finalAway = semi1Winner;
        }
      }
      list = assignSingleLegSlots(
        list,
        'serie_c_playoff_final',
        finalHome,
        finalAway
      );
    }
  }

  return list;
}

/**
 * Resolve os 4 clubes promovidos da Série C para a Série B:
 * - 1º, 2º e 3º colocados da fase regular (acesso direto)
 * - Campeão do Playoff de Acesso (4º ao 7º) na 4ª vaga (fallback: 4º colocado)
 */
export function resolveSerieCPromotedIds(
  standingsC?: Standing[],
  fixturesC?: Fixture[]
): string[] {
  const ordered = [...(standingsC || [])].sort(
    (a, b) =>
      b.points - a.points ||
      b.won - a.won ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
  );
  const direct = ordered.slice(0, 3).map((s) => s.teamId);
  const finalFix = (fixturesC || []).find((f) => f.id === 'serie_c_playoff_final');
  const playoffWinner = resolveTieWinner(undefined, finalFix);
  const fourthSpot =
    playoffWinner && !direct.includes(playoffWinner)
      ? playoffWinner
      : ordered[3]?.teamId;
  return fourthSpot ? [...direct, fourthSpot] : direct;
}

/**
 * Updates unplayed knockout fixtures in Copa do Brasil (9 phases), Libertadores (32 clubs),
 * Sul-Americana (32 clubs), Brasileirão Série C (playoff 4º-7º), Série D (96 clubs -> 64 knockout), and 27 Estaduais!
 */
export function syncDynamicKnockoutBrackets(state: {
  clubs?: Club[];
  currentDate?: string;
  fixturesCopaBrasil: Fixture[];
  fixturesLibertadores: Fixture[];
  fixturesSulamericana: Fixture[];
  fixturesEstadual: Fixture[];
  fixturesCopaNordeste?: Fixture[];
  fixturesCopaVerde?: Fixture[];
  fixturesC?: Fixture[];
  fixturesD?: Fixture[];
  fixturesIntercontinental?: Fixture[];
  fixturesChampionsLeague?: Fixture[];
  fixturesEuropaLeague?: Fixture[];
  fixturesConferenceLeague?: Fixture[];
  fixturesCopaInternacional?: Fixture[];
  fixturesConcacafChampions?: Fixture[];
  fixturesAfcChampions?: Fixture[];
  fixturesSuperMundial?: Fixture[];
  fixturesEngCommunityShield?: Fixture[];
  fixturesEngEflCup?: Fixture[];
  fixturesEngFaCup?: Fixture[];
  fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
  fixturesEuropeanCups?: Partial<Record<EuropeanCupId, Fixture[]>>;
  fixturesSouthAmericanCups?: Partial<Record<SouthAmericanCupId, Fixture[]>>;
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>;
  fixturesWorldCups?: Partial<Record<WorldCupId, Fixture[]>>;
  standingsLibertadores: Standing[];
  standingsSulamericana: Standing[];
  standingsEstadual: Standing[];
  standingsCopaNordeste?: Standing[];
  standingsCopaVerde?: Standing[];
  standingsC?: Standing[];
  standingsD?: Standing[];
  standingsChampionsLeague?: Standing[];
  standingsEuropaLeague?: Standing[];
  standingsConferenceLeague?: Standing[];
  standingsCopaInternacional?: Standing[];
  standingsAfcChampions?: Standing[];
  standingsSuperMundial?: Standing[];
  standingsEurope?: Partial<Record<EuropeanLeagueId, Standing[]>>;
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>;
}) {
  const getFix = (list: Fixture[], id: string) => list.find((f) => f.id === id);

  // 1. Copa do Brasil 2026 (9 phases: 1ª -> 2ª -> 3ª -> 4ª -> 5ª -> Oitavas -> Quartas -> Semifinal -> Final Única)
  let cdb = [...state.fixturesCopaBrasil];
  const has2026Phases = cdb.some((f) => f.id === 'cdb_f1_m0');

  if (has2026Phases) {
    // 1ª Fase (14) -> 2ª Fase (m0..m13 awayTeamId)
    for (let i = 0; i < 14; i++) {
      const w = resolveTieWinner(undefined, getFix(cdb, `cdb_f1_m${i}`));
      if (w) {
        cdb = assignSingleLegSlots(cdb, `cdb_f2_m${i}`, undefined, w);
      }
    }

    // 2ª Fase (44) -> 3ª Fase (24)
    for (let i = 0; i < 4; i++) {
      const w = resolveTieWinner(undefined, getFix(cdb, `cdb_f2_m${i}`));
      if (w) {
        cdb = assignSingleLegSlots(cdb, `cdb_f3_m${i}`, undefined, w);
      }
    }
    for (let k = 0; k < 20; k++) {
      const wHome = resolveTieWinner(undefined, getFix(cdb, `cdb_f2_m${4 + k * 2}`));
      const wAway = resolveTieWinner(undefined, getFix(cdb, `cdb_f2_m${4 + k * 2 + 1}`));
      cdb = assignSingleLegSlots(cdb, `cdb_f3_m${4 + k}`, wHome, wAway);
    }

    // 3ª Fase (24) -> 4ª Fase (12)
    for (let i = 0; i < 12; i++) {
      const wHome = resolveTieWinner(undefined, getFix(cdb, `cdb_f3_m${i * 2}`));
      const wAway = resolveTieWinner(undefined, getFix(cdb, `cdb_f3_m${i * 2 + 1}`));
      cdb = assignSingleLegSlots(cdb, `cdb_f4_m${i}`, wHome, wAway);
    }

    // 4ª Fase (12) -> 5ª Fase (m0..m11, opposing the 12 seeded Série A clubs; m12..m15 already pit the other 8 Série A clubs)
    for (let i = 0; i < 12; i++) {
      const w = resolveTieWinner(undefined, getFix(cdb, `cdb_f4_m${i}`));
      if (w) {
        cdb = assignTwoLeggedSlots(cdb, `cdb_f5_m${i}_ida`, `cdb_f5_m${i}_volta`, w, undefined);
      }
    }

    // 5ª Fase (16) -> Oitavas de Final (8)
    for (let i = 0; i < 8; i++) {
      const w1 = resolveTieWinner(
        getFix(cdb, `cdb_f5_m${i * 2}_ida`),
        getFix(cdb, `cdb_f5_m${i * 2}_volta`)
      );
      const w2 = resolveTieWinner(
        getFix(cdb, `cdb_f5_m${i * 2 + 1}_ida`),
        getFix(cdb, `cdb_f5_m${i * 2 + 1}_volta`)
      );
      cdb = assignTwoLeggedSlots(cdb, `cdb_oitavas_m${i}_ida`, `cdb_oitavas_m${i}_volta`, w1, w2);
    }
  }

  // Oitavas (m0..m7) -> Quartas (m0..m3)
  for (let q = 0; q < 4; q++) {
    const w1 = resolveTieWinner(
      getFix(cdb, `cdb_oitavas_m${q * 2}_ida`),
      getFix(cdb, `cdb_oitavas_m${q * 2}_volta`)
    );
    const w2 = resolveTieWinner(
      getFix(cdb, `cdb_oitavas_m${q * 2 + 1}_ida`),
      getFix(cdb, `cdb_oitavas_m${q * 2 + 1}_volta`)
    );
    cdb = assignTwoLeggedSlots(cdb, `cdb_quartas_m${q}_ida`, `cdb_quartas_m${q}_volta`, w1, w2);
  }

  // Quartas (m0..m3) -> Semifinal (m0..m1)
  for (let s = 0; s < 2; s++) {
    const w1 = resolveTieWinner(
      getFix(cdb, `cdb_quartas_m${s * 2}_ida`),
      getFix(cdb, `cdb_quartas_m${s * 2}_volta`)
    );
    const w2 = resolveTieWinner(
      getFix(cdb, `cdb_quartas_m${s * 2 + 1}_ida`),
      getFix(cdb, `cdb_quartas_m${s * 2 + 1}_volta`)
    );
    cdb = assignTwoLeggedSlots(cdb, `cdb_semi_m${s}_ida`, `cdb_semi_m${s}_volta`, w1, w2);
  }

  // Semifinal -> Grande Final (Jogo Único 2026 + fallback legacy two-legged)
  const cdbFin1 = resolveTieWinner(getFix(cdb, 'cdb_semi_m0_ida'), getFix(cdb, 'cdb_semi_m0_volta'));
  const cdbFin2 = resolveTieWinner(getFix(cdb, 'cdb_semi_m1_ida'), getFix(cdb, 'cdb_semi_m1_volta'));
  cdb = assignSingleLegSlots(cdb, 'cdb_final_unica', cdbFin1, cdbFin2);
  cdb = assignTwoLeggedSlots(cdb, 'cdb_final_ida', 'cdb_final_volta', cdbFin1, cdbFin2);

  // 2. Libertadores 2026 (8 groups -> Oitavas -> Quartas -> Semifinal -> Final Única)
  const lib = syncContinental32Bracket(
    state.fixturesLibertadores,
    state.standingsLibertadores,
    'lib',
    'lib_grande_final'
  );

  // 3. Sul-Americana 2026 (8 groups -> Oitavas -> Quartas -> Semifinal -> Final Única)
  const sula = syncContinental32Bracket(
    state.fixturesSulamericana,
    state.standingsSulamericana,
    'sula',
    'sula_final'
  );

  // 4. Brasileirão Série D 2027 (16 grupos A01–A16 -> Top 4 = 64 clubes -> 2ª Fase cruzamento olímpico ->
  //    3ª Fase -> Oitavas -> Quartas re-ranqueadas 1ºx8º..4ºx5º -> Semis re-ranqueadas 1ºx4º & 2ºx3º -> Final)
  let serieD = [...(state.fixturesD || [])];
  const standingsD = state.standingsD || [];
  const hasSerieDKnockout = serieD.some((f) => f.id === 'sd_f2_m0_ida');
  if (hasSerieDKnockout) {
    const sdGroupGames = serieD.filter((f) => isStandingsFixture(f));
    const allSdGroupPlayed = sdGroupGames.length > 0 && sdGroupGames.every((f) => f.played);

    if (allSdGroupPlayed) {
      for (let p = 0; p < 8; p++) {
        const g1Name = `Grupo A${String(p * 2 + 1).padStart(2, '0')}`;
        const g2Name = `Grupo A${String(p * 2 + 2).padStart(2, '0')}`;
        const g1 = standingsD.filter((s) => s.group === g1Name);
        const g2 = standingsD.filter((s) => s.group === g2Name);

        // Cruzamento olímpico regionalizado entre grupos vizinhos (melhor colocado decide a volta em casa)
        serieD = assignTwoLeggedSlots(
          serieD,
          `sd_f2_m${p * 4 + 0}_ida`,
          `sd_f2_m${p * 4 + 0}_volta`,
          g2[3]?.teamId,
          g1[0]?.teamId
        );
        serieD = assignTwoLeggedSlots(
          serieD,
          `sd_f2_m${p * 4 + 1}_ida`,
          `sd_f2_m${p * 4 + 1}_volta`,
          g1[2]?.teamId,
          g2[1]?.teamId
        );
        serieD = assignTwoLeggedSlots(
          serieD,
          `sd_f2_m${p * 4 + 2}_ida`,
          `sd_f2_m${p * 4 + 2}_volta`,
          g1[3]?.teamId,
          g2[0]?.teamId
        );
        serieD = assignTwoLeggedSlots(
          serieD,
          `sd_f2_m${p * 4 + 3}_ida`,
          `sd_f2_m${p * 4 + 3}_volta`,
          g2[2]?.teamId,
          g1[1]?.teamId
        );
      }
    }

    const campaignMap = computeSerieDOverallCampaignMap(serieD, standingsD);
    const orderPairByCampaign = (
      t1?: string | null,
      t2?: string | null
    ): [string | null | undefined, string | null | undefined] => {
      if (!t1 || !t2) return [t1, t2];
      // Better campaign plays the 2nd leg (volta) at home -> placed as 2nd parameter (idaAwayId)
      return compareSerieDCampaign(t1, t2, campaignMap) <= 0 ? [t2, t1] : [t1, t2];
    };

    // 2ª Fase (32) -> 3ª Fase / 16-avos (16 confrontos em chave pré-definida; melhor campanha decide em casa)
    for (let i = 0; i < 16; i++) {
      const w1 = resolveTieWinner(
        getFix(serieD, `sd_f2_m${i * 2}_ida`),
        getFix(serieD, `sd_f2_m${i * 2}_volta`)
      );
      const w2 = resolveTieWinner(
        getFix(serieD, `sd_f2_m${i * 2 + 1}_ida`),
        getFix(serieD, `sd_f2_m${i * 2 + 1}_volta`)
      );
      const [idaHome, voltaHome] = orderPairByCampaign(w1, w2);
      serieD = assignTwoLeggedSlots(serieD, `sd_f3_m${i}_ida`, `sd_f3_m${i}_volta`, idaHome, voltaHome);
    }

    // 3ª Fase (16) -> 4ª Fase / Oitavas de Final (8 confrontos em chave pré-definida)
    for (let i = 0; i < 8; i++) {
      const w1 = resolveTieWinner(
        getFix(serieD, `sd_f3_m${i * 2}_ida`),
        getFix(serieD, `sd_f3_m${i * 2}_volta`)
      );
      const w2 = resolveTieWinner(
        getFix(serieD, `sd_f3_m${i * 2 + 1}_ida`),
        getFix(serieD, `sd_f3_m${i * 2 + 1}_volta`)
      );
      const [idaHome, voltaHome] = orderPairByCampaign(w1, w2);
      serieD = assignTwoLeggedSlots(
        serieD,
        `sd_oitavas_m${i}_ida`,
        `sd_oitavas_m${i}_volta`,
        idaHome,
        voltaHome
      );
    }

    // 4ª Fase / Oitavas (8) -> 5ª Fase / Quartas de Final (Valendo Acesso):
    // Regra oficial CBF: re-ranqueamento geral (1ª+2ª+3ª+4ª fases) -> 1ºx8º, 2ºx7º, 3ºx6º, 4ºx5º!
    const oitavasWinners: string[] = [];
    for (let i = 0; i < 8; i++) {
      const w = resolveTieWinner(
        getFix(serieD, `sd_oitavas_m${i}_ida`),
        getFix(serieD, `sd_oitavas_m${i}_volta`)
      );
      if (w && w !== 'tbd') oitavasWinners.push(w);
    }
    if (oitavasWinners.length === 8) {
      const ranked8 = [...oitavasWinners].sort((a, b) => compareSerieDCampaign(a, b, campaignMap));
      const qfPairs: Array<[string, string]> = [
        [ranked8[7], ranked8[0]], // 8º (ida) x 1º (volta)
        [ranked8[6], ranked8[1]], // 7º (ida) x 2º (volta)
        [ranked8[5], ranked8[2]], // 6º (ida) x 3º (volta)
        [ranked8[4], ranked8[3]], // 5º (ida) x 4º (volta)
      ];
      qfPairs.forEach(([idaHome, voltaHome], i) => {
        serieD = assignTwoLeggedSlots(
          serieD,
          `sd_quartas_m${i}_ida`,
          `sd_quartas_m${i}_volta`,
          idaHome,
          voltaHome
        );
      });
    }

    // 5ª Fase / Quartas (4) -> Semifinais (4 clubes promovidos à Série C):
    // Regra oficial CBF: novo re-ranqueamento geral acumulado -> 1ºx4º e 2ºx3º!
    const quartasWinners: string[] = [];
    for (let i = 0; i < 4; i++) {
      const w = resolveTieWinner(
        getFix(serieD, `sd_quartas_m${i}_ida`),
        getFix(serieD, `sd_quartas_m${i}_volta`)
      );
      if (w && w !== 'tbd') quartasWinners.push(w);
    }
    if (quartasWinners.length === 4) {
      const ranked4 = [...quartasWinners].sort((a, b) => compareSerieDCampaign(a, b, campaignMap));
      serieD = assignTwoLeggedSlots(serieD, 'sd_semi_m0_ida', 'sd_semi_m0_volta', ranked4[3], ranked4[0]);
      serieD = assignTwoLeggedSlots(serieD, 'sd_semi_m1_ida', 'sd_semi_m1_volta', ranked4[2], ranked4[1]);
    }

    // Semifinal (2) -> Grande Final da Série D (melhor campanha geral decide a volta em casa!)
    const sdFin1 = resolveTieWinner(getFix(serieD, 'sd_semi_m0_ida'), getFix(serieD, 'sd_semi_m0_volta'));
    const sdFin2 = resolveTieWinner(getFix(serieD, 'sd_semi_m1_ida'), getFix(serieD, 'sd_semi_m1_volta'));
    const [finalIdaHome, finalVoltaHome] = orderPairByCampaign(sdFin1, sdFin2);
    serieD = assignTwoLeggedSlots(serieD, 'sd_final_ida', 'sd_final_volta', finalIdaHome, finalVoltaHome);
  }

  // 5. Campeonatos Estaduais 2026 (Todos os 27 Estados + formatos oficiais de mata-mata 1 ou 2 jogos + byes)
  let est = [...state.fixturesEstadual];
  const groupNameToKey: Record<string, string> = {
    ...ESTADUAL_TOURNAMENT_KEYS,
    'Copa do Nordeste': 'ne',
    'Copa Sul-Centro-Norte': 'scn',
  };

  const estGroups = Array.from(
    new Set(state.standingsEstadual.map((s) => s.group).filter(Boolean))
  ) as string[];

  estGroups.forEach((grp) => {
    const cfg = getEstadualConfigByName(grp);
    const key = cfg?.key || groupNameToKey[grp] || grp.slice(0, 4);
    const grpFixtures = est.filter(
      (f) => isStandingsFixture(f) && ((f.cupPhase || '').startsWith(grp) || f.groupName === grp)
    );
    const grpComplete = grpFixtures.length > 0 && grpFixtures.every((f) => f.played);
    if (!grpComplete) return;

    const ordered = state.standingsEstadual.filter((s) => s.group === grp);
    const seedIdx = new Map<string, number>();
    ordered.forEach((s, idx) => seedIdx.set(s.teamId, idx));

    const orderHigherFirst = (
      team1?: string | null,
      team2?: string | null
    ): [string | undefined, string | undefined] => {
      if (!team1 || !team2) return [team1 || undefined, team2 || undefined];
      const r1 = seedIdx.get(team1) ?? 99;
      const r2 = seedIdx.get(team2) ?? 99;
      return r1 <= r2 ? [team1, team2] : [team2, team1];
    };

    const assignEstStage = (
      stage: 'qf' | 'semi' | 'final',
      mIdx: number | null,
      legs: 0 | 1 | 2,
      higherSeedId?: string | null,
      lowerSeedId?: string | null
    ) => {
      if (legs === 0) return;
      const baseId =
        stage === 'final' ? `est_final_${key}` : `est_${stage}_${key}_m${mIdx}`;
      if (legs === 1) {
        // Jogo único: melhor campanha decide em casa (ou campo neutro na Final)
        est = assignSingleLegSlots(est, baseId, higherSeedId, lowerSeedId);
      } else {
        // Ida e volta: pior campanha manda a Ida; melhor campanha decide a Volta em casa!
        est = assignTwoLeggedSlots(
          est,
          `${baseId}_ida`,
          `${baseId}_volta`,
          lowerSeedId,
          higherSeedId
        );
      }
    };

    const getEstStageWinner = (
      stage: 'qf' | 'semi' | 'final',
      mIdx: number | null,
      legs: 0 | 1 | 2
    ): string | null => {
      if (legs === 0) return null;
      const baseId =
        stage === 'final' ? `est_final_${key}` : `est_${stage}_${key}_m${mIdx}`;
      if (legs === 1) {
        return resolveTieWinner(undefined, getFix(est, baseId));
      }
      return resolveTieWinner(getFix(est, `${baseId}_ida`), getFix(est, `${baseId}_volta`));
    };

    // Legacy save fallback (`est_semi1_${key}`)
    if (!cfg || est.some((f) => f.id === `est_semi1_${key}`)) {
      const semi1Id = `est_semi1_${key}`;
      const semi2Id = `est_semi2_${key}`;
      const finalId = `est_final_${key}`;
      if (ordered.length >= 4) {
        est = assignSingleLegSlots(est, semi1Id, ordered[0].teamId, ordered[3].teamId);
        est = assignSingleLegSlots(est, semi2Id, ordered[1].teamId, ordered[2].teamId);
        const semiW1 = resolveTieWinner(undefined, getFix(est, semi1Id));
        const semiW2 = resolveTieWinner(undefined, getFix(est, semi2Id));
        est = assignSingleLegSlots(est, finalId, semiW1, semiW2);
      }
      return;
    }

    const qfLegs = cfg.qfLegs;
    const sfLegs = cfg.sfLegs;
    const finLegs = cfg.finalLegs;

    if (cfg.knockoutModel === 'TOP8_OVERALL_QF' && ordered.length >= 8 && qfLegs > 0) {
      // m0: 1ºx8º, m1: 4ºx5º, m2: 2ºx7º, m3: 3ºx6º
      assignEstStage('qf', 0, qfLegs, ordered[0].teamId, ordered[7].teamId);
      assignEstStage('qf', 1, qfLegs, ordered[3].teamId, ordered[4].teamId);
      assignEstStage('qf', 2, qfLegs, ordered[1].teamId, ordered[6].teamId);
      assignEstStage('qf', 3, qfLegs, ordered[2].teamId, ordered[5].teamId);

      const w0 = getEstStageWinner('qf', 0, qfLegs);
      const w1 = getEstStageWinner('qf', 1, qfLegs);
      const w2 = getEstStageWinner('qf', 2, qfLegs);
      const w3 = getEstStageWinner('qf', 3, qfLegs);

      const [s0H, s0L] = orderHigherFirst(w0, w1);
      const [s1H, s1L] = orderHigherFirst(w2, w3);
      assignEstStage('semi', 0, sfLegs, s0H, s0L);
      assignEstStage('semi', 1, sfLegs, s1H, s1L);
    } else if (cfg.knockoutModel === 'TOP4_PER_GROUP_QF' && qfLegs > 0) {
      const gA = ordered.filter((s) => s.subGroup === 'Grupo A');
      const gB = ordered.filter((s) => s.subGroup === 'Grupo B');
      if (gA.length >= 4 && gB.length >= 4) {
        if (cfg.crossGroupQuarterfinals) {
          // RS / PR: 1ºA x 4ºB, 2ºB x 3ºA, 1ºB x 4ºA, 2ºA x 3ºB
          assignEstStage('qf', 0, qfLegs, gA[0].teamId, gB[3].teamId);
          assignEstStage('qf', 1, qfLegs, gB[1].teamId, gA[2].teamId);
          assignEstStage('qf', 2, qfLegs, gB[0].teamId, gA[3].teamId);
          assignEstStage('qf', 3, qfLegs, gA[1].teamId, gB[2].teamId);
        } else {
          // RJ / SC: 1ºA x 4ºA, 2ºA x 3ºA, 1ºB x 4ºB, 2ºB x 3ºB
          assignEstStage('qf', 0, qfLegs, gA[0].teamId, gA[3].teamId);
          assignEstStage('qf', 1, qfLegs, gA[1].teamId, gA[2].teamId);
          assignEstStage('qf', 2, qfLegs, gB[0].teamId, gB[3].teamId);
          assignEstStage('qf', 3, qfLegs, gB[1].teamId, gB[2].teamId);
        }

        const w0 = getEstStageWinner('qf', 0, qfLegs);
        const w1 = getEstStageWinner('qf', 1, qfLegs);
        const w2 = getEstStageWinner('qf', 2, qfLegs);
        const w3 = getEstStageWinner('qf', 3, qfLegs);

        const [s0H, s0L] = orderHigherFirst(w0, w1);
        const [s1H, s1L] = orderHigherFirst(w2, w3);
        assignEstStage('semi', 0, sfLegs, s0H, s0L);
        assignEstStage('semi', 1, sfLegs, s1H, s1L);
      }
    } else if (cfg.knockoutModel === 'THREE_GROUPS_BEST2_SF') {
      // Mineiro (MG): 3 líderes de grupo + melhor 2º colocado geral -> Semifinal
      const gA = ordered.filter((s) => s.subGroup === 'Grupo A');
      const gB = ordered.filter((s) => s.subGroup === 'Grupo B');
      const gC = ordered.filter((s) => s.subGroup === 'Grupo C');
      const leaders = [gA[0], gB[0], gC[0]].filter(Boolean);
      const runners = [gA[1], gB[1], gC[1]]
        .filter(Boolean)
        .sort(
          (a, b) =>
            b.points - a.points ||
            b.won - a.won ||
            b.goalDifference - a.goalDifference ||
            b.goalsFor - a.goalsFor
        );
      const qualifiers = [...leaders, ...(runners[0] ? [runners[0]] : [])].sort(
        (a, b) => (seedIdx.get(a.teamId) ?? 99) - (seedIdx.get(b.teamId) ?? 99)
      );
      if (qualifiers.length >= 4) {
        assignEstStage('semi', 0, sfLegs, qualifiers[0].teamId, qualifiers[3].teamId);
        assignEstStage('semi', 1, sfLegs, qualifiers[1].teamId, qualifiers[2].teamId);
      }
    } else if (cfg.knockoutModel === 'TOP2_BYE_3TO6_QF' && ordered.length >= 6 && qfLegs > 0) {
      // PE / MT / MS: 1º e 2º direto na Semifinal; m0 = 4ºx5º, m1 = 3ºx6º
      assignEstStage('qf', 0, qfLegs, ordered[3].teamId, ordered[4].teamId);
      assignEstStage('qf', 1, qfLegs, ordered[2].teamId, ordered[5].teamId);
      const w0 = getEstStageWinner('qf', 0, qfLegs);
      const w1 = getEstStageWinner('qf', 1, qfLegs);
      assignEstStage('semi', 0, sfLegs, ordered[0].teamId, w0);
      assignEstStage('semi', 1, sfLegs, ordered[1].teamId, w1);
    } else if (cfg.knockoutModel === 'TWO_GROUPS_TOP1_BYE_2TO3_QF' && qfLegs > 0) {
      // CE / AM: Líderes A1 e B1 direto na Semifinal; m0 = 2ºB x 3ºA, m1 = 2ºA x 3ºB
      const gA = ordered.filter((s) => s.subGroup === 'Grupo A');
      const gB = ordered.filter((s) => s.subGroup === 'Grupo B');
      if (gA.length >= 3 && gB.length >= 3) {
        assignEstStage('qf', 0, qfLegs, gB[1].teamId, gA[2].teamId);
        assignEstStage('qf', 1, qfLegs, gA[1].teamId, gB[2].teamId);
        const w0 = getEstStageWinner('qf', 0, qfLegs);
        const w1 = getEstStageWinner('qf', 1, qfLegs);
        assignEstStage('semi', 0, sfLegs, gA[0].teamId, w0);
        assignEstStage('semi', 1, sfLegs, gB[0].teamId, w1);
      }
    } else if (cfg.knockoutModel === 'TOP1_BYE_2TO7_QF' && ordered.length >= 7 && qfLegs > 0) {
      // SE: 1º geral direto na Semifinal; m0 = 4ºx5º, m1 = 2ºx7º, m2 = 3ºx6º
      assignEstStage('qf', 0, qfLegs, ordered[3].teamId, ordered[4].teamId);
      assignEstStage('qf', 1, qfLegs, ordered[1].teamId, ordered[6].teamId);
      assignEstStage('qf', 2, qfLegs, ordered[2].teamId, ordered[5].teamId);
      const w0 = getEstStageWinner('qf', 0, qfLegs);
      const w1 = getEstStageWinner('qf', 1, qfLegs);
      const w2 = getEstStageWinner('qf', 2, qfLegs);
      const [s1H, s1L] = orderHigherFirst(w1, w2);
      assignEstStage('semi', 0, sfLegs, ordered[0].teamId, w0);
      assignEstStage('semi', 1, sfLegs, s1H, s1L);
    } else if (ordered.length >= 4) {
      // TOP4_OVERALL_SF (BA, AL, MA, PB, PI, DF, TO, AC, RO, RR, AP)
      assignEstStage('semi', 0, sfLegs, ordered[0].teamId, ordered[3].teamId);
      assignEstStage('semi', 1, sfLegs, ordered[1].teamId, ordered[2].teamId);
    }

    // Semifinal -> Grande Final
    const semiW0 = getEstStageWinner('semi', 0, sfLegs);
    const semiW1 = getEstStageWinner('semi', 1, sfLegs);
    const [finH, finL] = orderHigherFirst(semiW0, semiW1);
    assignEstStage('final', null, finLegs, finH, finL);
  });

  const syncRegional16Cup = (
    cupFixtures: Fixture[],
    cupStandings: Standing[],
    prefix: 'cne' | 'cv',
    groupALabel: string,
    groupBLabel: string
  ): Fixture[] => {
    let list = [...cupFixtures];
    if (list.length === 0 || cupStandings.length === 0) return list;
    const grpGames = list.filter((f) => isStandingsFixture(f));
    const grpDone = grpGames.length > 0 && grpGames.every((f) => f.played);
    if (!grpDone) return list;

    const grpA = cupStandings.filter((s) => s.group === groupALabel);
    const grpB = cupStandings.filter((s) => s.group === groupBLabel);
    if (grpA.length >= 4 && grpB.length >= 4) {
      list = assignTwoLeggedSlots(list, `${prefix}_qf_m0_ida`, `${prefix}_qf_m0_volta`, grpB[3].teamId, grpA[0].teamId);
      list = assignTwoLeggedSlots(list, `${prefix}_qf_m1_ida`, `${prefix}_qf_m1_volta`, grpA[2].teamId, grpB[1].teamId);
      list = assignTwoLeggedSlots(list, `${prefix}_qf_m2_ida`, `${prefix}_qf_m2_volta`, grpA[3].teamId, grpB[0].teamId);
      list = assignTwoLeggedSlots(list, `${prefix}_qf_m3_ida`, `${prefix}_qf_m3_volta`, grpB[2].teamId, grpA[1].teamId);

      const qf0 = resolveTieWinner(getFix(list, `${prefix}_qf_m0_ida`), getFix(list, `${prefix}_qf_m0_volta`));
      const qf1 = resolveTieWinner(getFix(list, `${prefix}_qf_m1_ida`), getFix(list, `${prefix}_qf_m1_volta`));
      const qf2 = resolveTieWinner(getFix(list, `${prefix}_qf_m2_ida`), getFix(list, `${prefix}_qf_m2_volta`));
      const qf3 = resolveTieWinner(getFix(list, `${prefix}_qf_m3_ida`), getFix(list, `${prefix}_qf_m3_volta`));

      list = assignTwoLeggedSlots(list, `${prefix}_semi_m0_ida`, `${prefix}_semi_m0_volta`, qf1, qf0);
      list = assignTwoLeggedSlots(list, `${prefix}_semi_m1_ida`, `${prefix}_semi_m1_volta`, qf3, qf2);

      const semi0 = resolveTieWinner(getFix(list, `${prefix}_semi_m0_ida`), getFix(list, `${prefix}_semi_m0_volta`));
      const semi1 = resolveTieWinner(getFix(list, `${prefix}_semi_m1_ida`), getFix(list, `${prefix}_semi_m1_volta`));
      list = assignTwoLeggedSlots(list, `${prefix}_final_ida`, `${prefix}_final_volta`, semi1, semi0);
    }
    return list;
  };

  // 5b. Copa do Nordeste & Copa Verde (16 clubes cada -> Quartas, Semifinal e Final em Ida e Volta)
  const cne = syncRegional16Cup(
    state.fixturesCopaNordeste || [],
    state.standingsCopaNordeste || [],
    'cne',
    'Grupo A',
    'Grupo B'
  );
  const cv = syncRegional16Cup(
    state.fixturesCopaVerde || [],
    state.standingsCopaVerde || [],
    'cv',
    'Grupo Norte',
    'Grupo Centro-Oeste'
  );

  // 6. UEFA Champions League, Europa League & Conference League (36 clubes em Fase de Liga -> Playoffs 9º–24º -> Oitavas Top 8 -> Quartas -> Semifinal -> Final Única)
  const ucl = syncUefaLeague36Bracket(
    state.fixturesChampionsLeague || [],
    state.standingsChampionsLeague || [],
    'ucl',
    'ucl_final'
  );
  const uel = syncUefaLeague36Bracket(
    state.fixturesEuropaLeague || [],
    state.standingsEuropaLeague || [],
    'uel',
    'uel_final'
  );
  const uecl = syncUefaLeague36Bracket(
    state.fixturesConferenceLeague || [],
    state.standingsConferenceLeague || [],
    'uecl',
    'uecl_final'
  );

  // 6b. Champions Internacional FIFA (32 clubes: América do Norte, Ásia/Rússia e África -> Oitavas -> Quartas -> Semifinal -> Final Única)
  const cint = syncContinental32Bracket(
    state.fixturesCopaInternacional || [],
    state.standingsCopaInternacional || [],
    'cint',
    'cint_final'
  );

  // 6c. Copa dos Campeões da CONCACAF (27 clubes · Fev–Mai · Gol fora até Semi · Final Única)
  const concacaf = syncConcacafChampionsBracket(
    state.fixturesConcacafChampions || [],
    state.clubs || []
  );

  // 6d. Liga dos Campeões de Elite da AFC (32 clubes em Oeste/Leste · 8 rodadas · Oitavas Ida/Volta · Finais em Sede Única na Arábia Saudita)
  const clubsMapWithGuests = new Map<string, Club>(
    withWorldGuestClubs(state.clubs || []).map((c) => [c.id, c])
  );
  const afc = syncAfcChampionsBracket(
    state.fixturesAfcChampions || [],
    state.standingsAfcChampions || [],
    clubsMapWithGuests
  );

  // 7. Copa Intercontinental FIFA / Mundial de Clubes (Dezembro: CONMEBOL, CONCACAF, Champions Internacional/Ásia-Rússia, África e UEFA)
  let intercont = [...(state.fixturesIntercontinental || [])];
  if (intercont.length > 0) {
    const libChampId = resolveTieWinner(undefined, getFix(lib, 'lib_grande_final'));
    const cintChampId = resolveTieWinner(undefined, getFix(cint, 'cint_final'));
    const concacafCupChampId = resolveCupChampionId(concacaf);
    const afcCupChampId = resolveCupChampionId(afc);
    const has4MatchBracket = intercont.some((f) => f.id.startsWith('intercont_q1'));

    const q1Fix = intercont.find((f) => f.id.startsWith('intercont_q1'));
    const isDecemberReached = Boolean(
      state.currentDate && q1Fix?.date && state.currentDate >= q1Fix.date.slice(0, 7) + '-01'
    );

    const isLeagueDone = (lid: WorldLeagueId) => {
      const fxs = state.fixturesWorldLeagues?.[lid] || [];
      return (
        fxs.length > 0 &&
        fxs.every((f) => f.played || isMlsSkippedBestOfThreeFixture(f))
      );
    };

    const qualifiers =
      state.clubs && state.clubs.length > 0
        ? computeWorldInternationalQualifiers(
            state.clubs,
            state.standingsWorldLeagues,
            cintChampId,
            state.fixturesWorldLeagues
          )
        : undefined;

    if (has4MatchBracket) {
      // Quartas 1 (Dérbi das Américas): Campeão CONMEBOL Libertadores vs Campeão Concacaf Champions Cup (ou campeão América do Norte)
      const concacafReady =
        (isLeagueDone('usa_mls') &&
          isLeagueDone('mex_ligamx') &&
          isLeagueDone('can_cpl')) ||
        isDecemberReached;
      const concacafChampId =
        concacafCupChampId || (concacafReady ? qualifiers?.concacafChampionId : undefined);

      intercont = intercont.map((f) => {
        if (!f.id.startsWith('intercont_q1') || f.played) return f;
        return {
          ...f,
          homeTeamId:
            libChampId && !libChampId.startsWith('TBD') ? libChampId : f.homeTeamId,
          awayTeamId:
            concacafChampId && !concacafChampId.startsWith('TBD')
              ? concacafChampId
              : f.awayTeamId,
        };
      });

      // Quartas 2 (Copa África-Ásia-Eurásia): Campeão AFC Champions League Elite / Champions Internacional vs Campeão África (Egito/Marrocos)
      const africaReady =
        (isLeagueDone('egy_premier') && isLeagueDone('mar_botola')) || isDecemberReached;
      const africaChampId = africaReady ? qualifiers?.africaChampionId : undefined;
      const asiaOrCintChampId =
        afcCupChampId ||
        cintChampId ||
        (isDecemberReached ? qualifiers?.asiaRussiaChampionId : undefined);

      intercont = intercont.map((f) => {
        if (!f.id.startsWith('intercont_q2') || f.played) return f;
        return {
          ...f,
          homeTeamId:
            asiaOrCintChampId && !asiaOrCintChampId.startsWith('TBD')
              ? asiaOrCintChampId
              : f.homeTeamId,
          awayTeamId:
            africaChampId && !africaChampId.startsWith('TBD')
              ? africaChampId
              : f.awayTeamId,
        };
      });

      // Quartas 1 & 2 -> Semifinal (Copa Challenger FIFA)
      const q1Played = intercont.find((f) => f.id.startsWith('intercont_q1'));
      const q2Played = intercont.find((f) => f.id.startsWith('intercont_q2'));
      const q1WinnerId = q1Played?.played ? resolveTieWinner(undefined, q1Played) : null;
      const q2WinnerId = q2Played?.played ? resolveTieWinner(undefined, q2Played) : null;

      intercont = intercont.map((f) => {
        if (!f.id.startsWith('intercont_semi') || f.played) return f;
        return {
          ...f,
          homeTeamId:
            q1WinnerId && !q1WinnerId.startsWith('TBD') ? q1WinnerId : f.homeTeamId,
          awayTeamId:
            q2WinnerId && !q2WinnerId.startsWith('TBD') ? q2WinnerId : f.awayTeamId,
        };
      });
    } else if (libChampId && !libChampId.startsWith('TBD')) {
      // Legacy 2-match bracket compatibility
      intercont = intercont.map((f) =>
        f.id.startsWith('intercont_semi') && !f.played ? { ...f, homeTeamId: libChampId } : f
      );
    }

    const uclFinalFix = getFix(ucl, 'ucl_final');
    const intercontFinalFix = intercont.find((f) => f.id.startsWith('intercont_final'));
    const uclChampId = resolveTieWinner(undefined, uclFinalFix);
    if (
      uclChampId &&
      !uclChampId.startsWith('TBD') &&
      (!uclFinalFix?.date ||
        !intercontFinalFix?.date ||
        uclFinalFix.date <= intercontFinalFix.date)
    ) {
      intercont = intercont.map((f) =>
        f.id.startsWith('intercont_final') && !f.played ? { ...f, homeTeamId: uclChampId } : f
      );
    }

    const semiFix = intercont.find((f) => f.id.startsWith('intercont_semi'));
    if (semiFix && semiFix.played) {
      const semiWinnerId = resolveTieWinner(undefined, semiFix);
      if (semiWinnerId && !semiWinnerId.startsWith('TBD')) {
        intercont = intercont.map((f) =>
          f.id.startsWith('intercont_final') && !f.played ? { ...f, awayTeamId: semiWinnerId } : f
        );
      }
    }
  }

  const smwc = syncSuperMundialKnockoutBracket(
    state.fixturesSuperMundial || [],
    state.standingsSuperMundial || []
  );

  // 8. EFL Championship, League One & League Two Playoffs
  const fixturesEurope: Partial<Record<EuropeanLeagueId, Fixture[]>> = {
    ...(state.fixturesEurope || {}),
  };
  if (fixturesEurope.eng_championship && state.standingsEurope?.eng_championship) {
    fixturesEurope.eng_championship = syncChampionshipPlayoffBracket(
      fixturesEurope.eng_championship,
      state.standingsEurope.eng_championship
    );
  }
  if (fixturesEurope.eng_league_one && state.standingsEurope?.eng_league_one) {
    fixturesEurope.eng_league_one = syncLeagueOnePlayoffBracket(
      fixturesEurope.eng_league_one,
      state.standingsEurope.eng_league_one
    );
  }
  if (fixturesEurope.eng_league_two && state.standingsEurope?.eng_league_two) {
    fixturesEurope.eng_league_two = syncLeagueTwoPlayoffBracket(
      fixturesEurope.eng_league_two,
      state.standingsEurope.eng_league_two
    );
  }

  // 9. Copas Inglesas (Community Shield, Carabao Cup & FA Cup)
  const englishCupsSynced = syncEnglishCupsKnockoutBracket({
    fixturesEngCommunityShield: state.fixturesEngCommunityShield,
    fixturesEngEflCup: state.fixturesEngEflCup,
    fixturesEngFaCup: state.fixturesEngFaCup,
    clubs: state.clubs,
  });

  // 10. Copas Nacionais Europeias
  const europeanCupsSynced = syncEuropeanCupsKnockoutBrackets({
    fixturesEuropeanCups: state.fixturesEuropeanCups,
    clubs: state.clubs,
  });

  // 11. Copas Nacionais Sul-Americanas
  const southAmericanCupsSynced = syncSouthAmericanCupsKnockoutBrackets({
    fixturesSouthAmericanCups: state.fixturesSouthAmericanCups,
    clubs: state.clubs,
  });

  // 12. MLS (EUA/Canadá) Audi MLS Cup Playoffs
  const fixturesWorldLeagues: Partial<Record<WorldLeagueId, Fixture[]>> = {
    ...(state.fixturesWorldLeagues || {}),
  };
  if (fixturesWorldLeagues.usa_mls && state.standingsWorldLeagues?.usa_mls) {
    fixturesWorldLeagues.usa_mls = syncMlsPlayoffBracket(
      fixturesWorldLeagues.usa_mls,
      state.standingsWorldLeagues.usa_mls,
      state.clubs || []
    );
  }

  // 13. Copas Nacionais da América do Norte, Ásia/Rússia & África
  const worldCupsSynced = syncWorldCupsKnockoutBrackets({
    fixturesWorldCups: state.fixturesWorldCups,
    clubs: state.clubs,
  });

  // 14. Brasileirão Série C · Playoff de Acesso (4º ao 7º)
  const serieC = state.fixturesC
    ? syncSerieCPlayoffBracket(state.fixturesC, state.standingsC)
    : undefined;

  return {
    fixturesCopaBrasil: cdb,
    fixturesLibertadores: lib,
    fixturesSulamericana: sula,
    fixturesEstadual: est,
    fixturesCopaNordeste: cne,
    fixturesCopaVerde: cv,
    ...(serieC ? { fixturesC: serieC } : {}),
    fixturesD: serieD,
    fixturesIntercontinental: intercont,
    fixturesChampionsLeague: ucl,
    fixturesEuropaLeague: uel,
    fixturesConferenceLeague: uecl,
    fixturesCopaInternacional: cint,
    fixturesConcacafChampions: concacaf,
    fixturesAfcChampions: afc,
    fixturesSuperMundial: smwc,
    ...(state.fixturesEurope ? { fixturesEurope } : {}),
    ...(state.fixturesWorldLeagues ? { fixturesWorldLeagues } : {}),
    fixturesEuropeanCups: europeanCupsSynced,
    fixturesSouthAmericanCups: southAmericanCupsSynced,
    fixturesWorldCups: worldCupsSynced,
    fixturesEngCommunityShield: englishCupsSynced.fixturesEngCommunityShield,
    fixturesEngEflCup: englishCupsSynced.fixturesEngEflCup,
    fixturesEngFaCup: englishCupsSynced.fixturesEngFaCup,
  };
}

/**
 * Collects all unplayed CPU fixtures across ALL championships (Brazil, South America, Europe & FIFA)
 * that should be played simultaneously alongside `userFixture` on this matchday/round.
 */
export function getSimultaneousMatchdayFixtures(
  state: GameSave,
  userFixture: Fixture
): Fixture[] {
  const matchDate = userFixture.date || state.currentDate;
  const isUserMatchClassicLeague = CLASSIC_LEAGUES_38.includes(userFixture.competition);

  const allPools: Fixture[] = [
    ...state.fixturesA,
    ...state.fixturesB,
    ...(state.fixturesC || []),
    ...(state.fixturesD || []),
    ...(state.fixturesSupercopa || []),
    ...(state.fixturesRecopa || []),
    ...(state.fixturesLibertadores || []),
    ...(state.fixturesSulamericana || []),
    ...(state.fixturesCopaBrasil || []),
    ...(state.fixturesEstadual || []),
    ...(state.fixturesCopaNordeste || []),
    ...(state.fixturesCopaVerde || []),
    ...(state.fixturesIntercontinental || []),
    ...flattenSouthAmericaFixtures(state.fixturesSouthAmerica),
    ...flattenEuropeFixtures(state.fixturesEurope),
    ...flattenWorldLeaguesFixtures(state.fixturesWorldLeagues),
    ...(state.fixturesChampionsLeague || []),
    ...(state.fixturesEuropaLeague || []),
    ...(state.fixturesConferenceLeague || []),
    ...(state.fixturesUefaSupercup || []),
    ...(state.fixturesCopaInternacional || []),
    ...(state.fixturesConcacafChampions || []),
    ...(state.fixturesAfcChampions || []),
    ...(state.fixturesSuperMundial || []),
    ...(state.fixturesEngCommunityShield || []),
    ...(state.fixturesEngEflCup || []),
    ...(state.fixturesEngFaCup || []),
    ...flattenEuropeanCupsFixtures(state.fixturesEuropeanCups),
    ...flattenSouthAmericanCupsFixtures(state.fixturesSouthAmericanCups),
    ...flattenWorldCupsFixtures(state.fixturesWorldCups),
  ];

  const simultaneousCpu = allPools.filter((f) => {
    if (f.played || f.id === userFixture.id) return false;
    if (
      f.homeTeamId === 'tbd' ||
      f.awayTeamId === 'tbd' ||
      f.homeTeamId.startsWith('TBD') ||
      f.awayTeamId.startsWith('TBD')
    ) {
      return false;
    }
    // Never auto-simulate another match of the user's own club!
    if (f.homeTeamId === state.userClubId || f.awayTeamId === state.userClubId) return false;

    // Same competition & round as user's current match (only fixtures scheduled on or before matchDate)
    if (
      f.competition === userFixture.competition &&
      f.round === userFixture.round &&
      (!f.date || f.date <= matchDate)
    ) {
      return true;
    }

    // If user is playing a 38-round National League round R, keep A/B/C synchronized up to matchDate
    if (
      isUserMatchClassicLeague &&
      CLASSIC_LEAGUES_38.includes(f.competition) &&
      f.round <= userFixture.round &&
      (!f.date || f.date <= matchDate)
    ) {
      return true;
    }

    // Include any CPU match across any tournament scheduled on or before matchDate
    if (f.date && f.date <= matchDate) {
      return true;
    }

    return false;
  });

  return [userFixture, ...simultaneousCpu];
}

/**
 * Applies a batch of completed fixtures into all competition fixture arrays on GameSave.
 */
export function mergeCompletedFixturesIntoState(
  state: Pick<
    GameSave,
    | 'fixturesA'
    | 'fixturesB'
    | 'fixturesC'
    | 'fixturesD'
    | 'fixturesSupercopa'
    | 'fixturesRecopa'
    | 'fixturesLibertadores'
    | 'fixturesSulamericana'
    | 'fixturesCopaBrasil'
    | 'fixturesEstadual'
    | 'fixturesCopaNordeste'
    | 'fixturesCopaVerde'
    | 'fixturesIntercontinental'
    | 'fixturesSouthAmerica'
    | 'fixturesEurope'
    | 'fixturesWorldLeagues'
    | 'fixturesChampionsLeague'
    | 'fixturesEuropaLeague'
    | 'fixturesConferenceLeague'
    | 'fixturesUefaSupercup'
    | 'fixturesCopaInternacional'
    | 'fixturesConcacafChampions'
    | 'fixturesAfcChampions'
    | 'fixturesSuperMundial'
    | 'fixturesEngCommunityShield'
    | 'fixturesEngEflCup'
    | 'fixturesEngFaCup'
    | 'fixturesEuropeanCups'
    | 'fixturesSouthAmericanCups'
    | 'fixturesWorldCups'
  >,
  completedFixtures: Fixture[]
) {
  const completedMap = new Map<string, Fixture>();
  completedFixtures.forEach((f) => completedMap.set(f.id, f));

  const replaceList = (list: Fixture[] = []) => list.map((f) => completedMap.get(f.id) || f);

  const fixturesSouthAmerica: Partial<Record<SouthAmericanLeagueId, Fixture[]>> = {};
  if (state.fixturesSouthAmerica) {
    for (const leagueId of SOUTH_AMERICAN_LEAGUE_IDS) {
      const list = state.fixturesSouthAmerica[leagueId];
      if (list) {
        fixturesSouthAmerica[leagueId] = replaceList(list);
      }
    }
  }

  const fixturesEurope: Partial<Record<EuropeanLeagueId, Fixture[]>> = {};
  if (state.fixturesEurope) {
    for (const leagueId of EUROPEAN_LEAGUE_IDS) {
      const list = state.fixturesEurope[leagueId];
      if (list) {
        fixturesEurope[leagueId] = replaceList(list);
      }
    }
  }

  const fixturesEuropeanCups: Partial<Record<EuropeanCupId, Fixture[]>> = {};
  if (state.fixturesEuropeanCups) {
    for (const cupId of EUROPEAN_CUP_IDS) {
      const list = state.fixturesEuropeanCups[cupId];
      if (list) {
        fixturesEuropeanCups[cupId] = replaceList(list);
      }
    }
  }

  const fixturesSouthAmericanCups: Partial<Record<SouthAmericanCupId, Fixture[]>> = {};
  if (state.fixturesSouthAmericanCups) {
    for (const cupId of SOUTH_AMERICAN_CUP_IDS) {
      const list = state.fixturesSouthAmericanCups[cupId];
      if (list) {
        fixturesSouthAmericanCups[cupId] = replaceList(list);
      }
    }
  }

  const fixturesWorldLeagues: Partial<Record<WorldLeagueId, Fixture[]>> = {};
  if (state.fixturesWorldLeagues) {
    for (const leagueId of WORLD_LEAGUE_IDS) {
      const list = state.fixturesWorldLeagues[leagueId];
      if (list) {
        fixturesWorldLeagues[leagueId] = replaceList(list);
      }
    }
  }

  const fixturesWorldCups: Partial<Record<WorldCupId, Fixture[]>> = {};
  if (state.fixturesWorldCups) {
    for (const cupId of WORLD_CUP_IDS) {
      const list = state.fixturesWorldCups[cupId];
      if (list) {
        fixturesWorldCups[cupId] = replaceList(list);
      }
    }
  }

  return {
    fixturesA: replaceList(state.fixturesA),
    fixturesB: replaceList(state.fixturesB),
    fixturesC: replaceList(state.fixturesC || []),
    fixturesD: replaceList(state.fixturesD || []),
    fixturesSupercopa: replaceList(state.fixturesSupercopa || []),
    fixturesRecopa: replaceList(state.fixturesRecopa || []),
    fixturesLibertadores: replaceList(state.fixturesLibertadores || []),
    fixturesSulamericana: replaceList(state.fixturesSulamericana || []),
    fixturesCopaBrasil: replaceList(state.fixturesCopaBrasil || []),
    fixturesEstadual: replaceList(state.fixturesEstadual || []),
    fixturesCopaNordeste: replaceList(state.fixturesCopaNordeste || []),
    fixturesCopaVerde: replaceList(state.fixturesCopaVerde || []),
    fixturesIntercontinental: replaceList(state.fixturesIntercontinental || []),
    fixturesSouthAmerica,
    fixturesEurope,
    fixturesEuropeanCups,
    fixturesSouthAmericanCups,
    fixturesWorldLeagues,
    fixturesWorldCups,
    fixturesChampionsLeague: replaceList(state.fixturesChampionsLeague || []),
    fixturesEuropaLeague: replaceList(state.fixturesEuropaLeague || []),
    fixturesConferenceLeague: replaceList(state.fixturesConferenceLeague || []),
    fixturesUefaSupercup: replaceList(state.fixturesUefaSupercup || []),
    fixturesCopaInternacional: replaceList(state.fixturesCopaInternacional || []),
    fixturesConcacafChampions: replaceList(state.fixturesConcacafChampions || []),
    fixturesAfcChampions: replaceList(state.fixturesAfcChampions || []),
    fixturesSuperMundial: replaceList(state.fixturesSuperMundial || []),
    fixturesEngCommunityShield: replaceList(state.fixturesEngCommunityShield || []),
    fixturesEngEflCup: replaceList(state.fixturesEngEflCup || []),
    fixturesEngFaCup: replaceList(state.fixturesEngFaCup || []),
  };
}

const SPLIT_YEAR_WORLD_CUP_IDS_SET = new Set<string>([
  'wl_cup_sau',
  'wl_cup_rus',
  'wl_cup_egy',
  'wl_cup_mar',
]);

function isFixtureInFinishingHemisphere(
  f: Fixture,
  hemisphere: 'SA_BR' | 'EU' | 'ALL'
): boolean {
  if (hemisphere === 'ALL') return true;
  const comp = f.competition;
  const isEuPool =
    isEuropeanLeague(comp) ||
    isEuropeanCup(comp) ||
    comp === 'champions_league' ||
    comp === 'europa_league' ||
    comp === 'conference_league' ||
    comp === 'uefa_supercup' ||
    comp === 'eng_community_shield' ||
    comp === 'eng_efl_cup' ||
    comp === 'eng_fa_cup' ||
    comp === 'afc_champions' ||
    (isWorldLeague(comp) && isSplitYearWorldLeague(comp)) ||
    (isWorldCup(comp) && SPLIT_YEAR_WORLD_CUP_IDS_SET.has(comp));

  return hemisphere === 'EU' ? isEuPool : !isEuPool;
}

function buildFallbackSyntheticClub(clubId: string, templateClub?: Club): Club {
  const baseSquad = (templateClub?.squad || []).slice(0, 18).map((p, idx) => ({
    ...p,
    id: `${clubId}_synth_p${idx}`,
    overall: 70,
    condition: 95,
    injuredWeeks: 0,
    injuryDaysRemaining: 0,
    suspended: false,
    yellowCards: 0,
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    competitionDisciplinary: undefined,
  }));

  return {
    ...(templateClub || ({} as Club)),
    id: clubId,
    name: clubId,
    shortName: clubId.slice(0, 3).toUpperCase(),
    reputation: 3,
    squad: baseSquad,
  };
}

export interface SimulateCpuFixturesOptions {
  /**
   * When true, if any wave unlocks an unplayed user fixture dated earlier than `cutoffDate`
   * (e.g. a newly unlocked knockout tie), simulation clamps `cutoffDate` and `currentDate`
   * to that fixture's date so the user NEVER jumps over a newly unlocked match.
   */
  stopAtUserFixture?: boolean;
  /**
   * Lower bound when clamping `currentDate` during `stopAtUserFixture` so the calendar never moves backwards.
   */
  minCurrentDate?: string;
  /**
   * At season end, forces every remaining unplayed CPU fixture in the finishing hemisphere's
   * competitions (group stages and knockouts) to complete even if rescheduled slightly past `cutoffDate`.
   */
  finishHemispherePools?: 'SA_BR' | 'EU' | 'ALL';
}

/**
 * Simulates all unplayed CPU fixtures scheduled on or before `cutoffDate`,
 * credits CPU player stats, updates dynamic brackets, and recomputes all standings tables!
 * Iterates chronologically wave-by-wave so multi-stage cup progressions resolve in order.
 */
export function simulateCpuFixturesUpToDate(
  state: GameSave,
  cutoffDate: string,
  includeCurrentDate: boolean = true,
  options?: SimulateCpuFixturesOptions
): GameSave {
  let workingState = { ...state };
  let effectiveCutoffDate = cutoffDate;
  let effectiveIncludeCurrentDate = includeCurrentDate;
  const stopAtUserFixture = Boolean(options?.stopAtUserFixture);
  const minCurrentDate = options?.minCurrentDate || state.currentDate;
  const finishHemispherePools = options?.finishHemispherePools;

  const isRealTeam = (id?: string): boolean =>
    Boolean(id && id !== 'tbd' && !id.startsWith('TBD'));

  const isCupOrGroupedUnlockFixture = (f: Fixture): boolean =>
    f.competition === 'copa_brasil' ||
    f.competition === 'libertadores' ||
    f.competition === 'sulamericana' ||
    f.competition === 'copa_internacional' ||
    f.competition === 'concacaf_champions' ||
    f.competition === 'afc_champions' ||
    f.competition === 'estadual' ||
    f.competition === 'copa_nordeste' ||
    f.competition === 'copa_verde' ||
    f.competition === 'serie_d' ||
    f.competition === 'intercontinental' ||
    f.competition === 'super_mundial_clubes' ||
    f.competition === 'champions_league' ||
    f.competition === 'europa_league' ||
    f.competition === 'conference_league' ||
    f.competition === 'supercopa_brasil' ||
    f.competition === 'recopa_sulamericana' ||
    f.competition === 'uefa_supercup' ||
    f.competition === 'eng_community_shield' ||
    f.competition === 'eng_fa_cup' ||
    f.competition === 'eng_efl_cup' ||
    f.id.startsWith('serie_c_playoff_') ||
    isMlsPlayoffFixture(f) ||
    isEuropeanCup(f.competition) ||
    isSouthAmericanCup(f.competition) ||
    isWorldCup(f.competition);

  const collectAllPools = (s: GameSave): Fixture[] => [
    ...s.fixturesA,
    ...s.fixturesB,
    ...(s.fixturesC || []),
    ...(s.fixturesD || []),
    ...(s.fixturesSupercopa || []),
    ...(s.fixturesRecopa || []),
    ...(s.fixturesLibertadores || []),
    ...(s.fixturesSulamericana || []),
    ...(s.fixturesCopaBrasil || []),
    ...(s.fixturesEstadual || []),
    ...(s.fixturesCopaNordeste || []),
    ...(s.fixturesCopaVerde || []),
    ...(s.fixturesIntercontinental || []),
    ...flattenSouthAmericaFixtures(s.fixturesSouthAmerica),
    ...flattenEuropeFixtures(s.fixturesEurope),
    ...flattenWorldLeaguesFixtures(s.fixturesWorldLeagues),
    ...(s.fixturesChampionsLeague || []),
    ...(s.fixturesEuropaLeague || []),
    ...(s.fixturesConferenceLeague || []),
    ...(s.fixturesUefaSupercup || []),
    ...(s.fixturesCopaInternacional || []),
    ...(s.fixturesConcacafChampions || []),
    ...(s.fixturesAfcChampions || []),
    ...(s.fixturesSuperMundial || []),
    ...(s.fixturesEngCommunityShield || []),
    ...(s.fixturesEngEflCup || []),
    ...(s.fixturesEngFaCup || []),
    ...flattenEuropeanCupsFixtures(s.fixturesEuropeanCups),
    ...flattenSouthAmericanCupsFixtures(s.fixturesSouthAmericanCups),
    ...flattenWorldCupsFixtures(s.fixturesWorldCups),
  ];

  // Up to 300 chronological waves, batching pure round-robin league games up to the next cup matchday
  for (let pass = 0; pass < 300; pass++) {
    // On pass 0, sync standings, brackets, and schedule conflicts once before scanning due fixtures;
    // subsequent passes already receive fresh standings, brackets, and resolved conflicts from the end of the previous wave.
    if (pass === 0) {
      const preStandings = recomputeAllStandings(workingState);
      const preBrackets = syncDynamicKnockoutBrackets({
        clubs: workingState.clubs,
        currentDate: effectiveCutoffDate,
        fixturesCopaBrasil: workingState.fixturesCopaBrasil || [],
        fixturesLibertadores: workingState.fixturesLibertadores || [],
        fixturesSulamericana: workingState.fixturesSulamericana || [],
        fixturesEstadual: workingState.fixturesEstadual || [],
        fixturesCopaNordeste: workingState.fixturesCopaNordeste || [],
        fixturesCopaVerde: workingState.fixturesCopaVerde || [],
        fixturesC: workingState.fixturesC || [],
        fixturesD: workingState.fixturesD || [],
        fixturesIntercontinental: workingState.fixturesIntercontinental || [],
        fixturesChampionsLeague: workingState.fixturesChampionsLeague || [],
        fixturesEuropaLeague: workingState.fixturesEuropaLeague || [],
        fixturesConferenceLeague: workingState.fixturesConferenceLeague || [],
        fixturesCopaInternacional: workingState.fixturesCopaInternacional || [],
        fixturesConcacafChampions: workingState.fixturesConcacafChampions || [],
        fixturesAfcChampions: workingState.fixturesAfcChampions || [],
        fixturesSuperMundial: workingState.fixturesSuperMundial || [],
        fixturesEngCommunityShield: workingState.fixturesEngCommunityShield,
        fixturesEngEflCup: workingState.fixturesEngEflCup,
        fixturesEngFaCup: workingState.fixturesEngFaCup,
        fixturesEuropeanCups: workingState.fixturesEuropeanCups,
        fixturesSouthAmericanCups: workingState.fixturesSouthAmericanCups,
        fixturesEurope: workingState.fixturesEurope,
        fixturesWorldLeagues: workingState.fixturesWorldLeagues,
        fixturesWorldCups: workingState.fixturesWorldCups,
        standingsLibertadores: preStandings.standingsLibertadores,
        standingsSulamericana: preStandings.standingsSulamericana,
        standingsEstadual: preStandings.standingsEstadual,
        standingsCopaNordeste: preStandings.standingsCopaNordeste,
        standingsCopaVerde: preStandings.standingsCopaVerde,
        standingsC: preStandings.standingsC,
        standingsD: preStandings.standingsD,
        standingsChampionsLeague: preStandings.standingsChampionsLeague,
        standingsEuropaLeague: preStandings.standingsEuropaLeague,
        standingsConferenceLeague: preStandings.standingsConferenceLeague,
        standingsCopaInternacional: preStandings.standingsCopaInternacional,
        standingsAfcChampions: preStandings.standingsAfcChampions,
        standingsSuperMundial: preStandings.standingsSuperMundial,
        standingsEurope: preStandings.standingsEurope,
        standingsWorldLeagues: preStandings.standingsWorldLeagues,
      });

      workingState = resolveCrossCompetitionScheduleConflicts({
        ...workingState,
        ...preStandings,
        ...preBrackets,
      });
    }

    const allPools = collectAllPools(workingState);

    // If a newly unlocked user match falls earlier than our jump target, stop at its date
    // so the user ALWAYS plays every group-stage and knockout fixture in chronological order!
    let hasPendingUserFixture = false;
    if (stopAtUserFixture) {
      const userUnplayedDates = allPools
        .filter(
          (f) =>
            !f.played &&
            f.date &&
            isRealTeam(f.homeTeamId) &&
            isRealTeam(f.awayTeamId) &&
            (f.homeTeamId === workingState.userClubId || f.awayTeamId === workingState.userClubId)
        )
        .map((f) => f.date as string)
        .sort();

      const earliestUserDate = userUnplayedDates[0];
      if (earliestUserDate) {
        hasPendingUserFixture = true;
        if (
          earliestUserDate < effectiveCutoffDate ||
          (earliestUserDate === effectiveCutoffDate && effectiveIncludeCurrentDate)
        ) {
          effectiveCutoffDate = earliestUserDate;
          effectiveIncludeCurrentDate = false;
        }
        const clampedCurrent =
          minCurrentDate && earliestUserDate < minCurrentDate ? minCurrentDate : earliestUserDate;
        if (workingState.currentDate && workingState.currentDate > clampedCurrent) {
          workingState = {
            ...workingState,
            currentDate: clampedCurrent,
          };
        }
      }
    }

    const dueCpuFixtures = allPools
      .filter((f) => {
        if (f.played) return false;
        if (!isRealTeam(f.homeTeamId) || !isRealTeam(f.awayTeamId)) {
          return false;
        }
        if (f.homeTeamId === workingState.userClubId || f.awayTeamId === workingState.userClubId) {
          return false;
        }

        if (
          finishHemispherePools &&
          !hasPendingUserFixture &&
          isFixtureInFinishingHemisphere(f, finishHemispherePools)
        ) {
          return true;
        }

        if (f.date) {
          const dateDue = effectiveIncludeCurrentDate
            ? f.date <= effectiveCutoffDate
            : f.date < effectiveCutoffDate;
          if (dateDue) return true;
        } else if (CLASSIC_LEAGUES_38.includes(f.competition) && f.round < workingState.currentRound) {
          return true;
        }

        return false;
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    if (dueCpuFixtures.length === 0) {
      break;
    }

    const earliestCupDue = dueCpuFixtures.find((f) => isCupOrGroupedUnlockFixture(f));
    const waveCutoffDate = earliestCupDue?.date || effectiveCutoffDate;
    const waveFixtures = dueCpuFixtures.filter((f) => {
      if (!f.date) return true;
      if (!earliestCupDue) return true; // Only pure round-robin leagues left -> simulate all in one wave
      return f.date <= waveCutoffDate;
    });

    const allClubsWithGuests = withWorldGuestClubs(workingState.clubs);
    const clubsMap = new Map<string, Club>(allClubsWithGuests.map((c) => [c.id, c]));
    const templateClub = workingState.clubs[0];

    const simulatedBatch: Fixture[] = waveFixtures.map((f) => {
      const h = clubsMap.get(f.homeTeamId) || buildFallbackSyntheticClub(f.homeTeamId, templateClub);
      const a = clubsMap.get(f.awayTeamId) || buildFallbackSyntheticClub(f.awayTeamId, templateClub);
      const leg1 =
        f.leg === 2
          ? allPools.find(
              (prev) =>
                prev.competition === f.competition &&
                prev.leg === 1 &&
                (prev.id === f.id.replace('_volta', '_ida') ||
                  (prev.cupPhase === f.cupPhase &&
                    prev.homeTeamId === f.awayTeamId &&
                    prev.awayTeamId === f.homeTeamId))
            )
          : undefined;
      return simulateQuickMatch(h, a, f, leg1);
    });

    if (!simulatedBatch.some((f) => f.played)) {
      break;
    }

    const mergedFixtures = mergeCompletedFixturesIntoState(workingState, simulatedBatch);
    const updatedClubs = creditCpuPlayersFromFixtures(workingState.clubs, simulatedBatch);

    const passStandings = recomputeAllStandings({
      ...workingState,
      ...mergedFixtures,
    });

    const syncedBrackets = syncDynamicKnockoutBrackets({
      clubs: updatedClubs,
      currentDate: waveCutoffDate < effectiveCutoffDate ? waveCutoffDate : effectiveCutoffDate,
      fixturesCopaBrasil: mergedFixtures.fixturesCopaBrasil,
      fixturesLibertadores: mergedFixtures.fixturesLibertadores,
      fixturesSulamericana: mergedFixtures.fixturesSulamericana,
      fixturesEstadual: mergedFixtures.fixturesEstadual,
      fixturesCopaNordeste: mergedFixtures.fixturesCopaNordeste,
      fixturesCopaVerde: mergedFixtures.fixturesCopaVerde,
      fixturesC: mergedFixtures.fixturesC,
      fixturesD: mergedFixtures.fixturesD,
      fixturesIntercontinental: mergedFixtures.fixturesIntercontinental,
      fixturesChampionsLeague: mergedFixtures.fixturesChampionsLeague,
      fixturesEuropaLeague: mergedFixtures.fixturesEuropaLeague,
      fixturesConferenceLeague: mergedFixtures.fixturesConferenceLeague,
      fixturesCopaInternacional: mergedFixtures.fixturesCopaInternacional,
      fixturesConcacafChampions: mergedFixtures.fixturesConcacafChampions,
      fixturesAfcChampions: mergedFixtures.fixturesAfcChampions,
      fixturesSuperMundial: mergedFixtures.fixturesSuperMundial,
      fixturesEngCommunityShield: mergedFixtures.fixturesEngCommunityShield,
      fixturesEngEflCup: mergedFixtures.fixturesEngEflCup,
      fixturesEngFaCup: mergedFixtures.fixturesEngFaCup,
      fixturesEuropeanCups: mergedFixtures.fixturesEuropeanCups,
      fixturesSouthAmericanCups: mergedFixtures.fixturesSouthAmericanCups,
      fixturesEurope: mergedFixtures.fixturesEurope,
      fixturesWorldLeagues: mergedFixtures.fixturesWorldLeagues,
      fixturesWorldCups: mergedFixtures.fixturesWorldCups,
      standingsLibertadores: passStandings.standingsLibertadores,
      standingsSulamericana: passStandings.standingsSulamericana,
      standingsEstadual: passStandings.standingsEstadual,
      standingsCopaNordeste: passStandings.standingsCopaNordeste,
      standingsCopaVerde: passStandings.standingsCopaVerde,
      standingsC: passStandings.standingsC,
      standingsD: passStandings.standingsD,
      standingsChampionsLeague: passStandings.standingsChampionsLeague,
      standingsEuropaLeague: passStandings.standingsEuropaLeague,
      standingsConferenceLeague: passStandings.standingsConferenceLeague,
      standingsCopaInternacional: passStandings.standingsCopaInternacional,
      standingsAfcChampions: passStandings.standingsAfcChampions,
      standingsSuperMundial: passStandings.standingsSuperMundial,
      standingsEurope: passStandings.standingsEurope,
      standingsWorldLeagues: passStandings.standingsWorldLeagues,
    });

    workingState = resolveCrossCompetitionScheduleConflicts({
      ...workingState,
      clubs: updatedClubs,
      ...mergedFixtures,
      ...syncedBrackets,
      ...passStandings,
    });
  }

  return workingState;
}

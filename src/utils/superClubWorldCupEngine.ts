import { Club, Fixture, GameSave, Standing } from '../types/game';
import {
  EUROPEAN_LEAGUE_IDS,
  EUROPEAN_LEAGUES_META,
  getClubEuropeanLeagueId,
} from './europeLeaguesEngine';
import {
  SOUTH_AMERICAN_LEAGUE_IDS,
  SOUTH_AMERICAN_LEAGUES_META,
  getClubSouthAmericanLeagueId,
} from './southAmericaLeaguesEngine';
import {
  WORLD_LEAGUE_IDS,
  WORLD_LEAGUES_META,
  NORTH_AMERICAN_LEAGUE_IDS,
  ASIA_RUSSIA_LEAGUE_IDS,
  AFRICA_LEAGUE_IDS,
  getClubWorldLeagueId,
} from './worldLeaguesEngine';
import { resolveCupChampionId } from './multiLeagueEngine';

export interface SuperMundialQualifierEntry {
  slotNumber: number;
  clubId: string;
  clubName: string;
  clubShortName: string;
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'AFC' | 'CAF' | 'FIFA_HOST';
  country: string;
  qualificationMethod: string;
  overallAvg: number;
}

const SUPER_MUNDIAL_GROUPS = [
  'Grupo A',
  'Grupo B',
  'Grupo C',
  'Grupo D',
  'Grupo E',
  'Grupo F',
  'Grupo G',
  'Grupo H',
];

/**
 * Official quadrennial FIFA 32-Team Super Club World Cup cycle:
 * 2025 -> 2029 -> 2033 -> 2037...
 * (Zero calendar clash with Nations World Cup 2026/2030 or Euro/Copa América 2028/2032!)
 */
export function isSuperClubWorldCupYear(year: number): boolean {
  return year >= 2029 && (year - 2025) % 4 === 0;
}

export function getNextSuperClubWorldCupYear(currentYear: number): number {
  let y = Math.max(2029, currentYear);
  while (!isSuperClubWorldCupYear(y)) {
    y++;
  }
  return y;
}

function getAvgOvr(club: Club): number {
  if (!club.squad || club.squad.length === 0) return 72;
  const top14 = [...club.squad].sort((a, b) => b.overall - a.overall).slice(0, 14);
  return Math.round(top14.reduce((acc, p) => acc + p.overall, 0) / top14.length);
}

/**
 * Dynamically selects the 32 FIFA Super Club World Cup qualifiers across all 6 global zones:
 * - 12 UEFA (Europe)
 * - 6 CONMEBOL (Brazil + South America)
 * - 4 CONCACAF (USA MLS + Mexico Liga MX)
 * - 4 AFC / Eurasia (Saudi Pro League + Japan J1 + Russia)
 * - 4 CAF (Egypt + Morocco)
 * - 2 FIFA Host / Champions Internacional
 */
export function computeSuperMundial32Qualifiers(state: {
  clubs: Club[];
  standingsA?: Standing[];
  standingsEurope?: GameSave['standingsEurope'];
  standingsSouthAmerica?: GameSave['standingsSouthAmerica'];
  standingsWorldLeagues?: GameSave['standingsWorldLeagues'];
  fixturesChampionsLeague?: Fixture[];
  fixturesLibertadores?: Fixture[];
  fixturesCopaInternacional?: Fixture[];
  fixturesConcacafChampions?: Fixture[];
  fixturesAfcChampions?: Fixture[];
  reigningUclChampId?: string;
}): SuperMundialQualifierEntry[] {
  const entries: SuperMundialQualifierEntry[] = [];
  const pickedIds = new Set<string>();
  const clubsById = new Map(state.clubs.map((c) => [c.id, c]));

  const tryAdd = (
    club: Club | undefined,
    confederation: SuperMundialQualifierEntry['confederation'],
    country: string,
    qualificationMethod: string
  ): boolean => {
    if (!club || pickedIds.has(club.id)) return false;
    pickedIds.add(club.id);
    entries.push({
      slotNumber: entries.length + 1,
      clubId: club.id,
      clubName: club.name,
      clubShortName: club.shortName,
      confederation,
      country,
      qualificationMethod,
      overallAvg: getAvgOvr(club),
    });
    return true;
  };

  // 1. UEFA (12 slots — max 2 per country except reigning UCL champion)
  const uclChampId =
    resolveCupChampionId(state.fixturesChampionsLeague) || state.reigningUclChampId;
  const uefaCountryCounts = new Map<string, number>();
  let uefaCount = 0;

  if (uclChampId && clubsById.has(uclChampId)) {
    const champ = clubsById.get(uclChampId)!;
    const euId = getClubEuropeanLeagueId(champ);
    const country = euId ? EUROPEAN_LEAGUES_META[euId].country : 'Europa';
    if (tryAdd(champ, 'UEFA', country, 'Campeão da UEFA Champions League')) {
      uefaCountryCounts.set(country, 1);
      uefaCount++;
    }
  }

  // League leaders from top European leagues + ranking
  const priorityEuLeagues = [
    'eng_premier',
    'esp_laliga',
    'ger_bundesliga',
    'ita_serie_a',
    'fra_ligue1',
    'por_primeira',
    'ned_eredivisie',
    ...EUROPEAN_LEAGUE_IDS,
  ];
  for (const lid of priorityEuLeagues) {
    if (uefaCount >= 12) break;
    const meta = EUROPEAN_LEAGUES_META[lid as keyof typeof EUROPEAN_LEAGUES_META];
    if (
      !meta ||
      lid === 'eng_championship' ||
      lid === 'eng_league_one' ||
      lid === 'eng_league_two'
    ) {
      continue;
    }
    const table = state.standingsEurope?.[lid as keyof NonNullable<GameSave['standingsEurope']>] || [];
    for (const row of table.slice(0, 2)) {
      if (uefaCount >= 12) break;
      const cCount = uefaCountryCounts.get(meta.country) || 0;
      if (cCount >= 2) continue;
      const club = clubsById.get(row.teamId);
      if (
        tryAdd(
          club,
          'UEFA',
          meta.country,
          row === table[0] ? `Líder/Campeão · ${meta.shortName}` : `Ranking UEFA · ${meta.shortName}`
        )
      ) {
        uefaCountryCounts.set(meta.country, cCount + 1);
        uefaCount++;
      }
    }
  }

  if (uefaCount < 12) {
    const euClubsSorted = state.clubs
      .filter((c) => c.division === 'EU' && !pickedIds.has(c.id))
      .sort((a, b) => getAvgOvr(b) - getAvgOvr(a));
    for (const club of euClubsSorted) {
      if (uefaCount >= 12) break;
      const euId = getClubEuropeanLeagueId(club);
      const country = euId ? EUROPEAN_LEAGUES_META[euId].country : 'Europa';
      if (tryAdd(club, 'UEFA', country, 'Coeficiente UEFA de 4 Anos')) {
        uefaCount++;
      }
    }
  }

  // 2. CONMEBOL (6 slots: Libertadores Champ + Top Brazil Série A + Top Argentina + Ranking CONMEBOL)
  let conmebolCount = 0;
  const libChampId = resolveCupChampionId(state.fixturesLibertadores);
  if (libChampId && clubsById.has(libChampId)) {
    const c = clubsById.get(libChampId)!;
    const saId = getClubSouthAmericanLeagueId(c);
    const country = saId ? SOUTH_AMERICAN_LEAGUES_META[saId].country : 'Brasil';
    if (tryAdd(c, 'CONMEBOL', country, 'Campeão da CONMEBOL Libertadores')) {
      conmebolCount++;
    }
  }

  const brCandidates = (state.standingsA || [])
    .map((s) => clubsById.get(s.teamId))
    .filter((c): c is Club => Boolean(c));
  const fallbackBr =
    brCandidates.length > 0
      ? brCandidates
      : state.clubs.filter((c) => c.division === 'A').sort((a, b) => getAvgOvr(b) - getAvgOvr(a));

  let brPicked = 0;
  for (const club of fallbackBr) {
    if (conmebolCount >= 6 || brPicked >= 3) break;
    if (
      tryAdd(
        club,
        'CONMEBOL',
        'Brasil',
        brPicked === 0 ? 'Campeão / Líder Brasileirão Série A' : 'Ranking CONMEBOL · Brasil'
      )
    ) {
      conmebolCount++;
      brPicked++;
    }
  }

  for (const saId of SOUTH_AMERICAN_LEAGUE_IDS) {
    if (conmebolCount >= 6) break;
    const meta = SOUTH_AMERICAN_LEAGUES_META[saId];
    const table = state.standingsSouthAmerica?.[saId] || [];
    const topClub =
      clubsById.get(table[0]?.teamId || '') ||
      state.clubs
        .filter((c) => getClubSouthAmericanLeagueId(c) === saId)
        .sort((a, b) => getAvgOvr(b) - getAvgOvr(a))[0];
    if (tryAdd(topClub, 'CONMEBOL', meta.country, `Campeão / Ranking · ${meta.shortName}`)) {
      conmebolCount++;
    }
    if (saId === 'liga_arg' && conmebolCount < 6 && table[1]) {
      const secondArg = clubsById.get(table[1].teamId);
      if (tryAdd(secondArg, 'CONMEBOL', 'Argentina', 'Ranking CONMEBOL · Argentina')) {
        conmebolCount++;
      }
    }
  }

  // 3. CONCACAF (4 slots: Campeão Concacaf Champions Cup + USA MLS + Mexico Liga MX + Canada CPL)
  let concacafCount = 0;
  const concacafChampId = resolveCupChampionId(state.fixturesConcacafChampions);
  if (concacafChampId && clubsById.has(concacafChampId)) {
    const c = clubsById.get(concacafChampId)!;
    const wlId = getClubWorldLeagueId(c);
    const country = wlId ? WORLD_LEAGUES_META[wlId].country : c.country || 'CONCACAF';
    if (tryAdd(c, 'CONCACAF', country, 'Campeão da Concacaf Champions Cup')) {
      concacafCount++;
    }
  }
  for (const lid of NORTH_AMERICAN_LEAGUE_IDS) {
    const meta = WORLD_LEAGUES_META[lid];
    const table = state.standingsWorldLeagues?.[lid] || [];
    const quota = lid === 'usa_mls' ? 2 : 1;
    const pool =
      table.length > 0
        ? table.map((s) => clubsById.get(s.teamId)).filter((c): c is Club => Boolean(c))
        : state.clubs
            .filter((c) => getClubWorldLeagueId(c) === lid)
            .sort((a, b) => getAvgOvr(b) - getAvgOvr(a));
    let taken = 0;
    for (const club of pool) {
      if (concacafCount >= 4 || taken >= quota) break;
      if (tryAdd(club, 'CONCACAF', meta.country, `Classificado CONCACAF · ${meta.shortName}`)) {
        concacafCount++;
        taken++;
      }
    }
  }

  // 4. AFC & Eurasia (4 slots: Campeão AFC Champions League Elite + Saudi Pro League, Japan J1, Russia Premier)
  let afcCount = 0;
  const afcChampId = resolveCupChampionId(state.fixturesAfcChampions);
  if (afcChampId && clubsById.has(afcChampId)) {
    const c = clubsById.get(afcChampId)!;
    const wlId = getClubWorldLeagueId(c);
    const country = wlId ? WORLD_LEAGUES_META[wlId].country : c.country || 'AFC';
    if (tryAdd(c, 'AFC', country, 'Campeão da Liga dos Campeões da Ásia')) {
      afcCount++;
    }
  }
  for (const lid of ASIA_RUSSIA_LEAGUE_IDS) {
    const meta = WORLD_LEAGUES_META[lid];
    const table = state.standingsWorldLeagues?.[lid] || [];
    const quota = lid === 'sau_pro' ? 2 : 1;
    const pool =
      table.length > 0
        ? table.map((s) => clubsById.get(s.teamId)).filter((c): c is Club => Boolean(c))
        : state.clubs
            .filter((c) => getClubWorldLeagueId(c) === lid)
            .sort((a, b) => getAvgOvr(b) - getAvgOvr(a));
    let taken = 0;
    for (const club of pool) {
      if (afcCount >= 4 || taken >= quota) break;
      if (tryAdd(club, 'AFC', meta.country, `Classificado AFC/Ásia · ${meta.shortName}`)) {
        afcCount++;
        taken++;
      }
    }
  }

  // 5. CAF Africa (4 slots: 2 Egypt + 2 Morocco)
  let cafCount = 0;
  for (const lid of AFRICA_LEAGUE_IDS) {
    const meta = WORLD_LEAGUES_META[lid];
    const table = state.standingsWorldLeagues?.[lid] || [];
    const pool =
      table.length > 0
        ? table.map((s) => clubsById.get(s.teamId)).filter((c): c is Club => Boolean(c))
        : state.clubs
            .filter((c) => getClubWorldLeagueId(c) === lid)
            .sort((a, b) => getAvgOvr(b) - getAvgOvr(a));
    for (const club of pool.slice(0, 2)) {
      if (cafCount >= 4) break;
      if (tryAdd(club, 'CAF', meta.country, `Classificado CAF África · ${meta.shortName}`)) {
        cafCount++;
      }
    }
  }

  // 6. FIFA Host & Champions Internacional Winner (remaining up to 32)
  const cintChampId = resolveCupChampionId(state.fixturesCopaInternacional);
  if (cintChampId && entries.length < 32) {
    const cintClub = clubsById.get(cintChampId);
    const wlId = cintClub ? getClubWorldLeagueId(cintClub) : null;
    tryAdd(
      cintClub,
      'FIFA_HOST',
      wlId ? WORLD_LEAGUES_META[wlId].country : 'Internacional',
      'Campeão da Champions Internacional FIFA'
    );
  }

  // Fill any remaining slots up to 32 from highest-OVR unpicked clubs across world leagues / Europe / SA
  if (entries.length < 32) {
    const remainingPool = state.clubs
      .filter((c) => !pickedIds.has(c.id))
      .sort((a, b) => getAvgOvr(b) - getAvgOvr(a));
    for (const club of remainingPool) {
      if (entries.length >= 32) break;
      const wlId = getClubWorldLeagueId(club);
      const euId = getClubEuropeanLeagueId(club);
      const saId = getClubSouthAmericanLeagueId(club);
      const country = wlId
        ? WORLD_LEAGUES_META[wlId].country
        : euId
        ? EUROPEAN_LEAGUES_META[euId].country
        : saId
        ? SOUTH_AMERICAN_LEAGUES_META[saId].country
        : 'Brasil';
      tryAdd(club, 'FIFA_HOST', country, 'Vaga Convidado / Ranking Mundial FIFA');
    }
  }

  return entries.slice(0, 32).map((e, idx) => ({ ...e, slotNumber: idx + 1 }));
}

/**
 * Generates the 32-club FIFA Super Club World Cup (8 groups A–H of 4 teams, 3 single-leg rounds
 * + single-leg Oitavas, Quartas, Semifinal, and Grande Final) from June 15 to July 13.
 */
export function generateSuperMundialFixtures(
  state: {
    clubs: Club[];
    standingsA?: Standing[];
    standingsEurope?: GameSave['standingsEurope'];
    standingsSouthAmerica?: GameSave['standingsSouthAmerica'];
    standingsWorldLeagues?: GameSave['standingsWorldLeagues'];
    fixturesChampionsLeague?: Fixture[];
    fixturesLibertadores?: Fixture[];
    fixturesCopaInternacional?: Fixture[];
    fixturesConcacafChampions?: Fixture[];
    fixturesAfcChampions?: Fixture[];
    reigningUclChampId?: string;
  },
  year: number,
  customGroupClubs?: string[][]
): {
  fixtures: Fixture[];
  standings: Standing[];
  qualifiers: SuperMundialQualifierEntry[];
} {
  if (!isSuperClubWorldCupYear(year) && (!customGroupClubs || customGroupClubs.length === 0)) {
    return {
      fixtures: [],
      standings: [],
      qualifiers: computeSuperMundial32Qualifiers(state),
    };
  }

  const qualifiers = computeSuperMundial32Qualifiers(state);
  // Seed into 4 pots of 8 by OVR + confederation diversity
  const sortedByPot = [...qualifiers].sort((a, b) => b.overallAvg - a.overallAvg);
  let groupsClubs: string[][] = Array.from({ length: 8 }, () => []);

  if (customGroupClubs && customGroupClubs.length === 8) {
    groupsClubs = customGroupClubs.map((grp) => [...grp]);
  } else {
    for (let pot = 0; pot < 4; pot++) {
      const potSlice = sortedByPot.slice(pot * 8, (pot + 1) * 8);
      potSlice.forEach((entry, gIdx) => {
        const targetGroup = pot % 2 === 0 ? gIdx : 7 - gIdx;
        groupsClubs[targetGroup].push(entry.clubId);
      });
    }
  }

  const standings: Standing[] = [];
  const fixtures: Fixture[] = [];

  const groupDates = [`${year}-06-15`, `${year}-06-20`, `${year}-06-25`];

  groupsClubs.forEach((groupIds, gIdx) => {
    const groupName = SUPER_MUNDIAL_GROUPS[gIdx];
    groupIds.forEach((teamId) => {
      standings.push({
        teamId,
        group: groupName,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
      });
    });

    if (groupIds.length === 4) {
      const [t0, t1, t2, t3] = groupIds;
      const pairings: Array<[number, string, string]> = [
        [1, t0, t1],
        [1, t2, t3],
        [2, t0, t2],
        [2, t1, t3],
        [3, t3, t0],
        [3, t1, t2],
      ];

      pairings.forEach(([rnd, homeId, awayId], pIdx) => {
        fixtures.push({
          id: `smwc_${year}_g${gIdx}_r${rnd}_m${pIdx}`,
          round: rnd,
          date: groupDates[rnd - 1],
          competition: 'super_mundial_clubes',
          cupPhase: `Fase de Grupos · ${groupName}`,
          homeTeamId: homeId,
          awayTeamId: awayId,
          homeScore: null,
          awayScore: null,
          played: false,
        });
      });
    }
  });

  // Oitavas de Final (Jogo Único — 30/06 e 01/07)
  for (let m = 0; m < 8; m++) {
    fixtures.push({
      id: `smwc_oitavas_m${m}`,
      round: 4,
      date: m < 4 ? `${year}-06-30` : `${year}-07-01`,
      competition: 'super_mundial_clubes',
      cupPhase: 'Oitavas de Final (Jogo Único)',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
    });
  }

  // Quartas de Final (Jogo Único — 05/07)
  for (let q = 0; q < 4; q++) {
    fixtures.push({
      id: `smwc_quartas_m${q}`,
      round: 5,
      date: `${year}-07-05`,
      competition: 'super_mundial_clubes',
      cupPhase: 'Quartas de Final (Jogo Único)',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
    });
  }

  // Semifinal (Jogo Único — 09/07)
  for (let s = 0; s < 2; s++) {
    fixtures.push({
      id: `smwc_semi_${s}`,
      round: 6,
      date: `${year}-07-09`,
      competition: 'super_mundial_clubes',
      cupPhase: 'Semifinal do Super Mundial',
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
    });
  }

  // Grande Final do Super Mundial de Clubes FIFA (13/07)
  fixtures.push({
    id: 'smwc_grande_final',
    round: 7,
    date: `${year}-07-13`,
    competition: 'super_mundial_clubes',
    cupPhase: 'Grande Final · Super Mundial FIFA (32 Clubes)',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
  });

  return { fixtures, standings, qualifiers };
}

function resolveSingleWinner(fix?: Fixture): string | undefined {
  if (!fix || !fix.played) return undefined;
  if (fix.aggregateWinnerId) return fix.aggregateWinnerId;
  if (
    fix.penaltiesHome !== undefined &&
    fix.penaltiesAway !== undefined &&
    fix.penaltiesHome !== fix.penaltiesAway
  ) {
    return fix.penaltiesHome > fix.penaltiesAway ? fix.homeTeamId : fix.awayTeamId;
  }
  return (fix.homeScore ?? 0) >= (fix.awayScore ?? 0) ? fix.homeTeamId : fix.awayTeamId;
}

/**
 * Advances top 2 of Groups A–H into single-leg Oitavas -> Quartas -> Semifinal -> Grande Final.
 */
export function syncSuperMundialKnockoutBracket(
  fixtures: Fixture[] = [],
  standings: Standing[] = []
): Fixture[] {
  if (fixtures.length === 0) return fixtures;
  let list = [...fixtures];
  const getFix = (id: string) => list.find((f) => f.id === id);
  const assignSingle = (id: string, homeId?: string, awayId?: string) => {
    if (!homeId && !awayId) return;
    list = list.map((f) => {
      if (f.id !== id || f.played) return f;
      return {
        ...f,
        homeTeamId: homeId && homeId !== 'tbd' ? homeId : f.homeTeamId,
        awayTeamId: awayId && awayId !== 'tbd' ? awayId : f.awayTeamId,
      };
    });
  };

  const groupGames = list.filter((f) => (f.cupPhase || '').startsWith('Fase de Grupos'));
  const allGroupPlayed = groupGames.length > 0 && groupGames.every((f) => f.played);

  if (allGroupPlayed) {
    const topTwo = (grp: string): [string | undefined, string | undefined] => {
      const rows = standings
        .filter((s) => s.group === grp)
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.won !== a.won) return b.won - a.won;
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });
      return [rows[0]?.teamId, rows[1]?.teamId];
    };

    const [a1, a2] = topTwo('Grupo A');
    const [b1, b2] = topTwo('Grupo B');
    const [c1, c2] = topTwo('Grupo C');
    const [d1, d2] = topTwo('Grupo D');
    const [e1, e2] = topTwo('Grupo E');
    const [f1, f2] = topTwo('Grupo F');
    const [g1, g2] = topTwo('Grupo G');
    const [h1, h2] = topTwo('Grupo H');

    assignSingle('smwc_oitavas_m0', a1, b2);
    assignSingle('smwc_oitavas_m1', c1, d2);
    assignSingle('smwc_oitavas_m2', e1, f2);
    assignSingle('smwc_oitavas_m3', g1, h2);
    assignSingle('smwc_oitavas_m4', b1, a2);
    assignSingle('smwc_oitavas_m5', d1, c2);
    assignSingle('smwc_oitavas_m6', f1, e2);
    assignSingle('smwc_oitavas_m7', h1, g2);
  }

  for (let q = 0; q < 4; q++) {
    const w1 = resolveSingleWinner(getFix(`smwc_oitavas_m${q * 2}`));
    const w2 = resolveSingleWinner(getFix(`smwc_oitavas_m${q * 2 + 1}`));
    assignSingle(`smwc_quartas_m${q}`, w1, w2);
  }

  for (let s = 0; s < 2; s++) {
    const w1 = resolveSingleWinner(getFix(`smwc_quartas_m${s * 2}`));
    const w2 = resolveSingleWinner(getFix(`smwc_quartas_m${s * 2 + 1}`));
    assignSingle(`smwc_semi_${s}`, w1, w2);
  }

  const fin1 = resolveSingleWinner(getFix('smwc_semi_0'));
  const fin2 = resolveSingleWinner(getFix('smwc_semi_1'));
  assignSingle('smwc_grande_final', fin1, fin2);

  return list;
}

import { Club, Fixture, Standing, WorldLeagueId } from '../types/game';
import {
  CONCACAF_2026_BYE_R16_IDS,
  CONCACAF_2026_ROUND1_PAIRS,
  CONCACAF_CARIBBEAN_CHAMP_ID,
  CONCACAF_CARIBBEAN_R1_IDS,
  CONCACAF_CENTRAL_AMERICA_CHAMP_ID,
  CONCACAF_CENTRAL_AMERICA_R1_IDS,
} from '../data/concacafChampionsData';
import { withWorldGuestClubs } from './intercontinentalEngine';
import { resolveMlsCupChampionId, sortMlsStandings } from './usaMlsEngine';
import { getClubWorldLeagueId } from './worldLeaguesEngine';
import { addDays, isDateInFifaPause } from './calendarUtils';

const CANADIAN_MLS_CLUB_IDS = new Set<string>(['wl_usa_van', 'wl_usa_tor', 'wl_usa_mtl']);

export interface ConcacafQualificationPlan {
  byeR16Ids: string[]; // 5 clubs entering directly in the Round of 16
  round1Pairs: Array<[string, string]>; // 11 ties (22 clubs)
  allParticipants: string[]; // 27 clubs
}

function getClubRankingScore(club?: Club): number {
  if (!club) return 60;
  const ovr =
    club.squad && club.squad.length > 0
      ? [...club.squad]
          .sort((a, b) => b.overall - a.overall)
          .slice(0, 11)
          .reduce((acc, p) => acc + p.overall, 0) / Math.min(11, club.squad.length)
      : 65;
  return ovr + club.reputation * 2;
}

function sortGenericStandings(rows: Standing[], clubsMap: Map<string, Club>): string[] {
  return [...rows]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return getClubRankingScore(clubsMap.get(b.teamId)) - getClubRankingScore(clubsMap.get(a.teamId));
    })
    .map((r) => r.teamId);
}

/**
 * Resolves the 27 participating clubs (5 R16 Byes + 22 Round One) for the annual
 * Concacaf Champions Cup (Copa dos Campeões da CONCACAF):
 * - 2026: Official 27 participants from the 2026 edition
 * - 2027+: Dynamic qualification from USA (MLS Cup + Supporters' Shield + 6 US MLS),
 *          Mexico (Liga MX 1st–6th), Canada (Best Canadian MLS + Top 3 CPL),
 *          completed with the Central American (6) and Caribbean (3) clubs!
 */
export function selectConcacafChampionsParticipants(
  rawClubs: Club[],
  year: number = 2026,
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>,
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>
): ConcacafQualificationPlan {
  const allClubs = withWorldGuestClubs(rawClubs);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));

  const hasFinishedPrevStandings = Boolean(
    standingsWorldLeagues?.usa_mls?.some((s) => s.played >= 15) &&
      standingsWorldLeagues?.mex_ligamx?.some((s) => s.played >= 15) &&
      standingsWorldLeagues?.can_cpl?.some((s) => s.played >= 10)
  );

  // Use exact 2026 inaugural bracket on season 2026 or when no prior World League standings exist
  if (year === 2026 || !hasFinishedPrevStandings) {
    const validByes = CONCACAF_2026_BYE_R16_IDS.filter((id) => clubsMap.has(id));
    const validPairs = CONCACAF_2026_ROUND1_PAIRS.filter(
      ([a, b]) => clubsMap.has(a) && clubsMap.has(b)
    );
    if (validByes.length === 5 && validPairs.length === 11) {
      return {
        byeR16Ids: validByes,
        round1Pairs: validPairs,
        allParticipants: [
          ...validByes,
          ...validPairs.flatMap(([a, b]) => [a, b]),
        ],
      };
    }
  }

  // Dynamic Annual Qualification (2027+)
  const picked = new Set<string>();
  const mexStandings = sortGenericStandings(standingsWorldLeagues?.mex_ligamx || [], clubsMap);
  const mexPoolFallback = allClubs
    .filter((c) => getClubWorldLeagueId(c) === 'mex_ligamx')
    .sort((a, b) => getClubRankingScore(b) - getClubRankingScore(a))
    .map((c) => c.id);
  const mexOrdered = Array.from(new Set([...mexStandings, ...mexPoolFallback]));

  const mlsSortedStandings = sortMlsStandings(
    standingsWorldLeagues?.usa_mls || [],
    fixturesWorldLeagues?.usa_mls || []
  ).map((s) => s.teamId);
  const mlsPoolFallback = allClubs
    .filter((c) => getClubWorldLeagueId(c) === 'usa_mls')
    .sort((a, b) => getClubRankingScore(b) - getClubRankingScore(a))
    .map((c) => c.id);
  const mlsOrdered = Array.from(new Set([...mlsSortedStandings, ...mlsPoolFallback]));
  const mlsCupChampId = resolveMlsCupChampionId(fixturesWorldLeagues?.usa_mls);

  const cplStandings = sortGenericStandings(standingsWorldLeagues?.can_cpl || [], clubsMap);
  const cplPoolFallback = allClubs
    .filter((c) => getClubWorldLeagueId(c) === 'can_cpl')
    .sort((a, b) => getClubRankingScore(b) - getClubRankingScore(a))
    .map((c) => c.id);
  const cplOrdered = Array.from(new Set([...cplStandings, ...cplPoolFallback]));

  // 5 Direct Bye clubs (Oitavas de Final):
  // 0: Liga MX Champion, 1: MLS Cup Champion, 2: MLS Shield / Best USA, 3: Central America Champ, 4: Caribbean Champ
  const bye0 = mexOrdered[0] || 'wl_mex_tol';
  picked.add(bye0);

  const usaOnlyMls = mlsOrdered.filter((id) => !CANADIAN_MLS_CLUB_IDS.has(id));
  const bye1 =
    (mlsCupChampId && !picked.has(mlsCupChampId) ? mlsCupChampId : undefined) ||
    usaOnlyMls.find((id) => !picked.has(id)) ||
    'wl_usa_mia';
  picked.add(bye1);

  const bye2 =
    usaOnlyMls.find((id) => !picked.has(id)) ||
    mlsOrdered.find((id) => !picked.has(id)) ||
    'wl_usa_sea';
  picked.add(bye2);

  const bye3 = CONCACAF_CENTRAL_AMERICA_CHAMP_ID;
  picked.add(bye3);

  const bye4 = CONCACAF_CARIBBEAN_CHAMP_ID;
  picked.add(bye4);

  const byeR16Ids = [bye0, bye1, bye2, bye3, bye4];

  // 22 Round One clubs:
  // Mexico (5)
  const mexR1: string[] = [];
  for (const id of mexOrdered) {
    if (mexR1.length >= 5) break;
    if (!picked.has(id) && clubsMap.has(id)) {
      mexR1.push(id);
      picked.add(id);
    }
  }

  // Canada (4: 1 best Canadian MLS club + top 3 CPL clubs)
  const canR1: string[] = [];
  const canadianMlsOrdered = mlsOrdered.filter((id) => CANADIAN_MLS_CLUB_IDS.has(id));
  for (const id of canadianMlsOrdered) {
    if (canR1.length >= 1) break;
    if (!picked.has(id) && clubsMap.has(id)) {
      canR1.push(id);
      picked.add(id);
    }
  }
  for (const id of cplOrdered) {
    if (canR1.length >= 4) break;
    if (!picked.has(id) && clubsMap.has(id)) {
      canR1.push(id);
      picked.add(id);
    }
  }

  // USA (6 remaining top US MLS clubs)
  const usaR1: string[] = [];
  for (const id of usaOnlyMls) {
    if (usaR1.length >= 6) break;
    if (!picked.has(id) && clubsMap.has(id)) {
      usaR1.push(id);
      picked.add(id);
    }
  }

  // Central America (5) + Caribbean (2)
  const caR1 = CONCACAF_CENTRAL_AMERICA_R1_IDS.filter((id) => clubsMap.has(id) && !picked.has(id));
  caR1.forEach((id) => picked.add(id));

  const carR1 = CONCACAF_CARIBBEAN_R1_IDS.filter((id) => clubsMap.has(id) && !picked.has(id));
  carR1.forEach((id) => picked.add(id));

  // Ensure exactly 22 R1 clubs using North American fallback if needed
  const r1All = [...mexR1, ...usaR1, ...canR1, ...caR1, ...carR1];
  if (r1All.length < 22) {
    const northPool = [...mexOrdered, ...mlsOrdered, ...cplOrdered];
    for (const id of northPool) {
      if (r1All.length >= 22) break;
      if (!picked.has(id) && clubsMap.has(id)) {
        r1All.push(id);
        picked.add(id);
      }
    }
  }

  // Seed Pot A (top 11 by ranking: hosts Leg 2) vs Pot B (remaining 11: hosts Leg 1)
  const sortedR1 = [...r1All.slice(0, 22)].sort(
    (a, b) => getClubRankingScore(clubsMap.get(b)) - getClubRankingScore(clubsMap.get(a))
  );
  const potA = sortedR1.slice(0, 11);
  const potB = sortedR1.slice(11, 22).reverse();

  // Swap Pot B entries when possible to avoid same-country ties in Round One
  for (let i = 0; i < potA.length; i++) {
    const cA = clubsMap.get(potA[i])?.country;
    const cB = clubsMap.get(potB[i])?.country;
    if (cA && cA === cB) {
      const swapIdx = potB.findIndex(
        (cand, idx) =>
          idx !== i &&
          clubsMap.get(cand)?.country !== cA &&
          clubsMap.get(potB[i])?.country !== clubsMap.get(potA[idx])?.country
      );
      if (swapIdx >= 0) {
        const tmp = potB[i];
        potB[i] = potB[swapIdx];
        potB[swapIdx] = tmp;
      }
    }
  }

  // Map pairs so Pot B hosts Ida (home) and Pot A hosts Volta (away in Leg 1, home in Leg 2)
  const round1Pairs: Array<[string, string]> = potA.map((teamA, idx) => [potB[idx], teamA]);

  return {
    byeR16Ids,
    round1Pairs,
    allParticipants: [...byeR16Ids, ...round1Pairs.flatMap(([a, b]) => [a, b])],
  };
}

function getClubStadium(clubsMap: Map<string, Club>, clubId: string, fallback: string): string {
  if (!clubId || clubId.startsWith('TBD')) return fallback;
  return clubsMap.get(clubId)?.stadium.name || fallback;
}

/**
 * Generates all 51 fixtures of the Copa dos Campeões da CONCACAF (Feb–May every year):
 * - Primeira Rodada: 11 confrontos ida e volta (22 clubes -> 11 vencedores)
 * - Oitavas de Final: 8 confrontos ida e volta (11 vencedores R1 + 5 pré-classificados)
 * - Quartas de Final: 4 confrontos ida e volta
 * - Semifinais: 2 confrontos ida e volta
 * - Grande Final: Jogo Único em Maio
 */
export function generateConcacafChampionsFixtures(
  rawClubs: Club[],
  year: number = 2026,
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>,
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>
): {
  fixtures: Fixture[];
  plan: ConcacafQualificationPlan;
} {
  const allClubs = withWorldGuestClubs(rawClubs);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));
  const plan = selectConcacafChampionsParticipants(
    allClubs,
    year,
    standingsWorldLeagues,
    fixturesWorldLeagues
  );

  const fixtures: Fixture[] = [];

  const northBlockedDates = new Set<string>();
  for (const leagueId of ['usa_mls', 'mex_ligamx', 'can_cpl'] as const) {
    for (const f of fixturesWorldLeagues?.[leagueId] || []) {
      if (f.date) northBlockedDates.add(f.date);
    }
  }

  const pickCleanDate = (preferred: string, minExclusiveDate: string = ''): string => {
    const offsets = [0, 1, -1, 2, -2, 7, -7, 8, -8, 6, -6, 14];
    for (const off of offsets) {
      const cand = off === 0 ? preferred : addDays(preferred, off);
      if (minExclusiveDate && cand <= minExclusiveDate) continue;
      if (!northBlockedDates.has(cand) && !isDateInFifaPause(cand)) {
        return cand;
      }
    }
    return preferred;
  };

  const r1IdaDate = pickCleanDate(`${year}-02-10`);
  const r1VoltaDate = pickCleanDate(`${year}-02-17`, r1IdaDate);
  const r16IdaDate = pickCleanDate(`${year}-03-03`, r1VoltaDate);
  const r16VoltaDate = pickCleanDate(`${year}-03-10`, r16IdaDate);
  const qfIdaDate = pickCleanDate(`${year}-04-07`, r16VoltaDate);
  const qfVoltaDate = pickCleanDate(`${year}-04-14`, qfIdaDate);
  const sfIdaDate = pickCleanDate(`${year}-04-28`, qfVoltaDate);
  const sfVoltaDate = pickCleanDate(`${year}-05-05`, sfIdaDate);
  const finalDate = pickCleanDate(`${year}-05-23`, sfVoltaDate);

  // 1. Primeira Rodada (11 ties = 22 matches)
  plan.round1Pairs.forEach(([homeId, awayId], idx) => {
    fixtures.push({
      id: `conc_r1_m${idx}_ida`,
      round: 1,
      competition: 'concacaf_champions',
      cupPhase: 'Primeira Rodada',
      leg: 1,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: r1IdaDate,
      time: '20:00',
      stadiumName: getClubStadium(clubsMap, homeId, 'Estádio CONCACAF'),
    });
    fixtures.push({
      id: `conc_r1_m${idx}_volta`,
      round: 1,
      competition: 'concacaf_champions',
      cupPhase: 'Primeira Rodada',
      leg: 2,
      homeTeamId: awayId,
      awayTeamId: homeId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: r1VoltaDate,
      time: '20:00',
      stadiumName: getClubStadium(clubsMap, awayId, 'Estádio CONCACAF'),
    });
  });

  // 2. Oitavas de Final (8 ties = 16 matches: 5 Byes + 11 Round One winners)
  const [bye0, bye1, bye2, bye3, bye4] = plan.byeR16Ids;
  const r16Pairings: Array<[string, string]> = [
    ['TBD_CONCACAF_R1_W10', bye0 || 'TBD_CONCACAF_BYE0'], // Mex 1 (Toluca) hosts Leg 2
    ['TBD_CONCACAF_R1_W8', 'TBD_CONCACAF_R1_W9'],
    ['TBD_CONCACAF_R1_W0', bye1 || 'TBD_CONCACAF_BYE1'],  // MLS Cup (Inter Miami) hosts Leg 2
    ['TBD_CONCACAF_R1_W1', 'TBD_CONCACAF_R1_W2'],
    ['TBD_CONCACAF_R1_W7', bye2 || 'TBD_CONCACAF_BYE2'],  // Leagues Cup / Shield (Seattle) hosts Leg 2
    ['TBD_CONCACAF_R1_W5', 'TBD_CONCACAF_R1_W6'],
    ['TBD_CONCACAF_R1_W4', bye3 || 'TBD_CONCACAF_BYE3'],  // Central America (Alajuelense) hosts Leg 2
    ['TBD_CONCACAF_R1_W3', bye4 || 'TBD_CONCACAF_BYE4'],  // Caribbean (Mount Pleasant) hosts Leg 2
  ];

  r16Pairings.forEach(([slotA, slotB], idx) => {
    fixtures.push({
      id: `conc_r16_m${idx}_ida`,
      round: 2,
      competition: 'concacaf_champions',
      cupPhase: 'Oitavas de Final',
      leg: 1,
      homeTeamId: slotA,
      awayTeamId: slotB,
      homeScore: null,
      awayScore: null,
      played: false,
      date: r16IdaDate,
      time: '20:00',
      stadiumName: getClubStadium(clubsMap, slotA, 'Estádio a definir'),
    });
    fixtures.push({
      id: `conc_r16_m${idx}_volta`,
      round: 2,
      competition: 'concacaf_champions',
      cupPhase: 'Oitavas de Final',
      leg: 2,
      homeTeamId: slotB,
      awayTeamId: slotA,
      homeScore: null,
      awayScore: null,
      played: false,
      date: r16VoltaDate,
      time: '20:00',
      stadiumName: getClubStadium(clubsMap, slotB, 'Estádio a definir'),
    });
  });

  // 3. Quartas de Final (4 ties = 8 matches)
  for (let q = 0; q < 4; q++) {
    const slotA = `TBD_CONCACAF_R16_W${q * 2}`;
    const slotB = `TBD_CONCACAF_R16_W${q * 2 + 1}`;
    fixtures.push({
      id: `conc_qf_m${q}_ida`,
      round: 3,
      competition: 'concacaf_champions',
      cupPhase: 'Quartas de Final',
      leg: 1,
      homeTeamId: slotA,
      awayTeamId: slotB,
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfIdaDate,
      time: '20:30',
      stadiumName: 'Estádio a definir',
    });
    fixtures.push({
      id: `conc_qf_m${q}_volta`,
      round: 3,
      competition: 'concacaf_champions',
      cupPhase: 'Quartas de Final',
      leg: 2,
      homeTeamId: slotB,
      awayTeamId: slotA,
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfVoltaDate,
      time: '20:30',
      stadiumName: 'Estádio a definir',
    });
  }

  // 4. Semifinais (2 ties = 4 matches)
  for (let s = 0; s < 2; s++) {
    const slotA = `TBD_CONCACAF_QF_W${s * 2}`;
    const slotB = `TBD_CONCACAF_QF_W${s * 2 + 1}`;
    fixtures.push({
      id: `conc_sf_m${s}_ida`,
      round: 4,
      competition: 'concacaf_champions',
      cupPhase: 'Semifinais',
      leg: 1,
      homeTeamId: slotA,
      awayTeamId: slotB,
      homeScore: null,
      awayScore: null,
      played: false,
      date: sfIdaDate,
      time: '21:00',
      stadiumName: 'Estádio a definir',
    });
    fixtures.push({
      id: `conc_sf_m${s}_volta`,
      round: 4,
      competition: 'concacaf_champions',
      cupPhase: 'Semifinais',
      leg: 2,
      homeTeamId: slotB,
      awayTeamId: slotA,
      homeScore: null,
      awayScore: null,
      played: false,
      date: sfVoltaDate,
      time: '21:00',
      stadiumName: 'Estádio a definir',
    });
  }

  // 5. Grande Final (Jogo Único em Maio)
  fixtures.push({
    id: 'conc_final',
    round: 5,
    competition: 'concacaf_champions',
    cupPhase: 'Grande Final da Concacaf Champions Cup',
    homeTeamId: 'TBD_CONCACAF_SF_W0',
    awayTeamId: 'TBD_CONCACAF_SF_W1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: finalDate,
    time: '20:00',
    stadiumName: 'Estádio Sede da Final CONCACAF',
  });

  return { fixtures, plan };
}

/**
 * Resolves the winner of a CONCACAF Champions Cup tie using aggregate score,
 * official away-goals tiebreaker (Gols Fora), and penalties if still level.
 */
export function resolveConcacafTieWinner(
  leg1?: Fixture,
  leg2OrSingle?: Fixture
): string | null {
  if (!leg2OrSingle || !leg2OrSingle.played) return null;

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
    const teamA = leg1.homeTeamId; // hosts Leg 1, plays away in Leg 2
    const teamB = leg1.awayTeamId; // plays away in Leg 1, hosts Leg 2
    const teamA_AwayGoals = leg2OrSingle.awayScore || 0;
    const teamB_AwayGoals = leg1.awayScore || 0;
    const goalsA = (leg1.homeScore || 0) + teamA_AwayGoals;
    const goalsB = teamB_AwayGoals + (leg2OrSingle.homeScore || 0);

    if (goalsA > goalsB) return teamA;
    if (goalsB > goalsA) return teamB;

    // Regra oficial do Gol Fora de Casa na Concacaf Champions Cup
    if (teamA_AwayGoals > teamB_AwayGoals) return teamA;
    if (teamB_AwayGoals > teamA_AwayGoals) return teamB;

    return teamB;
  }

  const h = leg2OrSingle.homeScore || 0;
  const a = leg2OrSingle.awayScore || 0;
  return h >= a ? leg2OrSingle.homeTeamId : leg2OrSingle.awayTeamId;
}

/**
 * Synchronizes all 5 phases of the Concacaf Champions Cup bracket dynamically.
 */
export function syncConcacafChampionsBracket(
  fixtures: Fixture[],
  rawClubs: Club[] = []
): Fixture[] {
  if (!fixtures || fixtures.length === 0) return fixtures;
  const allClubs = withWorldGuestClubs(rawClubs);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));

  let list = [...fixtures];
  const getFix = (id: string) => list.find((f) => f.id === id);

  const updateTwoLegs = (
    idaId: string,
    voltaId: string,
    slotA?: string | null,
    slotB?: string | null
  ) => {
    list = list.map((f) => {
      if (f.id === idaId && !f.played) {
        const nextHome = slotA && !slotA.startsWith('TBD') ? slotA : f.homeTeamId;
        const nextAway = slotB && !slotB.startsWith('TBD') ? slotB : f.awayTeamId;
        return {
          ...f,
          homeTeamId: nextHome,
          awayTeamId: nextAway,
          stadiumName: getClubStadium(clubsMap, nextHome, f.stadiumName || 'Estádio CONCACAF'),
        };
      }
      if (f.id === voltaId && !f.played) {
        const nextHome = slotB && !slotB.startsWith('TBD') ? slotB : f.homeTeamId;
        const nextAway = slotA && !slotA.startsWith('TBD') ? slotA : f.awayTeamId;
        return {
          ...f,
          homeTeamId: nextHome,
          awayTeamId: nextAway,
          stadiumName: getClubStadium(clubsMap, nextHome, f.stadiumName || 'Estádio CONCACAF'),
        };
      }
      return f;
    });
  };

  // Resolve 11 Primeira Rodada winners
  const r1Winners: Array<string | null> = [];
  for (let i = 0; i < 11; i++) {
    r1Winners.push(
      resolveConcacafTieWinner(getFix(`conc_r1_m${i}_ida`), getFix(`conc_r1_m${i}_volta`))
    );
  }

  // Assign into Oitavas de Final slots (11 R1 winners + 5 pre-seeded Byes)
  updateTwoLegs('conc_r16_m0_ida', 'conc_r16_m0_volta', r1Winners[10], undefined);
  updateTwoLegs('conc_r16_m1_ida', 'conc_r16_m1_volta', r1Winners[8], r1Winners[9]);
  updateTwoLegs('conc_r16_m2_ida', 'conc_r16_m2_volta', r1Winners[0], undefined);
  updateTwoLegs('conc_r16_m3_ida', 'conc_r16_m3_volta', r1Winners[1], r1Winners[2]);
  updateTwoLegs('conc_r16_m4_ida', 'conc_r16_m4_volta', r1Winners[7], undefined);
  updateTwoLegs('conc_r16_m5_ida', 'conc_r16_m5_volta', r1Winners[5], r1Winners[6]);
  updateTwoLegs('conc_r16_m6_ida', 'conc_r16_m6_volta', r1Winners[4], undefined);
  updateTwoLegs('conc_r16_m7_ida', 'conc_r16_m7_volta', r1Winners[3], undefined);

  // Oitavas -> Quartas
  for (let q = 0; q < 4; q++) {
    const w1 = resolveConcacafTieWinner(
      getFix(`conc_r16_m${q * 2}_ida`),
      getFix(`conc_r16_m${q * 2}_volta`)
    );
    const w2 = resolveConcacafTieWinner(
      getFix(`conc_r16_m${q * 2 + 1}_ida`),
      getFix(`conc_r16_m${q * 2 + 1}_volta`)
    );
    updateTwoLegs(`conc_qf_m${q}_ida`, `conc_qf_m${q}_volta`, w1, w2);
  }

  // Quartas -> Semifinais
  for (let s = 0; s < 2; s++) {
    const w1 = resolveConcacafTieWinner(
      getFix(`conc_qf_m${s * 2}_ida`),
      getFix(`conc_qf_m${s * 2}_volta`)
    );
    const w2 = resolveConcacafTieWinner(
      getFix(`conc_qf_m${s * 2 + 1}_ida`),
      getFix(`conc_qf_m${s * 2 + 1}_volta`)
    );
    updateTwoLegs(`conc_sf_m${s}_ida`, `conc_sf_m${s}_volta`, w1, w2);
  }

  // Semifinais -> Grande Final (Jogo Único)
  const fin1 = resolveConcacafTieWinner(getFix('conc_sf_m0_ida'), getFix('conc_sf_m0_volta'));
  const fin2 = resolveConcacafTieWinner(getFix('conc_sf_m1_ida'), getFix('conc_sf_m1_volta'));

  list = list.map((f) => {
    if (f.id !== 'conc_final' || f.played) return f;
    const nextHome = fin1 && !fin1.startsWith('TBD') ? fin1 : f.homeTeamId;
    const nextAway = fin2 && !fin2.startsWith('TBD') ? fin2 : f.awayTeamId;
    const hostClub = !nextHome.startsWith('TBD') ? clubsMap.get(nextHome) : undefined;
    return {
      ...f,
      homeTeamId: nextHome,
      awayTeamId: nextAway,
      stadiumName: hostClub ? `${hostClub.stadium.name} (Final Única CONCACAF)` : f.stadiumName,
    };
  });

  return list;
}

import { Club, Fixture, Standing, WorldLeagueId } from '../types/game';
import {
  AFC_CENTRALIZED_SAUDI_VENUES,
  AFC_EAST_GUEST_CLUBS,
  AFC_WEST_GUEST_CLUBS,
  INITIAL_AFC_EAST_2026_IDS,
  INITIAL_AFC_WEST_2026_IDS,
} from '../data/afcChampionsData';
import { getAfcChampionsCalendarDates } from './calendarUtils';
import { withWorldGuestClubs } from './intercontinentalEngine';
import { getClubWorldLeagueId } from './worldLeaguesEngine';

export const CURRENT_AFC_CHAMPIONS_2026_VERSION = 1;

export interface AfcQualificationPlan {
  westClubIds: string[]; // Exactly 16 clubs
  eastClubIds: string[]; // Exactly 16 clubs
  allParticipants: string[]; // Exactly 32 clubs
}

function getClubStrengthScore(club?: Club): number {
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

function sortStandingsOrder(rows: Standing[], clubsMap: Map<string, Club>): string[] {
  return [...rows]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return getClubStrengthScore(clubsMap.get(b.teamId)) - getClubStrengthScore(clubsMap.get(a.teamId));
    })
    .map((r) => r.teamId);
}

/**
 * Computes the 32 qualified clubs (16 Conferência Oeste + 16 Conferência Leste)
 * for AFC Champions League Elite (`afc_champions`):
 * - 2026–27: Exact 32 inaugural participants (5 Saudi + 11 West guests; 5 Japan + 11 East guests)
 * - 2027–28+: 5 from Saudi Pro League + 4 from Russian Premier League + 7 West guests (Oeste = 16);
 *             5 from J1 League + 11 East guests (Leste = 16).
 */
export function selectAfcChampionsParticipants(
  rawClubs: Club[],
  seasonYear: number = 2026,
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>,
  titleHolderId?: string | null
): AfcQualificationPlan {
  const allClubs = withWorldGuestClubs(rawClubs);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));

  const hasFinishedSplitStandings = Boolean(
    standingsWorldLeagues?.sau_pro?.some((s) => s.played >= 15) &&
      standingsWorldLeagues?.jpn_j1?.some((s) => s.played >= 15) &&
      standingsWorldLeagues?.rus_premier?.some((s) => s.played >= 15)
  );

  if (seasonYear === 2026 && !hasFinishedSplitStandings) {
    const west = INITIAL_AFC_WEST_2026_IDS.filter((id) => clubsMap.has(id));
    const east = INITIAL_AFC_EAST_2026_IDS.filter((id) => clubsMap.has(id));
    if (west.length === 16 && east.length === 16) {
      return {
        westClubIds: west,
        eastClubIds: east,
        allParticipants: [...west, ...east],
      };
    }
  }

  const getOrderedLeagueIds = (leagueId: WorldLeagueId): string[] => {
    const fromTable = sortStandingsOrder(standingsWorldLeagues?.[leagueId] || [], clubsMap);
    const fallback = allClubs
      .filter((c) => getClubWorldLeagueId(c) === leagueId)
      .sort((a, b) => getClubStrengthScore(b) - getClubStrengthScore(a))
      .map((c) => c.id);
    return Array.from(new Set([...fromTable, ...fallback]));
  };

  // West Conference (16 clubs): Saudi (5) + Russia (4) + West Guests (7)
  const sauOrdered = getOrderedLeagueIds('sau_pro').slice(0, 5);
  const rusOrdered = getOrderedLeagueIds('rus_premier').slice(0, 4);
  const westGuestsPool = AFC_WEST_GUEST_CLUBS.map((c) => c.id).filter((id) => clubsMap.has(id));

  const westSet = new Set<string>([...sauOrdered, ...rusOrdered]);

  // Preserve defending AFC champion if from West and not already qualified
  if (
    titleHolderId &&
    clubsMap.has(titleHolderId) &&
    !westSet.has(titleHolderId) &&
    (getClubWorldLeagueId(clubsMap.get(titleHolderId)) === 'sau_pro' ||
      getClubWorldLeagueId(clubsMap.get(titleHolderId)) === 'rus_premier' ||
      westGuestsPool.includes(titleHolderId))
  ) {
    westSet.add(titleHolderId);
  }

  for (const gId of westGuestsPool) {
    if (westSet.size >= 16) break;
    westSet.add(gId);
  }

  // East Conference (16 clubs): Japan (5) + East Guests (11)
  const jpnOrdered = getOrderedLeagueIds('jpn_j1').slice(0, 5);
  const eastGuestsPool = AFC_EAST_GUEST_CLUBS.map((c) => c.id).filter((id) => clubsMap.has(id));

  const eastSet = new Set<string>([...jpnOrdered]);
  if (
    titleHolderId &&
    clubsMap.has(titleHolderId) &&
    !westSet.has(titleHolderId) &&
    !eastSet.has(titleHolderId) &&
    (getClubWorldLeagueId(clubsMap.get(titleHolderId)) === 'jpn_j1' ||
      eastGuestsPool.includes(titleHolderId))
  ) {
    eastSet.add(titleHolderId);
  }

  for (const gId of eastGuestsPool) {
    if (eastSet.size >= 16) break;
    eastSet.add(gId);
  }

  const westClubIds = Array.from(westSet).slice(0, 16);
  const eastClubIds = Array.from(eastSet).slice(0, 16);

  return {
    westClubIds,
    eastClubIds,
    allParticipants: [...westClubIds, ...eastClubIds],
  };
}

/**
 * Generates an 8-round League Phase schedule for a 16-club conference where:
 * - Every club plays 8 distinct opponents within its conference
 * - Every club plays EXACTLY 4 matches at home and 4 matches away (guaranteed via Eulerian orientation)
 */
export function buildBalancedEightRoundConferenceFixtures(
  teamIds: string[],
  conferenceLabel: 'Conferência Oeste' | 'Conferência Leste',
  confKey: 'west' | 'east',
  seasonYear: number,
  leagueDates: string[],
  clubsMap: Map<string, Club>
): Fixture[] {
  const n = teamIds.length; // 16
  if (n !== 16) return [];

  interface UndirectedMatch {
    id: number;
    roundIdx: number; // 0..7
    u: number;
    v: number;
  }

  const matches: UndirectedMatch[] = [];
  const adj: number[][] = Array.from({ length: n }, () => []);

  // Rounds 0..7 from 16-team Berger circle pairing guarantee 8 distinct opponents per club
  for (let r = 0; r < 8; r++) {
    const addEdge = (a: number, b: number) => {
      const edgeId = matches.length;
      matches.push({ id: edgeId, roundIdx: r, u: a, v: b });
      adj[a].push(edgeId);
      adj[b].push(edgeId);
    };

    // Anchor match with team 15
    addEdge(15, r);
    // Remaining 7 pairs
    for (let m = 1; m < 8; m++) {
      const t1 = (r + m) % 15;
      const t2 = (r - m + 15) % 15;
      addEdge(t1, t2);
    }
  }

  // Hierholzer's Eulerian circuit guarantees exact in-degree = out-degree = 4 for every team!
  const usedEdge = new Array<boolean>(matches.length).fill(false);
  const homeIdxByMatch = new Array<number>(matches.length).fill(0);
  const awayIdxByMatch = new Array<number>(matches.length).fill(0);
  const adjPtr = new Array<number>(n).fill(0);

  for (let start = 0; start < n; start++) {
    while (adjPtr[start] < adj[start].length && usedEdge[adj[start][adjPtr[start]]]) {
      adjPtr[start]++;
    }
    if (adjPtr[start] >= adj[start].length) continue;

    const stack: Array<{ node: number; viaEdge: number | null }> = [
      { node: start, viaEdge: null },
    ];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const u = top.node;
      while (adjPtr[u] < adj[u].length && usedEdge[adj[u][adjPtr[u]]]) {
        adjPtr[u]++;
      }
      if (adjPtr[u] < adj[u].length) {
        const edgeId = adj[u][adjPtr[u]++];
        usedEdge[edgeId] = true;
        const edge = matches[edgeId];
        const nextNode = edge.u === u ? edge.v : edge.u;
        stack.push({ node: nextNode, viaEdge: edgeId });
      } else {
        const popped = stack.pop()!;
        if (popped.viaEdge !== null && stack.length > 0) {
          const prevNode = stack[stack.length - 1].node;
          // Direct edge from prevNode (Home) -> popped.node (Away)
          homeIdxByMatch[popped.viaEdge] = prevNode;
          awayIdxByMatch[popped.viaEdge] = popped.node;
        }
      }
    }
  }

  const fixtures: Fixture[] = [];
  matches.forEach((m, idx) => {
    const homeTeamId = teamIds[homeIdxByMatch[idx]];
    const awayTeamId = teamIds[awayIdxByMatch[idx]];
    const round = m.roundIdx + 1;
    const matchInRound = idx % 8;
    fixtures.push({
      id: `afc_${seasonYear}_${confKey}_r${round}_m${matchInRound}`,
      round,
      competition: 'afc_champions',
      cupPhase: `Fase de Liga · Rodada ${round}`,
      groupName: conferenceLabel,
      homeTeamId,
      awayTeamId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: leagueDates[m.roundIdx] || leagueDates[leagueDates.length - 1],
      time: confKey === 'west' ? '15:00' : '08:30',
      stadiumName: clubsMap.get(homeTeamId)?.stadium.name || 'Estádio Asiático',
    });
  });

  return fixtures;
}

/**
 * Generates the complete AFC Champions League Elite (`afc_champions`) season:
 * - 32 clubs in Conferência Oeste (16) and Conferência Leste (16)
 * - 8 League Phase rounds (exact 4 home + 4 away vs 8 distinct conference rivals)
 * - Oitavas de Final (Ida e Volta within each conference)
 * - Quartas de Final, Semifinal e Grande Final (Jogo único centralizado na Arábia Saudita, Final 1º de Maio)
 */
export function generateAfcChampionsFixtures(
  rawClubs: Club[],
  seasonYear: number = 2026,
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>,
  titleHolderId?: string | null
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const allClubs = withWorldGuestClubs(rawClubs);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));
  const plan = selectAfcChampionsParticipants(
    allClubs,
    seasonYear,
    standingsWorldLeagues,
    titleHolderId
  );

  const cal = getAfcChampionsCalendarDates(seasonYear);

  const standings: Standing[] = [
    ...plan.westClubIds.map((teamId) => ({
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [] as ('V' | 'E' | 'D')[],
      group: 'Conferência Oeste',
    })),
    ...plan.eastClubIds.map((teamId) => ({
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [] as ('V' | 'E' | 'D')[],
      group: 'Conferência Leste',
    })),
  ];

  const westFixtures = buildBalancedEightRoundConferenceFixtures(
    plan.westClubIds,
    'Conferência Oeste',
    'west',
    seasonYear,
    cal.leagueDates,
    clubsMap
  );

  const eastFixtures = buildBalancedEightRoundConferenceFixtures(
    plan.eastClubIds,
    'Conferência Leste',
    'east',
    seasonYear,
    cal.leagueDates,
    clubsMap
  );

  // Oitavas de Final (8 ties, Ida e Volta, Rounds 9 & 10)
  const r16TieSlots = [
    { key: 'w1', groupName: 'Oitavas · Oeste' },
    { key: 'w2', groupName: 'Oitavas · Oeste' },
    { key: 'w3', groupName: 'Oitavas · Oeste' },
    { key: 'w4', groupName: 'Oitavas · Oeste' },
    { key: 'e1', groupName: 'Oitavas · Leste' },
    { key: 'e2', groupName: 'Oitavas · Leste' },
    { key: 'e3', groupName: 'Oitavas · Leste' },
    { key: 'e4', groupName: 'Oitavas · Leste' },
  ];

  const r16Fixtures: Fixture[] = [];
  r16TieSlots.forEach((slot) => {
    r16Fixtures.push({
      id: `afc_r16_${slot.key}_1`,
      round: 9,
      competition: 'afc_champions',
      cupPhase: 'Oitavas de Final',
      groupName: slot.groupName,
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: cal.r16IdaDate,
      time: slot.key.startsWith('w') ? '15:00' : '08:30',
      stadiumName: 'A definir (Ida)',
    });
    r16Fixtures.push({
      id: `afc_r16_${slot.key}_2`,
      round: 10,
      competition: 'afc_champions',
      cupPhase: 'Oitavas de Final',
      groupName: slot.groupName,
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: cal.r16VoltaDate,
      time: slot.key.startsWith('w') ? '15:00' : '08:30',
      stadiumName: 'A definir (Volta)',
    });
  });

  // Quartas de Final (Round 11, Jogo Único centralizado na Arábia Saudita)
  const qfFixtures: Fixture[] = [0, 1, 2, 3].map((idx) => ({
    id: `afc_qf_${idx + 1}`,
    round: 11,
    competition: 'afc_champions',
    cupPhase: 'Quartas de Final',
    groupName: 'Sede Centralizada (Arábia Saudita)',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: cal.qfDate,
    time: idx % 2 === 0 ? '13:30' : '16:30',
    stadiumName: AFC_CENTRALIZED_SAUDI_VENUES[idx % AFC_CENTRALIZED_SAUDI_VENUES.length],
  }));

  // Semifinal (Round 12, Jogo Único centralizado na Arábia Saudita)
  const sfFixtures: Fixture[] = [0, 1].map((idx) => ({
    id: `afc_sf_${idx + 1}`,
    round: 12,
    competition: 'afc_champions',
    cupPhase: 'Semifinal',
    groupName: 'Sede Centralizada (Arábia Saudita)',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: cal.sfDate,
    time: '15:30',
    stadiumName: AFC_CENTRALIZED_SAUDI_VENUES[idx],
  }));

  // Grande Final (Round 13, Jogo Único em 1º de Maio na Arábia Saudita)
  const finalFixture: Fixture = {
    id: 'afc_final',
    round: 13,
    competition: 'afc_champions',
    cupPhase: 'Grande Final',
    groupName: 'Final em Jeddah (Arábia Saudita)',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: cal.finalDate,
    time: '15:30',
    stadiumName: AFC_CENTRALIZED_SAUDI_VENUES[0],
  };

  return {
    fixtures: [...westFixtures, ...eastFixtures, ...r16Fixtures, ...qfFixtures, ...sfFixtures, finalFixture],
    standings,
  };
}

export function resolveAfcSingleMatchWinner(f?: Fixture): string | null {
  if (!f || !f.played || f.homeTeamId === 'tbd' || f.awayTeamId === 'tbd') return null;
  if (f.aggregateWinnerId) return f.aggregateWinnerId;
  const hs = f.homeScore ?? 0;
  const as = f.awayScore ?? 0;
  if (hs > as) return f.homeTeamId;
  if (as > hs) return f.awayTeamId;
  if (typeof f.penaltiesHome === 'number' && typeof f.penaltiesAway === 'number') {
    if (f.penaltiesHome > f.penaltiesAway) return f.homeTeamId;
    if (f.penaltiesAway > f.penaltiesHome) return f.awayTeamId;
  }
  return f.homeTeamId;
}

export function resolveAfcTwoLegWinner(leg1?: Fixture, leg2?: Fixture): string | null {
  if (!leg1?.played || !leg2?.played) return null;
  if (leg2.aggregateWinnerId) return leg2.aggregateWinnerId;
  const t1 = leg1.awayTeamId; // Higher seed (hosts Leg 2)
  const t2 = leg1.homeTeamId;
  const s1 = (leg1.awayScore ?? 0) + (leg2.homeScore ?? 0);
  const s2 = (leg1.homeScore ?? 0) + (leg2.awayScore ?? 0);
  if (s1 > s2) return t1;
  if (s2 > s1) return t2;
  if (typeof leg2.penaltiesHome === 'number' && typeof leg2.penaltiesAway === 'number') {
    if (leg2.penaltiesHome > leg2.penaltiesAway) return leg2.homeTeamId;
    if (leg2.penaltiesAway > leg2.penaltiesHome) return leg2.awayTeamId;
  }
  return t1;
}

/**
 * Populates R16 (West 1v8, 4v5, 2v7, 3v6; East 1v8, 4v5, 2v7, 3v6),
 * Cross-conference single-leg Quarterfinals (Saudi centralized), Semifinals, and Final.
 */
export function syncAfcChampionsBracket(
  fixtures: Fixture[],
  standings: Standing[],
  clubsMap: Map<string, Club>
): Fixture[] {
  if (fixtures.length === 0) return fixtures;

  const updated = fixtures.map((f) => ({ ...f }));
  const leagueFixtures = updated.filter((f) => f.round <= 8 && !f.leg);
  const allLeagueDone = leagueFixtures.length >= 128 && leagueFixtures.every((f) => f.played);

  if (allLeagueDone) {
    const westTable = standings.filter((s) => s.group === 'Conferência Oeste');
    const eastTable = standings.filter((s) => s.group === 'Conferência Leste');

    if (westTable.length >= 8 && eastTable.length >= 8) {
      const assignR16Pair = (key: string, lowerSeed: string, higherSeed: string) => {
        const leg1 = updated.find((f) => f.id === `afc_r16_${key}_1`);
        const leg2 = updated.find((f) => f.id === `afc_r16_${key}_2`);
        if (leg1 && leg1.homeTeamId === 'tbd') {
          leg1.homeTeamId = lowerSeed;
          leg1.awayTeamId = higherSeed;
          leg1.stadiumName = clubsMap.get(lowerSeed)?.stadium.name || leg1.stadiumName;
        }
        if (leg2 && leg2.homeTeamId === 'tbd') {
          leg2.homeTeamId = higherSeed;
          leg2.awayTeamId = lowerSeed;
          leg2.stadiumName = clubsMap.get(higherSeed)?.stadium.name || leg2.stadiumName;
        }
      };

      // West bracket: (1v8 vs E4v5 side) & (2v7 vs E3v6 side)
      assignR16Pair('w1', westTable[7].teamId, westTable[0].teamId);
      assignR16Pair('w2', westTable[4].teamId, westTable[3].teamId);
      assignR16Pair('w3', westTable[6].teamId, westTable[1].teamId);
      assignR16Pair('w4', westTable[5].teamId, westTable[2].teamId);

      // East bracket
      assignR16Pair('e1', eastTable[7].teamId, eastTable[0].teamId);
      assignR16Pair('e2', eastTable[4].teamId, eastTable[3].teamId);
      assignR16Pair('e3', eastTable[6].teamId, eastTable[1].teamId);
      assignR16Pair('e4', eastTable[5].teamId, eastTable[2].teamId);
    }
  }

  // Advance Oitavas -> Quartas (Cross-conference single-leg in Saudi Arabia)
  const w1 = resolveAfcTwoLegWinner(
    updated.find((f) => f.id === 'afc_r16_w1_1'),
    updated.find((f) => f.id === 'afc_r16_w1_2')
  );
  const w2 = resolveAfcTwoLegWinner(
    updated.find((f) => f.id === 'afc_r16_w2_1'),
    updated.find((f) => f.id === 'afc_r16_w2_2')
  );
  const w3 = resolveAfcTwoLegWinner(
    updated.find((f) => f.id === 'afc_r16_w3_1'),
    updated.find((f) => f.id === 'afc_r16_w3_2')
  );
  const w4 = resolveAfcTwoLegWinner(
    updated.find((f) => f.id === 'afc_r16_w4_1'),
    updated.find((f) => f.id === 'afc_r16_w4_2')
  );
  const e1 = resolveAfcTwoLegWinner(
    updated.find((f) => f.id === 'afc_r16_e1_1'),
    updated.find((f) => f.id === 'afc_r16_e1_2')
  );
  const e2 = resolveAfcTwoLegWinner(
    updated.find((f) => f.id === 'afc_r16_e2_1'),
    updated.find((f) => f.id === 'afc_r16_e2_2')
  );
  const e3 = resolveAfcTwoLegWinner(
    updated.find((f) => f.id === 'afc_r16_e3_1'),
    updated.find((f) => f.id === 'afc_r16_e3_2')
  );
  const e4 = resolveAfcTwoLegWinner(
    updated.find((f) => f.id === 'afc_r16_e4_1'),
    updated.find((f) => f.id === 'afc_r16_e4_2')
  );

  const qfPairs: Array<[string, string | null, string | null]> = [
    ['afc_qf_1', w1, e2],
    ['afc_qf_2', e3, w4],
    ['afc_qf_3', e1, w2],
    ['afc_qf_4', w3, e4],
  ];

  qfPairs.forEach(([qfId, teamA, teamB]) => {
    const qf = updated.find((f) => f.id === qfId);
    if (qf && qf.homeTeamId === 'tbd' && teamA && teamB) {
      qf.homeTeamId = teamA;
      qf.awayTeamId = teamB;
    }
  });

  // Advance Quartas -> Semifinal (Single-leg centralized in Saudi Arabia)
  const qf1W = resolveAfcSingleMatchWinner(updated.find((f) => f.id === 'afc_qf_1'));
  const qf2W = resolveAfcSingleMatchWinner(updated.find((f) => f.id === 'afc_qf_2'));
  const qf3W = resolveAfcSingleMatchWinner(updated.find((f) => f.id === 'afc_qf_3'));
  const qf4W = resolveAfcSingleMatchWinner(updated.find((f) => f.id === 'afc_qf_4'));

  const sf1 = updated.find((f) => f.id === 'afc_sf_1');
  if (sf1 && sf1.homeTeamId === 'tbd' && qf1W && qf2W) {
    sf1.homeTeamId = qf1W;
    sf1.awayTeamId = qf2W;
  }

  const sf2 = updated.find((f) => f.id === 'afc_sf_2');
  if (sf2 && sf2.homeTeamId === 'tbd' && qf3W && qf4W) {
    sf2.homeTeamId = qf3W;
    sf2.awayTeamId = qf4W;
  }

  // Advance Semifinal -> Grande Final (1º de Maio)
  const sf1W = resolveAfcSingleMatchWinner(sf1);
  const sf2W = resolveAfcSingleMatchWinner(sf2);
  const fin = updated.find((f) => f.id === 'afc_final');
  if (fin && fin.homeTeamId === 'tbd' && sf1W && sf2W) {
    fin.homeTeamId = sf1W;
    fin.awayTeamId = sf2W;
  }

  return updated;
}

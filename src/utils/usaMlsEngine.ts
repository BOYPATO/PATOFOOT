import { Club, Fixture, Standing } from '../types/game';
import {
  MLS_CONFERENCE_BY_CLUB_ID,
  MLS_CONFERENCE_GROUP_LABEL,
  MlsConference,
} from '../data/usaMls2026Data';
import {
  getConmebolContinentalScheduleDates,
  getSeasonFifaBlockedDatesSet,
} from './calendarUtils';

export const MLS_PLAYOFF_SLOT_LABELS: Record<string, string> = {
  TBD_MLS_E8: '8º Conf. Leste',
  TBD_MLS_E9: '9º Conf. Leste',
  TBD_MLS_W8: '8º Conf. Oeste',
  TBD_MLS_W9: '9º Conf. Oeste',
  TBD_MLS_E1: '1º Conf. Leste',
  TBD_MLS_E2: '2º Conf. Leste',
  TBD_MLS_E3: '3º Conf. Leste',
  TBD_MLS_E4: '4º Conf. Leste',
  TBD_MLS_E5: '5º Conf. Leste',
  TBD_MLS_E6: '6º Conf. Leste',
  TBD_MLS_E7: '7º Conf. Leste',
  TBD_MLS_W1: '1º Conf. Oeste',
  TBD_MLS_W2: '2º Conf. Oeste',
  TBD_MLS_W3: '3º Conf. Oeste',
  TBD_MLS_W4: '4º Conf. Oeste',
  TBD_MLS_W5: '5º Conf. Oeste',
  TBD_MLS_W6: '6º Conf. Oeste',
  TBD_MLS_W7: '7º Conf. Oeste',
  TBD_MLS_E_WC: 'Venc. Wild Card Leste',
  TBD_MLS_W_WC: 'Venc. Wild Card Oeste',
  TBD_MLS_E_R1S1: 'Venc. (1º x WC) Leste',
  TBD_MLS_E_R1S2: 'Venc. (4º x 5º) Leste',
  TBD_MLS_E_R1S3: 'Venc. (2º x 7º) Leste',
  TBD_MLS_E_R1S4: 'Venc. (3º x 6º) Leste',
  TBD_MLS_W_R1S1: 'Venc. (1º x WC) Oeste',
  TBD_MLS_W_R1S2: 'Venc. (4º x 5º) Oeste',
  TBD_MLS_W_R1S3: 'Venc. (2º x 7º) Oeste',
  TBD_MLS_W_R1S4: 'Venc. (3º x 6º) Oeste',
  TBD_MLS_E_SF1: 'Venc. Semifinal 1 Leste',
  TBD_MLS_E_SF2: 'Venc. Semifinal 2 Leste',
  TBD_MLS_W_SF1: 'Venc. Semifinal 1 Oeste',
  TBD_MLS_W_SF2: 'Venc. Semifinal 2 Oeste',
  TBD_MLS_CAMP_LESTE: 'Campeão Conf. Leste',
  TBD_MLS_CAMP_OESTE: 'Campeão Conf. Oeste',
  TBD_SERIE_2X0: 'Série decidida em 2–0',
};

export function getMlsPlayoffSlotLabel(id: string): string {
  return MLS_PLAYOFF_SLOT_LABELS[id] || 'A Definir';
}

export function isMlsSkippedBestOfThreeFixture(fixture: Fixture): boolean {
  return (
    fixture.competition === 'usa_mls' &&
    (fixture.homeTeamId === 'TBD_SERIE_2X0' || fixture.awayTeamId === 'TBD_SERIE_2X0')
  );
}

export function isMlsPlayoffFixture(fixture: Fixture): boolean {
  return fixture.competition === 'usa_mls' && fixture.id.includes('_po_');
}

function addDaysIso(startIso: string, daysToAdd: number): string {
  const [y, m, d] = startIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysToAdd));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

const MLS_ROUND_DATES_CACHE = new Map<number, string[]>();

function buildMlsRegularScheduleDates(seasonYear: number): string[] {
  const cached = MLS_ROUND_DATES_CACHE.get(seasonYear);
  if (cached) return cached;

  const conmebol = getConmebolContinentalScheduleDates(seasonYear);
  const blocked = getSeasonFifaBlockedDatesSet(seasonYear, 'south_america');

  // Block Copa Internacional (CONMEBOL) & Concacaf Champions Cup dates
  const externalDates = [
    ...conmebol.groupDates,
    conmebol.oitavasIdaDate,
    conmebol.oitavasVoltaDate,
    conmebol.quartasIdaDate,
    conmebol.quartasVoltaDate,
    conmebol.semiIdaDate,
    conmebol.semiVoltaDate,
    conmebol.sulamericanaFinalDate,
    conmebol.libertadoresFinalDate,
    `${seasonYear}-02-10`,
    `${seasonYear}-02-17`,
    `${seasonYear}-03-03`,
    `${seasonYear}-03-10`,
    `${seasonYear}-04-07`,
    `${seasonYear}-04-14`,
    `${seasonYear}-04-28`,
    `${seasonYear}-05-05`,
    `${seasonYear}-05-23`,
  ];
  for (const d of externalDates) blocked.add(d);

  // World Cup break window (May 25 .. Jul 16)
  let wcCur = `${seasonYear}-05-25`;
  const wcEnd = `${seasonYear}-07-16`;
  while (wcCur <= wcEnd) {
    blocked.add(wcCur);
    wcCur = addDaysIso(wcCur, 1);
  }

  const pickEvenly = (pool: string[], count: number): string[] => {
    if (pool.length <= count) return [...pool];
    const picked: string[] = [];
    const used = new Set<number>();
    for (let i = 0; i < count; i++) {
      let idx = Math.round((i * (pool.length - 1)) / Math.max(1, count - 1));
      while (used.has(idx) && idx + 1 < pool.length) idx++;
      used.add(idx);
      picked.push(pool[idx]);
    }
    return picked;
  };

  // Phase 1 (15 rounds): Feb 21 -> May 24
  const p1Weekends: string[] = [];
  const p1Midweeks: string[] = [];
  let c = `${seasonYear}-02-21`;
  while (c <= `${seasonYear}-05-24`) {
    if (!blocked.has(c)) {
      const dow = new Date(`${c}T12:00:00`).getDay();
      if (dow === 6 || (dow === 0 && !p1Weekends.includes(addDaysIso(c, -1)))) {
        p1Weekends.push(c);
      } else if (dow === 3) {
        p1Midweeks.push(c);
      }
    }
    c = addDaysIso(c, 1);
  }
  const p1Start = `${seasonYear}-02-21`;
  const p1InnerPool = p1Weekends.filter((d) => d !== p1Start);
  let p1Dates: string[] = [p1Start, ...p1InnerPool];
  if (p1Dates.length < 15) {
    const needed = 15 - p1Dates.length;
    p1Dates = [...p1Dates, ...pickEvenly(p1Midweeks, needed)].sort();
  } else if (p1Dates.length > 15) {
    p1Dates = [p1Start, ...pickEvenly(p1InnerPool, 14)];
  }

  // Phase 2 (19 rounds): Jul 18 -> Nov 7 (Decision Day)
  const p2Weekends: string[] = [];
  const p2Midweeks: string[] = [];
  c = `${seasonYear}-07-18`;
  while (c <= `${seasonYear}-11-07`) {
    if (!blocked.has(c)) {
      const dow = new Date(`${c}T12:00:00`).getDay();
      if (dow === 6) {
        p2Weekends.push(c);
      } else if (dow === 3) {
        p2Midweeks.push(c);
      }
    }
    c = addDaysIso(c, 1);
  }
  const p2End = `${seasonYear}-11-07`;
  const p2Core = p2Weekends.filter((d) => d !== p2End);
  let p2Dates: string[] = [];
  if (p2Core.length + 1 >= 19) {
    p2Dates = [...pickEvenly(p2Core, 18), p2End];
  } else {
    const neededMid = 19 - (p2Core.length + 1);
    p2Dates = [...p2Core, ...pickEvenly(p2Midweeks, neededMid), p2End].sort();
  }

  const all34 = [...p1Dates, ...p2Dates];
  MLS_ROUND_DATES_CACHE.set(seasonYear, all34);
  return all34;
}

/**
 * Computes exact date for MLS Regular Season Round (1..34):
 * - Abertura: 21/02
 * - Pausa Copa do Mundo: 25/05 a 16/07 (nenhum jogo entre essas datas!)
 * - Decision Day (Rodada 34): 07/11
 * - Sem colisões com Concacaf Champions Cup, Copa Internacional ou Datas FIFA!
 */
export function getMlsRegularRoundDate(round: number, seasonYear: number): string {
  const dates = buildMlsRegularScheduleDates(seasonYear);
  if (round >= 1 && round <= dates.length) {
    return dates[round - 1];
  }
  return `${seasonYear}-11-07`;
}

/**
 * Generates standard 15-team Berger single round-robin rounds (15 rounds of 7 matches + 1 bye team per round).
 */
function buildBerger15SingleHalf(teamIds: string[]): Array<{
  pairs: Array<[string, string]>;
  byeTeamId: string;
}> {
  const nWithDummy = 16;
  const dummy = '__BYE__';
  const ring = [...teamIds, dummy];
  const fixed = ring[nWithDummy - 1];
  const rot = ring.slice(0, nWithDummy - 1); // 15 items

  const rounds: Array<{ pairs: Array<[string, string]>; byeTeamId: string }> = [];

  for (let r = 0; r < 15; r++) {
    const cur = [rot[0], ...rot.slice(1)];
    const pairs: Array<[string, string]> = [];
    let byeTeamId = teamIds[0];

    for (let i = 0; i < nWithDummy / 2; i++) {
      const tA = i === 0 ? cur[0] : cur[i];
      const tB = i === 0 ? fixed : cur[nWithDummy - 1 - i];

      if (tA === dummy) {
        byeTeamId = tB;
      } else if (tB === dummy) {
        byeTeamId = tA;
      } else {
        const homeFirst = (r + i) % 2 === 0;
        pairs.push(homeFirst ? [tA, tB] : [tB, tA]);
      }
    }

    rounds.push({ pairs, byeTeamId });

    // Berger step: rotate right by 1
    const last = rot.pop()!;
    rot.unshift(last);
  }

  return rounds;
}

/**
 * Generates complete 2026 MLS season:
 * - 30 clubes (15 Conferência Leste + 15 Conferência Oeste)
 * - 34 rodadas regulares (28 intra-conferência + 6 interconferência = 17 casa + 17 fora por clube)
 * - Audi MLS Cup Playoffs completos (Wild Card 19/11, R1 Melhor de 3 22/11–02/12, Semis 06/12, Finais Conf. 12/12, MLS Cup 18/12)
 */
export function generateUsaMlsSeason(
  mlsClubs: Club[],
  seasonYear: number = 2026
): { fixtures: Fixture[]; standings: Standing[] } {
  const eastClubs: Club[] = [];
  const westClubs: Club[] = [];

  mlsClubs.forEach((c) => {
    const conf = MLS_CONFERENCE_BY_CLUB_ID[c.id];
    if (conf === 'Leste') eastClubs.push(c);
    else if (conf === 'Oeste') westClubs.push(c);
  });

  // Fallback balance if custom clubs exist
  mlsClubs.forEach((c) => {
    if (eastClubs.includes(c) || westClubs.includes(c)) return;
    if (eastClubs.length <= westClubs.length) eastClubs.push(c);
    else westClubs.push(c);
  });

  const east15 = eastClubs.slice(0, 15);
  const west15 = westClubs.slice(0, 15);

  if (east15.length < 15 || west15.length < 15) {
    return { fixtures: [], standings: [] };
  }

  const clubMap = new Map<string, Club>([...east15, ...west15].map((c) => [c.id, c]));
  const eastIds = east15.map((c) => c.id);
  const westIds = west15.map((c) => c.id);

  const eastHalf = buildBerger15SingleHalf(eastIds);
  const westHalf = buildBerger15SingleHalf(westIds);

  const fixtures: Fixture[] = [];

  // Rounds 1..30: 7 East intra + 7 West intra + 1 cross-conference bye pairing = 15 matches/round
  for (let r = 0; r < 15; r++) {
    const firstRound = r + 1;
    const secondRound = r + 16;
    const firstDate = getMlsRegularRoundDate(firstRound, seasonYear);
    const secondDate = getMlsRegularRoundDate(secondRound, seasonYear);

    const eRound = eastHalf[r];
    const wRound = westHalf[r];

    const firstHalfMatches: Array<[string, string]> = [
      ...eRound.pairs,
      ...wRound.pairs,
      [eRound.byeTeamId, wRound.byeTeamId],
    ];

    firstHalfMatches.forEach(([homeId, awayId], idx) => {
      fixtures.push({
        id: `usa_mls_${seasonYear}_r${firstRound}_m${idx}`,
        round: firstRound,
        competition: 'usa_mls',
        cupPhase: `${firstRound}ª Rodada · Temporada Regular`,
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeScore: null,
        awayScore: null,
        played: false,
        date: firstDate,
        time: idx % 3 === 0 ? '18:30' : idx % 3 === 1 ? '20:30' : '21:30',
        stadiumName: clubMap.get(homeId)?.stadium.name,
      });

      fixtures.push({
        id: `usa_mls_${seasonYear}_r${secondRound}_m${idx}`,
        round: secondRound,
        competition: 'usa_mls',
        cupPhase: `${secondRound}ª Rodada · Temporada Regular`,
        homeTeamId: awayId,
        awayTeamId: homeId,
        homeScore: null,
        awayScore: null,
        played: false,
        date: secondDate,
        time: idx % 3 === 0 ? '18:30' : idx % 3 === 1 ? '20:30' : '21:30',
        stadiumName: clubMap.get(awayId)?.stadium.name,
      });
    });
  }

  // Rounds 31..34: 4 pure cross-conference rounds (offsets 1, 2, 3, 4; zero collision with offset 0 bye pairing)
  const crossConfigs: Array<{ round: number; offset: number; eastHome: boolean }> = [
    { round: 31, offset: 1, eastHome: true },
    { round: 32, offset: 2, eastHome: false },
    { round: 33, offset: 3, eastHome: true },
    { round: 34, offset: 4, eastHome: false },
  ];

  crossConfigs.forEach(({ round, offset, eastHome }) => {
    const rDate = getMlsRegularRoundDate(round, seasonYear);
    const isDecisionDay = round === 34;

    for (let i = 0; i < 15; i++) {
      const eId = eastIds[i];
      const wId = westIds[(i + offset) % 15];
      const homeId = eastHome ? eId : wId;
      const awayId = eastHome ? wId : eId;

      fixtures.push({
        id: `usa_mls_${seasonYear}_r${round}_m${i}`,
        round,
        competition: 'usa_mls',
        cupPhase: isDecisionDay
          ? `34ª Rodada · Decision Day`
          : `${round}ª Rodada · Temporada Regular`,
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeScore: null,
        awayScore: null,
        played: false,
        date: rDate,
        time: isDecisionDay ? '19:00' : i % 2 === 0 ? '19:30' : '21:00',
        stadiumName: clubMap.get(homeId)?.stadium.name,
      });
    }
  });

  // Pre-seeded Audi MLS Cup Playoffs (Nov 19 – Dec 18)
  // 1) Wild Card (19/11)
  const pushPlayoff = (
    id: string,
    round: number,
    cupPhase: string,
    groupName: string,
    date: string,
    homeTeamId: string,
    awayTeamId: string,
    time = '21:00'
  ) => {
    fixtures.push({
      id,
      round,
      competition: 'usa_mls',
      cupPhase,
      groupName,
      homeTeamId,
      awayTeamId,
      homeScore: null,
      awayScore: null,
      played: false,
      date,
      time,
    });
  };

  pushPlayoff(
    'usa_mls_po_wc_east',
    35,
    'Wild Card (Repescagem) · Conferência Leste',
    'Conferência Leste',
    `${seasonYear}-11-19`,
    'TBD_MLS_E8',
    'TBD_MLS_E9',
    '19:30'
  );
  pushPlayoff(
    'usa_mls_po_wc_west',
    35,
    'Wild Card (Repescagem) · Conferência Oeste',
    'Conferência Oeste',
    `${seasonYear}-11-19`,
    'TBD_MLS_W8',
    'TBD_MLS_W9',
    '22:00'
  );

  // 2) Primeira Rodada — Série Melhor de 3 (4 séries por conferência x 3 jogos)
  const seriesTemplates: Array<{
    key: 's1' | 's2' | 's3' | 's4';
    eastHome: string;
    eastAway: string;
    westHome: string;
    westAway: string;
  }> = [
    {
      key: 's1',
      eastHome: 'TBD_MLS_E1',
      eastAway: 'TBD_MLS_E_WC',
      westHome: 'TBD_MLS_W1',
      westAway: 'TBD_MLS_W_WC',
    },
    {
      key: 's2',
      eastHome: 'TBD_MLS_E4',
      eastAway: 'TBD_MLS_E5',
      westHome: 'TBD_MLS_W4',
      westAway: 'TBD_MLS_W5',
    },
    {
      key: 's3',
      eastHome: 'TBD_MLS_E2',
      eastAway: 'TBD_MLS_E7',
      westHome: 'TBD_MLS_W2',
      westAway: 'TBD_MLS_W7',
    },
    {
      key: 's4',
      eastHome: 'TBD_MLS_E3',
      eastAway: 'TBD_MLS_E6',
      westHome: 'TBD_MLS_W3',
      westAway: 'TBD_MLS_W6',
    },
  ];

  seriesTemplates.forEach((st, idx) => {
    const g1Date = idx < 2 ? `${seasonYear}-11-22` : `${seasonYear}-11-23`;
    const g2Date = idx < 2 ? `${seasonYear}-11-27` : `${seasonYear}-11-28`;
    const g3Date = `${seasonYear}-12-02`;

    // Leste
    pushPlayoff(
      `usa_mls_po_r1_east_${st.key}_g1`,
      36,
      'Primeira Rodada (Melhor de 3) · Jogo 1',
      'Conferência Leste',
      g1Date,
      st.eastHome,
      st.eastAway,
      idx % 2 === 0 ? '18:00' : '20:30'
    );
    pushPlayoff(
      `usa_mls_po_r1_east_${st.key}_g2`,
      37,
      'Primeira Rodada (Melhor de 3) · Jogo 2',
      'Conferência Leste',
      g2Date,
      st.eastAway,
      st.eastHome,
      idx % 2 === 0 ? '18:00' : '20:30'
    );
    pushPlayoff(
      `usa_mls_po_r1_east_${st.key}_g3`,
      38,
      'Primeira Rodada (Melhor de 3) · Jogo 3',
      'Conferência Leste',
      g3Date,
      st.eastHome,
      st.eastAway,
      '19:00'
    );

    // Oeste
    pushPlayoff(
      `usa_mls_po_r1_west_${st.key}_g1`,
      36,
      'Primeira Rodada (Melhor de 3) · Jogo 1',
      'Conferência Oeste',
      g1Date,
      st.westHome,
      st.westAway,
      idx % 2 === 0 ? '21:30' : '22:30'
    );
    pushPlayoff(
      `usa_mls_po_r1_west_${st.key}_g2`,
      37,
      'Primeira Rodada (Melhor de 3) · Jogo 2',
      'Conferência Oeste',
      g2Date,
      st.westAway,
      st.westHome,
      idx % 2 === 0 ? '21:30' : '22:30'
    );
    pushPlayoff(
      `usa_mls_po_r1_west_${st.key}_g3`,
      38,
      'Primeira Rodada (Melhor de 3) · Jogo 3',
      'Conferência Oeste',
      g3Date,
      st.westHome,
      st.westAway,
      '22:00'
    );
  });

  // 3) Semifinais de Conferência (05 e 06/12)
  pushPlayoff(
    'usa_mls_po_sf_east_1',
    39,
    'Semifinal de Conferência · Leste',
    'Conferência Leste',
    `${seasonYear}-12-05`,
    'TBD_MLS_E_R1S1',
    'TBD_MLS_E_R1S2',
    '19:00'
  );
  pushPlayoff(
    'usa_mls_po_sf_east_2',
    39,
    'Semifinal de Conferência · Leste',
    'Conferência Leste',
    `${seasonYear}-12-06`,
    'TBD_MLS_E_R1S3',
    'TBD_MLS_E_R1S4',
    '18:00'
  );
  pushPlayoff(
    'usa_mls_po_sf_west_1',
    39,
    'Semifinal de Conferência · Oeste',
    'Conferência Oeste',
    `${seasonYear}-12-05`,
    'TBD_MLS_W_R1S1',
    'TBD_MLS_W_R1S2',
    '22:00'
  );
  pushPlayoff(
    'usa_mls_po_sf_west_2',
    39,
    'Semifinal de Conferência · Oeste',
    'Conferência Oeste',
    `${seasonYear}-12-06`,
    'TBD_MLS_W_R1S3',
    'TBD_MLS_W_R1S4',
    '21:00'
  );

  // 4) Finais de Conferência (11 e 12/12)
  pushPlayoff(
    'usa_mls_po_cf_east',
    40,
    'Final de Conferência · Leste',
    'Conferência Leste',
    `${seasonYear}-12-11`,
    'TBD_MLS_E_SF1',
    'TBD_MLS_E_SF2',
    '20:00'
  );
  pushPlayoff(
    'usa_mls_po_cf_west',
    40,
    'Final de Conferência · Oeste',
    'Conferência Oeste',
    `${seasonYear}-12-12`,
    'TBD_MLS_W_SF1',
    'TBD_MLS_W_SF2',
    '21:30'
  );

  // 5) MLS Cup — Grande Final (18/12)
  pushPlayoff(
    'usa_mls_po_final',
    41,
    'MLS Cup · Grande Final',
    'MLS Cup',
    `${seasonYear}-12-18`,
    'TBD_MLS_CAMP_LESTE',
    'TBD_MLS_CAMP_OESTE',
    '21:00'
  );

  // Standings com grupo por conferência
  const createRow = (club: Club, conf: MlsConference): Standing => ({
    teamId: club.id,
    group: MLS_CONFERENCE_GROUP_LABEL[conf],
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

  const standings: Standing[] = [
    ...east15.map((c) => createRow(c, 'Leste')),
    ...west15.map((c) => createRow(c, 'Oeste')),
  ];

  return { fixtures, standings };
}

/**
 * Official MLS Regular Season tie-breakers:
 * 1. Points
 * 2. Total wins
 * 3. Goal difference
 * 4. Goals scored
 * 5. Fewest disciplinary points (yellow=1, red=3)
 * 6. Away goal difference
 * 7. Away goals scored
 * 8. Home goal difference
 * 9. Home goals scored
 */
export function sortMlsStandings(standings: Standing[], fixtures: Fixture[]): Standing[] {
  const statsByClub = new Map<
    string,
    { disc: number; awayGF: number; awayGA: number; homeGF: number; homeGA: number }
  >();

  const ensure = (id: string) => {
    let rec = statsByClub.get(id);
    if (!rec) {
      rec = { disc: 0, awayGF: 0, awayGA: 0, homeGF: 0, homeGA: 0 };
      statsByClub.set(id, rec);
    }
    return rec;
  };

  for (const f of fixtures) {
    if (!f.played || f.homeScore === null || f.awayScore === null || isMlsPlayoffFixture(f)) {
      continue;
    }
    const h = ensure(f.homeTeamId);
    const a = ensure(f.awayTeamId);
    h.homeGF += f.homeScore;
    h.homeGA += f.awayScore;
    a.awayGF += f.awayScore;
    a.awayGA += f.homeScore;

    if (f.events) {
      for (const ev of f.events) {
        if (ev.type === 'CARTAO_AMARELO') {
          ensure(ev.teamId).disc += 1;
        } else if (ev.type === 'CARTAO_VERMELHO') {
          ensure(ev.teamId).disc += 3;
        }
      }
    }
  }

  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

    const sa = statsByClub.get(a.teamId);
    const sb = statsByClub.get(b.teamId);
    if (sa && sb) {
      if (sa.disc !== sb.disc) return sa.disc - sb.disc;
      const awayGDa = sa.awayGF - sa.awayGA;
      const awayGDb = sb.awayGF - sb.awayGA;
      if (awayGDb !== awayGDa) return awayGDb - awayGDa;
      if (sb.awayGF !== sa.awayGF) return sb.awayGF - sa.awayGF;
      const homeGDa = sa.homeGF - sa.homeGA;
      const homeGDb = sb.homeGF - sb.homeGA;
      if (homeGDb !== homeGDa) return homeGDb - homeGDa;
      if (sb.homeGF !== sa.homeGF) return sb.homeGF - sa.homeGF;
    }

    return a.teamId.localeCompare(b.teamId);
  });
}

function resolveSingleMlsKnockoutWinner(f?: Fixture): string | null {
  if (!f || !f.played) return null;
  if (f.aggregateWinnerId) return f.aggregateWinnerId;
  if (
    f.penaltiesHome !== undefined &&
    f.penaltiesAway !== undefined &&
    f.penaltiesHome !== f.penaltiesAway
  ) {
    return f.penaltiesHome > f.penaltiesAway ? f.homeTeamId : f.awayTeamId;
  }
  const hs = f.homeScore ?? 0;
  const as = f.awayScore ?? 0;
  if (hs !== as) return hs > as ? f.homeTeamId : f.awayTeamId;
  return f.homeTeamId;
}

/**
 * Synchronizes Audi MLS Cup Playoffs bracket progression cleanly after regular season & each playoff stage.
 */
export function syncMlsPlayoffBracket(
  fixtures: Fixture[],
  standings?: Standing[],
  clubs: Club[] = []
): Fixture[] {
  const hasMlsPlayoffs = fixtures.some((f) => f.id === 'usa_mls_po_wc_east');
  if (!hasMlsPlayoffs || !standings || standings.length < 18) return fixtures;

  const regularGames = fixtures.filter((f) => !isMlsPlayoffFixture(f));
  const regularDone = regularGames.length > 0 && regularGames.every((f) => f.played);
  if (!regularDone) return fixtures;

  const clubMap = new Map<string, Club>(clubs.map((c) => [c.id, c]));
  const orderedAll = sortMlsStandings(standings, regularGames);
  const overallRank = new Map<string, number>();
  orderedAll.forEach((s, idx) => overallRank.set(s.teamId, idx));

  const eastStandings = orderedAll.filter(
    (s) => s.group === 'Conferência Leste' || MLS_CONFERENCE_BY_CLUB_ID[s.teamId] === 'Leste'
  );
  const westStandings = orderedAll.filter(
    (s) => s.group === 'Conferência Oeste' || MLS_CONFERENCE_BY_CLUB_ID[s.teamId] === 'Oeste'
  );

  if (eastStandings.length < 9 || westStandings.length < 9) return fixtures;

  const confRank = new Map<string, number>();
  eastStandings.forEach((s, idx) => confRank.set(s.teamId, idx));
  westStandings.forEach((s, idx) => confRank.set(s.teamId, idx));

  const list = [...fixtures];
  const idxById = new Map<string, number>();
  list.forEach((f, idx) => idxById.set(f.id, idx));

  const getFix = (id: string) => {
    const i = idxById.get(id);
    return i !== undefined ? list[i] : undefined;
  };

  const setFixTeams = (id: string, homeId: string, awayId: string, extraPhase?: string) => {
    const i = idxById.get(id);
    if (i === undefined) return;
    const cur = list[i];
    if (cur.played) return;
    list[i] = {
      ...cur,
      homeTeamId: homeId,
      awayTeamId: awayId,
      cupPhase: extraPhase || cur.cupPhase,
      stadiumName: clubMap.get(homeId)?.stadium.name || cur.stadiumName,
    };
  };

  // Helper to seed higher regular-season seed at home
  const orderHigherConfHome = (idA: string, idB: string): [string, string] => {
    const ra = confRank.get(idA) ?? 99;
    const rb = confRank.get(idB) ?? 99;
    return ra <= rb ? [idA, idB] : [idB, idA];
  };

  // 1) Wild Card (8º x 9º)
  setFixTeams('usa_mls_po_wc_east', eastStandings[7].teamId, eastStandings[8].teamId);
  setFixTeams('usa_mls_po_wc_west', westStandings[7].teamId, westStandings[8].teamId);

  const wcWinnerEast = resolveSingleMlsKnockoutWinner(getFix('usa_mls_po_wc_east'));
  const wcWinnerWest = resolveSingleMlsKnockoutWinner(getFix('usa_mls_po_wc_west'));

  // 2) Primeira Rodada — Best-of-3
  const syncConferenceR1 = (
    confKey: 'east' | 'west',
    seeds: Standing[],
    wcWinner: string | null
  ): Record<'s1' | 's2' | 's3' | 's4', string | null> => {
    const ties: Array<{ key: 's1' | 's2' | 's3' | 's4'; high: string; low: string | null }> = [
      { key: 's1', high: seeds[0].teamId, low: wcWinner },
      { key: 's2', high: seeds[3].teamId, low: seeds[4].teamId },
      { key: 's3', high: seeds[1].teamId, low: seeds[6].teamId },
      { key: 's4', high: seeds[2].teamId, low: seeds[5].teamId },
    ];

    const winners: Record<'s1' | 's2' | 's3' | 's4', string | null> = {
      s1: null,
      s2: null,
      s3: null,
      s4: null,
    };

    for (const t of ties) {
      const prefix = `usa_mls_po_r1_${confKey}_${t.key}`;
      const g1Id = `${prefix}_g1`;
      const g2Id = `${prefix}_g2`;
      const g3Id = `${prefix}_g3`;

      if (t.low) {
        setFixTeams(g1Id, t.high, t.low);
        setFixTeams(g2Id, t.low, t.high);
      }

      const g1 = getFix(g1Id);
      const g2 = getFix(g2Id);
      const g3 = getFix(g3Id);

      const w1 = resolveSingleMlsKnockoutWinner(g1);
      const w2 = resolveSingleMlsKnockoutWinner(g2);

      if (w1 && w2) {
        if (w1 === w2) {
          // Sweep 2–0! Game 3 is not played.
          winners[t.key] = w1;
          setFixTeams(
            g3Id,
            'TBD_SERIE_2X0',
            'TBD_SERIE_2X0',
            'Primeira Rodada (Melhor de 3) · Jogo 3 (Dispensado)'
          );
        } else {
          // Tied 1–1! Game 3 at higher seed
          if (t.low) {
            setFixTeams(
              g3Id,
              t.high,
              t.low,
              'Primeira Rodada (Melhor de 3) · Jogo 3 (Decisivo)'
            );
          }
          const w3 = resolveSingleMlsKnockoutWinner(getFix(g3Id));
          if (w3) winners[t.key] = w3;
        }
      } else if (t.low && g3 && g3.homeTeamId.startsWith('TBD')) {
        // Keep tentative Game 3 teams visible until G2 finishes
        setFixTeams(g3Id, t.high, t.low);
      }
    }

    return winners;
  };

  const eastR1Winners = syncConferenceR1('east', eastStandings, wcWinnerEast);
  const westR1Winners = syncConferenceR1('west', westStandings, wcWinnerWest);

  // 3) Semifinais de Conferência (higher regular-season conference seed hosts)
  if (eastR1Winners.s1 && eastR1Winners.s2) {
    const [h, a] = orderHigherConfHome(eastR1Winners.s1, eastR1Winners.s2);
    setFixTeams('usa_mls_po_sf_east_1', h, a);
  }
  if (eastR1Winners.s3 && eastR1Winners.s4) {
    const [h, a] = orderHigherConfHome(eastR1Winners.s3, eastR1Winners.s4);
    setFixTeams('usa_mls_po_sf_east_2', h, a);
  }
  if (westR1Winners.s1 && westR1Winners.s2) {
    const [h, a] = orderHigherConfHome(westR1Winners.s1, westR1Winners.s2);
    setFixTeams('usa_mls_po_sf_west_1', h, a);
  }
  if (westR1Winners.s3 && westR1Winners.s4) {
    const [h, a] = orderHigherConfHome(westR1Winners.s3, westR1Winners.s4);
    setFixTeams('usa_mls_po_sf_west_2', h, a);
  }

  // 4) Finais de Conferência
  const sfEast1 = resolveSingleMlsKnockoutWinner(getFix('usa_mls_po_sf_east_1'));
  const sfEast2 = resolveSingleMlsKnockoutWinner(getFix('usa_mls_po_sf_east_2'));
  const sfWest1 = resolveSingleMlsKnockoutWinner(getFix('usa_mls_po_sf_west_1'));
  const sfWest2 = resolveSingleMlsKnockoutWinner(getFix('usa_mls_po_sf_west_2'));

  if (sfEast1 && sfEast2) {
    const [h, a] = orderHigherConfHome(sfEast1, sfEast2);
    setFixTeams('usa_mls_po_cf_east', h, a);
  }
  if (sfWest1 && sfWest2) {
    const [h, a] = orderHigherConfHome(sfWest1, sfWest2);
    setFixTeams('usa_mls_po_cf_west', h, a);
  }

  // 5) MLS Cup — Grande Final (hosted by finalist with better overall Supporters' Shield record)
  const cfEastWinner = resolveSingleMlsKnockoutWinner(getFix('usa_mls_po_cf_east'));
  const cfWestWinner = resolveSingleMlsKnockoutWinner(getFix('usa_mls_po_cf_west'));

  if (cfEastWinner && cfWestWinner) {
    const rEast = overallRank.get(cfEastWinner) ?? 99;
    const rWest = overallRank.get(cfWestWinner) ?? 99;
    const [finalHome, finalAway] =
      rEast <= rWest ? [cfEastWinner, cfWestWinner] : [cfWestWinner, cfEastWinner];
    setFixTeams('usa_mls_po_final', finalHome, finalAway);
  }

  return list;
}

export function resolveMlsCupChampionId(fixtures?: Fixture[]): string | undefined {
  if (!fixtures || fixtures.length === 0) return undefined;
  const finalFix = fixtures.find((f) => f.id === 'usa_mls_po_final');
  return resolveSingleMlsKnockoutWinner(finalFix) || undefined;
}

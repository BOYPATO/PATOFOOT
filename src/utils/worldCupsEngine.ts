import { Club, Fixture, WorldCupId, WorldLeagueId } from '../types/game';
import {
  getAfcChampionsCalendarDates,
  getConmebolContinentalScheduleDates,
  getSeasonFifaBlockedDatesSet,
  resolveCupScheduleConflicts,
} from './calendarUtils';
import { getClubStadiumName } from './englishCupsEngine';
import { assignSingleLegSlots, assignTwoLeggedSlots, resolveTieWinner } from './multiLeagueEngine';
import { getClubWorldLeagueId, getWorldLeagueClubs } from './worldLeaguesEngine';

export const WORLD_CUP_IDS: WorldCupId[] = [
  'wl_cup_usa',
  'wl_cup_mex',
  'wl_cup_can',
  'wl_cup_sau',
  'wl_cup_jpn',
  'wl_cup_rus',
  'wl_cup_egy',
  'wl_cup_mar',
];

export const JAN_DEC_WORLD_CUP_IDS: WorldCupId[] = [
  'wl_cup_usa',
  'wl_cup_mex',
  'wl_cup_can',
  'wl_cup_egy',
  'wl_cup_mar',
];

export const SPLIT_YEAR_WORLD_CUP_IDS: WorldCupId[] = [
  'wl_cup_sau',
  'wl_cup_jpn',
  'wl_cup_rus',
];

export function isWorldCup(comp: string): comp is WorldCupId {
  return (WORLD_CUP_IDS as string[]).includes(comp);
}

export function flattenWorldCupsFixtures(
  fixturesMap?: Partial<Record<WorldCupId, Fixture[]>>
): Fixture[] {
  if (!fixturesMap) return [];
  return Object.values(fixturesMap).flat().filter(Boolean);
}

function pseudoShuffle<T>(arr: T[], seedSalt: number = 42): T[] {
  const result = [...arr];
  let seed = Math.abs(seedSalt) + 1;
  for (let i = result.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    const j = Math.floor(rnd * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

function addIsoRange(blocked: Set<string>, startDate: string, endDate: string): void {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  let curMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);
  while (curMs <= endMs) {
    const dt = new Date(curMs);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    blocked.add(`${y}-${m}-${d}`);
    curMs += 86400000;
  }
}

export interface GenerateWorldCupsOptions {
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>;
  fixturesConcacafChampions?: Fixture[];
  fixturesAfcChampions?: Fixture[];
  fixturesCopaInternacional?: Fixture[];
  targetCupIds?: WorldCupId[];
}

function buildJanDecBlockedSet(
  leagueIds: WorldLeagueId[],
  year: number,
  options?: GenerateWorldCupsOptions
): Set<string> {
  const blocked = getSeasonFifaBlockedDatesSet(year, 'south_america');

  // League fixture dates
  for (const lid of leagueIds) {
    for (const f of options?.fixturesWorldLeagues?.[lid] || []) {
      if (f.date) blocked.add(f.date);
    }
  }

  // Concacaf Champions dates
  if (options?.fixturesConcacafChampions && options.fixturesConcacafChampions.length > 0) {
    for (const f of options.fixturesConcacafChampions) {
      if (f.date) blocked.add(f.date);
    }
  } else {
    [
      `${year}-02-10`,
      `${year}-02-17`,
      `${year}-03-03`,
      `${year}-03-10`,
      `${year}-04-07`,
      `${year}-04-14`,
      `${year}-04-28`,
      `${year}-05-05`,
      `${year}-05-23`,
    ].forEach((d) => blocked.add(d));
  }

  // Copa Internacional FIFA (runs on CONMEBOL continental dates)
  if (options?.fixturesCopaInternacional && options.fixturesCopaInternacional.length > 0) {
    for (const f of options.fixturesCopaInternacional) {
      if (f.date) blocked.add(f.date);
    }
  } else {
    const c = getConmebolContinentalScheduleDates(year);
    [
      ...c.groupDates,
      c.oitavasIdaDate,
      c.oitavasVoltaDate,
      c.quartasIdaDate,
      c.quartasVoltaDate,
      c.semiIdaDate,
      c.semiVoltaDate,
      c.sulamericanaFinalDate,
      c.libertadoresFinalDate,
    ].forEach((d) => blocked.add(d));
  }

  // MLS/mid-year global tournament window (World Cup 2026 / Copa 2028 / Super Mundial 2029 / WC 2030)
  if (year === 2026 || year === 2030 || ((year % 4) + 4) % 4 === 2) {
    addIsoRange(blocked, `${year}-05-25`, `${year}-07-16`);
  }

  return blocked;
}

function buildSplitYearBlockedSet(
  leagueId: WorldLeagueId,
  splitStartYear: number,
  options?: GenerateWorldCupsOptions
): Set<string> {
  const nextYear = splitStartYear + 1;
  const blocked = getSeasonFifaBlockedDatesSet(splitStartYear, 'europe');

  // Domestic league dates
  for (const f of options?.fixturesWorldLeagues?.[leagueId] || []) {
    if (f.date) blocked.add(f.date);
  }

  // AFC Champions dates
  if (options?.fixturesAfcChampions && options.fixturesAfcChampions.length > 0) {
    for (const f of options.fixturesAfcChampions) {
      if (f.date) blocked.add(f.date);
    }
  } else {
    const afc = getAfcChampionsCalendarDates(splitStartYear);
    [
      ...afc.leagueDates,
      afc.r16IdaDate,
      afc.r16VoltaDate,
      afc.qfDate,
      afc.sfDate,
      afc.finalDate,
    ].forEach((d) => blocked.add(d));
  }

  // Copa Internacional FIFA across both calendar years overlapped by this split season
  if (options?.fixturesCopaInternacional && options.fixturesCopaInternacional.length > 0) {
    for (const f of options.fixturesCopaInternacional) {
      if (f.date) blocked.add(f.date);
    }
  } else {
    for (const yr of [splitStartYear, nextYear]) {
      const c = getConmebolContinentalScheduleDates(yr);
      [
        ...c.groupDates,
        c.oitavasIdaDate,
        c.oitavasVoltaDate,
        c.quartasIdaDate,
        c.quartasVoltaDate,
        c.semiIdaDate,
        c.semiVoltaDate,
        c.sulamericanaFinalDate,
        c.libertadoresFinalDate,
      ].forEach((d) => blocked.add(d));
    }
  }

  // Country-specific mid-season winter / continental breaks
  if (leagueId === 'sau_pro') {
    addIsoRange(blocked, `${splitStartYear}-12-24`, `${nextYear}-02-07`);
  } else if (leagueId === 'jpn_j1') {
    addIsoRange(blocked, `${splitStartYear}-12-20`, `${nextYear}-02-14`);
  } else if (leagueId === 'rus_premier') {
    addIsoRange(blocked, `${splitStartYear}-12-07`, `${nextYear}-02-26`);
  }

  return blocked;
}

// =========================================================
// 1. ESTADOS UNIDOS: Lamar Hunt U.S. Open Cup (30 clubes MLS)
// =========================================================
export function generateUsOpenCupFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  options?: GenerateWorldCupsOptions
): Fixture[] {
  const mlsClubs = getWorldLeagueClubs(clubs, 'usa_mls');
  const shuffled = pseudoShuffle(mlsClubs, seasonYear * 107);
  const fixtures: Fixture[] = [];

  // 30 clubes: 2 entram direto nas Oitavas; 28 jogam 1ª Rodada (14 jogos -> 14 vencedores)
  const directR16 = shuffled.slice(0, 2);
  const r1Pool = shuffled.slice(2, 30);

  for (let i = 0; i < 14; i++) {
    const home = r1Pool[i * 2];
    const away = r1Pool[i * 2 + 1];
    if (!home || !away) continue;
    fixtures.push({
      id: `usa_oc_r1_m${i}`,
      round: 1,
      competition: 'wl_cup_usa',
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-03-18`,
      time: '20:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Rodada',
      groupName: 'U.S. Open Cup · 1ª Fase em Jogo Único',
    });
  }

  for (let i = 0; i < 8; i++) {
    const isDirectBye = i < 2;
    const home = isDirectBye ? directR16[i] : undefined;
    fixtures.push({
      id: `usa_oc_r16_m${i}`,
      round: 2,
      competition: 'wl_cup_usa',
      homeTeamId: isDirectBye ? home?.id || 'tbd' : 'TBD_USA_OC_R1',
      awayTeamId: 'TBD_USA_OC_R1',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-05-13`,
      time: '20:00',
      stadiumName: home ? getClubStadiumName(home) : 'Estádio a definir',
      cupPhase: 'Oitavas de Final',
      groupName: 'U.S. Open Cup · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `usa_oc_qf_m${i}`,
      round: 3,
      competition: 'wl_cup_usa',
      homeTeamId: 'TBD_USA_OC_R16',
      awayTeamId: 'TBD_USA_OC_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-08-05`,
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'U.S. Open Cup · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `usa_oc_sf_m${i}`,
      round: 4,
      competition: 'wl_cup_usa',
      homeTeamId: 'TBD_USA_OC_QF',
      awayTeamId: 'TBD_USA_OC_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-09-23`,
      time: '20:30',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'U.S. Open Cup · Semifinal',
    });
  }

  fixtures.push({
    id: 'usa_oc_final',
    round: 5,
    competition: 'wl_cup_usa',
    homeTeamId: 'TBD_USA_OC_SF0',
    awayTeamId: 'TBD_USA_OC_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${seasonYear}-10-28`,
    time: '20:00',
    stadiumName: 'Mercedes-Benz Stadium (Atlanta)',
    cupPhase: 'Grande Final',
    groupName: 'Lamar Hunt U.S. Open Cup · Grande Final',
  });

  const blocked = buildJanDecBlockedSet(['usa_mls'], seasonYear, options);
  return resolveCupScheduleConflicts(fixtures, blocked, `${seasonYear}-02-05`, `${seasonYear}-11-20`);
}

// =========================================================
// Helper para Copas de 18 clubes (México, Egito, Arábia Saudita)
// =========================================================
function build18ClubCup(params: {
  clubs: Club[];
  leagueId: WorldLeagueId;
  cupId: WorldCupId;
  idPrefix: string;
  tbdTag: string;
  cupTitle: string;
  finalStadium: string;
  dates: [string, string, string, string, string];
  time: string;
  seedSalt: number;
}): Fixture[] {
  const leagueClubs = getWorldLeagueClubs(params.clubs, params.leagueId);
  const shuffled = pseudoShuffle(leagueClubs, params.seedSalt);
  const fixtures: Fixture[] = [];

  const prelim = shuffled.slice(14, 18); // 4 -> 2 winners
  const directR16 = shuffled.slice(0, 14); // 14

  for (let i = 0; i < 2; i++) {
    const home = prelim[i * 2];
    const away = prelim[i * 2 + 1];
    if (!home || !away) continue;
    fixtures.push({
      id: `${params.idPrefix}_r1_m${i}`,
      round: 1,
      competition: params.cupId,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: params.dates[0],
      time: params.time,
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Fase (Preliminar)',
      groupName: `${params.cupTitle} · 1ª Fase em Jogo Único`,
    });
  }

  for (let i = 0; i < 8; i++) {
    const pairIdx = 2 + (i - 2) * 2;
    const home = i < 2 ? directR16[i] : directR16[pairIdx];
    const awayId = i < 2 ? `TBD_${params.tbdTag}_R1` : directR16[pairIdx + 1]?.id || 'tbd';
    fixtures.push({
      id: `${params.idPrefix}_r16_m${i}`,
      round: 2,
      competition: params.cupId,
      homeTeamId: home?.id || 'tbd',
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: params.dates[1],
      time: params.time,
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: `${params.cupTitle} · Oitavas de Final`,
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `${params.idPrefix}_qf_m${i}`,
      round: 3,
      competition: params.cupId,
      homeTeamId: `TBD_${params.tbdTag}_R16`,
      awayTeamId: `TBD_${params.tbdTag}_R16`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: params.dates[2],
      time: params.time,
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: `${params.cupTitle} · Quartas de Final`,
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `${params.idPrefix}_sf_m${i}`,
      round: 4,
      competition: params.cupId,
      homeTeamId: `TBD_${params.tbdTag}_QF`,
      awayTeamId: `TBD_${params.tbdTag}_QF`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: params.dates[3],
      time: params.time,
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: `${params.cupTitle} · Semifinal`,
    });
  }

  fixtures.push({
    id: `${params.idPrefix}_final`,
    round: 5,
    competition: params.cupId,
    homeTeamId: `TBD_${params.tbdTag}_SF0`,
    awayTeamId: `TBD_${params.tbdTag}_SF1`,
    homeScore: null,
    awayScore: null,
    played: false,
    date: params.dates[4],
    time: params.time,
    stadiumName: params.finalStadium,
    cupPhase: 'Grande Final',
    groupName: `${params.cupTitle} · Grande Final`,
  });

  return fixtures;
}

// =========================================================
// 2. MÉXICO: Copa MX (18 clubes Liga MX)
// =========================================================
export function generateCopaMxFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  options?: GenerateWorldCupsOptions
): Fixture[] {
  const raw = build18ClubCup({
    clubs,
    leagueId: 'mex_ligamx',
    cupId: 'wl_cup_mex',
    idPrefix: 'mex_cm',
    tbdTag: 'MEX_CM',
    cupTitle: 'Copa MX',
    finalStadium: 'Estadio Azteca (Cidade do México)',
    dates: [
      `${seasonYear}-02-18`,
      `${seasonYear}-04-22`,
      `${seasonYear}-08-05`,
      `${seasonYear}-09-23`,
      `${seasonYear}-11-18`,
    ],
    time: '21:00',
    seedSalt: seasonYear * 113,
  });
  const blocked = buildJanDecBlockedSet(['mex_ligamx'], seasonYear, options);
  return resolveCupScheduleConflicts(raw, blocked, `${seasonYear}-02-01`, `${seasonYear}-12-05`);
}

// =========================================================
// 3. CANADÁ: Campeonato Canadense (8 CPL + 3 canadenses da MLS = 11 clubes)
// =========================================================
const CANADIAN_MLS_IDS = ['wl_usa_van', 'wl_usa_tor', 'wl_usa_mtl'];

export function generateCanadianChampionshipFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  options?: GenerateWorldCupsOptions
): Fixture[] {
  const cplClubs = getWorldLeagueClubs(clubs, 'can_cpl');
  const mlsCanadianClubs = clubs.filter(
    (c) => CANADIAN_MLS_IDS.includes(c.id) || (c.country === 'Canadá' && getClubWorldLeagueId(c) === 'usa_mls')
  );
  const participants = [...mlsCanadianClubs, ...cplClubs];
  const shuffled = pseudoShuffle(participants, seasonYear * 127);
  const fixtures: Fixture[] = [];

  if (shuffled.length >= 11) {
    // 11 clubes: 5 byes direto às Quartas + 6 na 1ª Rodada (3 jogos -> 3 vencedores)
    const directQf = shuffled.slice(0, 5);
    const r1Clubs = shuffled.slice(5, 11);

    for (let i = 0; i < 3; i++) {
      const home = r1Clubs[i * 2];
      const away = r1Clubs[i * 2 + 1];
      fixtures.push({
        id: `can_cc_r1_m${i}`,
        round: 1,
        competition: 'wl_cup_can',
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${seasonYear}-04-22`,
        time: '19:30',
        stadiumName: getClubStadiumName(home),
        cupPhase: '1ª Fase',
        groupName: 'Campeonato Canadense · 1ª Fase',
      });
    }

    for (let i = 0; i < 4; i++) {
      const home = i < 3 ? directQf[i] : directQf[3];
      const awayId = i < 3 ? 'TBD_CAN_CC_R1' : directQf[4]?.id || 'tbd';
      fixtures.push({
        id: `can_cc_qf_m${i}`,
        round: 2,
        competition: 'wl_cup_can',
        homeTeamId: home?.id || 'tbd',
        awayTeamId: awayId,
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${seasonYear}-05-19`,
        time: '19:30',
        stadiumName: getClubStadiumName(home),
        cupPhase: 'Quartas de Final',
        groupName: 'Campeonato Canadense · Quartas de Final',
      });
    }
  } else {
    const qfPool = shuffled.slice(0, 8);
    for (let i = 0; i < Math.floor(qfPool.length / 2); i++) {
      const home = qfPool[i * 2];
      const away = qfPool[i * 2 + 1];
      fixtures.push({
        id: `can_cc_qf_m${i}`,
        round: 2,
        competition: 'wl_cup_can',
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${seasonYear}-05-19`,
        time: '19:30',
        stadiumName: getClubStadiumName(home),
        cupPhase: 'Quartas de Final',
        groupName: 'Campeonato Canadense · Quartas de Final',
      });
    }
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `can_cc_sf_m${i}`,
      round: 3,
      competition: 'wl_cup_can',
      homeTeamId: 'TBD_CAN_CC_QF',
      awayTeamId: 'TBD_CAN_CC_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-08-05`,
      time: '19:30',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'Campeonato Canadense · Semifinal',
    });
  }

  fixtures.push({
    id: 'can_cc_final',
    round: 4,
    competition: 'wl_cup_can',
    homeTeamId: 'TBD_CAN_CC_SF0',
    awayTeamId: 'TBD_CAN_CC_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${seasonYear}-09-23`,
    time: '19:30',
    stadiumName: 'BC Place / BMO Field',
    cupPhase: 'Grande Final',
    groupName: 'Campeonato Canadense · Grande Decisão (Voyageurs Cup)',
  });

  // Bloqueia TANTO Liga Canadá quanto MLS (pois os 3 clubes canadenses jogam a MLS)
  const blocked = buildJanDecBlockedSet(['can_cpl', 'usa_mls'], seasonYear, options);
  return resolveCupScheduleConflicts(fixtures, blocked, `${seasonYear}-03-10`, `${seasonYear}-11-15`);
}

// =========================================================
// 4. EGITO: Copa do Egito (18 clubes)
// =========================================================
export function generateEgyptCupFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  options?: GenerateWorldCupsOptions
): Fixture[] {
  const raw = build18ClubCup({
    clubs,
    leagueId: 'egy_premier',
    cupId: 'wl_cup_egy',
    idPrefix: 'egy_ec',
    tbdTag: 'EGY_EC',
    cupTitle: 'Copa do Egito',
    finalStadium: 'Cairo International Stadium (Cairo)',
    dates: [
      `${seasonYear}-02-18`,
      `${seasonYear}-04-22`,
      `${seasonYear}-08-05`,
      `${seasonYear}-10-07`,
      `${seasonYear}-11-25`,
    ],
    time: '19:00',
    seedSalt: seasonYear * 131,
  });
  const blocked = buildJanDecBlockedSet(['egy_premier'], seasonYear, options);
  return resolveCupScheduleConflicts(raw, blocked, `${seasonYear}-02-01`, `${seasonYear}-12-10`);
}

// =========================================================
// 5. MARROCOS: Coupe du Trône (16 clubes Botola Pro)
// =========================================================
export function generateMoroccoCupFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  options?: GenerateWorldCupsOptions
): Fixture[] {
  const botola = getWorldLeagueClubs(clubs, 'mar_botola');
  const shuffled = pseudoShuffle(botola, seasonYear * 137);
  const fixtures: Fixture[] = [];

  for (let i = 0; i < 8; i++) {
    const home = shuffled[i * 2];
    const away = shuffled[i * 2 + 1];
    if (!home || !away) continue;
    fixtures.push({
      id: `mar_ct_r16_m${i}`,
      round: 1,
      competition: 'wl_cup_mar',
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-03-18`,
      time: '20:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Coupe du Trône · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `mar_ct_qf_m${i}`,
      round: 2,
      competition: 'wl_cup_mar',
      homeTeamId: 'TBD_MAR_CT_R16',
      awayTeamId: 'TBD_MAR_CT_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-05-13`,
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Coupe du Trône · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `mar_ct_sf_m${i}`,
      round: 3,
      competition: 'wl_cup_mar',
      homeTeamId: 'TBD_MAR_CT_QF',
      awayTeamId: 'TBD_MAR_CT_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-08-26`,
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'Coupe du Trône · Semifinal',
    });
  }

  fixtures.push({
    id: 'mar_ct_final',
    round: 4,
    competition: 'wl_cup_mar',
    homeTeamId: 'TBD_MAR_CT_SF0',
    awayTeamId: 'TBD_MAR_CT_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${seasonYear}-11-18`,
    time: '20:00',
    stadiumName: 'Stade Prince Moulay Abdellah (Rabat)',
    cupPhase: 'Grande Final',
    groupName: 'Coupe du Trône · Grande Final em Rabat',
  });

  const blocked = buildJanDecBlockedSet(['mar_botola'], seasonYear, options);
  return resolveCupScheduleConflicts(fixtures, blocked, `${seasonYear}-02-01`, `${seasonYear}-12-10`);
}

// =========================================================
// 6. ARÁBIA SAUDITA: Copa do Rei Saudita / King's Cup (18 clubes, Split-Year)
// =========================================================
export function generateSaudiKingsCupFixtures(
  clubs: Club[],
  splitSeasonYear: number = 2026,
  options?: GenerateWorldCupsOptions
): Fixture[] {
  const nextYear = splitSeasonYear + 1;
  const raw = build18ClubCup({
    clubs,
    leagueId: 'sau_pro',
    cupId: 'wl_cup_sau',
    idPrefix: 'sau_kc',
    tbdTag: 'SAU_KC',
    cupTitle: 'Copa do Rei Saudita',
    finalStadium: 'King Abdullah Sports City (Jeddah)',
    dates: [
      `${splitSeasonYear}-09-29`,
      `${splitSeasonYear}-11-03`,
      `${nextYear}-02-24`,
      `${nextYear}-04-06`,
      `${nextYear}-05-19`,
    ],
    time: '20:30',
    seedSalt: splitSeasonYear * 139,
  });
  const blocked = buildSplitYearBlockedSet('sau_pro', splitSeasonYear, options);
  return resolveCupScheduleConflicts(
    raw,
    blocked,
    `${splitSeasonYear}-09-01`,
    `${nextYear}-06-05`
  );
}

// =========================================================
// 7. JAPÃO: Copa do Imperador / Emperor's Cup (20 clubes J1, Split-Year)
// =========================================================
export function generateJapanEmperorsCupFixtures(
  clubs: Club[],
  splitSeasonYear: number = 2026,
  options?: GenerateWorldCupsOptions
): Fixture[] {
  const nextYear = splitSeasonYear + 1;
  const j1 = getWorldLeagueClubs(clubs, 'jpn_j1');
  const shuffled = pseudoShuffle(j1, splitSeasonYear * 149);
  const fixtures: Fixture[] = [];

  // 20 clubes: 8 jogam 1ª Fase -> 4 vencedores; 12 entram direto nas Oitavas
  const prelim = shuffled.slice(12, 20);
  const directR16 = shuffled.slice(0, 12);

  for (let i = 0; i < 4; i++) {
    const home = prelim[i * 2];
    const away = prelim[i * 2 + 1];
    if (!home || !away) continue;
    fixtures.push({
      id: `jpn_emp_r1_m${i}`,
      round: 1,
      competition: 'wl_cup_jpn',
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${splitSeasonYear}-09-02`,
      time: '19:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Fase',
      groupName: 'Copa do Imperador · 1ª Fase em Jogo Único',
    });
  }

  for (let i = 0; i < 8; i++) {
    const home = directR16[i] || directR16[0];
    const awayId = i < 4 ? 'TBD_JPN_EMP_R1' : directR16[i + 4]?.id || 'tbd';
    fixtures.push({
      id: `jpn_emp_r16_m${i}`,
      round: 2,
      competition: 'wl_cup_jpn',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${splitSeasonYear}-11-11`,
      time: '19:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Copa do Imperador · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `jpn_emp_qf_m${i}`,
      round: 3,
      competition: 'wl_cup_jpn',
      homeTeamId: 'TBD_JPN_EMP_R16',
      awayTeamId: 'TBD_JPN_EMP_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-24`,
      time: '19:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Copa do Imperador · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `jpn_emp_sf_m${i}`,
      round: 4,
      competition: 'wl_cup_jpn',
      homeTeamId: 'TBD_JPN_EMP_QF',
      awayTeamId: 'TBD_JPN_EMP_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-04-07`,
      time: '19:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'Copa do Imperador · Semifinal',
    });
  }

  fixtures.push({
    id: 'jpn_emp_final',
    round: 5,
    competition: 'wl_cup_jpn',
    homeTeamId: 'TBD_JPN_EMP_SF0',
    awayTeamId: 'TBD_JPN_EMP_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-19`,
    time: '14:00',
    stadiumName: 'Estádio Nacional de Tóquio',
    cupPhase: 'Grande Final',
    groupName: 'Copa do Imperador · Final no Estádio Nacional de Tóquio',
  });

  const blocked = buildSplitYearBlockedSet('jpn_j1', splitSeasonYear, options);
  return resolveCupScheduleConflicts(
    fixtures,
    blocked,
    `${splitSeasonYear}-08-20`,
    `${nextYear}-06-05`
  );
}

// =========================================================
// 8. RÚSSIA: Copa da Rússia (16 clubes RPL, Split-Year)
// =========================================================
export function generateRussianCupFixtures(
  clubs: Club[],
  splitSeasonYear: number = 2026,
  options?: GenerateWorldCupsOptions
): Fixture[] {
  const nextYear = splitSeasonYear + 1;
  const rpl = getWorldLeagueClubs(clubs, 'rus_premier');
  const shuffled = pseudoShuffle(rpl, splitSeasonYear * 151);
  const fixtures: Fixture[] = [];

  for (let i = 0; i < 8; i++) {
    const home = shuffled[i * 2];
    const away = shuffled[i * 2 + 1];
    if (!home || !away) continue;
    fixtures.push({
      id: `rus_cup_r16_m${i}`,
      round: 1,
      competition: 'wl_cup_rus',
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${splitSeasonYear}-09-16`,
      time: '19:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Copa da Rússia · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `rus_cup_qf_m${i}`,
      round: 2,
      competition: 'wl_cup_rus',
      homeTeamId: 'TBD_RUS_CUP_R16',
      awayTeamId: 'TBD_RUS_CUP_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${splitSeasonYear}-11-04`,
      time: '19:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Copa da Rússia · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push(
      {
        id: `rus_cup_sf_m${i}_ida`,
        round: 3,
        competition: 'wl_cup_rus',
        homeTeamId: 'TBD_RUS_CUP_QF',
        awayTeamId: 'TBD_RUS_CUP_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-03-17`,
        time: '19:00',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Ida)',
        groupName: 'Copa da Rússia · Semifinal Ida',
        leg: 1,
      },
      {
        id: `rus_cup_sf_m${i}_volta`,
        round: 4,
        competition: 'wl_cup_rus',
        homeTeamId: 'TBD_RUS_CUP_QF',
        awayTeamId: 'TBD_RUS_CUP_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-04-21`,
        time: '19:00',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Volta)',
        groupName: 'Copa da Rússia · Semifinal Volta',
        leg: 2,
      }
    );
  }

  fixtures.push({
    id: 'rus_cup_final',
    round: 5,
    competition: 'wl_cup_rus',
    homeTeamId: 'TBD_RUS_CUP_SF0',
    awayTeamId: 'TBD_RUS_CUP_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-23`,
    time: '17:00',
    stadiumName: 'Estádio Lujniki (Moscou)',
    cupPhase: 'Grande Final',
    groupName: 'Copa da Rússia · Grande Decisão no Estádio Lujniki',
  });

  const blocked = buildSplitYearBlockedSet('rus_premier', splitSeasonYear, options);
  return resolveCupScheduleConflicts(
    fixtures,
    blocked,
    `${splitSeasonYear}-08-10`,
    `${nextYear}-06-05`
  );
}

// =========================================================
// GERADOR UNIFICADO DE TODAS AS COPAS DO MUNDO (WL)
// =========================================================
export function generateAllWorldCupsFixtures(
  clubs: Club[],
  janDecYear: number = 2026,
  splitYear: number = 2026,
  options?: GenerateWorldCupsOptions
): Partial<Record<WorldCupId, Fixture[]>> {
  const targets = new Set<WorldCupId>(options?.targetCupIds || WORLD_CUP_IDS);
  const result: Partial<Record<WorldCupId, Fixture[]>> = {};

  if (targets.has('wl_cup_usa')) {
    result.wl_cup_usa = generateUsOpenCupFixtures(clubs, janDecYear, options);
  }
  if (targets.has('wl_cup_mex')) {
    result.wl_cup_mex = generateCopaMxFixtures(clubs, janDecYear, options);
  }
  if (targets.has('wl_cup_can')) {
    // Bloqueia também as datas da U.S. Open Cup para clubes canadenses da MLS não terem colisão dupla
    const usaOpenDates = new Set<string>(
      (result.wl_cup_usa || []).map((f) => f.date).filter((d): d is string => Boolean(d))
    );
    const canFixtures = generateCanadianChampionshipFixtures(clubs, janDecYear, options);
    if (usaOpenDates.size > 0) {
      const canBlocked = buildJanDecBlockedSet(['can_cpl', 'usa_mls'], janDecYear, options);
      for (const d of usaOpenDates) canBlocked.add(d);
      result.wl_cup_can = resolveCupScheduleConflicts(
        canFixtures,
        canBlocked,
        `${janDecYear}-03-10`,
        `${janDecYear}-11-15`
      );
    } else {
      result.wl_cup_can = canFixtures;
    }
  }
  if (targets.has('wl_cup_egy')) {
    result.wl_cup_egy = generateEgyptCupFixtures(clubs, janDecYear, options);
  }
  if (targets.has('wl_cup_mar')) {
    result.wl_cup_mar = generateMoroccoCupFixtures(clubs, janDecYear, options);
  }
  if (targets.has('wl_cup_sau')) {
    result.wl_cup_sau = generateSaudiKingsCupFixtures(clubs, splitYear, options);
  }
  if (targets.has('wl_cup_jpn')) {
    result.wl_cup_jpn = generateJapanEmperorsCupFixtures(clubs, splitYear, options);
  }
  if (targets.has('wl_cup_rus')) {
    result.wl_cup_rus = generateRussianCupFixtures(clubs, splitYear, options);
  }

  return result;
}

// =========================================================
// SINCRONIZADOR DE MATA-MATA DAS COPAS NACIONAIS (WL)
// =========================================================
export function syncWorldCupsKnockoutBrackets(params: {
  fixturesWorldCups?: Partial<Record<WorldCupId, Fixture[]>>;
  clubs?: Club[];
}): Partial<Record<WorldCupId, Fixture[]>> {
  const result: Partial<Record<WorldCupId, Fixture[]>> = {
    ...(params.fixturesWorldCups || {}),
  };
  const clubsMap = new Map((params.clubs || []).map((c) => [c.id, c]));
  const getFix = (list: Fixture[], id: string) => list.find((f) => f.id === id);

  const updateStadiumIfKnown = (fixtures: Fixture[], fixId: string, homeId?: string | null) => {
    if (!homeId || !clubsMap.has(homeId)) return fixtures;
    const stadium = getClubStadiumName(clubsMap.get(homeId));
    return fixtures.map((f) =>
      f.id === fixId && (f.stadiumName || '').includes('definir')
        ? { ...f, stadiumName: stadium }
        : f
    );
  };

  // Helper padrão para copas em jogo único (R16 -> QF -> SF -> Final)
  const syncFromR16ToFinal = (list: Fixture[], prefix: string): Fixture[] => {
    let cur = [...list];
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(cur, `${prefix}_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(cur, `${prefix}_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        cur = assignSingleLegSlots(cur, `${prefix}_qf_m${i}`, w0, w1);
        cur = updateStadiumIfKnown(cur, `${prefix}_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(cur, `${prefix}_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(cur, `${prefix}_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        cur = assignSingleLegSlots(cur, `${prefix}_sf_m${i}`, w0, w1);
        cur = updateStadiumIfKnown(cur, `${prefix}_sf_m${i}`, w0);
      }
    }
    const sf0 = resolveTieWinner(undefined, getFix(cur, `${prefix}_sf_m0`));
    const sf1 = resolveTieWinner(undefined, getFix(cur, `${prefix}_sf_m1`));
    if (sf0 || sf1) {
      cur = assignSingleLegSlots(cur, `${prefix}_final`, sf0, sf1);
    }
    return cur;
  };

  // 1. U.S. Open Cup (14 R1 -> 2 direct + 12 R1 slots in R16)
  if (result.wl_cup_usa) {
    let usa = [...result.wl_cup_usa];
    // Jogos m0 e m1 de R16 têm time direto em casa + vencedor R1_m0 / R1_m1 fora
    for (let i = 0; i < 2; i++) {
      const w = resolveTieWinner(undefined, getFix(usa, `usa_oc_r1_m${i}`));
      if (w) usa = assignSingleLegSlots(usa, `usa_oc_r16_m${i}`, undefined, w);
    }
    // Jogos m2..m7 de R16 recebem pares de vencedores R1_m2..m13
    for (let i = 2; i < 8; i++) {
      const r1A = 2 + (i - 2) * 2;
      const r1B = r1A + 1;
      const w0 = resolveTieWinner(undefined, getFix(usa, `usa_oc_r1_m${r1A}`));
      const w1 = resolveTieWinner(undefined, getFix(usa, `usa_oc_r1_m${r1B}`));
      if (w0 || w1) {
        usa = assignSingleLegSlots(usa, `usa_oc_r16_m${i}`, w0, w1);
        usa = updateStadiumIfKnown(usa, `usa_oc_r16_m${i}`, w0);
      }
    }
    result.wl_cup_usa = syncFromR16ToFinal(usa, 'usa_oc');
  }

  // 2. Copa MX (2 R1 -> R16 m0..m1 away)
  if (result.wl_cup_mex) {
    let mex = [...result.wl_cup_mex];
    for (let i = 0; i < 2; i++) {
      const w = resolveTieWinner(undefined, getFix(mex, `mex_cm_r1_m${i}`));
      if (w) mex = assignSingleLegSlots(mex, `mex_cm_r16_m${i}`, undefined, w);
    }
    result.wl_cup_mex = syncFromR16ToFinal(mex, 'mex_cm');
  }

  // 3. Campeonato Canadense (3 R1 -> QF m0..m2 away -> SF -> Final)
  if (result.wl_cup_can) {
    let can = [...result.wl_cup_can];
    for (let i = 0; i < 3; i++) {
      const w = resolveTieWinner(undefined, getFix(can, `can_cc_r1_m${i}`));
      if (w) can = assignSingleLegSlots(can, `can_cc_qf_m${i}`, undefined, w);
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(can, `can_cc_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(can, `can_cc_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        can = assignSingleLegSlots(can, `can_cc_sf_m${i}`, w0, w1);
        can = updateStadiumIfKnown(can, `can_cc_sf_m${i}`, w0);
      }
    }
    const sf0 = resolveTieWinner(undefined, getFix(can, 'can_cc_sf_m0'));
    const sf1 = resolveTieWinner(undefined, getFix(can, 'can_cc_sf_m1'));
    if (sf0 || sf1) {
      can = assignSingleLegSlots(can, 'can_cc_final', sf0, sf1);
    }
    result.wl_cup_can = can;
  }

  // 4. Copa do Egito (2 R1 -> R16 m0..m1 away)
  if (result.wl_cup_egy) {
    let egy = [...result.wl_cup_egy];
    for (let i = 0; i < 2; i++) {
      const w = resolveTieWinner(undefined, getFix(egy, `egy_ec_r1_m${i}`));
      if (w) egy = assignSingleLegSlots(egy, `egy_ec_r16_m${i}`, undefined, w);
    }
    result.wl_cup_egy = syncFromR16ToFinal(egy, 'egy_ec');
  }

  // 5. Coupe du Trône (Marrocos - direto R16)
  if (result.wl_cup_mar) {
    result.wl_cup_mar = syncFromR16ToFinal(result.wl_cup_mar, 'mar_ct');
  }

  // 6. Copa do Rei Saudita (2 R1 -> R16 m0..m1 away)
  if (result.wl_cup_sau) {
    let sau = [...result.wl_cup_sau];
    for (let i = 0; i < 2; i++) {
      const w = resolveTieWinner(undefined, getFix(sau, `sau_kc_r1_m${i}`));
      if (w) sau = assignSingleLegSlots(sau, `sau_kc_r16_m${i}`, undefined, w);
    }
    result.wl_cup_sau = syncFromR16ToFinal(sau, 'sau_kc');
  }

  // 7. Copa do Imperador (Japão: 4 R1 -> R16 m0..m3 away)
  if (result.wl_cup_jpn) {
    let jpn = [...result.wl_cup_jpn];
    for (let i = 0; i < 4; i++) {
      const w = resolveTieWinner(undefined, getFix(jpn, `jpn_emp_r1_m${i}`));
      if (w) jpn = assignSingleLegSlots(jpn, `jpn_emp_r16_m${i}`, undefined, w);
    }
    result.wl_cup_jpn = syncFromR16ToFinal(jpn, 'jpn_emp');
  }

  // 8. Copa da Rússia (R16 -> QF -> SF Ida/Volta -> Final)
  if (result.wl_cup_rus) {
    let rus = [...result.wl_cup_rus];
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(rus, `rus_cup_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(rus, `rus_cup_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        rus = assignSingleLegSlots(rus, `rus_cup_qf_m${i}`, w0, w1);
        rus = updateStadiumIfKnown(rus, `rus_cup_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(rus, `rus_cup_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(rus, `rus_cup_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        rus = assignTwoLeggedSlots(rus, `rus_cup_sf_m${i}_ida`, `rus_cup_sf_m${i}_volta`, w0, w1);
        rus = updateStadiumIfKnown(rus, `rus_cup_sf_m${i}_ida`, w0);
        rus = updateStadiumIfKnown(rus, `rus_cup_sf_m${i}_volta`, w1);
      }
    }
    const sf0 = resolveTieWinner(getFix(rus, 'rus_cup_sf_m0_ida'), getFix(rus, 'rus_cup_sf_m0_volta'));
    const sf1 = resolveTieWinner(getFix(rus, 'rus_cup_sf_m1_ida'), getFix(rus, 'rus_cup_sf_m1_volta'));
    if (sf0 || sf1) {
      rus = assignSingleLegSlots(rus, 'rus_cup_final', sf0, sf1);
    }
    result.wl_cup_rus = rus;
  }

  return result;
}

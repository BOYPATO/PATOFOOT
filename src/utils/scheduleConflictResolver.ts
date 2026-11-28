import {
  Club,
  EuropeanCupId,
  EuropeanLeagueId,
  Fixture,
  GameSave,
  SouthAmericanCupId,
  SouthAmericanLeagueId,
  WorldCupId,
  WorldLeagueId,
} from '../types/game';
import { isDateInFifaPause } from './calendarUtils';
import { isSplitCalendarClub, isSplitYearWorldLeague } from './worldLeaguesEngine';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/**
 * Regra oficial de intervalo mínimo entre partidas de um mesmo clube (Art. 25 RGC/CBF & FIFA):
 * Nenhum clube pode entrar em campo antes de completar 66 horas de intervalo entre dois jogos.
 */
export const MIN_MATCH_REST_HOURS = 66;
export const MIN_MATCH_REST_MINUTES = MIN_MATCH_REST_HOURS * 60; // 3.960 minutos
export const IDEAL_MATCH_REST_HOURS = 90;
export const IDEAL_MATCH_REST_MINUTES = IDEAL_MATCH_REST_HOURS * 60; // 5.400 minutos (~3,75 dias)

const MINUTES_PER_DAY = 1440;
const MS_PER_DAY = 86_400_000;

const SPLIT_YEAR_WORLD_CUP_SET = new Set<string>(['wl_cup_sau', 'wl_cup_rus', 'wl_cup_egy', 'wl_cup_mar']);

// ============================================================================
// Country / Confederation Calendar Scopes for Global Competition Date Recognition
// ============================================================================
const EU_COUNTRY_SCOPES: readonly string[] = [
  'ENG',
  'ESP',
  'ITA',
  'GER',
  'FRA',
  'POR',
  'NED',
  'BEL',
  'TUR',
  'GRE',
  'NOR',
  'DEN',
  'SUI',
  'SWE',
  'SCO',
  'SP1',
  'SP2',
];

const SA_COUNTRY_SCOPES: readonly string[] = [
  'BRA',
  'ARG',
  'COL',
  'URU',
  'ECU',
  'CHI',
  'PAR',
  'PER',
  'BOL',
  'VEN',
];

const CONCACAF_COUNTRY_SCOPES: readonly string[] = ['USA', 'MEX', 'CAN'];
const AFC_COUNTRY_SCOPES: readonly string[] = ['SAU', 'JPN'];
const OTHER_WORLD_COUNTRY_SCOPES: readonly string[] = ['RUS', 'EGY', 'MAR'];

const ALL_COUNTRY_SCOPES: readonly string[] = [
  ...EU_COUNTRY_SCOPES,
  ...SA_COUNTRY_SCOPES,
  ...CONCACAF_COUNTRY_SCOPES,
  ...AFC_COUNTRY_SCOPES,
  ...OTHER_WORLD_COUNTRY_SCOPES,
];

const EU_LEAGUE_TO_SCOPE: Record<string, string> = {
  eng_premier: 'ENG',
  eng_championship: 'ENG',
  eng_league_one: 'ENG',
  eng_league_two: 'ENG',
  esp_laliga: 'ESP',
  esp_laliga2: 'ESP',
  ita_serie_a: 'ITA',
  ita_serie_b: 'ITA',
  ger_bundesliga: 'GER',
  ger_bundesliga2: 'GER',
  fra_ligue1: 'FRA',
  fra_ligue2: 'FRA',
  por_primeira: 'POR',
  ned_eredivisie: 'NED',
  bel_pro_league: 'BEL',
  tur_super_lig: 'TUR',
  gre_super_league: 'GRE',
  nor_eliteserien: 'NOR',
  den_superliga: 'DEN',
  sui_super_league: 'SUI',
  swe_allsvenskan: 'SWE',
  sco_premiership: 'SCO',
  eu_special_1: 'SP1',
  eu_special_2: 'SP2',
};

const EU_CUP_TO_SCOPE: Record<string, string> = {
  esp_copa_del_rey: 'ESP',
  esp_supercopa: 'ESP',
  ger_dfb_pokal: 'GER',
  ger_supercup: 'GER',
  fra_coupe_de_france: 'FRA',
  fra_trophee_champions: 'FRA',
  ita_coppa_italia: 'ITA',
  ita_supercoppa: 'ITA',
  por_taca_portugal: 'POR',
  por_taca_liga: 'POR',
  por_supertaca: 'POR',
  ned_knvb_beker: 'NED',
  ned_johan_cruyff: 'NED',
  bel_croky_cup: 'BEL',
  bel_supercup: 'BEL',
  tur_turkiye_kupasi: 'TUR',
  tur_super_kupa: 'TUR',
  gre_kypello_elladas: 'GRE',
  nor_nm_cup: 'NOR',
  den_dbu_pokalen: 'DEN',
  sui_schweizer_cup: 'SUI',
  swe_svenska_cupen: 'SWE',
  sco_scottish_cup: 'SCO',
  eu_sp1_cup: 'SP1',
  eu_sp2_cup: 'SP2',
};

const SA_LEAGUE_TO_SCOPE: Record<string, string> = {
  liga_arg: 'ARG',
  liga_col: 'COL',
  liga_uru: 'URU',
  liga_equ: 'ECU',
  liga_chi: 'CHI',
  liga_par: 'PAR',
  liga_per: 'PER',
  liga_bol: 'BOL',
  liga_ven: 'VEN',
};

const SA_CUP_TO_SCOPE: Record<string, string> = {
  sa_copa_argentina: 'ARG',
  sa_supercopa_argentina: 'ARG',
  sa_copa_colombia: 'COL',
  sa_superliga_colombia: 'COL',
  sa_copa_uruguay: 'URU',
  sa_supercopa_uruguay: 'URU',
  sa_copa_ecuador: 'ECU',
  sa_supercopa_ecuador: 'ECU',
  sa_copa_chile: 'CHI',
  sa_supercopa_chile: 'CHI',
  sa_copa_paraguay: 'PAR',
  sa_supercopa_paraguay: 'PAR',
  sa_copa_peru: 'PER',
  sa_supercopa_peru: 'PER',
  sa_copa_bolivia: 'BOL',
  sa_supercopa_bolivia: 'BOL',
  sa_copa_venezuela: 'VEN',
  sa_supercopa_venezuela: 'VEN',
};

const WL_LEAGUE_TO_SCOPE: Record<string, string> = {
  usa_mls: 'USA',
  mex_ligamx: 'MEX',
  can_cpl: 'CAN',
  sau_pro: 'SAU',
  jpn_j1: 'JPN',
  rus_premier: 'RUS',
  egy_premier: 'EGY',
  mar_botola: 'MAR',
};

const WL_CUP_TO_SCOPE: Record<string, string> = {
  wl_cup_usa: 'USA',
  wl_cup_mex: 'MEX',
  wl_cup_can: 'CAN',
  wl_cup_sau: 'SAU',
  wl_cup_jpn: 'JPN',
  wl_cup_rus: 'RUS',
  wl_cup_egy: 'EGY',
  wl_cup_mar: 'MAR',
};

const COUNTRY_NAME_TO_SCOPE: Record<string, string> = {
  Brasil: 'BRA',
  Inglaterra: 'ENG',
  'País de Gales': 'ENG',
  Espanha: 'ESP',
  Itália: 'ITA',
  Alemanha: 'GER',
  França: 'FRA',
  Portugal: 'POR',
  Holanda: 'NED',
  Bélgica: 'BEL',
  Turquia: 'TUR',
  Grécia: 'GRE',
  Noruega: 'NOR',
  Dinamarca: 'DEN',
  Suíça: 'SUI',
  Suécia: 'SWE',
  Escócia: 'SCO',
  Argentina: 'ARG',
  Colômbia: 'COL',
  Uruguai: 'URU',
  Equador: 'ECU',
  Chile: 'CHI',
  Paraguai: 'PAR',
  Peru: 'PER',
  Bolívia: 'BOL',
  Venezuela: 'VEN',
  'Estados Unidos': 'USA',
  México: 'MEX',
  Canadá: 'CAN',
  'Arábia Saudita': 'SAU',
  Japão: 'JPN',
  Rússia: 'RUS',
  Egito: 'EGY',
  Marrocos: 'MAR',
};

function resolveClubScope(club?: Club | null): string | null {
  if (!club) return null;
  if (club.europeanLeagueId && EU_LEAGUE_TO_SCOPE[club.europeanLeagueId]) {
    return EU_LEAGUE_TO_SCOPE[club.europeanLeagueId];
  }
  if (club.southAmericanLeagueId && SA_LEAGUE_TO_SCOPE[club.southAmericanLeagueId]) {
    return SA_LEAGUE_TO_SCOPE[club.southAmericanLeagueId];
  }
  if (club.worldLeagueId && WL_LEAGUE_TO_SCOPE[club.worldLeagueId]) {
    return WL_LEAGUE_TO_SCOPE[club.worldLeagueId];
  }
  if (club.division === 'A' || club.division === 'B' || club.division === 'C' || club.division === 'D' || club.division === 'EST') {
    return 'BRA';
  }
  if (club.country && COUNTRY_NAME_TO_SCOPE[club.country]) {
    return COUNTRY_NAME_TO_SCOPE[club.country];
  }
  return null;
}

// ============================================================================
// High-speed integer UTC day-index & kickoff-slot caches (eliminates hot-loop Date/RegExp allocations)
// ============================================================================
const isoToDayIdxCache = new Map<string, number>();
const dayIdxToIsoCache = new Map<number, string>();
const timeMinutesCache = new Map<string, number>();
const fifaPauseCache = new Map<string, boolean>();

interface KickoffSlotCandidate {
  time: string;
  mins: number;
}

const kickoffCandidatesCache = new Map<string, KickoffSlotCandidate[]>();

function isoDateToDayIdx(dateStr: string): number {
  let cached = isoToDayIdxCache.get(dateStr);
  if (cached !== undefined) return cached;
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  const d = Number(dateStr.slice(8, 10));
  cached = Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
  isoToDayIdxCache.set(dateStr, cached);
  dayIdxToIsoCache.set(cached, dateStr);
  return cached;
}

function dayIdxToIsoDate(dayIdx: number): string {
  let cached = dayIdxToIsoCache.get(dayIdx);
  if (cached !== undefined) return cached;
  const dt = new Date(dayIdx * MS_PER_DAY);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  cached = `${y}-${m < 10 ? '0' : ''}${m}-${d < 10 ? '0' : ''}${d}`;
  dayIdxToIsoCache.set(dayIdx, cached);
  isoToDayIdxCache.set(cached, dayIdx);
  return cached;
}

/** 1970-01-01 was Thursday (4); returns 0=Sun .. 6=Sat with zero Date allocations. */
function dayIdxToDow(dayIdx: number): number {
  return (((dayIdx + 4) % 7) + 7) % 7;
}

function defaultKickoffForDow(dow: number): string {
  if (dow === 0) return '16:00';
  if (dow === 6) return '16:30';
  return '19:30';
}

function parseValidTimeToMinutes(timeStr: string): number {
  let cached = timeMinutesCache.get(timeStr);
  if (cached !== undefined) return cached;
  const m = TIME_RE.exec(timeStr);
  if (!m) {
    cached = 16 * 60;
  } else {
    const hh = Math.max(0, Math.min(23, Number(m[1])));
    const mm = Math.max(0, Math.min(59, Number(m[2])));
    cached = hh * 60 + mm;
  }
  timeMinutesCache.set(timeStr, cached);
  return cached;
}

function isDayIdxInFifaPauseCached(
  dayIdx: number,
  region: 'europe' | 'south_america' | 'all'
): boolean {
  const key = `${dayIdx}|${region}`;
  let cached = fifaPauseCache.get(key);
  if (cached !== undefined) return cached;
  cached = isDateInFifaPause(dayIdxToIsoDate(dayIdx), region);
  fifaPauseCache.set(key, cached);
  return cached;
}

type FlatFixturePoolKey =
  | 'fixturesSuperMundial'
  | 'fixturesIntercontinental'
  | 'fixturesSupercopa'
  | 'fixturesRecopa'
  | 'fixturesUefaSupercup'
  | 'fixturesEngCommunityShield'
  | 'fixturesChampionsLeague'
  | 'fixturesEuropaLeague'
  | 'fixturesConferenceLeague'
  | 'fixturesLibertadores'
  | 'fixturesSulamericana'
  | 'fixturesConcacafChampions'
  | 'fixturesAfcChampions'
  | 'fixturesCopaInternacional'
  | 'fixturesCopaBrasil'
  | 'fixturesEngFaCup'
  | 'fixturesEngEflCup'
  | 'fixturesCopaNordeste'
  | 'fixturesCopaVerde'
  | 'fixturesA'
  | 'fixturesB'
  | 'fixturesC'
  | 'fixturesD'
  | 'fixturesEstadual'
  | 'fixturesFriendlies';

type RecordFixturePoolKey =
  | 'fixturesEuropeanCups'
  | 'fixturesSouthAmericanCups'
  | 'fixturesWorldCups'
  | 'fixturesEurope'
  | 'fixturesSouthAmerica'
  | 'fixturesWorldLeagues';

interface PoolMeta {
  priority: number;
  region: 'europe' | 'south_america' | 'all';
  calendarKind: 'sa' | 'eu';
  /** Calendar country scopes that must recognize this competition's dates */
  scopes: readonly string[];
  /** Competition category key: fixtures with DIFFERENT categories in the same scope cannot share the same calendar day */
  category: string;
  /** True for knockout / cup competitions where earlier rounds must always finish before later rounds */
  isCup: boolean;
  /** Unique competition key used to track knockout round chronology */
  compKey: string;
}

interface FixtureEntry {
  kind: 'flat' | 'record';
  poolKey: FlatFixturePoolKey | RecordFixturePoolKey;
  recordKey?: string;
  index: number;
  fixture: Fixture;
  meta: PoolMeta;
}

const FLAT_POOL_DESCRIPTORS: ReadonlyArray<{
  key: FlatFixturePoolKey;
  meta: PoolMeta;
}> = [
  {
    key: 'fixturesSuperMundial',
    meta: {
      priority: 100,
      region: 'all',
      calendarKind: 'sa',
      scopes: ALL_COUNTRY_SCOPES,
      category: 'intl:super_mundial',
      isCup: true,
      compKey: 'super_mundial_clubes',
    },
  },
  {
    key: 'fixturesIntercontinental',
    meta: {
      priority: 98,
      region: 'all',
      calendarKind: 'sa',
      scopes: ALL_COUNTRY_SCOPES,
      category: 'intl:intercontinental',
      isCup: true,
      compKey: 'intercontinental',
    },
  },
  {
    key: 'fixturesUefaSupercup',
    meta: {
      priority: 96,
      region: 'europe',
      calendarKind: 'eu',
      scopes: EU_COUNTRY_SCOPES,
      category: 'intl:uefa_supercup',
      isCup: true,
      compKey: 'uefa_supercup',
    },
  },
  {
    key: 'fixturesRecopa',
    meta: {
      priority: 96,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: SA_COUNTRY_SCOPES,
      category: 'intl:recopa',
      isCup: true,
      compKey: 'recopa_sulamericana',
    },
  },
  {
    key: 'fixturesChampionsLeague',
    meta: {
      priority: 90,
      region: 'europe',
      calendarKind: 'eu',
      scopes: EU_COUNTRY_SCOPES,
      category: 'intl:ucl',
      isCup: true,
      compKey: 'champions_league',
    },
  },
  {
    key: 'fixturesEuropaLeague',
    meta: {
      priority: 88,
      region: 'europe',
      calendarKind: 'eu',
      scopes: EU_COUNTRY_SCOPES,
      category: 'intl:uel_uecl',
      isCup: true,
      compKey: 'europa_league',
    },
  },
  {
    key: 'fixturesConferenceLeague',
    meta: {
      priority: 87,
      region: 'europe',
      calendarKind: 'eu',
      scopes: EU_COUNTRY_SCOPES,
      category: 'intl:uel_uecl',
      isCup: true,
      compKey: 'conference_league',
    },
  },
  {
    key: 'fixturesLibertadores',
    meta: {
      priority: 90,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: SA_COUNTRY_SCOPES,
      category: 'intl:conmebol',
      isCup: true,
      compKey: 'libertadores',
    },
  },
  {
    key: 'fixturesSulamericana',
    meta: {
      priority: 88,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: SA_COUNTRY_SCOPES,
      category: 'intl:conmebol',
      isCup: true,
      compKey: 'sulamericana',
    },
  },
  {
    key: 'fixturesConcacafChampions',
    meta: {
      priority: 88,
      region: 'all',
      calendarKind: 'sa',
      scopes: CONCACAF_COUNTRY_SCOPES,
      category: 'intl:concacaf',
      isCup: true,
      compKey: 'concacaf_champions',
    },
  },
  {
    key: 'fixturesAfcChampions',
    meta: {
      priority: 88,
      region: 'all',
      calendarKind: 'eu',
      scopes: AFC_COUNTRY_SCOPES,
      category: 'intl:afc',
      isCup: true,
      compKey: 'afc_champions',
    },
  },
  {
    key: 'fixturesCopaInternacional',
    meta: {
      priority: 86,
      region: 'all',
      calendarKind: 'sa',
      scopes: OTHER_WORLD_COUNTRY_SCOPES,
      category: 'intl:copa_internacional',
      isCup: true,
      compKey: 'copa_internacional',
    },
  },
  {
    key: 'fixturesSupercopa',
    meta: {
      priority: 84,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: ['BRA'],
      category: 'cup:supercopa_brasil',
      isCup: true,
      compKey: 'supercopa_brasil',
    },
  },
  {
    key: 'fixturesEngCommunityShield',
    meta: {
      priority: 84,
      region: 'europe',
      calendarKind: 'eu',
      scopes: ['ENG'],
      category: 'cup:eng_community_shield',
      isCup: true,
      compKey: 'eng_community_shield',
    },
  },
  {
    key: 'fixturesCopaBrasil',
    meta: {
      priority: 75,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: ['BRA'],
      category: 'cup:copa_brasil',
      isCup: true,
      compKey: 'copa_brasil',
    },
  },
  {
    key: 'fixturesEngFaCup',
    meta: {
      priority: 75,
      region: 'europe',
      calendarKind: 'eu',
      scopes: ['ENG'],
      category: 'cup:eng_fa_cup',
      isCup: true,
      compKey: 'eng_fa_cup',
    },
  },
  {
    key: 'fixturesEngEflCup',
    meta: {
      priority: 74,
      region: 'europe',
      calendarKind: 'eu',
      scopes: ['ENG'],
      category: 'cup:eng_efl_cup',
      isCup: true,
      compKey: 'eng_efl_cup',
    },
  },
  {
    key: 'fixturesCopaNordeste',
    meta: {
      priority: 70,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: ['BRA'],
      category: 'cup:copa_nordeste',
      isCup: true,
      compKey: 'copa_nordeste',
    },
  },
  {
    key: 'fixturesCopaVerde',
    meta: {
      priority: 69,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: ['BRA'],
      category: 'cup:copa_verde',
      isCup: true,
      compKey: 'copa_verde',
    },
  },
  {
    key: 'fixturesA',
    meta: {
      priority: 50,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: ['BRA'],
      category: 'league',
      isCup: false,
      compKey: 'serie_a',
    },
  },
  {
    key: 'fixturesB',
    meta: {
      priority: 50,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: ['BRA'],
      category: 'league',
      isCup: false,
      compKey: 'serie_b',
    },
  },
  {
    key: 'fixturesC',
    meta: {
      priority: 50,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: ['BRA'],
      category: 'league',
      isCup: false,
      compKey: 'serie_c',
    },
  },
  {
    key: 'fixturesD',
    meta: {
      priority: 50,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: ['BRA'],
      category: 'league',
      isCup: false,
      compKey: 'serie_d',
    },
  },
  {
    key: 'fixturesEstadual',
    meta: {
      priority: 40,
      region: 'south_america',
      calendarKind: 'sa',
      scopes: ['BRA'],
      category: 'estadual',
      isCup: false,
      compKey: 'estadual',
    },
  },
  {
    key: 'fixturesFriendlies',
    meta: {
      priority: 10,
      region: 'all',
      calendarKind: 'sa',
      scopes: [],
      category: 'friendly',
      isCup: false,
      compKey: 'amistoso_internacional',
    },
  },
];

function isValidIsoDate(d?: unknown): d is string {
  return typeof d === 'string' && d.length === 10 && ISO_DATE_RE.test(d);
}

function isRealTeamId(tid?: unknown): tid is string {
  return typeof tid === 'string' && tid.length > 0 && tid !== 'tbd' && !tid.startsWith('TBD');
}

export function getDefaultKickoffTimeForDate(dateStr: string): string {
  return defaultKickoffForDow(dayIdxToDow(isoDateToDayIdx(dateStr)));
}

export function parseKickoffTimeToMinutes(timeStr: string | undefined, dateStr: string): number {
  const trimmed = timeStr ? timeStr.trim() : '';
  if (trimmed && TIME_RE.test(trimmed)) {
    return parseValidTimeToMinutes(trimmed);
  }
  return parseValidTimeToMinutes(getDefaultKickoffTimeForDate(dateStr));
}

/**
 * Converte (YYYY-MM-DD, HH:MM) em timestamp linear em minutos (UTC) para cálculo exato de 66 horas sem distorção de fuso/horário de verão.
 */
export function getFixtureTimestampMinutes(dateStr: string, timeStr?: string): number {
  const dayIdx = isoDateToDayIdx(dateStr);
  const trimmed = timeStr ? timeStr.trim() : '';
  const mins =
    trimmed && TIME_RE.test(trimmed)
      ? parseValidTimeToMinutes(trimmed)
      : parseValidTimeToMinutes(defaultKickoffForDow(dayIdxToDow(dayIdx)));
  return dayIdx * MINUTES_PER_DAY + mins;
}

/**
 * Retorna a diferença exata em horas entre duas partidas.
 */
export function getHoursBetweenFixtures(
  dateA: string,
  timeA: string | undefined,
  dateB: string,
  timeB: string | undefined
): number {
  return Math.abs(getFixtureTimestampMinutes(dateA, timeA) - getFixtureTimestampMinutes(dateB, timeB)) / 60;
}

/**
 * Verifica se duas partidas respeitam o intervalo mínimo regulamentar (padrão: 66 horas).
 */
export function meetsMinRestInterval(
  dateA: string,
  timeA: string | undefined,
  dateB: string,
  timeB: string | undefined,
  minHours: number = MIN_MATCH_REST_HOURS
): boolean {
  const minMinutes = Math.round(minHours * 60);
  return Math.abs(getFixtureTimestampMinutes(dateA, timeA) - getFixtureTimestampMinutes(dateB, timeB)) >= minMinutes;
}

function isDomesticSupercupKey(key: string): boolean {
  return (
    key.includes('super') ||
    key.includes('trophee') ||
    key.includes('johan_cruyff') ||
    key.includes('community')
  );
}

const recordMetaCache = new Map<string, PoolMeta>();

function getRecordPoolMeta(poolKey: RecordFixturePoolKey, recordKey: string): PoolMeta {
  const cacheKey = `${poolKey}::${recordKey}`;
  const cached = recordMetaCache.get(cacheKey);
  if (cached) return cached;

  let meta: PoolMeta;
  switch (poolKey) {
    case 'fixturesEuropeanCups': {
      const scope = EU_CUP_TO_SCOPE[recordKey] || 'EU';
      const isSuper = isDomesticSupercupKey(recordKey);
      meta = {
        priority: isSuper ? 84 : recordKey === 'por_taca_liga' ? 74 : 75,
        region: 'europe',
        calendarKind: 'eu',
        scopes: [scope],
        category: `cup:${recordKey}`,
        isCup: true,
        compKey: recordKey,
      };
      break;
    }
    case 'fixturesSouthAmericanCups': {
      const scope = SA_CUP_TO_SCOPE[recordKey] || 'SA';
      const isSuper = isDomesticSupercupKey(recordKey);
      meta = {
        priority: isSuper ? 84 : 75,
        region: 'south_america',
        calendarKind: 'sa',
        scopes: [scope],
        category: `cup:${recordKey}`,
        isCup: true,
        compKey: recordKey,
      };
      break;
    }
    case 'fixturesWorldCups': {
      const scope = WL_CUP_TO_SCOPE[recordKey] || 'WL';
      meta = {
        priority: 75,
        region: 'all',
        calendarKind: SPLIT_YEAR_WORLD_CUP_SET.has(recordKey) ? 'eu' : 'sa',
        scopes: [scope],
        category: `cup:${recordKey}`,
        isCup: true,
        compKey: recordKey,
      };
      break;
    }
    case 'fixturesEurope': {
      const scope = EU_LEAGUE_TO_SCOPE[recordKey] || 'EU';
      meta = {
        priority: 50,
        region: 'europe',
        calendarKind: 'eu',
        scopes: [scope],
        category: 'league',
        isCup: false,
        compKey: recordKey,
      };
      break;
    }
    case 'fixturesSouthAmerica': {
      const scope = SA_LEAGUE_TO_SCOPE[recordKey] || 'SA';
      meta = {
        priority: 50,
        region: 'south_america',
        calendarKind: 'sa',
        scopes: [scope],
        category: 'league',
        isCup: false,
        compKey: recordKey,
      };
      break;
    }
    case 'fixturesWorldLeagues': {
      const scope = WL_LEAGUE_TO_SCOPE[recordKey] || 'WL';
      meta = {
        priority: 50,
        region: 'all',
        calendarKind: isSplitYearWorldLeague(recordKey as WorldLeagueId) ? 'eu' : 'sa',
        scopes: [scope],
        category: 'league',
        isCup: false,
        compKey: recordKey,
      };
      break;
    }
  }

  recordMetaCache.set(cacheKey, meta);
  return meta;
}

function getEffectiveScopesForFixture(
  meta: PoolMeta,
  f: Fixture,
  clubScopeMap: Map<string, string>
): readonly string[] {
  if (meta.scopes.length > 0) return meta.scopes;
  // Friendlies: resolve dynamically from both clubs' country scopes
  const out: string[] = [];
  if (isRealTeamId(f.homeTeamId)) {
    const sc = clubScopeMap.get(f.homeTeamId);
    if (sc) out.push(sc);
  }
  if (isRealTeamId(f.awayTeamId)) {
    const sc = clubScopeMap.get(f.awayTeamId);
    if (sc && !out.includes(sc)) out.push(sc);
  }
  return out;
}

function getTwoLegTieKey(f: Fixture): string | null {
  if (f.leg !== 1 && f.leg !== 2) return null;
  if (!isRealTeamId(f.homeTeamId) || !isRealTeamId(f.awayTeamId)) return null;
  const pair =
    f.homeTeamId < f.awayTeamId
      ? `${f.homeTeamId}__${f.awayTeamId}`
      : `${f.awayTeamId}__${f.homeTeamId}`;
  return `${f.competition}::${f.cupPhase || f.round}::${pair}`;
}

function adjustKickoffTimeForDow(dow: number, originalTime?: string): string {
  const isMidweek = dow >= 1 && dow <= 5;
  if (isMidweek) {
    if (!originalTime || originalTime === '16:00' || originalTime === '16:30' || originalTime === '11:00') {
      return '19:30';
    }
    return originalTime;
  }
  if (!originalTime || originalTime === '21:30' || originalTime === '21:00' || originalTime === '20:00') {
    return dow === 6 ? '16:30' : '16:00';
  }
  return originalTime;
}

const MIDWEEK_BASE_SLOTS = ['19:30', '20:00', '21:00', '21:30', '19:00', '16:00', '22:00'];
const SATURDAY_BASE_SLOTS = ['16:30', '18:30', '16:00', '19:30', '20:00', '21:00', '21:30', '14:00', '11:00'];
const SUNDAY_BASE_SLOTS = ['16:00', '18:30', '16:30', '19:30', '20:00', '21:00', '21:30', '14:00', '11:00'];

function getKickoffCandidatesForDow(
  dow: number,
  originalTime?: string
): KickoffSlotCandidate[] {
  const dowBucket = dow === 0 ? 0 : dow === 6 ? 6 : 1;
  const cacheKey = `${dowBucket}|${originalTime || ''}`;
  let cached = kickoffCandidatesCache.get(cacheKey);
  if (cached) return cached;

  const preferred = adjustKickoffTimeForDow(dow, originalTime);
  const baseSlots =
    dowBucket === 1 ? MIDWEEK_BASE_SLOTS : dowBucket === 6 ? SATURDAY_BASE_SLOTS : SUNDAY_BASE_SLOTS;

  const seen = new Set<string>();
  const out: KickoffSlotCandidate[] = [];
  const pushSlot = (t?: string) => {
    if (!t || seen.has(t) || !TIME_RE.test(t)) return;
    seen.add(t);
    out.push({ time: t, mins: parseValidTimeToMinutes(t) });
  };

  pushSlot(preferred);
  pushSlot(originalTime);
  for (let i = 0; i < baseSlots.length; i++) {
    pushSlot(baseSlots[i]);
  }

  kickoffCandidatesCache.set(cacheKey, out);
  return out;
}

function getOrCreateArray<T>(map: Map<string, T[]>, key: string): T[] {
  let arr = map.get(key);
  if (!arr) {
    arr = [];
    map.set(key, arr);
  }
  return arr;
}

// ============================================================================
// O(1) Competition-Day Index: scope -> (dayIdx -> Set<category>)
// ============================================================================
type ScopeDayCategoryIndex = Map<string, Map<number, Set<string>>>;

function addScopeDayCategory(
  index: ScopeDayCategoryIndex,
  scopes: readonly string[],
  dayIdx: number,
  category: string
): void {
  for (let i = 0; i < scopes.length; i++) {
    const scope = scopes[i];
    let dayMap = index.get(scope);
    if (!dayMap) {
      dayMap = new Map<number, Set<string>>();
      index.set(scope, dayMap);
    }
    let catSet = dayMap.get(dayIdx);
    if (!catSet) {
      catSet = new Set<string>();
      dayMap.set(dayIdx, catSet);
    }
    catSet.add(category);
  }
}

function hasCompetitionDayConflict(
  index: ScopeDayCategoryIndex,
  scopes: readonly string[],
  dayIdx: number,
  category: string
): boolean {
  for (let i = 0; i < scopes.length; i++) {
    const dayMap = index.get(scopes[i]);
    if (!dayMap) continue;
    const catSet = dayMap.get(dayIdx);
    if (!catSet || catSet.size === 0) continue;
    if (catSet.size > 1 || !catSet.has(category)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Day-bucketed O(1) team timestamp index: teamId -> (dayIdx -> timestamps[])
// ============================================================================
type TeamDayBucketIndex = Map<string, Map<number, number[]>>;

function addTeamBucketTimestamp(
  index: TeamDayBucketIndex,
  teamId: string,
  dayIdx: number,
  ts: number
): void {
  let dayMap = index.get(teamId);
  if (!dayMap) {
    dayMap = new Map<number, number[]>();
    index.set(teamId, dayMap);
  }
  let arr = dayMap.get(dayIdx);
  if (!arr) {
    arr = [ts];
    dayMap.set(dayIdx, arr);
  } else {
    arr.push(ts);
  }
}

function hasAnyTeamConflictAtTimestamp(
  teamBuckets: TeamDayBucketIndex,
  teams: string[],
  candDayIdx: number,
  candidateTs: number,
  minGapMinutes: number,
  dayRadius: number
): boolean {
  if (teams.length === 0) return false;
  const minD = candDayIdx - dayRadius;
  const maxD = candDayIdx + dayRadius;
  for (let tIdx = 0; tIdx < teams.length; tIdx++) {
    const dayMap = teamBuckets.get(teams[tIdx]);
    if (!dayMap) continue;
    for (let d = minD; d <= maxD; d++) {
      const list = dayMap.get(d);
      if (!list) continue;
      for (let i = 0; i < list.length; i++) {
        if (Math.abs(candidateTs - list[i]) < minGapMinutes) {
          return true;
        }
      }
    }
  }
  return false;
}

function pickValidKickoffOnDayIdx(
  candDayIdx: number,
  originalTime: string | undefined,
  teams: string[],
  teamBuckets: TeamDayBucketIndex,
  minGapMinutes: number,
  dayRadius: number,
  minAllowedTs: number
): { dayIdx: number; time: string; ts: number } | null {
  const dow = dayIdxToDow(candDayIdx);
  const slots = getKickoffCandidatesForDow(dow, originalTime);
  const baseMin = candDayIdx * MINUTES_PER_DAY;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const ts = baseMin + slot.mins;
    if (ts < minAllowedTs) continue;
    if (!hasAnyTeamConflictAtTimestamp(teamBuckets, teams, candDayIdx, ts, minGapMinutes, dayRadius)) {
      return { dayIdx: candDayIdx, time: slot.time, ts };
    }
  }
  return null;
}

function buildSearchOffsets(maxForward: number, maxBackward: number): number[] {
  const offsets: number[] = [];
  const nearForward = Math.min(10, maxForward);
  for (let d = 1; d <= nearForward; d++) offsets.push(d);
  const nearBack = Math.min(4, maxBackward);
  for (let d = 1; d <= nearBack; d++) offsets.push(-d);
  for (let d = nearForward + 1; d <= maxForward; d++) offsets.push(d);
  for (let d = nearBack + 1; d <= maxBackward; d++) offsets.push(-d);
  return offsets;
}

const TIER1_OFFSETS = buildSearchOffsets(45, 14);
const TIER2_OFFSETS = buildSearchOffsets(75, 28);
const TIER3_OFFSETS = buildSearchOffsets(365, 180);

const TIER1_OFFSETS_RESCUE = [0, ...TIER1_OFFSETS];
const TIER2_OFFSETS_RESCUE = [0, ...TIER2_OFFSETS];
const TIER3_OFFSETS_RESCUE = [0, ...TIER3_OFFSETS];

const MIN_REST_DAY_RADIUS = Math.ceil(MIN_MATCH_REST_MINUTES / MINUTES_PER_DAY); // 3
const IDEAL_REST_DAY_RADIUS = Math.ceil(IDEAL_MATCH_REST_MINUTES / MINUTES_PER_DAY); // 4

function findBestRescheduleSlot(params: {
  origDayIdx: number;
  origTime?: string;
  floorDayIdx: number;
  minAllowedTs: number;
  seasonMinDayIdx: number;
  seasonMaxDayIdx: number;
  teams: string[];
  region: 'europe' | 'south_america' | 'all';
  teamBuckets: TeamDayBucketIndex;
  scopes: readonly string[];
  category: string;
  scopeDayCategories: ScopeDayCategoryIndex;
}): { date: string; dayIdx: number; time: string; ts: number } {
  const {
    origDayIdx,
    origTime,
    floorDayIdx,
    minAllowedTs,
    seasonMinDayIdx,
    seasonMaxDayIdx,
    teams,
    region,
    teamBuckets,
    scopes,
    category,
    scopeDayCategories,
  } = params;
  const effectiveMinIdx = floorDayIdx > seasonMinDayIdx ? floorDayIdx : seasonMinDayIdx;
  const isOverdueRescue = origDayIdx < effectiveMinIdx;
  const anchorDayIdx = isOverdueRescue ? effectiveMinIdx : origDayIdx;

  // Step 0: Se a data original NÃO tem conflito de competição no mesmo dia e comportar >= 66h apenas ajustando horário,
  // mantém o jogo no mesmo dia alterando somente o horário.
  if (
    !isOverdueRescue &&
    origDayIdx >= effectiveMinIdx &&
    origDayIdx <= seasonMaxDayIdx &&
    !hasCompetitionDayConflict(scopeDayCategories, scopes, origDayIdx, category)
  ) {
    const sameDaySlot = pickValidKickoffOnDayIdx(
      origDayIdx,
      origTime,
      teams,
      teamBuckets,
      MIN_MATCH_REST_MINUTES,
      MIN_REST_DAY_RADIUS,
      minAllowedTs
    );
    if (sameDaySlot) {
      return { ...sameDaySlot, date: dayIdxToIsoDate(sameDaySlot.dayIdx) };
    }
  }

  const tryPass = (
    offsets: number[],
    minGapMinutes: number,
    dayRadius: number,
    avoidFifaPause: boolean,
    enforceSeasonMax: boolean,
    avoidCompetitionDayConflict: boolean
  ): { date: string; dayIdx: number; time: string; ts: number } | null => {
    for (let i = 0; i < offsets.length; i++) {
      const candDayIdx = anchorDayIdx + offsets[i];
      if (candDayIdx < effectiveMinIdx) continue;
      if (enforceSeasonMax && candDayIdx > seasonMaxDayIdx) continue;
      if (avoidFifaPause && isDayIdxInFifaPauseCached(candDayIdx, region)) continue;
      if (
        avoidCompetitionDayConflict &&
        hasCompetitionDayConflict(scopeDayCategories, scopes, candDayIdx, category)
      ) {
        continue;
      }
      const slot = pickValidKickoffOnDayIdx(
        candDayIdx,
        origTime,
        teams,
        teamBuckets,
        minGapMinutes,
        dayRadius,
        minAllowedTs
      );
      if (slot) {
        return { ...slot, date: dayIdxToIsoDate(slot.dayIdx) };
      }
    }
    return null;
  };

  // Tier 1: ZERO conflito de competição no mesmo dia + descanso ideal (>= 90h) + fora de Data FIFA + dentro da temporada
  const t1 = tryPass(
    isOverdueRescue ? TIER1_OFFSETS_RESCUE : TIER1_OFFSETS,
    IDEAL_MATCH_REST_MINUTES,
    IDEAL_REST_DAY_RADIUS,
    true,
    true,
    true
  );
  if (t1) return t1;

  // Tier 2: ZERO conflito de competição no mesmo dia + regra oficial 66h + fora de Data FIFA + dentro da temporada
  const t2 = tryPass(
    isOverdueRescue ? TIER2_OFFSETS_RESCUE : TIER2_OFFSETS,
    MIN_MATCH_REST_MINUTES,
    MIN_REST_DAY_RADIUS,
    true,
    true,
    true
  );
  if (t2) return t2;

  // Tier 3: ZERO conflito de competição no mesmo dia + regra oficial 66h em toda a janela da temporada (incl. Data FIFA se necessário)
  const t3 = tryPass(
    isOverdueRescue ? TIER3_OFFSETS_RESCUE : TIER3_OFFSETS,
    MIN_MATCH_REST_MINUTES,
    MIN_REST_DAY_RADIUS,
    false,
    true,
    true
  );
  if (t3) return t3;

  // Tier 4: ZERO conflito de competição no mesmo dia + regra oficial 66h expandindo além do limite da temporada se necessário
  for (let d = 0; d <= 420; d++) {
    const candDayIdx = anchorDayIdx + d;
    if (candDayIdx < effectiveMinIdx) continue;
    if (hasCompetitionDayConflict(scopeDayCategories, scopes, candDayIdx, category)) continue;
    const slot = pickValidKickoffOnDayIdx(
      candDayIdx,
      origTime,
      teams,
      teamBuckets,
      MIN_MATCH_REST_MINUTES,
      MIN_REST_DAY_RADIUS,
      minAllowedTs
    );
    if (slot) {
      return { ...slot, date: dayIdxToIsoDate(slot.dayIdx) };
    }
  }

  // Tier 5: Fallback absoluto de 66h (somente se 420 dias seguidos estivessem ocupados)
  for (let d = 0; d <= 420; d++) {
    const candDayIdx = anchorDayIdx + d;
    if (candDayIdx < effectiveMinIdx) continue;
    const slot = pickValidKickoffOnDayIdx(
      candDayIdx,
      origTime,
      teams,
      teamBuckets,
      MIN_MATCH_REST_MINUTES,
      MIN_REST_DAY_RADIUS,
      minAllowedTs
    );
    if (slot) {
      return { ...slot, date: dayIdxToIsoDate(slot.dayIdx) };
    }
  }

  const fallbackDayIdx = anchorDayIdx + 3;
  const fallbackTime = adjustKickoffTimeForDow(dayIdxToDow(fallbackDayIdx), origTime);
  return {
    date: dayIdxToIsoDate(fallbackDayIdx),
    dayIdx: fallbackDayIdx,
    time: fallbackTime,
    ts: fallbackDayIdx * MINUTES_PER_DAY + parseValidTimeToMinutes(fallbackTime),
  };
}

function forEachFixtureInSave(
  state: GameSave,
  visitor: (
    kind: 'flat' | 'record',
    poolKey: FlatFixturePoolKey | RecordFixturePoolKey,
    recordKey: string | undefined,
    index: number,
    fixture: Fixture,
    meta: PoolMeta
  ) => boolean | void
): void {
  for (let p = 0; p < FLAT_POOL_DESCRIPTORS.length; p++) {
    const desc = FLAT_POOL_DESCRIPTORS[p];
    const list = state[desc.key] as Fixture[] | undefined;
    if (!Array.isArray(list) || list.length === 0) continue;
    for (let i = 0; i < list.length; i++) {
      if (visitor('flat', desc.key, undefined, i, list[i], desc.meta) === false) {
        return;
      }
    }
  }

  const recordKeys: RecordFixturePoolKey[] = [
    'fixturesEuropeanCups',
    'fixturesSouthAmericanCups',
    'fixturesWorldCups',
    'fixturesEurope',
    'fixturesSouthAmerica',
    'fixturesWorldLeagues',
  ];

  for (let p = 0; p < recordKeys.length; p++) {
    const poolKey = recordKeys[p];
    const recordObj = state[poolKey] as Record<string, Fixture[] | undefined> | undefined;
    if (!recordObj) continue;
    const rKeys = Object.keys(recordObj);
    for (let k = 0; k < rKeys.length; k++) {
      const rKey = rKeys[k];
      const list = recordObj[rKey];
      if (!Array.isArray(list) || list.length === 0) continue;
      const meta = getRecordPoolMeta(poolKey, rKey);
      for (let i = 0; i < list.length; i++) {
        if (visitor('record', poolKey, rKey, i, list[i], meta) === false) {
          return;
        }
      }
    }
  }
}

function buildClubScopeMap(clubs?: Club[]): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(clubs)) return map;
  for (let i = 0; i < clubs.length; i++) {
    const c = clubs[i];
    const sc = resolveClubScope(c);
    if (sc) map.set(c.id, sc);
  }
  return map;
}

export interface ScheduleConflictAuditReport {
  competitionDayConflicts: number;
  clubRestConflicts: number;
  totalResolvableConflicts: number;
  samples: string[];
}

/**
 * Auditoria completa de conflitos de calendário (mesmo dia entre competições do mesmo país/confederação
 * e violações da regra das 66h por clube). Útil para validação e diagnóstico.
 */
export function auditScheduleConflicts(state: GameSave): ScheduleConflictAuditReport {
  const clubScopeMap = buildClubScopeMap(state.clubs);
  // scope -> dayIdx -> Map<category, { hasUnplayed: boolean }>
  const scopeDayState = new Map<string, Map<number, Map<string, boolean>>>();
  const teamSlots = new Map<string, Array<{ ts: number; played: boolean; comp: string; date: string }>>();

  forEachFixtureInSave(state, (_kind, _poolKey, _recordKey, _index, f, meta) => {
    if (!isValidIsoDate(f.date)) return;
    const dayIdx = isoDateToDayIdx(f.date);
    const played = Boolean(f.played);
    const scopes = getEffectiveScopesForFixture(meta, f, clubScopeMap);

    for (let s = 0; s < scopes.length; s++) {
      const scope = scopes[s];
      let dayMap = scopeDayState.get(scope);
      if (!dayMap) {
        dayMap = new Map<number, Map<string, boolean>>();
        scopeDayState.set(scope, dayMap);
      }
      let catMap = dayMap.get(dayIdx);
      if (!catMap) {
        catMap = new Map<string, boolean>();
        dayMap.set(dayIdx, catMap);
      }
      const prev = catMap.get(meta.category) || false;
      catMap.set(meta.category, prev || !played);
    }

    const h = isRealTeamId(f.homeTeamId) ? f.homeTeamId : null;
    const a = isRealTeamId(f.awayTeamId) ? f.awayTeamId : null;
    if (h || a) {
      const ts = getFixtureTimestampMinutes(f.date, f.time);
      if (h) getOrCreateArray(teamSlots, h).push({ ts, played, comp: meta.compKey, date: f.date });
      if (a && a !== h) getOrCreateArray(teamSlots, a).push({ ts, played, comp: meta.compKey, date: f.date });
    }
  });

  let competitionDayConflicts = 0;
  let clubRestConflicts = 0;
  const samples: string[] = [];

  for (const [scope, dayMap] of scopeDayState.entries()) {
    for (const [dayIdx, catMap] of dayMap.entries()) {
      if (catMap.size < 2) continue;
      let anyUnplayed = false;
      for (const hasUnplayed of catMap.values()) {
        if (hasUnplayed) {
          anyUnplayed = true;
          break;
        }
      }
      if (!anyUnplayed) continue;
      competitionDayConflicts++;
      if (samples.length < 15) {
        samples.push(`[COMP ${scope}] ${dayIdxToIsoDate(dayIdx)}: ${[...catMap.keys()].join(' vs ')}`);
      }
    }
  }

  for (const [teamId, slots] of teamSlots.entries()) {
    if (slots.length < 2) continue;
    slots.sort((x, y) => x.ts - y.ts);
    for (let i = 0; i < slots.length - 1; i++) {
      if (slots[i + 1].ts - slots[i].ts < MIN_MATCH_REST_MINUTES) {
        if (!slots[i].played || !slots[i + 1].played) {
          clubRestConflicts++;
          if (samples.length < 15) {
            const hrs = ((slots[i + 1].ts - slots[i].ts) / 60).toFixed(1);
            samples.push(
              `[CLUB ${teamId}] ${slots[i].comp} (${slots[i].date}) vs ${slots[i + 1].comp} (${slots[i + 1].date}) = ${hrs}h`
            );
          }
        }
      }
    }
  }

  return {
    competitionDayConflicts,
    clubRestConflicts,
    totalResolvableConflicts: competitionDayConflicts + clubRestConflicts,
    samples,
  };
}

/**
 * Diagnóstico rápido O(N log k): detecta se QUALQUER país/ecossistema possui competições diferentes
 * (ligas nacionais, copas nacionais, estaduais e copas internacionais) marcadas no MESMO DIA,
 * ou se QUALQUER clube possui partidas violando o intervalo mínimo de 66 horas,
 * ordem inválida de ida/volta ou jogo atrasado do usuário.
 */
export function hasAnyUnplayedScheduleConflict(state: GameSave): boolean {
  const clubScopeMap = buildClubScopeMap(state.clubs);
  // scope -> dayIdx -> Map<category, hasUnplayed>
  const scopeDayState = new Map<string, Map<number, Map<string, boolean>>>();
  const teamSlots = new Map<string, Array<{ ts: number; played: boolean }>>();
  const leg1TsMap = new Map<string, number>();
  const leg2InfoMap = new Map<string, { ts: number; played: boolean }>();
  const currentDate = isValidIsoDate(state.currentDate) ? state.currentDate : null;
  let foundEarly = false;

  forEachFixtureInSave(state, (_kind, _poolKey, _recordKey, _index, f, meta) => {
    if (!isValidIsoDate(f.date)) return;
    const dayIdx = isoDateToDayIdx(f.date);
    const played = Boolean(f.played);

    // 1. Reconhecimento de conflito de datas entre competições no mesmo dia (inclui jogos TBD!)
    const scopes = getEffectiveScopesForFixture(meta, f, clubScopeMap);
    for (let s = 0; s < scopes.length; s++) {
      const scope = scopes[s];
      let dayMap = scopeDayState.get(scope);
      if (!dayMap) {
        dayMap = new Map<number, Map<string, boolean>>();
        scopeDayState.set(scope, dayMap);
      }
      let catMap = dayMap.get(dayIdx);
      if (!catMap) {
        catMap = new Map<string, boolean>();
        dayMap.set(dayIdx, catMap);
      }
      const prevUnplayed = catMap.get(meta.category) || false;
      catMap.set(meta.category, prevUnplayed || !played);
      if (catMap.size > 1) {
        // Só dispara se pelo menos uma das categorias em conflito tiver partida ainda não disputada
        for (const hasUnp of catMap.values()) {
          if (hasUnp) {
            foundEarly = true;
            return false;
          }
        }
      }
    }

    const h = isRealTeamId(f.homeTeamId) ? f.homeTeamId : null;
    const a = isRealTeamId(f.awayTeamId) ? f.awayTeamId : null;
    if (!h && !a) return;

    // 2. Detect any overdue unplayed user fixture (e.g. from legacy saves or late knockout unlock)
    if (
      !played &&
      currentDate &&
      h &&
      a &&
      (h === state.userClubId || a === state.userClubId) &&
      f.date < currentDate
    ) {
      foundEarly = true;
      return false;
    }

    const ts = getFixtureTimestampMinutes(f.date, f.time);

    if (h) {
      getOrCreateArray(teamSlots, h).push({ ts, played });
    }
    if (a && a !== h) {
      getOrCreateArray(teamSlots, a).push({ ts, played });
    }

    const tieKey = getTwoLegTieKey(f);
    if (tieKey) {
      if (f.leg === 1) {
        const l2 = leg2InfoMap.get(tieKey);
        if (l2 && !l2.played && l2.ts - ts < MIN_MATCH_REST_MINUTES) {
          foundEarly = true;
          return false;
        }
        leg1TsMap.set(tieKey, ts);
      } else if (f.leg === 2) {
        const l1Ts = leg1TsMap.get(tieKey);
        if (!played && l1Ts !== undefined && ts - l1Ts < MIN_MATCH_REST_MINUTES) {
          foundEarly = true;
          return false;
        }
        leg2InfoMap.set(tieKey, { ts, played });
      }
    }
  });

  if (foundEarly) return true;

  for (const slots of teamSlots.values()) {
    if (slots.length < 2) continue;
    slots.sort((x, y) => x.ts - y.ts);
    for (let i = 0; i < slots.length - 1; i++) {
      if (slots[i + 1].ts - slots[i].ts < MIN_MATCH_REST_MINUTES) {
        if (!slots[i].played || !slots[i + 1].played) {
          return true;
        }
      }
    }
  }

  return false;
}

/** Alias mantido para retrocompatibilidade */
export const hasAnyUnplayedSameDayConflict = hasAnyUnplayedScheduleConflict;

/**
 * Motor Global de Reconhecimento e Resolução de Conflitos de Calendário:
 *
 * 1. Reconhecimento de Datas entre Competições (por País & Confederação):
 *    Garante ZERO jogos no mesmo dia entre Ligas Nacionais, Copas Nacionais, Supercopas,
 *    Estaduais e Copas Internacionais (UEFA, CONMEBOL, CONCACAF, AFC e Mundiais),
 *    incluindo partidas de mata-mata ainda com clubes a definir (`TBD`).
 * 2. Regra Oficial das 66 Horas (Art. 25 RGC/CBF & FIFA):
 *    Nenhum clube joga duas partidas com intervalo inferior a 66 horas entre si.
 * 3. Ordem Cronológica de Fases & Ida/Volta:
 *    Preserva a sequência de rodadas de mata-mata e garante `Volta >= Ida + 66h`.
 *
 * - Fast-path (~3ms, zero alocações): retorna `state` por referência se o calendário já estiver 100% livre de conflitos.
 */
export function resolveCrossCompetitionScheduleConflicts(state: GameSave): GameSave {
  if (!state || !Array.isArray(state.clubs) || state.clubs.length === 0) {
    return state;
  }

  // Ultra-fast check before doing any allocations
  if (!hasAnyUnplayedScheduleConflict(state)) {
    return state;
  }

  const clubScopeMap = buildClubScopeMap(state.clubs);
  const userClub = state.clubs.find((c) => c.id === state.userClubId) || state.clubs[0];
  const isUserSplit = isSplitCalendarClub(userClub);
  const currentDate = isValidIsoDate(state.currentDate) ? state.currentDate : '2027-01-11';
  const currentDayIdx = isoDateToDayIdx(currentDate);
  const calYear = Number(currentDate.slice(0, 4)) || state.currentSeasonYear || 2027;

  const saYear = state.saSeasonYear ?? (isUserSplit ? calYear : state.currentSeasonYear || 2027);
  const euYear =
    state.europeSeasonYear ??
    (isUserSplit
      ? state.currentSeasonYear || 2026
      : currentDate < `${calYear}-07-20`
      ? calYear - 1
      : calYear);

  const saMinDayIdx = isoDateToDayIdx(`${saYear}-01-01`);
  const saMaxDayIdx = isoDateToDayIdx(`${saYear}-12-31`);
  const euMinDayIdx = isoDateToDayIdx(`${euYear}-07-10`);
  const euMaxDayIdx = isoDateToDayIdx(`${euYear + 1}-06-30`);

  const scopeDayCategories: ScopeDayCategoryIndex = new Map();
  const teamBuckets: TeamDayBucketIndex = new Map();
  const resolvedLeg1Ts = new Map<string, number>();
  // compKey -> (round -> maxDayIdx placed so far)
  const cupRoundMaxDay = new Map<string, Map<number, number>>();
  const unplayedEntries: FixtureEntry[] = [];

  const recordCupRoundDay = (compKey: string, round: number, dayIdx: number) => {
    let rMap = cupRoundMaxDay.get(compKey);
    if (!rMap) {
      rMap = new Map<number, number>();
      cupRoundMaxDay.set(compKey, rMap);
    }
    const prev = rMap.get(round);
    if (prev === undefined || dayIdx > prev) {
      rMap.set(round, dayIdx);
    }
  };

  const getPrevCupRoundMaxDay = (compKey: string, round: number): number | undefined => {
    const rMap = cupRoundMaxDay.get(compKey);
    if (!rMap) return undefined;
    let maxPrev: number | undefined;
    for (const [r, d] of rMap.entries()) {
      if (r < round && (maxPrev === undefined || d > maxPrev)) {
        maxPrev = d;
      }
    }
    return maxPrev;
  };

  forEachFixtureInSave(state, (kind, poolKey, recordKey, index, fixture, meta) => {
    if (!isValidIsoDate(fixture.date)) return;
    if (fixture.played) {
      const dayIdx = isoDateToDayIdx(fixture.date);
      const ts = getFixtureTimestampMinutes(fixture.date, fixture.time);
      const scopes = getEffectiveScopesForFixture(meta, fixture, clubScopeMap);
      addScopeDayCategory(scopeDayCategories, scopes, dayIdx, meta.category);
      if (meta.isCup && typeof fixture.round === 'number') {
        recordCupRoundDay(meta.compKey, fixture.round, dayIdx);
      }
      if (isRealTeamId(fixture.homeTeamId)) {
        addTeamBucketTimestamp(teamBuckets, fixture.homeTeamId, dayIdx, ts);
      }
      if (isRealTeamId(fixture.awayTeamId) && fixture.awayTeamId !== fixture.homeTeamId) {
        addTeamBucketTimestamp(teamBuckets, fixture.awayTeamId, dayIdx, ts);
      }
      const tieKey = getTwoLegTieKey(fixture);
      if (tieKey && fixture.leg === 1) {
        resolvedLeg1Ts.set(tieKey, ts);
      }
    } else {
      unplayedEntries.push({ kind, poolKey, recordKey, index, fixture, meta });
    }
  });

  // Sort unplayed fixtures:
  // 1. Higher priority competition keeps its date (International > Supercup > National Cup > League > Estadual > Friendly)
  // 2. Within same competition, earlier rounds and leg 1 are placed before later rounds and leg 2
  // 3. Earlier date first
  unplayedEntries.sort((a, b) => {
    if (b.meta.priority !== a.meta.priority) {
      return b.meta.priority - a.meta.priority;
    }
    if (a.meta.compKey === b.meta.compKey && a.meta.isCup) {
      const roundCmp = (a.fixture.round || 0) - (b.fixture.round || 0);
      if (roundCmp !== 0) return roundCmp;
      const legCmp = (a.fixture.leg || 0) - (b.fixture.leg || 0);
      if (legCmp !== 0) return legCmp;
    }
    const da = a.fixture.date || '';
    const db = b.fixture.date || '';
    if (da !== db) return da < db ? -1 : 1;
    const legCmp = (a.fixture.leg || 0) - (b.fixture.leg || 0);
    if (legCmp !== 0) return legCmp;
    return (a.fixture.round || 0) - (b.fixture.round || 0);
  });

  // Track lazy clones only for pools that actually had a fixture rescheduled
  const clonedFlatPools = new Map<FlatFixturePoolKey, Fixture[]>();
  const clonedRecordPools = new Map<RecordFixturePoolKey, Record<string, Fixture[] | undefined>>();
  const clonedRecordLists = new Map<string, Fixture[]>();
  let anyChanged = false;

  const applyUpdatedFixture = (entry: FixtureEntry, updated: Fixture) => {
    anyChanged = true;
    if (entry.kind === 'flat') {
      const flatKey = entry.poolKey as FlatFixturePoolKey;
      let list = clonedFlatPools.get(flatKey);
      if (!list) {
        list = [...((state[flatKey] as Fixture[] | undefined) || [])];
        clonedFlatPools.set(flatKey, list);
      }
      list[entry.index] = updated;
    } else if (entry.recordKey) {
      const recKey = entry.poolKey as RecordFixturePoolKey;
      let recObj = clonedRecordPools.get(recKey);
      if (!recObj) {
        recObj = { ...((state[recKey] as Record<string, Fixture[] | undefined> | undefined) || {}) };
        clonedRecordPools.set(recKey, recObj);
      }
      const compositeKey = `${recKey}::${entry.recordKey}`;
      let list = clonedRecordLists.get(compositeKey);
      if (!list) {
        list = [...(recObj[entry.recordKey] || [])];
        recObj[entry.recordKey] = list;
        clonedRecordLists.set(compositeKey, list);
      }
      list[entry.index] = updated;
    }
  };

  for (let eIdx = 0; eIdx < unplayedEntries.length; eIdx++) {
    const entry = unplayedEntries[eIdx];
    const f = entry.fixture;
    const origDate = f.date!;
    const origDayIdx = isoDateToDayIdx(origDate);
    const trimmedTime = f.time ? f.time.trim() : '';
    const origTime =
      trimmedTime && TIME_RE.test(trimmedTime)
        ? trimmedTime
        : defaultKickoffForDow(dayIdxToDow(origDayIdx));
    const origTs = origDayIdx * MINUTES_PER_DAY + parseValidTimeToMinutes(origTime);

    const scopes = getEffectiveScopesForFixture(entry.meta, f, clubScopeMap);

    const h = isRealTeamId(f.homeTeamId) ? f.homeTeamId : null;
    const a = isRealTeamId(f.awayTeamId) ? f.awayTeamId : null;
    const teams: string[] = [];
    if (h) teams.push(h);
    if (a && a !== h) teams.push(a);

    const tieKey = getTwoLegTieKey(f);
    const knownLeg1Ts = tieKey && f.leg === 2 ? resolvedLeg1Ts.get(tieKey) : undefined;

    const involvesUser = Boolean(h && a && (h === state.userClubId || a === state.userClubId));
    const isOverdueUserFixture = involvesUser && origDayIdx < currentDayIdx;

    // Never push a current/future or user fixture into the past before currentDate.
    let floorDayIdx = origDayIdx >= currentDayIdx || involvesUser ? currentDayIdx : origDayIdx;
    let minAllowedTs = floorDayIdx * MINUTES_PER_DAY;

    if (knownLeg1Ts !== undefined) {
      const minLeg2Ts = knownLeg1Ts + MIN_MATCH_REST_MINUTES;
      if (minLeg2Ts > minAllowedTs) {
        minAllowedTs = minLeg2Ts;
      }
      const minLeg2DayIdx = Math.floor(minLeg2Ts / MINUTES_PER_DAY);
      if (minLeg2DayIdx > floorDayIdx) {
        floorDayIdx = minLeg2DayIdx;
      }
    }

    // Preserve chronological order between rounds of the same cup competition
    let violatesCupRoundOrder = false;
    if (entry.meta.isCup && typeof f.round === 'number' && f.round > 1) {
      const prevMaxDay = getPrevCupRoundMaxDay(entry.meta.compKey, f.round);
      if (prevMaxDay !== undefined) {
        const minRoundDayIdx = prevMaxDay + 3;
        if (minRoundDayIdx > floorDayIdx) {
          floorDayIdx = minRoundDayIdx;
          const minRoundTs = minRoundDayIdx * MINUTES_PER_DAY;
          if (minRoundTs > minAllowedTs) minAllowedTs = minRoundTs;
        }
        if (origDayIdx < minRoundDayIdx) {
          violatesCupRoundOrder = true;
        }
      }
    }

    const violatesCompSameDay = hasCompetitionDayConflict(
      scopeDayCategories,
      scopes,
      origDayIdx,
      entry.meta.category
    );
    const violatesRest66h = hasAnyTeamConflictAtTimestamp(
      teamBuckets,
      teams,
      origDayIdx,
      origTs,
      MIN_MATCH_REST_MINUTES,
      MIN_REST_DAY_RADIUS
    );
    const violatesLegOrder = Boolean(knownLeg1Ts !== undefined && origTs < knownLeg1Ts + MIN_MATCH_REST_MINUTES);

    if (!violatesCompSameDay && !violatesRest66h && !violatesLegOrder && !violatesCupRoundOrder && !isOverdueUserFixture) {
      addScopeDayCategory(scopeDayCategories, scopes, origDayIdx, entry.meta.category);
      if (entry.meta.isCup && typeof f.round === 'number') {
        recordCupRoundDay(entry.meta.compKey, f.round, origDayIdx);
      }
      for (let t = 0; t < teams.length; t++) {
        addTeamBucketTimestamp(teamBuckets, teams[t], origDayIdx, origTs);
      }
      if (tieKey && f.leg === 1) {
        resolvedLeg1Ts.set(tieKey, origTs);
      }
      continue;
    }

    const seasonMinDayIdx = entry.meta.calendarKind === 'eu' ? euMinDayIdx : saMinDayIdx;
    const seasonMaxDayIdx = entry.meta.calendarKind === 'eu' ? euMaxDayIdx : saMaxDayIdx;

    const chosen = findBestRescheduleSlot({
      origDayIdx,
      origTime,
      floorDayIdx,
      minAllowedTs,
      seasonMinDayIdx,
      seasonMaxDayIdx,
      teams,
      region: entry.meta.region,
      teamBuckets,
      scopes,
      category: entry.meta.category,
      scopeDayCategories,
    });

    addScopeDayCategory(scopeDayCategories, scopes, chosen.dayIdx, entry.meta.category);
    if (entry.meta.isCup && typeof f.round === 'number') {
      recordCupRoundDay(entry.meta.compKey, f.round, chosen.dayIdx);
    }
    for (let t = 0; t < teams.length; t++) {
      addTeamBucketTimestamp(teamBuckets, teams[t], chosen.dayIdx, chosen.ts);
    }
    if (tieKey && f.leg === 1) {
      resolvedLeg1Ts.set(tieKey, chosen.ts);
    }

    if (chosen.date !== origDate || chosen.time !== f.time) {
      applyUpdatedFixture(entry, {
        ...f,
        date: chosen.date,
        time: chosen.time,
      });
    }
  }

  if (!anyChanged) {
    return state;
  }

  const nextState: GameSave = { ...state };
  clonedFlatPools.forEach((list, flatKey) => {
    (nextState as unknown as Record<string, unknown>)[flatKey] = list;
  });
  clonedRecordPools.forEach((recObj, recKey) => {
    if (recKey === 'fixturesEuropeanCups') {
      nextState.fixturesEuropeanCups = recObj as Partial<Record<EuropeanCupId, Fixture[]>>;
    } else if (recKey === 'fixturesSouthAmericanCups') {
      nextState.fixturesSouthAmericanCups = recObj as Partial<Record<SouthAmericanCupId, Fixture[]>>;
    } else if (recKey === 'fixturesWorldCups') {
      nextState.fixturesWorldCups = recObj as Partial<Record<WorldCupId, Fixture[]>>;
    } else if (recKey === 'fixturesEurope') {
      nextState.fixturesEurope = recObj as Partial<Record<EuropeanLeagueId, Fixture[]>>;
    } else if (recKey === 'fixturesSouthAmerica') {
      nextState.fixturesSouthAmerica = recObj as Partial<Record<SouthAmericanLeagueId, Fixture[]>>;
    } else if (recKey === 'fixturesWorldLeagues') {
      nextState.fixturesWorldLeagues = recObj as Partial<Record<WorldLeagueId, Fixture[]>>;
    }
  });

  return nextState;
}

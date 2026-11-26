import {
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
  { key: 'fixturesSuperMundial', meta: { priority: 100, region: 'all', calendarKind: 'sa' } },
  { key: 'fixturesIntercontinental', meta: { priority: 98, region: 'all', calendarKind: 'sa' } },
  { key: 'fixturesSupercopa', meta: { priority: 95, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesRecopa', meta: { priority: 95, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesUefaSupercup', meta: { priority: 95, region: 'europe', calendarKind: 'eu' } },
  { key: 'fixturesEngCommunityShield', meta: { priority: 95, region: 'europe', calendarKind: 'eu' } },
  { key: 'fixturesChampionsLeague', meta: { priority: 85, region: 'europe', calendarKind: 'eu' } },
  { key: 'fixturesEuropaLeague', meta: { priority: 84, region: 'europe', calendarKind: 'eu' } },
  { key: 'fixturesConferenceLeague', meta: { priority: 83, region: 'europe', calendarKind: 'eu' } },
  { key: 'fixturesLibertadores', meta: { priority: 85, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesSulamericana', meta: { priority: 84, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesConcacafChampions', meta: { priority: 84, region: 'all', calendarKind: 'sa' } },
  { key: 'fixturesAfcChampions', meta: { priority: 84, region: 'all', calendarKind: 'eu' } },
  { key: 'fixturesCopaInternacional', meta: { priority: 82, region: 'all', calendarKind: 'sa' } },
  { key: 'fixturesCopaBrasil', meta: { priority: 75, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesEngFaCup', meta: { priority: 75, region: 'europe', calendarKind: 'eu' } },
  { key: 'fixturesEngEflCup', meta: { priority: 74, region: 'europe', calendarKind: 'eu' } },
  { key: 'fixturesCopaNordeste', meta: { priority: 70, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesCopaVerde', meta: { priority: 69, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesA', meta: { priority: 50, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesB', meta: { priority: 50, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesC', meta: { priority: 50, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesD', meta: { priority: 50, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesEstadual', meta: { priority: 40, region: 'south_america', calendarKind: 'sa' } },
  { key: 'fixturesFriendlies', meta: { priority: 10, region: 'all', calendarKind: 'sa' } },
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

function getRecordPoolMeta(poolKey: RecordFixturePoolKey, recordKey: string): PoolMeta {
  switch (poolKey) {
    case 'fixturesEuropeanCups':
      return {
        priority: isDomesticSupercupKey(recordKey) ? 92 : 75,
        region: 'europe',
        calendarKind: 'eu',
      };
    case 'fixturesSouthAmericanCups':
      return {
        priority: isDomesticSupercupKey(recordKey) ? 92 : 75,
        region: 'south_america',
        calendarKind: 'sa',
      };
    case 'fixturesWorldCups':
      return {
        priority: 75,
        region: 'all',
        calendarKind: SPLIT_YEAR_WORLD_CUP_SET.has(recordKey) ? 'eu' : 'sa',
      };
    case 'fixturesEurope':
      return {
        priority: 50,
        region: 'europe',
        calendarKind: 'eu',
      };
    case 'fixturesSouthAmerica':
      return {
        priority: 50,
        region: 'south_america',
        calendarKind: 'sa',
      };
    case 'fixturesWorldLeagues':
      return {
        priority: 50,
        region: 'all',
        calendarKind: isSplitYearWorldLeague(recordKey as WorldLeagueId) ? 'eu' : 'sa',
      };
  }
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
  } = params;
  const effectiveMinIdx = floorDayIdx > seasonMinDayIdx ? floorDayIdx : seasonMinDayIdx;
  const isOverdueRescue = origDayIdx < effectiveMinIdx;
  const anchorDayIdx = isOverdueRescue ? effectiveMinIdx : origDayIdx;

  // Step 0: Se a própria data original (dentro dos limites) comportar um horário realista com >= 66h de intervalo,
  // ajusta apenas o horário do jogo (ex.: Qui 21:30 -> Dom 11:00 vira Dom 16:00 = 66h30) sem mudar a rodada de dia!
  if (!isOverdueRescue && origDayIdx >= effectiveMinIdx && origDayIdx <= seasonMaxDayIdx) {
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
    enforceSeasonMax: boolean
  ): { date: string; dayIdx: number; time: string; ts: number } | null => {
    for (let i = 0; i < offsets.length; i++) {
      const candDayIdx = anchorDayIdx + offsets[i];
      if (candDayIdx < effectiveMinIdx) continue;
      if (enforceSeasonMax && candDayIdx > seasonMaxDayIdx) continue;
      if (avoidFifaPause && isDayIdxInFifaPauseCached(candDayIdx, region)) continue;
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

  // Tier 1: Descanso ideal (>= 90 horas / ~3,75 dias), fora de Data FIFA e dentro da temporada
  const t1 = tryPass(
    isOverdueRescue ? TIER1_OFFSETS_RESCUE : TIER1_OFFSETS,
    IDEAL_MATCH_REST_MINUTES,
    IDEAL_REST_DAY_RADIUS,
    true,
    true
  );
  if (t1) return t1;

  // Tier 2: Regra oficial das 66 horas (>= 66h), fora de Data FIFA e dentro da temporada
  const t2 = tryPass(
    isOverdueRescue ? TIER2_OFFSETS_RESCUE : TIER2_OFFSETS,
    MIN_MATCH_REST_MINUTES,
    MIN_REST_DAY_RADIUS,
    true,
    true
  );
  if (t2) return t2;

  // Tier 3: Regra oficial das 66 horas (>= 66h), buscando toda a janela da temporada (incluindo datas FIFA se necessário)
  const t3 = tryPass(
    isOverdueRescue ? TIER3_OFFSETS_RESCUE : TIER3_OFFSETS,
    MIN_MATCH_REST_MINUTES,
    MIN_REST_DAY_RADIUS,
    false,
    true
  );
  if (t3) return t3;

  // Tier 4: Fallback estrito de 66 horas (expande além do limite da temporada, mas NUNCA quebra as 66h)
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

/**
 * Diagnóstico rápido O(N log k): detecta se QUALQUER clube em TODAS as 31+ competições possui
 * alguma partida não disputada violando o intervalo mínimo obrigatório de 66 horas,
 * ordem inválida de jogos de ida/volta ou jogo atrasado do usuário.
 */
export function hasAnyUnplayedScheduleConflict(state: GameSave): boolean {
  const teamSlots = new Map<string, Array<{ ts: number; played: boolean }>>();
  const leg1TsMap = new Map<string, number>();
  const leg2InfoMap = new Map<string, { ts: number; played: boolean }>();
  const currentDate = isValidIsoDate(state.currentDate) ? state.currentDate : null;
  let foundEarly = false;

  forEachFixtureInSave(state, (_kind, _poolKey, _recordKey, _index, f) => {
    if (!isValidIsoDate(f.date)) return;
    const h = isRealTeamId(f.homeTeamId) ? f.homeTeamId : null;
    const a = isRealTeamId(f.awayTeamId) ? f.awayTeamId : null;
    if (!h && !a) return;

    // Detect any overdue unplayed user fixture (e.g. from legacy saves or late knockout unlock)
    if (
      !f.played &&
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
    const played = Boolean(f.played);

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
        // Se pelo menos uma das duas partidas ainda não foi disputada, é obrigatório remarcar!
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
 * Garante globalmente em TODAS as 31+ competições do `GameSave` a regra oficial das 66 horas:
 * nenhum clube joga duas partidas com intervalo inferior a 66 horas entre si (impedindo jogos no mesmo dia,
 * em dias seguidos ou com apenas 2 dias de descanso).
 *
 * - Fast-path (~3ms, zero alocações de estado): retorna `state` por referência se todos os jogos já respeitam >= 66h.
 * - Índice por dia O(1) + aritmética inteira em UTC: resolução completa em ~15–25ms mesmo em saves com 17.000+ jogos.
 */
export function resolveCrossCompetitionScheduleConflicts(state: GameSave): GameSave {
  if (!state || !Array.isArray(state.clubs) || state.clubs.length === 0) {
    return state;
  }

  // Ultra-fast check before doing any allocations
  if (!hasAnyUnplayedScheduleConflict(state)) {
    return state;
  }

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

  const teamBuckets: TeamDayBucketIndex = new Map();
  const resolvedLeg1Ts = new Map<string, number>();
  const unplayedEntries: FixtureEntry[] = [];

  forEachFixtureInSave(state, (kind, poolKey, recordKey, index, fixture, meta) => {
    if (!isValidIsoDate(fixture.date)) return;
    if (fixture.played) {
      const dayIdx = isoDateToDayIdx(fixture.date);
      const ts = getFixtureTimestampMinutes(fixture.date, fixture.time);
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

  // Sort unplayed fixtures: higher priority keeps its date; ties broken by date, leg, then round
  unplayedEntries.sort((a, b) => {
    if (b.meta.priority !== a.meta.priority) {
      return b.meta.priority - a.meta.priority;
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

    const h = isRealTeamId(f.homeTeamId) ? f.homeTeamId : null;
    const a = isRealTeamId(f.awayTeamId) ? f.awayTeamId : null;
    const teams: string[] = [];
    if (h) teams.push(h);
    if (a && a !== h) teams.push(a);

    if (teams.length === 0) continue;

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

    const violatesRest66h = hasAnyTeamConflictAtTimestamp(
      teamBuckets,
      teams,
      origDayIdx,
      origTs,
      MIN_MATCH_REST_MINUTES,
      MIN_REST_DAY_RADIUS
    );
    const violatesLegOrder = Boolean(knownLeg1Ts !== undefined && origTs < knownLeg1Ts + MIN_MATCH_REST_MINUTES);

    if (!violatesRest66h && !violatesLegOrder && !isOverdueUserFixture) {
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
    });

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

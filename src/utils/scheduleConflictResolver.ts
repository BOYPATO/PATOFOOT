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
import { addDays, isDateInFifaPause } from './calendarUtils';
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

const SPLIT_YEAR_WORLD_CUP_SET = new Set<string>(['wl_cup_sau', 'wl_cup_rus', 'wl_cup_egy', 'wl_cup_mar']);

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
  return typeof d === 'string' && ISO_DATE_RE.test(d);
}

function isRealTeamId(tid?: unknown): tid is string {
  return typeof tid === 'string' && tid.length > 0 && tid !== 'tbd' && !tid.startsWith('TBD');
}

function getDayOfWeekUtc(dateStr: string): number {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  const d = Number(dateStr.slice(8, 10));
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun, 6=Sat
}

export function getDefaultKickoffTimeForDate(dateStr: string): string {
  const dow = getDayOfWeekUtc(dateStr);
  if (dow === 0) return '16:00';
  if (dow === 6) return '16:30';
  return '19:30';
}

export function parseKickoffTimeToMinutes(timeStr: string | undefined, dateStr: string): number {
  const raw = timeStr && TIME_RE.test(timeStr.trim()) ? timeStr.trim() : getDefaultKickoffTimeForDate(dateStr);
  const m = TIME_RE.exec(raw);
  if (!m) return 16 * 60;
  const hh = Math.max(0, Math.min(23, Number(m[1])));
  const mm = Math.max(0, Math.min(59, Number(m[2])));
  return hh * 60 + mm;
}

/**
 * Converte (YYYY-MM-DD, HH:MM) em timestamp linear em minutos (UTC) para cálculo exato de 66 horas sem distorção de fuso/horário de verão.
 */
export function getFixtureTimestampMinutes(dateStr: string, timeStr?: string): number {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  const d = Number(dateStr.slice(8, 10));
  const dayUtcMin = Math.floor(Date.UTC(y, m - 1, d) / 60000);
  return dayUtcMin + parseKickoffTimeToMinutes(timeStr, dateStr);
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

function adjustKickoffTimeForDate(dateStr: string, originalTime?: string): string {
  const dow = getDayOfWeekUtc(dateStr); // 0=Sun, 6=Sat
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

function buildKickoffCandidatesForDate(dateStr: string, originalTime?: string): string[] {
  const dow = getDayOfWeekUtc(dateStr);
  const isMidweek = dow >= 1 && dow <= 5;
  const preferred = adjustKickoffTimeForDate(dateStr, originalTime);
  const baseSlots = isMidweek
    ? ['19:30', '20:00', '21:00', '21:30', '19:00', '16:00', '22:00']
    : dow === 6
    ? ['16:30', '18:30', '16:00', '19:30', '20:00', '21:00', '21:30', '14:00', '11:00']
    : ['16:00', '18:30', '16:30', '19:30', '20:00', '21:00', '21:30', '14:00', '11:00'];

  const out: string[] = [];
  if (TIME_RE.test(preferred)) out.push(preferred);
  if (originalTime && TIME_RE.test(originalTime) && !out.includes(originalTime)) {
    out.push(originalTime);
  }
  for (const s of baseSlots) {
    if (!out.includes(s)) out.push(s);
  }
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

function hasAnyTeamConflictAtTimestamp(
  teamScheduledTimestamps: Map<string, number[]>,
  teams: string[],
  candidateTs: number,
  minGapMinutes: number
): boolean {
  for (let tIdx = 0; tIdx < teams.length; tIdx++) {
    const list = teamScheduledTimestamps.get(teams[tIdx]);
    if (!list || list.length === 0) continue;
    for (let i = 0; i < list.length; i++) {
      if (Math.abs(candidateTs - list[i]) < minGapMinutes) {
        return true;
      }
    }
  }
  return false;
}

function pickValidKickoffOnDate(
  candidateDate: string,
  originalTime: string | undefined,
  teams: string[],
  teamScheduledTimestamps: Map<string, number[]>,
  minGapMinutes: number,
  minAllowedTs: number
): { date: string; time: string; ts: number } | null {
  const slots = buildKickoffCandidatesForDate(candidateDate, originalTime);
  for (let i = 0; i < slots.length; i++) {
    const time = slots[i];
    const ts = getFixtureTimestampMinutes(candidateDate, time);
    if (ts < minAllowedTs) continue;
    if (!hasAnyTeamConflictAtTimestamp(teamScheduledTimestamps, teams, ts, minGapMinutes)) {
      return { date: candidateDate, time, ts };
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

function findBestRescheduleSlot(params: {
  origDate: string;
  origTime?: string;
  floorDate: string;
  minAllowedTs: number;
  seasonMinDate: string;
  seasonMaxDate: string;
  teams: string[];
  region: 'europe' | 'south_america' | 'all';
  teamScheduledTimestamps: Map<string, number[]>;
}): { date: string; time: string; ts: number } {
  const {
    origDate,
    origTime,
    floorDate,
    minAllowedTs,
    seasonMinDate,
    seasonMaxDate,
    teams,
    region,
    teamScheduledTimestamps,
  } = params;
  const effectiveMin = floorDate > seasonMinDate ? floorDate : seasonMinDate;
  const isOverdueRescue = origDate < effectiveMin;
  const anchorDate = isOverdueRescue ? effectiveMin : origDate;

  // Step 0: Se a própria data original (dentro dos limites) comportar um horário realista com >= 66h de intervalo,
  // ajusta apenas o horário do jogo (ex.: Qui 21:30 -> Dom 11:00 vira Dom 16:00 = 66h30) sem mudar a rodada de dia!
  if (!isOverdueRescue && origDate >= effectiveMin && origDate <= seasonMaxDate) {
    const sameDaySlot = pickValidKickoffOnDate(
      origDate,
      origTime,
      teams,
      teamScheduledTimestamps,
      MIN_MATCH_REST_MINUTES,
      minAllowedTs
    );
    if (sameDaySlot) return sameDaySlot;
  }

  const tryPass = (
    offsets: number[],
    minGapMinutes: number,
    avoidFifaPause: boolean,
    enforceSeasonMax: boolean
  ): { date: string; time: string; ts: number } | null => {
    const searchList = isOverdueRescue ? [0, ...offsets] : offsets;
    for (let i = 0; i < searchList.length; i++) {
      const candidate = addDays(anchorDate, searchList[i]);
      if (candidate < effectiveMin) continue;
      if (enforceSeasonMax && candidate > seasonMaxDate) continue;
      if (avoidFifaPause && isDateInFifaPause(candidate, region)) continue;
      const slot = pickValidKickoffOnDate(
        candidate,
        origTime,
        teams,
        teamScheduledTimestamps,
        minGapMinutes,
        minAllowedTs
      );
      if (slot) return slot;
    }
    return null;
  };

  // Tier 1: Descanso ideal (>= 90 horas / ~3,75 dias), fora de Data FIFA e dentro da temporada
  const t1 = tryPass(TIER1_OFFSETS, IDEAL_MATCH_REST_MINUTES, true, true);
  if (t1) return t1;

  // Tier 2: Regra oficial das 66 horas (>= 66h), fora de Data FIFA e dentro da temporada
  const t2 = tryPass(TIER2_OFFSETS, MIN_MATCH_REST_MINUTES, true, true);
  if (t2) return t2;

  // Tier 3: Regra oficial das 66 horas (>= 66h), buscando toda a janela da temporada (incluindo datas FIFA se necessário)
  const t3 = tryPass(TIER3_OFFSETS, MIN_MATCH_REST_MINUTES, false, true);
  if (t3) return t3;

  // Tier 4: Fallback estrito de 66 horas (expande além do limite da temporada, mas NUNCA quebra as 66h)
  for (let d = 0; d <= 420; d++) {
    const candidate = addDays(anchorDate, d);
    if (candidate < effectiveMin) continue;
    const slot = pickValidKickoffOnDate(
      candidate,
      origTime,
      teams,
      teamScheduledTimestamps,
      MIN_MATCH_REST_MINUTES,
      minAllowedTs
    );
    if (slot) return slot;
  }

  const fallbackDate = addDays(anchorDate, 3);
  const fallbackTime = adjustKickoffTimeForDate(fallbackDate, origTime);
  return {
    date: fallbackDate,
    time: fallbackTime,
    ts: getFixtureTimestampMinutes(fallbackDate, fallbackTime),
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
  for (const desc of FLAT_POOL_DESCRIPTORS) {
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

  for (const poolKey of recordKeys) {
    const recordObj = state[poolKey] as Record<string, Fixture[] | undefined> | undefined;
    if (!recordObj) continue;
    for (const rKey of Object.keys(recordObj)) {
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
 * - Fast-path (~2ms, zero alocações de estado): retorna `state` por referência se todos os jogos já respeitam >= 66h.
 * - Resolução por prioridade: jogos já disputados são imutáveis; Supercopas, Mundiais, Continentais e Copas Nacionais
 *   mantêm suas datas prioritárias enquanto jogos de menor prioridade (Ligas, Estaduais, Amistosos) são ajustados
 *   primeiro por horário (se possível no mesmo dia com >= 66h) ou remarcados para a data livre mais próxima com >= 66h
 *   de descanso para AMBOS os clubes.
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
  const currentDate = isValidIsoDate(state.currentDate) ? state.currentDate : '2026-01-11';
  const calYear = Number(currentDate.slice(0, 4)) || state.currentSeasonYear || 2026;

  const saYear = state.saSeasonYear ?? (isUserSplit ? calYear : state.currentSeasonYear || 2026);
  const euYear =
    state.europeSeasonYear ??
    (isUserSplit
      ? state.currentSeasonYear || 2026
      : currentDate < `${calYear}-07-20`
      ? calYear - 1
      : calYear);

  const saMinDate = `${saYear}-01-01`;
  const saMaxDate = `${saYear}-12-31`;
  const euMinDate = `${euYear}-07-10`;
  const euMaxDate = `${euYear + 1}-06-30`;

  const teamScheduledTimestamps = new Map<string, number[]>();
  const resolvedLeg1Ts = new Map<string, number>();
  const unplayedEntries: FixtureEntry[] = [];

  forEachFixtureInSave(state, (kind, poolKey, recordKey, index, fixture, meta) => {
    if (!isValidIsoDate(fixture.date)) return;
    if (fixture.played) {
      const ts = getFixtureTimestampMinutes(fixture.date, fixture.time);
      if (isRealTeamId(fixture.homeTeamId)) {
        getOrCreateArray(teamScheduledTimestamps, fixture.homeTeamId).push(ts);
      }
      if (isRealTeamId(fixture.awayTeamId) && fixture.awayTeamId !== fixture.homeTeamId) {
        getOrCreateArray(teamScheduledTimestamps, fixture.awayTeamId).push(ts);
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
    const dateCmp = (a.fixture.date || '').localeCompare(b.fixture.date || '');
    if (dateCmp !== 0) return dateCmp;
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

  for (const entry of unplayedEntries) {
    const f = entry.fixture;
    const origDate = f.date!;
    const origTime = f.time && TIME_RE.test(f.time.trim()) ? f.time.trim() : getDefaultKickoffTimeForDate(origDate);
    const origTs = getFixtureTimestampMinutes(origDate, origTime);

    const h = isRealTeamId(f.homeTeamId) ? f.homeTeamId : null;
    const a = isRealTeamId(f.awayTeamId) ? f.awayTeamId : null;
    const teams: string[] = [];
    if (h) teams.push(h);
    if (a && a !== h) teams.push(a);

    if (teams.length === 0) continue;

    const tieKey = getTwoLegTieKey(f);
    const knownLeg1Ts = tieKey && f.leg === 2 ? resolvedLeg1Ts.get(tieKey) : undefined;

    const involvesUser = Boolean(h && a && (h === state.userClubId || a === state.userClubId));
    const isOverdueUserFixture = involvesUser && origDate < currentDate;

    // Never push a current/future or user fixture into the past before currentDate.
    let floorDate = origDate >= currentDate || involvesUser ? currentDate : origDate;
    let minAllowedTs = getFixtureTimestampMinutes(floorDate, '00:00');
    if (knownLeg1Ts !== undefined) {
      const minLeg2Ts = knownLeg1Ts + MIN_MATCH_REST_MINUTES;
      if (minLeg2Ts > minAllowedTs) {
        minAllowedTs = minLeg2Ts;
      }
      // Also advance floorDate string to at least the UTC day of minLeg2Ts
      const minLeg2DateObj = new Date(minLeg2Ts * 60000);
      const minLeg2DateStr = `${minLeg2DateObj.getUTCFullYear()}-${String(minLeg2DateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(minLeg2DateObj.getUTCDate()).padStart(2, '0')}`;
      if (minLeg2DateStr > floorDate) {
        floorDate = minLeg2DateStr;
      }
    }

    const violatesRest66h = hasAnyTeamConflictAtTimestamp(
      teamScheduledTimestamps,
      teams,
      origTs,
      MIN_MATCH_REST_MINUTES
    );
    const violatesLegOrder = Boolean(knownLeg1Ts !== undefined && origTs < knownLeg1Ts + MIN_MATCH_REST_MINUTES);

    if (!violatesRest66h && !violatesLegOrder && !isOverdueUserFixture) {
      for (const tid of teams) {
        getOrCreateArray(teamScheduledTimestamps, tid).push(origTs);
      }
      if (tieKey && f.leg === 1) {
        resolvedLeg1Ts.set(tieKey, origTs);
      }
      continue;
    }

    const seasonMinDate = entry.meta.calendarKind === 'eu' ? euMinDate : saMinDate;
    const seasonMaxDate = entry.meta.calendarKind === 'eu' ? euMaxDate : saMaxDate;

    const chosen = findBestRescheduleSlot({
      origDate,
      origTime,
      floorDate,
      minAllowedTs,
      seasonMinDate,
      seasonMaxDate,
      teams,
      region: entry.meta.region,
      teamScheduledTimestamps,
    });

    for (const tid of teams) {
      getOrCreateArray(teamScheduledTimestamps, tid).push(chosen.ts);
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

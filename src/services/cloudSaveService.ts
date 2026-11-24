import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { syncTrainerProfileToFirestore } from './trainerAuthService';
import { Club, Fixture, GameSave } from '../types/game';
import { compactGameSaveForStorage } from '../utils/saveStorageEngine';

export type CloudSlotId = 'autosave' | 'slot_1' | 'slot_2' | 'slot_3' | 'slot_4' | 'slot_5';

export interface CloudSaveSummary {
  slotId: CloudSlotId;
  clubId: string;
  clubName: string;
  clubShortName: string;
  clubPrimaryColor: string;
  clubSecondaryColor: string;
  division: string;
  managerName: string;
  seasonYear: number;
  round: number;
  currentDate: string;
  clubBalance: number;
  partCount: number;
  updatedAtIso: string;
}

interface RawSegmentChunk {
  segmentId: string;
  orderIndex: number;
  section: string;
  payload: Record<string, unknown>;
}

const CLOUD_FORMAT_VERSION = 1;
const SEGMENT_UTF8_BUDGET_BYTES = 210_000; // Keeps each encoded Firestore document safely < 450 KB

const ARRAY_TOP_KEYS: ReadonlyArray<keyof GameSave> = [
  'clubs',
  'fixturesA',
  'fixturesB',
  'fixturesC',
  'fixturesD',
  'fixturesSupercopa',
  'fixturesRecopa',
  'fixturesLibertadores',
  'fixturesSulamericana',
  'fixturesCopaBrasil',
  'fixturesCopaNordeste',
  'fixturesCopaVerde',
  'fixturesEstadual',
  'fixturesIntercontinental',
  'fixturesChampionsLeague',
  'fixturesEuropaLeague',
  'fixturesConferenceLeague',
  'fixturesUefaSupercup',
  'fixturesCopaInternacional',
  'fixturesConcacafChampions',
  'fixturesAfcChampions',
  'fixturesSuperMundial',
  'fixturesEngCommunityShield',
  'fixturesEngEflCup',
  'fixturesEngFaCup',
  'fixturesFriendlies',
  'transferMarket',
  'inbox',
  'transferHistory',
  'seasonHistoryArchive',
];

const MAP_FIXTURE_TOP_KEYS: ReadonlyArray<keyof GameSave> = [
  'fixturesSouthAmerica',
  'fixturesEurope',
  'fixturesWorldLeagues',
  'fixturesEuropeanCups',
  'fixturesSouthAmericanCups',
  'fixturesWorldCups',
];

/**
 * Recursively sanitizes any JS value into strict Firestore-native Maps, Lists, Strings, Numbers, Booleans, or null.
 * Strips all `undefined` object keys so Firestore writes never fail on undefined properties.
 */
export function stripUndefinedForFirestore<T>(value: T): T {
  if (value === null || value === undefined) {
    return null as unknown as T;
  }
  if (typeof value === 'number') {
    return (Number.isFinite(value) ? value : 0) as unknown as T;
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      out.push(item === undefined ? null : stripUndefinedForFirestore(item));
    }
    return out as unknown as T;
  }
  if (typeof value === 'object') {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const keys = Object.keys(src);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = src[k];
      if (v !== undefined) {
        out[k] = stripUndefinedForFirestore(v);
      }
    }
    return out as unknown as T;
  }
  return null as unknown as T;
}

function utf8ByteSize(obj: unknown): number {
  const s = JSON.stringify(obj);
  let bytes = s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0x80 && c <= 0x7ff) bytes += 1;
    else if (c >= 0x800 && c <= 0xffff) bytes += 2;
  }
  return bytes;
}

function normalizeHex(raw: string | undefined, fallback: string): string {
  const s = String(raw || '').trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(s) && s.length >= 4 && s.length <= 9) {
    return s;
  }
  return fallback;
}

function packArrayIntoChunks<T>(
  items: T[],
  budgetBytes: number = SEGMENT_UTF8_BUDGET_BYTES
): T[][] {
  if (!items || items.length === 0) return [];
  const chunks: T[][] = [];
  let currentChunk: T[] = [];
  let currentBytes = 32;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemBytes = utf8ByteSize(item) + 4;
    if (currentChunk.length > 0 && currentBytes + itemBytes > budgetBytes) {
      chunks.push(currentChunk);
      currentChunk = [item];
      currentBytes = 32 + itemBytes;
    } else {
      currentChunk.push(item);
      currentBytes += itemBytes;
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}

/**
 * Packs a full compacted GameSave into native Firestore Maps/Lists segments (each <= 210 KB raw UTF-8).
 * Zero JSON.stringify strings are persisted in Firestore payloads.
 */
export function packGameSaveIntoNativeSegments(save: GameSave): {
  compactedSave: GameSave;
  segments: RawSegmentChunk[];
} {
  const compacted = stripUndefinedForFirestore(compactGameSaveForStorage(save));
  const segments: RawSegmentChunk[] = [];
  let seq = 0;

  const pushSegment = (section: string, payload: Record<string, unknown>) => {
    const id = `seg_${String(seq).padStart(3, '0')}`;
    segments.push({
      segmentId: id,
      orderIndex: seq,
      section,
      payload,
    });
    seq++;
  };

  // 1. Build core object containing smaller top-level metadata and standings
  const coreData: Record<string, unknown> = {};
  const excludedTopKeys = new Set<string>([
    ...ARRAY_TOP_KEYS.map(String),
    ...MAP_FIXTURE_TOP_KEYS.map(String),
    'nationalTeam',
  ]);

  for (const [k, v] of Object.entries(compacted as unknown as Record<string, unknown>)) {
    if (!excludedTopKeys.has(k) && v !== undefined) {
      coreData[k] = v;
    }
  }

  // If coreData itself is large (e.g. standings), split standings if needed; otherwise store cleanly
  if (utf8ByteSize(coreData) <= SEGMENT_UTF8_BUDGET_BYTES) {
    pushSegment('core', { kind: 'core', data: coreData });
  } else {
    const scalarCore: Record<string, unknown> = {};
    const bigMaps: Array<[string, unknown]> = [];
    for (const [k, v] of Object.entries(coreData)) {
      if (utf8ByteSize(v) > 30_000) {
        bigMaps.push([k, v]);
      } else {
        scalarCore[k] = v;
      }
    }
    pushSegment('core', { kind: 'core', data: scalarCore });
    for (const [k, v] of bigMaps) {
      pushSegment('core', { kind: 'core_prop', key: k, value: v });
    }
  }

  // 2. Pack top-level array fields (`clubs`, fixtures arrays, `transferMarket`, `inbox`, etc.)
  for (const fieldKey of ARRAY_TOP_KEYS) {
    const arr = (compacted as unknown as Record<string, unknown>)[String(fieldKey)];
    if (!Array.isArray(arr)) continue;
    if (arr.length === 0) {
      pushSegment(fieldKey === 'clubs' ? 'clubs' : 'array', {
        kind: 'array_chunk',
        key: String(fieldKey),
        chunkIndex: 0,
        items: [],
      });
      continue;
    }
    const chunks = packArrayIntoChunks(arr);
    const secName =
      fieldKey === 'clubs'
        ? 'clubs'
        : String(fieldKey).startsWith('fixtures')
        ? 'fixtures'
        : 'records';
    chunks.forEach((items, chunkIndex) => {
      pushSegment(secName, {
        kind: 'array_chunk',
        key: String(fieldKey),
        chunkIndex,
        items,
      });
    });
  }

  // 3. Pack Record<string, Fixture[]> competition maps
  for (const mapKey of MAP_FIXTURE_TOP_KEYS) {
    const mapObj = (compacted as unknown as Record<string, unknown>)[String(mapKey)];
    if (!mapObj || typeof mapObj !== 'object') continue;
    const entries = Object.entries(mapObj as Record<string, Fixture[]>);
    let batchEntries: Array<[string, Fixture[]]> = [];
    let batchBytes = 64;

    const flushMapBatch = () => {
      if (batchEntries.length === 0) return;
      const partial: Record<string, Fixture[]> = {};
      for (const [subKey, list] of batchEntries) {
        partial[subKey] = list;
      }
      pushSegment('fixtures', {
        kind: 'fixture_map_part',
        key: String(mapKey),
        entries: partial,
      });
      batchEntries = [];
      batchBytes = 64;
    };

    for (const [subKey, list] of entries) {
      if (!Array.isArray(list)) continue;
      const entryBytes = utf8ByteSize(list) + subKey.length + 12;
      if (entryBytes > SEGMENT_UTF8_BUDGET_BYTES) {
        flushMapBatch();
        const subChunks = packArrayIntoChunks(list);
        subChunks.forEach((chunk, chunkIndex) => {
          pushSegment('fixtures', {
            kind: 'fixture_map_subarray',
            key: String(mapKey),
            subKey,
            chunkIndex,
            items: chunk,
          });
        });
      } else {
        if (batchEntries.length > 0 && batchBytes + entryBytes > SEGMENT_UTF8_BUDGET_BYTES) {
          flushMapBatch();
        }
        batchEntries.push([subKey, list]);
        batchBytes += entryBytes;
      }
    }
    flushMapBatch();
  }

  // 4. Pack `nationalTeam` cleanly without blowing 1 MiB
  if (compacted.nationalTeam) {
    const nt = compacted.nationalTeam as unknown as Record<string, unknown>;
    const largeNtKeys = new Set<string>([
      'continentals',
      'qualifiers',
      'continentalQualifiers',
      'worldCup',
      'completedQualifiersArchive',
      'completedContinentalQualifiersArchive',
      'seasonSchedule',
    ]);
    const ntBase: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(nt)) {
      if (!largeNtKeys.has(k) && v !== undefined) {
        ntBase[k] = v;
      }
    }
    pushSegment('nationalTeam', { kind: 'nt_base', data: ntBase });

    const packEditionOrCycle = (propName: string, obj: unknown) => {
      if (!obj || typeof obj !== 'object') return;
      if (utf8ByteSize(obj) <= SEGMENT_UTF8_BUDGET_BYTES) {
        pushSegment('nationalTeam', { kind: 'nt_prop', key: propName, value: obj });
        return;
      }
      const record = obj as Record<string, unknown>;
      const shell: Record<string, unknown> = {};
      const nestedArrays: Array<[string, unknown[]]> = [];
      const nestedObjects: Array<[string, unknown]> = [];
      for (const [k, v] of Object.entries(record)) {
        if (Array.isArray(v) && utf8ByteSize(v) > 50_000) {
          nestedArrays.push([k, v]);
        } else if (v && typeof v === 'object' && !Array.isArray(v) && utf8ByteSize(v) > 50_000) {
          nestedObjects.push([k, v]);
        } else {
          shell[k] = v;
        }
      }
      pushSegment('nationalTeam', { kind: 'nt_nested_shell', key: propName, shell });
      for (const [k, arr] of nestedArrays) {
        const chunks = packArrayIntoChunks(arr);
        chunks.forEach((items, chunkIndex) => {
          pushSegment('nationalTeam', {
            kind: 'nt_nested_array',
            parentKey: propName,
            fieldKey: k,
            chunkIndex,
            items,
          });
        });
      }
      for (const [k, nestedVal] of nestedObjects) {
        if (utf8ByteSize(nestedVal) <= SEGMENT_UTF8_BUDGET_BYTES) {
          pushSegment('nationalTeam', {
            kind: 'nt_nested_prop',
            parentKey: propName,
            fieldKey: k,
            value: nestedVal,
          });
        } else {
          // e.g. continentalQualifiers.tracks or continentals[comp]
          for (const [subKey, subVal] of Object.entries(nestedVal as Record<string, unknown>)) {
            if (utf8ByteSize(subVal) <= SEGMENT_UTF8_BUDGET_BYTES) {
              pushSegment('nationalTeam', {
                kind: 'nt_deep_prop',
                parentKey: propName,
                fieldKey: k,
                subKey,
                value: subVal,
              });
            } else if (subVal && typeof subVal === 'object') {
              const sv = subVal as Record<string, unknown>;
              const { fixtures: subFixtures, ...subMeta } = sv;
              pushSegment('nationalTeam', {
                kind: 'nt_deep_prop',
                parentKey: propName,
                fieldKey: k,
                subKey,
                value: { ...subMeta, fixtures: [] },
              });
              if (Array.isArray(subFixtures)) {
                packArrayIntoChunks(subFixtures).forEach((items, chunkIndex) => {
                  pushSegment('nationalTeam', {
                    kind: 'nt_deep_fixtures',
                    parentKey: propName,
                    fieldKey: k,
                    subKey,
                    chunkIndex,
                    items,
                  });
                });
              }
            }
          }
        }
      }
    };

    if (nt.continentals && typeof nt.continentals === 'object') {
      for (const [compKey, compEdition] of Object.entries(nt.continentals as Record<string, unknown>)) {
        packEditionOrCycle(`continentals.${compKey}`, compEdition);
      }
    }
    if (nt.worldCup) packEditionOrCycle('worldCup', nt.worldCup);
    if (nt.qualifiers) packEditionOrCycle('qualifiers', nt.qualifiers);
    if (nt.completedQualifiersArchive) {
      packEditionOrCycle('completedQualifiersArchive', nt.completedQualifiersArchive);
    }
    if (nt.continentalQualifiers) {
      packEditionOrCycle('continentalQualifiers', nt.continentalQualifiers);
    }
    if (nt.completedContinentalQualifiersArchive) {
      packEditionOrCycle(
        'completedContinentalQualifiersArchive',
        nt.completedContinentalQualifiersArchive
      );
    }
    if (Array.isArray(nt.seasonSchedule)) {
      const schedChunks = packArrayIntoChunks(nt.seasonSchedule);
      schedChunks.forEach((items, chunkIndex) => {
        pushSegment('nationalTeam', {
          kind: 'nt_schedule_chunk',
          chunkIndex,
          items,
        });
      });
    }
  }

  return { compactedSave: compacted, segments };
}

/**
 * Reconstructs a full GameSave from ordered Firestore native segments.
 */
export function unpackGameSaveFromNativeSegments(segments: RawSegmentChunk[]): GameSave | null {
  if (!segments || segments.length === 0) return null;
  const ordered = [...segments].sort((a, b) => a.orderIndex - b.orderIndex);
  const assembled: Record<string, unknown> = {};
  let ntObj: Record<string, unknown> | null = null;
  const arrayBuckets = new Map<string, Map<number, unknown[]>>();
  const mapSubArrayBuckets = new Map<string, Map<number, Fixture[]>>();
  const ntScheduleBuckets = new Map<number, unknown[]>();
  const ntNestedArrays = new Map<string, Map<number, unknown[]>>();
  const ntDeepFixtureBuckets = new Map<string, Map<number, unknown[]>>();

  const ensureNt = () => {
    if (!ntObj) ntObj = {};
    return ntObj;
  };

  for (const seg of ordered) {
    const p = seg.payload || {};
    const kind = p.kind;
    if (kind === 'core' && p.data && typeof p.data === 'object') {
      Object.assign(assembled, p.data as Record<string, unknown>);
    } else if (kind === 'core_prop' && typeof p.key === 'string') {
      assembled[p.key] = p.value;
    } else if (kind === 'array_chunk' && typeof p.key === 'string' && Array.isArray(p.items)) {
      if (!arrayBuckets.has(p.key)) arrayBuckets.set(p.key, new Map());
      arrayBuckets.get(p.key)!.set(Number(p.chunkIndex || 0), p.items);
    } else if (
      kind === 'fixture_map_part' &&
      typeof p.key === 'string' &&
      p.entries &&
      typeof p.entries === 'object'
    ) {
      const targetMap = (assembled[p.key] as Record<string, Fixture[]>) || {};
      Object.assign(targetMap, p.entries as Record<string, Fixture[]>);
      assembled[p.key] = targetMap;
    } else if (
      kind === 'fixture_map_subarray' &&
      typeof p.key === 'string' &&
      typeof p.subKey === 'string' &&
      Array.isArray(p.items)
    ) {
      const compositeKey = `${p.key}:::${p.subKey}`;
      if (!mapSubArrayBuckets.has(compositeKey)) mapSubArrayBuckets.set(compositeKey, new Map());
      mapSubArrayBuckets.get(compositeKey)!.set(Number(p.chunkIndex || 0), p.items as Fixture[]);
    } else if (kind === 'nt_base' && p.data && typeof p.data === 'object') {
      ntObj = { ...(ntObj || {}), ...(p.data as Record<string, unknown>) };
    } else if (kind === 'nt_prop' && typeof p.key === 'string') {
      const nt = ensureNt();
      if (p.key.startsWith('continentals.')) {
        const compKey = p.key.slice('continentals.'.length);
        const conts = (nt.continentals as Record<string, unknown>) || {};
        conts[compKey] = p.value;
        nt.continentals = conts;
      } else {
        nt[p.key] = p.value;
      }
    } else if (kind === 'nt_nested_shell' && typeof p.key === 'string' && p.shell) {
      const nt = ensureNt();
      if (p.key.startsWith('continentals.')) {
        const compKey = p.key.slice('continentals.'.length);
        const conts = (nt.continentals as Record<string, unknown>) || {};
        conts[compKey] = { ...(p.shell as Record<string, unknown>) };
        nt.continentals = conts;
      } else {
        nt[p.key] = { ...(p.shell as Record<string, unknown>) };
      }
    } else if (
      kind === 'nt_nested_prop' &&
      typeof p.parentKey === 'string' &&
      typeof p.fieldKey === 'string'
    ) {
      const nt = ensureNt();
      const parentObj = (nt[p.parentKey] as Record<string, unknown>) || {};
      parentObj[p.fieldKey] = p.value;
      nt[p.parentKey] = parentObj;
    } else if (
      kind === 'nt_deep_prop' &&
      typeof p.parentKey === 'string' &&
      typeof p.fieldKey === 'string' &&
      typeof p.subKey === 'string'
    ) {
      const nt = ensureNt();
      const parentObj = (nt[p.parentKey] as Record<string, unknown>) || {};
      const midObj = (parentObj[p.fieldKey] as Record<string, unknown>) || {};
      midObj[p.subKey] = p.value;
      parentObj[p.fieldKey] = midObj;
      nt[p.parentKey] = parentObj;
    } else if (
      kind === 'nt_deep_fixtures' &&
      typeof p.parentKey === 'string' &&
      typeof p.fieldKey === 'string' &&
      typeof p.subKey === 'string' &&
      Array.isArray(p.items)
    ) {
      const compositeKey = `${p.parentKey}:::${p.fieldKey}:::${p.subKey}`;
      if (!ntDeepFixtureBuckets.has(compositeKey)) ntDeepFixtureBuckets.set(compositeKey, new Map());
      ntDeepFixtureBuckets.get(compositeKey)!.set(Number(p.chunkIndex || 0), p.items);
    } else if (
      kind === 'nt_nested_array' &&
      typeof p.parentKey === 'string' &&
      typeof p.fieldKey === 'string' &&
      Array.isArray(p.items)
    ) {
      const compositeKey = `${p.parentKey}:::${p.fieldKey}`;
      if (!ntNestedArrays.has(compositeKey)) ntNestedArrays.set(compositeKey, new Map());
      ntNestedArrays.get(compositeKey)!.set(Number(p.chunkIndex || 0), p.items);
    } else if (kind === 'nt_schedule_chunk' && Array.isArray(p.items)) {
      ntScheduleBuckets.set(Number(p.chunkIndex || 0), p.items);
    }
  }

  for (const [key, bucketMap] of arrayBuckets.entries()) {
    const merged: unknown[] = [];
    const sortedIndices = Array.from(bucketMap.keys()).sort((a, b) => a - b);
    for (const idx of sortedIndices) {
      merged.push(...(bucketMap.get(idx) || []));
    }
    assembled[key] = merged;
  }

  for (const [composite, bucketMap] of mapSubArrayBuckets.entries()) {
    const [key, subKey] = composite.split(':::');
    const targetMap = (assembled[key] as Record<string, Fixture[]>) || {};
    const merged: Fixture[] = [];
    Array.from(bucketMap.keys())
      .sort((a, b) => a - b)
      .forEach((idx) => merged.push(...(bucketMap.get(idx) || [])));
    targetMap[subKey] = merged;
    assembled[key] = targetMap;
  }

  for (const [composite, bucketMap] of ntNestedArrays.entries()) {
    const [parentKey, fieldKey] = composite.split(':::');
    const nt = ensureNt();
    const merged: unknown[] = [];
    Array.from(bucketMap.keys())
      .sort((a, b) => a - b)
      .forEach((idx) => merged.push(...(bucketMap.get(idx) || [])));

    if (parentKey.startsWith('continentals.')) {
      const compKey = parentKey.slice('continentals.'.length);
      const conts = (nt.continentals as Record<string, Record<string, unknown>>) || {};
      conts[compKey] = conts[compKey] || {};
      conts[compKey][fieldKey] = merged;
      nt.continentals = conts;
    } else {
      const parentObj = (nt[parentKey] as Record<string, unknown>) || {};
      parentObj[fieldKey] = merged;
      nt[parentKey] = parentObj;
    }
  }

  for (const [composite, bucketMap] of ntDeepFixtureBuckets.entries()) {
    const [parentKey, fieldKey, subKey] = composite.split(':::');
    const nt = ensureNt();
    const merged: unknown[] = [];
    Array.from(bucketMap.keys())
      .sort((a, b) => a - b)
      .forEach((idx) => merged.push(...(bucketMap.get(idx) || [])));
    const parentObj = (nt[parentKey] as Record<string, unknown>) || {};
    const midObj = (parentObj[fieldKey] as Record<string, Record<string, unknown>>) || {};
    midObj[subKey] = midObj[subKey] || {};
    midObj[subKey].fixtures = merged;
    parentObj[fieldKey] = midObj;
    nt[parentKey] = parentObj;
  }

  if (ntScheduleBuckets.size > 0) {
    const nt = ensureNt();
    const merged: unknown[] = [];
    Array.from(ntScheduleBuckets.keys())
      .sort((a, b) => a - b)
      .forEach((idx) => merged.push(...(ntScheduleBuckets.get(idx) || [])));
    nt.seasonSchedule = merged;
  }

  if (ntObj) {
    assembled.nationalTeam = ntObj;
  }

  const candidate = assembled as unknown as GameSave;
  if (!candidate || !Array.isArray(candidate.clubs) || !candidate.userClubId) {
    return null;
  }
  return candidate;
}

function getAuthenticatedUid(): string | null {
  const user = auth.currentUser;
  if (!user || !user.uid || !/^[a-zA-Z0-9_\-]{1,128}$/.test(user.uid)) {
    return null;
  }
  const allowedProvider =
    user.emailVerified === true ||
    user.providerData.some((p) => p.providerId === 'password');
  return allowedProvider ? user.uid : null;
}

export function canUseCloudSaves(): boolean {
  return Boolean(getAuthenticatedUid());
}

async function getFirebaseIdTokenInMemory(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

function extractHallOfFameSnapshot(save: GameSave): {
  trophiesCount: number;
  hallOfFamePoints: number;
  winRatePct: number;
} {
  const trophiesCount = Array.isArray(save.trophyHistory)
    ? save.trophyHistory.filter((t) => t.userWon).length
    : 0;
  const stints = Array.isArray(save.managerCareer?.careerStints)
    ? save.managerCareer.careerStints
    : [];
  const played = stints.reduce((acc, s) => acc + (s.matches || 0), 0);
  const wins = stints.reduce((acc, s) => acc + (s.wins || 0), 0);
  const winRatePct = played > 0 ? Math.round((wins / played) * 100) : 0;
  const hallOfFamePoints =
    trophiesCount * 250 +
    wins * 10 +
    (Array.isArray(save.unlockedAchievementIds) ? save.unlockedAchievementIds.length * 40 : 0);
  return { trophiesCount, hallOfFamePoints, winRatePct };
}

/**
 * Saves a full career slot to the relational PostgreSQL cloud backend (with Firebase Auth ID token).
 * Falls back transparently to segmented Firestore storage if the SQL API is temporarily unreachable.
 */
export async function saveCareerToCloud(
  slotId: CloudSlotId,
  save: GameSave
): Promise<CloudSaveSummary> {
  const uid = getAuthenticatedUid();
  if (!uid || !auth.currentUser) {
    throw new Error('Entre com sua conta Firebase/Google para gravar na nuvem.');
  }

  const compactedSave = stripUndefinedForFirestore(compactGameSaveForStorage(save));
  const activeClub: Club | undefined =
    compactedSave.clubs.find((c) => c.id === compactedSave.userClubId) || compactedSave.clubs[0];

  const safeClubId = /^[a-zA-Z0-9_\-]{2,40}$/.test(compactedSave.userClubId)
    ? compactedSave.userClubId
    : 'club_user';
  const clubName = (activeClub?.name || 'Clube').trim().slice(0, 80);
  const safeClubName = clubName.length >= 2 ? clubName : `${clubName} FC`;
  const safeShortName = (activeClub?.shortName || safeClubName).trim().slice(0, 32) || 'CLB';
  const safeManagerName = (compactedSave.managerName || 'Treinador').trim().slice(0, 80) || 'Treinador';
  const safeDate = (compactedSave.currentDate || '2026-01-15').slice(0, 20);
  const safeSeasonYear = Math.max(2025, Math.min(2150, Math.round(compactedSave.currentSeasonYear || 2026)));
  const safeRound = Math.max(1, Math.min(120, Math.round(compactedSave.currentRound || 1)));
  const safeBalance = Math.round(activeClub?.finances?.balance || 0);
  const safePrimary = normalizeHex(activeClub?.colors?.primary, '#0284c7');
  const safeSecondary = normalizeHex(activeClub?.colors?.text || activeClub?.colors?.secondary, '#ffffff');
  const safeDivision = String(activeClub?.division || 'A').slice(0, 16);
  const hof = extractHallOfFameSnapshot(compactedSave);

  // Primary path: single-request compressed relational save via authenticated Cloud SQL backend
  const idToken = await getFirebaseIdTokenInMemory();
  if (idToken) {
    try {
      const resp = await fetch(`/api/sql/saves/${encodeURIComponent(slotId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          save: compactedSave,
          summary: {
            clubId: safeClubId,
            clubName: safeClubName,
            clubShortName: safeShortName,
            clubPrimaryColor: safePrimary,
            clubSecondaryColor: safeSecondary,
            division: safeDivision,
            managerName: safeManagerName,
            seasonYear: safeSeasonYear,
            round: safeRound,
            currentDate: safeDate,
            clubBalance: safeBalance,
            trophiesCount: hof.trophiesCount,
            hallOfFamePoints: hof.hallOfFamePoints,
            winRatePct: hof.winRatePct,
          },
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { summary?: CloudSaveSummary };
        if (data?.summary) {
          return data.summary;
        }
      }
    } catch {
      // Fallback transparently to Firestore below
    }
  }

  // Fallback path: Firestore segmented storage
  const userRef = doc(db, 'users', uid);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await syncTrainerProfileToFirestore(auth.currentUser, save.managerName, save.userClubId);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  const { segments } = packGameSaveIntoNativeSegments(save);
  if (segments.length > 200) {
    throw new Error('Save excede o limite de segmentos em nuvem.');
  }

  const headerRef = doc(db, 'users', uid, 'cloudSaves', slotId);
  const headerPath = `users/${uid}/cloudSaves/${slotId}`;

  let existingCreatedAt: unknown = null;
  let existingSegmentIds: string[] = [];
  try {
    const [headerSnap, segListSnap] = await Promise.all([
      getDoc(headerRef),
      getDocs(
        query(
          collection(db, 'users', uid, 'cloudSaves', slotId, 'segments'),
          where('uid', '==', uid),
          where('slotId', '==', slotId)
        )
      ),
    ]);
    if (headerSnap.exists()) {
      existingCreatedAt = headerSnap.data().createdAt || null;
    }
    existingSegmentIds = segListSnap.docs.map((d) => d.id);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, headerPath);
  }

  const newSegmentIds = segments.map((s) => s.segmentId);
  const newSegmentIdSet = new Set(newSegmentIds);
  const staleSegmentIds = existingSegmentIds.filter((id) => !newSegmentIdSet.has(id));

  try {
    const batch = writeBatch(db);
    batch.set(headerRef, {
      uid,
      slotId,
      clubId: safeClubId,
      clubName: safeClubName,
      clubShortName: safeShortName,
      clubPrimaryColor: safePrimary,
      clubSecondaryColor: safeSecondary,
      division: safeDivision,
      managerName: safeManagerName,
      seasonYear: safeSeasonYear,
      round: safeRound,
      currentDate: safeDate,
      clubBalance: safeBalance,
      partCount: segments.length,
      segmentIds: newSegmentIds,
      formatVersion: CLOUD_FORMAT_VERSION,
      createdAt: existingCreatedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const seg of segments) {
      const segRef = doc(db, 'users', uid, 'cloudSaves', slotId, 'segments', seg.segmentId);
      batch.set(segRef, {
        uid,
        slotId,
        segmentId: seg.segmentId,
        orderIndex: seg.orderIndex,
        section: seg.section,
        payload: seg.payload,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, headerPath);
  }

  if (staleSegmentIds.length > 0) {
    try {
      const cleanupBatch = writeBatch(db);
      for (const staleId of staleSegmentIds) {
        cleanupBatch.delete(doc(db, 'users', uid, 'cloudSaves', slotId, 'segments', staleId));
      }
      await cleanupBatch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${headerPath}/segments`);
    }
  }

  return {
    slotId,
    clubId: safeClubId,
    clubName: safeClubName,
    clubShortName: safeShortName,
    clubPrimaryColor: safePrimary,
    clubSecondaryColor: safeSecondary,
    division: safeDivision,
    managerName: safeManagerName,
    seasonYear: safeSeasonYear,
    round: safeRound,
    currentDate: safeDate,
    clubBalance: safeBalance,
    partCount: segments.length,
    updatedAtIso: new Date().toISOString(),
  };
}

export async function listCloudSaves(): Promise<CloudSaveSummary[]> {
  const uid = getAuthenticatedUid();
  if (!uid) return [];

  const mergedBySlot = new Map<CloudSlotId, CloudSaveSummary>();

  // 1. Primary fast query from relational Cloud SQL PostgreSQL backend
  const idToken = await getFirebaseIdTokenInMemory();
  if (idToken) {
    try {
      const resp = await fetch('/api/sql/saves', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (resp.ok) {
        const data = (await resp.json()) as { saves?: CloudSaveSummary[] };
        if (Array.isArray(data?.saves)) {
          for (const item of data.saves) {
            mergedBySlot.set(item.slotId, item);
          }
        }
      }
    } catch {
      // Continue cleanly to legacy fallback
    }
  }

  // 2. Also surface any legacy Firestore saves not yet migrated to SQL
  try {
    const q = query(collection(db, 'users', uid, 'cloudSaves'), where('uid', '==', uid));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      const slotId = (data.slotId || d.id) as CloudSlotId;
      const ts = data.updatedAt as { toDate?: () => Date } | undefined;
      const summary: CloudSaveSummary = {
        slotId,
        clubId: String(data.clubId || ''),
        clubName: String(data.clubName || 'Clube'),
        clubShortName: String(data.clubShortName || 'Clube'),
        clubPrimaryColor: String(data.clubPrimaryColor || '#0284c7'),
        clubSecondaryColor: String(data.clubSecondaryColor || '#ffffff'),
        division: String(data.division || 'A'),
        managerName: String(data.managerName || 'Treinador'),
        seasonYear: Number(data.seasonYear || 2026),
        round: Number(data.round || 1),
        currentDate: String(data.currentDate || '2026-01-15'),
        clubBalance: Number(data.clubBalance || 0),
        partCount: Number(data.partCount || 1),
        updatedAtIso: ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString(),
      };
      const existing = mergedBySlot.get(slotId);
      if (!existing || summary.updatedAtIso > existing.updatedAtIso) {
        mergedBySlot.set(slotId, summary);
      }
    }
  } catch {
    if (mergedBySlot.size === 0) {
      return [];
    }
  }

  return Array.from(mergedBySlot.values());
}

export async function loadCareerFromCloud(slotId: CloudSlotId): Promise<GameSave | null> {
  const uid = getAuthenticatedUid();
  if (!uid) return null;

  // 1. Primary fast download from Cloud SQL PostgreSQL backend
  const idToken = await getFirebaseIdTokenInMemory();
  if (idToken) {
    try {
      const resp = await fetch(`/api/sql/saves/${encodeURIComponent(slotId)}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (resp.ok) {
        const data = (await resp.json()) as { save?: GameSave };
        if (data?.save && Array.isArray(data.save.clubs) && data.save.userClubId) {
          return data.save;
        }
      }
    } catch {
      // Fallback transparently to Firestore
    }
  }

  // 2. Fallback to legacy Firestore copy
  const headerPath = `users/${uid}/cloudSaves/${slotId}`;
  try {
    const headerSnap = await getDoc(doc(db, 'users', uid, 'cloudSaves', slotId));
    if (!headerSnap.exists()) return null;

    const segsSnap = await getDocs(
      query(
        collection(db, 'users', uid, 'cloudSaves', slotId, 'segments'),
        where('uid', '==', uid),
        where('slotId', '==', slotId)
      )
    );
    const segments: RawSegmentChunk[] = segsSnap.docs.map((d) => {
      const data = d.data();
      return {
        segmentId: String(data.segmentId || d.id),
        orderIndex: Number(data.orderIndex || 0),
        section: String(data.section || 'core'),
        payload: (data.payload || {}) as Record<string, unknown>,
      };
    });

    return unpackGameSaveFromNativeSegments(segments);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, headerPath);
  }
}

export async function deleteCloudSave(slotId: CloudSlotId): Promise<void> {
  const uid = getAuthenticatedUid();
  if (!uid) return;

  // 1. Delete from Cloud SQL PostgreSQL backend
  const idToken = await getFirebaseIdTokenInMemory();
  if (idToken) {
    try {
      await fetch(`/api/sql/saves/${encodeURIComponent(slotId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
    } catch {
      // Continue cleanup in Firestore if applicable
    }
  }

  // 2. Clean up any legacy Firestore copy as well
  try {
    const headerRef = doc(db, 'users', uid, 'cloudSaves', slotId);
    const headerSnap = await getDoc(headerRef);
    if (!headerSnap.exists()) return;
    const segsSnap = await getDocs(
      query(
        collection(db, 'users', uid, 'cloudSaves', slotId, 'segments'),
        where('uid', '==', uid),
        where('slotId', '==', slotId)
      )
    );
    const batch = writeBatch(db);
    segsSnap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    await deleteDoc(headerRef);
  } catch {
    // Already deleted from primary SQL store
  }
}

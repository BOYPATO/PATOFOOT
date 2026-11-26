import {
  ClubColors,
  EuropeanCupId,
  EuropeanLeagueId,
  Fixture,
  GameSave,
  InternationalMatchFixture,
  NationalTournamentEdition,
  ContinentalQualifiersCycle,
  Player,
  SouthAmericanCupId,
  SouthAmericanLeagueId,
  WorldCupId,
  WorldCupQualifiersCycle,
  WorldLeagueId,
} from '../types/game';

export type SaveSlotNumber = 1 | 2 | 3 | 4 | 5;

export const CAREER_SLOT_NUMBERS: readonly SaveSlotNumber[] = [1, 2, 3, 4, 5];

export type CareerSaveKey =
  | 'brasfoot_autosave'
  | 'brasfoot_slot_1'
  | 'brasfoot_slot_2'
  | 'brasfoot_slot_3'
  | 'brasfoot_slot_4'
  | 'brasfoot_slot_5';

export interface SaveSlotSummary {
  key: CareerSaveKey;
  saveName: string;
  savedAt: string;
  userClubId: string;
  clubName: string;
  clubShortName: string;
  clubInitials: string;
  clubColors: ClubColors;
  managerName: string;
  currentSeasonYear: number;
  currentRound: number;
  currentDate: string;
}

const ALL_SAVE_KEYS: CareerSaveKey[] = [
  'brasfoot_autosave',
  'brasfoot_slot_1',
  'brasfoot_slot_2',
  'brasfoot_slot_3',
  'brasfoot_slot_4',
  'brasfoot_slot_5',
];

const DB_NAME = 'patofoot_career_storage_v1';
const DB_VERSION = 1;
const STORE_NAME = 'career_saves';
const META_PREFIX = 'patofoot_meta_';

const memorySaveCache = new Map<CareerSaveKey, GameSave>();
const compactedSaveObjects = new WeakSet<GameSave>();
let legacyMigrationDone = false;
let dbInstancePromise: Promise<IDBDatabase | null> | null = null;

function getMetaKey(key: CareerSaveKey): string {
  return `${META_PREFIX}${key}`;
}

export function buildSaveSummary(key: CareerSaveKey, save: GameSave): SaveSlotSummary {
  const club = save.clubs?.find((c) => c.id === save.userClubId) || save.clubs?.[0];
  return {
    key,
    saveName: save.saveName || 'Carreira PATOFOOT',
    savedAt: save.savedAt || new Date().toLocaleString('pt-BR'),
    userClubId: save.userClubId,
    clubName: club?.name || save.saveName || 'Clube',
    clubShortName: club?.shortName || 'Clube',
    clubInitials: club?.initials || 'PF',
    clubColors: club?.colors || {
      primary: '#0284c7',
      secondary: '#0f172a',
      text: '#ffffff',
    },
    managerName: save.managerName || 'Treinador',
    currentSeasonYear: save.currentSeasonYear || 2027,
    currentRound: save.currentRound || 1,
    currentDate: save.currentDate || '2027-01-10',
  };
}

function compactPlayer(player: Player): Player {
  const cleaned: Player = { ...player };

  if (
    cleaned.competitionYellowCards &&
    Object.keys(cleaned.competitionYellowCards).length === 0
  ) {
    delete cleaned.competitionYellowCards;
  }
  if (
    cleaned.competitionRedCards &&
    Object.keys(cleaned.competitionRedCards).length === 0
  ) {
    delete cleaned.competitionRedCards;
  }
  if (cleaned.suspensions && cleaned.suspensions.length === 0) {
    delete cleaned.suspensions;
  }
  if (!cleaned.injuryWeeks && cleaned.injuryDetails) {
    delete cleaned.injuryDetails;
  }

  return cleaned;
}

function compactFixtureList(
  fixtures: Fixture[] | undefined,
  userClubId: string
): Fixture[] | undefined {
  if (!fixtures) return undefined;

  // Keep full play-by-play events/stats only on the user's most recent 16 played matches
  const playedUserFixtureIds = fixtures
    .filter(
      (f) =>
        f.played &&
        (f.homeTeamId === userClubId || f.awayTeamId === userClubId) &&
        (f.events || f.stats)
    )
    .slice(-16)
    .map((f) => f.id);
  const keepRichReportIds = new Set<string>(playedUserFixtureIds);

  return fixtures.map((f) => {
    if (!f.played) return f;
    const isUserMatch = f.homeTeamId === userClubId || f.awayTeamId === userClubId;
    if (isUserMatch && keepRichReportIds.has(f.id)) {
      return f;
    }
    if (!f.events && !f.stats && !f.penaltyKicks) {
      return f;
    }
    const slim: Fixture = { ...f };
    delete slim.events;
    delete slim.stats;
    if (!isUserMatch) {
      delete slim.penaltyKicks;
    }
    return slim;
  });
}

function compactInternationalFixtures(
  fixtures: InternationalMatchFixture[] | undefined,
  userTeamId?: string | null
): InternationalMatchFixture[] | undefined {
  if (!fixtures) return undefined;
  return fixtures.map((m) => {
    if (!m.played || !m.highlights) return m;
    const isRelevantToUser =
      m.homeTeamId === userTeamId ||
      m.awayTeamId === userTeamId ||
      m.homeTeamId === 'bra' ||
      m.awayTeamId === 'bra';
    if (isRelevantToUser) return m;
    const slim: InternationalMatchFixture = { ...m };
    delete slim.highlights;
    return slim;
  });
}

function compactQualifiersCycle(
  cycle: WorldCupQualifiersCycle | undefined,
  userTeamId?: string | null
): WorldCupQualifiersCycle | undefined {
  if (!cycle) return undefined;
  return {
    ...cycle,
    conmebolFixtures:
      compactInternationalFixtures(cycle.conmebolFixtures, userTeamId) || [],
    otherConfedFixtures:
      compactInternationalFixtures(cycle.otherConfedFixtures, userTeamId) || [],
  };
}

function compactContinentalQualifiersCycle(
  cycle: ContinentalQualifiersCycle | undefined,
  userTeamId?: string | null
): ContinentalQualifiersCycle | undefined {
  if (!cycle) return undefined;
  const tracks = { ...cycle.tracks };
  (Object.keys(tracks) as (keyof typeof tracks)[]).forEach((k) => {
    const tr = tracks[k];
    if (tr) {
      tracks[k] = {
        ...tr,
        fixtures: compactInternationalFixtures(tr.fixtures, userTeamId) || [],
      };
    }
  });
  return {
    ...cycle,
    tracks,
  };
}

function compactTournamentEdition(
  edition: NationalTournamentEdition | undefined,
  userTeamId?: string | null
): NationalTournamentEdition | undefined {
  if (!edition) return undefined;
  return {
    ...edition,
    fixtures: compactInternationalFixtures(edition.fixtures, userTeamId) || [],
  };
}

/**
 * Losslessly compacts a GameSave before persistence by trimming transient
 * play-by-play arrays from completed CPU-vs-CPU matches and capping old log arrays.
 */
export function compactGameSaveForStorage(save: GameSave): GameSave {
  if (compactedSaveObjects.has(save)) {
    return save;
  }
  const userClubId = save.userClubId;
  const userSelecaoId = save.nationalTeam?.userTeamId;

  const compactedClubs = save.clubs.map((club) => ({
    ...club,
    squad: club.squad.map(compactPlayer),
    finances: club.finances
      ? {
          ...club.finances,
          ledger: (club.finances.ledger || []).slice(0, club.id === userClubId ? 90 : 12),
        }
      : club.finances,
  }));

  // Keep all unread messages + up to 90 recent read messages
  const unreadInbox = (save.inbox || []).filter((m) => !m.read);
  const readInbox = (save.inbox || []).filter((m) => m.read).slice(0, 90);
  const compactedInbox = [...unreadInbox, ...readInbox].slice(0, 120);

  const compactedTransferHistory = (save.transferHistory || []).slice(0, 150);

  // Preserve full detail on the 6 most recent archived seasons; strip verbose tables from older eras while retaining honors/champions
  const rawArchive = save.seasonHistoryArchive || [];
  const compactedSeasonHistoryArchive =
    rawArchive.length > 6
      ? rawArchive.map((seasonEntry, idx) => {
          if (idx >= rawArchive.length - 6) return seasonEntry;
          return {
            ...seasonEntry,
            topScorersOverall: (seasonEntry.topScorersOverall || []).slice(0, 5),
            topAssistersOverall: (seasonEntry.topAssistersOverall || []).slice(0, 5),
            topPerformersSnapshot: (seasonEntry.topPerformersSnapshot || []).slice(0, 5),
          };
        })
      : rawArchive;

  let compactedNationalTeam = save.nationalTeam;
  if (compactedNationalTeam) {
    const compactedContinentals = compactedNationalTeam.continentals
      ? {
          copa_america: compactTournamentEdition(
            compactedNationalTeam.continentals.copa_america,
            userSelecaoId
          )!,
          eurocopa: compactTournamentEdition(
            compactedNationalTeam.continentals.eurocopa,
            userSelecaoId
          )!,
          copa_africana: compactTournamentEdition(
            compactedNationalTeam.continentals.copa_africana,
            userSelecaoId
          )!,
          copa_asia: compactTournamentEdition(
            compactedNationalTeam.continentals.copa_asia,
            userSelecaoId
          )!,
          copa_oceania: compactTournamentEdition(
            compactedNationalTeam.continentals.copa_oceania,
            userSelecaoId
          )!,
          copa_ouro: compactTournamentEdition(
            compactedNationalTeam.continentals.copa_ouro,
            userSelecaoId
          )!,
          nations_league: compactTournamentEdition(
            compactedNationalTeam.continentals.nations_league,
            userSelecaoId
          )!,
        }
      : undefined;

    compactedNationalTeam = {
      ...compactedNationalTeam,
      callUpHistory: (compactedNationalTeam.callUpHistory || []).slice(0, 40),
      qualifiers: compactQualifiersCycle(
        compactedNationalTeam.qualifiers,
        userSelecaoId
      ),
      completedQualifiersArchive: compactQualifiersCycle(
        compactedNationalTeam.completedQualifiersArchive,
        userSelecaoId
      ),
      continentalQualifiers: compactContinentalQualifiersCycle(
        compactedNationalTeam.continentalQualifiers,
        userSelecaoId
      ),
      completedContinentalQualifiersArchive: compactContinentalQualifiersCycle(
        compactedNationalTeam.completedContinentalQualifiersArchive,
        userSelecaoId
      ),
      worldCup: compactTournamentEdition(
        compactedNationalTeam.worldCup,
        userSelecaoId
      ),
      continentals: compactedContinentals,
      seasonSchedule: compactInternationalFixtures(
        compactedNationalTeam.seasonSchedule,
        userSelecaoId
      ),
    };
  }

  const compactedCarousel = save.coachingCarousel
    ? {
        ...save.coachingCarousel,
        movementHistory: (save.coachingCarousel.movementHistory || []).slice(0, 60),
      }
    : undefined;

  let compactedFixturesSA: Partial<Record<SouthAmericanLeagueId, Fixture[]>> | undefined;
  if (save.fixturesSouthAmerica) {
    compactedFixturesSA = {};
    for (const [k, list] of Object.entries(save.fixturesSouthAmerica)) {
      compactedFixturesSA[k as SouthAmericanLeagueId] = compactFixtureList(list, userClubId);
    }
  }

  let compactedFixturesEU: Partial<Record<EuropeanLeagueId, Fixture[]>> | undefined;
  if (save.fixturesEurope) {
    compactedFixturesEU = {};
    for (const [k, list] of Object.entries(save.fixturesEurope)) {
      compactedFixturesEU[k as EuropeanLeagueId] = compactFixtureList(list, userClubId);
    }
  }

  const compactFixtureMap = <K extends string>(
    map: Partial<Record<K, Fixture[]>> | undefined
  ): Partial<Record<K, Fixture[]>> | undefined => {
    if (!map) return undefined;
    const out: Partial<Record<K, Fixture[]>> = {};
    for (const [k, list] of Object.entries(map) as Array<[K, Fixture[] | undefined]>) {
      if (list) out[k] = compactFixtureList(list, userClubId);
    }
    return out;
  };

  const result: GameSave = {
    ...save,
    clubs: compactedClubs,
    fixturesA: compactFixtureList(save.fixturesA, userClubId) || [],
    fixturesB: compactFixtureList(save.fixturesB, userClubId) || [],
    fixturesC: compactFixtureList(save.fixturesC, userClubId),
    fixturesD: compactFixtureList(save.fixturesD, userClubId),
    fixturesSupercopa: compactFixtureList(save.fixturesSupercopa, userClubId),
    fixturesRecopa: compactFixtureList(save.fixturesRecopa, userClubId),
    fixturesLibertadores: compactFixtureList(save.fixturesLibertadores, userClubId),
    fixturesSulamericana: compactFixtureList(save.fixturesSulamericana, userClubId),
    fixturesCopaBrasil: compactFixtureList(save.fixturesCopaBrasil, userClubId),
    fixturesCopaNordeste: compactFixtureList(save.fixturesCopaNordeste, userClubId),
    fixturesCopaVerde: compactFixtureList(save.fixturesCopaVerde, userClubId),
    fixturesEstadual: compactFixtureList(save.fixturesEstadual, userClubId),
    fixturesIntercontinental: compactFixtureList(save.fixturesIntercontinental, userClubId),
    fixturesSouthAmerica: compactedFixturesSA,
    fixturesEurope: compactedFixturesEU,
    fixturesWorldLeagues: compactFixtureMap<WorldLeagueId>(save.fixturesWorldLeagues),
    fixturesEuropeanCups: compactFixtureMap<EuropeanCupId>(save.fixturesEuropeanCups),
    fixturesSouthAmericanCups: compactFixtureMap<SouthAmericanCupId>(save.fixturesSouthAmericanCups),
    fixturesWorldCups: compactFixtureMap<WorldCupId>(save.fixturesWorldCups),
    fixturesChampionsLeague: compactFixtureList(save.fixturesChampionsLeague, userClubId),
    fixturesEuropaLeague: compactFixtureList(save.fixturesEuropaLeague, userClubId),
    fixturesConferenceLeague: compactFixtureList(save.fixturesConferenceLeague, userClubId),
    fixturesUefaSupercup: compactFixtureList(save.fixturesUefaSupercup, userClubId),
    fixturesCopaInternacional: compactFixtureList(save.fixturesCopaInternacional, userClubId),
    fixturesConcacafChampions: compactFixtureList(save.fixturesConcacafChampions, userClubId),
    fixturesAfcChampions: compactFixtureList(save.fixturesAfcChampions, userClubId),
    fixturesSuperMundial: compactFixtureList(save.fixturesSuperMundial, userClubId),
    fixturesEngCommunityShield: compactFixtureList(save.fixturesEngCommunityShield, userClubId),
    fixturesEngEflCup: compactFixtureList(save.fixturesEngEflCup, userClubId),
    fixturesEngFaCup: compactFixtureList(save.fixturesEngFaCup, userClubId),
    inbox: compactedInbox,
    transferMarket: (save.transferMarket || []).map(compactPlayer),
    transferOffers: (save.transferOffers || []).slice(0, 25),
    transferHistory: compactedTransferHistory,
    seasonHistoryArchive: compactedSeasonHistoryArchive,
    nationalTeam: compactedNationalTeam,
    coachingCarousel: compactedCarousel,
  };
  compactedSaveObjects.add(result);
  return result;
}

function openSaveDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  dbInstancePromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbInstancePromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        dbInstancePromise = null;
        resolve(null);
      };

      request.onblocked = () => {
        dbInstancePromise = null;
        resolve(null);
      };
    } catch {
      dbInstancePromise = null;
      resolve(null);
    }
  });

  return dbInstancePromise;
}

function idbPutSave(db: IDBDatabase, key: CareerSaveKey, save: GameSave): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(save, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function idbGetSave(db: IDBDatabase, key: CareerSaveKey): Promise<GameSave | null> {
  return new Promise<GameSave | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const val = req.result as GameSave | undefined;
        resolve(val && val.clubs && val.userClubId ? val : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbDeleteSave(db: IDBDatabase, key: CareerSaveKey): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

function writeSummaryToLocalStorage(summary: SaveSlotSummary): void {
  const serialized = JSON.stringify(summary);
  try {
    localStorage.setItem(getMetaKey(summary.key), serialized);
  } catch {
    // If legacy multi-MB save strings are clogging localStorage, free autosave first and retry
    try {
      localStorage.removeItem('brasfoot_autosave');
      localStorage.setItem(getMetaKey(summary.key), serialized);
    } catch {
      // Ignore if localStorage itself is disabled
    }
  }
}

export function getSaveSummarySync(key: CareerSaveKey): SaveSlotSummary | null {
  try {
    const rawMeta = localStorage.getItem(getMetaKey(key));
    if (rawMeta) {
      const parsed = JSON.parse(rawMeta) as SaveSlotSummary;
      if (parsed && parsed.userClubId) {
        return parsed;
      }
    }
  } catch {
    // Fallback to checking in-memory cache or legacy localStorage slot
  }

  const mem = memorySaveCache.get(key);
  if (mem) {
    return buildSaveSummary(key, mem);
  }

  try {
    const legacyRaw = localStorage.getItem(key);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as GameSave;
      if (parsed && parsed.clubs && parsed.userClubId) {
        return buildSaveSummary(key, parsed);
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getSlotSummarySync(slotNum: SaveSlotNumber): SaveSlotSummary | null {
  return getSaveSummarySync(`brasfoot_slot_${slotNum}`);
}

export function getAllSlotSummariesSync(): Record<SaveSlotNumber, SaveSlotSummary | null> {
  return {
    1: getSlotSummarySync(1),
    2: getSlotSummarySync(2),
    3: getSlotSummarySync(3),
    4: getSlotSummarySync(4),
    5: getSlotSummarySync(5),
  };
}

export function findFirstAvailableSlotSync(): SaveSlotNumber {
  for (const n of CAREER_SLOT_NUMBERS) {
    if (!getSlotSummarySync(n)) return n;
  }
  return 1;
}

export function hasAnySavedCareerSlotSync(): boolean {
  return CAREER_SLOT_NUMBERS.some((n) => Boolean(getSlotSummarySync(n)));
}

export function hasSavedAutosaveHintSync(): boolean {
  return Boolean(getSaveSummarySync('brasfoot_autosave'));
}

export function readSyncCachedOrLegacySave(key: CareerSaveKey): GameSave | null {
  const cached = memorySaveCache.get(key);
  if (cached) return cached;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSave;
    if (parsed && parsed.clubs && parsed.userClubId) {
      memorySaveCache.set(key, parsed);
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Migrates any legacy multi-MB saves from localStorage into IndexedDB so
 * localStorage quota is freed permanently without losing existing saves.
 */
async function migrateLegacyLocalStorageSaves(db: IDBDatabase): Promise<void> {
  if (legacyMigrationDone) return;
  legacyMigrationDone = true;
  for (const key of ALL_SAVE_KEYS) {
    let legacyRaw: string | null = null;
    try {
      legacyRaw = localStorage.getItem(key);
    } catch {
      legacyRaw = null;
    }
    if (!legacyRaw) continue;

    try {
      const parsed = JSON.parse(legacyRaw) as GameSave;
      if (parsed && parsed.clubs && parsed.userClubId) {
        const existingInDb = await idbGetSave(db, key);
        const compacted = compactGameSaveForStorage(parsed);
        if (!existingInDb) {
          const ok = await idbPutSave(db, key, compacted);
          if (ok) {
            memorySaveCache.set(key, compacted);
            localStorage.removeItem(key);
            writeSummaryToLocalStorage(buildSaveSummary(key, compacted));
          }
        } else {
          // Already safely in IndexedDB: remove bulky duplicate from localStorage
          localStorage.removeItem(key);
          writeSummaryToLocalStorage(buildSaveSummary(key, existingInDb));
        }
      }
    } catch {
      // Corrupted legacy string: remove so it stops blocking localStorage quota
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Initializes IndexedDB storage on app startup, migrates any legacy localStorage
 * saves, refreshes slot metadata, and returns the latest autosave if enabled and present.
 */
export async function initializeCareerSaveStorage(options?: {
  includeAutoSave?: boolean;
}): Promise<GameSave | null> {
  const includeAutoSave = options?.includeAutoSave !== false;
  const db = await openSaveDatabase();
  if (!db) {
    if (!includeAutoSave) {
      await deleteCareerSave('brasfoot_autosave');
      return null;
    }
    return readSyncCachedOrLegacySave('brasfoot_autosave');
  }

  await migrateLegacyLocalStorageSaves(db);

  // Sync slot metadata from IndexedDB in case metadata was cleared
  for (const slotKey of [
    'brasfoot_slot_1',
    'brasfoot_slot_2',
    'brasfoot_slot_3',
    'brasfoot_slot_4',
    'brasfoot_slot_5',
  ] as CareerSaveKey[]) {
    const slotSave = await idbGetSave(db, slotKey);
    if (slotSave) {
      memorySaveCache.set(slotKey, slotSave);
      writeSummaryToLocalStorage(buildSaveSummary(slotKey, slotSave));
    }
  }

  if (!includeAutoSave) {
    cancelScheduledAutoSave();
    memorySaveCache.delete('brasfoot_autosave');
    try {
      localStorage.removeItem('brasfoot_autosave');
      localStorage.removeItem(getMetaKey('brasfoot_autosave'));
    } catch {
      // ignore
    }
    await idbDeleteSave(db, 'brasfoot_autosave');
    return null;
  }

  const autoSave = await idbGetSave(db, 'brasfoot_autosave');
  if (autoSave) {
    memorySaveCache.set('brasfoot_autosave', autoSave);
    writeSummaryToLocalStorage(buildSaveSummary('brasfoot_autosave', autoSave));
    return autoSave;
  }

  return readSyncCachedOrLegacySave('brasfoot_autosave');
}

/**
 * Lightweight read-only check that only hydrates missing slot summaries (Slots 1-5)
 * without touching autosave or reading already-summarized slots.
 */
export async function refreshSaveSlotSummaries(): Promise<void> {
  const missingSlots = CAREER_SLOT_NUMBERS.filter((n) => !getSlotSummarySync(n));
  if (missingSlots.length === 0) return;

  const db = await openSaveDatabase();
  if (!db) return;

  for (const slotNum of missingSlots) {
    const slotKey: CareerSaveKey = `brasfoot_slot_${slotNum}`;
    const slotSave = await idbGetSave(db, slotKey);
    if (slotSave) {
      memorySaveCache.set(slotKey, slotSave);
      writeSummaryToLocalStorage(buildSaveSummary(slotKey, slotSave));
    }
  }
}

/**
 * Persists a GameSave to IndexedDB (unlimited browser storage) + lightweight
 * metadata in localStorage, falling back to compacted localStorage if IndexedDB is blocked.
 */
export async function persistCareerSave(
  key: CareerSaveKey,
  save: GameSave
): Promise<boolean> {
  const compacted = compactGameSaveForStorage(save);
  memorySaveCache.set(key, compacted);
  const summary = buildSaveSummary(key, compacted);

  const db = await openSaveDatabase();
  if (db) {
    // Migrate any other legacy localStorage slots before cleaning up bulky keys
    await migrateLegacyLocalStorageSaves(db);
    const storedInIdb = await idbPutSave(db, key, compacted);
    if (storedInIdb) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
      writeSummaryToLocalStorage(summary);
      return true;
    }
  }

  // Fallback when IndexedDB is unavailable in restricted browser contexts
  const serialized = JSON.stringify(compacted);
  try {
    localStorage.setItem(key, serialized);
    writeSummaryToLocalStorage(summary);
    return true;
  } catch {
    try {
      if (key !== 'brasfoot_autosave') {
        localStorage.removeItem('brasfoot_autosave');
      }
      localStorage.setItem(key, serialized);
      writeSummaryToLocalStorage(summary);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Loads a GameSave from memory cache, IndexedDB, or legacy localStorage.
 */
export async function loadCareerSave(key: CareerSaveKey): Promise<GameSave | null> {
  const cached = memorySaveCache.get(key);
  if (cached) {
    return cached;
  }

  const db = await openSaveDatabase();
  if (db) {
    const fromDb = await idbGetSave(db, key);
    if (fromDb) {
      memorySaveCache.set(key, fromDb);
      writeSummaryToLocalStorage(buildSaveSummary(key, fromDb));
      return fromDb;
    }
  }

  return readSyncCachedOrLegacySave(key);
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let autoSaveIdleId: number | null = null;
let pendingAutoSavePayload: GameSave | null = null;
let flushListenersAttached = false;

function flushPendingAutoSaveNow(): void {
  const payload = pendingAutoSavePayload;
  if (!payload) return;
  pendingAutoSavePayload = null;
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  if (autoSaveIdleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(
      autoSaveIdleId
    );
    autoSaveIdleId = null;
  }
  void persistCareerSave('brasfoot_autosave', payload);
}

function ensureAutoSaveFlushListeners(): void {
  if (flushListenersAttached || typeof window === 'undefined') return;
  flushListenersAttached = true;
  window.addEventListener('pagehide', flushPendingAutoSaveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingAutoSaveNow();
    }
  });
}

/**
 * Cancels any pending debounced autosave write to IndexedDB.
 */
export function cancelScheduledAutoSave(): void {
  pendingAutoSavePayload = null;
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  if (autoSaveIdleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(
      autoSaveIdleId
    );
    autoSaveIdleId = null;
  }
}

/**
 * Deletes a save slot or autosave from memory, IndexedDB, and localStorage.
 */
export async function deleteCareerSave(key: CareerSaveKey): Promise<void> {
  if (key === 'brasfoot_autosave') {
    cancelScheduledAutoSave();
  }
  memorySaveCache.delete(key);
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(getMetaKey(key));
  } catch {
    // ignore
  }

  const db = await openSaveDatabase();
  if (db) {
    await idbDeleteSave(db, key);
  }
}

/**
 * Clears all career slots and autosaves completely.
 */
export async function clearAllCareerSaves(): Promise<void> {
  cancelScheduledAutoSave();
  for (const key of ALL_SAVE_KEYS) {
    await deleteCareerSave(key);
  }
}

/**
 * Schedules a non-blocking, idle-deferred autosave while updating the in-memory cache immediately.
 * Compaction and IndexedDB writes run when the browser is idle (or immediately on pagehide/background)
 * so fast clicks and mobile scrolling stay 100% stutter-free.
 */
export function scheduleAutoSave(save: GameSave): void {
  memorySaveCache.set('brasfoot_autosave', save);
  pendingAutoSavePayload = save;
  ensureAutoSaveFlushListeners();

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  if (autoSaveIdleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(
      autoSaveIdleId
    );
    autoSaveIdleId = null;
  }

  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    const runPersist = () => {
      autoSaveIdleId = null;
      const latest = pendingAutoSavePayload;
      if (!latest) return;
      pendingAutoSavePayload = null;
      void persistCareerSave('brasfoot_autosave', latest);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      autoSaveIdleId = (
        window as unknown as {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(runPersist, { timeout: 1500 });
    } else {
      runPersist();
    }
  }, 650);
}

/**
 * Exports a GameSave as a downloadable .json file using Blob + ObjectURL
 * so large multi-season saves never exceed browser data-URI length limits.
 */
export function downloadSaveAsJsonFile(save: GameSave, fileTag?: string): boolean {
  try {
    const exported: GameSave = {
      ...compactGameSaveForStorage(save),
      savedAt: new Date().toLocaleString('pt-BR'),
    };
    const jsonContent = JSON.stringify(exported);
    const blob = new Blob([jsonContent], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    const suffix = fileTag ? `_${fileTag}` : '';
    downloadAnchor.download = `patofoot_${save.userClubId}_ano${save.currentSeasonYear}${suffix}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);
    return true;
  } catch {
    return false;
  }
}

export async function exportSlotAsJsonFile(key: CareerSaveKey): Promise<boolean> {
  const save = await loadCareerSave(key);
  if (!save) return false;
  const tag = key.replace('brasfoot_', '');
  return downloadSaveAsJsonFile(save, tag);
}

const MAX_IMPORT_JSON_CHARS = 20 * 1024 * 1024; // 20 MB safety ceiling
const BLOCKED_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function validateAndParseImportedSaveJson(rawText: string): {
  ok: boolean;
  save?: GameSave;
  error?: string;
} {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 20) {
    return { ok: false, error: 'O arquivo selecionado está vazio ou corrompido.' };
  }
  if (rawText.length > MAX_IMPORT_JSON_CHARS) {
    return { ok: false, error: 'Arquivo muito grande (limite de 20 MB por backup).' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText, (key, value) => (BLOCKED_JSON_KEYS.has(key) ? undefined : value));
  } catch {
    return { ok: false, error: 'Formato JSON inválido. Selecione um backup .json do PATOFOOT 2027.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Estrutura do arquivo incompatível com o PATOFOOT 2027.' };
  }
  const candidate = parsed as Partial<GameSave>;
  if (!Array.isArray(candidate.clubs) || candidate.clubs.length === 0 || candidate.clubs.length > 2500) {
    return { ok: false, error: 'Arquivo inválido: lista de clubes ausente ou fora do limite.' };
  }
  if (
    typeof candidate.userClubId !== 'string' ||
    !/^[a-zA-Z0-9_\-]{1,64}$/.test(candidate.userClubId.trim())
  ) {
    return { ok: false, error: 'Arquivo inválido: clube do treinador não identificado.' };
  }
  const userClubExists = candidate.clubs.some((c) => c && c.id === candidate.userClubId);
  if (!userClubExists) {
    return { ok: false, error: 'Arquivo inconsistente: o clube salvo não existe na base do arquivo.' };
  }
  const hasValidSquads = candidate.clubs.every(
    (c) => c && typeof c.id === 'string' && Array.isArray(c.squad)
  );
  if (!hasValidSquads) {
    return { ok: false, error: 'Arquivo danificado: dados de elenco inválidos.' };
  }
  if (
    typeof candidate.currentSeasonYear !== 'number' ||
    !Number.isFinite(candidate.currentSeasonYear) ||
    candidate.currentSeasonYear < 2020 ||
    candidate.currentSeasonYear > 2200
  ) {
    return { ok: false, error: 'Arquivo inválido: ano da temporada ausente ou corrompido.' };
  }
  return { ok: true, save: candidate as GameSave };
}


import { Club, DetailedRole, MAX_SQUAD_SIZE, Player } from '../types/game';
import { createPlayer, ensureMinimumSquadDepth } from '../data/initialData';
import { ensurePlayerContractFields } from '../utils/contractLifecycleEngine';
import { EUROPEAN_LEAGUES_META, getClubEuropeanLeagueId } from '../utils/europeLeaguesEngine';
import {
  getClubSouthAmericanLeagueId,
  SOUTH_AMERICAN_LEAGUES_META,
} from '../utils/southAmericaLeaguesEngine';
import { getClubWorldLeagueId, WORLD_LEAGUES_META } from '../utils/worldLeaguesEngine';
import { getClubEstadualConfig } from '../data/estaduais2026Config';

const PT_MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

const PT_MONTHS_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export interface RealTimeSyncPeriod {
  monthKey: string;
  shortLabel: string;
  fullLabel: string;
  slashLabel: string;
  year: number;
}

/**
 * Returns the real-life current month and year formatted in PT-BR
 * (e.g. `Nov/2026`, `Novembro de 2026`, `Novembro/2026`) so squad updates
 * always follow the current real-world month automatically.
 */
export function getCurrentRealWorldSyncPeriod(now: Date = new Date()): RealTimeSyncPeriod {
  const year = now.getFullYear();
  const monthIdx = now.getMonth();
  const mm = String(monthIdx + 1).padStart(2, '0');
  const shortMonth = PT_MONTHS_SHORT[monthIdx] || 'Nov';
  const fullMonth = PT_MONTHS_FULL[monthIdx] || 'Novembro';
  return {
    monthKey: `${year}-${mm}`,
    shortLabel: `${shortMonth}/${year}`,
    fullLabel: `${fullMonth} de ${year}`,
    slashLabel: `${fullMonth}/${year}`,
    year,
  };
}

export type RosterApiSourceId =
  | 'API_FOOTBALL'
  | 'FOOTBALL_DATA'
  | 'ESPN_SOCCER'
  | 'WIKIPEDIA'
  | 'THESPORTSDB'
  | 'GEMINI_SEARCH';

export interface MonthlyRosterApiProviderStatus {
  id: RosterApiSourceId;
  name: string;
  kind: 'FOOTBALL_API' | 'AI_SEARCH';
  enabled: boolean;
  configuredViaSecret: boolean;
  description: string;
}

export interface MonthlyRosterApiStatus {
  monthKey: string;
  shortLabel: string;
  fullLabel: string;
  providers: MonthlyRosterApiProviderStatus[];
  syncedThisMonthCount: number;
  totalCachedCount: number;
  lastUpdatedAt: string | null;
  sourcesBreakdown: Record<string, number>;
}

export interface MonthlySyncMeta {
  lastMonthKey: string;
  lastSyncedAt: string;
  syncedClubsCount: number;
  lastProviderLabels: string[];
}

export function isProfileFreshForCurrentMonth(
  profile?: Oct2026ClubSquadProfile,
  monthKey: string = getCurrentRealWorldSyncPeriod().monthKey
): boolean {
  return Boolean(
    profile &&
      Array.isArray(profile.players) &&
      profile.players.length >= 16 &&
      (profile.monthKey === monthKey ||
        (typeof profile.updatedAt === 'string' && profile.updatedAt.startsWith(monthKey)))
  );
}

export interface Oct2026SquadPlayerDto {
  name: string;
  role: DetailedRole;
  age: number;
  overall: number;
  nationality: string;
  jerseyNumber: number;
  isStarter: boolean;
}

export interface Oct2026ClubSquadProfile {
  clubId: string;
  managerName: string;
  updatedAt: string;
  monthKey?: string;
  source?: RosterApiSourceId;
  sourceLabel?: string;
  players: Oct2026SquadPlayerDto[];
}

export interface Oct2026GroundingSource {
  title: string;
  uri: string;
}

export type Oct2026SyncRegionScope =
  | 'ALL'
  | 'SERIE_A_B'
  | 'BRASIL'
  | 'EUROPA'
  | 'SUL_AMERICA'
  | 'MUNDO';

export type RosterSyncProviderPreference = 'AUTO' | 'FOOTBALL_API_FIRST' | 'GEMINI_SEARCH';

export interface Oct2026BatchProgress {
  currentBatchLabel: string;
  completedCount: number;
  totalCount: number;
  newlyUpdatedInSession: number;
  usedGoogleSearch: boolean;
  usedExternalApi?: boolean;
}

export interface Oct2026RegionCoverageItem {
  scope: Oct2026SyncRegionScope;
  label: string;
  subtitle: string;
  totalClubs: number;
  syncedClubs: number;
}

export interface Oct2026CoverageSummary {
  totalClubs: number;
  syncedClubs: number;
  pendingClubs: number;
  percentage: number;
  regions: Oct2026RegionCoverageItem[];
}

export interface SyncOct2026Options {
  forceRefresh?: boolean;
  batchSize?: number;
  preferredProvider?: RosterSyncProviderPreference;
  signal?: AbortSignal;
  onProgress?: (
    clubName: string,
    completedCount: number,
    totalCount: number,
    meta?: Oct2026BatchProgress
  ) => void;
  onBatchSynced?: (
    batchProfiles: Record<string, Oct2026ClubSquadProfile>,
    groundingSources: Oct2026GroundingSource[],
    progress: Oct2026BatchProgress
  ) => void;
}

const OCT2026_STORAGE_KEY = 'patofoot_ai_oct2026_squads_v1';
const MONTHLY_SYNC_META_STORAGE_KEY = 'patofoot_monthly_api_sync_meta_v1';

export function getLastMonthlySyncMeta(): MonthlySyncMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MONTHLY_SYNC_META_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MonthlySyncMeta;
    if (parsed && typeof parsed.lastMonthKey === 'string') {
      return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

export function recordMonthlySyncMeta(
  monthKey: string,
  syncedClubsCount: number,
  providerLabels: string[]
): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = getLastMonthlySyncMeta();
    const mergedLabels = Array.from(
      new Set([
        ...providerLabels.filter(Boolean),
        ...(prev && prev.lastMonthKey === monthKey ? prev.lastProviderLabels : []),
      ])
    ).slice(0, 6);
    const next: MonthlySyncMeta = {
      lastMonthKey: monthKey,
      lastSyncedAt: new Date().toISOString(),
      syncedClubsCount: Math.max(
        syncedClubsCount,
        prev && prev.lastMonthKey === monthKey ? prev.syncedClubsCount : 0
      ),
      lastProviderLabels: mergedLabels,
    };
    localStorage.setItem(MONTHLY_SYNC_META_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage write errors
  }
}

export function isMonthlyRosterUpdateAvailable(): boolean {
  const currentMonthKey = getCurrentRealWorldSyncPeriod().monthKey;
  const meta = getLastMonthlySyncMeta();
  if (!meta) return true;
  return meta.lastMonthKey !== currentMonthKey;
}

export async function fetchMonthlyRosterApiStatus(): Promise<MonthlyRosterApiStatus | null> {
  try {
    const resp = await fetch('/api/clubs/squads/monthly-sync/status');
    if (!resp.ok) return null;
    const data = (await resp.json()) as MonthlyRosterApiStatus;
    if (!data || typeof data.monthKey !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

// Clubs whose official squad was explicitly curated from BRASILEIRO SERIE A / B / C .txt and locked against automatic cache overwrites
export const LOCKED_CURATED_CLUB_IDS = new Set<string>([
  // Série A (20)
  'pal', 'fla', 'cor', 'cru', 'vas', 'bot', 'bah', 'flu', 'san', 'cam',
  'cap', 'rbb', 'sao', 'gre', 'int', 'vit', 'cfc', 'mir', 'rem', 'cha',
  // Série B (20)
  'for', 'spo', 'juv', 'cea', 'nov', 'ath', 'cri', 'crb', 'vil', 'cui',
  'acg', 'ope', 'ava', 'sbe', 'bsp', 'ame', 'lon', 'pon', 'nau', 'goi',
  // Série C (20)
  'fig', 'bru', 'pay', 'bar', 'cax', 'flo', 'bpb', 'con', 'ama', 'lim',
  'mar', 'mga', 'ana', 'ypi', 'afe', 'ita', 'itu', 'vre', 'stc', 'gua',
  // Campeonato Potiguar 2026 (12)
  'abc', 'arn', 'rn_scn', 'rn_lag', 'rn_pot', 'rn_glo', 'rn_brn', 'rn_qfc', 'rn_pcn', 'rn_ale', 'rn_ass', 'rn_mos',
  // Premier League Inglaterra 2026/27 (20)
  'eu_ars', 'eu_avl', 'eu_bou', 'eu_bre', 'eu_bha', 'eu_che', 'eu_cov', 'eu_cry', 'eu_eve', 'eu_ful',
  'eu_hul', 'eu_ips', 'eu_lee', 'eu_liv', 'eu_mci', 'eu_mun', 'eu_new', 'eu_nfo', 'eu_sun', 'eu_tot',
]);

export function getCachedOct2026SquadProfiles(): Record<string, Oct2026ClubSquadProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OCT2026_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const cleaned = { ...(parsed as Record<string, Oct2026ClubSquadProfile>) };
      for (const lockedId of LOCKED_CURATED_CLUB_IDS) {
        const entry = cleaned[lockedId];
        // Keep explicit monthly API profiles for curated clubs; only strip legacy pre-API cache
        if (entry && !entry.source && !entry.monthKey) {
          delete cleaned[lockedId];
        }
      }
      return cleaned;
    }
  } catch {
    // Ignore storage read errors
  }
  return {};
}

export function saveCachedOct2026SquadProfiles(
  map: Record<string, Oct2026ClubSquadProfile>
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OCT2026_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Hydrates the browser localStorage cache with all monthly API club rosters
 * persisted on the backend server disk cache (`club-squads-oct2026-cache.json`).
 */
export async function hydrateOct2026CacheFromServer(): Promise<{
  profilesByClubId: Record<string, Oct2026ClubSquadProfile>;
  addedFromServerCount: number;
}> {
  const localMap = getCachedOct2026SquadProfiles();
  try {
    const resp = await fetch('/api/clubs/squads/october-2026/cache');
    if (!resp.ok) {
      return { profilesByClubId: localMap, addedFromServerCount: 0 };
    }
    const data = (await resp.json()) as {
      clubsById?: Record<string, Oct2026ClubSquadProfile>;
    };
    if (!data?.clubsById || typeof data.clubsById !== 'object') {
      return { profilesByClubId: localMap, addedFromServerCount: 0 };
    }

    let added = 0;
    const merged: Record<string, Oct2026ClubSquadProfile> = { ...localMap };
    for (const [clubId, profile] of Object.entries(data.clubsById)) {
      if (LOCKED_CURATED_CLUB_IDS.has(clubId) && !profile?.source && !profile?.monthKey) {
        continue;
      }
      if (profile && profile.clubId && Array.isArray(profile.players) && profile.players.length > 0) {
        const existing = merged[clubId];
        if (!existing || (profile.updatedAt && profile.updatedAt > existing.updatedAt)) {
          if (!existing) added += 1;
          merged[clubId] = profile;
        }
      }
    }
    if (added > 0) {
      saveCachedOct2026SquadProfiles(merged);
    }
    return { profilesByClubId: merged, addedFromServerCount: added };
  } catch {
    return { profilesByClubId: localMap, addedFromServerCount: 0 };
  }
}

function normalizePlayerNameKey(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function resolveClubLeagueDisplayName(club: Club): string {
  if (club.division === 'EU') {
    const euId = getClubEuropeanLeagueId(club);
    return euId ? EUROPEAN_LEAGUES_META[euId].name : 'Liga Europeia';
  }
  if (club.division === 'SA') {
    const saId = getClubSouthAmericanLeagueId(club);
    return saId ? SOUTH_AMERICAN_LEAGUES_META[saId].name : 'Liga Sul-Americana';
  }
  if (club.division === 'WL') {
    const wlId = getClubWorldLeagueId(club);
    return wlId ? WORLD_LEAGUES_META[wlId].name : 'Liga Internacional';
  }
  if (club.division === 'EST') {
    return getClubEstadualConfig(club)?.name || `Campeonato Estadual (${club.state})`;
  }
  return `Brasileirão Série ${club.division}`;
}

export function isClubInOct2026Scope(club: Club, scope: Oct2026SyncRegionScope): boolean {
  if (scope === 'ALL') return true;
  if (scope === 'SERIE_A_B') return club.division === 'A' || club.division === 'B';
  if (scope === 'BRASIL') {
    return (
      club.division === 'A' ||
      club.division === 'B' ||
      club.division === 'C' ||
      club.division === 'D' ||
      club.division === 'EST'
    );
  }
  if (scope === 'EUROPA') return club.division === 'EU';
  if (scope === 'SUL_AMERICA') return club.division === 'SA';
  if (scope === 'MUNDO') return club.division === 'WL';
  return true;
}

function getClubSyncPriorityWeight(club: Club, userClubId?: string): number {
  if (userClubId && club.id === userClubId) return 0;
  if (club.division === 'A') return 10 - Math.min(5, club.reputation || 3);
  if (club.division === 'B') return 20 - Math.min(5, club.reputation || 3);
  if (club.division === 'EU') {
    const euId = getClubEuropeanLeagueId(club);
    const tier = euId ? EUROPEAN_LEAGUES_META[euId]?.tier ?? 1 : 1;
    return 25 + tier * 6 - Math.min(5, club.reputation || 3);
  }
  if (club.division === 'SA') return 45 - Math.min(5, club.reputation || 3);
  if (club.division === 'WL') return 55 - Math.min(5, club.reputation || 3);
  if (club.division === 'C') return 65 - Math.min(5, club.reputation || 3);
  return 75 - Math.min(5, club.reputation || 3);
}

/**
 * Filters clubs by scope and orders them by relevance (User Club -> Série A -> Série B ->
 * Top European Leagues -> South America -> World Leagues -> Série C -> Série D) so the most
 * impactful clubs update first during a global synchronization.
 */
export function filterAndPrioritizeClubsForOct2026Sync(
  clubs: Club[],
  scope: Oct2026SyncRegionScope,
  userClubId?: string
): Club[] {
  return clubs
    .filter((c) => isClubInOct2026Scope(c, scope))
    .sort((a, b) => {
      const wDiff =
        getClubSyncPriorityWeight(a, userClubId) - getClubSyncPriorityWeight(b, userClubId);
      if (wDiff !== 0) return wDiff;
      return (b.reputation || 0) - (a.reputation || 0);
    });
}

export function computeOct2026CoverageSummary(
  clubs: Club[],
  syncedClubIdsFromSave: string[] = [],
  cache: Record<string, Oct2026ClubSquadProfile> = getCachedOct2026SquadProfiles()
): Oct2026CoverageSummary {
  const currentMonthKey = getCurrentRealWorldSyncPeriod().monthKey;
  const syncedSet = new Set<string>();
  for (const clubId of syncedClubIdsFromSave) {
    const cached = cache[clubId];
    if (cached && isProfileFreshForCurrentMonth(cached, currentMonthKey)) {
      syncedSet.add(clubId);
    }
  }
  for (const [clubId, profile] of Object.entries(cache)) {
    if (isProfileFreshForCurrentMonth(profile, currentMonthKey)) {
      syncedSet.add(clubId);
    }
  }

  const countFor = (scope: Oct2026SyncRegionScope) => {
    const pool = clubs.filter((c) => isClubInOct2026Scope(c, scope));
    const synced = pool.filter((c) => syncedSet.has(c.id)).length;
    return { total: pool.length, synced };
  };

  const allStats = countFor('ALL');
  const brABStats = countFor('SERIE_A_B');
  const brStats = countFor('BRASIL');
  const euStats = countFor('EUROPA');
  const saStats = countFor('SUL_AMERICA');
  const wlStats = countFor('MUNDO');

  const regions: Oct2026RegionCoverageItem[] = [
    {
      scope: 'ALL',
      label: 'Todos os Times do Jogo',
      subtitle: 'Base mundial completa de clubes jogáveis',
      totalClubs: allStats.total,
      syncedClubs: allStats.synced,
    },
    {
      scope: 'SERIE_A_B',
      label: 'Séries A e B (Brasil)',
      subtitle: '40 clubes principais do futebol brasileiro',
      totalClubs: brABStats.total,
      syncedClubs: brABStats.synced,
    },
    {
      scope: 'BRASIL',
      label: 'Brasil Completo (Séries A–D)',
      subtitle: 'Todas as 4 divisões nacionais CBF',
      totalClubs: brStats.total,
      syncedClubs: brStats.synced,
    },
    {
      scope: 'EUROPA',
      label: 'Europa (13 Ligas UEFA)',
      subtitle: 'Inglaterra, Espanha, Itália, Alemanha, França, Portugal e mais',
      totalClubs: euStats.total,
      syncedClubs: euStats.synced,
    },
    {
      scope: 'SUL_AMERICA',
      label: 'América do Sul (CONMEBOL)',
      subtitle: 'Argentina, Uruguai, Colômbia, Chile, Equador, Paraguai e mais',
      totalClubs: saStats.total,
      syncedClubs: saStats.synced,
    },
    {
      scope: 'MUNDO',
      label: 'Ligas Mundiais FIFA',
      subtitle: 'Arábia Saudita, EUA (MLS), México, Japão, Rússia, Egito e Marrocos',
      totalClubs: wlStats.total,
      syncedClubs: wlStats.synced,
    },
  ];

  return {
    totalClubs: allStats.total,
    syncedClubs: allStats.synced,
    pendingClubs: Math.max(0, allStats.total - allStats.synced),
    percentage:
      allStats.total > 0 ? Math.min(100, Math.round((allStats.synced / allStats.total) * 100)) : 0,
    regions,
  };
}

/**
 * Applies an October 2026 AI-researched roster to a Club while preserving existing player IDs/stats
 * whenever a player name matches, guarantees a complete 30-player squad (MAX_SQUAD_SIZE = 30)
 * with 11 valid starters (1 GK + 10 outfield) and 11 bench substitutes, and keeps tactical
 * specialist roles (captain, penalty, free-kick, corner takers) valid.
 */
export function applyOct2026AiSquadToClub(
  club: Club,
  profile: Oct2026ClubSquadProfile
): Club {
  if (!profile || !Array.isArray(profile.players) || profile.players.length === 0) {
    return club;
  }

  const clubCountry = club.country || 'Brasil';
  const existingByNormName = new Map<string, Player>();
  for (const existing of club.squad) {
    existingByNormName.set(normalizePlayerNameKey(existing.name), existing);
  }

  // Keep any loaned-in players currently at the club so active career loans aren't lost
  const activeLoansIn = club.squad.filter((p) => p.isLoan);
  const usedIds = new Set<string>(activeLoansIn.map((p) => p.id));
  const usedNumbers = new Set<number>(activeLoansIn.map((p) => p.squadNumber));
  const usedNames = new Set<string>(
    activeLoansIn.map((p) => normalizePlayerNameKey(p.name))
  );

  const builtPlayers: Player[] = [...activeLoansIn];

  for (let idx = 0; idx < profile.players.length && builtPlayers.length < MAX_SQUAD_SIZE; idx++) {
    const dto = profile.players[idx];
    const normKey = normalizePlayerNameKey(dto.name);
    if (!normKey || usedNames.has(normKey)) continue;
    usedNames.add(normKey);

    let squadNum = dto.jerseyNumber || idx + 1;
    while (usedNumbers.has(squadNum)) {
      squadNum = squadNum >= 99 ? 1 : squadNum + 1;
    }
    usedNumbers.add(squadNum);

    const matchedExisting = existingByNormName.get(normKey);
    const baseCreated = createPlayer(
      matchedExisting && !usedIds.has(matchedExisting.id)
        ? matchedExisting.id
        : `${club.id}_oct26_${idx + 1}_${squadNum}`,
      dto.name.trim(),
      dto.role,
      dto.overall,
      dto.age,
      squadNum,
      dto.isStarter,
      false,
      dto.overall >= 84
        ? 'Craque Decisivo'
        : dto.age <= 21
        ? 'Jovem Promessa'
        : `Elenco ${getCurrentRealWorldSyncPeriod().shortLabel}`,
      clubCountry,
      dto.nationality
    );
    usedIds.add(baseCreated.id);

    if (matchedExisting) {
      builtPlayers.push(
        ensurePlayerContractFields(
          {
            ...baseCreated,
            matches: matchedExisting.matches,
            goals: matchedExisting.goals,
            assists: matchedExisting.assists,
            yellowCards: matchedExisting.yellowCards,
            redCards: matchedExisting.redCards,
            competitionYellowCards: matchedExisting.competitionYellowCards || {},
            competitionRedCards: matchedExisting.competitionRedCards || {},
            suspensions: matchedExisting.suspensions || [],
            isSuspended: matchedExisting.isSuspended,
            injuryWeeks: matchedExisting.injuryWeeks,
            injuryDetails: matchedExisting.injuryDetails,
            condition: matchedExisting.condition,
            morale: matchedExisting.morale,
            contractYears: matchedExisting.contractYears || 2,
            ratingAverage: matchedExisting.ratingAverage,
          },
          clubCountry
        )
      );
    } else {
      builtPlayers.push(ensurePlayerContractFields(baseCreated, clubCountry));
    }
  }

  // Complete up to 30 players if AI returned 22–29 real players
  let full30 = ensureMinimumSquadDepth(
    club.id,
    club.division,
    builtPlayers,
    MAX_SQUAD_SIZE,
    false,
    clubCountry
  )
    .slice(0, MAX_SQUAD_SIZE)
    .map((p) => ensurePlayerContractFields(p, clubCountry));

  // Normalize exact 11 starters (1 GOL + 10 outfield) and 11 bench substitutes
  const goalkeepers = full30
    .filter((p) => p.detailedRole === 'GOL')
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.overall - a.overall);
  const starterGkId = goalkeepers[0]?.id;

  const outfield = full30
    .filter((p) => p.id !== starterGkId && p.detailedRole !== 'GOL')
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.overall - a.overall);
  const starterIds = new Set<string>(
    [starterGkId, ...outfield.slice(0, 10).map((p) => p.id)].filter(Boolean) as string[]
  );

  if (starterIds.size < 11) {
    for (const p of full30) {
      if (starterIds.size >= 11) break;
      starterIds.add(p.id);
    }
  }

  const remainingSorted = full30
    .filter((p) => !starterIds.has(p.id))
    .sort((a, b) => b.overall - a.overall);
  const benchIds = new Set<string>(remainingSorted.slice(0, 11).map((p) => p.id));

  full30 = full30.map((p) => ({
    ...p,
    isStarter: starterIds.has(p.id),
    isSubstitute: benchIds.has(p.id),
    pitchSlot: undefined,
  }));

  // Ensure tactical specialist IDs remain valid on the refreshed roster
  const full30Ids = new Set(full30.map((p) => p.id));
  const startersSorted = full30
    .filter((p) => p.isStarter)
    .sort((a, b) => b.overall - a.overall);
  const attackersAndMids = startersSorted.filter(
    (p) => p.detailedRole === 'ATA' || p.detailedRole === 'MEI'
  );
  const midsAndLaterals = startersSorted.filter(
    (p) => p.detailedRole === 'MEI' || p.detailedRole === 'LAT' || p.detailedRole === 'VOL'
  );

  const nextCaptainId =
    club.tactics.captainId && full30Ids.has(club.tactics.captainId)
      ? club.tactics.captainId
      : startersSorted[0]?.id;
  const nextPenaltyId =
    club.tactics.penaltyTakerId && full30Ids.has(club.tactics.penaltyTakerId)
      ? club.tactics.penaltyTakerId
      : (attackersAndMids[0] || startersSorted[0])?.id;
  const nextFkId =
    club.tactics.freekickTakerId && full30Ids.has(club.tactics.freekickTakerId)
      ? club.tactics.freekickTakerId
      : (midsAndLaterals[0] || attackersAndMids[0] || startersSorted[0])?.id;
  const nextCornerId =
    club.tactics.cornerTakerId && full30Ids.has(club.tactics.cornerTakerId)
      ? club.tactics.cornerTakerId
      : (midsAndLaterals[1] || midsAndLaterals[0] || startersSorted[0])?.id;

  return {
    ...club,
    managerName:
      !club.isUser && profile.managerName ? profile.managerName : club.managerName,
    tactics: {
      ...club.tactics,
      captainId: nextCaptainId,
      penaltyTakerId: nextPenaltyId,
      freekickTakerId: nextFkId,
      cornerTakerId: nextCornerId,
    },
    squad: full30,
  };
}

export function applyCachedOct2026SquadsToClubs(
  clubs: Club[],
  cache: Record<string, Oct2026ClubSquadProfile> = getCachedOct2026SquadProfiles()
): Club[] {
  const keys = Object.keys(cache);
  if (keys.length === 0) return clubs;
  return clubs.map((club) => {
    const profile = cache[club.id];
    if (!profile) return club;
    if (LOCKED_CURATED_CLUB_IDS.has(club.id) && !profile.source && !profile.monthKey) {
      return club;
    }
    return applyOct2026AiSquadToClub(club, profile);
  });
}

export async function syncClubsOct2026SquadsWithAI(
  clubsToSync: Club[],
  forceRefreshOrOptions: boolean | SyncOct2026Options = false,
  legacyOnProgress?: (clubName: string, completedCount: number, totalCount: number) => void
): Promise<{
  profilesByClubId: Record<string, Oct2026ClubSquadProfile>;
  syncedCount: number;
  newlySyncedCount: number;
  aborted: boolean;
  quotaPaused: boolean;
  usedExternalApi: boolean;
  providerCounts: Record<string, number>;
  groundingSources: Oct2026GroundingSource[];
}> {
  const opts: SyncOct2026Options =
    typeof forceRefreshOrOptions === 'boolean'
      ? {
          forceRefresh: forceRefreshOrOptions,
          onProgress: legacyOnProgress,
        }
      : forceRefreshOrOptions || {};

  const forceRefresh = Boolean(opts.forceRefresh);
  const preferredProvider: RosterSyncProviderPreference = opts.preferredProvider || 'AUTO';
  const currentPeriod = getCurrentRealWorldSyncPeriod();
  const cachedMap = getCachedOct2026SquadProfiles();
  const profilesByClubId: Record<string, Oct2026ClubSquadProfile> = {};
  const groundingMap = new Map<string, Oct2026GroundingSource>();
  const providerCounts: Record<string, number> = {};
  const providerLabelsSet = new Set<string>();

  const pendingClubs: Club[] = [];
  for (const club of clubsToSync) {
    if (
      !forceRefresh &&
      isProfileFreshForCurrentMonth(cachedMap[club.id], currentPeriod.monthKey)
    ) {
      profilesByClubId[club.id] = cachedMap[club.id];
    } else {
      pendingClubs.push(club);
    }
  }

  // Adaptive batch size: 2 for single/pair deep syncs, 5 for full-league or global syncs
  const batchSize =
    opts.batchSize ?? (pendingClubs.length <= 4 ? 2 : 5);

  let newlySyncedCount = 0;
  let aborted = false;
  let quotaPaused = false;
  let usedGoogleSearchAny = false;
  let usedExternalApiAny = false;

  for (let i = 0; i < pendingClubs.length; i += batchSize) {
    if (opts.signal?.aborted) {
      aborted = true;
      break;
    }

    const batch = pendingClubs.slice(i, i + batchSize);
    const batchLabel = batch.map((b) => b.shortName || b.name).join(' · ');

    if (opts.onProgress && batch[0]) {
      opts.onProgress(batchLabel, i, pendingClubs.length, {
        currentBatchLabel: batchLabel,
        completedCount: i,
        totalCount: pendingClubs.length,
        newlyUpdatedInSession: newlySyncedCount,
        usedGoogleSearch: usedGoogleSearchAny,
        usedExternalApi: usedExternalApiAny,
      });
    }

    let resp: Response;
    try {
      resp = await fetch('/api/clubs/squads/monthly-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: opts.signal,
        body: JSON.stringify({
          forceRefresh,
          preferredProvider,
          targetPeriod: currentPeriod,
          clubs: batch.map((c) => ({
            id: c.id,
            name: c.name,
            country: c.country || 'Brasil',
            leagueName: resolveClubLeagueDisplayName(c),
            division: c.division,
            reputation: c.reputation,
          })),
        }),
      });
    } catch (err) {
      if (opts.signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        aborted = true;
        break;
      }
      throw err;
    }

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(
        errBody?.message ||
          `Não foi possível consultar a API de elencos de ${currentPeriod.fullLabel} neste momento.`
      );
    }

    const data = (await resp.json()) as {
      clubs?: Oct2026ClubSquadProfile[];
      groundingSources?: Oct2026GroundingSource[];
      providerCounts?: Record<string, number>;
      quotaLimited?: boolean;
      usedGoogleSearch?: boolean;
      usedExternalApi?: boolean;
    };

    if (data.usedGoogleSearch) {
      usedGoogleSearchAny = true;
    }
    if (data.usedExternalApi) {
      usedExternalApiAny = true;
    }
    if (data.providerCounts && typeof data.providerCounts === 'object') {
      for (const [k, v] of Object.entries(data.providerCounts)) {
        if (typeof v === 'number' && v > 0) {
          providerCounts[k] = (providerCounts[k] || 0) + v;
        }
      }
    }

    const batchProfiles: Record<string, Oct2026ClubSquadProfile> = {};
    if (Array.isArray(data.clubs)) {
      for (const item of data.clubs) {
        if (item && item.clubId && Array.isArray(item.players) && item.players.length > 0) {
          const normalizedItem: Oct2026ClubSquadProfile = {
            ...item,
            monthKey: item.monthKey || currentPeriod.monthKey,
          };
          cachedMap[item.clubId] = normalizedItem;
          profilesByClubId[item.clubId] = normalizedItem;
          batchProfiles[item.clubId] = normalizedItem;
          newlySyncedCount += 1;
          if (normalizedItem.sourceLabel) {
            providerLabelsSet.add(normalizedItem.sourceLabel);
          }
        }
      }
    }

    if (Array.isArray(data.groundingSources)) {
      for (const src of data.groundingSources) {
        if (src?.uri && !groundingMap.has(src.uri)) {
          groundingMap.set(src.uri, src);
        }
      }
    }

    // Persist immediately after every batch so progress is never lost
    if (Object.keys(batchProfiles).length > 0) {
      saveCachedOct2026SquadProfiles(cachedMap);
      recordMonthlySyncMeta(
        currentPeriod.monthKey,
        Object.keys(cachedMap).filter((id) =>
          isProfileFreshForCurrentMonth(cachedMap[id], currentPeriod.monthKey)
        ).length,
        Array.from(providerLabelsSet)
      );
    }

    const completedAfterBatch = Math.min(pendingClubs.length, i + batch.length);
    const currentSources = Array.from(groundingMap.values()).slice(0, 10);

    if (opts.onBatchSynced && Object.keys(batchProfiles).length > 0) {
      opts.onBatchSynced(batchProfiles, currentSources, {
        currentBatchLabel: batchLabel,
        completedCount: completedAfterBatch,
        totalCount: pendingClubs.length,
        newlyUpdatedInSession: newlySyncedCount,
        usedGoogleSearch: usedGoogleSearchAny,
        usedExternalApi: usedExternalApiAny,
      });
    }

    if (data.quotaLimited && Object.keys(batchProfiles).length === 0) {
      quotaPaused = true;
      break;
    }
  }

  saveCachedOct2026SquadProfiles(cachedMap);
  if (Object.keys(profilesByClubId).length > 0) {
    recordMonthlySyncMeta(
      currentPeriod.monthKey,
      Object.keys(cachedMap).filter((id) =>
        isProfileFreshForCurrentMonth(cachedMap[id], currentPeriod.monthKey)
      ).length,
      Array.from(providerLabelsSet)
    );
  }

  return {
    profilesByClubId,
    syncedCount: Object.keys(profilesByClubId).length,
    newlySyncedCount,
    aborted,
    quotaPaused,
    usedExternalApi: usedExternalApiAny,
    providerCounts,
    groundingSources: Array.from(groundingMap.values()).slice(0, 10),
  };
}

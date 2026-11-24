import { GameSave, Player } from '../types/game';
import {
  isGeneratedPlayerId,
  normalizeNationality,
  normalizePlayerKey,
  REAL_PLAYER_NATIONALITIES_BY_NAME,
  resolvePlayerNationality,
} from '../utils/nationalityUtils';
import { resyncNationalTeamAfterNationalityUpdate } from '../utils/nationalTeamEngine';

const AI_NATIONALITY_CACHE_KEY = 'patofoot_ai_nationalities_v2';

export interface NationalityGroundingSource {
  title: string;
  uri: string;
}

interface RequestPlayerItem {
  id: string;
  name: string;
  clubId?: string;
  clubName?: string;
  role?: string;
  age?: number;
  fallbackCountry?: string;
}

function readLocalAiCache(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(AI_NATIONALITY_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeLocalAiCache(cache: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AI_NATIONALITY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota issues
  }
}

function makeLocalKey(name: string, clubId?: string): string {
  return `${normalizePlayerKey(name)}|${(clubId || 'free').toLowerCase()}`;
}

export function getCachedAiNationality(name: string, clubId?: string): string | undefined {
  const cache = readLocalAiCache();
  const norm = normalizePlayerKey(name);
  if (clubId) {
    const specific = cache[makeLocalKey(name, clubId)];
    if (specific) return specific;
  }
  if (norm.includes(' ')) {
    return cache[norm];
  }
  return undefined;
}

export interface NationalitySyncOptions {
  forceRefresh?: boolean;
  forceRefreshAll?: boolean;
  onlyClubId?: string;
  maxPlayers?: number;
  onProgress?: (verifiedSoFar: number, totalToVerify: number) => void;
}

function isRealTrackablePlayer(p: Player): boolean {
  if (!isGeneratedPlayerId(p.id)) return true;
  const norm = normalizePlayerKey(p.name);
  return norm.includes(' ') && Boolean(REAL_PLAYER_NATIONALITIES_BY_NAME[norm]);
}

/**
 * Collects real-life / non-generated players in a career save across all continents
 * so Gemini AI + Google Search can verify and synchronize their exact real-world FIFA nationalities.
 */
export function collectRealPlayersForAiSync(
  save: GameSave,
  optionsOrForce: boolean | NationalitySyncOptions = false
): {
  toVerifyWithServer: RequestPlayerItem[];
  cachedById: Record<string, string>;
} {
  const opts: NationalitySyncOptions =
    typeof optionsOrForce === 'boolean'
      ? { forceRefreshAll: optionsOrForce }
      : optionsOrForce || {};
  const bypassCache = Boolean(opts.forceRefresh || opts.forceRefreshAll);
  const onlyClubId = opts.onlyClubId;

  const localCache = readLocalAiCache();
  const toVerifyWithServer: RequestPlayerItem[] = [];
  const cachedById: Record<string, string> = {};

  for (const club of save.clubs) {
    if (onlyClubId && club.id !== onlyClubId) continue;
    const fallbackCountry = club.country || 'Brasil';
    for (const p of club.squad) {
      if (!isRealTrackablePlayer(p)) continue;

      const norm = normalizePlayerKey(p.name);
      const cacheVal =
        localCache[makeLocalKey(p.name, club.id)] ||
        (norm.includes(' ') ? localCache[norm] : undefined);

      if (cacheVal && !bypassCache) {
        cachedById[p.id] = normalizeNationality(cacheVal, fallbackCountry);
      } else {
        toVerifyWithServer.push({
          id: p.id,
          name: p.name,
          clubId: club.id,
          clubName: club.name,
          role: p.detailedRole,
          age: p.age,
          fallbackCountry,
        });
      }
    }
  }

  if (!onlyClubId) {
    for (const fa of save.transferMarket || []) {
      if (!isRealTrackablePlayer(fa)) continue;
      const cacheVal =
        localCache[makeLocalKey(fa.name, 'free')] || localCache[normalizePlayerKey(fa.name)];
      if (cacheVal && !bypassCache) {
        cachedById[fa.id] = normalizeNationality(cacheVal, 'Brasil');
      } else {
        toVerifyWithServer.push({
          id: fa.id,
          name: fa.name,
          clubId: 'free',
          clubName: 'Sem Clube',
          role: fa.detailedRole,
          age: fa.age,
          fallbackCountry: 'Brasil',
        });
      }
    }
  }

  return { toVerifyWithServer, cachedById };
}

export async function syncGameNationalitiesWithAI(
  save: GameSave,
  options?: NationalitySyncOptions
): Promise<{
  resolvedMap: Record<string, string>;
  aiAvailable: boolean;
  nationalitiesById: Record<string, string>;
  verifiedCount: number;
  usedAiServer: boolean;
  usedGoogleSearch: boolean;
  groundingSources: NationalityGroundingSource[];
  statusMessage: string;
}> {
  const { toVerifyWithServer: rawToVerify, cachedById } = collectRealPlayersForAiSync(save, options);
  const toVerifyWithServer =
    typeof options?.maxPlayers === 'number' && options.maxPlayers > 0
      ? rawToVerify.slice(0, options.maxPlayers)
      : rawToVerify;
  const bypassCache = Boolean(options?.forceRefresh || options?.forceRefreshAll);
  const mergedById: Record<string, string> = { ...cachedById };

  if (toVerifyWithServer.length === 0) {
    const count = Object.keys(mergedById).length;
    return {
      resolvedMap: mergedById,
      aiAvailable: true,
      nationalitiesById: mergedById,
      verifiedCount: count,
      usedAiServer: true,
      usedGoogleSearch: false,
      groundingSources: [],
      statusMessage: `Nacionalidades reais sincronizadas (${count} atletas verificados pela IA).`,
    };
  }

  const localCache = readLocalAiCache();
  const itemById = new Map<string, RequestPlayerItem>(
    toVerifyWithServer.map((item) => [item.id, item])
  );
  const groundingMap = new Map<string, NationalityGroundingSource>();
  let anyAiSuccess = false;
  let anyGoogleSearch = false;

  const BATCH_SIZE = 50;
  try {
    for (let offset = 0; offset < toVerifyWithServer.length; offset += BATCH_SIZE) {
      const batch = toVerifyWithServer.slice(offset, offset + BATCH_SIZE);
      const response = await fetch('/api/players/nationalities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: batch,
          forceRefresh: bypassCache,
        }),
      });

      if (!response.ok) {
        break;
      }

      const data = (await response.json()) as {
        nationalities?: Record<string, string>;
        usedAi?: boolean;
        quotaLimited?: boolean;
        usedGoogleSearch?: boolean;
        groundingSources?: NationalityGroundingSource[];
      };

      if (data.usedAi) anyAiSuccess = true;
      if (data.usedGoogleSearch) anyGoogleSearch = true;

      for (const src of data.groundingSources || []) {
        if (src && src.uri && !groundingMap.has(src.uri)) {
          groundingMap.set(src.uri, {
            uri: src.uri,
            title: src.title || 'Fonte Web',
          });
        }
      }

      const returned = data.nationalities || {};
      for (const [id, rawNat] of Object.entries(returned)) {
        const reqItem = itemById.get(id);
        const canonical = normalizeNationality(rawNat, reqItem?.fallbackCountry || 'Brasil');
        mergedById[id] = canonical;
        if (reqItem) {
          localCache[makeLocalKey(reqItem.name, reqItem.clubId)] = canonical;
          localCache[normalizePlayerKey(reqItem.name)] = canonical;
        }
      }

      writeLocalAiCache(localCache);

      if (options?.onProgress) {
        options.onProgress(
          Math.min(offset + batch.length, toVerifyWithServer.length),
          toVerifyWithServer.length
        );
      }

      if (data.quotaLimited) {
        break;
      }
    }

    const count = Object.keys(mergedById).length;
    const sources = Array.from(groundingMap.values()).slice(0, 8);
    if (!anyAiSuccess) {
      return {
        resolvedMap: mergedById,
        aiAvailable: false,
        nationalitiesById: mergedById,
        verifiedCount: count,
        usedAiServer: false,
        usedGoogleSearch: false,
        groundingSources: [],
        statusMessage: 'Base oficial de nacionalidades reais aplicada a todos os clubes.',
      };
    }

    return {
      resolvedMap: mergedById,
      aiAvailable: true,
      nationalitiesById: mergedById,
      verifiedCount: count,
      usedAiServer: true,
      usedGoogleSearch: anyGoogleSearch,
      groundingSources: sources,
      statusMessage: `IA pesquisou e atualizou a nacionalidade real FIFA de ${count} jogadores em todas as ligas!`,
    };
  } catch {
    const count = Object.keys(mergedById).length;
    return {
      resolvedMap: mergedById,
      aiAvailable: false,
      nationalitiesById: mergedById,
      verifiedCount: count,
      usedAiServer: false,
      usedGoogleSearch: false,
      groundingSources: [],
      statusMessage: 'Base de nacionalidades reais sincronizada em todos os elencos.',
    };
  }
}

export function applyResolvedNationalitiesToSave(
  save: GameSave,
  nationalitiesById: Record<string, string>
): {
  save: GameSave;
  updatedCount: number;
  updatedSave: GameSave;
  changedCount: number;
} {
  let changedCount = 0;
  const localCache = readLocalAiCache();

  const updatePlayerNat = (p: Player, clubCountry: string, clubId?: string): Player => {
    const norm = normalizePlayerKey(p.name);
    if (norm === 'erick' && (clubId === 'fla' || p.id.startsWith('fla_'))) {
      if (p.nationality !== 'Chile') {
        changedCount += 1;
        return { ...p, nationality: 'Chile' };
      }
      return p;
    }
    if (norm === 'emiliano martinez' && (clubId === 'pal' || p.id.startsWith('pal_'))) {
      if (p.nationality !== 'Uruguai') {
        changedCount += 1;
        return { ...p, nationality: 'Uruguai' };
      }
      return p;
    }

    const explicitAiNat =
      nationalitiesById[p.id] ||
      (!isGeneratedPlayerId(p.id)
        ? localCache[makeLocalKey(p.name, clubId)] ||
          (norm.includes(' ') ? localCache[norm] : undefined)
        : undefined);

    const baselineNat = resolvePlayerNationality(p, clubCountry);
    const resolved = explicitAiNat
      ? normalizeNationality(explicitAiNat, baselineNat)
      : baselineNat;

    if (p.nationality !== resolved) {
      changedCount += 1;
      return { ...p, nationality: resolved };
    }
    return p;
  };

  const updatedClubs = save.clubs.map((club) => {
    const clubCountry = club.country || 'Brasil';
    let clubChanged = false;
    const nextSquad = club.squad.map((p) => {
      const nextP = updatePlayerNat(p, clubCountry, club.id);
      if (nextP !== p) clubChanged = true;
      return nextP;
    });

    if (!clubChanged) return club;
    return {
      ...club,
      squad: nextSquad,
    };
  });

  let marketChanged = false;
  const updatedMarket = (save.transferMarket || []).map((p) => {
    const nextP = updatePlayerNat(p, 'Brasil', 'free');
    if (nextP !== p) marketChanged = true;
    return nextP;
  });

  let pendingChanged = false;
  const updatedPending = (save.pendingTransfers || []).map((deal) => {
    const nextP = updatePlayerNat(deal.player, deal.player.nationality || 'Brasil');
    if (nextP !== deal.player) {
      pendingChanged = true;
      return { ...deal, player: nextP };
    }
    return deal;
  });

  const nextNationalTeam = save.nationalTeam
    ? resyncNationalTeamAfterNationalityUpdate(
        save.nationalTeam,
        updatedClubs,
        save.currentSeasonYear
      )
    : save.nationalTeam;
  const ntChanged = nextNationalTeam !== save.nationalTeam;

  if (changedCount === 0 && !marketChanged && !pendingChanged && !ntChanged) {
    return {
      save,
      updatedCount: 0,
      updatedSave: save,
      changedCount: 0,
    };
  }

  const nextSave: GameSave = {
    ...save,
    clubs: updatedClubs,
    transferMarket: marketChanged ? updatedMarket : save.transferMarket,
    pendingTransfers: pendingChanged ? updatedPending : save.pendingTransfers,
    nationalTeam: nextNationalTeam,
  };

  return {
    save: nextSave,
    updatedCount: changedCount + (ntChanged ? 1 : 0),
    updatedSave: nextSave,
    changedCount,
  };
}

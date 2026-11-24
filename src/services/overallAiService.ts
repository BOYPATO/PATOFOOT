import { Club, GameSave } from '../types/game';
import {
  computeRealisticPotential,
  getCachedAiOverallMap,
  getClubSectorRatings,
  makeAiOverallLookupKey,
  recalculatePlayerEconomics,
  saveCachedAiOverallMap,
} from '../utils/clubRatingsEngine';

interface AiOverallPayloadItem {
  id: string;
  name: string;
  clubId: string;
  clubName: string;
  division: string;
  reputation: number;
  role: string;
  age: number;
  isStarter: boolean;
  currentOverall: number;
}

export interface AiOverallSyncResult {
  resolvedById: Record<string, number>;
  updatedCount: number;
  usedAi: boolean;
}

/**
 * Sincroniza Overalls realistas usando a IA Gemini no servidor (/api/players/overalls).
 * Prioriza o elenco do clube do usuário, o clube inspecionado (se informado) e os atletas reais das divisões.
 */
export async function syncOverallsWithGeminiAI(
  save: GameSave,
  options?: {
    targetClubId?: string;
    forceRefresh?: boolean;
    maxPlayers?: number;
  }
): Promise<AiOverallSyncResult> {
  const cachedMap = options?.forceRefresh ? {} : getCachedAiOverallMap();
  const maxPlayers = options?.maxPlayers ?? 160;

  // Ordenar clubes priorizando: 1) targetClubId, 2) clube do usuário, 3) Série A / SA / B / C / D
  const orderedClubs = [...save.clubs].sort((a, b) => {
    if (options?.targetClubId) {
      if (a.id === options.targetClubId) return -1;
      if (b.id === options.targetClubId) return 1;
    }
    if (a.id === save.userClubId) return -1;
    if (b.id === save.userClubId) return 1;
    const divOrder: Record<string, number> = { A: 1, SA: 2, B: 3, C: 4, D: 5 };
    return (divOrder[a.division] ?? 6) - (divOrder[b.division] ?? 6);
  });

  const resolvedFromLocalCache: Record<string, number> = {};
  const toQuery: AiOverallPayloadItem[] = [];

  for (const club of orderedClubs) {
    const isPriorityClub =
      club.id === options?.targetClubId || club.id === save.userClubId;

    for (const p of club.squad) {
      // Para clubes comuns, priorizar atletas reais (não gerados genericamente), exceto se for o clube alvo
      const isGeneric = p.id.includes('_gen_') || p.id.includes('_depth_');
      if (isGeneric && !isPriorityClub) continue;

      const cacheKey = makeAiOverallLookupKey(club.id, p.name);
      const localVal = cachedMap[cacheKey];
      if (!options?.forceRefresh && typeof localVal === 'number') {
        resolvedFromLocalCache[p.id] = localVal;
        continue;
      }

      if (toQuery.length < maxPlayers) {
        toQuery.push({
          id: p.id,
          name: p.name,
          clubId: club.id,
          clubName: club.name,
          division: club.division,
          reputation: club.reputation,
          role: p.detailedRole,
          age: p.age,
          isStarter: p.isStarter,
          currentOverall: p.overall,
        });
      }
    }
  }

  if (toQuery.length === 0) {
    return {
      resolvedById: resolvedFromLocalCache,
      updatedCount: Object.keys(resolvedFromLocalCache).length,
      usedAi: false,
    };
  }

  try {
    const response = await fetch('/api/players/overalls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: toQuery }),
    });

    if (!response.ok) {
      return {
        resolvedById: resolvedFromLocalCache,
        updatedCount: Object.keys(resolvedFromLocalCache).length,
        usedAi: false,
      };
    }

    const data = (await response.json()) as {
      overalls?: Record<string, number>;
      usedAi?: boolean;
    };

    const serverOveralls = data.overalls || {};
    const newCacheEntries: Record<string, number> = {};
    const itemById = new Map(toQuery.map((item) => [item.id, item]));

    Object.entries(serverOveralls).forEach(([playerId, ovr]) => {
      if (typeof ovr !== 'number') return;
      const meta = itemById.get(playerId);
      if (meta) {
        newCacheEntries[makeAiOverallLookupKey(meta.clubId, meta.name)] = ovr;
      }
    });

    if (Object.keys(newCacheEntries).length > 0) {
      saveCachedAiOverallMap(newCacheEntries);
    }

    const combined = {
      ...resolvedFromLocalCache,
      ...serverOveralls,
    };

    return {
      resolvedById: combined,
      updatedCount: Object.keys(serverOveralls).length,
      usedAi: Boolean(data.usedAi),
    };
  } catch {
    return {
      resolvedById: resolvedFromLocalCache,
      updatedCount: Object.keys(resolvedFromLocalCache).length,
      usedAi: false,
    };
  }
}

/**
 * Aplica os Overalls calibrados pela IA Gemini ao estado salvo da carreira,
 * ajustando valores de mercado, salários e setores (DEF / MEI / ATA) de forma consistente.
 */
export function applyAiOverallsToSave(
  save: GameSave,
  resolvedById: Record<string, number>
): GameSave {
  if (!resolvedById || Object.keys(resolvedById).length === 0) return save;

  const isSeasonStart = save.currentRound <= 2;

  const updatedClubs: Club[] = save.clubs.map((club) => {
    let clubChanged = false;
    const updatedSquad = club.squad.map((p) => {
      const targetOvr = resolvedById[p.id];
      if (typeof targetOvr !== 'number' || targetOvr === p.overall) {
        return p;
      }

      clubChanged = true;
      // Preserva eventual evolução/queda já conquistada na temporada atual se estiver no meio do campeonato
      const seasonDelta =
        !isSeasonStart && typeof p.seasonStartOverall === 'number'
          ? p.overall - p.seasonStartOverall
          : 0;
      const finalOvr = Math.max(48, Math.min(93, targetOvr + seasonDelta));
      const econ = recalculatePlayerEconomics(finalOvr, p.age, club.division);
      const potential = Math.max(
        finalOvr,
        computeRealisticPotential(finalOvr, p.age, club.division)
      );

      return {
        ...p,
        overall: finalOvr,
        seasonStartOverall: targetOvr,
        potential,
        marketValue: econ.marketValue,
        wage: econ.wage,
      };
    });

    if (!clubChanged) return club;

    const nextClub: Club = {
      ...club,
      squad: updatedSquad,
    };

    if (isSeasonStart || !nextClub.seasonStartSectorRatings) {
      const sectors = getClubSectorRatings(nextClub);
      return {
        ...nextClub,
        seasonStartSectorRatings: {
          overall: sectors.overall,
          defense: sectors.defense,
          midfield: sectors.midfield,
          attack: sectors.attack,
        },
      };
    }

    return nextClub;
  });

  return {
    ...save,
    aiOverallsCalibratedAt: new Date().toISOString(),
    clubs: updatedClubs,
  };
}

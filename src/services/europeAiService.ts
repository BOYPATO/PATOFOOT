import { Club, DetailedRole, EuropeanLeagueId, Player } from '../types/game';
import {
  EUROPEAN_LEAGUE_IDS,
  EUROPEAN_LEAGUES_META,
  getClubsForEuropeanLeague,
} from '../utils/europeLeaguesEngine';
import {
  getClubSectorRatings,
  recalculatePlayerEconomics,
} from '../utils/clubRatingsEngine';

const EU_AI_STORAGE_KEY = 'patofoot_eu_leagues_ai_v1';

export interface CalibratedEuropeKeyPlayer {
  name: string;
  role: DetailedRole;
  age: number;
  overall: number;
  nationality: string;
}

export interface CalibratedEuropeClubProfile {
  clubId: string;
  managerName: string;
  def: number;
  mei: number;
  ata: number;
  keyPlayers: CalibratedEuropeKeyPlayer[];
}

export function getCachedEuropeAiProfiles(): Record<string, CalibratedEuropeClubProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(EU_AI_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, CalibratedEuropeClubProfile>;
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

function saveCachedEuropeAiProfiles(entries: CalibratedEuropeClubProfile[]): void {
  if (typeof window === 'undefined' || entries.length === 0) return;
  try {
    const existing = getCachedEuropeAiProfiles();
    const next = { ...existing };
    for (const item of entries) {
      if (item && item.clubId) {
        next[item.clubId] = item;
      }
    }
    window.localStorage.setItem(EU_AI_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function getSectorTargetForRole(
  role: DetailedRole,
  profile: Pick<CalibratedEuropeClubProfile, 'def' | 'mei' | 'ata'>
): number {
  if (role === 'GOL' || role === 'ZAG' || role === 'LAT') return profile.def;
  if (role === 'VOL' || role === 'MEI') return profile.mei;
  return profile.ata;
}

/**
 * Aplica perfis reais 2025/2026 calibrados por IA (técnico real, DEF/MEI/ATA e craques titulares reais)
 * sobre os clubes europeus, preservando estatísticas da temporada e o treinador humano.
 */
export function applyCalibratedEuropeProfilesToClubs(
  clubs: Club[],
  profilesMap: Record<string, CalibratedEuropeClubProfile>
): Club[] {
  if (!profilesMap || Object.keys(profilesMap).length === 0) return clubs;

  return clubs.map((club) => {
    if (club.division !== 'EU') return club;
    if ((club.squad || []).some((p) => p.id.includes('_epl26_'))) return club;
    const profile = profilesMap[club.id];
    if (!profile) return club;

    const leagueMeta = club.europeanLeagueId
      ? EUROPEAN_LEAGUES_META[club.europeanLeagueId]
      : undefined;
    const tier = leagueMeta?.tier ?? 1;
    const minOvr = tier === 4 ? 50 : tier === 3 ? 54 : tier === 2 ? 60 : 62;
    const maxOvr = tier === 4 ? 68 : tier === 3 ? 74 : tier === 2 ? 81 : 93;

    const updatedSquad: Player[] = club.squad.map((p) => ({ ...p }));
    const usedPlayerIds = new Set<string>();

    // 1. Injeta os titulares reais retornados pela IA nos slots correspondentes de mesma posição
    for (const kp of profile.keyPlayers || []) {
      if (!kp.name) continue;
      const exactIdx = updatedSquad.findIndex(
        (p) =>
          !usedPlayerIds.has(p.id) &&
          p.name.trim().toLowerCase() === kp.name.trim().toLowerCase()
      );

      const targetIdx =
        exactIdx >= 0
          ? exactIdx
          : updatedSquad.findIndex(
              (p) => !usedPlayerIds.has(p.id) && p.isStarter && p.detailedRole === kp.role
            );

      if (targetIdx >= 0) {
        const current = updatedSquad[targetIdx];
        usedPlayerIds.add(current.id);
        const clampedKpOvr = Math.max(minOvr, Math.min(maxOvr, Math.round(kp.overall)));
        const econ = recalculatePlayerEconomics(clampedKpOvr, kp.age, 'EU');
        updatedSquad[targetIdx] = {
          ...current,
          name: kp.name,
          age: kp.age,
          nationality: kp.nationality || club.country || current.nationality,
          overall: clampedKpOvr,
          seasonStartOverall: current.seasonStartOverall ?? clampedKpOvr,
          marketValue: econ.marketValue,
          wage: econ.wage,
        };
      }
    }

    // 2. Ajusta suavemente os demais atletas para refletir os setores DEF / MEI / ATA calibrados pela IA
    const calibratedSquad = updatedSquad.map((p, idx) => {
      if (usedPlayerIds.has(p.id)) return p;
      const sectorTarget = getSectorTargetForRole(p.detailedRole, profile);
      const roleOffset = p.isStarter
        ? (idx % 3) - 1
        : p.isSubstitute
        ? -4 + (idx % 3)
        : -6 + (idx % 2);
      const nextOvr = Math.max(minOvr, Math.min(maxOvr, Math.round(sectorTarget + roleOffset)));
      const econ = recalculatePlayerEconomics(nextOvr, p.age, 'EU');
      return {
        ...p,
        overall: nextOvr,
        seasonStartOverall: p.seasonStartOverall ?? nextOvr,
        marketValue: econ.marketValue,
        wage: econ.wage,
      };
    });

    const tempClub: Club = {
      ...club,
      managerName: club.isUser ? club.managerName : profile.managerName || club.managerName,
      squad: calibratedSquad,
    };

    const computedSectors = getClubSectorRatings(tempClub);

    return {
      ...tempClub,
      seasonStartSectorRatings: club.seasonStartSectorRatings || {
        overall: computedSectors.overall,
        defense: computedSectors.defense,
        midfield: computedSectors.midfield,
        attack: computedSectors.attack,
      },
    };
  });
}

/**
 * Calibra uma Liga Europeia via endpoint server-side Gemini 3.8 Flash.
 */
export async function calibrateEuropeanLeagueWithAI(
  clubs: Club[],
  leagueId: EuropeanLeagueId,
  forceRefresh: boolean = false
): Promise<{
  updatedClubs: Club[];
  calibratedCount: number;
  usedAi: boolean;
}> {
  const meta = EUROPEAN_LEAGUES_META[leagueId];
  const leagueClubs = getClubsForEuropeanLeague(clubs, leagueId);
  if (leagueClubs.length === 0) {
    return { updatedClubs: clubs, calibratedCount: 0, usedAi: false };
  }

  const cachedMap = getCachedEuropeAiProfiles();
  if (!forceRefresh && leagueClubs.every((c) => Boolean(cachedMap[c.id]))) {
    return {
      updatedClubs: applyCalibratedEuropeProfilesToClubs(clubs, cachedMap),
      calibratedCount: leagueClubs.length,
      usedAi: true,
    };
  }

  const response = await fetch('/api/leagues/europe/calibrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leagueId,
      country: meta.country,
      leagueName: meta.name,
      tier: meta.tier,
      forceRefresh,
      clubs: leagueClubs.map((c) => ({
        id: c.id,
        name: c.name,
        reputation: c.reputation,
      })),
    }),
  });

  if (!response.ok) {
    const errPayload = await response.json().catch(() => ({}));
    throw new Error(
      errPayload?.message || `Falha ao calibrar ${meta.name} via IA (${response.status}).`
    );
  }

  const data = (await response.json()) as {
    clubs?: CalibratedEuropeClubProfile[];
    usedAi?: boolean;
  };

  const returnedProfiles = Array.isArray(data.clubs) ? data.clubs : [];
  saveCachedEuropeAiProfiles(returnedProfiles);

  const mergedMap = {
    ...cachedMap,
    ...Object.fromEntries(returnedProfiles.map((p) => [p.clubId, p])),
  };

  return {
    updatedClubs: applyCalibratedEuropeProfilesToClubs(clubs, mergedMap),
    calibratedCount: returnedProfiles.length,
    usedAi: Boolean(data.usedAi),
  };
}

/**
 * Calibra em sequência todas as 13 Ligas Europeias com Gemini IA 2026.
 */
export async function calibrateAllEuropeanLeaguesWithAI(
  clubs: Club[],
  onProgress?: (leagueName: string, stepIndex: number, total: number) => void
): Promise<{
  updatedClubs: Club[];
  totalCalibratedClubs: number;
}> {
  let workingClubs = clubs;
  let totalCalibratedClubs = 0;

  for (let i = 0; i < EUROPEAN_LEAGUE_IDS.length; i++) {
    const leagueId = EUROPEAN_LEAGUE_IDS[i];
    const meta = EUROPEAN_LEAGUES_META[leagueId];
    onProgress?.(meta.name, i + 1, EUROPEAN_LEAGUE_IDS.length);
    try {
      const res = await calibrateEuropeanLeagueWithAI(workingClubs, leagueId, false);
      workingClubs = res.updatedClubs;
      totalCalibratedClubs += res.calibratedCount;
    } catch {
      // Continua para as próximas ligas caso uma chamada individual oscile
    }
  }

  return { updatedClubs: workingClubs, totalCalibratedClubs };
}

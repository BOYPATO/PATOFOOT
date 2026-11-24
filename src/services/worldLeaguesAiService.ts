import { Club, DetailedRole, Player, WorldLeagueId } from '../types/game';
import {
  WORLD_LEAGUE_IDS,
  WORLD_LEAGUES_META,
  getWorldLeagueClubs,
} from '../utils/worldLeaguesEngine';
import {
  getClubSectorRatings,
  recalculatePlayerEconomics,
} from '../utils/clubRatingsEngine';

const WL_AI_STORAGE_KEY = 'patofoot_world_leagues_ai_2026_v1';

export interface CalibratedWorldKeyPlayer {
  name: string;
  role: DetailedRole;
  age: number;
  overall: number;
  nationality: string;
}

export interface CalibratedWorldClubProfile {
  clubId: string;
  managerName: string;
  def: number;
  mei: number;
  ata: number;
  keyPlayers: CalibratedWorldKeyPlayer[];
}

export function getCachedWorldAiProfiles(): Record<string, CalibratedWorldClubProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(WL_AI_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, CalibratedWorldClubProfile>;
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

function saveCachedWorldAiProfiles(entries: CalibratedWorldClubProfile[]): void {
  if (typeof window === 'undefined' || entries.length === 0) return;
  try {
    const existing = getCachedWorldAiProfiles();
    const next = { ...existing };
    for (const item of entries) {
      if (item && item.clubId) {
        next[item.clubId] = item;
      }
    }
    window.localStorage.setItem(WL_AI_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function getSectorTargetForRole(
  role: DetailedRole,
  profile: Pick<CalibratedWorldClubProfile, 'def' | 'mei' | 'ata'>
): number {
  if (role === 'GOL' || role === 'ZAG' || role === 'LAT') return profile.def;
  if (role === 'VOL' || role === 'MEI') return profile.mei;
  return profile.ata;
}

/**
 * Aplica perfis reais 2026 calibrados por IA (técnico real, DEF/MEI/ATA e craques titulares reais)
 * sobre os clubes das 7 Ligas Mundiais (EUA, México, Arábia Saudita, Japão, Rússia, Egito e Marrocos).
 */
export function applyCalibratedWorldProfilesToClubs(
  clubs: Club[],
  profilesMap: Record<string, CalibratedWorldClubProfile>
): Club[] {
  if (!profilesMap || Object.keys(profilesMap).length === 0) return clubs;

  const minOvr = 60;
  const maxOvr = 90;

  return clubs.map((club) => {
    if (club.division !== 'WL') return club;
    const profile = profilesMap[club.id];
    if (!profile) return club;

    const updatedSquad: Player[] = club.squad.map((p) => ({ ...p }));
    const usedPlayerIds = new Set<string>();

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
        const econ = recalculatePlayerEconomics(clampedKpOvr, kp.age, 'WL');
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

    const calibratedSquad = updatedSquad.map((p, idx) => {
      if (usedPlayerIds.has(p.id)) return p;
      const sectorTarget = getSectorTargetForRole(p.detailedRole, profile);
      const roleOffset = p.isStarter
        ? (idx % 3) - 1
        : p.isSubstitute
        ? -4 + (idx % 3)
        : -6 + (idx % 2);
      const nextOvr = Math.max(minOvr, Math.min(maxOvr, Math.round(sectorTarget + roleOffset)));
      const econ = recalculatePlayerEconomics(nextOvr, p.age, 'WL');
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
 * Calibra uma Liga Mundial (EUA, México, Arábia Saudita, Japão, Rússia, Egito ou Marrocos)
 * via endpoint server-side Gemini 3.8 Flash + Google Search Grounding.
 */
export async function calibrateWorldLeagueWithAI(
  clubs: Club[],
  leagueId: WorldLeagueId,
  forceRefresh: boolean = false
): Promise<{
  updatedClubs: Club[];
  calibratedCount: number;
  usedAi: boolean;
}> {
  const meta = WORLD_LEAGUES_META[leagueId];
  const leagueClubs = getWorldLeagueClubs(clubs, leagueId);
  if (!meta || leagueClubs.length === 0) {
    return { updatedClubs: clubs, calibratedCount: 0, usedAi: false };
  }

  const cachedMap = getCachedWorldAiProfiles();
  if (!forceRefresh) {
    const allCached = leagueClubs.every((c) => Boolean(cachedMap[c.id]));
    if (allCached) {
      return {
        updatedClubs: applyCalibratedWorldProfilesToClubs(clubs, cachedMap),
        calibratedCount: leagueClubs.length,
        usedAi: true,
      };
    }
  }

  try {
    const response = await fetch('/api/leagues/world/calibrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leagueId,
        country: meta.country,
        leagueName: meta.name,
        forceRefresh,
        clubs: leagueClubs.map((c) => ({
          id: c.id,
          name: c.name,
          reputation: c.reputation,
        })),
      }),
    });

    if (!response.ok) {
      return {
        updatedClubs: applyCalibratedWorldProfilesToClubs(clubs, cachedMap),
        calibratedCount: 0,
        usedAi: false,
      };
    }

    const data = await response.json();
    const returnedClubs = Array.isArray(data?.clubs)
      ? (data.clubs as CalibratedWorldClubProfile[])
      : [];

    if (returnedClubs.length > 0) {
      saveCachedWorldAiProfiles(returnedClubs);
      const mergedMap = getCachedWorldAiProfiles();
      return {
        updatedClubs: applyCalibratedWorldProfilesToClubs(clubs, mergedMap),
        calibratedCount: returnedClubs.length,
        usedAi: Boolean(data?.usedAi),
      };
    }
  } catch (err) {
    console.warn('[World Leagues AI Calibration Fallback]:', err);
  }

  return {
    updatedClubs: applyCalibratedWorldProfilesToClubs(clubs, cachedMap),
    calibratedCount: 0,
    usedAi: false,
  };
}

/**
 * Calibra sequencialmente todas as 7 Ligas Mundiais (América do Norte, Ásia/Rússia e África) para 2026 via IA.
 */
export async function calibrateAllWorldLeaguesWithAI(
  clubs: Club[],
  forceRefresh: boolean = false,
  onProgress?: (leagueName: string, step: number, total: number) => void
): Promise<{
  updatedClubs: Club[];
  totalCalibrated: number;
  usedAi: boolean;
}> {
  let workingClubs = clubs;
  let totalCalibrated = 0;
  let anyAiUsed = false;

  for (let i = 0; i < WORLD_LEAGUE_IDS.length; i += 1) {
    const lid = WORLD_LEAGUE_IDS[i];
    const meta = WORLD_LEAGUES_META[lid];
    if (onProgress) {
      onProgress(meta.name, i + 1, WORLD_LEAGUE_IDS.length);
    }
    const res = await calibrateWorldLeagueWithAI(workingClubs, lid, forceRefresh);
    workingClubs = res.updatedClubs;
    totalCalibrated += res.calibratedCount;
    if (res.usedAi) anyAiUsed = true;
  }

  return {
    updatedClubs: workingClubs,
    totalCalibrated,
    usedAi: anyAiUsed,
  };
}

import { Club, DetailedRole, Player, SouthAmericanLeagueId } from '../types/game';
import {
  SOUTH_AMERICAN_LEAGUE_IDS,
  SOUTH_AMERICAN_LEAGUES_META,
  getClubsForSouthAmericanLeague,
} from '../utils/southAmericaLeaguesEngine';
import {
  getClubSectorRatings,
  recalculatePlayerEconomics,
} from '../utils/clubRatingsEngine';

const SA_AI_STORAGE_KEY = 'patofoot_sa_leagues_ai_v1';

export interface CalibratedSouthAmericaKeyPlayer {
  name: string;
  role: DetailedRole;
  age: number;
  overall: number;
  nationality: string;
}

export interface CalibratedSouthAmericaClubProfile {
  clubId: string;
  managerName: string;
  def: number;
  mei: number;
  ata: number;
  keyPlayers: CalibratedSouthAmericaKeyPlayer[];
}

export function getCachedSouthAmericaAiProfiles(): Record<
  string,
  CalibratedSouthAmericaClubProfile
> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SA_AI_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, CalibratedSouthAmericaClubProfile>;
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

function saveCachedSouthAmericaAiProfiles(
  entries: CalibratedSouthAmericaClubProfile[]
): void {
  if (typeof window === 'undefined' || entries.length === 0) return;
  try {
    const existing = getCachedSouthAmericaAiProfiles();
    const next = { ...existing };
    for (const item of entries) {
      if (item && item.clubId) {
        next[item.clubId] = item;
      }
    }
    window.localStorage.setItem(SA_AI_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function getSectorTargetForRole(
  role: DetailedRole,
  profile: Pick<CalibratedSouthAmericaClubProfile, 'def' | 'mei' | 'ata'>
): number {
  if (role === 'GOL' || role === 'ZAG' || role === 'LAT') return profile.def;
  if (role === 'VOL' || role === 'MEI') return profile.mei;
  return profile.ata;
}

/**
 * Aplica perfis reais calibrados por IA (técnico real, níveis DEF/MEI/ATA e craques titulares reais)
 * sobre a lista de clubes, preservando estatísticas da temporada (gols, jogos, cartões) e o treinador humano.
 */
export function applyCalibratedSouthAmericaProfilesToClubs(
  clubs: Club[],
  profilesMap: Record<string, CalibratedSouthAmericaClubProfile>
): Club[] {
  if (!profilesMap || Object.keys(profilesMap).length === 0) return clubs;

  return clubs.map((club) => {
    if (club.division !== 'SA') return club;
    const profile = profilesMap[club.id];
    if (!profile) return club;

    const updatedSquad: Player[] = club.squad.map((p) => ({ ...p }));
    const usedPlayerIds = new Set<string>();

    // 1. Injeta os titulares reais retornados pela IA nos slots correspondentes de mesma posição
    for (const kp of profile.keyPlayers || []) {
      if (!kp.name) continue;
      // Verifica se já existe jogador com o mesmo nome no elenco
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
        const econ = recalculatePlayerEconomics(kp.overall, kp.age, 'SA');
        updatedSquad[targetIdx] = {
          ...current,
          name: kp.name,
          age: kp.age,
          nationality: kp.nationality || club.country || current.nationality,
          overall: kp.overall,
          seasonStartOverall: current.seasonStartOverall ?? kp.overall,
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
        ? ((idx % 3) - 1) // -1, 0, +1 em torno do alvo do setor
        : p.isSubstitute
        ? -4 + (idx % 3)
        : -6 + (idx % 2);
      const nextOvr = Math.max(54, Math.min(84, Math.round(sectorTarget + roleOffset)));
      const econ = recalculatePlayerEconomics(nextOvr, p.age, 'SA');
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
 * Calibra uma Liga Nacional Sul-Americana via endpoint server-side Gemini 3.8 Flash.
 */
export async function calibrateSouthAmericanLeagueWithAI(
  clubs: Club[],
  leagueId: SouthAmericanLeagueId,
  forceRefresh: boolean = false
): Promise<{
  updatedClubs: Club[];
  calibratedCount: number;
  usedAi: boolean;
}> {
  const meta = SOUTH_AMERICAN_LEAGUES_META[leagueId];
  const leagueClubs = getClubsForSouthAmericanLeague(clubs, leagueId);
  if (leagueClubs.length === 0) {
    return { updatedClubs: clubs, calibratedCount: 0, usedAi: false };
  }

  const cachedMap = getCachedSouthAmericaAiProfiles();
  if (!forceRefresh && leagueClubs.every((c) => Boolean(cachedMap[c.id]))) {
    return {
      updatedClubs: applyCalibratedSouthAmericaProfilesToClubs(clubs, cachedMap),
      calibratedCount: leagueClubs.length,
      usedAi: true,
    };
  }

  const response = await fetch('/api/leagues/south-america/calibrate', {
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
    const errPayload = await response.json().catch(() => ({}));
    throw new Error(
      errPayload?.message || `Falha ao calibrar ${meta.name} via IA (${response.status}).`
    );
  }

  const data = (await response.json()) as {
    clubs?: CalibratedSouthAmericaClubProfile[];
    usedAi?: boolean;
  };

  const returnedProfiles = Array.isArray(data.clubs) ? data.clubs : [];
  saveCachedSouthAmericaAiProfiles(returnedProfiles);

  const mergedMap = {
    ...cachedMap,
    ...Object.fromEntries(returnedProfiles.map((p) => [p.clubId, p])),
  };

  return {
    updatedClubs: applyCalibratedSouthAmericaProfilesToClubs(clubs, mergedMap),
    calibratedCount: returnedProfiles.length,
    usedAi: Boolean(data.usedAi),
  };
}

/**
 * Calibra em sequência todas as 9 Ligas Nacionais da América do Sul com Gemini IA.
 */
export async function calibrateAllSouthAmericanLeaguesWithAI(
  clubs: Club[],
  onProgress?: (leagueName: string, stepIndex: number, total: number) => void
): Promise<{
  updatedClubs: Club[];
  totalCalibratedClubs: number;
}> {
  let workingClubs = clubs;
  let totalCalibratedClubs = 0;

  for (let i = 0; i < SOUTH_AMERICAN_LEAGUE_IDS.length; i++) {
    const leagueId = SOUTH_AMERICAN_LEAGUE_IDS[i];
    const meta = SOUTH_AMERICAN_LEAGUES_META[leagueId];
    onProgress?.(meta.name, i + 1, SOUTH_AMERICAN_LEAGUE_IDS.length);
    try {
      const res = await calibrateSouthAmericanLeagueWithAI(workingClubs, leagueId, false);
      workingClubs = res.updatedClubs;
      totalCalibratedClubs += res.calibratedCount;
    } catch {
      // Continua para as próximas ligas caso uma chamada individual oscile
    }
  }

  return { updatedClubs: workingClubs, totalCalibratedClubs };
}

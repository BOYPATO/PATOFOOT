import {
  Club,
  CompetitionType,
  DetailedRole,
  Division,
  EuropeanLeagueId,
  Fixture,
  Player,
  Position,
  SouthAmericanLeagueId,
  Standing,
  TacticalSettings,
  WorldLeagueId,
  MAX_SQUAD_SIZE,
} from '../types/game';
import { getClubEconomyProfile } from '../utils/clubEconomyScale';
import {
  computeRealisticPotential,
  recalculatePlayerEconomics,
} from '../utils/clubRatingsEngine';
import {
  assignVariedMatchDaySlot,
  getRoundDate,
  getSeasonStartDate,
  getSerieBPlayoffDates,
  getSerieBRoundDate,
  getSerieCPlayoffDates,
  getSerieCRoundDate,
} from '../utils/calendarUtils';
import { resolvePlayerNationality } from '../utils/nationalityUtils';

import { BRAZIL_CURATED_ROSTERS_2026, CuratedPlayerTuple } from './brazilCuratedRosters2026';
import { SA_CURATED_ROSTERS_2026 } from './southAmericaCuratedRosters2026';
import { WORLD_CURATED_ROSTERS_2026 } from './worldCuratedRosters2026';
import { ESTADUAIS_2026_CONFIG } from './estaduais2026Config';
import {
  BRAZIL_SERIES_A_B_C_META,
  BRAZIL_SERIE_D_META,
  BRAZIL_ESTADUAIS_EXTRA_META,
  SOUTH_AMERICA_CLUBS_META,
  WORLD_LEAGUES_CLUBS_META,
  NonEuClubMetaTuple,
} from './worldClubsMeta2026';

import { TOP5_CLUBS_META, TOP5_SQUADS_DATA, Top5PlayerTuple } from './europeTop5Rosters2026';
import { PORTUGAL_LEAGUE_2026 } from './portugal2026Rosters';
import { BELGIUM_LEAGUE_2026 } from './belgium2026Rosters';
import { NETHERLANDS_LEAGUE_2026 } from './netherlands2026Rosters';
import { TURKEY_LEAGUE_2026 } from './turkey2026Rosters';
import { GREECE_LEAGUE_2026 } from './greece2026Rosters';
import { SCOTLAND_LEAGUE_2026 } from './scotland2026Rosters';
import { NORWAY_LEAGUE_2026 } from './norway2026Rosters';
import { SWITZERLAND_LEAGUE_2026 } from './switzerland2026Rosters';
import { DENMARK_LEAGUE_2026 } from './denmark2026Rosters';
import { SWEDEN_LEAGUE_2026 } from './sweden2026Rosters';
import { SPECIAL_LEAGUE_1_2026 } from './specialLeague1Rosters';
import { SPECIAL_LEAGUE_2_2026 } from './specialLeague2Rosters';
import { CHAMPIONSHIP_LEAGUE_2026 } from './championship2026Rosters';
import { LEAGUE_ONE_2026 } from './leagueOne2026Rosters';
import { LEAGUE_TWO_2026 } from './leagueTwo2026Rosters';
import { BUNDESLIGA2_LEAGUE_2026 } from './bundesliga2_2026Rosters';
import { LIGUE2_LEAGUE_2026 } from './ligue2_2026Rosters';
import { LALIGA2_LEAGUE_2026 } from './laliga2_2026Rosters';
import { SERIE_B_ITA_LEAGUE_2026 } from './serieBIta_2026Rosters';
import { SPAIN_COPA_EXTRA_2026 } from './spainCopaExtra2026';
import { ITALY_COPA_EXTRA_2026 } from './italyCopaExtra2026';
import { FRANCE_COPA_EXTRA_2026 } from './franceCopaExtra2026';
import {
  FREE_AGENTS_2026_SPECS,
  CURRENT_FREE_AGENTS_2026_VERSION,
} from './freeAgents2026';

export { CURRENT_FREE_AGENTS_2026_VERSION };

// === VERSIONS OF OFFICIAL 2026 ROSTERS ===
export const CURRENT_FLAMENGO_ROSTER_VERSION = 2;
export const CURRENT_PALMEIRAS_ROSTER_VERSION = 2;
export const CURRENT_SERIE_A_2026_ROSTER_VERSION = 3;
export const CURRENT_SERIE_B_2026_ROSTER_VERSION = 2;
export const CURRENT_SERIE_C_2026_ROSTER_VERSION = 3;
export const CURRENT_POTIGUAR_2026_ROSTER_VERSION = 3;
export const CURRENT_ESTADUAIS_2026_VERSION = 2;
export const CURRENT_ECUADOR_2026_ROSTER_VERSION = 2;
export const CURRENT_COLOMBIA_2026_ROSTER_VERSION = 2;
export const CURRENT_URUGUAY_2026_ROSTER_VERSION = 2;
export const CURRENT_CHILE_2026_ROSTER_VERSION = 2;
export const CURRENT_PARAGUAY_2026_ROSTER_VERSION = 2;
export const CURRENT_PERU_2026_ROSTER_VERSION = 2;
export const CURRENT_BOLIVIA_2026_ROSTER_VERSION = 2;
export const CURRENT_VENEZUELA_2026_ROSTER_VERSION = 2;
export const CURRENT_ARGENTINA_2026_ROSTER_VERSION = 2;
export const CURRENT_SAUDI_2026_ROSTER_VERSION = 2;
export const CURRENT_MEXICO_2026_ROSTER_VERSION = 2;
export const CURRENT_USA_MLS_2026_ROSTER_VERSION = 2;
export const CURRENT_CANADA_2026_ROSTER_VERSION = 2;
export const CURRENT_RUSSIA_2026_ROSTER_VERSION = 2;
export const CURRENT_PREMIER_LEAGUE_2026_ROSTER_VERSION = 2;

// === CURATED CLUB ID SETS ===
export const SERIE_A_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(BRAZIL_CURATED_ROSTERS_2026.serieA || {})
);
export const SERIE_B_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(BRAZIL_CURATED_ROSTERS_2026.serieB || {})
);
export const SERIE_C_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(BRAZIL_CURATED_ROSTERS_2026.serieC || {})
);
export const POTIGUAR_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(BRAZIL_CURATED_ROSTERS_2026.potiguar || {})
);
export const ESTADUAIS_2026_CURATED_CLUB_IDS = new Set<string>(
  ESTADUAIS_2026_CONFIG.flatMap((cfg) => cfg.defaultClubIds)
);
export const ECUADOR_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(SA_CURATED_ROSTERS_2026.equador || {})
);
export const COLOMBIA_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(SA_CURATED_ROSTERS_2026.colombia || {})
);
export const URUGUAY_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(SA_CURATED_ROSTERS_2026.uruguai || {})
);
export const CHILE_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(SA_CURATED_ROSTERS_2026.chile || {})
);
export const PARAGUAY_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(SA_CURATED_ROSTERS_2026.paraguai || {})
);
export const PERU_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(SA_CURATED_ROSTERS_2026.peru || {})
);
export const BOLIVIA_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(SA_CURATED_ROSTERS_2026.bolivia || {})
);
export const VENEZUELA_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(SA_CURATED_ROSTERS_2026.venezuela || {})
);
export const ARGENTINA_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(SA_CURATED_ROSTERS_2026.argentina || {})
);
export const SAUDI_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(WORLD_CURATED_ROSTERS_2026.saudiArabia || {})
);
export const MEXICO_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(WORLD_CURATED_ROSTERS_2026.mexico || {})
);
export const USA_MLS_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(WORLD_CURATED_ROSTERS_2026.usaMls || {})
);
export const CANADA_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(WORLD_CURATED_ROSTERS_2026.canada || {})
);
export const RUSSIA_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(WORLD_CURATED_ROSTERS_2026.russia || {})
);
export const PREMIER_LEAGUE_2026_CURATED_CLUB_IDS = new Set<string>(
  Object.keys(WORLD_CURATED_ROSTERS_2026.premierLeague || {})
);

// === HELPER UTILITIES ===
function getPositionFromRole(role: DetailedRole): Position {
  if (role === 'GOL') return 'GK';
  if (role === 'ZAG' || role === 'LAT') return 'DF';
  if (role === 'VOL' || role === 'MEI') return 'MF';
  return 'FW';
}

function stableHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function getDefaultSpecialSkill(role: DetailedRole, overall: number, seed: number): string {
  const skillsByRole: Record<DetailedRole, string[]> = {
    GOL: ['Paredão', 'Pegador de Pênaltis', 'Saída Rápida', 'Reflexo Felino'],
    ZAG: ['Xerife da Área', 'Jogo Aéreo Forte', 'Bote Preciso', 'Liderança Defensiva'],
    LAT: ['Cruzamento Certeiro', 'Motor Inesgotável', 'Apoio Ofensivo', 'Cobertura Rápida'],
    VOL: ['Cão de Guarda', 'Passe Longo', 'Desarme Limpo', 'Pulmão de Aço'],
    MEI: ['Maestro', 'Visão de Jogo', 'Batedor de Faltas', 'Passe em Profundidade'],
    ATA: ['Finalizador Clínico', 'Drible Curto', 'Faro de Gol', 'Velocista'],
  };
  if (overall < 64 && seed % 3 === 0) return 'Regular';
  const pool = skillsByRole[role];
  return pool[seed % pool.length];
}

export function createPlayer(
  id: string,
  name: string,
  detailedRole: DetailedRole,
  overall: number,
  age: number,
  squadNumber: number,
  isStarter: boolean,
  isSubstitute: boolean,
  specialSkill: string = '',
  clubCountry: string = 'Brasil',
  nationality?: string,
  clubContext?: {
    id?: string;
    division?: Division;
    reputation?: number;
    country?: string;
    europeanLeagueId?: EuropeanLeagueId;
    southAmericanLeagueId?: SouthAmericanLeagueId;
    worldLeagueId?: WorldLeagueId;
  }
): Player {
  const seed = stableHash(`${id}_${name}_${squadNumber}`);
  const safeOvr = Math.max(48, Math.min(96, Math.round(overall)));
  const safeAge = Math.max(16, Math.min(43, Math.round(age)));
  const econContext = clubContext || { division: 'A' as Division, country: clubCountry };
  const { marketValue, wage } = recalculatePlayerEconomics(
    safeOvr,
    safeAge,
    econContext.division,
    econContext
  );
  const resolvedNat =
    nationality || resolvePlayerNationality({ id, name }, clubCountry || 'Brasil');
  const contractYears =
    safeAge <= 21 ? 3 + (seed % 2) : safeAge >= 33 ? 1 + (seed % 2) : 2 + (seed % 3);
  const preferredFoot: Player['preferredFoot'] =
    seed % 11 === 0 ? 'Ambidestro' : seed % 4 === 0 ? 'Canhoto' : 'Destro';
  const resolvedSkill =
    specialSkill && specialSkill.trim().length > 0
      ? specialSkill.trim()
      : getDefaultSpecialSkill(detailedRole, safeOvr, seed);
  const profile = getClubEconomyProfile(econContext);
  const releaseClause = Math.max(
    profile.clauseFloor,
    Math.round((marketValue * (safeOvr >= 80 ? 2.4 : 1.9)) / 10_000) * 10_000
  );

  return {
    id,
    name,
    nationality: resolvedNat,
    position: getPositionFromRole(detailedRole),
    detailedRole,
    overall: safeOvr,
    age: safeAge,
    condition: 96 + (seed % 5),
    morale: isStarter ? 'Excelente' : 'Boa',
    wage,
    marketValue,
    releaseClause,
    contractYears,
    preferredFoot,
    specialSkill: resolvedSkill,
    matches: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    competitionYellowCards: {},
    competitionRedCards: {},
    suspensions: [],
    isSuspended: false,
    injuryWeeks: 0,
    isStarter,
    isSubstitute,
    squadNumber,
    ratingAverage: Number((6.5 + Math.min(1.1, Math.max(0, (safeOvr - 62) * 0.035))).toFixed(1)),
    seasonStartOverall: safeOvr,
    potential: computeRealisticPotential(safeOvr, safeAge, econContext.division),
  };
}

/**
 * Selects a balanced starting XI (1 GOL + 4 DF + 3 MF + 3 FW or closest available) and substitutes,
 * assigning deterministic pitchSlot (0..10).
 */
function normalizeBalancedLineup(squad: Player[]): Player[] {
  if (squad.length === 0) return squad;

  const sortedByOvr = [...squad].sort((a, b) => b.overall - a.overall);
  const chosenIds = new Set<string>();
  const starters: Player[] = [];

  const pickPlayers = (predicate: (p: Player) => boolean, count: number) => {
    for (const p of sortedByOvr) {
      if (starters.length >= 11 || count <= 0) break;
      if (!chosenIds.has(p.id) && predicate(p)) {
        chosenIds.add(p.id);
        starters.push(p);
        count--;
      }
    }
  };

  // Desired 4-3-3 tactical core
  pickPlayers((p) => p.detailedRole === 'GOL', 1);
  pickPlayers((p) => p.detailedRole === 'LAT', 2);
  pickPlayers((p) => p.detailedRole === 'ZAG', 2);
  pickPlayers((p) => p.detailedRole === 'VOL', 1);
  pickPlayers((p) => p.detailedRole === 'MEI', 2);
  pickPlayers((p) => p.detailedRole === 'ATA', 3);

  // Fill any remaining out-of-slot outfield spots up to 11 (avoiding 2nd GK if possible)
  pickPlayers((p) => p.detailedRole !== 'GOL', 11 - starters.length);
  pickPlayers(() => true, 11 - starters.length);

  // Sort starters cleanly into 4-3-3 pitchSlot order: GOL -> LAT -> ZAG -> VOL -> MEI -> ATA
  const slotWeight = (role: DetailedRole): number => {
    if (role === 'GOL') return 0;
    if (role === 'LAT') return 1;
    if (role === 'ZAG') return 2;
    if (role === 'VOL') return 3;
    if (role === 'MEI') return 4;
    return 5;
  };
  starters.sort((a, b) => slotWeight(a.detailedRole) - slotWeight(b.detailedRole) || b.overall - a.overall);

  const starterSlotMap = new Map<string, number>();
  starters.forEach((p, idx) => starterSlotMap.set(p.id, idx));

  const benchCandidates = sortedByOvr.filter((p) => !starterSlotMap.has(p.id));
  const subIds = new Set<string>();
  // Guarantee 1 GK on bench if available
  const benchGk = benchCandidates.find((p) => p.detailedRole === 'GOL');
  if (benchGk) subIds.add(benchGk.id);
  for (const p of benchCandidates) {
    if (subIds.size >= 12) break;
    subIds.add(p.id);
  }

  return squad.map((p) => {
    const slot = starterSlotMap.get(p.id);
    if (slot !== undefined) {
      return {
        ...p,
        isStarter: true,
        isSubstitute: false,
        pitchSlot: slot,
      };
    }
    return {
      ...p,
      isStarter: false,
      isSubstitute: subIds.has(p.id),
      pitchSlot: undefined,
    };
  });
}

export function trimSquadToMaxPlayers(
  squad: Player[],
  maxSize: number = MAX_SQUAD_SIZE,
  normalizeStarters: boolean = false
): Player[] {
  if (!squad || squad.length === 0) return [];
  let working = [...squad];

  if (working.length > maxSize) {
    const gks = working
      .filter((p) => p.detailedRole === 'GOL')
      .sort((a, b) => (b.isStarter ? 1 : 0) - (a.isStarter ? 1 : 0) || b.overall - a.overall);
    const keptGks = new Set(gks.slice(0, Math.min(3, gks.length)).map((p) => p.id));

    const prioritized = [...working].sort((a, b) => {
      const aMust = (a.isStarter ? 4 : 0) + (keptGks.has(a.id) ? 3 : 0) + (a.isSubstitute ? 1 : 0);
      const bMust = (b.isStarter ? 4 : 0) + (keptGks.has(b.id) ? 3 : 0) + (b.isSubstitute ? 1 : 0);
      if (bMust !== aMust) return bMust - aMust;
      if (b.overall !== a.overall) return b.overall - a.overall;
      return a.age - b.age;
    });
    working = prioritized.slice(0, maxSize);
  }

  const starterCount = working.filter((p) => p.isStarter).length;
  const gkStarters = working.filter((p) => p.isStarter && p.detailedRole === 'GOL').length;
  if (normalizeStarters || starterCount !== 11 || gkStarters !== 1) {
    return normalizeBalancedLineup(working);
  }
  return working;
}

const PROCEDURAL_NAMES_BY_REGION: Record<
  'BR' | 'ES' | 'EN' | 'JP' | 'ARAB' | 'FR' | 'DE' | 'PT',
  { first: string[]; last: string[] }
> = {
  BR: {
    first: [
      'Lucas', 'Gabriel', 'Matheus', 'Rafael', 'Bruno', 'Gustavo', 'Felipe', 'Rodrigo',
      'Thiago', 'Vinícius', 'Pedro', 'João', 'Caio', 'Igor', 'Danilo', 'Leandro',
      'Fábio', 'Renato', 'Marcelo', 'Eduardo', 'Diego', 'Henrique', 'André', 'Kauã',
    ],
    last: [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira',
      'Almeida', 'Nascimento', 'Rodrigues', 'Araújo', 'Ribeiro', 'Carvalho', 'Gomes',
      'Martins', 'Rocha', 'Barbosa', 'Mendes', 'Teixeira', 'Nogueira', 'Bezerra',
    ],
  },
  ES: {
    first: [
      'Mateo', 'Sebastián', 'Alejandro', 'Nicolás', 'Santiago', 'Diego', 'Carlos', 'Luis',
      'Andrés', 'Juan', 'Emiliano', 'Tomás', 'Facundo', 'Lautaro', 'Franco', 'Joaquín',
    ],
    last: [
      'González', 'Rodríguez', 'Martínez', 'López', 'García', 'Fernández', 'Pérez', 'Gómez',
      'Díaz', 'Sánchez', 'Ramírez', 'Torres', 'Vargas', 'Castro', 'Morales', 'Rojas',
    ],
  },
  EN: {
    first: [
      'Oliver', 'Harry', 'Jack', 'George', 'Charlie', 'Callum', 'Liam', 'Noah',
      'Ethan', 'Mason', 'Alfie', 'Owen', 'Ben', 'Sam', 'Jamie', 'Luke',
    ],
    last: [
      'Smith', 'Brown', 'Taylor', 'Wilson', 'Davies', 'Evans', 'Thomas', 'Roberts',
      'Walker', 'Wright', 'Robinson', 'Thompson', 'White', 'Hughes', 'Edwards', 'Green',
    ],
  },
  JP: {
    first: [
      'Takumi', 'Kenji', 'Haruto', 'Yuto', 'Sota', 'Kaito', 'Ren', 'Ryota',
      'Daiki', 'Shota', 'Koji', 'Yuki', 'Naoki', 'Tsubasa', 'Kazuki', 'Riku',
    ],
    last: [
      'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura',
      'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue',
    ],
  },
  ARAB: {
    first: [
      'Ahmed', 'Mohamed', 'Omar', 'Youssef', 'Karim', 'Mostafa', 'Tarek', 'Ali',
      'Hassan', 'Ibrahim', 'Mahmoud', 'Khaled', 'Hamza', 'Ayman', 'Nabil', 'Sami',
    ],
    last: [
      'El-Sayed', 'Hassan', 'Mansour', 'El-Sharif', 'Abdelrahman', 'Zaki', 'Fathy', 'Nasser',
      'Benali', 'El-Amrani', 'Bennani', 'Chakir', 'Idrissi', 'Tazi', 'Farouk', 'Adel',
    ],
  },
  FR: {
    first: ['Hugo', 'Lucas', 'Léo', 'Théo', 'Maxime', 'Julien', 'Antoine', 'Clément'],
    last: ['Martin', 'Bernard', 'Dubois', 'Robert', 'Richard', 'Petit', 'Durand', 'Moreau'],
  },
  DE: {
    first: ['Lukas', 'Jonas', 'Leon', 'Tim', 'Julian', 'Felix', 'Max', 'Tobias'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker'],
  },
  PT: {
    first: ['Diogo', 'João', 'Tiago', 'Rúben', 'Gonçalo', 'Bruno', 'André', 'Nuno'],
    last: ['Silva', 'Ferreira', 'Pereira', 'Costa', 'Oliveira', 'Santos', 'Rodrigues', 'Martins'],
  },
};

function resolveRegionKey(country?: string): keyof typeof PROCEDURAL_NAMES_BY_REGION {
  const c = (country || 'Brasil').toLowerCase();
  if (c.includes('japão') || c.includes('japao')) return 'JP';
  if (c.includes('egito') || c.includes('marrocos') || c.includes('arábia') || c.includes('arabia')) {
    return 'ARAB';
  }
  if (c.includes('portugal')) return 'PT';
  if (c.includes('inglaterra') || c.includes('escócia') || c.includes('gales') || c.includes('estados unidos') || c.includes('canadá')) {
    return 'EN';
  }
  if (c.includes('frança') || c.includes('franca') || c.includes('bélgica')) return 'FR';
  if (c.includes('alemanha') || c.includes('áustria') || c.includes('suíça')) return 'DE';
  if (
    c.includes('argentina') ||
    c.includes('colômbia') ||
    c.includes('uruguai') ||
    c.includes('chile') ||
    c.includes('equador') ||
    c.includes('paraguai') ||
    c.includes('peru') ||
    c.includes('bolívia') ||
    c.includes('venezuela') ||
    c.includes('méxico') ||
    c.includes('espanha')
  ) {
    return 'ES';
  }
  return 'BR';
}

function generateDeterministicPlayerName(seed: number, country?: string): string {
  const bank = PROCEDURAL_NAMES_BY_REGION[resolveRegionKey(country)];
  const first = bank.first[seed % bank.first.length];
  const last = bank.last[Math.floor(seed / 7) % bank.last.length];
  return `${first} ${last}`;
}

function getBaseDivisionOvrRange(division: Division, reputation: number = 2): [number, number] {
  if (division === 'EST') return reputation >= 2 ? [55, 62] : [52, 59];
  if (division === 'D') return reputation >= 2 ? [58, 65] : [55, 62];
  if (division === 'C') return [61, 69];
  if (division === 'B') return [66, 74];
  if (division === 'SA') return reputation >= 4 ? [72, 79] : [67, 74];
  if (division === 'WL') return reputation >= 4 ? [71, 78] : [65, 73];
  if (division === 'EU') return reputation >= 4 ? [74, 83] : [65, 75];
  return [72, 81];
}

export function ensureMinimumSquadDepth(
  clubId: string,
  division: Division,
  squad: Player[],
  minDepth: number = 22,
  forceStarterCheck: boolean = false,
  clubCountry: string = 'Brasil',
  seasonYear?: number
): Player[] {
  const isReplenishingExisting = squad.length > 0;
  // Deduplicate any pre-existing duplicate player IDs defensively
  const seenIds = new Set<string>();
  const working: Player[] = [];
  for (const p of squad) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      working.push(p);
    } else {
      let dedupNonce = 1;
      let nextId = `${p.id}_u${dedupNonce}`;
      while (seenIds.has(nextId)) {
        dedupNonce += 1;
        nextId = `${p.id}_u${dedupNonce}`;
      }
      seenIds.add(nextId);
      working.push({ ...p, id: nextId });
    }
  }

  const targetDepth = Math.max(18, Math.min(MAX_SQUAD_SIZE, minDepth));
  const usedNums = new Set(working.map((p) => p.squadNumber));
  const nextSquadNumber = (preferred: number): number => {
    let n = preferred;
    while (usedNums.has(n) || n < 1 || n > 99) {
      n = (n % 98) + 1;
    }
    usedNums.add(n);
    return n;
  };

  const [minOvr, maxOvr] = getBaseDivisionOvrRange(division, working.length > 0 ? 2 : 1);
  const avgCurrent =
    working.length > 0
      ? Math.round(working.reduce((acc, p) => acc + p.overall, 0) / working.length)
      : Math.round((minOvr + maxOvr) / 2);

  // Target positional distribution across a balanced 30-man squad
  const idealTargets: Record<DetailedRole, number> = {
    GOL: 3,
    ZAG: 5,
    LAT: 5,
    VOL: 5,
    MEI: 6,
    ATA: 6,
  };
  const roleOrder: DetailedRole[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  const roleCounts: Record<DetailedRole, number> = {
    GOL: 0,
    ZAG: 0,
    LAT: 0,
    VOL: 0,
    MEI: 0,
    ATA: 0,
  };
  for (const p of working) {
    roleCounts[p.detailedRole] = (roleCounts[p.detailedRole] || 0) + 1;
  }

  const missingRoles: DetailedRole[] = [];
  const mandatoryMins: Record<DetailedRole, number> = {
    GOL: 2,
    ZAG: 3,
    LAT: 2,
    VOL: 2,
    MEI: 3,
    ATA: 3,
  };
  for (const r of roleOrder) {
    while (roleCounts[r] < mandatoryMins[r]) {
      missingRoles.push(r);
      roleCounts[r] += 1;
    }
  }

  // Fill remaining depth up to targetDepth by picking the most under-represented role (prevents ZAG hoarding)
  const outfieldRoles: DetailedRole[] = ['ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  while (working.length + missingRoles.length < targetDepth) {
    let bestRole: DetailedRole = 'MEI';
    let bestDeficit = -999;
    for (const r of roleOrder) {
      // Only add a 3rd GK if squad has room and < 3 GKs
      if (r === 'GOL' && roleCounts.GOL >= 3) continue;
      const deficit = idealTargets[r] - roleCounts[r];
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        bestRole = r;
      }
    }
    if (bestDeficit <= 0) {
      // Pick the least-populated outfield role
      bestRole = outfieldRoles.reduce((minR, r) =>
        roleCounts[r] < roleCounts[minR] ? r : minR
      );
    }
    missingRoles.push(bestRole);
    roleCounts[bestRole] += 1;
  }

  // If squad is already at MAX_SQUAD_SIZE but lacks a mandatory GK or FW, release weakest surplus non-starter from over-stocked roles
  const criticalRolesNeeded = missingRoles.filter((r) => r === 'GOL' || r === 'ATA');
  if (working.length >= MAX_SQUAD_SIZE && criticalRolesNeeded.length > 0) {
    for (let c = 0; c < criticalRolesNeeded.length && working.length >= MAX_SQUAD_SIZE; c++) {
      const cutIdx = working
        .map((p, idx) => ({ p, idx }))
        .filter(({ p }) => p.detailedRole !== 'GOL' && p.detailedRole !== 'ATA' && !p.isStarter && !p.isLoan)
        .sort((a, b) => a.p.overall - b.p.overall)[0]?.idx;
      if (cutIdx !== undefined) {
        working.splice(cutIdx, 1);
      }
    }
  }

  const yearTag = seasonYear ? `y${seasonYear}` : 'base';
  for (let i = 0; i < missingRoles.length && working.length < MAX_SQUAD_SIZE; i++) {
    const role = missingRoles[i];
    let nonce = 0;
    let seed = stableHash(`${clubId}_depth_${yearTag}_${i}_${working.length}_${nonce}`);
    let candidateId = `${clubId}_gen_${yearTag}_${working.length}_${seed % 99999}`;
    while (seenIds.has(candidateId)) {
      nonce += 1;
      seed = stableHash(`${clubId}_depth_${yearTag}_${i}_${working.length}_${nonce}`);
      candidateId = `${clubId}_gen_${yearTag}_${working.length}_${seed % 99999}`;
    }
    seenIds.add(candidateId);

    // Replenishing existing squads across seasons brings in young academy prospects (17-21) to keep world age balanced
    const age = isReplenishingExisting ? 17 + (seed % 5) : 19 + (seed % 12);
    const ovr = isReplenishingExisting
      ? Math.max(50, Math.min(maxOvr, avgCurrent - 4 + (seed % 6)))
      : Math.max(50, Math.min(maxOvr, avgCurrent - 2 + (seed % 4)));
    const num = nextSquadNumber(role === 'GOL' ? 12 + i : 14 + i);
    const created = createPlayer(
      candidateId,
      generateDeterministicPlayerName(seed, clubCountry),
      role,
      ovr,
      age,
      num,
      false,
      working.length < 18,
      '',
      clubCountry,
      clubCountry,
      { id: clubId, division, country: clubCountry }
    );
    if (isReplenishingExisting) {
      created.potential = Math.min(92, Math.max(ovr + 5, Math.min(maxOvr + 6, ovr + 6 + (seed % 7))));
    }
    working.push(created);
  }

  const finalSquad =
    working.length > MAX_SQUAD_SIZE ? trimSquadToMaxPlayers(working, MAX_SQUAD_SIZE, true) : working;

  if (
    forceStarterCheck ||
    finalSquad.filter((p) => p.isStarter).length !== 11 ||
    finalSquad.filter((p) => p.isStarter && p.position === 'GK').length !== 1
  ) {
    return normalizeBalancedLineup(finalSquad);
  }
  return finalSquad;
}

// === TACTICS & FINANCES HELPERS ===
function buildDefaultTactics(squad: Player[]): TacticalSettings {
  const starters = squad.filter((p) => p.isStarter);
  const pool = starters.length > 0 ? starters : squad;
  const captain =
    [...pool]
      .filter((p) => p.detailedRole === 'ZAG' || p.detailedRole === 'VOL' || p.detailedRole === 'GOL')
      .sort((a, b) => b.overall + b.age * 0.4 - (a.overall + a.age * 0.4))[0] || pool[0];
  const striker =
    [...pool]
      .filter((p) => p.detailedRole === 'ATA' || p.detailedRole === 'MEI')
      .sort((a, b) => b.overall - a.overall)[0] || pool[0];
  const creator =
    [...pool]
      .filter((p) => p.detailedRole === 'MEI' || p.detailedRole === 'LAT' || p.detailedRole === 'ATA')
      .sort((a, b) => b.overall - a.overall)[0] || striker;

  return {
    formation: '4-3-3',
    mentality: 'Equilibrado',
    marking: 'Normal',
    passing: 'Misto',
    captainId: captain?.id,
    penaltyTakerId: striker?.id,
    freekickTakerId: creator?.id,
    cornerTakerId: creator?.id,
  };
}

function buildInitialClubFinances(params: {
  id: string;
  division: Division;
  reputation: number;
  country: string;
  europeanLeagueId?: EuropeanLeagueId;
  southAmericanLeagueId?: SouthAmericanLeagueId;
  worldLeagueId?: WorldLeagueId;
  stadiumCapacity: number;
  squad: Player[];
}): Club['finances'] {
  const econ = getClubEconomyProfile({
    id: params.id,
    division: params.division,
    reputation: params.reputation,
    country: params.country,
    europeanLeagueId: params.europeanLeagueId,
    southAmericanLeagueId: params.southAmericanLeagueId,
    worldLeagueId: params.worldLeagueId,
  });

  const rep = Math.max(1, Math.min(5, params.reputation));
  const monthlyPayroll = params.squad.reduce((sum, p) => sum + p.wage, 0);

  const facilityLevel =
    econ.tierId === 'EST'
      ? 1
      : econ.tierId === 'BR_D'
      ? Math.min(2, rep)
      : econ.tierId === 'BR_C' || econ.tierId === 'EU_4' || econ.tierId === 'TIER_LOWER_PRO'
      ? Math.min(3, Math.max(1, rep))
      : econ.tierId === 'BR_B' || econ.tierId === 'SA_MID' || econ.tierId === 'EU_3'
      ? Math.min(4, Math.max(2, rep))
      : Math.min(5, Math.max(3, rep));

  // Weekly expenses reflect ~1/4 monthly payroll + modest ops scaled by tier facilityMult
  const weeklyPayrollEstimate = Math.round(monthlyPayroll / 4.3);
  const weeklyOps = Math.round(14_000 * Math.max(0.12, econ.facilityMult) * (0.85 + rep * 0.12));
  const minWeeklyExpenses =
    econ.tierId === 'EST' ? 7_500 : econ.tierId === 'BR_D' ? 9_500 : 12_000;
  const weeklyExpenses = Math.max(minWeeklyExpenses, weeklyPayrollEstimate + weeklyOps);

  const commercialSponsor = Math.round(
    (econ.broadcastBaseBase * 0.08 + econ.broadcastBasePerRep * rep * 0.04) *
      Math.max(0.75, econ.commercialMult)
  );
  const weeklySponsor = Math.max(
    econ.tierId === 'EST' ? 8_000 : econ.tierId === 'BR_D' ? 14_000 : 22_000,
    Math.round(Math.max(commercialSponsor, weeklyExpenses * 0.62) / 1_000) * 1_000
  );

  const balanceMultiplier =
    econ.tierId === 'EST'
      ? 0.45
      : econ.tierId === 'BR_D'
      ? 0.9
      : econ.tierId === 'BR_C' || econ.tierId === 'EU_4'
      ? 1.5
      : econ.tierId === 'TIER_LOWER_PRO'
      ? 1.8
      : econ.tierId === 'BR_B' || econ.tierId === 'EU_3' || econ.tierId === 'SA_MID'
      ? 3.0
      : econ.tierId === 'SA_TOP' || econ.tierId === 'WL_HIGH'
      ? 6.0
      : econ.tierId === 'BR_A'
      ? 8.5
      : econ.tierId === 'EU_2'
      ? 9.5
      : econ.tierId === 'WL_ELITE'
      ? 18.0
      : 16.0;

  const startingBalance =
    Math.round((Math.max(320_000, rep * 450_000 * balanceMultiplier)) / 10_000) * 10_000;

  const ticketHoldersRatio =
    econ.tierId === 'EST'
      ? 0.08
      : econ.tierId === 'BR_D'
      ? 0.12
      : econ.tierId === 'BR_C'
      ? 0.18
      : econ.tierId === 'BR_B'
      ? 0.25
      : 0.35;

  const seasonTicketHolders = Math.max(
    250,
    Math.round((params.stadiumCapacity * ticketHoldersRatio) / 50) * 50
  );

  return {
    balance: startingBalance,
    weeklySponsor,
    weeklyExpenses,
    stadiumLevel: facilityLevel,
    trainingFacilityLevel: facilityLevel,
    medicalFacilityLevel: facilityLevel,
    youthAcademyLevel: facilityLevel,
    seasonTicketHolders,
    totalIncomeSeason: 0,
    totalExpensesSeason: 0,
    seasonStartBalance: startingBalance,
    popularTicketPrice: Math.max(15, Math.round(econ.refTicket * 0.85)),
    vipTicketPrice: Math.round(econ.refTicket * 2.2),
    socioMonthlyFee: econ.socioDefaultFee,
    socioTicketDiscountPct: 25,
  };
}

// === CURATED ROSTER BUILDER & MIGRATION APPLIERS ===
function buildCuratedPlayersForClub(
  clubId: string,
  tag: string,
  tuples: CuratedPlayerTuple[],
  clubContext: {
    id: string;
    division: Division;
    reputation: number;
    country: string;
    europeanLeagueId?: EuropeanLeagueId;
    southAmericanLeagueId?: SouthAmericanLeagueId;
    worldLeagueId?: WorldLeagueId;
  }
): Player[] {
  const seenNums = new Set<number>();
  const players = tuples.slice(0, MAX_SQUAD_SIZE).map((tuple, idx) => {
    const [name, role, ovr, age, rawNum, nat] = tuple;
    let num = Math.max(1, Math.min(99, rawNum || idx + 1));
    while (seenNums.has(num)) {
      num = (num % 99) + 1;
    }
    seenNums.add(num);
    return createPlayer(
      `${clubId}_${tag}_${idx + 1}_${num}`,
      name,
      role,
      ovr,
      age,
      num,
      false,
      false,
      '',
      clubContext.country,
      nat || clubContext.country,
      clubContext
    );
  });

  const gkCount = players.filter((p) => p.position === 'GK').length;
  const dfCount = players.filter((p) => p.position === 'DF').length;
  const mfCount = players.filter((p) => p.position === 'MF').length;
  const fwCount = players.filter((p) => p.position === 'FW').length;
  const ensured =
    players.length < 18 || gkCount < 2 || dfCount < 4 || mfCount < 3 || fwCount < 2
      ? ensureMinimumSquadDepth(
          clubId,
          clubContext.division,
          players,
          Math.max(18, players.length),
          true,
          clubContext.country
        )
      : normalizeBalancedLineup(players);

  return trimSquadToMaxPlayers(ensured, MAX_SQUAD_SIZE, true);
}

function applyCuratedRosterMapToClub(
  club: Club,
  rosterMap: Record<string, CuratedPlayerTuple[]> | undefined,
  tag: string,
  forceFullRebuild: boolean = false
): Club {
  const tuples = rosterMap?.[club.id];
  if (!tuples || tuples.length === 0) return club;

  const hasTagAlready = club.squad.some((p) => p.id.includes(`_${tag}_`));
  if (!forceFullRebuild && hasTagAlready && club.squad.length >= 18) {
    return club;
  }

  const nextSquad = buildCuratedPlayersForClub(club.id, tag, tuples, {
    id: club.id,
    division: club.division,
    reputation: club.reputation,
    country: club.country || 'Brasil',
    europeanLeagueId: club.europeanLeagueId,
    southAmericanLeagueId: club.southAmericanLeagueId,
    worldLeagueId: club.worldLeagueId,
  });

  return {
    ...club,
    squad: nextSquad,
    tactics: {
      ...club.tactics,
      ...buildDefaultTactics(nextSquad),
      formation: club.tactics?.formation || '4-3-3',
    },
  };
}

export function applyOfficialFlamengoRosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  if (club.id !== 'fla') return club;
  return applyCuratedRosterMapToClub(club, BRAZIL_CURATED_ROSTERS_2026.serieA, 'sa26', forceFullRebuild);
}

export function applyOfficialPalmeirasRosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  if (club.id !== 'pal') return club;
  return applyCuratedRosterMapToClub(club, BRAZIL_CURATED_ROSTERS_2026.serieA, 'sa26', forceFullRebuild);
}

export function applyOfficialSerieA2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, BRAZIL_CURATED_ROSTERS_2026.serieA, 'sa26', forceFullRebuild);
}

export function applyOfficialSerieB2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, BRAZIL_CURATED_ROSTERS_2026.serieB, 'sb26', forceFullRebuild);
}

export function applyOfficialSerieC2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, BRAZIL_CURATED_ROSTERS_2026.serieC, 'sc26', forceFullRebuild);
}

export function applyOfficialPotiguar2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, BRAZIL_CURATED_ROSTERS_2026.potiguar, 'pot26', forceFullRebuild);
}

export function applyOfficialEcuador2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, SA_CURATED_ROSTERS_2026.equador, 'equ26', forceFullRebuild);
}

export function applyOfficialColombia2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, SA_CURATED_ROSTERS_2026.colombia, 'col26', forceFullRebuild);
}

export function applyOfficialUruguay2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, SA_CURATED_ROSTERS_2026.uruguai, 'uru26', forceFullRebuild);
}

export function applyOfficialChile2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, SA_CURATED_ROSTERS_2026.chile, 'chi26', forceFullRebuild);
}

export function applyOfficialParaguay2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, SA_CURATED_ROSTERS_2026.paraguai, 'par26', forceFullRebuild);
}

export function applyOfficialPeru2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, SA_CURATED_ROSTERS_2026.peru, 'per26', forceFullRebuild);
}

export function applyOfficialBolivia2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, SA_CURATED_ROSTERS_2026.bolivia, 'bol26', forceFullRebuild);
}

export function applyOfficialVenezuela2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, SA_CURATED_ROSTERS_2026.venezuela, 'ven26', forceFullRebuild);
}

export function applyOfficialArgentina2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, SA_CURATED_ROSTERS_2026.argentina, 'arg26', forceFullRebuild);
}

export function applyOfficialSaudiArabia2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, WORLD_CURATED_ROSTERS_2026.saudiArabia, 'sau26', forceFullRebuild);
}

export function applyOfficialMexico2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, WORLD_CURATED_ROSTERS_2026.mexico, 'mex26', forceFullRebuild);
}

export function applyOfficialUsaMls2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, WORLD_CURATED_ROSTERS_2026.usaMls, 'mls26', forceFullRebuild);
}

export function applyOfficialCanada2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, WORLD_CURATED_ROSTERS_2026.canada, 'can26', forceFullRebuild);
}

export function applyOfficialRussia2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, WORLD_CURATED_ROSTERS_2026.russia, 'rus26', forceFullRebuild);
}

export function applyOfficialPremierLeague2026RosterToClub(club: Club, forceFullRebuild: boolean = false): Club {
  return applyCuratedRosterMapToClub(club, WORLD_CURATED_ROSTERS_2026.premierLeague, 'epl26', forceFullRebuild);
}

// === RIVALRIES ===
const DEFAULT_RIVAL_PAIRS: Array<[string, string]> = [
  ['fla', 'flu'], ['fla', 'vas'], ['fla', 'bot'], ['flu', 'bot'], ['flu', 'vas'], ['vas', 'bot'],
  ['pal', 'cor'], ['pal', 'sao'], ['cor', 'sao'], ['pal', 'san'], ['cor', 'san'], ['sao', 'san'],
  ['pon', 'gua'],
  ['cam', 'cru'], ['cam', 'ame'], ['cru', 'ame'],
  ['gre', 'int'], ['gre', 'juv'], ['int', 'juv'],
  ['bah', 'vit'], ['for', 'cea'], ['cea', 'fer'], ['for', 'fer'],
  ['cap', 'cfc'], ['rem', 'pay'], ['goi', 'vil'], ['goi', 'acg'], ['vil', 'acg'],
  ['ava', 'fig'], ['ava', 'cha'], ['fig', 'cha'], ['cri', 'ava'],
  ['spo', 'nau'], ['spo', 'stc'], ['nau', 'stc'],
  ['abc', 'arn'], ['rn_ass', 'rn_mos'], ['rn_ass', 'rn_pot'], ['rn_mos', 'rn_pot'],
  ['bpb', 'trz'], ['csa', 'crb'], ['ser', 'con'],
  ['fla', 'pal'], ['fla', 'cam'], ['bah', 'spo'],
  ['boc', 'riv'], ['pen', 'nac'], ['idv', 'ldu'], ['ccl', 'uch'], ['oli', 'cer'],
  ['atn', 'med'], ['mil', 'sfe'], ['uni', 'ali_pe'], ['bol', 'bol_str'],
];

const RIVAL_MAP = (() => {
  const map = new Map<string, Set<string>>();
  for (const [a, b] of DEFAULT_RIVAL_PAIRS) {
    if (!map.has(a)) map.set(a, new Set());
    if (!map.has(b)) map.set(b, new Set());
    map.get(a)!.add(b);
    map.get(b)!.add(a);
  }
  return map;
})();

export function getDefaultClubRivals(clubId: string): string[] {
  return Array.from(RIVAL_MAP.get(clubId) || []);
}

// === PROCEDURAL SQUAD GENERATOR FOR NON-CURATED CLUBS (SÉRIE D, ESTADUAIS, JPN, EGY, MAR) ===
function buildProceduralSquad(params: {
  id: string;
  division: Division;
  reputation: number;
  country: string;
  worldLeagueId?: WorldLeagueId;
}): Player[] {
  const [minOvr, maxOvr] = getBaseDivisionOvrRange(params.division, params.reputation);
  const templateRoles: DetailedRole[] = [
    'GOL', 'GOL', 'GOL',
    'LAT', 'LAT', 'LAT', 'LAT',
    'ZAG', 'ZAG', 'ZAG', 'ZAG',
    'VOL', 'VOL', 'VOL',
    'MEI', 'MEI', 'MEI', 'MEI',
    'ATA', 'ATA', 'ATA', 'ATA',
  ];
  const usedNames = new Set<string>();
  const players: Player[] = templateRoles.map((role, idx) => {
    const seed = stableHash(`${params.id}_proc_${idx}`);
    let name = generateDeterministicPlayerName(seed, params.country);
    let bump = 1;
    while (usedNames.has(name)) {
      name = generateDeterministicPlayerName(seed + bump * 13, params.country);
      bump++;
    }
    usedNames.add(name);

    const isCoreStarterTier = idx === 0 || idx === 3 || idx === 4 || idx === 7 || idx === 8 || idx === 11 || idx === 14 || idx === 15 || idx === 18 || idx === 19 || idx === 20;
    const span = Math.max(2, maxOvr - minOvr);
    const rawOvr = isCoreStarterTier
      ? minOvr + Math.floor(span * 0.55) + (seed % (Math.max(2, Math.ceil(span * 0.45)) + 1))
      : minOvr + (seed % (Math.max(2, Math.floor(span * 0.7)) + 1));
    const clampedOvr = Math.max(48, Math.min(maxOvr + (params.reputation >= 4 ? 1 : 0), rawOvr));
    const age = role === 'GOL' ? 22 + (seed % 14) : 18 + (seed % 15);
    const num = role === 'GOL' ? (idx === 0 ? 1 : idx === 1 ? 12 : 22) : idx + 2;

    return createPlayer(
      `${params.id}_p_${idx + 1}`,
      name,
      role,
      clampedOvr,
      age,
      num,
      false,
      false,
      '',
      params.country,
      params.country,
      {
        id: params.id,
        division: params.division,
        reputation: params.reputation,
        country: params.country,
        worldLeagueId: params.worldLeagueId,
      }
    );
  });

  return trimSquadToMaxPlayers(normalizeBalancedLineup(players), MAX_SQUAD_SIZE, true);
}

// === LOOKUP FOR CURATED NON-EU CLUB ROSTERS ===
function resolveNonEuCuratedRoster(
  clubId: string,
  division: Division,
  subLeagueId: SouthAmericanLeagueId | WorldLeagueId | null
): { tag: string; tuples: CuratedPlayerTuple[] } | null {
  if (BRAZIL_CURATED_ROSTERS_2026.serieA?.[clubId]) {
    return { tag: 'sa26', tuples: BRAZIL_CURATED_ROSTERS_2026.serieA[clubId] };
  }
  if (BRAZIL_CURATED_ROSTERS_2026.serieB?.[clubId]) {
    return { tag: 'sb26', tuples: BRAZIL_CURATED_ROSTERS_2026.serieB[clubId] };
  }
  if (BRAZIL_CURATED_ROSTERS_2026.serieC?.[clubId]) {
    return { tag: 'sc26', tuples: BRAZIL_CURATED_ROSTERS_2026.serieC[clubId] };
  }
  if (BRAZIL_CURATED_ROSTERS_2026.potiguar?.[clubId]) {
    return { tag: 'pot26', tuples: BRAZIL_CURATED_ROSTERS_2026.potiguar[clubId] };
  }

  if (subLeagueId === 'liga_arg' && SA_CURATED_ROSTERS_2026.argentina?.[clubId]) {
    return { tag: 'arg26', tuples: SA_CURATED_ROSTERS_2026.argentina[clubId] };
  }
  if (subLeagueId === 'liga_bol' && SA_CURATED_ROSTERS_2026.bolivia?.[clubId]) {
    return { tag: 'bol26', tuples: SA_CURATED_ROSTERS_2026.bolivia[clubId] };
  }
  if (subLeagueId === 'liga_chi' && SA_CURATED_ROSTERS_2026.chile?.[clubId]) {
    return { tag: 'chi26', tuples: SA_CURATED_ROSTERS_2026.chile[clubId] };
  }
  if (subLeagueId === 'liga_col' && SA_CURATED_ROSTERS_2026.colombia?.[clubId]) {
    return { tag: 'col26', tuples: SA_CURATED_ROSTERS_2026.colombia[clubId] };
  }
  if (subLeagueId === 'liga_equ' && SA_CURATED_ROSTERS_2026.equador?.[clubId]) {
    return { tag: 'equ26', tuples: SA_CURATED_ROSTERS_2026.equador[clubId] };
  }
  if (subLeagueId === 'liga_par' && SA_CURATED_ROSTERS_2026.paraguai?.[clubId]) {
    return { tag: 'par26', tuples: SA_CURATED_ROSTERS_2026.paraguai[clubId] };
  }
  if (subLeagueId === 'liga_per' && SA_CURATED_ROSTERS_2026.peru?.[clubId]) {
    return { tag: 'per26', tuples: SA_CURATED_ROSTERS_2026.peru[clubId] };
  }
  if (subLeagueId === 'liga_uru' && SA_CURATED_ROSTERS_2026.uruguai?.[clubId]) {
    return { tag: 'uru26', tuples: SA_CURATED_ROSTERS_2026.uruguai[clubId] };
  }
  if (subLeagueId === 'liga_ven' && SA_CURATED_ROSTERS_2026.venezuela?.[clubId]) {
    return { tag: 'ven26', tuples: SA_CURATED_ROSTERS_2026.venezuela[clubId] };
  }

  if (subLeagueId === 'usa_mls' && WORLD_CURATED_ROSTERS_2026.usaMls?.[clubId]) {
    return { tag: 'mls26', tuples: WORLD_CURATED_ROSTERS_2026.usaMls[clubId] };
  }
  if (subLeagueId === 'mex_ligamx' && WORLD_CURATED_ROSTERS_2026.mexico?.[clubId]) {
    return { tag: 'mex26', tuples: WORLD_CURATED_ROSTERS_2026.mexico[clubId] };
  }
  if (subLeagueId === 'can_cpl' && WORLD_CURATED_ROSTERS_2026.canada?.[clubId]) {
    return { tag: 'can26', tuples: WORLD_CURATED_ROSTERS_2026.canada[clubId] };
  }
  if (subLeagueId === 'sau_pro' && WORLD_CURATED_ROSTERS_2026.saudiArabia?.[clubId]) {
    return { tag: 'sau26', tuples: WORLD_CURATED_ROSTERS_2026.saudiArabia[clubId] };
  }
  if (subLeagueId === 'rus_premier' && WORLD_CURATED_ROSTERS_2026.russia?.[clubId]) {
    return { tag: 'rus26', tuples: WORLD_CURATED_ROSTERS_2026.russia[clubId] };
  }

  return null;
}

function buildNonEuClubFromMeta(meta: NonEuClubMetaTuple): Club {
  const [
    id,
    name,
    shortName,
    initials,
    state,
    division,
    subLeagueId,
    reputation,
    country,
    primary,
    secondary,
    text,
    stadiumName,
    capacity,
    managerName,
  ] = meta;

  const southAmericanLeagueId =
    division === 'SA' ? (subLeagueId as SouthAmericanLeagueId) : undefined;
  const worldLeagueId = division === 'WL' ? (subLeagueId as WorldLeagueId) : undefined;

  const curated = resolveNonEuCuratedRoster(id, division, subLeagueId);
  const clubContext = {
    id,
    division,
    reputation,
    country,
    southAmericanLeagueId,
    worldLeagueId,
  };

  const squad = curated
    ? buildCuratedPlayersForClub(id, curated.tag, curated.tuples, clubContext)
    : buildProceduralSquad({
        id,
        division,
        reputation,
        country,
        worldLeagueId,
      });

  const econ = getClubEconomyProfile(clubContext);
  const finances = buildInitialClubFinances({
    ...clubContext,
    stadiumCapacity: capacity,
    squad,
  });

  const CUSTOM_CLUB_LOGOS: Record<string, string> = {
    rn_ass: '/assets/aistudio/ASSU_6837087e.png',
  };

  return {
    id,
    name,
    shortName,
    initials,
    state,
    division,
    reputation,
    country,
    southAmericanLeagueId,
    worldLeagueId,
    rivals: getDefaultClubRivals(id),
    colors: { primary, secondary, text },
    logoUrl: CUSTOM_CLUB_LOGOS[id],
    stadium: {
      name: stadiumName,
      capacity,
      ticketPrice: econ.refTicket,
      level: finances.stadiumLevel,
    },
    finances,
    tactics: buildDefaultTactics(squad),
    squad,
    isUser: false,
    managerName,
  };
}

// === EU CLUB BUILDERS ===
function contrastTextForHex(hex: string): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return '#ffffff';
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.72 ? '#0f172a' : '#ffffff';
}

function makeShortInitials(shortName: string): string {
  const cleaned = shortName.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').toUpperCase();
  return (cleaned.slice(0, 3) || 'CLB').padEnd(3, 'X');
}

function buildEuClub(params: {
  id: string;
  name: string;
  shortName: string;
  country: string;
  state: string;
  reputation: number;
  primaryColor: string;
  managerName: string;
  europeanLeagueId?: EuropeanLeagueId;
  stadiumName?: string;
  tuples: Array<CuratedPlayerTuple | Top5PlayerTuple>;
  tag?: string;
}): Club {
  const isEplCurated =
    params.europeanLeagueId === 'eng_premier' &&
    Boolean(WORLD_CURATED_ROSTERS_2026.premierLeague?.[params.id]);

  const finalTuples: CuratedPlayerTuple[] = isEplCurated
    ? WORLD_CURATED_ROSTERS_2026.premierLeague[params.id]
    : params.tuples.map((t) => [t[0], t[1], t[2], t[3], t[4], t[5]]);

  const clubContext = {
    id: params.id,
    division: 'EU' as Division,
    reputation: params.reputation,
    country: params.country,
    europeanLeagueId: params.europeanLeagueId,
  };

  const tag = isEplCurated ? 'epl26' : params.tag || 'eu26';
  const squad = buildCuratedPlayersForClub(params.id, tag, finalTuples, clubContext);

  const econ = getClubEconomyProfile(clubContext);
  const seed = stableHash(params.id);
  const capacity =
    econ.tierId === 'EU_TOP5'
      ? 26_000 + params.reputation * 9_500 + (seed % 8_000)
      : econ.tierId === 'EU_2'
      ? 16_000 + params.reputation * 6_500 + (seed % 6_000)
      : econ.tierId === 'EU_3'
      ? 9_000 + params.reputation * 3_200 + (seed % 4_000)
      : 5_000 + params.reputation * 2_000 + (seed % 2_500);

  const finances = buildInitialClubFinances({
    ...clubContext,
    stadiumCapacity: capacity,
    squad,
  });

  const text = contrastTextForHex(params.primaryColor);
  const secondary = text === '#ffffff' ? '#ffffff' : '#111111';

  return {
    id: params.id,
    name: params.name,
    shortName: params.shortName,
    initials: makeShortInitials(params.shortName),
    state: params.state,
    division: 'EU',
    reputation: params.reputation,
    country: params.country,
    europeanLeagueId: params.europeanLeagueId,
    rivals: getDefaultClubRivals(params.id),
    colors: {
      primary: params.primaryColor,
      secondary,
      text,
    },
    stadium: {
      name: params.stadiumName || `${params.shortName} Arena`,
      capacity,
      ticketPrice: econ.refTicket,
      level: finances.stadiumLevel,
    },
    finances,
    tactics: buildDefaultTactics(squad),
    squad,
    isUser: false,
    managerName: params.managerName,
  };
}

function buildAllEuropeanClubs(): Club[] {
  const euClubs: Club[] = [];

  for (const meta of TOP5_CLUBS_META) {
    const rawTuples = TOP5_SQUADS_DATA[meta.id] || [];
    euClubs.push(
      buildEuClub({
        id: meta.id,
        name: meta.name,
        shortName: meta.shortName,
        country: meta.country,
        state: meta.state,
        reputation: meta.reputation,
        primaryColor: meta.primaryColor,
        managerName: meta.managerName,
        europeanLeagueId: meta.leagueId,
        tuples: rawTuples,
        tag: 'top5',
      })
    );
  }

  const pushEuLeague = (
    list: Array<{
      id: string;
      name: string;
      shortName: string;
      reputation: number;
      primaryColor: string;
      managerName: string;
      players: CuratedPlayerTuple[];
      country?: string;
      stateCode?: string;
    }>,
    europeanLeagueId: EuropeanLeagueId,
    defaultCountry: string,
    defaultState: string
  ) => {
    for (const c of list) {
      euClubs.push(
        buildEuClub({
          id: c.id,
          name: c.name,
          shortName: c.shortName,
          country: c.country || defaultCountry,
          state: c.stateCode || defaultState,
          reputation: c.reputation,
          primaryColor: c.primaryColor,
          managerName: c.managerName,
          europeanLeagueId,
          tuples: c.players,
        })
      );
    }
  };

  pushEuLeague(PORTUGAL_LEAGUE_2026, 'por_primeira', 'Portugal', 'POR');
  pushEuLeague(BELGIUM_LEAGUE_2026, 'bel_pro_league', 'Bélgica', 'BEL');
  pushEuLeague(NETHERLANDS_LEAGUE_2026, 'ned_eredivisie', 'Holanda', 'NED');
  pushEuLeague(TURKEY_LEAGUE_2026, 'tur_super_lig', 'Turquia', 'TUR');
  pushEuLeague(GREECE_LEAGUE_2026, 'gre_super_league', 'Grécia', 'GRE');
  pushEuLeague(SCOTLAND_LEAGUE_2026, 'sco_premiership', 'Escócia', 'SCO');
  pushEuLeague(NORWAY_LEAGUE_2026, 'nor_eliteserien', 'Noruega', 'NOR');
  pushEuLeague(SWITZERLAND_LEAGUE_2026, 'sui_super_league', 'Suíça', 'SUI');
  pushEuLeague(DENMARK_LEAGUE_2026, 'den_superliga', 'Dinamarca', 'DEN');
  pushEuLeague(SWEDEN_LEAGUE_2026, 'swe_allsvenskan', 'Suécia', 'SWE');
  pushEuLeague(SPECIAL_LEAGUE_1_2026, 'eu_special_1', 'Áustria', 'EUR');
  pushEuLeague(SPECIAL_LEAGUE_2_2026, 'eu_special_2', 'Ucrânia', 'EUR');
  pushEuLeague(CHAMPIONSHIP_LEAGUE_2026, 'eng_championship', 'Inglaterra', 'ENG');
  pushEuLeague(LEAGUE_ONE_2026, 'eng_league_one', 'Inglaterra', 'ENG');
  pushEuLeague(LEAGUE_TWO_2026, 'eng_league_two', 'Inglaterra', 'ENG');
  pushEuLeague(BUNDESLIGA2_LEAGUE_2026, 'ger_bundesliga2', 'Alemanha', 'GER');
  pushEuLeague(LIGUE2_LEAGUE_2026, 'fra_ligue2', 'França', 'FRA');
  pushEuLeague(LALIGA2_LEAGUE_2026, 'esp_laliga2', 'Espanha', 'ESP');
  pushEuLeague(SERIE_B_ITA_LEAGUE_2026, 'ita_serie_b', 'Itália', 'ITA');

  // 27 clubes espanhóis de divisões inferiores (Primera/Segunda Federación) exclusivos da Copa del Rey
  for (const c of SPAIN_COPA_EXTRA_2026) {
    euClubs.push(
      buildEuClub({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        country: 'Espanha',
        state: 'ESP',
        reputation: c.reputation,
        primaryColor: c.primaryColor,
        managerName: c.managerName,
        stadiumName: c.stadiumName,
        tuples: c.players,
        tag: 'esp3_26',
      })
    );
  }

  // 4 clubes italianos da Serie C exclusivos da Coppa Italia (Catânia, Potência, Ravenna, União Brescia)
  for (const c of ITALY_COPA_EXTRA_2026) {
    euClubs.push(
      buildEuClub({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        country: 'Itália',
        state: 'ITA',
        reputation: c.reputation,
        primaryColor: c.primaryColor,
        managerName: c.managerName,
        stadiumName: c.stadiumName,
        tuples: c.players,
        tag: 'ita3_26',
      })
    );
  }

  // 20 clubes franceses do Championnat National / N2 exclusivos da Coupe de France
  for (const c of FRANCE_COPA_EXTRA_2026) {
    euClubs.push(
      buildEuClub({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        country: 'França',
        state: 'FRA',
        reputation: c.reputation,
        primaryColor: c.primaryColor,
        managerName: c.managerName,
        stadiumName: c.stadiumName,
        tuples: c.players,
        tag: 'fra3_26',
      })
    );
  }

  return euClubs;
}

// === PUBLIC CLUB GENERATORS ===
let cachedReadonlyClubs: Club[] | null = null;

export function generateInitialClubs(): Club[] {
  const allRaw: Club[] = [
    ...BRAZIL_SERIES_A_B_C_META.map(buildNonEuClubFromMeta),
    ...BRAZIL_SERIE_D_META.map(buildNonEuClubFromMeta),
    ...BRAZIL_ESTADUAIS_EXTRA_META.map(buildNonEuClubFromMeta),
    ...SOUTH_AMERICA_CLUBS_META.map(buildNonEuClubFromMeta),
    ...WORLD_LEAGUES_CLUBS_META.map(buildNonEuClubFromMeta),
    ...buildAllEuropeanClubs(),
  ];

  // Defensive deduplication to guarantee zero duplicate club IDs
  const seen = new Set<string>();
  const uniqueClubs: Club[] = [];
  for (const club of allRaw) {
    if (seen.has(club.id)) continue;
    seen.add(club.id);
    uniqueClubs.push(club);
  }
  return uniqueClubs;
}

export function getBaseInitialClubsReadonly(): Club[] {
  if (!cachedReadonlyClubs) {
    cachedReadonlyClubs = generateInitialClubs();
  }
  return cachedReadonlyClubs;
}

// === LEAGUE SCHEDULE & STANDINGS ===
export function generateLeagueSchedule(
  clubIds: string[],
  competition: CompetitionType,
  seasonYear: number = 2026
): Fixture[] {
  if (clubIds.length < 2) return [];
  const teams = [...clubIds];
  if (teams.length % 2 !== 0) {
    teams.push('BYE');
  }

  const n = teams.length;
  const firstHalfRounds = n - 1;
  const matchesPerRound = n / 2;
  const fixtures: Fixture[] = [];

  const getScheduleSlotInfo = (roundNum: number): { date: string; time: string } => {
    if (competition === 'serie_b') {
      const info = getSerieBRoundDate(roundNum, seasonYear);
      return { date: info.date, time: info.time };
    }
    if (competition === 'serie_c') {
      const info = getSerieCRoundDate(roundNum, seasonYear);
      return { date: info.date, time: info.time };
    }
    const info = getRoundDate(roundNum, seasonYear);
    return { date: info.date, time: info.time };
  };

  // Turno (Rounds 1 .. N-1)
  const rotating = teams.slice(1);
  const fixed = teams[0];
  const turnoPairsByRound: Array<Array<[string, string]>> = [];

  for (let r = 0; r < firstHalfRounds; r++) {
    const roundPairs: Array<[string, string]> = [];
    const current = [fixed, ...rotating];

    for (let i = 0; i < matchesPerRound; i++) {
      const t1 = current[i];
      const t2 = current[n - 1 - i];
      if (t1 === 'BYE' || t2 === 'BYE') continue;

      const swap = (r + i) % 2 === 1;
      roundPairs.push(swap ? [t2, t1] : [t1, t2]);
    }

    turnoPairsByRound.push(roundPairs);

    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  const totalRounds = firstHalfRounds * 2;
  const minSeasonDate = getSeasonStartDate(seasonYear);
  const serieBPlayoffDates = competition === 'serie_b' ? getSerieBPlayoffDates(seasonYear) : null;
  const serieCPlayoffDates = competition === 'serie_c' ? getSerieCPlayoffDates(seasonYear) : null;
  const maxSeasonDate = serieCPlayoffDates
    ? serieCPlayoffDates.regularEndDate
    : serieBPlayoffDates
    ? serieBPlayoffDates.regularEndDate
    : `${seasonYear}-12-20`;
  const roundBaseSlots: Array<{ date: string; time: string }> = Array.from(
    { length: totalRounds },
    (_, idx) => getScheduleSlotInfo(idx + 1)
  );

  // Push Turno fixtures
  turnoPairsByRound.forEach((pairs, rIdx) => {
    const roundNum = rIdx + 1;
    const baseSlot = roundBaseSlots[roundNum - 1];
    const prevBase = roundNum > 1 ? roundBaseSlots[roundNum - 2]?.date : undefined;
    const nextBase = roundNum < totalRounds ? roundBaseSlots[roundNum]?.date : undefined;
    pairs.forEach(([homeId, awayId], mIdx) => {
      const slot = assignVariedMatchDaySlot(
        baseSlot.date,
        mIdx,
        roundNum,
        totalRounds,
        `${competition}_${seasonYear}`,
        {
          minDate: minSeasonDate,
          maxDate: maxSeasonDate,
          prevRoundBaseDate: prevBase,
          nextRoundBaseDate: nextBase,
          region: 'south_america',
          fallbackTime: baseSlot.time,
        }
      );
      fixtures.push({
        id: `${competition}_${seasonYear}_r${roundNum}_m${mIdx + 1}`,
        round: roundNum,
        date: slot.date,
        time: slot.time,
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeScore: null,
        awayScore: null,
        played: false,
        competition,
        events: [],
      });
    });
  });

  // Push Returno fixtures (inverted home/away)
  turnoPairsByRound.forEach((pairs, rIdx) => {
    const roundNum = firstHalfRounds + rIdx + 1;
    const baseSlot = roundBaseSlots[roundNum - 1];
    const prevBase = roundNum > 1 ? roundBaseSlots[roundNum - 2]?.date : undefined;
    const nextBase = roundNum < totalRounds ? roundBaseSlots[roundNum]?.date : undefined;
    pairs.forEach(([homeId, awayId], mIdx) => {
      const slot = assignVariedMatchDaySlot(
        baseSlot.date,
        mIdx,
        roundNum,
        totalRounds,
        `${competition}_${seasonYear}`,
        {
          minDate: minSeasonDate,
          maxDate: maxSeasonDate,
          prevRoundBaseDate: prevBase,
          nextRoundBaseDate: nextBase,
          region: 'south_america',
          fallbackTime: baseSlot.time,
        }
      );
      fixtures.push({
        id: `${competition}_${seasonYear}_r${roundNum}_m${mIdx + 1}`,
        round: roundNum,
        date: slot.date,
        time: slot.time,
        homeTeamId: awayId,
        awayTeamId: homeId,
        homeScore: null,
        awayScore: null,
        played: false,
        competition,
        events: [],
      });
    });
  });

  // Série C (24 clubes · 46 rodadas): Playoff de Acesso (4º x 7º e 5º x 6º Ida/Volta + Final Jogo Único em Novembro)
  if (competition === 'serie_c' && serieCPlayoffDates) {
    const semiIdaRound = totalRounds + 1;
    const semiVoltaRound = totalRounds + 2;
    const finalRound = totalRounds + 3;

    fixtures.push(
      {
        id: 'serie_c_playoff_semi1_ida',
        round: semiIdaRound,
        date: serieCPlayoffDates.semiIdaDate,
        time: '19:30',
        homeTeamId: 'TBD_SC_7TH',
        awayTeamId: 'TBD_SC_4TH',
        homeScore: null,
        awayScore: null,
        played: false,
        competition: 'serie_c',
        cupPhase: 'Playoff de Acesso - Semifinal (Ida)',
        leg: 1,
        events: [],
      },
      {
        id: 'serie_c_playoff_semi1_volta',
        round: semiVoltaRound,
        date: serieCPlayoffDates.semiVoltaDate,
        time: '16:00',
        homeTeamId: 'TBD_SC_4TH',
        awayTeamId: 'TBD_SC_7TH',
        homeScore: null,
        awayScore: null,
        played: false,
        competition: 'serie_c',
        cupPhase: 'Playoff de Acesso - Semifinal (Volta)',
        leg: 2,
        events: [],
      },
      {
        id: 'serie_c_playoff_semi2_ida',
        round: semiIdaRound,
        date: serieCPlayoffDates.semiIdaDate,
        time: '21:30',
        homeTeamId: 'TBD_SC_6TH',
        awayTeamId: 'TBD_SC_5TH',
        homeScore: null,
        awayScore: null,
        played: false,
        competition: 'serie_c',
        cupPhase: 'Playoff de Acesso - Semifinal (Ida)',
        leg: 1,
        events: [],
      },
      {
        id: 'serie_c_playoff_semi2_volta',
        round: semiVoltaRound,
        date: serieCPlayoffDates.semiVoltaDate,
        time: '18:30',
        homeTeamId: 'TBD_SC_5TH',
        awayTeamId: 'TBD_SC_6TH',
        homeScore: null,
        awayScore: null,
        played: false,
        competition: 'serie_c',
        cupPhase: 'Playoff de Acesso - Semifinal (Volta)',
        leg: 2,
        events: [],
      },
      {
        id: 'serie_c_playoff_final',
        round: finalRound,
        date: serieCPlayoffDates.finalDate,
        time: '16:00',
        homeTeamId: 'TBD_SC_WIN1',
        awayTeamId: 'TBD_SC_WIN2',
        homeScore: null,
        awayScore: null,
        played: false,
        competition: 'serie_c',
        cupPhase: 'Playoff de Acesso - Final (Jogo Único)',
        events: [],
      }
    );
  }

  // Série B (20 clubes · 38 rodadas): Playoff de Acesso (3º x 6º e 4º x 5º em Ida e Volta; os 2 vencedores sobem à Série A)
  if (competition === 'serie_b') {
    fixtures.push(...buildSerieBPlayoffFixtures(seasonYear, totalRounds));
  }

  return fixtures;
}

/**
 * Gera os 4 confrontos do Playoff de Acesso da Série B (3º x 6º e 4º x 5º em jogos de ida e volta).
 * Melhor campanha (3º e 4º) decide o jogo de volta em casa. Os 2 vencedores sobem à Série A.
 */
export function buildSerieBPlayoffFixtures(
  seasonYear: number,
  regularTotalRounds: number = 38
): Fixture[] {
  const dates = getSerieBPlayoffDates(seasonYear);
  const idaRound = regularTotalRounds + 1;
  const voltaRound = regularTotalRounds + 2;

  return [
    {
      id: 'serie_b_playoff_1_ida',
      round: idaRound,
      date: dates.playoffIdaDate,
      time: '19:30',
      homeTeamId: 'TBD_SB_6TH',
      awayTeamId: 'TBD_SB_3RD',
      homeScore: null,
      awayScore: null,
      played: false,
      competition: 'serie_b',
      cupPhase: 'Playoff de Acesso · 3º x 6º',
      leg: 1,
      events: [],
    },
    {
      id: 'serie_b_playoff_1_volta',
      round: voltaRound,
      date: dates.playoffVoltaDate,
      time: '16:00',
      homeTeamId: 'TBD_SB_3RD',
      awayTeamId: 'TBD_SB_6TH',
      homeScore: null,
      awayScore: null,
      played: false,
      competition: 'serie_b',
      cupPhase: 'Playoff de Acesso · 3º x 6º',
      leg: 2,
      events: [],
    },
    {
      id: 'serie_b_playoff_2_ida',
      round: idaRound,
      date: dates.playoffIdaDate,
      time: '21:30',
      homeTeamId: 'TBD_SB_5TH',
      awayTeamId: 'TBD_SB_4TH',
      homeScore: null,
      awayScore: null,
      played: false,
      competition: 'serie_b',
      cupPhase: 'Playoff de Acesso · 4º x 5º',
      leg: 1,
      events: [],
    },
    {
      id: 'serie_b_playoff_2_volta',
      round: voltaRound,
      date: dates.playoffVoltaDate,
      time: '18:30',
      homeTeamId: 'TBD_SB_4TH',
      awayTeamId: 'TBD_SB_5TH',
      homeScore: null,
      awayScore: null,
      played: false,
      competition: 'serie_b',
      cupPhase: 'Playoff de Acesso · 4º x 5º',
      leg: 2,
      events: [],
    },
  ];
}

export function generateInitialStandings(clubIds: string[]): Standing[] {
  return clubIds.map((teamId) => ({
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
  }));
}

export function generateFreeAgents(): Player[] {
  return FREE_AGENTS_2026_SPECS.map(([name, role, ovr, age, nat], idx) => {
    const targetDiv: Division = ovr >= 76 ? 'A' : ovr >= 70 ? 'B' : ovr >= 62 ? 'C' : 'EST';
    return createPlayer(
      `fa_2026_v2_${idx + 1}`,
      name,
      role,
      ovr,
      age,
      10 + (idx % 30),
      false,
      false,
      '',
      nat,
      nat,
      { division: targetDiv, country: nat }
    );
  });
}

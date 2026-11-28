import { Club, Division, Fixture, Morale, Player } from '../types/game';
import { EconomyTierId, getClubEconomyProfile } from './clubEconomyScale';
import { SOUTH_AMERICA_SECTOR_TARGETS } from '../data/southAmericaSectorTargets';
import { EUROPE_SECTOR_TARGETS } from '../data/europeSectorTargets';
import { WORLD_LEAGUES_SECTOR_TARGETS } from '../data/worldLeaguesData';
import {
  getSectorBucketFromRole,
  PlayerSlotFitEvaluation,
  resolveClubLineupTacticalReport,
} from './tacticalPositioningEngine';

export const CURRENT_RATINGS_VERSION = 2;
export const AI_OVERALL_CACHE_STORAGE_KEY = 'patofoot_ai_overalls_v1';

export interface ClubSectorRatings {
  overall: number;
  defense: number;
  midfield: number;
  attack: number;
  rawOverall: number;
  rawDefense: number;
  rawMidfield: number;
  rawAttack: number;
  deltaOverall: number;
  deltaDefense: number;
  deltaMidfield: number;
  deltaAttack: number;
  positionalPenaltyPoints?: number;
  wrongPositionCount?: number;
  adaptedCount?: number;
}

export interface ClubTargetSectorProfile {
  def: number;
  mei: number;
  ata: number;
}

/**
 * Perfis reais calibrados por setor (DEF, MEI, ATA) para clubes brasileiros e sul-americanos (Temporada 2026).
 * Escala realista inspirada em EA FC / Football Manager:
 * - Série A: ~73 a 84
 * - Série B: ~66 a 73
 * - Série C: ~60 a 66
 * - Série D: ~53 a 60
 * - América do Sul (Libertadores/Sul-Americana): ~71 a 82
 */
export const REAL_CLUB_SECTOR_TARGETS: Record<string, ClubTargetSectorProfile> = {
  // === SÉRIE A (73 - 84) ===
  fla: { def: 82, mei: 84, ata: 84 },
  pal: { def: 83, mei: 82, ata: 84 },
  bot: { def: 81, mei: 81, ata: 83 },
  cam: { def: 78, mei: 79, ata: 82 },
  int: { def: 79, mei: 81, ata: 80 },
  sao: { def: 79, mei: 79, ata: 80 },
  cor: { def: 77, mei: 79, ata: 81 },
  cru: { def: 78, mei: 80, ata: 79 },
  bah: { def: 77, mei: 80, ata: 78 },
  flu: { def: 78, mei: 78, ata: 78 },
  gre: { def: 76, mei: 77, ata: 78 },
  vas: { def: 75, mei: 77, ata: 78 },
  san: { def: 75, mei: 77, ata: 79 },
  rbb: { def: 76, mei: 76, ata: 76 },
  cap: { def: 76, mei: 76, ata: 76 },
  vit: { def: 74, mei: 74, ata: 75 },
  cfc: { def: 74, mei: 74, ata: 74 },
  mir: { def: 74, mei: 74, ata: 73 },
  cha: { def: 73, mei: 73, ata: 73 },
  rem: { def: 72, mei: 73, ata: 73 },

  // === SÉRIE B (66 - 73) ===
  for: { def: 73, mei: 73, ata: 74 },
  cea: { def: 71, mei: 72, ata: 72 },
  spo: { def: 71, mei: 72, ata: 72 },
  juv: { def: 71, mei: 71, ata: 71 },
  ame: { def: 70, mei: 71, ata: 70 },
  goi: { def: 71, mei: 70, ata: 70 },
  cui: { def: 71, mei: 70, ata: 70 },
  cri: { def: 70, mei: 70, ata: 70 },
  acg: { def: 69, mei: 70, ata: 70 },
  nov: { def: 70, mei: 70, ata: 69 },
  ava: { def: 69, mei: 69, ata: 69 },
  vil: { def: 69, mei: 69, ata: 68 },
  crb: { def: 68, mei: 68, ata: 69 },
  ope: { def: 69, mei: 68, ata: 67 },
  pon: { def: 68, mei: 68, ata: 68 },
  nau: { def: 67, mei: 68, ata: 68 },
  lon: { def: 67, mei: 67, ata: 67 },
  bsp: { def: 67, mei: 67, ata: 66 },
  sbe: { def: 67, mei: 66, ata: 66 },
  ath: { def: 66, mei: 66, ata: 67 },

  // === SÉRIE C (60 - 66) ===
  pay: { def: 65, mei: 65, ata: 66 },
  gua: { def: 65, mei: 65, ata: 65 },
  fig: { def: 64, mei: 65, ata: 64 },
  ama: { def: 64, mei: 64, ata: 65 },
  stc: { def: 63, mei: 64, ata: 65 },
  vre: { def: 64, mei: 64, ata: 64 },
  afe: { def: 64, mei: 64, ata: 63 },
  itu: { def: 63, mei: 63, ata: 63 },
  bru: { def: 63, mei: 63, ata: 62 },
  cax: { def: 63, mei: 62, ata: 62 },
  ypi: { def: 62, mei: 62, ata: 62 },
  mga: { def: 62, mei: 62, ata: 63 },
  bpb: { def: 62, mei: 62, ata: 62 },
  con: { def: 61, mei: 61, ata: 62 },
  lim: { def: 61, mei: 61, ata: 61 },
  flo: { def: 61, mei: 60, ata: 60 },
  ana: { def: 60, mei: 61, ata: 60 },
  ita: { def: 60, mei: 60, ata: 61 },
  mar: { def: 60, mei: 60, ata: 60 },
  bar: { def: 60, mei: 60, ata: 60 },

  // === SÉRIE D DESTAQUES (54 - 60) ===
  ret: { def: 60, mei: 60, ata: 60 },
  csa: { def: 59, mei: 60, ata: 60 },
  abc: { def: 59, mei: 59, ata: 59 },
  arn: { def: 59, mei: 59, ata: 59 },
  sam: { def: 59, mei: 59, ata: 59 },
  fer: { def: 58, mei: 59, ata: 59 },
  por: { def: 59, mei: 59, ata: 59 },
  man: { def: 58, mei: 58, ata: 59 },
  trz: { def: 58, mei: 58, ata: 58 },
  sou: { def: 58, mei: 57, ata: 58 },
  cmp: { def: 57, mei: 58, ata: 58 },
  asa: { def: 58, mei: 57, ata: 58 },
  bsb: { def: 58, mei: 58, ata: 59 },

  // === AMÉRICA DO SUL (71 - 82) ===
  riv: { def: 81, mei: 82, ata: 82 },
  boc: { def: 79, mei: 80, ata: 81 },
  rac: { def: 78, mei: 79, ata: 80 },
  pen: { def: 77, mei: 77, ata: 78 },
  nac: { def: 76, mei: 77, ata: 77 },
  idv: { def: 76, mei: 78, ata: 77 },
  ldu: { def: 76, mei: 76, ata: 77 },
  est: { def: 77, mei: 77, ata: 76 },
  vel: { def: 77, mei: 77, ata: 77 },
  slo: { def: 75, mei: 75, ata: 75 },
  ind: { def: 75, mei: 75, ata: 75 },
  col: { def: 75, mei: 76, ata: 76 },
  atn: { def: 75, mei: 76, ata: 76 },
  oli: { def: 74, mei: 75, ata: 75 },
  cer: { def: 74, mei: 74, ata: 75 },
  lib: { def: 74, mei: 75, ata: 75 },
  bol: { def: 73, mei: 75, ata: 76 },
  ...SOUTH_AMERICA_SECTOR_TARGETS,
  ...EUROPE_SECTOR_TARGETS,
  ...WORLD_LEAGUES_SECTOR_TARGETS,
};

/**
 * Overalls reais de referência (2026) para craques conhecidos do futebol brasileiro e sul-americano,
 * garantindo realismo imediato mesmo antes da sincronização em segundo plano com Gemini IA.
 */
const REAL_PLAYER_OVERALL_REFERENCE: Record<string, number> = {
  // Flamengo (Elenco 27 Jogadores)
  'pedro': 86,
  'de arrascaeta': 86,
  'giorgian de arrascaeta': 86,
  'arrascaeta': 86,
  'lucas paqueta': 85,
  'leo ortiz': 84,
  'rossi': 83,
  'agustin rossi': 83,
  'jorginho': 83,
  'de la cruz': 83,
  'nicolas de la cruz': 83,
  'samuel lino': 83,
  'saul': 82,
  'saul niguez': 82,
  'leo pereira': 82,
  'vitao': 82,
  'vitão': 82,
  'alex sandro': 81,
  'luiz araujo': 81,
  'gonzalo plata': 81,
  'emerson royal': 80,
  'danilo': 80,
  'ayrton lucas': 80,
  'bruno henrique': 80,
  'jorge carrascal': 80,
  'varela': 79,
  'guillermo varela': 79,
  'erick pulgar': 82,
  'andrew': 77,
  'evertton araujo': 76,
  'anthony valencia': 75,
  'joao victor': 73,
  'joaquin freitas': 73,
  'dyogo alves': 72,
  'gerson': 84,
  'fabricio bruno': 80,
  'everton cebolinha': 80,
  'michael': 78,

  // Palmeiras (Elenco 25 Jogadores)
  'gustavo gomez': 85,
  'jhon arias': 85,
  'andreas pereira': 84,
  'paulinho': 84,
  'vitor roque': 84,
  'joaquin piquerez': 83,
  'piquerez': 83,
  'alexander barboza': 82,
  'marlon freitas': 82,
  'murilo': 82,
  'mauricio': 82,
  'flaco lopez': 82,
  'carlos miguel': 81,
  'felipe anderson': 81,
  'ramon sosa': 81,
  'agustin giay': 80,
  'bruno fuchs': 79,
  'khellven': 79,
  'lucas evangelista': 79,
  'jefte': 77,
  'marcelo lomba': 75,
  'benedetti': 74,
  'bruno bertinato': 73,
  'larson': 73,
  'arthur': 73,
  'estevao': 84,
  'raphael veiga': 84,
  'weverton': 82,
  'anibal moreno': 81,
  'richard rios': 81,
  'facundo torres': 79,

  // Botafogo
  'luiz henrique': 84,
  'igor jesus': 82,
  'jefferson savarino': 82,
  'savarino': 82,
  'thiago almada': 83,
  'bastos': 81,
  'john': 81,
  'gregore': 81,
  'alex telles': 80,
  'jair cunha': 79,
  'vitinho': 79,

  // Corinthians, São Paulo, Santos, Atlético-MG, Cruzeiro, Inter, Grêmio, Fluminense, Vasco, Bahia
  'memphis depay': 83,
  'rodrigo garro': 83,
  'yuri alberto': 81,
  'hugo souza': 80,
  'andre ramalho': 79,
  'breno bidon': 77,
  'lucas moura': 82,
  'oscar': 81,
  'jonathan calleri': 80,
  'calleri': 80,
  'luciano': 79,
  'arboleda': 80,
  'rafael': 79,
  'alisson': 79,
  'pablo maia': 79,
  'neymar': 85,
  'neymar jr': 85,
  'guilherme': 77,
  'joao schmidt': 76,
  'gabriel brazao': 77,
  'soteldo': 78,
  'hulk': 84,
  'guilherme arana': 82,
  'everson': 80,
  'gustavo scarpa': 81,
  'junior alonso': 80,
  'rony': 78,
  'matheus pereira': 83,
  'cassio': 79,
  'kaio jorge': 78,
  'gabigol': 81,
  'gabriel barbosa': 81,
  'dudu': 79,
  'fabricio bruno (cru)': 80,
  'alan patrick': 83,
  'rafael borre': 81,
  'borre': 81,
  'enner valencia': 80,
  'sergio rochet': 81,
  'rochet': 81,
  'clayton sampaio': 79,
  'wesley': 79,
  'martin braithwaite': 79,
  'braithwaite': 79,
  'cristaldo': 79,
  'villasanti': 80,
  'marchesin': 78,
  'thiago silva': 82,
  'fabio': 80,
  'ph ganso': 78,
  'ganso': 78,
  'german cano': 79,
  'cano': 79,
  'pablo vegetti': 80,
  'vegetti': 80,
  'philippe coutinho': 79,
  'leo jardim': 80,
  'lucas piton': 79,
  'everton ribeiro': 80,
  'jean lucas': 79,
  'cauly': 79,
  'luciano juba': 78,
  'erick': 78,

  // Sul-Americanos
  'edinson cavani': 80,
  'miguel borja': 81,
  'franco armani': 80,
  'german pezzella': 81,
  'marcos acuna': 81,
  'franco mastantuono': 78,
  'juanfer quintero': 80,
  'adrian martinez': 80,
  'leonardo fernandez': 80,
};

function normalizePlayerLookupKey(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .trim();
}

function deterministicHash(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function getCachedAiOverallMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(AI_OVERALL_CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, number>;
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

export function saveCachedAiOverallMap(entries: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCachedAiOverallMap();
    const merged = { ...existing, ...entries };
    window.localStorage.setItem(AI_OVERALL_CACHE_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage errors
  }
}

export function makeAiOverallLookupKey(clubId: string, playerName: string): string {
  return `${clubId.toLowerCase()}::${normalizePlayerLookupKey(playerName)}`;
}

/**
 * Retorna a faixa-alvo realista de setores (DEF, MEI, ATA) de um clube,
 * levando em conta sua divisão, reputação e identidade histórica.
 */
export function getBaselineClubSectorTarget(
  club: Pick<Club, 'id' | 'division' | 'reputation' | 'europeanLeagueId'>
): ClubTargetSectorProfile {
  const known = REAL_CLUB_SECTOR_TARGETS[club.id];
  if (known) return known;

  const h = deterministicHash(club.id);
  const defBias = (h % 3) - 1; // -1, 0, +1
  const meiBias = ((h >> 3) % 3) - 1;
  const ataBias = ((h >> 6) % 3) - 1;

  let base = 60;
  if (club.division === 'A') {
    base = club.reputation >= 5 ? 81 : club.reputation === 4 ? 78 : 74;
  } else if (club.division === 'B') {
    base = club.reputation >= 4 ? 72 : club.reputation === 3 ? 69 : 67;
  } else if (club.division === 'C') {
    base = club.reputation >= 3 ? 64 : 61;
  } else if (club.division === 'D') {
    base = club.reputation >= 2 ? 58 : 55;
  } else if (club.division === 'EST') {
    base = club.reputation >= 2 ? 56 : 53;
  } else if (club.division === 'SA') {
    base = club.reputation >= 5 ? 80 : club.reputation === 4 ? 75 : club.reputation === 3 ? 70 : 65;
  } else if (club.division === 'EU') {
    if (
      club.id.startsWith('eu_esp3_') ||
      club.id.startsWith('eu_ita3_') ||
      club.id.startsWith('eu_fra3_')
    ) {
      base = club.reputation >= 3 ? 66 : 62;
    } else if (club.europeanLeagueId === 'eng_league_two') {
      base = club.reputation >= 2 ? 60 : 57;
    } else if (club.europeanLeagueId === 'eng_league_one') {
      base = club.reputation >= 3 ? 67 : 63;
    } else if (
      club.europeanLeagueId === 'eng_championship' ||
      club.europeanLeagueId === 'ger_bundesliga2' ||
      club.europeanLeagueId === 'fra_ligue2' ||
      club.europeanLeagueId === 'esp_laliga2' ||
      club.europeanLeagueId === 'ita_serie_b'
    ) {
      base = club.reputation >= 4 ? 75 : 71;
    } else {
      base = club.reputation >= 5 ? 86 : club.reputation === 4 ? 79 : club.reputation === 3 ? 74 : 70;
    }
  } else if (club.division === 'WL') {
    base = club.reputation >= 5 ? 82 : club.reputation === 4 ? 77 : club.reputation === 3 ? 72 : 69;
  }

  return {
    def: Math.max(50, Math.min(91, base + defBias)),
    mei: Math.max(50, Math.min(91, base + meiBias)),
    ata: Math.max(50, Math.min(92, base + ataBias)),
  };
}

/**
 * Recalcula valor de mercado e salário mensal de forma contínua e coerente com Overall,
 * idade e prateleira econômica da divisão (evitando folha inflada na Série D / Estadual / Série C).
 */
export function recalculatePlayerEconomics(
  overall: number,
  age: number,
  division?: Division,
  clubContext?: {
    id?: string;
    division?: Division;
    reputation?: number;
    country?: string;
    europeanLeagueId?: Club['europeanLeagueId'];
    southAmericanLeagueId?: Club['southAmericanLeagueId'];
    worldLeagueId?: Club['worldLeagueId'];
  }
): { marketValue: number; wage: number } {
  const clampedOvr = Math.max(46, Math.min(94, Math.round(overall)));
  const ageValueFactor =
    age <= 21 ? 1.32 : age <= 25 ? 1.24 : age <= 29 ? 1.12 : age <= 32 ? 0.82 : 0.52;
  const ageWageFactor =
    age <= 20 ? 0.8 : age <= 24 ? 0.95 : age <= 30 ? 1.08 : age <= 33 ? 0.95 : 0.78;

  const resolvedDiv = clubContext?.division || division;
  const resolvedTier = clubContext
    ? getClubEconomyProfile({ ...clubContext, division: resolvedDiv })
    : getClubEconomyProfile({ division: resolvedDiv });

  const divValueMod =
    resolvedTier.tierId === 'EST'
      ? 0.58
      : resolvedTier.tierId === 'BR_D'
      ? 0.72
      : resolvedTier.tierId === 'BR_C' || resolvedTier.tierId === 'EU_4'
      ? 0.84
      : resolvedTier.tierId === 'TIER_LOWER_PRO'
      ? 0.88
      : resolvedTier.tierId === 'BR_B' || resolvedTier.tierId === 'EU_3' || resolvedTier.tierId === 'SA_MID'
      ? 0.94
      : resolvedTier.tierId === 'EU_TOP5' || resolvedTier.tierId === 'WL_ELITE'
      ? 1.08
      : 1.0;

  const rawValue =
    35_000 * Math.pow(1.23, Math.max(0, clampedOvr - 48)) * ageValueFactor * divValueMod;
  const roundStep = rawValue < 200_000 ? 10_000 : rawValue < 2_000_000 ? 50_000 : 100_000;
  const marketValue = Math.max(
    resolvedTier.playerValueFloor,
    Math.round(rawValue / roundStep) * roundStep
  );

  const defaultRepByTier: Record<EconomyTierId, number> = {
    EST: 1,
    BR_D: 2,
    BR_C: 2,
    EU_4: 2,
    TIER_LOWER_PRO: 2,
    BR_B: 3,
    EU_3: 3,
    SA_MID: 3,
    SA_TOP: 4,
    WL_HIGH: 3,
    EU_2: 3,
    BR_A: 4,
    EU_TOP5: 5,
    WL_ELITE: 4,
  };
  const resolvedRep = Math.max(
    1,
    Math.min(5, clubContext?.reputation ?? defaultRepByTier[resolvedTier.tierId] ?? 3)
  );
  const repWageFactor =
    resolvedRep <= 1
      ? 0.85
      : resolvedRep === 2
      ? 0.94
      : resolvedRep === 3
      ? 1.02
      : resolvedRep === 4
      ? 1.1
      : 1.18;

  const rawWage =
    1_150 *
    Math.pow(1.168, Math.max(0, clampedOvr - 45)) *
    ageWageFactor *
    resolvedTier.playerWageScale *
    repWageFactor;
  const wageStep = rawWage < 6_000 ? 200 : rawWage < 20_000 ? 500 : 1_000;
  const wage = Math.max(
    resolvedTier.playerWageFloor,
    Math.round(rawWage / wageStep) * wageStep
  );

  return { marketValue, wage };
}

export function computeRealisticPotential(overall: number, age: number, division?: Division): number {
  const cap = division === 'EST' ? 76 : division === 'D' ? 79 : division === 'C' ? 83 : 94;
  if (age <= 19) return Math.min(cap, overall + 9);
  if (age <= 22) return Math.min(cap, overall + 6);
  if (age <= 25) return Math.min(cap, overall + 4);
  if (age <= 28) return Math.min(cap, overall + 2);
  return overall;
}

function getPlayerSectorBucket(player: Player): 'DEF' | 'MEI' | 'ATA' {
  if (player.detailedRole === 'GOL' || player.detailedRole === 'ZAG' || player.detailedRole === 'LAT') {
    return 'DEF';
  }
  if (player.detailedRole === 'VOL' || player.detailedRole === 'MEI') {
    return 'MEI';
  }
  if (player.detailedRole === 'ATA') {
    return 'ATA';
  }
  if (player.position === 'GK' || player.position === 'DF') return 'DEF';
  if (player.position === 'MF') return 'MEI';
  return 'ATA';
}

function getMoraleBonus(morale?: Morale): number {
  switch (morale) {
    case 'Excelente':
      return 1.0;
    case 'Boa':
      return 0.4;
    case 'Baixa':
      return -0.8;
    case 'Péssima':
      return -1.6;
    default:
      return 0;
  }
}

/**
 * Calcula os níveis reais de Defesa (DEF), Meio (MEI), Ataque (ATA) e Geral (OVR) de um clube.
 * - `matchReady: false` (padrão para telas de elenco, explorador e seleção): mede a força estrutural dos 11 titulares.
 * - `matchReady: true` (usado na simulação de jogo): pondera condição física e moral atuais dos titulares!
 */
export function getClubSectorRatings(
  club: Club,
  options?: { matchReady?: boolean }
): ClubSectorRatings {
  const matchReady = Boolean(options?.matchReady);
  const squad = club.squad || [];
  if (squad.length === 0) {
    return {
      overall: 55,
      defense: 55,
      midfield: 55,
      attack: 55,
      rawOverall: 55,
      rawDefense: 55,
      rawMidfield: 55,
      rawAttack: 55,
      deltaOverall: 0,
      deltaDefense: 0,
      deltaMidfield: 0,
      deltaAttack: 0,
    };
  }

  const starters = squad.filter((p) => p.isStarter);
  const usingStarterLineup = starters.length >= 8;
  const activePool = usingStarterLineup
    ? starters
    : [...squad].sort((a, b) => b.overall - a.overall).slice(0, Math.min(11, squad.length));

  const tacticalReport = usingStarterLineup ? resolveClubLineupTacticalReport(club) : null;

  const getPlayerFit = (p: Player): PlayerSlotFitEvaluation | null => {
    if (!tacticalReport) return null;
    return tacticalReport.assignmentByPlayerId.get(p.id)?.fit || null;
  };

  const effectiveRating = (p: Player): number => {
    const fit = getPlayerFit(p);
    const tacticalBaseOverall = fit ? fit.effectiveOverall : p.overall;
    if (!matchReady) return tacticalBaseOverall;
    const condFactor = 0.86 + (Math.max(30, Math.min(100, p.condition ?? 100)) / 100) * 0.14;
    return tacticalBaseOverall * condFactor + getMoraleBonus(p.morale);
  };

  let defWeightedSum = 0;
  let defWeightTotal = 0;
  let meiWeightedSum = 0;
  let meiWeightTotal = 0;
  let ataWeightedSum = 0;
  let ataWeightTotal = 0;

  activePool.forEach((p) => {
    const fit = getPlayerFit(p);
    const val = effectiveRating(p);
    const activeRole = fit ? fit.assignedRole : p.detailedRole;
    const bucket = fit ? getSectorBucketFromRole(activeRole) : getPlayerSectorBucket(p);
    if (bucket === 'DEF') {
      const w = activeRole === 'GOL' ? 1.25 : activeRole === 'ZAG' ? 1.1 : 0.95;
      defWeightedSum += val * w;
      defWeightTotal += w;
    } else if (bucket === 'MEI') {
      const w = activeRole === 'MEI' ? 1.08 : 1.0;
      meiWeightedSum += val * w;
      meiWeightTotal += w;
    } else {
      const w = 1.12;
      ataWeightedSum += val * w;
      ataWeightTotal += w;
    }
  });

  // Fallback caso uma escalação improvisada não tenha alguém em um setor
  const avgAll =
    activePool.reduce((acc, p) => acc + effectiveRating(p), 0) / Math.max(1, activePool.length);

  const rawDefense = defWeightTotal > 0 ? defWeightedSum / defWeightTotal : avgAll - 3;
  const rawMidfield = meiWeightTotal > 0 ? meiWeightedSum / meiWeightTotal : avgAll - 3;
  const rawAttack = ataWeightTotal > 0 ? ataWeightedSum / ataWeightTotal : avgAll - 3;
  const rawOverall = rawDefense * 0.34 + rawMidfield * 0.33 + rawAttack * 0.33;

  const defense = Math.round(rawDefense);
  const midfield = Math.round(rawMidfield);
  const attack = Math.round(rawAttack);
  const overall = Math.round(rawOverall);

  const baseline = club.seasonStartSectorRatings;

  return {
    overall,
    defense,
    midfield,
    attack,
    rawOverall,
    rawDefense,
    rawMidfield,
    rawAttack,
    deltaOverall: baseline ? overall - baseline.overall : 0,
    deltaDefense: baseline ? defense - baseline.defense : 0,
    deltaMidfield: baseline ? midfield - baseline.midfield : 0,
    deltaAttack: baseline ? attack - baseline.attack : 0,
    positionalPenaltyPoints: tacticalReport?.totalPenaltyPoints ?? 0,
    wrongPositionCount: tacticalReport
      ? tacticalReport.wrongPositionCount + tacticalReport.criticalCount
      : 0,
    adaptedCount: tacticalReport?.adaptedCount ?? 0,
  };
}

/**
 * Calibra o elenco de um clube para refletir fielmente a hierarquia das divisões (Série A > B > C > D)
 * e os perfis reais de Defesa, Meio e Ataque, preservando destaques reais e cache da IA Gemini.
 */
export function calibrateClubSquadRealism(
  club: Club,
  aiCacheOverride?: Record<string, number>
): Club {
  // Preserve exact overalls and market values for official Série A / B / C / Ecuador / Colombia 2026 curated squads
  if (
    club.squad.some(
      (p) =>
        p.id.includes('_sa26_') ||
        p.id.includes('_sb26_') ||
        p.id.includes('_sc26_') ||
        p.id.includes('_pot26_') ||
        p.id.includes('_equ26_') ||
        p.id.includes('_col26_') ||
        p.id.includes('_uru26_') ||
        p.id.includes('_chi26_') ||
        p.id.includes('_par26_') ||
        p.id.includes('_per26_') ||
        p.id.includes('_bol26_') ||
        p.id.includes('_ven26_') ||
        p.id.includes('_arg26_') ||
        p.id.includes('_sau26_') ||
        p.id.includes('_mex26_') ||
        p.id.includes('_epl26_')
    )
  ) {
    const sectors = getClubSectorRatings(club);
    return {
      ...club,
      seasonStartSectorRatings: club.seasonStartSectorRatings || {
        overall: sectors.overall,
        defense: sectors.defense,
        midfield: sectors.midfield,
        attack: sectors.attack,
      },
    };
  }

  const aiMap = aiCacheOverride ?? getCachedAiOverallMap();
  const target = getBaselineClubSectorTarget(club);

  // Ordena ou identifica titulares por setor para calibrar titulares vs reservas de modo natural
  const calibratedSquad = club.squad.map((player, idx) => {
    const aiKey = makeAiOverallLookupKey(club.id, player.name);
    const normName = normalizePlayerLookupKey(player.name);

    const isGenericGenerated =
      player.id.includes('_gen_') ||
      player.id.includes('_depth_') ||
      player.id.includes('_p_') ||
      player.id.includes('regen_');

    const cachedAiOvr = aiMap[aiKey];
    const canApplyRealRef =
      !isGenericGenerated &&
      (club.division === 'A' ||
        club.division === 'B' ||
        club.division === 'SA' ||
        (club.division === 'EU' && club.reputation >= 3) ||
        (club.division === 'WL' && club.reputation >= 3));
    const refRealOvr = canApplyRealRef
      ? club.id === 'fla' && normName === 'erick'
        ? 82
        : club.id === 'pal' && normName === 'emiliano martinez'
        ? 80
        : REAL_PLAYER_OVERALL_REFERENCE[normName]
      : undefined;
    const bucket = getPlayerSectorBucket(player);
    const sectorTarget =
      bucket === 'DEF' ? target.def : bucket === 'MEI' ? target.mei : target.ata;

    let newOverall = player.overall;

    if (typeof cachedAiOvr === 'number' && cachedAiOvr >= 45 && cachedAiOvr <= 95) {
      newOverall = Math.round(cachedAiOvr);
    } else if (typeof refRealOvr === 'number') {
      newOverall = refRealOvr;
    } else {
      const seed = deterministicHash(`${club.id}_${player.id}_${player.name}`);
      const spread = (seed % 5) - 2; // -2 a +2
      const starterOffset = player.isStarter ? 0 : player.isSubstitute ? -3 : -5;
      const computedTarget = sectorTarget + starterOffset + spread;

      if (isGenericGenerated) {
        newOverall = computedTarget;
      } else if (club.division === 'EU' || club.division === 'WL') {
        newOverall = Math.round(player.overall * 0.86 + computedTarget * 0.14);
      } else {
        // Jogador real sem entrada explícita na tabela: aproxima suavemente da faixa real do setor do clube
        newOverall = Math.round(player.overall * 0.45 + computedTarget * 0.55);
      }
    }

    // Limites realistas por divisão para evitar distorções absurdas no início
    const minDiv =
      club.division === 'EU'
        ? club.id.startsWith('eu_esp3_') ||
          club.id.startsWith('eu_ita3_') ||
          club.id.startsWith('eu_fra3_')
          ? 56
          : club.europeanLeagueId === 'eng_league_two'
          ? 52
          : club.europeanLeagueId === 'eng_league_one'
          ? 57
          : club.europeanLeagueId === 'eng_championship' ||
            club.europeanLeagueId === 'ger_bundesliga2' ||
            club.europeanLeagueId === 'fra_ligue2' ||
            club.europeanLeagueId === 'esp_laliga2' ||
            club.europeanLeagueId === 'ita_serie_b'
          ? 63
          : 66
        : club.division === 'WL'
        ? 63
        : club.division === 'A'
        ? 65
        : club.division === 'SA'
        ? 64
        : club.division === 'B'
        ? 59
        : club.division === 'C'
        ? 53
        : 48;
    const canBypassDivCap =
      typeof cachedAiOvr === 'number' ||
      (typeof refRealOvr === 'number' &&
        (club.division === 'A' ||
          club.division === 'SA' ||
          club.division === 'EU' ||
          club.division === 'WL'));
    const maxDiv =
      canBypassDivCap
        ? 94
        : club.division === 'EU'
        ? club.id.startsWith('eu_esp3_') ||
          club.id.startsWith('eu_ita3_') ||
          club.id.startsWith('eu_fra3_')
          ? 73
          : club.europeanLeagueId === 'eng_league_two'
          ? 68
          : club.europeanLeagueId === 'eng_league_one'
          ? 74
          : club.europeanLeagueId === 'eng_championship' ||
            club.europeanLeagueId === 'ger_bundesliga2' ||
            club.europeanLeagueId === 'fra_ligue2' ||
            club.europeanLeagueId === 'esp_laliga2' ||
            club.europeanLeagueId === 'ita_serie_b'
          ? 81
          : 93
        : club.division === 'WL'
        ? 90
        : club.division === 'A'
        ? 85
        : club.division === 'SA'
        ? 84
        : club.division === 'B'
        ? 76
        : club.division === 'C'
        ? 69
        : 63;

    newOverall = Math.max(minDiv, Math.min(maxDiv, newOverall));

    const econ = recalculatePlayerEconomics(newOverall, player.age, club.division, club);
    const potential = Math.max(
      newOverall,
      computeRealisticPotential(newOverall, player.age, club.division)
    );

    return {
      ...player,
      overall: newOverall,
      seasonStartOverall: newOverall,
      potential,
      marketValue: econ.marketValue,
      wage: econ.wage,
      regressionProgress: player.regressionProgress ?? 0,
      trainingProgress: player.trainingProgress ?? ((idx * 13) % 45),
    };
  });

  const tempClub: Club = {
    ...club,
    squad: calibratedSquad,
  };
  const sectors = getClubSectorRatings(tempClub);

  return {
    ...tempClub,
    seasonStartSectorRatings: {
      overall: sectors.overall,
      defense: sectors.defense,
      midfield: sectors.midfield,
      attack: sectors.attack,
    },
  };
}

export function calibrateAllClubsRealism(clubs: Club[]): Club[] {
  const aiMap = getCachedAiOverallMap();
  return clubs.map((club) => calibrateClubSquadRealism(club, aiMap));
}

/**
 * Evolução e regressão dinâmica de um jogador do CLUBE DO USUÁRIO após uma partida,
 * baseada em desempenho real (nota da partida, média na temporada, gols, assistências, saldo defensivo),
 * idade (curva de desenvolvimento/declínio) e sequência de jogos disputados.
 */
export function applyUserPlayerPostMatchDynamicRating(
  player: Player,
  params: {
    participated: boolean;
    matchRating: number;
    goalsScoredByPlayer: number;
    assistsByPlayer: number;
    teamGoalsFor: number;
    teamGoalsAgainst: number;
    teamResult: 'WIN' | 'DRAW' | 'LOSS';
    trainingBonusPct: number;
    division?: Division;
    club?: Club;
    currentRound?: number;
  }
): {
  updatedPlayer: Player;
  deltaOvr: -1 | 0 | 1;
  reasonTag?: string;
} {
  let currentOvr = player.overall;
  let maxPot = player.potential ?? computeRealisticPotential(currentOvr, player.age, params.division);
  let trainProg = player.trainingProgress ?? 0;
  let regProg = player.regressionProgress ?? 0;
  let evolutionsCount = player.evolutionsCount ?? 0;
  const bucket = getPlayerSectorBucket(player);

  const matchesPlayed = player.matches || 0;
  const seasonAvg = player.ratingAverage || 0;
  const roundNum = params.currentRound || 1;

  // Curva realista por idade (16-19 explosão, 20-22 alto crescimento, 23-25 firmação, 26-28 auge, 29-31 manutenção, 32+ declínio)
  const ageGrowthMult =
    player.age <= 19
      ? 1.65
      : player.age <= 22
      ? 1.4
      : player.age <= 25
      ? 1.15
      : player.age <= 28
      ? 0.9
      : player.age <= 31
      ? 0.58
      : player.age <= 34
      ? 0.3
      : 0.15;

  const ageDeclineMult =
    player.age <= 19
      ? 0.55
      : player.age <= 22
      ? 0.7
      : player.age <= 25
      ? 0.85
      : player.age <= 28
      ? 1.0
      : player.age <= 31
      ? 1.2
      : player.age <= 34
      ? 1.5
      : 1.8;

  let reasonTag: string | undefined;

  if (!params.participated) {
    // Reserva não utilizado:
    // - Jovem até 22 anos ganha leve evolução de treino no CT, mas jogar acelera muito mais.
    // - Jogador maduro/veterano encostado sem ritmo (poucos jogos na temporada) acumula perda de ritmo.
    if (player.injuryWeeks === 0 && player.age <= 22 && currentOvr < maxPot) {
      trainProg += Math.round(3 * (1 + params.trainingBonusPct));
    }
    if (player.injuryWeeks === 0 && roundNum >= 8 && matchesPlayed <= Math.max(2, Math.floor(roundNum * 0.18))) {
      if (player.age >= 31) {
        regProg += 9;
      } else if (player.age >= 25) {
        regProg += 5;
      }
    }
    if (player.age >= 32 && player.morale === 'Péssima') {
      regProg += 7;
    }
  } else {
    // Multiplicador de sequência de jogos + consistência na temporada
    const rhythmMult =
      matchesPlayed >= 20 && seasonAvg >= 7.1
        ? 1.3
        : matchesPlayed >= 10 && seasonAvg >= 6.8
        ? 1.16
        : matchesPlayed >= 5 && seasonAvg >= 6.5
        ? 1.05
        : matchesPlayed >= 8 && seasonAvg > 0 && seasonAvg < 6.0
        ? 0.72
        : 0.96;

    const cleanSheet = params.teamGoalsAgainst === 0;
    const heavyConcede = params.teamGoalsAgainst >= 3;

    // 1. Impulso positivo (Boa atuação / desempenho consistente / destaque do setor)
    const strongPerformance =
      params.matchRating >= 7.0 ||
      params.goalsScoredByPlayer > 0 ||
      params.assistsByPlayer > 0 ||
      (bucket === 'DEF' && cleanSheet && params.teamResult !== 'LOSS');

    if (strongPerformance) {
      let gain = 13;
      if (params.matchRating >= 8.2) gain += 18;
      else if (params.matchRating >= 7.7) gain += 12;
      else if (params.matchRating >= 7.2) gain += 7;

      if (params.goalsScoredByPlayer > 0) gain += params.goalsScoredByPlayer * 9;
      if (params.assistsByPlayer > 0) gain += params.assistsByPlayer * 6;
      if (bucket === 'DEF' && cleanSheet) gain += 9;
      if (bucket === 'MEI' && params.teamResult === 'WIN') gain += 5;
      if (params.teamResult === 'WIN') gain += 4;
      // Consistência de grande temporada acelera o avanço de OVR
      if (matchesPlayed >= 10 && seasonAvg >= 7.25) gain += 7;

      const totalGain = Math.round(gain * ageGrowthMult * rhythmMult * (1 + params.trainingBonusPct));

      // Potencial Dinâmico: destaque jovem ou no auge que estoura na temporada pode quebrar o teto inicial!
      const eligibleForDynamicPotential =
        currentOvr >= maxPot &&
        maxPot < 93 &&
        ((player.age <= 25 && matchesPlayed >= 10 && seasonAvg >= 7.25) ||
          (player.age <= 28 && matchesPlayed >= 16 && seasonAvg >= 7.45) ||
          (player.age <= 27 && ((player.goals || 0) >= 14 || (player.assists || 0) >= 10)));

      if (currentOvr < maxPot || eligibleForDynamicPotential) {
        trainProg += totalGain;
      }
      regProg = Math.max(0, regProg - 30);
    } else if (params.matchRating <= 5.8 || (params.teamResult === 'LOSS' && params.matchRating < 6.3)) {
      // 2. Queda de rendimento / má fase
      let lossRisk = 15;
      if (params.matchRating <= 5.2) lossRisk += 15;
      if (bucket === 'DEF' && heavyConcede) lossRisk += 12;
      if (bucket === 'ATA' && params.teamGoalsFor === 0 && params.teamResult === 'LOSS') lossRisk += 9;
      if (bucket === 'MEI' && params.teamGoalsAgainst - params.teamGoalsFor >= 2) lossRisk += 9;
      if (player.morale === 'Baixa' || player.morale === 'Péssima') lossRisk += 8;
      if (matchesPlayed >= 8 && seasonAvg > 0 && seasonAvg < 6.1) lossRisk += 8;

      regProg += Math.round(lossRisk * ageDeclineMult);
      trainProg = Math.max(0, trainProg - 12);
    } else {
      // Atuação regular com minutos em campo: jovens e titulares regulares ainda progridem
      if (currentOvr < maxPot) {
        trainProg += Math.round(7 * ageGrowthMult * rhythmMult * (1 + params.trainingBonusPct));
      }
      regProg = Math.max(0, regProg - 10);
    }
  }

  let deltaOvr: -1 | 0 | 1 = 0;

  // Potencial dinâmico aplicado quando o jogador em temporada brilhante bate 100% no teto
  if (trainProg >= 100 && currentOvr >= maxPot && maxPot < 93) {
    const canBreakCeiling =
      (player.age <= 25 && matchesPlayed >= 10 && seasonAvg >= 7.25) ||
      (player.age <= 28 && matchesPlayed >= 16 && seasonAvg >= 7.45) ||
      (player.age <= 27 && ((player.goals || 0) >= 14 || (player.assists || 0) >= 10));
    if (canBreakCeiling) {
      maxPot = Math.min(93, maxPot + 1);
    }
  }

  if (trainProg >= 100 && currentOvr < maxPot && currentOvr < 94) {
    currentOvr += 1;
    trainProg -= 100;
    regProg = 0;
    evolutionsCount += 1;
    deltaOvr = 1;
    reasonTag =
      matchesPlayed >= 10 && seasonAvg >= 7.1
        ? `grande fase na temporada (${matchesPlayed} jogos · média ${seasonAvg.toFixed(1)})`
        : player.age <= 22
        ? `evolução acelerada de jovem talento (${player.age} anos · ${matchesPlayed} jogos)`
        : `boas atuações recentes (${matchesPlayed} jogos · nota ${params.matchRating.toFixed(1)})`;
  } else if (regProg >= 100 && currentOvr > 46) {
    currentOvr -= 1;
    regProg -= 100;
    trainProg = Math.min(trainProg, 30);
    evolutionsCount -= 1;
    deltaOvr = -1;
    reasonTag = !params.participated
      ? `falta de ritmo de jogo (${matchesPlayed} jogos na temporada)`
      : player.age >= 32
      ? `desgaste físico e fase irregular (${player.age} anos)`
      : `sequência de atuações abaixo do esperado (média ${seasonAvg > 0 ? seasonAvg.toFixed(1) : params.matchRating.toFixed(1)})`;
  }

  const econ =
    deltaOvr !== 0
      ? recalculatePlayerEconomics(currentOvr, player.age, params.division, params.club)
      : { marketValue: player.marketValue, wage: player.wage };

  return {
    deltaOvr,
    reasonTag,
    updatedPlayer: {
      ...player,
      overall: currentOvr,
      potential: Math.max(currentOvr, maxPot),
      trainingProgress: Math.max(0, Math.min(99, trainProg)),
      regressionProgress: Math.max(0, Math.min(99, regProg)),
      evolutionsCount,
      marketValue: econ.marketValue,
    },
  };
}

/**
 * Evolução diária realista nos treinos de rotina do CT (substitui o ganho cego igual para todas as idades):
 * - Considera idade (jovens absorvem treino diário; veteranos 32+ dependem de desempenho em campo),
 * - Considera minutos/jogos na temporada e nota média (quem joga bem evolui mais rápido; encostados estagnam).
 */
export function applyDailySquadTrainingProgression(
  player: Player,
  params: {
    roleMult: number;
    sub23Mult: number;
    currentRound: number;
    division?: Division;
    club?: Club;
  }
): Player {
  if (player.injuryWeeks > 0) return player;

  // Idade regula a absorção de treino físico/técnico diário
  const ageFactor =
    player.age <= 20
      ? 1.35
      : player.age <= 23
      ? 1.05
      : player.age <= 26
      ? 0.7
      : player.age <= 29
      ? 0.35
      : player.age <= 31
      ? 0.15
      : 0; // 32+ não sobe OVR passivamente só por passar dias; precisa jogar em alto nível

  if (ageFactor <= 0) return player;

  const matches = player.matches || 0;
  const avg = player.ratingAverage || 0;

  // Ritmo de jogos + desempenho na temporada
  let formFactor = 1.0;
  if (matches >= 6 && avg >= 7.1) {
    formFactor = 1.35;
  } else if (matches >= 3 && avg >= 6.6) {
    formFactor = 1.1;
  } else if (matches >= 5 && avg > 0 && avg < 6.0) {
    formFactor = 0.35;
  } else if (params.currentRound >= 10 && matches <= 1 && player.age >= 23) {
    formFactor = 0.2;
  }

  const baseDaily = player.isStarter ? 1.8 : 1.3;
  const gain = Math.round(baseDaily * ageFactor * formFactor * params.roleMult * params.sub23Mult);
  if (gain <= 0) return player;

  let trainingProgress = (player.trainingProgress || 0) + gain;
  let overall = player.overall;
  let evolutionsCount = player.evolutionsCount || 0;
  const maxPot = player.potential || computeRealisticPotential(overall, player.age, params.division);

  if (trainingProgress >= 100) {
    if (overall < maxPot && overall < 94) {
      overall += 1;
      evolutionsCount += 1;
      trainingProgress = Math.max(0, trainingProgress - 100);
    } else {
      trainingProgress = 99;
    }
  }

  if (overall !== player.overall) {
    const econ = recalculatePlayerEconomics(overall, player.age, params.division, params.club);
    return {
      ...player,
      overall,
      trainingProgress: Math.min(99, trainingProgress),
      evolutionsCount,
      marketValue: econ.marketValue,
    };
  }

  const clampedProgress = Math.min(99, trainingProgress);
  if (clampedProgress === (player.trainingProgress || 0)) {
    return player;
  }

  return {
    ...player,
    trainingProgress: clampedProgress,
  };
}

/**
 * Avaliação completa de fim de temporada de um jogador baseada em:
 * 1) Desempenho na temporada (nota média, gols e assistências conforme posição),
 * 2) Quantidade de jogos disputados (ritmo e protagonismo),
 * 3) Curva de idade (16-23 explosão, 24-28 auge/potencial dinâmico, 29-31 estabilidade, 32+ declínio mitigado por grande fase).
 */
export function evaluateSeasonEndPlayerProgression(
  player: Player,
  newAge: number,
  club: Club,
  isUserClub: boolean
): {
  newOverall: number;
  newPotential: number;
  deltaOvr: number;
  newMarketValue: number;
  newWage: number;
  reason: string;
} {
  const matches = player.matches || 0;
  const avg = player.ratingAverage || 0;
  const goals = player.goals || 0;
  const assists = player.assists || 0;
  const curOvr = player.overall;
  let maxPot = player.potential ?? computeRealisticPotential(curOvr, newAge, club.division);

  // 1. Pontuação por Desempenho (Nota Média + Participações em Gol por posição)
  let perfScore = 0;
  if (matches >= 4 && avg > 0) {
    if (avg >= 7.5) perfScore += 42;
    else if (avg >= 7.15) perfScore += 28;
    else if (avg >= 6.8) perfScore += 14;
    else if (avg >= 6.4) perfScore += 2;
    else if (avg >= 6.0) perfScore -= 14;
    else perfScore -= 28;
  }

  if (player.position === 'FW') {
    if (goals >= 20) perfScore += 22;
    else if (goals >= 12) perfScore += 13;
    else if (goals >= 7) perfScore += 6;
    if (goals + assists >= 18) perfScore += 8;
  } else if (player.position === 'MF') {
    if (goals + assists >= 14) perfScore += 20;
    else if (goals + assists >= 8) perfScore += 11;
    else if (goals + assists >= 4) perfScore += 5;
  } else {
    // GK / DF
    if (matches >= 20 && avg >= 7.05) perfScore += 16;
    else if (matches >= 14 && avg >= 6.85) perfScore += 9;
  }

  // 2. Pontuação por Jogos Disputados (Minutagem / Ritmo)
  let gamesScore = 0;
  if (matches >= 28) gamesScore = 20;
  else if (matches >= 18) gamesScore = 12;
  else if (matches >= 10) gamesScore = 4;
  else if (matches >= 4) gamesScore = -6;
  else gamesScore = newAge <= 21 ? -8 : -18; // Encostado na temporada inteira

  // 3. Curva de Idade
  let ageScore = 0;
  let maxUp = 2;
  let maxDown = -1;

  if (newAge <= 20) {
    ageScore = 18;
    maxUp = 3;
    maxDown = matches >= 6 ? 0 : -1;
  } else if (newAge <= 23) {
    ageScore = 11;
    maxUp = 3;
    maxDown = -1;
  } else if (newAge <= 27) {
    ageScore = 0;
    maxUp = 2;
    maxDown = -1;
  } else if (newAge <= 30) {
    ageScore = -5;
    maxUp = 1;
    maxDown = -1;
  } else if (newAge <= 32) {
    ageScore = -14;
    maxUp = 1; // Só sobe se tiver temporada brilhante
    maxDown = -2;
  } else if (newAge <= 34) {
    ageScore = -25;
    maxUp = 0; // Consegue manter (0) se jogar muito bem!
    maxDown = -2;
  } else {
    ageScore = -38;
    maxUp = 0;
    maxDown = -3;
  }

  const totalScore = perfScore + gamesScore + ageScore;

  let rawDelta = 0;
  if (totalScore >= 62) rawDelta = 3;
  else if (totalScore >= 38) rawDelta = 2;
  else if (totalScore >= 16) rawDelta = 1;
  else if (totalScore <= -46) rawDelta = -3;
  else if (totalScore <= -28) rawDelta = -2;
  else if (totalScore <= -12) rawDelta = -1;

  // Respeitar limites da faixa etária
  rawDelta = Math.max(maxDown, Math.min(maxUp, rawDelta));

  // Jogador jovem que quase não jogou não pode subir +2/+3 só pela idade
  if (matches < 6 && rawDelta > 1) {
    rawDelta = matches >= 2 && newAge <= 19 ? 1 : 0;
  }
  if (matches === 0 && rawDelta > 0) {
    rawDelta = 0;
  }

  // Potencial Dinâmico no fim de temporada: temporada fora da curva aumenta o potencial!
  if (rawDelta > 0 && newAge <= 27 && totalScore >= 46 && maxPot < 94) {
    const potBump = totalScore >= 64 && newAge <= 24 ? 2 : 1;
    maxPot = Math.min(94, maxPot + potBump);
  }

  let newOverall = curOvr;
  if (rawDelta > 0) {
    newOverall = Math.min(95, Math.min(Math.max(curOvr, maxPot), curOvr + rawDelta));
  } else if (rawDelta < 0) {
    newOverall = Math.max(48, curOvr + rawDelta);
  }

  const deltaOvr = newOverall - curOvr;

  let newMarketValue = player.marketValue;
  let newWage = player.wage;
  if (deltaOvr !== 0) {
    const updatedEcon = recalculatePlayerEconomics(newOverall, newAge, club.division, club);
    if (deltaOvr > 0) {
      newMarketValue = Math.max(newMarketValue, updatedEcon.marketValue);
      if (!isUserClub) {
        newWage = Math.round((newWage * 0.72 + updatedEcon.wage * 0.28) / 500) * 500;
      }
    } else {
      newMarketValue = Math.min(
        newMarketValue,
        Math.max(updatedEcon.marketValue, Math.round(newMarketValue * 0.85))
      );
      if (!isUserClub) {
        newWage = Math.max(500, Math.round((newWage * 0.85 + updatedEcon.wage * 0.15) / 500) * 500);
      }
    }
  }

  let reason = 'temporada estável';
  if (deltaOvr > 0) {
    if (matches >= 18 && avg >= 7.1) {
      reason = `grande temporada (${matches} jogos · média ${avg.toFixed(1)})`;
    } else if (newAge <= 22) {
      reason = `evolução jovem (${newAge} anos · ${matches} jogos)`;
    } else {
      reason = `bom desempenho (${matches} jogos${goals > 0 ? ` · ${goals}G` : ''}${assists > 0 ? ` · ${assists}A` : ''})`;
    }
  } else if (deltaOvr < 0) {
    if (newAge >= 33) {
      reason = `desgaste físico (${newAge} anos · ${matches} jogos)`;
    } else if (matches <= 4) {
      reason = `poucos jogos na temporada (${matches} ${matches === 1 ? 'partida' : 'partidas'})`;
    } else {
      reason = `temporada abaixo da média (${matches} jogos · média ${avg > 0 ? avg.toFixed(1) : '—'})`;
    }
  }

  return {
    newOverall,
    newPotential: Math.max(newOverall, maxPot),
    deltaOvr,
    newMarketValue,
    newWage,
    reason,
  };
}

/**
 * Evolução e regressão dinâmica para TODOS os clubes da CPU com base nos resultados da rodada!
 * Times da Série D, C, B ou A que emplacam vitórias, saldo de gols e defesas sólidas SOBEM de nível (+DEF/+MEI/+ATA),
 * enquanto times em crise de derrotas, ataques zerados e defesas vazadas CAEM de nível (-DEF/-MEI/-ATA).
 */
export function applyCpuClubsDynamicRatingsAfterFixtures(
  clubs: Club[],
  completedFixtures: Fixture[],
  userClubId?: string
): Club[] {
  if (!completedFixtures || completedFixtures.length === 0) return clubs;

  // Agregar desempenho de cada clube CPU nos jogos concluídos nesta batelada
  const clubPerfMap = new Map<
    string,
    {
      gf: number;
      ga: number;
      wins: number;
      draws: number;
      losses: number;
      oppAvgOvr: number;
      matches: number;
    }
  >();

  const clubOvrQuick = new Map<string, number>();
  clubs.forEach((c) => {
    clubOvrQuick.set(c.id, getClubSectorRatings(c).overall);
  });

  completedFixtures.forEach((fx) => {
    if (!fx.played || fx.homeScore === null || fx.awayScore === null) return;
    const hOvr = clubOvrQuick.get(fx.homeTeamId) ?? 65;
    const aOvr = clubOvrQuick.get(fx.awayTeamId) ?? 65;

    const recordSide = (teamId: string, gf: number, ga: number, oppOvr: number) => {
      if (teamId === userClubId) return;
      const cur = clubPerfMap.get(teamId) || {
        gf: 0,
        ga: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        oppAvgOvr: 0,
        matches: 0,
      };
      cur.gf += gf;
      cur.ga += ga;
      if (gf > ga) cur.wins += 1;
      else if (gf === ga) cur.draws += 1;
      else cur.losses += 1;
      cur.oppAvgOvr += oppOvr;
      cur.matches += 1;
      clubPerfMap.set(teamId, cur);
    };

    recordSide(fx.homeTeamId, fx.homeScore, fx.awayScore, aOvr);
    recordSide(fx.awayTeamId, fx.awayScore, fx.homeScore, hOvr);
  });

  if (clubPerfMap.size === 0) return clubs;

  return clubs.map((club) => {
    if (club.id === userClubId) return club;
    const perf = clubPerfMap.get(club.id);
    if (!perf || perf.matches === 0) return club;

    const ownOvr = clubOvrQuick.get(club.id) ?? 65;
    const avgOppOvr = perf.oppAvgOvr / perf.matches;
    // Se enfrentou adversário mais forte e pontuou, ganha bônus extra de evolução ("zebra" / ascensão)
    const underdogBonus = Math.max(-4, Math.min(6, Math.round((avgOppOvr - ownOvr) * 0.5)));

    const avgGf = perf.gf / perf.matches;
    const avgGa = perf.ga / perf.matches;
    const winRatio = perf.wins / perf.matches;
    const lossRatio = perf.losses / perf.matches;

    const updatedSquad = club.squad.map((p) => {
      if (!p.isStarter && !p.isSubstitute) return p;
      const partWeight = p.isStarter ? 1.0 : 0.45;
      const bucket = getPlayerSectorBucket(p);

      let trainProg = p.trainingProgress ?? 20;
      let regProg = p.regressionProgress ?? 0;
      let curOvr = p.overall;
      const maxPot = p.potential ?? computeRealisticPotential(curOvr, p.age, club.division);

      // Cálculo por setor
      let sectorScore = 0; // positivo = evoluindo, negativo = caindo
      if (bucket === 'DEF') {
        if (avgGa === 0) sectorScore += 18 + underdogBonus * 2;
        else if (avgGa <= 1) sectorScore += 6 + underdogBonus;
        else if (avgGa >= 2.5) sectorScore -= 22 - underdogBonus;
        else if (avgGa >= 1.8) sectorScore -= 12 - underdogBonus;
      } else if (bucket === 'MEI') {
        if (winRatio >= 0.6) sectorScore += 16 + underdogBonus * 2;
        else if (lossRatio >= 0.6) sectorScore -= 16 - underdogBonus;
        else sectorScore += 3 + underdogBonus;
      } else {
        // ATA
        if (avgGf >= 2.0) sectorScore += 19 + underdogBonus * 2;
        else if (avgGf >= 1.0 && winRatio > 0) sectorScore += 10 + underdogBonus;
        else if (avgGf === 0 && lossRatio >= 0.5) sectorScore -= 20 - underdogBonus;
        else if (avgGf < 0.6) sectorScore -= 11 - underdogBonus;
      }

      if (sectorScore > 0) {
        const ageBoost = p.age <= 22 ? 1.35 : p.age <= 26 ? 1.1 : p.age <= 30 ? 0.8 : 0.45;
        trainProg += Math.round(sectorScore * partWeight * ageBoost);
        regProg = Math.max(0, regProg - 18);
      } else if (sectorScore < 0) {
        const agePenalty = p.age >= 32 ? 1.4 : p.age >= 29 ? 1.15 : 0.85;
        regProg += Math.round(Math.abs(sectorScore) * partWeight * agePenalty);
        trainProg = Math.max(0, trainProg - 8);
      }

      let evolutionsCount = p.evolutionsCount ?? 0;
      if (trainProg >= 100 && curOvr < maxPot && curOvr < 92) {
        curOvr += 1;
        trainProg -= 100;
        regProg = 0;
        evolutionsCount += 1;
      } else if (regProg >= 100 && curOvr > 46) {
        curOvr -= 1;
        regProg -= 100;
        evolutionsCount -= 1;
      }

      if (curOvr !== p.overall) {
        const econ = recalculatePlayerEconomics(curOvr, p.age, club.division, club);
        return {
          ...p,
          overall: curOvr,
          trainingProgress: Math.max(0, Math.min(99, trainProg)),
          regressionProgress: Math.max(0, Math.min(99, regProg)),
          evolutionsCount,
          marketValue: econ.marketValue,
        };
      }

      return {
        ...p,
        trainingProgress: Math.max(0, Math.min(99, trainProg)),
        regressionProgress: Math.max(0, Math.min(99, regProg)),
      };
    });

    return {
      ...club,
      squad: updatedSquad,
    };
  });
}

/**
 * Ajuste estrutural de virada de temporada (acesso / rebaixamento + baseline da nova temporada):
 * A evolução/queda individual por desempenho, idade e jogos já é calculada em `evaluateSeasonEndPlayerProgression`
 * antes do zeramento das estatísticas. Aqui aplicamos apenas o impulso coletivo de acesso/rebaixamento e atualizamos baselines.
 */
export function applySeasonEndRatingsTransition(
  clubs: Club[],
  promotedClubIds: Set<string>,
  relegatedClubIds: Set<string>
): Club[] {
  return clubs.map((club) => {
    const wasPromoted = promotedClubIds.has(club.id);
    const wasRelegated = relegatedClubIds.has(club.id);

    const nextSquad = club.squad.map((p, idx) => {
      let ovr = p.overall;
      let pot = p.potential ?? computeRealisticPotential(ovr, p.age, club.division);
      let evolutionsCount = p.evolutionsCount ?? 0;

      if (wasPromoted && (p.isStarter || idx < 14)) {
        // Impulso coletivo de acesso/título de divisão (+1 OVR para a base titular)
        const boost = 1;
        pot = Math.min(94, Math.max(pot, ovr + boost));
        ovr = Math.min(92, ovr + (idx % 2 === 0 || p.age <= 25 ? boost : 0));
        evolutionsCount += ovr - p.overall;
      } else if (wasRelegated && (p.isStarter || p.age >= 29)) {
        // Impacto técnico do rebaixamento nos titulares/experientes
        if (idx % 2 === 0 || p.age >= 30) {
          ovr = Math.max(47, ovr - 1);
          evolutionsCount += ovr - p.overall;
        }
      }

      const econ =
        ovr !== p.overall
          ? recalculatePlayerEconomics(ovr, p.age, club.division, club)
          : { marketValue: p.marketValue, wage: p.wage };

      return {
        ...p,
        overall: ovr,
        seasonStartOverall: ovr,
        potential: Math.max(ovr, pot),
        evolutionsCount,
        regressionProgress: 0,
        marketValue: econ.marketValue,
      };
    });

    const tempClub: Club = {
      ...club,
      squad: nextSquad,
    };
    const nextSectors = getClubSectorRatings(tempClub);

    return {
      ...tempClub,
      seasonStartSectorRatings: {
        overall: nextSectors.overall,
        defense: nextSectors.defense,
        midfield: nextSectors.midfield,
        attack: nextSectors.attack,
      },
    };
  });
}

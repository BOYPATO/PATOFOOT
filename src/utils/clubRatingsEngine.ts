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
    if (club.europeanLeagueId === 'eng_league_two') {
      base = club.reputation >= 2 ? 60 : 57;
    } else if (club.europeanLeagueId === 'eng_league_one') {
      base = club.reputation >= 3 ? 67 : 63;
    } else if (club.europeanLeagueId === 'eng_championship') {
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
        ? club.europeanLeagueId === 'eng_league_two'
          ? 52
          : club.europeanLeagueId === 'eng_league_one'
          ? 57
          : club.europeanLeagueId === 'eng_championship'
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
        ? club.europeanLeagueId === 'eng_league_two'
          ? 68
          : club.europeanLeagueId === 'eng_league_one'
          ? 74
          : club.europeanLeagueId === 'eng_championship'
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
 * baseada em nota, gols, assistências, saldo defensivo, resultado e moral.
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
  }
): {
  updatedPlayer: Player;
  deltaOvr: -1 | 0 | 1;
} {
  let currentOvr = player.overall;
  const maxPot = player.potential ?? computeRealisticPotential(currentOvr, player.age, params.division);
  let trainProg = player.trainingProgress ?? 0;
  let regProg = player.regressionProgress ?? 0;
  let evolutionsCount = player.evolutionsCount ?? 0;
  const bucket = getPlayerSectorBucket(player);

  if (!params.participated) {
    // Reserva não utilizado: leve treino semanal se jovem, leve estagnação se veterano encostado
    if (player.injuryWeeks === 0 && currentOvr < maxPot) {
      trainProg += Math.round(4 * (1 + params.trainingBonusPct));
    }
    if (player.age >= 32 && player.morale === 'Péssima') {
      regProg += 8;
    }
  } else {
    const ageGrowthMult = player.age <= 22 ? 1.35 : player.age <= 26 ? 1.15 : player.age <= 30 ? 0.9 : 0.65;
    const ageDeclineMult = player.age >= 33 ? 1.45 : player.age >= 30 ? 1.2 : 0.9;

    const cleanSheet = params.teamGoalsAgainst === 0;
    const heavyConcede = params.teamGoalsAgainst >= 3;

    // 1. Impulso positivo (Boa atuação / vitória / destaque do setor)
    const strongPerformance =
      params.matchRating >= 7.1 ||
      params.goalsScoredByPlayer > 0 ||
      params.assistsByPlayer > 0 ||
      (bucket === 'DEF' && cleanSheet && params.teamResult !== 'LOSS');

    if (strongPerformance) {
      let gain = 14;
      if (params.matchRating >= 7.8) gain += 12;
      else if (params.matchRating >= 7.3) gain += 6;
      if (params.goalsScoredByPlayer > 0) gain += params.goalsScoredByPlayer * 9;
      if (params.assistsByPlayer > 0) gain += params.assistsByPlayer * 6;
      if (bucket === 'DEF' && cleanSheet) gain += 9;
      if (bucket === 'MEI' && params.teamResult === 'WIN') gain += 6;
      if (params.teamResult === 'WIN') gain += 5;

      const totalGain = Math.round(gain * ageGrowthMult * (1 + params.trainingBonusPct));
      if (currentOvr < maxPot) {
        trainProg += totalGain;
      }
      regProg = Math.max(0, regProg - 28);
    } else if (params.matchRating <= 5.8 || (params.teamResult === 'LOSS' && params.matchRating < 6.4)) {
      // 2. Desgaste / queda de nível (Má fase, derrota pesada, nota baixa)
      let lossRisk = 16;
      if (params.matchRating <= 5.3) lossRisk += 14;
      if (bucket === 'DEF' && heavyConcede) lossRisk += 12;
      if (bucket === 'ATA' && params.teamGoalsFor === 0 && params.teamResult === 'LOSS') lossRisk += 10;
      if (bucket === 'MEI' && params.teamGoalsAgainst - params.teamGoalsFor >= 2) lossRisk += 10;
      if (player.morale === 'Baixa' || player.morale === 'Péssima') lossRisk += 8;

      regProg += Math.round(lossRisk * ageDeclineMult);
      trainProg = Math.max(0, trainProg - 12);
    } else {
      // Atuação regular: evolução orgânica leve
      if (currentOvr < maxPot) {
        trainProg += Math.round(7 * ageGrowthMult * (1 + params.trainingBonusPct));
      }
      regProg = Math.max(0, regProg - 8);
    }
  }

  let deltaOvr: -1 | 0 | 1 = 0;

  if (trainProg >= 100 && currentOvr < maxPot && currentOvr < 94) {
    currentOvr += 1;
    trainProg -= 100;
    regProg = 0;
    evolutionsCount += 1;
    deltaOvr = 1;
  } else if (regProg >= 100 && currentOvr > 46) {
    currentOvr -= 1;
    regProg -= 100;
    trainProg = Math.min(trainProg, 35);
    evolutionsCount -= 1;
    deltaOvr = -1;
  }

  const econ =
    deltaOvr !== 0
      ? recalculatePlayerEconomics(currentOvr, player.age, params.division, params.club)
      : { marketValue: player.marketValue, wage: player.wage };

  return {
    deltaOvr,
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
        const ageBoost = p.age <= 24 ? 1.25 : p.age <= 29 ? 1.0 : 0.7;
        trainProg += Math.round(sectorScore * partWeight * ageBoost);
        regProg = Math.max(0, regProg - 18);
      } else if (sectorScore < 0) {
        const agePenalty = p.age >= 31 ? 1.3 : 1.0;
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
 * Ajuste estrutural de virada de temporada:
 * - Clubes promovidos ganham confiança e evolução (+1 a +2 OVR nos titulares de destaque) para competir na nova divisão.
 * - Clubes rebaixados sofrem queda de moral/nível (-1 OVR em medalhões/titulares que fracassaram).
 * - Veteranos acima de 33 anos sofrem declínio físico natural se não tiveram grande média, enquanto jovens titulares sobem.
 * - Atualiza `seasonStartSectorRatings` para o novo ano!
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
        // Impulso de acesso de divisão
        const boost = p.age <= 25 ? 2 : 1;
        pot = Math.min(93, Math.max(pot, ovr + boost + 1));
        ovr = Math.min(91, ovr + (idx % 2 === 0 ? boost : 1));
        evolutionsCount += ovr - p.overall;
      } else if (wasRelegated && (p.isStarter || p.age >= 29)) {
        // Impacto técnico do rebaixamento
        const drop = p.age >= 31 ? 2 : 1;
        ovr = Math.max(47, ovr - (idx % 3 === 0 ? drop : 1));
        evolutionsCount += ovr - p.overall;
      } else if (p.age >= 34 && (p.ratingAverage === 0 || p.ratingAverage < 6.9)) {
        // Declínio natural de veterano
        ovr = Math.max(47, ovr - 1);
        evolutionsCount -= 1;
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

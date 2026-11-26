import {
  AutoTryoutFrequency,
  Club,
  DetailedRole,
  InboxMessage,
  MAX_SQUAD_SIZE,
  Player,
  Position,
  YouthAcademyBoy,
  YouthAcademyState,
  YouthAgeGroupFilter,
  YouthPotentialTier,
  YouthTrainingFocus,
  YouthTrainingIntensity,
  YouthTryoutCandidate,
  YouthTryoutTier,
} from '../types/game';
import { ensurePlayerContractFields } from './contractLifecycleEngine';
import { recordFinanceLedgerMutation } from './financialFairPlayEngine';
import { getClubEconomyProfile } from './clubEconomyScale';

export const MAX_YOUTH_ACADEMY_PLAYERS = 10;
export const MIN_YOUTH_PROMOTION_AGE = 16;
export const YOUTH_TRAINING_COOLDOWN_DAYS = 7;

export interface YouthTrainingFocusInfo {
  id: YouthTrainingFocus;
  label: string;
  shortLabel: string;
  description: string;
  idealRoles: DetailedRole[];
}

export const YOUTH_TRAINING_FOCUSES: YouthTrainingFocusInfo[] = [
  {
    id: 'EQUILIBRADO',
    label: 'Desenvolvimento Geral',
    shortLabel: 'Equilibrado',
    description: 'Evolução uniforme de fundamentos, ritmo de jogo e leitura tática para todas as posições.',
    idealRoles: ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'],
  },
  {
    id: 'TECNICA',
    label: 'Fundamentos & Técnica',
    shortLabel: 'Técnica',
    description: 'Domínio orientado, drible em espaço curto e passe vertical. Sinergia máxima para MEI, ATA e LAT.',
    idealRoles: ['MEI', 'ATA', 'LAT'],
  },
  {
    id: 'FINALIZACAO',
    label: 'Finalização & Ofensividade',
    shortLabel: 'Finalização',
    description: 'Chute colocado, movimentação na área e tomada de decisão no terço final. Ideal para ATA e MEI.',
    idealRoles: ['ATA', 'MEI'],
  },
  {
    id: 'DEFESA',
    label: 'Marcação & Cobertura',
    shortLabel: 'Defesa',
    description: 'Posicionamento defensivo, desarme, bola aérea e saída sob pressão. Ideal para GOL, ZAG, LAT e VOL.',
    idealRoles: ['GOL', 'ZAG', 'LAT', 'VOL'],
  },
  {
    id: 'FISICO',
    label: 'Maturação Física & Velocidade',
    shortLabel: 'Físico',
    description: 'Ganho de força, explosão e resistência. Excelente para garotos Sub-15 e Sub-17 em formação.',
    idealRoles: ['LAT', 'ATA', 'ZAG', 'VOL'],
  },
  {
    id: 'TATICO',
    label: 'Inteligência Tática',
    shortLabel: 'Tático',
    description: 'Compactação, cobertura de espaços e construção desde trás. Ideal para VOL, MEI, ZAG e GOL.',
    idealRoles: ['VOL', 'MEI', 'ZAG', 'GOL'],
  },
];

export interface YouthTrainingIntensityInfo {
  id: YouthTrainingIntensity;
  label: string;
  multiplier: number;
  description: string;
}

export const YOUTH_TRAINING_INTENSITIES: YouthTrainingIntensityInfo[] = [
  {
    id: 'LEVE',
    label: 'Leve',
    multiplier: 0.85,
    description: 'Ritmo cadenciado focado em fundamentos básicos (0.85x evolução).',
  },
  {
    id: 'MODERADO',
    label: 'Moderado',
    multiplier: 1.15,
    description: 'Carga equilibrada de categorias de base competitivas (1.15x evolução).',
  },
  {
    id: 'INTENSO',
    label: 'Intenso',
    multiplier: 1.45,
    description: 'Preparação acelerada para lapidar joias antes da subida ao profissional (1.45x evolução).',
  },
];

export function canPromoteYouthBoy(boy: YouthAcademyBoy): {
  allowed: boolean;
  yearsRemaining: number;
  reason?: string;
} {
  if (boy.player.age < MIN_YOUTH_PROMOTION_AGE) {
    const yearsRemaining = MIN_YOUTH_PROMOTION_AGE - boy.player.age;
    return {
      allowed: false,
      yearsRemaining,
      reason: `Precisa completar ${MIN_YOUTH_PROMOTION_AGE} anos para subir ao profissional (falta ${yearsRemaining} ${
        yearsRemaining === 1 ? 'ano' : 'anos'
      }).`,
    };
  }
  return { allowed: true, yearsRemaining: 0 };
}

export function getYouthBoyTrainingRate(
  club: Club,
  boy: YouthAcademyBoy
): {
  dailyXp: number;
  effectiveFocus: YouthTrainingFocus;
  intensity: YouthTrainingIntensity;
  synergyLabel: 'Sinergia Alta' | 'Sinergia Boa' | 'Padrão';
  synergyBonusPct: number;
} {
  const academyLevel = Math.max(1, Math.min(5, club.finances.youthAcademyLevel || 1));
  const academy = club.youthAcademy;
  const collectiveFocus: YouthTrainingFocus = academy?.trainingFocus || 'EQUILIBRADO';
  const effectiveFocus: YouthTrainingFocus =
    boy.individualFocus && boy.individualFocus !== 'PADRAO'
      ? boy.individualFocus
      : collectiveFocus;
  const intensity: YouthTrainingIntensity = academy?.trainingIntensity || 'MODERADO';
  const intensityMeta =
    YOUTH_TRAINING_INTENSITIES.find((i) => i.id === intensity) || YOUTH_TRAINING_INTENSITIES[1];

  const role = boy.player.detailedRole;
  let synergyMult = 1.0;
  let synergyLabel: 'Sinergia Alta' | 'Sinergia Boa' | 'Padrão' = 'Padrão';

  if (effectiveFocus === 'EQUILIBRADO') {
    synergyMult = 1.15;
    synergyLabel = 'Sinergia Boa';
  } else if (effectiveFocus === 'FINALIZACAO') {
    if (role === 'ATA') {
      synergyMult = 1.35;
      synergyLabel = 'Sinergia Alta';
    } else if (role === 'MEI') {
      synergyMult = 1.18;
      synergyLabel = 'Sinergia Boa';
    }
  } else if (effectiveFocus === 'DEFESA') {
    if (role === 'GOL' || role === 'ZAG' || role === 'LAT' || role === 'VOL') {
      synergyMult = 1.35;
      synergyLabel = 'Sinergia Alta';
    }
  } else if (effectiveFocus === 'TECNICA') {
    if (role === 'MEI' || role === 'ATA' || role === 'LAT') {
      synergyMult = 1.3;
      synergyLabel = 'Sinergia Alta';
    } else if (role === 'VOL') {
      synergyMult = 1.15;
      synergyLabel = 'Sinergia Boa';
    }
  } else if (effectiveFocus === 'TATICO') {
    if (role === 'VOL' || role === 'MEI' || role === 'ZAG' || role === 'GOL') {
      synergyMult = 1.3;
      synergyLabel = 'Sinergia Alta';
    } else {
      synergyMult = 1.12;
      synergyLabel = 'Sinergia Boa';
    }
  } else if (effectiveFocus === 'FISICO') {
    if (boy.player.age <= 16) {
      synergyMult = 1.32;
      synergyLabel = 'Sinergia Alta';
    } else {
      synergyMult = 1.18;
      synergyLabel = 'Sinergia Boa';
    }
  }

  // Jovens de 14–16 anos absorvem fundamentos mais rápido na base antes de subir ao profissional
  const ageMult = boy.player.age <= 15 ? 1.22 : boy.player.age <= 17 ? 1.12 : 0.96;
  const baseDaily = 2.8 + academyLevel * 1.1; // 3.9 (Nv1) até 8.3 (Nv5)
  const dailyXp = Math.max(3, Math.round(baseDaily * intensityMeta.multiplier * synergyMult * ageMult));

  return {
    dailyXp,
    effectiveFocus,
    intensity,
    synergyLabel,
    synergyBonusPct: Math.round((synergyMult - 1) * 100),
  };
}

function parseYouthCalendarDateMs(dateStr: string): number {
  if (!dateStr) return NaN;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return Date.parse(`${dateStr}T12:00:00Z`);
  }
  const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return Date.parse(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T12:00:00Z`);
  }
  return Date.parse(dateStr);
}

export function getYouthTrainingCooldownDays(club: Club, currentDate: string): number {
  const lastDate = club.youthAcademy?.lastTrainingSessionDate;
  if (!lastDate) return 0;
  const lastMs = parseYouthCalendarDateMs(lastDate);
  const currMs = parseYouthCalendarDateMs(currentDate);
  if (Number.isNaN(lastMs) || Number.isNaN(currMs)) return 0;
  const elapsed = Math.floor((currMs - lastMs) / 86400000);
  if (elapsed < 0) return 0;
  return Math.max(0, YOUTH_TRAINING_COOLDOWN_DAYS - elapsed);
}

export interface YouthTryoutTierInfo {
  id: YouthTryoutTier;
  label: string;
  shortLabel: string;
  description: string;
  candidatesCount: number;
  ovrBonus: number;
  potentialBonus: number;
  gemChanceLabel: string;
}

export const YOUTH_TRYOUT_TIERS: Record<YouthTryoutTier, YouthTryoutTierInfo> = {
  COMUNITARIA: {
    id: 'COMUNITARIA',
    label: 'Peneira Comunitária no CT',
    shortLabel: 'Peneira Local',
    description:
      'Portões abertos nos campos anexos do CT para avaliar garotos de escolinhas, várzea e futsal da cidade.',
    candidatesCount: 3,
    ovrBonus: 0,
    potentialBonus: 0,
    gemChanceLabel: 'Chance moderada de promessa',
  },
  ESTADUAL: {
    id: 'ESTADUAL',
    label: 'Peneira Estadual (Capital & Interior)',
    shortLabel: 'Peneira Estadual',
    description:
      'Banca de avaliadores percorre polos formadores do estado em busca de destaques Sub-15, Sub-17 e Sub-20.',
    candidatesCount: 4,
    ovrBonus: 2,
    potentialBonus: 3,
    gemChanceLabel: 'Alta chance de grande promessa',
  },
  NACIONAL: {
    id: 'NACIONAL',
    label: 'Grande Peneira Nacional de Talentos',
    shortLabel: 'Peneira Nacional',
    description:
      'Seletiva intensiva em múltiplos estados com testes físicos e coletivos para garimpar joias raras da base.',
    candidatesCount: 5,
    ovrBonus: 3,
    potentialBonus: 6,
    gemChanceLabel: 'Chance elevada de Joia da Base',
  },
};

export const AUTO_TRYOUT_FREQUENCY_CONFIG: Record<
  AutoTryoutFrequency,
  {
    id: AutoTryoutFrequency;
    label: string;
    shortLabel: string;
    days: number;
    description: string;
    icon: string;
  }
> = {
  OFF: {
    id: 'OFF',
    label: 'Desativado (Manual)',
    shortLabel: 'Manual',
    days: 0,
    description: 'Peneiras realizadas apenas manualmente quando você solicitar.',
    icon: '⏸️',
  },
  MONTHLY: {
    id: 'MONTHLY',
    label: 'Mensal (A cada 30 dias)',
    shortLabel: 'Mensal',
    days: 30,
    description: 'A comissão técnica realiza uma nova peneira a cada 30 dias de calendário.',
    icon: '📅',
  },
  QUARTERLY: {
    id: 'QUARTERLY',
    label: 'Trimestral (A cada 90 dias)',
    shortLabel: 'Trimestral',
    days: 90,
    description: 'Renovação periódica trimestral de talentos (4 peneiras automáticas por ano).',
    icon: '🔄',
  },
  ANNUAL: {
    id: 'ANNUAL',
    label: 'Anual (A cada 365 dias)',
    shortLabel: 'Anual',
    days: 365,
    description: 'Grande seletiva anual da comissão para renovação de safra da academia.',
    icon: '🏆',
  },
};

export function calculateNextAutoTryoutDate(
  currentDate: string,
  lastDate?: string,
  frequency: AutoTryoutFrequency = 'OFF'
): { nextDate: string | null; daysRemaining: number | null } {
  if (frequency === 'OFF') {
    return { nextDate: null, daysRemaining: null };
  }
  const config = AUTO_TRYOUT_FREQUENCY_CONFIG[frequency];
  const baseDateStr = lastDate || currentDate;
  const baseTime = new Date(baseDateStr).getTime();
  const targetTime = baseTime + config.days * 24 * 60 * 60 * 1000;
  const targetDateObj = new Date(targetTime);
  const nextDateStr = targetDateObj.toISOString().split('T')[0];

  const currTime = new Date(currentDate).getTime();
  const diffDays = Math.round((targetTime - currTime) / (24 * 60 * 60 * 1000));

  return {
    nextDate: nextDateStr,
    daysRemaining: Math.max(0, diffDays),
  };
}

const STATE_CITIES: Record<string, string[]> = {
  SP: ['Campinas-SP', 'Ribeirão Preto-SP', 'Santos-SP', 'Sorocaba-SP', 'São Bernardo-SP', 'Guarulhos-SP', 'Osasco-SP'],
  RJ: ['Duque de Caxias-RJ', 'Niterói-RJ', 'Nova Iguaçu-RJ', 'Volta Redonda-RJ', 'São Gonçalo-RJ', 'Campos-RJ'],
  MG: ['Contagem-MG', 'Uberlândia-MG', 'Juiz de Fora-MG', 'Betim-MG', 'Montes Claros-MG', 'Ipatinga-MG'],
  RS: ['Caxias do Sul-RS', 'Pelotas-RS', 'Canoas-RS', 'Santa Maria-RS', 'Novo Hamburgo-RS', 'Passo Fundo-RS'],
  PR: ['Londrina-PR', 'Maringá-PR', 'Ponta Grossa-PR', 'Cascavel-PR', 'São José dos Pinhais-PR', 'Foz do Iguaçu-PR'],
  SC: ['Joinville-SC', 'Florianópolis-SC', 'Blumenau-SC', 'Criciúma-SC', 'Chapecó-SC', 'Itajaí-SC'],
  BA: ['Feira de Santana-BA', 'Vitória da Conquista-BA', 'Camaçari-BA', 'Itabuna-BA', 'Juazeiro-BA', 'Ilhéus-BA'],
  PE: ['Jaboatão-PE', 'Olinda-PE', 'Caruaru-PE', 'Petrolina-PE', 'Paulista-PE'],
  CE: ['Caucaia-CE', 'Juazeiro do Norte-CE', 'Sobral-CE', 'Maracanaú-CE'],
  GO: ['Aparecida de Goiânia-GO', 'Anápolis-GO', 'Rio Verde-GO', 'Trindade-GO'],
  PA: ['Ananindeua-PA', 'Santarém-PA', 'Marabá-PA', 'Castanhal-PA'],
  AL: ['Maceió-AL', 'Arapiraca-AL', 'Penedo-AL'],
  RN: ['Natal-RN', 'Mossoró-RN', 'Parnamirim-RN'],
  MT: ['Cuiabá-MT', 'Várzea Grande-MT', 'Rondonópolis-MT'],
  AM: ['Manaus-AM', 'Parintins-AM', 'Itacoatiara-AM'],
  DF: ['Taguatinga-DF', 'Ceilândia-DF', 'Gama-DF'],
};

const ALL_BRAZIL_CITIES: string[] = Object.values(STATE_CITIES).flat();

const FIRST_NAMES_YOUTH = [
  'Kauã',
  'Estevão',
  'Rayan',
  'Lorran',
  'Endrick',
  'Breno',
  'Riquelme',
  'Matheus',
  'João Pedro',
  'Luis Guilherme',
  'Kayky',
  'Vitor',
  'Pedrinho',
  'Gabriel',
  'Davi',
  'Yago',
  'Thalles',
  'Kauan',
  'Ryan',
  'Luan',
  'Arthur',
  'Bernardo',
  'Otávio',
  'Murilo',
  'Enzo',
  'Pietro',
  'Calebe',
  'Ítalo',
  'Weskley',
  'Bruno',
];

const LAST_NAMES_YOUTH = [
  'Nogueira',
  'Andrade',
  'Gonçalves',
  'Teixeira',
  'Prado',
  'Monteiro',
  'Rezende',
  'Sampaio',
  'Cavalcanti',
  'Bezerra',
  'Fagundes',
  'Machado',
  'Silveira',
  'Pacheco',
  'França',
  'Araújo',
  'Dantas',
  'Ribeiro',
  'Moraes',
  'Cardoso',
  'Bastos',
  'Queiroz',
  'Menezes',
  'Siqueira',
];

const ROLE_TO_POS: Record<DetailedRole, Position> = {
  GOL: 'GK',
  ZAG: 'DF',
  LAT: 'DF',
  VOL: 'MF',
  MEI: 'MF',
  ATA: 'FW',
};

const YOUTH_SKILLS_BY_ROLE: Record<DetailedRole, string[]> = {
  GOL: ['Reflexo Felino', 'Saída de Gol Segura', 'Pegador de Pênaltis', 'Reposição Precisa'],
  ZAG: ['Impulsão Aérea', 'Antecipação Limpa', 'Saída Qualificada', 'Xerife da Base'],
  LAT: ['Fôlego Incansável', 'Cruzamento Venenoso', 'Apoio em Velocidade', 'Marcação Curta'],
  VOL: ['Desarme Firme', 'Motorzinho do Meio', 'Passe Vertical', 'Leitura Tática'],
  MEI: ['Base no Futsal', 'Visão de Camisa 10', 'Bola Parada Calibrada', 'Drible em Espaço Curto'],
  ATA: ['Finalizador Nato', 'Drible em Velocidade', 'Faro de Artilheiro', 'Explosão no 1x1'],
};

const EVALUATOR_NOTES_BY_TIER: Record<YouthPotentialTier, string[]> = {
  'Joia da Base': [
    'Sobrou tecnicamente nos coletivos da peneira; teto de titular absoluto e seleção.',
    'Talento raríssimo para a idade, tomada de decisão de atleta profissional.',
    'Dominou o teste físico e técnico do início ao fim. Joia para lapidar com carinho.',
  ],
  'Grande Promessa': [
    'Ótima coordenação com bola e personalidade forte contra marcadores mais velhos.',
    'Destacou-se pela intensidade e fundamentos acima da média da categoria.',
    'Margem clara de evolução rápida nos treinos da base do clube.',
  ],
  'Talento Promissor': [
    'Bons fundamentos básicos e disciplina tática interessante para compor a base.',
    'Mostrou poder de reação no segundo tempo da peneira; pode crescer bastante no CT.',
  ],
  'Em Lapidação': [
    'Atleta esforçado e competitivo, precisa ganhar rodagem física na categoria.',
    'Perfil útil para preencher elenco Sub-17/Sub-20 enquanto amadurece fundamentos.',
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getCategoryFromAge(age: number): 'Sub-15' | 'Sub-17' | 'Sub-20' {
  if (age <= 15) return 'Sub-15';
  if (age <= 17) return 'Sub-17';
  return 'Sub-20';
}

export function getPotentialTier(potential: number): YouthPotentialTier {
  if (potential >= 87) return 'Joia da Base';
  if (potential >= 82) return 'Grande Promessa';
  if (potential >= 77) return 'Talento Promissor';
  return 'Em Lapidação';
}

export function getTryoutCost(club: Club, tier: YouthTryoutTier): number {
  const divMult = getClubEconomyProfile(club).youthTryoutMult;

  const rawBase =
    tier === 'COMUNITARIA' ? 180000 : tier === 'ESTADUAL' ? 400000 : 820000;

  const raw = rawBase * divMult;
  const step = raw < 40_000 ? 1_000 : 5_000;
  return Math.max(12_000, Math.round(raw / step) * step);
}

export function getYouthUpgradeCost(currentLevel: number, club: Club): number {
  const divMult = getClubEconomyProfile(club).youthUpgradeMult;
  const raw = currentLevel * 1_400_000 * divMult;
  const step = raw < 200_000 ? 10_000 : 25_000;
  return Math.max(120_000, Math.round(raw / step) * step);
}

function calculateYouthMarketValue(
  overall: number,
  potential: number,
  age: number,
  club?: Club
): number {
  const profile = getClubEconomyProfile(club);
  const valScale = Math.max(0.28, profile.playerValueScale);
  const base = Math.max(45_000, (overall - 50) * 180_000 * valScale);
  const potPremium = Math.max(0, potential - 72) * 140_000 * valScale;
  const ageFactor = age <= 16 ? 1.2 : age === 17 ? 1.1 : 1.0;
  const step = base < 200_000 ? 10_000 : 25_000;
  return Math.max(
    profile.playerValueFloor,
    Math.round(((base + potPremium) * ageFactor) / step) * step
  );
}

function calculateYouthRookieWage(overall: number, club: Club): number {
  const profile = getClubEconomyProfile(club);
  const raw = profile.youthWageFloor + Math.max(0, overall - 52) * 700 * profile.playerWageScale;
  const clamped = Math.min(profile.youthWageCap, Math.max(profile.youthWageFloor, raw));
  const step = clamped < 6_000 ? 200 : 500;
  return Math.max(profile.youthWageFloor, Math.round(clamped / step) * step);
}

function buildGeneratedYouthBoy(params: {
  club: Club;
  role: DetailedRole;
  age: number;
  ovrBonus: number;
  potBonus: number;
  tryoutSource: string;
  isNationalOrigin?: boolean;
  currentDate: string;
  usedNames: Set<string>;
  indexSeed: number;
}): YouthAcademyBoy {
  const {
    club,
    role,
    age,
    ovrBonus,
    potBonus,
    tryoutSource,
    isNationalOrigin,
    currentDate,
    usedNames,
    indexSeed,
  } = params;

  let fullName = `${pickRandom(FIRST_NAMES_YOUTH)} ${pickRandom(LAST_NAMES_YOUTH)}`;
  let guard = 0;
  while (usedNames.has(fullName) && guard < 15) {
    fullName = `${pickRandom(FIRST_NAMES_YOUTH)} ${pickRandom(LAST_NAMES_YOUTH)}`;
    guard++;
  }
  usedNames.add(fullName);

  const academyLevel = Math.max(1, Math.min(5, club.finances.youthAcademyLevel || 1));
  const divOffset =
    club.division === 'D' ? -4 : club.division === 'C' ? -2 : club.division === 'B' ? -1 : 0;

  // Younger boys start slightly lower OVR with plenty of room to grow in the Base
  const ageOvrOffset = age === 15 ? -3 : age === 16 ? -1 : age === 17 ? 0 : 2;
  const rawOvr =
    59 +
    academyLevel * 2 +
    divOffset +
    ageOvrOffset +
    ovrBonus +
    Math.floor(Math.random() * 5);
  const overall = Math.max(55, Math.min(76, rawOvr));

  const rollGem = Math.random();
  const rareSpike = rollGem > 0.86 ? 6 : rollGem > 0.62 ? 3 : 0;
  const rawPot =
    73 +
    academyLevel * 2 +
    potBonus +
    rareSpike +
    Math.floor(Math.random() * 5);
  const potential = Math.max(overall + 6, Math.min(94, rawPot));

  const potentialTier = getPotentialTier(potential);
  const statePool = STATE_CITIES[club.state] || ALL_BRAZIL_CITIES;
  const originCity = isNationalOrigin ? pickRandom(ALL_BRAZIL_CITIES) : pickRandom(statePool);

  const footRoll = Math.random();
  const preferredFoot: 'Destro' | 'Canhoto' | 'Ambidestro' =
    footRoll > 0.92 ? 'Ambidestro' : footRoll > 0.28 ? 'Destro' : 'Canhoto';

  const marketValue = calculateYouthMarketValue(overall, potential, age, club);
  const wage = calculateYouthRookieWage(overall, club);

  const player: Player = ensurePlayerContractFields(
    {
      id: `youth_${club.id}_${Date.now()}_${indexSeed}_${Math.floor(Math.random() * 9999)}`,
      name: fullName,
      nationality: club.country || 'Brasil',
      position: ROLE_TO_POS[role],
      detailedRole: role,
    overall,
    potential,
    trainingProgress: Math.floor(Math.random() * 35),
    evolutionsCount: 0,
    age,
    condition: 100,
    morale: 'Excelente',
    wage,
    marketValue,
    contractYears: 3,
    preferredFoot,
    specialSkill: pickRandom(YOUTH_SKILLS_BY_ROLE[role]),
    matches: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    isSuspended: false,
    injuryWeeks: 0,
    isStarter: false,
    isSubstitute: false,
      squadNumber: 40 + (indexSeed % 50),
      ratingAverage: 0,
    },
    club.country || 'Brasil'
  );

  return {
    id: `yboy_${player.id}`,
    player,
    originCity,
    tryoutSource,
    joinedDate: currentDate,
    categoryLabel: getCategoryFromAge(age),
    potentialTier,
    evaluatorNote: pickRandom(EVALUATOR_NOTES_BY_TIER[potentialTier]),
    initialOverall: player.overall,
    individualFocus: 'PADRAO',
    academyTrainingSessions: 0,
  };
}

export function createInitialYouthAcademy(
  club: Club,
  currentDate: string = '2026-01-15'
): YouthAcademyState {
  const usedNames = new Set<string>(club.squad.map((p) => p.name));
  const initialRoles: DetailedRole[] = ['ATA', 'MEI', 'ZAG', 'GOL'];
  const initialAges = [16, 15, 17, 15];

  const players: YouthAcademyBoy[] = initialRoles.map((role, idx) =>
    buildGeneratedYouthBoy({
      club,
      role,
      age: initialAges[idx],
      ovrBonus: 1,
      potBonus: 2,
      tryoutSource: 'Formação Interna do CT',
      isNationalOrigin: false,
      currentDate,
      usedNames,
      indexSeed: idx + 1,
    })
  );

  return {
    players,
    lastTryoutCandidates: [],
    totalTryoutsHeld: 0,
    totalPromotedCount: 0,
    trainingFocus: 'EQUILIBRADO',
    trainingIntensity: 'MODERADO',
    totalTrainingSessions: 0,
  };
}

export function ensureClubYouthAcademy(club: Club, currentDate: string = '2026-01-15'): Club {
  if (club.youthAcademy && Array.isArray(club.youthAcademy.players)) {
    return {
      ...club,
      youthAcademy: {
        ...club.youthAcademy,
        players: club.youthAcademy.players.slice(0, MAX_YOUTH_ACADEMY_PLAYERS).map((b) => ({
          ...b,
          initialOverall: b.initialOverall ?? Math.max(45, b.player.overall - (b.player.evolutionsCount || 0)),
          individualFocus: b.individualFocus ?? 'PADRAO',
          academyTrainingSessions: b.academyTrainingSessions ?? 0,
        })),
        lastTryoutCandidates: club.youthAcademy.lastTryoutCandidates || [],
        totalTryoutsHeld: club.youthAcademy.totalTryoutsHeld || 0,
        totalPromotedCount: club.youthAcademy.totalPromotedCount || 0,
        trainingFocus: club.youthAcademy.trainingFocus || 'EQUILIBRADO',
        trainingIntensity: club.youthAcademy.trainingIntensity || 'MODERADO',
        totalTrainingSessions: club.youthAcademy.totalTrainingSessions || 0,
      },
    };
  }
  return {
    ...club,
    youthAcademy: createInitialYouthAcademy(club, currentDate),
  };
}

export function runClubYouthTryout(params: {
  club: Club;
  tier: YouthTryoutTier;
  roleFocus: DetailedRole | 'ALL';
  ageGroup: YouthAgeGroupFilter;
  currentDate: string;
  currentRound: number;
}): {
  success: boolean;
  errorMessage?: string;
  updatedClub: Club;
  candidates: YouthTryoutCandidate[];
  inboxMessage?: InboxMessage;
} {
  const { club, tier, roleFocus, ageGroup, currentDate, currentRound } = params;
  const tierMeta = YOUTH_TRYOUT_TIERS[tier];
  const cost = getTryoutCost(club, tier);

  if (club.finances.balance < cost) {
    return {
      success: false,
      errorMessage: `Saldo insuficiente em caixa. A ${tierMeta.shortLabel} custa R$ ${cost.toLocaleString('pt-BR')}.`,
      updatedClub: club,
      candidates: [],
    };
  }

  const currentAcademy = club.youthAcademy || createInitialYouthAcademy(club, currentDate);
  const usedNames = new Set<string>([
    ...club.squad.map((p) => p.name),
    ...currentAcademy.players.map((b) => b.player.name),
  ]);

  const allRoles: DetailedRole[] = ['ATA', 'MEI', 'VOL', 'LAT', 'ZAG', 'GOL'];

  const pickAge = (): number => {
    if (ageGroup === 'SUB_15') return Math.random() > 0.45 ? 15 : 14;
    if (ageGroup === 'SUB_17') return Math.random() > 0.5 ? 16 : 17;
    if (ageGroup === 'SUB_20') return 18;
    const ages = [14, 15, 15, 16, 16, 17, 17, 18];
    return pickRandom(ages);
  };

  const candidates: YouthTryoutCandidate[] = Array.from({
    length: tierMeta.candidatesCount,
  }).map((_, idx) => {
    const chosenRole =
      roleFocus !== 'ALL'
        ? idx === tierMeta.candidatesCount - 1 && Math.random() > 0.65
          ? pickRandom(allRoles)
          : roleFocus
        : pickRandom(allRoles);

    const boy = buildGeneratedYouthBoy({
      club,
      role: chosenRole,
      age: pickAge(),
      ovrBonus: tierMeta.ovrBonus,
      potBonus: tierMeta.potentialBonus,
      tryoutSource: tierMeta.shortLabel,
      isNationalOrigin: tier === 'NACIONAL',
      currentDate,
      usedNames,
      indexSeed: idx + 10,
    });

    return {
      ...boy,
      recruited: false,
      dismissed: false,
    };
  });

  // Sort candidates by potential descending so best standouts lead the report
  candidates.sort(
    (a, b) =>
      (b.player.potential || 0) - (a.player.potential || 0) ||
      b.player.overall - a.player.overall
  );

  const bestCandidate = candidates[0];
  const updatedAcademy: YouthAcademyState = {
    ...currentAcademy,
    lastTryoutCandidates: candidates,
    lastTryoutDate: currentDate,
    lastTryoutLabel: tierMeta.label,
    totalTryoutsHeld: currentAcademy.totalTryoutsHeld + 1,
  };

  const updatedClub: Club = {
    ...club,
    finances: recordFinanceLedgerMutation(club.finances, {
      date: currentDate,
      category: 'INFRASTRUCTURE',
      type: 'EXPENSE',
      amount: cost,
      description: `Peneira da Base: ${tierMeta.label}`,
      applyToBalance: true,
    }),
    youthAcademy: updatedAcademy,
  };

  const inboxMessage: InboxMessage = {
    id: `msg_tryout_${Date.now()}`,
    title: `Relatório de Peneira: ${candidates.length} Garotos Selecionados`,
    message: `A comissão da base concluiu a ${tierMeta.label}. Entre os avaliados, o principal destaque foi ${bestCandidate.player.name} (${bestCandidate.player.detailedRole}, ${bestCandidate.player.age} anos, de ${bestCandidate.originCity} · Potencial ${bestCandidate.player.potential}). Acesse Olheiros & Base para aprovar os garotos até o limite de ${MAX_YOUTH_ACADEMY_PLAYERS} atletas na base.`,
    date: currentDate,
    round: currentRound,
    read: false,
    type: 'SCOUTING',
  };

  return {
    success: true,
    updatedClub,
    candidates,
    inboxMessage,
  };
}

export function recruitCandidateToAcademy(
  club: Club,
  candidateId: string,
  currentDate: string
): {
  success: boolean;
  errorMessage?: string;
  updatedClub: Club;
  recruitedBoy?: YouthAcademyBoy;
} {
  const academy = club.youthAcademy || createInitialYouthAcademy(club, currentDate);

  if (academy.players.length >= MAX_YOUTH_ACADEMY_PLAYERS) {
    return {
      success: false,
      errorMessage: `A base do clube já atingiu o limite máximo de ${MAX_YOUTH_ACADEMY_PLAYERS} jogadores (${MAX_YOUTH_ACADEMY_PLAYERS}/${MAX_YOUTH_ACADEMY_PLAYERS}). Promova um jovem ao elenco principal ou dispense alguém da base para abrir vaga.`,
      updatedClub: club,
    };
  }

  const candidate = academy.lastTryoutCandidates.find((c) => c.id === candidateId);
  if (!candidate || candidate.recruited || candidate.dismissed) {
    return {
      success: false,
      errorMessage: 'Candidato não encontrado ou já avaliado.',
      updatedClub: club,
    };
  }

  const newBoy: YouthAcademyBoy = {
    id: candidate.id,
    player: candidate.player,
    originCity: candidate.originCity,
    tryoutSource: candidate.tryoutSource,
    joinedDate: currentDate,
    categoryLabel: candidate.categoryLabel,
    potentialTier: candidate.potentialTier,
    evaluatorNote: candidate.evaluatorNote,
  };

  const updatedAcademy: YouthAcademyState = {
    ...academy,
    players: [...academy.players, newBoy],
    lastTryoutCandidates: academy.lastTryoutCandidates.map((c) =>
      c.id === candidateId ? { ...c, recruited: true } : c
    ),
  };

  return {
    success: true,
    recruitedBoy: newBoy,
    updatedClub: {
      ...club,
      youthAcademy: updatedAcademy,
    },
  };
}

export function dismissTryoutCandidateFromList(club: Club, candidateId: string): Club {
  if (!club.youthAcademy) return club;
  return {
    ...club,
    youthAcademy: {
      ...club.youthAcademy,
      lastTryoutCandidates: club.youthAcademy.lastTryoutCandidates.map((c) =>
        c.id === candidateId ? { ...c, dismissed: true } : c
      ),
    },
  };
}

export function releaseBoyFromYouthAcademy(club: Club, boyId: string): Club {
  if (!club.youthAcademy) return club;
  return {
    ...club,
    youthAcademy: {
      ...club.youthAcademy,
      players: club.youthAcademy.players.filter((b) => b.id !== boyId),
    },
  };
}

export function promoteBoyToSeniorSquad(
  club: Club,
  boyId: string,
  currentDate: string,
  currentRound: number
): {
  success: boolean;
  errorMessage?: string;
  updatedClub: Club;
  promotedPlayer?: Player;
  inboxMessage?: InboxMessage;
} {
  const academy = club.youthAcademy;
  if (!academy) {
    return { success: false, errorMessage: 'Base não inicializada.', updatedClub: club };
  }

  if (club.squad.length >= MAX_SQUAD_SIZE) {
    return {
      success: false,
      errorMessage: `Limite máximo de ${MAX_SQUAD_SIZE} jogadores no elenco profissional atingido (${club.squad.length}/${MAX_SQUAD_SIZE}). Venda ou empreste um atleta antes de promover da base.`,
      updatedClub: club,
    };
  }

  const boy = academy.players.find((b) => b.id === boyId);
  if (!boy) {
    return { success: false, errorMessage: 'Atleta da base não encontrado.', updatedClub: club };
  }

  const eligibility = canPromoteYouthBoy(boy);
  if (!eligibility.allowed) {
    return {
      success: false,
      errorMessage: `${boy.player.name} tem ${boy.player.age} anos (${boy.categoryLabel}). Só é permitido subir ao profissional atletas com ${MIN_YOUTH_PROMOTION_AGE} anos ou mais. Continue treinando-o na base!`,
      updatedClub: club,
    };
  }

  const usedNumbers = new Set(club.squad.map((p) => p.squadNumber));
  let nextSquadNumber = 12;
  while (usedNumbers.has(nextSquadNumber) && nextSquadNumber < 99) {
    nextSquadNumber++;
  }
  const promotedPlayer: Player = ensurePlayerContractFields({
    ...boy.player,
    squadNumber: nextSquadNumber,
    contractYears: 3,
    isStarter: false,
    isSubstitute: true,
    morale: 'Excelente',
    condition: 100,
  });

  const updatedClub: Club = {
    ...club,
    squad: [...club.squad, promotedPlayer],
    youthAcademy: {
      ...academy,
      players: academy.players.filter((b) => b.id !== boyId),
      totalPromotedCount: academy.totalPromotedCount + 1,
    },
  };

  const inboxMessage: InboxMessage = {
    id: `msg_youth_promo_${Date.now()}_${promotedPlayer.id}`,
    title: `Cria da Base Promovido: ${promotedPlayer.name} (#${nextSquadNumber})`,
    message: `O jovem ${promotedPlayer.name} (${promotedPlayer.detailedRole}, ${promotedPlayer.age} anos, Força ${promotedPlayer.overall} · Potencial ${promotedPlayer.potential}), captado via ${boy.tryoutSource} (${boy.originCity}), assinou seu primeiro contrato profissional de 3 anos e já integra o elenco principal do ${club.name}!`,
    date: currentDate,
    round: currentRound,
    read: false,
    type: 'SCOUTING',
  };

  return {
    success: true,
    updatedClub,
    promotedPlayer,
    inboxMessage,
  };
}

export function checkAndRunAutoTryout(params: {
  club: Club;
  currentDate: string;
  currentRound: number;
}): {
  updatedClub: Club;
  triggered: boolean;
  inboxMessages: InboxMessage[];
} {
  const { club, currentDate, currentRound } = params;
  const academy = club.youthAcademy;
  if (!academy) {
    return { updatedClub: club, triggered: false, inboxMessages: [] };
  }

  const frequency = academy.autoTryoutFrequency || 'OFF';
  if (frequency === 'OFF') {
    return { updatedClub: club, triggered: false, inboxMessages: [] };
  }

  const freqConfig = AUTO_TRYOUT_FREQUENCY_CONFIG[frequency];
  const lastDate = academy.lastAutoTryoutDate || academy.lastTryoutDate;

  let shouldTrigger = false;
  if (!lastDate) {
    shouldTrigger = true;
  } else {
    const tCurr = new Date(currentDate).getTime();
    const tLast = new Date(lastDate).getTime();
    const elapsedDays = Math.round((tCurr - tLast) / (24 * 60 * 60 * 1000));
    if (elapsedDays >= freqConfig.days) {
      shouldTrigger = true;
    }
  }

  if (!shouldTrigger) {
    return { updatedClub: club, triggered: false, inboxMessages: [] };
  }

  const tier: YouthTryoutTier = academy.autoTryoutTier || 'ESTADUAL';
  const roleFocus: DetailedRole | 'ALL' = academy.autoTryoutRoleFocus || 'ALL';
  const ageGroup: YouthAgeGroupFilter = academy.autoTryoutAgeGroup || 'ALL';
  const autoRecruitBest = academy.autoRecruitBestGem !== false;

  let chosenTier = tier;
  let cost = getTryoutCost(club, chosenTier);

  // If insufficient balance, try fallback to COMUNITARIA, otherwise suspend and notify
  if (club.finances.balance < cost) {
    if (chosenTier !== 'COMUNITARIA' && club.finances.balance >= getTryoutCost(club, 'COMUNITARIA')) {
      chosenTier = 'COMUNITARIA';
      cost = getTryoutCost(club, chosenTier);
    } else {
      const suspendedMsg: InboxMessage = {
        id: `msg_tryout_suspended_${Date.now()}`,
        title: `Peneira Automática da Base Suspensa: Caixa Insuficiente`,
        message: `A comissão técnica programou a seletiva ${freqConfig.shortLabel}, mas o ${club.name} possui R$ ${club.finances.balance.toLocaleString('pt-BR')} em caixa, abaixo do custo de R$ ${cost.toLocaleString('pt-BR')}. A peneira automática será retomada assim que o saldo estiver regularizado.`,
        date: currentDate,
        round: currentRound,
        read: false,
        type: 'FINANCE',
      };
      return {
        updatedClub: {
          ...club,
          youthAcademy: {
            ...academy,
            lastAutoTryoutDate: currentDate,
          },
        },
        triggered: false,
        inboxMessages: [suspendedMsg],
      };
    }
  }

  const tryoutRes = runClubYouthTryout({
    club,
    tier: chosenTier,
    roleFocus,
    ageGroup,
    currentDate,
    currentRound,
  });

  if (!tryoutRes.success) {
    return { updatedClub: club, triggered: false, inboxMessages: [] };
  }

  let finalClub = tryoutRes.updatedClub;
  const inboxMessages: InboxMessage[] = [];

  // Auto-recruit top prodigy if enabled and space exists
  if (autoRecruitBest && tryoutRes.candidates.length > 0) {
    const curPlayersCount = finalClub.youthAcademy?.players.length || 0;
    if (curPlayersCount < MAX_YOUTH_ACADEMY_PLAYERS) {
      const topBoy = tryoutRes.candidates[0];
      const recruitRes = recruitCandidateToAcademy(finalClub, topBoy.id, currentDate);
      if (recruitRes.success) {
        finalClub = recruitRes.updatedClub;
        inboxMessages.push({
          id: `msg_auto_recruit_${Date.now()}`,
          title: `Peneira Automática (${freqConfig.shortLabel}): ${topBoy.player.name} Integrado à Base!`,
          message: `A peneira automática ${freqConfig.shortLabel} no CT avaliou ${tryoutRes.candidates.length} jovens. O maior destaque, ${topBoy.player.name} (${topBoy.player.detailedRole}, ${topBoy.player.age} anos, Potencial estimado ${topBoy.player.potential}), foi automaticamente aprovado para a academia! Os outros candidatos estão disponíveis em Olheiros & Base.`,
          date: currentDate,
          round: currentRound,
          read: false,
          type: 'SCOUTING',
        });
      }
    } else {
      inboxMessages.push({
        id: `msg_auto_tryout_full_${Date.now()}`,
        title: `Peneira Automática (${freqConfig.shortLabel}): Base com Capacidade Máxima`,
        message: `A peneira automática ${freqConfig.shortLabel} avaliou ${tryoutRes.candidates.length} atletas. Como a base já possui ${MAX_YOUTH_ACADEMY_PLAYERS}/10 promessas, nenhum jovem pôde ser matriculado automaticamente. Acesse Olheiros & Base para gerenciar os garotos.`,
        date: currentDate,
        round: currentRound,
        read: false,
        type: 'SCOUTING',
      });
    }
  } else if (tryoutRes.inboxMessage) {
    inboxMessages.push(tryoutRes.inboxMessage);
  }

  finalClub = {
    ...finalClub,
    youthAcademy: {
      ...finalClub.youthAcademy!,
      lastAutoTryoutDate: currentDate,
    },
  };

  return {
    updatedClub: finalClub,
    triggered: true,
    inboxMessages,
  };
}

export function updateYouthAcademyTrainingPlan(
  club: Club,
  params: {
    trainingFocus?: YouthTrainingFocus;
    trainingIntensity?: YouthTrainingIntensity;
  },
  currentDate: string = '2026-01-15'
): Club {
  const ensured = ensureClubYouthAcademy(club, currentDate);
  const academy = ensured.youthAcademy!;
  return {
    ...ensured,
    youthAcademy: {
      ...academy,
      trainingFocus: params.trainingFocus ?? academy.trainingFocus ?? 'EQUILIBRADO',
      trainingIntensity: params.trainingIntensity ?? academy.trainingIntensity ?? 'MODERADO',
    },
  };
}

export function setYouthBoyIndividualFocus(
  club: Club,
  boyId: string,
  focus: YouthTrainingFocus | 'PADRAO',
  currentDate: string = '2026-01-15'
): Club {
  const ensured = ensureClubYouthAcademy(club, currentDate);
  const academy = ensured.youthAcademy!;
  return {
    ...ensured,
    youthAcademy: {
      ...academy,
      players: academy.players.map((b) =>
        b.id === boyId ? { ...b, individualFocus: focus } : b
      ),
    },
  };
}

export function runYouthAcademyTrainingSession(
  club: Club,
  currentDate: string,
  currentRound: number
): {
  success: boolean;
  errorMessage?: string;
  updatedClub: Club;
  evolvedBoys: Array<{ name: string; role: DetailedRole; newOvr: number; delta: number }>;
  trainedCount: number;
  inboxMessages: InboxMessage[];
} {
  const workingClub = ensureClubYouthAcademy(club, currentDate);
  const academy = workingClub.youthAcademy!;

  if (academy.players.length === 0) {
    return {
      success: false,
      errorMessage: 'Não há garotos alojados na base para treinar. Faça uma peneira primeiro.',
      updatedClub: workingClub,
      evolvedBoys: [],
      trainedCount: 0,
      inboxMessages: [],
    };
  }

  const remainingCooldown = getYouthTrainingCooldownDays(workingClub, currentDate);
  if (remainingCooldown > 0) {
    return {
      success: false,
      errorMessage: `O elenco da base está em recuperação física do último treino especial. Novo treino liberado em ${remainingCooldown} ${
        remainingCooldown === 1 ? 'dia' : 'dias'
      }.`,
      updatedClub: workingClub,
      evolvedBoys: [],
      trainedCount: 0,
      inboxMessages: [],
    };
  }

  const evolvedBoys: Array<{ name: string; role: DetailedRole; newOvr: number; delta: number }> = [];
  const inboxMessages: InboxMessage[] = [];

  const updatedBoys = academy.players.map((boy) => {
    const p = boy.player;
    const pot = p.potential || p.overall + 6;
    const initialOverall =
      boy.initialOverall ?? Math.max(45, p.overall - (p.evolutionsCount || 0));

    if (p.overall >= pot) {
      return {
        ...boy,
        initialOverall,
        academyTrainingSessions: (boy.academyTrainingSessions || 0) + 1,
        player: { ...p, trainingProgress: 100 },
      };
    }

    const rate = getYouthBoyTrainingRate(workingClub, boy);
    const sessionGain = Math.max(14, Math.round(rate.dailyXp * 3.4));
    let progress = (p.trainingProgress || 0) + sessionGain;
    let nextOvr = p.overall;
    let evolutions = p.evolutionsCount || 0;
    let deltaThisSession = 0;

    while (progress >= 100 && nextOvr < pot) {
      progress -= 100;
      nextOvr += 1;
      evolutions += 1;
      deltaThisSession += 1;
    }

    if (deltaThisSession > 0) {
      evolvedBoys.push({
        name: p.name,
        role: p.detailedRole,
        newOvr: nextOvr,
        delta: deltaThisSession,
      });
      inboxMessages.push({
        id: `msg_youth_camp_${Date.now()}_${p.id}_${nextOvr}`,
        title: `Treino da Base: ${p.name} subiu para Força ${nextOvr}!`,
        message: `No treino especial da base (${rate.effectiveFocus}), ${p.name} (${p.detailedRole}, ${p.age} anos) destacou-se e evoluiu +${deltaThisSession} OVR, chegando à Força ${nextOvr} (Potencial ${pot}).`,
        date: currentDate,
        round: currentRound,
        read: false,
        type: 'SCOUTING',
      });
    }

    const updatedMarketValue = calculateYouthMarketValue(nextOvr, pot, p.age, workingClub);
    const updatedWage = calculateYouthRookieWage(nextOvr, workingClub);

    return {
      ...boy,
      initialOverall,
      academyTrainingSessions: (boy.academyTrainingSessions || 0) + 1,
      player: {
        ...p,
        overall: nextOvr,
        trainingProgress: nextOvr >= pot ? 100 : Math.min(99, progress),
        evolutionsCount: evolutions,
        marketValue: updatedMarketValue,
        wage: updatedWage,
      },
    };
  });

  return {
    success: true,
    updatedClub: {
      ...workingClub,
      youthAcademy: {
        ...academy,
        players: updatedBoys,
        lastTrainingSessionDate: currentDate,
        totalTrainingSessions: (academy.totalTrainingSessions || 0) + 1,
      },
    },
    evolvedBoys,
    trainedCount: updatedBoys.length,
    inboxMessages,
  };
}

export function progressYouthAcademyDays(
  club: Club,
  days: number,
  currentDate: string,
  currentRound: number,
  emitInbox: boolean = true
): {
  updatedClub: Club;
  inboxMessages: InboxMessage[];
} {
  let workingClub = club;
  const aggregatedInbox: InboxMessage[] = [];

  // Check and execute auto-tryouts if due
  if (days > 0 && workingClub.youthAcademy?.autoTryoutFrequency && workingClub.youthAcademy.autoTryoutFrequency !== 'OFF') {
    const autoTryoutRes = checkAndRunAutoTryout({
      club: workingClub,
      currentDate,
      currentRound,
    });
    if (autoTryoutRes.triggered || autoTryoutRes.inboxMessages.length > 0) {
      workingClub = autoTryoutRes.updatedClub;
      if (emitInbox) {
        aggregatedInbox.push(...autoTryoutRes.inboxMessages);
      }
    }
  }

  if (!workingClub.youthAcademy || workingClub.youthAcademy.players.length === 0 || days <= 0) {
    return { updatedClub: workingClub, inboxMessages: aggregatedInbox };
  }

  const inboxMessages: InboxMessage[] = [];

  const updatedBoys = workingClub.youthAcademy.players.map((boy) => {
    const p = boy.player;
    const pot = p.potential || p.overall + 6;
    const initialOverall =
      boy.initialOverall ?? Math.max(45, p.overall - (p.evolutionsCount || 0));

    if (p.overall >= pot) {
      return {
        ...boy,
        initialOverall,
        player: { ...p, trainingProgress: 100 },
      };
    }

    const rate = getYouthBoyTrainingRate(workingClub, boy);
    let progress = (p.trainingProgress || 0) + days * rate.dailyXp;
    let nextOvr = p.overall;
    let evolutions = p.evolutionsCount || 0;

    while (progress >= 100 && nextOvr < pot) {
      progress -= 100;
      nextOvr += 1;
      evolutions += 1;

      if (emitInbox) {
        inboxMessages.push({
          id: `msg_youth_evo_${Date.now()}_${p.id}_${nextOvr}`,
          title: `Evolução na Base: ${p.name} subiu para Força ${nextOvr}!`,
          message: `Os treinos na categoria ${boy.categoryLabel} (${rate.effectiveFocus}) surtiram efeito! O garoto ${p.name} (${p.detailedRole}, ${p.age} anos) evoluiu para Força ${nextOvr} (Potencial estimado: ${pot}).`,
          date: currentDate,
          round: currentRound,
          read: false,
          type: 'SCOUTING',
        });
      }
    }

    const updatedMarketValue = calculateYouthMarketValue(nextOvr, pot, p.age, workingClub);
    const updatedWage = calculateYouthRookieWage(nextOvr, workingClub);

    return {
      ...boy,
      initialOverall,
      player: {
        ...p,
        overall: nextOvr,
        trainingProgress: nextOvr >= pot ? 100 : Math.min(99, progress),
        evolutionsCount: evolutions,
        marketValue: updatedMarketValue,
        wage: updatedWage,
      },
    };
  });

  return {
    updatedClub: {
      ...workingClub,
      youthAcademy: {
        ...workingClub.youthAcademy,
        players: updatedBoys,
      },
    },
    inboxMessages: [...aggregatedInbox, ...inboxMessages],
  };
}

export function processAnnualYouthAcademyRollover(club: Club): Club {
  if (!club.youthAcademy) return club;
  const agedPlayers = club.youthAcademy.players.map((boy) => {
    const nextAge = boy.player.age + 1;
    return {
      ...boy,
      categoryLabel: getCategoryFromAge(nextAge),
      player: {
        ...boy.player,
        age: nextAge,
      },
    };
  });

  return {
    ...club,
    youthAcademy: {
      ...club.youthAcademy,
      players: agedPlayers,
    },
  };
}

export function buildYouthTurned16InboxMessages(
  beforeClub: Club | undefined,
  afterClub: Club | undefined,
  currentDate: string,
  currentRound: number
): InboxMessage[] {
  if (!beforeClub?.youthAcademy || !afterClub?.youthAcademy) return [];
  const prevAges = new Map(beforeClub.youthAcademy.players.map((b) => [b.id, b.player.age]));
  const newlyEligible = afterClub.youthAcademy.players.filter((b) => {
    const prevAge = prevAges.get(b.id);
    return prevAge !== undefined && prevAge < MIN_YOUTH_PROMOTION_AGE && b.player.age >= MIN_YOUTH_PROMOTION_AGE;
  });

  if (newlyEligible.length === 0) return [];

  const summary = newlyEligible
    .map((b) => `${b.player.name} (${b.player.detailedRole}, Força ${b.player.overall}/Pot ${b.player.potential})`)
    .join(', ');

  return [
    {
      id: `msg_youth_16_${Date.now()}_${afterClub.id}`,
      title: `🎓 Base: ${newlyEligible.length} ${newlyEligible.length === 1 ? 'garoto completou' : 'garotos completaram'} 16 anos e já podem subir!`,
      message: `Com a virada da temporada, ${summary} atingiu a idade mínima de ${MIN_YOUTH_PROMOTION_AGE} anos e agora está liberado para ser promovido ao elenco profissional quando você desejar (ou seguir evoluindo no CT da Base).`,
      date: currentDate,
      round: currentRound,
      read: false,
      type: 'SCOUTING',
    },
  ];
}

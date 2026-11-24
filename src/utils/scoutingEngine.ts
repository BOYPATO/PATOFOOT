import {
  Club,
  DetailedRole,
  InboxMessage,
  Player,
  Position,
  ScoutAgeFocus,
  ScoutMissionDepth,
  ScoutRecommendationTier,
  ScoutRegionCategory,
  ScoutStaffMember,
  ScoutedProspect,
  ScoutingMission,
  ScoutingNetworkState,
} from '../types/game';
import { recordFinanceLedgerMutation } from './financialFairPlayEngine';
import { getClubEconomyProfile } from './clubEconomyScale';
import { recalculatePlayerEconomics } from './clubRatingsEngine';

export interface ScoutingRegionInfo {
  id: string;
  name: string;
  shortName: string;
  country: string;
  category: ScoutRegionCategory;
  statesOrCities: string;
  talentProfile: string;
  baseCost: number;
  baseOvrRange: [number, number];
  potentialCeilingBonus: number;
  marketMultiplier: number;
  preferredRoles: DetailedRole[];
  originClubs: string[];
  firstNames: string[];
  lastNames: string[];
}

export const SCOUTING_REGIONS: ScoutingRegionInfo[] = [
  // BRASIL — Regiões Específicas
  {
    id: 'br_sudeste',
    name: 'Região Sudeste',
    shortName: 'Sudeste (BR)',
    country: 'Brasil',
    category: 'BRASIL',
    statesOrCities: 'São Paulo, Rio de Janeiro, Minas Gerais e Espírito Santo',
    talentProfile: 'Meias técnicos, pontas agudos e centros formadores de elite',
    baseCost: 160000,
    baseOvrRange: [66, 77],
    potentialCeilingBonus: 3,
    marketMultiplier: 1.05,
    preferredRoles: ['MEI', 'ATA', 'VOL', 'LAT'],
    originClubs: [
      'Ferroviária-SP',
      'Desportivo Brasil',
      'Audax Rio',
      'Coimbra-MG',
      'Santo André',
      'Portuguesa-RJ',
      'Ituano Sub-20',
      'Rio Branco-ES',
    ],
    firstNames: ['Kauã', 'Breno', 'Riquelme', 'Estevão', 'Lorran', 'Matheus', 'Guilherme', 'Yago', 'Thalles', 'Vitor', 'Rayan', 'Kayky'],
    lastNames: ['Nogueira', 'Prado', 'Andrade', 'Teixeira', 'Gonçalves', 'Ferreira', 'Monteiro', 'Bastos', 'Rezende', 'Sampaio', 'França', 'Pacheco'],
  },
  {
    id: 'br_sul',
    name: 'Região Sul',
    shortName: 'Sul (BR)',
    country: 'Brasil',
    category: 'BRASIL',
    statesOrCities: 'Rio Grande do Sul, Paraná e Santa Catarina',
    talentProfile: 'Zagueiros firmes, volantes intensos e goleiros de reflexo apurado',
    baseCost: 150000,
    baseOvrRange: [65, 76],
    potentialCeilingBonus: 2,
    marketMultiplier: 0.98,
    preferredRoles: ['ZAG', 'VOL', 'GOL', 'LAT'],
    originClubs: [
      'Azuriz-PR',
      'Barra-SC',
      'Novo Hamburgo',
      'São Joseense-PR',
      'Marcílio Dias',
      'Esportivo-RS',
      'Pelotas',
      'Camboriú',
    ],
    firstNames: ['Otávio', 'Murilo', 'Arthur', 'Bernardo', 'Lorenzo', 'Ramiro', 'Gustavo', 'Eduardo', 'Cassiano', 'Léo', ' Diogo', 'Henrique'],
    lastNames: ['Zimmermann', 'Machado', 'Fagundes', 'Bortoluzzi', 'Dorneles', 'Silveira', 'Trevisan', 'Krieger', 'Cardoso', 'Vargas', 'Menezes', 'Dalpiaz'],
  },
  {
    id: 'br_nordeste',
    name: 'Região Nordeste',
    shortName: 'Nordeste (BR)',
    country: 'Brasil',
    category: 'BRASIL',
    statesOrCities: 'Bahia, Pernambuco, Ceará, Rio Grande do Norte e Alagoas',
    talentProfile: 'Atacantes dribladores, laterais ofensivos e talentos de explosão',
    baseCost: 140000,
    baseOvrRange: [64, 75],
    potentialCeilingBonus: 3,
    marketMultiplier: 0.9,
    preferredRoles: ['ATA', 'LAT', 'MEI', 'VOL'],
    originClubs: [
      'Retrô-PE',
      'Jacuipense-BA',
      'Floresta-CE',
      'VF4-PB',
      'Atlético Cearense',
      'ASA de Arapiraca',
      'Juazeirense',
      'Potiguar de Mossoró',
    ],
    firstNames: ['Erick', 'Janderson', 'Ruan', 'Tarcísio', 'Moisés', 'Ciel', 'Carlinhos', 'Kevyn', 'Kauan', 'Ítalo', 'Pedrinho', 'Wanderson'],
    lastNames: ['Bezerra', 'Cavalcanti', 'Dantas', 'Araújo', 'Holanda', 'Alencar', 'Maciel', 'Peixoto', 'Gomes', 'Queiroz', 'Lira', 'Feitosa'],
  },
  {
    id: 'br_centro_norte',
    name: 'Centro-Oeste & Norte',
    shortName: 'Centro-Norte (BR)',
    country: 'Brasil',
    category: 'BRASIL',
    statesOrCities: 'Goiás, Distrito Federal, Pará, Amazonas e Mato Grosso',
    talentProfile: 'Atacantes de força física, vigor atlético e excelente custo-benefício',
    baseCost: 125000,
    baseOvrRange: [63, 74],
    potentialCeilingBonus: 2,
    marketMultiplier: 0.82,
    preferredRoles: ['ATA', 'VOL', 'ZAG', 'MEI'],
    originClubs: [
      'Trindade-GO',
      'Tuna Luso-PA',
      'Nacional-AM',
      'Mixto-MT',
      'Real Brasília',
      'Anapolina',
      'Castanhal-PA',
      'Luverdense',
    ],
    firstNames: ['Weslley', 'Roni', 'Brenner', 'Marlon', ' Hélio', 'Raimundo', 'Wendel', 'Sávio', 'Neto', 'Calebe', ' Jefferson', 'Talles'],
    lastNames: ['Siqueira', 'Tapajós', ' Pimentel', 'Barreto', 'Mesquita', 'Nunes', 'Valadares', 'Pinheiro', 'Moraes', 'Borges', 'Coutinho', 'Guimarães'],
  },

  // AMÉRICA DO SUL — Países Específicos
  {
    id: 'ar_argentina',
    name: 'Argentina',
    shortName: 'Argentina',
    country: 'Argentina',
    category: 'AMERICA_SUL',
    statesOrCities: 'Buenos Aires, Rosário, Córdoba e La Plata',
    talentProfile: 'Camisas 10 clássicos ("enganches"), centroavantes letais e volantes técnicos',
    baseCost: 260000,
    baseOvrRange: [68, 79],
    potentialCeilingBonus: 4,
    marketMultiplier: 1.18,
    preferredRoles: ['MEI', 'ATA', 'VOL', 'ZAG'],
    originClubs: [
      'Argentinos Juniors',
      'Vélez Sarsfield',
      'Newell’s Old Boys',
      'Banfield',
      'Instituto Córdoba',
      'Ferro Carril Oeste',
      'Belgrano',
      'Gimnasia La Plata',
    ],
    firstNames: ['Mateo', 'Valentín', 'Thiago', 'Bautista', 'Franco', 'Santino', 'Lautaro', 'Julián', 'Santiago', 'Agustín', 'Tomás', 'Ramiro'],
    lastNames: ['Echeverría', 'Perrone', 'Redondo', 'Prestianni', 'Miramón', 'Gondou', 'Solari', ' Lomónaco', 'Giay', 'Zenón', 'Nardoni', 'Pellegrino'],
  },
  {
    id: 'uy_uruguai',
    name: 'Uruguai',
    shortName: 'Uruguai',
    country: 'Uruguai',
    category: 'AMERICA_SUL',
    statesOrCities: 'Montevidéu, Canelones e Maldonado',
    talentProfile: 'Zagueiros implacáveis, volantes combativos e atacantes decisivos',
    baseCost: 230000,
    baseOvrRange: [67, 78],
    potentialCeilingBonus: 3,
    marketMultiplier: 1.08,
    preferredRoles: ['ZAG', 'VOL', 'ATA', 'LAT'],
    originClubs: [
      'Defensor Sporting',
      'Danubio',
      'Liverpool-URU',
      'Montevideo Wanderers',
      'Albion FC',
      'Racing Montevideo',
      'Deportivo Maldonado',
      'Cerro Largo',
    ],
    firstNames: ['Facundo', 'Joaquín', 'Luciano', 'Emiliano', 'Sebastián', 'Matías', 'Bruno', 'Nicolás', 'Ignacio', 'Rodrigo', 'Nahuel', 'Álvaro'],
    lastNames: ['Lavega', 'Boselli', 'Matturro', 'Boggio', 'Rodríguez', 'Olivera', 'Homenchenko', 'Meriano', 'Sosa', 'Quintana', 'barcos', 'Cabrera'].map(
      (s) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1)
    ),
  },
  {
    id: 'co_colombia',
    name: 'Colômbia',
    shortName: 'Colômbia',
    country: 'Colômbia',
    category: 'AMERICA_SUL',
    statesOrCities: 'Medellín, Cali, Barranquilla e Bogotá',
    talentProfile: 'Pontas explosivos, laterais velozes e meio-campistas de transição rápida',
    baseCost: 240000,
    baseOvrRange: [67, 78],
    potentialCeilingBonus: 4,
    marketMultiplier: 1.06,
    preferredRoles: ['ATA', 'LAT', 'MEI', 'VOL'],
    originClubs: [
      'Envigado FC',
      'Deportivo Cali',
      'Deportes Tolima',
      'Fortaleza CEIF',
      'Águilas Doradas',
      'Once Caldas',
      'Deportivo Pereira',
      'Cúcuta Deportivo',
      'Internacional de Bogotá',
    ],
    firstNames: ['Jhon', 'Yaser', 'Óscar', 'Juan Camilo', 'Kevin', 'Andrés', 'Daniel', 'Miguel', 'Tomás', 'Luis', ' Duván', 'Carlos'],
    lastNames: ['Asprilla', 'Solís', 'Cortés', 'Mantilla', 'Portilla', 'Monsalve', 'Gómez', 'Puerta', 'Ángel', 'Manyoma', 'Valoyes', 'Castaño'],
  },
  {
    id: 'ec_equador',
    name: 'Equador',
    shortName: 'Equador',
    country: 'Equador',
    category: 'AMERICA_SUL',
    statesOrCities: 'Quito, Sangolquí e Guayaquil',
    talentProfile: 'Projetos modernos de formação, força atlética e grande margem de revenda',
    baseCost: 220000,
    baseOvrRange: [66, 77],
    potentialCeilingBonus: 4,
    marketMultiplier: 0.96,
    preferredRoles: ['VOL', 'ZAG', 'LAT', 'ATA'],
    originClubs: [
      'Independiente del Valle B',
      'Orense SC',
      'SD Aucas',
      'Universidad Católica-EQU',
      'Guayaquil City FC',
      'Leones FC',
      'Delfín SC',
      'Macará',
    ],
    firstNames: ['Kendry', 'Alan', 'Nilson', 'Joel', 'Patrickson', 'Yaimar', 'Moisés', 'Justin', 'Denil', 'Keny', 'Jeremy', ' Cristhian'],
    lastNames: ['Minda', 'Angulo', 'Ordóñez', 'Vite', 'Medina', 'Cuero', 'Castillo', 'Arroyo', 'Sarmiento', 'Pacho', 'Chávez', 'Preciado'],
  },
  {
    id: 'py_paraguai_chile',
    name: 'Paraguai & Chile',
    shortName: 'Paraguai / Chile',
    country: 'Paraguai / Chile',
    category: 'AMERICA_SUL',
    statesOrCities: 'Assunção, Luque, Santiago e Concepción',
    talentProfile: 'Defensores fortes no jogo aéreo, meias dinâmicos e valores acessíveis',
    baseCost: 205000,
    baseOvrRange: [65, 76],
    potentialCeilingBonus: 3,
    marketMultiplier: 0.92,
    preferredRoles: ['ZAG', 'MEI', 'VOL', 'GOL'],
    originClubs: [
      'Libertad',
      'Guaraní-PAR',
      'Sol de América',
      'Audax Italiano',
      'Huachipato',
      'Palestino',
      'Univ. de Concepción',
    ],
    firstNames: ['Diego', 'Julio', 'Darío', 'Vicente', 'Lucas', 'Matías', 'Damián', 'Enzo', ' Fabián', 'Romeo', 'César', 'Alexander'],
    lastNames: ['Gómez', 'Osorio', 'Pizarro', 'Segovia', 'Bobadilla', 'Assadi', 'Peralta', 'Loyola', 'Villalba', 'Cepeda', 'Tapia', 'Benítez'],
  },

  // INTERNACIONAL — Países & Regiões Específicas
  {
    id: 'pt_portugal_espanha',
    name: 'Portugal & Espanha',
    shortName: 'Península Ibérica',
    country: 'Portugal / Espanha',
    category: 'INTERNACIONAL',
    statesOrCities: 'Braga, Guimarães, Lisboa, Galícia e Andaluzia',
    talentProfile: 'Escola tática europeia, domínio técnico refinado e leitura de espaço',
    baseCost: 380000,
    baseOvrRange: [69, 80],
    potentialCeilingBonus: 4,
    marketMultiplier: 1.28,
    preferredRoles: ['MEI', 'VOL', 'LAT', 'ZAG'],
    originClubs: [
      'Vitória SC B',
      'FC Famalicão',
      'Gil Vicente',
      'Estoril Praia',
      'Celta Fortuna',
      'Las Palmas Atl.',
      'Real Zaragoza',
      'Rio Ave',
    ],
    firstNames: ['Gonçalo', 'Martim', 'Diogo', 'Rodrigo', 'Vasco', 'Afonso', 'Iker', 'Gabri', 'Pablo', ' Hugo', 'Mateus', 'Tiago'],
    lastNames: ['Esteves', 'Fernandes', 'Nascimento', 'Sousa', 'Moreira', 'Moleiro', 'Barrios', 'Torre', 'Ribeiro', 'Novais', 'Gouveia', 'Araújo'],
  },
  {
    id: 'af_africa_ocidental',
    name: 'Nigéria, Gana & Senegal',
    shortName: 'África Ocidental',
    country: 'Nigéria / Gana / Senegal',
    category: 'INTERNACIONAL',
    statesOrCities: 'Lagos, Acra e Dacar',
    talentProfile: 'Explosão física rara, velocidade de transição e teto de evolução altíssimo',
    baseCost: 320000,
    baseOvrRange: [67, 79],
    potentialCeilingBonus: 5,
    marketMultiplier: 1.02,
    preferredRoles: ['ATA', 'VOL', 'ZAG', 'MEI'],
    originClubs: [
      'Right to Dream',
      'Génération Foot',
      'Diambars FC',
      'Enyimba FC',
      'Asante Kotoko',
      'Remo Stars',
      'ASEC Mimosas',
    ],
    firstNames: ['Ibrahim', 'Amadou', 'Lamine', 'Abdul', 'Chidera', 'Gift', 'Pape', 'Moussa', 'Kelechi', 'Ernest', 'Issahaku', 'Sadio'],
    lastNames: ['Osman', 'Diallo', 'Camara', 'Fatawu', 'Orban', ' Nuamah', 'Sarr', 'Ndiaye', 'Onyedika', 'Chukwu', 'Kudus', 'Gueye'],
  },
  {
    id: 'mx_concacaf',
    name: 'México & EUA',
    shortName: 'México / EUA',
    country: 'México / EUA',
    category: 'INTERNACIONAL',
    statesOrCities: 'Pachuca, Guadalajara, Cidade do México e Dallas',
    talentProfile: 'Meias intensos, laterais atléticos e jovens prontos para jogos grandes',
    baseCost: 340000,
    baseOvrRange: [68, 78],
    potentialCeilingBonus: 3,
    marketMultiplier: 1.12,
    preferredRoles: ['MEI', 'LAT', 'ATA', 'GOL'],
    originClubs: [
      'CF Pachuca',
      'Chivas Tapatío',
      'Atlas FC',
      'Club Necaxa',
      'FC Dallas Academy',
      'Philadelphia Union II',
      'Pumas UNAM',
    ],
    firstNames: ['Fidel', 'Gilberto', 'Heriberto', 'Diego', 'Emilio', 'Cade', 'Obed', 'Marcel', 'Rodrigo', 'Gael', 'Mateo', 'Brian'],
    lastNames: ['Ambriz', 'Mora', 'Jurado', 'Luna', 'Vargas', 'Ruiz', 'Huescas', 'Padilla', 'Gutiérrez', 'Cowell', 'Lozano', 'Montiel'],
  },
];

export interface MissionDepthMeta {
  id: ScoutMissionDepth;
  label: string;
  days: number;
  prospectsRange: [number, number];
  costMultiplier: number;
  precisionBonus: number;
  ceilingBonus: number;
  description: string;
}

export const SCOUT_MISSION_DEPTHS: Record<ScoutMissionDepth, MissionDepthMeta> = {
  EXPRESSO: {
    id: 'EXPRESSO',
    label: 'Varredura Expressa (Imediato)',
    days: 0,
    prospectsRange: [4, 4],
    costMultiplier: 1.0,
    precisionBonus: 0,
    ceilingBonus: 0,
    description: 'Análise imediata por vídeo e rede local. Entrega 4 nomes na hora.',
  },
  OBSERVACAO_CURTA: {
    id: 'OBSERVACAO_CURTA',
    label: 'Observação In Loco (3 Dias)',
    days: 3,
    prospectsRange: [5, 6],
    costMultiplier: 1.45,
    precisionBonus: 1,
    ceilingBonus: 2,
    description: 'Viagem de 3 dias acompanhando partidas presenciais. Traz 5 a 6 talentos com maior precisão.',
  },
  IMERSAO_PROFUNDA: {
    id: 'IMERSAO_PROFUNDA',
    label: 'Imersão Completa (7 Dias)',
    days: 7,
    prospectsRange: [6, 8],
    costMultiplier: 2.1,
    precisionBonus: 2,
    ceilingBonus: 4,
    description: 'Cobertura profunda de divisões locais e torneios de base por 7 dias. Maior chance de Joias Raras.',
  },
};

export const SCOUT_AGE_PROFILES: Record<
  ScoutAgeFocus,
  { label: string; ageRange: [number, number]; description: string }
> = {
  JOIAS_BASE: {
    label: 'Joias Sub-20 (16–20 anos)',
    ageRange: [16, 20],
    description: 'Foco máximo em teto de evolução e potencial de revenda.',
  },
  SUB_23: {
    label: 'Promessas Sub-23 (19–23 anos)',
    ageRange: [19, 23],
    description: 'Equilíbrio entre força atual competitiva e margem de crescimento.',
  },
  PRONTOS: {
    label: 'Talentos Prontos (22–27 anos)',
    ageRange: [22, 27],
    description: 'Atletas maduros com maior força imediata para titularidade.',
  },
};

const ROLE_SPECIAL_SKILLS: Record<DetailedRole, string[]> = {
  GOL: ['Reflexos Apurados', 'Saída de Gol Segura', 'Pegador de Pênaltis', 'Reposição Precisa'],
  ZAG: ['Jogo Aéreo Dominante', 'Antecipação Limpa', 'Saída Qualificada', 'Xerife da Área'],
  LAT: ['Apoio Constante', 'Cruzamento Preciso', 'Velocidade no Corredor', 'Marcação Firme'],
  VOL: ['Pulmão Incansável', 'Desarme Preciso', 'Passe Vertical', 'Cobertura Tática'],
  MEI: ['Visão Entrelinhas', 'Passe Decisivo', 'Chute de Média Distância', 'Controle Orientado'],
  ATA: ['Finalização Fria', 'Drible em Velocidade', 'Ataque ao Espaço', 'Presença de Área'],
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function roleToPosition(role: DetailedRole): Position {
  if (role === 'GOL') return 'GK';
  if (role === 'ZAG' || role === 'LAT') return 'DF';
  if (role === 'ATA') return 'FW';
  return 'MF';
}

export function getScoutWeeklySalaryForClub(
  club: Club | undefined,
  baseWeeklySalary: number
): number {
  const mult = getClubEconomyProfile(club).scoutSalaryMult;
  const raw = baseWeeklySalary * mult;
  const step = raw < 5_000 ? 250 : 1_000;
  return Math.max(800, Math.round(raw / step) * step);
}

export function getFourthScoutWeeklySalary(club: Club, stars: number): number {
  return getScoutWeeklySalaryForClub(club, 22_000 + stars * 6_000);
}

export function createInitialScoutingNetwork(club: Club): ScoutingNetworkState {
  const rep = Math.max(1, Math.min(5, club.reputation || 3));
  const baseStars = Math.max(1, Math.min(4, rep));

  const scouts: ScoutStaffMember[] = [
    {
      id: `scout_${club.id}_br`,
      name: 'Ricardo Vasconcelos',
      nationality: 'Brasil',
      specialtyRegion: 'BRASIL',
      specialtyLabel: 'Especialista em Regiões do Brasil',
      stars: Math.min(5, baseStars + (rep >= 4 ? 1 : 0)),
      weeklySalary: getScoutWeeklySalaryForClub(club, 18000 + baseStars * 6000),
    },
    {
      id: `scout_${club.id}_sa`,
      name: 'Martín Castellanos',
      nationality: 'Uruguai',
      specialtyRegion: 'AMERICA_SUL',
      specialtyLabel: 'Especialista em Mercado Sul-Americano',
      stars: baseStars,
      weeklySalary: getScoutWeeklySalaryForClub(club, 20000 + baseStars * 6500),
    },
    {
      id: `scout_${club.id}_intl`,
      name: 'Gonçalo Magalhães',
      nationality: 'Portugal',
      specialtyRegion: 'INTERNACIONAL',
      specialtyLabel: 'Observador Internacional & África/Europa',
      stars: Math.max(1, baseStars - (rep <= 2 ? 1 : 0)),
      weeklySalary: getScoutWeeklySalaryForClub(club, 22000 + baseStars * 7000),
    },
  ];

  return {
    scouts,
    missions: [],
    prospects: [],
  };
}

export function calculateMissionCost(
  region: ScoutingRegionInfo,
  depth: ScoutMissionDepth,
  scout: ScoutStaffMember,
  club?: Club
): number {
  const depthMeta = SCOUT_MISSION_DEPTHS[depth];
  // Regional specialty grants a 10% logistical efficiency discount
  const specialtyDiscount = scout.specialtyRegion === region.category ? 0.9 : 1.0;
  const missionMult = club ? getClubEconomyProfile(club).scoutMissionMult : 1.0;
  const raw = region.baseCost * depthMeta.costMultiplier * specialtyDiscount * missionMult;
  const step = raw < 25_000 ? 1_000 : 5_000;
  return Math.max(5_000, Math.round(raw / step) * step);
}

export function getHireFourthScoutCost(club: Club): number {
  const rep = Math.max(1, Math.min(5, club.reputation || 3));
  const missionMult = getClubEconomyProfile(club).scoutMissionMult;
  const raw = (280000 + rep * 90000) * Math.max(0.1, missionMult);
  return Math.max(25_000, Math.round(raw / 5_000) * 5_000);
}

export function getUpgradeScoutCost(scout: ScoutStaffMember, club?: Club): number {
  const missionMult = club ? Math.max(0.1, getClubEconomyProfile(club).scoutMissionMult) : 1.0;
  const raw = scout.stars * 240000 * missionMult;
  return Math.max(20_000, Math.round(raw / 5_000) * 5_000);
}

function resolveProspectCountryFromOriginClub(
  regionCountry: string,
  originClubName: string
): string {
  if (!regionCountry.includes('/')) {
    return regionCountry.trim();
  }
  const club = originClubName.trim();
  // Paraguai / Chile
  if (club === 'Libertad' || club === 'Guaraní-PAR' || club === 'Sol de América') {
    return 'Paraguai';
  }
  if (
    club === 'Audax Italiano' ||
    club === 'Huachipato' ||
    club === 'Palestino' ||
    club === 'Unión Española'
  ) {
    return 'Chile';
  }
  // Portugal / Espanha
  if (
    club === 'Celta Fortuna' ||
    club === 'Las Palmas Atl.' ||
    club === 'Real Zaragoza'
  ) {
    return 'Espanha';
  }
  if (regionCountry.includes('Portugal')) {
    return 'Portugal';
  }
  // Nigéria / Gana / Senegal
  if (club === 'Right to Dream' || club === 'Asante Kotoko') {
    return 'Gana';
  }
  if (club === 'Génération Foot' || club === 'Diambars FC') {
    return 'Senegal';
  }
  if (club === 'ASEC Mimosas') {
    return 'Costa do Marfim';
  }
  if (club === 'Enyimba FC' || club === 'Remo Stars') {
    return 'Nigéria';
  }
  // México / EUA
  if (club === 'FC Dallas Academy' || club === 'Philadelphia Union II') {
    return 'Estados Unidos';
  }
  if (regionCountry.includes('México')) {
    return 'México';
  }
  return regionCountry.split('/')[0].trim();
}

export function generateProspectsForMission(
  mission: ScoutingMission,
  scout: ScoutStaffMember,
  club: Club,
  completionDate: string
): ScoutedProspect[] {
  const region = SCOUTING_REGIONS.find((r) => r.id === mission.regionId) || SCOUTING_REGIONS[0];
  const depthMeta = SCOUT_MISSION_DEPTHS[mission.depth];
  const ageProfile = SCOUT_AGE_PROFILES[mission.ageFocus];

  const count = randomInt(depthMeta.prospectsRange[0], depthMeta.prospectsRange[1]);
  const specialtyMatch = scout.specialtyRegion === region.category;
  const effectiveStars = Math.min(5, scout.stars + (specialtyMatch ? 1 : 0));

  const allRoles: DetailedRole[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  const usedNames = new Set<string>();
  const prospects: ScoutedProspect[] = [];

  // Club division calibration so Estadio/Serie D/C clubs find realistic & attainable signings
  const profile = getClubEconomyProfile(club);
  const divAdjustment =
    profile.tierId === 'EST'
      ? -12
      : profile.tierId === 'BR_D' || profile.tierId === 'EU_4'
      ? -8
      : profile.tierId === 'BR_C' || profile.tierId === 'TIER_LOWER_PRO'
      ? -5
      : profile.tierId === 'BR_B' || profile.tierId === 'EU_3' || profile.tierId === 'SA_MID'
      ? -2
      : 0;
  const minProspectOvr =
    profile.tierId === 'EST'
      ? 50
      : profile.tierId === 'BR_D' || profile.tierId === 'EU_4'
      ? 54
      : profile.tierId === 'BR_C'
      ? 57
      : 59;
  const maxProspectOvr = Math.min(85, profile.hardOvrCap - 1);

  for (let i = 0; i < count; i++) {
    let role: DetailedRole;
    if (mission.roleFocus !== 'ALL') {
      role = mission.roleFocus;
    } else if (Math.random() < 0.65) {
      role = pickRandom(region.preferredRoles);
    } else {
      role = pickRandom(allRoles);
    }

    const age = randomInt(ageProfile.ageRange[0], ageProfile.ageRange[1]);

    // Calculate current OVR based on region, age profile, and slight spread
    let minOvr = region.baseOvrRange[0] + divAdjustment;
    let maxOvr = region.baseOvrRange[1] + divAdjustment;

    if (mission.ageFocus === 'JOIAS_BASE') {
      minOvr -= 3;
      maxOvr -= 2;
    } else if (mission.ageFocus === 'PRONTOS') {
      minOvr += 2;
      maxOvr += 3;
    }

    // Ensure at least 1 standout prospect on deeper missions or high-star scouts
    const isStandoutSlot = i === 0 && (depthMeta.ceilingBonus >= 2 || effectiveStars >= 4);
    const overall = Math.max(
      minProspectOvr,
      Math.min(
        maxProspectOvr,
        isStandoutSlot ? randomInt(maxOvr - 2, maxOvr + 2) : randomInt(minOvr, maxOvr)
      )
    );

    // True Potential calculation
    let growthRoom = 3;
    if (age <= 18) {
      growthRoom = randomInt(9, 15);
    } else if (age <= 20) {
      growthRoom = randomInt(7, 13);
    } else if (age <= 23) {
      growthRoom = randomInt(5, 9);
    } else {
      growthRoom = randomInt(2, 5);
    }

    const gemRoll = Math.random() < 0.16 + depthMeta.ceilingBonus * 0.05 + effectiveStars * 0.03;
    if (gemRoll || isStandoutSlot) {
      growthRoom += randomInt(2, 4);
    }

    const truePotential = Math.max(
      overall + 1,
      Math.min(95, overall + growthRoom + Math.floor(region.potentialCeilingBonus / 2))
    );

    // Estimated Potential Window (higher scout stars + mission depth = narrower uncertainty)
    const uncertainty = Math.max(1, 5 - effectiveStars - Math.floor(depthMeta.precisionBonus / 2));
    const potOffsetLow = randomInt(0, uncertainty);
    const potOffsetHigh = randomInt(0, uncertainty);
    const potentialMin = Math.max(overall, truePotential - potOffsetLow);
    const potentialMax = Math.min(97, Math.max(potentialMin + (uncertainty > 1 ? 2 : 1), truePotential + potOffsetHigh));

    // Market Value & Wage aligned with club division & OVR curve
    const baseEcon = recalculatePlayerEconomics(overall, age, club.division, club);
    const potentialPremium = truePotential >= 88 ? 1.18 : truePotential >= 84 ? 1.08 : 1.0;
    const valStep = baseEcon.marketValue < 200_000 ? 10_000 : 50_000;
    const trueMarketValue = Math.max(
      profile.playerValueFloor,
      Math.round((baseEcon.marketValue * potentialPremium * (0.9 + Math.min(0.25, (region.marketMultiplier - 1) * 0.5))) / valStep) * valStep
    );

    // Estimated Market Value & Range (scout's appraisal)
    const valueSpreadPct = Math.max(0.06, 0.24 - effectiveStars * 0.03 - depthMeta.precisionBonus * 0.03);
    const appraisalBias = 1 + (Math.random() * 2 - 1) * (valueSpreadPct * 0.5);
    const estimatedMarketValue = Math.max(
      profile.playerValueFloor,
      Math.round((trueMarketValue * appraisalBias) / valStep) * valStep
    );
    const estimatedValueMin = Math.max(
      profile.playerValueFloor,
      Math.round((estimatedMarketValue * (1 - valueSpreadPct)) / valStep) * valStep
    );
    const estimatedValueMax = Math.max(
      estimatedValueMin + valStep,
      Math.round((estimatedMarketValue * (1 + valueSpreadPct)) / valStep) * valStep
    );

    // Origin club's realistic asking fee
    const bargainFactor =
      truePotential >= 89
        ? 0.95 + Math.random() * 0.15
        : 0.8 + Math.random() * 0.18;
    const askingFee = Math.max(
      profile.playerValueFloor,
      Math.round((trueMarketValue * bargainFactor) / valStep) * valStep
    );

    const wage = baseEcon.wage;

    // Unique authentic name from region
    let fullName = '';
    for (let attempt = 0; attempt < 12; attempt++) {
      const fn = pickRandom(region.firstNames).trim();
      const ln = pickRandom(region.lastNames).trim();
      fullName = `${fn} ${ln}`;
      if (!usedNames.has(fullName)) {
        usedNames.add(fullName);
        break;
      }
    }

    const specialSkill = pickRandom(ROLE_SPECIAL_SKILLS[role]);
    const originClubName = pickRandom(region.originClubs);
    const resolvedProspectCountry = resolveProspectCountryFromOriginClub(
      region.country,
      originClubName
    );
    const footRoll = Math.random();
    const preferredFoot: Player['preferredFoot'] =
      footRoll < 0.08 ? 'Ambidestro' : footRoll < 0.36 ? 'Canhoto' : 'Destro';

    const playerId = `scout_plr_${mission.id}_${i}_${Date.now()}`;
    const player: Player = {
      id: playerId,
      name: fullName,
      nationality: resolvedProspectCountry,
      position: roleToPosition(role),
      detailedRole: role,
      overall,
      age,
      condition: 100,
      morale: 'Excelente',
      wage,
      marketValue: trueMarketValue,
      contractYears: 3,
      preferredFoot,
      specialSkill,
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
      isStarter: false,
      isSubstitute: false,
      squadNumber: randomInt(30, 98),
      ratingAverage: 0,
      trainingProgress: randomInt(15, 55),
      potential: truePotential,
      individualTrainingFocus: 'EQUILIBRADO',
      evolutionsCount: 0,
    };

    let recommendationTier: ScoutRecommendationTier = 'Observação';
    if (truePotential >= 88 && truePotential - overall >= 9) {
      recommendationTier = 'Joia Rara';
    } else if (truePotential >= 84 || truePotential - overall >= 8) {
      recommendationTier = 'Alto Potencial';
    } else if (askingFee <= trueMarketValue * 0.9) {
      recommendationTier = 'Bom Custo-Benefício';
    }

    const scoutReportSummary = buildScoutReportNote(
      role,
      age,
      overall,
      potentialMin,
      potentialMax,
      specialSkill,
      originClubName,
      recommendationTier
    );

    prospects.push({
      id: `prospect_${mission.id}_${i}_${Date.now()}`,
      missionId: mission.id,
      discoveredDate: completionDate,
      regionId: region.id,
      regionName: region.name,
      country: resolvedProspectCountry,
      originClubName,
      scoutId: scout.id,
      scoutName: scout.name,
      scoutStars: scout.stars,
      player,
      potentialMin,
      potentialMax,
      estimatedValueMin,
      estimatedValueMax,
      estimatedMarketValue,
      askingFee,
      recommendationTier,
      scoutReportSummary,
      isShortlisted: false,
      isSigned: false,
      isDismissed: false,
    });
  }

  // Sort generated prospects by ceiling potential descending
  return prospects.sort((a, b) => b.potentialMax - a.potentialMax || b.player.overall - a.player.overall);
}

function buildScoutReportNote(
  role: DetailedRole,
  age: number,
  overall: number,
  potMin: number,
  potMax: number,
  skill: string,
  originClub: string,
  tier: ScoutRecommendationTier
): string {
  const roleLabel: Record<DetailedRole, string> = {
    GOL: 'Goleiro',
    ZAG: 'Zagueiro',
    LAT: 'Lateral',
    VOL: 'Volante',
    MEI: 'Meia',
    ATA: 'Atacante',
  };

  if (tier === 'Joia Rara') {
    return `${roleLabel[role]} de ${age} anos destaque no ${originClub}. Destaca-se em ${skill.toLowerCase()} e projeta teto entre ${potMin} e ${potMax} de força.`;
  }
  if (tier === 'Alto Potencial') {
    return `Promessa com ótima evolução física e técnica (${skill.toLowerCase()}). Já entrega força ${overall} com projeção até ${potMax}.`;
  }
  if (tier === 'Bom Custo-Benefício') {
    return `Oportunidade de mercado no ${originClub}: atleta regular em ${skill.toLowerCase()} com pedida acessível frente ao valor estimado.`;
  }
  return `Titular observado no ${originClub}, perfil consistente em ${skill.toLowerCase()} e margem de evolução até ${potMax}.`;
}

export function dispatchScoutMission(params: {
  network: ScoutingNetworkState;
  club: Club;
  scoutId: string;
  regionId: string;
  roleFocus: DetailedRole | 'ALL';
  ageFocus: ScoutAgeFocus;
  depth: ScoutMissionDepth;
  currentDate: string;
  currentRound: number;
}): {
  success: boolean;
  errorMessage?: string;
  updatedNetwork: ScoutingNetworkState;
  updatedClub: Club;
  mission?: ScoutingMission;
  immediateProspects?: ScoutedProspect[];
  inboxMessage?: InboxMessage;
} {
  const { network, club, scoutId, regionId, roleFocus, ageFocus, depth, currentDate, currentRound } = params;

  const scout = network.scouts.find((s) => s.id === scoutId);
  if (!scout) {
    return {
      success: false,
      errorMessage: 'Olheiro selecionado não encontrado.',
      updatedNetwork: network,
      updatedClub: club,
    };
  }

  if (scout.activeMissionId) {
    return {
      success: false,
      errorMessage: `${scout.name} já está em viagem de observação ativa.`,
      updatedNetwork: network,
      updatedClub: club,
    };
  }

  const region = SCOUTING_REGIONS.find((r) => r.id === regionId);
  if (!region) {
    return {
      success: false,
      errorMessage: 'Região ou país inválido.',
      updatedNetwork: network,
      updatedClub: club,
    };
  }

  const cost = calculateMissionCost(region, depth, scout, club);
  if (club.finances.balance < cost) {
    return {
      success: false,
      errorMessage: `Saldo insuficiente para custear a missão (${cost.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      })}).`,
      updatedNetwork: network,
      updatedClub: club,
    };
  }

  const depthMeta = SCOUT_MISSION_DEPTHS[depth];
  const missionId = `mission_${Date.now()}_${scout.id}`;

  const updatedClub: Club = {
    ...club,
    finances: recordFinanceLedgerMutation(club.finances, {
      date: currentDate,
      category: 'STAFF_SCOUTS',
      type: 'EXPENSE',
      amount: cost,
      description: `Missão de Olheiro: ${scout.name} em ${region.name}`,
      applyToBalance: true,
    }),
  };

  if (depthMeta.days === 0) {
    // Immediate Express Scouting Report
    const completedMission: ScoutingMission = {
      id: missionId,
      scoutId: scout.id,
      scoutName: scout.name,
      scoutStars: scout.stars,
      regionId: region.id,
      regionName: region.name,
      country: region.country,
      roleFocus,
      ageFocus,
      depth,
      cost,
      startDate: currentDate,
      totalDays: 0,
      daysRemaining: 0,
      status: 'COMPLETED',
      completedDate: currentDate,
    };

    const generated = generateProspectsForMission(completedMission, scout, updatedClub, currentDate);
    completedMission.prospectsFoundCount = generated.length;

    const topProspect = generated[0];
    const inboxMessage: InboxMessage = {
      id: `scout_msg_${missionId}`,
      title: `Relatório de Olheiro: ${region.name} (${region.country})`,
      message: `${scout.name} concluiu a varredura em ${region.name} (${region.country}) e listou ${generated.length} talentos mapeados. Destaque para ${topProspect.player.name} (${topProspect.player.detailedRole}, ${topProspect.player.age} anos, Potencial ${topProspect.potentialMin}–${topProspect.potentialMax}).`,
      date: currentDate,
      round: currentRound,
      read: false,
      type: 'SCOUTING',
    };

    return {
      success: true,
      updatedClub,
      mission: completedMission,
      immediateProspects: generated,
      inboxMessage,
      updatedNetwork: {
        scouts: network.scouts,
        missions: [completedMission, ...network.missions],
        prospects: [...generated, ...network.prospects],
      },
    };
  }

  // Multi-day Expedition
  const activeMission: ScoutingMission = {
    id: missionId,
    scoutId: scout.id,
    scoutName: scout.name,
    scoutStars: scout.stars,
    regionId: region.id,
    regionName: region.name,
    country: region.country,
    roleFocus,
    ageFocus,
    depth,
    cost,
    startDate: currentDate,
    totalDays: depthMeta.days,
    daysRemaining: depthMeta.days,
    status: 'ACTIVE',
  };

  const updatedScouts = network.scouts.map((s) =>
    s.id === scout.id ? { ...s, activeMissionId: missionId } : s
  );

  return {
    success: true,
    updatedClub,
    mission: activeMission,
    updatedNetwork: {
      scouts: updatedScouts,
      missions: [activeMission, ...network.missions],
      prospects: network.prospects,
    },
  };
}

export function progressScoutingMissions(
  network: ScoutingNetworkState | undefined,
  club: Club,
  daysPassed: number,
  currentDate: string,
  currentRound: number
): {
  updatedNetwork: ScoutingNetworkState;
  generatedInboxMessages: InboxMessage[];
} {
  const safeNetwork = network || createInitialScoutingNetwork(club);
  if (daysPassed <= 0 || !safeNetwork.missions.some((m) => m.status === 'ACTIVE')) {
    return { updatedNetwork: safeNetwork, generatedInboxMessages: [] };
  }

  const newlyCompletedIds = new Set<string>();
  const newProspects: ScoutedProspect[] = [];
  const generatedInboxMessages: InboxMessage[] = [];

  const updatedMissions = safeNetwork.missions.map((mission) => {
    if (mission.status !== 'ACTIVE') return mission;

    const remaining = Math.max(0, mission.daysRemaining - daysPassed);
    if (remaining > 0) {
      return {
        ...mission,
        daysRemaining: remaining,
      };
    }

    newlyCompletedIds.add(mission.id);
    const scout =
      safeNetwork.scouts.find((s) => s.id === mission.scoutId) || {
        id: mission.scoutId,
        name: mission.scoutName,
        nationality: 'Brasil',
        specialtyRegion: 'BRASIL' as const,
        specialtyLabel: 'Olheiro',
        stars: mission.scoutStars,
        weeklySalary: getScoutWeeklySalaryForClub(club, 25000),
      };

    const found = generateProspectsForMission(mission, scout, club, currentDate);
    newProspects.push(...found);

    const topTalent = found[0];
    generatedInboxMessages.push({
      id: `scout_done_${mission.id}_${Date.now()}`,
      title: `Missão Concluída: ${mission.regionName} (${mission.country})`,
      message: `O olheiro ${mission.scoutName} retornou de ${mission.regionName} após ${mission.totalDays} dias de observação com um dossiê de ${found.length} jogadores mapeados! Principal destaque: ${topTalent.player.name} (${topTalent.player.detailedRole}, ${topTalent.player.age} anos · Potencial estimado ${topTalent.potentialMin}–${topTalent.potentialMax} · Valor estimado R$ ${topTalent.estimatedMarketValue.toLocaleString('pt-BR')}).`,
      date: currentDate,
      round: currentRound,
      read: false,
      type: 'SCOUTING',
    });

    return {
      ...mission,
      daysRemaining: 0,
      status: 'COMPLETED' as const,
      completedDate: currentDate,
      prospectsFoundCount: found.length,
    };
  });

  const updatedScouts = safeNetwork.scouts.map((scout) => {
    if (scout.activeMissionId && newlyCompletedIds.has(scout.activeMissionId)) {
      return { ...scout, activeMissionId: undefined };
    }
    return scout;
  });

  return {
    updatedNetwork: {
      scouts: updatedScouts,
      missions: updatedMissions,
      prospects: [...newProspects, ...safeNetwork.prospects],
    },
    generatedInboxMessages,
  };
}

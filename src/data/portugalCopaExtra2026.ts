import type { DetailedRole } from '../types/game';

export type PortugalCopaExtraPlayerTuple = [string, DetailedRole, number, number, number, string];

export interface PortugalCopaExtraClubData {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  tierLevel: 2 | 3 | 4 | 5;
  players: PortugalCopaExtraPlayerTuple[];
}

interface PortugalCopaExtraClubSeed {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  tierLevel: 2 | 3 | 4 | 5;
  baseOvr: number;
}

const PORTUGUESE_FIRST_NAMES = [
  'Afonso', 'Alexandre', 'André', 'António', 'Bernardo', 'Bruno', 'Carlos', 'Daniel',
  'David', 'Diogo', 'Duarte', 'Eduardo', 'Fábio', 'Filipe', 'Francisco', 'Frederico',
  'Gabriel', 'Gonçalo', 'Guilherme', 'Gustavo', 'Henrique', 'Hugo', 'Ivo', 'João',
  'Jorge', 'José', 'Leandro', 'Lourenço', 'Lucas', 'Luís', 'Manuel', 'Marco',
  'Marcos', 'Mário', 'Martim', 'Mateus', 'Miguel', 'Nuno', 'Paulo', 'Pedro',
  'Rafael', 'Renato', 'Ricardo', 'Rodrigo', 'Rúben', 'Rui', 'Salvador', 'Samuel',
  'Sérgio', 'Simão', 'Tiago', 'Tomás', 'Vasco', 'Vicente', 'Vítor',
];

const PORTUGUESE_LAST_NAMES = [
  'Almeida', 'Alves', 'Antunes', 'Araújo', 'Azevedo', 'Baptista', 'Barbosa', 'Barros',
  'Borges', 'Branco', 'Brito', 'Cabral', 'Campos', 'Cardoso', 'Carneiro', 'Carvalho',
  'Castro', 'Coelho', 'Correia', 'Costa', 'Cruz', 'Cunha', 'Dias', 'Domingues',
  'Duarte', 'Esteves', 'Faria', 'Fernandes', 'Ferreira', 'Figueiredo', 'Fonseca', 'Freitas',
  'Gomes', 'Gonçalves', 'Guedes', 'Henriques', 'Jesus', 'Leal', 'Leite', 'Lima',
  'Lopes', 'Loureiro', 'Lourenço', 'Macedo', 'Machado', 'Magalhães', 'Maia', 'Marques',
  'Martins', 'Matos', 'Mendes', 'Miranda', 'Monteiro', 'Morais', 'Moreira', 'Mota',
  'Moura', 'Nascimento', 'Neves', 'Nogueira', 'Nunes', 'Oliveira', 'Pacheco', 'Paiva',
  'Pereira', 'Pinheiro', 'Pinto', 'Pires', 'Queirós', 'Ramos', 'Reis', 'Ribeiro',
  'Rocha', 'Rodrigues', 'Sá', 'Sampaio', 'Santos', 'Sequeira', 'Silva', 'Simões',
  'Soares', 'Sousa', 'Tavares', 'Teixeira', 'Torres', 'Valente', 'Varela', 'Vasconcelos',
  'Vaz', 'Ventura', 'Vieira',
];

const SQUAD_TEMPLATE: ReadonlyArray<{
  role: DetailedRole;
  ovrOffset: number;
  baseAge: number;
  shirt: number;
}> = [
  // Goleiros (2)
  { role: 'GOL', ovrOffset: 1, baseAge: 28, shirt: 1 },
  { role: 'GOL', ovrOffset: -2, baseAge: 22, shirt: 12 },
  // Zagueiros (4)
  { role: 'ZAG', ovrOffset: 2, baseAge: 29, shirt: 4 },
  { role: 'ZAG', ovrOffset: 1, baseAge: 26, shirt: 5 },
  { role: 'ZAG', ovrOffset: -1, baseAge: 24, shirt: 15 },
  { role: 'ZAG', ovrOffset: -2, baseAge: 21, shirt: 24 },
  // Laterais (4)
  { role: 'LAT', ovrOffset: 1, baseAge: 26, shirt: 2 },
  { role: 'LAT', ovrOffset: -2, baseAge: 22, shirt: 14 },
  { role: 'LAT', ovrOffset: 1, baseAge: 25, shirt: 3 },
  { role: 'LAT', ovrOffset: -2, baseAge: 23, shirt: 18 },
  // Meio-campo (7)
  { role: 'VOL', ovrOffset: 2, baseAge: 28, shirt: 6 },
  { role: 'VOL', ovrOffset: 0, baseAge: 24, shirt: 16 },
  { role: 'VOL', ovrOffset: -2, baseAge: 21, shirt: 21 },
  { role: 'MEI', ovrOffset: 2, baseAge: 27, shirt: 8 },
  { role: 'MEI', ovrOffset: 0, baseAge: 23, shirt: 13 },
  { role: 'MEI', ovrOffset: 2, baseAge: 26, shirt: 10 },
  { role: 'MEI', ovrOffset: -1, baseAge: 22, shirt: 20 },
  // Ataque (5)
  { role: 'ATA', ovrOffset: 1, baseAge: 25, shirt: 7 },
  { role: 'ATA', ovrOffset: 1, baseAge: 24, shirt: 11 },
  { role: 'ATA', ovrOffset: -2, baseAge: 20, shirt: 17 },
  { role: 'ATA', ovrOffset: 2, baseAge: 28, shirt: 9 },
  { role: 'ATA', ovrOffset: -1, baseAge: 23, shirt: 19 },
];

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function generatePortugueseSquad(
  clubId: string,
  baseOvr: number
): PortugalCopaExtraPlayerTuple[] {
  let seed = hashString(clubId) || 521;
  const nextRand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const usedNames = new Set<string>();
  return SQUAD_TEMPLATE.map((slot) => {
    let fullName = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      const fn = PORTUGUESE_FIRST_NAMES[Math.floor(nextRand() * PORTUGUESE_FIRST_NAMES.length)];
      const ln = PORTUGUESE_LAST_NAMES[Math.floor(nextRand() * PORTUGUESE_LAST_NAMES.length)];
      const candidate = `${fn} ${ln}`;
      if (!usedNames.has(candidate)) {
        fullName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!fullName) fullName = `João Silva ${slot.shirt}`;
    const jitter = Math.floor(nextRand() * 3) - 1;
    const ovr = Math.max(48, Math.min(72, baseOvr + slot.ovrOffset + jitter));
    const ageJitter = Math.floor(nextRand() * 5) - 2;
    const age = Math.max(18, Math.min(35, slot.baseAge + ageJitter));
    return [fullName, slot.role, ovr, age, slot.shirt, 'Portugal'];
  });
}

// 19 clubes portugueses de Liga Portugal 2 (L2), Liga 3 (L3), Campeonato de Portugal (L4) e Distritais (L5)
// presentes na Taça de Portugal 2026/27.
const PORTUGAL_COPA_EXTRA_SEEDS: PortugalCopaExtraClubSeed[] = [
  // === Liga Portugal 2 (L2 — 9 clubes) ===
  {
    id: 'eu_por2_ton',
    name: 'CD Tondela',
    shortName: 'TON',
    reputation: 3,
    primaryColor: '#eab308',
    stadiumName: 'Estádio João Cardoso, Tondela',
    managerName: 'Luís Pinto',
    tierLevel: 2,
    baseOvr: 66,
  },
  {
    id: 'eu_por2_far',
    name: 'SC Farense',
    shortName: 'FAR',
    reputation: 3,
    primaryColor: '#111827',
    stadiumName: 'Estádio de São Luís, Faro',
    managerName: 'Tozé Marreco',
    tierLevel: 2,
    baseOvr: 66,
  },
  {
    id: 'eu_por2_afs',
    name: 'AFS Futebol SAD',
    shortName: 'AFS',
    reputation: 3,
    primaryColor: '#dc2626',
    stadiumName: 'Estádio do CD das Aves, Vila das Aves',
    managerName: 'Rui Ferreira',
    tierLevel: 2,
    baseOvr: 65,
  },
  {
    id: 'eu_por2_cha',
    name: 'GD Chaves',
    shortName: 'CHA',
    reputation: 3,
    primaryColor: '#b91c1c',
    stadiumName: 'Estádio Municipal Eng.º Manuel Branco Teixeira, Chaves',
    managerName: 'Marco Alves',
    tierLevel: 2,
    baseOvr: 65,
  },
  {
    id: 'eu_por2_ptm',
    name: 'Portimonense SC',
    shortName: 'PTM',
    reputation: 3,
    primaryColor: '#0f172a',
    stadiumName: 'Estádio Municipal de Portimão',
    managerName: 'Ricardo Pessoa',
    tierLevel: 2,
    baseOvr: 65,
  },
  {
    id: 'eu_por2_lei',
    name: 'UD Leiria',
    shortName: 'UDL',
    reputation: 3,
    primaryColor: '#dc2626',
    stadiumName: 'Estádio Dr. Magalhães Pessoa, Leiria',
    managerName: 'Silas',
    tierLevel: 2,
    baseOvr: 65,
  },
  {
    id: 'eu_por2_fel',
    name: 'FC Felgueiras',
    shortName: 'FEL',
    reputation: 2,
    primaryColor: '#1d4ed8',
    stadiumName: 'Estádio Dr. Machado de Matos, Felgueiras',
    managerName: 'Agostinho Bento',
    tierLevel: 2,
    baseOvr: 64,
  },
  {
    id: 'eu_por2_oaf',
    name: 'Académica OAF',
    shortName: 'AAC',
    reputation: 3,
    primaryColor: '#111827',
    stadiumName: 'Estádio Cidade de Coimbra',
    managerName: 'António Barbosa',
    tierLevel: 2,
    baseOvr: 64,
  },
  {
    id: 'eu_por2_lus',
    name: 'Lusitânia de Lourosa',
    shortName: 'LUS',
    reputation: 2,
    primaryColor: '#facc15',
    stadiumName: 'Estádio do Lusitânia de Lourosa FC',
    managerName: 'Pedro Miguel',
    tierLevel: 2,
    baseOvr: 63,
  },

  // === Liga 3 (L3 — 6 clubes) ===
  {
    id: 'eu_por2_maf',
    name: 'CD Mafra',
    shortName: 'MAF',
    reputation: 2,
    primaryColor: '#eab308',
    stadiumName: 'Estádio Municipal de Mafra',
    managerName: 'Paulo Alves',
    tierLevel: 3,
    baseOvr: 61,
  },
  {
    id: 'eu_por2_acp',
    name: 'Atlético CP',
    shortName: 'ACP',
    reputation: 2,
    primaryColor: '#2563eb',
    stadiumName: 'Estádio da Tapadinha, Lisboa',
    managerName: 'Nikola Popovic',
    tierLevel: 3,
    baseOvr: 60,
  },
  {
    id: 'eu_por2_par',
    name: 'USC Paredes',
    shortName: 'PAR',
    reputation: 2,
    primaryColor: '#1e3a8a',
    stadiumName: 'Estádio Municipal das Laranjeiras, Paredes',
    managerName: 'Tarantini',
    tierLevel: 3,
    baseOvr: 60,
  },
  {
    id: 'eu_por2_via',
    name: 'SC Vianense',
    shortName: 'VIA',
    reputation: 2,
    primaryColor: '#1d4ed8',
    stadiumName: 'Estádio Dr. José de Matos, Viana do Castelo',
    managerName: 'Pedro Lomba',
    tierLevel: 3,
    baseOvr: 59,
  },
  {
    id: 'eu_por2_lec',
    name: 'Leça FC',
    shortName: 'LEC',
    reputation: 2,
    primaryColor: '#15803d',
    stadiumName: 'Estádio do Leça Futebol Clube, Matosinhos',
    managerName: 'Filipe Mesquita',
    tierLevel: 3,
    baseOvr: 59,
  },
  {
    id: 'eu_por2_vse',
    name: 'Vitória de Sernache',
    shortName: 'VSE',
    reputation: 1,
    primaryColor: '#dc2626',
    stadiumName: 'Estádio Municipal Nuno Álvares Pereira, Cernache do Bonjardim',
    managerName: 'Ricardo António',
    tierLevel: 3,
    baseOvr: 58,
  },

  // === Campeonato de Portugal (L4 — 3 clubes) ===
  {
    id: 'eu_por2_san',
    name: 'AD Sanjoanense',
    shortName: 'SAN',
    reputation: 1,
    primaryColor: '#1e293b',
    stadiumName: 'Estádio Conde Dias Garcia, São João da Madeira',
    managerName: 'Filipe Gonçalves',
    tierLevel: 4,
    baseOvr: 56,
  },
  {
    id: 'eu_por2_fat',
    name: 'CD Fátima',
    shortName: 'FAT',
    reputation: 1,
    primaryColor: '#991b1b',
    stadiumName: 'Estádio Papa Francisco, Fátima',
    managerName: 'João Sousa',
    tierLevel: 4,
    baseOvr: 55,
  },
  {
    id: 'eu_por2_uds',
    name: 'União da Serra',
    shortName: 'UDS',
    reputation: 1,
    primaryColor: '#16a34a',
    stadiumName: 'Campo da Portela, Santa Catarina da Serra',
    managerName: 'Nuno Gomes',
    tierLevel: 4,
    baseOvr: 54,
  },

  // === Divisões Distritais (L5 — 1 clube) ===
  {
    id: 'eu_por2_olh',
    name: 'SC Olhanense',
    shortName: 'OLH',
    reputation: 1,
    primaryColor: '#b91c1c',
    stadiumName: 'Estádio José Arcanjo, Olhão',
    managerName: 'Vasco Faísca',
    tierLevel: 5,
    baseOvr: 52,
  },
];

export const PORTUGAL_COPA_EXTRA_2026: PortugalCopaExtraClubData[] = PORTUGAL_COPA_EXTRA_SEEDS.map(
  (seed) => ({
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    reputation: seed.reputation,
    primaryColor: seed.primaryColor,
    stadiumName: seed.stadiumName,
    managerName: seed.managerName,
    tierLevel: seed.tierLevel,
    players: generatePortugueseSquad(seed.id, seed.baseOvr),
  })
);

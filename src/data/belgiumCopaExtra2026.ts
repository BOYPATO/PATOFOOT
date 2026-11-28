import type { DetailedRole } from '../types/game';

export type BelgiumCopaExtraPlayerTuple = [string, DetailedRole, number, number, number, string];

export interface BelgiumCopaExtraClubData {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  tierLevel: 2 | 3;
  players: BelgiumCopaExtraPlayerTuple[];
}

interface BelgiumCopaExtraClubSeed {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  tierLevel: 2 | 3;
  baseOvr: number;
}

const BELGIAN_FIRST_NAMES = [
  'Adrien', 'Alexandre', 'Antoine', 'Arnaud', 'Arthur', 'Axel', 'Baptiste', 'Benoît',
  'Bram', 'Cédric', 'Corentin', 'Daan', 'Davy', 'Dieter', 'Dylan', 'Florian',
  'Gilles', 'Guillaume', 'Hugo', 'Jelle', 'Jens', 'Jeroen', 'Jonas', 'Joris',
  'Julien', 'Kevin', 'Kobe', 'Laurent', 'Lennert', 'Liam', 'Loïc', 'Louis',
  'Lukas', 'Maarten', 'Mathieu', 'Mats', 'Maxime', 'Michiel', 'Milan', 'Nathan',
  'Nicolas', 'Niels', 'Noah', 'Olivier', 'Pieter', 'Quentin', 'Raphaël', 'Robbe',
  'Robin', 'Romain', 'Ruben', 'Sam', 'Sander', 'Sébastien', 'Senna', 'Simon',
  'Stijn', 'Théo', 'Thibault', 'Thomas', 'Tim', 'Tom', 'Victor', 'Wout', 'Yannick',
];

const BELGIAN_LAST_NAMES = [
  'Aerts', 'Bogaert', 'Claes', 'Claessens', 'Coppens', 'De Backer', 'De Bruyn', 'De Clercq',
  'De Cock', 'De Meyer', 'De Pauw', 'De Ridder', 'De Smet', 'De Vos', 'De Vries', 'De Wilde',
  'Declercq', 'Delacroix', 'Delvaux', 'Desmet', 'Devos', 'Dubois', 'Dumont', 'Dupont',
  'Fontaine', 'François', 'Geerts', 'Goossens', 'Hendrickx', 'Hermans', 'Jacobs', 'Janssens',
  'Lambert', 'Laurent', 'Lemaire', 'Lemmens', 'Maes', 'Martens', 'Mertens', 'Michiels',
  'Moens', 'Pauwels', 'Peeters', 'Pieters', 'Renard', 'Segers', 'Simon', 'Smet',
  'Smets', 'Stevens', 'Thys', 'Timmermans', 'Van Damme', 'Van den Berg', 'Van den Bossche',
  'Van der Linden', 'Van Dijk', 'Van Dyck', 'Van Hulle', 'Vandenberghe', 'Verbeke',
  'Verhaegen', 'Verheyen', 'Verhoeven', 'Verlinden', 'Vermeersch', 'Vermeulen', 'Verschueren',
  'Verstraete', 'Wauters', 'Willems', 'Wouters',
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
  { role: 'ZAG', ovrOffset: 2, baseAge: 28, shirt: 4 },
  { role: 'ZAG', ovrOffset: 1, baseAge: 25, shirt: 5 },
  { role: 'ZAG', ovrOffset: -1, baseAge: 23, shirt: 15 },
  { role: 'ZAG', ovrOffset: -2, baseAge: 20, shirt: 24 },
  // Laterais (4)
  { role: 'LAT', ovrOffset: 1, baseAge: 26, shirt: 2 },
  { role: 'LAT', ovrOffset: -2, baseAge: 22, shirt: 14 },
  { role: 'LAT', ovrOffset: 1, baseAge: 25, shirt: 3 },
  { role: 'LAT', ovrOffset: -2, baseAge: 21, shirt: 18 },
  // Meio-campo (7)
  { role: 'VOL', ovrOffset: 2, baseAge: 27, shirt: 6 },
  { role: 'VOL', ovrOffset: 0, baseAge: 24, shirt: 16 },
  { role: 'VOL', ovrOffset: -2, baseAge: 21, shirt: 21 },
  { role: 'MEI', ovrOffset: 2, baseAge: 26, shirt: 8 },
  { role: 'MEI', ovrOffset: 0, baseAge: 23, shirt: 13 },
  { role: 'MEI', ovrOffset: 2, baseAge: 25, shirt: 10 },
  { role: 'MEI', ovrOffset: -1, baseAge: 22, shirt: 20 },
  // Ataque (5)
  { role: 'ATA', ovrOffset: 1, baseAge: 25, shirt: 7 },
  { role: 'ATA', ovrOffset: 1, baseAge: 24, shirt: 11 },
  { role: 'ATA', ovrOffset: -2, baseAge: 20, shirt: 17 },
  { role: 'ATA', ovrOffset: 2, baseAge: 27, shirt: 9 },
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

function generateBelgianSquad(
  clubId: string,
  baseOvr: number
): BelgiumCopaExtraPlayerTuple[] {
  let seed = hashString(clubId) || 809;
  const nextRand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const usedNames = new Set<string>();
  return SQUAD_TEMPLATE.map((slot) => {
    let fullName = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      const fn = BELGIAN_FIRST_NAMES[Math.floor(nextRand() * BELGIAN_FIRST_NAMES.length)];
      const ln = BELGIAN_LAST_NAMES[Math.floor(nextRand() * BELGIAN_LAST_NAMES.length)];
      const candidate = `${fn} ${ln}`;
      if (!usedNames.has(candidate)) {
        fullName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!fullName) fullName = `Thomas Peeters ${slot.shirt}`;
    const jitter = Math.floor(nextRand() * 3) - 1;
    const ovr = Math.max(54, Math.min(72, baseOvr + slot.ovrOffset + jitter));
    const age = Math.max(18, Math.min(35, slot.baseAge + Math.floor(nextRand() * 5) - 2));
    return [fullName, slot.role, ovr, age, slot.shirt, 'Bélgica'];
  });
}

const BELGIUM_COPA_EXTRA_SEEDS: BelgiumCopaExtraClubSeed[] = [
  {
    id: 'eu_bel2_beerschot',
    name: 'Beerschot VA',
    shortName: 'BEE',
    reputation: 3,
    primaryColor: '#6d28d9',
    stadiumName: "Olympisch Stadion 'Het Kiel' (Antuérpia)",
    managerName: 'Dirk Kuyt',
    tierLevel: 2,
    baseOvr: 68,
  },
  {
    id: 'eu_bel2_dender',
    name: 'FCV Dender EH',
    shortName: 'DEN',
    reputation: 3,
    primaryColor: '#1d4ed8',
    stadiumName: 'Van Roystadion (Denderleeuw)',
    managerName: 'Vincent Euvrard',
    tierLevel: 2,
    baseOvr: 68,
  },
  {
    id: 'eu_bel2_francs_borains',
    name: 'Francs Borains',
    shortName: 'FRB',
    reputation: 2,
    primaryColor: '#15803d',
    stadiumName: 'Stade Robert Urbain (Boussu)',
    managerName: 'Karim Belhocine',
    tierLevel: 2,
    baseOvr: 64,
  },
  {
    id: 'eu_bel2_eupen',
    name: 'KAS Eupen',
    shortName: 'EUP',
    reputation: 3,
    primaryColor: '#18181b',
    stadiumName: 'Kehrwegstadion (Eupen)',
    managerName: 'Mersad Selimbegović',
    tierLevel: 2,
    baseOvr: 67,
  },
  {
    id: 'eu_bel2_lierse',
    name: 'K. Lierse S.K.',
    shortName: 'LIE',
    reputation: 2,
    primaryColor: '#eab308',
    stadiumName: 'Herman Vanderpoortenstadion (Lier)',
    managerName: 'Christophe Grégoire',
    tierLevel: 2,
    baseOvr: 65,
  },
  {
    id: 'eu_bel2_lokeren',
    name: 'KSC Lokeren',
    shortName: 'LOK',
    reputation: 2,
    primaryColor: '#ca8a04',
    stadiumName: 'Daknamstadion (Lokeren)',
    managerName: 'Hans Cornelis',
    tierLevel: 2,
    baseOvr: 65,
  },
  {
    id: 'eu_bel2_rfc_liege',
    name: 'RFC Liège',
    shortName: 'RFL',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Stade de Rocourt (Liège)',
    managerName: 'Gaëtan Englebert',
    tierLevel: 2,
    baseOvr: 65,
  },
  {
    id: 'eu_bel2_seraing',
    name: 'RFC Seraing',
    shortName: 'SER',
    reputation: 2,
    primaryColor: '#b91c1c',
    stadiumName: 'Stade du Pairay (Seraing)',
    managerName: 'Mbaye Leye',
    tierLevel: 2,
    baseOvr: 64,
  },
  {
    id: 'eu_bel2_virton',
    name: 'Royal Excelsior Virton',
    shortName: 'VIR',
    reputation: 2,
    primaryColor: '#16a34a',
    stadiumName: 'Stade Yvan Georges (Virton)',
    managerName: 'Jérémy De Vriendt',
    tierLevel: 3,
    baseOvr: 63,
  },
  {
    id: 'eu_bel2_hasselt',
    name: 'Sporting Hasselt',
    shortName: 'HAS',
    reputation: 2,
    primaryColor: '#2563eb',
    stadiumName: 'Stedelijk Sportstadion (Hasselt)',
    managerName: 'Frédéric Frans',
    tierLevel: 3,
    baseOvr: 63,
  },
  {
    id: 'eu_bel2_patro_eisden',
    name: 'Patro Eisden Maasmechelen',
    shortName: 'PAT',
    reputation: 2,
    primaryColor: '#7e22ce',
    stadiumName: 'Patro Stadion (Maasmechelen)',
    managerName: 'Stijn Stijnen',
    tierLevel: 2,
    baseOvr: 66,
  },
  {
    id: 'eu_bel2_rochefort',
    name: 'Rochefort',
    shortName: 'ROC',
    reputation: 2,
    primaryColor: '#1e40af',
    stadiumName: 'Parc des Roches (Rochefort)',
    managerName: 'Jeffrey Rentmeister',
    tierLevel: 3,
    baseOvr: 61,
  },
  {
    id: 'eu_bel2_assalto',
    name: 'Assalto',
    shortName: 'ASS',
    reputation: 2,
    primaryColor: '#18181b',
    stadiumName: 'Stadion Pierre Cornelis (Aalst)',
    managerName: 'Kevin Van Haesendonck',
    tierLevel: 3,
    baseOvr: 61,
  },
  {
    id: 'eu_bel2_habay',
    name: 'Habay-la-Neuve',
    shortName: 'HAB',
    reputation: 2,
    primaryColor: '#15803d',
    stadiumName: 'Stade de la Bouverie (Habay-la-Neuve)',
    managerName: 'Marc Grosjean',
    tierLevel: 3,
    baseOvr: 60,
  },
];

export const BELGIUM_COPA_EXTRA_2026: BelgiumCopaExtraClubData[] =
  BELGIUM_COPA_EXTRA_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    reputation: seed.reputation,
    primaryColor: seed.primaryColor,
    stadiumName: seed.stadiumName,
    managerName: seed.managerName,
    tierLevel: seed.tierLevel,
    players: generateBelgianSquad(seed.id, seed.baseOvr),
  }));

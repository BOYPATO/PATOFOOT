import type { DetailedRole } from '../types/game';

export type FranceCopaExtraPlayerTuple = [string, DetailedRole, number, number, number, string];

export interface FranceCopaExtraClubData {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  players: FranceCopaExtraPlayerTuple[];
}

interface FranceCopaExtraClubSeed {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  baseOvr: number;
}

const FRENCH_FIRST_NAMES = [
  'Adrien', 'Alexandre', 'Alexis', 'Antoine', 'Arthur', 'Axel', 'Baptiste', 'Benjamin',
  'Clément', 'Corentin', 'Damien', 'Dorian', 'Dylan', 'Enzo', 'Esteban', 'Fabien',
  'Florent', 'Florian', 'Gaëtan', 'Guillaume', 'Hugo', 'Jérémy', 'Jonathan', 'Jordan',
  'Jules', 'Julien', 'Kévin', 'Kilian', 'Léo', 'Loïc', 'Louis', 'Lucas',
  'Mathéo', 'Mathieu', 'Maxence', 'Maxime', 'Mehdi', 'Mickaël', 'Nathan', 'Nicolas',
  'Noah', 'Olivier', 'Paul', 'Pierre', 'Quentin', 'Raphaël', 'Rémi', 'Romain',
  'Sébastien', 'Simon', 'Sofiane', 'Théo', 'Thomas', 'Tom', 'Valentin', 'Vincent',
  'Yanis', 'Yohan', 'Youssef', 'Zakaria',
];

const FRENCH_LAST_NAMES = [
  'Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois',
  'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David',
  'Bertrand', 'Morel', 'Fournier', 'Girard', 'Bonnet', 'Dupont', 'Lambert', 'Fontaine',
  'Rousseau', 'Vincent', 'Muller', 'Lefevre', 'Faure', 'Andre', 'Mercier', 'Blanc',
  'Guerin', 'Boyer', 'Garnier', 'Chevalier', 'Francois', 'Legrand', 'Gauthier', 'Garcia',
  'Perrin', 'Robin', 'Clement', 'Morin', 'Nicolas', 'Henry', 'Roussel', 'Mathieu',
  'Gautier', 'Masson', 'Marchand', 'Duval', 'Denis', 'Dumont', 'Marie', 'Lemaire',
  'Noel', 'Meyer', 'Dufour', 'Meunier', 'Brun', 'Blanchard', 'Giraud', 'Joly',
  'Riviere', 'Lucas', 'Brunet', 'Gaillard', 'Barbier', 'Arnaud', 'Martinez', 'Gerard',
  'Roche', 'Renard', 'Schmitt', 'Roy', 'Leroux', 'Colin', 'Vidal', 'Caron',
  'Picard', 'Roger', 'Fabre', 'Aubert', 'Lemoine', 'Renaud', 'Dumas', 'Lacroix',
  'Olivier', 'Philippe', 'Bourgeois', 'Pierre', 'Benoit', 'Rey', 'Leclerc', 'Payet',
];

const SQUAD_TEMPLATE: ReadonlyArray<{
  role: DetailedRole;
  ovrOffset: number;
  baseAge: number;
  shirt: number;
}> = [
  // Goleiros (2)
  { role: 'GOL', ovrOffset: 1, baseAge: 28, shirt: 1 },
  { role: 'GOL', ovrOffset: -2, baseAge: 22, shirt: 16 },
  // Zagueiros (4)
  { role: 'ZAG', ovrOffset: 2, baseAge: 29, shirt: 4 },
  { role: 'ZAG', ovrOffset: 1, baseAge: 26, shirt: 5 },
  { role: 'ZAG', ovrOffset: -1, baseAge: 24, shirt: 15 },
  { role: 'ZAG', ovrOffset: -2, baseAge: 21, shirt: 23 },
  // Laterais (4)
  { role: 'LAT', ovrOffset: 1, baseAge: 26, shirt: 2 },
  { role: 'LAT', ovrOffset: -2, baseAge: 22, shirt: 12 },
  { role: 'LAT', ovrOffset: 1, baseAge: 25, shirt: 3 },
  { role: 'LAT', ovrOffset: -2, baseAge: 23, shirt: 18 },
  // Meio-campo (7)
  { role: 'VOL', ovrOffset: 2, baseAge: 28, shirt: 6 },
  { role: 'VOL', ovrOffset: 0, baseAge: 24, shirt: 14 },
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

function generateFrenchSquad(clubId: string, baseOvr: number): FranceCopaExtraPlayerTuple[] {
  let seed = hashString(clubId) || 257;
  const nextRand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const usedNames = new Set<string>();
  return SQUAD_TEMPLATE.map((slot, idx) => {
    let fullName = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      const fn = FRENCH_FIRST_NAMES[Math.floor(nextRand() * FRENCH_FIRST_NAMES.length)];
      const ln = FRENCH_LAST_NAMES[Math.floor(nextRand() * FRENCH_LAST_NAMES.length)];
      const candidate = `${fn} ${ln}`;
      if (!usedNames.has(candidate)) {
        fullName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!fullName) {
      fullName = `${FRENCH_FIRST_NAMES[idx % FRENCH_FIRST_NAMES.length]} ${FRENCH_LAST_NAMES[(idx * 3) % FRENCH_LAST_NAMES.length]}`;
    }

    const ovrJitter = Math.floor(nextRand() * 3) - 1;
    const ovr = Math.max(58, Math.min(72, baseOvr + slot.ovrOffset + ovrJitter));
    const ageJitter = Math.floor(nextRand() * 5) - 2;
    const age = Math.max(19, Math.min(35, slot.baseAge + ageJitter));
    const nat = nextRand() < 0.82 ? 'FRA' : nextRand() < 0.5 ? 'MAR' : 'SEN';

    return [fullName, slot.role, ovr, age, slot.shirt, nat];
  });
}

const FRANCE_COPA_EXTRA_SEEDS: FranceCopaExtraClubSeed[] = [
  {
    id: 'eu_fra3_ami',
    name: 'Amiens SC',
    shortName: 'Amiens SC',
    reputation: 3,
    primaryColor: '#111827',
    stadiumName: 'Stade de la Licorne',
    managerName: 'Omar Daf',
    baseOvr: 66,
  },
  {
    id: 'eu_fra3_can',
    name: 'AS Cannes',
    shortName: 'AS Cannes',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Stade Pierre-de-Coubertin',
    managerName: 'Damien Ott',
    baseOvr: 63,
  },
  {
    id: 'eu_fra3_fbb',
    name: 'Bourg-en-Bresse Péronnas',
    shortName: 'Bourg-Péronnas',
    reputation: 2,
    primaryColor: '#1d4ed8',
    stadiumName: 'Stade Marcel-Verchère',
    managerName: 'David Le Frapper',
    baseOvr: 62,
  },
  {
    id: 'eu_fra3_fle',
    name: 'FC Fleury 91',
    shortName: 'FC Fleury 91',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Stade Robert-Bobin',
    managerName: 'David Vignes',
    baseOvr: 62,
  },
  {
    id: 'eu_fra3_rou',
    name: 'FC Rouen 1899',
    shortName: 'FC Rouen',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Stade Robert-Diochon',
    managerName: 'Régis Brouard',
    baseOvr: 64,
  },
  {
    id: 'eu_fra3_ver',
    name: 'FC Versailles 78',
    shortName: 'FC Versailles',
    reputation: 2,
    primaryColor: '#1e40af',
    stadiumName: 'Stade Jean-Bouin',
    managerName: 'Jordan Gonzalez',
    baseOvr: 64,
  },
  {
    id: 'eu_fra3_vil',
    name: 'FC Villefranche Beaujolais',
    shortName: 'Villefranche',
    reputation: 2,
    primaryColor: '#2563eb',
    stadiumName: 'Stade Armand-Chouffet',
    managerName: 'Laurent Combarel',
    baseOvr: 63,
  },
  {
    id: 'eu_fra3_lrv',
    name: 'La Roche VF',
    shortName: 'La Roche VF',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Stade Henri-Desgrange',
    managerName: 'Frédéric Reculeau',
    baseOvr: 60,
  },
  {
    id: 'eu_fra3_puy',
    name: 'Le Puy Foot 43',
    shortName: 'Le Puy Foot 43',
    reputation: 2,
    primaryColor: '#0ea5e9',
    stadiumName: 'Stade Charles-Massot',
    managerName: 'Stéphane Dief',
    baseOvr: 61,
  },
  {
    id: 'eu_fra3_p13',
    name: 'Paris 13 Atletico',
    shortName: 'Paris 13 Atletico',
    reputation: 2,
    primaryColor: '#15803d',
    stadiumName: 'Stade Pelé',
    managerName: 'Fabien Valéri',
    baseOvr: 62,
  },
  {
    id: 'eu_fra3_qrm',
    name: 'Quevilly-Rouen Métropole',
    shortName: 'Quevilly-Rouen',
    reputation: 2,
    primaryColor: '#b91c1c',
    stadiumName: 'Stade Robert-Diochon',
    managerName: 'David Carré',
    baseOvr: 64,
  },
  {
    id: 'eu_fra3_aub',
    name: 'SC Aubagne',
    shortName: 'SC Aubagne',
    reputation: 2,
    primaryColor: '#eab308',
    stadiumName: 'Stade de Lattre-de-Tassigny',
    managerName: 'Maxence Flachez',
    baseOvr: 62,
  },
  {
    id: 'eu_fra3_bas',
    name: 'SC Bastia',
    shortName: 'SC Bastia',
    reputation: 3,
    primaryColor: '#1d4ed8',
    stadiumName: 'Stade Armand-Cesari',
    managerName: 'Benoît Tavenot',
    baseOvr: 66,
  },
  {
    id: 'eu_fra3_cae',
    name: 'SM Caen',
    shortName: 'SM Caen',
    reputation: 3,
    primaryColor: '#dc2626',
    stadiumName: "Stade Michel-d'Ornano",
    managerName: 'Michel Der Zakarian',
    baseOvr: 66,
  },
  {
    id: 'eu_fra3_con',
    name: 'US Concarneau',
    shortName: 'US Concarneau',
    reputation: 2,
    primaryColor: '#2563eb',
    stadiumName: 'Stade Guy-Piriou',
    managerName: 'Stéphane Rossi',
    baseOvr: 64,
  },
  {
    id: 'eu_fra3_orl',
    name: 'US Orléans',
    shortName: 'US Orléans',
    reputation: 2,
    primaryColor: '#eab308',
    stadiumName: 'Stade de la Source',
    managerName: 'Hervé Della Maggiore',
    baseOvr: 64,
  },
  {
    id: 'eu_fra3_thi',
    name: 'US Thionville Lusitanos',
    shortName: 'Thionville',
    reputation: 2,
    primaryColor: '#1d4ed8',
    stadiumName: 'Stade de Guentrange',
    managerName: 'Julien François',
    baseOvr: 60,
  },
  {
    id: 'eu_fra3_val',
    name: 'Valenciennes FC',
    shortName: 'Valenciennes FC',
    reputation: 3,
    primaryColor: '#dc2626',
    stadiumName: 'Stade du Hainaut',
    managerName: 'Vincent Hognon',
    baseOvr: 65,
  },
  {
    id: 'eu_fra3_bou',
    name: 'Bourges Foot 18',
    shortName: 'Bourges',
    reputation: 2,
    primaryColor: '#b91c1c',
    stadiumName: 'Stade Jacques-Rimbault',
    managerName: 'Walid Aïchour',
    baseOvr: 61,
  },
  {
    id: 'eu_fra3_bor',
    name: 'FC Girondins de Bordeaux',
    shortName: 'Bordeaux',
    reputation: 3,
    primaryColor: '#1e3a8a',
    stadiumName: 'Matmut Atlantique',
    managerName: 'Bruno Irles',
    baseOvr: 66,
  },
];

export const FRANCE_COPA_EXTRA_2026: FranceCopaExtraClubData[] = FRANCE_COPA_EXTRA_SEEDS.map(
  (seed) => ({
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    reputation: seed.reputation,
    primaryColor: seed.primaryColor,
    stadiumName: seed.stadiumName,
    managerName: seed.managerName,
    players: generateFrenchSquad(seed.id, seed.baseOvr),
  })
);

export const FRANCE_COPA_EXTRA_CLUB_IDS: string[] = FRANCE_COPA_EXTRA_2026.map((c) => c.id);

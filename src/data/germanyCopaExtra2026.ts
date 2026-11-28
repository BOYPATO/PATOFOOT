import type { DetailedRole } from '../types/game';

export type GermanyCopaExtraPlayerTuple = [string, DetailedRole, number, number, number, string];

export interface GermanyCopaExtraClubData {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  players: GermanyCopaExtraPlayerTuple[];
}

interface GermanyCopaExtraClubSeed {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  baseOvr: number;
}

const GERMAN_FIRST_NAMES = [
  'Alexander', 'Andreas', 'Bastian', 'Benjamin', 'Christian', 'Christoph', 'Daniel', 'David',
  'Dennis', 'Dominik', 'Elias', 'Erik', 'Fabian', 'Felix', 'Finn', 'Florian',
  'Hendrik', 'Jakob', 'Jan', 'Jannik', 'Jonas', 'Jonathan', 'Julian', 'Kai',
  'Kevin', 'Kilian', 'Lars', 'Lennart', 'Leon', 'Linus', 'Luca', 'Lukas',
  'Manuel', 'Marcel', 'Marco', 'Marius', 'Marvin', 'Matteo', 'Max', 'Maximilian',
  'Michael', 'Moritz', 'Nico', 'Niklas', 'Noah', 'Oliver', 'Pascal', 'Patrick',
  'Paul', 'Philipp', 'Robin', 'Sascha', 'Sebastian', 'Simon', 'Stefan', 'Sven',
  'Tim', 'Timo', 'Tobias', 'Tom', 'Valentin', 'Yannick',
];

const GERMAN_LAST_NAMES = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
  'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf',
  'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 'Hartmann',
  'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier', 'Lehmann', 'Schmid',
  'Schulze', 'Maier', 'Köhler', 'Herrmann', 'König', 'Walter', 'Mayer', 'Huber',
  'Kaiser', 'Fuchs', 'Peters', 'Lang', 'Scholz', 'Möller', 'Weiß', 'Jung',
  'Hahn', 'Schubert', 'Vogel', 'Friedrich', 'Keller', 'Günther', 'Frank', 'Berger',
  'Winkler', 'Roth', 'Beck', 'Lorenz', 'Baumann', 'Franke', 'Albrecht', 'Schuster',
  'Simon', 'Ludwig', 'Böhm', 'Winter', 'Kraus', 'Martin', 'Schumacher', 'Krämer',
  'Vogt', 'Stein', 'Jäger', 'Otto', 'Sommer', 'Groß', 'Seidel', 'Heinrich',
  'Brandt', 'Haas', 'Schreiber', 'Graf', 'Dietrich', 'Ziegler', 'Kuhn', 'Pohl',
  'Engel', 'Horn', 'Busch', 'Bergmann', 'Thomas', 'Voigt', 'Sauer', 'Arnold',
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

function generateGermanSquad(clubId: string, baseOvr: number): GermanyCopaExtraPlayerTuple[] {
  let seed = hashString(clubId) || 313;
  const nextRand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const usedNames = new Set<string>();
  return SQUAD_TEMPLATE.map((slot, idx) => {
    let fullName = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      const fn = GERMAN_FIRST_NAMES[Math.floor(nextRand() * GERMAN_FIRST_NAMES.length)];
      const ln = GERMAN_LAST_NAMES[Math.floor(nextRand() * GERMAN_LAST_NAMES.length)];
      const candidate = `${fn} ${ln}`;
      if (!usedNames.has(candidate)) {
        fullName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!fullName) {
      fullName = `${GERMAN_FIRST_NAMES[idx % GERMAN_FIRST_NAMES.length]} ${GERMAN_LAST_NAMES[(idx * 3) % GERMAN_LAST_NAMES.length]}`;
    }

    const jitter = Math.floor(nextRand() * 3) - 1;
    const ovr = Math.max(56, Math.min(72, baseOvr + slot.ovrOffset + jitter));
    const age = Math.max(19, Math.min(35, slot.baseAge + Math.floor(nextRand() * 5) - 2));
    return [fullName, slot.role, ovr, age, slot.shirt, 'Alemanha'];
  });
}

// 28 clubes alemães participantes da DFB-Pokal (Copa da Alemanha) que complementam os 36 clubes
// da Bundesliga (18) e 2. Bundesliga (18), totalizando exatamente 64 clubes na competição.
const GERMANY_COPA_EXTRA_SEEDS: GermanyCopaExtraClubSeed[] = [
  {
    id: 'eu_ger3_f95',
    name: 'Fortuna Düsseldorf',
    shortName: 'F95',
    reputation: 3,
    primaryColor: '#dc2626',
    stadiumName: 'Merkur Spiel-Arena (Düsseldorf)',
    managerName: 'Daniel Thioune',
    baseOvr: 68,
  },
  {
    id: 'eu_ger3_prm',
    name: 'Preußen Münster',
    shortName: 'PRM',
    reputation: 3,
    primaryColor: '#15803d',
    stadiumName: 'Preußenstadion (Münster)',
    managerName: 'Sascha Hildmann',
    baseOvr: 66,
  },
  {
    id: 'eu_ger3_msv',
    name: 'MSV Duisburg',
    shortName: 'MSV',
    reputation: 2,
    primaryColor: '#1d4ed8',
    stadiumName: 'Schauinsland-Reisen-Arena (Duisburg)',
    managerName: 'Dietmar Hirsch',
    baseOvr: 64,
  },
  {
    id: 'eu_ger3_rwe',
    name: 'Rot-Weiss Essen',
    shortName: 'RWE',
    reputation: 3,
    primaryColor: '#b91c1c',
    stadiumName: 'Stadion an der Hafenstraße (Essen)',
    managerName: 'Uwe Koschinat',
    baseOvr: 65,
  },
  {
    id: 'eu_ger3_wma',
    name: 'Waldhof Mannheim',
    shortName: 'SVW',
    reputation: 2,
    primaryColor: '#1e3a8a',
    stadiumName: 'Carl-Benz-Stadion (Mannheim)',
    managerName: 'Bernhard Trares',
    baseOvr: 64,
  },
  {
    id: 'eu_ger3_m60',
    name: 'TSV 1860 München',
    shortName: 'M60',
    reputation: 3,
    primaryColor: '#0284c7',
    stadiumName: 'Grünwalder Stadion (Munique)',
    managerName: 'Patrick Glöckner',
    baseOvr: 66,
  },
  {
    id: 'eu_ger3_wuk',
    name: 'Würzburger Kickers',
    shortName: 'FWK',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Akon Arena (Würzburg)',
    managerName: 'Martin Lanig',
    baseOvr: 62,
  },
  {
    id: 'eu_ger3_alt',
    name: 'VSG Altglienicke',
    shortName: 'ALT',
    reputation: 2,
    primaryColor: '#0369a1',
    stadiumName: 'Friedrich-Ludwig-Jahn-Sportpark (Berlim)',
    managerName: 'Semih Keskin',
    baseOvr: 60,
  },
  {
    id: 'eu_ger3_kri',
    name: 'VfB 1921 Krieschow',
    shortName: 'KRI',
    reputation: 2,
    primaryColor: '#ca8a04',
    stadiumName: 'Sportpark Krieschow (Kolkwitz)',
    managerName: 'Robert Koch',
    baseOvr: 59,
  },
  {
    id: 'eu_ger3_hem',
    name: 'SV Hemelingen',
    shortName: 'HEM',
    reputation: 2,
    primaryColor: '#166534',
    stadiumName: 'Bezirkssportanlage Hemelingen (Bremen)',
    managerName: 'Günter Hermann',
    baseOvr: 58,
  },
  {
    id: 'eu_ger3_eim',
    name: 'Hamburg-Eimsbütteler',
    shortName: 'ETV',
    reputation: 2,
    primaryColor: '#991b1b',
    stadiumName: 'Stadion Hoheluft (Hamburgo)',
    managerName: 'Can Schultz',
    baseOvr: 59,
  },
  {
    id: 'eu_ger3_weh',
    name: 'SV Wehen Wiesbaden',
    shortName: 'WEH',
    reputation: 3,
    primaryColor: '#b91c1c',
    stadiumName: 'BRITA-Arena (Wiesbaden)',
    managerName: 'Nils Döring',
    baseOvr: 66,
  },
  {
    id: 'eu_ger3_aue',
    name: 'Erzgebirge Aue',
    shortName: 'AUE',
    reputation: 3,
    primaryColor: '#6d28d9',
    stadiumName: 'Erzgebirgsstadion (Aue)',
    managerName: 'Jens Härtel',
    baseOvr: 65,
  },
  {
    id: 'eu_ger3_fcs',
    name: '1. FC Saarbrücken',
    shortName: 'FCS',
    reputation: 3,
    primaryColor: '#1d4ed8',
    stadiumName: 'Ludwigsparkstadion (Saarbrücken)',
    managerName: 'Rüdiger Ziehl',
    baseOvr: 66,
  },
  {
    id: 'eu_ger3_etr',
    name: 'Eintracht Trier',
    shortName: 'ETR',
    reputation: 2,
    primaryColor: '#1e40af',
    stadiumName: 'Moselstadion (Trier)',
    managerName: 'Thomas Klasen',
    baseOvr: 60,
  },
  {
    id: 'eu_ger3_vik',
    name: 'FC Viktoria Köln',
    shortName: 'VIK',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Sportpark Höhenberg (Colônia)',
    managerName: 'Olaf Janßen',
    baseOvr: 64,
  },
  {
    id: 'eu_ger3_fch',
    name: 'FC Hansa Rostock',
    shortName: 'FCH',
    reputation: 3,
    primaryColor: '#1d4ed8',
    stadiumName: 'Ostseestadion (Rostock)',
    managerName: 'Daniel Brinkmann',
    baseOvr: 66,
  },
  {
    id: 'eu_ger3_lsk',
    name: 'Lüneburger SK Hansa',
    shortName: 'LSK',
    reputation: 2,
    primaryColor: '#111827',
    stadiumName: 'Sportanlage Sülzwiesen (Lüneburg)',
    managerName: 'Dennis Tornieporth',
    baseOvr: 58,
  },
  {
    id: 'eu_ger3_jed',
    name: 'SSV Jeddeloh',
    shortName: 'JED',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: '53acht-Arena (Edewecht)',
    managerName: 'Björn Lindemann',
    baseOvr: 59,
  },
  {
    id: 'eu_ger3_ton',
    name: 'SC St. Tönis 11/20',
    shortName: 'TON',
    reputation: 2,
    primaryColor: '#2563eb',
    stadiumName: 'Jahn-Sportanlage (Tönisvorst)',
    managerName: 'Bekim Kastrati',
    baseOvr: 58,
  },
  {
    id: 'eu_ger3_hfc',
    name: 'Hallescher FC',
    shortName: 'HFC',
    reputation: 2,
    primaryColor: '#b91c1c',
    stadiumName: 'Leuna-Chemie-Stadion (Halle)',
    managerName: 'Mark Zimmermann',
    baseOvr: 63,
  },
  {
    id: 'eu_ger3_vfb',
    name: 'VfB Lübeck',
    shortName: 'LUB',
    reputation: 2,
    primaryColor: '#15803d',
    stadiumName: 'Stadion an der Lohmühle (Lübeck)',
    managerName: 'Guerino Capretti',
    baseOvr: 62,
  },
  {
    id: 'eu_ger3_bah',
    name: 'Bahlinger SC',
    shortName: 'BAH',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Kaiserstuhlstadion (Bahlingen)',
    managerName: 'Dennis Bührer',
    baseOvr: 60,
  },
  {
    id: 'eu_ger3_sch',
    name: 'TSV Schott Mainz',
    shortName: 'SCM',
    reputation: 2,
    primaryColor: '#1d4ed8',
    stadiumName: 'Otto-Schott-Sportzentrum (Mainz)',
    managerName: 'Samuel Horozovic',
    baseOvr: 59,
  },
  {
    id: 'eu_ger3_czj',
    name: 'FC Carl Zeiss Jena',
    shortName: 'CZJ',
    reputation: 2,
    primaryColor: '#1e3a8a',
    stadiumName: 'Ernst-Abbe-Sportfeld (Jena)',
    managerName: 'Volkan Uluc',
    baseOvr: 63,
  },
  {
    id: 'eu_ger3_ver',
    name: 'SC Verl',
    shortName: 'VER',
    reputation: 2,
    primaryColor: '#111827',
    stadiumName: 'Sportclub Arena (Verl)',
    managerName: 'Alexander Ende',
    baseOvr: 64,
  },
  {
    id: 'eu_ger3_rhy',
    name: 'SV Westfalia Rhynern',
    shortName: 'RHY',
    reputation: 2,
    primaryColor: '#eab308',
    stadiumName: 'Sportplatz Papenloh (Hamm)',
    managerName: 'Michael Kaminski',
    baseOvr: 58,
  },
  {
    id: 'eu_ger3_sga',
    name: 'SG Sonnenhof Großaspach',
    shortName: 'SGA',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'WIRmachenDRUCK Arena (Aspach)',
    managerName: 'Pascal Reinhardt',
    baseOvr: 60,
  },
];

export const GERMANY_COPA_EXTRA_2026: GermanyCopaExtraClubData[] = GERMANY_COPA_EXTRA_SEEDS.map(
  (seed) => ({
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    reputation: seed.reputation,
    primaryColor: seed.primaryColor,
    stadiumName: seed.stadiumName,
    managerName: seed.managerName,
    players: generateGermanSquad(seed.id, seed.baseOvr),
  })
);

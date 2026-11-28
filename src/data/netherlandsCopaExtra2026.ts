import type { DetailedRole } from '../types/game';

export type NetherlandsCopaExtraPlayerTuple = [string, DetailedRole, number, number, number, string];

export interface NetherlandsCopaExtraClubData {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  tierLevel: 2;
  players: NetherlandsCopaExtraPlayerTuple[];
}

interface NetherlandsCopaExtraClubSeed {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  tierLevel: 2;
  baseOvr: number;
}

const DUTCH_FIRST_NAMES = [
  'Bram', 'Casper', 'Daan', 'Davy', 'Dennis', 'Dylan', 'Finn', 'Floris',
  'Gijs', 'Guus', 'Hendrik', 'Hugo', 'Jan', 'Jasper', 'Jelle', 'Jens',
  'Jesse', 'Joep', 'Joey', 'Joris', 'Jort', 'Julian', 'Kasper', 'Kees',
  'Kevin', 'Koen', 'Lars', 'Laurens', 'Levi', 'Lukas', 'Luuk', 'Maarten',
  'Martijn', 'Mats', 'Max', 'Mees', 'Michiel', 'Mike', 'Milan', 'Nick',
  'Niels', 'Noah', 'Pim', 'Rick', 'Rik', 'Robin', 'Ruben', 'Sam',
  'Sander', 'Sem', 'Siem', 'Stijn', 'Sven', 'Teun', 'Thijs', 'Thomas',
  'Tijn', 'Tim', 'Tom', 'Tygo', 'Willem', 'Wouter', 'Yannick',
];

const DUTCH_LAST_NAMES = [
  'Bakker', 'Beekman', 'Blom', 'Boer', 'Bos', 'Bosch', 'Brouwer', 'de Boer',
  'de Bruijn', 'de Groot', 'de Haan', 'de Jong', 'de Lange', 'de Ruiter', 'de Vries', 'de Wit',
  'Dekker', 'Dijk', 'Dijkstra', 'Driessen', 'Evers', 'Gerritsen', 'Groen', 'Hendriks',
  'Hermans', 'Hoekstra', 'Hofman', 'Huisman', 'Jacobs', 'Jansen', 'Janssen', 'Jonker',
  'Koster', 'Kramer', 'Kuiper', 'Kuipers', 'Maas', 'Meijer', 'Mol', 'Mulder',
  'Peters', 'Post', 'Postma', 'Prins', 'Sanders', 'Schipper', 'Scholten', 'Schouten',
  'Smit', 'Smits', 'Timmermans', 'van Beek', 'van Dam', 'van den Berg', 'van der Berg', 'van der Linden',
  'van der Meer', 'van Dijk', 'van Dongen', 'van Doorn', 'van Leeuwen', 'van Loon', 'van Vliet', 'Veenstra',
  'Verhoeven', 'Vermeer', 'Vermeulen', 'Visser', 'Vos', 'Willems', 'Willemsen',
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

function generateDutchSquad(
  clubId: string,
  baseOvr: number
): NetherlandsCopaExtraPlayerTuple[] {
  let seed = hashString(clubId) || 733;
  const nextRand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const usedNames = new Set<string>();
  return SQUAD_TEMPLATE.map((slot) => {
    let fullName = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      const fn = DUTCH_FIRST_NAMES[Math.floor(nextRand() * DUTCH_FIRST_NAMES.length)];
      const ln = DUTCH_LAST_NAMES[Math.floor(nextRand() * DUTCH_LAST_NAMES.length)];
      const candidate = `${fn} ${ln}`;
      if (!usedNames.has(candidate)) {
        fullName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!fullName) fullName = `Daan de Jong ${slot.shirt}`;
    const jitter = Math.floor(nextRand() * 3) - 1;
    const ovr = Math.max(54, Math.min(72, baseOvr + slot.ovrOffset + jitter));
    const age = Math.max(18, Math.min(35, slot.baseAge + Math.floor(nextRand() * 5) - 2));
    return [fullName, slot.role, ovr, age, slot.shirt, 'Holanda'];
  });
}

const NETHERLANDS_COPA_EXTRA_SEEDS: NetherlandsCopaExtraClubSeed[] = [
  {
    id: 'eu_ned2_almere',
    name: 'Almere City FC',
    shortName: 'ALM',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Yanmar Stadion (Almere)',
    managerName: 'Jeroen Rijsdijk',
    tierLevel: 2,
    baseOvr: 66,
  },
  {
    id: 'eu_ned2_graafschap',
    name: 'De Graafschap',
    shortName: 'GRA',
    reputation: 2,
    primaryColor: '#1d4ed8',
    stadiumName: 'Stadion De Vijverberg (Doetinchem)',
    managerName: 'Marinus Dijkhuizen',
    tierLevel: 2,
    baseOvr: 66,
  },
  {
    id: 'eu_ned2_den_bosch',
    name: 'FC Den Bosch',
    shortName: 'DBO',
    reputation: 2,
    primaryColor: '#2563eb',
    stadiumName: "Stadion De Vliert ('s-Hertogenbosch)",
    managerName: 'Ulrich Landvreugd',
    tierLevel: 2,
    baseOvr: 64,
  },
  {
    id: 'eu_ned2_dordrecht',
    name: 'FC Dordrecht',
    shortName: 'DOR',
    reputation: 2,
    primaryColor: '#15803d',
    stadiumName: 'M-Scores Stadion (Dordrecht)',
    managerName: 'Melvin Boel',
    tierLevel: 2,
    baseOvr: 64,
  },
  {
    id: 'eu_ned2_eindhoven',
    name: 'FC Eindhoven',
    shortName: 'EIN',
    reputation: 2,
    primaryColor: '#1e40af',
    stadiumName: 'Jan Louwers Stadion (Eindhoven)',
    managerName: 'Maurice Verberne',
    tierLevel: 2,
    baseOvr: 64,
  },
  {
    id: 'eu_ned2_emmen',
    name: 'FC Emmen',
    shortName: 'EMM',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'De Oude Meerdijk (Emmen)',
    managerName: 'Alfons Arts',
    tierLevel: 2,
    baseOvr: 65,
  },
  {
    id: 'eu_ned2_volendam',
    name: 'FC Volendam',
    shortName: 'VOL',
    reputation: 3,
    primaryColor: '#f97316',
    stadiumName: 'Kras Stadion (Volendam)',
    managerName: 'Rick Kruys',
    tierLevel: 2,
    baseOvr: 67,
  },
  {
    id: 'eu_ned2_helmond',
    name: 'Helmond Sport',
    shortName: 'HEL',
    reputation: 2,
    primaryColor: '#b91c1c',
    stadiumName: 'GS Staalwerken Stadion (Helmond)',
    managerName: 'Kevin Hofland',
    tierLevel: 2,
    baseOvr: 63,
  },
  {
    id: 'eu_ned2_heracles',
    name: 'Heracles Almelo',
    shortName: 'HER',
    reputation: 3,
    primaryColor: '#18181b',
    stadiumName: 'Asito Stadion (Almelo)',
    managerName: 'Erwin van de Looi',
    tierLevel: 2,
    baseOvr: 68,
  },
  {
    id: 'eu_ned2_mvv',
    name: 'MVV Maastricht',
    shortName: 'MVV',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Stadion De Geusselt (Maastricht)',
    managerName: 'Edwin Hermans',
    tierLevel: 2,
    baseOvr: 63,
  },
  {
    id: 'eu_ned2_nac',
    name: 'NAC Breda',
    shortName: 'NAC',
    reputation: 3,
    primaryColor: '#eab308',
    stadiumName: 'Rat Verlegh Stadion (Breda)',
    managerName: 'Carl Hoefkens',
    tierLevel: 2,
    baseOvr: 68,
  },
  {
    id: 'eu_ned2_roda',
    name: 'Roda JC Kerkrade',
    shortName: 'ROD',
    reputation: 2,
    primaryColor: '#ca8a04',
    stadiumName: 'Parkstad Limburg Stadion (Kerkrade)',
    managerName: 'Bas Sibum',
    tierLevel: 2,
    baseOvr: 66,
  },
  {
    id: 'eu_ned2_vitesse',
    name: 'Vitesse',
    shortName: 'VIT',
    reputation: 3,
    primaryColor: '#eab308',
    stadiumName: 'GelreDome (Arnhem)',
    managerName: 'John van den Brom',
    tierLevel: 2,
    baseOvr: 66,
  },
  {
    id: 'eu_ned2_vvv',
    name: 'VVV-Venlo',
    shortName: 'VVV',
    reputation: 2,
    primaryColor: '#facc15',
    stadiumName: 'Covebo Stadion - De Koel (Venlo)',
    managerName: 'John Lammers',
    tierLevel: 2,
    baseOvr: 64,
  },
];

export const NETHERLANDS_COPA_EXTRA_2026: NetherlandsCopaExtraClubData[] =
  NETHERLANDS_COPA_EXTRA_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    reputation: seed.reputation,
    primaryColor: seed.primaryColor,
    stadiumName: seed.stadiumName,
    managerName: seed.managerName,
    tierLevel: seed.tierLevel,
    players: generateDutchSquad(seed.id, seed.baseOvr),
  }));

import type { DetailedRole } from '../types/game';

export type EnglandFaCupExtraPlayerTuple = [string, DetailedRole, number, number, number, string];

export interface EnglandFaCupExtraClubData {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  tierLevel: 5 | 6 | 7 | 8;
  players: EnglandFaCupExtraPlayerTuple[];
}

interface EnglandFaCupExtraClubSeed {
  id: string;
  name: string;
  shortName: string;
  reputation: number;
  primaryColor: string;
  stadiumName: string;
  managerName: string;
  tierLevel: 5 | 6 | 7 | 8;
  baseOvr: number;
}

const ENGLISH_FIRST_NAMES = [
  'Aaron', 'Adam', 'Alex', 'Alfie', 'Archie', 'Ashley', 'Ben', 'Billy',
  'Bradley', 'Callum', 'Cameron', 'Charlie', 'Chris', 'Connor', 'Craig', 'Dan',
  'Daniel', 'Danny', 'Declan', 'Dylan', 'Elliot', 'Ethan', 'Finley', 'Freddie',
  'George', 'Harrison', 'Harry', 'Harvey', 'Jack', 'Jacob', 'Jake', 'James',
  'Jamie', 'Jay', 'Joe', 'Joel', 'Jordan', 'Josh', 'Joshua', 'Kieran',
  'Kyle', 'Lewis', 'Liam', 'Louis', 'Lucas', 'Luke', 'Marcus', 'Mason',
  'Matt', 'Matthew', 'Max', 'Michael', 'Morgan', 'Nathan', 'Niall', 'Noah',
  'Oliver', 'Ollie', 'Owen', 'Reece', 'Rhys', 'Ryan', 'Sam', 'Scott',
  'Sean', 'Toby', 'Tom', 'Tommy', 'Tyler', 'Will', 'William', 'Zak',
];

const ENGLISH_LAST_NAMES = [
  'Adams', 'Allen', 'Anderson', 'Armstrong', 'Atkinson', 'Bailey', 'Baker', 'Barker',
  'Barnes', 'Bell', 'Bennett', 'Booth', 'Bradley', 'Brooks', 'Brown', 'Burton',
  'Butler', 'Campbell', 'Carter', 'Chapman', 'Clark', 'Clarke', 'Cole', 'Collins',
  'Cook', 'Cooper', 'Cox', 'Davies', 'Davis', 'Dawson', 'Dixon', 'Edwards',
  'Elliott', 'Ellis', 'Evans', 'Fisher', 'Fletcher', 'Foster', 'Fox', 'Gibson',
  'Graham', 'Grant', 'Gray', 'Green', 'Griffiths', 'Hall', 'Hamilton', 'Harris',
  'Harrison', 'Hart', 'Harvey', 'Henderson', 'Hill', 'Holmes', 'Howard', 'Hughes',
  'Hunt', 'Hunter', 'Jackson', 'James', 'Jenkins', 'Johnson', 'Jones', 'Kelly',
  'Kennedy', 'King', 'Knight', 'Lawrence', 'Lee', 'Lewis', 'Lloyd', 'Marshall',
  'Martin', 'Mason', 'Matthews', 'Miller', 'Mills', 'Mitchell', 'Moore', 'Morgan',
  'Morris', 'Murray', 'Newman', 'Nicholson', 'Owen', 'Palmer', 'Parker', 'Patel',
  'Payne', 'Pearce', 'Pearson', 'Perry', 'Phillips', 'Powell', 'Price', 'Reid',
  'Reynolds', 'Richards', 'Richardson', 'Roberts', 'Robertson', 'Robinson', 'Rogers', 'Rose',
  'Ross', 'Russell', 'Saunders', 'Scott', 'Shaw', 'Simpson', 'Smith', 'Spencer',
  'Stevens', 'Stewart', 'Stone', 'Taylor', 'Thomas', 'Thompson', 'Turner', 'Walker',
  'Walsh', 'Ward', 'Watson', 'Watts', 'Webb', 'Wells', 'West', 'White',
  'Wilkinson', 'Williams', 'Williamson', 'Wilson', 'Wood', 'Wright', 'Young',
];

const SQUAD_TEMPLATE: ReadonlyArray<{
  role: DetailedRole;
  ovrOffset: number;
  baseAge: number;
  shirt: number;
}> = [
  // Goleiros (2)
  { role: 'GOL', ovrOffset: 1, baseAge: 28, shirt: 1 },
  { role: 'GOL', ovrOffset: -2, baseAge: 22, shirt: 13 },
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
  { role: 'MEI', ovrOffset: 0, baseAge: 23, shirt: 12 },
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

function generateEnglishNonLeagueSquad(
  clubId: string,
  baseOvr: number
): EnglandFaCupExtraPlayerTuple[] {
  let seed = hashString(clubId) || 409;
  const nextRand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const usedNames = new Set<string>();
  return SQUAD_TEMPLATE.map((slot) => {
    let fullName = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      const fn = ENGLISH_FIRST_NAMES[Math.floor(nextRand() * ENGLISH_FIRST_NAMES.length)];
      const ln = ENGLISH_LAST_NAMES[Math.floor(nextRand() * ENGLISH_LAST_NAMES.length)];
      const candidate = `${fn} ${ln}`;
      if (!usedNames.has(candidate)) {
        fullName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!fullName) fullName = `Jack Smith ${slot.shirt}`;
    const jitter = Math.floor(nextRand() * 3) - 1;
    const ovr = Math.max(46, Math.min(64, baseOvr + slot.ovrOffset + jitter));
    const ageJitter = Math.floor(nextRand() * 5) - 2;
    const age = Math.max(18, Math.min(35, slot.baseAge + ageJitter));
    return [fullName, slot.role, ovr, age, slot.shirt, 'Inglaterra'];
  });
}

// 32 clubes ingleses de divisões Non-League (National League L5, North/South L6, Step 3 L7 e Step 4 L8)
// presentes na 1ª Rodada oficial da Emirates FA Cup 2026/27.
const ENGLAND_FACUP_EXTRA_SEEDS: EnglandFaCupExtraClubSeed[] = [
  // === National League (L5 — 16 clubes) ===
  {
    id: 'eu_eng5_crl',
    name: 'Carlisle United',
    shortName: 'CAR',
    reputation: 2,
    primaryColor: '#1d4ed8',
    stadiumName: 'Brunton Park, Carlisle',
    managerName: 'Mark Hughes',
    tierLevel: 5,
    baseOvr: 58,
  },
  {
    id: 'eu_eng5_brw',
    name: 'Barrow AFC',
    shortName: 'BAR',
    reputation: 2,
    primaryColor: '#0284c7',
    stadiumName: 'Holker Street, Barrow',
    managerName: 'Andy Whing',
    tierLevel: 5,
    baseOvr: 57,
  },
  {
    id: 'eu_eng5_hgt',
    name: 'Harrogate Town',
    shortName: 'HAR',
    reputation: 2,
    primaryColor: '#eab308',
    stadiumName: 'Wetherby Road, Harrogate',
    managerName: 'Simon Weaver',
    tierLevel: 5,
    baseOvr: 57,
  },
  {
    id: 'eu_eng5_fgr',
    name: 'Forest Green Rovers',
    shortName: 'FGR',
    reputation: 2,
    primaryColor: '#22c55e',
    stadiumName: 'The New Lawn, Nailsworth',
    managerName: 'Steve Cotterill',
    tierLevel: 5,
    baseOvr: 57,
  },
  {
    id: 'eu_eng5_sut',
    name: 'Sutton United',
    shortName: 'SUT',
    reputation: 2,
    primaryColor: '#f59e0b',
    stadiumName: 'Gander Green Lane, London',
    managerName: 'Steve Morison',
    tierLevel: 5,
    baseOvr: 56,
  },
  {
    id: 'eu_eng5_scu',
    name: 'Scunthorpe United',
    shortName: 'SCU',
    reputation: 2,
    primaryColor: '#7f1d1d',
    stadiumName: 'Glanford Park, Scunthorpe',
    managerName: 'Andy Butler',
    tierLevel: 5,
    baseOvr: 56,
  },
  {
    id: 'eu_eng5_hal',
    name: 'Halifax Town',
    shortName: 'HAL',
    reputation: 2,
    primaryColor: '#2563eb',
    stadiumName: 'The Shay, Halifax',
    managerName: 'Chris Millington',
    tierLevel: 5,
    baseOvr: 56,
  },
  {
    id: 'eu_eng5_alt',
    name: 'Altrincham FC',
    shortName: 'ALT',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Moss Lane, Altrincham',
    managerName: 'Phil Parkinson',
    tierLevel: 5,
    baseOvr: 56,
  },
  {
    id: 'eu_eng5_yeo',
    name: 'Yeovil Town',
    shortName: 'YEO',
    reputation: 2,
    primaryColor: '#16a34a',
    stadiumName: 'Huish Park, Yeovil',
    managerName: 'Mark Cooper',
    tierLevel: 5,
    baseOvr: 56,
  },
  {
    id: 'eu_eng5_bor',
    name: 'Boreham Wood',
    shortName: 'BOR',
    reputation: 2,
    primaryColor: '#1e293b',
    stadiumName: 'Meadow Park, Borehamwood',
    managerName: 'Luke Garrard',
    tierLevel: 5,
    baseOvr: 56,
  },
  {
    id: 'eu_eng5_ald',
    name: 'Aldershot Town',
    shortName: 'ALD',
    reputation: 2,
    primaryColor: '#b91c1c',
    stadiumName: 'Recreation Ground, Aldershot',
    managerName: 'Tommy Widdrington',
    tierLevel: 5,
    baseOvr: 55,
  },
  {
    id: 'eu_eng5_eas',
    name: 'Eastleigh FC',
    shortName: 'EAS',
    reputation: 2,
    primaryColor: '#1d4ed8',
    stadiumName: 'Ten Acres, Eastleigh',
    managerName: 'Kelvin Davis',
    tierLevel: 5,
    baseOvr: 55,
  },
  {
    id: 'eu_eng5_wea',
    name: 'Wealdstone FC',
    shortName: 'WEA',
    reputation: 2,
    primaryColor: '#2563eb',
    stadiumName: 'Grosvenor Vale, Ruislip',
    managerName: 'Neil Gibson',
    tierLevel: 5,
    baseOvr: 55,
  },
  {
    id: 'eu_eng5_fyl',
    name: 'AFC Fylde',
    shortName: 'FYL',
    reputation: 2,
    primaryColor: '#1e3a8a',
    stadiumName: 'Mill Farm, Wesham',
    managerName: 'Kevin Phillips',
    tierLevel: 5,
    baseOvr: 55,
  },
  {
    id: 'eu_eng5_kid',
    name: 'Kidderminster Harriers',
    shortName: 'KID',
    reputation: 2,
    primaryColor: '#dc2626',
    stadiumName: 'Aggborough Stadium, Kidderminster',
    managerName: 'Phil Brown',
    tierLevel: 5,
    baseOvr: 55,
  },
  {
    id: 'eu_eng5_hrn',
    name: 'Hornchurch FC',
    shortName: 'HRN',
    reputation: 1,
    primaryColor: '#b91c1c',
    stadiumName: 'Hornchurch Stadium, Upminster',
    managerName: 'Daryl McMahon',
    tierLevel: 5,
    baseOvr: 55,
  },

  // === National League North / South (L6 — 6 clubes) ===
  {
    id: 'eu_eng5_oxc',
    name: 'Oxford City',
    shortName: 'OXC',
    reputation: 1,
    primaryColor: '#1d4ed8',
    stadiumName: 'Marsh Lane, Oxford',
    managerName: 'Ross Jenkins',
    tierLevel: 6,
    baseOvr: 53,
  },
  {
    id: 'eu_eng5_dov',
    name: 'Dover Athletic',
    shortName: 'DOV',
    reputation: 1,
    primaryColor: '#0f172a',
    stadiumName: 'Crabble Athletic Ground, Dover',
    managerName: 'Jake Leberl',
    tierLevel: 6,
    baseOvr: 53,
  },
  {
    id: 'eu_eng5_mac',
    name: 'Macclesfield FC',
    shortName: 'MAC',
    reputation: 1,
    primaryColor: '#2563eb',
    stadiumName: 'Moss Rose, Macclesfield',
    managerName: 'Robbie Savage',
    tierLevel: 6,
    baseOvr: 54,
  },
  {
    id: 'eu_eng5_mar',
    name: 'Marine AFC',
    shortName: 'MAR',
    reputation: 1,
    primaryColor: '#0f172a',
    stadiumName: 'Rossett Park, Crosby',
    managerName: 'Neil Young',
    tierLevel: 6,
    baseOvr: 52,
  },
  {
    id: 'eu_eng5_sby',
    name: 'Salisbury FC',
    shortName: 'SBY',
    reputation: 1,
    primaryColor: '#111827',
    stadiumName: 'Raymond McEnhill Stadium, Salisbury',
    managerName: 'Brian Dutton',
    tierLevel: 6,
    baseOvr: 52,
  },
  {
    id: 'eu_eng5_hbh',
    name: 'Harborough Town',
    shortName: 'HBH',
    reputation: 1,
    primaryColor: '#eab308',
    stadiumName: 'Bowden Park, Market Harborough',
    managerName: 'Mitch Austin',
    tierLevel: 6,
    baseOvr: 52,
  },

  // === Step 3 — Northern / Southern / Isthmian Premier (L7 — 8 clubes) ===
  {
    id: 'eu_eng5_gui',
    name: 'Guiseley AFC',
    shortName: 'GUI',
    reputation: 1,
    primaryColor: '#1d4ed8',
    stadiumName: 'Nethermoor Park, Guiseley',
    managerName: 'Mark Bower',
    tierLevel: 7,
    baseOvr: 51,
  },
  {
    id: 'eu_eng5_wor',
    name: 'Worcester City',
    shortName: 'WOR',
    reputation: 1,
    primaryColor: '#2563eb',
    stadiumName: 'Sixways Stadium, Worcester',
    managerName: 'Chris Cornes',
    tierLevel: 7,
    baseOvr: 50,
  },
  {
    id: 'eu_eng5_sho',
    name: 'Sholing FC',
    shortName: 'SHO',
    reputation: 1,
    primaryColor: '#dc2626',
    stadiumName: 'Universal Stadium, Southampton',
    managerName: 'Paul Doswell',
    tierLevel: 7,
    baseOvr: 50,
  },
  {
    id: 'eu_eng5_alv',
    name: 'Alvechurch FC',
    shortName: 'ALV',
    reputation: 1,
    primaryColor: '#eab308',
    stadiumName: 'Lye Meadow, Alvechurch',
    managerName: 'Tim Flowers',
    tierLevel: 7,
    baseOvr: 50,
  },
  {
    id: 'eu_eng5_crw',
    name: 'Cray Wanderers',
    shortName: 'CWA',
    reputation: 1,
    primaryColor: '#f59e0b',
    stadiumName: 'Flamingo Park, Chislehurst',
    managerName: 'Neil Smith',
    tierLevel: 7,
    baseOvr: 50,
  },
  {
    id: 'eu_eng5_wmb',
    name: 'Wimborne Town',
    shortName: 'WMB',
    reputation: 1,
    primaryColor: '#1e293b',
    stadiumName: 'New Cuthbury, Wimborne',
    managerName: 'Tim Sills',
    tierLevel: 7,
    baseOvr: 50,
  },
  {
    id: 'eu_eng5_ppw',
    name: 'Plymouth Parkway',
    shortName: 'PPW',
    reputation: 1,
    primaryColor: '#ca8a04',
    stadiumName: 'Bolitho Park, Plymouth',
    managerName: 'Chris McPhee',
    tierLevel: 7,
    baseOvr: 50,
  },
  {
    id: 'eu_eng5_ber',
    name: 'Berkhamsted FC',
    shortName: 'BER',
    reputation: 1,
    primaryColor: '#facc15',
    stadiumName: 'Broadwater, Berkhamsted',
    managerName: 'Chris Devane',
    tierLevel: 7,
    baseOvr: 49,
  },

  // === Step 4 — Regional Division One (L8 — 2 clubes) ===
  {
    id: 'eu_eng5_rus',
    name: 'AFC Rushden & Diamonds',
    shortName: 'R&D',
    reputation: 1,
    primaryColor: '#1d4ed8',
    stadiumName: 'Hayden Road, Rushden',
    managerName: 'Elliot Sandy',
    tierLevel: 8,
    baseOvr: 48,
  },
  {
    id: 'eu_eng5_sta',
    name: 'Stafford Rangers',
    shortName: 'STA',
    reputation: 1,
    primaryColor: '#0f172a',
    stadiumName: 'Marston Road, Stafford',
    managerName: 'Graham Deakin',
    tierLevel: 8,
    baseOvr: 48,
  },
];

export const ENGLAND_FACUP_EXTRA_2026: EnglandFaCupExtraClubData[] = ENGLAND_FACUP_EXTRA_SEEDS.map(
  (seed) => ({
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    reputation: seed.reputation,
    primaryColor: seed.primaryColor,
    stadiumName: seed.stadiumName,
    managerName: seed.managerName,
    tierLevel: seed.tierLevel,
    players: generateEnglishNonLeagueSquad(seed.id, seed.baseOvr),
  })
);

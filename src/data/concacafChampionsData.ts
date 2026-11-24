import { Club, DetailedRole, Player, Position } from '../types/game';
import { resolvePlayerNationality } from '../utils/nationalityUtils';

export const CONCACAF_CARIBBEAN_CHAMP_ID = 'guest_conc_mtp';
export const CONCACAF_CENTRAL_AMERICA_CHAMP_ID = 'guest_conc_ala';

export const CONCACAF_CARIBBEAN_R1_IDS: string[] = [
  'guest_conc_omd',
  'guest_conc_def',
];

export const CONCACAF_CENTRAL_AMERICA_R1_IDS: string[] = [
  'guest_conc_car',
  'guest_conc_xel',
  'guest_conc_oli',
  'guest_conc_res',
  'guest_conc_smi',
];

function getPosFromRole(role: DetailedRole): Position {
  if (role === 'GOL') return 'GK';
  if (role === 'ZAG' || role === 'LAT') return 'DF';
  if (role === 'VOL' || role === 'MEI') return 'MF';
  return 'FW';
}

function buildConcacafGuestClub(params: {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  country: string;
  managerName: string;
  primary: string;
  secondary: string;
  text: string;
  stadiumName: string;
  capacity: number;
  baseOvr: number;
  reputation: number;
  starters: Array<[string, DetailedRole, number, number, number]>;
}): Club {
  const b = Math.max(61, params.baseOvr - 3);
  const fullSeeds: Array<[string, DetailedRole, number, number, number]> = [
    ...params.starters,
    [`${params.shortName} GK Res`, 'GOL', b - 1, 26, 12],
    [`${params.shortName} Zag Res`, 'ZAG', b, 24, 14],
    [`${params.shortName} Lat Res`, 'LAT', b - 1, 25, 16],
    [`${params.shortName} Vol Res`, 'VOL', b, 25, 18],
    [`${params.shortName} Mei Res`, 'MEI', b, 23, 20],
    [`${params.shortName} Ata Res`, 'ATA', b, 24, 21],
    [`${params.shortName} Pnt Res`, 'ATA', b - 1, 22, 19],
  ];

  const squad: Player[] = fullSeeds.map(([pName, role, ovr, age, num], idx) => {
    const pid = `${params.id}_p_${idx + 1}`;
    return {
      id: pid,
      name: pName,
      nationality: resolvePlayerNationality({ id: pid, name: pName }, params.country),
      position: getPosFromRole(role),
      detailedRole: role,
      overall: ovr,
      age,
      condition: 98,
      morale: 'Boa',
      wage: Math.round(ovr * 6500),
      marketValue: Math.round(ovr * 450000),
      contractYears: 3,
      preferredFoot: idx % 3 === 0 ? 'Canhoto' : 'Destro',
      specialSkill: idx < 3 ? 'Destaque Regional' : 'Titular',
      matches: 10,
      goals: role === 'ATA' ? 5 : role === 'MEI' ? 2 : 0,
      assists: role === 'MEI' ? 3 : 1,
      yellowCards: 1,
      redCards: 0,
      isSuspended: false,
      injuryWeeks: 0,
      isStarter: idx < 11,
      isSubstitute: idx >= 11 && idx < 18,
      pitchSlot: idx < 11 ? idx : undefined,
      squadNumber: num,
      ratingAverage: 7.0,
      potential: Math.min(86, ovr + 3),
    };
  });

  return {
    id: params.id,
    name: params.name,
    shortName: params.shortName,
    initials: params.initials,
    state: 'INT',
    division: 'WL',
    reputation: params.reputation,
    country: params.country,
    colors: { primary: params.primary, secondary: params.secondary, text: params.text },
    stadium: { name: params.stadiumName, capacity: params.capacity, ticketPrice: 70, level: 3 },
    finances: {
      balance: params.baseOvr * 900_000,
      weeklySponsor: params.baseOvr * 11_000,
      weeklyExpenses: params.baseOvr * 8_000,
      stadiumLevel: 3,
      trainingFacilityLevel: 3,
      medicalFacilityLevel: 3,
      youthAcademyLevel: 3,
      seasonTicketHolders: 11000,
      totalIncomeSeason: params.baseOvr * 600_000,
      totalExpensesSeason: params.baseOvr * 420_000,
    },
    tactics: {
      formation: '4-3-3',
      mentality: 'Equilibrado',
      marking: 'Normal',
      passing: 'Misto',
      captainId: squad[3]?.id,
      penaltyTakerId: squad[9]?.id,
      freekickTakerId: squad[7]?.id,
      cornerTakerId: squad[6]?.id,
    },
    squad,
    isUser: false,
    managerName: params.managerName,
  };
}

export const CONCACAF_GUEST_CLUBS: Club[] = [
  buildConcacafGuestClub({
    id: CONCACAF_CENTRAL_AMERICA_CHAMP_ID,
    name: 'LD Alajuelense',
    shortName: 'Alajuelense',
    initials: 'LDA',
    country: 'Costa Rica',
    managerName: 'Alexandre Guimarães',
    primary: '#DC2626',
    secondary: '#111111',
    text: '#FFFFFF',
    stadiumName: 'Estadio Alejandro Morera Soto',
    capacity: 17895,
    baseOvr: 70,
    reputation: 3,
    starters: [
      ['Leonel Moreira', 'GOL', 71, 36, 23],
      ['Carlos Martínez', 'LAT', 69, 27, 2],
      ['Alexis Gamboa', 'ZAG', 71, 27, 13],
      ['Santiago van der Putten', 'ZAG', 70, 21, 25],
      ['Bryan Oviedo', 'LAT', 70, 36, 8],
      ['Celso Borges', 'VOL', 72, 38, 5],
      ['Rashir Parkins', 'MEI', 70, 25, 16],
      ['Diego Campos', 'MEI', 71, 30, 11],
      ['Joel Campbell', 'ATA', 73, 33, 12],
      ['Jonathan Moya', 'ATA', 71, 34, 9],
      ['Anderson Canhoto', 'ATA', 71, 29, 97],
    ],
  }),
  buildConcacafGuestClub({
    id: CONCACAF_CARIBBEAN_CHAMP_ID,
    name: 'Mount Pleasant FA',
    shortName: 'Mount Pleasant',
    initials: 'MPF',
    country: 'Jamaica',
    managerName: 'Theodore Whitmore',
    primary: '#047857',
    secondary: '#FACC15',
    text: '#FFFFFF',
    stadiumName: 'Drax Hall Sports Complex',
    capacity: 6000,
    baseOvr: 66,
    reputation: 2,
    starters: [
      ['Tafari Chambers', 'GOL', 66, 25, 1],
      ['Sue-Lae McCalla', 'LAT', 66, 33, 2],
      ['Jamoi Topey', 'ZAG', 67, 26, 4],
      ['Ladale Richie', 'ZAG', 66, 36, 5],
      ['Fitzroy Cummings', 'LAT', 65, 25, 3],
      ['Daniel Green', 'VOL', 66, 28, 6],
      ['Jahshaun Anglin', 'MEI', 66, 24, 8],
      ['Shaqueil Bradford', 'MEI', 67, 26, 10],
      ['Trivante Stewart', 'ATA', 68, 26, 9],
      ['Warner Brown', 'ATA', 67, 23, 11],
      ['Kimoni Bailey', 'ATA', 66, 25, 7],
    ],
  }),
  buildConcacafGuestClub({
    id: 'guest_conc_car',
    name: 'CS Cartaginés',
    shortName: 'Cartaginés',
    initials: 'CSC',
    country: 'Costa Rica',
    managerName: 'Andrés Carevic',
    primary: '#1D4ED8',
    secondary: '#FFFFFF',
    text: '#FFFFFF',
    stadiumName: 'Estadio José Rafael Fello Meza',
    capacity: 13500,
    baseOvr: 68,
    reputation: 3,
    starters: [
      ['Kevin Briceño', 'GOL', 68, 34, 35],
      ['José Quirós', 'LAT', 67, 29, 12],
      ['Kevin Espinoza', 'ZAG', 68, 29, 4],
      ['Marcelo Pereira', 'ZAG', 68, 30, 5],
      ['Diego González', 'LAT', 67, 27, 3],
      ['Christian Martínez', 'VOL', 68, 32, 6],
      ['Dylan Flores', 'MEI', 69, 32, 10],
      ['Allen Guevara', 'MEI', 69, 37, 7],
      ['Marcos Ureña', 'ATA', 69, 36, 21],
      ['Marcel Hernández', 'ATA', 71, 36, 9],
      ['Jostin Daly', 'ATA', 68, 28, 11],
    ],
  }),
  buildConcacafGuestClub({
    id: 'guest_conc_xel',
    name: 'Xelajú MC',
    shortName: 'Xelajú MC',
    initials: 'XEL',
    country: 'Guatemala',
    managerName: 'Amarini Villatoro',
    primary: '#1E3A8A',
    secondary: '#DC2626',
    text: '#FFFFFF',
    stadiumName: 'Estadio Mario Camposeco',
    capacity: 11226,
    baseOvr: 66,
    reputation: 2,
    starters: [
      ['José Calderón', 'GOL', 67, 40, 1],
      ['Javier González', 'LAT', 66, 28, 2],
      ['Kevin Ruiz', 'ZAG', 67, 30, 4],
      ['Harold Cummings', 'ZAG', 67, 34, 5],
      ['Widvin Tebalán', 'LAT', 65, 25, 3],
      ['Maynor de León', 'VOL', 66, 36, 6],
      ['Jorge Aparicio', 'MEI', 67, 33, 8],
      ['Yilton Díaz', 'MEI', 67, 33, 10],
      ['Elmer Cardoza', 'ATA', 66, 23, 7],
      ['Pedro Báez', 'ATA', 68, 29, 9],
      ['Óscar Villa', 'ATA', 67, 31, 11],
    ],
  }),
  buildConcacafGuestClub({
    id: 'guest_conc_oli',
    name: 'CD Olimpia',
    shortName: 'Olimpia HON',
    initials: 'OLI',
    country: 'Honduras',
    managerName: 'Eduardo Espinel',
    primary: '#FFFFFF',
    secondary: '#1D4ED8',
    text: '#0F172A',
    stadiumName: 'Estadio Nacional Chelato Uclés',
    capacity: 35000,
    baseOvr: 69,
    reputation: 3,
    starters: [
      ['Edrick Menjívar', 'GOL', 70, 33, 1],
      ['Maylor Núñez', 'LAT', 68, 29, 14],
      ['Jonathan Paz', 'ZAG', 69, 28, 17],
      ['José García', 'ZAG', 69, 27, 4],
      ['Carlos Sánchez', 'LAT', 68, 35, 31],
      ['Jorge Álvarez', 'VOL', 71, 28, 23],
      ['Edwin Rodríguez', 'MEI', 71, 26, 8],
      ['José Mario Pinto', 'MEI', 70, 28, 7],
      ['Michaell Chirinos', 'ATA', 70, 30, 33],
      ['Jerry Bengtson', 'ATA', 70, 39, 27],
      ['Yustin Arboleda', 'ATA', 70, 34, 19],
    ],
  }),
  buildConcacafGuestClub({
    id: 'guest_conc_res',
    name: 'Real España',
    shortName: 'Real España',
    initials: 'RES',
    country: 'Honduras',
    managerName: 'Jeaustin Campos',
    primary: '#FACC15',
    secondary: '#111111',
    text: '#111111',
    stadiumName: 'Estadio Francisco Morazán',
    capacity: 18000,
    baseOvr: 67,
    reputation: 2,
    starters: [
      ['Luis López', 'GOL', 68, 32, 22],
      ['Franklin Flores', 'LAT', 67, 29, 28],
      ['Devron García', 'ZAG', 67, 30, 6],
      ['Sebastián Hernández', 'ZAG', 67, 24, 4],
      ['Dixon Ramírez', 'LAT', 66, 25, 19],
      ['Jhow Benavídez', 'VOL', 68, 30, 10],
      ['Bryan Moya', 'MEI', 68, 32, 13],
      ['Carlos Mejía', 'MEI', 67, 29, 7],
      ['Darixon Vuelto', 'ATA', 68, 28, 11],
      ['Daniel Carter', 'ATA', 67, 22, 9],
      ['Brayan Félix', 'ATA', 67, 23, 21],
    ],
  }),
  buildConcacafGuestClub({
    id: 'guest_conc_smi',
    name: 'Sporting San Miguelito',
    shortName: 'San Miguelito',
    initials: 'SSM',
    country: 'Panamá',
    managerName: 'César Aguilar',
    primary: '#DC2626',
    secondary: '#FFFFFF',
    text: '#FFFFFF',
    stadiumName: 'Estadio Los Andes',
    capacity: 1500,
    baseOvr: 65,
    reputation: 2,
    starters: [
      ['Marcos De León', 'GOL', 65, 25, 1],
      ['Rodrigo Tello', 'LAT', 65, 22, 2],
      ['Éric Vásquez', 'ZAG', 66, 38, 4],
      ['Richard Peralta', 'ZAG', 65, 32, 5],
      ['Javier Rivera', 'LAT', 64, 28, 3],
      ['Emerson Girón', 'VOL', 65, 26, 6],
      ['Ángel Orelién', 'MEI', 66, 25, 10],
      ['Martín Ruiz', 'MEI', 65, 24, 8],
      ['Alexis Corpas', 'ATA', 66, 32, 11],
      ['Ramsés de León', 'ATA', 65, 23, 9],
      ['Yair Jaén', 'ATA', 65, 29, 7],
    ],
  }),
  buildConcacafGuestClub({
    id: 'guest_conc_omd',
    name: 'Universidad O&M FC',
    shortName: 'Universidad O&M',
    initials: 'UOM',
    country: 'República Dominicana',
    managerName: 'José Aparicio',
    primary: '#FACC15',
    secondary: '#1E3A8A',
    text: '#111111',
    stadiumName: 'Estadio Olímpico Félix Sánchez',
    capacity: 27000,
    baseOvr: 64,
    reputation: 2,
    starters: [
      ['Omry Bello', 'GOL', 64, 22, 1],
      ['Yoan Melo', 'LAT', 64, 29, 2],
      ['Ismael Díaz', 'ZAG', 65, 35, 4],
      ['Moisés Peguero', 'ZAG', 64, 26, 5],
      ['Ányelo Gómez', 'LAT', 63, 23, 3],
      ['Isaac Báez', 'VOL', 64, 23, 6],
      ['Daniel Jamesley', 'MEI', 65, 25, 10],
      ['Héctor Ramírez', 'MEI', 64, 24, 8],
      ['Julen Olasagasti', 'ATA', 64, 25, 11],
      ['Herard Franzety', 'ATA', 65, 25, 9],
      ['Kensy Guerrero', 'ATA', 64, 23, 7],
    ],
  }),
  buildConcacafGuestClub({
    id: 'guest_conc_def',
    name: 'Defence Force FC',
    shortName: 'Defence Force',
    initials: 'DEF',
    country: 'Trinidad e Tobago',
    managerName: 'Lloyd Andrews',
    primary: '#065F46',
    secondary: '#FACC15',
    text: '#FFFFFF',
    stadiumName: 'Hasely Crawford Stadium',
    capacity: 22575,
    baseOvr: 65,
    reputation: 2,
    starters: [
      ['Christopher Biggette', 'GOL', 65, 30, 1],
      ['Justin Garcia', 'LAT', 65, 30, 2],
      ['Curtis Gonzales', 'ZAG', 66, 37, 4],
      ['Jelani Felix', 'ZAG', 65, 27, 5],
      ['Kaihim Thomas', 'LAT', 65, 23, 3],
      ['Hashim Arcia', 'VOL', 65, 37, 6],
      ['Kevin Molino', 'MEI', 68, 36, 10],
      ['Reon Moore', 'MEI', 66, 29, 8],
      ['Brent Sam', 'ATA', 66, 30, 9],
      ['Kathryn St. Hillaire', 'ATA', 65, 26, 11],
      ['Isaiah Leacock', 'ATA', 65, 26, 7],
    ],
  }),
];

export const CONCACAF_2026_BYE_R16_IDS: string[] = [
  'wl_mex_tol', // Toluca (Campeão Liga MX)
  'wl_usa_mia', // Inter Miami (Campeão MLS Cup)
  'wl_usa_sea', // Seattle Sounders (Campeão Leagues Cup)
  CONCACAF_CENTRAL_AMERICA_CHAMP_ID, // LD Alajuelense
  CONCACAF_CARIBBEAN_CHAMP_ID, // Mount Pleasant FA
];

// Exatamente 11 confrontos (22 clubes) estruturados conforme bracket R16 do concacafChampionsEngine.ts
export const CONCACAF_2026_ROUND1_PAIRS: Array<[string, string]> = [
  ['wl_usa_nsh', 'guest_conc_car'], // W0 -> vs Inter Miami (bye1)
  ['wl_usa_van', 'guest_conc_smi'], // W1 -> R16 vs W2
  ['wl_usa_lag', 'guest_conc_xel'], // W2 -> R16 vs W1
  ['wl_mex_mty', 'guest_conc_def'], // W3 -> vs Mount Pleasant (bye4)
  ['wl_mex_tig', 'wl_can_for'], // W4 -> vs Alajuelense (bye3)
  ['wl_usa_phi', 'wl_can_ao'], // W5 -> R16 vs W6
  ['wl_mex_ame', 'guest_conc_oli'], // W6 -> R16 vs W5
  ['wl_usa_lafc', 'guest_conc_res'], // W7 -> vs Seattle Sounders (bye2)
  ['wl_mex_caz', 'wl_can_van'], // W8 -> R16 vs W9
  ['wl_usa_sd', 'wl_usa_cin'], // W9 -> R16 vs W8
  ['wl_mex_pum', 'guest_conc_omd'], // W10 -> vs Toluca (bye0)
];

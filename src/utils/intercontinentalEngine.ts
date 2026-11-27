import { Club, DetailedRole, Fixture, Player, Position, Standing, WorldLeagueId } from '../types/game';
import { AFC_GUEST_CLUBS } from '../data/afcChampionsData';
import { CONCACAF_GUEST_CLUBS } from '../data/concacafChampionsData';
import { resolvePlayerNationality } from './nationalityUtils';
import { computeWorldInternationalQualifiers } from './worldLeaguesEngine';

interface GuestPlayerSeed {
  name: string;
  role: DetailedRole;
  pos: Position;
  ovr: number;
  age: number;
  num: number;
  skill: string;
}

function buildGuestSquad(
  clubKey: string,
  starters: GuestPlayerSeed[],
  benchBaseOvr: number,
  clubCountry: string
): Player[] {
  const squad: Player[] = starters.map((s, idx) => {
    const id = `${clubKey}_p_${idx + 1}`;
    return {
      id,
      name: s.name,
      nationality: resolvePlayerNationality({ id, name: s.name }, clubCountry),
      position: s.pos,
      detailedRole: s.role,
      overall: s.ovr,
      age: s.age,
      condition: 98,
      morale: 'Excelente',
      wage: s.ovr * 28000,
      marketValue: s.ovr * 4200000,
      contractYears: 3,
      preferredFoot: idx % 3 === 0 ? 'Canhoto' : 'Destro',
      specialSkill: s.skill,
      matches: 18,
      goals: s.pos === 'FW' ? 11 : s.pos === 'MF' ? 4 : 1,
      assists: s.pos === 'MF' ? 7 : s.role === 'LAT' ? 5 : 2,
      yellowCards: 1,
      redCards: 0,
      isSuspended: false,
      injuryWeeks: 0,
      isStarter: true,
      isSubstitute: false,
      pitchSlot: idx,
      squadNumber: s.num,
      ratingAverage: 7.4,
      potential: Math.min(96, s.ovr + 2),
    };
  });

  const reserveRoles: Array<{ role: DetailedRole; pos: Position; num: number; name: string }> = [
    { role: 'GOL', pos: 'GK', num: 12, name: 'Goleiro Reserva' },
    { role: 'ZAG', pos: 'DF', num: 14, name: 'Defensor Central' },
    { role: 'LAT', pos: 'DF', num: 16, name: 'Lateral Veloz' },
    { role: 'VOL', pos: 'MF', num: 18, name: 'Volante de Contenção' },
    { role: 'MEI', pos: 'MF', num: 20, name: 'Meia Armador' },
    { role: 'ATA', pos: 'FW', num: 21, name: 'Atacante de Área' },
    { role: 'ATA', pos: 'FW', num: 19, name: 'Ponta de Velocidade' },
  ];

  reserveRoles.forEach((r, idx) => {
    squad.push({
      id: `${clubKey}_sub_${idx + 1}`,
      name: `${r.name} (${clubKey.toUpperCase()})`,
      nationality: clubCountry,
      position: r.pos,
      detailedRole: r.role,
      overall: benchBaseOvr - (idx % 3),
      age: 23 + idx,
      condition: 99,
      morale: 'Boa',
      wage: benchBaseOvr * 18000,
      marketValue: benchBaseOvr * 2200000,
      contractYears: 3,
      preferredFoot: 'Destro',
      specialSkill: ' Polivalente Internacional',
      matches: 9,
      goals: r.pos === 'FW' ? 3 : 0,
      assists: 2,
      yellowCards: 0,
      redCards: 0,
      isSuspended: false,
      injuryWeeks: 0,
      isStarter: false,
      isSubstitute: true,
      squadNumber: r.num,
      ratingAverage: 6.9,
      potential: benchBaseOvr + 3,
    });
  });

  return squad;
}

function createWorldGuestClub(params: {
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
  starters: GuestPlayerSeed[];
  benchOvr: number;
}): Club {
  const squad = buildGuestSquad(params.id, params.starters, params.benchOvr, params.country);
  return {
    id: params.id,
    name: params.name,
    shortName: params.shortName,
    initials: params.initials,
    state: 'INT',
    division: 'SA',
    reputation: 5,
    country: params.country,
    colors: {
      primary: params.primary,
      secondary: params.secondary,
      text: params.text,
    },
    stadium: {
      name: params.stadiumName,
      capacity: 82000,
      ticketPrice: 280,
      level: 5,
    },
    finances: {
      balance: 950000000,
      weeklySponsor: 8500000,
      weeklyExpenses: 6200000,
      stadiumLevel: 5,
      trainingFacilityLevel: 5,
      medicalFacilityLevel: 5,
      youthAcademyLevel: 5,
      seasonTicketHolders: 65000,
      totalIncomeSeason: 450000000,
      totalExpensesSeason: 320000000,
    },
    tactics: {
      formation: '4-3-3',
      mentality: 'Ofensivo',
      marking: 'Normal',
      passing: 'Curto (Posse)',
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

export const WORLD_GUEST_CLUBS: Club[] = [
  createWorldGuestClub({
    id: 'guest_hil',
    name: 'Al-Hilal',
    shortName: 'Al-Hilal',
    initials: 'HIL',
    country: 'Arábia Saudita',
    managerName: 'Simone Inzaghi',
    primary: '#2563eb',
    secondary: '#ffffff',
    text: '#ffffff',
    stadiumName: 'Kingdom Arena',
    benchOvr: 78,
    starters: [
      { name: 'Yassine Bounou', role: 'GOL', pos: 'GK', ovr: 84, age: 34, num: 37, skill: 'Pegador de Pênaltis' },
      { name: 'João Cancelo', role: 'LAT', pos: 'DF', ovr: 84, age: 31, num: 20, skill: 'Lateral Construtor' },
      { name: 'Kalidou Koulibaly', role: 'ZAG', pos: 'DF', ovr: 82, age: 34, num: 3, skill: 'Xerife Físico' },
      { name: 'Hassan Tambakti', role: 'ZAG', pos: 'DF', ovr: 76, age: 27, num: 87, skill: 'Cobertura Rápida' },
      { name: 'Theo Hernández', role: 'LAT', pos: 'DF', ovr: 85, age: 28, num: 19, skill: 'Arrancada Explosiva' },
      { name: 'Rúben Neves', role: 'VOL', pos: 'MF', ovr: 84, age: 29, num: 8, skill: 'Lançamento Longo' },
      { name: 'Sergej Milinković-Savić', role: 'MEI', pos: 'MF', ovr: 85, age: 31, num: 22, skill: 'Jogo Aéreo e Chute' },
      { name: 'Salem Al-Dawsari', role: 'MEI', pos: 'MF', ovr: 80, age: 34, num: 29, skill: 'Chute Curvo' },
      { name: 'Malcom', role: 'ATA', pos: 'FW', ovr: 83, age: 29, num: 77, skill: 'Corte para Dentro' },
      { name: 'Darwin Núñez', role: 'ATA', pos: 'FW', ovr: 83, age: 26, num: 9, skill: 'Potência em Profundidade' },
      { name: 'Marcos Leonardo', role: 'ATA', pos: 'FW', ovr: 81, age: 23, num: 11, skill: 'Oportunista na Área' },
    ],
  }),
  createWorldGuestClub({
    id: 'guest_ame_mex',
    name: 'Club América',
    shortName: 'América-MEX',
    initials: 'AME',
    country: 'México',
    managerName: 'André Jardine',
    primary: '#facc15',
    secondary: '#1e3a8a',
    text: '#0f172a',
    stadiumName: 'Estadio Azteca',
    benchOvr: 77,
    starters: [
      { name: 'Luis Malagón', role: 'GOL', pos: 'GK', ovr: 81, age: 29, num: 1, skill: 'Reflexo Rápido' },
      { name: 'Kevin Álvarez', role: 'LAT', pos: 'DF', ovr: 78, age: 27, num: 5, skill: 'Apoio Veloz' },
      { name: 'Sebastián Cáceres', role: 'ZAG', pos: 'DF', ovr: 79, age: 26, num: 4, skill: 'Antecipação Firme' },
      { name: 'Ramón Juárez', role: 'ZAG', pos: 'DF', ovr: 77, age: 24, num: 29, skill: 'Jogo Aéreo' },
      { name: 'Cristian Borja', role: 'LAT', pos: 'DF', ovr: 77, age: 32, num: 26, skill: 'Apoio Lateral' },
      { name: 'Jonathan dos Santos', role: 'VOL', pos: 'MF', ovr: 78, age: 35, num: 6, skill: 'Distribuição Curta' },
      { name: 'Álvaro Fidalgo', role: 'MEI', pos: 'MF', ovr: 81, age: 29, num: 8, skill: 'Maestro Criativo' },
      { name: 'Erick Sánchez', role: 'MEI', pos: 'MF', ovr: 79, age: 26, num: 28, skill: 'Dinâmica' },
      { name: 'Alejandro Zendejas', role: 'ATA', pos: 'FW', ovr: 80, age: 28, num: 17, skill: 'Diagonal Rápida' },
      { name: 'Henry Martín', role: 'ATA', pos: 'FW', ovr: 81, age: 33, num: 21, skill: 'Capitão Artilheiro' },
      { name: 'Allan Saint-Maximin', role: 'ATA', pos: 'FW', ovr: 80, age: 29, num: 97, skill: 'Um Contra Um' },
    ],
  }),
];

export const ALL_WORLD_GUEST_CLUBS: Club[] = [
  ...WORLD_GUEST_CLUBS,
  ...CONCACAF_GUEST_CLUBS,
  ...AFC_GUEST_CLUBS,
];

const LEGACY_GUEST_IDS = ['guest_rma', 'guest_mci', 'guest_bay', 'guest_int_mil'];
export const WORLD_GUEST_CLUB_IDS = new Set<string>([
  ...ALL_WORLD_GUEST_CLUBS.map((c) => c.id),
  ...LEGACY_GUEST_IDS,
]);

/**
 * Human-readable Portuguese labels for TBD slots in the Copa Intercontinental / Mundial de Clubes.
 */
export function getIntercontinentalSlotLabel(slotId: string): string {
  switch (slotId) {
    case 'TBD_LIB_CHAMP':
      return 'Campeão CONMEBOL Libertadores';
    case 'TBD_CONCACAF_CHAMP':
      return 'Campeão América do Norte (EUA/MEX/CAN)';
    case 'TBD_CINT_CHAMP':
      return 'Campeão Champions Internacional';
    case 'TBD_CAF_CHAMP':
      return 'Campeão África (Egito/Marrocos)';
    case 'TBD_INTERCONT_Q1':
      return 'Vencedor Dérbi das Américas';
    case 'TBD_INTERCONT_Q2':
      return 'Vencedor Copa África-Ásia';
    case 'TBD_CH_3RD':
      return '3º Colocado (Championship)';
    case 'TBD_CH_4TH':
      return '4º Colocado (Championship)';
    case 'TBD_CH_5TH':
      return '5º Colocado (Championship)';
    case 'TBD_CH_6TH':
      return '6º Colocado (Championship)';
    case 'TBD_CH_7TH':
      return '7º Colocado (Championship)';
    case 'TBD_CH_8TH':
      return '8º Colocado (Championship)';
    case 'TBD_CH_R1_WIN_58':
      return 'Vencedor R1 (5º vs 8º)';
    case 'TBD_CH_R1_WIN_67':
      return 'Vencedor R1 (6º vs 7º)';
    case 'TBD_CH_SEMI_WIN_A':
      return 'Vencedor Semi A (3º vs Venc 6/7)';
    case 'TBD_CH_SEMI_WIN_B':
      return 'Vencedor Semi B (4º vs Venc 5/8)';
    case 'TBD_L1_3RD':
      return '3º Colocado (League One)';
    case 'TBD_L1_4TH':
      return '4º Colocado (League One)';
    case 'TBD_L1_5TH':
      return '5º Colocado (League One)';
    case 'TBD_L1_6TH':
      return '6º Colocado (League One)';
    case 'TBD_L1_WIN1':
      return 'Vencedor Semifinal 1 (3º vs 6º)';
    case 'TBD_L1_WIN2':
      return 'Vencedor Semifinal 2 (4º vs 5º)';
    case 'TBD_L2_4TH':
      return '4º Colocado (League Two)';
    case 'TBD_L2_5TH':
      return '5º Colocado (League Two)';
    case 'TBD_L2_6TH':
      return '6º Colocado (League Two)';
    case 'TBD_L2_7TH':
      return '7º Colocado (League Two)';
    case 'TBD_L2_WIN1':
      return 'Vencedor Semifinal 1 (4º vs 7º)';
    case 'TBD_L2_WIN2':
      return 'Vencedor Semifinal 2 (5º vs 6º)';
    case 'TBD_SB_3RD':
      return '3º Colocado (Série B)';
    case 'TBD_SB_4TH':
      return '4º Colocado (Série B)';
    case 'TBD_SB_5TH':
      return '5º Colocado (Série B)';
    case 'TBD_SB_6TH':
      return '6º Colocado (Série B)';
    case 'TBD_SC_4TH':
      return '4º Colocado (Série C)';
    case 'TBD_SC_5TH':
      return '5º Colocado (Série C)';
    case 'TBD_SC_6TH':
      return '6º Colocado (Série C)';
    case 'TBD_SC_7TH':
      return '7º Colocado (Série C)';
    case 'TBD_SC_WIN1':
      return 'Vencedor Playoff 1 (4º vs 7º)';
    case 'TBD_SC_WIN2':
      return 'Vencedor Playoff 2 (5º vs 6º)';
    case 'TBD_COMMUNITY_SHIELD_PL':
      return 'Campeão Premier League';
    case 'TBD_COMMUNITY_SHIELD_FA':
      return 'Campeão Emirates FA Cup';
    case 'TBD_EFL_SF_W0':
      return 'Vencedor Semifinal 1 (Carabao Cup)';
    case 'TBD_EFL_SF_W1':
      return 'Vencedor Semifinal 2 (Carabao Cup)';
    case 'TBD_FA_SF_W0':
      return 'Vencedor Semifinal 1 (FA Cup em Wembley)';
    case 'TBD_FA_SF_W1':
      return 'Vencedor Semifinal 2 (FA Cup em Wembley)';
    default:
      if (slotId.startsWith('TBD_EFL_R1_W')) {
        return `Vencedor R1 #${parseInt(slotId.replace('TBD_EFL_R1_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_EFL_R2_W')) {
        return `Vencedor R2 #${parseInt(slotId.replace('TBD_EFL_R2_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_EFL_R3_W')) {
        return `Vencedor R3 #${parseInt(slotId.replace('TBD_EFL_R3_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_EFL_R4_W')) {
        return `Vencedor Oitavas #${parseInt(slotId.replace('TBD_EFL_R4_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_EFL_QF_W')) {
        return `Vencedor Quartas #${parseInt(slotId.replace('TBD_EFL_QF_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_FA_R1_W')) {
        return `Vencedor 1ª Rodada #${parseInt(slotId.replace('TBD_FA_R1_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_FA_R2_W')) {
        return `Vencedor 2ª Rodada #${parseInt(slotId.replace('TBD_FA_R2_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_FA_R3_W')) {
        return `Vencedor 3ª Rodada #${parseInt(slotId.replace('TBD_FA_R3_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_FA_R4_W')) {
        return `Vencedor 4ª Rodada #${parseInt(slotId.replace('TBD_FA_R4_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_FA_R5_W')) {
        return `Vencedor Oitavas #${parseInt(slotId.replace('TBD_FA_R5_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_FA_QF_W')) {
        return `Vencedor Quartas #${parseInt(slotId.replace('TBD_FA_QF_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_CONCACAF_R1_W')) {
        return `Vencedor 1ª Rodada #${parseInt(slotId.replace('TBD_CONCACAF_R1_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_CONCACAF_R16_W')) {
        return `Vencedor Oitavas #${parseInt(slotId.replace('TBD_CONCACAF_R16_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_CONCACAF_QF_W')) {
        return `Vencedor Quartas #${parseInt(slotId.replace('TBD_CONCACAF_QF_W', ''), 10) + 1}`;
      }
      if (slotId.startsWith('TBD_CONCACAF_SF_W')) {
        return `Vencedor Semifinal #${parseInt(slotId.replace('TBD_CONCACAF_SF_W', ''), 10) + 1}`;
      }
      return 'A definir';
  }
}

/**
 * Returns a view array containing all domestic/SA/EU/WL clubs plus legacy & CONCACAF guest clubs
 * without duplicating entries. NEVER persist guest clubs inside save.clubs.
 */
export function withWorldGuestClubs(clubs: Club[]): Club[] {
  const existingIds = new Set(clubs.map((c) => c.id));
  const missingGuests = ALL_WORLD_GUEST_CLUBS.filter((g) => !existingIds.has(g.id));
  if (missingGuests.length === 0) return clubs;
  return [...clubs, ...missingGuests];
}

/**
 * Strips any guest clubs before saving back to GameSave.clubs so domestic/continental filters remain 100% intact.
 */
export function stripWorldGuestClubs(clubs: Club[]): Club[] {
  return clubs.filter((c) => !WORLD_GUEST_CLUB_IDS.has(c.id));
}

export function pickSeasonWorldRepresentatives(seasonYear: number): {
  defaultEuropeanChampId: string;
  challengerChamp: Club;
} {
  const defaultEuroIds = ['eu_psg', 'eu_rma', 'eu_mci', 'eu_bay'];
  const challengerPool = WORLD_GUEST_CLUBS;

  const euroIdx = Math.abs(seasonYear - 2026) % defaultEuroIds.length;
  const challIdx = Math.abs(seasonYear - 2026) % challengerPool.length;

  return {
    defaultEuropeanChampId: defaultEuroIds[euroIdx] || 'eu_psg',
    challengerChamp: challengerPool[challIdx] || challengerPool[0],
  };
}

/**
 * Generates the December Copa Intercontinental FIFA (Mundial de Clubes) 4-match bracket:
 * - Quartas 1 (09/12 — Dérbi das Américas): Campeão CONMEBOL Libertadores vs Campeão América do Norte (EUA/México)
 * - Quartas 2 (10/12 — Copa África-Ásia-Eurásia): Campeão Champions Internacional / Ásia-Rússia vs Campeão África (Egito/Marrocos)
 * - Semifinal (13/12 — Copa Challenger FIFA): Vencedor Dérbi das Américas vs Vencedor Copa África-Ásia-Eurásia
 * - Grande Final Mundial (16/12 — Estádio Lusail): Campeão UEFA Champions League vs Vencedor Copa Challenger FIFA
 */
export function generateIntercontinentalFixtures(
  seasonYear: number = 2026,
  knownLibertadoresChampionId?: string,
  knownChampionsLeagueChampionId?: string,
  clubs?: Club[],
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>,
  knownCopaInternacionalChampionId?: string,
  knownConcacafChampionId?: string,
  knownAfcChampionId?: string
): Fixture[] {
  const { defaultEuropeanChampId } = pickSeasonWorldRepresentatives(seasonYear);
  const libChampSlot = knownLibertadoresChampionId || 'TBD_LIB_CHAMP';
  const finalHomeId = knownChampionsLeagueChampionId || defaultEuropeanChampId;

  const hasFinishedWorldLeagues = Boolean(
    standingsWorldLeagues &&
      Object.values(standingsWorldLeagues).some(
        (tbl) => tbl && tbl.length > 0 && tbl.every((s) => s.played >= 20)
      )
  );

  const qualifiers =
    clubs && hasFinishedWorldLeagues
      ? computeWorldInternationalQualifiers(
          clubs,
          standingsWorldLeagues,
          knownCopaInternacionalChampionId
        )
      : undefined;

  const concacafSlot =
    knownConcacafChampionId || qualifiers?.concacafChampionId || 'TBD_CONCACAF_CHAMP';
  const cintOrAsiaSlot =
    knownAfcChampionId || knownCopaInternacionalChampionId || qualifiers?.asiaRussiaChampionId || 'TBD_CINT_CHAMP';
  const africaSlot = qualifiers?.africaChampionId || 'TBD_CAF_CHAMP';

  return [
    {
      id: `intercont_q1_${seasonYear}`,
      round: 39,
      competition: 'intercontinental',
      cupPhase: 'Quartas Mundial (Dérbi das Américas)',
      homeTeamId: libChampSlot,
      awayTeamId: concacafSlot,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-12-09`,
      time: '16:00',
      stadiumName: 'Estádio 974 (Doha)',
    },
    {
      id: `intercont_q2_${seasonYear}`,
      round: 39,
      competition: 'intercontinental',
      cupPhase: 'Quartas Mundial (Copa África-Ásia)',
      homeTeamId: cintOrAsiaSlot,
      awayTeamId: africaSlot,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-12-10`,
      time: '16:00',
      stadiumName: 'Estádio Al Thumama (Doha)',
    },
    {
      id: `intercont_semi_${seasonYear}`,
      round: 39,
      competition: 'intercontinental',
      cupPhase: 'Semifinal Mundial (Copa Challenger)',
      homeTeamId: 'TBD_INTERCONT_Q1',
      awayTeamId: 'TBD_INTERCONT_Q2',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-12-13`,
      time: '16:00',
      stadiumName: 'Estádio Education City (Al Rayyan)',
    },
    {
      id: `intercont_final_${seasonYear}`,
      round: 40,
      competition: 'intercontinental',
      cupPhase: 'Grande Final do Mundial de Clubes',
      homeTeamId: finalHomeId,
      awayTeamId: 'TBD_INTERCONT_SEMI',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-12-16`,
      time: '16:00',
      stadiumName: 'Estádio Lusail (Catar)',
    },
  ];
}


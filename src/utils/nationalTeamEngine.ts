import {
  Club,
  CoachMovementRecord,
  ConfederationCode,
  ContinentalCompId,
  ContinentalQualifiersCycle,
  ContinentalQualifiersTrack,
  ContinentalQualifierTrackId,
  DetailedRole,
  FifaCallUpPlayerLog,
  FifaWindowFixture,
  FifaWindowReport,
  FormationType,
  GameSave,
  InboxMessage,
  InternationalMatchFixture,
  ManagerDismissalSummary,
  NationalCompetitionCode,
  NationalStandingRow,
  NationalTeamCareerStint,
  NationalTeamCoachRecord,
  NationalTeamJobOffer,
  NationalTeamProfile,
  NationalTeamState,
  NationalTournamentEdition,
  NationalVirtualPlayer,
  PastWorldCupRecord,
  Player,
  Position,
  SelecaoTacticStyle,
  TrophyRecord,
  WorldCupQualifiersCycle,
} from '../types/game';
import { normalizePlayerKey, resolvePlayerNationality } from './nationalityUtils';
import {
  addDays,
  daysBetween,
  formatShortDate,
  getFifaWindowDatesForYear,
} from './calendarUtils';
import {
  evaluatePlayerRoleFit,
  PlayerSlotFitEvaluation,
} from './tacticalPositioningEngine';
import { inferTacticalZoneFromCoords } from './matchPitchLayout';


export const CBF_INVITE_MIN_REPUTATION = 70;
export const CBF_CANDIDACY_MIN_REPUTATION = 45;
export const FIFA_SOLIDARITY_COMPENSATION_PER_PLAYER = 185000;
export const FIFA_WINDOW_ROUNDS = [7, 15, 24, 32] as const;
export const MAX_SELECAO_SQUAD_SIZE = 26;
export const MIN_SELECAO_SQUAD_SIZE = 18;

export interface SelecaoSlotCoord {
  x: number;
  y: number;
  role: DetailedRole;
  code: string;
  label: string;
}

export const SELECAO_FORMATIONS: FormationType[] = [
  '4-3-3',
  '4-2-3-1',
  '4-4-2',
  '3-5-2',
  '5-3-2',
  '4-1-4-1',
  '3-4-3',
];

export const SELECAO_FORMATION_SLOTS: Record<FormationType, SelecaoSlotCoord[]> = {
  '4-3-3': [
    { x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { x: 14, y: 70, role: 'LAT', code: 'LE', label: 'Lateral Esquerdo' },
    { x: 38, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Esq.' },
    { x: 62, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Dir.' },
    { x: 86, y: 70, role: 'LAT', code: 'LD', label: 'Lateral Direito' },
    { x: 50, y: 57, role: 'VOL', code: 'VOL', label: 'Primeiro Volante' },
    { x: 31, y: 44, role: 'MEI', code: 'MC', label: 'Meia Central Esq.' },
    { x: 69, y: 44, role: 'MEI', code: 'MC', label: 'Meia Central Dir.' },
    { x: 17, y: 20, role: 'ATA', code: 'PE', label: 'Ponta Esquerda' },
    { x: 50, y: 14, role: 'ATA', code: 'CA', label: 'Centroavante' },
    { x: 83, y: 20, role: 'ATA', code: 'PD', label: 'Ponta Direita' },
  ],
  '4-2-3-1': [
    { x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { x: 14, y: 70, role: 'LAT', code: 'LE', label: 'Lateral Esquerdo' },
    { x: 38, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Esq.' },
    { x: 62, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Dir.' },
    { x: 86, y: 70, role: 'LAT', code: 'LD', label: 'Lateral Direito' },
    { x: 36, y: 56, role: 'VOL', code: 'VOL', label: 'Primeiro Volante' },
    { x: 64, y: 56, role: 'VOL', code: 'VOL', label: 'Segundo Volante' },
    { x: 18, y: 35, role: 'MEI', code: 'ME', label: 'Meia Esquerda' },
    { x: 50, y: 33, role: 'MEI', code: 'MEI', label: 'Meia Armador (10)' },
    { x: 82, y: 35, role: 'MEI', code: 'MD', label: 'Meia Direita' },
    { x: 50, y: 15, role: 'ATA', code: 'CA', label: 'Centroavante' },
  ],
  '4-4-2': [
    { x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { x: 14, y: 70, role: 'LAT', code: 'LE', label: 'Lateral Esquerdo' },
    { x: 38, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Esq.' },
    { x: 62, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Dir.' },
    { x: 86, y: 70, role: 'LAT', code: 'LD', label: 'Lateral Direito' },
    { x: 16, y: 45, role: 'MEI', code: 'ME', label: 'Meia Esquerda' },
    { x: 39, y: 53, role: 'VOL', code: 'VOL', label: 'Volante' },
    { x: 61, y: 53, role: 'VOL', code: 'VOL', label: 'Volante' },
    { x: 84, y: 45, role: 'MEI', code: 'MD', label: 'Meia Direita' },
    { x: 36, y: 19, role: 'ATA', code: 'SA', label: 'Segundo Atacante' },
    { x: 64, y: 17, role: 'ATA', code: 'CA', label: 'Centroavante' },
  ],
  '3-5-2': [
    { x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { x: 27, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Esquerdo' },
    { x: 50, y: 75, role: 'ZAG', code: 'ZAG', label: 'Líbero / Central' },
    { x: 73, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Direito' },
    { x: 13, y: 49, role: 'LAT', code: 'ALA', label: 'Ala Esquerdo' },
    { x: 36, y: 55, role: 'VOL', code: 'VOL', label: 'Volante' },
    { x: 64, y: 55, role: 'VOL', code: 'VOL', label: 'Volante' },
    { x: 87, y: 49, role: 'LAT', code: 'ALA', label: 'Ala Direito' },
    { x: 50, y: 35, role: 'MEI', code: 'MEI', label: 'Meia Armador (10)' },
    { x: 36, y: 18, role: 'ATA', code: 'SA', label: 'Segundo Atacante' },
    { x: 64, y: 16, role: 'ATA', code: 'CA', label: 'Centroavante' },
  ],
  '5-3-2': [
    { x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { x: 12, y: 66, role: 'LAT', code: 'ALA', label: 'Ala Esquerdo' },
    { x: 31, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Esquerdo' },
    { x: 50, y: 75, role: 'ZAG', code: 'ZAG', label: 'Líbero Central' },
    { x: 69, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Direito' },
    { x: 88, y: 66, role: 'LAT', code: 'ALA', label: 'Ala Direito' },
    { x: 32, y: 50, role: 'VOL', code: 'VOL', label: 'Volante' },
    { x: 50, y: 43, role: 'MEI', code: 'MC', label: 'Meia Central' },
    { x: 68, y: 50, role: 'VOL', code: 'VOL', label: 'Volante' },
    { x: 36, y: 19, role: 'ATA', code: 'SA', label: 'Segundo Atacante' },
    { x: 64, y: 17, role: 'ATA', code: 'CA', label: 'Centroavante' },
  ],
  '4-1-4-1': [
    { x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { x: 14, y: 70, role: 'LAT', code: 'LE', label: 'Lateral Esquerdo' },
    { x: 38, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Esq.' },
    { x: 62, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Dir.' },
    { x: 86, y: 70, role: 'LAT', code: 'LD', label: 'Lateral Direito' },
    { x: 50, y: 58, role: 'VOL', code: 'VOL', label: 'Primeiro Volante' },
    { x: 16, y: 40, role: 'MEI', code: 'ME', label: 'Meia Esquerda' },
    { x: 39, y: 44, role: 'MEI', code: 'MC', label: 'Meia Central' },
    { x: 61, y: 44, role: 'MEI', code: 'MC', label: 'Meia Central' },
    { x: 84, y: 40, role: 'MEI', code: 'MD', label: 'Meia Direita' },
    { x: 50, y: 16, role: 'ATA', code: 'CA', label: 'Centroavante Isolado' },
  ],
  '3-4-3': [
    { x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { x: 28, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Esquerdo' },
    { x: 50, y: 75, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Central' },
    { x: 72, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Direito' },
    { x: 14, y: 49, role: 'LAT', code: 'ALA', label: 'Ala Esquerdo' },
    { x: 38, y: 54, role: 'VOL', code: 'VOL', label: 'Volante' },
    { x: 62, y: 54, role: 'VOL', code: 'VOL', label: 'Volante' },
    { x: 86, y: 49, role: 'LAT', code: 'ALA', label: 'Ala Direito' },
    { x: 18, y: 20, role: 'ATA', code: 'PE', label: 'Ponta Esquerda' },
    { x: 50, y: 14, role: 'ATA', code: 'CA', label: 'Centroavante' },
    { x: 82, y: 20, role: 'ATA', code: 'PD', label: 'Ponta Direita' },
  ],
};

export function evaluateSelecaoSlotCompatibility(
  playerRole: DetailedRole,
  targetRole: DetailedRole
): 'EXACT' | 'ADAPTED' | 'IMPROVISED' {
  const fit = evaluatePlayerRoleFit({
    baseOverall: 80,
    naturalRole: playerRole,
    targetRole,
  });
  if (fit.status === 'EXACT') return 'EXACT';
  if (fit.status === 'ADAPTED') return 'ADAPTED';
  return 'IMPROVISED';
}

export function evaluateSelecaoSlotFit(
  player: Pick<ResolvedNationalPlayer, 'overall' | 'detailedRole'>,
  targetRole: DetailedRole,
  targetCode?: string,
  targetLabel?: string
): PlayerSlotFitEvaluation {
  return evaluatePlayerRoleFit({
    baseOverall: player.overall,
    naturalRole: player.detailedRole,
    targetRole,
    targetCode,
    targetLabel,
  });
}

export function fitPlayersToSelecaoFormation(
  candidates: ResolvedNationalPlayer[],
  formation: FormationType = '4-3-3'
): string[] {
  const slots = SELECAO_FORMATION_SLOTS[formation] || SELECAO_FORMATION_SLOTS['4-3-3'];
  const assigned: (ResolvedNationalPlayer | null)[] = Array(11).fill(null);
  const usedIds = new Set<string>();

  const sortedByOvr = [...candidates].sort((a, b) => b.overall - a.overall || b.caps - a.caps);

  // Pass 1: Exact role match
  slots.forEach((slot, idx) => {
    const match = sortedByOvr.find((p) => !usedIds.has(p.id) && p.detailedRole === slot.role);
    if (match) {
      assigned[idx] = match;
      usedIds.add(match.id);
    }
  });

  // Pass 2: Adapted role match
  slots.forEach((slot, idx) => {
    if (assigned[idx]) return;
    const match = sortedByOvr.find(
      (p) =>
        !usedIds.has(p.id) &&
        evaluateSelecaoSlotCompatibility(p.detailedRole, slot.role) === 'ADAPTED'
    );
    if (match) {
      assigned[idx] = match;
      usedIds.add(match.id);
    }
  });

  // Pass 3: Any remaining player (preferring outfielders for outfield slots)
  slots.forEach((slot, idx) => {
    if (assigned[idx]) return;
    const match =
      sortedByOvr.find(
        (p) => !usedIds.has(p.id) && (slot.role === 'GOL' ? true : p.detailedRole !== 'GOL')
      ) || sortedByOvr.find((p) => !usedIds.has(p.id));
    if (match) {
      assigned[idx] = match;
      usedIds.add(match.id);
    }
  });

  return assigned.filter((p): p is ResolvedNationalPlayer => Boolean(p)).map((p) => p.id);
}

export const NATIONAL_TEAMS_CATALOG: NationalTeamProfile[] = [
  // ================= CONMEBOL (10 Seleções) =================
  {
    id: 'nt_arg',
    name: 'Argentina',
    code: 'ARG',
    confederation: 'CONMEBOL',
    federationCode: 'AFA',
    strength: 90,
    fifaPoints: 1889,
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
    textColor: '#020617',
    homeStadium: 'Monumental de Núñez (Buenos Aires)',
    minReputationToCoach: 66,
    worldCupTitles: 3,
    continentalTitles: 16,
    countryMatch: 'Argentina',
  },
  {
    id: 'nt_bra',
    name: 'Brasil',
    code: 'BRA',
    confederation: 'CONMEBOL',
    federationCode: 'CBF',
    strength: 88,
    fifaPoints: 1784,
    primaryColor: '#facc15',
    secondaryColor: '#15803d',
    textColor: '#052e16',
    homeStadium: 'Maracanã (Rio de Janeiro)',
    minReputationToCoach: 45,
    worldCupTitles: 5,
    continentalTitles: 9,
    countryMatch: 'Brasil',
  },
  {
    id: 'nt_col',
    name: 'Colômbia',
    code: 'COL',
    confederation: 'CONMEBOL',
    federationCode: 'FCF',
    strength: 85,
    fifaPoints: 1724,
    primaryColor: '#fde047',
    secondaryColor: '#1d4ed8',
    textColor: '#0f172a',
    homeStadium: 'Metropolitano (Barranquilla)',
    minReputationToCoach: 52,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Colômbia',
  },
  {
    id: 'nt_uru',
    name: 'Uruguai',
    code: 'URU',
    confederation: 'CONMEBOL',
    federationCode: 'AUF',
    strength: 85,
    fifaPoints: 1718,
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'Estádio Centenário (Montevidéu)',
    minReputationToCoach: 54,
    worldCupTitles: 2,
    continentalTitles: 15,
    countryMatch: 'Uruguai',
  },
  {
    id: 'nt_equ',
    name: 'Equador',
    code: 'EQU',
    confederation: 'CONMEBOL',
    federationCode: 'FEF',
    strength: 81,
    fifaPoints: 1582,
    primaryColor: '#eab308',
    secondaryColor: '#1e3a8a',
    textColor: '#0f172a',
    homeStadium: 'Rodrigo Paz Delgado (Quito)',
    minReputationToCoach: 44,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Equador',
  },
  {
    id: 'nt_par',
    name: 'Paraguai',
    code: 'PAR',
    confederation: 'CONMEBOL',
    federationCode: 'APF',
    strength: 79,
    fifaPoints: 1515,
    primaryColor: '#dc2626',
    secondaryColor: '#1d4ed8',
    textColor: '#ffffff',
    homeStadium: 'Defensores del Chaco (Assunção)',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 2,
    countryMatch: 'Paraguai',
  },
  {
    id: 'nt_ven',
    name: 'Venezuela',
    code: 'VEN',
    confederation: 'CONMEBOL',
    federationCode: 'FVF',
    strength: 78,
    fifaPoints: 1492,
    primaryColor: '#7f1d1d',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Monumental de Maturín',
    minReputationToCoach: 38,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Venezuela',
  },
  {
    id: 'nt_chi',
    name: 'Chile',
    code: 'CHI',
    confederation: 'CONMEBOL',
    federationCode: 'FFCh',
    strength: 78,
    fifaPoints: 1489,
    primaryColor: '#b91c1c',
    secondaryColor: '#1e40af',
    textColor: '#ffffff',
    homeStadium: 'Estádio Nacional (Santiago)',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 2,
    countryMatch: 'Chile',
  },
  {
    id: 'nt_per',
    name: 'Peru',
    code: 'PER',
    confederation: 'CONMEBOL',
    federationCode: 'FPF',
    strength: 76,
    fifaPoints: 1458,
    primaryColor: '#ef4444',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Estádio Nacional (Lima)',
    minReputationToCoach: 36,
    worldCupTitles: 0,
    continentalTitles: 2,
    countryMatch: 'Peru',
  },
  {
    id: 'nt_bol',
    name: 'Bolívia',
    code: 'BOL',
    confederation: 'CONMEBOL',
    federationCode: 'FBF',
    strength: 75,
    fifaPoints: 1412,
    primaryColor: '#15803d',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Municipal de El Alto / La Paz',
    minReputationToCoach: 30,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Bolívia',
  },

  // ================= UEFA (16 Seleções) =================
  {
    id: 'nt_esp',
    name: 'Espanha',
    code: 'ESP',
    confederation: 'UEFA',
    federationCode: 'RFEF',
    strength: 90,
    fifaPoints: 1865,
    primaryColor: '#dc2626',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Santiago Bernabéu (Madri)',
    minReputationToCoach: 66,
    worldCupTitles: 1,
    continentalTitles: 4,
  },
  {
    id: 'nt_fra',
    name: 'França',
    code: 'FRA',
    confederation: 'UEFA',
    federationCode: 'FFF',
    strength: 90,
    fifaPoints: 1859,
    primaryColor: '#1d4ed8',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Stade de France (Paris)',
    minReputationToCoach: 66,
    worldCupTitles: 2,
    continentalTitles: 2,
  },
  {
    id: 'nt_ing',
    name: 'Inglaterra',
    code: 'ING',
    confederation: 'UEFA',
    federationCode: 'FA',
    strength: 89,
    fifaPoints: 1813,
    primaryColor: '#f8fafc',
    secondaryColor: '#1e3a8a',
    textColor: '#0f172a',
    homeStadium: 'Wembley Stadium (Londres)',
    minReputationToCoach: 64,
    worldCupTitles: 1,
    continentalTitles: 0,
  },
  {
    id: 'nt_por',
    name: 'Portugal',
    code: 'POR',
    confederation: 'UEFA',
    federationCode: 'FPF',
    strength: 87,
    fifaPoints: 1770,
    primaryColor: '#991b1b',
    secondaryColor: '#14532d',
    textColor: '#ffffff',
    homeStadium: 'Estádio da Luz (Lisboa)',
    minReputationToCoach: 58,
    worldCupTitles: 0,
    continentalTitles: 1,
  },
  {
    id: 'nt_ale',
    name: 'Alemanha',
    code: 'ALE',
    confederation: 'UEFA',
    federationCode: 'DFB',
    strength: 87,
    fifaPoints: 1752,
    primaryColor: '#e2e8f0',
    secondaryColor: '#0f172a',
    textColor: '#0f172a',
    homeStadium: 'Allianz Arena (Munique)',
    minReputationToCoach: 60,
    worldCupTitles: 4,
    continentalTitles: 3,
  },
  {
    id: 'nt_hol',
    name: 'Holanda',
    code: 'HOL',
    confederation: 'UEFA',
    federationCode: 'KNVB',
    strength: 86,
    fifaPoints: 1748,
    primaryColor: '#ea580c',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'Johan Cruyff Arena (Amsterdã)',
    minReputationToCoach: 56,
    worldCupTitles: 0,
    continentalTitles: 1,
  },
  {
    id: 'nt_ita',
    name: 'Itália',
    code: 'ITA',
    confederation: 'UEFA',
    federationCode: 'FIGC',
    strength: 85,
    fifaPoints: 1731,
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'San Siro (Milão)',
    minReputationToCoach: 56,
    worldCupTitles: 4,
    continentalTitles: 2,
  },
  {
    id: 'nt_bel',
    name: 'Bélgica',
    code: 'BEL',
    confederation: 'UEFA',
    federationCode: 'RBFA',
    strength: 84,
    fifaPoints: 1705,
    primaryColor: '#b91c1c',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'Rei Balduíno (Bruxelas)',
    minReputationToCoach: 52,
    worldCupTitles: 0,
    continentalTitles: 0,
  },
  {
    id: 'nt_cro',
    name: 'Croácia',
    code: 'CRO',
    confederation: 'UEFA',
    federationCode: 'HNS',
    strength: 83,
    fifaPoints: 1680,
    primaryColor: '#ef4444',
    secondaryColor: '#1d4ed8',
    textColor: '#ffffff',
    homeStadium: 'Maksimir (Zagreb)',
    minReputationToCoach: 50,
    worldCupTitles: 0,
    continentalTitles: 0,
  },
  {
    id: 'nt_sui',
    name: 'Suíça',
    code: 'SUI',
    confederation: 'UEFA',
    federationCode: 'SFV',
    strength: 82,
    fifaPoints: 1640,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'St. Jakob-Park (Basileia)',
    minReputationToCoach: 45,
    worldCupTitles: 0,
    continentalTitles: 0,
  },
  {
    id: 'nt_din',
    name: 'Dinamarca',
    code: 'DIN',
    confederation: 'UEFA',
    federationCode: 'DBU',
    strength: 81,
    fifaPoints: 1621,
    primaryColor: '#be123c',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Parken (Copenhague)',
    minReputationToCoach: 44,
    worldCupTitles: 0,
    continentalTitles: 1,
  },
  {
    id: 'nt_aut',
    name: 'Áustria',
    code: 'AUT',
    confederation: 'UEFA',
    federationCode: 'ÖFB',
    strength: 81,
    fifaPoints: 1605,
    primaryColor: '#e11d48',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Ernst-Happel-Stadion (Viena)',
    minReputationToCoach: 42,
    worldCupTitles: 0,
    continentalTitles: 0,
  },
  {
    id: 'nt_tur',
    name: 'Turquia',
    code: 'TUR',
    confederation: 'UEFA',
    federationCode: 'TFF',
    strength: 81,
    fifaPoints: 1590,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Olímpico Atatürk (Istambul)',
    minReputationToCoach: 42,
    worldCupTitles: 0,
    continentalTitles: 0,
  },
  {
    id: 'nt_ucr',
    name: 'Ucrânia',
    code: 'UCR',
    confederation: 'UEFA',
    federationCode: 'UAF',
    strength: 79,
    fifaPoints: 1554,
    primaryColor: '#facc15',
    secondaryColor: '#1d4ed8',
    textColor: '#0f172a',
    homeStadium: 'Olímpico de Kiev',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 0,
  },
  {
    id: 'nt_ser',
    name: 'Sérvia',
    code: 'SER',
    confederation: 'UEFA',
    federationCode: 'FSS',
    strength: 79,
    fifaPoints: 1542,
    primaryColor: '#991b1b',
    secondaryColor: '#1e3a8a',
    textColor: '#ffffff',
    homeStadium: 'Rajko Mitić (Belgrado)',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 0,
  },
  {
    id: 'nt_pol',
    name: 'Polônia',
    code: 'POL',
    confederation: 'UEFA',
    federationCode: 'PZPN',
    strength: 78,
    fifaPoints: 1525,
    primaryColor: '#f8fafc',
    secondaryColor: '#dc2626',
    textColor: '#991b1b',
    homeStadium: 'Nacional de Varsóvia',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 0,
  },

  // ================= CONCACAF (16 Seleções — Norte, Centroamérica e Caribe) =================
  {
    id: 'nt_eua',
    name: 'Estados Unidos',
    code: 'EUA',
    confederation: 'CONCACAF',
    federationCode: 'USSF',
    strength: 82,
    fifaPoints: 1654,
    primaryColor: '#1e3a8a',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'MetLife Stadium (Nova Jersey)',
    minReputationToCoach: 45,
    worldCupTitles: 0,
    continentalTitles: 7,
  },
  {
    id: 'nt_mex',
    name: 'México',
    code: 'MEX',
    confederation: 'CONCACAF',
    federationCode: 'FMF',
    strength: 81,
    fifaPoints: 1638,
    primaryColor: '#15803d',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Estádio Azteca (Cidade do México)',
    minReputationToCoach: 45,
    worldCupTitles: 0,
    continentalTitles: 12,
  },
  {
    id: 'nt_can',
    name: 'Canadá',
    code: 'CAN',
    confederation: 'CONCACAF',
    federationCode: 'CSA',
    strength: 80,
    fifaPoints: 1565,
    primaryColor: '#dc2626',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'BC Place (Vancouver)',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 2,
  },
  {
    id: 'nt_pan',
    name: 'Panamá',
    code: 'PAN',
    confederation: 'CONCACAF',
    federationCode: 'FEPAFUT',
    strength: 76,
    fifaPoints: 1475,
    primaryColor: '#b91c1c',
    secondaryColor: '#1d4ed8',
    textColor: '#ffffff',
    homeStadium: 'Rommel Fernández (Cidade do Panamá)',
    minReputationToCoach: 32,
    worldCupTitles: 0,
    continentalTitles: 0,
  },
  {
    id: 'nt_crc',
    name: 'Costa Rica',
    code: 'CRC',
    confederation: 'CONCACAF',
    federationCode: 'FCRF',
    strength: 76,
    fifaPoints: 1464,
    primaryColor: '#dc2626',
    secondaryColor: '#1e3a8a',
    textColor: '#ffffff',
    homeStadium: 'Nacional de San José',
    minReputationToCoach: 34,
    worldCupTitles: 0,
    continentalTitles: 3,
  },
  {
    id: 'nt_jam',
    name: 'Jamaica',
    code: 'JAM',
    confederation: 'CONCACAF',
    federationCode: 'JFF',
    strength: 75,
    fifaPoints: 1425,
    primaryColor: '#eab308',
    secondaryColor: '#15803d',
    textColor: '#0f172a',
    homeStadium: 'Independence Park (Kingston)',
    minReputationToCoach: 30,
    worldCupTitles: 0,
    continentalTitles: 0,
  },
  {
    id: 'nt_hon',
    name: 'Honduras',
    code: 'HON',
    confederation: 'CONCACAF',
    federationCode: 'FFH',
    strength: 74,
    fifaPoints: 1358,
    primaryColor: '#0284c7',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Estádio Nacional Chelato Uclés (Tegucigalpa)',
    minReputationToCoach: 28,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Honduras',
  },
  {
    id: 'nt_gua',
    name: 'Guatemala',
    code: 'GUA',
    confederation: 'CONCACAF',
    federationCode: 'FEDEFUT',
    strength: 72,
    fifaPoints: 1274,
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
    textColor: '#0f172a',
    homeStadium: 'Estádio Doroteo Guamuch Flores (Cidade da Guatemala)',
    minReputationToCoach: 26,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Guatemala',
  },
  {
    id: 'nt_slv',
    name: 'El Salvador',
    code: 'SLV',
    confederation: 'CONCACAF',
    federationCode: 'FESFUT',
    strength: 72,
    fifaPoints: 1288,
    primaryColor: '#1d4ed8',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Estádio Cuscatlán (San Salvador)',
    minReputationToCoach: 26,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'El Salvador',
  },
  {
    id: 'nt_tri',
    name: 'Trinidad e Tobago',
    code: 'TRI',
    confederation: 'CONCACAF',
    federationCode: 'TTFA',
    strength: 72,
    fifaPoints: 1268,
    primaryColor: '#dc2626',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'Hasely Crawford Stadium (Port of Spain)',
    minReputationToCoach: 26,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Trinidad e Tobago',
  },
  {
    id: 'nt_sur',
    name: 'Suriname',
    code: 'SUR',
    confederation: 'CONCACAF',
    federationCode: 'SVB',
    strength: 71,
    fifaPoints: 1226,
    primaryColor: '#15803d',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Franklin Essed Stadion (Paramaribo)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Suriname',
  },
  {
    id: 'nt_nic',
    name: 'Nicarágua',
    code: 'NIC',
    confederation: 'CONCACAF',
    federationCode: 'FENIFUT',
    strength: 70,
    fifaPoints: 1185,
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Estádio Nacional de Fútbol (Manágua)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Nicarágua',
  },
  {
    id: 'nt_dom',
    name: 'República Dominicana',
    code: 'DOM',
    confederation: 'CONCACAF',
    federationCode: 'FEDOFUTBOL',
    strength: 70,
    fifaPoints: 1168,
    primaryColor: '#1e3a8a',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Estádio Olímpico Félix Sánchez (Santo Domingo)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'República Dominicana',
  },
  {
    id: 'nt_cub',
    name: 'Cuba',
    code: 'CUB',
    confederation: 'CONCACAF',
    federationCode: 'AFCU',
    strength: 69,
    fifaPoints: 1125,
    primaryColor: '#1d4ed8',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Estádio Antonio Maceo (Santiago de Cuba)',
    minReputationToCoach: 22,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Cuba',
  },

  // ================= CAF — ÁFRICA (56 Seleções CAF · 54 FIFA + Zanzibar e Reunião) =================
  {
    id: 'nt_mar',
    name: 'Marrocos',
    code: 'MAR',
    confederation: 'CAF',
    federationCode: 'FRMF',
    strength: 84,
    fifaPoints: 1692,
    primaryColor: '#b91c1c',
    secondaryColor: '#15803d',
    textColor: '#ffffff',
    homeStadium: 'Mohammed V (Casablanca)',
    minReputationToCoach: 48,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Marrocos',
  },
  {
    id: 'nt_sen',
    name: 'Senegal',
    code: 'SEN',
    confederation: 'CAF',
    federationCode: 'FSF',
    strength: 82,
    fifaPoints: 1635,
    primaryColor: '#16a34a',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Abdoulaye Wade (Dakar)',
    minReputationToCoach: 44,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Senegal',
  },
  {
    id: 'nt_nig',
    name: 'Nigéria',
    code: 'NIG',
    confederation: 'CAF',
    federationCode: 'NFF',
    strength: 81,
    fifaPoints: 1575,
    primaryColor: '#15803d',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Moshood Abiola (Abuja)',
    minReputationToCoach: 42,
    worldCupTitles: 0,
    continentalTitles: 3,
    countryMatch: 'Nigéria',
  },
  {
    id: 'nt_civ',
    name: 'Costa do Marfim',
    code: 'CIV',
    confederation: 'CAF',
    federationCode: 'FIF',
    strength: 81,
    fifaPoints: 1558,
    primaryColor: '#f97316',
    secondaryColor: '#15803d',
    textColor: '#0f172a',
    homeStadium: 'Alassane Ouattara (Abidjan)',
    minReputationToCoach: 42,
    worldCupTitles: 0,
    continentalTitles: 3,
    countryMatch: 'Costa do Marfim',
  },
  {
    id: 'nt_egi',
    name: 'Egito',
    code: 'EGI',
    confederation: 'CAF',
    federationCode: 'EFA',
    strength: 80,
    fifaPoints: 1592,
    primaryColor: '#b91c1c',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'Internacional do Cairo',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 7,
    countryMatch: 'Egito',
  },
  {
    id: 'nt_alg',
    name: 'Argélia',
    code: 'ALG',
    confederation: 'CAF',
    federationCode: 'FAF',
    strength: 79,
    fifaPoints: 1586,
    primaryColor: '#22c55e',
    secondaryColor: '#ffffff',
    textColor: '#052e16',
    homeStadium: 'Nelson Mandela (Argel)',
    minReputationToCoach: 38,
    worldCupTitles: 0,
    continentalTitles: 2,
    countryMatch: 'Argélia',
  },
  {
    id: 'nt_cam',
    name: 'Camarões',
    code: 'CAM',
    confederation: 'CAF',
    federationCode: 'FECAFOOT',
    strength: 78,
    fifaPoints: 1495,
    primaryColor: '#15803d',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Olembe Stadium (Yaoundé)',
    minReputationToCoach: 36,
    worldCupTitles: 0,
    continentalTitles: 5,
    countryMatch: 'Camarões',
  },
  {
    id: 'nt_gan',
    name: 'Gana',
    code: 'GAN',
    confederation: 'CAF',
    federationCode: 'GFA',
    strength: 77,
    fifaPoints: 1450,
    primaryColor: '#f8fafc',
    secondaryColor: '#eab308',
    textColor: '#0f172a',
    homeStadium: 'Baba Yara (Kumasi)',
    minReputationToCoach: 35,
    worldCupTitles: 0,
    continentalTitles: 4,
    countryMatch: 'Gana',
  },

  // ================= AFC / OFC — ÁSIA & OCEANIA (8 Seleções) =================
  {
    id: 'nt_jap',
    name: 'Japão',
    code: 'JAP',
    confederation: 'AFC',
    federationCode: 'JFA',
    strength: 83,
    fifaPoints: 1658,
    primaryColor: '#1e3a8a',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Saitama Stadium (Tóquio)',
    minReputationToCoach: 46,
    worldCupTitles: 0,
    continentalTitles: 4,
  },
  {
    id: 'nt_cor',
    name: 'Coreia do Sul',
    code: 'COR',
    confederation: 'AFC',
    federationCode: 'KFA',
    strength: 82,
    fifaPoints: 1608,
    primaryColor: '#e11d48',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'Seoul World Cup Stadium',
    minReputationToCoach: 44,
    worldCupTitles: 0,
    continentalTitles: 2,
  },
  {
    id: 'nt_ira',
    name: 'Irã',
    code: 'IRA',
    confederation: 'AFC',
    federationCode: 'FFIRI',
    strength: 79,
    fifaPoints: 1595,
    primaryColor: '#f8fafc',
    secondaryColor: '#15803d',
    textColor: '#0f172a',
    homeStadium: 'Azadi Stadium (Teerã)',
    minReputationToCoach: 38,
    worldCupTitles: 0,
    continentalTitles: 3,
  },
  {
    id: 'nt_aus',
    name: 'Austrália',
    code: 'AUS',
    confederation: 'AFC',
    federationCode: 'FA',
    strength: 79,
    fifaPoints: 1560,
    primaryColor: '#eab308',
    secondaryColor: '#14532d',
    textColor: '#052e16',
    homeStadium: 'Stadium Australia (Sydney)',
    minReputationToCoach: 38,
    worldCupTitles: 0,
    continentalTitles: 1,
  },
  {
    id: 'nt_ara',
    name: 'Arábia Saudita',
    code: 'ARA',
    confederation: 'AFC',
    federationCode: 'SAFF',
    strength: 76,
    fifaPoints: 1468,
    primaryColor: '#15803d',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'King Fahd (Riade)',
    minReputationToCoach: 34,
    worldCupTitles: 0,
    continentalTitles: 3,
  },
  {
    id: 'nt_qat',
    name: 'Catar',
    code: 'QAT',
    confederation: 'AFC',
    federationCode: 'QFA',
    strength: 76,
    fifaPoints: 1460,
    primaryColor: '#881337',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Lusail Stadium (Doha)',
    minReputationToCoach: 34,
    worldCupTitles: 0,
    continentalTitles: 2,
  },
  {
    id: 'nt_uzb',
    name: 'Uzbequistão',
    code: 'UZB',
    confederation: 'AFC',
    federationCode: 'UFA',
    strength: 75,
    fifaPoints: 1435,
    primaryColor: '#0284c7',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Milliy Stadium (Tashkent)',
    minReputationToCoach: 32,
    worldCupTitles: 0,
    continentalTitles: 0,
  },
  {
    id: 'nt_nzl',
    name: 'Nova Zelândia',
    code: 'NZL',
    confederation: 'OFC',
    federationCode: 'NZF',
    strength: 74,
    fifaPoints: 1388,
    primaryColor: '#1e293b',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Eden Park (Auckland)',
    minReputationToCoach: 30,
    worldCupTitles: 0,
    continentalTitles: 5,
    countryMatch: 'Nova Zelândia',
  },

  // ================= SELEÇÕES COPA DO MUNDO 2026 (EXPANSÃO FIFA 48) =================
  {
    id: 'nt_afs',
    name: 'África do Sul',
    code: 'AFS',
    confederation: 'CAF',
    federationCode: 'SAFA',
    strength: 75,
    fifaPoints: 1482,
    primaryColor: '#007749',
    secondaryColor: '#ffb612',
    textColor: '#ffffff',
    homeStadium: 'FNB Stadium (Joanesburgo)',
    minReputationToCoach: 38,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'África do Sul',
  },
  {
    id: 'nt_tch',
    name: 'República Tcheca',
    code: 'TCH',
    confederation: 'UEFA',
    federationCode: 'FACR',
    strength: 80,
    fifaPoints: 1545,
    primaryColor: '#ed1b2d',
    secondaryColor: '#11457e',
    textColor: '#ffffff',
    homeStadium: 'Fortuna Arena (Praga)',
    minReputationToCoach: 48,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'República Tcheca',
  },
  {
    id: 'nt_bos',
    name: 'Bósnia e Herzegovina',
    code: 'BOS',
    confederation: 'UEFA',
    federationCode: 'N/FSBiH',
    strength: 75,
    fifaPoints: 1385,
    primaryColor: '#002366',
    secondaryColor: '#ffcc00',
    textColor: '#ffffff',
    homeStadium: 'Bilino Polje (Zenica)',
    minReputationToCoach: 38,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Bósnia e Herzegovina',
  },
  {
    id: 'nt_esc',
    name: 'Escócia',
    code: 'ESC',
    confederation: 'UEFA',
    federationCode: 'SFA',
    strength: 80,
    fifaPoints: 1515,
    primaryColor: '#002b66',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Hampden Park (Glasgow)',
    minReputationToCoach: 46,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Escócia',
  },
  {
    id: 'nt_hai',
    name: 'Haiti',
    code: 'HAI',
    confederation: 'CONCACAF',
    federationCode: 'FHF',
    strength: 71,
    fifaPoints: 1290,
    primaryColor: '#00209f',
    secondaryColor: '#d21034',
    textColor: '#ffffff',
    homeStadium: 'Stade Sylvio Cator (Porto Príncipe)',
    minReputationToCoach: 30,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Haiti',
  },
  {
    id: 'nt_cur',
    name: 'Curaçao',
    code: 'CUR',
    confederation: 'CONCACAF',
    federationCode: 'FFK',
    strength: 71,
    fifaPoints: 1265,
    primaryColor: '#002b7f',
    secondaryColor: '#f9e814',
    textColor: '#ffffff',
    homeStadium: 'Ergilio Hato Stadium (Willemstad)',
    minReputationToCoach: 30,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Curaçao',
  },
  {
    id: 'nt_sue',
    name: 'Suécia',
    code: 'SUE',
    confederation: 'UEFA',
    federationCode: 'SvFF',
    strength: 82,
    fifaPoints: 1585,
    primaryColor: '#006aa7',
    secondaryColor: '#fecc00',
    textColor: '#ffffff',
    homeStadium: 'Friends Arena (Estocolmo)',
    minReputationToCoach: 50,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Suécia',
  },
  {
    id: 'nt_tun',
    name: 'Tunísia',
    code: 'TUN',
    confederation: 'CAF',
    federationCode: 'FTF',
    strength: 78,
    fifaPoints: 1565,
    primaryColor: '#e70013',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Stade Hammadi Agrebi (Radès)',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Tunísia',
  },
  {
    id: 'nt_cab',
    name: 'Cabo Verde',
    code: 'CAB',
    confederation: 'CAF',
    federationCode: 'FCF',
    strength: 75,
    fifaPoints: 1425,
    primaryColor: '#003893',
    secondaryColor: '#cf2027',
    textColor: '#ffffff',
    homeStadium: 'Estádio Nacional (Praia)',
    minReputationToCoach: 36,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Cabo Verde',
  },
  {
    id: 'nt_irq',
    name: 'Iraque',
    code: 'IRQ',
    confederation: 'AFC',
    federationCode: 'IFA',
    strength: 75,
    fifaPoints: 1435,
    primaryColor: '#007a3d',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Basra International Stadium (Basra)',
    minReputationToCoach: 38,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Iraque',
  },
  {
    id: 'nt_nor',
    name: 'Noruega',
    code: 'NOR',
    confederation: 'UEFA',
    federationCode: 'NFF',
    strength: 83,
    fifaPoints: 1595,
    primaryColor: '#ba0c2f',
    secondaryColor: '#00205b',
    textColor: '#ffffff',
    homeStadium: 'Ullevaal Stadion (Oslo)',
    minReputationToCoach: 52,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Noruega',
  },
  {
    id: 'nt_jor',
    name: 'Jordânia',
    code: 'JOR',
    confederation: 'AFC',
    federationCode: 'JFA',
    strength: 74,
    fifaPoints: 1405,
    primaryColor: '#ce1126',
    secondaryColor: '#007a3d',
    textColor: '#ffffff',
    homeStadium: 'Amman International Stadium (Amã)',
    minReputationToCoach: 36,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Jordânia',
  },
  {
    id: 'nt_rdc',
    name: 'RD Congo',
    code: 'RDC',
    confederation: 'CAF',
    federationCode: 'FECOFA',
    strength: 77,
    fifaPoints: 1498,
    primaryColor: '#007fff',
    secondaryColor: '#ce1126',
    textColor: '#ffffff',
    homeStadium: 'Stade des Martyrs (Kinshasa)',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 2,
    countryMatch: 'RD Congo',
  },
  {
    id: 'nt_gre',
    name: 'Grécia',
    code: 'GRE',
    confederation: 'UEFA',
    federationCode: 'HFF',
    strength: 80,
    fifaPoints: 1525,
    primaryColor: '#0d5eaf',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'OPAP Arena (Atenas)',
    minReputationToCoach: 46,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Grécia',
  },
  {
    id: 'nt_hun',
    name: 'Hungria',
    code: 'HUN',
    confederation: 'UEFA',
    federationCode: 'MLSZ',
    strength: 79,
    fifaPoints: 1510,
    primaryColor: '#ce2939',
    secondaryColor: '#477050',
    textColor: '#ffffff',
    homeStadium: 'Puskás Aréna (Budapeste)',
    minReputationToCoach: 44,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Hungria',
  },
  {
    id: 'nt_rom',
    name: 'Romênia',
    code: 'ROM',
    confederation: 'UEFA',
    federationCode: 'FRF',
    strength: 78,
    fifaPoints: 1495,
    primaryColor: '#fcd116',
    secondaryColor: '#002b7f',
    textColor: '#0f172a',
    homeStadium: 'Arena Națională (Bucareste)',
    minReputationToCoach: 42,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Romênia',
  },
  {
    id: 'nt_uae',
    name: 'Emirados Árabes Unidos',
    code: 'EAU',
    confederation: 'AFC',
    federationCode: 'UAEFA',
    strength: 74,
    fifaPoints: 1390,
    primaryColor: '#ffffff',
    secondaryColor: '#ef4444',
    textColor: '#0f172a',
    homeStadium: 'Hazza Bin Zayed (Al Ain)',
    minReputationToCoach: 32,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Emirados Árabes Unidos',
  },
  {
    id: 'nt_chn',
    name: 'China',
    code: 'CHN',
    confederation: 'AFC',
    federationCode: 'CFA',
    strength: 73,
    fifaPoints: 1355,
    primaryColor: '#de2910',
    secondaryColor: '#ffde00',
    textColor: '#ffffff',
    homeStadium: 'Workers Stadium (Pequim)',
    minReputationToCoach: 32,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'China',
  },
  {
    id: 'nt_oma',
    name: 'Omã',
    code: 'OMA',
    confederation: 'AFC',
    federationCode: 'OFA',
    strength: 72,
    fifaPoints: 1335,
    primaryColor: '#c8102e',
    secondaryColor: '#008000',
    textColor: '#ffffff',
    homeStadium: 'Sultan Qaboos (Mascate)',
    minReputationToCoach: 30,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Omã',
  },
  // ================= EXPANSÃO AFC — COMPLETANDO 48 SELEÇÕES DA ÁSIA =================
  {
    id: 'nt_rus',
    name: 'Rússia',
    code: 'RUS',
    confederation: 'AFC',
    federationCode: 'RFU',
    strength: 80,
    fifaPoints: 1545,
    primaryColor: '#d52b1e',
    secondaryColor: '#0039a6',
    textColor: '#ffffff',
    homeStadium: 'Luzhniki Stadium (Moscou)',
    minReputationToCoach: 44,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Rússia',
  },
  {
    id: 'nt_bhr',
    name: 'Bahrein',
    code: 'BHR',
    confederation: 'AFC',
    federationCode: 'BFA',
    strength: 73,
    fifaPoints: 1315,
    primaryColor: '#ce1126',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Bahrain National Stadium (Riffa)',
    minReputationToCoach: 28,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Bahrein',
  },
  {
    id: 'nt_syr',
    name: 'Síria',
    code: 'SYR',
    confederation: 'AFC',
    federationCode: 'SFA',
    strength: 72,
    fifaPoints: 1280,
    primaryColor: '#ce1126',
    secondaryColor: '#111827',
    textColor: '#ffffff',
    homeStadium: 'Abbasiyyin Stadium (Damasco)',
    minReputationToCoach: 26,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Síria',
  },
  {
    id: 'nt_pal',
    name: 'Palestina',
    code: 'PAL',
    confederation: 'AFC',
    federationCode: 'PFA',
    strength: 71,
    fifaPoints: 1265,
    primaryColor: '#007a3d',
    secondaryColor: '#ce1126',
    textColor: '#ffffff',
    homeStadium: 'Faisal Al-Husseini Stadium (Al-Ram)',
    minReputationToCoach: 26,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Palestina',
  },
  {
    id: 'nt_tha',
    name: 'Tailândia',
    code: 'THA',
    confederation: 'AFC',
    federationCode: 'FAT',
    strength: 72,
    fifaPoints: 1255,
    primaryColor: '#1d4ed8',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Rajamangala Stadium (Bangkok)',
    minReputationToCoach: 26,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Tailândia',
  },
  {
    id: 'nt_tjk',
    name: 'Tajiquistão',
    code: 'TJK',
    confederation: 'AFC',
    federationCode: 'FFT',
    strength: 71,
    fifaPoints: 1240,
    primaryColor: '#cc0000',
    secondaryColor: '#006600',
    textColor: '#ffffff',
    homeStadium: 'Pamir Stadium (Dushanbe)',
    minReputationToCoach: 25,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Tajiquistão',
  },
  {
    id: 'nt_kgz',
    name: 'Quirguistão',
    code: 'KGZ',
    confederation: 'AFC',
    federationCode: 'KFU',
    strength: 71,
    fifaPoints: 1235,
    primaryColor: '#e8112d',
    secondaryColor: '#ffef00',
    textColor: '#ffffff',
    homeStadium: 'Dolen Omurzakov Stadium (Bishkek)',
    minReputationToCoach: 25,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Quirguistão',
  },
  {
    id: 'nt_prk',
    name: 'Coreia do Norte',
    code: 'PRK',
    confederation: 'AFC',
    federationCode: 'PRKFA',
    strength: 71,
    fifaPoints: 1225,
    primaryColor: '#ed1c27',
    secondaryColor: '#024fa2',
    textColor: '#ffffff',
    homeStadium: 'Kim Il-sung Stadium (Pyongyang)',
    minReputationToCoach: 26,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Coreia do Norte',
  },
  {
    id: 'nt_vie',
    name: 'Vietnã',
    code: 'VIE',
    confederation: 'AFC',
    federationCode: 'VFF',
    strength: 71,
    fifaPoints: 1215,
    primaryColor: '#da251d',
    secondaryColor: '#ffff00',
    textColor: '#ffffff',
    homeStadium: 'Mỹ Đình National Stadium (Hanói)',
    minReputationToCoach: 25,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Vietnã',
  },
  {
    id: 'nt_idn',
    name: 'Indonésia',
    code: 'IDN',
    confederation: 'AFC',
    federationCode: 'PSSI',
    strength: 71,
    fifaPoints: 1205,
    primaryColor: '#ce1126',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Gelora Bung Karno (Jacarta)',
    minReputationToCoach: 26,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Indonésia',
  },
  {
    id: 'nt_lbn',
    name: 'Líbano',
    code: 'LBN',
    confederation: 'AFC',
    federationCode: 'LFA',
    strength: 69,
    fifaPoints: 1190,
    primaryColor: '#ed1c24',
    secondaryColor: '#00a651',
    textColor: '#ffffff',
    homeStadium: 'Camille Chamoun Stadium (Beirute)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Líbano',
  },
  {
    id: 'nt_ind',
    name: 'Índia',
    code: 'IND',
    confederation: 'AFC',
    federationCode: 'AIFF',
    strength: 70,
    fifaPoints: 1185,
    primaryColor: '#0284c7',
    secondaryColor: '#f97316',
    textColor: '#ffffff',
    homeStadium: 'Salt Lake Stadium (Calcutá)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Índia',
  },
  {
    id: 'nt_kuw',
    name: 'Kuwait',
    code: 'KUW',
    confederation: 'AFC',
    federationCode: 'KFA',
    strength: 69,
    fifaPoints: 1170,
    primaryColor: '#0284c7',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Jaber Al-Ahmad Stadium (Kuwait)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Kuwait',
  },
  {
    id: 'nt_mas',
    name: 'Malásia',
    code: 'MAS',
    confederation: 'AFC',
    federationCode: 'FAM',
    strength: 69,
    fifaPoints: 1165,
    primaryColor: '#facc15',
    secondaryColor: '#111827',
    textColor: '#0f172a',
    homeStadium: 'Bukit Jalil Stadium (Kuala Lumpur)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Malásia',
  },
  {
    id: 'nt_tkm',
    name: 'Turcomenistão',
    code: 'TKM',
    confederation: 'AFC',
    federationCode: 'TFF',
    strength: 68,
    fifaPoints: 1135,
    primaryColor: '#00843d',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Ashgabat Stadium (Asgabate)',
    minReputationToCoach: 22,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Turcomenistão',
  },
  {
    id: 'nt_phi',
    name: 'Filipinas',
    code: 'PHI',
    confederation: 'AFC',
    federationCode: 'PFF',
    strength: 67,
    fifaPoints: 1095,
    primaryColor: '#0038a8',
    secondaryColor: '#ce1126',
    textColor: '#ffffff',
    homeStadium: 'Rizal Memorial Stadium (Manila)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Filipinas',
  },
  {
    id: 'nt_hkg',
    name: 'Hong Kong',
    code: 'HKG',
    confederation: 'AFC',
    federationCode: 'HKFA',
    strength: 67,
    fifaPoints: 1085,
    primaryColor: '#de2910',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Hong Kong Stadium',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Hong Kong',
  },
  {
    id: 'nt_sin',
    name: 'Singapura',
    code: 'SIN',
    confederation: 'AFC',
    federationCode: 'FAS',
    strength: 66,
    fifaPoints: 1060,
    primaryColor: '#ef3340',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'National Stadium (Singapura)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Singapura',
  },
  {
    id: 'nt_afg',
    name: 'Afeganistão',
    code: 'AFG',
    confederation: 'AFC',
    federationCode: 'AFF',
    strength: 65,
    fifaPoints: 1045,
    primaryColor: '#bf0000',
    secondaryColor: '#009900',
    textColor: '#ffffff',
    homeStadium: 'Ghazi Stadium (Cabul)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Afeganistão',
  },
  {
    id: 'nt_yem',
    name: 'Iêmen',
    code: 'YEM',
    confederation: 'AFC',
    federationCode: 'YFA',
    strength: 64,
    fifaPoints: 1030,
    primaryColor: '#ce1126',
    secondaryColor: '#111827',
    textColor: '#ffffff',
    homeStadium: 'Althawra Sports City (Sanaa)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Iêmen',
  },
  {
    id: 'nt_tpe',
    name: 'Taipé Chinesa (Taiwan)',
    code: 'TPE',
    confederation: 'AFC',
    federationCode: 'CTFA',
    strength: 65,
    fifaPoints: 1020,
    primaryColor: '#000095',
    secondaryColor: '#fe0000',
    textColor: '#ffffff',
    homeStadium: 'Taipei Municipal Stadium (Taipé)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Taiwan',
  },
  {
    id: 'nt_mya',
    name: 'Myanmar',
    code: 'MYA',
    confederation: 'AFC',
    federationCode: 'MFF',
    strength: 64,
    fifaPoints: 1015,
    primaryColor: '#ea2839',
    secondaryColor: '#fecb00',
    textColor: '#ffffff',
    homeStadium: 'Thuwunna Stadium (Yangon)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Myanmar',
  },
  {
    id: 'nt_mdv',
    name: 'Maldivas',
    code: 'MDV',
    confederation: 'AFC',
    federationCode: 'FAM',
    strength: 64,
    fifaPoints: 995,
    primaryColor: '#d21034',
    secondaryColor: '#007e3a',
    textColor: '#ffffff',
    homeStadium: 'National Football Stadium (Malé)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Maldivas',
  },
  {
    id: 'nt_khm',
    name: 'Camboja',
    code: 'CAM',
    confederation: 'AFC',
    federationCode: 'FFC',
    strength: 63,
    fifaPoints: 985,
    primaryColor: '#032ea1',
    secondaryColor: '#e00025',
    textColor: '#ffffff',
    homeStadium: 'Morodok Techo Stadium (Phnom Penh)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Camboja',
  },
  {
    id: 'nt_nep',
    name: 'Nepal',
    code: 'NEP',
    confederation: 'AFC',
    federationCode: 'ANFA',
    strength: 63,
    fifaPoints: 970,
    primaryColor: '#dc143c',
    secondaryColor: '#003893',
    textColor: '#ffffff',
    homeStadium: 'Dasharath Rangasala (Katmandu)',
    minReputationToCoach: 16,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Nepal',
  },
  {
    id: 'nt_ban',
    name: 'Bangladesh',
    code: 'BAN',
    confederation: 'AFC',
    federationCode: 'BFF',
    strength: 63,
    fifaPoints: 960,
    primaryColor: '#006a4e',
    secondaryColor: '#f42a41',
    textColor: '#ffffff',
    homeStadium: 'Bangabandhu Stadium (Daca)',
    minReputationToCoach: 16,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Bangladesh',
  },
  {
    id: 'nt_lao',
    name: 'Laos',
    code: 'LAO',
    confederation: 'AFC',
    federationCode: 'LFF',
    strength: 62,
    fifaPoints: 940,
    primaryColor: '#ce1126',
    secondaryColor: '#002868',
    textColor: '#ffffff',
    homeStadium: 'New Laos National Stadium (Vientiane)',
    minReputationToCoach: 16,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Laos',
  },
  {
    id: 'nt_mng',
    name: 'Mongólia',
    code: 'MNG',
    confederation: 'AFC',
    federationCode: 'MFF',
    strength: 62,
    fifaPoints: 930,
    primaryColor: '#015197',
    secondaryColor: '#c4272f',
    textColor: '#ffffff',
    homeStadium: 'MFF Football Centre (Ulaanbaatar)',
    minReputationToCoach: 16,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Mongólia',
  },
  {
    id: 'nt_pak',
    name: 'Paquistão',
    code: 'PAK',
    confederation: 'AFC',
    federationCode: 'PFF',
    strength: 62,
    fifaPoints: 920,
    primaryColor: '#01411c',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Jinnah Sports Stadium (Islamabad)',
    minReputationToCoach: 16,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Paquistão',
  },
  {
    id: 'nt_bhu',
    name: 'Butão',
    code: 'BHU',
    confederation: 'AFC',
    federationCode: 'BFF',
    strength: 61,
    fifaPoints: 915,
    primaryColor: '#ff4e12',
    secondaryColor: '#ffd520',
    textColor: '#ffffff',
    homeStadium: 'Changlimithang Stadium (Thimphu)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Butão',
  },
  {
    id: 'nt_bru',
    name: 'Brunei',
    code: 'BRU',
    confederation: 'AFC',
    federationCode: 'FABD',
    strength: 60,
    fifaPoints: 910,
    primaryColor: '#f7e017',
    secondaryColor: '#111827',
    textColor: '#0f172a',
    homeStadium: 'Hassanal Bolkiah Stadium (Bandar Seri Begawan)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Brunei',
  },
  {
    id: 'nt_sri',
    name: 'Sri Lanka',
    code: 'SRI',
    confederation: 'AFC',
    federationCode: 'FFSL',
    strength: 61,
    fifaPoints: 905,
    primaryColor: '#8d153a',
    secondaryColor: '#ffbe29',
    textColor: '#ffffff',
    homeStadium: 'Colombo Racecourse (Colombo)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Sri Lanka',
  },
  {
    id: 'nt_tls',
    name: 'Timor-Leste',
    code: 'TLS',
    confederation: 'AFC',
    federationCode: 'FFTL',
    strength: 60,
    fifaPoints: 900,
    primaryColor: '#dc241f',
    secondaryColor: '#ffc726',
    textColor: '#ffffff',
    homeStadium: 'Estádio Municipal de Díli',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Timor-Leste',
  },
  {
    id: 'nt_mac',
    name: 'Macau',
    code: 'MAC',
    confederation: 'AFC',
    federationCode: 'AFM',
    strength: 60,
    fifaPoints: 895,
    primaryColor: '#00785e',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Estádio Campo Desportivo (Taipa)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Macau',
  },
  {
    id: 'nt_gum',
    name: 'Guam',
    code: 'GUM',
    confederation: 'AFC',
    federationCode: 'GFA',
    strength: 59,
    fifaPoints: 870,
    primaryColor: '#003f87',
    secondaryColor: '#ce1126',
    textColor: '#ffffff',
    homeStadium: 'GFA National Training Center (Dededo)',
    minReputationToCoach: 14,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Guam',
  },
  {
    id: 'nt_nmi',
    name: 'Ilhas Marianas do Norte',
    code: 'NMI',
    confederation: 'AFC',
    federationCode: 'NMIFA',
    strength: 58,
    fifaPoints: 850,
    primaryColor: '#0066b3',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'NMI Soccer Training Center (Saipan)',
    minReputationToCoach: 14,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Ilhas Marianas do Norte',
  },
  {
    id: 'nt_fij',
    name: 'Fiji',
    code: 'FIJ',
    confederation: 'OFC',
    federationCode: 'FFA',
    strength: 68,
    fifaPoints: 1120,
    primaryColor: '#f8fafc',
    secondaryColor: '#0284c7',
    textColor: '#0f172a',
    homeStadium: 'HFC Bank Stadium (Suva)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Fiji',
  },
  {
    id: 'nt_tah',
    name: 'Taiti',
    code: 'TAH',
    confederation: 'OFC',
    federationCode: 'FTF',
    strength: 67,
    fifaPoints: 1105,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Stade Pater (Papeete)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Taiti',
  },
  {
    id: 'nt_ncl',
    name: 'Nova Caledônia',
    code: 'NCL',
    confederation: 'OFC',
    federationCode: 'FCF',
    strength: 67,
    fifaPoints: 1098,
    primaryColor: '#1e293b',
    secondaryColor: '#eab308',
    textColor: '#ffffff',
    homeStadium: 'Stade Numa-Daly (Nouméa)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Nova Caledônia',
  },
  {
    id: 'nt_sol',
    name: 'Ilhas Salomão',
    code: 'SOL',
    confederation: 'OFC',
    federationCode: 'SIFF',
    strength: 66,
    fifaPoints: 1086,
    primaryColor: '#1d4ed8',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Lawson Tama Stadium (Honiara)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Ilhas Salomão',
  },
  {
    id: 'nt_png',
    name: 'Papua-Nova Guiné',
    code: 'PNG',
    confederation: 'OFC',
    federationCode: 'PNGFA',
    strength: 65,
    fifaPoints: 1045,
    primaryColor: '#b91c1c',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Sir John Guise Stadium (Port Moresby)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Papua-Nova Guiné',
  },
  {
    id: 'nt_van',
    name: 'Vanuatu',
    code: 'VAN',
    confederation: 'OFC',
    federationCode: 'VFF',
    strength: 65,
    fifaPoints: 1038,
    primaryColor: '#eab308',
    secondaryColor: '#111827',
    textColor: '#0f172a',
    homeStadium: 'Freshwater Stadium (Port Vila)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Vanuatu',
  },
  {
    id: 'nt_sam',
    name: 'Samoa',
    code: 'SAM',
    confederation: 'OFC',
    federationCode: 'FFS',
    strength: 61,
    fifaPoints: 895,
    primaryColor: '#1e3a8a',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Apia Park (Apia)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Samoa',
  },
  {
    id: 'nt_cok',
    name: 'Ilhas Cook',
    code: 'COK',
    confederation: 'OFC',
    federationCode: 'CIFA',
    strength: 60,
    fifaPoints: 875,
    primaryColor: '#15803d',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'National Stadium (Avarua)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Ilhas Cook',
  },
  {
    id: 'nt_ton',
    name: 'Tonga',
    code: 'TON',
    confederation: 'OFC',
    federationCode: 'TFA',
    strength: 59,
    fifaPoints: 856,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Teufaiva Sport Stadium (Nukuʻalofa)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Tonga',
  },
  {
    id: 'nt_asa',
    name: 'Samoa Americana',
    code: 'ASA',
    confederation: 'OFC',
    federationCode: 'FFAS',
    strength: 58,
    fifaPoints: 842,
    primaryColor: '#1d4ed8',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Veterans Memorial Stadium (Pago Pago)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Samoa Americana',
  },

  // ================= UEFA — EXPANSÃO COMPLETA NATIONS LEAGUE 2026-28 (30 Seleções) =================
  {
    id: 'nt_gal',
    name: 'País de Gales',
    code: 'GAL',
    confederation: 'UEFA',
    federationCode: 'FAW',
    strength: 79,
    fifaPoints: 1538,
    primaryColor: '#dc2626',
    secondaryColor: '#15803d',
    textColor: '#ffffff',
    homeStadium: 'Cardiff City Stadium (Cardiff)',
    minReputationToCoach: 42,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'País de Gales',
  },
  {
    id: 'nt_svn',
    name: 'Eslovênia',
    code: 'SVN',
    confederation: 'UEFA',
    federationCode: 'NZS',
    strength: 78,
    fifaPoints: 1492,
    primaryColor: '#0284c7',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Stožice Stadium (Liubliana)',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Eslovênia',
  },
  {
    id: 'nt_mdn',
    name: 'Macedônia do Norte',
    code: 'MDN',
    confederation: 'UEFA',
    federationCode: 'FFM',
    strength: 74,
    fifaPoints: 1388,
    primaryColor: '#b91c1c',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Toše Proeski Arena (Escópia)',
    minReputationToCoach: 32,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Macedônia do Norte',
  },
  {
    id: 'nt_nir',
    name: 'Irlanda do Norte',
    code: 'NIR',
    confederation: 'UEFA',
    federationCode: 'IFA',
    strength: 75,
    fifaPoints: 1410,
    primaryColor: '#15803d',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Windsor Park (Belfast)',
    minReputationToCoach: 34,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Irlanda do Norte',
  },
  {
    id: 'nt_geo',
    name: 'Geórgia',
    code: 'GEO',
    confederation: 'UEFA',
    federationCode: 'GFF',
    strength: 78,
    fifaPoints: 1472,
    primaryColor: '#ffffff',
    secondaryColor: '#dc2626',
    textColor: '#991b1b',
    homeStadium: 'Boris Paichadze (Tbilisi)',
    minReputationToCoach: 38,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Geórgia',
  },
  {
    id: 'nt_kos',
    name: 'Kosovo',
    code: 'KOS',
    confederation: 'UEFA',
    federationCode: 'FFK',
    strength: 73,
    fifaPoints: 1318,
    primaryColor: '#1d4ed8',
    secondaryColor: '#eab308',
    textColor: '#ffffff',
    homeStadium: 'Fadil Vokrri (Pristina)',
    minReputationToCoach: 28,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Kosovo',
  },
  {
    id: 'nt_irl',
    name: 'Irlanda',
    code: 'IRL',
    confederation: 'UEFA',
    federationCode: 'FAI',
    strength: 76,
    fifaPoints: 1432,
    primaryColor: '#16a34a',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Aviva Stadium (Dublin)',
    minReputationToCoach: 36,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Irlanda',
  },
  {
    id: 'nt_isr',
    name: 'Israel',
    code: 'ISR',
    confederation: 'UEFA',
    federationCode: 'IFA',
    strength: 74,
    fifaPoints: 1375,
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Bloomfield Stadium (Tel Aviv)',
    minReputationToCoach: 30,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Israel',
  },
  {
    id: 'nt_alb',
    name: 'Albânia',
    code: 'ALB',
    confederation: 'UEFA',
    federationCode: 'FSHF',
    strength: 75,
    fifaPoints: 1404,
    primaryColor: '#b91c1c',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'Arena Kombëtare (Tirana)',
    minReputationToCoach: 32,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Albânia',
  },
  {
    id: 'nt_blr',
    name: 'Bielorrússia',
    code: 'BLR',
    confederation: 'UEFA',
    federationCode: 'BFF',
    strength: 69,
    fifaPoints: 1228,
    primaryColor: '#b91c1c',
    secondaryColor: '#15803d',
    textColor: '#ffffff',
    homeStadium: 'Dinamo Stadium (Minsk)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Bielorrússia',
  },
  {
    id: 'nt_fin',
    name: 'Finlândia',
    code: 'FIN',
    confederation: 'UEFA',
    federationCode: 'SPL',
    strength: 74,
    fifaPoints: 1368,
    primaryColor: '#f8fafc',
    secondaryColor: '#1e3a8a',
    textColor: '#1e3a8a',
    homeStadium: 'Olímpico de Helsinque',
    minReputationToCoach: 32,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Finlândia',
  },
  {
    id: 'nt_smr',
    name: 'San Marino',
    code: 'SMR',
    confederation: 'UEFA',
    federationCode: 'FSGC',
    strength: 54,
    fifaPoints: 752,
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
    textColor: '#0f172a',
    homeStadium: 'San Marino Stadium (Serravalle)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'San Marino',
  },
  {
    id: 'nt_mne',
    name: 'Montenegro',
    code: 'MNE',
    confederation: 'UEFA',
    federationCode: 'FSCG',
    strength: 72,
    fifaPoints: 1326,
    primaryColor: '#b91c1c',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Podgorica City Stadium',
    minReputationToCoach: 28,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Montenegro',
  },
  {
    id: 'nt_cyp',
    name: 'Chipre',
    code: 'CYP',
    confederation: 'UEFA',
    federationCode: 'CFA',
    strength: 67,
    fifaPoints: 1125,
    primaryColor: '#f8fafc',
    secondaryColor: '#0284c7',
    textColor: '#0f172a',
    homeStadium: 'GSP Stadium (Nicósia)',
    minReputationToCoach: 22,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Chipre',
  },
  {
    id: 'nt_arm',
    name: 'Armênia',
    code: 'ARM',
    confederation: 'UEFA',
    federationCode: 'FFA',
    strength: 70,
    fifaPoints: 1218,
    primaryColor: '#dc2626',
    secondaryColor: '#1d4ed8',
    textColor: '#ffffff',
    homeStadium: 'Vazgen Sargsyan (Yerevan)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Armênia',
  },
  {
    id: 'nt_ltn',
    name: 'Letônia',
    code: 'LTN',
    confederation: 'UEFA',
    federationCode: 'LFF',
    strength: 66,
    fifaPoints: 1094,
    primaryColor: '#881337',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Daugava Stadium (Riga)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Letônia',
  },
  {
    id: 'nt_svk',
    name: 'Eslováquia',
    code: 'SVK',
    confederation: 'UEFA',
    federationCode: 'SFZ',
    strength: 78,
    fifaPoints: 1488,
    primaryColor: '#1d4ed8',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Tehelné pole (Bratislava)',
    minReputationToCoach: 40,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Eslováquia',
  },
  {
    id: 'nt_mda',
    name: 'Moldávia',
    code: 'MDA',
    confederation: 'UEFA',
    federationCode: 'FMF',
    strength: 65,
    fifaPoints: 1052,
    primaryColor: '#2563eb',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Zimbru Stadium (Chisinau)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Moldávia',
  },
  {
    id: 'nt_fro',
    name: 'Ilhas Faroe',
    code: 'FRO',
    confederation: 'UEFA',
    federationCode: 'FSF',
    strength: 65,
    fifaPoints: 1072,
    primaryColor: '#f8fafc',
    secondaryColor: '#1d4ed8',
    textColor: '#1e3a8a',
    homeStadium: 'Tórsvøllur (Tórshavn)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Ilhas Faroe',
  },
  {
    id: 'nt_czq',
    name: 'Cazaquistão',
    code: 'CZQ',
    confederation: 'UEFA',
    federationCode: 'KFF',
    strength: 69,
    fifaPoints: 1204,
    primaryColor: '#0ea5e9',
    secondaryColor: '#facc15',
    textColor: '#0f172a',
    homeStadium: 'Astana Arena (Astana)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Cazaquistão',
  },
  {
    id: 'nt_isl',
    name: 'Islândia',
    code: 'ISL',
    confederation: 'UEFA',
    federationCode: 'KSI',
    strength: 74,
    fifaPoints: 1358,
    primaryColor: '#1d4ed8',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Laugardalsvöllur (Reykjavík)',
    minReputationToCoach: 32,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Islândia',
  },
  {
    id: 'nt_est',
    name: 'Estônia',
    code: 'EST',
    confederation: 'UEFA',
    federationCode: 'EJL',
    strength: 67,
    fifaPoints: 1138,
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'A. Le Coq Arena (Tallinn)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Estônia',
  },
  {
    id: 'nt_bul',
    name: 'Bulgária',
    code: 'BUL',
    confederation: 'UEFA',
    federationCode: 'BFS',
    strength: 72,
    fifaPoints: 1288,
    primaryColor: '#15803d',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Vasil Levski (Sófia)',
    minReputationToCoach: 28,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Bulgária',
  },
  {
    id: 'nt_lux',
    name: 'Luxemburgo',
    code: 'LUX',
    confederation: 'UEFA',
    federationCode: 'FLF',
    strength: 71,
    fifaPoints: 1264,
    primaryColor: '#dc2626',
    secondaryColor: '#38bdf8',
    textColor: '#ffffff',
    homeStadium: 'Stade de Luxembourg',
    minReputationToCoach: 26,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Luxemburgo',
  },
  {
    id: 'nt_mlt',
    name: 'Malta',
    code: 'MLT',
    confederation: 'UEFA',
    federationCode: 'MFA',
    strength: 61,
    fifaPoints: 964,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Ta’ Qali National Stadium',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Malta',
  },
  {
    id: 'nt_and',
    name: 'Andorra',
    code: 'AND',
    confederation: 'UEFA',
    federationCode: 'FAF',
    strength: 58,
    fifaPoints: 928,
    primaryColor: '#1d4ed8',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Estadi Nacional (Andorra-a-Velha)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Andorra',
  },
  {
    id: 'nt_gib',
    name: 'Gibraltar',
    code: 'GIB',
    confederation: 'UEFA',
    federationCode: 'GFA',
    strength: 56,
    fifaPoints: 842,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Europa Point Stadium (Gibraltar)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Gibraltar',
  },
  {
    id: 'nt_aze',
    name: 'Azerbaijão',
    code: 'AZE',
    confederation: 'UEFA',
    federationCode: 'AFFA',
    strength: 68,
    fifaPoints: 1172,
    primaryColor: '#0284c7',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Estádio Olímpico de Baku',
    minReputationToCoach: 22,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Azerbaijão',
  },
  {
    id: 'nt_ltu',
    name: 'Lituânia',
    code: 'LTU',
    confederation: 'UEFA',
    federationCode: 'LFF',
    strength: 65,
    fifaPoints: 1082,
    primaryColor: '#eab308',
    secondaryColor: '#15803d',
    textColor: '#052e16',
    homeStadium: 'Darius and Girėnas (Kaunas)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Lituânia',
  },
  {
    id: 'nt_lie',
    name: 'Liechtenstein',
    code: 'LIE',
    confederation: 'UEFA',
    federationCode: 'LFV',
    strength: 55,
    fifaPoints: 814,
    primaryColor: '#1e3a8a',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Rheinpark Stadion (Vaduz)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Liechtenstein',
  },

  // ================= EXPANSÃO CAF COMPLETA (44 RESTANTES = 56 SELEÇÕES DA ÁFRICA) =================
  {
    id: 'nt_mli',
    name: 'Mali',
    code: 'MLI',
    confederation: 'CAF',
    federationCode: 'FEMAFOOT',
    strength: 78,
    fifaPoints: 1510,
    primaryColor: '#15803d',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Stade du 26 Mars (Bamako)',
    minReputationToCoach: 34,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Mali',
  },
  {
    id: 'nt_bfa',
    name: 'Burkina Faso',
    code: 'BFA',
    confederation: 'CAF',
    federationCode: 'FBF',
    strength: 76,
    fifaPoints: 1438,
    primaryColor: '#16a34a',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Stade du 4 Août (Ouagadougou)',
    minReputationToCoach: 32,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Burkina Faso',
  },
  {
    id: 'nt_gui',
    name: 'Guiné',
    code: 'GUI',
    confederation: 'CAF',
    federationCode: 'FGF',
    strength: 76,
    fifaPoints: 1430,
    primaryColor: '#dc2626',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Général Lansana Conté (Conacri)',
    minReputationToCoach: 32,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Guiné',
  },
  {
    id: 'nt_gab',
    name: 'Gabão',
    code: 'GAB',
    confederation: 'CAF',
    federationCode: 'FEGAFOOT',
    strength: 75,
    fifaPoints: 1410,
    primaryColor: '#facc15',
    secondaryColor: '#1d4ed8',
    textColor: '#0f172a',
    homeStadium: 'Stade de Franceville',
    minReputationToCoach: 30,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Gabão',
  },
  {
    id: 'nt_ang',
    name: 'Angola',
    code: 'ANG',
    confederation: 'CAF',
    federationCode: 'FAF',
    strength: 75,
    fifaPoints: 1398,
    primaryColor: '#b91c1c',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'Estádio 11 de Novembro (Luanda)',
    minReputationToCoach: 30,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Angola',
  },
  {
    id: 'nt_zam',
    name: 'Zâmbia',
    code: 'ZAM',
    confederation: 'CAF',
    federationCode: 'FAZ',
    strength: 74,
    fifaPoints: 1378,
    primaryColor: '#15803d',
    secondaryColor: '#f97316',
    textColor: '#ffffff',
    homeStadium: 'National Heroes Stadium (Lusaka)',
    minReputationToCoach: 28,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Zâmbia',
  },
  {
    id: 'nt_geq',
    name: 'Guiné Equatorial',
    code: 'GEQ',
    confederation: 'CAF',
    federationCode: 'FEGUIFUT',
    strength: 74,
    fifaPoints: 1365,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Nuevo Estadio de Malabo',
    minReputationToCoach: 26,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Guiné Equatorial',
  },
  {
    id: 'nt_moz',
    name: 'Moçambique',
    code: 'MOZ',
    confederation: 'CAF',
    federationCode: 'FMF',
    strength: 73,
    fifaPoints: 1340,
    primaryColor: '#dc2626',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Estádio do Zimpeto (Maputo)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Moçambique',
  },
  {
    id: 'nt_ben',
    name: 'Benin',
    code: 'BEN',
    confederation: 'CAF',
    federationCode: 'FBF',
    strength: 73,
    fifaPoints: 1330,
    primaryColor: '#facc15',
    secondaryColor: '#15803d',
    textColor: '#0f172a',
    homeStadium: 'Stade de l’Amitié (Cotonou)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Benin',
  },
  {
    id: 'nt_uga',
    name: 'Uganda',
    code: 'UGA',
    confederation: 'CAF',
    federationCode: 'FUFA',
    strength: 73,
    fifaPoints: 1322,
    primaryColor: '#b91c1c',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Mandela National Stadium (Kampala)',
    minReputationToCoach: 24,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Uganda',
  },
  {
    id: 'nt_com',
    name: 'Comores',
    code: 'COM',
    confederation: 'CAF',
    federationCode: 'FFC',
    strength: 72,
    fifaPoints: 1308,
    primaryColor: '#15803d',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Stade Omnisports de Malouzini (Moroni)',
    minReputationToCoach: 22,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Comores',
  },
  {
    id: 'nt_mtn',
    name: 'Mauritânia',
    code: 'MTN',
    confederation: 'CAF',
    federationCode: 'FFRIM',
    strength: 72,
    fifaPoints: 1295,
    primaryColor: '#16a34a',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Stade Cheikha Ould Boïdiya (Nouakchott)',
    minReputationToCoach: 22,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Mauritânia',
  },
  {
    id: 'nt_ken',
    name: 'Quênia',
    code: 'KEN',
    confederation: 'CAF',
    federationCode: 'FKF',
    strength: 72,
    fifaPoints: 1288,
    primaryColor: '#b91c1c',
    secondaryColor: '#15803d',
    textColor: '#ffffff',
    homeStadium: 'Kasarani Stadium (Nairóbi)',
    minReputationToCoach: 22,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Quênia',
  },
  {
    id: 'nt_tan',
    name: 'Tanzânia',
    code: 'TAN',
    confederation: 'CAF',
    federationCode: 'TFF',
    strength: 71,
    fifaPoints: 1278,
    primaryColor: '#0284c7',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Benjamin Mkapa (Dar es Salaam)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Tanzânia',
  },
  {
    id: 'nt_nam',
    name: 'Namíbia',
    code: 'NAM',
    confederation: 'CAF',
    federationCode: 'NFA',
    strength: 71,
    fifaPoints: 1268,
    primaryColor: '#1d4ed8',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Independence Stadium (Windhoek)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Namíbia',
  },
  {
    id: 'nt_sdn',
    name: 'Sudão',
    code: 'SDN',
    confederation: 'CAF',
    federationCode: 'SFA',
    strength: 71,
    fifaPoints: 1260,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Al-Merrikh Stadium (Ondurmã)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Sudão',
  },
  {
    id: 'nt_mad',
    name: 'Madagascar',
    code: 'MAD',
    confederation: 'CAF',
    federationCode: 'FMF',
    strength: 71,
    fifaPoints: 1252,
    primaryColor: '#15803d',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Estádio Barea (Antananarivo)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Madagascar',
  },
  {
    id: 'nt_tog',
    name: 'Togo',
    code: 'TOG',
    confederation: 'CAF',
    federationCode: 'FTF',
    strength: 70,
    fifaPoints: 1244,
    primaryColor: '#facc15',
    secondaryColor: '#15803d',
    textColor: '#0f172a',
    homeStadium: 'Stade de Kégué (Lomé)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Togo',
  },
  {
    id: 'nt_lby',
    name: 'Líbia',
    code: 'LBY',
    confederation: 'CAF',
    federationCode: 'LFF',
    strength: 70,
    fifaPoints: 1236,
    primaryColor: '#15803d',
    secondaryColor: '#0f172a',
    textColor: '#ffffff',
    homeStadium: 'Estádio Internacional de Trípoli',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Líbia',
  },
  {
    id: 'nt_gnb',
    name: 'Guiné-Bissau',
    code: 'GNB',
    confederation: 'CAF',
    federationCode: 'FFGB',
    strength: 70,
    fifaPoints: 1228,
    primaryColor: '#dc2626',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Estádio 24 de Setembro (Bissau)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Guiné-Bissau',
  },
  {
    id: 'nt_zim',
    name: 'Zimbábue',
    code: 'ZIM',
    confederation: 'CAF',
    federationCode: 'ZIFA',
    strength: 70,
    fifaPoints: 1220,
    primaryColor: '#facc15',
    secondaryColor: '#15803d',
    textColor: '#0f172a',
    homeStadium: 'National Sports Stadium (Harare)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Zimbábue',
  },
  {
    id: 'nt_gam',
    name: 'Gâmbia',
    code: 'GAM',
    confederation: 'CAF',
    federationCode: 'GFF',
    strength: 70,
    fifaPoints: 1212,
    primaryColor: '#dc2626',
    secondaryColor: '#1d4ed8',
    textColor: '#ffffff',
    homeStadium: 'Independence Stadium (Bakau)',
    minReputationToCoach: 20,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Gâmbia',
  },
  {
    id: 'nt_sle',
    name: 'Serra Leoa',
    code: 'SLE',
    confederation: 'CAF',
    federationCode: 'SLFA',
    strength: 69,
    fifaPoints: 1200,
    primaryColor: '#16a34a',
    secondaryColor: '#0284c7',
    textColor: '#ffffff',
    homeStadium: 'National Stadium (Freetown)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Serra Leoa',
  },
  {
    id: 'nt_ngr',
    name: 'Níger',
    code: 'NGR',
    confederation: 'CAF',
    federationCode: 'FENIFOOT',
    strength: 69,
    fifaPoints: 1190,
    primaryColor: '#f97316',
    secondaryColor: '#15803d',
    textColor: '#0f172a',
    homeStadium: 'Général Seyni Kountché (Niamey)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Níger',
  },
  {
    id: 'nt_rwa',
    name: 'Ruanda',
    code: 'RWA',
    confederation: 'CAF',
    federationCode: 'FERWAFA',
    strength: 69,
    fifaPoints: 1180,
    primaryColor: '#facc15',
    secondaryColor: '#0284c7',
    textColor: '#0f172a',
    homeStadium: 'Amahoro Stadium (Kigali)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Ruanda',
  },
  {
    id: 'nt_cgo',
    name: 'Congo',
    code: 'CGO',
    confederation: 'CAF',
    federationCode: 'FECOFOOT',
    strength: 69,
    fifaPoints: 1170,
    primaryColor: '#dc2626',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Stade Alphonse Massamba-Débat (Brazzaville)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Congo',
  },
  {
    id: 'nt_cta',
    name: 'República Centro-Africana',
    code: 'CTA',
    confederation: 'CAF',
    federationCode: 'FCF',
    strength: 68,
    fifaPoints: 1158,
    primaryColor: '#1d4ed8',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Barthélemy Boganda (Bangui)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'República Centro-Africana',
  },
  {
    id: 'nt_mwi',
    name: 'Malawi',
    code: 'MWI',
    confederation: 'CAF',
    federationCode: 'FAM',
    strength: 68,
    fifaPoints: 1148,
    primaryColor: '#b91c1c',
    secondaryColor: '#15803d',
    textColor: '#ffffff',
    homeStadium: 'Bingu National Stadium (Lilongwe)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Malawi',
  },
  {
    id: 'nt_bot',
    name: 'Botswana',
    code: 'BOT',
    confederation: 'CAF',
    federationCode: 'BFA',
    strength: 68,
    fifaPoints: 1138,
    primaryColor: '#38bdf8',
    secondaryColor: '#0f172a',
    textColor: '#0f172a',
    homeStadium: 'Obed Itani Chilume (Francistown)',
    minReputationToCoach: 18,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Botswana',
  },
  {
    id: 'nt_bdi',
    name: 'Burundi',
    code: 'BDI',
    confederation: 'CAF',
    federationCode: 'FFB',
    strength: 67,
    fifaPoints: 1126,
    primaryColor: '#16a34a',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Intwari Stadium (Bujumbura)',
    minReputationToCoach: 16,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Burundi',
  },
  {
    id: 'nt_eti',
    name: 'Etiópia',
    code: 'ETI',
    confederation: 'CAF',
    federationCode: 'EFF',
    strength: 67,
    fifaPoints: 1116,
    primaryColor: '#15803d',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Addis Ababa Stadium',
    minReputationToCoach: 16,
    worldCupTitles: 0,
    continentalTitles: 1,
    countryMatch: 'Etiópia',
  },
  {
    id: 'nt_lbr',
    name: 'Libéria',
    code: 'LBR',
    confederation: 'CAF',
    federationCode: 'LFA',
    strength: 67,
    fifaPoints: 1106,
    primaryColor: '#1e3a8a',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'SKD Sports Complex (Monróvia)',
    minReputationToCoach: 16,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Libéria',
  },
  {
    id: 'nt_les',
    name: 'Lesoto',
    code: 'LES',
    confederation: 'CAF',
    federationCode: 'LeFA',
    strength: 66,
    fifaPoints: 1085,
    primaryColor: '#1d4ed8',
    secondaryColor: '#15803d',
    textColor: '#ffffff',
    homeStadium: 'Setsoto Stadium (Maseru)',
    minReputationToCoach: 16,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Lesoto',
  },
  {
    id: 'nt_esw',
    name: 'Eswatini',
    code: 'ESW',
    confederation: 'CAF',
    federationCode: 'EFA',
    strength: 65,
    fifaPoints: 1065,
    primaryColor: '#1e40af',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Somhlolo National Stadium (Lobamba)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Eswatini',
  },
  {
    id: 'nt_ssd',
    name: 'Sudão do Sul',
    code: 'SSD',
    confederation: 'CAF',
    federationCode: 'SSFA',
    strength: 64,
    fifaPoints: 1035,
    primaryColor: '#0284c7',
    secondaryColor: '#15803d',
    textColor: '#ffffff',
    homeStadium: 'Juba Stadium (Juba)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Sudão do Sul',
  },
  {
    id: 'nt_mri',
    name: 'Ilhas Maurício',
    code: 'MRI',
    confederation: 'CAF',
    federationCode: 'MFA',
    strength: 63,
    fifaPoints: 1005,
    primaryColor: '#dc2626',
    secondaryColor: '#1d4ed8',
    textColor: '#ffffff',
    homeStadium: 'Côte d’Or National Sports Complex (Saint Pierre)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Ilhas Maurício',
  },
  {
    id: 'nt_cha',
    name: 'Chade',
    code: 'CHA',
    confederation: 'CAF',
    federationCode: 'FTFA',
    strength: 62,
    fifaPoints: 985,
    primaryColor: '#1e3a8a',
    secondaryColor: '#facc15',
    textColor: '#ffffff',
    homeStadium: 'Stade Omnisports Idriss Mahamat Ouya (N’Djamena)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Chade',
  },
  {
    id: 'nt_stp',
    name: 'São Tomé e Príncipe',
    code: 'STP',
    confederation: 'CAF',
    federationCode: 'FSF',
    strength: 60,
    fifaPoints: 940,
    primaryColor: '#facc15',
    secondaryColor: '#15803d',
    textColor: '#0f172a',
    homeStadium: 'Estádio Nacional 12 de Julho (São Tomé)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'São Tomé e Príncipe',
  },
  {
    id: 'nt_dji',
    name: 'Djibuti',
    code: 'DJI',
    confederation: 'CAF',
    federationCode: 'FDF',
    strength: 59,
    fifaPoints: 915,
    primaryColor: '#38bdf8',
    secondaryColor: '#16a34a',
    textColor: '#0f172a',
    homeStadium: 'El Hadj Hassan Gouled Aptidon (Djibuti)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Djibuti',
  },
  {
    id: 'nt_eri',
    name: 'Eritreia',
    code: 'ERI',
    confederation: 'CAF',
    federationCode: 'ENFF',
    strength: 58,
    fifaPoints: 810,
    primaryColor: '#15803d',
    secondaryColor: '#dc2626',
    textColor: '#ffffff',
    homeStadium: 'Cicero Stadium (Asmara)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Eritreia',
  },
  {
    id: 'nt_som',
    name: 'Somália',
    code: 'SOM',
    confederation: 'CAF',
    federationCode: 'SFF',
    strength: 57,
    fifaPoints: 865,
    primaryColor: '#0284c7',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    homeStadium: 'Mogadishu Stadium',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Somália',
  },
  {
    id: 'nt_sey',
    name: 'Seychelles',
    code: 'SEY',
    confederation: 'CAF',
    federationCode: 'SFF',
    strength: 55,
    fifaPoints: 835,
    primaryColor: '#eab308',
    secondaryColor: '#1d4ed8',
    textColor: '#0f172a',
    homeStadium: 'Stad Linite (Victoria)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Seychelles',
  },
  {
    id: 'nt_zan',
    name: 'Zanzibar',
    code: 'ZAN',
    confederation: 'CAF',
    federationCode: 'ZFF',
    strength: 54,
    fifaPoints: 795,
    primaryColor: '#0284c7',
    secondaryColor: '#15803d',
    textColor: '#ffffff',
    homeStadium: 'Amaan Stadium (Zanzibar)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Zanzibar',
  },
  {
    id: 'nt_reu',
    name: 'Reunião',
    code: 'REU',
    confederation: 'CAF',
    federationCode: 'LRF',
    strength: 53,
    fifaPoints: 785,
    primaryColor: '#1d4ed8',
    secondaryColor: '#ef4444',
    textColor: '#ffffff',
    homeStadium: 'Stade Paul-Julius-Bénard (Saint-Paul)',
    minReputationToCoach: 15,
    worldCupTitles: 0,
    continentalTitles: 0,
    countryMatch: 'Reunião',
  },
];

// Seleções associadas da CAF que disputam as Eliminatórias da Copa Africana (56 seleções),
// mas não disputam as Eliminatórias da Copa do Mundo FIFA (54 seleções).
export const CAF_WCQ_EXCLUDED_IDS = new Set<string>(['nt_zan', 'nt_reu']);
export const CAF_2028_COHOSTS = ['nt_uga', 'nt_tan', 'nt_ken'] as const;

export const NATIONAL_TEAM_BY_ID: Record<string, NationalTeamProfile> = Object.fromEntries(
  NATIONAL_TEAMS_CATALOG.map((t) => [t.id, t])
);

export function getNationalTeamById(id?: string | null): NationalTeamProfile {
  if (!id) return NATIONAL_TEAM_BY_ID['nt_bra'];
  return NATIONAL_TEAM_BY_ID[id] || NATIONAL_TEAM_BY_ID['nt_bra'];
}

export interface ResolvedNationalPlayer {
  id: string;
  name: string;
  position: Position;
  detailedRole: DetailedRole;
  overall: number;
  age: number;
  clubId?: string;
  clubShortName: string;
  clubColors?: { primary: string; text: string };
  marketValue: number;
  goalsSeason: number;
  assistsSeason: number;
  caps: number;
  internationalGoals: number;
  isUserClubPlayer: boolean;
  isVirtual: boolean;
}

const OVERSEAS_KEY_STARS: Record<
  string,
  { name: string; role: DetailedRole; ovr: number; age: number; club: string }[]
> = {
  nt_bra: [
    { name: 'Alisson Becker', role: 'GOL', ovr: 89, age: 33, club: 'Liverpool' },
    { name: 'Ederson Moraes', role: 'GOL', ovr: 87, age: 32, club: 'Man. City' },
    { name: 'Marquinhos', role: 'ZAG', ovr: 87, age: 31, club: 'PSG' },
    { name: 'Gabriel Magalhães', role: 'ZAG', ovr: 87, age: 28, club: 'Arsenal' },
    { name: 'Éder Militão', role: 'ZAG', ovr: 86, age: 28, club: 'Real Madrid' },
    { name: 'Vanderson', role: 'LAT', ovr: 82, age: 24, club: 'Monaco' },
    { name: 'Bruno Guimarães', role: 'VOL', ovr: 86, age: 28, club: 'Newcastle' },
    { name: 'Lucas Paquetá', role: 'MEI', ovr: 83, age: 28, club: 'West Ham' },
    { name: 'Vinícius Júnior', role: 'ATA', ovr: 91, age: 25, club: 'Real Madrid' },
    { name: 'Raphinha', role: 'ATA', ovr: 89, age: 29, club: 'Barcelona' },
    { name: 'Rodrygo Goes', role: 'ATA', ovr: 87, age: 25, club: 'Real Madrid' },
    { name: 'Endrick', role: 'ATA', ovr: 83, age: 19, club: 'Real Madrid' },
  ],
  nt_arg: [
    { name: 'Emiliano Martínez', role: 'GOL', ovr: 88, age: 33, club: 'Aston Villa' },
    { name: 'Cristian Romero', role: 'ZAG', ovr: 87, age: 27, club: 'Tottenham' },
    { name: 'Lisandro Martínez', role: 'ZAG', ovr: 85, age: 28, club: 'Man. United' },
    { name: 'Nahuel Molina', role: 'LAT', ovr: 83, age: 27, club: 'Atlético Madrid' },
    { name: 'Alexis Mac Allister', role: 'MEI', ovr: 87, age: 27, club: 'Liverpool' },
    { name: 'Enzo Fernández', role: 'VOL', ovr: 85, age: 25, club: 'Chelsea' },
    { name: 'Rodrigo De Paul', role: 'VOL', ovr: 85, age: 31, club: 'Atlético Madrid' },
    { name: 'Lionel Messi', role: 'ATA', ovr: 89, age: 38, club: 'Inter Miami' },
    { name: 'Lautaro Martínez', role: 'ATA', ovr: 90, age: 28, club: 'Inter de Milão' },
    { name: 'Julián Álvarez', role: 'ATA', ovr: 87, age: 26, club: 'Atlético Madrid' },
  ],
  nt_uru: [
    { name: 'Sergio Rochet', role: 'GOL', ovr: 81, age: 32, club: 'Internacional' },
    { name: 'Ronald Araújo', role: 'ZAG', ovr: 86, age: 27, club: 'Barcelona' },
    { name: 'José María Giménez', role: 'ZAG', ovr: 84, age: 31, club: 'Atlético Madrid' },
    { name: 'Federico Valverde', role: 'VOL', ovr: 89, age: 27, club: 'Real Madrid' },
    { name: 'Manuel Ugarte', role: 'VOL', ovr: 83, age: 24, club: 'Man. United' },
    { name: 'Rodrigo Bentancur', role: 'MEI', ovr: 83, age: 28, club: 'Tottenham' },
    { name: 'Darwin Núñez', role: 'ATA', ovr: 84, age: 26, club: 'Liverpool' },
  ],
  nt_col: [
    { name: 'Camilo Vargas', role: 'GOL', ovr: 81, age: 36, club: 'Atlas' },
    { name: 'Davinson Sánchez', role: 'ZAG', ovr: 83, age: 29, club: 'Galatasaray' },
    { name: 'Daniel Muñoz', role: 'LAT', ovr: 83, age: 29, club: 'Crystal Palace' },
    { name: 'Jefferson Lerma', role: 'VOL', ovr: 81, age: 31, club: 'Crystal Palace' },
    { name: 'James Rodríguez', role: 'MEI', ovr: 84, age: 34, club: 'León' },
    { name: 'Luis Díaz', role: 'ATA', ovr: 87, age: 29, club: 'Liverpool' },
    { name: 'Jhon Durán', role: 'ATA', ovr: 82, age: 22, club: 'Al-Nassr' },
  ],
  nt_equ: [
    { name: 'Piero Hincapié', role: 'ZAG', ovr: 85, age: 24, club: 'Bayer Leverkusen' },
    { name: 'Willian Pacho', role: 'ZAG', ovr: 84, age: 24, club: 'PSG' },
    { name: 'Pervis Estupiñán', role: 'LAT', ovr: 82, age: 28, club: 'Brighton' },
    { name: 'Moisés Caicedo', role: 'VOL', ovr: 86, age: 24, club: 'Chelsea' },
    { name: 'Enner Valencia', role: 'ATA', ovr: 80, age: 36, club: 'Internacional' },
  ],
  nt_fra: [
    { name: 'Mike Maignan', role: 'GOL', ovr: 88, age: 30, club: 'Milan' },
    { name: 'William Saliba', role: 'ZAG', ovr: 88, age: 25, club: 'Arsenal' },
    { name: 'Jules Koundé', role: 'LAT', ovr: 86, age: 27, club: 'Barcelona' },
    { name: 'Theo Hernández', role: 'LAT', ovr: 86, age: 28, club: 'Milan' },
    { name: 'Aurélien Tchouaméni', role: 'VOL', ovr: 86, age: 26, club: 'Real Madrid' },
    { name: 'Eduardo Camavinga', role: 'VOL', ovr: 85, age: 23, club: 'Real Madrid' },
    { name: 'Michael Olise', role: 'MEI', ovr: 86, age: 24, club: 'Bayern' },
    { name: 'Kylian Mbappé', role: 'ATA', ovr: 92, age: 27, club: 'Real Madrid' },
    { name: 'Ousmane Dembélé', role: 'ATA', ovr: 87, age: 28, club: 'PSG' },
  ],
  nt_esp: [
    { name: 'Unai Simón', role: 'GOL', ovr: 86, age: 28, club: 'Athletic Bilbao' },
    { name: 'Dani Carvajal', role: 'LAT', ovr: 86, age: 34, club: 'Real Madrid' },
    { name: 'Pau Cubarsí', role: 'ZAG', ovr: 84, age: 19, club: 'Barcelona' },
    { name: 'Rodri Hernández', role: 'VOL', ovr: 91, age: 29, club: 'Man. City' },
    { name: 'Pedri González', role: 'MEI', ovr: 88, age: 23, club: 'Barcelona' },
    { name: 'Fabián Ruiz', role: 'MEI', ovr: 85, age: 29, club: 'PSG' },
    { name: 'Lamine Yamal', role: 'ATA', ovr: 90, age: 18, club: 'Barcelona' },
    { name: 'Nico Williams', role: 'ATA', ovr: 86, age: 23, club: 'Athletic Bilbao' },
  ],
  nt_ing: [
    { name: 'Jordan Pickford', role: 'GOL', ovr: 84, age: 32, club: 'Everton' },
    { name: 'John Stones', role: 'ZAG', ovr: 85, age: 31, club: 'Man. City' },
    { name: 'Trent Alexander-Arnold', role: 'LAT', ovr: 87, age: 27, club: 'Real Madrid' },
    { name: 'Declan Rice', role: 'VOL', ovr: 88, age: 27, club: 'Arsenal' },
    { name: 'Jude Bellingham', role: 'MEI', ovr: 90, age: 22, club: 'Real Madrid' },
    { name: 'Cole Palmer', role: 'MEI', ovr: 87, age: 23, club: 'Chelsea' },
    { name: 'Bukayo Saka', role: 'ATA', ovr: 88, age: 24, club: 'Arsenal' },
    { name: 'Harry Kane', role: 'ATA', ovr: 90, age: 32, club: 'Bayern' },
  ],
  nt_por: [
    { name: 'Diogo Costa', role: 'GOL', ovr: 86, age: 26, club: 'Porto' },
    { name: 'Rúben Dias', role: 'ZAG', ovr: 88, age: 28, club: 'Man. City' },
    { name: 'Nuno Mendes', role: 'LAT', ovr: 86, age: 23, club: 'PSG' },
    { name: 'Vitinha', role: 'VOL', ovr: 87, age: 26, club: 'PSG' },
    { name: 'Bruno Fernandes', role: 'MEI', ovr: 88, age: 31, club: 'Man. United' },
    { name: 'Bernardo Silva', role: 'MEI', ovr: 87, age: 31, club: 'Man. City' },
    { name: 'Rafael Leão', role: 'ATA', ovr: 86, age: 26, club: 'Milan' },
    { name: 'Cristiano Ronaldo', role: 'ATA', ovr: 85, age: 41, club: 'Al-Nassr' },
  ],
  nt_ale: [
    { name: 'Marc-André ter Stegen', role: 'GOL', ovr: 87, age: 33, club: 'Barcelona' },
    { name: 'Antonio Rüdiger', role: 'ZAG', ovr: 88, age: 33, club: 'Real Madrid' },
    { name: 'Joshua Kimmich', role: 'LAT', ovr: 87, age: 31, club: 'Bayern' },
    { name: 'Jamal Musiala', role: 'MEI', ovr: 89, age: 23, club: 'Bayern' },
    { name: 'Florian Wirtz', role: 'MEI', ovr: 89, age: 22, club: 'Bayer Leverkusen' },
    { name: 'Kai Havertz', role: 'ATA', ovr: 85, age: 26, club: 'Arsenal' },
  ],
  nt_nor: [
    { name: 'Erling Haaland', role: 'ATA', ovr: 91, age: 25, club: 'Man. City' },
    { name: 'Martin Ødegaard', role: 'MEI', ovr: 88, age: 27, club: 'Arsenal' },
    { name: 'Alexander Sørloth', role: 'ATA', ovr: 82, age: 30, club: 'Atlético Madrid' },
    { name: 'Julian Ryerson', role: 'LAT', ovr: 80, age: 28, club: 'Borussia Dortmund' },
    { name: 'Antonio Nusa', role: 'ATA', ovr: 80, age: 21, club: 'RB Leipzig' },
  ],
  nt_sue: [
    { name: 'Viktor Gyökeres', role: 'ATA', ovr: 87, age: 27, club: 'Sporting' },
    { name: 'Alexander Isak', role: 'ATA', ovr: 87, age: 26, club: 'Newcastle' },
    { name: 'Dejan Kulusevski', role: 'MEI', ovr: 84, age: 26, club: 'Tottenham' },
    { name: 'Anthony Elanga', role: 'ATA', ovr: 80, age: 24, club: 'Nottingham Forest' },
    { name: 'Hugo Larsson', role: 'MEI', ovr: 80, age: 21, club: 'Eintracht Frankfurt' },
  ],
  nt_esc: [
    { name: 'Andrew Robertson', role: 'LAT', ovr: 84, age: 32, club: 'Liverpool' },
    { name: 'Scott McTominay', role: 'MEI', ovr: 83, age: 29, club: 'Napoli' },
    { name: 'John McGinn', role: 'MEI', ovr: 82, age: 31, club: 'Aston Villa' },
    { name: 'Billy Gilmour', role: 'MEI', ovr: 80, age: 25, club: 'Napoli' },
    { name: 'Che Adams', role: 'ATA', ovr: 78, age: 29, club: 'Torino' },
  ],
  nt_tch: [
    { name: 'Tomáš Souček', role: 'VOL', ovr: 82, age: 31, club: 'West Ham' },
    { name: 'Patrik Schick', role: 'ATA', ovr: 82, age: 30, club: 'Bayer Leverkusen' },
    { name: 'Vladimír Coufal', role: 'LAT', ovr: 79, age: 33, club: 'West Ham' },
    { name: 'Adam Hložek', role: 'ATA', ovr: 79, age: 23, club: 'Hoffenheim' },
  ],
  nt_bos: [
    { name: 'Edin Džeko', role: 'ATA', ovr: 81, age: 40, club: 'Fenerbahçe' },
    { name: 'Sead Kolašinac', role: 'ZAG', ovr: 80, age: 32, club: 'Atalanta' },
    { name: 'Ermedin Demirović', role: 'ATA', ovr: 80, age: 28, club: 'VfB Stuttgart' },
    { name: 'Amar Dedić', role: 'LAT', ovr: 79, age: 23, club: 'RB Salzburg' },
  ],
  nt_rdc: [
    { name: 'Yoane Wissa', role: 'ATA', ovr: 81, age: 29, club: 'Brentford' },
    { name: 'Chancel Mbemba', role: 'ZAG', ovr: 80, age: 31, club: 'Olympique de Marseille' },
    { name: 'Simon Banza', role: 'ATA', ovr: 79, age: 29, club: 'Trabzonspor' },
    { name: 'Arthur Masuaku', role: 'LAT', ovr: 77, age: 32, club: 'Beşiktaş' },
  ],
  nt_tun: [
    { name: 'Ellyes Skhiri', role: 'VOL', ovr: 81, age: 31, club: 'Eintracht Frankfurt' },
    { name: 'Hannibal Mejbri', role: 'MEI', ovr: 76, age: 23, club: 'Burnley' },
    { name: 'Aïssa Laïdouni', role: 'VOL', ovr: 77, age: 29, club: 'Al-Wakrah' },
    { name: 'Montassar Talbi', role: 'ZAG', ovr: 77, age: 28, club: 'Lorient' },
  ],
  nt_cab: [
    { name: 'Logan Costa', role: 'ZAG', ovr: 78, age: 25, club: 'Villarreal' },
    { name: 'Jovane Cabral', role: 'ATA', ovr: 76, age: 27, club: 'Estrela da Amadora' },
    { name: 'Bebé', role: 'ATA', ovr: 75, age: 35, club: 'Racing Ferrol' },
  ],
  nt_afs: [
    { name: 'Ronwen Williams', role: 'GOL', ovr: 79, age: 34, club: 'Mamelodi Sundowns' },
    { name: 'Percy Tau', role: 'ATA', ovr: 77, age: 32, club: 'Al-Ahly' },
    { name: 'Lyle Foster', role: 'ATA', ovr: 78, age: 25, club: 'Burnley' },
    { name: 'Teboho Mokoena', role: 'VOL', ovr: 78, age: 29, club: 'Mamelodi Sundowns' },
  ],
  nt_cur: [
    { name: 'Juninho Bacuna', role: 'MEI', ovr: 75, age: 28, club: 'Al-Wehda' },
    { name: 'Leandro Bacuna', role: 'VOL', ovr: 74, age: 34, club: 'Bandırmaspor' },
    { name: 'Eloy Room', role: 'GOL', ovr: 74, age: 37, club: 'Cercle Brugge' },
  ],
  nt_hai: [
    { name: 'Frantzdy Pierrot', role: 'ATA', ovr: 77, age: 31, club: 'AEK Atenas' },
    { name: 'Duckens Nazon', role: 'ATA', ovr: 76, age: 32, club: 'Kayserispor' },
    { name: 'Danley Jean Jacques', role: 'VOL', ovr: 75, age: 25, club: 'Philadelphia Union' },
  ],
  nt_irq: [
    { name: 'Ali Jasim', role: 'ATA', ovr: 76, age: 22, club: 'Como' },
    { name: 'Aymen Hussein', role: 'ATA', ovr: 77, age: 30, club: 'Al-Khor' },
    { name: 'Zidane Iqbal', role: 'MEI', ovr: 75, age: 23, club: 'Utrecht' },
  ],
  nt_jor: [
    { name: 'Mousa Al-Tamari', role: 'ATA', ovr: 80, age: 29, club: 'Montpellier' },
    { name: 'Yazan Al-Naimat', role: 'ATA', ovr: 77, age: 27, club: 'Al-Arabi' },
  ],
  nt_gre: [
    { name: 'Odysseas Vlachodimos', role: 'GOL', ovr: 80, age: 32, club: 'Newcastle' },
    { name: 'Konstantinos Mavropanos', role: 'ZAG', ovr: 81, age: 28, club: 'West Ham' },
    { name: 'Kostas Tsimikas', role: 'LAT', ovr: 81, age: 29, club: 'Liverpool' },
    { name: 'Vangelis Pavlidis', role: 'ATA', ovr: 83, age: 27, club: 'Benfica' },
  ],
  nt_hun: [
    { name: 'Péter Gulácsi', role: 'GOL', ovr: 81, age: 35, club: 'RB Leipzig' },
    { name: 'Willi Orbán', role: 'ZAG', ovr: 82, age: 33, club: 'RB Leipzig' },
    { name: 'Milos Kerkez', role: 'LAT', ovr: 81, age: 22, club: 'Bournemouth' },
    { name: 'Dominik Szoboszlai', role: 'MEI', ovr: 86, age: 25, club: 'Liverpool' },
  ],
  nt_rom: [
    { name: 'Radu Drăgușin', role: 'ZAG', ovr: 81, age: 24, club: 'Tottenham' },
    { name: 'Nicolae Stanciu', role: 'MEI', ovr: 79, age: 33, club: 'Damac' },
    { name: 'Dennis Man', role: 'ATA', ovr: 80, age: 27, club: 'Parma' },
  ],
  nt_gal: [
    { name: 'Brennan Johnson', role: 'ATA', ovr: 81, age: 25, club: 'Tottenham' },
    { name: 'Ethan Ampadu', role: 'VOL', ovr: 79, age: 25, club: 'Leeds United' },
    { name: 'Harry Wilson', role: 'MEI', ovr: 79, age: 29, club: 'Fulham' },
    { name: 'Neco Williams', role: 'LAT', ovr: 78, age: 25, club: 'Nottingham Forest' },
  ],
  nt_svn: [
    { name: 'Jan Oblak', role: 'GOL', ovr: 88, age: 33, club: 'Atlético Madrid' },
    { name: 'Benjamin Šeško', role: 'ATA', ovr: 84, age: 23, club: 'Man. United' },
    { name: 'Jaka Bijol', role: 'ZAG', ovr: 80, age: 27, club: 'Udinese' },
  ],
  nt_geo: [
    { name: 'Khvicha Kvaratskhelia', role: 'ATA', ovr: 87, age: 25, club: 'PSG' },
    { name: 'Giorgi Mamardashvili', role: 'GOL', ovr: 85, age: 25, club: 'Liverpool' },
    { name: 'Georges Mikautadze', role: 'ATA', ovr: 80, age: 25, club: 'Lyon' },
  ],
  nt_svk: [
    { name: 'Milan Škriniar', role: 'ZAG', ovr: 83, age: 31, club: 'Fenerbahçe' },
    { name: 'Stanislav Lobotka', role: 'VOL', ovr: 84, age: 31, club: 'Napoli' },
    { name: 'Dávid Hancko', role: 'ZAG', ovr: 83, age: 28, club: 'Atlético Madrid' },
  ],
  nt_irl: [
    { name: 'Caoimhín Kelleher', role: 'GOL', ovr: 81, age: 27, club: 'Liverpool' },
    { name: 'Nathan Collins', role: 'ZAG', ovr: 79, age: 25, club: 'Brentford' },
    { name: 'Evan Ferguson', role: 'ATA', ovr: 79, age: 21, club: 'Brighton' },
  ],
  nt_nir: [
    { name: 'Conor Bradley', role: 'LAT', ovr: 80, age: 23, club: 'Liverpool' },
    { name: 'Shea Charles', role: 'VOL', ovr: 76, age: 22, club: 'Southampton' },
  ],
  nt_kos: [
    { name: 'Amir Rrahmani', role: 'ZAG', ovr: 82, age: 32, club: 'Napoli' },
    { name: 'Edon Zhegrova', role: 'ATA', ovr: 81, age: 27, club: 'Lille' },
    { name: 'Vedat Muriqi', role: 'ATA', ovr: 78, age: 32, club: 'Mallorca' },
  ],
  nt_isr: [
    { name: 'Oscar Gloukh', role: 'MEI', ovr: 81, age: 22, club: 'Ajax' },
    { name: 'Manor Solomon', role: 'ATA', ovr: 78, age: 26, club: 'Tottenham' },
  ],
  nt_alb: [
    { name: 'Berat Djimsiti', role: 'ZAG', ovr: 80, age: 33, club: 'Atalanta' },
    { name: 'Kristjan Asllani', role: 'VOL', ovr: 78, age: 24, club: 'Inter de Milão' },
    { name: 'Armando Broja', role: 'ATA', ovr: 77, age: 24, club: 'Everton' },
  ],
  nt_fin: [
    { name: 'Lukáš Hrádecký', role: 'GOL', ovr: 81, age: 36, club: 'Bayer Leverkusen' },
    { name: 'Joel Pohjanpalo', role: 'ATA', ovr: 76, age: 31, club: 'Venezia' },
  ],
  nt_arm: [
    { name: 'Henrikh Mkhitaryan', role: 'MEI', ovr: 82, age: 37, club: 'Inter de Milão' },
    { name: 'Eduard Spertsyan', role: 'MEI', ovr: 78, age: 26, club: 'Krasnodar' },
  ],
  nt_mdn: [
    { name: 'Eljif Elmas', role: 'MEI', ovr: 79, age: 26, club: 'Torino' },
    { name: 'Stole Dimitrievski', role: 'GOL', ovr: 77, age: 32, club: 'Valencia' },
  ],
  nt_mar: [
    { name: 'Yassine Bounou', role: 'GOL', ovr: 84, age: 35, club: 'Al-Hilal' },
    { name: 'Achraf Hakimi', role: 'LAT', ovr: 89, age: 27, club: 'PSG' },
    { name: 'Nayef Aguerd', role: 'ZAG', ovr: 82, age: 30, club: 'Real Sociedad' },
    { name: 'Sofyan Amrabat', role: 'VOL', ovr: 81, age: 29, club: 'Fenerbahçe' },
    { name: 'Brahim Díaz', role: 'MEI', ovr: 85, age: 26, club: 'Real Madrid' },
    { name: 'Youssef En-Nesyri', role: 'ATA', ovr: 82, age: 29, club: 'Fenerbahçe' },
  ],
  nt_sen: [
    { name: 'Édouard Mendy', role: 'GOL', ovr: 82, age: 34, club: 'Al-Ahli' },
    { name: 'Kalidou Koulibaly', role: 'ZAG', ovr: 83, age: 34, club: 'Al-Hilal' },
    { name: 'Pape Matar Sarr', role: 'VOL', ovr: 82, age: 23, club: 'Tottenham' },
    { name: 'Iliman Ndiaye', role: 'MEI', ovr: 80, age: 26, club: 'Everton' },
    { name: 'Sadio Mané', role: 'ATA', ovr: 84, age: 34, club: 'Al-Nassr' },
    { name: 'Nicolas Jackson', role: 'ATA', ovr: 83, age: 24, club: 'Chelsea' },
  ],
  nt_nig: [
    { name: 'Calvin Bassey', role: 'ZAG', ovr: 80, age: 26, club: 'Fulham' },
    { name: 'Wilfred Ndidi', role: 'VOL', ovr: 80, age: 29, club: 'Leicester' },
    { name: 'Alex Iwobi', role: 'MEI', ovr: 80, age: 30, club: 'Fulham' },
    { name: 'Ademola Lookman', role: 'ATA', ovr: 86, age: 28, club: 'Atalanta' },
    { name: 'Victor Osimhen', role: 'ATA', ovr: 88, age: 27, club: 'Galatasaray' },
    { name: 'Victor Boniface', role: 'ATA', ovr: 83, age: 25, club: 'Bayer Leverkusen' },
  ],
  nt_civ: [
    { name: 'Evan Ndicka', role: 'ZAG', ovr: 82, age: 26, club: 'Roma' },
    { name: 'Odilon Kossounou', role: 'ZAG', ovr: 81, age: 25, club: 'Atalanta' },
    { name: 'Franck Kessié', role: 'VOL', ovr: 82, age: 29, club: 'Al-Ahli' },
    { name: 'Seko Fofana', role: 'MEI', ovr: 80, age: 31, club: 'Rennes' },
    { name: 'Simon Adingra', role: 'ATA', ovr: 80, age: 24, club: 'Brighton' },
    { name: 'Amad Diallo', role: 'ATA', ovr: 82, age: 23, club: 'Man. United' },
  ],
  nt_egi: [
    { name: 'Mohamed El Shenawy', role: 'GOL', ovr: 79, age: 37, club: 'Al-Ahly' },
    { name: 'Mohamed Abdelmonem', role: 'ZAG', ovr: 78, age: 27, club: 'Nice' },
    { name: 'Emam Ashour', role: 'MEI', ovr: 79, age: 28, club: 'Al-Ahly' },
    { name: 'Omar Marmoush', role: 'ATA', ovr: 86, age: 27, club: 'Man. City' },
    { name: 'Mohamed Salah', role: 'ATA', ovr: 89, age: 33, club: 'Liverpool' },
  ],
  nt_alg: [
    { name: 'Rayan Aït-Nouri', role: 'LAT', ovr: 82, age: 24, club: 'Wolverhampton' },
    { name: 'Ismaël Bennacer', role: 'VOL', ovr: 82, age: 28, club: 'Olympique de Marseille' },
    { name: 'Houssem Aouar', role: 'MEI', ovr: 80, age: 27, club: 'Al-Ittihad' },
    { name: 'Riyad Mahrez', role: 'ATA', ovr: 83, age: 35, club: 'Al-Ahli' },
    { name: 'Amine Gouiri', role: 'ATA', ovr: 81, age: 26, club: 'Olympique de Marseille' },
  ],
  nt_cam: [
    { name: 'André Onana', role: 'GOL', ovr: 83, age: 30, club: 'Man. United' },
    { name: 'André-Frank Zambo Anguissa', role: 'VOL', ovr: 83, age: 30, club: 'Napoli' },
    { name: 'Carlos Baleba', role: 'VOL', ovr: 81, age: 22, club: 'Brighton' },
    { name: 'Bryan Mbeumo', role: 'ATA', ovr: 84, age: 26, club: 'Brentford' },
  ],
  nt_gan: [
    { name: 'Mohammed Salisu', role: 'ZAG', ovr: 78, age: 27, club: 'Monaco' },
    { name: 'Tariq Lamptey', role: 'LAT', ovr: 77, age: 25, club: 'Brighton' },
    { name: 'Thomas Partey', role: 'VOL', ovr: 82, age: 32, club: 'Arsenal' },
    { name: 'Mohammed Kudus', role: 'MEI', ovr: 84, age: 25, club: 'West Ham' },
    { name: 'Antoine Semenyo', role: 'ATA', ovr: 82, age: 26, club: 'Bournemouth' },
    { name: 'Iñaki Williams', role: 'ATA', ovr: 82, age: 31, club: 'Athletic Bilbao' },
  ],
  nt_mli: [
    { name: 'Hamari Traoré', role: 'LAT', ovr: 78, age: 34, club: 'Real Sociedad' },
    { name: 'Yves Bissouma', role: 'VOL', ovr: 81, age: 29, club: 'Tottenham' },
    { name: 'Mohamed Camara', role: 'VOL', ovr: 79, age: 26, club: 'Al-Sadd' },
    { name: 'Kamory Doumbia', role: 'MEI', ovr: 77, age: 23, club: 'Brest' },
    { name: 'El Bilal Touré', role: 'ATA', ovr: 78, age: 24, club: 'VfB Stuttgart' },
  ],
  nt_bfa: [
    { name: 'Hervé Koffi', role: 'GOL', ovr: 76, age: 29, club: 'Lens' },
    { name: 'Edmond Tapsoba', role: 'ZAG', ovr: 84, age: 27, club: 'Bayer Leverkusen' },
    { name: 'Issa Kaboré', role: 'LAT', ovr: 76, age: 25, club: 'Werder Bremen' },
    { name: 'Dango Ouattara', role: 'ATA', ovr: 79, age: 24, club: 'Bournemouth' },
    { name: 'Bertrand Traoré', role: 'ATA', ovr: 77, age: 30, club: 'Ajax' },
  ],
  nt_gui: [
    { name: 'Issiaga Sylla', role: 'LAT', ovr: 75, age: 32, club: 'Montpellier' },
    { name: 'Naby Keïta', role: 'MEI', ovr: 77, age: 31, club: 'Ferencváros' },
    { name: 'Abdoulaye Touré', role: 'VOL', ovr: 76, age: 32, club: 'Le Havre' },
    { name: 'Serhou Guirassy', role: 'ATA', ovr: 86, age: 30, club: 'Borussia Dortmund' },
  ],
  nt_gab: [
    { name: 'Bruno Ecuele Manga', role: 'ZAG', ovr: 74, age: 37, club: 'Paris 13' },
    { name: 'Mario Lemina', role: 'VOL', ovr: 80, age: 32, club: 'Galatasaray' },
    { name: 'Guélor Kanga', role: 'MEI', ovr: 76, age: 35, club: 'Estrela Vermelha' },
    { name: 'Denis Bouanga', role: 'ATA', ovr: 80, age: 31, club: 'LAFC' },
    { name: 'Pierre-Emerick Aubameyang', role: 'ATA', ovr: 82, age: 36, club: 'Al-Qadsiah' },
  ],
  nt_ang: [
    { name: 'Clinton Mata', role: 'LAT', ovr: 78, age: 33, club: 'Lyon' },
    { name: 'David Carmo', role: 'ZAG', ovr: 78, age: 26, club: 'Olympiacos' },
    { name: 'Show', role: 'VOL', ovr: 75, age: 27, club: 'FC Dallas' },
    { name: 'Zito Luvumbo', role: 'ATA', ovr: 77, age: 24, club: 'Cagliari' },
    { name: 'Gelson Dala', role: 'ATA', ovr: 77, age: 29, club: 'Al-Wakrah' },
    { name: 'Mabululu', role: 'ATA', ovr: 76, age: 33, club: 'Al-Ahli' },
  ],
  nt_zam: [
    { name: 'Stoppila Sunzu', role: 'ZAG', ovr: 74, age: 36, club: 'Changchun' },
    { name: 'Kings Kangwa', role: 'MEI', ovr: 75, age: 27, club: 'Hapoel Be’er Sheva' },
    { name: 'Fashion Sakala', role: 'ATA', ovr: 77, age: 29, club: 'Al-Fayha' },
    { name: 'Patson Daka', role: 'ATA', ovr: 78, age: 27, club: 'Leicester' },
  ],
  nt_moz: [
    { name: 'Reinildo Mandava', role: 'LAT', ovr: 80, age: 32, club: 'Atlético Madrid' },
    { name: 'Mexer', role: 'ZAG', ovr: 74, age: 37, club: 'Bandırmaspor' },
    { name: 'Geny Catamo', role: 'ATA', ovr: 78, age: 25, club: 'Sporting' },
  ],
  nt_gam: [
    { name: 'Omar Colley', role: 'ZAG', ovr: 75, age: 33, club: 'PAOK' },
    { name: 'Yankuba Minteh', role: 'ATA', ovr: 79, age: 21, club: 'Brighton' },
    { name: 'Musa Barrow', role: 'ATA', ovr: 76, age: 27, club: 'Al-Taawoun' },
  ],
  nt_tog: [
    { name: 'Djené Dakonam', role: 'ZAG', ovr: 77, age: 34, club: 'Getafe' },
    { name: 'Kodjo Fo-Doh Laba', role: 'ATA', ovr: 76, age: 34, club: 'Al-Ain' },
  ],
  nt_geq: [
    { name: 'Saúl Coco', role: 'ZAG', ovr: 77, age: 27, club: 'Torino' },
    { name: 'Pedro Obiang', role: 'VOL', ovr: 75, age: 34, club: 'Sassuolo' },
    { name: 'Emilio Nsue', role: 'ATA', ovr: 75, age: 36, club: 'Intercity' },
  ],
  nt_nzl: [
    { name: 'Alex Paulsen', role: 'GOL', ovr: 76, age: 23, club: 'Auckland FC' },
    { name: 'Max Crocombe', role: 'GOL', ovr: 73, age: 32, club: 'Burton Albion' },
    { name: 'Michael Boxall', role: 'ZAG', ovr: 75, age: 37, club: 'Minnesota Utd' },
    { name: 'Nando Pijnaker', role: 'ZAG', ovr: 74, age: 27, club: 'Auckland FC' },
    { name: 'Tyler Bindon', role: 'ZAG', ovr: 76, age: 21, club: 'Reading' },
    { name: 'Liberato Cacace', role: 'LAT', ovr: 78, age: 25, club: 'Empoli' },
    { name: 'Tim Payne', role: 'LAT', ovr: 73, age: 32, club: 'Wellington Phoenix' },
    { name: 'Marko Stamenić', role: 'VOL', ovr: 78, age: 24, club: 'Olympiacos' },
    { name: 'Joe Bell', role: 'VOL', ovr: 75, age: 26, club: 'Viking FK' },
    { name: 'Matthew Garbett', role: 'MEI', ovr: 76, age: 24, club: 'NAC Breda' },
    { name: 'Sarpreet Singh', role: 'MEI', ovr: 75, age: 27, club: 'União de Leiria' },
    { name: 'Callum McCowatt', role: 'ATA', ovr: 75, age: 26, club: 'Silkeborg' },
    { name: 'Elijah Just', role: 'ATA', ovr: 75, age: 25, club: 'St. Pölten' },
    { name: 'Ben Waine', role: 'ATA', ovr: 74, age: 24, club: 'Mansfield Town' },
    { name: 'Chris Wood', role: 'ATA', ovr: 82, age: 34, club: 'Nottingham Forest' },
  ],
  nt_fij: [
    { name: 'Jerome Narayan', role: 'GOL', ovr: 68, age: 26, club: 'Rewa FC' },
    { name: 'Akuila Mateisuva', role: 'GOL', ovr: 67, age: 34, club: 'Labasa FC' },
    { name: 'Gabriele Matanisiga', role: 'ZAG', ovr: 69, age: 30, club: 'Wellington Olympic' },
    { name: 'Filipe Baravilala', role: 'ZAG', ovr: 68, age: 31, club: 'Navua FC' },
    { name: 'Sterling Vasconcellos', role: 'ZAG', ovr: 68, age: 21, club: 'Lautoka FC' },
    { name: 'Mohammed Raheem', role: 'LAT', ovr: 68, age: 22, club: 'Ba FC' },
    { name: 'Scott Wara', role: 'ZAG', ovr: 69, age: 26, club: 'Stalybridge' },
    { name: 'Tevita Waranaivalu', role: 'VOL', ovr: 69, age: 30, club: 'Rewa FC' },
    { name: 'Setareki Hughes', role: 'MEI', ovr: 70, age: 30, club: 'Rewa FC' },
    { name: 'Thomas Dunn', role: 'MEI', ovr: 69, age: 23, club: 'Navua FC' },
    { name: 'Nabil Begg', role: 'ATA', ovr: 69, age: 22, club: 'Auckland City' },
    { name: 'Roy Krishna', role: 'ATA', ovr: 74, age: 38, club: 'Odisha FC' },
  ],
  nt_tah: [
    { name: 'Teave Teamotuaitau', role: 'GOL', ovr: 68, age: 33, club: 'AS Vénus' },
    { name: 'Moana Pito', role: 'GOL', ovr: 67, age: 26, club: 'AS Tefana' },
    { name: 'Matatia Paama', role: 'ZAG', ovr: 68, age: 33, club: 'AS Pirae' },
    { name: 'Haumau Tanetoa', role: 'ZAG', ovr: 67, age: 21, club: 'AS Vénus' },
    { name: 'Kévin Barbe', role: 'LAT', ovr: 68, age: 28, club: 'AS Vénus' },
    { name: 'Marama Amau', role: 'LAT', ovr: 67, age: 35, club: 'AS Vénus' },
    { name: 'Pothin Poma', role: 'VOL', ovr: 68, age: 28, club: 'AS Vénus' },
    { name: 'Tauhiti Keck', role: 'MEI', ovr: 69, age: 31, club: 'AS Dragon' },
    { name: 'Benoît Mathon', role: 'MEI', ovr: 69, age: 37, club: 'AS Pirae' },
    { name: 'Roonui Tinirauarii', role: 'ATA', ovr: 70, age: 29, club: 'AS Dragon' },
    { name: 'Teaonui Tehau', role: 'ATA', ovr: 72, age: 33, club: 'AS Vénus' },
    { name: 'Eddy Kaspard', role: 'ATA', ovr: 69, age: 24, club: 'Trélissac' },
  ],
  nt_ncl: [
    { name: 'Rocky Nyikeine', role: 'GOL', ovr: 69, age: 33, club: 'Gaïtcha FCN' },
    { name: 'Mickaël Ulile', role: 'GOL', ovr: 67, age: 28, club: 'AS Magenta' },
    { name: 'Joseph Athale', role: 'ZAG', ovr: 69, age: 30, club: 'Hienghène Sport' },
    { name: 'Fonzy Ranchain', role: 'ZAG', ovr: 68, age: 31, club: 'Hienghène Sport' },
    { name: 'Bernard Iwa', role: 'LAT', ovr: 68, age: 25, club: 'AS Lössi' },
    { name: 'Pierre Bako', role: 'LAT', ovr: 67, age: 24, club: 'Gaïtcha FCN' },
    { name: 'César Zeoula', role: 'MEI', ovr: 70, age: 36, club: 'US Chauvigny' },
    { name: 'Jekob Jeno', role: 'VOL', ovr: 70, age: 25, club: 'Beitar Jerusalem' },
    { name: 'Morgan Mathelon', role: 'MEI', ovr: 68, age: 27, club: 'Tiga Sport' },
    { name: 'Georges Gope-Fenepej', role: 'ATA', ovr: 72, age: 37, club: 'Saint-Pryvé' },
    { name: 'Lues Waya', role: 'ATA', ovr: 69, age: 24, club: 'Tiga Sport' },
    { name: 'Germain Haewegene', role: 'ATA', ovr: 69, age: 30, club: 'AS Magenta' },
  ],
  nt_sol: [
    { name: 'Philip Mango', role: 'GOL', ovr: 67, age: 30, club: 'Central Coast FC' },
    { name: 'Harold Nauania', role: 'GOL', ovr: 65, age: 28, club: 'Waneagu United' },
    { name: 'Javin Wae', role: 'ZAG', ovr: 68, age: 23, club: 'Central Coast FC' },
    { name: 'Leon Kofana', role: 'ZAG', ovr: 67, age: 23, club: 'Auckland City' },
    { name: 'David Supa', role: 'LAT', ovr: 67, age: 24, club: 'Central Coast FC' },
    { name: 'Alick Stanton', role: 'LAT', ovr: 66, age: 27, club: 'Central Coast FC' },
    { name: 'Atkin Kaua', role: 'VOL', ovr: 68, age: 29, club: 'Solomon Warriors' },
    { name: 'William Komasi', role: 'VOL', ovr: 67, age: 25, club: 'Central Coast FC' },
    { name: 'Micah Lea’alafa', role: 'MEI', ovr: 69, age: 34, club: 'FKF Auckland' },
    { name: 'Gagame Feni', role: 'MEI', ovr: 67, age: 33, club: 'Solomon Warriors' },
    { name: 'Raphael Lea’i', role: 'ATA', ovr: 71, age: 22, club: 'Adelaide City' },
    { name: 'John Orobulu', role: 'ATA', ovr: 68, age: 25, club: 'Rewa FC' },
  ],
  nt_png: [
    { name: 'Ronald Warisan', role: 'GOL', ovr: 66, age: 36, club: 'Lae City' },
    { name: 'Dave Tomare', role: 'GOL', ovr: 65, age: 29, club: 'Hekari United' },
    { name: 'Alwin Komolong', role: 'ZAG', ovr: 68, age: 31, club: 'Lions FC' },
    { name: 'Daniel Joe', role: 'ZAG', ovr: 66, age: 35, club: 'Hekari United' },
    { name: 'Felix Komolong', role: 'LAT', ovr: 67, age: 29, club: 'Lae City' },
    { name: 'Godfrey Haro', role: 'LAT', ovr: 65, age: 27, club: 'Hekari United' },
    { name: 'Emmanuel Simon', role: 'VOL', ovr: 67, age: 33, club: 'Lae City' },
    { name: 'Yagi Yasasa', role: 'VOL', ovr: 66, age: 25, club: 'Hekari United' },
    { name: 'Tommy Semmy', role: 'MEI', ovr: 68, age: 31, club: 'Melbourne Knights' },
    { name: 'Pala Paul', role: 'MEI', ovr: 66, age: 26, club: 'Gulf Komara' },
    { name: 'Raymond Gunemba', role: 'ATA', ovr: 68, age: 39, club: 'Lae City' },
    { name: 'Ati Kepo', role: 'ATA', ovr: 67, age: 30, club: 'Hekari United' },
  ],
  nt_van: [
    { name: 'Dgen Leo', role: 'GOL', ovr: 66, age: 25, club: 'Classic FC' },
    { name: 'Massing Kalotang', role: 'GOL', ovr: 65, age: 23, club: 'Yatel FC' },
    { name: 'Brian Kaltak', role: 'ZAG', ovr: 71, age: 32, club: 'Central Coast' },
    { name: 'Jared Clark', role: 'ZAG', ovr: 67, age: 28, club: 'Croydon FC' },
    { name: 'Timothy Boulet', role: 'LAT', ovr: 66, age: 27, club: 'Auckland City' },
    { name: 'Kerry Iawak', role: 'LAT', ovr: 65, age: 30, club: 'Ifira Black Bird' },
    { name: 'John Alick', role: 'VOL', ovr: 66, age: 34, club: 'Solomon Warriors' },
    { name: 'Bong Kalo', role: 'MEI', ovr: 67, age: 29, club: 'ABM Galaxy' },
    { name: 'Mitch Cooper', role: 'MEI', ovr: 67, age: 31, club: 'Hume City' },
    { name: 'Alex Saniel', role: 'ATA', ovr: 66, age: 29, club: 'Suva FC' },
    { name: 'Kensi Tangis', role: 'ATA', ovr: 67, age: 36, club: 'ABM Galaxy' },
    { name: 'Jordy Tasip', role: 'ATA', ovr: 66, age: 25, club: 'Auckland City' },
  ],
  nt_sam: [
    { name: 'Joel Bartley', role: 'GOL', ovr: 63, age: 21, club: 'Sydney United' },
    { name: 'Pele Fatu', role: 'GOL', ovr: 61, age: 25, club: 'Vaivase-Tai' },
    { name: 'Luke Salisbury', role: 'ZAG', ovr: 64, age: 21, club: 'Roslyn-Wakari' },
    { name: 'Harry Chote', role: 'ZAG', ovr: 63, age: 26, club: 'Miramar Rangers' },
    { name: 'Andrew Setefano', role: 'LAT', ovr: 62, age: 38, club: 'Lupe o le Soaga' },
    { name: 'Niko Steinmetz', role: 'LAT', ovr: 62, age: 24, club: 'Western Springs' },
    { name: 'Dauntae Mariner', role: 'VOL', ovr: 63, age: 26, club: 'Nelson Suburbs' },
    { name: 'Kaleb De Groot-Green', role: 'VOL', ovr: 62, age: 23, club: 'Christchurch Utd' },
    { name: 'Jarvis Filimalae', role: 'MEI', ovr: 63, age: 22, club: 'Lupe o le Soaga' },
    { name: 'Michael Tumua Leo', role: 'MEI', ovr: 62, age: 23, club: 'Vaipuna SC' },
    { name: 'Pharrell Trainor', role: 'ATA', ovr: 64, age: 19, club: 'Schott Mainz' },
    { name: 'Dylan Vine', role: 'ATA', ovr: 63, age: 22, club: 'Auckland United' },
  ],
  nt_cok: [
    { name: 'Tahiri Elikana', role: 'GOL', ovr: 62, age: 37, club: 'Tupapa Maraerenga' },
    { name: 'Ngereine Maro', role: 'GOL', ovr: 60, age: 21, club: 'Puaikura FC' },
    { name: 'Orin Prattley', role: 'ZAG', ovr: 62, age: 28, club: 'Brooklyn Northern' },
    { name: 'Dwayne Tiputoa', role: 'ZAG', ovr: 61, age: 28, club: 'Tupapa Maraerenga' },
    { name: 'Sunai Joseph', role: 'LAT', ovr: 61, age: 28, club: 'Tupapa Maraerenga' },
    { name: 'Paavo Mustonen', role: 'LAT', ovr: 60, age: 36, club: 'Tupapa Maraerenga' },
    { name: 'Grover Harmon', role: 'VOL', ovr: 62, age: 36, club: 'Tupapa Maraerenga' },
    { name: 'Lee Harmon Jr.', role: 'VOL', ovr: 61, age: 24, club: 'Tupapa Maraerenga' },
    { name: 'Tremaine Rimene-Albrett', role: 'MEI', ovr: 62, age: 22, club: 'Douglas Villa' },
    { name: 'Taylor Saghabi', role: 'ATA', ovr: 63, age: 35, club: 'Tupapa Maraerenga' },
    { name: 'Maro Bonsu-Maro', role: 'ATA', ovr: 62, age: 29, club: 'Manukau United' },
    { name: 'Siaosi Kaufononga', role: 'ATA', ovr: 61, age: 31, club: 'Tupapa Maraerenga' },
  ],
  nt_ton: [
    { name: 'Nimilote Moala', role: 'GOL', ovr: 61, age: 21, club: 'Veitongo FC' },
    { name: 'Semisi Otukolo', role: 'GOL', ovr: 59, age: 26, club: 'Lotohaʻapai Utd' },
    { name: 'Sione Uhatahi', role: 'ZAG', ovr: 61, age: 37, club: 'Veitongo FC' },
    { name: 'Petelo Naniseni', role: 'ZAG', ovr: 60, age: 22, club: 'Navutoka FC' },
    { name: 'Kulisitofa Kite', role: 'LAT', ovr: 60, age: 23, club: 'Veitongo FC' },
    { name: 'Viliami Tikoipau', role: 'LAT', ovr: 59, age: 25, club: 'Lotohaʻapai Utd' },
    { name: 'Laulea Taufa', role: 'VOL', ovr: 61, age: 26, club: 'Veitongo FC' },
    { name: 'Christopher Kefu', role: 'VOL', ovr: 60, age: 23, club: 'Veitongo FC' },
    { name: 'Kamaliele Papani', role: 'MEI', ovr: 61, age: 40, club: 'Lotohaʻapai Utd' },
    { name: 'Mohammed Rajani', role: 'MEI', ovr: 61, age: 26, club: 'Manukau United' },
    { name: 'Hemaloto Polovili', role: 'ATA', ovr: 63, age: 28, club: 'Veitongo FC' },
    { name: 'Elias Kendler', role: 'ATA', ovr: 62, age: 23, club: 'Metro FC' },
  ],
  nt_asa: [
    { name: 'Nicky Salapu', role: 'GOL', ovr: 60, age: 45, club: 'PanSa East' },
    { name: 'Matthias Logologo', role: 'GOL', ovr: 59, age: 24, club: 'Pago Youth' },
    { name: 'Jaiyah Saelua', role: 'ZAG', ovr: 60, age: 37, club: 'Ilaoa & Toʻomata' },
    { name: 'Ueli Tualaulelei', role: 'ZAG', ovr: 60, age: 26, club: 'Pago Youth' },
    { name: 'Walter Pati', role: 'LAT', ovr: 60, age: 23, club: 'Pago Youth' },
    { name: 'Puni Samuelu', role: 'LAT', ovr: 59, age: 29, club: 'Pago Youth' },
    { name: 'Roy Ledoux', role: 'VOL', ovr: 61, age: 25, club: 'Pago Youth' },
    { name: 'Takashi Tiumalu', role: 'VOL', ovr: 59, age: 24, club: 'Utulei Youth' },
    { name: 'Kuresa Tagaʻi', role: 'MEI', ovr: 60, age: 25, club: 'Ilaoa & Toʻomata' },
    { name: 'Palauni Tapusoa', role: 'MEI', ovr: 60, age: 29, club: 'Utulei Youth' },
    { name: 'Austin Kaleopa', role: 'ATA', ovr: 61, age: 25, club: 'Utulei Youth' },
    { name: 'Ben Ledoux', role: 'ATA', ovr: 60, age: 22, club: 'Pago Youth' },
  ],
};

const CONFED_NAME_POOLS: Record<
  ConfederationCode,
  { first: string[]; last: string[]; clubs: string[] }
> = {
  CONMEBOL: {
    first: ['Mateo', 'Nicolás', 'Diego', 'Sebastián', 'Lucas', 'Martín', 'Facundo', 'Joaquín', 'Tomás', 'Gonzalo', 'Arturo', 'Brayan'],
    last: ['Rojas', 'Gómez', 'Vargas', 'Mendoza', 'Cáceres', 'Giménez', 'castillo', 'Paredes', 'Medina', 'Herrera', 'Quintero', 'Salazar'],
    clubs: ['River Plate', 'Villarreal', 'Benfica', 'Sporting', 'Bologna', 'Girona', 'Porto', 'Feyenoord'],
  },
  UEFA: {
    first: ['Lukas', 'Marco', 'Stefan', 'Viktor', 'Matteo', 'Jan', 'Oliver', 'Nikola', 'Filip', 'Christian', 'Milan', 'David'],
    last: ['Kovačić', 'Lindholm', 'Novak', 'Berg', 'Kowalski', 'Bauer', 'Rossi', 'Silva', 'Petrov', 'Jansen', 'Yılmaz', 'Shevchenko'],
    clubs: ['Inter de Milão', 'Borussia Dortmund', 'RB Leipzig', 'Napoli', 'Atalanta', 'Benfica', 'Ajax', 'Aston Villa'],
  },
  CONCACAF: {
    first: ['Christian', 'Weston', 'Santiago', 'Jonathan', 'Alphonso', 'Hirving', 'Keylor', 'Adalberto', 'Leon', 'Ricardo', 'Tajon', 'Ismaël'],
    last: ['Pulisic', 'Giménez', 'David', 'Davies', 'Álvarez', 'Carrasquilla', 'Bailey', 'Pepi', 'McKennie', 'Navas', 'Reyna', 'Koné'],
    clubs: ['Milan', 'Feyenoord', 'Lille', 'Bayern', 'Fulham', 'PSV', 'América-MEX', 'LAFC'],
  },
  CAF: {
    first: ['Achraf', 'Mohamed', 'Victor', 'Sadio', 'Franck', 'Riyad', 'André', 'Serhou', 'Nicolas', 'Mohammed', 'Kalidou', 'Youssef'],
    last: ['Hakimi', 'Salah', 'Osimhen', 'Kudus', 'Kessié', 'Onana', 'Brahim', 'Lookman', 'Jackson', 'En-Nesyri', 'Marmoush', 'Sarr'],
    clubs: ['PSG', 'Liverpool', 'Atalanta', 'Man. City', 'Chelsea', 'Monaco', 'Villarreal', 'Galatasaray'],
  },
  AFC: {
    first: ['Takefusa', 'Kaoru', 'Son', 'Mehdi', 'Min-jae', 'Wataru', 'Jackson', 'Akram', 'Salem', 'Eldor', 'Chris', 'Daizen'],
    last: ['Kubo', 'Mitoma', 'Heung-min', 'Taremi', 'Kim', 'Endo', 'Irvine', 'Afif', 'Al-Dawsari', 'Shomurodov', 'Wood', 'Maeda'],
    clubs: ['Real Sociedad', 'Brighton', 'Tottenham', 'Bayern', 'Liverpool', 'Celtic', 'Roma', 'Al-Hilal'],
  },
  OFC: {
    first: ['Liam', 'Sam', 'Oliver', 'Jonty', 'Finn', 'Tevita', 'Manoa', 'Ratu', 'Maui', 'Tama', 'Junior', 'Kaleb'],
    last: ['Walker', 'Surman', 'Sutton', 'Conchie', 'Waqa', 'Ravu', 'Tui', 'Tehau', 'Kaltak', 'Lea’i', 'Komolong', 'Salapu'],
    clubs: ['Auckland FC', 'Wellington Phoenix', 'Auckland City', 'Rewa FC', 'AS Pirae', 'Hienghène Sport', 'Central Coast FC', 'Hekari United'],
  },
};

function roleToPosition(role: DetailedRole): Position {
  if (role === 'GOL') return 'GK';
  if (role === 'ZAG' || role === 'LAT') return 'DF';
  if (role === 'VOL' || role === 'MEI') return 'MF';
  return 'FW';
}

function deterministicHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Generates persistent virtual squad players so every single one of the 48 Seleções
 * has a full 32+ player pool for 26-player call-ups and Observatory scouting.
 */
const OFC_NATION_POOLS: Record<
  string,
  { first: string[]; last: string[]; clubs: string[] }
> = {
  nt_nzl: {
    first: ['Liam', 'Finn', 'Sam', 'Callum', 'Jonty', 'Lachlan', 'Ollie', 'Kosta', 'Storm', 'Dane', 'Logan', 'Riley'],
    last: ['Gillion', 'Surman', 'Sutton', 'Roux', 'Rogerson', 'de Vries', 'Sail', 'Rufer', 'Conchie', 'Howieson', 'Toomey', 'Kelly'],
    clubs: ['Auckland FC', 'Wellington Phoenix', 'Auckland City', 'Wellington Olympic', 'Western Springs'],
  },
  nt_fij: {
    first: ['Sairusi', 'Ratu', 'Etonia', 'Ilisoni', 'Epeli', 'Sitiveni', 'Aporosa', 'Peniame', 'Kishan', 'Anish', 'Samuela', 'Inoke'],
    last: ['Nalaubu', 'Dau', 'Dogalau', 'Logaivau', 'Cavulaik', 'Turagabeci', 'Yada', 'Drova', 'Sami', 'Khem', 'Drudru', 'Tuisawau'],
    clubs: ['Rewa FC', 'Ba FC', 'Labasa FC', 'Lautoka FC', 'Suva FC', 'Navua FC'],
  },
  nt_tah: {
    first: ['Heirauarii', 'Tamatoa', 'Tevaihau', 'Manuarii', 'Raihiti', 'Tetuanui', 'Teriitaumihau', 'Roonui', 'Hauroa', 'Teiki', 'Ariihau', 'Vahirua'],
    last: ['Salem', 'Tetauira', 'Tiatia', 'Shan', 'Autai', 'Tehau', 'Porlier', 'Teriitau', 'Germain', 'Mauri', 'Papaura', 'Tefaatau'],
    clubs: ['AS Pirae', 'AS Vénus', 'AS Dragon', 'AS Tefana', 'AS Central Sport'],
  },
  nt_ncl: {
    first: ['Cédric', 'Willy', 'Jean-Luc', 'Émile', 'Joris', 'Titouan', 'Yorick', 'Joël', 'Jean-Jacques', 'Kévin', 'Roberto', 'Yoann'],
    last: ['Decoire', 'Read', 'Décoiré', 'Wakanumuné', 'Béaruné', 'Ounei', 'Ranchain', 'Katrawa', 'Wadenges', 'Nemia', 'Poatinda', 'Neoere'],
    clubs: ['Hienghène Sport', 'Tiga Sport', 'AS Magenta', 'Gaïtcha FCN', 'AS Lössi'],
  },
  nt_sol: {
    first: ['Junior', 'Don', 'Gideon', 'Hadyn', 'Bobby', 'Tigi', 'hudson', 'Prince', 'Allen', 'Molis', 'Alwin', 'Stanton'],
    last: ['David', 'Keana', 'Suluia', 'Ramofafia', 'Leslie', 'Molea', 'Felani', 'Tahunipue', 'Peter', 'Gagame', 'Hou', 'Aengari'],
    clubs: ['Central Coast FC', 'Solomon Warriors', 'Waneagu United', 'Henderson Eels', 'Kossa FC'],
  },
  nt_png: {
    first: ['Kolu', 'Daniel', 'Nigel', 'Solomon', 'Kenneth', 'Jacob', 'Oberth', 'Rani', 'Mathew', 'Rex', 'stahl', 'Nathaniel'],
    last: ['Kepo', 'Aisa', 'Dabinyaba', 'Rani', 'Airem', 'Sabua', 'Simon', 'Upaiga', 'David', 'Naime', 'Gubag', 'Lepani'],
    clubs: ['Hekari United', 'Lae City', 'Gulf Komara', 'Port Moresby Strikers', 'Madang FC'],
  },
  nt_van: {
    first: ['Ronaldo', 'Azariah', 'Claude', 'Jason', 'Michel', 'Godine', 'tony', 'Lency', 'Benoit', 'Tasso', 'Barry', 'Alick'],
    last: ['Wilkins', 'Soromon', 'Aru', 'Thomas', 'Coulon', 'Tenene', 'Kaltack', 'Philip', 'Kalsarap', 'Jeffrey', 'Mansale', 'Worworbu'],
    clubs: ['Ifira Black Bird', 'ABM Galaxy', 'Classic FC', 'Yatel FC', 'Tafea FC'],
  },
  nt_sam: {
    first: ['Va’a', 'Luki', 'George', 'Falaniko', 'johnny', 'Vito', 'Tauati', 'Kitiona', 'Paulo', 'Lapalapa', 'Alatina', 'Ethel'],
    last: ['Taualai', 'Gosche', 'Konise', 'Saofaiga', 'Hall', 'Laloata', 'Toleafoa', 'Nauer', 'Scanlan', 'Toni', 'Talilai', 'Malo'],
    clubs: ['Lupe o le Soaga', 'Vaivase-Tai', 'Vaipuna SC', 'Kiwi FC', 'Moaula United'],
  },
  nt_cok: {
    first: ['Tamaiva', 'Nuku', 'Ngatokorua', 'Harlem', 'Avi', 'Pekay', 'Alex', 'Tione', 'Owen', 'Conroy', 'Gichin', 'Kayne'],
    last: ['Mateariki', 'Mokoroa', 'Simiona', 'Enoka', 'Edwards', 'McComish', 'Nand', 'Tiputoa', 'Fowler', 'Matapo', 'Kumsuz', 'Tama'],
    clubs: ['Tupapa Maraerenga', 'Puaikura FC', 'Nikao Sokattak', 'Avatiu FC', 'Titikaveka FC'],
  },
  nt_ton: {
    first: ['Vai', 'Sione', 'Lisiate', 'Unaloto', 'Soakai', 'Kamaliele', 'Mahe', 'Tupou', 'Fotu', 'Tevita', 'Kalolo', 'Tuia'],
    last: ['Lutu', 'Feao', 'Feke', 'Vea', 'Atuekaho', 'Moimoi', 'Kite', 'Falepapalangi', 'Tu’akoi', 'Aho', 'Tu’ivailala', 'Palei'],
    clubs: ['Veitongo FC', 'Lotohaʻapai Utd', 'Navutoka FC', 'Longolongo FC', 'Marist Prems'],
  },
  nt_asa: {
    first: ['Tala', 'Rambo', 'Kaleopa', 'Savaliga', 'Milo', 'Tino', 'Liatama', 'Pita', 'Tafea', 'Darryl', 'Petueli', 'Iosefa'],
    last: ['Fa’alava’au', 'Tapui', 'Silao', 'Faga', 'Amisone', 'Lutu', 'Tali', 'Ott', 'Misa', 'nanumea', 'Tupa’i', 'Satele'],
    clubs: ['Pago Youth', 'Utulei Youth', 'Ilaoa & Toʻomata', 'PanSa East', 'Royal Puma'],
  },
};

export function generateInitialVirtualPlayers(): NationalVirtualPlayer[] {
  const list: NationalVirtualPlayer[] = [];
  const roleBlueprint: DetailedRole[] = [
    'GOL', 'GOL', 'GOL', 'GOL',
    'LAT', 'LAT', 'LAT', 'LAT', 'LAT', 'LAT',
    'ZAG', 'ZAG', 'ZAG', 'ZAG', 'ZAG', 'ZAG',
    'VOL', 'VOL', 'VOL', 'VOL', 'VOL',
    'MEI', 'MEI', 'MEI', 'MEI', 'MEI',
    'ATA', 'ATA', 'ATA', 'ATA', 'ATA', 'ATA',
  ];

  for (const nt of NATIONAL_TEAMS_CATALOG) {
    const presetStars = OVERSEAS_KEY_STARS[nt.id] || [];
    const usedRolesCount: Record<DetailedRole, number> = {
      GOL: 0,
      LAT: 0,
      ZAG: 0,
      VOL: 0,
      MEI: 0,
      ATA: 0,
    };
    const usedTeamNames = new Set<string>();

    presetStars.forEach((star, idx) => {
      usedRolesCount[star.role] += 1;
      usedTeamNames.add(normalizePlayerKey(star.name));
      const h = deterministicHash(`${nt.id}_${star.name}`);
      list.push({
        id: `vnt_${nt.id}_star_${idx}`,
        name: star.name,
        teamId: nt.id,
        position: roleToPosition(star.role),
        detailedRole: star.role,
        overall: star.ovr,
        age: star.age,
        clubShortName: star.club,
        caps: 14 + (h % 55),
        goals: star.role === 'ATA' ? 6 + (h % 26) : star.role === 'MEI' ? 2 + (h % 12) : h % 4,
      });
    });

    // Ensure every nation has ample Observatory depth (>= 31 players) for 26-man call-ups
    const targetVirtualCount =
      nt.confederation === 'CONMEBOL' ? Math.max(presetStars.length, 15) : 31;
    const pool = OFC_NATION_POOLS[nt.id] || CONFED_NAME_POOLS[nt.confederation];

    let slotIdx = 0;
    while (
      list.filter((p) => p.teamId === nt.id).length < targetVirtualCount &&
      slotIdx < roleBlueprint.length
    ) {
      const role = roleBlueprint[slotIdx];
      slotIdx++;
      const currentForRole = usedRolesCount[role];
      const maxForRole = roleBlueprint.filter((r) => r === role).length;
      if (currentForRole >= maxForRole) continue;

      usedRolesCount[role] += 1;
      const h = deterministicHash(`${nt.id}_gen_${slotIdx}_${role}`);
      let fullName = '';
      for (let attempt = 0; attempt < 24; attempt++) {
        const fIdx = (h + attempt * 5) % pool.first.length;
        const lIdx = ((h >> 4) + attempt * 7) % pool.last.length;
        const firstRaw = pool.first[fIdx];
        const lastRaw = pool.last[lIdx];
        const firstName = firstRaw.charAt(0).toUpperCase() + firstRaw.slice(1);
        const lastName = lastRaw.charAt(0).toUpperCase() + lastRaw.slice(1);
        const candidate = `${firstName} ${lastName}`;
        if (!usedTeamNames.has(normalizePlayerKey(candidate)) || attempt === 23) {
          fullName = candidate;
          usedTeamNames.add(normalizePlayerKey(candidate));
          break;
        }
      }
      const ovrSpread = (h % 7) - 3; // -3 to +3 around national team strength
      const ovr = Math.max(50, Math.min(90, nt.strength - 1 + ovrSpread));
      const age = 19 + (h % 14);

      list.push({
        id: `vnt_${nt.id}_${slotIdx}`,
        name: fullName,
        teamId: nt.id,
        position: roleToPosition(role),
        detailedRole: role,
        overall: ovr,
        age,
        clubShortName: pool.clubs[(h >> 7) % pool.clubs.length],
        caps: 2 + (h % 34),
        goals: role === 'ATA' ? h % 14 : role === 'MEI' ? h % 7 : h % 3,
      });
    }
  }

  return list;
}

function ensureVirtualPlayersDepthFor26(
  existingVirtual?: NationalVirtualPlayer[]
): NationalVirtualPlayer[] {
  const freshAll = generateInitialVirtualPlayers();
  if (!existingVirtual || existingVirtual.length === 0) return freshAll;

  const existingIds = new Set(existingVirtual.map((p) => p.id));
  const merged = [...existingVirtual];
  for (const fp of freshAll) {
    if (!existingIds.has(fp.id)) {
      merged.push(fp);
      existingIds.add(fp.id);
    }
  }
  return merged;
}

export function resolveNationalTeamPlayerPool(
  clubs: Club[],
  virtualPlayers: NationalVirtualPlayer[] | undefined,
  teamId: string,
  userClubId?: string
): ResolvedNationalPlayer[] {
  const team = getNationalTeamById(teamId);
  const vList = virtualPlayers || [];
  const results: ResolvedNationalPlayer[] = [];
  const seenNames = new Set<string>();

  // 1. Real club players matching this nation's true player nationality across all leagues
  const targetCountry = team.countryMatch || team.name;
  for (const club of clubs) {
    const clubCountry = club.country || 'Brasil';
    for (const p of club.squad) {
      const playerNat = resolvePlayerNationality(p, clubCountry);
      if (playerNat !== targetCountry) continue;
      const isInjured = p.injuryWeeks > 0 || Boolean(p.injuryDetails);
      if (isInjured) continue;
      seenNames.add(normalizePlayerKey(p.name));
      results.push({
        id: p.id,
        name: p.name,
        position: p.position,
        detailedRole: p.detailedRole,
        overall: p.overall,
        age: p.age,
        clubId: club.id,
        clubShortName: club.shortName,
        clubColors: { primary: club.colors.primary, text: club.colors.text },
        marketValue: p.marketValue,
        goalsSeason: p.goals,
        assistsSeason: p.assists,
        caps: p.internationalCaps || 0,
        internationalGoals: p.internationalGoals || 0,
        isUserClubPlayer: club.id === userClubId,
        isVirtual: false,
      });
    }
  }

  // 2. Virtual international stars for this Seleção
  for (const vp of vList) {
    if (vp.teamId !== teamId) continue;
    if (seenNames.has(normalizePlayerKey(vp.name))) continue;
    const rawVal = Math.round(Math.pow(vp.overall / 10, 3.8) * 14000 / 100000) * 100000;
    results.push({
      id: vp.id,
      name: vp.name,
      position: vp.position,
      detailedRole: vp.detailedRole,
      overall: vp.overall,
      age: vp.age,
      clubShortName: vp.clubShortName,
      clubColors: { primary: team.primaryColor, text: team.textColor },
      marketValue: Math.max(1500000, rawVal),
      goalsSeason: Math.max(0, Math.floor((vp.overall - 72) * 0.6)),
      assistsSeason: Math.max(0, Math.floor((vp.overall - 74) * 0.4)),
      caps: vp.caps,
      internationalGoals: vp.goals,
      isUserClubPlayer: false,
      isVirtual: true,
    });
  }

  return results.sort((a, b) => b.overall - a.overall || b.caps - a.caps);
}

export const SELECAO_ROLE_ORDER: Record<DetailedRole, number> = {
  GOL: 0,
  LAT: 1,
  ZAG: 2,
  VOL: 3,
  MEI: 4,
  ATA: 5,
};

export function sortNationalPlayersByPosition(
  players: ResolvedNationalPlayer[],
  starterIds?: Iterable<string>
): ResolvedNationalPlayer[] {
  const starterSet = starterIds ? new Set(starterIds) : null;
  return [...players].sort((a, b) => {
    const roleDiff =
      (SELECAO_ROLE_ORDER[a.detailedRole] ?? 9) -
      (SELECAO_ROLE_ORDER[b.detailedRole] ?? 9);
    if (roleDiff !== 0) return roleDiff;
    if (starterSet) {
      const aStart = starterSet.has(a.id) ? 0 : 1;
      const bStart = starterSet.has(b.id) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
    }
    if (b.overall !== a.overall) return b.overall - a.overall;
    if (b.caps !== a.caps) return b.caps - a.caps;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export function sortNationalPlayerIdsByPosition(
  playerIds: string[],
  pool: ResolvedNationalPlayer[],
  starterIds?: Iterable<string>
): string[] {
  const poolMap = new Map(pool.map((p) => [p.id, p]));
  const starterSet = starterIds ? new Set(starterIds) : null;
  const originalIdx = new Map<string, number>();
  playerIds.forEach((id, idx) => originalIdx.set(id, idx));

  return [...playerIds].sort((idA, idB) => {
    const a = poolMap.get(idA);
    const b = poolMap.get(idB);
    if (!a && !b) return (originalIdx.get(idA) ?? 0) - (originalIdx.get(idB) ?? 0);
    if (!a) return 1;
    if (!b) return -1;
    const roleDiff =
      (SELECAO_ROLE_ORDER[a.detailedRole] ?? 9) -
      (SELECAO_ROLE_ORDER[b.detailedRole] ?? 9);
    if (roleDiff !== 0) return roleDiff;
    if (starterSet) {
      const aStart = starterSet.has(idA) ? 0 : 1;
      const bStart = starterSet.has(idB) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
    }
    if (b.overall !== a.overall) return b.overall - a.overall;
    if (b.caps !== a.caps) return b.caps - a.caps;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

/**
 * Selects the optimal 26-player FIFA squad (strictly ordered by position GOL -> LAT -> ZAG -> VOL -> MEI -> ATA)
 * and 11 starters (ordered by tactical slots) for any Seleção (`teamId`).
 */
export function selectOptimalSelecaoSquad(
  clubs: Club[],
  teamId: string = 'nt_bra',
  virtualPlayers?: NationalVirtualPlayer[],
  formation: FormationType = '4-3-3'
): {
  calledUpPlayerIds: string[];
  starterPlayerIds: string[];
  captainPlayerId?: string;
} {
  const pool = resolveNationalTeamPlayerPool(clubs, virtualPlayers, teamId);

  const scored = pool
    .map((p) => ({
      p,
      score: p.overall + p.goalsSeason * 0.4 + p.assistsSeason * 0.25 + (p.age <= 24 ? 0.5 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.p.overall - a.p.overall);

  const selectedIds = new Set<string>();
  const pickMany = (pred: (item: ResolvedNationalPlayer) => boolean, count: number) => {
    const picked: ResolvedNationalPlayer[] = [];
    for (const s of scored) {
      if (picked.length >= count) break;
      if (!selectedIds.has(s.p.id) && pred(s.p)) {
        selectedIds.add(s.p.id);
        picked.push(s.p);
      }
    }
    return picked;
  };

  // Official 26-player FIFA tournament quota: 3 GOL, 9 DEF (4 LAT + 5 ZAG), 8 MID (4 VOL + 4 MEI), 6 FW
  const gks = pickMany((p) => p.position === 'GK', 3);
  const lats = pickMany((p) => p.detailedRole === 'LAT', 4);
  const zags = pickMany((p) => p.detailedRole === 'ZAG', 5);
  const vols = pickMany((p) => p.detailedRole === 'VOL', 4);
  const meis = pickMany((p) => p.detailedRole === 'MEI', 4);
  const atas = pickMany((p) => p.position === 'FW', 6);
  const remaining = Math.max(0, MAX_SELECAO_SQUAD_SIZE - selectedIds.size);
  const extras = remaining > 0 ? pickMany(() => true, remaining) : [];

  const rawCalledList = [
    ...gks,
    ...lats,
    ...zags,
    ...vols,
    ...meis,
    ...atas,
    ...extras,
  ].slice(0, MAX_SELECAO_SQUAD_SIZE);

  // Order the 11 best starters directly into the 11 slots of `formation`
  const starterPlayerIds = fitPlayersToSelecaoFormation(rawCalledList, formation);
  const calledList = sortNationalPlayersByPosition(rawCalledList, starterPlayerIds);
  const calledUpPlayerIds = calledList.map((p) => p.id);

  const starterSet = new Set(starterPlayerIds);
  const captainCandidate = [...calledList]
    .filter((p) => starterSet.has(p.id))
    .sort((a, b) => b.overall + b.caps * 0.12 - (a.overall + a.caps * 0.12))[0];

  return {
    calledUpPlayerIds,
    starterPlayerIds,
    captainPlayerId: captainCandidate?.id || starterPlayerIds[0],
  };
}

// ============================================================================
// STANDINGS & SIMULATION CORE FOR TOURNAMENTS AND QUALIFIERS
// ============================================================================

export function createEmptyNationalStandings(
  teamIds: string[],
  groupMap?: Record<string, string>
): NationalStandingRow[] {
  return teamIds.map((teamId) => ({
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
    group: groupMap ? groupMap[teamId] : undefined,
  }));
}

export function recomputeNationalStandings(
  teamIds: string[],
  fixtures: InternationalMatchFixture[],
  groupMap?: Record<string, string>
): NationalStandingRow[] {
  const rowsByTeam = new Map<string, NationalStandingRow>();
  for (const id of teamIds) {
    rowsByTeam.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
      group: groupMap ? groupMap[id] : undefined,
    });
  }

  for (const fix of fixtures) {
    if (!fix.played || fix.homeScore === null || fix.awayScore === null) continue;
    // Only count group/league matches if groupMap is provided
    if (groupMap && !fix.group) continue;

    const home = rowsByTeam.get(fix.homeTeamId);
    const away = rowsByTeam.get(fix.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += fix.homeScore;
    home.goalsAgainst += fix.awayScore;
    home.goalDifference = home.goalsFor - home.goalsAgainst;

    away.goalsFor += fix.awayScore;
    away.goalsAgainst += fix.homeScore;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (fix.homeScore > fix.awayScore) {
      home.won += 1;
      home.points += 3;
      home.form = [...home.form.slice(-4), 'V'];
      away.lost += 1;
      away.form = [...away.form.slice(-4), 'D'];
    } else if (fix.homeScore < fix.awayScore) {
      away.won += 1;
      away.points += 3;
      away.form = [...away.form.slice(-4), 'V'];
      home.lost += 1;
      home.form = [...home.form.slice(-4), 'D'];
    } else {
      home.drawn += 1;
      home.points += 1;
      home.form = [...home.form.slice(-4), 'E'];
      away.drawn += 1;
      away.points += 1;
      away.form = [...away.form.slice(-4), 'E'];
    }
  }

  const rows = Array.from(rowsByTeam.values());
  const playedGroupFixtures = fixtures.filter(
    (f) => f.played && f.homeScore !== null && f.awayScore !== null && (!groupMap || Boolean(f.group))
  );

  // Ordem oficial FIFA na Fase de Grupos:
  // 1º Pontos -> 2º Saldo de Gols geral -> 3º Gols Marcados (GP) -> 4º Confronto Direto (pts, SG, GP entre empatados) -> Ranking/Força
  const primaryCompare = (a: NationalStandingRow, b: NationalStandingRow): number => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return 0;
  };

  // Group rows by group key so H2H tiebreakers apply only within the same group/table
  const byGroupKey = new Map<string, NationalStandingRow[]>();
  for (const r of rows) {
    const gk = r.group || '__ALL__';
    const arr = byGroupKey.get(gk);
    if (arr) arr.push(r);
    else byGroupKey.set(gk, [r]);
  }

  const sortedGroupKeys = Array.from(byGroupKey.keys()).sort((a, b) => a.localeCompare(b));
  const result: NationalStandingRow[] = [];

  for (const gk of sortedGroupKeys) {
    const grpRows = byGroupKey.get(gk) || [];
    // Bucket by (points, GD, GF) to resolve exact ties via head-to-head
    const buckets = new Map<string, NationalStandingRow[]>();
    for (const r of grpRows) {
      const k = `${r.points}_${r.goalDifference}_${r.goalsFor}`;
      const arr = buckets.get(k);
      if (arr) arr.push(r);
      else buckets.set(k, [r]);
    }

    const h2hScore = new Map<string, { pts: number; gd: number; gf: number }>();
    for (const tied of buckets.values()) {
      if (tied.length < 2) continue;
      const tiedSet = new Set(tied.map((t) => t.teamId));
      for (const t of tied) {
        h2hScore.set(t.teamId, { pts: 0, gd: 0, gf: 0 });
      }
      for (const fix of playedGroupFixtures) {
        if (!tiedSet.has(fix.homeTeamId) || !tiedSet.has(fix.awayTeamId)) continue;
        const h = h2hScore.get(fix.homeTeamId)!;
        const aw = h2hScore.get(fix.awayTeamId)!;
        const hs = fix.homeScore!;
        const as = fix.awayScore!;
        h.gf += hs;
        h.gd += hs - as;
        aw.gf += as;
        aw.gd += as - hs;
        if (hs > as) h.pts += 3;
        else if (as > hs) aw.pts += 3;
        else {
          h.pts += 1;
          aw.pts += 1;
        }
      }
    }

    grpRows.sort((a, b) => {
      const p = primaryCompare(a, b);
      if (p !== 0) return p;
      const ha = h2hScore.get(a.teamId);
      const hb = h2hScore.get(b.teamId);
      if (ha && hb) {
        if (hb.pts !== ha.pts) return hb.pts - ha.pts;
        if (hb.gd !== ha.gd) return hb.gd - ha.gd;
        if (hb.gf !== ha.gf) return hb.gf - ha.gf;
      }
      const strA = getNationalTeamById(a.teamId).strength;
      const strB = getNationalTeamById(b.teamId).strength;
      if (strB !== strA) return strB - strA;
      return getNationalTeamById(b.teamId).fifaPoints - getNationalTeamById(a.teamId).fifaPoints;
    });

    result.push(...grpRows);
  }

  return result;
}

function samplePoissonGoals(lambda: number, seedHint?: number): number {
  let goals = 0;
  const stepChance = Math.min(0.46, Math.max(0.05, lambda / 6));
  for (let i = 0; i < 6; i++) {
    const r =
      seedHint !== undefined
        ? ((deterministicHash(`${seedHint}_${i}`) % 1000) + 0.5) / 1000
        : Math.random();
    if (r < stepChance) goals++;
  }
  return goals;
}

function simulateCpuInternationalFixture(
  fix: InternationalMatchFixture,
  isKnockout: boolean,
  deterministicSeed?: string
): InternationalMatchFixture {
  const home = getNationalTeamById(fix.homeTeamId);
  const away = getNationalTeamById(fix.awayTeamId);
  const neutralVenue =
    fix.competition === 'world_cup' ||
    fix.competition === 'copa_america' ||
    fix.competition === 'eurocopa' ||
    fix.competition === 'copa_africana' ||
    fix.competition === 'copa_asia' ||
    fix.competition === 'copa_oceania' ||
    fix.competition === 'copa_ouro' ||
    fix.competition === 'finalissima' ||
    (fix.competition === 'nations_league' && !fix.group);

  const altitudeBonus = !neutralVenue && fix.homeTeamId === 'nt_bol' ? 4.2 : 0;
  const homeAdv = neutralVenue ? 0 : 2.1 + altitudeBonus;
  const diff = home.strength + homeAdv - away.strength;

  const expH = Math.max(0.42, 1.38 + diff * 0.095);
  const expA = Math.max(0.35, 1.18 - diff * 0.085);

  const seedA = deterministicSeed ? deterministicHash(`${deterministicSeed}_h`) : undefined;
  const seedB = deterministicSeed ? deterministicHash(`${deterministicSeed}_a`) : undefined;

  const homeScore = samplePoissonGoals(expH, seedA);
  const awayScore = samplePoissonGoals(expA, seedB);

  let penaltiesHome: number | undefined;
  let penaltiesAway: number | undefined;
  let winnerTeamId: string | undefined;

  if (homeScore > awayScore) {
    winnerTeamId = fix.homeTeamId;
  } else if (awayScore > homeScore) {
    winnerTeamId = fix.awayTeamId;
  } else if (isKnockout) {
    const r =
      deterministicSeed !== undefined
        ? (deterministicHash(`${deterministicSeed}_pen`) % 100) / 100
        : Math.random();
    const homePenWinProb = 0.5 + Math.max(-0.18, Math.min(0.18, (home.strength - away.strength) * 0.015));
    const homeWinsPen = r < homePenWinProb;
    const basePairs: [number, number][] = [
      [5, 4],
      [4, 3],
      [5, 3],
      [4, 2],
      [6, 5],
    ];
    const pairIdx =
      deterministicSeed !== undefined
        ? deterministicHash(`${deterministicSeed}_pk`) % basePairs.length
        : Math.floor(Math.random() * basePairs.length);
    const [hi, lo] = basePairs[pairIdx];
    penaltiesHome = homeWinsPen ? hi : lo;
    penaltiesAway = homeWinsPen ? lo : hi;
    winnerTeamId = homeWinsPen ? fix.homeTeamId : fix.awayTeamId;
  }

  return {
    ...fix,
    played: true,
    status: 'PLAYED',
    homeScore,
    awayScore,
    penaltiesHome,
    penaltiesAway,
    winnerTeamId,
  };
}

// ============================================================================
// ELIMINATÓRIAS DA COPA DO MUNDO (CONMEBOL 18 RODADAS + GLOBAL)
// ============================================================================

function getQualifierRoundScheduleMeta(
  targetWcYear: number,
  qRound: number
): { seasonYear: number; triggerRound: number; date: string; time: string; dateLabel: string } {
  // Calendário Oficial da América do Sul (CONMEBOL · 18 rodadas em 2 anos: y-3 e y-1):
  // - Ano y-3 (2027, 2031, 2035): 9 rodadas -> Mar (2), Jun (2), Set/Out (3), Nov (2)
  // - Ano y-1 (2029, 2033, 2037): 9 rodadas -> Mar (2), Jun (2), Set/Out (3), Nov (2)
  // (Anos de Copa do Mundo e de Copa América são exclusivamente Amistosos + Torneio!)
  if (qRound <= 9) {
    const year = targetWcYear - 3; // e.g. 2027 para Copa 2030, 2031 para Copa 2034, 2035 para Copa 2038
    const idx = qRound - 1;
    const w = getFifaWindowDatesForYear(year);
    const dates = [w.mar1, w.mar2, w.jun1, w.jun2, w.sep1, w.sep2, w.oct1, w.nov1, w.nov2];
    const times = ['21:30', '21:30', '20:00', '21:30', '21:30', '20:00', '21:30', '21:30', '21:30'];
    const rounds = [6, 7, 12, 13, 24, 25, 29, 33, 34];
    const labels = [
      'Março · Eliminatórias CONMEBOL (1ª Rodada)',
      'Março · Eliminatórias CONMEBOL (2ª Rodada)',
      'Junho · Eliminatórias CONMEBOL (3ª Rodada)',
      'Junho · Eliminatórias CONMEBOL (4ª Rodada)',
      'Set/Out · Eliminatórias CONMEBOL (5ª Rodada)',
      'Set/Out · Eliminatórias CONMEBOL (6ª Rodada)',
      'Set/Out · Eliminatórias CONMEBOL (7ª Rodada)',
      'Novembro · Eliminatórias CONMEBOL (8ª Rodada)',
      'Novembro · Eliminatórias CONMEBOL (9ª Rodada)',
    ];
    const date = dates[idx];
    return {
      seasonYear: year,
      triggerRound: rounds[idx],
      date,
      time: times[idx],
      dateLabel: `${formatShortDate(date)} · ${labels[idx]}`,
    };
  }

  const year = targetWcYear - 1; // e.g. 2029 para Copa 2030, 2033 para Copa 2034, 2037 para Copa 2038
  const idx = Math.min(8, qRound - 10);
  const w = getFifaWindowDatesForYear(year);
  const dates = [w.mar1, w.mar2, w.jun1, w.jun2, w.sep1, w.oct1, w.oct2, w.nov1, w.nov2];
  const times = ['21:30', '21:30', '20:00', '21:30', '21:30', '20:00', '21:30', '21:30', '21:30'];
  const rounds = [6, 7, 12, 13, 24, 29, 30, 33, 34];
  const labels = [
    'Março · Eliminatórias CONMEBOL (10ª Rodada)',
    'Março · Eliminatórias CONMEBOL (11ª Rodada)',
    'Junho · Eliminatórias CONMEBOL (12ª Rodada)',
    'Junho · Eliminatórias CONMEBOL (13ª Rodada)',
    'Set/Out · Eliminatórias CONMEBOL (14ª Rodada)',
    'Set/Out · Eliminatórias CONMEBOL (15ª Rodada)',
    'Set/Out · Eliminatórias CONMEBOL (16ª Rodada)',
    'Novembro · Eliminatórias CONMEBOL (17ª Rodada)',
    'Novembro · Eliminatórias CONMEBOL (18ª Rodada Final)',
  ];
  const date = dates[idx];
  return {
    seasonYear: year,
    triggerRound: rounds[idx],
    date,
    time: times[idx],
    dateLabel: `${formatShortDate(date)} · ${labels[idx]}`,
  };
}

function generateRoundRobinPairs(teamIds: string[]): [string, string][][] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push('BYE');
  const n = teams.length;
  const half = n / 2;
  const firstHalf: [string, string][][] = [];
  const rotating = teams.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const roundPairs: [string, string][] = [];
    const current = [teams[0], ...rotating];
    for (let i = 0; i < half; i++) {
      const t1 = current[i];
      const t2 = current[n - 1 - i];
      if (t1 !== 'BYE' && t2 !== 'BYE') {
        roundPairs.push(r % 2 === 0 ? [t1, t2] : [t2, t1]);
      }
    }
    firstHalf.push(roundPairs);
    rotating.unshift(rotating.pop()!);
  }

  const secondHalf = firstHalf.map((rp) => rp.map(([h, a]) => [a, h] as [string, string]));
  return [...firstHalf, ...secondHalf];
}

const Q_ROUND_MAP_14 = [1, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 18];
const Q_ROUND_MAP_10 = [1, 3, 5, 7, 9, 11, 12, 14, 16, 18];

function assignBalancedGroupsBySeed(
  teamIds: string[],
  numGroups: number,
  seedOffset: number
): Record<string, string> {
  const sorted = [...teamIds].sort(
    (a, b) => getNationalTeamById(b).fifaPoints - getNationalTeamById(a).fifaPoints
  );
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const groupMap: Record<string, string> = {};
  const potCount = Math.ceil(sorted.length / numGroups);

  for (let pot = 0; pot < potCount; pot++) {
    const potSlice = sorted.slice(pot * numGroups, (pot + 1) * numGroups);
    potSlice.forEach((tid, idx) => {
      const gIdx =
        pot % 2 === 0
          ? (idx + pot * seedOffset) % numGroups
          : (numGroups - 1 - idx + pot * seedOffset) % numGroups;
      groupMap[tid] = `Grupo ${groupLetters[gIdx] || 'A'}`;
    });
  }
  return groupMap;
}

function getOtherConfedWcQualScheduleMeta(
  conf: 'UEFA' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC',
  targetWcYear: number,
  roundIdx: number
): { seasonYear: number; triggerRound: number; date: string; dateLabel: string } {
  const y1 = targetWcYear - 3; // e.g. 2027 for 2030 WC, 2031 for 2034 WC
  const yA = targetWcYear - 1; // e.g. 2029 for 2030 WC (after Euro 2028 & Nations League 2028/29 League Phase)
  const yB = targetWcYear;     // e.g. 2030 for 2030 WC (Final UEFA Matchdays / Playoffs)
  const w1 = getFifaWindowDatesForYear(y1);
  const wA = getFifaWindowDatesForYear(yA);
  const wB = getFifaWindowDatesForYear(yB);

  const y2 = targetWcYear - 2; // e.g. 2028 for 2030 WC (post CAN 2028, Sep/Oct/Nov)
  const w2 = getFifaWindowDatesForYear(y2);

  if (conf === 'UEFA') {
    // 10 rounds across yA (Mar, Sep, Oct, Nov) + yB (Mar) -> zero clash with Nations League 2026-28, Euro 2028 Qual, or 2029 Jun Final Four
    const slots = [
      { seasonYear: yA, triggerRound: 6, date: wA.mar1, label: 'Março · 1ª Rodada UEFA' },
      { seasonYear: yA, triggerRound: 7, date: wA.mar2, label: 'Março · 2ª Rodada UEFA' },
      { seasonYear: yA, triggerRound: 24, date: wA.sep1, label: 'Super Data FIFA · Set 1' },
      { seasonYear: yA, triggerRound: 25, date: wA.sep2, label: 'Super Data FIFA · Set 2' },
      { seasonYear: yA, triggerRound: 29, date: wA.oct1, label: 'Super Data FIFA · Out 1' },
      { seasonYear: yA, triggerRound: 30, date: wA.oct2, label: 'Super Data FIFA · Out 2' },
      { seasonYear: yA, triggerRound: 33, date: wA.nov1, label: 'Novembro · 1ª Data FIFA' },
      { seasonYear: yA, triggerRound: 34, date: wA.nov2, label: 'Novembro · Rodada Final Grupos' },
      { seasonYear: yB, triggerRound: 6, date: wB.mar1, label: 'Março · Decisão / Repescagem 1' },
      { seasonYear: yB, triggerRound: 7, date: wB.mar2, label: 'Março · Decisão / Repescagem 2' },
    ];
    const s = slots[roundIdx] || slots[slots.length - 1];
    return {
      seasonYear: s.seasonYear,
      triggerRound: s.triggerRound,
      date: s.date,
      dateLabel: `${formatShortDate(s.date)} · ${s.label}`,
    };
  }

  if (conf === 'CAF') {
    // 54 seleções CAF (sem Zanzibar e Reunião) em 9 grupos de 6 -> 10 rodadas:
    // y2 (2028, 2032, 2036): Nov (2 jogos)
    // yA (2029, 2033, 2037): Mar (2 jogos) + Jun (2 jogos) + Set/Out (4 jogos)
    // (Novembro de yA fica dedicado ao Play-Off CAF dos 4 melhores segundos colocados!)
    const slots = [
      { seasonYear: y2, triggerRound: 33, date: w2.nov1, label: 'Novembro · 1ª Rodada CAF' },
      { seasonYear: y2, triggerRound: 34, date: w2.nov2, label: 'Novembro · 2ª Rodada CAF' },
      { seasonYear: yA, triggerRound: 6, date: wA.mar1, label: 'Março · 3ª Rodada CAF' },
      { seasonYear: yA, triggerRound: 7, date: wA.mar2, label: 'Março · 4ª Rodada CAF' },
      { seasonYear: yA, triggerRound: 12, date: wA.jun1, label: 'Junho · 5ª Rodada CAF' },
      { seasonYear: yA, triggerRound: 13, date: wA.jun2, label: 'Junho · 6ª Rodada CAF' },
      { seasonYear: yA, triggerRound: 24, date: wA.sep1, label: 'Set/Out · 7ª Rodada CAF' },
      { seasonYear: yA, triggerRound: 25, date: wA.sep2, label: 'Set/Out · 8ª Rodada CAF' },
      { seasonYear: yA, triggerRound: 29, date: wA.oct1, label: 'Set/Out · 9ª Rodada CAF' },
      { seasonYear: yA, triggerRound: 30, date: wA.oct2, label: 'Set/Out · Rodada Final Grupos CAF' },
    ];
    const s = slots[roundIdx] || slots[slots.length - 1];
    return {
      seasonYear: s.seasonYear,
      triggerRound: s.triggerRound,
      date: s.date,
      dateLabel: `${formatShortDate(s.date)} · ${s.label}`,
    };
  }

  if (conf === 'OFC') {
    // 11 OFC full members in a single table (Grupo Único): 10 matches per nation (11 Berger matchdays) across yA (2029, 2033, 2037)
    const ofcMidOct = addDays(wA.oct1, 3);
    const ofcLateOct = wA.oct2 >= addDays(ofcMidOct, 3) ? wA.oct2 : addDays(ofcMidOct, 3);
    const slots = [
      { seasonYear: yA, triggerRound: 6, date: wA.mar1, label: 'Março · 1ª Rodada OFC' },
      { seasonYear: yA, triggerRound: 7, date: wA.mar2, label: 'Março · 2ª Rodada OFC' },
      { seasonYear: yA, triggerRound: 12, date: wA.jun1, label: 'Junho · 3ª Rodada OFC' },
      { seasonYear: yA, triggerRound: 13, date: wA.jun2, label: 'Junho · 4ª Rodada OFC' },
      { seasonYear: yA, triggerRound: 24, date: wA.sep1, label: 'Super Data FIFA · 5ª Rodada OFC' },
      { seasonYear: yA, triggerRound: 25, date: wA.sep2, label: 'Super Data FIFA · 6ª Rodada OFC' },
      { seasonYear: yA, triggerRound: 29, date: wA.oct1, label: 'Super Data FIFA · 7ª Rodada OFC' },
      { seasonYear: yA, triggerRound: 29, date: ofcMidOct, label: 'Super Data FIFA · 8ª Rodada OFC' },
      { seasonYear: yA, triggerRound: 30, date: ofcLateOct, label: 'Super Data FIFA · 9ª Rodada OFC' },
      { seasonYear: yA, triggerRound: 33, date: wA.nov1, label: 'Novembro · 10ª Rodada OFC' },
      { seasonYear: yA, triggerRound: 34, date: wA.nov2, label: 'Novembro · Rodada Final OFC' },
    ];
    const s = slots[roundIdx] || slots[slots.length - 1];
    return {
      seasonYear: s.seasonYear,
      triggerRound: s.triggerRound,
      date: s.date,
      dateLabel: `${formatShortDate(s.date)} · ${s.label}`,
    };
  }

  if (conf === 'CONCACAF') {
    // Calendário Oficial CONCACAF 2026–2030 (e ciclos 2030–2034 / 2034–2038):
    // 1ª/2ª Fase em Set/Out/Nov de y1 (2027, 2031, 2035), Conclusão 2ª Fase em Mar de y2 (2028, 2032, 2036),
    // Fase Final em Set/Out de y3 (2029, 2033, 2037) — zero choque com Liga das Nações (2026/27 & 2028/29) ou Copa Ouro (2027 & 2029)!
    const y2 = targetWcYear - 2; // 2028, 2032, 2036
    const y3 = targetWcYear - 1; // 2029, 2033, 2037
    const w2 = getFifaWindowDatesForYear(y2);
    const w3 = getFifaWindowDatesForYear(y3);
    const concacafSlots = [
      { seasonYear: y1, triggerRound: 24, date: w1.sep1, label: 'Set/Out · 1ª/2ª Fase CONCACAF' },
      { seasonYear: y1, triggerRound: 29, date: w1.oct1, label: 'Outubro · 2ª Fase CONCACAF' },
      { seasonYear: y1, triggerRound: 33, date: w1.nov1, label: 'Novembro · 2ª Fase CONCACAF' },
      { seasonYear: y2, triggerRound: 6, date: w2.mar1, label: 'Março · Conclusão 2ª Fase CONCACAF' },
      { seasonYear: y3, triggerRound: 24, date: w3.sep1, label: 'Set/Out · Fase Final CONCACAF' },
      { seasonYear: y3, triggerRound: 30, date: w3.oct2, label: 'Outubro · Rodada Final CONCACAF' },
    ];
    const cs = concacafSlots[roundIdx] || concacafSlots[concacafSlots.length - 1];
    return {
      seasonYear: cs.seasonYear,
      triggerRound: cs.triggerRound,
      date: cs.date,
      dateLabel: `${formatShortDate(cs.date)} · ${cs.label}`,
    };
  }

  // AFC (48 seleções em 8 grupos de 6, ida e volta = 10 jogos):
  // Set/Out y2 (4 jogos) + Nov y2 (2 jogos) + Mar yA (2 jogos) + Jun yA (2 jogos) —
  // deixando Set/Out yA livre para o Play-Off dos 8 segundos colocados (Quartas, Semi e Final)!
  const slots = [
    { seasonYear: y2, triggerRound: 24, date: w2.sep1, label: 'Set/Out · 1ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 25, date: w2.sep2, label: 'Set/Out · 2ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 29, date: w2.oct1, label: 'Set/Out · 3ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 30, date: w2.oct2, label: 'Set/Out · 4ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 33, date: w2.nov1, label: 'Novembro · 5ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 34, date: w2.nov2, label: 'Novembro · 6ª Rodada AFC' },
    { seasonYear: yA, triggerRound: 6, date: wA.mar1, label: 'Março · 7ª Rodada AFC' },
    { seasonYear: yA, triggerRound: 7, date: wA.mar2, label: 'Março · 8ª Rodada AFC' },
    { seasonYear: yA, triggerRound: 12, date: wA.jun1, label: 'Junho · 9ª Rodada AFC' },
    { seasonYear: yA, triggerRound: 13, date: wA.jun2, label: 'Junho · Rodada Final Grupos AFC' },
  ];
  const s = slots[roundIdx] || slots[slots.length - 1];
  return {
    seasonYear: s.seasonYear,
    triggerRound: s.triggerRound,
    date: s.date,
    dateLabel: `${formatShortDate(s.date)} · ${s.label}`,
  };
}

/**
 * Avança automaticamente o Play-Off das Eliminatórias da Ásia (AFC):
 * Após as 10 rodadas dos 8 grupos (Junho de yA = 2029, 2033, 2037), os 8 segundos colocados
 * disputam Quartas (sep1), Semifinais (oct1) e Final (oct2) em jogo único na janela de Set/Out.
 * O vencedor conquista a vaga da AFC na Repescagem Intercontinental da Copa do Mundo.
 */
function advanceAfcWcPlayoffStages(
  qualifiers: WorldCupQualifiersCycle,
  seasonSchedule?: InternationalMatchFixture[],
  preSimulateCompleted: boolean = false
): {
  qualifiers: WorldCupQualifiersCycle;
  cleanedSchedule?: InternationalMatchFixture[];
} {
  const targetYear = qualifiers.targetWorldCupYear;
  const yA = targetYear - 1;
  const wA = getFifaWindowDatesForYear(yA);
  const allOther = [...qualifiers.otherConfedFixtures];

  const afcGroupFixtures = allOther.filter(
    (f) => f.competitionName.includes('Eliminatórias AFC') && Boolean(f.group)
  );
  if (afcGroupFixtures.length === 0 || !afcGroupFixtures.every((f) => f.played)) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const afcRows = qualifiers.otherConfedStandings.AFC || [];
  const byGroup: Record<string, NationalStandingRow[]> = {};
  afcRows.forEach((r) => {
    const g = r.group || 'Grupo A';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(r);
  });
  const groupNames = Object.keys(byGroup).sort();
  if (groupNames.length < 8) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const newlyAdded: InternationalMatchFixture[] = [];
  const makePlayoffMatch = (
    stage: 'Quartas de Final' | 'Semifinal' | 'Final',
    slot: number,
    date: string,
    triggerRound: number,
    homeId: string,
    awayId: string
  ): InternationalMatchFixture => {
    let fix: InternationalMatchFixture = {
      id: `wcq_${targetYear}_AFC_playoff_${stage === 'Quartas de Final' ? 'qf' : stage === 'Semifinal' ? 'sf' : 'fin'}_${slot}`,
      competition: 'wc_qualifiers',
      competitionName: `Eliminatórias AFC · Copa ${targetYear}`,
      seasonYear: yA,
      triggerRound,
      date,
      time: '15:00',
      dateLabel: `${formatShortDate(date)} · Play-Off AFC (${stage})`,
      phase: `Play-Off AFC · ${stage}`,
      knockoutSlot: slot,
      homeTeamId: homeId,
      awayTeamId: awayId,
      stadiumName: getNationalTeamById(homeId).homeStadium,
      played: false,
      status: 'PENDING',
      homeScore: null,
      awayScore: null,
    };
    if (preSimulateCompleted) {
      fix = simulateCpuInternationalFixture(
        fix,
        true,
        `arch_afc_po_${targetYear}_${stage}_${slot}`
      );
    }
    return fix;
  };

  // 1. Quartas de Final (8 segundos colocados -> 4 jogos em sep1)
  const hasQf = allOther.some(
    (f) => f.competitionName.includes('Eliminatórias AFC') && f.phase === 'Play-Off AFC · Quartas de Final'
  );
  if (!hasQf) {
    const runners = groupNames.slice(0, 8).map((g) => byGroup[g]?.[1]?.teamId).filter((id): id is string => Boolean(id));
    if (runners.length === 8) {
      const pairs: [string, string][] = [
        [runners[0], runners[1]],
        [runners[2], runners[3]],
        [runners[4], runners[5]],
        [runners[6], runners[7]],
      ];
      pairs.forEach(([h, a], idx) => {
        const m = makePlayoffMatch('Quartas de Final', idx + 1, wA.sep1, 24, h, a);
        allOther.push(m);
        newlyAdded.push(m);
      });
    }
  }

  // 2. Semifinais (4 vencedores das Quartas -> 2 jogos em oct1)
  const qfFixes = allOther
    .filter((f) => f.competitionName.includes('Eliminatórias AFC') && f.phase === 'Play-Off AFC · Quartas de Final')
    .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
  const hasSf = allOther.some(
    (f) => f.competitionName.includes('Eliminatórias AFC') && f.phase === 'Play-Off AFC · Semifinal'
  );
  if (qfFixes.length === 4 && qfFixes.every((f) => f.played) && !hasSf) {
    for (let i = 0; i < 2; i++) {
      const w1 = qfFixes[i * 2].winnerTeamId || qfFixes[i * 2].homeTeamId;
      const w2 = qfFixes[i * 2 + 1].winnerTeamId || qfFixes[i * 2 + 1].homeTeamId;
      const m = makePlayoffMatch('Semifinal', i + 1, wA.oct1, 29, w1, w2);
      allOther.push(m);
      newlyAdded.push(m);
    }
  }

  // 3. Final (2 vencedores das Semis -> 1 jogo em oct2; vencedor vai à Repescagem Intercontinental)
  const sfFixes = allOther
    .filter((f) => f.competitionName.includes('Eliminatórias AFC') && f.phase === 'Play-Off AFC · Semifinal')
    .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
  const hasFin = allOther.some(
    (f) => f.competitionName.includes('Eliminatórias AFC') && f.phase === 'Play-Off AFC · Final'
  );
  if (sfFixes.length === 2 && sfFixes.every((f) => f.played) && !hasFin) {
    const w1 = sfFixes[0].winnerTeamId || sfFixes[0].homeTeamId;
    const w2 = sfFixes[1].winnerTeamId || sfFixes[1].homeTeamId;
    const m = makePlayoffMatch('Final', 1, wA.oct2, 30, w1, w2);
    allOther.push(m);
    newlyAdded.push(m);
  }

  if (newlyAdded.length === 0) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const busyNew = new Set<string>();
  newlyAdded.forEach((m) => {
    if (m.date) {
      busyNew.add(`${m.homeTeamId}_${m.date}`);
      busyNew.add(`${m.awayTeamId}_${m.date}`);
    }
  });

  const cleanedSchedule = seasonSchedule
    ? seasonSchedule.filter(
        (f) =>
          f.played ||
          f.competition !== 'friendly' ||
          !f.date ||
          (!busyNew.has(`${f.homeTeamId}_${f.date}`) && !busyNew.has(`${f.awayTeamId}_${f.date}`))
      )
    : undefined;

  return {
    qualifiers: {
      ...qualifiers,
      otherConfedFixtures: allOther,
    },
    cleanedSchedule,
  };
}

/**
 * Avança automaticamente a Repescagem / Play-Off das Eliminatórias da África (CAF):
 * Após as 10 rodadas dos 9 grupos (Set/Out de yA = 2029, 2033, 2037), os 4 melhores segundos colocados
 * disputam Semifinais (nov1) e Final (nov2) em jogo único na janela de 12–20 de novembro.
 * O vencedor conquista a vaga africana na Repescagem Intercontinental da Copa do Mundo.
 */
function advanceCafWcPlayoffStages(
  qualifiers: WorldCupQualifiersCycle,
  seasonSchedule?: InternationalMatchFixture[],
  preSimulateCompleted: boolean = false
): {
  qualifiers: WorldCupQualifiersCycle;
  cleanedSchedule?: InternationalMatchFixture[];
} {
  const targetYear = qualifiers.targetWorldCupYear;
  const yA = targetYear - 1;
  const wA = getFifaWindowDatesForYear(yA);
  const allOther = [...qualifiers.otherConfedFixtures];

  const cafGroupFixtures = allOther.filter(
    (f) => f.competitionName.includes('Eliminatórias CAF') && Boolean(f.group)
  );
  if (cafGroupFixtures.length === 0 || !cafGroupFixtures.every((f) => f.played)) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const cafRows = qualifiers.otherConfedStandings.CAF || [];
  const byGroup: Record<string, NationalStandingRow[]> = {};
  cafRows.forEach((r) => {
    const g = r.group || 'Grupo A';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(r);
  });
  const groupNames = Object.keys(byGroup).sort();
  if (groupNames.length < 9) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const newlyAdded: InternationalMatchFixture[] = [];
  const makePlayoffMatch = (
    stage: 'Semifinal' | 'Final',
    slot: number,
    date: string,
    triggerRound: number,
    homeId: string,
    awayId: string
  ): InternationalMatchFixture => {
    let fix: InternationalMatchFixture = {
      id: `wcq_${targetYear}_CAF_playoff_${stage === 'Semifinal' ? 'sf' : 'fin'}_${slot}`,
      competition: 'wc_qualifiers',
      competitionName: `Eliminatórias CAF · Copa ${targetYear}`,
      seasonYear: yA,
      triggerRound,
      date,
      time: '17:00',
      dateLabel: `${formatShortDate(date)} · Play-Off CAF (${stage})`,
      phase: `Play-Off CAF · ${stage}`,
      knockoutSlot: slot,
      homeTeamId: homeId,
      awayTeamId: awayId,
      stadiumName: getNationalTeamById(homeId).homeStadium,
      played: false,
      status: 'PENDING',
      homeScore: null,
      awayScore: null,
    };
    if (preSimulateCompleted) {
      fix = simulateCpuInternationalFixture(
        fix,
        true,
        `arch_caf_po_${targetYear}_${stage}_${slot}`
      );
    }
    return fix;
  };

  // 1. Semifinais (4 melhores elegíveis fora das 9 vagas diretas da CAF -> 2 jogos em nov1)
  // Em 2030, Marrocos (país-sede) já ocupa 1 das 9 vagas diretas; se não vencer seu grupo, o 9º campeão de grupo entra no Play-Off com os 3 melhores 2ºs não-classificados.
  const hasSf = allOther.some(
    (f) => f.competitionName.includes('Eliminatórias CAF') && f.phase === 'Play-Off CAF · Semifinal'
  );
  if (!hasSf) {
    const sortByRecord = (a: NationalStandingRow, b: NationalStandingRow) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      getNationalTeamById(b.teamId).fifaPoints - getNationalTeamById(a.teamId).fifaPoints;

    const cafDirectSet = new Set<string>(targetYear === 2030 ? ['nt_mar'] : []);
    const groupWinners = groupNames
      .map((g) => byGroup[g]?.[0])
      .filter((r): r is NationalStandingRow => Boolean(r))
      .sort(sortByRecord);
    for (const w of groupWinners) {
      if (cafDirectSet.size >= 9) break;
      cafDirectSet.add(w.teamId);
    }

    const nonDirectWinners = groupWinners.filter((r) => !cafDirectSet.has(r.teamId));
    const eligibleRunners = groupNames
      .map((g) => (byGroup[g] || []).find((r) => !cafDirectSet.has(r.teamId) && !nonDirectWinners.some((nw) => nw.teamId === r.teamId)))
      .filter((r): r is NationalStandingRow => Boolean(r))
      .sort(sortByRecord);

    const playoff4 = [...nonDirectWinners, ...eligibleRunners].slice(0, 4);
    if (playoff4.length === 4) {
      const pairs: [string, string][] = [
        [playoff4[0].teamId, playoff4[3].teamId],
        [playoff4[1].teamId, playoff4[2].teamId],
      ];
      pairs.forEach(([h, a], idx) => {
        const m = makePlayoffMatch('Semifinal', idx + 1, wA.nov1, 33, h, a);
        allOther.push(m);
        newlyAdded.push(m);
      });
    }
  }

  // 2. Final (2 vencedores das Semifinais -> 1 jogo único em nov2; vencedor vai à Repescagem Intercontinental)
  const sfFixes = allOther
    .filter((f) => f.competitionName.includes('Eliminatórias CAF') && f.phase === 'Play-Off CAF · Semifinal')
    .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
  const hasFin = allOther.some(
    (f) => f.competitionName.includes('Eliminatórias CAF') && f.phase === 'Play-Off CAF · Final'
  );
  if (sfFixes.length === 2 && sfFixes.every((f) => f.played) && !hasFin) {
    const w1 = sfFixes[0].winnerTeamId || sfFixes[0].homeTeamId;
    const w2 = sfFixes[1].winnerTeamId || sfFixes[1].homeTeamId;
    const m = makePlayoffMatch('Final', 1, wA.nov2, 34, w1, w2);
    allOther.push(m);
    newlyAdded.push(m);
  }

  if (newlyAdded.length === 0) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const busyNew = new Set<string>();
  newlyAdded.forEach((m) => {
    if (m.date) {
      busyNew.add(`${m.homeTeamId}_${m.date}`);
      busyNew.add(`${m.awayTeamId}_${m.date}`);
    }
  });

  const cleanedSchedule = seasonSchedule
    ? seasonSchedule.filter(
        (f) =>
          f.played ||
          f.competition !== 'friendly' ||
          !f.date ||
          (!busyNew.has(`${f.homeTeamId}_${f.date}`) && !busyNew.has(`${f.awayTeamId}_${f.date}`))
      )
    : undefined;

  return {
    qualifiers: {
      ...qualifiers,
      otherConfedFixtures: allOther,
    },
    cleanedSchedule,
  };
}

export const EURO_2028_COHOSTS: string[] = ['nt_ing', 'nt_esc', 'nt_gal', 'nt_irl'];

export const WORLD_CUP_2030_COHOSTS: string[] = [
  'nt_esp',
  'nt_por',
  'nt_mar',
  'nt_uru',
  'nt_arg',
  'nt_par',
];

export interface WorldCupSlotAllocationRow {
  key: ConfederationCode | 'INTERCONTINENTAL';
  confederationLabel: string;
  totalDirectSpots: number;
  hostSpots: number;
  hostNamesLabel: string;
  qualifierSpots: number;
  intercontinentalPlayoffBerths: number;
  intercontinentalLabel: string;
}

export function getWorldCup48SlotsSummary(targetWorldCupYear: number): WorldCupSlotAllocationRow[] {
  const is2030 = targetWorldCupYear === 2030;
  return [
    {
      key: 'UEFA',
      confederationLabel: 'UEFA (Europa)',
      totalDirectSpots: 16,
      hostSpots: is2030 ? 2 : 0,
      hostNamesLabel: is2030 ? '2 (Espanha, Portugal)' : '0',
      qualifierSpots: is2030 ? 14 : 16,
      intercontinentalPlayoffBerths: 0,
      intercontinentalLabel: '0 (tem repescagem interna)',
    },
    {
      key: 'CAF',
      confederationLabel: 'CAF (África)',
      totalDirectSpots: 9,
      hostSpots: is2030 ? 1 : 0,
      hostNamesLabel: is2030 ? '1 (Marrocos)' : '0',
      qualifierSpots: is2030 ? 8 : 9,
      intercontinentalPlayoffBerths: 1,
      intercontinentalLabel: '1 vaga',
    },
    {
      key: 'AFC',
      confederationLabel: 'AFC (Ásia)',
      totalDirectSpots: 8,
      hostSpots: 0,
      hostNamesLabel: '0',
      qualifierSpots: 8,
      intercontinentalPlayoffBerths: 1,
      intercontinentalLabel: '1 vaga',
    },
    {
      key: 'CONMEBOL',
      confederationLabel: 'CONMEBOL (América do Sul)',
      totalDirectSpots: 6,
      hostSpots: is2030 ? 3 : 0,
      hostNamesLabel: is2030 ? '3 (Argentina, Paraguai, Uruguai)' : '0',
      qualifierSpots: is2030 ? 3 : 6,
      intercontinentalPlayoffBerths: 1,
      intercontinentalLabel: '1 vaga',
    },
    {
      key: 'CONCACAF',
      confederationLabel: 'CONCACAF (América do Norte/Central)',
      totalDirectSpots: 6,
      hostSpots: 0,
      hostNamesLabel: '0',
      qualifierSpots: 6,
      intercontinentalPlayoffBerths: 2,
      intercontinentalLabel: '2 vagas (1 + 1 sede anterior)',
    },
    {
      key: 'OFC',
      confederationLabel: 'OFC (Oceania)',
      totalDirectSpots: 1,
      hostSpots: 0,
      hostNamesLabel: '0',
      qualifierSpots: 1,
      intercontinentalPlayoffBerths: 1,
      intercontinentalLabel: '1 vaga',
    },
    {
      key: 'INTERCONTINENTAL',
      confederationLabel: 'Repescagem Intercontinental',
      totalDirectSpots: 2,
      hostSpots: 0,
      hostNamesLabel: '—',
      qualifierSpots: 0,
      intercontinentalPlayoffBerths: 0,
      intercontinentalLabel: 'Disputada pelas 6 seleções acima',
    },
  ];
}

const UEFA_FORBIDDEN_DRAW_PAIRS: [string, string][] = [
  ['nt_esp', 'nt_gib'],
  ['nt_ser', 'nt_kos'],
];

function isInternationalFixtureKnockout(fix: InternationalMatchFixture): boolean {
  if (fix.group) return false;
  if (
    fix.phase.includes('(Ida)') ||
    fix.phase.includes('· Ida') ||
    fix.phase.includes('(Volta)') ||
    fix.phase.includes('· Volta')
  ) {
    return false;
  }
  if (fix.competition === 'friendly') return false;
  if (fix.competition === 'wc_qualifiers' || fix.competition === 'continental_qualifiers') {
    return (
      fix.phase.startsWith('Play-Off') ||
      fix.phase.startsWith('Repescagem Intercontinental')
    );
  }
  return true;
}

function resolveTwoLeggedTieWinner(
  leg1: InternationalMatchFixture,
  leg2: InternationalMatchFixture,
  seedKey: string
): { winnerId: string; aggHomeLeg2: number; aggAwayLeg2: number } {
  // leg1: (teamA home vs teamB away), leg2: (teamB home vs teamA away)
  const teamB = leg2.homeTeamId;
  const teamA = leg2.awayTeamId;
  const leg1TeamB = leg1.homeTeamId === teamB ? leg1.homeScore ?? 0 : leg1.awayScore ?? 0;
  const leg1TeamA = leg1.homeTeamId === teamA ? leg1.homeScore ?? 0 : leg1.awayScore ?? 0;
  const aggB = leg1TeamB + (leg2.homeScore ?? 0);
  const aggA = leg1TeamA + (leg2.awayScore ?? 0);

  if (aggB > aggA) return { winnerId: teamB, aggHomeLeg2: aggB, aggAwayLeg2: aggA };
  if (aggA > aggB) return { winnerId: teamA, aggHomeLeg2: aggB, aggAwayLeg2: aggA };

  if (leg2.winnerTeamId === teamB || leg2.winnerTeamId === teamA) {
    return { winnerId: leg2.winnerTeamId, aggHomeLeg2: aggB, aggAwayLeg2: aggA };
  }
  const strB = getNationalTeamById(teamB).strength;
  const strA = getNationalTeamById(teamA).strength;
  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) {
    hash = (hash * 31 + seedKey.charCodeAt(i)) >>> 0;
  }
  const probB = 0.5 + Math.max(-0.15, Math.min(0.15, (strB - strA) * 0.01));
  const roll = (hash % 1000) / 1000;
  return { winnerId: roll < probB ? teamB : teamA, aggHomeLeg2: aggB, aggAwayLeg2: aggA };
}

/**
 * Gera 6 rodadas no sistema suíço da nova UEFA Nations League (2028/29+) e Liga 2 das Eliminatórias UEFA:
 * Grupo de 6 seleções divididas em 3 potes de 2:
 * - Rodadas 1 a 5: turno único contra os 5 adversários do grupo
 * - Rodada 6: confronto de volta contra o rival do mesmo pote (invertendo o mando de campo)
 * Total: 6 jogos por seleção contra 5 adversários distintos (3 partidas por rodada).
 */
function generateUefaSwiss6RoundPairs(groupOf6: string[]): [string, string][][] {
  if (groupOf6.length !== 6) {
    const raw = generateRoundRobinPairs(groupOf6);
    return raw.slice(0, 6);
  }
  const first5 = generateRoundRobinPairs(groupOf6).slice(0, 5);
  const samePotPairs: [string, string][] = [
    [groupOf6[0], groupOf6[1]],
    [groupOf6[2], groupOf6[3]],
    [groupOf6[4], groupOf6[5]],
  ];
  const round6: [string, string][] = samePotPairs.map(([a, b]) => {
    let aWasHome = false;
    for (const rd of first5) {
      for (const [h, aw] of rd) {
        if (h === a && aw === b) aWasHome = true;
      }
    }
    return aWasHome ? [b, a] : [a, b];
  });
  return [...first5, round6];
}

/**
 * Gera exatamente 6 rodadas no Sistema Suíço da Liga 1 das Eliminatórias Europeias (Copa 2030+):
 * Grupo de 12 seleções separadas em 3 potes de 4 (Pote 1: 0..3, Pote 2: 4..7, Pote 3: 8..11).
 * Cada seleção disputa exatamente 6 jogos (3 em casa e 3 fora) contra 6 adversários diferentes
 * (2 rivais de cada pote), em 6 rodadas com 6 jogos por rodada.
 */
function generateUefaLeague1SwissPairs(groupOf12: string[]): [string, string][][] {
  if (groupOf12.length !== 12) {
    return generateRoundRobinPairs(groupOf12).slice(0, 6);
  }
  const A = groupOf12.slice(0, 4);
  const B = groupOf12.slice(4, 8);
  const C = groupOf12.slice(8, 12);

  return [
    // Rodada 1: A(H) vs B(A), C internos
    [
      [A[0], B[0]],
      [A[1], B[1]],
      [A[2], B[2]],
      [A[3], B[3]],
      [C[0], C[1]],
      [C[2], C[3]],
    ],
    // Rodada 2: B(H) vs C(A), A internos
    [
      [B[0], C[0]],
      [B[1], C[1]],
      [B[2], C[2]],
      [B[3], C[3]],
      [A[0], A[1]],
      [A[2], A[3]],
    ],
    // Rodada 3: C(H) vs A(A), B internos
    [
      [C[0], A[0]],
      [C[1], A[1]],
      [C[2], A[2]],
      [C[3], A[3]],
      [B[0], B[1]],
      [B[2], B[3]],
    ],
    // Rodada 4: B(H) vs A(A) deslocado, C internos deslocado
    [
      [B[1], A[0]],
      [B[2], A[1]],
      [B[3], A[2]],
      [B[0], A[3]],
      [C[1], C[2]],
      [C[3], C[0]],
    ],
    // Rodada 5: C(H) vs B(A) deslocado, A internos deslocado
    [
      [C[1], B[0]],
      [C[2], B[1]],
      [C[3], B[2]],
      [C[0], B[3]],
      [A[1], A[2]],
      [A[3], A[0]],
    ],
    // Rodada 6: A(H) vs C(A) deslocado, B internos deslocado
    [
      [A[1], C[0]],
      [A[2], C[1]],
      [A[3], C[2]],
      [A[0], C[3]],
      [B[1], B[2]],
      [B[3], B[0]],
    ],
  ];
}

function assignUefaEuroGroupsWithConstraints(
  teamIds: string[],
  seedOffset: number,
  protected4TeamGroupIds: string[] = []
): Record<string, string> {
  // 54 seleções UEFA: 6 grupos de 4 (Grupo A–F, jogam Set–Nov) + 6 grupos de 5 (Grupo G–L, jogam Mar–Nov).
  // Os 8 quadrifinalistas da Liga A da Nations League ficam obrigatoriamente em Grupo A–F (zero conflito em Mar/Jun).
  // Restrições políticas oficiais: Espanha × Gibraltar e Sérvia × Kosovo nunca no mesmo grupo.
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const capacities = [4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5];
  const buckets: string[][] = Array.from({ length: 12 }, () => []);

  const sortedBySeed = [...teamIds].sort((a, b) => {
    const fa = getNationalTeamById(a).fifaPoints;
    const fb = getNationalTeamById(b).fifaPoints;
    if (fb !== fa) return fb - fa;
    return a.localeCompare(b);
  });

  const protectedUnique = Array.from(new Set(protected4TeamGroupIds)).filter((id) =>
    teamIds.includes(id)
  );
  const protectedSet = new Set(protectedUnique);
  const nonProtected = sortedBySeed.filter((id) => !protectedSet.has(id));

  const hasPoliticalConflict = (groupMembers: string[], candidateId: string): boolean =>
    UEFA_FORBIDDEN_DRAW_PAIRS.some(
      ([x, y]) =>
        (candidateId === x && groupMembers.includes(y)) ||
        (candidateId === y && groupMembers.includes(x))
    );

  // 1. Place protected Nations League QF teams strictly inside Groups A–F (indices 0..5)
  protectedUnique.forEach((tid, idx) => {
    const preferred = (idx + seedOffset) % 6;
    let placed = false;
    for (let step = 0; step < 6; step++) {
      const gIdx = (preferred + step) % 6;
      if (buckets[gIdx].length < capacities[gIdx] && !hasPoliticalConflict(buckets[gIdx], tid)) {
        buckets[gIdx].push(tid);
        placed = true;
        break;
      }
    }
    if (!placed) {
      for (let gIdx = 0; gIdx < 6; gIdx++) {
        if (buckets[gIdx].length < capacities[gIdx]) {
          buckets[gIdx].push(tid);
          break;
        }
      }
    }
  });

  // 2. Distribute remaining teams across all 12 groups in balanced seed waves avoiding political conflicts
  nonProtected.forEach((tid, idx) => {
    const wave = Math.floor(idx / 12);
    const pos = idx % 12;
    const order = Array.from({ length: 12 }, (_, k) =>
      wave % 2 === 0 ? (pos + k + seedOffset) % 12 : (11 - ((pos + k + seedOffset) % 12))
    );
    // Prefer filling groups with smallest current ratio to keep pots balanced
    order.sort((a, b) => {
      const fullA = buckets[a].length >= capacities[a] ? 1 : 0;
      const fullB = buckets[b].length >= capacities[b] ? 1 : 0;
      if (fullA !== fullB) return fullA - fullB;
      return buckets[a].length - buckets[b].length;
    });

    let targetIdx = order.find(
      (gIdx) => buckets[gIdx].length < capacities[gIdx] && !hasPoliticalConflict(buckets[gIdx], tid)
    );

    // If only conflicting open group remains, swap with another group
    if (targetIdx === undefined) {
      const openIdx = order.find((gIdx) => buckets[gIdx].length < capacities[gIdx]);
      if (openIdx !== undefined) {
        let swapped = false;
        for (let alt = 0; alt < 12; alt++) {
          if (alt === openIdx) continue;
          const altMembers = buckets[alt];
          const swapCandIdx = altMembers.findIndex(
            (m) =>
              (!protectedSet.has(m) || openIdx < 6) &&
              !hasPoliticalConflict(buckets[openIdx], m) &&
              !hasPoliticalConflict(
                altMembers.filter((x) => x !== m),
                tid
              )
          );
          if (swapCandIdx >= 0) {
            const moved = altMembers[swapCandIdx];
            altMembers[swapCandIdx] = tid;
            buckets[openIdx].push(moved);
            swapped = true;
            break;
          }
        }
        if (!swapped) {
          buckets[openIdx].push(tid);
        }
      }
    } else {
      buckets[targetIdx].push(tid);
    }
  });

  const groupMap: Record<string, string> = {};
  groupLetters.forEach((letter, idx) => {
    const gName = `Grupo ${letter}`;
    buckets[idx].forEach((tid) => {
      groupMap[tid] = gName;
    });
  });
  return groupMap;
}

function getUefaWcDirectAndPlayoffSeeding(
  qualifiers: WorldCupQualifiersCycle,
  rankingPoints?: Record<string, number>
): {
  directTeamIds: string[];
  playoffSeeds: string[]; // 16 teams: Potes 1-3 (12 Liga 1 por ranking FIFA) + Pote 4 (4 Liga 2)
} {
  const targetYear = qualifiers.targetWorldCupYear;
  const uefaRows = qualifiers.otherConfedStandings.UEFA || [];
  const byGroup: Record<string, NationalStandingRow[]> = {};
  uefaRows.forEach((r) => {
    const g = r.group || 'Grupo A';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(r);
  });

  const l1Groups = Object.keys(byGroup)
    .filter((g) => g.startsWith('Liga 1'))
    .sort();
  const l2Groups = Object.keys(byGroup)
    .filter((g) => g.startsWith('Liga 2'))
    .sort();

  const getFifaPts = (tid: string) =>
    rankingPoints?.[tid] ?? getNationalTeamById(tid).fifaPoints;

  if (l1Groups.length === 0) {
    // Legacy 12-group fallback
    const allGroups = Object.keys(byGroup).sort();
    const direct: string[] = [];
    if (targetYear === 2030) {
      ['nt_esp', 'nt_por'].forEach((hid) => direct.push(hid));
    }
    allGroups.forEach((g) => {
      if (byGroup[g]?.[0] && !direct.includes(byGroup[g][0].teamId)) {
        direct.push(byGroup[g][0].teamId);
      }
    });
    const runners = allGroups
      .map((g) => byGroup[g]?.[1])
      .filter((r): r is NationalStandingRow => Boolean(r) && !direct.includes(r.teamId))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
    runners.slice(0, Math.max(0, 16 - direct.length)).forEach((r) => {
      if (!direct.includes(r.teamId)) direct.push(r.teamId);
    });
    return { directTeamIds: direct.slice(0, 16), playoffSeeds: [] };
  }

  const hostGuaranteed = targetYear === 2030 ? ['nt_esp', 'nt_por'] : [];
  const directSet = new Set<string>(hostGuaranteed);

  const sortCrossGroupRows = (rows: NationalStandingRow[]) =>
    [...rows].sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        getNationalTeamById(b.teamId).fifaPoints - getNationalTeamById(a.teamId).fifaPoints
    );

  // Direct berths from Liga 1:
  // Preserva a ordem já calculada por recomputeNationalStandings (incluindo confronto direto FIFA!)
  // para evitar que pontos FIFA ganhos no Play-Off alterem os 12 classificados diretos.
  // - Em 2030: Espanha e Portugal (2 anfitriões garantidos) + 10 melhores elegíveis da Liga 1 (top 3 de cada grupo = 9 + melhor 4º elegível = 10) = 12 diretos
  // - Em 2034/2038: Top 4 de cada um dos 3 grupos da Liga 1 = 12 diretos
  const directPerGroup = targetYear === 2030 ? 3 : 4;
  const eligibleLeftByGroup: Record<string, NationalStandingRow[]> = {};

  for (const g of l1Groups) {
    const eligible = (byGroup[g] || []).filter((r) => !directSet.has(r.teamId));
    eligible.slice(0, directPerGroup).forEach((r) => directSet.add(r.teamId));
    eligibleLeftByGroup[g] = eligible.slice(directPerGroup);
  }

  if (targetYear === 2030) {
    const fourthCandidates = l1Groups
      .map((g) => eligibleLeftByGroup[g]?.[0])
      .filter((r): r is NationalStandingRow => Boolean(r));
    const bestFourth = sortCrossGroupRows(fourthCandidates)[0];
    if (bestFourth) {
      directSet.add(bestFourth.teamId);
      for (const g of l1Groups) {
        eligibleLeftByGroup[g] = eligibleLeftByGroup[g].filter(
          (r) => r.teamId !== bestFourth.teamId
        );
      }
    }
  }

  // Next 12 eligible teams from Liga 1, ordenadas pelo Ranking FIFA em Potes 1 (0..3), 2 (4..7) e 3 (8..11)
  const l1RemainingPool = sortCrossGroupRows(l1Groups.flatMap((g) => eligibleLeftByGroup[g] || []));
  const l1Playoff12 = l1RemainingPool
    .slice(0, 12)
    .map((r) => r.teamId)
    .sort((a, b) => getFifaPts(b) - getFifaPts(a));

  // Pote 4: 4 melhores seleções da Liga 2 / Nations League sem vaga direta
  const l2Winners = l2Groups
    .map((g) => (byGroup[g] || []).find((r) => !directSet.has(r.teamId)))
    .filter((r): r is NationalStandingRow => Boolean(r));
  const l2Runners = sortCrossGroupRows(
    l2Groups
      .map((g) => (byGroup[g] || []).filter((r) => !directSet.has(r.teamId))[1])
      .filter((r): r is NationalStandingRow => Boolean(r))
  );
  const l2Playoff4 = [...l2Winners, ...(l2Runners[0] ? [l2Runners[0]] : [])]
    .map((r) => r.teamId)
    .slice(0, 4)
    .sort((a, b) => getFifaPts(b) - getFifaPts(a));

  const playoffSeeds = Array.from(new Set([...l1Playoff12, ...l2Playoff4])).slice(0, 16);

  return {
    directTeamIds: Array.from(directSet),
    playoffSeeds,
  };
}

/**
 * Avança automaticamente a Repescagem Europeia (Play-Off UEFA) das Eliminatórias da Copa do Mundo:
 * 16 seleções em 4 potes (Potes 1–3 pelo Ranking FIFA + Pote 4 da Liga 2/Nations League)
 * disputam 4 chaves (Caminhos A, B, C e D) em Março do ano da Copa (wB.mar1 Semifinais: Pote 1×4 e Pote 2×3;
 * wB.mar2 Finais em jogo único com mando do melhor ranqueado) pelas últimas 4 vagas europeias!
 */
function advanceUefaWcPlayoffStages(
  qualifiers: WorldCupQualifiersCycle,
  seasonSchedule?: InternationalMatchFixture[],
  preSimulateCompleted: boolean = false,
  rankingPoints?: Record<string, number>
): {
  qualifiers: WorldCupQualifiersCycle;
  cleanedSchedule?: InternationalMatchFixture[];
} {
  const targetYear = qualifiers.targetWorldCupYear;
  const wB = getFifaWindowDatesForYear(targetYear);
  const allOther = [...qualifiers.otherConfedFixtures];

  const uefaGroupFixtures = allOther.filter(
    (f) => f.competitionName.includes('Eliminatórias UEFA') && Boolean(f.group)
  );
  if (uefaGroupFixtures.length === 0 || !uefaGroupFixtures.every((f) => f.played)) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const hasLiga1 = (qualifiers.otherConfedStandings.UEFA || []).some((r) =>
    (r.group || '').startsWith('Liga 1')
  );
  if (!hasLiga1) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const getFifaPts = (tid: string) =>
    rankingPoints?.[tid] ?? getNationalTeamById(tid).fifaPoints;

  const newlyAdded: InternationalMatchFixture[] = [];
  const makePlayoffMatch = (
    stage: 'Semifinal' | 'Final',
    slot: number,
    date: string,
    triggerRound: number,
    homeId: string,
    awayId: string
  ): InternationalMatchFixture => {
    const pathLetter = String.fromCharCode(65 + (stage === 'Semifinal' ? Math.floor((slot - 1) / 2) : slot - 1));
    let fix: InternationalMatchFixture = {
      id: `wcq_${targetYear}_UEFA_playoff_${stage === 'Semifinal' ? 'sf' : 'fin'}_${slot}`,
      competition: 'wc_qualifiers',
      competitionName: `Eliminatórias UEFA · Copa ${targetYear}`,
      seasonYear: targetYear,
      triggerRound,
      date,
      time: '16:45',
      dateLabel: `${formatShortDate(date)} · Play-Off UEFA · Chave ${pathLetter} (${stage})`,
      phase: `Play-Off UEFA · ${stage}`,
      knockoutSlot: slot,
      homeTeamId: homeId,
      awayTeamId: awayId,
      stadiumName: getNationalTeamById(homeId).homeStadium,
      played: false,
      status: 'PENDING',
      homeScore: null,
      awayScore: null,
    };
    if (preSimulateCompleted) {
      fix = simulateCpuInternationalFixture(
        fix,
        true,
        `arch_uefa_wcpo_${targetYear}_${stage}_${slot}`
      );
    }
    return fix;
  };

  // 1. Semifinais (4 chaves × 2 jogos = 8 Semifinais em wB.mar1: Pote 1×4 e Pote 2×3, mando do melhor ranqueado)
  const hasSf = allOther.some(
    (f) => f.competitionName.includes('Eliminatórias UEFA') && f.phase === 'Play-Off UEFA · Semifinal'
  );
  if (!hasSf) {
    const { playoffSeeds } = getUefaWcDirectAndPlayoffSeeding(qualifiers, rankingPoints);
    if (playoffSeeds.length === 16) {
      const pairs: [string, string][] = [
        // Chave A: Pote 1 vs Pote 4 | Pote 2 vs Pote 3
        [playoffSeeds[0], playoffSeeds[15]],
        [playoffSeeds[4], playoffSeeds[11]],
        // Chave B
        [playoffSeeds[1], playoffSeeds[14]],
        [playoffSeeds[5], playoffSeeds[10]],
        // Chave C
        [playoffSeeds[2], playoffSeeds[13]],
        [playoffSeeds[6], playoffSeeds[9]],
        // Chave D
        [playoffSeeds[3], playoffSeeds[12]],
        [playoffSeeds[7], playoffSeeds[8]],
      ];
      pairs.forEach(([h, a], idx) => {
        const m = makePlayoffMatch('Semifinal', idx + 1, wB.mar1, 6, h, a);
        allOther.push(m);
        newlyAdded.push(m);
      });
    }
  }

  // 2. Finais das 4 Chaves (4 jogos em wB.mar2 -> 4 vagas na Copa do Mundo; mando do melhor ranqueado FIFA!)
  const sfFixes = allOther
    .filter((f) => f.competitionName.includes('Eliminatórias UEFA') && f.phase === 'Play-Off UEFA · Semifinal')
    .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
  const hasFin = allOther.some(
    (f) => f.competitionName.includes('Eliminatórias UEFA') && f.phase === 'Play-Off UEFA · Final'
  );
  if (sfFixes.length === 8 && sfFixes.every((f) => f.played) && !hasFin) {
    for (let i = 0; i < 4; i++) {
      const w1 = sfFixes[i * 2].winnerTeamId || sfFixes[i * 2].homeTeamId;
      const w2 = sfFixes[i * 2 + 1].winnerTeamId || sfFixes[i * 2 + 1].homeTeamId;
      const [hostId, guestId] = getFifaPts(w1) >= getFifaPts(w2) ? [w1, w2] : [w2, w1];
      const m = makePlayoffMatch('Final', i + 1, wB.mar2, 7, hostId, guestId);
      allOther.push(m);
      newlyAdded.push(m);
    }
  }

  if (newlyAdded.length === 0) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const busyNew = new Set<string>();
  newlyAdded.forEach((m) => {
    if (m.date) {
      busyNew.add(`${m.homeTeamId}_${m.date}`);
      busyNew.add(`${m.awayTeamId}_${m.date}`);
    }
  });

  // If Finalíssima UEFA team is in Play-Off UEFA on mar1, swap to best free UEFA team AND remove any colliding friendly for that swapped team too
  const mappedSchedule = seasonSchedule
    ? seasonSchedule.map((f) => {
        if (
          !f.played &&
          f.competition === 'finalissima' &&
          f.date &&
          busyNew.has(`${f.awayTeamId}_${f.date}`)
        ) {
          const freeUefa = NATIONAL_TEAMS_CATALOG.filter(
            (t) => t.confederation === 'UEFA' && !busyNew.has(`${t.id}_${f.date}`)
          ).sort((a, b) => b.fifaPoints - a.fifaPoints)[0];
          if (freeUefa) {
            busyNew.add(`${freeUefa.id}_${f.date}`);
            return { ...f, awayTeamId: freeUefa.id };
          }
        }
        return f;
      })
    : undefined;

  const cleanedSchedule = mappedSchedule
    ? mappedSchedule.filter(
        (f) =>
          f.played ||
          f.competition !== 'friendly' ||
          !f.date ||
          (!busyNew.has(`${f.homeTeamId}_${f.date}`) && !busyNew.has(`${f.awayTeamId}_${f.date}`))
      )
    : undefined;

  return {
    qualifiers: {
      ...qualifiers,
      otherConfedFixtures: allOther,
    },
    cleanedSchedule,
  };
}

export interface IntercontinentalPlayoffParticipant {
  teamId: string;
  confederation: ConfederationCode;
  qualificationLabel: string;
  fifaPoints: number;
  seedRank: number; // 1..6 (1 e 2 avançam direto às Finais; 3..6 jogam Semifinais)
  hasByeToFinal: boolean;
}

/**
 * Resolve as exatamente 6 seleções da Repescagem Intercontinental FIFA (2 vagas finais na Copa):
 * 1 CAF (vencedor Play-Off CAF), 1 AFC (vencedor Play-Off AFC), 1 CONMEBOL (melhor fora das 6 diretas),
 * 1 OFC (2º colocado) e 2 CONCACAF (7º e 8º gerais — 1 vaga padrão + 1 extra como confederação sede anterior).
 * As 2 melhores no Ranking FIFA avançam direto às Finais; as 4 piores disputam 2 Semifinais.
 */
export function getIntercontinentalPlayoffParticipants(
  qualifiers: WorldCupQualifiersCycle,
  rankingPoints?: Record<string, number>
): IntercontinentalPlayoffParticipant[] {
  const isWc2030 = qualifiers.targetWorldCupYear === 2030;
  const getFifaPts = (tid: string) =>
    rankingPoints?.[tid] ?? getNationalTeamById(tid).fifaPoints;

  const sortRows = (rows: NationalStandingRow[]) =>
    [...rows].sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        getFifaPts(b.teamId) - getFifaPts(a.teamId)
    );

  const getGrouped = (rows: NationalStandingRow[]) => {
    const byG: Record<string, NationalStandingRow[]> = {};
    rows.forEach((r) => {
      const g = r.group || 'Grupo A';
      if (!byG[g]) byG[g] = [];
      byG[g].push(r);
    });
    return Object.keys(byG)
      .sort()
      .map((g) => byG[g]);
  };

  const picked: { teamId: string; confederation: ConfederationCode; qualificationLabel: string }[] = [];
  const addPicked = (teamId: string | undefined, confederation: ConfederationCode, qualificationLabel: string) => {
    if (teamId && !picked.some((p) => p.teamId === teamId)) {
      picked.push({ teamId, confederation, qualificationLabel });
    }
  };

  // 1. CONMEBOL (1 vaga): melhor seleção fora das 6 vagas diretas (em 2030: 4ª melhor excluindo ARG/PAR/URU; em 2034+: 7ª colocada)
  const conmebolDirect: string[] = [];
  if (isWc2030) {
    ['nt_arg', 'nt_par', 'nt_uru'].forEach((hid) => conmebolDirect.push(hid));
  }
  for (const r of qualifiers.conmebolStandings) {
    if (conmebolDirect.length >= 6) break;
    if (!conmebolDirect.includes(r.teamId)) conmebolDirect.push(r.teamId);
  }
  const conmebolIc = qualifiers.conmebolStandings.find((r) => !conmebolDirect.includes(r.teamId))?.teamId;
  addPicked(
    conmebolIc,
    'CONMEBOL',
    isWc2030 ? 'CONMEBOL · 4ª melhor (não-sede)' : 'CONMEBOL · 7º colocado'
  );

  // 2. CAF (1 vaga): vencedor do Play-Off CAF (ou melhor elegível fora das 9 diretas)
  const cafGroups = getGrouped(qualifiers.otherConfedStandings.CAF || []);
  const cafDirect: string[] = isWc2030 ? ['nt_mar'] : [];
  const cafWinners = sortRows(
    cafGroups.map((rows) => rows[0]).filter((r): r is NationalStandingRow => Boolean(r))
  );
  for (const w of cafWinners) {
    if (cafDirect.length >= 9) break;
    if (!cafDirect.includes(w.teamId)) cafDirect.push(w.teamId);
  }
  const cafPlayoffFinal = qualifiers.otherConfedFixtures.find(
    (f) => f.competitionName.includes('Eliminatórias CAF') && f.phase === 'Play-Off CAF · Final' && f.played
  );
  const cafFallback = sortRows(
    cafGroups.flatMap((rows) => rows.filter((r) => !cafDirect.includes(r.teamId)).slice(0, 1))
  )[0]?.teamId;
  const cafIc = cafPlayoffFinal
    ? cafPlayoffFinal.winnerTeamId || cafPlayoffFinal.homeTeamId
    : cafFallback;
  addPicked(cafIc, 'CAF', 'CAF · Campeão Play-Off África');

  // 3. AFC (1 vaga): vencedor do Play-Off AFC (ou melhor 2º colocado)
  const afcGroups = getGrouped(qualifiers.otherConfedStandings.AFC || []);
  const afcPlayoffFinal = qualifiers.otherConfedFixtures.find(
    (f) => f.competitionName.includes('Eliminatórias AFC') && f.phase === 'Play-Off AFC · Final' && f.played
  );
  let afcIc: string | undefined;
  if (afcPlayoffFinal) {
    afcIc = afcPlayoffFinal.winnerTeamId || afcPlayoffFinal.homeTeamId;
  } else if (afcGroups.length >= 8) {
    afcIc = sortRows(
      afcGroups.map((rows) => rows[1]).filter((r): r is NationalStandingRow => Boolean(r))
    )[0]?.teamId;
  } else {
    afcIc = sortRows(
      afcGroups.map((rows) => rows[2]).filter((r): r is NationalStandingRow => Boolean(r))
    )[2]?.teamId;
  }
  addPicked(afcIc, 'AFC', 'AFC · Campeão Play-Off Ásia');

  // 4. CONCACAF (2 vagas): 7º e 8º gerais (3º e 4º melhores 2ºs colocados — 1 vaga padrão + 1 vaga extra como sede anterior)
  const concacafGroups = getGrouped(qualifiers.otherConfedStandings.CONCACAF || []);
  if (concacafGroups.length >= 4) {
    const concDirectSet = new Set<string>();
    concacafGroups.forEach((rows) => {
      if (rows[0]) concDirectSet.add(rows[0].teamId);
    });
    const concRunners = sortRows(
      concacafGroups.map((rows) => rows[1]).filter((r): r is NationalStandingRow => Boolean(r))
    );
    concRunners.slice(0, 2).forEach((r) => concDirectSet.add(r.teamId));
    const concRemaining = sortRows([
      ...concRunners.slice(2),
      ...concacafGroups.map((rows) => rows[2]).filter((r): r is NationalStandingRow => Boolean(r)),
    ]).filter((r) => !concDirectSet.has(r.teamId));
    addPicked(concRemaining[0]?.teamId, 'CONCACAF', 'CONCACAF · 7º geral (Vaga 1)');
    addPicked(concRemaining[1]?.teamId, 'CONCACAF', 'CONCACAF · 8º geral (Vaga 2)');
  } else {
    const concFourths = sortRows(
      concacafGroups.map((rows) => rows[3]).filter((r): r is NationalStandingRow => Boolean(r))
    );
    addPicked(concFourths[0]?.teamId, 'CONCACAF', 'CONCACAF · Repescagem 1');
    addPicked(concFourths[1]?.teamId, 'CONCACAF', 'CONCACAF · Repescagem 2');
  }

  // 5. OFC (1 vaga): 2º colocado da tabela única da Oceania
  const ofcGroups = getGrouped(qualifiers.otherConfedStandings.OFC || []);
  const ofcIc =
    ofcGroups.length >= 2
      ? sortRows(ofcGroups.map((rows) => rows[0]).filter((r): r is NationalStandingRow => Boolean(r)))[1]?.teamId
      : ofcGroups[0]?.[1]?.teamId;
  addPicked(ofcIc, 'OFC', 'OFC · Vice-líder Oceania');

  // Ordena as 6 seleções pelo Ranking FIFA: Top 2 avançam direto às Finais; 3º–6º jogam Semifinais
  const ranked = picked
    .map((p) => ({ ...p, fifaPoints: getFifaPts(p.teamId) }))
    .sort((a, b) => b.fifaPoints - a.fifaPoints || a.teamId.localeCompare(b.teamId));

  return ranked.map((p, idx) => ({
    ...p,
    seedRank: idx + 1,
    hasByeToFinal: idx < 2,
  }));
}

/**
 * Avança automaticamente a Repescagem Intercontinental FIFA (6 Seleções -> 2 Vagas na Copa):
 * Disputada em Março do ano da Copa (wB.mar1: 2 Semifinais entre as 4 piores ranqueadas FIFA;
 * wB.mar2: 2 Finais contra as 2 melhores ranqueadas FIFA), evitando confrontos da mesma confederação.
 */
function advanceIntercontinentalWcPlayoffStages(
  qualifiers: WorldCupQualifiersCycle,
  rankingPoints?: Record<string, number>,
  seasonSchedule?: InternationalMatchFixture[],
  preSimulateCompleted: boolean = false
): {
  qualifiers: WorldCupQualifiersCycle;
  cleanedSchedule?: InternationalMatchFixture[];
} {
  const targetYear = qualifiers.targetWorldCupYear;
  const wB = getFifaWindowDatesForYear(targetYear);
  const allOther = [...qualifiers.otherConfedFixtures];

  // Aguarda conclusão de todas as eliminatórias das 5 confederações participantes (CONMEBOL, CAF+Play-Off, AFC+Play-Off, CONCACAF, OFC)
  const conmebolDone =
    qualifiers.conmebolFixtures.length > 0 && qualifiers.conmebolFixtures.every((f) => f.played);
  const cafFixes = allOther.filter((f) => f.competitionName.includes('Eliminatórias CAF'));
  const cafDone =
    cafFixes.length > 0 &&
    cafFixes.every((f) => f.played) &&
    cafFixes.some((f) => f.phase === 'Play-Off CAF · Final' && f.played);
  const afcFixes = allOther.filter((f) => f.competitionName.includes('Eliminatórias AFC'));
  const afcDone =
    afcFixes.length > 0 &&
    afcFixes.every((f) => f.played) &&
    afcFixes.some((f) => f.phase === 'Play-Off AFC · Final' && f.played);
  const concFixes = allOther.filter((f) => f.competitionName.includes('Eliminatórias CONCACAF'));
  const concDone = concFixes.length > 0 && concFixes.every((f) => f.played);
  const ofcFixes = allOther.filter((f) => f.competitionName.includes('Eliminatórias OFC'));
  const ofcDone = ofcFixes.length > 0 && ofcFixes.every((f) => f.played);

  if (!conmebolDone || !cafDone || !afcDone || !concDone || !ofcDone) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const participants = getIntercontinentalPlayoffParticipants(qualifiers, rankingPoints);
  if (participants.length < 6) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const newlyAdded: InternationalMatchFixture[] = [];
  const makeIcMatch = (
    stage: 'Semifinal' | 'Final',
    slot: number,
    date: string,
    triggerRound: number,
    homeId: string,
    awayId: string
  ): InternationalMatchFixture => {
    let fix: InternationalMatchFixture = {
      id: `wcq_${targetYear}_IC_playoff_${stage === 'Semifinal' ? 'sf' : 'fin'}_${slot}`,
      competition: 'wc_qualifiers',
      competitionName: `Repescagem Intercontinental FIFA · Copa ${targetYear}`,
      seasonYear: targetYear,
      triggerRound,
      date,
      time: slot === 1 ? '18:00' : '21:00',
      dateLabel: `${formatShortDate(date)} · Repescagem Intercontinental · Chave ${slot} (${stage})`,
      phase: `Repescagem Intercontinental · ${stage}`,
      knockoutSlot: slot,
      homeTeamId: homeId,
      awayTeamId: awayId,
      stadiumName: getNationalTeamById(homeId).homeStadium,
      played: false,
      status: 'PENDING',
      homeScore: null,
      awayScore: null,
    };
    if (preSimulateCompleted) {
      fix = simulateCpuInternationalFixture(
        fix,
        true,
        `arch_ic_wcpo_${targetYear}_${stage}_${slot}`
      );
    }
    return fix;
  };

  // 1. Semifinais (4 piores ranqueadas: Seeds 3, 4, 5 e 6 -> 2 jogos em wB.mar1 sem confronto da mesma confederação)
  const hasSf = allOther.some(
    (f) => f.phase === 'Repescagem Intercontinental · Semifinal'
  );
  if (!hasSf) {
    const [s3, s4, s5, s6] = participants.slice(2, 6);
    const sameConfDefault =
      s3.confederation === s6.confederation || s4.confederation === s5.confederation;
    const semiPairs: [IntercontinentalPlayoffParticipant, IntercontinentalPlayoffParticipant][] =
      sameConfDefault
        ? [
            [s3, s5],
            [s4, s6],
          ]
        : [
            [s3, s6],
            [s4, s5],
          ];
    semiPairs.forEach(([h, a], idx) => {
      const m = makeIcMatch('Semifinal', idx + 1, wB.mar1, 6, h.teamId, a.teamId);
      allOther.push(m);
      newlyAdded.push(m);
    });
  }

  // 2. Finais (as 2 seleções cabeças de chave que tiveram bye nas Semifinais encaram os 2 vencedores das Semifinais em wB.mar2!)
  const sfFixes = allOther
    .filter((f) => f.phase === 'Repescagem Intercontinental · Semifinal')
    .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
  const hasFin = allOther.some(
    (f) => f.phase === 'Repescagem Intercontinental · Final'
  );
  if (sfFixes.length === 2 && sfFixes.every((f) => f.played) && !hasFin) {
    // Seleciona estritamente as 2 seleções que NÃO jogaram as Semifinais (evita colisão se um vencedor de Semifinal subir no Ranking FIFA!)
    const semiTeamIds = new Set(sfFixes.flatMap((sf) => [sf.homeTeamId, sf.awayTeamId]));
    const byeSeeds = participants.filter((p) => !semiTeamIds.has(p.teamId));
    const seed1 = byeSeeds[0] || participants[0];
    const seed2 = byeSeeds[1] || participants[1];
    const w1 = sfFixes[0].winnerTeamId || sfFixes[0].homeTeamId;
    const w2 = sfFixes[1].winnerTeamId || sfFixes[1].homeTeamId;
    const w1Conf = getNationalTeamById(w1).confederation;
    const w2Conf = getNationalTeamById(w2).confederation;

    // Evita mesma confederação na Final se possível (ex: 2 seleções da CONCACAF)
    const swapFinals =
      (seed1.confederation === w2Conf && seed1.confederation !== w1Conf) ||
      (seed2.confederation === w1Conf && seed2.confederation !== w2Conf);

    const finalPairs: [string, string][] = swapFinals
      ? [
          [seed1.teamId, w1],
          [seed2.teamId, w2],
        ]
      : [
          [seed1.teamId, w2],
          [seed2.teamId, w1],
        ];

    finalPairs.forEach(([h, a], idx) => {
      const m = makeIcMatch('Final', idx + 1, wB.mar2, 7, h, a);
      allOther.push(m);
      newlyAdded.push(m);
    });
  }

  if (newlyAdded.length === 0) {
    return { qualifiers, cleanedSchedule: seasonSchedule };
  }

  const busyNew = new Set<string>();
  newlyAdded.forEach((m) => {
    if (m.date) {
      busyNew.add(`${m.homeTeamId}_${m.date}`);
      busyNew.add(`${m.awayTeamId}_${m.date}`);
    }
  });

  const mappedSchedule = seasonSchedule
    ? seasonSchedule.map((f) => {
        if (
          !f.played &&
          f.competition === 'finalissima' &&
          f.date &&
          busyNew.has(`${f.homeTeamId}_${f.date}`)
        ) {
          const freeConmebol = NATIONAL_TEAMS_CATALOG.filter(
            (t) => t.confederation === 'CONMEBOL' && !busyNew.has(`${t.id}_${f.date}`)
          ).sort((a, b) => b.fifaPoints - a.fifaPoints)[0];
          if (freeConmebol) {
            busyNew.add(`${freeConmebol.id}_${f.date}`);
            return { ...f, homeTeamId: freeConmebol.id };
          }
        }
        return f;
      })
    : undefined;

  const cleanedSchedule = mappedSchedule
    ? mappedSchedule.filter(
        (f) =>
          f.played ||
          f.competition !== 'friendly' ||
          !f.date ||
          (!busyNew.has(`${f.homeTeamId}_${f.date}`) && !busyNew.has(`${f.awayTeamId}_${f.date}`))
      )
    : undefined;

  return {
    qualifiers: {
      ...qualifiers,
      otherConfedFixtures: allOther,
    },
    cleanedSchedule,
  };
}

export function generateWorldCupQualifiersCycle(
  targetWorldCupYear: number,
  preSimulateCompleted: boolean = false
): WorldCupQualifiersCycle {
  const conmebolIds = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'CONMEBOL').map(
    (t) => t.id
  );
  const rrRounds = generateRoundRobinPairs(conmebolIds); // 18 rounds

  const conmebolFixtures: InternationalMatchFixture[] = [];
  rrRounds.forEach((pairs, rIdx) => {
    const qRound = rIdx + 1;
    const meta = getQualifierRoundScheduleMeta(targetWorldCupYear, qRound);
    pairs.forEach(([homeId, awayId], mIdx) => {
      const homeTeam = getNationalTeamById(homeId);
      let fix: InternationalMatchFixture = {
        id: `wcq_${targetWorldCupYear}_conmebol_r${qRound}_m${mIdx}`,
        competition: 'wc_qualifiers',
        competitionName: `Eliminatórias Sul-Americanas · Copa ${targetWorldCupYear}`,
        seasonYear: meta.seasonYear,
        triggerRound: meta.triggerRound,
        date: meta.date,
        time: mIdx % 2 === 0 ? '20:00' : '21:30',
        dateLabel: meta.dateLabel,
        phase: `Rodada ${qRound} de 18`,
        qualifiersRound: qRound,
        homeTeamId: homeId,
        awayTeamId: awayId,
        stadiumName: homeTeam.homeStadium,
        played: false,
        status: 'PENDING',
        homeScore: null,
        awayScore: null,
      };
      if (preSimulateCompleted) {
        fix = simulateCpuInternationalFixture(
          fix,
          false,
          `arch_wcq_${targetWorldCupYear}_${qRound}_${mIdx}`
        );
      }
      conmebolFixtures.push(fix);
    });
  });

  // Other Confederations Qualifying Groups:
  // UEFA (54 -> Novo Modelo Liga 1: 3×12 [36 sel., 6 jogos Set–Nov yA] & Liga 2: 3×6 [18 sel., 6 jogos Mar–Set yA] + Play-Off UEFA 16 sel. Mar yB),
  // CAF (54 -> 9x6, 10 rounds + Play-Off 4 melhores 2ºs), AFC (48 -> 8x6, 10 rounds + Play-Off 8 2ºs),
  // CONCACAF (16 -> 4x4, 6 rounds), OFC (11 -> Grupo Único, turno único = 10 jogos)
  const otherConfeds: ('UEFA' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC')[] = [
    'UEFA',
    'CONCACAF',
    'CAF',
    'AFC',
    'OFC',
  ];
  const otherConfedFixtures: InternationalMatchFixture[] = [];
  const otherConfedStandings: Record<
    'UEFA' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC',
    NationalStandingRow[]
  > = {
    UEFA: [],
    CONCACAF: [],
    CAF: [],
    AFC: [],
    OFC: [],
  };

  const yA = targetWorldCupYear - 1; // 2029, 2033, 2037
  const wA = getFifaWindowDatesForYear(yA);

  for (const conf of otherConfeds) {
    if (conf === 'UEFA') {
      const sortedUefa = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'UEFA')
        .sort((a, b) => b.fifaPoints - a.fifaPoints)
        .map((t) => t.id);

      // Liga 1: 36 seleções (Ligas A e B) -> 3 grupos de 12 (3 potes de 4 cada)
      // Liga 2: 18 seleções (Liga C) -> 3 grupos de 6 (3 potes de 2 cada)
      const liga1Teams = sortedUefa.slice(0, 36);
      const liga2Teams = sortedUefa.slice(36, 54);
      const groupMap: Record<string, string> = {};
      const l1GroupNames = ['Liga 1 · Grupo A', 'Liga 1 · Grupo B', 'Liga 1 · Grupo C'];
      const l2GroupNames = ['Liga 2 · Grupo A', 'Liga 2 · Grupo B', 'Liga 2 · Grupo C'];
      const l1Buckets: string[][] = [[], [], []];
      const l2Buckets: string[][] = [[], [], []];

      // Distribute 36 Liga 1 teams across 3 groups preserving Pot 1 (0..11), Pot 2 (12..23), Pot 3 (24..35)
      liga1Teams.forEach((tid, idx) => {
        const wave = Math.floor(idx / 3);
        const pos = idx % 3;
        const gIdx = (wave % 2 === 0 ? pos : 2 - pos + targetWorldCupYear) % 3;
        const normIdx = ((gIdx % 3) + 3) % 3;
        l1Buckets[normIdx].push(tid);
        groupMap[tid] = l1GroupNames[normIdx];
      });
      // Distribute 18 Liga 2 teams across 3 groups of 6
      liga2Teams.forEach((tid, idx) => {
        const wave = Math.floor(idx / 3);
        const pos = idx % 3;
        const gIdx = (wave % 2 === 0 ? pos : 2 - pos + targetWorldCupYear) % 3;
        const normIdx = ((gIdx % 3) + 3) % 3;
        l2Buckets[normIdx].push(tid);
        groupMap[tid] = l2GroupNames[normIdx];
      });

      // Liga 1 joga suas 6 rodadas em Set–Nov de yA (zero conflito com Nations League QF/Final Four em Mar/Jun!)
      const l1Slots = [
        { seasonYear: yA, triggerRound: 24, date: wA.sep1, label: 'Set/Out · Liga 1 UEFA (1ª Rodada)' },
        { seasonYear: yA, triggerRound: 25, date: wA.sep2, label: 'Set/Out · Liga 1 UEFA (2ª Rodada)' },
        { seasonYear: yA, triggerRound: 29, date: wA.oct1, label: 'Set/Out · Liga 1 UEFA (3ª Rodada)' },
        { seasonYear: yA, triggerRound: 30, date: wA.oct2, label: 'Set/Out · Liga 1 UEFA (4ª Rodada)' },
        { seasonYear: yA, triggerRound: 33, date: wA.nov1, label: 'Novembro · Liga 1 UEFA (5ª Rodada)' },
        { seasonYear: yA, triggerRound: 34, date: wA.nov2, label: 'Novembro · Liga 1 UEFA (Rodada Final)' },
      ];
      // Liga 2 (seleções da Liga C) joga suas 6 rodadas em Mar, Jun e Set de yA (zero conflito com Liga A da Nations League!)
      const l2Slots = [
        { seasonYear: yA, triggerRound: 6, date: wA.mar1, label: 'Março · Liga 2 UEFA (1ª Rodada)' },
        { seasonYear: yA, triggerRound: 7, date: wA.mar2, label: 'Março · Liga 2 UEFA (2ª Rodada)' },
        { seasonYear: yA, triggerRound: 12, date: wA.jun1, label: 'Junho · Liga 2 UEFA (3ª Rodada)' },
        { seasonYear: yA, triggerRound: 13, date: wA.jun2, label: 'Junho · Liga 2 UEFA (4ª Rodada)' },
        { seasonYear: yA, triggerRound: 24, date: wA.sep1, label: 'Set/Out · Liga 2 UEFA (5ª Rodada)' },
        { seasonYear: yA, triggerRound: 25, date: wA.sep2, label: 'Set/Out · Liga 2 UEFA (Rodada Final)' },
      ];

      l1GroupNames.forEach((grp, gIdx) => {
        const rounds = generateUefaLeague1SwissPairs(l1Buckets[gIdx]);
        rounds.forEach((pairs, rIdx) => {
          const slot = l1Slots[rIdx];
          pairs.forEach(([hId, aId], mIdx) => {
            let fix: InternationalMatchFixture = {
              id: `wcq_${targetWorldCupYear}_UEFA_L1G${gIdx + 1}_r${rIdx + 1}_m${mIdx}`,
              competition: 'wc_qualifiers',
              competitionName: `Eliminatórias UEFA · Copa ${targetWorldCupYear}`,
              seasonYear: slot.seasonYear,
              triggerRound: slot.triggerRound,
              date: slot.date,
              time: mIdx % 2 === 0 ? '15:45' : '16:45',
              dateLabel: `${formatShortDate(slot.date)} · ${slot.label}`,
              phase: `${grp} · Rodada ${rIdx + 1} de 6`,
              qualifiersRound: Math.min(18, 13 + rIdx),
              group: grp,
              homeTeamId: hId,
              awayTeamId: aId,
              stadiumName: getNationalTeamById(hId).homeStadium,
              played: false,
              status: 'PENDING',
              homeScore: null,
              awayScore: null,
            };
            if (preSimulateCompleted) {
              fix = simulateCpuInternationalFixture(
                fix,
                false,
                `arch_wcq_${targetWorldCupYear}_UEFA_L1_${gIdx}_${rIdx}_${mIdx}`
              );
            }
            otherConfedFixtures.push(fix);
          });
        });
      });

      l2GroupNames.forEach((grp, gIdx) => {
        const rounds = generateUefaSwiss6RoundPairs(l2Buckets[gIdx]);
        rounds.forEach((pairs, rIdx) => {
          const slot = l2Slots[rIdx];
          pairs.forEach(([hId, aId], mIdx) => {
            let fix: InternationalMatchFixture = {
              id: `wcq_${targetWorldCupYear}_UEFA_L2G${gIdx + 1}_r${rIdx + 1}_m${mIdx}`,
              competition: 'wc_qualifiers',
              competitionName: `Eliminatórias UEFA · Copa ${targetWorldCupYear}`,
              seasonYear: slot.seasonYear,
              triggerRound: slot.triggerRound,
              date: slot.date,
              time: '15:45',
              dateLabel: `${formatShortDate(slot.date)} · ${slot.label}`,
              phase: `${grp} · Rodada ${rIdx + 1} de 6`,
              qualifiersRound: Math.min(18, 11 + rIdx),
              group: grp,
              homeTeamId: hId,
              awayTeamId: aId,
              stadiumName: getNationalTeamById(hId).homeStadium,
              played: false,
              status: 'PENDING',
              homeScore: null,
              awayScore: null,
            };
            if (preSimulateCompleted) {
              fix = simulateCpuInternationalFixture(
                fix,
                false,
                `arch_wcq_${targetWorldCupYear}_UEFA_L2_${gIdx}_${rIdx}_${mIdx}`
              );
            }
            otherConfedFixtures.push(fix);
          });
        });
      });

      const uefaFixes = otherConfedFixtures.filter((f) =>
        f.competitionName.includes('Eliminatórias UEFA')
      );
      otherConfedStandings.UEFA = recomputeNationalStandings(sortedUefa, uefaFixes, groupMap);
      continue;
    }

    const confTeams = NATIONAL_TEAMS_CATALOG.filter(
      (t) => t.confederation === conf && !(conf === 'CAF' && CAF_WCQ_EXCLUDED_IDS.has(t.id))
    ).map((t) => t.id);
    const numGroups =
      conf === 'CAF'
        ? 9
        : conf === 'AFC'
        ? 8
        : conf === 'CONCACAF'
        ? 4
        : 1;
    const groupMap: Record<string, string> =
      numGroups === 1
        ? Object.fromEntries(confTeams.map((tid) => [tid, 'Grupo Único']))
        : assignBalancedGroupsBySeed(confTeams, numGroups, targetWorldCupYear);
    const uniqueGroups = Array.from(new Set(Object.values(groupMap))).sort();

    for (const grp of uniqueGroups) {
      const grpMembers = confTeams.filter((tid) => groupMap[tid] === grp);
      const rawGrpRounds = generateRoundRobinPairs(grpMembers);
      const grpRounds =
        conf === 'OFC'
          ? rawGrpRounds.slice(0, Math.ceil(rawGrpRounds.length / 2)) // 11 Berger rounds = 10 jogos por seleção em turno único
          : rawGrpRounds;
      const totalGrpRounds = grpRounds.length;
      grpRounds.forEach((pairs, rIdx) => {
        const meta = getOtherConfedWcQualScheduleMeta(conf, targetWorldCupYear, rIdx);
        const mappedQRound = conf === 'OFC' ? rIdx + 1 : Math.min(18, Math.max(1, rIdx + 5));
        const koTime =
          conf === 'AFC'
            ? '15:00'
            : conf === 'CAF'
            ? '17:00'
            : conf === 'OFC'
            ? '04:00'
            : '21:00';
        pairs.forEach(([hId, aId], mIdx) => {
          let fix: InternationalMatchFixture = {
            id: `wcq_${targetWorldCupYear}_${conf}_${grp.replace(/\s+/g, '')}_r${rIdx + 1}_m${mIdx}`,
            competition: 'wc_qualifiers',
            competitionName: `Eliminatórias ${conf} · Copa ${targetWorldCupYear}`,
            seasonYear: meta.seasonYear,
            triggerRound: meta.triggerRound,
            date: meta.date,
            time: koTime,
            dateLabel: meta.dateLabel,
            phase: `${grp} · Rodada ${rIdx + 1} de ${totalGrpRounds}`,
            qualifiersRound: mappedQRound,
            group: grp,
            homeTeamId: hId,
            awayTeamId: aId,
            stadiumName: getNationalTeamById(hId).homeStadium,
            played: false,
            status: 'PENDING',
            homeScore: null,
            awayScore: null,
          };
          if (preSimulateCompleted) {
            fix = simulateCpuInternationalFixture(
              fix,
              false,
              `arch_wcq_${targetWorldCupYear}_${conf}_${grp}_${rIdx}_${mIdx}`
            );
          }
          otherConfedFixtures.push(fix);
        });
      });
    }

    const confFixes = otherConfedFixtures.filter((f) =>
      f.competitionName.includes(`Eliminatórias ${conf}`)
    );
    otherConfedStandings[conf] = recomputeNationalStandings(confTeams, confFixes, groupMap);
  }

  let cycle: WorldCupQualifiersCycle = {
    targetWorldCupYear,
    currentMatchday: preSimulateCompleted ? 18 : 1,
    totalMatchdays: 18,
    conmebolStandings: recomputeNationalStandings(conmebolIds, conmebolFixtures),
    conmebolFixtures,
    otherConfedStandings,
    otherConfedFixtures,
  };

  if (preSimulateCompleted) {
    cycle = advanceAfcWcPlayoffStages(cycle, undefined, true).qualifiers;
    cycle = advanceCafWcPlayoffStages(cycle, undefined, true).qualifiers;
    cycle = advanceUefaWcPlayoffStages(cycle, undefined, true).qualifiers;
    cycle = advanceIntercontinentalWcPlayoffStages(cycle, undefined, undefined, true).qualifiers;
  }

  return cycle;
}

export function resolveWorldCup48QualifiedFromQualifiers(
  qualifiers: WorldCupQualifiersCycle | undefined,
  rankingPoints?: Record<string, number>
): string[] {
  const qualified: string[] = [];
  const addUnique = (tid?: string) => {
    if (tid && !qualified.includes(tid)) qualified.push(tid);
  };

  if (qualifiers) {
    const isWc2030 = qualifiers.targetWorldCupYear === 2030;

    // 1. CONMEBOL (6 vagas diretas): em 2030 = 3 sedes (Argentina, Paraguai, Uruguai) + 3 via eliminatórias; em 2034+ = Top 6
    const conmebolDirect: string[] = [];
    if (isWc2030) {
      ['nt_arg', 'nt_par', 'nt_uru'].forEach((hid) => {
        if (!conmebolDirect.includes(hid)) conmebolDirect.push(hid);
      });
    }
    for (const r of qualifiers.conmebolStandings) {
      if (conmebolDirect.length >= 6) break;
      if (!conmebolDirect.includes(r.teamId)) conmebolDirect.push(r.teamId);
    }
    conmebolDirect.forEach((tid) => addUnique(tid));

    const getGrouped = (rows: NationalStandingRow[]) => {
      const byG: Record<string, NationalStandingRow[]> = {};
      rows.forEach((r) => {
        const g = r.group || 'Grupo A';
        if (!byG[g]) byG[g] = [];
        byG[g].push(r);
      });
      return Object.keys(byG)
        .sort()
        .map((g) => byG[g]);
    };

    // 2. UEFA (16 vagas totais): em 2030 = 2 sedes (Espanha, Portugal) + 14 via eliminatórias (10 diretas + 4 Play-Off UEFA); em 2034+ = 12 diretas + 4 Play-Off UEFA
    const hasUefaLiga1 = (qualifiers.otherConfedStandings.UEFA || []).some((r) =>
      (r.group || '').startsWith('Liga 1')
    );
    if (hasUefaLiga1) {
      const { directTeamIds, playoffSeeds } = getUefaWcDirectAndPlayoffSeeding(
        qualifiers,
        rankingPoints
      );
      directTeamIds.forEach((tid) => addUnique(tid));
      const uefaPoFinals = qualifiers.otherConfedFixtures
        .filter(
          (f) =>
            f.competitionName.includes('Eliminatórias UEFA') &&
            f.phase === 'Play-Off UEFA · Final' &&
            f.played
        )
        .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
      if (uefaPoFinals.length === 4) {
        uefaPoFinals.forEach((fin) => addUnique(fin.winnerTeamId || fin.homeTeamId));
      } else {
        playoffSeeds.slice(0, 4).forEach((tid) => addUnique(tid));
      }
    } else {
      const { directTeamIds } = getUefaWcDirectAndPlayoffSeeding(qualifiers, rankingPoints);
      directTeamIds.forEach((tid) => addUnique(tid));
    }

    // 3. CAF (9 vagas diretas): em 2030 = 1 sede (Marrocos) + 8 melhores campeões de grupo; em 2034+ = 9 campeões de grupo
    const cafGroups = getGrouped(qualifiers.otherConfedStandings.CAF || []);
    const cafDirect: string[] = [];
    if (isWc2030) {
      cafDirect.push('nt_mar');
    }
    const cafGroupWinners = cafGroups
      .map((rows) => rows[0])
      .filter((r): r is NationalStandingRow => Boolean(r))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
    for (const w of cafGroupWinners) {
      if (cafDirect.length >= 9) break;
      if (!cafDirect.includes(w.teamId)) cafDirect.push(w.teamId);
    }
    cafDirect.forEach((tid) => addUnique(tid));

    // 4. AFC (8 vagas diretas): 1º lugar de cada um dos 8 grupos
    const afcGroups = getGrouped(qualifiers.otherConfedStandings.AFC || []);
    if (afcGroups.length >= 8) {
      afcGroups.forEach((rows) => {
        if (rows[0]) addUnique(rows[0].teamId);
      });
    } else {
      afcGroups.forEach((rows) => rows.slice(0, 2).forEach((r) => addUnique(r.teamId)));
      const afcThirds = afcGroups
        .map((rows) => rows[2])
        .filter((r): r is NationalStandingRow => Boolean(r))
        .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
      afcThirds.slice(0, 2).forEach((r) => addUnique(r.teamId));
    }

    // 5. CONCACAF (6 vagas diretas): 4 campeões de grupo + 2 melhores 2ºs colocados
    const concacafGroups = getGrouped(qualifiers.otherConfedStandings.CONCACAF || []);
    if (concacafGroups.length >= 4) {
      concacafGroups.forEach((rows) => {
        if (rows[0]) addUnique(rows[0].teamId);
      });
      const concacafRunners = concacafGroups
        .map((rows) => rows[1])
        .filter((r): r is NationalStandingRow => Boolean(r))
        .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
      concacafRunners.slice(0, 2).forEach((r) => addUnique(r.teamId));
    } else {
      concacafGroups.forEach((rows) => {
        rows.slice(0, 3).forEach((r) => addUnique(r.teamId));
      });
    }

    // 6. OFC (1 vaga direta): 1º colocado da tabela única da Oceania
    const ofcGroups = getGrouped(qualifiers.otherConfedStandings.OFC || []);
    const ofcDirectId = ofcGroups[0]?.[0]?.teamId;
    addUnique(ofcDirectId);

    // 7. Repescagem Intercontinental FIFA (2 vagas finais disputadas por 6 seleções:
    // 1 CAF, 1 AFC, 1 CONMEBOL, 1 OFC e 2 CONCACAF — Top 2 FIFA diretas às Finais; 4 piores nas Semifinais)
    const playedIcFinals = qualifiers.otherConfedFixtures
      .filter((f) => f.phase === 'Repescagem Intercontinental · Final' && f.played)
      .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));

    if (playedIcFinals.length === 2) {
      playedIcFinals.forEach((fin) => addUnique(fin.winnerTeamId || fin.homeTeamId));
    } else {
      const participants = getIntercontinentalPlayoffParticipants(qualifiers, rankingPoints);
      const runFallbackMatch = (homeId: string | undefined, awayId: string | undefined, key: string): string | undefined => {
        if (!homeId) return awayId;
        if (!awayId) return homeId;
        const sim = simulateCpuInternationalFixture(
          {
            id: `ic_playoff_preview_${qualifiers.targetWorldCupYear}_${key}`,
            competition: 'wc_qualifiers',
            competitionName: `Repescagem Intercontinental FIFA · Copa ${qualifiers.targetWorldCupYear}`,
            seasonYear: qualifiers.targetWorldCupYear,
            triggerRound: 6,
            date: `${qualifiers.targetWorldCupYear}-03-26`,
            dateLabel: `Março ${qualifiers.targetWorldCupYear}`,
            phase: 'Repescagem Intercontinental · Preview',
            homeTeamId: homeId,
            awayTeamId: awayId,
            stadiumName: getNationalTeamById(homeId).homeStadium,
            played: false,
            status: 'PENDING',
            homeScore: null,
            awayScore: null,
          },
          true,
          `icp_${qualifiers.targetWorldCupYear}_${key}_${homeId}_${awayId}`
        );
        return sim.winnerTeamId || homeId;
      };

      if (participants.length >= 6) {
        const [s1, s2, s3, s4, s5, s6] = participants;
        const sameConf = s3.confederation === s6.confederation || s4.confederation === s5.confederation;
        const sf1W = runFallbackMatch(s3.teamId, sameConf ? s5.teamId : s6.teamId, 'sf1');
        const sf2W = runFallbackMatch(s4.teamId, sameConf ? s6.teamId : s5.teamId, 'sf2');
        const fin1W = runFallbackMatch(s1.teamId, sf2W, 'fin1');
        const fin2W = runFallbackMatch(s2.teamId, sf1W, 'fin2');
        addUnique(fin1W);
        addUnique(fin2W);
      }
    }
  }

  // Fill remaining slots (up to 48) by highest FIFA Ranking Points among non-qualified nations
  const fallbackSorted = [...NATIONAL_TEAMS_CATALOG].sort(
    (a, b) =>
      (rankingPoints?.[b.id] ?? b.fifaPoints) - (rankingPoints?.[a.id] ?? a.fifaPoints)
  );
  for (const team of fallbackSorted) {
    if (qualified.length >= 48) break;
    addUnique(team.id);
  }

  return qualified.slice(0, 48);
}

// ============================================================================
// ELIMINATÓRIAS CONTINENTAIS REAIS (EURO, COPA AFRICANA, COPA DA ÁSIA, CONCACAF, OFC)
// ============================================================================

function sortByPpgStanding(a: NationalStandingRow, b: NationalStandingRow): number {
  const ppgA = a.points / Math.max(1, a.played);
  const ppgB = b.points / Math.max(1, b.played);
  if (Math.abs(ppgB - ppgA) > 1e-6) return ppgB - ppgA;
  const gdA = a.goalDifference / Math.max(1, a.played);
  const gdB = b.goalDifference / Math.max(1, b.played);
  if (Math.abs(gdB - gdA) > 1e-6) return gdB - gdA;
  const gfA = a.goalsFor / Math.max(1, a.played);
  const gfB = b.goalsFor / Math.max(1, b.played);
  if (Math.abs(gfB - gfA) > 1e-6) return gfB - gfA;
  return b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor;
}

function computeUefaEuroDirectAndHostAllocation(
  standings: NationalStandingRow[],
  targetContinentalYear: number
): {
  direct20: string[];
  hostReserved: string[];
  remainingRunners: string[];
  playoffSpots: number;
} {
  const byGroup: Record<string, NationalStandingRow[]> = {};
  standings.forEach((r) => {
    const g = r.group || 'Grupo A';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(r);
  });
  const groupNames = Object.keys(byGroup).sort();

  // 12 campeões de grupo + 8 melhores segundos colocados (por aproveitamento PPG para equalizar grupos de 4 e 5) = 20 diretos
  const direct20: string[] = [];
  groupNames.forEach((g) => {
    if (byGroup[g][0]) direct20.push(byGroup[g][0].teamId);
  });
  const runners = groupNames
    .map((g) => byGroup[g][1])
    .filter((r): r is NationalStandingRow => Boolean(r))
    .sort(sortByPpgStanding);
  runners.slice(0, 8).forEach((r) => {
    if (!direct20.includes(r.teamId)) direct20.push(r.teamId);
  });
  const remainingRunners = runners.slice(8).map((r) => r.teamId);

  // Proteção oficial de anfitriões da Euro 2028 (Inglaterra, Escócia, País de Gales, Irlanda): até 2 vagas reservadas
  const hostReserved: string[] = [];
  if (targetContinentalYear === 2028) {
    const missingHosts = EURO_2028_COHOSTS.filter((hid) => !direct20.includes(hid))
      .map((hid) => standings.find((r) => r.teamId === hid))
      .filter((r): r is NationalStandingRow => Boolean(r))
      .sort(sortByPpgStanding);
    missingHosts.slice(0, 2).forEach((r) => hostReserved.push(r.teamId));
  }

  const playoffSpots = Math.max(2, 4 - hostReserved.length);
  return { direct20, hostReserved, remainingRunners, playoffSpots };
}

function computeContinentalTrackQualified(
  trackId: ContinentalQualifierTrackId,
  standings: NationalStandingRow[],
  targetContinentalYear: number = 2028,
  fixtures?: InternationalMatchFixture[]
): string[] {
  const byGroup: Record<string, NationalStandingRow[]> = {};
  standings.forEach((r) => {
    const g = r.group || 'Grupo A';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(r);
  });
  const groupNames = Object.keys(byGroup).sort();
  const qualified: string[] = [];

  if (trackId === 'UEFA') {
    // 54 seleções em 12 grupos (6×4 + 6×5): 12 líderes + 8 melhores 2ºs (20) + até 2 anfitriões reservados (2028) + Repescagem Euro (2..4) = 24 seleções!
    const { direct20, hostReserved, remainingRunners, playoffSpots } =
      computeUefaEuroDirectAndHostAllocation(standings, targetContinentalYear);
    direct20.forEach((id) => {
      if (!qualified.includes(id)) qualified.push(id);
    });
    hostReserved.forEach((id) => {
      if (!qualified.includes(id)) qualified.push(id);
    });

    // Check completed Euro Play-Off winners if fixtures are provided
    const poWinners: string[] = [];
    if (fixtures && fixtures.length > 0) {
      const singleFinals = fixtures
        .filter((f) => f.phase === 'Play-Off Euro · Final' && f.played)
        .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
      if (singleFinals.length > 0) {
        singleFinals.forEach((f) => {
          const w = f.winnerTeamId || f.homeTeamId;
          if (w && !qualified.includes(w)) poWinners.push(w);
        });
      } else {
        const leg1s = fixtures
          .filter((f) => f.phase === 'Play-Off Euro · Ida' && f.played)
          .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
        const leg2s = fixtures
          .filter((f) => f.phase === 'Play-Off Euro · Volta' && f.played)
          .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
        if (leg1s.length > 0 && leg1s.length === leg2s.length) {
          leg2s.forEach((l2, idx) => {
            const l1 = leg1s.find((x) => x.knockoutSlot === l2.knockoutSlot) || leg1s[idx];
            if (l1) {
              const { winnerId } = resolveTwoLeggedTieWinner(
                l1,
                l2,
                `euro_po_${targetContinentalYear}_${l2.knockoutSlot || idx}`
              );
              if (winnerId && !qualified.includes(winnerId)) poWinners.push(winnerId);
            }
          });
        }
      }
    }

    poWinners.slice(0, playoffSpots).forEach((id) => {
      if (!qualified.includes(id)) qualified.push(id);
    });

    // Fallback before Play-Off finishes: fill remaining up to 24 with remaining runners-up + best overall PPG
    for (const id of remainingRunners) {
      if (qualified.length >= 24) break;
      if (!qualified.includes(id)) qualified.push(id);
    }
    const overallSorted = [...standings].sort(sortByPpgStanding);
    for (const r of overallSorted) {
      if (qualified.length >= 24) break;
      if (!qualified.includes(r.teamId)) qualified.push(r.teamId);
    }
  } else if (trackId === 'CAF') {
    if (groupNames.length === 8 && (byGroup[groupNames[0]]?.length || 0) >= 7) {
      // 8 grupos com 7 seleções (56 seleções da África): classificam-se os 4 melhores de cada grupo = 32 seleções para a Copa Africana!
      groupNames.forEach((g) => {
        byGroup[g].slice(0, 4).forEach((r) => {
          if (!qualified.includes(r.teamId)) qualified.push(r.teamId);
        });
      });
    } else {
      // Legacy 12 groups (54 nations): Top 2 of each group = 24 teams
      groupNames.forEach((g) => {
        byGroup[g].slice(0, 2).forEach((r) => {
          if (!qualified.includes(r.teamId)) qualified.push(r.teamId);
        });
      });
    }
  } else if (trackId === 'AFC') {
    if (groupNames.length >= 4 && (byGroup[groupNames[0]]?.length || 0) >= 8) {
      // 4 grupos de 12 seleções (48 AFC): classificam-se os 8 primeiros de cada grupo = 32 seleções para a Copa da Ásia!
      groupNames.forEach((g) => {
        byGroup[g].slice(0, 8).forEach((r) => {
          if (!qualified.includes(r.teamId)) qualified.push(r.teamId);
        });
      });
    } else {
      // Legacy 3 groups of 4: Top 2 direct (6) + 2 best 3rd place = 8
      groupNames.forEach((g) => {
        byGroup[g].slice(0, 2).forEach((r) => qualified.push(r.teamId));
      });
      const thirds = groupNames
        .map((g) => byGroup[g][2])
        .filter((r): r is NationalStandingRow => Boolean(r))
        .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
      thirds.slice(0, 2).forEach((r) => {
        if (!qualified.includes(r.teamId)) qualified.push(r.teamId);
      });
    }
  } else if (trackId === 'CONCACAF') {
    if (groupNames.length >= 4) {
      // Liga das Nações CONCACAF (16 seleções em 4 grupos de 4): 1º de cada grupo (4) + 2 melhores 2ºs = 6 convidados Copa América
      groupNames.forEach((g) => {
        if (byGroup[g][0]) qualified.push(byGroup[g][0].teamId);
      });
      const runners = groupNames
        .map((g) => byGroup[g][1])
        .filter((r): r is NationalStandingRow => Boolean(r))
        .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
      runners.slice(0, 2).forEach((r) => {
        if (!qualified.includes(r.teamId)) qualified.push(r.teamId);
      });
    } else {
      // Legacy 2 groups of 4: Top 3 of each group = 6 CONCACAF guests for Copa América
      groupNames.forEach((g) => {
        byGroup[g].slice(0, 3).forEach((r) => qualified.push(r.teamId));
      });
    }
  } else {
    // OFC: 11 teams in single table (Grupo Único) -> Top 8 qualify for Copa das Nações da OFC (2 grupos de 4)
    groupNames.forEach((g) => {
      byGroup[g].slice(0, groupNames.length === 1 ? 8 : 4).forEach((r) => {
        if (!qualified.includes(r.teamId)) qualified.push(r.teamId);
      });
    });
  }

  return qualified;
}

/**
 * Constrói a trilha oficial das Eliminatórias da Eurocopa (UEFA):
 * 54 seleções em 12 grupos (6 grupos de 4 `A–F` jogando Set–Nov; 6 grupos de 5 `G–L` jogando Mar–Nov),
 * garantindo os 8 quadrifinalistas da Liga A da Nations League em `A–F` (zero choque em Mar/Jun)
 * e respeitando restrições políticas (Espanha × Gibraltar e Sérvia × Kosovo proibidos no mesmo grupo).
 */
function buildUefaEuroQualifiersTrack(
  targetContinentalYear: number,
  preSimulateCompleted: boolean = false,
  protected4TeamGroupIds?: string[]
): ContinentalQualifiersTrack {
  const y2 = targetContinentalYear - 1; // 2027, 2031, 2035
  const w2 = getFifaWindowDatesForYear(y2);
  const teamIds = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'UEFA').map((t) => t.id);

  // Default protected 8 teams (top 8 FIFA UEFA) until Nations League QF qualifiers are locked in Nov y1
  const defaultProtected = [...teamIds]
    .sort((a, b) => getNationalTeamById(b).fifaPoints - getNationalTeamById(a).fifaPoints)
    .slice(0, 8);
  const protectedIds =
    protected4TeamGroupIds && protected4TeamGroupIds.length > 0
      ? protected4TeamGroupIds
      : defaultProtected;

  const groupMap = assignUefaEuroGroupsWithConstraints(
    teamIds,
    targetContinentalYear + 3,
    protectedIds
  );
  const uniqueGroups = Array.from(new Set(Object.values(groupMap))).sort();

  // Grupos de 5 (G–L · 10 rodadas Berger / 8 jogos por seleção): Mar, Jun, Set/Out e Nov de y2
  const slots5Team = [
    { seasonYear: y2, triggerRound: 6, date: w2.mar1, label: 'Março · 1ª Rodada Euro' },
    { seasonYear: y2, triggerRound: 7, date: w2.mar2, label: 'Março · 2ª Rodada Euro' },
    { seasonYear: y2, triggerRound: 12, date: w2.jun1, label: 'Junho · 3ª Rodada Euro' },
    { seasonYear: y2, triggerRound: 13, date: w2.jun2, label: 'Junho · 4ª Rodada Euro' },
    { seasonYear: y2, triggerRound: 24, date: w2.sep1, label: 'Set/Out · 5ª Rodada Euro' },
    { seasonYear: y2, triggerRound: 25, date: w2.sep2, label: 'Set/Out · 6ª Rodada Euro' },
    { seasonYear: y2, triggerRound: 29, date: w2.oct1, label: 'Set/Out · 7ª Rodada Euro' },
    { seasonYear: y2, triggerRound: 30, date: w2.oct2, label: 'Set/Out · 8ª Rodada Euro' },
    { seasonYear: y2, triggerRound: 33, date: w2.nov1, label: 'Novembro · 9ª Rodada Euro' },
    { seasonYear: y2, triggerRound: 34, date: w2.nov2, label: 'Novembro · 10ª Rodada (Final)' },
  ];
  // Grupos de 4 (A–F · 6 rodadas ida e volta): Set/Out e Nov de y2 (Março e Junho 100% livres p/ Nations League!)
  const slots4Team = slots5Team.slice(4);

  const title = `Eliminatórias da Eurocopa ${targetContinentalYear}`;
  const fixtures: InternationalMatchFixture[] = [];

  for (const grp of uniqueGroups) {
    const members = teamIds.filter((tid) => groupMap[tid] === grp);
    const grpRounds = generateRoundRobinPairs(members);
    const activeSlots = members.length <= 4 ? slots4Team : slots5Team;
    grpRounds.forEach((pairs, rIdx) => {
      const slot = activeSlots[rIdx] || activeSlots[activeSlots.length - 1];
      pairs.forEach(([hId, aId], mIdx) => {
        let fix: InternationalMatchFixture = {
          id: `contq_${targetContinentalYear}_UEFA_${grp.replace(/\s+/g, '')}_r${rIdx + 1}_m${mIdx}`,
          competition: 'continental_qualifiers',
          competitionName: title,
          seasonYear: slot.seasonYear,
          triggerRound: slot.triggerRound,
          date: slot.date,
          time: '16:45',
          dateLabel: `${formatShortDate(slot.date)} · ${slot.label}`,
          phase: `${grp} · Rodada ${rIdx + 1} de ${grpRounds.length}`,
          qualifiersRound: rIdx + 1,
          group: grp,
          homeTeamId: hId,
          awayTeamId: aId,
          stadiumName: getNationalTeamById(hId).homeStadium,
          played: false,
          status: 'PENDING',
          homeScore: null,
          awayScore: null,
        };
        if (preSimulateCompleted) {
          fix = simulateCpuInternationalFixture(
            fix,
            false,
            `arch_contq_${targetContinentalYear}_UEFA_${grp}_${rIdx}_${mIdx}`
          );
        }
        fixtures.push(fix);
      });
    });
  }

  const standings = recomputeNationalStandings(teamIds, fixtures, groupMap);
  const baseTrack: ContinentalQualifiersTrack = {
    id: 'UEFA',
    title,
    targetCompId: 'eurocopa',
    targetCompName: `UEFA Eurocopa ${targetContinentalYear} (24 vagas: 12 líderes + 8 melhores 2ºs + proteção anfitriões & Repescagem Mar/${targetContinentalYear})`,
    totalRounds: 10,
    qualifyPerGroup: 1,
    standings,
    fixtures,
    qualifiedTeamIds: computeContinentalTrackQualified(
      'UEFA',
      standings,
      targetContinentalYear,
      fixtures
    ),
  };

  if (preSimulateCompleted) {
    return advanceUefaEuroPlayoffStages(baseTrack, targetContinentalYear, undefined, undefined, true)
      .track;
  }

  return baseTrack;
}

/**
 * Avança automaticamente a Repescagem da Eurocopa (Play-Off Euro · Março de 2028/2032/2036):
 * - 2 vagas de anfitrião usadas -> 8 seleções em 2 chaves em jogo único (4 Semifinais mar1, 2 Finais mar2 -> 2 vagas)
 * - 1 vaga de anfitrião usada -> 12 seleções em 3 chaves em jogo único (6 Semifinais mar1, 3 Finais mar2 -> 3 vagas)
 * - 0 vagas de anfitrião usadas -> 8 seleções em 4 confrontos ida e volta (mar1 Ida, mar2 Volta -> 4 vagas)
 */
function advanceUefaEuroPlayoffStages(
  track: ContinentalQualifiersTrack,
  targetContinentalYear: number,
  nationsLeagueEdition?: NationalTournamentEdition,
  seasonSchedule?: InternationalMatchFixture[],
  preSimulateCompleted: boolean = false
): {
  track: ContinentalQualifiersTrack;
  cleanedSchedule?: InternationalMatchFixture[];
} {
  const groupFixtures = track.fixtures.filter((f) => Boolean(f.group));
  if (groupFixtures.length === 0 || !groupFixtures.every((f) => f.played)) {
    return { track, cleanedSchedule: seasonSchedule };
  }

  const w3 = getFifaWindowDatesForYear(targetContinentalYear);
  const allFixes = [...track.fixtures];
  const { direct20, hostReserved, remainingRunners, playoffSpots } =
    computeUefaEuroDirectAndHostAllocation(track.standings, targetContinentalYear);
  const alreadyQualified = new Set<string>([...direct20, ...hostReserved]);

  // Priority pool for Euro Play-Off: Nations League group winners/ranked teams + remaining runners-up + overall standings
  const nlPriority: string[] = [];
  if (nationsLeagueEdition && nationsLeagueEdition.standings.length > 0) {
    const nlByGrp: Record<string, NationalStandingRow[]> = {};
    nationsLeagueEdition.standings.forEach((r) => {
      const g = r.group || 'Grupo A1';
      if (!nlByGrp[g]) nlByGrp[g] = [];
      nlByGrp[g].push(r);
    });
    const divOrder = ['Grupo A', 'Grupo B', 'Grupo C', 'Grupo D'];
    for (const divPrefix of divOrder) {
      const divGroups = Object.keys(nlByGrp)
        .filter((g) => g.startsWith(divPrefix))
        .sort();
      // First group winners of this division, then remaining ranked
      const winners = divGroups
        .map((g) => nlByGrp[g][0])
        .filter((r): r is NationalStandingRow => Boolean(r))
        .sort(sortByPpgStanding);
      winners.forEach((r) => {
        if (!alreadyQualified.has(r.teamId) && !nlPriority.includes(r.teamId)) {
          nlPriority.push(r.teamId);
        }
      });
      const restDiv = divGroups
        .flatMap((g) => nlByGrp[g].slice(1))
        .sort(sortByPpgStanding);
      restDiv.forEach((r) => {
        if (!alreadyQualified.has(r.teamId) && !nlPriority.includes(r.teamId)) {
          nlPriority.push(r.teamId);
        }
      });
    }
  }
  const overallNonQual = [...track.standings]
    .sort(sortByPpgStanding)
    .map((r) => r.teamId)
    .filter((id) => !alreadyQualified.has(id));

  const pickPool = (need: number, includeRemainingRunnersFirst: boolean): string[] => {
    const res: string[] = [];
    const pushIf = (id: string) => {
      if (!alreadyQualified.has(id) && !res.includes(id)) res.push(id);
    };
    if (includeRemainingRunnersFirst) {
      remainingRunners.forEach(pushIf);
    }
    nlPriority.forEach(pushIf);
    remainingRunners.forEach(pushIf);
    overallNonQual.forEach(pushIf);
    return res.slice(0, need);
  };

  const newlyAdded: InternationalMatchFixture[] = [];
  const makePoFix = (
    phase: 'Play-Off Euro · Semifinal' | 'Play-Off Euro · Final' | 'Play-Off Euro · Ida' | 'Play-Off Euro · Volta',
    slot: number,
    date: string,
    triggerRound: number,
    homeId: string,
    awayId: string,
    isKo: boolean
  ): InternationalMatchFixture => {
    let fix: InternationalMatchFixture = {
      id: `contq_${targetContinentalYear}_UEFA_europo_${phase.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_s${slot}`,
      competition: 'continental_qualifiers',
      competitionName: track.title,
      seasonYear: targetContinentalYear,
      triggerRound,
      date,
      time: '16:45',
      dateLabel: `${formatShortDate(date)} · ${phase}`,
      phase,
      knockoutSlot: slot,
      homeTeamId: homeId,
      awayTeamId: awayId,
      stadiumName: getNationalTeamById(homeId).homeStadium,
      played: false,
      status: 'PENDING',
      homeScore: null,
      awayScore: null,
    };
    if (preSimulateCompleted) {
      fix = simulateCpuInternationalFixture(
        fix,
        isKo,
        `arch_uefa_europo_${targetContinentalYear}_${phase}_${slot}`
      );
    }
    return fix;
  };

  const hasAnyPlayoff = allFixes.some((f) => f.phase.startsWith('Play-Off Euro'));

  if (playoffSpots === 4) {
    // 0 vagas de anfitrião usadas: 8 seleções (4 piores 2ºs + 4 da Nations League) em 4 confrontos Ida (mar1) e Volta (mar2)
    if (!hasAnyPlayoff) {
      const seeds = pickPool(8, true);
      if (seeds.length === 8) {
        for (let i = 0; i < 4; i++) {
          const seeded = seeds[i];
          const unseeded = seeds[7 - i];
          const leg1 = makePoFix('Play-Off Euro · Ida', i + 1, w3.mar1, 6, unseeded, seeded, false);
          const leg2 = makePoFix('Play-Off Euro · Volta', i + 1, w3.mar2, 7, seeded, unseeded, false);
          allFixes.push(leg1, leg2);
          newlyAdded.push(leg1, leg2);
        }
      }
    }
  } else {
    // 2 ou 3 vagas (2 ou 3 chaves em jogo único: Semifinais mar1 -> Finais mar2)
    const numPaths = playoffSpots; // 2 -> 8 teams, 3 -> 12 teams
    const teamCount = numPaths * 4;
    if (!hasAnyPlayoff) {
      const seeds = pickPool(teamCount, playoffSpots === 3);
      if (seeds.length === teamCount) {
        for (let p = 0; p < numPaths; p++) {
          const s1 = seeds[p];
          const s2 = seeds[numPaths + p];
          const s3 = seeds[numPaths * 2 + (numPaths - 1 - p)];
          const s4 = seeds[numPaths * 3 + (numPaths - 1 - p)];
          const sf1 = makePoFix('Play-Off Euro · Semifinal', p * 2 + 1, w3.mar1, 6, s1, s4, true);
          const sf2 = makePoFix('Play-Off Euro · Semifinal', p * 2 + 2, w3.mar1, 6, s2, s3, true);
          allFixes.push(sf1, sf2);
          newlyAdded.push(sf1, sf2);
        }
      }
    }

    const sfFixes = allFixes
      .filter((f) => f.phase === 'Play-Off Euro · Semifinal')
      .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
    const hasFinals = allFixes.some((f) => f.phase === 'Play-Off Euro · Final');
    if (sfFixes.length === numPaths * 2 && sfFixes.every((f) => f.played) && !hasFinals) {
      for (let p = 0; p < numPaths; p++) {
        const w1 = sfFixes[p * 2].winnerTeamId || sfFixes[p * 2].homeTeamId;
        const w2 = sfFixes[p * 2 + 1].winnerTeamId || sfFixes[p * 2 + 1].homeTeamId;
        const fin = makePoFix('Play-Off Euro · Final', p + 1, w3.mar2, 7, w1, w2, true);
        allFixes.push(fin);
        newlyAdded.push(fin);
      }
    }
  }

  const nextQualIds = computeContinentalTrackQualified(
    'UEFA',
    track.standings,
    targetContinentalYear,
    allFixes
  );

  if (newlyAdded.length === 0) {
    return {
      track: {
        ...track,
        qualifiedTeamIds: nextQualIds,
      },
      cleanedSchedule: seasonSchedule,
    };
  }

  const busyNew = new Set<string>();
  newlyAdded.forEach((m) => {
    if (m.date) {
      busyNew.add(`${m.homeTeamId}_${m.date}`);
      busyNew.add(`${m.awayTeamId}_${m.date}`);
    }
  });

  const cleanedSchedule = seasonSchedule
    ? seasonSchedule.filter(
        (f) =>
          f.played ||
          f.competition !== 'friendly' ||
          !f.date ||
          (!busyNew.has(`${f.homeTeamId}_${f.date}`) && !busyNew.has(`${f.awayTeamId}_${f.date}`))
      )
    : undefined;

  return {
    track: {
      ...track,
      fixtures: allFixes,
      qualifiedTeamIds: nextQualIds,
    },
    cleanedSchedule,
  };
}

export function generateContinentalQualifiersCycle(
  targetContinentalYear: number,
  preSimulateCompleted: boolean = false
): ContinentalQualifiersCycle {
  const y1 = targetContinentalYear - 2; // e.g. 2026 for 2028 target
  const y2 = targetContinentalYear - 1; // e.g. 2027 for 2028 target
  const y3 = targetContinentalYear;     // e.g. 2028 for 2028 target
  const w1 = getFifaWindowDatesForYear(y1);
  const w2 = getFifaWindowDatesForYear(y2);
  const w3 = getFifaWindowDatesForYear(y3);

  // Eliminatórias da Copa da Ásia (48 seleções em 4 grupos de 12, turno único = 11 rodadas):
  // y2 (2027/31/35): Mar (2) + Jun (2) + Set/Out (4) + Nov (2) = 10 jogos;
  // y3 (2028/32/36): Mar 1 (1 jogo para encerrar), deixando Mar 2 e Mai/Jun livres para amistosos pré-Copa da Ásia!
  const scheduleSlots = [
    { seasonYear: y2, triggerRound: 6, date: w2.mar1, label: 'Março · 1ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 7, date: w2.mar2, label: 'Março · 2ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 12, date: w2.jun1, label: 'Junho · 3ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 13, date: w2.jun2, label: 'Junho · 4ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 24, date: w2.sep1, label: 'Set/Out · 5ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 25, date: w2.sep2, label: 'Set/Out · 6ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 29, date: w2.oct1, label: 'Set/Out · 7ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 30, date: w2.oct2, label: 'Set/Out · 8ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 33, date: w2.nov1, label: 'Novembro · 9ª Rodada AFC' },
    { seasonYear: y2, triggerRound: 34, date: w2.nov2, label: 'Novembro · 10ª Rodada AFC' },
    { seasonYear: y3, triggerRound: 6, date: w3.mar1, label: 'Março · Rodada Final AFC (11ª)' },
  ];

  // Liga das Nações CONCACAF (2026/27, 2030/31, 2034/35):
  // Grupos em Set/Out de y1 (4 jogos), Quartas/Conclusão em Nov de y1, e Finais + Prelims Copa Ouro em Mar de y2!
  const concacafScheduleSlots = [
    { seasonYear: y1, triggerRound: 24, date: w1.sep1, label: 'Set/Out · Liga das Nações (1ª Rodada)' },
    { seasonYear: y1, triggerRound: 25, date: w1.sep2, label: 'Set/Out · Liga das Nações (2ª Rodada)' },
    { seasonYear: y1, triggerRound: 29, date: w1.oct1, label: 'Set/Out · Liga das Nações (3ª Rodada)' },
    { seasonYear: y1, triggerRound: 30, date: w1.oct2, label: 'Set/Out · Liga das Nações (4ª Rodada)' },
    { seasonYear: y1, triggerRound: 33, date: w1.nov1, label: 'Novembro · Quartas / Grupos CONCACAF' },
    { seasonYear: y2, triggerRound: 6, date: w2.mar1, label: 'Março · Finais Liga das Nações & Prelims' },
  ];

  // OFC Continental Qualifiers (11 teams, single table, 10 games per nation / 11 Berger rounds strictly across y2 = 2027, 2031, 2035)
  const ofcMidOct2 = addDays(w2.oct1, 2);
  const ofcScheduleSlots = [
    { seasonYear: y2, triggerRound: 6, date: w2.mar1, label: 'Março · 1ª Rodada OFC' },
    { seasonYear: y2, triggerRound: 7, date: w2.mar2, label: 'Março · 2ª Rodada OFC' },
    { seasonYear: y2, triggerRound: 12, date: w2.jun1, label: 'Junho · 3ª Rodada OFC' },
    { seasonYear: y2, triggerRound: 13, date: w2.jun2, label: 'Junho · 4ª Rodada OFC' },
    { seasonYear: y2, triggerRound: 24, date: w2.sep1, label: 'Super Data FIFA · 5ª Rodada OFC' },
    { seasonYear: y2, triggerRound: 25, date: w2.sep2, label: 'Super Data FIFA · 6ª Rodada OFC' },
    { seasonYear: y2, triggerRound: 29, date: w2.oct1, label: 'Super Data FIFA · 7ª Rodada OFC' },
    { seasonYear: y2, triggerRound: 29, date: ofcMidOct2, label: 'Super Data FIFA · 8ª Rodada OFC' },
    { seasonYear: y2, triggerRound: 30, date: w2.oct2, label: 'Super Data FIFA · 9ª Rodada OFC' },
    { seasonYear: y2, triggerRound: 33, date: w2.nov1, label: 'Novembro · 10ª Rodada OFC' },
    { seasonYear: y2, triggerRound: 34, date: w2.nov2, label: 'Novembro · Rodada Final OFC' },
  ];

  // Eliminatórias da Copa das Nações Africanas (56 seleções · 8 grupos de 7 · ida e volta = 14 rodadas / 12 jogos cada):
  // y1 (2026, 2030, 2034): Set/Out (2 rodadas) + Nov (2 rodadas)
  // y2 (2027, 2031, 2035): Mar (2 rodadas) + Jun (2 rodadas) + Set/Out (4 rodadas) + Nov (2 rodadas)
  const cafScheduleSlots = [
    { seasonYear: y1, triggerRound: 24, date: w1.sep1, label: 'Set/Out · 1ª Rodada CAN' },
    { seasonYear: y1, triggerRound: 25, date: w1.sep2, label: 'Set/Out · 2ª Rodada CAN' },
    { seasonYear: y1, triggerRound: 33, date: w1.nov1, label: 'Novembro · 3ª Rodada CAN' },
    { seasonYear: y1, triggerRound: 34, date: w1.nov2, label: 'Novembro · 4ª Rodada CAN' },
    { seasonYear: y2, triggerRound: 6, date: w2.mar1, label: 'Março · 5ª Rodada CAN' },
    { seasonYear: y2, triggerRound: 7, date: w2.mar2, label: 'Março · 6ª Rodada CAN' },
    { seasonYear: y2, triggerRound: 12, date: w2.jun1, label: 'Junho · 7ª Rodada CAN' },
    { seasonYear: y2, triggerRound: 13, date: w2.jun2, label: 'Junho · 8ª Rodada CAN' },
    { seasonYear: y2, triggerRound: 24, date: w2.sep1, label: 'Set/Out · 9ª Rodada CAN' },
    { seasonYear: y2, triggerRound: 25, date: w2.sep2, label: 'Set/Out · 10ª Rodada CAN' },
    { seasonYear: y2, triggerRound: 29, date: w2.oct1, label: 'Set/Out · 11ª Rodada CAN' },
    { seasonYear: y2, triggerRound: 30, date: w2.oct2, label: 'Set/Out · 12ª Rodada CAN' },
    { seasonYear: y2, triggerRound: 33, date: w2.nov1, label: 'Novembro · 13ª Rodada CAN' },
    { seasonYear: y2, triggerRound: 34, date: w2.nov2, label: 'Novembro · Rodada Final CAN (14ª)' },
  ];

  const trackConfigs: {
    id: ContinentalQualifierTrackId;
    title: string;
    targetCompId: ContinentalCompId;
    targetCompName: string;
    numGroups: number;
    qualifyPerGroup: number;
    koTime: string;
  }[] = [
    {
      id: 'CAF',
      title: `Eliminatórias da Copa Africana ${targetContinentalYear}`,
      targetCompId: 'copa_africana',
      targetCompName: `Copa Africana de Nações ${targetContinentalYear} (56 seleções · 8 grupos de 7 · Top 4 de cada = 32 vagas)`,
      numGroups: 8,
      qualifyPerGroup: 4,
      koTime: '17:00',
    },
    {
      id: 'AFC',
      title: `Eliminatórias da Copa da Ásia ${targetContinentalYear}`,
      targetCompId: 'copa_asia',
      targetCompName: `Copa da Ásia AFC ${targetContinentalYear} (4 grupos de 12 · Top 8 de cada = 32 seleções)`,
      numGroups: 4,
      qualifyPerGroup: 8,
      koTime: '15:00',
    },
    {
      id: 'CONCACAF',
      title: `Liga das Nações CONCACAF ${y1}/${String(y2).slice(-2)} · Vagas Copa Ouro ${y2} & Copa América ${targetContinentalYear}`,
      targetCompId: 'copa_america',
      targetCompName: `Copa Ouro ${y2} (16 seleções) & Copa América ${targetContinentalYear} (4 líderes + 2 melhores 2ºs -> 6 convidados)`,
      numGroups: 4,
      qualifyPerGroup: 1,
      koTime: '21:00',
    },
    {
      id: 'OFC',
      title: `Eliminatórias da Copa da Oceania ${targetContinentalYear}`,
      targetCompId: 'copa_oceania',
      targetCompName: `Copa da Oceania ${targetContinentalYear} (11 seleções em 10 jogos no ano de ${y2} · 8 melhores vão para 2 Grupos de 4 + Semi/Final)`,
      numGroups: 1,
      qualifyPerGroup: 8,
      koTime: '04:00',
    },
  ];

  const tracks = {} as Record<ContinentalQualifierTrackId, ContinentalQualifiersTrack>;
  tracks.UEFA = buildUefaEuroQualifiersTrack(targetContinentalYear, preSimulateCompleted);

  for (const cfg of trackConfigs) {
    const teamIds = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === cfg.id).map(
      (t) => t.id
    );
    const groupMap: Record<string, string> =
      cfg.numGroups === 1
        ? Object.fromEntries(teamIds.map((tid) => [tid, 'Grupo Único']))
        : assignBalancedGroupsBySeed(teamIds, cfg.numGroups, targetContinentalYear + 3);
    const uniqueGroups = Array.from(new Set(Object.values(groupMap))).sort();
    const fixtures: InternationalMatchFixture[] = [];
    const activeSlots =
      cfg.id === 'CAF'
        ? cafScheduleSlots
        : cfg.id === 'CONCACAF'
        ? concacafScheduleSlots
        : cfg.id === 'OFC'
        ? ofcScheduleSlots
        : scheduleSlots;

    for (const grp of uniqueGroups) {
      const members = teamIds.filter((tid) => groupMap[tid] === grp);
      const rawRounds = generateRoundRobinPairs(members);
      // OFC (11 seleções em Grupo Único -> 11 rodadas) e AFC (4 grupos de 12 -> 11 rodadas) jogam turno único
      const grpRounds =
        cfg.id === 'OFC' || cfg.id === 'AFC'
          ? rawRounds.slice(0, Math.ceil(rawRounds.length / 2))
          : rawRounds;
      grpRounds.forEach((pairs, rIdx) => {
        const slot = activeSlots[rIdx] || activeSlots[activeSlots.length - 1];
        pairs.forEach(([hId, aId], mIdx) => {
          let fix: InternationalMatchFixture = {
            id: `contq_${targetContinentalYear}_${cfg.id}_${grp.replace(/\s+/g, '')}_r${rIdx + 1}_m${mIdx}`,
            competition: 'continental_qualifiers',
            competitionName: cfg.title,
            seasonYear: slot.seasonYear,
            triggerRound: slot.triggerRound,
            date: slot.date,
            time: cfg.koTime,
            dateLabel: `${formatShortDate(slot.date)} · ${slot.label}`,
            phase: `${grp} · Rodada ${rIdx + 1} de ${grpRounds.length}`,
            qualifiersRound: rIdx + 1,
            group: grp,
            homeTeamId: hId,
            awayTeamId: aId,
            stadiumName: getNationalTeamById(hId).homeStadium,
            played: false,
            status: 'PENDING',
            homeScore: null,
            awayScore: null,
          };
          if (preSimulateCompleted) {
            fix = simulateCpuInternationalFixture(
              fix,
              false,
              `arch_contq_${targetContinentalYear}_${cfg.id}_${grp}_${rIdx}_${mIdx}`
            );
          }
          fixtures.push(fix);
        });
      });
    }

    const standings = recomputeNationalStandings(teamIds, fixtures, groupMap);
    const qualifiedTeamIds = computeContinentalTrackQualified(
      cfg.id,
      standings,
      targetContinentalYear,
      fixtures
    );

    tracks[cfg.id] = {
      id: cfg.id,
      title: cfg.title,
      targetCompId: cfg.targetCompId,
      targetCompName: cfg.targetCompName,
      totalRounds: cfg.id === 'CAF' ? 14 : cfg.id === 'OFC' || cfg.id === 'AFC' ? 11 : 6,
      qualifyPerGroup: cfg.qualifyPerGroup,
      standings,
      fixtures,
      qualifiedTeamIds,
    };
  }

  return {
    targetContinentalYear,
    currentRound: preSimulateCompleted ? 6 : 1,
    totalRounds: 6,
    tracks,
    conmebolNote:
      'Na CONMEBOL todas as 10 seleções sul-americanas têm vaga garantida na Copa América; as 6 vagas convidadas da CONCACAF são definidas pela Liga das Nações CONCACAF.',
  };
}

// ============================================================================
// COPA DO MUNDO FIFA (48 SELEÇÕES: 12 GRUPOS A–L + MATA-MATA DE 32 ATÉ A FINAL)
// ============================================================================

const WORLD_CUP_VENUES_2026 = [
  'MetLife Stadium (Nova York/NJ)',
  'Estádio Azteca (Cidade do México)',
  'SoFi Stadium (Los Angeles)',
  'AT&T Stadium (Dallas)',
  'Hard Rock Stadium (Miami)',
  'Mercedes-Benz Stadium (Atlanta)',
  'BC Place (Vancouver)',
  'BMO Field (Toronto)',
  'Lumen Field (Seattle)',
  'Estádio Akron (Guadalajara)',
  'Estádio BBVA (Monterrey)',
  'Lincoln Financial Field (Filadélfia)',
];

const WORLD_CUP_VENUES_2030 = [
  'Estádio Santiago Bernabéu (Madri)',
  'Spotify Camp Nou (Barcelona)',
  'Estádio da Luz (Lisboa)',
  'Estádio do Dragão (Porto)',
  'Grand Stade Hassan II (Casablanca)',
  'Estádio Príncipe Moulay Abdellah (Rabat)',
  'Estádio Metropolitano (Madri)',
  'Estádio José Alvalade (Lisboa)',
  'Estádio La Cartuja (Sevilha)',
  'Grand Stade de Marrakech (Marrakech)',
  'Estádio San Mamés (Bilbao)',
  'Grand Stade de Tanger (Tânger)',
];

const WORLD_CUP_HOSTS_BY_YEAR: Record<number, string> = {
  2026: 'EUA · México · Canadá',
  2030: 'Espanha · Portugal · Marrocos (Centenário: Uruguai · Argentina · Paraguai)',
  2034: 'Arábia Saudita',
  2038: 'Sede Oficial FIFA',
};

export const WORLD_CUP_2026_OFFICIAL_GROUPS: Record<string, string[]> = {
  'Grupo A': ['nt_mex', 'nt_cor', 'nt_afs', 'nt_tch'],
  'Grupo B': ['nt_can', 'nt_bos', 'nt_qat', 'nt_sui'],
  'Grupo C': ['nt_bra', 'nt_mar', 'nt_esc', 'nt_hai'],
  'Grupo D': ['nt_eua', 'nt_par', 'nt_aus', 'nt_tur'],
  'Grupo E': ['nt_ale', 'nt_cur', 'nt_civ', 'nt_equ'],
  'Grupo F': ['nt_hol', 'nt_jap', 'nt_sue', 'nt_tun'],
  'Grupo G': ['nt_bel', 'nt_egi', 'nt_ira', 'nt_nzl'],
  'Grupo H': ['nt_esp', 'nt_cab', 'nt_ara', 'nt_uru'],
  'Grupo I': ['nt_fra', 'nt_sen', 'nt_irq', 'nt_nor'],
  'Grupo J': ['nt_arg', 'nt_alg', 'nt_aut', 'nt_jor'],
  'Grupo K': ['nt_por', 'nt_rdc', 'nt_uzb', 'nt_col'],
  'Grupo L': ['nt_ing', 'nt_cro', 'nt_gan', 'nt_pan'],
};

export interface WorldCupMatchDef {
  group: string;
  round: number;
  date: string;
  time: string;
  homeId: string;
  awayId: string;
  stadium: string;
}

export const WORLD_CUP_2026_OFFICIAL_FIXTURES: WorldCupMatchDef[] = [
  // Grupo A
  { group: 'Grupo A', round: 1, date: '2026-06-11', time: '16:00', homeId: 'nt_mex', awayId: 'nt_afs', stadium: 'Estádio Azteca (Cidade do México)' },
  { group: 'Grupo A', round: 1, date: '2026-06-11', time: '23:00', homeId: 'nt_cor', awayId: 'nt_tch', stadium: 'Estádio Akron (Guadalajara)' },
  { group: 'Grupo A', round: 2, date: '2026-06-18', time: '13:00', homeId: 'nt_tch', awayId: 'nt_afs', stadium: 'Estádio BBVA (Monterrey)' },
  { group: 'Grupo A', round: 2, date: '2026-06-18', time: '22:00', homeId: 'nt_mex', awayId: 'nt_cor', stadium: 'Estádio Azteca (Cidade do México)' },
  { group: 'Grupo A', round: 3, date: '2026-06-24', time: '22:00', homeId: 'nt_tch', awayId: 'nt_mex', stadium: 'Estádio Azteca (Cidade do México)' },
  { group: 'Grupo A', round: 3, date: '2026-06-24', time: '22:00', homeId: 'nt_afs', awayId: 'nt_cor', stadium: 'Estádio Akron (Guadalajara)' },

  // Grupo B
  { group: 'Grupo B', round: 1, date: '2026-06-12', time: '16:00', homeId: 'nt_can', awayId: 'nt_bos', stadium: 'BMO Field (Toronto)' },
  { group: 'Grupo B', round: 1, date: '2026-06-13', time: '16:00', homeId: 'nt_qat', awayId: 'nt_sui', stadium: 'BC Place (Vancouver)' },
  { group: 'Grupo B', round: 2, date: '2026-06-18', time: '16:00', homeId: 'nt_sui', awayId: 'nt_bos', stadium: 'BMO Field (Toronto)' },
  { group: 'Grupo B', round: 2, date: '2026-06-18', time: '19:00', homeId: 'nt_can', awayId: 'nt_qat', stadium: 'BC Place (Vancouver)' },
  { group: 'Grupo B', round: 3, date: '2026-06-24', time: '18:00', homeId: 'nt_sui', awayId: 'nt_can', stadium: 'BC Place (Vancouver)' },
  { group: 'Grupo B', round: 3, date: '2026-06-24', time: '18:00', homeId: 'nt_bos', awayId: 'nt_qat', stadium: 'BMO Field (Toronto)' },

  // Grupo C
  { group: 'Grupo C', round: 1, date: '2026-06-13', time: '19:00', homeId: 'nt_bra', awayId: 'nt_mar', stadium: 'MetLife Stadium (Nova York/NJ)' },
  { group: 'Grupo C', round: 1, date: '2026-06-13', time: '22:00', homeId: 'nt_hai', awayId: 'nt_esc', stadium: 'Hard Rock Stadium (Miami)' },
  { group: 'Grupo C', round: 2, date: '2026-06-19', time: '19:00', homeId: 'nt_esc', awayId: 'nt_mar', stadium: 'Mercedes-Benz Stadium (Atlanta)' },
  { group: 'Grupo C', round: 2, date: '2026-06-19', time: '21:30', homeId: 'nt_bra', awayId: 'nt_hai', stadium: 'Hard Rock Stadium (Miami)' },
  { group: 'Grupo C', round: 3, date: '2026-06-24', time: '19:00', homeId: 'nt_esc', awayId: 'nt_bra', stadium: 'MetLife Stadium (Nova York/NJ)' },
  { group: 'Grupo C', round: 3, date: '2026-06-24', time: '19:00', homeId: 'nt_mar', awayId: 'nt_hai', stadium: 'Mercedes-Benz Stadium (Atlanta)' },

  // Grupo D
  { group: 'Grupo D', round: 1, date: '2026-06-12', time: '22:00', homeId: 'nt_eua', awayId: 'nt_par', stadium: 'SoFi Stadium (Los Angeles)' },
  { group: 'Grupo D', round: 1, date: '2026-06-14', time: '01:00', homeId: 'nt_aus', awayId: 'nt_tur', stadium: 'Lumen Field (Seattle)' },
  { group: 'Grupo D', round: 2, date: '2026-06-19', time: '16:00', homeId: 'nt_eua', awayId: 'nt_aus', stadium: 'Lumen Field (Seattle)' },
  { group: 'Grupo D', round: 2, date: '2026-06-20', time: '00:00', homeId: 'nt_tur', awayId: 'nt_par', stadium: 'SoFi Stadium (Los Angeles)' },
  { group: 'Grupo D', round: 3, date: '2026-06-25', time: '23:00', homeId: 'nt_tur', awayId: 'nt_eua', stadium: 'SoFi Stadium (Los Angeles)' },
  { group: 'Grupo D', round: 3, date: '2026-06-25', time: '23:00', homeId: 'nt_par', awayId: 'nt_aus', stadium: 'Lumen Field (Seattle)' },

  // Grupo E
  { group: 'Grupo E', round: 1, date: '2026-06-14', time: '14:00', homeId: 'nt_ale', awayId: 'nt_cur', stadium: 'Lincoln Financial Field (Filadélfia)' },
  { group: 'Grupo E', round: 1, date: '2026-06-14', time: '20:00', homeId: 'nt_civ', awayId: 'nt_equ', stadium: 'AT&T Stadium (Dallas)' },
  { group: 'Grupo E', round: 2, date: '2026-06-20', time: '17:00', homeId: 'nt_ale', awayId: 'nt_civ', stadium: 'MetLife Stadium (Nova York/NJ)' },
  { group: 'Grupo E', round: 2, date: '2026-06-20', time: '21:00', homeId: 'nt_equ', awayId: 'nt_cur', stadium: 'Lincoln Financial Field (Filadélfia)' },
  { group: 'Grupo E', round: 3, date: '2026-06-25', time: '17:00', homeId: 'nt_equ', awayId: 'nt_ale', stadium: 'AT&T Stadium (Dallas)' },
  { group: 'Grupo E', round: 3, date: '2026-06-25', time: '17:00', homeId: 'nt_cur', awayId: 'nt_civ', stadium: 'Lincoln Financial Field (Filadélfia)' },

  // Grupo F
  { group: 'Grupo F', round: 1, date: '2026-06-14', time: '17:00', homeId: 'nt_hol', awayId: 'nt_jap', stadium: 'AT&T Stadium (Dallas)' },
  { group: 'Grupo F', round: 1, date: '2026-06-14', time: '23:00', homeId: 'nt_sue', awayId: 'nt_tun', stadium: 'Mercedes-Benz Stadium (Atlanta)' },
  { group: 'Grupo F', round: 2, date: '2026-06-20', time: '14:00', homeId: 'nt_hol', awayId: 'nt_sue', stadium: 'AT&T Stadium (Dallas)' },
  { group: 'Grupo F', round: 2, date: '2026-06-20', time: '23:00', homeId: 'nt_tun', awayId: 'nt_jap', stadium: 'Mercedes-Benz Stadium (Atlanta)' },
  { group: 'Grupo F', round: 3, date: '2026-06-25', time: '20:00', homeId: 'nt_tun', awayId: 'nt_hol', stadium: 'Mercedes-Benz Stadium (Atlanta)' },
  { group: 'Grupo F', round: 3, date: '2026-06-25', time: '20:00', homeId: 'nt_jap', awayId: 'nt_sue', stadium: 'AT&T Stadium (Dallas)' },

  // Grupo G
  { group: 'Grupo G', round: 1, date: '2026-06-15', time: '16:00', homeId: 'nt_bel', awayId: 'nt_egi', stadium: 'Lumen Field (Seattle)' },
  { group: 'Grupo G', round: 1, date: '2026-06-15', time: '22:00', homeId: 'nt_ira', awayId: 'nt_nzl', stadium: 'SoFi Stadium (Los Angeles)' },
  { group: 'Grupo G', round: 2, date: '2026-06-21', time: '16:00', homeId: 'nt_bel', awayId: 'nt_ira', stadium: 'SoFi Stadium (Los Angeles)' },
  { group: 'Grupo G', round: 2, date: '2026-06-21', time: '22:00', homeId: 'nt_nzl', awayId: 'nt_egi', stadium: 'Lumen Field (Seattle)' },
  { group: 'Grupo G', round: 3, date: '2026-06-27', time: '00:00', homeId: 'nt_nzl', awayId: 'nt_bel', stadium: 'SoFi Stadium (Los Angeles)' },
  { group: 'Grupo G', round: 3, date: '2026-06-27', time: '00:00', homeId: 'nt_egi', awayId: 'nt_ira', stadium: 'Lumen Field (Seattle)' },

  // Grupo H
  { group: 'Grupo H', round: 1, date: '2026-06-15', time: '13:00', homeId: 'nt_esp', awayId: 'nt_cab', stadium: 'Hard Rock Stadium (Miami)' },
  { group: 'Grupo H', round: 1, date: '2026-06-15', time: '19:00', homeId: 'nt_ara', awayId: 'nt_uru', stadium: 'Mercedes-Benz Stadium (Atlanta)' },
  { group: 'Grupo H', round: 2, date: '2026-06-21', time: '13:00', homeId: 'nt_esp', awayId: 'nt_ara', stadium: 'Mercedes-Benz Stadium (Atlanta)' },
  { group: 'Grupo H', round: 2, date: '2026-06-21', time: '19:00', homeId: 'nt_uru', awayId: 'nt_cab', stadium: 'Hard Rock Stadium (Miami)' },
  { group: 'Grupo H', round: 3, date: '2026-06-26', time: '21:00', homeId: 'nt_uru', awayId: 'nt_esp', stadium: 'Hard Rock Stadium (Miami)' },
  { group: 'Grupo H', round: 3, date: '2026-06-26', time: '21:00', homeId: 'nt_cab', awayId: 'nt_ara', stadium: 'Mercedes-Benz Stadium (Atlanta)' },

  // Grupo I
  { group: 'Grupo I', round: 1, date: '2026-06-16', time: '16:00', homeId: 'nt_fra', awayId: 'nt_sen', stadium: 'MetLife Stadium (Nova York/NJ)' },
  { group: 'Grupo I', round: 1, date: '2026-06-16', time: '19:00', homeId: 'nt_irq', awayId: 'nt_nor', stadium: 'Lincoln Financial Field (Filadélfia)' },
  { group: 'Grupo I', round: 2, date: '2026-06-22', time: '18:00', homeId: 'nt_fra', awayId: 'nt_irq', stadium: 'Lincoln Financial Field (Filadélfia)' },
  { group: 'Grupo I', round: 2, date: '2026-06-22', time: '21:00', homeId: 'nt_nor', awayId: 'nt_sen', stadium: 'MetLife Stadium (Nova York/NJ)' },
  { group: 'Grupo I', round: 3, date: '2026-06-26', time: '16:00', homeId: 'nt_nor', awayId: 'nt_fra', stadium: 'MetLife Stadium (Nova York/NJ)' },
  { group: 'Grupo I', round: 3, date: '2026-06-26', time: '16:00', homeId: 'nt_sen', awayId: 'nt_irq', stadium: 'Lincoln Financial Field (Filadélfia)' },

  // Grupo J
  { group: 'Grupo J', round: 1, date: '2026-06-16', time: '22:00', homeId: 'nt_arg', awayId: 'nt_alg', stadium: 'AT&T Stadium (Dallas)' },
  { group: 'Grupo J', round: 1, date: '2026-06-17', time: '01:00', homeId: 'nt_aut', awayId: 'nt_jor', stadium: 'Mercedes-Benz Stadium (Atlanta)' },
  { group: 'Grupo J', round: 2, date: '2026-06-22', time: '14:00', homeId: 'nt_arg', awayId: 'nt_aut', stadium: 'AT&T Stadium (Dallas)' },
  { group: 'Grupo J', round: 2, date: '2026-06-23', time: '00:00', homeId: 'nt_jor', awayId: 'nt_alg', stadium: 'Mercedes-Benz Stadium (Atlanta)' },
  { group: 'Grupo J', round: 3, date: '2026-06-27', time: '23:00', homeId: 'nt_jor', awayId: 'nt_arg', stadium: 'AT&T Stadium (Dallas)' },
  { group: 'Grupo J', round: 3, date: '2026-06-27', time: '23:00', homeId: 'nt_alg', awayId: 'nt_aut', stadium: 'Mercedes-Benz Stadium (Atlanta)' },

  // Grupo K
  { group: 'Grupo K', round: 1, date: '2026-06-17', time: '14:00', homeId: 'nt_por', awayId: 'nt_rdc', stadium: 'Lincoln Financial Field (Filadélfia)' },
  { group: 'Grupo K', round: 1, date: '2026-06-17', time: '21:00', homeId: 'nt_uzb', awayId: 'nt_col', stadium: 'Hard Rock Stadium (Miami)' },
  { group: 'Grupo K', round: 2, date: '2026-06-23', time: '14:00', homeId: 'nt_por', awayId: 'nt_uzb', stadium: 'Lincoln Financial Field (Filadélfia)' },
  { group: 'Grupo K', round: 2, date: '2026-06-23', time: '23:00', homeId: 'nt_col', awayId: 'nt_rdc', stadium: 'Hard Rock Stadium (Miami)' },
  { group: 'Grupo K', round: 3, date: '2026-06-27', time: '20:30', homeId: 'nt_col', awayId: 'nt_por', stadium: 'Hard Rock Stadium (Miami)' },
  { group: 'Grupo K', round: 3, date: '2026-06-27', time: '20:30', homeId: 'nt_rdc', awayId: 'nt_uzb', stadium: 'Lincoln Financial Field (Filadélfia)' },

  // Grupo L
  { group: 'Grupo L', round: 1, date: '2026-06-17', time: '17:00', homeId: 'nt_ing', awayId: 'nt_cro', stadium: 'MetLife Stadium (Nova York/NJ)' },
  { group: 'Grupo L', round: 1, date: '2026-06-17', time: '20:00', homeId: 'nt_gan', awayId: 'nt_pan', stadium: 'BMO Field (Toronto)' },
  { group: 'Grupo L', round: 2, date: '2026-06-23', time: '17:00', homeId: 'nt_ing', awayId: 'nt_gan', stadium: 'MetLife Stadium (Nova York/NJ)' },
  { group: 'Grupo L', round: 2, date: '2026-06-23', time: '20:00', homeId: 'nt_pan', awayId: 'nt_cro', stadium: 'BMO Field (Toronto)' },
  { group: 'Grupo L', round: 3, date: '2026-06-27', time: '18:00', homeId: 'nt_pan', awayId: 'nt_ing', stadium: 'BMO Field (Toronto)' },
  { group: 'Grupo L', round: 3, date: '2026-06-27', time: '18:00', homeId: 'nt_cro', awayId: 'nt_gan', stadium: 'MetLife Stadium (Nova York/NJ)' },
];

export function generateWorldCupEdition(
  year: number,
  qualifiedTeamIds?: string[],
  preSimulateCompleted: boolean = false
): NationalTournamentEdition {
  const hostName = WORLD_CUP_HOSTS_BY_YEAR[year] || 'Sede Oficial FIFA';

  if (year === 2026) {
    const groups = Object.keys(WORLD_CUP_2026_OFFICIAL_GROUPS);
    const groupMap: Record<string, string> = {};
    const participants: string[] = [];

    for (const [gName, tids] of Object.entries(WORLD_CUP_2026_OFFICIAL_GROUPS)) {
      tids.forEach((tid) => {
        groupMap[tid] = gName;
        participants.push(tid);
      });
    }

    const fixtures: InternationalMatchFixture[] = WORLD_CUP_2026_OFFICIAL_FIXTURES.map((m, idx) => ({
      id: `wc_2026_${m.group.replace(/\s+/g, '')}_r${m.round}_m${idx}`,
      competition: 'world_cup',
      competitionName: 'Copa do Mundo FIFA 2026',
      seasonYear: 2026,
      triggerRound: 13 + m.round,
      date: m.date,
      time: m.time,
      dateLabel: `${formatShortDate(m.date)} · Fase de Grupos (${m.round}ª Rodada)`,
      phase: `Fase de Grupos · ${m.round}ª Rodada`,
      group: m.group,
      homeTeamId: m.homeId,
      awayTeamId: m.awayId,
      stadiumName: m.stadium,
      played: false,
      status: 'PENDING',
      homeScore: null,
      awayScore: null,
    }));

    let edition: NationalTournamentEdition = {
      id: `world_cup_${year}`,
      compId: 'world_cup',
      title: `Copa do Mundo FIFA ${year}`,
      hostName,
      year,
      status: 'UPCOMING',
      groups,
      standings: createEmptyNationalStandings(participants, groupMap),
      fixtures,
    };

    if (preSimulateCompleted) {
      edition = fullySimulateTournamentEdition(edition, `wc_seed_${year}`);
    }

    return edition;
  }

  // Future quadrennial cycles (2030, 2034, 2038...)
  const participants =
    qualifiedTeamIds && qualifiedTeamIds.length === 48
      ? [...qualifiedTeamIds]
      : [...NATIONAL_TEAMS_CATALOG]
          .sort((a, b) => b.fifaPoints - a.fifaPoints)
          .map((t) => t.id)
          .slice(0, 48);

  // Sort into 4 pots of 12 teams by FIFA points/strength; for 2030 prioritize Centennial & Main Co-hosts in Pot 1
  const hostPriority2030 = year === 2030 ? ['nt_uru', 'nt_arg', 'nt_par', 'nt_esp', 'nt_por', 'nt_mar'] : [];
  const sortedByRank = [...participants].sort((a, b) => {
    const idxA = hostPriority2030.indexOf(a);
    const idxB = hostPriority2030.indexOf(b);
    if (idxA >= 0 && idxB >= 0) return idxA - idxB;
    if (idxA >= 0) return -1;
    if (idxB >= 0) return 1;
    return getNationalTeamById(b).fifaPoints - getNationalTeamById(a).fifaPoints;
  });
  const pots = [
    sortedByRank.slice(0, 12),
    sortedByRank.slice(12, 24),
    sortedByRank.slice(24, 36),
    sortedByRank.slice(36, 48),
  ];

  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const groups = groupLetters.map((l) => `Grupo ${l}`);
  const groupMap: Record<string, string> = {};
  const groupTeams: Record<string, string[]> = {};

  groupLetters.forEach((letter, gIdx) => {
    const gName = `Grupo ${letter}`;
    const offset = year - 2026;
    const t0 = pots[0][gIdx];
    const t1 = pots[1][(gIdx + 3 + offset) % 12];
    const t2 = pots[2][(gIdx + 7 + offset) % 12];
    const t3 = pots[3][(gIdx + 5 + offset) % 12];
    groupTeams[gName] = [t0, t1, t2, t3];
    [t0, t1, t2, t3].forEach((tid) => {
      groupMap[tid] = gName;
    });
  });

  const activeVenues = year === 2030 ? WORLD_CUP_VENUES_2030 : WORLD_CUP_VENUES_2026;
  const centennialOpeners2030: Record<string, { date: string; time: string; stadium: string; label: string }> = {
    nt_uru: {
      date: '2030-06-08',
      time: '19:00',
      stadium: 'Estádio Centenário (Montevidéu)',
      label: '08/06 · Abertura do Centenário FIFA',
    },
    nt_arg: {
      date: '2030-06-09',
      time: '17:00',
      stadium: 'Estádio Monumental (Buenos Aires)',
      label: '09/06 · Jogo do Centenário FIFA',
    },
    nt_par: {
      date: '2030-06-09',
      time: '20:30',
      stadium: 'Estádio Defensores del Chaco (Assunção)',
      label: '09/06 · Jogo do Centenário FIFA',
    },
  };

  const fixtures: InternationalMatchFixture[] = [];
  groups.forEach((gName, gIdx) => {
    const [t0, t1, t2, t3] = groupTeams[gName];
    // Copa 2030: Jogos inaugurais do Centenário em 8 e 9/06 na América do Sul, início nas sedes principais (ESP/POR/MAR) em 13/06, Final em 21/07
    const md1Date =
      year === 2030
        ? `${year}-06-${String(13 + Math.floor(gIdx / 3)).padStart(2, '0')}` // Jun 13..16
        : `${year}-06-${String(11 + Math.floor(gIdx / 2)).padStart(2, '0')}`;
    const md2Date =
      year === 2030
        ? `${year}-06-${String(19 + Math.floor(gIdx / 3)).padStart(2, '0')}` // Jun 19..22
        : `${year}-06-${String(18 + Math.floor(gIdx / 2)).padStart(2, '0')}`;
    const md3Date =
      year === 2030
        ? `${year}-06-${String(25 + Math.floor(gIdx / 3)).padStart(2, '0')}` // Jun 25..28
        : `${year}-06-${String(24 + Math.floor(gIdx / 3)).padStart(2, '0')}`;

    const matchdays: { round: number; date: string; pairs: [string, string][] }[] = [
      { round: 14, date: md1Date, pairs: [[t0, t1], [t2, t3]] },
      { round: 15, date: md2Date, pairs: [[t0, t2], [t3, t1]] },
      { round: 16, date: md3Date, pairs: [[t3, t0], [t1, t2]] },
    ];

    matchdays.forEach((md, mdIdx) => {
      md.pairs.forEach(([hId, aId], pIdx) => {
        const centOpener =
          year === 2030 && mdIdx === 0 && pIdx === 0 ? centennialOpeners2030[hId] : undefined;
        const matchDate = centOpener ? centOpener.date : md.date;
        const venue = centOpener
          ? centOpener.stadium
          : activeVenues[(gIdx * 2 + mdIdx + pIdx) % activeVenues.length];
        const koTime = centOpener
          ? centOpener.time
          : mdIdx === 2
          ? '19:00'
          : pIdx === 0
          ? '16:00'
          : '20:00';
        const dLabel = centOpener
          ? centOpener.label
          : `${formatShortDate(matchDate)} · Fase de Grupos (${mdIdx + 1}ª Rodada)`;
        fixtures.push({
          id: `wc_${year}_${gName.replace(/\s+/g, '')}_r${mdIdx + 1}_m${pIdx}`,
          competition: 'world_cup',
          competitionName: `Copa do Mundo FIFA ${year}`,
          seasonYear: year,
          triggerRound: md.round,
          date: matchDate,
          time: koTime,
          dateLabel: dLabel,
          phase: centOpener ? 'Fase de Grupos · Centenário (1ª Rodada)' : `Fase de Grupos · ${mdIdx + 1}ª Rodada`,
          group: gName,
          homeTeamId: hId,
          awayTeamId: aId,
          stadiumName: venue,
          played: false,
          status: 'PENDING',
          homeScore: null,
          awayScore: null,
        });
      });
    });
  });

  let edition: NationalTournamentEdition = {
    id: `world_cup_${year}`,
    compId: 'world_cup',
    title: `Copa do Mundo FIFA ${year}`,
    hostName,
    year,
    status: 'UPCOMING',
    groups,
    standings: createEmptyNationalStandings(participants, groupMap),
    fixtures,
  };

  if (preSimulateCompleted) {
    edition = fullySimulateTournamentEdition(edition, `wc_seed_${year}`);
  }

  return edition;
}

// ============================================================================
// CAMPEONATOS CONTINENTAIS (COPA AMÉRICA, EUROCOPA, COPA AFRICANA, COPA DA ÁSIA)
// CICLO QUADRIENAL UNIFICADO NO MEIO DE ANO: 2024 (ARQUIVO), 2028, 2032, 2036...
// ============================================================================

export const UEFA_NATIONS_LEAGUE_2026_28_GROUPS: Record<string, string[]> = {
  'Grupo A1': ['nt_ita', 'nt_fra', 'nt_bel', 'nt_tur'],
  'Grupo A2': ['nt_hol', 'nt_gre', 'nt_ale', 'nt_ser'],
  'Grupo A3': ['nt_esp', 'nt_ing', 'nt_cro', 'nt_tch'],
  'Grupo A4': ['nt_por', 'nt_din', 'nt_gal', 'nt_nor'],
  'Grupo B1': ['nt_sui', 'nt_svn', 'nt_esc', 'nt_mdn'],
  'Grupo B2': ['nt_nir', 'nt_hun', 'nt_ucr', 'nt_geo'],
  'Grupo B3': ['nt_aut', 'nt_kos', 'nt_irl', 'nt_isr'],
  'Grupo B4': ['nt_sue', 'nt_bos', 'nt_pol', 'nt_rom'],
  'Grupo C1': ['nt_alb', 'nt_blr', 'nt_fin', 'nt_smr'],
  'Grupo C2': ['nt_mne', 'nt_cyp', 'nt_arm', 'nt_ltn'],
  'Grupo C3': ['nt_svk', 'nt_mda', 'nt_fro', 'nt_czq'],
  'Grupo C4': ['nt_isl', 'nt_est', 'nt_bul', 'nt_lux'],
  'Grupo D1': ['nt_mlt', 'nt_and', 'nt_gib'],
  'Grupo D2': ['nt_aze', 'nt_ltu', 'nt_lie'],
};

export const COPA_AMERICA_2028_OFFICIAL_PARTICIPANTS: string[] = [
  'nt_arg', // Argentina
  'nt_equ', // Equador
  'nt_col', // Colômbia
  'nt_uru', // Uruguai
  'nt_bra', // Brasil
  'nt_par', // Paraguai
  'nt_bol', // Bolívia
  'nt_ven', // Venezuela
  'nt_per', // Peru
  'nt_chi', // Chile
  'nt_eua', // Estados Unidos
  'nt_mex', // México
  'nt_can', // Canadá
  'nt_rus', // Rússia
  'nt_crc', // Costa Rica
  'nt_jam', // Jamaica
];

export function generateContinentalEdition(
  compId: ContinentalCompId,
  year: number,
  preSimulateCompleted: boolean = false,
  qualifiedTeamsOverride?: string[]
): NationalTournamentEdition {
  let title = '';
  let hostName = '';
  let participants: string[] = [];

  if (compId === 'copa_america') {
    title = `CONMEBOL Copa América ${year}`;
    hostName =
      year === 2024
        ? 'Estados Unidos'
        : year === 2028
        ? 'Paraguai'
        : year === 2032
        ? 'Argentina · Uruguai'
        : 'Sede CONMEBOL';
    if (year === 2028) {
      participants = [...COPA_AMERICA_2028_OFFICIAL_PARTICIPANTS];
    } else if (qualifiedTeamsOverride && qualifiedTeamsOverride.length === 16) {
      participants = [...qualifiedTeamsOverride];
    } else {
      participants = [...COPA_AMERICA_2028_OFFICIAL_PARTICIPANTS];
    }
  } else if (compId === 'eurocopa') {
    title = `UEFA Eurocopa ${year}`;
    hostName =
      year === 2024
        ? 'Alemanha'
        : year === 2028
        ? 'Reino Unido & Irlanda (ING · ESC · GAL · IRL)'
        : year === 2032
        ? 'Itália & Turquia'
        : 'Sede UEFA';
    participants =
      qualifiedTeamsOverride && qualifiedTeamsOverride.length === 24
        ? [...qualifiedTeamsOverride]
        : NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'UEFA')
            .sort((a, b) => b.fifaPoints - a.fifaPoints)
            .map((t) => t.id)
            .slice(0, 24);
  } else if (compId === 'copa_africana') {
    title = `Copa Africana de Nações ${year}`;
    hostName =
      year <= 2024
        ? 'Costa do Marfim'
        : year === 2028
        ? 'Uganda · Tanzânia · Quênia'
        : year === 2032
        ? 'Marrocos'
        : 'África do Sul · Senegal';
    participants =
      qualifiedTeamsOverride && qualifiedTeamsOverride.length === 32
        ? [...qualifiedTeamsOverride]
        : NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'CAF')
            .sort((a, b) => b.fifaPoints - a.fifaPoints)
            .map((t) => t.id)
            .slice(0, 32);
  } else if (compId === 'copa_asia') {
    title = `Copa da Ásia AFC ${year}`;
    hostName = year <= 2024 ? 'Catar' : year === 2028 ? 'Arábia Saudita' : 'Austrália / Japão';
    participants =
      qualifiedTeamsOverride && qualifiedTeamsOverride.length === 32
        ? [...qualifiedTeamsOverride]
        : NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'AFC')
            .sort((a, b) => b.fifaPoints - a.fifaPoints)
            .map((t) => t.id)
            .slice(0, 32);
  } else if (compId === 'copa_oceania') {
    title = `Copa das Nações da OFC ${year}`;
    hostName =
      year <= 2024
        ? 'Fiji & Vanuatu'
        : year === 2028
        ? 'Nova Zelândia & Fiji'
        : year === 2032
        ? 'Taiti & Nova Caledônia'
        : 'Nova Zelândia & Ilhas Salomão';
    participants =
      qualifiedTeamsOverride && qualifiedTeamsOverride.length === 8
        ? [...qualifiedTeamsOverride]
        : NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'OFC')
            .sort((a, b) => b.fifaPoints - a.fifaPoints)
            .map((t) => t.id)
            .slice(0, 8);
  } else if (compId === 'copa_ouro') {
    title = `Copa Ouro CONCACAF ${year}`;
    hostName =
      year <= 2025
        ? 'Estados Unidos & Canadá'
        : year % 4 === 3
        ? 'Estados Unidos & Canadá'
        : 'Estados Unidos & México';
    participants =
      qualifiedTeamsOverride && qualifiedTeamsOverride.length === 16
        ? [...qualifiedTeamsOverride]
        : NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'CONCACAF')
            .sort((a, b) => b.fifaPoints - a.fifaPoints)
            .map((t) => t.id)
            .slice(0, 16);
  } else {
    // UEFA Nations League:
    // - 2026/27 (Transição · 4 Ligas A/B/C/D · 54 seleções · Quartas ida/volta Mar/27 + Final Four Jun/27)
    // - 2028/29+ (Novo Regulamento · 3 Ligas A/B/C · 3 grupos de 6 por liga · Sistema Suíço 6 rodadas · Quartas + Final Four)
    title = `UEFA Nations League ${year}/${String(year + 1).slice(-2)}`;
    hostName =
      year === 2026
        ? 'Europa (4 Ligas · Transição 2026/27 · QF + Final Four)'
        : 'Europa (3 Ligas A/B/C · Sistema Suíço 3×6 · QF + Final Four)';
    participants =
      qualifiedTeamsOverride && qualifiedTeamsOverride.length >= 16
        ? [...qualifiedTeamsOverride]
        : NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'UEFA')
            .sort((a, b) => b.fifaPoints - a.fifaPoints)
            .map((t) => t.id);
  }

  let groups: string[] = [];
  const groupMap: Record<string, string> = {};
  const groupTeams: Record<string, string[]> = {};

  if (compId === 'nations_league') {
    if (year === 2026) {
      groups = Object.keys(UEFA_NATIONS_LEAGUE_2026_28_GROUPS);
      participants = [];
      for (const grp of groups) {
        const members = [...UEFA_NATIONS_LEAGUE_2026_28_GROUPS[grp]];
        groupTeams[grp] = members;
        members.forEach((tid) => {
          groupMap[tid] = grp;
          participants.push(tid);
        });
      }
    } else {
      // Reforma UEFA 2028/29+: Liga D extinta -> 3 divisões (Ligas A, B e C) com 18 seleções cada (3 grupos de 6 por liga)
      const sortedUefa = [...participants].sort(
        (a, b) => getNationalTeamById(b).fifaPoints - getNationalTeamById(a).fifaPoints
      );
      const buildSwissDivision = (slice: string[], prefix: string, numGrps: number) => {
        const grpNames = Array.from({ length: numGrps }, (_, i) => `Grupo ${prefix}${i + 1}`);
        grpNames.forEach((g) => {
          groupTeams[g] = [];
          groups.push(g);
        });
        slice.forEach((tid, idx) => {
          const pot = Math.floor(idx / numGrps);
          const posInPot = idx % numGrps;
          const gIdx = (pot % 2 === 0 ? posInPot : numGrps - 1 - posInPot + year) % numGrps;
          const normIdx = ((gIdx % numGrps) + numGrps) % numGrps;
          const gName = grpNames[normIdx];
          groupTeams[gName].push(tid);
          groupMap[tid] = gName;
        });
      };
      buildSwissDivision(sortedUefa.slice(0, 18), 'A', 3);
      buildSwissDivision(sortedUefa.slice(18, 36), 'B', 3);
      buildSwissDivision(sortedUefa.slice(36, 54), 'C', 3);
    }
  } else {
    const sorted = [...participants].sort(
      (a, b) => getNationalTeamById(b).fifaPoints - getNationalTeamById(a).fifaPoints
    );
    const groupCount =
      participants.length === 32
        ? 8
        : participants.length === 24
        ? 6
        : participants.length === 16
        ? 4
        : 2;
    const groupLetters =
      groupCount === 8
        ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        : groupCount === 6
        ? ['A', 'B', 'C', 'D', 'E', 'F']
        : groupCount === 4
        ? ['A', 'B', 'C', 'D']
        : ['A', 'B'];
    groups = groupLetters.map((l) => `Grupo ${l}`);

    const pots = [
      sorted.slice(0, groupCount),
      sorted.slice(groupCount, groupCount * 2),
      sorted.slice(groupCount * 2, groupCount * 3),
      sorted.slice(groupCount * 3, groupCount * 4),
    ];

    groupLetters.forEach((letter, gIdx) => {
      const gName = `Grupo ${letter}`;
      const members = [
        pots[0][gIdx],
        pots[1][(gIdx + 1) % groupCount],
        pots[2][(gIdx + (groupCount > 2 ? 2 : 0)) % groupCount],
        pots[3][(gIdx + (groupCount > 4 ? 3 : 1)) % groupCount],
      ];
      groupTeams[gName] = members;
      members.forEach((tid) => {
        groupMap[tid] = gName;
      });
    });
  }

  const fixtures: InternationalMatchFixture[] = [];

  if (compId === 'nations_league') {
    const w = getFifaWindowDatesForYear(year);
    const nlDates = [
      { round: 24, date: w.sep1, label: 'Setembro · 1ª Rodada' },
      { round: 25, date: w.sep2, label: 'Setembro · 2ª Rodada' },
      { round: 29, date: w.oct1, label: 'Outubro · 3ª Rodada' },
      { round: 30, date: w.oct2, label: 'Outubro · 4ª Rodada' },
      { round: 33, date: w.nov1, label: 'Novembro · 5ª Rodada' },
      { round: 34, date: w.nov2, label: 'Novembro · 6ª Rodada' },
    ];
    groups.forEach((gName) => {
      const members = groupTeams[gName];
      const rr =
        year >= 2028 && members.length === 6
          ? generateUefaSwiss6RoundPairs(members) // 6 rodadas suíças (5 rivais diferentes + volta vs mesmo pote)
          : generateRoundRobinPairs(members); // 2026/27: 6 rodadas ida e volta
      const divTag = gName.startsWith('Grupo A')
        ? 'Liga A'
        : gName.startsWith('Grupo B')
        ? 'Liga B'
        : gName.startsWith('Grupo C')
        ? 'Liga C'
        : 'Liga D';
      rr.forEach((pairs, rIdx) => {
        const slot = nlDates[rIdx] || nlDates[nlDates.length - 1];
        pairs.forEach(([hId, aId], pIdx) => {
          fixtures.push({
            id: `${compId}_${year}_${gName.replace(/\s+/g, '')}_r${rIdx + 1}_m${pIdx}`,
            competition: 'nations_league',
            competitionName: title,
            seasonYear: slot.round >= 24 ? year : year + 1,
            triggerRound: slot.round,
            date: slot.date,
            time: pIdx === 0 ? '15:45' : '16:45',
            dateLabel: `${formatShortDate(slot.date)} · ${slot.label}`,
            phase: `${divTag} · ${gName} · ${rIdx + 1}ª Rodada`,
            group: gName,
            homeTeamId: hId,
            awayTeamId: aId,
            stadiumName: getNationalTeamById(hId).homeStadium,
            played: false,
            status: 'PENDING',
            homeScore: null,
            awayScore: null,
          });
        });
      });
    });
  } else {
    groups.forEach((gName, gIdx) => {
      const [t0, t1, t2, t3] = groupTeams[gName];
      const isGoldCup = compId === 'copa_ouro';
      const isCopaAmerica = compId === 'copa_america';
      const isEuro = compId === 'eurocopa';
      const is32Teams = groups.length === 8;
      // Eurocopa (24 seleções · 6 grupos): 9 a 21 de junho (R1: 9–11, R2: 14–16, R3: 19–21)
      // Copa América usa datas exclusivas (Jun 11–12, 18–19, 24/27) sem sobrepor a Copa da Ásia (Jun 14–17, 20–23, 25–26)
      const md1Date = isEuro
        ? `${year}-06-${String(9 + Math.floor(gIdx / 2)).padStart(2, '0')}` // Jun 09..11
        : isGoldCup
        ? `${year}-06-${String(17 + Math.min(2, gIdx)).padStart(2, '0')}` // Jun 17..19 (pós-Data FIFA de junho)
        : isCopaAmerica
        ? `${year}-06-${gIdx < 2 ? '11' : '12'}` // Jun 11..12
        : is32Teams
        ? `${year}-06-${String(14 + Math.floor(gIdx / 2)).padStart(2, '0')}` // Jun 14..17 (2 grupos/dia)
        : `${year}-06-${String(14 + gIdx).padStart(2, '0')}`; // Jun 14..17
      const md2Date = isEuro
        ? `${year}-06-${String(14 + Math.floor(gIdx / 2)).padStart(2, '0')}` // Jun 14..16
        : isGoldCup
        ? `${year}-06-${String(21 + Math.min(2, gIdx)).padStart(2, '0')}` // Jun 21..23
        : isCopaAmerica
        ? `${year}-06-${gIdx < 2 ? '18' : '19'}` // Jun 18..19
        : is32Teams
        ? `${year}-06-${String(20 + Math.floor(gIdx / 2)).padStart(2, '0')}` // Jun 20..23 (2 grupos/dia)
        : `${year}-06-${String(20 + gIdx).padStart(2, '0')}`; // Jun 20..23
      const md3Date = isEuro
        ? `${year}-06-${String(19 + Math.floor(gIdx / 2)).padStart(2, '0')}` // Jun 19..21
        : isCopaAmerica
        ? `${year}-06-${gIdx < 2 ? '24' : '27'}` // Jun 24 & Jun 27
        : is32Teams
        ? `${year}-06-${String(25 + Math.floor(gIdx / 4)).padStart(2, '0')}` // Jun 25..26 (4 grupos/dia)
        : `${year}-06-${String(25 + Math.floor(gIdx / 2)).padStart(2, '0')}`; // Jun 25..26

      const mds: { round: number; date: string; pairs: [string, string][] }[] = [
        { round: 15, date: md1Date, pairs: [[t0, t1], [t2, t3]] },
        { round: 16, date: md2Date, pairs: [[t0, t2], [t3, t1]] },
        { round: 17, date: md3Date, pairs: [[t3, t0], [t1, t2]] },
      ];
      mds.forEach((md, mdIdx) => {
        md.pairs.forEach(([hId, aId], pIdx) => {
          const koTime = mdIdx === 2 ? '20:00' : pIdx === 0 ? '16:00' : '20:00';
          fixtures.push({
            id: `${compId}_${year}_${gName.replace(/\s+/g, '')}_r${mdIdx + 1}_m${pIdx}`,
            competition: compId,
            competitionName: title,
            seasonYear: year,
            triggerRound: md.round,
            date: md.date,
            time: koTime,
            dateLabel: `${formatShortDate(md.date)} · ${mdIdx + 1}ª Rodada`,
            phase: `Fase de Grupos · ${mdIdx + 1}ª Rodada`,
            group: gName,
            homeTeamId: hId,
            awayTeamId: aId,
            stadiumName: getNationalTeamById(hId).homeStadium,
            played: false,
            status: 'PENDING',
            homeScore: null,
            awayScore: null,
          });
        });
      });
    });
  }

  let edition: NationalTournamentEdition = {
    id: `${compId}_${year}`,
    compId,
    title,
    hostName,
    year,
    status: 'UPCOMING',
    groups,
    standings: createEmptyNationalStandings(participants, groupMap),
    fixtures,
  };

  if (preSimulateCompleted) {
    edition = fullySimulateTournamentEdition(edition, `${compId}_seed_${year}`);
  }

  return edition;
}

function getTournamentKnockoutDateAndTime(
  compId: 'world_cup' | ContinentalCompId,
  year: number,
  phase: string,
  slot: number
): { date: string; time: string } {
  if (compId === 'world_cup') {
    if (year === 2030) {
      // Copa do Mundo FIFA 2030 (Centenário): 8/06–21/07/2030
      if (phase === '16-avos de Final') {
        const d = slot <= 4 ? '06-30' : slot <= 8 ? '07-01' : slot <= 12 ? '07-02' : '07-03';
        return { date: `${year}-${d}`, time: slot % 2 === 1 ? '16:00' : '20:00' };
      }
      if (phase === 'Oitavas de Final') {
        const d = slot <= 2 ? '07-06' : slot <= 4 ? '07-07' : slot <= 6 ? '07-08' : '07-09';
        return { date: `${year}-${d}`, time: slot % 2 === 1 ? '16:00' : '20:00' };
      }
      if (phase === 'Quartas de Final') {
        const d = slot <= 2 ? '07-12' : '07-13';
        return { date: `${year}-${d}`, time: slot % 2 === 1 ? '16:00' : '20:00' };
      }
      if (phase === 'Semifinal') {
        return { date: slot === 1 ? `${year}-07-16` : `${year}-07-17`, time: '16:00' };
      }
      if (phase === 'Disputa de 3º Lugar') {
        return { date: `${year}-07-20`, time: '16:00' };
      }
      return { date: `${year}-07-21`, time: '16:00' }; // Grande Final em 21 de julho de 2030
    }
    if (phase === '16-avos de Final') {
      const scheduleBySlot: Record<number, { date: string; time: string }> = {
        1: { date: `${year}-06-29`, time: '17:30' },
        2: { date: `${year}-06-30`, time: '18:00' },
        3: { date: `${year}-06-28`, time: '16:00' },
        4: { date: `${year}-06-29`, time: '22:00' },
        5: { date: `${year}-07-02`, time: '20:00' },
        6: { date: `${year}-07-02`, time: '16:00' },
        7: { date: `${year}-07-01`, time: '21:00' },
        8: { date: `${year}-07-01`, time: '17:00' },
        9: { date: `${year}-06-29`, time: '14:00' },
        10: { date: `${year}-06-30`, time: '14:00' },
        11: { date: `${year}-06-30`, time: '22:00' },
        12: { date: `${year}-07-01`, time: '13:00' },
        13: { date: `${year}-07-03`, time: '19:00' },
        14: { date: `${year}-07-03`, time: '15:00' },
        15: { date: `${year}-07-03`, time: '20:00' },
        16: { date: `${year}-07-03`, time: '22:30' },
      };
      return scheduleBySlot[slot] || { date: `${year}-06-30`, time: '18:00' };
    }
    if (phase === 'Oitavas de Final') {
      const scheduleBySlot: Record<number, { date: string; time: string }> = {
        1: { date: `${year}-07-04`, time: '18:00' },
        2: { date: `${year}-07-04`, time: '14:00' },
        3: { date: `${year}-07-06`, time: '16:00' },
        4: { date: `${year}-07-06`, time: '21:00' },
        5: { date: `${year}-07-05`, time: '17:00' },
        6: { date: `${year}-07-05`, time: '21:00' },
        7: { date: `${year}-07-07`, time: '13:00' },
        8: { date: `${year}-07-07`, time: '17:00' },
      };
      return scheduleBySlot[slot] || { date: `${year}-07-05`, time: '17:00' };
    }
    if (phase === 'Quartas de Final') {
      const scheduleBySlot: Record<number, { date: string; time: string }> = {
        1: { date: `${year}-07-09`, time: '17:00' },
        2: { date: `${year}-07-10`, time: '16:00' },
        3: { date: `${year}-07-11`, time: '18:00' },
        4: { date: `${year}-07-11`, time: '22:00' },
      };
      return scheduleBySlot[slot] || { date: `${year}-07-10`, time: '18:00' };
    }
    if (phase === 'Semifinal') {
      return slot === 1
        ? { date: `${year}-07-14`, time: '16:00' }
        : { date: `${year}-07-15`, time: '16:00' };
    }
    if (phase === 'Disputa de 3º Lugar') {
      return { date: `${year}-07-18`, time: '18:00' };
    }
    return { date: `${year}-07-19`, time: '16:00' }; // Grande Final
  }

  if (compId === 'nations_league') {
    const wNext = getFifaWindowDatesForYear(year + 1);
    if (phase === 'Quartas de Final (Ida)') {
      return { date: wNext.mar1, time: slot % 2 === 1 ? '15:45' : '16:45' };
    }
    if (phase === 'Quartas de Final (Volta)') {
      return { date: wNext.mar2, time: slot % 2 === 1 ? '15:45' : '16:45' };
    }
    if (phase === 'Semifinal') {
      return {
        date: wNext.jun1,
        time: slot === 1 ? '15:45' : '16:45',
      };
    }
    if (phase === 'Disputa de 3º Lugar') {
      return { date: wNext.jun2, time: '14:00' };
    }
    return { date: wNext.jun2, time: '16:45' }; // Grande Final Final Four
  }

  if (compId === 'eurocopa') {
    // UEFA Eurocopa oficial (9 de junho a 9 de julho):
    // Oitavas: 24–27/06 | Quartas: 30/06–01/07 | Semis: 04–05/07 | Final: 09/07 (Wembley em 2028)
    if (phase === 'Oitavas de Final') {
      const day = 24 + Math.floor((slot - 1) / 2); // 24, 25, 26, 27
      return {
        date: `${year}-06-${String(day).padStart(2, '0')}`,
        time: slot % 2 === 1 ? '13:00' : '16:00',
      };
    }
    if (phase === 'Quartas de Final') {
      return {
        date: slot <= 2 ? `${year}-06-30` : `${year}-07-01`,
        time: slot % 2 === 1 ? '13:00' : '16:00',
      };
    }
    if (phase === 'Semifinal') {
      return {
        date: slot === 1 ? `${year}-07-04` : `${year}-07-05`,
        time: '16:00',
      };
    }
    return { date: `${year}-07-09`, time: '16:00' }; // Grande Final (9 de julho)
  }

  // Continental Cups (June–July schedule)
  if (phase === 'Oitavas de Final') {
    const day = slot <= 4 ? 29 : 30;
    return {
      date: `${year}-06-${String(day).padStart(2, '0')}`,
      time: slot % 2 === 1 ? '16:00' : '20:00',
    };
  }
  if (phase === 'Quartas de Final') {
    if (compId === 'copa_africana' || compId === 'copa_asia') {
      const day = slot <= 2 ? 3 : 4;
      return {
        date: `${year}-07-${String(day).padStart(2, '0')}`,
        time: slot % 2 === 1 ? '17:00' : '20:30',
      };
    }
    if (compId === 'copa_america') {
      const day = slot <= 2 ? 1 : 2;
      return {
        date: `${year}-07-${String(day).padStart(2, '0')}`,
        time: slot % 2 === 1 ? '18:00' : '21:00',
      };
    }
    const isJune = slot <= 2;
    return {
      date: isJune ? `${year}-06-30` : `${year}-07-01`,
      time: slot % 2 === 1 ? '17:00' : '21:00',
    };
  }
  if (phase === 'Semifinal') {
    const day =
      compId === 'copa_africana' || compId === 'copa_asia'
        ? slot === 1
          ? 8
          : 9
        : slot === 1
        ? 6
        : 7;
    return { date: `${year}-07-${String(day).padStart(2, '0')}`, time: '20:00' };
  }
  if (phase === 'Disputa de 3º Lugar') {
    const thirdDay =
      compId === 'copa_africana' || compId === 'copa_asia'
        ? '12'
        : compId === 'copa_ouro'
        ? '10'
        : '11';
    return { date: `${year}-07-${thirdDay}`, time: '20:00' };
  }
  const finalDay =
    compId === 'copa_africana' || compId === 'copa_asia'
      ? '15'
      : compId === 'copa_ouro'
      ? '11'
      : '14';
  return { date: `${year}-07-${finalDay}`, time: '17:00' }; // Grande Final
}

/**
 * Dynamically advances group standings and generates subsequent knockout rounds
 * (`16-avos de Final`, `Oitavas de Final`, `Quartas de Final`, `Semifinal`, `Disputa de 3º Lugar`, `Grande Final`)
 * whenever all fixtures in the current stage are completed!
 */
export function advanceTournamentEditionStages(
  edition: NationalTournamentEdition
): NationalTournamentEdition {
  const groupMap: Record<string, string> = {};
  edition.standings.forEach((s) => {
    if (s.group) groupMap[s.teamId] = s.group;
  });
  const allTeamIds = edition.standings.map((s) => s.teamId);
  const updatedStandings = recomputeNationalStandings(allTeamIds, edition.fixtures, groupMap);

  const anyPlayed = edition.fixtures.some((f) => f.played);
  let status: NationalTournamentEdition['status'] = anyPlayed ? 'IN_PROGRESS' : 'UPCOMING';
  const fixtures = [...edition.fixtures];

  const groupFixtures = fixtures.filter((f) => Boolean(f.group));
  const allGroupsDone = groupFixtures.length > 0 && groupFixtures.every((f) => f.played);

  const getRankedGroup = (gName: string) =>
    updatedStandings.filter((s) => s.group === gName);

  const createKnockoutTie = (
    phase: string,
    slot: number,
    triggerRound: number,
    homeId: string,
    awayId: string
  ): InternationalMatchFixture => {
    const koSchedule = getTournamentKnockoutDateAndTime(edition.compId, edition.year, phase, slot);
    const wcVenues = edition.year === 2030 ? WORLD_CUP_VENUES_2030 : WORLD_CUP_VENUES_2026;
    const stadiumName =
      edition.compId === 'eurocopa' && edition.year === 2028 && phase === 'Grande Final'
        ? 'Wembley Stadium (Londres)'
        : edition.compId === 'world_cup' && edition.year === 2030 && phase === 'Grande Final'
        ? 'Estádio Santiago Bernabéu (Madri)'
        : edition.compId === 'world_cup'
        ? wcVenues[slot % wcVenues.length]
        : getNationalTeamById(homeId).homeStadium;
    return {
      id: `${edition.id}_${phase.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_s${slot}`,
      competition: edition.compId,
      competitionName: edition.title,
      seasonYear: Number(koSchedule.date.slice(0, 4)) || edition.year,
      triggerRound,
      date: koSchedule.date,
      time: koSchedule.time,
      dateLabel: `${formatShortDate(koSchedule.date)} · ${phase}`,
      phase,
      knockoutSlot: slot,
      homeTeamId: homeId,
      awayTeamId: awayId,
      stadiumName,
      played: false,
      status: 'PENDING',
      homeScore: null,
      awayScore: null,
    };
  };

  if (allGroupsDone) {
    if (edition.compId === 'world_cup') {
      // 48-team World Cup: Top 2 from 12 groups (24) + 8 best 3rd place = 32 teams -> 16-avos de Final (R17)
      const hasR32 = fixtures.some((f) => f.phase === '16-avos de Final');
      if (!hasR32) {
        const gA = getRankedGroup('Grupo A');
        const gB = getRankedGroup('Grupo B');
        const gC = getRankedGroup('Grupo C');
        const gD = getRankedGroup('Grupo D');
        const gE = getRankedGroup('Grupo E');
        const gF = getRankedGroup('Grupo F');
        const gG = getRankedGroup('Grupo G');
        const gH = getRankedGroup('Grupo H');
        const gI = getRankedGroup('Grupo I');
        const gJ = getRankedGroup('Grupo J');
        const gK = getRankedGroup('Grupo K');
        const gL = getRankedGroup('Grupo L');

        const allThirds: { teamId: string; group: string; points: number; goalDifference: number; goalsFor: number }[] = [];
        [gA, gB, gC, gD, gE, gF, gG, gH, gI, gJ, gK, gL].forEach((rows, idx) => {
          const letter = String.fromCharCode(65 + idx);
          if (rows[2]) {
            allThirds.push({
              teamId: rows[2].teamId,
              group: `Grupo ${letter}`,
              points: rows[2].points,
              goalDifference: rows[2].goalDifference,
              goalsFor: rows[2].goalsFor,
            });
          }
        });

        allThirds.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });
        const best8Thirds = allThirds.slice(0, 8);

        // Third-place eligibility per official Page 2 diagram:
        const thirdSlotsReq = [
          { slot: 1, allowed: ['Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo F'] },
          { slot: 2, allowed: ['Grupo C', 'Grupo D', 'Grupo F', 'Grupo G', 'Grupo H'] },
          { slot: 7, allowed: ['Grupo B', 'Grupo E', 'Grupo F', 'Grupo I', 'Grupo J'] },
          { slot: 8, allowed: ['Grupo A', 'Grupo E', 'Grupo H', 'Grupo I', 'Grupo J'] },
          { slot: 11, allowed: ['Grupo C', 'Grupo E', 'Grupo F', 'Grupo H', 'Grupo I'] },
          { slot: 12, allowed: ['Grupo E', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K'] },
          { slot: 15, allowed: ['Grupo E', 'Grupo F', 'Grupo G', 'Grupo I', 'Grupo J'] },
          { slot: 16, allowed: ['Grupo D', 'Grupo E', 'Grupo I', 'Grupo J', 'Grupo L'] },
        ];

        const assignedThirds: Record<number, string> = {};
        const usedThirds = new Set<string>();

        for (const req of thirdSlotsReq) {
          const candidate = best8Thirds.find(
            (t) => !usedThirds.has(t.teamId) && req.allowed.includes(t.group)
          );
          if (candidate) {
            assignedThirds[req.slot] = candidate.teamId;
            usedThirds.add(candidate.teamId);
          }
        }
        for (const req of thirdSlotsReq) {
          if (!assignedThirds[req.slot]) {
            const rem = best8Thirds.find((t) => !usedThirds.has(t.teamId));
            if (rem) {
              assignedThirds[req.slot] = rem.teamId;
              usedThirds.add(rem.teamId);
            }
          }
        }

        // Exact 16 Round-of-32 bracket slots from official FIFA 2026 bracket (Page 2)
        const r32Pairs: [string, string][] = [
          [gE[0]?.teamId, assignedThirds[1] || best8Thirds[0]?.teamId],   // Slot 1: 1º E x 3º (A, B, C, D ou F)
          [gI[0]?.teamId, assignedThirds[2] || best8Thirds[1]?.teamId],   // Slot 2: 1º I x 3º (C, D, F, G ou H)
          [gA[1]?.teamId, gB[1]?.teamId],                                 // Slot 3: 2º A x 2º B
          [gF[0]?.teamId, gC[1]?.teamId],                                 // Slot 4: 1º F x 2º C
          [gK[1]?.teamId, gL[1]?.teamId],                                 // Slot 5: 2º K x 2º L
          [gH[0]?.teamId, gJ[1]?.teamId],                                 // Slot 6: 1º H x 2º J
          [gD[0]?.teamId, assignedThirds[7] || best8Thirds[2]?.teamId],   // Slot 7: 1º D x 3º (B, E, F, I ou J)
          [gG[0]?.teamId, assignedThirds[8] || best8Thirds[3]?.teamId],   // Slot 8: 1º G x 3º (A, E, H, I ou J)

          [gC[0]?.teamId, gF[1]?.teamId],                                 // Slot 9: 1º C x 2º F
          [gE[1]?.teamId, gI[1]?.teamId],                                 // Slot 10: 2º E x 2º I
          [gA[0]?.teamId, assignedThirds[11] || best8Thirds[4]?.teamId],  // Slot 11: 1º A x 3º (C, E, F, H ou I)
          [gL[0]?.teamId, assignedThirds[12] || best8Thirds[5]?.teamId],  // Slot 12: 1º L x 3º (E, H, I, J ou K)
          [gJ[0]?.teamId, gH[1]?.teamId],                                 // Slot 13: 1º J x 2º H
          [gD[1]?.teamId, gG[1]?.teamId],                                 // Slot 14: 2º D x 2º G
          [gB[0]?.teamId, assignedThirds[15] || best8Thirds[6]?.teamId],  // Slot 15: 1º B x 3º (E, F, G, I ou J)
          [gK[0]?.teamId, assignedThirds[16] || best8Thirds[7]?.teamId],  // Slot 16: 1º K x 3º (D, E, I, J ou L)
        ];

        r32Pairs.forEach(([h, a], idx) => {
          if (h && a) {
            fixtures.push(createKnockoutTie('16-avos de Final', idx + 1, 17, h, a));
          }
        });
      }

      const r32Fixes = fixtures.filter((f) => f.phase === '16-avos de Final');
      const hasR16 = fixtures.some((f) => f.phase === 'Oitavas de Final');
      if (r32Fixes.length === 16 && r32Fixes.every((f) => f.played) && !hasR16) {
        const sortedR32 = [...r32Fixes].sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
        for (let i = 0; i < 8; i++) {
          const w1 = sortedR32[i * 2].winnerTeamId || sortedR32[i * 2].homeTeamId;
          const w2 = sortedR32[i * 2 + 1].winnerTeamId || sortedR32[i * 2 + 1].homeTeamId;
          fixtures.push(createKnockoutTie('Oitavas de Final', i + 1, 18, w1, w2));
        }
      }

      const r16Fixes = fixtures.filter((f) => f.phase === 'Oitavas de Final');
      const hasQF = fixtures.some((f) => f.phase === 'Quartas de Final');
      if (r16Fixes.length === 8 && r16Fixes.every((f) => f.played) && !hasQF) {
        const sortedR16 = [...r16Fixes].sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
        for (let i = 0; i < 4; i++) {
          const w1 = sortedR16[i * 2].winnerTeamId || sortedR16[i * 2].homeTeamId;
          const w2 = sortedR16[i * 2 + 1].winnerTeamId || sortedR16[i * 2 + 1].homeTeamId;
          fixtures.push(createKnockoutTie('Quartas de Final', i + 1, 19, w1, w2));
        }
      }
    } else if (edition.compId === 'nations_league') {
      // UEFA Nations League:
      // - 2026/27 (4 grupos na Liga A: A1..A4): 1º e 2º colocados (8 seleções) avançam às Quartas de Final ida e volta (Março y+1)
      // - 2028/29+ (3 grupos de 6 na Liga A: A1..A3): Top 2 de cada grupo (6) + 2 melhores 3ºs = 8 seleções -> Quartas ida e volta (Março y+1)
      // Vencedores das 4 Quartas avançam ao Final Four (Semifinais + 3º Lugar + Grande Final em Junho y+1)!
      const hasQfLeg1 = fixtures.some((f) => f.phase === 'Quartas de Final (Ida)');
      if (!hasQfLeg1) {
        const is4GroupLeagueA = edition.groups.includes('Grupo A4');
        const qfPairs: [string, string][] = []; // [seededHomeLeg2, unseededHomeLeg1]
        if (is4GroupLeagueA) {
          const gA1 = getRankedGroup('Grupo A1');
          const gA2 = getRankedGroup('Grupo A2');
          const gA3 = getRankedGroup('Grupo A3');
          const gA4 = getRankedGroup('Grupo A4');
          if (gA1[0] && gA2[1]) qfPairs.push([gA1[0].teamId, gA2[1].teamId]);
          if (gA2[0] && gA1[1]) qfPairs.push([gA2[0].teamId, gA1[1].teamId]);
          if (gA3[0] && gA4[1]) qfPairs.push([gA3[0].teamId, gA4[1].teamId]);
          if (gA4[0] && gA3[1]) qfPairs.push([gA4[0].teamId, gA3[1].teamId]);
        } else if (edition.groups.includes('Grupo A1')) {
          const gA1 = getRankedGroup('Grupo A1');
          const gA2 = getRankedGroup('Grupo A2');
          const gA3 = getRankedGroup('Grupo A3');
          const winners = [gA1[0], gA2[0], gA3[0]].filter((r): r is NationalStandingRow => Boolean(r));
          const runners = [gA1[1], gA2[1], gA3[1]]
            .filter((r): r is NationalStandingRow => Boolean(r))
            .sort(sortByPpgStanding);
          const thirds = [gA1[2], gA2[2], gA3[2]]
            .filter((r): r is NationalStandingRow => Boolean(r))
            .sort(sortByPpgStanding);
          const seeded4 = [...winners, ...(runners[0] ? [runners[0]] : [])].slice(0, 4);
          const unseeded4 = [...runners.slice(1), ...thirds.slice(0, 2)].slice(0, 4);
          for (let i = 0; i < Math.min(seeded4.length, unseeded4.length); i++) {
            qfPairs.push([seeded4[i].teamId, unseeded4[3 - i]?.teamId || unseeded4[i].teamId]);
          }
        } else {
          const gA = getRankedGroup('Grupo A');
          const gB = getRankedGroup('Grupo B');
          const gC = getRankedGroup('Grupo C');
          const gD = getRankedGroup('Grupo D');
          if (gA[0] && gB[0]) fixtures.push(createKnockoutTie('Semifinal', 1, 12, gA[0].teamId, gB[0].teamId));
          if (gC[0] && gD[0]) fixtures.push(createKnockoutTie('Semifinal', 2, 12, gC[0].teamId, gD[0].teamId));
        }

        qfPairs.forEach(([seededId, unseededId], idx) => {
          fixtures.push(createKnockoutTie('Quartas de Final (Ida)', idx + 1, 6, unseededId, seededId));
          fixtures.push(createKnockoutTie('Quartas de Final (Volta)', idx + 1, 7, seededId, unseededId));
        });
      }

      const leg1Fixes = fixtures
        .filter((f) => f.phase === 'Quartas de Final (Ida)')
        .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
      const leg2Fixes = fixtures
        .filter((f) => f.phase === 'Quartas de Final (Volta)')
        .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
      const hasSF = fixtures.some((f) => f.phase === 'Semifinal');
      if (
        leg1Fixes.length === 4 &&
        leg2Fixes.length === 4 &&
        leg1Fixes.every((f) => f.played) &&
        leg2Fixes.every((f) => f.played) &&
        !hasSF
      ) {
        const qfWinners: string[] = [];
        for (let i = 0; i < 4; i++) {
          const l1 = leg1Fixes[i];
          const l2 = leg2Fixes[i];
          const { winnerId } = resolveTwoLeggedTieWinner(l1, l2, `nl_qf_${edition.year}_${i + 1}`);
          const l2Idx = fixtures.findIndex((f) => f.id === l2.id);
          if (l2Idx >= 0 && !fixtures[l2Idx].winnerTeamId) {
            fixtures[l2Idx] = { ...fixtures[l2Idx], winnerTeamId: winnerId };
          }
          qfWinners.push(winnerId);
        }
        fixtures.push(createKnockoutTie('Semifinal', 1, 12, qfWinners[0], qfWinners[1]));
        fixtures.push(createKnockoutTie('Semifinal', 2, 12, qfWinners[2], qfWinners[3]));
      }
    } else if (edition.groups.length === 8) {
      // 32-team Copa da Ásia AFC: Top 2 de cada um dos 8 grupos (A–H) = 16 -> Oitavas de Final -> Quartas -> Semifinal -> Final
      const hasR16 = fixtures.some((f) => f.phase === 'Oitavas de Final');
      if (!hasR16) {
        const gA = getRankedGroup('Grupo A');
        const gB = getRankedGroup('Grupo B');
        const gC = getRankedGroup('Grupo C');
        const gD = getRankedGroup('Grupo D');
        const gE = getRankedGroup('Grupo E');
        const gF = getRankedGroup('Grupo F');
        const gG = getRankedGroup('Grupo G');
        const gH = getRankedGroup('Grupo H');

        const r16Pairs: [string, string][] = [
          [gA[0]?.teamId, gB[1]?.teamId],
          [gC[0]?.teamId, gD[1]?.teamId],
          [gE[0]?.teamId, gF[1]?.teamId],
          [gG[0]?.teamId, gH[1]?.teamId],
          [gB[0]?.teamId, gA[1]?.teamId],
          [gD[0]?.teamId, gC[1]?.teamId],
          [gF[0]?.teamId, gE[1]?.teamId],
          [gH[0]?.teamId, gG[1]?.teamId],
        ];
        r16Pairs.forEach(([h, a], idx) => {
          if (h && a) fixtures.push(createKnockoutTie('Oitavas de Final', idx + 1, 18, h, a));
        });
      }

      const r16Fixes = fixtures.filter((f) => f.phase === 'Oitavas de Final');
      const hasQF = fixtures.some((f) => f.phase === 'Quartas de Final');
      if (r16Fixes.length === 8 && r16Fixes.every((f) => f.played) && !hasQF) {
        const sortedR16 = [...r16Fixes].sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
        for (let i = 0; i < 4; i++) {
          const w1 = sortedR16[i * 2].winnerTeamId || sortedR16[i * 2].homeTeamId;
          const w2 = sortedR16[i * 2 + 1].winnerTeamId || sortedR16[i * 2 + 1].homeTeamId;
          fixtures.push(createKnockoutTie('Quartas de Final', i + 1, 19, w1, w2));
        }
      }
    } else if (edition.groups.length === 6) {
      // 24-team Copa Africana de Nações: Top 2 of Groups A–F (12) + 4 best 3rd place = 16 -> Oitavas de Final (R18)
      const hasR16 = fixtures.some((f) => f.phase === 'Oitavas de Final');
      if (!hasR16) {
        const gA = getRankedGroup('Grupo A');
        const gB = getRankedGroup('Grupo B');
        const gC = getRankedGroup('Grupo C');
        const gD = getRankedGroup('Grupo D');
        const gE = getRankedGroup('Grupo E');
        const gF = getRankedGroup('Grupo F');

        const allThirds: { teamId: string; group: string; points: number; goalDifference: number; goalsFor: number }[] = [];
        [gA, gB, gC, gD, gE, gF].forEach((rows, idx) => {
          const letter = String.fromCharCode(65 + idx);
          if (rows[2]) {
            allThirds.push({
              teamId: rows[2].teamId,
              group: `Grupo ${letter}`,
              points: rows[2].points,
              goalDifference: rows[2].goalDifference,
              goalsFor: rows[2].goalsFor,
            });
          }
        });
        allThirds.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });
        const best4Thirds = allThirds.slice(0, 4);
        const usedThirdIds = new Set<string>();
        const pickThirdForGroupWinner = (winnerGroup: string): string | undefined => {
          const cand =
            best4Thirds.find((t) => !usedThirdIds.has(t.teamId) && t.group !== winnerGroup) ||
            best4Thirds.find((t) => !usedThirdIds.has(t.teamId));
          if (cand) usedThirdIds.add(cand.teamId);
          return cand?.teamId;
        };

        const r16Pairs: [string, string][] = [
          [gA[0]?.teamId, pickThirdForGroupWinner('Grupo A') || gF[1]?.teamId],
          [gD[0]?.teamId, pickThirdForGroupWinner('Grupo D') || gE[1]?.teamId],
          [gB[0]?.teamId, pickThirdForGroupWinner('Grupo B') || gC[1]?.teamId],
          [gF[0]?.teamId, gE[1]?.teamId],
          [gC[0]?.teamId, pickThirdForGroupWinner('Grupo C') || gD[1]?.teamId],
          [gE[0]?.teamId, gD[1]?.teamId],
          [gA[1]?.teamId, gC[1]?.teamId],
          [gB[1]?.teamId, gF[1]?.teamId],
        ];
        r16Pairs.forEach(([h, a], idx) => {
          if (h && a) fixtures.push(createKnockoutTie('Oitavas de Final', idx + 1, 18, h, a));
        });
      }

      const r16Fixes = fixtures.filter((f) => f.phase === 'Oitavas de Final');
      const hasQF = fixtures.some((f) => f.phase === 'Quartas de Final');
      if (r16Fixes.length === 8 && r16Fixes.every((f) => f.played) && !hasQF) {
        const sortedR16 = [...r16Fixes].sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
        for (let i = 0; i < 4; i++) {
          const w1 = sortedR16[i * 2].winnerTeamId || sortedR16[i * 2].homeTeamId;
          const w2 = sortedR16[i * 2 + 1].winnerTeamId || sortedR16[i * 2 + 1].homeTeamId;
          fixtures.push(createKnockoutTie('Quartas de Final', i + 1, 19, w1, w2));
        }
      }
    } else if (edition.groups.length === 4) {
      // 16-team Copa América / Eurocopa / Copa Ouro: Top 2 of Groups A–D -> Quartas de Final (R18)
      const hasQF = fixtures.some((f) => f.phase === 'Quartas de Final');
      if (!hasQF) {
        const gA = getRankedGroup('Grupo A');
        const gB = getRankedGroup('Grupo B');
        const gC = getRankedGroup('Grupo C');
        const gD = getRankedGroup('Grupo D');
        const qfPairs: [string, string][] = [
          [gA[0]?.teamId, gB[1]?.teamId],
          [gB[0]?.teamId, gA[1]?.teamId],
          [gC[0]?.teamId, gD[1]?.teamId],
          [gD[0]?.teamId, gC[1]?.teamId],
        ];
        qfPairs.forEach(([h, a], idx) => {
          if (h && a) fixtures.push(createKnockoutTie('Quartas de Final', idx + 1, 18, h, a));
        });
      }
    } else if (edition.groups.length === 2) {
      // 8-team Copa da Oceania: Top 2 of Groups A–B -> Semifinal (R18)
      const hasSF = fixtures.some((f) => f.phase === 'Semifinal');
      if (!hasSF) {
        const gA = getRankedGroup('Grupo A');
        const gB = getRankedGroup('Grupo B');
        if (gA[0] && gB[1]) fixtures.push(createKnockoutTie('Semifinal', 1, 18, gA[0].teamId, gB[1].teamId));
        if (gB[0] && gA[1]) fixtures.push(createKnockoutTie('Semifinal', 2, 18, gB[0].teamId, gA[1].teamId));
      }
    }

    // Shared Quarterfinals -> Semifinal progression (for World Cup, 32-team Asia, 24-team AFCON & 16-team Continentals)
    const qfFixes = fixtures.filter((f) => f.phase === 'Quartas de Final');
    const hasSF = fixtures.some((f) => f.phase === 'Semifinal');
    if (qfFixes.length === 4 && qfFixes.every((f) => f.played) && !hasSF) {
      const sortedQF = [...qfFixes].sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
      const sfRound =
        edition.compId === 'world_cup' || edition.groups.length === 6 || edition.groups.length === 8
          ? 20
          : 19;
      for (let i = 0; i < 2; i++) {
        const w1 = sortedQF[i * 2].winnerTeamId || sortedQF[i * 2].homeTeamId;
        const w2 = sortedQF[i * 2 + 1].winnerTeamId || sortedQF[i * 2 + 1].homeTeamId;
        fixtures.push(createKnockoutTie('Semifinal', i + 1, sfRound, w1, w2));
      }
    }

    // Shared Semifinal -> 3º Lugar & Grande Final progression
    const sfFixes = fixtures.filter((f) => f.phase === 'Semifinal');
    const hasFinal = fixtures.some((f) => f.phase === 'Grande Final');
    if (sfFixes.length === 2 && sfFixes.every((f) => f.played) && !hasFinal) {
      const sortedSF = [...sfFixes].sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));
      const finalRound =
        edition.compId === 'world_cup' || edition.groups.length === 6 || edition.groups.length === 8
          ? 21
          : edition.compId === 'nations_league'
          ? 13
          : edition.groups.length === 4
          ? 20
          : 19;
      const w1 = sortedSF[0].winnerTeamId || sortedSF[0].homeTeamId;
      const l1 = w1 === sortedSF[0].homeTeamId ? sortedSF[0].awayTeamId : sortedSF[0].homeTeamId;
      const w2 = sortedSF[1].winnerTeamId || sortedSF[1].homeTeamId;
      const l2 = w2 === sortedSF[1].homeTeamId ? sortedSF[1].awayTeamId : sortedSF[1].homeTeamId;

      if (edition.compId !== 'eurocopa') {
        fixtures.push(createKnockoutTie('Disputa de 3º Lugar', 1, finalRound, l1, l2));
      }
      fixtures.push(createKnockoutTie('Grande Final', 1, finalRound, w1, w2));
    }
  }

  let championTeamId = edition.championTeamId;
  let runnerUpTeamId = edition.runnerUpTeamId;
  let thirdPlaceTeamId = edition.thirdPlaceTeamId;

  const finalFix = fixtures.find((f) => f.phase === 'Grande Final' && f.played);
  const thirdFix = fixtures.find((f) => f.phase === 'Disputa de 3º Lugar' && f.played);
  if (finalFix) {
    status = 'COMPLETED';
    championTeamId = finalFix.winnerTeamId || finalFix.homeTeamId;
    runnerUpTeamId =
      championTeamId === finalFix.homeTeamId ? finalFix.awayTeamId : finalFix.homeTeamId;
  }
  if (thirdFix) {
    thirdPlaceTeamId = thirdFix.winnerTeamId || thirdFix.homeTeamId;
  }

  return {
    ...edition,
    status,
    standings: updatedStandings,
    fixtures,
    championTeamId,
    runnerUpTeamId,
    thirdPlaceTeamId,
  };
}

function fullySimulateTournamentEdition(
  initial: NationalTournamentEdition,
  seedPrefix: string
): NationalTournamentEdition {
  let working = { ...initial };
  for (let pass = 0; pass < 8; pass++) {
    let anySimulated = false;
    working = {
      ...working,
      fixtures: working.fixtures.map((f, idx) => {
        if (f.played) return f;
        anySimulated = true;
        return simulateCpuInternationalFixture(
          f,
          isInternationalFixtureKnockout(f),
          `${seedPrefix}_p${pass}_${idx}`
        );
      }),
    };
    working = advanceTournamentEditionStages(working);
    if (!anySimulated && working.status === 'COMPLETED') break;
  }
  return working;
}

// ============================================================================
// ANNUAL FRIENDLIES / FINALÍSSIMA & LEGACY WINDOW SYNC
// ============================================================================

function generateSeasonFriendliesAndFinalissima(
  seasonYear: number,
  busySet?: Set<string>
): InternationalMatchFixture[] {
  const list: InternationalMatchFixture[] = [];
  const sorted = [...NATIONAL_TEAMS_CATALOG].sort((a, b) => b.fifaPoints - a.fifaPoints);
  const w = getFifaWindowDatesForYear(seasonYear);

  const addPairedFriendlies = (
    date: string,
    triggerRound: number,
    tag: string,
    compName: string,
    phaseLabel: string,
    offsetStep: number,
    options?: { excludeConfeds?: ConfederationCode[]; priorTeamOrderShift?: number }
  ) => {
    const excludeSet = new Set(options?.excludeConfeds || []);
    const eligible = sorted.filter(
      (t) => !excludeSet.has(t.confederation) && (!busySet || !busySet.has(`${t.id}_${date}`))
    );
    if (eligible.length < 2) return;

    const shiftList = <T,>(arr: T[], by: number): T[] => {
      if (arr.length <= 1) return arr;
      const s = ((by % arr.length) + arr.length) % arr.length;
      return s > 0 ? [...arr.slice(s), ...arr.slice(0, s)] : arr;
    };

    const rawOfc = eligible.filter((t) => t.confederation === 'OFC');
    const rawNonOfc = eligible.filter((t) => t.confederation !== 'OFC');
    const shiftedOfc = shiftList(rawOfc, (options?.priorTeamOrderShift || 0) + offsetStep);

    // If OFC count is odd (e.g. 11) and at least one non-OFC team is free, borrow 1 non-OFC opponent so all 11 OFC nations play
    const ofcBatch = [...shiftedOfc];
    const nonOfcPool = [...rawNonOfc];
    if (ofcBatch.length % 2 === 1 && nonOfcPool.length > 0) {
      const shiftedPickIdx = ((options?.priorTeamOrderShift || 0) % nonOfcPool.length + nonOfcPool.length) % nonOfcPool.length;
      ofcBatch.push(nonOfcPool.splice(shiftedPickIdx, 1)[0]);
    }
    // If remaining non-OFC pool is odd, drop the lowest-ranked non-CONMEBOL/CAF nation so CONMEBOL & CAF nations always have a fixture
    if (nonOfcPool.length % 2 === 1 && nonOfcPool.length > 1) {
      let dropIdx = -1;
      for (let i = nonOfcPool.length - 1; i >= 0; i--) {
        if (nonOfcPool[i].confederation !== 'CONMEBOL' && nonOfcPool[i].confederation !== 'CAF') {
          dropIdx = i;
          break;
        }
      }
      if (dropIdx < 0) {
        for (let i = nonOfcPool.length - 1; i >= 0; i--) {
          if (nonOfcPool[i].confederation !== 'CONMEBOL') {
            dropIdx = i;
            break;
          }
        }
      }
      if (dropIdx >= 0) {
        nonOfcPool.splice(dropIdx, 1);
      }
    }
    const remainingNonOfc = shiftList(nonOfcPool, options?.priorTeamOrderShift || 0);

    const emitPairs = (sub: typeof eligible) => {
      for (let idx = 0; idx + 1 < sub.length; idx += 2) {
        const t1 = sub[idx];
        const t2 = sub[idx + 1];
        const swap = (idx + offsetStep) % 2 === 1;
        const home = swap ? t2 : t1;
        const away = swap ? t1 : t2;
        list.push({
          id: `friendly_${seasonYear}_${tag}_${home.id}_${away.id}`,
          competition: 'friendly',
          competitionName: compName,
          seasonYear,
          triggerRound,
          date,
          time: home.confederation === 'OFC' && away.confederation === 'OFC' ? '04:00' : '20:00',
          dateLabel: `${formatShortDate(date)} · ${phaseLabel}`,
          phase: phaseLabel,
          homeTeamId: home.id,
          awayTeamId: away.id,
          stadiumName: home.homeStadium,
          played: false,
          status: 'PENDING',
          homeScore: null,
          awayScore: null,
        });
      }
    };

    emitPairs(ofcBatch);
    emitPairs(remainingNonOfc);
  };

  // World Cup years (2026, 2030, 2034, 2038):
  // - Março (2 jogos): Finalíssima + Amistosos/Repescagem (mar1, mar2)
  // - Junho (2 jogos): Amistosos preparatórios (jun1, jun2)
  // - Set/Out (4 jogos) & Nov (2 jogos): Amistosos Pós-Copa OFC e seleções livres
  if (seasonYear % 4 === 2) {
    const finDate = w.mar1;
    const topConmebol =
      sorted.find((t) => t.confederation === 'CONMEBOL' && (!busySet || !busySet.has(`${t.id}_${finDate}`))) ||
      sorted.find((t) => t.confederation === 'CONMEBOL') ||
      sorted[0];
    const topUefa =
      sorted.find((t) => t.confederation === 'UEFA' && (!busySet || !busySet.has(`${t.id}_${finDate}`))) ||
      sorted.find((t) => t.confederation === 'UEFA') ||
      sorted[1];
    list.push({
      id: `finalissima_${seasonYear}_r7`,
      competition: 'finalissima',
      competitionName: `Finalíssima CONMEBOL–UEFA ${seasonYear}`,
      seasonYear,
      triggerRound: 6,
      date: finDate,
      time: '16:45',
      dateLabel: `${formatShortDate(finDate)} · Março Data FIFA`,
      phase: 'Decisão Intercontinental',
      knockoutSlot: 1,
      homeTeamId: topConmebol.id,
      awayTeamId: topUefa.id,
      stadiumName: 'Wembley Stadium (Londres)',
      played: false,
      status: 'PENDING',
      homeScore: null,
      awayScore: null,
    });

    const rest = sorted.filter(
      (t) =>
        t.id !== topConmebol.id &&
        t.id !== topUefa.id &&
        (!busySet || !busySet.has(`${t.id}_${w.mar1}`))
    );
    const marOfc = rest.filter((t) => t.confederation === 'OFC');
    const marNonOfc = rest.filter((t) => t.confederation !== 'OFC');
    const marRestOrdered = [...marOfc, ...marNonOfc];
    for (let i = 0; i + 1 < marRestOrdered.length; i += 2) {
      const h = marRestOrdered[i];
      const a = marRestOrdered[i + 1];
      list.push({
        id: `friendly_${seasonYear}_mar1_${i}`,
        competition: 'friendly',
        competitionName:
          seasonYear >= 2030 && h.confederation === 'OFC'
            ? 'Amistoso / Repescagem FIFA (OFC)'
            : 'Amistoso Internacional Preparatório',
        seasonYear,
        triggerRound: 6,
        date: w.mar1,
        time: h.confederation === 'OFC' ? '04:00' : '20:00',
        dateLabel: `${formatShortDate(w.mar1)} · Março (Data FIFA · Jogo 1)`,
        phase: 'Amistoso Oficial FIFA',
        homeTeamId: h.id,
        awayTeamId: a.id,
        stadiumName: h.homeStadium,
        played: false,
        status: 'PENDING',
        homeScore: null,
        awayScore: null,
      });
    }

    addPairedFriendlies(
      w.mar2,
      7,
      'mar2',
      'Amistoso Internacional Preparatório',
      'Março (Data FIFA · Jogo 2)',
      1,
      { priorTeamOrderShift: 1 }
    );
    addPairedFriendlies(
      w.jun1,
      12,
      'jun1',
      'Amistoso Preparatório Pré-Copa',
      'Junho (Data FIFA · Jogo 1)',
      2,
      { priorTeamOrderShift: 2 }
    );
    addPairedFriendlies(
      w.jun2,
      13,
      'jun2',
      'Amistoso Preparatório Pré-Copa',
      'Junho (Data FIFA · Jogo 2)',
      3,
      { excludeConfeds: ['CONMEBOL', 'CAF', 'UEFA'], priorTeamOrderShift: 3 }
    );

    // Pós-Copa: 4 jogos em Set/Out (UEFA disputa Liga das Nações; CAF disputa Eliminatórias CAN; 3 CONMEBOL) e 2 jogos em Novembro
    addPairedFriendlies(
      w.sep1,
      24,
      'sep1_post',
      'Amistoso Internacional Data FIFA',
      'Setembro · Pós-Copa (Jogo 1)',
      1,
      { excludeConfeds: ['CAF', 'UEFA'], priorTeamOrderShift: 1 }
    );
    addPairedFriendlies(
      w.sep2,
      25,
      'sep2_post',
      'Amistoso Internacional Data FIFA',
      'Setembro · Pós-Copa (Jogo 2)',
      2,
      { excludeConfeds: ['CAF', 'UEFA'], priorTeamOrderShift: 3 }
    );
    addPairedFriendlies(
      w.oct1,
      29,
      'oct1_post',
      'Amistoso Internacional Data FIFA',
      'Outubro · Pós-Copa (Jogo 3)',
      3,
      { excludeConfeds: ['CAF', 'UEFA'], priorTeamOrderShift: 5 }
    );
    addPairedFriendlies(
      w.oct2,
      30,
      'oct2_post',
      'Amistoso Internacional Data FIFA',
      'Outubro · Pós-Copa (Jogo 4)',
      1,
      { excludeConfeds: ['CONMEBOL', 'CAF', 'UEFA'], priorTeamOrderShift: 7 }
    );
    addPairedFriendlies(
      w.nov1,
      33,
      'nov1_post',
      'Amistoso Internacional Data FIFA',
      'Novembro · Pós-Copa (Jogo 1)',
      2,
      { excludeConfeds: ['CAF', 'UEFA'], priorTeamOrderShift: 2 }
    );
    addPairedFriendlies(
      w.nov2,
      34,
      'nov2_post',
      'Amistoso Internacional Data FIFA',
      'Novembro · Pós-Copa (Jogo 2)',
      3,
      { excludeConfeds: ['CAF', 'UEFA'], priorTeamOrderShift: 4 }
    );
  } else if (seasonYear % 4 === 0) {
    // Continental Cup years (2028, 2032, 2036):
    // Março (2 jogos; seleções UEFA na Repescagem Euro protegidas por busySet), Mai/Jun (1 jogo CONMEBOL/CAF/UEFA antes da Euro 09/06),
    // [Copas Jun/Jul], Set/Out & Nov (UEFA disputa a Nova Liga das Nações 2028/29+; CAF inicia Eliminatórias Copa em Nov)
    addPairedFriendlies(
      w.mar1,
      6,
      'mar1_cont',
      'Amistoso Oficial FIFA · Pré-Copa Continental',
      'Março (Data FIFA · Jogo 1)',
      1,
      { priorTeamOrderShift: 1 }
    );
    addPairedFriendlies(
      w.mar2,
      7,
      'mar2_cont',
      'Amistoso Oficial FIFA · Pré-Copa Continental',
      'Março (Data FIFA · Jogo 2)',
      2,
      { priorTeamOrderShift: 3 }
    );
    addPairedFriendlies(
      w.jun1,
      12,
      'jun1_cont',
      'Amistoso Preparatório · Copas Continentais',
      'Maio/Junho (Data FIFA · Jogo 1)',
      3,
      { priorTeamOrderShift: 2 }
    );
    addPairedFriendlies(
      w.jun2,
      13,
      'jun2_cont',
      'Amistoso Preparatório · Copas Continentais',
      'Junho (Data FIFA · Jogo 2)',
      1,
      { excludeConfeds: ['CONMEBOL', 'CAF', 'UEFA'], priorTeamOrderShift: 5 }
    );
    addPairedFriendlies(
      w.sep1,
      24,
      'sep1_cont',
      'Amistoso Internacional Data FIFA',
      'Setembro · Data FIFA (Jogo 1)',
      2,
      { excludeConfeds: ['UEFA'], priorTeamOrderShift: 1 }
    );
    addPairedFriendlies(
      w.sep2,
      25,
      'sep2_cont',
      'Amistoso Internacional Data FIFA',
      'Setembro · Data FIFA (Jogo 2)',
      3,
      { excludeConfeds: ['UEFA'], priorTeamOrderShift: 4 }
    );
    addPairedFriendlies(
      w.oct1,
      29,
      'oct1_cont',
      'Amistoso Internacional Data FIFA',
      'Outubro · Data FIFA (Jogo 3)',
      1,
      { excludeConfeds: ['UEFA'], priorTeamOrderShift: 6 }
    );
    addPairedFriendlies(
      w.oct2,
      30,
      'oct2_cont',
      'Amistoso Internacional Data FIFA',
      'Outubro · Data FIFA (Jogo 4)',
      2,
      { excludeConfeds: ['CONMEBOL', 'UEFA'], priorTeamOrderShift: 8 }
    );
    addPairedFriendlies(
      w.nov1,
      33,
      'nov1_cont',
      'Amistoso Internacional Data FIFA',
      'Novembro · Data FIFA (Jogo 1)',
      3,
      { excludeConfeds: ['CAF', 'UEFA'], priorTeamOrderShift: 2 }
    );
    addPairedFriendlies(
      w.nov2,
      34,
      'nov2_cont',
      'Amistoso Internacional Data FIFA',
      'Novembro · Data FIFA (Jogo 2)',
      1,
      { excludeConfeds: ['CAF', 'UEFA'], priorTeamOrderShift: 5 }
    );
  } else if (seasonYear % 4 === 1) {
    // Final WC Qualifying years (2029, 2033, 2037):
    // OFC, CONMEBOL, CAF & UEFA disputam estritamente suas Eliminatórias / Liga das Nações oficiais no ano (sem amistosos extras em Set–Nov).
    // AFC non-playoff teams play friendlies in Sep/Oct (3 dates: sep1, oct1, oct2) & all 48 AFC teams play 2 friendlies in Nov (nov1, nov2).
    addPairedFriendlies(
      w.sep1,
      24,
      'sep1_wcq',
      'Amistoso Internacional Data FIFA',
      'Setembro · Data FIFA (Jogo 1)',
      2,
      { excludeConfeds: ['OFC', 'CONMEBOL', 'CAF', 'UEFA'], priorTeamOrderShift: 1 }
    );
    addPairedFriendlies(
      w.oct1,
      29,
      'oct1',
      'Amistoso Internacional Data FIFA',
      'Outubro · Data FIFA (Jogo 2)',
      1,
      { excludeConfeds: ['OFC', 'CONMEBOL', 'CAF', 'UEFA'], priorTeamOrderShift: 3 }
    );
    addPairedFriendlies(
      w.oct2,
      30,
      'oct2_wcq',
      'Amistoso Internacional Data FIFA',
      'Outubro · Data FIFA (Jogo 3)',
      3,
      { excludeConfeds: ['OFC', 'CONMEBOL', 'CAF', 'UEFA'], priorTeamOrderShift: 5 }
    );
    addPairedFriendlies(
      w.nov1,
      33,
      'nov1',
      'Amistoso Internacional Data FIFA',
      'Novembro · Data FIFA (Jogo 1)',
      3,
      { excludeConfeds: ['OFC', 'CONMEBOL', 'CAF', 'UEFA'], priorTeamOrderShift: 2 }
    );
    addPairedFriendlies(
      w.nov2,
      34,
      'nov2',
      'Amistoso Internacional Data FIFA',
      'Novembro · Data FIFA (Jogo 2)',
      2,
      { excludeConfeds: ['OFC', 'CONMEBOL', 'CAF', 'UEFA'], priorTeamOrderShift: 4 }
    );
  }

  return list;
}

/**
 * Returns every international fixture currently tracked in `NationalTeamState`
 * (Friendlies/Finalíssima, World Cup, Continental Cups, and Eliminatórias), sorted chronologically by date.
 */
export function getAllInternationalFixtures(nt: NationalTeamState): InternationalMatchFixture[] {
  const all: InternationalMatchFixture[] = [];
  const seen = new Set<string>();
  const push = (fix: InternationalMatchFixture) => {
    if (!seen.has(fix.id)) {
      seen.add(fix.id);
      all.push(fix);
    }
  };

  (nt.seasonSchedule || []).forEach(push);
  if (nt.worldCup) {
    nt.worldCup.fixtures.forEach(push);
  }
  if (nt.continentals) {
    (Object.values(nt.continentals) as NationalTournamentEdition[]).forEach((ed) => {
      if (ed) ed.fixtures.forEach(push);
    });
  }
  if (nt.qualifiers) {
    nt.qualifiers.conmebolFixtures.forEach(push);
    nt.qualifiers.otherConfedFixtures.forEach(push);
  }
  if (nt.continentalQualifiers) {
    (Object.values(nt.continentalQualifiers.tracks) as ContinentalQualifiersTrack[]).forEach((tr) => {
      if (tr) tr.fixtures.forEach(push);
    });
  }

  return all.sort((a, b) => {
    const da = a.date || `${a.seasonYear}-01-01`;
    const db = b.date || `${b.seasonYear}-01-01`;
    if (da !== db) return da.localeCompare(db);
    const ta = a.time || '20:00';
    const tb = b.time || '20:00';
    if (ta !== tb) return ta.localeCompare(tb);
    return a.id.localeCompare(b.id);
  });
}

/**
 * Returns all international fixtures (past and upcoming across the active cycle) involving `teamId`,
 * sorted chronologically by `date`.
 */
export function getTeamAllInternationalFixtures(
  nt: NationalTeamState,
  teamId: string
): InternationalMatchFixture[] {
  return getAllInternationalFixtures(nt).filter(
    (f) => f.homeTeamId === teamId || f.awayTeamId === teamId
  );
}

/**
 * Returns the earliest unplayed fixture of the user's coached Seleção on or after `currentDate`
 * (or any unlocked `READY_FOR_USER` fixture).
 */
export function getUpcomingUserSelecaoFixture(
  nt: NationalTeamState | undefined,
  _currentDate: string
): InternationalMatchFixture | null {
  if (!nt || !nt.isUserCoach || !nt.userTeamId) return null;
  const isRealTeam = (id?: string) =>
    Boolean(id && id !== 'tbd' && !id.startsWith('TBD'));
  const all = getTeamAllInternationalFixtures(nt, nt.userTeamId).filter(
    (f) => !f.played && isRealTeam(f.homeTeamId) && isRealTeam(f.awayTeamId)
  );
  const ready = all.find((f) => f.status === 'READY_FOR_USER');
  if (ready) return ready;
  return all[0] || null;
}

/**
 * Collects all international fixtures involving `teamId` in calendar year `seasonYear` across:
 * - Season Friendlies / Finalíssima
 * - Copa do Mundo (if active this year)
 * - Continental Championships (if active this year)
 * - Eliminatórias da Copa (for matches scheduled in `seasonYear`)
 */
export function getTeamSeasonInternationalFixtures(
  nt: NationalTeamState,
  teamId: string,
  seasonYear: number
): InternationalMatchFixture[] {
  const yearPrefix = `${seasonYear}-`;
  return getTeamAllInternationalFixtures(nt, teamId).filter((fix) =>
    fix.date ? fix.date.startsWith(yearPrefix) : fix.seasonYear === seasonYear
  );
}

function syncLegacyWindowsFromTeamFixtures(
  nt: NationalTeamState,
  seasonYear: number
): FifaWindowFixture[] {
  const focusTeamId = nt.userTeamId || 'nt_bra';
  const teamFixes = getTeamSeasonInternationalFixtures(nt, focusTeamId, seasonYear);

  return teamFixes.map((fix) => {
    const isHome = fix.homeTeamId === focusTeamId;
    const oppId = isHome ? fix.awayTeamId : fix.homeTeamId;
    const opp = getNationalTeamById(oppId);
    const myScore = isHome ? fix.homeScore ?? undefined : fix.awayScore ?? undefined;
    const oppScore = isHome ? fix.awayScore ?? undefined : fix.homeScore ?? undefined;

    return {
      id: fix.id,
      seasonYear: fix.seasonYear,
      triggerRound: fix.triggerRound,
      date: fix.date,
      time: fix.time,
      windowLabel: `${fix.dateLabel} · ${fix.phase}`,
      competitionLabel: fix.competitionName,
      opponentName: opp.name,
      opponentCode: opp.code,
      opponentStrength: opp.strength,
      opponentPrimaryColor: opp.primaryColor,
      opponentTextColor: opp.textColor,
      stadiumName: fix.stadiumName,
      isHome,
      status: fix.status,
      brazilScore: myScore,
      opponentScore: oppScore,
      highlights: fix.highlights,
      scorersSummary: fix.scorersSummary,
    };
  });
}

const HISTORICAL_WORLD_CUPS: PastWorldCupRecord[] = [
  {
    year: 2022,
    host: 'Catar',
    championTeamId: 'nt_arg',
    runnerUpTeamId: 'nt_fra',
    scoreLabel: '3 x 3 (4–2 pen)',
  },
  {
    year: 2018,
    host: 'Rússia',
    championTeamId: 'nt_fra',
    runnerUpTeamId: 'nt_cro',
    scoreLabel: '4 x 2',
  },
  {
    year: 2014,
    host: 'Brasil',
    championTeamId: 'nt_ale',
    runnerUpTeamId: 'nt_arg',
    scoreLabel: '1 x 0 (pro)',
  },
  {
    year: 2010,
    host: 'África do Sul',
    championTeamId: 'nt_esp',
    runnerUpTeamId: 'nt_hol',
    scoreLabel: '1 x 0 (pro)',
  },
  {
    year: 2006,
    host: 'Alemanha',
    championTeamId: 'nt_ita',
    runnerUpTeamId: 'nt_fra',
    scoreLabel: '1 x 1 (5–3 pen)',
  },
  {
    year: 2002,
    host: 'Coreia do Sul & Japão',
    championTeamId: 'nt_bra',
    runnerUpTeamId: 'nt_ale',
    scoreLabel: '2 x 0',
  },
];

function createDefaultRankingMap(): Record<string, number> {
  const map: Record<string, number> = {};
  NATIONAL_TEAMS_CATALOG.forEach((t) => {
    map[t.id] = t.fifaPoints;
  });
  return map;
}

function getNextContinentalCycleYear(calendarYear: number): number {
  const rem = calendarYear % 4;
  return rem === 0 ? (calendarYear >= 2028 ? calendarYear : 2028) : calendarYear + (4 - rem);
}

function createInitialContinentalsRecord(seasonYear: number): Record<ContinentalCompId, NationalTournamentEdition> {
  const majorYear = seasonYear >= 2028 && seasonYear % 4 === 0 ? seasonYear : 2024;
  // Copa Ouro CONCACAF bienal em anos ímpares (2025, 2027, 2029, 2031, 2033, 2035, 2037)
  const goldCupYear = seasonYear >= 2027 && seasonYear % 2 === 1 ? seasonYear : 2025;
  // UEFA Nations League bienal em anos pares (2026/27 transição, 2028/29, 2030/31, 2032/33, 2034/35, 2036/37, 2038/39)
  const nlYear =
    seasonYear >= 2028
      ? seasonYear % 2 === 0
        ? seasonYear
        : seasonYear - 1
      : 2026;
  return {
    copa_america: generateContinentalEdition('copa_america', majorYear, majorYear === 2024),
    eurocopa: generateContinentalEdition('eurocopa', majorYear, majorYear === 2024),
    copa_africana: generateContinentalEdition('copa_africana', majorYear, majorYear === 2024),
    copa_asia: generateContinentalEdition('copa_asia', majorYear, majorYear === 2024),
    copa_oceania: generateContinentalEdition('copa_oceania', majorYear, majorYear === 2024),
    copa_ouro: generateContinentalEdition('copa_ouro', goldCupYear, goldCupYear === 2025),
    nations_league: generateContinentalEdition('nations_league', nlYear, false),
  };
}

function buildOfficialBusyTeamDateSet(
  qualifiers: WorldCupQualifiersCycle | undefined,
  continentalQualifiers: ContinentalQualifiersCycle | undefined,
  worldCup: NationalTournamentEdition | undefined,
  continentals: Partial<Record<ContinentalCompId, NationalTournamentEdition>> | undefined,
  seasonSchedule: InternationalMatchFixture[],
  completedQualifiersArchive?: WorldCupQualifiersCycle,
  completedContinentalQualifiersArchive?: ContinentalQualifiersCycle
): Set<string> {
  const busy = new Set<string>();
  const mark = (fix: InternationalMatchFixture) => {
    if (!fix.date) return;
    busy.add(`${fix.homeTeamId}_${fix.date}`);
    busy.add(`${fix.awayTeamId}_${fix.date}`);
  };
  if (qualifiers) {
    qualifiers.conmebolFixtures.forEach(mark);
    qualifiers.otherConfedFixtures.forEach(mark);
  }
  if (completedQualifiersArchive) {
    completedQualifiersArchive.conmebolFixtures.forEach(mark);
    completedQualifiersArchive.otherConfedFixtures.forEach(mark);
  }
  if (continentalQualifiers) {
    (Object.values(continentalQualifiers.tracks) as ContinentalQualifiersTrack[]).forEach((tr) =>
      tr?.fixtures.forEach(mark)
    );
  }
  if (completedContinentalQualifiersArchive) {
    (Object.values(completedContinentalQualifiersArchive.tracks) as ContinentalQualifiersTrack[]).forEach((tr) =>
      tr?.fixtures.forEach(mark)
    );
  }
  if (worldCup) worldCup.fixtures.forEach(mark);
  if (continentals) {
    (Object.values(continentals) as (NationalTournamentEdition | undefined)[]).forEach((ed) =>
      ed?.fixtures.forEach(mark)
    );
  }
  seasonSchedule
    .filter((f) => f.competition === 'finalissima')
    .forEach(mark);
  return busy;
}

// ============================================================================
// NATIONAL TEAM COACHES, CAROUSEL & JOB OFFERS HELPERS
// ============================================================================

const INITIAL_NATIONAL_TEAM_COACHES: Record<
  string,
  { coachName: string; nationality: string; prestige: number }
> = {
  nt_bra: { coachName: 'Carlo Ancelotti', nationality: 'Itália', prestige: 94 },
  nt_arg: { coachName: 'Lionel Scaloni', nationality: 'Argentina', prestige: 92 },
  nt_fra: { coachName: 'Didier Deschamps', nationality: 'França', prestige: 91 },
  nt_esp: { coachName: 'Luis de la Fuente', nationality: 'Espanha', prestige: 90 },
  nt_eng: { coachName: 'Thomas Tuchel', nationality: 'Alemanha', prestige: 90 },
  nt_ger: { coachName: 'Julian Nagelsmann', nationality: 'Alemanha', prestige: 88 },
  nt_por: { coachName: 'Roberto Martínez', nationality: 'Espanha', prestige: 87 },
  nt_ned: { coachName: 'Ronald Koeman', nationality: 'Holanda', prestige: 86 },
  nt_ita: { coachName: 'Gennaro Gattuso', nationality: 'Itália', prestige: 82 },
  nt_uru: { coachName: 'Marcelo Bielsa', nationality: 'Argentina', prestige: 88 },
  nt_col: { coachName: 'Néstor Lorenzo', nationality: 'Argentina', prestige: 84 },
  nt_bel: { coachName: 'Rudi Garcia', nationality: 'França', prestige: 84 },
  nt_cro: { coachName: 'Zlatko Dalić', nationality: 'Croácia', prestige: 86 },
  nt_mar: { coachName: 'Walid Regragui', nationality: 'Marrocos', prestige: 85 },
  nt_jpn: { coachName: 'Hajime Moriyasu', nationality: 'Japão', prestige: 83 },
  nt_usa: { coachName: 'Mauricio Pochettino', nationality: 'Argentina', prestige: 86 },
  nt_mex: { coachName: 'Javier Aguirre', nationality: 'México', prestige: 82 },
  nt_can: { coachName: 'Jesse Marsch', nationality: 'EUA', prestige: 82 },
  nt_chi: { coachName: 'Ricardo Gareca', nationality: 'Argentina', prestige: 81 },
  nt_ecu: { coachName: 'Sebastián Beccacece', nationality: 'Argentina', prestige: 80 },
  nt_par: { coachName: 'Gustavo Alfaro', nationality: 'Argentina', prestige: 81 },
  nt_per: { coachName: 'Óscar Ibáñez', nationality: 'Peru', prestige: 75 },
  nt_ven: { coachName: 'Fernando Batista', nationality: 'Argentina', prestige: 78 },
  nt_bol: { coachName: 'Óscar Villegas', nationality: 'Bolívia', prestige: 73 },
  nt_sui: { coachName: 'Murat Yakin', nationality: 'Suíça', prestige: 82 },
  nt_den: { coachName: 'Brian Riemer', nationality: 'Dinamarca', prestige: 79 },
  nt_nor: { coachName: 'Ståle Solbakken', nationality: 'Noruega', prestige: 80 },
  nt_aut: { coachName: 'Ralf Rangnick', nationality: 'Alemanha', prestige: 84 },
  nt_tur: { coachName: 'Vincenzo Montella', nationality: 'Itália', prestige: 83 },
  nt_srb: { coachName: 'Dragan Stojković', nationality: 'Sérvia', prestige: 79 },
  nt_kor: { coachName: 'Hong Myung-bo', nationality: 'Coreia do Sul', prestige: 78 },
  nt_aus: { coachName: 'Tony Popovic', nationality: 'Austrália', prestige: 78 },
  nt_sen: { coachName: 'Pape Thiaw', nationality: 'Senegal', prestige: 79 },
  nt_egy: { coachName: 'Hossam Hassan', nationality: 'Egito', prestige: 78 },
};

const NATIONAL_REPLACEMENT_COACHES: Array<{
  coachName: string;
  nationality: string;
  prestige: number;
}> = [
  { coachName: 'Hervé Renard', nationality: 'França', prestige: 83 },
  { coachName: 'Carlos Queiroz', nationality: 'Portugal', prestige: 82 },
  { coachName: 'Vahid Halilhodžić', nationality: 'Bósnia', prestige: 81 },
  { coachName: 'Paulo Bento', nationality: 'Portugal', prestige: 81 },
  { coachName: 'Gareth Southgate', nationality: 'Inglaterra', prestige: 85 },
  { coachName: 'Tite', nationality: 'Brasil', prestige: 86 },
  { coachName: 'José Pékerman', nationality: 'Argentina', prestige: 83 },
  { coachName: 'Gustavo Quinteros', nationality: 'Argentina', prestige: 80 },
  { coachName: 'Reinaldo Rueda', nationality: 'Colômbia', prestige: 79 },
  { coachName: 'Fernando Santos', nationality: 'Portugal', prestige: 83 },
  { coachName: 'Gerardo Martino', nationality: 'Argentina', prestige: 82 },
  { coachName: 'Juan Carlos Osorio', nationality: 'Colômbia', prestige: 78 },
  { coachName: 'Graham Arnold', nationality: 'Austrália', prestige: 77 },
  { coachName: 'Héctor Cúper', nationality: 'Argentina', prestige: 79 },
  { coachName: 'Claudio Ranieri', nationality: 'Itália', prestige: 85 },
  { coachName: 'André Villas-Boas', nationality: 'Portugal', prestige: 82 },
  { coachName: 'Paulo Sousa', nationality: 'Portugal', prestige: 80 },
  { coachName: 'César Farías', nationality: 'Venezuela', prestige: 76 },
  { coachName: 'Bernd Schuster', nationality: 'Alemanha', prestige: 78 },
  { coachName: 'Roberto Donadoni', nationality: 'Itália', prestige: 80 },
];

const FALLBACK_COACH_FIRST_NAMES: Record<ConfederationCode, string[]> = {
  CONMEBOL: ['Martín', 'Eduardo', 'Diego', 'Matías', 'Carlos', 'Gustavo'],
  UEFA: ['Marco', 'Stefan', 'Lukas', 'Thomas', 'Patrick', 'Igor'],
  CONCACAF: ['Miguel', 'Brian', 'Luis', 'Kevin', 'Jorge', 'Anthony'],
  CAF: ['Aliou', 'Kamel', 'Sami', 'Youssef', 'Ibrahim', 'Moussa'],
  AFC: ['Takeshi', 'Min-jae', 'Tariq', 'Hassan', 'Saeed', 'Wei'],
  OFC: ['Liam', 'Callum', 'David', 'Peter', 'Mark', 'Chris'],
};

const FALLBACK_COACH_LAST_NAMES: Record<ConfederationCode, string[]> = {
  CONMEBOL: ['Méndez', 'Álvarez', 'Paredes', 'Rojas', 'Silveira', 'Cabrera'],
  UEFA: ['Vuković', 'Kováč', 'Novák', 'Lindqvist', 'Müller', 'Moretti'],
  CONCACAF: ['Hernández', 'Campbell', 'Rodríguez', 'Morris', 'Vázquez', 'Brown'],
  CAF: ['Cissé', 'Benali', 'Traoré', 'Diallo', 'Mensah', 'Bensaid'],
  AFC: ['Sato', 'Park', 'Al-Harbi', 'Rezaei', 'Tanaka', 'Mansour'],
  OFC: ['Taylor', 'Wilson', 'Henderson', 'Murray', 'Fraser', 'Reid'],
};

function buildInitialCoachRecordForTeam(team: NationalTeamProfile): NationalTeamCoachRecord {
  const known = INITIAL_NATIONAL_TEAM_COACHES[team.id];
  if (known) {
    return {
      coachName: known.coachName,
      nationality: known.nationality,
      prestige: known.prestige,
      security: 76,
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    };
  }
  const seed = team.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const firstPool = FALLBACK_COACH_FIRST_NAMES[team.confederation];
  const lastPool = FALLBACK_COACH_LAST_NAMES[team.confederation];
  return {
    coachName: `${firstPool[seed % firstPool.length]} ${lastPool[(seed * 3) % lastPool.length]}`,
    nationality: team.name,
    prestige: Math.max(62, Math.min(84, team.strength - 4)),
    security: 74,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
  };
}

function buildInitialNationalTeamCoachesMap(
  userTeamId?: string | null,
  userManagerName?: string
): Record<string, NationalTeamCoachRecord> {
  const map: Record<string, NationalTeamCoachRecord> = {};
  NATIONAL_TEAMS_CATALOG.forEach((team) => {
    if (userTeamId && team.id === userTeamId && userManagerName) {
      map[team.id] = {
        coachName: userManagerName,
        nationality: 'Brasil',
        prestige: Math.max(70, team.strength),
        security: 80,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      };
    } else {
      map[team.id] = buildInitialCoachRecordForTeam(team);
    }
  });
  return map;
}

export function ensureNationalTeamCoachesMap(
  nt: NationalTeamState | undefined,
  userManagerName = 'Treinador'
): Record<string, NationalTeamCoachRecord> {
  const userTeamId = nt?.isUserCoach ? nt.userTeamId || 'nt_bra' : null;
  const existing = nt?.teamCoaches || {};
  const result: Record<string, NationalTeamCoachRecord> = {};

  NATIONAL_TEAMS_CATALOG.forEach((team) => {
    const cur = existing[team.id];
    if (cur) {
      if (userTeamId === team.id && cur.coachName !== userManagerName) {
        result[team.id] = {
          ...cur,
          coachName: userManagerName,
          security: nt?.cbfConfidence ?? cur.security,
        };
      } else {
        result[team.id] = cur;
      }
    } else if (userTeamId === team.id) {
      result[team.id] = {
        coachName: userManagerName,
        nationality: 'Brasil',
        prestige: 76,
        security: nt?.cbfConfidence ?? 80,
        matches: nt?.coachMatches ?? 0,
        wins: nt?.coachWins ?? 0,
        draws: nt?.coachDraws ?? 0,
        losses: nt?.coachLosses ?? 0,
      };
    } else {
      result[team.id] = buildInitialCoachRecordForTeam(team);
    }
  });

  return result;
}

export function getNationalTeamCoachRecord(
  nt: NationalTeamState | undefined,
  teamId: string,
  userManagerName = 'Treinador'
): NationalTeamCoachRecord {
  if (nt?.isUserCoach && (nt.userTeamId || 'nt_bra') === teamId) {
    const existing = nt.teamCoaches?.[teamId];
    return {
      coachName: userManagerName,
      nationality: existing?.nationality || 'Brasil',
      prestige: existing?.prestige || 78,
      security: nt.cbfConfidence ?? existing?.security ?? 80,
      matches: nt.coachMatches ?? existing?.matches ?? 0,
      wins: nt.coachWins ?? existing?.wins ?? 0,
      draws: nt.coachDraws ?? existing?.draws ?? 0,
      losses: nt.coachLosses ?? existing?.losses ?? 0,
    };
  }
  const existing = nt?.teamCoaches?.[teamId];
  if (existing) return existing;
  return buildInitialCoachRecordForTeam(getNationalTeamById(teamId));
}

function pickReplacementNationalCoach(
  coachesMap: Record<string, NationalTeamCoachRecord>,
  team: NationalTeamProfile,
  excludeNames: string[] = []
): { coachName: string; nationality: string; prestige: number } {
  const excludedSet = new Set(
    (excludeNames || [])
      .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
      .map((n) => n.trim().toLowerCase())
  );
  const usedNames = new Set(
    Object.values(coachesMap || {})
      .map((r) => (r?.coachName || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const candidates = NATIONAL_REPLACEMENT_COACHES.filter(
    (c) => !excludedSet.has(c.coachName.toLowerCase())
  ).sort((a, b) => {
    const aFree = usedNames.has(a.coachName.toLowerCase()) ? 1 : 0;
    const bFree = usedNames.has(b.coachName.toLowerCase()) ? 1 : 0;
    if (aFree !== bFree) return aFree - bFree;
    return Math.abs(a.prestige - team.strength) - Math.abs(b.prestige - team.strength);
  });

  if (candidates.length > 0 && !excludedSet.has(candidates[0].coachName.toLowerCase())) {
    return candidates[0];
  }
  const fb = buildInitialCoachRecordForTeam(team);
  if (!excludedSet.has(fb.coachName.toLowerCase())) {
    return { coachName: fb.coachName, nationality: fb.nationality, prestige: fb.prestige };
  }
  return {
    coachName: `Técnico Interino (${team.federationCode})`,
    nationality: team.name,
    prestige: Math.max(66, team.strength - 6),
  };
}

function computeNationalSecurityDelta(
  myTeam: NationalTeamProfile,
  oppTeam: NationalTeamProfile,
  scored: number,
  conceded: number,
  didWin: boolean,
  didLose: boolean,
  isKnockout: boolean
): number {
  const strengthGap = myTeam.strength - oppTeam.strength;
  if (didWin) {
    let gain = oppTeam.strength >= 84 || isKnockout ? 7 : 5;
    if (scored - conceded >= 3) gain += 2;
    return gain;
  }
  if (!didLose) {
    return strengthGap >= 10 ? -2 : 1;
  }
  let drop = -10;
  if (conceded - scored >= 3) drop -= 4;
  if (strengthGap >= 6) drop -= 4;
  if (isKnockout) drop -= 5;
  return drop;
}

function syncLegacyNationalInviteFlags(
  nt: NationalTeamState,
  offers: NationalTeamJobOffer[]
): { hasPendingCbfInvite: boolean; pendingInviteTeamId: string | null } {
  if (nt.isUserCoach) {
    return { hasPendingCbfInvite: false, pendingInviteTeamId: null };
  }
  const activePending = offers.filter((o) => o.status === 'PENDING');
  if (activePending.length === 0) {
    return { hasPendingCbfInvite: false, pendingInviteTeamId: null };
  }
  const braOffer = activePending.find((o) => o.teamId === 'nt_bra');
  return {
    hasPendingCbfInvite: true,
    pendingInviteTeamId: (braOffer || activePending[0]).teamId,
  };
}

function generateNationalTeamOffers(
  nt: NationalTeamState,
  reputation: number,
  currentDate: string,
  excludeTeamIds: string[],
  reasonPrefix?: string,
  maxOffers = 3,
  isEmergencyFallback = false
): NationalTeamJobOffer[] {
  const coachesMap = ensureNationalTeamCoachesMap(nt);
  const excludeSet = new Set(excludeTeamIds);
  const existingPendingIds = new Set(
    (nt.pendingNationalOffers || []).filter((o) => o.status === 'PENDING').map((o) => o.teamId)
  );

  const ranked = NATIONAL_TEAMS_CATALOG.filter((team) => {
    if (excludeSet.has(team.id) || existingPendingIds.has(team.id)) return false;
    if (isEmergencyFallback) return team.minReputationToCoach <= reputation + 14 || team.strength <= 82;
    return team.minReputationToCoach <= reputation + 6;
  })
    .map((team) => {
      const coachSec = coachesMap[team.id]?.security ?? 74;
      const repGap = Math.abs(team.minReputationToCoach - reputation);
      const pressureBonus = coachSec <= 48 ? -18 : coachSec <= 62 ? -8 : 0;
      const braPriority = team.id === 'nt_bra' && reputation >= CBF_INVITE_MIN_REPUTATION ? -12 : 0;
      return {
        team,
        coachSec,
        score: repGap + pressureBonus + braPriority + Math.random() * 4,
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, maxOffers);

  return ranked.map(({ team, coachSec }, idx) => {
    const prevCoach = coachesMap[team.id]?.coachName || 'o antigo técnico';
    const defaultReason =
      coachSec <= 52
        ? `A federação ${team.federationCode} pressiona ${prevCoach} (estabilidade ${coachSec}%) e quer você no comando`
        : team.id === 'nt_bra'
        ? `Seu prestígio (${reputation}/100) atraiu convite oficial da CBF para comandar a Seleção Brasileira`
        : `A federação ${team.federationCode} abriu projeto oficial para você assumir a seleção de ${team.name}`;

    return {
      id: `nt_offer_${team.id}_${Date.now()}_${idx}`,
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      federationCode: team.federationCode,
      confederation: team.confederation,
      strength: team.strength,
      primaryColor: team.primaryColor,
      textColor: team.textColor,
      reason: reasonPrefix ? `${reasonPrefix} · ${team.federationCode}` : defaultReason,
      createdDate: currentDate,
      expiresDate: addDays(currentDate, 45),
      status: 'PENDING',
    };
  });
}

export function createInitialNationalTeamState(
  clubs: Club[],
  seasonYear: number
): NationalTeamState {
  const virtualPlayers = generateInitialVirtualPlayers();
  const { calledUpPlayerIds, starterPlayerIds, captainPlayerId } = selectOptimalSelecaoSquad(
    clubs,
    'nt_bra',
    virtualPlayers,
    '4-3-3'
  );

  const completedQualifiersArchive = generateWorldCupQualifiersCycle(2026, true);
  const qualifiers = generateWorldCupQualifiersCycle(2030, false);
  const completedContinentalQualifiersArchive = generateContinentalQualifiersCycle(2024, true);
  const continentalQualifiers = generateContinentalQualifiersCycle(2028, false);
  const worldCup = generateWorldCupEdition(2026, undefined, false);
  const continentals = createInitialContinentalsRecord(seasonYear);
  const preBusy = buildOfficialBusyTeamDateSet(
    qualifiers,
    continentalQualifiers,
    worldCup,
    continentals,
    []
  );
  const rawSchedule = [
    ...generateSeasonFriendliesAndFinalissima(seasonYear, preBusy),
    ...generateSeasonFriendliesAndFinalissima(seasonYear + 1, preBusy),
  ];
  const busy = buildOfficialBusyTeamDateSet(
    qualifiers,
    continentalQualifiers,
    worldCup,
    continentals,
    rawSchedule
  );
  const seasonSchedule = rawSchedule.filter(
    (f) =>
      f.competition !== 'friendly' ||
      !f.date ||
      (!busy.has(`${f.homeTeamId}_${f.date}`) && !busy.has(`${f.awayTeamId}_${f.date}`))
  );

  const draft: NationalTeamState = {
    systemVersion: 17,
    isUserCoach: false,
    userTeamId: null,
    pendingInviteTeamId: null,
    hasPendingCbfInvite: false,
    cbfConfidence: 80,
    warningsIssued: 0,
    coachMatches: 0,
    coachWins: 0,
    coachDraws: 0,
    coachLosses: 0,
    trophiesWonWithSelecao: 0,
    tacticStyle: 'EQUILIBRADO',
    formation: '4-3-3',
    captainPlayerId,
    calledUpPlayerIds,
    starterPlayerIds,
    windows: [],
    callUpHistory: [],
    pendingNationalOffers: [],
    teamCoaches: buildInitialNationalTeamCoachesMap(null),
    nationalStints: [],
    lastDismissal: null,
    fifaRankingPoints: createDefaultRankingMap(),
    virtualPlayers,
    qualifiers,
    completedQualifiersArchive,
    continentalQualifiers,
    completedContinentalQualifiersArchive,
    worldCup,
    pastWorldCups: [...HISTORICAL_WORLD_CUPS],
    continentals,
    seasonSchedule,
  };

  draft.windows = syncLegacyWindowsFromTeamFixtures(draft, seasonYear);
  return draft;
}

const LEGACY_FIFA_DATE_REMAP_2026_2030: Record<string, string> = {
  '2026-09-03': '2026-09-24',
  '2026-09-08': '2026-09-28',
  '2026-10-08': '2026-10-02',
  '2026-10-13': '2026-10-06',
  '2029-09-27': '2029-09-29',
  '2029-09-30': '2029-10-02',
  '2029-10-04': '2029-10-05',
  '2030-06-06': '2030-06-05',
  '2030-06-10': '2030-06-11',
  '2030-10-01': '2030-09-29',
};

function remapFixtureDatesIfUnplayed(
  fixtures: InternationalMatchFixture[]
): InternationalMatchFixture[] {
  return fixtures.map((f) => {
    if (f.played || !f.date) return f;
    const nextDate = LEGACY_FIFA_DATE_REMAP_2026_2030[f.date];
    if (!nextDate) return f;
    const suffix = f.dateLabel?.includes('·')
      ? f.dateLabel.slice(f.dateLabel.indexOf('·'))
      : '';
    return {
      ...f,
      date: nextDate,
      dateLabel: suffix ? `${formatShortDate(nextDate)} ${suffix}` : formatShortDate(nextDate),
    };
  });
}

/**
 * Ensures saves created prior to System v10 smoothly receive all 11 OFC full members,
 * Copa das Nações da Oceania (2024 archive + 2028 Qualifiers/Cup), OFC WC 2030 Qualifiers (2 groups),
 * 54 CAF / 54 UEFA nations, and the exact official 2026-2030 FIFA calendar dates.
 */
export function ensureUpgradedNationalTeamState(
  existing: NationalTeamState | undefined,
  clubs: Club[],
  seasonYear: number
): NationalTeamState {
  if (!existing) {
    return createInitialNationalTeamState(clubs, seasonYear);
  }
  const existingOfcWcGroups = new Set(
    (existing.qualifiers?.otherConfedStandings?.OFC || []).map((r) => r.group || 'Grupo A')
  ).size;
  const existingOfcContGroups = new Set(
    (existing.continentalQualifiers?.tracks?.OFC?.standings || []).map((r) => r.group || 'Grupo A')
  ).size;
  if (
    existing.systemVersion === 17 &&
    existing.qualifiers &&
    (existing.qualifiers.otherConfedStandings?.OFC?.length || 0) >= 11 &&
    existingOfcWcGroups === 1 &&
    (existing.qualifiers.otherConfedStandings?.CONCACAF?.length || 0) >= 16 &&
    (existing.qualifiers.otherConfedStandings?.UEFA?.length || 0) >= 54 &&
    (existing.qualifiers.otherConfedStandings?.CAF?.length || 0) === 54 &&
    (existing.qualifiers.otherConfedStandings?.AFC?.length || 0) >= 48 &&
    existing.continentalQualifiers &&
    (existing.continentalQualifiers.tracks?.UEFA?.standings?.length || 0) >= 54 &&
    (existing.continentalQualifiers.tracks?.CAF?.standings?.length || 0) >= 56 &&
    (existing.continentalQualifiers.tracks?.AFC?.standings?.length || 0) >= 48 &&
    (existing.continentalQualifiers.tracks?.CONCACAF?.standings?.length || 0) >= 16 &&
    (existing.continentalQualifiers.tracks?.OFC?.standings?.length || 0) >= 11 &&
    existingOfcContGroups === 1 &&
    existing.worldCup &&
    existing.continentals?.copa_ouro &&
    (existing.continentals?.copa_ouro?.standings?.length || 0) >= 16 &&
    existing.continentals?.copa_asia &&
    (existing.continentals?.copa_asia?.standings?.length || 0) >= 32 &&
    existing.continentals?.copa_oceania &&
    (existing.continentals?.copa_africana?.standings?.length || 0) >= 32 &&
    (existing.continentals?.eurocopa?.standings?.length || 0) >= 24 &&
    existing.continentals?.nations_league?.groups?.includes('Grupo A1') &&
    existing.virtualPlayers &&
    existing.formation
  ) {
    if (
      existing.teamCoaches &&
      existing.pendingNationalOffers !== undefined &&
      existing.nationalStints !== undefined &&
      existing.warningsIssued !== undefined
    ) {
      return existing;
    }
    return {
      ...existing,
      warningsIssued: existing.warningsIssued ?? 0,
      pendingNationalOffers: existing.pendingNationalOffers || [],
      teamCoaches: ensureNationalTeamCoachesMap(existing),
      nationalStints: existing.nationalStints || [],
      lastDismissal: existing.lastDismissal ?? null,
    };
  }

  const enrichedVirtualPlayers = ensureVirtualPlayersDepthFor26(existing.virtualPlayers);
  const migratedTeamId = existing.userTeamId ?? (existing.isUserCoach ? 'nt_bra' : null);
  const focusTeamId = migratedTeamId || 'nt_bra';
  const formation: FormationType = existing.formation || '4-3-3';
  const optimal26 = selectOptimalSelecaoSquad(
    clubs,
    focusTeamId,
    enrichedVirtualPlayers,
    formation
  );

  const pool = resolveNationalTeamPlayerPool(clubs, enrichedVirtualPlayers, focusTeamId);
  const poolMap = new Map(pool.map((p) => [p.id, p]));

  let nextCalledUp = (existing.calledUpPlayerIds || []).filter((id) => poolMap.has(id));
  for (const optId of optimal26.calledUpPlayerIds) {
    if (nextCalledUp.length >= MAX_SELECAO_SQUAD_SIZE) break;
    if (!nextCalledUp.includes(optId)) {
      nextCalledUp.push(optId);
    }
  }

  let rawStarters = (existing.starterPlayerIds || []).filter((id) => nextCalledUp.includes(id));
  for (const id of optimal26.starterPlayerIds) {
    if (rawStarters.length >= 11) break;
    if (nextCalledUp.includes(id) && !rawStarters.includes(id)) {
      rawStarters.push(id);
    }
  }
  for (const id of nextCalledUp) {
    if (rawStarters.length >= 11) break;
    if (!rawStarters.includes(id)) rawStarters.push(id);
  }

  const starterObjs = rawStarters
    .slice(0, 11)
    .map((id) => poolMap.get(id))
    .filter((p): p is ResolvedNationalPlayer => Boolean(p));
  const alignedStarters =
    starterObjs.length === 11
      ? fitPlayersToSelecaoFormation(starterObjs, formation)
      : optimal26.starterPlayerIds;

  nextCalledUp = sortNationalPlayerIdsByPosition(nextCalledUp, pool, alignedStarters);

  const captainPlayerId =
    existing.captainPlayerId && nextCalledUp.includes(existing.captainPlayerId)
      ? existing.captainPlayerId
      : optimal26.captainPlayerId || alignedStarters[0];

  const targetWcYear = existing.qualifiers?.targetWorldCupYear || 2030;
  const wcYear = existing.worldCup?.year || 2026;
  const freshQualifiers = generateWorldCupQualifiersCycle(targetWcYear, false);

  let nextQualifiers: WorldCupQualifiersCycle;
  if (existing.qualifiers && existing.qualifiers.targetWorldCupYear === targetWcYear) {
    let qWorking = existing.qualifiers;
    const oldOfcFixes = qWorking.otherConfedFixtures.filter((f) =>
      f.competitionName.includes('Eliminatórias OFC')
    );
    const ofcWcUnplayed = oldOfcFixes.every((f) => !f.played);
    if (
      (qWorking.otherConfedStandings?.OFC?.length || 0) < 11 ||
      (existingOfcWcGroups !== 1 && ofcWcUnplayed)
    ) {
      const ofcFixes = freshQualifiers.otherConfedFixtures.filter((f) =>
        f.competitionName.includes('Eliminatórias OFC')
      );
      qWorking = {
        ...qWorking,
        otherConfedStandings: {
          ...qWorking.otherConfedStandings,
          OFC: freshQualifiers.otherConfedStandings.OFC,
        },
        otherConfedFixtures: [
          ...qWorking.otherConfedFixtures.filter(
            (f) => !f.competitionName.includes('Eliminatórias OFC')
          ),
          ...ofcFixes,
        ],
      };
    }
    const oldUefaWcFixes = qWorking.otherConfedFixtures.filter((f) =>
      f.competitionName.includes('Eliminatórias UEFA')
    );
    if (
      (qWorking.otherConfedStandings?.UEFA?.length || 0) < 54 ||
      ((existing.systemVersion || 0) < 16 && oldUefaWcFixes.every((f) => !f.played))
    ) {
      const uefaFixes = freshQualifiers.otherConfedFixtures.filter((f) =>
        f.competitionName.includes('Eliminatórias UEFA')
      );
      qWorking = {
        ...qWorking,
        otherConfedStandings: {
          ...qWorking.otherConfedStandings,
          UEFA: freshQualifiers.otherConfedStandings.UEFA,
        },
        otherConfedFixtures: [
          ...qWorking.otherConfedFixtures.filter(
            (f) => !f.competitionName.includes('Eliminatórias UEFA')
          ),
          ...uefaFixes,
        ],
      };
    }
    const oldCafWcFixes = qWorking.otherConfedFixtures.filter((f) =>
      f.competitionName.includes('Eliminatórias CAF')
    );
    if (
      (qWorking.otherConfedStandings?.CAF?.length || 0) !== 54 ||
      ((existing.systemVersion || 0) < 15 && oldCafWcFixes.every((f) => !f.played))
    ) {
      const cafFixes = freshQualifiers.otherConfedFixtures.filter((f) =>
        f.competitionName.includes('Eliminatórias CAF')
      );
      qWorking = {
        ...qWorking,
        otherConfedStandings: {
          ...qWorking.otherConfedStandings,
          CAF: freshQualifiers.otherConfedStandings.CAF,
        },
        otherConfedFixtures: [
          ...qWorking.otherConfedFixtures.filter(
            (f) => !f.competitionName.includes('Eliminatórias CAF')
          ),
          ...cafFixes,
        ],
      };
    }
    if ((qWorking.otherConfedStandings?.CONCACAF?.length || 0) < 16) {
      const oldConcFixes = qWorking.otherConfedFixtures.filter((f) =>
        f.competitionName.includes('Eliminatórias CONCACAF')
      );
      if (oldConcFixes.every((f) => !f.played)) {
        const concFixes = freshQualifiers.otherConfedFixtures.filter((f) =>
          f.competitionName.includes('Eliminatórias CONCACAF')
        );
        qWorking = {
          ...qWorking,
          otherConfedStandings: {
            ...qWorking.otherConfedStandings,
            CONCACAF: freshQualifiers.otherConfedStandings.CONCACAF,
          },
          otherConfedFixtures: [
            ...qWorking.otherConfedFixtures.filter(
              (f) => !f.competitionName.includes('Eliminatórias CONCACAF')
            ),
            ...concFixes,
          ],
        };
      }
    }
    if ((qWorking.otherConfedStandings?.AFC?.length || 0) < 48) {
      const oldAfcFixes = qWorking.otherConfedFixtures.filter((f) =>
        f.competitionName.includes('Eliminatórias AFC')
      );
      if (oldAfcFixes.every((f) => !f.played)) {
        const afcFixes = freshQualifiers.otherConfedFixtures.filter((f) =>
          f.competitionName.includes('Eliminatórias AFC')
        );
        qWorking = {
          ...qWorking,
          otherConfedStandings: {
            ...qWorking.otherConfedStandings,
            AFC: freshQualifiers.otherConfedStandings.AFC,
          },
          otherConfedFixtures: [
            ...qWorking.otherConfedFixtures.filter(
              (f) => !f.competitionName.includes('Eliminatórias AFC')
            ),
            ...afcFixes,
          ],
        };
      }
    }
    if ((existing.systemVersion || 0) < 14 && qWorking.conmebolFixtures.every((f) => !f.played)) {
      qWorking = {
        ...qWorking,
        conmebolStandings: freshQualifiers.conmebolStandings,
        conmebolFixtures: freshQualifiers.conmebolFixtures,
      };
    }
    nextQualifiers = qWorking;
  } else {
    nextQualifiers = freshQualifiers;
  }

  const freshWorldCup = generateWorldCupEdition(
    wcYear,
    undefined,
    existing.worldCup?.status === 'COMPLETED'
  );
  const defaults = createInitialContinentalsRecord(seasonYear);
  const existingContinentals = existing.continentals || ({} as Partial<Record<ContinentalCompId, NationalTournamentEdition>>);
  const existingNl = existingContinentals.nations_league;
  const upgradedNl =
    existingNl &&
    existingNl.groups?.includes('Grupo A1') &&
    existingNl.year >= 2026 &&
    !((existing.systemVersion || 0) < 16 && existingNl.fixtures.every((f) => !f.played))
      ? existingNl.year === 2026 && existingNl.title.includes('2026–28')
        ? {
            ...existingNl,
            title: 'UEFA Nations League 2026/27',
            hostName: 'Europa (4 Ligas · Transição 2026/27 · QF + Final Four)',
          }
        : existingNl
      : defaults.nations_league;
  const existingEuro = existingContinentals.eurocopa;
  const upgradedEuro =
    existingEuro &&
    (existingEuro.standings?.length || 0) >= 24 &&
    !((existing.systemVersion || 0) < 16 && existingEuro.year >= 2028 && existingEuro.fixtures.every((f) => !f.played))
      ? existingEuro
      : generateContinentalEdition(
          'eurocopa',
          existingEuro?.year || defaults.eurocopa.year,
          (existingEuro?.year || defaults.eurocopa.year) <= 2024
        );
  const existingCan = existingContinentals.copa_africana;
  const upgradedCan =
    existingCan &&
    (existingCan.standings?.length || 0) >= 32 &&
    !((existing.systemVersion || 0) < 15 && existingCan.year === 2028 && existingCan.fixtures.every((f) => !f.played))
      ? existingCan
      : generateContinentalEdition(
          'copa_africana',
          existingCan?.year || defaults.copa_africana.year,
          (existingCan?.year || defaults.copa_africana.year) <= 2024
        );
  const existingAsia = existingContinentals.copa_asia;
  const upgradedAsia =
    existingAsia && (existingAsia.standings?.length || 0) >= 32
      ? existingAsia
      : generateContinentalEdition(
          'copa_asia',
          existingAsia?.year || defaults.copa_asia.year,
          (existingAsia?.year || defaults.copa_asia.year) <= 2024
        );
  const existingGold = existingContinentals.copa_ouro;
  const upgradedGold =
    existingGold && (existingGold.standings?.length || 0) >= 16
      ? existingGold
      : generateContinentalEdition(
          'copa_ouro',
          existingGold?.year || defaults.copa_ouro.year,
          (existingGold?.year || defaults.copa_ouro.year) <= 2025
        );
  const existingCopaAmerica = existingContinentals.copa_america;
  const upgradedCopaAmerica =
    existingCopaAmerica &&
    !((existing.systemVersion || 0) < 14 && existingCopaAmerica.year === 2028 && existingCopaAmerica.fixtures.every((f) => !f.played))
      ? existingCopaAmerica
      : existingCopaAmerica && existingCopaAmerica.year === 2028
      ? generateContinentalEdition('copa_america', 2028, false)
      : defaults.copa_america;
  const mergedContinentals: Record<ContinentalCompId, NationalTournamentEdition> = {
    copa_america: upgradedCopaAmerica,
    eurocopa: upgradedEuro,
    copa_africana: upgradedCan,
    copa_asia: upgradedAsia,
    copa_oceania: existingContinentals.copa_oceania || defaults.copa_oceania,
    copa_ouro: upgradedGold,
    nations_league: upgradedNl,
  };

  const targetContYear = getNextContinentalCycleYear(seasonYear);
  const freshContQualifiers = generateContinentalQualifiersCycle(targetContYear, false);
  let continentalQualifiers: ContinentalQualifiersCycle;
  if (existing.continentalQualifiers) {
    const oldUefaContTrack = existing.continentalQualifiers.tracks?.UEFA;
    const uefaContUnplayed = !oldUefaContTrack || oldUefaContTrack.fixtures.every((f) => !f.played);
    const needsUefaUpgrade =
      (oldUefaContTrack?.standings?.length || 0) < 54 ||
      ((existing.systemVersion || 0) < 16 && uefaContUnplayed);
    const oldCafContTrack = existing.continentalQualifiers.tracks?.CAF;
    const cafContUnplayed = !oldCafContTrack || oldCafContTrack.fixtures.every((f) => !f.played);
    const needsCafUpgrade =
      (oldCafContTrack?.standings?.length || 0) < 56 ||
      ((existing.systemVersion || 0) < 15 && cafContUnplayed);
    const oldAfcTrack = existing.continentalQualifiers.tracks?.AFC;
    const afcContUnplayed = !oldAfcTrack || oldAfcTrack.fixtures.every((f) => !f.played);
    const needsAfcUpgrade = (oldAfcTrack?.standings?.length || 0) < 48 && afcContUnplayed;
    const oldConcTrack = existing.continentalQualifiers.tracks?.CONCACAF;
    const concContUnplayed = !oldConcTrack || oldConcTrack.fixtures.every((f) => !f.played);
    const needsConcUpgrade = (oldConcTrack?.standings?.length || 0) < 16 && concContUnplayed;
    const oldOfcTrack = existing.continentalQualifiers.tracks?.OFC;
    const ofcContUnplayed = !oldOfcTrack || oldOfcTrack.fixtures.every((f) => !f.played);
    const needsOfcUpgrade =
      (oldOfcTrack?.standings?.length || 0) < 11 ||
      (existingOfcContGroups !== 1 && ofcContUnplayed);
    if (needsUefaUpgrade || needsCafUpgrade || needsAfcUpgrade || needsConcUpgrade || needsOfcUpgrade) {
      continentalQualifiers = {
        ...existing.continentalQualifiers,
        tracks: {
          ...existing.continentalQualifiers.tracks,
          ...(needsUefaUpgrade ? { UEFA: freshContQualifiers.tracks.UEFA } : {}),
          ...(needsCafUpgrade ? { CAF: freshContQualifiers.tracks.CAF } : {}),
          ...(needsAfcUpgrade ? { AFC: freshContQualifiers.tracks.AFC } : {}),
          ...(needsConcUpgrade ? { CONCACAF: freshContQualifiers.tracks.CONCACAF } : {}),
          ...(needsOfcUpgrade ? { OFC: freshContQualifiers.tracks.OFC } : {}),
        },
      };
    } else {
      continentalQualifiers = existing.continentalQualifiers;
    }
  } else {
    continentalQualifiers = freshContQualifiers;
  }
  const completedContinentalQualifiersArchive =
    existing.completedContinentalQualifiersArchive &&
    (existing.completedContinentalQualifiersArchive.tracks?.CAF?.standings?.length || 0) >= 56 &&
    (existing.completedContinentalQualifiersArchive.tracks?.OFC?.standings?.length || 0) >= 11
      ? existing.completedContinentalQualifiersArchive
      : generateContinentalQualifiersCycle(2024, true);

  const remappedQualifiers: WorldCupQualifiersCycle = {
    ...nextQualifiers,
    conmebolFixtures: remapFixtureDatesIfUnplayed(nextQualifiers.conmebolFixtures),
    otherConfedFixtures: remapFixtureDatesIfUnplayed(nextQualifiers.otherConfedFixtures),
  };

  const remappedContQualifiers: ContinentalQualifiersCycle = {
    ...continentalQualifiers,
    tracks: Object.fromEntries(
      Object.entries(continentalQualifiers.tracks).map(([k, tr]) => [
        k,
        tr ? { ...tr, fixtures: remapFixtureDatesIfUnplayed(tr.fixtures) } : tr,
      ])
    ) as ContinentalQualifiersCycle['tracks'],
  };

  const remappedNl: NationalTournamentEdition = {
    ...mergedContinentals.nations_league,
    fixtures: remapFixtureDatesIfUnplayed(mergedContinentals.nations_league.fixtures),
  };
  const remappedContinentals: Record<ContinentalCompId, NationalTournamentEdition> = {
    ...mergedContinentals,
    nations_league: remappedNl,
  };

  const preBusy = buildOfficialBusyTeamDateSet(
    remappedQualifiers,
    remappedContQualifiers,
    existing.worldCup?.year === 2026 && existing.worldCup.fixtures?.[0]?.homeTeamId === 'nt_mex'
      ? existing.worldCup
      : freshWorldCup,
    remappedContinentals,
    []
  );

  const rawSchedule =
    existing.seasonSchedule && existing.seasonSchedule.length > 0
      ? (existing.systemVersion || 0) < 16
        ? existing.seasonSchedule.filter((f) => f.played || f.competition !== 'friendly')
        : existing.seasonSchedule
      : [
          ...generateSeasonFriendliesAndFinalissima(seasonYear, preBusy),
          ...generateSeasonFriendliesAndFinalissima(seasonYear + 1, preBusy),
        ];

  const remappedRawSchedule = remapFixtureDatesIfUnplayed(rawSchedule);
  const generatedCurrentAndNext = [
    ...generateSeasonFriendliesAndFinalissima(seasonYear, preBusy),
    ...generateSeasonFriendliesAndFinalissima(seasonYear + 1, preBusy),
  ];
  const existingScheduleIds = new Set(remappedRawSchedule.map((f) => f.id));
  const combinedRawSchedule = [
    ...remappedRawSchedule,
    ...generatedCurrentAndNext.filter((gf) => !existingScheduleIds.has(gf.id)),
  ];

  const busy = buildOfficialBusyTeamDateSet(
    remappedQualifiers,
    remappedContQualifiers,
    existing.worldCup?.year === 2026 && existing.worldCup.fixtures?.[0]?.homeTeamId === 'nt_mex'
      ? existing.worldCup
      : freshWorldCup,
    remappedContinentals,
    combinedRawSchedule
  );
  const seasonSchedule = combinedRawSchedule.filter(
    (f) =>
      f.played ||
      f.competition !== 'friendly' ||
      !f.date ||
      (!busy.has(`${f.homeTeamId}_${f.date}`) && !busy.has(`${f.awayTeamId}_${f.date}`))
  );

  const mergedRankingPoints = {
    ...createDefaultRankingMap(),
    ...(existing.fifaRankingPoints || {}),
  };
  const icUpgradedRes = advanceIntercontinentalWcPlayoffStages(
    remappedQualifiers,
    mergedRankingPoints,
    seasonSchedule,
    false
  );
  const finalUpgradedQualifiers = icUpgradedRes.qualifiers;
  const finalUpgradedSchedule = icUpgradedRes.cleanedSchedule || seasonSchedule;

  const merged: NationalTeamState = {
    ...existing,
    systemVersion: 17,
    userTeamId: migratedTeamId,
    isUserCoach: Boolean(migratedTeamId),
    warningsIssued: existing.warningsIssued ?? 0,
    pendingNationalOffers: existing.pendingNationalOffers || [],
    teamCoaches: ensureNationalTeamCoachesMap(existing),
    nationalStints: existing.nationalStints || [],
    lastDismissal: existing.lastDismissal ?? null,
    formation,
    captainPlayerId,
    calledUpPlayerIds: nextCalledUp,
    starterPlayerIds: alignedStarters,
    fifaRankingPoints: mergedRankingPoints,
    fifaRankingMeta: existing.fifaRankingMeta || {},
    virtualPlayers: enrichedVirtualPlayers,
    qualifiers: finalUpgradedQualifiers,
    completedQualifiersArchive:
      existing.completedQualifiersArchive || generateWorldCupQualifiersCycle(2026, true),
    continentalQualifiers: remappedContQualifiers,
    completedContinentalQualifiersArchive,
    worldCup:
      existing.worldCup?.year === 2026 &&
      existing.worldCup.fixtures?.[0]?.homeTeamId === 'nt_mex'
        ? existing.worldCup
        : freshWorldCup,
    pastWorldCups: existing.pastWorldCups || [...HISTORICAL_WORLD_CUPS],
    continentals: remappedContinentals,
    seasonSchedule: finalUpgradedSchedule,
  };
  merged.windows = syncLegacyWindowsFromTeamFixtures(merged, seasonYear);
  return merged;
}

/**
 * Re-validates the active Seleção's 26-man call-up after real-life player nationalities
 * are updated across clubs, removing any ineligible player and keeping position order (GOL -> ATA).
 */
export function resyncNationalTeamAfterNationalityUpdate(
  existing: NationalTeamState | undefined,
  clubs: Club[],
  seasonYear: number
): NationalTeamState {
  const nt = ensureUpgradedNationalTeamState(existing, clubs, seasonYear);
  const focusTeamId = nt.userTeamId || 'nt_bra';
  const formation: FormationType = nt.formation || '4-3-3';
  const pool = resolveNationalTeamPlayerPool(clubs, nt.virtualPlayers, focusTeamId);
  const poolMap = new Map(pool.map((p) => [p.id, p]));

  const validCalled = nt.calledUpPlayerIds.filter((id) => poolMap.has(id));
  const optimal = selectOptimalSelecaoSquad(clubs, focusTeamId, nt.virtualPlayers, formation);

  const targetCount = Math.max(
    Math.min(nt.calledUpPlayerIds.length || MAX_SELECAO_SQUAD_SIZE, MAX_SELECAO_SQUAD_SIZE),
    validCalled.length < nt.calledUpPlayerIds.length ? MAX_SELECAO_SQUAD_SIZE : validCalled.length
  );

  for (const optId of optimal.calledUpPlayerIds) {
    if (validCalled.length >= targetCount) break;
    if (!validCalled.includes(optId)) {
      validCalled.push(optId);
    }
  }

  let nextStarters = nt.starterPlayerIds.filter((id) => validCalled.includes(id));
  if (nextStarters.length < 11) {
    const calledObjs = validCalled
      .map((id) => poolMap.get(id))
      .filter((p): p is ResolvedNationalPlayer => Boolean(p));
    nextStarters = fitPlayersToSelecaoFormation(calledObjs, formation);
  }

  const sortedCalled = sortNationalPlayerIdsByPosition(validCalled, pool, nextStarters);
  const nextCaptain =
    nt.captainPlayerId && sortedCalled.includes(nt.captainPlayerId)
      ? nt.captainPlayerId
      : optimal.captainPlayerId || nextStarters[0];

  const unchanged =
    sortedCalled.length === nt.calledUpPlayerIds.length &&
    sortedCalled.every((id, i) => id === nt.calledUpPlayerIds[i]) &&
    nextStarters.length === nt.starterPlayerIds.length &&
    nextStarters.every((id, i) => id === nt.starterPlayerIds[i]) &&
    nextCaptain === nt.captainPlayerId;

  if (unchanged) return nt;

  return {
    ...nt,
    calledUpPlayerIds: sortedCalled,
    starterPlayerIds: nextStarters,
    captainPlayerId: nextCaptain,
  };
}

function recordWorldCupInArchiveIfCompleted(
  wc: NationalTournamentEdition | undefined,
  pastWorldCups: PastWorldCupRecord[]
): PastWorldCupRecord[] {
  if (!wc || !wc.championTeamId || pastWorldCups.some((p) => p.year === wc.year)) {
    return pastWorldCups;
  }
  const finalFix = wc.fixtures.find((f) => f.phase === 'Grande Final');
  const scoreStr =
    finalFix && finalFix.homeScore !== null && finalFix.awayScore !== null
      ? finalFix.penaltiesHome !== undefined
        ? `${finalFix.homeScore} x ${finalFix.awayScore} (${finalFix.penaltiesHome}–${finalFix.penaltiesAway} pen)`
        : `${finalFix.homeScore} x ${finalFix.awayScore}`
      : 'Final Oficial';
  return [
    {
      year: wc.year,
      host: wc.hostName,
      championTeamId: wc.championTeamId,
      runnerUpTeamId: wc.runnerUpTeamId || 'nt_arg',
      scoreLabel: scoreStr,
    },
    ...pastWorldCups,
  ];
}

/**
 * Ensures international competitions (Copa do Mundo every 4 years in 2026/2030/2034...,
 * Continental Cups & Nations League every 4 years in 2028/2032/2036..., Copa Ouro in 2027/2031...,
 * WC Qualifiers & Continental Qualifiers, and FIFA Window friendlies) are initialized for `calendarYear`.
 */
export function ensureNationalTeamCalendarYear(
  nt: NationalTeamState,
  clubs: Club[],
  calendarYear: number
): NationalTeamState {
  let pastWorldCups = recordWorldCupInArchiveIfCompleted(
    nt.worldCup,
    [...(nt.pastWorldCups || HISTORICAL_WORLD_CUPS)]
  );
  let worldCup = nt.worldCup!;
  let qualifiers = nt.qualifiers!;
  let completedQualifiersArchive = nt.completedQualifiersArchive;
  let continentalQualifiers =
    nt.continentalQualifiers ||
    generateContinentalQualifiersCycle(getNextContinentalCycleYear(calendarYear), false);
  let completedContinentalQualifiersArchive = nt.completedContinentalQualifiersArchive;
  let changed = pastWorldCups.length !== (nt.pastWorldCups || []).length || !nt.continentalQualifiers;

  // World Cup every 4 years: 2026, 2030, 2034... (`calendarYear % 4 === 2`)
  if (calendarYear % 4 === 2 && (!worldCup || worldCup.year < calendarYear)) {
    const wc48 = resolveWorldCup48QualifiedFromQualifiers(qualifiers, nt.fifaRankingPoints);
    worldCup = generateWorldCupEdition(calendarYear, wc48, false);
    // Só arquiva e gera o ciclo seguinte (+4 anos) se não houver Play-Off UEFA (ou repescagem) pendente em Março do ano da Copa!
    const hasPendingCurrentWcQuals =
      qualifiers &&
      qualifiers.targetWorldCupYear === calendarYear &&
      (qualifiers.conmebolFixtures.some((f) => !f.played) ||
        (qualifiers.otherConfedFixtures || []).some((f) => !f.played));
    if (!hasPendingCurrentWcQuals) {
      completedQualifiersArchive = qualifiers;
      qualifiers = generateWorldCupQualifiersCycle(calendarYear + 4, false);
    }
    if (continentalQualifiers.targetContinentalYear < calendarYear + 2) {
      completedContinentalQualifiersArchive = continentalQualifiers;
      continentalQualifiers = generateContinentalQualifiersCycle(calendarYear + 2, false);
    }
    changed = true;
  }

  // Após o encerramento da Copa do Mundo do ciclo atual (ou virada de ano posterior), arquiva as eliminatórias e abre o ciclo seguinte (+4)
  if (
    qualifiers &&
    (calendarYear > qualifiers.targetWorldCupYear ||
      (worldCup &&
        worldCup.year === qualifiers.targetWorldCupYear &&
        worldCup.status === 'COMPLETED'))
  ) {
    completedQualifiersArchive = qualifiers;
    qualifiers = generateWorldCupQualifiersCycle(qualifiers.targetWorldCupYear + 4, false);
    changed = true;
  }

  const defaults = createInitialContinentalsRecord(calendarYear);
  let continentals: Record<ContinentalCompId, NationalTournamentEdition> = {
    copa_america: nt.continentals?.copa_america || defaults.copa_america,
    eurocopa: nt.continentals?.eurocopa || defaults.eurocopa,
    copa_africana: nt.continentals?.copa_africana || defaults.copa_africana,
    copa_asia: nt.continentals?.copa_asia || defaults.copa_asia,
    copa_oceania: nt.continentals?.copa_oceania || defaults.copa_oceania,
    copa_ouro: nt.continentals?.copa_ouro || defaults.copa_ouro,
    nations_league: nt.continentals?.nations_league || defaults.nations_league,
  };

  // Copa Ouro CONCACAF — ciclo oficial bienal em todos os anos ímpares (2027, 2029, 2031, 2033, 2035, 2037)
  if (calendarYear >= 2027 && calendarYear % 2 === 1 && continentals.copa_ouro.year < calendarYear) {
    continentals = {
      ...continentals,
      copa_ouro: generateContinentalEdition('copa_ouro', calendarYear, false),
    };
    changed = true;
  }

  // UEFA Nations League — ciclo oficial bienal em todos os anos pares (2026/27 transição -> 2028/29, 2030/31, 2032/33, 2034/35, 2036/37, 2038/39 reformada em 3 Ligas)
  if (calendarYear >= 2028 && calendarYear % 2 === 0 && continentals.nations_league.year < calendarYear) {
    continentals = {
      ...continentals,
      nations_league: generateContinentalEdition('nations_league', calendarYear, false),
    };
    changed = true;
  }

  // Major Continental Cups (Copa América, Eurocopa 24 sel., CAN 32 sel., Ásia 32 sel., Oceania 8 sel.) every 4 years: 2028, 2032, 2036...
  if (calendarYear >= 2028 && calendarYear % 4 === 0) {
    const needCopaAmerica = continentals.copa_america.year < calendarYear;
    const needEurocopa = continentals.eurocopa.year < calendarYear;
    const needCopaAfricana = continentals.copa_africana.year < calendarYear;
    const needCopaAsia = continentals.copa_asia.year < calendarYear;
    const needCopaOceania = continentals.copa_oceania.year < calendarYear;

    if (
      needCopaAmerica ||
      needEurocopa ||
      needCopaAfricana ||
      needCopaAsia ||
      needCopaOceania
    ) {
      const uefaQuals = continentalQualifiers.tracks?.UEFA?.qualifiedTeamIds;
      const cafQuals = continentalQualifiers.tracks?.CAF?.qualifiedTeamIds;
      const afcQuals = continentalQualifiers.tracks?.AFC?.qualifiedTeamIds;
      const ofcQuals = continentalQualifiers.tracks?.OFC?.qualifiedTeamIds;
      const concacafGuests = continentalQualifiers.tracks?.CONCACAF?.qualifiedTeamIds;
      const conmebolAll = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'CONMEBOL').map(
        (t) => t.id
      );
      const copaAmerica16 =
        calendarYear === 2028
          ? [...COPA_AMERICA_2028_OFFICIAL_PARTICIPANTS]
          : concacafGuests && concacafGuests.length >= 5
          ? [...conmebolAll, ...concacafGuests.slice(0, 5), 'nt_rus']
          : [...COPA_AMERICA_2028_OFFICIAL_PARTICIPANTS];

      completedContinentalQualifiersArchive = continentalQualifiers;
      continentals = {
        ...continentals,
        copa_america: needCopaAmerica
          ? generateContinentalEdition('copa_america', calendarYear, false, copaAmerica16)
          : continentals.copa_america,
        eurocopa: needEurocopa
          ? generateContinentalEdition('eurocopa', calendarYear, false, uefaQuals)
          : continentals.eurocopa,
        copa_africana: needCopaAfricana
          ? generateContinentalEdition('copa_africana', calendarYear, false, cafQuals)
          : continentals.copa_africana,
        copa_asia: needCopaAsia
          ? generateContinentalEdition('copa_asia', calendarYear, false, afcQuals)
          : continentals.copa_asia,
        copa_oceania: needCopaOceania
          ? generateContinentalEdition('copa_oceania', calendarYear, false, ofcQuals)
          : continentals.copa_oceania,
      };
      changed = true;
    }
  }

  // Ensure FIFA window friendlies exist for `calendarYear` and `calendarYear + 1` without colliding with official fixtures
  const existingSchedule = nt.seasonSchedule || [];
  const officialBusyOnly = buildOfficialBusyTeamDateSet(
    qualifiers,
    continentalQualifiers,
    worldCup,
    continentals,
    [],
    completedQualifiersArchive,
    completedContinentalQualifiersArchive
  );
  const sanitizedExisting = existingSchedule.filter(
    (f) =>
      f.played ||
      f.competition !== 'friendly' ||
      !f.date ||
      (!officialBusyOnly.has(`${f.homeTeamId}_${f.date}`) &&
        !officialBusyOnly.has(`${f.awayTeamId}_${f.date}`))
  );

  const existingIds = new Set(sanitizedExisting.map((f) => f.id));
  const busyTeamDateSet = buildOfficialBusyTeamDateSet(
    qualifiers,
    continentalQualifiers,
    worldCup,
    continentals,
    sanitizedExisting,
    completedQualifiersArchive,
    completedContinentalQualifiersArchive
  );
  sanitizedExisting.forEach((f) => {
    if (f.date) {
      busyTeamDateSet.add(`${f.homeTeamId}_${f.date}`);
      busyTeamDateSet.add(`${f.awayTeamId}_${f.date}`);
    }
  });
  const candidateYears = [calendarYear, calendarYear + 1];
  const additions: InternationalMatchFixture[] = [];
  for (const cy of candidateYears) {
    const generated = generateSeasonFriendliesAndFinalissima(cy, busyTeamDateSet);
    for (const gf of generated) {
      if (existingIds.has(gf.id)) continue;
      if (
        gf.competition === 'friendly' &&
        gf.date &&
        (busyTeamDateSet.has(`${gf.homeTeamId}_${gf.date}`) ||
          busyTeamDateSet.has(`${gf.awayTeamId}_${gf.date}`))
      ) {
        continue;
      }
      existingIds.add(gf.id);
      if (gf.date) {
        busyTeamDateSet.add(`${gf.homeTeamId}_${gf.date}`);
        busyTeamDateSet.add(`${gf.awayTeamId}_${gf.date}`);
      }
      additions.push(gf);
    }
  }

  let seasonSchedule = existingSchedule;
  if (additions.length > 0 || sanitizedExisting.length !== existingSchedule.length) {
    seasonSchedule = [
      ...sanitizedExisting.filter((f) => f.seasonYear >= calendarYear - 1),
      ...additions,
    ];
    changed = true;
  }

  if (!changed) return nt;

  // Validate 26-man squad IDs against current club rosters
  const focusTeamId = nt.userTeamId || 'nt_bra';
  const formation = nt.formation || '4-3-3';
  const freshSquad = selectOptimalSelecaoSquad(clubs, focusTeamId, nt.virtualPlayers, formation);
  const pool = resolveNationalTeamPlayerPool(clubs, nt.virtualPlayers, focusTeamId);
  const validIds = new Set(pool.map((p) => p.id));

  let nextCalledUp = nt.isUserCoach
    ? nt.calledUpPlayerIds.filter((id) => validIds.has(id))
    : freshSquad.calledUpPlayerIds;
  if (nextCalledUp.length < MAX_SELECAO_SQUAD_SIZE) {
    for (const id of freshSquad.calledUpPlayerIds) {
      if (nextCalledUp.length >= MAX_SELECAO_SQUAD_SIZE) break;
      if (!nextCalledUp.includes(id)) nextCalledUp.push(id);
    }
  }

  let nextStarters = nt.isUserCoach
    ? nt.starterPlayerIds.filter((id) => nextCalledUp.includes(id))
    : freshSquad.starterPlayerIds;
  if (nextStarters.length < 11) {
    for (const id of nextCalledUp) {
      if (nextStarters.length >= 11) break;
      if (!nextStarters.includes(id)) nextStarters.push(id);
    }
  }
  nextCalledUp = sortNationalPlayerIdsByPosition(nextCalledUp, pool, nextStarters);

  const nextCaptain =
    nt.captainPlayerId && nextCalledUp.includes(nt.captainPlayerId)
      ? nt.captainPlayerId
      : freshSquad.captainPlayerId || nextStarters[0];

  const updated: NationalTeamState = {
    ...nt,
    formation,
    captainPlayerId: nextCaptain,
    calledUpPlayerIds: nextCalledUp,
    starterPlayerIds: nextStarters,
    qualifiers,
    completedQualifiersArchive,
    continentalQualifiers,
    completedContinentalQualifiersArchive,
    worldCup,
    pastWorldCups,
    continentals,
    seasonSchedule,
  };
  updated.windows = syncLegacyWindowsFromTeamFixtures(updated, calendarYear);
  return updated;
}

export function refreshNationalTeamForNewSeason(
  prevNationalTeam: NationalTeamState | undefined,
  clubs: Club[],
  nextYear: number
): NationalTeamState {
  const prev = ensureUpgradedNationalTeamState(prevNationalTeam, clubs, nextYear - 1);
  const rolled = ensureNationalTeamCalendarYear(prev, clubs, nextYear);

  const focusTeamId = rolled.userTeamId || 'nt_bra';
  const formation = rolled.formation || '4-3-3';
  const freshSquad = selectOptimalSelecaoSquad(clubs, focusTeamId, rolled.virtualPlayers, formation);
  const pool = resolveNationalTeamPlayerPool(clubs, rolled.virtualPlayers, focusTeamId);
  const validIds = new Set(pool.map((p) => p.id));

  let nextCalledUp = rolled.isUserCoach
    ? rolled.calledUpPlayerIds.filter((id) => validIds.has(id))
    : freshSquad.calledUpPlayerIds;

  if (nextCalledUp.length < MAX_SELECAO_SQUAD_SIZE) {
    for (const id of freshSquad.calledUpPlayerIds) {
      if (nextCalledUp.length >= MAX_SELECAO_SQUAD_SIZE) break;
      if (!nextCalledUp.includes(id)) nextCalledUp.push(id);
    }
  }

  let nextStarters = rolled.isUserCoach
    ? rolled.starterPlayerIds.filter((id) => nextCalledUp.includes(id))
    : freshSquad.starterPlayerIds;

  if (nextStarters.length < 11) {
    for (const id of nextCalledUp) {
      if (nextStarters.length >= 11) break;
      if (!nextStarters.includes(id)) nextStarters.push(id);
    }
  }

  nextCalledUp = sortNationalPlayerIdsByPosition(nextCalledUp, pool, nextStarters);

  const nextCaptain =
    rolled.captainPlayerId && nextCalledUp.includes(rolled.captainPlayerId)
      ? rolled.captainPlayerId
      : freshSquad.captainPlayerId || nextStarters[0];

  const updated: NationalTeamState = {
    ...rolled,
    formation,
    captainPlayerId: nextCaptain,
    calledUpPlayerIds: nextCalledUp,
    starterPlayerIds: nextStarters,
  };
  updated.windows = syncLegacyWindowsFromTeamFixtures(updated, nextYear);
  return updated;
}

// ============================================================================
// MATCH EXECUTION & TOURNAMENT PROGRESSION ENGINE
// ============================================================================

function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface FifaMatchPointsDeltaResult {
  homeDelta: number;
  awayDelta: number;
  newHomePoints: number;
  newAwayPoints: number;
  importanceWeight: number;
  expectedHome: number;
  expectedAway: number;
}

export function calculateFifaMatchPointsDelta(
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  currentPointsMap: Record<string, number>,
  competition: string,
  phase?: string,
  penaltiesHome?: number,
  penaltiesAway?: number,
  winnerTeamId?: string
): FifaMatchPointsDeltaResult {
  const homeCatalog = getNationalTeamById(homeTeamId);
  const awayCatalog = getNationalTeamById(awayTeamId);
  const pHome = currentPointsMap[homeTeamId] ?? homeCatalog.fifaPoints ?? 1500;
  const pAway = currentPointsMap[awayTeamId] ?? awayCatalog.fifaPoints ?? 1500;

  // FIFA SUM algorithm Match Importance (I)
  // 15 = Amistosos em janelas FIFA
  // 20 = Finalíssima Intercontinental
  // 25 = Eliminatórias da Copa do Mundo
  // 35 = Copas Continentais (fase de grupos e oitavas)
  // 40 = Copas Continentais (quartas, semis e final)
  // 50 = Copa do Mundo (fase de grupos, 16-avos e oitavas)
  // 60 = Copa do Mundo (quartas, semifinais, 3º lugar e final)
  let I = 15;
  const isKnockout = Boolean(
    phase &&
      (phase.includes('Quartas') ||
        phase.includes('Semi') ||
        phase.includes('Final') ||
        phase.includes('Oitavas') ||
        phase.includes('16-avos') ||
        phase.includes('3º'))
  );
  const isDeepKnockout = Boolean(
    phase &&
      (phase.includes('Quartas') ||
        phase.includes('Semi') ||
        phase.includes('Final') ||
        phase.includes('3º'))
  );

  if (competition === 'world_cup') {
    I = isDeepKnockout ? 60 : 50;
  } else if (competition === 'wc_qualifiers' || competition === 'continental_qualifiers') {
    I = 25;
  } else if (
    competition === 'copa_america' ||
    competition === 'eurocopa' ||
    competition === 'copa_africana' ||
    competition === 'copa_asia' ||
    competition === 'copa_oceania' ||
    competition === 'copa_ouro'
  ) {
    I = isDeepKnockout ? 40 : 35;
  } else if (competition === 'nations_league') {
    I = isKnockout ? 35 : 25;
  } else if (competition === 'finalissima') {
    I = 20;
  } else {
    I = 15;
  }

  // Expected outcome: We = 1 / (10^(- (P_team - P_opp) / 600) + 1)
  const diffHome = (pHome - pAway) / 600;
  const expectedHome = 1 / (Math.pow(10, -diffHome) + 1);
  const expectedAway = 1 - expectedHome;

  // Actual outcome (W):
  // 1.0 = vitória normal
  // 0.75 = vitória nos pênaltis
  // 0.5 = empate (ou derrota nos pênaltis)
  // 0.0 = derrota normal
  let wHome = 0.5;
  let wAway = 0.5;

  const homeWonPen =
    winnerTeamId === homeTeamId ||
    (penaltiesHome !== undefined && penaltiesAway !== undefined && penaltiesHome > penaltiesAway);
  const awayWonPen =
    winnerTeamId === awayTeamId ||
    (penaltiesHome !== undefined && penaltiesAway !== undefined && penaltiesAway > penaltiesHome);

  if (homeScore > awayScore) {
    wHome = 1.0;
    wAway = 0.0;
  } else if (awayScore > homeScore) {
    wHome = 0.0;
    wAway = 1.0;
  } else if (homeWonPen) {
    wHome = 0.75;
    wAway = 0.5;
  } else if (awayWonPen) {
    wHome = 0.5;
    wAway = 0.75;
  } else {
    wHome = 0.5;
    wAway = 0.5;
  }

  let deltaHome = I * (wHome - expectedHome);
  let deltaAway = I * (wAway - expectedAway);

  // Regra oficial FIFA para fases eliminatórias de competições finais:
  // Se uma equipe perde no mata-mata e o delta for negativo, não há redução de pontos
  if (
    isKnockout &&
    (competition === 'world_cup' ||
      competition === 'copa_america' ||
      competition === 'eurocopa' ||
      competition === 'copa_africana' ||
      competition === 'copa_asia' ||
      competition === 'copa_oceania' ||
      competition === 'copa_ouro' ||
      competition === 'nations_league')
  ) {
    if ((homeScore < awayScore || awayWonPen) && deltaHome < 0) {
      deltaHome = 0;
    }
    if ((awayScore < homeScore || homeWonPen) && deltaAway < 0) {
      deltaAway = 0;
    }
  }

  // Arredondar para 1 casa decimal
  deltaHome = Math.round(deltaHome * 10) / 10;
  deltaAway = Math.round(deltaAway * 10) / 10;

  const newHomePoints = Math.max(800, Math.round((pHome + deltaHome) * 10) / 10);
  const newAwayPoints = Math.max(800, Math.round((pAway + deltaAway) * 10) / 10);

  return {
    homeDelta: deltaHome,
    awayDelta: deltaAway,
    newHomePoints,
    newAwayPoints,
    importanceWeight: I,
    expectedHome,
    expectedAway,
  };
}

export function getSortedFifaRankings(
  ptsMap: Record<string, number>
): { rank: number; teamId: string; points: number }[] {
  return [...NATIONAL_TEAMS_CATALOG]
    .map((team) => ({
      teamId: team.id,
      points: ptsMap[team.id] ?? team.fifaPoints ?? 1500,
      strength: team.strength,
    }))
    .sort((a, b) => b.points - a.points || b.strength - a.strength)
    .map((item, idx) => ({
      rank: idx + 1,
      teamId: item.teamId,
      points: item.points,
    }));
}

export interface UpdateFixtureInNationalStateResult {
  nextNt: NationalTeamState;
  justCrownedTournament?: NationalTournamentEdition;
  rankingDeltaHome?: number;
  rankingDeltaAway?: number;
  oldHomeRank?: number;
  newHomeRank?: number;
  oldAwayRank?: number;
  newAwayRank?: number;
}

function updateFixtureInNationalState(
  nt: NationalTeamState,
  updatedFix: InternationalMatchFixture,
  seasonYear: number
): UpdateFixtureInNationalStateResult {
  let nextNt = { ...nt };
  let justCrownedTournament: NationalTournamentEdition | undefined;
  let rankingDeltaHome: number | undefined;
  let rankingDeltaAway: number | undefined;
  let oldHomeRank: number | undefined;
  let newHomeRank: number | undefined;
  let oldAwayRank: number | undefined;
  let newAwayRank: number | undefined;

  // Update FIFA Ranking points via official dynamic FIFA SUM formula
  if (updatedFix.played && updatedFix.homeScore !== null && updatedFix.awayScore !== null) {
    const rankMap = { ...(nextNt.fifaRankingPoints || createDefaultRankingMap()) };
    const oldRankings = getSortedFifaRankings(rankMap);
    oldHomeRank = oldRankings.find((r) => r.teamId === updatedFix.homeTeamId)?.rank || 1;
    oldAwayRank = oldRankings.find((r) => r.teamId === updatedFix.awayTeamId)?.rank || 1;
    const oldHomePts = rankMap[updatedFix.homeTeamId] ?? 1500;
    const oldAwayPts = rankMap[updatedFix.awayTeamId] ?? 1500;

    const deltaRes = calculateFifaMatchPointsDelta(
      updatedFix.homeTeamId,
      updatedFix.awayTeamId,
      updatedFix.homeScore,
      updatedFix.awayScore,
      rankMap,
      updatedFix.competition,
      updatedFix.phase,
      updatedFix.penaltiesHome,
      updatedFix.penaltiesAway,
      updatedFix.winnerTeamId
    );

    rankMap[updatedFix.homeTeamId] = deltaRes.newHomePoints;
    rankMap[updatedFix.awayTeamId] = deltaRes.newAwayPoints;
    rankingDeltaHome = deltaRes.homeDelta;
    rankingDeltaAway = deltaRes.awayDelta;

    const newRankings = getSortedFifaRankings(rankMap);
    newHomeRank = newRankings.find((r) => r.teamId === updatedFix.homeTeamId)?.rank || 1;
    newAwayRank = newRankings.find((r) => r.teamId === updatedFix.awayTeamId)?.rank || 1;

    const homeCatalog = getNationalTeamById(updatedFix.homeTeamId);
    const awayCatalog = getNationalTeamById(updatedFix.awayTeamId);

    nextNt.fifaRankingPoints = rankMap;
    nextNt.fifaRankingMeta = {
      ...(nextNt.fifaRankingMeta || {}),
      [updatedFix.homeTeamId]: {
        previousPoints: oldHomePts,
        previousRank: oldHomeRank,
        lastDelta: deltaRes.homeDelta,
        lastMatchDate: updatedFix.date || `${seasonYear}-06-15`,
        lastMatchSummary: `${updatedFix.homeScore} x ${updatedFix.awayScore} vs ${awayCatalog.name}`,
      },
      [updatedFix.awayTeamId]: {
        previousPoints: oldAwayPts,
        previousRank: oldAwayRank,
        lastDelta: deltaRes.awayDelta,
        lastMatchDate: updatedFix.date || `${seasonYear}-06-15`,
        lastMatchSummary: `${updatedFix.awayScore} x ${updatedFix.homeScore} vs ${homeCatalog.name}`,
      },
    };
  }

  // 1. Season Schedule (Friendlies / Finalíssima)
  if ((nextNt.seasonSchedule || []).some((f) => f.id === updatedFix.id)) {
    nextNt.seasonSchedule = (nextNt.seasonSchedule || []).map((f) =>
      f.id === updatedFix.id ? updatedFix : f
    );
  }

  // 2. World Cup Qualifiers
  if (nextNt.qualifiers) {
    let qChanged = false;
    let conmebolFixtures = nextNt.qualifiers.conmebolFixtures;
    let otherConfedFixtures = nextNt.qualifiers.otherConfedFixtures;

    if (conmebolFixtures.some((f) => f.id === updatedFix.id)) {
      conmebolFixtures = conmebolFixtures.map((f) => (f.id === updatedFix.id ? updatedFix : f));
      qChanged = true;
    } else if (otherConfedFixtures.some((f) => f.id === updatedFix.id)) {
      otherConfedFixtures = otherConfedFixtures.map((f) =>
        f.id === updatedFix.id ? updatedFix : f
      );
      qChanged = true;
    }

    if (qChanged) {
      const conmebolIds = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'CONMEBOL').map(
        (t) => t.id
      );
      const otherConfedStandings = { ...nextNt.qualifiers.otherConfedStandings };
      (['UEFA', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as const).forEach((conf) => {
        const prevRows = otherConfedStandings[conf] || [];
        const gMap: Record<string, string> = {};
        prevRows.forEach((r) => {
          if (r.group) gMap[r.teamId] = r.group;
        });
        const confFixes = otherConfedFixtures.filter(
          (f) => f.competitionName.includes(`Eliminatórias ${conf}`) && Boolean(f.group)
        );
        otherConfedStandings[conf] = recomputeNationalStandings(
          prevRows.map((r) => r.teamId),
          confFixes,
          gMap
        );
      });

      const maxPlayedQRound = conmebolFixtures
        .filter((f) => f.played)
        .reduce((mx, f) => Math.max(mx, f.qualifiersRound || 1), 1);

      const baseQualifiers: WorldCupQualifiersCycle = {
        ...nextNt.qualifiers,
        currentMatchday: maxPlayedQRound,
        conmebolFixtures,
        conmebolStandings: recomputeNationalStandings(conmebolIds, conmebolFixtures),
        otherConfedFixtures,
        otherConfedStandings,
      };
      const afcPlayoffRes = advanceAfcWcPlayoffStages(baseQualifiers, nextNt.seasonSchedule, false);
      const cafPlayoffRes = advanceCafWcPlayoffStages(
        afcPlayoffRes.qualifiers,
        afcPlayoffRes.cleanedSchedule ?? nextNt.seasonSchedule,
        false
      );
      const uefaPlayoffRes = advanceUefaWcPlayoffStages(
        cafPlayoffRes.qualifiers,
        cafPlayoffRes.cleanedSchedule ?? afcPlayoffRes.cleanedSchedule ?? nextNt.seasonSchedule,
        false,
        nextNt.fifaRankingPoints
      );
      const icPlayoffRes = advanceIntercontinentalWcPlayoffStages(
        uefaPlayoffRes.qualifiers,
        nextNt.fifaRankingPoints,
        uefaPlayoffRes.cleanedSchedule ??
          cafPlayoffRes.cleanedSchedule ??
          afcPlayoffRes.cleanedSchedule ??
          nextNt.seasonSchedule,
        false
      );
      nextNt.qualifiers = icPlayoffRes.qualifiers;
      if (icPlayoffRes.cleanedSchedule) {
        nextNt.seasonSchedule = icPlayoffRes.cleanedSchedule;
      } else if (uefaPlayoffRes.cleanedSchedule) {
        nextNt.seasonSchedule = uefaPlayoffRes.cleanedSchedule;
      } else if (cafPlayoffRes.cleanedSchedule) {
        nextNt.seasonSchedule = cafPlayoffRes.cleanedSchedule;
      } else if (afcPlayoffRes.cleanedSchedule) {
        nextNt.seasonSchedule = afcPlayoffRes.cleanedSchedule;
      }

      // Se todas as partidas das Eliminatórias da Copa (incluindo Play-Off UEFA e Repescagem Intercontinental em Março do ano da Copa) terminaram
      // e a Copa do Mundo do ano ainda não iniciou nem teve sorteio manual, atualiza os 48 participantes finais!
      const allQualsDone =
        nextNt.qualifiers.conmebolFixtures.every((f) => f.played) &&
        (nextNt.qualifiers.otherConfedFixtures || []).every((f) => f.played);
      const drawnSetWc = new Set(nextNt.drawnNationalTournaments || []);
      if (
        allQualsDone &&
        nextNt.worldCup &&
        nextNt.worldCup.year === nextNt.qualifiers.targetWorldCupYear &&
        !drawnSetWc.has(nextNt.worldCup.id) &&
        nextNt.worldCup.fixtures.every((f) => !f.played)
      ) {
        const finalWc48 = resolveWorldCup48QualifiedFromQualifiers(
          nextNt.qualifiers,
          nextNt.fifaRankingPoints
        );
        nextNt.worldCup = generateWorldCupEdition(
          nextNt.qualifiers.targetWorldCupYear,
          finalWc48,
          false
        );
      }
    }
  }

  // 2b. Continental Qualifiers
  if (nextNt.continentalQualifiers) {
    const nextTracks = { ...nextNt.continentalQualifiers.tracks };
    let cqChanged = false;
    const targetContYr = nextNt.continentalQualifiers.targetContinentalYear;
    const completedTargetYears: { trackId: ContinentalQualifierTrackId; targetCompId: ContinentalCompId; qualifiedIds: string[] }[] = [];
    (Object.keys(nextTracks) as ContinentalQualifierTrackId[]).forEach((tId) => {
      const tr = nextTracks[tId];
      if (!tr || !tr.fixtures.some((f) => f.id === updatedFix.id)) return;
      cqChanged = true;
      const nextFixtures = tr.fixtures.map((f) => (f.id === updatedFix.id ? updatedFix : f));
      const gMap: Record<string, string> = {};
      tr.standings.forEach((r) => {
        if (r.group) gMap[r.teamId] = r.group;
      });
      const groupOnlyFixtures = nextFixtures.filter((f) => Boolean(f.group));
      const nextStandings = recomputeNationalStandings(
        tr.standings.map((r) => r.teamId),
        groupOnlyFixtures,
        gMap
      );
      let updatedTrack: ContinentalQualifiersTrack = {
        ...tr,
        fixtures: nextFixtures,
        standings: nextStandings,
        qualifiedTeamIds: computeContinentalTrackQualified(
          tId,
          nextStandings,
          targetContYr,
          nextFixtures
        ),
      };
      if (tId === 'UEFA') {
        const euroPoRes = advanceUefaEuroPlayoffStages(
          updatedTrack,
          targetContYr,
          nextNt.continentals?.nations_league,
          nextNt.seasonSchedule,
          false
        );
        updatedTrack = euroPoRes.track;
        if (euroPoRes.cleanedSchedule) {
          nextNt.seasonSchedule = euroPoRes.cleanedSchedule;
        }
      }
      nextTracks[tId] = updatedTrack;
      if (updatedTrack.fixtures.every((f) => f.played)) {
        completedTargetYears.push({
          trackId: tId,
          targetCompId: tr.targetCompId,
          qualifiedIds: updatedTrack.qualifiedTeamIds,
        });
      }
    });
    if (cqChanged) {
      const maxPlayedContRound = (Object.values(nextTracks) as ContinentalQualifiersTrack[])
        .flatMap((t) => t.fixtures)
        .filter((f) => f.played)
        .reduce((mx, f) => Math.max(mx, f.qualifiersRound || 1), 1);
      nextNt.continentalQualifiers = {
        ...nextNt.continentalQualifiers,
        currentRound: maxPlayedContRound,
        tracks: nextTracks,
      };
      // Se as eliminatórias terminaram no próprio ano do torneio (ex: AFC/UEFA em Março de 2028/32/36)
      // e a Copa Continental do ano ainda não teve nenhum jogo nem sorteio manual, atualiza os participantes finais!
      if (completedTargetYears.length > 0 && nextNt.continentals) {
        const drawnSet = new Set(nextNt.drawnNationalTournaments || []);
        const updatedContinentals = { ...nextNt.continentals };
        let contRefreshed = false;
        for (const item of completedTargetYears) {
          const ed = updatedContinentals[item.targetCompId];
          if (
            ed &&
            ed.year === targetContYr &&
            !drawnSet.has(ed.id) &&
            ed.fixtures.every((f) => !f.played)
          ) {
            updatedContinentals[item.targetCompId] = generateContinentalEdition(
              item.targetCompId,
              targetContYr,
              false,
              item.qualifiedIds
            );
            contRefreshed = true;
          }
        }
        if (contRefreshed) {
          nextNt.continentals = updatedContinentals;
        }
      }
    }
  }

  // 3. World Cup
  if (nextNt.worldCup && nextNt.worldCup.fixtures.some((f) => f.id === updatedFix.id)) {
    const wasCompleted = nextNt.worldCup.status === 'COMPLETED';
    const nextFixes = nextNt.worldCup.fixtures.map((f) =>
      f.id === updatedFix.id ? updatedFix : f
    );
    const advanced = advanceTournamentEditionStages({
      ...nextNt.worldCup,
      fixtures: nextFixes,
    });
    nextNt.worldCup = advanced;
    if (!wasCompleted && advanced.status === 'COMPLETED') {
      justCrownedTournament = advanced;
      nextNt.pastWorldCups = recordWorldCupInArchiveIfCompleted(
        advanced,
        [...(nextNt.pastWorldCups || HISTORICAL_WORLD_CUPS)]
      );
    }
  }

  // 4. Continental Tournaments
  if (nextNt.continentals) {
    const nextContinentals = { ...nextNt.continentals };
    (Object.keys(nextContinentals) as ContinentalCompId[]).forEach((cKey) => {
      const ed = nextContinentals[cKey];
      if (ed && ed.fixtures.some((f) => f.id === updatedFix.id)) {
        const wasCompleted = ed.status === 'COMPLETED';
        const prevFixCount = ed.fixtures.length;
        const nextFixes = ed.fixtures.map((f) => (f.id === updatedFix.id ? updatedFix : f));
        const advanced = advanceTournamentEditionStages({
          ...ed,
          fixtures: nextFixes,
        });
        nextContinentals[cKey] = advanced;
        if (!wasCompleted && advanced.status === 'COMPLETED') {
          justCrownedTournament = advanced;
        }
        // Quando a UEFA Nations League gera novos jogos de mata-mata (Quartas Ida/Volta ou Final Four):
        // 1) remove amistosos não jogados que colidam com as datas das Quartas/Final Four
        // 2) se as Eliminatórias da Euro do ano seguinte ainda não começaram, protege exatamente os 8 quadrifinalistas nos 6 grupos de 4 (A–F)!
        if (cKey === 'nations_league' && advanced.fixtures.length > prevFixCount) {
          const newKoFixes = advanced.fixtures.slice(prevFixCount);
          const busyKo = new Set<string>();
          newKoFixes.forEach((m) => {
            if (m.date) {
              busyKo.add(`${m.homeTeamId}_${m.date}`);
              busyKo.add(`${m.awayTeamId}_${m.date}`);
            }
          });
          if (nextNt.seasonSchedule) {
            nextNt.seasonSchedule = nextNt.seasonSchedule.filter(
              (f) =>
                f.played ||
                f.competition !== 'friendly' ||
                !f.date ||
                (!busyKo.has(`${f.homeTeamId}_${f.date}`) && !busyKo.has(`${f.awayTeamId}_${f.date}`))
            );
          }
          const qfLeg1s = newKoFixes.filter((m) => m.phase === 'Quartas de Final (Ida)');
          if (
            qfLeg1s.length === 4 &&
            nextNt.continentalQualifiers &&
            nextNt.continentalQualifiers.targetContinentalYear === advanced.year + 2 &&
            nextNt.continentalQualifiers.tracks?.UEFA &&
            nextNt.continentalQualifiers.tracks.UEFA.fixtures.every((f) => !f.played)
          ) {
            const qf8Ids = Array.from(
              new Set(qfLeg1s.flatMap((m) => [m.homeTeamId, m.awayTeamId]))
            );
            nextNt.continentalQualifiers = {
              ...nextNt.continentalQualifiers,
              tracks: {
                ...nextNt.continentalQualifiers.tracks,
                UEFA: buildUefaEuroQualifiersTrack(
                  nextNt.continentalQualifiers.targetContinentalYear,
                  false,
                  qf8Ids
                ),
              },
            };
          }
        }
      }
    });
    nextNt.continentals = nextContinentals;
  }

  nextNt.windows = syncLegacyWindowsFromTeamFixtures(nextNt, seasonYear);
  return {
    nextNt,
    justCrownedTournament,
    rankingDeltaHome,
    rankingDeltaAway,
    oldHomeRank,
    newHomeRank,
    oldAwayRank,
    newAwayRank,
  };
}

export interface CustomUserInternationalResult {
  myScore: number;
  opponentScore: number;
  myPenalties?: number;
  opponentPenalties?: number;
  highlights?: string[];
  scorersSummary?: string;
  playedSubIds?: string[];
  goalsByPlayerId?: Record<string, number>;
}

/**
 * Executes a National Team match for the coached Seleção (or Brazil when CPU-coached)
 * and updates player caps, goals, club FIFA solidarity compensation, tournament brackets & trophies.
 */
function executeTeamMatchAndRewards(
  state: GameSave,
  nt: NationalTeamState,
  targetFix: InternationalMatchFixture,
  focusTeamId: string,
  coachedByUser: boolean,
  customResult?: CustomUserInternationalResult
): {
  updatedClubs: Club[];
  updatedNationalTeam: NationalTeamState;
  inboxMessages: InboxMessage[];
  newTrophies: TrophyRecord[];
  reputationDelta: number;
  movementRecords: CoachMovementRecord[];
} {
  const myTeam = getNationalTeamById(focusTeamId);
  const isHome = targetFix.homeTeamId === focusTeamId;
  const oppId = isHome ? targetFix.awayTeamId : targetFix.homeTeamId;
  const oppTeam = getNationalTeamById(oppId);
  const isKnockout = isInternationalFixtureKnockout(targetFix);

  const pool = resolveNationalTeamPlayerPool(
    state.clubs,
    nt.virtualPlayers,
    focusTeamId,
    state.userClubId
  );
  const poolById = new Map(pool.map((p) => [p.id, p]));

  let activeCalledIds = nt.calledUpPlayerIds.filter((id) => poolById.has(id));
  let activeStarterIds = nt.starterPlayerIds.filter((id) => activeCalledIds.includes(id));

  if (!coachedByUser || activeCalledIds.length < MIN_SELECAO_SQUAD_SIZE) {
    const auto = selectOptimalSelecaoSquad(
      state.clubs,
      focusTeamId,
      nt.virtualPlayers,
      nt.formation || '4-3-3'
    );
    activeCalledIds = auto.calledUpPlayerIds;
    activeStarterIds = auto.starterPlayerIds;
  } else if (activeStarterIds.length < 11) {
    for (const id of activeCalledIds) {
      if (activeStarterIds.length >= 11) break;
      if (!activeStarterIds.includes(id)) activeStarterIds.push(id);
    }
  }

  const starters = activeStarterIds
    .map((id) => poolById.get(id))
    .filter((x): x is ResolvedNationalPlayer => Boolean(x));

  // Compute penalized effective OVR per tactical slot (or custom pitch position) for the 11 starters
  const slots = SELECAO_FORMATION_SLOTS[nt.formation || '4-3-3'] || SELECAO_FORMATION_SLOTS['4-3-3'];
  let effectiveOvrSum = 0;
  starters.forEach((s, idx) => {
    const customPos = nt.customPositions?.[s.id];
    if (customPos) {
      const inferred = inferTacticalZoneFromCoords(customPos.x, customPos.y);
      const fit = evaluateSelecaoSlotFit(
        s,
        inferred.role,
        customPos.code || inferred.code,
        customPos.label || inferred.label
      );
      effectiveOvrSum += fit.effectiveOverall;
      return;
    }
    const slot = slots[idx];
    if (!slot) {
      effectiveOvrSum += s.overall;
      return;
    }
    const fit = evaluateSelecaoSlotFit(s, slot.role, slot.code, slot.label);
    effectiveOvrSum += fit.effectiveOverall;
  });

  const avgMyOvr =
    starters.length > 0 ? effectiveOvrSum / starters.length : myTeam.strength;

  let myScore = 0;
  let oppScore = 0;
  let myPen: number | undefined;
  let oppPen: number | undefined;

  if (customResult) {
    myScore = customResult.myScore;
    oppScore = customResult.opponentScore;
    myPen = customResult.myPenalties;
    oppPen = customResult.opponentPenalties;
  } else {
    const neutral =
      targetFix.competition === 'world_cup' ||
      targetFix.competition === 'copa_america' ||
      targetFix.competition === 'eurocopa' ||
      targetFix.competition === 'copa_africana' ||
      targetFix.competition === 'copa_asia' ||
      targetFix.competition === 'copa_oceania' ||
      targetFix.competition === 'copa_ouro' ||
      targetFix.competition === 'finalissima' ||
      (targetFix.competition === 'nations_league' && !targetFix.group);
    const homeBonus = neutral ? 0 : isHome ? 2.1 : -1.0;

    let tacticAttackMod = 0;
    let tacticDefenseMod = 0;
    if (nt.tacticStyle === 'JOGO_BONITO_OFENSIVO') {
      tacticAttackMod = 0.35;
      tacticDefenseMod = 0.2;
    } else if (nt.tacticStyle === 'PRESSAO_ALTA') {
      tacticAttackMod = 0.25;
      tacticDefenseMod = 0.1;
    } else if (nt.tacticStyle === 'SOLIDEZ_TRANSICAO') {
      tacticAttackMod = -0.12;
      tacticDefenseMod = -0.28;
    }

    const strengthDiff = avgMyOvr + homeBonus - oppTeam.strength;
    const expMy = Math.max(0.5, 1.48 + strengthDiff * 0.105 + tacticAttackMod);
    const expOpp = Math.max(0.35, 1.15 - strengthDiff * 0.088 + tacticDefenseMod);
    myScore = samplePoissonGoals(expMy);
    oppScore = samplePoissonGoals(expOpp);

    if (myScore === oppScore && isKnockout) {
      const winPen = Math.random() < 0.52 + Math.max(-0.15, Math.min(0.15, strengthDiff * 0.015));
      myPen = winPen ? 5 : 4;
      oppPen = winPen ? 4 : 5;
    }
  }

  // Pick goal scorers & highlights (or apply exact live match scorers if provided!)
  const attackPool = starters.flatMap((s) =>
    s.position === 'FW' ? [s, s, s, s] : s.position === 'MF' ? [s, s] : s.position === 'DF' ? [s] : []
  );
  const goalsByPlayerId = new Map<string, number>();
  if (customResult?.goalsByPlayerId) {
    Object.entries(customResult.goalsByPlayerId).forEach(([pid, gCount]) => {
      if (gCount > 0) goalsByPlayerId.set(pid, gCount);
    });
  }

  const usedMinutes = new Set<number>();
  const pickMin = () => {
    let m = Math.floor(Math.random() * 88) + 2;
    while (usedMinutes.has(m)) m = ((m + 5) % 89) + 2;
    usedMinutes.add(m);
    return m;
  };

  const scorerNamesWithMin: string[] = [];
  const generatedHighlights: string[] = [];
  if (!customResult?.goalsByPlayerId) {
    for (let g = 0; g < myScore; g++) {
      const chosen = attackPool[Math.floor(Math.random() * attackPool.length)] || starters[0];
      if (chosen) {
        const m = pickMin();
        goalsByPlayerId.set(chosen.id, (goalsByPlayerId.get(chosen.id) || 0) + 1);
        scorerNamesWithMin.push(`${chosen.name} (${m}')`);
        generatedHighlights.push(
          `${m}' — GOL DE ${myTeam.name.toUpperCase()}! ${chosen.name} (${chosen.clubShortName}) marca contra ${oppTeam.name}!`
        );
      }
    }
  }
  for (let og = 0; og < oppScore; og++) {
    const m = pickMin();
    generatedHighlights.push(
      `${m}' — Gol de ${oppTeam.name} em chegada rápida no ${targetFix.stadiumName}.`
    );
  }
  generatedHighlights.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  if (myPen !== undefined && oppPen !== undefined) {
    generatedHighlights.push(
      `Pênaltis — ${myTeam.name} ${myPen} x ${oppPen} ${oppTeam.name}!`
    );
  }
  if (generatedHighlights.length === 0) {
    generatedHighlights.push(
      `Duelo tático intenso em ${targetFix.stadiumName} entre ${myTeam.name} e ${oppTeam.name}.`
    );
  }

  const finalHighlights =
    customResult?.highlights && customResult.highlights.length > 0
      ? customResult.highlights
      : generatedHighlights;
  const finalScorers =
    customResult?.scorersSummary ||
    (scorerNamesWithMin.length > 0 ? scorerNamesWithMin.join(', ') : `Sem gols de ${myTeam.name}`);

  const calledSet = new Set(activeCalledIds);
  const starterSet = new Set(activeStarterIds);
  const explicitSubsSet = customResult?.playedSubIds ? new Set(customResult.playedSubIds) : null;
  const userClubPlayersCalled: FifaCallUpPlayerLog[] = [];
  let totalUserMarketValueGain = 0;

  // Update real club players
  const updatedClubs = state.clubs.map((club) => {
    const hasAnyCalled = club.squad.some((p) => calledSet.has(p.id));
    if (!hasAnyCalled && club.id !== state.userClubId) return club;

    let userPlayersCalledCount = 0;
    const updatedSquad = club.squad.map((p) => {
      if (!calledSet.has(p.id)) return p;
      const playedCap = explicitSubsSet
        ? starterSet.has(p.id) || explicitSubsSet.has(p.id)
        : starterSet.has(p.id) || Math.random() < 0.35;
      const goalsScored = goalsByPlayerId.get(p.id) || 0;
      const appreciationPct = goalsScored > 0 ? 0.08 : playedCap ? 0.055 : 0.035;
      const boostAmount = Math.round(p.marketValue * appreciationPct);
      const newMarketValue = p.marketValue + boostAmount;
      const conditionCost = starterSet.has(p.id) ? 12 : playedCap ? 8 : 4;

      if (club.id === state.userClubId) {
        userPlayersCalledCount += 1;
        totalUserMarketValueGain += boostAmount;
        userClubPlayersCalled.push({
          playerId: p.id,
          playerName: p.name,
          playerRole: p.detailedRole,
          clubId: club.id,
          clubShortName: club.shortName,
          overall: p.overall,
          goalsInWindow: goalsScored,
          marketValueBoost: boostAmount,
        });
      }

      return {
        ...p,
        internationalCaps: (p.internationalCaps || 0) + (playedCap ? 1 : 0),
        internationalGoals: (p.internationalGoals || 0) + goalsScored,
        lastCalledUpSeason: state.currentSeasonYear,
        lastCalledUpRound: targetFix.triggerRound,
        marketValue: newMarketValue,
        releaseClause: p.releaseClause
          ? Math.max(p.releaseClause, Math.round(newMarketValue * 2.1))
          : undefined,
        morale: 'Excelente' as const,
        condition: Math.max(54, p.condition - conditionCost),
      };
    });

    const compensation =
      club.id === state.userClubId
        ? userPlayersCalledCount * FIFA_SOLIDARITY_COMPENSATION_PER_PLAYER
        : 0;

    return {
      ...club,
      finances:
        compensation > 0
          ? {
              ...club.finances,
              balance: club.finances.balance + compensation,
              totalIncomeSeason: club.finances.totalIncomeSeason + compensation,
            }
          : club.finances,
      squad: updatedSquad,
    };
  });

  // Update virtual players caps & goals
  const updatedVirtualPlayers = (nt.virtualPlayers || []).map((vp) => {
    if (!calledSet.has(vp.id)) return vp;
    const playedCap = explicitSubsSet
      ? starterSet.has(vp.id) || explicitSubsSet.has(vp.id)
      : starterSet.has(vp.id) || Math.random() < 0.35;
    const g = goalsByPlayerId.get(vp.id) || 0;
    return {
      ...vp,
      caps: vp.caps + (playedCap ? 1 : 0),
      goals: vp.goals + g,
    };
  });

  const homeScore = isHome ? myScore : oppScore;
  const awayScore = isHome ? oppScore : myScore;
  const penaltiesHome = isHome ? myPen : oppPen;
  const penaltiesAway = isHome ? oppPen : myPen;
  let winnerTeamId: string | undefined;
  if (homeScore > awayScore) winnerTeamId = targetFix.homeTeamId;
  else if (awayScore > homeScore) winnerTeamId = targetFix.awayTeamId;
  else if (penaltiesHome !== undefined && penaltiesAway !== undefined) {
    winnerTeamId = penaltiesHome > penaltiesAway ? targetFix.homeTeamId : targetFix.awayTeamId;
  }

  const completedFix: InternationalMatchFixture = {
    ...targetFix,
    played: true,
    status: 'PLAYED',
    homeScore,
    awayScore,
    penaltiesHome,
    penaltiesAway,
    winnerTeamId,
    highlights: finalHighlights,
    scorersSummary: finalScorers,
  };

  const {
    nextNt,
    justCrownedTournament,
    rankingDeltaHome,
    rankingDeltaAway,
    oldHomeRank,
    newHomeRank,
    oldAwayRank,
    newAwayRank,
  } = updateFixtureInNationalState(
    { ...nt, virtualPlayers: updatedVirtualPlayers },
    completedFix,
    state.currentSeasonYear
  );

  const totalUserClubCompensation =
    userClubPlayersCalled.length * FIFA_SOLIDARITY_COMPENSATION_PER_PLAYER;

  const penTag =
    penaltiesHome !== undefined ? ` (${penaltiesHome}–${penaltiesAway} pen)` : '';
  const matchSummary = isHome
    ? `${myTeam.name} ${myScore} x ${oppScore} ${oppTeam.name}${penTag}`
    : `${oppTeam.name} ${oppScore} x ${myScore} ${myTeam.name}${penTag}`;

  const userDelta = isHome ? rankingDeltaHome : rankingDeltaAway;
  const userOldRank = isHome ? oldHomeRank : oldAwayRank;
  const userNewRank = isHome ? newHomeRank : newAwayRank;

  const report: FifaWindowReport = {
    id: `rep_${targetFix.id}_${Date.now()}`,
    windowId: targetFix.id,
    seasonYear: state.currentSeasonYear,
    round: targetFix.triggerRound,
    windowLabel: `${targetFix.competitionName} · ${targetFix.phase}`,
    competitionLabel: targetFix.competitionName,
    matchSummary,
    brazilScore: myScore,
    opponentScore: oppScore,
    opponentName: oppTeam.name,
    coachedByUser,
    userClubPlayersCalled,
    totalUserClubCompensation,
    totalUserMarketValueGain,
    highlights: finalHighlights,
    rankingDelta: userDelta,
    rankingOldRank: userOldRank,
    rankingNewRank: userNewRank,
  };

  let coachMatches = nextNt.coachMatches;
  let coachWins = nextNt.coachWins;
  let coachDraws = nextNt.coachDraws;
  let coachLosses = nextNt.coachLosses;
  let cbfConfidence = nextNt.cbfConfidence;
  let warningsIssued = nextNt.warningsIssued ?? 0;
  let isUserCoach = nextNt.isUserCoach;
  let userTeamId = nextNt.userTeamId ?? null;
  let hasPendingCbfInvite = nextNt.hasPendingCbfInvite;
  let pendingInviteTeamId = nextNt.pendingInviteTeamId ?? null;
  let lastDismissal = nextNt.lastDismissal ?? null;
  let pendingNationalOffers = [...(nextNt.pendingNationalOffers || [])];
  let nationalStints = [...(nextNt.nationalStints || [])];
  const teamCoaches = ensureNationalTeamCoachesMap(nextNt, state.managerName);
  let reputationDelta = 0;
  let trophiesWonWithSelecao = nextNt.trophiesWonWithSelecao;
  const newTrophies: TrophyRecord[] = [];
  const inboxMessages: InboxMessage[] = [];
  const movementRecords: CoachMovementRecord[] = [];

  const didMyTeamWin =
    myScore > oppScore || (myPen !== undefined && oppPen !== undefined && myPen > oppPen);
  const didMyTeamLose =
    myScore < oppScore || (myPen !== undefined && oppPen !== undefined && myPen < oppPen);

  // Record Finalíssima or Tournament Championships in Trophy Cabinet!
  let wonTitleThisMatch = false;
  if (targetFix.competition === 'finalissima' && completedFix.winnerTeamId) {
    const champ = getNationalTeamById(completedFix.winnerTeamId);
    const runner = getNationalTeamById(
      completedFix.winnerTeamId === completedFix.homeTeamId
        ? completedFix.awayTeamId
        : completedFix.homeTeamId
    );
    const userWonFinalissima = coachedByUser && completedFix.winnerTeamId === focusTeamId;
    if (userWonFinalissima) {
      trophiesWonWithSelecao += 1;
      reputationDelta += 5;
      wonTitleThisMatch = true;
    }
    newTrophies.push({
      year: state.currentSeasonYear,
      competition: targetFix.competitionName,
      championTeamName: userWonFinalissima ? `${champ.name} (${state.managerName})` : champ.name,
      runnerUpTeamName: runner.name,
      userWon: userWonFinalissima,
    });
  }

  if (justCrownedTournament && justCrownedTournament.championTeamId) {
    const champ = getNationalTeamById(justCrownedTournament.championTeamId);
    const runner = getNationalTeamById(justCrownedTournament.runnerUpTeamId || 'nt_arg');
    const userWonTitle =
      coachedByUser && justCrownedTournament.championTeamId === focusTeamId;
    if (userWonTitle) {
      trophiesWonWithSelecao += 1;
      reputationDelta += justCrownedTournament.compId === 'world_cup' ? 14 : 8;
      wonTitleThisMatch = true;
    }
    newTrophies.push({
      year: justCrownedTournament.year,
      competition: justCrownedTournament.title,
      championTeamName: userWonTitle ? `${champ.name} (${state.managerName})` : champ.name,
      runnerUpTeamName: runner.name,
      userWon: userWonTitle,
    });
    inboxMessages.unshift({
      id: `msg_nt_champ_${justCrownedTournament.id}_${Date.now()}`,
      title: userWonTitle
        ? `CAMPEÃO! Você conquistou a ${justCrownedTournament.title} com ${champ.name}!`
        : `${champ.name} conquista a ${justCrownedTournament.title}!`,
      message: userWonTitle
        ? `Feito histórico! Sob o comando de ${state.managerName}, a seleção de ${champ.name} superou ${runner.name} na Grande Final e ergueu a taça da ${justCrownedTournament.title}!`
        : `Na Grande Final da ${justCrownedTournament.title}, ${champ.name} superou ${runner.name} e ficou com o título internacional.`,
      date: state.currentDate,
      round: state.currentRound,
      read: false,
      type: 'NATIONAL_TEAM',
    });
  }

  // Update opponent coach record
  const oppRec = teamCoaches[oppId] || buildInitialCoachRecordForTeam(oppTeam);
  const oppDelta = computeNationalSecurityDelta(
    oppTeam,
    myTeam,
    oppScore,
    myScore,
    didMyTeamLose,
    didMyTeamWin,
    isKnockout
  );
  teamCoaches[oppId] = {
    ...oppRec,
    matches: oppRec.matches + 1,
    wins: oppRec.wins + (didMyTeamLose ? 1 : 0),
    draws: oppRec.draws + (!didMyTeamWin && !didMyTeamLose ? 1 : 0),
    losses: oppRec.losses + (didMyTeamWin ? 1 : 0),
    security: Math.max(0, Math.min(100, oppRec.security + oppDelta)),
  };

  if (coachedByUser) {
    coachMatches += 1;
    if (didMyTeamWin) {
      coachWins += 1;
      reputationDelta += targetFix.competition === 'world_cup' ? 4 : 2;
    } else if (!didMyTeamLose) {
      coachDraws += 1;
    } else {
      coachLosses += 1;
      reputationDelta -= isKnockout ? 3 : 2;
    }

    const secDelta = computeNationalSecurityDelta(
      myTeam,
      oppTeam,
      myScore,
      oppScore,
      didMyTeamWin,
      didMyTeamLose,
      isKnockout
    );
    cbfConfidence = Math.max(0, Math.min(100, cbfConfidence + secDelta + (wonTitleThisMatch ? 12 : 0)));

    // Sync active National Team stint
    if (nationalStints.length === 0 || nationalStints[0].teamId !== focusTeamId || nationalStints[0].statusLabel !== 'Cargo Atual') {
      nationalStints = [
        {
          id: `nt_stint_${focusTeamId}_${Date.now()}`,
          teamId: myTeam.id,
          teamName: myTeam.name,
          teamCode: myTeam.code,
          confederation: myTeam.confederation,
          startYear: state.currentSeasonYear,
          startDate: nextNt.appointedDate || state.currentDate,
          matches: coachMatches,
          wins: coachWins,
          draws: coachDraws,
          losses: coachLosses,
          trophiesWon: trophiesWonWithSelecao,
          statusLabel: 'Cargo Atual',
        },
        ...nationalStints,
      ];
    } else {
      nationalStints = nationalStints.map((s, idx) =>
        idx === 0
          ? {
              ...s,
              matches: s.matches + 1,
              wins: s.wins + (didMyTeamWin ? 1 : 0),
              draws: s.draws + (!didMyTeamWin && !didMyTeamLose ? 1 : 0),
              losses: s.losses + (didMyTeamLose ? 1 : 0),
              trophiesWon: s.trophiesWon + (wonTitleThisMatch ? 1 : 0),
            }
          : s
      );
    }

    teamCoaches[focusTeamId] = {
      ...(teamCoaches[focusTeamId] || buildInitialCoachRecordForTeam(myTeam)),
      coachName: state.managerName,
      security: cbfConfidence,
      matches: coachMatches,
      wins: coachWins,
      draws: coachDraws,
      losses: coachLosses,
    };

    const shouldBeDismissed =
      (coachMatches >= 3 && cbfConfidence <= 14) ||
      (coachMatches >= 2 && cbfConfidence <= 6) ||
      (isKnockout &&
        didMyTeamLose &&
        targetFix.competition === 'world_cup' &&
        myTeam.strength >= 84 &&
        cbfConfidence <= 26);

    if (shouldBeDismissed) {
      const dismissReason =
        isKnockout && didMyTeamLose && targetFix.competition === 'world_cup'
          ? `Eliminação precoce na Copa do Mundo e crise de confiança na ${myTeam.federationCode} (${cbfConfidence}%)`
          : `Sequência negativa à frente de ${myTeam.name} (${coachWins}V-${coachDraws}E-${coachLosses}D) esgotou a paciência da ${myTeam.federationCode}`;

      nationalStints = nationalStints.map((s, idx) =>
        idx === 0 && s.statusLabel === 'Cargo Atual'
          ? {
              ...s,
              endDate: state.currentDate,
              statusLabel: 'Demitido pela Federação',
            }
          : s
      );

      const replacement = pickReplacementNationalCoach(teamCoaches, myTeam, [state.managerName]);
      teamCoaches[focusTeamId] = {
        coachName: replacement.coachName,
        nationality: replacement.nationality,
        prestige: replacement.prestige,
        security: 76,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      };

      const userRepAfter = Math.max(
        1,
        Math.min(100, (state.managerCareer?.managerReputation || 60) + reputationDelta - 4)
      );
      reputationDelta -= 4;

      lastDismissal = {
        id: `nt_dismiss_${focusTeamId}_${Date.now()}`,
        entityType: 'NATIONAL_TEAM',
        entityId: myTeam.id,
        entityName: `${myTeam.name} (${myTeam.federationCode})`,
        reason: dismissReason,
        confidenceAtDismissal: cbfConfidence,
        matches: coachMatches,
        wins: coachWins,
        draws: coachDraws,
        losses: coachLosses,
        severanceReceived: 0,
        date: state.currentDate,
        acknowledged: false,
      };

      const rescueOffers = generateNationalTeamOffers(
        { ...nextNt, teamCoaches, pendingNationalOffers: [] },
        userRepAfter,
        state.currentDate,
        [focusTeamId],
        'Sondagem após saída da seleção',
        3,
        true
      );
      pendingNationalOffers = [
        ...rescueOffers,
        ...pendingNationalOffers.map((o) =>
          o.status === 'PENDING' ? { ...o, status: 'EXPIRED' as const } : o
        ),
      ].slice(0, 10);

      isUserCoach = false;
      userTeamId = null;
      warningsIssued = 0;
      const syncedFlags = syncLegacyNationalInviteFlags(
        { ...nextNt, isUserCoach: false },
        pendingNationalOffers
      );
      hasPendingCbfInvite = syncedFlags.hasPendingCbfInvite;
      pendingInviteTeamId = syncedFlags.pendingInviteTeamId;

      movementRecords.push({
        id: `cmov_nt_user_sacked_${focusTeamId}_${Date.now()}`,
        entityType: 'NATIONAL_TEAM',
        date: state.currentDate,
        round: state.currentRound,
        seasonYear: state.currentSeasonYear,
        clubId: myTeam.id,
        clubName: myTeam.name,
        clubDivision: 'SELECAO',
        confederation: myTeam.confederation,
        sackedCoachName: state.managerName,
        hiredCoachName: replacement.coachName,
        reason: dismissReason,
        eventType: 'USER_SACKED',
      });

      inboxMessages.unshift({
        id: `msg_nt_sacked_${focusTeamId}_${Date.now()}`,
        title: `DEMITIDO DA SELEÇÃO: A ${myTeam.federationCode} encerra seu ciclo em ${myTeam.name}`,
        message: `Após ${matchSummary}, a federação ${myTeam.federationCode} anunciou sua demissão (${coachWins}V-${coachDraws}E-${coachLosses}D, confiança ${cbfConfidence}%) e contratou ${replacement.coachName}. Você já recebeu ${rescueOffers.length} sondagens de outras federações.`,
        date: state.currentDate,
        round: state.currentRound,
        read: false,
        type: 'NATIONAL_TEAM',
      });
    } else if (cbfConfidence <= 22 && warningsIssued < 2) {
      warningsIssued = 2;
      inboxMessages.unshift({
        id: `msg_nt_ultimatum_${focusTeamId}_${Date.now()}`,
        title: `ULTIMATO DA ${myTeam.federationCode}: Seu cargo em ${myTeam.name} corre risco imediato`,
        message: `A diretoria da ${myTeam.federationCode} convocou reunião de emergência após ${matchSummary} (confiança ${cbfConfidence}%). Um novo tropeço resultará em demissão da seleção.`,
        date: state.currentDate,
        round: state.currentRound,
        read: false,
        type: 'NATIONAL_TEAM',
      });
    } else if (cbfConfidence <= 34 && warningsIssued < 1) {
      warningsIssued = 1;
      inboxMessages.unshift({
        id: `msg_nt_warn_${focusTeamId}_${Date.now()}`,
        title: `Pressão na ${myTeam.federationCode}: Confiança em queda (${cbfConfidence}%)`,
        message: `Os últimos resultados de ${myTeam.name} geraram cobrança interna da ${myTeam.federationCode}. A federação espera reação imediata na próxima Data FIFA.`,
        date: state.currentDate,
        round: state.currentRound,
        read: false,
        type: 'NATIONAL_TEAM',
      });
    } else if (cbfConfidence >= 52) {
      warningsIssued = 0;
    }
  } else {
    // CPU Brazil match update
    const braRec = teamCoaches[focusTeamId] || buildInitialCoachRecordForTeam(myTeam);
    const braDelta = computeNationalSecurityDelta(
      myTeam,
      oppTeam,
      myScore,
      oppScore,
      didMyTeamWin,
      didMyTeamLose,
      isKnockout
    );
    teamCoaches[focusTeamId] = {
      ...braRec,
      matches: braRec.matches + 1,
      wins: braRec.wins + (didMyTeamWin ? 1 : 0),
      draws: braRec.draws + (!didMyTeamWin && !didMyTeamLose ? 1 : 0),
      losses: braRec.losses + (didMyTeamLose ? 1 : 0),
      security: Math.max(0, Math.min(100, braRec.security + braDelta + (wonTitleThisMatch ? 12 : 0))),
    };
  }

  const userCallupDetail =
    userClubPlayersCalled.length > 0
      ? ` Atletas do seu clube convocados (${userClubPlayersCalled.length}): ${userClubPlayersCalled
          .map((u) => `${u.playerName} (+${formatBRL(u.marketValueBoost)} no passe)`)
          .join(', ')}. Compensação FIFA: +${formatBRL(totalUserClubCompensation)}.`
      : '';

  const rankMovementText =
    userOldRank !== undefined && userNewRank !== undefined
      ? userNewRank < userOldRank
        ? ` e subiu para a #${userNewRank} posição no Ranking Mundial da FIFA (era #${userOldRank}, salto de +${userOldRank - userNewRank})! 🚀`
        : userNewRank > userOldRank
        ? ` e caiu para a #${userNewRank} posição no Ranking Mundial da FIFA (era #${userOldRank}).`
        : ` e manteve a #${userNewRank} posição no Ranking Mundial da FIFA.`
      : '';
  const rankingSummaryMsg =
    userDelta !== undefined
      ? ` Impacto no Ranking FIFA: ${userDelta >= 0 ? '+' : ''}${userDelta.toFixed(1)} pts${rankMovementText}`
      : '';

  inboxMessages.push({
    id: `msg_fifa_played_${targetFix.id}_${Date.now()}`,
    title: `${targetFix.competitionName}: ${matchSummary}`,
    message: `${coachedByUser ? `Sob seu comando na seleção de ${myTeam.name}, placar` : 'Placar'} final pela fase ${targetFix.phase}: ${matchSummary}.${rankingSummaryMsg}${userCallupDetail}`,
    date: state.currentDate,
    round: state.currentRound,
    read: false,
    type: 'NATIONAL_TEAM',
  });

  const finalNt: NationalTeamState = {
    ...nextNt,
    isUserCoach,
    userTeamId,
    hasPendingCbfInvite,
    pendingInviteTeamId,
    calledUpPlayerIds: activeCalledIds,
    starterPlayerIds: activeStarterIds,
    cbfConfidence,
    warningsIssued,
    coachMatches,
    coachWins,
    coachDraws,
    coachLosses,
    trophiesWonWithSelecao,
    pendingNationalOffers,
    teamCoaches,
    nationalStints,
    lastDismissal,
    callUpHistory: [report, ...nextNt.callUpHistory].slice(0, 30),
  };
  finalNt.windows = syncLegacyWindowsFromTeamFixtures(finalNt, state.currentSeasonYear);

  return {
    updatedClubs,
    updatedNationalTeam: finalNt,
    inboxMessages,
    newTrophies,
    reputationDelta,
    movementRecords,
  };
}

function collectDueUnplayedFixturesByDate(
  nt: NationalTeamState,
  targetDate: string,
  inclusive: boolean
): InternationalMatchFixture[] {
  return getAllInternationalFixtures(nt).filter((f) => {
    if (f.played) return false;
    const fDate = f.date || `${f.seasonYear}-06-15`;
    return inclusive ? fDate <= targetDate : fDate < targetDate;
  });
}

function appendNationalMovementsToState(
  state: GameSave,
  movements: CoachMovementRecord[]
): GameSave {
  if (movements.length === 0 || !state.coachingCarousel) return state;
  return {
    ...state,
    coachingCarousel: {
      ...state.coachingCarousel,
      movementHistory: [...movements, ...state.coachingCarousel.movementHistory].slice(0, 100),
    },
  };
}

function processNationalTeamCarouselAndOffers(
  state: GameSave,
  targetDate: string
): {
  nextNt: NationalTeamState;
  inboxMessages: InboxMessage[];
  movements: CoachMovementRecord[];
} {
  const nt = state.nationalTeam!;
  const coachesMap = ensureNationalTeamCoachesMap(nt, state.managerName);
  const inboxMessages: InboxMessage[] = [];
  const movements: CoachMovementRecord[] = [];
  const reputation = state.managerCareer?.managerReputation || 50;

  // 1. Prune expired offers
  let pendingOffers = (nt.pendingNationalOffers || []).map((o) =>
    o.status === 'PENDING' && o.expiresDate < targetDate ? { ...o, status: 'EXPIRED' as const } : o
  );

  // 2. Evaluate CPU-coached National Teams for sackings (cap 2 per sync)
  const cpuSackingCandidates = NATIONAL_TEAMS_CATALOG.filter((team) => {
    if (nt.isUserCoach && (nt.userTeamId || 'nt_bra') === team.id) return false;
    const rec = coachesMap[team.id];
    return rec && rec.matches >= 3 && rec.security <= 24;
  })
    .map((team) => ({ team, rec: coachesMap[team.id] }))
    .sort((a, b) => a.rec.security - b.rec.security)
    .slice(0, 2);

  for (const { team, rec } of cpuSackingCandidates) {
    const replacement = pickReplacementNationalCoach(coachesMap, team, [
      rec.coachName,
      state.managerName,
    ]);
    coachesMap[team.id] = {
      coachName: replacement.coachName,
      nationality: replacement.nationality,
      prestige: replacement.prestige,
      security: 75,
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    };

    movements.push({
      id: `cmov_nt_cpu_${team.id}_${Date.now()}_${movements.length}`,
      entityType: 'NATIONAL_TEAM',
      date: targetDate,
      round: state.currentRound,
      seasonYear: state.currentSeasonYear,
      clubId: team.id,
      clubName: team.name,
      clubDivision: 'SELECAO',
      confederation: team.confederation,
      sackedCoachName: rec.coachName,
      hiredCoachName: replacement.coachName,
      reason: `Demissão após má fase (${rec.wins}V-${rec.draws}E-${rec.losses}D) · reposição definida pela ${team.federationCode}`,
      eventType: 'SACKED_AND_HIRED',
    });

    if (team.strength >= 78) {
      inboxMessages.push({
        id: `msg_nt_cpu_sack_${team.id}_${targetDate}`,
        title: `Dança nas Seleções: ${team.name} demite ${rec.coachName}`,
        message: `A federação ${team.federationCode} encerrou o ciclo de ${rec.coachName} após resultados abaixo do esperado e anunciou ${replacement.coachName} como novo comandante de ${team.name}.`,
        date: targetDate,
        round: state.currentRound,
        read: false,
        type: 'NATIONAL_TEAM',
      });
    }
  }

  // 3. Periodic & milestone National Team offers for user
  const activePending = pendingOffers.filter((o) => o.status === 'PENDING');
  if (activePending.length < 3) {
    // CBF invite when reputation meets threshold
    if (
      !nt.isUserCoach &&
      nt.inviteDeclinedSeason !== state.currentSeasonYear &&
      reputation >= CBF_INVITE_MIN_REPUTATION &&
      !activePending.some((o) => o.teamId === 'nt_bra')
    ) {
      const bra = getNationalTeamById('nt_bra');
      const braOffer: NationalTeamJobOffer = {
        id: `nt_offer_cbf_${targetDate}_${Date.now()}`,
        teamId: bra.id,
        teamName: bra.name,
        teamCode: bra.code,
        federationCode: bra.federationCode,
        confederation: bra.confederation,
        strength: bra.strength,
        primaryColor: bra.primaryColor,
        textColor: bra.textColor,
        reason: `Seu prestígio na carreira (${reputation}/100) motivou convite oficial da CBF para comandar a Seleção Brasileira`,
        createdDate: targetDate,
        expiresDate: addDays(targetDate, 60),
        status: 'PENDING',
      };
      pendingOffers = [braOffer, ...pendingOffers].slice(0, 10);
      inboxMessages.push({
        id: `msg_cbf_invite_${state.currentSeasonYear}_${targetDate}`,
        title: 'Convite Oficial da CBF: Comando da Seleção Brasileira',
        message: `Seu prestígio na carreira (${reputation}/100) chamou a atenção da CBF! Você foi convidado para assumir a Seleção Brasileira nas Eliminatórias, Copa América e Copa do Mundo mantendo seu clube atual.`,
        date: targetDate,
        round: state.currentRound,
        read: false,
        type: 'NATIONAL_TEAM',
      });
    } else if (
      (!nt.isUserCoach && activePending.length === 0 && reputation >= 44 && state.currentRound >= 2) ||
      (nt.isUserCoach &&
        nt.coachMatches >= 3 &&
        nt.cbfConfidence >= 65 &&
        reputation >= 66 &&
        activePending.length === 0 &&
        state.currentRound % 6 === 0)
    ) {
      const excludeIds = nt.userTeamId ? [nt.userTeamId] : [];
      const newOffers = generateNationalTeamOffers(
        { ...nt, teamCoaches: coachesMap, pendingNationalOffers: pendingOffers },
        reputation,
        targetDate,
        excludeIds,
        undefined,
        nt.isUserCoach ? 1 : 2,
        false
      );
      if (newOffers.length > 0) {
        pendingOffers = [...newOffers, ...pendingOffers].slice(0, 10);
        const lead = newOffers[0];
        inboxMessages.push({
          id: `msg_nt_offer_market_${lead.teamId}_${targetDate}`,
          title: `Convite de Seleção: ${lead.teamName} (${lead.federationCode}) procura você!`,
          message: `${lead.reason}. ${newOffers.length > 1 ? `Você tem ${newOffers.length} propostas oficiais de seleções aguardando resposta.` : 'Acesse Seleções ou Propostas de Carreira para responder.'}`,
          date: targetDate,
          round: state.currentRound,
          read: false,
          type: 'NATIONAL_TEAM',
        });
      }
    }
  }

  const flags = syncLegacyNationalInviteFlags(nt, pendingOffers);

  return {
    nextNt: {
      ...nt,
      teamCoaches: coachesMap,
      pendingNationalOffers: pendingOffers,
      hasPendingCbfInvite: flags.hasPendingCbfInvite,
      pendingInviteTeamId: flags.pendingInviteTeamId,
    },
    inboxMessages,
    movements,
  };
}

/**
 * Synchronizes National Team tournaments, qualifiers, CPU matches, and user Seleção matchday
 * unlocking against the real world calendar date (`targetDate`, `YYYY-MM-DD`).
 */
export function syncNationalTeamByDate(
  state: GameSave,
  targetDate: string,
  inclusive: boolean = true
): GameSave {
  const calendarYear = Number(targetDate.slice(0, 4)) || state.currentSeasonYear;
  let upgradedNt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );

  const startSyncYear = Math.min(state.currentSeasonYear, calendarYear);
  for (let y = startSyncYear; y <= calendarYear; y++) {
    upgradedNt = ensureNationalTeamCalendarYear(upgradedNt, state.clubs, y);
  }

  let workingState: GameSave = {
    ...state,
    nationalTeam: upgradedNt,
  };

  const extraInbox: InboxMessage[] = [];
  const allMovements: CoachMovementRecord[] = [];

  // Process due international matches strictly in chronological date order
  for (let pass = 0; pass < 80; pass++) {
    const ntSnap = workingState.nationalTeam!;
    const due = collectDueUnplayedFixturesByDate(ntSnap, targetDate, inclusive);
    if (due.length === 0) break;

    const earliestDueDate = due[0].date || `${due[0].seasonYear}-06-15`;
    const batch = due.filter((f) => (f.date || `${f.seasonYear}-06-15`) === earliestDueDate);

    let anySimulatedOrUnlockedInPass = false;

    for (const fix of batch) {
      const latestNt = workingState.nationalTeam!;
      if (
        fix.competition === 'friendly' &&
        !(latestNt.seasonSchedule || []).some((f) => f.id === fix.id && !f.played)
      ) {
        continue;
      }
      const fixDate = fix.date || `${fix.seasonYear}-06-15`;
      const currentUserTeamId = latestNt.isUserCoach ? latestNt.userTeamId || 'nt_bra' : null;
      const involvesUserTeam =
        currentUserTeamId !== null &&
        (fix.homeTeamId === currentUserTeamId || fix.awayTeamId === currentUserTeamId);
      const involvesCpuBrazil =
        currentUserTeamId === null && (fix.homeTeamId === 'nt_bra' || fix.awayTeamId === 'nt_bra');

      if (involvesUserTeam && currentUserTeamId) {
        if (fixDate < targetDate) {
          anySimulatedOrUnlockedInPass = true;
          const sim = executeTeamMatchAndRewards(
            workingState,
            latestNt,
            fix,
            currentUserTeamId,
            true
          );
          const updatedCareer = workingState.managerCareer
            ? {
                ...workingState.managerCareer,
                managerReputation: Math.max(
                  1,
                  Math.min(100, workingState.managerCareer.managerReputation + sim.reputationDelta)
                ),
              }
            : workingState.managerCareer;
          workingState = {
            ...workingState,
            clubs: sim.updatedClubs,
            nationalTeam: sim.updatedNationalTeam,
            managerCareer: updatedCareer,
            trophyHistory: [...sim.newTrophies, ...workingState.trophyHistory],
          };
          extraInbox.push(...sim.inboxMessages);
          allMovements.push(...sim.movementRecords);
        } else if (fix.status !== 'READY_FOR_USER') {
          anySimulatedOrUnlockedInPass = true;
          const readyFix: InternationalMatchFixture = { ...fix, status: 'READY_FOR_USER' };
          const { nextNt } = updateFixtureInNationalState(latestNt, readyFix, calendarYear);
          workingState = { ...workingState, nationalTeam: nextNt };

          const myTeam = getNationalTeamById(currentUserTeamId);
          const oppTeam = getNationalTeamById(
            fix.homeTeamId === currentUserTeamId ? fix.awayTeamId : fix.homeTeamId
          );
          const msgId = `msg_nt_ready_${fix.id}`;
          if (!workingState.inbox.some((m) => m.id === msgId) && !extraInbox.some((m) => m.id === msgId)) {
            extraInbox.push({
              id: msgId,
              title: `Dia de Jogo da Seleção · ${fix.competitionName} (${myTeam.name} vs ${oppTeam.name})`,
              message: `Sua seleção (${myTeam.name}) entra em campo hoje (${formatShortDate(fixDate)}) pela fase ${fix.phase} da ${fix.competitionName} contra ${oppTeam.name}! Escale os titulares no Calendário ou na aba Seleções.`,
              date: targetDate,
              round: workingState.currentRound,
              read: false,
              type: 'NATIONAL_TEAM',
            });
          }
        }
      } else if (involvesCpuBrazil) {
        anySimulatedOrUnlockedInPass = true;
        const sim = executeTeamMatchAndRewards(workingState, latestNt, fix, 'nt_bra', false);
        workingState = {
          ...workingState,
          clubs: sim.updatedClubs,
          nationalTeam: sim.updatedNationalTeam,
          trophyHistory: [...sim.newTrophies, ...workingState.trophyHistory],
        };
        extraInbox.push(...sim.inboxMessages);
        allMovements.push(...sim.movementRecords);
      } else {
        anySimulatedOrUnlockedInPass = true;
        const isKo = isInternationalFixtureKnockout(fix);
        const simFix = simulateCpuInternationalFixture(fix, isKo);
        const { nextNt, justCrownedTournament } = updateFixtureInNationalState(
          latestNt,
          simFix,
          calendarYear
        );

        // Update CPU team coaches records for both teams
        const updatedCoaches = ensureNationalTeamCoachesMap(nextNt, workingState.managerName);
        const hTeam = getNationalTeamById(simFix.homeTeamId);
        const aTeam = getNationalTeamById(simFix.awayTeamId);
        const hs = simFix.homeScore ?? 0;
        const as = simFix.awayScore ?? 0;
        const homeWon = simFix.winnerTeamId === simFix.homeTeamId || hs > as;
        const awayWon = simFix.winnerTeamId === simFix.awayTeamId || as > hs;
        const hRec = updatedCoaches[hTeam.id] || buildInitialCoachRecordForTeam(hTeam);
        const aRec = updatedCoaches[aTeam.id] || buildInitialCoachRecordForTeam(aTeam);
        updatedCoaches[hTeam.id] = {
          ...hRec,
          matches: hRec.matches + 1,
          wins: hRec.wins + (homeWon ? 1 : 0),
          draws: hRec.draws + (!homeWon && !awayWon ? 1 : 0),
          losses: hRec.losses + (awayWon ? 1 : 0),
          security: Math.max(
            0,
            Math.min(100, hRec.security + computeNationalSecurityDelta(hTeam, aTeam, hs, as, homeWon, awayWon, isKo))
          ),
        };
        updatedCoaches[aTeam.id] = {
          ...aRec,
          matches: aRec.matches + 1,
          wins: aRec.wins + (awayWon ? 1 : 0),
          draws: aRec.draws + (!homeWon && !awayWon ? 1 : 0),
          losses: aRec.losses + (homeWon ? 1 : 0),
          security: Math.max(
            0,
            Math.min(100, aRec.security + computeNationalSecurityDelta(aTeam, hTeam, as, hs, awayWon, homeWon, isKo))
          ),
        };

        const cpuTrophies: TrophyRecord[] = [];
        if (justCrownedTournament && justCrownedTournament.championTeamId) {
          const champ = getNationalTeamById(justCrownedTournament.championTeamId);
          const runner = getNationalTeamById(justCrownedTournament.runnerUpTeamId || 'nt_arg');
          cpuTrophies.push({
            year: justCrownedTournament.year,
            competition: justCrownedTournament.title,
            championTeamName: champ.name,
            runnerUpTeamName: runner.name,
            userWon: false,
          });
          extraInbox.push({
            id: `msg_cpu_nt_champ_${justCrownedTournament.id}`,
            title: `${champ.name} conquista a ${justCrownedTournament.title}!`,
            message: `${champ.name} venceu ${runner.name} na Grande Final e levantou o troféu oficial da ${justCrownedTournament.title}!`,
            date: fix.date || targetDate,
            round: workingState.currentRound,
            read: false,
            type: 'NATIONAL_TEAM',
          });
        }
        workingState = {
          ...workingState,
          nationalTeam: {
            ...nextNt,
            teamCoaches: updatedCoaches,
          },
          trophyHistory: [...cpuTrophies, ...workingState.trophyHistory],
        };
      }
    }

    if (!anySimulatedOrUnlockedInPass) break;
  }

  // Evaluate CPU Selección sackings & user national offers
  const carouselSync = processNationalTeamCarouselAndOffers(workingState, targetDate);
  workingState = {
    ...workingState,
    nationalTeam: carouselSync.nextNt,
  };
  extraInbox.push(...carouselSync.inboxMessages);
  allMovements.push(...carouselSync.movements);

  workingState = appendNationalMovementsToState(workingState, allMovements);

  if (extraInbox.length === 0) return workingState;

  return {
    ...workingState,
    inbox: [...extraInbox, ...workingState.inbox],
  };
}

/**
 * Legacy round hook — delegates directly to real calendar date synchronization (`state.currentDate`).
 */
export function processMidSeasonNationalTeamCheck(
  state: GameSave,
  _completedRound: number
): GameSave {
  return syncNationalTeamByDate(state, state.currentDate, true);
}

/**
 * Interactive handler when the user plays/simulates a READY_FOR_USER international match
 * (supports both instant simulation and live minute-by-minute simulator result).
 */
export function playUserInternationalFixture(
  state: GameSave,
  fixtureId: string,
  customResult?: CustomUserInternationalResult
): GameSave {
  const calendarYear = Number(state.currentDate?.slice(0, 4)) || state.currentSeasonYear;
  let nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  nt = ensureNationalTeamCalendarYear(nt, state.clubs, calendarYear);

  const focusTeamId = nt.userTeamId || 'nt_bra';
  const allTeamMatches = getTeamAllInternationalFixtures(nt, focusTeamId);
  const targetFix = allTeamMatches.find((f) => f.id === fixtureId && !f.played);
  if (!targetFix) return state;

  const sim = executeTeamMatchAndRewards(
    state,
    nt,
    targetFix,
    focusTeamId,
    true,
    customResult
  );

  const updatedCareer = state.managerCareer
    ? {
        ...state.managerCareer,
        managerReputation: Math.max(
          1,
          Math.min(100, state.managerCareer.managerReputation + sim.reputationDelta)
        ),
      }
    : state.managerCareer;

  let afterMatchState: GameSave = {
    ...state,
    clubs: sim.updatedClubs,
    nationalTeam: sim.updatedNationalTeam,
    managerCareer: updatedCareer,
    trophyHistory: [...sim.newTrophies, ...state.trophyHistory],
    inbox: [...sim.inboxMessages, ...state.inbox],
  };
  afterMatchState = appendNationalMovementsToState(afterMatchState, sim.movementRecords);

  // Sync by current date in case finishing this match completed a tournament stage and unlocked same-day/past CPU ties
  afterMatchState = syncNationalTeamByDate(afterMatchState, state.currentDate, true);
  return afterMatchState;
}

export function playUserSelecaoWindowMatch(state: GameSave, windowId: string): GameSave {
  return playUserInternationalFixture(state, windowId);
}

/**
 * Appoints the user as head coach of any National Team (`teamId`) in dual-role mode.
 */
export function appointUserToNationalTeam(
  state: GameSave,
  teamId: string,
  acceptedOfferId?: string
): GameSave {
  const calendarYear = Number(state.currentDate?.slice(0, 4)) || state.currentSeasonYear;
  let nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  nt = ensureNationalTeamCalendarYear(nt, state.clubs, calendarYear);

  const prevTeamId = nt.isUserCoach ? nt.userTeamId || 'nt_bra' : null;
  const team = getNationalTeamById(teamId);
  const formation = nt.formation || '4-3-3';
  const optimal = selectOptimalSelecaoSquad(state.clubs, teamId, nt.virtualPlayers, formation);

  const coachesMap = ensureNationalTeamCoachesMap(nt, state.managerName);
  const displacedCoachName = coachesMap[teamId]?.coachName;
  const movements: CoachMovementRecord[] = [];

  if (prevTeamId && prevTeamId !== teamId) {
    const prevTeam = getNationalTeamById(prevTeamId);
    const replacement = pickReplacementNationalCoach(coachesMap, prevTeam, [state.managerName]);
    coachesMap[prevTeamId] = {
      coachName: replacement.coachName,
      nationality: replacement.nationality,
      prestige: replacement.prestige,
      security: 75,
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    };
    movements.push({
      id: `cmov_nt_leave_${prevTeamId}_${Date.now()}`,
      entityType: 'NATIONAL_TEAM',
      date: state.currentDate,
      round: state.currentRound,
      seasonYear: state.currentSeasonYear,
      clubId: prevTeam.id,
      clubName: prevTeam.name,
      clubDivision: 'SELECAO',
      confederation: prevTeam.confederation,
      sackedCoachName: state.managerName,
      hiredCoachName: replacement.coachName,
      reason: `Saída de ${state.managerName} para assumir ${team.name}`,
      eventType: 'USER_RESIGNED',
    });
  }

  coachesMap[teamId] = {
    coachName: state.managerName,
    nationality: 'Brasil',
    prestige: Math.max(72, state.managerCareer?.managerReputation || 75),
    security: 82,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
  };

  movements.unshift({
    id: `cmov_nt_app_${teamId}_${Date.now()}`,
    entityType: 'NATIONAL_TEAM',
    date: state.currentDate,
    round: state.currentRound,
    seasonYear: state.currentSeasonYear,
    clubId: team.id,
    clubName: team.name,
    clubDivision: 'SELECAO',
    confederation: team.confederation,
    sackedCoachName: displacedCoachName,
    hiredCoachName: state.managerName,
    reason: `Contratação oficial pela ${team.federationCode}`,
    eventType: 'USER_APPOINTED',
  });

  const closedStints: NationalTeamCareerStint[] = (nt.nationalStints || []).map((s, idx) =>
    idx === 0 && s.statusLabel === 'Cargo Atual'
      ? {
          ...s,
          endDate: state.currentDate,
          statusLabel: 'Aceitou Outra Seleção',
        }
      : s
  );

  const newStint: NationalTeamCareerStint = {
    id: `nt_stint_${team.id}_${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    teamCode: team.code,
    confederation: team.confederation,
    startYear: state.currentSeasonYear,
    startDate: state.currentDate,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    trophiesWon: 0,
    statusLabel: 'Cargo Atual',
  };

  const nextOffers = (nt.pendingNationalOffers || []).map((o) => {
    if (acceptedOfferId && o.id === acceptedOfferId) {
      return { ...o, status: 'ACCEPTED' as const };
    }
    if (o.teamId === teamId && o.status === 'PENDING') {
      return { ...o, status: 'ACCEPTED' as const };
    }
    return o;
  });

  let updatedNt: NationalTeamState = {
    ...nt,
    isUserCoach: true,
    userTeamId: teamId,
    hasPendingCbfInvite: false,
    pendingInviteTeamId: null,
    appointedDate: state.currentDate,
    cbfConfidence: 82,
    warningsIssued: 0,
    coachMatches: 0,
    coachWins: 0,
    coachDraws: 0,
    coachLosses: 0,
    lastDismissal: null,
    teamCoaches: coachesMap,
    nationalStints: [newStint, ...closedStints],
    pendingNationalOffers: nextOffers,
    formation,
    captainPlayerId: optimal.captainPlayerId,
    calledUpPlayerIds: optimal.calledUpPlayerIds,
    starterPlayerIds: optimal.starterPlayerIds,
    customPositions: undefined,
  };

  // Unlock any unplayed fixture of this team scheduled on `state.currentDate`
  const teamFixes = getTeamAllInternationalFixtures(updatedNt, teamId);
  for (const fix of teamFixes) {
    if (!fix.played && fix.date && fix.date <= state.currentDate) {
      updatedNt = updateFixtureInNationalState(
        updatedNt,
        { ...fix, status: 'READY_FOR_USER' },
        calendarYear
      ).nextNt;
    }
  }
  updatedNt.windows = syncLegacyWindowsFromTeamFixtures(updatedNt, calendarYear);

  const welcomeMsg: InboxMessage = {
    id: `msg_nt_appointed_${teamId}_${Date.now()}`,
    title: `${state.managerName} assume o comando da Seleção de ${team.name} (${team.federationCode})`,
    message: `A federação ${team.federationCode} oficializou sua contratação como treinador de ${team.name} em regime de duplo comando! Os jogos de ${team.name} nas Eliminatórias, Copas Continentais e Copa do Mundo FIFA já aparecem no seu Calendário.`,
    date: state.currentDate,
    round: state.currentRound,
    read: false,
    type: 'NATIONAL_TEAM',
  };

  return appendNationalMovementsToState(
    {
      ...state,
      nationalTeam: updatedNt,
      inbox: [welcomeMsg, ...state.inbox],
    },
    movements
  );
}

export function acceptCbfCoachingRole(state: GameSave): GameSave {
  const inviteTeamId = state.nationalTeam?.pendingInviteTeamId || 'nt_bra';
  return appointUserToNationalTeam(state, inviteTeamId);
}

export function acceptNationalTeamJobOffer(state: GameSave, offerId: string): GameSave {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  const offer = (nt.pendingNationalOffers || []).find(
    (o) => o.id === offerId && o.status === 'PENDING'
  );
  if (!offer) return state;
  return appointUserToNationalTeam(state, offer.teamId, offer.id);
}

export function declineNationalTeamJobOffer(state: GameSave, offerId: string): GameSave {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  const target = (nt.pendingNationalOffers || []).find((o) => o.id === offerId);
  const nextOffers = (nt.pendingNationalOffers || []).map((o) =>
    o.id === offerId ? { ...o, status: 'DECLINED' as const } : o
  );
  const flags = syncLegacyNationalInviteFlags(nt, nextOffers);
  return {
    ...state,
    nationalTeam: {
      ...nt,
      pendingNationalOffers: nextOffers,
      hasPendingCbfInvite: flags.hasPendingCbfInvite,
      pendingInviteTeamId: flags.pendingInviteTeamId,
      inviteDeclinedSeason:
        target?.teamId === 'nt_bra' ? state.currentSeasonYear : nt.inviteDeclinedSeason,
    },
  };
}

export function declineCbfCoachingInvite(state: GameSave): GameSave {
  if (!state.nationalTeam) return state;
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  const braPending = (nt.pendingNationalOffers || []).find(
    (o) => o.teamId === (nt.pendingInviteTeamId || 'nt_bra') && o.status === 'PENDING'
  );
  if (braPending) {
    return declineNationalTeamJobOffer(state, braPending.id);
  }
  return {
    ...state,
    nationalTeam: {
      ...nt,
      hasPendingCbfInvite: false,
      pendingInviteTeamId: null,
      inviteDeclinedSeason: state.currentSeasonYear,
    },
  };
}

export function scoutNationalTeamVacancies(state: GameSave): {
  updatedState: GameSave;
  offersCount: number;
  feedbackText: string;
} {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  const reputation = state.managerCareer?.managerReputation || 55;
  const excludeIds = nt.isUserCoach && nt.userTeamId ? [nt.userTeamId] : [];
  const existingPending = (nt.pendingNationalOffers || []).filter((o) => o.status === 'PENDING');
  if (existingPending.length >= 4) {
    return {
      updatedState: state,
      offersCount: existingPending.length,
      feedbackText: `Você já possui ${existingPending.length} convites de seleções pendentes para avaliar.`,
    };
  }

  const newOffers = generateNationalTeamOffers(
    nt,
    reputation,
    state.currentDate,
    excludeIds,
    'Interesse direto captado no mercado de seleções',
    3 - existingPending.length,
    true
  );

  if (newOffers.length === 0) {
    return {
      updatedState: state,
      offersCount: existingPending.length,
      feedbackText: 'Nenhuma nova federação disponível no mercado de seleções neste momento.',
    };
  }

  const nextOffers = [...newOffers, ...(nt.pendingNationalOffers || [])].slice(0, 10);
  const flags = syncLegacyNationalInviteFlags(nt, nextOffers);

  const inboxMsg: InboxMessage = {
    id: `msg_nt_scout_${Date.now()}`,
    title: `Sondagem de Seleções: ${newOffers.length} nova(s) federação(ões) interessada(s)`,
    message: `Seu agente consultou federações nacionais e recebeu propostas de: ${newOffers
      .map((o) => `${o.teamName} (${o.federationCode})`)
      .join(', ')}.`,
    date: state.currentDate,
    round: state.currentRound,
    read: false,
    type: 'NATIONAL_TEAM',
  };

  return {
    updatedState: {
      ...state,
      inbox: [inboxMsg, ...state.inbox],
      nationalTeam: {
        ...nt,
        pendingNationalOffers: nextOffers,
        hasPendingCbfInvite: flags.hasPendingCbfInvite,
        pendingInviteTeamId: flags.pendingInviteTeamId,
      },
    },
    offersCount: newOffers.length,
    feedbackText: `${newOffers.length} nova(s) seleção(ões) abriram negociação oficial com você!`,
  };
}

export function applyForNationalTeamCoachingJob(
  state: GameSave,
  targetTeamId: string
): {
  accepted: boolean;
  feedbackText: string;
  updatedState: GameSave;
} {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  const team = getNationalTeamById(targetTeamId);
  const reputation = state.managerCareer?.managerReputation || 55;

  if (nt.isUserCoach && (nt.userTeamId || 'nt_bra') === targetTeamId) {
    return {
      accepted: false,
      feedbackText: `Você já comanda a seleção de ${team.name} atualmente.`,
      updatedState: state,
    };
  }

  const alreadyPending = (nt.pendingNationalOffers || []).find(
    (o) => o.teamId === targetTeamId && o.status === 'PENDING'
  );
  if (alreadyPending) {
    return {
      accepted: true,
      feedbackText: `A ${team.federationCode} já enviou um convite oficial de ${team.name} aguardando sua assinatura!`,
      updatedState: state,
    };
  }

  const coachesMap = ensureNationalTeamCoachesMap(nt, state.managerName);
  const curCoach = coachesMap[targetTeamId] || buildInitialCoachRecordForTeam(team);
  const requiredRep = Math.max(32, team.minReputationToCoach - (curCoach.security <= 55 ? 8 : 0));

  if (reputation < requiredRep) {
    return {
      accepted: false,
      feedbackText: `A federação ${team.federationCode} avaliou seu currículo (${reputation}/100), mas exige prestígio mínimo de ${requiredRep}/100 para dirigir ${team.name}.`,
      updatedState: state,
    };
  }

  if (curCoach.security > 62 && reputation < team.minReputationToCoach + 12) {
    return {
      accepted: false,
      feedbackText: `A ${team.federationCode} informou que respalda o trabalho de ${curCoach.coachName} em ${team.name} (estabilidade ${curCoach.security}%).`,
      updatedState: state,
    };
  }

  const newOffer: NationalTeamJobOffer = {
    id: `nt_offer_apply_${team.id}_${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    teamCode: team.code,
    federationCode: team.federationCode,
    confederation: team.confederation,
    strength: team.strength,
    primaryColor: team.primaryColor,
    textColor: team.textColor,
    reason: `Candidatura aprovada pela ${team.federationCode} para substituir ${curCoach.coachName} (estabilidade ${curCoach.security}%)`,
    createdDate: state.currentDate,
    expiresDate: addDays(state.currentDate, 45),
    status: 'PENDING',
  };

  const nextOffers = [newOffer, ...(nt.pendingNationalOffers || [])].slice(0, 10);
  const flags = syncLegacyNationalInviteFlags(nt, nextOffers);

  const inboxMsg: InboxMessage = {
    id: `msg_nt_apply_ok_${team.id}_${Date.now()}`,
    title: `Convite Oficial: ${team.name} (${team.federationCode}) aprova seu nome!`,
    message: `A federação ${team.federationCode} aceitou sua candidatura para assumir ${team.name} em duplo comando. Assine na aba Seleções ou Propostas.`,
    date: state.currentDate,
    round: state.currentRound,
    read: false,
    type: 'NATIONAL_TEAM',
  };

  return {
    accepted: true,
    feedbackText: `Candidatura aprovada pela ${team.federationCode}! Convite oficial de ${team.name} enviado às suas Propostas.`,
    updatedState: {
      ...state,
      inbox: [inboxMsg, ...state.inbox],
      nationalTeam: {
        ...nt,
        pendingNationalOffers: nextOffers,
        hasPendingCbfInvite: flags.hasPendingCbfInvite,
        pendingInviteTeamId: flags.pendingInviteTeamId,
      },
    },
  };
}

export function acknowledgeNationalTeamDismissal(state: GameSave): GameSave {
  if (!state.nationalTeam?.lastDismissal) return state;
  return {
    ...state,
    nationalTeam: {
      ...state.nationalTeam,
      lastDismissal: {
        ...state.nationalTeam.lastDismissal,
        acknowledged: true,
      },
    },
  };
}

export function resignFromSelecaoRole(state: GameSave): GameSave {
  if (!state.nationalTeam) return state;
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  const leftTeamId = nt.userTeamId;
  const coachesMap = ensureNationalTeamCoachesMap(nt, state.managerName);
  const movements: CoachMovementRecord[] = [];

  if (leftTeamId) {
    const team = getNationalTeamById(leftTeamId);
    const replacement = pickReplacementNationalCoach(coachesMap, team, [state.managerName]);
    coachesMap[leftTeamId] = {
      coachName: replacement.coachName,
      nationality: replacement.nationality,
      prestige: replacement.prestige,
      security: 75,
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    };
    movements.push({
      id: `cmov_nt_resign_${leftTeamId}_${Date.now()}`,
      entityType: 'NATIONAL_TEAM',
      date: state.currentDate,
      round: state.currentRound,
      seasonYear: state.currentSeasonYear,
      clubId: team.id,
      clubName: team.name,
      clubDivision: 'SELECAO',
      confederation: team.confederation,
      sackedCoachName: state.managerName,
      hiredCoachName: replacement.coachName,
      reason: `Pedido de demissão de ${state.managerName} da seleção`,
      eventType: 'USER_RESIGNED',
    });
  }

  const closedStints = (nt.nationalStints || []).map((s, idx) =>
    idx === 0 && s.statusLabel === 'Cargo Atual'
      ? {
          ...s,
          endDate: state.currentDate,
          statusLabel: 'Deixou o Cargo' as const,
        }
      : s
  );

  const nextNt: NationalTeamState = {
    ...nt,
    isUserCoach: false,
    userTeamId: null,
    hasPendingCbfInvite: false,
    pendingInviteTeamId: null,
    warningsIssued: 0,
    teamCoaches: coachesMap,
    nationalStints: closedStints,
    inviteDeclinedSeason: state.currentSeasonYear,
  };
  nextNt.windows = syncLegacyWindowsFromTeamFixtures(nextNt, state.currentSeasonYear);
  return appendNationalMovementsToState(
    {
      ...state,
      nationalTeam: nextNt,
    },
    movements
  );
}

export function togglePlayerInSelecaoSquad(
  state: GameSave,
  playerId: string
): { updatedState: GameSave; feedback: string } {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  if (!nt.isUserCoach) {
    return { updatedState: state, feedback: 'Assuma uma Seleção para alterar a lista de 26 convocados.' };
  }

  const focusTeamId = nt.userTeamId || 'nt_bra';
  const pool = resolveNationalTeamPlayerPool(
    state.clubs,
    nt.virtualPlayers,
    focusTeamId,
    state.userClubId
  );

  const isCurrentlyCalled = nt.calledUpPlayerIds.includes(playerId);
  if (isCurrentlyCalled) {
    if (nt.calledUpPlayerIds.length <= MIN_SELECAO_SQUAD_SIZE) {
      return {
        updatedState: state,
        feedback: `Mantenha pelo menos ${MIN_SELECAO_SQUAD_SIZE} atletas na lista antes de realizar novos cortes.`,
      };
    }
    const rawCalled = nt.calledUpPlayerIds.filter((id) => id !== playerId);
    let nextStarters = nt.starterPlayerIds.filter((id) => id !== playerId);
    if (nextStarters.length < 11) {
      const replacement = rawCalled.find((id) => !nextStarters.includes(id));
      if (replacement) nextStarters = [...nextStarters, replacement];
    }
    const nextCalled = sortNationalPlayerIdsByPosition(rawCalled, pool, nextStarters);
    const nextCaptain =
      nt.captainPlayerId === playerId ? nextStarters[0] : nt.captainPlayerId;
    const nextCustomPositions = nt.customPositions ? { ...nt.customPositions } : undefined;
    if (nextCustomPositions) {
      delete nextCustomPositions[playerId];
    }
    return {
      updatedState: {
        ...state,
        nationalTeam: {
          ...nt,
          captainPlayerId: nextCaptain,
          calledUpPlayerIds: nextCalled,
          starterPlayerIds: nextStarters,
          customPositions: nextCustomPositions,
        },
      },
      feedback: `Atleta cortado da convocação (${nextCalled.length}/${MAX_SELECAO_SQUAD_SIZE}).`,
    };
  }

  if (nt.calledUpPlayerIds.length >= MAX_SELECAO_SQUAD_SIZE) {
    return {
      updatedState: state,
      feedback: `A lista oficial já está completa (${MAX_SELECAO_SQUAD_SIZE}/${MAX_SELECAO_SQUAD_SIZE}). Selecione um convocado para troca direta ou corte um atleta.`,
    };
  }

  const nextCalled = sortNationalPlayerIdsByPosition(
    [...nt.calledUpPlayerIds, playerId],
    pool,
    nt.starterPlayerIds
  );
  return {
    updatedState: {
      ...state,
      nationalTeam: {
        ...nt,
        calledUpPlayerIds: nextCalled,
      },
    },
    feedback: `Atleta convocado para a Seleção (${nextCalled.length}/${MAX_SELECAO_SQUAD_SIZE})!`,
  };
}

export function replacePlayerInSelecaoSquad(
  state: GameSave,
  outPlayerId: string,
  inPlayerId: string
): { updatedState: GameSave; feedback: string } {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  if (!nt.isUserCoach) {
    return { updatedState: state, feedback: 'Assuma uma Seleção para alterar os 26 convocados.' };
  }
  if (!nt.calledUpPlayerIds.includes(outPlayerId)) {
    return togglePlayerInSelecaoSquad(state, inPlayerId);
  }
  if (nt.calledUpPlayerIds.includes(inPlayerId)) {
    return { updatedState: state, feedback: 'Este atleta já faz parte dos 26 convocados.' };
  }

  const focusTeamId = nt.userTeamId || 'nt_bra';
  const pool = resolveNationalTeamPlayerPool(
    state.clubs,
    nt.virtualPlayers,
    focusTeamId,
    state.userClubId
  );

  const rawCalled = nt.calledUpPlayerIds.map((id) => (id === outPlayerId ? inPlayerId : id));
  const nextStarters = nt.starterPlayerIds.map((id) => (id === outPlayerId ? inPlayerId : id));
  const nextCalled = sortNationalPlayerIdsByPosition(rawCalled, pool, nextStarters);
  const nextCaptain = nt.captainPlayerId === outPlayerId ? inPlayerId : nt.captainPlayerId;
  let nextCustomPositions = nt.customPositions;
  if (nt.customPositions && nt.customPositions[outPlayerId]) {
    nextCustomPositions = { ...nt.customPositions };
    nextCustomPositions[inPlayerId] = nextCustomPositions[outPlayerId];
    delete nextCustomPositions[outPlayerId];
  }

  return {
    updatedState: {
      ...state,
      nationalTeam: {
        ...nt,
        captainPlayerId: nextCaptain,
        calledUpPlayerIds: nextCalled,
        starterPlayerIds: nextStarters,
        customPositions: nextCustomPositions,
      },
    },
    feedback: 'Substituição direta realizada na lista oficial de 26 convocados!',
  };
}

export function togglePlayerSelecaoStarter(
  state: GameSave,
  playerId: string
): { updatedState: GameSave; feedback: string } {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  if (!nt.isUserCoach) {
    return { updatedState: state, feedback: 'Assuma uma Seleção para escalar os titulares.' };
  }
  if (!nt.calledUpPlayerIds.includes(playerId)) {
    return { updatedState: state, feedback: 'Convoque o atleta antes de escalá-lo como titular.' };
  }

  const isStarter = nt.starterPlayerIds.includes(playerId);
  if (isStarter) {
    return {
      updatedState: {
        ...state,
        nationalTeam: {
          ...nt,
          starterPlayerIds: nt.starterPlayerIds.filter((id) => id !== playerId),
        },
      },
      feedback: 'Atleta movido para o banco de reservas.',
    };
  }

  if (nt.starterPlayerIds.length >= 11) {
    return {
      updatedState: state,
      feedback: 'Os 11 titulares já estão escalados. Clique em dois jogadores no campo/banco para trocar de vaga!',
    };
  }

  return {
    updatedState: {
      ...state,
      nationalTeam: {
        ...nt,
        starterPlayerIds: [...nt.starterPlayerIds, playerId],
      },
    },
    feedback: 'Atleta escalado entre os 11 titulares!',
  };
}

export function swapSelecaoLineupPlayers(
  state: GameSave,
  firstPlayerId: string,
  secondPlayerId: string
): { updatedState: GameSave; feedback: string } {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  if (!nt.isUserCoach) {
    return { updatedState: state, feedback: 'Assuma uma Seleção para escalar os titulares.' };
  }
  if (firstPlayerId === secondPlayerId) {
    return { updatedState: state, feedback: '' };
  }
  if (
    !nt.calledUpPlayerIds.includes(firstPlayerId) ||
    !nt.calledUpPlayerIds.includes(secondPlayerId)
  ) {
    return { updatedState: state, feedback: 'Ambos os atletas precisam estar entre os 26 convocados.' };
  }

  const starters = [...nt.starterPlayerIds];
  const idxA = starters.indexOf(firstPlayerId);
  const idxB = starters.indexOf(secondPlayerId);
  const nextCustom = { ...(nt.customPositions || {}) };

  if (idxA !== -1 && idxB !== -1) {
    // Starter <-> Starter position swap on tactical pitch (swap slots AND custom coordinates)
    starters[idxA] = secondPlayerId;
    starters[idxB] = firstPlayerId;
    const posA = nextCustom[firstPlayerId];
    const posB = nextCustom[secondPlayerId];
    if (posB) nextCustom[firstPlayerId] = posB;
    else delete nextCustom[firstPlayerId];
    if (posA) nextCustom[secondPlayerId] = posA;
    else delete nextCustom[secondPlayerId];

    return {
      updatedState: {
        ...state,
        nationalTeam: {
          ...nt,
          starterPlayerIds: starters,
          customPositions: Object.keys(nextCustom).length > 0 ? nextCustom : undefined,
        },
      },
      feedback: 'Posições trocadas em campo!',
    };
  }

  if (idxA !== -1 && idxB === -1) {
    starters[idxA] = secondPlayerId;
    if (nextCustom[firstPlayerId]) {
      nextCustom[secondPlayerId] = nextCustom[firstPlayerId];
      delete nextCustom[firstPlayerId];
    }
    return {
      updatedState: {
        ...state,
        nationalTeam: {
          ...nt,
          starterPlayerIds: starters,
          customPositions: Object.keys(nextCustom).length > 0 ? nextCustom : undefined,
        },
      },
      feedback: 'Alteração confirmada nos 11 titulares!',
    };
  }

  if (idxA === -1 && idxB !== -1) {
    starters[idxB] = firstPlayerId;
    if (nextCustom[secondPlayerId]) {
      nextCustom[firstPlayerId] = nextCustom[secondPlayerId];
      delete nextCustom[secondPlayerId];
    }
    return {
      updatedState: {
        ...state,
        nationalTeam: {
          ...nt,
          starterPlayerIds: starters,
          customPositions: Object.keys(nextCustom).length > 0 ? nextCustom : undefined,
        },
      },
      feedback: 'Alteração confirmada nos 11 titulares!',
    };
  }

  return { updatedState: state, feedback: 'Selecione ao menos um titular para realizar a troca.' };
}

export function moveSelecaoPlayerToCustomCoords(
  state: GameSave,
  playerId: string,
  targetX: number,
  targetY: number,
  explicitCode?: string,
  explicitLabel?: string
): { updatedState: GameSave; feedback: string } {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  if (!nt.isUserCoach) {
    return { updatedState: state, feedback: 'Assuma uma Seleção para mover jogadores no campo.' };
  }
  if (!nt.calledUpPlayerIds.includes(playerId)) {
    return { updatedState: state, feedback: 'Convoque o atleta antes de posicioná-lo em campo.' };
  }

  const focusTeamId = nt.userTeamId || 'nt_bra';
  const formation = nt.formation || '4-3-3';
  const baseSlots = SELECAO_FORMATION_SLOTS[formation] || SELECAO_FORMATION_SLOTS['4-3-3'];
  const pool = resolveNationalTeamPlayerPool(
    state.clubs,
    nt.virtualPlayers,
    focusTeamId,
    state.userClubId
  );
  const poolById = new Map(pool.map((p) => [p.id, p]));
  const movingPlayer = poolById.get(playerId);
  if (!movingPlayer) {
    return { updatedState: state, feedback: '' };
  }

  let starters = nt.starterPlayerIds.filter((id) => nt.calledUpPlayerIds.includes(id));
  for (const id of nt.calledUpPlayerIds) {
    if (starters.length >= 11) break;
    if (!starters.includes(id)) starters.push(id);
  }
  starters = starters.slice(0, 11);

  const nextCustom: Record<string, { x: number; y: number; code: string; label?: string }> = {
    ...(nt.customPositions || {}),
  };

  const currentSlotsResolved = baseSlots.map((preset, idx) => {
    const sid = starters[idx];
    const cust = sid ? nextCustom[sid] : undefined;
    if (cust) {
      const inf = inferTacticalZoneFromCoords(cust.x, cust.y);
      return { x: cust.x, y: cust.y, role: inf.role, code: cust.code || inf.code };
    }
    return { x: preset.x, y: preset.y, role: preset.role, code: preset.code };
  });

  const starterIdx = starters.indexOf(playerId);

  let cleanX = Math.max(9, Math.min(91, Math.round(targetX * 10) / 10));
  let cleanY = Math.max(11, Math.min(90, Math.round(targetY * 10) / 10));

  let replacedStarterName: string | null = null;
  let replaceSlotIdx = -1;

  if (starterIdx === -1) {
    const inferredTarget = inferTacticalZoneFromCoords(cleanX, cleanY);
    if (inferredTarget.role === 'GOL') {
      const gkSlot = currentSlotsResolved.findIndex((pos) => pos.role === 'GOL');
      replaceSlotIdx = gkSlot !== -1 ? gkSlot : 0;
    } else {
      let bestDist = Infinity;
      currentSlotsResolved.forEach((pos, idx) => {
        if (pos.role === 'GOL') return;
        const d = Math.hypot(pos.x - cleanX, pos.y - cleanY);
        if (d < bestDist) {
          bestDist = d;
          replaceSlotIdx = idx;
        }
      });
      if (replaceSlotIdx === -1) replaceSlotIdx = 0;
    }
    const replacedId = starters[replaceSlotIdx];
    if (replacedId) {
      replacedStarterName = poolById.get(replacedId)?.name || null;
      delete nextCustom[replacedId];
    }
    starters[replaceSlotIdx] = playerId;
  }

  for (let i = 0; i < currentSlotsResolved.length; i++) {
    const sid = starters[i];
    if (!sid || sid === playerId) continue;
    const pos = currentSlotsResolved[i];
    const dx = cleanX - pos.x;
    const dy = cleanY - pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 7.5) {
      const angle = dist === 0 ? 0 : Math.atan2(dy, dx);
      cleanX = Math.max(9, Math.min(91, Math.round((pos.x + Math.cos(angle) * 8) * 10) / 10));
      cleanY = Math.max(11, Math.min(90, Math.round((pos.y + Math.sin(angle) * 8) * 10) / 10));
    }
  }

  const finalInferred = inferTacticalZoneFromCoords(cleanX, cleanY);
  const roleCode = explicitCode || finalInferred.code;
  const roleLabel = explicitLabel || finalInferred.label;

  nextCustom[playerId] = {
    x: cleanX,
    y: cleanY,
    code: roleCode,
    label: roleLabel,
  };

  return {
    updatedState: {
      ...state,
      nationalTeam: {
        ...nt,
        starterPlayerIds: starters,
        customPositions: nextCustom,
      },
    },
    feedback:
      starterIdx !== -1
        ? `${movingPlayer.name} posicionado em ${roleLabel} (${roleCode}).`
        : `${movingPlayer.name} escalado em ${roleLabel} (${roleCode})${
            replacedStarterName ? ` no lugar de ${replacedStarterName}` : ''
          }.`,
  };
}

export function resetSelecaoCustomPositions(state: GameSave): GameSave {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  if (!nt.isUserCoach) return state;
  return {
    ...state,
    nationalTeam: {
      ...nt,
      customPositions: undefined,
    },
  };
}

export function updateSelecaoFormation(
  state: GameSave,
  formation: FormationType
): GameSave {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  if (!nt.isUserCoach) return state;

  const focusTeamId = nt.userTeamId || 'nt_bra';
  const pool = resolveNationalTeamPlayerPool(
    state.clubs,
    nt.virtualPlayers,
    focusTeamId,
    state.userClubId
  );
  const poolById = new Map(pool.map((p) => [p.id, p]));
  const currentStarterObjs = nt.starterPlayerIds
    .map((id) => poolById.get(id))
    .filter((p): p is ResolvedNationalPlayer => Boolean(p));

  const reorderedStarters =
    currentStarterObjs.length === 11
      ? fitPlayersToSelecaoFormation(currentStarterObjs, formation)
      : nt.starterPlayerIds;

  return {
    ...state,
    nationalTeam: {
      ...nt,
      formation,
      starterPlayerIds: reorderedStarters,
      customPositions: undefined,
    },
  };
}

export function autoPickSelecaoStartersOnly(state: GameSave): GameSave {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  if (!nt.isUserCoach) return state;

  const focusTeamId = nt.userTeamId || 'nt_bra';
  const formation = nt.formation || '4-3-3';
  const pool = resolveNationalTeamPlayerPool(
    state.clubs,
    nt.virtualPlayers,
    focusTeamId,
    state.userClubId
  );
  const poolById = new Map(pool.map((p) => [p.id, p]));
  const calledPlayers = nt.calledUpPlayerIds
    .map((id) => poolById.get(id))
    .filter((p): p is ResolvedNationalPlayer => Boolean(p));

  const best11 = fitPlayersToSelecaoFormation(calledPlayers, formation);
  const starterSet = new Set(best11);
  const nextCaptain =
    nt.captainPlayerId && starterSet.has(nt.captainPlayerId)
      ? nt.captainPlayerId
      : best11[0] || nt.captainPlayerId;

  return {
    ...state,
    nationalTeam: {
      ...nt,
      starterPlayerIds: best11,
      captainPlayerId: nextCaptain,
      customPositions: undefined,
    },
  };
}

export function setSelecaoCaptain(state: GameSave, playerId: string): GameSave {
  const nt = ensureUpgradedNationalTeamState(
    state.nationalTeam,
    state.clubs,
    state.currentSeasonYear
  );
  if (!nt.isUserCoach || !nt.calledUpPlayerIds.includes(playerId)) return state;
  return {
    ...state,
    nationalTeam: {
      ...nt,
      captainPlayerId: playerId,
    },
  };
}

// ============================================================================
// CALENDÁRIO DE DATAS FIFA & LIBERAÇÃO OBRIGATÓRIA DE ATLETAS DOS CLUBES
// ============================================================================

export interface FifaCalendarWindow {
  id: string;
  year: number;
  kind: 'FIFA_WINDOW' | 'WORLD_CUP' | 'CONTINENTAL_CUP';
  name: string;
  shortLabel: string;
  competitionSummary: string;
  releaseStartDate: string; // YYYY-MM-DD (apresentação / liberação obrigatória)
  endDate: string; // YYYY-MM-DD (último dia reservado)
  returnDate: string; // YYYY-MM-DD (reapresentação ao clube)
  officialMatchDates: string[];
  isSuperFifaWindow?: boolean;
  matchCountSummary?: string;
  seasonLabel?: string;
  detailNote?: string;
  specialEventDate?: string;
  regionTag?: 'CONMEBOL' | 'UEFA' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC' | 'GLOBAL';
}

export interface ClubCalledUpPlayerInfo {
  playerId: string;
  playerName: string;
  detailedRole: DetailedRole;
  overall: number;
  squadNumber: number;
  isClubStarter: boolean;
  nationalTeamId: string;
  nationalTeamName: string;
  nationalTeamCode: string;
  nationalTeamPrimaryColor: string;
  nationalTeamTextColor: string;
  isCoachedByUser: boolean;
  isSelecaoStarter: boolean;
}

/**
 * Returns all official FIFA International Windows, CONMEBOL, UEFA, CONCACAF, CAF, AFC & OFC tournaments
 * from 2026 through 2030 in accordance with the Official FIFA National Team Match Calendar.
 */
export interface OfficialSelecaoFifaCalendarEntry {
  id: string;
  year: number;
  periodLabel: string;
  label: string;
  category: 'Amistosos' | 'Data Fifa' | 'Copa do Mundo' | 'Copas Continentais';
  gamesCount: number | null;
  gamesLabel: string;
  startDate: string;
  endDate: string;
  description: string;
}

export const OFFICIAL_SELECOES_FIFA_CALENDAR_2026_2030: OfficialSelecaoFifaCalendarEntry[] = [
  // 2026
  {
    id: 'cal_2026_mar',
    year: 2026,
    periodLabel: '23 a 31 de março',
    label: 'Amistosos de Março 2026',
    category: 'Amistosos',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2026-03-23',
    endDate: '2026-03-31',
    description: 'Amistosos Internacionais preparatórios pré-Copa do Mundo.',
  },
  {
    id: 'cal_2026_jun',
    year: 2026,
    periodLabel: '1 a 9 de junho',
    label: 'Amistosos de Junho 2026',
    category: 'Amistosos',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2026-06-01',
    endDate: '2026-06-09',
    description: 'Amistosos finais antes da abertura da Copa do Mundo.',
  },
  {
    id: 'cal_2026_wc',
    year: 2026,
    periodLabel: 'junho/julho',
    label: 'Copa do Mundo FIFA 2026',
    category: 'Copa do Mundo',
    gamesCount: null,
    gamesLabel: 'Torneio Mundial (48 seleções)',
    startDate: '2026-06-11',
    endDate: '2026-07-19',
    description: 'Copa do Mundo FIFA de 2026 (Estados Unidos, México e Canadá).',
  },
  {
    id: 'cal_2026_sep_oct',
    year: 2026,
    periodLabel: '21 de setembro a 6 de outubro',
    label: 'Data FIFA de Setembro/Outubro 2026',
    category: 'Data Fifa',
    gamesCount: 4,
    gamesLabel: '4 jogos',
    startDate: '2026-09-21',
    endDate: '2026-10-06',
    description: 'Janela estendida pós-Copa com 4 jogos por seleção (Eliminatórias, Nations League e Amistosos).',
  },
  {
    id: 'cal_2026_nov',
    year: 2026,
    periodLabel: '9 a 17 de novembro',
    label: 'Data FIFA de Novembro 2026',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2026-11-09',
    endDate: '2026-11-17',
    description: 'Última Data FIFA da temporada 2026.',
  },

  // 2027
  {
    id: 'cal_2027_mar',
    year: 2027,
    periodLabel: '22 a 30 de março',
    label: 'Data FIFA de Março 2027',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2027-03-22',
    endDate: '2027-03-30',
    description: 'Primeira janela oficial da temporada 2027.',
  },
  {
    id: 'cal_2027_jun',
    year: 2027,
    periodLabel: '7 a 15 de junho',
    label: 'Data FIFA de Junho 2027',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2027-06-07',
    endDate: '2027-06-15',
    description: 'Data FIFA de meio de ano (sem parada de Copa).',
  },
  {
    id: 'cal_2027_copa_ouro',
    year: 2027,
    periodLabel: '17 de junho a 11 de julho',
    label: 'Copa Ouro da CONCACAF 2027 (16 Seleções)',
    category: 'Copas Continentais',
    gamesCount: null,
    gamesLabel: 'Copa Ouro (Bienal)',
    startDate: '2027-06-17',
    endDate: '2027-07-11',
    description: 'Copa Ouro da CONCACAF 2027 com 16 seleções (4 grupos de 4 + Quartas, Semifinais e Final).',
  },
  {
    id: 'cal_2027_sep_oct',
    year: 2027,
    periodLabel: '20 de setembro a 5 de outubro',
    label: 'Data FIFA de Setembro/Outubro 2027',
    category: 'Data Fifa',
    gamesCount: 4,
    gamesLabel: '4 jogos',
    startDate: '2027-09-20',
    endDate: '2027-10-05',
    description: 'Janela estendida com 4 jogos por seleção.',
  },
  {
    id: 'cal_2027_nov',
    year: 2027,
    periodLabel: '8 a 16 de novembro',
    label: 'Data FIFA de Novembro 2027',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2027-11-08',
    endDate: '2027-11-16',
    description: 'Encerramento das Datas FIFA de 2027.',
  },

  // 2028
  {
    id: 'cal_2028_mar',
    year: 2028,
    periodLabel: '20 a 28 de março',
    label: 'Data FIFA de Março 2028',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2028-03-20',
    endDate: '2028-03-28',
    description: 'Janela de março para repescagens continentais e amistosos.',
  },
  {
    id: 'cal_2028_may_jun',
    year: 2028,
    periodLabel: '29 de maio a 6 de junho',
    label: 'Data FIFA de Maio/Junho 2028',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2028-05-29',
    endDate: '2028-06-06',
    description: 'Testes finais antes das Copas Continentais de 2028.',
  },
  {
    id: 'cal_2028_continentals',
    year: 2028,
    periodLabel: 'junho/julho',
    label: 'Copa América (c/ 6 CONCACAF), Eurocopa, Copa da África, Copa da Ásia e Copa da Oceania',
    category: 'Copas Continentais',
    gamesCount: null,
    gamesLabel: '5 Copas Continentais',
    startDate: '2028-06-09',
    endDate: '2028-07-16',
    description: 'Torneios continentais simultâneos: Copa América (com 6 convidados da CONCACAF), Eurocopa, CAN, Copa da Ásia e Copa da Oceania. A Copa Ouro ocorre em anos ímpares (2027, 2029...).',
  },
  {
    id: 'cal_2028_sep_oct',
    year: 2028,
    periodLabel: '18 de setembro a 3 de outubro',
    label: 'Data FIFA de Setembro/Outubro 2028',
    category: 'Data Fifa',
    gamesCount: 4,
    gamesLabel: '4 jogos',
    startDate: '2028-09-18',
    endDate: '2028-10-03',
    description: 'Janela estendida pós-Copas Continentais (4 jogos).',
  },
  {
    id: 'cal_2028_nov',
    year: 2028,
    periodLabel: '13 a 21 de novembro',
    label: 'Data FIFA de Novembro 2028',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2028-11-13',
    endDate: '2028-11-21',
    description: 'Última janela FIFA de 2028.',
  },

  // 2029
  {
    id: 'cal_2029_mar',
    year: 2029,
    periodLabel: '19 a 27 de março',
    label: 'Data FIFA de Março 2029',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2029-03-19',
    endDate: '2029-03-27',
    description: 'Janela de março das Eliminatórias rumo à Copa de 2030.',
  },
  {
    id: 'cal_2029_jun',
    year: 2029,
    periodLabel: '4 a 12 de junho',
    label: 'Data FIFA de Junho 2029',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2029-06-04',
    endDate: '2029-06-12',
    description: 'Data FIFA de junho (Finais da Nations League e Eliminatórias).',
  },
  {
    id: 'cal_2029_copa_ouro',
    year: 2029,
    periodLabel: '17 de junho a 11 de julho',
    label: 'Copa Ouro da CONCACAF 2029 (16 Seleções)',
    category: 'Copas Continentais',
    gamesCount: null,
    gamesLabel: 'Copa Ouro (Bienal)',
    startDate: '2029-06-17',
    endDate: '2029-07-11',
    description: 'Copa Ouro da CONCACAF 2029 com 16 seleções (ensaio oficial da região antes da Copa do Mundo 2030).',
  },
  {
    id: 'cal_2029_sep_oct',
    year: 2029,
    periodLabel: '29 de setembro a 9 de outubro',
    label: 'Data FIFA de Setembro/Outubro 2029',
    category: 'Data Fifa',
    gamesCount: 4,
    gamesLabel: '4 jogos',
    startDate: '2029-09-29',
    endDate: '2029-10-09',
    description: 'Janela de 4 jogos para definição de vagas da Copa do Mundo de 2030.',
  },
  {
    id: 'cal_2029_nov',
    year: 2029,
    periodLabel: '12 a 20 de novembro',
    label: 'Data FIFA de Novembro 2029',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2029-11-12',
    endDate: '2029-11-20',
    description: 'Última Data FIFA de 2029.',
  },

  // 2030
  {
    id: 'cal_2030_mar',
    year: 2030,
    periodLabel: '18 a 26 de março',
    label: 'Data FIFA de Março 2030',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2030-03-18',
    endDate: '2030-03-26',
    description: 'Repescagem Mundial e últimos testes de março pré-Copa.',
  },
  {
    id: 'cal_2030_jun',
    year: 2030,
    periodLabel: '3 a 11 de junho',
    label: 'Data FIFA de Junho 2030',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2030-06-03',
    endDate: '2030-06-11',
    description: 'Amistosos finais e concentração antes da Copa do Mundo 2030.',
  },
  {
    id: 'cal_2030_wc',
    year: 2030,
    periodLabel: 'junho/julho',
    label: 'Copa do Mundo FIFA 2030',
    category: 'Copa do Mundo',
    gamesCount: null,
    gamesLabel: 'Torneio Mundial (Centenário)',
    startDate: '2030-06-08',
    endDate: '2030-07-21',
    description: 'Copa do Mundo FIFA de 2030 (Centenário na América do Sul + Espanha, Portugal e Marrocos).',
  },
  {
    id: 'cal_2030_sep_oct',
    year: 2030,
    periodLabel: '23 de setembro a 8 de outubro',
    label: 'Data FIFA de Setembro/Outubro 2030',
    category: 'Data Fifa',
    gamesCount: 4,
    gamesLabel: '4 jogos',
    startDate: '2030-09-23',
    endDate: '2030-10-08',
    description: 'Janela estendida pós-Copa com 4 jogos por seleção.',
  },
  {
    id: 'cal_2030_nov',
    year: 2030,
    periodLabel: '11 a 19 de novembro',
    label: 'Data FIFA de Novembro 2030',
    category: 'Data Fifa',
    gamesCount: 2,
    gamesLabel: '2 jogos',
    startDate: '2030-11-11',
    endDate: '2030-11-19',
    description: 'Encerramento das Datas FIFA de 2030.',
  },
];

export function buildOfficialSelecoesFifaCalendar2026To2038(): OfficialSelecaoFifaCalendarEntry[] {
  const entries: OfficialSelecaoFifaCalendarEntry[] = [...OFFICIAL_SELECOES_FIFA_CALENDAR_2026_2030];

  const formatPtPeriod = (isoStart: string, isoEnd: string): string => {
    const months = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ];
    const [, sm, sd] = isoStart.split('-').map(Number);
    const [, em, ed] = isoEnd.split('-').map(Number);
    if (sm === em) {
      return `${sd} a ${ed} de ${months[sm - 1]}`;
    }
    return `${sd} de ${months[sm - 1]} a ${ed} de ${months[em - 1]}`;
  };

  for (let yr = 2031; yr <= 2038; yr++) {
    const w = getFifaWindowDatesForYear(yr);
    const marStart = addDays(w.mar1, -3);
    const marEnd = addDays(w.mar2, 1);
    const junStart = addDays(w.jun1, -3);
    const junEnd = addDays(w.jun2, 1);
    const sepStart = addDays(w.sep1, -3);
    const octEnd = addDays(w.oct2, 1);
    const novStart = addDays(w.nov1, -3);
    const novEnd = addDays(w.nov2, 1);
    const mod = yr % 4;

    entries.push({
      id: `cal_${yr}_mar`,
      year: yr,
      periodLabel: formatPtPeriod(marStart, marEnd),
      label: `Data FIFA de Março ${yr}`,
      category: 'Data Fifa',
      gamesCount: 2,
      gamesLabel: '2 jogos',
      startDate: marStart,
      endDate: marEnd,
      description:
        mod === 2
          ? `Repescagem Intercontinental da Copa do Mundo ${yr} e amistosos oficiais de preparação.`
          : mod === 0
          ? `Repescagens continentais, 2ª Fase das Eliminatórias CONCACAF e amistosos oficiais.`
          : mod === 3
          ? `Finais da Liga das Nações CONCACAF ${yr - 1}/${String(yr).slice(-2)} (Ligas A e B), Prelims da Copa Ouro ${yr} e Eliminatórias.`
          : `Finais da Liga das Nações CONCACAF ${yr - 1}/${String(yr).slice(-2)}, Prelims da Copa Ouro ${yr} e Eliminatórias da Copa ${yr + 1}.`,
    });

    entries.push({
      id: `cal_${yr}_jun`,
      year: yr,
      periodLabel: formatPtPeriod(junStart, junEnd),
      label: `Data FIFA de Junho ${yr}`,
      category: 'Data Fifa',
      gamesCount: 2,
      gamesLabel: '2 jogos',
      startDate: junStart,
      endDate: junEnd,
      description:
        mod === 2
          ? `Amistosos finais e concentração antes da Copa do Mundo FIFA ${yr}.`
          : mod === 0
          ? `Testes finais antes das Copas Continentais de ${yr} e início da Fase Final CONCACAF.`
          : `Data FIFA de meio de ano com Eliminatórias, Finais da Nations League e amistosos.`,
    });

    if (mod === 2) {
      entries.push({
        id: `cal_${yr}_wc`,
        year: yr,
        periodLabel: 'junho/julho',
        label: `Copa do Mundo FIFA ${yr}`,
        category: 'Copa do Mundo',
        gamesCount: null,
        gamesLabel: 'Torneio Mundial (48 seleções)',
        startDate: `${yr}-06-11`,
        endDate: `${yr}-07-19`,
        description: `Copa do Mundo FIFA ${yr} com 48 seleções das 6 confederações (12 grupos de 4 + mata-mata completo).`,
      });
    } else if (mod === 0) {
      entries.push({
        id: `cal_${yr}_continentals`,
        year: yr,
        periodLabel: 'junho/julho',
        label: `Copa América (c/ 6 CONCACAF), Eurocopa, CAN, Copa da Ásia e Copa da Oceania ${yr}`,
        category: 'Copas Continentais',
        gamesCount: null,
        gamesLabel: '5 Copas Continentais',
        startDate: `${yr}-06-09`,
        endDate: `${yr}-07-16`,
        description: `Torneios continentais simultâneos de ${yr} (Copa América com 6 convidados CONCACAF, Eurocopa, CAN, Copa da Ásia e Copa da Oceania).`,
      });
    } else {
      entries.push({
        id: `cal_${yr}_copa_ouro`,
        year: yr,
        periodLabel: '17 de junho a 11 de julho',
        label: `Copa Ouro da CONCACAF ${yr} (16 Seleções)`,
        category: 'Copas Continentais',
        gamesCount: null,
        gamesLabel: 'Copa Ouro (Bienal)',
        startDate: `${yr}-06-17`,
        endDate: `${yr}-07-11`,
        description: `Copa Ouro da CONCACAF ${yr} em formato bienal (16 seleções em 4 grupos de 4 + Quartas, Semis e Final).`,
      });
    }

    entries.push({
      id: `cal_${yr}_sep_oct`,
      year: yr,
      periodLabel: formatPtPeriod(sepStart, octEnd),
      label: `Data FIFA de Setembro/Outubro ${yr}`,
      category: 'Data Fifa',
      gamesCount: 4,
      gamesLabel: '4 jogos',
      startDate: sepStart,
      endDate: octEnd,
      description:
        mod === 2
          ? `Super Data FIFA pós-Copa (16 dias / 4 jogos), abertura da Liga das Nações UEFA e CONCACAF ${yr}/${String(yr + 1).slice(-2)}.`
          : mod === 3
          ? `Super Data FIFA de 4 jogos com Eliminatórias da Copa da Oceania ${yr + 1} e abertura das Eliminatórias CONCACAF para a Copa ${yr + 3}.`
          : mod === 0
          ? `Super Data FIFA pós-Copas Continentais (4 jogos) com Liga das Nações UEFA e CONCACAF ${yr}/${String(yr + 1).slice(-2)}.`
          : `Super Data FIFA decisiva de 4 jogos definindo vagas diretas das Eliminatórias para a Copa do Mundo ${yr + 1}.`,
    });

    entries.push({
      id: `cal_${yr}_nov`,
      year: yr,
      periodLabel: formatPtPeriod(novStart, novEnd),
      label: `Data FIFA de Novembro ${yr}`,
      category: 'Data Fifa',
      gamesCount: 2,
      gamesLabel: '2 jogos',
      startDate: novStart,
      endDate: novEnd,
      description:
        mod === 1
          ? `Última janela FIFA de ${yr}, incluindo Play-In CONCACAF para a Repescagem Intercontinental da Copa ${yr + 1}.`
          : `Encerramento das Datas FIFA da temporada ${yr}.`,
    });
  }

  return entries;
}

export const OFFICIAL_SELECOES_FIFA_CALENDAR_2026_2038: OfficialSelecaoFifaCalendarEntry[] =
  buildOfficialSelecoesFifaCalendar2026To2038();

export interface OfficialOceaniaCalendarEntry {
  id: string;
  year: number;
  cycleTag: string;
  periodLabel: string;
  label: string;
  category:
    | 'Amistosos'
    | 'Eliminatórias Oceania'
    | 'Copa da Oceania'
    | 'Eliminatórias Copa do Mundo'
    | 'Repescagem & Amistosos'
    | 'Copa do Mundo';
  gamesLabel: string;
  startDate: string;
  endDate: string;
  description: string;
}

export function buildOfficialOceaniaCalendar2026To2038(): OfficialOceaniaCalendarEntry[] {
  const entries: OfficialOceaniaCalendarEntry[] = [];

  for (let yr = 2026; yr <= 2038; yr++) {
    const w = getFifaWindowDatesForYear(yr);
    const sepStart = yr === 2026 ? '2026-09-21' : yr === 2028 ? '2028-09-18' : yr === 2030 ? '2030-09-23' : addDays(w.sep1, -3);
    const sepEnd = yr === 2026 ? '2026-10-06' : yr === 2028 ? '2028-10-03' : yr === 2030 ? '2030-10-08' : w.oct2;
    const novStart = yr === 2026 ? '2026-11-09' : yr === 2028 ? '2028-11-13' : yr === 2030 ? '2030-11-11' : addDays(w.nov1, -3);
    const novEnd = yr === 2026 ? '2026-11-17' : yr === 2028 ? '2028-11-21' : yr === 2030 ? '2030-11-19' : w.nov2;
    const marStart = yr === 2028 ? '2028-03-20' : yr === 2030 ? '2030-03-18' : addDays(w.mar1, -3);
    const marEnd = yr === 2028 ? '2028-03-28' : yr === 2030 ? '2030-03-26' : w.mar2;
    const junStart = yr === 2028 ? '2028-05-29' : yr === 2030 ? '2030-06-03' : addDays(w.jun1, -3);
    const junEnd = yr === 2028 ? '2028-06-06' : yr === 2030 ? '2030-06-08' : w.jun2;

    if (yr === 2026) {
      entries.push(
        {
          id: `ofc_cal_2026_sep_oct`,
          year: 2026,
          cycleTag: 'Pós-Copa do Mundo 2026',
          periodLabel: '21/09 a 06/10',
          label: 'Amistosos Internacionais OFC (Pós-Copa)',
          category: 'Amistosos',
          gamesLabel: '4 jogos',
          startDate: sepStart,
          endDate: sepEnd,
          description: 'Depois da Copa do Mundo de 2026: janela estendida de setembro/outubro com 4 amistosos para as seleções da Oceania.',
        },
        {
          id: `ofc_cal_2026_nov`,
          year: 2026,
          cycleTag: 'Pós-Copa do Mundo 2026',
          periodLabel: '09/11 a 17/11',
          label: 'Amistosos Internacionais OFC',
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: 'Janela de novembro pós-Copa com 2 jogos amistosos das seleções da Oceania.',
        }
      );
    } else if (yr % 4 === 3) {
      // 2027, 2031, 2035
      entries.push({
        id: `ofc_cal_${yr}_cont_qual`,
        year: yr,
        cycleTag: `Eliminatórias Copa da Oceania ${yr + 1}`,
        periodLabel: `Todo o ano de ${yr}`,
        label: `Eliminatórias para a Copa da Oceania ${yr + 1}`,
        category: 'Eliminatórias Oceania',
        gamesLabel: '10 jogos · 11 seleções',
        startDate: `${yr}-03-01`,
        endDate: `${yr}-11-25`,
        description: `As 11 seleções da Oceania se enfrentam entre si em turno único (10 jogos cada). Os 8 melhores se classificam para a Copa da Oceania de ${yr + 1} (2 grupos de 4, Top 2 às Semifinais e Final).`,
      });
    } else if (yr % 4 === 0) {
      // 2028, 2032, 2036
      entries.push(
        {
          id: `ofc_cal_${yr}_mar`,
          year: yr,
          cycleTag: `Temporada da Copa da Oceania ${yr}`,
          periodLabel: yr === 2028 ? '20 a 28 de março' : `${formatShortDate(marStart)} a ${formatShortDate(marEnd)}`,
          label: `Amistosos de Março ${yr}`,
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description: `Amistosos preparatórios de março rumo à Copa da Oceania ${yr}.`,
        },
        {
          id: `ofc_cal_${yr}_may_jun`,
          year: yr,
          cycleTag: `Temporada da Copa da Oceania ${yr}`,
          periodLabel: yr === 2028 ? '29/05 a 06/06' : `${formatShortDate(junStart)} a ${formatShortDate(junEnd)}`,
          label: `Amistosos Pré-Copa da Oceania ${yr}`,
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: junStart,
          endDate: junEnd,
          description: `Últimos 2 testes preparatórios antes do pontapé inicial da Copa da Oceania ${yr}.`,
        },
        {
          id: `ofc_cal_${yr}_copa_oceania`,
          year: yr,
          cycleTag: `Temporada da Copa da Oceania ${yr}`,
          periodLabel: 'Junho / Julho',
          label: `Copa da Oceania ${yr} (OFC)`,
          category: 'Copa da Oceania',
          gamesLabel: '8 seleções (2×4 + Semi/Final)',
          startDate: `${yr}-06-14`,
          endDate: `${yr}-07-11`,
          description: `Torneio continental da OFC com as 8 melhores seleções das Eliminatórias de ${yr - 1} divididas em 2 grupos de 4; os 2 melhores de cada grupo avançam às Semifinais e Grande Final.`,
        },
        {
          id: `ofc_cal_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Temporada da Copa da Oceania ${yr}`,
          periodLabel: yr === 2028 ? '18/09 a 03/10' : `${formatShortDate(sepStart)} a ${formatShortDate(sepEnd)}`,
          label: `Amistosos de Setembro/Outubro ${yr}`,
          category: 'Amistosos',
          gamesLabel: '4 jogos',
          startDate: sepStart,
          endDate: sepEnd,
          description: `Janela pós-Copa da Oceania com 4 amistosos oficiais por seleção.`,
        },
        {
          id: `ofc_cal_${yr}_nov`,
          year: yr,
          cycleTag: `Temporada da Copa da Oceania ${yr}`,
          periodLabel: yr === 2028 ? '13/11 a 21/11' : `${formatShortDate(novStart)} a ${formatShortDate(novEnd)}`,
          label: `Amistosos de Novembro ${yr}`,
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: `Fechamento do ano com 2 jogos amistosos na Data FIFA de novembro.`,
        }
      );
    } else if (yr % 4 === 1) {
      // 2029, 2033, 2037
      entries.push({
        id: `ofc_cal_${yr}_wc_qual`,
        year: yr,
        cycleTag: `Eliminatórias Copa do Mundo ${yr + 1}`,
        periodLabel: `Todo o ano de ${yr}`,
        label: `Eliminatórias OFC para a Copa do Mundo ${yr + 1}`,
        category: 'Eliminatórias Copa do Mundo',
        gamesLabel: '10 jogos · 11 seleções',
        startDate: `${yr}-03-01`,
        endDate: `${yr}-11-25`,
        description: `As 11 seleções da Oceania se enfrentam em turno único (10 jogos por seleção). O 1º lugar garante vaga direta na Copa do Mundo de ${yr + 1} e o 2º lugar vai para a Repescagem Intercontinental.`,
      });
    } else {
      // 2030, 2034, 2038 (Copa do Mundo)
      entries.push(
        {
          id: `ofc_cal_${yr}_mar`,
          year: yr,
          cycleTag: `Ano de Copa do Mundo ${yr}`,
          periodLabel: yr === 2030 ? '18 a 26 de março' : `${formatShortDate(marStart)} a ${formatShortDate(marEnd)}`,
          label: `Amistosos e Repescagem da Copa do Mundo ${yr}`,
          category: 'Repescagem & Amistosos',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description: `Disputa da Repescagem Intercontinental pelo 2º colocado da OFC em ${yr - 1} e amistosos das demais seleções oceânicas.`,
        },
        {
          id: `ofc_cal_${yr}_jun`,
          year: yr,
          cycleTag: `Ano de Copa do Mundo ${yr}`,
          periodLabel: yr === 2030 ? '03 a 08 de junho' : `${formatShortDate(junStart)} a ${formatShortDate(junEnd)}`,
          label: `Amistosos Pré-Copa ${yr}`,
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: junStart,
          endDate: junEnd,
          description: `Últimos 2 amistosos preparatórios antes da Copa do Mundo FIFA ${yr}.`,
        },
        {
          id: `ofc_cal_${yr}_wc`,
          year: yr,
          cycleTag: `Ano de Copa do Mundo ${yr}`,
          periodLabel: 'Junho / Julho',
          label: `Copa do Mundo FIFA ${yr}`,
          category: 'Copa do Mundo',
          gamesLabel: 'Torneio Mundial (48 seleções)',
          startDate: yr === 2030 ? '2030-06-08' : `${yr}-06-11`,
          endDate: yr === 2030 ? '2030-07-21' : `${yr}-07-19`,
          description: `Participação do campeão das Eliminatórias OFC (e eventual classificado via Repescagem) na Copa do Mundo FIFA ${yr}.`,
        },
        {
          id: `ofc_cal_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Pós-Copa do Mundo ${yr}`,
          periodLabel: yr === 2030 ? '23/09 a 08/10' : `${formatShortDate(sepStart)} a ${formatShortDate(sepEnd)}`,
          label: `Amistosos de Setembro/Outubro ${yr}`,
          category: 'Amistosos',
          gamesLabel: '4 jogos',
          startDate: sepStart,
          endDate: sepEnd,
          description: `Janela pós-Copa de 16 dias com 4 amistosos oficiais para as seleções da Oceania.`,
        },
        {
          id: `ofc_cal_${yr}_nov`,
          year: yr,
          cycleTag: `Pós-Copa do Mundo ${yr}`,
          periodLabel: yr === 2030 ? '11 a 19 de novembro' : `${formatShortDate(novStart)} a ${formatShortDate(novEnd)}`,
          label: `Amistosos de Novembro ${yr}`,
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: `Encerramento da temporada ${yr} com 2 amistosos em novembro.`,
        }
      );
    }
  }

  return entries;
}

export const OFFICIAL_OCEANIA_CALENDAR_2026_2038: OfficialOceaniaCalendarEntry[] =
  buildOfficialOceaniaCalendar2026To2038();

export interface OfficialConcacafCalendarEntry {
  id: string;
  year: number;
  cycleTag: string;
  periodLabel: string;
  label: string;
  category:
    | 'Liga das Nações'
    | 'Copa Ouro'
    | 'Eliminatórias Copa do Mundo'
    | 'Copa América'
    | 'Repescagem & Amistosos'
    | 'Copa do Mundo';
  gamesLabel: string;
  startDate: string;
  endDate: string;
  description: string;
}

export function buildOfficialConcacafCalendar2026To2038(): OfficialConcacafCalendarEntry[] {
  const entries: OfficialConcacafCalendarEntry[] = [];

  for (let yr = 2026; yr <= 2038; yr++) {
    const w = getFifaWindowDatesForYear(yr);
    const marStart =
      yr === 2026
        ? '2026-03-23'
        : yr === 2027
        ? '2027-03-22'
        : yr === 2028
        ? '2028-03-20'
        : yr === 2029
        ? '2029-03-19'
        : yr === 2030
        ? '2030-03-18'
        : addDays(w.mar1, -3);
    const marEnd =
      yr === 2026
        ? '2026-03-31'
        : yr === 2027
        ? '2027-03-30'
        : yr === 2028
        ? '2028-03-28'
        : yr === 2029
        ? '2029-03-27'
        : yr === 2030
        ? '2030-03-26'
        : w.mar2;
    const junStart =
      yr === 2026
        ? '2026-06-01'
        : yr === 2027
        ? '2027-06-07'
        : yr === 2028
        ? '2028-05-29'
        : yr === 2029
        ? '2029-06-04'
        : yr === 2030
        ? '2030-06-03'
        : addDays(w.jun1, -3);
    const junEnd =
      yr === 2026
        ? '2026-06-09'
        : yr === 2027
        ? '2027-06-15'
        : yr === 2028
        ? '2028-06-06'
        : yr === 2029
        ? '2029-06-12'
        : yr === 2030
        ? '2030-06-08'
        : w.jun2;
    const sepStart =
      yr === 2026
        ? '2026-09-21'
        : yr === 2027
        ? '2027-09-20'
        : yr === 2028
        ? '2028-09-18'
        : yr === 2029
        ? '2029-09-24'
        : yr === 2030
        ? '2030-09-23'
        : addDays(w.sep1, -3);
    const sepEnd =
      yr === 2026
        ? '2026-10-06'
        : yr === 2027
        ? '2027-10-05'
        : yr === 2028
        ? '2028-10-03'
        : yr === 2029
        ? '2029-10-09'
        : yr === 2030
        ? '2030-10-08'
        : w.oct2;
    const novStart =
      yr === 2026
        ? '2026-11-09'
        : yr === 2027
        ? '2027-11-08'
        : yr === 2028
        ? '2028-11-13'
        : yr === 2029
        ? '2029-11-12'
        : yr === 2030
        ? '2030-11-11'
        : addDays(w.nov1, -3);
    const novEnd =
      yr === 2026
        ? '2026-11-17'
        : yr === 2027
        ? '2027-11-16'
        : yr === 2028
        ? '2028-11-21'
        : yr === 2029
        ? '2029-11-20'
        : yr === 2030
        ? '2030-11-19'
        : w.nov2;

    const nlSeason = `${yr}/${String(yr + 1).slice(-2)}`;
    const prevNlSeason = `${yr - 1}/${String(yr).slice(-2)}`;

    if (yr % 4 === 2) {
      // 2026, 2030, 2034, 2038 — Copa do Mundo FIFA + Início da Liga das Nações CONCACAF (2026/27, 2030/31, 2034/35, 2038/39)
      if (yr >= 2030) {
        entries.push(
          {
            id: `conc_cal_${yr}_mar`,
            year: yr,
            cycleTag: `Copa do Mundo ${yr} & Liga das Nações ${nlSeason}`,
            periodLabel: `${formatShortDate(marStart)} a ${formatShortDate(marEnd)}`,
            label: `Repescagem Intercontinental FIFA & Amistosos (${yr})`,
            category: 'Repescagem & Amistosos',
            gamesLabel: '2 jogos',
            startDate: marStart,
            endDate: marEnd,
            description: `As 2 representantes da CONCACAF (7º e 8º gerais — 1 vaga padrão + 1 extra como confederação sede anterior) disputam a Repescagem Intercontinental FIFA (6 seleções → 2 vagas); demais seleções realizam amistosos preparatórios.`,
          },
          {
            id: `conc_cal_${yr}_jun`,
            year: yr,
            cycleTag: `Copa do Mundo ${yr} & Liga das Nações ${nlSeason}`,
            periodLabel: `${formatShortDate(junStart)} a ${formatShortDate(junEnd)}`,
            label: `Amistosos Preparatórios Pré-Copa ${yr}`,
            category: 'Repescagem & Amistosos',
            gamesLabel: '2 jogos',
            startDate: junStart,
            endDate: junEnd,
            description: `Últimos testes preparatórios das seleções classificadas da CONCACAF antes da estreia no Mundial de ${yr}.`,
          }
        );
      }

      entries.push(
        {
          id: `conc_cal_${yr}_wc`,
          year: yr,
          cycleTag: `Copa do Mundo ${yr} & Liga das Nações ${nlSeason}`,
          periodLabel: 'Junho / Julho',
          label:
            yr === 2026
              ? 'Copa do Mundo FIFA 2026 (Canadá, EUA e México)'
              : `Copa do Mundo FIFA ${yr}`,
          category: 'Copa do Mundo',
          gamesLabel: yr === 2026 ? 'Sedes: CAN · EUA · MEX' : '6 vagas diretas + 2 na Repescagem',
          startDate: yr === 2030 ? '2030-06-08' : `${yr}-06-11`,
          endDate: yr === 2030 ? '2030-07-21' : `${yr}-07-19`,
          description:
            yr === 2026
              ? 'Copa do Mundo FIFA sediada na América do Norte (Canadá, Estados Unidos e México), abrindo o novo ciclo competitivo 2026–2030 da CONCACAF.'
              : `Participação das 6 seleções classificadas diretamente pelas Eliminatórias CONCACAF (além de 2 representantes disputando a Repescagem Intercontinental FIFA).`,
        },
        {
          id: `conc_cal_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Liga das Nações CONCACAF ${nlSeason}`,
          periodLabel: `${formatShortDate(sepStart)} a ${formatShortDate(sepEnd)}`,
          label: `Liga das Nações CONCACAF ${nlSeason} — Fase de Grupos (Ligas A, B e C)`,
          category: 'Liga das Nações',
          gamesLabel: '4 jogos · Super Data FIFA',
          startDate: sepStart,
          endDate: sepEnd,
          description: `Abertura da Liga das Nações CONCACAF ${nlSeason} na janela estendida de 16 dias com 4 rodadas das Ligas A, B e C, valendo classificação para a Copa Ouro ${yr + 1}.`,
        },
        {
          id: `conc_cal_${yr}_nov`,
          year: yr,
          cycleTag: `Liga das Nações CONCACAF ${nlSeason}`,
          periodLabel: `${formatShortDate(novStart)} a ${formatShortDate(novEnd)}`,
          label: `Liga das Nações CONCACAF ${nlSeason} — Quartas de Final (Liga A) & Grupos Finais (B e C)`,
          category: 'Liga das Nações',
          gamesLabel: '2 jogos (ida e volta)',
          startDate: novStart,
          endDate: novEnd,
          description: `Quartas de Final da Liga A (definindo os 4 semifinalistas e vagas diretas na Copa Ouro ${yr + 1}) e fechamento dos grupos das Ligas B e C com classificação para suas Finais centralizadas.`,
        }
      );
    } else if (yr % 4 === 3) {
      // 2027, 2031, 2035 — Finais Liga das Nações + Copa Ouro + Início Eliminatórias Copa do Mundo
      const nextWcYear = yr + 3;
      entries.push(
        {
          id: `conc_cal_${yr}_mar`,
          year: yr,
          cycleTag: `Finais Liga das Nações ${prevNlSeason} & Copa Ouro ${yr}`,
          periodLabel: `${formatShortDate(marStart)} a ${formatShortDate(marEnd)}`,
          label: `Finais da Liga das Nações CONCACAF ${prevNlSeason} (Ligas A e B) & Prelims Copa Ouro ${yr}`,
          category: 'Liga das Nações',
          gamesLabel: 'Semifinais · Final · Prelims',
          startDate: marStart,
          endDate: marEnd,
          description: `Finais da Liga A (no SoFi Stadium em Los Angeles) e Finais centralizadas da Liga B, além dos Prelims que definem as últimas vagas da Copa Ouro ${yr}.`,
        },
        {
          id: `conc_cal_${yr}_jun_c`,
          year: yr,
          cycleTag: `Finais Liga C & Pré-Copa Ouro ${yr}`,
          periodLabel: `${formatShortDate(junStart)} a ${formatShortDate(junEnd)}`,
          label: `Finais da Liga C da Liga das Nações & Amistosos Pré-Copa Ouro ${yr}`,
          category: 'Liga das Nações',
          gamesLabel: '2 jogos',
          startDate: junStart,
          endDate: junEnd,
          description: `Disputa das Finais centralizadas da Liga C da Liga das Nações CONCACAF e últimos amistosos preparatórios antes da Copa Ouro ${yr}.`,
        },
        {
          id: `conc_cal_${yr}_gold_cup`,
          year: yr,
          cycleTag: `Copa Ouro CONCACAF ${yr}`,
          periodLabel: '17/06 a 11/07',
          label: `Copa Ouro CONCACAF ${yr} (16 Seleções)`,
          category: 'Copa Ouro',
          gamesLabel: '4 Grupos de 4 + Quartas, Semi e Final',
          startDate: `${yr}-06-17`,
          endDate: `${yr}-07-11`,
          description: `Torneio principal de seleções da CONCACAF com 16 participantes em 4 grupos de 4, seguido por Quartas de Final, Semifinais e Grande Final em 11 de julho.`,
        },
        {
          id: `conc_cal_${yr}_wcq_sep`,
          year: yr,
          cycleTag: `Eliminatórias CONCACAF · Copa ${nextWcYear}`,
          periodLabel: `${formatShortDate(sepStart)} a ${formatShortDate(sepEnd)}`,
          label: `Eliminatórias CONCACAF Copa ${nextWcYear} — 1ª Fase & Início da 2ª Fase`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '1ª Fase (Ida/Volta) + Grupos',
          startDate: sepStart,
          endDate: sepEnd,
          description: `Pontapé inicial das Eliminatórias CONCACAF rumo à Copa do Mundo ${nextWcYear}: 1ª Fase eliminatória (seleções 14º–35º do ranking) e abertura da 2ª Fase de grupos.`,
        },
        {
          id: `conc_cal_${yr}_wcq_nov`,
          year: yr,
          cycleTag: `Eliminatórias CONCACAF · Copa ${nextWcYear}`,
          periodLabel: `${formatShortDate(novStart)} a ${formatShortDate(novEnd)}`,
          label: `Eliminatórias CONCACAF Copa ${nextWcYear} — 2ª Fase (Fase de Grupos)`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: `Continuidade da 2ª Fase das Eliminatórias CONCACAF com as seleções cabeças de chave em busca das vagas para a Fase Final.`,
        }
      );
    } else if (yr % 4 === 0) {
      // 2028, 2032, 2036 — Conclusão 2ª Fase & Abertura Fase Final WCQ + Copa América (6 convidadas) + Liga das Nações 2028/29
      const nextWcYear = yr + 2;
      entries.push(
        {
          id: `conc_cal_${yr}_wcq_mar`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${nextWcYear} & Copa América ${yr}`,
          periodLabel: `${formatShortDate(marStart)} a ${formatShortDate(marEnd)}`,
          label: `Eliminatórias CONCACAF Copa ${nextWcYear} — Conclusão da 2ª Fase`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos decisivos',
          startDate: marStart,
          endDate: marEnd,
          description: `Encerramento da 2ª Fase das Eliminatórias CONCACAF definindo os 12 classificados para a Fase Final rumo à Copa do Mundo ${nextWcYear}.`,
        },
        {
          id: `conc_cal_${yr}_wcq_jun`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${nextWcYear} & Copa América ${yr}`,
          periodLabel: `${formatShortDate(junStart)} a ${formatShortDate(junEnd)}`,
          label: `Eliminatórias CONCACAF Copa ${nextWcYear} — Abertura da Fase Final`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos (Rodadas 1 e 2)',
          startDate: junStart,
          endDate: junEnd,
          description: `Início da Fase Final das Eliminatórias CONCACAF (3 grupos de 4) valendo 6 vagas diretas na Copa do Mundo ${nextWcYear}.`,
        },
        {
          id: `conc_cal_${yr}_copa_america`,
          year: yr,
          cycleTag: `CONMEBOL Copa América ${yr}`,
          periodLabel: 'Junho / Julho',
          label: `Copa América ${yr} (6 Seleções Convidadas da CONCACAF)`,
          category: 'Copa América',
          gamesLabel: '6 convidadas CONCACAF',
          startDate: `${yr}-06-11`,
          endDate: `${yr}-07-14`,
          description: `As 6 melhores seleções da Liga das Nações CONCACAF representam a confederação como convidadas oficiais na CONMEBOL Copa América ${yr}.`,
        },
        {
          id: `conc_cal_${yr}_nl_sep`,
          year: yr,
          cycleTag: `Liga das Nações CONCACAF ${nlSeason}`,
          periodLabel: `${formatShortDate(sepStart)} a ${formatShortDate(sepEnd)}`,
          label: `Liga das Nações CONCACAF ${nlSeason} — Fase de Grupos (Ligas A, B e C)`,
          category: 'Liga das Nações',
          gamesLabel: '4 jogos · Super Data FIFA',
          startDate: sepStart,
          endDate: sepEnd,
          description: `Segunda edição do ciclo quadrienal da Liga das Nações CONCACAF (${nlSeason}), classificatória para a Copa Ouro ${yr + 1}.`,
        },
        {
          id: `conc_cal_${yr}_nl_nov`,
          year: yr,
          cycleTag: `Liga das Nações CONCACAF ${nlSeason}`,
          periodLabel: `${formatShortDate(novStart)} a ${formatShortDate(novEnd)}`,
          label: `Liga das Nações CONCACAF ${nlSeason} — Quartas de Final (Liga A) & Grupos Finais`,
          category: 'Liga das Nações',
          gamesLabel: '2 jogos (ida e volta)',
          startDate: novStart,
          endDate: novEnd,
          description: `Definição dos semifinalistas da Liga A, classificados diretos à Copa Ouro ${yr + 1} e finalistas das Ligas B e C.`,
        }
      );
    } else {
      // 2029, 2033, 2037 — Finais Liga das Nações + Copa Ouro + Conclusão Fase Final WCQ + Play-In
      const nextWcYear = yr + 1;
      entries.push(
        {
          id: `conc_cal_${yr}_mar`,
          year: yr,
          cycleTag: `Finais Liga das Nações ${prevNlSeason} & Copa Ouro ${yr}`,
          periodLabel: `${formatShortDate(marStart)} a ${formatShortDate(marEnd)}`,
          label: `Finais da Liga das Nações CONCACAF ${prevNlSeason} (Ligas A e B) & Prelims Copa Ouro ${yr}`,
          category: 'Liga das Nações',
          gamesLabel: 'Semifinais · Final · Prelims',
          startDate: marStart,
          endDate: marEnd,
          description: `Decisão do título da Liga das Nações CONCACAF ${prevNlSeason} (Ligas A e B) e repescagem preliminar da Copa Ouro ${yr}.`,
        },
        {
          id: `conc_cal_${yr}_gold_cup`,
          year: yr,
          cycleTag: `Copa Ouro CONCACAF ${yr}`,
          periodLabel: '17/06 a 11/07',
          label: `Copa Ouro CONCACAF ${yr} (16 Seleções) & Finais Liga C`,
          category: 'Copa Ouro',
          gamesLabel: '4 Grupos de 4 + Quartas, Semi e Final',
          startDate: `${yr}-06-17`,
          endDate: `${yr}-07-11`,
          description: `Segunda Copa Ouro CONCACAF do ciclo quadrienal, servindo de grande ensaio oficial para as seleções da região antes da Copa do Mundo ${nextWcYear}.`,
        },
        {
          id: `conc_cal_${yr}_wcq_sep`,
          year: yr,
          cycleTag: `Eliminatórias CONCACAF · Copa ${nextWcYear}`,
          periodLabel: `${formatShortDate(sepStart)} a ${formatShortDate(sepEnd)}`,
          label: `Eliminatórias CONCACAF Copa ${nextWcYear} — Fase Final Decisiva (Rodadas 3 a 6)`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '4 jogos · 6 vagas diretas',
          startDate: sepStart,
          endDate: sepEnd,
          description: `Reta decisiva das Eliminatórias CONCACAF na Super Data FIFA de setembro/outubro, definindo as 6 seleções classificadas diretamente à Copa do Mundo ${nextWcYear}.`,
        },
        {
          id: `conc_cal_${yr}_wcq_playin`,
          year: yr,
          cycleTag: `Eliminatórias CONCACAF · Copa ${nextWcYear}`,
          periodLabel: `${formatShortDate(novStart)} a ${formatShortDate(novEnd)}`,
          label: `Play-In das Eliminatórias CONCACAF (Vaga na Repescagem Intercontinental FIFA)`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos (ida e volta)',
          startDate: novStart,
          endDate: novEnd,
          description: `Confronto direto em ida e volta entre os dois melhores 3º colocados da Fase Final valendo a vaga da CONCACAF na Repescagem Intercontinental FIFA de março de ${nextWcYear}.`,
        }
      );
    }
  }

  return entries;
}

export const OFFICIAL_CONCACAF_CALENDAR_2026_2038: OfficialConcacafCalendarEntry[] =
  buildOfficialConcacafCalendar2026To2038();

export interface OfficialAsiaCalendarEntry {
  id: string;
  year: number;
  cycleTag: string;
  periodLabel: string;
  label: string;
  category:
    | 'Amistosos'
    | 'Eliminatórias Copa da Ásia'
    | 'Copa da Ásia'
    | 'Eliminatórias Copa do Mundo'
    | 'Play-Off AFC'
    | 'Copa do Mundo';
  gamesLabel: string;
  startDate: string;
  endDate: string;
  description: string;
}

export function buildOfficialAsiaCalendar2026To2038(): OfficialAsiaCalendarEntry[] {
  const entries: OfficialAsiaCalendarEntry[] = [];

  const formatPtPeriod = (isoStart: string, isoEnd: string): string => {
    const months = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ];
    const [, sm, sd] = isoStart.split('-').map(Number);
    const [, em, ed] = isoEnd.split('-').map(Number);
    if (sm === em) return `${sd} a ${ed} de ${months[sm - 1]}`;
    return `${sd} de ${months[sm - 1]} a ${ed} de ${months[em - 1]}`;
  };

  for (let yr = 2026; yr <= 2038; yr++) {
    const w = getFifaWindowDatesForYear(yr);
    const marStart =
      yr === 2026
        ? '2026-03-23'
        : yr === 2027
        ? '2027-03-22'
        : yr === 2028
        ? '2028-03-20'
        : yr === 2029
        ? '2029-03-19'
        : yr === 2030
        ? '2030-03-18'
        : addDays(w.mar1, -3);
    const marEnd =
      yr === 2026
        ? '2026-03-31'
        : yr === 2027
        ? '2027-03-30'
        : yr === 2028
        ? '2028-03-28'
        : yr === 2029
        ? '2029-03-27'
        : yr === 2030
        ? '2030-03-26'
        : addDays(w.mar2, 1);

    const junStart =
      yr === 2026
        ? '2026-06-01'
        : yr === 2027
        ? '2027-06-07'
        : yr === 2028
        ? '2028-05-29'
        : yr === 2029
        ? '2029-06-04'
        : yr === 2030
        ? '2030-06-03'
        : addDays(w.jun1, -3);
    const junEnd =
      yr === 2026
        ? '2026-06-09'
        : yr === 2027
        ? '2027-06-15'
        : yr === 2028
        ? '2028-06-06'
        : yr === 2029
        ? '2029-06-12'
        : yr === 2030
        ? '2030-06-11'
        : addDays(w.jun2, 1);

    const sepStart =
      yr === 2026
        ? '2026-09-21'
        : yr === 2027
        ? '2027-09-20'
        : yr === 2028
        ? '2028-09-18'
        : yr === 2029
        ? '2029-09-29'
        : yr === 2030
        ? '2030-09-23'
        : addDays(w.sep1, -3);
    const octEnd =
      yr === 2026
        ? '2026-10-06'
        : yr === 2027
        ? '2027-10-05'
        : yr === 2028
        ? '2028-10-03'
        : yr === 2029
        ? '2029-10-09'
        : yr === 2030
        ? '2030-10-08'
        : addDays(w.oct2, 1);

    const novStart =
      yr === 2026
        ? '2026-11-09'
        : yr === 2027
        ? '2027-11-08'
        : yr === 2028
        ? '2028-11-13'
        : yr === 2029
        ? '2029-11-12'
        : yr === 2030
        ? '2030-11-11'
        : addDays(w.nov1, -3);
    const novEnd =
      yr === 2026
        ? '2026-11-17'
        : yr === 2027
        ? '2027-11-16'
        : yr === 2028
        ? '2028-11-21'
        : yr === 2029
        ? '2029-11-20'
        : yr === 2030
        ? '2030-11-19'
        : addDays(w.nov2, 1);

    const mod = yr % 4;
    if (mod === 2) {
      // Anos de Copa do Mundo (2026, 2030, 2034, 2038)
      const nextAsianCupYear = yr + 2;
      entries.push(
        {
          id: `asia_${yr}_mar`,
          year: yr,
          cycleTag: `Preparação Copa do Mundo ${yr}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Data FIFA de Março · Amistosos Pré-Copa ${yr}`,
          category: 'Amistosos',
          gamesLabel: '2 amistosos',
          startDate: marStart,
          endDate: marEnd,
          description: `Amistosos oficiais internacionais das 48 seleções da Ásia (AFC) e Repescagem Intercontinental para o campeão do Play-Off AFC.`,
        },
        {
          id: `asia_${yr}_jun`,
          year: yr,
          cycleTag: `Preparação Copa do Mundo ${yr}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Data FIFA de Junho · Amistosos Finais Pré-Copa ${yr}`,
          category: 'Amistosos',
          gamesLabel: '2 amistosos',
          startDate: junStart,
          endDate: junEnd,
          description: `Últimos dois amistosos preparatórios das seleções asiáticas antes da abertura da Copa do Mundo FIFA ${yr}.`,
        },
        {
          id: `asia_${yr}_wc`,
          year: yr,
          cycleTag: `Copa do Mundo FIFA ${yr}`,
          periodLabel: 'junho/julho',
          label: `Copa do Mundo FIFA ${yr} (8+ Vagas da Ásia)`,
          category: 'Copa do Mundo',
          gamesLabel: 'Mundial (48 seleções)',
          startDate: `${yr}-06-11`,
          endDate: `${yr}-07-19`,
          description: `Participação dos 8 líderes das Eliminatórias da Ásia (mais eventual classificado via Play-Off / Repescagem Intercontinental) na Copa do Mundo ${yr}.`,
        },
        {
          id: `asia_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Preparação Copa da Ásia ${nextAsianCupYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Data FIFA de Set/Out · Amistosos Pós-Copa`,
          category: 'Amistosos',
          gamesLabel: '4 amistosos',
          startDate: sepStart,
          endDate: octEnd,
          description: `Janela estendida de 4 amistosos internacionais para todas as 48 seleções da AFC preparando o ciclo das Eliminatórias da Copa da Ásia ${nextAsianCupYear}.`,
        },
        {
          id: `asia_${yr}_nov`,
          year: yr,
          cycleTag: `Preparação Copa da Ásia ${nextAsianCupYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Data FIFA de Novembro · Amistosos Internacionais`,
          category: 'Amistosos',
          gamesLabel: '2 amistosos',
          startDate: novStart,
          endDate: novEnd,
          description: `Encerramento da temporada ${yr} com 2 amistosos antes do início das Eliminatórias da Copa da Ásia ${nextAsianCupYear}.`,
        }
      );
    } else if (mod === 3) {
      // 2027, 2031, 2035 — Eliminatórias da Copa da Ásia (4 grupos de 12, rodadas 1 a 10)
      const targetAsianCupYear = yr + 1;
      entries.push(
        {
          id: `asia_${yr}_mar`,
          year: yr,
          cycleTag: `Eliminatórias Copa da Ásia ${targetAsianCupYear}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Eliminatórias Copa da Ásia ${targetAsianCupYear} · Rodadas 1 e 2`,
          category: 'Eliminatórias Copa da Ásia',
          gamesLabel: '2 jogos oficiais',
          startDate: marStart,
          endDate: marEnd,
          description: `Abertura dos 4 grupos de 12 seleções (48 equipes da AFC). Os 8 melhores de cada grupo garantem vaga na Copa da Ásia ${targetAsianCupYear} (32 seleções).`,
        },
        {
          id: `asia_${yr}_jun`,
          year: yr,
          cycleTag: `Eliminatórias Copa da Ásia ${targetAsianCupYear}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Eliminatórias Copa da Ásia ${targetAsianCupYear} · Rodadas 3 e 4`,
          category: 'Eliminatórias Copa da Ásia',
          gamesLabel: '2 jogos oficiais',
          startDate: junStart,
          endDate: junEnd,
          description: `Sequência da fase de grupos (4×12) das Eliminatórias da Copa da Ásia ${targetAsianCupYear}.`,
        },
        {
          id: `asia_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Eliminatórias Copa da Ásia ${targetAsianCupYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Eliminatórias Copa da Ásia ${targetAsianCupYear} · Rodadas 5 a 8`,
          category: 'Eliminatórias Copa da Ásia',
          gamesLabel: '4 jogos oficiais',
          startDate: sepStart,
          endDate: octEnd,
          description: `Super Data FIFA com 4 rodadas decisivas nos 4 grupos de 12 seleções rumo às 32 vagas da Copa da Ásia ${targetAsianCupYear}.`,
        },
        {
          id: `asia_${yr}_nov`,
          year: yr,
          cycleTag: `Eliminatórias Copa da Ásia ${targetAsianCupYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Eliminatórias Copa da Ásia ${targetAsianCupYear} · Rodadas 9 e 10`,
          category: 'Eliminatórias Copa da Ásia',
          gamesLabel: '2 jogos oficiais',
          startDate: novStart,
          endDate: novEnd,
          description: `Penúltima janela das Eliminatórias Asiáticas (totalizando 10 de 11 rodadas em ${yr}).`,
        }
      );
    } else if (mod === 0) {
      // 2028, 2032, 2036 — Encerramento Eliminatórias + Copa da Ásia (32 seleções) + Início Eliminatórias Copa do Mundo
      const targetWcYear = yr + 2;
      entries.push(
        {
          id: `asia_${yr}_mar`,
          year: yr,
          cycleTag: `Eliminatórias Copa da Ásia ${yr}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Rodada Final (11ª) das Eliminatórias Copa da Ásia + 1 Amistoso`,
          category: 'Eliminatórias Copa da Ásia',
          gamesLabel: '1 elim. + 1 amistoso',
          startDate: marStart,
          endDate: marEnd,
          description: `Conclusão da 11ª e última rodada dos 4 grupos de 12 definindo os 32 classificados para a Copa da Ásia ${yr}, seguida de 1 amistoso preparatório.`,
        },
        {
          id: `asia_${yr}_may_jun`,
          year: yr,
          cycleTag: `Preparação Copa da Ásia ${yr}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Data FIFA Pré-Copa da Ásia ${yr} · Amistosos`,
          category: 'Amistosos',
          gamesLabel: '2 amistosos',
          startDate: junStart,
          endDate: junEnd,
          description: `Dois amistosos preparatórios oficiais imediatamente antes da abertura da Copa da Ásia ${yr}.`,
        },
        {
          id: `asia_${yr}_cup`,
          year: yr,
          cycleTag: `Copa da Ásia AFC ${yr}`,
          periodLabel: 'junho/julho',
          label: `Copa da Ásia AFC ${yr} (32 Seleções · 8 Grupos de 4)`,
          category: 'Copa da Ásia',
          gamesLabel: '32 seleções · Oitavas a Final',
          startDate: `${yr}-06-14`,
          endDate: `${yr}-07-15`,
          description: `Fase final da Copa da Ásia com 32 seleções divididas em 8 grupos de 4 (A–H), avançando os 2 melhores de cada grupo para Oitavas de Final, Quartas, Semifinais e Grande Final.`,
        },
        {
          id: `asia_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Eliminatórias Copa do Mundo ${targetWcYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Eliminatórias Copa ${targetWcYear} (8×6) · Rodadas 1 a 4`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '4 jogos oficiais',
          startDate: sepStart,
          endDate: octEnd,
          description: `Abertura das Eliminatórias Asiáticas da Copa ${targetWcYear}: 48 seleções em 8 grupos de 6 (ida e volta = 10 jogos). Os 8 campeões de grupo vão direto à Copa; os 8 segundos colocados vão ao Play-Off.`,
        },
        {
          id: `asia_${yr}_nov`,
          year: yr,
          cycleTag: `Eliminatórias Copa do Mundo ${targetWcYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Eliminatórias Copa ${targetWcYear} · Rodadas 5 e 6`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos oficiais',
          startDate: novStart,
          endDate: novEnd,
          description: `Conclusão do turno e abertura do returno nos 8 grupos de 6 das Eliminatórias Asiáticas da Copa ${targetWcYear}.`,
        }
      );
    } else {
      // 2029, 2033, 2037 — Conclusão Eliminatórias Copa do Mundo + Play-Off dos 8 Segundos Colocados + Amistosos
      const targetWcYear = yr + 1;
      entries.push(
        {
          id: `asia_${yr}_mar`,
          year: yr,
          cycleTag: `Eliminatórias Copa do Mundo ${targetWcYear}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Eliminatórias Copa ${targetWcYear} · Rodadas 7 e 8`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos oficiais',
          startDate: marStart,
          endDate: marEnd,
          description: `Reta decisiva dos 8 grupos de 6 das Eliminatórias Asiáticas valendo as 8 vagas diretas na Copa ${targetWcYear}.`,
        },
        {
          id: `asia_${yr}_jun`,
          year: yr,
          cycleTag: `Eliminatórias Copa do Mundo ${targetWcYear}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Eliminatórias Copa ${targetWcYear} · Rodadas 9 e 10 (Encerramento)`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos oficiais',
          startDate: junStart,
          endDate: junEnd,
          description: `Definição dos 8 campeões de grupo classificados diretamente para a Copa do Mundo ${targetWcYear} e dos 8 segundos colocados que avançam ao Play-Off AFC.`,
        },
        {
          id: `asia_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Play-Off AFC Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Play-Off AFC dos 8 Segundos Colocados (Quartas, Semi e Final) & Amistosos`,
          category: 'Play-Off AFC',
          gamesLabel: '3 jogos (mata-mata único)',
          startDate: sepStart,
          endDate: octEnd,
          description: `Os 8 segundos colocados disputam mata-mata de jogo único (Quartas, Semifinais e Final) pela vaga asiática na Repescagem Intercontinental da Copa ${targetWcYear}. As seleções fora do Play-Off disputam amistosos.`,
        },
        {
          id: `asia_${yr}_nov`,
          year: yr,
          cycleTag: `Preparação Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Data FIFA de Novembro · Amistosos Internacionais`,
          category: 'Amistosos',
          gamesLabel: '2 amistosos',
          startDate: novStart,
          endDate: novEnd,
          description: `Dois amistosos internacionais oficiais encerrando a temporada ${yr} para todas as seleções da Ásia.`,
        }
      );
    }
  }

  return entries;
}

export const OFFICIAL_ASIA_CALENDAR_2026_2038: OfficialAsiaCalendarEntry[] =
  buildOfficialAsiaCalendar2026To2038();

export interface OfficialSouthAmericaCalendarEntry {
  id: string;
  year: number;
  cycleTag: string;
  periodLabel: string;
  label: string;
  category:
    | 'Amistosos'
    | 'Eliminatórias Copa do Mundo'
    | 'Copa América'
    | 'Repescagem & Amistosos'
    | 'Copa do Mundo';
  gamesLabel: string;
  startDate: string;
  endDate: string;
  description: string;
}

export function buildOfficialSouthAmericaCalendar2026To2038(): OfficialSouthAmericaCalendarEntry[] {
  const entries: OfficialSouthAmericaCalendarEntry[] = [];
  const monthNames = [
    '',
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];

  const formatPtPeriod = (startIso: string, endIso: string): string => {
    const [, sm, sd] = startIso.split('-').map(Number);
    const [, em, ed] = endIso.split('-').map(Number);
    if (sm === em) return `${sd} a ${ed} de ${monthNames[sm]}`;
    return `${sd} de ${monthNames[sm]} a ${ed} de ${monthNames[em]}`;
  };

  for (let yr = 2026; yr <= 2038; yr++) {
    const w = getFifaWindowDatesForYear(yr);
    const marStart = yr === 2026 ? '2026-03-23' : yr === 2027 ? '2027-03-22' : yr === 2028 ? '2028-03-20' : yr === 2029 ? '2029-03-19' : yr === 2030 ? '2030-03-18' : addDays(w.mar1, -3);
    const marEnd = w.mar2;
    const junStart = yr === 2026 ? '2026-06-01' : yr === 2027 ? '2027-06-07' : yr === 2028 ? '2028-05-29' : yr === 2029 ? '2029-06-04' : yr === 2030 ? '2030-06-03' : addDays(w.jun1, -3);
    const junEnd = w.jun2;
    const sepStart = yr === 2026 ? '2026-09-21' : yr === 2027 ? '2027-09-20' : yr === 2028 ? '2028-09-18' : yr === 2029 ? '2029-09-29' : yr === 2030 ? '2030-09-23' : addDays(w.sep1, -3);
    const octEnd = w.oct2;
    const novStart = yr === 2026 ? '2026-11-09' : yr === 2027 ? '2027-11-08' : yr === 2028 ? '2028-11-13' : yr === 2029 ? '2029-11-12' : yr === 2030 ? '2030-11-11' : addDays(w.nov1, -3);
    const novEnd = w.nov2;

    if (yr === 2026) {
      entries.push(
        {
          id: `conmebol_2026_sep_oct`,
          year: 2026,
          cycleTag: 'Pós-Copa 2026 · América do Sul',
          periodLabel: '21 de setembro a 6 de outubro',
          label: 'Data FIFA · Amistosos Internacionais',
          category: 'Amistosos',
          gamesLabel: '3 jogos',
          startDate: '2026-09-21',
          endDate: '2026-10-06',
          description: 'Janela de abertura do novo ciclo sul-americano pós-Copa do Mundo com 3 amistosos internacionais para as 10 seleções da CONMEBOL.',
        },
        {
          id: `conmebol_2026_nov`,
          year: 2026,
          cycleTag: 'Pós-Copa 2026 · América do Sul',
          periodLabel: '9 a 17 de novembro',
          label: 'Data FIFA · Amistosos Internacionais',
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: '2026-11-09',
          endDate: '2026-11-17',
          description: 'Dois amistosos oficiais encerrando a temporada 2026 das 10 seleções sul-americanas antes do início das Eliminatórias em 2027.',
        }
      );
    } else if (yr % 4 === 2) {
      // 2030, 2034, 2038 (Anos de Copa do Mundo)
      entries.push(
        {
          id: `conmebol_${yr}_mar`,
          year: yr,
          cycleTag: `Copa do Mundo ${yr}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Data FIFA · Repescagem para a Copa do Mundo ${yr} e Amistosos`,
          category: 'Repescagem & Amistosos',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description:
            yr === 2030
              ? `A melhor seleção sul-americana fora das 6 vagas diretas (3 sedes ARG/PAR/URU + 3 via eliminatórias) disputa a Repescagem Intercontinental FIFA (6 seleções → 2 vagas); demais seleções realizam 2 amistosos preparatórios.`
              : `O 7º colocado das Eliminatórias Sul-Americanas disputa a Repescagem Intercontinental FIFA (6 seleções → 2 vagas) por lugar na Copa ${yr}; demais seleções realizam 2 amistosos preparatórios.`,
        },
        {
          id: `conmebol_${yr}_jun`,
          year: yr,
          cycleTag: `Pré-Copa ${yr}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Data FIFA · Amistoso Final Pré-Copa do Mundo ${yr}`,
          category: 'Amistosos',
          gamesLabel: '1 jogo',
          startDate: junStart,
          endDate: junEnd,
          description: `Último teste oficial (1 amistoso) das seleções sul-americanas antes da estreia na Copa do Mundo FIFA ${yr}.`,
        },
        {
          id: `conmebol_${yr}_wc`,
          year: yr,
          cycleTag: `Copa do Mundo FIFA ${yr}`,
          periodLabel: 'junho/julho',
          label:
            yr === 2030
              ? `Copa do Mundo FIFA 2030 (3 Sedes + 3 Eliminatórias CONMEBOL + 1 Repescagem)`
              : `Copa do Mundo FIFA ${yr} (6 Vagas Diretas CONMEBOL + 1 Repescagem)`,
          category: 'Copa do Mundo',
          gamesLabel: 'Copa do Mundo',
          startDate: `${yr}-06-13`,
          endDate: `${yr}-07-21`,
          description:
            yr === 2030
              ? `Disputa do Mundial FIFA 2030 com 6 seleções diretas da CONMEBOL (Argentina, Paraguai e Uruguai como sedes + 3 melhores das Eliminatórias) e eventual 7ª representante via Repescagem Intercontinental.`
              : `Disputa do Mundial FIFA ${yr} com as 6 melhores seleções das Eliminatórias Sul-Americanas e eventual 7ª representante via Repescagem Intercontinental.`,
        },
        {
          id: `conmebol_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Pós-Copa ${yr}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Data FIFA · Amistosos Internacionais`,
          category: 'Amistosos',
          gamesLabel: '3 jogos',
          startDate: sepStart,
          endDate: octEnd,
          description: `Início do novo ciclo sul-americano pós-Copa ${yr} com 3 amistosos internacionais na janela de Set/Out.`,
        },
        {
          id: `conmebol_${yr}_nov`,
          year: yr,
          cycleTag: `Pós-Copa ${yr}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Data FIFA · Amistosos Internacionais`,
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: `Dois amistosos oficiais encerrando a temporada ${yr} antes da abertura das Eliminatórias no ano seguinte.`,
        }
      );
    } else if (yr % 4 === 3) {
      // 2027, 2031, 2035 (1º Turno das Eliminatórias: Rodadas 1 a 9)
      const targetWcYear = yr + 3;
      entries.push(
        {
          id: `conmebol_${yr}_mar`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Eliminatórias Sul-Americanas · Rodadas 1 e 2`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description: `Abertura do grupo único de 10 seleções (ida e volta · 18 rodadas). Top 6 vão direto à Copa ${targetWcYear} e o 7º disputa a Repescagem.`,
        },
        {
          id: `conmebol_${yr}_jun`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Eliminatórias Sul-Americanas · Rodadas 3 e 4`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos',
          startDate: junStart,
          endDate: junEnd,
          description: `Mais 2 rodadas oficiais das Eliminatórias Sul-Americanas para a Copa do Mundo ${targetWcYear}.`,
        },
        {
          id: `conmebol_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Eliminatórias Sul-Americanas · Rodadas 5, 6 e 7`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '3 jogos',
          startDate: sepStart,
          endDate: octEnd,
          description: `Janela tripla das Eliminatórias CONMEBOL com 3 rodadas decisivas no 1º turno.`,
        },
        {
          id: `conmebol_${yr}_nov`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Eliminatórias Sul-Americanas · Rodadas 8 e 9 (Fim do 1º Turno)`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: `Fechamento do 1º turno (9 de 18 rodadas concluídas) das Eliminatórias Sul-Americanas da Copa ${targetWcYear}.`,
        }
      );
    } else if (yr % 4 === 0) {
      // 2028, 2032, 2036 (Ano de Copa América + Amistosos)
      entries.push(
        {
          id: `conmebol_${yr}_mar`,
          year: yr,
          cycleTag: `Preparação Copa América ${yr}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Data FIFA · Amistosos Internacionais`,
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description: `Dois amistosos preparatórios das seleções sul-americanas rumo à Copa América ${yr}.`,
        },
        {
          id: `conmebol_${yr}_may_jun`,
          year: yr,
          cycleTag: `Pré-Copa América ${yr}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Data FIFA · Amistoso Final Pré-Copa América ${yr}`,
          category: 'Amistosos',
          gamesLabel: '1 jogo',
          startDate: junStart,
          endDate: junEnd,
          description: `Último amistoso de preparação (1 jogo) antes do pontapé inicial da CONMEBOL Copa América ${yr}.`,
        },
        {
          id: `conmebol_${yr}_copa_america`,
          year: yr,
          cycleTag: `CONMEBOL Copa América ${yr}`,
          periodLabel: 'junho/julho',
          label: `CONMEBOL Copa América ${yr} (16 Seleções · 4 Grupos de 4 + Mata-Mata)`,
          category: 'Copa América',
          gamesLabel: 'Fase de Grupos → Final',
          startDate: `${yr}-06-11`,
          endDate: `${yr}-07-14`,
          description:
            yr === 2028
              ? `16 seleções (4 grupos de 4 + Quartas, Semifinal e Final em jogo único): Argentina, Equador, Colômbia, Uruguai, Brasil, Paraguai, Bolívia, Venezuela, Peru, Chile + convidados Estados Unidos, México, Canadá, Rússia, Costa Rica e Jamaica.`
              : `16 seleções em 4 grupos de 4 (10 da CONMEBOL + 6 convidadas) disputando Fase de Grupos, Quartas de Final, Semifinais e Grande Final em jogo único.`,
        },
        {
          id: `conmebol_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Pós-Copa América ${yr}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Data FIFA · Amistosos Internacionais`,
          category: 'Amistosos',
          gamesLabel: '3 jogos',
          startDate: sepStart,
          endDate: octEnd,
          description: `Três amistosos oficiais na janela de Set/Out após a Copa América ${yr}, sem rodadas de Eliminatórias neste ano.`,
        },
        {
          id: `conmebol_${yr}_nov`,
          year: yr,
          cycleTag: `Pós-Copa América ${yr}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Data FIFA · Amistosos Internacionais`,
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: `Dois amistosos oficiais encerrando a temporada ${yr} antes da retomada do 2º turno das Eliminatórias em ${yr + 1}.`,
        }
      );
    } else {
      // 2029, 2033, 2037 (2º Turno das Eliminatórias: Rodadas 10 a 18)
      const targetWcYear = yr + 1;
      entries.push(
        {
          id: `conmebol_${yr}_mar`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Eliminatórias Sul-Americanas · Rodadas 10 e 11`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description: `Retomada das Eliminatórias Sul-Americanas com a abertura do 2º turno (Rodadas 10 e 11 de 18).`,
        },
        {
          id: `conmebol_${yr}_jun`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Eliminatórias Sul-Americanas · Rodadas 12 e 13`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos',
          startDate: junStart,
          endDate: junEnd,
          description: `Mais 2 rodadas diretas na disputa pelo G6 (vagas diretas) e 7º lugar (Repescagem Intercontinental).`,
        },
        {
          id: `conmebol_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Eliminatórias Sul-Americanas · Rodadas 14, 15 e 16`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '3 jogos',
          startDate: sepStart,
          endDate: octEnd,
          description: `Janela tripla decisiva com 3 rodadas das Eliminatórias CONMEBOL encaminhando os classificados à Copa ${targetWcYear}.`,
        },
        {
          id: `conmebol_${yr}_nov`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Eliminatórias Sul-Americanas · Rodadas 17 e 18 (Encerramento)`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: `Conclusão das 18 rodadas de ida e volta: as 6 primeiras seleções garantem vaga direta na Copa do Mundo ${targetWcYear} e o 7º colocado avança à Repescagem Mundial.`,
        }
      );
    }
  }

  return entries;
}

export const OFFICIAL_SOUTH_AMERICA_CALENDAR_2026_2038: OfficialSouthAmericaCalendarEntry[] =
  buildOfficialSouthAmericaCalendar2026To2038();

export interface OfficialAfricaCalendarEntry {
  id: string;
  year: number;
  cycleTag: string;
  periodLabel: string;
  label: string;
  category:
    | 'Eliminatórias Copa Africana'
    | 'Copa Africana'
    | 'Eliminatórias Copa do Mundo'
    | 'Repescagem CAF'
    | 'Copa do Mundo'
    | 'Amistosos';
  gamesLabel: string;
  startDate: string;
  endDate: string;
  description: string;
}

export function buildOfficialAfricaCalendar2026To2038(): OfficialAfricaCalendarEntry[] {
  const entries: OfficialAfricaCalendarEntry[] = [];
  const monthNames = [
    '',
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];

  const formatPtPeriod = (startIso: string, endIso: string): string => {
    const [, sm, sd] = startIso.split('-').map(Number);
    const [, em, ed] = endIso.split('-').map(Number);
    if (sm === em) return `${sd} a ${ed} de ${monthNames[sm]}`;
    return `${sd} de ${monthNames[sm]} a ${ed} de ${monthNames[em]}`;
  };

  for (let yr = 2026; yr <= 2038; yr++) {
    const w = getFifaWindowDatesForYear(yr);
    const marStart = yr === 2026 ? '2026-03-23' : yr === 2027 ? '2027-03-22' : yr === 2028 ? '2028-03-20' : yr === 2029 ? '2029-03-19' : yr === 2030 ? '2030-03-18' : addDays(w.mar1, -3);
    const marEnd = w.mar2;
    const junStart = yr === 2026 ? '2026-06-01' : yr === 2027 ? '2027-06-07' : yr === 2028 ? '2028-05-29' : yr === 2029 ? '2029-06-04' : yr === 2030 ? '2030-06-03' : addDays(w.jun1, -3);
    const junEnd = w.jun2;
    const sepStart = yr === 2026 ? '2026-09-21' : yr === 2027 ? '2027-09-20' : yr === 2028 ? '2028-09-18' : yr === 2029 ? '2029-09-29' : yr === 2030 ? '2030-09-23' : addDays(w.sep1, -3);
    const octEnd = w.oct2;
    const novStart = yr === 2026 ? '2026-11-09' : yr === 2027 ? '2027-11-08' : yr === 2028 ? '2028-11-13' : yr === 2029 ? '2029-11-12' : yr === 2030 ? '2030-11-11' : addDays(w.nov1, -3);
    const novEnd = w.nov2;

    if (yr === 2026) {
      entries.push(
        {
          id: 'caf_2026_sep_oct',
          year: 2026,
          cycleTag: 'Eliminatórias CAN 2028',
          periodLabel: '21 de setembro a 6 de outubro',
          label: 'Eliminatórias da Copa Africana 2028 · Rodadas 1 e 2',
          category: 'Eliminatórias Copa Africana',
          gamesLabel: '2 rodadas',
          startDate: '2026-09-21',
          endDate: '2026-10-06',
          description: 'Abertura das Eliminatórias da CAN 2028 com todas as 56 seleções africanas divididas por Ranking FIFA em 8 grupos de 7 (ida e volta · Top 4 de cada grupo classificam).',
        },
        {
          id: 'caf_2026_nov',
          year: 2026,
          cycleTag: 'Eliminatórias CAN 2028',
          periodLabel: '9 a 17 de novembro',
          label: 'Eliminatórias da Copa Africana 2028 · Rodadas 3 e 4',
          category: 'Eliminatórias Copa Africana',
          gamesLabel: '2 rodadas',
          startDate: '2026-11-09',
          endDate: '2026-11-17',
          description: 'Mais 2 rodadas dos 8 grupos de 7 seleções das Eliminatórias da Copa das Nações Africanas 2028.',
        }
      );
    } else if (yr % 4 === 2) {
      // 2030, 2034, 2038 (Anos de Copa do Mundo + Abertura Eliminatórias CAN do ciclo seguinte)
      const nextCanYear = yr + 2;
      entries.push(
        {
          id: `caf_${yr}_mar`,
          year: yr,
          cycleTag: `Copa do Mundo ${yr}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Data FIFA · Amistosos Internacionais & Repescagem FIFA`,
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description: `Dois amistosos preparatórios para as seleções da CAF enquanto o campeão do Play-Off Africano disputa a Repescagem Intercontinental pela 10ª vaga na Copa ${yr}.`,
        },
        {
          id: `caf_${yr}_jun`,
          year: yr,
          cycleTag: `Copa do Mundo ${yr}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Data FIFA · Amistoso Preparatório Pré-Copa`,
          category: 'Amistosos',
          gamesLabel: '1 jogo',
          startDate: junStart,
          endDate: junEnd,
          description: `Último teste oficial das seleções africanas antes da Copa do Mundo ${yr}.`,
        },
        {
          id: `caf_${yr}_wc`,
          year: yr,
          cycleTag: `Copa do Mundo ${yr}`,
          periodLabel: `Junho / Julho de ${yr}`,
          label: `Copa do Mundo FIFA ${yr}`,
          category: 'Copa do Mundo',
          gamesLabel: yr === 2030 ? '1 Sede (MAR) + 8 Elim. + 1 Repesc.' : '9 vagas diretas + 1 Repescagem',
          startDate: `${yr}-06-11`,
          endDate: `${yr}-07-19`,
          description:
            yr === 2030
              ? `Copa do Mundo com 48 seleções: África conta com 9 vagas diretas (Marrocos como país-sede + 8 via eliminatórias) e 1 vaga na Repescagem Intercontinental (campeão do Play-Off CAF).`
              : `Copa do Mundo com 48 seleções (até 10 representantes da África: os 9 campeões de grupo + eventual campeão do Play-Off CAF via Repescagem Intercontinental).`,
        },
        {
          id: `caf_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Eliminatórias CAN ${nextCanYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Eliminatórias da Copa Africana ${nextCanYear} · Rodadas 1 e 2`,
          category: 'Eliminatórias Copa Africana',
          gamesLabel: '2 rodadas',
          startDate: sepStart,
          endDate: octEnd,
          description: `Abertura do novo ciclo das Eliminatórias CAN ${nextCanYear} com as 56 seleções africanas em 8 grupos de 7 (sorteio por Ranking FIFA de 8 em 8).`,
        },
        {
          id: `caf_${yr}_nov`,
          year: yr,
          cycleTag: `Eliminatórias CAN ${nextCanYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Eliminatórias da Copa Africana ${nextCanYear} · Rodadas 3 e 4`,
          category: 'Eliminatórias Copa Africana',
          gamesLabel: '2 rodadas',
          startDate: novStart,
          endDate: novEnd,
          description: `Continuidade da fase de grupos das Eliminatórias da Copa das Nações Africanas ${nextCanYear}.`,
        }
      );
    } else if (yr % 4 === 3) {
      // 2027, 2031, 2035 (Conclusão das Eliminatórias CAN: 2 Mar + 2 Jun + 4 Set/Out + 2 Nov = 10 rodadas -> fecha as 14 rodadas / 12 jogos cada)
      const targetCanYear = yr + 1;
      entries.push(
        {
          id: `caf_${yr}_mar`,
          year: yr,
          cycleTag: `Eliminatórias CAN ${targetCanYear}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Eliminatórias da Copa Africana ${targetCanYear} · Rodadas 5 e 6`,
          category: 'Eliminatórias Copa Africana',
          gamesLabel: '2 rodadas',
          startDate: marStart,
          endDate: marEnd,
          description: `Duas rodadas oficiais dos 8 grupos de 7 rumo às 32 vagas da Copa Africana ${targetCanYear}.`,
        },
        {
          id: `caf_${yr}_jun`,
          year: yr,
          cycleTag: `Eliminatórias CAN ${targetCanYear}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Eliminatórias da Copa Africana ${targetCanYear} · Rodadas 7 e 8`,
          category: 'Eliminatórias Copa Africana',
          gamesLabel: '2 rodadas',
          startDate: junStart,
          endDate: junEnd,
          description: `Virada de turno nos 8 grupos de 7 das Eliminatórias Africanas (ida e volta = 12 jogos por seleção).`,
        },
        {
          id: `caf_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Eliminatórias CAN ${targetCanYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Eliminatórias da Copa Africana ${targetCanYear} · Rodadas 9 a 12`,
          category: 'Eliminatórias Copa Africana',
          gamesLabel: '4 rodadas',
          startDate: sepStart,
          endDate: octEnd,
          description: `Super Data FIFA decisiva com 4 rodadas das Eliminatórias CAN ${targetCanYear} definindo boa parte do G4 de cada grupo.`,
        },
        {
          id: `caf_${yr}_nov`,
          year: yr,
          cycleTag: `Eliminatórias CAN ${targetCanYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Eliminatórias da Copa Africana ${targetCanYear} · Rodadas 13 e 14 (Final)`,
          category: 'Eliminatórias Copa Africana',
          gamesLabel: '2 rodadas',
          startDate: novStart,
          endDate: novEnd,
          description: `Encerramento das 14 rodadas (12 jogos cada): os 4 melhores de cada um dos 8 grupos garantem vaga na Copa das Nações Africanas ${targetCanYear} (32 seleções).`,
        }
      );
    } else if (yr % 4 === 0) {
      // 2028, 2032, 2036 (Copa Africana 32 seleções + Amistosos + Abertura Eliminatórias Copa 54 seleções em Nov)
      const targetWcYear = yr + 2;
      entries.push(
        {
          id: `caf_${yr}_mar`,
          year: yr,
          cycleTag: `Copa Africana ${yr}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Data FIFA · Amistosos Preparatórios Pré-CAN`,
          category: 'Amistosos',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description: `Dois amistosos oficiais na janela de março preparando as seleções africanas para a Copa das Nações Africanas ${yr}.`,
        },
        {
          id: `caf_${yr}_jun`,
          year: yr,
          cycleTag: `Copa Africana ${yr}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Data FIFA · Amistoso Final Pré-CAN`,
          category: 'Amistosos',
          gamesLabel: '1 jogo',
          startDate: junStart,
          endDate: junEnd,
          description: `Amistoso único de encerramento da preparação antes do início da Copa Africana ${yr}.`,
        },
        {
          id: `caf_${yr}_can`,
          year: yr,
          cycleTag: `Copa Africana ${yr}`,
          periodLabel: `Junho / Julho de ${yr}`,
          label: `Copa das Nações Africanas (CAN) ${yr}${yr === 2028 ? ' · Uganda, Tanzânia e Quênia' : ''}`,
          category: 'Copa Africana',
          gamesLabel: '32 seleções · 8 grupos + Mata-Mata',
          startDate: `${yr}-06-14`,
          endDate: `${yr}-07-15`,
          description: `Torneio principal do continente africano com 32 seleções em 8 grupos de 4, avançando para Oitavas de Final, Quartas, Semifinais, 3º Lugar e Grande Final.`,
        },
        {
          id: `caf_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Temporada ${yr} · CAF`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Super Data FIFA · Amistosos Internacionais`,
          category: 'Amistosos',
          gamesLabel: '4 jogos',
          startDate: sepStart,
          endDate: octEnd,
          description: `Quatro amistosos oficiais de pós-Copa Africana preparando as 54 seleções FIFA da CAF para as Eliminatórias da Copa do Mundo ${targetWcYear}.`,
        },
        {
          id: `caf_${yr}_nov`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Eliminatórias da Copa do Mundo ${targetWcYear} · Rodadas 1 e 2`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: `Abertura das Eliminatórias Africanas da Copa ${targetWcYear}: 54 seleções FIFA (sem Zanzibar e Reunião) divididas em 9 grupos de 6 (ida e volta · 10 rodadas).`,
        }
      );
    } else {
      // 2029, 2033, 2037 (Eliminatórias Copa Rodadas 3–10 + Repescagem CAF dos 4 melhores 2ºs em Nov)
      const targetWcYear = yr + 1;
      entries.push(
        {
          id: `caf_${yr}_mar`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Eliminatórias da Copa do Mundo ${targetWcYear} · Rodadas 3 e 4`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description: `Duas rodadas dos 9 grupos de 6 na corrida pelas 9 vagas diretas da África na Copa do Mundo ${targetWcYear}.`,
        },
        {
          id: `caf_${yr}_jun`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Eliminatórias da Copa do Mundo ${targetWcYear} · Rodadas 5 e 6`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos',
          startDate: junStart,
          endDate: junEnd,
          description: `Fechamento do 1º turno e abertura do returno nos 9 grupos das Eliminatórias Africanas.`,
        },
        {
          id: `caf_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Eliminatórias da Copa do Mundo ${targetWcYear} · Rodadas 7 a 10 (Final dos Grupos)`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '4 jogos',
          startDate: sepStart,
          endDate: octEnd,
          description: `Reta final dos 9 grupos: o campeão de cada grupo garante vaga direta na Copa ${targetWcYear} (9 vagas) e os 4 melhores segundos colocados avançam ao Play-Off da África.`,
        },
        {
          id: `caf_${yr}_nov`,
          year: yr,
          cycleTag: `Repescagem CAF · Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Repescagem da África (Play-Off CAF) · Semifinais e Final`,
          category: 'Repescagem CAF',
          gamesLabel: '2 jogos (jogo único)',
          startDate: novStart,
          endDate: novEnd,
          description: `Os 4 melhores segundos colocados dos 9 grupos disputam Semifinais e Final em jogo único; o campeão representa a África na Repescagem Intercontinental da Copa ${targetWcYear}.`,
        }
      );
    }
  }

  return entries;
}

export const OFFICIAL_AFRICA_CALENDAR_2026_2038: OfficialAfricaCalendarEntry[] =
  buildOfficialAfricaCalendar2026To2038();

export interface OfficialEuropeCalendarEntry {
  id: string;
  year: number;
  cycleTag: string;
  periodLabel: string;
  label: string;
  category:
    | 'Copa do Mundo'
    | 'UEFA Nations League'
    | 'Eliminatórias Euro'
    | 'Eurocopa'
    | 'Eliminatórias Copa do Mundo'
    | 'Repescagem UEFA'
    | 'Finalíssima'
    | 'Amistosos';
  gamesLabel: string;
  startDate: string;
  endDate: string;
  description: string;
}

export function buildOfficialEuropeCalendar2026To2038(): OfficialEuropeCalendarEntry[] {
  const entries: OfficialEuropeCalendarEntry[] = [];
  const monthShort = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const formatPtPeriod = (startIso: string, endIso: string): string => {
    const [, sm, sd] = startIso.split('-').map(Number);
    const [, em, ed] = endIso.split('-').map(Number);
    if (sm === em) return `${sd} a ${ed} de ${monthShort[sm - 1]}`;
    return `${sd}/${monthShort[sm - 1]} a ${ed}/${monthShort[em - 1]}`;
  };

  for (let yr = 2026; yr <= 2038; yr++) {
    const w = getFifaWindowDatesForYear(yr);
    const marStart = addDays(w.mar1, -3);
    const marEnd = w.mar2;
    const junStart = addDays(w.jun1, -3);
    const junEnd = w.jun2;
    const sepStart = addDays(w.sep1, -3);
    const octEnd = w.oct2;
    const novStart = addDays(w.nov1, -3);
    const novEnd = w.nov2;

    if (yr % 4 === 2) {
      // 2026, 2030, 2034, 2038 — Copa do Mundo + Repescagem UEFA (2030+) + Finalíssima + Início Nations League (2026/27 transição; 2030/31+ reformada 3 Ligas)
      const is2026 = yr === 2026;
      const is2030 = yr === 2030;
      const nlLabel = `${yr}/${String(yr + 1).slice(-2)}`;
      entries.push(
        {
          id: `uefa_${yr}_mar`,
          year: yr,
          cycleTag: `Copa do Mundo ${yr}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: is2026
            ? `Finalíssima CONMEBOL–UEFA ${yr} & Amistosos Preparatórios`
            : `Repescagem Europeia (Play-Off UEFA) · Finalíssima ${yr}`,
          category: is2026 ? 'Finalíssima' : 'Repescagem UEFA',
          gamesLabel: is2026 ? '2 jogos' : '4 chaves (16 sel. -> 4 vagas)',
          startDate: marStart,
          endDate: marEnd,
          description: is2026
            ? `Finalíssima intercontinental e dois amistosos oficiais na reta final de preparação europeia para a Copa do Mundo FIFA 2026.`
            : `16 seleções (12 melhores remanescentes da Liga 1 + 4 melhores da Liga 2) disputam 4 chaves eliminatórias em março (Semifinal e Final) pelas últimas 4 vagas da UEFA na Copa ${yr}.`,
        },
        {
          id: `uefa_${yr}_jun_prep`,
          year: yr,
          cycleTag: `Copa do Mundo ${yr}`,
          periodLabel: formatPtPeriod(junStart, w.jun1),
          label: `Data FIFA · Amistoso Preparatório Pré-Copa`,
          category: 'Amistosos',
          gamesLabel: '1 jogo',
          startDate: junStart,
          endDate: w.jun1,
          description: `Teste oficial de encerramento da preparação antes da abertura da Copa do Mundo FIFA ${yr}.`,
        },
        {
          id: `uefa_${yr}_wc`,
          year: yr,
          cycleTag: `Copa do Mundo ${yr}`,
          periodLabel: is2030 ? `8/jun a 21/jul de ${yr}` : `11/jun a 19/jul de ${yr}`,
          label: is2030
            ? `Copa do Mundo FIFA 2030 · Espanha, Portugal & Marrocos (Centenário)`
            : `Copa do Mundo FIFA ${yr} (16 seleções UEFA)`,
          category: 'Copa do Mundo',
          gamesLabel: '48 seleções (16 UEFA)',
          startDate: is2030 ? `${yr}-06-08` : `${yr}-06-11`,
          endDate: is2030 ? `${yr}-07-21` : `${yr}-07-19`,
          description: is2030
            ? `Edição do Centenário: jogos inaugurais em 8 e 9/06 (Uruguai, Argentina e Paraguai), abertura nas sedes principais (Espanha, Portugal e Marrocos) em 13/06 e Grande Final em 21/07.`
            : `Torneio mundial com 48 seleções (16 vagas da UEFA) em 12 grupos de 4 e mata-mata de 32 até a Grande Final.`,
        },
        {
          id: `uefa_${yr}_nl_sep_oct`,
          year: yr,
          cycleTag: `UEFA Nations League ${nlLabel}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `UEFA Nations League ${nlLabel} · Rodadas 1 a 4`,
          category: 'UEFA Nations League',
          gamesLabel: is2026 ? '4 jogos · 4 Ligas (Transição)' : '4 jogos · 3 Ligas (Suíço 3×6)',
          startDate: sepStart,
          endDate: octEnd,
          description: is2026
            ? `Última edição no formato tradicional de 4 divisões (Ligas A, B e C com 4×4; Liga D com 2×3). Quatro rodadas disputadas na Super Data FIFA de Set/Out.`
            : `Novo formato reformado de 3 divisões (Ligas A, B e C · 3 grupos de 6 cada): cada seleção faz 6 jogos contra 5 adversários diferentes no Sistema Suíço.`,
        },
        {
          id: `uefa_${yr}_nl_nov`,
          year: yr,
          cycleTag: `UEFA Nations League ${nlLabel}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `UEFA Nations League ${nlLabel} · Rodadas 5 e 6 (Encerramento)`,
          category: 'UEFA Nations League',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: is2026
            ? `Encerramento da fase de grupos em 17/11/2026: os 1º e 2º da Liga A (8 seleções) avançam às Quartas de Final em março de 2027; Liga D é extinta após a edição.`
            : `Fechamento das 6 rodadas suíças: Top 2 de cada grupo da Liga A + 2 melhores 3ºs (8 seleções) avançam às Quartas de Final ida e volta.`,
        }
      );
    } else if (yr % 4 === 3) {
      // 2027, 2031, 2035 — Nations League QF (Mar) + Final Four (Jun) + Eliminatórias da Euro (12 grupos: 6×4 Set–Nov, 6×5 Mar–Nov)
      const targetEuroYear = yr + 1;
      const nlLabel = `${yr - 1}/${String(yr).slice(-2)}`;
      entries.push(
        {
          id: `uefa_${yr}_mar`,
          year: yr,
          cycleTag: `Nations League ${nlLabel} & Elim. Euro ${targetEuroYear}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Nations League · Quartas (Ida/Volta) & Elim. Euro (R1–R2)`,
          category: 'UEFA Nations League',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description: `As 8 seleções da Liga A disputam Quartas de Final ida e volta (25–30/03${yr === 2027 ? '/2027' : ''}); seleções dos 6 grupos de 5 (G–L) abrem as Eliminatórias da Euro ${targetEuroYear}.`,
        },
        {
          id: `uefa_${yr}_jun`,
          year: yr,
          cycleTag: `Nations League ${nlLabel} & Elim. Euro ${targetEuroYear}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Nations League · Final Four & Elim. Euro (R3–R4)`,
          category: 'UEFA Nations League',
          gamesLabel: 'Semis + Final · 2 rodadas Euro',
          startDate: junStart,
          endDate: junEnd,
          description: `Fase Final (Final Four) da UEFA Nations League ${nlLabel} (Semifinais, 3º Lugar e Grande Final), em paralelo às rodadas 3 e 4 dos grupos de 5 das Eliminatórias da Euro ${targetEuroYear}.`,
        },
        {
          id: `uefa_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Eliminatórias Euro ${targetEuroYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Eliminatórias da Eurocopa ${targetEuroYear} · Super Data FIFA (4 rodadas)`,
          category: 'Eliminatórias Euro',
          gamesLabel: '4 rodadas (todos os 12 grupos)',
          startDate: sepStart,
          endDate: octEnd,
          description: `Os 6 grupos de 4 (A–F, com os quadrifinalistas da Nations League) estreiam em setembro e todos os 12 grupos disputam 4 rodadas decisivas rumo às 20 vagas diretas.`,
        },
        {
          id: `uefa_${yr}_nov`,
          year: yr,
          cycleTag: `Eliminatórias Euro ${targetEuroYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Eliminatórias da Eurocopa ${targetEuroYear} · Rodadas Finais (9ª e 10ª)`,
          category: 'Eliminatórias Euro',
          gamesLabel: '2 rodadas (20 vagas diretas)',
          startDate: novStart,
          endDate: novEnd,
          description: `Encerramento dos 12 grupos: os 12 líderes e os 8 melhores segundos colocados (20 seleções) garantem vaga direta na Euro ${targetEuroYear}${targetEuroYear === 2028 ? ' (até 2 vagas reservadas aos coanfitriões ING/ESC/GAL/IRL se necessário)' : ''}.`,
        }
      );
    } else if (yr % 4 === 0) {
      // 2028, 2032, 2036 — Repescagem Euro (Mar) + Eurocopa 24 sel. (9/06–9/07) + Nova Nations League 3 Ligas (Set–Nov)
      const nlLabel = `${yr}/${String(yr + 1).slice(-2)}`;
      entries.push(
        {
          id: `uefa_${yr}_mar`,
          year: yr,
          cycleTag: `Eurocopa ${yr}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Repescagem da Eurocopa ${yr} (Play-Off Euro) & Amistosos`,
          category: 'Repescagem UEFA',
          gamesLabel: '2 a 4 vagas finais',
          startDate: marStart,
          endDate: marEnd,
          description: `Definição das últimas vagas da Euro ${yr} conforme vagas de anfitriões usadas: 2 chaves jogo único (2 vagas), 3 chaves jogo único (3 vagas) ou 4 confrontos ida e volta (4 vagas).`,
        },
        {
          id: `uefa_${yr}_jun_prep`,
          year: yr,
          cycleTag: `Eurocopa ${yr}`,
          periodLabel: formatPtPeriod(junStart, w.jun1),
          label: `Data FIFA · Amistoso Preparatório Pré-Euro`,
          category: 'Amistosos',
          gamesLabel: '1 jogo',
          startDate: junStart,
          endDate: w.jun1,
          description: `Amistoso oficial de preparação antes do pontapé inicial da Eurocopa ${yr} em 9 de junho.`,
        },
        {
          id: `uefa_${yr}_euro`,
          year: yr,
          cycleTag: `Eurocopa ${yr}`,
          periodLabel: `9/jun a 9/jul de ${yr}`,
          label: `UEFA Eurocopa ${yr}${yr === 2028 ? ' · Reino Unido & Irlanda (Final em Wembley)' : yr === 2032 ? ' · Itália & Turquia' : ''}`,
          category: 'Eurocopa',
          gamesLabel: '24 seleções · 51 jogos',
          startDate: `${yr}-06-09`,
          endDate: `${yr}-07-09`,
          description: `24 seleções em 6 grupos de 4 (9–21/06), Oitavas (24–27/06), Quartas (30/06–01/07), Semifinais (04–05/07) e Grande Final em 09/07${yr === 2028 ? ' no Estádio de Wembley' : ''}.`,
        },
        {
          id: `uefa_${yr}_nl_sep_oct`,
          year: yr,
          cycleTag: `UEFA Nations League ${nlLabel}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Nova UEFA Nations League ${nlLabel} (3 Ligas · Sistema Suíço) · R1–R4`,
          category: 'UEFA Nations League',
          gamesLabel: '4 jogos · 3 Ligas A/B/C (3×6)',
          startDate: sepStart,
          endDate: octEnd,
          description: `Estreia/continuidade da reforma UEFA: Liga D extinta, 3 divisões de 18 seleções (3 grupos de 6 por liga), 6 jogos contra 5 rivais distintos no Sistema Suíço.`,
        },
        {
          id: `uefa_${yr}_nl_nov`,
          year: yr,
          cycleTag: `UEFA Nations League ${nlLabel}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `UEFA Nations League ${nlLabel} · Rodadas 5 e 6 (Encerramento)`,
          category: 'UEFA Nations League',
          gamesLabel: '2 jogos',
          startDate: novStart,
          endDate: novEnd,
          description: `Conclusão das 6 rodadas suíças: os 2 melhores de cada grupo da Liga A + os 2 melhores 3ºs avançam às Quartas de Final em março de ${yr + 1}.`,
        }
      );
    } else {
      // 2029, 2033, 2037 — Nations League QF (Mar) + Final Four (Jun) + Eliminatórias Copa (Liga 2 Mar–Set · Liga 1 Set–Nov)
      const targetWcYear = yr + 1;
      const nlLabel = `${yr - 1}/${String(yr).slice(-2)}`;
      entries.push(
        {
          id: `uefa_${yr}_mar`,
          year: yr,
          cycleTag: `Nations League ${nlLabel} & Elim. Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(marStart, marEnd),
          label: `Nations League · Quartas (Ida/Volta) & Elim. Copa Liga 2 (R1–R2)`,
          category: 'UEFA Nations League',
          gamesLabel: '2 jogos',
          startDate: marStart,
          endDate: marEnd,
          description: `Quartas de Final ida e volta da Nations League ${nlLabel} na Liga A, em paralelo à abertura da Liga 2 (18 seleções da Liga C) nas Eliminatórias da Copa ${targetWcYear}.`,
        },
        {
          id: `uefa_${yr}_jun`,
          year: yr,
          cycleTag: `Nations League ${nlLabel} & Elim. Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(junStart, junEnd),
          label: `Nations League · Final Four & Elim. Copa Liga 2 (R3–R4)`,
          category: 'UEFA Nations League',
          gamesLabel: 'Semis + Final · 2 rodadas Liga 2',
          startDate: junStart,
          endDate: junEnd,
          description: `Decisão do título da UEFA Nations League ${nlLabel} (Final Four) e rodadas 3 e 4 da Liga 2 das Eliminatórias Europeias da Copa ${targetWcYear}.`,
        },
        {
          id: `uefa_${yr}_sep_oct`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(sepStart, octEnd),
          label: `Eliminatórias UEFA Copa ${targetWcYear} · Liga 1 (R1–R4) & Final Liga 2`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '4 jogos Liga 1 · 2 jogos Liga 2',
          startDate: sepStart,
          endDate: octEnd,
          description: `Novo modelo UEFA: Liga 1 (36 seleções em 3 grupos de 12 · Sistema Suíço 6 jogos) inicia com 4 rodadas (Espanha e Portugal jogam normalmente em 2029); Liga 2 encerra suas 6 rodadas definindo 4 classificados à Repescagem.`,
        },
        {
          id: `uefa_${yr}_nov`,
          year: yr,
          cycleTag: `Eliminatórias Copa ${targetWcYear}`,
          periodLabel: formatPtPeriod(novStart, novEnd),
          label: `Eliminatórias UEFA Copa ${targetWcYear} · Liga 1 Rodadas 5 e 6 (Final)`,
          category: 'Eliminatórias Copa do Mundo',
          gamesLabel: '2 jogos (12 vagas diretas)',
          startDate: novStart,
          endDate: novEnd,
          description: `Encerramento da Liga 1: 12 vagas diretas definidas${targetWcYear === 2030 ? ' (Espanha e Portugal + 10 melhores elegíveis da Liga 1)' : ' (Top 4 de cada um dos 3 grupos da Liga 1)'}; próximos 12 da Liga 1 + 4 da Liga 2 seguem à Repescagem de março de ${targetWcYear}.`,
        }
      );
    }
  }

  return entries;
}

export const OFFICIAL_EUROPE_CALENDAR_2026_2038: OfficialEuropeCalendarEntry[] =
  buildOfficialEuropeCalendar2026To2038();

export function getFifaCalendarWindowsForYear(year: number): FifaCalendarWindow[] {
  if (year === 2026) {
    return [
      {
        id: `fifa_2026_mar`,
        year: 2026,
        kind: 'FIFA_WINDOW',
        name: 'Amistosos de Março 2026',
        shortLabel: 'Amistosos · Mar',
        matchCountSummary: '2 jogos · Amistosos',
        seasonLabel: 'Temporada 2026',
        competitionSummary: '23 a 31 de março de 2026 — Amistosos (2 jogos)',
        detailNote: '23 a 31 de março: Amistosos Internacionais preparatórios pré-Copa (2 jogos)',
        releaseStartDate: '2026-03-23',
        endDate: '2026-03-31',
        returnDate: '2026-04-01',
        officialMatchDates: ['2026-03-26', '2026-03-31'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2026_jun`,
        year: 2026,
        kind: 'FIFA_WINDOW',
        name: 'Amistosos de Junho 2026 (Pré-Copa)',
        shortLabel: 'Amistosos · Jun',
        matchCountSummary: '2 jogos · Amistosos',
        seasonLabel: 'Temporada 2026',
        competitionSummary: '1 a 9 de junho de 2026 — Amistosos (2 jogos)',
        detailNote: '1 a 9 de junho: Amistosos finais preparatórios para a Copa do Mundo (2 jogos)',
        releaseStartDate: '2026-06-01',
        endDate: '2026-06-09',
        returnDate: '2026-06-10',
        officialMatchDates: ['2026-06-04', '2026-06-09'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2026_wc`,
        year: 2026,
        kind: 'WORLD_CUP',
        name: 'Copa do Mundo FIFA de 2026 (EUA, México e Canadá)',
        shortLabel: 'Copa do Mundo 2026',
        matchCountSummary: 'Junho/Julho · Copa do Mundo',
        seasonLabel: 'Temporada 2026',
        competitionSummary: 'junho/julho (11 de junho a 19 de julho de 2026) — Copa do Mundo FIFA',
        detailNote: '11 de junho a 19 de julho: Copa do Mundo FIFA de 2026 (Estados Unidos, México e Canadá)',
        releaseStartDate: '2026-06-11',
        endDate: '2026-07-19',
        returnDate: '2026-07-20',
        officialMatchDates: ['2026-06-11', '2026-07-19'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2026_super_sep_oct`,
        year: 2026,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Setembro/Outubro 2026 (4 jogos)',
        shortLabel: 'Data FIFA · Set/Out (4 jogos)',
        isSuperFifaWindow: true,
        matchCountSummary: '4 jogos · Data FIFA',
        seasonLabel: 'Temporada 2026',
        competitionSummary: '21 de setembro a 6 de outubro de 2026 — Data FIFA (4 jogos)',
        detailNote: '21 de setembro a 6 de outubro: Data FIFA estendida de 16 dias com 4 jogos por seleção',
        releaseStartDate: '2026-09-21',
        endDate: '2026-10-06',
        returnDate: '2026-10-07',
        officialMatchDates: ['2026-09-24', '2026-09-28', '2026-10-02', '2026-10-06'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2026_nov`,
        year: 2026,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Novembro 2026',
        shortLabel: 'Data FIFA · Nov',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2026',
        competitionSummary: '9 a 17 de novembro de 2026 — Data FIFA (2 jogos)',
        detailNote: '9 a 17 de novembro: Data FIFA oficial (2 jogos)',
        releaseStartDate: '2026-11-09',
        endDate: '2026-11-17',
        returnDate: '2026-11-18',
        officialMatchDates: ['2026-11-12', '2026-11-17'],
        regionTag: 'GLOBAL',
      },
    ];
  }

  if (year === 2027) {
    return [
      {
        id: `fifa_2027_mar`,
        year: 2027,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Março 2027',
        shortLabel: 'Data FIFA · Mar',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2027',
        competitionSummary: '22 a 30 de março de 2027 — Data FIFA (2 jogos)',
        detailNote: '22 a 30 de março: Data FIFA (2 jogos)',
        releaseStartDate: '2027-03-22',
        endDate: '2027-03-30',
        returnDate: '2027-03-31',
        officialMatchDates: ['2027-03-25', '2027-03-30'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2027_jun`,
        year: 2027,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Junho 2027',
        shortLabel: 'Data FIFA · Jun',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2027',
        competitionSummary: '7 a 15 de junho de 2027 — Data FIFA (2 jogos)',
        detailNote: '7 a 15 de junho: Data FIFA (2 jogos) · Finais Liga C CONCACAF & Eliminatórias',
        releaseStartDate: '2027-06-07',
        endDate: '2027-06-15',
        returnDate: '2027-06-16',
        officialMatchDates: ['2027-06-10', '2027-06-15'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2027_copa_ouro`,
        year: 2027,
        kind: 'CONTINENTAL_CUP',
        name: 'Copa Ouro da CONCACAF 2027 (16 Seleções)',
        shortLabel: 'Copa Ouro 2027',
        matchCountSummary: '17/06 a 11/07 · CONCACAF',
        seasonLabel: 'Temporada 2027',
        competitionSummary: '17 de junho a 11 de julho de 2027 — Copa Ouro da CONCACAF 2027',
        detailNote: '17 de junho a 11 de julho de 2027: Copa Ouro da CONCACAF (16 seleções em 4 grupos de 4 + Quartas, Semi e Final)',
        releaseStartDate: '2027-06-17',
        endDate: '2027-07-11',
        returnDate: '2027-07-12',
        officialMatchDates: ['2027-06-17', '2027-07-11'],
        regionTag: 'CONCACAF',
      },
      {
        id: `fifa_2027_super_sep_oct`,
        year: 2027,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Setembro/Outubro 2027 (4 jogos)',
        shortLabel: 'Data FIFA · Set/Out (4 jogos)',
        isSuperFifaWindow: true,
        matchCountSummary: '4 jogos · Data FIFA',
        seasonLabel: 'Temporada 2027',
        competitionSummary: '20 de setembro a 5 de outubro de 2027 — Data FIFA (4 jogos)',
        detailNote: '20 de setembro a 5 de outubro: Data FIFA estendida (4 jogos)',
        releaseStartDate: '2027-09-20',
        endDate: '2027-10-05',
        returnDate: '2027-10-06',
        officialMatchDates: ['2027-09-23', '2027-09-26', '2027-09-30', '2027-10-05'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2027_nov`,
        year: 2027,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Novembro 2027',
        shortLabel: 'Data FIFA · Nov',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2027',
        competitionSummary: '8 a 16 de novembro de 2027 — Data FIFA (2 jogos)',
        detailNote: '8 a 16 de novembro: Data FIFA (2 jogos)',
        releaseStartDate: '2027-11-08',
        endDate: '2027-11-16',
        returnDate: '2027-11-17',
        officialMatchDates: ['2027-11-11', '2027-11-16'],
        regionTag: 'GLOBAL',
      },
    ];
  }

  if (year === 2028) {
    return [
      {
        id: `fifa_2028_mar`,
        year: 2028,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Março 2028',
        shortLabel: 'Data FIFA · Mar',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2028',
        competitionSummary: '20 a 28 de março de 2028 — Data FIFA (2 jogos)',
        detailNote: '20 a 28 de março: Data FIFA (2 jogos)',
        releaseStartDate: '2028-03-20',
        endDate: '2028-03-28',
        returnDate: '2028-03-29',
        officialMatchDates: ['2028-03-23', '2028-03-28'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2028_may_jun`,
        year: 2028,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Maio/Junho 2028',
        shortLabel: 'Data FIFA · Mai/Jun',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2028',
        competitionSummary: '29 de maio a 6 de junho de 2028 — Data FIFA (2 jogos)',
        detailNote: '29 de maio a 6 de junho: Data FIFA oficial pré-torneios continentais (2 jogos)',
        releaseStartDate: '2028-05-29',
        endDate: '2028-06-06',
        returnDate: '2028-06-07',
        officialMatchDates: ['2028-06-01', '2028-06-06'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2028_copa_america`,
        year: 2028,
        kind: 'CONTINENTAL_CUP',
        name: 'CONMEBOL Copa América 2028 (Paraguai)',
        shortLabel: 'Copa América 2028',
        matchCountSummary: 'Junho/Julho · CONMEBOL + Convidados',
        seasonLabel: 'Temporada 2028',
        competitionSummary: 'junho/julho — Copa América 2028',
        detailNote: 'Junho/Julho de 2028: Copa América (c/ 6 CONCACAF), Eurocopa, CAN, Copa da Ásia e Copa da Oceania',
        releaseStartDate: '2028-06-11',
        endDate: '2028-07-14',
        returnDate: '2028-07-15',
        officialMatchDates: ['2028-06-14', '2028-07-14'],
        regionTag: 'CONMEBOL',
      },
      {
        id: `fifa_2028_euro`,
        year: 2028,
        kind: 'CONTINENTAL_CUP',
        name: 'UEFA Eurocopa 2028 (Reino Unido e Irlanda)',
        shortLabel: 'Eurocopa 2028',
        matchCountSummary: 'Junho/Julho · UEFA',
        seasonLabel: 'Temporada 2028',
        competitionSummary: 'junho/julho — Eurocopa 2028',
        detailNote: 'Junho/Julho de 2028: UEFA Eurocopa 2028 (Reino Unido e Irlanda)',
        releaseStartDate: '2028-06-09',
        endDate: '2028-07-14',
        returnDate: '2028-07-15',
        officialMatchDates: ['2028-06-09', '2028-07-14'],
        regionTag: 'UEFA',
      },
      {
        id: `fifa_2028_can`,
        year: 2028,
        kind: 'CONTINENTAL_CUP',
        name: 'Copa da África (CAN) 2028',
        shortLabel: 'Copa da África 2028',
        matchCountSummary: 'Junho/Julho · CAF',
        seasonLabel: 'Temporada 2028',
        competitionSummary: 'junho/julho — Copa Africana de Nações (CAN) 2028',
        detailNote: 'Junho/Julho de 2028: Copa da África (CAN)',
        releaseStartDate: '2028-06-14',
        endDate: '2028-07-12',
        returnDate: '2028-07-13',
        officialMatchDates: ['2028-06-14', '2028-07-12'],
        regionTag: 'CAF',
      },
      {
        id: `fifa_2028_asia`,
        year: 2028,
        kind: 'CONTINENTAL_CUP',
        name: 'Copa da Ásia (AFC) 2028 (32 Seleções)',
        shortLabel: 'Copa da Ásia 2028',
        matchCountSummary: 'Junho/Julho · AFC (32 seleções · 8×4 + Oitavas a Final)',
        seasonLabel: 'Temporada 2028',
        competitionSummary: 'junho/julho — Copa da Ásia AFC 2028 (32 seleções)',
        detailNote: 'Junho/Julho de 2028: Copa da Ásia AFC com 32 seleções em 8 grupos de 4 + Oitavas, Quartas, Semis e Final',
        releaseStartDate: '2028-06-14',
        endDate: '2028-07-11',
        returnDate: '2028-07-12',
        officialMatchDates: ['2028-06-14', '2028-07-11'],
        regionTag: 'AFC',
      },
      {
        id: `fifa_2028_ofc`,
        year: 2028,
        kind: 'CONTINENTAL_CUP',
        name: 'Copa da Oceania (OFC) 2028',
        shortLabel: 'Copa da Oceania 2028',
        matchCountSummary: 'Junho/Julho · OFC',
        seasonLabel: 'Temporada 2028',
        competitionSummary: 'junho/julho — Copa das Nações da OFC (Oceania) 2028',
        detailNote: 'Junho/Julho de 2028: Copa da Oceania OFC',
        releaseStartDate: '2028-06-14',
        endDate: '2028-07-11',
        returnDate: '2028-07-12',
        officialMatchDates: ['2028-06-14', '2028-07-11'],
        regionTag: 'OFC',
      },
      {
        id: `fifa_2028_super_sep_oct`,
        year: 2028,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Setembro/Outubro 2028 (4 jogos)',
        shortLabel: 'Data FIFA · Set/Out (4 jogos)',
        isSuperFifaWindow: true,
        matchCountSummary: '4 jogos · Data FIFA',
        seasonLabel: 'Temporada 2028',
        competitionSummary: '18 de setembro a 3 de outubro de 2028 — Data FIFA (4 jogos)',
        detailNote: '18 de setembro a 3 de outubro: Data FIFA estendida (4 jogos)',
        releaseStartDate: '2028-09-18',
        endDate: '2028-10-03',
        returnDate: '2028-10-04',
        officialMatchDates: ['2028-09-21', '2028-09-24', '2028-09-28', '2028-10-03'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2028_nov`,
        year: 2028,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Novembro 2028',
        shortLabel: 'Data FIFA · Nov',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2028',
        competitionSummary: '13 a 21 de novembro de 2028 — Data FIFA (2 jogos)',
        detailNote: '13 a 21 de novembro: Data FIFA (2 jogos)',
        releaseStartDate: '2028-11-13',
        endDate: '2028-11-21',
        returnDate: '2028-11-22',
        officialMatchDates: ['2028-11-16', '2028-11-21'],
        regionTag: 'GLOBAL',
      },
    ];
  }

  if (year === 2029) {
    return [
      {
        id: `fifa_2029_mar`,
        year: 2029,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Março 2029',
        shortLabel: 'Data FIFA · Mar',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2029',
        competitionSummary: '19 a 27 de março de 2029 — Data FIFA (2 jogos)',
        detailNote: '19 a 27 de março: Data FIFA (2 jogos)',
        releaseStartDate: '2029-03-19',
        endDate: '2029-03-27',
        returnDate: '2029-03-28',
        officialMatchDates: ['2029-03-22', '2029-03-27'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2029_jun`,
        year: 2029,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Junho 2029',
        shortLabel: 'Data FIFA · Jun',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2029',
        competitionSummary: '4 a 12 de junho de 2029 — Data FIFA (2 jogos)',
        detailNote: '4 a 12 de junho: Data FIFA e Finais da UEFA Nations League (2 jogos)',
        releaseStartDate: '2029-06-04',
        endDate: '2029-06-12',
        returnDate: '2029-06-13',
        officialMatchDates: ['2029-06-07', '2029-06-12'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2029_super_mundial`,
        year: 2029,
        kind: 'CONTINENTAL_CUP',
        name: 'Super Mundial de Clubes FIFA 2029 (32 Clubes)',
        shortLabel: 'Super Mundial 2029',
        matchCountSummary: 'Torneio de Clubes FIFA',
        seasonLabel: 'Temporada 2029',
        competitionSummary: '14 de junho a 13 de julho de 2029: Super Mundial de Clubes FIFA com paralisação oficial do calendário de clubes',
        detailNote: '14 de junho a 13 de julho de 2029: Super Mundial de Clubes FIFA',
        releaseStartDate: '2029-06-14',
        endDate: '2029-07-13',
        returnDate: '2029-07-14',
        officialMatchDates: ['2029-06-15', '2029-07-13'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2029_copa_ouro`,
        year: 2029,
        kind: 'CONTINENTAL_CUP',
        name: 'Copa Ouro da CONCACAF 2029 (16 Seleções)',
        shortLabel: 'Copa Ouro 2029',
        matchCountSummary: '17/06 a 11/07 · CONCACAF',
        seasonLabel: 'Temporada 2029',
        competitionSummary: '17 de junho a 11 de julho de 2029 — Copa Ouro da CONCACAF 2029',
        detailNote: '17 de junho a 11 de julho de 2029: Copa Ouro da CONCACAF (16 seleções)',
        releaseStartDate: '2029-06-17',
        endDate: '2029-07-11',
        returnDate: '2029-07-12',
        officialMatchDates: ['2029-06-17', '2029-07-11'],
        regionTag: 'CONCACAF',
      },
      {
        id: `fifa_2029_super_sep_oct`,
        year: 2029,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Setembro/Outubro 2029 (4 jogos)',
        shortLabel: 'Data FIFA · Set/Out (4 jogos)',
        isSuperFifaWindow: true,
        matchCountSummary: '4 jogos · Data FIFA',
        seasonLabel: 'Temporada 2029',
        competitionSummary: '29 de setembro a 9 de outubro de 2029 — Data FIFA (4 jogos)',
        detailNote: '29 de setembro a 9 de outubro: Data FIFA estendida (4 jogos)',
        releaseStartDate: '2029-09-29',
        endDate: '2029-10-09',
        returnDate: '2029-10-10',
        officialMatchDates: ['2029-09-29', '2029-10-02', '2029-10-05', '2029-10-09'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2029_nov`,
        year: 2029,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Novembro 2029',
        shortLabel: 'Data FIFA · Nov',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2029',
        competitionSummary: '12 a 20 de novembro de 2029 — Data FIFA (2 jogos)',
        detailNote: '12 a 20 de novembro: Data FIFA (2 jogos · Fim das Eliminatórias CONMEBOL)',
        releaseStartDate: '2029-11-12',
        endDate: '2029-11-20',
        returnDate: '2029-11-21',
        officialMatchDates: ['2029-11-15', '2029-11-20'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2029_wc_draw`,
        year: 2029,
        kind: 'FIFA_WINDOW',
        name: 'Sorteio Oficial dos Grupos da Copa do Mundo de 2030',
        shortLabel: 'Sorteio Copa 2030',
        matchCountSummary: 'Sorteio Oficial Mundial 2030',
        seasonLabel: 'Temporada 2029',
        competitionSummary: 'Fim de 2029: Sorteio oficial dos grupos da Copa do Mundo de 2030',
        detailNote: 'Dezembro de 2029: Sorteio oficial dos grupos da Copa do Mundo de 2030.',
        releaseStartDate: '2029-12-05',
        endDate: '2029-12-05',
        returnDate: '2029-12-06',
        officialMatchDates: ['2029-12-05'],
        regionTag: 'GLOBAL',
      },
    ];
  }

  if (year === 2030) {
    return [
      {
        id: `fifa_2030_mar`,
        year: 2030,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Março 2030',
        shortLabel: 'Data FIFA · Mar',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2030',
        competitionSummary: '18 a 26 de março de 2030 — Data FIFA (2 jogos)',
        detailNote: '18 a 26 de março: Data FIFA e Play-offs / Repescagem Intercontinental (2 jogos)',
        releaseStartDate: '2030-03-18',
        endDate: '2030-03-26',
        returnDate: '2030-03-27',
        officialMatchDates: ['2030-03-21', '2030-03-26'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2030_pre_wc`,
        year: 2030,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Junho 2030 (Pré-Copa)',
        shortLabel: 'Data FIFA · Jun',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2030',
        competitionSummary: '3 a 11 de junho de 2030 — Data FIFA (2 jogos)',
        detailNote: '3 a 11 de junho: Período de liberação e amistosos preparatórios pré-Copa (2 jogos)',
        releaseStartDate: '2030-06-03',
        endDate: '2030-06-11',
        returnDate: '2030-06-12',
        officialMatchDates: ['2030-06-05', '2030-06-11'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2030_centenario`,
        year: 2030,
        kind: 'WORLD_CUP',
        name: 'Jogos Comemorativos do Centenário na América do Sul',
        shortLabel: 'Centenário 2030',
        matchCountSummary: '8 a 9 de junho · Centenário',
        seasonLabel: 'Copa do Mundo 2030',
        competitionSummary: '8 a 9 de junho de 2030: Jogos comemorativos dos 100 anos da Copa do Mundo na América do Sul (Uruguai, Argentina e Paraguai).',
        detailNote: '8 a 9 de junho de 2030: Centenário na América do Sul',
        specialEventDate: '2030-06-08',
        releaseStartDate: '2030-06-03',
        endDate: '2030-06-09',
        returnDate: '2030-06-10',
        officialMatchDates: ['2030-06-08', '2030-06-09'],
        regionTag: 'CONMEBOL',
      },
      {
        id: `fifa_2030_wc`,
        year: 2030,
        kind: 'WORLD_CUP',
        name: 'Copa do Mundo FIFA de 2030',
        shortLabel: 'Copa do Mundo 2030',
        matchCountSummary: 'Junho/Julho · Copa do Mundo',
        seasonLabel: 'Copa do Mundo 2030',
        competitionSummary: 'junho/julho (8 de junho a 21 de julho de 2030) — Copa do Mundo FIFA',
        detailNote: '8 de junho a 21 de julho de 2030: Copa do Mundo FIFA 2030 (Espanha, Portugal, Marrocos & Centenário América do Sul)',
        specialEventDate: '2030-06-13',
        releaseStartDate: '2030-06-08',
        endDate: '2030-07-21',
        returnDate: '2030-07-22',
        officialMatchDates: ['2030-06-08', '2030-06-13', '2030-07-21'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2030_super_sep_oct`,
        year: 2030,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Setembro/Outubro 2030 (4 jogos)',
        shortLabel: 'Data FIFA · Set/Out (4 jogos)',
        isSuperFifaWindow: true,
        matchCountSummary: '4 jogos · Data FIFA',
        seasonLabel: 'Temporada 2030/2031',
        competitionSummary: '23 de setembro a 8 de outubro de 2030 — Data FIFA (4 jogos)',
        detailNote: '23 de setembro a 8 de outubro: Data FIFA estendida Pós-Copa (4 jogos)',
        releaseStartDate: '2030-09-23',
        endDate: '2030-10-08',
        returnDate: '2030-10-09',
        officialMatchDates: ['2030-09-26', '2030-09-29', '2030-10-03', '2030-10-08'],
        regionTag: 'GLOBAL',
      },
      {
        id: `fifa_2030_nov`,
        year: 2030,
        kind: 'FIFA_WINDOW',
        name: 'Data FIFA de Novembro 2030',
        shortLabel: 'Data FIFA · Nov',
        matchCountSummary: '2 jogos · Data FIFA',
        seasonLabel: 'Temporada 2030/2031',
        competitionSummary: '11 a 19 de novembro de 2030 — Data FIFA (2 jogos)',
        detailNote: '11 a 19 de novembro: Data FIFA (2 jogos)',
        releaseStartDate: '2030-11-11',
        endDate: '2030-11-19',
        returnDate: '2030-11-20',
        officialMatchDates: ['2030-11-14', '2030-11-19'],
        regionTag: 'GLOBAL',
      },
    ];
  }

  // Dynamic fallback calculation for other years
  const w = getFifaWindowDatesForYear(year);
  const isWorldCupYear = year % 4 === 2;
  const isContinentalCupYear = year >= 2028 && year % 4 === 0;
  const isSuperClubWcYear = year >= 2029 && (year - 2025) % 4 === 0;

  const windows: FifaCalendarWindow[] = [
    {
      id: `fifa_${year}_mar`,
      year,
      kind: 'FIFA_WINDOW',
      name: `Data FIFA de Março ${year}`,
      shortLabel: 'Data FIFA · Mar',
      matchCountSummary: 'Janela Padrão (2 jogos)',
      competitionSummary: isWorldCupYear
        ? 'Finalíssima & Amistosos Preparatórios da Copa'
        : 'Eliminatórias da Copa & Amistosos Oficiais',
      releaseStartDate: addDays(w.mar1, -3),
      endDate: w.mar2,
      returnDate: addDays(w.mar2, 1),
      officialMatchDates: [w.mar1, w.mar2],
    },
  ];

  if (isWorldCupYear) {
    windows.push(
      {
        id: `fifa_${year}_jun`,
        year,
        kind: 'FIFA_WINDOW',
        name: `Amistosos Pré-Copa ${year}`,
        shortLabel: 'Amistosos · Jun',
        matchCountSummary: '2 jogos · Amistosos',
        competitionSummary: 'Amistosos finais preparatórios antes da Copa do Mundo',
        releaseStartDate: addDays(w.jun1, -3),
        endDate: w.jun2,
        returnDate: addDays(w.jun2, 1),
        officialMatchDates: [w.jun1, w.jun2],
      },
      {
        id: `fifa_${year}_wc`,
        year,
        kind: 'WORLD_CUP',
        name: `Copa do Mundo FIFA ${year}`,
        shortLabel: `Copa do Mundo ${year}`,
        competitionSummary: 'Fase de Grupos até a Grande Final · Paralisação Oficial do Calendário',
        releaseStartDate: `${year}-06-11`,
        endDate: `${year}-07-19`,
        returnDate: `${year}-07-20`,
        officialMatchDates: [`${year}-06-11`, `${year}-07-19`],
      }
    );
  } else if (isContinentalCupYear) {
    windows.push(
      {
        id: `fifa_${year}_may_jun`,
        year,
        kind: 'FIFA_WINDOW',
        name: `Data FIFA Pré-Torneios ${year}`,
        shortLabel: 'Amistosos · Mai/Jun',
        matchCountSummary: '2 jogos · Amistosos',
        competitionSummary: 'Amistosos preparatórios para as Copas Continentais',
        releaseStartDate: addDays(w.jun1, -3),
        endDate: w.jun2,
        returnDate: addDays(w.jun2, 1),
        officialMatchDates: [w.jun1, w.jun2],
      },
      {
        id: `fifa_${year}_cont`,
        year,
        kind: 'CONTINENTAL_CUP',
        name: `Copas Continentais ${year} (América, Euro, África, Ásia & Oceania)`,
        shortLabel: `Copas Continentais ${year}`,
        competitionSummary: 'Copa América · Eurocopa · CAN · Copa da Ásia · Copa da Oceania',
        releaseStartDate: `${year}-06-09`,
        endDate: `${year}-07-16`,
        returnDate: `${year}-07-17`,
        officialMatchDates: [`${year}-06-14`, `${year}-07-14`],
      }
    );
  } else {
    windows.push({
      id: `fifa_${year}_jun`,
      year,
      kind: 'FIFA_WINDOW',
      name: `Data FIFA de Junho ${year}`,
      shortLabel: 'Data FIFA · Jun',
      matchCountSummary: 'Janela Padrão (2 jogos)',
      competitionSummary: isSuperClubWcYear
        ? 'Finais Nations League & Amistosos Pré-Super Mundial'
        : 'Eliminatórias da Copa do Mundo e Eliminatórias Continentais',
      releaseStartDate: addDays(w.jun1, -3),
      endDate: w.jun2,
      returnDate: addDays(w.jun2, 1),
      officialMatchDates: [w.jun1, w.jun2],
    });

    if (isSuperClubWcYear) {
      windows.push({
        id: `fifa_${year}_super_mundial`,
        year,
        kind: 'CONTINENTAL_CUP',
        name: `Super Mundial de Clubes FIFA ${year} (32 Clubes)`,
        shortLabel: `Super Mundial ${year}`,
        matchCountSummary: 'Paralisação Oficial Brasileirão & Ligas',
        competitionSummary: `14 de junho a 13 de julho de ${year}: Super Mundial de Clubes FIFA com paralisação do calendário nacional`,
        releaseStartDate: `${year}-06-14`,
        endDate: `${year}-07-13`,
        returnDate: `${year}-07-14`,
        officialMatchDates: [`${year}-06-15`, `${year}-07-13`],
      });
    }

    // Copa Ouro CONCACAF bienal em todos os anos ímpares (2031, 2033, 2035, 2037...)
    if (year % 2 === 1) {
      windows.push({
        id: `fifa_${year}_copa_ouro`,
        year,
        kind: 'CONTINENTAL_CUP',
        name: `Copa Ouro da CONCACAF ${year} (16 Seleções)`,
        shortLabel: `Copa Ouro ${year}`,
        matchCountSummary: '17/06 a 11/07 · CONCACAF',
        competitionSummary: `17 de junho a 11 de julho de ${year} — Copa Ouro da CONCACAF ${year}`,
        releaseStartDate: `${year}-06-17`,
        endDate: `${year}-07-11`,
        returnDate: `${year}-07-12`,
        officialMatchDates: [`${year}-06-17`, `${year}-07-11`],
        regionTag: 'CONCACAF',
      });
    }
  }

  windows.push(
    {
      id: `fifa_${year}_super_sep_oct`,
      year,
      kind: 'FIFA_WINDOW',
      name: `Data FIFA de Setembro/Outubro ${year} (4 jogos)`,
      shortLabel: 'Data FIFA · Set/Out (4 jogos)',
      isSuperFifaWindow: true,
      matchCountSummary: '4 jogos · Data FIFA',
      competitionSummary: 'Janela estendida de 16 dias com 4 jogos oficiais',
      releaseStartDate: addDays(w.sep1, -3),
      endDate: w.oct2,
      returnDate: addDays(w.oct2, 1),
      officialMatchDates: [w.sep1, w.sep2, w.oct1, w.oct2],
    },
    {
      id: `fifa_${year}_nov`,
      year,
      kind: 'FIFA_WINDOW',
      name: `Data FIFA de Novembro ${year}`,
      shortLabel: 'Data FIFA · Nov',
      matchCountSummary: '2 jogos · Data FIFA',
      competitionSummary:
        year % 4 === 1
          ? 'Eliminatórias & Amistosos Internacionais Data FIFA'
          : 'Eliminatórias & Amistosos Oficiais',
      releaseStartDate: addDays(w.nov1, -3),
      endDate: w.nov2,
      returnDate: addDays(w.nov2, 1),
      officialMatchDates: [w.nov1, w.nov2],
    }
  );

  return windows;
}

/**
 * Checks whether `dateStr` (`YYYY-MM-DD`) falls inside a reserved Data FIFA
 * or Seleção summer tournament window.
 */
export function getFifaWindowForDate(dateStr: string): FifaCalendarWindow | null {
  if (!dateStr || dateStr.length < 10) return null;
  const year = Number(dateStr.slice(0, 4));
  if (!year) return null;
  const windows = getFifaCalendarWindowsForYear(year);
  return (
    windows.find((win) => dateStr >= win.releaseStartDate && dateStr <= win.endDate) || null
  );
}

/**
 * Returns the currently active FIFA release window (if `currentDate` is inside one)
 * or the next upcoming FIFA release window across `year` and `year + 1`.
 */
export function getUpcomingOrActiveFifaWindow(currentDate: string): {
  window: FifaCalendarWindow;
  isActiveNow: boolean;
  daysUntilRelease: number;
} | null {
  if (!currentDate || currentDate.length < 10) return null;
  const year = Number(currentDate.slice(0, 4));
  if (!year) return null;

  const allCandidates = [
    ...getFifaCalendarWindowsForYear(year),
    ...getFifaCalendarWindowsForYear(year + 1),
  ];

  const active = allCandidates.find(
    (win) => currentDate >= win.releaseStartDate && currentDate <= win.endDate
  );
  if (active) {
    return {
      window: active,
      isActiveNow: true,
      daysUntilRelease: 0,
    };
  }

  const upcoming = allCandidates.find((win) => win.releaseStartDate > currentDate);
  if (!upcoming) return null;

  return {
    window: upcoming,
    isActiveNow: false,
    daysUntilRelease: Math.max(0, daysBetween(currentDate, upcoming.releaseStartDate)),
  };
}

/**
 * Determines which athletes from `userClub.squad` are called up to their respective
 * National Teams (both user-coached Seleção and CPU-coached Seleções) and must be
 * released during Data FIFA windows.
 */
export function getClubReleasedPlayersForFifa(
  userClub: Club,
  allClubs: Club[],
  nt?: NationalTeamState
): ClubCalledUpPlayerInfo[] {
  if (!userClub || !userClub.squad || userClub.squad.length === 0) return [];

  const effectiveClubs = allClubs.some((c) => c.id === userClub.id)
    ? allClubs.map((c) => (c.id === userClub.id ? userClub : c))
    : [userClub, ...allClubs];

  const clubCountry = userClub.country || 'Brasil';
  const coachedTeamId = nt?.isUserCoach ? nt.userTeamId || 'nt_bra' : null;

  // Group userClub players by their matching NationalTeamProfile
  const playersByNtId = new Map<string, { profile: NationalTeamProfile; players: Player[] }>();

  for (const player of userClub.squad) {
    const isInjured = player.injuryWeeks > 0 || Boolean(player.injuryDetails);
    const nat = resolvePlayerNationality(player, clubCountry);
    const profile = NATIONAL_TEAMS_CATALOG.find((t) => (t.countryMatch || t.name) === nat);
    if (!profile) continue;

    // Injured players are only kept if the user explicitly kept them in their own 26-man list
    const explicitlyCalledByUser =
      coachedTeamId === profile.id && Boolean(nt?.calledUpPlayerIds?.includes(player.id));
    if (isInjured && !explicitlyCalledByUser) continue;

    const bucket = playersByNtId.get(profile.id) || { profile, players: [] };
    bucket.players.push(player);
    playersByNtId.set(profile.id, bucket);
  }

  const released: ClubCalledUpPlayerInfo[] = [];

  playersByNtId.forEach(({ profile, players }) => {
    const isUserCoached = coachedTeamId === profile.id;
    let calledSet: Set<string>;
    let starterSet: Set<string>;

    if (isUserCoached && nt && nt.calledUpPlayerIds.length > 0) {
      calledSet = new Set(nt.calledUpPlayerIds);
      starterSet = new Set(nt.starterPlayerIds);
    } else {
      const optimal = selectOptimalSelecaoSquad(
        effectiveClubs,
        profile.id,
        nt?.virtualPlayers,
        nt?.formation || '4-3-3'
      );
      calledSet = new Set(optimal.calledUpPlayerIds);
      starterSet = new Set(optimal.starterPlayerIds);
    }

    for (const p of players) {
      if (!calledSet.has(p.id)) continue;
      released.push({
        playerId: p.id,
        playerName: p.name,
        detailedRole: p.detailedRole,
        overall: p.overall,
        squadNumber: p.squadNumber,
        isClubStarter: Boolean(p.isStarter),
        nationalTeamId: profile.id,
        nationalTeamName: profile.name,
        nationalTeamCode: profile.code,
        nationalTeamPrimaryColor: profile.primaryColor,
        nationalTeamTextColor: profile.textColor,
        isCoachedByUser: isUserCoached,
        isSelecaoStarter: starterSet.has(p.id),
      });
    }
  });

  return released.sort((a, b) => {
    const roleDiff =
      (SELECAO_ROLE_ORDER[a.detailedRole] ?? 9) -
      (SELECAO_ROLE_ORDER[b.detailedRole] ?? 9);
    if (roleDiff !== 0) return roleDiff;
    return b.overall - a.overall;
  });
}

// ============================================================================
// SORTEIO OFICIAL INTERATIVO DE TORNEIOS DE SELEÇÕES (COPA DO MUNDO & CONTINENTAIS)
// ============================================================================

export interface NationalTournamentDrawPot {
  label: string;
  teamIds: string[];
}

export interface NationalTournamentDrawInfo {
  compId: 'world_cup' | ContinentalCompId;
  editionId: string;
  title: string;
  hostName: string;
  year: number;
  canDrawGroups: boolean;
  alreadyDrawn: boolean;
  hasPlayedMatches: boolean;
  qualifiersComplete: boolean;
  userTeamQualified: boolean;
  participantCount: number;
  pots: NationalTournamentDrawPot[];
  edition: NationalTournamentEdition;
}

function fisherYatesShuffleIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getContinentalMetaForDraw(compId: ContinentalCompId, year: number): {
  title: string;
  hostName: string;
  expectedCount: number;
} {
  if (compId === 'copa_america') {
    return {
      title: `CONMEBOL Copa América ${year}`,
      hostName:
        year === 2024
          ? 'Estados Unidos'
          : year === 2028
          ? 'Paraguai'
          : year === 2032
          ? 'Argentina · Uruguai'
          : 'Sede CONMEBOL',
      expectedCount: 16,
    };
  }
  if (compId === 'eurocopa') {
    return {
      title: `UEFA Eurocopa ${year}`,
      hostName:
        year === 2024
          ? 'Alemanha'
          : year === 2028
          ? 'Reino Unido & Irlanda (ING · ESC · GAL · IRL)'
          : year === 2032
          ? 'Itália & Turquia'
          : 'Sede UEFA',
      expectedCount: 24,
    };
  }
  if (compId === 'copa_africana') {
    return {
      title: `Copa Africana de Nações ${year}`,
      hostName:
        year <= 2024
          ? 'Costa do Marfim'
          : year === 2028
          ? 'Uganda · Tanzânia · Quênia'
          : year === 2032
          ? 'Marrocos'
          : 'África do Sul · Senegal',
      expectedCount: 32,
    };
  }
  if (compId === 'copa_asia') {
    return {
      title: `Copa da Ásia AFC ${year}`,
      hostName: year <= 2024 ? 'Catar' : year === 2028 ? 'Arábia Saudita' : 'Austrália / Japão',
      expectedCount: 32,
    };
  }
  if (compId === 'copa_oceania') {
    return {
      title: `Copa das Nações da OFC ${year}`,
      hostName:
        year <= 2024
          ? 'Fiji & Vanuatu'
          : year === 2028
          ? 'Nova Zelândia & Fiji'
          : 'Taiti & Nova Caledônia',
      expectedCount: 8,
    };
  }
  if (compId === 'copa_ouro') {
    return {
      title: `Copa Ouro CONCACAF ${year}`,
      hostName: year % 4 === 3 ? 'Estados Unidos & Canadá' : 'Estados Unidos & México',
      expectedCount: 16,
    };
  }
  return {
    title: `UEFA Nations League ${year}/${String(year + 1).slice(-2)}`,
    hostName:
      year === 2026
        ? 'Europa (4 Ligas · Transição 2026/27 · QF + Final Four)'
        : 'Europa (3 Ligas A/B/C · Sistema Suíço 3×6 · QF + Final Four)',
    expectedCount: 54,
  };
}

export function isWorldCupQualifiersComplete(qualifiers?: WorldCupQualifiersCycle): boolean {
  if (!qualifiers) return false;
  const allFixes = [...qualifiers.conmebolFixtures, ...qualifiers.otherConfedFixtures];
  return allFixes.length > 0 && allFixes.every((f) => f.played);
}

export function isContinentalTrackComplete(
  cycle: ContinentalQualifiersCycle | undefined,
  compId: ContinentalCompId
): boolean {
  if (!cycle) return false;
  const trackMap: Partial<Record<ContinentalCompId, ContinentalQualifierTrackId>> = {
    eurocopa: 'UEFA',
    copa_africana: 'CAF',
    copa_asia: 'AFC',
    copa_oceania: 'OFC',
    copa_america: 'CONCACAF',
  };
  const trackId = trackMap[compId];
  if (!trackId) return false;
  const tr = cycle.tracks[trackId];
  return Boolean(tr && tr.fixtures.length > 0 && tr.fixtures.every((f) => f.played));
}

function resolveContinentalQualifiedParticipants(
  nt: NationalTeamState,
  compId: ContinentalCompId,
  targetYear: number
): string[] {
  const existing = nt.continentals?.[compId];
  if (existing && existing.year === targetYear && existing.standings.length > 0) {
    return existing.standings.map((s) => s.teamId);
  }
  const cq = nt.continentalQualifiers;
  if (cq && cq.targetContinentalYear === targetYear) {
    if (compId === 'copa_america') {
      if (targetYear === 2028) {
        return [...COPA_AMERICA_2028_OFFICIAL_PARTICIPANTS];
      }
      const conmebolAll = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'CONMEBOL').map((t) => t.id);
      const guests = cq.tracks.CONCACAF?.qualifiedTeamIds || [];
      if (guests.length >= 5) return [...conmebolAll, ...guests.slice(0, 5), 'nt_rus'];
      return [...COPA_AMERICA_2028_OFFICIAL_PARTICIPANTS];
    } else if (compId === 'eurocopa' && cq.tracks.UEFA?.qualifiedTeamIds.length === 24) {
      return [...cq.tracks.UEFA.qualifiedTeamIds];
    } else if (compId === 'copa_africana' && cq.tracks.CAF?.qualifiedTeamIds.length === 32) {
      return [...cq.tracks.CAF.qualifiedTeamIds];
    } else if (compId === 'copa_asia' && cq.tracks.AFC?.qualifiedTeamIds.length === 32) {
      return [...cq.tracks.AFC.qualifiedTeamIds];
    } else if (compId === 'copa_oceania' && cq.tracks.OFC?.qualifiedTeamIds.length === 8) {
      return [...cq.tracks.OFC.qualifiedTeamIds];
    }
  }
  // Fallback: top FIFA points within confederation
  const ed = generateContinentalEdition(compId, targetYear, false);
  return ed.standings.map((s) => s.teamId);
}

function sortNationalIdsByRanking(
  ids: string[],
  rankingPoints?: Record<string, number>
): string[] {
  return [...ids].sort((a, b) => {
    const ptsA = rankingPoints?.[a] ?? getNationalTeamById(a).fifaPoints;
    const ptsB = rankingPoints?.[b] ?? getNationalTeamById(b).fifaPoints;
    return ptsB - ptsA;
  });
}

function buildPotsForNationalTournament(
  compId: 'world_cup' | ContinentalCompId,
  participants: string[],
  rankingPoints?: Record<string, number>,
  year?: number
): NationalTournamentDrawPot[] {
  if (compId === 'nations_league') {
    const sorted = sortNationalIdsByRanking(participants, rankingPoints);
    if (year && year >= 2028) {
      return [
        { label: 'Liga A · Elite (18 · 3×6)', teamIds: sorted.slice(0, 18) },
        { label: 'Liga B · Divisão 2 (18 · 3×6)', teamIds: sorted.slice(18, 36) },
        { label: 'Liga C · Divisão 3 (18 · 3×6)', teamIds: sorted.slice(36, 54) },
      ];
    }
    return [
      { label: 'Liga A · Elite (16)', teamIds: sorted.slice(0, 16) },
      { label: 'Liga B · Divisão 2 (16)', teamIds: sorted.slice(16, 32) },
      { label: 'Liga C · Divisão 3 (16)', teamIds: sorted.slice(32, 48) },
      { label: 'Liga D · Divisão 4 (6)', teamIds: sorted.slice(48, 54) },
    ];
  }
  const sorted = sortNationalIdsByRanking(participants, rankingPoints);
  const potSize = compId === 'world_cup' ? 12 : Math.max(2, Math.floor(sorted.length / 4));
  return [0, 1, 2, 3].map((pIdx) => ({
    label: `Pote ${pIdx + 1}`,
    teamIds: sorted.slice(pIdx * potSize, (pIdx + 1) * potSize),
  }));
}

/**
 * Distribui 48 seleções em 12 grupos (A–L) respeitando os 4 potes FIFA (com shuffle real)
 * e evitando confrontos da mesma confederação (máximo 1 por grupo fora UEFA, máximo 2 UEFA).
 */
export function assignWorldCupGroupsFromPots(
  participants: string[],
  rankingPoints?: Record<string, number>
): { groupTeams: Record<string, string[]>; pots: string[][] } {
  const sorted = sortNationalIdsByRanking(participants, rankingPoints).slice(0, 48);
  const pots: string[][] = [
    fisherYatesShuffleIds(sorted.slice(0, 12)),
    fisherYatesShuffleIds(sorted.slice(12, 24)),
    fisherYatesShuffleIds(sorted.slice(24, 36)),
    fisherYatesShuffleIds(sorted.slice(36, 48)),
  ];

  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const groupsList: string[][] = Array.from({ length: 12 }, () => []);

  pots[0].forEach((tid, gIdx) => {
    groupsList[gIdx].push(tid);
  });

  const canJoinGroup = (groupMembers: string[], tid: string): boolean => {
    const confed = getNationalTeamById(tid).confederation;
    const sameConfedCount = groupMembers.filter(
      (m) => getNationalTeamById(m).confederation === confed
    ).length;
    if (confed === 'UEFA') return sameConfedCount < 2;
    return sameConfedCount === 0;
  };

  for (let potIdx = 1; potIdx < 4; potIdx++) {
    const potTeams = [...pots[potIdx]];
    const usedGroups = new Set<number>();

    for (const tid of potTeams) {
      let chosenGroup = -1;
      for (let g = 0; g < 12; g++) {
        if (usedGroups.has(g)) continue;
        if (canJoinGroup(groupsList[g], tid)) {
          chosenGroup = g;
          break;
        }
      }

      if (chosenGroup === -1) {
        const remainingGroup = Array.from({ length: 12 }, (_, idx) => idx).find(
          (g) => !usedGroups.has(g)
        );
        if (remainingGroup !== undefined) {
          let swapped = false;
          for (const prevGroup of Array.from(usedGroups)) {
            const prevMember = groupsList[prevGroup][potIdx];
            if (!prevMember) continue;
            const prevBase = groupsList[prevGroup].slice(0, potIdx);
            const remBase = groupsList[remainingGroup].slice(0, potIdx);
            if (canJoinGroup(prevBase, tid) && canJoinGroup(remBase, prevMember)) {
              groupsList[prevGroup][potIdx] = tid;
              groupsList[remainingGroup].push(prevMember);
              usedGroups.add(remainingGroup);
              swapped = true;
              break;
            }
          }
          if (!swapped) {
            chosenGroup = remainingGroup;
          }
        }
      }

      if (chosenGroup !== -1) {
        groupsList[chosenGroup].push(tid);
        usedGroups.add(chosenGroup);
      }
    }
  }

  const groupTeams: Record<string, string[]> = {};
  groupLetters.forEach((letter, idx) => {
    groupTeams[`Grupo ${letter}`] = groupsList[idx];
  });

  return { groupTeams, pots };
}

export function getNationalTournamentDrawInfo(
  nt: NationalTeamState,
  compId: 'world_cup' | ContinentalCompId,
  calendarYear: number
): NationalTournamentDrawInfo | null {
  const focusTeamId = nt.userTeamId || 'nt_bra';
  const drawnSet = new Set(nt.drawnNationalTournaments || []);

  if (compId === 'world_cup') {
    const existing = nt.worldCup;
    const wcQualDone = isWorldCupQualifiersComplete(nt.qualifiers);
    const shouldTargetNextCycle =
      Boolean(existing?.status === 'COMPLETED' || existing?.fixtures.some((f) => f.played)) &&
      Boolean(nt.qualifiers && nt.qualifiers.targetWorldCupYear > (existing?.year || 0)) &&
      wcQualDone;

    if (shouldTargetNextCycle && nt.qualifiers) {
      const targetYear = nt.qualifiers.targetWorldCupYear;
      const wc48 = resolveWorldCup48QualifiedFromQualifiers(nt.qualifiers, nt.fifaRankingPoints);
      const previewEdition = generateWorldCupEdition(targetYear, wc48, false);
      return {
        compId: 'world_cup',
        editionId: previewEdition.id,
        title: previewEdition.title,
        hostName: previewEdition.hostName,
        year: targetYear,
        canDrawGroups: true,
        alreadyDrawn: drawnSet.has(previewEdition.id),
        hasPlayedMatches: false,
        qualifiersComplete: true,
        userTeamQualified: wc48.includes(focusTeamId),
        participantCount: 48,
        pots: buildPotsForNationalTournament('world_cup', wc48, nt.fifaRankingPoints),
        edition: previewEdition,
      };
    }

    if (!existing) return null;
    const hasPlayed = existing.fixtures.some((f) => f.played);
    const participants = existing.standings.map((s) => s.teamId);
    return {
      compId: 'world_cup',
      editionId: existing.id,
      title: existing.title,
      hostName: existing.hostName,
      year: existing.year,
      canDrawGroups: !hasPlayed && existing.status !== 'COMPLETED',
      alreadyDrawn: drawnSet.has(existing.id),
      hasPlayedMatches: hasPlayed,
      qualifiersComplete: existing.year === 2026 || wcQualDone,
      userTeamQualified: participants.includes(focusTeamId),
      participantCount: participants.length,
      pots: buildPotsForNationalTournament('world_cup', participants, nt.fifaRankingPoints),
      edition: existing,
    };
  }

  const existing = nt.continentals?.[compId];
  const contQualDone = isContinentalTrackComplete(nt.continentalQualifiers, compId);
  const nextCycleTargetYear = nt.continentalQualifiers?.targetContinentalYear;
  const shouldTargetNextContinental =
    Boolean(existing && (existing.status === 'COMPLETED' || existing.fixtures.some((f) => f.played))) &&
    Boolean(nextCycleTargetYear && nextCycleTargetYear > (existing?.year || 0)) &&
    contQualDone;

  if (shouldTargetNextContinental && nextCycleTargetYear) {
    const meta = getContinentalMetaForDraw(compId, nextCycleTargetYear);
    const participants = resolveContinentalQualifiedParticipants(nt, compId, nextCycleTargetYear);
    const previewEdition = generateContinentalEdition(compId, nextCycleTargetYear, false, participants);
    return {
      compId,
      editionId: previewEdition.id,
      title: meta.title,
      hostName: meta.hostName,
      year: nextCycleTargetYear,
      canDrawGroups: true,
      alreadyDrawn: drawnSet.has(previewEdition.id),
      hasPlayedMatches: false,
      qualifiersComplete: true,
      userTeamQualified: participants.includes(focusTeamId),
      participantCount: participants.length,
      pots: buildPotsForNationalTournament(compId, participants, nt.fifaRankingPoints, nextCycleTargetYear),
      edition: previewEdition,
    };
  }

  if (!existing) return null;
  const hasPlayed = existing.fixtures.some((f) => f.played);
  const participants = existing.standings.map((s) => s.teamId);
  return {
    compId,
    editionId: existing.id,
    title: existing.title,
    hostName: existing.hostName,
    year: existing.year,
    canDrawGroups: !hasPlayed && existing.status !== 'COMPLETED',
    alreadyDrawn: drawnSet.has(existing.id),
    hasPlayedMatches: hasPlayed,
    qualifiersComplete:
      existing.year <= 2026 || compId === 'nations_league' || compId === 'copa_ouro' || contQualDone,
    userTeamQualified: participants.includes(focusTeamId),
    participantCount: participants.length,
    pots: buildPotsForNationalTournament(compId, participants, nt.fifaRankingPoints, existing.year),
    edition: existing,
  };
}

/**
 * Executa o sorteio real e aleatório dos potes e cria os grupos + tabela de jogos
 * para a Copa do Mundo ou Torneio Continental / Nations League.
 */
export function drawNationalTournamentGroups(
  nt: NationalTeamState,
  _clubs: Club[],
  compId: 'world_cup' | ContinentalCompId,
  calendarYear: number
): {
  updatedNt: NationalTeamState;
  edition: NationalTournamentEdition;
  drawn: boolean;
  feedback: string;
} {
  const info = getNationalTournamentDrawInfo(nt, compId, calendarYear);
  if (!info) {
    const fallback = generateWorldCupEdition(calendarYear, undefined, false);
    return {
      updatedNt: nt,
      edition: fallback,
      drawn: false,
      feedback: 'Torneio não localizado para sorteio.',
    };
  }

  const prevDrawnList = nt.drawnNationalTournaments || [];
  const nextDrawnList = prevDrawnList.includes(info.editionId)
    ? prevDrawnList
    : [...prevDrawnList, info.editionId];

  if (!info.canDrawGroups || info.hasPlayedMatches) {
    return {
      updatedNt: { ...nt, drawnNationalTournaments: nextDrawnList },
      edition: info.edition,
      drawn: false,
      feedback: `${info.title} já possui partidas disputadas — exibindo o sorteio oficial vigente.`,
    };
  }

  if (compId === 'world_cup') {
    const year = info.year;
    const participants =
      year === 2026
        ? info.edition.standings.map((s) => s.teamId)
        : nt.qualifiers && nt.qualifiers.targetWorldCupYear === year
        ? resolveWorldCup48QualifiedFromQualifiers(nt.qualifiers, nt.fifaRankingPoints)
        : info.edition.standings.map((s) => s.teamId);

    const { groupTeams } = assignWorldCupGroupsFromPots(participants, nt.fifaRankingPoints);
    const groups = Object.keys(groupTeams);
    const groupMap: Record<string, string> = {};
    const orderedParticipants: string[] = [];
    groups.forEach((gName) => {
      groupTeams[gName].forEach((tid) => {
        groupMap[tid] = gName;
        orderedParticipants.push(tid);
      });
    });

    const activeWcVenues = year === 2030 ? WORLD_CUP_VENUES_2030 : WORLD_CUP_VENUES_2026;
    const centennialOpeners2030: Record<string, { date: string; time: string; stadium: string; label: string }> = {
      nt_uru: { date: '2030-06-08', time: '19:00', stadium: 'Estádio Centenário (Montevidéu)', label: '08/06 · Abertura do Centenário FIFA' },
      nt_arg: { date: '2030-06-09', time: '17:00', stadium: 'Estádio Monumental (Buenos Aires)', label: '09/06 · Jogo do Centenário FIFA' },
      nt_par: { date: '2030-06-09', time: '20:30', stadium: 'Estádio Defensores del Chaco (Assunção)', label: '09/06 · Jogo do Centenário FIFA' },
    };

    const fixtures: InternationalMatchFixture[] = [];
    groups.forEach((gName, gIdx) => {
      const [t0, t1, t2, t3] = groupTeams[gName];
      const md1Date =
        year === 2030
          ? `${year}-06-${String(13 + Math.floor(gIdx / 3)).padStart(2, '0')}`
          : `${year}-06-${String(11 + Math.floor(gIdx / 2)).padStart(2, '0')}`;
      const md2Date =
        year === 2030
          ? `${year}-06-${String(19 + Math.floor(gIdx / 3)).padStart(2, '0')}`
          : `${year}-06-${String(18 + Math.floor(gIdx / 2)).padStart(2, '0')}`;
      const md3Date =
        year === 2030
          ? `${year}-06-${String(25 + Math.floor(gIdx / 3)).padStart(2, '0')}`
          : `${year}-06-${String(24 + Math.floor(gIdx / 3)).padStart(2, '0')}`;
      const matchdays: { round: number; date: string; pairs: [string, string][] }[] = [
        { round: 14, date: md1Date, pairs: [[t0, t1], [t2, t3]] },
        { round: 15, date: md2Date, pairs: [[t0, t2], [t3, t1]] },
        { round: 16, date: md3Date, pairs: [[t3, t0], [t1, t2]] },
      ];
      matchdays.forEach((md, mdIdx) => {
        md.pairs.forEach(([hId, aId], pIdx) => {
          const cent =
            year === 2030 && mdIdx === 0
              ? centennialOpeners2030[hId] || centennialOpeners2030[aId]
              : undefined;
          const matchDate = cent ? cent.date : md.date;
          const venue = cent
            ? cent.stadium
            : activeWcVenues[(gIdx * 2 + mdIdx + pIdx) % activeWcVenues.length];
          const koTime = cent ? cent.time : mdIdx === 2 ? '19:00' : pIdx === 0 ? '16:00' : '20:00';
          fixtures.push({
            id: `wc_${year}_${gName.replace(/\s+/g, '')}_r${mdIdx + 1}_m${pIdx}`,
            competition: 'world_cup',
            competitionName: `Copa do Mundo FIFA ${year}`,
            seasonYear: year,
            triggerRound: md.round,
            date: matchDate,
            time: koTime,
            dateLabel: cent
              ? cent.label
              : `${formatShortDate(matchDate)} · Fase de Grupos (${mdIdx + 1}ª Rodada)`,
            phase: cent ? 'Fase de Grupos · Centenário (1ª Rodada)' : `Fase de Grupos · ${mdIdx + 1}ª Rodada`,
            group: gName,
            homeTeamId: hId,
            awayTeamId: aId,
            stadiumName: venue,
            played: false,
            status: 'PENDING',
            homeScore: null,
            awayScore: null,
          });
        });
      });
    });

    const newWorldCup: NationalTournamentEdition = {
      id: `world_cup_${year}`,
      compId: 'world_cup',
      title: `Copa do Mundo FIFA ${year}`,
      hostName: info.hostName,
      year,
      status: 'UPCOMING',
      groups,
      standings: createEmptyNationalStandings(orderedParticipants, groupMap),
      fixtures,
    };

    const busyDates = buildOfficialBusyTeamDateSet(
      nt.qualifiers,
      nt.continentalQualifiers,
      newWorldCup,
      nt.continentals,
      nt.seasonSchedule || []
    );
    const cleanedSchedule = (nt.seasonSchedule || []).filter(
      (f) =>
        f.played ||
        f.competition !== 'friendly' ||
        !f.date ||
        (!busyDates.has(`${f.homeTeamId}_${f.date}`) && !busyDates.has(`${f.awayTeamId}_${f.date}`))
    );

    const updatedNt: NationalTeamState = {
      ...nt,
      worldCup: newWorldCup,
      drawnNationalTournaments: nextDrawnList,
      seasonSchedule: cleanedSchedule,
    };
    updatedNt.windows = syncLegacyWindowsFromTeamFixtures(updatedNt, calendarYear);

    return {
      updatedNt,
      edition: newWorldCup,
      drawn: true,
      feedback: `Sorteio oficial da Copa do Mundo FIFA ${year} realizado! 12 grupos (A–L) criados.`,
    };
  }

  // Continental tournaments + UEFA Nations League
  const year = info.year;
  const meta = getContinentalMetaForDraw(compId, year);
  const rawParticipants = resolveContinentalQualifiedParticipants(nt, compId, year);
  const sortedParticipants = sortNationalIdsByRanking(rawParticipants, nt.fifaRankingPoints);

  const groups: string[] = [];
  const groupMap: Record<string, string> = {};
  const groupTeams: Record<string, string[]> = {};
  const orderedParticipants: string[] = [];
  const fixtures: InternationalMatchFixture[] = [];

  if (compId === 'nations_league') {
    const buildDivision = (slice: string[], prefix: string, numGrps: number) => {
      const grpNames = Array.from({ length: numGrps }, (_, i) => `Grupo ${prefix}${i + 1}`);
      grpNames.forEach((g) => {
        groupTeams[g] = [];
        groups.push(g);
      });
      // Seed pots inside this division, shuffle each pot, and place 1 team per group
      const potCount = Math.ceil(slice.length / numGrps);
      for (let p = 0; p < potCount; p++) {
        const potTeams = fisherYatesShuffleIds(slice.slice(p * numGrps, (p + 1) * numGrps));
        potTeams.forEach((tid, gIdx) => {
          const gName = grpNames[gIdx];
          if (!gName) return;
          groupTeams[gName].push(tid);
          groupMap[tid] = gName;
          orderedParticipants.push(tid);
        });
      }
    };

    if (year >= 2028) {
      buildDivision(sortedParticipants.slice(0, 18), 'A', 3);
      buildDivision(sortedParticipants.slice(18, 36), 'B', 3);
      buildDivision(sortedParticipants.slice(36, 54), 'C', 3);
    } else {
      buildDivision(sortedParticipants.slice(0, 16), 'A', 4);
      buildDivision(sortedParticipants.slice(16, 32), 'B', 4);
      buildDivision(sortedParticipants.slice(32, 48), 'C', 4);
      buildDivision(sortedParticipants.slice(48, 54), 'D', 2);
    }

    const w = getFifaWindowDatesForYear(year);
    const nlDates = [
      { round: 24, date: w.sep1, label: 'Setembro · 1ª Rodada' },
      { round: 25, date: w.sep2, label: 'Setembro · 2ª Rodada' },
      { round: 29, date: w.oct1, label: 'Outubro · 3ª Rodada' },
      { round: 30, date: w.oct2, label: 'Outubro · 4ª Rodada' },
      { round: 33, date: w.nov1, label: 'Novembro · 5ª Rodada' },
      { round: 34, date: w.nov2, label: 'Novembro · 6ª Rodada' },
    ];
    groups.forEach((gName) => {
      const members = groupTeams[gName];
      const rr =
        year >= 2028 && members.length === 6
          ? generateUefaSwiss6RoundPairs(members)
          : generateRoundRobinPairs(members);
      const divTag = gName.startsWith('Grupo A')
        ? 'Liga A'
        : gName.startsWith('Grupo B')
        ? 'Liga B'
        : gName.startsWith('Grupo C')
        ? 'Liga C'
        : 'Liga D';
      rr.forEach((pairs, rIdx) => {
        const slot = nlDates[rIdx] || nlDates[nlDates.length - 1];
        pairs.forEach(([hId, aId], pIdx) => {
          fixtures.push({
            id: `${compId}_${year}_${gName.replace(/\s+/g, '')}_r${rIdx + 1}_m${pIdx}`,
            competition: 'nations_league',
            competitionName: meta.title,
            seasonYear: slot.round >= 24 ? year : year + 1,
            triggerRound: slot.round,
            date: slot.date,
            time: pIdx === 0 ? '15:45' : '16:45',
            dateLabel: `${formatShortDate(slot.date)} · ${slot.label}`,
            phase: `${divTag} · ${gName} · ${rIdx + 1}ª Rodada`,
            group: gName,
            homeTeamId: hId,
            awayTeamId: aId,
            stadiumName: getNationalTeamById(hId).homeStadium,
            played: false,
            status: 'PENDING',
            homeScore: null,
            awayScore: null,
          });
        });
      });
    });
  } else {
    const groupCount =
      sortedParticipants.length === 32
        ? 8
        : sortedParticipants.length === 24
        ? 6
        : sortedParticipants.length === 16
        ? 4
        : 2;
    const groupLetters =
      groupCount === 8
        ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        : groupCount === 6
        ? ['A', 'B', 'C', 'D', 'E', 'F']
        : groupCount === 4
        ? ['A', 'B', 'C', 'D']
        : ['A', 'B'];
    const pots = [0, 1, 2, 3].map((pIdx) =>
      fisherYatesShuffleIds(sortedParticipants.slice(pIdx * groupCount, (pIdx + 1) * groupCount))
    );

    groupLetters.forEach((letter, gIdx) => {
      const gName = `Grupo ${letter}`;
      groups.push(gName);
      const members = [pots[0][gIdx], pots[1][gIdx], pots[2][gIdx], pots[3][gIdx]].filter(Boolean);
      groupTeams[gName] = members;
      members.forEach((tid) => {
        groupMap[tid] = gName;
        orderedParticipants.push(tid);
      });
    });

    groups.forEach((gName, gIdx) => {
      const [t0, t1, t2, t3] = groupTeams[gName];
      const isGoldCup = compId === 'copa_ouro';
      const isCopaAmerica = compId === 'copa_america';
      const isEuro = compId === 'eurocopa';
      const is32Teams = groups.length === 8;
      const md1Date = isEuro
        ? `${year}-06-${String(9 + Math.floor(gIdx / 2)).padStart(2, '0')}`
        : isGoldCup
        ? `${year}-06-${String(17 + Math.min(2, gIdx)).padStart(2, '0')}`
        : isCopaAmerica
        ? `${year}-06-${gIdx < 2 ? '11' : '12'}`
        : is32Teams
        ? `${year}-06-${String(14 + Math.floor(gIdx / 2)).padStart(2, '0')}`
        : `${year}-06-${String(14 + gIdx).padStart(2, '0')}`;
      const md2Date = isEuro
        ? `${year}-06-${String(14 + Math.floor(gIdx / 2)).padStart(2, '0')}`
        : isGoldCup
        ? `${year}-06-${String(21 + Math.min(2, gIdx)).padStart(2, '0')}`
        : isCopaAmerica
        ? `${year}-06-${gIdx < 2 ? '18' : '19'}`
        : is32Teams
        ? `${year}-06-${String(20 + Math.floor(gIdx / 2)).padStart(2, '0')}`
        : `${year}-06-${String(20 + gIdx).padStart(2, '0')}`;
      const md3Date = isEuro
        ? `${year}-06-${String(19 + Math.floor(gIdx / 2)).padStart(2, '0')}`
        : isCopaAmerica
        ? `${year}-06-${gIdx < 2 ? '24' : '27'}`
        : is32Teams
        ? `${year}-06-${String(25 + Math.floor(gIdx / 4)).padStart(2, '0')}`
        : `${year}-06-${String(25 + Math.floor(gIdx / 2)).padStart(2, '0')}`;
      const mds: { round: number; date: string; pairs: [string, string][] }[] = [
        { round: 15, date: md1Date, pairs: [[t0, t1], [t2, t3]] },
        { round: 16, date: md2Date, pairs: [[t0, t2], [t3, t1]] },
        { round: 17, date: md3Date, pairs: [[t3, t0], [t1, t2]] },
      ];
      mds.forEach((md, mdIdx) => {
        md.pairs.forEach(([hId, aId], pIdx) => {
          fixtures.push({
            id: `${compId}_${year}_${gName.replace(/\s+/g, '')}_r${mdIdx + 1}_m${pIdx}`,
            competition: compId,
            competitionName: meta.title,
            seasonYear: year,
            triggerRound: md.round,
            date: md.date,
            time: mdIdx === 2 ? '20:00' : pIdx === 0 ? '16:00' : '20:00',
            dateLabel: `${formatShortDate(md.date)} · ${mdIdx + 1}ª Rodada`,
            phase: `Fase de Grupos · ${mdIdx + 1}ª Rodada`,
            group: gName,
            homeTeamId: hId,
            awayTeamId: aId,
            stadiumName: getNationalTeamById(hId).homeStadium,
            played: false,
            status: 'PENDING',
            homeScore: null,
            awayScore: null,
          });
        });
      });
    });
  }

  const newEdition: NationalTournamentEdition = {
    id: `${compId}_${year}`,
    compId,
    title: meta.title,
    hostName: meta.hostName,
    year,
    status: 'UPCOMING',
    groups,
    standings: createEmptyNationalStandings(orderedParticipants, groupMap),
    fixtures,
  };

  const defaults = createInitialContinentalsRecord(calendarYear);
  const nextContinentals: Record<ContinentalCompId, NationalTournamentEdition> = {
    copa_america: nt.continentals?.copa_america || defaults.copa_america,
    eurocopa: nt.continentals?.eurocopa || defaults.eurocopa,
    copa_africana: nt.continentals?.copa_africana || defaults.copa_africana,
    copa_asia: nt.continentals?.copa_asia || defaults.copa_asia,
    copa_oceania: nt.continentals?.copa_oceania || defaults.copa_oceania,
    copa_ouro: nt.continentals?.copa_ouro || defaults.copa_ouro,
    nations_league: nt.continentals?.nations_league || defaults.nations_league,
    [compId]: newEdition,
  };

  const busyDates = buildOfficialBusyTeamDateSet(
    nt.qualifiers,
    nt.continentalQualifiers,
    nt.worldCup,
    nextContinentals,
    nt.seasonSchedule || []
  );
  const cleanedSchedule = (nt.seasonSchedule || []).filter(
    (f) =>
      f.played ||
      f.competition !== 'friendly' ||
      !f.date ||
      (!busyDates.has(`${f.homeTeamId}_${f.date}`) && !busyDates.has(`${f.awayTeamId}_${f.date}`))
  );

  const updatedNt: NationalTeamState = {
    ...nt,
    continentals: nextContinentals,
    drawnNationalTournaments: nextDrawnList,
    seasonSchedule: cleanedSchedule,
  };
  updatedNt.windows = syncLegacyWindowsFromTeamFixtures(updatedNt, calendarYear);

  return {
    updatedNt,
    edition: newEdition,
    drawn: true,
    feedback: `Sorteio oficial da ${meta.title} gerado! ${groups.length} grupos criados.`,
  };
}



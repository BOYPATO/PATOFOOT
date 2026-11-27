import {
  Club,
  CompetitionType,
  Fixture,
  InboxMessage,
  SouthAmericanCupId,
  SouthAmericanLeagueId,
  Standing,
  TrophyRecord,
} from '../types/game';
import { assignVariedMatchDaySlot, getRoundDate, getSeasonStartDate } from './calendarUtils';
import { generateInitialStandings } from '../data/initialData';
import { getClubSectorRatings } from './clubRatingsEngine';

export interface SouthAmericanLeagueConfig {
  id: SouthAmericanLeagueId;
  name: string;
  shortName: string;
  country: string;
  flagCode: string;
  flagEmoji: string;
  federation: string;
  clubsCount: number;
  totalRounds: number;
  libertadoresBerths: number; // Vagas totais (ex: ARG 6, outros 4)
  libertadoresDirectBerths: number; // Fase de Grupos direta (ex: ARG 5, outros 2)
  libertadoresPhase2Berths: number; // Pré-Libertadores Fase 2 (ex: ARG 1, CHI 2, COL 2, outros 1)
  libertadoresPhase1Berths: number; // Pré-Libertadores Fase 1 (ex: ARG 0, CHI 0, COL 0, outros 1)
  sulamericanaBerths: number; // Vagas totais nacionais (ex: ARG 6, outros 4)
  sulamericanaDirectBerths: number; // Fase de Grupos direta (ex: ARG 6, outros 0)
  sulamericanaPreliminaryBerths: number; // Fase Preliminar nacional (ex: ARG 0, outros 4)
  relegationSlots: number;
  championPrize: number;
  runnerUpPrize: number;
  primaryColor: string;
  secondaryColor: string;
  formatSummary: string;
  continentalCriteriaSummary?: string;
}

export const SOUTH_AMERICAN_LEAGUE_IDS: SouthAmericanLeagueId[] = [
  'liga_arg',
  'liga_col',
  'liga_uru',
  'liga_equ',
  'liga_chi',
  'liga_par',
  'liga_per',
  'liga_bol',
  'liga_ven',
];

/**
 * Configuração Oficial CONMEBOL do Brasil (Série A + Copa do Brasil):
 * - 5 vagas na Libertadores: Campeão da Copa do Brasil + 4 primeiros colocados do Brasileirão Série A (Fase de Grupos).
 * - 4 vagas na Sul-Americana: 4 clubes logo após as vagas da Libertadores no Brasileirão Série A (Fase de Grupos).
 */
export const BRAZIL_CONMEBOL_CONFIG = {
  country: 'Brasil',
  flagCode: 'BRA',
  flagEmoji: '🇧🇷',
  leagueId: 'serie_a' as CompetitionType,
  libertadoresTotal: 5,
  libertadoresDirectBerths: 5,
  libertadoresPhase2Berths: 0,
  libertadoresPhase1Berths: 0,
  sulamericanaTotal: 4,
  sulamericanaDirectBerths: 4,
  sulamericanaPreliminaryBerths: 0,
  criteriaLibertadores:
    'Campeão da Copa do Brasil + 4 primeiros colocados do Brasileirão Série A (se o campeão da Copa terminar no G-4, o 5º colocado herda a vaga).',
  criteriaSulamericana:
    'Os 4 clubes imediatamente abaixo da zona da Libertadores no Brasileirão Série A.',
};

/**
 * Configuração das 9 Ligas Nacionais da CONMEBOL (além do Brasileirão).
 * Distribuição exata de 32 vagas na Libertadores e 32 vagas na Sul-Americana:
 * - Libertadores (32 vagas diretas): Brasil (5: CdB + G-4), Argentina (5: Copa Argentina + G-4),
 *   Uruguai (3), Equador (3), Colômbia (3), Chile (3), Paraguai (3), Peru (3), Bolívia (2), Venezuela (2).
 * - Sul-Americana (32 vagas diretas): Brasil (4), Argentina (4), Uruguai (3), Equador (3),
 *   Colômbia (3), Chile (3), Paraguai (3), Peru (3), Bolívia (3), Venezuela (3) — sempre os times logo após as vagas da Libertadores.
 */
export const SOUTH_AMERICAN_LEAGUES_META: Record<SouthAmericanLeagueId, SouthAmericanLeagueConfig> = {
  liga_arg: {
    id: 'liga_arg',
    name: 'Liga Profesional Argentina',
    shortName: 'Liga Argentina',
    country: 'Argentina',
    flagCode: 'ARG',
    flagEmoji: '🇦🇷',
    federation: 'AFA',
    clubsCount: 30,
    totalRounds: 29,
    libertadoresBerths: 5,
    libertadoresDirectBerths: 5,
    libertadoresPhase2Berths: 0,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 4,
    sulamericanaDirectBerths: 4,
    sulamericanaPreliminaryBerths: 0,
    relegationSlots: 2,
    championPrize: 38_000_000,
    runnerUpPrize: 20_000_000,
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    formatSummary:
      '30 clubes em turno único corrido (29 rodadas). 5 vagas na Libertadores (Copa Argentina + G-4) e 4 vagas na Sul-Americana.',
    continentalCriteriaSummary:
      'Libertadores: Campeão da Copa Argentina + 4 primeiros do Campeonato Argentino (se o campeão da Copa terminar no G-4, o 5º herda a vaga). Sul-Americana: os 4 clubes logo após as vagas da Libertadores.',
  },
  liga_col: {
    id: 'liga_col',
    name: 'Liga BetPlay Dimayor',
    shortName: 'Liga Colômbia',
    country: 'Colômbia',
    flagCode: 'COL',
    flagEmoji: '🇨🇴',
    federation: 'FCF / Dimayor',
    clubsCount: 20,
    totalRounds: 38,
    libertadoresBerths: 3,
    libertadoresDirectBerths: 3,
    libertadoresPhase2Berths: 0,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 3,
    sulamericanaDirectBerths: 3,
    sulamericanaPreliminaryBerths: 0,
    relegationSlots: 2,
    championPrize: 24_000_000,
    runnerUpPrize: 13_000_000,
    primaryColor: '#facc15',
    secondaryColor: '#1d4ed8',
    formatSummary:
      '20 clubes em 38 rodadas. 3 vagas diretas na Libertadores (1º–3º) e 3 vagas na Sul-Americana (4º–6º).',
    continentalCriteriaSummary:
      'Libertadores: 1º ao 3º colocado do Campeonato Colombiano. Sul-Americana: 4º ao 6º colocado (logo após as vagas da Libertadores).',
  },
  liga_uru: {
    id: 'liga_uru',
    name: 'Campeonato Uruguayo Primera División',
    shortName: 'Liga Uruguai',
    country: 'Uruguai',
    flagCode: 'URU',
    flagEmoji: '🇺🇾',
    federation: 'AUF',
    clubsCount: 16,
    totalRounds: 30,
    libertadoresBerths: 3,
    libertadoresDirectBerths: 3,
    libertadoresPhase2Berths: 0,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 3,
    sulamericanaDirectBerths: 3,
    sulamericanaPreliminaryBerths: 0,
    relegationSlots: 3,
    championPrize: 20_000_000,
    runnerUpPrize: 11_000_000,
    primaryColor: '#60a5fa',
    secondaryColor: '#1e3a8a',
    formatSummary:
      '16 clubes em 30 rodadas. 3 vagas diretas na Libertadores (1º–3º) e 3 vagas na Sul-Americana (4º–6º).',
    continentalCriteriaSummary:
      'Libertadores: 1º ao 3º colocado do Campeonato Uruguaio. Sul-Americana: 4º ao 6º colocado (logo após as vagas da Libertadores).',
  },
  liga_equ: {
    id: 'liga_equ',
    name: 'LigaPro Ecuabet Serie A',
    shortName: 'Liga Equador',
    country: 'Equador',
    flagCode: 'EQU',
    flagEmoji: '🇪🇨',
    federation: 'FEF / LigaPro',
    clubsCount: 16,
    totalRounds: 30,
    libertadoresBerths: 3,
    libertadoresDirectBerths: 3,
    libertadoresPhase2Berths: 0,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 3,
    sulamericanaDirectBerths: 3,
    sulamericanaPreliminaryBerths: 0,
    relegationSlots: 2,
    championPrize: 22_000_000,
    runnerUpPrize: 12_000_000,
    primaryColor: '#fbbf24',
    secondaryColor: '#1e40af',
    formatSummary:
      '16 clubes em 30 rodadas. 3 vagas diretas na Libertadores (1º–3º) e 3 vagas na Sul-Americana (4º–6º).',
    continentalCriteriaSummary:
      'Libertadores: 1º ao 3º colocado do Campeonato Equatoriano. Sul-Americana: 4º ao 6º colocado (logo após as vagas da Libertadores).',
  },
  liga_chi: {
    id: 'liga_chi',
    name: 'Campeonato Nacional Primera División',
    shortName: 'Liga Chile',
    country: 'Chile',
    flagCode: 'CHI',
    flagEmoji: '🇨🇱',
    federation: 'ANFP',
    clubsCount: 16,
    totalRounds: 30,
    libertadoresBerths: 3,
    libertadoresDirectBerths: 3,
    libertadoresPhase2Berths: 0,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 3,
    sulamericanaDirectBerths: 3,
    sulamericanaPreliminaryBerths: 0,
    relegationSlots: 2,
    championPrize: 21_000_000,
    runnerUpPrize: 11_500_000,
    primaryColor: '#ef4444',
    secondaryColor: '#1d4ed8',
    formatSummary:
      '16 clubes em 30 rodadas. 3 vagas diretas na Libertadores (1º–3º) e 3 vagas na Sul-Americana (4º–6º).',
    continentalCriteriaSummary:
      'Libertadores: 1º ao 3º colocado do Campeonato Chileno. Sul-Americana: 4º ao 6º colocado (logo após as vagas da Libertadores).',
  },
  liga_par: {
    id: 'liga_par',
    name: 'Copa de Primera APF',
    shortName: 'Liga Paraguai',
    country: 'Paraguai',
    flagCode: 'PAR',
    flagEmoji: '🇵🇾',
    federation: 'APF',
    clubsCount: 12,
    totalRounds: 22,
    libertadoresBerths: 3,
    libertadoresDirectBerths: 3,
    libertadoresPhase2Berths: 0,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 3,
    sulamericanaDirectBerths: 3,
    sulamericanaPreliminaryBerths: 0,
    relegationSlots: 2,
    championPrize: 19_000_000,
    runnerUpPrize: 10_000_000,
    primaryColor: '#f87171',
    secondaryColor: '#1e40af',
    formatSummary:
      '12 clubes em 22 rodadas. 3 vagas diretas na Libertadores (1º–3º) e 3 vagas na Sul-Americana (4º–6º).',
    continentalCriteriaSummary:
      'Libertadores: 1º ao 3º colocado do Campeonato Paraguaio. Sul-Americana: 4º ao 6º colocado (logo após as vagas da Libertadores).',
  },
  liga_per: {
    id: 'liga_per',
    name: 'Liga 1 Te Apuesto',
    shortName: 'Liga Peru',
    country: 'Peru',
    flagCode: 'PER',
    flagEmoji: '🇵🇪',
    federation: 'FPF',
    clubsCount: 18,
    totalRounds: 34,
    libertadoresBerths: 3,
    libertadoresDirectBerths: 3,
    libertadoresPhase2Berths: 0,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 3,
    sulamericanaDirectBerths: 3,
    sulamericanaPreliminaryBerths: 0,
    relegationSlots: 3,
    championPrize: 17_500_000,
    runnerUpPrize: 9_500_000,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    formatSummary:
      '18 clubes em 34 rodadas. 3 vagas diretas na Libertadores (1º–3º) e 3 vagas na Sul-Americana (4º–6º).',
    continentalCriteriaSummary:
      'Libertadores: 1º ao 3º colocado do Campeonato Peruano. Sul-Americana: 4º ao 6º colocado (logo após as vagas da Libertadores).',
  },
  liga_bol: {
    id: 'liga_bol',
    name: 'División Profesional Boliviana',
    shortName: 'Liga Bolívia',
    country: 'Bolívia',
    flagCode: 'BOL',
    flagEmoji: '🇧🇴',
    federation: 'FBF',
    clubsCount: 16,
    totalRounds: 30,
    libertadoresBerths: 2,
    libertadoresDirectBerths: 2,
    libertadoresPhase2Berths: 0,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 3,
    sulamericanaDirectBerths: 3,
    sulamericanaPreliminaryBerths: 0,
    relegationSlots: 2,
    championPrize: 15_000_000,
    runnerUpPrize: 8_000_000,
    primaryColor: '#16a34a',
    secondaryColor: '#eab308',
    formatSummary:
      '16 clubes em 30 rodadas. 2 vagas diretas na Libertadores (1º–2º) e 3 vagas na Sul-Americana (3º–5º).',
    continentalCriteriaSummary:
      'Libertadores: 1º e 2º colocado do Campeonato Boliviano. Sul-Americana: 3º ao 5º colocado (logo após as vagas da Libertadores).',
  },
  liga_ven: {
    id: 'liga_ven',
    name: 'Liga FUTVE Primera División',
    shortName: 'Liga Venezuela',
    country: 'Venezuela',
    flagCode: 'VEN',
    flagEmoji: '🇻🇪',
    federation: 'FVF / Liga FUTVE',
    clubsCount: 14,
    totalRounds: 26,
    libertadoresBerths: 2,
    libertadoresDirectBerths: 2,
    libertadoresPhase2Berths: 0,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 3,
    sulamericanaDirectBerths: 3,
    sulamericanaPreliminaryBerths: 0,
    relegationSlots: 2,
    championPrize: 14_500_000,
    runnerUpPrize: 7_500_000,
    primaryColor: '#9f1239',
    secondaryColor: '#facc15',
    formatSummary:
      '14 clubes em 26 rodadas. 2 vagas diretas na Libertadores (1º–2º) e 3 vagas na Sul-Americana (3º–5º).',
    continentalCriteriaSummary:
      'Libertadores: 1º e 2º colocado do Campeonato Venezuelano. Sul-Americana: 3º ao 5º colocado (logo após as vagas da Libertadores).',
  },
};

const COUNTRY_TO_LEAGUE_MAP: Record<string, SouthAmericanLeagueId> = {
  Argentina: 'liga_arg',
  'Colômbia': 'liga_col',
  Colombia: 'liga_col',
  Uruguai: 'liga_uru',
  Equador: 'liga_equ',
  Chile: 'liga_chi',
  Paraguai: 'liga_par',
  Peru: 'liga_per',
  'Bolívia': 'liga_bol',
  Bolivia: 'liga_bol',
  Venezuela: 'liga_ven',
};

export function isSouthAmericanLeague(comp?: CompetitionType | string | null): comp is SouthAmericanLeagueId {
  if (!comp) return false;
  return (SOUTH_AMERICAN_LEAGUE_IDS as string[]).includes(comp);
}

export function getSouthAmericanLeagueByCountry(country?: string | null): SouthAmericanLeagueId | null {
  if (!country) return null;
  return COUNTRY_TO_LEAGUE_MAP[country.trim()] || null;
}

export function getClubSouthAmericanLeagueId(
  club?: Pick<Club, 'division' | 'country'> | null
): SouthAmericanLeagueId | null {
  if (!club || club.division !== 'SA') return null;
  return getSouthAmericanLeagueByCountry(club.country);
}

/**
 * Seleciona os clubes participantes de uma Liga Nacional Sul-Americana,
 * respeitando a contagem oficial de clubes da liga (par, para turno e returno exatos).
 */
export function getClubsForSouthAmericanLeague(clubs: Club[], leagueId: SouthAmericanLeagueId): Club[] {
  const meta = SOUTH_AMERICAN_LEAGUES_META[leagueId];
  const matching = clubs
    .filter((c) => c.division === 'SA' && getSouthAmericanLeagueByCountry(c.country) === leagueId)
    .sort((a, b) => {
      if (a.isUser && !b.isUser) return -1;
      if (!a.isUser && b.isUser) return 1;
      if (b.reputation !== a.reputation) return b.reputation - a.reputation;
      return a.shortName.localeCompare(b.shortName);
    });

  const targetEven =
    matching.length >= meta.clubsCount
      ? meta.clubsCount
      : matching.length % 2 === 0
      ? matching.length
      : Math.max(0, matching.length - 1);

  return matching.slice(0, targetEven);
}

/**
 * Gera tabela completa de jogos em turno e returno para uma liga sul-americana,
 * distribuindo proporcionalmente as rodadas entre fevereiro e o fim de novembro (slots 1..38).
 */
export function generateSouthAmericanLeagueSchedule(
  leagueClubs: Club[],
  leagueId: SouthAmericanLeagueId,
  seasonYear: number = 2026
): Fixture[] {
  const numTeams = leagueClubs.length;
  if (numTeams < 2) return [];

  const evenTeams = numTeams % 2 === 0 ? leagueClubs : leagueClubs.slice(0, numTeams - 1);
  const count = evenTeams.length;
  const meta = SOUTH_AMERICAN_LEAGUES_META[leagueId];
  const halfRounds = count - 1;
  const singleRoundOnly = meta?.totalRounds === halfRounds;
  const totalRounds = singleRoundOnly ? halfRounds : halfRounds * 2;
  const matchesPerRound = count / 2;

  const teamIds = evenTeams.map((c) => c.id);
  const clubMap = new Map<string, Club>();
  evenTeams.forEach((c) => clubMap.set(c.id, c));

  const fixtures: Fixture[] = [];
  const minSeasonDate = getSeasonStartDate(seasonYear);
  const maxSeasonDate = `${seasonYear}-12-20`;
  const roundBaseDates: string[] = Array.from({ length: totalRounds }, (_, idx) => {
    const rNum = idx + 1;
    const slotIdx =
      totalRounds <= 1
        ? 1
        : Math.max(1, Math.min(38, Math.round(1 + ((rNum - 1) * 37) / (totalRounds - 1))));
    return getRoundDate(slotIdx, seasonYear).date;
  });

  for (let round = 0; round < halfRounds; round++) {
    const firstHalfRound = round + 1;
    const secondHalfRound = round + 1 + halfRounds;

    const firstBaseDate = roundBaseDates[firstHalfRound - 1];
    const firstPrevDate = firstHalfRound > 1 ? roundBaseDates[firstHalfRound - 2] : undefined;
    const firstNextDate = firstHalfRound < totalRounds ? roundBaseDates[firstHalfRound] : undefined;

    const secondBaseDate = roundBaseDates[secondHalfRound - 1] || firstBaseDate;
    const secondPrevDate = secondHalfRound > 1 ? roundBaseDates[secondHalfRound - 2] : undefined;
    const secondNextDate = secondHalfRound < totalRounds ? roundBaseDates[secondHalfRound] : undefined;

    for (let match = 0; match < matchesPerRound; match++) {
      const homeIdx = (round + match) % (count - 1);
      let awayIdx = (count - 1 - match + round) % (count - 1);
      if (match === 0) {
        awayIdx = count - 1;
      }

      const isEvenRound = round % 2 === 0;
      const t1 = isEvenRound ? teamIds[homeIdx] : teamIds[awayIdx];
      const t2 = isEvenRound ? teamIds[awayIdx] : teamIds[homeIdx];

      const firstSlotInfo = assignVariedMatchDaySlot(
        firstBaseDate,
        match,
        firstHalfRound,
        totalRounds,
        `${leagueId}_${seasonYear}`,
        {
          minDate: minSeasonDate,
          maxDate: maxSeasonDate,
          prevRoundBaseDate: firstPrevDate,
          nextRoundBaseDate: firstNextDate,
          region: 'south_america',
          fallbackTime: match % 2 === 0 ? '18:30' : '21:00',
        }
      );

      fixtures.push({
        id: `${leagueId}_${seasonYear}_r${firstHalfRound}_m${match}`,
        round: firstHalfRound,
        competition: leagueId,
        cupPhase: `${firstHalfRound}ª Rodada`,
        homeTeamId: t1,
        awayTeamId: t2,
        homeScore: null,
        awayScore: null,
        played: false,
        date: firstSlotInfo.date,
        time: firstSlotInfo.time,
        stadiumName: clubMap.get(t1)?.stadium.name,
      });

      if (!singleRoundOnly) {
        const secondSlotInfo = assignVariedMatchDaySlot(
          secondBaseDate,
          match,
          secondHalfRound,
          totalRounds,
          `${leagueId}_${seasonYear}`,
          {
            minDate: minSeasonDate,
            maxDate: maxSeasonDate,
            prevRoundBaseDate: secondPrevDate,
            nextRoundBaseDate: secondNextDate,
            region: 'south_america',
            fallbackTime: match % 2 === 0 ? '18:30' : '21:00',
          }
        );

        fixtures.push({
          id: `${leagueId}_${seasonYear}_r${secondHalfRound}_m${match}`,
          round: secondHalfRound,
          competition: leagueId,
          cupPhase: `${secondHalfRound}ª Rodada`,
          homeTeamId: t2,
          awayTeamId: t1,
          homeScore: null,
          awayScore: null,
          played: false,
          date: secondSlotInfo.date,
          time: secondSlotInfo.time,
          stadiumName: clubMap.get(t2)?.stadium.name,
        });
      }
    }
  }

  return fixtures.sort((a, b) => a.round - b.round);
}

/**
 * Gera simultaneamente os calendários e classificações iniciais de todas as 9 Ligas Nacionais da América do Sul.
 */
export function generateAllSouthAmericanLeagues(
  clubs: Club[],
  seasonYear: number = 2026
): {
  fixturesSouthAmerica: Record<SouthAmericanLeagueId, Fixture[]>;
  standingsSouthAmerica: Record<SouthAmericanLeagueId, Standing[]>;
} {
  const fixturesSouthAmerica = {} as Record<SouthAmericanLeagueId, Fixture[]>;
  const standingsSouthAmerica = {} as Record<SouthAmericanLeagueId, Standing[]>;

  for (const leagueId of SOUTH_AMERICAN_LEAGUE_IDS) {
    const leagueClubs = getClubsForSouthAmericanLeague(clubs, leagueId);
    fixturesSouthAmerica[leagueId] = generateSouthAmericanLeagueSchedule(leagueClubs, leagueId, seasonYear);
    standingsSouthAmerica[leagueId] = generateInitialStandings(leagueClubs.map((c) => c.id));
  }

  return { fixturesSouthAmerica, standingsSouthAmerica };
}

export type ConmebolEntryStage =
  | 'libertadores_grupos'
  | 'libertadores_pre_fase2'
  | 'libertadores_pre_fase1'
  | 'sulamericana_grupos'
  | 'sulamericana_preliminar';

export interface QualifiedClubEntry {
  clubId: string;
  country: string;
  leagueId: CompetitionType;
  positionInLeague: number; // 0 se veio exclusivamente por copa sem estar na tabela principal
  competition: 'libertadores' | 'sulamericana';
  stage: ConmebolEntryStage;
  stageName: string; // 'Fase de Grupos', 'Pré-Libertadores (Fase 2)', etc.
  reason:
    | 'Campeão da Libertadores'
    | 'Campeão da Sul-Americana'
    | 'Campeão da Copa do Brasil'
    | 'Campeão da Copa Argentina'
    | 'Vice da Copa do Brasil'
    | 'Campeão da Copa Nacional'
    | 'Campeão Nacional'
    | 'Vice-Campeão Nacional'
    | 'Vaga Direta Liga'
    | 'Pré-Libertadores Liga'
    | 'Sul-Americana Liga'
    | 'Classificado Fase 3 (Repescagem)';
}

export interface CountryContinentalSummary {
  country: string;
  flagCode: string;
  flagEmoji: string;
  leagueId: CompetitionType;
  leagueName: string;
  // Totais oficiais fixos
  totalLibertadoresBerths: number; // ex: BRA 7, ARG 6, outros 4
  libertadoresDirectBerths: number; // Grupos: BRA 5, ARG 5, outros 2
  libertadoresPhase2Berths: number; // Pré F2: BRA 2, ARG 1, CHI 2, COL 2, outros 1
  libertadoresPhase1Berths: number; // Pré F1: BRA 0, ARG 0, CHI 0, COL 0, outros 1
  totalSulamericanaBerths: number; // ex: BRA 6, ARG 6, outros 4
  sulamericanaDirectBerths: number; // Grupos: BRA 6, ARG 6, outros 0
  sulamericanaPreliminaryBerths: number; // Preliminar: outros 4
  // Posições de corte na tabela da liga nacional
  effectiveLibertadoresDirectCutoff: number;
  effectiveLibertadoresPreCutoff: number;
  effectiveSulamericanaCutoff: number;
  // Listas de clubes classificados
  libertadoresClubs: QualifiedClubEntry[];
  sulamericanaClubs: QualifiedClubEntry[];
  libertadoresGrupos: QualifiedClubEntry[];
  libertadoresPreFase2: QualifiedClubEntry[];
  libertadoresPreFase1: QualifiedClubEntry[];
  sulamericanaGrupos: QualifiedClubEntry[];
  sulamericanaPreliminar: QualifiedClubEntry[];
  // Campos de compatibilidade para código existente
  baseLibertadoresBerths: number;
  baseSulamericanaBerths: number;
  effectiveLibertadoresPositionCutoff: number;
  effectiveSulamericanaPositionCutoff: number;
  criteriaLibertadores?: string;
  criteriaSulamericana?: string;
}

export interface ConmebolQualificationReport {
  libertadoresIds: string[]; // Exatos 32 clubes da Fase de Grupos (28 diretos + 4 vencedores Fase 3)
  sulamericanaIds: string[]; // Exatos 32 clubes da Fase de Grupos (16 preliminares + 12 BRA/ARG + 4 repescados Fase 3)
  libertadoresEntries: QualifiedClubEntry[]; // Entradas dos 32 da Fase de Grupos
  sulamericanaEntries: QualifiedClubEntry[]; // Entradas dos 32 da Fase de Grupos
  allLibertadoresEntries: QualifiedClubEntry[]; // Todos os 47 clubes participantes da Libertadores
  allSulamericanaEntries: QualifiedClubEntry[]; // Todos os 44 clubes nacionais participantes da Sul-Americana
  preLibertadoresPhase3EliminatedIds: string[]; // 4 eliminados da Fase 3 transferidos para os grupos da Sul-Americana
  byLeague: Partial<Record<CompetitionType, CountryContinentalSummary>>;
  orderedCountries: CountryContinentalSummary[];
}

export interface ConmebolCountrySlotConfig {
  country: string;
  flagCode: string;
  flagEmoji: string;
  leagueId: CompetitionType;
  libertadoresTotal: number;
  libertadoresGrupos: number;
  libertadoresPreFase2: number;
  libertadoresPreFase1: number;
  sulamericanaTotal: number;
  sulamericanaGrupos: number;
  sulamericanaPreliminar: number;
  criteriaLibertadores: string;
  criteriaSulamericana: string;
}

export const CONMEBOL_COUNTRY_DISTRIBUTION_TABLE: ConmebolCountrySlotConfig[] = [
  {
    country: 'Brasil',
    flagCode: 'BRA',
    flagEmoji: '🇧🇷',
    leagueId: 'serie_a',
    libertadoresTotal: 5,
    libertadoresGrupos: 5,
    libertadoresPreFase2: 0,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 4,
    sulamericanaGrupos: 4,
    sulamericanaPreliminar: 0,
    criteriaLibertadores:
      'Campeão da Copa do Brasil + 4 primeiros colocados do Brasileirão Série A (se o campeão da Copa terminar no G-4, o 5º colocado herda a vaga).',
    criteriaSulamericana:
      'Os 4 clubes imediatamente abaixo da zona da Libertadores no Brasileirão Série A.',
  },
  {
    country: 'Argentina',
    flagCode: 'ARG',
    flagEmoji: '🇦🇷',
    leagueId: 'liga_arg',
    libertadoresTotal: 5,
    libertadoresGrupos: 5,
    libertadoresPreFase2: 0,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 4,
    sulamericanaGrupos: 4,
    sulamericanaPreliminar: 0,
    criteriaLibertadores:
      'Campeão da Copa Argentina + 4 primeiros colocados do Campeonato Argentino (se o campeão da Copa terminar no G-4, o 5º colocado herda a vaga).',
    criteriaSulamericana:
      'Os 4 clubes imediatamente abaixo da zona da Libertadores no Campeonato Argentino.',
  },
  {
    country: 'Uruguai',
    flagCode: 'URU',
    flagEmoji: '🇺🇾',
    leagueId: 'liga_uru',
    libertadoresTotal: 3,
    libertadoresGrupos: 3,
    libertadoresPreFase2: 0,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 3,
    sulamericanaGrupos: 3,
    sulamericanaPreliminar: 0,
    criteriaLibertadores: 'Os 3 primeiros colocados (1º–3º) do Campeonato Uruguaio.',
    criteriaSulamericana: 'Os 3 clubes logo após a Libertadores (4º–6º) no Campeonato Uruguaio.',
  },
  {
    country: 'Equador',
    flagCode: 'EQU',
    flagEmoji: '🇪🇨',
    leagueId: 'liga_equ',
    libertadoresTotal: 3,
    libertadoresGrupos: 3,
    libertadoresPreFase2: 0,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 3,
    sulamericanaGrupos: 3,
    sulamericanaPreliminar: 0,
    criteriaLibertadores: 'Os 3 primeiros colocados (1º–3º) do Campeonato Equatoriano.',
    criteriaSulamericana: 'Os 3 clubes logo após a Libertadores (4º–6º) no Campeonato Equatoriano.',
  },
  {
    country: 'Colômbia',
    flagCode: 'COL',
    flagEmoji: '🇨🇴',
    leagueId: 'liga_col',
    libertadoresTotal: 3,
    libertadoresGrupos: 3,
    libertadoresPreFase2: 0,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 3,
    sulamericanaGrupos: 3,
    sulamericanaPreliminar: 0,
    criteriaLibertadores: 'Os 3 primeiros colocados (1º–3º) do Campeonato Colombiano.',
    criteriaSulamericana: 'Os 3 clubes logo após a Libertadores (4º–6º) no Campeonato Colombiano.',
  },
  {
    country: 'Chile',
    flagCode: 'CHI',
    flagEmoji: '🇨🇱',
    leagueId: 'liga_chi',
    libertadoresTotal: 3,
    libertadoresGrupos: 3,
    libertadoresPreFase2: 0,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 3,
    sulamericanaGrupos: 3,
    sulamericanaPreliminar: 0,
    criteriaLibertadores: 'Os 3 primeiros colocados (1º–3º) do Campeonato Chileno.',
    criteriaSulamericana: 'Os 3 clubes logo após a Libertadores (4º–6º) no Campeonato Chileno.',
  },
  {
    country: 'Paraguai',
    flagCode: 'PAR',
    flagEmoji: '🇵🇾',
    leagueId: 'liga_par',
    libertadoresTotal: 3,
    libertadoresGrupos: 3,
    libertadoresPreFase2: 0,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 3,
    sulamericanaGrupos: 3,
    sulamericanaPreliminar: 0,
    criteriaLibertadores: 'Os 3 primeiros colocados (1º–3º) do Campeonato Paraguaio.',
    criteriaSulamericana: 'Os 3 clubes logo após a Libertadores (4º–6º) no Campeonato Paraguaio.',
  },
  {
    country: 'Peru',
    flagCode: 'PER',
    flagEmoji: '🇵🇪',
    leagueId: 'liga_per',
    libertadoresTotal: 3,
    libertadoresGrupos: 3,
    libertadoresPreFase2: 0,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 3,
    sulamericanaGrupos: 3,
    sulamericanaPreliminar: 0,
    criteriaLibertadores: 'Os 3 primeiros colocados (1º–3º) do Campeonato Peruano.',
    criteriaSulamericana: 'Os 3 clubes logo após a Libertadores (4º–6º) no Campeonato Peruano.',
  },
  {
    country: 'Bolívia',
    flagCode: 'BOL',
    flagEmoji: '🇧🇴',
    leagueId: 'liga_bol',
    libertadoresTotal: 2,
    libertadoresGrupos: 2,
    libertadoresPreFase2: 0,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 3,
    sulamericanaGrupos: 3,
    sulamericanaPreliminar: 0,
    criteriaLibertadores: 'Os 2 primeiros colocados (1º e 2º) do Campeonato Boliviano.',
    criteriaSulamericana: 'Os 3 clubes logo após a Libertadores (3º–5º) no Campeonato Boliviano.',
  },
  {
    country: 'Venezuela',
    flagCode: 'VEN',
    flagEmoji: '🇻🇪',
    leagueId: 'liga_ven',
    libertadoresTotal: 2,
    libertadoresGrupos: 2,
    libertadoresPreFase2: 0,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 3,
    sulamericanaGrupos: 3,
    sulamericanaPreliminar: 0,
    criteriaLibertadores: 'Os 2 primeiros colocados (1º e 2º) do Campeonato Venezuelano.',
    criteriaSulamericana: 'Os 3 clubes logo após a Libertadores (3º–5º) no Campeonato Venezuelano.',
  },
];

/**
 * Calcula o sistema de classificação continental da CONMEBOL (vagas diretas por país):
 * - Copa Libertadores (exatas 32 vagas diretas na Fase de Grupos):
 *   · Brasil (5): Campeão da Copa do Brasil + 4 primeiros do Brasileirão Série A
 *   · Argentina (5): Campeão da Copa Argentina + 4 primeiros do Campeonato Argentino
 *   · Uruguai, Equador, Colômbia, Chile, Paraguai, Peru (3 cada): 3 primeiros das ligas nacionais
 *   · Bolívia, Venezuela (2 cada): 2 primeiros das ligas nacionais
 * - Copa Sul-Americana (exatas 32 vagas diretas na Fase de Grupos):
 *   · Brasil (4), Argentina (4), demais 8 países (3 cada) — sempre os clubes imediatamente após as vagas da Libertadores nas ligas nacionais.
 */
export function computeConmebolContinentalQualifiers(params: {
  clubs: Club[];
  standingsA: Standing[];
  standingsSouthAmerica?: Partial<Record<SouthAmericanLeagueId, Standing[]>>;
  libertadoresChampId?: string;
  sulamericanaChampId?: string;
  copaBrasilChampId?: string;
  copaBrasilRunnerUpId?: string;
  domesticCupChampions?: Partial<Record<SouthAmericanCupId, string>>;
}): ConmebolQualificationReport {
  const {
    clubs,
    standingsA,
    standingsSouthAmerica,
    copaBrasilChampId,
    domesticCupChampions = {},
  } = params;

  const clubMap = new Map<string, Club>();
  clubs.forEach((c) => clubMap.set(c.id, c));

  const byLeague: Partial<Record<CompetitionType, CountryContinentalSummary>> = {};
  const orderedCountries: CountryContinentalSummary[] = [];

  const allLibertadoresEntries: QualifiedClubEntry[] = [];
  const allSulamericanaEntries: QualifiedClubEntry[] = [];
  const directLibertadoresGroupPool: string[] = [];
  const directSulamericanaGroupPool: string[] = [];

  // Itera cada um dos 10 países configurados
  for (const cfg of CONMEBOL_COUNTRY_DISTRIBUTION_TABLE) {
    const isBrazil = cfg.country === 'Brasil';
    const isArgentina = cfg.country === 'Argentina';
    const leagueStandings = isBrazil
      ? standingsA && standingsA.length > 0
        ? standingsA
        : generateInitialStandings(clubs.filter((c) => c.division === 'A').map((c) => c.id))
      : standingsSouthAmerica?.[cfg.leagueId as SouthAmericanLeagueId] &&
        standingsSouthAmerica[cfg.leagueId as SouthAmericanLeagueId]!.length > 0
      ? standingsSouthAmerica[cfg.leagueId as SouthAmericanLeagueId]!
      : generateInitialStandings(
          getClubsForSouthAmericanLeague(clubs, cfg.leagueId as SouthAmericanLeagueId).map((c) => c.id)
        );

    const posMap = new Map<string, number>();
    leagueStandings.forEach((row, idx) => {
      posMap.set(row.teamId, idx + 1);
    });

    const countryLibClubs: QualifiedClubEntry[] = [];
    const countrySulaClubs: QualifiedClubEntry[] = [];
    const allocatedThisCountry = new Set<string>();

    // 1. Vaga via Copa Nacional (exclusivamente Brasil = Copa do Brasil, Argentina = Copa Argentina)
    let hasCupSpotAllocated = false;
    if (isBrazil && copaBrasilChampId && clubMap.has(copaBrasilChampId)) {
      allocatedThisCountry.add(copaBrasilChampId);
      hasCupSpotAllocated = true;
      const entry: QualifiedClubEntry = {
        clubId: copaBrasilChampId,
        country: cfg.country,
        leagueId: cfg.leagueId,
        positionInLeague: posMap.get(copaBrasilChampId) || 0,
        competition: 'libertadores',
        stage: 'libertadores_grupos',
        stageName: 'Fase de Grupos',
        reason: 'Campeão da Copa do Brasil',
      };
      countryLibClubs.push(entry);
      directLibertadoresGroupPool.push(copaBrasilChampId);
    } else if (
      isArgentina &&
      domesticCupChampions.sa_copa_argentina &&
      clubMap.has(domesticCupChampions.sa_copa_argentina)
    ) {
      const copaArgId = domesticCupChampions.sa_copa_argentina;
      allocatedThisCountry.add(copaArgId);
      hasCupSpotAllocated = true;
      const entry: QualifiedClubEntry = {
        clubId: copaArgId,
        country: cfg.country,
        leagueId: cfg.leagueId,
        positionInLeague: posMap.get(copaArgId) || 0,
        competition: 'libertadores',
        stage: 'libertadores_grupos',
        stageName: 'Fase de Grupos',
        reason: 'Campeão da Copa Argentina',
      };
      countryLibClubs.push(entry);
      directLibertadoresGroupPool.push(copaArgId);
    }

    // 2. Preenchimento pela Liga Nacional (Libertadores primeiro, depois Sul-Americana logo abaixo)
    // Enquanto a Copa do Brasil / Copa Argentina não tem campeão definido, apenas os 4 primeiros da liga
    // (G-4) ocupam vagas da Libertadores; a 5ª vaga fica reservada para o campeão da Copa Nacional.
    const libTargetCount =
      (isBrazil || isArgentina) && !hasCupSpotAllocated
        ? Math.max(0, cfg.libertadoresGrupos - 1)
        : cfg.libertadoresGrupos;

    let effectiveLibDirectCutoff = 0;
    let effectiveSulaCutoff = 0;

    for (let i = 0; i < leagueStandings.length; i++) {
      const cid = leagueStandings[i].teamId;
      if (allocatedThisCountry.has(cid)) continue;

      const pos = i + 1;

      if (countryLibClubs.length < libTargetCount) {
        allocatedThisCountry.add(cid);
        effectiveLibDirectCutoff = pos;
        const entry: QualifiedClubEntry = {
          clubId: cid,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: pos,
          competition: 'libertadores',
          stage: 'libertadores_grupos',
          stageName: 'Fase de Grupos',
          reason:
            pos === 1
              ? 'Campeão Nacional'
              : pos === 2
              ? 'Vice-Campeão Nacional'
              : 'Vaga Direta Liga',
        };
        countryLibClubs.push(entry);
        directLibertadoresGroupPool.push(cid);
        continue;
      }

      if (countrySulaClubs.length < cfg.sulamericanaTotal) {
        allocatedThisCountry.add(cid);
        effectiveSulaCutoff = pos;
        const entry: QualifiedClubEntry = {
          clubId: cid,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: pos,
          competition: 'sulamericana',
          stage: 'sulamericana_grupos',
          stageName: 'Fase de Grupos',
          reason: 'Sul-Americana Liga',
        };
        countrySulaClubs.push(entry);
        directSulamericanaGroupPool.push(cid);
        continue;
      }
    }

    countryLibClubs.sort((a, b) => (a.positionInLeague || 99) - (b.positionInLeague || 99));
    countrySulaClubs.sort((a, b) => (a.positionInLeague || 99) - (b.positionInLeague || 99));

    allLibertadoresEntries.push(...countryLibClubs);
    allSulamericanaEntries.push(...countrySulaClubs);

    const summary: CountryContinentalSummary = {
      country: cfg.country,
      flagCode: cfg.flagCode,
      flagEmoji: cfg.flagEmoji,
      leagueId: cfg.leagueId,
      leagueName: isBrazil
        ? 'Brasileirão Série A'
        : SOUTH_AMERICAN_LEAGUES_META[cfg.leagueId as SouthAmericanLeagueId]?.name || cfg.country,
      totalLibertadoresBerths: cfg.libertadoresTotal,
      libertadoresDirectBerths: cfg.libertadoresGrupos,
      libertadoresPhase2Berths: 0,
      libertadoresPhase1Berths: 0,
      totalSulamericanaBerths: cfg.sulamericanaTotal,
      sulamericanaDirectBerths: cfg.sulamericanaGrupos,
      sulamericanaPreliminaryBerths: 0,
      effectiveLibertadoresDirectCutoff: effectiveLibDirectCutoff,
      effectiveLibertadoresPreCutoff: effectiveLibDirectCutoff,
      effectiveSulamericanaCutoff: effectiveSulaCutoff,
      libertadoresClubs: countryLibClubs,
      sulamericanaClubs: countrySulaClubs,
      libertadoresGrupos: countryLibClubs,
      libertadoresPreFase2: [],
      libertadoresPreFase1: [],
      sulamericanaGrupos: countrySulaClubs,
      sulamericanaPreliminar: [],
      baseLibertadoresBerths: cfg.libertadoresTotal,
      baseSulamericanaBerths: cfg.sulamericanaTotal,
      effectiveLibertadoresPositionCutoff: effectiveLibDirectCutoff,
      effectiveSulamericanaPositionCutoff: effectiveSulaCutoff,
      criteriaLibertadores: cfg.criteriaLibertadores,
      criteriaSulamericana: cfg.criteriaSulamericana,
    };

    byLeague[cfg.leagueId] = summary;
    orderedCountries.push(summary);
  }

  // Exatos 32 clubes na Fase de Grupos da Libertadores (5+5+3+3+3+3+3+3+2+2 = 32)
  const directSulaSet = new Set(directSulamericanaGroupPool);
  const finalLibertadores32Ids = Array.from(new Set(directLibertadoresGroupPool));
  if (finalLibertadores32Ids.length < 32) {
    // Primeiro tenta completar sem remover clubes já classificados à Sul-Americana
    for (const c of clubs) {
      if (
        (c.division === 'A' || c.division === 'SA') &&
        !finalLibertadores32Ids.includes(c.id) &&
        !directSulaSet.has(c.id)
      ) {
        finalLibertadores32Ids.push(c.id);
        if (finalLibertadores32Ids.length >= 32) break;
      }
    }
  }
  if (finalLibertadores32Ids.length < 32) {
    for (const c of clubs) {
      if (
        (c.division === 'A' || c.division === 'SA') &&
        !finalLibertadores32Ids.includes(c.id)
      ) {
        finalLibertadores32Ids.push(c.id);
        if (finalLibertadores32Ids.length >= 32) break;
      }
    }
  }
  const lib32Set = new Set(finalLibertadores32Ids.slice(0, 32));

  // Exatos 32 clubes na Fase de Grupos da Sul-Americana (4+4+3+3+3+3+3+3+3+3 = 32)
  const finalSulamericana32Ids = Array.from(new Set(directSulamericanaGroupPool)).filter(
    (id) => !lib32Set.has(id)
  );
  if (finalSulamericana32Ids.length < 32) {
    for (const c of clubs) {
      if (
        (c.division === 'A' || c.division === 'SA') &&
        !lib32Set.has(c.id) &&
        !finalSulamericana32Ids.includes(c.id)
      ) {
        finalSulamericana32Ids.push(c.id);
        if (finalSulamericana32Ids.length >= 32) break;
      }
    }
  }

  const libertadoresEntriesFinal = finalLibertadores32Ids.slice(0, 32).map((id) => {
    const existing = allLibertadoresEntries.find((e) => e.clubId === id);
    if (existing) return existing;
    const cObj = clubMap.get(id);
    return {
      clubId: id,
      country: cObj?.country || 'Brasil',
      leagueId: (getClubSouthAmericanLeagueId(cObj) || 'serie_a') as CompetitionType,
      positionInLeague: 0,
      competition: 'libertadores' as const,
      stage: 'libertadores_grupos' as ConmebolEntryStage,
      stageName: 'Fase de Grupos',
      reason: 'Vaga Direta Liga' as const,
    };
  });

  const sulamericanaEntriesFinal = finalSulamericana32Ids.slice(0, 32).map((id) => {
    const existing = allSulamericanaEntries.find((e) => e.clubId === id);
    if (existing) return existing;
    const cObj = clubMap.get(id);
    return {
      clubId: id,
      country: cObj?.country || 'Brasil',
      leagueId: (getClubSouthAmericanLeagueId(cObj) || 'serie_a') as CompetitionType,
      positionInLeague: 0,
      competition: 'sulamericana' as const,
      stage: 'sulamericana_grupos' as ConmebolEntryStage,
      stageName: 'Fase de Grupos',
      reason: 'Sul-Americana Liga' as const,
    };
  });

  return {
    libertadoresIds: finalLibertadores32Ids.slice(0, 32),
    sulamericanaIds: finalSulamericana32Ids.slice(0, 32),
    libertadoresEntries: libertadoresEntriesFinal,
    sulamericanaEntries: sulamericanaEntriesFinal,
    allLibertadoresEntries,
    allSulamericanaEntries,
    preLibertadoresPhase3EliminatedIds: [],
    byLeague,
    orderedCountries,
  };
}

/**
 * Sorteio realista de 8 grupos (Grupo A ao Grupo H) estilo CONMEBOL:
 * - Divide os 32 classificados em 4 Potes de 8 por força/reputação (com atual campeão cabeça de chave do Grupo A).
 * - Evita clubes do mesmo país no mesmo grupo sempre que matematicamente possível.
 */
export function seedContinentalGroupsWithCountryProtection(
  qualifiedIds: string[],
  clubs: Club[],
  defendingChampId?: string,
  options?: { shufflePots?: boolean }
): string[][] {
  const clubMap = new Map<string, Club>();
  clubs.forEach((c) => clubMap.set(c.id, c));

  const uniqueIds = Array.from(new Set(qualifiedIds)).slice(0, 32);

  const ranked = [...uniqueIds].sort((idA, idB) => {
    if (defendingChampId) {
      if (idA === defendingChampId) return -1;
      if (idB === defendingChampId) return 1;
    }
    const cA = clubMap.get(idA);
    const cB = clubMap.get(idB);
    const repDiff = (cB?.reputation || 3) - (cA?.reputation || 3);
    if (repDiff !== 0) return repDiff;
    const ovrA = cA ? getClubSectorRatings(cA).overall : 70;
    const ovrB = cB ? getClubSectorRatings(cB).overall : 70;
    return ovrB - ovrA;
  });

  const shuffleList = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  let pot1 = ranked.slice(0, 8);
  let pot2 = ranked.slice(8, 16);
  let pot3 = ranked.slice(16, 24);
  let pot4 = ranked.slice(24, 32);

  if (options?.shufflePots) {
    if (defendingChampId && pot1[0] === defendingChampId) {
      pot1 = [pot1[0], ...shuffleList(pot1.slice(1))];
    } else {
      pot1 = shuffleList(pot1);
    }
    pot2 = shuffleList(pot2);
    pot3 = shuffleList(pot3);
    pot4 = shuffleList(pot4);
  }

  const pots: string[][] = [pot1, pot2, pot3, pot4];

  const groups: string[][] = Array.from({ length: 8 }, () => []);

  pots[0].forEach((clubId, idx) => {
    groups[idx].push(clubId);
  });

  const getCountry = (cid: string) => clubMap.get(cid)?.country || 'Brasil';

  for (let potIdx = 1; potIdx < 4; potIdx++) {
    const potClubs = [...pots[potIdx]];
    const usedGroupIndices = new Set<number>();

    for (const clubId of potClubs) {
      const cCountry = getCountry(clubId);
      let chosenGroup = -1;
      for (let g = 0; g < 8; g++) {
        if (usedGroupIndices.has(g)) continue;
        const hasSameCountry = groups[g].some((memberId) => getCountry(memberId) === cCountry);
        if (!hasSameCountry) {
          chosenGroup = g;
          break;
        }
      }

      if (chosenGroup === -1) {
        const remainingGroup = Array.from({ length: 8 }, (_, idx) => idx).find(
          (g) => !usedGroupIndices.has(g)
        );
        if (remainingGroup !== undefined) {
          let swapped = false;
          for (const prevGroup of Array.from(usedGroupIndices)) {
            const prevClubFromThisPot = groups[prevGroup][potIdx];
            if (!prevClubFromThisPot) continue;
            const prevClubCountry = getCountry(prevClubFromThisPot);

            const canClubGoToPrev = !groups[prevGroup]
              .slice(0, potIdx)
              .some((m) => getCountry(m) === cCountry);
            const canPrevGoToRemaining = !groups[remainingGroup]
              .slice(0, potIdx)
              .some((m) => getCountry(m) === prevClubCountry);

            if (canClubGoToPrev && canPrevGoToRemaining) {
              groups[prevGroup][potIdx] = clubId;
              groups[remainingGroup].push(prevClubFromThisPot);
              usedGroupIndices.add(remainingGroup);
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
        groups[chosenGroup].push(clubId);
        usedGroupIndices.add(chosenGroup);
      }
    }
  }

  return groups;
}

/**
 * Credita premiações financeiras de encerramento para as 9 Ligas Sul-Americanas,
 * retorna os IDs dos 9 campeões nacionais + registros históricos de troféus
 * e mensagem de premiação caso o usuário comande um clube de liga sul-americana.
 */
export function awardSouthAmericanLeagueEndPrizes(params: {
  clubs: Club[];
  standingsSouthAmerica?: Partial<Record<SouthAmericanLeagueId, Standing[]>>;
  userClubId: string;
  seasonYear: number;
  endDate: string;
  skipFinancialCredit?: boolean;
}): {
  updatedClubs: Club[];
  championClubIds: string[];
  trophies: TrophyRecord[];
  userInboxMessage: InboxMessage | null;
} {
  const {
    clubs,
    standingsSouthAmerica,
    userClubId,
    seasonYear,
    endDate,
    skipFinancialCredit = false,
  } = params;
  const clubMap = new Map<string, Club>();
  clubs.forEach((c) => clubMap.set(c.id, c));

  const prizeByClub = new Map<string, number>();
  const championClubIds: string[] = [];
  const trophies: TrophyRecord[] = [];
  let userInboxMessage: InboxMessage | null = null;

  for (const leagueId of SOUTH_AMERICAN_LEAGUE_IDS) {
    const table = standingsSouthAmerica?.[leagueId] || [];
    if (table.length === 0) continue;
    const meta = SOUTH_AMERICAN_LEAGUES_META[leagueId];

    const champId = table[0]?.teamId;
    const runnerId = table[1]?.teamId;
    if (champId) {
      championClubIds.push(champId);
      const champClub = clubMap.get(champId);
      const runnerClub = runnerId ? clubMap.get(runnerId) : undefined;
      trophies.push({
        year: seasonYear,
        competition: meta.name,
        championTeamName: champClub?.name || champId,
        runnerUpTeamName: runnerClub?.name || runnerId || 'Vice-campeão',
        userWon: champId === userClubId,
      });
    }

    if (skipFinancialCredit) continue;

    table.forEach((row, index) => {
      const pos = index + 1;
      let amount = 0;
      if (pos === 1) amount = meta.championPrize;
      else if (pos === 2) amount = meta.runnerUpPrize;
      else if (pos <= meta.libertadoresBerths) amount = Math.round(meta.runnerUpPrize * 0.65);
      else if (pos <= meta.libertadoresBerths + meta.sulamericanaBerths)
        amount = Math.round(meta.runnerUpPrize * 0.4);
      else amount = Math.round(meta.runnerUpPrize * 0.18);

      prizeByClub.set(row.teamId, (prizeByClub.get(row.teamId) || 0) + amount);

      if (row.teamId === userClubId) {
        const qualNote =
          pos <= meta.libertadoresBerths
            ? 'Classificado para a CONMEBOL Libertadores!'
            : pos <= meta.libertadoresBerths + meta.sulamericanaBerths
            ? 'Classificado para a CONMEBOL Sul-Americana!'
            : 'Temporada encerrada no calendário nacional.';

        userInboxMessage = {
          id: `prize_${leagueId}_${seasonYear}_${Date.now()}`,
          date: endDate,
          round: meta.totalRounds,
          title:
            pos === 1
              ? `CAMPEÃO! Título e Premiação da ${meta.name} ${seasonYear} (${meta.federation})`
              : `Premiação Final (${meta.federation}): ${pos}º Lugar na ${meta.name}`,
          message: `A federação (${meta.federation}) oficializou o encerramento da ${meta.name} ${seasonYear}. Sua equipe terminou na ${pos}ª colocação e recebeu R$ ${(
            amount / 1_000_000
          ).toFixed(1)}M de direitos e premiação. ${qualNote}`,
          type: pos === 1 ? 'AWARD' : 'FINANCE',
          read: false,
        };
      }
    });
  }

  const updatedClubs = skipFinancialCredit
    ? clubs
    : clubs.map((club) => {
        const bonus = prizeByClub.get(club.id) || 0;
        if (bonus <= 0) return club;
        return {
          ...club,
          finances: {
            ...club.finances,
            balance: club.finances.balance + bonus,
            totalIncomeSeason: (club.finances.totalIncomeSeason || 0) + bonus,
          },
        };
      });

  return {
    updatedClubs,
    championClubIds,
    trophies,
    userInboxMessage,
  };
}

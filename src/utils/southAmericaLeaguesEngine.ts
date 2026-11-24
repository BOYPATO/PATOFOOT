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
import { getRoundDate } from './calendarUtils';
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
 * - 7 vagas na Libertadores: 5 diretas na Fase de Grupos (G-4 + Copa do Brasil) + 2 na Pré-Libertadores Fase 2 (5º e Vice da Copa / 6º).
 * - 6 vagas na Sul-Americana: todas diretas na Fase de Grupos (6º ao 11º da Série A).
 */
export const BRAZIL_CONMEBOL_CONFIG = {
  country: 'Brasil',
  flagCode: 'BRA',
  flagEmoji: '🇧🇷',
  leagueId: 'serie_a' as CompetitionType,
  libertadoresTotal: 7,
  libertadoresDirectBerths: 5,
  libertadoresPhase2Berths: 2,
  libertadoresPhase1Berths: 0,
  sulamericanaTotal: 6,
  sulamericanaDirectBerths: 6,
  sulamericanaPreliminaryBerths: 0,
  criteriaLibertadores:
    'G-4 Série A + Campeão Copa do Brasil (Fase de Grupos); 5º Série A + Vice da Copa do Brasil (Pré-Libertadores Fase 2). Se o campeão da Copa terminar no G-4, o vice herda a vaga direta nos grupos e o 6º entra na Fase 2.',
  criteriaSulamericana:
    '6º ao 11º da Série A entram direto na Fase de Grupos (a zona se estende caso clubes acima vençam Libertadores, Sul-Americana ou Copa do Brasil).',
};

/**
 * Configuração realista e oficial das 9 Ligas Nacionais da CONMEBOL (além do Brasileirão).
 * Distribuição rigorosa conforme o Regulamento CONMEBOL:
 * - Libertadores (47 vagas fixas): Brasil (7) + Argentina (6) + Bolívia (4) + Chile (4) + Colômbia (4) + Equador (4) + Paraguai (4) + Peru (4) + Uruguai (4) + Venezuela (4) + 2 Campeões Continentais = 47 vagas.
 * - Sul-Americana (44 vagas nacionais): Brasil (6 diretas) + Argentina (6 diretas) + 8 países x 4 (Fase Preliminar) = 44 vagas. (Mais 4 eliminados da Fase 3 da Pré-Libertadores nos grupos).
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
    libertadoresBerths: 6,
    libertadoresDirectBerths: 5,
    libertadoresPhase2Berths: 1,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 6,
    sulamericanaDirectBerths: 6,
    sulamericanaPreliminaryBerths: 0,
    relegationSlots: 2,
    championPrize: 38_000_000,
    runnerUpPrize: 20_000_000,
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    formatSummary:
      '30 clubes em turno único corrido (29 rodadas). 6 vagas na Libertadores (5 Grupos + 1 Pré F2) e 6 vagas na Sul-Americana (Fase de Grupos).',
    continentalCriteriaSummary:
      'Libertadores: Campeão Apertura/Clausura + Campeão da Copa Argentina + Top da tabela anual (5 Grupos); 3º melhor da tabela sem vaga direta entra na Fase 2. Sul-Americana: 6 melhores da tabela anual abaixo da Libertadores entram direto na Fase de Grupos.',
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
    libertadoresBerths: 4,
    libertadoresDirectBerths: 2,
    libertadoresPhase2Berths: 2,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 4,
    sulamericanaDirectBerths: 0,
    sulamericanaPreliminaryBerths: 4,
    relegationSlots: 2,
    championPrize: 24_000_000,
    runnerUpPrize: 13_000_000,
    primaryColor: '#facc15',
    secondaryColor: '#1d4ed8',
    formatSummary:
      '20 clubes na Reclasificación anual (38 rodadas). 4 vagas na Libertadores (2 Grupos + 2 Pré F2) e 4 vagas na Sul-Americana (Fase Preliminar).',
    continentalCriteriaSummary:
      'Libertadores: Campeão Apertura e Finalización (ou 1º e 2º da Reclasificación) na Fase de Grupos; 3º e 4º da Reclasificación na Fase 2. Sul-Americana: Campeão da Copa Colômbia + 3 melhores da Reclasificación disputam a Fase Preliminar nacional em jogo único.',
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
    libertadoresBerths: 4,
    libertadoresDirectBerths: 2,
    libertadoresPhase2Berths: 1,
    libertadoresPhase1Berths: 1,
    sulamericanaBerths: 4,
    sulamericanaDirectBerths: 0,
    sulamericanaPreliminaryBerths: 4,
    relegationSlots: 3,
    championPrize: 20_000_000,
    runnerUpPrize: 11_000_000,
    primaryColor: '#60a5fa',
    secondaryColor: '#1e3a8a',
    formatSummary:
      '16 clubes na Tabla Anual (30 rodadas). 4 vagas na Libertadores (2 Grupos + 1 Pré F2 + 1 Pré F1) e 4 vagas na Sul-Americana (Fase Preliminar).',
    continentalCriteriaSummary:
      'Libertadores: Campeão e Vice do Campeonato Uruguaio (Fase de Grupos); 3º da Tabla Anual (Fase 2); 4º da Tabla Anual (Fase 1). Sul-Americana: 5º ao 8º da Tabla Anual disputam a Fase Preliminar nacional em jogo único.',
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
    libertadoresBerths: 4,
    libertadoresDirectBerths: 2,
    libertadoresPhase2Berths: 1,
    libertadoresPhase1Berths: 1,
    sulamericanaBerths: 4,
    sulamericanaDirectBerths: 0,
    sulamericanaPreliminaryBerths: 4,
    relegationSlots: 2,
    championPrize: 22_000_000,
    runnerUpPrize: 12_000_000,
    primaryColor: '#fbbf24',
    secondaryColor: '#1e40af',
    formatSummary:
      '16 clubes na tabela acumulada LigaPro (30 rodadas). 4 vagas na Libertadores (2 Grupos + 1 Pré F2 + 1 Pré F1) e 4 vagas na Sul-Americana (Fase Preliminar).',
    continentalCriteriaSummary:
      'Libertadores: Campeão e Vice da LigaPro (Fase de Grupos); 3º colocado geral (Fase 2); Campeão da Copa Ecuador (ou 4º da tabela) na Fase 1. Sul-Americana: 4 melhores da tabela da LigaPro fora da Libertadores disputam a Fase Preliminar nacional.',
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
    libertadoresBerths: 4,
    libertadoresDirectBerths: 2,
    libertadoresPhase2Berths: 2,
    libertadoresPhase1Berths: 0,
    sulamericanaBerths: 4,
    sulamericanaDirectBerths: 0,
    sulamericanaPreliminaryBerths: 4,
    relegationSlots: 2,
    championPrize: 21_000_000,
    runnerUpPrize: 11_500_000,
    primaryColor: '#ef4444',
    secondaryColor: '#1d4ed8',
    formatSummary:
      '16 clubes em 30 rodadas. 4 vagas na Libertadores (2 Grupos + 2 Pré F2) e 4 vagas na Sul-Americana (Fase Preliminar).',
    continentalCriteriaSummary:
      'Libertadores: Campeão e Vice da Primera División (Fase de Grupos); 3º colocado e Campeão da Copa Chile (Fase 2, com descida para o 4º se a Copa tiver vaga). Sul-Americana: 4º ao 7º da Primera División disputam a Fase Preliminar nacional.',
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
    libertadoresBerths: 4,
    libertadoresDirectBerths: 2,
    libertadoresPhase2Berths: 1,
    libertadoresPhase1Berths: 1,
    sulamericanaBerths: 4,
    sulamericanaDirectBerths: 0,
    sulamericanaPreliminaryBerths: 4,
    relegationSlots: 2,
    championPrize: 19_000_000,
    runnerUpPrize: 10_000_000,
    primaryColor: '#f87171',
    secondaryColor: '#1e40af',
    formatSummary:
      '12 clubes na tabela anual APF (22 rodadas). 4 vagas na Libertadores (2 Grupos + 1 Pré F2 + 1 Pré F1) e 4 vagas na Sul-Americana (Fase Preliminar).',
    continentalCriteriaSummary:
      'Libertadores: Campeão Apertura e Clausura / Top 2 da tabela anual (Fase de Grupos); 3º da tabela anual (Fase 2); Campeão da Copa Paraguay (ou 4º da tabela) na Fase 1. Sul-Americana: 4 melhores da tabela anual abaixo da Libertadores disputam a Fase Preliminar.',
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
    libertadoresBerths: 4,
    libertadoresDirectBerths: 2,
    libertadoresPhase2Berths: 1,
    libertadoresPhase1Berths: 1,
    sulamericanaBerths: 4,
    sulamericanaDirectBerths: 0,
    sulamericanaPreliminaryBerths: 4,
    relegationSlots: 3,
    championPrize: 17_500_000,
    runnerUpPrize: 9_500_000,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    formatSummary:
      '18 clubes no acumulado da Liga 1 (34 rodadas). 4 vagas na Libertadores (2 Grupos + 1 Pré F2 + 1 Pré F1) e 4 vagas na Sul-Americana (Fase Preliminar).',
    continentalCriteriaSummary:
      'Libertadores: Campeão e Vice da Liga 1 (Fase de Grupos); 3º colocado (Fase 2); 4º colocado na classificação geral (Fase 1). Sul-Americana: 5º ao 8º da tabela anual disputam a Fase Preliminar nacional em jogo único.',
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
    libertadoresBerths: 4,
    libertadoresDirectBerths: 2,
    libertadoresPhase2Berths: 1,
    libertadoresPhase1Berths: 1,
    sulamericanaBerths: 4,
    sulamericanaDirectBerths: 0,
    sulamericanaPreliminaryBerths: 4,
    relegationSlots: 2,
    championPrize: 15_000_000,
    runnerUpPrize: 8_000_000,
    primaryColor: '#16a34a',
    secondaryColor: '#eab308',
    formatSummary:
      '16 clubes na tabela acumulada (30 rodadas). 4 vagas na Libertadores (2 Grupos + 1 Pré F2 + 1 Pré F1) e 4 vagas na Sul-Americana (Fase Preliminar).',
    continentalCriteriaSummary:
      'Libertadores: Campeão Apertura e Clausura / Top 2 da tabela acumulada (Fase de Grupos); 3º da tabela acumulada (Fase 2); 4º da tabela acumulada (Fase 1). Sul-Americana: 4 melhores clubes seguintes da tabela acumulada disputam a Fase Preliminar nacional.',
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
    libertadoresBerths: 4,
    libertadoresDirectBerths: 2,
    libertadoresPhase2Berths: 1,
    libertadoresPhase1Berths: 1,
    sulamericanaBerths: 4,
    sulamericanaDirectBerths: 0,
    sulamericanaPreliminaryBerths: 4,
    relegationSlots: 2,
    championPrize: 14_500_000,
    runnerUpPrize: 7_500_000,
    primaryColor: '#9f1239',
    secondaryColor: '#facc15',
    formatSummary:
      '14 clubes na tabela anual Liga FUTVE (26 rodadas). 4 vagas na Libertadores (2 Grupos + 1 Pré F2 + 1 Pré F1) e 4 vagas na Sul-Americana (Fase Preliminar).',
    continentalCriteriaSummary:
      'Libertadores: Campeão da final absoluta e líder da tabela anual (Fase de Grupos); Vice-campeão / 3º colocado (Fase 2); 4º da tabela anual (Fase 1). Sul-Americana: 5º ao 8º da tabela anual disputam a Fase Preliminar nacional em jogo único.',
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

  for (let round = 0; round < halfRounds; round++) {
    const firstHalfRound = round + 1;
    const secondHalfRound = round + 1 + halfRounds;

    const firstSlot =
      totalRounds <= 1
        ? 1
        : Math.max(1, Math.min(38, Math.round(1 + ((firstHalfRound - 1) * 37) / (totalRounds - 1))));
    const secondSlot =
      totalRounds <= 1
        ? 38
        : Math.max(1, Math.min(38, Math.round(1 + ((secondHalfRound - 1) * 37) / (totalRounds - 1))));

    const firstDateInfo = getRoundDate(firstSlot, seasonYear);
    const secondDateInfo = getRoundDate(secondSlot, seasonYear);

    for (let match = 0; match < matchesPerRound; match++) {
      const homeIdx = (round + match) % (count - 1);
      let awayIdx = (count - 1 - match + round) % (count - 1);
      if (match === 0) {
        awayIdx = count - 1;
      }

      const isEvenRound = round % 2 === 0;
      const t1 = isEvenRound ? teamIds[homeIdx] : teamIds[awayIdx];
      const t2 = isEvenRound ? teamIds[awayIdx] : teamIds[homeIdx];

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
        date: firstDateInfo.date,
        time: match % 2 === 0 ? '18:30' : '21:00',
        stadiumName: clubMap.get(t1)?.stadium.name,
      });

      if (!singleRoundOnly) {
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
          date: secondDateInfo.date,
          time: match % 2 === 0 ? '18:30' : '21:00',
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
    libertadoresTotal: 7,
    libertadoresGrupos: 5,
    libertadoresPreFase2: 2,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 6,
    sulamericanaGrupos: 6,
    sulamericanaPreliminar: 0,
    criteriaLibertadores:
      'G-4 da Série A + Campeão da Copa do Brasil (Fase de Grupos); 5º da Série A + Vice da Copa do Brasil (Pré-Libertadores Fase 2). Se o campeão da Copa terminar no G-4, o vice herda a vaga direta nos grupos e o 6º entra na Fase 2.',
    criteriaSulamericana:
      '6º ao 11º da Série A entram direto na Fase de Grupos (zona se estende caso clubes acima vençam Libertadores, Sul-Americana ou Copa do Brasil).',
  },
  {
    country: 'Argentina',
    flagCode: 'ARG',
    flagEmoji: '🇦🇷',
    leagueId: 'liga_arg',
    libertadoresTotal: 6,
    libertadoresGrupos: 5,
    libertadoresPreFase2: 1,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 6,
    sulamericanaGrupos: 6,
    sulamericanaPreliminar: 0,
    criteriaLibertadores:
      'Campeão Apertura/Clausura + Campeão da Copa Argentina + Top da tabela anual acumulada (Fase de Grupos); 3º melhor da tabela anual sem vaga direta entra na Pré-Libertadores Fase 2.',
    criteriaSulamericana:
      'Os 6 melhores times da tabela anual acumulada imediatamente abaixo da zona da Libertadores entram direto na Fase de Grupos.',
  },
  {
    country: 'Bolívia',
    flagCode: 'BOL',
    flagEmoji: '🇧🇴',
    leagueId: 'liga_bol',
    libertadoresTotal: 4,
    libertadoresGrupos: 2,
    libertadoresPreFase2: 1,
    libertadoresPreFase1: 1,
    sulamericanaTotal: 4,
    sulamericanaGrupos: 0,
    sulamericanaPreliminar: 4,
    criteriaLibertadores:
      'Campeão e vice da Primera División (Fase de Grupos); 3º da tabela acumulada (Pré-Libertadores Fase 2); 4º da tabela acumulada (Pré-Libertadores Fase 1).',
    criteriaSulamericana:
      'Os 4 melhores da tabela acumulada fora da Libertadores disputam a Fase Preliminar nacional em jogo único (2 avançam aos grupos).',
  },
  {
    country: 'Chile',
    flagCode: 'CHI',
    flagEmoji: '🇨🇱',
    leagueId: 'liga_chi',
    libertadoresTotal: 4,
    libertadoresGrupos: 2,
    libertadoresPreFase2: 2,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 4,
    sulamericanaGrupos: 0,
    sulamericanaPreliminar: 4,
    criteriaLibertadores:
      'Campeão e vice da Primera División (Fase de Grupos); 3º da Primera División e Campeão da Copa Chile (Pré-Libertadores Fase 2). Se o campeão da Copa já tiver vaga, o 4º da liga herda.',
    criteriaSulamericana:
      '4º ao 7º da Primera División disputam a Fase Preliminar nacional em jogo único (2 avançam aos grupos).',
  },
  {
    country: 'Colômbia',
    flagCode: 'COL',
    flagEmoji: '🇨🇴',
    leagueId: 'liga_col',
    libertadoresTotal: 4,
    libertadoresGrupos: 2,
    libertadoresPreFase2: 2,
    libertadoresPreFase1: 0,
    sulamericanaTotal: 4,
    sulamericanaGrupos: 0,
    sulamericanaPreliminar: 4,
    criteriaLibertadores:
      '1º e 2º colocados da Reclasificación (Fase de Grupos); 3º e 4º colocados da Reclasificación (Pré-Libertadores Fase 2).',
    criteriaSulamericana:
      'Campeão da Copa Colômbia + 3 melhores da Reclasificación sem vaga na Libertadores disputam a Fase Preliminar nacional (2 avançam aos grupos).',
  },
  {
    country: 'Equador',
    flagCode: 'EQU',
    flagEmoji: '🇪🇨',
    leagueId: 'liga_equ',
    libertadoresTotal: 4,
    libertadoresGrupos: 2,
    libertadoresPreFase2: 1,
    libertadoresPreFase1: 1,
    sulamericanaTotal: 4,
    sulamericanaGrupos: 0,
    sulamericanaPreliminar: 4,
    criteriaLibertadores:
      'Campeão e vice da LigaPro (Fase de Grupos); 3º colocado geral (Pré-Libertadores Fase 2); Campeão da Copa Ecuador (ou 4º da tabela) entra na Pré-Libertadores Fase 1.',
    criteriaSulamericana:
      'Os 4 melhores da tabela acumulada da LigaPro fora da Libertadores disputam a Fase Preliminar nacional (2 avançam aos grupos).',
  },
  {
    country: 'Paraguai',
    flagCode: 'PAR',
    flagEmoji: '🇵🇾',
    leagueId: 'liga_par',
    libertadoresTotal: 4,
    libertadoresGrupos: 2,
    libertadoresPreFase2: 1,
    libertadoresPreFase1: 1,
    sulamericanaTotal: 4,
    sulamericanaGrupos: 0,
    sulamericanaPreliminar: 4,
    criteriaLibertadores:
      'Campeão e vice da Primera División (Fase de Grupos); 3º da tabela anual fora campeões (Pré-Libertadores Fase 2); Campeão da Copa Paraguay (ou 4º da tabela) entra na Pré-Libertadores Fase 1.',
    criteriaSulamericana:
      'Os 4 melhores da tabela anual imediatamente abaixo dos classificados à Libertadores disputam a Fase Preliminar nacional (2 avançam aos grupos).',
  },
  {
    country: 'Peru',
    flagCode: 'PER',
    flagEmoji: '🇵🇪',
    leagueId: 'liga_per',
    libertadoresTotal: 4,
    libertadoresGrupos: 2,
    libertadoresPreFase2: 1,
    libertadoresPreFase1: 1,
    sulamericanaTotal: 4,
    sulamericanaGrupos: 0,
    sulamericanaPreliminar: 4,
    criteriaLibertadores:
      'Campeão e vice da Liga 1 (Fase de Grupos); 3º colocado da Liga 1 (Pré-Libertadores Fase 2); 4º colocado na classificação geral (Pré-Libertadores Fase 1).',
    criteriaSulamericana:
      '5º ao 8º colocado da tabela acumulada anual da Liga 1 disputam a Fase Preliminar nacional (2 avançam aos grupos).',
  },
  {
    country: 'Uruguai',
    flagCode: 'URU',
    flagEmoji: '🇺🇾',
    leagueId: 'liga_uru',
    libertadoresTotal: 4,
    libertadoresGrupos: 2,
    libertadoresPreFase2: 1,
    libertadoresPreFase1: 1,
    sulamericanaTotal: 4,
    sulamericanaGrupos: 0,
    sulamericanaPreliminar: 4,
    criteriaLibertadores:
      'Campeão e vice do Campeonato Uruguaio (Fase de Grupos); 3º melhor da Tabla Anual (Pré-Libertadores Fase 2); 4º melhor da Tabla Anual (Pré-Libertadores Fase 1).',
    criteriaSulamericana:
      '5º ao 8º melhor da Tabla Anual sem vaga na Libertadores disputam a Fase Preliminar nacional (2 avançam aos grupos).',
  },
  {
    country: 'Venezuela',
    flagCode: 'VEN',
    flagEmoji: '🇻🇪',
    leagueId: 'liga_ven',
    libertadoresTotal: 4,
    libertadoresGrupos: 2,
    libertadoresPreFase2: 1,
    libertadoresPreFase1: 1,
    sulamericanaTotal: 4,
    sulamericanaGrupos: 0,
    sulamericanaPreliminar: 4,
    criteriaLibertadores:
      'Campeão da Liga FUTVE + líder da tabela anual (Fase de Grupos); Vice-campeão / 3º colocado (Pré-Libertadores Fase 2); 4º da tabela anual (Pré-Libertadores Fase 1).',
    criteriaSulamericana:
      '5º ao 8º colocado da tabela acumulada anual sem vaga na Libertadores disputam a Fase Preliminar nacional (2 avançam aos grupos).',
  },
];

/**
 * Função auxiliar que resolve o vencedor de um duelo eliminatório preliminar
 * baseado no rating/força e reputação dos clubes.
 */
function resolveSimulatedKnockoutWinner(
  idA: string,
  idB: string,
  clubMap: Map<string, Club>,
  tieBreakerSeed: number = 0
): { winnerId: string; loserId: string } {
  const clubA = clubMap.get(idA);
  const clubB = clubMap.get(idB);

  const ratingA = clubA ? (clubA.reputation || 50) + (clubA.stadium?.capacity ? clubA.stadium.capacity / 1000 : 20) : 50;
  const ratingB = clubB ? (clubB.reputation || 50) + (clubB.stadium?.capacity ? clubB.stadium.capacity / 1000 : 20) : 50;

  // Adiciona variabilidade determinística por seed
  const modA = Math.sin(tieBreakerSeed * 17 + (idA.charCodeAt(0) || 0)) * 5;
  const modB = Math.cos(tieBreakerSeed * 13 + (idB.charCodeAt(0) || 0)) * 5;

  if (ratingA + modA >= ratingB + modB) {
    return { winnerId: idA, loserId: idB };
  }
  return { winnerId: idB, loserId: idA };
}

/**
 * Calcula o sistema oficial de classificação continental da CONMEBOL:
 * - 47 vagas da Copa Libertadores (28 Fase de Grupos direta + 19 Pré-Libertadores em Fases 1, 2 e 3).
 * - 44 vagas da Copa Sul-Americana (12 diretas nos grupos + 32 na Fase Preliminar nacional).
 * - Os 4 eliminados da Fase 3 da Pré-Libertadores completam os 32 da Fase de Grupos da Sul-Americana!
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
    libertadoresChampId,
    sulamericanaChampId,
    copaBrasilChampId,
    copaBrasilRunnerUpId,
    domesticCupChampions = {},
  } = params;

  const clubMap = new Map<string, Club>();
  clubs.forEach((c) => clubMap.set(c.id, c));

  // Mapa de copas nacionais por país
  const domesticCupByCountry: Record<string, string | undefined> = {
    Argentina: domesticCupChampions.sa_copa_argentina,
    Chile: domesticCupChampions.sa_copa_chile,
    'Colômbia': domesticCupChampions.sa_copa_colombia,
    Equador: domesticCupChampions.sa_copa_ecuador,
    Paraguai: domesticCupChampions.sa_copa_paraguay,
    Peru: domesticCupChampions.sa_copa_peru,
    Bolívia: domesticCupChampions.sa_copa_bolivia,
    Uruguai: domesticCupChampions.sa_copa_uruguay,
    Venezuela: domesticCupChampions.sa_copa_venezuela,
  };

  const byLeague: Partial<Record<CompetitionType, CountryContinentalSummary>> = {};
  const orderedCountries: CountryContinentalSummary[] = [];

  const allLibertadoresEntries: QualifiedClubEntry[] = [];
  const allSulamericanaEntries: QualifiedClubEntry[] = [];

  const preFase1Pool: Array<{ clubId: string; country: string }> = [];
  const preFase2DirectPool: Array<{ clubId: string; country: string }> = [];
  const directLibertadoresGroupPool: string[] = [];

  // Vagas continentais prioritárias da temporada anterior
  const titleHoldersAssigned = new Set<string>();
  if (libertadoresChampId && clubMap.has(libertadoresChampId)) {
    directLibertadoresGroupPool.push(libertadoresChampId);
    titleHoldersAssigned.add(libertadoresChampId);
  }
  if (sulamericanaChampId && clubMap.has(sulamericanaChampId) && !titleHoldersAssigned.has(sulamericanaChampId)) {
    directLibertadoresGroupPool.push(sulamericanaChampId);
    titleHoldersAssigned.add(sulamericanaChampId);
  }

  // Itera cada país configurado
  for (const cfg of CONMEBOL_COUNTRY_DISTRIBUTION_TABLE) {
    const isBrazil = cfg.country === 'Brasil';
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
    const countryLibGrupos: QualifiedClubEntry[] = [];
    const countryLibPreF2: QualifiedClubEntry[] = [];
    const countryLibPreF1: QualifiedClubEntry[] = [];
    const countrySulaGrupos: QualifiedClubEntry[] = [];
    const countrySulaPrelim: QualifiedClubEntry[] = [];

    const allocatedThisCountry = new Set<string>();

    // 1. Títulos continentais pertencentes a este país
    if (libertadoresChampId && !allocatedThisCountry.has(libertadoresChampId)) {
      const cObj = clubMap.get(libertadoresChampId);
      if (cObj && (cObj.country === cfg.country || (isBrazil && (!cObj.country || cObj.country === 'Brasil')))) {
        allocatedThisCountry.add(libertadoresChampId);
        const entry: QualifiedClubEntry = {
          clubId: libertadoresChampId,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: posMap.get(libertadoresChampId) || 0,
          competition: 'libertadores',
          stage: 'libertadores_grupos',
          stageName: 'Fase de Grupos',
          reason: 'Campeão da Libertadores',
        };
        countryLibClubs.push(entry);
        countryLibGrupos.push(entry);
      }
    }
    if (sulamericanaChampId && !allocatedThisCountry.has(sulamericanaChampId)) {
      const cObj = clubMap.get(sulamericanaChampId);
      if (cObj && (cObj.country === cfg.country || (isBrazil && (!cObj.country || cObj.country === 'Brasil')))) {
        allocatedThisCountry.add(sulamericanaChampId);
        const entry: QualifiedClubEntry = {
          clubId: sulamericanaChampId,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: posMap.get(sulamericanaChampId) || 0,
          competition: 'libertadores',
          stage: 'libertadores_grupos',
          stageName: 'Fase de Grupos',
          reason: 'Campeão da Sul-Americana',
        };
        countryLibClubs.push(entry);
        countryLibGrupos.push(entry);
      }
    }

    // 2. Regras de Copa Nacional
    const cupChampId = isBrazil ? copaBrasilChampId : domesticCupByCountry[cfg.country];

    if (isBrazil) {
      // BRASIL: 5 Grupos (G-4 + Copa do Brasil), 2 Pré F2 (5º + Vice Copa / 6º)
      if (cupChampId && clubMap.has(cupChampId)) {
        allocatedThisCountry.add(cupChampId);
        const entry: QualifiedClubEntry = {
          clubId: cupChampId,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: posMap.get(cupChampId) || 0,
          competition: 'libertadores',
          stage: 'libertadores_grupos',
          stageName: 'Fase de Grupos',
          reason: 'Campeão da Copa do Brasil',
        };
        countryLibClubs.push(entry);
        countryLibGrupos.push(entry);
        directLibertadoresGroupPool.push(cupChampId);
      }

      // Se campeão da Copa do Brasil terminou no G-4 da Série A, vice herda a vaga direta
      const cupChampPos = cupChampId ? posMap.get(cupChampId) || 99 : 99;
      const cupChampInG4 = cupChampPos <= 4;

      if (copaBrasilRunnerUpId && clubMap.has(copaBrasilRunnerUpId) && !allocatedThisCountry.has(copaBrasilRunnerUpId)) {
        allocatedThisCountry.add(copaBrasilRunnerUpId);
        if (cupChampInG4) {
          const entry: QualifiedClubEntry = {
            clubId: copaBrasilRunnerUpId,
            country: cfg.country,
            leagueId: cfg.leagueId,
            positionInLeague: posMap.get(copaBrasilRunnerUpId) || 0,
            competition: 'libertadores',
            stage: 'libertadores_grupos',
            stageName: 'Fase de Grupos',
            reason: 'Vice da Copa do Brasil',
          };
          countryLibClubs.push(entry);
          countryLibGrupos.push(entry);
          directLibertadoresGroupPool.push(copaBrasilRunnerUpId);
        } else {
          const entry: QualifiedClubEntry = {
            clubId: copaBrasilRunnerUpId,
            country: cfg.country,
            leagueId: cfg.leagueId,
            positionInLeague: posMap.get(copaBrasilRunnerUpId) || 0,
            competition: 'libertadores',
            stage: 'libertadores_pre_fase2',
            stageName: 'Pré-Libertadores (Fase 2)',
            reason: 'Vice da Copa do Brasil',
          };
          countryLibClubs.push(entry);
          countryLibPreF2.push(entry);
          preFase2DirectPool.push({ clubId: copaBrasilRunnerUpId, country: cfg.country });
        }
      }
    } else if (cfg.country === 'Argentina') {
      // ARGENTINA: Copa Argentina dá vaga direta na Fase de Grupos
      if (cupChampId && clubMap.has(cupChampId) && !allocatedThisCountry.has(cupChampId)) {
        allocatedThisCountry.add(cupChampId);
        const entry: QualifiedClubEntry = {
          clubId: cupChampId,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: posMap.get(cupChampId) || 0,
          competition: 'libertadores',
          stage: 'libertadores_grupos',
          stageName: 'Fase de Grupos',
          reason: 'Campeão da Copa Nacional',
        };
        countryLibClubs.push(entry);
        countryLibGrupos.push(entry);
        directLibertadoresGroupPool.push(cupChampId);
      }
    } else if (cfg.country === 'Chile') {
      // CHILE: Copa Chile dá vaga na Pré-Libertadores Fase 2
      if (cupChampId && clubMap.has(cupChampId) && !allocatedThisCountry.has(cupChampId)) {
        allocatedThisCountry.add(cupChampId);
        const entry: QualifiedClubEntry = {
          clubId: cupChampId,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: posMap.get(cupChampId) || 0,
          competition: 'libertadores',
          stage: 'libertadores_pre_fase2',
          stageName: 'Pré-Libertadores (Fase 2)',
          reason: 'Campeão da Copa Nacional',
        };
        countryLibClubs.push(entry);
        countryLibPreF2.push(entry);
        preFase2DirectPool.push({ clubId: cupChampId, country: cfg.country });
      }
    } else if (cfg.country === 'Colômbia') {
      // COLÔMBIA: Copa Colômbia dá vaga na Copa Sul-Americana (Fase Preliminar)
      if (cupChampId && clubMap.has(cupChampId) && !allocatedThisCountry.has(cupChampId)) {
        allocatedThisCountry.add(cupChampId);
        const entry: QualifiedClubEntry = {
          clubId: cupChampId,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: posMap.get(cupChampId) || 0,
          competition: 'sulamericana',
          stage: 'sulamericana_preliminar',
          stageName: 'Sul-Americana (Fase Preliminar)',
          reason: 'Campeão da Copa Nacional',
        };
        countrySulaClubs.push(entry);
        countrySulaPrelim.push(entry);
      }
    } else if (cfg.country === 'Equador' || cfg.country === 'Paraguai') {
      // EQUADOR e PARAGUAI: Copa Ecuador e Copa Paraguay dão vaga na Pré-Libertadores Fase 1
      if (cupChampId && clubMap.has(cupChampId) && !allocatedThisCountry.has(cupChampId)) {
        allocatedThisCountry.add(cupChampId);
        const entry: QualifiedClubEntry = {
          clubId: cupChampId,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: posMap.get(cupChampId) || 0,
          competition: 'libertadores',
          stage: 'libertadores_pre_fase1',
          stageName: 'Pré-Libertadores (Fase 1)',
          reason: 'Campeão da Copa Nacional',
        };
        countryLibClubs.push(entry);
        countryLibPreF1.push(entry);
        preFase1Pool.push({ clubId: cupChampId, country: cfg.country });
      }
    }

    // 3. Preenchimento pela Liga Nacional
    let effectiveLibDirectCutoff = 0;
    let effectiveLibPreCutoff = 0;
    let effectiveSulaCutoff = 0;

    for (let i = 0; i < leagueStandings.length; i++) {
      const cid = leagueStandings[i].teamId;
      if (allocatedThisCountry.has(cid)) continue;

      const pos = i + 1;

      // Aloca Vagas Diretas na Fase de Grupos da Libertadores
      if (countryLibGrupos.length < cfg.libertadoresGrupos) {
        allocatedThisCountry.add(cid);
        effectiveLibDirectCutoff = pos;
        effectiveLibPreCutoff = pos;
        const entry: QualifiedClubEntry = {
          clubId: cid,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: pos,
          competition: 'libertadores',
          stage: 'libertadores_grupos',
          stageName: 'Fase de Grupos',
          reason: pos === 1 ? 'Campeão Nacional' : pos === 2 ? 'Vice-Campeão Nacional' : 'Vaga Direta Liga',
        };
        countryLibClubs.push(entry);
        countryLibGrupos.push(entry);
        directLibertadoresGroupPool.push(cid);
        continue;
      }

      // Aloca Vagas na Pré-Libertadores Fase 2
      if (countryLibPreF2.length < cfg.libertadoresPreFase2) {
        allocatedThisCountry.add(cid);
        effectiveLibPreCutoff = pos;
        const entry: QualifiedClubEntry = {
          clubId: cid,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: pos,
          competition: 'libertadores',
          stage: 'libertadores_pre_fase2',
          stageName: 'Pré-Libertadores (Fase 2)',
          reason: 'Pré-Libertadores Liga',
        };
        countryLibClubs.push(entry);
        countryLibPreF2.push(entry);
        preFase2DirectPool.push({ clubId: cid, country: cfg.country });
        continue;
      }

      // Aloca Vagas na Pré-Libertadores Fase 1
      if (countryLibPreF1.length < cfg.libertadoresPreFase1) {
        allocatedThisCountry.add(cid);
        effectiveLibPreCutoff = pos;
        const entry: QualifiedClubEntry = {
          clubId: cid,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: pos,
          competition: 'libertadores',
          stage: 'libertadores_pre_fase1',
          stageName: 'Pré-Libertadores (Fase 1)',
          reason: 'Pré-Libertadores Liga',
        };
        countryLibClubs.push(entry);
        countryLibPreF1.push(entry);
        preFase1Pool.push({ clubId: cid, country: cfg.country });
        continue;
      }

      // Aloca Vagas na Sul-Americana (Fase de Grupos para BRA/ARG; Fase Preliminar para os outros 8)
      if (countrySulaClubs.length < cfg.sulamericanaTotal) {
        allocatedThisCountry.add(cid);
        effectiveSulaCutoff = pos;
        const stage: ConmebolEntryStage =
          cfg.sulamericanaGrupos > 0 ? 'sulamericana_grupos' : 'sulamericana_preliminar';
        const stageName =
          cfg.sulamericanaGrupos > 0 ? 'Sul-Americana (Fase de Grupos)' : 'Sul-Americana (Fase Preliminar)';
        const entry: QualifiedClubEntry = {
          clubId: cid,
          country: cfg.country,
          leagueId: cfg.leagueId,
          positionInLeague: pos,
          competition: 'sulamericana',
          stage,
          stageName,
          reason: 'Sul-Americana Liga',
        };
        countrySulaClubs.push(entry);
        if (cfg.sulamericanaGrupos > 0) {
          countrySulaGrupos.push(entry);
        } else {
          countrySulaPrelim.push(entry);
        }
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
      leagueName: isBrazil ? 'Brasileirão Série A' : SOUTH_AMERICAN_LEAGUES_META[cfg.leagueId as SouthAmericanLeagueId]?.name || cfg.country,
      totalLibertadoresBerths: cfg.libertadoresTotal,
      libertadoresDirectBerths: cfg.libertadoresGrupos,
      libertadoresPhase2Berths: cfg.libertadoresPreFase2,
      libertadoresPhase1Berths: cfg.libertadoresPreFase1,
      totalSulamericanaBerths: cfg.sulamericanaTotal,
      sulamericanaDirectBerths: cfg.sulamericanaGrupos,
      sulamericanaPreliminaryBerths: cfg.sulamericanaPreliminar,
      effectiveLibertadoresDirectCutoff: effectiveLibDirectCutoff,
      effectiveLibertadoresPreCutoff: effectiveLibPreCutoff,
      effectiveSulamericanaCutoff: effectiveSulaCutoff,
      libertadoresClubs: countryLibClubs,
      sulamericanaClubs: countrySulaClubs,
      libertadoresGrupos: countryLibGrupos,
      libertadoresPreFase2: countryLibPreF2,
      libertadoresPreFase1: countryLibPreF1,
      sulamericanaGrupos: countrySulaGrupos,
      sulamericanaPreliminar: countrySulaPrelim,
      baseLibertadoresBerths: cfg.libertadoresTotal,
      baseSulamericanaBerths: cfg.sulamericanaTotal,
      effectiveLibertadoresPositionCutoff: effectiveLibPreCutoff || effectiveLibDirectCutoff,
      effectiveSulamericanaPositionCutoff: effectiveSulaCutoff,
      criteriaLibertadores: cfg.criteriaLibertadores,
      criteriaSulamericana: cfg.criteriaSulamericana,
    };

    byLeague[cfg.leagueId] = summary;
    orderedCountries.push(summary);
  }

  // ==============================================================
  // 4. SIMULAÇÃO DAS ETAPAS PRELIMINARES DA CONMEBOL
  // ==============================================================

  // A. PRÉ-LIBERTADORES FASE 1 (6 equipes: 1 de cada país: BOL, EQU, PAR, PER, URU, VEN) -> 3 avançam
  const fase1TeamIds = preFase1Pool.map((p) => p.clubId);
  while (fase1TeamIds.length < 6) {
    const fallback = clubs.find((c) => !fase1TeamIds.includes(c.id));
    if (fallback) fase1TeamIds.push(fallback.id);
    else break;
  }
  const fase1Winners: string[] = [];
  for (let i = 0; i < 3; i++) {
    const tA = fase1TeamIds[i * 2];
    const tB = fase1TeamIds[i * 2 + 1];
    if (tA && tB) {
      const { winnerId } = resolveSimulatedKnockoutWinner(tA, tB, clubMap, i + 1);
      fase1Winners.push(winnerId);
    } else if (tA) {
      fase1Winners.push(tA);
    }
  }

  // B. PRÉ-LIBERTADORES FASE 2 (16 equipes: 3 da Fase 1 + 13 que entram direto) -> 8 avançam
  const fase2TeamIds = [...fase1Winners, ...preFase2DirectPool.map((p) => p.clubId)];
  while (fase2TeamIds.length < 16) {
    const fallback = clubs.find((c) => !fase2TeamIds.includes(c.id));
    if (fallback) fase2TeamIds.push(fallback.id);
    else break;
  }
  const fase2Winners: string[] = [];
  for (let i = 0; i < 8; i++) {
    const tA = fase2TeamIds[i * 2];
    const tB = fase2TeamIds[i * 2 + 1];
    if (tA && tB) {
      const { winnerId } = resolveSimulatedKnockoutWinner(tA, tB, clubMap, 10 + i);
      fase2Winners.push(winnerId);
    } else if (tA) {
      fase2Winners.push(tA);
    }
  }

  // C. PRÉ-LIBERTADORES FASE 3 (8 equipes em 4 confrontos):
  // - Os 4 vencedores entram na Fase de Grupos da Copa Libertadores!
  // - Os 4 eliminados vão diretamente para a Fase de Grupos da Copa Sul-Americana!
  const fase3Winners: string[] = [];
  const preLibPhase3EliminatedIds: string[] = [];

  for (let i = 0; i < 4; i++) {
    const tA = fase2Winners[i * 2];
    const tB = fase2Winners[i * 2 + 1];
    if (tA && tB) {
      const { winnerId, loserId } = resolveSimulatedKnockoutWinner(tA, tB, clubMap, 20 + i);
      fase3Winners.push(winnerId);
      preLibPhase3EliminatedIds.push(loserId);
    } else if (tA) {
      fase3Winners.push(tA);
    }
  }

  // D. FASE DE GRUPOS DA LIBERTADORES (Exatos 32 clubes: 28 diretos + 4 vencedores Fase 3)
  const finalLibertadores32Ids = Array.from(
    new Set([...directLibertadoresGroupPool, ...fase3Winners])
  );
  // Fallback se necessário até 32
  if (finalLibertadores32Ids.length < 32) {
    for (const entry of allLibertadoresEntries) {
      if (!finalLibertadores32Ids.includes(entry.clubId)) {
        finalLibertadores32Ids.push(entry.clubId);
        if (finalLibertadores32Ids.length >= 32) break;
      }
    }
  }

  // E. FASE PRELIMINAR DA SUL-AMERICANA (32 clubes: 4 de cada um dos 8 países fora BRA e ARG)
  // Cada país disputa 2 duelos nacionais em jogo único -> 2 avançam por país (16 classificados no total)
  const sulamericanaPrelimWinners: string[] = [];
  for (const countrySummary of orderedCountries) {
    if (countrySummary.country === 'Brasil' || countrySummary.country === 'Argentina') {
      continue;
    }
    const countryPrelim = countrySummary.sulamericanaPreliminar.map((e) => e.clubId);
    if (countryPrelim.length >= 4) {
      const { winnerId: w1 } = resolveSimulatedKnockoutWinner(countryPrelim[0], countryPrelim[3], clubMap, 30);
      const { winnerId: w2 } = resolveSimulatedKnockoutWinner(countryPrelim[1], countryPrelim[2], clubMap, 31);
      sulamericanaPrelimWinners.push(w1, w2);
    } else {
      sulamericanaPrelimWinners.push(...countryPrelim.slice(0, 2));
    }
  }

  // F. FASE DE GRUPOS DA SUL-AMERICANA (Exatos 32 clubes):
  // 6 do Brasil + 6 da Argentina + 4 eliminados da Fase 3 da Pré-Libertadores + 16 vencedores da Fase Preliminar nacional!
  const brazilSulaIds = (byLeague.serie_a?.sulamericanaGrupos || []).map((e) => e.clubId);
  const argSulaIds = (byLeague.liga_arg?.sulamericanaGrupos || []).map((e) => e.clubId);

  const finalSulamericana32Ids = Array.from(
    new Set([
      ...brazilSulaIds,
      ...argSulaIds,
      ...preLibPhase3EliminatedIds,
      ...sulamericanaPrelimWinners,
    ])
  );

  // Fallback se necessário até 32
  if (finalSulamericana32Ids.length < 32) {
    for (const entry of allSulamericanaEntries) {
      if (!finalSulamericana32Ids.includes(entry.clubId) && !finalLibertadores32Ids.includes(entry.clubId)) {
        finalSulamericana32Ids.push(entry.clubId);
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
    const isTransferredFromLib = preLibPhase3EliminatedIds.includes(id);
    const cObj = clubMap.get(id);
    return {
      clubId: id,
      country: cObj?.country || 'Brasil',
      leagueId: (getClubSouthAmericanLeagueId(cObj) || 'serie_a') as CompetitionType,
      positionInLeague: 0,
      competition: 'sulamericana' as const,
      stage: 'sulamericana_grupos' as ConmebolEntryStage,
      stageName: 'Sul-Americana (Fase de Grupos)',
      reason: isTransferredFromLib
        ? ('Classificado Fase 3 (Repescagem)' as const)
        : ('Vaga Direta Liga' as const),
    };
  });

  return {
    libertadoresIds: finalLibertadores32Ids.slice(0, 32),
    sulamericanaIds: finalSulamericana32Ids.slice(0, 32),
    libertadoresEntries: libertadoresEntriesFinal,
    sulamericanaEntries: sulamericanaEntriesFinal,
    allLibertadoresEntries,
    allSulamericanaEntries,
    preLibertadoresPhase3EliminatedIds: preLibPhase3EliminatedIds,
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

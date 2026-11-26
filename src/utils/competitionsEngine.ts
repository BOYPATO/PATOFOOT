import {
  Club,
  CompetitionType,
  Fixture,
  Standing,
  WorldLeagueId,
  SouthAmericanCupId,
  SouthAmericanLeagueId,
} from '../types/game';
import {
  assignVariedMatchDaySlot,
  getSupercopaDate,
  getRecopaDates,
  getMidweekCupDate,
  getSeasonStartDate,
  getEstadualTournamentScheduleDates,
  getCopaNordesteScheduleDates,
  getContinentalFinalDates,
  getRoundDate,
  getSerieDScheduleDates,
  getCopaBrasilScheduleDates,
  getConmebolContinentalScheduleDates,
  getUefaCompetitionCalendarDates,
  addDays,
  isDateInFifaPause,
} from './calendarUtils';
import {
  ESTADUAIS_2026_CONFIG,
  EstadualCompetitionConfig,
} from '../data/estaduais2026Config';
import {
  seedContinentalGroupsWithCountryProtection,
  SOUTH_AMERICAN_LEAGUES_META,
} from './southAmericaLeaguesEngine';
import {
  computeUefaContinentalQualifiers,
  EUROPEAN_LEAGUES_META,
  INITIAL_CHAMPIONS_LEAGUE_CLUB_IDS,
  INITIAL_EUROPA_LEAGUE_CLUB_IDS,
  INITIAL_CONFERENCE_LEAGUE_CLUB_IDS,
  seedUefa36ClubsByCoefficient,
} from './europeLeaguesEngine';
import {
  computeWorldInternationalQualifiers,
  WORLD_LEAGUES_META,
} from './worldLeaguesEngine';

import { SOCCERWIKI_COMPETITION_LOGOS } from './soccerWikiBrazilEngine';
import { SOCCERWIKI_ENGLAND_COMPETITION_LOGOS } from './soccerWikiEnglandEngine';

export interface CompetitionMeta {
  id: CompetitionType;
  name: string;
  shortName: string;
  description: string;
  badgeEmoji: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  isCup: boolean;
  category:
    | 'national'
    | 'south_america'
    | 'continental'
    | 'europe'
    | 'uefa_continental'
    | 'world_league'
    | 'world_continental'
    | 'state'
    | 'world';
  officialClubsCount: number;
  formatSummary: string;
}

export const COMPETITIONS_CATALOG: Record<CompetitionType, CompetitionMeta> = {
  serie_a: {
    id: 'serie_a',
    name: 'Campeonato Brasileiro Série A',
    shortName: 'Série A',
    description:
      'A elite nacional com os 20 clubes oficiais de 2026 em 38 rodadas de turno e returno. G-6 vai à Libertadores e Z-4 cai para a Série B.',
    badgeEmoji: '🏆',
    logoUrl: SOCCERWIKI_COMPETITION_LOGOS.serie_a,
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    isCup: false,
    category: 'national',
    officialClubsCount: 20,
    formatSummary: '20 clubes · 38 rodadas · Pontos corridos',
  },
  serie_b: {
    id: 'serie_b',
    name: 'Campeonato Brasileiro Série B',
    shortName: 'Série B',
    description:
      'Os 20 clubes da segunda divisão nacional em 38 rodadas de pontos corridos. Os 4 primeiros sobem à Série A e os 4 últimos caem à Série C.',
    badgeEmoji: '🥈',
    logoUrl: SOCCERWIKI_COMPETITION_LOGOS.serie_b,
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
    isCup: false,
    category: 'national',
    officialClubsCount: 20,
    formatSummary: '20 clubes · 38 rodadas · G-4 sobe à Série A',
  },
  serie_c: {
    id: 'serie_c',
    name: 'Campeonato Brasileiro Série C',
    shortName: 'Série C',
    description:
      'Regulamento 2027 com 24 clubes em turno e returno (46 rodadas até novembro). Os 3 primeiros sobem direto à Série B, do 4º ao 7º disputam Playoff de Acesso (4ºx7º e 5ºx6º ida e volta + Final em jogo único) pela 4ª vaga e os 4 últimos (21º–24º) caem à Série D.',
    badgeEmoji: '🥉',
    logoUrl: SOCCERWIKI_COMPETITION_LOGOS.serie_c,
    primaryColor: '#8b5cf6',
    secondaryColor: '#6d28d9',
    isCup: false,
    category: 'national',
    officialClubsCount: 24,
    formatSummary: '24 clubes · 46 rodadas · 1º–3º Acesso Direto · 4º–7º Playoff · Z-4 cai à Série D',
  },
  serie_d: {
    id: 'serie_d',
    name: 'Campeonato Brasileiro Série D',
    shortName: 'Série D',
    description:
      'Regulamento oficial CBF 2027 com 96 clubes em 16 grupos regionalizados de 6 equipes (A01–A16, máx. 3 por estado), cruzamento olímpico na 2ª fase, re-ranqueamento geral nas Quartas e Semis, 4 acessos à Série C e campeão direto na 3ª fase da Copa do Brasil!',
    badgeEmoji: '🏅',
    logoUrl: SOCCERWIKI_COMPETITION_LOGOS.serie_d,
    primaryColor: '#f43f5e',
    secondaryColor: '#be123c',
    isCup: true,
    category: 'national',
    officialClubsCount: 96,
    formatSummary: '96 clubes · 16 grupos regionalizados (máx. 3/UF) · 64 no Mata-Mata · 4 acessos',
  },
  copa_brasil: {
    id: 'copa_brasil',
    name: 'Copa do Brasil',
    shortName: 'Copa do Brasil',
    description:
      'Regulamento oficial CBF 2026 com 126 clubes em 9 fases eliminatórias! Os 20 clubes da Série A estreiam na 5ª Fase e a Grande Final é decidida em jogo único.',
    badgeEmoji: '🇧🇷',
    logoUrl: SOCCERWIKI_COMPETITION_LOGOS.copa_brasil,
    primaryColor: '#10b981',
    secondaryColor: '#047857',
    isCup: true,
    category: 'national',
    officialClubsCount: 126,
    formatSummary: '126 clubes · 9 fases · Final em jogo único',
  },
  libertadores: {
    id: 'libertadores',
    name: 'CONMEBOL Libertadores',
    shortName: 'Libertadores',
    description:
      'A Glória Eterna com os 32 clubes da Fase de Grupos 2026 distribuídos em 8 grupos (A–H), seguidos de Oitavas, Quartas, Semifinal e Final Única.',
    badgeEmoji: '🌎',
    primaryColor: '#eab308',
    secondaryColor: '#ca8a04',
    isCup: true,
    category: 'continental',
    officialClubsCount: 32,
    formatSummary: '32 clubes · 8 grupos (A–H) + Mata-Mata',
  },
  sulamericana: {
    id: 'sulamericana',
    name: 'CONMEBOL Sul-Americana',
    shortName: 'Sul-Americana',
    description:
      'A Grande Conquista com 32 clubes sul-americanos em 8 grupos (A–H), avançando às Oitavas, Quartas, Semifinal e Final em campo neutro.',
    badgeEmoji: '🌐',
    primaryColor: '#06b6d4',
    secondaryColor: '#0891b2',
    isCup: true,
    category: 'continental',
    officialClubsCount: 32,
    formatSummary: '32 clubes · 8 grupos (A–H) + Mata-Mata',
  },
  supercopa_brasil: {
    id: 'supercopa_brasil',
    name: 'Supercopa do Brasil',
    shortName: 'Supercopa',
    description:
      'Abertura oficial dos troféus nacionais em jogo único entre o Campeão do Brasileirão Série A e o Campeão da Copa do Brasil.',
    badgeEmoji: '⭐',
    primaryColor: '#facc15',
    secondaryColor: '#ca8a04',
    isCup: true,
    category: 'national',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Jogo único em campo neutro',
  },
  recopa_sulamericana: {
    id: 'recopa_sulamericana',
    name: 'CONMEBOL Recopa',
    shortName: 'Recopa',
    description:
      'Duelo continental de campeões em Fevereiro! Finais em ida e volta entre o Campeão da Libertadores e o Campeão da Sul-Americana.',
    badgeEmoji: '🔱',
    primaryColor: '#fb923c',
    secondaryColor: '#ea580c',
    isCup: true,
    category: 'continental',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Final em ida e volta',
  },
  estadual: {
    id: 'estadual',
    name: 'Campeonatos Estaduais (27 UFs)',
    shortName: 'Estaduais',
    description:
      'Todos os 27 Campeonatos Estaduais oficiais do Brasil em 2026 (Paulistão, Carioca, Mineiro, Gaúcho, Baiano, Pernambucano, Cearense, Potiguar, Paranaense, Catarinense, Goiano, Paraense e todas as 27 Federações) com formatos reais e distribuição oficial de vagas para Série D, Copa do Brasil, Copa do Nordeste e Copa Verde!',
    badgeEmoji: '🏛️',
    logoUrl: SOCCERWIKI_COMPETITION_LOGOS.estadual,
    primaryColor: '#14b8a6',
    secondaryColor: '#0f766e',
    isCup: true,
    category: 'state',
    officialClubsCount: 278,
    formatSummary:
      '27 Campeonatos Estaduais Oficiais 2026 · Formatos Reais + Vagas Série D, Copa do Brasil, Nordeste e Verde',
  },
  copa_nordeste: {
    id: 'copa_nordeste',
    name: 'Copa do Nordeste',
    shortName: 'Copa do Nordeste',
    description:
      'A tradicional Lampions League reunindo os 16 clubes classificados dos 9 Campeonatos Estaduais nordestinos (BA, PE, CE, AL, RN, MA, PB, SE e PI)! Dois grupos de 8 clubes em 7 rodadas seguidos de Quartas de Final, Semifinal e Grande Final em ida e volta, valendo vaga direta na 3ª Fase da Copa do Brasil.',
    badgeEmoji: '🌵',
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
    isCup: true,
    category: 'state',
    officialClubsCount: 16,
    formatSummary: '16 clubes (9 Estados do NE) · 2 grupos de 8 + Quartas, Semifinal e Final',
  },
  copa_verde: {
    id: 'copa_verde',
    name: 'Copa Verde',
    shortName: 'Copa Verde',
    description:
      'Copa regional oficial da CBF reunindo 16 clubes classificados pelos Estaduais do Norte (PA, AM, TO, AC, RO, RR, AP), Centro-Oeste (GO, MT, DF, MS) e Espírito Santo (ES)! Grupo Norte (8 clubes) e Grupo Centro-Oeste (8 clubes) em 7 rodadas + Quartas, Semifinal e Final em ida e volta, valendo vaga na 3ª Fase da Copa do Brasil.',
    badgeEmoji: '🌿',
    primaryColor: '#10b981',
    secondaryColor: '#047857',
    isCup: true,
    category: 'state',
    officialClubsCount: 16,
    formatSummary: '16 clubes (Norte, Centro-Oeste e ES) · 2 blocos de 8 + Mata-Mata',
  },
  intercontinental: {
    id: 'intercontinental',
    name: 'Copa Intercontinental FIFA (Mundial de Clubes)',
    shortName: 'Mundial de Clubes',
    description:
      'Decisão mundial em Dezembro no Catar reunindo os campeões de todos os continentes! Quartas de Final (Dérbi das Américas entre CONMEBOL e CONCACAF + Copa África-Ásia-Eurásia), Semifinal (Copa Challenger FIFA) e Grande Final em Lusail contra o Campeão da UEFA Champions League.',
    badgeEmoji: '🌍',
    primaryColor: '#38bdf8',
    secondaryColor: '#f59e0b',
    isCup: true,
    category: 'world',
    officialClubsCount: 5,
    formatSummary: '5 campeões continentais · Quartas + Copa Challenger + Final em Lusail',
  },
  super_mundial_clubes: {
    id: 'super_mundial_clubes',
    name: 'Super Mundial de Clubes FIFA (32 Clubes)',
    shortName: 'Super Mundial FIFA',
    description:
      'O grande torneio mundial quadrienal da FIFA (de 4 em 4 anos: 2029, 2033, 2037...) reunindo 32 clubes de todos os continentes: 12 da Europa (UEFA), 6 da América do Sul/Brasil (CONMEBOL), 4 da América do Norte (EUA/México), 4 da Ásia/Arábia/Japão/Rússia, 4 da África (Egito/Marrocos) e 2 convidados FIFA em 8 grupos (A–H) + Mata-Mata até a Grande Final!',
    badgeEmoji: '🏆',
    primaryColor: '#f59e0b',
    secondaryColor: '#38bdf8',
    isCup: true,
    category: 'world',
    officialClubsCount: 32,
    formatSummary: '32 clubes · 8 grupos (A–H) + Oitavas, Quartas, Semifinal e Final (4 em 4 anos)',
  },
  uefa_supercup: {
    id: 'uefa_supercup',
    name: 'Supercopa da UEFA (UEFA Super Cup)',
    shortName: 'Supercopa UEFA',
    description:
      'Decisão em partida única em campo neutro na abertura da temporada europeia (agosto), reunindo o campeão da UEFA Champions League contra o campeão da UEFA Europa League. Tempo regulamentar de 90 minutos sem prorrogação (empate vai direto para os pênaltis). Cada clube relaciona 23 atletas (11 titulares e 12 no banco) com até 5 substituições. Premiação UEFA: € 5 milhões (R$ 31M) ao campeão e € 4 milhões (R$ 24,8M) ao vice.',
    badgeEmoji: '🌟',
    primaryColor: '#0ea5e9',
    secondaryColor: '#0284c7',
    isCup: true,
    category: 'uefa_continental',
    officialClubsCount: 2,
    formatSummary:
      '2 campeões · Jogo único (campo neutro) · 90 min → Pênaltis · 23 atletas / 5 subs · € 5M / € 4M',
  },
  liga_arg: {
    id: 'liga_arg',
    name: 'Liga Profesional Argentina (AFA)',
    shortName: 'Liga Argentina',
    description:
      'A primeira divisão oficial da Argentina (AFA) com 20 clubes em 38 rodadas. Os 5 primeiros garantem vaga na CONMEBOL Libertadores e do 6º ao 11º classificam-se para a CONMEBOL Sul-Americana.',
    badgeEmoji: '🇦🇷',
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    isCup: false,
    category: 'south_america',
    officialClubsCount: 20,
    formatSummary: '20 clubes · 38 rodadas · G-5 Libertadores / 6º–11º Sul-Americana',
  },
  liga_col: {
    id: 'liga_col',
    name: 'Liga BetPlay Dimayor (Colômbia)',
    shortName: 'Liga Colômbia',
    description:
      'A primeira divisão colombiana (FCF / Dimayor) com 20 clubes em 38 rodadas acumuladas. G-3 vai à CONMEBOL Libertadores e do 4º ao 6º vai à CONMEBOL Sul-Americana.',
    badgeEmoji: '🇨🇴',
    primaryColor: '#facc15',
    secondaryColor: '#1d4ed8',
    isCup: false,
    category: 'south_america',
    officialClubsCount: 20,
    formatSummary: '20 clubes · 38 rodadas · G-3 Libertadores / 4º–6º Sul-Americana',
  },
  liga_uru: {
    id: 'liga_uru',
    name: 'Campeonato Uruguayo Primera División',
    shortName: 'Liga Uruguai',
    description:
      'A elite uruguaia (AUF) com 16 clubes na Tabla Anual de 30 rodadas. G-3 classifica-se para a CONMEBOL Libertadores e do 4º ao 6º disputa a CONMEBOL Sul-Americana.',
    badgeEmoji: '🇺🇾',
    primaryColor: '#60a5fa',
    secondaryColor: '#1e3a8a',
    isCup: false,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · 30 rodadas · G-3 Libertadores / 4º–6º Sul-Americana',
  },
  liga_equ: {
    id: 'liga_equ',
    name: 'LigaPro Ecuabet Serie A (Equador)',
    shortName: 'Liga Equador',
    description:
      'A primeira divisão equatoriana (FEF / LigaPro) com 16 clubes em 30 rodadas. G-3 conquista vaga na CONMEBOL Libertadores e do 4º ao 6º avança à CONMEBOL Sul-Americana.',
    badgeEmoji: '🇪🇨',
    primaryColor: '#fbbf24',
    secondaryColor: '#1e40af',
    isCup: false,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · 30 rodadas · G-3 Libertadores / 4º–6º Sul-Americana',
  },
  liga_chi: {
    id: 'liga_chi',
    name: 'Campeonato Nacional Primera División (Chile)',
    shortName: 'Liga Chile',
    description:
      'A elite chilena (ANFP) com 16 clubes em 30 rodadas de pontos corridos. G-3 carimba vaga na CONMEBOL Libertadores e do 4º ao 6º vai à CONMEBOL Sul-Americana.',
    badgeEmoji: '🇨🇱',
    primaryColor: '#ef4444',
    secondaryColor: '#1d4ed8',
    isCup: false,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · 30 rodadas · G-3 Libertadores / 4º–6º Sul-Americana',
  },
  liga_par: {
    id: 'liga_par',
    name: 'Copa de Primera APF (Paraguai)',
    shortName: 'Liga Paraguai',
    description:
      'A tradicional elite paraguaia (APF) com 12 clubes em 22 rodadas. G-3 vai à CONMEBOL Libertadores e 4º e 5º disputam a CONMEBOL Sul-Americana.',
    badgeEmoji: '🇵🇾',
    primaryColor: '#f87171',
    secondaryColor: '#1e40af',
    isCup: false,
    category: 'south_america',
    officialClubsCount: 12,
    formatSummary: '12 clubes · 22 rodadas · G-3 Libertadores / 4º–5º Sul-Americana',
  },
  liga_per: {
    id: 'liga_per',
    name: 'Liga 1 Te Apuesto (Peru)',
    shortName: 'Liga Peru',
    description:
      'O campeonato nacional peruano (FPF) com 18 clubes em 34 rodadas acumuladas. Campeão e vice vão à CONMEBOL Libertadores e 3º e 4º à CONMEBOL Sul-Americana.',
    badgeEmoji: '🇵🇪',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    isCup: false,
    category: 'south_america',
    officialClubsCount: 18,
    formatSummary: '18 clubes · 34 rodadas · G-2 Libertadores / 3º–4º Sul-Americana',
  },
  liga_bol: {
    id: 'liga_bol',
    name: 'División Profesional Boliviana (FBF)',
    shortName: 'Liga Bolívia',
    description:
      'A liga nacional da Bolívia (FBF) com 16 clubes em 30 rodadas entre altitude e planície. G-2 vai à CONMEBOL Libertadores e 3º e 4º à CONMEBOL Sul-Americana.',
    badgeEmoji: '🇧🇴',
    primaryColor: '#16a34a',
    secondaryColor: '#eab308',
    isCup: false,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · 30 rodadas · G-2 Libertadores / 3º–4º Sul-Americana',
  },
  liga_ven: {
    id: 'liga_ven',
    name: 'Liga FUTVE Primera División (Venezuela)',
    shortName: 'Liga Venezuela',
    description:
      'A primeira divisão venezuelana (FVF / Liga FUTVE) com 14 clubes em 26 rodadas. G-2 garante vaga na CONMEBOL Libertadores e 3º e 4º disputam a CONMEBOL Sul-Americana.',
    badgeEmoji: '🇻🇪',
    primaryColor: '#9f1239',
    secondaryColor: '#facc15',
    isCup: false,
    category: 'south_america',
    officialClubsCount: 14,
    formatSummary: '14 clubes · 26 rodadas · G-2 Libertadores / 3º–4º Sul-Americana',
  },
  champions_league: {
    id: 'champions_league',
    name: 'UEFA Champions League',
    shortName: 'Champions League',
    description:
      'Formato oficial atual de Fase de Liga com 36 clubes em tabela única! Cada clube disputa 8 rodadas contra 8 adversários diferentes (4 em casa e 4 fora, 2 de cada Pote 1–4). Do 1º ao 8º avançam direto às Oitavas; do 9º ao 24º disputam os Playoffs de Ida e Volta; do 25º ao 36º são eliminados. Final única em Budapeste e vaga na Copa Intercontinental.',
    badgeEmoji: '⭐',
    primaryColor: '#2563eb',
    secondaryColor: '#1e1b4b',
    isCup: true,
    category: 'uefa_continental',
    officialClubsCount: 36,
    formatSummary: '36 clubes · Fase de Liga (8 rodadas) + Playoffs (9º–24º) + Mata-Mata',
  },
  europa_league: {
    id: 'europa_league',
    name: 'UEFA Europa League',
    shortName: 'Europa League',
    description:
      'Formato oficial atual de Fase de Liga com 36 clubes em tabela única! São 8 rodadas contra 8 adversários distintos (4 em casa e 4 fora, 2 de cada Pote 1–4). Top 8 avança direto às Oitavas, 9º ao 24º jogam os Playoffs eliminatórios e 25º ao 36º são eliminados. Grande Final em Istambul valendo vaga direta na próxima Champions League!',
    badgeEmoji: '🔶',
    primaryColor: '#f97316',
    secondaryColor: '#c2410c',
    isCup: true,
    category: 'uefa_continental',
    officialClubsCount: 36,
    formatSummary: '36 clubes · Fase de Liga (8 rodadas) + Playoffs (9º–24º) + Mata-Mata',
  },
  conference_league: {
    id: 'conference_league',
    name: 'UEFA Conference League',
    shortName: 'Conference League',
    description:
      'Formato oficial atual de Fase de Liga com 36 clubes em tabela única! Cada equipe disputa 6 rodadas contra 6 adversários diferentes (3 em casa e 3 fora, 1 de cada Pote 1–6). Top 8 vai direto às Oitavas, 9º ao 24º disputam os Playoffs de Ida e Volta e 25º ao 36º são eliminados. Final única em Leipzig valendo vaga na próxima Europa League.',
    badgeEmoji: '🟢',
    primaryColor: '#10b981',
    secondaryColor: '#047857',
    isCup: true,
    category: 'uefa_continental',
    officialClubsCount: 36,
    formatSummary: '36 clubes · Fase de Liga (6 rodadas) + Playoffs (9º–24º) + Mata-Mata',
  },
  eng_premier: {
    id: 'eng_premier',
    name: EUROPEAN_LEAGUES_META.eng_premier.name,
    shortName: EUROPEAN_LEAGUES_META.eng_premier.shortName,
    description: EUROPEAN_LEAGUES_META.eng_premier.formatSummary,
    badgeEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    logoUrl: SOCCERWIKI_ENGLAND_COMPETITION_LOGOS.eng_premier,
    primaryColor: EUROPEAN_LEAGUES_META.eng_premier.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.eng_premier.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 20,
    formatSummary: '20 clubes · 38 rodadas · G-4 Champions / 5º Europa League (+ FA Cup) / 6º Conference',
  },
  eng_championship: {
    id: 'eng_championship',
    name: EUROPEAN_LEAGUES_META.eng_championship.name,
    shortName: EUROPEAN_LEAGUES_META.eng_championship.shortName,
    description: EUROPEAN_LEAGUES_META.eng_championship.formatSummary,
    badgeEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    logoUrl: SOCCERWIKI_ENGLAND_COMPETITION_LOGOS.eng_championship,
    primaryColor: EUROPEAN_LEAGUES_META.eng_championship.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.eng_championship.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 24,
    formatSummary:
      '24 clubes · 46 rodadas · Top 2 sobem direto · 3º ao 8º nos Playoffs (R1 jogo único, Semis Ida/Volta e Final única) · Z-3 rebaixamento',
  },
  eng_league_one: {
    id: 'eng_league_one',
    name: EUROPEAN_LEAGUES_META.eng_league_one.name,
    shortName: EUROPEAN_LEAGUES_META.eng_league_one.shortName,
    description: EUROPEAN_LEAGUES_META.eng_league_one.formatSummary,
    badgeEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    logoUrl: SOCCERWIKI_ENGLAND_COMPETITION_LOGOS.eng_league_one,
    primaryColor: EUROPEAN_LEAGUES_META.eng_league_one.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.eng_league_one.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 24,
    formatSummary:
      '24 clubes · 46 rodadas · Top 2 sobem direto · 3º ao 6º nos Playoffs (Ida/Volta e Final única) · Z-4 rebaixamento',
  },
  eng_league_two: {
    id: 'eng_league_two',
    name: EUROPEAN_LEAGUES_META.eng_league_two.name,
    shortName: EUROPEAN_LEAGUES_META.eng_league_two.shortName,
    description: EUROPEAN_LEAGUES_META.eng_league_two.formatSummary,
    badgeEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    logoUrl: SOCCERWIKI_ENGLAND_COMPETITION_LOGOS.eng_league_two,
    primaryColor: EUROPEAN_LEAGUES_META.eng_league_two.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.eng_league_two.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 24,
    formatSummary:
      '24 clubes · 46 rodadas · Top 3 sobem direto · 4º ao 7º nos Playoffs (Ida/Volta e Final única) · Z-2 rebaixamento',
  },
  eng_community_shield: {
    id: 'eng_community_shield',
    name: 'FA Community Shield (Supercopa da Inglaterra)',
    shortName: 'Community Shield',
    description:
      'A tradicional Supercopa inglesa disputada em Agosto no lendário Wembley Stadium (Londres) reunindo o Campeão da Premier League e o Campeão da Emirates FA Cup em jogo único decisivo!',
    badgeEmoji: '🛡️',
    logoUrl: SOCCERWIKI_ENGLAND_COMPETITION_LOGOS.community_shield,
    primaryColor: '#dc2626',
    secondaryColor: '#1e3a8a',
    isCup: true,
    category: 'europe',
    officialClubsCount: 2,
    formatSummary: '2 campeões · Decisão em Jogo Único no Wembley Stadium (Londres)',
  },
  eng_efl_cup: {
    id: 'eng_efl_cup',
    name: 'Carabao Cup (EFL Cup / Copa da Liga Inglesa)',
    shortName: 'Carabao Cup',
    description:
      'A vibrante Copa da Liga Inglesa reunindo todos os 92 clubes das 4 divisões da pirâmide profissional inglesa! Fases eliminatórias em jogo único, semifinais eletrizantes em ida e volta em Janeiro e a Grande Final no lendário Wembley Stadium em Fevereiro.',
    badgeEmoji: '🏆',
    logoUrl: SOCCERWIKI_ENGLAND_COMPETITION_LOGOS.efl_cup,
    primaryColor: '#059669',
    secondaryColor: '#047857',
    isCup: true,
    category: 'europe',
    officialClubsCount: 92,
    formatSummary:
      '92 clubes · Mata-Mata jogo único + Semifinais em Ida e Volta + Final em Wembley',
  },
  eng_fa_cup: {
    id: 'eng_fa_cup',
    name: 'Emirates FA Cup (Copa da Inglaterra)',
    shortName: 'FA Cup',
    description:
      'A mais antiga e prestigiada competição de futebol do planeta! O torneio mais mágico do futebol inglês onde os gigantes da Premier League e Championship entram na épica 3ª Fase em Janeiro, culminando nas históricas Semifinais e Grande Final em Maio no sagrado Wembley Stadium valendo vaga na UEFA Europa League.',
    badgeEmoji: '🦁',
    logoUrl: SOCCERWIKI_ENGLAND_COMPETITION_LOGOS.fa_cup,
    primaryColor: '#b91c1c',
    secondaryColor: '#1e1b4b',
    isCup: true,
    category: 'europe',
    officialClubsCount: 92,
    formatSummary:
      '92 clubes · Mata-Mata clássico · Estreia da Premier League na 3ª Fase · Final em Wembley (vaga na Europa League)',
  },
  esp_laliga: {
    id: 'esp_laliga',
    name: EUROPEAN_LEAGUES_META.esp_laliga.name,
    shortName: EUROPEAN_LEAGUES_META.esp_laliga.shortName,
    description: EUROPEAN_LEAGUES_META.esp_laliga.formatSummary,
    badgeEmoji: '🇪🇸',
    primaryColor: EUROPEAN_LEAGUES_META.esp_laliga.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.esp_laliga.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 20,
    formatSummary: '20 clubes · 38 rodadas · G-4 Champions / 5º Europa League (+ Copa del Rey) / 6º Conference',
  },
  ita_serie_a: {
    id: 'ita_serie_a',
    name: EUROPEAN_LEAGUES_META.ita_serie_a.name,
    shortName: EUROPEAN_LEAGUES_META.ita_serie_a.shortName,
    description: EUROPEAN_LEAGUES_META.ita_serie_a.formatSummary,
    badgeEmoji: '🇮🇹',
    primaryColor: EUROPEAN_LEAGUES_META.ita_serie_a.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.ita_serie_a.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 20,
    formatSummary: '20 clubes · 38 rodadas · G-4 Champions / 5º Europa League (+ Coppa Italia) / 6º Conference',
  },
  ger_bundesliga: {
    id: 'ger_bundesliga',
    name: EUROPEAN_LEAGUES_META.ger_bundesliga.name,
    shortName: EUROPEAN_LEAGUES_META.ger_bundesliga.shortName,
    description: EUROPEAN_LEAGUES_META.ger_bundesliga.formatSummary,
    badgeEmoji: '🇩🇪',
    primaryColor: EUROPEAN_LEAGUES_META.ger_bundesliga.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.ger_bundesliga.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · 34 rodadas · G-4 Champions / 5º Europa League (+ DFB-Pokal) / 6º Conference',
  },
  fra_ligue1: {
    id: 'fra_ligue1',
    name: EUROPEAN_LEAGUES_META.fra_ligue1.name,
    shortName: EUROPEAN_LEAGUES_META.fra_ligue1.shortName,
    description: EUROPEAN_LEAGUES_META.fra_ligue1.formatSummary,
    badgeEmoji: '🇫🇷',
    primaryColor: EUROPEAN_LEAGUES_META.fra_ligue1.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.fra_ligue1.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · 34 rodadas · G-3 Champions / 4º Europa League (+ Coupe de France) / 5º–6º Conference',
  },
  por_primeira: {
    id: 'por_primeira',
    name: EUROPEAN_LEAGUES_META.por_primeira.name,
    shortName: EUROPEAN_LEAGUES_META.por_primeira.shortName,
    description: EUROPEAN_LEAGUES_META.por_primeira.formatSummary,
    badgeEmoji: '🇵🇹',
    primaryColor: EUROPEAN_LEAGUES_META.por_primeira.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.por_primeira.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · 34 rodadas · G-2 Champions / 3º Europa League (+ Taça de Portugal) / 4º–5º Conference',
  },
  ned_eredivisie: {
    id: 'ned_eredivisie',
    name: EUROPEAN_LEAGUES_META.ned_eredivisie.name,
    shortName: EUROPEAN_LEAGUES_META.ned_eredivisie.shortName,
    description: EUROPEAN_LEAGUES_META.ned_eredivisie.formatSummary,
    badgeEmoji: '🇳🇱',
    primaryColor: EUROPEAN_LEAGUES_META.ned_eredivisie.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.ned_eredivisie.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · 34 rodadas · G-2 Champions / 3º Europa League (+ KNVB Beker) / 4º–5º Conference',
  },
  bel_pro_league: {
    id: 'bel_pro_league',
    name: EUROPEAN_LEAGUES_META.bel_pro_league.name,
    shortName: EUROPEAN_LEAGUES_META.bel_pro_league.shortName,
    description: EUROPEAN_LEAGUES_META.bel_pro_league.formatSummary,
    badgeEmoji: '🇧🇪',
    primaryColor: EUROPEAN_LEAGUES_META.bel_pro_league.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.bel_pro_league.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · 34 rodadas · Campeão Champions / 2º Europa League (+ Croky Cup) / 3º–4º Conference',
  },
  tur_super_lig: {
    id: 'tur_super_lig',
    name: EUROPEAN_LEAGUES_META.tur_super_lig.name,
    shortName: EUROPEAN_LEAGUES_META.tur_super_lig.shortName,
    description: EUROPEAN_LEAGUES_META.tur_super_lig.formatSummary,
    badgeEmoji: '🇹🇷',
    primaryColor: EUROPEAN_LEAGUES_META.tur_super_lig.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.tur_super_lig.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · 34 rodadas · G-2 Champions / 3º Europa League (+ Türkiye Kupası) / 4º–5º Conference',
  },
  gre_super_league: {
    id: 'gre_super_league',
    name: EUROPEAN_LEAGUES_META.gre_super_league.name,
    shortName: EUROPEAN_LEAGUES_META.gre_super_league.shortName,
    description: EUROPEAN_LEAGUES_META.gre_super_league.formatSummary,
    badgeEmoji: '🇬🇷',
    primaryColor: EUROPEAN_LEAGUES_META.gre_super_league.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.gre_super_league.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 14,
    formatSummary: '14 clubes · 26 rodadas · Campeão Champions / 2º Europa League (+ Copa da Grécia) / 3º–4º Conference',
  },
  nor_eliteserien: {
    id: 'nor_eliteserien',
    name: EUROPEAN_LEAGUES_META.nor_eliteserien.name,
    shortName: EUROPEAN_LEAGUES_META.nor_eliteserien.shortName,
    description: EUROPEAN_LEAGUES_META.nor_eliteserien.formatSummary,
    badgeEmoji: '🇳🇴',
    primaryColor: EUROPEAN_LEAGUES_META.nor_eliteserien.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.nor_eliteserien.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 16,
    formatSummary: '16 clubes · 30 rodadas · Campeão Champions / 2º Europa League (+ NM Cup) / 3º–4º Conference',
  },
  den_superliga: {
    id: 'den_superliga',
    name: EUROPEAN_LEAGUES_META.den_superliga.name,
    shortName: EUROPEAN_LEAGUES_META.den_superliga.shortName,
    description: EUROPEAN_LEAGUES_META.den_superliga.formatSummary,
    badgeEmoji: '🇩🇰',
    primaryColor: EUROPEAN_LEAGUES_META.den_superliga.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.den_superliga.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 12,
    formatSummary: '12 clubes · 22 rodadas · Campeão Champions / 2º Europa League (+ DBU Pokalen) / 3º–4º Conference',
  },
  sui_super_league: {
    id: 'sui_super_league',
    name: EUROPEAN_LEAGUES_META.sui_super_league.name,
    shortName: EUROPEAN_LEAGUES_META.sui_super_league.shortName,
    description: EUROPEAN_LEAGUES_META.sui_super_league.formatSummary,
    badgeEmoji: '🇨🇭',
    primaryColor: EUROPEAN_LEAGUES_META.sui_super_league.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.sui_super_league.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 12,
    formatSummary: '12 clubes · 22 rodadas · Campeão Champions / 2º Europa League (+ Copa da Suíça) / 3º–4º Conference',
  },
  swe_allsvenskan: {
    id: 'swe_allsvenskan',
    name: EUROPEAN_LEAGUES_META.swe_allsvenskan.name,
    shortName: EUROPEAN_LEAGUES_META.swe_allsvenskan.shortName,
    description: EUROPEAN_LEAGUES_META.swe_allsvenskan.formatSummary,
    badgeEmoji: '🇸🇪',
    primaryColor: EUROPEAN_LEAGUES_META.swe_allsvenskan.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.swe_allsvenskan.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 16,
    formatSummary: '16 clubes · 30 rodadas · Campeão Champions / 2º Europa League (+ Svenska Cupen) / 3º–4º Conference',
  },
  sco_premiership: {
    id: 'sco_premiership',
    name: EUROPEAN_LEAGUES_META.sco_premiership.name,
    shortName: EUROPEAN_LEAGUES_META.sco_premiership.shortName,
    description: EUROPEAN_LEAGUES_META.sco_premiership.formatSummary,
    badgeEmoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    primaryColor: EUROPEAN_LEAGUES_META.sco_premiership.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.sco_premiership.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 12,
    formatSummary: '12 clubes · 22 rodadas · Campeão Champions / 2º Europa League (+ Scottish Cup) / 3º–4º Conference',
  },
  eu_special_1: {
    id: 'eu_special_1',
    name: EUROPEAN_LEAGUES_META.eu_special_1.name,
    shortName: EUROPEAN_LEAGUES_META.eu_special_1.shortName,
    description: EUROPEAN_LEAGUES_META.eu_special_1.formatSummary,
    badgeEmoji: '⭐',
    primaryColor: EUROPEAN_LEAGUES_META.eu_special_1.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.eu_special_1.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 16,
    formatSummary: '16 clubes · 30 rodadas · Campeão Champions / 2º–3º Europa League (+ Taça Especial 1) / 4º–7º Conference',
  },
  eu_special_2: {
    id: 'eu_special_2',
    name: EUROPEAN_LEAGUES_META.eu_special_2.name,
    shortName: EUROPEAN_LEAGUES_META.eu_special_2.shortName,
    description: EUROPEAN_LEAGUES_META.eu_special_2.formatSummary,
    badgeEmoji: '🌟',
    primaryColor: EUROPEAN_LEAGUES_META.eu_special_2.primaryColor,
    secondaryColor: EUROPEAN_LEAGUES_META.eu_special_2.secondaryColor,
    isCup: false,
    category: 'europe',
    officialClubsCount: 16,
    formatSummary: '16 clubes · 30 rodadas · Campeão Champions / 2º Europa League (+ Taça Especial 2) / 3º–8º Conference',
  },
  esp_copa_del_rey: {
    id: 'esp_copa_del_rey',
    name: 'Copa del Rey (Espanha)',
    shortName: 'Copa del Rey',
    description:
      'O tradicional torneio eliminatório da Espanha! 20 clubes de La Liga duelam em jogos únicos e semifinais em ida e volta até a grande final em Sevilha.',
    badgeEmoji: '👑',
    primaryColor: '#dc2626',
    secondaryColor: '#facc15',
    isCup: true,
    category: 'europe',
    officialClubsCount: 20,
    formatSummary:
      '20 clubes · Preliminar + Oitavas + Quartas + Semis (Ida e Volta) + Final em La Cartuja',
  },
  esp_supercopa: {
    id: 'esp_supercopa',
    name: 'Supercopa de España',
    shortName: 'Supercopa ESP',
    description:
      'Final Four da Supercopa da Espanha reunindo Barcelona, Atlético de Madrid, Real Madrid e Real Sociedad.',
    badgeEmoji: '🇪🇸',
    primaryColor: '#ef4444',
    secondaryColor: '#f59e0b',
    isCup: true,
    category: 'europe',
    officialClubsCount: 4,
    formatSummary: '4 clubes · Semifinais em 02-03/Fev e Grande Final em 06/02/2027',
  },
  ger_dfb_pokal: {
    id: 'ger_dfb_pokal',
    name: 'DFB-Pokal (Copa da Alemanha)',
    shortName: 'DFB-Pokal',
    description:
      'A Copa da Alemanha com os 18 clubes da Bundesliga em mata-mata clássico até a histórica decisão no Olympiastadion em Berlim.',
    badgeEmoji: '🦅',
    primaryColor: '#000000',
    secondaryColor: '#eab308',
    isCup: true,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · Mata-mata em jogo único · Grande Final em Berlim',
  },
  ger_supercup: {
    id: 'ger_supercup',
    name: 'Franz Beckenbauer Supercup (Alemanha)',
    shortName: 'Supercopa ALE',
    description:
      'Supercopa da Alemanha abrindo a temporada entre Borussia Dortmund e Bayern de Munique no Signal Iduna Park.',
    badgeEmoji: '🇩🇪',
    primaryColor: '#facc15',
    secondaryColor: '#000000',
    isCup: true,
    category: 'europe',
    officialClubsCount: 2,
    formatSummary: 'Dortmund x Bayern · Decisão em Jogo Único no Signal Iduna Park',
  },
  fra_coupe_de_france: {
    id: 'fra_coupe_de_france',
    name: 'Coupe de France (Copa da França)',
    shortName: 'Coupe de France',
    description:
      'A mais tradicional taça da França disputada em mata-mata com final no lendário Stade de France em Saint-Denis.',
    badgeEmoji: '🐓',
    primaryColor: '#1d4ed8',
    secondaryColor: '#dc2626',
    isCup: true,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · Mata-mata direto · Final no Stade de France',
  },
  fra_trophee_champions: {
    id: 'fra_trophee_champions',
    name: 'Trophée des Champions (França)',
    shortName: 'Supercopa FRA',
    description: 'Supercopa da França entre os campeões nacionais em jogo único oficial.',
    badgeEmoji: '🇫🇷',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'europe',
    officialClubsCount: 2,
    formatSummary: 'Decisão em Jogo Único no início da temporada',
  },
  ita_coppa_italia: {
    id: 'ita_coppa_italia',
    name: 'Coppa Italia (Copa da Itália)',
    shortName: 'Coppa Italia',
    description:
      'A prestigiada Copa da Itália com os 20 clubes da Serie A, semifinais em ida e volta e final no Stadio Olimpico de Roma.',
    badgeEmoji: '🇮🇹',
    primaryColor: '#047857',
    secondaryColor: '#b91c1c',
    isCup: true,
    category: 'europe',
    officialClubsCount: 20,
    formatSummary: '20 clubes · Semifinais Ida e Volta · Final no Stadio Olimpico de Roma',
  },
  ita_supercoppa: {
    id: 'ita_supercoppa',
    name: 'Supercoppa Italiana',
    shortName: 'Supercopa ITA',
    description:
      'Final Four da Supercoppa Italiana com semifinais e final entre os quatro gigantes da Itália.',
    badgeEmoji: '🏆',
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    isCup: true,
    category: 'europe',
    officialClubsCount: 4,
    formatSummary: '4 clubes · Semifinais e Final em jogo único em Janeiro',
  },
  por_taca_portugal: {
    id: 'por_taca_portugal',
    name: 'Taça de Portugal',
    shortName: 'Taça de Portugal',
    description:
      'A histórica Taça de Portugal culminando na mítica Festa da Taça no Estádio Nacional do Jamor.',
    badgeEmoji: '🇵🇹',
    primaryColor: '#15803d',
    secondaryColor: '#b91c1c',
    isCup: true,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · Semifinais Ida e Volta · Grande Final no Jamor',
  },
  por_supertaca: {
    id: 'por_supertaca',
    name: 'Supertaça Cândido de Oliveira (Portugal)',
    shortName: 'Supertaça POR',
    description: 'Supertaça de Portugal em Agosto abrindo a temporada oficial.',
    badgeEmoji: '🛡️',
    primaryColor: '#16a34a',
    secondaryColor: '#dc2626',
    isCup: true,
    category: 'europe',
    officialClubsCount: 2,
    formatSummary: 'Decisão em Jogo Único em Aveiro',
  },
  ned_knvb_beker: {
    id: 'ned_knvb_beker',
    name: 'KNVB Beker (Copa da Holanda)',
    shortName: 'KNVB Beker',
    description: 'A Copa da Holanda com final no mítico De Kuip em Roterdã.',
    badgeEmoji: '🇳🇱',
    primaryColor: '#ea580c',
    secondaryColor: '#1e3a8a',
    isCup: true,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · Mata-mata em jogo único · Final no De Kuip',
  },
  ned_johan_cruyff: {
    id: 'ned_johan_cruyff',
    name: 'Johan Cruyff Schaal (Holanda)',
    shortName: 'Supercopa HOL',
    description: 'Supercopa dos Países Baixos disputada na Johan Cruyff Arena.',
    badgeEmoji: '🦁',
    primaryColor: '#f97316',
    secondaryColor: '#0f172a',
    isCup: true,
    category: 'europe',
    officialClubsCount: 2,
    formatSummary: 'Decisão em Jogo Único na Johan Cruyff Arena',
  },
  bel_croky_cup: {
    id: 'bel_croky_cup',
    name: 'Croky Cup (Copa da Bélgica)',
    shortName: 'Croky Cup',
    description:
      'A Copa da Bélgica com semifinais em ida e volta e final no King Baudouin Stadium em Bruxelas.',
    badgeEmoji: '🇧🇪',
    primaryColor: '#dc2626',
    secondaryColor: '#eab308',
    isCup: true,
    category: 'europe',
    officialClubsCount: 18,
    formatSummary: '18 clubes · Semifinais Ida e Volta · Final em Bruxelas',
  },
  bel_supercup: {
    id: 'bel_supercup',
    name: 'Supercopa da Bélgica',
    shortName: 'Supercopa BEL',
    description: 'Supercopa do futebol belga em jogo único.',
    badgeEmoji: '🍟',
    primaryColor: '#ef4444',
    secondaryColor: '#18181b',
    isCup: true,
    category: 'europe',
    officialClubsCount: 2,
    formatSummary: 'Decisão em Jogo Único no Jan Breydel Stadium',
  },
  tur_turkiye_kupasi: {
    id: 'tur_turkiye_kupasi',
    name: 'Türkiye Kupası (Copa da Turquia)',
    shortName: 'Türkiye Kupası',
    description:
      'A Copa da Turquia com os grandes clubes de Istambul e de toda a Süper Lig.',
    badgeEmoji: '🇹🇷',
    primaryColor: '#e11d48',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'europe',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Semifinais Ida e Volta · Final no Atatürk Stadium',
  },
  tur_super_kupa: {
    id: 'tur_super_kupa',
    name: 'Turkcell Süper Kupa (Turquia)',
    shortName: 'Süper Kupa TUR',
    description: 'Supercopa da Turquia entre Galatasaray e rivais em jogo único.',
    badgeEmoji: '🌙',
    primaryColor: '#be123c',
    secondaryColor: '#f59e0b',
    isCup: true,
    category: 'europe',
    officialClubsCount: 2,
    formatSummary: 'Decisão em Jogo Único em Istambul',
  },
  gre_kypello_elladas: {
    id: 'gre_kypello_elladas',
    name: 'Kypello Elladas (Copa da Grécia)',
    shortName: 'Copa da Grécia',
    description:
      'A Copa da Grécia com os 14 clubes da Super League grega e final no Estádio Olímpico de Atenas.',
    badgeEmoji: '🇬🇷',
    primaryColor: '#0284c7',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'europe',
    officialClubsCount: 14,
    formatSummary: '14 clubes · Mata-mata com Semis Ida e Volta · Final em Atenas',
  },
  nor_nm_cup: {
    id: 'nor_nm_cup',
    name: 'NM Cupen (Copa da Noruega)',
    shortName: 'Copa da Noruega',
    description:
      'Norgesmesterskapet: o torneio eliminatório da Noruega com final no Ullevaal Stadion em Oslo.',
    badgeEmoji: '🇳🇴',
    primaryColor: '#dc2626',
    secondaryColor: '#1e3a8a',
    isCup: true,
    category: 'europe',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Mata-mata direto · Final no Ullevaal Stadion em Oslo',
  },
  den_dbu_pokalen: {
    id: 'den_dbu_pokalen',
    name: 'DBU Pokalen (Copa da Dinamarca)',
    shortName: 'Copa Dinamarca',
    description:
      'A Copa da Dinamarca com semifinais em ida e volta e grande final no Parken Stadium em Copenhague.',
    badgeEmoji: '🇩🇰',
    primaryColor: '#b91c1c',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'europe',
    officialClubsCount: 12,
    formatSummary: '12 clubes · Semifinais Ida e Volta · Final no Parken em Copenhague',
  },
  sui_schweizer_cup: {
    id: 'sui_schweizer_cup',
    name: 'Schweizer Cup (Copa da Suíça)',
    shortName: 'Copa da Suíça',
    description:
      'A Copa da Suíça com os clubes da Super League helvética e decisão no Wankdorf em Berna.',
    badgeEmoji: '🇨🇭',
    primaryColor: '#e11d48',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'europe',
    officialClubsCount: 12,
    formatSummary: '12 clubes · Mata-mata direto · Final no Wankdorf em Berna',
  },
  swe_svenska_cupen: {
    id: 'swe_svenska_cupen',
    name: 'Svenska Cupen (Copa da Suécia)',
    shortName: 'Copa da Suécia',
    description:
      'A Copa da Suécia com os clubes da Allsvenskan e final na Friends Arena em Estocolmo.',
    badgeEmoji: '🇸🇪',
    primaryColor: '#eab308',
    secondaryColor: '#0284c7',
    isCup: true,
    category: 'europe',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Oitavas, Quartas, Semis e Final na Friends Arena',
  },
  sco_scottish_cup: {
    id: 'sco_scottish_cup',
    name: 'Scottish Cup (Copa da Escócia)',
    shortName: 'Scottish Cup',
    description:
      'O segundo torneio de futebol mais antigo do mundo com Semifinais e Final no sagrado Hampden Park em Glasgow.',
    badgeEmoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    primaryColor: '#1e3a8a',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'europe',
    officialClubsCount: 12,
    formatSummary: '12 clubes · Semifinais e Grande Final no sagrado Hampden Park',
  },
  eu_sp1_cup: {
    id: 'eu_sp1_cup',
    name: 'Taça Especial Europa 1',
    shortName: 'Taça Especial 1',
    description: 'A copa eliminatória oficial dos 16 clubes da Liga Especial Europa 1.',
    badgeEmoji: '⭐',
    primaryColor: '#6366f1',
    secondaryColor: '#e0e7ff',
    isCup: true,
    category: 'europe',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Oitavas, Quartas, Semis e Grande Final',
  },
  eu_sp2_cup: {
    id: 'eu_sp2_cup',
    name: 'Taça Especial Europa 2',
    shortName: 'Taça Especial 2',
    description: 'A copa eliminatória oficial dos 16 clubes da Liga Especial Europa 2.',
    badgeEmoji: '🌟',
    primaryColor: '#8b5cf6',
    secondaryColor: '#f3e8ff',
    isCup: true,
    category: 'europe',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Oitavas, Quartas, Semis e Grande Final',
  },
  sa_copa_argentina: {
    id: 'sa_copa_argentina',
    name: 'Copa Argentina (AFA)',
    shortName: 'Copa Argentina',
    description:
      'A tradicional e emocionante Copa Argentina! Mata-mata eliminatório com 16 clubes da Liga Profesional e decisão em campo neutro no Mario Alberto Kempes.',
    badgeEmoji: '🇦🇷',
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Mata-mata direto · Final em campo neutro em Córdoba',
  },
  sa_supercopa_argentina: {
    id: 'sa_supercopa_argentina',
    name: 'Supercopa Argentina (AFA)',
    shortName: 'Supercopa Argentina',
    description:
      'Duelo anual entre o campeão da Liga Profesional e o campeão da Copa Argentina no Estadio Malvinas Argentinas em Mendoza.',
    badgeEmoji: '🇦🇷',
    primaryColor: '#0284c7',
    secondaryColor: '#facc15',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Jogo único no Estadio Malvinas Argentinas em Mendoza',
  },
  sa_copa_colombia: {
    id: 'sa_copa_colombia',
    name: 'Copa BetPlay Dimayor (Copa Colombia)',
    shortName: 'Copa Colômbia',
    description:
      'O principal torneio eliminatório da Colômbia! Oitavas, Quartas, Semifinais em ida e volta e Grande Final no Estádio Metropolitano de Barranquilla.',
    badgeEmoji: '🇨🇴',
    primaryColor: '#facc15',
    secondaryColor: '#1d4ed8',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Semifinais Ida e Volta · Final no Metropolitano de Barranquilla',
  },
  sa_superliga_colombia: {
    id: 'sa_superliga_colombia',
    name: 'Superliga BetPlay Dimayor',
    shortName: 'Superliga Colômbia',
    description:
      'A decisão oficial da Superliga Colombiana entre os maiores campeões nacionais no início da temporada.',
    badgeEmoji: '🇨🇴',
    primaryColor: '#dc2626',
    secondaryColor: '#facc15',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Duelo único de abertura da temporada',
  },
  sa_copa_uruguay: {
    id: 'sa_copa_uruguay',
    name: 'Copa AUF Uruguay',
    shortName: 'Copa Uruguai',
    description:
      'A Copa nacional do futebol uruguaio! 16 clubes, Semifinais em ida e volta e Grande Final no histórico Estadio Centenario em Montevidéu.',
    badgeEmoji: '🇺🇾',
    primaryColor: '#60a5fa',
    secondaryColor: '#1e3a8a',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Semifinais Ida e Volta · Final no mítico Estadio Centenario',
  },
  sa_supercopa_uruguay: {
    id: 'sa_supercopa_uruguay',
    name: 'Supercopa Uruguaya',
    shortName: 'Supercopa Uruguai',
    description:
      'Supercopa de abertura da temporada uruguaia disputada em jogo único no Estadio Centenario de Montevidéu.',
    badgeEmoji: '🇺🇾',
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Jogo único no Estadio Centenario',
  },
  sa_copa_ecuador: {
    id: 'sa_copa_ecuador',
    name: 'Copa Ecuador (FEF)',
    shortName: 'Copa Equador',
    description:
      'O torneio eliminatório do futebol equatoriano! 16 equipes, Semifinais em ida e volta e Grande Final no Estadio Rodrigo Paz Delgado em Quito.',
    badgeEmoji: '🇪🇨',
    primaryColor: '#fbbf24',
    secondaryColor: '#1e40af',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Semifinais Ida e Volta · Final no Rodrigo Paz Delgado em Quito',
  },
  sa_supercopa_ecuador: {
    id: 'sa_supercopa_ecuador',
    name: 'Supercopa de Ecuador',
    shortName: 'Supercopa Equador',
    description:
      'Duelo em jogo único entre os campeões do Equador no Estadio Monumental Banco Pichincha em Guayaquil.',
    badgeEmoji: '🇪🇨',
    primaryColor: '#eab308',
    secondaryColor: '#dc2626',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Jogo único em Guayaquil',
  },
  sa_copa_chile: {
    id: 'sa_copa_chile',
    name: 'Copa Chile Coca-Cola Sin Azúcar',
    shortName: 'Copa Chile',
    description:
      'A tradicionalíssima Copa Chile! 16 clubes, Semifinais em ida e volta e Grande Final no histórico Estadio Nacional em Santiago.',
    badgeEmoji: '🇨🇱',
    primaryColor: '#ef4444',
    secondaryColor: '#1d4ed8',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Semifinais Ida e Volta · Final no Estadio Nacional em Santiago',
  },
  sa_supercopa_chile: {
    id: 'sa_supercopa_chile',
    name: 'Supercopa de Chile',
    shortName: 'Supercopa Chile',
    description:
      'Decisão de supercopa em jogo único de abertura da temporada chilena no Estadio Sausalito.',
    badgeEmoji: '🇨🇱',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Jogo único no Estadio Sausalito',
  },
  sa_copa_paraguay: {
    id: 'sa_copa_paraguay',
    name: 'Copa Paraguay (APF)',
    shortName: 'Copa Paraguai',
    description:
      'A Copa nacional do Paraguai! 12 clubes da División de Honor, fase preliminar, Quartas, Semis e Grande Final no Defensores del Chaco.',
    badgeEmoji: '🇵🇾',
    primaryColor: '#f87171',
    secondaryColor: '#1e40af',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 12,
    formatSummary: '12 clubes · Preliminares + Quartas + Semis · Final no Defensores del Chaco',
  },
  sa_supercopa_paraguay: {
    id: 'sa_supercopa_paraguay',
    name: 'Supercopa Paraguay',
    shortName: 'Supercopa Paraguai',
    description:
      'Duelo de supercopa entre os maiores vencedores do ano no Estadio Defensores del Chaco em Assunção.',
    badgeEmoji: '🇵🇾',
    primaryColor: '#ef4444',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Jogo único no Defensores del Chaco',
  },
  sa_copa_peru: {
    id: 'sa_copa_peru',
    name: 'Copa Bicentenario (Copa Peru)',
    shortName: 'Copa Peru',
    description:
      'A Copa nacional do Peru! 16 clubes da Liga 1, Semifinais em ida e volta e Grande Final no Estadio Nacional de Lima.',
    badgeEmoji: '🇵🇪',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Semifinais Ida e Volta · Final no Estadio Nacional de Lima',
  },
  sa_supercopa_peru: {
    id: 'sa_supercopa_peru',
    name: 'Supercopa Peruana',
    shortName: 'Supercopa Peru',
    description:
      'Duelo oficial de supercopa entre o campeão da Liga 1 e o campeão da Copa Bicentenario em Lima.',
    badgeEmoji: '🇵🇪',
    primaryColor: '#b91c1c',
    secondaryColor: '#ffffff',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Jogo único no Estadio Nacional de Lima',
  },
  sa_copa_bolivia: {
    id: 'sa_copa_bolivia',
    name: 'Copa de la División Profesional (Copa Bolívia)',
    shortName: 'Copa Bolívia',
    description:
      'A Copa nacional da Bolívia! 16 clubes, Semifinais em ida e volta e Grande Final na altitude do Estadio Hernando Siles em La Paz.',
    badgeEmoji: '🇧🇴',
    primaryColor: '#16a34a',
    secondaryColor: '#eab308',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Semifinais Ida e Volta · Final no Hernando Siles em La Paz',
  },
  sa_supercopa_bolivia: {
    id: 'sa_supercopa_bolivia',
    name: 'Supercopa de Bolivia',
    shortName: 'Supercopa Bolívia',
    description:
      'Supercopa de futebol da Bolívia em jogo único no Estadio Félix Capriles em Cochabamba.',
    badgeEmoji: '🇧🇴',
    primaryColor: '#15803d',
    secondaryColor: '#dc2626',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Jogo único em Cochabamba',
  },
  sa_copa_venezuela: {
    id: 'sa_copa_venezuela',
    name: 'Copa Venezuela (FVF)',
    shortName: 'Copa Venezuela',
    description:
      'O torneio eliminatório da Venezuela! 14 clubes da Liga FUTVE, fase preliminar, Quartas, Semifinais em ida e volta e Final no Estádio Olímpico da UCV.',
    badgeEmoji: '🇻🇪',
    primaryColor: '#78350f',
    secondaryColor: '#facc15',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 14,
    formatSummary: '14 clubes · Semifinais Ida e Volta · Final no Olímpico da UCV em Caracas',
  },
  sa_supercopa_venezuela: {
    id: 'sa_supercopa_venezuela',
    name: 'Supercopa de Venezuela',
    shortName: 'Supercopa Venezuela',
    description:
      'Decisão de supercopa em jogo único de abertura da temporada no Polideportivo de Pueblo Nuevo em San Cristóbal.',
    badgeEmoji: '🇻🇪',
    primaryColor: '#831843',
    secondaryColor: '#facc15',
    isCup: true,
    category: 'south_america',
    officialClubsCount: 2,
    formatSummary: '2 clubes · Jogo único no Polideportivo de Pueblo Nuevo',
  },
  copa_internacional: {
    id: 'copa_internacional',
    name: 'Champions Internacional FIFA',
    shortName: 'Champions Internacional',
    description:
      'Grande torneio internacional reunindo os 32 melhores clubes classificados da América do Norte (EUA e México), Ásia & Rússia (Arábia Saudita, Japão e Rússia) e África (Egito e Marrocos). São 8 grupos (A–H) seguidos de Oitavas, Quartas, Semifinal e Final Única valendo vaga no Mundial de Clubes!',
    badgeEmoji: '🌐',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    isCup: true,
    category: 'world_continental',
    officialClubsCount: 32,
    formatSummary: '32 clubes (Am. Norte, Ásia/Rússia e África) · 8 grupos + Mata-Mata + Vaga no Mundial',
  },
  concacaf_champions: {
    id: 'concacaf_champions',
    name: 'Copa dos Campeões da CONCACAF',
    shortName: 'Concacaf Champions Cup',
    description:
      'O principal torneio de clubes da América do Norte, América Central e Caribe, disputado anualmente entre Fevereiro e Maio em mata-mata puro com 27 clubes (18 da América do Norte: México, EUA e Canadá; 6 da América Central; 3 do Caribe). 5 campeões entram direto nas Oitavas e 22 disputam a Primeira Rodada com critério de gol fora de casa até as Semifinais e Grande Final Única valendo vaga no Mundial da FIFA!',
    badgeEmoji: '🏆',
    primaryColor: '#d97706',
    secondaryColor: '#0f172a',
    isCup: true,
    category: 'world_continental',
    officialClubsCount: 27,
    formatSummary: '27 clubes (Fev–Mai) · Mata-Mata em 5 fases · Gol Fora até Semi · Final Única + Vaga Mundial FIFA',
  },
  afc_champions: {
    id: 'afc_champions',
    name: 'Liga dos Campeões de Elite da AFC',
    shortName: 'AFC Champions League Elite',
    description:
      'O principal torneio de clubes da Ásia com 32 clubes divididos em Conferência Oeste (16) e Conferência Leste (16). Na Fase de Liga, cada clube disputa 8 jogos (4 em casa e 4 fora) contra 8 adversários diferentes da própria conferência. Os 8 melhores de cada lado avançam às Oitavas (ida e volta) e as Fases Finais (Quartas, Semifinal e Final em 1º de Maio) são disputadas em jogo único na Arábia Saudita!',
    badgeEmoji: '🌏',
    primaryColor: '#059669',
    secondaryColor: '#0f172a',
    isCup: true,
    category: 'world_continental',
    officialClubsCount: 32,
    formatSummary: '32 clubes (Ago–Mai) · Oeste (16) + Leste (16) · 8 rodadas · Oitavas Ida/Volta · Finais em Sede Única na Arábia Saudita',
  },
  usa_mls: {
    id: 'usa_mls',
    name: WORLD_LEAGUES_META.usa_mls.name,
    shortName: WORLD_LEAGUES_META.usa_mls.shortName,
    description:
      'Conferências Leste e Oeste com 30 clubes (15 em cada) em 34 rodadas de temporada regular (Supporters\' Shield), sem rebaixamento, seguidas pelos Audi MLS Cup Playoffs (Wild Card, Melhor de 3 e Finais até a MLS Cup). Campeão disputa vaga da CONCACAF no Mundial de Clubes!',
    badgeEmoji: WORLD_LEAGUES_META.usa_mls.flagEmoji,
    primaryColor: WORLD_LEAGUES_META.usa_mls.primaryColor,
    secondaryColor: '#1e3a8a',
    isCup: false,
    category: 'world_league',
    officialClubsCount: WORLD_LEAGUES_META.usa_mls.clubsCount,
    formatSummary:
      '30 clubes (15 Leste + 15 Oeste) · 34 rodadas + Playoffs MLS Cup (Sem Rebaixamento)',
  },
  mex_ligamx: {
    id: 'mex_ligamx',
    name: WORLD_LEAGUES_META.mex_ligamx.name,
    shortName: WORLD_LEAGUES_META.mex_ligamx.shortName,
    description:
      'A tradicional elite mexicana com 18 clubes em 34 rodadas. O campeão disputa a vaga da CONCACAF no Mundial de Clubes FIFA!',
    badgeEmoji: WORLD_LEAGUES_META.mex_ligamx.flagEmoji,
    primaryColor: WORLD_LEAGUES_META.mex_ligamx.primaryColor,
    secondaryColor: '#14532d',
    isCup: false,
    category: 'world_league',
    officialClubsCount: WORLD_LEAGUES_META.mex_ligamx.clubsCount,
    formatSummary: '18 clubes · 34 rodadas · Vaga no Mundial de Clubes / Z-2 Rebaixamento',
  },
  can_cpl: {
    id: 'can_cpl',
    name: WORLD_LEAGUES_META.can_cpl.name,
    shortName: WORLD_LEAGUES_META.can_cpl.shortName,
    description:
      'A primeira divisão profissional do Canadá com 8 clubes em 28 rodadas (4 turnos: 2 em casa e 2 fora contra cada adversário), sem rebaixamento, valendo 2 vagas na Champions Internacional FIFA e disputa da CONCACAF pelo Mundial de Clubes!',
    badgeEmoji: WORLD_LEAGUES_META.can_cpl.flagEmoji,
    primaryColor: WORLD_LEAGUES_META.can_cpl.primaryColor,
    secondaryColor: '#991B1B',
    isCup: false,
    category: 'world_league',
    officialClubsCount: WORLD_LEAGUES_META.can_cpl.clubsCount,
    formatSummary: '8 clubes · 28 rodadas (4 turnos) · Vaga Mundial / Sem Rebaixamento',
  },
  sau_pro: {
    id: 'sau_pro',
    name: WORLD_LEAGUES_META.sau_pro.name,
    shortName: WORLD_LEAGUES_META.sau_pro.shortName,
    description:
      'A milionária liga saudita de 2026 repleta de astros mundiais em 18 clubes e 34 rodadas. O campeão disputa a vaga asiática no Mundial de Clubes FIFA!',
    badgeEmoji: WORLD_LEAGUES_META.sau_pro.flagEmoji,
    primaryColor: WORLD_LEAGUES_META.sau_pro.primaryColor,
    secondaryColor: '#065f46',
    isCup: false,
    category: 'world_league',
    officialClubsCount: WORLD_LEAGUES_META.sau_pro.clubsCount,
    formatSummary: '18 clubes · 34 rodadas · Vaga no Mundial de Clubes / Z-3 Rebaixamento',
  },
  jpn_j1: {
    id: 'jpn_j1',
    name: WORLD_LEAGUES_META.jpn_j1.name,
    shortName: WORLD_LEAGUES_META.jpn_j1.shortName,
    description:
      'A organizada e técnica primeira divisão do Japão com 20 clubes em 38 rodadas. O campeão briga por vaga no Mundial de Clubes FIFA.',
    badgeEmoji: WORLD_LEAGUES_META.jpn_j1.flagEmoji,
    primaryColor: WORLD_LEAGUES_META.jpn_j1.primaryColor,
    secondaryColor: '#9f1239',
    isCup: false,
    category: 'world_league',
    officialClubsCount: WORLD_LEAGUES_META.jpn_j1.clubsCount,
    formatSummary: '20 clubes · 38 rodadas · Disputa Mundial / Z-3 Rebaixamento',
  },
  rus_premier: {
    id: 'rus_premier',
    name: WORLD_LEAGUES_META.rus_premier.name,
    shortName: WORLD_LEAGUES_META.rus_premier.shortName,
    description:
      'A elite do futebol russo com 16 clubes tradicionais em 30 rodadas disputando o título nacional e acesso ao Mundial de Clubes.',
    badgeEmoji: WORLD_LEAGUES_META.rus_premier.flagEmoji,
    primaryColor: WORLD_LEAGUES_META.rus_premier.primaryColor,
    secondaryColor: '#1d4ed8',
    isCup: false,
    category: 'world_league',
    officialClubsCount: WORLD_LEAGUES_META.rus_premier.clubsCount,
    formatSummary: '16 clubes · 30 rodadas · Disputa Mundial / Z-2 Rebaixamento',
  },
  egy_premier: {
    id: 'egy_premier',
    name: WORLD_LEAGUES_META.egy_premier.name,
    shortName: WORLD_LEAGUES_META.egy_premier.shortName,
    description:
      'A apaixonante liga do Egito com 18 clubes em 34 rodadas. O campeão disputa a vaga africana na Copa Intercontinental FIFA / Mundial de Clubes!',
    badgeEmoji: WORLD_LEAGUES_META.egy_premier.flagEmoji,
    primaryColor: WORLD_LEAGUES_META.egy_premier.primaryColor,
    secondaryColor: '#991b1b',
    isCup: false,
    category: 'world_league',
    officialClubsCount: WORLD_LEAGUES_META.egy_premier.clubsCount,
    formatSummary: '18 clubes · 34 rodadas · Vaga no Mundial de Clubes / Z-3 Rebaixamento',
  },
  mar_botola: {
    id: 'mar_botola',
    name: WORLD_LEAGUES_META.mar_botola.name,
    shortName: WORLD_LEAGUES_META.mar_botola.shortName,
    description:
      'A vibrante Botola Pro do Marrocos com 16 clubes em 30 rodadas disputando o título nacional e a vaga africana no Mundial de Clubes!',
    badgeEmoji: WORLD_LEAGUES_META.mar_botola.flagEmoji,
    primaryColor: WORLD_LEAGUES_META.mar_botola.primaryColor,
    secondaryColor: '#065f46',
    isCup: false,
    category: 'world_league',
    officialClubsCount: WORLD_LEAGUES_META.mar_botola.clubsCount,
    formatSummary: '16 clubes · 30 rodadas · Vaga no Mundial de Clubes / Z-2 Rebaixamento',
  },
  wl_cup_usa: {
    id: 'wl_cup_usa',
    name: 'U.S. Open Cup (Copa dos EUA)',
    shortName: 'U.S. Open Cup',
    description: 'A copa nacional mais antiga dos Estados Unidos, reunindo os 30 clubes da MLS em eliminatórias em jogo único.',
    badgeEmoji: '🇺🇸',
    primaryColor: '#2563EB',
    secondaryColor: '#1E3A8A',
    isCup: true,
    category: 'world_league',
    officialClubsCount: 30,
    formatSummary: '30 clubes da MLS · Mata-mata em jogo único',
  },
  wl_cup_mex: {
    id: 'wl_cup_mex',
    name: 'Copa MX (Copa do México)',
    shortName: 'Copa MX',
    description: 'Tradicional copa eliminatória do futebol mexicano com os 18 clubes da Liga BBVA MX até a decisão no Estadio Azteca.',
    badgeEmoji: '🇲🇽',
    primaryColor: '#16A34A',
    secondaryColor: '#14532D',
    isCup: true,
    category: 'world_league',
    officialClubsCount: 18,
    formatSummary: '18 clubes · Preliminar + Oitavas a Final em jogo único',
  },
  wl_cup_can: {
    id: 'wl_cup_can',
    name: 'Campeonato Canadense (Voyageurs Cup)',
    shortName: 'Copa do Canadá',
    description: 'Torneio nacional unindo os 8 clubes da Canadian Premier League e os 3 gigantes canadenses da MLS pela Taça dos Viajantes.',
    badgeEmoji: '🇨🇦',
    primaryColor: '#DC2626',
    secondaryColor: '#991B1B',
    isCup: true,
    category: 'world_league',
    officialClubsCount: 11,
    formatSummary: '11 clubes (CPL + MLS Canadá) · Mata-mata em jogo único',
  },
  wl_cup_sau: {
    id: 'wl_cup_sau',
    name: 'Copa do Rei Saudita (King\'s Cup)',
    shortName: 'Copa do Rei (SAU)',
    description: 'A prestigiada Copa dos Campeões dos Reis com os 18 clubes da Saudi Pro League rumo à grande final em Jeddah.',
    badgeEmoji: '🇸🇦',
    primaryColor: '#10B981',
    secondaryColor: '#065F46',
    isCup: true,
    category: 'world_league',
    officialClubsCount: 18,
    formatSummary: '18 clubes · Mata-mata em jogo único',
  },
  wl_cup_jpn: {
    id: 'wl_cup_jpn',
    name: 'Copa do Imperador (Emperor\'s Cup)',
    shortName: 'Copa do Imperador',
    description: 'A centenária copa nacional do Japão reunindo os 20 clubes da J1 League rumo ao Estádio Nacional de Tóquio.',
    badgeEmoji: '🇯🇵',
    primaryColor: '#E11D48',
    secondaryColor: '#9F1239',
    isCup: true,
    category: 'world_league',
    officialClubsCount: 20,
    formatSummary: '20 clubes · Mata-mata em jogo único até Tóquio',
  },
  wl_cup_rus: {
    id: 'wl_cup_rus',
    name: 'Copa da Rússia (Russian Cup)',
    shortName: 'Copa da Rússia',
    description: 'Competição eliminatória com os 16 clubes da Premier Liga Russa, com semifinais em ida e volta e decisão no Lujniki.',
    badgeEmoji: '🇷🇺',
    primaryColor: '#3B82F6',
    secondaryColor: '#1D4ED8',
    isCup: true,
    category: 'world_league',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Oitavas/Quartas únicas · Semi Ida/Volta · Final no Lujniki',
  },
  wl_cup_egy: {
    id: 'wl_cup_egy',
    name: 'Copa do Egito (Egypt Cup)',
    shortName: 'Copa do Egito',
    description: 'A tradicional copa eliminatória do Egito reunindo os 18 clubes da elite nacional rumo ao Cairo International Stadium.',
    badgeEmoji: '🇪🇬',
    primaryColor: '#DC2626',
    secondaryColor: '#991B1B',
    isCup: true,
    category: 'world_league',
    officialClubsCount: 18,
    formatSummary: '18 clubes · Mata-mata em jogo único',
  },
  wl_cup_mar: {
    id: 'wl_cup_mar',
    name: 'Coupe du Trône (Copa do Marrocos)',
    shortName: 'Copa do Trono (MAR)',
    description: 'A prestigiosa Copa do Trono do Marrocos com os 16 clubes da Botola Pro disputando a taça real em Rabat.',
    badgeEmoji: '🇲🇦',
    primaryColor: '#059669',
    secondaryColor: '#065F46',
    isCup: true,
    category: 'world_league',
    officialClubsCount: 16,
    formatSummary: '16 clubes · Oitavas a Final em jogo único',
  },
  amistoso_internacional: {
    id: 'amistoso_internacional',
    name: 'Excursão & Amistoso Internacional',
    shortName: 'Amistoso / Tour',
    description:
      'Partidas de pré-temporada, excursões comerciais internacionais e jogos festivos que geram cotas em caixa, ritmo de jogo e experiência para o elenco.',
    badgeEmoji: '✈️',
    primaryColor: '#14b8a6',
    secondaryColor: '#0f766e',
    isCup: false,
    category: 'world',
    officialClubsCount: 2,
    formatSummary: 'Jogo amistoso · Receita comercial + Ritmo de jogo',
  },
};

export const ESTADUAL_TOURNAMENT_KEYS: Record<string, string> = Object.fromEntries(
  ESTADUAIS_2026_CONFIG.map((cfg) => [cfg.name, cfg.key])
);

const OFFICIAL_LIBERTADORES_2026_GROUPS: Record<string, string[]> = {
  'Grupo A': ['fla', 'est', 'cus', 'med'],
  'Grupo B': ['nac', 'uni', 'coq', 'tol'],
  'Grupo C': ['flu', 'bol', 'lgu', 'irv'],
  'Grupo D': ['boc', 'cru', 'uca', 'bsc'],
  'Grupo E': ['pen', 'cor', 'sfe', 'pla'],
  'Grupo F': ['pal', 'cer', 'jun', 'scr'],
  'Grupo G': ['ldu', 'lan', 'alw', 'mir'],
  'Grupo H': ['idv', 'lib', 'ros', 'ucv'],
};

const OFFICIAL_SULAMERICANA_2026_GROUPS: Record<string, string[]> = {
  'Grupo A': ['amc', 'tig', 'mac', 'aat'],
  'Grupo B': ['cam', 'cie', 'pca', 'juy'],
  'Grupo C': ['sao', 'mil', 'bor', 'ohi'],
  'Grupo D': ['san', 'slo', 'dcu', 'rec'],
  'Grupo E': ['rac', 'car', 'ipe', 'bot'],
  'Grupo F': ['gre', 'pcl', 'mct', 'rie'],
  'Grupo G': ['oli', 'vas', 'aud', 'bac'],
  'Grupo H': ['riv', 'rbb', 'blo', 'cbb'],
};

function getRegionalOrderIndex(stateCode: string): number {
  const order: Record<string, number> = {
    // Norte (A01..)
    AC: 1,
    RO: 2,
    AM: 3,
    RR: 4,
    AP: 5,
    PA: 6,
    TO: 7,
    // Nordeste
    MA: 10,
    PI: 11,
    CE: 12,
    RN: 13,
    PB: 14,
    PE: 15,
    AL: 16,
    SE: 17,
    BA: 18,
    // Centro-Oeste
    MT: 20,
    DF: 21,
    GO: 22,
    MS: 23,
    // Sudeste
    ES: 28,
    MG: 29,
    RJ: 30,
    SP: 31,
    // Sul (..A16)
    PR: 38,
    SC: 39,
    RS: 40,
  };
  return order[stateCode] ?? 50;
}

/**
 * Monta os 16 grupos regionalizados da Série D (Grupo A01 a Grupo A16, 6 clubes cada):
 * - Ordenação geográfica de Norte a Sul (Região Norte em A01 até Região Sul em A16).
 * - Proximidade geográfica entre estados limítrofes quando blocos não fecham múltiplos de 6.
 * - Regra obrigatória CBF: máximo de 3 clubes da mesma federação estadual (UF) por grupo!
 */
export function buildSerieDRegionalizedGroups(
  clubs: Club[],
  options?: { shuffleWithinRegion?: boolean }
): Club[][] {
  const MAX_PER_STATE = 3;
  const GROUPS_COUNT = 16;
  const GROUP_SIZE = 6;

  const pool = [...clubs].slice(0, GROUPS_COUNT * GROUP_SIZE);
  if (pool.length === 0) return [];

  const jitter = new Map<string, number>();
  if (options?.shuffleWithinRegion) {
    pool.forEach((c) => jitter.set(c.id, Math.random()));
  }

  pool.sort((a, b) => {
    const geoDiff = getRegionalOrderIndex(a.state) - getRegionalOrderIndex(b.state);
    if (geoDiff !== 0) return geoDiff;
    if (options?.shuffleWithinRegion) {
      return (jitter.get(a.id) ?? 0) - (jitter.get(b.id) ?? 0);
    }
    if (b.reputation !== a.reputation) return b.reputation - a.reputation;
    return a.name.localeCompare(b.name);
  });

  const groups: Club[][] = [];
  for (let g = 0; g < GROUPS_COUNT; g++) {
    const slice = pool.slice(g * GROUP_SIZE, g * GROUP_SIZE + GROUP_SIZE);
    if (slice.length > 0) groups.push(slice);
  }

  const countState = (grp: Club[], uf: string) => grp.filter((c) => c.state === uf).length;
  const avgGeo = (grp: Club[]) =>
    grp.length === 0
      ? 0
      : grp.reduce((acc, c) => acc + getRegionalOrderIndex(c.state), 0) / grp.length;

  // Enforce hard CBF limit: max 3 clubs from the same state per group by swapping with closest neighboring group
  for (let pass = 0; pass < 96; pass++) {
    let fixedAny = false;
    for (let g = 0; g < groups.length; g++) {
      const grp = groups[g];
      const stateCounts = new Map<string, number>();
      grp.forEach((c) => stateCounts.set(c.state, (stateCounts.get(c.state) || 0) + 1));

      let overflowUf: string | null = null;
      for (const [uf, cnt] of stateCounts.entries()) {
        if (cnt > MAX_PER_STATE) {
          overflowUf = uf;
          break;
        }
      }
      if (!overflowUf) continue;

      const idxInG = grp.findIndex((c) => c.state === overflowUf);
      if (idxInG === -1) continue;

      const gAvg = avgGeo(grp);
      // Search neighboring groups sorted by distance |h - g|
      const candidateGroupIndices = Array.from({ length: groups.length }, (_, idx) => idx)
        .filter((h) => h !== g && countState(groups[h], overflowUf!) < MAX_PER_STATE)
        .sort((h1, h2) => Math.abs(h1 - g) - Math.abs(h2 - g));

      let swapped = false;
      for (const h of candidateGroupIndices) {
        const targetGrp = groups[h];
        // Pick the club in targetGrp that keeps geographic cohesion best and doesn't violate max-3 in group g
        let bestIdxInH = -1;
        let bestGeoDist = Infinity;
        for (let k = 0; k < targetGrp.length; k++) {
          const cand = targetGrp[k];
          if (cand.state === overflowUf) continue;
          if (countState(grp, cand.state) >= MAX_PER_STATE) continue;
          const dist = Math.abs(getRegionalOrderIndex(cand.state) - gAvg);
          if (dist < bestGeoDist) {
            bestGeoDist = dist;
            bestIdxInH = k;
          }
        }
        if (bestIdxInH !== -1) {
          const temp = grp[idxInG];
          grp[idxInG] = targetGrp[bestIdxInH];
          targetGrp[bestIdxInH] = temp;
          swapped = true;
          fixedAny = true;
          break;
        }
      }

      if (!swapped) {
        // Fallback: allow any valid swap in furthest groups if direct neighbors were saturated
        break;
      }
    }
    if (!fixedAny) break;
  }

  return groups;
}

/**
 * Generates Supercopa do Brasil (2 clubes — 1st Sunday of February)
 * 2026 Official Matchup: Flamengo (Campeão Brasileiro) x Corinthians (Campeão da Copa do Brasil)
 */
export function generateSupercopaFixtures(
  clubs: Club[],
  year: number = 2026,
  serieAChampId?: string,
  copaBrasilChampId?: string,
  serieARunnerUpId?: string
): Fixture[] {
  const clubIds = new Set(clubs.map((c) => c.id));
  const defaultChampA = clubIds.has('fla') ? 'fla' : clubs.find((c) => c.division === 'A')?.id || clubs[0].id;
  const defaultChampCdb = clubIds.has('cor')
    ? 'cor'
    : clubs.find((c) => c.division === 'A' && c.id !== defaultChampA)?.id || clubs[1].id;
  const defaultRunnerUpA = clubIds.has('pal')
    ? 'pal'
    : clubs.find((c) => c.division === 'A' && c.id !== defaultChampA)?.id || clubs[1].id;

  const teamA = serieAChampId && clubIds.has(serieAChampId) ? serieAChampId : defaultChampA;
  let teamB = copaBrasilChampId && clubIds.has(copaBrasilChampId) ? copaBrasilChampId : defaultChampCdb;

  if (teamB === teamA) {
    const fallbackRunnerUp =
      serieARunnerUpId && clubIds.has(serieARunnerUpId) && serieARunnerUpId !== teamA
        ? serieARunnerUpId
        : clubs.find((c) => c.division === 'A' && c.id !== teamA)?.id || defaultRunnerUpA;
    teamB = fallbackRunnerUp;
  }

  return [
    {
      id: `supercopa_${year}_final`,
      round: 1,
      competition: 'supercopa_brasil',
      cupPhase: 'Decisão da Supercopa do Brasil',
      homeTeamId: teamA,
      awayTeamId: teamB,
      homeScore: null,
      awayScore: null,
      played: false,
      stadiumName: 'Arena BRB Mané Garrincha (Brasília)',
      date: getSupercopaDate(year),
      time: '16:00',
    },
  ];
}

export function getUefaSupercupDate(year: number): string {
  // 2026: Official UEFA date is Wednesday, 12 August 2026
  if (year === 2026) return '2026-08-12';
  // Subsequent seasons: 2nd Wednesday of August (always between Aug 8 and Aug 14, opening European season midweek)
  for (let day = 8; day <= 14; day++) {
    if (new Date(Date.UTC(year, 7, day)).getUTCDay() === 3) {
      return `${year}-08-${String(day).padStart(2, '0')}`;
    }
  }
  return `${year}-08-12`;
}

const UEFA_SUPERCUP_VENUES: readonly string[] = [
  'Red Bull Arena (Salzburgo, Áustria)',
  'PGE Narodowy (Varsóvia, Polônia)',
  'Puskás Aréna (Budapeste, Hungria)',
  'Stadio Friuli (Udine, Itália)',
  'San Mamés (Bilbao, Espanha)',
  'Aviva Stadium (Dublin, Irlanda)',
  'Beşiktaş Park (Istambul, Turquia)',
];

/**
 * Generates Supercopa da UEFA (2 clubes — partida única em agosto, campo neutro, 90 min -> pênaltis)
 * 2026 Official Matchup: PSG (Campeão da Champions League) x Aston Villa (Campeão da Europa League) — 12/08/2026
 */
export function generateUefaSupercupFixtures(
  clubs: Club[],
  year: number = 2026,
  uclChampionId?: string,
  uelChampionId?: string
): Fixture[] {
  if (!Array.isArray(clubs) || clubs.length < 2) return [];
  const clubIds = new Set(clubs.map((c) => c.id));
  const euClubs = clubs.filter((c) => c.division === 'EU');
  const pool = euClubs.length >= 2 ? euClubs : clubs;

  const defaultUclChamp = clubIds.has('eu_psg') ? 'eu_psg' : pool[0].id;
  const defaultUelChamp = clubIds.has('eu_avl')
    ? 'eu_avl'
    : pool.find((c) => c.id !== defaultUclChamp)?.id || pool[1].id;

  const teamA = uclChampionId && clubIds.has(uclChampionId) ? uclChampionId : defaultUclChamp;
  let teamB = uelChampionId && clubIds.has(uelChampionId) ? uelChampionId : defaultUelChamp;

  if (teamB === teamA) {
    teamB =
      (teamA !== 'eu_avl' && clubIds.has('eu_avl') ? 'eu_avl' : undefined) ||
      pool.find((c) => c.id !== teamA)?.id ||
      defaultUelChamp;
  }

  const venue =
    year === 2026
      ? UEFA_SUPERCUP_VENUES[0]
      : UEFA_SUPERCUP_VENUES[Math.abs(year - 2026) % UEFA_SUPERCUP_VENUES.length];

  return [
    {
      id: `uefa_supercup_${year}_final`,
      round: 1,
      competition: 'uefa_supercup',
      cupPhase: 'Grande Final • Supercopa da UEFA',
      homeTeamId: teamA,
      awayTeamId: teamB,
      homeScore: null,
      awayScore: null,
      played: false,
      stadiumName: venue,
      date: getUefaSupercupDate(year),
      time: '16:00',
    },
  ];
}

/**
 * Generates Recopa Sul-Americana (2 clubes — Ida e Volta in February)
 * 2026 Official Matchup: Lanús (Campeão Sul-Americana) x Flamengo (Campeão Libertadores)
 */
export function generateRecopaFixtures(
  clubs: Club[],
  year: number = 2026,
  libertadoresChampId?: string,
  sulamericanaChampId?: string
): Fixture[] {
  const clubIds = new Set(clubs.map((c) => c.id));
  const defaultLibChamp = clubIds.has('fla') ? 'fla' : clubs.find((c) => c.division === 'A')?.id || clubs[0].id;
  const defaultSulaChamp = clubIds.has('lan')
    ? 'lan'
    : clubIds.has('rac')
    ? 'rac'
    : clubs.find((c) => c.division === 'SA' && c.id !== defaultLibChamp)?.id || clubs[1].id;

  const libChamp = libertadoresChampId && clubIds.has(libertadoresChampId) ? libertadoresChampId : defaultLibChamp;
  let sulaChamp = sulamericanaChampId && clubIds.has(sulamericanaChampId) ? sulamericanaChampId : defaultSulaChamp;

  if (sulaChamp === libChamp) {
    sulaChamp =
      clubs.find((c) => (c.division === 'SA' || c.division === 'A') && c.id !== libChamp)?.id || defaultSulaChamp;
  }

  const [idaDate, voltaDate] = getRecopaDates(year);

  return [
    {
      id: `recopa_${year}_ida`,
      round: 1,
      competition: 'recopa_sulamericana',
      cupPhase: 'Final da Recopa Sul-Americana',
      leg: 1,
      homeTeamId: sulaChamp,
      awayTeamId: libChamp,
      homeScore: null,
      awayScore: null,
      played: false,
      date: idaDate,
      time: '21:30',
    },
    {
      id: `recopa_${year}_volta`,
      round: 2,
      competition: 'recopa_sulamericana',
      cupPhase: 'Final da Recopa Sul-Americana',
      leg: 2,
      homeTeamId: libChamp,
      awayTeamId: sulaChamp,
      homeScore: null,
      awayScore: null,
      played: false,
      date: voltaDate,
      time: '21:30',
    },
  ];
}

/**
 * Generates Brasileirão Série D 2027+ (96 clubes — Regulamento Oficial CBF):
 * - 16 grupos regionalizados de 6 clubes (Grupo A01 .. Grupo A16, Norte -> Sul, máx. 3 clubes por UF)
 * - 10 rodadas (turno e returno), Top 4 de cada grupo (64 clubes) avançam ao mata-mata em ida e volta:
 *   2ª Fase (cruzamento olímpico vizinho) -> 3ª Fase (32 clubes garantem Série D seguinte) -> Oitavas (16) ->
 *   Quartas / Valendo Acesso (re-ranqueamento 1ºx8º..4ºx5º) -> Semifinal (re-ranqueamento 1ºx4º, 2ºx3º) -> Final (campeão na 3ª fase da CdB)
 */
export function generateSerieDFixturesAndStandings(
  clubs: Club[],
  year: number = 2027
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const serieDClubs = clubs.filter((c) => c.division === 'D').slice(0, 96);
  const regionalGroups = buildSerieDRegionalizedGroups(serieDClubs);

  const fixtures: Fixture[] = [];
  const standings: Standing[] = [];

  // Berger pairings for 6 teams (indices 0..5): 5 first-half rounds + 5 mirror return rounds
  const firstHalfTemplate: Array<Array<[number, number]>> = [
    [
      [0, 5],
      [1, 4],
      [2, 3],
    ],
    [
      [4, 0],
      [5, 3],
      [1, 2],
    ],
    [
      [0, 3],
      [2, 5],
      [4, 1],
    ],
    [
      [2, 0],
      [3, 1],
      [5, 4],
    ],
    [
      [0, 1],
      [4, 2],
      [3, 5],
    ],
  ];
  const fullTenRoundsTemplate: Array<Array<[number, number]>> = [
    ...firstHalfTemplate,
    ...firstHalfTemplate.map((pairs) => pairs.map(([h, a]) => [a, h] as [number, number])),
  ];

  const serieDDates = getSerieDScheduleDates(year);
  const firstOfficialDate = serieDDates[0] || getSeasonStartDate(year);
  const finalOfficialDate = serieDDates[serieDDates.length - 1] || `${year}-09-15`;

  for (let gIdx = 0; gIdx < regionalGroups.length; gIdx++) {
    const groupCode = String(gIdx + 1).padStart(2, '0');
    const groupName = `Grupo A${groupCode}`;
    const groupSlice = regionalGroups[gIdx];
    if (groupSlice.length === 0) continue;

    groupSlice.forEach((club) => {
      standings.push({
        teamId: club.id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
        group: groupName,
      });
    });

    if (groupSlice.length < 6) continue;

    fullTenRoundsTemplate.forEach((pairs, rIdx) => {
      const roundNum = rIdx + 1;
      const roundDate = serieDDates[rIdx] || getRoundDate(roundNum, year).date;
      const prevRoundDate = rIdx > 0 ? serieDDates[rIdx - 1] : undefined;
      const nextRoundDate = rIdx + 1 < fullTenRoundsTemplate.length ? serieDDates[rIdx + 1] : undefined;
      pairs.forEach(([hIdx, aIdx], mIdx) => {
        const slot = assignVariedMatchDaySlot(
          roundDate,
          mIdx + gIdx * 3,
          roundNum,
          fullTenRoundsTemplate.length,
          `serie_d_${year}`,
          {
            minDate: firstOfficialDate,
            maxDate: finalOfficialDate,
            prevRoundBaseDate: prevRoundDate,
            nextRoundBaseDate: nextRoundDate,
            region: 'south_america',
            fallbackTime: mIdx === 0 ? '16:00' : '15:00',
          }
        );
        fixtures.push({
          id: `sd_g${groupCode}_r${roundNum}_m${mIdx}`,
          round: roundNum,
          competition: 'serie_d',
          cupPhase: `${groupName} • Rodada ${roundNum}`,
          homeTeamId: groupSlice[hIdx].id,
          awayTeamId: groupSlice[aIdx].id,
          homeScore: null,
          awayScore: null,
          played: false,
          date: slot.date,
          time: slot.time,
        });
      });
    });
  }

  // Helper to push two-legged Série D knockout stage
  const pushTwoLeggedSerieDStage = (
    stagePrefix: string,
    cupPhaseLabel: string,
    tiesCount: number,
    idaRound: number,
    voltaRound: number,
    idaSlotIdx: number,
    voltaSlotIdx: number
  ) => {
    const idaDate = serieDDates[idaSlotIdx] || getRoundDate(idaRound, year).date;
    const voltaDate = serieDDates[voltaSlotIdx] || getRoundDate(voltaRound, year).date;
    const prevIdaDate = idaSlotIdx > 0 ? serieDDates[idaSlotIdx - 1] : undefined;
    const nextVoltaDate = voltaSlotIdx + 1 < serieDDates.length ? serieDDates[voltaSlotIdx + 1] : undefined;

    for (let i = 0; i < tiesCount; i++) {
      const idaId = tiesCount === 1 ? `${stagePrefix}_ida` : `${stagePrefix}_m${i}_ida`;
      const voltaId = tiesCount === 1 ? `${stagePrefix}_volta` : `${stagePrefix}_m${i}_volta`;
      const idaSlot =
        tiesCount === 1
          ? { date: idaDate, time: '16:00' }
          : assignVariedMatchDaySlot(idaDate, i, idaRound, 22, `serie_d_ko_${year}`, {
              minDate: firstOfficialDate,
              maxDate: finalOfficialDate,
              prevRoundBaseDate: prevIdaDate,
              nextRoundBaseDate: voltaDate,
              region: 'south_america',
              fallbackTime: '16:00',
            });
      const voltaSlot =
        tiesCount === 1
          ? { date: voltaDate, time: '16:00' }
          : assignVariedMatchDaySlot(voltaDate, i, voltaRound, 22, `serie_d_ko_${year}`, {
              minDate: firstOfficialDate,
              maxDate: finalOfficialDate,
              prevRoundBaseDate: idaDate,
              nextRoundBaseDate: nextVoltaDate,
              region: 'south_america',
              fallbackTime: '16:00',
            });

      fixtures.push({
        id: idaId,
        round: idaRound,
        competition: 'serie_d',
        cupPhase: cupPhaseLabel,
        leg: 1,
        homeTeamId: 'tbd',
        awayTeamId: 'tbd',
        homeScore: null,
        awayScore: null,
        played: false,
        date: idaSlot.date,
        time: idaSlot.time,
      });
      fixtures.push({
        id: voltaId,
        round: voltaRound,
        competition: 'serie_d',
        cupPhase: cupPhaseLabel,
        leg: 2,
        homeTeamId: 'tbd',
        awayTeamId: 'tbd',
        homeScore: null,
        awayScore: null,
        played: false,
        date: voltaSlot.date,
        time: voltaSlot.time,
      });
    }
  };

  // 2ª Fase (64 clubes = 32 confrontos), 3ª Fase (16), Oitavas (8), Quartas/Acesso (4), Semifinal (2), Grande Final (1)
  pushTwoLeggedSerieDStage('sd_f2', '2ª Fase', 32, 11, 12, 10, 11);
  pushTwoLeggedSerieDStage('sd_f3', '3ª Fase', 16, 13, 14, 12, 13);
  pushTwoLeggedSerieDStage('sd_oitavas', 'Oitavas de Final', 8, 15, 16, 14, 15);
  pushTwoLeggedSerieDStage('sd_quartas', 'Quartas de Final (Valendo Acesso)', 4, 17, 18, 16, 17);
  pushTwoLeggedSerieDStage('sd_semi', 'Semifinal', 2, 19, 20, 18, 19);
  pushTwoLeggedSerieDStage('sd_final', 'Grande Final da Série D', 1, 21, 22, 20, 21);

  return { fixtures, standings };
}

/**
 * Generates Copa do Brasil 2026 (126 clubes em 9 fases — Regulamento Oficial CBF 2026):
 * - 1ª Fase: 28 clubes (14 jogos únicos -> 14 classificados)
 * - 2ª Fase: 88 clubes = 74 clubes + 14 da 1ª Fase (44 jogos únicos -> 44 classificados)
 * - 3ª Fase: 48 clubes = 4 campeões regionais/divisões + 44 da 2ª Fase (24 jogos únicos -> 24 classificados)
 * - 4ª Fase: 24 clubes (12 jogos únicos -> 12 classificados)
 * - 5ª Fase: 32 clubes = 20 clubes da Série A + 12 da 4ª Fase (16 confrontos de ida e volta -> 16 classificados)
 * - Oitavas de Final: 16 clubes (8 confrontos de ida e volta)
 * - Quartas de Final: 8 clubes (4 confrontos de ida e volta)
 * - Semifinal: 4 clubes (2 confrontos de ida e volta)
 * - Grande Final: 2 clubes (Jogo Único em campo neutro!)
 */
export function generateCopaBrasilFixtures(
  clubs: Club[],
  year: number = 2026,
  explicitStateQualifiedIds?: string[],
  regionalChampIds?: string[]
): Fixture[] {
  const fixtures: Fixture[] = [];
  const clubById = new Map<string, Club>(clubs.map((c) => [c.id, c]));
  const divisionRank: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, EST: 5 };

  const rankBrClub = (a: Club, b: Club) => {
    const dDiff = (divisionRank[a.division] || 5) - (divisionRank[b.division] || 5);
    if (dDiff !== 0) return dDiff;
    if (b.reputation !== a.reputation) return b.reputation - a.reputation;
    return b.stadium.capacity - a.stadium.capacity;
  };

  const allBrClubs = clubs
    .filter((c) => ['A', 'B', 'C', 'D', 'EST'].includes(c.division))
    .sort(rankBrClub);

  // 20 Série A clubs enter directly in 5ª Fase
  const serieASeeds = allBrClubs.filter((c) => c.division === 'A').slice(0, 20);
  const serieASeedSet = new Set(serieASeeds.map((c) => c.id));

  // 4 Regional / Lower-Division Champions enter in 3ª Fase (Copa do Nordeste, Copa Verde, Série C, Série D)
  const phase3Seeds: Club[] = [];
  const phase3Set = new Set<string>();
  const defaultPhase3Candidates = [
    ...(regionalChampIds || []),
    'for', // Representante Nordeste / Campeão Regional
    'pay', // Campeão Copa Verde
    'pon', // Campeão Série C
    'barra',
    'bar', // Campeão Série D 2025 (Barra-SC)
    'spo',
    'goi',
  ];
  for (const cid of defaultPhase3Candidates) {
    if (phase3Seeds.length >= 4) break;
    const c = clubById.get(cid);
    if (c && !serieASeedSet.has(c.id) && !phase3Set.has(c.id)) {
      phase3Seeds.push(c);
      phase3Set.add(c.id);
    }
  }
  for (const c of allBrClubs) {
    if (phase3Seeds.length >= 4) break;
    if (!serieASeedSet.has(c.id) && !phase3Set.has(c.id)) {
      phase3Seeds.push(c);
      phase3Set.add(c.id);
    }
  }

  // 102 State Championship Qualifiers across all 27 UFs (CBF Official Quota = 102 spots!)
  const stateQualifiedPool: Club[] = [];
  const statePoolSet = new Set<string>();
  const addStateQualifier = (c?: Club) => {
    if (!c) return false;
    if (serieASeedSet.has(c.id) || phase3Set.has(c.id) || statePoolSet.has(c.id)) return false;
    stateQualifiedPool.push(c);
    statePoolSet.add(c.id);
    return true;
  };

  if (explicitStateQualifiedIds && explicitStateQualifiedIds.length >= 20) {
    // Full 27-state qualification list from previous season's Campeonatos Estaduais
    for (const qId of explicitStateQualifiedIds) {
      if (stateQualifiedPool.length >= 102) break;
      addStateQualifier(clubById.get(qId));
    }
  }

  // Fill per-UF CBF quotas (exact 102 spots across the 27 Federations; RN respects explicit 3-club list if passed)
  const legacyRnTop3 =
    explicitStateQualifiedIds && explicitStateQualifiedIds.length > 0 && explicitStateQualifiedIds.length < 20
      ? explicitStateQualifiedIds.slice(0, 3)
      : ['abc', 'arn', 'rn_scn'];

  for (const cfg of ESTADUAIS_2026_CONFIG) {
    const alreadyFromUf = stateQualifiedPool.filter((c) => c.state === cfg.uf).length;
    let needed = Math.max(0, cfg.copaBrasilSpots - alreadyFromUf);
    if (needed === 0) continue;

    if (cfg.uf === 'RN') {
      for (const rnId of legacyRnTop3) {
        if (needed <= 0) break;
        if (addStateQualifier(clubById.get(rnId))) needed -= 1;
      }
    }

    const ufCandidates = [
      ...cfg.defaultClubIds.map((id) => clubById.get(id)).filter((c): c is Club => Boolean(c)),
      ...allBrClubs.filter((c) => c.state === cfg.uf),
    ].sort(rankBrClub);

    for (const cand of ufCandidates) {
      if (needed <= 0 || stateQualifiedPool.length >= 102) break;
      if (addStateQualifier(cand)) {
        needed -= 1;
      }
    }
  }

  // Top up to exact 102 if any state had fewer non-Série-A clubs available
  for (const cand of allBrClubs) {
    if (stateQualifiedPool.length >= 102) break;
    addStateQualifier(cand);
  }

  const ordered102 = [...stateQualifiedPool].slice(0, 102).sort(rankBrClub);
  const phase2Seeds = ordered102.slice(0, 74); // 74 clubes
  const phase1Clubs = ordered102.slice(74, 102); // 28 clubes (20 + 4 + 74 + 28 = 126 clubes!)

  // Ensure user's Brazilian club in A/B/C/D participates if ranked just outside 126
  const isAlreadyInCdb = (clubId: string) =>
    serieASeedSet.has(clubId) ||
    phase3Set.has(clubId) ||
    phase2Seeds.some((c) => c.id === clubId) ||
    phase1Clubs.some((c) => c.id === clubId);

  const userBrClub = allBrClubs.find(
    (c) => c.isUser && ['A', 'B', 'C', 'D'].includes(c.division)
  );
  if (userBrClub && !isAlreadyInCdb(userBrClub.id) && phase1Clubs.length > 0) {
    phase1Clubs[phase1Clubs.length - 1] = userBrClub;
  }

  const cdbDates = getCopaBrasilScheduleDates(year);

  const minCdbDate = getSeasonStartDate(year);
  const cdbSlot = (baseDate: string, matchIdx: number, roundNum: number, fallbackTime: string) =>
    assignVariedMatchDaySlot(baseDate, matchIdx, roundNum, 99, `copa_brasil_${year}`, {
      keepLastRoundSimultaneous: false,
      allowFridayMonday: false,
      minDate: minCdbDate,
      maxDate: `${year}-12-15`,
      region: 'south_america',
      fallbackTime,
    });

  // 1ª Fase — 14 single-leg ties (28 clubs)
  const f1Date = cdbDates.f1Date;
  for (let i = 0; i < 14; i++) {
    const higherSeed = phase1Clubs[i]?.id || 'tbd';
    const lowerSeed = phase1Clubs[27 - i]?.id || 'tbd';
    const slot = cdbSlot(f1Date, i, 1, i % 2 === 0 ? '19:30' : '21:30');
    fixtures.push({
      id: `cdb_f1_m${i}`,
      round: 1,
      competition: 'copa_brasil',
      cupPhase: '1ª Fase',
      homeTeamId: lowerSeed,
      awayTeamId: higherSeed,
      homeScore: null,
      awayScore: null,
      played: false,
      date: slot.date,
      time: slot.time,
    });
  }

  // 2ª Fase — 44 single-leg ties (74 phase2Seeds + 14 winners from 1ª Fase = 88 clubs)
  const f2Date = cdbDates.f2Date;
  for (let i = 0; i < 14; i++) {
    const slot = cdbSlot(f2Date, i, 2, i % 2 === 0 ? '19:30' : '21:30');
    fixtures.push({
      id: `cdb_f2_m${i}`,
      round: 2,
      competition: 'copa_brasil',
      cupPhase: '2ª Fase',
      homeTeamId: phase2Seeds[i]?.id || 'tbd',
      awayTeamId: 'tbd', // Winner of cdb_f1_m{i}
      homeScore: null,
      awayScore: null,
      played: false,
      date: slot.date,
      time: slot.time,
    });
  }
  for (let j = 0; j < 30; j++) {
    const mIdx = 14 + j;
    const clubHome = phase2Seeds[73 - j]?.id || 'tbd';
    const clubAway = phase2Seeds[14 + j]?.id || 'tbd';
    const slot = cdbSlot(f2Date, mIdx, 2, j % 2 === 0 ? '19:30' : '21:30');
    fixtures.push({
      id: `cdb_f2_m${mIdx}`,
      round: 2,
      competition: 'copa_brasil',
      cupPhase: '2ª Fase',
      homeTeamId: clubHome,
      awayTeamId: clubAway,
      homeScore: null,
      awayScore: null,
      played: false,
      date: slot.date,
      time: slot.time,
    });
  }

  // 3ª Fase — 24 single-leg ties (4 phase3Seeds + 44 winners from 2ª Fase = 48 clubs)
  const f3Date = cdbDates.f3Date;
  for (let i = 0; i < 4; i++) {
    const slot = cdbSlot(f3Date, i, 3, '20:00');
    fixtures.push({
      id: `cdb_f3_m${i}`,
      round: 3,
      competition: 'copa_brasil',
      cupPhase: '3ª Fase',
      homeTeamId: phase3Seeds[i]?.id || 'tbd',
      awayTeamId: 'tbd', // Winner of cdb_f2_m{i}
      homeScore: null,
      awayScore: null,
      played: false,
      date: slot.date,
      time: slot.time,
    });
  }
  for (let k = 0; k < 20; k++) {
    const mIdx = 4 + k;
    const slot = cdbSlot(f3Date, mIdx, 3, k % 2 === 0 ? '19:30' : '21:30');
    fixtures.push({
      id: `cdb_f3_m${mIdx}`,
      round: 3,
      competition: 'copa_brasil',
      cupPhase: '3ª Fase',
      homeTeamId: 'tbd', // Winner of cdb_f2_m{4 + k*2}
      awayTeamId: 'tbd', // Winner of cdb_f2_m{4 + k*2 + 1}
      homeScore: null,
      awayScore: null,
      played: false,
      date: slot.date,
      time: slot.time,
    });
  }

  // 4ª Fase — 12 single-leg ties (24 winners from 3ª Fase)
  const f4Date = cdbDates.f4Date;
  for (let i = 0; i < 12; i++) {
    const slot = cdbSlot(f4Date, i, 4, i % 2 === 0 ? '19:30' : '21:30');
    fixtures.push({
      id: `cdb_f4_m${i}`,
      round: 4,
      competition: 'copa_brasil',
      cupPhase: '4ª Fase',
      homeTeamId: 'tbd', // Winner of cdb_f3_m{i*2}
      awayTeamId: 'tbd', // Winner of cdb_f3_m{i*2 + 1}
      homeScore: null,
      awayScore: null,
      played: false,
      date: slot.date,
      time: slot.time,
    });
  }

  // 5ª Fase — 16 two-legged ties (20 Série A clubs + 12 winners from 4ª Fase = 32 clubs)
  const f5IdaDate = cdbDates.f5IdaDate;
  const f5VoltaDate = cdbDates.f5VoltaDate;
  for (let i = 0; i < 12; i++) {
    const serieAClubId = serieASeeds[i]?.id || 'tbd';
    const idaSlot = cdbSlot(f5IdaDate, i, 5, '21:30');
    const voltaSlot = cdbSlot(f5VoltaDate, i, 6, '21:30');
    fixtures.push({
      id: `cdb_f5_m${i}_ida`,
      round: 5,
      competition: 'copa_brasil',
      cupPhase: '5ª Fase',
      leg: 1,
      homeTeamId: 'tbd', // Winner of cdb_f4_m{i}
      awayTeamId: serieAClubId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: idaSlot.date,
      time: idaSlot.time,
    });
    fixtures.push({
      id: `cdb_f5_m${i}_volta`,
      round: 6,
      competition: 'copa_brasil',
      cupPhase: '5ª Fase',
      leg: 2,
      homeTeamId: serieAClubId,
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: voltaSlot.date,
      time: voltaSlot.time,
    });
  }
  for (let k = 0; k < 4; k++) {
    const mIdx = 12 + k;
    const clubPot1 = serieASeeds[12 + k]?.id || 'tbd';
    const clubPot2 = serieASeeds[19 - k]?.id || 'tbd';
    const idaSlot = cdbSlot(f5IdaDate, mIdx, 5, '21:30');
    const voltaSlot = cdbSlot(f5VoltaDate, mIdx, 6, '21:30');
    fixtures.push({
      id: `cdb_f5_m${mIdx}_ida`,
      round: 5,
      competition: 'copa_brasil',
      cupPhase: '5ª Fase',
      leg: 1,
      homeTeamId: clubPot2,
      awayTeamId: clubPot1,
      homeScore: null,
      awayScore: null,
      played: false,
      date: idaSlot.date,
      time: idaSlot.time,
    });
    fixtures.push({
      id: `cdb_f5_m${mIdx}_volta`,
      round: 6,
      competition: 'copa_brasil',
      cupPhase: '5ª Fase',
      leg: 2,
      homeTeamId: clubPot1,
      awayTeamId: clubPot2,
      homeScore: null,
      awayScore: null,
      played: false,
      date: voltaSlot.date,
      time: voltaSlot.time,
    });
  }

  // Oitavas de Final — 8 two-legged ties (16 clubs)
  const oitavasIdaDate = cdbDates.oitavasIdaDate;
  const oitavasVoltaDate = cdbDates.oitavasVoltaDate;
  for (let i = 0; i < 8; i++) {
    const idaSlot = cdbSlot(oitavasIdaDate, i, 7, '21:30');
    const voltaSlot = cdbSlot(oitavasVoltaDate, i, 8, '21:30');
    fixtures.push({
      id: `cdb_oitavas_m${i}_ida`,
      round: 7,
      competition: 'copa_brasil',
      cupPhase: 'Oitavas de Final',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: idaSlot.date,
      time: idaSlot.time,
    });
    fixtures.push({
      id: `cdb_oitavas_m${i}_volta`,
      round: 8,
      competition: 'copa_brasil',
      cupPhase: 'Oitavas de Final',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: voltaSlot.date,
      time: voltaSlot.time,
    });
  }

  // Quartas de Final — 4 two-legged ties (8 clubs)
  const quartasIdaDate = cdbDates.quartasIdaDate;
  const quartasVoltaDate = cdbDates.quartasVoltaDate;
  for (let q = 0; q < 4; q++) {
    const idaSlot = cdbSlot(quartasIdaDate, q, 9, '21:30');
    const voltaSlot = cdbSlot(quartasVoltaDate, q, 10, '21:30');
    fixtures.push({
      id: `cdb_quartas_m${q}_ida`,
      round: 9,
      competition: 'copa_brasil',
      cupPhase: 'Quartas de Final',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: idaSlot.date,
      time: idaSlot.time,
    });
    fixtures.push({
      id: `cdb_quartas_m${q}_volta`,
      round: 10,
      competition: 'copa_brasil',
      cupPhase: 'Quartas de Final',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: voltaSlot.date,
      time: voltaSlot.time,
    });
  }

  // Semifinal — 2 two-legged ties (4 clubs)
  const semiIdaDate = cdbDates.semiIdaDate;
  const semiVoltaDate = cdbDates.semiVoltaDate;
  for (let s = 0; s < 2; s++) {
    fixtures.push({
      id: `cdb_semi_m${s}_ida`,
      round: 11,
      competition: 'copa_brasil',
      cupPhase: 'Semifinal',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiIdaDate,
      time: '21:45',
    });
    fixtures.push({
      id: `cdb_semi_m${s}_volta`,
      round: 12,
      competition: 'copa_brasil',
      cupPhase: 'Semifinal',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiVoltaDate,
      time: '21:45',
    });
  }

  // Grande Final — Jogo Único (Regulamento Oficial CBF 2026: 06/12!)
  const finalUnicaDate = cdbDates.finalDate;
  fixtures.push({
    id: 'cdb_final_unica',
    round: 13,
    competition: 'copa_brasil',
    cupPhase: 'Grande Final',
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    stadiumName: 'Arena BRB Mané Garrincha (Final Única)',
    date: finalUnicaDate,
    time: '16:00',
  });

  return fixtures;
}

/**
 * Helper to build 32-club 8-group Continental Groups + Oitavas, Quartas, Semifinal & Single-Leg Final
 */
export function build32ClubContinentalCompetition(
  competition:
    | 'libertadores'
    | 'sulamericana'
    | 'champions_league'
    | 'europa_league'
    | 'conference_league'
    | 'copa_internacional',
  prefix: 'lib' | 'sula' | 'ucl' | 'uel' | 'uecl' | 'cint',
  groups: Record<string, string[]>,
  year: number,
  finalFixtureId: string,
  finalPhaseTitle: string,
  finalStadiumName: string,
  finalDate: string,
  defaultKickoffTime: string
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const fixtures: Fixture[] = [];
  const standings: Standing[] = [];

  const conmebolSched = getConmebolContinentalScheduleDates(year);

  Object.entries(groups).forEach(([groupName, teams]) => {
    const validTeams = teams.filter(Boolean);
    validTeams.forEach((teamId) => {
      standings.push({
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
        group: groupName,
      });
    });

    if (validTeams.length < 4) return;

    const matchPairs = [
      [
        [validTeams[0], validTeams[1]],
        [validTeams[2], validTeams[3]],
      ],
      [
        [validTeams[2], validTeams[0]],
        [validTeams[1], validTeams[3]],
      ],
      [
        [validTeams[0], validTeams[3]],
        [validTeams[1], validTeams[2]],
      ],
      [
        [validTeams[3], validTeams[0]],
        [validTeams[2], validTeams[1]],
      ],
      [
        [validTeams[0], validTeams[2]],
        [validTeams[3], validTeams[1]],
      ],
      [
        [validTeams[1], validTeams[0]],
        [validTeams[3], validTeams[2]],
      ],
    ];

    const groupLetterOffset = groupName.charCodeAt(groupName.length - 1) || 0;
    matchPairs.forEach((pairs, rIdx) => {
      const dStr = conmebolSched.groupDates[rIdx] || getMidweekCupDate(6 + rIdx * 2, year);
      pairs.forEach(([h, a], mIdx) => {
        const slot = assignVariedMatchDaySlot(
          dStr,
          mIdx + groupLetterOffset,
          rIdx + 1,
          6,
          `${competition}_${year}`,
          {
            keepLastRoundSimultaneous: true,
            allowFridayMonday: false,
            midweekDays: ['tue', 'wed', 'thu'],
            region: 'south_america',
            fallbackTime: defaultKickoffTime,
          }
        );
        fixtures.push({
          id: `${prefix}_${groupName}_r${rIdx + 1}_m${mIdx}`,
          round: rIdx + 1,
          competition,
          cupPhase: `${groupName} • Rodada ${rIdx + 1}`,
          homeTeamId: h,
          awayTeamId: a,
          homeScore: null,
          awayScore: null,
          played: false,
          date: slot.date,
          time: slot.time,
        });
      });
    });
  });

  const conmebolKoSlot = (baseDate: string, idx: number, roundNum: number, fallbackTime: string) =>
    assignVariedMatchDaySlot(baseDate, idx, roundNum, 99, `${competition}_ko_${year}`, {
      keepLastRoundSimultaneous: false,
      allowFridayMonday: false,
      midweekDays: ['tue', 'wed', 'thu'],
      region: 'south_america',
      fallbackTime,
    });

  // Oitavas de Final — 8 two-legged ties (Top 2 from each of 8 groups = 16 clubs)
  const oitavasIdaDate = conmebolSched.oitavasIdaDate;
  const oitavasVoltaDate = conmebolSched.oitavasVoltaDate;
  for (let i = 0; i < 8; i++) {
    const idaSlot = conmebolKoSlot(oitavasIdaDate, i, 7, '21:30');
    const voltaSlot = conmebolKoSlot(oitavasVoltaDate, i, 8, '21:30');
    fixtures.push({
      id: `${prefix}_oitavas_m${i}_ida`,
      round: 7,
      competition,
      cupPhase: 'Oitavas de Final',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: idaSlot.date,
      time: idaSlot.time,
    });
    fixtures.push({
      id: `${prefix}_oitavas_m${i}_volta`,
      round: 8,
      competition,
      cupPhase: 'Oitavas de Final',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: voltaSlot.date,
      time: voltaSlot.time,
    });
  }

  // Quartas de Final — 4 two-legged ties (8 clubs)
  const quartasIdaDate = conmebolSched.quartasIdaDate;
  const quartasVoltaDate = conmebolSched.quartasVoltaDate;
  for (let q = 0; q < 4; q++) {
    const idaSlot = conmebolKoSlot(quartasIdaDate, q, 9, '21:30');
    const voltaSlot = conmebolKoSlot(quartasVoltaDate, q, 10, '21:30');
    fixtures.push({
      id: `${prefix}_quartas_m${q}_ida`,
      round: 9,
      competition,
      cupPhase: 'Quartas de Final',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: idaSlot.date,
      time: idaSlot.time,
    });
    fixtures.push({
      id: `${prefix}_quartas_m${q}_volta`,
      round: 10,
      competition,
      cupPhase: 'Quartas de Final',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: voltaSlot.date,
      time: voltaSlot.time,
    });
  }

  // Semifinal — 2 two-legged ties (4 clubs)
  const semiIdaDate = conmebolSched.semiIdaDate;
  const semiVoltaDate = conmebolSched.semiVoltaDate;
  const semiPhaseTitle =
    competition === 'libertadores'
      ? 'Semifinal da Glória Eterna'
      : competition === 'sulamericana'
      ? 'Semifinal Sul-Americana'
      : competition === 'copa_internacional'
      ? 'Semifinal da Champions Internacional'
      : competition === 'champions_league'
      ? 'Semifinal da Champions League'
      : competition === 'europa_league'
      ? 'Semifinal da Europa League'
      : 'Semifinal da Conference League';

  for (let s = 0; s < 2; s++) {
    const idaSlot = conmebolKoSlot(semiIdaDate, s, 11, defaultKickoffTime);
    const voltaSlot = conmebolKoSlot(semiVoltaDate, s, 12, defaultKickoffTime);
    fixtures.push({
      id: `${prefix}_semi_${s + 1}_ida`,
      round: 11,
      competition,
      cupPhase: semiPhaseTitle,
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: idaSlot.date,
      time: idaSlot.time,
    });
    fixtures.push({
      id: `${prefix}_semi_${s + 1}_volta`,
      round: 12,
      competition,
      cupPhase: semiPhaseTitle,
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: voltaSlot.date,
      time: voltaSlot.time,
    });
  }

  // Grande Final — Jogo Único em Campo Neutro
  fixtures.push({
    id: finalFixtureId,
    round: 13,
    competition,
    cupPhase: finalPhaseTitle,
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    stadiumName: finalStadiumName,
    date: finalDate,
    time: '17:00',
  });

  return { fixtures, standings };
}

function buildDynamicContinentalPools(
  clubs: Club[],
  qualifiedLibBrIds?: string[],
  qualifiedSulaBrIds?: string[]
): {
  libTeams: string[];
  sulaTeams: string[];
} {
  const clubSet = new Set(clubs.map((c) => c.id));
  const saClubs = clubs
    .filter((c) => c.division === 'SA')
    .sort((a, b) => b.reputation - a.reputation || b.stadium.capacity - a.stadium.capacity);
  const serieAClubs = clubs
    .filter((c) => c.division === 'A')
    .sort((a, b) => b.reputation - a.reputation || b.stadium.capacity - a.stadium.capacity);

  const libBr = (
    qualifiedLibBrIds && qualifiedLibBrIds.length >= 6
      ? qualifiedLibBrIds.filter((id) => clubSet.has(id)).slice(0, 6)
      : serieAClubs.slice(0, 6).map((c) => c.id)
  );
  const libBrSet = new Set(libBr);

  const libSa = saClubs
    .filter((c) => !libBrSet.has(c.id))
    .slice(0, 32 - libBr.length)
    .map((c) => c.id);
  const libTeams = [...libBr, ...libSa];
  const libSet = new Set(libTeams);

  const sulaBrCandidates =
    qualifiedSulaBrIds && qualifiedSulaBrIds.length >= 7
      ? qualifiedSulaBrIds.filter((id) => clubSet.has(id) && !libSet.has(id)).slice(0, 7)
      : serieAClubs
          .filter((c) => !libSet.has(c.id))
          .slice(0, 7)
          .map((c) => c.id);
  const sulaBrSet = new Set(sulaBrCandidates);

  const sulaSa = saClubs
    .filter((c) => !libSet.has(c.id) && !sulaBrSet.has(c.id))
    .slice(0, 32 - sulaBrCandidates.length)
    .map((c) => c.id);
  const sulaTeams = [...sulaBrCandidates, ...sulaSa];

  // Fill any shortfall up to 32 with remaining clubs not in either tournament
  clubs.forEach((c) => {
    if (libTeams.length < 32 && !libTeams.includes(c.id) && !sulaTeams.includes(c.id)) {
      libTeams.push(c.id);
    } else if (sulaTeams.length < 32 && !libTeams.includes(c.id) && !sulaTeams.includes(c.id)) {
      sulaTeams.push(c.id);
    }
  });

  return { libTeams: libTeams.slice(0, 32), sulaTeams: sulaTeams.slice(0, 32) };
}

/**
 * Generates CONMEBOL Libertadores 2026 (32 clubes em 8 grupos A–H + Oitavas, Quartas, Semifinal e Final Única)
 */
export function generateLibertadoresFixtures(
  clubs: Club[],
  year: number = 2026,
  qualifiedBrIds?: string[],
  explicitAll32QualifiedIds?: string[],
  defendingChampId?: string
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const clubIds = new Set(clubs.map((c) => c.id));
  const allOfficial2026Available =
    year === 2026 &&
    (!explicitAll32QualifiedIds || explicitAll32QualifiedIds.length === 0) &&
    Object.values(OFFICIAL_LIBERTADORES_2026_GROUPS).every((grp) =>
      grp.every((id) => clubIds.has(id))
    );

  let groups: Record<string, string[]>;
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  if (allOfficial2026Available) {
    groups = { ...OFFICIAL_LIBERTADORES_2026_GROUPS };
  } else if (explicitAll32QualifiedIds && explicitAll32QualifiedIds.length >= 32) {
    const validIds = explicitAll32QualifiedIds.filter((id) => clubIds.has(id));
    if (validIds.length >= 32) {
      const seededGroups = seedContinentalGroupsWithCountryProtection(
        validIds.slice(0, 32),
        clubs,
        defendingChampId
      );
      groups = {};
      groupLetters.forEach((letter, idx) => {
        groups[`Grupo ${letter}`] = seededGroups[idx] || [];
      });
    } else {
      const { libTeams } = buildDynamicContinentalPools(clubs, qualifiedBrIds);
      groups = {};
      groupLetters.forEach((letter, idx) => {
        groups[`Grupo ${letter}`] = [
          libTeams[idx],
          libTeams[8 + idx],
          libTeams[16 + idx],
          libTeams[24 + idx],
        ].filter(Boolean);
      });
    }
  } else {
    const { libTeams } = buildDynamicContinentalPools(clubs, qualifiedBrIds);
    groups = {};
    groupLetters.forEach((letter, idx) => {
      groups[`Grupo ${letter}`] = [
        libTeams[idx],
        libTeams[8 + idx],
        libTeams[16 + idx],
        libTeams[24 + idx],
      ].filter(Boolean);
    });
  }

  const { libertadoresFinalDate } = getContinentalFinalDates(year);
  return build32ClubContinentalCompetition(
    'libertadores',
    'lib',
    groups,
    year,
    'lib_grande_final',
    'Grande Final da Glória Eterna',
    'Estádio Centenario (Montevidéu)',
    libertadoresFinalDate,
    '21:30'
  );
}

/**
 * Generates CONMEBOL Sul-Americana 2026 (32 clubes em 8 grupos A–H + Oitavas, Quartas, Semifinal e Final Única)
 */
export function generateSulamericanaFixtures(
  clubs: Club[],
  year: number = 2026,
  qualifiedBrIds?: string[],
  reservedLibertadoresBrIds?: string[],
  explicitAll32QualifiedIds?: string[]
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const clubIds = new Set(clubs.map((c) => c.id));
  const allOfficial2026Available =
    year === 2026 &&
    (!explicitAll32QualifiedIds || explicitAll32QualifiedIds.length === 0) &&
    Object.values(OFFICIAL_SULAMERICANA_2026_GROUPS).every((grp) =>
      grp.every((id) => clubIds.has(id))
    );

  let groups: Record<string, string[]>;
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  if (allOfficial2026Available) {
    groups = { ...OFFICIAL_SULAMERICANA_2026_GROUPS };
  } else if (explicitAll32QualifiedIds && explicitAll32QualifiedIds.length >= 32) {
    const validIds = explicitAll32QualifiedIds.filter((id) => clubIds.has(id));
    if (validIds.length >= 32) {
      const seededGroups = seedContinentalGroupsWithCountryProtection(
        validIds.slice(0, 32),
        clubs
      );
      groups = {};
      groupLetters.forEach((letter, idx) => {
        groups[`Grupo ${letter}`] = seededGroups[idx] || [];
      });
    } else {
      const { sulaTeams } = buildDynamicContinentalPools(
        clubs,
        reservedLibertadoresBrIds,
        qualifiedBrIds
      );
      groups = {};
      groupLetters.forEach((letter, idx) => {
        groups[`Grupo ${letter}`] = [
          sulaTeams[idx],
          sulaTeams[8 + idx],
          sulaTeams[16 + idx],
          sulaTeams[24 + idx],
        ].filter(Boolean);
      });
    }
  } else {
    const { sulaTeams } = buildDynamicContinentalPools(
      clubs,
      reservedLibertadoresBrIds,
      qualifiedBrIds
    );
    groups = {};
    groupLetters.forEach((letter, idx) => {
      groups[`Grupo ${letter}`] = [
        sulaTeams[idx],
        sulaTeams[8 + idx],
        sulaTeams[16 + idx],
        sulaTeams[24 + idx],
      ].filter(Boolean);
    });
  }

  const { sulamericanaFinalDate } = getContinentalFinalDates(year);
  return build32ClubContinentalCompetition(
    'sulamericana',
    'sula',
    groups,
    year,
    'sula_final',
    'Grande Final Sul-Americana',
    'Estádio Metropolitano (Barranquilla)',
    sulamericanaFinalDate,
    '19:30'
  );
}

/**
 * Construtor oficial do formato atual UEFA "Fase de Liga" (36 clubes em tabela única):
 * - Champions League & Europa League: 8 rodadas (4 potes de 9 clubes, 4 jogos em casa + 4 fora contra 8 rivais diferentes)
 * - Conference League: 6 rodadas (6 potes de 6 clubes, 3 jogos em casa + 3 fora contra 6 rivais diferentes)
 * - Classificação:
 *   · 1º ao 8º: Direto às Oitavas de Final (cabeças de chave)
 *   · 9º ao 24º: Playoffs do Mata-Mata (Ida e Volta; 9º–16º decidem em casa)
 *   · 25º ao 36º: Eliminados diretamente
 */
export function build36ClubUefaLeagueCompetition(params: {
  competition: 'champions_league' | 'europa_league' | 'conference_league';
  prefix: 'ucl' | 'uel' | 'uecl';
  seededClubIds: string[];
  leagueRoundsCount: 6 | 8;
  year: number;
  finalFixtureId: string;
  finalPhaseTitle: string;
  finalStadiumName: string;
  finalDate: string;
  defaultKickoffTime: string;
}): { fixtures: Fixture[]; standings: Standing[] } {
  const {
    competition,
    prefix,
    seededClubIds,
    leagueRoundsCount,
    year,
    finalFixtureId,
    finalPhaseTitle,
    finalStadiumName,
    finalDate,
    defaultKickoffTime,
  } = params;

  const teams = seededClubIds.slice(0, 36);
  const standings: Standing[] = teams.map((teamId) => ({
    teamId,
    group: 'Fase de Liga',
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
  }));

  const fixtures: Fixture[] = [];

  const uefaCal = getUefaCompetitionCalendarDates(year);

  if (leagueRoundsCount === 8 && teams.length === 36) {
    // 4 Potes de 9 clubes (P0 = Pote 1, P1 = Pote 2, P2 = Pote 3, P3 = Pote 4)
    const P0 = teams.slice(0, 9);
    const P1 = teams.slice(9, 18);
    const P2 = teams.slice(18, 27);
    const P3 = teams.slice(27, 36);
    const leagueDates =
      competition === 'europa_league' ? uefaCal.uelLeagueDates : uefaCal.uclLeagueDates;

    const roundPairings: Array<Array<[string, string]>> = [
      // Rodada 1: P0(H) vs P1(A), P2(H) vs P3(A)
      [
        ...Array.from({ length: 9 }, (_, i): [string, string] => [P0[i], P1[i]]),
        ...Array.from({ length: 9 }, (_, i): [string, string] => [P2[i], P3[i]]),
      ],
      // Rodada 2: P1(H) vs P0(A), P3(H) vs P2(A)
      [
        ...Array.from({ length: 9 }, (_, i): [string, string] => [P1[(i + 1) % 9], P0[i]]),
        ...Array.from({ length: 9 }, (_, i): [string, string] => [P3[(i + 1) % 9], P2[i]]),
      ],
      // Rodada 3: P0(H) vs P2(A), P1(H) vs P3(A)
      [
        ...Array.from({ length: 9 }, (_, i): [string, string] => [P0[i], P2[(i + 2) % 9]]),
        ...Array.from({ length: 9 }, (_, i): [string, string] => [P1[i], P3[(i + 2) % 9]]),
      ],
      // Rodada 4: P2(H) vs P0(A), P3(H) vs P1(A)
      [
        ...Array.from({ length: 9 }, (_, i): [string, string] => [P2[(i + 3) % 9], P0[i]]),
        ...Array.from({ length: 9 }, (_, i): [string, string] => [P3[(i + 3) % 9], P1[i]]),
      ],
      // Rodada 5: P3(H) vs P0(A), P2(H) vs P1(A)
      [
        ...Array.from({ length: 9 }, (_, i): [string, string] => [P3[(i + 4) % 9], P0[i]]),
        ...Array.from({ length: 9 }, (_, i): [string, string] => [P2[(i + 4) % 9], P1[i]]),
      ],
    ];

    // Rodadas 6, 7 e 8: cruzamento A->B + 2 confrontos internos por pote (fecha 4H + 4A contra 2 rivais de cada pote)
    for (let k = 0; k < 3; k++) {
      const pairs: Array<[string, string]> = [];
      const buildBlock = (A: string[], B: string[]) => {
        for (let m = 0; m < 3; m++) {
          pairs.push([A[3 * k + m], B[3 * k + m]]);
        }
        pairs.push([A[(3 * k + 3) % 9], A[(3 * k + 4) % 9]]);
        pairs.push([A[(3 * k + 5) % 9], A[(3 * k + 6) % 9]]);
        pairs.push([A[(3 * k + 7) % 9], A[(3 * k + 8) % 9]]);

        pairs.push([B[(3 * k + 3) % 9], B[(3 * k + 4) % 9]]);
        pairs.push([B[(3 * k + 5) % 9], B[(3 * k + 6) % 9]]);
        pairs.push([B[(3 * k + 7) % 9], B[(3 * k + 8) % 9]]);
      };
      buildBlock(P0, P3);
      buildBlock(P1, P2);
      roundPairings.push(pairs);
    }

    const uefaMidDays: Array<'tue' | 'wed' | 'thu'> =
      competition === 'champions_league' ? ['tue', 'wed'] : ['wed', 'thu'];
    roundPairings.forEach((pairs, rIdx) => {
      const roundNum = rIdx + 1;
      const dateStr = leagueDates[rIdx] || uefaCal.uclLeagueDates[0];
      pairs.forEach(([homeId, awayId], mIdx) => {
        const slot = assignVariedMatchDaySlot(
          dateStr,
          mIdx,
          roundNum,
          roundPairings.length,
          `${competition}_${year}`,
          {
            keepLastRoundSimultaneous: true,
            allowFridayMonday: false,
            midweekDays: uefaMidDays,
            region: 'europe',
            fallbackTime: defaultKickoffTime,
          }
        );
        fixtures.push({
          id: `${prefix}_liga_r${roundNum}_m${mIdx}`,
          round: roundNum,
          competition,
          cupPhase: `Fase de Liga • Rodada ${roundNum}`,
          homeTeamId: homeId,
          awayTeamId: awayId,
          homeScore: null,
          awayScore: null,
          played: false,
          date: slot.date,
          time: slot.time,
        });
      });
    });
  } else if (teams.length === 36) {
    // Conference League: 6 Potes de 6 clubes (6 rodadas Out–Dez: 3 em casa + 3 fora contra 1 rival de cada Pote 1–6)
    const Q = Array.from({ length: 6 }, (_, p) => teams.slice(p * 6, (p + 1) * 6));
    const roundPairings: Array<Array<[string, string]>> = [];

    // Rodada 1 (confronto dentro do próprio pote: índices 0..2 mandantes vs 3..5 visitantes)
    const r1: Array<[string, string]> = [];
    for (let p = 0; p < 6; p++) {
      for (let m = 0; m < 3; m++) {
        r1.push([Q[p][m], Q[p][m + 3]]);
      }
    }
    roundPairings.push(r1);

    // Rodada 2 e Rodada 3 (ciclo dirigido 0->2->3->1->5->4->0: soma 1H + 1A em todos os potes)
    const addCrossPotRound = (potPairs: Array<[number, number]>, shift: number) => {
      const list: Array<[string, string]> = [];
      for (const [pa, pb] of potPairs) {
        for (let i = 0; i < 6; i++) {
          list.push([Q[pa][i], Q[pb][(i + shift) % 6]]);
        }
      }
      roundPairings.push(list);
    };

    addCrossPotRound([[0, 2], [3, 1], [5, 4]], 1); // Rodada 2
    addCrossPotRound([[2, 3], [1, 5], [4, 0]], 2); // Rodada 3
    addCrossPotRound([[0, 3], [4, 1], [2, 5]], 3); // Rodada 4
    addCrossPotRound([[3, 4], [1, 2], [5, 0]], 4); // Rodada 5

    // Rodada 6: pares restantes (0,1), (2,4), (3,5) invertendo mando por metade (3..5 mandantes vs 0..2 visitantes -> fecha 3H + 3A exatos!)
    const r6: Array<[string, string]> = [];
    for (const [pa, pb] of [[0, 1], [2, 4], [3, 5]] as Array<[number, number]>) {
      for (let m = 0; m < 3; m++) {
        r6.push([Q[pa][m + 3], Q[pb][m]]);
        r6.push([Q[pb][m + 3], Q[pa][m]]);
      }
    }
    roundPairings.push(r6);

    roundPairings.forEach((pairs, rIdx) => {
      const roundNum = rIdx + 1;
      const dateStr = uefaCal.ueclLeagueDates[rIdx] || uefaCal.ueclLeagueDates[0];
      pairs.forEach(([homeId, awayId], mIdx) => {
        const slot = assignVariedMatchDaySlot(
          dateStr,
          mIdx,
          roundNum,
          roundPairings.length,
          `${competition}_${year}`,
          {
            keepLastRoundSimultaneous: true,
            allowFridayMonday: false,
            midweekDays: ['wed', 'thu'],
            region: 'europe',
            fallbackTime: defaultKickoffTime,
          }
        );
        fixtures.push({
          id: `${prefix}_liga_r${roundNum}_m${mIdx}`,
          round: roundNum,
          competition,
          cupPhase: `Fase de Liga • Rodada ${roundNum}`,
          homeTeamId: homeId,
          awayTeamId: awayId,
          homeScore: null,
          awayScore: null,
          played: false,
          date: slot.date,
          time: slot.time,
        });
      });
    });
  }

  const baseKoRound = leagueRoundsCount;
  const koDayShift = competition === 'champions_league' ? 0 : 1; // Tue/Wed for UCL, Thu for UEL/UECL
  const shiftDateIfNeeded = (iso: string) => {
    if (koDayShift === 0) return iso;
    const [yy, mm, dd] = iso.split('-').map(Number);
    const dt = new Date(yy, mm - 1, dd + koDayShift);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
      dt.getDate()
    ).padStart(2, '0')}`;
  };

  // Playoffs do Mata-Mata (9º ao 24º colocados — Fevereiro do ano seguinte)
  const playoffsIdaDate = shiftDateIfNeeded(uefaCal.playoffsIdaDate);
  const playoffsVoltaDate = shiftDateIfNeeded(uefaCal.playoffsVoltaDate);
  for (let m = 0; m < 8; m++) {
    fixtures.push({
      id: `${prefix}_playoffs_m${m}_ida`,
      round: baseKoRound + 1,
      competition,
      cupPhase: 'Playoffs do Mata-Mata',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: playoffsIdaDate,
      time: defaultKickoffTime,
    });
    fixtures.push({
      id: `${prefix}_playoffs_m${m}_volta`,
      round: baseKoRound + 2,
      competition,
      cupPhase: 'Playoffs do Mata-Mata',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: playoffsVoltaDate,
      time: defaultKickoffTime,
    });
  }

  // Oitavas de Final (Top 8 direto + 8 vencedores dos Playoffs — Março do ano seguinte)
  const r16IdaDate = shiftDateIfNeeded(uefaCal.r16IdaDate);
  const r16VoltaDate = shiftDateIfNeeded(uefaCal.r16VoltaDate);
  for (let m = 0; m < 8; m++) {
    fixtures.push({
      id: `${prefix}_oitavas_m${m}_ida`,
      round: baseKoRound + 3,
      competition,
      cupPhase: 'Oitavas de Final',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: r16IdaDate,
      time: defaultKickoffTime,
    });
    fixtures.push({
      id: `${prefix}_oitavas_m${m}_volta`,
      round: baseKoRound + 4,
      competition,
      cupPhase: 'Oitavas de Final',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: r16VoltaDate,
      time: defaultKickoffTime,
    });
  }

  // Quartas de Final — Abril do ano seguinte
  const qfIdaDate = shiftDateIfNeeded(uefaCal.qfIdaDate);
  const qfVoltaDate = shiftDateIfNeeded(uefaCal.qfVoltaDate);
  for (let m = 0; m < 4; m++) {
    fixtures.push({
      id: `${prefix}_quartas_m${m}_ida`,
      round: baseKoRound + 5,
      competition,
      cupPhase: 'Quartas de Final',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfIdaDate,
      time: defaultKickoffTime,
    });
    fixtures.push({
      id: `${prefix}_quartas_m${m}_volta`,
      round: baseKoRound + 6,
      competition,
      cupPhase: 'Quartas de Final',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfVoltaDate,
      time: defaultKickoffTime,
    });
  }

  // Semifinais — Fim de Abril e Início de Maio do ano seguinte
  const semiIdaDate = shiftDateIfNeeded(uefaCal.semiIdaDate);
  const semiVoltaDate = shiftDateIfNeeded(uefaCal.semiVoltaDate);
  const semiPhaseTitle =
    competition === 'champions_league'
      ? 'Semifinal da Champions League'
      : competition === 'europa_league'
      ? 'Semifinal da Europa League'
      : 'Semifinal da Conference League';

  for (let s = 0; s < 2; s++) {
    fixtures.push({
      id: `${prefix}_semi_${s + 1}_ida`,
      round: baseKoRound + 7,
      competition,
      cupPhase: semiPhaseTitle,
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiIdaDate,
      time: defaultKickoffTime,
    });
    fixtures.push({
      id: `${prefix}_semi_${s + 1}_volta`,
      round: baseKoRound + 8,
      competition,
      cupPhase: semiPhaseTitle,
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiVoltaDate,
      time: defaultKickoffTime,
    });
  }

  // Grande Final — Jogo Único em Campo Neutro
  fixtures.push({
    id: finalFixtureId,
    round: baseKoRound + 9,
    competition,
    cupPhase: finalPhaseTitle,
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    stadiumName: finalStadiumName,
    date: finalDate,
    time: '17:00',
  });

  return { fixtures, standings };
}

/**
 * Generates UEFA Champions League (Formato atual: 36 clubes em Fase de Liga de 8 rodadas + Playoffs 9º–24º + Oitavas Top 8 + Quartas + Semifinal + Final Única)
 */
export function generateChampionsLeagueFixtures(
  clubs: Club[],
  year: number = 2026,
  explicitQualifiedIds?: string[],
  defendingChampId?: string
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const clubIds = new Set(clubs.map((c) => c.id));
  const baseline =
    explicitQualifiedIds && explicitQualifiedIds.length >= 36
      ? explicitQualifiedIds.filter((id) => clubIds.has(id)).slice(0, 36)
      : INITIAL_CHAMPIONS_LEAGUE_CLUB_IDS.filter((id) => clubIds.has(id)).length >= 36
      ? INITIAL_CHAMPIONS_LEAGUE_CLUB_IDS.filter((id) => clubIds.has(id)).slice(0, 36)
      : computeUefaContinentalQualifiers({
          clubs,
          uclTitleHolderId: defendingChampId || 'eu_psg',
        }).championsLeagueIds;

  const seeded36 = seedUefa36ClubsByCoefficient(
    baseline,
    clubs,
    defendingChampId || 'eu_psg'
  );

  const { uclFinalDate } = getUefaCompetitionCalendarDates(year);
  return build36ClubUefaLeagueCompetition({
    competition: 'champions_league',
    prefix: 'ucl',
    seededClubIds: seeded36,
    leagueRoundsCount: 8,
    year,
    finalFixtureId: 'ucl_final',
    finalPhaseTitle: 'Grande Final da UEFA Champions League',
    finalStadiumName: 'Estádio Metropolitano (Madrid)',
    finalDate: uclFinalDate,
    defaultKickoffTime: '16:00',
  });
}

/**
 * Generates UEFA Europa League (Formato atual: 36 clubes em Fase de Liga de 8 rodadas Set–Jan + Playoffs Fev + Oitavas Mar + Quartas Abr + Semifinal Mai + Final Única em Maio)
 */
export function generateEuropaLeagueFixtures(
  clubs: Club[],
  year: number = 2026,
  explicitQualifiedIds?: string[],
  defendingChampId?: string
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const clubIds = new Set(clubs.map((c) => c.id));
  const baseline =
    explicitQualifiedIds && explicitQualifiedIds.length >= 36
      ? explicitQualifiedIds.filter((id) => clubIds.has(id)).slice(0, 36)
      : INITIAL_EUROPA_LEAGUE_CLUB_IDS.filter((id) => clubIds.has(id)).length >= 36
      ? INITIAL_EUROPA_LEAGUE_CLUB_IDS.filter((id) => clubIds.has(id)).slice(0, 36)
      : computeUefaContinentalQualifiers({
          clubs,
          uelTitleHolderId: defendingChampId,
        }).europaLeagueIds;

  const seeded36 = seedUefa36ClubsByCoefficient(baseline, clubs, defendingChampId);

  const { uelFinalDate } = getUefaCompetitionCalendarDates(year);
  return build36ClubUefaLeagueCompetition({
    competition: 'europa_league',
    prefix: 'uel',
    seededClubIds: seeded36,
    leagueRoundsCount: 8,
    year,
    finalFixtureId: 'uel_final',
    finalPhaseTitle: 'Grande Final da UEFA Europa League',
    finalStadiumName: 'Waldstadion (Frankfurt)',
    finalDate: uelFinalDate,
    defaultKickoffTime: '16:00',
  });
}

/**
 * Generates UEFA Conference League (Formato atual: 36 clubes em Fase de Liga de 6 rodadas Out–Dez + Playoffs Fev + Oitavas Mar + Quartas Abr + Semifinal Mai + Final Única em Maio)
 */
export function generateConferenceLeagueFixtures(
  clubs: Club[],
  year: number = 2026,
  explicitQualifiedIds?: string[],
  defendingChampId?: string
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const clubIds = new Set(clubs.map((c) => c.id));
  const baseline =
    explicitQualifiedIds && explicitQualifiedIds.length >= 36
      ? explicitQualifiedIds.filter((id) => clubIds.has(id)).slice(0, 36)
      : INITIAL_CONFERENCE_LEAGUE_CLUB_IDS.filter((id) => clubIds.has(id)).length >= 36
      ? INITIAL_CONFERENCE_LEAGUE_CLUB_IDS.filter((id) => clubIds.has(id)).slice(0, 36)
      : computeUefaContinentalQualifiers({
          clubs,
          ueclTitleHolderId: defendingChampId,
        }).conferenceLeagueIds;

  const seeded36 = seedUefa36ClubsByCoefficient(baseline, clubs, defendingChampId);

  const { ueclFinalDate } = getUefaCompetitionCalendarDates(year);
  return build36ClubUefaLeagueCompetition({
    competition: 'conference_league',
    prefix: 'uecl',
    seededClubIds: seeded36,
    leagueRoundsCount: 6,
    year,
    finalFixtureId: 'uecl_final',
    finalPhaseTitle: 'Grande Final da UEFA Conference League',
    finalStadiumName: 'Beşiktaş Stadium (Istambul)',
    finalDate: ueclFinalDate,
    defaultKickoffTime: '16:00',
  });
}

function resolveEstadualParticipants(
  cfg: EstadualCompetitionConfig,
  clubs: Club[],
  clubById: Map<string, Club>
): Club[] {
  const divOrder: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, EST: 5 };
  const selected: Club[] = [];
  const used = new Set<string>();

  for (const cid of cfg.defaultClubIds) {
    const c = clubById.get(cid);
    if (c && c.state === cfg.uf && ['A', 'B', 'C', 'D', 'EST'].includes(c.division)) {
      selected.push(c);
      used.add(c.id);
    }
  }

  // Fill any missing slots from clubs of the same UF
  if (selected.length < cfg.clubsCount) {
    const extras = clubs
      .filter(
        (c) =>
          c.state === cfg.uf &&
          ['A', 'B', 'C', 'D', 'EST'].includes(c.division) &&
          !used.has(c.id)
      )
      .sort((a, b) => {
        const d = (divOrder[a.division] || 6) - (divOrder[b.division] || 6);
        if (d !== 0) return d;
        return b.reputation - a.reputation;
      });
    for (const ex of extras) {
      if (selected.length >= cfg.clubsCount) break;
      selected.push(ex);
      used.add(ex.id);
    }
  }

  const participants = selected.slice(0, cfg.clubsCount);

  // Guarantee that if the user controls a club from this UF, it participates in its State Championship
  const userStateClub = clubs.find(
    (c) => c.isUser && c.state === cfg.uf && ['A', 'B', 'C', 'D', 'EST'].includes(c.division)
  );
  if (userStateClub && !participants.some((p) => p.id === userStateClub.id) && participants.length > 0) {
    participants[participants.length - 1] = userStateClub;
  }

  return participants;
}

function getEstadualQfTiesCount(cfg: EstadualCompetitionConfig): number {
  if (cfg.qfLegs === 0) return 0;
  switch (cfg.knockoutModel) {
    case 'TOP8_OVERALL_QF':
    case 'TOP4_PER_GROUP_QF':
      return 4;
    case 'TOP1_BYE_2TO7_QF':
      return 3;
    case 'TOP2_BYE_3TO6_QF':
    case 'TWO_GROUPS_TOP1_BYE_2TO3_QF':
      return 2;
    default:
      return 0;
  }
}

/**
 * Generates all 27 Official Brazilian State Championships (Campeonatos Estaduais 2026)
 * starting January 15, preserving Campeonato Potiguar (RN) identically while implementing
 * the real 2026 formats for the other 26 Federations.
 */
export function generateEstadualFixtures(clubs: Club[], year: number = 2026): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const fixtures: Fixture[] = [];
  const standings: Standing[] = [];
  const clubById = new Map<string, Club>(clubs.map((c) => [c.id, c]));

  for (const cfg of ESTADUAIS_2026_CONFIG) {
    const participants = resolveEstadualParticipants(cfg, clubs, clubById);
    if (participants.length < 4) continue;

    const participantIds = participants.map((c) => c.id);
    const participantSet = new Set(participantIds);
    const stateName = cfg.name;
    const key = cfg.key;

    // Resolve sub-groups if applicable (RJ, MG, RS, PR, SC, CE, PA, AM)
    const subGroupByTeam = new Map<string, string>();
    const resolvedSubGroups: Array<{ label: string; teamIds: string[] }> = [];
    if (cfg.groups && cfg.groups.length >= 2) {
      const assignedInSub = new Set<string>();
      for (const grp of cfg.groups) {
        const validIds = grp.clubIds.filter((id) => participantSet.has(id));
        validIds.forEach((id) => assignedInSub.add(id));
        resolvedSubGroups.push({ label: grp.groupLabel, teamIds: [...validIds] });
      }
      // Distribute any swapped/promoted UF clubs into whichever sub-group has fewer clubs
      const targetPerGroup = Math.ceil(participantIds.length / cfg.groups.length);
      for (const pid of participantIds) {
        if (assignedInSub.has(pid)) continue;
        const targetGrp =
          resolvedSubGroups.find((g) => g.teamIds.length < targetPerGroup) ||
          resolvedSubGroups[resolvedSubGroups.length - 1];
        if (targetGrp) {
          targetGrp.teamIds.push(pid);
          assignedInSub.add(pid);
        }
      }
      resolvedSubGroups.forEach((g) => {
        g.teamIds.forEach((id) => subGroupByTeam.set(id, g.label));
      });
    }

    // Create Standings entries
    participantIds.forEach((tId) => {
      standings.push({
        teamId: tId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
        group: stateName,
        subGroup: subGroupByTeam.get(tId),
      });
    });

    const sched = getEstadualTournamentScheduleDates(
      year,
      cfg.firstPhaseRounds,
      cfg.qfLegs,
      cfg.sfLegs,
      cfg.finalLegs
    );

    const minEstDate = getSeasonStartDate(year);
    const pushFirstPhaseRound = (roundNum: number, pairs: Array<[string, string]>) => {
      const dStr =
        sched.groupDates[roundNum - 1] || sched.groupDates[sched.groupDates.length - 1];
      const prevDate = roundNum > 1 ? sched.groupDates[roundNum - 2] : undefined;
      const nextDate = roundNum < sched.groupDates.length ? sched.groupDates[roundNum] : undefined;
      pairs.forEach(([homeTeamId, awayTeamId], mIdx) => {
        const slot = assignVariedMatchDaySlot(
          dStr,
          mIdx,
          roundNum,
          sched.groupDates.length,
          `est_${key}_${year}`,
          {
            keepLastRoundSimultaneous: true,
            minDate: minEstDate,
            maxDate: `${year}-04-15`,
            prevRoundBaseDate: prevDate,
            nextRoundBaseDate: nextDate,
            region: 'south_america',
            fallbackTime: mIdx % 3 === 0 ? '16:00' : mIdx % 3 === 1 ? '18:30' : '20:30',
          }
        );
        fixtures.push({
          id: `est_${key}_r${roundNum}_m${mIdx}`,
          round: roundNum,
          competition: 'estadual',
          groupName: stateName,
          cupPhase: `${stateName} • Rodada ${roundNum}`,
          homeTeamId,
          awayTeamId,
          homeScore: null,
          awayScore: null,
          played: false,
          date: slot.date,
          time: slot.time,
        });
      });
    };

    // 1ª Fase Fixture Generation according to official 2026 State Format
    if (
      cfg.firstPhaseModel === 'TWO_GROUPS_CROSS' &&
      resolvedSubGroups.length === 2 &&
      resolvedSubGroups[0].teamIds.length === resolvedSubGroups[1].teamIds.length
    ) {
      const gA = resolvedSubGroups[0].teamIds;
      const gB = resolvedSubGroups[1].teamIds;
      const k = gA.length; // 6 for RJ/RS/PR/SC/PA, 5 for CE
      const rounds = Math.min(cfg.firstPhaseRounds, k);
      for (let r = 0; r < rounds; r++) {
        const pairs: Array<[string, string]> = [];
        for (let m = 0; m < k; m++) {
          const teamA = gA[m];
          const teamB = gB[(m + r) % k];
          const swap = (m + r) % 2 === 1;
          pairs.push(swap ? [teamB, teamA] : [teamA, teamB]);
        }
        pushFirstPhaseRound(r + 1, pairs);
      }
    } else if (
      cfg.firstPhaseModel === 'THREE_GROUPS_CROSS_8R' &&
      resolvedSubGroups.length === 3 &&
      resolvedSubGroups.every((g) => g.teamIds.length === 4)
    ) {
      // Exact 1-factorization of K_{4,4,4}: 8 rounds, 6 matches/round, each club faces the 8 clubs outside its group (4H / 4A)
      const A = resolvedSubGroups[0].teamIds;
      const B = resolvedSubGroups[1].teamIds;
      const C = resolvedSubGroups[2].teamIds;
      const A0: [string, string] = [A[0], A[1]];
      const A1: [string, string] = [A[2], A[3]];
      const B0: [string, string] = [B[0], B[1]];
      const B1: [string, string] = [B[2], B[3]];
      const C0: [string, string] = [C[0], C[1]];
      const C1: [string, string] = [C[2], C[3]];

      const blocks: Array<Array<[[string, string], [string, string]]>> = [
        [
          [A0, B0],
          [B1, C0],
          [C1, A1],
        ],
        [
          [A0, B1],
          [B0, C1],
          [C0, A1],
        ],
        [
          [A0, C0],
          [B0, A1],
          [C1, B1],
        ],
        [
          [A0, C1],
          [B1, A1],
          [C0, B0],
        ],
      ];

      let roundCounter = 1;
      for (const block of blocks) {
        const rOddPairs: Array<[string, string]> = [];
        const rEvenPairs: Array<[string, string]> = [];
        for (const [X, Y] of block) {
          rOddPairs.push([X[0], Y[0]], [X[1], Y[1]]);
          rEvenPairs.push([Y[0], X[1]], [Y[1], X[0]]);
        }
        pushFirstPhaseRound(roundCounter++, rOddPairs);
        pushFirstPhaseRound(roundCounter++, rEvenPairs);
      }
    } else {
      // Berger Round-Robin (covers SINGLE_ROUND_ROBIN, SINGLE_TABLE_POT_8R, TWO_GROUPS_FULL_7R)
      const rrTeams = [...participantIds];
      if (rrTeams.length % 2 !== 0) {
        rrTeams.push('__BYE__');
      }
      const n = rrTeams.length;
      const half = n / 2;
      const maxBergerRounds = n - 1;
      const roundsToPlay = Math.min(cfg.firstPhaseRounds, maxBergerRounds);
      const rotation = rrTeams.slice(1);

      for (let r = 0; r < roundsToPlay; r++) {
        const currentOrder = [rrTeams[0], ...rotation];
        const pairs: Array<[string, string]> = [];
        for (let m = 0; m < half; m++) {
          const t1 = currentOrder[m];
          const t2 = currentOrder[n - 1 - m];
          if (t1 === '__BYE__' || t2 === '__BYE__') continue;
          const swapHome = (r + m) % 2 === 1;
          pairs.push(swapHome ? [t2, t1] : [t1, t2]);
        }
        pushFirstPhaseRound(r + 1, pairs);
        const last = rotation.pop()!;
        rotation.unshift(last);
      }
    }

    // 2ª Fase / Quartas de Final
    let nextRoundNum = cfg.firstPhaseRounds + 1;
    const qfTiesCount = getEstadualQfTiesCount(cfg);
    if (qfTiesCount > 0 && cfg.qfLegs === 1) {
      const qfDate = sched.qfDates[0] || sched.sfDates[0];
      for (let q = 0; q < qfTiesCount; q++) {
        fixtures.push({
          id: `est_qf_${key}_m${q}`,
          round: nextRoundNum,
          competition: 'estadual',
          groupName: stateName,
          cupPhase: `${stateName} • Quartas de Final`,
          homeTeamId: 'tbd',
          awayTeamId: 'tbd',
          homeScore: null,
          awayScore: null,
          played: false,
          date: qfDate,
          time: q % 2 === 0 ? '16:00' : '19:00',
        });
      }
      nextRoundNum += 1;
    } else if (qfTiesCount > 0 && cfg.qfLegs === 2) {
      const qfIdaDate = sched.qfDates[0];
      const qfVoltaDate = sched.qfDates[1] || sched.qfDates[0];
      for (let q = 0; q < qfTiesCount; q++) {
        fixtures.push({
          id: `est_qf_${key}_m${q}_ida`,
          round: nextRoundNum,
          competition: 'estadual',
          groupName: stateName,
          cupPhase: `${stateName} • Quartas de Final`,
          leg: 1,
          homeTeamId: 'tbd',
          awayTeamId: 'tbd',
          homeScore: null,
          awayScore: null,
          played: false,
          date: qfIdaDate,
          time: q % 2 === 0 ? '16:00' : '19:00',
        });
        fixtures.push({
          id: `est_qf_${key}_m${q}_volta`,
          round: nextRoundNum + 1,
          competition: 'estadual',
          groupName: stateName,
          cupPhase: `${stateName} • Quartas de Final`,
          leg: 2,
          homeTeamId: 'tbd',
          awayTeamId: 'tbd',
          homeScore: null,
          awayScore: null,
          played: false,
          date: qfVoltaDate,
          time: q % 2 === 0 ? '16:00' : '19:00',
        });
      }
      nextRoundNum += 2;
    }

    // Semifinais (2 confrontos)
    if (cfg.sfLegs === 1) {
      const sfDate = sched.sfDates[0];
      for (let s = 0; s < 2; s++) {
        fixtures.push({
          id: `est_semi_${key}_m${s}`,
          round: nextRoundNum,
          competition: 'estadual',
          groupName: stateName,
          cupPhase: `${stateName} • Semifinal`,
          homeTeamId: 'tbd',
          awayTeamId: 'tbd',
          homeScore: null,
          awayScore: null,
          played: false,
          date: sfDate,
          time: s === 0 ? '16:00' : '19:30',
        });
      }
      nextRoundNum += 1;
    } else {
      const sfIdaDate = sched.sfDates[0];
      const sfVoltaDate = sched.sfDates[1] || sched.sfDates[0];
      for (let s = 0; s < 2; s++) {
        fixtures.push({
          id: `est_semi_${key}_m${s}_ida`,
          round: nextRoundNum,
          competition: 'estadual',
          groupName: stateName,
          cupPhase: `${stateName} • Semifinal`,
          leg: 1,
          homeTeamId: 'tbd',
          awayTeamId: 'tbd',
          homeScore: null,
          awayScore: null,
          played: false,
          date: sfIdaDate,
          time: s === 0 ? '16:00' : '19:30',
        });
        fixtures.push({
          id: `est_semi_${key}_m${s}_volta`,
          round: nextRoundNum + 1,
          competition: 'estadual',
          groupName: stateName,
          cupPhase: `${stateName} • Semifinal`,
          leg: 2,
          homeTeamId: 'tbd',
          awayTeamId: 'tbd',
          homeScore: null,
          awayScore: null,
          played: false,
          date: sfVoltaDate,
          time: s === 0 ? '16:00' : '19:30',
        });
      }
      nextRoundNum += 2;
    }

    // Grande Final
    if (cfg.finalLegs === 1) {
      fixtures.push({
        id: `est_final_${key}`,
        round: nextRoundNum,
        competition: 'estadual',
        groupName: stateName,
        cupPhase: `${stateName} • Final`,
        homeTeamId: 'tbd',
        awayTeamId: 'tbd',
        homeScore: null,
        awayScore: null,
        played: false,
        stadiumName: cfg.finalStadiumName,
        date: sched.finalDates[0],
        time: '16:00',
      });
    } else {
      fixtures.push({
        id: `est_final_${key}_ida`,
        round: nextRoundNum,
        competition: 'estadual',
        groupName: stateName,
        cupPhase: `${stateName} • Final`,
        leg: 1,
        homeTeamId: 'tbd',
        awayTeamId: 'tbd',
        homeScore: null,
        awayScore: null,
        played: false,
        stadiumName: cfg.finalStadiumName,
        date: sched.finalDates[0],
        time: '16:00',
      });
      fixtures.push({
        id: `est_final_${key}_volta`,
        round: nextRoundNum + 1,
        competition: 'estadual',
        groupName: stateName,
        cupPhase: `${stateName} • Final`,
        leg: 2,
        homeTeamId: 'tbd',
        awayTeamId: 'tbd',
        homeScore: null,
        awayScore: null,
        played: false,
        stadiumName: cfg.finalStadiumName,
        date: sched.finalDates[1] || sched.finalDates[0],
        time: '16:00',
      });
    }
  }

  return { fixtures, standings };
}

function build16ClubRegionalCupCompetition(params: {
  competition: 'copa_nordeste' | 'copa_verde';
  prefix: 'cne' | 'cv';
  groupAName: string;
  groupBName: string;
  groupAIds: string[];
  groupBIds: string[];
  finalPhaseTitle: string;
  year: number;
}): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const {
    competition,
    prefix,
    groupAName,
    groupBName,
    groupAIds,
    groupBIds,
    finalPhaseTitle,
    year,
  } = params;
  const fixtures: Fixture[] = [];
  const standings: Standing[] = [];
  const regionalDates = getCopaNordesteScheduleDates(year);

  const buildGroupSchedule = (grpKey: 'ga' | 'gb', grpName: string, gTeams: string[]) => {
    gTeams.forEach((tId) => {
      standings.push({
        teamId: tId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
        group: grpName,
      });
    });

    const teams = [...gTeams];
    if (teams.length % 2 !== 0) teams.push('__BYE__');
    const n = teams.length;
    const half = n / 2;
    const roundsCount = Math.min(regionalDates.groupDates.length, n - 1);
    const rotation = teams.slice(1);

    const minRegDate = getSeasonStartDate(year);
    for (let r = 0; r < roundsCount; r++) {
      const roundNum = r + 1;
      const dStr = regionalDates.groupDates[r];
      const prevDate = r > 0 ? regionalDates.groupDates[r - 1] : undefined;
      const nextDate = r + 1 < roundsCount ? regionalDates.groupDates[r + 1] : undefined;
      const currentOrder = [teams[0], ...rotation];

      for (let m = 0; m < half; m++) {
        const t1 = currentOrder[m];
        const t2 = currentOrder[n - 1 - m];
        if (t1 === '__BYE__' || t2 === '__BYE__') continue;

        const swapHome = (r + m) % 2 === 1;
        const slot = assignVariedMatchDaySlot(
          dStr,
          m + (grpKey === 'gb' ? 4 : 0),
          roundNum,
          roundsCount,
          `${prefix}_${year}`,
          {
            keepLastRoundSimultaneous: true,
            minDate: minRegDate,
            maxDate: `${year}-07-15`,
            prevRoundBaseDate: prevDate,
            nextRoundBaseDate: nextDate,
            region: 'south_america',
            fallbackTime: m % 2 === 0 ? '19:30' : '21:30',
          }
        );
        fixtures.push({
          id: `${prefix}_${grpKey}_r${roundNum}_m${m}`,
          round: roundNum,
          competition,
          groupName: grpName,
          cupPhase: `${grpName} • Rodada ${roundNum}`,
          homeTeamId: swapHome ? t2 : t1,
          awayTeamId: swapHome ? t1 : t2,
          homeScore: null,
          awayScore: null,
          played: false,
          date: slot.date,
          time: slot.time,
        });
      }

      const last = rotation.pop()!;
      rotation.unshift(last);
    }
  };

  buildGroupSchedule('ga', groupAName, groupAIds);
  buildGroupSchedule('gb', groupBName, groupBIds);

  // Quartas de Final (Ida e Volta, Rodadas 8 e 9)
  for (let q = 0; q < 4; q++) {
    fixtures.push({
      id: `${prefix}_qf_m${q}_ida`,
      round: 8,
      competition,
      cupPhase: 'Quartas de Final',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: regionalDates.qfIdaDate,
      time: q % 2 === 0 ? '19:30' : '21:30',
    });
    fixtures.push({
      id: `${prefix}_qf_m${q}_volta`,
      round: 9,
      competition,
      cupPhase: 'Quartas de Final',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: regionalDates.qfVoltaDate,
      time: q % 2 === 0 ? '19:30' : '21:30',
    });
  }

  // Semifinal (Ida e Volta, Rodadas 10 e 11)
  for (let s = 0; s < 2; s++) {
    fixtures.push({
      id: `${prefix}_semi_m${s}_ida`,
      round: 10,
      competition,
      cupPhase: 'Semifinal',
      leg: 1,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: regionalDates.semiIdaDate,
      time: '21:30',
    });
    fixtures.push({
      id: `${prefix}_semi_m${s}_volta`,
      round: 11,
      competition,
      cupPhase: 'Semifinal',
      leg: 2,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: regionalDates.semiVoltaDate,
      time: '21:30',
    });
  }

  // Grande Final (Ida e Volta, Rodadas 12 e 13)
  fixtures.push({
    id: `${prefix}_final_ida`,
    round: 12,
    competition,
    cupPhase: finalPhaseTitle,
    leg: 1,
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: regionalDates.finalIdaDate,
    time: '21:30',
  });
  fixtures.push({
    id: `${prefix}_final_volta`,
    round: 13,
    competition,
    cupPhase: finalPhaseTitle,
    leg: 2,
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeScore: null,
    awayScore: null,
    played: false,
    date: regionalDates.finalVoltaDate,
    time: '21:30',
  });

  return { fixtures, standings };
}

/**
 * Generates Copa do Nordeste (`copa_nordeste`):
 * 16 clubes classificados dos 9 Estados do Nordeste (BA:3, PE:2, CE:2, AL:2, RN:2, MA:2, PB:1, SE:1, PI:1)
 * divididos em Grupo A (8 clubes) e Grupo B (8 clubes) com 7 rodadas + Quartas, Semifinal e Final em Ida e Volta!
 */
export function generateCopaNordesteFixtures(
  clubs: Club[],
  year: number = 2026,
  explicitQualifiedIds?: string[]
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const divOrder: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, EST: 5 };
  const clubById = new Map<string, Club>(clubs.map((c) => [c.id, c]));
  const selectedIds: string[] = [];
  const used = new Set<string>();
  const addId = (id?: string) => {
    if (!id || used.has(id) || !clubById.has(id)) return false;
    selectedIds.push(id);
    used.add(id);
    return true;
  };

  if (explicitQualifiedIds && explicitQualifiedIds.length >= 10) {
    for (const qId of explicitQualifiedIds) {
      if (selectedIds.length >= 16) break;
      addId(qId);
    }
  } else if (explicitQualifiedIds && explicitQualifiedIds.length > 0) {
    // Legacy RN-only qualifier array
    explicitQualifiedIds.slice(0, 2).forEach((id) => addId(id));
  }

  // Fill exact CBF Copa do Nordeste state quotas across all 9 NE states
  for (const cfg of ESTADUAIS_2026_CONFIG) {
    if (cfg.copaNordesteSpots <= 0) continue;
    const countFromState = selectedIds.filter((id) => clubById.get(id)?.state === cfg.uf).length;
    let needed = Math.max(0, cfg.copaNordesteSpots - countFromState);
    if (needed === 0) continue;

    if (cfg.uf === 'RN') {
      for (const rnId of ['abc', 'arn']) {
        if (needed <= 0) break;
        if (addId(rnId)) needed -= 1;
      }
    }

    const candidates = clubs
      .filter((c) => c.state === cfg.uf && ['A', 'B', 'C', 'D', 'EST'].includes(c.division))
      .sort((a, b) => {
        const d = (divOrder[a.division] || 5) - (divOrder[b.division] || 5);
        if (d !== 0) return d;
        if (b.reputation !== a.reputation) return b.reputation - a.reputation;
        return b.stadium.capacity - a.stadium.capacity;
      });
    for (const c of candidates) {
      if (needed <= 0 || selectedIds.length >= 16) break;
      if (addId(c.id)) needed -= 1;
    }
  }

  if (selectedIds.length < 8) {
    return { fixtures: [], standings: [] };
  }

  const groupAIds: string[] = [];
  const groupBIds: string[] = [];
  selectedIds.slice(0, 16).forEach((id, idx) => {
    if (idx % 2 === 0) groupAIds.push(id);
    else groupBIds.push(id);
  });

  return build16ClubRegionalCupCompetition({
    competition: 'copa_nordeste',
    prefix: 'cne',
    groupAName: 'Grupo A',
    groupBName: 'Grupo B',
    groupAIds,
    groupBIds,
    finalPhaseTitle: 'Final da Copa do Nordeste',
    year,
  });
}

/**
 * Generates Copa Verde (`copa_verde`):
 * 16 clubes classificados dos 12 Estados do Norte, Centro-Oeste e Espírito Santo:
 * - Grupo Norte (8 clubes): PA (2), AM (1), TO (1), AC (1), RO (1), RR (1), AP (1)
 * - Grupo Centro-Oeste (8 clubes): GO (2), MT (2), DF (2), ES (1), MS (1)
 * 7 rodadas + Quartas, Semifinal e Final em Ida e Volta (campeão garante vaga na 3ª Fase da Copa do Brasil!).
 */
export function generateCopaVerdeFixtures(
  clubs: Club[],
  year: number = 2026,
  explicitQualifiedIds?: string[]
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const divOrder: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, EST: 5 };
  const clubById = new Map<string, Club>(clubs.map((c) => [c.id, c]));
  const northUfs = new Set(['PA', 'AM', 'TO', 'AC', 'RO', 'RR', 'AP']);

  const northIds: string[] = [];
  const centerWestIds: string[] = [];
  const used = new Set<string>();

  const pushToBlock = (id?: string) => {
    if (!id || used.has(id)) return false;
    const club = clubById.get(id);
    if (!club) return false;
    if (northUfs.has(club.state)) {
      if (northIds.length >= 8) return false;
      northIds.push(id);
      used.add(id);
      return true;
    }
    if (centerWestIds.length >= 8) return false;
    centerWestIds.push(id);
    used.add(id);
    return true;
  };

  if (explicitQualifiedIds && explicitQualifiedIds.length > 0) {
    for (const qId of explicitQualifiedIds) {
      pushToBlock(qId);
    }
  }

  for (const cfg of ESTADUAIS_2026_CONFIG) {
    if (cfg.copaVerdeSpots <= 0) continue;
    const blockArr = northUfs.has(cfg.uf) ? northIds : centerWestIds;
    const currentFromUf = blockArr.filter((id) => clubById.get(id)?.state === cfg.uf).length;
    let needed = Math.max(0, cfg.copaVerdeSpots - currentFromUf);
    if (needed === 0) continue;

    const candidates = clubs
      .filter((c) => c.state === cfg.uf && ['A', 'B', 'C', 'D', 'EST'].includes(c.division))
      .sort((a, b) => {
        const d = (divOrder[a.division] || 5) - (divOrder[b.division] || 5);
        if (d !== 0) return d;
        if (b.reputation !== a.reputation) return b.reputation - a.reputation;
        return b.stadium.capacity - a.stadium.capacity;
      });
    for (const c of candidates) {
      if (needed <= 0) break;
      if (pushToBlock(c.id)) needed -= 1;
    }
  }

  if (northIds.length < 4 || centerWestIds.length < 4) {
    return { fixtures: [], standings: [] };
  }

  return build16ClubRegionalCupCompetition({
    competition: 'copa_verde',
    prefix: 'cv',
    groupAName: 'Grupo Norte',
    groupBName: 'Grupo Centro-Oeste',
    groupAIds: northIds.slice(0, 8),
    groupBIds: centerWestIds.slice(0, 8),
    finalPhaseTitle: 'Final da Copa Verde',
    year,
  });
}

/**
 * Generates Champions Internacional FIFA (`copa_internacional`):
 * 32 qualified clubs across América do Norte (EUA/México), Ásia & Rússia (Arábia Saudita/Japão/Rússia)
 * e África (Egito/Marrocos) in 8 groups (Grupo A–H) + Oitavas, Quartas, Semifinal e Grande Final Única.
 * The champion qualifies for December's Copa Intercontinental FIFA (Mundial de Clubes).
 */
export function generateCopaInternacionalFixtures(
  clubs: Club[],
  year: number = 2026,
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>,
  defendingChampId?: string
): {
  fixtures: Fixture[];
  standings: Standing[];
} {
  const worldClubs = clubs.filter((c) => c.division === 'WL');
  if (worldClubs.length < 32) {
    return { fixtures: [], standings: [] };
  }

  const qualifiers = computeWorldInternationalQualifiers(
    clubs,
    standingsWorldLeagues,
    defendingChampId
  );

  const clubSet = new Set(worldClubs.map((c) => c.id));
  const qualifiedIds = qualifiers.copaInternacionalClubIds.filter((id) => clubSet.has(id));

  // Fill up to 32 if needed
  if (qualifiedIds.length < 32) {
    const sortedFallback = [...worldClubs]
      .sort((a, b) => b.reputation - a.reputation || b.stadium.capacity - a.stadium.capacity)
      .map((c) => c.id);
    for (const cid of sortedFallback) {
      if (qualifiedIds.length >= 32) break;
      if (!qualifiedIds.includes(cid)) {
        qualifiedIds.push(cid);
      }
    }
  }

  const seededGroups = seedContinentalGroupsWithCountryProtection(
    qualifiedIds.slice(0, 32),
    clubs,
    defendingChampId
  );

  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const groups: Record<string, string[]> = {};
  groupLetters.forEach((letter, idx) => {
    groups[`Grupo ${letter}`] = seededGroups[idx] || [];
  });

  const { sulamericanaFinalDate } = getContinentalFinalDates(year);
  return build32ClubContinentalCompetition(
    'copa_internacional',
    'cint',
    groups,
    year,
    'cint_final',
    'Grande Final da Champions Internacional',
    'King Abdullah Sports City (Jeddah)',
    sulamericanaFinalDate,
    '20:00'
  );
}

// ==============================================================================
// ESTRUTURAÇÃO DO CALENDÁRIO DAS COPAS SUL-AMERICANAS (ZERO COLISÃO COM LIGAS)
// ==============================================================================

/**
 * Mapeamento oficial entre cada Copa/Supercopa Sul-Americana e a respectiva Liga Nacional correspondente
 */
export const SOUTH_AMERICAN_CUP_TO_LEAGUE: Record<SouthAmericanCupId, SouthAmericanLeagueId> = {
  sa_copa_argentina: 'liga_arg',
  sa_supercopa_argentina: 'liga_arg',
  sa_copa_colombia: 'liga_col',
  sa_superliga_colombia: 'liga_col',
  sa_copa_uruguay: 'liga_uru',
  sa_supercopa_uruguay: 'liga_uru',
  sa_copa_ecuador: 'liga_equ',
  sa_supercopa_ecuador: 'liga_equ',
  sa_copa_chile: 'liga_chi',
  sa_supercopa_chile: 'liga_chi',
  sa_copa_paraguay: 'liga_par',
  sa_supercopa_paraguay: 'liga_par',
  sa_copa_peru: 'liga_per',
  sa_supercopa_peru: 'liga_per',
  sa_copa_bolivia: 'liga_bol',
  sa_supercopa_bolivia: 'liga_bol',
  sa_copa_venezuela: 'liga_ven',
  sa_supercopa_venezuela: 'liga_ven',
};

export const SOUTH_AMERICAN_CUP_COUNTRY_NAMES: Record<SouthAmericanCupId, string> = {
  sa_copa_argentina: 'Argentina',
  sa_supercopa_argentina: 'Argentina',
  sa_copa_colombia: 'Colômbia',
  sa_superliga_colombia: 'Colômbia',
  sa_copa_uruguay: 'Uruguai',
  sa_supercopa_uruguay: 'Uruguai',
  sa_copa_ecuador: 'Equador',
  sa_supercopa_ecuador: 'Equador',
  sa_copa_chile: 'Chile',
  sa_supercopa_chile: 'Chile',
  sa_copa_paraguay: 'Paraguai',
  sa_supercopa_paraguay: 'Paraguai',
  sa_copa_peru: 'Peru',
  sa_supercopa_peru: 'Peru',
  sa_copa_bolivia: 'Bolívia',
  sa_supercopa_bolivia: 'Bolívia',
  sa_copa_venezuela: 'Venezuela',
  sa_supercopa_venezuela: 'Venezuela',
};

export interface SouthAmericanCupPhaseSchedule {
  cupId: SouthAmericanCupId;
  competitionName: string;
  country: string;
  leagueId: SouthAmericanLeagueId;
  seasonYear: number;
  datesByPhase: Record<string, string[]>;
  allScheduledDates: string[];
}

/**
 * Obtém todas as datas ocupadas pela liga nacional indicada no ano da temporada.
 * Se fixtures da liga forem fornecidas, extrai suas datas reais; caso contrário,
 * computa as datas oficiais da temporada via getRoundDate para garantir zero colisão.
 */
export function getSouthAmericanLeagueOccupiedDates(
  leagueId: SouthAmericanLeagueId,
  seasonYear: number = 2026,
  existingLeagueFixtures: Fixture[] = []
): Set<string> {
  const dates = new Set<string>();

  const matchesForLeague = existingLeagueFixtures.filter(
    (f) => f.competition === leagueId && f.date
  );
  if (matchesForLeague.length > 0) {
    for (const f of matchesForLeague) {
      if (f.date) dates.add(f.date);
    }
  } else {
    const meta = SOUTH_AMERICAN_LEAGUES_META[leagueId];
    const totalRounds = meta ? meta.totalRounds : 30;
    for (let r = 1; r <= totalRounds; r++) {
      const slot =
        totalRounds <= 1
          ? 1
          : Math.max(1, Math.min(38, Math.round(1 + ((r - 1) * 37) / (totalRounds - 1))));
      const roundDateInfo = getRoundDate(slot, seasonYear);
      dates.add(roundDateInfo.date);
    }
  }

  return dates;
}

/**
 * Busca uma data segura (meio de semana: quarta ou terça/quinta) no mês desejado que:
 * 1. Não coincida com nenhuma data de jogo da liga nacional correspondente;
 * 2. Mantenha intervalo seguro de descanso (pelo menos 48h) em relação aos jogos de fim de semana da liga;
 * 3. Não caia em nenhuma pausa oficial de Data FIFA / torneio de seleções para a América do Sul;
 * 4. Não esteja no conjunto de datas já bloqueadas/usadas na mesma copa.
 */
export function findNonCollidingMidweekDate(params: {
  seasonYear: number;
  targetMonth: number; // 1 = Jan, 12 = Dez
  startDayOfMonth?: number;
  preferredDayOfWeek?: number; // 3 = Quarta-feira (padrão de copas), 2 = Terça, 4 = Quinta
  leagueOccupiedDates?: Set<string>;
  blockedDates?: Set<string>;
}): string {
  const {
    seasonYear,
    targetMonth,
    startDayOfMonth = 1,
    preferredDayOfWeek = 3, // Quarta-feira
    leagueOccupiedDates = new Set(),
    blockedDates = new Set(),
  } = params;

  const daysInMonth = new Date(seasonYear, targetMonth, 0).getDate();

  // 1ª Tentativa: busca o dia da semana preferido (Quarta-feira)
  for (let d = startDayOfMonth; d <= daysInMonth; d++) {
    const candidateDate = new Date(seasonYear, targetMonth - 1, d);
    if (candidateDate.getDay() !== preferredDayOfWeek) continue;

    const dateStr = `${seasonYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (blockedDates.has(dateStr)) continue;
    if (leagueOccupiedDates.has(dateStr)) continue;

    // Respeita pausa de Data FIFA na América do Sul
    if (isDateInFifaPause(dateStr, 'south_america')) continue;

    // Verifica intervalo de descanso de pelo menos 48h com jogos da liga
    const prevDay = addDays(dateStr, -1);
    const nextDay = addDays(dateStr, 1);
    if (leagueOccupiedDates.has(prevDay) || leagueOccupiedDates.has(nextDay)) continue;

    return dateStr;
  }

  // 2ª Tentativa: busca outros dias úteis de meio de semana (Terça=2 ou Quinta=4)
  const fallbackDaysOfWeek = [2, 4];
  for (const dow of fallbackDaysOfWeek) {
    for (let d = startDayOfMonth; d <= daysInMonth; d++) {
      const candidateDate = new Date(seasonYear, targetMonth - 1, d);
      if (candidateDate.getDay() !== dow) continue;

      const dateStr = `${seasonYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (blockedDates.has(dateStr)) continue;
      if (leagueOccupiedDates.has(dateStr)) continue;
      if (isDateInFifaPause(dateStr, 'south_america')) continue;

      const prevDay = addDays(dateStr, -1);
      const nextDay = addDays(dateStr, 1);
      if (leagueOccupiedDates.has(prevDay) || leagueOccupiedDates.has(nextDay)) continue;

      return dateStr;
    }
  }

  // Fallback seguro caso todo o mês esteja bloqueado
  return `${seasonYear}-${String(targetMonth).padStart(2, '0')}-${String(Math.min(daysInMonth, Math.max(1, startDayOfMonth))).padStart(2, '0')}`;
}

/**
 * Estrutura o calendário completo das fases de uma Copa ou Supercopa Sul-Americana,
 * garantindo ausência total de colisão com as rodadas da liga nacional e com pausas FIFA.
 */
export function structureSouthAmericanCupCalendar(
  cupId: SouthAmericanCupId,
  seasonYear: number = 2026,
  existingLeagueFixtures: Fixture[] = []
): SouthAmericanCupPhaseSchedule {
  const leagueId = SOUTH_AMERICAN_CUP_TO_LEAGUE[cupId];
  const meta = COMPETITIONS_CATALOG[cupId];
  const country = SOUTH_AMERICAN_CUP_COUNTRY_NAMES[cupId] || 'América do Sul';
  const leagueOccupiedDates = getSouthAmericanLeagueOccupiedDates(
    leagueId,
    seasonYear,
    existingLeagueFixtures
  );
  const blockedDates = new Set<string>();

  const datesByPhase: Record<string, string[]> = {};

  const registerPhaseDates = (phaseKey: string, dates: string[]) => {
    datesByPhase[phaseKey] = dates;
    dates.forEach((d) => blockedDates.add(d));
  };

  switch (cupId) {
    // ==========================================
    // ARGENTINA
    // ==========================================
    case 'sa_supercopa_argentina': {
      const d = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 3,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final', [d]);
      break;
    }
    case 'sa_copa_argentina': {
      const r16_1 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 3,
        startDayOfMonth: 10,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(r16_1);
      const r16_2 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 3,
        startDayOfMonth: 17,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(r16_2);
      const r16_3 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 3,
        startDayOfMonth: 24,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('oitavas', [r16_1, r16_2, r16_3]);

      const qf_1 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 5,
        startDayOfMonth: 12,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(qf_1);
      const qf_2 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 5,
        startDayOfMonth: 19,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('quartas', [qf_1, qf_2]);

      const sf_1 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 9,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(sf_1);
      const sf_2 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 16,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('semifinal', [sf_1, sf_2]);

      const finalDate = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 11,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final', [finalDate]);
      break;
    }

    // ==========================================
    // COLÔMBIA
    // ==========================================
    case 'sa_superliga_colombia': {
      const ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 1,
        startDayOfMonth: 28,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(ida);
      const volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 2,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final_ida', [ida]);
      registerPhaseDates('final_volta', [volta]);
      break;
    }
    case 'sa_copa_colombia': {
      const r16_ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 3,
        startDayOfMonth: 11,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(r16_ida);
      const r16_volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 3,
        startDayOfMonth: 25,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('oitavas_ida', [r16_ida]);
      registerPhaseDates('oitavas_volta', [r16_volta]);

      const qf_ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 5,
        startDayOfMonth: 13,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(qf_ida);
      const qf_volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 5,
        startDayOfMonth: 27,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('quartas_ida', [qf_ida]);
      registerPhaseDates('quartas_volta', [qf_volta]);

      const sf_ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 9,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(sf_ida);
      const sf_volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 23,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('semifinal_ida', [sf_ida]);
      registerPhaseDates('semifinal_volta', [sf_volta]);

      const fin_ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 10,
        startDayOfMonth: 21,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(fin_ida);
      const fin_volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 11,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final_ida', [fin_ida]);
      registerPhaseDates('final_volta', [fin_volta]);
      break;
    }

    // ==========================================
    // URUGUAI
    // ==========================================
    case 'sa_supercopa_uruguay': {
      const d = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 2,
        startDayOfMonth: 1,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final', [d]);
      break;
    }
    case 'sa_copa_uruguay': {
      const r16 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 3,
        startDayOfMonth: 18,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const qf = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 5,
        startDayOfMonth: 20,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const sf_ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 16,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(sf_ida);
      const sf_volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 30,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const fin = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 11,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('oitavas', [r16]);
      registerPhaseDates('quartas', [qf]);
      registerPhaseDates('semifinal_ida', [sf_ida]);
      registerPhaseDates('semifinal_volta', [sf_volta]);
      registerPhaseDates('final', [fin]);
      break;
    }

    // ==========================================
    // EQUADOR
    // ==========================================
    case 'sa_supercopa_ecuador': {
      const d = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 2,
        startDayOfMonth: 8,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final', [d]);
      break;
    }
    case 'sa_copa_ecuador': {
      const r16 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 4,
        startDayOfMonth: 8,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const qf = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 6,
        startDayOfMonth: 10,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const sf_ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 8,
        startDayOfMonth: 12,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(sf_ida);
      const sf_volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 8,
        startDayOfMonth: 26,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const fin = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 11,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('oitavas', [r16]);
      registerPhaseDates('quartas', [qf]);
      registerPhaseDates('semifinal_ida', [sf_ida]);
      registerPhaseDates('semifinal_volta', [sf_volta]);
      registerPhaseDates('final', [fin]);
      break;
    }

    // ==========================================
    // CHILE
    // ==========================================
    case 'sa_supercopa_chile': {
      const d = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 2,
        startDayOfMonth: 15,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final', [d]);
      break;
    }
    case 'sa_copa_chile': {
      const r16 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 4,
        startDayOfMonth: 15,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const qf = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 6,
        startDayOfMonth: 17,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const sf_ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 8,
        startDayOfMonth: 19,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(sf_ida);
      const sf_volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 2,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const fin = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 11,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('oitavas', [r16]);
      registerPhaseDates('quartas', [qf]);
      registerPhaseDates('semifinal_ida', [sf_ida]);
      registerPhaseDates('semifinal_volta', [sf_volta]);
      registerPhaseDates('final', [fin]);
      break;
    }

    // ==========================================
    // PARAGUAI
    // ==========================================
    case 'sa_supercopa_paraguay': {
      const d = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 2,
        startDayOfMonth: 22,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final', [d]);
      break;
    }
    case 'sa_copa_paraguay': {
      const r16 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 4,
        startDayOfMonth: 22,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const qf = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 6,
        startDayOfMonth: 24,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const sf = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 23,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const fin = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 11,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('oitavas', [r16]);
      registerPhaseDates('quartas', [qf]);
      registerPhaseDates('semifinal', [sf]);
      registerPhaseDates('final', [fin]);
      break;
    }

    // ==========================================
    // PERU
    // ==========================================
    case 'sa_supercopa_peru': {
      const d = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 3,
        startDayOfMonth: 1,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final', [d]);
      break;
    }
    case 'sa_copa_peru': {
      const r16 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 4,
        startDayOfMonth: 29,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const qf = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 7,
        startDayOfMonth: 1,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const sf_ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 9,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(sf_ida);
      const sf_volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 23,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const fin = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 11,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('oitavas', [r16]);
      registerPhaseDates('quartas', [qf]);
      registerPhaseDates('semifinal_ida', [sf_ida]);
      registerPhaseDates('semifinal_volta', [sf_volta]);
      registerPhaseDates('final', [fin]);
      break;
    }

    // ==========================================
    // BOLÍVIA
    // ==========================================
    case 'sa_supercopa_bolivia': {
      const d = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 2,
        startDayOfMonth: 25,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final', [d]);
      break;
    }
    case 'sa_copa_bolivia': {
      const r16 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 4,
        startDayOfMonth: 22,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const qf = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 7,
        startDayOfMonth: 8,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const sf_ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 16,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(sf_ida);
      const sf_volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 30,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const fin = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 11,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('oitavas', [r16]);
      registerPhaseDates('quartas', [qf]);
      registerPhaseDates('semifinal_ida', [sf_ida]);
      registerPhaseDates('semifinal_volta', [sf_volta]);
      registerPhaseDates('final', [fin]);
      break;
    }

    // ==========================================
    // VENEZUELA
    // ==========================================
    case 'sa_supercopa_venezuela': {
      const d = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 3,
        startDayOfMonth: 1,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('final', [d]);
      break;
    }
    case 'sa_copa_venezuela': {
      const r16 = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 4,
        startDayOfMonth: 29,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const qf = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 7,
        startDayOfMonth: 15,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const sf_ida = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 9,
        startDayOfMonth: 23,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      blockedDates.add(sf_ida);
      const sf_volta = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 10,
        startDayOfMonth: 7,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      const fin = findNonCollidingMidweekDate({
        seasonYear,
        targetMonth: 11,
        startDayOfMonth: 4,
        preferredDayOfWeek: 3,
        leagueOccupiedDates,
        blockedDates,
      });
      registerPhaseDates('oitavas', [r16]);
      registerPhaseDates('quartas', [qf]);
      registerPhaseDates('semifinal_ida', [sf_ida]);
      registerPhaseDates('semifinal_volta', [sf_volta]);
      registerPhaseDates('final', [fin]);
      break;
    }
  }

  const allScheduledDates = Array.from(blockedDates).sort();

  return {
    cupId,
    competitionName: meta?.name || cupId,
    country,
    leagueId,
    seasonYear,
    datesByPhase,
    allScheduledDates,
  };
}

/**
 * Estrutura os calendários de todas as 18 copas e supercopas sul-americanas de uma vez,
 * garantindo compatibilidade mútua e ausência de colisão com suas respectivas ligas nacionais.
 */
export function structureAllSouthAmericanCupsCalendar(
  seasonYear: number = 2026,
  allLeagueFixtures: Fixture[] = []
): Record<SouthAmericanCupId, SouthAmericanCupPhaseSchedule> {
  const result: Partial<Record<SouthAmericanCupId, SouthAmericanCupPhaseSchedule>> = {};
  const cupIds = Object.keys(SOUTH_AMERICAN_CUP_TO_LEAGUE) as SouthAmericanCupId[];
  for (const cId of cupIds) {
    result[cId] = structureSouthAmericanCupCalendar(cId, seasonYear, allLeagueFixtures);
  }
  return result as Record<SouthAmericanCupId, SouthAmericanCupPhaseSchedule>;
}

/**
 * Validador de integridade de calendário: verifica se alguma partida da copa colide em data com a liga nacional correspondente.
 */
export function validateSouthAmericanCupAgainstLeague(
  cupFixtures: Fixture[],
  leagueFixtures: Fixture[]
): {
  cupId?: SouthAmericanCupId;
  leagueId?: SouthAmericanLeagueId;
  collisionsCount: number;
  collidingDates: string[];
  isValid: boolean;
} {
  const leagueDates = new Set(
    leagueFixtures.filter((f) => f.date).map((f) => f.date as string)
  );
  const collidingDates: string[] = [];

  for (const f of cupFixtures) {
    if (f.date && leagueDates.has(f.date)) {
      collidingDates.push(f.date);
    }
  }

  const cupComp = cupFixtures[0]?.competition as SouthAmericanCupId;
  const leagueComp = leagueFixtures[0]?.competition as SouthAmericanLeagueId;

  return {
    cupId: cupComp,
    leagueId: leagueComp,
    collisionsCount: collidingDates.length,
    collidingDates,
    isValid: collidingDates.length === 0,
  };
}


import {
  Club,
  CompetitionType,
  EuropeanCupId,
  EuropeanLeagueId,
  Fixture,
  InboxMessage,
  Standing,
  TrophyRecord,
  UefaContinentalId,
} from '../types/game';
import {
  addDays,
  assignVariedMatchDaySlot,
  formatEuropeanSeason,
  getEuropeanLeagueWeekendSundays,
  getEuropeanLeagueScheduleDates,
  getEflLeagueScheduleDates,
} from './calendarUtils';
import { generateInitialStandings } from '../data/initialData';
import { getClubSectorRatings } from './clubRatingsEngine';

export interface EuropeanLeagueConfig {
  id: EuropeanLeagueId;
  name: string;
  shortName: string;
  country: string;
  flagCode: string;
  flagEmoji: string;
  federation: string;
  tier: 1 | 2 | 3 | 4;
  clubsCount: number;
  totalRounds: number;
  uclBerths: number;
  uelBerths: number;
  ueclBerths: number;
  promotionSlots: number;
  playoffSlots?: number;
  relegationSlots: number;
  championPrize: number;
  runnerUpPrize: number;
  primaryColor: string;
  secondaryColor: string;
  formatSummary: string;
}

export const EUROPEAN_LEAGUE_IDS: EuropeanLeagueId[] = [
  'eng_premier',
  'eng_championship',
  'eng_league_one',
  'eng_league_two',
  'esp_laliga',
  'esp_laliga2',
  'ita_serie_a',
  'ita_serie_b',
  'ger_bundesliga',
  'ger_bundesliga2',
  'fra_ligue1',
  'fra_ligue2',
  'por_primeira',
  'ned_eredivisie',
  'bel_pro_league',
  'tur_super_lig',
  'gre_super_league',
  'nor_eliteserien',
  'den_superliga',
  'sui_super_league',
  'swe_allsvenskan',
  'sco_premiership',
  'eu_special_1',
  'eu_special_2',
];

export const EUROPEAN_TOP_DIVISION_IDS: EuropeanLeagueId[] = [
  'eng_premier',
  'esp_laliga',
  'ita_serie_a',
  'ger_bundesliga',
  'fra_ligue1',
  'por_primeira',
  'ned_eredivisie',
  'bel_pro_league',
  'tur_super_lig',
  'gre_super_league',
  'nor_eliteserien',
  'den_superliga',
  'sui_super_league',
  'swe_allsvenskan',
  'sco_premiership',
  'eu_special_1',
  'eu_special_2',
];

export const ENGLISH_PYRAMID_LEAGUE_IDS: EuropeanLeagueId[] = [
  'eng_premier',
  'eng_championship',
  'eng_league_one',
  'eng_league_two',
];

export const UEFA_CONTINENTAL_IDS: UefaContinentalId[] = [
  'champions_league',
  'europa_league',
  'conference_league',
];

/**
 * 36 Clubes oficiais participantes da UEFA Champions League.
 */
export const INITIAL_CHAMPIONS_LEAGUE_CLUB_IDS: string[] = [
  'eu_psg',       // PSG
  'eu_bay',       // Bayern de Munique
  'eu_rma',       // Real Madrid
  'eu_liv',       // Liverpool
  'eu_int',       // Inter de Milão
  'eu_mci',       // Manchester City
  'eu_ars',       // Arsenal
  'eu_fcb',       // Barcelona
  'eu_atm',       // Atlético de Madrid
  'eu_bvb',       // Borussia Dortmund
  'eu_rom',       // Roma
  'eu_scp',       // Sporting
  'eu_avl',       // Aston Villa
  'eu_fcp',       // Porto
  'eu_mun',       // Manchester United
  'eu_clu',       // Brugge
  'eu_bet',       // Betis
  'eu_psv',       // PSV
  'eu_fey',       // Feyenoord
  'eu_los',       // Lille
  'eu_nap',       // Napoli
  'eu_rbl',       // RB Leipzig
  'eu_vil',       // Villarreal
  'eu_shk',       // Shakhtar
  'eu_gal',       // Galatasaray
  'eu_bod_no',    // Bodo/Glimt
  'eu_fen',       // Fenerbahçe
  'eu_vfb',       // Sttugart
  'eu_com',       // Como
  'eu_rcl',       // Lens
  'eu_sp1_sla',   // Slavia Praga
  'eu_sp1_sbh',   // Sabah
  'eu_sp1_lask',  // LASK
  'eu_aek',       // AEK
  'eu_vik_no',    // Viking
  'eu_sp1_slv',   // Slovan Bratislava
];

/**
 * 36 clubes oficiais da UEFA Europa League (Fase de Liga 2026/2027) definidos pelo usuário:
 */
export const INITIAL_EUROPA_LEAGUE_CLUB_IDS: string[] = [
  'eu_and',       // Anderlecht (BEL)
  'eu_sp2_ara',   // FC Ararat-Armenia (ARM)
  'eu_az',        // AZ Alkmaar (NED)
  'eu_slb',       // SL Benfica (POR)
  'eu_bjk',       // Beşiktaş JK (TUR)
  'eu_bou',       // AFC Bournemouth (ENG)
  'eu_sp1_cel',   // NK Celje (SVN)
  'eu_cel',       // Real Club Celta (ESP)
  'eu_sco_cel',   // Celtic FC (SCO)
  'eu_cry',       // Crystal Palace F.C. (ENG)
  'eu_sp1_frv',   // Ferencvárosi TC (HUN)
  'eu_sp1_dzg',   // GNK Dinamo (CRO)
  'eu_sp2_hbs',   // Hapoel Beer-Sheva FC (ISR)
  'eu_tsg',       // TSG 1899 Hoffenheim (GER)
  'eu_sp1_jag',   // Jagiellonia Białystok (POL)
  'eu_juv',       // Juventus (ITA)
  'eu_sp1_lec',   // KKS Lech Poznań (POL)
  'eu_b04',       // Bayer 04 Leverkusen (GER)
  'eu_sp1_lev',   // PFC Levski Sofia (BUL)
  'eu_lil_no',    // Lillestrøm SK (NOR)
  'eu_ol',        // Olympique Lyonnais (FRA)
  'eu_om',        // Olympique de Marseille (FRA)
  'eu_acm',       // AC Milan (ITA)
  'eu_nec',       // N.E.C. Nijmegen (NED)
  'eu_ofi',       // OFI Crete FC (GRE)
  'eu_oly',       // Olympiacos FC (GRE)
  'eu_sp1_omo',   // Omonia FC (CYP)
  'eu_rso',       // Real Sociedad de Fútbol (ESP)
  'eu_srfc',      // Stade Rennais FC (FRA)
  'eu_sp1_rbs',   // FC Salzburg (AUT)
  'eu_sp1_spa',   // AC Sparta Praha (CZE)
  'eu_sp1_stu',   // SK Sturm Graz (AUT)
  'eu_sun',       // Sunderland AFC (ENG)
  'eu_sp1_tor',   // SCU Torreense (POR)
  'eu_usg',       // R. Union Saint-Gilloise (BEL)
  'eu_sp1_plz',   // FC Viktoria Plzeň (CZE)
];

/**
 * 36 clubes oficiais da UEFA Conference League (Fase de Liga 2026/2027) definidos pelo usuário:
 */
export const INITIAL_CONFERENCE_LEAGUE_CLUB_IDS: string[] = [
  'eu_agf_dk',    // AGF Aarhus (DIN)
  'eu_aja',       // AFC Ajax (HOL)
  'eu_ata',       // Atalanta BC (ITA)
  'eu_sp2_bor',   // FK Borac (BIS)
  'eu_bra',       // SC Braga (POR)
  'eu_bra_no',    // SK Brann (NOR)
  'eu_bha',       // Brighton & Hove Albion (ING)
  'eu_fck_dk',    // FC Copenhague (DEN)
  'eu_sp2_est',   // FK Crvena Zvezda (SRB)
  'eu_sp2_csk',   // PFC CSKA Sofia (BUL)
  'eu_sp2_egn',   // KF Egnatia (ALB)
  'eu_scf',       // SC Freiburg (ALE)
  'eu_gnt',       // KAA Gent (BEL)
  'eu_get',       // Getafe CF (ESP)
  'eu_sp2_haj',   // Divisão HNK Hajduk / Hajduk Split (CRO)
  'eu_sco_hea',   // Coração de Midlothian FC / Hearts (SCO)
  'eu_ibe',       // FC Iberia 1999 Tbilisi (GEO)
  'eu_sp2_esc',   // Inter Clube de Escaladas / Inter Escaldes (AND)
  'eu_sp2_jab',   // FK Jablonec (CZE)
  'eu_sp2_kai',   // FC Kairat Almaty (KAZ)
  'eu_sp2_zal',   // FK Kauno Žalgiris (LTU)
  'eu_sp2_kup',   // KuPS Kuopio (FIN)
  'eu_sp2_lri',   // Lincoln Red Imps FC (GIB)
  'eu_lug_ch',    // FC Lugano (SUI)
  'eu_fcm_dk',    // FC Midtjylland (DEN)
  'eu_mja_se',    // Mjällby AIF (SUE)
  'eu_asm',       // AS Mônaco (FRA)
  'eu_fcn_dk',    // FC Nordsjælland (DEN)
  'eu_sp2_paf',   // Pafos FC (CYP)
  'eu_pao',       // Panathinaikos FC (GRE)
  'eu_sp2_rig',   // Riga FC (LVA)
  'eu_stt',       // K. Sint-Truidense VV (BEL)
  'eu_thu_ch',    // FC Thun (SUI)
  'eu_tra_tr',    // Trabzonspor A.Ş. (TUR)
  'eu_twe',       // FC Twente (NED)
  'eu_ucr',       // Universidade Craiova (ROM)
];

/**
 * Mapeamento oficial da copa nacional de cada divisão de elite europeia que concede vaga na UEFA Europa League.
 */
export const EUROPEAN_LEAGUE_DOMESTIC_CUP: Partial<
  Record<EuropeanLeagueId, { cupId: EuropeanCupId | 'eng_fa_cup'; cupName: string }>
> = {
  eng_premier: { cupId: 'eng_fa_cup', cupName: 'FA Cup' },
  esp_laliga: { cupId: 'esp_copa_del_rey', cupName: 'Copa del Rey' },
  ita_serie_a: { cupId: 'ita_coppa_italia', cupName: 'Coppa Italia' },
  ger_bundesliga: { cupId: 'ger_dfb_pokal', cupName: 'DFB-Pokal' },
  fra_ligue1: { cupId: 'fra_coupe_de_france', cupName: 'Coupe de France' },
  por_primeira: { cupId: 'por_taca_portugal', cupName: 'Taça de Portugal' },
  ned_eredivisie: { cupId: 'ned_knvb_beker', cupName: 'KNVB Beker' },
  bel_pro_league: { cupId: 'bel_croky_cup', cupName: 'Croky Cup' },
  tur_super_lig: { cupId: 'tur_turkiye_kupasi', cupName: 'Türkiye Kupası' },
  gre_super_league: { cupId: 'gre_kypello_elladas', cupName: 'Copa da Grécia' },
  nor_eliteserien: { cupId: 'nor_nm_cup', cupName: 'NM Cup' },
  den_superliga: { cupId: 'den_dbu_pokalen', cupName: 'DBU Pokalen' },
  sui_super_league: { cupId: 'sui_schweizer_cup', cupName: 'Copa da Suíça' },
  swe_allsvenskan: { cupId: 'swe_svenska_cupen', cupName: 'Svenska Cupen' },
  sco_premiership: { cupId: 'sco_scottish_cup', cupName: 'Scottish Cup' },
  eu_special_1: { cupId: 'eu_sp1_cup', cupName: 'Taça Especial 1' },
  eu_special_2: { cupId: 'eu_sp2_cup', cupName: 'Taça Especial 2' },
};

/**
 * Configuração oficial das Ligas Europeias (4 divisões da Inglaterra + 16 ligas/elites europeias).
 * Soma exata das vagas continentais UEFA no formato Fase de Liga (36 clubes cada):
 * - Champions League (36): ING(4) + ESP(4) + ALE(4) + ITA(4) + FRA(3) + POR(2) + HOL(2) + TUR(2) + BEL(1) + GRE(1) + DEN(1) + NOR(1) + SUI(1) + SWE(1) + SCO(1) + ESP1(1) + ESP2(1) [34] + Campeão UCL(1) + Campeão UEL(1) = 36
 * - Europa League (36):    1 vaga por liga (2 na ESP1) [18] + 17 Campeões de Copas Nacionais (FA Cup na ING) [17] = [35] + Campeão UECL(1) = 36
 * - Conference League (36):ING(1) + ESP(1) + ALE(1) + ITA(1) + FRA(2) + POR(2) + HOL(2) + TUR(2) + BEL(2) + GRE(2) + DEN(2) + NOR(2) + SUI(2) + SWE(2) + SCO(2) + ESP1(4) + ESP2(6) = 36
 */
export const EUROPEAN_LEAGUES_META: Record<EuropeanLeagueId, EuropeanLeagueConfig> = {
  eng_premier: {
    id: 'eng_premier',
    name: 'Premier League',
    shortName: 'Premier League',
    country: 'Inglaterra',
    flagCode: 'ENG',
    flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    federation: 'The FA / Premier League',
    tier: 1,
    clubsCount: 20,
    totalRounds: 38,
    uclBerths: 4,
    uelBerths: 1,
    ueclBerths: 1,
    promotionSlots: 0,
    relegationSlots: 3,
    championPrize: 185_000_000,
    runnerUpPrize: 115_000_000,
    primaryColor: '#a855f7',
    secondaryColor: '#3b0764',
    formatSummary:
      '20 clubes em pontos corridos (38 rodadas). G-4 na Champions League, 5º na Europa League (+ Campeão da FA Cup), 6º na Conference League e 3 rebaixados à Championship.',
  },
  eng_championship: {
    id: 'eng_championship',
    name: 'EFL Championship',
    shortName: 'Championship (2ª ING)',
    country: 'Inglaterra',
    flagCode: 'ENG',
    flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    federation: 'EFL (2ª Divisão)',
    tier: 2,
    clubsCount: 24,
    totalRounds: 46,
    uclBerths: 0,
    uelBerths: 0,
    ueclBerths: 0,
    promotionSlots: 2,
    playoffSlots: 6,
    relegationSlots: 3,
    championPrize: 75_000_000,
    runnerUpPrize: 48_000_000,
    primaryColor: '#eab308',
    secondaryColor: '#1e3a8a',
    formatSummary:
      '24 clubes (46 rodadas). Top 2 sobem direto à Premier League. 3º ao 8º nos Playoffs (1ª rodada em jogo único: 5º vs 8º e 6º vs 7º; Semifinais em ida e volta: 3º vs Venc 6/7 e 4º vs Venc 5/8; Final única em Wembley valendo a 3ª vaga de acesso). 3 últimos caem para a League One.',
  },
  eng_league_one: {
    id: 'eng_league_one',
    name: 'EFL League One',
    shortName: 'League One (3ª ING)',
    country: 'Inglaterra',
    flagCode: 'ENG',
    flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    federation: 'EFL (3ª Divisão)',
    tier: 3,
    clubsCount: 24,
    totalRounds: 46,
    uclBerths: 0,
    uelBerths: 0,
    ueclBerths: 0,
    promotionSlots: 2,
    playoffSlots: 4,
    relegationSlots: 4,
    championPrize: 24_000_000,
    runnerUpPrize: 14_000_000,
    primaryColor: '#38bdf8',
    secondaryColor: '#0f172a',
    formatSummary:
      '24 clubes (46 rodadas). Os 2 primeiros sobem direto à Championship, do 3º ao 6º disputam os Playoffs (semis ida/volta e final única em Wembley) valendo a 3ª vaga de acesso, e os 4 últimos caem para a League Two.',
  },
  eng_league_two: {
    id: 'eng_league_two',
    name: 'EFL League Two',
    shortName: 'League Two (4ª ING)',
    country: 'Inglaterra',
    flagCode: 'ENG',
    flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    federation: 'EFL (4ª Divisão)',
    tier: 4,
    clubsCount: 24,
    totalRounds: 46,
    uclBerths: 0,
    uelBerths: 0,
    ueclBerths: 0,
    promotionSlots: 3,
    playoffSlots: 4,
    relegationSlots: 2,
    championPrize: 10_000_000,
    runnerUpPrize: 6_000_000,
    primaryColor: '#fb7185',
    secondaryColor: '#1e293b',
    formatSummary:
      '24 clubes (46 rodadas). Os 3 primeiros sobem direto à League One, do 4º ao 7º disputam os Playoffs (semis ida/volta e final única em Wembley) valendo a 4ª vaga de acesso, e os 2 últimos são rebaixados.',
  },
  esp_laliga: {
    id: 'esp_laliga',
    name: 'LaLiga EA Sports',
    shortName: 'LaLiga (ESP)',
    country: 'Espanha',
    flagCode: 'ESP',
    flagEmoji: '🇪🇸',
    federation: 'RFEF / LaLiga',
    tier: 1,
    clubsCount: 20,
    totalRounds: 38,
    uclBerths: 4,
    uelBerths: 1,
    ueclBerths: 1,
    promotionSlots: 0,
    relegationSlots: 3,
    championPrize: 155_000_000,
    runnerUpPrize: 98_000_000,
    primaryColor: '#ef4444',
    secondaryColor: '#f59e0b',
    formatSummary:
      '20 clubes em pontos corridos (38 rodadas). G-4 na Champions League, 5º na Europa League (+ Campeão da Copa del Rey), 6º na Conference League e 3 rebaixados para a LaLiga 2.',
  },
  esp_laliga2: {
    id: 'esp_laliga2',
    name: 'LALIGA HYPERMOTION',
    shortName: 'LaLiga 2 (ESP)',
    country: 'Espanha',
    flagCode: 'ESP',
    flagEmoji: '🇪🇸',
    federation: 'RFEF / LaLiga',
    tier: 2,
    clubsCount: 22,
    totalRounds: 42,
    uclBerths: 0,
    uelBerths: 0,
    ueclBerths: 0,
    promotionSlots: 2,
    relegationSlots: 4,
    championPrize: 20_000_000,
    runnerUpPrize: 13_000_000,
    primaryColor: '#ef4444',
    secondaryColor: '#111827',
    formatSummary:
      '22 clubes em pontos corridos (42 rodadas). 1º e 2º sobem direto para a LaLiga; 3º ao 6º disputam Play-offs em Ida e Volta pela 3ª vaga de acesso; 4 últimos (19º–22º) são rebaixados à Primera Federación.',
  },
  ita_serie_a: {
    id: 'ita_serie_a',
    name: 'Serie A Enilive',
    shortName: 'Serie A (ITA)',
    country: 'Itália',
    flagCode: 'ITA',
    flagEmoji: '🇮🇹',
    federation: 'FIGC / Lega Serie A',
    tier: 1,
    clubsCount: 20,
    totalRounds: 38,
    uclBerths: 4,
    uelBerths: 1,
    ueclBerths: 1,
    promotionSlots: 0,
    relegationSlots: 3,
    championPrize: 135_000_000,
    runnerUpPrize: 85_000_000,
    primaryColor: '#0ea5e9',
    secondaryColor: '#10b981',
    formatSummary:
      '20 clubes em pontos corridos (38 rodadas). G-4 na Champions League, 5º na Europa League (+ Campeão da Coppa Italia), 6º na Conference League e 3 rebaixados para a Serie B.',
  },
  ita_serie_b: {
    id: 'ita_serie_b',
    name: 'Serie BKT',
    shortName: 'Serie B (ITA)',
    country: 'Itália',
    flagCode: 'ITA',
    flagEmoji: '🇮🇹',
    federation: 'FIGC / Lega B',
    tier: 2,
    clubsCount: 20,
    totalRounds: 38,
    uclBerths: 0,
    uelBerths: 0,
    ueclBerths: 0,
    promotionSlots: 2,
    playoffSlots: 6,
    relegationSlots: 3,
    championPrize: 19_000_000,
    runnerUpPrize: 12_000_000,
    primaryColor: '#0284c7',
    secondaryColor: '#16a34a',
    formatSummary:
      '20 clubes em 38 rodadas. 1º e 2º sobem direto (3º também sobe direto se abrir 15+ pts sobre o 4º); 3º ao 8º disputam Playoffs em Ida e Volta pela 3ª vaga; 18º–20º caem direto e 16º×17º disputam o Playout de rebaixamento em Ida e Volta.',
  },
  ger_bundesliga: {
    id: 'ger_bundesliga',
    name: 'Bundesliga',
    shortName: 'Bundesliga (ALE)',
    country: 'Alemanha',
    flagCode: 'GER',
    flagEmoji: '🇩🇪',
    federation: 'DFB / DFL',
    tier: 1,
    clubsCount: 18,
    totalRounds: 34,
    uclBerths: 4,
    uelBerths: 1,
    ueclBerths: 1,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 145_000_000,
    runnerUpPrize: 92_000_000,
    primaryColor: '#dc2626',
    secondaryColor: '#eab308',
    formatSummary:
      '18 clubes em pontos corridos (34 rodadas). G-4 na Champions League, 5º na Europa League (+ Campeão da DFB-Pokal), 6º na Conference League. 16º disputa o Playoff de Rebaixamento (Ida e Volta) contra o 3º da 2. Bundesliga; 17º e 18º caem direto.',
  },
  ger_bundesliga2: {
    id: 'ger_bundesliga2',
    name: '2. Bundesliga',
    shortName: '2. Bundesliga (2ª ALE)',
    country: 'Alemanha',
    flagCode: 'GER',
    flagEmoji: '🇩🇪',
    federation: 'DFB / DFL (2ª Divisão)',
    tier: 2,
    clubsCount: 18,
    totalRounds: 34,
    uclBerths: 0,
    uelBerths: 0,
    ueclBerths: 0,
    promotionSlots: 2,
    playoffSlots: 1,
    relegationSlots: 3,
    championPrize: 42_000_000,
    runnerUpPrize: 26_000_000,
    primaryColor: '#dc2626',
    secondaryColor: '#1f2937',
    formatSummary:
      '18 clubes em pontos corridos (34 rodadas). Os 2 primeiros sobem direto à Bundesliga; o 3º colocado disputa o Playoff de Acesso (Ida e Volta) contra o 16º da Bundesliga, com o vencedor jogando a 1ª Divisão. Os 3 últimos (16º, 17º e 18º) são rebaixados.',
  },
  fra_ligue1: {
    id: 'fra_ligue1',
    name: 'Ligue 1 McDonald\'s',
    shortName: 'Ligue 1 (FRA)',
    country: 'França',
    flagCode: 'FRA',
    flagEmoji: '🇫🇷',
    federation: 'FFF / LFP',
    tier: 1,
    clubsCount: 18,
    totalRounds: 34,
    uclBerths: 3,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 115_000_000,
    runnerUpPrize: 72_000_000,
    primaryColor: '#3b82f6',
    secondaryColor: '#1e3a8a',
    formatSummary:
      '18 clubes em pontos corridos (34 rodadas). G-3 na Champions League, 4º na Europa League (+ Campeão da Coupe de France), 5º e 6º na Conference League. 16º disputa o Barrage (Ida e Volta) contra o vencedor dos Play-offs da Ligue 2; 17º e 18º caem direto.',
  },
  fra_ligue2: {
    id: 'fra_ligue2',
    name: 'Ligue 2 BKT',
    shortName: 'Ligue 2 (2ª FRA)',
    country: 'França',
    flagCode: 'FRA',
    flagEmoji: '🇫🇷',
    federation: 'FFF / LFP (2ª Divisão)',
    tier: 2,
    clubsCount: 18,
    totalRounds: 34,
    uclBerths: 0,
    uelBerths: 0,
    ueclBerths: 0,
    promotionSlots: 2,
    playoffSlots: 3,
    relegationSlots: 3,
    championPrize: 36_000_000,
    runnerUpPrize: 22_000_000,
    primaryColor: '#2563eb',
    secondaryColor: '#0f172a',
    formatSummary:
      '18 clubes em pontos corridos (34 rodadas). 1º e 2º sobem direto à Ligue 1. Play-offs (3º ao 5º em jogo único com pênaltis diretos): 4º×5º e o vencedor enfrenta o 3º. Quem vencer disputa o Barrage (Ida na casa da Ligue 2 e Volta na casa do 16º da Ligue 1) pela 3ª vaga. 3 últimos (16º–18º) caem.',
  },
  por_primeira: {
    id: 'por_primeira',
    name: 'Liga Portugal Betclic',
    shortName: 'Liga Portugal',
    country: 'Portugal',
    flagCode: 'POR',
    flagEmoji: '🇵🇹',
    federation: 'FPF / Liga Portugal',
    tier: 1,
    clubsCount: 18,
    totalRounds: 34,
    uclBerths: 2,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 65_000_000,
    runnerUpPrize: 38_000_000,
    primaryColor: '#16a34a',
    secondaryColor: '#dc2626',
    formatSummary:
      '18 clubes em pontos corridos (34 rodadas). Campeão e vice na Champions League, 3º na Europa League (+ Campeão da Taça de Portugal), 4º e 5º na Conference League e 2 rebaixados.',
  },
  ned_eredivisie: {
    id: 'ned_eredivisie',
    name: 'Eredivisie',
    shortName: 'Eredivisie (HOL)',
    country: 'Holanda',
    flagCode: 'NED',
    flagEmoji: '🇳🇱',
    federation: 'KNVB',
    tier: 1,
    clubsCount: 18,
    totalRounds: 34,
    uclBerths: 2,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 62_000_000,
    runnerUpPrize: 36_000_000,
    primaryColor: '#f97316',
    secondaryColor: '#1d4ed8',
    formatSummary:
      '18 clubes em pontos corridos (34 rodadas). Campeão e vice na Champions League, 3º na Europa League (+ Campeão da KNVB Beker), 4º e 5º na Conference League e 2 rebaixados.',
  },
  bel_pro_league: {
    id: 'bel_pro_league',
    name: 'Jupiler Pro League',
    shortName: 'Pro League (BEL)',
    country: 'Bélgica',
    flagCode: 'BEL',
    flagEmoji: '🇧🇪',
    federation: 'RBFA',
    tier: 1,
    clubsCount: 18,
    totalRounds: 34,
    uclBerths: 1,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 48_000_000,
    runnerUpPrize: 28_000_000,
    primaryColor: '#eab308',
    secondaryColor: '#dc2626',
    formatSummary:
      '18 clubes em pontos corridos (34 rodadas). Campeão na Champions League, vice na Europa League (+ Campeão da Croky Cup), 3º e 4º na Conference League e 2 rebaixados.',
  },
  tur_super_lig: {
    id: 'tur_super_lig',
    name: 'Trendyol Süper Lig',
    shortName: 'Süper Lig (TUR)',
    country: 'Turquia',
    flagCode: 'TUR',
    flagEmoji: '🇹🇷',
    federation: 'TFF',
    tier: 1,
    clubsCount: 18,
    totalRounds: 34,
    uclBerths: 2,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 3,
    championPrize: 55_000_000,
    runnerUpPrize: 32_000_000,
    primaryColor: '#e11d48',
    secondaryColor: '#9f1239',
    formatSummary:
      '18 clubes em pontos corridos (34 rodadas). Campeão e vice na Champions League, 3º na Europa League (+ Campeão da Türkiye Kupası), 4º e 5º na Conference League e 3 rebaixados.',
  },
  gre_super_league: {
    id: 'gre_super_league',
    name: 'Stoiximan Super League',
    shortName: 'Super League (GRE)',
    country: 'Grécia',
    flagCode: 'GRE',
    flagEmoji: '🇬🇷',
    federation: 'EPO / Super League',
    tier: 1,
    clubsCount: 14,
    totalRounds: 26,
    uclBerths: 1,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 38_000_000,
    runnerUpPrize: 22_000_000,
    primaryColor: '#0284c7',
    secondaryColor: '#0369a1',
    formatSummary:
      '14 clubes em pontos corridos (26 rodadas). Campeão na Champions League, vice na Europa League (+ Campeão da Copa da Grécia), 3º e 4º na Conference League e 2 rebaixados.',
  },
  nor_eliteserien: {
    id: 'nor_eliteserien',
    name: 'Eliteserien',
    shortName: 'Eliteserien (NOR)',
    country: 'Noruega',
    flagCode: 'NOR',
    flagEmoji: '🇳🇴',
    federation: 'NFF',
    tier: 1,
    clubsCount: 16,
    totalRounds: 30,
    uclBerths: 1,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 32_000_000,
    runnerUpPrize: 18_000_000,
    primaryColor: '#dc2626',
    secondaryColor: '#1d4ed8',
    formatSummary:
      '16 clubes em pontos corridos (30 rodadas). Campeão na Champions League, vice na Europa League (+ Campeão da NM Cup), 3º e 4º na Conference League e 2 rebaixados.',
  },
  den_superliga: {
    id: 'den_superliga',
    name: '3F Superliga',
    shortName: 'Superliga (DEN)',
    country: 'Dinamarca',
    flagCode: 'DEN',
    flagEmoji: '🇩🇰',
    federation: 'DBU',
    tier: 1,
    clubsCount: 12,
    totalRounds: 22,
    uclBerths: 1,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 35_000_000,
    runnerUpPrize: 20_000_000,
    primaryColor: '#c8102e',
    secondaryColor: '#ffffff',
    formatSummary:
      '12 clubes em pontos corridos (22 rodadas). Campeão na Champions League, vice na Europa League (+ Campeão da DBU Pokalen), 3º e 4º na Conference League e 2 rebaixados.',
  },
  sui_super_league: {
    id: 'sui_super_league',
    name: 'Credit Suisse Super League',
    shortName: 'Super League (SUI)',
    country: 'Suíça',
    flagCode: 'SUI',
    flagEmoji: '🇨🇭',
    federation: 'SFV / SFL',
    tier: 1,
    clubsCount: 12,
    totalRounds: 22,
    uclBerths: 1,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 36_000_000,
    runnerUpPrize: 21_000_000,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    formatSummary:
      '12 clubes em pontos corridos (22 rodadas). Campeão na Champions League, vice na Europa League (+ Campeão da Copa da Suíça), 3º e 4º na Conference League e 2 rebaixados.',
  },
  swe_allsvenskan: {
    id: 'swe_allsvenskan',
    name: 'Allsvenskan',
    shortName: 'Allsvenskan (SWE)',
    country: 'Suécia',
    flagCode: 'SWE',
    flagEmoji: '🇸🇪',
    federation: 'SvFF / SEF',
    tier: 1,
    clubsCount: 16,
    totalRounds: 30,
    uclBerths: 1,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 30_000_000,
    runnerUpPrize: 17_000_000,
    primaryColor: '#005293',
    secondaryColor: '#fecb00',
    formatSummary:
      '16 clubes em pontos corridos (30 rodadas). Campeão na Champions League, vice na Europa League (+ Campeão da Svenska Cupen), 3º e 4º na Conference League e 2 rebaixados.',
  },
  sco_premiership: {
    id: 'sco_premiership',
    name: 'Scottish Premiership',
    shortName: 'Premiership (ESC)',
    country: 'Escócia',
    flagCode: 'SCO',
    flagEmoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    federation: 'SFA / SPFL',
    tier: 1,
    clubsCount: 12,
    totalRounds: 22,
    uclBerths: 1,
    uelBerths: 1,
    ueclBerths: 2,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 42_000_000,
    runnerUpPrize: 25_000_000,
    primaryColor: '#002B49',
    secondaryColor: '#ffffff',
    formatSummary:
      '12 clubes em pontos corridos (22 rodadas). Campeão na Champions League, vice na Europa League (+ Campeão da Scottish Cup), 3º e 4º na Conference League e 2 rebaixados.',
  },
  eu_special_1: {
    id: 'eu_special_1',
    name: 'Liga Especial Europa 1',
    shortName: 'Especial 1',
    country: 'Europa',
    flagCode: 'EU',
    flagEmoji: '⭐',
    federation: 'UEFA Special League I',
    tier: 1,
    clubsCount: 16,
    totalRounds: 30,
    uclBerths: 1,
    uelBerths: 2,
    ueclBerths: 4,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 45_000_000,
    runnerUpPrize: 26_000_000,
    primaryColor: '#7c3aed',
    secondaryColor: '#f59e0b',
    formatSummary:
      '16 clubes em pontos corridos (30 rodadas). Campeão na Champions League, 2º e 3º na Europa League (+ Campeão da Taça Especial 1) e 4º ao 7º na Conference League.',
  },
  eu_special_2: {
    id: 'eu_special_2',
    name: 'Liga Especial Europa 2',
    shortName: 'Especial 2',
    country: 'Europa',
    flagCode: 'EU',
    flagEmoji: '🌟',
    federation: 'UEFA Special League II',
    tier: 1,
    clubsCount: 16,
    totalRounds: 30,
    uclBerths: 1,
    uelBerths: 1,
    ueclBerths: 6,
    promotionSlots: 0,
    relegationSlots: 2,
    championPrize: 40_000_000,
    runnerUpPrize: 22_000_000,
    primaryColor: '#0284c7',
    secondaryColor: '#10b981',
    formatSummary:
      '16 clubes em pontos corridos (30 rodadas). Campeão na Champions League, 2º na Europa League (+ Campeão da Taça Especial 2) e 3º ao 8º na Conference League.',
  },
};

export function isEuropeanLeague(comp: CompetitionType | string): comp is EuropeanLeagueId {
  return (EUROPEAN_LEAGUE_IDS as string[]).includes(comp);
}

export function isUefaContinental(comp: CompetitionType | string): comp is UefaContinentalId {
  return (UEFA_CONTINENTAL_IDS as string[]).includes(comp);
}

export function getClubEuropeanLeagueId(club?: Club | null): EuropeanLeagueId | null {
  if (!club || club.division !== 'EU') return null;
  if (
    club.id === 'eu_sp1_cel' ||
    club.id === 'eu_ibe' ||
    club.id === 'eu_ucr' ||
    club.id.startsWith('eu_esp3_') ||
    club.id.startsWith('eu_ita3_') ||
    club.id.startsWith('eu_fra3_')
  ) {
    return null; // Participantes exclusivos continentais UEFA ou copas nacionais (divisões inferiores)
  }
  if (club.europeanLeagueId && isEuropeanLeague(club.europeanLeagueId)) {
    return club.europeanLeagueId;
  }
  if (club.id === 'eu_shk' || club.id.startsWith('eu_sp1_')) return 'eu_special_1';
  if (club.id.startsWith('eu_sp2_')) return 'eu_special_2';
  const byCountry: Record<string, EuropeanLeagueId> = {
    Inglaterra: 'eng_premier',
    'País de Gales': 'eng_championship',
    Espanha: 'esp_laliga',
    Itália: 'ita_serie_a',
    Alemanha: 'ger_bundesliga',
    França: 'fra_ligue1',
    Portugal: 'por_primeira',
    Holanda: 'ned_eredivisie',
    Bélgica: 'bel_pro_league',
    Turquia: 'tur_super_lig',
    Grécia: 'gre_super_league',
    Noruega: 'nor_eliteserien',
    Dinamarca: 'den_superliga',
    Suíça: 'sui_super_league',
    Suécia: 'swe_allsvenskan',
    Escócia: 'sco_premiership',
  };
  return byCountry[club.country || ''] || 'eng_premier';
}

export function getClubsForEuropeanLeague(clubs: Club[], leagueId: EuropeanLeagueId): Club[] {
  return clubs.filter((c) => c.division === 'EU' && getClubEuropeanLeagueId(c) === leagueId);
}

function formatIsoDateFromEpoch(year: number, monthZero: number, day: number): string {
  const dt = new Date(year, monthZero, day);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Maps any European league round (1..totalRounds, including 46-round EFL divisions)
 * onto the real-life split-year European calendar:
 * - Starts in August of `seasonYear` (e.g. Aug 2026) and finishes in May of `seasonYear + 1` (e.g. May 2027).
 */
export function getEuropeanRoundDate(
  round: number,
  totalRounds: number,
  seasonYear: number = 2026,
  leagueId?: EuropeanLeagueId
): { date: string; time: string } {
  if (totalRounds <= 38) {
    if (leagueId) {
      const scheduleDates = getEuropeanLeagueScheduleDates(leagueId, totalRounds, seasonYear);
      if (scheduleDates[round - 1]) {
        return scheduleDates[round - 1];
      }
    }
    const euSundays = getEuropeanLeagueWeekendSundays(seasonYear);
    const maxIdx = Math.max(0, euSundays.length - 1);
    const mappedIdx = Math.max(
      0,
      Math.min(
        maxIdx,
        Math.round(((round - 1) / Math.max(1, totalRounds - 1)) * maxIdx)
      )
    );
    const sunDate = euSundays[mappedIdx] || `${seasonYear}-08-16`;
    // Alternate Saturday (16:00) & Sunday (16:30) kickoffs; final round simultaneous on Sunday
    const isFinalRound = round === totalRounds;
    const dateStr = !isFinalRound && round % 2 === 1 ? addDays(sunDate, -1) : sunDate;
    const time = isFinalRound ? '16:00' : round % 2 === 1 ? '16:00' : '16:30';
    return { date: dateStr, time };
  }

  // For 46-round English EFL divisions (Championship, League One, League Two):
  // Guaranteed 46 strictly unique non-FIFA, non-UEFA dates from 2nd Saturday of August through early May.
  const eflDates = getEflLeagueScheduleDates(totalRounds, seasonYear);
  if (eflDates[round - 1]) {
    return eflDates[round - 1];
  }
  const fallback = eflDates[eflDates.length - 1] || { date: `${seasonYear + 1}-05-09`, time: '15:00' };
  return fallback;
}

export function generateEuropeanLeagueSchedule(
  teamIds: string[],
  leagueId: EuropeanLeagueId,
  seasonYear: number = 2026
): Fixture[] {
  const fixtures: Fixture[] = [];
  const cleanIds = [...teamIds];
  if (cleanIds.length < 4) return fixtures;

  // Marquee Round 1 openers positioned BEFORE Berger rotation so round 1 match 0 naturally has zero collisions:
  const marqueeOpeners: Partial<Record<EuropeanLeagueId, [string, string, string]>> = {
    eng_premier: ['eu_ars', 'eu_cov', '12:30'],
    esp_laliga: ['eu_rma', 'eu_rso', '21:00'],
    ger_bundesliga: ['eu_bay', 'eu_vfb', '20:30'],
  };
  const marqueeSpec = marqueeOpeners[leagueId];
  if (marqueeSpec && cleanIds.length % 2 === 0) {
    const [mHome, mAway] = marqueeSpec;
    if (cleanIds.includes(mHome) && cleanIds.includes(mAway)) {
      const rest = cleanIds.filter((id) => id !== mHome && id !== mAway);
      cleanIds.splice(
        0,
        cleanIds.length,
        rest[0],
        mHome,
        ...rest.slice(1),
        mAway
      );
    }
  }

  const teams = cleanIds.length % 2 === 0 ? cleanIds : [...cleanIds, '__BYE__'];
  const n = teams.length;
  const halfSeasonRounds = n - 1;
  const totalRounds = halfSeasonRounds * 2;
  const matchesPerRound = n / 2;

  const minEuDate = `${seasonYear}-08-01`;
  const maxEuDate = `${seasonYear + 1}-06-15`;
  const euRoundBaseSlots = Array.from({ length: totalRounds }, (_, idx) =>
    getEuropeanRoundDate(idx + 1, totalRounds, seasonYear, leagueId)
  );

  for (let round = 1; round <= halfSeasonRounds; round++) {
    const returnRound = round + halfSeasonRounds;
    const round1Date = euRoundBaseSlots[round - 1];
    const round1Prev = round > 1 ? euRoundBaseSlots[round - 2]?.date : undefined;
    const round1Next = round < totalRounds ? euRoundBaseSlots[round]?.date : undefined;

    const round2Date = euRoundBaseSlots[returnRound - 1];
    const round2Prev = returnRound > 1 ? euRoundBaseSlots[returnRound - 2]?.date : undefined;
    const round2Next = returnRound < totalRounds ? euRoundBaseSlots[returnRound]?.date : undefined;

    for (let match = 0; match < matchesPerRound; match++) {
      const home = (round + match) % (n - 1);
      let away = (n - 1 - match + round) % (n - 1);
      if (match === 0) away = n - 1;

      const homeTeam = round % 2 === 1 ? teams[home] : teams[away];
      const awayTeam = round % 2 === 1 ? teams[away] : teams[home];

      if (homeTeam === '__BYE__' || awayTeam === '__BYE__') continue;

      const slot1 = assignVariedMatchDaySlot(
        round1Date.date,
        match,
        round,
        totalRounds,
        `${leagueId}_${seasonYear}`,
        {
          minDate: minEuDate,
          maxDate: maxEuDate,
          prevRoundBaseDate: round1Prev,
          nextRoundBaseDate: round1Next,
          region: 'europe',
          fallbackTime: round1Date.time,
        }
      );

      const isMarqueeOpener = Boolean(
        marqueeSpec &&
          round === 1 &&
          homeTeam === marqueeSpec[0] &&
          awayTeam === marqueeSpec[1]
      );

      fixtures.push({
        id: `${leagueId}_r${round}_m${match}`,
        round,
        competition: leagueId,
        homeTeamId: homeTeam,
        awayTeamId: awayTeam,
        homeScore: null,
        awayScore: null,
        played: false,
        date: slot1.date,
        time: isMarqueeOpener && marqueeSpec ? marqueeSpec[2] : slot1.time,
      });

      const slot2 = assignVariedMatchDaySlot(
        round2Date.date,
        match,
        returnRound,
        totalRounds,
        `${leagueId}_${seasonYear}`,
        {
          minDate: minEuDate,
          maxDate: maxEuDate,
          prevRoundBaseDate: round2Prev,
          nextRoundBaseDate: round2Next,
          region: 'europe',
          fallbackTime: round2Date.time,
        }
      );

      fixtures.push({
        id: `${leagueId}_r${returnRound}_m${match}`,
        round: returnRound,
        competition: leagueId,
        homeTeamId: awayTeam,
        awayTeamId: homeTeam,
        homeScore: null,
        awayScore: null,
        played: false,
        date: slot2.date,
        time: slot2.time,
      });
    }
  }

  fixtures.sort((a, b) => a.round - b.round);

  if (leagueId === 'eng_championship') {
    const r1Date = `${seasonYear + 1}-05-12`;
    const semiIdaDate = `${seasonYear + 1}-05-16`;
    const semiVoltaDate = `${seasonYear + 1}-05-20`;
    const finalDate = `${seasonYear + 1}-05-30`;

    // 1ª Rodada dos Playoffs (Jogo Único)
    // 5º vs 8º (5º em casa)
    fixtures.push({
      id: 'eng_championship_playoff_r1_5v8',
      round: 47,
      competition: 'eng_championship',
      homeTeamId: 'TBD_CH_5TH',
      awayTeamId: 'TBD_CH_8TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: r1Date,
      time: '19:45',
      cupPhase: 'Playoffs - 1ª Rodada',
      leg: 1,
    });
    // 6º vs 7º (6º em casa)
    fixtures.push({
      id: 'eng_championship_playoff_r1_6v7',
      round: 47,
      competition: 'eng_championship',
      homeTeamId: 'TBD_CH_6TH',
      awayTeamId: 'TBD_CH_7TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: r1Date,
      time: '20:00',
      cupPhase: 'Playoffs - 1ª Rodada',
      leg: 1,
    });

    // 2ª Rodada dos Playoffs: Semifinais (Ida e Volta)
    // Semifinal A: 3º vs Vencedor (6º vs 7º) (Ida na casa do Venc 6/7, Volta na casa do 3º)
    fixtures.push({
      id: 'eng_championship_playoff_semiA_ida',
      round: 48,
      competition: 'eng_championship',
      homeTeamId: 'TBD_CH_R1_WIN_67',
      awayTeamId: 'TBD_CH_3RD',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiIdaDate,
      time: '15:00',
      cupPhase: 'Playoffs - Semifinal (Ida)',
      leg: 1,
    });
    fixtures.push({
      id: 'eng_championship_playoff_semiA_volta',
      round: 49,
      competition: 'eng_championship',
      homeTeamId: 'TBD_CH_3RD',
      awayTeamId: 'TBD_CH_R1_WIN_67',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiVoltaDate,
      time: '19:45',
      cupPhase: 'Playoffs - Semifinal (Volta)',
      leg: 2,
    });

    // Semifinal B: 4º vs Vencedor (5º vs 8º) (Ida na casa do Venc 5/8, Volta na casa do 4º)
    fixtures.push({
      id: 'eng_championship_playoff_semiB_ida',
      round: 48,
      competition: 'eng_championship',
      homeTeamId: 'TBD_CH_R1_WIN_58',
      awayTeamId: 'TBD_CH_4TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiIdaDate,
      time: '17:30',
      cupPhase: 'Playoffs - Semifinal (Ida)',
      leg: 1,
    });
    fixtures.push({
      id: 'eng_championship_playoff_semiB_volta',
      round: 49,
      competition: 'eng_championship',
      homeTeamId: 'TBD_CH_4TH',
      awayTeamId: 'TBD_CH_R1_WIN_58',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiVoltaDate,
      time: '19:45',
      cupPhase: 'Playoffs - Semifinal (Volta)',
      leg: 2,
    });

    // Grande Final em Wembley (Jogo Único)
    fixtures.push({
      id: 'eng_championship_playoff_final',
      round: 50,
      competition: 'eng_championship',
      homeTeamId: 'TBD_CH_SEMI_WIN_A',
      awayTeamId: 'TBD_CH_SEMI_WIN_B',
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '15:00',
      stadiumName: 'Wembley Stadium, London',
      cupPhase: 'Playoffs - Final',
    });
  }

  if (leagueId === 'eng_league_one') {
    const semiIdaDate = `${seasonYear + 1}-05-15`;
    const semiVoltaDate = `${seasonYear + 1}-05-19`;
    const finalDate = `${seasonYear + 1}-05-29`;

    fixtures.push({
      id: 'eng_league_one_playoff_semi1_ida',
      round: 47,
      competition: 'eng_league_one',
      homeTeamId: 'TBD_L1_6TH',
      awayTeamId: 'TBD_L1_3RD',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiIdaDate,
      time: '15:00',
      cupPhase: 'Playoffs - Semifinal (Ida)',
      leg: 1,
    });
    fixtures.push({
      id: 'eng_league_one_playoff_semi1_volta',
      round: 48,
      competition: 'eng_league_one',
      homeTeamId: 'TBD_L1_3RD',
      awayTeamId: 'TBD_L1_6TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiVoltaDate,
      time: '19:45',
      cupPhase: 'Playoffs - Semifinal (Volta)',
      leg: 2,
    });
    fixtures.push({
      id: 'eng_league_one_playoff_semi2_ida',
      round: 47,
      competition: 'eng_league_one',
      homeTeamId: 'TBD_L1_5TH',
      awayTeamId: 'TBD_L1_4TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiIdaDate,
      time: '15:00',
      cupPhase: 'Playoffs - Semifinal (Ida)',
      leg: 1,
    });
    fixtures.push({
      id: 'eng_league_one_playoff_semi2_volta',
      round: 48,
      competition: 'eng_league_one',
      homeTeamId: 'TBD_L1_4TH',
      awayTeamId: 'TBD_L1_5TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiVoltaDate,
      time: '19:45',
      cupPhase: 'Playoffs - Semifinal (Volta)',
      leg: 2,
    });
    fixtures.push({
      id: 'eng_league_one_playoff_final',
      round: 49,
      competition: 'eng_league_one',
      homeTeamId: 'TBD_L1_WIN1',
      awayTeamId: 'TBD_L1_WIN2',
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '15:00',
      stadiumName: 'Wembley Stadium, London',
      cupPhase: 'Playoffs - Final',
    });
  }

  if (leagueId === 'eng_league_two') {
    const semiIdaDate = `${seasonYear + 1}-05-15`;
    const semiVoltaDate = `${seasonYear + 1}-05-19`;
    const finalDate = `${seasonYear + 1}-05-29`;

    fixtures.push({
      id: 'eng_league_two_playoff_semi1_ida',
      round: 47,
      competition: 'eng_league_two',
      homeTeamId: 'TBD_L2_7TH',
      awayTeamId: 'TBD_L2_4TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiIdaDate,
      time: '15:00',
      cupPhase: 'Playoffs - Semifinal (Ida)',
      leg: 1,
    });
    fixtures.push({
      id: 'eng_league_two_playoff_semi1_volta',
      round: 48,
      competition: 'eng_league_two',
      homeTeamId: 'TBD_L2_4TH',
      awayTeamId: 'TBD_L2_7TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiVoltaDate,
      time: '19:45',
      cupPhase: 'Playoffs - Semifinal (Volta)',
      leg: 2,
    });
    fixtures.push({
      id: 'eng_league_two_playoff_semi2_ida',
      round: 47,
      competition: 'eng_league_two',
      homeTeamId: 'TBD_L2_6TH',
      awayTeamId: 'TBD_L2_5TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiIdaDate,
      time: '15:00',
      cupPhase: 'Playoffs - Semifinal (Ida)',
      leg: 1,
    });
    fixtures.push({
      id: 'eng_league_two_playoff_semi2_volta',
      round: 48,
      competition: 'eng_league_two',
      homeTeamId: 'TBD_L2_5TH',
      awayTeamId: 'TBD_L2_6TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiVoltaDate,
      time: '19:45',
      cupPhase: 'Playoffs - Semifinal (Volta)',
      leg: 2,
    });
    fixtures.push({
      id: 'eng_league_two_playoff_final',
      round: 49,
      competition: 'eng_league_two',
      homeTeamId: 'TBD_L2_WIN1',
      awayTeamId: 'TBD_L2_WIN2',
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalDate,
      time: '15:00',
      stadiumName: 'Wembley Stadium, London',
      cupPhase: 'Playoffs - Final',
    });
  }

  if (leagueId === 'ger_bundesliga2') {
    // Relegation Playoff oficial da Alemanha (Ida e Volta): 16º da Bundesliga x 3º da 2. Bundesliga
    // Ida na casa do 16º da Bundesliga (quinta-feira), Volta na casa do 3º da 2. Bundesliga (segunda-feira)
    const playoffIdaDate = `${seasonYear + 1}-05-27`;
    const playoffVoltaDate = `${seasonYear + 1}-05-31`;

    fixtures.push({
      id: 'ger_bundesliga2_playoff_ida',
      round: 35,
      competition: 'ger_bundesliga2',
      homeTeamId: 'TBD_GER_BL1_16TH',
      awayTeamId: 'TBD_GER_BL2_3RD',
      homeScore: null,
      awayScore: null,
      played: false,
      date: playoffIdaDate,
      time: '20:30',
      cupPhase: 'Playoff de Acesso/Rebaixamento (Ida)',
      groupName: 'Bundesliga 16º × 2. Bundesliga 3º · Jogo de Ida',
      leg: 1,
    });
    fixtures.push({
      id: 'ger_bundesliga2_playoff_volta',
      round: 36,
      competition: 'ger_bundesliga2',
      homeTeamId: 'TBD_GER_BL2_3RD',
      awayTeamId: 'TBD_GER_BL1_16TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: playoffVoltaDate,
      time: '20:30',
      cupPhase: 'Playoff de Acesso/Rebaixamento (Volta)',
      groupName: 'Bundesliga 16º × 2. Bundesliga 3º · Jogo de Volta',
      leg: 2,
    });
  }

  if (leagueId === 'fra_ligue2') {
    // Regulamento Oficial da Ligue 2 (França):
    // - Play-off 1 (Jogo Único, pênaltis diretos): 4º (casa) x 5º
    // - Play-off 2 (Jogo Único, pênaltis diretos): 3º (casa) x Vencedor Play-off 1
    // - Barrage Ligue 1/Ligue 2 (Ida e Volta): Ida na casa do Vencedor Play-off 2, Volta na casa do 16º da Ligue 1
    const po1Date = `${seasonYear + 1}-05-18`;
    const po2Date = `${seasonYear + 1}-05-21`;
    const barrageIdaDate = `${seasonYear + 1}-05-27`;
    const barrageVoltaDate = `${seasonYear + 1}-05-30`;

    fixtures.push({
      id: 'fra_ligue2_playoff_r1',
      round: 35,
      competition: 'fra_ligue2',
      homeTeamId: 'TBD_FRA_L2_4TH',
      awayTeamId: 'TBD_FRA_L2_5TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: po1Date,
      time: '20:30',
      cupPhase: 'Play-off 1 (4º × 5º · Jogo Único)',
      groupName: 'Ligue 2 Play-off 1 · Jogo Único (pênaltis diretos se empatar)',
    });
    fixtures.push({
      id: 'fra_ligue2_playoff_r2',
      round: 36,
      competition: 'fra_ligue2',
      homeTeamId: 'TBD_FRA_L2_3RD',
      awayTeamId: 'TBD_FRA_L2_PO1_WIN',
      homeScore: null,
      awayScore: null,
      played: false,
      date: po2Date,
      time: '20:30',
      cupPhase: 'Play-off 2 (3º × Venc. PO1 · Jogo Único)',
      groupName: 'Ligue 2 Play-off 2 · Jogo Único (pênaltis diretos se empatar)',
    });
    fixtures.push({
      id: 'fra_ligue2_playoff_barrage_ida',
      round: 37,
      competition: 'fra_ligue2',
      homeTeamId: 'TBD_FRA_L2_PO2_WIN',
      awayTeamId: 'TBD_FRA_L1_16TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: barrageIdaDate,
      time: '20:30',
      cupPhase: 'Barrage Acesso/Rebaixamento (Ida)',
      groupName: 'Barrage Ligue 1/Ligue 2 · Ida (Casa da Ligue 2)',
      leg: 1,
    });
    fixtures.push({
      id: 'fra_ligue2_playoff_barrage_volta',
      round: 38,
      competition: 'fra_ligue2',
      homeTeamId: 'TBD_FRA_L1_16TH',
      awayTeamId: 'TBD_FRA_L2_PO2_WIN',
      homeScore: null,
      awayScore: null,
      played: false,
      date: barrageVoltaDate,
      time: '17:00',
      cupPhase: 'Barrage Acesso/Rebaixamento (Volta)',
      groupName: 'Barrage Ligue 1/Ligue 2 · Volta (Casa da Ligue 1)',
      leg: 2,
    });
  }

  if (leagueId === 'esp_laliga2') {
    // Regulamento Oficial da LALIGA HYPERMOTION (2ª Divisão da Espanha):
    // - 22 clubes, 42 rodadas; 1º e 2º sobem direto à LaLiga
    // - Play-offs de Acesso (3º ao 6º em Ida e Volta):
    //   Semifinal 1: 6º (Ida) x 3º (Volta)
    //   Semifinal 2: 5º (Ida) x 4º (Volta)
    //   Final (Ida e Volta): Melhor campanha decide a volta em casa; vencedor conquista a 3ª vaga de acesso
    const semiIdaDate = `${seasonYear + 1}-05-20`;
    const semiVoltaDate = `${seasonYear + 1}-05-24`;
    const finalIdaDate = `${seasonYear + 1}-05-27`;
    const finalVoltaDate = `${seasonYear + 1}-05-30`;

    fixtures.push({
      id: 'esp_laliga2_playoff_semi1_ida',
      round: 43,
      competition: 'esp_laliga2',
      homeTeamId: 'TBD_ESP_L2_6TH',
      awayTeamId: 'TBD_ESP_L2_3RD',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiIdaDate,
      time: '20:30',
      cupPhase: 'Play-offs · Semifinal (Ida)',
      groupName: 'Play-offs de Acesso · Semifinal 1 (6º × 3º · Ida)',
      leg: 1,
    });
    fixtures.push({
      id: 'esp_laliga2_playoff_semi1_volta',
      round: 44,
      competition: 'esp_laliga2',
      homeTeamId: 'TBD_ESP_L2_3RD',
      awayTeamId: 'TBD_ESP_L2_6TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiVoltaDate,
      time: '20:30',
      cupPhase: 'Play-offs · Semifinal (Volta)',
      groupName: 'Play-offs de Acesso · Semifinal 1 (3º × 6º · Volta)',
      leg: 2,
    });
    fixtures.push({
      id: 'esp_laliga2_playoff_semi2_ida',
      round: 43,
      competition: 'esp_laliga2',
      homeTeamId: 'TBD_ESP_L2_5TH',
      awayTeamId: 'TBD_ESP_L2_4TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiIdaDate,
      time: '21:00',
      cupPhase: 'Play-offs · Semifinal (Ida)',
      groupName: 'Play-offs de Acesso · Semifinal 2 (5º × 4º · Ida)',
      leg: 1,
    });
    fixtures.push({
      id: 'esp_laliga2_playoff_semi2_volta',
      round: 44,
      competition: 'esp_laliga2',
      homeTeamId: 'TBD_ESP_L2_4TH',
      awayTeamId: 'TBD_ESP_L2_5TH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: semiVoltaDate,
      time: '21:00',
      cupPhase: 'Play-offs · Semifinal (Volta)',
      groupName: 'Play-offs de Acesso · Semifinal 2 (4º × 5º · Volta)',
      leg: 2,
    });
    fixtures.push({
      id: 'esp_laliga2_playoff_final_ida',
      round: 45,
      competition: 'esp_laliga2',
      homeTeamId: 'TBD_ESP_L2_SF_LOW',
      awayTeamId: 'TBD_ESP_L2_SF_HIGH',
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalIdaDate,
      time: '20:30',
      cupPhase: 'Play-offs · Final (Ida)',
      groupName: 'Play-offs de Acesso · Final · Jogo de Ida',
      leg: 1,
    });
    fixtures.push({
      id: 'esp_laliga2_playoff_final_volta',
      round: 46,
      competition: 'esp_laliga2',
      homeTeamId: 'TBD_ESP_L2_SF_HIGH',
      awayTeamId: 'TBD_ESP_L2_SF_LOW',
      homeScore: null,
      awayScore: null,
      played: false,
      date: finalVoltaDate,
      time: '20:30',
      cupPhase: 'Play-offs · Final (Volta)',
      groupName: 'Play-offs de Acesso · Final · Jogo de Volta (Decisão da 3ª Vaga)',
      leg: 2,
    });
  }

  if (leagueId === 'ita_serie_b') {
    // Regulamento Oficial da Serie BKT (2ª Divisão da Itália):
    // - 20 clubes, 38 rodadas; 1º e 2º sobem direto para a Serie A
    // - Regra dos 15 pontos: se o 3º terminar com 15+ pontos de vantagem sobre o 4º, não há playoffs e o 3º sobe direto
    // - Playoffs de Acesso (3º ao 8º em Ida e Volta):
    //   Quartas: 8º (Ida) x 5º (Volta) e 7º (Ida) x 6º (Volta)
    //   Semifinais: Venc. 6º/7º (Ida) x 3º (Volta) e Venc. 5º/8º (Ida) x 4º (Volta)
    //   Final (Ida e Volta): Melhor campanha decide a Volta em casa; vencedor conquista a 3ª vaga
    // - Rebaixamento (4 vagas): 18º–20º caem direto + Playout (17º Ida × 16º Volta) define o 4º rebaixado
    const qfIdaDate = `${seasonYear + 1}-05-16`;
    const qfVoltaDate = `${seasonYear + 1}-05-19`;
    const sfIdaDate = `${seasonYear + 1}-05-22`;
    const sfVoltaDate = `${seasonYear + 1}-05-25`;
    const finalIdaDate = `${seasonYear + 1}-05-28`;
    const finalVoltaDate = `${seasonYear + 1}-05-31`;
    const playoutIdaDate = `${seasonYear + 1}-05-21`;
    const playoutVoltaDate = `${seasonYear + 1}-05-26`;

    fixtures.push(
      {
        id: 'ita_serie_b_playoff_qf1_ida',
        round: 39,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_8TH',
        awayTeamId: 'TBD_ITA_SB_5TH',
        homeScore: null,
        awayScore: null,
        played: false,
        date: qfIdaDate,
        time: '18:00',
        cupPhase: 'Playoffs · Quartas de Final (Ida)',
        groupName: 'Playoffs de Acesso · Quartas 1 (8º × 5º · Ida)',
        leg: 1,
      },
      {
        id: 'ita_serie_b_playoff_qf1_volta',
        round: 40,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_5TH',
        awayTeamId: 'TBD_ITA_SB_8TH',
        homeScore: null,
        awayScore: null,
        played: false,
        date: qfVoltaDate,
        time: '18:00',
        cupPhase: 'Playoffs · Quartas de Final (Volta)',
        groupName: 'Playoffs de Acesso · Quartas 1 (5º × 8º · Volta)',
        leg: 2,
      },
      {
        id: 'ita_serie_b_playoff_qf2_ida',
        round: 39,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_7TH',
        awayTeamId: 'TBD_ITA_SB_6TH',
        homeScore: null,
        awayScore: null,
        played: false,
        date: qfIdaDate,
        time: '20:30',
        cupPhase: 'Playoffs · Quartas de Final (Ida)',
        groupName: 'Playoffs de Acesso · Quartas 2 (7º × 6º · Ida)',
        leg: 1,
      },
      {
        id: 'ita_serie_b_playoff_qf2_volta',
        round: 40,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_6TH',
        awayTeamId: 'TBD_ITA_SB_7TH',
        homeScore: null,
        awayScore: null,
        played: false,
        date: qfVoltaDate,
        time: '20:30',
        cupPhase: 'Playoffs · Quartas de Final (Volta)',
        groupName: 'Playoffs de Acesso · Quartas 2 (6º × 7º · Volta)',
        leg: 2,
      },
      {
        id: 'ita_serie_b_playoff_sf1_ida',
        round: 41,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_QF2_WIN',
        awayTeamId: 'TBD_ITA_SB_3RD',
        homeScore: null,
        awayScore: null,
        played: false,
        date: sfIdaDate,
        time: '18:00',
        cupPhase: 'Playoffs · Semifinal (Ida)',
        groupName: 'Playoffs de Acesso · Semifinal 1 (Venc. 6º/7º × 3º · Ida)',
        leg: 1,
      },
      {
        id: 'ita_serie_b_playoff_sf1_volta',
        round: 42,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_3RD',
        awayTeamId: 'TBD_ITA_SB_QF2_WIN',
        homeScore: null,
        awayScore: null,
        played: false,
        date: sfVoltaDate,
        time: '18:00',
        cupPhase: 'Playoffs · Semifinal (Volta)',
        groupName: 'Playoffs de Acesso · Semifinal 1 (3º × Venc. 6º/7º · Volta)',
        leg: 2,
      },
      {
        id: 'ita_serie_b_playoff_sf2_ida',
        round: 41,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_QF1_WIN',
        awayTeamId: 'TBD_ITA_SB_4TH',
        homeScore: null,
        awayScore: null,
        played: false,
        date: sfIdaDate,
        time: '20:30',
        cupPhase: 'Playoffs · Semifinal (Ida)',
        groupName: 'Playoffs de Acesso · Semifinal 2 (Venc. 5º/8º × 4º · Ida)',
        leg: 1,
      },
      {
        id: 'ita_serie_b_playoff_sf2_volta',
        round: 42,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_4TH',
        awayTeamId: 'TBD_ITA_SB_QF1_WIN',
        homeScore: null,
        awayScore: null,
        played: false,
        date: sfVoltaDate,
        time: '20:30',
        cupPhase: 'Playoffs · Semifinal (Volta)',
        groupName: 'Playoffs de Acesso · Semifinal 2 (4º × Venc. 5º/8º · Volta)',
        leg: 2,
      },
      {
        id: 'ita_serie_b_playoff_final_ida',
        round: 43,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_SF_LOW',
        awayTeamId: 'TBD_ITA_SB_SF_HIGH',
        homeScore: null,
        awayScore: null,
        played: false,
        date: finalIdaDate,
        time: '20:30',
        cupPhase: 'Playoffs · Final (Ida)',
        groupName: 'Playoffs de Acesso · Final · Jogo de Ida',
        leg: 1,
      },
      {
        id: 'ita_serie_b_playoff_final_volta',
        round: 44,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_SF_HIGH',
        awayTeamId: 'TBD_ITA_SB_SF_LOW',
        homeScore: null,
        awayScore: null,
        played: false,
        date: finalVoltaDate,
        time: '20:30',
        cupPhase: 'Playoffs · Final (Volta)',
        groupName: 'Playoffs de Acesso · Final · Jogo de Volta (Decisão da 3ª Vaga)',
        leg: 2,
      },
      {
        id: 'ita_serie_b_playoff_playout_ida',
        round: 39,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_17TH',
        awayTeamId: 'TBD_ITA_SB_16TH',
        homeScore: null,
        awayScore: null,
        played: false,
        date: playoutIdaDate,
        time: '20:30',
        cupPhase: 'Playout de Rebaixamento (Ida)',
        groupName: 'Playout Serie B · 17º × 16º · Jogo de Ida',
        leg: 1,
      },
      {
        id: 'ita_serie_b_playoff_playout_volta',
        round: 40,
        competition: 'ita_serie_b',
        homeTeamId: 'TBD_ITA_SB_16TH',
        awayTeamId: 'TBD_ITA_SB_17TH',
        homeScore: null,
        awayScore: null,
        played: false,
        date: playoutVoltaDate,
        time: '20:30',
        cupPhase: 'Playout de Rebaixamento (Volta)',
        groupName: 'Playout Serie B · 16º × 17º · Jogo de Volta (Perdedor cai à Serie C)',
        leg: 2,
      }
    );
  }

  return fixtures;
}

export function generateAllEuropeanLeagues(
  clubs: Club[],
  seasonYear: number = 2026
): {
  fixturesEurope: Record<EuropeanLeagueId, Fixture[]>;
  standingsEurope: Record<EuropeanLeagueId, Standing[]>;
} {
  const fixturesEurope = {} as Record<EuropeanLeagueId, Fixture[]>;
  const standingsEurope = {} as Record<EuropeanLeagueId, Standing[]>;

  for (const leagueId of EUROPEAN_LEAGUE_IDS) {
    const leagueClubs = getClubsForEuropeanLeague(clubs, leagueId);
    const ids = leagueClubs.map((c) => c.id);
    fixturesEurope[leagueId] = generateEuropeanLeagueSchedule(ids, leagueId, seasonYear);
    standingsEurope[leagueId] = generateInitialStandings(ids);
  }

  return { fixturesEurope, standingsEurope };
}

export interface UefaLeagueQualifierBreakdown {
  leagueId: EuropeanLeagueId;
  country: string;
  leagueName: string;
  flagEmoji: string;
  uclIds: string[];
  uelIds: string[];
  ueclIds: string[];
  uelCupId?: EuropeanCupId | 'eng_fa_cup';
  uelCupName?: string;
  uelCupChampionId?: string | null;
  uelCupInheritedToLeague?: boolean;
}

export interface UefaQualificationResult {
  championsLeagueIds: string[]; // Exatamente 36 clubes
  europaLeagueIds: string[]; // Exatamente 36 clubes
  conferenceLeagueIds: string[]; // Exatamente 36 clubes
  byLeague: Record<EuropeanLeagueId, UefaLeagueQualifierBreakdown>;
  orderedTopLeagues: UefaLeagueQualifierBreakdown[];
}

function getOrderedEuropeanStandingsOrRatingOrder(
  clubs: Club[],
  leagueClubs: Club[],
  standings?: Standing[]
): string[] {
  const validIds = new Set(leagueClubs.map((c) => c.id));
  if (standings && standings.length > 0 && standings.some((s) => s.played > 0)) {
    const sorted = standings
      .filter((s) => validIds.has(s.teamId))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.won - a.won ||
          b.goalDifference - a.goalDifference ||
          b.goalsFor - a.goalsFor
      )
      .map((s) => s.teamId);

    for (const c of leagueClubs) {
      if (!sorted.includes(c.id)) sorted.push(c.id);
    }
    return sorted;
  }

  return [...leagueClubs]
    .sort((a, b) => {
      const ra = getClubSectorRatings(a).overall;
      const rb = getClubSectorRatings(b).overall;
      if (rb !== ra) return rb - ra;
      return b.reputation - a.reputation;
    })
    .map((c) => c.id);
}

/**
 * Ordena os 36 clubes classificados pelo coeficiente UEFA (campeão defensor em #1 do Pote 1,
 * seguido de overall real do elenco e reputação) para distribuição oficial nos Potes da Fase de Liga.
 */
export function seedUefa36ClubsByCoefficient(
  clubIds: string[],
  clubs: Club[],
  defendingChampId?: string | null
): string[] {
  const clubMap = new Map(clubs.map((c) => [c.id, c]));
  const uniqueIds = Array.from(new Set(clubIds)).filter((id) => clubMap.has(id));
  uniqueIds.sort((aId, bId) => {
    if (defendingChampId) {
      if (aId === defendingChampId && bId !== defendingChampId) return -1;
      if (bId === defendingChampId && aId !== defendingChampId) return 1;
    }
    const ca = clubMap.get(aId)!;
    const cb = clubMap.get(bId)!;
    const oa = getClubSectorRatings(ca).overall;
    const ob = getClubSectorRatings(cb).overall;
    if (ob !== oa) return ob - oa;
    if (cb.reputation !== ca.reputation) return cb.reputation - ca.reputation;
    return cb.stadium.capacity - ca.stadium.capacity;
  });
  return uniqueIds.slice(0, 36);
}

/**
 * Calcula os 36 classificados da UEFA Champions League, 36 da Europa League e 36 da Conference League
 * no formato oficial de Fase de Liga, respeitando a classificação das 17 primeiras divisões europeias,
 * os detentores de títulos UEFA e os campeões das copas nacionais de cada país (FA Cup na Inglaterra) na Europa League.
 */
export function computeUefaContinentalQualifiers(params: {
  clubs: Club[];
  standingsEurope?: Partial<Record<EuropeanLeagueId, Standing[]>>;
  uclTitleHolderId?: string | null;
  uelTitleHolderId?: string | null;
  ueclTitleHolderId?: string | null;
  faCupChampionId?: string | null;
  domesticCupChampions?: Partial<Record<EuropeanCupId, string | null>>;
}): UefaQualificationResult {
  const {
    clubs,
    standingsEurope,
    uclTitleHolderId,
    uelTitleHolderId,
    ueclTitleHolderId,
    faCupChampionId,
    domesticCupChampions = {},
  } = params;

  const uclSet = new Set<string>();
  const uelSet = new Set<string>();
  const ueclSet = new Set<string>();

  const clubById = new Map(clubs.map((c) => [c.id, c]));

  const hasCompletedLeagueStandings = Boolean(
    standingsEurope &&
      Object.values(standingsEurope).some((stds) =>
        (stds || []).some((s) => s.played > 0)
      )
  );

  if (!hasCompletedLeagueStandings) {
    INITIAL_CHAMPIONS_LEAGUE_CLUB_IDS.forEach((id) => uclSet.add(id));
    INITIAL_EUROPA_LEAGUE_CLUB_IDS.forEach((id) => uelSet.add(id));
    INITIAL_CONFERENCE_LEAGUE_CLUB_IDS.forEach((id) => ueclSet.add(id));
  }

  // Campeão da UCL e Campeão da UEL têm vaga direta na Champions League (se clube europeu)
  for (const holderId of [uclTitleHolderId, uelTitleHolderId]) {
    if (holderId && clubById.get(holderId)?.division === 'EU') {
      uclSet.add(holderId);
    }
  }

  // Campeão da Conference League tem vaga na Europa League (se não estiver na UCL)
  if (
    ueclTitleHolderId &&
    clubById.get(ueclTitleHolderId)?.division === 'EU' &&
    !uclSet.has(ueclTitleHolderId)
  ) {
    uelSet.add(ueclTitleHolderId);
  }

  const byLeague = {} as Record<EuropeanLeagueId, UefaLeagueQualifierBreakdown>;
  const orderedTopLeagues: UefaLeagueQualifierBreakdown[] = [];

  for (const leagueId of EUROPEAN_TOP_DIVISION_IDS) {
    const meta = EUROPEAN_LEAGUES_META[leagueId];
    const cupInfo = EUROPEAN_LEAGUE_DOMESTIC_CUP[leagueId];
    const rawCupChampId = cupInfo
      ? cupInfo.cupId === 'eng_fa_cup'
        ? faCupChampionId
        : domesticCupChampions[cupInfo.cupId]
      : undefined;
    const validCupChampId =
      rawCupChampId && clubById.get(rawCupChampId)?.division === 'EU'
        ? rawCupChampId
        : undefined;

    const leagueClubs = getClubsForEuropeanLeague(clubs, leagueId);
    const orderedIds = getOrderedEuropeanStandingsOrRatingOrder(
      clubs,
      leagueClubs,
      standingsEurope?.[leagueId]
    );

    const leagueUcl: string[] = [];
    const leagueUel: string[] = [];
    const leagueUecl: string[] = [];
    let uelCupInheritedToLeague = false;

    // 1. Preenche vagas da Champions League da liga (herança G+1 se campeão continental já ocupou vaga)
    if (!hasCompletedLeagueStandings) {
      for (const id of orderedIds) {
        if (uclSet.has(id)) {
          leagueUcl.push(id);
        }
      }
    } else {
      for (const id of orderedIds) {
        if (leagueUcl.length >= meta.uclBerths) break;
        if (uclSet.has(id)) {
          if (!leagueUcl.includes(id)) leagueUcl.push(id);
          continue;
        }
        uclSet.add(id);
        leagueUcl.push(id);
      }
    }

    // 2. Preenche vagas da Europa League (vagas reduzidas pela liga + 1 vaga ao campeão da copa nacional)
    if (!hasCompletedLeagueStandings) {
      for (const id of orderedIds) {
        if (uelSet.has(id)) {
          leagueUel.push(id);
        }
      }
    } else {
      let leagueUelTarget = meta.uelBerths;
      let assignCupSlotClub = false;

      if (validCupChampId) {
        if (uclSet.has(validCupChampId) || uelSet.has(validCupChampId)) {
          // Campeão da copa já está classificado para a Champions (ou UEL via título da Conference): vaga repassada à liga
          uelCupInheritedToLeague = true;
          leagueUelTarget = meta.uelBerths + 1;
        } else {
          assignCupSlotClub = true;
        }
      }

      if (assignCupSlotClub && validCupChampId) {
        uelSet.add(validCupChampId);
        leagueUel.push(validCupChampId);
      }

      for (const id of orderedIds) {
        if (leagueUel.filter((x) => x !== validCupChampId || !assignCupSlotClub).length >= leagueUelTarget) {
          break;
        }
        if (uclSet.has(id)) continue;
        if (assignCupSlotClub && id === validCupChampId) continue;
        if (uelSet.has(id)) {
          if (!leagueUel.includes(id)) leagueUel.push(id);
          continue;
        }
        uelSet.add(id);
        leagueUel.push(id);
      }
    }

    // 3. Preenche vagas da Conference League
    if (!hasCompletedLeagueStandings) {
      for (const id of orderedIds) {
        if (ueclSet.has(id)) {
          leagueUecl.push(id);
        }
      }
    } else {
      for (const id of orderedIds) {
        if (leagueUecl.length >= meta.ueclBerths) break;
        if (uclSet.has(id) || uelSet.has(id) || ueclSet.has(id)) continue;
        ueclSet.add(id);
        leagueUecl.push(id);
      }
    }

    const breakdown: UefaLeagueQualifierBreakdown = {
      leagueId,
      country: meta.country,
      leagueName: meta.name,
      flagEmoji: meta.flagEmoji,
      uclIds: leagueUcl,
      uelIds: leagueUel,
      ueclIds: leagueUecl,
      uelCupId: cupInfo?.cupId,
      uelCupName: cupInfo?.cupName,
      uelCupChampionId: validCupChampId || null,
      uelCupInheritedToLeague,
    };
    byLeague[leagueId] = breakdown;
    orderedTopLeagues.push(breakdown);
  }

  // Fallback de preenchimento/ajuste exato para 36 clubes em cada torneio UEFA
  const allTopDivisionClubsSorted = clubs
    .filter((c) => c.division === 'EU' && EUROPEAN_TOP_DIVISION_IDS.includes(getClubEuropeanLeagueId(c)!))
    .sort((a, b) => getClubSectorRatings(b).overall - getClubSectorRatings(a).overall)
    .map((c) => c.id);

  const championsLeagueIds = !hasCompletedLeagueStandings
    ? INITIAL_CHAMPIONS_LEAGUE_CLUB_IDS.filter((id) => clubById.has(id)).slice(0, 36)
    : Array.from(uclSet).slice(0, 36);
  for (const id of allTopDivisionClubsSorted) {
    if (championsLeagueIds.length >= 36) break;
    if (!championsLeagueIds.includes(id)) championsLeagueIds.push(id);
  }
  const finalUclSet = new Set(championsLeagueIds);

  const europaLeagueIds = !hasCompletedLeagueStandings
    ? INITIAL_EUROPA_LEAGUE_CLUB_IDS.filter((id) => clubById.has(id) && !finalUclSet.has(id)).slice(0, 36)
    : Array.from(uelSet)
        .filter((id) => !finalUclSet.has(id))
        .slice(0, 36);
  for (const id of allTopDivisionClubsSorted) {
    if (europaLeagueIds.length >= 36) break;
    if (!finalUclSet.has(id) && !europaLeagueIds.includes(id)) {
      europaLeagueIds.push(id);
    }
  }
  const finalUelSet = new Set(europaLeagueIds);

  const conferenceLeagueIds = !hasCompletedLeagueStandings
    ? INITIAL_CONFERENCE_LEAGUE_CLUB_IDS.filter(
        (id) => clubById.has(id) && !finalUclSet.has(id) && !finalUelSet.has(id)
      ).slice(0, 36)
    : Array.from(ueclSet)
        .filter((id) => !finalUclSet.has(id) && !finalUelSet.has(id))
        .slice(0, 36);
  for (const id of allTopDivisionClubsSorted) {
    if (conferenceLeagueIds.length >= 36) break;
    if (
      !finalUclSet.has(id) &&
      !finalUelSet.has(id) &&
      !conferenceLeagueIds.includes(id)
    ) {
      conferenceLeagueIds.push(id);
    }
  }

  return {
    championsLeagueIds,
    europaLeagueIds,
    conferenceLeagueIds,
    byLeague,
    orderedTopLeagues,
  };
}

/**
 * Executa o sistema real de Acesso e Rebaixamento entre as 4 divisões da Inglaterra:
 * - Premier League (3 caem) <-> Championship (3 sobem, 3 caem)
 * - Championship <-> League One (3 sobem, 4 caem)
 * - League One <-> League Two (4 sobem)
 */
export function applyEnglishPyramidPromotionRelegation(
  clubs: Club[],
  standingsEurope?: Partial<Record<EuropeanLeagueId, Standing[]>>,
  fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>
): {
  updatedClubs: Club[];
  promotedClubIds: string[];
  relegatedClubIds: string[];
} {
  if (!standingsEurope) {
    return { updatedClubs: clubs, promotedClubIds: [], relegatedClubIds: [] };
  }

  const getSortedIds = (leagueId: EuropeanLeagueId): string[] => {
    const leagueClubs = getClubsForEuropeanLeague(clubs, leagueId);
    return getOrderedEuropeanStandingsOrRatingOrder(
      clubs,
      leagueClubs,
      standingsEurope[leagueId]
    );
  };

  const plIds = getSortedIds('eng_premier');
  const chIds = getSortedIds('eng_championship');
  const l1Ids = getSortedIds('eng_league_one');
  const l2Ids = getSortedIds('eng_league_two');

  const newLeagueByClub = new Map<string, EuropeanLeagueId>();
  const promotedClubIds: string[] = [];
  const relegatedClubIds: string[] = [];

  if (plIds.length >= 6 && chIds.length >= 6) {
    const plRelegated = plIds.slice(-3);

    // Championship: Top 2 diretos + Campeão dos Playoffs (3º ao 8º)
    const chDirectPromoted = chIds.slice(0, 2);
    let chPlayoffWinnerId: string | undefined = undefined;

    const chFixtures = fixturesEurope?.eng_championship;
    const finalFix = chFixtures?.find((f) => f.id === 'eng_championship_playoff_final');
    if (finalFix && finalFix.played && finalFix.homeScore !== null && finalFix.awayScore !== null) {
      if (finalFix.homeScore > finalFix.awayScore) {
        chPlayoffWinnerId = finalFix.homeTeamId;
      } else if (finalFix.awayScore > finalFix.homeScore) {
        chPlayoffWinnerId = finalFix.awayTeamId;
      } else if (finalFix.penaltiesHome !== undefined && finalFix.penaltiesAway !== undefined) {
        chPlayoffWinnerId =
          finalFix.penaltiesHome > finalFix.penaltiesAway ? finalFix.homeTeamId : finalFix.awayTeamId;
      }
    }

    if (chPlayoffWinnerId && chPlayoffWinnerId.startsWith('TBD')) {
      chPlayoffWinnerId = undefined;
    }

    const thirdPlace = chIds[2];
    const promotedPlayoffTeam = chPlayoffWinnerId || thirdPlace;

    const chPromoted = [...chDirectPromoted];
    if (promotedPlayoffTeam && !chPromoted.includes(promotedPlayoffTeam)) {
      chPromoted.push(promotedPlayoffTeam);
    }
    while (chPromoted.length < 3) {
      const nextBest = chIds.find((id) => !chPromoted.includes(id));
      if (nextBest) chPromoted.push(nextBest);
      else break;
    }

    plRelegated.forEach((id) => {
      newLeagueByClub.set(id, 'eng_championship');
      relegatedClubIds.push(id);
    });
    chPromoted.forEach((id) => {
      newLeagueByClub.set(id, 'eng_premier');
      promotedClubIds.push(id);
    });
  }

  if (chIds.length >= 8 && l1Ids.length >= 8) {
    const chRelegated = chIds.slice(-3);

    // League One: Top 2 diretos + Campeão dos Playoffs (3º ao 6º)
    const l1DirectPromoted = l1Ids.slice(0, 2);
    let l1PlayoffWinnerId: string | undefined = undefined;

    const l1Fixtures = fixturesEurope?.eng_league_one;
    const finalFix = l1Fixtures?.find((f) => f.id === 'eng_league_one_playoff_final');
    if (finalFix && finalFix.played && finalFix.homeScore !== null && finalFix.awayScore !== null) {
      if (finalFix.homeScore > finalFix.awayScore) {
        l1PlayoffWinnerId = finalFix.homeTeamId;
      } else if (finalFix.awayScore > finalFix.homeScore) {
        l1PlayoffWinnerId = finalFix.awayTeamId;
      } else if (finalFix.penaltiesHome !== undefined && finalFix.penaltiesAway !== undefined) {
        l1PlayoffWinnerId = finalFix.penaltiesHome > finalFix.penaltiesAway ? finalFix.homeTeamId : finalFix.awayTeamId;
      }
    }

    if (l1PlayoffWinnerId && l1PlayoffWinnerId.startsWith('TBD')) {
      l1PlayoffWinnerId = undefined;
    }

    const thirdPlace = l1Ids[2];
    const promotedPlayoffTeam = l1PlayoffWinnerId || thirdPlace;

    const l1Promoted = [...l1DirectPromoted];
    if (promotedPlayoffTeam && !l1Promoted.includes(promotedPlayoffTeam)) {
      l1Promoted.push(promotedPlayoffTeam);
    }
    while (l1Promoted.length < 3) {
      const nextBest = l1Ids.find((id) => !l1Promoted.includes(id));
      if (nextBest) l1Promoted.push(nextBest);
      else break;
    }

    chRelegated.forEach((id) => {
      newLeagueByClub.set(id, 'eng_league_one');
      relegatedClubIds.push(id);
    });
    l1Promoted.forEach((id) => {
      newLeagueByClub.set(id, 'eng_championship');
      promotedClubIds.push(id);
    });
  }

  if (l1Ids.length >= 10 && l2Ids.length >= 8) {
    const l1Relegated = l1Ids.slice(-4);

    // League Two: Top 3 diretos + Campeão dos Playoffs (4º a 7º)
    const l2DirectPromoted = l2Ids.slice(0, 3);
    let playoffWinnerId: string | undefined = undefined;

    const l2Fixtures = fixturesEurope?.eng_league_two;
    const finalFix = l2Fixtures?.find((f) => f.id === 'eng_league_two_playoff_final');
    if (finalFix && finalFix.played && finalFix.homeScore !== null && finalFix.awayScore !== null) {
      if (finalFix.homeScore > finalFix.awayScore) {
        playoffWinnerId = finalFix.homeTeamId;
      } else if (finalFix.awayScore > finalFix.homeScore) {
        playoffWinnerId = finalFix.awayTeamId;
      } else if (finalFix.penaltiesHome !== undefined && finalFix.penaltiesAway !== undefined) {
        playoffWinnerId = finalFix.penaltiesHome > finalFix.penaltiesAway ? finalFix.homeTeamId : finalFix.awayTeamId;
      }
    }

    if (playoffWinnerId && playoffWinnerId.startsWith('TBD')) {
      playoffWinnerId = undefined;
    }

    // Se o playoff ainda não tiver vencedor definido, o 4º colocado herda a vaga
    const fourthPlace = l2Ids[3];
    const promotedPlayoffTeam = playoffWinnerId || fourthPlace;

    const l2Promoted = [...l2DirectPromoted];
    if (promotedPlayoffTeam && !l2Promoted.includes(promotedPlayoffTeam)) {
      l2Promoted.push(promotedPlayoffTeam);
    }
    while (l2Promoted.length < 4) {
      const nextBest = l2Ids.find((id) => !l2Promoted.includes(id));
      if (nextBest) l2Promoted.push(nextBest);
      else break;
    }

    // League Two: Rebaixamento dos 2 últimos (23º e 24º)
    const l2Relegated = l2Ids.slice(-2);
    l2Relegated.forEach((id) => {
      relegatedClubIds.push(id);
    });

    l1Relegated.forEach((id) => {
      newLeagueByClub.set(id, 'eng_league_two');
      relegatedClubIds.push(id);
    });
    l2Promoted.forEach((id) => {
      newLeagueByClub.set(id, 'eng_league_one');
      promotedClubIds.push(id);
    });
  }

  // Pirâmide Alemã: Bundesliga <-> 2. Bundesliga
  // - 17º e 18º da Bundesliga caem direto para a 2. Bundesliga
  // - 1º e 2º da 2. Bundesliga sobem direto para a Bundesliga
  // - 16º da Bundesliga x 3º da 2. Bundesliga fazem o Playoff de Acesso/Rebaixamento (Ida e Volta)
  // - 3 últimos da 2. Bundesliga (16º, 17º e 18º) registrados como rebaixados
  const bl1Ids = getSortedIds('ger_bundesliga');
  const bl2Ids = getSortedIds('ger_bundesliga2');

  if (bl1Ids.length >= 18 && bl2Ids.length >= 18) {
    const bl1DirectRelegated = bl1Ids.slice(-2); // 17º e 18º
    const bl1Sixteenth = bl1Ids[15]; // 16º
    const bl2DirectPromoted = bl2Ids.slice(0, 2); // 1º e 2º
    const bl2Third = bl2Ids[2]; // 3º

    bl1DirectRelegated.forEach((id) => {
      newLeagueByClub.set(id, 'ger_bundesliga2');
      relegatedClubIds.push(id);
    });
    bl2DirectPromoted.forEach((id) => {
      newLeagueByClub.set(id, 'ger_bundesliga');
      promotedClubIds.push(id);
    });

    // Resolve Playoff de Acesso/Rebaixamento (Ida e Volta) entre 16º Bundesliga e 3º 2. Bundesliga
    const bl2Fixtures = fixturesEurope?.ger_bundesliga2 || [];
    const leg1 = bl2Fixtures.find((f) => f.id === 'ger_bundesliga2_playoff_ida');
    const leg2 = bl2Fixtures.find((f) => f.id === 'ger_bundesliga2_playoff_volta');

    let playoffWinnerId: string | undefined;
    if (
      leg1 &&
      leg2 &&
      leg1.played &&
      leg2.played &&
      leg1.homeScore !== null &&
      leg1.awayScore !== null &&
      leg2.homeScore !== null &&
      leg2.awayScore !== null &&
      !leg1.homeTeamId.startsWith('TBD') &&
      !leg1.awayTeamId.startsWith('TBD')
    ) {
      const teamA = leg1.homeTeamId; // 16º Bundesliga
      const teamB = leg1.awayTeamId; // 3º 2. Bundesliga
      const scoreA =
        leg1.homeScore + (leg2.homeTeamId === teamA ? leg2.homeScore : leg2.awayScore);
      const scoreB =
        leg1.awayScore + (leg2.homeTeamId === teamB ? leg2.homeScore : leg2.awayScore);
      if (scoreA > scoreB) {
        playoffWinnerId = teamA;
      } else if (scoreB > scoreA) {
        playoffWinnerId = teamB;
      } else if (leg2.penaltiesHome !== undefined && leg2.penaltiesAway !== undefined) {
        playoffWinnerId =
          leg2.penaltiesHome > leg2.penaltiesAway ? leg2.homeTeamId : leg2.awayTeamId;
      }
    }

    if (playoffWinnerId === bl2Third && bl1Sixteenth && bl2Third) {
      newLeagueByClub.set(bl2Third, 'ger_bundesliga');
      promotedClubIds.push(bl2Third);
      newLeagueByClub.set(bl1Sixteenth, 'ger_bundesliga2');
      relegatedClubIds.push(bl1Sixteenth);
    }

    // 3 últimos da 2. Bundesliga (16º, 17º e 18º) marcados na zona de rebaixamento
    const bl2Relegated = bl2Ids.slice(-3);
    bl2Relegated.forEach((id) => {
      relegatedClubIds.push(id);
    });
  }

  // Pirâmide Francesa: Ligue 1 <-> Ligue 2
  // - 17º e 18º da Ligue 1 caem direto para a Ligue 2
  // - 1º e 2º da Ligue 2 sobem direto para a Ligue 1
  // - Vencedor dos Play-offs (3º ao 5º) da Ligue 2 enfrenta o 16º da Ligue 1 no Barrage (Ida e Volta)
  // - 3 últimos da Ligue 2 (16º, 17º e 18º) registrados como rebaixados
  const fraL1Ids = getSortedIds('fra_ligue1');
  const fraL2Ids = getSortedIds('fra_ligue2');

  if (fraL1Ids.length >= 18 && fraL2Ids.length >= 18) {
    const fraL1DirectRelegated = fraL1Ids.slice(-2); // 17º e 18º
    const fraL1Sixteenth = fraL1Ids[15]; // 16º
    const fraL2DirectPromoted = fraL2Ids.slice(0, 2); // 1º e 2º

    fraL1DirectRelegated.forEach((id) => {
      newLeagueByClub.set(id, 'fra_ligue2');
      relegatedClubIds.push(id);
    });
    fraL2DirectPromoted.forEach((id) => {
      newLeagueByClub.set(id, 'fra_ligue1');
      promotedClubIds.push(id);
    });

    // Resolve Barrage Ligue 1/Ligue 2 (Ida na casa do time da Ligue 2, Volta na casa do 16º da Ligue 1)
    const fraL2Fixtures = fixturesEurope?.fra_ligue2 || [];
    const leg1 = fraL2Fixtures.find((f) => f.id === 'fra_ligue2_playoff_barrage_ida');
    const leg2 = fraL2Fixtures.find((f) => f.id === 'fra_ligue2_playoff_barrage_volta');

    let barrageWinnerId: string | undefined;
    let challengerId: string | undefined;
    if (
      leg1 &&
      leg2 &&
      leg1.played &&
      leg2.played &&
      leg1.homeScore !== null &&
      leg1.awayScore !== null &&
      leg2.homeScore !== null &&
      leg2.awayScore !== null &&
      !leg1.homeTeamId.startsWith('TBD') &&
      !leg1.awayTeamId.startsWith('TBD')
    ) {
      challengerId = leg1.homeTeamId; // Vencedor Play-off 2 da Ligue 2 (manda a Ida)
      const eliteClubId = leg1.awayTeamId; // 16º da Ligue 1 (manda a Volta)
      const scoreChallenger =
        leg1.homeScore + (leg2.homeTeamId === challengerId ? leg2.homeScore : leg2.awayScore);
      const scoreElite =
        leg1.awayScore + (leg2.homeTeamId === eliteClubId ? leg2.homeScore : leg2.awayScore);
      if (scoreChallenger > scoreElite) {
        barrageWinnerId = challengerId;
      } else if (scoreElite > scoreChallenger) {
        barrageWinnerId = eliteClubId;
      } else if (leg2.penaltiesHome !== undefined && leg2.penaltiesAway !== undefined) {
        barrageWinnerId =
          leg2.penaltiesHome > leg2.penaltiesAway ? leg2.homeTeamId : leg2.awayTeamId;
      }
    }

    if (barrageWinnerId && challengerId && barrageWinnerId === challengerId && fraL1Sixteenth) {
      newLeagueByClub.set(challengerId, 'fra_ligue1');
      promotedClubIds.push(challengerId);
      newLeagueByClub.set(fraL1Sixteenth, 'fra_ligue2');
      relegatedClubIds.push(fraL1Sixteenth);
    }

    // 3 últimos da Ligue 2 (16º, 17º e 18º) marcados na zona de rebaixamento
    const fraL2Relegated = fraL2Ids.slice(-3);
    fraL2Relegated.forEach((id) => {
      relegatedClubIds.push(id);
    });
  }

  // Pirâmide Espanhola: LaLiga EA Sports <-> LALIGA HYPERMOTION (LaLiga 2)
  // - 18º, 19º e 20º da LaLiga caem direto para a LaLiga 2 (3 clubes)
  // - 1º e 2º da LaLiga 2 sobem direto para a LaLiga
  // - 3º ao 6º disputam Play-offs (Semis e Final em Ida e Volta); vencedor conquista a 3ª vaga de acesso
  // - 4 últimos da LaLiga 2 (19º ao 22º) registrados como rebaixados à Primera Federación
  const espL1Ids = getSortedIds('esp_laliga');
  const espL2Ids = getSortedIds('esp_laliga2');

  if (espL1Ids.length >= 20 && espL2Ids.length >= 22) {
    const espL1Relegated = espL1Ids.slice(-3); // 18º, 19º e 20º
    const espL2DirectPromoted = espL2Ids.slice(0, 2); // 1º e 2º

    // Resolve vencedor da Final do Play-off (Ida e Volta)
    const espL2Fixtures = fixturesEurope?.esp_laliga2 || [];
    const finalLeg1 = espL2Fixtures.find((f) => f.id === 'esp_laliga2_playoff_final_ida');
    const finalLeg2 = espL2Fixtures.find((f) => f.id === 'esp_laliga2_playoff_final_volta');

    let espPlayoffWinnerId: string | undefined;
    if (
      finalLeg1 &&
      finalLeg2 &&
      finalLeg1.played &&
      finalLeg2.played &&
      finalLeg1.homeScore !== null &&
      finalLeg1.awayScore !== null &&
      finalLeg2.homeScore !== null &&
      finalLeg2.awayScore !== null &&
      !finalLeg1.homeTeamId.startsWith('TBD') &&
      !finalLeg1.awayTeamId.startsWith('TBD')
    ) {
      const teamA = finalLeg1.homeTeamId;
      const teamB = finalLeg1.awayTeamId;
      const scoreA =
        finalLeg1.homeScore + (finalLeg2.homeTeamId === teamA ? finalLeg2.homeScore : finalLeg2.awayScore);
      const scoreB =
        finalLeg1.awayScore + (finalLeg2.homeTeamId === teamB ? finalLeg2.homeScore : finalLeg2.awayScore);
      if (scoreA > scoreB) {
        espPlayoffWinnerId = teamA;
      } else if (scoreB > scoreA) {
        espPlayoffWinnerId = teamB;
      } else if (finalLeg2.penaltiesHome !== undefined && finalLeg2.penaltiesAway !== undefined) {
        espPlayoffWinnerId =
          finalLeg2.penaltiesHome > finalLeg2.penaltiesAway
            ? finalLeg2.homeTeamId
            : finalLeg2.awayTeamId;
      } else {
        // Regra oficial da LaLiga 2: persistindo empate sem pênaltis, avança a melhor campanha (mandante da volta)
        espPlayoffWinnerId = finalLeg2.homeTeamId;
      }
    }

    const thirdPlace = espL2Ids[2];
    const promotedPlayoffTeam = espPlayoffWinnerId || thirdPlace;

    const espL2Promoted = [...espL2DirectPromoted];
    if (promotedPlayoffTeam && !espL2Promoted.includes(promotedPlayoffTeam)) {
      espL2Promoted.push(promotedPlayoffTeam);
    }
    while (espL2Promoted.length < 3) {
      const nextBest = espL2Ids.find((id) => !espL2Promoted.includes(id));
      if (nextBest) espL2Promoted.push(nextBest);
      else break;
    }

    espL1Relegated.forEach((id) => {
      newLeagueByClub.set(id, 'esp_laliga2');
      relegatedClubIds.push(id);
    });
    espL2Promoted.forEach((id) => {
      newLeagueByClub.set(id, 'esp_laliga');
      promotedClubIds.push(id);
    });

    // 4 últimos da LaLiga 2 (19º ao 22º) marcados na zona de rebaixamento à Primera Federación
    const espL2Relegated = espL2Ids.slice(-4);
    espL2Relegated.forEach((id) => {
      relegatedClubIds.push(id);
    });
  }

  // Pirâmide Italiana: Serie A <-> Serie BKT (Regulamento Oficial FIGC / Lega B)
  // - 18º, 19º e 20º da Serie A caem direto para a Serie B (3 clubes)
  // - 1º e 2º da Serie B sobem direto para a Serie A
  // - Regra dos 15 pts: se o 3º terminar com 15+ pontos sobre o 4º, não há playoffs e o 3º sobe direto
  // - Caso contrário, 3º ao 8º disputam Playoffs em Ida e Volta (Quartas, Semis, Final) pela 3ª vaga
  // - Rebaixamento da Serie B (4 vagas): 18º–20º caem direto + perdedor do Playout (16º × 17º)
  const itaS1Ids = getSortedIds('ita_serie_a');
  const itaS2Ids = getSortedIds('ita_serie_b');

  if (itaS1Ids.length >= 20 && itaS2Ids.length >= 20) {
    const itaS1Relegated = itaS1Ids.slice(-3); // 18º, 19º e 20º
    const itaS2DirectPromoted = itaS2Ids.slice(0, 2); // 1º e 2º

    const itaS2Table = [...(standingsEurope?.ita_serie_b || [])].sort(
      (a, b) =>
        b.points - a.points ||
        b.won - a.won ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor
    );
    const gap3vs4 =
      itaS2Table.length >= 4 ? (itaS2Table[2]?.points ?? 0) - (itaS2Table[3]?.points ?? 0) : 0;
    const directThirdSpot = gap3vs4 >= 15;

    const itaS2Fixtures = fixturesEurope?.ita_serie_b || [];
    const resolveTwoLegged = (leg1?: Fixture, leg2?: Fixture): { winner?: string; loser?: string } => {
      if (
        !leg1 ||
        !leg2 ||
        !leg1.played ||
        !leg2.played ||
        leg1.homeScore === null ||
        leg1.awayScore === null ||
        leg2.homeScore === null ||
        leg2.awayScore === null
      ) {
        return {};
      }
      const teamA = leg1.homeTeamId;
      const teamB = leg1.awayTeamId;
      if (!teamA || !teamB || teamA.startsWith('TBD') || teamB.startsWith('TBD')) return {};
      const aggA = leg1.homeScore + (leg2.homeTeamId === teamA ? leg2.homeScore : leg2.awayScore);
      const aggB = leg1.awayScore + (leg2.homeTeamId === teamB ? leg2.homeScore : leg2.awayScore);
      if (aggA > aggB) return { winner: teamA, loser: teamB };
      if (aggB > aggA) return { winner: teamB, loser: teamA };
      if (
        typeof leg2.penaltiesHome === 'number' &&
        typeof leg2.penaltiesAway === 'number' &&
        leg2.penaltiesHome !== leg2.penaltiesAway
      ) {
        const penWinner = leg2.penaltiesHome > leg2.penaltiesAway ? leg2.homeTeamId : leg2.awayTeamId;
        const penLoser = penWinner === teamA ? teamB : teamA;
        return { winner: penWinner, loser: penLoser };
      }
      // Critério oficial Lega B em caso de empate sem pênaltis: melhor campanha (mandante da volta)
      return { winner: leg2.homeTeamId, loser: leg2.awayTeamId };
    };

    let itaThirdPromoted: string | undefined;
    if (directThirdSpot) {
      itaThirdPromoted = itaS2Ids[2];
    } else {
      const finRes = resolveTwoLegged(
        itaS2Fixtures.find((f) => f.id === 'ita_serie_b_playoff_final_ida'),
        itaS2Fixtures.find((f) => f.id === 'ita_serie_b_playoff_final_volta')
      );
      itaThirdPromoted = finRes.winner || itaS2Ids[2];
    }

    const itaS2Promoted = [...itaS2DirectPromoted];
    if (itaThirdPromoted && !itaS2Promoted.includes(itaThirdPromoted)) {
      itaS2Promoted.push(itaThirdPromoted);
    }
    while (itaS2Promoted.length < 3) {
      const nextBest = itaS2Ids.find((id) => !itaS2Promoted.includes(id));
      if (nextBest) itaS2Promoted.push(nextBest);
      else break;
    }

    itaS1Relegated.forEach((id) => {
      newLeagueByClub.set(id, 'ita_serie_b');
      relegatedClubIds.push(id);
    });
    itaS2Promoted.forEach((id) => {
      newLeagueByClub.set(id, 'ita_serie_a');
      promotedClubIds.push(id);
    });

    // Rebaixamento da Serie BKT à Serie C: 18º, 19º e 20º direto + perdedor do Playout (16º × 17º)
    const itaS2DirectRelegated = itaS2Ids.slice(-3); // 18º, 19º e 20º
    const playoutRes = resolveTwoLegged(
      itaS2Fixtures.find((f) => f.id === 'ita_serie_b_playoff_playout_ida'),
      itaS2Fixtures.find((f) => f.id === 'ita_serie_b_playoff_playout_volta')
    );
    const playoutLoser = playoutRes.loser || itaS2Ids[16]; // fallback 17º
    const itaS2Relegated = [...itaS2DirectRelegated];
    if (playoutLoser && !itaS2Relegated.includes(playoutLoser)) {
      itaS2Relegated.push(playoutLoser);
    }
    itaS2Relegated.forEach((id) => {
      relegatedClubIds.push(id);
    });
  }

  const updatedClubs = clubs.map((c) => {
    const nextLeague = newLeagueByClub.get(c.id);
    if (!nextLeague) return c;
    return {
      ...c,
      europeanLeagueId: nextLeague,
    };
  });

  return {
    updatedClubs,
    promotedClubIds,
    relegatedClubIds,
  };
}

/**
 * Premia financeiramente campeões e vices das 13 Ligas Europeias ao final da temporada
 * e registra os títulos no histórico da temporada.
 */
export function awardEuropeanLeagueEndPrizes(params: {
  clubs: Club[];
  standingsEurope?: Partial<Record<EuropeanLeagueId, Standing[]>>;
  userClubId: string;
  seasonYear: number;
  currentDate: string;
  skipFinancialCredit?: boolean;
}): {
  updatedClubs: Club[];
  newTrophies: TrophyRecord[];
  inboxMessages: InboxMessage[];
} {
  const {
    clubs,
    standingsEurope,
    userClubId,
    seasonYear,
    currentDate,
    skipFinancialCredit = false,
  } = params;
  if (!standingsEurope) {
    return { updatedClubs: clubs, newTrophies: [], inboxMessages: [] };
  }

  const prizeMap = new Map<string, number>();
  const newTrophies: TrophyRecord[] = [];
  const inboxMessages: InboxMessage[] = [];
  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  for (const leagueId of EUROPEAN_LEAGUE_IDS) {
    const table = standingsEurope[leagueId];
    if (!table || table.length < 2) continue;
    const sorted = [...table].sort(
      (a, b) =>
        b.points - a.points ||
        b.won - a.won ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor
    );
    const champId = sorted[0]?.teamId;
    const runnerId = sorted[1]?.teamId;
    if (!champId || !runnerId) continue;

    const meta = EUROPEAN_LEAGUES_META[leagueId];
    if (!skipFinancialCredit) {
      prizeMap.set(champId, (prizeMap.get(champId) || 0) + meta.championPrize);
      prizeMap.set(runnerId, (prizeMap.get(runnerId) || 0) + meta.runnerUpPrize);
    }

    const champClub = clubMap.get(champId);
    const runnerClub = clubMap.get(runnerId);

    const seasonLabel = formatEuropeanSeason(seasonYear);
    if (champClub && runnerClub) {
      newTrophies.push({
        year: seasonYear,
        seasonLabel,
        competition: meta.name,
        championTeamName: champClub.name,
        runnerUpTeamName: runnerClub.name,
        userWon: champId === userClubId,
      });
    }

    if (!skipFinancialCredit && (champId === userClubId || runnerId === userClubId)) {
      const won = champId === userClubId;
      const prize = won ? meta.championPrize : meta.runnerUpPrize;
      inboxMessages.push({
        id: `eu_prize_${leagueId}_${seasonYear}_${Date.now()}`,
        title: won
          ? `Campeão: ${meta.name} ${seasonLabel}!`
          : `Vice-Campeão: ${meta.name} ${seasonLabel}`,
        message: won
          ? `Parabéns! O título da ${meta.name} (${seasonLabel}) rendeu R$ ${(prize / 1_000_000).toFixed(1)}M em premiação oficial da liga ao caixa do clube.`
          : `Excelente campanha na ${meta.name} (${seasonLabel})! O vice-campeonato garantiu R$ ${(prize / 1_000_000).toFixed(1)}M em premiação oficial.`,
        date: currentDate,
        round: meta.totalRounds,
        read: false,
        type: 'AWARD',
      });
    }
  }

  const updatedClubs = skipFinancialCredit
    ? clubs
    : clubs.map((club) => {
        const bonus = prizeMap.get(club.id);
        if (!bonus) return club;
        return {
          ...club,
          finances: {
            ...club.finances,
            balance: club.finances.balance + bonus,
            totalIncomeSeason: (club.finances.totalIncomeSeason || 0) + bonus,
          },
        };
      });

  return { updatedClubs, newTrophies, inboxMessages };
}

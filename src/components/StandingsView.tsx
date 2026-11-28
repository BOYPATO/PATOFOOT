import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Club,
  Standing,
  Fixture,
  CompetitionType,
  EuropeanCupId,
  SouthAmericanCupId,
  SouthAmericanLeagueId,
  EuropeanLeagueId,
  WorldCupId,
  WorldLeagueId,
} from '../types/game';
import { getCurrentRealWorldSyncPeriod } from '../services/october2026SquadAiService';
import {
  Trophy,
  Award,
  Calendar,
  Flame,
  Shield,
  Star,
  BarChart3,
  Sparkles,
  Globe,
  RefreshCw,
  Users,
  ExternalLink,
  X,
  Folder,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  ListOrdered,
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import { formatCalendarDate, formatEuropeanSeason } from '../utils/calendarUtils';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { ClubCrest, CompetitionCrest } from './ClubCrest';
import { ScrollableTabStrip } from './ScrollableTabStrip';
import { computeCompetitionPlayerStats, buildTeamOfTheRound } from '../utils/statsCentralEngine';
import {
  buildEstadualQualificationMeritContext,
  computeSerieDOverallCampaignMap,
  resolveAllEstaduaisFinalClassifications,
  resolveCupChampionId,
  resolveCupRunnerUpId,
  resolveEstadualClassificationForConfig,
} from '../utils/multiLeagueEngine';
import {
  BrazilianMacroRegion,
  ESTADUAIS_2026_CONFIG,
  EstadualCompetitionConfig,
  getClubEstadualConfig,
  getEstadualConfigByName,
  getEstadualConfigByUf,
} from '../data/estaduais2026Config';
import {
  SOUTH_AMERICAN_LEAGUES_META,
  isSouthAmericanLeague,
  getClubSouthAmericanLeagueId,
  getSouthAmericanLeagueByCountry,
  computeConmebolContinentalQualifiers,
  CONMEBOL_COUNTRY_DISTRIBUTION_TABLE,
} from '../utils/southAmericaLeaguesEngine';
import {
  EUROPEAN_LEAGUES_META,
  EUROPEAN_LEAGUE_DOMESTIC_CUP,
  isEuropeanLeague,
  isUefaContinental,
  getClubEuropeanLeagueId,
  computeUefaContinentalQualifiers,
} from '../utils/europeLeaguesEngine';
import {
  WORLD_LEAGUE_IDS,
  WORLD_LEAGUES_META,
  NORTH_AMERICAN_LEAGUE_IDS,
  ASIA_RUSSIA_LEAGUE_IDS,
  AFRICA_LEAGUE_IDS,
  isWorldLeague,
  isWorldInternational,
  isSplitYearWorldLeague,
  getClubWorldLeagueId,
  computeWorldInternationalQualifiers,
} from '../utils/worldLeaguesEngine';
import {
  sortMlsStandings,
  getMlsPlayoffSlotLabel,
  resolveMlsCupChampionId,
  isMlsPlayoffFixture,
  isMlsSkippedBestOfThreeFixture,
} from '../utils/usaMlsEngine';
import {
  MLS_CONFERENCE_BY_CLUB_ID,
  MLS_META_BY_CLUB_ID,
} from '../data/usaMls2026Data';
import { getIntercontinentalSlotLabel, withWorldGuestClubs } from '../utils/intercontinentalEngine';
import {
  computeSuperMundial32Qualifiers,
  getNextSuperClubWorldCupYear,
  isSuperClubWorldCupYear,
} from '../utils/superClubWorldCupEngine';
import { getClubSectorRatings } from '../utils/clubRatingsEngine';
import { CupDrawModal } from './CupDrawModal';
import { DRAWABLE_SHUFFLED_COMPETITIONS } from '../utils/tournamentDrawEngine';
import { isEuropeanCup, EUROPEAN_CUP_IDS } from '../utils/europeanCupsEngine';
import { isSouthAmericanCup, SOUTH_AMERICAN_CUP_IDS } from '../utils/southAmericanCupsEngine';
import { isWorldCup, SPLIT_YEAR_WORLD_CUP_IDS } from '../utils/worldCupsEngine';

interface StandingsViewProps {
  clubs: Club[];
  standingsA: Standing[];
  standingsB: Standing[];
  standingsC?: Standing[];
  standingsD?: Standing[];
  standingsLibertadores?: Standing[];
  standingsSulamericana?: Standing[];
  standingsEstadual?: Standing[];
  standingsCopaNordeste?: Standing[];
  standingsCopaVerde?: Standing[];
  standingsSouthAmerica?: Partial<Record<SouthAmericanLeagueId, Standing[]>>;
  standingsEurope?: Partial<Record<EuropeanLeagueId, Standing[]>>;
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>;
  standingsChampionsLeague?: Standing[];
  standingsEuropaLeague?: Standing[];
  standingsConferenceLeague?: Standing[];
  standingsCopaInternacional?: Standing[];
  standingsSuperMundial?: Standing[];
  standingsAfcChampions?: Standing[];
  fixturesA: Fixture[];
  fixturesB: Fixture[];
  fixturesC?: Fixture[];
  fixturesD?: Fixture[];
  fixturesLibertadores?: Fixture[];
  fixturesSulamericana?: Fixture[];
  fixturesCopaBrasil?: Fixture[];
  fixturesSupercopa?: Fixture[];
  fixturesRecopa?: Fixture[];
  fixturesEstadual?: Fixture[];
  fixturesCopaNordeste?: Fixture[];
  fixturesCopaVerde?: Fixture[];
  fixturesIntercontinental?: Fixture[];
  fixturesConcacafChampions?: Fixture[];
  fixturesAfcChampions?: Fixture[];
  fixturesSouthAmerica?: Partial<Record<SouthAmericanLeagueId, Fixture[]>>;
  fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>;
  fixturesChampionsLeague?: Fixture[];
  fixturesEuropaLeague?: Fixture[];
  fixturesConferenceLeague?: Fixture[];
  fixturesUefaSupercup?: Fixture[];
  fixturesCopaInternacional?: Fixture[];
  fixturesSuperMundial?: Fixture[];
  fixturesEngCommunityShield?: Fixture[];
  fixturesEngFaCup?: Fixture[];
  fixturesEngEflCup?: Fixture[];
  fixturesEuropeanCups?: Partial<Record<EuropeanCupId, Fixture[]>>;
  fixturesSouthAmericanCups?: Partial<Record<SouthAmericanCupId, Fixture[]>>;
  fixturesWorldCups?: Partial<Record<WorldCupId, Fixture[]>>;
  drawnCompetitions?: CompetitionType[];
  onMarkCompetitionDrawn?: (comp: CompetitionType) => void;
  onGenerateCompetitionDraw?: (comp: CompetitionType) => void;
  userClub: Club;
  currentRound: number;
  seasonYear?: number;
  europeSeasonYear?: number;
  saSeasonYear?: number;
  calibratingSaLeagueId?: string | null;
  saAiFeedback?: string | null;
  onCalibrateSouthAmericaLeague?: (target: SouthAmericanLeagueId | 'ALL') => void;
  calibratingEuLeagueId?: string | null;
  euAiFeedback?: string | null;
  onCalibrateEuropeLeague?: (target: EuropeanLeagueId | 'ALL') => void;
  calibratingWlLeagueId?: string | null;
  wlAiFeedback?: string | null;
  onCalibrateWorldLeague?: (target: WorldLeagueId | 'ALL') => void;
  syncingOct2026Target?: string | null;
  oct2026SyncFeedback?: string | null;
  oct2026GroundingSources?: Array<{ title: string; uri: string }>;
  onSyncCompetitionOct2026Squads?: (comp: CompetitionType) => void;
  onDismissOct2026Feedback?: () => void;
  onOpenOct2026GlobalSyncModal?: () => void;
  onInspectClub?: (clubId: string) => void;
  initialCompetition?: CompetitionType;
  competitionSelectNonce?: number;
}

export type CompetitionFolderId =
  | 'BRASIL'
  | 'EUROPA'
  | 'AMERICA_SUL'
  | 'AMERICA_NORTE'
  | 'ASIA'
  | 'AFRICA'
  | 'MUNDIAL';

export interface EuropeCountryFolder {
  id: string;
  name: string;
  flag: string;
  competitions: CompetitionType[];
  description: string;
}

export const EUROPE_COUNTRY_FOLDERS: EuropeCountryFolder[] = [
  {
    id: 'ENG',
    name: 'Inglaterra',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    competitions: [
      'eng_premier',
      'eng_championship',
      'eng_league_one',
      'eng_league_two',
      'eng_community_shield',
      'eng_fa_cup',
      'eng_efl_cup',
    ],
    description:
      'Premier League, EFL Championship, League One, League Two, FA Cup, Carabao Cup & Supercopa (7 competições)',
  },
  {
    id: 'ESP',
    name: 'Espanha',
    flag: '🇪🇸',
    competitions: ['esp_laliga', 'esp_laliga2', 'esp_copa_del_rey', 'esp_supercopa'],
    description: 'LaLiga EA Sports, LALIGA HYPERMOTION (LaLiga 2), Copa del Rey & Supercopa de España (4 competições)',
  },
  {
    id: 'ITA',
    name: 'Itália',
    flag: '🇮🇹',
    competitions: ['ita_serie_a', 'ita_serie_b', 'ita_coppa_italia', 'ita_supercoppa'],
    description: 'Serie A Enilive, Serie BKT, Coppa Italia Frecciarossa & Supercoppa Italiana (4 competições)',
  },
  {
    id: 'GER',
    name: 'Alemanha',
    flag: '🇩🇪',
    competitions: ['ger_bundesliga', 'ger_bundesliga2', 'ger_dfb_pokal', 'ger_supercup'],
    description: 'Bundesliga, 2. Bundesliga, DFB-Pokal & Franz Beckenbauer Supercup (4 competições)',
  },
  {
    id: 'FRA',
    name: 'França',
    flag: '🇫🇷',
    competitions: ['fra_ligue1', 'fra_ligue2', 'fra_coupe_de_france', 'fra_trophee_champions'],
    description: "Ligue 1 McDonald's, Ligue 2 BKT, Coupe de France & Trophée des Champions (4 competições)",
  },
  {
    id: 'POR',
    name: 'Portugal',
    flag: '🇵🇹',
    competitions: ['por_primeira', 'por_taca_portugal', 'por_taca_liga', 'por_supertaca'],
    description: 'Liga Portugal Betclic, Taça de Portugal, Taça da Liga & Supertaça Cândido de Oliveira (4 competições)',
  },
  {
    id: 'NED',
    name: 'Holanda',
    flag: '🇳🇱',
    competitions: ['ned_eredivisie', 'ned_knvb_beker', 'ned_johan_cruyff'],
    description: 'Eredivisie, KNVB Beker & Johan Cruijff Schaal (3 competições)',
  },
  {
    id: 'BEL',
    name: 'Bélgica',
    flag: '🇧🇪',
    competitions: ['bel_pro_league', 'bel_croky_cup', 'bel_supercup'],
    description: 'Jupiler Pro League, Croky Cup & Supercopa da Bélgica (3 competições)',
  },
  {
    id: 'TUR',
    name: 'Turquia',
    flag: '🇹🇷',
    competitions: ['tur_super_lig', 'tur_turkiye_kupasi', 'tur_super_kupa'],
    description: 'Trendyol Süper Lig, Ziraat Türkiye Kupası & Turkcell Süper Kupa (3 competições)',
  },
  {
    id: 'GRE',
    name: 'Grécia',
    flag: '🇬🇷',
    competitions: ['gre_super_league', 'gre_kypello_elladas'],
    description: 'Stoiximan Super League & Betsson Kypello Elladas (2 competições)',
  },
  {
    id: 'NOR',
    name: 'Noruega',
    flag: '🇳🇴',
    competitions: ['nor_eliteserien', 'nor_nm_cup'],
    description: 'Eliteserien & Norgesmesterskapet NM Cupen (2 competições)',
  },
  {
    id: 'DEN',
    name: 'Dinamarca',
    flag: '🇩🇰',
    competitions: ['den_superliga', 'den_dbu_pokalen'],
    description: '3F Superliga & Oddset Pokalen (2 competições)',
  },
  {
    id: 'SUI',
    name: 'Suíça',
    flag: '🇨🇭',
    competitions: ['sui_super_league', 'sui_schweizer_cup'],
    description: 'Credit Suisse Super League & Schweizer Cup (2 competições)',
  },
  {
    id: 'SWE',
    name: 'Suécia',
    flag: '🇸🇪',
    competitions: ['swe_allsvenskan', 'swe_svenska_cupen'],
    description: 'Allsvenskan & Svenska Cupen (2 competições)',
  },
  {
    id: 'SCO',
    name: 'Escócia',
    flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    competitions: ['sco_premiership', 'sco_scottish_cup'],
    description: 'Scottish Premiership & Scottish Cup (2 competições)',
  },
  {
    id: 'UEFA',
    name: 'Torneios UEFA',
    flag: '🇪🇺',
    competitions: ['uefa_supercup', 'champions_league', 'europa_league', 'conference_league'],
    description: 'Supercopa da UEFA, Champions League, Europa League e Conference League',
  },
  {
    id: 'SPECIAL',
    name: 'Ligas Especiais',
    flag: '⭐',
    competitions: ['eu_special_1', 'eu_special_2', 'eu_sp1_cup', 'eu_sp2_cup'],
    description: 'Liga Especial Europa 1 & 2 e Taças Especiais Europa 1 & 2',
  },
  {
    id: 'ALL',
    name: 'Ver Todas',
    flag: '📂',
    competitions: [
      'eng_premier',
      'eng_championship',
      'eng_league_one',
      'eng_league_two',
      'eng_community_shield',
      'eng_fa_cup',
      'eng_efl_cup',
      'esp_laliga',
      'esp_laliga2',
      'esp_copa_del_rey',
      'esp_supercopa',
      'ita_serie_a',
      'ita_serie_b',
      'ita_coppa_italia',
      'ita_supercoppa',
      'ger_bundesliga',
      'ger_bundesliga2',
      'ger_dfb_pokal',
      'ger_supercup',
      'fra_ligue1',
      'fra_ligue2',
      'fra_coupe_de_france',
      'fra_trophee_champions',
      'por_primeira',
      'por_taca_portugal',
      'por_taca_liga',
      'por_supertaca',
      'ned_eredivisie',
      'ned_knvb_beker',
      'ned_johan_cruyff',
      'bel_pro_league',
      'bel_croky_cup',
      'bel_supercup',
      'tur_super_lig',
      'tur_turkiye_kupasi',
      'tur_super_kupa',
      'gre_super_league',
      'gre_kypello_elladas',
      'nor_eliteserien',
      'nor_nm_cup',
      'den_superliga',
      'den_dbu_pokalen',
      'sui_super_league',
      'sui_schweizer_cup',
      'swe_allsvenskan',
      'swe_svenska_cupen',
      'sco_premiership',
      'sco_scottish_cup',
      'eu_special_1',
      'eu_special_2',
      'eu_sp1_cup',
      'eu_sp2_cup',
      'uefa_supercup',
      'champions_league',
      'europa_league',
      'conference_league',
    ],
    description: 'Todas as 51 competições oficiais da Europa',
  },
];

export function getEuropeCountryFolderForComp(comp: CompetitionType): string {
  const match = EUROPE_COUNTRY_FOLDERS.find(
    (f) => f.id !== 'ALL' && f.competitions.includes(comp)
  );
  return match ? match.id : 'ENG';
}

export interface SouthAmericaCountryFolder {
  id: string;
  name: string;
  flag: string;
  competitions: CompetitionType[];
  description: string;
}

export const SOUTH_AMERICA_COUNTRY_FOLDERS: SouthAmericaCountryFolder[] = [
  {
    id: 'ARG',
    name: 'Argentina',
    flag: '🇦🇷',
    competitions: ['liga_arg', 'sa_copa_argentina', 'sa_supercopa_argentina'],
    description: 'Liga Profesional, Copa Argentina & Supercopa Argentina (3 competições)',
  },
  {
    id: 'COL',
    name: 'Colômbia',
    flag: '🇨🇴',
    competitions: ['liga_col', 'sa_copa_colombia', 'sa_superliga_colombia'],
    description: 'Liga BetPlay DIMAYOR, Copa Colômbia & Superliga BetPlay (3 competições)',
  },
  {
    id: 'URU',
    name: 'Uruguai',
    flag: '🇺🇾',
    competitions: ['liga_uru', 'sa_copa_uruguay', 'sa_supercopa_uruguay'],
    description: 'Campeonato Uruguayo, Copa Uruguay & Supercopa Uruguaya (3 competições)',
  },
  {
    id: 'EQU',
    name: 'Equador',
    flag: '🇪🇨',
    competitions: ['liga_equ', 'sa_copa_ecuador', 'sa_supercopa_ecuador'],
    description: 'LigaPro Ecuabet, Copa Ecuador & Supercopa Ecuador (3 competições)',
  },
  {
    id: 'CHI',
    name: 'Chile',
    flag: '🇨🇱',
    competitions: ['liga_chi', 'sa_copa_chile', 'sa_supercopa_chile'],
    description: 'Campeonato Itaú, Copa Chile & Supercopa de Chile (3 competições)',
  },
  {
    id: 'PAR',
    name: 'Paraguai',
    flag: '🇵🇾',
    competitions: ['liga_par', 'sa_copa_paraguay', 'sa_supercopa_paraguay'],
    description: 'Copa de Primera, Copa Paraguay & Supercopa Paraguay (3 competições)',
  },
  {
    id: 'PER',
    name: 'Peru',
    flag: '🇵🇪',
    competitions: ['liga_per', 'sa_copa_peru', 'sa_supercopa_peru'],
    description: 'Liga 1 Te Apuesto, Copa Bicentenario & Supercopa Peruana (3 competições)',
  },
  {
    id: 'BOL',
    name: 'Bolívia',
    flag: '🇧🇴',
    competitions: ['liga_bol', 'sa_copa_bolivia', 'sa_supercopa_bolivia'],
    description: 'División Profesional, Copa de la División Profesional & Supercopa Boliviana (3 competições)',
  },
  {
    id: 'VEN',
    name: 'Venezuela',
    flag: '🇻🇪',
    competitions: ['liga_ven', 'sa_copa_venezuela', 'sa_supercopa_venezuela'],
    description: 'Liga FUTVE, Copa Venezuela & Supercopa Venezuela (3 competições)',
  },
  {
    id: 'CONMEBOL',
    name: 'CONMEBOL',
    flag: '🏆',
    competitions: ['libertadores', 'sulamericana', 'recopa_sulamericana'],
    description: 'Copa Libertadores, Copa Sul-Americana & Recopa Sul-Americana (3 competições)',
  },
  {
    id: 'ALL',
    name: 'Ver Todas',
    flag: '📂',
    competitions: [
      'liga_arg',
      'sa_copa_argentina',
      'sa_supercopa_argentina',
      'liga_col',
      'sa_copa_colombia',
      'sa_superliga_colombia',
      'liga_uru',
      'sa_copa_uruguay',
      'sa_supercopa_uruguay',
      'liga_equ',
      'sa_copa_ecuador',
      'sa_supercopa_ecuador',
      'liga_chi',
      'sa_copa_chile',
      'sa_supercopa_chile',
      'liga_par',
      'sa_copa_paraguay',
      'sa_supercopa_paraguay',
      'liga_per',
      'sa_copa_peru',
      'sa_supercopa_peru',
      'liga_bol',
      'sa_copa_bolivia',
      'sa_supercopa_bolivia',
      'liga_ven',
      'sa_copa_venezuela',
      'sa_supercopa_venezuela',
      'libertadores',
      'sulamericana',
      'recopa_sulamericana',
    ],
    description: 'Todas as 30 competições da América do Sul (9 Ligas + 18 Copas/Supercopas + 3 CONMEBOL)',
  },
];

export function getSouthAmericaCountryFolderForComp(comp: CompetitionType): string {
  const match = SOUTH_AMERICA_COUNTRY_FOLDERS.find(
    (f) => f.id !== 'ALL' && f.competitions.includes(comp)
  );
  return match ? match.id : 'ARG';
}

export const StandingsView: React.FC<StandingsViewProps> = ({
  clubs: rawClubs,
  standingsA,
  standingsB,
  standingsC = [],
  standingsD = [],
  standingsLibertadores = [],
  standingsSulamericana = [],
  standingsEstadual = [],
  standingsCopaNordeste = [],
  standingsCopaVerde = [],
  standingsSouthAmerica = {},
  standingsEurope = {},
  standingsWorldLeagues = {},
  standingsChampionsLeague = [],
  standingsEuropaLeague = [],
  standingsConferenceLeague = [],
  standingsCopaInternacional = [],
  standingsSuperMundial = [],
  standingsAfcChampions = [],
  fixturesA,
  fixturesB,
  fixturesC = [],
  fixturesD = [],
  fixturesLibertadores = [],
  fixturesSulamericana = [],
  fixturesCopaBrasil = [],
  fixturesSupercopa = [],
  fixturesRecopa = [],
  fixturesEstadual = [],
  fixturesCopaNordeste = [],
  fixturesCopaVerde = [],
  fixturesIntercontinental = [],
  fixturesConcacafChampions = [],
  fixturesAfcChampions = [],
  fixturesSouthAmerica = {},
  fixturesEurope = {},
  fixturesWorldLeagues = {},
  fixturesChampionsLeague = [],
  fixturesEuropaLeague = [],
  fixturesConferenceLeague = [],
  fixturesUefaSupercup = [],
  fixturesCopaInternacional = [],
  fixturesSuperMundial = [],
  fixturesEngCommunityShield = [],
  fixturesEngFaCup = [],
  fixturesEngEflCup = [],
  fixturesEuropeanCups = {},
  fixturesSouthAmericanCups = {},
  fixturesWorldCups = {},
  drawnCompetitions = [],
  onMarkCompetitionDrawn,
  onGenerateCompetitionDraw,
  userClub,
  currentRound,
  seasonYear = 2027,
  europeSeasonYear,
  saSeasonYear,
  calibratingSaLeagueId = null,
  saAiFeedback = null,
  onCalibrateSouthAmericaLeague,
  calibratingEuLeagueId = null,
  euAiFeedback = null,
  onCalibrateEuropeLeague,
  calibratingWlLeagueId = null,
  wlAiFeedback = null,
  onCalibrateWorldLeague,
  syncingOct2026Target = null,
  oct2026SyncFeedback = null,
  oct2026GroundingSources = [],
  onSyncCompetitionOct2026Squads,
  onDismissOct2026Feedback,
  onOpenOct2026GlobalSyncModal,
  onInspectClub,
  initialCompetition,
  competitionSelectNonce,
}) => {
  const clubs = useMemo(() => withWorldGuestClubs(rawClubs), [rawClubs]);
  const clubsByIdMap = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);
  const userWlId = userClub.division === 'WL' ? getClubWorldLeagueId(userClub) : null;
  const defaultUserComp: CompetitionType =
    userClub.division === 'EU'
      ? getClubEuropeanLeagueId(userClub) || 'eng_premier'
      : userClub.division === 'SA'
      ? getClubSouthAmericanLeagueId(userClub) || 'liga_arg'
      : userClub.division === 'WL'
      ? userWlId || 'usa_mls'
      : userClub.division === 'B'
      ? 'serie_b'
      : userClub.division === 'C'
      ? 'serie_c'
      : userClub.division === 'D'
      ? 'serie_d'
      : userClub.division === 'EST'
      ? 'estadual'
      : 'serie_a';

  const userEstadualGroup =
    standingsEstadual.find((s) => s.teamId === userClub.id)?.group ||
    (getClubEstadualConfig(userClub) || ESTADUAIS_2026_CONFIG[0]).name;

  const isPureKnockoutComp = (comp: CompetitionType) =>
    comp === 'copa_brasil' ||
    comp === 'supercopa_brasil' ||
    comp === 'recopa_sulamericana' ||
    comp === 'uefa_supercup' ||
    comp === 'intercontinental' ||
    comp === 'concacaf_champions' ||
    comp === 'eng_community_shield' ||
    comp === 'eng_fa_cup' ||
    comp === 'eng_efl_cup' ||
    isEuropeanCup(comp) ||
    isSouthAmericanCup(comp) ||
    isWorldCup(comp);

  const getFolderForCompetition = (comp: CompetitionType): CompetitionFolderId => {
    if (
      comp === 'serie_a' ||
      comp === 'serie_b' ||
      comp === 'serie_c' ||
      comp === 'serie_d' ||
      comp === 'copa_brasil' ||
      comp === 'supercopa_brasil' ||
      comp === 'estadual' ||
      comp === 'copa_nordeste' ||
      comp === 'copa_verde'
    ) {
      return 'BRASIL';
    }
    if (
      isEuropeanLeague(comp) ||
      isUefaContinental(comp) ||
      comp === 'uefa_supercup' ||
      comp === 'eng_community_shield' ||
      comp === 'eng_fa_cup' ||
      comp === 'eng_efl_cup' ||
      isEuropeanCup(comp)
    ) {
      return 'EUROPA';
    }
    if (
      isSouthAmericanLeague(comp) ||
      isSouthAmericanCup(comp) ||
      comp === 'libertadores' ||
      comp === 'sulamericana' ||
      comp === 'recopa_sulamericana'
    ) {
      return 'AMERICA_SUL';
    }
    if (
      comp === 'concacaf_champions' ||
      comp === 'wl_cup_usa' ||
      comp === 'wl_cup_mex' ||
      comp === 'wl_cup_can'
    ) {
      return 'AMERICA_NORTE';
    }
    if (
      comp === 'afc_champions' ||
      comp === 'wl_cup_sau' ||
      comp === 'wl_cup_jpn' ||
      comp === 'wl_cup_rus'
    ) {
      return 'ASIA';
    }
    if (comp === 'wl_cup_egy' || comp === 'wl_cup_mar') {
      return 'AFRICA';
    }
    if (isWorldLeague(comp)) {
      if (NORTH_AMERICAN_LEAGUE_IDS.includes(comp)) return 'AMERICA_NORTE';
      if (ASIA_RUSSIA_LEAGUE_IDS.includes(comp)) return 'ASIA';
      if (AFRICA_LEAGUE_IDS.includes(comp)) return 'AFRICA';
    }
    if (
      comp === 'super_mundial_clubes' ||
      comp === 'intercontinental'
    ) {
      return 'MUNDIAL';
    }
    return 'BRASIL';
  };

  const [selectedComp, setSelectedComp] = useState<CompetitionType>(defaultUserComp);
  const [activeFolder, setActiveFolder] = useState<CompetitionFolderId>(() => {
    if (initialCompetition) return getFolderForCompetition(initialCompetition);
    if (userClub.division === 'EU') return 'EUROPA';
    if (userClub.division === 'SA') return 'AMERICA_SUL';
    if (userClub.division === 'WL' && userWlId) {
      if (NORTH_AMERICAN_LEAGUE_IDS.includes(userWlId)) return 'AMERICA_NORTE';
      if (ASIA_RUSSIA_LEAGUE_IDS.includes(userWlId)) return 'ASIA';
      if (AFRICA_LEAGUE_IDS.includes(userWlId)) return 'AFRICA';
    }
    return 'BRASIL';
  });

  const [brazilSubCategory, setBrazilSubCategory] = useState<
    'ALL' | 'SERIES' | 'COPAS' | 'REGIONAIS' | 'ESTADUAIS'
  >('ALL');
  const [europeCountryFolder, setEuropeCountryFolder] = useState<string>(() => {
    return getEuropeCountryFolderForComp(defaultUserComp);
  });
  const europeFolderScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEuropeanLeague(selectedComp) || isUefaContinental(selectedComp) || isEuropeanCup(selectedComp)) {
      const match = getEuropeCountryFolderForComp(selectedComp);
      if (match && europeCountryFolder !== 'ALL') {
        setEuropeCountryFolder(match);
      }
    }
  }, [selectedComp]);

  const [saCountryFolder, setSaCountryFolder] = useState<string>(() => {
    return getSouthAmericaCountryFolderForComp(defaultUserComp);
  });
  const saFolderScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      isSouthAmericanLeague(selectedComp) ||
      isSouthAmericanCup(selectedComp) ||
      ['libertadores', 'sulamericana', 'recopa_sulamericana'].includes(selectedComp)
    ) {
      const match = getSouthAmericaCountryFolderForComp(selectedComp);
      if (match && saCountryFolder !== 'ALL') {
        setSaCountryFolder(match);
      }
    }
  }, [selectedComp]);

  const [saSubCategory, setSaSubCategory] = useState<'ALL' | 'DOMESTIC' | 'CONMEBOL'>('ALL');

  const [activeTab, setActiveTab] = useState<
    | 'table'
    | 'overall_ranking'
    | 'stats'
    | 'totw'
    | 'fixtures'
    | 'bracket'
    | 'conmebol_spots'
    | 'uefa_spots'
    | 'world_spots'
  >('table');
  const [statsCategory, setStatsCategory] = useState<'goals' | 'assists' | 'ga' | 'discipline'>('goals');
  const [viewRound, setViewRound] = useState<number>(currentRound);
  const [totwRound, setTotwRound] = useState<number | null>(null);
  const [selectedEstadualGroup, setSelectedEstadualGroup] = useState<string>(userEstadualGroup);
  const [estadualMacroRegion, setEstadualMacroRegion] = useState<'ALL' | BrazilianMacroRegion>('ALL');
  const [estadualTableMode, setEstadualTableMode] = useState<'GROUPS' | 'OVERALL'>('GROUPS');
  const [overallRankingMode, setOverallRankingMode] = useState<'serie_d' | 'estaduais'>('serie_d');
  const [overallRegionFilter, setOverallRegionFilter] = useState<'ALL' | BrazilianMacroRegion>('ALL');
  const [overallStateFilter, setOverallStateFilter] = useState<string>('ALL');
  const [overallSearch, setOverallSearch] = useState<string>('');
  const [overallSortBy, setOverallSortBy] = useState<'points' | 'efficiency'>('points');
  const [selectedBracketPhase, setSelectedBracketPhase] = useState<string>('ALL');
  const [mlsTableView, setMlsTableView] = useState<'conferences' | 'overall'>('conferences');
  const [isDrawModalOpen, setIsDrawModalOpen] = useState<boolean>(false);
  const [conmebolSpotsViewMode, setConmebolSpotsViewMode] = useState<'clubs' | 'matrix'>('clubs');

  const compMeta = COMPETITIONS_CATALOG[selectedComp] || COMPETITIONS_CATALOG.serie_a;
  const selectedSaMeta = isSouthAmericanLeague(selectedComp)
    ? SOUTH_AMERICAN_LEAGUES_META[selectedComp]
    : null;
  const selectedEuMeta = isEuropeanLeague(selectedComp)
    ? EUROPEAN_LEAGUES_META[selectedComp]
    : null;
  const selectedWlMeta = isWorldLeague(selectedComp)
    ? WORLD_LEAGUES_META[selectedComp]
    : null;

  useEffect(() => {
    if (!initialCompetition) return;
    setSelectedComp(initialCompetition);
    setActiveFolder(getFolderForCompetition(initialCompetition));
    setSelectedBracketPhase('ALL');
    setActiveTab(isPureKnockoutComp(initialCompetition) ? 'bracket' : 'table');
  }, [initialCompetition, competitionSelectNonce]);

  const supportsCupDraw =
    selectedComp === 'libertadores' ||
    selectedComp === 'sulamericana' ||
    selectedComp === 'copa_internacional' ||
    selectedComp === 'super_mundial_clubes' ||
    selectedComp === 'champions_league' ||
    selectedComp === 'europa_league' ||
    selectedComp === 'conference_league' ||
    selectedComp === 'copa_brasil' ||
    selectedComp === 'copa_nordeste' ||
    selectedComp === 'serie_d' ||
    selectedComp === 'concacaf_champions' ||
    selectedComp === 'afc_champions' ||
    selectedComp === 'intercontinental';

  // Sistema Oficial de Vagas CONMEBOL em tempo real (10 países -> 32 Libertadores + 32 Sul-Americana)
  const conmebolReport = useMemo(() => {
    const libChamp = resolveCupChampionId(fixturesLibertadores);
    const sulaChamp = resolveCupChampionId(fixturesSulamericana);
    const cdbChamp = resolveCupChampionId(fixturesCopaBrasil);
    const cdbRunnerUp = resolveCupRunnerUpId(fixturesCopaBrasil);
    const domesticCupChampions: Partial<Record<SouthAmericanCupId, string>> = {};
    if (fixturesSouthAmericanCups) {
      for (const [k, fixList] of Object.entries(fixturesSouthAmericanCups)) {
        const champ = resolveCupChampionId(fixList);
        if (champ) domesticCupChampions[k as SouthAmericanCupId] = champ;
      }
    }
    return computeConmebolContinentalQualifiers({
      clubs,
      standingsA,
      standingsSouthAmerica,
      libertadoresChampId: libChamp,
      sulamericanaChampId: sulaChamp,
      copaBrasilChampId: cdbChamp,
      copaBrasilRunnerUpId: cdbRunnerUp,
      domesticCupChampions,
    });
  }, [
    clubs,
    standingsA,
    standingsSouthAmerica,
    fixturesLibertadores,
    fixturesSulamericana,
    fixturesCopaBrasil,
    fixturesSouthAmericanCups,
  ]);

  // Sistema Oficial de Vagas UEFA em tempo real (17 ligas europeias + Copas Nacionais -> 36 Champions + 36 Europa + 36 Conference)
  const uefaReport = useMemo(() => {
    const uclChamp = resolveCupChampionId(fixturesChampionsLeague);
    const uelChamp = resolveCupChampionId(fixturesEuropaLeague);
    const ueclChamp = resolveCupChampionId(fixturesConferenceLeague);
    const faCupChamp = resolveCupChampionId(fixturesEngFaCup);
    const domesticCupChampions: Partial<Record<EuropeanCupId, string>> = {};
    if (fixturesEuropeanCups) {
      for (const [k, fixList] of Object.entries(fixturesEuropeanCups)) {
        const champ = resolveCupChampionId(fixList);
        if (champ) domesticCupChampions[k as EuropeanCupId] = champ;
      }
    }
    return computeUefaContinentalQualifiers({
      clubs,
      standingsEurope,
      uclTitleHolderId: uclChamp,
      uelTitleHolderId: uelChamp,
      ueclTitleHolderId: ueclChamp,
      faCupChampionId: faCupChamp,
      domesticCupChampions,
    });
  }, [
    clubs,
    standingsEurope,
    fixturesChampionsLeague,
    fixturesEuropaLeague,
    fixturesConferenceLeague,
    fixturesEngFaCup,
    fixturesEuropeanCups,
  ]);

  // Sistema Oficial de Vagas Internacionais (Ligas Norte/Ásia/África -> CONCACAF + AFC + Mundial FIFA)
  const worldReport = useMemo(() => {
    const cintChamp = resolveCupChampionId(fixturesCopaInternacional);
    const concacafCupChamp = resolveCupChampionId(fixturesConcacafChampions);
    const afcCupChamp = resolveCupChampionId(fixturesAfcChampions);
    const libChamp = resolveCupChampionId(fixturesLibertadores);
    const uclChamp = resolveCupChampionId(fixturesChampionsLeague);
    const summary = computeWorldInternationalQualifiers(
      clubs,
      standingsWorldLeagues,
      cintChamp,
      fixturesWorldLeagues
    );
    return {
      ...summary,
      concacafChampionId: concacafCupChamp || summary.concacafChampionId,
      hasOfficialConcacafChampion: Boolean(concacafCupChamp),
      asiaRussiaChampionId: afcCupChamp || summary.asiaRussiaChampionId,
      hasOfficialAfcChampion: Boolean(afcCupChamp),
      cintChampId: cintChamp,
      libChampId: libChamp,
      uclChampId: uclChamp,
    };
  }, [
    clubs,
    standingsWorldLeagues,
    fixturesCopaInternacional,
    fixturesConcacafChampions,
    fixturesAfcChampions,
    fixturesLibertadores,
    fixturesChampionsLeague,
    fixturesWorldLeagues,
  ]);

  // Resolve current active standings and fixtures
  let currentStandings: Standing[] = [];
  let currentFixtures: Fixture[] = [];

  if (isEuropeanLeague(selectedComp)) {
    currentStandings = standingsEurope[selectedComp] || [];
    currentFixtures = fixturesEurope[selectedComp] || [];
  } else if (isEuropeanCup(selectedComp)) {
    currentStandings = [];
    currentFixtures = (fixturesEuropeanCups && fixturesEuropeanCups[selectedComp as EuropeanCupId]) || [];
  } else if (isSouthAmericanCup(selectedComp)) {
    currentStandings = [];
    currentFixtures = (fixturesSouthAmericanCups && fixturesSouthAmericanCups[selectedComp as SouthAmericanCupId]) || [];
  } else if (isSouthAmericanLeague(selectedComp)) {
    currentStandings = standingsSouthAmerica[selectedComp] || [];
    currentFixtures = fixturesSouthAmerica[selectedComp] || [];
  } else if (isWorldLeague(selectedComp)) {
    currentStandings = standingsWorldLeagues[selectedComp] || [];
    currentFixtures = fixturesWorldLeagues[selectedComp] || [];
  } else if (isWorldCup(selectedComp)) {
    currentStandings = [];
    currentFixtures = (fixturesWorldCups && fixturesWorldCups[selectedComp]) || [];
  } else {
    switch (selectedComp) {
      case 'serie_a':
        currentStandings = standingsA;
        currentFixtures = fixturesA;
        break;
      case 'serie_b':
        currentStandings = standingsB;
        currentFixtures = fixturesB;
        break;
      case 'serie_c':
        currentStandings = standingsC;
        currentFixtures = fixturesC;
        break;
      case 'serie_d':
        currentStandings = standingsD;
        currentFixtures = fixturesD;
        break;
      case 'libertadores':
        currentStandings = standingsLibertadores;
        currentFixtures = fixturesLibertadores;
        break;
      case 'sulamericana':
        currentStandings = standingsSulamericana;
        currentFixtures = fixturesSulamericana;
        break;
      case 'copa_internacional':
        currentStandings = standingsCopaInternacional;
        currentFixtures = fixturesCopaInternacional;
        break;
      case 'champions_league':
        currentStandings = standingsChampionsLeague;
        currentFixtures = fixturesChampionsLeague;
        break;
      case 'europa_league':
        currentStandings = standingsEuropaLeague;
        currentFixtures = fixturesEuropaLeague;
        break;
      case 'conference_league':
        currentStandings = standingsConferenceLeague;
        currentFixtures = fixturesConferenceLeague;
        break;
      case 'uefa_supercup':
        currentStandings = [];
        currentFixtures = fixturesUefaSupercup;
        break;
      case 'copa_brasil':
        currentStandings = [];
        currentFixtures = fixturesCopaBrasil;
        break;
      case 'supercopa_brasil':
        currentStandings = [];
        currentFixtures = fixturesSupercopa;
        break;
      case 'recopa_sulamericana':
        currentStandings = [];
        currentFixtures = fixturesRecopa;
        break;
      case 'estadual':
        currentStandings = standingsEstadual;
        currentFixtures = fixturesEstadual;
        break;
      case 'copa_nordeste':
        currentStandings = standingsCopaNordeste;
        currentFixtures = fixturesCopaNordeste;
        break;
      case 'copa_verde':
        currentStandings = standingsCopaVerde;
        currentFixtures = fixturesCopaVerde;
        break;
      case 'intercontinental':
        currentStandings = [];
        currentFixtures = fixturesIntercontinental;
        break;
      case 'concacaf_champions':
        currentStandings = [];
        currentFixtures = fixturesConcacafChampions;
        break;
      case 'afc_champions':
        currentStandings = standingsAfcChampions;
        currentFixtures = fixturesAfcChampions;
        break;
      case 'super_mundial_clubes':
        currentStandings = standingsSuperMundial;
        currentFixtures = fixturesSuperMundial;
        break;
      case 'eng_community_shield':
        currentStandings = [];
        currentFixtures = fixturesEngCommunityShield;
        break;
      case 'eng_fa_cup':
        currentStandings = [];
        currentFixtures = fixturesEngFaCup;
        break;
      case 'eng_efl_cup':
        currentStandings = [];
        currentFixtures = fixturesEngEflCup;
        break;
    }
  }

  const hasPlayedActiveFixture = currentFixtures.some((f) => f.played);
  const canGenerateActiveDraw =
    supportsCupDraw &&
    DRAWABLE_SHUFFLED_COMPETITIONS.includes(selectedComp) &&
    currentFixtures.length > 0 &&
    !hasPlayedActiveFixture;
  const isActiveCompDrawn = drawnCompetitions.includes(selectedComp);

  const superMundialProjected = useMemo(
    () =>
      computeSuperMundial32Qualifiers({
        clubs,
        standingsA,
        standingsSouthAmerica,
        standingsEurope,
        standingsWorldLeagues,
        fixturesChampionsLeague,
        fixturesLibertadores,
        fixturesCopaInternacional,
        fixturesConcacafChampions,
        fixturesAfcChampions,
      }),
    [
      clubs,
      standingsA,
      standingsSouthAmerica,
      standingsEurope,
      standingsWorldLeagues,
      fixturesChampionsLeague,
      fixturesLibertadores,
      fixturesCopaInternacional,
      fixturesConcacafChampions,
      fixturesAfcChampions,
    ]
  );

  // Exact per-competition player statistics aggregated from played fixtures
  const { entries: compPlayerStats, summary: compSummary } = useMemo(
    () => computeCompetitionPlayerStats(currentFixtures, clubs),
    [currentFixtures, clubs]
  );

  const rankedStatsList = useMemo(() => {
    const copy = [...compPlayerStats];
    if (statsCategory === 'goals') {
      return copy
        .filter((e) => e.goals > 0)
        .sort(
          (a, b) =>
            b.goals - a.goals ||
            b.assists - a.assists ||
            a.matchesPlayed - b.matchesPlayed ||
            b.player.overall - a.player.overall
        )
        .slice(0, 20);
    }
    if (statsCategory === 'assists') {
      return copy
        .filter((e) => e.assists > 0)
        .sort(
          (a, b) =>
            b.assists - a.assists ||
            b.goals - a.goals ||
            a.matchesPlayed - b.matchesPlayed ||
            b.player.overall - a.player.overall
        )
        .slice(0, 20);
    }
    if (statsCategory === 'ga') {
      return copy
        .filter((e) => e.goalContributions > 0)
        .sort(
          (a, b) =>
            b.goalContributions - a.goalContributions ||
            b.goals - a.goals ||
            b.assists - a.assists ||
            b.player.overall - a.player.overall
        )
        .slice(0, 20);
    }
    return copy
      .filter((e) => e.yellowCards > 0 || e.redCards > 0)
      .sort(
        (a, b) =>
          b.redCards - a.redCards ||
          b.yellowCards - a.yellowCards ||
          b.disciplinePoints - a.disciplinePoints ||
          b.matchesPlayed - a.matchesPlayed
      )
      .slice(0, 20);
  }, [compPlayerStats, statsCategory]);

  // Grouped standings (for Libertadores, Sul-Americana, or Estaduais)
  const groupedStandings = useMemo(() => {
    const groups: Record<string, Standing[]> = {};
    currentStandings.forEach((st) => {
      const gName = st.group || 'Geral';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(st);
    });
    // Sort each group by points DESC, GD DESC
    Object.keys(groups).forEach((g) => {
      groups[g].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.won !== a.won) return b.won - a.won;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });
    });
    return groups;
  }, [currentStandings]);

  const activeEstadualGroup = useMemo(() => {
    const keys = Object.keys(groupedStandings);
    if (keys.length === 0) return selectedEstadualGroup;
    return groupedStandings[selectedEstadualGroup] ? selectedEstadualGroup : keys[0];
  }, [groupedStandings, selectedEstadualGroup]);

  const scopedFixtures = useMemo(() => {
    if (selectedComp !== 'estadual') return currentFixtures;
    const filtered = currentFixtures.filter(
      (f) =>
        f.groupName === activeEstadualGroup ||
        (f.cupPhase || '').startsWith(activeEstadualGroup)
    );
    return filtered.length > 0 ? filtered : currentFixtures;
  }, [selectedComp, currentFixtures, activeEstadualGroup]);

  // Distinct rounds actually scheduled in this competition (avoids empty rounds in cups)
  const availableRounds = useMemo(() => {
    const distinct = Array.from(new Set(scopedFixtures.map((f) => f.round))).sort((a, b) => a - b);
    return distinct.length > 0 ? distinct : [1];
  }, [scopedFixtures]);

  const playedRounds = useMemo(() => {
    const distinct = Array.from(
      new Set(scopedFixtures.filter((f) => f.played).map((f) => f.round))
    ).sort((a, b) => a - b);
    return distinct;
  }, [scopedFixtures]);

  const effectiveViewRound = availableRounds.includes(viewRound)
    ? viewRound
    : availableRounds.reduce(
        (prev, curr) => (Math.abs(curr - currentRound) < Math.abs(prev - currentRound) ? curr : prev),
        availableRounds[0]
      );

  const effectiveTotwRound =
    totwRound !== null && playedRounds.includes(totwRound)
      ? totwRound
      : playedRounds.length > 0
      ? playedRounds[playedRounds.length - 1]
      : availableRounds[0];

  const teamOfTheRound = useMemo(
    () => buildTeamOfTheRound(scopedFixtures, effectiveTotwRound, clubs, userClub.id),
    [scopedFixtures, effectiveTotwRound, clubs, userClub.id]
  );

  const roundFixtures = scopedFixtures.filter((f) => f.round === effectiveViewRound);
  const playedInSelectedComp = scopedFixtures.filter((f) => f.played).length;

  const activeEstadualCfg: EstadualCompetitionConfig | undefined = useMemo(
    () =>
      selectedComp === 'estadual'
        ? getEstadualConfigByName(activeEstadualGroup) || ESTADUAIS_2026_CONFIG[0]
        : undefined,
    [selectedComp, activeEstadualGroup]
  );

  const liveEstadualMeritCtx = useMemo(() => {
    const libBrIds = (conmebolReport.byLeague.serie_a?.libertadoresClubs || []).map(
      (e) => e.clubId
    );
    const sulaBrIds = (conmebolReport.byLeague.serie_a?.sulamericanaClubs || []).map(
      (e) => e.clubId
    );
    const relegatedFromCIds = (standingsC || []).slice(-4).map((s) => s.teamId);
    return buildEstadualQualificationMeritContext({
      clubs,
      relegatedFromCIds,
      fixturesD,
      standingsD,
      copaBrasilChampId: resolveCupChampionId(fixturesCopaBrasil),
      copaNordesteChampId: resolveCupChampionId(fixturesCopaNordeste),
      copaVerdeChampId: resolveCupChampionId(fixturesCopaVerde),
      serieCChampId: standingsC?.[0]?.teamId,
      serieDChampId: resolveCupChampionId(fixturesD),
      libertadoresBrIds: libBrIds,
      sulamericanaBrIds: sulaBrIds,
    });
  }, [
    clubs,
    conmebolReport,
    standingsC,
    fixturesD,
    standingsD,
    fixturesCopaBrasil,
    fixturesCopaNordeste,
    fixturesCopaVerde,
  ]);

  const activeEstadualClassification = useMemo(() => {
    if (selectedComp !== 'estadual' || !activeEstadualCfg) return null;
    return resolveEstadualClassificationForConfig(
      activeEstadualCfg,
      fixturesEstadual,
      standingsEstadual,
      clubs,
      liveEstadualMeritCtx
    );
  }, [selectedComp, activeEstadualCfg, fixturesEstadual, standingsEstadual, clubs, liveEstadualMeritCtx]);

  // Tabela Agregada Geral da Série D (96 clubes — campanha acumulada em 1ª Fase + Mata-Mata, critério oficial CBF)
  const serieDAggregatedRanking = useMemo(() => {
    const clubMap = new Map(clubs.map((c) => [c.id, c]));
    const campaignMap = computeSerieDOverallCampaignMap(fixturesD, standingsD);

    // Track group & position inside each group (A01..A16)
    const groupPosByTeam = new Map<string, { group: string; groupPos: number }>();
    const groupCounters = new Map<string, number>();
    standingsD.forEach((st) => {
      const grp = st.group || 'Série D';
      const nextPos = (groupCounters.get(grp) || 0) + 1;
      groupCounters.set(grp, nextPos);
      groupPosByTeam.set(st.teamId, { group: grp, groupPos: nextPos });
    });

    // Track highest knockout stage reached per club
    const stageRank = new Map<string, { rank: number; label: string; tone: string }>();
    const setStage = (teamId: string, rank: number, label: string, tone: string) => {
      if (!teamId || teamId === 'tbd') return;
      const cur = stageRank.get(teamId);
      if (!cur || rank > cur.rank) {
        stageRank.set(teamId, { rank, label, tone });
      }
    };

    const champId = resolveCupChampionId(fixturesD);
    const runnerUpId = resolveCupRunnerUpId(fixturesD);
    if (champId) setStage(champId, 10, 'Campeão · Acesso C + 3ª Fase CdB', 'amber');
    if (runnerUpId) setStage(runnerUpId, 9, 'Vice · Acesso à Série C', 'emerald');

    fixturesD.forEach((f) => {
      const ids = [f.homeTeamId, f.awayTeamId];
      if (f.id.startsWith('sd_final')) {
        ids.forEach((id) => setStage(id, 8, 'Finalista · Acesso C', 'emerald'));
      } else if (f.id.startsWith('sd_semi_')) {
        ids.forEach((id) => setStage(id, 7, 'Semifinal · Acesso C', 'emerald'));
      } else if (f.id.startsWith('sd_quartas_')) {
        ids.forEach((id) => setStage(id, 6, 'Quartas (5ª Fase)', 'sky'));
      } else if (f.id.startsWith('sd_oitavas_')) {
        ids.forEach((id) => setStage(id, 5, 'Oitavas (4ª Fase)', 'sky'));
      } else if (f.id.startsWith('sd_f3_')) {
        ids.forEach((id) => setStage(id, 4, '3ª Fase · Vaga D Garantida', 'indigo'));
      } else if (f.id.startsWith('sd_f2_')) {
        ids.forEach((id) => setStage(id, 3, '2ª Fase (64)', 'slate'));
      }
    });

    // Tally full W/D/L/GF/GA across all played Série D fixtures (1ª fase + mata-mata)
    const fullStats = new Map<
      string,
      { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }
    >();
    const ensureFull = (id: string) => {
      let row = fullStats.get(id);
      if (!row) {
        row = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
        fullStats.set(id, row);
      }
      return row;
    };

    let playedMatchesCount = 0;
    fixturesD.forEach((f) => {
      if (!f.played || f.homeScore === null || f.awayScore === null) return;
      if (!f.homeTeamId || f.homeTeamId === 'tbd' || !f.awayTeamId || f.awayTeamId === 'tbd') return;
      playedMatchesCount++;
      const h = ensureFull(f.homeTeamId);
      const a = ensureFull(f.awayTeamId);
      h.played++;
      a.played++;
      h.goalsFor += f.homeScore;
      h.goalsAgainst += f.awayScore;
      a.goalsFor += f.awayScore;
      a.goalsAgainst += f.homeScore;
      if (f.homeScore > f.awayScore) {
        h.won++;
        h.points += 3;
        a.lost++;
      } else if (f.awayScore > f.homeScore) {
        a.won++;
        a.points += 3;
        h.lost++;
      } else {
        h.drawn++;
        a.drawn++;
        h.points += 1;
        a.points += 1;
      }
    });

    const teamIds =
      standingsD.length > 0
        ? Array.from(new Set(standingsD.map((s) => s.teamId)))
        : clubs.filter((c) => c.division === 'D').map((c) => c.id);

    const rows = teamIds
      .map((teamId) => {
        const club = clubMap.get(teamId);
        if (!club) return null;
        const stFallback = standingsD.find((s) => s.teamId === teamId);
        const fStat = fullStats.get(teamId);
        const camp = campaignMap.get(teamId);

        const played = fStat ? fStat.played : stFallback?.played ?? camp?.played ?? 0;
        const won = fStat ? fStat.won : stFallback?.won ?? camp?.won ?? 0;
        const drawn = fStat ? fStat.drawn : stFallback?.drawn ?? 0;
        const lost = fStat ? fStat.lost : stFallback?.lost ?? 0;
        const goalsFor = fStat ? fStat.goalsFor : stFallback?.goalsFor ?? camp?.goalsFor ?? 0;
        const goalsAgainst = fStat ? fStat.goalsAgainst : stFallback?.goalsAgainst ?? 0;
        const goalDifference = goalsFor - goalsAgainst;
        const points = fStat ? fStat.points : stFallback?.points ?? camp?.points ?? 0;
        const efficiency = played > 0 ? (points / (played * 3)) * 100 : 0;

        const grpInfo = groupPosByTeam.get(teamId);
        const ufCfg = getEstadualConfigByUf(club.state);
        const koStage = stageRank.get(teamId);
        const statusLabel = koStage
          ? koStage.label
          : grpInfo && grpInfo.groupPos <= 4
          ? `G-4 (${grpInfo.group.replace('Grupo ', '')})`
          : '1ª Fase';
        const statusTone = koStage
          ? koStage.tone
          : grpInfo && grpInfo.groupPos <= 4
          ? 'emerald'
          : 'slate';

        return {
          club,
          group: grpInfo?.group || 'Série D',
          groupShort: (grpInfo?.group || 'Série D').replace('Grupo ', ''),
          groupPos: grpInfo?.groupPos ?? 6,
          region: ufCfg?.region || ('Sudeste' as BrazilianMacroRegion),
          played,
          won,
          drawn,
          lost,
          goalsFor,
          goalsAgainst,
          goalDifference,
          points,
          efficiency,
          stageRank: koStage?.rank ?? (grpInfo && grpInfo.groupPos <= 4 ? 2 : 1),
          statusLabel,
          statusTone,
        };
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

    rows.sort((a, b) => {
      if (overallSortBy === 'efficiency') {
        if (Math.abs(b.efficiency - a.efficiency) > 0.01) return b.efficiency - a.efficiency;
      }
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      if (b.club.reputation !== a.club.reputation) return b.club.reputation - a.club.reputation;
      return a.club.name.localeCompare(b.club.name);
    });

    return {
      rows,
      playedMatchesCount,
    };
  }, [clubs, fixturesD, standingsD, overallSortBy]);

  // Ranking Geral Consolidado dos 27 Campeonatos Estaduais do Brasil
  const estaduaisOverallRanking = useMemo(() => {
    const clubMap = new Map(clubs.map((c) => [c.id, c]));
    const allEstSummary = resolveAllEstaduaisFinalClassifications(
      fixturesEstadual,
      standingsEstadual,
      clubs,
      liveEstadualMeritCtx
    );

    const serieDQualifiedSet = new Set(allEstSummary.allSerieDQualifiedIds);
    const cdbQualifiedSet = new Set(allEstSummary.allCopaBrasilQualifiedIds);
    const cneQualifiedSet = new Set(allEstSummary.allCopaNordesteQualifiedIds);
    const cvQualifiedSet = new Set(allEstSummary.allCopaVerdeQualifiedIds);

    const championStateByClubId = new Map<string, string>();
    const runnerUpStateByClubId = new Map<string, string>();
    let definedChampionsCount = 0;

    ESTADUAIS_2026_CONFIG.forEach((cfg) => {
      const st = allEstSummary.byUf[cfg.uf];
      // Check if the state championship actually finished its final fixture
      const finalPlayed = fixturesEstadual.some(
        (f) =>
          f.played &&
          (f.id.startsWith(`est_final_${cfg.key}`) || f.id.startsWith(`est_${cfg.key}_final`))
      );
      if (finalPlayed && st?.championId) {
        definedChampionsCount++;
        championStateByClubId.set(st.championId, cfg.shortName);
        if (st.runnerUpId) runnerUpStateByClubId.set(st.runnerUpId, cfg.shortName);
      }
    });

    // Aggregate all played Estadual fixtures (1ª fase + mata-mata) per club
    const fullStats = new Map<
      string,
      { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }
    >();
    const ensureFull = (id: string) => {
      let row = fullStats.get(id);
      if (!row) {
        row = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
        fullStats.set(id, row);
      }
      return row;
    };

    let playedMatchesCount = 0;
    fixturesEstadual.forEach((f) => {
      if (!f.played || f.homeScore === null || f.awayScore === null) return;
      if (!f.homeTeamId || f.homeTeamId === 'tbd' || !f.awayTeamId || f.awayTeamId === 'tbd') return;
      playedMatchesCount++;
      const h = ensureFull(f.homeTeamId);
      const a = ensureFull(f.awayTeamId);
      h.played++;
      a.played++;
      h.goalsFor += f.homeScore;
      h.goalsAgainst += f.awayScore;
      a.goalsFor += f.awayScore;
      a.goalsAgainst += f.homeScore;
      if (f.homeScore > f.awayScore) {
        h.won++;
        h.points += 3;
        a.lost++;
      } else if (f.awayScore > f.homeScore) {
        a.won++;
        a.points += 3;
        h.lost++;
      } else {
        h.drawn++;
        a.drawn++;
        h.points += 1;
        a.points += 1;
      }
    });

    const standingByTeam = new Map<string, Standing>();
    standingsEstadual.forEach((st) => {
      if (!standingByTeam.has(st.teamId)) standingByTeam.set(st.teamId, st);
    });

    const rows = Array.from(standingByTeam.entries())
      .map(([teamId, st]) => {
        const club = clubMap.get(teamId);
        if (!club) return null;
        const cfg = getEstadualConfigByName(st.group) || getEstadualConfigByUf(club.state);
        const fStat = fullStats.get(teamId);

        const played = fStat ? fStat.played : st.played;
        const won = fStat ? fStat.won : st.won;
        const drawn = fStat ? fStat.drawn : st.drawn;
        const lost = fStat ? fStat.lost : st.lost;
        const goalsFor = fStat ? fStat.goalsFor : st.goalsFor;
        const goalsAgainst = fStat ? fStat.goalsAgainst : st.goalsAgainst;
        const goalDifference = goalsFor - goalsAgainst;
        const points = fStat ? fStat.points : st.points;
        const efficiency = played > 0 ? (points / (played * 3)) * 100 : 0;

        return {
          club,
          estadualName: cfg?.shortName || st.group || club.state,
          uf: cfg?.uf || club.state,
          region: cfg?.region || ('Sudeste' as BrazilianMacroRegion),
          played,
          won,
          drawn,
          lost,
          goalsFor,
          goalsAgainst,
          goalDifference,
          points,
          efficiency,
          isChampion: championStateByClubId.has(teamId),
          isRunnerUp: runnerUpStateByClubId.has(teamId),
          isSerieDQualified: serieDQualifiedSet.has(teamId),
          isCopaBrasil: cdbQualifiedSet.has(teamId),
          isNordeste: cneQualifiedSet.has(teamId),
          isCopaVerde: cvQualifiedSet.has(teamId),
        };
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

    rows.sort((a, b) => {
      if (overallSortBy === 'efficiency') {
        if (Math.abs(b.efficiency - a.efficiency) > 0.01) return b.efficiency - a.efficiency;
        if (b.points !== a.points) return b.points - a.points;
      } else {
        if (b.points !== a.points) return b.points - a.points;
        if (Math.abs(b.efficiency - a.efficiency) > 0.01) return b.efficiency - a.efficiency;
      }
      if (b.won !== a.won) return b.won - a.won;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      if (b.club.reputation !== a.club.reputation) return b.club.reputation - a.club.reputation;
      return a.club.name.localeCompare(b.club.name);
    });

    return {
      rows,
      playedMatchesCount,
      definedChampionsCount,
      totalSerieDSpots: ESTADUAIS_2026_CONFIG.reduce((sum, cfg) => sum + cfg.serieDSpots, 0),
    };
  }, [clubs, fixturesEstadual, standingsEstadual, overallSortBy, liveEstadualMeritCtx]);

  const orderedEstadualConfigs = useMemo(() => {
    const presentGroups = new Set(Object.keys(groupedStandings));
    const available = ESTADUAIS_2026_CONFIG.filter(
      (cfg) => presentGroups.size === 0 || presentGroups.has(cfg.name)
    );
    if (estadualMacroRegion === 'ALL') return available;
    return available.filter((cfg) => cfg.region === estadualMacroRegion);
  }, [groupedStandings, estadualMacroRegion]);

  const formatCompactPrize = (val: number) => {
    if (val >= 1_000_000) {
      return `R$ ${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1).replace('.', ',')} mi`;
    }
    return `R$ ${Math.round(val / 1_000).toLocaleString('pt-BR')} mil`;
  };

  const renderEstadualSelectorBar = (onAfterSelect?: () => void) => {
    if (selectedComp !== 'estadual') return null;
    const regionPills: Array<{ id: 'ALL' | BrazilianMacroRegion; label: string; count: number }> = [
      { id: 'ALL', label: 'Todos', count: ESTADUAIS_2026_CONFIG.length },
      {
        id: 'Sudeste',
        label: 'Sudeste',
        count: ESTADUAIS_2026_CONFIG.filter((c) => c.region === 'Sudeste').length,
      },
      {
        id: 'Sul',
        label: 'Sul',
        count: ESTADUAIS_2026_CONFIG.filter((c) => c.region === 'Sul').length,
      },
      {
        id: 'Nordeste',
        label: 'Nordeste',
        count: ESTADUAIS_2026_CONFIG.filter((c) => c.region === 'Nordeste').length,
      },
      {
        id: 'Centro-Oeste',
        label: 'Centro-Oeste',
        count: ESTADUAIS_2026_CONFIG.filter((c) => c.region === 'Centro-Oeste').length,
      },
      {
        id: 'Norte',
        label: 'Norte',
        count: ESTADUAIS_2026_CONFIG.filter((c) => c.region === 'Norte').length,
      },
    ];

    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold text-slate-300 mr-1">
              Campeonatos Estaduais 2026:
            </span>
            {regionPills.map((rp) => {
              const active = estadualMacroRegion === rp.id;
              return (
                <button
                  key={rp.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setEstadualMacroRegion(rp.id);
                    const nextList =
                      rp.id === 'ALL'
                        ? ESTADUAIS_2026_CONFIG
                        : ESTADUAIS_2026_CONFIG.filter((c) => c.region === rp.id);
                    if (
                      nextList.length > 0 &&
                      !nextList.some((c) => c.name === activeEstadualGroup)
                    ) {
                      setSelectedEstadualGroup(nextList[0].name);
                      onAfterSelect?.();
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-emerald-400 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{rp.label}</span>{' '}
                  <span className="font-mono tabular-nums opacity-75">({rp.count})</span>
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            27 Estaduais Oficiais · Vagas CBF Série D, Copa do Brasil, Nordestão & Copa Verde
          </span>
        </div>

        <ScrollableTabStrip
          activeKey={activeEstadualGroup}
          ariaLabel="Campeonatos Estaduais"
          innerClassName="flex items-center gap-1.5"
        >
          {orderedEstadualConfigs.map((cfg) => {
            const clubCountInGrp = groupedStandings[cfg.name]?.length || cfg.clubsCount;
            const isSelected = activeEstadualGroup === cfg.name;
            const isUserState = userEstadualGroup === cfg.name;
            return (
              <button
                key={cfg.uf}
                type="button"
                data-tab-active={isSelected ? 'true' : undefined}
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedEstadualGroup(cfg.name);
                  onAfterSelect?.();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-teal-400 text-slate-950 font-black shadow'
                    : isUserState
                    ? 'bg-slate-900 text-sky-300 border border-sky-500/40 hover:bg-slate-800'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                <span>{cfg.shortName}</span>
                <span className="font-mono tabular-nums opacity-75 text-[11px]">
                  ({clubCountInGrp})
                </span>
              </button>
            );
          })}
        </ScrollableTabStrip>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Competition Bar: Pastas de Campeonatos (Brasil, Europa, América do Sul, Continentes) */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3.5">
        {/* Main Folder Tabs Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              Pastas de Campeonatos:
            </span>
          </div>

          <ScrollableTabStrip
            activeKey={activeFolder}
            ariaLabel="Pastas de Campeonatos"
            className="w-full"
            innerClassName="flex items-center gap-2"
          >
            {(
              [
                {
                  id: 'BRASIL' as const,
                  label: 'Campeonatos do Brasil',
                  flag: '🇧🇷',
                  badge: '8 + 27 Est.',
                  defaultComp: 'serie_a' as const,
                },
                {
                  id: 'EUROPA' as const,
                  label: 'Ligas da Europa',
                  flag: '🇪🇺',
                  badge: '16 Ligas',
                  defaultComp: (getClubEuropeanLeagueId(userClub) || 'eng_premier') as CompetitionType,
                },
                {
                  id: 'AMERICA_SUL' as const,
                  label: 'América do Sul',
                  flag: '🌎',
                  badge: '30 Competições',
                  defaultComp: (getClubSouthAmericanLeagueId(userClub) || 'liga_arg') as CompetitionType,
                },
                {
                  id: 'AMERICA_NORTE' as const,
                  label: 'América do Norte',
                  flag: '🌎',
                  badge: '7 Competições',
                  defaultComp: 'concacaf_champions' as const,
                },
                {
                  id: 'ASIA' as const,
                  label: 'Ásia & Eurásia',
                  flag: '🌏',
                  badge: '7 Competições',
                  defaultComp: 'afc_champions' as const,
                },
                {
                  id: 'AFRICA' as const,
                  label: 'África',
                  flag: '🌍',
                  badge: '4 Competições',
                  defaultComp: 'egy_premier' as const,
                },
                {
                  id: 'MUNDIAL' as const,
                  label: 'Mundial & Intercontinental',
                  flag: '🌐',
                  badge: '2 Torneios',
                  defaultComp: 'super_mundial_clubes' as const,
                },
              ]
            ).map((folder) => {
              const isActive = activeFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveFolder(folder.id);
                    if (getFolderForCompetition(selectedComp) !== folder.id) {
                      setSelectedComp(folder.defaultComp);
                      setTotwRound(null);
                      setSelectedBracketPhase('ALL');
                      if (isPureKnockoutComp(folder.defaultComp)) {
                        setActiveTab('bracket');
                      } else {
                        setActiveTab('table');
                      }
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-200 border-sky-400/50 shadow-md shadow-sky-500/10 font-black'
                      : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  {isActive ? (
                    <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{folder.flag} {folder.label}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {folder.badge}
                  </span>
                </button>
              );
            })}
          </ScrollableTabStrip>
        </div>

        {/* Active Folder Drawer: Sub-Categories + Actions + Competition Badges */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Sub-categories for Brasil, Europa and América do Sul */}
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFolder === 'BRASIL' && (
                <>
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Seção:</span>
                  {(
                    [
                      { id: 'ALL' as const, label: 'Todas do Brasil (8)' },
                      { id: 'SERIES' as const, label: 'Séries CBF (A, B, C, D)' },
                      { id: 'COPAS' as const, label: 'Copas Nacionais (2)' },
                      { id: 'REGIONAIS' as const, label: 'Copas Regionais (2)' },
                      { id: 'ESTADUAIS' as const, label: 'Estaduais 2026 (27 UFs)' },
                    ] as const
                  ).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setBrazilSubCategory(sub.id);
                        if (sub.id === 'ESTADUAIS') {
                          setSelectedComp('estadual');
                        } else if (sub.id === 'SERIES' && !['serie_a', 'serie_b', 'serie_c', 'serie_d'].includes(selectedComp)) {
                          setSelectedComp('serie_a');
                        } else if (sub.id === 'COPAS' && !['copa_brasil', 'supercopa_brasil'].includes(selectedComp)) {
                          setSelectedComp('copa_brasil');
                          setActiveTab('bracket');
                        } else if (sub.id === 'REGIONAIS' && !['copa_nordeste', 'copa_verde'].includes(selectedComp)) {
                          setSelectedComp('copa_nordeste');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        brazilSubCategory === sub.id
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800/80'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </>
              )}

              {activeFolder === 'EUROPA' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <span>🇪🇺 Europa · 23 Campeonatos Organizados por País</span>
                  </span>
                </div>
              )}

              {activeFolder === 'AMERICA_SUL' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>🌎 América do Sul · 30 Competições Organizadas por País</span>
                  </span>
                </div>
              )}

              {activeFolder === 'AMERICA_NORTE' && (
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🌎 América do Norte, Central & Caribe · Concacaf Champions + 3 Ligas + 3 Copas Nacionais</span>
                </span>
              )}

              {activeFolder === 'ASIA' && (
                <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <span>🌏 Ásia & Rússia · Liga dos Campeões da AFC + 3 Ligas + 3 Copas Nacionais</span>
                </span>
              )}

              {activeFolder === 'AFRICA' && (
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🌍 África · 2 Ligas Oficiais + 2 Copas Nacionais</span>
                </span>
              )}

              {activeFolder === 'MUNDIAL' && (
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>🌐 Competições Mundiais & Intercontinentais da FIFA</span>
                </span>
              )}
            </div>

            {/* Folder Actions (Calibrate / Progress Counter) */}
            <div className="flex flex-wrap items-center gap-2">
              {onCalibrateWorldLeague &&
                (activeFolder === 'AMERICA_NORTE' ||
                  activeFolder === 'ASIA' ||
                  activeFolder === 'AFRICA' ||
                  activeFolder === 'MUNDIAL') && (
                  <button
                    type="button"
                    disabled={Boolean(calibratingWlLeagueId)}
                    onClick={() => {
                      soundEngine.playClick();
                      onCalibrateWorldLeague('ALL');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-50 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        calibratingWlLeagueId === 'ALL' ? 'animate-spin' : ''
                      }`}
                    />
                    <span>
                      {calibratingWlLeagueId === 'ALL'
                        ? 'Atualizando Ligas (IA 2026)...'
                        : 'Atualizar Ligas Norte/Ásia/África (IA 2026)'}
                    </span>
                  </button>
                )}

              {onCalibrateEuropeLeague && activeFolder === 'EUROPA' && (
                <button
                  type="button"
                  disabled={Boolean(calibratingEuLeagueId)}
                  onClick={() => {
                    soundEngine.playClick();
                    onCalibrateEuropeLeague('ALL');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 disabled:opacity-50 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      calibratingEuLeagueId === 'ALL' ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {calibratingEuLeagueId === 'ALL'
                      ? 'Atualizando 13 Ligas (IA 2026)...'
                      : 'Atualizar 13 Ligas Europeias (IA 2026)'}
                  </span>
                </button>
              )}

              {onCalibrateSouthAmericaLeague && activeFolder === 'AMERICA_SUL' && (
                <button
                  type="button"
                  disabled={Boolean(calibratingSaLeagueId)}
                  onClick={() => {
                    soundEngine.playClick();
                    onCalibrateSouthAmericaLeague('ALL');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-50 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      calibratingSaLeagueId === 'ALL' ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {calibratingSaLeagueId === 'ALL'
                      ? 'Calibrando 9 Ligas com IA...'
                      : 'Calibrar 9 Ligas Sul-Americanas (IA)'}
                  </span>
                </button>
              )}

              <span className="text-[11px] text-slate-400 font-mono tabular-nums whitespace-nowrap">
                {playedInSelectedComp}/{currentFixtures.length} jogos
              </span>
            </div>
          </div>

          {/* EUROPE: Pastas por País com Barra de Rolagem Horizontal */}
          {activeFolder === 'EUROPA' && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Pastas por País da Europa:
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    · Role na barra horizontal para ver todos os países e selecione uma pasta
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      europeFolderScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' });
                    }}
                    className="p-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                    title="Rolar países para a esquerda"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      europeFolderScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' });
                    }}
                    className="p-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                    title="Rolar países para a direita"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Barra de rolagem com todas as pastas de países */}
              <div
                ref={europeFolderScrollRef}
                className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-sky-500/50 scrollbar-track-slate-950/80 hover:scrollbar-thumb-sky-400"
              >
                {EUROPE_COUNTRY_FOLDERS.map((cFolder) => {
                  const isFolderActive = europeCountryFolder === cFolder.id;
                  const containsSelected = cFolder.competitions.includes(selectedComp);
                  return (
                    <button
                      key={cFolder.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setEuropeCountryFolder(cFolder.id);
                        if (!cFolder.competitions.includes(selectedComp)) {
                          setSelectedComp(cFolder.competitions[0]);
                          setTotwRound(null);
                          setSelectedBracketPhase('ALL');
                          setActiveTab('table');
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                        isFolderActive
                          ? 'bg-gradient-to-r from-sky-500/25 to-blue-500/20 text-white border-sky-400/80 shadow-md shadow-sky-500/15 font-black'
                          : containsSelected
                          ? 'bg-slate-950 text-sky-300 border-sky-500/40 hover:bg-slate-800'
                          : 'bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      {isFolderActive ? (
                        <FolderOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className="text-sm shrink-0">{cFolder.flag}</span>
                      <span>{cFolder.name}</span>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                          isFolderActive
                            ? 'bg-sky-400 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cFolder.competitions.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Indicador de campeonatos na pasta ativa */}
          {activeFolder === 'EUROPA' && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1 pb-0.5">
              <span className="flex items-center gap-1.5 font-bold text-slate-300">
                <span>Campeonatos na pasta:</span>
                <span className="text-sky-300 font-black flex items-center gap-1">
                  <span>
                    {(EUROPE_COUNTRY_FOLDERS.find((f) => f.id === europeCountryFolder) || EUROPE_COUNTRY_FOLDERS[0]).flag}
                  </span>
                  <span>
                    {(EUROPE_COUNTRY_FOLDERS.find((f) => f.id === europeCountryFolder) || EUROPE_COUNTRY_FOLDERS[0]).name}
                  </span>
                </span>
                <span className="text-slate-500 font-normal hidden md:inline">
                  · {(EUROPE_COUNTRY_FOLDERS.find((f) => f.id === europeCountryFolder) || EUROPE_COUNTRY_FOLDERS[0]).description}
                </span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {(EUROPE_COUNTRY_FOLDERS.find((f) => f.id === europeCountryFolder) || EUROPE_COUNTRY_FOLDERS[0]).competitions.length}{' '}
                {(EUROPE_COUNTRY_FOLDERS.find((f) => f.id === europeCountryFolder) || EUROPE_COUNTRY_FOLDERS[0]).competitions.length === 1 ? 'divisão/torneio' : 'divisões/torneios'}
              </span>
            </div>
          )}

          {/* AMÉRICA DO SUL: Pastas por País com Barra de Rolagem Horizontal */}
          {activeFolder === 'AMERICA_SUL' && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Pastas por País da América do Sul:
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    · Role na barra horizontal para ver todos os países e selecione uma pasta
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      saFolderScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' });
                    }}
                    className="p-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                    title="Rolar países para a esquerda"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      saFolderScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' });
                    }}
                    className="p-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                    title="Rolar países para a direita"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Barra de rolagem com todas as pastas de países */}
              <div
                ref={saFolderScrollRef}
                className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-emerald-500/50 scrollbar-track-slate-950/80 hover:scrollbar-thumb-emerald-400"
              >
                {SOUTH_AMERICA_COUNTRY_FOLDERS.map((cFolder) => {
                  const isFolderActive = saCountryFolder === cFolder.id;
                  const containsSelected = cFolder.competitions.includes(selectedComp);
                  return (
                    <button
                      key={cFolder.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSaCountryFolder(cFolder.id);
                        if (!cFolder.competitions.includes(selectedComp)) {
                          setSelectedComp(cFolder.competitions[0]);
                          setTotwRound(null);
                          setSelectedBracketPhase('ALL');
                          if (isPureKnockoutComp(cFolder.competitions[0])) {
                            setActiveTab('bracket');
                          } else {
                            setActiveTab('table');
                          }
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                        isFolderActive
                          ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/20 text-white border-emerald-400/80 shadow-md shadow-emerald-500/15 font-black'
                          : containsSelected
                          ? 'bg-slate-950 text-emerald-300 border-emerald-500/40 hover:bg-slate-800'
                          : 'bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      {isFolderActive ? (
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className="text-sm shrink-0">{cFolder.flag}</span>
                      <span>{cFolder.name}</span>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                          isFolderActive
                            ? 'bg-emerald-400 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cFolder.competitions.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Indicador de campeonatos na pasta ativa da América do Sul */}
          {activeFolder === 'AMERICA_SUL' && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1 pb-0.5">
              <span className="flex items-center gap-1.5 font-bold text-slate-300">
                <span>Campeonatos na pasta:</span>
                <span className="text-emerald-300 font-black flex items-center gap-1">
                  <span>
                    {(SOUTH_AMERICA_COUNTRY_FOLDERS.find((f) => f.id === saCountryFolder) || SOUTH_AMERICA_COUNTRY_FOLDERS[0]).flag}
                  </span>
                  <span>
                    {(SOUTH_AMERICA_COUNTRY_FOLDERS.find((f) => f.id === saCountryFolder) || SOUTH_AMERICA_COUNTRY_FOLDERS[0]).name}
                  </span>
                </span>
                <span className="text-slate-500 font-normal hidden md:inline">
                  · {(SOUTH_AMERICA_COUNTRY_FOLDERS.find((f) => f.id === saCountryFolder) || SOUTH_AMERICA_COUNTRY_FOLDERS[0]).description}
                </span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {(SOUTH_AMERICA_COUNTRY_FOLDERS.find((f) => f.id === saCountryFolder) || SOUTH_AMERICA_COUNTRY_FOLDERS[0]).competitions.length}{' '}
                {(SOUTH_AMERICA_COUNTRY_FOLDERS.find((f) => f.id === saCountryFolder) || SOUTH_AMERICA_COUNTRY_FOLDERS[0]).competitions.length === 1 ? 'torneio' : 'torneios'}
              </span>
            </div>
          )}

          {/* Competitions Pills in Active Folder */}
          <ScrollableTabStrip
            activeKey={selectedComp}
            ariaLabel="Competições na pasta selecionada"
            innerClassName="flex items-center gap-2"
          >
            {(() => {
              let compsToShow: CompetitionType[] = [];
              if (activeFolder === 'BRASIL') {
                if (brazilSubCategory === 'SERIES') {
                  compsToShow = ['serie_a', 'serie_b', 'serie_c', 'serie_d'];
                } else if (brazilSubCategory === 'COPAS') {
                  compsToShow = ['copa_brasil', 'supercopa_brasil'];
                } else if (brazilSubCategory === 'REGIONAIS') {
                  compsToShow = ['copa_nordeste', 'copa_verde'];
                } else if (brazilSubCategory === 'ESTADUAIS') {
                  compsToShow = ['estadual'];
                } else {
                  compsToShow = [
                    'serie_a',
                    'serie_b',
                    'serie_c',
                    'serie_d',
                    'copa_brasil',
                    'supercopa_brasil',
                    'copa_nordeste',
                    'copa_verde',
                    'estadual',
                  ];
                }
              } else if (activeFolder === 'EUROPA') {
                const currentFolderObj =
                  EUROPE_COUNTRY_FOLDERS.find((f) => f.id === europeCountryFolder) ||
                  EUROPE_COUNTRY_FOLDERS[0];
                compsToShow = currentFolderObj.competitions;
              } else if (activeFolder === 'AMERICA_SUL') {
                const currentFolderObj =
                  SOUTH_AMERICA_COUNTRY_FOLDERS.find((f) => f.id === saCountryFolder) ||
                  SOUTH_AMERICA_COUNTRY_FOLDERS[0];
                compsToShow = currentFolderObj.competitions;
              } else if (activeFolder === 'AMERICA_NORTE') {
                compsToShow = [
                  'concacaf_champions',
                  'usa_mls',
                  'wl_cup_usa',
                  'mex_ligamx',
                  'wl_cup_mex',
                  'can_cpl',
                  'wl_cup_can',
                ];
              } else if (activeFolder === 'ASIA') {
                compsToShow = [
                  'afc_champions',
                  'sau_pro',
                  'wl_cup_sau',
                  'jpn_j1',
                  'wl_cup_jpn',
                  'rus_premier',
                  'wl_cup_rus',
                ];
              } else if (activeFolder === 'AFRICA') {
                compsToShow = ['egy_premier', 'wl_cup_egy', 'mar_botola', 'wl_cup_mar'];
              } else if (activeFolder === 'MUNDIAL') {
                compsToShow = ['super_mundial_clubes', 'intercontinental'];
              }

              return compsToShow.map((cKey) => {
                const meta = COMPETITIONS_CATALOG[cKey];
                const isSelected = selectedComp === cKey;
                return (
                  <button
                    key={cKey}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedComp(cKey);
                      setTotwRound(null);
                      setSelectedBracketPhase('ALL');
                      if (isPureKnockoutComp(cKey) && activeTab === 'table') {
                        setActiveTab('bracket');
                      } else if (
                        activeTab === 'bracket' &&
                        !meta.isCup &&
                        cKey !== 'eng_championship' &&
                        cKey !== 'eng_league_two' &&
                        cKey !== 'eng_league_one' &&
                        cKey !== 'ger_bundesliga' &&
                        cKey !== 'ger_bundesliga2' &&
                        cKey !== 'fra_ligue1' &&
                        cKey !== 'fra_ligue2' &&
                        cKey !== 'esp_laliga2' &&
                        cKey !== 'ita_serie_b' &&
                        cKey !== 'serie_b' &&
                        cKey !== 'serie_c' &&
                        cKey !== 'usa_mls'
                      ) {
                        setActiveTab('table');
                      } else if (
                        !isPureKnockoutComp(cKey) &&
                        isPureKnockoutComp(selectedComp) &&
                        activeTab === 'bracket'
                      ) {
                        setActiveTab('table');
                      }
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-950 shadow-lg shadow-sky-500/25'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span className="text-sm">{meta.badgeEmoji}</span>
                    <span>{meta.shortName}</span>
                    <span
                      className={`font-mono tabular-nums text-[10px] ${
                        isSelected ? 'text-slate-900/80' : 'text-slate-500'
                      }`}
                    >
                      {meta.officialClubsCount}
                    </span>
                  </button>
                );
              });
            })()}
          </ScrollableTabStrip>
        </div>

        {(wlAiFeedback || saAiFeedback || euAiFeedback) && (
          <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-2">
            <span>{wlAiFeedback || euAiFeedback || saAiFeedback}</span>
          </div>
        )}

        {oct2026SyncFeedback && (
          <div className="px-3.5 py-2.5 rounded-xl bg-sky-950/50 border border-sky-500/40 text-xs text-sky-100 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{oct2026SyncFeedback}</span>
              </div>
              {onDismissOct2026Feedback && (
                <button
                  type="button"
                  onClick={onDismissOct2026Feedback}
                  className="text-slate-400 hover:text-white cursor-pointer shrink-0"
                  title="Fechar aviso"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {oct2026GroundingSources.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-sky-500/20 text-[11px]">
                <span className="text-slate-400 font-semibold">Fontes {getCurrentRealWorldSyncPeriod().shortLabel}:</span>
                {oct2026GroundingSources.slice(0, 6).map((src, idx) => (
                  <a
                    key={`${src.uri}-${idx}`}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-sky-300 hover:text-sky-200 transition-colors"
                  >
                    <span className="truncate max-w-[180px]">{src.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Competition Header Banner */}
      <div
        className="rounded-2xl p-5 border shadow-2xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98))`,
          borderColor: compMeta.primaryColor + '40',
        }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none opacity-20"
          style={{ backgroundColor: compMeta.primaryColor }}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <CompetitionCrest meta={compMeta} size="xl" />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                <span className="font-bold" style={{ color: compMeta.primaryColor }}>
                  {compMeta.category === 'world'
                    ? 'FIFA · Mundial de Clubes / Intercontinental'
                    : compMeta.category === 'world_continental'
                    ? selectedComp === 'afc_champions'
                      ? 'AFC · Liga dos Campeões de Elite da Ásia'
                      : selectedComp === 'concacaf_champions'
                      ? 'CONCACAF · Copa dos Campeões'
                      : 'FIFA · Champions Internacional (Norte, Ásia & África)'
                    : compMeta.category === 'world_league'
                    ? `${selectedWlMeta?.confederationCode || 'FIFA'} · ${selectedWlMeta?.country || 'Internacional'} (${selectedWlMeta?.macroRegionLabel || ''})`
                    : compMeta.category === 'uefa_continental'
                    ? 'UEFA · Competição Continental'
                    : compMeta.category === 'europe'
                    ? `${selectedEuMeta?.federation || 'UEFA'} · ${selectedEuMeta?.country || 'Europa'} (${selectedEuMeta?.tier || 1}ª Divisão)`
                    : compMeta.category === 'continental'
                    ? 'CONMEBOL'
                    : compMeta.category === 'south_america'
                    ? `${selectedSaMeta?.federation || 'CONMEBOL'} · ${selectedSaMeta?.country || 'América do Sul'}`
                    : compMeta.category === 'state'
                    ? 'Federações & Regionais'
                    : 'CBF'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Edição{' '}
                  {compMeta.category === 'europe' ||
                  compMeta.category === 'uefa_continental' ||
                  selectedComp === 'afc_champions' ||
                  (isWorldLeague(selectedComp) && isSplitYearWorldLeague(selectedComp)) ||
                  (isWorldCup(selectedComp) && SPLIT_YEAR_WORLD_CUP_IDS.includes(selectedComp))
                    ? `${formatEuropeanSeason(europeSeasonYear ?? seasonYear)} (${
                        selectedComp === 'rus_premier' || selectedComp === 'wl_cup_rus'
                          ? 'Jul–Mai'
                          : 'Ago–Mai'
                      })`
                    : `${saSeasonYear ?? seasonYear} (Jan–Dez)`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300">{compMeta.formatSummary}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {compMeta.name}
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl mt-1">
                {compMeta.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSyncCompetitionOct2026Squads &&
              (selectedComp === 'serie_a' ||
                selectedComp === 'serie_b' ||
                selectedComp === 'serie_c' ||
                selectedComp === 'serie_d' ||
                Boolean(selectedSaMeta || selectedEuMeta || selectedWlMeta)) && (
                <button
                  type="button"
                  disabled={Boolean(syncingOct2026Target)}
                  onClick={() => {
                    soundEngine.playClick();
                    onSyncCompetitionOct2026Squads(selectedComp);
                  }}
                  title={`Pesquisar com IA os elencos reais de ${getCurrentRealWorldSyncPeriod().fullLabel} de todos os clubes desta liga (até 30 jogadores por time)`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-400/15 hover:bg-emerald-400/25 disabled:opacity-50 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      syncingOct2026Target === `comp:${selectedComp}` ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {syncingOct2026Target === `comp:${selectedComp}`
                      ? `Pesquisando Elencos ${getCurrentRealWorldSyncPeriod().shortLabel}...`
                      : `Liga ${getCurrentRealWorldSyncPeriod().shortLabel} IA`}
                  </span>
                </button>
              )}

            {onOpenOct2026GlobalSyncModal && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onOpenOct2026GlobalSyncModal();
                }}
                title={`Abrir Central IA para atualizar os elencos de todos os clubes do jogo (${getCurrentRealWorldSyncPeriod().fullLabel})`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-400/15 hover:bg-sky-400/25 border border-sky-400/40 text-sky-300 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Todos os Times ({getCurrentRealWorldSyncPeriod().shortLabel})</span>
              </button>
            )}

            {selectedWlMeta && onCalibrateWorldLeague && (
              <button
                type="button"
                disabled={Boolean(calibratingWlLeagueId)}
                onClick={() => {
                  soundEngine.playClick();
                  onCalibrateWorldLeague(selectedWlMeta.id);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 disabled:opacity-50 border border-amber-400/40 text-amber-300 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    calibratingWlLeagueId === selectedWlMeta.id ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {calibratingWlLeagueId === selectedWlMeta.id
                    ? 'Atualizando IA 2026...'
                    : 'Atualizar Liga com IA 2026'}
                </span>
              </button>
            )}

            {selectedEuMeta && onCalibrateEuropeLeague && (
              <button
                type="button"
                disabled={Boolean(calibratingEuLeagueId)}
                onClick={() => {
                  soundEngine.playClick();
                  onCalibrateEuropeLeague(selectedEuMeta.id);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-400/15 hover:bg-indigo-400/25 disabled:opacity-50 border border-indigo-400/40 text-indigo-300 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    calibratingEuLeagueId === selectedEuMeta.id ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {calibratingEuLeagueId === selectedEuMeta.id
                    ? 'Atualizando IA 2026...'
                    : 'Atualizar Liga com IA 2026'}
                </span>
              </button>
            )}

            {selectedSaMeta && onCalibrateSouthAmericaLeague && (
              <button
                type="button"
                disabled={Boolean(calibratingSaLeagueId)}
                onClick={() => {
                  soundEngine.playClick();
                  onCalibrateSouthAmericaLeague(selectedSaMeta.id);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-400/15 hover:bg-sky-400/25 disabled:opacity-50 border border-sky-400/40 text-sky-300 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    calibratingSaLeagueId === selectedSaMeta.id ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {calibratingSaLeagueId === selectedSaMeta.id
                    ? 'Calibrando com IA...'
                    : 'Calibrar Liga com IA'}
                </span>
              </button>
            )}

            {supportsCupDraw && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIsDrawModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {canGenerateActiveDraw
                    ? isActiveCompDrawn
                      ? 'Sortear / Rever Grupos'
                      : 'Gerar Sorteio'
                    : isActiveCompDrawn
                    ? 'Rever Sorteio Oficial'
                    : 'Sorteio ao Vivo'}
                </span>
              </button>
            )}

            {/* View Mode Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              {!isPureKnockoutComp(selectedComp) && (
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('table');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'table'
                      ? 'bg-sky-400 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>
                    {isUefaContinental(selectedComp)
                      ? 'Fase de Liga (36)'
                      : selectedComp === 'afc_champions'
                      ? 'Conferências (Oeste & Leste)'
                      : compMeta.isCup
                      ? 'Grupos'
                      : 'Tabela'}
                  </span>
                </button>
              )}

              {(compMeta.isCup ||
                selectedComp === 'eng_championship' ||
                selectedComp === 'eng_league_two' ||
                selectedComp === 'eng_league_one' ||
                selectedComp === 'ger_bundesliga' ||
                selectedComp === 'ger_bundesliga2' ||
                selectedComp === 'fra_ligue1' ||
                selectedComp === 'fra_ligue2' ||
                selectedComp === 'esp_laliga2' ||
                selectedComp === 'ita_serie_b' ||
                selectedComp === 'serie_b' ||
                selectedComp === 'serie_c' ||
                selectedComp === 'usa_mls') && (
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('bracket');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'bracket'
                      ? 'bg-sky-400 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>
                    {selectedComp === 'eng_championship'
                      ? 'Playoffs (3º–8º)'
                      : selectedComp === 'ita_serie_b'
                      ? 'Playoffs & Playout'
                      : selectedComp === 'eng_league_two' || selectedComp === 'serie_c'
                      ? 'Playoffs (4º–7º)'
                      : selectedComp === 'eng_league_one' ||
                        selectedComp === 'esp_laliga2' ||
                        selectedComp === 'serie_b'
                      ? 'Playoffs (3º–6º)'
                      : selectedComp === 'ger_bundesliga' || selectedComp === 'ger_bundesliga2'
                      ? 'Playoff (16º × 3º)'
                      : selectedComp === 'fra_ligue1' || selectedComp === 'fra_ligue2'
                      ? 'Play-offs & Barrage'
                      : selectedComp === 'usa_mls'
                      ? 'Playoffs (MLS Cup)'
                      : 'Mata-Mata'}
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  soundEngine.playClick();
                  if (selectedComp === 'estadual') {
                    setOverallRankingMode('estaduais');
                  } else if (selectedComp === 'serie_d') {
                    setOverallRankingMode('serie_d');
                  }
                  setActiveTab('overall_ranking');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'overall_ranking'
                    ? 'bg-rose-400 text-slate-950 font-black shadow'
                    : 'text-rose-300/90 hover:text-rose-200'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Classificação Geral</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('world_spots');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'world_spots'
                    ? 'bg-emerald-400 text-slate-950 font-black shadow'
                    : 'text-emerald-300/90 hover:text-emerald-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Vagas Internacionais & Mundial</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('uefa_spots');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'uefa_spots'
                    ? 'bg-indigo-400 text-slate-950 font-black shadow'
                    : 'text-indigo-300/90 hover:text-indigo-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Vagas UEFA</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('conmebol_spots');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'conmebol_spots'
                    ? 'bg-amber-400 text-slate-950 font-black shadow'
                    : 'text-amber-300/90 hover:text-amber-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Vagas CONMEBOL</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('stats');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'stats'
                    ? 'bg-sky-400 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                  }`}
                >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Estatísticas</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('totw');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'totw'
                    ? 'bg-sky-400 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                  }`}
                >
                <Star className="w-3.5 h-3.5" />
                <span>Seleção da Rodada</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('fixtures');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'fixtures'
                    ? 'bg-sky-400 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                  }`}
                >
                <Calendar className="w-3.5 h-3.5" />
                <span>Confrontos</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {canGenerateActiveDraw && !isActiveCompDrawn && (
        <div className="bg-amber-500/10 border border-amber-400/35 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                Classificados Definidos · Sorteio de Grupos e Chaves Disponível
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {compMeta.name} ainda não teve o sorteio oficial realizado nesta temporada. Gere o sorteio dos potes para definir os grupos e confrontos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setIsDrawModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerar Sorteio dos Grupos / Chaves</span>
          </button>
        </div>
      )}

      {/* TAB: Table / Groups */}
      {activeTab === 'table' && (
        <div className="space-y-6">
          {/* For Estaduais: Macro-Region & 27-State Tournament Switcher */}
          {renderEstadualSelectorBar()}

          {/* Active Estadual Official Format, Prizes & CBF Berths Summary Header */}
          {selectedComp === 'estadual' && activeEstadualCfg && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold text-teal-400 tabular-nums">
                    {activeEstadualCfg.federation} · RNF #{activeEstadualCfg.rnfRank} · Região {activeEstadualCfg.region} · UF {activeEstadualCfg.uf} · Temporada {saSeasonYear ?? seasonYear}
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    {activeEstadualCfg.name}
                  </h2>
                  <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                    {activeEstadualCfg.formatSummary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Prêmio Campeão</span>
                    <strong className="text-emerald-400">
                      {formatCompactPrize(activeEstadualCfg.championPrize)}
                    </strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Vagas Série D</span>
                    <strong className="text-sky-400">{activeEstadualCfg.serieDSpots} vagas</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Copa do Brasil</span>
                    <strong className="text-amber-400">
                      {activeEstadualCfg.copaBrasilSpots} vagas
                    </strong>
                  </div>
                  {activeEstadualCfg.copaNordesteSpots > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Copa do Nordeste</span>
                      <strong className="text-orange-300">
                        {activeEstadualCfg.copaNordesteSpots} vagas
                      </strong>
                    </div>
                  )}
                  {activeEstadualCfg.copaVerdeSpots > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">
                        Copa Verde ({activeEstadualCfg.copaVerdeBlock || 'Regional'})
                      </span>
                      <strong className="text-emerald-300">
                        {activeEstadualCfg.copaVerdeSpots}{' '}
                        {activeEstadualCfg.copaVerdeSpots === 1 ? 'vaga' : 'vagas'}
                      </strong>
                    </div>
                  )}
                  {activeEstadualCfg.copaSulSudesteSpots > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Copa Sul-Sudeste</span>
                      <strong className="text-violet-300">
                        {activeEstadualCfg.copaSulSudesteSpots} vagas
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {(groupedStandings[activeEstadualGroup] || []).some((s) => Boolean(s.subGroup)) && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">
                    Visualização da 1ª Fase ({activeEstadualCfg.firstPhaseRounds} rodadas):
                  </span>
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setEstadualTableMode('GROUPS');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        estadualTableMode === 'GROUPS'
                          ? 'bg-teal-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tabelas por Grupo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setEstadualTableMode('OVERALL');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        estadualTableMode === 'OVERALL'
                          ? 'bg-teal-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Classificação Geral
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Multi-group competitions: Série D, Libertadores, Sul-Americana, Copa do Nordeste, Copa Verde, Champions Internacional FIFA, Super Mundial 32, Estaduais */}
          {(selectedComp === 'serie_d' ||
            selectedComp === 'copa_nordeste' ||
            selectedComp === 'copa_verde' ||
            selectedComp === 'libertadores' ||
            selectedComp === 'sulamericana' ||
            selectedComp === 'copa_internacional' ||
            selectedComp === 'afc_champions' ||
            (selectedComp === 'super_mundial_clubes' && currentStandings.length > 0) ||
            selectedComp === 'estadual' ||
            (isUefaContinental(selectedComp) &&
              currentStandings.some((s) => (s.group || '').startsWith('Grupo ')))) ? (
            (() => {
              // Build table panels: if Estadual has subGroups and GROUPS mode is active, split into Grupo A / B / C!
              const rawEntries = Object.entries(groupedStandings).filter(([gName]) => {
                if (selectedComp !== 'estadual') return true;
                return gName === activeEstadualGroup;
              });

              const tablePanels: Array<{
                panelKey: string;
                title: string;
                rows: Standing[];
                qualifyCount: number;
                qualifyLabel: string;
              }> = [];

              for (const [groupName, groupSts] of rawEntries) {
                const estCfg =
                  selectedComp === 'estadual' ? getEstadualConfigByName(groupName) : undefined;
                const hasSubGroups =
                  selectedComp === 'estadual' &&
                  estadualTableMode === 'GROUPS' &&
                  groupSts.some((s) => Boolean(s.subGroup));

                if (hasSubGroups && estCfg) {
                  const subNames = Array.from(
                    new Set(groupSts.map((s) => s.subGroup || 'Grupo A'))
                  ).sort();
                  const perSubQualify =
                    estCfg.knockoutModel === 'THREE_GROUPS_BEST2_SF'
                      ? 1
                      : estCfg.knockoutModel === 'TWO_GROUPS_TOP1_BYE_2TO3_QF'
                      ? 3
                      : 4;
                  const perSubLabel =
                    estCfg.knockoutModel === 'THREE_GROUPS_BEST2_SF'
                      ? 'Líder avança à Semifinal (+ melhor 2º geral)'
                      : estCfg.knockoutModel === 'TWO_GROUPS_TOP1_BYE_2TO3_QF'
                      ? 'Top 3 avançam (1º na Semi, 2º e 3º nas Quartas)'
                      : 'Top 4 do grupo avançam às Quartas de Final';

                  for (const sName of subNames) {
                    const subRows = groupSts
                      .filter((s) => (s.subGroup || 'Grupo A') === sName)
                      .sort(
                        (a, b) =>
                          b.points - a.points ||
                          b.won - a.won ||
                          b.goalDifference - a.goalDifference ||
                          b.goalsFor - a.goalsFor
                      );
                    tablePanels.push({
                      panelKey: `${groupName}__${sName}`,
                      title: `${estCfg.shortName} · ${sName}`,
                      rows: subRows,
                      qualifyCount: perSubQualify,
                      qualifyLabel: perSubLabel,
                    });
                  }
                } else if (estCfg) {
                  const overallQualify =
                    estCfg.knockoutModel === 'TOP8_OVERALL_QF' ||
                    estCfg.knockoutModel === 'TOP4_PER_GROUP_QF'
                      ? 8
                      : estCfg.knockoutModel === 'TOP1_BYE_2TO7_QF'
                      ? 7
                      : estCfg.knockoutModel === 'TOP2_BYE_3TO6_QF' ||
                        estCfg.knockoutModel === 'TWO_GROUPS_TOP1_BYE_2TO3_QF'
                      ? 6
                      : 4;
                  const overallLabel =
                    estCfg.uf === 'RN'
                      ? '12 clubes · 11 rodadas · Top 8 Quartas (Ida e Volta) · Top 2 Série D & Nordestão · Top 3 CdB'
                      : `${groupSts.length} clubes · ${estCfg.firstPhaseRounds} rodadas · Top ${overallQualify} avançam ao Mata-Mata`;
                  tablePanels.push({
                    panelKey: groupName,
                    title: groupName,
                    rows: groupSts,
                    qualifyCount: overallQualify,
                    qualifyLabel: overallLabel,
                  });
                } else {
                  const isCne4Groups =
                    selectedComp === 'copa_nordeste' && groupSts.length <= 5;
                  const isCv4Groups =
                    selectedComp === 'copa_verde' && groupSts.length <= 6;
                  const qCount =
                    selectedComp === 'afc_champions'
                      ? 8
                      : selectedComp === 'sulamericana'
                      ? 1
                      : isCne4Groups || isCv4Groups
                      ? 2
                      : selectedComp === 'serie_d' ||
                        selectedComp === 'copa_nordeste' ||
                        selectedComp === 'copa_verde'
                      ? 4
                      : 2;
                  const qLabel =
                    selectedComp === 'afc_champions'
                      ? '16 clubes · 8 rodadas (4C/4F) · Top 8 avançam às Oitavas'
                      : selectedComp === 'libertadores'
                      ? '4 clubes · 1º–2º Oitavas · 3º Playoff Sul-Americana'
                      : selectedComp === 'sulamericana'
                      ? '4 clubes · 1º Oitavas Direto · 2º Playoff (vs 3º Lib)'
                      : isCne4Groups
                      ? '5 clubes · 8 jogos (Turno e Returno) · Top 2 avançam às Quartas (Ida e Volta)'
                      : isCv4Groups
                      ? '6 clubes · 5 rodadas · Top 2 avançam às Semifinais Regionais (Ida e Volta)'
                      : selectedComp === 'copa_nordeste' || selectedComp === 'copa_verde'
                      ? '8 clubes · Top 4 avançam às Quartas (Ida e Volta)'
                      : selectedComp === 'serie_d'
                      ? '6 clubes (máx. 3/UF) · 10 rodadas · Top 4 avançam'
                      : '4 clubes · Top 2 avançam às Oitavas';
                  tablePanels.push({
                    panelKey: groupName,
                    title: groupName,
                    rows: groupSts,
                    qualifyCount: qCount,
                    qualifyLabel: qLabel,
                  });
                }
              }

              const gridColsClass =
                selectedComp === 'estadual'
                  ? tablePanels.length >= 3
                    ? 'grid grid-cols-1 lg:grid-cols-3 gap-5'
                    : tablePanels.length === 2
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                    : 'grid grid-cols-1 gap-6'
                  : 'grid grid-cols-1 md:grid-cols-2 gap-6';

              return (
                <div className="space-y-6">
                  <div className={gridColsClass}>
                    {tablePanels.map((panel) => {
                      const isPotiguar =
                        selectedComp === 'estadual' && panel.title === 'Campeonato Potiguar (RN)';
                      return (
                        <div
                          key={panel.panelKey}
                          className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
                        >
                          <div className="p-3 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                            <span className="font-extrabold text-white text-xs flex items-center gap-2">
                              <CompetitionCrest meta={compMeta} size="xs" />
                              <span>{panel.title}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                              {panel.qualifyLabel}
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-black/60 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800/80">
                                <tr>
                                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                                  <th className="py-2.5 px-3">Clube</th>
                                  <th className="py-2.5 px-2 text-center text-sky-400 font-black">P</th>
                                  <th className="py-2.5 px-2 text-center">J</th>
                                  <th className="py-2.5 px-2 text-center">V</th>
                                  <th className="py-2.5 px-2 text-center">E</th>
                                  <th className="py-2.5 px-2 text-center">D</th>
                                  <th className="py-2.5 px-2 text-center">SG</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                {panel.rows.map((st, idx) => {
                                  const club = clubs.find((c) => c.id === st.teamId);
                                  if (!club) return null;
                                  const pos = idx + 1;
                                  const isQualified = idx < panel.qualifyCount;
                                  const isLibPlayoffSula = selectedComp === 'libertadores' && pos === 3;
                                  const isSulaPlayoff = selectedComp === 'sulamericana' && pos === 2;
                                  const posBadgeClass = isPotiguar
                                    ? pos <= 2
                                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                                      : pos === 3
                                      ? 'bg-sky-400/20 text-sky-300 border border-sky-400/50'
                                      : pos <= 8
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'text-slate-500'
                                    : isQualified
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : isLibPlayoffSula
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : isSulaPlayoff
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'text-slate-500';
                                  const cutoffBorder =
                                    pos === panel.qualifyCount && pos < panel.rows.length
                                      ? 'border-b-2 border-emerald-500/40'
                                      : isLibPlayoffSula && pos < panel.rows.length
                                      ? 'border-b-2 border-cyan-500/40'
                                      : isSulaPlayoff && pos < panel.rows.length
                                      ? 'border-b-2 border-amber-500/40'
                                      : '';

                                  return (
                                    <tr
                                      key={st.teamId}
                                      className={`transition-colors ${cutoffBorder} ${
                                        club.id === userClub.id ? 'bg-sky-500/10' : 'hover:bg-slate-900/40'
                                      }`}
                                    >
                                      <td className="py-2 px-3 text-center font-bold">
                                        <span
                                          className={`inline-flex w-5 h-5 rounded-md items-center justify-center text-[10px] font-black tabular-nums ${posBadgeClass}`}
                                        >
                                          {pos}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (onInspectClub) {
                                              soundEngine.playClick();
                                              onInspectClub(club.id);
                                            }
                                          }}
                                          title="Ver elenco, tática e estruturas do clube"
                                          className={`flex items-center gap-2 text-left group ${
                                            onInspectClub ? 'cursor-pointer' : ''
                                          }`}
                                        >
                                          <ClubCrest club={club} size="xs" rounded="md" />
                                          <span
                                            className={`font-bold truncate ${
                                              club.id === userClub.id
                                                ? 'text-sky-300'
                                                : 'text-white group-hover:text-sky-300 transition-colors'
                                            }`}
                                          >
                                            {club.name}
                                          </span>
                                          {club.division === 'EU' ||
                                          club.division === 'SA' ||
                                          club.division === 'WL' ? (
                                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                              {club.country}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                              {club.division === 'EST'
                                                ? club.state
                                                : `${club.state} · Série ${club.division}`}
                                            </span>
                                          )}
                                          {isPotiguar && pos <= 2 && (
                                            <span className="hidden sm:inline text-[10px] font-semibold text-amber-300/90 shrink-0">
                                              · G-2 Nordestão + Série D + CdB
                                            </span>
                                          )}
                                          {isPotiguar && pos === 3 && (
                                            <span className="hidden sm:inline text-[10px] font-semibold text-sky-300/90 shrink-0">
                                              · G-3 Copa do Brasil
                                            </span>
                                          )}
                                          {isLibPlayoffSula && (
                                            <span className="hidden sm:inline text-[10px] font-semibold text-cyan-300/90 shrink-0">
                                              · Playoff Sul-Americana
                                            </span>
                                          )}
                                          {isSulaPlayoff && (
                                            <span className="hidden sm:inline text-[10px] font-semibold text-amber-300/90 shrink-0">
                                              · Playoff vs 3º Lib
                                            </span>
                                          )}
                                        </button>
                                      </td>
                                      <td className="py-2 px-2 text-center font-black text-sky-400 font-mono tabular-nums">
                                        {st.points}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono tabular-nums text-slate-300">
                                        {st.played}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono tabular-nums text-slate-400">
                                        {st.won}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono tabular-nums text-slate-400">
                                        {st.drawn}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono tabular-nums text-slate-400">
                                        {st.lost}
                                      </td>
                                      <td
                                        className={`py-2 px-2 text-center font-mono tabular-nums font-bold ${
                                          st.goalDifference > 0
                                            ? 'text-emerald-400'
                                            : st.goalDifference < 0
                                            ? 'text-rose-400'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        {st.goalDifference > 0
                                          ? `+${st.goalDifference}`
                                          : st.goalDifference}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedComp === 'libertadores' && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-300 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <span className="font-black text-white text-sm">
                          🌎 Regulamento Oficial · Fase de Grupos da Libertadores ({saSeasonYear ?? seasonYear})
                        </span>
                        <span className="text-[11px] font-mono text-amber-300">
                          32 Clubes · 8 Grupos (A–H) · 6 Rodadas (Turno e Returno)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <div className="font-bold text-emerald-300 mb-1">1º e 2º Lugar · Oitavas da Libertadores</div>
                          <p className="text-slate-300">
                            Os 2 primeiros colocados de cada grupo (16 clubes) avançam às Oitavas de Final da Libertadores em confrontos de ida e volta. Os líderes de grupo decidem o jogo de volta em casa.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                          <div className="font-bold text-cyan-300 mb-1">3º Lugar · Playoffs da Sul-Americana</div>
                          <p className="text-slate-300">
                            Os 8 terceiros colocados dos grupos não são eliminados do continente: são transferidos para disputar os Playoffs da Copa Sul-Americana (ida e volta) contra os 8 segundos colocados da Sul-Americana.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <div className="font-bold text-slate-200 mb-1">4º Lugar · Eliminado</div>
                          <p className="text-slate-400">
                            O último colocado de cada chave encerra sua participação nas competições continentais da temporada.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedComp === 'sulamericana' && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-300 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <span className="font-black text-white text-sm">
                          🌐 Regulamento Oficial · Fase de Grupos da Sul-Americana ({saSeasonYear ?? seasonYear})
                        </span>
                        <span className="text-[11px] font-mono text-cyan-300">
                          32 Clubes · 8 Grupos (A–H) · 6 Rodadas (Turno e Returno)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <div className="font-bold text-emerald-300 mb-1">1º Lugar · Oitavas de Final Direto</div>
                          <p className="text-slate-300">
                            Apenas o líder de cada grupo (8 clubes) avança diretamente às Oitavas de Final da Sul-Americana, aguardando os vencedores dos Playoffs e decidindo a volta em casa.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <div className="font-bold text-amber-300 mb-1">2º Lugar · Playoffs vs 3º da Libertadores</div>
                          <p className="text-slate-300">
                            Os 8 segundos colocados enfrentam os 8 terceiros colocados dos grupos da Libertadores em jogos de ida e volta (2º da Sul-Americana decide em casa). Os 8 vencedores vão às Oitavas.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <div className="font-bold text-slate-200 mb-1">3º e 4º Lugar · Eliminados</div>
                          <p className="text-slate-400">
                            Os dois últimos colocados de cada grupo encerram sua campanha continental na fase de grupos.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedComp === 'serie_d' && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-300 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <span className="font-black text-white text-sm">
                          🏅 Regulamento Oficial · Brasileirão Série D ({saSeasonYear ?? seasonYear})
                        </span>
                        <span className="text-[11px] font-mono text-rose-300">
                          96 Clubes · 16 Grupos A01–A16 · 04/04 a 12/09 · 4 Acessos à Série C
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <div className="font-bold text-white mb-1">1. Grupos Regionalizados (Norte → Sul)</div>
                          <p className="text-slate-400">
                            16 grupos de 6 equipes (A01–A16) em turno e returno (10 rodadas), respeitando proximidade geográfica e limite máximo de 3 clubes do mesmo estado por chave. Os 4 melhores avançam (64 classificados).
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <div className="font-bold text-white mb-1">2. Mata-Mata &amp; Re-ranqueamento Geral</div>
                          <p className="text-slate-400">
                            2ª Fase com cruzamento olímpico entre grupos vizinhos (A01×A02..A15×A16). 3ª Fase (32 clubes garantem vaga no ano seguinte) e Oitavas em chave fixa. Quartas (1º×8º..4º×5º) e Semifinais (1º×4º, 2º×3º) re-ranqueadas pela campanha geral acumulada.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <div className="font-bold text-white mb-1">3. Acesso, Copa do Brasil &amp; Vagas (96)</div>
                          <p className="text-slate-400">
                            Os 4 semifinalistas sobem à Série C e o campeão entra direto na 3ª Fase da Copa do Brasil. Vagas anuais: 4 rebaixados da Série C + 64 via Estaduais (SP: 4; RJ/MG/RS/PR/CE/GO/SC/BA: 3; demais 18 UFs: 2) + 26 da 3ª Fase anterior + 2 pelo RNC.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedComp === 'afc_champions' && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-300 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <span className="font-black text-white text-sm">
                          🐉 Regulamento Oficial · Liga dos Campeões de Elite da AFC ({formatEuropeanSeason(europeSeasonYear ?? seasonYear)})
                        </span>
                        <span className="text-[11px] font-mono text-amber-300">
                          32 Clubes · 2 Conferências · Final em 01/05 na Arábia Saudita
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <div className="font-bold text-white mb-1">1. Fase de Liga (Ago–Fev · 8 Jogos)</div>
                          <p className="text-slate-400">
                            Conferência Oeste (16) e Conferência Leste (16) separadas. Cada clube enfrenta 8 adversários distintos da própria conferência (4 em casa e 4 fora). Os 8 melhores de cada lado avançam.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <div className="font-bold text-white mb-1">2. Oitavas (Mar) &amp; Finais na Arábia Saudita (Abr–Mai)</div>
                          <p className="text-slate-400">
                            Oitavas ida e volta na conferência (1ºx8º, 4ºx5º, 2ºx7º, 3ºx6º; sem gol fora). Quartas, Semis e Grande Final (01/05) em jogo único centralizado em Jeddah e Riyadh.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <div className="font-bold text-white mb-1">3. Classificação 2027/28+ &amp; Mundial FIFA</div>
                          <p className="text-slate-400">
                            Oeste recebe 5 da Arábia Saudita + 4 da Rússia + 7 convidados; Leste recebe 5 do Japão + 11 convidados. Campeão vai à Copa Intercontinental FIFA (Dez) e ao Super Mundial.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live CBF National & Regional Berth Distribution Panel for the Selected Estadual */}
                  {selectedComp === 'estadual' &&
                    activeEstadualCfg &&
                    activeEstadualClassification && (
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                          <div>
                            <div className="text-[11px] font-mono font-bold text-emerald-400">
                              CBF · Distribuição Oficial de Vagas Nacionais & Regionais
                            </div>
                            <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                              Classificados de {activeEstadualCfg.shortName} para a Próxima Temporada
                            </h3>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                            RNF #{activeEstadualCfg.rnfRank} · Se um clube já tem vaga por outro mérito (Série A/B/C, CONMEBOL, título ou 3ª Fase Série D), a vaga estadual passa ao próximo melhor colocado
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Série D Berths */}
                          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <strong className="text-sky-300 font-extrabold">
                                Brasileirão Série D
                              </strong>
                              <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                                {activeEstadualCfg.serieDSpots} vaga(s)
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {activeEstadualClassification.serieDQualifiedIds.map((cid, idx) => {
                                const cObj = clubsByIdMap.get(cid);
                                if (!cObj) return null;
                                return (
                                  <button
                                    key={cid}
                                    type="button"
                                    onClick={() => onInspectClub?.(cObj.id)}
                                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-xs cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <ClubCrest club={cObj} size="xs" rounded="md" />
                                      <span className="font-bold text-white truncate">
                                        {cObj.shortName}
                                      </span>
                                    </div>
                                    <span className="font-mono tabular-nums text-[10px] text-sky-400 shrink-0">
                                      Vaga #{idx + 1}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Copa do Brasil Berths */}
                          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <strong className="text-amber-300 font-extrabold">
                                Copa do Brasil
                              </strong>
                              <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                                {activeEstadualCfg.copaBrasilSpots} vaga(s)
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {activeEstadualClassification.copaBrasilIds.map((cid, idx) => {
                                const cObj = clubsByIdMap.get(cid);
                                if (!cObj) return null;
                                return (
                                  <button
                                    key={cid}
                                    type="button"
                                    onClick={() => onInspectClub?.(cObj.id)}
                                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-xs cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <ClubCrest club={cObj} size="xs" rounded="md" />
                                      <span className="font-bold text-white truncate">
                                        {cObj.shortName}
                                      </span>
                                    </div>
                                    <span className="font-mono tabular-nums text-[10px] text-amber-300 shrink-0">
                                      {idx === 0 ? 'Campeão / 1º' : `Vaga #${idx + 1}`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Regional Cup Berths (Copa do Nordeste / Copa Verde / Copa Sul-Sudeste) */}
                          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                            {activeEstadualCfg.copaNordesteSpots > 0 ? (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <strong className="text-orange-300 font-extrabold">
                                    Copa do Nordeste
                                  </strong>
                                  <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                                    {activeEstadualCfg.copaNordesteSpots} vaga(s)
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {activeEstadualClassification.copaNordesteIds.map((cid, idx) => {
                                    const cObj = clubsByIdMap.get(cid);
                                    if (!cObj) return null;
                                    return (
                                      <button
                                        key={cid}
                                        type="button"
                                        onClick={() => onInspectClub?.(cObj.id)}
                                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-xs cursor-pointer transition-colors"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <ClubCrest club={cObj} size="xs" rounded="md" />
                                          <span className="font-bold text-white truncate">
                                            {cObj.shortName}
                                          </span>
                                        </div>
                                        <span className="font-mono tabular-nums text-[10px] text-orange-300 shrink-0">
                                          Nordestão #{idx + 1}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            ) : activeEstadualCfg.copaVerdeSpots > 0 ? (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <strong className="text-emerald-300 font-extrabold">
                                    Copa Verde · {activeEstadualCfg.copaVerdeBlock || 'Regional'}
                                  </strong>
                                  <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                                    {activeEstadualCfg.copaVerdeSpots} vaga(s)
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {activeEstadualClassification.copaVerdeIds.map((cid, idx) => {
                                    const cObj = clubsByIdMap.get(cid);
                                    if (!cObj) return null;
                                    return (
                                      <button
                                        key={cid}
                                        type="button"
                                        onClick={() => onInspectClub?.(cObj.id)}
                                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-xs cursor-pointer transition-colors"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <ClubCrest club={cObj} size="xs" rounded="md" />
                                          <span className="font-bold text-white truncate">
                                            {cObj.shortName}
                                          </span>
                                        </div>
                                        <span className="font-mono tabular-nums text-[10px] text-emerald-300 shrink-0">
                                          Copa Verde #{idx + 1}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <strong className="text-violet-300 font-extrabold">
                                    Copa Sul-Sudeste
                                  </strong>
                                  <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                                    {activeEstadualCfg.copaSulSudesteSpots} vaga(s)
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {activeEstadualClassification.copaSulSudesteIds.map((cid, idx) => {
                                    const cObj = clubsByIdMap.get(cid);
                                    if (!cObj) return null;
                                    return (
                                      <button
                                        key={cid}
                                        type="button"
                                        onClick={() => onInspectClub?.(cObj.id)}
                                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-xs cursor-pointer transition-colors"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <ClubCrest club={cObj} size="xs" rounded="md" />
                                          <span className="font-bold text-white truncate">
                                            {cObj.shortName}
                                          </span>
                                        </div>
                                        <span className="font-mono tabular-nums text-[10px] text-violet-300 shrink-0">
                                          Sul-Sudeste #{idx + 1}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {activeEstadualClassification.repassedBerths.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                            <span className="text-emerald-400 font-bold">Vagas repassadas por outro mérito: </span>
                            {activeEstadualClassification.repassedBerths
                              .slice(0, 6)
                              .map((rep, idx) => {
                                const cObj = clubsByIdMap.get(rep.skippedClubId);
                                const compLabel =
                                  rep.competition === 'copa_brasil'
                                    ? 'Copa do Brasil'
                                    : rep.competition === 'serie_d'
                                    ? 'Série D'
                                    : rep.competition === 'copa_nordeste'
                                    ? 'Copa NE'
                                    : rep.competition === 'copa_verde'
                                    ? 'Copa Verde'
                                    : 'Sul-Sudeste';
                                return `${idx > 0 ? ' · ' : ''}${cObj?.shortName || rep.skippedClubId} (${compLabel} → ${rep.reason})`;
                              })
                              .join('')}
                            {activeEstadualClassification.repassedBerths.length > 6
                              ? ` e +${activeEstadualClassification.repassedBerths.length - 6} repasse(s)`
                              : ''}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })()
          ) : selectedComp === 'super_mundial_clubes' && currentStandings.length === 0 ? (
            /* Non-host cycle year (e.g. 2026-2028): Show Live 32 Projected FIFA Club World Cup Qualifiers */
            (() => {
              const nextEditionYear = getNextSuperClubWorldCupYear(seasonYear);
              const isHostYear = isSuperClubWorldCupYear(seasonYear);
              return (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-5 bg-black/80 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        Ciclo Quadrienal FIFA (De 4 em 4 anos) · Próxima Edição: Junho–Julho {nextEditionYear}
                      </div>
                      <h3 className="text-lg font-black text-white mt-0.5">
                        Ranking em Tempo Real · 32 Clubes Classificados ao Super Mundial FIFA {nextEditionYear}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {isHostYear
                          ? `Edição ${seasonYear} pronta para disputa de 8 grupos (A–H) e mata-mata até a Grande Final!`
                          : `O Super Mundial de 32 times é disputado de 4 em 4 anos (${nextEditionYear}, ${
                              nextEditionYear + 4
                            }...). Confira os 32 clubes que hoje carimbariam vaga pelas cotas oficiais FIFA:`}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px] font-mono tabular-nums shrink-0">
                      {[
                        { conf: 'UEFA', spots: '12 vagas' },
                        { conf: 'CONMEBOL', spots: '6 vagas' },
                        { conf: 'CONCACAF', spots: '4 vagas' },
                        { conf: 'AFC / Ásia', spots: '4 vagas' },
                        { conf: 'CAF África', spots: '4 vagas' },
                        { conf: 'FIFA / Sede', spots: '2 vagas' },
                      ].map((q) => (
                        <div key={q.conf} className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                          <div className="font-bold text-white">{q.conf}</div>
                          <div className="text-amber-300 text-[10px]">{q.spots}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black/60 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Clube Classificado</th>
                          <th className="py-2.5 px-3">País</th>
                          <th className="py-2.5 px-3">Confederação</th>
                          <th className="py-2.5 px-3">Critério de Vaga FIFA</th>
                          <th className="py-2.5 px-3 text-right">Força</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {superMundialProjected.map((q, idx) => {
                          const club = clubs.find((c) => c.id === q.clubId);
                          if (!club) return null;
                          const sec = getClubSectorRatings(club);
                          const isUser = club.id === userClub.id;
                          return (
                            <tr
                              key={q.clubId}
                              className={isUser ? 'bg-sky-500/10' : 'hover:bg-slate-900/40'}
                            >
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => onInspectClub && onInspectClub(club.id)}
                                  className="flex items-center gap-2 text-left cursor-pointer group"
                                >
                                  <ClubCrest club={club} size="xs" rounded="md" />
                                  <span
                                    className={`font-bold ${
                                      isUser ? 'text-sky-300' : 'text-white group-hover:text-sky-300'
                                    }`}
                                  >
                                    {club.name}
                                  </span>
                                </button>
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">{q.country}</td>
                              <td className="py-2.5 px-3 font-mono text-sky-300">{q.confederation}</td>
                              <td className="py-2.5 px-3 text-slate-400">{q.qualificationMethod}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-white tabular-nums">
                                OVR {sec.overall}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()
          ) : selectedComp === 'usa_mls' ? (
            (() => {
              const overallSorted = sortMlsStandings(currentStandings, currentFixtures);
              const eastRaw = currentStandings.filter(
                (st) =>
                  st.group === 'Conferência Leste' ||
                  MLS_CONFERENCE_BY_CLUB_ID[st.teamId] === 'Leste'
              );
              const westRaw = currentStandings.filter(
                (st) =>
                  st.group === 'Conferência Oeste' ||
                  MLS_CONFERENCE_BY_CLUB_ID[st.teamId] === 'Oeste'
              );
              const eastSorted = sortMlsStandings(eastRaw, currentFixtures);
              const westSorted = sortMlsStandings(westRaw, currentFixtures);
              const shieldLeaderId = overallSorted[0]?.teamId;
              const mlsCupChampId = resolveMlsCupChampionId(currentFixtures);
              const wlQual = selectedWlMeta ? worldReport.byLeague[selectedWlMeta.id] : undefined;
              const wlIntClubSet = new Set(wlQual?.internationalIds || []);

              const renderMlsTableBlock = (
                title: string,
                subtitle: string,
                rows: Standing[],
                isOverall: boolean
              ) => (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-4 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <h3 className="font-black text-white text-sm flex items-center gap-2">
                        <CompetitionCrest meta={compMeta} size="xs" />
                        <span>{title}</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-400">
                      {!isOverall ? (
                        <>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Playoffs (1º–7º)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" /> Wild Card (8º–9º)
                          </span>
                          <span className="text-slate-500">10º–15º Eliminado · Sem Rebaixamento</span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-amber-400" /> Supporters&apos; Shield (#1)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Champions Int. / Playoffs
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-xs">
                      <thead className="bg-black text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Clube</th>
                          {isOverall && (
                            <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Conf.</th>
                          )}
                          <th className="py-2.5 px-2.5 text-center whitespace-nowrap">OVR</th>
                          <th className="py-2.5 px-2.5 text-center font-bold text-sky-300">P</th>
                          <th className="py-2.5 px-2 text-center">J</th>
                          <th className="py-2.5 px-2 text-center">V</th>
                          <th className="py-2.5 px-2 text-center">E</th>
                          <th className="py-2.5 px-2 text-center">D</th>
                          <th className="py-2.5 px-2 text-center">GP</th>
                          <th className="py-2.5 px-2 text-center">GC</th>
                          <th className="py-2.5 px-2 text-center">SG</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap">Forma</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {rows.map((st, idx) => {
                          const club = clubs.find((c) => c.id === st.teamId);
                          if (!club) return null;
                          const pos = idx + 1;
                          const isUser = club.id === userClub.id;
                          const sectors = getClubSectorRatings(club);
                          const conf = MLS_CONFERENCE_BY_CLUB_ID[club.id];
                          const meta = MLS_META_BY_CLUB_ID[club.id];
                          const isShield = club.id === shieldLeaderId && st.played > 0;
                          const isMlsChamp = club.id === mlsCupChampId;
                          const isInt = wlIntClubSet.has(club.id);

                          let zoneBadge = 'text-slate-400 bg-slate-900';
                          if (isOverall) {
                            if (pos === 1) zoneBadge = 'text-slate-950 bg-amber-400 font-black';
                            else if (isInt) zoneBadge = 'text-slate-950 bg-emerald-400 font-black';
                          } else {
                            if (pos <= 7) zoneBadge = 'text-slate-950 bg-emerald-400 font-black';
                            else if (pos <= 9) zoneBadge = 'text-slate-950 bg-sky-400 font-black';
                          }

                          const cutoffClass = !isOverall
                            ? pos === 7
                              ? 'border-b-2 border-emerald-500/50'
                              : pos === 9
                              ? 'border-b-2 border-sky-500/50'
                              : ''
                            : pos === 1
                            ? 'border-b-2 border-amber-500/40'
                            : '';

                          return (
                            <tr
                              key={st.teamId}
                              className={`transition-colors ${cutoffClass} ${
                                isUser ? 'bg-sky-500/10 font-bold' : 'hover:bg-slate-900/50'
                              }`}
                            >
                              <td className="py-2.5 px-2.5 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs tabular-nums ${zoneBadge}`}
                                >
                                  {pos}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onInspectClub) {
                                      soundEngine.playClick();
                                      onInspectClub(club.id);
                                    }
                                  }}
                                  className={`flex items-center gap-2.5 text-left group ${
                                    onInspectClub ? 'cursor-pointer' : ''
                                  }`}
                                >
                                  <ClubCrest club={club} size="sm" rounded="md" />
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={`truncate ${
                                          isUser
                                            ? 'text-sky-300 font-black'
                                            : 'text-white group-hover:text-sky-300 transition-colors'
                                        }`}
                                      >
                                        {club.name}
                                      </span>
                                      {isMlsChamp && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black">
                                          🏆 MLS Cup
                                        </span>
                                      )}
                                      {isShield && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-400/15 text-sky-300 border border-sky-400/30 font-bold">
                                          🛡️ Shield
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                      {meta?.city || club.country || ''}
                                      {club.managerName ? ` · Téc. ${club.managerName}` : ''}
                                    </div>
                                  </div>
                                </button>
                              </td>
                              {isOverall && (
                                <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      conf === 'Leste'
                                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    }`}
                                  >
                                    {conf === 'Leste' ? 'Leste' : 'Oeste'}
                                  </span>
                                </td>
                              )}
                              <td className="py-2.5 px-2.5 text-center font-mono tabular-nums font-bold text-slate-300 whitespace-nowrap">
                                {sectors.overall}
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-black text-sky-400 font-mono text-sm tabular-nums">
                                {st.points}
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-200">
                                {st.played}
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-300">
                                {st.won}
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                                {st.drawn}
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                                {st.lost}
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-300">
                                {st.goalsFor}
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                                {st.goalsAgainst}
                              </td>
                              <td
                                className={`py-2.5 px-2 text-center font-mono tabular-nums font-bold ${
                                  st.goalDifference > 0
                                    ? 'text-emerald-400'
                                    : st.goalDifference < 0
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {st.goalDifference > 0 ? `+${st.goalDifference}` : st.goalDifference}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-0.5">
                                  {st.form.length === 0 ? (
                                    <span className="text-slate-600">-</span>
                                  ) : (
                                    st.form.map((res, i) => (
                                      <span
                                        key={i}
                                        className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                                          res === 'V'
                                            ? 'bg-emerald-500 text-slate-950'
                                            : res === 'E'
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'bg-rose-500 text-white'
                                        }`}
                                      >
                                        {res}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );

              return (
                <div className="space-y-4">
                  {/* View Mode Switcher: Conferências vs Supporters' Shield */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setMlsTableView('conferences');
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          mlsTableView === 'conferences'
                            ? 'bg-sky-400 text-slate-950 shadow'
                            : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        Conferências (Leste & Oeste · 15 + 15)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setMlsTableView('overall');
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          mlsTableView === 'overall'
                            ? 'bg-amber-400 text-slate-950 shadow'
                            : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        Supporters&apos; Shield (Classificação Geral · 30)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveTab('bracket');
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-300 border border-emerald-400/40 cursor-pointer"
                    >
                      Ver Audi MLS Cup Playoffs →
                    </button>
                  </div>

                  {mlsTableView === 'conferences' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {renderMlsTableBlock(
                        'Conferência Leste (Eastern Conference)',
                        '15 franquias · 1º–7º Playoffs Direto · 8º–9º Wild Card',
                        eastSorted,
                        false
                      )}
                      {renderMlsTableBlock(
                        'Conferência Oeste (Western Conference)',
                        '15 franquias · 1º–7º Playoffs Direto · 8º–9º Wild Card',
                        westSorted,
                        false
                      )}
                    </div>
                  ) : (
                    renderMlsTableBlock(
                      "Supporters' Shield — Classificação Geral da MLS",
                      '30 clubes · Melhor campanha geral (34 jogos) garante o Supporters\' Shield e o mando na MLS Cup Final',
                      overallSorted,
                      true
                    )
                  )}

                  {/* Regulamento Oficial MLS 2026 */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-300 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                      <span className="font-black text-white text-sm">
                        Regulamento Oficial Major League Soccer (MLS {seasonYear})
                      </span>
                      <span className="text-[11px] font-mono text-sky-400">
                        Liga Franqueada · Sem Rebaixamento · 34 Jogos na Temporada Regular
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                        <div className="font-bold text-white mb-1">1. Temporada Regular & Calendário</div>
                        <p className="text-slate-400">
                          Cada franquia disputa 34 jogos (17 em casa, 17 fora): 28 intra-conferência (ida e volta contra os 14 rivais da mesma conferência) + 6 interconferências. Pausa de 25/05 a 16/07 para a Copa do Mundo FIFA 2026 e Decision Day em 07/11.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                        <div className="font-bold text-white mb-1">2. Critérios de Desempate (9 Níveis)</div>
                        <p className="text-slate-400">
                          1º Pontos · 2º Vitórias · 3º Saldo de Gols · 4º Gols Pró · 5º Menor pontuação disciplinar (Amarelo=1, Vermelho=3) · 6º Saldo Fora · 7º Gols Fora · 8º Saldo Casa · 9º Gols Casa.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                        <div className="font-bold text-white mb-1">3. Audi MLS Cup Playoffs (18 Clubes)</div>
                        <p className="text-slate-400">
                          Wild Card (8º x 9º, jogo único). 1ª Rodada Melhor de 3 (1º x WC, 4º x 5º, 2º x 7º, 3º x 6º — sem agregado, empate vai direto aos pênaltis; se 2–0, Jogo 3 é dispensado). Semis, Finais de Conferência e MLS Cup Final em jogo único (com prorrogação + pênaltis). A partir de 2027, após sprint de 14 rodadas, adota calendário europeu (2027–28).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            /* Single League Table (Brasil A/B/C, 9 Ligas Sul-Americanas, 13 Ligas Europeias & 3 Ligas Continentais UEFA de 36 Clubes) */
            (() => {
              const isUefaLeaguePhase = isUefaContinental(selectedComp);
              const orderedTableStandings = isUefaLeaguePhase
                ? [...currentStandings].sort(
                    (a, b) =>
                      b.points - a.points ||
                      b.won - a.won ||
                      b.goalDifference - a.goalDifference ||
                      b.goalsFor - a.goalsFor
                  )
                : currentStandings;

              const leagueQual = conmebolReport.byLeague[selectedComp];
              const libEntryByClub = new Map(
                (leagueQual?.libertadoresClubs || []).map((e) => [e.clubId, e])
              );
              const sulaEntryByClub = new Map(
                (leagueQual?.sulamericanaClubs || []).map((e) => [e.clubId, e])
              );

              const euQual = selectedEuMeta
                ? uefaReport.byLeague[selectedEuMeta.id]
                : undefined;
              const uclClubSet = new Set(euQual?.uclIds || []);
              const uelClubSet = new Set(euQual?.uelIds || []);
              const ueclClubSet = new Set(euQual?.ueclIds || []);

              const wlQual = selectedWlMeta
                ? worldReport.byLeague[selectedWlMeta.id]
                : undefined;
              const wlIntClubSet = new Set(wlQual?.internationalIds || []);

              const promotionCount = isUefaLeaguePhase
                ? 8
                : selectedEuMeta
                ? selectedEuMeta.promotionSlots
                : selectedWlMeta
                ? 0
                : leagueQual
                ? 0
                : 4;
              const relegationCount = isUefaLeaguePhase
                ? 12
                : selectedEuMeta
                ? selectedEuMeta.relegationSlots
                : selectedSaMeta
                ? selectedSaMeta.relegationSlots
                : selectedWlMeta
                ? selectedWlMeta.relegationSlots
                : 4;
              const showInternationalColumns = Boolean(
                selectedSaMeta || selectedEuMeta || selectedWlMeta || isUefaLeaguePhase
              );

              return (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-4 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <h2 className="font-bold text-white text-sm flex items-center gap-2">
                      <CompetitionCrest meta={compMeta} size="xs" />
                      <span>
                        {isUefaLeaguePhase ? `${compMeta.name} · Fase de Liga` : compMeta.name}
                      </span>
                      <span className="text-slate-500 font-mono tabular-nums text-xs">
                        · {orderedTableStandings.length} clubes
                        {isUefaLeaguePhase
                          ? ` · ${
                              selectedComp === 'conference_league' ? '6 rodadas' : '8 rodadas'
                            }`
                          : ''}
                      </span>
                    </h2>

                    {/* Zone legend */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      {isUefaLeaguePhase ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Oitavas Direto (1º–8º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                            <span>Playoffs Cabeça (9º–16º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                            <span>Playoffs (17º–24º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                            <span>Eliminado (25º–36º)</span>
                          </span>
                        </>
                      ) : selectedWlMeta ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                            <span>1º · Campeão & Vaga Mundial de Clubes</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>
                              {selectedWlMeta.id === 'sau_pro'
                                ? 'AFC Champions (5 Oeste) + FIFA'
                                : selectedWlMeta.id === 'rus_premier'
                                ? 'AFC Champions (4 Oeste) + FIFA'
                                : selectedWlMeta.id === 'jpn_j1'
                                ? 'AFC Champions (5 Leste) + FIFA'
                                : `Champions Internacional FIFA (G-${selectedWlMeta.internationalBerths}${
                                    wlQual?.extraTitleHolderSpot ? ' +1' : ''
                                  })`}
                            </span>
                          </span>
                          {relegationCount > 0 ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                              <span>Rebaixamento (Z-{relegationCount})</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <span>Liga Franqueada · Sem Rebaixamento</span>
                            </span>
                          )}
                        </>
                      ) : selectedEuMeta && selectedEuMeta.tier === 1 ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-indigo-400" />
                            <span>Champions League ({selectedEuMeta.uclBerths})</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                            <span>
                              Europa League ({selectedEuMeta.uelBerths} Liga +{' '}
                              {EUROPEAN_LEAGUE_DOMESTIC_CUP[selectedEuMeta.id]?.cupName || 'Copa'})
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Conference League ({selectedEuMeta.ueclBerths})</span>
                          </span>
                          {selectedComp === 'ger_bundesliga' && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-orange-400" />
                              <span>Playoff de Rebaixamento (16º vs 3º 2. Bundesliga · Ida/Volta)</span>
                            </span>
                          )}
                          {selectedComp === 'fra_ligue1' && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-orange-400" />
                              <span>Barrage de Rebaixamento (16º vs Vencedor Play-offs Ligue 2 · Ida/Volta)</span>
                            </span>
                          )}
                          {relegationCount > 0 && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                              <span>Rebaixamento (Z-{relegationCount})</span>
                            </span>
                          )}
                        </>
                      ) : selectedComp === 'ger_bundesliga2' ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Acesso Direto à Bundesliga (1º–2º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                            <span>Playoff de Acesso (3º vs 16º Bundesliga · Ida e Volta)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                            <span>Rebaixamento (16º–18º · 3 times)</span>
                          </span>
                        </>
                      ) : selectedComp === 'fra_ligue2' ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Acesso Direto à Ligue 1 (1º–2º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                            <span>Play-offs de Acesso (3º–5º · Jogo Único + Barrage vs 16º Ligue 1)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                            <span>Rebaixamento (16º–18º · 3 times)</span>
                          </span>
                        </>
                      ) : selectedComp === 'esp_laliga2' ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Acesso Direto à LaLiga (1º–2º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                            <span>Play-offs de Acesso (3º–6º · Semis e Final em Ida e Volta)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                            <span>Rebaixamento à Primera Federación (19º–22º · 4 times)</span>
                          </span>
                        </>
                      ) : selectedComp === 'ita_serie_b' ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Acesso Direto à Serie A (1º–2º · 3º se abrir 15+ pts)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                            <span>Playoffs de Acesso (3º–8º · Quartas, Semis e Final em Ida e Volta)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-orange-400" />
                            <span>Playout de Rebaixamento (16º × 17º · Ida e Volta)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                            <span>Rebaixamento Direto à Serie C (18º–20º)</span>
                          </span>
                        </>
                      ) : selectedComp === 'eng_championship' ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Acesso Direto à Premier League (1º–2º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                            <span>Playoffs de Acesso (3º–8º · R1 Jogo Único, Semis Ida/Volta e Final)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                            <span>Rebaixamento à League One (22º–24º)</span>
                          </span>
                        </>
                      ) : selectedComp === 'eng_league_one' ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Acesso Direto à Championship (1º–2º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                            <span>Playoffs de Acesso (3º–6º · Semis Ida/Volta e Final)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                            <span>Rebaixamento à League Two (21º–24º)</span>
                          </span>
                        </>
                      ) : selectedComp === 'eng_league_two' ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Acesso Direto à League One (1º–3º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                            <span>Playoffs de Acesso (4º–7º · Semis Ida/Volta e Final)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                            <span>Rebaixamento (23º–24º)</span>
                          </span>
                        </>
                      ) : selectedComp === 'serie_b' ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Acesso Direto à Série A (1º–2º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                            <span>Playoff de Acesso (3º–6º · 3ºx6º e 4ºx5º Ida/Volta)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                            <span>Rebaixamento à Série C (17º–20º)</span>
                          </span>
                        </>
                      ) : selectedComp === 'serie_c' ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                            <span>Acesso Direto à Série B (1º–3º)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                            <span>Playoff de Acesso (4º–7º · 4ºx7º e 5ºx6º Ida/Volta + Final Jogo Único)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                            <span>Rebaixamento à Série D (21º–24º)</span>
                          </span>
                        </>
                      ) : selectedEuMeta ? (
                        <>
                          {promotionCount > 0 && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                              <span>Acesso Direto (G-{promotionCount})</span>
                            </span>
                          )}
                          {relegationCount > 0 && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                              <span>Rebaixamento (Z-{relegationCount})</span>
                            </span>
                          )}
                        </>
                      ) : leagueQual ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                            <span>
                              {leagueQual.country === 'Brasil'
                                ? 'Libertadores (G-4 do Brasileirão + Campeão da Copa do Brasil = 5 vagas)'
                                : leagueQual.country === 'Argentina'
                                ? 'Libertadores (G-4 do Argentino + Campeão da Copa Argentina = 5 vagas)'
                                : `Libertadores (${leagueQual.totalLibertadoresBerths} ${
                                    leagueQual.totalLibertadoresBerths === 1 ? 'vaga' : 'vagas'
                                  })`}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-cyan-400" />
                            <span>
                              Sul-Americana ({leagueQual.totalSulamericanaBerths}{' '}
                              {leagueQual.totalSulamericanaBerths === 1 ? 'vaga' : 'vagas'} · logo após Libertadores)
                            </span>
                          </span>
                          {relegationCount > 0 && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                              <span>Rebaixamento (Z-{relegationCount})</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-sky-400" /> Acesso (G-4)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Rebaixamento (Z-4)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-xs">
                      <thead className="bg-black text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-3 w-12 text-center">#</th>
                          <th className="py-3 px-4">Clube</th>
                          {showInternationalColumns && (
                            <th className="py-3 px-3 text-center whitespace-nowrap">Nível</th>
                          )}
                          <th className="py-3 px-3 text-center font-bold text-sky-300">P</th>
                          <th className="py-3 px-3 text-center">J</th>
                          <th className="py-3 px-3 text-center">V</th>
                          <th className="py-3 px-3 text-center">E</th>
                          <th className="py-3 px-3 text-center">D</th>
                          <th className="py-3 px-3 text-center">GP</th>
                          <th className="py-3 px-3 text-center">GC</th>
                          <th className="py-3 px-3 text-center">SG</th>
                          <th className="py-3 px-3 text-center">%</th>
                          <th className="py-3 px-4 text-center whitespace-nowrap">Últimos Jogos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {orderedTableStandings.map((st, index) => {
                          const club = clubs.find((c) => c.id === st.teamId);
                          if (!club) return null;

                          const pos = index + 1;
                          const isUser = club.id === userClub.id;
                          const libQual = libEntryByClub.get(club.id);
                          const sulaQual = sulaEntryByClub.get(club.id);
                          const isRelegated =
                            relegationCount > 0 &&
                            pos > orderedTableStandings.length - relegationCount;

                          let zoneBadge = 'text-slate-400 bg-slate-900';
                          if (isUefaLeaguePhase) {
                            if (pos <= 8) {
                              zoneBadge = 'text-slate-950 bg-emerald-400 font-black';
                            } else if (pos <= 16) {
                              zoneBadge = 'text-slate-950 bg-sky-400 font-black';
                            } else if (pos <= 24) {
                              zoneBadge =
                                'text-amber-200 bg-amber-950 font-bold border border-amber-600/50';
                            } else {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else if (selectedWlMeta) {
                            if (pos === 1) {
                              zoneBadge = 'text-slate-950 bg-amber-400 font-black';
                            } else if (wlIntClubSet.has(club.id)) {
                              zoneBadge = 'text-slate-950 bg-emerald-400 font-black';
                            } else if (isRelegated) {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else if (selectedEuMeta && selectedEuMeta.tier === 1) {
                            if (uclClubSet.has(club.id)) {
                              zoneBadge = 'text-slate-950 bg-indigo-400 font-black';
                            } else if (uelClubSet.has(club.id)) {
                              zoneBadge = 'text-slate-950 bg-amber-400 font-black';
                            } else if (ueclClubSet.has(club.id)) {
                              zoneBadge =
                                'text-emerald-200 bg-emerald-950 font-bold border border-emerald-700/50';
                            } else if (
                              (selectedComp === 'ger_bundesliga' || selectedComp === 'fra_ligue1') &&
                              pos === 16
                            ) {
                              zoneBadge = 'text-slate-950 bg-orange-400 font-black';
                            } else if (isRelegated) {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else if (selectedComp === 'ger_bundesliga2') {
                            if (pos <= 2) {
                              zoneBadge = 'text-slate-950 bg-emerald-400 font-black';
                            } else if (pos === 3) {
                              zoneBadge = 'text-slate-950 bg-sky-400 font-black';
                            } else if (isRelegated) {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else if (selectedComp === 'fra_ligue2') {
                            if (pos <= 2) {
                              zoneBadge = 'text-slate-950 bg-emerald-400 font-black';
                            } else if (pos <= 5) {
                              zoneBadge = 'text-slate-950 bg-sky-400 font-black';
                            } else if (isRelegated) {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else if (selectedComp === 'ita_serie_b') {
                            if (pos <= 2) {
                              zoneBadge = 'text-slate-950 bg-emerald-400 font-black';
                            } else if (pos <= 8) {
                              zoneBadge = 'text-slate-950 bg-sky-400 font-black';
                            } else if (pos === 16 || pos === 17) {
                              zoneBadge = 'text-slate-950 bg-orange-400 font-black';
                            } else if (isRelegated) {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else if (selectedComp === 'eng_championship') {
                            if (pos <= 2) {
                              zoneBadge = 'text-slate-950 bg-emerald-400 font-black';
                            } else if (pos <= 8) {
                              zoneBadge = 'text-slate-950 bg-sky-400 font-black';
                            } else if (isRelegated) {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else if (
                            selectedComp === 'eng_league_one' ||
                            selectedComp === 'esp_laliga2' ||
                            selectedComp === 'serie_b'
                          ) {
                            if (pos <= 2) {
                              zoneBadge = 'text-slate-950 bg-emerald-400 font-black';
                            } else if (pos <= 6) {
                              zoneBadge = 'text-slate-950 bg-sky-400 font-black';
                            } else if (isRelegated) {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else if (selectedComp === 'eng_league_two' || selectedComp === 'serie_c') {
                            if (pos <= 3) {
                              zoneBadge = 'text-slate-950 bg-emerald-400 font-black';
                            } else if (pos <= 7) {
                              zoneBadge = 'text-slate-950 bg-sky-400 font-black';
                            } else if (isRelegated) {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else if (selectedEuMeta) {
                            if (promotionCount > 0 && pos <= promotionCount) {
                              zoneBadge = 'text-slate-950 bg-sky-400 font-black';
                            } else if (isRelegated) {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else if (leagueQual) {
                            if (libQual) {
                              if (libQual.stage === 'libertadores_grupos') {
                                zoneBadge = 'text-slate-950 bg-amber-400 font-black';
                              } else if (libQual.stage === 'libertadores_pre_fase2') {
                                zoneBadge =
                                  'text-amber-200 bg-amber-950 font-bold border border-amber-500';
                              } else {
                                zoneBadge =
                                  'text-amber-300 bg-amber-950 font-bold border border-amber-600/70 border-dashed';
                              }
                            } else if (sulaQual) {
                              if (sulaQual.stage === 'sulamericana_grupos') {
                                zoneBadge = 'text-slate-950 bg-cyan-400 font-black';
                              } else {
                                zoneBadge =
                                  'text-cyan-200 bg-cyan-950 font-bold border border-cyan-700/60';
                              }
                            } else if (isRelegated) {
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                            }
                          } else {
                            if (pos <= 4) zoneBadge = 'text-slate-950 bg-sky-400 font-black';
                            else if (isRelegated)
                              zoneBadge =
                                'text-rose-200 bg-rose-950 font-bold border border-rose-700/50';
                          }

                          const uefaCutoffBorder = isUefaLeaguePhase
                            ? pos === 8
                              ? 'border-b-2 border-emerald-500/50'
                              : pos === 16
                              ? 'border-b border-sky-500/40'
                              : pos === 24
                              ? 'border-b-2 border-amber-500/50'
                              : ''
                            : selectedComp === 'ger_bundesliga' || selectedComp === 'fra_ligue1'
                            ? pos === 15
                              ? 'border-b border-orange-500/50'
                              : pos === 16
                              ? 'border-b border-rose-500/50'
                              : ''
                            : selectedComp === 'ger_bundesliga2'
                            ? pos === 2
                              ? 'border-b-2 border-emerald-500/50'
                              : pos === 3
                              ? 'border-b-2 border-sky-500/50'
                              : pos === orderedTableStandings.length - 3
                              ? 'border-b border-rose-500/50'
                              : ''
                            : selectedComp === 'fra_ligue2'
                            ? pos === 2
                              ? 'border-b-2 border-emerald-500/50'
                              : pos === 5
                              ? 'border-b-2 border-sky-500/50'
                              : pos === orderedTableStandings.length - 3
                              ? 'border-b border-rose-500/50'
                              : ''
                            : selectedComp === 'ita_serie_b'
                            ? pos === 2
                              ? 'border-b-2 border-emerald-500/50'
                              : pos === 8
                              ? 'border-b-2 border-sky-500/50'
                              : pos === 15
                              ? 'border-b border-orange-500/50'
                              : pos === 17
                              ? 'border-b-2 border-rose-500/50'
                              : ''
                            : selectedComp === 'eng_championship'
                            ? pos === 2
                              ? 'border-b-2 border-emerald-500/50'
                              : pos === 8
                              ? 'border-b-2 border-sky-500/50'
                              : pos === orderedTableStandings.length - 3
                              ? 'border-b border-rose-500/50'
                              : ''
                            : selectedComp === 'eng_league_one' ||
                              selectedComp === 'esp_laliga2' ||
                              selectedComp === 'serie_b'
                            ? pos === 2
                              ? 'border-b-2 border-emerald-500/50'
                              : pos === 6
                              ? 'border-b-2 border-sky-500/50'
                              : pos === orderedTableStandings.length - 4
                              ? 'border-b border-rose-500/50'
                              : ''
                            : selectedComp === 'eng_league_two'
                            ? pos === 3
                              ? 'border-b-2 border-emerald-500/50'
                              : pos === 7
                              ? 'border-b-2 border-sky-500/50'
                              : pos === orderedTableStandings.length - 2
                              ? 'border-b border-rose-500/50'
                              : ''
                            : selectedComp === 'serie_c'
                            ? pos === 3
                              ? 'border-b-2 border-emerald-500/50'
                              : pos === 7
                              ? 'border-b-2 border-sky-500/50'
                              : pos === orderedTableStandings.length - 4
                              ? 'border-b border-rose-500/50'
                              : ''
                            : leagueQual
                            ? pos === leagueQual.effectiveLibertadoresDirectCutoff
                              ? 'border-b-2 border-amber-500/50'
                              : pos === leagueQual.effectiveSulamericanaCutoff
                              ? 'border-b-2 border-cyan-500/50'
                              : relegationCount > 0 &&
                                pos === orderedTableStandings.length - relegationCount
                              ? 'border-b border-rose-500/50'
                              : ''
                            : '';

                          const pct =
                            st.played > 0 ? Math.round((st.points / (st.played * 3)) * 100) : 0;
                          const sectors = showInternationalColumns
                            ? getClubSectorRatings(club)
                            : null;

                          return (
                            <tr
                              key={st.teamId}
                              className={`transition-colors ${uefaCutoffBorder} ${
                                isUser ? 'bg-sky-500/10 font-bold' : 'hover:bg-slate-900/50'
                              }`}
                            >
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs tabular-nums ${zoneBadge}`}
                                >
                                  {pos}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onInspectClub) {
                                      soundEngine.playClick();
                                      onInspectClub(club.id);
                                    }
                                  }}
                                  title="Ver elenco, tática e estruturas do clube"
                                  className={`flex items-center gap-3 text-left group ${
                                    onInspectClub ? 'cursor-pointer' : ''
                                  }`}
                                >
                                  <ClubCrest club={club} size="sm" rounded="md" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`${
                                          isUser
                                            ? 'text-sky-300 font-black'
                                            : 'text-white group-hover:text-sky-300 transition-colors'
                                        }`}
                                      >
                                        {club.name}
                                      </span>
                                      {isUefaLeaguePhase && club.country ? (
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {club.country}
                                        </span>
                                      ) : (
                                        club.state &&
                                        !showInternationalColumns && (
                                          <span className="text-[10px] text-slate-500 font-mono">
                                            {club.state}
                                          </span>
                                        )
                                      )}
                                      {libQual && (
                                        <span
                                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap bg-amber-400/20 text-amber-300 border border-amber-400/40"
                                          title={libQual.stageName}
                                        >
                                          🏆 Liberta
                                          {libQual.reason &&
                                            (libQual.reason === 'Campeão da Copa do Brasil' ||
                                              libQual.reason === 'Campeão da Copa Argentina') && (
                                              <span className="opacity-80"> · {libQual.reason}</span>
                                            )}
                                        </span>
                                      )}
                                      {sulaQual && (
                                        <span
                                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap bg-cyan-400/20 text-cyan-300 border border-cyan-400/40"
                                          title={sulaQual.stageName}
                                        >
                                          🥈 Sul-Americana
                                        </span>
                                      )}
                                      {euQual && euQual.uelCupChampionId === club.id && (
                                        <span
                                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap bg-amber-400/20 text-amber-300 border border-amber-400/40"
                                          title={`Campeão da ${euQual.uelCupName || 'Copa Nacional'}`}
                                        >
                                          🏆 {euQual.uelCupName || 'Copa'}
                                        </span>
                                      )}
                                    </div>
                                    {showInternationalColumns && club.managerName && (
                                      <div className="text-[10px] text-slate-500">
                                        Téc. {club.managerName}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              </td>
                              {showInternationalColumns && sectors && (
                                <td className="py-3 px-3 text-center whitespace-nowrap font-mono tabular-nums text-[11px] text-slate-300">
                                  <span className="font-bold text-white">{sectors.overall}</span>
                                  <span className="text-slate-500 ml-1.5">
                                    D{sectors.defense} · M{sectors.midfield} · A{sectors.attack}
                                  </span>
                                </td>
                              )}
                              <td className="py-3 px-3 text-center font-black text-sky-400 font-mono text-sm tabular-nums">
                                {st.points}
                              </td>
                              <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-200">
                                {st.played}
                              </td>
                              <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-300">
                                {st.won}
                              </td>
                              <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-400">
                                {st.drawn}
                              </td>
                              <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-400">
                                {st.lost}
                              </td>
                              <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-300">
                                {st.goalsFor}
                              </td>
                              <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-400">
                                {st.goalsAgainst}
                              </td>
                              <td
                                className={`py-3 px-3 text-center font-mono tabular-nums font-bold ${
                                  st.goalDifference > 0
                                    ? 'text-emerald-400'
                                    : st.goalDifference < 0
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {st.goalDifference > 0
                                  ? `+${st.goalDifference}`
                                  : st.goalDifference}
                              </td>
                              <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-400">
                                {pct}%
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {st.form.length === 0 ? (
                                    <span className="text-slate-600">-</span>
                                  ) : (
                                    st.form.map((res, i) => (
                                      <span
                                        key={i}
                                        className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                                          res === 'V'
                                            ? 'bg-emerald-500 text-slate-950'
                                            : res === 'E'
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'bg-rose-500 text-white'
                                        }`}
                                      >
                                        {res}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* TAB: Classificação Geral (Alternar entre Tabela Agregada da Série D e Ranking dos Estaduais) */}
      {activeTab === 'overall_ranking' && (() => {
        const searchNorm = overallSearch.trim().toLowerCase();
        const regionOptions: Array<{ id: 'ALL' | BrazilianMacroRegion; label: string }> = [
          { id: 'ALL', label: 'Todas Regiões' },
          { id: 'Norte', label: 'Norte' },
          { id: 'Nordeste', label: 'Nordeste' },
          { id: 'Centro-Oeste', label: 'Centro-Oeste' },
          { id: 'Sudeste', label: 'Sudeste' },
          { id: 'Sul', label: 'Sul' },
        ];

        const filteredSerieDRows = serieDAggregatedRanking.rows
          .map((row, idx) => ({ ...row, overallPos: idx + 1 }))
          .filter((row) => {
            if (overallRegionFilter !== 'ALL' && row.region !== overallRegionFilter) return false;
            if (overallStateFilter !== 'ALL' && row.club.state !== overallStateFilter) return false;
            if (searchNorm) {
              const hay = `${row.club.name} ${row.club.shortName} ${row.club.state} ${row.group} ${row.statusLabel}`.toLowerCase();
              if (!hay.includes(searchNorm)) return false;
            }
            return true;
          });

        const filteredEstaduaisRows = estaduaisOverallRanking.rows
          .map((row, idx) => ({ ...row, overallPos: idx + 1 }))
          .filter((row) => {
            if (overallRegionFilter !== 'ALL' && row.region !== overallRegionFilter) return false;
            if (overallStateFilter !== 'ALL' && row.uf !== overallStateFilter) return false;
            if (searchNorm) {
              const hay = `${row.club.name} ${row.club.shortName} ${row.uf} ${row.estadualName}`.toLowerCase();
              if (!hay.includes(searchNorm)) return false;
            }
            return true;
          });

        const serieDLeader = serieDAggregatedRanking.rows[0];
        const estadualLeader = estaduaisOverallRanking.rows[0];

        return (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5">
            {/* Header + Primary Mode Toggle */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="text-xs text-rose-400 font-bold font-mono">
                  CBF · Classificação Geral Consolidada ({saSeasonYear ?? seasonYear})
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  {overallRankingMode === 'serie_d'
                    ? 'Tabela Agregada · Brasileirão Série D (96 Clubes)'
                    : 'Ranking Geral · 27 Campeonatos Estaduais'}
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                  {overallRankingMode === 'serie_d'
                    ? 'Campanha geral acumulada (1ª Fase + Mata-Mata) de todos os 96 clubes da Série D — usada oficialmente pela CBF para o re-ranqueamento nas Quartas (1º×8º ao 4º×5º), Semifinais (1º×4º e 2º×3º) e mando de campo da volta.'
                    : 'Ranking unificado com o desempenho acumulado de todos os clubes participantes dos 27 Campeonatos Estaduais do Brasil, incluindo líderes, campeões e vagas CBF para a Série D (64 vagas RNF) e Copa do Brasil.'}
                </p>
              </div>

              {/* Switcher between Série D Aggregated Table and Estaduais Ranking */}
              <div className="inline-flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800 self-start shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setOverallRankingMode('serie_d');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    overallRankingMode === 'serie_d'
                      ? 'bg-rose-400 text-slate-950 shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Tabela Agregada · Série D</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setOverallRankingMode('estaduais');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    overallRankingMode === 'estaduais'
                      ? 'bg-emerald-400 text-slate-950 shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Ranking dos Estaduais</span>
                </button>
              </div>
            </div>

            {/* Summary KPI Cards */}
            {overallRankingMode === 'serie_d' ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Participantes</div>
                  <div className="text-lg font-black text-white font-mono tabular-nums mt-0.5">
                    {serieDAggregatedRanking.rows.length} clubes
                  </div>
                  <div className="text-[11px] text-slate-400">16 grupos (A01–A16)</div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Jogos Disputados</div>
                  <div className="text-lg font-black text-sky-400 font-mono tabular-nums mt-0.5">
                    {serieDAggregatedRanking.playedMatchesCount}
                  </div>
                  <div className="text-[11px] text-slate-400">1ª Fase + Mata-Mata</div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Melhor Campanha</div>
                  {serieDLeader ? (
                    <div className="flex items-center gap-2 mt-1 min-w-0">
                      <ClubCrest club={serieDLeader.club} size="xs" rounded="md" />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">
                          {serieDLeader.club.shortName}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-mono tabular-nums">
                          {serieDLeader.points} pts · {serieDLeader.efficiency.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 mt-1">Aguardando jogos</div>
                  )}
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Critério CBF</div>
                  <div className="text-xs font-bold text-rose-300 mt-1">
                    4 Acessos · 3ª Fase = Vaga D
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Re-ranqueamento Quartas &amp; Semis
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Clubes Ranqueados</div>
                  <div className="text-lg font-black text-white font-mono tabular-nums mt-0.5">
                    {estaduaisOverallRanking.rows.length} clubes
                  </div>
                  <div className="text-[11px] text-slate-400">27 Federações Estaduais</div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Campeões Definidos</div>
                  <div className="text-lg font-black text-amber-400 font-mono tabular-nums mt-0.5">
                    {estaduaisOverallRanking.definedChampionsCount} / 27
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {estaduaisOverallRanking.playedMatchesCount} jogos disputados
                  </div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Líder dos Estaduais</div>
                  {estadualLeader ? (
                    <div className="flex items-center gap-2 mt-1 min-w-0">
                      <ClubCrest club={estadualLeader.club} size="xs" rounded="md" />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">
                          {estadualLeader.club.shortName} ({estadualLeader.uf})
                        </div>
                        <div className="text-[11px] text-emerald-400 font-mono tabular-nums">
                          {estadualLeader.points} pts · {estadualLeader.efficiency.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 mt-1">Aguardando jogos</div>
                  )}
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Vagas Série D (RNF)</div>
                  <div className="text-lg font-black text-emerald-400 font-mono tabular-nums mt-0.5">
                    {estaduaisOverallRanking.totalSerieDSpots} vagas
                  </div>
                  <div className="text-[11px] text-slate-400">SP: 4 · 8 UFs: 3 · 18 UFs: 2</div>
                </div>
              </div>
            )}

            {/* Filters & Sort Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/90 rounded-xl p-3">
              {/* Region filter strip */}
              <div className="flex flex-wrap items-center gap-1.5">
                {regionOptions.map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setOverallRegionFilter(reg.id);
                      if (reg.id !== 'ALL') setOverallStateFilter('ALL');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      overallRegionFilter === reg.id
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {reg.label}
                  </button>
                ))}
              </div>

              {/* Right controls: State dropdown + Sort toggle + Search */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={overallStateFilter}
                  onChange={(e) => setOverallStateFilter(e.target.value)}
                  aria-label="Filtrar por Estado (UF)"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-sky-400"
                >
                  <option value="ALL">Todos os Estados (27)</option>
                  {ESTADUAIS_2026_CONFIG.map((cfg) => (
                    <option key={cfg.uf} value={cfg.uf}>
                      {cfg.uf} · {cfg.shortName}
                    </option>
                  ))}
                </select>

                <div className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setOverallSortBy('points')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                      overallSortBy === 'points'
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pontos
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverallSortBy('efficiency')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                      overallSortBy === 'efficiency'
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Apr. %
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={overallSearch}
                    onChange={(e) => setOverallSearch(e.target.value)}
                    placeholder="Buscar clube, UF ou grupo..."
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 w-48 sm:w-56"
                  />
                </div>
              </div>
            </div>

            {/* Table Content */}
            {overallRankingMode === 'serie_d' ? (
              <div className="bg-black/40 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[68vh] overflow-y-auto">
                  <table className="w-full text-left text-xs min-w-[760px]">
                    <thead className="sticky top-0 z-10 bg-black text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3">Clube</th>
                        <th className="py-3 px-2.5 text-center">Grupo</th>
                        <th className="py-3 px-2.5">Situação / Fase</th>
                        <th className="py-3 px-2 text-center text-sky-400 font-black">P</th>
                        <th className="py-3 px-2 text-center">J</th>
                        <th className="py-3 px-2 text-center">V</th>
                        <th className="py-3 px-2 text-center">E</th>
                        <th className="py-3 px-2 text-center">D</th>
                        <th className="py-3 px-2 text-center">GP</th>
                        <th className="py-3 px-2 text-center">GC</th>
                        <th className="py-3 px-2 text-center">SG</th>
                        <th className="py-3 px-3 text-right">Apr.%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredSerieDRows.map((row) => {
                        const posBadge =
                          row.overallPos <= 4
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : row.overallPos <= 8
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : row.overallPos <= 32
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            : row.overallPos <= 64
                            ? 'bg-slate-800 text-slate-200 border border-slate-700'
                            : 'text-slate-500';
                        const statusColor =
                          row.statusTone === 'amber'
                            ? 'text-amber-300'
                            : row.statusTone === 'emerald'
                            ? 'text-emerald-400'
                            : row.statusTone === 'sky'
                            ? 'text-sky-300'
                            : row.statusTone === 'indigo'
                            ? 'text-indigo-300'
                            : 'text-slate-400';

                        return (
                          <tr
                            key={row.club.id}
                            className={`transition-colors ${
                              row.club.id === userClub.id
                                ? 'bg-sky-500/15'
                                : 'hover:bg-slate-900/50'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex min-w-[24px] h-6 px-1 rounded-md items-center justify-center text-[10px] font-black font-mono tabular-nums ${posBadge}`}
                              >
                                {row.overallPos}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onInspectClub) {
                                    soundEngine.playClick();
                                    onInspectClub(row.club.id);
                                  }
                                }}
                                className={`flex items-center gap-2 text-left group ${
                                  onInspectClub ? 'cursor-pointer' : ''
                                }`}
                              >
                                <ClubCrest club={row.club} size="xs" rounded="md" />
                                <span
                                  className={`font-bold truncate ${
                                    row.club.id === userClub.id
                                      ? 'text-sky-300'
                                      : 'text-white group-hover:text-sky-300 transition-colors'
                                  }`}
                                >
                                  {row.club.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                  {row.club.state}
                                </span>
                              </button>
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-mono text-[11px] font-bold text-slate-300">
                              {row.groupShort}
                            </td>
                            <td className={`py-2.5 px-2.5 text-[11px] font-bold whitespace-nowrap ${statusColor}`}>
                              {row.statusLabel}
                            </td>
                            <td className="py-2.5 px-2 text-center font-black text-sky-400 font-mono tabular-nums">
                              {row.points}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-300">
                              {row.played}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                              {row.won}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                              {row.drawn}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                              {row.lost}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                              {row.goalsFor}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                              {row.goalsAgainst}
                            </td>
                            <td
                              className={`py-2.5 px-2 text-center font-mono tabular-nums font-bold ${
                                row.goalDifference > 0
                                  ? 'text-emerald-400'
                                  : row.goalDifference < 0
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {row.goalDifference > 0
                                ? `+${row.goalDifference}`
                                : row.goalDifference}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300 font-semibold">
                              {row.efficiency.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSerieDRows.length === 0 && (
                        <tr>
                          <td colSpan={13} className="py-8 text-center text-slate-500 text-xs">
                            Nenhum clube da Série D encontrado com os filtros atuais.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 bg-slate-900/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-emerald-400 font-semibold">● 1º–4º G-4 Geral / Acesso</span>
                    <span className="text-sky-300 font-semibold">● 5º–8º Zona de Quartas</span>
                    <span className="text-indigo-300 font-semibold">● 9º–32º Faixa 3ª Fase (Vaga D)</span>
                  </div>
                  <span className="font-mono tabular-nums">
                    Exibindo {filteredSerieDRows.length} de {serieDAggregatedRanking.rows.length} clubes
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-black/40 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[68vh] overflow-y-auto">
                  <table className="w-full text-left text-xs min-w-[780px]">
                    <thead className="sticky top-0 z-10 bg-black text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3">Clube</th>
                        <th className="py-3 px-2.5">Estadual</th>
                        <th className="py-3 px-2.5">Status / Vagas CBF</th>
                        <th className="py-3 px-2 text-center text-sky-400 font-black">P</th>
                        <th className="py-3 px-2 text-center">J</th>
                        <th className="py-3 px-2 text-center">V</th>
                        <th className="py-3 px-2 text-center">E</th>
                        <th className="py-3 px-2 text-center">D</th>
                        <th className="py-3 px-2 text-center">GP</th>
                        <th className="py-3 px-2 text-center">GC</th>
                        <th className="py-3 px-2 text-center">SG</th>
                        <th className="py-3 px-3 text-right">Apr.%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredEstaduaisRows.map((row) => {
                        const posBadge = row.isChampion
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                          : row.overallPos <= 10
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'text-slate-400';

                        const tags: Array<{ text: string; cls: string }> = [];
                        if (row.isChampion) tags.push({ text: 'Campeão', cls: 'text-amber-300 font-black' });
                        else if (row.isRunnerUp) tags.push({ text: 'Vice', cls: 'text-slate-200 font-bold' });
                        if (row.isSerieDQualified) tags.push({ text: 'Série D', cls: 'text-sky-300 font-bold' });
                        if (row.isCopaBrasil) tags.push({ text: 'CdB', cls: 'text-emerald-400 font-bold' });
                        if (row.isNordeste) tags.push({ text: 'Nordestão', cls: 'text-orange-300 font-semibold' });
                        if (row.isCopaVerde) tags.push({ text: 'Copa Verde', cls: 'text-teal-300 font-semibold' });

                        return (
                          <tr
                            key={`${row.club.id}_${row.uf}`}
                            className={`transition-colors ${
                              row.club.id === userClub.id
                                ? 'bg-sky-500/15'
                                : 'hover:bg-slate-900/50'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex min-w-[24px] h-6 px-1 rounded-md items-center justify-center text-[10px] font-black font-mono tabular-nums ${posBadge}`}
                              >
                                {row.overallPos}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onInspectClub) {
                                    soundEngine.playClick();
                                    onInspectClub(row.club.id);
                                  }
                                }}
                                className={`flex items-center gap-2 text-left group ${
                                  onInspectClub ? 'cursor-pointer' : ''
                                }`}
                              >
                                <ClubCrest club={row.club} size="xs" rounded="md" />
                                <span
                                  className={`font-bold truncate ${
                                    row.club.id === userClub.id
                                      ? 'text-sky-300'
                                      : 'text-white group-hover:text-sky-300 transition-colors'
                                  }`}
                                >
                                  {row.club.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                  {row.club.division === 'EST'
                                    ? 'Estadual'
                                    : `Série ${row.club.division}`}
                                </span>
                              </button>
                            </td>
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <span className="font-bold text-slate-200">{row.estadualName}</span>
                              <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                                {row.uf}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-[11px] whitespace-nowrap">
                              {tags.length > 0 ? (
                                <span className="inline-flex flex-wrap items-center gap-1.5">
                                  {tags.map((t, tIdx) => (
                                    <span key={t.text} className={t.cls}>
                                      {tIdx > 0 ? '· ' : ''}
                                      {t.text}
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center font-black text-sky-400 font-mono tabular-nums">
                              {row.points}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-300">
                              {row.played}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                              {row.won}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                              {row.drawn}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                              {row.lost}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                              {row.goalsFor}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                              {row.goalsAgainst}
                            </td>
                            <td
                              className={`py-2.5 px-2 text-center font-mono tabular-nums font-bold ${
                                row.goalDifference > 0
                                  ? 'text-emerald-400'
                                  : row.goalDifference < 0
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {row.goalDifference > 0
                                ? `+${row.goalDifference}`
                                : row.goalDifference}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300 font-semibold">
                              {row.efficiency.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                      {filteredEstaduaisRows.length === 0 && (
                        <tr>
                          <td colSpan={13} className="py-8 text-center text-slate-500 text-xs">
                            Nenhum clube estadual encontrado com os filtros atuais.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 bg-slate-900/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-amber-300 font-semibold">● Campeão Estadual</span>
                    <span className="text-sky-300 font-semibold">● Vaga Série D (64 via RNF)</span>
                    <span className="text-emerald-400 font-semibold">● Vaga Copa do Brasil</span>
                  </div>
                  <span className="font-mono tabular-nums">
                    Exibindo {filteredEstaduaisRows.length} de {estaduaisOverallRanking.rows.length} clubes
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB: Mapa Oficial de Vagas das Ligas Continentais & Mundial de Clubes FIFA */}
      {activeTab === 'world_spots' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="text-xs text-emerald-400 font-bold font-mono">
                FIFA · Sistema de Classificação Continental & Mundial de Clubes
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Vagas Continentais e Mundial de Clubes FIFA {seasonYear}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                As ligas da América do Norte, Ásia/Rússia e África enviam seus campeões diretamente para disputar a Copa Intercontinental FIFA / Mundial de Clubes em dezembro, além da corrida pelas vagas quadrienais no Super Mundial de Clubes da FIFA.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedComp('intercontinental');
                  setActiveTab('bracket');
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ver Chave do Mundial de Clubes
              </button>
            </div>
          </div>

          {/* Mundial de Clubes / Copa Intercontinental 5 Continental Berths */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-white">
                Representantes do Mundial de Clubes FIFA (Dezembro · Catar)
              </h3>
              <span className="text-xs font-mono tabular-nums text-amber-300">
                Quartas (Dérbi das Américas & África-Ásia) → Semifinal → Final Mundial
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                {
                  slotKey: 'UEFA',
                  region: 'Europa (Finalista Direto)',
                  origin: 'Campeão UEFA Champions League',
                  clubId: worldReport.uclChampId || fixturesIntercontinental.find((f) => f.id.includes('_final_'))?.homeTeamId,
                },
                {
                  slotKey: 'CONMEBOL',
                  region: 'América do Sul (Dérbi Américas)',
                  origin: 'Campeão CONMEBOL Libertadores',
                  clubId: worldReport.libChampId,
                },
                {
                  slotKey: 'CONCACAF',
                  region: 'América do Norte (Dérbi Américas)',
                  origin: worldReport.hasOfficialConcacafChampion
                    ? 'Campeão Copa dos Campeões da CONCACAF'
                    : 'Campeão Copa dos Campeões CONCACAF (Projeção)',
                  clubId: worldReport.concacafChampionId,
                },
                {
                  slotKey: 'ASIA_RUSSIA',
                  region: 'Ásia & Eurásia (Copa África-Ásia)',
                  origin: worldReport.hasOfficialAfcChampion
                    ? 'Campeão Liga dos Campeões da AFC'
                    : 'Campeão AFC Champions / Arábia / Japão / Rússia',
                  clubId: worldReport.asiaRussiaChampionId,
                },
                {
                  slotKey: 'CAF',
                  region: 'África (Copa África-Ásia)',
                  origin: 'Melhor Campeão Egito / Marrocos',
                  clubId: worldReport.africaChampionId,
                },
              ].map((berth) => {
                const repClub =
                  berth.clubId && !berth.clubId.toUpperCase().startsWith('TBD')
                    ? clubs.find((c) => c.id === berth.clubId)
                    : undefined;
                return (
                  <div
                    key={berth.slotKey}
                    onClick={() => repClub && onInspectClub?.(repClub.id)}
                    className={`p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 ${
                      repClub && onInspectClub ? 'hover:border-amber-400/50 cursor-pointer transition-colors' : ''
                    }`}
                  >
                    <div className="text-[11px] font-bold text-amber-400 truncate">
                      {berth.region}
                    </div>
                    {repClub ? (
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 border border-white/15"
                          style={{
                            backgroundColor: repClub.colors.primary,
                            color: repClub.colors.text,
                          }}
                        >
                          {repClub.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">
                            {repClub.shortName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {repClub.country || 'Brasil'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-slate-400 py-1.5">
                        Em definição na temporada
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/80 truncate">
                      {berth.origin}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7 National Leagues -> Continental Champions for Mundial de Clubes */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-white">
                Ligas Continentais e Campeões Nacionais
              </h3>
              <span className="text-xs font-mono tabular-nums text-emerald-400">
                Líderes de cada continente garantem acesso direto à Copa Intercontinental FIFA
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {WORLD_LEAGUE_IDS.map((wlId) => {
                const meta = WORLD_LEAGUES_META[wlId];
                const leagueEntry = worldReport.byLeague[wlId];
                const qualIds = leagueEntry?.internationalIds || [];

                return (
                  <div
                    key={wlId}
                    className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{meta.flagEmoji}</span>
                        <div>
                          <div className="text-sm font-black text-white">
                            {meta.country} · {meta.shortName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            <span>{meta.macroRegionLabel}</span> ·{' '}
                            <span className="text-emerald-400">
                              Disputa Mundial FIFA
                            </span>
                            {meta.relegationSlots > 0
                              ? ` · Z-${meta.relegationSlots}`
                              : ' · Sem rebaixamento'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedComp(wlId);
                          setActiveTab('table');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Ver Tabela
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {qualIds.map((clubId, idx) => {
                        const cObj = clubs.find((x) => x.id === clubId);
                        if (!cObj) return null;
                        const isLeader = clubId === leagueEntry?.championId;
                        return (
                          <button
                            key={clubId}
                            type="button"
                            onClick={() => onInspectClub?.(cObj.id)}
                            className="w-full flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black shrink-0"
                                style={{
                                  backgroundColor: cObj.colors.primary,
                                  color: cObj.colors.text,
                                }}
                              >
                                {cObj.initials.slice(0, 2)}
                              </span>
                              <span
                                className={`truncate font-semibold ${
                                  cObj.id === userClub.id
                                    ? 'text-sky-300 font-black'
                                    : 'text-slate-100'
                                }`}
                              >
                                {cObj.shortName}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-mono tabular-nums shrink-0 ${
                                isLeader ? 'text-amber-300 font-bold' : 'text-emerald-300'
                              }`}
                            >
                              {isLeader ? '1º · Mundial' : `${idx + 1}º`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Mapa Oficial de Vagas UEFA (10 Países -> 36 Champions + 36 Europa + 36 Conference) */}
      {activeTab === 'uefa_spots' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="text-xs text-indigo-400 font-bold font-mono">
                UEFA · Sistema Oficial de Classificação Continental Europeu (Fase de Liga · 36 Clubes)
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Mapa de Vagas UEFA em Tempo Real — Temporada {seasonYear + 1}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Os 36 classificados da UEFA Champions League, 36 da Europa League e 36 da Conference League no formato oficial de Fase de Liga são definidos pelas tabelas das 17 ligas de elite europeias, pelos campeões das copas nacionais de cada país (FA Cup na Inglaterra, Copa del Rey, DFB-Pokal, Coppa Italia e demais taças) para a Europa League e pelos campeões continentais da temporada.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-slate-300">
              <span>
                Champions:{' '}
                <strong className="text-indigo-400">
                  {uefaReport.championsLeagueIds.length}/36
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Europa:{' '}
                <strong className="text-amber-400">{uefaReport.europaLeagueIds.length}/36</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Conference:{' '}
                <strong className="text-emerald-400">
                  {uefaReport.conferenceLeagueIds.length}/36
                </strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {uefaReport.orderedTopLeagues.map((leagueSummary) => {
              const euMeta = EUROPEAN_LEAGUES_META[leagueSummary.leagueId];
              const cupLabel = leagueSummary.uelCupName || 'Copa';
              return (
                <div
                  key={leagueSummary.leagueId}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{leagueSummary.flagEmoji}</span>
                      <div>
                        <div className="text-sm font-black text-white">
                          {leagueSummary.country} · {leagueSummary.leagueName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                          <span className="text-indigo-300">{euMeta.uclBerths} UCL</span> ·{' '}
                          <span className="text-amber-300">
                            {euMeta.uelBerths}+{1} ({cupLabel}) UEL
                          </span>{' '}
                          · <span className="text-emerald-300">{euMeta.ueclBerths} UECL</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedComp(leagueSummary.leagueId);
                        setActiveTab('table');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Ver Tabela
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-indigo-400">
                        Champions ({leagueSummary.uclIds.length})
                      </div>
                      {leagueSummary.uclIds.map((clubId, idx) => {
                        const cObj = clubs.find((x) => x.id === clubId);
                        if (!cObj) return null;
                        return (
                          <button
                            key={clubId}
                            type="button"
                            onClick={() => onInspectClub?.(cObj.id)}
                            className="w-full flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                          >
                            <span
                              className={`truncate font-semibold ${
                                cObj.id === userClub.id
                                  ? 'text-sky-300 font-black'
                                  : 'text-slate-100'
                              }`}
                            >
                              {cObj.shortName}
                            </span>
                            <span className="text-[10px] text-indigo-300 font-mono tabular-nums shrink-0">
                              {idx + 1}º
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-amber-400">
                        Europa League ({leagueSummary.uelIds.length})
                      </div>
                      {leagueSummary.uelIds.map((clubId) => {
                        const cObj = clubs.find((x) => x.id === clubId);
                        if (!cObj) return null;
                        const isCupChamp = leagueSummary.uelCupChampionId === clubId;
                        return (
                          <button
                            key={clubId}
                            type="button"
                            onClick={() => onInspectClub?.(cObj.id)}
                            className="w-full flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                          >
                            <span
                              className={`truncate font-semibold ${
                                cObj.id === userClub.id
                                  ? 'text-sky-300 font-black'
                                  : 'text-slate-200'
                              }`}
                            >
                              {cObj.shortName}
                            </span>
                            <span className="text-[10px] text-amber-300 font-mono tabular-nums shrink-0">
                              {isCupChamp ? cupLabel : 'UEL'}
                            </span>
                          </button>
                        );
                      })}
                      {!leagueSummary.uelCupChampionId && !leagueSummary.uelCupInheritedToLeague && (
                        <div className="py-1 px-2 rounded-lg border border-dashed border-amber-500/30 text-[10px] text-amber-300/80 truncate">
                          🏆 Campeão {cupLabel} (a definir)
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-emerald-400">
                        Conference ({leagueSummary.ueclIds.length})
                      </div>
                      {leagueSummary.ueclIds.map((clubId) => {
                        const cObj = clubs.find((x) => x.id === clubId);
                        if (!cObj) return null;
                        return (
                          <button
                            key={clubId}
                            type="button"
                            onClick={() => onInspectClub?.(cObj.id)}
                            className="w-full flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                          >
                            <span
                              className={`truncate font-semibold ${
                                cObj.id === userClub.id
                                  ? 'text-sky-300 font-black'
                                  : 'text-slate-200'
                              }`}
                            >
                              {cObj.shortName}
                            </span>
                            <span className="text-[10px] text-emerald-300 font-mono tabular-nums shrink-0">
                              UECL
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: Mapa Oficial de Vagas CONMEBOL (10 Países -> 32 Libertadores + 32 Sul-Americana) */}
      {activeTab === 'conmebol_spots' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="text-xs text-amber-400 font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span>🌎 CONMEBOL</span>
                <span>·</span>
                <span>Sistema Oficial de Classificação Continental</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                Distribuição de Vagas por País — Temporada {seasonYear + 1}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Distribuição direta de vagas por país: <strong>32 clubes</strong> na Fase de Grupos da Libertadores (Brasil e Argentina com 5 vagas cada: Copa Nacional + 4 primeiros da liga; URU, EQU, COL, CHI, PAR e PER com 3; BOL e VEN com 2) e <strong>32 clubes</strong> na Fase de Grupos da Sul-Americana (Brasil e Argentina com 4; demais 8 países com 3), preenchidos pelos clubes logo após as vagas da Libertadores em seus campeonatos nacionais.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setConmebolSpotsViewMode('clubs');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    conmebolSpotsViewMode === 'clubs'
                      ? 'bg-amber-400 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Clubes em Tempo Real
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setConmebolSpotsViewMode('matrix');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    conmebolSpotsViewMode === 'matrix'
                      ? 'bg-amber-400 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Matriz Oficial (10 Países)
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-300 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                <span>
                  Libertadores: <strong className="text-amber-400 font-black">{conmebolReport.libertadoresIds.length}/32</strong>
                </span>
                <span className="text-slate-600" aria-hidden="true">|</span>
                <span>
                  Sul-Americana: <strong className="text-cyan-400 font-black">{conmebolReport.sulamericanaIds.length}/32</strong>
                </span>
              </div>
            </div>
          </div>

          {/* MODO MATRIZ OFICIAL: Comparativo detalhado dos 10 países */}
          {conmebolSpotsViewMode === 'matrix' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">País</th>
                      <th className="py-3 px-3">Liga Nacional</th>
                      <th className="py-3 px-3 text-center text-amber-300">Libertadores</th>
                      <th className="py-3 px-3 text-center text-cyan-300">Sul-Americana</th>
                      <th className="py-3 px-3 text-center text-slate-300">Total</th>
                      <th className="py-3 px-4 min-w-[300px]">Critérios de Vaga (Libertadores & Sul-Americana)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {CONMEBOL_COUNTRY_DISTRIBUTION_TABLE.map((row) => {
                      const isUserCountry =
                        (userClub.division === 'SA' &&
                          getSouthAmericanLeagueByCountry(userClub.country) === row.leagueId) ||
                        (userClub.division !== 'SA' &&
                          userClub.division !== 'EU' &&
                          userClub.division !== 'WL' &&
                          row.country === 'Brasil');
                      return (
                        <tr
                          key={row.country}
                          className={`transition-colors ${
                            isUserCountry ? 'bg-sky-500/10' : 'hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                            <span className="mr-2 text-sm">{row.flagEmoji}</span>
                            <span>{row.country}</span>
                            {isUserCountry && (
                              <span className="ml-1.5 text-[9px] bg-sky-500/20 text-sky-300 px-1 py-0.5 rounded font-black">
                                SUA LIGA
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                setSelectedComp(row.leagueId);
                                setActiveTab('table');
                              }}
                              className="hover:text-amber-300 transition-colors underline decoration-slate-700 hover:decoration-amber-400 cursor-pointer text-left"
                            >
                              {COMPETITIONS_CATALOG[row.leagueId]?.name || row.leagueId}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center font-black font-mono text-amber-400 tabular-nums">
                            {row.libertadoresTotal} vagas
                          </td>
                          <td className="py-2.5 px-3 text-center font-black font-mono text-cyan-400 tabular-nums">
                            {row.sulamericanaTotal} vagas
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-200 tabular-nums">
                            {row.libertadoresTotal + row.sulamericanaTotal}
                          </td>
                          <td className="py-2.5 px-4 text-[11px] text-slate-400 leading-relaxed">
                            <div className="space-y-0.5">
                              <div>
                                <strong className="text-amber-300 font-semibold">LIB:</strong>{' '}
                                {row.criteriaLibertadores}
                              </div>
                              <div>
                                <strong className="text-cyan-300 font-semibold">SULA:</strong>{' '}
                                {row.criteriaSulamericana}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-900/90 font-bold text-xs border-t border-slate-700 text-slate-200">
                    <tr>
                      <td colSpan={2} className="py-3 px-3 uppercase tracking-wider text-slate-400">
                        Total América do Sul (10 Federações)
                      </td>
                      <td className="py-3 px-3 text-center font-black text-amber-400 font-mono">
                        32 vagas
                      </td>
                      <td className="py-3 px-3 text-center font-black text-cyan-400 font-mono">
                        32 vagas
                      </td>
                      <td className="py-3 px-3 text-center font-black text-white font-mono">
                        64
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        32 clubes diretos na Fase de Grupos da Libertadores + 32 clubes diretos na Fase de Grupos da Sul-Americana.
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="text-amber-400 font-bold flex items-center gap-1.5">
                    <span>🏆 Libertadores (32 Vagas Diretas)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    <strong>Brasil (5) e Argentina (5):</strong> Campeão da Copa Nacional (Copa do Brasil / Copa Argentina) + os 4 primeiros da liga.<br />
                    <strong>URU, EQU, COL, CHI, PAR e PER (3 cada):</strong> 3 primeiros colocados de cada liga.<br />
                    <strong>BOL e VEN (2 cada):</strong> 2 primeiros colocados de cada liga.
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <span>🥈 Sul-Americana (32 Vagas Diretas)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    <strong>Brasil (4) e Argentina (4)</strong> + <strong>3 vagas</strong> para cada um dos outros 8 países (Uruguai, Equador, Colômbia, Chile, Paraguai, Peru, Bolívia e Venezuela). Todas as vagas vão para os clubes imediatamente abaixo das vagas da Libertadores nas ligas nacionais.
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span>🔁 Repasse da Copa Nacional</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    No Brasil e na Argentina, se o campeão da Copa do Brasil ou da Copa Argentina já terminar entre os 4 primeiros da liga nacional, a 5ª vaga da Libertadores passa automaticamente ao 5º colocado (e a zona da Sul-Americana desce uma posição).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MODO CLUBES EM TEMPO REAL: Cards dos 10 países com seus classificados */}
          {conmebolSpotsViewMode === 'clubs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {conmebolReport.orderedCountries.map((countrySummary) => {
                  const leagueCatMeta = COMPETITIONS_CATALOG[countrySummary.leagueId];
                  return (
                    <div
                      key={countrySummary.country}
                      className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3.5"
                    >
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{leagueCatMeta?.badgeEmoji || countrySummary.flagEmoji || '🌎'}</span>
                          <div>
                            <div className="text-sm font-black text-white flex items-center gap-2">
                              <span>{countrySummary.country}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{countrySummary.flagCode}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {countrySummary.leagueName} ·{' '}
                              <span className="text-amber-300 font-mono tabular-nums font-bold">
                                {countrySummary.totalLibertadoresBerths} LIB
                              </span>{' '}
                              /{' '}
                              <span className="text-cyan-300 font-mono tabular-nums font-bold">
                                {countrySummary.totalSulamericanaBerths} SULA
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setSelectedComp(countrySummary.leagueId);
                            setActiveTab('table');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Ver Tabela
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                        {/* Coluna Libertadores */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                            <span>🏆 CONMEBOL Libertadores ({countrySummary.libertadoresClubs.length})</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {countrySummary.totalLibertadoresBerths} vagas
                            </span>
                          </div>

                          <div className="space-y-1">
                            {countrySummary.libertadoresClubs.map((entry) => {
                              const cObj = clubs.find((x) => x.id === entry.clubId);
                              if (!cObj) return null;
                              return (
                                <button
                                  key={entry.clubId}
                                  type="button"
                                  onClick={() => onInspectClub?.(cObj.id)}
                                  className="w-full flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-slate-800/80 text-left transition-colors cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black shrink-0"
                                      style={{
                                        backgroundColor: cObj.colors.primary,
                                        color: cObj.colors.text,
                                      }}
                                    >
                                      {cObj.initials.slice(0, 2)}
                                    </span>
                                    <span
                                      className={`truncate font-semibold ${
                                        cObj.id === userClub.id
                                          ? 'text-sky-300 font-black'
                                          : 'text-slate-100 group-hover:text-amber-300 transition-colors'
                                      }`}
                                    >
                                      {cObj.shortName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                                      Grupos
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                                      {entry.reason === 'Campeão da Copa do Brasil'
                                        ? 'CDB'
                                        : entry.reason === 'Campeão da Copa Argentina'
                                        ? 'Copa ARG'
                                        : `${entry.positionInLeague}º`}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                            {(countrySummary.country === 'Brasil' ||
                              countrySummary.country === 'Argentina') &&
                              countrySummary.libertadoresClubs.length <
                                countrySummary.totalLibertadoresBerths && (
                                <div className="w-full flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-amber-500/5 border border-dashed border-amber-500/30 text-left">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-black shrink-0 bg-amber-400/20 text-amber-300">
                                      🏆
                                    </span>
                                    <span className="truncate font-semibold text-amber-200/90 text-[11px]">
                                      {countrySummary.country === 'Brasil'
                                        ? 'Campeão da Copa do Brasil'
                                        : 'Campeão da Copa Argentina'}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono shrink-0">
                                    A definir
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Coluna Sul-Americana */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-cyan-400 flex items-center justify-between">
                            <span>🥈 CONMEBOL Sul-Americana ({countrySummary.sulamericanaClubs.length})</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {countrySummary.totalSulamericanaBerths} vagas
                            </span>
                          </div>

                          <div className="space-y-1">
                            {countrySummary.sulamericanaClubs.map((entry) => {
                              const cObj = clubs.find((x) => x.id === entry.clubId);
                              if (!cObj) return null;
                              return (
                                <button
                                  key={entry.clubId}
                                  type="button"
                                  onClick={() => onInspectClub?.(cObj.id)}
                                  className="w-full flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-slate-800/80 text-left transition-colors cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black shrink-0"
                                      style={{
                                        backgroundColor: cObj.colors.primary,
                                        color: cObj.colors.text,
                                      }}
                                    >
                                      {cObj.initials.slice(0, 2)}
                                    </span>
                                    <span
                                      className={`truncate font-semibold ${
                                        cObj.id === userClub.id
                                          ? 'text-sky-300 font-black'
                                          : 'text-slate-200 group-hover:text-cyan-300 transition-colors'
                                      }`}
                                    >
                                      {cObj.shortName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300">
                                      Grupos
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                                      {`${entry.positionInLeague}º`}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bloco Oficial: Transferência Fase 3 Pré-Libertadores para Sul-Americana */}
              {conmebolReport.preLibertadoresPhase3EliminatedIds.length > 0 && (
                <div className="bg-slate-900/80 border border-amber-600/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                      <span>🔄</span>
                      <span>Repescagem Oficial: Transferência Pré-Libertadores Fase 3 ➔ Copa Sul-Americana</span>
                    </div>
                    <span className="text-[11px] text-cyan-300 font-mono font-bold">
                      {conmebolReport.preLibertadoresPhase3EliminatedIds.length}/4 Vagas nos Grupos
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    De acordo com o regulamento oficial da CONMEBOL, as 4 equipes derrotadas na Fase 3 da Pré-Libertadores não são desclassificadas do cenário internacional: ganham vaga direta nos potes da <strong>Fase de Grupos da CONMEBOL Sul-Americana</strong>.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {conmebolReport.preLibertadoresPhase3EliminatedIds.map((cid) => {
                      const cObj = clubs.find((c) => c.id === cid);
                      if (!cObj) return null;
                      return (
                        <div
                          key={cid}
                          className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 flex items-center gap-2"
                        >
                          <span
                            className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black shrink-0"
                            style={{
                              backgroundColor: cObj.colors.primary,
                              color: cObj.colors.text,
                            }}
                          >
                            {cObj.initials.slice(0, 2)}
                          </span>
                          <span className="text-xs text-white font-semibold truncate">{cObj.shortName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: Knockout / Mata-Mata Bracket */}
      {activeTab === 'bracket' && (
        <div className="space-y-4">
          {renderEstadualSelectorBar(() => setSelectedBracketPhase('ALL'))}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          {(() => {
            const bracketPool = selectedComp === 'estadual' ? scopedFixtures : currentFixtures;
            const bracketSource =
              selectedComp === 'usa_mls'
                ? bracketPool.filter((f) => isMlsPlayoffFixture(f))
                : selectedComp === 'serie_b'
                ? bracketPool.filter((f) => f.id.startsWith('serie_b_playoff_'))
                : selectedComp === 'serie_c'
                ? bracketPool.filter((f) => f.id.startsWith('serie_c_playoff_'))
                : selectedComp === 'ger_bundesliga2'
                ? bracketPool.filter((f) => f.id.startsWith('ger_bundesliga2_playoff_'))
                : selectedComp === 'ger_bundesliga'
                ? (fixturesEurope?.ger_bundesliga2 || []).filter((f) =>
                    f.id.startsWith('ger_bundesliga2_playoff_')
                  )
                : selectedComp === 'fra_ligue2'
                ? bracketPool.filter((f) => f.id.startsWith('fra_ligue2_playoff_'))
                : selectedComp === 'fra_ligue1'
                ? (fixturesEurope?.fra_ligue2 || []).filter((f) =>
                    f.id.startsWith('fra_ligue2_playoff_')
                  )
                : selectedComp === 'esp_laliga2'
                ? bracketPool.filter((f) => f.id.startsWith('esp_laliga2_playoff_'))
                : selectedComp === 'ita_serie_b'
                ? bracketPool.filter((f) => f.id.startsWith('ita_serie_b_playoff_'))
                : isPureKnockoutComp(selectedComp)
                ? bracketPool
                : bracketPool.filter((f) => !(f.cupPhase || '').includes('Rodada '));
            const phases = Array.from(
              new Set(bracketSource.map((f) => f.cupPhase || 'Fase Eliminatória'))
            );
            const activePhaseFilter =
              selectedBracketPhase === 'ALL' || phases.includes(selectedBracketPhase)
                ? selectedBracketPhase
                : 'ALL';
            const visiblePhases =
              activePhaseFilter === 'ALL'
                ? phases
                : phases.filter((p) => p === activePhaseFilter);

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <span>{compMeta.badgeEmoji}</span>
                      <span>
                        {selectedComp === 'estadual'
                          ? `${activeEstadualGroup} · Mata-Mata ${seasonYear}`
                          : selectedComp === 'usa_mls'
                          ? `Audi MLS Cup Playoffs ${seasonYear}`
                          : selectedComp === 'eng_championship'
                          ? `EFL Championship · Playoffs de Acesso (3º ao 8º) ${seasonYear}`
                          : selectedComp === 'eng_league_two'
                          ? `EFL League Two · Playoffs de Acesso (4º ao 7º) ${seasonYear}`
                          : selectedComp === 'eng_league_one'
                          ? `EFL League One · Playoffs de Acesso (3º ao 6º) ${seasonYear}`
                          : selectedComp === 'ger_bundesliga' || selectedComp === 'ger_bundesliga2'
                          ? `Alemanha · Playoff de Acesso/Rebaixamento (Bundesliga 16º × 2. Bundesliga 3º) ${formatEuropeanSeason(europeSeasonYear ?? seasonYear)}`
                          : selectedComp === 'fra_ligue1' || selectedComp === 'fra_ligue2'
                          ? `França · Play-offs de Acesso (3º–5º) & Barrage Ligue 1/Ligue 2 ${formatEuropeanSeason(europeSeasonYear ?? seasonYear)}`
                          : selectedComp === 'esp_laliga2'
                          ? `LALIGA HYPERMOTION · Play-offs de Acesso (3º ao 6º) ${formatEuropeanSeason(europeSeasonYear ?? seasonYear)}`
                          : selectedComp === 'ita_serie_b'
                          ? `Serie BKT · Playoffs de Acesso (3º–8º) & Playout (16º × 17º) ${formatEuropeanSeason(europeSeasonYear ?? seasonYear)}`
                          : selectedComp === 'serie_b'
                          ? `Brasileirão Série B · Playoff de Acesso (3º ao 6º) ${seasonYear}`
                          : selectedComp === 'serie_c'
                          ? `Brasileirão Série C · Playoff de Acesso (4º ao 7º) ${seasonYear}`
                          : selectedComp === 'eng_community_shield'
                          ? `FA Community Shield · Wembley Stadium ${seasonYear}`
                          : selectedComp === 'uefa_supercup'
                          ? `Supercopa da UEFA · Campo Neutro (${formatEuropeanSeason(europeSeasonYear ?? seasonYear)})`
                          : selectedComp === 'eng_efl_cup'
                          ? `Carabao Cup (EFL Cup) · Chaveamento Oficial ${seasonYear}`
                          : selectedComp === 'eng_fa_cup'
                          ? `Emirates FA Cup · Chaveamento Oficial ${seasonYear}`
                          : selectedComp === 'afc_champions'
                          ? `Liga dos Campeões da AFC · Mata-Mata ${formatEuropeanSeason(europeSeasonYear ?? seasonYear)}`
                          : `Chaveamento Mata-Mata Oficial ${seasonYear}`}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedComp === 'estadual' && activeEstadualCfg
                        ? activeEstadualCfg.formatSummary
                        : compMeta.formatSummary}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
                    <span className="text-sky-400 font-bold">
                      {selectedComp === 'estadual'
                        ? `${groupedStandings[activeEstadualGroup]?.length || 12} clubes`
                        : `${compMeta.officialClubsCount} clubes`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{bracketSource.length} partidas eliminatórias</span>
                  </div>
                </div>

                {(selectedComp === 'ger_bundesliga' || selectedComp === 'ger_bundesliga2') && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-xs text-red-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-red-300">
                        🇩🇪 Regulamento Oficial · 2. Bundesliga ({formatEuropeanSeason(europeSeasonYear ?? seasonYear)})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        18 clubes em 34 rodadas. Os 2 primeiros (1º e 2º) sobem direto para a Bundesliga; o 3º colocado enfrenta o 16º da Bundesliga em jogos de Ida e Volta pelo Playoff de Acesso/Rebaixamento (vencedor joga a 1ª Divisão). Os 3 últimos (16º, 17º e 18º) são rebaixados.
                      </p>
                    </div>
                  </div>
                )}

                {(selectedComp === 'fra_ligue1' || selectedComp === 'fra_ligue2') && (
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-3.5 text-xs text-blue-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-blue-300">
                        🇫🇷 Regulamento Oficial · Ligue 2 BKT & Barrage ({formatEuropeanSeason(europeSeasonYear ?? seasonYear)})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        18 clubes em 34 rodadas. 1º e 2º sobem direto para a Ligue 1. Play-offs Internos (jogo único, empate vai direto para pênaltis): Play-off 1 (4º em casa × 5º) e Play-off 2 (3º em casa × vencedor PO1). O vencedor disputa o Barrage em Ida (casa da Ligue 2) e Volta (casa do 16º da Ligue 1) por uma vaga na elite. Os 3 últimos (16º–18º) são rebaixados.
                      </p>
                    </div>
                  </div>
                )}

                {selectedComp === 'esp_laliga2' && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-amber-300">
                        🇪🇸 Regulamento Oficial · LALIGA HYPERMOTION ({formatEuropeanSeason(europeSeasonYear ?? seasonYear)})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        22 clubes em 42 rodadas (turno e returno). 1º e 2º sobem direto para a LaLiga EA Sports. Do 3º ao 6º disputam os Play-offs de Acesso em Ida e Volta: Semifinais (6º × 3º e 5º × 4º, com 3º e 4º decidindo a volta em casa) e Final em Ida e Volta (melhor campanha decide a volta em casa) pela 3ª e última vaga na elite. Os 4 últimos (19º ao 22º) são rebaixados à Primera Federación.
                      </p>
                    </div>
                  </div>
                )}

                {selectedComp === 'ita_serie_b' && (
                  <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-3.5 text-xs text-sky-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-sky-300">
                        🇮🇹 Regulamento Oficial · Serie BKT ({formatEuropeanSeason(europeSeasonYear ?? seasonYear)})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        20 clubes em 38 rodadas. 1º e 2º sobem direto à Serie A (o 3º também sobe direto sem playoffs se abrir 15+ pontos sobre o 4º). Caso contrário, 3º ao 8º disputam Playoffs de Acesso em Ida e Volta: Quartas (5º × 8º e 6º × 7º), Semifinais (3º × Venc. 6º/7º e 4º × Venc. 5º/8º) e Final pela 3ª vaga. Na parte de baixo, 18º–20º caem direto à Serie C e 16º × 17º disputam o Playout em Ida e Volta definindo o 4º rebaixado.
                      </p>
                    </div>
                  </div>
                )}

                {selectedComp === 'serie_b' && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-amber-300">
                        🥈 Regulamento Oficial · Brasileirão Série B ({seasonYear})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        20 clubes em 38 rodadas. 1º e 2º sobem direto para a Série A; 3º x 6º e 4º x 5º disputam o Playoff de Acesso em jogos de Ida e Volta (3º e 4º decidem a volta em casa) e os 2 vencedores garantem acesso à Série A. Os 4 últimos (17º ao 20º) são rebaixados à Série C.
                      </p>
                    </div>
                  </div>
                )}

                {selectedComp === 'serie_c' && (
                  <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-3.5 text-xs text-sky-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-sky-300">
                        🏆 Regulamento Oficial · Brasileirão Série C ({seasonYear})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        24 clubes em turno e returno (46 rodadas, encerramento em Novembro). 1º ao 3º sobem direto para a Série B; 4º x 7º e 5º x 6º disputam Semifinais em Ida e Volta (melhor campanha decide em casa), e os vencedores fazem a Final em Jogo Único pela 4ª vaga de acesso. 21º ao 24º caem para a Série D.
                      </p>
                    </div>
                  </div>
                )}

                {selectedComp === 'concacaf_champions' && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-amber-300">
                        🏆 Regulamento Oficial · Copa dos Campeões da CONCACAF ({seasonYear})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        27 clubes (Fev–Mai): 5 campeões entram direto nas Oitavas + 22 clubes na 1ª Rodada (México 6, EUA 8, Canadá 4, América Central 6, Caribe 3). Mata-mata ida e volta com gol fora até a Semifinal; Final em jogo único garante vaga na Copa Intercontinental FIFA e no Super Mundial de Clubes.
                      </p>
                    </div>
                  </div>
                )}

                {selectedComp === 'uefa_supercup' && (
                  <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-3.5 text-xs text-sky-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-sky-300">
                        🌟 Regulamento Oficial · Supercopa da UEFA ({formatEuropeanSeason(europeSeasonYear ?? seasonYear)})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Disputada em partida única em campo neutro na abertura da temporada europeia (agosto), entre o campeão da UEFA Champions League e o campeão da UEFA Europa League. Em caso de empate após os 90 minutos, sem prorrogação — decisão direta nos pênaltis. Cada clube relaciona 23 atletas (11 titulares + 12 no banco) com até 5 substituições. Premiação fixa: € 5 milhões (R$ 31M) ao campeão e € 4 milhões (R$ 24,8M) ao vice.
                      </p>
                    </div>
                  </div>
                )}

                {selectedComp === 'afc_champions' && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-amber-300">
                        🐉 Fase Final · Liga dos Campeões de Elite da AFC ({formatEuropeanSeason(europeSeasonYear ?? seasonYear)})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Oitavas de Final (Março) em ida e volta dentro de cada conferência (1ºx8º, 4ºx5º, 2ºx7º, 3ºx6º; sem regra do gol fora, empate vai direto aos pênaltis). Quartas de Final (cruzamento Oeste x Leste), Semifinais e Grande Final (01/05) em jogo único centralizados na Arábia Saudita (Jeddah e Riyadh).
                      </p>
                    </div>
                  </div>
                )}

                {selectedComp === 'libertadores' && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-amber-300">
                        🌎 Mata-Mata Oficial · CONMEBOL Libertadores ({saSeasonYear ?? seasonYear})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Os 2 primeiros de cada grupo (16 clubes) disputam Oitavas, Quartas e Semifinais em jogos de ida e volta até a Grande Final em jogo único. Os 8 terceiros colocados dos grupos avançam aos Playoffs da Copa Sul-Americana.
                      </p>
                    </div>
                  </div>
                )}

                {selectedComp === 'sulamericana' && (
                  <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-3.5 text-xs text-cyan-100/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-black text-cyan-300">
                        🌐 Playoffs &amp; Mata-Mata · CONMEBOL Sul-Americana ({saSeasonYear ?? seasonYear})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Os 8 líderes de grupo entram direto nas Oitavas de Final (decidindo a volta em casa). Nos Playoffs (Ida e Volta), os 8 segundos colocados da Sul-Americana enfrentam os 8 terceiros colocados dos grupos da Libertadores — os 8 vencedores completam as Oitavas de Final.
                      </p>
                    </div>
                  </div>
                )}

                {/* Interactive Phase Filter Tabs when tournament has multiple phases */}
                {phases.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedBracketPhase('ALL');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        activePhaseFilter === 'ALL'
                          ? 'bg-sky-400 text-slate-950 font-black'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Todas as Fases ({phases.length})
                    </button>
                    {phases.map((pName) => {
                      const count = bracketSource.filter(
                        (f) => (f.cupPhase || 'Fase Eliminatória') === pName
                      ).length;
                      return (
                        <button
                          key={pName}
                          onClick={() => {
                            soundEngine.playClick();
                            setSelectedBracketPhase(pName);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                            activePhaseFilter === pName
                              ? 'bg-sky-400 text-slate-950 font-black'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {pName} <span className="font-mono tabular-nums opacity-75">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-6">
                  {visiblePhases.map((phaseName) => {
                    const phaseFixtures = bracketSource.filter(
                      (f) => (f.cupPhase || 'Fase Eliminatória') === phaseName
                    );

                    return (
                      <div key={phaseName} className="space-y-3">
                        <div className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-sky-400 border-b border-slate-800/80 pb-1.5">
                          <div className="flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" />
                            <span>{phaseName}</span>
                          </div>
                          <span className="text-[11px] font-mono tabular-nums text-slate-500 normal-case font-semibold">
                            {phaseFixtures.length} jogo(s)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {phaseFixtures.map((fix) => {
                            const home =
                              !fix.homeTeamId.toUpperCase().startsWith('TBD')
                                ? clubs.find((c) => c.id === fix.homeTeamId)
                                : undefined;
                            const away =
                              !fix.awayTeamId.toUpperCase().startsWith('TBD')
                                ? clubs.find((c) => c.id === fix.awayTeamId)
                                : undefined;
                            const homeLabel = home
                              ? home.shortName
                              : fix.homeTeamId.toUpperCase().startsWith('TBD_MLS_') ||
                                fix.homeTeamId === 'TBD_SERIE_2X0'
                              ? getMlsPlayoffSlotLabel(fix.homeTeamId)
                              : fix.homeTeamId.toUpperCase().startsWith('TBD_')
                              ? getIntercontinentalSlotLabel(fix.homeTeamId)
                              : 'A Definir';
                            const awayLabel = away
                              ? away.shortName
                              : fix.awayTeamId.toUpperCase().startsWith('TBD_MLS_') ||
                                fix.awayTeamId === 'TBD_SERIE_2X0'
                              ? getMlsPlayoffSlotLabel(fix.awayTeamId)
                              : fix.awayTeamId.toUpperCase().startsWith('TBD_')
                              ? getIntercontinentalSlotLabel(fix.awayTeamId)
                              : 'A Definir';
                            const isSkippedMlsG3 = isMlsSkippedBestOfThreeFixture(fix);

                            return (
                              <div
                                key={fix.id}
                                className={`p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2 shadow-md hover:border-slate-700 transition-all ${
                                  isSkippedMlsG3 ? 'opacity-55' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-[120px] flex-1">
                                    <div
                                      className="w-6 h-6 rounded flex items-center justify-center font-black text-[10px] shrink-0"
                                      style={{
                                        backgroundColor: home ? home.colors.primary : '#1e293b',
                                        color: home ? home.colors.text : '#94a3b8',
                                      }}
                                    >
                                      {home ? home.initials : 'TBD'}
                                    </div>
                                    <span
                                      className={`text-xs font-bold truncate ${
                                        !home
                                          ? 'text-slate-400 italic'
                                          : fix.homeTeamId === userClub.id
                                          ? 'text-sky-300'
                                          : 'text-white'
                                      }`}
                                    >
                                      {homeLabel}
                                    </span>
                                  </div>

                                  <div className="text-center font-mono tabular-nums shrink-0">
                                    {isSkippedMlsG3 ? (
                                      <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded">
                                        Série 2–0 (Disp.)
                                      </span>
                                    ) : fix.played ? (
                                      <>
                                        <span className="px-2.5 py-1 rounded bg-black border border-slate-800 text-sky-300 font-black text-xs">
                                          {fix.homeScore} x {fix.awayScore}
                                        </span>
                                        {fix.penaltiesHome !== undefined && fix.penaltiesAway !== undefined && (
                                          <span className="text-[9px] text-amber-300 font-bold block mt-0.5">
                                            (Pên: {fix.penaltiesHome} x {fix.penaltiesAway})
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-semibold bg-slate-950 px-2 py-0.5 rounded">
                                        {fix.time || '21:30'}
                                      </span>
                                    )}
                                    {fix.leg && (
                                      <span className="text-[9px] text-slate-500 block mt-0.5">
                                        {fix.leg === 1 ? 'Jogo de Ida' : 'Jogo de Volta'}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 min-w-[120px] flex-1 justify-end">
                                    <span
                                      className={`text-xs font-bold truncate text-right ${
                                        !away
                                          ? 'text-slate-400 italic'
                                          : fix.awayTeamId === userClub.id
                                          ? 'text-sky-300'
                                          : 'text-white'
                                      }`}
                                    >
                                      {awayLabel}
                                    </span>
                                    <div
                                      className="w-6 h-6 rounded flex items-center justify-center font-black text-[10px] shrink-0"
                                      style={{
                                        backgroundColor: away ? away.colors.primary : '#1e293b',
                                        color: away ? away.colors.text : '#94a3b8',
                                      }}
                                    >
                                      {away ? away.initials : 'TBD'}
                                    </div>
                                  </div>
                                </div>

                                {(fix.date || fix.stadiumName) && (
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/70">
                                    <span>{fix.date ? formatCalendarDate(fix.date) : ''}</span>
                                    {fix.stadiumName && (
                                      <span className="text-slate-500 truncate max-w-[180px]">{fix.stadiumName}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
          </div>
        </div>
      )}

      {/* TAB: Central de Estatísticas (Artilharia, Assistências, G+A, Disciplina) */}
      {activeTab === 'stats' && (
        <div className="space-y-5">
          {/* Competition Telemetry KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">Gols na Competição</span>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-black text-white font-mono tabular-nums">
                  {compSummary.totalGoals}
                </span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {compSummary.playedMatches} jogos
                </span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">Média por Partida</span>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-black text-sky-400 font-mono tabular-nums">
                  {compSummary.avgGoalsPerMatch.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400">gols / jogo</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">Assistências Diretas</span>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
                  {compSummary.totalAssists}
                </span>
                <span className="text-xs text-slate-400">passes decisivos</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">Cartões Aplicados</span>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-black text-amber-400 font-mono tabular-nums">
                  {compSummary.totalYellowCards} CA · {compSummary.totalRedCards} CV
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-white text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Central de Estatísticas · {compMeta.name}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dados consolidados exclusivamente das partidas disputadas nesta competição
                </p>
              </div>

              {/* Interactive Segmented Ranking Filter */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
                {(
                  [
                    { id: 'goals', label: 'Artilharia' },
                    { id: 'assists', label: 'Garçons (Assist.)' },
                    { id: 'ga', label: 'Participações (G+A)' },
                    { id: 'discipline', label: 'Disciplina' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      soundEngine.playClick();
                      setStatsCategory(cat.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      statsCategory === cat.id
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {rankedStatsList.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-slate-300 font-semibold text-sm">
                  Nenhum registro contabilizado nesta categoria ainda.
                </p>
                <p className="text-slate-500 text-xs">
                  Assim que as partidas de {compMeta.name} forem disputadas, o ranking será preenchido automaticamente.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3 w-12 text-center">#</th>
                      <th className="py-3 px-4">Atleta</th>
                      <th className="py-3 px-4">Clube</th>
                      <th className="py-3 px-3 text-center">Pos</th>
                      <th className="py-3 px-3 text-center">OVR</th>
                      <th className="py-3 px-3 text-right">Jogos</th>
                      {statsCategory === 'discipline' ? (
                        <>
                          <th className="py-3 px-3 text-right text-amber-400">Amarelos</th>
                          <th className="py-3 px-3 text-right text-rose-400">Vermelhos</th>
                          <th className="py-3 px-4 text-right font-black text-white">Índice Disc.</th>
                        </>
                      ) : (
                        <>
                          <th
                            className={`py-3 px-3 text-right ${
                              statsCategory === 'goals' ? 'font-black text-amber-400' : 'text-slate-300'
                            }`}
                          >
                            Gols
                          </th>
                          <th
                            className={`py-3 px-3 text-right ${
                              statsCategory === 'assists' ? 'font-black text-emerald-400' : 'text-slate-300'
                            }`}
                          >
                            Assist.
                          </th>
                          <th
                            className={`py-3 px-3 text-right ${
                              statsCategory === 'ga' ? 'font-black text-sky-400' : 'text-slate-300'
                            }`}
                          >
                            G + A
                          </th>
                          <th className="py-3 px-4 text-right text-slate-400">Média G/J</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {rankedStatsList.map((item, idx) => {
                      const isUserClubPlayer = item.club.id === userClub.id;
                      return (
                        <tr
                          key={item.player.id}
                          className={
                            isUserClubPlayer ? 'bg-sky-500/10' : 'hover:bg-slate-900/50 transition-colors'
                          }
                        >
                          <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold ${
                                  isUserClubPlayer ? 'text-sky-300 font-black' : 'text-white'
                                }`}
                              >
                                {item.player.name}
                              </span>
                              {item.player.specialSkill !== 'Normal' && (
                                <span className="text-[11px] text-slate-400">
                                  · {item.player.specialSkill}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded text-[9px] font-black flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: item.club.colors.primary,
                                  color: item.club.colors.text,
                                }}
                              >
                                {item.club.initials.slice(0, 2)}
                              </div>
                              <span className="text-slate-200">{item.club.shortName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {item.player.detailedRole}
                          </td>
                          <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-sky-400">
                            {item.player.overall}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                            {item.matchesPlayed}
                          </td>
                          {statsCategory === 'discipline' ? (
                            <>
                              <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                                {item.yellowCards}
                              </td>
                              <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-rose-400">
                                {item.redCards}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums font-black text-white">
                                {item.disciplinePoints} pts
                              </td>
                            </>
                          ) : (
                            <>
                              <td
                                className={`py-3 px-3 text-right font-mono tabular-nums ${
                                  statsCategory === 'goals'
                                    ? 'font-black text-amber-400 text-sm'
                                    : 'text-slate-200'
                                }`}
                              >
                                {item.goals}
                              </td>
                              <td
                                className={`py-3 px-3 text-right font-mono tabular-nums ${
                                  statsCategory === 'assists'
                                    ? 'font-black text-emerald-400 text-sm'
                                    : 'text-slate-200'
                                }`}
                              >
                                {item.assists}
                              </td>
                              <td
                                className={`py-3 px-3 text-right font-mono tabular-nums ${
                                  statsCategory === 'ga'
                                    ? 'font-black text-sky-400 text-sm'
                                    : 'font-bold text-slate-300'
                                }`}
                              >
                                {item.goalContributions}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                                {item.goalsPerMatch.toFixed(2)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Seleção da Rodada (11 Ideais + Craque da Rodada) */}
      {activeTab === 'totw' && (
        <div className="space-y-5">
          {/* Round Selector Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-300 whitespace-nowrap">
                Seleção da Rodada:
              </span>
              {playedRounds.length === 0 ? (
                <span className="text-xs text-slate-500">Nenhuma rodada concluída</span>
              ) : (
                <div className="flex items-center gap-1 overflow-x-auto max-w-xl pb-0.5">
                  {playedRounds.map((r, idx) => (
                    <button
                      key={r}
                      onClick={() => {
                        soundEngine.playClick();
                        setTotwRound(r);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap shrink-0 tabular-nums cursor-pointer transition-colors ${
                        effectiveTotwRound === r
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {compMeta.isCup ? `${idx + 1}ª Fase (R${r})` : `Rodada ${r}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-slate-400 font-mono tabular-nums">
              {teamOfTheRound.playedMatchesCount}/{teamOfTheRound.totalMatchesInRound} jogos avaliados · Formação 4-3-3
            </div>
          </div>

          {teamOfTheRound.lineup.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center space-y-2">
              <p className="text-slate-200 font-bold text-sm">
                A Seleção da Rodada ainda não foi definida para {compMeta.name}.
              </p>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                Dispute ou avance a primeira rodada desta competição para que os olheiros da imprensa elejam os 11 ideais e o Craque da Rodada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Visual 4-3-3 Tactical Pitch */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Os 11 Ideais · Rodada {teamOfTheRound.round}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {compMeta.name} · Notas oficiais baseadas em gols, assistências, saldo defensivo e resultado
                    </p>
                  </div>
                  {teamOfTheRound.userHonorees.length > 0 && (
                    <span className="text-xs font-semibold text-sky-300 font-mono tabular-nums whitespace-nowrap">
                      {teamOfTheRound.userHonorees.length} do {userClub.shortName}
                    </span>
                  )}
                </div>

                {/* Pitch SVG/CSS Canvas */}
                <div
                  className="relative w-full aspect-[4/4.6] max-h-[520px] rounded-xl overflow-hidden border border-emerald-800/60 select-none"
                  style={{
                    background:
                      'repeating-linear-gradient(0deg, #064e3b 0px, #064e3b 38px, #065f46 38px, #065f46 76px)',
                  }}
                >
                  {/* Pitch Markings */}
                  <div className="absolute inset-3 border border-white/25 rounded-sm pointer-events-none" />
                  <div className="absolute left-3 right-3 top-1/2 h-px bg-white/25 pointer-events-none" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/25 pointer-events-none" />
                  {/* Top Penalty Box */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2/5 h-16 border-x border-b border-white/25 pointer-events-none" />
                  {/* Bottom Penalty Box */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-2/5 h-16 border-x border-t border-white/25 pointer-events-none" />

                  {/* 11 Players on Pitch */}
                  {teamOfTheRound.lineup.map((slot) => {
                    const isUserPlayer = slot.club.id === userClub.id;
                    return (
                      <div
                        key={slot.slotId}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center w-24 sm:w-28"
                        style={{ left: `${slot.pitchX}%`, top: `${slot.pitchY}%` }}
                      >
                        <div className="relative">
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-[11px] shadow-lg border-2 ${
                              slot.isPlayerOfTheRound
                                ? 'border-amber-300 ring-2 ring-amber-400/50'
                                : isUserPlayer
                                ? 'border-sky-300 ring-2 ring-sky-400/40'
                                : 'border-white/80'
                            }`}
                            style={{
                              backgroundColor: slot.club.colors.primary,
                              color: slot.club.colors.text,
                            }}
                          >
                            {slot.club.initials.slice(0, 3)}
                          </div>
                          <span
                            className={`absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-black shadow ${
                              slot.isPlayerOfTheRound
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-950 text-emerald-300 border border-slate-700'
                            }`}
                          >
                            {slot.rating.toFixed(1)}
                          </span>
                        </div>

                        <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-800/90 max-w-full">
                          <p
                            className={`text-[10px] sm:text-[11px] font-bold truncate leading-tight ${
                              slot.isPlayerOfTheRound
                                ? 'text-amber-300'
                                : isUserPlayer
                                ? 'text-sky-300'
                                : 'text-white'
                            }`}
                          >
                            {slot.player.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono tabular-nums leading-tight">
                            {slot.slotLabel}
                            {slot.goalsInRound > 0 ? ` · ${slot.goalsInRound}G` : ''}
                            {slot.assistsInRound > 0 ? ` · ${slot.assistsInRound}A` : ''}
                            {slot.cleanSheet && (slot.player.position === 'GK' || slot.player.position === 'DF')
                              ? ' · SG'
                              : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Craque da Rodada Highlight + Full 11 Ideais Table */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {teamOfTheRound.playerOfTheRound && (
                  <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-2 text-xs text-amber-300 font-semibold">
                      <span>Craque da Rodada {teamOfTheRound.round}</span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {teamOfTheRound.playerOfTheRound.matchScoreLabel}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border border-white/20"
                          style={{
                            backgroundColor: teamOfTheRound.playerOfTheRound.club.colors.primary,
                            color: teamOfTheRound.playerOfTheRound.club.colors.text,
                          }}
                        >
                          {teamOfTheRound.playerOfTheRound.club.initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-black text-white truncate">
                            {teamOfTheRound.playerOfTheRound.player.name}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {teamOfTheRound.playerOfTheRound.club.name} ·{' '}
                            {teamOfTheRound.playerOfTheRound.player.detailedRole} · OVR{' '}
                            <span className="font-mono tabular-nums text-slate-200">
                              {teamOfTheRound.playerOfTheRound.player.overall}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-2xl font-black text-amber-400 font-mono tabular-nums block leading-none">
                          {teamOfTheRound.playerOfTheRound.rating.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400">Nota Oficial</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs text-slate-300 font-mono tabular-nums">
                      <span>{teamOfTheRound.playerOfTheRound.goalsInRound} gol(s)</span>
                      <span aria-hidden="true">·</span>
                      <span>{teamOfTheRound.playerOfTheRound.assistsInRound} assist.</span>
                      {teamOfTheRound.playerOfTheRound.savesInRound > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{teamOfTheRound.playerOfTheRound.savesInRound} defesa(s) difícil(eis)</span>
                        </>
                      )}
                      {teamOfTheRound.playerOfTheRound.cleanSheet && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Baliza Zero (SG)</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex-1">
                  <div className="px-4 py-3 bg-black border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Boletim dos 11 Selecionados</span>
                    <span className="text-[11px] text-slate-400 font-mono">Nota</span>
                  </div>
                  <div className="divide-y divide-slate-800/60">
                    {teamOfTheRound.lineup.map((slot) => {
                      const isUser = slot.club.id === userClub.id;
                      return (
                        <div
                          key={slot.slotId}
                          className={`px-4 py-2.5 flex items-center justify-between gap-2 text-xs ${
                            isUser ? 'bg-sky-500/10' : 'hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 font-mono text-[10px] font-bold text-slate-400 shrink-0">
                              {slot.slotLabel}
                            </span>
                            <div
                              className="w-5 h-5 rounded text-[9px] font-black flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: slot.club.colors.primary,
                                color: slot.club.colors.text,
                              }}
                            >
                              {slot.club.initials.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <span
                                className={`font-bold truncate block ${
                                  slot.isPlayerOfTheRound
                                    ? 'text-amber-300'
                                    : isUser
                                    ? 'text-sky-300'
                                    : 'text-white'
                                }`}
                              >
                                {slot.player.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                                {slot.matchScoreLabel}
                                {slot.goalsInRound > 0 ? ` · ${slot.goalsInRound}G` : ''}
                                {slot.assistsInRound > 0 ? ` · ${slot.assistsInRound}A` : ''}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`font-mono tabular-nums font-black text-xs shrink-0 ${
                              slot.isPlayerOfTheRound ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {slot.rating.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Fixtures by Round */}
      {activeTab === 'fixtures' && (
        <div className="space-y-4">
          {renderEstadualSelectorBar(() => setViewRound(1))}

          {/* Round Selector Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-300">
                {compMeta.isCup ? 'Rodada / Fase:' : 'Rodada:'}
              </span>
              <div className="flex items-center gap-1 overflow-x-auto max-w-xl pb-0.5">
                {availableRounds.map((r, idx) => (
                  <button
                    key={r}
                    onClick={() => {
                      soundEngine.playClick();
                      setViewRound(r);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap tabular-nums cursor-pointer transition-all ${
                      effectiveViewRound === r
                        ? 'bg-sky-400 text-slate-950 font-black shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {compMeta.isCup ? `${idx + 1}ª (R${r})` : r}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-400 font-mono tabular-nums">
              Total: {roundFixtures.length} partidas nesta rodada
            </span>
          </div>

          {/* Fixtures list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roundFixtures.map((fix) => {
              const home =
                !fix.homeTeamId.toUpperCase().startsWith('TBD')
                  ? clubs.find((c) => c.id === fix.homeTeamId)
                  : undefined;
              const away =
                !fix.awayTeamId.toUpperCase().startsWith('TBD')
                  ? clubs.find((c) => c.id === fix.awayTeamId)
                  : undefined;
              const homeName = home
                ? home.name
                : fix.homeTeamId.toUpperCase().startsWith('TBD_MLS_') ||
                  fix.homeTeamId === 'TBD_SERIE_2X0'
                ? getMlsPlayoffSlotLabel(fix.homeTeamId)
                : fix.homeTeamId.toUpperCase().startsWith('TBD_')
                ? getIntercontinentalSlotLabel(fix.homeTeamId)
                : 'A Definir';
              const awayName = away
                ? away.name
                : fix.awayTeamId.toUpperCase().startsWith('TBD_MLS_') ||
                  fix.awayTeamId === 'TBD_SERIE_2X0'
                ? getMlsPlayoffSlotLabel(fix.awayTeamId)
                : fix.awayTeamId.toUpperCase().startsWith('TBD_')
                ? getIntercontinentalSlotLabel(fix.awayTeamId)
                : 'A Definir';
              const isSkippedMlsG3 = isMlsSkippedBestOfThreeFixture(fix);
              const isUserGame = fix.homeTeamId === userClub.id || fix.awayTeamId === userClub.id;

              return (
                <div
                  key={fix.id}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isSkippedMlsG3 ? 'opacity-55 ' : ''
                  }${
                    isUserGame
                      ? 'bg-sky-950/20 border-sky-500/50 shadow-lg'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-[130px]">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0"
                      style={{
                        backgroundColor: home ? home.colors.primary : '#1e293b',
                        color: home ? home.colors.text : '#94a3b8',
                      }}
                    >
                      {home ? home.initials : 'TBD'}
                    </div>
                    <span
                      className={`text-xs font-bold truncate ${
                        !home
                          ? 'text-slate-400 italic'
                          : fix.homeTeamId === userClub.id
                          ? 'text-sky-300 font-black'
                          : 'text-white'
                      }`}
                    >
                      {homeName}
                    </span>
                  </div>

                  <div className="text-center font-mono tabular-nums shrink-0">
                    {isSkippedMlsG3 ? (
                      <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-700/40 px-2.5 py-1 rounded">
                        Série 2–0 (Disp.)
                      </span>
                    ) : fix.played ? (
                      <>
                        <span className="px-3 py-1 rounded-lg bg-black text-sky-300 font-black text-sm border border-slate-800">
                          {fix.homeScore} x {fix.awayScore}
                        </span>
                        {fix.penaltiesHome !== undefined && fix.penaltiesAway !== undefined && (
                          <span className="text-[10px] text-amber-300 font-bold block mt-0.5">
                            (Pên: {fix.penaltiesHome} x {fix.penaltiesAway})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold px-2.5 py-1 bg-slate-900 rounded">
                        {fix.time || '16:00'}
                      </span>
                    )}
                    {fix.cupPhase && (
                      <span className="text-[9px] text-sky-400/80 block mt-1 truncate max-w-[140px]">
                        {fix.cupPhase}
                      </span>
                    )}
                    {fix.date && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {formatCalendarDate(fix.date)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-1 justify-end min-w-[130px]">
                    <span
                      className={`text-xs font-bold truncate text-right ${
                        !away
                          ? 'text-slate-400 italic'
                          : fix.awayTeamId === userClub.id
                          ? 'text-sky-300 font-black'
                          : 'text-white'
                      }`}
                    >
                      {awayName}
                    </span>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0"
                      style={{
                        backgroundColor: away ? away.colors.primary : '#1e293b',
                        color: away ? away.colors.text : '#94a3b8',
                      }}
                    >
                      {away ? away.initials : 'TBD'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Cup Draw Ceremony Modal */}
      <CupDrawModal
        isOpen={isDrawModalOpen}
        onClose={() => setIsDrawModalOpen(false)}
        competition={selectedComp}
        seasonYear={seasonYear}
        clubs={clubs}
        userClubId={userClub.id}
        fixtures={currentFixtures}
        standings={currentStandings}
        canGenerateDraw={canGenerateActiveDraw}
        alreadyDrawn={isActiveCompDrawn}
        onGenerateDraw={(comp) => {
          onGenerateCompetitionDraw?.(comp);
        }}
        onCompleteDraw={(comp) => {
          onMarkCompetitionDrawn?.(comp);
        }}
      />
    </div>
  );
};

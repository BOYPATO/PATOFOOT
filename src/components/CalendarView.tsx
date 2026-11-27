import React, { useState, useMemo, useEffect } from 'react';
import {
  Club,
  CompetitionType,
  Fixture,
  InternationalMatchFixture,
  NationalTeamState,
} from '../types/game';
import { soundEngine } from '../services/soundEngine';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  FastForward,
  Clock,
  MapPin,
  Dumbbell,
  Trophy,
  List,
  Grid,
  Globe,
  Plane,
  Users,
  AlertTriangle,
  Zap,
  X,
} from 'lucide-react';
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  formatCalendarDate,
  formatShortDate,
  daysBetween,
  getMonthCalendarGrid,
  toDateString,
  formatEuropeanSeason,
} from '../utils/calendarUtils';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { getMatchRivalryInfo } from '../utils/rivalryEngine';
import {
  MIN_MATCH_REST_HOURS,
  getHoursBetweenFixtures,
} from '../utils/scheduleConflictResolver';
import {
  FIFA_SOLIDARITY_COMPENSATION_PER_PLAYER,
  FifaCalendarWindow,
  getAllInternationalFixtures,
  getClubReleasedPlayersForFifa,
  getFifaCalendarWindowsForYear,
  getFifaWindowForDate,
  getNationalTeamById,
  getTeamAllInternationalFixtures,
  getUpcomingOrActiveFifaWindow,
  getUpcomingUserSelecaoFixture,
} from '../utils/nationalTeamEngine';
import { getTransferWindowStatus } from '../utils/transferWindowEngine';
import {
  FriendlyPackageId,
  getFriendlyPackagesForClub,
} from '../utils/friendlyTourEngine';
import { isSplitCalendarClub } from '../utils/worldLeaguesEngine';

export interface OfficialFifaScheduleItem {
  id: string;
  season: string;
  periodLabel: string;
  name: string;
  badge: string;
  startDate: string;
  endDate: string;
  description: string;
  matchesNote: string;
  region?: 'CONMEBOL' | 'UEFA' | 'GLOBAL';
  isSuper?: boolean;
  isEuro?: boolean;
  isWorldCup?: boolean;
  isCopaAmerica?: boolean;
  isWomensWorldCup?: boolean;
  isCentenario?: boolean;
  isUefaClub?: boolean;
  isSupercup?: boolean;
}

export const OFFICIAL_FIFA_SCHEDULE_2026_2030: OfficialFifaScheduleItem[] = [
  // 2026 (Pré & Pós-Copa do Mundo)
  {
    id: 'fifa_guide_2026_mar',
    season: 'Temporada 2026',
    periodLabel: '23 a 31 de março de 2026',
    name: 'Amistosos de Março 2026 (Pré-Copa)',
    badge: 'Amistosos (2 jogos)',
    startDate: '2026-03-23',
    endDate: '2026-03-31',
    matchesNote: '2 jogos preparatórios oficiais por seleção',
    description: '23 a 31 de março de 2026: Amistosos Internacionais preparatórios pré-Copa (2 jogos).',
    region: 'GLOBAL',
  },
  {
    id: 'fifa_guide_2026_jun',
    season: 'Temporada 2026',
    periodLabel: '1 a 9 de junho de 2026',
    name: 'Amistosos de Junho 2026 (Pré-Copa)',
    badge: 'Amistosos (2 jogos)',
    startDate: '2026-06-01',
    endDate: '2026-06-09',
    matchesNote: '2 jogos finais antes da Copa do Mundo',
    description: '1 a 9 de junho de 2026: Amistosos Internacionais finais preparatórios para a Copa do Mundo (2 jogos).',
    region: 'GLOBAL',
  },
  {
    id: 'uefa_supercup_2026',
    season: 'Temporada 2026',
    periodLabel: '12 de agosto de 2026 (quarta-feira)',
    name: 'Supercopa da UEFA 2026 (Salzburgo)',
    badge: 'Supercopa da UEFA',
    startDate: '2026-08-12',
    endDate: '2026-08-12',
    matchesNote: 'Paris Saint-Germain x Aston Villa · Red Bull Arena (Áustria)',
    description: '12 de agosto de 2026: Supercopa da UEFA na Red Bull Arena (Stadion Salzburg), em Salzburgo, entre PSG e Aston Villa.',
    region: 'UEFA',
    isSupercup: true,
  },
  {
    id: 'comm_shield_2026',
    season: 'Temporada 2026',
    periodLabel: '16 de agosto de 2026 (domingo)',
    name: 'FA Community Shield 2026 (Cardiff)',
    badge: 'Supercopa da Inglaterra',
    startDate: '2026-08-16',
    endDate: '2026-08-16',
    matchesNote: 'Arsenal (Campeão) x Manchester City · Millennium Stadium (Cardiff)',
    description: '16 de agosto de 2026: Decisão da Supercopa da Inglaterra no Millennium Stadium em Cardiff.',
    region: 'UEFA',
    isSupercup: true,
  },
  {
    id: 'ger_supercup_2026',
    season: 'Temporada 2026',
    periodLabel: '22 de agosto de 2026 (sábado)',
    name: 'Franz Beckenbauer Supercup (Alemanha)',
    badge: 'Supercopa da Alemanha',
    startDate: '2026-08-22',
    endDate: '2026-08-22',
    matchesNote: 'Borussia Dortmund x Bayern de Munique',
    description: '22 de agosto de 2026: Supercopa da Alemanha entre Borussia Dortmund e Bayern de Munique.',
    region: 'UEFA',
    isSupercup: true,
  },
  {
    id: 'esp_laliga_start_2026',
    season: 'Temporada 2026',
    periodLabel: '14 a 16 de agosto de 2026',
    name: 'Estreia de La Liga 2026/27 (Espanha)',
    badge: 'Abertura La Liga',
    startDate: '2026-08-14',
    endDate: '2026-08-16',
    matchesNote: 'Real Madrid estreia contra a Real Sociedad no Bernabéu',
    description: '14 a 16 de agosto de 2026: Início oficial de La Liga até 30 de maio de 2027. Barcelona defende o título.',
    region: 'UEFA',
    isUefaClub: true,
  },
  {
    id: 'eng_premier_start_2026',
    season: 'Temporada 2026',
    periodLabel: '21 e 22 de agosto de 2026',
    name: 'Estreia da Premier League 2026/27 (Inglaterra)',
    badge: 'Abertura Premier League',
    startDate: '2026-08-21',
    endDate: '2026-08-22',
    matchesNote: 'Arsenal (atual campeão) estreia em casa contra o Coventry',
    description: '21 e 22 de agosto de 2026: Início oficial da Premier League até 30 de maio de 2027.',
    region: 'UEFA',
    isUefaClub: true,
  },
  {
    id: 'ger_bundesliga_start_2026',
    season: 'Temporada 2026',
    periodLabel: '28 de agosto de 2026 (sexta-feira)',
    name: 'Abertura da Bundesliga 2026/27 (Alemanha)',
    badge: 'Abertura Bundesliga',
    startDate: '2026-08-28',
    endDate: '2026-08-28',
    matchesNote: 'Bayern de Munique (campeão) x Stuttgart na Allianz Arena',
    description: '28 de agosto de 2026: Jogo de abertura oficial da Bundesliga até 22 de maio de 2027.',
    region: 'UEFA',
    isUefaClub: true,
  },
  {
    id: 'fifa_guide_2026_wc',
    season: 'Temporada 2026',
    periodLabel: 'junho/julho (11 de junho a 19 de julho de 2026)',
    name: 'Copa do Mundo FIFA de 2026 (EUA, México e Canadá)',
    badge: 'Copa do Mundo (48 Seleções)',
    startDate: '2026-06-11',
    endDate: '2026-07-19',
    matchesNote: 'Edição histórica com 48 seleções',
    description: '11 de junho a 19 de julho: Copa do Mundo FIFA de 2026 (Estados Unidos, México e Canadá).',
    region: 'GLOBAL',
    isWorldCup: true,
  },
  {
    id: 'fifa_guide_2026_super_sep_oct',
    season: 'Temporada 2026',
    periodLabel: '21 de setembro a 6 de outubro de 2026',
    name: 'Data FIFA de Setembro/Outubro 2026',
    badge: 'Data FIFA (4 jogos)',
    startDate: '2026-09-21',
    endDate: '2026-10-06',
    matchesNote: 'Janela estendida de 16 dias com 4 jogos por seleção',
    description: '21 de setembro a 6 de outubro de 2026: Data FIFA estendida com 4 jogos por seleção.',
    region: 'GLOBAL',
    isSuper: true,
  },
  {
    id: 'fifa_guide_2026_nov',
    season: 'Temporada 2026',
    periodLabel: '9 a 17 de novembro de 2026',
    name: 'Data FIFA de Novembro 2026',
    badge: 'Data FIFA (2 jogos)',
    startDate: '2026-11-09',
    endDate: '2026-11-17',
    matchesNote: '2 jogos oficiais por seleção',
    description: '9 a 17 de novembro de 2026: Data FIFA tradicional (2 jogos).',
    region: 'GLOBAL',
  },

  // 2027
  {
    id: 'esp_supercup_2027',
    season: 'Temporada 2027',
    periodLabel: '2 a 7 de fevereiro de 2027',
    name: 'Supercopa da Espanha 2027',
    badge: 'Supercopa da Espanha',
    startDate: '2027-02-02',
    endDate: '2027-02-06',
    matchesNote: 'Semis: Barcelona x Atl. Madrid (02/02), Real Sociedad x Real Madrid (03/02) · Final: 06/02',
    description: '2 a 7 de fevereiro de 2027: Supercopa da Espanha com semifinais nos dias 2 e 3 e Grande Final em 6 de fevereiro de 2027.',
    region: 'UEFA',
    isSupercup: true,
  },
  {
    id: 'fifa_guide_2027_mar',
    season: 'Temporada 2027',
    periodLabel: '22 a 30 de março de 2027',
    name: 'Data FIFA de Março 2027 · Quartas Nations League & Início Elim. Euro 2028',
    badge: 'Nations League QF (Ida/Volta) & Elim. Euro (Grupos G–L)',
    startDate: '2027-03-22',
    endDate: '2027-03-30',
    matchesNote: '2 jogos oficiais · Quartas Nations League 2026/27 (25–30/03) + Grupos de 5 da Euro 2028',
    description: '22 a 30 de março de 2027: Quartas de Final ida e volta da UEFA Nations League 2026/27 (Top 2 da Liga A), início dos 6 grupos de 5 (G–L) das Eliminatórias da Eurocopa 2028 e abertura das Eliminatórias CONMEBOL.',
    region: 'GLOBAL',
  },
  {
    id: 'uel_final_2027',
    season: 'Temporada 2027',
    periodLabel: '26 de maio de 2027 (quarta-feira)',
    name: 'Final da UEFA Europa League 2026/27 (Frankfurt)',
    badge: 'Final UEFA Europa League',
    startDate: '2027-05-26',
    endDate: '2027-05-26',
    matchesNote: 'Waldstadion, em Frankfurt, na Alemanha',
    description: '26 de maio de 2027: Grande Final da UEFA Europa League no Waldstadion, em Frankfurt.',
    region: 'UEFA',
    isUefaClub: true,
  },
  {
    id: 'uecl_final_2027',
    season: 'Temporada 2027',
    periodLabel: '2 de junho de 2027 (quarta-feira)',
    name: 'Final da UEFA Conference League 2026/27 (Istambul)',
    badge: 'Final UEFA Conference League',
    startDate: '2027-06-02',
    endDate: '2027-06-02',
    matchesNote: 'Beşiktaş Stadium, em Istambul, na Turquia',
    description: '2 de junho de 2027: Grande Final da UEFA Conference League no Beşiktaş Stadium, em Istambul.',
    region: 'UEFA',
    isUefaClub: true,
  },
  {
    id: 'ucl_final_2027',
    season: 'Temporada 2027',
    periodLabel: '5 de junho de 2027 (sábado)',
    name: 'Final da UEFA Champions League 2026/27 (Madrid)',
    badge: 'Final UEFA Champions League',
    startDate: '2027-06-05',
    endDate: '2027-06-05',
    matchesNote: 'Estádio Metropolitano, em Madrid, na Espanha',
    description: '5 de junho de 2027: Grande Final da UEFA Champions League no Estádio Metropolitano, em Madrid.',
    region: 'UEFA',
    isUefaClub: true,
  },
  {
    id: 'fifa_guide_2027_jun',
    season: 'Temporada 2027',
    periodLabel: '7 a 15 de junho de 2027',
    name: 'Data FIFA de Junho 2027 · Final Four UEFA Nations League 2026/27',
    badge: 'Final Four Nations League & Elim. Euro (G–L)',
    startDate: '2027-06-07',
    endDate: '2027-06-15',
    matchesNote: 'Final Four Nations League 2026/27 + Rodadas 3–4 Elim. Euro (Grupos G–L) · Sem parada do Brasileirão',
    description: '7 a 15 de junho de 2027: Decisão do título no Final Four da UEFA Nations League 2026/27 (Semifinais e Final) e rodadas 3 e 4 dos grupos de 5 das Eliminatórias da Eurocopa 2028.',
    region: 'UEFA',
  },
  {
    id: 'fifa_guide_2027_copa_ouro',
    season: 'Temporada 2027',
    periodLabel: '17 de junho a 11 de julho de 2027',
    name: 'Copa Ouro da CONCACAF 2027 (16 Seleções)',
    badge: 'Copa Ouro Bienal · CONCACAF',
    startDate: '2027-06-17',
    endDate: '2027-07-11',
    matchesNote: '16 seleções (4 grupos de 4 + Quartas, Semis e Final)',
    description: '17 de junho a 11 de julho de 2027: Copa Ouro da CONCACAF em ciclo bienal oficial (anos ímpares: 2027, 2029, 2031, 2033, 2035, 2037).',
    region: 'GLOBAL',
    isCopaAmerica: true,
  },
  {
    id: 'fifa_guide_2027_super_sep_oct',
    season: 'Temporada 2027',
    periodLabel: '20 de setembro a 5 de outubro de 2027',
    name: 'Super Data FIFA de Setembro/Outubro 2027',
    badge: 'Super Data FIFA (16 dias / até 4 jogos)',
    startDate: '2027-09-20',
    endDate: '2027-10-05',
    matchesNote: 'Janela estendida oficial de 16 dias / até 4 jogos · Eliminatórias OFC & CONCACAF',
    description: '20 de setembro a 5 de outubro: Super Data FIFA (janela estendida), com Eliminatórias da Copa da Oceania (OFC) e abertura das Eliminatórias CONCACAF para a Copa 2030.',
    region: 'GLOBAL',
    isSuper: true,
  },
  {
    id: 'fifa_guide_2027_nov',
    season: 'Temporada 2027',
    periodLabel: '8 a 16 de novembro de 2027',
    name: 'Data FIFA de Novembro 2027 · Fim Grupos Elim. Euro 2028',
    badge: 'Fim Fase Grupos Eliminatórias Euro 2028 (20 Diretos)',
    startDate: '2027-11-08',
    endDate: '2027-11-16',
    matchesNote: '2 jogos oficiais · 12 líderes + 8 melhores 2ºs (PPG) + proteção de até 2 anfitriões UK/IRL',
    description: '8 a 16 de novembro de 2027: Encerramento dos 12 grupos (6×4 + 6×5) das Eliminatórias da Eurocopa 2028, definindo os 20 classificados diretos e as chaves da Repescagem de março.',
    region: 'GLOBAL',
  },

  // 2028
  {
    id: 'fifa_guide_2028_mar',
    season: 'Temporada 2028',
    periodLabel: '20 a 28 de março de 2028',
    name: 'Data FIFA de Março 2028 · Repescagem da Eurocopa 2028',
    badge: 'Play-Off Euro 2028 (2 a 4 Vagas Finais)',
    startDate: '2028-03-20',
    endDate: '2028-03-28',
    matchesNote: 'Play-Off Euro 2028 definindo as 24 seleções + Amistosos FIFA',
    description: '20 a 28 de março de 2028: Repescagem decisiva (Play-Off) da Eurocopa 2028 completando as 24 seleções classificadas, além de amistosos internacionais.',
    region: 'GLOBAL',
  },
  {
    id: 'fifa_guide_2028_may_jun',
    season: 'Temporada 2028',
    periodLabel: '29 de maio a 6 de junho de 2028',
    name: 'Data FIFA Pré-Torneios de 2028',
    badge: 'Amistosos Preparatórios Oficiais',
    startDate: '2028-05-29',
    endDate: '2028-06-06',
    matchesNote: 'Amistosos oficiais preparatórios para a Copa América e Euro',
    description: '29 de maio a 6 de junho de 2028: Janela Padrão (Amistosos preparatórios oficiais).',
    region: 'GLOBAL',
  },
  {
    id: 'fifa_guide_2028_copa_america',
    season: 'Temporada 2028',
    periodLabel: 'junho/julho de 2028',
    name: 'CONMEBOL Copa América 2028 (16 Seleções · 4×4 + Mata-Mata)',
    badge: 'Copa América 2028',
    startDate: '2028-06-11',
    endDate: '2028-07-14',
    matchesNote: '10 CONMEBOL + EUA, México, Canadá, Rússia, Costa Rica e Jamaica',
    description: 'Junho/Julho de 2028: Copa América com 16 seleções (4 grupos de 4, Quartas, Semifinal e Final em jogo único): Argentina, Equador, Colômbia, Uruguai, Brasil, Paraguai, Bolívia, Venezuela, Peru, Chile, Estados Unidos, México, Canadá, Rússia, Costa Rica e Jamaica.',
    region: 'CONMEBOL',
    isCopaAmerica: true,
  },
  {
    id: 'fifa_guide_2028_euro',
    season: 'Temporada 2028',
    periodLabel: '9 de junho a 9 de julho de 2028',
    name: 'UEFA Eurocopa 2028 (Reino Unido e Irlanda · 24 Seleções · 51 Jogos)',
    badge: 'Eurocopa 2028 · Final em Wembley (09/07)',
    startDate: '2028-06-09',
    endDate: '2028-07-09',
    matchesNote: '24 seleções (6 grupos de 4 + Oitavas, Quartas, Semis e Final · sem disputa de 3º lugar)',
    description: '9 de junho a 9 de julho de 2028: UEFA Eurocopa 2028 no Reino Unido e Irlanda (Inglaterra, Escócia, País de Gales e Irlanda), com 51 partidas e Grande Final em Wembley Stadium (Londres).',
    region: 'UEFA',
    isEuro: true,
  },
  {
    id: 'fifa_guide_2028_other_continentals',
    season: 'Temporada 2028',
    periodLabel: 'junho/julho de 2028',
    name: 'Copa da África (CAN · 32 Sel.), Copa da Ásia (32 Sel.) e Copa da Oceania',
    badge: 'Copas Continentais 2028',
    startDate: '2028-06-14',
    endDate: '2028-07-15',
    matchesNote: 'CAF (32 sel. · UGA/TAN/KEN) · AFC (32 sel. · 8×4 + Oitavas a Final) · OFC (8 sel.)',
    description: 'Junho/Julho de 2028: Disputa simultânea da Copa Africana de Nações (CAN, 32 seleções em Uganda, Tanzânia e Quênia · 8 grupos de 4 + Oitavas, Quartas, Semis e Final), Copa da Ásia (AFC, 32 seleções em 8 grupos de 4 + Mata-Mata) e Copa da Oceania (OFC, 8 seleções). Na CONCACAF, 6 seleções disputam a Copa América 2028 enquanto a Copa Ouro ocorre em anos ímpares (2027 e 2029).',
    region: 'GLOBAL',
    isCopaAmerica: true,
  },
  {
    id: 'fifa_guide_2028_super_sep_oct',
    season: 'Temporada 2028',
    periodLabel: '18 de setembro a 3 de outubro de 2028',
    name: 'Super Data FIFA de Set/Out 2028 · Nova UEFA Nations League (3 Ligas)',
    badge: 'Nova Nations League UEFA (3 Ligas · Suíço) & CONCACAF',
    startDate: '2028-09-18',
    endDate: '2028-10-03',
    matchesNote: 'Janela de 16 dias / 4 rodadas · Estreia da Nations League Reformada (Ligas A, B e C · 3×6)',
    description: '18 de setembro a 3 de outubro de 2028: Super Data FIFA (4 jogos) marcando a estreia da UEFA Nations League 2028/29 reformada (extinção da Liga D · 3 Ligas A/B/C com 18 seleções em 3 grupos de 6 no Sistema Suíço) e da Liga das Nações CONCACAF 2028/29.',
    region: 'GLOBAL',
    isSuper: true,
  },
  {
    id: 'fifa_guide_2028_nov',
    season: 'Temporada 2028',
    periodLabel: '13 a 21 de novembro de 2028',
    name: 'Data FIFA de Novembro 2028 · Abertura Elim. Copa (CAF & AFC)',
    badge: 'Janela Padrão (2 jogos)',
    startDate: '2028-11-13',
    endDate: '2028-11-21',
    matchesNote: '2 jogos oficiais · Início Elim. Copa África (54 sel. · 9×6) e Ásia (48 sel. · 8×6)',
    description: '13 a 21 de novembro: Data FIFA tradicional (2 jogos) com abertura das Eliminatórias da Copa 2030 na África (54 seleções em 9 grupos de 6, sem Zanzibar e Reunião) e na Ásia (48 seleções em 8 grupos de 6).',
    region: 'GLOBAL',
  },

  // 2029
  {
    id: 'fifa_guide_2029_mar',
    season: 'Temporada 2029',
    periodLabel: '19 a 27 de março de 2029',
    name: 'Data FIFA de Março 2029 · Quartas Nations League & Liga 2 UEFA Copa 2030',
    badge: 'Nations League QF (Ida/Volta) & Elim. Copa UEFA Liga 2',
    startDate: '2029-03-19',
    endDate: '2029-03-27',
    matchesNote: '2 jogos oficiais · Quartas Nations League 2028/29 + Abertura Liga 2 UEFA (18 sel.)',
    description: '19 a 27 de março de 2029: Quartas de Final ida e volta da UEFA Nations League 2028/29 e início da Liga 2 das Eliminatórias Europeias da Copa 2030 (18 seleções em 3 grupos de 6).',
    region: 'GLOBAL',
  },
  {
    id: 'fifa_guide_2029_jun',
    season: 'Temporada 2029',
    periodLabel: '4 a 12 de junho de 2029',
    name: 'Data FIFA de Junho 2029 · Final Four Nations League & Liga 2 UEFA',
    badge: 'Final Four UEFA Nations League 2028/29',
    startDate: '2029-06-04',
    endDate: '2029-06-12',
    matchesNote: 'Final Four UEFA Nations League 2028/29 + Rodadas 3–4 Liga 2 UEFA & Eliminatórias',
    description: '4 a 12 de junho de 2029: Final Four da UEFA Nations League 2028/29 e rodadas 3 e 4 da Liga 2 das Eliminatórias Europeias da Copa 2030.',
    region: 'GLOBAL',
  },
  {
    id: 'fifa_guide_2029_super_mundial',
    season: 'Temporada 2029',
    periodLabel: '14 de junho a 13 de julho de 2029',
    name: 'Super Mundial de Clubes FIFA 2029 (32 Clubes)',
    badge: 'Paralisação Meio do Ano · Brasileirão & Ligas',
    startDate: '2029-06-14',
    endDate: '2029-07-13',
    matchesNote: '32 clubes das 6 confederações · Pausa oficial no meio da temporada',
    description: '14 de junho a 13 de julho de 2029: Super Mundial de Clubes FIFA com paralisação oficial do calendário brasileiro e mundial (ciclo quadrienal 2029, 2033...).',
    region: 'GLOBAL',
    isWorldCup: true,
  },
  {
    id: 'fifa_guide_2029_copa_ouro',
    season: 'Temporada 2029',
    periodLabel: '17 de junho a 11 de julho de 2029',
    name: 'Copa Ouro da CONCACAF 2029 (16 Seleções)',
    badge: 'Copa Ouro Bienal · CONCACAF',
    startDate: '2029-06-17',
    endDate: '2029-07-11',
    matchesNote: '16 seleções (4 grupos de 4 + Quartas, Semis e Final)',
    description: '17 de junho a 11 de julho de 2029: Copa Ouro da CONCACAF 2029 (segunda edição do ciclo 2026–2030, servindo de grande ensaio pré-Copa 2030).',
    region: 'GLOBAL',
    isCopaAmerica: true,
  },
  {
    id: 'fifa_guide_2029_super_sep_oct',
    season: 'Temporada 2029',
    periodLabel: '29 de setembro a 9 de outubro de 2029',
    name: 'Data FIFA de Set/Out 2029 · Liga 1 UEFA, Play-Off AFC & Finais OFC/CONCACAF',
    badge: 'UEFA Liga 1 (R1–R4) · Play-Off AFC · Finais OFC/CONCACAF',
    startDate: '2029-09-29',
    endDate: '2029-10-09',
    matchesNote: 'UEFA Liga 1 (36 sel. · 3×12 · 4 jogos) & Fim Liga 2 · Play-Off AFC · Finais OFC & CONCACAF',
    description: '29 de setembro a 9 de outubro de 2029: Data FIFA estendida (4 jogos) com estreia da Liga 1 UEFA (36 seleções em 3 grupos de 12 · Sistema Suíço) e encerramento da Liga 2 UEFA, Play-Off da Ásia (8 segundos em Quartas, Semis e Final), conclusão da Oceania e Fase Final da CONCACAF para a Copa 2030.',
    region: 'GLOBAL',
    isSuper: true,
  },
  {
    id: 'fifa_guide_2029_nov',
    season: 'Temporada 2029',
    periodLabel: 'Fim de 2029 (12 a 20 de novembro)',
    name: 'Finais Liga 1 UEFA, CONMEBOL (17ª–18ª) & Play-Off CAF',
    badge: 'UEFA 12 Diretos · CONMEBOL Top 6 · Play-Off CAF',
    startDate: '2029-11-12',
    endDate: '2029-11-20',
    matchesNote: 'UEFA Liga 1 R5–R6 (ESP/POR + 10 diretos) · CONMEBOL 18 rodadas · Play-Off CAF (4 melhores 2ºs)',
    description: '12 a 20 de novembro de 2029: Fechamento da Liga 1 das Eliminatórias UEFA (12 vagas diretas incluindo Espanha e Portugal), encerramento das 18 rodadas da CONMEBOL (Top 6 diretos + 7º Repescagem) e Play-Off da África (Semifinais e Final em jogo único).',
    region: 'CONMEBOL',
  },
  {
    id: 'fifa_guide_2029_wc_draw',
    season: 'Temporada 2029',
    periodLabel: 'Fim de 2029 (Dezembro)',
    name: 'Sorteio Oficial dos Grupos da Copa do Mundo de 2030',
    badge: 'Sorteio Oficial dos Grupos Copa 2030',
    startDate: '2029-12-05',
    endDate: '2029-12-05',
    matchesNote: 'Definição das chaves do Mundial 2030',
    description: 'Fim de 2029: Sorteio oficial dos grupos da Copa do Mundo de 2030.',
    region: 'GLOBAL',
  },

  // 2030 (Rumo à Copa)
  {
    id: 'fifa_guide_2030_mar',
    season: 'Temporada 2030 (Ano da Copa)',
    periodLabel: 'Março de 2030 (18 a 26 de março)',
    name: 'Play-Off UEFA (4 Vagas) & Repescagem Intercontinental',
    badge: 'Play-Off UEFA (16 Sel. → 4 Vagas) & Repescagem Mundial',
    startDate: '2030-03-18',
    endDate: '2030-03-26',
    matchesNote: '4 chaves eliminatórias UEFA (12 Liga 1 + 4 Liga 2) + Repescagem Intercontinental',
    description: 'Março de 2030: Repescagem Europeia (Play-Off UEFA com 16 seleções em 4 chaves de Semifinal e Final por 4 vagas na Copa 2030) e Repescagem Intercontinental FIFA.',
    region: 'GLOBAL',
  },
  {
    id: 'fifa_guide_2030_pre_wc',
    season: 'Temporada 2030 (Ano da Copa)',
    periodLabel: '3 a 11 de junho de 2030',
    name: 'Período de Liberação & Amistosos Finais Pré-Copa',
    badge: 'Liberação & Amistosos Finais',
    startDate: '2030-06-03',
    endDate: '2030-06-11',
    matchesNote: 'Concentração oficial e testes preparatórios pré-Copa',
    description: '3 a 11 de junho: Período de liberação e amistosos finais pré-Copa.',
    region: 'GLOBAL',
  },
  {
    id: 'fifa_guide_2030_centenario',
    season: 'Temporada 2030 (Ano da Copa)',
    periodLabel: '8 a 9 de junho de 2030',
    name: 'Jogos Comemorativos dos 100 Anos da Copa do Mundo na América do Sul',
    badge: '100 Anos Centenário (América do Sul)',
    startDate: '2030-06-08',
    endDate: '2030-06-09',
    matchesNote: 'Montevidéu no Uruguai, Buenos Aires na Argentina e Assunção no Paraguai',
    description: '8 a 9 de junho de 2030: Jogos comemorativos dos 100 anos da Copa do Mundo na América do Sul (Montevidéu no Uruguai, Buenos Aires na Argentina e Assunção no Paraguai).',
    region: 'CONMEBOL',
    isCentenario: true,
  },
  {
    id: 'fifa_guide_2030_opening_main',
    season: 'Temporada 2030 (Ano da Copa)',
    periodLabel: '13 a 14 de junho de 2030',
    name: 'Cerimônia de Abertura Oficial e Sedes Principais',
    badge: 'Espanha, Portugal e Marrocos',
    startDate: '2030-06-13',
    endDate: '2030-06-14',
    matchesNote: 'Abertura oficial nas sedes principais europeias e africana',
    description: '13 a 14 de junho de 2030: Cerimônia de abertura oficial e jogos nas sedes principais (Espanha, Portugal e Marrocos).',
    region: 'GLOBAL',
  },
  {
    id: 'fifa_guide_2030_wc_total',
    season: 'Temporada 2030 (Ano da Copa)',
    periodLabel: 'junho/julho (8 de junho a 21 de julho de 2030)',
    name: 'Copa do Mundo FIFA de 2030 (Período Total)',
    badge: 'Copa do Mundo 2030 (Centenário)',
    startDate: '2030-06-08',
    endDate: '2030-07-21',
    matchesNote: '8 de junho a 21 de julho de 2030 · Período total da Copa do Mundo FIFA 2030',
    description: '8 de junho a 21 de julho de 2030: Copa do Mundo FIFA de 2030 (jogos comemorativos na América do Sul e sedes na Espanha, Portugal e Marrocos).',
    region: 'GLOBAL',
    isWorldCup: true,
  },
  {
    id: 'fifa_guide_2030_super_sep_oct',
    season: 'Temporada 2030 (Ano da Copa)',
    periodLabel: '23 de setembro a 8 de outubro de 2030',
    name: 'Data FIFA de Setembro/Outubro 2030',
    badge: 'Data FIFA (4 jogos)',
    startDate: '2030-09-23',
    endDate: '2030-10-08',
    matchesNote: '4 jogos oficiais por seleção',
    description: '23 de setembro a 8 de outubro de 2030: Data FIFA pós-Copa com 4 jogos por seleção.',
    region: 'GLOBAL',
    isSuper: true,
  },
  {
    id: 'fifa_guide_2030_nov',
    season: 'Temporada 2030 (Ano da Copa)',
    periodLabel: '11 a 19 de novembro de 2030',
    name: 'Data FIFA de Novembro 2030',
    badge: 'Data FIFA (2 jogos)',
    startDate: '2030-11-11',
    endDate: '2030-11-19',
    matchesNote: '2 jogos oficiais por seleção',
    description: '11 a 19 de novembro de 2030: Data FIFA oficial de novembro (2 jogos).',
    region: 'GLOBAL',
  },
];

function getEstadualTournamentTitle(cupPhase?: string): string | null {
  if (!cupPhase) return null;
  if (cupPhase.includes('•')) {
    const parts = cupPhase.split('•').map((s) => s.trim());
    const candidate =
      parts[0].startsWith('Semifinal') || parts[0].startsWith('Grande Final')
        ? parts[1]
        : parts[0];
    return candidate || null;
  }
  return null;
}

function getCompetitionDisplayInfo(fix: Fixture): {
  compName: string;
  fullCompName: string;
  compactCompName: string;
  phaseOrRound: string;
  color: string;
} {
  const meta = COMPETITIONS_CATALOG[fix.competition] || COMPETITIONS_CATALOG.serie_a;

  if (fix.competition === 'estadual') {
    const estTitle =
      fix.groupName || getEstadualTournamentTitle(fix.cupPhase) || 'Campeonato Estadual';
    const compactEst = estTitle.replace(/\s*\([A-Z]{2}\)\s*$/, '');
    let phaseLabel = `Rodada ${fix.round}`;
    if (fix.cupPhase) {
      if (fix.cupPhase.startsWith('Semifinal')) phaseLabel = 'Semifinal';
      else if (fix.cupPhase.startsWith('Grande Final')) phaseLabel = 'Grande Final';
      else if (fix.cupPhase.includes('•')) {
        const suffix = fix.cupPhase.split('•').slice(1).join(' • ').trim();
        phaseLabel = suffix || phaseLabel;
      }
      if (fix.leg && !phaseLabel.includes('Ida') && !phaseLabel.includes('Volta')) {
        phaseLabel = `${phaseLabel} (${fix.leg === 1 ? 'Ida' : 'Volta'})`;
      }
    }
    return {
      compName: estTitle,
      fullCompName: estTitle,
      compactCompName: compactEst,
      phaseOrRound: phaseLabel,
      color: meta.primaryColor,
    };
  }

  const phaseOrRound = fix.cupPhase
    ? `${fix.cupPhase}${fix.leg ? (fix.leg === 1 ? ' (Ida)' : ' (Volta)') : ''}`
    : `Rodada ${fix.round}`;

  return {
    compName: meta.shortName,
    fullCompName: meta.name,
    compactCompName: meta.shortName,
    phaseOrRound,
    color: meta.primaryColor,
  };
}

function getInternationalCompDisplayInfo(fix: InternationalMatchFixture): {
  compName: string;
  fullCompName: string;
  compactCompName: string;
  phaseOrRound: string;
  color: string;
} {
  switch (fix.competition) {
    case 'world_cup':
      return {
        compName: `Copa do Mundo ${fix.seasonYear}`,
        fullCompName: fix.competitionName,
        compactCompName: 'Copa do Mundo',
        phaseOrRound: fix.phase,
        color: '#fbbf24',
      };
    case 'copa_america':
      return {
        compName: `Copa América ${fix.seasonYear}`,
        fullCompName: fix.competitionName,
        compactCompName: 'Copa América',
        phaseOrRound: fix.phase,
        color: '#38bdf8',
      };
    case 'eurocopa':
      return {
        compName: `Eurocopa ${fix.seasonYear}`,
        fullCompName: fix.competitionName,
        compactCompName: 'Eurocopa',
        phaseOrRound: fix.phase,
        color: '#60a5fa',
      };
    case 'copa_africana':
      return {
        compName: `Copa Africana ${fix.seasonYear}`,
        fullCompName: fix.competitionName,
        compactCompName: 'Copa Africana',
        phaseOrRound: fix.phase,
        color: '#34d399',
      };
    case 'copa_asia':
      return {
        compName: `Copa da Ásia ${fix.seasonYear}`,
        fullCompName: fix.competitionName,
        compactCompName: 'Copa da Ásia',
        phaseOrRound: fix.phase,
        color: '#fb923c',
      };
    case 'copa_oceania':
      return {
        compName: `Copa da Oceania ${fix.seasonYear}`,
        fullCompName: fix.competitionName,
        compactCompName: 'Copa da OFC',
        phaseOrRound: fix.phase,
        color: '#22d3ee',
      };
    case 'copa_ouro':
      return {
        compName: `Copa Ouro ${fix.seasonYear}`,
        fullCompName: fix.competitionName,
        compactCompName: 'Copa Ouro',
        phaseOrRound: fix.phase,
        color: '#facc15',
      };
    case 'nations_league':
      return {
        compName: `UEFA Nations League ${fix.seasonYear}`,
        fullCompName: fix.competitionName,
        compactCompName: 'Nations League',
        phaseOrRound: fix.phase,
        color: '#818cf8',
      };
    case 'continental_qualifiers':
      return {
        compName: 'Eliminatórias Continentais',
        fullCompName: fix.competitionName,
        compactCompName: 'Elim. Continentais',
        phaseOrRound: fix.phase,
        color: '#2dd4bf',
      };
    case 'finalissima':
      return {
        compName: `Finalíssima ${fix.seasonYear}`,
        fullCompName: fix.competitionName,
        compactCompName: 'Finalíssima',
        phaseOrRound: fix.phase,
        color: '#facc15',
      };
    case 'friendly':
      return {
        compName: 'Amistoso Data FIFA',
        fullCompName: fix.competitionName,
        compactCompName: 'Data FIFA',
        phaseOrRound: fix.phase,
        color: '#c084fc',
      };
    case 'wc_qualifiers':
    default:
      return {
        compName: 'Eliminatórias da Copa',
        fullCompName: fix.competitionName,
        compactCompName: 'Eliminatórias',
        phaseOrRound: fix.phase,
        color: '#4ade80',
      };
  }
}

interface CalendarViewProps {
  userClub: Club;
  allClubs: Club[];
  currentDate: string; // YYYY-MM-DD
  fixtures: Fixture[];
  currentRound: number;
  totalRounds: number;
  seasonYear: number;
  europeSeasonYear?: number;
  pendingTransfersCount?: number;
  nationalTeam?: NationalTeamState;
  onOpenSelecaoTab?: () => void;
  onPlaySelecaoMatch?: (fixtureId?: string) => void;
  onAdvanceDay: () => void;
  onAdvanceToMatch: () => void;
  onPlayMatch: () => void;
  onInstantResult?: () => void;
  onFinishSeason?: () => void;
  onScheduleFriendlyTour?: (
    pkgId: FriendlyPackageId
  ) => { success: boolean; message: string };
}

type CalendarListEntry =
  | { kind: 'club'; date: string; time: string; fix: Fixture }
  | { kind: 'intl'; date: string; time: string; fix: InternationalMatchFixture }
  | { kind: 'fifa_release'; date: string; time: string; win: FifaCalendarWindow }
  | {
      kind: 'cup_reserved';
      date: string;
      time: string;
      compKey: CompetitionType;
      compName: string;
      shortName: string;
      phaseOrRound: string;
      color: string;
    };

export const CalendarView: React.FC<CalendarViewProps> = ({
  userClub,
  allClubs,
  currentDate,
  fixtures,
  currentRound,
  totalRounds,
  seasonYear,
  europeSeasonYear,
  pendingTransfersCount = 0,
  nationalTeam,
  onOpenSelecaoTab,
  onPlaySelecaoMatch,
  onAdvanceDay,
  onAdvanceToMatch,
  onPlayMatch,
  onInstantResult,
  onFinishSeason,
  onScheduleFriendlyTour,
}) => {
  const windowStatus = useMemo(
    () => getTransferWindowStatus(currentDate, userClub),
    [currentDate, userClub]
  );
  const [showFriendlyModal, setShowFriendlyModal] = useState<boolean>(false);
  const [showFifaScheduleModal, setShowFifaScheduleModal] = useState<boolean>(false);
  const [fifaModalRegion, setFifaModalRegion] = useState<'ALL' | 'CONMEBOL' | 'UEFA' | 'GLOBAL'>('ALL');
  const [friendlyFeedback, setFriendlyFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const friendlyPackages = useMemo(
    () => getFriendlyPackagesForClub(userClub),
    [userClub]
  );

  const [currentYear, currentMonth] = useMemo(() => {
    if (!currentDate) return [seasonYear, 0];
    const [y, m] = currentDate.split('-').map(Number);
    return [y, m - 1];
  }, [currentDate, seasonYear]);

  const [viewYear, setViewYear] = useState<number>(currentYear);
  const [viewMonth, setViewMonth] = useState<number>(currentMonth);
  const [selectedDate, setSelectedDate] = useState<string>(currentDate);
  const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('calendar');
  const [filterMode, setFilterMode] = useState<'my_club' | 'selecao' | 'all'>('my_club');

  // Keep calendar synced when currentDate advances across months
  useEffect(() => {
    setViewYear(currentYear);
    setViewMonth(currentMonth);
    setSelectedDate(currentDate);
  }, [currentDate, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    soundEngine.playClick();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    soundEngine.playClick();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToCurrent = () => {
    soundEngine.playClick();
    setViewYear(currentYear);
    setViewMonth(currentMonth);
    setSelectedDate(currentDate);
  };

  const jumpToCalendarDate = (targetDateStr: string) => {
    if (!targetDateStr) return;
    soundEngine.playClick();
    const [yy, mm] = targetDateStr.split('-').map(Number);
    if (yy && mm) {
      setViewYear(yy);
      setViewMonth(mm - 1);
    }
    setSelectedDate(targetDateStr);
    setDisplayMode('calendar');
  };

  // Coached National Team data
  const coachedTeamId = useMemo(
    () => (nationalTeam?.isUserCoach ? nationalTeam.userTeamId || 'nt_bra' : null),
    [nationalTeam]
  );

  const coachedSelecao = useMemo(
    () => (coachedTeamId ? getNationalTeamById(coachedTeamId) : null),
    [coachedTeamId]
  );

  const coachedSelecaoFixtures = useMemo(() => {
    if (!nationalTeam || !coachedTeamId) return [];
    return getTeamAllInternationalFixtures(nationalTeam, coachedTeamId);
  }, [nationalTeam, coachedTeamId]);

  const allInternationalFixtures = useMemo(() => {
    if (!nationalTeam) return [];
    return getAllInternationalFixtures(nationalTeam);
  }, [nationalTeam]);

  const coachedSelecaoByDate = useMemo(() => {
    const map = new Map<string, InternationalMatchFixture[]>();
    coachedSelecaoFixtures.forEach((f) => {
      if (!f.date) return;
      const list = map.get(f.date) || [];
      list.push(f);
      map.set(f.date, list);
    });
    return map;
  }, [coachedSelecaoFixtures]);

  const intlFixturesByDate = useMemo(() => {
    const map = new Map<string, InternationalMatchFixture[]>();
    allInternationalFixtures.forEach((f) => {
      if (!f.date) return;
      const list = map.get(f.date) || [];
      list.push(f);
      map.set(f.date, list);
    });
    return map;
  }, [allInternationalFixtures]);

  // Club athletes called up across all National Teams (must be released in Data FIFA)
  const releasedClubPlayers = useMemo(
    () => getClubReleasedPlayersForFifa(userClub, allClubs, nationalTeam),
    [userClub, allClubs, nationalTeam]
  );

  const releasedStartersCount = useMemo(
    () => releasedClubPlayers.filter((p) => p.isClubStarter).length,
    [releasedClubPlayers]
  );

  const releasedNtIds = useMemo(
    () => new Set(releasedClubPlayers.map((p) => p.nationalTeamId)),
    [releasedClubPlayers]
  );

  // Active or next upcoming Data FIFA / Tournament release window
  const activeOrUpcomingFifa = useMemo(
    () => getUpcomingOrActiveFifaWindow(currentDate),
    [currentDate]
  );

  const currentDayFifaWindow = useMemo(
    () => getFifaWindowForDate(currentDate),
    [currentDate]
  );

  const selectedDayFifaWindow = useMemo(
    () => getFifaWindowForDate(selectedDate),
    [selectedDate]
  );

  // FIFA windows overlapping the currently viewed month in the calendar grid
  const viewedMonthFifaWindows = useMemo(() => {
    const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return getFifaCalendarWindowsForYear(viewYear).filter(
      (win) => win.releaseStartDate <= monthEnd && win.endDate >= monthStart
    );
  }, [viewYear, viewMonth]);

  // Next club fixture
  const nextUserFixture = useMemo(() => {
    const unplayed = fixtures.filter(
      (f) => !f.played && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
    );
    return unplayed.sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0] || null;
  }, [fixtures, userClub.id]);

  // Exact rest hours between last played club match and next scheduled match (66h rule)
  const nextMatchRestHours = useMemo(() => {
    if (!nextUserFixture?.date) return null;
    const played = fixtures
      .filter(
        (f) =>
          f.played &&
          Boolean(f.date) &&
          (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const lastPlayed = played[0];
    if (!lastPlayed?.date) return null;
    const hrs = getHoursBetweenFixtures(
      lastPlayed.date,
      lastPlayed.time,
      nextUserFixture.date,
      nextUserFixture.time
    );
    return Math.round(hrs);
  }, [fixtures, userClub.id, nextUserFixture]);

  // Next coached Seleção fixture
  const nextSelecaoFixture = useMemo(
    () => getUpcomingUserSelecaoFixture(nationalTeam, currentDate),
    [nationalTeam, currentDate]
  );

  // Check if user has summer Seleção fixtures before August 1st (critical for split-year clubs ending in May)
  const hasSummerSelecaoMatchesLeft = useMemo(() => {
    if (!nextSelecaoFixture || !nextSelecaoFixture.date) return false;
    const calYear = Number(currentDate.slice(0, 4)) || seasonYear;
    if (isSplitCalendarClub(userClub)) {
      return nextSelecaoFixture.date <= `${calYear}-07-31`;
    }
    return nextSelecaoFixture.date <= `${calYear}-12-31`;
  }, [nextSelecaoFixture, currentDate, seasonYear, userClub]);

  const isTodayClubMatchDay = useMemo(() => {
    if (!nextUserFixture || !nextUserFixture.date) return false;
    return nextUserFixture.date === currentDate;
  }, [nextUserFixture, currentDate]);

  const isTodaySelecaoMatchDay = useMemo(() => {
    if (!nextSelecaoFixture) return false;
    return (
      nextSelecaoFixture.date === currentDate ||
      nextSelecaoFixture.status === 'READY_FOR_USER'
    );
  }, [nextSelecaoFixture, currentDate]);

  const isTodayAnyMatchDay = isTodayClubMatchDay || isTodaySelecaoMatchDay;

  // Next combined event (Club or Coached Seleção — whichever comes first)
  const nextCombinedEvent = useMemo(() => {
    const clubDate = nextUserFixture?.date || null;
    const selDate = nextSelecaoFixture?.date || null;

    if (clubDate && selDate) {
      if (selDate < clubDate) {
        return { kind: 'selecao' as const, date: selDate };
      }
      return { kind: 'club' as const, date: clubDate };
    }
    if (clubDate) return { kind: 'club' as const, date: clubDate };
    if (selDate) return { kind: 'selecao' as const, date: selDate };
    return null;
  }, [nextUserFixture, nextSelecaoFixture]);

  const daysToNextMatch = useMemo(() => {
    if (!nextCombinedEvent) return null;
    return Math.max(0, daysBetween(currentDate, nextCombinedEvent.date));
  }, [nextCombinedEvent, currentDate]);

  const nextOpponent = useMemo(() => {
    if (!nextUserFixture) return null;
    const oppId =
      nextUserFixture.homeTeamId === userClub.id
        ? nextUserFixture.awayTeamId
        : nextUserFixture.homeTeamId;
    return allClubs.find((c) => c.id === oppId);
  }, [nextUserFixture, userClub.id, allClubs]);

  const nextMatchRivalry = useMemo(
    () => getMatchRivalryInfo(userClub, nextOpponent),
    [userClub, nextOpponent]
  );

  // Map club fixtures by date
  const fixturesByDate = useMemo(() => {
    const map = new Map<string, Fixture[]>();
    fixtures.forEach((f) => {
      if (!f.date) return;
      const list = map.get(f.date) || [];
      list.push(f);
      map.set(f.date, list);
    });
    return map;
  }, [fixtures]);

  // Reserved domestic cup dates (TBD_* placeholders) for cups where user's club is still alive
  const reservedDomesticCupDatesByDate = useMemo(() => {
    type ReservedCupSlot = {
      compKey: CompetitionType;
      compName: string;
      shortName: string;
      phaseOrRound: string;
      color: string;
    };
    const resultMap = new Map<string, ReservedCupSlot[]>();
    const byComp = new Map<CompetitionType, Fixture[]>();

    const isDomesticCupComp = (comp: CompetitionType): boolean =>
      comp === 'copa_brasil' ||
      comp === 'copa_nordeste' ||
      comp === 'copa_verde' ||
      comp === 'eng_fa_cup' ||
      comp === 'eng_efl_cup' ||
      comp.startsWith('eu_cup_') ||
      comp.startsWith('sa_cup_') ||
      comp.startsWith('wl_cup_');

    fixtures.forEach((f) => {
      if (!isDomesticCupComp(f.competition)) return;
      const list = byComp.get(f.competition) || [];
      list.push(f);
      byComp.set(f.competition, list);
    });

    byComp.forEach((compFixtures, compKey) => {
      const userMatches = compFixtures.filter(
        (f) => f.homeTeamId === userClub.id || f.awayTeamId === userClub.id
      );
      if (userMatches.length === 0) return;

      // Determine whether userClub has already been eliminated
      const hasFutureUserMatch = userMatches.some((f) => !f.played);
      let isAlive = hasFutureUserMatch;

      if (!isAlive) {
        const playedUser = userMatches
          .filter((f) => f.played)
          .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.round - a.round);
        const latestFix = playedUser[0];
        if (latestFix) {
          const isFinal =
            (latestFix.cupPhase || '').toLowerCase().includes('final') &&
            !(latestFix.cupPhase || '').toLowerCase().includes('semifinal') &&
            !(latestFix.cupPhase || '').toLowerCase().includes('quartas') &&
            !(latestFix.cupPhase || '').toLowerCase().includes('oitavas');
          if (!isFinal) {
            if (latestFix.aggregateWinnerId) {
              isAlive = latestFix.aggregateWinnerId === userClub.id;
            } else if (
              latestFix.leg === 2 &&
              latestFix.aggregateHomeScore !== undefined &&
              latestFix.aggregateAwayScore !== undefined
            ) {
              const userAgg =
                latestFix.homeTeamId === userClub.id
                  ? latestFix.aggregateHomeScore
                  : latestFix.aggregateAwayScore;
              const oppAgg =
                latestFix.homeTeamId === userClub.id
                  ? latestFix.aggregateAwayScore
                  : latestFix.aggregateHomeScore;
              isAlive = userAgg >= oppAgg;
            } else if (latestFix.leg === 1) {
              isAlive = true;
            } else {
              const userGoals =
                latestFix.homeTeamId === userClub.id
                  ? latestFix.homeScore ?? 0
                  : latestFix.awayScore ?? 0;
              const oppGoals =
                latestFix.homeTeamId === userClub.id
                  ? latestFix.awayScore ?? 0
                  : latestFix.homeScore ?? 0;
              isAlive = userGoals >= oppGoals;
            }
          }
        }
      }

      if (!isAlive) return;

      const meta = COMPETITIONS_CATALOG[compKey] || COMPETITIONS_CATALOG.copa_brasil;
      const maxUserRound = userMatches.reduce((mx, f) => Math.max(mx, f.round || 0), 0);
      const seenDates = new Set<string>();

      compFixtures.forEach((f) => {
        if (f.played || !f.date) return;
        const isTbdPlaceholder =
          f.homeTeamId.toUpperCase().startsWith('TBD') ||
          f.awayTeamId.toUpperCase().startsWith('TBD');
        if (!isTbdPlaceholder) return;
        if (f.date < currentDate) return;
        if (f.round <= maxUserRound && hasFutureUserMatch) return;
        // Skip if user already has a concrete fixture in this cup on that same date
        if (userMatches.some((um) => um.date === f.date)) return;
        if (seenDates.has(f.date)) return;
        seenDates.add(f.date);

        const phaseText = f.cupPhase
          ? `${f.cupPhase}${f.leg ? (f.leg === 1 ? ' (Ida)' : ' (Volta)') : ''}`
          : `Rodada ${f.round}`;
        const existing = resultMap.get(f.date) || [];
        existing.push({
          compKey,
          compName: meta.name,
          shortName: meta.shortName,
          phaseOrRound: phaseText,
          color: meta.primaryColor,
        });
        resultMap.set(f.date, existing);
      });
    });

    return resultMap;
  }, [fixtures, userClub.id, currentDate]);

  // Monthly grid days
  const calendarGrid = useMemo(() => {
    return getMonthCalendarGrid(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // Selected date's club fixtures
  const selectedDateClubFixtures = useMemo(() => {
    if (filterMode === 'selecao') return [];
    const allOnDate = fixturesByDate.get(selectedDate) || [];
    if (filterMode === 'my_club') {
      return allOnDate.filter(
        (f) => f.homeTeamId === userClub.id || f.awayTeamId === userClub.id
      );
    }
    return allOnDate;
  }, [fixturesByDate, selectedDate, filterMode, userClub.id]);

  // Selected date's international fixtures
  const selectedDateIntlFixtures = useMemo(() => {
    const allOnDate = intlFixturesByDate.get(selectedDate) || [];
    if (filterMode === 'my_club') {
      if (!coachedTeamId) return [];
      return allOnDate.filter(
        (f) => f.homeTeamId === coachedTeamId || f.awayTeamId === coachedTeamId
      );
    }
    if (filterMode === 'selecao' && coachedTeamId) {
      // Show coached Seleção first + all other international games on that date
      return allOnDate;
    }
    return allOnDate;
  }, [intlFixturesByDate, selectedDate, filterMode, coachedTeamId]);

  const selectedUserFixture = useMemo(() => {
    if (filterMode === 'selecao') return undefined;
    const onDate = fixturesByDate.get(selectedDate) || [];
    return onDate.find(
      (f) => f.homeTeamId === userClub.id || f.awayTeamId === userClub.id
    );
  }, [fixturesByDate, selectedDate, userClub.id, filterMode]);

  const selectedSelecaoFixture = useMemo(() => {
    if (!coachedTeamId) return undefined;
    const onDate = coachedSelecaoByDate.get(selectedDate) || [];
    return onDate[0];
  }, [coachedSelecaoByDate, selectedDate, coachedTeamId]);

  // Unified chronological list of fixtures & Data FIFA release periods for list view
  const chronologicalEntries = useMemo<CalendarListEntry[]>(() => {
    const entries: CalendarListEntry[] = [];
    const activeCalYearPrefix = `${viewYear}-`;

    const minClubDate = fixtures.reduce(
      (mn, f) => (f.date && f.date < mn ? f.date : mn),
      `${currentYear}-01-01`
    );
    const maxClubDate = fixtures.reduce(
      (mx, f) => (f.date && f.date > mx ? f.date : mx),
      `${currentYear}-12-31`
    );
    const rangeEnd =
      maxClubDate > `${currentYear}-12-31`
        ? `${Number(maxClubDate.slice(0, 4))}-07-31`
        : `${currentYear}-12-31`;

    // Include official Data FIFA athlete release milestones in list view so user always sees when players leave
    const yearsToInspect = Array.from(
      new Set([currentYear, viewYear, Number(rangeEnd.slice(0, 4)) || currentYear])
    );
    yearsToInspect.forEach((yr) => {
      getFifaCalendarWindowsForYear(yr).forEach((win) => {
        const inRange =
          (win.releaseStartDate >= minClubDate && win.releaseStartDate <= rangeEnd) ||
          win.releaseStartDate.startsWith(activeCalYearPrefix);
        if (inRange) {
          entries.push({
            kind: 'fifa_release',
            date: win.releaseStartDate,
            time: '08:00',
            win,
          });
        }
      });
    });

    if (filterMode !== 'selecao') {
      fixtures.forEach((f) => {
        if (!f.date) return;
        if (
          filterMode === 'my_club' &&
          f.homeTeamId !== userClub.id &&
          f.awayTeamId !== userClub.id
        ) {
          return;
        }
        entries.push({
          kind: 'club',
          date: f.date,
          time: f.time || '16:00',
          fix: f,
        });
      });

      reservedDomesticCupDatesByDate.forEach((slots, dateStr) => {
        if (
          (dateStr >= minClubDate && dateStr <= rangeEnd) ||
          dateStr.startsWith(activeCalYearPrefix)
        ) {
          slots.forEach((slot) => {
            entries.push({
              kind: 'cup_reserved',
              date: dateStr,
              time: '19:30',
              ...slot,
            });
          });
        }
      });
    }

    if (filterMode === 'my_club') {
      if (coachedTeamId) {
        coachedSelecaoFixtures.forEach((sf) => {
          if (!sf.date) return;
          if (
            (sf.date >= minClubDate && sf.date <= rangeEnd) ||
            sf.date.startsWith(activeCalYearPrefix)
          ) {
            entries.push({
              kind: 'intl',
              date: sf.date,
              time: sf.time || '20:00',
              fix: sf,
            });
          }
        });
      } else if (releasedNtIds.size > 0) {
        // Show Seleção games involving called-up athletes from user's club
        allInternationalFixtures.forEach((sf) => {
          if (!sf.date) return;
          if (!releasedNtIds.has(sf.homeTeamId) && !releasedNtIds.has(sf.awayTeamId)) return;
          if (
            (sf.date >= minClubDate && sf.date <= rangeEnd) ||
            sf.date.startsWith(activeCalYearPrefix)
          ) {
            entries.push({
              kind: 'intl',
              date: sf.date,
              time: sf.time || '20:00',
              fix: sf,
            });
          }
        });
      }
    } else if (filterMode === 'selecao') {
      const source = coachedTeamId ? coachedSelecaoFixtures : allInternationalFixtures;
      source.forEach((sf) => {
        if (!sf.date) return;
        if (coachedTeamId || sf.date.startsWith(activeCalYearPrefix)) {
          entries.push({
            kind: 'intl',
            date: sf.date,
            time: sf.time || '20:00',
            fix: sf,
          });
        }
      });
    } else if (filterMode === 'all') {
      allInternationalFixtures.forEach((sf) => {
        if (!sf.date) return;
        if (sf.date.startsWith(activeCalYearPrefix)) {
          entries.push({
            kind: 'intl',
            date: sf.date,
            time: sf.time || '20:00',
            fix: sf,
          });
        }
      });
    }

    return entries.sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    );
  }, [
    fixtures,
    reservedDomesticCupDatesByDate,
    filterMode,
    userClub.id,
    coachedTeamId,
    coachedSelecaoFixtures,
    allInternationalFixtures,
    releasedNtIds,
    viewYear,
    currentYear,
  ]);

  const triggerPlaySelecao = (fixtureId?: string) => {
    soundEngine.playClick();
    if (onPlaySelecaoMatch) {
      onPlaySelecaoMatch(fixtureId);
    } else if (onOpenSelecaoTab) {
      onOpenSelecaoTab();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Current Game Date, Next Match Countdown & Action CTAs */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-black border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Current Date Lockup */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                {userClub.division === 'EU'
                  ? `Calendário Europeu ${formatEuropeanSeason(europeSeasonYear ?? seasonYear)}`
                  : isSplitCalendarClub(userClub)
                  ? `Temporada ${formatEuropeanSeason(europeSeasonYear ?? seasonYear)}`
                  : `Temporada ${seasonYear}`}
              </span>
              <span className="text-xs text-slate-500 font-bold" aria-hidden="true">·</span>
              <span className="text-xs font-bold text-slate-300">
                Rodada {currentRound} de {totalRounds}
              </span>
              <span className="text-xs text-slate-500 font-bold" aria-hidden="true">·</span>
              <span
                className={`text-xs font-bold ${
                  windowStatus.isOpen ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {windowStatus.shortBadge}
              </span>
              {coachedSelecao && (
                <>
                  <span className="text-xs text-slate-500 font-bold" aria-hidden="true">·</span>
                  <span className="text-xs font-bold text-amber-400">
                    Seleção: {coachedSelecao.name} ({coachedSelecao.code})
                  </span>
                </>
              )}
              {pendingTransfersCount > 0 && (
                <>
                  <span className="text-xs text-slate-500 font-bold" aria-hidden="true">·</span>
                  <span className="text-xs font-bold text-sky-300">
                    {pendingTransfersCount} acordo(s) aguardando janela
                  </span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white capitalize">
              {formatCalendarDate(currentDate)}
            </h1>
            <p className="text-xs text-slate-400">
              {isTodaySelecaoMatchDay && nextSelecaoFixture && coachedSelecao
                ? `Dia de Jogo da Seleção (${coachedSelecao.name}) · ${nextSelecaoFixture.competitionName} (${nextSelecaoFixture.phase}).`
                : isTodayClubMatchDay
                ? 'Hoje é dia de jogo oficial do clube! O vestiário está pronto e a torcida lota o estádio.'
                : currentDayFifaWindow
                ? `Período reservado · ${currentDayFifaWindow.name} (${formatShortDate(
                    currentDayFifaWindow.releaseStartDate
                  )} a ${formatShortDate(currentDayFifaWindow.endDate)}). ${
                    releasedClubPlayers.length > 0
                      ? `${releasedClubPlayers.length} atleta(s) do ${userClub.shortName} liberados às Seleções.`
                      : `Elenco do ${userClub.shortName} integralmente disponível no CT.`
                  }`
                : daysToNextMatch !== null && daysToNextMatch > 0
                ? `Dia de treino e preparação. Faltam ${daysToNextMatch} dia(s) para o próximo confronto (${
                    nextCombinedEvent?.kind === 'selecao'
                      ? `Seleção · ${coachedSelecao?.name}`
                      : userClub.shortName
                  }).`
                : 'Temporada em andamento.'}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Advance 1 Day Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onAdvanceDay();
              }}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-md active:scale-95"
            >
              <CalendarIcon className="w-4 h-4 text-sky-400" />
              <span>Avançar Dia (+1)</span>
            </button>

            {onScheduleFriendlyTour && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setFriendlyFeedback(null);
                  setShowFriendlyModal(true);
                }}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-md active:scale-95 whitespace-nowrap shrink-0"
              >
                <Plane className="w-4 h-4 text-emerald-400" />
                <span>Excursões & Amistosos</span>
              </button>
            )}

            {/* Advance to Next Match (Club OR Coached Seleção, whichever is sooner) */}
            {!isTodayAnyMatchDay && nextCombinedEvent && (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onAdvanceToMatch();
                }}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-md active:scale-95 ${
                  nextCombinedEvent.kind === 'selecao'
                    ? 'bg-amber-950/70 hover:bg-amber-900/80 border-amber-500/40 text-amber-300 hover:text-white shadow-amber-950/40'
                    : 'bg-sky-950/80 hover:bg-sky-900/90 border-sky-500/40 text-sky-300 hover:text-white shadow-sky-950/40'
                }`}
              >
                <FastForward
                  className={`w-4 h-4 ${
                    nextCombinedEvent.kind === 'selecao' ? 'text-amber-400' : 'text-sky-400'
                  }`}
                />
                <span className="tabular-nums">
                  Avançar até {nextCombinedEvent.kind === 'selecao' ? 'Jogo da Seleção' : 'o Jogo'} (
                  {daysToNextMatch}d · +{Math.min(100, (daysToNextMatch || 1) * 20)}% Físico)
                </span>
              </button>
            )}

            {/* Today's Coached Seleção Match CTA */}
            {isTodaySelecaoMatchDay && nextSelecaoFixture && (
              <button
                onClick={() => triggerPlaySelecao(nextSelecaoFixture.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-xl cursor-pointer transition-all active:scale-95 bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 text-slate-950 shadow-amber-500/30 hover:scale-105 ring-2 ring-amber-300"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>JOGAR PELA SELEÇÃO HOJE!</span>
              </button>
            )}

            {/* Play Club Match or Finish Season Button */}
            {nextUserFixture ? (
              <>
                {onInstantResult && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onInstantResult();
                    }}
                    title="Simular a partida em 1 clique e ver o resumo completo"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 hover:text-amber-200 cursor-pointer transition-all active:scale-95 whitespace-nowrap shrink-0"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Resultado Instantâneo</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onPlayMatch();
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-xl cursor-pointer transition-all active:scale-95 ${
                    isTodayClubMatchDay
                      ? 'bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-400 text-slate-950 shadow-sky-500/30 hover:scale-105 ring-2 ring-sky-300'
                      : 'bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-950 shadow-sky-500/20 hover:from-sky-300 hover:to-cyan-300'
                  }`}
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>{isTodayClubMatchDay ? 'ENTRAR EM CAMPO HOJE!' : 'JOGAR RODADA'}</span>
                </button>
              </>
            ) : !hasSummerSelecaoMatchesLeft && onFinishSeason ? (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onFinishSeason();
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-xl cursor-pointer transition-all active:scale-95 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 hover:from-amber-300 hover:to-yellow-300"
              >
                <Trophy className="w-4 h-4" />
                <span>ENCERRAR TEMPORADA {seasonYear}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Next Club Match Teaser Card */}
        {nextUserFixture && (() => {
          const nextCompInfo = getCompetitionDisplayInfo(nextUserFixture);
          return (
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs uppercase font-bold tracking-wider text-sky-400">
                  Próximo Jogo do Clube
                </span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span
                  className="text-xs font-extrabold"
                  style={{ color: nextCompInfo.color }}
                >
                  {nextCompInfo.compName}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  ({nextCompInfo.phaseOrRound})
                </span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow border border-white/20"
                    style={{
                      backgroundColor: nextOpponent ? nextOpponent.colors.primary : '#1e293b',
                      color: nextOpponent ? nextOpponent.colors.text : '#94a3b8',
                    }}
                  >
                    {nextOpponent ? nextOpponent.initials : 'TBD'}
                  </div>
                  <span className="font-extrabold text-white text-sm">
                    {nextOpponent ? nextOpponent.name : 'Adversário a Definir'}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({nextUserFixture.homeTeamId === userClub.id ? 'Em Casa' : 'Fora de Casa'})
                  </span>
                </div>
                {nextMatchRivalry && (
                  <>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="text-xs font-bold text-amber-400">
                      {nextMatchRivalry.derbyName} · Casa Cheia
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono tabular-nums">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {formatShortDate(nextUserFixture.date || '')} às {nextUserFixture.time || '16:00'}
                  </span>
                </div>
                {nextMatchRestHours !== null && (
                  <>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span
                      className="text-xs font-semibold text-emerald-400"
                      title={`Regra oficial de descanso mínimo de ${MIN_MATCH_REST_HOURS}h entre partidas`}
                    >
                      Descanso: {nextMatchRestHours}h (mín. {MIN_MATCH_REST_HOURS}h)
                    </span>
                  </>
                )}
                <span className="text-slate-600" aria-hidden="true">·</span>
                <div className="flex items-center gap-1.5 font-sans">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {nextUserFixture.stadiumName ||
                      (nextUserFixture.homeTeamId === userClub.id
                        ? userClub.stadium.name
                        : nextOpponent?.stadium.name || 'Local a Definir')}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* National Team / International Competition Strip */}
        {nationalTeam && (() => {
          const focusNtId = nationalTeam.isUserCoach
            ? nationalTeam.userTeamId || 'nt_bra'
            : 'nt_bra';
          const focusNt = getNationalTeamById(focusNtId);
          const allFocusMatches = getTeamAllInternationalFixtures(nationalTeam, focusNtId);
          const nextNtFix =
            allFocusMatches.find((f) => !f.played && f.status === 'READY_FOR_USER') ||
            allFocusMatches.find((f) => !f.played && (f.date ? f.date >= currentDate : true));
          if (!nextNtFix) return null;
          const oppNt = getNationalTeamById(
            nextNtFix.homeTeamId === focusNtId ? nextNtFix.awayTeamId : nextNtFix.homeTeamId
          );
          const isReadyNow =
            nationalTeam.isUserCoach &&
            (nextNtFix.status === 'READY_FOR_USER' || nextNtFix.date === currentDate);

          return (
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-amber-400">
                  {nationalTeam.isUserCoach
                    ? isReadyNow
                      ? `Jogo Hoje · Minha Seleção (${focusNt.code})`
                      : `Próximo Jogo da Seleção (${focusNt.code})`
                    : 'Calendário FIFA de Seleções'}
                </span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="font-bold text-white">{nextNtFix.competitionName}</span>
                <span className="text-slate-400">({nextNtFix.phase})</span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="text-slate-200 font-semibold">
                  {focusNt.name} vs {oppNt.name}
                </span>
                {nextNtFix.date && (
                  <>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="text-amber-300 font-mono tabular-nums font-bold">
                      {formatShortDate(nextNtFix.date)} às {nextNtFix.time || '20:00'}
                    </span>
                  </>
                )}
              </div>

              {(onOpenSelecaoTab || onPlaySelecaoMatch) && (
                <button
                  type="button"
                  onClick={() => {
                    if (isReadyNow) {
                      triggerPlaySelecao(nextNtFix.id);
                    } else if (onOpenSelecaoTab) {
                      soundEngine.playClick();
                      onOpenSelecaoTab();
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    isReadyNow
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black'
                      : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200'
                  }`}
                >
                  {isReadyNow ? 'Escalar e Jogar pela Seleção' : 'Abrir Central de Seleções'}
                </button>
              )}
            </div>
          );
        })()}

        {/* Data FIFA & Mandatory Club Athlete Release Radar */}
        {activeOrUpcomingFifa && (() => {
          const { window: fifaWin, isActiveNow, daysUntilRelease } = activeOrUpcomingFifa;
          const isTournament =
            fifaWin.kind === 'WORLD_CUP' || fifaWin.kind === 'CONTINENTAL_CUP';
          const previewNames = releasedClubPlayers
            .slice(0, 4)
            .map((p) => `${p.playerName} (${p.nationalTeamCode})`)
            .join(', ');
          const extraCount = Math.max(0, releasedClubPlayers.length - 4);

          return (
            <div
              className={`mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs ${
                isActiveNow ? 'text-violet-200' : 'text-slate-300'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Plane
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isTournament
                        ? 'text-amber-400'
                        : isActiveNow
                        ? 'text-violet-400'
                        : 'text-violet-400/80'
                    }`}
                  />
                  <span
                    className={`font-bold ${
                      isTournament
                        ? 'text-amber-300'
                        : isActiveNow
                        ? 'text-violet-300'
                        : 'text-violet-400'
                    }`}
                  >
                    {isActiveNow
                      ? `Período Reservado Ativo · ${fifaWin.name}`
                      : `Próxima Liberação Data FIFA · ${fifaWin.name}`}
                  </span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-200 font-semibold">
                    {formatShortDate(fifaWin.releaseStartDate)} até {formatShortDate(fifaWin.endDate)}
                  </span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {isActiveNow
                      ? `Reapresentação no CT em ${formatShortDate(fifaWin.returnDate)}`
                      : `Apresentação em ${daysUntilRelease} dia(s)`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  {releasedClubPlayers.length > 0 ? (
                    <>
                      <span className="text-violet-300 font-semibold tabular-nums">
                        {releasedClubPlayers.length} atleta(s) do {userClub.shortName}{' '}
                        {isActiveNow ? 'liberados às Seleções' : 'convocados para liberação'}
                        {releasedStartersCount > 0 ? ` (${releasedStartersCount} titulares)` : ''}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span className="text-slate-300 truncate max-w-xl">
                        {previewNames}
                        {extraCount > 0 ? ` +${extraCount}` : ''}
                      </span>
                    </>
                  ) : (
                    <span>
                      Nenhum atleta do {userClub.shortName} convocado no momento · Elenco 100% disponível no CT durante a janela
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  jumpToCalendarDate(isActiveNow ? currentDate : fifaWin.releaseStartDate)
                }
                className="px-3.5 py-1.5 rounded-xl bg-violet-950/50 hover:bg-violet-900/60 border border-violet-500/40 text-violet-200 font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                {isActiveNow ? 'Inspecionar Período FIFA' : 'Ver Data de Liberação'}
              </button>
            </div>
          );
        })()}
      </div>

      {/* Main Grid: Calendar Grid & Agenda / Match Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Interactive Calendar Grid or List View */}
        <div className="lg:col-span-8 space-y-4">
          {/* Controls Bar: Month Switcher, Today Jump & View Toggles */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h2 className="font-black text-sm sm:text-base text-white px-2 min-w-[155px] text-center tabular-nums">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>

              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleJumpToCurrent}
                className="ml-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-sky-400 text-xs font-bold border border-slate-800 cursor-pointer"
              >
                Mês Atual
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setShowFifaScheduleModal(true);
                }}
                className="ml-1 px-2.5 py-1 rounded-md bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 hover:text-white text-xs font-bold border border-emerald-500/40 cursor-pointer transition-colors flex items-center gap-1.5 shadow"
                title="Calendário Oficial de Datas FIFA & Marcos (2026–2030) · CONMEBOL, UEFA e Mundiais"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Datas FIFA & Marcos (2026–2030)</span>
                <span className="sm:hidden">FIFA</span>
              </button>
            </div>

            {/* View toggles & Filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter: Clube & Seleção | Seleção | Todos */}
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setFilterMode('my_club');
                  }}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    filterMode === 'my_club'
                      ? 'bg-sky-400 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {coachedSelecao ? 'Clube & Seleção' : 'Meu Time'}
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setFilterMode('selecao');
                  }}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    filterMode === 'selecao'
                      ? 'bg-amber-400 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {coachedSelecao ? `Seleção (${coachedSelecao.code})` : 'Seleções'}
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setFilterMode('all');
                  }}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-sky-400 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
              </div>

              {/* Display Mode */}
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setDisplayMode('calendar');
                  }}
                  className={`p-1.5 rounded cursor-pointer ${
                    displayMode === 'calendar'
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Visão Calendário"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setDisplayMode('list');
                  }}
                  className={`p-1.5 rounded cursor-pointer ${
                    displayMode === 'list'
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Visão Lista de Jogos"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid View */}
          {displayMode === 'calendar' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl overflow-hidden space-y-3">
              {/* Visual Legend & Viewed Month FIFA Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80 text-[11px]">
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
                    <span>Hoje</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" />
                    <span>Jogo do Clube</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-200 font-semibold">Jogos de Seleção</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Plane className="w-3 h-3 text-violet-400" />
                    <span className="text-violet-200 font-semibold">
                      Data FIFA · Liberação de Atletas
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span className="text-slate-400">Clube em Data FIFA</span>
                  </span>
                </div>

                {viewedMonthFifaWindows.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono tabular-nums">
                    {viewedMonthFifaWindows.map((w) => (
                      <span
                        key={w.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-sans text-[10px] font-bold ${
                          w.isSuperFifaWindow
                            ? 'bg-fuchsia-950/60 border border-fuchsia-500/50 text-fuchsia-300'
                            : w.kind === 'CONTINENTAL_CUP' || w.kind === 'WORLD_CUP'
                            ? 'bg-amber-950/60 border border-amber-500/50 text-amber-300'
                            : 'bg-violet-950/60 border border-violet-500/40 text-violet-300'
                        }`}
                        title={w.detailNote || w.competitionSummary}
                      >
                        {w.isSuperFifaWindow ? (
                          <>
                            <Zap className="w-2.5 h-2.5 text-fuchsia-400" />
                            <span>Super Data FIFA ({formatShortDate(w.releaseStartDate)} a {formatShortDate(w.endDate)})</span>
                          </>
                        ) : (
                          <>
                            <Plane className="w-2.5 h-2.5 text-violet-400" />
                            <span>
                              {w.shortLabel}: {formatShortDate(w.releaseStartDate)} a {formatShortDate(w.endDate)}
                            </span>
                          </>
                        )}
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setShowFifaScheduleModal(true);
                      }}
                      className="text-[10px] text-violet-300 hover:text-white underline cursor-pointer ml-1"
                    >
                      Guia 2026–2030
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable 7-Day Monthly Calendar Grid */}
              <div className="overflow-x-auto pb-1.5">
                <div className="min-w-[640px] space-y-2">
                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {WEEKDAY_NAMES.map((name, i) => (
                      <div
                        key={name}
                        className={`py-1 text-[11px] font-black uppercase tracking-wider ${
                          i === 0 || i === 6 ? 'text-sky-400' : 'text-slate-400'
                        }`}
                      >
                        {name}
                      </div>
                    ))}
                  </div>

                  {/* 35 or 42 Day Cells Grid */}
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarGrid.map((dateObj, idx) => {
                  const dateStr = toDateString(dateObj);
                  const isCurrentMonth = dateObj.getMonth() === viewMonth;
                  const isToday = dateStr === currentDate;
                  const isSelected = dateStr === selectedDate;
                  const dayNum = dateObj.getDate();

                  const fifaWindow = getFifaWindowForDate(dateStr);
                  const isFifaReleaseStart = fifaWindow?.releaseStartDate === dateStr;
                  const isMajorSummerTournament =
                    fifaWindow?.kind === 'WORLD_CUP' || fifaWindow?.kind === 'CONTINENTAL_CUP';

                  const userMatchesOnDay =
                    filterMode !== 'selecao'
                      ? fixtures.filter(
                          (f) =>
                            f.date === dateStr &&
                            (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
                        )
                      : [];
                  const userMatch =
                    userMatchesOnDay.find((f) => !f.played) || userMatchesOnDay[0];

                  const selecaoMatch = coachedTeamId
                    ? (coachedSelecaoByDate.get(dateStr) || [])[0]
                    : undefined;

                  // Always surface official international matchdays on the calendar grid
                  const allIntlMatchesOnDay = intlFixturesByDate.get(dateStr) || [];
                  const hasGlobalIntlMatch = allIntlMatchesOnDay.length > 0;
                  const clubPlayersInIntlMatchesCount = allIntlMatchesOnDay.filter(
                    (m) => releasedNtIds.has(m.homeTeamId) || releasedNtIds.has(m.awayTeamId)
                  ).length;

                  const clubMatchesOnDay =
                    filterMode === 'all' ? fixturesByDate.get(dateStr) || [] : [];
                  const hasOtherClubMatches = clubMatchesOnDay.length > 0;

                  const oppClub = userMatch
                    ? allClubs.find(
                        (c) =>
                          c.id ===
                          (userMatch.homeTeamId === userClub.id
                            ? userMatch.awayTeamId
                            : userMatch.homeTeamId)
                      )
                    : null;

                  const isHomeClubMatch = userMatch?.homeTeamId === userClub.id;
                  const userMatchCompInfo = userMatch
                    ? getCompetitionDisplayInfo(userMatch)
                    : null;

                  const selecaoOpp =
                    selecaoMatch && coachedTeamId
                      ? getNationalTeamById(
                          selecaoMatch.homeTeamId === coachedTeamId
                            ? selecaoMatch.awayTeamId
                            : selecaoMatch.homeTeamId
                        )
                      : null;
                  const isSelecaoHome =
                    selecaoMatch && coachedTeamId
                      ? selecaoMatch.homeTeamId === coachedTeamId
                      : false;
                  const selecaoCompInfo = selecaoMatch
                    ? getInternationalCompDisplayInfo(selecaoMatch)
                    : null;

                  const distinctIntlComps = hasGlobalIntlMatch
                    ? Array.from(
                        new Set(
                          allIntlMatchesOnDay.map(
                            (m) => getInternationalCompDisplayInfo(m).compactCompName
                          )
                        )
                      )
                    : [];

                  const distinctClubComps = hasOtherClubMatches
                    ? Array.from(
                        new Set(
                          clubMatchesOnDay.map((m) => getCompetitionDisplayInfo(m).compactCompName)
                        )
                      )
                    : [];

                  const reservedCupsOnDay =
                    filterMode !== 'selecao'
                      ? reservedDomesticCupDatesByDate.get(dateStr) || []
                      : [];
                  const primaryReservedCup =
                    !userMatch && !selecaoMatch && reservedCupsOnDay.length > 0
                      ? reservedCupsOnDay[0]
                      : null;

                  const cellTitle =
                    selecaoMatch && selecaoCompInfo && selecaoOpp
                      ? `Seleção (${coachedSelecao?.code}) · ${selecaoCompInfo.compName} (${selecaoCompInfo.phaseOrRound}) — vs ${selecaoOpp.name}`
                      : userMatch && userMatchCompInfo && fifaWindow
                      ? `${userMatchCompInfo.compName} vs ${
                          oppClub ? oppClub.name : 'A Definir'
                        } · Atenção: Período ${fifaWindow.name} (${releasedClubPlayers.length} atleta(s) convocado(s))`
                      : userMatch && userMatchCompInfo
                      ? `${userMatchCompInfo.compName} · ${userMatchCompInfo.phaseOrRound} — vs ${
                          oppClub ? oppClub.name : 'A Definir'
                        }`
                      : primaryReservedCup
                      ? `Copa Nacional · Data Reservada (A definir): ${primaryReservedCup.compName} (${primaryReservedCup.phaseOrRound})`
                      : hasGlobalIntlMatch
                      ? `Jogos de Seleções · ${distinctIntlComps.join(', ')} (${allIntlMatchesOnDay.length} confronto(s))${
                          releasedClubPlayers.length > 0
                            ? ` · ${releasedClubPlayers.length} atleta(s) do ${userClub.shortName} liberados`
                            : ''
                        }`
                      : fifaWindow
                      ? `${
                          isFifaReleaseStart
                            ? 'Apresentação e Liberação Obrigatória de Atletas · '
                            : 'Dia Reservado · '
                        }${fifaWindow.name} (${formatShortDate(
                          fifaWindow.releaseStartDate
                        )} a ${formatShortDate(fifaWindow.endDate)})`
                      : undefined;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedDate(dateStr);
                      }}
                      title={cellTitle}
                      className={`min-h-[96px] sm:min-h-[112px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-sky-400 bg-sky-950/45 shadow-lg shadow-sky-950/50 ring-1 ring-sky-400'
                          : isToday
                          ? 'border-emerald-400 bg-emerald-950/35 shadow-md ring-1 ring-emerald-400'
                          : selecaoMatch
                          ? 'border-amber-400/70 bg-amber-950/35 hover:border-amber-300'
                          : userMatch && fifaWindow
                          ? 'border-amber-500/60 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-violet-950/45 hover:border-amber-400'
                          : userMatch
                          ? 'border-slate-700 bg-slate-900/90 hover:border-sky-500/60'
                          : primaryReservedCup && isCurrentMonth
                          ? 'border-emerald-500/35 bg-emerald-950/20 hover:border-emerald-400/70'
                          : hasGlobalIntlMatch && isCurrentMonth
                          ? 'border-amber-500/45 bg-violet-950/35 hover:border-amber-400/80'
                          : fifaWindow && isCurrentMonth
                          ? isFifaReleaseStart
                            ? 'border-violet-400/70 bg-violet-950/40 hover:border-violet-300'
                            : isMajorSummerTournament
                            ? 'border-amber-500/30 bg-amber-950/15 hover:bg-amber-950/25 hover:border-amber-400/50'
                            : 'border-violet-500/35 bg-violet-950/20 hover:bg-violet-950/35 hover:border-violet-400/60'
                          : isCurrentMonth
                          ? 'border-slate-850 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700'
                          : fifaWindow
                          ? 'border-violet-900/40 bg-violet-950/15 opacity-45 hover:opacity-80'
                          : 'border-slate-900/60 bg-black/40 opacity-30 hover:opacity-70'
                      }`}
                    >
                      {/* Top Bar of Day Cell */}
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-black rounded-md px-1 py-0.2 font-mono tabular-nums ${
                            isToday
                              ? 'bg-emerald-400 text-slate-950 font-black'
                              : isSelected
                              ? 'bg-sky-400 text-slate-950 font-black'
                              : selecaoMatch
                              ? 'bg-amber-400/20 text-amber-200'
                              : isFifaReleaseStart && isCurrentMonth
                              ? 'bg-violet-400/25 text-violet-200'
                              : isCurrentMonth
                              ? 'text-slate-200'
                              : 'text-slate-500'
                          }`}
                        >
                          {dayNum}
                        </span>

                        {isToday ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-emerald-400 tracking-wider">
                            {selecaoMatch || hasGlobalIntlMatch ? (
                              <Globe className="w-2.5 h-2.5 text-amber-400" />
                            ) : fifaWindow ? (
                              <Plane className="w-2.5 h-2.5 text-violet-300" />
                            ) : null}
                            <span>HOJE</span>
                          </span>
                        ) : selecaoMatch ? (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase text-amber-300 tracking-wider">
                            <Globe className="w-2.5 h-2.5 text-amber-400" />
                            <span>{coachedSelecao?.code || 'SEL'}</span>
                          </span>
                        ) : userMatch && fifaWindow ? (
                          <span
                            className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase text-amber-300 tracking-wider"
                            title="Partida do clube durante período reservado Data FIFA"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                            <span className="font-mono tabular-nums">R{userMatch.round}</span>
                          </span>
                        ) : userMatch ? (
                          <span className="text-[9px] font-bold font-mono tabular-nums text-slate-400">
                            R{userMatch.round}
                            {userMatchesOnDay.length > 1 ? ` +${userMatchesOnDay.length - 1}` : ''}
                          </span>
                        ) : primaryReservedCup ? (
                          <span className="text-[8px] font-bold uppercase text-emerald-300 tracking-wider">
                            COPA
                          </span>
                        ) : hasGlobalIntlMatch ? (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase text-amber-300 tracking-wider">
                            <Globe className="w-2.5 h-2.5 text-amber-400" />
                            <span>FIFA</span>
                          </span>
                        ) : isFifaReleaseStart ? (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase text-violet-300 tracking-wider">
                            <Plane className="w-2.5 h-2.5 text-violet-300" />
                            <span>LIBERAR</span>
                          </span>
                        ) : fifaWindow ? (
                          <span
                            className={`inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider ${
                              isMajorSummerTournament ? 'text-amber-300/90' : 'text-violet-300/90'
                            }`}
                          >
                            <Users className="w-2.5 h-2.5" />
                            <span>{fifaWindow.kind === 'WORLD_CUP' ? 'COPA' : 'FIFA'}</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Middle Content: Club Match, Coached Seleção Match, FIFA Matchday, Reserved Data FIFA Release, or Training */}
                      <div className="my-1 space-y-1">
                        {userMatch && userMatchCompInfo && (
                          <div className="space-y-0.5">
                            <div
                              className="text-[9px] font-extrabold truncate leading-tight"
                              style={{ color: userMatchCompInfo.color }}
                            >
                              {userMatchCompInfo.compactCompName}
                            </div>

                            <div className="flex items-center gap-1">
                              <div
                                className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center font-black text-[8px]"
                                style={{
                                  backgroundColor: oppClub ? oppClub.colors.primary : '#1e293b',
                                  color: oppClub ? oppClub.colors.text : '#94a3b8',
                                }}
                              >
                                {oppClub ? oppClub.initials.slice(0, 2) : '?'}
                              </div>
                              <span className="text-[10px] font-extrabold text-white truncate max-w-[58px]">
                                {oppClub ? oppClub.shortName : 'A Definir'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[9px] font-mono tabular-nums">
                              <span className="text-slate-400 font-bold">
                                {isHomeClubMatch ? '(C)' : '(F)'}
                              </span>
                              {userMatch.played ? (
                                <span
                                  className={`px-1 rounded font-black ${
                                    (isHomeClubMatch &&
                                      (userMatch.homeScore ?? 0) > (userMatch.awayScore ?? 0)) ||
                                    (!isHomeClubMatch &&
                                      (userMatch.awayScore ?? 0) > (userMatch.homeScore ?? 0))
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : userMatch.homeScore === userMatch.awayScore
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {userMatch.homeScore}x{userMatch.awayScore}
                                </span>
                              ) : (
                                <span className="text-sky-300">{userMatch.time || '16:00'}</span>
                              )}
                            </div>

                            {fifaWindow && !selecaoMatch && (
                              <div className="pt-0.5 border-t border-violet-500/30 flex items-center gap-1 text-[8px] font-bold text-violet-300 truncate">
                                <Plane className="w-2.5 h-2.5 shrink-0 text-violet-400" />
                                <span className="truncate tabular-nums">
                                  {releasedClubPlayers.length > 0
                                    ? `${releasedClubPlayers.length} convocado(s)`
                                    : 'Data FIFA'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {selecaoMatch && selecaoCompInfo && selecaoOpp && (
                          <div
                            className={
                              userMatch
                                ? 'pt-1 border-t border-amber-500/30 space-y-0.5'
                                : 'space-y-0.5'
                            }
                          >
                            <div
                              className="text-[9px] font-extrabold truncate leading-tight"
                              style={{ color: selecaoCompInfo.color }}
                            >
                              {selecaoCompInfo.compactCompName}
                            </div>

                            <div className="flex items-center gap-1">
                              <div
                                className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center font-black text-[7px]"
                                style={{
                                  backgroundColor: selecaoOpp.primaryColor,
                                  color: selecaoOpp.textColor,
                                }}
                              >
                                {selecaoOpp.code.slice(0, 2)}
                              </div>
                              <span className="text-[10px] font-extrabold text-amber-100 truncate max-w-[58px]">
                                {selecaoOpp.name}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[9px] font-mono tabular-nums">
                              <span className="text-amber-400/90 font-bold">
                                {selecaoMatch.competition === 'world_cup' ||
                                selecaoMatch.competition === 'finalissima'
                                  ? '(N)'
                                  : isSelecaoHome
                                  ? '(C)'
                                  : '(F)'}
                              </span>
                              {selecaoMatch.played ? (
                                <span
                                  className={`px-1 rounded font-black ${
                                    (isSelecaoHome &&
                                      (selecaoMatch.homeScore ?? 0) >
                                        (selecaoMatch.awayScore ?? 0)) ||
                                    (!isSelecaoHome &&
                                      (selecaoMatch.awayScore ?? 0) >
                                        (selecaoMatch.homeScore ?? 0)) ||
                                    selecaoMatch.winnerTeamId === coachedTeamId
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : selecaoMatch.homeScore === selecaoMatch.awayScore &&
                                        !selecaoMatch.winnerTeamId
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {selecaoMatch.homeScore}x{selecaoMatch.awayScore}
                                </span>
                              ) : (
                                <span className="text-amber-300">
                                  {selecaoMatch.time || '20:00'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {!userMatch && !selecaoMatch && hasGlobalIntlMatch && (
                          <div className="space-y-0.5">
                            <div className="text-[9px] font-extrabold text-amber-300 truncate leading-tight">
                              {distinctIntlComps[0]}
                              {distinctIntlComps.length > 1
                                ? ` +${distinctIntlComps.length - 1}`
                                : ''}
                            </div>
                            <div className="text-[9px] text-violet-200 font-semibold truncate font-mono tabular-nums">
                              {allIntlMatchesOnDay.length}{' '}
                              {allIntlMatchesOnDay.length === 1 ? 'jogo FIFA' : 'jogos FIFA'}
                            </div>
                            {clubPlayersInIntlMatchesCount > 0 && (
                              <div className="text-[8px] text-amber-300/90 font-bold truncate">
                                Convocados em ação
                              </div>
                            )}
                          </div>
                        )}

                        {!userMatch &&
                          !selecaoMatch &&
                          !hasGlobalIntlMatch &&
                          hasOtherClubMatches && (
                            <div className="space-y-0.5">
                              <div className="text-[9px] font-bold text-sky-400 truncate leading-tight">
                                {distinctClubComps[0]}
                                {distinctClubComps.length > 1
                                  ? ` +${distinctClubComps.length - 1}`
                                  : ''}
                              </div>
                              <div className="text-[9px] text-slate-400 font-semibold truncate font-mono tabular-nums">
                                {clubMatchesOnDay.length}{' '}
                                {clubMatchesOnDay.length === 1 ? 'jogo' : 'jogos'}
                              </div>
                            </div>
                          )}

                        {!userMatch &&
                          !selecaoMatch &&
                          !hasGlobalIntlMatch &&
                          !hasOtherClubMatches &&
                          fifaWindow && (
                            <div className="space-y-0.5">
                              <div
                                className={`text-[9px] font-extrabold truncate leading-tight flex items-center gap-1 ${
                                  fifaWindow.specialEventDate === dateStr
                                    ? 'text-amber-300 font-black'
                                    : fifaWindow.isSuperFifaWindow
                                    ? 'text-fuchsia-300'
                                    : isFifaReleaseStart
                                    ? 'text-violet-200'
                                    : isMajorSummerTournament
                                    ? 'text-amber-200'
                                    : 'text-violet-300'
                                }`}
                              >
                                {fifaWindow.specialEventDate === dateStr ? (
                                  <span>🏆 Abertura 2030</span>
                                ) : isFifaReleaseStart ? (
                                  <span>Liberar Atletas</span>
                                ) : fifaWindow.isSuperFifaWindow ? (
                                  <span className="flex items-center gap-0.5">
                                    <Zap className="w-2 h-2 text-fuchsia-400" />
                                    Super FIFA
                                  </span>
                                ) : isMajorSummerTournament ? (
                                  <span>{fifaWindow.shortLabel}</span>
                                ) : (
                                  <span>Data FIFA</span>
                                )}
                              </div>
                              <div className="text-[8px] text-slate-300/90 font-medium truncate tabular-nums">
                                {fifaWindow.specialEventDate === dateStr
                                  ? 'Centenário Copa'
                                  : fifaWindow.isSuperFifaWindow
                                  ? '16 dias / 4 jogos'
                                  : releasedClubPlayers.length > 0
                                  ? `${releasedClubPlayers.length} convocado(s)`
                                  : 'Reservado Seleções'}
                              </div>
                            </div>
                          )}

                        {!userMatch &&
                          !selecaoMatch &&
                          !hasGlobalIntlMatch &&
                          !hasOtherClubMatches &&
                          !fifaWindow &&
                          primaryReservedCup && (
                            <div className="space-y-0.5">
                              <div
                                className="text-[9px] font-extrabold truncate leading-tight"
                                style={{ color: primaryReservedCup.color }}
                              >
                                {primaryReservedCup.shortName}
                              </div>
                              <div className="text-[9px] text-emerald-200 font-semibold truncate">
                                Data Reservada
                              </div>
                              <div className="text-[8px] text-slate-400 truncate">
                                A definir
                              </div>
                            </div>
                          )}

                        {!userMatch &&
                          !selecaoMatch &&
                          !hasGlobalIntlMatch &&
                          !hasOtherClubMatches &&
                          !fifaWindow &&
                          !primaryReservedCup && (
                            <div className="text-[9px] text-slate-600 flex items-center gap-1">
                              <Dumbbell className="w-2.5 h-2.5 text-slate-600" />
                              <span>Treino</span>
                            </div>
                          )}
                      </div>

                      {/* Bottom indicator strip */}
                      <div className="h-1 rounded-full overflow-hidden w-full bg-slate-800 flex">
                        {userMatch && (
                          <div
                            className="h-full flex-1"
                            style={{
                              backgroundColor: userMatch.played
                                ? '#38bdf8'
                                : userMatchCompInfo?.color || '#34d399',
                            }}
                          />
                        )}
                        {(selecaoMatch || hasGlobalIntlMatch) && (
                          <div
                            className="h-full flex-1"
                            style={{
                              backgroundColor: selecaoCompInfo?.color || '#fbbf24',
                            }}
                          />
                        )}
                        {fifaWindow && !selecaoMatch && !hasGlobalIntlMatch && (
                          <div
                            className="h-full flex-1"
                            style={{
                              backgroundColor: isMajorSummerTournament ? '#f59e0b' : '#a78bfa',
                            }}
                          />
                        )}
                        {primaryReservedCup && !fifaWindow && (
                          <div
                            className="h-full flex-1 opacity-75"
                            style={{ backgroundColor: primaryReservedCup.color || '#34d399' }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List View of Fixtures (Club + Coached Seleção merged chronologically) */}
          {displayMode === 'list' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 max-h-[600px] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
                <span>
                  {filterMode === 'selecao'
                    ? coachedSelecao
                      ? `AGENDA COMPLETA · SELEÇÃO DE ${coachedSelecao.name.toUpperCase()}`
                      : `CALENDÁRIO INTERNACIONAL FIFA ${viewYear}`
                    : coachedSelecao
                    ? `CONFRONTOS DO CLUBE, SELEÇÃO (${coachedSelecao.code}) & DATAS FIFA`
                    : `CONFRONTOS DA TEMPORADA ${seasonYear} & DATAS FIFA`}
                </span>
                <span className="font-mono tabular-nums">
                  {chronologicalEntries.filter((e) => e.kind !== 'fifa_release').length} jogos ·{' '}
                  {chronologicalEntries.filter((e) => e.kind === 'fifa_release').length} janelas FIFA
                </span>
              </div>

              {chronologicalEntries.map((entry) => {
                if (entry.kind === 'fifa_release') {
                  const win = entry.win;
                  const isWinActiveNow =
                    currentDate >= win.releaseStartDate && currentDate <= win.endDate;
                  const isTournament =
                    win.kind === 'WORLD_CUP' || win.kind === 'CONTINENTAL_CUP';

                  return (
                    <div
                      key={`fifa_win_${win.id}`}
                      onClick={() => jumpToCalendarDate(win.releaseStartDate)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
                        isWinActiveNow
                          ? 'bg-violet-950/45 border-violet-400 ring-1 ring-violet-400/60'
                          : isTournament
                          ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400/70'
                          : 'bg-violet-950/20 border-violet-500/35 hover:border-violet-400/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-[230px]">
                        <div className="w-16 text-center font-mono tabular-nums text-xs shrink-0">
                          <span className="block font-black text-violet-200">
                            {formatShortDate(win.releaseStartDate)}
                          </span>
                          <span className="text-[10px] text-violet-400">Liberação</span>
                        </div>
                        <div className="min-w-0 border-l border-violet-500/30 pl-3">
                          <div className="flex items-center gap-1.5">
                            <Plane
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isTournament ? 'text-amber-400' : 'text-violet-400'
                              }`}
                            />
                            <span
                              className={`block text-xs font-extrabold leading-tight truncate ${
                                isTournament ? 'text-amber-200' : 'text-violet-200'
                              }`}
                            >
                              {win.name}
                            </span>
                          </div>
                          <span className="block text-[10px] text-slate-400 leading-tight truncate mt-0.5 tabular-nums">
                            Reservado até {formatShortDate(win.endDate)} · Retorno ao CT em{' '}
                            {formatShortDate(win.returnDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-200">
                        <Users className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        {releasedClubPlayers.length > 0 ? (
                          <span className="font-semibold tabular-nums">
                            Liberar {releasedClubPlayers.length} atleta(s) do {userClub.shortName}
                            {releasedStartersCount > 0 ? ` (${releasedStartersCount} titulares)` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Sem atletas do {userClub.shortName} convocados
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-bold text-right min-w-[95px]">
                        {isWinActiveNow ? (
                          <span className="text-violet-300 text-[11px] font-black">
                            EM ANDAMENTO
                          </span>
                        ) : currentDate > win.endDate ? (
                          <span className="text-slate-500 text-[11px]">Concluída</span>
                        ) : (
                          <span className="text-violet-400 text-[11px]">Data FIFA</span>
                        )}
                      </div>
                    </div>
                  );
                }

                if (entry.kind === 'cup_reserved') {
                  return (
                    <div
                      key={`cup_res_${entry.compKey}_${entry.date}`}
                      onClick={() => jumpToCalendarDate(entry.date)}
                      className="p-3 rounded-xl border bg-emerald-950/15 border-emerald-500/35 hover:border-emerald-400/70 transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-[230px]">
                        <div className="w-16 text-center font-mono tabular-nums text-xs shrink-0">
                          <span className="block font-black text-emerald-200">
                            {formatShortDate(entry.date)}
                          </span>
                          <span className="text-[10px] text-emerald-400">Reservada</span>
                        </div>
                        <div className="min-w-0 border-l border-emerald-500/30 pl-3">
                          <div className="flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span
                              className="block text-xs font-extrabold leading-tight truncate"
                              style={{ color: entry.color }}
                            >
                              {entry.compName}
                            </span>
                          </div>
                          <span className="block text-[10px] text-slate-400 leading-tight truncate mt-0.5">
                            Copa Nacional · Data Reservada ({entry.phaseOrRound})
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300">
                        Confronto e adversário a definir conforme chaveamento
                      </div>

                      <div className="text-xs font-bold text-right min-w-[95px]">
                        <span className="text-emerald-300 text-[11px]">A definir</span>
                      </div>
                    </div>
                  );
                }

                if (entry.kind === 'club') {
                  const fix = entry.fix;
                  const home = allClubs.find((c) => c.id === fix.homeTeamId);
                  const away = allClubs.find((c) => c.id === fix.awayTeamId);
                  const isUserGame =
                    fix.homeTeamId === userClub.id || fix.awayTeamId === userClub.id;
                  const isCurrentGameDay = fix.date === currentDate;
                  const compInfo = getCompetitionDisplayInfo(fix);
                  const fixFifaWindow = fix.date ? getFifaWindowForDate(fix.date) : null;

                  return (
                    <div
                      key={`club_${fix.id}`}
                      onClick={() => {
                        if (fix.date) {
                          soundEngine.playClick();
                          setSelectedDate(fix.date);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
                        isCurrentGameDay
                          ? 'bg-emerald-950/40 border-emerald-400 ring-1 ring-emerald-400'
                          : isUserGame && fixFifaWindow
                          ? 'bg-slate-900/90 border-amber-500/45 hover:border-amber-400'
                          : isUserGame
                          ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-950/60 border-slate-900 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-[225px]">
                        <div className="w-16 text-center font-mono tabular-nums text-xs shrink-0">
                          <span className="block font-black text-white">
                            {formatShortDate(fix.date || '')}
                          </span>
                          <span className="text-[10px] text-slate-400">{fix.time || '16:00'}</span>
                        </div>
                        <div className="min-w-0 border-l border-slate-800 pl-3">
                          <span
                            className="block text-xs font-extrabold leading-tight truncate"
                            style={{ color: compInfo.color }}
                          >
                            {compInfo.compName}
                          </span>
                          <span className="block text-[10px] text-slate-400 leading-tight truncate mt-0.5 tabular-nums">
                            {compInfo.phaseOrRound}
                            {fixFifaWindow
                              ? ` · Em Data FIFA${
                                  releasedClubPlayers.length > 0
                                    ? ` (${releasedClubPlayers.length} fora)`
                                    : ''
                                }`
                              : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-1 justify-center min-w-[220px]">
                        <div className="flex items-center gap-2 justify-end w-36">
                          <span
                            className={`text-xs font-extrabold truncate ${
                              !home
                                ? 'text-slate-400 italic'
                                : fix.homeTeamId === userClub.id
                                ? 'text-sky-300'
                                : 'text-white'
                            }`}
                          >
                            {home ? home.shortName : 'A Definir'}
                          </span>
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center font-black text-[9px] shrink-0"
                            style={{
                              backgroundColor: home ? home.colors.primary : '#1e293b',
                              color: home ? home.colors.text : '#94a3b8',
                            }}
                          >
                            {home ? home.initials.slice(0, 2) : 'TB'}
                          </div>
                        </div>

                        <div className="font-mono font-black text-sm px-3 py-1 bg-black rounded-lg border border-slate-800 text-center min-w-[60px] tabular-nums">
                          {fix.played ? (
                            <span className="text-sky-300">
                              {fix.homeScore} x {fix.awayScore}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-normal text-xs">vs</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 justify-start w-36">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center font-black text-[9px] shrink-0"
                            style={{
                              backgroundColor: away ? away.colors.primary : '#1e293b',
                              color: away ? away.colors.text : '#94a3b8',
                            }}
                          >
                            {away ? away.initials.slice(0, 2) : 'TB'}
                          </div>
                          <span
                            className={`text-xs font-extrabold truncate ${
                              !away
                                ? 'text-slate-400 italic'
                                : fix.awayTeamId === userClub.id
                                ? 'text-sky-300'
                                : 'text-white'
                            }`}
                          >
                            {away ? away.shortName : 'A Definir'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-right min-w-[80px]">
                        {fix.played ? (
                          <span className="text-slate-400 text-[11px]">Finalizado</span>
                        ) : isCurrentGameDay ? (
                          <span className="text-emerald-400 text-[11px] font-black">
                            HOJE!
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Agendado</span>
                        )}
                      </div>
                    </div>
                  );
                }

                // International / Seleção Fixture Row
                const sFix = entry.fix;
                const homeNt = getNationalTeamById(sFix.homeTeamId);
                const awayNt = getNationalTeamById(sFix.awayTeamId);
                const isCoachedGame =
                  coachedTeamId !== null &&
                  (sFix.homeTeamId === coachedTeamId || sFix.awayTeamId === coachedTeamId);
                const hasClubPlayerInGame =
                  releasedNtIds.has(sFix.homeTeamId) || releasedNtIds.has(sFix.awayTeamId);
                const isCurrentGameDay = sFix.date === currentDate;
                const sCompInfo = getInternationalCompDisplayInfo(sFix);

                return (
                  <div
                    key={`intl_${sFix.id}`}
                    onClick={() => {
                      if (sFix.date) {
                        soundEngine.playClick();
                        const [yy, mm] = sFix.date.split('-').map(Number);
                        if (yy && mm) {
                          setViewYear(yy);
                          setViewMonth(mm - 1);
                        }
                        setSelectedDate(sFix.date);
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
                      isCurrentGameDay && isCoachedGame
                        ? 'bg-amber-950/40 border-amber-400 ring-1 ring-amber-400'
                        : isCoachedGame
                        ? 'bg-amber-950/20 border-amber-500/45 hover:border-amber-400/80'
                        : hasClubPlayerInGame
                        ? 'bg-violet-950/25 border-violet-500/40 hover:border-violet-400/70'
                        : 'bg-slate-950/60 border-slate-900 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[225px]">
                      <div className="w-16 text-center font-mono tabular-nums text-xs shrink-0">
                        <span className="block font-black text-amber-200">
                          {formatShortDate(sFix.date || '')}
                        </span>
                        <span className="text-[10px] text-slate-400">{sFix.time || '20:00'}</span>
                      </div>
                      <div className="min-w-0 border-l border-amber-500/30 pl-3">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-amber-400 shrink-0" />
                          <span
                            className="block text-xs font-extrabold leading-tight truncate"
                            style={{ color: sCompInfo.color }}
                          >
                            {sCompInfo.compName}
                          </span>
                        </div>
                        <span className="block text-[10px] text-slate-400 leading-tight truncate mt-0.5 tabular-nums">
                          {sCompInfo.phaseOrRound}
                          {isCoachedGame
                            ? ' · Minha Seleção'
                            : hasClubPlayerInGame
                            ? ` · Atleta(s) do ${userClub.shortName}`
                            : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-center min-w-[220px]">
                      <div className="flex items-center gap-2 justify-end w-36">
                        <span
                          className={`text-xs font-extrabold truncate ${
                            sFix.homeTeamId === coachedTeamId ? 'text-amber-300' : 'text-white'
                          }`}
                        >
                          {homeNt.name}
                        </span>
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center font-black text-[8px] shrink-0"
                          style={{
                            backgroundColor: homeNt.primaryColor,
                            color: homeNt.textColor,
                          }}
                        >
                          {homeNt.code}
                        </div>
                      </div>

                      <div className="font-mono font-black text-sm px-3 py-1 bg-black rounded-lg border border-slate-800 text-center min-w-[64px] tabular-nums">
                        {sFix.played ? (
                          <span className="text-amber-300">
                            {sFix.homeScore} x {sFix.awayScore}
                            {sFix.penaltiesHome !== undefined
                              ? ` (${sFix.penaltiesHome}-${sFix.penaltiesAway})`
                              : ''}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-normal text-xs">vs</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 justify-start w-36">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center font-black text-[8px] shrink-0"
                          style={{
                            backgroundColor: awayNt.primaryColor,
                            color: awayNt.textColor,
                          }}
                        >
                          {awayNt.code}
                        </div>
                        <span
                          className={`text-xs font-extrabold truncate ${
                            sFix.awayTeamId === coachedTeamId ? 'text-amber-300' : 'text-white'
                          }`}
                        >
                          {awayNt.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-right min-w-[80px]">
                      {sFix.played ? (
                        <span className="text-slate-400 text-[11px]">Finalizado</span>
                      ) : isCurrentGameDay && isCoachedGame ? (
                        <span className="text-amber-400 text-[11px] font-black">
                          SELEÇÃO HOJE!
                        </span>
                      ) : (
                        <span className="text-amber-400/80 text-[11px]">Jogo Seleção</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Selected Day Agenda & Match Details */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                  AGENDA DO DIA SELECIONADO
                </span>
                {selectedDate === currentDate && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                    HOJE
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white capitalize leading-tight">
                {formatCalendarDate(selectedDate)}
              </h3>
            </div>

            {/* 0. Selected Day Reserved Data FIFA & Club Athlete Release Panel */}
            {selectedDayFifaWindow && (() => {
              const isReleaseDay = selectedDayFifaWindow.releaseStartDate === selectedDate;
              const isTournament =
                selectedDayFifaWindow.kind === 'WORLD_CUP' ||
                selectedDayFifaWindow.kind === 'CONTINENTAL_CUP';
              const compensationPerGame =
                releasedClubPlayers.length * FIFA_SOLIDARITY_COMPENSATION_PER_PLAYER;

              return (
                <div
                  className={`bg-slate-950 p-4 rounded-xl border space-y-3 ${
                    isTournament ? 'border-amber-500/45' : 'border-violet-500/45'
                  }`}
                >
                  <div className="space-y-2 pb-2 border-b border-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      {selectedDayFifaWindow.seasonLabel && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                          {selectedDayFifaWindow.seasonLabel}
                        </span>
                      )}
                      {selectedDayFifaWindow.matchCountSummary && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-black border ${
                            selectedDayFifaWindow.isSuperFifaWindow
                              ? 'bg-fuchsia-950/60 text-fuchsia-300 border-fuchsia-500/40'
                              : 'bg-violet-950/60 text-violet-300 border-violet-500/40'
                          }`}
                        >
                          {selectedDayFifaWindow.matchCountSummary}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {isReleaseDay ? (
                          <Plane
                            className={`w-4 h-4 shrink-0 ${
                              isTournament ? 'text-amber-400' : 'text-violet-400'
                            }`}
                          />
                        ) : selectedDayFifaWindow.isSuperFifaWindow ? (
                          <Zap className="w-4 h-4 shrink-0 text-fuchsia-400" />
                        ) : (
                          <Globe
                            className={`w-4 h-4 shrink-0 ${
                              isTournament ? 'text-amber-400' : 'text-violet-400'
                            }`}
                          />
                        )}
                        <span
                          className={`text-xs font-black leading-tight ${
                            isTournament
                              ? 'text-amber-300'
                              : selectedDayFifaWindow.isSuperFifaWindow
                              ? 'text-fuchsia-300'
                              : 'text-violet-300'
                          }`}
                        >
                          {selectedDayFifaWindow.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {selectedDayFifaWindow.competitionSummary}
                      </p>
                    </div>

                    {selectedDate === '2030-06-08' && (
                      <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs leading-relaxed">
                        <strong className="text-amber-300 block font-black">
                          🏆 Abertura Oficial · Copa do Mundo FIFA 2030
                        </strong>
                        8 de junho de 2030: Primeiros jogos comemorativos do Centenário na América do Sul (Uruguai, Argentina e Paraguai), antes do torneio seguir para a Espanha, Portugal e Marrocos.
                      </div>
                    )}

                    {selectedDayFifaWindow.isSuperFifaWindow && (
                      <div className="p-2.5 rounded-lg bg-fuchsia-950/40 border border-fuchsia-500/35 text-fuchsia-200 text-[11px] leading-relaxed flex items-start gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-fuchsia-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Super Data FIFA Oficial:</strong> Janela estendida de 16 dias com até 4 partidas de Seleções, substituindo as paradas separadas de setembro e outubro.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Release & Return Schedule */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/70 border border-slate-800/80 rounded-lg p-2 font-mono tabular-nums">
                    <div>
                      <span className="block text-[9px] font-sans uppercase text-slate-400">
                        Liberação
                      </span>
                      <span className="text-[11px] font-bold text-violet-200">
                        {formatShortDate(selectedDayFifaWindow.releaseStartDate)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-sans uppercase text-slate-400">
                        Encerramento
                      </span>
                      <span className="text-[11px] font-bold text-slate-200">
                        {formatShortDate(selectedDayFifaWindow.endDate)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-sans uppercase text-slate-400">
                        Retorno CT
                      </span>
                      <span className="text-[11px] font-bold text-emerald-300">
                        {formatShortDate(selectedDayFifaWindow.returnDate)}
                      </span>
                    </div>
                  </div>

                  {isReleaseDay && (
                    <p className="text-[11px] text-violet-200 bg-violet-950/40 border border-violet-500/30 rounded-lg px-2.5 py-2 leading-relaxed">
                      Data oficial de apresentação FIFA: atletas convocados precisam ser liberados hoje às suas Seleções.
                    </p>
                  )}

                  {selectedUserFixture && releasedClubPlayers.length > 0 && (
                    <div className="flex items-start gap-2 text-[11px] text-amber-200 bg-amber-950/35 border border-amber-500/35 rounded-lg px-2.5 py-2 leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Partida do {userClub.shortName} dentro de período reservado Data FIFA com{' '}
                        <strong className="tabular-nums">{releasedClubPlayers.length}</strong>{' '}
                        atleta(s) convocado(s). Fique atento ao desgaste físico pós-jogo de Seleção.
                      </span>
                    </div>
                  )}

                  {/* Club Athletes Released List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-300">
                        Atletas do {userClub.shortName} Liberados
                      </span>
                      <span className="font-mono tabular-nums font-bold text-violet-300">
                        {releasedClubPlayers.length} convocado(s)
                        {releasedStartersCount > 0 ? ` · ${releasedStartersCount} titular(es)` : ''}
                      </span>
                    </div>

                    {releasedClubPlayers.length > 0 ? (
                      <>
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {releasedClubPlayers.map((cp) => (
                            <div
                              key={cp.playerId}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono font-bold text-[10px] text-slate-400 w-7 shrink-0">
                                  {cp.detailedRole}
                                </span>
                                <span className="font-bold text-white truncate">
                                  {cp.playerName}
                                </span>
                                {cp.isClubStarter && (
                                  <span className="text-[10px] text-sky-400 shrink-0">
                                    · Titular
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                                <span className="text-[10px] text-slate-300 font-bold">
                                  OVR {cp.overall}
                                </span>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-black"
                                  style={{
                                    backgroundColor: cp.nationalTeamPrimaryColor,
                                    color: cp.nationalTeamTextColor,
                                  }}
                                  title={`Convocado por ${cp.nationalTeamName}`}
                                >
                                  {cp.nationalTeamCode}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {compensationPerGame > 0 && (
                          <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                            Compensação FIFA Solidariedade: +
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              maximumFractionDigits: 0,
                            }).format(FIFA_SOLIDARITY_COMPENSATION_PER_PLAYER)}{' '}
                            por atleta convocado à Seleção Brasileira/comandada.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Nenhum jogador do elenco atual do {userClub.shortName} está convocado nesta janela. Todos os atletas permanecem à disposição no clube.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 1. Selected Day Coached Seleção Match Card (if any) */}
            {selectedSelecaoFixture && coachedSelecao && (() => {
              const sCompInfo = getInternationalCompDisplayInfo(selectedSelecaoFixture);
              const homeNt = getNationalTeamById(selectedSelecaoFixture.homeTeamId);
              const awayNt = getNationalTeamById(selectedSelecaoFixture.awayTeamId);
              const canPlaySelecaoNow =
                !selectedSelecaoFixture.played &&
                (selectedDate === currentDate ||
                  selectedSelecaoFixture.status === 'READY_FOR_USER');

              return (
                <div className="space-y-3">
                  <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 space-y-3">
                    <div className="flex items-start justify-between gap-2 text-xs text-slate-400 pb-2 border-b border-slate-900">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-0.5">
                          Partida da Minha Seleção · {coachedSelecao.name}
                        </span>
                        <span
                          className="block font-black text-xs leading-tight"
                          style={{ color: sCompInfo.color }}
                        >
                          {sCompInfo.fullCompName}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-0.5 tabular-nums">
                          {sCompInfo.phaseOrRound}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums shrink-0 text-amber-300 font-bold">
                        {selectedSelecaoFixture.time || '20:00'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 py-2">
                      <div className="flex flex-col items-center text-center w-28">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow border-2 border-white/20 mb-1"
                          style={{
                            backgroundColor: homeNt.primaryColor,
                            color: homeNt.textColor,
                          }}
                        >
                          {homeNt.code}
                        </div>
                        <span className="font-extrabold text-xs text-white truncate max-w-full">
                          {homeNt.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {selectedSelecaoFixture.competition === 'world_cup'
                            ? 'Seleção A'
                            : 'Mandante'}
                        </span>
                      </div>

                      <div className="text-center font-mono tabular-nums">
                        {selectedSelecaoFixture.played ? (
                          <div className="text-xl font-black text-amber-300 bg-black px-3 py-1 rounded-lg border border-slate-800">
                            {selectedSelecaoFixture.homeScore} x {selectedSelecaoFixture.awayScore}
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-amber-400 bg-slate-900 px-3 py-1 rounded-lg border border-amber-500/20">
                            VS
                          </div>
                        )}
                        {selectedSelecaoFixture.penaltiesHome !== undefined && (
                          <span className="text-[10px] text-amber-300 font-bold block mt-1">
                            Pênaltis: {selectedSelecaoFixture.penaltiesHome}–
                            {selectedSelecaoFixture.penaltiesAway}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 block mt-1">
                          {selectedSelecaoFixture.played ? 'Encerrado' : 'Convocação FIFA'}
                        </span>
                      </div>

                      <div className="flex flex-col items-center text-center w-28">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow border-2 border-white/20 mb-1"
                          style={{
                            backgroundColor: awayNt.primaryColor,
                            color: awayNt.textColor,
                          }}
                        >
                          {awayNt.code}
                        </div>
                        <span className="font-extrabold text-xs text-white truncate max-w-full">
                          {awayNt.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {selectedSelecaoFixture.competition === 'world_cup'
                            ? 'Seleção B'
                            : 'Visitante'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2 border-t border-slate-900">
                      <MapPin className="w-3.5 h-3.5 text-amber-400/80" />
                      <span className="truncate">{selectedSelecaoFixture.stadiumName}</span>
                    </div>
                  </div>

                  {canPlaySelecaoNow ? (
                    <button
                      onClick={() => triggerPlaySelecao(selectedSelecaoFixture.id)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>ESCALAR E JOGAR PELA SELEÇÃO</span>
                    </button>
                  ) : !selectedSelecaoFixture.played && onOpenSelecaoTab ? (
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        onOpenSelecaoTab();
                      }}
                      className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5 text-amber-400" />
                      <span>Revisar Convocação (26 Atletas)</span>
                    </button>
                  ) : null}
                </div>
              );
            })()}

            {/* 2. Selected Day User Club Match Card (if any) */}
            {selectedUserFixture ? (
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-sky-950 space-y-3">
                  <div className="flex items-start justify-between gap-2 text-xs text-slate-400 pb-2 border-b border-slate-900">
                    {(() => {
                      const compInfo = getCompetitionDisplayInfo(selectedUserFixture);
                      return (
                        <div className="min-w-0">
                          <span
                            className="block font-black text-xs leading-tight"
                            style={{ color: compInfo.color }}
                          >
                            {compInfo.fullCompName}
                          </span>
                          <span className="block text-[11px] text-slate-400 mt-0.5 tabular-nums">
                            {compInfo.phaseOrRound}
                          </span>
                        </div>
                      );
                    })()}
                    <span className="font-mono tabular-nums shrink-0">
                      {selectedUserFixture.time || '16:00'}
                    </span>
                  </div>

                  {(() => {
                    const home = allClubs.find((c) => c.id === selectedUserFixture.homeTeamId);
                    const away = allClubs.find((c) => c.id === selectedUserFixture.awayTeamId);
                    const selectedRivalry = getMatchRivalryInfo(home, away);

                    return (
                      <>
                        {selectedRivalry && (
                          <div className="py-1.5 px-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-center">
                            <p className="text-xs font-bold text-amber-300">
                              {selectedRivalry.derbyName}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {selectedRivalry.atmosphereSubtitle}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 py-2">
                          <div className="flex flex-col items-center text-center w-28">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow border-2 border-white/20 mb-1"
                              style={{
                                backgroundColor: home ? home.colors.primary : '#1e293b',
                                color: home ? home.colors.text : '#94a3b8',
                              }}
                            >
                              {home ? home.initials : 'TBD'}
                            </div>
                            <span className="font-extrabold text-xs text-white truncate max-w-full">
                              {home ? home.name : 'A Definir'}
                            </span>
                            <span className="text-[10px] text-slate-400">Mandante</span>
                          </div>

                          <div className="text-center font-mono tabular-nums">
                            {selectedUserFixture.played ? (
                              <div className="text-xl font-black text-sky-300 bg-black px-3 py-1 rounded-lg border border-slate-800">
                                {selectedUserFixture.homeScore} x {selectedUserFixture.awayScore}
                              </div>
                            ) : (
                              <div className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-lg">
                                VS
                              </div>
                            )}
                            <span className="text-[10px] text-slate-500 block mt-1">
                              {selectedUserFixture.played ? 'Encerrado' : 'A Disputar'}
                            </span>
                          </div>

                          <div className="flex flex-col items-center text-center w-28">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow border-2 border-white/20 mb-1"
                              style={{
                                backgroundColor: away ? away.colors.primary : '#1e293b',
                                color: away ? away.colors.text : '#94a3b8',
                              }}
                            >
                              {away ? away.initials : 'TBD'}
                            </div>
                            <span className="font-extrabold text-xs text-white truncate max-w-full">
                              {away ? away.name : 'A Definir'}
                            </span>
                            <span className="text-[10px] text-slate-400">Visitante</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2 border-t border-slate-900">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {selectedUserFixture.stadiumName ||
                        (selectedUserFixture.homeTeamId === userClub.id
                          ? userClub.stadium.name
                          : allClubs.find((c) => c.id === selectedUserFixture.homeTeamId)?.stadium
                              .name || 'Local a Definir')}
                    </span>
                  </div>
                </div>

                {selectedDate === currentDate && !selectedUserFixture.played && (
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      onPlayMatch();
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-sm shadow-xl shadow-sky-500/20 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>INICIAR ESTA PARTIDA AGORA</span>
                  </button>
                )}
              </div>
            ) : !selectedSelecaoFixture ? (
              /* Non-match day */
              <div className="space-y-4">
                {filterMode !== 'selecao' &&
                  (reservedDomesticCupDatesByDate.get(selectedDate) || []).length > 0 && (
                    <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/35 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <Trophy className="w-4 h-4 shrink-0" />
                        <span className="font-bold text-xs uppercase tracking-wider">
                          Copa Nacional · Data Reservada (A definir)
                        </span>
                      </div>
                      {(reservedDomesticCupDatesByDate.get(selectedDate) || []).map((slot) => (
                        <div
                          key={`${slot.compKey}_${selectedDate}`}
                          className="text-xs text-slate-300 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold truncate" style={{ color: slot.color }}>
                              {slot.compName}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {slot.phaseOrRound} · Adversário definido após conclusão da fase anterior
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-300 whitespace-nowrap shrink-0">
                            Reservado
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2.5 text-sky-400">
                    <Dumbbell className="w-5 h-5" />
                    <span className="font-extrabold text-xs uppercase tracking-wider">
                      {selectedDayFifaWindow
                        ? 'TREINO NO CT · PAUSA PARA DATA FIFA'
                        : 'DIA DE TREINAMENTO & RECUPERAÇÃO'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedDayFifaWindow && releasedClubPlayers.length > 0
                      ? `Enquanto ${releasedClubPlayers.length} atleta(s) servem suas Seleções na ${selectedDayFifaWindow.name}, o restante do elenco trabalha normalmente no CT e recupera energia física (+20% por dia).`
                      : `Nenhum jogo oficial agendado para o seu clube${
                          coachedSelecao ? ` ou para ${coachedSelecao.name}` : ''
                        } nesta data. Seus jogadores realizam trabalhos regenerativos e recuperam energia física (+20% de físico por dia passado).`}
                  </p>

                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Foco Geral:</span>
                      <strong className="text-sky-300">
                        {userClub.teamTrainingFocus || 'Equilibrado'}
                      </strong>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="font-sans">Atletas no CT Hoje:</span>
                      <strong className="text-slate-200">
                        {selectedDayFifaWindow
                          ? `${Math.max(0, userClub.squad.length - releasedClubPlayers.length)} / ${userClub.squad.length}`
                          : `${userClub.squad.length} / ${userClub.squad.length}`}
                      </strong>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="font-sans">Condição Média do Elenco:</span>
                      <strong className="text-emerald-400">
                        {Math.round(
                          userClub.squad.reduce((acc, p) => acc + p.condition, 0) /
                            userClub.squad.length
                        )}
                        %
                      </strong>
                    </div>
                  </div>
                </div>

                {selectedDate === currentDate && (
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      onAdvanceDay();
                    }}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs cursor-pointer border border-slate-700 flex items-center justify-center gap-2 transition-all hover:border-emerald-500/50"
                  >
                    <CalendarIcon className="w-4 h-4 text-emerald-400" />
                    <span>Concluir Treinos e Avançar para Amanhã (+20% Físico)</span>
                  </button>
                )}
              </div>
            ) : null}

            {/* 3. Other Club Matches on this date */}
            {selectedDateClubFixtures.length > (selectedUserFixture ? 1 : 0) && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Outros Jogos de Clubes ({selectedDateClubFixtures.length - (selectedUserFixture ? 1 : 0)})
                </span>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs">
                  {selectedDateClubFixtures
                    .filter((f) => f.id !== selectedUserFixture?.id)
                    .map((m) => {
                      const h = allClubs.find((c) => c.id === m.homeTeamId);
                      const a = allClubs.find((c) => c.id === m.awayTeamId);
                      const mCompInfo = getCompetitionDisplayInfo(m);

                      return (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1 text-[11px]"
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <span
                              className="font-bold truncate"
                              style={{ color: mCompInfo.color }}
                            >
                              {mCompInfo.compName}
                            </span>
                            <span className="text-slate-500 truncate tabular-nums">
                              {mCompInfo.phaseOrRound}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-200 truncate w-24">
                              {h ? h.shortName : 'A Definir'}
                            </span>
                            <span className="font-mono font-bold text-sky-400 tabular-nums shrink-0">
                              {m.played ? `${m.homeScore} x ${m.awayScore}` : m.time || '16:00'}
                            </span>
                            <span className="font-semibold text-slate-200 truncate w-24 text-right">
                              {a ? a.shortName : 'A Definir'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 4. Other International / FIFA Matches on this date */}
            {(() => {
              const otherIntlOnDay = (intlFixturesByDate.get(selectedDate) || []).filter(
                (f) => f.id !== selectedSelecaoFixture?.id
              );
              if (otherIntlOnDay.length === 0) {
                return null;
              }
              return (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider">
                      Jogos de Seleções Nesta Data ({otherIntlOnDay.length})
                    </span>
                    {onOpenSelecaoTab && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onOpenSelecaoTab();
                        }}
                        className="text-[11px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                      >
                        Ver Seleções
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs">
                    {otherIntlOnDay.map((m) => {
                      const h = getNationalTeamById(m.homeTeamId);
                      const a = getNationalTeamById(m.awayTeamId);
                      const mCompInfo = getInternationalCompDisplayInfo(m);
                      const involvesClubAthlete =
                        releasedNtIds.has(m.homeTeamId) || releasedNtIds.has(m.awayTeamId);

                      return (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded-lg border space-y-1 text-[11px] ${
                            involvesClubAthlete
                              ? 'bg-violet-950/30 border-violet-500/40'
                              : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <span
                              className="font-bold truncate"
                              style={{ color: mCompInfo.color }}
                            >
                              {mCompInfo.compactCompName}
                            </span>
                            <span className="text-slate-400 truncate tabular-nums">
                              {mCompInfo.phaseOrRound}
                              {involvesClubAthlete ? ' · Atleta do clube' : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-200 truncate w-24">
                              {h.name}
                            </span>
                            <span className="font-mono font-bold text-amber-300 tabular-nums shrink-0">
                              {m.played
                                ? `${m.homeScore} x ${m.awayScore}`
                                : m.time || '20:00'}
                            </span>
                            <span className="font-semibold text-slate-200 truncate w-24 text-right">
                              {a.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modal: Pre-Season Tours & Lucrative Friendlies */}
      {showFriendlyModal && onScheduleFriendlyTour && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl p-5 sm:p-6 space-y-4 my-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Departamento Comercial & Internacionalização
                </div>
                <h3 className="text-lg font-black text-white mt-0.5">
                  Excursões de Pré-Temporada & Amistosos Lucrativos
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Agende amistosos internacionais em datas livres da sua agenda (mínimo de 3 dias de descanso entre jogos oficiais) para faturar cotas comerciais garantidas e acelerar o ritmo do elenco.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFriendlyModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                Fechar
              </button>
            </div>

            {friendlyFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold ${
                  friendlyFeedback.ok
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                }`}
              >
                {friendlyFeedback.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {friendlyPackages.map((pkg) => {
                const totalFee = pkg.commercialFeePerMatch * pkg.matchesCount;
                const fmtMoney = (v: number) =>
                  new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    maximumFractionDigits: 0,
                  }).format(v);

                return (
                  <div
                    key={pkg.id}
                    className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs text-slate-400 tabular-nums">
                            {pkg.matchesCount} {pkg.matchesCount === 1 ? 'jogo' : 'jogos'} · {pkg.staminaNote}
                          </div>
                          <h4 className="text-sm font-black text-white mt-0.5">
                            {pkg.badge} {pkg.title}
                          </h4>
                        </div>
                        <div className="text-right font-mono tabular-nums shrink-0">
                          <div className="text-[10px] text-slate-400">Cota Total</div>
                          <div className="text-sm font-black text-emerald-400">
                            {fmtMoney(totalFee)}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {pkg.subtitle}
                      </p>

                      <div className="text-[11px] text-sky-300 font-medium">
                        {pkg.xpBonusLabel}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        const res = onScheduleFriendlyTour(pkg.id);
                        setFriendlyFeedback({ ok: res.success, text: res.message });
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer tabular-nums"
                    >
                      Agendar no Calendário (+{fmtMoney(totalFee)})
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Calendário Oficial FIFA 2026-2030 na América do Sul & Europa */}
      {showFifaScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-2 sm:p-5 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Calendário Internacional de Datas FIFA & Marcos (2026–2030)
                    </h3>
                    <p className="text-xs text-emerald-400 font-mono font-bold">
                      América do Sul (CONMEBOL & Brasil) · Europa (UEFA) · Copas do Mundo FIFA
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  Planejamento oficial alinhado à CBF, FIFA e CONMEBOL: Copa do Mundo (2026, 2030, 2034...), calendário contínuo sem parada de Copa em 2027 (e 2031...), Copa América & Euro (2028, 2032...), Super Mundial de Clubes (2029, 2033...) e Datas FIFA oficiais. Clique em qualquer marco para navegar diretamente até ele.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setShowFifaScheduleModal(false);
                }}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Region Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { id: 'ALL', label: 'Todos os Marcos', icon: '🌐' },
                { id: 'CONMEBOL', label: 'América do Sul (CONMEBOL & Brasil)', icon: '🌎' },
                { id: 'UEFA', label: 'Europa (UEFA)', icon: '🇪🇺' },
                { id: 'GLOBAL', label: 'Torneios Mundiais & Copas', icon: '🏆' },
              ].map((tab) => {
                const count = OFFICIAL_FIFA_SCHEDULE_2026_2030.filter((item) => {
                  if (tab.id === 'ALL') return true;
                  if (tab.id === 'CONMEBOL') {
                    return item.region === 'CONMEBOL' || item.isCopaAmerica || item.isWomensWorldCup || item.isCentenario;
                  }
                  if (tab.id === 'UEFA') {
                    return item.region === 'UEFA' || item.isEuro;
                  }
                  if (tab.id === 'GLOBAL') {
                    return item.isWorldCup || item.isCentenario || item.isCopaAmerica || item.isEuro || item.id.includes('draw');
                  }
                  return true;
                }).length;

                const isSelected = fifaModalRegion === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setFifaModalRegion(tab.id as 'ALL' | 'CONMEBOL' | 'UEFA' | 'GLOBAL');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grouped by Seasons */}
            <div className="space-y-6">
              {[
                'Temporada 2026',
                'Temporada 2027',
                'Temporada 2028',
                'Temporada 2029',
                'Temporada 2030 (Ano da Copa)',
              ].map((seasonName) => {
                const items = OFFICIAL_FIFA_SCHEDULE_2026_2030.filter((it) => {
                  if (it.season !== seasonName) return false;
                  if (fifaModalRegion === 'ALL') return true;
                  if (fifaModalRegion === 'CONMEBOL') {
                    return it.region === 'CONMEBOL' || it.isCopaAmerica || it.isWomensWorldCup || it.isCentenario;
                  }
                  if (fifaModalRegion === 'UEFA') {
                    return it.region === 'UEFA' || it.isEuro;
                  }
                  if (fifaModalRegion === 'GLOBAL') {
                    return it.isWorldCup || it.isCentenario || it.isCopaAmerica || it.isEuro || it.id.includes('draw');
                  }
                  return true;
                });

                if (items.length === 0) return null;

                return (
                  <div key={seasonName} className="space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                      <h4 className="font-black text-sm text-sky-300 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        {seasonName}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">
                        {items.length} {items.length === 1 ? 'evento' : 'eventos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((item) => {
                        const isPast = currentDate > item.endDate;
                        const isNow = currentDate >= item.startDate && currentDate <= item.endDate;

                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                              isNow
                                ? 'bg-violet-950/40 border-violet-400 ring-1 ring-violet-400 shadow-lg shadow-violet-900/30'
                                : item.isCentenario
                                ? 'bg-gradient-to-br from-amber-950/40 via-yellow-950/20 to-slate-900 border-amber-400/60 hover:border-amber-300 ring-1 ring-amber-400/30'
                                : item.isWomensWorldCup
                                ? 'bg-gradient-to-br from-rose-950/40 via-pink-950/20 to-slate-900 border-rose-500/50 hover:border-rose-400'
                                : item.isCopaAmerica
                                ? 'bg-gradient-to-br from-emerald-950/40 via-teal-950/20 to-slate-900 border-emerald-500/50 hover:border-emerald-400'
                                : item.isSuper
                                ? 'bg-gradient-to-br from-fuchsia-950/30 via-slate-950 to-slate-900 border-fuchsia-500/40 hover:border-fuchsia-400'
                                : item.isWorldCup
                                ? 'bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-900 border-amber-500/40 hover:border-amber-400'
                                : item.isEuro
                                ? 'bg-gradient-to-br from-sky-950/30 via-slate-950 to-slate-900 border-sky-500/40 hover:border-sky-400'
                                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="space-y-2">
                              {/* Top row: Period & Status badge */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="text-[11px] font-black text-white font-mono tabular-nums flex items-center gap-1.5">
                                    {item.isSuper ? (
                                      <Zap className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                                    ) : item.isCentenario ? (
                                      <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                    ) : item.isWomensWorldCup ? (
                                      <Trophy className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    ) : item.isCopaAmerica ? (
                                      <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    ) : item.isWorldCup || item.isEuro ? (
                                      <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    ) : (
                                      <Plane className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                    )}
                                    <span>{item.periodLabel}</span>
                                  </div>
                                  <div className="text-xs font-black text-slate-200">
                                    {item.name}
                                  </div>
                                </div>

                                <div className="shrink-0 flex flex-col items-end gap-1">
                                  {isNow ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-slate-950 animate-pulse">
                                      EM ANDAMENTO
                                    </span>
                                  ) : isPast ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                                      Concluída
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950/60 text-violet-300 border border-violet-500/30">
                                      Agendada
                                    </span>
                                  )}

                                  <div className="flex items-center gap-1">
                                    {item.region === 'CONMEBOL' ? (
                                      <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        CONMEBOL
                                      </span>
                                    ) : item.region === 'UEFA' ? (
                                      <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                        UEFA
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                        MUNDIAL
                                      </span>
                                    )}

                                    <span
                                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                        item.isCentenario
                                          ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40 font-black'
                                          : item.isWomensWorldCup
                                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                                          : item.isCopaAmerica
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                                          : item.isSuper
                                          ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                                          : item.isWorldCup
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                          : item.isEuro
                                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                          : 'bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {item.description}
                              </p>
                              {item.matchesNote && (
                                <p className="text-[11px] text-slate-400 italic">
                                  Nota: {item.matchesNote}
                                </p>
                              )}
                            </div>

                            {/* Jump Button */}
                            <button
                              type="button"
                              onClick={() => {
                                jumpToCalendarDate(item.startDate);
                                setShowFifaScheduleModal(false);
                              }}
                              className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                isNow
                                  ? 'bg-violet-500 hover:bg-violet-400 text-white font-black'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                              }`}
                            >
                              <CalendarIcon className="w-3.5 h-3.5" />
                              <span>Ver no Calendário ({formatShortDate(item.startDate)})</span>
                            </button>
                          </div>
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
    </div>
  );
};

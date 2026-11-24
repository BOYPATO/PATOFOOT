import { Club, Fixture, EuropeanCupId, EuropeanLeagueId } from '../types/game';
import { getClubsForEuropeanLeague } from './europeLeaguesEngine';
import {
  getEuropeanLeagueScheduleDates,
  getSeasonFifaBlockedDatesSet,
  getUefaBlockedDatesSet,
  resolveCupScheduleConflicts,
} from './calendarUtils';
import { assignSingleLegSlots, assignTwoLeggedSlots, resolveTieWinner } from './multiLeagueEngine';
import { getClubStadiumName } from './englishCupsEngine';

export const EUROPEAN_CUP_IDS: EuropeanCupId[] = [
  'esp_copa_del_rey',
  'esp_supercopa',
  'ger_dfb_pokal',
  'ger_supercup',
  'fra_coupe_de_france',
  'fra_trophee_champions',
  'ita_coppa_italia',
  'ita_supercoppa',
  'por_taca_portugal',
  'por_supertaca',
  'ned_knvb_beker',
  'ned_johan_cruyff',
  'bel_croky_cup',
  'bel_supercup',
  'tur_turkiye_kupasi',
  'tur_super_kupa',
  'gre_kypello_elladas',
  'nor_nm_cup',
  'den_dbu_pokalen',
  'sui_schweizer_cup',
  'swe_svenska_cupen',
  'sco_scottish_cup',
  'eu_sp1_cup',
  'eu_sp2_cup',
];

export function isEuropeanCup(comp: string): comp is EuropeanCupId {
  return (EUROPEAN_CUP_IDS as string[]).includes(comp);
}

export function flattenEuropeanCupsFixtures(
  fixturesMap?: Partial<Record<EuropeanCupId, Fixture[]>>
): Fixture[] {
  if (!fixturesMap) return [];
  return Object.values(fixturesMap).flat().filter(Boolean);
}

// Pseudo-shuffle determinístico por ano/seed
function pseudoShuffle<T>(arr: T[], seedSalt: number = 42): T[] {
  const result = [...arr];
  let seed = Math.abs(seedSalt) + 1;
  for (let i = result.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    const j = Math.floor(rnd * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

// ==========================================
// 1. ESPANHA: Copa del Rey & Supercopa de España
// ==========================================

export function generateCopaDelReyFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const laLigaClubs = getClubsForEuropeanLeague(clubs, 'esp_laliga');
  const shuffled = pseudoShuffle(laLigaClubs, seasonYear * 31);
  const fixtures: Fixture[] = [];

  // 20 clubes: 8 clubes disputam a 1ª Fase (Preliminar) -> 4 avançam; 12 clubes entram direto nas Oitavas.
  const prelimClubs = shuffled.slice(12, 20); // 8 clubes
  const directR16Clubs = shuffled.slice(0, 12); // 12 clubes

  // Preliminar: 4 confrontos em jogo único
  for (let i = 0; i < 4; i++) {
    const home = prelimClubs[i * 2];
    const away = prelimClubs[i * 2 + 1];
    fixtures.push({
      id: `esp_cdr_r1_m${i}`,
      round: 1,
      competition: 'esp_copa_del_rey',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-10-28`,
      time: '20:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Fase (Preliminar)',
      groupName: 'Copa del Rey · 1ª Fase Eliminatória em Jogo Único',
    });
  }

  // Oitavas de Final: 8 confrontos (4 com 1 clube direto vs vencedor preliminar, 4 com 2 clubes diretos)
  for (let i = 0; i < 8; i++) {
    const home = directR16Clubs[i] || directR16Clubs[0];
    const awayId = i < 4 ? 'TBD_CDR_R1' : directR16Clubs[i + 4]?.id || 'tbd';
    fixtures.push({
      id: `esp_cdr_r16_m${i}`,
      round: 2,
      competition: 'esp_copa_del_rey',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '20:30',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Copa del Rey · Oitavas de Final em Jogo Único',
    });
  }

  // Quartas de Final: 4 confrontos
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `esp_cdr_qf_m${i}`,
      round: 3,
      competition: 'esp_copa_del_rey',
      homeTeamId: 'TBD_CDR_R16',
      awayTeamId: 'TBD_CDR_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-03`,
      time: '21:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Copa del Rey · Quartas de Final em Jogo Único',
    });
  }

  // Semifinais: 2 confrontos em IDA E VOLTA (tradição espanhola)
  for (let i = 0; i < 2; i++) {
    fixtures.push(
      {
        id: `esp_cdr_sf_m${i}_ida`,
        round: 4,
        competition: 'esp_copa_del_rey',
        homeTeamId: 'TBD_CDR_QF',
        awayTeamId: 'TBD_CDR_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-03-03`,
        time: '21:00',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Ida)',
        groupName: 'Copa del Rey · Semifinal · Jogo de Ida',
        leg: 1,
      },
      {
        id: `esp_cdr_sf_m${i}_volta`,
        round: 5,
        competition: 'esp_copa_del_rey',
        homeTeamId: 'TBD_CDR_QF',
        awayTeamId: 'TBD_CDR_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-04-21`,
        time: '21:00',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Volta)',
        groupName: 'Copa del Rey · Semifinal · Jogo de Volta',
        leg: 2,
      }
    );
  }

  // Grande Final em Sevilha (Estadio de La Cartuja)
  fixtures.push({
    id: 'esp_cdr_final',
    round: 6,
    competition: 'esp_copa_del_rey',
    homeTeamId: 'TBD_CDR_SF0',
    awayTeamId: 'TBD_CDR_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-08`,
    time: '21:30',
    stadiumName: 'Estadio de La Cartuja (Sevilla)',
    cupPhase: 'Grande Final',
    groupName: 'Copa del Rey · Grande Decisão no Estadio de La Cartuja',
  });

  return fixtures;
}

export function generateSpanishSupercupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const laLiga = getClubsForEuropeanLeague(clubs, 'esp_laliga');

  // Semifinal 1: 02/02/2027 Barcelona x Atlético de Madrid
  // Semifinal 2: 03/02/2027 Real Sociedad x Real Madrid
  // Final: 06/02/2027
  const bcn = laLiga.find((c) => c.id === 'eu_fcb')?.id || 'eu_fcb';
  const atm = laLiga.find((c) => c.id === 'eu_atm')?.id || 'eu_atm';
  const rso = laLiga.find((c) => c.id === 'eu_rso')?.id || 'eu_rso';
  const rma = laLiga.find((c) => c.id === 'eu_rma')?.id || 'eu_rma';

  return [
    {
      id: 'esp_super_sf0',
      round: 1,
      competition: 'esp_supercopa',
      homeTeamId: bcn,
      awayTeamId: atm,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-02`,
      time: '20:00',
      stadiumName: 'King Fahd International Stadium',
      cupPhase: 'Semifinal 1',
      groupName: 'Supercopa de España · Semifinal 1',
    },
    {
      id: 'esp_super_sf1',
      round: 1,
      competition: 'esp_supercopa',
      homeTeamId: rso,
      awayTeamId: rma,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-03`,
      time: '20:00',
      stadiumName: 'King Fahd International Stadium',
      cupPhase: 'Semifinal 2',
      groupName: 'Supercopa de España · Semifinal 2',
    },
    {
      id: 'esp_super_final',
      round: 2,
      competition: 'esp_supercopa',
      homeTeamId: 'TBD_SUPER_SF0',
      awayTeamId: 'TBD_SUPER_SF1',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-06`,
      time: '20:00',
      stadiumName: 'King Fahd International Stadium',
      cupPhase: 'Grande Final',
      groupName: 'Supercopa de España · Grande Decisão',
    },
  ];
}

// ==========================================
// 2. ALEMANHA: DFB-Pokal & Franz Beckenbauer Supercup
// ==========================================

export function generateDfbPokalFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const bld = getClubsForEuropeanLeague(clubs, 'ger_bundesliga');
  const shuffled = pseudoShuffle(bld, seasonYear * 37);
  const fixtures: Fixture[] = [];

  // 18 clubes: 4 disputam preliminar -> 2 avançam; 14 entram direto nas Oitavas (16 clubes).
  const prelim = shuffled.slice(14, 18);
  const directR16 = shuffled.slice(0, 14);

  for (let i = 0; i < 2; i++) {
    const home = prelim[i * 2];
    const away = prelim[i * 2 + 1];
    fixtures.push({
      id: `ger_dfb_r1_m${i}`,
      round: 1,
      competition: 'ger_dfb_pokal',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-10-28`,
      time: '19:45',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Rodada',
      groupName: 'DFB-Pokal · 1ª Fase em Jogo Único',
    });
  }

  for (let i = 0; i < 8; i++) {
    const pairIdx = 2 + (i - 2) * 2;
    const home = i < 2 ? directR16[i] : directR16[pairIdx];
    const awayId = i < 2 ? 'TBD_DFB_R1' : directR16[pairIdx + 1]?.id || 'tbd';
    fixtures.push({
      id: `ger_dfb_r16_m${i}`,
      round: 2,
      competition: 'ger_dfb_pokal',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-12-02`,
      time: '20:45',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'DFB-Pokal · Oitavas de Final em Jogo Único',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `ger_dfb_qf_m${i}`,
      round: 3,
      competition: 'ger_dfb_pokal',
      homeTeamId: 'TBD_DFB_R16',
      awayTeamId: 'TBD_DFB_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '20:45',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'DFB-Pokal · Quartas de Final em Jogo Único',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `ger_dfb_sf_m${i}`,
      round: 4,
      competition: 'ger_dfb_pokal',
      homeTeamId: 'TBD_DFB_QF',
      awayTeamId: 'TBD_DFB_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-04-07`,
      time: '20:45',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'DFB-Pokal · Semifinal em Jogo Único',
    });
  }

  fixtures.push({
    id: 'ger_dfb_final',
    round: 5,
    competition: 'ger_dfb_pokal',
    homeTeamId: 'TBD_DFB_SF0',
    awayTeamId: 'TBD_DFB_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-29`,
    time: '20:00',
    stadiumName: 'Olympiastadion (Berlin)',
    cupPhase: 'Grande Final',
    groupName: 'DFB-Pokal · Grande Decisão no Olympiastadion de Berlim',
  });

  return fixtures;
}

export function generateGermanSupercupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const bld = getClubsForEuropeanLeague(clubs, 'ger_bundesliga');
  const bvb = bld.find((c) => c.id === 'eu_bvb')?.id || 'eu_bvb';
  const bay = bld.find((c) => c.id === 'eu_bay')?.id || 'eu_bay';

  // 22 de agosto de 2026: Borussia Dortmund x Bayern de Munique
  return [
    {
      id: 'ger_supercup_final',
      round: 1,
      competition: 'ger_supercup',
      homeTeamId: bvb,
      awayTeamId: bay,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-08-22`,
      time: '20:30',
      stadiumName: 'Signal Iduna Park (Dortmund)',
      cupPhase: 'Franz Beckenbauer Supercup',
      groupName: 'Supercopa da Alemanha · Franz Beckenbauer Supercup',
    },
  ];
}

// ==========================================
// 3. FRANÇA: Coupe de France & Trophée des Champions
// ==========================================

export function generateCoupeDeFranceFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const ligue1 = getClubsForEuropeanLeague(clubs, 'fra_ligue1');
  const shuffled = pseudoShuffle(ligue1, seasonYear * 41);
  const fixtures: Fixture[] = [];

  const prelim = shuffled.slice(14, 18);
  const directR16 = shuffled.slice(0, 14);

  for (let i = 0; i < 2; i++) {
    const home = prelim[i * 2];
    const away = prelim[i * 2 + 1];
    fixtures.push({
      id: `fra_cdf_r1_m${i}`,
      round: 1,
      competition: 'fra_coupe_de_france',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-12-02`,
      time: '20:45',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Fase',
      groupName: 'Coupe de France · 1ª Fase Eliminatória',
    });
  }

  for (let i = 0; i < 8; i++) {
    const pairIdx = 2 + (i - 2) * 2;
    const home = i < 2 ? directR16[i] : directR16[pairIdx];
    const awayId = i < 2 ? 'TBD_CDF_R1' : directR16[pairIdx + 1]?.id || 'tbd';
    fixtures.push({
      id: `fra_cdf_r16_m${i}`,
      round: 2,
      competition: 'fra_coupe_de_france',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '21:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Coupe de France · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `fra_cdf_qf_m${i}`,
      round: 3,
      competition: 'fra_coupe_de_france',
      homeTeamId: 'TBD_CDF_R16',
      awayTeamId: 'TBD_CDF_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '21:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Coupe de France · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `fra_cdf_sf_m${i}`,
      round: 4,
      competition: 'fra_coupe_de_france',
      homeTeamId: 'TBD_CDF_QF',
      awayTeamId: 'TBD_CDF_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-04-07`,
      time: '21:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'Coupe de France · Semifinal',
    });
  }

  fixtures.push({
    id: 'fra_cdf_final',
    round: 5,
    competition: 'fra_coupe_de_france',
    homeTeamId: 'TBD_CDF_SF0',
    awayTeamId: 'TBD_CDF_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-15`,
    time: '21:00',
    stadiumName: 'Stade de France (Saint-Denis)',
    cupPhase: 'Grande Final',
    groupName: 'Coupe de France · Grande Decisão no Stade de France',
  });

  return fixtures;
}

export function generateFrenchSupercupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const l1 = getClubsForEuropeanLeague(clubs, 'fra_ligue1');
  const psg = l1.find((c) => c.id === 'eu_psg')?.id || 'eu_psg';
  const om = l1.find((c) => c.id === 'eu_om')?.id || 'eu_om';

  return [
    {
      id: 'fra_super_final',
      round: 1,
      competition: 'fra_trophee_champions',
      homeTeamId: psg,
      awayTeamId: om,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-08-15`,
      time: '20:45',
      stadiumName: 'Stade de France (Saint-Denis)',
      cupPhase: 'Trophée des Champions',
      groupName: 'Supercopa da França · Trophée des Champions',
    },
  ];
}

// ==========================================
// 4. ITÁLIA: Coppa Italia & Supercoppa Italiana
// ==========================================

export function generateCoppaItaliaFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const serieA = getClubsForEuropeanLeague(clubs, 'ita_serie_a');
  const shuffled = pseudoShuffle(serieA, seasonYear * 43);
  const fixtures: Fixture[] = [];

  // 20 clubes: 8 disputam preliminar -> 4 avançam; 12 entram direto nas Oitavas.
  const prelim = shuffled.slice(12, 20);
  const directR16 = shuffled.slice(0, 12);

  for (let i = 0; i < 4; i++) {
    const home = prelim[i * 2];
    const away = prelim[i * 2 + 1];
    fixtures.push({
      id: `ita_ci_r1_m${i}`,
      round: 1,
      competition: 'ita_coppa_italia',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-10-28`,
      time: '20:45',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Fase',
      groupName: 'Coppa Italia · 1ª Fase Eliminatória',
    });
  }

  for (let i = 0; i < 8; i++) {
    const home = directR16[i] || directR16[0];
    const awayId = i < 4 ? 'TBD_CI_R1' : directR16[i + 4]?.id || 'tbd';
    fixtures.push({
      id: `ita_ci_r16_m${i}`,
      round: 2,
      competition: 'ita_coppa_italia',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '20:45',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Coppa Italia · Oitavas de Final em Jogo Único',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `ita_ci_qf_m${i}`,
      round: 3,
      competition: 'ita_coppa_italia',
      homeTeamId: 'TBD_CI_R16',
      awayTeamId: 'TBD_CI_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-03`,
      time: '20:45',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Coppa Italia · Quartas de Final em Jogo Único',
    });
  }

  // Semifinais em IDA E VOLTA (tradição italiana)
  for (let i = 0; i < 2; i++) {
    fixtures.push(
      {
        id: `ita_ci_sf_m${i}_ida`,
        round: 4,
        competition: 'ita_coppa_italia',
        homeTeamId: 'TBD_CI_QF',
        awayTeamId: 'TBD_CI_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-03-03`,
        time: '20:45',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Ida)',
        groupName: 'Coppa Italia · Semifinal · Jogo de Ida',
        leg: 1,
      },
      {
        id: `ita_ci_sf_m${i}_volta`,
        round: 5,
        competition: 'ita_coppa_italia',
        homeTeamId: 'TBD_CI_QF',
        awayTeamId: 'TBD_CI_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-04-21`,
        time: '20:45',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Volta)',
        groupName: 'Coppa Italia · Semifinal · Jogo de Volta',
        leg: 2,
      }
    );
  }

  fixtures.push({
    id: 'ita_ci_final',
    round: 6,
    competition: 'ita_coppa_italia',
    homeTeamId: 'TBD_CI_SF0',
    awayTeamId: 'TBD_CI_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-12`,
    time: '20:45',
    stadiumName: 'Stadio Olimpico (Roma)',
    cupPhase: 'Grande Final',
    groupName: 'Coppa Italia · Grande Decisão no Stadio Olimpico de Roma',
  });

  return fixtures;
}

export function generateItalianSupercupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const serieA = getClubsForEuropeanLeague(clubs, 'ita_serie_a');
  const int = serieA.find((c) => c.id === 'eu_int')?.id || 'eu_int';
  const ata = serieA.find((c) => c.id === 'eu_ata')?.id || 'eu_ata';
  const acm = serieA.find((c) => c.id === 'eu_acm')?.id || 'eu_acm';
  const juv = serieA.find((c) => c.id === 'eu_juv')?.id || 'eu_juv';

  return [
    {
      id: 'ita_super_sf0',
      round: 1,
      competition: 'ita_supercoppa',
      homeTeamId: int,
      awayTeamId: ata,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-14`,
      time: '20:00',
      stadiumName: 'Al-Awwal Park',
      cupPhase: 'Semifinal 1',
      groupName: 'Supercoppa Italiana · Semifinal 1',
    },
    {
      id: 'ita_super_sf1',
      round: 1,
      competition: 'ita_supercoppa',
      homeTeamId: acm,
      awayTeamId: juv,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-15`,
      time: '20:00',
      stadiumName: 'Al-Awwal Park',
      cupPhase: 'Semifinal 2',
      groupName: 'Supercoppa Italiana · Semifinal 2',
    },
    {
      id: 'ita_super_final',
      round: 2,
      competition: 'ita_supercoppa',
      homeTeamId: 'TBD_IT_SUPER_SF0',
      awayTeamId: 'TBD_IT_SUPER_SF1',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-18`,
      time: '20:00',
      stadiumName: 'Al-Awwal Park',
      cupPhase: 'Grande Final',
      groupName: 'Supercoppa Italiana · Decisão',
    },
  ];
}

// ==========================================
// 5. PORTUGAL: Taça de Portugal & Supertaça
// ==========================================

export function generateTacaDePortugalFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const por = getClubsForEuropeanLeague(clubs, 'por_primeira');
  const shuffled = pseudoShuffle(por, seasonYear * 47);
  const fixtures: Fixture[] = [];

  const prelim = shuffled.slice(14, 18);
  const directR16 = shuffled.slice(0, 14);

  for (let i = 0; i < 2; i++) {
    const home = prelim[i * 2];
    const away = prelim[i * 2 + 1];
    fixtures.push({
      id: `por_tp_r1_m${i}`,
      round: 1,
      competition: 'por_taca_portugal',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-10-28`,
      time: '20:15',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Eliminatória',
      groupName: 'Taça de Portugal · 1ª Fase',
    });
  }

  for (let i = 0; i < 8; i++) {
    const pairIdx = 2 + (i - 2) * 2;
    const home = i < 2 ? directR16[i] : directR16[pairIdx];
    const awayId = i < 2 ? 'TBD_TP_R1' : directR16[pairIdx + 1]?.id || 'tbd';
    fixtures.push({
      id: `por_tp_r16_m${i}`,
      round: 2,
      competition: 'por_taca_portugal',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '20:45',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Taça de Portugal · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `por_tp_qf_m${i}`,
      round: 3,
      competition: 'por_taca_portugal',
      homeTeamId: 'TBD_TP_R16',
      awayTeamId: 'TBD_TP_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-03`,
      time: '20:45',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Taça de Portugal · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push(
      {
        id: `por_tp_sf_m${i}_ida`,
        round: 4,
        competition: 'por_taca_portugal',
        homeTeamId: 'TBD_TP_QF',
        awayTeamId: 'TBD_TP_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-03-03`,
        time: '20:45',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Ida)',
        groupName: 'Taça de Portugal · Semifinal Ida',
        leg: 1,
      },
      {
        id: `por_tp_sf_m${i}_volta`,
        round: 5,
        competition: 'por_taca_portugal',
        homeTeamId: 'TBD_TP_QF',
        awayTeamId: 'TBD_TP_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-04-21`,
        time: '20:45',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Volta)',
        groupName: 'Taça de Portugal · Semifinal Volta',
        leg: 2,
      }
    );
  }

  fixtures.push({
    id: 'por_tp_final',
    round: 6,
    competition: 'por_taca_portugal',
    homeTeamId: 'TBD_TP_SF0',
    awayTeamId: 'TBD_TP_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-23`,
    time: '17:15',
    stadiumName: 'Estádio Nacional do Jamor (Oeiras)',
    cupPhase: 'Grande Final',
    groupName: 'Taça de Portugal · Festa da Taça no Jamor',
  });

  return fixtures;
}

export function generatePortugueseSupercupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const por = getClubsForEuropeanLeague(clubs, 'por_primeira');
  const scp = por.find((c) => c.id === 'eu_scp')?.id || 'eu_scp';
  const fcp = por.find((c) => c.id === 'eu_fcp')?.id || 'eu_fcp';

  return [
    {
      id: 'por_super_final',
      round: 1,
      competition: 'por_supertaca',
      homeTeamId: scp,
      awayTeamId: fcp,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-08-15`,
      time: '20:45',
      stadiumName: 'Estádio Municipal de Aveiro',
      cupPhase: 'Supertaça Cândido de Oliveira',
      groupName: 'Supertaça de Portugal',
    },
  ];
}

// ==========================================
// 6. HOLANDA: KNVB Beker & Johan Cruyff Schaal
// ==========================================

export function generateKnvbBekerFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const ned = getClubsForEuropeanLeague(clubs, 'ned_eredivisie');
  const shuffled = pseudoShuffle(ned, seasonYear * 53);
  const fixtures: Fixture[] = [];

  const prelim = shuffled.slice(14, 18);
  const directR16 = shuffled.slice(0, 14);

  for (let i = 0; i < 2; i++) {
    const home = prelim[i * 2];
    const away = prelim[i * 2 + 1];
    fixtures.push({
      id: `ned_kb_r1_m${i}`,
      round: 1,
      competition: 'ned_knvb_beker',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-10-28`,
      time: '20:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Rodada',
      groupName: 'KNVB Beker · 1ª Fase Eliminatória',
    });
  }

  for (let i = 0; i < 8; i++) {
    const pairIdx = 2 + (i - 2) * 2;
    const home = i < 2 ? directR16[i] : directR16[pairIdx];
    const awayId = i < 2 ? 'TBD_KB_R1' : directR16[pairIdx + 1]?.id || 'tbd';
    fixtures.push({
      id: `ned_kb_r16_m${i}`,
      round: 2,
      competition: 'ned_knvb_beker',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '20:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'KNVB Beker · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `ned_kb_qf_m${i}`,
      round: 3,
      competition: 'ned_knvb_beker',
      homeTeamId: 'TBD_KB_R16',
      awayTeamId: 'TBD_KB_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'KNVB Beker · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `ned_kb_sf_m${i}`,
      round: 4,
      competition: 'ned_knvb_beker',
      homeTeamId: 'TBD_KB_QF',
      awayTeamId: 'TBD_KB_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-04-07`,
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'KNVB Beker · Semifinal',
    });
  }

  fixtures.push({
    id: 'ned_kb_final',
    round: 5,
    competition: 'ned_knvb_beker',
    homeTeamId: 'TBD_KB_SF0',
    awayTeamId: 'TBD_KB_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-16`,
    time: '18:00',
    stadiumName: "Stadion Feijenoord 'De Kuip' (Rotterdam)",
    cupPhase: 'Grande Final',
    groupName: 'KNVB Beker · Final no De Kuip',
  });

  return fixtures;
}

export function generateDutchSupercupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const ned = getClubsForEuropeanLeague(clubs, 'ned_eredivisie');
  const psv = ned.find((c) => c.id === 'eu_psv')?.id || 'eu_psv';
  const fey = ned.find((c) => c.id === 'eu_fey')?.id || 'eu_fey';

  return [
    {
      id: 'ned_super_final',
      round: 1,
      competition: 'ned_johan_cruyff',
      homeTeamId: psv,
      awayTeamId: fey,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-08-08`,
      time: '20:00',
      stadiumName: 'Johan Cruyff Arena (Amsterdam)',
      cupPhase: 'Johan Cruyff Schaal',
      groupName: 'Supercopa da Holanda · Johan Cruyff Schaal',
    },
  ];
}

// ==========================================
// 7. BÉLGICA: Croky Cup & Supercopa da Bélgica
// ==========================================

export function generateCrokyCupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const bel = getClubsForEuropeanLeague(clubs, 'bel_pro_league');
  const shuffled = pseudoShuffle(bel, seasonYear * 59);
  const fixtures: Fixture[] = [];

  const prelim = shuffled.slice(14, 18);
  const directR16 = shuffled.slice(0, 14);

  for (let i = 0; i < 2; i++) {
    const home = prelim[i * 2];
    const away = prelim[i * 2 + 1];
    fixtures.push({
      id: `bel_cc_r1_m${i}`,
      round: 1,
      competition: 'bel_croky_cup',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-10-28`,
      time: '20:30',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Fase',
      groupName: 'Croky Cup · 1ª Fase Eliminatória',
    });
  }

  for (let i = 0; i < 8; i++) {
    const pairIdx = 2 + (i - 2) * 2;
    const home = i < 2 ? directR16[i] : directR16[pairIdx];
    const awayId = i < 2 ? 'TBD_CC_R1' : directR16[pairIdx + 1]?.id || 'tbd';
    fixtures.push({
      id: `bel_cc_r16_m${i}`,
      round: 2,
      competition: 'bel_croky_cup',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '20:30',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Croky Cup · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `bel_cc_qf_m${i}`,
      round: 3,
      competition: 'bel_croky_cup',
      homeTeamId: 'TBD_CC_R16',
      awayTeamId: 'TBD_CC_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-03`,
      time: '20:30',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Croky Cup · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push(
      {
        id: `bel_cc_sf_m${i}_ida`,
        round: 4,
        competition: 'bel_croky_cup',
        homeTeamId: 'TBD_CC_QF',
        awayTeamId: 'TBD_CC_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-03-03`,
        time: '20:30',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Ida)',
        groupName: 'Croky Cup · Semifinal Ida',
        leg: 1,
      },
      {
        id: `bel_cc_sf_m${i}_volta`,
        round: 5,
        competition: 'bel_croky_cup',
        homeTeamId: 'TBD_CC_QF',
        awayTeamId: 'TBD_CC_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-04-21`,
        time: '20:30',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Volta)',
        groupName: 'Croky Cup · Semifinal Volta',
        leg: 2,
      }
    );
  }

  fixtures.push({
    id: 'bel_cc_final',
    round: 6,
    competition: 'bel_croky_cup',
    homeTeamId: 'TBD_CC_SF0',
    awayTeamId: 'TBD_CC_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-15`,
    time: '20:30',
    stadiumName: 'King Baudouin Stadium (Bruxelas)',
    cupPhase: 'Grande Final',
    groupName: 'Croky Cup · Final no King Baudouin Stadium',
  });

  return fixtures;
}

export function generateBelgianSupercupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const bel = getClubsForEuropeanLeague(clubs, 'bel_pro_league');
  const clu = bel.find((c) => c.id === 'eu_clu')?.id || 'eu_clu';
  const usg = bel.find((c) => c.id === 'eu_usg')?.id || 'eu_usg';

  return [
    {
      id: 'bel_super_final',
      round: 1,
      competition: 'bel_supercup',
      homeTeamId: clu,
      awayTeamId: usg,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-07-26`,
      time: '20:00',
      stadiumName: 'Jan Breydel Stadium (Brugge)',
      cupPhase: 'Supercopa da Bélgica',
      groupName: 'Supercopa da Bélgica',
    },
  ];
}

// ==========================================
// 8. TURQUIA: Türkiye Kupası & Süper Kupa
// ==========================================

export function generateTurkiyeKupasiFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const tur = getClubsForEuropeanLeague(clubs, 'tur_super_lig');
  const shuffled = pseudoShuffle(tur, seasonYear * 61);
  const fixtures: Fixture[] = [];

  const directR16 = shuffled.slice(0, 16);

  for (let i = 0; i < 8; i++) {
    const home = directR16[i * 2];
    const away = directR16[i * 2 + 1];
    fixtures.push({
      id: `tur_tk_r16_m${i}`,
      round: 1,
      competition: 'tur_turkiye_kupasi',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '20:30',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Türkiye Kupası · Oitavas de Final em Jogo Único',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `tur_tk_qf_m${i}`,
      round: 2,
      competition: 'tur_turkiye_kupasi',
      homeTeamId: 'TBD_TK_R16',
      awayTeamId: 'TBD_TK_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '20:30',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Türkiye Kupası · Quartas de Final em Jogo Único',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push(
      {
        id: `tur_tk_sf_m${i}_ida`,
        round: 3,
        competition: 'tur_turkiye_kupasi',
        homeTeamId: 'TBD_TK_QF',
        awayTeamId: 'TBD_TK_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-03-03`,
        time: '20:30',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Ida)',
        groupName: 'Türkiye Kupası · Semifinal Ida',
        leg: 1,
      },
      {
        id: `tur_tk_sf_m${i}_volta`,
        round: 4,
        competition: 'tur_turkiye_kupasi',
        homeTeamId: 'TBD_TK_QF',
        awayTeamId: 'TBD_TK_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-04-21`,
        time: '20:30',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Volta)',
        groupName: 'Türkiye Kupası · Semifinal Volta',
        leg: 2,
      }
    );
  }

  fixtures.push({
    id: 'tur_tk_final',
    round: 5,
    competition: 'tur_turkiye_kupasi',
    homeTeamId: 'TBD_TK_SF0',
    awayTeamId: 'TBD_TK_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-20`,
    time: '20:45',
    stadiumName: 'Atatürk Olympic Stadium (Istambul)',
    cupPhase: 'Grande Final',
    groupName: 'Türkiye Kupası · Decisão no Atatürk Stadium',
  });

  return fixtures;
}

export function generateTurkishSupercupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const tur = getClubsForEuropeanLeague(clubs, 'tur_super_lig');
  const gal = tur.find((c) => c.id === 'eu_gal')?.id || 'eu_gal';
  const bjk = tur.find((c) => c.id === 'eu_bjk')?.id || 'eu_bjk';

  return [
    {
      id: 'tur_super_final',
      round: 1,
      competition: 'tur_super_kupa',
      homeTeamId: gal,
      awayTeamId: bjk,
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-08-18`,
      time: '20:45',
      stadiumName: 'Atatürk Olympic Stadium (Istambul)',
      cupPhase: 'TFF Süper Kupa',
      groupName: 'Supercopa da Turquia · Süper Kupa',
    },
  ];
}

// ==========================================
// 9. GRÉCIA: Kypello Elladas
// ==========================================

export function generateKypelloElladasFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const gre = getClubsForEuropeanLeague(clubs, 'gre_super_league');
  const shuffled = pseudoShuffle(gre, seasonYear * 67);
  const fixtures: Fixture[] = [];

  // 14 clubes: 12 jogam a 1ª Fase (6 confrontos) -> 6 avançam; 2 cabeças entram direto nas Quartas (8 clubes).
  const directQf = shuffled.slice(0, 2);
  const r1Clubs = shuffled.slice(2, 14);

  for (let i = 0; i < 6; i++) {
    const home = r1Clubs[i * 2];
    const away = r1Clubs[i * 2 + 1];
    fixtures.push({
      id: `gre_ke_r1_m${i}`,
      round: 1,
      competition: 'gre_kypello_elladas',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-12-02`,
      time: '19:30',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Fase',
      groupName: 'Kypello Elladas · 1ª Fase em Jogo Único',
    });
  }

  // Quartas de Final: 4 confrontos
  for (let i = 0; i < 4; i++) {
    const homeId = i < 2 ? directQf[i]?.id || 'tbd' : 'TBD_KE_R1';
    fixtures.push({
      id: `gre_ke_qf_m${i}`,
      round: 2,
      competition: 'gre_kypello_elladas',
      homeTeamId: homeId,
      awayTeamId: 'TBD_KE_R1',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '19:30',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Kypello Elladas · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push(
      {
        id: `gre_ke_sf_m${i}_ida`,
        round: 3,
        competition: 'gre_kypello_elladas',
        homeTeamId: 'TBD_KE_QF',
        awayTeamId: 'TBD_KE_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-03-03`,
        time: '20:00',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Ida)',
        groupName: 'Kypello Elladas · Semifinal Ida',
        leg: 1,
      },
      {
        id: `gre_ke_sf_m${i}_volta`,
        round: 4,
        competition: 'gre_kypello_elladas',
        homeTeamId: 'TBD_KE_QF',
        awayTeamId: 'TBD_KE_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-04-21`,
        time: '20:00',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Volta)',
        groupName: 'Kypello Elladas · Semifinal Volta',
        leg: 2,
      }
    );
  }

  fixtures.push({
    id: 'gre_ke_final',
    round: 5,
    competition: 'gre_kypello_elladas',
    homeTeamId: 'TBD_KE_SF0',
    awayTeamId: 'TBD_KE_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-22`,
    time: '20:30',
    stadiumName: 'OAKA Olympic Stadium (Atenas)',
    cupPhase: 'Grande Final',
    groupName: 'Kypello Elladas · Final no Estádio Olímpico de Atenas',
  });

  return fixtures;
}

// ==========================================
// 10. NORUEGA: NM Cupen (Copa da Noruega)
// ==========================================

export function generateNmCupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const nor = getClubsForEuropeanLeague(clubs, 'nor_eliteserien');
  const shuffled = pseudoShuffle(nor, seasonYear * 71);
  const fixtures: Fixture[] = [];

  for (let i = 0; i < 8; i++) {
    const home = shuffled[i * 2];
    const away = shuffled[i * 2 + 1];
    fixtures.push({
      id: `nor_nm_r16_m${i}`,
      round: 1,
      competition: 'nor_nm_cup',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '19:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'NM Cupen · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `nor_nm_qf_m${i}`,
      round: 2,
      competition: 'nor_nm_cup',
      homeTeamId: 'TBD_NM_R16',
      awayTeamId: 'TBD_NM_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '19:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'NM Cupen · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `nor_nm_sf_m${i}`,
      round: 3,
      competition: 'nor_nm_cup',
      homeTeamId: 'TBD_NM_QF',
      awayTeamId: 'TBD_NM_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-04-07`,
      time: '19:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'NM Cupen · Semifinal',
    });
  }

  fixtures.push({
    id: 'nor_nm_final',
    round: 4,
    competition: 'nor_nm_cup',
    homeTeamId: 'TBD_NM_SF0',
    awayTeamId: 'TBD_NM_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-15`,
    time: '16:00',
    stadiumName: 'Ullevaal Stadion (Oslo)',
    cupPhase: 'Grande Final',
    groupName: 'NM Cupen · Final no Ullevaal Stadion',
  });

  return fixtures;
}

// ==========================================
// 11. DINAMARCA: DBU Pokalen
// ==========================================

export function generateDbuPokalenFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const den = getClubsForEuropeanLeague(clubs, 'den_superliga');
  const shuffled = pseudoShuffle(den, seasonYear * 73);
  const fixtures: Fixture[] = [];

  const directQf = shuffled.slice(0, 4);
  const r1Clubs = shuffled.slice(4, 12);

  for (let i = 0; i < 4; i++) {
    const home = r1Clubs[i * 2];
    const away = r1Clubs[i * 2 + 1];
    fixtures.push({
      id: `den_dp_r1_m${i}`,
      round: 1,
      competition: 'den_dbu_pokalen',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-12-02`,
      time: '19:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Fase',
      groupName: 'DBU Pokalen · 1ª Fase',
    });
  }

  for (let i = 0; i < 4; i++) {
    const home = directQf[i];
    fixtures.push({
      id: `den_dp_qf_m${i}`,
      round: 2,
      competition: 'den_dbu_pokalen',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: 'TBD_DP_R1',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '19:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Quartas de Final',
      groupName: 'DBU Pokalen · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push(
      {
        id: `den_dp_sf_m${i}_ida`,
        round: 3,
        competition: 'den_dbu_pokalen',
        homeTeamId: 'TBD_DP_QF',
        awayTeamId: 'TBD_DP_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-03-03`,
        time: '19:00',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Ida)',
        groupName: 'DBU Pokalen · Semifinal Ida',
        leg: 1,
      },
      {
        id: `den_dp_sf_m${i}_volta`,
        round: 4,
        competition: 'den_dbu_pokalen',
        homeTeamId: 'TBD_DP_QF',
        awayTeamId: 'TBD_DP_QF',
        homeScore: null,
        awayScore: null,
        played: false,
        date: `${nextYear}-04-21`,
        time: '19:00',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Semifinal (Volta)',
        groupName: 'DBU Pokalen · Semifinal Volta',
        leg: 2,
      }
    );
  }

  fixtures.push({
    id: 'den_dp_final',
    round: 5,
    competition: 'den_dbu_pokalen',
    homeTeamId: 'TBD_DP_SF0',
    awayTeamId: 'TBD_DP_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-13`,
    time: '17:00',
    stadiumName: 'Parken Stadium (Copenhague)',
    cupPhase: 'Grande Final',
    groupName: 'DBU Pokalen · Final no Parken',
  });

  return fixtures;
}

// ==========================================
// 12. SUÍÇA: Schweizer Cup
// ==========================================

export function generateSchweizerCupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const sui = getClubsForEuropeanLeague(clubs, 'sui_super_league');
  const shuffled = pseudoShuffle(sui, seasonYear * 79);
  const fixtures: Fixture[] = [];

  const directQf = shuffled.slice(0, 4);
  const r1Clubs = shuffled.slice(4, 12);

  for (let i = 0; i < 4; i++) {
    const home = r1Clubs[i * 2];
    const away = r1Clubs[i * 2 + 1];
    fixtures.push({
      id: `sui_sc_r1_m${i}`,
      round: 1,
      competition: 'sui_schweizer_cup',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-12-02`,
      time: '20:15',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Fase',
      groupName: 'Schweizer Cup · 1ª Fase',
    });
  }

  for (let i = 0; i < 4; i++) {
    const home = directQf[i];
    fixtures.push({
      id: `sui_sc_qf_m${i}`,
      round: 2,
      competition: 'sui_schweizer_cup',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: 'TBD_SC_R1',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '20:15',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Quartas de Final',
      groupName: 'Schweizer Cup · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sui_sc_sf_m${i}`,
      round: 3,
      competition: 'sui_schweizer_cup',
      homeTeamId: 'TBD_SC_QF',
      awayTeamId: 'TBD_SC_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-04-07`,
      time: '20:15',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'Schweizer Cup · Semifinal',
    });
  }

  fixtures.push({
    id: 'sui_sc_final',
    round: 4,
    competition: 'sui_schweizer_cup',
    homeTeamId: 'TBD_SC_SF0',
    awayTeamId: 'TBD_SC_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-16`,
    time: '16:30',
    stadiumName: 'Stadion Wankdorf (Berna)',
    cupPhase: 'Grande Final',
    groupName: 'Schweizer Cup · Final no Wankdorf',
  });

  return fixtures;
}

// ==========================================
// 13. SUÉCIA: Svenska Cupen
// ==========================================

export function generateSvenskaCupenFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const swe = getClubsForEuropeanLeague(clubs, 'swe_allsvenskan');
  const shuffled = pseudoShuffle(swe, seasonYear * 83);
  const fixtures: Fixture[] = [];

  for (let i = 0; i < 8; i++) {
    const home = shuffled[i * 2];
    const away = shuffled[i * 2 + 1];
    fixtures.push({
      id: `swe_svc_r16_m${i}`,
      round: 1,
      competition: 'swe_svenska_cupen',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '19:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Svenska Cupen · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `swe_svc_qf_m${i}`,
      round: 2,
      competition: 'swe_svenska_cupen',
      homeTeamId: 'TBD_SVC_R16',
      awayTeamId: 'TBD_SVC_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '19:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Svenska Cupen · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `swe_svc_sf_m${i}`,
      round: 3,
      competition: 'swe_svenska_cupen',
      homeTeamId: 'TBD_SVC_QF',
      awayTeamId: 'TBD_SVC_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-04-07`,
      time: '19:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'Svenska Cupen · Semifinal',
    });
  }

  fixtures.push({
    id: 'swe_svc_final',
    round: 4,
    competition: 'swe_svenska_cupen',
    homeTeamId: 'TBD_SVC_SF0',
    awayTeamId: 'TBD_SVC_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-20`,
    time: '18:00',
    stadiumName: 'Friends Arena (Estocolmo)',
    cupPhase: 'Grande Final',
    groupName: 'Svenska Cupen · Final na Friends Arena',
  });

  return fixtures;
}

// ==========================================
// 14. ESCÓCIA: Scottish Cup
// ==========================================

export function generateScottishCupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const sco = getClubsForEuropeanLeague(clubs, 'sco_premiership');
  const shuffled = pseudoShuffle(sco, seasonYear * 89);
  const fixtures: Fixture[] = [];

  const directQf = shuffled.slice(0, 4);
  const r1Clubs = shuffled.slice(4, 12);

  for (let i = 0; i < 4; i++) {
    const home = r1Clubs[i * 2];
    const away = r1Clubs[i * 2 + 1];
    fixtures.push({
      id: `sco_sc_r1_m${i}`,
      round: 1,
      competition: 'sco_scottish_cup',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${seasonYear}-12-02`,
      time: '19:45',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Fase',
      groupName: 'Scottish Cup · 1ª Fase',
    });
  }

  for (let i = 0; i < 4; i++) {
    const home = directQf[i];
    fixtures.push({
      id: `sco_sc_qf_m${i}`,
      round: 2,
      competition: 'sco_scottish_cup',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: 'TBD_SCO_R1',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '19:45',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Quartas de Final',
      groupName: 'Scottish Cup · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sco_sc_sf_m${i}`,
      round: 3,
      competition: 'sco_scottish_cup',
      homeTeamId: 'TBD_SCO_QF',
      awayTeamId: 'TBD_SCO_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-04-14`,
      time: '15:00',
      stadiumName: 'Hampden Park (Glasgow)',
      cupPhase: 'Semifinal',
      groupName: 'Scottish Cup · Semifinal em Hampden Park',
    });
  }

  fixtures.push({
    id: 'sco_sc_final',
    round: 4,
    competition: 'sco_scottish_cup',
    homeTeamId: 'TBD_SCO_SF0',
    awayTeamId: 'TBD_SCO_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-22`,
    time: '15:00',
    stadiumName: 'Hampden Park (Glasgow)',
    cupPhase: 'Grande Final',
    groupName: 'Scottish Cup · Grande Decisão em Hampden Park',
  });

  return fixtures;
}

// ==========================================
// 15. LIGAS ESPECIAIS: Taça Especial 1 & 2
// ==========================================

export function generateSpecial1CupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const sp1 = getClubsForEuropeanLeague(clubs, 'eu_special_1');
  const shuffled = pseudoShuffle(sp1, seasonYear * 97);
  const fixtures: Fixture[] = [];

  for (let i = 0; i < 8; i++) {
    const home = shuffled[i * 2];
    const away = shuffled[i * 2 + 1];
    fixtures.push({
      id: `sp1_cup_r16_m${i}`,
      round: 1,
      competition: 'eu_sp1_cup',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '20:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Taça Especial Europa 1 · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `sp1_cup_qf_m${i}`,
      round: 2,
      competition: 'eu_sp1_cup',
      homeTeamId: 'TBD_SP1_R16',
      awayTeamId: 'TBD_SP1_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Taça Especial Europa 1 · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sp1_cup_sf_m${i}`,
      round: 3,
      competition: 'eu_sp1_cup',
      homeTeamId: 'TBD_SP1_QF',
      awayTeamId: 'TBD_SP1_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-04-07`,
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'Taça Especial Europa 1 · Semifinal',
    });
  }

  fixtures.push({
    id: 'sp1_cup_final',
    round: 4,
    competition: 'eu_sp1_cup',
    homeTeamId: 'TBD_SP1_SF0',
    awayTeamId: 'TBD_SP1_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-19`,
    time: '20:45',
    stadiumName: 'Estádio Central de Viena (Ernst Happel)',
    cupPhase: 'Grande Final',
    groupName: 'Taça Especial Europa 1 · Grande Decisão',
  });

  return fixtures;
}

export function generateSpecial2CupFixtures(clubs: Club[], seasonYear: number = 2026): Fixture[] {
  const nextYear = seasonYear + 1;
  const sp2 = getClubsForEuropeanLeague(clubs, 'eu_special_2');
  const shuffled = pseudoShuffle(sp2, seasonYear * 101);
  const fixtures: Fixture[] = [];

  for (let i = 0; i < 8; i++) {
    const home = shuffled[i * 2];
    const away = shuffled[i * 2 + 1];
    fixtures.push({
      id: `sp2_cup_r16_m${i}`,
      round: 1,
      competition: 'eu_sp2_cup',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-01-13`,
      time: '20:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Oitavas de Final',
      groupName: 'Taça Especial Europa 2 · Oitavas de Final',
    });
  }

  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `sp2_cup_qf_m${i}`,
      round: 2,
      competition: 'eu_sp2_cup',
      homeTeamId: 'TBD_SP2_R16',
      awayTeamId: 'TBD_SP2_R16',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-02-10`,
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Taça Especial Europa 2 · Quartas de Final',
    });
  }

  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `sp2_cup_sf_m${i}`,
      round: 3,
      competition: 'eu_sp2_cup',
      homeTeamId: 'TBD_SP2_QF',
      awayTeamId: 'TBD_SP2_QF',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-04-07`,
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Semifinal',
      groupName: 'Taça Especial Europa 2 · Semifinal',
    });
  }

  fixtures.push({
    id: 'sp2_cup_final',
    round: 4,
    competition: 'eu_sp2_cup',
    homeTeamId: 'TBD_SP2_SF0',
    awayTeamId: 'TBD_SP2_SF1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-19`,
    time: '20:45',
    stadiumName: 'Stadion Rajko Mitić (Belgrado)',
    cupPhase: 'Grande Final',
    groupName: 'Taça Especial Europa 2 · Grande Decisão',
  });

  return fixtures;
}

// ==========================================
// GERADOR UNIFICADO DE TODAS AS COPAS EUROPEIAS
// ==========================================

const CUP_TO_EUROPEAN_LEAGUE: Record<EuropeanCupId, EuropeanLeagueId> = {
  esp_copa_del_rey: 'esp_laliga',
  esp_supercopa: 'esp_laliga',
  ger_dfb_pokal: 'ger_bundesliga',
  ger_supercup: 'ger_bundesliga',
  fra_coupe_de_france: 'fra_ligue1',
  fra_trophee_champions: 'fra_ligue1',
  ita_coppa_italia: 'ita_serie_a',
  ita_supercoppa: 'ita_serie_a',
  por_taca_portugal: 'por_primeira',
  por_supertaca: 'por_primeira',
  ned_knvb_beker: 'ned_eredivisie',
  ned_johan_cruyff: 'ned_eredivisie',
  bel_croky_cup: 'bel_pro_league',
  bel_supercup: 'bel_pro_league',
  tur_turkiye_kupasi: 'tur_super_lig',
  tur_super_kupa: 'tur_super_lig',
  gre_kypello_elladas: 'gre_super_league',
  nor_nm_cup: 'nor_eliteserien',
  den_dbu_pokalen: 'den_superliga',
  sui_schweizer_cup: 'sui_super_league',
  swe_svenska_cupen: 'swe_allsvenskan',
  sco_scottish_cup: 'sco_premiership',
  eu_sp1_cup: 'eu_special_1',
  eu_sp2_cup: 'eu_special_2',
};

function getLeagueBlockedDates(
  leagueId: EuropeanLeagueId,
  clubs: Club[],
  seasonYear: number,
  fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>
): Set<string> {
  const blocked = getSeasonFifaBlockedDatesSet(seasonYear, 'europe');
  for (const d of getUefaBlockedDatesSet(seasonYear)) blocked.add(d);

  const existing = fixturesEurope?.[leagueId];
  if (existing && existing.length > 0) {
    for (const f of existing) {
      if (f.date) blocked.add(f.date);
    }
  } else {
    const clubCount = getClubsForEuropeanLeague(clubs, leagueId).length || 18;
    const totalRounds = Math.max(22, (clubCount - 1) * 2);
    for (const slot of getEuropeanLeagueScheduleDates(leagueId, totalRounds, seasonYear)) {
      blocked.add(slot.date);
    }
  }
  return blocked;
}

export function resolveEuropeanCupsMapConflicts(
  rawMap: Record<EuropeanCupId, Fixture[]>,
  clubs: Club[],
  seasonYear: number = 2026,
  fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>
): Record<EuropeanCupId, Fixture[]> {
  const nextYear = seasonYear + 1;
  const minDate = `${seasonYear}-07-20`;
  const maxDate = `${nextYear}-06-06`;

  // Group cups by their domestic league so Supercup dates block Main Cup dates in the same country
  const cupsByLeague = new Map<EuropeanLeagueId, EuropeanCupId[]>();
  const order: EuropeanCupId[] = [
    // Supercups first, then main domestic cups
    'esp_supercopa', 'esp_copa_del_rey',
    'ger_supercup', 'ger_dfb_pokal',
    'fra_trophee_champions', 'fra_coupe_de_france',
    'ita_supercoppa', 'ita_coppa_italia',
    'por_supertaca', 'por_taca_portugal',
    'ned_johan_cruyff', 'ned_knvb_beker',
    'bel_supercup', 'bel_croky_cup',
    'tur_super_kupa', 'tur_turkiye_kupasi',
    'gre_kypello_elladas',
    'nor_nm_cup',
    'den_dbu_pokalen',
    'sui_schweizer_cup',
    'swe_svenska_cupen',
    'sco_scottish_cup',
    'eu_sp1_cup',
    'eu_sp2_cup',
  ];

  for (const cupId of order) {
    const lid = CUP_TO_EUROPEAN_LEAGUE[cupId];
    if (!cupsByLeague.has(lid)) cupsByLeague.set(lid, []);
    cupsByLeague.get(lid)!.push(cupId);
  }

  const resolved: Record<EuropeanCupId, Fixture[]> = { ...rawMap };
  for (const [lid, cupIds] of cupsByLeague.entries()) {
    const blocked = getLeagueBlockedDates(lid, clubs, seasonYear, fixturesEurope);
    for (const cupId of cupIds) {
      const resolvedCup = resolveCupScheduleConflicts(
        resolved[cupId] || [],
        blocked,
        minDate,
        maxDate
      );
      resolved[cupId] = resolvedCup;
      for (const f of resolvedCup) {
        if (f.date) blocked.add(f.date);
      }
    }
  }
  return resolved;
}

export function generateAllEuropeanCupsFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  options?: {
    fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
  }
): Record<EuropeanCupId, Fixture[]> {
  const rawMap: Record<EuropeanCupId, Fixture[]> = {
    esp_copa_del_rey: generateCopaDelReyFixtures(clubs, seasonYear),
    esp_supercopa: generateSpanishSupercupFixtures(clubs, seasonYear),
    ger_dfb_pokal: generateDfbPokalFixtures(clubs, seasonYear),
    ger_supercup: generateGermanSupercupFixtures(clubs, seasonYear),
    fra_coupe_de_france: generateCoupeDeFranceFixtures(clubs, seasonYear),
    fra_trophee_champions: generateFrenchSupercupFixtures(clubs, seasonYear),
    ita_coppa_italia: generateCoppaItaliaFixtures(clubs, seasonYear),
    ita_supercoppa: generateItalianSupercupFixtures(clubs, seasonYear),
    por_taca_portugal: generateTacaDePortugalFixtures(clubs, seasonYear),
    por_supertaca: generatePortugueseSupercupFixtures(clubs, seasonYear),
    ned_knvb_beker: generateKnvbBekerFixtures(clubs, seasonYear),
    ned_johan_cruyff: generateDutchSupercupFixtures(clubs, seasonYear),
    bel_croky_cup: generateCrokyCupFixtures(clubs, seasonYear),
    bel_supercup: generateBelgianSupercupFixtures(clubs, seasonYear),
    tur_turkiye_kupasi: generateTurkiyeKupasiFixtures(clubs, seasonYear),
    tur_super_kupa: generateTurkishSupercupFixtures(clubs, seasonYear),
    gre_kypello_elladas: generateKypelloElladasFixtures(clubs, seasonYear),
    nor_nm_cup: generateNmCupFixtures(clubs, seasonYear),
    den_dbu_pokalen: generateDbuPokalenFixtures(clubs, seasonYear),
    sui_schweizer_cup: generateSchweizerCupFixtures(clubs, seasonYear),
    swe_svenska_cupen: generateSvenskaCupenFixtures(clubs, seasonYear),
    sco_scottish_cup: generateScottishCupFixtures(clubs, seasonYear),
    eu_sp1_cup: generateSpecial1CupFixtures(clubs, seasonYear),
    eu_sp2_cup: generateSpecial2CupFixtures(clubs, seasonYear),
  };

  return resolveEuropeanCupsMapConflicts(rawMap, clubs, seasonYear, options?.fixturesEurope);
}

// ==========================================
// SINCRONIZADOR DINÂMICO DE CHAVES DE MATA-MATA
// ==========================================

export function syncEuropeanCupsKnockoutBrackets(params: {
  fixturesEuropeanCups?: Partial<Record<EuropeanCupId, Fixture[]>>;
  clubs?: Club[];
}): Partial<Record<EuropeanCupId, Fixture[]>> {
  const result: Partial<Record<EuropeanCupId, Fixture[]>> = {
    ...(params.fixturesEuropeanCups || {}),
  };
  const clubsMap = new Map((params.clubs || []).map((c) => [c.id, c]));
  const getFix = (list: Fixture[], id: string) => list.find((f) => f.id === id);

  // Helper para atualizar estádio da casa quando o mandante for definido
  const updateStadiumIfKnown = (fixtures: Fixture[], fixId: string, homeId?: string | null) => {
    if (!homeId || !clubsMap.has(homeId)) return fixtures;
    const stadium = getClubStadiumName(clubsMap.get(homeId));
    return fixtures.map((f) =>
      f.id === fixId && (f.stadiumName || '').includes('definir')
        ? { ...f, stadiumName: stadium }
        : f
    );
  };

  // 1. ESPANHA - Supercopa
  if (result.esp_supercopa) {
    let superFix = [...result.esp_supercopa];
    const sf0W = resolveTieWinner(undefined, getFix(superFix, 'esp_super_sf0'));
    const sf1W = resolveTieWinner(undefined, getFix(superFix, 'esp_super_sf1'));
    if (sf0W || sf1W) {
      superFix = assignSingleLegSlots(superFix, 'esp_super_final', sf0W, sf1W);
    }
    result.esp_supercopa = superFix;
  }

  // 2. ESPANHA - Copa del Rey
  if (result.esp_copa_del_rey) {
    let cdr = [...result.esp_copa_del_rey];
    // R1 -> R16 (4 vagas visitantes de esp_cdr_r16_m0..m3)
    for (let i = 0; i < 4; i++) {
      const w = resolveTieWinner(undefined, getFix(cdr, `esp_cdr_r1_m${i}`));
      if (w) cdr = assignSingleLegSlots(cdr, `esp_cdr_r16_m${i}`, undefined, w);
    }
    // R16 -> QF (4 jogos)
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(cdr, `esp_cdr_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(cdr, `esp_cdr_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        cdr = assignSingleLegSlots(cdr, `esp_cdr_qf_m${i}`, w0, w1);
        cdr = updateStadiumIfKnown(cdr, `esp_cdr_qf_m${i}`, w0);
      }
    }
    // QF -> SF (ida e volta)
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(cdr, `esp_cdr_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(cdr, `esp_cdr_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        cdr = assignTwoLeggedSlots(cdr, `esp_cdr_sf_m${i}_ida`, `esp_cdr_sf_m${i}_volta`, w0, w1);
        cdr = updateStadiumIfKnown(cdr, `esp_cdr_sf_m${i}_ida`, w0);
        cdr = updateStadiumIfKnown(cdr, `esp_cdr_sf_m${i}_volta`, w1);
      }
    }
    // SF -> Final
    const sf0W = resolveTieWinner(getFix(cdr, 'esp_cdr_sf_m0_ida'), getFix(cdr, 'esp_cdr_sf_m0_volta'));
    const sf1W = resolveTieWinner(getFix(cdr, 'esp_cdr_sf_m1_ida'), getFix(cdr, 'esp_cdr_sf_m1_volta'));
    if (sf0W || sf1W) {
      cdr = assignSingleLegSlots(cdr, 'esp_cdr_final', sf0W, sf1W);
    }
    result.esp_copa_del_rey = cdr;
  }

  // 3. ALEMANHA - DFB-Pokal
  if (result.ger_dfb_pokal) {
    let dfb = [...result.ger_dfb_pokal];
    for (let i = 0; i < 2; i++) {
      const w = resolveTieWinner(undefined, getFix(dfb, `ger_dfb_r1_m${i}`));
      if (w) dfb = assignSingleLegSlots(dfb, `ger_dfb_r16_m${i}`, undefined, w);
    }
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(dfb, `ger_dfb_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(dfb, `ger_dfb_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        dfb = assignSingleLegSlots(dfb, `ger_dfb_qf_m${i}`, w0, w1);
        dfb = updateStadiumIfKnown(dfb, `ger_dfb_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(dfb, `ger_dfb_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(dfb, `ger_dfb_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        dfb = assignSingleLegSlots(dfb, `ger_dfb_sf_m${i}`, w0, w1);
        dfb = updateStadiumIfKnown(dfb, `ger_dfb_sf_m${i}`, w0);
      }
    }
    const sf0W = resolveTieWinner(undefined, getFix(dfb, 'ger_dfb_sf_m0'));
    const sf1W = resolveTieWinner(undefined, getFix(dfb, 'ger_dfb_sf_m1'));
    if (sf0W || sf1W) {
      dfb = assignSingleLegSlots(dfb, 'ger_dfb_final', sf0W, sf1W);
    }
    result.ger_dfb_pokal = dfb;
  }

  // 4. FRANÇA - Coupe de France
  if (result.fra_coupe_de_france) {
    let cdf = [...result.fra_coupe_de_france];
    for (let i = 0; i < 2; i++) {
      const w = resolveTieWinner(undefined, getFix(cdf, `fra_cdf_r1_m${i}`));
      if (w) cdf = assignSingleLegSlots(cdf, `fra_cdf_r16_m${i}`, undefined, w);
    }
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(cdf, `fra_cdf_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(cdf, `fra_cdf_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        cdf = assignSingleLegSlots(cdf, `fra_cdf_qf_m${i}`, w0, w1);
        cdf = updateStadiumIfKnown(cdf, `fra_cdf_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(cdf, `fra_cdf_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(cdf, `fra_cdf_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        cdf = assignSingleLegSlots(cdf, `fra_cdf_sf_m${i}`, w0, w1);
        cdf = updateStadiumIfKnown(cdf, `fra_cdf_sf_m${i}`, w0);
      }
    }
    const sf0W = resolveTieWinner(undefined, getFix(cdf, 'fra_cdf_sf_m0'));
    const sf1W = resolveTieWinner(undefined, getFix(cdf, 'fra_cdf_sf_m1'));
    if (sf0W || sf1W) {
      cdf = assignSingleLegSlots(cdf, 'fra_cdf_final', sf0W, sf1W);
    }
    result.fra_coupe_de_france = cdf;
  }

  // 5. ITÁLIA - Supercoppa & Coppa Italia
  if (result.ita_supercoppa) {
    let superFix = [...result.ita_supercoppa];
    const sf0W = resolveTieWinner(undefined, getFix(superFix, 'ita_super_sf0'));
    const sf1W = resolveTieWinner(undefined, getFix(superFix, 'ita_super_sf1'));
    if (sf0W || sf1W) {
      superFix = assignSingleLegSlots(superFix, 'ita_super_final', sf0W, sf1W);
    }
    result.ita_supercoppa = superFix;
  }

  if (result.ita_coppa_italia) {
    let ci = [...result.ita_coppa_italia];
    for (let i = 0; i < 4; i++) {
      const w = resolveTieWinner(undefined, getFix(ci, `ita_ci_r1_m${i}`));
      if (w) ci = assignSingleLegSlots(ci, `ita_ci_r16_m${i}`, undefined, w);
    }
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(ci, `ita_ci_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(ci, `ita_ci_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        ci = assignSingleLegSlots(ci, `ita_ci_qf_m${i}`, w0, w1);
        ci = updateStadiumIfKnown(ci, `ita_ci_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(ci, `ita_ci_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(ci, `ita_ci_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        ci = assignTwoLeggedSlots(ci, `ita_ci_sf_m${i}_ida`, `ita_ci_sf_m${i}_volta`, w0, w1);
        ci = updateStadiumIfKnown(ci, `ita_ci_sf_m${i}_ida`, w0);
        ci = updateStadiumIfKnown(ci, `ita_ci_sf_m${i}_volta`, w1);
      }
    }
    const sf0W = resolveTieWinner(getFix(ci, 'ita_ci_sf_m0_ida'), getFix(ci, 'ita_ci_sf_m0_volta'));
    const sf1W = resolveTieWinner(getFix(ci, 'ita_ci_sf_m1_ida'), getFix(ci, 'ita_ci_sf_m1_volta'));
    if (sf0W || sf1W) {
      ci = assignSingleLegSlots(ci, 'ita_ci_final', sf0W, sf1W);
    }
    result.ita_coppa_italia = ci;
  }

  // 6. PORTUGAL - Taça de Portugal
  if (result.por_taca_portugal) {
    let tp = [...result.por_taca_portugal];
    for (let i = 0; i < 2; i++) {
      const w = resolveTieWinner(undefined, getFix(tp, `por_tp_r1_m${i}`));
      if (w) tp = assignSingleLegSlots(tp, `por_tp_r16_m${i}`, undefined, w);
    }
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(tp, `por_tp_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(tp, `por_tp_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        tp = assignSingleLegSlots(tp, `por_tp_qf_m${i}`, w0, w1);
        tp = updateStadiumIfKnown(tp, `por_tp_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(tp, `por_tp_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(tp, `por_tp_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        tp = assignTwoLeggedSlots(tp, `por_tp_sf_m${i}_ida`, `por_tp_sf_m${i}_volta`, w0, w1);
        tp = updateStadiumIfKnown(tp, `por_tp_sf_m${i}_ida`, w0);
        tp = updateStadiumIfKnown(tp, `por_tp_sf_m${i}_volta`, w1);
      }
    }
    const sf0W = resolveTieWinner(getFix(tp, 'por_tp_sf_m0_ida'), getFix(tp, 'por_tp_sf_m0_volta'));
    const sf1W = resolveTieWinner(getFix(tp, 'por_tp_sf_m1_ida'), getFix(tp, 'por_tp_sf_m1_volta'));
    if (sf0W || sf1W) {
      tp = assignSingleLegSlots(tp, 'por_tp_final', sf0W, sf1W);
    }
    result.por_taca_portugal = tp;
  }

  // 7. HOLANDA - KNVB Beker
  if (result.ned_knvb_beker) {
    let kb = [...result.ned_knvb_beker];
    for (let i = 0; i < 2; i++) {
      const w = resolveTieWinner(undefined, getFix(kb, `ned_kb_r1_m${i}`));
      if (w) kb = assignSingleLegSlots(kb, `ned_kb_r16_m${i}`, undefined, w);
    }
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(kb, `ned_kb_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(kb, `ned_kb_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        kb = assignSingleLegSlots(kb, `ned_kb_qf_m${i}`, w0, w1);
        kb = updateStadiumIfKnown(kb, `ned_kb_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(kb, `ned_kb_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(kb, `ned_kb_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        kb = assignSingleLegSlots(kb, `ned_kb_sf_m${i}`, w0, w1);
        kb = updateStadiumIfKnown(kb, `ned_kb_sf_m${i}`, w0);
      }
    }
    const sf0W = resolveTieWinner(undefined, getFix(kb, 'ned_kb_sf_m0'));
    const sf1W = resolveTieWinner(undefined, getFix(kb, 'ned_kb_sf_m1'));
    if (sf0W || sf1W) {
      kb = assignSingleLegSlots(kb, 'ned_kb_final', sf0W, sf1W);
    }
    result.ned_knvb_beker = kb;
  }

  // 8. BÉLGICA - Croky Cup
  if (result.bel_croky_cup) {
    let cc = [...result.bel_croky_cup];
    for (let i = 0; i < 2; i++) {
      const w = resolveTieWinner(undefined, getFix(cc, `bel_cc_r1_m${i}`));
      if (w) cc = assignSingleLegSlots(cc, `bel_cc_r16_m${i}`, undefined, w);
    }
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(cc, `bel_cc_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(cc, `bel_cc_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        cc = assignSingleLegSlots(cc, `bel_cc_qf_m${i}`, w0, w1);
        cc = updateStadiumIfKnown(cc, `bel_cc_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(cc, `bel_cc_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(cc, `bel_cc_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        cc = assignTwoLeggedSlots(cc, `bel_cc_sf_m${i}_ida`, `bel_cc_sf_m${i}_volta`, w0, w1);
        cc = updateStadiumIfKnown(cc, `bel_cc_sf_m${i}_ida`, w0);
        cc = updateStadiumIfKnown(cc, `bel_cc_sf_m${i}_volta`, w1);
      }
    }
    const sf0W = resolveTieWinner(getFix(cc, 'bel_cc_sf_m0_ida'), getFix(cc, 'bel_cc_sf_m0_volta'));
    const sf1W = resolveTieWinner(getFix(cc, 'bel_cc_sf_m1_ida'), getFix(cc, 'bel_cc_sf_m1_volta'));
    if (sf0W || sf1W) {
      cc = assignSingleLegSlots(cc, 'bel_cc_final', sf0W, sf1W);
    }
    result.bel_croky_cup = cc;
  }

  // 9. TURQUIA - Türkiye Kupası
  if (result.tur_turkiye_kupasi) {
    let tk = [...result.tur_turkiye_kupasi];
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(tk, `tur_tk_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(tk, `tur_tk_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        tk = assignSingleLegSlots(tk, `tur_tk_qf_m${i}`, w0, w1);
        tk = updateStadiumIfKnown(tk, `tur_tk_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(tk, `tur_tk_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(tk, `tur_tk_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        tk = assignTwoLeggedSlots(tk, `tur_tk_sf_m${i}_ida`, `tur_tk_sf_m${i}_volta`, w0, w1);
        tk = updateStadiumIfKnown(tk, `tur_tk_sf_m${i}_ida`, w0);
        tk = updateStadiumIfKnown(tk, `tur_tk_sf_m${i}_volta`, w1);
      }
    }
    const sf0W = resolveTieWinner(getFix(tk, 'tur_tk_sf_m0_ida'), getFix(tk, 'tur_tk_sf_m0_volta'));
    const sf1W = resolveTieWinner(getFix(tk, 'tur_tk_sf_m1_ida'), getFix(tk, 'tur_tk_sf_m1_volta'));
    if (sf0W || sf1W) {
      tk = assignSingleLegSlots(tk, 'tur_tk_final', sf0W, sf1W);
    }
    result.tur_turkiye_kupasi = tk;
  }

  // 10. GRÉCIA - Kypello Elladas
  if (result.gre_kypello_elladas) {
    let ke = [...result.gre_kypello_elladas];
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(ke, `gre_ke_r1_m${i}`));
      const w1 = resolveTieWinner(undefined, getFix(ke, `gre_ke_r1_m${i + 2}`));
      if (i >= 2 && (w0 || w1)) {
        ke = assignSingleLegSlots(ke, `gre_ke_qf_m${i}`, w0, w1);
      } else if (i < 2 && w0) {
        ke = assignSingleLegSlots(ke, `gre_ke_qf_m${i}`, undefined, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(ke, `gre_ke_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(ke, `gre_ke_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        ke = assignTwoLeggedSlots(ke, `gre_ke_sf_m${i}_ida`, `gre_ke_sf_m${i}_volta`, w0, w1);
      }
    }
    const sf0W = resolveTieWinner(getFix(ke, 'gre_ke_sf_m0_ida'), getFix(ke, 'gre_ke_sf_m0_volta'));
    const sf1W = resolveTieWinner(getFix(ke, 'gre_ke_sf_m1_ida'), getFix(ke, 'gre_ke_sf_m1_volta'));
    if (sf0W || sf1W) {
      ke = assignSingleLegSlots(ke, 'gre_ke_final', sf0W, sf1W);
    }
    result.gre_kypello_elladas = ke;
  }

  // 11. NORUEGA - NM Cup
  if (result.nor_nm_cup) {
    let nor = [...result.nor_nm_cup];
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(nor, `nor_nm_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(nor, `nor_nm_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        nor = assignSingleLegSlots(nor, `nor_nm_qf_m${i}`, w0, w1);
        nor = updateStadiumIfKnown(nor, `nor_nm_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(nor, `nor_nm_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(nor, `nor_nm_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        nor = assignSingleLegSlots(nor, `nor_nm_sf_m${i}`, w0, w1);
        nor = updateStadiumIfKnown(nor, `nor_nm_sf_m${i}`, w0);
      }
    }
    const sf0W = resolveTieWinner(undefined, getFix(nor, 'nor_nm_sf_m0'));
    const sf1W = resolveTieWinner(undefined, getFix(nor, 'nor_nm_sf_m1'));
    if (sf0W || sf1W) {
      nor = assignSingleLegSlots(nor, 'nor_nm_final', sf0W, sf1W);
    }
    result.nor_nm_cup = nor;
  }

  // 12. DINAMARCA - DBU Pokalen
  if (result.den_dbu_pokalen) {
    let dp = [...result.den_dbu_pokalen];
    for (let i = 0; i < 4; i++) {
      const w = resolveTieWinner(undefined, getFix(dp, `den_dp_r1_m${i}`));
      if (w) dp = assignSingleLegSlots(dp, `den_dp_qf_m${i}`, undefined, w);
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(dp, `den_dp_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(dp, `den_dp_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        dp = assignTwoLeggedSlots(dp, `den_dp_sf_m${i}_ida`, `den_dp_sf_m${i}_volta`, w0, w1);
      }
    }
    const sf0W = resolveTieWinner(getFix(dp, 'den_dp_sf_m0_ida'), getFix(dp, 'den_dp_sf_m0_volta'));
    const sf1W = resolveTieWinner(getFix(dp, 'den_dp_sf_m1_ida'), getFix(dp, 'den_dp_sf_m1_volta'));
    if (sf0W || sf1W) {
      dp = assignSingleLegSlots(dp, 'den_dp_final', sf0W, sf1W);
    }
    result.den_dbu_pokalen = dp;
  }

  // 13. SUÍÇA - Schweizer Cup
  if (result.sui_schweizer_cup) {
    let sc = [...result.sui_schweizer_cup];
    for (let i = 0; i < 4; i++) {
      const w = resolveTieWinner(undefined, getFix(sc, `sui_sc_r1_m${i}`));
      if (w) sc = assignSingleLegSlots(sc, `sui_sc_qf_m${i}`, undefined, w);
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(sc, `sui_sc_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(sc, `sui_sc_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        sc = assignSingleLegSlots(sc, `sui_sc_sf_m${i}`, w0, w1);
        sc = updateStadiumIfKnown(sc, `sui_sc_sf_m${i}`, w0);
      }
    }
    const sf0W = resolveTieWinner(undefined, getFix(sc, 'sui_sc_sf_m0'));
    const sf1W = resolveTieWinner(undefined, getFix(sc, 'sui_sc_sf_m1'));
    if (sf0W || sf1W) {
      sc = assignSingleLegSlots(sc, 'sui_sc_final', sf0W, sf1W);
    }
    result.sui_schweizer_cup = sc;
  }

  // 14. SUÉCIA - Svenska Cupen
  if (result.swe_svenska_cupen) {
    let swe = [...result.swe_svenska_cupen];
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(swe, `swe_svc_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(swe, `swe_svc_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        swe = assignSingleLegSlots(swe, `swe_svc_qf_m${i}`, w0, w1);
        swe = updateStadiumIfKnown(swe, `swe_svc_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(swe, `swe_svc_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(swe, `swe_svc_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        swe = assignSingleLegSlots(swe, `swe_svc_sf_m${i}`, w0, w1);
        swe = updateStadiumIfKnown(swe, `swe_svc_sf_m${i}`, w0);
      }
    }
    const sf0W = resolveTieWinner(undefined, getFix(swe, 'swe_svc_sf_m0'));
    const sf1W = resolveTieWinner(undefined, getFix(swe, 'swe_svc_sf_m1'));
    if (sf0W || sf1W) {
      swe = assignSingleLegSlots(swe, 'swe_svc_final', sf0W, sf1W);
    }
    result.swe_svenska_cupen = swe;
  }

  // 15. ESCÓCIA - Scottish Cup
  if (result.sco_scottish_cup) {
    let sco = [...result.sco_scottish_cup];
    for (let i = 0; i < 4; i++) {
      const w = resolveTieWinner(undefined, getFix(sco, `sco_sc_r1_m${i}`));
      if (w) sco = assignSingleLegSlots(sco, `sco_sc_qf_m${i}`, undefined, w);
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(sco, `sco_sc_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(sco, `sco_sc_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        sco = assignSingleLegSlots(sco, `sco_sc_sf_m${i}`, w0, w1);
      }
    }
    const sf0W = resolveTieWinner(undefined, getFix(sco, 'sco_sc_sf_m0'));
    const sf1W = resolveTieWinner(undefined, getFix(sco, 'sco_sc_sf_m1'));
    if (sf0W || sf1W) {
      sco = assignSingleLegSlots(sco, 'sco_sc_final', sf0W, sf1W);
    }
    result.sco_scottish_cup = sco;
  }

  // 16. LIGAS ESPECIAIS 1 & 2
  if (result.eu_sp1_cup) {
    let sp1 = [...result.eu_sp1_cup];
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(sp1, `sp1_cup_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(sp1, `sp1_cup_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        sp1 = assignSingleLegSlots(sp1, `sp1_cup_qf_m${i}`, w0, w1);
        sp1 = updateStadiumIfKnown(sp1, `sp1_cup_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(sp1, `sp1_cup_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(sp1, `sp1_cup_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        sp1 = assignSingleLegSlots(sp1, `sp1_cup_sf_m${i}`, w0, w1);
        sp1 = updateStadiumIfKnown(sp1, `sp1_cup_sf_m${i}`, w0);
      }
    }
    const sf0W = resolveTieWinner(undefined, getFix(sp1, 'sp1_cup_sf_m0'));
    const sf1W = resolveTieWinner(undefined, getFix(sp1, 'sp1_cup_sf_m1'));
    if (sf0W || sf1W) {
      sp1 = assignSingleLegSlots(sp1, 'sp1_cup_final', sf0W, sf1W);
    }
    result.eu_sp1_cup = sp1;
  }

  if (result.eu_sp2_cup) {
    let sp2 = [...result.eu_sp2_cup];
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(sp2, `sp2_cup_r16_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(sp2, `sp2_cup_r16_m${i * 2 + 1}`));
      if (w0 || w1) {
        sp2 = assignSingleLegSlots(sp2, `sp2_cup_qf_m${i}`, w0, w1);
        sp2 = updateStadiumIfKnown(sp2, `sp2_cup_qf_m${i}`, w0);
      }
    }
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(sp2, `sp2_cup_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(sp2, `sp2_cup_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        sp2 = assignSingleLegSlots(sp2, `sp2_cup_sf_m${i}`, w0, w1);
        sp2 = updateStadiumIfKnown(sp2, `sp2_cup_sf_m${i}`, w0);
      }
    }
    const sf0W = resolveTieWinner(undefined, getFix(sp2, 'sp2_cup_sf_m0'));
    const sf1W = resolveTieWinner(undefined, getFix(sp2, 'sp2_cup_sf_m1'));
    if (sf0W || sf1W) {
      sp2 = assignSingleLegSlots(sp2, 'sp2_cup_final', sf0W, sf1W);
    }
    result.eu_sp2_cup = sp2;
  }

  return result;
}

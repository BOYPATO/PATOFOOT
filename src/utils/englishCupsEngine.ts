import { Club, EuropeanLeagueId, Fixture } from '../types/game';
import { getClubsForEuropeanLeague, getEuropeanRoundDate } from './europeLeaguesEngine';
import {
  getEuropeanLeagueScheduleDates,
  getSeasonFifaBlockedDatesSet,
  getUefaBlockedDatesSet,
  resolveCupScheduleConflicts,
} from './calendarUtils';
import { assignSingleLegSlots, assignTwoLeggedSlots, resolveTieWinner } from './multiLeagueEngine';

export function buildEnglishCupsBlockedDates(
  seasonYear: number = 2026,
  fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>,
  extraBlocked?: Set<string>
): Set<string> {
  const blocked = getSeasonFifaBlockedDatesSet(seasonYear, 'europe');
  for (const d of getUefaBlockedDatesSet(seasonYear)) {
    blocked.add(d);
  }
  const engLeagues: EuropeanLeagueId[] = [
    'eng_premier',
    'eng_championship',
    'eng_league_one',
    'eng_league_two',
  ];
  for (const lid of engLeagues) {
    const existing = fixturesEurope?.[lid];
    if (existing && existing.length > 0) {
      for (const f of existing) {
        if (f.date) blocked.add(f.date);
      }
    } else if (lid === 'eng_premier') {
      for (const slot of getEuropeanLeagueScheduleDates('eng_premier', 38, seasonYear)) {
        blocked.add(slot.date);
      }
    } else {
      for (let r = 1; r <= 46; r++) {
        blocked.add(getEuropeanRoundDate(r, 46, seasonYear, lid).date);
      }
    }
  }
  if (extraBlocked) {
    for (const d of extraBlocked) blocked.add(d);
  }
  return blocked;
}

/**
 * Wembley Stadium em Londres é o palco sagrado das decisões do futebol inglês:
 * Community Shield, Final da Carabao Cup, Semifinais da FA Cup e Final da FA Cup.
 */
export const WEMBLEY_STADIUM = 'Wembley Stadium, London';

/**
 * Helper para extrair com segurança o nome em string do estádio de um clube.
 */
export function getClubStadiumName(club?: Club): string {
  if (!club) return 'Estádio a definir';
  if (typeof club.stadium === 'string') return club.stadium;
  return club.stadium?.name || 'Estádio Principal';
}

/**
 * 7 principais clubes ingleses em competições UEFA que recebem 'bye' até a 3ª Rodada (Round of 32)
 * da Carabao Cup (EFL Cup).
 */
export const CARABAO_CUP_TOP7_SEEDS = [
  'eu_mci', // Manchester City
  'eu_ars', // Arsenal
  'eu_liv', // Liverpool
  'eu_avl', // Aston Villa
  'eu_tot', // Tottenham
  'eu_che', // Chelsea
  'eu_mun', // Manchester United
];

// Helper determinístico para seed aleatório baseado no ano
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

/**
 * FA COMMUNITY SHIELD (Supercopa da Inglaterra)
 * Disputada no lendário Wembley Stadium em Agosto, abrindo oficialmente a temporada inglesa.
 * Campeão da Premier League vs Campeão da Emirates FA Cup.
 */
export function generateCommunityShieldFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  plChampionId?: string,
  faCupChampionId?: string,
  options?: {
    blockedDates?: Set<string>;
    fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
  }
): Fixture[] {
  const premierClubs = getClubsForEuropeanLeague(clubs, 'eng_premier');
  const homeId =
    plChampionId && premierClubs.some((c) => c.id === plChampionId)
      ? plChampionId
      : premierClubs.find((c) => c.id === 'eu_ars')?.id || 'eu_ars'; // Arsenal, atual campeão

  let awayId =
    faCupChampionId && premierClubs.some((c) => c.id === faCupChampionId)
      ? faCupChampionId
      : premierClubs.find((c) => c.id === 'eu_mci')?.id || 'eu_mci'; // Manchester City

  if (awayId === homeId) {
    const runnerUp = premierClubs.find((c) => c.id !== homeId);
    awayId = runnerUp ? runnerUp.id : 'eu_mci';
  }

  // Em 16 de agosto de 2026, entre Arsenal e Manchester City, em Cardiff
  const matchDate = `${seasonYear}-08-16`;
  const blocked =
    options?.blockedDates || buildEnglishCupsBlockedDates(seasonYear, options?.fixturesEurope);

  const raw: Fixture[] = [
    {
      id: `eng_comm_shield_${seasonYear}`,
      round: 1,
      competition: 'eng_community_shield',
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: matchDate,
      time: '15:00',
      stadiumName: 'Millennium Stadium (Cardiff)',
      cupPhase: 'Supercopa da Inglaterra (Community Shield)',
      groupName: 'Millennium Stadium · Cardiff · Decisão em Jogo Único',
      leg: undefined,
    },
  ];
  return resolveCupScheduleConflicts(raw, blocked, `${seasonYear}-08-01`, `${seasonYear}-08-22`);
}

/**
 * CARABAO CUP (EFL Cup / Copa da Liga Inglesa)
 * Disputada pelos 92 clubes das 4 divisões profissionais da Inglaterra (Premier, Championship, League One, League Two).
 *
 * Regulamento oficial:
 * - Round 1 (Agosto): 70 clubes (24 League Two, 24 League One, 22 Championship) -> 35 confrontos em jogo único
 * - Round 2 (Fim de Agosto): 50 clubes (35 vencedores R1 + 2 Championship + 13 Premier League) -> 25 confrontos em jogo único
 * - Round 3 / 16-avos (Setembro): 32 clubes (25 vencedores R2 + 7 Premier League da UEFA) -> 16 confrontos em jogo único
 * - Round 4 / Oitavas (Outubro): 16 vencedores R3 -> 8 confrontos em jogo único
 * - Quartas de Final (Dezembro): 8 vencedores R4 -> 4 confrontos em jogo único
 * - Semifinais (Janeiro): 4 vencedores QF -> 2 confrontos em IDA E VOLTA
 * - Grande Final (Fevereiro): Jogo único no WEMBLEY STADIUM, Londres
 */
export function generateCarabaoCupFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  options?: {
    blockedDates?: Set<string>;
    fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
  }
): Fixture[] {
  const premierClubs = getClubsForEuropeanLeague(clubs, 'eng_premier');
  const champClubs = getClubsForEuropeanLeague(clubs, 'eng_championship');
  const l1Clubs = getClubsForEuropeanLeague(clubs, 'eng_league_one');
  const l2Clubs = getClubsForEuropeanLeague(clubs, 'eng_league_two');

  const shuffledL2 = pseudoShuffle(l2Clubs, seasonYear * 17);
  const shuffledL1 = pseudoShuffle(l1Clubs, seasonYear * 19);
  const shuffledChamp = pseudoShuffle(champClubs, seasonYear * 23);

  // 2 clubes da Championship recebem bye para a R2
  const champByeClubs = shuffledChamp.slice(0, 2);
  const champR1Clubs = shuffledChamp.slice(2);

  // 7 clubes da Premier recebem bye para a R3 (clubes em competições UEFA)
  const top7Ids = new Set(CARABAO_CUP_TOP7_SEEDS);
  const premierTop7 = premierClubs.filter((c) => top7Ids.has(c.id));
  const remainingPremier = premierClubs.filter((c) => !top7Ids.has(c.id));

  // Se por algum motivo premierTop7 tiver menos de 7 clubes, completa com os de maior reputação
  const premierByeR3 = [...premierTop7];
  if (premierByeR3.length < 7) {
    const needed = 7 - premierByeR3.length;
    const additional = remainingPremier.slice(0, needed);
    premierByeR3.push(...additional);
  }
  const premierByeR3Set = new Set(premierByeR3.map((c) => c.id));
  const premierR2Clubs = premierClubs.filter((c) => !premierByeR3Set.has(c.id));

  // Round 1: 70 clubes = 24 L2 + 24 L1 + 22 Championship -> 35 confrontos
  const poolR1 = pseudoShuffle([...shuffledL2, ...shuffledL1, ...champR1Clubs], seasonYear * 29);
  const fixtures: Fixture[] = [];

  const r1Dates = [`${seasonYear}-08-11`, `${seasonYear}-08-12`];
  for (let i = 0; i < 35; i++) {
    const home = poolR1[i * 2];
    const away = poolR1[i * 2 + 1];
    if (!home || !away) continue;
    const d = r1Dates[i % 2];
    fixtures.push({
      id: `efl_r1_m${i}`,
      round: 1,
      competition: 'eng_efl_cup',
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: i % 3 === 0 ? '19:45' : '20:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Rodada',
      groupName: 'Jogo Único · Eliminatória',
      leg: undefined,
    });
  }

  // Round 2: 50 clubes = 35 vencedores R1 + 2 Champ (champByeClubs) + 13 Premier (premierR2Clubs) -> 25 confrontos
  const r2Dates = [`${seasonYear}-08-25`, `${seasonYear}-08-26`];
  const byeR2Pool = pseudoShuffle([...champByeClubs, ...premierR2Clubs], seasonYear * 31);

  for (let i = 0; i < 25; i++) {
    const d = r2Dates[i % 2];
    const byeCount = byeR2Pool.length; // 15 clubes (2 Champ + 13 Premier)
    let homeId: string;
    let awayId: string;
    let stadium = 'Estádio a definir';

    if (i < byeCount) {
      // 15 entrantes da R2 enfrentam 15 vencedores da R1 (W0..W14)
      const byeClub = byeR2Pool[i];
      homeId = byeClub.id;
      awayId = `TBD_EFL_R1_W${i}`;
      stadium = getClubStadiumName(byeClub);
    } else {
      // Restantes 20 vencedores da R1 (W15..W34) se enfrentam em 10 confrontos
      const r1IdxA = byeCount + (i - byeCount) * 2;
      homeId = `TBD_EFL_R1_W${r1IdxA}`;
      awayId = `TBD_EFL_R1_W${r1IdxA + 1}`;
    }

    fixtures.push({
      id: `efl_r2_m${i}`,
      round: 2,
      competition: 'eng_efl_cup',
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: i % 2 === 0 ? '19:45' : '20:00',
      stadiumName: stadium,
      cupPhase: '2ª Rodada',
      groupName: 'Jogo Único · Eliminatória',
      leg: undefined,
    });
  }

  // Round 3 (16-avos de final): 32 clubes = 25 vencedores R2 + 7 Premier League UEFA -> 16 confrontos
  const r3Dates = [`${seasonYear}-09-22`, `${seasonYear}-09-23`];
  const shuffledTop7 = pseudoShuffle(premierByeR3, seasonYear * 37);

  for (let i = 0; i < 16; i++) {
    const d = r3Dates[i % 2];
    const topCount = shuffledTop7.length; // 7 clubes UEFA
    let homeId: string;
    let awayId: string;
    let stadium = 'Estádio a definir';

    // Os 7 clubes UEFA entram diretamente contra os 7 primeiros vencedores da R2 (W0..W6)
    if (i < topCount) {
      const topSeed = shuffledTop7[i];
      homeId = topSeed.id;
      awayId = `TBD_EFL_R2_W${i}`;
      stadium = getClubStadiumName(topSeed);
    } else {
      // Restantes 18 vencedores da R2 (W7..W24) se enfrentam em 9 confrontos
      const r2IdxA = topCount + (i - topCount) * 2;
      homeId = `TBD_EFL_R2_W${r2IdxA}`;
      awayId = `TBD_EFL_R2_W${r2IdxA + 1}`;
    }

    fixtures.push({
      id: `efl_r3_m${i}`,
      round: 3,
      competition: 'eng_efl_cup',
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: '20:00',
      stadiumName: stadium,
      cupPhase: '3ª Rodada (16-avos)',
      groupName: 'Round of 32 · Jogo Único',
      leg: undefined,
    });
  }

  // Round 4 (Oitavas de Final): 16 clubes -> 8 confrontos
  const r4Dates = [`${seasonYear}-10-27`, `${seasonYear}-10-28`];
  for (let i = 0; i < 8; i++) {
    const d = r4Dates[i % 2];
    fixtures.push({
      id: `efl_r4_m${i}`,
      round: 4,
      competition: 'eng_efl_cup',
      homeTeamId: `TBD_EFL_R3_W${i * 2}`,
      awayTeamId: `TBD_EFL_R3_W${i * 2 + 1}`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: '19:45',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Oitavas de Final',
      groupName: 'Jogo Único · Eliminatória',
      leg: undefined,
    });
  }

  // Quartas de Final: 8 clubes -> 4 confrontos
  const qfDates = [`${seasonYear}-12-15`, `${seasonYear}-12-16`];
  for (let i = 0; i < 4; i++) {
    const d = qfDates[i % 2];
    fixtures.push({
      id: `efl_qf_m${i}`,
      round: 5,
      competition: 'eng_efl_cup',
      homeTeamId: `TBD_EFL_R4_W${i * 2}`,
      awayTeamId: `TBD_EFL_R4_W${i * 2 + 1}`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Jogo Único · Eliminatória',
      leg: undefined,
    });
  }

  // Semifinais: 4 clubes -> 2 confrontos em IDA e VOLTA (formato tradicional da Carabao Cup!)
  const nextYear = seasonYear + 1;
  const sfIdaDates = [`${nextYear}-01-12`, `${nextYear}-01-13`];
  const sfVoltaDates = [`${nextYear}-01-26`, `${nextYear}-01-27`];

  for (let i = 0; i < 2; i++) {
    const qfHomeWinnerSlot = `TBD_EFL_QF_W${i * 2}`;
    const qfAwayWinnerSlot = `TBD_EFL_QF_W${i * 2 + 1}`;

    // Jogo de Ida
    fixtures.push({
      id: `efl_sf_m${i}_ida`,
      round: 6,
      competition: 'eng_efl_cup',
      homeTeamId: qfHomeWinnerSlot,
      awayTeamId: qfAwayWinnerSlot,
      homeScore: null,
      awayScore: null,
      played: false,
      date: sfIdaDates[i],
      time: '20:00',
      stadiumName: 'Estádio a definir (Ida)',
      cupPhase: 'Semifinal',
      groupName: `Semifinal ${i + 1} · Jogo de Ida`,
      leg: 1,
    });

    // Jogo de Volta
    fixtures.push({
      id: `efl_sf_m${i}_volta`,
      round: 7,
      competition: 'eng_efl_cup',
      homeTeamId: qfAwayWinnerSlot,
      awayTeamId: qfHomeWinnerSlot,
      homeScore: null,
      awayScore: null,
      played: false,
      date: sfVoltaDates[i],
      time: '20:00',
      stadiumName: 'Estádio a definir (Volta)',
      cupPhase: 'Semifinal',
      groupName: `Semifinal ${i + 1} · Jogo de Volta`,
      leg: 2,
    });
  }

  // Grande Final em Wembley Stadium (Domingo no final de fevereiro)
  fixtures.push({
    id: `efl_final`,
    round: 8,
    competition: 'eng_efl_cup',
    homeTeamId: 'TBD_EFL_SF_W0',
    awayTeamId: 'TBD_EFL_SF_W1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-02-28`,
    time: '16:30',
    stadiumName: WEMBLEY_STADIUM,
    cupPhase: 'Grande Final',
    groupName: 'Wembley Stadium · Final da Carabao Cup',
    leg: undefined,
  });

  const blocked =
    options?.blockedDates || buildEnglishCupsBlockedDates(seasonYear, options?.fixturesEurope);
  return resolveCupScheduleConflicts(fixtures, blocked, `${seasonYear}-08-01`, `${nextYear}-06-06`);
}

/**
 * EMIRATES FA CUP (Copa da Inglaterra)
 * A copa nacional mais tradicional e prestigiosa do planeta.
 *
 * Regulamento oficial adaptado às 4 divisões profissionais inglesas (92 clubes):
 * - Round 1 (Novembro): 48 clubes (24 League One + 24 League Two) -> 24 confrontos em jogo único
 * - Round 2 (Dezembro): 24 vencedores da R1 -> 12 confrontos em jogo único
 * - Round 3 / 32-avos (Janeiro): 64 clubes (12 vencedores R2 + 20 Premier League + 24 Championship + 8 clubes L1/L2) -> 32 confrontos em jogo único
 * - Round 4 / 16-avos (Fim de Janeiro): 32 vencedores R3 -> 16 confrontos em jogo único
 * - Round 5 / Oitavas (Início de Março): 16 vencedores R4 -> 8 confrontos em jogo único
 * - Quartas de Final (Fim de Março): 8 vencedores R5 -> 4 confrontos em jogo único
 * - Semifinais (Abril): 4 clubes no lendário WEMBLEY STADIUM -> 2 confrontos em jogo único
 * - Grande Final (Maio): Jogo único no sagrado WEMBLEY STADIUM fechando a temporada inglesa!
 */
export function generateFACupFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  options?: {
    blockedDates?: Set<string>;
    fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
  }
): Fixture[] {
  const premierClubs = getClubsForEuropeanLeague(clubs, 'eng_premier');
  const champClubs = getClubsForEuropeanLeague(clubs, 'eng_championship');
  const l1Clubs = getClubsForEuropeanLeague(clubs, 'eng_league_one');
  const l2Clubs = getClubsForEuropeanLeague(clubs, 'eng_league_two');

  const shuffledL1 = pseudoShuffle(l1Clubs, seasonYear * 41);
  const shuffledL2 = pseudoShuffle(l2Clubs, seasonYear * 43);

  // Round 1: 48 clubes da League One e League Two -> 24 confrontos em jogo único no início de novembro
  const poolR1 = pseudoShuffle([...shuffledL1, ...shuffledL2], seasonYear * 47);
  const fixtures: Fixture[] = [];

  const r1Dates = [`${seasonYear}-11-07`, `${seasonYear}-11-08`];
  for (let i = 0; i < 24; i++) {
    const home = poolR1[i * 2];
    const away = poolR1[i * 2 + 1];
    const d = r1Dates[i % 2];
    fixtures.push({
      id: `fa_r1_m${i}`,
      round: 1,
      competition: 'eng_fa_cup',
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: i % 2 === 0 ? '15:00' : '17:30',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Rodada Própria',
      groupName: 'Jogo Único · Eliminatória',
      leg: undefined,
    });
  }

  // Round 2: 24 clubes (vencedores de R1) -> 12 confrontos em jogo único no início de dezembro
  const r2Dates = [`${seasonYear}-12-05`, `${seasonYear}-12-06`];
  for (let i = 0; i < 12; i++) {
    const d = r2Dates[i % 2];
    fixtures.push({
      id: `fa_r2_m${i}`,
      round: 2,
      competition: 'eng_fa_cup',
      homeTeamId: `TBD_FA_R1_W${i * 2}`,
      awayTeamId: `TBD_FA_R1_W${i * 2 + 1}`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: '15:00',
      stadiumName: 'Estádio a definir',
      cupPhase: '2ª Rodada Própria',
      groupName: 'Jogo Único · Eliminatória',
      leg: undefined,
    });
  }

  // Round 3 (32-avos / 3ª Fase mágica da FA Cup em Janeiro):
  // 64 clubes: 20 Premier League + 24 Championship + 12 vencedores R2 + 8 melhores clubes de L1/L2
  const nextYear = seasonYear + 1;
  const shuffledPremier = pseudoShuffle(premierClubs, seasonYear * 53);
  const shuffledChamp = pseudoShuffle(champClubs, seasonYear * 59);

  // 8 convidados de topo da L1/L2
  const extraL1L2 = pseudoShuffle([...shuffledL1.slice(0, 4), ...shuffledL2.slice(0, 4)], seasonYear * 61);

  // Total de 44 clubes que entram direto: 20 Premier + 24 Championship
  const bigEntrants = pseudoShuffle([...shuffledPremier, ...shuffledChamp], seasonYear * 67);

  const r3Dates = [`${nextYear}-01-09`, `${nextYear}-01-10`];

  for (let i = 0; i < 32; i++) {
    const d = r3Dates[i % 2];
    let homeId = `TBD_FA_R3_H${i}`;
    let awayId = `TBD_FA_R3_A${i}`;
    let stadium = 'Estádio a definir';

    if (i < 12) {
      const topClub = bigEntrants[i];
      homeId = topClub ? topClub.id : `TBD_FA_R3_H${i}`;
      awayId = `TBD_FA_R2_W${i}`;
      stadium = getClubStadiumName(topClub);
    } else if (i < 20) {
      const topClub = bigEntrants[i];
      const lowerClub = extraL1L2[i - 12];
      homeId = topClub ? topClub.id : `TBD_FA_R3_H${i}`;
      awayId = lowerClub ? lowerClub.id : `TBD_FA_R3_A${i}`;
      stadium = getClubStadiumName(topClub);
    } else {
      const club1 = bigEntrants[i];
      const club2 = bigEntrants[i + 12];
      homeId = club1 ? club1.id : `TBD_FA_R3_H${i}`;
      awayId = club2 ? club2.id : `TBD_FA_R3_A${i}`;
      stadium = getClubStadiumName(club1);
    }

    fixtures.push({
      id: `fa_r3_m${i}`,
      round: 3,
      competition: 'eng_fa_cup',
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: i % 4 === 0 ? '12:30' : i % 2 === 0 ? '15:00' : '17:30',
      stadiumName: stadium,
      cupPhase: '3ª Rodada (32-avos)',
      groupName: 'Round of 64 · Estreia da Premier League',
      leg: undefined,
    });
  }

  // Round 4 (16-avos de final): 32 vencedores da R3 -> 16 confrontos no fim de janeiro
  const r4Dates = [`${nextYear}-01-30`, `${nextYear}-01-31`];
  for (let i = 0; i < 16; i++) {
    const d = r4Dates[i % 2];
    fixtures.push({
      id: `fa_r4_m${i}`,
      round: 4,
      competition: 'eng_fa_cup',
      homeTeamId: `TBD_FA_R3_W${i * 2}`,
      awayTeamId: `TBD_FA_R3_W${i * 2 + 1}`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: '15:00',
      stadiumName: 'Estádio a definir',
      cupPhase: '4ª Rodada (16-avos)',
      groupName: 'Round of 32 · Jogo Único',
      leg: undefined,
    });
  }

  // Round 5 (Oitavas de Final): 16 vencedores da R4 -> 8 confrontos no início de março
  const r5Dates = [`${nextYear}-03-02`, `${nextYear}-03-03`];
  for (let i = 0; i < 8; i++) {
    const d = r5Dates[i % 2];
    fixtures.push({
      id: `fa_r5_m${i}`,
      round: 5,
      competition: 'eng_fa_cup',
      homeTeamId: `TBD_FA_R4_W${i * 2}`,
      awayTeamId: `TBD_FA_R4_W${i * 2 + 1}`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: '19:45',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Oitavas de Final',
      groupName: 'Jogo Único · Eliminatória',
      leg: undefined,
    });
  }

  // Quartas de Final: 8 vencedores da R5 -> 4 confrontos no fim de março
  const qfDates = [`${nextYear}-03-20`, `${nextYear}-03-21`];
  for (let i = 0; i < 4; i++) {
    const d = qfDates[i % 2];
    fixtures.push({
      id: `fa_qf_m${i}`,
      round: 6,
      competition: 'eng_fa_cup',
      homeTeamId: `TBD_FA_R5_W${i * 2}`,
      awayTeamId: `TBD_FA_R5_W${i * 2 + 1}`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: i % 2 === 0 ? '15:00' : '17:30',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Jogo Único · Eliminatória',
      leg: undefined,
    });
  }

  // Semifinais em Wembley Stadium (Londres) em Abril: 4 vencedores das Quartas -> 2 jogos
  const sfDates = [`${nextYear}-04-17`, `${nextYear}-04-18`];
  for (let i = 0; i < 2; i++) {
    fixtures.push({
      id: `fa_sf_m${i}`,
      round: 7,
      competition: 'eng_fa_cup',
      homeTeamId: `TBD_FA_QF_W${i * 2}`,
      awayTeamId: `TBD_FA_QF_W${i * 2 + 1}`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: sfDates[i],
      time: '17:15',
      stadiumName: WEMBLEY_STADIUM,
      cupPhase: 'Semifinal',
      groupName: 'Wembley Stadium · Semifinal Única',
      leg: undefined,
    });
  }

  // Grande Final em Wembley Stadium (Londres) em meados de Maio
  fixtures.push({
    id: `fa_final`,
    round: 8,
    competition: 'eng_fa_cup',
    homeTeamId: 'TBD_FA_SF_W0',
    awayTeamId: 'TBD_FA_SF_W1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-05-15`,
    time: '17:00',
    stadiumName: WEMBLEY_STADIUM,
    cupPhase: 'Grande Final',
    groupName: 'Wembley Stadium · Grande Final da FA Cup',
    leg: undefined,
  });

  const blocked =
    options?.blockedDates || buildEnglishCupsBlockedDates(seasonYear, options?.fixturesEurope);
  return resolveCupScheduleConflicts(fixtures, blocked, `${seasonYear}-08-01`, `${nextYear}-06-06`);
}

export function generateAllEnglishCupsFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  options?: {
    fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
    plChampionId?: string;
    faCupChampionId?: string;
  }
): {
  fixturesEngCommunityShield: Fixture[];
  fixturesEngEflCup: Fixture[];
  fixturesEngFaCup: Fixture[];
} {
  const blocked = buildEnglishCupsBlockedDates(seasonYear, options?.fixturesEurope);
  const fixturesEngCommunityShield = generateCommunityShieldFixtures(
    clubs,
    seasonYear,
    options?.plChampionId,
    options?.faCupChampionId,
    { blockedDates: blocked }
  );
  for (const f of fixturesEngCommunityShield) if (f.date) blocked.add(f.date);

  const fixturesEngEflCup = generateCarabaoCupFixtures(clubs, seasonYear, { blockedDates: blocked });
  for (const f of fixturesEngEflCup) if (f.date) blocked.add(f.date);

  const fixturesEngFaCup = generateFACupFixtures(clubs, seasonYear, { blockedDates: blocked });

  return {
    fixturesEngCommunityShield,
    fixturesEngEflCup,
    fixturesEngFaCup,
  };
}

/**
 * Sincroniza dinamicamente as fases de mata-mata da Carabao Cup e FA Cup
 * conforme as partidas das rodadas anteriores forem sendo jogadas.
 */
export function syncEnglishCupsKnockoutBracket(params: {
  fixturesEngCommunityShield?: Fixture[];
  fixturesEngEflCup?: Fixture[];
  fixturesEngFaCup?: Fixture[];
  clubs?: Club[];
}): {
  fixturesEngCommunityShield?: Fixture[];
  fixturesEngEflCup?: Fixture[];
  fixturesEngFaCup?: Fixture[];
} {
  const clubsMap = new Map<string, Club>((params.clubs || []).map((c) => [c.id, c]));

  // Helper para buscar fixture pelo ID
  const getFix = (list: Fixture[], id: string) => list.find((f) => f.id === id);

  // 1. CARABAO CUP (EFL Cup)
  let efl = [...(params.fixturesEngEflCup || [])];
  if (efl.length > 0) {
    // R1 -> R2: m0..m14 recebem R1 W0..W14 na vaga visitante; m15..m24 recebem R1 W15..W34 em pares
    for (let i = 0; i < 15; i++) {
      const w = resolveTieWinner(undefined, getFix(efl, `efl_r1_m${i}`));
      if (w) {
        efl = assignSingleLegSlots(efl, `efl_r2_m${i}`, undefined, w);
      }
    }
    for (let i = 15; i < 25; i++) {
      const r1IdxA = 15 + (i - 15) * 2;
      const w0 = resolveTieWinner(undefined, getFix(efl, `efl_r1_m${r1IdxA}`));
      const w1 = resolveTieWinner(undefined, getFix(efl, `efl_r1_m${r1IdxA + 1}`));
      if (w0 || w1) {
        efl = assignSingleLegSlots(efl, `efl_r2_m${i}`, w0, w1);
        if (w0 && clubsMap.has(w0)) {
          efl = efl.map((f) =>
            f.id === `efl_r2_m${i}` && f.homeTeamId === w0 && (f.stadiumName || '').includes('definir')
              ? { ...f, stadiumName: getClubStadiumName(clubsMap.get(w0)) }
              : f
          );
        }
      }
    }

    // R2 -> R3 (16 partidas): m0..m6 recebem R2 W0..W6 contra os 7 UEFA; m7..m15 recebem R2 W7..W24 em pares
    for (let i = 0; i < 7; i++) {
      const w = resolveTieWinner(undefined, getFix(efl, `efl_r2_m${i}`));
      if (w) {
        efl = assignSingleLegSlots(efl, `efl_r3_m${i}`, undefined, w);
      }
    }
    for (let i = 7; i < 16; i++) {
      const r2IdxA = 7 + (i - 7) * 2;
      const w0 = resolveTieWinner(undefined, getFix(efl, `efl_r2_m${r2IdxA}`));
      const w1 = resolveTieWinner(undefined, getFix(efl, `efl_r2_m${r2IdxA + 1}`));
      if (w0 || w1) {
        efl = assignSingleLegSlots(efl, `efl_r3_m${i}`, w0, w1);
        if (w0 && clubsMap.has(w0)) {
          efl = efl.map((f) =>
            f.id === `efl_r3_m${i}` && f.homeTeamId === w0 && (f.stadiumName || '').includes('definir')
              ? { ...f, stadiumName: getClubStadiumName(clubsMap.get(w0)) }
              : f
          );
        }
      }
    }

    // R3 -> R4 (Oitavas)
    for (let i = 0; i < 8; i++) {
      const w0 = resolveTieWinner(undefined, getFix(efl, `efl_r3_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(efl, `efl_r3_m${i * 2 + 1}`));
      if (w0 || w1) {
        efl = assignSingleLegSlots(efl, `efl_r4_m${i}`, w0, w1);
        if (w0 && clubsMap.has(w0)) {
          efl = efl.map((f) =>
            f.id === `efl_r4_m${i}` && f.homeTeamId === w0 && (f.stadiumName || '').includes('definir')
              ? { ...f, stadiumName: getClubStadiumName(clubsMap.get(w0)) }
              : f
          );
        }
      }
    }

    // R4 -> Quartas de Final
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(efl, `efl_r4_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(efl, `efl_r4_m${i * 2 + 1}`));
      if (w0 || w1) {
        efl = assignSingleLegSlots(efl, `efl_qf_m${i}`, w0, w1);
        if (w0 && clubsMap.has(w0)) {
          efl = efl.map((f) =>
            f.id === `efl_qf_m${i}` && f.homeTeamId === w0 && (f.stadiumName || '').includes('definir')
              ? { ...f, stadiumName: getClubStadiumName(clubsMap.get(w0)) }
              : f
          );
        }
      }
    }

    // Quartas -> Semifinais (Ida e Volta)
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(efl, `efl_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(efl, `efl_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        efl = assignTwoLeggedSlots(efl, `efl_sf_m${i}_ida`, `efl_sf_m${i}_volta`, w0, w1);
        if (w0 && clubsMap.has(w0)) {
          const w0Club = clubsMap.get(w0);
          const w1Club = clubsMap.get(w1 || '');
          efl = efl.map((f) =>
            f.id === `efl_sf_m${i}_ida` && f.homeTeamId === w0
              ? { ...f, stadiumName: getClubStadiumName(w0Club) }
              : f.id === `efl_sf_m${i}_volta` && f.awayTeamId === w0
              ? { ...f, stadiumName: getClubStadiumName(w1Club) }
              : f
          );
        }
      }
    }

    // Semifinais (Ida e Volta) -> Grande Final em Wembley
    const sf0Winner = resolveTieWinner(
      getFix(efl, 'efl_sf_m0_ida'),
      getFix(efl, 'efl_sf_m0_volta')
    );
    const sf1Winner = resolveTieWinner(
      getFix(efl, 'efl_sf_m1_ida'),
      getFix(efl, 'efl_sf_m1_volta')
    );
    if (sf0Winner || sf1Winner) {
      efl = assignSingleLegSlots(efl, 'efl_final', sf0Winner, sf1Winner);
    }
  }

  // 2. EMIRATES FA CUP
  let fa = [...(params.fixturesEngFaCup || [])];
  if (fa.length > 0) {
    // R1 -> R2 (12 confrontos)
    for (let i = 0; i < 12; i++) {
      const w0 = resolveTieWinner(undefined, getFix(fa, `fa_r1_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(fa, `fa_r1_m${i * 2 + 1}`));
      if (w0 || w1) {
        fa = assignSingleLegSlots(fa, `fa_r2_m${i}`, w0, w1);
        if (w0 && clubsMap.has(w0)) {
          fa = fa.map((f) =>
            f.id === `fa_r2_m${i}` && f.homeTeamId === w0 && (f.stadiumName || '').includes('definir')
              ? { ...f, stadiumName: getClubStadiumName(clubsMap.get(w0)) }
              : f
          );
        }
      }
    }

    // R2 -> R3 (os 12 vencedores de R2 preenchem as vagas visitantes de fa_r3_m0..m11)
    for (let i = 0; i < 12; i++) {
      const w = resolveTieWinner(undefined, getFix(fa, `fa_r2_m${i}`));
      if (w) {
        fa = assignSingleLegSlots(fa, `fa_r3_m${i}`, undefined, w);
      }
    }

    // R3 -> R4 (16 confrontos)
    for (let i = 0; i < 16; i++) {
      const w0 = resolveTieWinner(undefined, getFix(fa, `fa_r3_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(fa, `fa_r3_m${i * 2 + 1}`));
      if (w0 || w1) {
        fa = assignSingleLegSlots(fa, `fa_r4_m${i}`, w0, w1);
        if (w0 && clubsMap.has(w0)) {
          fa = fa.map((f) =>
            f.id === `fa_r4_m${i}` && f.homeTeamId === w0 && (f.stadiumName || '').includes('definir')
              ? { ...f, stadiumName: getClubStadiumName(clubsMap.get(w0)) }
              : f
          );
        }
      }
    }

    // R4 -> R5 (Oitavas de Final: 8 confrontos)
    for (let i = 0; i < 8; i++) {
      const w0 = resolveTieWinner(undefined, getFix(fa, `fa_r4_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(fa, `fa_r4_m${i * 2 + 1}`));
      if (w0 || w1) {
        fa = assignSingleLegSlots(fa, `fa_r5_m${i}`, w0, w1);
        if (w0 && clubsMap.has(w0)) {
          fa = fa.map((f) =>
            f.id === `fa_r5_m${i}` && f.homeTeamId === w0 && (f.stadiumName || '').includes('definir')
              ? { ...f, stadiumName: getClubStadiumName(clubsMap.get(w0)) }
              : f
          );
        }
      }
    }

    // R5 -> Quartas de Final (4 confrontos)
    for (let i = 0; i < 4; i++) {
      const w0 = resolveTieWinner(undefined, getFix(fa, `fa_r5_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(fa, `fa_r5_m${i * 2 + 1}`));
      if (w0 || w1) {
        fa = assignSingleLegSlots(fa, `fa_qf_m${i}`, w0, w1);
        if (w0 && clubsMap.has(w0)) {
          fa = fa.map((f) =>
            f.id === `fa_qf_m${i}` && f.homeTeamId === w0 && (f.stadiumName || '').includes('definir')
              ? { ...f, stadiumName: getClubStadiumName(clubsMap.get(w0)) }
              : f
          );
        }
      }
    }

    // Quartas -> Semifinais em Wembley (2 confrontos)
    for (let i = 0; i < 2; i++) {
      const w0 = resolveTieWinner(undefined, getFix(fa, `fa_qf_m${i * 2}`));
      const w1 = resolveTieWinner(undefined, getFix(fa, `fa_qf_m${i * 2 + 1}`));
      if (w0 || w1) {
        fa = assignSingleLegSlots(fa, `fa_sf_m${i}`, w0, w1);
      }
    }

    // Semifinais em Wembley -> Grande Final em Wembley
    const sf0Winner = resolveTieWinner(undefined, getFix(fa, 'fa_sf_m0'));
    const sf1Winner = resolveTieWinner(undefined, getFix(fa, 'fa_sf_m1'));
    if (sf0Winner || sf1Winner) {
      fa = assignSingleLegSlots(fa, 'fa_final', sf0Winner, sf1Winner);
    }
  }

  return {
    fixturesEngCommunityShield: params.fixturesEngCommunityShield,
    fixturesEngEflCup: efl,
    fixturesEngFaCup: fa,
  };
}

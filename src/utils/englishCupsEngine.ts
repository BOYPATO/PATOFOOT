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
 * 9 clubes ingleses da Premier League envolvidos em competições europeias (UEFA) que recebem 'bye'
 * até a 3ª Rodada (Round of 32) da Carabao Cup (EFL Cup) 2026/27.
 */
export const CARABAO_CUP_TOP9_SEEDS = [
  'eu_ars', // Arsenal
  'eu_avl', // Aston Villa
  'eu_bou', // AFC Bournemouth
  'eu_bha', // Brighton & Hove Albion
  'eu_cry', // Crystal Palace
  'eu_liv', // Liverpool
  'eu_mci', // Manchester City
  'eu_mun', // Manchester United
  'eu_sun', // Sunderland
];

/** Alias legado preservado para compatibilidade */
export const CARABAO_CUP_TOP7_SEEDS = CARABAO_CUP_TOP9_SEEDS;

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
 * Regulamento oficial 2026/27:
 * - Rodada Preliminar (Início de Agosto): 4 clubes da EFL League Two -> 2 confrontos em jogo único (2 avançam)
 * - 1ª Rodada (Agosto · Norte/Sul): 70 clubes (20 League Two + 24 League One + 24 Championship + 2 vencedores Prelim) -> 35 confrontos
 * - 2ª Rodada (Fim de Agosto · Norte/Sul): 46 clubes (35 vencedores R1 + 11 Premier League fora da UEFA) -> 23 confrontos
 * - 3ª Rodada / 16-avos (Setembro): 32 clubes (23 vencedores R2 + 9 Premier League da UEFA) -> 16 confrontos
 * - 4ª Rodada / Oitavas (Outubro): 16 vencedores R3 -> 8 confrontos
 * - Quartas de Final (Dezembro): 8 vencedores R4 -> 4 confrontos
 * - Semifinais (Jan–Fev): 4 vencedores QF -> 2 confrontos em IDA E VOLTA (11/01 a 01/02)
 * - Grande Final (21 de Março): Jogo único no WEMBLEY STADIUM, Londres
 * Total: 93 jogos oficiais.
 */
export function generateCarabaoCupFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  _options?: {
    blockedDates?: Set<string>;
    fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
  }
): Fixture[] {
  const nextYear = seasonYear + 1;
  const clubById = new Map<string, Club>(clubs.map((c) => [c.id, c]));
  const premierClubs = getClubsForEuropeanLeague(clubs, 'eng_premier');
  const champClubs = getClubsForEuropeanLeague(clubs, 'eng_championship');
  const l1Clubs = getClubsForEuropeanLeague(clubs, 'eng_league_one');
  const l2Clubs = getClubsForEuropeanLeague(clubs, 'eng_league_two');
  const fixtures: Fixture[] = [];

  const canUseOfficial2026Bracket =
    seasonYear === 2026 &&
    premierClubs.length >= 20 &&
    champClubs.length >= 24 &&
    l1Clubs.length >= 24 &&
    l2Clubs.length >= 24 &&
    clubById.has('eu_tra') &&
    clubById.has('eu_roc') &&
    clubById.has('eu_yor') &&
    clubById.has('eu_cra') &&
    clubById.has('eu_sun');

  if (canUseOfficial2026Bracket) {
    // 1. RODADA PRELIMINAR (4 clubes da League Two -> 2 jogos únicos)
    const prelimSpecs: Array<{ date: string; time: string; home: string; away: string }> = [
      { date: `${seasonYear}-08-01`, time: '15:00', home: 'eu_tra', away: 'eu_roc' },
      { date: `${seasonYear}-08-03`, time: '19:45', home: 'eu_yor', away: 'eu_cra' },
    ];
    prelimSpecs.forEach((m, i) => {
      fixtures.push({
        id: `efl_prelim_m${i}`,
        round: 1,
        competition: 'eng_efl_cup',
        homeTeamId: m.home,
        awayTeamId: m.away,
        homeScore: null,
        awayScore: null,
        played: false,
        date: m.date,
        time: m.time,
        stadiumName: getClubStadiumName(clubById.get(m.home)),
        cupPhase: 'Rodada Preliminar',
        groupName: 'Rodada Preliminar · Jogo Único (League Two)',
        leg: undefined,
      });
    });

    // 2. PRIMEIRA RODADA (70 clubes -> 35 jogos únicos: 17 Seção Norte + 18 Seção Sul)
    const r1Specs: Array<{
      date: string;
      time: string;
      home: string;
      away: string;
      section: 'Seção Norte' | 'Seção Sul';
    }> = [
      // Seção Norte (m0..m16)
      { date: `${seasonYear}-08-07`, time: '19:45', home: 'eu_wol', away: 'eu_pva', section: 'Seção Norte' },
      { date: `${seasonYear}-08-07`, time: '20:00', home: 'eu_mid', away: 'eu_wre', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_bar', away: 'eu_wig', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_bra_eng', away: 'TBD_EFL_PRELIM_W0', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_bur', away: 'eu_not', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_brt', away: 'eu_rov', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_cre', away: 'eu_acc', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_der', away: 'eu_lin', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_fle', away: 'eu_chs', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_gri', away: 'eu_bla', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_pne', away: 'eu_hud', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_sal', away: 'eu_shr', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_shw', away: 'eu_bol', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_sto', away: 'eu_don', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_stk', away: 'eu_old', section: 'Seção Norte' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_rot', away: 'eu_wba', section: 'Seção Norte' },
      { date: `${seasonYear}-08-09`, time: '16:00', home: 'eu_man', away: 'eu_shu', section: 'Seção Norte' },
      // Seção Sul (m17..m34)
      { date: `${seasonYear}-08-06`, time: '19:45', home: 'eu_brc', away: 'eu_wal', section: 'Seção Sul' },
      { date: `${seasonYear}-08-07`, time: '19:45', home: 'eu_wyc', away: 'eu_ste', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_cam', away: 'eu_bnt', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_qpr', away: 'eu_mil', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_wim', away: 'eu_npt', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_brr', away: 'eu_pet', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_bro', away: 'eu_rea', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_car', away: 'eu_swi', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_gil', away: 'eu_lut', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_lei', away: 'eu_nta', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_ley', away: 'eu_oxf', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_nor', away: 'eu_mkd', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_swa', away: 'eu_bir', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_wat', away: 'TBD_EFL_PRELIM_W1', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_whu', away: 'eu_pom', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_chl', away: 'eu_cha', section: 'Seção Sul' },
      { date: `${seasonYear}-08-08`, time: '15:00', home: 'eu_col', away: 'eu_sou', section: 'Seção Sul' },
      { date: `${seasonYear}-08-10`, time: '19:45', home: 'eu_ply', away: 'eu_exe', section: 'Seção Sul' },
    ];
    r1Specs.forEach((m, i) => {
      fixtures.push({
        id: `efl_r1_m${i}`,
        round: 2,
        competition: 'eng_efl_cup',
        homeTeamId: m.home,
        awayTeamId: m.away,
        homeScore: null,
        awayScore: null,
        played: false,
        date: m.date,
        time: m.time,
        stadiumName: getClubStadiumName(clubById.get(m.home)),
        cupPhase: '1ª Rodada',
        groupName: `1ª Rodada · ${m.section} · Jogo Único`,
        leg: undefined,
      });
    });

    // 3. SEGUNDA RODADA (46 clubes: 35 vencedores R1 + 11 Premier League fora da UEFA -> 23 jogos únicos)
    const r2Specs: Array<{
      date: string;
      time: string;
      home: string;
      away: string;
      section: 'Seção Norte' | 'Seção Sul';
    }> = [
      // Seção Norte (m0..m10)
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W13', away: 'TBD_EFL_R1_W1', section: 'Seção Norte' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W2', away: 'TBD_EFL_R1_W6', section: 'Seção Norte' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W5', away: 'TBD_EFL_R1_W16', section: 'Seção Norte' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W9', away: 'TBD_EFL_R1_W7', section: 'Seção Norte' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W8', away: 'TBD_EFL_R1_W11', section: 'Seção Norte' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W12', away: 'TBD_EFL_R1_W0', section: 'Seção Norte' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W14', away: 'eu_hul', section: 'Seção Norte' },
      { date: `${seasonYear}-08-25`, time: '20:00', home: 'eu_nfo', away: 'eu_lee', section: 'Seção Norte' },
      { date: `${seasonYear}-08-26`, time: '19:45', home: 'TBD_EFL_R1_W3', away: 'TBD_EFL_R1_W4', section: 'Seção Norte' },
      { date: `${seasonYear}-08-26`, time: '20:00', home: 'eu_new', away: 'TBD_EFL_R1_W15', section: 'Seção Norte' },
      { date: `${seasonYear}-08-26`, time: '20:00', home: 'TBD_EFL_R1_W10', away: 'eu_eve', section: 'Seção Norte' },
      // Seção Sul (m11..m22)
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W24', away: 'TBD_EFL_R1_W28', section: 'Seção Sul' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W19', away: 'TBD_EFL_R1_W20', section: 'Seção Sul' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'eu_ips', away: 'TBD_EFL_R1_W26', section: 'Seção Sul' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W34', away: 'eu_cov', section: 'Seção Sul' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W33', away: 'TBD_EFL_R1_W31', section: 'Seção Sul' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W18', away: 'TBD_EFL_R1_W23', section: 'Seção Sul' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W17', away: 'TBD_EFL_R1_W27', section: 'Seção Sul' },
      { date: `${seasonYear}-08-25`, time: '19:45', home: 'TBD_EFL_R1_W30', away: 'TBD_EFL_R1_W22', section: 'Seção Sul' },
      { date: `${seasonYear}-08-25`, time: '20:00', home: 'TBD_EFL_R1_W29', away: 'eu_bre', section: 'Seção Sul' },
      { date: `${seasonYear}-08-26`, time: '20:00', home: 'eu_tot', away: 'TBD_EFL_R1_W32', section: 'Seção Sul' },
      { date: `${seasonYear}-08-27`, time: '19:45', home: 'eu_che', away: 'TBD_EFL_R1_W25', section: 'Seção Sul' },
      { date: `${seasonYear}-08-27`, time: '20:00', home: 'eu_ful', away: 'TBD_EFL_R1_W21', section: 'Seção Sul' },
    ];
    r2Specs.forEach((m, i) => {
      const homeClub = clubById.get(m.home);
      fixtures.push({
        id: `efl_r2_m${i}`,
        round: 3,
        competition: 'eng_efl_cup',
        homeTeamId: m.home,
        awayTeamId: m.away,
        homeScore: null,
        awayScore: null,
        played: false,
        date: m.date,
        time: m.time,
        stadiumName: homeClub ? getClubStadiumName(homeClub) : 'Estádio a definir',
        cupPhase: '2ª Rodada',
        groupName: `2ª Rodada · ${m.section} · Jogo Único`,
        leg: undefined,
      });
    });

    // 4. TERCEIRA RODADA (32 clubes: 23 vencedores R2 + 9 Premier League da UEFA -> 16 jogos únicos)
    const r3Specs: Array<{ date: string; time: string; home: string; away: string }> = [
      { date: `${seasonYear}-09-08`, time: '19:45', home: 'eu_bou', away: 'TBD_EFL_R2_W3' },
      { date: `${seasonYear}-09-08`, time: '19:45', home: 'eu_cry', away: 'TBD_EFL_R2_W0' },
      { date: `${seasonYear}-09-08`, time: '19:45', home: 'TBD_EFL_R2_W17', away: 'TBD_EFL_R2_W8' },
      { date: `${seasonYear}-09-08`, time: '19:45', home: 'eu_sun', away: 'TBD_EFL_R2_W6' },
      { date: `${seasonYear}-09-08`, time: '20:00', home: 'TBD_EFL_R2_W12', away: 'TBD_EFL_R2_W9' },
      { date: `${seasonYear}-09-09`, time: '20:00', home: 'TBD_EFL_R2_W21', away: 'TBD_EFL_R2_W7' },
      { date: `${seasonYear}-09-15`, time: '19:45', home: 'TBD_EFL_R2_W18', away: 'TBD_EFL_R2_W1' },
      { date: `${seasonYear}-09-15`, time: '19:45', home: 'TBD_EFL_R2_W15', away: 'TBD_EFL_R2_W22' },
      { date: `${seasonYear}-09-15`, time: '19:45', home: 'TBD_EFL_R2_W13', away: 'eu_ars' },
      { date: `${seasonYear}-09-15`, time: '20:00', home: 'eu_liv', away: 'TBD_EFL_R2_W20' },
      { date: `${seasonYear}-09-15`, time: '20:00', home: 'TBD_EFL_R2_W16', away: 'TBD_EFL_R2_W19' },
      { date: `${seasonYear}-09-16`, time: '19:45', home: 'TBD_EFL_R2_W10', away: 'TBD_EFL_R2_W5' },
      { date: `${seasonYear}-09-16`, time: '19:45', home: 'TBD_EFL_R2_W4', away: 'TBD_EFL_R2_W2' },
      { date: `${seasonYear}-09-16`, time: '19:45', home: 'TBD_EFL_R2_W14', away: 'eu_avl' },
      { date: `${seasonYear}-09-16`, time: '20:00', home: 'eu_mun', away: 'eu_bha' },
      { date: `${seasonYear}-09-17`, time: '20:00', home: 'eu_mci', away: 'TBD_EFL_R2_W11' },
    ];
    r3Specs.forEach((m, i) => {
      const homeClub = clubById.get(m.home);
      fixtures.push({
        id: `efl_r3_m${i}`,
        round: 4,
        competition: 'eng_efl_cup',
        homeTeamId: m.home,
        awayTeamId: m.away,
        homeScore: null,
        awayScore: null,
        played: false,
        date: m.date,
        time: m.time,
        stadiumName: homeClub ? getClubStadiumName(homeClub) : 'Estádio a definir',
        cupPhase: '3ª Rodada (16-avos)',
        groupName: 'Round of 32 · Jogo Único',
        leg: undefined,
      });
    });

    // 5. QUARTA RODADA / OITAVAS DE FINAL (16 clubes -> 8 jogos únicos)
    const r4Specs: Array<{ date: string; time: string; home: string; away: string }> = [
      { date: `${seasonYear}-10-27`, time: '19:45', home: 'TBD_EFL_R3_W2', away: 'TBD_EFL_R3_W6' },
      { date: `${seasonYear}-10-27`, time: '19:45', home: 'TBD_EFL_R3_W12', away: 'TBD_EFL_R3_W8' },
      { date: `${seasonYear}-10-28`, time: '19:45', home: 'TBD_EFL_R3_W15', away: 'TBD_EFL_R3_W14' },
      { date: `${seasonYear}-10-28`, time: '19:45', home: 'TBD_EFL_R3_W0', away: 'TBD_EFL_R3_W13' },
      { date: `${seasonYear}-10-28`, time: '19:45', home: 'TBD_EFL_R3_W7', away: 'TBD_EFL_R3_W1' },
      { date: `${seasonYear}-10-28`, time: '19:45', home: 'TBD_EFL_R3_W3', away: 'TBD_EFL_R3_W10' },
      { date: `${seasonYear}-10-28`, time: '20:00', home: 'TBD_EFL_R3_W9', away: 'TBD_EFL_R3_W5' },
      { date: `${seasonYear}-10-29`, time: '20:00', home: 'TBD_EFL_R3_W11', away: 'TBD_EFL_R3_W4' },
    ];
    r4Specs.forEach((m, i) => {
      fixtures.push({
        id: `efl_r4_m${i}`,
        round: 5,
        competition: 'eng_efl_cup',
        homeTeamId: m.home,
        awayTeamId: m.away,
        homeScore: null,
        awayScore: null,
        played: false,
        date: m.date,
        time: m.time,
        stadiumName: 'Estádio a definir',
        cupPhase: 'Oitavas de Final',
        groupName: '4ª Rodada (Oitavas de Final) · Jogo Único',
        leg: undefined,
      });
    });

    // 6. QUARTAS DE FINAL (8 clubes -> 4 jogos únicos)
    const qfSpecs: Array<{ date: string; time: string; home: string; away: string }> = [
      { date: `${seasonYear}-12-15`, time: '20:00', home: 'TBD_EFL_R4_W2', away: 'TBD_EFL_R4_W0' },
      { date: `${seasonYear}-12-16`, time: '19:45', home: 'TBD_EFL_R4_W4', away: 'TBD_EFL_R4_W5' },
      { date: `${seasonYear}-12-16`, time: '20:00', home: 'TBD_EFL_R4_W6', away: 'TBD_EFL_R4_W3' },
      { date: `${seasonYear}-12-17`, time: '20:00', home: 'TBD_EFL_R4_W1', away: 'TBD_EFL_R4_W7' },
    ];
    qfSpecs.forEach((m, i) => {
      fixtures.push({
        id: `efl_qf_m${i}`,
        round: 6,
        competition: 'eng_efl_cup',
        homeTeamId: m.home,
        awayTeamId: m.away,
        homeScore: null,
        awayScore: null,
        played: false,
        date: m.date,
        time: m.time,
        stadiumName: 'Estádio a definir',
        cupPhase: 'Quartas de Final',
        groupName: 'Quartas de Final · Jogo Único',
        leg: undefined,
      });
    });

    // 7. SEMIFINAIS (4 clubes -> 2 confrontos em IDA e VOLTA · 11/01 a 01/02/2027)
    const sfIdaDates = [`${nextYear}-01-12`, `${nextYear}-01-13`];
    const sfVoltaDates = [`${nextYear}-02-02`, `${nextYear}-02-03`];
    for (let i = 0; i < 2; i++) {
      const slotA = `TBD_EFL_QF_W${i * 2}`;
      const slotB = `TBD_EFL_QF_W${i * 2 + 1}`;
      fixtures.push({
        id: `efl_sf_m${i}_ida`,
        round: 7,
        competition: 'eng_efl_cup',
        homeTeamId: slotA,
        awayTeamId: slotB,
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
      fixtures.push({
        id: `efl_sf_m${i}_volta`,
        round: 8,
        competition: 'eng_efl_cup',
        homeTeamId: slotB,
        awayTeamId: slotA,
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

    // 8. GRANDE FINAL NO WEMBLEY STADIUM — 21 de março de 2027
    fixtures.push({
      id: 'efl_final',
      round: 9,
      competition: 'eng_efl_cup',
      homeTeamId: 'TBD_EFL_SF_W0',
      awayTeamId: 'TBD_EFL_SF_W1',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-03-21`,
      time: '16:30',
      stadiumName: WEMBLEY_STADIUM,
      cupPhase: 'Grande Final',
      groupName: 'Wembley Stadium · Final da Carabao Cup',
      leg: undefined,
    });

    return fixtures;
  }

  // Temporadas futuras (2027+): mesmo regulamento oficial de 92 clubes com sorteio dinâmico!
  // - Rodada Preliminar: 4 clubes da League Two (2 jogos -> 2 avançam)
  // - 1ª Rodada: 20 League Two + 24 League One + 24 Championship + 2 Prelim = 70 clubes (35 jogos)
  // - 2ª Rodada: 35 vencedores R1 + 11 Premier League (fora UEFA) = 46 clubes (23 jogos)
  // - 3ª Rodada: 23 vencedores R2 + 9 Premier League (UEFA) = 32 clubes (16 jogos)
  // - 4ª Rodada (8) -> Quartas (4) -> Semifinais Ida/Volta (4) -> Final em Wembley (21/03)
  const shuffledL2 = pseudoShuffle(l2Clubs, seasonYear * 17);
  const shuffledL1 = pseudoShuffle(l1Clubs, seasonYear * 19);
  const shuffledChamp = pseudoShuffle(champClubs, seasonYear * 23);

  const prelimL2 = shuffledL2.slice(0, 4);
  const directL2 = shuffledL2.slice(4); // 20 clubes

  const top9Ids = new Set(CARABAO_CUP_TOP9_SEEDS);
  const premierTop9 = premierClubs.filter((c) => top9Ids.has(c.id));
  const remainingPremier = premierClubs.filter((c) => !top9Ids.has(c.id));
  const premierByeR3 = [...premierTop9];
  if (premierByeR3.length < 9) {
    premierByeR3.push(...remainingPremier.slice(0, 9 - premierByeR3.length));
  }
  const premierByeR3Set = new Set(premierByeR3.slice(0, 9).map((c) => c.id));
  const premierR2Clubs = pseudoShuffle(
    premierClubs.filter((c) => !premierByeR3Set.has(c.id)),
    seasonYear * 31
  ); // 11 clubes
  const shuffledTop9 = pseudoShuffle(premierByeR3.slice(0, 9), seasonYear * 37);

  // Rodada Preliminar (2 jogos)
  const prelimDates = [`${seasonYear}-08-01`, `${seasonYear}-08-03`];
  for (let i = 0; i < 2; i++) {
    const home = prelimL2[i * 2];
    const away = prelimL2[i * 2 + 1];
    fixtures.push({
      id: `efl_prelim_m${i}`,
      round: 1,
      competition: 'eng_efl_cup',
      homeTeamId: home?.id || 'tbd',
      awayTeamId: away?.id || 'tbd',
      homeScore: null,
      awayScore: null,
      played: false,
      date: prelimDates[i],
      time: i === 0 ? '15:00' : '19:45',
      stadiumName: getClubStadiumName(home),
      cupPhase: 'Rodada Preliminar',
      groupName: 'Rodada Preliminar · Jogo Único (League Two)',
      leg: undefined,
    });
  }

  // 1ª Rodada (70 clubes = 68 diretos + 2 vencedores da Preliminar -> 35 jogos)
  const directR1Pool = pseudoShuffle([...directL2, ...shuffledL1, ...shuffledChamp], seasonYear * 29);
  const r1Dates = [`${seasonYear}-08-07`, `${seasonYear}-08-08`, `${seasonYear}-08-09`];
  for (let i = 0; i < 35; i++) {
    let homeId: string;
    let awayId: string;
    let homeClub: Club | undefined;
    if (i === 0) {
      homeClub = directR1Pool[0];
      homeId = homeClub?.id || 'tbd';
      awayId = 'TBD_EFL_PRELIM_W0';
    } else if (i === 1) {
      homeClub = directR1Pool[1];
      homeId = homeClub?.id || 'tbd';
      awayId = 'TBD_EFL_PRELIM_W1';
    } else {
      const idx = 2 + (i - 2) * 2;
      homeClub = directR1Pool[idx];
      homeId = homeClub?.id || 'tbd';
      awayId = directR1Pool[idx + 1]?.id || 'tbd';
    }
    const section = i < 17 ? 'Seção Norte' : 'Seção Sul';
    fixtures.push({
      id: `efl_r1_m${i}`,
      round: 2,
      competition: 'eng_efl_cup',
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: i < 3 ? r1Dates[0] : i < 33 ? r1Dates[1] : r1Dates[2],
      time: i < 3 ? '19:45' : '15:00',
      stadiumName: getClubStadiumName(homeClub),
      cupPhase: '1ª Rodada',
      groupName: `1ª Rodada · ${section} · Jogo Único`,
      leg: undefined,
    });
  }

  // 2ª Rodada (46 clubes = 35 vencedores R1 + 11 Premier League fora UEFA -> 23 jogos)
  const r2Dates = [`${seasonYear}-08-25`, `${seasonYear}-08-26`, `${seasonYear}-08-27`];
  const plR2Count = Math.min(11, premierR2Clubs.length);
  for (let i = 0; i < 23; i++) {
    let homeId: string;
    let awayId: string;
    let stadium = 'Estádio a definir';
    if (i < plR2Count) {
      const plClub = premierR2Clubs[i];
      homeId = plClub.id;
      awayId = `TBD_EFL_R1_W${i}`;
      stadium = getClubStadiumName(plClub);
    } else {
      const r1Idx = plR2Count + (i - plR2Count) * 2;
      homeId = `TBD_EFL_R1_W${r1Idx}`;
      awayId = `TBD_EFL_R1_W${r1Idx + 1}`;
    }
    const section = i < 11 ? 'Seção Norte' : 'Seção Sul';
    fixtures.push({
      id: `efl_r2_m${i}`,
      round: 3,
      competition: 'eng_efl_cup',
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      played: false,
      date: i < 16 ? r2Dates[0] : i < 21 ? r2Dates[1] : r2Dates[2],
      time: i % 2 === 0 ? '19:45' : '20:00',
      stadiumName: stadium,
      cupPhase: '2ª Rodada',
      groupName: `2ª Rodada · ${section} · Jogo Único`,
      leg: undefined,
    });
  }

  // 3ª Rodada (32 clubes = 23 vencedores R2 + 9 Premier League UEFA -> 16 jogos)
  const r3Dates = [
    `${seasonYear}-09-08`,
    `${seasonYear}-09-09`,
    `${seasonYear}-09-15`,
    `${seasonYear}-09-16`,
    `${seasonYear}-09-17`,
  ];
  const topCount = Math.min(9, shuffledTop9.length);
  for (let i = 0; i < 16; i++) {
    let homeId: string;
    let awayId: string;
    let stadium = 'Estádio a definir';
    if (i < topCount) {
      const topSeed = shuffledTop9[i];
      homeId = topSeed.id;
      awayId = `TBD_EFL_R2_W${i}`;
      stadium = getClubStadiumName(topSeed);
    } else {
      const r2Idx = topCount + (i - topCount) * 2;
      homeId = `TBD_EFL_R2_W${r2Idx}`;
      awayId = `TBD_EFL_R2_W${r2Idx + 1}`;
    }
    const d =
      i < 5 ? r3Dates[0] : i === 5 ? r3Dates[1] : i < 11 ? r3Dates[2] : i < 15 ? r3Dates[3] : r3Dates[4];
    fixtures.push({
      id: `efl_r3_m${i}`,
      round: 4,
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

  // 4ª Rodada / Oitavas de Final (8 jogos)
  for (let i = 0; i < 8; i++) {
    const d =
      i < 2 ? `${seasonYear}-10-27` : i < 7 ? `${seasonYear}-10-28` : `${seasonYear}-10-29`;
    fixtures.push({
      id: `efl_r4_m${i}`,
      round: 5,
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
      groupName: '4ª Rodada (Oitavas de Final) · Jogo Único',
      leg: undefined,
    });
  }

  // Quartas de Final (4 jogos)
  const qfDates = [
    `${seasonYear}-12-15`,
    `${seasonYear}-12-16`,
    `${seasonYear}-12-16`,
    `${seasonYear}-12-17`,
  ];
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `efl_qf_m${i}`,
      round: 6,
      competition: 'eng_efl_cup',
      homeTeamId: `TBD_EFL_R4_W${i * 2}`,
      awayTeamId: `TBD_EFL_R4_W${i * 2 + 1}`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: qfDates[i],
      time: '20:00',
      stadiumName: 'Estádio a definir',
      cupPhase: 'Quartas de Final',
      groupName: 'Quartas de Final · Jogo Único',
      leg: undefined,
    });
  }

  // Semifinais (Ida e Volta · 11/01 a 01/02)
  const sfIdaDates = [`${nextYear}-01-12`, `${nextYear}-01-13`];
  const sfVoltaDates = [`${nextYear}-02-02`, `${nextYear}-02-03`];
  for (let i = 0; i < 2; i++) {
    const slotA = `TBD_EFL_QF_W${i * 2}`;
    const slotB = `TBD_EFL_QF_W${i * 2 + 1}`;
    fixtures.push({
      id: `efl_sf_m${i}_ida`,
      round: 7,
      competition: 'eng_efl_cup',
      homeTeamId: slotA,
      awayTeamId: slotB,
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
    fixtures.push({
      id: `efl_sf_m${i}_volta`,
      round: 8,
      competition: 'eng_efl_cup',
      homeTeamId: slotB,
      awayTeamId: slotA,
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

  // Grande Final em Wembley Stadium (21 de março)
  fixtures.push({
    id: 'efl_final',
    round: 9,
    competition: 'eng_efl_cup',
    homeTeamId: 'TBD_EFL_SF_W0',
    awayTeamId: 'TBD_EFL_SF_W1',
    homeScore: null,
    awayScore: null,
    played: false,
    date: `${nextYear}-03-21`,
    time: '16:30',
    stadiumName: WEMBLEY_STADIUM,
    cupPhase: 'Grande Final',
    groupName: 'Wembley Stadium · Final da Carabao Cup',
    leg: undefined,
  });

  return fixtures;
}

/**
 * EMIRATES FA CUP (Copa da Inglaterra)
 * A copa nacional mais tradicional e prestigiosa do planeta.
 *
 * Regulamento oficial (124 clubes nas fases principais · 123 jogos em jogo único):
 * - 1ª Rodada (06/11 a 09/11): 80 clubes (24 League One + 24 League Two + 32 Non-League L5–L8) -> 40 jogos
 * - 2ª Rodada (04/12 a 07/12): 40 vencedores da 1ª Rodada -> 20 jogos
 * - 3ª Rodada / 32-avos (09/01): 64 clubes (20 vencedores da 2ª Rodada + 20 Premier League + 24 Championship) -> 32 jogos
 * - 4ª Rodada / 16-avos (13/02): 32 vencedores da 3ª Rodada -> 16 jogos
 * - Oitavas de Final / 5ª Rodada (06/03): 16 vencedores da 4ª Rodada -> 8 jogos
 * - Quartas de Final (03/04): 8 vencedores das Oitavas -> 4 jogos
 * - Semifinais (24/04): 4 clubes em WEMBLEY STADIUM -> 2 jogos em jogo único
 * - Grande Final (22/05): Jogo único em WEMBLEY STADIUM valendo o título e vaga na UEFA Europa League
 */
export function generateFACupFixtures(
  clubs: Club[],
  seasonYear: number = 2026,
  _options?: {
    blockedDates?: Set<string>;
    fixturesEurope?: Partial<Record<EuropeanLeagueId, Fixture[]>>;
  }
): Fixture[] {
  const clubMap = new Map<string, Club>(clubs.map((c) => [c.id, c]));
  const premierClubs = getClubsForEuropeanLeague(clubs, 'eng_premier');
  const champClubs = getClubsForEuropeanLeague(clubs, 'eng_championship');
  const l1Clubs = getClubsForEuropeanLeague(clubs, 'eng_league_one');
  const l2Clubs = getClubsForEuropeanLeague(clubs, 'eng_league_two');
  const nonLeagueClubs = clubs.filter((c) => c.id.startsWith('eu_eng5_'));

  const nextYear = seasonYear + 1;
  const fixtures: Fixture[] = [];

  const addRound3ToFinal = (premierPool: Club[], champPool: Club[]) => {
    // 3ª Rodada (32-avos · 09/01): 64 clubes = 20 vencedores R2 + 20 Premier League + 24 Championship (44 diretos)
    const bigEntrants = pseudoShuffle([...premierPool, ...champPool], seasonYear * 67);
    const r3Date = `${nextYear}-01-09`;

    for (let i = 0; i < 32; i++) {
      let homeId: string;
      let awayId: string;
      let stadium = 'Estádio a definir';

      if (i < 20) {
        const bigClub = bigEntrants[i];
        // Alterna mandos para manter a magia dos clubes menores jogando em casa na 3ª Rodada
        if (i % 2 === 0) {
          homeId = bigClub ? bigClub.id : `TBD_FA_R3_H${i}`;
          awayId = `TBD_FA_R2_W${i}`;
          stadium = getClubStadiumName(bigClub);
        } else {
          homeId = `TBD_FA_R2_W${i}`;
          awayId = bigClub ? bigClub.id : `TBD_FA_R3_A${i}`;
          stadium = 'Estádio a definir';
        }
      } else {
        const idx = 20 + (i - 20) * 2;
        const club1 = bigEntrants[idx];
        const club2 = bigEntrants[idx + 1];
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
        date: r3Date,
        time: i % 4 === 0 ? '12:30' : i % 2 === 0 ? '15:00' : '17:30',
        stadiumName: stadium,
        cupPhase: '3ª Rodada (32-avos)',
        groupName: '3ª Rodada · Estreia de Premier League e Championship',
        leg: undefined,
      });
    }

    // 4ª Rodada (16-avos · 13/02): 32 vencedores R3 -> 16 jogos
    const r4Date = `${nextYear}-02-13`;
    for (let i = 0; i < 16; i++) {
      fixtures.push({
        id: `fa_r4_m${i}`,
        round: 4,
        competition: 'eng_fa_cup',
        homeTeamId: `TBD_FA_R3_W${i * 2}`,
        awayTeamId: `TBD_FA_R3_W${i * 2 + 1}`,
        homeScore: null,
        awayScore: null,
        played: false,
        date: r4Date,
        time: i % 3 === 0 ? '12:30' : '15:00',
        stadiumName: 'Estádio a definir',
        cupPhase: '4ª Rodada (16-avos)',
        groupName: '4ª Rodada · Jogo Único',
        leg: undefined,
      });
    }

    // 5ª Rodada (Oitavas de Final · 06/03): 16 vencedores R4 -> 8 jogos
    const r5Date = `${nextYear}-03-06`;
    for (let i = 0; i < 8; i++) {
      fixtures.push({
        id: `fa_r5_m${i}`,
        round: 5,
        competition: 'eng_fa_cup',
        homeTeamId: `TBD_FA_R4_W${i * 2}`,
        awayTeamId: `TBD_FA_R4_W${i * 2 + 1}`,
        homeScore: null,
        awayScore: null,
        played: false,
        date: r5Date,
        time: i % 2 === 0 ? '15:00' : '17:30',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Oitavas de Final',
        groupName: 'Oitavas de Final · Jogo Único',
        leg: undefined,
      });
    }

    // Quartas de Final (03/04): 8 vencedores Oitavas -> 4 jogos
    const qfDate = `${nextYear}-04-03`;
    for (let i = 0; i < 4; i++) {
      fixtures.push({
        id: `fa_qf_m${i}`,
        round: 6,
        competition: 'eng_fa_cup',
        homeTeamId: `TBD_FA_R5_W${i * 2}`,
        awayTeamId: `TBD_FA_R5_W${i * 2 + 1}`,
        homeScore: null,
        awayScore: null,
        played: false,
        date: qfDate,
        time: i % 2 === 0 ? '12:30' : '17:30',
        stadiumName: 'Estádio a definir',
        cupPhase: 'Quartas de Final',
        groupName: 'Quartas de Final · Jogo Único',
        leg: undefined,
      });
    }

    // Semifinais em Wembley Stadium (24/04): 4 vencedores Quartas -> 2 jogos
    const sfDate = `${nextYear}-04-24`;
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
        date: sfDate,
        time: i === 0 ? '12:30' : '17:15',
        stadiumName: WEMBLEY_STADIUM,
        cupPhase: 'Semifinal',
        groupName: 'Wembley Stadium · Semifinal Única',
        leg: undefined,
      });
    }

    // Grande Final em Wembley Stadium (22/05)
    fixtures.push({
      id: 'fa_final',
      round: 8,
      competition: 'eng_fa_cup',
      homeTeamId: 'TBD_FA_SF_W0',
      awayTeamId: 'TBD_FA_SF_W1',
      homeScore: null,
      awayScore: null,
      played: false,
      date: `${nextYear}-05-22`,
      time: '16:30',
      stadiumName: WEMBLEY_STADIUM,
      cupPhase: 'Grande Final',
      groupName: 'Wembley Stadium · Grande Final da FA Cup',
      leg: undefined,
    });
  };

  // === TEMPORADA 2026/27: TABELA OFICIAL EXATA DA EMIRATES FA CUP ===
  if (seasonYear === 2026 && nonLeagueClubs.length >= 32) {
    // 1ª Rodada (40 confrontos · 06/11 a 09/11/2026)
    const r1Official: Array<[string, string, string, string]> = [
      // 06/11/2026 (2 jogos)
      ['eu_brr', 'eu_cam', '2026-11-06', '19:45'],           // m0: Bristol Rovers x Cambridge United
      ['eu_eng5_oxc', 'eu_lei', '2026-11-06', '19:45'],      // m1: Oxford City x Leicester City
      // 07/11/2026 (33 jogos)
      ['eu_npt', 'eu_wal', '2026-11-07', '15:00'],           // m2: Newport County x Walsall
      ['eu_oxf', 'eu_ste', '2026-11-07', '15:00'],           // m3: Oxford United x Stevenage
      ['eu_bro', 'eu_rot', '2026-11-07', '15:00'],           // m4: Bromley x Rotherham
      ['eu_brt', 'eu_eng5_rus', '2026-11-07', '15:00'],      // m5: Burton Albion x AFC Rushden & Diamonds
      ['eu_eng5_dov', 'eu_eng5_wea', '2026-11-07', '15:00'], // m6: Dover Athletic x Wealdstone
      ['eu_bnt', 'eu_tra', '2026-11-07', '15:00'],           // m7: Barnet x Tranmere Rovers
      ['eu_bra_eng', 'eu_eng5_mar', '2026-11-07', '15:00'],  // m8: Bradford City x Marine AFC
      ['eu_man', 'eu_eng5_mac', '2026-11-07', '15:00'],      // m9: Mansfield Town x Macclesfield FC
      ['eu_fle', 'eu_roc', '2026-11-07', '15:00'],           // m10: Fleetwood Town x Rochdale
      ['eu_pva', 'eu_eng5_scu', '2026-11-07', '15:00'],      // m11: Port Vale x Scunthorpe United
      ['eu_hud', 'eu_exe', '2026-11-07', '15:00'],           // m12: Huddersfield Town x Exeter City
      ['eu_yor', 'eu_nta', '2026-11-07', '15:00'],           // m13: York City x Northampton Town
      ['eu_eng5_bor', 'eu_wig', '2026-11-07', '15:00'],      // m14: Boreham Wood x Wigan Athletic
      ['eu_bar', 'eu_eng5_ald', '2026-11-07', '15:00'],      // m15: Barnsley x Aldershot Town
      ['eu_chl', 'eu_eng5_hal', '2026-11-07', '15:00'],      // m16: Cheltenham Town x Halifax Town
      ['eu_eng5_crl', 'eu_sal', '2026-11-07', '15:00'],      // m17: Carlisle United x Salford City
      ['eu_eng5_sby', 'eu_eng5_sho', '2026-11-07', '15:00'], // m18: Salisbury FC x Sholing
      ['eu_lut', 'eu_eng5_fgr', '2026-11-07', '15:00'],      // m19: Luton Town x Forest Green Rovers
      ['eu_col', 'eu_eng5_wor', '2026-11-07', '15:00'],      // m20: Colchester x Worcester City
      ['eu_eng5_eas', 'eu_shr', '2026-11-07', '15:00'],      // m21: Eastleigh x Shrewsbury Town
      ['eu_chs', 'eu_eng5_yeo', '2026-11-07', '15:00'],      // m22: Chesterfield x Yeovil Town
      ['eu_eng5_kid', 'eu_don', '2026-11-07', '15:00'],      // m23: Kidderminster x Doncaster Rovers
      ['eu_ley', 'eu_eng5_hbh', '2026-11-07', '15:00'],      // m24: Leyton Orient x Harborough Town
      ['eu_gil', 'eu_eng5_brw', '2026-11-07', '15:00'],      // m25: Gillingham x Barrow AFC
      ['eu_ply', 'eu_eng5_alv', '2026-11-07', '15:00'],      // m26: Plymouth Argyle x Alvechurch
      ['eu_acc', 'eu_wyc', '2026-11-07', '15:00'],           // m27: Accrington Stanley x Wycombe Wanderers
      ['eu_eng5_hrn', 'eu_bla', '2026-11-07', '15:00'],      // m28: Hornchurch x Blackpool
      ['eu_eng5_hgt', 'eu_eng5_fyl', '2026-11-07', '15:00'], // m29: Harrogate Town x AFC Fylde
      ['eu_eng5_gui', 'eu_eng5_sut', '2026-11-07', '15:00'], // m30: Guiseley AFC x Sutton United
      ['eu_mkd', 'eu_swi', '2026-11-07', '15:00'],           // m31: MK Dons x Swindon Town
      ['eu_cre', 'eu_wim', '2026-11-07', '15:00'],           // m32: Crewe Alexandra x AFC Wimbledon
      ['eu_eng5_alt', 'eu_not', '2026-11-07', '15:00'],      // m33: Altrincham x Notts County
      ['eu_pet', 'eu_rea', '2026-11-07', '15:00'],           // m34: Peterborough United x Reading
      // 08/11/2026 (4 jogos)
      ['eu_eng5_sta', 'eu_gri', '2026-11-08', '14:00'],      // m35: Stafford Rangers x Grimsby Town
      ['eu_eng5_crw', 'eu_sto', '2026-11-08', '14:00'],      // m36: Cray Wanderers x Stockport County
      ['eu_eng5_wmb', 'eu_cra', '2026-11-08', '14:00'],      // m37: Wimborne Town x Crawley Town
      ['eu_old', 'eu_shw', '2026-11-08', '14:00'],           // m38: Oldham Athletic x Sheffield Wed.
      // 09/11/2026 (1 jogo)
      ['eu_eng5_ppw', 'eu_eng5_ber', '2026-11-09', '19:45'], // m39: Plymouth Parkway x Berkhamsted FC
    ];

    r1Official.forEach(([homeId, awayId, date, time], i) => {
      fixtures.push({
        id: `fa_r1_m${i}`,
        round: 1,
        competition: 'eng_fa_cup',
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeScore: null,
        awayScore: null,
        played: false,
        date,
        time,
        stadiumName: getClubStadiumName(clubMap.get(homeId)),
        cupPhase: '1ª Rodada',
        groupName: '1ª Rodada · Jogo Único',
        leg: undefined,
      });
    });

    // 2ª Rodada (20 confrontos · 04/12 a 07/12/2026) — mapeamento exato dos vencedores da 1ª Rodada
    const r2Official: Array<[string, string, string, string]> = [
      // 04/12/2026 (2 jogos)
      ['TBD_FA_R1_W37', 'TBD_FA_R1_W8', '2026-12-04', '16:30'],  // Wimborne Town x Bradford City
      ['TBD_FA_R1_W27', 'TBD_FA_R1_W31', '2026-12-04', '16:45'], // Wycombe Wanderers x MK Dons
      // 05/12/2026 (13 jogos)
      ['TBD_FA_R1_W4', 'TBD_FA_R1_W0', '2026-12-05', '12:00'],   // Rotherham x Bristol Rovers
      ['TBD_FA_R1_W34', 'TBD_FA_R1_W36', '2026-12-05', '12:00'], // Reading x Stockport County
      ['TBD_FA_R1_W22', 'TBD_FA_R1_W16', '2026-12-05', '12:00'], // Chesterfield x Cheltenham Town
      ['TBD_FA_R1_W14', 'TBD_FA_R1_W15', '2026-12-05', '12:00'], // Wigan Athletic x Barnsley
      ['TBD_FA_R1_W12', 'TBD_FA_R1_W3', '2026-12-05', '12:00'],  // Exeter City x Stevenage
      ['TBD_FA_R1_W13', 'TBD_FA_R1_W17', '2026-12-05', '12:00'], // York City x Carlisle United
      ['TBD_FA_R1_W20', 'TBD_FA_R1_W9', '2026-12-05', '12:00'],  // Colchester x Mansfield Town
      ['TBD_FA_R1_W10', 'TBD_FA_R1_W2', '2026-12-05', '12:00'],  // Rochdale x Newport County
      ['TBD_FA_R1_W11', 'TBD_FA_R1_W24', '2026-12-05', '12:00'], // Port Vale x Leyton Orient
      ['TBD_FA_R1_W35', 'TBD_FA_R1_W38', '2026-12-05', '12:00'], // Grimsby Town x Oldham Athletic
      ['TBD_FA_R1_W21', 'TBD_FA_R1_W5', '2026-12-05', '12:00'],  // Shrewsbury Town x Burton Albion
      ['TBD_FA_R1_W6', 'TBD_FA_R1_W1', '2026-12-05', '14:15'],   // Dover Athletic x Leicester City
      ['TBD_FA_R1_W25', 'TBD_FA_R1_W23', '2026-12-05', '17:00'], // Barrow AFC x Kidderminster
      // 06/12/2026 (4 jogos)
      ['TBD_FA_R1_W18', 'TBD_FA_R1_W28', '2026-12-06', '09:15'], // Salisbury FC x Blackpool
      ['TBD_FA_R1_W29', 'TBD_FA_R1_W19', '2026-12-06', '11:30'], // AFC Fylde x Luton Town
      ['TBD_FA_R1_W32', 'TBD_FA_R1_W26', '2026-12-06', '12:15'], // Crewe Alexandra x Plymouth Argyle
      ['TBD_FA_R1_W39', 'TBD_FA_R1_W7', '2026-12-06', '14:30'],  // Plymouth Parkway x Barnet
      // 07/12/2026 (1 jogo)
      ['TBD_FA_R1_W30', 'TBD_FA_R1_W33', '2026-12-07', '16:30'], // Guiseley AFC x Notts County
    ];

    r2Official.forEach(([homeId, awayId, date, time], i) => {
      fixtures.push({
        id: `fa_r2_m${i}`,
        round: 2,
        competition: 'eng_fa_cup',
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeScore: null,
        awayScore: null,
        played: false,
        date,
        time,
        stadiumName: 'Estádio a definir',
        cupPhase: '2ª Rodada',
        groupName: '2ª Rodada · Jogo Único',
        leg: undefined,
      });
    });

    addRound3ToFinal(premierClubs, champClubs);
    return fixtures;
  }

  // === TEMPORADAS FUTURAS (2027+): MESMO REGULAMENTO OFICIAL (124 CLUBES · 123 JOGOS) ===
  const poolR1 = pseudoShuffle([...l1Clubs, ...l2Clubs, ...nonLeagueClubs.slice(0, 32)], seasonYear * 47);
  const r1Dates = [
    `${seasonYear}-11-06`,
    `${seasonYear}-11-07`,
    `${seasonYear}-11-08`,
    `${seasonYear}-11-09`,
  ];
  for (let i = 0; i < 40; i++) {
    const home = poolR1[i * 2];
    const away = poolR1[i * 2 + 1];
    const d = i < 2 ? r1Dates[0] : i < 35 ? r1Dates[1] : i < 39 ? r1Dates[2] : r1Dates[3];
    fixtures.push({
      id: `fa_r1_m${i}`,
      round: 1,
      competition: 'eng_fa_cup',
      homeTeamId: home?.id || `TBD_FA_R1_H${i}`,
      awayTeamId: away?.id || `TBD_FA_R1_A${i}`,
      homeScore: null,
      awayScore: null,
      played: false,
      date: d,
      time: d === r1Dates[0] || d === r1Dates[3] ? '19:45' : d === r1Dates[2] ? '14:00' : '15:00',
      stadiumName: getClubStadiumName(home),
      cupPhase: '1ª Rodada',
      groupName: '1ª Rodada · Jogo Único',
      leg: undefined,
    });
  }

  // 2ª Rodada: 40 vencedores R1 -> 20 confrontos em jogo único
  const r2Dates = [
    `${seasonYear}-12-04`,
    `${seasonYear}-12-05`,
    `${seasonYear}-12-06`,
    `${seasonYear}-12-07`,
  ];
  for (let i = 0; i < 20; i++) {
    const d = i < 2 ? r2Dates[0] : i < 15 ? r2Dates[1] : i < 19 ? r2Dates[2] : r2Dates[3];
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
      time: d === r2Dates[0] || d === r2Dates[3] ? '16:30' : '12:00',
      stadiumName: 'Estádio a definir',
      cupPhase: '2ª Rodada',
      groupName: '2ª Rodada · Jogo Único',
      leg: undefined,
    });
  }

  addRound3ToFinal(premierClubs, champClubs);
  return fixtures;
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
    const hasPrelimFormat = efl.some((f) => f.id === 'efl_prelim_m0');

    if (hasPrelimFormat) {
      // Resolução por tokens explícitos (TBD_EFL_PRELIM_W*, TBD_EFL_R1_W*, TBD_EFL_R2_W*, TBD_EFL_R3_W*, TBD_EFL_R4_W*, TBD_EFL_QF_W*, TBD_EFL_SF_W*)
      // Preserva fielmente a tabela real de 2026/27 e também funciona para temporadas futuras 2027+.
      const tokenWinners = new Map<string, string>();
      const applyResolvedTokens = (list: Fixture[]): Fixture[] => {
        if (tokenWinners.size === 0) return list;
        let changed = false;
        const next = list.map((f) => {
          const nextHome = tokenWinners.get(f.homeTeamId) ?? f.homeTeamId;
          const nextAway = tokenWinners.get(f.awayTeamId) ?? f.awayTeamId;
          if (nextHome === f.homeTeamId && nextAway === f.awayTeamId) return f;
          changed = true;
          let nextStadium = f.stadiumName;
          if (
            nextHome !== f.homeTeamId &&
            clubsMap.has(nextHome) &&
            f.id !== 'efl_final' &&
            (f.stadiumName || '').includes('definir')
          ) {
            nextStadium = getClubStadiumName(clubsMap.get(nextHome));
          }
          return {
            ...f,
            homeTeamId: nextHome,
            awayTeamId: nextAway,
            stadiumName: nextStadium,
          };
        });
        return changed ? next : list;
      };

      // Preliminar (2) -> R1
      for (let i = 0; i < 2; i++) {
        const w = resolveTieWinner(undefined, getFix(efl, `efl_prelim_m${i}`));
        if (w) tokenWinners.set(`TBD_EFL_PRELIM_W${i}`, w);
      }
      efl = applyResolvedTokens(efl);

      // R1 (35) -> R2
      for (let i = 0; i < 35; i++) {
        const w = resolveTieWinner(undefined, getFix(efl, `efl_r1_m${i}`));
        if (w) tokenWinners.set(`TBD_EFL_R1_W${i}`, w);
      }
      efl = applyResolvedTokens(efl);

      // R2 (23) -> R3
      for (let i = 0; i < 23; i++) {
        const w = resolveTieWinner(undefined, getFix(efl, `efl_r2_m${i}`));
        if (w) tokenWinners.set(`TBD_EFL_R2_W${i}`, w);
      }
      efl = applyResolvedTokens(efl);

      // R3 (16) -> R4 (Oitavas)
      for (let i = 0; i < 16; i++) {
        const w = resolveTieWinner(undefined, getFix(efl, `efl_r3_m${i}`));
        if (w) tokenWinners.set(`TBD_EFL_R3_W${i}`, w);
      }
      efl = applyResolvedTokens(efl);

      // R4 (8) -> Quartas
      for (let i = 0; i < 8; i++) {
        const w = resolveTieWinner(undefined, getFix(efl, `efl_r4_m${i}`));
        if (w) tokenWinners.set(`TBD_EFL_R4_W${i}`, w);
      }
      efl = applyResolvedTokens(efl);

      // Quartas (4) -> Semifinais (Ida e Volta)
      for (let i = 0; i < 4; i++) {
        const w = resolveTieWinner(undefined, getFix(efl, `efl_qf_m${i}`));
        if (w) tokenWinners.set(`TBD_EFL_QF_W${i}`, w);
      }
      efl = applyResolvedTokens(efl);

      // Semifinais (Ida e Volta) -> Grande Final em Wembley
      const sf0Winner = resolveTieWinner(
        getFix(efl, 'efl_sf_m0_ida'),
        getFix(efl, 'efl_sf_m0_volta')
      );
      const sf1Winner = resolveTieWinner(
        getFix(efl, 'efl_sf_m1_ida'),
        getFix(efl, 'efl_sf_m1_volta')
      );
      if (sf0Winner) tokenWinners.set('TBD_EFL_SF_W0', sf0Winner);
      if (sf1Winner) tokenWinners.set('TBD_EFL_SF_W1', sf1Winner);
      efl = applyResolvedTokens(efl);
    } else {
      // Compatibilidade com saves antigos sem Rodada Preliminar (25 jogos na R2 + 7 UEFA na R3)
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
  }

  // 2. EMIRATES FA CUP
  let fa = [...(params.fixturesEngFaCup || [])];
  if (fa.length > 0) {
    const has40R1Format = fa.some((f) => f.id === 'fa_r1_m39');

    if (has40R1Format) {
      // Resolução por tokens explícitos (TBD_FA_R1_W0..39, TBD_FA_R2_W0..19, TBD_FA_R3_W0..31,
      // TBD_FA_R4_W0..15, TBD_FA_R5_W0..7, TBD_FA_QF_W0..3, TBD_FA_SF_W0..1)
      const faTokens = new Map<string, string>();
      const wembleyIds = new Set(['fa_sf_m0', 'fa_sf_m1', 'fa_final']);

      const applyFaTokens = (list: Fixture[]): Fixture[] => {
        if (faTokens.size === 0) return list;
        let changed = false;
        const next = list.map((f) => {
          const nextHome = faTokens.get(f.homeTeamId) ?? f.homeTeamId;
          const nextAway = faTokens.get(f.awayTeamId) ?? f.awayTeamId;
          if (nextHome === f.homeTeamId && nextAway === f.awayTeamId) return f;
          changed = true;
          let nextStadium = f.stadiumName;
          if (
            nextHome !== f.homeTeamId &&
            clubsMap.has(nextHome) &&
            !wembleyIds.has(f.id) &&
            (f.stadiumName || '').includes('definir')
          ) {
            nextStadium = getClubStadiumName(clubsMap.get(nextHome));
          }
          return {
            ...f,
            homeTeamId: nextHome,
            awayTeamId: nextAway,
            stadiumName: nextStadium,
          };
        });
        return changed ? next : list;
      };

      // R1 (40) -> R2 (20)
      for (let i = 0; i < 40; i++) {
        const w = resolveTieWinner(undefined, getFix(fa, `fa_r1_m${i}`));
        if (w) faTokens.set(`TBD_FA_R1_W${i}`, w);
      }
      fa = applyFaTokens(fa);

      // R2 (20) -> R3 (32)
      for (let i = 0; i < 20; i++) {
        const w = resolveTieWinner(undefined, getFix(fa, `fa_r2_m${i}`));
        if (w) faTokens.set(`TBD_FA_R2_W${i}`, w);
      }
      fa = applyFaTokens(fa);

      // R3 (32) -> R4 (16)
      for (let i = 0; i < 32; i++) {
        const w = resolveTieWinner(undefined, getFix(fa, `fa_r3_m${i}`));
        if (w) faTokens.set(`TBD_FA_R3_W${i}`, w);
      }
      fa = applyFaTokens(fa);

      // R4 (16) -> R5 / Oitavas (8)
      for (let i = 0; i < 16; i++) {
        const w = resolveTieWinner(undefined, getFix(fa, `fa_r4_m${i}`));
        if (w) faTokens.set(`TBD_FA_R4_W${i}`, w);
      }
      fa = applyFaTokens(fa);

      // R5 / Oitavas (8) -> Quartas (4)
      for (let i = 0; i < 8; i++) {
        const w = resolveTieWinner(undefined, getFix(fa, `fa_r5_m${i}`));
        if (w) faTokens.set(`TBD_FA_R5_W${i}`, w);
      }
      fa = applyFaTokens(fa);

      // Quartas (4) -> Semifinais em Wembley (2)
      for (let i = 0; i < 4; i++) {
        const w = resolveTieWinner(undefined, getFix(fa, `fa_qf_m${i}`));
        if (w) faTokens.set(`TBD_FA_QF_W${i}`, w);
      }
      fa = applyFaTokens(fa);

      // Semifinais em Wembley (2) -> Grande Final em Wembley (1)
      for (let i = 0; i < 2; i++) {
        const w = resolveTieWinner(undefined, getFix(fa, `fa_sf_m${i}`));
        if (w) faTokens.set(`TBD_FA_SF_W${i}`, w);
      }
      fa = applyFaTokens(fa);
    } else {
      // Compatibilidade com saves antigos (24 jogos na R1 + 12 jogos na R2)
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

      for (let i = 0; i < 12; i++) {
        const w = resolveTieWinner(undefined, getFix(fa, `fa_r2_m${i}`));
        if (w) {
          fa = assignSingleLegSlots(fa, `fa_r3_m${i}`, undefined, w);
        }
      }

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

      for (let i = 0; i < 2; i++) {
        const w0 = resolveTieWinner(undefined, getFix(fa, `fa_qf_m${i * 2}`));
        const w1 = resolveTieWinner(undefined, getFix(fa, `fa_qf_m${i * 2 + 1}`));
        if (w0 || w1) {
          fa = assignSingleLegSlots(fa, `fa_sf_m${i}`, w0, w1);
        }
      }

      const sf0Winner = resolveTieWinner(undefined, getFix(fa, 'fa_sf_m0'));
      const sf1Winner = resolveTieWinner(undefined, getFix(fa, 'fa_sf_m1'));
      if (sf0Winner || sf1Winner) {
        fa = assignSingleLegSlots(fa, 'fa_final', sf0Winner, sf1Winner);
      }
    }
  }

  return {
    fixturesEngCommunityShield: params.fixturesEngCommunityShield,
    fixturesEngEflCup: efl,
    fixturesEngFaCup: fa,
  };
}

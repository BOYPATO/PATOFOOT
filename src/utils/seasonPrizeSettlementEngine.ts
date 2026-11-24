import {
  Club,
  EuropeanLeagueId,
  Fixture,
  GameSave,
  InboxMessage,
  SeasonPrizeLineItem,
  SeasonPrizeSettlementSummary,
  SouthAmericanLeagueId,
  Standing,
  WorldLeagueId,
} from '../types/game';
import { getEstadualConfigByName } from '../data/estaduais2026Config';
import { formatEuropeanSeason } from './calendarUtils';
import { EUROPEAN_LEAGUE_IDS, EUROPEAN_LEAGUES_META } from './europeLeaguesEngine';
import {
  SOUTH_AMERICAN_LEAGUE_IDS,
  SOUTH_AMERICAN_LEAGUES_META,
} from './southAmericaLeaguesEngine';
import {
  JAN_DEC_WORLD_LEAGUE_IDS,
  SPLIT_YEAR_WORLD_LEAGUE_IDS,
  WORLD_LEAGUES_META,
} from './worldLeaguesEngine';
import { resolveMlsCupChampionId } from './usaMlsEngine';
import { recordFinanceLedgerMutation } from './financialFairPlayEngine';
import { CUP_PRIZES_CATALOG, formatMoney } from './prizeEngine';

export interface LeaguePrizeRow {
  position: number;
  participation: number;
  positionBonus: number;
  total: number;
  zoneNote?: string;
}

export interface LeaguePrizeTablePreview {
  leagueId: string;
  leagueName: string;
  country: string;
  participationQuota: number;
  championTotal: number;
  runnerUpTotal: number;
  lastPlaceTotal: number;
  rows: LeaguePrizeRow[];
}

function roundPrize(val: number): number {
  if (val <= 0) return 0;
  if (val < 50_000) return Math.round(val / 5_000) * 5_000;
  if (val < 500_000) return Math.round(val / 10_000) * 10_000;
  if (val < 5_000_000) return Math.round(val / 50_000) * 50_000;
  return Math.round(val / 100_000) * 100_000;
}

function sortStandings(table: Standing[]): Standing[] {
  return [...table].sort(
    (a, b) =>
      b.points - a.points ||
      b.won - a.won ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
  );
}

/**
 * Curva realista de premiação por posição (1º ao último) + cota fixa de participação,
 * espelhando o modelo real de Equal Share (participação) + Merit Payment (posição).
 */
export function buildRealisticLeaguePrizeSchedule(params: {
  totalTeams: number;
  championMerit: number;
  runnerUpMerit: number;
  participationQuota: number;
  minLastPlaceMerit?: number;
}): LeaguePrizeRow[] {
  const totalTeams = Math.max(2, params.totalTeams);
  const participation = roundPrize(params.participationQuota);
  const minMerit = roundPrize(
    params.minLastPlaceMerit ?? Math.max(50_000, params.championMerit * 0.04)
  );
  const rows: LeaguePrizeRow[] = [];

  for (let pos = 1; pos <= totalTeams; pos++) {
    let positionBonus = minMerit;
    if (pos === 1) {
      positionBonus = roundPrize(params.championMerit);
    } else if (pos === 2) {
      positionBonus = roundPrize(params.runnerUpMerit);
    } else {
      // Smooth convex decay from 2nd place down to last place
      const t = (pos - 2) / Math.max(1, totalTeams - 2);
      const decay = Math.pow(1 - t, 1.55);
      positionBonus = roundPrize(
        minMerit + (params.runnerUpMerit - minMerit) * decay * 0.88
      );
    }
    rows.push({
      position: pos,
      participation,
      positionBonus,
      total: participation + positionBonus,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// TABELAS REAIS DO BRASILEIRÃO (SÉRIES A, B, C, D)
// ---------------------------------------------------------------------------
export const BR_SERIE_A_PARTICIPATION = 10_000_000;
export const BR_SERIE_A_POSITION_MERIT: Record<number, number> = {
  1: 50_000_000,
  2: 45_000_000,
  3: 42_000_000,
  4: 38_000_000,
  5: 35_000_000,
  6: 33_000_000,
  7: 30_000_000,
  8: 28_000_000,
  9: 26_000_000,
  10: 24_000_000,
  11: 22_000_000,
  12: 20_000_000,
  13: 16_000_000,
  14: 15_000_000,
  15: 14_000_000,
  16: 12_000_000,
  17: 6_500_000,
  18: 5_500_000,
  19: 4_500_000,
  20: 3_500_000,
};

export const BR_SERIE_B_PARTICIPATION = 3_200_000;
export const BR_SERIE_B_POSITION_MERIT: Record<number, number> = {
  1: 12_000_000,
  2: 8_000_000,
  3: 7_000_000,
  4: 6_000_000,
  5: 3_800_000,
  6: 3_300_000,
  7: 2_900_000,
  8: 2_500_000,
  9: 2_200_000,
  10: 1_900_000,
  11: 1_700_000,
  12: 1_500_000,
  13: 1_300_000,
  14: 1_200_000,
  15: 1_100_000,
  16: 1_000_000,
  17: 700_000,
  18: 600_000,
  19: 500_000,
  20: 400_000,
};

export const BR_SERIE_C_PARTICIPATION = 1_200_000;
export const BR_SERIE_C_POSITION_MERIT: Record<number, number> = {
  1: 4_500_000,
  2: 2_800_000,
  3: 2_200_000,
  4: 1_900_000,
  5: 1_200_000,
  6: 1_050_000,
  7: 900_000,
  8: 800_000,
  9: 650_000,
  10: 600_000,
  11: 550_000,
  12: 500_000,
  13: 450_000,
  14: 420_000,
  15: 390_000,
  16: 360_000,
  17: 300_000,
  18: 280_000,
  19: 260_000,
  20: 240_000,
};

export const BR_SERIE_D_PARTICIPATION = 450_000;

export function getEuropeanLeaguePrizeSchedule(leagueId: EuropeanLeagueId): LeaguePrizeRow[] {
  const meta = EUROPEAN_LEAGUES_META[leagueId];
  const participationQuota = roundPrize(meta.championPrize * 0.24);
  return buildRealisticLeaguePrizeSchedule({
    totalTeams: meta.clubsCount,
    championMerit: meta.championPrize,
    runnerUpMerit: meta.runnerUpPrize,
    participationQuota,
    minLastPlaceMerit: roundPrize(meta.championPrize * 0.055),
  });
}

export function getSouthAmericanLeaguePrizeSchedule(
  leagueId: SouthAmericanLeagueId
): LeaguePrizeRow[] {
  const meta = SOUTH_AMERICAN_LEAGUES_META[leagueId];
  const participationQuota = roundPrize(meta.championPrize * 0.2);
  return buildRealisticLeaguePrizeSchedule({
    totalTeams: meta.clubsCount,
    championMerit: meta.championPrize,
    runnerUpMerit: meta.runnerUpPrize,
    participationQuota,
    minLastPlaceMerit: roundPrize(meta.championPrize * 0.05),
  });
}

export function getWorldLeaguePrizeSchedule(leagueId: WorldLeagueId): LeaguePrizeRow[] {
  const meta = WORLD_LEAGUES_META[leagueId];
  const participationQuota = roundPrize(meta.championPrize * 0.22);
  return buildRealisticLeaguePrizeSchedule({
    totalTeams: meta.clubsCount,
    championMerit: meta.championPrize,
    runnerUpMerit: meta.runnerUpPrize,
    participationQuota,
    minLastPlaceMerit: roundPrize(meta.championPrize * 0.05),
  });
}

export function getClubLeaguePrizePreview(club: Club): LeaguePrizeTablePreview {
  if (club.division === 'EU' && club.europeanLeagueId) {
    const meta = EUROPEAN_LEAGUES_META[club.europeanLeagueId];
    const rows = getEuropeanLeaguePrizeSchedule(club.europeanLeagueId);
    return {
      leagueId: meta.id,
      leagueName: meta.name,
      country: meta.country,
      participationQuota: rows[0]?.participation || 0,
      championTotal: rows[0]?.total || 0,
      runnerUpTotal: rows[1]?.total || 0,
      lastPlaceTotal: rows[rows.length - 1]?.total || 0,
      rows,
    };
  }
  if (club.division === 'SA' && club.southAmericanLeagueId) {
    const meta = SOUTH_AMERICAN_LEAGUES_META[club.southAmericanLeagueId];
    const rows = getSouthAmericanLeaguePrizeSchedule(club.southAmericanLeagueId);
    return {
      leagueId: meta.id,
      leagueName: meta.name,
      country: meta.country,
      participationQuota: rows[0]?.participation || 0,
      championTotal: rows[0]?.total || 0,
      runnerUpTotal: rows[1]?.total || 0,
      lastPlaceTotal: rows[rows.length - 1]?.total || 0,
      rows,
    };
  }
  if (club.division === 'WL' && club.worldLeagueId) {
    const meta = WORLD_LEAGUES_META[club.worldLeagueId];
    const rows = getWorldLeaguePrizeSchedule(club.worldLeagueId);
    return {
      leagueId: meta.id,
      leagueName: meta.name,
      country: meta.country,
      participationQuota: rows[0]?.participation || 0,
      championTotal: rows[0]?.total || 0,
      runnerUpTotal: rows[1]?.total || 0,
      lastPlaceTotal: rows[rows.length - 1]?.total || 0,
      rows,
    };
  }
  if (club.division === 'B') {
    const rows: LeaguePrizeRow[] = Array.from({ length: 20 }, (_, i) => {
      const pos = i + 1;
      const merit = BR_SERIE_B_POSITION_MERIT[pos] || 400_000;
      return {
        position: pos,
        participation: BR_SERIE_B_PARTICIPATION,
        positionBonus: merit,
        total: BR_SERIE_B_PARTICIPATION + merit,
      };
    });
    return {
      leagueId: 'serie_b',
      leagueName: 'Brasileirão Série B',
      country: 'Brasil',
      participationQuota: BR_SERIE_B_PARTICIPATION,
      championTotal: rows[0].total,
      runnerUpTotal: rows[1].total,
      lastPlaceTotal: rows[19].total,
      rows,
    };
  }
  if (club.division === 'C') {
    const rows: LeaguePrizeRow[] = Array.from({ length: 20 }, (_, i) => {
      const pos = i + 1;
      const merit = BR_SERIE_C_POSITION_MERIT[pos] || 240_000;
      return {
        position: pos,
        participation: BR_SERIE_C_PARTICIPATION,
        positionBonus: merit,
        total: BR_SERIE_C_PARTICIPATION + merit,
      };
    });
    return {
      leagueId: 'serie_c',
      leagueName: 'Brasileirão Série C',
      country: 'Brasil',
      participationQuota: BR_SERIE_C_PARTICIPATION,
      championTotal: rows[0].total,
      runnerUpTotal: rows[1].total,
      lastPlaceTotal: rows[19].total,
      rows,
    };
  }
  if (club.division === 'D' || club.division === 'EST') {
    const rows: LeaguePrizeRow[] = [
      { position: 1, participation: BR_SERIE_D_PARTICIPATION, positionBonus: 3_200_000, total: 3_650_000 },
      { position: 2, participation: BR_SERIE_D_PARTICIPATION, positionBonus: 1_800_000, total: 2_250_000 },
      { position: 3, participation: BR_SERIE_D_PARTICIPATION, positionBonus: 1_200_000, total: 1_650_000 },
      { position: 4, participation: BR_SERIE_D_PARTICIPATION, positionBonus: 1_200_000, total: 1_650_000 },
      { position: 8, participation: BR_SERIE_D_PARTICIPATION, positionBonus: 650_000, total: 1_100_000 },
      { position: 16, participation: BR_SERIE_D_PARTICIPATION, positionBonus: 350_000, total: 800_000 },
      { position: 32, participation: BR_SERIE_D_PARTICIPATION, positionBonus: 180_000, total: 630_000 },
      { position: 64, participation: BR_SERIE_D_PARTICIPATION, positionBonus: 80_000, total: 530_000 },
    ];
    return {
      leagueId: 'serie_d',
      leagueName: 'Brasileirão Série D & Estaduais',
      country: 'Brasil',
      participationQuota: BR_SERIE_D_PARTICIPATION,
      championTotal: rows[0].total,
      runnerUpTotal: rows[1].total,
      lastPlaceTotal: rows[rows.length - 1].total,
      rows,
    };
  }

  // Default: Série A
  const rows: LeaguePrizeRow[] = Array.from({ length: 20 }, (_, i) => {
    const pos = i + 1;
    const merit = BR_SERIE_A_POSITION_MERIT[pos] || 3_500_000;
    return {
      position: pos,
      participation: BR_SERIE_A_PARTICIPATION,
      positionBonus: merit,
      total: BR_SERIE_A_PARTICIPATION + merit,
    };
  });
  return {
    leagueId: 'serie_a',
    leagueName: 'Brasileirão Série A',
    country: 'Brasil',
    participationQuota: BR_SERIE_A_PARTICIPATION,
    championTotal: rows[0].total,
    runnerUpTotal: rows[1].total,
    lastPlaceTotal: rows[19].total,
    rows,
  };
}

// ---------------------------------------------------------------------------
// LIQUIDAÇÃO UNIFICADA DE PREMIAÇÕES DE FIM DE TEMPORADA (TODAS AS LIGAS + COPAS)
// ---------------------------------------------------------------------------
function addClubPrizeLine(
  bucket: Map<string, SeasonPrizeLineItem[]>,
  clubId: string,
  item: SeasonPrizeLineItem
) {
  if (item.totalAmount <= 0) return;
  const list = bucket.get(clubId) || [];
  list.push(item);
  bucket.set(clubId, list);
}

function collectParticipantsAndWins(
  fixtures: Fixture[] | undefined,
  groupPhaseOnly: boolean
): Map<string, { matches: number; wins: number; draws: number }> {
  const map = new Map<string, { matches: number; wins: number; draws: number }>();
  if (!fixtures || fixtures.length === 0) return map;

  for (const f of fixtures) {
    if (groupPhaseOnly) {
      const phase = (f.cupPhase || '').toLowerCase();
      const isKnockout =
        phase.includes('oitava') ||
        phase.includes('quarta') ||
        phase.includes('semi') ||
        phase.includes('final') ||
        phase.includes('playoff') ||
        phase.includes('decisão') ||
        phase.includes('mata-mata');
      if (isKnockout) continue;
    }

    const ensure = (id: string) => {
      let cur = map.get(id);
      if (!cur) {
        cur = { matches: 0, wins: 0, draws: 0 };
        map.set(id, cur);
      }
      return cur;
    };

    const h = ensure(f.homeTeamId);
    const a = ensure(f.awayTeamId);
    if (f.played && f.homeScore !== null && f.awayScore !== null) {
      h.matches += 1;
      a.matches += 1;
      if (f.homeScore > f.awayScore) h.wins += 1;
      else if (f.awayScore > f.homeScore) a.wins += 1;
      else {
        h.draws += 1;
        a.draws += 1;
      }
    }
  }
  return map;
}

function settleUefaLeaguePhaseCup(params: {
  bucket: Map<string, SeasonPrizeLineItem[]>;
  competitionId: string;
  competitionName: string;
  standings?: Standing[];
  fixtures?: Fixture[];
  participationFee: number;
  topRankBonus: number;
  bottomRankBonus: number;
  winMeritBonus: number;
  drawMeritBonus: number;
}) {
  const {
    bucket,
    competitionId,
    competitionName,
    standings,
    fixtures,
    participationFee,
    topRankBonus,
    bottomRankBonus,
    winMeritBonus,
    drawMeritBonus,
  } = params;

  const sorted = standings && standings.length > 0 ? sortStandings(standings) : [];
  const statsByClub = collectParticipantsAndWins(fixtures, true);

  if (sorted.length > 0) {
    const total = sorted.length;
    sorted.forEach((row, idx) => {
      const pos = idx + 1;
      const t = (pos - 1) / Math.max(1, total - 1);
      const rankBonus = roundPrize(
        bottomRankBonus + (topRankBonus - bottomRankBonus) * Math.pow(1 - t, 1.35)
      );
      const merit = roundPrize(row.won * winMeritBonus + row.drawn * drawMeritBonus);
      const positionBonusAmount = rankBonus + merit;
      addClubPrizeLine(bucket, row.teamId, {
        competitionId,
        competitionName,
        category: 'CONTINENTAL_CUP',
        positionOrStageLabel: `${pos}º na Fase de Liga (${row.won}V ${row.drawn}E)`,
        participationAmount: participationFee,
        positionBonusAmount,
        totalAmount: participationFee + positionBonusAmount,
      });
    });
  } else {
    statsByClub.forEach((st, clubId) => {
      const positionBonusAmount = roundPrize(
        st.wins * winMeritBonus + st.draws * drawMeritBonus
      );
      addClubPrizeLine(bucket, clubId, {
        competitionId,
        competitionName,
        category: 'CONTINENTAL_CUP',
        positionOrStageLabel: `Participação (${st.wins}V ${st.draws}E)`,
        participationAmount: participationFee,
        positionBonusAmount,
        totalAmount: participationFee + positionBonusAmount,
      });
    });
  }
}

function settleGroupStageCup(params: {
  bucket: Map<string, SeasonPrizeLineItem[]>;
  competitionId: string;
  competitionName: string;
  category: SeasonPrizeLineItem['category'];
  fixtures?: Fixture[];
  participationFee: number;
  winMeritBonus: number;
  drawMeritBonus?: number;
}) {
  const {
    bucket,
    competitionId,
    competitionName,
    category,
    fixtures,
    participationFee,
    winMeritBonus,
    drawMeritBonus = 0,
  } = params;
  if (!fixtures || fixtures.length === 0) return;

  const allStats = collectParticipantsAndWins(fixtures, false);
  const groupStats = collectParticipantsAndWins(fixtures, true);

  allStats.forEach((allSt, clubId) => {
    const grp = groupStats.get(clubId) || { matches: 0, wins: 0, draws: 0 };
    const winsForBonus = grp.matches > 0 ? grp.wins : Math.min(allSt.wins, 3);
    const drawsForBonus = grp.matches > 0 ? grp.draws : 0;
    const positionBonusAmount = roundPrize(
      winsForBonus * winMeritBonus + drawsForBonus * drawMeritBonus
    );
    addClubPrizeLine(bucket, clubId, {
      competitionId,
      competitionName,
      category,
      positionOrStageLabel:
        winsForBonus > 0
          ? `Participação + Mérito (${winsForBonus}V na fase inicial)`
          : 'Cota Oficial de Participação',
      participationAmount: participationFee,
      positionBonusAmount,
      totalAmount: participationFee + positionBonusAmount,
    });
  });
}

function settleDomesticCupParticipation(params: {
  bucket: Map<string, SeasonPrizeLineItem[]>;
  competitionId: string;
  competitionName: string;
  fixtures?: Fixture[];
  baseParticipationFee: number;
  perWinBonus: number;
}) {
  const {
    bucket,
    competitionId,
    competitionName,
    fixtures,
    baseParticipationFee,
    perWinBonus,
  } = params;
  if (!fixtures || fixtures.length === 0) return;

  const stats = collectParticipantsAndWins(fixtures, false);
  stats.forEach((st, clubId) => {
    const positionBonusAmount = roundPrize(st.wins * perWinBonus);
    addClubPrizeLine(bucket, clubId, {
      competitionId,
      competitionName,
      category: 'DOMESTIC_CUP',
      positionOrStageLabel:
        st.wins > 0
          ? `Participação + Campanha (${st.wins} vitória${st.wins > 1 ? 's' : ''})`
          : 'Cota Oficial de Participação',
      participationAmount: baseParticipationFee,
      positionBonusAmount,
      totalAmount: baseParticipationFee + positionBonusAmount,
    });
  });
}

function getCupReferenceTitlePrize(compId: string, fallback: number): number {
  const finals = CUP_PRIZES_CATALOG.filter(
    (c) => c.competition === compId && c.phaseMatchString.includes('final')
  );
  if (finals.length > 0) return finals[finals.length - 1].winnerPrize;
  const anyEntry = CUP_PRIZES_CATALOG.find((c) => c.competition === compId);
  return anyEntry ? anyEntry.winnerPrize : fallback;
}

const DOMESTIC_CUP_DISPLAY_NAMES: Record<string, string> = {
  eng_fa_cup: 'Emirates FA Cup',
  eng_efl_cup: 'Carabao Cup (EFL Cup)',
  esp_copa_del_rey: 'Copa del Rey',
  ita_coppa_italia: 'Coppa Italia',
  ger_dfb_pokal: 'DFB-Pokal',
  fra_coupe_de_france: 'Coupe de France',
  por_taca_portugal: 'Taça de Portugal',
  ned_knvb_beker: 'KNVB Beker',
  bel_croky_cup: 'Croky Cup',
  tur_turkiye_kupasi: 'Türkiye Kupası',
  gre_kypello_elladas: 'Copa da Grécia',
  nor_nm_cup: 'NM Cupen',
  den_dbu_pokalen: 'DBU Pokalen',
  sui_schweizer_cup: 'Schweizer Cup',
  swe_svenska_cupen: 'Svenska Cupen',
  sco_scottish_cup: 'Scottish Cup',
  eu_sp1_cup: 'Taça Especial Europa 1',
  eu_sp2_cup: 'Taça Especial Europa 2',
  sa_copa_argentina: 'Copa Argentina',
  sa_copa_colombia: 'Copa BetPlay Colômbia',
  sa_copa_uruguay: 'Copa Uruguay',
  sa_copa_ecuador: 'Copa Ecuador',
  sa_copa_chile: 'Copa Chile',
  sa_copa_paraguay: 'Copa Paraguay',
  sa_copa_peru: 'Copa Bicentenario Peru',
  sa_copa_bolivia: 'Copa da Bolívia',
  sa_copa_venezuela: 'Copa Venezuela',
  wl_cup_usa: 'U.S. Open Cup',
  wl_cup_mex: 'Copa MX',
  wl_cup_can: 'Campeonato Canadense',
  wl_cup_sau: 'Copa do Rei Saudita',
  wl_cup_jpn: 'Copa do Imperador',
  wl_cup_rus: 'Copa da Rússia',
  wl_cup_egy: 'Copa do Egito',
  wl_cup_mar: 'Coupe du Trône',
};

/**
 * Liquida TODAS as premiações de fim de temporada (posição final em todas as ligas +
 * cotas de participação e mérito em todas as copas) para TODOS os clubes do hemisfério,
 * creditando o valor imediatamente no saldo em caixa (que passa integralmente para o
 * orçamento da próxima temporada). Idempotente por chave `${hemisphere}_${seasonYear}`.
 */
export function settleAllSeasonEndPrizes(
  state: GameSave,
  hemisphere: 'EU' | 'SA_BR',
  settlementDate: string
): {
  updatedState: GameSave;
  alreadySettled: boolean;
  userReport: SeasonPrizeSettlementSummary | null;
} {
  const activeYear =
    hemisphere === 'EU'
      ? state.europeSeasonYear ?? state.currentSeasonYear
      : state.saSeasonYear ?? state.currentSeasonYear;
  const seasonLabel =
    hemisphere === 'EU' ? formatEuropeanSeason(activeYear) : String(activeYear);
  const key = `${hemisphere}_${activeYear}`;

  const existingKeys = state.settledPrizeSeasonKeys || [];
  if (existingKeys.includes(key)) {
    const userClub = state.clubs.find((c) => c.id === state.userClubId);
    return {
      updatedState: state,
      alreadySettled: true,
      userReport: userClub?.finances.lastSeasonPrizeReport || null,
    };
  }

  const prizeBucket = new Map<string, SeasonPrizeLineItem[]>();
  const clubMap = new Map(state.clubs.map((c) => [c.id, c]));

  // =========================================================================
  // HEMISFÉRIO EUROPA + ÁSIA/RÚSSIA (Split-Year: Ago–Mai)
  // =========================================================================
  if (hemisphere === 'EU') {
    // 1. Todas as 20 Ligas Europeias (1º ao último lugar: Participação + Posição)
    for (const leagueId of EUROPEAN_LEAGUE_IDS) {
      const table = state.standingsEurope?.[leagueId];
      if (!table || table.length === 0) continue;
      const meta = EUROPEAN_LEAGUES_META[leagueId];
      const sorted = sortStandings(table);
      const schedule = getEuropeanLeaguePrizeSchedule(leagueId);

      sorted.forEach((st, idx) => {
        const pos = idx + 1;
        const row = schedule[Math.min(idx, schedule.length - 1)];
        addClubPrizeLine(prizeBucket, st.teamId, {
          competitionId: leagueId,
          competitionName: meta.name,
          category: 'LEAGUE',
          positionOrStageLabel: `${pos}º lugar (${st.points} pts)`,
          participationAmount: row.participation,
          positionBonusAmount: row.positionBonus,
          totalAmount: row.total,
        });
      });
    }

    // 2. Ligas Mundiais Split-Year (Arábia Saudita, Japão, Rússia — 1º ao último)
    for (const leagueId of SPLIT_YEAR_WORLD_LEAGUE_IDS) {
      const table = state.standingsWorldLeagues?.[leagueId];
      if (!table || table.length === 0) continue;
      const meta = WORLD_LEAGUES_META[leagueId];
      const sorted = sortStandings(table);
      const schedule = getWorldLeaguePrizeSchedule(leagueId);

      sorted.forEach((st, idx) => {
        const pos = idx + 1;
        const row = schedule[Math.min(idx, schedule.length - 1)];
        addClubPrizeLine(prizeBucket, st.teamId, {
          competitionId: leagueId,
          competitionName: meta.name,
          category: 'LEAGUE',
          positionOrStageLabel: `${pos}º lugar (${st.points} pts)`,
          participationAmount: row.participation,
          positionBonusAmount: row.positionBonus,
          totalAmount: row.total,
        });
      });
    }

    // 3. Copas Continentais UEFA (Participação Fase de Liga + Ranking 1º–36º + Mérito Vitórias/Empates)
    settleUefaLeaguePhaseCup({
      bucket: prizeBucket,
      competitionId: 'champions_league',
      competitionName: 'UEFA Champions League',
      standings: state.standingsChampionsLeague,
      fixtures: state.fixturesChampionsLeague,
      participationFee: 95_000_000,
      topRankBonus: 55_000_000,
      bottomRankBonus: 3_500_000,
      winMeritBonus: 11_000_000,
      drawMeritBonus: 3_800_000,
    });

    settleUefaLeaguePhaseCup({
      bucket: prizeBucket,
      competitionId: 'europa_league',
      competitionName: 'UEFA Europa League',
      standings: state.standingsEuropaLeague,
      fixtures: state.fixturesEuropaLeague,
      participationFee: 26_000_000,
      topRankBonus: 16_000_000,
      bottomRankBonus: 1_200_000,
      winMeritBonus: 2_800_000,
      drawMeritBonus: 950_000,
    });

    settleUefaLeaguePhaseCup({
      bucket: prizeBucket,
      competitionId: 'conference_league',
      competitionName: 'UEFA Conference League',
      standings: state.standingsConferenceLeague,
      fixtures: state.fixturesConferenceLeague,
      participationFee: 18_000_000,
      topRankBonus: 10_000_000,
      bottomRankBonus: 800_000,
      winMeritBonus: 2_200_000,
      drawMeritBonus: 750_000,
    });

    // 4. AFC Champions League Elite (Ásia)
    settleUefaLeaguePhaseCup({
      bucket: prizeBucket,
      competitionId: 'afc_champions',
      competitionName: 'AFC Champions League Elite',
      standings: state.standingsAfcChampions,
      fixtures: state.fixturesAfcChampions,
      participationFee: 9_000_000,
      topRankBonus: 11_000_000,
      bottomRankBonus: 1_200_000,
      winMeritBonus: 1_400_000,
      drawMeritBonus: 500_000,
    });

    // 5. Copas Nacionais Inglesas & Europeias (Participação + Campanha)
    settleDomesticCupParticipation({
      bucket: prizeBucket,
      competitionId: 'eng_fa_cup',
      competitionName: 'Emirates FA Cup',
      fixtures: state.fixturesEngFaCup,
      baseParticipationFee: 3_200_000,
      perWinBonus: 1_400_000,
    });
    settleDomesticCupParticipation({
      bucket: prizeBucket,
      competitionId: 'eng_efl_cup',
      competitionName: 'Carabao Cup (EFL Cup)',
      fixtures: state.fixturesEngEflCup,
      baseParticipationFee: 1_800_000,
      perWinBonus: 750_000,
    });

    if (state.fixturesEuropeanCups) {
      for (const [cupId, fixList] of Object.entries(state.fixturesEuropeanCups)) {
        if (!fixList || fixList.length === 0) continue;
        if (cupId.includes('super')) continue; // Supercopas já pagam campeão e vice na final
        const titleRef = getCupReferenceTitlePrize(cupId, 24_000_000);
        settleDomesticCupParticipation({
          bucket: prizeBucket,
          competitionId: cupId,
          competitionName: DOMESTIC_CUP_DISPLAY_NAMES[cupId] || cupId,
          fixtures: fixList,
          baseParticipationFee: roundPrize(titleRef * 0.085),
          perWinBonus: roundPrize(titleRef * 0.03),
        });
      }
    }

    // Copas nacionais dos países split-year (Arábia, Japão, Rússia)
    for (const cupId of ['wl_cup_sau', 'wl_cup_jpn', 'wl_cup_rus'] as const) {
      const fixList = state.fixturesWorldCups?.[cupId];
      if (!fixList || fixList.length === 0) continue;
      const titleRef = getCupReferenceTitlePrize(cupId, 16_000_000);
      settleDomesticCupParticipation({
        bucket: prizeBucket,
        competitionId: cupId,
        competitionName: DOMESTIC_CUP_DISPLAY_NAMES[cupId] || cupId,
        fixtures: fixList,
        baseParticipationFee: roundPrize(titleRef * 0.09),
        perWinBonus: roundPrize(titleRef * 0.035),
      });
    }
  }

  // =========================================================================
  // HEMISFÉRIO BRASIL + AMÉRICA DO SUL + AMÉRICA DO NORTE / ÁFRICA (Jan–Dez)
  // =========================================================================
  if (hemisphere === 'SA_BR') {
    // 1. Brasileirão Série A (1º ao 20º: Participação R$ 10M + Posição)
    if (state.standingsA && state.standingsA.length > 0) {
      sortStandings(state.standingsA).forEach((st, idx) => {
        const pos = idx + 1;
        const positionBonus = BR_SERIE_A_POSITION_MERIT[pos] ?? 3_500_000;
        addClubPrizeLine(prizeBucket, st.teamId, {
          competitionId: 'serie_a',
          competitionName: 'Brasileirão Série A',
          category: 'LEAGUE',
          positionOrStageLabel: `${pos}º lugar (${st.points} pts)`,
          participationAmount: BR_SERIE_A_PARTICIPATION,
          positionBonusAmount: positionBonus,
          totalAmount: BR_SERIE_A_PARTICIPATION + positionBonus,
        });
      });
    }

    // 2. Brasileirão Série B (1º ao 20º: Participação R$ 3,2M + Posição)
    if (state.standingsB && state.standingsB.length > 0) {
      sortStandings(state.standingsB).forEach((st, idx) => {
        const pos = idx + 1;
        const positionBonus = BR_SERIE_B_POSITION_MERIT[pos] ?? 400_000;
        addClubPrizeLine(prizeBucket, st.teamId, {
          competitionId: 'serie_b',
          competitionName: 'Brasileirão Série B',
          category: 'LEAGUE',
          positionOrStageLabel: `${pos}º lugar (${st.points} pts)`,
          participationAmount: BR_SERIE_B_PARTICIPATION,
          positionBonusAmount: positionBonus,
          totalAmount: BR_SERIE_B_PARTICIPATION + positionBonus,
        });
      });
    }

    // 3. Brasileirão Série C (1º ao 20º: Participação R$ 1,2M + Posição)
    if (state.standingsC && state.standingsC.length > 0) {
      sortStandings(state.standingsC).forEach((st, idx) => {
        const pos = idx + 1;
        const positionBonus = BR_SERIE_C_POSITION_MERIT[pos] ?? 240_000;
        addClubPrizeLine(prizeBucket, st.teamId, {
          competitionId: 'serie_c',
          competitionName: 'Brasileirão Série C',
          category: 'LEAGUE',
          positionOrStageLabel: `${pos}º lugar (${st.points} pts)`,
          participationAmount: BR_SERIE_C_PARTICIPATION,
          positionBonusAmount: positionBonus,
          totalAmount: BR_SERIE_C_PARTICIPATION + positionBonus,
        });
      });
    }

    // 4. Brasileirão Série D (Todos os clubes participantes: Participação CBF + Posição na classificação)
    if (state.standingsD && state.standingsD.length > 0) {
      const sortedD = sortStandings(state.standingsD);
      sortedD.forEach((st, idx) => {
        const pos = idx + 1;
        const positionBonus =
          pos <= 4
            ? 850_000
            : pos <= 8
            ? 520_000
            : pos <= 16
            ? 320_000
            : pos <= 32
            ? 180_000
            : 80_000;
        addClubPrizeLine(prizeBucket, st.teamId, {
          competitionId: 'serie_d',
          competitionName: 'Brasileirão Série D',
          category: 'LEAGUE',
          positionOrStageLabel: `${pos}º na classificação geral (${st.points} pts)`,
          participationAmount: BR_SERIE_D_PARTICIPATION,
          positionBonusAmount: positionBonus,
          totalAmount: BR_SERIE_D_PARTICIPATION + positionBonus,
        });
      });
    }

    // 5. Campeonatos Estaduais (Participação + Posição final em cada UF)
    if (state.standingsEstadual && state.standingsEstadual.length > 0) {
      const byState = new Map<string, Standing[]>();
      for (const st of state.standingsEstadual) {
        const gKey = st.group || clubMap.get(st.teamId)?.state || 'Estadual';
        const arr = byState.get(gKey) || [];
        arr.push(st);
        byState.set(gKey, arr);
      }

      byState.forEach((rows, groupLabel) => {
        const sortedEst = sortStandings(rows);
        const estCfg = getEstadualConfigByName(groupLabel);
        const champRef = estCfg?.championPrize || 1_200_000;
        const partQuota = roundPrize(Math.max(120_000, champRef * 0.16));

        sortedEst.forEach((st, idx) => {
          const pos = idx + 1;
          const t = (pos - 1) / Math.max(1, sortedEst.length - 1);
          const posBonus = roundPrize(
            Math.max(40_000, champRef * 0.22 * Math.pow(1 - t, 1.4))
          );
          addClubPrizeLine(prizeBucket, st.teamId, {
            competitionId: `estadual_${groupLabel}`,
            competitionName: estCfg?.name || `Campeonato Estadual (${groupLabel})`,
            category: 'STATE_REGIONAL',
            positionOrStageLabel: `${pos}º colocado (${st.points} pts)`,
            participationAmount: partQuota,
            positionBonusAmount: posBonus,
            totalAmount: partQuota + posBonus,
          });
        });
      });
    }

    // 6. Todas as 9 Ligas Sul-Americanas (1º ao último: Participação + Posição)
    for (const leagueId of SOUTH_AMERICAN_LEAGUE_IDS) {
      const table = state.standingsSouthAmerica?.[leagueId];
      if (!table || table.length === 0) continue;
      const meta = SOUTH_AMERICAN_LEAGUES_META[leagueId];
      const sorted = sortStandings(table);
      const schedule = getSouthAmericanLeaguePrizeSchedule(leagueId);

      sorted.forEach((st, idx) => {
        const pos = idx + 1;
        const row = schedule[Math.min(idx, schedule.length - 1)];
        addClubPrizeLine(prizeBucket, st.teamId, {
          competitionId: leagueId,
          competitionName: meta.name,
          category: 'LEAGUE',
          positionOrStageLabel: `${pos}º lugar (${st.points} pts)`,
          participationAmount: row.participation,
          positionBonusAmount: row.positionBonus,
          totalAmount: row.total,
        });
      });
    }

    // 7. Ligas Mundiais Jan–Dez (MLS, Liga MX, Canadá, Egito, Marrocos — 1º ao último)
    for (const leagueId of JAN_DEC_WORLD_LEAGUE_IDS) {
      const table = state.standingsWorldLeagues?.[leagueId];
      if (!table || table.length === 0) continue;
      const meta = WORLD_LEAGUES_META[leagueId];
      let sorted = sortStandings(table);
      if (leagueId === 'usa_mls') {
        const mlsChamp = resolveMlsCupChampionId(state.fixturesWorldLeagues?.usa_mls);
        if (mlsChamp) {
          sorted = [
            ...sorted.filter((s) => s.teamId === mlsChamp),
            ...sorted.filter((s) => s.teamId !== mlsChamp),
          ];
        }
      }
      const schedule = getWorldLeaguePrizeSchedule(leagueId);

      sorted.forEach((st, idx) => {
        const pos = idx + 1;
        const row = schedule[Math.min(idx, schedule.length - 1)];
        addClubPrizeLine(prizeBucket, st.teamId, {
          competitionId: leagueId,
          competitionName: meta.name,
          category: 'LEAGUE',
          positionOrStageLabel: `${pos}º lugar (${st.points} pts)`,
          participationAmount: row.participation,
          positionBonusAmount: row.positionBonus,
          totalAmount: row.total,
        });
      });
    }

    // 8. Copas Continentais & Mundiais (Participação + Mérito por vitória nos grupos)
    settleGroupStageCup({
      bucket: prizeBucket,
      competitionId: 'libertadores',
      competitionName: 'CONMEBOL Libertadores',
      category: 'CONTINENTAL_CUP',
      fixtures: state.fixturesLibertadores,
      participationFee: 16_500_000,
      winMeritBonus: 1_800_000,
    });

    settleGroupStageCup({
      bucket: prizeBucket,
      competitionId: 'sulamericana',
      competitionName: 'CONMEBOL Sul-Americana',
      category: 'CONTINENTAL_CUP',
      fixtures: state.fixturesSulamericana,
      participationFee: 5_200_000,
      winMeritBonus: 650_000,
    });

    settleGroupStageCup({
      bucket: prizeBucket,
      competitionId: 'copa_internacional',
      competitionName: 'Champions Internacional FIFA',
      category: 'CONTINENTAL_CUP',
      fixtures: state.fixturesCopaInternacional,
      participationFee: 8_000_000,
      winMeritBonus: 1_200_000,
    });

    settleGroupStageCup({
      bucket: prizeBucket,
      competitionId: 'concacaf_champions',
      competitionName: 'Copa dos Campeões da CONCACAF',
      category: 'CONTINENTAL_CUP',
      fixtures: state.fixturesConcacafChampions,
      participationFee: 4_500_000,
      winMeritBonus: 800_000,
    });

    settleGroupStageCup({
      bucket: prizeBucket,
      competitionId: 'super_mundial_clubes',
      competitionName: 'Super Mundial de Clubes FIFA',
      category: 'CONTINENTAL_CUP',
      fixtures: state.fixturesSuperMundial,
      participationFee: 75_000_000,
      winMeritBonus: 10_000_000,
      drawMeritBonus: 4_500_000,
    });

    settleGroupStageCup({
      bucket: prizeBucket,
      competitionId: 'intercontinental',
      competitionName: 'Copa Intercontinental FIFA',
      category: 'CONTINENTAL_CUP',
      fixtures: state.fixturesIntercontinental,
      participationFee: 14_000_000,
      winMeritBonus: 0,
    });

    // 9. Copa do Brasil, Copa do Nordeste & Copa Verde (Participação + Campanha)
    if (state.fixturesCopaBrasil && state.fixturesCopaBrasil.length > 0) {
      const cdbStats = collectParticipantsAndWins(state.fixturesCopaBrasil, false);
      cdbStats.forEach((st, clubId) => {
        const clubObj = clubMap.get(clubId);
        const div = clubObj?.division || 'D';
        const partFee =
          div === 'A'
            ? 2_200_000
            : div === 'B'
            ? 1_500_000
            : div === 'C'
            ? 950_000
            : 800_000;
        const winBonus = roundPrize(st.wins * 450_000);
        addClubPrizeLine(prizeBucket, clubId, {
          competitionId: 'copa_brasil',
          competitionName: 'Copa do Brasil',
          category: 'DOMESTIC_CUP',
          positionOrStageLabel:
            st.wins > 0
              ? `Cota de Participação CBF + ${st.wins} vitória(s)`
              : 'Cota de Participação CBF',
          participationAmount: partFee,
          positionBonusAmount: winBonus,
          totalAmount: partFee + winBonus,
        });
      });
    }

    settleGroupStageCup({
      bucket: prizeBucket,
      competitionId: 'copa_nordeste',
      competitionName: 'Copa do Nordeste',
      category: 'STATE_REGIONAL',
      fixtures: state.fixturesCopaNordeste,
      participationFee: 1_600_000,
      winMeritBonus: 220_000,
    });

    settleGroupStageCup({
      bucket: prizeBucket,
      competitionId: 'copa_verde',
      competitionName: 'Copa Verde',
      category: 'STATE_REGIONAL',
      fixtures: state.fixturesCopaVerde,
      participationFee: 900_000,
      winMeritBonus: 150_000,
    });

    // 10. Copas Nacionais Sul-Americanas & Mundiais (Jan–Dez)
    if (state.fixturesSouthAmericanCups) {
      for (const [cupId, fixList] of Object.entries(state.fixturesSouthAmericanCups)) {
        if (!fixList || fixList.length === 0) continue;
        if (cupId.includes('super')) continue;
        const titleRef = getCupReferenceTitlePrize(cupId, 24_000_000);
        settleDomesticCupParticipation({
          bucket: prizeBucket,
          competitionId: cupId,
          competitionName: DOMESTIC_CUP_DISPLAY_NAMES[cupId] || cupId,
          fixtures: fixList,
          baseParticipationFee: roundPrize(titleRef * 0.085),
          perWinBonus: roundPrize(titleRef * 0.03),
        });
      }
    }

    for (const cupId of [
      'wl_cup_usa',
      'wl_cup_mex',
      'wl_cup_can',
      'wl_cup_egy',
      'wl_cup_mar',
    ] as const) {
      const fixList = state.fixturesWorldCups?.[cupId];
      if (!fixList || fixList.length === 0) continue;
      const titleRef = getCupReferenceTitlePrize(cupId, 12_000_000);
      settleDomesticCupParticipation({
        bucket: prizeBucket,
        competitionId: cupId,
        competitionName: DOMESTIC_CUP_DISPLAY_NAMES[cupId] || cupId,
        fixtures: fixList,
        baseParticipationFee: roundPrize(titleRef * 0.09),
        perWinBonus: roundPrize(titleRef * 0.035),
      });
    }
  }

  // =========================================================================
  // APLICAÇÃO NO CAIXA DE TODOS OS CLUBES + RELATÓRIO E INBOX DO JOGADOR
  // =========================================================================
  let userReport: SeasonPrizeSettlementSummary | null = null;
  const newInboxMessages: InboxMessage[] = [];

  const updatedClubs = state.clubs.map((club) => {
    const items = prizeBucket.get(club.id);
    if (!items || items.length === 0) return club;

    const totalParticipationAwarded = items.reduce(
      (s, i) => s + i.participationAmount,
      0
    );
    const totalPositionAwarded = items.reduce((s, i) => s + i.positionBonusAmount, 0);
    const totalSeasonEndAwarded = items.reduce((s, i) => s + i.totalAmount, 0);
    if (totalSeasonEndAwarded <= 0) return club;

    if (club.id !== state.userClubId) {
      return {
        ...club,
        finances: {
          ...club.finances,
          balance: club.finances.balance + totalSeasonEndAwarded,
          totalIncomeSeason:
            (club.finances.totalIncomeSeason || 0) + totalSeasonEndAwarded,
        },
      };
    }

    // Clube do usuário: grava cada competição no Extrato Bancário (PRIZES) + Relatório Oficial
    const balanceBeforeSettlement = club.finances.balance;
    const inSeasonCupPrizesEarned = club.finances.seasonBreakdown?.PRIZES || 0;
    let nextFinances = club.finances;

    for (const item of items) {
      nextFinances = recordFinanceLedgerMutation(nextFinances, {
        date: settlementDate,
        category: 'PRIZES',
        type: 'INCOME',
        amount: item.totalAmount,
        description: `Premiação ${seasonLabel} · ${item.competitionName} (${item.positionOrStageLabel})`,
        applyToBalance: true,
      });
    }

    const report: SeasonPrizeSettlementSummary = {
      seasonYear: activeYear,
      seasonLabel,
      settledDate: settlementDate,
      items,
      totalParticipationAwarded,
      totalPositionAwarded,
      totalSeasonEndAwarded,
      inSeasonCupPrizesEarned,
      grandTotalSeasonPrizes: inSeasonCupPrizesEarned + totalSeasonEndAwarded,
      balanceBeforeSettlement,
      balanceAfterSettlement: nextFinances.balance,
    };

    userReport = report;

    const summaryLines = items
      .map(
        (it) =>
          `• ${it.competitionName} (${it.positionOrStageLabel}): ${formatMoney(it.totalAmount)} (Participação ${formatMoney(it.participationAmount)} + Posição/Mérito ${formatMoney(it.positionBonusAmount)})`
      )
      .join('\n');

    newInboxMessages.push({
      id: `msg_season_prizes_${key}_${Date.now()}`,
      title: `Premiações Oficiais ${seasonLabel}: +${formatMoney(totalSeasonEndAwarded)} no Orçamento!`,
      message: `As federações e ligas creditaram o fechamento oficial das premiações da temporada ${seasonLabel} ao ${club.name}:\n\n${summaryLines}\n\nTotal creditado no fechamento: ${formatMoney(totalSeasonEndAwarded)}. Todo o valor foi incorporado ao caixa do clube (${formatMoney(nextFinances.balance)}) e permanecerá disponível no orçamento da próxima temporada!`,
      date: settlementDate,
      round: state.currentRound,
      read: false,
      type: 'AWARD',
    });

    return {
      ...club,
      finances: {
        ...nextFinances,
        lastSeasonPrizeReport: report,
      },
    };
  });

  return {
    updatedState: {
      ...state,
      clubs: updatedClubs,
      settledPrizeSeasonKeys: [...existingKeys, key],
      inbox:
        newInboxMessages.length > 0
          ? [...newInboxMessages, ...state.inbox]
          : state.inbox,
    },
    alreadySettled: false,
    userReport,
  };
}

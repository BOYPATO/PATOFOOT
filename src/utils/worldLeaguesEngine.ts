import {
  Club,
  CompetitionType,
  Fixture,
  InboxMessage,
  Standing,
  WorldContinentalId,
  WorldLeagueId,
} from '../types/game';
import { generateInitialStandings } from '../data/initialData';
import {
  getJapanJ1LeagueScheduleDates,
  getRoundDate,
  getRussiaLeagueScheduleDates,
  getSaudiLeagueScheduleDates,
} from './calendarUtils';
import { formatMoney } from './prizeEngine';
import { generateUsaMlsSeason, resolveMlsCupChampionId } from './usaMlsEngine';

export type WorldMacroRegion = 'AMERICA_NORTE' | 'ASIA_RUSSIA' | 'AFRICA';

export interface WorldLeagueMeta {
  id: WorldLeagueId;
  country: string;
  macroRegion: WorldMacroRegion;
  macroRegionLabel: string;
  confederationCode: 'CONCACAF' | 'AFC' | 'UEFA/RPL' | 'CAF';
  name: string;
  shortName: string;
  flagEmoji: string;
  primaryColor: string;
  clubsCount: number;
  totalRounds: number;
  internationalBerths: number; // Vagas para a Champions Internacional FIFA (soma 32 clubes!)
  relegationSlots: number;
  championPrize: number;
  runnerUpPrize: number;
}

export const WORLD_LEAGUE_IDS: WorldLeagueId[] = [
  'usa_mls',
  'mex_ligamx',
  'can_cpl',
  'sau_pro',
  'jpn_j1',
  'rus_premier',
  'egy_premier',
  'mar_botola',
];

export const NORTH_AMERICAN_LEAGUE_IDS: WorldLeagueId[] = ['usa_mls', 'mex_ligamx', 'can_cpl'];
export const ASIA_RUSSIA_LEAGUE_IDS: WorldLeagueId[] = ['sau_pro', 'jpn_j1', 'rus_premier'];
export const AFRICA_LEAGUE_IDS: WorldLeagueId[] = ['egy_premier', 'mar_botola'];
export const SPLIT_YEAR_WORLD_LEAGUE_IDS: WorldLeagueId[] = ['sau_pro', 'jpn_j1', 'rus_premier'];
export const JAN_DEC_WORLD_LEAGUE_IDS: WorldLeagueId[] = [
  'usa_mls',
  'mex_ligamx',
  'can_cpl',
  'egy_premier',
  'mar_botola',
];

export function isAsiaRussiaLeague(comp: CompetitionType | string): boolean {
  return (ASIA_RUSSIA_LEAGUE_IDS as string[]).includes(comp);
}

export function isSplitYearWorldLeague(comp: CompetitionType | string): boolean {
  return (SPLIT_YEAR_WORLD_LEAGUE_IDS as string[]).includes(comp);
}

// Soma exata de vagas na Champions Internacional FIFA (32 clubes em 8 grupos A-H):
// Arábia Saudita (6) + EUA (4) + México (4) + Canadá (2) + Japão (4) + Rússia (4) + Egito (4) + Marrocos (4) = 32 clubes!
export const WORLD_LEAGUES_META: Record<WorldLeagueId, WorldLeagueMeta> = {
  usa_mls: {
    id: 'usa_mls',
    country: 'Estados Unidos',
    macroRegion: 'AMERICA_NORTE',
    macroRegionLabel: 'América do Norte',
    confederationCode: 'CONCACAF',
    name: 'Major League Soccer (MLS)',
    shortName: 'MLS (EUA)',
    flagEmoji: '🇺🇸',
    primaryColor: '#2563EB',
    clubsCount: 30,
    totalRounds: 34,
    internationalBerths: 4,
    relegationSlots: 0,
    championPrize: 48_000_000,
    runnerUpPrize: 24_000_000,
  },
  mex_ligamx: {
    id: 'mex_ligamx',
    country: 'México',
    macroRegion: 'AMERICA_NORTE',
    macroRegionLabel: 'América do Norte',
    confederationCode: 'CONCACAF',
    name: 'Liga BBVA MX (México)',
    shortName: 'Liga MX',
    flagEmoji: '🇲🇽',
    primaryColor: '#16A34A',
    clubsCount: 18,
    totalRounds: 34,
    internationalBerths: 4,
    relegationSlots: 2,
    championPrize: 38_000_000,
    runnerUpPrize: 19_000_000,
  },
  can_cpl: {
    id: 'can_cpl',
    country: 'Canadá',
    macroRegion: 'AMERICA_NORTE',
    macroRegionLabel: 'América do Norte',
    confederationCode: 'CONCACAF',
    name: 'Canadian Premier League (CPL)',
    shortName: 'Liga Canadá (CPL)',
    flagEmoji: '🇨🇦',
    primaryColor: '#DC2626',
    clubsCount: 8,
    totalRounds: 28,
    internationalBerths: 2,
    relegationSlots: 0,
    championPrize: 18_000_000,
    runnerUpPrize: 9_000_000,
  },
  sau_pro: {
    id: 'sau_pro',
    country: 'Arábia Saudita',
    macroRegion: 'ASIA_RUSSIA',
    macroRegionLabel: 'Ásia & Rússia',
    confederationCode: 'AFC',
    name: 'Roshn Saudi Pro League',
    shortName: 'Saudi Pro League',
    flagEmoji: '🇸🇦',
    primaryColor: '#10B981',
    clubsCount: 18,
    totalRounds: 34,
    internationalBerths: 6,
    relegationSlots: 3,
    championPrize: 95_000_000,
    runnerUpPrize: 48_000_000,
  },
  jpn_j1: {
    id: 'jpn_j1',
    country: 'Japão',
    macroRegion: 'ASIA_RUSSIA',
    macroRegionLabel: 'Ásia & Rússia',
    confederationCode: 'AFC',
    name: 'Meiji Yasuda J1 League',
    shortName: 'J1 League (Japão)',
    flagEmoji: '🇯🇵',
    primaryColor: '#E11D48',
    clubsCount: 20,
    totalRounds: 38,
    internationalBerths: 4,
    relegationSlots: 3,
    championPrize: 36_000_000,
    runnerUpPrize: 18_000_000,
  },
  rus_premier: {
    id: 'rus_premier',
    country: 'Rússia',
    macroRegion: 'ASIA_RUSSIA',
    macroRegionLabel: 'Ásia & Rússia',
    confederationCode: 'UEFA/RPL',
    name: 'Premier Liga Russa',
    shortName: 'Premier Liga (RUS)',
    flagEmoji: '🇷🇺',
    primaryColor: '#3B82F6',
    clubsCount: 16,
    totalRounds: 30,
    internationalBerths: 4,
    relegationSlots: 2,
    championPrize: 44_000_000,
    runnerUpPrize: 22_000_000,
  },
  egy_premier: {
    id: 'egy_premier',
    country: 'Egito',
    macroRegion: 'AFRICA',
    macroRegionLabel: 'África',
    confederationCode: 'CAF',
    name: 'Egyptian Premier League',
    shortName: 'Liga Egípcia',
    flagEmoji: '🇪🇬',
    primaryColor: '#DC2626',
    clubsCount: 18,
    totalRounds: 34,
    internationalBerths: 4,
    relegationSlots: 3,
    championPrize: 24_000_000,
    runnerUpPrize: 12_000_000,
  },
  mar_botola: {
    id: 'mar_botola',
    country: 'Marrocos',
    macroRegion: 'AFRICA',
    macroRegionLabel: 'África',
    confederationCode: 'CAF',
    name: 'Botola Pro Inwi (Marrocos)',
    shortName: 'Botola Pro',
    flagEmoji: '🇲🇦',
    primaryColor: '#059669',
    clubsCount: 16,
    totalRounds: 30,
    internationalBerths: 4,
    relegationSlots: 2,
    championPrize: 20_000_000,
    runnerUpPrize: 10_000_000,
  },
};

export const COUNTRY_TO_WORLD_LEAGUE_ID: Record<string, WorldLeagueId> = {
  'Estados Unidos': 'usa_mls',
  México: 'mex_ligamx',
  Canadá: 'can_cpl',
  'Arábia Saudita': 'sau_pro',
  Japão: 'jpn_j1',
  Rússia: 'rus_premier',
  Egito: 'egy_premier',
  Marrocos: 'mar_botola',
};

export function isWorldLeague(comp: CompetitionType | string): comp is WorldLeagueId {
  return (WORLD_LEAGUE_IDS as string[]).includes(comp);
}

export function isWorldInternational(
  comp: CompetitionType | string
): comp is WorldContinentalId {
  return comp === 'copa_internacional' || comp === 'afc_champions';
}

export function getClubWorldLeagueId(club?: Club | null): WorldLeagueId | null {
  if (!club || club.division !== 'WL') return null;
  if (club.worldLeagueId && isWorldLeague(club.worldLeagueId)) {
    return club.worldLeagueId;
  }
  if (club.country && COUNTRY_TO_WORLD_LEAGUE_ID[club.country]) {
    return COUNTRY_TO_WORLD_LEAGUE_ID[club.country];
  }
  return null;
}

/**
 * Returns true if the club follows the Aug–May split-year season cycle
 * (European leagues + Russia + Saudi Arabia + Japan).
 */
export function isSplitCalendarClub(club?: Club | null): boolean {
  if (!club) return false;
  if (club.division === 'EU') return true;
  if (club.division === 'WL') {
    const wlId = getClubWorldLeagueId(club);
    return Boolean(wlId && isSplitYearWorldLeague(wlId));
  }
  return false;
}

export function getWorldLeagueClubs(allClubs: Club[], leagueId: WorldLeagueId): Club[] {
  return allClubs.filter(
    (c) => c.division === 'WL' && getClubWorldLeagueId(c) === leagueId
  );
}

/**
 * Generates full double round-robin calendar and initial standings for one World League
 * aligned with the Jan–Nov season cycle so champions enter December's Mundial de Clubes.
 */
export function generateWorldLeagueSchedule(
  leagueClubs: Club[],
  leagueId: WorldLeagueId,
  seasonYear: number = 2026
): Fixture[] {
  const numTeams = leagueClubs.length;
  if (numTeams < 2) return [];

  const evenTeams = numTeams % 2 === 0 ? leagueClubs : leagueClubs.slice(0, numTeams - 1);
  const count = evenTeams.length;
  const halfRounds = count - 1;
  // Canadian Premier League (8 clubs) uses a quadruple round-robin (28 rounds: 2H + 2A vs each opponent)
  const cycles = leagueId === 'can_cpl' ? 2 : 1;
  const totalRounds = halfRounds * 2 * cycles;
  const matchesPerRound = count / 2;

  const teamIds = evenTeams.map((c) => c.id);
  const clubMap = new Map<string, Club>();
  evenTeams.forEach((c) => clubMap.set(c.id, c));

  const splitDateSlots =
    leagueId === 'sau_pro'
      ? getSaudiLeagueScheduleDates(totalRounds, seasonYear)
      : leagueId === 'rus_premier'
      ? getRussiaLeagueScheduleDates(totalRounds, seasonYear)
      : leagueId === 'jpn_j1'
      ? getJapanJ1LeagueScheduleDates(totalRounds, seasonYear)
      : null;

  const fixtures: Fixture[] = [];

  for (let cycle = 0; cycle < cycles; cycle++) {
    const cycleOffset = cycle * halfRounds * 2;
    for (let round = 0; round < halfRounds; round++) {
      const firstHalfRound = cycleOffset + round + 1;
      const secondHalfRound = cycleOffset + round + 1 + halfRounds;

      const firstSplitSlot = splitDateSlots?.[firstHalfRound - 1];
      const secondSplitSlot = splitDateSlots?.[secondHalfRound - 1];

      const firstSlot =
        totalRounds <= 1
          ? 1
          : Math.max(1, Math.min(38, Math.round(1 + ((firstHalfRound - 1) * 37) / (totalRounds - 1))));
      const secondSlot =
        totalRounds <= 1
          ? 38
          : Math.max(1, Math.min(38, Math.round(1 + ((secondHalfRound - 1) * 37) / (totalRounds - 1))));

      const firstDateInfo = firstSplitSlot || getRoundDate(firstSlot, seasonYear);
      const secondDateInfo = secondSplitSlot || getRoundDate(secondSlot, seasonYear);

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
          competition: leagueId as CompetitionType,
          cupPhase: `${firstHalfRound}ª Rodada`,
          homeTeamId: t1,
          awayTeamId: t2,
          homeScore: null,
          awayScore: null,
          played: false,
          date: firstDateInfo.date,
          time: firstSplitSlot ? firstSplitSlot.time : match % 2 === 0 ? '19:00' : '21:00',
          stadiumName: clubMap.get(t1)?.stadium.name,
        });

        fixtures.push({
          id: `${leagueId}_${seasonYear}_r${secondHalfRound}_m${match}`,
          round: secondHalfRound,
          competition: leagueId as CompetitionType,
          cupPhase: `${secondHalfRound}ª Rodada`,
          homeTeamId: t2,
          awayTeamId: t1,
          homeScore: null,
          awayScore: null,
          played: false,
          date: secondDateInfo.date,
          time: secondSplitSlot ? secondSplitSlot.time : match % 2 === 0 ? '19:00' : '21:00',
          stadiumName: clubMap.get(t2)?.stadium.name,
        });
      }
    }
  }

  return fixtures.sort((a, b) => a.round - b.round);
}

export function generateWorldLeagueSeason(
  allClubs: Club[],
  leagueId: WorldLeagueId,
  seasonYear: number
): { fixtures: Fixture[]; standings: Standing[] } {
  const clubs = getWorldLeagueClubs(allClubs, leagueId);
  if (leagueId === 'usa_mls') {
    return generateUsaMlsSeason(clubs, seasonYear);
  }
  if (clubs.length < 4) {
    return { fixtures: [], standings: [] };
  }

  const evenClubs = clubs.length % 2 === 0 ? clubs : clubs.slice(0, clubs.length - 1);
  const fixtures = generateWorldLeagueSchedule(evenClubs, leagueId, seasonYear);
  const standings = generateInitialStandings(evenClubs.map((c) => c.id));
  return { fixtures, standings };
}

export function generateAllWorldLeaguesData(
  allClubs: Club[],
  seasonYear: number,
  leagueFilter?: WorldLeagueId[]
): {
  fixturesWorldLeagues: Record<WorldLeagueId, Fixture[]>;
  standingsWorldLeagues: Record<WorldLeagueId, Standing[]>;
} {
  const fixturesWorldLeagues = {} as Record<WorldLeagueId, Fixture[]>;
  const standingsWorldLeagues = {} as Record<WorldLeagueId, Standing[]>;
  const targetLeagues = leagueFilter && leagueFilter.length > 0 ? leagueFilter : WORLD_LEAGUE_IDS;

  for (const leagueId of targetLeagues) {
    const { fixtures, standings } = generateWorldLeagueSeason(
      allClubs,
      leagueId,
      seasonYear
    );
    fixturesWorldLeagues[leagueId] = fixtures;
    standingsWorldLeagues[leagueId] = standings;
  }

  return { fixturesWorldLeagues, standingsWorldLeagues };
}

export interface WorldInternationalQualifierSummary {
  copaInternacionalClubIds: string[]; // Exatamente até 32 clubes para a Champions Internacional FIFA
  concacafChampionId?: string; // Melhor campeão América do Norte (EUA/México) -> Mundial de Clubes
  asiaRussiaChampionId?: string; // Campeão da Champions Internacional ou melhor campeão Ásia/Rússia -> Mundial
  africaChampionId?: string; // Melhor campeão da África (Egito/Marrocos) -> Mundial
  byLeague: Record<
    WorldLeagueId,
    {
      internationalIds: string[];
      extraTitleHolderSpot: boolean;
      championId?: string;
    }
  >;
}

function getSortedLeagueClubIds(
  clubs: Club[],
  standings?: Standing[]
): string[] {
  if (standings && standings.length > 0 && standings.some((s) => s.played > 0)) {
    return standings.map((s) => s.teamId);
  }
  return [...clubs]
    .sort((a, b) => {
      if (b.reputation !== a.reputation) return b.reputation - a.reputation;
      const avgA =
        a.squad.reduce((acc, p) => acc + p.overall, 0) / Math.max(1, a.squad.length);
      const avgB =
        b.squad.reduce((acc, p) => acc + p.overall, 0) / Math.max(1, b.squad.length);
      return avgB - avgA;
    })
    .map((c) => c.id);
}

function pickStrongerChampion(
  clubIds: (string | undefined)[],
  clubsMap: Map<string, Club>,
  standingsByClubId: Map<string, Standing>
): string | undefined {
  const valid = clubIds
    .filter((id): id is string => Boolean(id && clubsMap.has(id)))
    .map((id) => {
      const club = clubsMap.get(id)!;
      const st = standingsByClubId.get(id);
      const ppg = st && st.played > 0 ? st.points / st.played : 0;
      const avgOvr =
        club.squad.reduce((acc, p) => acc + p.overall, 0) /
        Math.max(1, club.squad.length);
      return {
        id,
        score: ppg * 22 + club.reputation * 6 + avgOvr,
      };
    })
    .sort((a, b) => b.score - a.score);

  return valid[0]?.id;
}

export function resolveWorldLeagueChampionId(
  leagueId: WorldLeagueId,
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>,
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>
): string | undefined {
  if (leagueId === 'usa_mls') {
    const mlsCupChamp = resolveMlsCupChampionId(fixturesWorldLeagues?.usa_mls);
    if (mlsCupChamp) return mlsCupChamp;
  }
  return standingsWorldLeagues?.[leagueId]?.[0]?.teamId;
}

/**
 * Computes the 32 qualified clubs across USA, Mexico, Saudi Arabia, Japan, Russia, Egypt, and Morocco
 * for the Champions Internacional FIFA (`copa_internacional`) AND determines the continental champions
 * for the FIFA Club World Cup / Copa Intercontinental (`intercontinental`).
 */
export function computeWorldInternationalQualifiers(
  allClubs: Club[],
  standingsWorldLeagues?: Partial<Record<WorldLeagueId, Standing[]>>,
  titleHolderId?: string | null,
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>
): WorldInternationalQualifierSummary {
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));
  const standingsByClubId = new Map<string, Standing>();

  if (standingsWorldLeagues) {
    for (const lid of WORLD_LEAGUE_IDS) {
      for (const st of standingsWorldLeagues[lid] || []) {
        standingsByClubId.set(st.teamId, st);
      }
    }
  }

  const copaSet = new Set<string>();
  if (titleHolderId && clubsMap.get(titleHolderId)?.division === 'WL') {
    copaSet.add(titleHolderId);
  }

  const byLeague = {} as WorldInternationalQualifierSummary['byLeague'];

  for (const leagueId of WORLD_LEAGUE_IDS) {
    const meta = WORLD_LEAGUES_META[leagueId];
    const leagueClubs = getWorldLeagueClubs(allClubs, leagueId);
    const orderedIds = getSortedLeagueClubIds(
      leagueClubs,
      standingsWorldLeagues?.[leagueId]
    );
    const mlsCupChampId =
      leagueId === 'usa_mls'
        ? resolveMlsCupChampionId(fixturesWorldLeagues?.usa_mls)
        : undefined;
    const prioritizedIds = mlsCupChampId
      ? [mlsCupChampId, ...orderedIds.filter((id) => id !== mlsCupChampId)]
      : orderedIds;

    const picked: string[] = [];
    let extraSpot = false;

    for (const teamId of prioritizedIds) {
      if (picked.length >= meta.internationalBerths) break;
      if (copaSet.has(teamId)) {
        // Title holder already has automatic berth -> open G+1 for their national league!
        extraSpot = true;
        continue;
      }
      picked.push(teamId);
      copaSet.add(teamId);
    }

    const holderInLeague =
      titleHolderId && leagueClubs.some((c) => c.id === titleHolderId)
        ? [titleHolderId]
        : [];

    byLeague[leagueId] = {
      internationalIds: Array.from(new Set([...holderInLeague, ...picked])),
      extraTitleHolderSpot: extraSpot,
      championId: mlsCupChampId || orderedIds[0],
    };
  }

  const concacafChampionId = pickStrongerChampion(
    [
      byLeague.mex_ligamx?.championId,
      byLeague.usa_mls?.championId,
      byLeague.can_cpl?.championId,
    ],
    clubsMap,
    standingsByClubId
  );

  const asiaRussiaChampionId =
    titleHolderId && clubsMap.has(titleHolderId)
      ? titleHolderId
      : pickStrongerChampion(
          [
            byLeague.sau_pro?.championId,
            byLeague.jpn_j1?.championId,
            byLeague.rus_premier?.championId,
          ],
          clubsMap,
          standingsByClubId
        );

  const africaChampionId = pickStrongerChampion(
    [byLeague.egy_premier?.championId, byLeague.mar_botola?.championId],
    clubsMap,
    standingsByClubId
  );

  return {
    copaInternacionalClubIds: Array.from(copaSet).slice(0, 32),
    concacafChampionId,
    asiaRussiaChampionId,
    africaChampionId,
    byLeague,
  };
}

/**
 * Awards prize money to champions & runners-up of all 7 World Leagues at season end.
 */
export function awardWorldLeagueEndPrizes(
  standingsWorldLeagues: Partial<Record<WorldLeagueId, Standing[]>> | undefined,
  allClubs: Club[],
  userClubId: string,
  seasonYear: number,
  currentDate: string,
  fixturesWorldLeagues?: Partial<Record<WorldLeagueId, Fixture[]>>,
  leagueFilter?: WorldLeagueId[],
  skipFinancialCredit: boolean = false
): {
  updatedClubs: Club[];
  inboxMessages: InboxMessage[];
} {
  if (!standingsWorldLeagues || skipFinancialCredit) {
    return { updatedClubs: allClubs, inboxMessages: [] };
  }

  const inboxMessages: InboxMessage[] = [];
  const prizeByTeamId = new Map<string, { leagueId: WorldLeagueId; prize: number; pos: number; points: number }>();
  const targetLeagues = leagueFilter && leagueFilter.length > 0 ? leagueFilter : WORLD_LEAGUE_IDS;

  for (const leagueId of targetLeagues) {
    const meta = WORLD_LEAGUES_META[leagueId];
    const table = standingsWorldLeagues[leagueId] || [];
    if (table.length === 0) continue;

    const mlsCupChampId =
      leagueId === 'usa_mls'
        ? resolveMlsCupChampionId(fixturesWorldLeagues?.usa_mls)
        : undefined;
    const orderedForPrize = mlsCupChampId
      ? [
          ...table.filter((s) => s.teamId === mlsCupChampId),
          ...table.filter((s) => s.teamId !== mlsCupChampId),
        ]
      : table;

    orderedForPrize.slice(0, 4).forEach((st, idx) => {
      const pos = idx + 1;
      const prize =
        pos === 1
          ? meta.championPrize
          : pos === 2
          ? meta.runnerUpPrize
          : pos === 3
          ? Math.round(meta.runnerUpPrize * 0.6)
          : Math.round(meta.runnerUpPrize * 0.4);
      if (prize <= 0) return;
      prizeByTeamId.set(st.teamId, { leagueId, prize, pos, points: st.points });
    });
  }

  const updatedClubs = allClubs.map((club) => {
    const award = prizeByTeamId.get(club.id);
    if (!award || (club.worldLeagueId && club.worldLeagueId !== award.leagueId)) return club;
    if (!club.worldLeagueId) return club;

    if (club.id === userClubId) {
      const meta = WORLD_LEAGUES_META[award.leagueId];
      inboxMessages.push({
        id: `msg_wl_prize_${award.leagueId}_${seasonYear}`,
        title:
          award.pos === 1
            ? `🏆 CAMPEÃO NACIONAL (${meta.shortName}): +${formatMoney(award.prize)}!`
            : `💰 Premiação Final — ${meta.shortName}: +${formatMoney(award.prize)}`,
        message:
          award.pos === 1
            ? `Campanha histórica em ${meta.country}! O ${club.name} conquistou o título da ${meta.name} ${seasonYear} com ${award.points} pontos, garantiu vaga internacional e embolsou ${formatMoney(award.prize)}!`
            : `O ${club.name} encerrou a ${meta.name} ${seasonYear} na ${award.pos}ª colocação (${award.points} pts), recebendo ${formatMoney(award.prize)} de premiação oficial.`,
        date: currentDate,
        round: meta.totalRounds,
        read: false,
        type: 'AWARD',
      });
    }

    return {
      ...club,
      finances: {
        ...club.finances,
        balance: club.finances.balance + award.prize,
        totalIncomeSeason: club.finances.totalIncomeSeason + award.prize,
      },
    };
  });

  return {
    updatedClubs,
    inboxMessages,
  };
}

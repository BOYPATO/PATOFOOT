import {
  Club,
  EuropeanCupId,
  Fixture,
  GameSave,
  InboxMessage,
  Standing,
  TrophyRecord,
} from '../types/game';
import {
  generateInitialStandings,
  generateLeagueSchedule,
} from '../data/initialData';
import {
  generateChampionsLeagueFixtures,
  generateConferenceLeagueFixtures,
  generateCopaBrasilFixtures,
  generateCopaInternacionalFixtures,
  generateCopaNordesteFixtures,
  generateCopaVerdeFixtures,
  generateEstadualFixtures,
  generateEuropaLeagueFixtures,
  generateLibertadoresFixtures,
  generateRecopaFixtures,
  generateSerieDFixturesAndStandings,
  generateSulamericanaFixtures,
  generateSupercopaFixtures,
  generateUefaSupercupFixtures,
} from './competitionsEngine';
import {
  awardSouthAmericanLeagueEndPrizes,
  computeConmebolContinentalQualifiers,
  generateAllSouthAmericanLeagues,
  SOUTH_AMERICAN_LEAGUE_IDS,
} from './southAmericaLeaguesEngine';
import {
  applyEnglishPyramidPromotionRelegation,
  awardEuropeanLeagueEndPrizes,
  computeUefaContinentalQualifiers,
  EUROPEAN_LEAGUE_IDS,
  generateAllEuropeanLeagues,
} from './europeLeaguesEngine';
import {
  awardWorldLeagueEndPrizes,
  generateAllWorldLeaguesData,
  isSplitCalendarClub,
  JAN_DEC_WORLD_LEAGUE_IDS,
  SPLIT_YEAR_WORLD_LEAGUE_IDS,
  WORLD_LEAGUE_IDS,
} from './worldLeaguesEngine';
import { generateIntercontinentalFixtures } from './intercontinentalEngine';
import { generateConcacafChampionsFixtures } from './concacafChampionsEngine';
import {
  CURRENT_AFC_CHAMPIONS_2026_VERSION,
  generateAfcChampionsFixtures,
} from './afcChampionsEngine';
import {
  applyAllEstaduaisQualificationsAndRebalanceSerieD,
  buildRegionalCupTrophyRecords,
  flattenEuropeFixtures,
  flattenSouthAmericaFixtures,
  flattenWorldLeaguesFixtures,
  resolveAllEstaduaisFinalClassifications,
  resolveCupChampionId,
  resolvePotiguarFinalClassification,
  resolveSerieCPromotedIds,
  resolveSerieDPromotedIds,
  simulateCpuFixturesUpToDate,
} from './multiLeagueEngine';
import {
  formatEuropeanSeason,
  getEuropeanSeasonStartDate,
  getSeasonStartDate,
} from './calendarUtils';
import { resetClubsFinancesForNewSeason } from './financialFairPlayEngine';
import { settleAllSeasonEndPrizes } from './seasonPrizeSettlementEngine';
import { recordCompletedSeasonHistory } from './seasonHistoryEngine';
import {
  generateSuperMundialFixtures,
  isSuperClubWorldCupYear,
} from './superClubWorldCupEngine';
import { processWorldBallonDorCeremony } from './worldBallonDorEngine';
import { generateAllEnglishCupsFixtures } from './englishCupsEngine';
import {
  flattenEuropeanCupsFixtures,
  generateAllEuropeanCupsFixtures,
} from './europeanCupsEngine';
import { generateAllSouthAmericanCupsFixtures } from './southAmericanCupsEngine';
import {
  flattenWorldCupsFixtures,
  generateAllWorldCupsFixtures,
  JAN_DEC_WORLD_CUP_IDS,
  SPLIT_YEAR_WORLD_CUP_IDS,
} from './worldCupsEngine';

/**
 * Resets per-season player match/goal/assist/card counters ONLY for clubs in `targetContinent`,
 * preserving in-progress stats of the other continent's clubs!
 */
export function resetContinentPlayerSeasonStats(
  clubs: Club[],
  targetContinent: 'EU' | 'SA_BR'
): Club[] {
  return clubs.map((club) => {
    const isSplit = isSplitCalendarClub(club);
    if (targetContinent === 'EU' && !isSplit) return club;
    if (targetContinent === 'SA_BR' && isSplit) return club;

    return {
      ...club,
      squad: club.squad.map((p) => ({
        ...p,
        matches: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        competitionYellowCards: {},
        competitionRedCards: {},
        suspensions: [],
        isSuspended: false,
      })),
    };
  });
}

function buildUefaCupTrophyRecords(
  clubs: Club[],
  seasonYear: number,
  userClubId: string,
  fixturesUcl?: Fixture[],
  fixturesUel?: Fixture[],
  fixturesUecl?: Fixture[]
): {
  trophies: TrophyRecord[];
  uclChampId?: string;
  uelChampId?: string;
  ueclChampId?: string;
} {
  const uclChampId = resolveCupChampionId(fixturesUcl);
  const uelChampId = resolveCupChampionId(fixturesUel);
  const ueclChampId = resolveCupChampionId(fixturesUecl);
  const seasonLabel = formatEuropeanSeason(seasonYear);

  const makeRec = (
    compLabel: string,
    finalFix?: Fixture,
    champId?: string
  ): TrophyRecord | null => {
    if (!finalFix || !finalFix.played || !champId) return null;
    const champClub = clubs.find((c) => c.id === champId);
    const runnerId =
      finalFix.homeTeamId === champId ? finalFix.awayTeamId : finalFix.homeTeamId;
    const runnerClub = clubs.find((c) => c.id === runnerId);
    if (!champClub) return null;
    return {
      year: seasonYear,
      seasonLabel,
      competition: compLabel,
      championTeamName: champClub.name,
      runnerUpTeamName: runnerClub?.name || 'Vice-Campeão',
      userWon: champId === userClubId,
    };
  };

  const trophies = [
    makeRec(
      'UEFA Champions League',
      fixturesUcl?.find((f) => f.id === 'ucl_final'),
      uclChampId
    ),
    makeRec(
      'UEFA Europa League',
      fixturesUel?.find((f) => f.id === 'uel_final'),
      uelChampId
    ),
    makeRec(
      'UEFA Conference League',
      fixturesUecl?.find((f) => f.id === 'uecl_final'),
      ueclChampId
    ),
  ].filter((t): t is TrophyRecord => Boolean(t));

  return { trophies, uclChampId, uelChampId, ueclChampId };
}

function mergeUniqueTrophies(
  existing: TrophyRecord[],
  incoming: TrophyRecord[]
): TrophyRecord[] {
  const keys = new Set(
    existing.map((t) => `${t.seasonLabel || t.year}::${t.competition}`)
  );
  const merged = [...existing];
  for (const rec of incoming) {
    const k = `${rec.seasonLabel || rec.year}::${rec.competition}`;
    if (!keys.has(k)) {
      keys.add(k);
      merged.push(rec);
    }
  }
  return merged;
}

/**
 * Automatically rolls over the OFF-CONTINENT calendar when the game date crosses its real-life opening date:
 * 1) If user manages a Brazilian/South American club (`division !== 'EU'`) and `currentDate` reaches August 1 of `calYear`,
 *    while `europeSeasonYear < calYear`, finalizes Europe `(calYear - 1)/calYear` and kicks off Europe `calYear/(calYear + 1)`!
 * 2) If user manages a European club (`division === 'EU'`) and `currentDate` reaches January 15 of `calYear`,
 *    while `saSeasonYear < calYear`, finalizes South America/Brazil `calYear - 1` and kicks off `calYear`!
 */
export function syncOffContinentCalendarRollover(state: GameSave): GameSave {
  if (!state.currentDate || !/^\d{4}-\d{2}-\d{2}$/.test(state.currentDate)) {
    return state;
  }

  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  if (!userClub) return state;

  const calYear = Number(state.currentDate.slice(0, 4));
  const isUserSplit = isSplitCalendarClub(userClub);

  // CASE A: Calendar crosses August 1 while `europeSeasonYear < calYear` -> Roll over Europe & Asia/Russia (`sau_pro`, `jpn_j1`, `rus_premier`, `afc_champions`) to `calYear / (calYear + 1)`
  // (Runs unconditionally for Jan-Dec managers, and also for Split-Calendar managers if prior season user fixtures are all finished)
  const curEuYear =
    state.europeSeasonYear ??
    (state.currentDate < `${calYear}-07-20` ? calYear - 1 : calYear);
  const hasUnplayedUserEuSeasonFixture =
    isUserSplit &&
    [
      ...flattenEuropeFixtures(state.fixturesEurope),
      ...(state.fixturesEngCommunityShield || []),
      ...(state.fixturesEngEflCup || []),
      ...(state.fixturesEngFaCup || []),
      ...flattenEuropeanCupsFixtures(state.fixturesEuropeanCups),
      ...flattenWorldLeaguesFixtures(state.fixturesWorldLeagues),
      ...flattenWorldCupsFixtures(state.fixturesWorldCups),
      ...(state.fixturesChampionsLeague || []),
      ...(state.fixturesEuropaLeague || []),
      ...(state.fixturesConferenceLeague || []),
      ...(state.fixturesUefaSupercup || []),
      ...(state.fixturesAfcChampions || []),
    ].some(
      (f) =>
        !f.played &&
        (f.homeTeamId === state.userClubId || f.awayTeamId === state.userClubId) &&
        (!f.date || f.date <= `${calYear}-06-30`)
    );

  if (
    state.currentDate >= `${calYear}-08-01` &&
    curEuYear < calYear &&
    (!isUserSplit || !hasUnplayedUserEuSeasonFixture)
  ) {
    // Ensure 100% of finishing European/Split-Year group-stage & knockout CPU matches are completed before recording history/trophies!
    state = simulateCpuFixturesUpToDate(state, `${calYear}-07-31`, true, {
      finishHemispherePools: 'EU',
    });
    const nextEuYear = calYear;
    const euLabel = formatEuropeanSeason(nextEuYear);

      const euHistorySnapshot = recordCompletedSeasonHistory(
        {
          ...state,
          europeSeasonYear: curEuYear,
        },
        'EU'
      );

      const {
        trophies: uefaTrophies,
        uclChampId,
        uelChampId,
        ueclChampId,
      } = buildUefaCupTrophyRecords(
        state.clubs,
        curEuYear,
        state.userClubId,
        state.fixturesChampionsLeague,
        state.fixturesEuropaLeague,
        state.fixturesConferenceLeague
      );

      const { updatedState: euSettledState } = settleAllSeasonEndPrizes(
        state,
        'EU',
        `${nextEuYear}-05-31`
      );

      const euEndResult = awardEuropeanLeagueEndPrizes({
        clubs: euSettledState.clubs,
        standingsEurope: euSettledState.standingsEurope,
        userClubId: euSettledState.userClubId,
        seasonYear: curEuYear,
        currentDate: `01/08/${nextEuYear}`,
        skipFinancialCredit: true,
      });

      const splitWlEndResult = awardWorldLeagueEndPrizes(
        euSettledState.standingsWorldLeagues,
        euEndResult.updatedClubs,
        euSettledState.userClubId,
        curEuYear,
        `01/08/${nextEuYear}`,
        euSettledState.fixturesWorldLeagues,
        SPLIT_YEAR_WORLD_LEAGUE_IDS,
        true
      );

      const afcChampId = resolveCupChampionId(state.fixturesAfcChampions);
      const afcFinalFix = state.fixturesAfcChampions?.find((f) => f.id === 'afc_final');
      const afcTrophy: TrophyRecord[] = [];
      if (afcFinalFix && afcFinalFix.played && afcChampId) {
        const afcChampClub = state.clubs.find((c) => c.id === afcChampId);
        const afcRunnerId =
          afcFinalFix.homeTeamId === afcChampId
            ? afcFinalFix.awayTeamId
            : afcFinalFix.homeTeamId;
        const afcRunnerClub = state.clubs.find((c) => c.id === afcRunnerId);
        if (afcChampClub) {
          afcTrophy.push({
            year: curEuYear,
            seasonLabel: formatEuropeanSeason(curEuYear),
            competition: 'Liga dos Campeões de Elite da AFC',
            championTeamName: afcChampClub.name,
            runnerUpTeamName: afcRunnerClub?.name || 'Vice-Campeão',
            userWon: afcChampId === state.userClubId,
          });
        }
      }

      const engPyramidResult = applyEnglishPyramidPromotionRelegation(
        splitWlEndResult.updatedClubs,
        state.standingsEurope,
        state.fixturesEurope
      );

      let updatedClubs = resetContinentPlayerSeasonStats(
        engPyramidResult.updatedClubs,
        'EU'
      );
      updatedClubs = resetClubsFinancesForNewSeason(
        updatedClubs,
        nextEuYear,
        getEuropeanSeasonStartDate(nextEuYear),
        'EU'
      );

      const faCupChampId = resolveCupChampionId(state.fixturesEngFaCup);
      const euDomesticCupChampions: Partial<Record<EuropeanCupId, string>> = {};
      if (state.fixturesEuropeanCups) {
        for (const [k, fixList] of Object.entries(state.fixturesEuropeanCups)) {
          const champ = resolveCupChampionId(fixList);
          if (champ) euDomesticCupChampions[k as EuropeanCupId] = champ;
        }
      }

      const uefaQualifiers = computeUefaContinentalQualifiers({
        clubs: updatedClubs,
        standingsEurope: state.standingsEurope,
        uclTitleHolderId: uclChampId,
        uelTitleHolderId: uelChampId,
        ueclTitleHolderId: ueclChampId,
        faCupChampionId: faCupChampId,
        domesticCupChampions: euDomesticCupChampions,
      });

      const euNextData = generateAllEuropeanLeagues(updatedClubs, nextEuYear);
      const splitWlNextData = generateAllWorldLeaguesData(
        updatedClubs,
        nextEuYear,
        SPLIT_YEAR_WORLD_LEAGUE_IDS
      );
      const afcData = generateAfcChampionsFixtures(
        updatedClubs,
        nextEuYear,
        state.standingsWorldLeagues,
        afcChampId || state.reigningAfcChampId
      );
      const uclData = generateChampionsLeagueFixtures(
        updatedClubs,
        nextEuYear,
        uefaQualifiers.championsLeagueIds,
        uclChampId
      );
      const uelData = generateEuropaLeagueFixtures(
        updatedClubs,
        nextEuYear,
        uefaQualifiers.europaLeagueIds,
        uelChampId
      );
      const ueclData = generateConferenceLeagueFixtures(
        updatedClubs,
        nextEuYear,
        uefaQualifiers.conferenceLeagueIds,
        ueclChampId
      );

      // Lock May's newly crowned UCL & AFC champions into December's Intercontinental!
      const effectiveReigningUcl = uclChampId || state.reigningUclChampId;
      const effectiveReigningAfc = afcChampId || state.reigningAfcChampId;
      const updatedIntercontinental = (state.fixturesIntercontinental || []).map((f) => {
        if (f.id.startsWith('intercont_final') && !f.played && effectiveReigningUcl) {
          return { ...f, homeTeamId: effectiveReigningUcl };
        }
        if (f.id.startsWith('intercont_q2') && !f.played && effectiveReigningAfc) {
          return { ...f, homeTeamId: effectiveReigningAfc };
        }
        return f;
      });

      const uclChampName =
        updatedClubs.find((c) => c.id === effectiveReigningUcl)?.shortName || 'Campeão Europeu';

      const euOpeningMsg: InboxMessage = {
        id: `msg_eu_rollover_${nextEuYear}_${Date.now()}`,
        title: `Temporadas Europa & Ásia/Rússia ${euLabel} Iniciadas!`,
        message: `O calendário ${euLabel} começa na Europa, Arábia Saudita, Japão e Rússia com a Champions, Europa, Conference e AFC Champions League Elite até Maio de ${
          nextEuYear + 1
        }. Atual campeão europeu confirmado no Mundial de Dezembro: ${uclChampName}.`,
        date: `01/08/${nextEuYear}`,
        round: state.currentRound,
        read: false,
        type: 'BOARD',
      };

      const engCupsNext = generateAllEnglishCupsFixtures(updatedClubs, nextEuYear, {
        fixturesEurope: euNextData.fixturesEurope,
        plChampionId: state.standingsEurope?.eng_premier?.[0]?.teamId,
        faCupChampionId: faCupChampId,
      });
      const uefaSupercupNext = generateUefaSupercupFixtures(
        updatedClubs,
        nextEuYear,
        effectiveReigningUcl,
        uelChampId || state.reigningUelChampId
      );
      const euCupsNext = generateAllEuropeanCupsFixtures(updatedClubs, nextEuYear, {
        fixturesEurope: euNextData.fixturesEurope,
      });
      const splitWlCupsNext = generateAllWorldCupsFixtures(
        updatedClubs,
        state.saSeasonYear ?? state.currentSeasonYear,
        nextEuYear,
        {
          targetCupIds: SPLIT_YEAR_WORLD_CUP_IDS,
          fixturesWorldLeagues: {
            ...(state.fixturesWorldLeagues || {}),
            ...splitWlNextData.fixturesWorldLeagues,
          },
          fixturesAfcChampions: afcData.fixtures,
          fixturesCopaInternacional: state.fixturesCopaInternacional,
        }
      );

      return {
        ...state,
        settledPrizeSeasonKeys: euSettledState.settledPrizeSeasonKeys,
        afcChampions2026Version: CURRENT_AFC_CHAMPIONS_2026_VERSION,
        europeSeasonYear: nextEuYear,
        ...(isUserSplit ? { currentSeasonYear: nextEuYear, currentRound: 1 } : {}),
        reigningUclChampId: effectiveReigningUcl,
        reigningUelChampId: uelChampId || state.reigningUelChampId,
        reigningUeclChampId: ueclChampId || state.reigningUeclChampId,
        reigningAfcChampId: effectiveReigningAfc,
        clubs: updatedClubs,
        fixturesEurope: euNextData.fixturesEurope,
        standingsEurope: euNextData.standingsEurope,
        fixturesWorldLeagues: {
          ...(state.fixturesWorldLeagues || {}),
          ...splitWlNextData.fixturesWorldLeagues,
        },
        standingsWorldLeagues: {
          ...(state.standingsWorldLeagues || {}),
          ...splitWlNextData.standingsWorldLeagues,
        },
        fixturesAfcChampions: afcData.fixtures,
        standingsAfcChampions: afcData.standings,
        fixturesChampionsLeague: uclData.fixtures,
        standingsChampionsLeague: uclData.standings,
        fixturesEuropaLeague: uelData.fixtures,
        standingsEuropaLeague: uelData.standings,
        fixturesConferenceLeague: ueclData.fixtures,
        standingsConferenceLeague: ueclData.standings,
        fixturesUefaSupercup: uefaSupercupNext,
        fixturesEngCommunityShield: engCupsNext.fixturesEngCommunityShield,
        fixturesEngEflCup: engCupsNext.fixturesEngEflCup,
        fixturesEngFaCup: engCupsNext.fixturesEngFaCup,
        fixturesEuropeanCups: euCupsNext,
        fixturesWorldCups: {
          ...(state.fixturesWorldCups || {}),
          ...splitWlCupsNext,
        },
        fixturesIntercontinental: updatedIntercontinental,
        trophyHistory: mergeUniqueTrophies(state.trophyHistory, [
          ...euEndResult.newTrophies,
          ...uefaTrophies,
          ...afcTrophy,
          ...euHistorySnapshot.officialTrophies,
        ]),
        seasonHistoryArchive: euHistorySnapshot.updatedArchive,
        inbox: [euOpeningMsg, ...euEndResult.inboxMessages, ...splitWlEndResult.inboxMessages, ...state.inbox],
      };
  }

  // CASE B: User is on split-year calendar (Europe / Asia / Russia), and calendar crosses SA season start (e.g. Jan 11 / 2nd Sunday) -> Roll over SA / Brazil / North America / Africa to `calYear`!
  if (!isUserSplit) {
    return state;
  }
  const curSaYear = state.saSeasonYear ?? state.currentSeasonYear;
  if (state.currentDate >= getSeasonStartDate(calYear) && curSaYear < calYear) {
    // Ensure 100% of finishing South American/Brazilian group-stage & knockout CPU matches are completed before recording history/trophies!
    state = simulateCpuFixturesUpToDate(state, `${curSaYear}-12-31`, true, {
      finishHemispherePools: 'SA_BR',
    });
    const nextSaYear = calYear;
    const { updatedState: stateWithBallonDor } = processWorldBallonDorCeremony(
      state,
      curSaYear,
      `31/12/${curSaYear}`
    );

    const saHistorySnapshot = recordCompletedSeasonHistory(
      {
        ...stateWithBallonDor,
        saSeasonYear: curSaYear,
      },
      'SA_BR'
    );

    const serieAChampId = stateWithBallonDor.standingsA[0]?.teamId;
    const serieARunnerUpId = stateWithBallonDor.standingsA[1]?.teamId;
    const copaBrasilChampId = resolveCupChampionId(state.fixturesCopaBrasil);
    const libertadoresChampId = resolveCupChampionId(state.fixturesLibertadores);
    const sulamericanaChampId = resolveCupChampionId(state.fixturesSulamericana);
    const copaInternacionalChampId = resolveCupChampionId(state.fixturesCopaInternacional);

    const relegatedA = state.standingsA.slice(-4).map((s) => s.teamId);
    const promotedB = state.standingsB.slice(0, 4).map((s) => s.teamId);
    const relegatedB = state.standingsB.slice(-4).map((s) => s.teamId);
    const promotedC = resolveSerieCPromotedIds(state.standingsC, state.fixturesC);
    const relegatedC = (state.standingsC || []).slice(-4).map((s) => s.teamId);
    const promotedD = resolveSerieDPromotedIds(state.fixturesD, state.standingsD);

    const baseBrAdjustedClubs = stateWithBallonDor.clubs.map((c) => {
      if (c.division === 'EU' || c.division === 'SA' || c.division === 'WL') return c;
      let newDiv = c.division;
      if (relegatedA.includes(c.id)) newDiv = 'B';
      else if (promotedB.includes(c.id)) newDiv = 'A';
      else if (relegatedB.includes(c.id) && promotedC.length === 4) newDiv = 'C';
      else if (promotedC.includes(c.id)) newDiv = 'B';
      else if (relegatedC.includes(c.id) && promotedD.length === 4) newDiv = 'D';
      else if (promotedD.includes(c.id)) newDiv = 'C';
      return { ...c, division: newDiv };
    });

    const allEstaduais = resolveAllEstaduaisFinalClassifications(
      state.fixturesEstadual,
      state.standingsEstadual,
      baseBrAdjustedClubs
    );
    const potiguarClass = resolvePotiguarFinalClassification(
      state.fixturesEstadual,
      state.standingsEstadual,
      baseBrAdjustedClubs
    );
    const brAdjustedClubs = applyAllEstaduaisQualificationsAndRebalanceSerieD(
      baseBrAdjustedClubs,
      allEstaduais,
      state.standingsD,
      relegatedC,
      stateWithBallonDor.userClubId,
      state.fixturesD
    );
    const regionalTrophies = buildRegionalCupTrophyRecords(
      brAdjustedClubs,
      curSaYear,
      stateWithBallonDor.userClubId,
      potiguarClass,
      state.fixturesCopaNordeste,
      allEstaduais,
      state.fixturesCopaVerde
    );
    const cneChampId = resolveCupChampionId(state.fixturesCopaNordeste);
    const cvChampId = resolveCupChampionId(state.fixturesCopaVerde);
    const serieCChampId = (state.standingsC || [])[0]?.teamId;
    const serieDChampId = resolveCupChampionId(state.fixturesD);
    const cdbPhase3Champs = [cneChampId, cvChampId, serieCChampId, serieDChampId].filter(
      (id): id is string => Boolean(id)
    );

    const { updatedState: saSettledState } = settleAllSeasonEndPrizes(
      {
        ...stateWithBallonDor,
        clubs: brAdjustedClubs,
      },
      'SA_BR',
      `${curSaYear}-12-31`
    );

    const saEndResult = awardSouthAmericanLeagueEndPrizes({
      clubs: saSettledState.clubs,
      standingsSouthAmerica: saSettledState.standingsSouthAmerica,
      userClubId: saSettledState.userClubId,
      seasonYear: curSaYear,
      endDate: `31/12/${curSaYear}`,
      skipFinancialCredit: true,
    });

    const wlEndResult = awardWorldLeagueEndPrizes(
      saSettledState.standingsWorldLeagues,
      saEndResult.updatedClubs,
      saSettledState.userClubId,
      curSaYear,
      `31/12/${curSaYear}`,
      saSettledState.fixturesWorldLeagues,
      JAN_DEC_WORLD_LEAGUE_IDS,
      true
    );

    let updatedClubs = resetContinentPlayerSeasonStats(
      wlEndResult.updatedClubs,
      'SA_BR'
    );
    updatedClubs = resetClubsFinancesForNewSeason(
      updatedClubs,
      nextSaYear,
      getSeasonStartDate(nextSaYear),
      'SA_BR'
    );

    const serieAClubs = updatedClubs.filter((c) => c.division === 'A').map((c) => c.id);
    const serieBClubs = updatedClubs.filter((c) => c.division === 'B').map((c) => c.id);
    const serieCClubs = updatedClubs.filter((c) => c.division === 'C').map((c) => c.id);

    const fixturesA = generateLeagueSchedule(serieAClubs, 'serie_a', nextSaYear);
    const fixturesB = generateLeagueSchedule(serieBClubs, 'serie_b', nextSaYear);
    const fixturesC = generateLeagueSchedule(serieCClubs, 'serie_c', nextSaYear);
    const serieDData = generateSerieDFixturesAndStandings(updatedClubs, nextSaYear);
    const saNextData = generateAllSouthAmericanLeagues(updatedClubs, nextSaYear);
    const wlNextData = generateAllWorldLeaguesData(
      updatedClubs,
      nextSaYear,
      JAN_DEC_WORLD_LEAGUE_IDS
    );
    const cintData = generateCopaInternacionalFixtures(
      updatedClubs,
      nextSaYear,
      state.standingsWorldLeagues,
      copaInternacionalChampId
    );
    const concacafData = generateConcacafChampionsFixtures(
      updatedClubs,
      nextSaYear,
      state.standingsWorldLeagues,
      state.fixturesWorldLeagues
    );

    const standingsA: Standing[] = generateInitialStandings(serieAClubs);
    const standingsB: Standing[] = generateInitialStandings(serieBClubs);
    const standingsC: Standing[] = generateInitialStandings(serieCClubs);

    const conmebolQualifiers = computeConmebolContinentalQualifiers({
      clubs: updatedClubs,
      standingsA: state.standingsA,
      standingsSouthAmerica: state.standingsSouthAmerica,
      libertadoresChampId,
      sulamericanaChampId,
      copaBrasilChampId,
    });

    const qualifiedLibBrIds = conmebolQualifiers.libertadoresEntries
      .filter((e) => e.country === 'Brasil')
      .map((e) => e.clubId);
    const qualifiedSulaBrIds = conmebolQualifiers.sulamericanaEntries
      .filter((e) => e.country === 'Brasil')
      .map((e) => e.clubId);

    const libData = generateLibertadoresFixtures(
      updatedClubs,
      nextSaYear,
      qualifiedLibBrIds,
      conmebolQualifiers.libertadoresIds,
      libertadoresChampId
    );
    const sulaData = generateSulamericanaFixtures(
      updatedClubs,
      nextSaYear,
      qualifiedSulaBrIds,
      qualifiedLibBrIds,
      conmebolQualifiers.sulamericanaIds
    );
    const cdbFixtures = generateCopaBrasilFixtures(
      updatedClubs,
      nextSaYear,
      allEstaduais.allCopaBrasilQualifiedIds,
      cdbPhase3Champs
    );
    const copaNordesteData = generateCopaNordesteFixtures(
      updatedClubs,
      nextSaYear,
      allEstaduais.allCopaNordesteQualifiedIds
    );
    const copaVerdeData = generateCopaVerdeFixtures(
      updatedClubs,
      nextSaYear,
      allEstaduais.allCopaVerdeQualifiedIds
    );
    const supercopaFixtures = generateSupercopaFixtures(
      updatedClubs,
      nextSaYear,
      serieAChampId,
      copaBrasilChampId,
      serieARunnerUpId
    );
    const recopaFixtures = generateRecopaFixtures(
      updatedClubs,
      nextSaYear,
      libertadoresChampId,
      sulamericanaChampId
    );
    const estData = generateEstadualFixtures(updatedClubs, nextSaYear);
    const intercontFixtures = generateIntercontinentalFixtures(
      nextSaYear,
      undefined,
      state.reigningUclChampId,
      undefined,
      undefined,
      undefined,
      undefined,
      stateWithBallonDor.reigningAfcChampId || resolveCupChampionId(stateWithBallonDor.fixturesAfcChampions)
    );

    // Ensure South American & World League standings keys are preserved cleanly
    const mergedFixturesWorldLeagues = {
      ...(stateWithBallonDor.fixturesWorldLeagues || {}),
      ...wlNextData.fixturesWorldLeagues,
    };
    const mergedStandingsWorldLeagues = {
      ...(stateWithBallonDor.standingsWorldLeagues || {}),
      ...wlNextData.standingsWorldLeagues,
    };
    for (const lid of SOUTH_AMERICAN_LEAGUE_IDS) {
      if (!saNextData.standingsSouthAmerica[lid]) {
        saNextData.standingsSouthAmerica[lid] = [];
      }
    }
    for (const lid of WORLD_LEAGUE_IDS) {
      if (!mergedStandingsWorldLeagues[lid]) {
        mergedStandingsWorldLeagues[lid] = [];
      }
    }
    for (const lid of EUROPEAN_LEAGUE_IDS) {
      void lid;
    }

    const smwcRollover = isSuperClubWorldCupYear(nextSaYear)
      ? generateSuperMundialFixtures(
          {
            clubs: updatedClubs,
            standingsA: stateWithBallonDor.standingsA,
            standingsEurope: stateWithBallonDor.standingsEurope,
            standingsSouthAmerica: stateWithBallonDor.standingsSouthAmerica,
            standingsWorldLeagues: mergedStandingsWorldLeagues,
            fixturesChampionsLeague: stateWithBallonDor.fixturesChampionsLeague,
            fixturesLibertadores: stateWithBallonDor.fixturesLibertadores,
            fixturesCopaInternacional: stateWithBallonDor.fixturesCopaInternacional,
            fixturesConcacafChampions: stateWithBallonDor.fixturesConcacafChampions,
            fixturesAfcChampions: stateWithBallonDor.fixturesAfcChampions,
            reigningUclChampId: stateWithBallonDor.reigningUclChampId,
          },
          nextSaYear
        )
      : null;

    const nextSaStartStr = getSeasonStartDate(nextSaYear);
    const [, nextSaM, nextSaD] = nextSaStartStr.split('-');
    const nextSaStartBR = `${nextSaD}/${nextSaM}/${nextSaYear}`;

    const smwcMsg: InboxMessage[] =
      smwcRollover && smwcRollover.fixtures.length > 0
        ? [
            {
              id: `msg_smwc_draw_${nextSaYear}`,
              title: `🌎 Sorteio Oficial: Super Mundial de Clubes FIFA ${nextSaYear} (32 Times)!`,
              message: `Ano de Super Mundial! Os 32 gigantes classificados das 6 confederações mundiais (UEFA, CONMEBOL, CONCACAF, AFC, CAF e Champions Internacional) foram distribuídos nos Grupos A a H (15/06 a 13/07/${nextSaYear})! Confira os grupos na aba Competições.`,
              date: nextSaStartBR,
              round: stateWithBallonDor.currentRound,
              read: false,
              type: 'AWARD',
            },
          ]
        : [];

    const saCupsNext = generateAllSouthAmericanCupsFixtures(
      updatedClubs,
      nextSaYear,
      flattenSouthAmericaFixtures(saNextData.fixturesSouthAmerica)
    );
    const janDecWlCupsNext = generateAllWorldCupsFixtures(
      updatedClubs,
      nextSaYear,
      stateWithBallonDor.europeSeasonYear ?? nextSaYear - 1,
      {
        targetCupIds: JAN_DEC_WORLD_CUP_IDS,
        fixturesWorldLeagues: mergedFixturesWorldLeagues,
        fixturesConcacafChampions: concacafData.fixtures,
        fixturesCopaInternacional: cintData.fixtures,
      }
    );

    return {
      ...stateWithBallonDor,
      settledPrizeSeasonKeys: saSettledState.settledPrizeSeasonKeys,
      saSeasonYear: nextSaYear,
      clubs: updatedClubs,
      fixturesA,
      fixturesB,
      fixturesC,
      fixturesD: serieDData.fixtures,
      fixturesSupercopa: supercopaFixtures,
      fixturesRecopa: recopaFixtures,
      fixturesLibertadores: libData.fixtures,
      fixturesSulamericana: sulaData.fixtures,
      fixturesCopaBrasil: cdbFixtures,
      fixturesEstadual: estData.fixtures,
      fixturesCopaNordeste: copaNordesteData.fixtures,
      fixturesCopaVerde: copaVerdeData.fixtures,
      fixturesIntercontinental: intercontFixtures,
      fixturesSouthAmerica: saNextData.fixturesSouthAmerica,
      fixturesSouthAmericanCups: saCupsNext,
      fixturesWorldLeagues: mergedFixturesWorldLeagues,
      fixturesWorldCups: {
        ...(stateWithBallonDor.fixturesWorldCups || {}),
        ...janDecWlCupsNext,
      },
      fixturesCopaInternacional: cintData.fixtures,
      fixturesConcacafChampions: concacafData.fixtures,
      fixturesSuperMundial: smwcRollover ? smwcRollover.fixtures : [],
      standingsA,
      standingsB,
      standingsC,
      standingsD: serieDData.standings,
      standingsLibertadores: libData.standings,
      standingsSulamericana: sulaData.standings,
      standingsEstadual: estData.standings,
      standingsCopaNordeste: copaNordesteData.standings,
      standingsCopaVerde: copaVerdeData.standings,
      standingsSouthAmerica: saNextData.standingsSouthAmerica,
      standingsWorldLeagues: mergedStandingsWorldLeagues,
      standingsCopaInternacional: cintData.standings,
      standingsSuperMundial: smwcRollover ? smwcRollover.standings : [],
      potiguarCopaBrasilQualifiedIds: potiguarClass.copaBrasilIds,
      potiguarCopaNordesteQualifiedIds: potiguarClass.copaNordesteIds,
      estadualCopaBrasilQualifiedIds: allEstaduais.allCopaBrasilQualifiedIds,
      estadualCopaNordesteQualifiedIds: allEstaduais.allCopaNordesteQualifiedIds,
      estadualCopaVerdeQualifiedIds: allEstaduais.allCopaVerdeQualifiedIds,
      inbox: [
        ...smwcMsg,
        ...wlEndResult.inboxMessages,
        ...stateWithBallonDor.inbox,
      ],
      trophyHistory: mergeUniqueTrophies(stateWithBallonDor.trophyHistory, [
        ...saEndResult.trophies,
        ...regionalTrophies,
        ...saHistorySnapshot.officialTrophies,
      ]),
      seasonHistoryArchive: saHistorySnapshot.updatedArchive,
    };
  }

  return state;
}

export { buildUefaCupTrophyRecords, mergeUniqueTrophies };

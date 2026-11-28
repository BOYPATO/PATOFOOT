import {
  Club,
  EuropeanCupId,
  EuropeanLeagueId,
  Fixture,
  GameSave,
  SouthAmericanCupId,
  SouthAmericanLeagueId,
  Standing,
  WorldCupId,
  WorldLeagueId,
} from '../types/game';
import {
  EUROPEAN_LEAGUE_IDS,
  EUROPEAN_LEAGUES_META,
  generateAllEuropeanLeagues,
} from './europeLeaguesEngine';
import { generateAllEnglishCupsFixtures } from './englishCupsEngine';
import {
  EUROPEAN_CUP_IDS,
  generateAllEuropeanCupsFixtures,
} from './europeanCupsEngine';
import {
  SOUTH_AMERICAN_LEAGUE_IDS,
  SOUTH_AMERICAN_LEAGUES_META,
  generateAllSouthAmericanLeagues,
} from './southAmericaLeaguesEngine';
import {
  SOUTH_AMERICAN_CUP_IDS,
  generateAllSouthAmericanCupsFixtures,
} from './southAmericanCupsEngine';
import {
  JAN_DEC_WORLD_LEAGUE_IDS,
  SPLIT_YEAR_WORLD_LEAGUE_IDS,
  WORLD_LEAGUE_IDS,
  WORLD_LEAGUES_META,
  generateAllWorldLeaguesData,
  isSplitCalendarClub,
  isSplitYearWorldLeague,
} from './worldLeaguesEngine';
import {
  JAN_DEC_WORLD_CUP_IDS,
  SPLIT_YEAR_WORLD_CUP_IDS,
  WORLD_CUP_IDS,
  generateAllWorldCupsFixtures,
} from './worldCupsEngine';
import {
  flattenSouthAmericaFixtures,
  recomputeAllStandings,
  resolveCupChampionId,
  syncDynamicKnockoutBrackets,
} from './multiLeagueEngine';
import {
  generateChampionsLeagueFixtures,
  generateConferenceLeagueFixtures,
  generateEuropaLeagueFixtures,
  generateUefaSupercupFixtures,
} from './competitionsEngine';
import { resolveCrossCompetitionScheduleConflicts } from './scheduleConflictResolver';
import { addDays } from './calendarUtils';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const EUROPEAN_CUP_MIN_COUNTS: Record<EuropeanCupId, number> = {
  esp_copa_del_rey: 133,
  esp_supercopa: 3,
  ger_dfb_pokal: 125,
  ger_supercup: 1,
  fra_coupe_de_france: 109,
  fra_trophee_champions: 1,
  ita_coppa_italia: 85,
  ita_supercoppa: 1,
  por_taca_portugal: 31,
  por_taca_liga: 7,
  por_supertaca: 1,
  ned_knvb_beker: 17,
  ned_johan_cruyff: 1,
  bel_croky_cup: 19,
  bel_supercup: 1,
  tur_turkiye_kupasi: 17,
  tur_super_kupa: 1,
  gre_kypello_elladas: 15,
  nor_nm_cup: 15,
  den_dbu_pokalen: 13,
  sui_schweizer_cup: 11,
  swe_svenska_cupen: 15,
  sco_scottish_cup: 11,
  eu_sp1_cup: 15,
  eu_sp2_cup: 15,
};

const SA_CUP_MIN_COUNTS: Record<SouthAmericanCupId, number> = {
  sa_copa_argentina: 15,
  sa_supercopa_argentina: 1,
  sa_copa_colombia: 17,
  sa_superliga_colombia: 1,
  sa_copa_uruguay: 17,
  sa_supercopa_uruguay: 1,
  sa_copa_ecuador: 17,
  sa_supercopa_ecuador: 1,
  sa_copa_chile: 17,
  sa_supercopa_chile: 1,
  sa_copa_paraguay: 11,
  sa_supercopa_paraguay: 1,
  sa_copa_peru: 17,
  sa_supercopa_peru: 1,
  sa_copa_bolivia: 17,
  sa_supercopa_bolivia: 1,
  sa_copa_venezuela: 15,
  sa_supercopa_venezuela: 1,
};

const WORLD_CUP_MIN_COUNTS: Record<WorldCupId, number> = {
  wl_cup_usa: 29,
  wl_cup_mex: 17,
  wl_cup_can: 10,
  wl_cup_sau: 17,
  wl_cup_jpn: 19,
  wl_cup_rus: 17,
  wl_cup_egy: 17,
  wl_cup_mar: 15,
};

function isValidIsoDate(d?: string): d is string {
  return Boolean(d && ISO_DATE_RE.test(d));
}

export function hasSameDayTeamCollision(list: Fixture[]): boolean {
  const seen = new Set<string>();
  for (const f of list) {
    if (!f.date) continue;
    for (const tid of [f.homeTeamId, f.awayTeamId]) {
      if (!tid || tid === 'tbd' || tid.startsWith('TBD')) continue;
      const k = `${tid}::${f.date}`;
      if (seen.has(k)) return true;
      seen.add(k);
    }
  }
  return false;
}

function isFixturePoolHealthy(
  list: Fixture[] | undefined,
  minCount: number,
  minDate: string,
  maxDate: string,
  checkSameDayCollision: boolean
): boolean {
  if (!Array.isArray(list) || list.length < minCount) return false;
  const maxDateWithGrace = addDays(maxDate, 14);
  for (const f of list) {
    if (!isValidIsoDate(f.date) || !f.time) return false;
    if (!f.played && (f.date < minDate || f.date > maxDateWithGrace)) return false;
  }
  if (checkSameDayCollision && hasSameDayTeamCollision(list)) return false;
  return true;
}

function getLeagueMinFixtures(clubsCount: number, totalRounds: number): number {
  return Math.floor(clubsCount / 2) * totalRounds;
}

function mergeLeaguePoolWithTemplate(
  template: Fixture[],
  savedList: Fixture[] | undefined,
  minDate: string,
  maxDate: string
): Fixture[] {
  if (!Array.isArray(savedList) || savedList.length === 0) return template;

  const hasValidInSeasonPlayed = savedList.some(
    (f) => f.played && isValidIsoDate(f.date) && f.date >= minDate && f.date <= maxDate
  );
  if (!hasValidInSeasonPlayed) return template;

  const savedById = new Map<string, Fixture>(savedList.map((f) => [f.id, f]));
  const merged = template.map((tmpl) => {
    const prev = savedById.get(tmpl.id);
    if (!prev) return tmpl;
    if (prev.played && isValidIsoDate(prev.date) && prev.date >= minDate && prev.date <= maxDate) {
      return {
        ...prev,
        time: prev.time || tmpl.time,
      };
    }
    const prevDateOk =
      isValidIsoDate(prev.date) && prev.date >= minDate && prev.date <= maxDate;
    return {
      ...prev,
      round: tmpl.round,
      date: prevDateOk ? prev.date : tmpl.date,
      time: prev.time || tmpl.time,
      groupName: prev.groupName || tmpl.groupName,
    };
  });

  // Append any extra playoff fixtures saved in multi-stage leagues (e.g. Championship/League 1/League 2)
  const templateIds = new Set(template.map((f) => f.id));
  for (const extra of savedList) {
    if (
      !templateIds.has(extra.id) &&
      isValidIsoDate(extra.date) &&
      extra.date >= minDate &&
      extra.date <= maxDate
    ) {
      merged.push(extra);
    }
  }

  return merged;
}

function mergeCupPoolWithTemplate(
  template: Fixture[],
  savedList: Fixture[] | undefined,
  minDate: string,
  maxDate: string
): Fixture[] {
  if (!Array.isArray(savedList) || savedList.length === 0) return template;

  const hasValidInSeasonPlayed = savedList.some(
    (f) => f.played && isValidIsoDate(f.date) && f.date >= minDate && f.date <= maxDate
  );
  if (!hasValidInSeasonPlayed) return template;

  const savedById = new Map<string, Fixture>(savedList.map((f) => [f.id, f]));
  return template.map((tmpl) => {
    const prev = savedById.get(tmpl.id);
    if (!prev) return tmpl;
    if (prev.played && isValidIsoDate(prev.date) && prev.date >= minDate && prev.date <= maxDate) {
      return {
        ...prev,
        round: tmpl.round,
        cupPhase: prev.cupPhase || tmpl.cupPhase,
        time: prev.time || tmpl.time,
      };
    }
    const prevDateOk =
      isValidIsoDate(prev.date) && prev.date >= minDate && prev.date <= maxDate;
    return {
      ...prev,
      round: tmpl.round,
      date: prevDateOk ? prev.date : tmpl.date,
      time: prev.time || tmpl.time,
      cupPhase: prev.cupPhase || tmpl.cupPhase,
    };
  });
}

function hasAnyMissingDateOrTime(list: Fixture[] | undefined): boolean {
  if (!Array.isArray(list) || list.length === 0) return true;
  return list.some((f) => !isValidIsoDate(f.date) || !f.time);
}

/**
 * Ensures all European national leagues, English & European domestic cups,
 * and cross-continent domestic leagues/cups exist on `GameSave` with valid
 * dates, times, standings, and synced knockout brackets for the active season.
 *
 * Fast-path: returns `state` untouched in <1ms when all pools are healthy.
 */
export function ensureEuropeanAndDomesticSchedulesInSave(state: GameSave): GameSave {
  if (!state || !Array.isArray(state.clubs) || state.clubs.length === 0) {
    return state;
  }

  const userClub = state.clubs.find((c) => c.id === state.userClubId) || state.clubs[0];
  const isUserSplit = isSplitCalendarClub(userClub);
  const calYear = isValidIsoDate(state.currentDate)
    ? Number(state.currentDate.slice(0, 4))
    : state.currentSeasonYear || 2026;

  const saYear =
    state.saSeasonYear ?? (isUserSplit ? calYear : state.currentSeasonYear || 2026);
  const euYear =
    state.europeSeasonYear ??
    (isUserSplit
      ? state.currentSeasonYear || 2026
      : state.currentDate && state.currentDate < `${calYear}-07-20`
      ? calYear - 1
      : calYear);

  const euMinDate = `${euYear}-07-10`;
  const euMaxDate = `${euYear + 1}-06-30`;
  const saMinDate = `${saYear}-01-01`;
  const saMaxDate = `${saYear}-12-31`;

  // 1. Identify which European national leagues need repair
  const brokenEuLeagues: EuropeanLeagueId[] = [];
  for (const leagueId of EUROPEAN_LEAGUE_IDS) {
    const meta = EUROPEAN_LEAGUES_META[leagueId];
    const fixList = state.fixturesEurope?.[leagueId];
    const stdList = state.standingsEurope?.[leagueId];
    const minFix = getLeagueMinFixtures(meta.clubsCount, meta.totalRounds);
    const fixOk = isFixturePoolHealthy(fixList, minFix, euMinDate, euMaxDate, true);
    const stdOk = Array.isArray(stdList) && stdList.length >= meta.clubsCount;
    if (!fixOk || !stdOk) {
      brokenEuLeagues.push(leagueId);
    }
  }

  // 2. Identify broken English domestic cups
  const needsCommunityShield = !isFixturePoolHealthy(
    state.fixturesEngCommunityShield,
    1,
    euMinDate,
    euMaxDate,
    false
  );
  const needsEflCup = !isFixturePoolHealthy(
    state.fixturesEngEflCup,
    93,
    euMinDate,
    euMaxDate,
    false
  );
  const needsFaCup = !isFixturePoolHealthy(
    state.fixturesEngFaCup,
    123,
    euMinDate,
    euMaxDate,
    false
  );

  // 3. Identify broken European domestic cups
  const brokenEuCups: EuropeanCupId[] = [];
  for (const cupId of EUROPEAN_CUP_IDS) {
    const fixList = state.fixturesEuropeanCups?.[cupId];
    if (
      !isFixturePoolHealthy(
        fixList,
        EUROPEAN_CUP_MIN_COUNTS[cupId],
        euMinDate,
        euMaxDate,
        false
      )
    ) {
      brokenEuCups.push(cupId);
    }
  }

  // 4. Check UEFA continental cups for empty / undated / missing-time issues
  const needsUclRepair = hasAnyMissingDateOrTime(state.fixturesChampionsLeague);
  const needsUelRepair = hasAnyMissingDateOrTime(state.fixturesEuropaLeague);
  const needsUeclRepair = hasAnyMissingDateOrTime(state.fixturesConferenceLeague);
  const needsUefaSupercupRepair = !isFixturePoolHealthy(
    state.fixturesUefaSupercup,
    1,
    euMinDate,
    euMaxDate,
    false
  );

  // 5. Identify broken World Leagues & World Cups (North America, Africa, Asia, Russia)
  const brokenWlJanDec: WorldLeagueId[] = [];
  const brokenWlSplit: WorldLeagueId[] = [];
  for (const leagueId of WORLD_LEAGUE_IDS) {
    const meta = WORLD_LEAGUES_META[leagueId];
    const isSplit = isSplitYearWorldLeague(leagueId);
    const fixList = state.fixturesWorldLeagues?.[leagueId];
    const stdList = state.standingsWorldLeagues?.[leagueId];
    const minFix = getLeagueMinFixtures(meta.clubsCount, meta.totalRounds);
    const fixOk = isFixturePoolHealthy(
      fixList,
      minFix,
      isSplit ? euMinDate : saMinDate,
      isSplit ? euMaxDate : saMaxDate,
      true
    );
    const stdOk = Array.isArray(stdList) && stdList.length >= meta.clubsCount;
    if (!fixOk || !stdOk) {
      if (isSplit) brokenWlSplit.push(leagueId);
      else brokenWlJanDec.push(leagueId);
    }
  }

  const brokenWlCupsJanDec: WorldCupId[] = [];
  const brokenWlCupsSplit: WorldCupId[] = [];
  for (const cupId of JAN_DEC_WORLD_CUP_IDS) {
    if (
      !isFixturePoolHealthy(
        state.fixturesWorldCups?.[cupId],
        WORLD_CUP_MIN_COUNTS[cupId],
        saMinDate,
        saMaxDate,
        false
      )
    ) {
      brokenWlCupsJanDec.push(cupId);
    }
  }
  for (const cupId of SPLIT_YEAR_WORLD_CUP_IDS) {
    if (
      !isFixturePoolHealthy(
        state.fixturesWorldCups?.[cupId],
        WORLD_CUP_MIN_COUNTS[cupId],
        euMinDate,
        euMaxDate,
        false
      )
    ) {
      brokenWlCupsSplit.push(cupId);
    }
  }

  // 6. Identify broken South American leagues & cups
  const brokenSaLeagues: SouthAmericanLeagueId[] = [];
  for (const leagueId of SOUTH_AMERICAN_LEAGUE_IDS) {
    const meta = SOUTH_AMERICAN_LEAGUES_META[leagueId];
    const fixList = state.fixturesSouthAmerica?.[leagueId];
    const stdList = state.standingsSouthAmerica?.[leagueId];
    const minFix = getLeagueMinFixtures(meta.clubsCount, meta.totalRounds);
    const fixOk = isFixturePoolHealthy(fixList, minFix, saMinDate, saMaxDate, true);
    const stdOk = Array.isArray(stdList) && stdList.length >= meta.clubsCount;
    if (!fixOk || !stdOk) {
      brokenSaLeagues.push(leagueId);
    }
  }

  const brokenSaCups: SouthAmericanCupId[] = [];
  for (const cupId of SOUTH_AMERICAN_CUP_IDS) {
    if (
      !isFixturePoolHealthy(
        state.fixturesSouthAmericanCups?.[cupId],
        SA_CUP_MIN_COUNTS[cupId],
        saMinDate,
        saMaxDate,
        false
      )
    ) {
      brokenSaCups.push(cupId);
    }
  }

  const anyRepairNeeded =
    brokenEuLeagues.length > 0 ||
    needsCommunityShield ||
    needsEflCup ||
    needsFaCup ||
    brokenEuCups.length > 0 ||
    needsUclRepair ||
    needsUelRepair ||
    needsUeclRepair ||
    needsUefaSupercupRepair ||
    brokenWlJanDec.length > 0 ||
    brokenWlSplit.length > 0 ||
    brokenWlCupsJanDec.length > 0 ||
    brokenWlCupsSplit.length > 0 ||
    brokenSaLeagues.length > 0 ||
    brokenSaCups.length > 0;

  if (!anyRepairNeeded) {
    return resolveCrossCompetitionScheduleConflicts(state);
  }

  let nextFixturesEurope: Partial<Record<EuropeanLeagueId, Fixture[]>> = {
    ...(state.fixturesEurope || {}),
  };
  let nextStandingsEurope: Partial<Record<EuropeanLeagueId, Standing[]>> = {
    ...(state.standingsEurope || {}),
  };

  if (brokenEuLeagues.length > 0) {
    const euTemplates = generateAllEuropeanLeagues(state.clubs, euYear);
    for (const leagueId of brokenEuLeagues) {
      const tmplFix = euTemplates.fixturesEurope[leagueId] || [];
      const tmplStd = euTemplates.standingsEurope[leagueId] || [];
      nextFixturesEurope[leagueId] = mergeLeaguePoolWithTemplate(
        tmplFix,
        state.fixturesEurope?.[leagueId],
        euMinDate,
        euMaxDate
      );
      nextStandingsEurope[leagueId] = tmplStd;
    }
  }

  let nextFixturesEngShield = state.fixturesEngCommunityShield || [];
  let nextFixturesEngEfl = state.fixturesEngEflCup || [];
  let nextFixturesEngFa = state.fixturesEngFaCup || [];

  if (needsCommunityShield || needsEflCup || needsFaCup) {
    const engTemplates = generateAllEnglishCupsFixtures(state.clubs, euYear, {
      fixturesEurope: nextFixturesEurope,
      plChampionId: nextStandingsEurope.eng_premier?.[0]?.teamId,
      faCupChampionId: resolveCupChampionId(state.fixturesEngFaCup),
    });
    if (needsCommunityShield) {
      nextFixturesEngShield = mergeCupPoolWithTemplate(
        engTemplates.fixturesEngCommunityShield,
        state.fixturesEngCommunityShield,
        euMinDate,
        euMaxDate
      );
    }
    if (needsEflCup) {
      nextFixturesEngEfl = mergeCupPoolWithTemplate(
        engTemplates.fixturesEngEflCup,
        state.fixturesEngEflCup,
        euMinDate,
        euMaxDate
      );
    }
    if (needsFaCup) {
      nextFixturesEngFa = mergeCupPoolWithTemplate(
        engTemplates.fixturesEngFaCup,
        state.fixturesEngFaCup,
        euMinDate,
        euMaxDate
      );
    }
  }

  let nextFixturesEuropeanCups: Partial<Record<EuropeanCupId, Fixture[]>> = {
    ...(state.fixturesEuropeanCups || {}),
  };
  if (brokenEuCups.length > 0) {
    const euCupTemplates = generateAllEuropeanCupsFixtures(state.clubs, euYear, {
      fixturesEurope: nextFixturesEurope,
    });
    for (const cupId of brokenEuCups) {
      nextFixturesEuropeanCups[cupId] = mergeCupPoolWithTemplate(
        euCupTemplates[cupId] || [],
        state.fixturesEuropeanCups?.[cupId],
        euMinDate,
        euMaxDate
      );
    }
  }

  let nextFixturesUcl = state.fixturesChampionsLeague || [];
  let nextStandingsUcl = state.standingsChampionsLeague || [];
  const nextFixturesUefaSupercup = needsUefaSupercupRepair
    ? mergeCupPoolWithTemplate(
        generateUefaSupercupFixtures(
          state.clubs,
          euYear,
          state.reigningUclChampId || resolveCupChampionId(state.fixturesChampionsLeague),
          state.reigningUelChampId || resolveCupChampionId(state.fixturesEuropaLeague)
        ),
        state.fixturesUefaSupercup,
        euMinDate,
        euMaxDate
      )
    : state.fixturesUefaSupercup || [];
  if (needsUclRepair) {
    const uclTmpl = generateChampionsLeagueFixtures(
      state.clubs,
      euYear,
      undefined,
      state.reigningUclChampId
    );
    nextFixturesUcl = mergeCupPoolWithTemplate(
      uclTmpl.fixtures,
      state.fixturesChampionsLeague,
      euMinDate,
      euMaxDate
    );
    if (!Array.isArray(nextStandingsUcl) || nextStandingsUcl.length < 36) {
      nextStandingsUcl = uclTmpl.standings;
    }
  }

  let nextFixturesUel = state.fixturesEuropaLeague || [];
  let nextStandingsUel = state.standingsEuropaLeague || [];
  if (needsUelRepair) {
    const uelTmpl = generateEuropaLeagueFixtures(
      state.clubs,
      euYear,
      undefined,
      state.reigningUelChampId
    );
    nextFixturesUel = mergeCupPoolWithTemplate(
      uelTmpl.fixtures,
      state.fixturesEuropaLeague,
      euMinDate,
      euMaxDate
    );
    if (!Array.isArray(nextStandingsUel) || nextStandingsUel.length < 36) {
      nextStandingsUel = uelTmpl.standings;
    }
  }

  let nextFixturesUecl = state.fixturesConferenceLeague || [];
  let nextStandingsUecl = state.standingsConferenceLeague || [];
  if (needsUeclRepair) {
    const ueclTmpl = generateConferenceLeagueFixtures(
      state.clubs,
      euYear,
      undefined,
      state.reigningUeclChampId
    );
    nextFixturesUecl = mergeCupPoolWithTemplate(
      ueclTmpl.fixtures,
      state.fixturesConferenceLeague,
      euMinDate,
      euMaxDate
    );
    if (!Array.isArray(nextStandingsUecl) || nextStandingsUecl.length < 36) {
      nextStandingsUecl = ueclTmpl.standings;
    }
  }

  let nextFixturesWorldLeagues: Partial<Record<WorldLeagueId, Fixture[]>> = {
    ...(state.fixturesWorldLeagues || {}),
  };
  let nextStandingsWorldLeagues: Partial<Record<WorldLeagueId, Standing[]>> = {
    ...(state.standingsWorldLeagues || {}),
  };

  if (brokenWlJanDec.length > 0) {
    const wlJanTemplates = generateAllWorldLeaguesData(
      state.clubs,
      saYear,
      JAN_DEC_WORLD_LEAGUE_IDS
    );
    for (const leagueId of brokenWlJanDec) {
      nextFixturesWorldLeagues[leagueId] = mergeLeaguePoolWithTemplate(
        wlJanTemplates.fixturesWorldLeagues[leagueId] || [],
        state.fixturesWorldLeagues?.[leagueId],
        saMinDate,
        saMaxDate
      );
      nextStandingsWorldLeagues[leagueId] =
        wlJanTemplates.standingsWorldLeagues[leagueId] || [];
    }
  }

  if (brokenWlSplit.length > 0) {
    const wlSplitTemplates = generateAllWorldLeaguesData(
      state.clubs,
      euYear,
      SPLIT_YEAR_WORLD_LEAGUE_IDS
    );
    for (const leagueId of brokenWlSplit) {
      nextFixturesWorldLeagues[leagueId] = mergeLeaguePoolWithTemplate(
        wlSplitTemplates.fixturesWorldLeagues[leagueId] || [],
        state.fixturesWorldLeagues?.[leagueId],
        euMinDate,
        euMaxDate
      );
      nextStandingsWorldLeagues[leagueId] =
        wlSplitTemplates.standingsWorldLeagues[leagueId] || [];
    }
  }

  let nextFixturesWorldCups: Partial<Record<WorldCupId, Fixture[]>> = {
    ...(state.fixturesWorldCups || {}),
  };
  if (brokenWlCupsJanDec.length > 0) {
    const wlCupJanTemplates = generateAllWorldCupsFixtures(state.clubs, saYear, euYear, {
      targetCupIds: brokenWlCupsJanDec,
      fixturesWorldLeagues: nextFixturesWorldLeagues,
      fixturesConcacafChampions: state.fixturesConcacafChampions,
      fixturesCopaInternacional: state.fixturesCopaInternacional,
    });
    for (const cupId of brokenWlCupsJanDec) {
      nextFixturesWorldCups[cupId] = mergeCupPoolWithTemplate(
        wlCupJanTemplates[cupId] || [],
        state.fixturesWorldCups?.[cupId],
        saMinDate,
        saMaxDate
      );
    }
  }
  if (brokenWlCupsSplit.length > 0) {
    const wlCupSplitTemplates = generateAllWorldCupsFixtures(state.clubs, saYear, euYear, {
      targetCupIds: brokenWlCupsSplit,
      fixturesWorldLeagues: nextFixturesWorldLeagues,
      fixturesAfcChampions: state.fixturesAfcChampions,
      fixturesCopaInternacional: state.fixturesCopaInternacional,
    });
    for (const cupId of brokenWlCupsSplit) {
      nextFixturesWorldCups[cupId] = mergeCupPoolWithTemplate(
        wlCupSplitTemplates[cupId] || [],
        state.fixturesWorldCups?.[cupId],
        euMinDate,
        euMaxDate
      );
    }
  }

  let nextFixturesSouthAmerica: Partial<Record<SouthAmericanLeagueId, Fixture[]>> = {
    ...(state.fixturesSouthAmerica || {}),
  };
  let nextStandingsSouthAmerica: Partial<Record<SouthAmericanLeagueId, Standing[]>> = {
    ...(state.standingsSouthAmerica || {}),
  };
  if (brokenSaLeagues.length > 0) {
    const saTemplates = generateAllSouthAmericanLeagues(state.clubs, saYear);
    for (const leagueId of brokenSaLeagues) {
      nextFixturesSouthAmerica[leagueId] = mergeLeaguePoolWithTemplate(
        saTemplates.fixturesSouthAmerica[leagueId] || [],
        state.fixturesSouthAmerica?.[leagueId],
        saMinDate,
        saMaxDate
      );
      nextStandingsSouthAmerica[leagueId] =
        saTemplates.standingsSouthAmerica[leagueId] || [];
    }
  }

  let nextFixturesSouthAmericanCups: Partial<Record<SouthAmericanCupId, Fixture[]>> = {
    ...(state.fixturesSouthAmericanCups || {}),
  };
  if (brokenSaCups.length > 0) {
    const saCupTemplates = generateAllSouthAmericanCupsFixtures(
      state.clubs,
      saYear,
      flattenSouthAmericaFixtures(nextFixturesSouthAmerica)
    );
    for (const cupId of brokenSaCups) {
      nextFixturesSouthAmericanCups[cupId] = mergeCupPoolWithTemplate(
        saCupTemplates[cupId] || [],
        state.fixturesSouthAmericanCups?.[cupId],
        saMinDate,
        saMaxDate
      );
    }
  }

  const repairedDraft: GameSave = {
    ...state,
    fixturesEurope: nextFixturesEurope,
    standingsEurope: nextStandingsEurope,
    fixturesEngCommunityShield: nextFixturesEngShield,
    fixturesEngEflCup: nextFixturesEngEfl,
    fixturesEngFaCup: nextFixturesEngFa,
    fixturesEuropeanCups: nextFixturesEuropeanCups,
    fixturesChampionsLeague: nextFixturesUcl,
    standingsChampionsLeague: nextStandingsUcl,
    fixturesEuropaLeague: nextFixturesUel,
    standingsEuropaLeague: nextStandingsUel,
    fixturesConferenceLeague: nextFixturesUecl,
    standingsConferenceLeague: nextStandingsUecl,
    fixturesUefaSupercup: nextFixturesUefaSupercup,
    fixturesWorldLeagues: nextFixturesWorldLeagues,
    standingsWorldLeagues: nextStandingsWorldLeagues,
    fixturesWorldCups: nextFixturesWorldCups,
    fixturesSouthAmerica: nextFixturesSouthAmerica,
    standingsSouthAmerica: nextStandingsSouthAmerica,
    fixturesSouthAmericanCups: nextFixturesSouthAmericanCups,
  };

  const recomputed = recomputeAllStandings(repairedDraft);
  const syncedBrackets = syncDynamicKnockoutBrackets({
    clubs: repairedDraft.clubs,
    currentDate: repairedDraft.currentDate,
    fixturesCopaBrasil: repairedDraft.fixturesCopaBrasil || [],
    fixturesLibertadores: repairedDraft.fixturesLibertadores || [],
    fixturesSulamericana: repairedDraft.fixturesSulamericana || [],
    fixturesEstadual: repairedDraft.fixturesEstadual || [],
    fixturesCopaNordeste: repairedDraft.fixturesCopaNordeste || [],
    fixturesCopaVerde: repairedDraft.fixturesCopaVerde || [],
    fixturesC: repairedDraft.fixturesC || [],
    fixturesD: repairedDraft.fixturesD || [],
    fixturesIntercontinental: repairedDraft.fixturesIntercontinental || [],
    fixturesChampionsLeague: repairedDraft.fixturesChampionsLeague || [],
    fixturesEuropaLeague: repairedDraft.fixturesEuropaLeague || [],
    fixturesConferenceLeague: repairedDraft.fixturesConferenceLeague || [],
    fixturesCopaInternacional: repairedDraft.fixturesCopaInternacional || [],
    fixturesConcacafChampions: repairedDraft.fixturesConcacafChampions || [],
    fixturesAfcChampions: repairedDraft.fixturesAfcChampions || [],
    fixturesSuperMundial: repairedDraft.fixturesSuperMundial || [],
    fixturesEngCommunityShield: repairedDraft.fixturesEngCommunityShield,
    fixturesEngEflCup: repairedDraft.fixturesEngEflCup,
    fixturesEngFaCup: repairedDraft.fixturesEngFaCup,
    fixturesEuropeanCups: repairedDraft.fixturesEuropeanCups,
    fixturesSouthAmericanCups: repairedDraft.fixturesSouthAmericanCups,
    fixturesEurope: repairedDraft.fixturesEurope,
    fixturesWorldLeagues: repairedDraft.fixturesWorldLeagues,
    fixturesWorldCups: repairedDraft.fixturesWorldCups,
    standingsLibertadores: recomputed.standingsLibertadores,
    standingsSulamericana: recomputed.standingsSulamericana,
    standingsEstadual: recomputed.standingsEstadual,
    standingsCopaNordeste: recomputed.standingsCopaNordeste,
    standingsCopaVerde: recomputed.standingsCopaVerde,
    standingsC: recomputed.standingsC,
    standingsD: recomputed.standingsD,
    standingsChampionsLeague: recomputed.standingsChampionsLeague,
    standingsEuropaLeague: recomputed.standingsEuropaLeague,
    standingsConferenceLeague: recomputed.standingsConferenceLeague,
    standingsCopaInternacional: recomputed.standingsCopaInternacional,
    standingsAfcChampions: recomputed.standingsAfcChampions,
    standingsSuperMundial: recomputed.standingsSuperMundial,
    standingsEurope: recomputed.standingsEurope,
    standingsWorldLeagues: recomputed.standingsWorldLeagues,
  });

  return resolveCrossCompetitionScheduleConflicts({
    ...repairedDraft,
    ...recomputed,
    ...syncedBrackets,
  });
}

import {
  Club,
  Fixture,
  InboxMessage,
  MatchEvent,
  MatchStats,
  Player,
  PreMatchDerbyPosture,
} from '../types/game';
import { getClubSectorRatings } from './clubRatingsEngine';
import { getMatchRivalryInfo } from './rivalryEngine';
import { sanitizeLineupForCompetition } from './suspensionEngine';
import { diagnosePlayerInjury } from './medicalEngine';
import { GameSettings } from './settingsEngine';
import { computeClubStaffBonuses } from './coachingCarouselEngine';
import {
  calculateMatchDayEconomics,
  recordFinanceLedgerMutation,
} from './financialFairPlayEngine';
import { isEuropeanCup } from './europeanCupsEngine';
import { isSouthAmericanCup } from './southAmericanCupsEngine';
import { isWorldCup } from './worldCupsEngine';
import {
  applyPostMatchRatingsToSquad,
  computeLiveMatchRatings,
  pickManOfTheMatch,
  resolveActiveTakersOnPitch,
} from './matchExperienceEngine';

export interface InstantMatchExecutionResult {
  completedUserFixture: Fixture;
  otherMatches: Fixture[];
  updatedClubs: Club[];
  matchMedicalMessages: InboxMessage[];
  homeClub: Club;
  awayClub: Club;
  manOfTheMatchLabel: string;
}

function isKnockoutCompetitionFixture(fix: Fixture): boolean {
  const comp = fix.competition;
  if (
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
    isWorldCup(comp)
  ) {
    return true;
  }
  const phase = (fix.cupPhase || '').toLowerCase();
  return (
    phase.includes('playoff') ||
    phase.includes('1ª fase') ||
    phase.includes('2ª fase') ||
    phase.includes('3ª fase') ||
    phase.includes('4ª fase') ||
    phase.includes('5ª fase') ||
    phase.includes('1ª rodada') ||
    phase.includes('2ª rodada') ||
    phase.includes('preliminar') ||
    phase.includes('wild card') ||
    phase.includes('primeira rodada') ||
    phase.includes('oitavas') ||
    phase.includes('quartas') ||
    phase.includes('semi') ||
    phase.includes('final') ||
    phase.includes('decisão') ||
    phase.includes('derby') ||
    phase.includes('challenger')
  );
}

function simulateQuickCpuFixture(fix: Fixture, clubsMap: Map<string, Club>): Fixture {
  if (fix.played) return fix;
  const hClub = clubsMap.get(fix.homeTeamId);
  const aClub = clubsMap.get(fix.awayTeamId);
  const hOvr = hClub ? getClubSectorRatings(hClub).overall : 72;
  const aOvr = aClub ? getClubSectorRatings(aClub).overall : 72;

  const diff = hOvr + 2.5 - aOvr;
  const expH = Math.max(0.35, 1.35 + diff * 0.065);
  const expA = Math.max(0.25, 1.05 - diff * 0.055);

  let homeScore = 0;
  let awayScore = 0;
  const events: MatchEvent[] = [];

  for (let i = 0; i < 6; i++) {
    if (Math.random() < expH / 6) homeScore++;
    if (Math.random() < expA / 6) awayScore++;
  }

  const addQuickScorers = (club: Club | undefined, count: number, isHome: boolean) => {
    if (!club || count <= 0) return;
    const starters = club.squad.filter((p) => p.isStarter && p.position !== 'GK');
    const pool = starters.length > 0 ? starters : club.squad.filter((p) => p.position !== 'GK');
    for (let g = 0; g < count; g++) {
      const weighted = pool.flatMap((p) =>
        p.position === 'FW' ? [p, p, p, p] : p.position === 'MF' ? [p, p] : [p]
      );
      const scorer = weighted[Math.floor(Math.random() * weighted.length)] || pool[0];
      const assisterPool = pool.filter((p) => p.id !== scorer?.id);
      const assister =
        assisterPool.length > 0 && Math.random() < 0.68
          ? assisterPool[Math.floor(Math.random() * assisterPool.length)]
          : undefined;
      const min = Math.min(90, Math.max(2, Math.floor(Math.random() * 88) + 2));
      if (scorer) {
        events.push({
          id: `cpu_inst_g_${fix.id}_${g}_${min}`,
          minute: min,
          type: 'GOL',
          teamId: club.id,
          playerId: scorer.id,
          playerName: scorer.name,
          assistPlayerId: assister?.id,
          assistPlayerName: assister?.name,
          description: `Gol do ${club.shortName}: ${scorer.name} aos ${min}'`,
          isHomeTeam: isHome,
        });
      }
    }
  };

  addQuickScorers(hClub, homeScore, true);
  addQuickScorers(aClub, awayScore, false);
  events.sort((a, b) => a.minute - b.minute);

  let penaltiesHome: number | undefined;
  let penaltiesAway: number | undefined;
  let aggregateWinnerId: string | undefined;

  if (isKnockoutCompetitionFixture(fix) && fix.leg !== 1 && homeScore === awayScore && !fix.leg) {
    penaltiesHome = 4;
    penaltiesAway = 4;
    if (Math.random() < 0.52) penaltiesHome = 5;
    else penaltiesAway = 5;
    aggregateWinnerId = penaltiesHome > penaltiesAway ? fix.homeTeamId : fix.awayTeamId;
  }

  let attendance: number;
  let ticketRevenue: number;
  if (hClub && aClub) {
    const econ = calculateMatchDayEconomics(hClub, aClub, {
      isKnockout: isKnockoutCompetitionFixture(fix),
      randomJitter: (Math.random() - 0.5) * 0.08,
    });
    attendance = econ.attendance;
    ticketRevenue = econ.totalMatchIncome;
  } else {
    const cap = hClub?.stadium.capacity || 28000;
    attendance = Math.round(cap * (0.62 + Math.random() * 0.28));
    ticketRevenue = attendance * (hClub?.stadium.ticketPrice || 50);
  }

  return {
    ...fix,
    homeScore,
    awayScore,
    played: true,
    attendance,
    ticketRevenue,
    events,
    penaltiesHome,
    penaltiesAway,
    aggregateWinnerId,
  };
}

/**
 * Executes a full 1-click Instant Match for the user's upcoming club fixture,
 * including tactical weights, auto-substitutions, yellow/red cards, injuries,
 * knockout aggregate/penalty shootout resolution, and simultaneous CPU fixtures.
 */
export function executeInstantUserMatch(params: {
  userClub: Club;
  allClubs: Club[];
  userFixture: Fixture;
  currentRoundFixtures: Fixture[];
  allFixtures: Fixture[];
  gameSettings: GameSettings;
  preMatchDerbyPosture?: PreMatchDerbyPosture;
  fanConfidence?: number;
}): InstantMatchExecutionResult {
  const {
    userClub,
    allClubs,
    userFixture,
    currentRoundFixtures,
    allFixtures,
    gameSettings,
    preMatchDerbyPosture = 'PADRAO',
    fanConfidence = 68,
  } = params;

  const clubsMap = new Map(allClubs.map((c) => [c.id, c]));
  const rawHome = clubsMap.get(userFixture.homeTeamId) || userClub;
  const rawAway = clubsMap.get(userFixture.awayTeamId) || allClubs.find((c) => c.id !== rawHome.id)!;

  const { sanitizedSquad: homeSanitized } = sanitizeLineupForCompetition(
    rawHome.squad,
    userFixture.competition
  );
  const { sanitizedSquad: awaySanitized } = sanitizeLineupForCompetition(
    rawAway.squad,
    userFixture.competition
  );

  let currentHomeClub: Club = { ...rawHome, squad: homeSanitized };
  let currentAwayClub: Club = { ...rawAway, squad: awaySanitized };

  const isUserHome = currentHomeClub.id === userClub.id;
  const opponentClub = isUserHome ? currentAwayClub : currentHomeClub;
  const rivalryInfo = getMatchRivalryInfo(userClub, opponentClub);

  const homeRatings = getClubSectorRatings(currentHomeClub);
  const awayRatings = getClubSectorRatings(currentAwayClub);

  const mentalityShift = (club: Club): number => {
    const m = club.tactics.mentality;
    if (m === 'Pressão Total') return 0.014;
    if (m === 'Ofensivo') return 0.008;
    if (m === 'Defensivo') return -0.007;
    if (m === 'Muito Defensivo') return -0.013;
    return 0;
  };

  const setPieceRoutineBonus = (club: Club): number => {
    let bonus = computeClubStaffBonuses(club).setPieceBonus;
    if (club.tactics.cornerRoutine === 'CURTO_ENSAIADO' && club.tactics.passing === 'Curto (Posse)') {
      bonus += 0.004;
    } else if (
      (club.tactics.cornerRoutine === 'PRIMEIRO_PAU' || club.tactics.cornerRoutine === 'SEGUNDO_PAU') &&
      club.squad.some((p) => p.isStarter && p.detailedRole === 'ZAG' && p.overall >= 78)
    ) {
      bonus += 0.003;
    }
    if (club.tactics.freekickRoutine === 'JOGADA_ENSAIADA') {
      bonus += 0.002;
    }
    return bonus;
  };

  const strengthDiff = (homeRatings.overall + 2.2 - awayRatings.overall) * 0.0032;
  let baseHomeChance =
    0.054 + strengthDiff + mentalityShift(currentHomeClub) + setPieceRoutineBonus(currentHomeClub);
  let baseAwayChance =
    0.048 - strengthDiff + mentalityShift(currentAwayClub) + setPieceRoutineBonus(currentAwayClub);

  if (gameSettings.difficulty === 'CASUAL') {
    if (isUserHome) baseHomeChance += 0.008;
    else baseAwayChance += 0.008;
  } else if (gameSettings.difficulty === 'REALISTA') {
    if (isUserHome) baseAwayChance += 0.006;
    else baseHomeChance += 0.006;
  }

  if (rivalryInfo) {
    if (isUserHome) {
      baseAwayChance += rivalryInfo.cpuChanceBonus;
      if (preMatchDerbyPosture === 'CLIMA_DE_GUERRA') baseHomeChance += 0.007;
      if (preMatchDerbyPosture === 'SANGUE_FRIO') baseAwayChance -= 0.004;
    } else {
      baseHomeChance += rivalryInfo.cpuChanceBonus;
      if (preMatchDerbyPosture === 'CLIMA_DE_GUERRA') baseAwayChance += 0.007;
      if (preMatchDerbyPosture === 'SANGUE_FRIO') baseHomeChance -= 0.004;
    }
  }

  const homeSpecialists = resolveActiveTakersOnPitch(currentHomeClub);
  const awaySpecialists = resolveActiveTakersOnPitch(currentAwayClub);

  const homeStartersList = [...currentHomeClub.squad.filter((p) => p.isStarter)];
  const awayStartersList = [...currentAwayClub.squad.filter((p) => p.isStarter)];
  const subbedInIds = new Set<string>();
  const subbedOutIds = new Set<string>();
  const events: MatchEvent[] = [];
  const matchMedicalMessages: InboxMessage[] = [];

  let homeScore = 0;
  let awayScore = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeOnTarget = 0;
  let awayOnTarget = 0;
  let homeFouls = 0;
  let awayFouls = 0;
  let homeYellows = 0;
  let awayYellows = 0;
  let homeReds = 0;
  let awayReds = 0;
  let homePossTicks = 0;
  let awayPossTicks = 0;
  const homeZoneCounts = { left: 1, center: 1, right: 1 };
  const awayZoneCounts = { left: 1, center: 1, right: 1 };

  const autoSubsForUser = Boolean(userClub.tactics.autoMatchSubsEnabled ?? true);

  for (let m = 1; m <= 90; m++) {
    // Perform realistic 2nd half substitutions (User assistant + CPU)
    if (m === 62 || m === 72 || m === 81) {
      const doSub = (club: Club, activeStarters: Player[], isHomeSide: boolean) => {
        const outfield = activeStarters.filter((p) => p.position !== 'GK');
        const bench = club.squad.filter(
          (p) =>
            p.isSubstitute &&
            !p.isStarter &&
            !subbedInIds.has(p.id) &&
            !subbedOutIds.has(p.id) &&
            p.position !== 'GK' &&
            p.injuryWeeks === 0 &&
            !p.injuryDetails
        );
        const tired = [...outfield].sort((a, b) => a.condition - b.condition)[0];
        if (!tired || bench.length === 0) return;
        const replacement = [...bench].sort((a, b) => {
          const fitA =
            a.detailedRole === tired.detailedRole ? 15 : a.position === tired.position ? 8 : 0;
          const fitB =
            b.detailedRole === tired.detailedRole ? 15 : b.position === tired.position ? 8 : 0;
          return fitB + b.overall - (fitA + a.overall);
        })[0];
        if (!replacement) return;
        const idx = activeStarters.findIndex((p) => p.id === tired.id);
        if (idx !== -1) activeStarters[idx] = replacement;
        subbedOutIds.add(tired.id);
        subbedInIds.add(replacement.id);
        events.push({
          id: `inst_sub_${club.id}_${m}_${replacement.id}`,
          minute: m,
          type: 'SUBSTITUICAO',
          teamId: club.id,
          playerId: replacement.id,
          playerName: replacement.name,
          description: `🔄 Substituição no ${club.shortName} aos ${m}': Sai ${tired.name} e entra ${replacement.name}.`,
          isHomeTeam: isHomeSide,
        });
      };

      if (isUserHome) {
        if (autoSubsForUser) doSub(currentHomeClub, homeStartersList, true);
        doSub(currentAwayClub, awayStartersList, false);
      } else {
        doSub(currentHomeClub, homeStartersList, true);
        if (autoSubsForUser) doSub(currentAwayClub, awayStartersList, false);
      }
    }

    const homeWeight = Math.min(0.68, Math.max(0.32, 0.52 + (homeRatings.midfield - awayRatings.midfield) * 0.01));
    const isHomePoss = Math.random() < homeWeight;
    if (isHomePoss) homePossTicks++;
    else awayPossTicks++;

    // Sample attack sector channel
    const atkTeam = isHomePoss ? currentHomeClub : currentAwayClub;
    const zRoll = Math.random();
    const atkStyleWide = atkTeam.tactics.passing === 'Longo (Contra-ataque)' ? 0.38 : 0.31;
    const zoneBuckets = isHomePoss ? homeZoneCounts : awayZoneCounts;
    if (zRoll < atkStyleWide) zoneBuckets.left++;
    else if (zRoll > 1 - atkStyleWide) zoneBuckets.right++;
    else zoneBuckets.center++;

    const atkSpec = isHomePoss ? homeSpecialists : awaySpecialists;
    const leadershipBoost = atkSpec.captainLeadership >= 80 && m >= 70 ? 0.004 : 0;
    const chanceProb =
      (isHomePoss ? Math.max(0.018, baseHomeChance) : Math.max(0.018, baseAwayChance)) +
      leadershipBoost;

    if (Math.random() < chanceProb) {
      if (isHomePoss) homeShots++;
      else awayShots++;

      const atkClub = isHomePoss ? currentHomeClub : currentAwayClub;
      const atkStarters = isHomePoss ? homeStartersList : awayStartersList;
      const atkRating = isHomePoss ? homeRatings.attack : awayRatings.attack;
      const defRating = isHomePoss ? awayRatings.defense : homeRatings.defense;
      const isCornerAssist = Boolean(atkSpec.cornerTaker) && Math.random() < 0.24;
      const convProb = Math.min(
        0.5,
        Math.max(
          0.22,
          0.33 +
            (atkRating - defRating) * 0.008 +
            (isCornerAssist && atkSpec.cornerSkill >= 80 ? 0.03 : 0)
        )
      );

      if (Math.random() < convProb) {
        if (isHomePoss) {
          homeScore++;
          homeOnTarget++;
        } else {
          awayScore++;
          awayOnTarget++;
        }

        const weightedScorers = atkStarters.flatMap((p) =>
          p.position === 'FW' ? [p, p, p, p] : p.position === 'MF' ? [p, p] : p.position === 'DF' ? [p] : []
        );
        const scorer =
          weightedScorers[Math.floor(Math.random() * weightedScorers.length)] || atkStarters[0];
        const assistCandidates = atkStarters.filter(
          (p) => p.id !== scorer?.id && p.position !== 'GK'
        );
        const assister =
          isCornerAssist && atkSpec.cornerTaker && atkSpec.cornerTaker.id !== scorer?.id
            ? atkSpec.cornerTaker
            : assistCandidates.length > 0 && Math.random() < 0.72
            ? assistCandidates[Math.floor(Math.random() * assistCandidates.length)]
            : undefined;

        events.push({
          id: `inst_gol_${m}_${atkClub.id}_${homeScore}_${awayScore}`,
          minute: m,
          type: 'GOL',
          teamId: atkClub.id,
          playerId: scorer?.id,
          playerName: scorer?.name || 'Atacante',
          assistPlayerId: assister?.id,
          assistPlayerName: assister?.name,
          description: assister
            ? `⚽ GOOOL do ${atkClub.shortName}! ${scorer?.name} marca aos ${m}' (passe de ${assister.name})!`
            : `⚽ GOOOL do ${atkClub.shortName}! ${scorer?.name} balança as redes aos ${m}'!`,
          isHomeTeam: isHomePoss,
        });
      } else if (Math.random() < 0.45) {
        if (isHomePoss) homeOnTarget++;
        else awayOnTarget++;
      }
    }

    // Fouls & Cards
    const foulMult = rivalryInfo?.foulRateMultiplier ?? 1;
    if (Math.random() < 0.035 * foulMult) {
      const isHomeFoul = Math.random() < 0.5;
      if (isHomeFoul) homeFouls++;
      else awayFouls++;
      const fClub = isHomeFoul ? currentHomeClub : currentAwayClub;
      const fStarters = isHomeFoul ? homeStartersList : awayStartersList;
      const fouler = fStarters[Math.floor(Math.random() * fStarters.length)] || fStarters[0];
      const roll = Math.random();
      if (roll < 0.025 && fouler) {
        if (isHomeFoul) homeReds++;
        else awayReds++;
        events.push({
          id: `inst_red_${m}_${fouler.id}`,
          minute: m,
          type: 'CARTAO_VERMELHO',
          teamId: fClub.id,
          playerId: fouler.id,
          playerName: fouler.name,
          description: `🟥 Cartão vermelho para ${fouler.name} (${fClub.shortName}) aos ${m}'!`,
          isHomeTeam: isHomeFoul,
        });
      } else if (roll < 0.34 && fouler) {
        if (isHomeFoul) homeYellows++;
        else awayYellows++;
        events.push({
          id: `inst_yel_${m}_${fouler.id}`,
          minute: m,
          type: 'CARTAO_AMARELO',
          teamId: fClub.id,
          playerId: fouler.id,
          playerName: fouler.name,
          description: `🟨 Cartão amarelo para ${fouler.name} (${fClub.shortName}) aos ${m}'.`,
          isHomeTeam: isHomeFoul,
        });
      }
    }
  }

  // Small realistic injury roll (~7%)
  if (Math.random() < 0.07) {
    const isHomeInj = Math.random() < 0.5;
    const victimClub = isHomeInj ? currentHomeClub : currentAwayClub;
    const starters = (isHomeInj ? homeStartersList : awayStartersList).filter(
      (p) => p.position !== 'GK'
    );
    const victim = starters[Math.floor(Math.random() * starters.length)];
    if (victim) {
      const injMin = Math.floor(Math.random() * 65) + 18;
      const { updatedPlayer: injuredPlayer, inboxMessage } = diagnosePlayerInjury(
        victim,
        userFixture.date || new Date().toISOString().slice(0, 10),
        userFixture.round,
        victimClub.finances.medicalFacilityLevel || 2
      );
      if (isHomeInj) {
        currentHomeClub = {
          ...currentHomeClub,
          squad: currentHomeClub.squad.map((p) => (p.id === victim.id ? injuredPlayer : p)),
        };
      } else {
        currentAwayClub = {
          ...currentAwayClub,
          squad: currentAwayClub.squad.map((p) => (p.id === victim.id ? injuredPlayer : p)),
        };
      }
      if (victimClub.id === userClub.id) {
        matchMedicalMessages.push(inboxMessage);
      }
      events.push({
        id: `inst_inj_${injMin}_${victim.id}`,
        minute: injMin,
        type: 'LESAO',
        teamId: victimClub.id,
        playerId: victim.id,
        playerName: victim.name,
        description: `🚑 ${victim.name} (${victimClub.shortName}) sentiu desconforto muscular aos ${injMin}'.`,
        isHomeTeam: isHomeInj,
      });
    }
  }

  // Aggregate & Knockout Penalty Shootout Resolution
  let aggregateHomeScore: number | undefined;
  let aggregateAwayScore: number | undefined;
  let penaltiesHome: number | undefined;
  let penaltiesAway: number | undefined;
  let aggregateWinnerId: string | undefined;

  const isKnockout = isKnockoutCompetitionFixture(userFixture);
  if (isKnockout && userFixture.leg === 2) {
    const leg1 = allFixtures.find(
      (f) =>
        f.played &&
        f.competition === userFixture.competition &&
        f.leg === 1 &&
        f.homeTeamId === userFixture.awayTeamId &&
        f.awayTeamId === userFixture.homeTeamId
    );
    const leg1HomeGoalsInThisStadium = leg1?.awayScore ?? 0;
    const leg1AwayGoalsInThisStadium = leg1?.homeScore ?? 0;
    aggregateHomeScore = homeScore + leg1HomeGoalsInThisStadium;
    aggregateAwayScore = awayScore + leg1AwayGoalsInThisStadium;

    if (aggregateHomeScore > aggregateAwayScore) {
      aggregateWinnerId = currentHomeClub.id;
    } else if (aggregateAwayScore > aggregateHomeScore) {
      aggregateWinnerId = currentAwayClub.id;
    } else {
      penaltiesHome = 4;
      penaltiesAway = 4;
      const homePenEdge = homeRatings.overall >= awayRatings.overall ? 0.54 : 0.46;
      if (Math.random() < homePenEdge) penaltiesHome = 5;
      else penaltiesAway = 5;
      aggregateWinnerId =
        penaltiesHome > penaltiesAway ? currentHomeClub.id : currentAwayClub.id;
      const winnerShort =
        aggregateWinnerId === currentHomeClub.id
          ? currentHomeClub.shortName
          : currentAwayClub.shortName;
      events.push({
        id: `inst_pen_${Date.now()}`,
        minute: 120,
        type: 'FIM_JOGO',
        teamId: aggregateWinnerId,
        playerName: 'Disputa de Pênaltis',
        description: `🏆 Decisão nos Pênaltis: ${currentHomeClub.shortName} (${penaltiesHome}) x (${penaltiesAway}) ${currentAwayClub.shortName}! Classificação do ${winnerShort}!`,
        isHomeTeam: aggregateWinnerId === currentHomeClub.id,
      });
    }
  } else if (isKnockout && !userFixture.leg && homeScore === awayScore) {
    penaltiesHome = 4;
    penaltiesAway = 4;
    const homePenEdge = homeRatings.overall >= awayRatings.overall ? 0.54 : 0.46;
    if (Math.random() < homePenEdge) penaltiesHome = 5;
    else penaltiesAway = 5;
    aggregateWinnerId =
      penaltiesHome > penaltiesAway ? currentHomeClub.id : currentAwayClub.id;
    const winnerShort =
      aggregateWinnerId === currentHomeClub.id
        ? currentHomeClub.shortName
        : currentAwayClub.shortName;
    events.push({
      id: `inst_pen_single_${Date.now()}`,
      minute: 120,
      type: 'FIM_JOGO',
      teamId: aggregateWinnerId,
      playerName: 'Disputa de Pênaltis',
      description: `🏆 Decisão nos Pênaltis: ${currentHomeClub.shortName} (${penaltiesHome}) x (${penaltiesAway}) ${currentAwayClub.shortName}! Vitória do ${winnerShort}!`,
      isHomeTeam: aggregateWinnerId === currentHomeClub.id,
    });
  }

  const totalPoss = Math.max(1, homePossTicks + awayPossTicks);
  const homePossession = Math.min(74, Math.max(26, Math.round((homePossTicks / totalPoss) * 100)));
  const awayPossession = 100 - homePossession;

  const normalizeZonePct = (z: { left: number; center: number; right: number }) => {
    const sum = Math.max(1, z.left + z.center + z.right);
    const left = Math.round((z.left / sum) * 100);
    const center = Math.round((z.center / sum) * 100);
    const right = Math.max(0, 100 - left - center);
    return { left, center, right };
  };
  const homeAttackZones = normalizeZonePct(homeZoneCounts);
  const awayAttackZones = normalizeZonePct(awayZoneCounts);

  const liveRatingsMap = computeLiveMatchRatings({
    homeClub: {
      ...currentHomeClub,
      squad: currentHomeClub.squad.map((p) => ({
        ...p,
        isStarter: homeStartersList.some((s) => s.id === p.id) || subbedOutIds.has(p.id),
      })),
    },
    awayClub: {
      ...currentAwayClub,
      squad: currentAwayClub.squad.map((p) => ({
        ...p,
        isStarter: awayStartersList.some((s) => s.id === p.id) || subbedOutIds.has(p.id),
      })),
    },
    homeScore,
    awayScore,
    minute: 90,
    events,
    subbedInPlayerIds: subbedInIds,
    subbedOutPlayerIds: subbedOutIds,
  });

  const motmEntry = pickManOfTheMatch(liveRatingsMap);
  const manOfTheMatchLabel = motmEntry
    ? `${motmEntry.playerName} (${motmEntry.clubShortName} · Nota ${motmEntry.rating.toFixed(1)})`
    : `${
        (homeScore >= awayScore ? homeStartersList[0] : awayStartersList[0])?.name || 'Destaque'
      } (${homeScore >= awayScore ? currentHomeClub.shortName : currentAwayClub.shortName})`;

  const stats: MatchStats = {
    homeShots,
    awayShots,
    homeShotsOnTarget: homeOnTarget,
    awayShotsOnTarget: awayOnTarget,
    homePossession,
    awayPossession,
    homeCorners: Math.max(1, Math.round(homeShots * 0.45)),
    awayCorners: Math.max(1, Math.round(awayShots * 0.45)),
    homeFouls,
    awayFouls,
    homeYellowCards: homeYellows,
    awayYellowCards: awayYellows,
    homeRedCards: homeReds,
    awayRedCards: awayReds,
    homePassAccuracy: Math.min(92, Math.max(74, 80 + Math.round((homePossession - 50) * 0.25))),
    awayPassAccuracy: Math.min(92, Math.max(74, 80 + Math.round((awayPossession - 50) * 0.25))),
    homeAttackZones,
    awayAttackZones,
    matchRatings: Array.from(liveRatingsMap.values()).sort((a, b) => b.rating - a.rating),
  };

  const matchEcon = calculateMatchDayEconomics(currentHomeClub, currentAwayClub, {
    isRivalry: Boolean(rivalryInfo),
    isKnockout: Boolean(isKnockout),
    fanConfidence,
    randomJitter: (Math.random() - 0.5) * 0.06,
  });
  const attendance = matchEcon.attendance;
  const ticketRevenue = matchEcon.totalMatchIncome;

  const completedUserFixture: Fixture = {
    ...userFixture,
    homeScore,
    awayScore,
    played: true,
    attendance,
    ticketRevenue,
    events,
    stats,
    aggregateHomeScore,
    aggregateAwayScore,
    penaltiesHome,
    penaltiesAway,
    aggregateWinnerId,
  };

  // Update both clubs' squads & home gate revenue identically to MatchSimulatorModal
  const updatedClubs = allClubs.map((club) => {
    if (club.id !== currentHomeClub.id && club.id !== currentAwayClub.id) {
      return club;
    }
    const isClubHome = club.id === currentHomeClub.id;
    const cObj = isClubHome ? currentHomeClub : currentAwayClub;
    const clubScore = isClubHome ? homeScore : awayScore;
    const oppScore = isClubHome ? awayScore : homeScore;
    const clubGoals = events.filter((e) => e.type === 'GOL' && e.teamId === club.id);
    const clubYellows = events.filter((e) => e.type === 'CARTAO_AMARELO' && e.teamId === club.id);
    const clubReds = events.filter((e) => e.type === 'CARTAO_VERMELHO' && e.teamId === club.id);

    const updatedSquadRaw = cObj.squad.map((p) => {
      const playedInMatch =
        p.isStarter || subbedInIds.has(p.id) || subbedOutIds.has(p.id);
      const goalsInMatch = clubGoals.filter((g) => g.playerId === p.id).length;
      const assistsInMatch = clubGoals.filter((g) => g.assistPlayerId === p.id).length;
      const yellowsInMatch = clubYellows.filter((y) => y.playerId === p.id).length;
      const redsInMatch = clubReds.filter((r) => r.playerId === p.id).length;

      let newCondition = p.condition;
      if (p.isStarter && !subbedOutIds.has(p.id)) {
        newCondition = Math.max(42, p.condition - 12);
      } else if (playedInMatch) {
        newCondition = Math.max(48, p.condition - 7);
      } else {
        newCondition = Math.min(100, p.condition + 5);
      }

      let newMorale = p.morale;
      if (aggregateWinnerId) {
        newMorale = aggregateWinnerId === club.id ? 'Excelente' : 'Regular';
      } else if (clubScore > oppScore) {
        newMorale = 'Excelente';
      } else if (clubScore < oppScore) {
        newMorale = 'Regular';
      }

      const isInjuredNow = p.injuryWeeks > 0 || Boolean(p.injuryDetails);

      return {
        ...p,
        isStarter: isInjuredNow ? false : p.isStarter,
        isSubstitute: isInjuredNow ? false : p.isSubstitute,
        pitchSlot: isInjuredNow ? undefined : p.pitchSlot,
        matches: p.matches + (playedInMatch ? 1 : 0),
        goals: p.goals + goalsInMatch,
        assists: p.assists + assistsInMatch,
        yellowCards: p.yellowCards + yellowsInMatch,
        redCards: p.redCards + redsInMatch,
        condition: newCondition,
        morale: newMorale,
      };
    });

    const updatedSquad = applyPostMatchRatingsToSquad(updatedSquadRaw, liveRatingsMap);

    const matchDateStr = userFixture.date || new Date().toISOString().slice(0, 10);
    let finances = { ...club.finances };
    if (isClubHome) {
      if (club.id === userClub.id) {
        finances = recordFinanceLedgerMutation(finances, {
          date: matchDateStr,
          category: 'TICKETS',
          type: 'INCOME',
          amount: ticketRevenue,
          description: `Bilheteria (${attendance.toLocaleString('pt-BR')} pagantes · ${currentHomeClub.shortName} x ${currentAwayClub.shortName}) + Matchday`,
          applyToBalance: true,
        });
        finances = recordFinanceLedgerMutation(finances, {
          date: matchDateStr,
          category: 'MATCHDAY_OPS',
          type: 'EXPENSE',
          amount: matchEcon.homeMatchOpsCost,
          description: `Operação da Arena (${currentHomeClub.stadium.name})`,
          applyToBalance: true,
        });
      } else {
        finances.balance += ticketRevenue - matchEcon.homeMatchOpsCost;
        finances.totalIncomeSeason += ticketRevenue;
        finances.totalExpensesSeason += matchEcon.homeMatchOpsCost;
      }
    } else if (club.id === userClub.id) {
      finances = recordFinanceLedgerMutation(finances, {
        date: matchDateStr,
        category: 'MATCHDAY_OPS',
        type: 'EXPENSE',
        amount: matchEcon.awayTravelCost,
        description: `Logística & Viagem (vs ${currentHomeClub.shortName})`,
        applyToBalance: true,
      });
    }

    return {
      ...cObj,
      finances,
      squad: updatedSquad,
    };
  });

  // Simulate all simultaneous CPU fixtures in the round
  const otherRaw = currentRoundFixtures.filter((f) => f.id !== userFixture.id && !f.played);
  const otherMatches = otherRaw.map((f) => simulateQuickCpuFixture(f, clubsMap));

  return {
    completedUserFixture,
    otherMatches,
    updatedClubs,
    matchMedicalMessages,
    homeClub: currentHomeClub,
    awayClub: currentAwayClub,
    manOfTheMatchLabel,
  };
}

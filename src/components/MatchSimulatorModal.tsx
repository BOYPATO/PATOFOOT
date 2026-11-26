import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Club, CompetitionType, Fixture, ManagerSpecialtyId, MatchAttackZones, MatchEvent, MatchPlayerRatingSummary, MatchStats, Player, InboxMessage, InGameTacticOrder, HalftimeTalkTone, PreMatchDerbyPosture, TouchlineShoutType } from '../types/game';
import { getManagerSpecialtyProfile } from '../utils/managerSpecialtyEngine';
import { soundEngine } from '../services/soundEngine';
import { COMMENTARY_TEMPLATES, simulateQuickMatch } from '../services/matchSimulation';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Pause, 
  FastForward, 
  SkipForward, 
  Award, 
  Users, 
  DollarSign, 
  Clock, 
  Sparkles,
  ArrowRight,
  ArrowLeftRight,
  Handshake,
  Flame,
  Megaphone,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { calculatePitchSlots } from '../utils/matchPitchLayout';
import { getClubSectorRatings } from '../utils/clubRatingsEngine';
import { LiveMatchPitch2D } from './LiveMatchPitch2D';
import { formatCalendarDate } from '../utils/calendarUtils';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { ClubCrest, CompetitionCrest } from './ClubCrest';
import { InGameSubModal, SubstitutionPair } from './InGameSubModal';
import { MatchBenchBar } from './MatchBenchBar';
import { PenaltyShootoutModal } from './PenaltyShootoutModal';
import { diagnosePlayerInjury } from '../utils/medicalEngine';
import { sanitizeLineupForCompetition } from '../utils/suspensionEngine';
import { CUP_PRIZES_CATALOG, formatMoney } from '../utils/prizeEngine';
import { isEuropeanCup } from '../utils/europeanCupsEngine';
import { isSouthAmericanCup } from '../utils/southAmericanCupsEngine';
import { isWorldCup } from '../utils/worldCupsEngine';
import { previewMatchSponsorPayout } from '../utils/sponsorEngine';
import {
  calculateMatchDayEconomics,
  recordFinanceLedgerMutation,
} from '../utils/financialFairPlayEngine';
import {
  getMatchRivalryInfo,
  HALFTIME_PEP_TALKS_CATALOG,
  HalftimePepTalkOutcome,
  evaluateHalftimePepTalk,
  applyPepTalkMoraleToPlayer,
} from '../utils/rivalryEngine';
import { DEFAULT_GAME_SETTINGS, GameSettings } from '../utils/settingsEngine';
import {
  TOUCHLINE_SHOUTS,
  computeLiveMatchRatings,
  pickManOfTheMatch,
  applyPostMatchRatingsToSquad,
  resolveActiveTakersOnPitch,
  shiftPlayerMoraleStep,
} from '../utils/matchExperienceEngine';

interface MatchSimulatorModalProps {
  userClub: Club;
  allClubs: Club[];
  currentRoundFixtures: Fixture[];
  allFixtures?: Fixture[];
  gameSettings?: GameSettings;
  preMatchDerbyPosture?: PreMatchDerbyPosture;
  fanConfidence?: number;
  managerSpecialty?: ManagerSpecialtyId;
  onFinishRound: (
    userFixture: Fixture, 
    allRoundFixtures: Fixture[], 
    updatedClubs: Club[],
    matchMedicalMessages?: InboxMessage[]
  ) => void;
  onClose: () => void;
}

export const MatchSimulatorModal: React.FC<MatchSimulatorModalProps> = ({
  userClub,
  allClubs,
  currentRoundFixtures,
  allFixtures = [],
  gameSettings = DEFAULT_GAME_SETTINGS,
  preMatchDerbyPosture = 'PADRAO',
  fanConfidence = 68,
  managerSpecialty,
  onFinishRound,
  onClose,
}) => {
  const specialtyProfile = useMemo(
    () => getManagerSpecialtyProfile(managerSpecialty),
    [managerSpecialty]
  );
  const [matchMedicalMessages, setMatchMedicalMessages] = useState<InboxMessage[]>([]);

  // Find user's match in this round
  const userFixture = currentRoundFixtures.find(
    (f) => f.homeTeamId === userClub.id || f.awayTeamId === userClub.id
  );

  const homeClub = allClubs.find((c) => c.id === userFixture?.homeTeamId) || userClub;
  const awayClub = allClubs.find((c) => c.id === userFixture?.awayTeamId) || userClub;
  const isUserHome = homeClub.id === userClub.id;

  const rivalryInfo = useMemo(
    () => getMatchRivalryInfo(homeClub, awayClub),
    [homeClub, awayClub]
  );

  const [matchEcon] = useState(() =>
    calculateMatchDayEconomics(homeClub, awayClub, {
      isRivalry: Boolean(rivalryInfo),
      fanConfidence,
      randomJitter: (Math.random() - 0.5) * 0.06,
    })
  );
  const matchAttendance = matchEcon.attendance;
  const matchTicketRevenue = matchEcon.totalMatchIncome;

  // Match Simulation State
  const [minute, setMinute] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isHalftime, setIsHalftime] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(gameSettings.defaultMatchSpeed); // 1 = 1x, 2 = 2x, 4 = 4x
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [halftimePepTalk, setHalftimePepTalk] = useState<HalftimePepTalkOutcome | null>(null);
  const [showSectorOverlay, setShowSectorOverlay] = useState<boolean>(
    gameSettings.defaultShowSectorMap
  );
  const [possessionCounts, setPossessionCounts] = useState<{ home: number; away: number }>({
    home: 1,
    away: 1,
  });
  const [sectorCounts, setSectorCounts] = useState<{
    homeThird: number;
    midThird: number;
    awayThird: number;
  }>({
    homeThird: 1,
    midThird: 2,
    awayThird: 1,
  });
  const [attackZonesCounts, setAttackZonesCounts] = useState<{
    home: { left: number; center: number; right: number };
    away: { left: number; center: number; right: number };
  }>({
    home: { left: 1, center: 2, right: 1 },
    away: { left: 1, center: 2, right: 1 },
  });

  // Penalty Shootout State (for Knockout Ties)
  const [isPenaltyShootoutActive, setIsPenaltyShootoutActive] = useState<boolean>(false);
  const [penaltyResult, setPenaltyResult] = useState<{
    penaltiesHome: number;
    penaltiesAway: number;
    winnerId: string;
    penaltyKicks: any[];
  } | null>(null);

  // Knockout match checks & Leg 1 tie resolution
  const matchPhaseLower = (userFixture?.cupPhase || '').toLowerCase();
  const isKnockoutMatch = Boolean(
    userFixture?.competition === 'copa_brasil' ||
    userFixture?.competition === 'supercopa_brasil' ||
    userFixture?.competition === 'recopa_sulamericana' ||
    userFixture?.competition === 'uefa_supercup' ||
    userFixture?.competition === 'concacaf_champions' ||
    userFixture?.competition === 'intercontinental' ||
    userFixture?.competition === 'eng_community_shield' ||
    userFixture?.competition === 'eng_fa_cup' ||
    userFixture?.competition === 'eng_efl_cup' ||
    (userFixture?.competition && isEuropeanCup(userFixture.competition)) ||
    (userFixture?.competition && isSouthAmericanCup(userFixture.competition)) ||
    (userFixture?.competition && isWorldCup(userFixture.competition)) ||
    (userFixture?.competition === 'usa_mls' && userFixture?.id.includes('_po_')) ||
    userFixture?.leg !== undefined ||
    matchPhaseLower.includes('1ª fase') ||
    matchPhaseLower.includes('2ª fase') ||
    matchPhaseLower.includes('3ª fase') ||
    matchPhaseLower.includes('4ª fase') ||
    matchPhaseLower.includes('5ª fase') ||
    matchPhaseLower.includes('1ª rodada') ||
    matchPhaseLower.includes('2ª rodada') ||
    matchPhaseLower.includes('preliminar') ||
    matchPhaseLower.includes('wild card') ||
    matchPhaseLower.includes('primeira rodada') ||
    matchPhaseLower.includes('final') ||
    matchPhaseLower.includes('semifinal') ||
    matchPhaseLower.includes('oitavas') ||
    matchPhaseLower.includes('quartas') ||
    matchPhaseLower.includes('decisão')
  );

  const leg1Fixture = useMemo(() => {
    if (!userFixture || userFixture.leg !== 2 || !allFixtures || allFixtures.length === 0) return null;
    return allFixtures.find(
      (f) =>
        f.competition === userFixture.competition &&
        f.cupPhase === userFixture.cupPhase &&
        f.leg === 1 &&
        ((f.homeTeamId === userFixture.awayTeamId && f.awayTeamId === userFixture.homeTeamId) ||
          f.id.replace('_volta', '_ida') === userFixture.id)
    );
  }, [userFixture, allFixtures]);

  const leg1HomeGoals = leg1Fixture?.awayScore ?? 0;
  const leg1AwayGoals = leg1Fixture?.homeScore ?? 0;

  // Scores
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);

  // Aggregate scores and knockout tie check
  const aggregateHomeScore = userFixture?.leg === 2 ? homeScore + leg1HomeGoals : undefined;
  const aggregateAwayScore = userFixture?.leg === 2 ? awayScore + leg1AwayGoals : undefined;

  const usesAwayGoalsTiebreak =
    userFixture?.competition === 'concacaf_champions' && userFixture?.leg === 2;

  const isTiedKnockout = useMemo(() => {
    if (!isKnockoutMatch || userFixture?.leg === 1) return false;
    if (userFixture?.leg === 2 && aggregateHomeScore !== undefined && aggregateAwayScore !== undefined) {
      if (aggregateHomeScore !== aggregateAwayScore) return false;
      if (usesAwayGoalsTiebreak) {
        return leg1HomeGoals === awayScore;
      }
      return true;
    }
    return homeScore === awayScore;
  }, [
    isKnockoutMatch,
    userFixture,
    homeScore,
    awayScore,
    aggregateHomeScore,
    aggregateAwayScore,
    usesAwayGoalsTiebreak,
    leg1HomeGoals,
  ]);

  // Cup Phase or Final prize earned in this match
  const cupPrizeInfo = useMemo(() => {
    if (!userFixture || !isFinished) return null;
    const isCup =
      userFixture.competition === 'copa_brasil' ||
      userFixture.competition === 'supercopa_brasil' ||
      userFixture.competition === 'recopa_sulamericana' ||
      userFixture.competition === 'libertadores' ||
      userFixture.competition === 'sulamericana' ||
      userFixture.competition === 'champions_league' ||
      userFixture.competition === 'europa_league' ||
      userFixture.competition === 'conference_league' ||
      userFixture.competition === 'uefa_supercup' ||
      userFixture.competition === 'copa_internacional' ||
      userFixture.competition === 'estadual' ||
      userFixture.competition === 'concacaf_champions' ||
      userFixture.competition === 'afc_champions' ||
      userFixture.competition === 'intercontinental' ||
      userFixture.competition === 'eng_community_shield' ||
      userFixture.competition === 'eng_fa_cup' ||
      userFixture.competition === 'eng_efl_cup' ||
      isEuropeanCup(userFixture.competition) ||
      isSouthAmericanCup(userFixture.competition) ||
      isWorldCup(userFixture.competition);

    if (!isCup || userFixture.leg === 1) return null;

    const phaseLower = (userFixture.cupPhase || '').toLowerCase();
    const prizeConfig = CUP_PRIZES_CATALOG.find(
      (c) => c.competition === userFixture.competition && phaseLower.includes(c.phaseMatchString)
    );
    if (!prizeConfig) return null;

    let winnerId: string | null = null;
    let runnerUpId: string | null = null;
    if (penaltyResult) {
      winnerId = penaltyResult.winnerId;
      runnerUpId = winnerId === homeClub.id ? awayClub.id : homeClub.id;
    } else if (userFixture.leg === 2 && aggregateHomeScore !== undefined && aggregateAwayScore !== undefined) {
      if (aggregateHomeScore > aggregateAwayScore) {
        winnerId = homeClub.id;
        runnerUpId = awayClub.id;
      } else if (aggregateAwayScore > aggregateHomeScore) {
        winnerId = awayClub.id;
        runnerUpId = homeClub.id;
      } else if (usesAwayGoalsTiebreak) {
        if (leg1HomeGoals > awayScore) {
          winnerId = homeClub.id;
          runnerUpId = awayClub.id;
        } else if (awayScore > leg1HomeGoals) {
          winnerId = awayClub.id;
          runnerUpId = homeClub.id;
        }
      }
    } else {
      if (homeScore > awayScore) {
        winnerId = homeClub.id;
        runnerUpId = awayClub.id;
      } else if (awayScore > homeScore) {
        winnerId = awayClub.id;
        runnerUpId = homeClub.id;
      }
    }

    if (!winnerId) return null;
    const isUserWinner = winnerId === userClub.id;
    const isUserRunnerUp = runnerUpId === userClub.id;
    const isFinal = phaseLower.includes('final') || phaseLower.includes('decisão');

    if (isUserWinner) {
      return {
        amount: prizeConfig.winnerPrize,
        phase: prizeConfig.phaseDisplayName,
        isChampion: isFinal,
        isRunnerUp: false,
      };
    } else if (isUserRunnerUp && isFinal && prizeConfig.runnerUpPrize) {
      return {
        amount: prizeConfig.runnerUpPrize,
        phase: prizeConfig.phaseDisplayName,
        isChampion: false,
        isRunnerUp: true,
      };
    }
    return null;
  }, [userFixture, isFinished, penaltyResult, aggregateHomeScore, aggregateAwayScore, homeScore, awayScore, homeClub.id, awayClub.id, userClub.id]);

  const matchSponsorPayout = useMemo(() => {
    if (!isFinished) return null;
    const userGoals = isUserHome ? homeScore : awayScore;
    const oppGoals = isUserHome ? awayScore : homeScore;
    let userWon = userGoals > oppGoals;
    if (penaltyResult) {
      userWon = penaltyResult.winnerId === userClub.id;
    }
    return previewMatchSponsorPayout(userClub, userWon, userGoals);
  }, [isFinished, isUserHome, homeScore, awayScore, penaltyResult, userClub]);

  // Events & Commentary
  const [events, setEvents] = useState<MatchEvent[]>([]);

  // Active Possession & Touchline Orders
  const [possessionTeam, setPossessionTeam] = useState<'home' | 'away'>('home');
  const [inGameTactic, setInGameTactic] = useState<InGameTacticOrder>('EQUILIBRADO');
  const [activeShout, setActiveShout] = useState<{
    type: TouchlineShoutType;
    expiresMinute: number;
  } | null>(null);
  const [shoutCooldownUntil, setShoutCooldownUntil] = useState<number>(0);

  // Shot Animations & Goalkeeper Dives synced with 60fps 2D Pitch Engine
  const [activeShot, setActiveShot] = useState<{
    type: 'GOL' | 'DEFESAÇA' | 'CHUTE_TRAVE';
    shooterName: string;
    targetPos: { x: number; y: number };
  } | null>(null);
  const [activeKeeperDive, setActiveKeeperDive] = useState<{
    keeperId: string;
    targetY: number;
    angle: number;
  } | null>(null);
  const [activeGoalNetShake, setActiveGoalNetShake] = useState<'left' | 'right' | null>(null);
  const [activeWoodworkFlash, setActiveWoodworkFlash] = useState<{ x: number; y: number } | null>(null);

  // Match Statistics
  const [stats, setStats] = useState<MatchStats>({
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homePossession: 50,
    awayPossession: 50,
    homeCorners: 0,
    awayCorners: 0,
    homeFouls: 0,
    awayFouls: 0,
    homeYellowCards: 0,
    awayYellowCards: 0,
    homeRedCards: 0,
    awayRedCards: 0,
    homePassAccuracy: 82 + (isUserHome && specialtyProfile.id === 'TATICO' ? 2 : 0),
    awayPassAccuracy: 80 + (!isUserHome && specialtyProfile.id === 'TATICO' ? 2 : 0),
    homeXG: 0,
    awayXG: 0,
  });

  const liveHomePossession = useMemo(() => {
    const total = possessionCounts.home + possessionCounts.away;
    if (total <= 0) return 50;
    return Math.min(78, Math.max(22, Math.round((possessionCounts.home / total) * 100)));
  }, [possessionCounts]);
  const liveAwayPossession = 100 - liveHomePossession;

  const sectorPercentages = useMemo(() => {
    const total = sectorCounts.homeThird + sectorCounts.midThird + sectorCounts.awayThird;
    if (total <= 0) {
      return { homeThirdPct: 28, midThirdPct: 44, awayThirdPct: 28 };
    }
    const homeThirdPct = Math.round((sectorCounts.homeThird / total) * 100);
    const awayThirdPct = Math.round((sectorCounts.awayThird / total) * 100);
    const midThirdPct = Math.max(0, 100 - homeThirdPct - awayThirdPct);
    return { homeThirdPct, midThirdPct, awayThirdPct };
  }, [sectorCounts]);

  const normalizeAttackZone = (z: {
    left: number;
    center: number;
    right: number;
  }): MatchAttackZones => {
    const total = Math.max(1, z.left + z.center + z.right);
    const left = Math.round((z.left / total) * 100);
    const center = Math.round((z.center / total) * 100);
    const right = Math.max(0, 100 - left - center);
    return { left, center, right };
  };

  const homeAttackZones = useMemo(
    () => normalizeAttackZone(attackZonesCounts.home),
    [attackZonesCounts.home]
  );
  const awayAttackZones = useMemo(
    () => normalizeAttackZone(attackZonesCounts.away),
    [attackZonesCounts.away]
  );

  // Simultaneous CPU Matches in the round across all active competitions (all simulated for global sync)
  const [otherMatches, setOtherMatches] = useState<Fixture[]>([]);
  const [showInlineRoundPanel, setShowInlineRoundPanel] = useState<boolean>(true);

  const clubsById = useMemo(
    () => new Map<string, Club>(allClubs.map((c) => [c.id, c])),
    [allClubs]
  );

  // Build the list of matches ONLY from the same competition/league & round currently being played
  const sameLeagueRoundEntries = useMemo(() => {
    if (!userFixture) return [];
    const userComp = userFixture.competition;
    const userRound = userFixture.round;
    const userEstStateKey =
      userComp === 'estadual' ? userFixture.id.split('_')[1] || '' : '';

    const isSameLeagueRound = (f: Fixture): boolean => {
      if (f.id === userFixture.id) return false;
      if (f.competition !== userComp) return false;
      if (
        !f.homeTeamId ||
        !f.awayTeamId ||
        f.homeTeamId === 'tbd' ||
        f.awayTeamId === 'tbd' ||
        f.homeTeamId.startsWith('TBD') ||
        f.awayTeamId.startsWith('TBD')
      ) {
        return false;
      }
      if (userComp === 'estadual') {
        const sameGroup = Boolean(userFixture.groupName && f.groupName === userFixture.groupName);
        const sameStatePrefix = Boolean(
          userEstStateKey && f.id.startsWith(`est_${userEstStateKey}_`)
        );
        if (!sameGroup && !sameStatePrefix) return false;
      }
      if (
        userFixture.cupPhase &&
        userComp !== 'estadual' &&
        (isKnockoutMatch || userFixture.leg !== undefined)
      ) {
        if (userFixture.leg !== undefined && f.leg !== undefined) {
          return f.cupPhase === userFixture.cupPhase && f.leg === userFixture.leg;
        }
        return f.round === userRound || f.cupPhase === userFixture.cupPhase;
      }
      return f.round === userRound;
    };

    const liveMap = new Map<string, Fixture>();
    for (const m of otherMatches) {
      if (isSameLeagueRound(m)) {
        liveMap.set(m.id, m);
      }
    }

    type RoundEntryStatus = 'LIVE' | 'FINISHED' | 'UPCOMING';
    const entries: Array<{ fixture: Fixture; status: RoundEntryStatus; priority: number }> = [];
    const seenIds = new Set<string>();

    // 1. Live simultaneous matches of this league & round
    liveMap.forEach((m) => {
      seenIds.add(m.id);
      const sameGroupBoost =
        userFixture.groupName && m.groupName === userFixture.groupName ? 0 : 1;
      entries.push({ fixture: m, status: 'LIVE', priority: sameGroupBoost });
    });

    // 2. Other matches of the exact same league & round (already played earlier or scheduled later in the same round)
    for (const f of allFixtures) {
      if (seenIds.has(f.id) || !isSameLeagueRound(f)) continue;
      seenIds.add(f.id);
      const sameGroupBoost =
        userFixture.groupName && f.groupName === userFixture.groupName ? 0 : 1;
      entries.push({
        fixture: f,
        status: f.played ? 'FINISHED' : 'UPCOMING',
        priority: (f.played ? 2 : 4) + sameGroupBoost,
      });
    }

    entries.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const dateCmp = (a.fixture.date || '').localeCompare(b.fixture.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.fixture.time || '').localeCompare(b.fixture.time || '');
    });

    return entries;
  }, [userFixture, otherMatches, allFixtures, isKnockoutMatch]);

  const currentRoundCompetitionLabel = useMemo(() => {
    if (!userFixture) return 'Rodada';
    if (userFixture.competition === 'estadual' && userFixture.groupName) {
      return userFixture.groupName;
    }
    return COMPETITIONS_CATALOG[userFixture.competition]?.shortName || userFixture.competition;
  }, [userFixture]);

  // Live goals flashing right now in other matches of the same league & round (0-3 min window)
  const recentRoundGoalAlerts = useMemo(() => {
    if (isFinished || minute <= 0) return [];
    const alerts: Array<{
      fixtureId: string;
      minute: number;
      scorerName: string;
      scoringClubName: string;
      homeName: string;
      awayName: string;
      homeGoals: number;
      awayGoals: number;
    }> = [];

    for (const entry of sameLeagueRoundEntries) {
      if (entry.status !== 'LIVE') continue;
      const m = entry.fixture;
      const goalEvents = (m.events || [])
        .filter((ev) => (ev.type === 'GOL' || ev.type === 'PENALTI_GOL') && ev.minute <= minute)
        .sort((a, b) => a.minute - b.minute);
      const latestRecent = [...goalEvents]
        .reverse()
        .find((ev) => minute - ev.minute >= 0 && minute - ev.minute <= 3);
      if (!latestRecent) continue;

      const h = clubsById.get(m.homeTeamId);
      const a = clubsById.get(m.awayTeamId);
      const homeGoals = goalEvents.filter((ev) => ev.isHomeTeam).length;
      const awayGoals = goalEvents.filter((ev) => !ev.isHomeTeam).length;
      alerts.push({
        fixtureId: m.id,
        minute: latestRecent.minute,
        scorerName: latestRecent.playerName || 'Gol',
        scoringClubName: latestRecent.isHomeTeam
          ? h?.shortName || m.homeTeamId
          : a?.shortName || m.awayTeamId,
        homeName: h?.shortName || m.homeTeamId,
        awayName: a?.shortName || m.awayTeamId,
        homeGoals,
        awayGoals,
      });
    }

    alerts.sort((a, b) => b.minute - a.minute);
    return alerts;
  }, [sameLeagueRoundEntries, isFinished, minute, clubsById]);

  // Active in-match clubs & squads (supports substitutions, sanitized against suspensions)
  const [currentHomeClub, setCurrentHomeClub] = useState<Club>(() => {
    if (!userFixture?.competition) return homeClub;
    const { sanitizedSquad } = sanitizeLineupForCompetition(homeClub.squad, userFixture.competition);
    return { ...homeClub, squad: sanitizedSquad };
  });

  const [currentAwayClub, setCurrentAwayClub] = useState<Club>(() => {
    if (!userFixture?.competition) return awayClub;
    const { sanitizedSquad } = sanitizeLineupForCompetition(awayClub.squad, userFixture.competition);
    return { ...awayClub, squad: sanitizedSquad };
  });

  // Substitutions & In-Match Injury Stoppage State (Rule: up to 5 substitutions, single or all at once)
  const MAX_USER_SUBS = 5;
  const [subsUsed, setSubsUsed] = useState<number>(0);
  const [subbedOutIds, setSubbedOutIds] = useState<Set<string>>(new Set());
  const [subHistory, setSubHistory] = useState<
    Array<{ outPlayer: Player; inPlayer: Player; minute: number }>
  >([]);
  const [isSubModalOpen, setIsSubModalOpen] = useState<boolean>(false);
  const [selectedStarterForSub, setSelectedStarterForSub] = useState<Player | null>(null);
  const [selectedReserveForSub, setSelectedReserveForSub] = useState<Player | null>(null);
  const [pendingInjuryStoppage, setPendingInjuryStoppage] = useState<{
    player: Player;
    minute: number;
  } | null>(null);
  const [noSubsInjuryAlert, setNoSubsInjuryAlert] = useState<{
    player: Player;
    minute: number;
  } | null>(null);
  const [cpuSubsUsed, setCpuSubsUsed] = useState<number>(0);
  const [autoSubsActive, setAutoSubsActive] = useState<boolean>(() =>
    Boolean(userClub.tactics.autoMatchSubsEnabled)
  );

  const [sideInfoTab, setSideInfoTab] = useState<'live' | 'ratings' | 'bench' | 'round'>('live');
  const commentaryScrollRef = useRef<HTMLDivElement>(null);

  // Halftime Pitch Sides Switch Logic
  // 1st Half (minute <= 45): Home defends Left (X: 0-7%) and attacks Right. Away defends Right and attacks Left.
  // 2nd Half (minute > 45): TEAMS SWITCH SIDES! Home defends Right and attacks Left. Away defends Left and attacks Right.
  const isSecondHalf = minute > 45;
  const homeDefendsLeft = !isSecondHalf;
  const awayDefendsLeft = isSecondHalf;

  // Starters & Base Tactical Slots
  const homeStarters = useMemo(
    () => currentHomeClub.squad.filter((p) => p.isStarter),
    [currentHomeClub.squad]
  );
  const awayStarters = useMemo(
    () => currentAwayClub.squad.filter((p) => p.isStarter),
    [currentAwayClub.squad]
  );

  const homeBaseSlots = useMemo(
    () => calculatePitchSlots(homeStarters, homeDefendsLeft),
    [homeStarters, homeDefendsLeft]
  );
  const awayBaseSlots = useMemo(
    () => calculatePitchSlots(awayStarters, awayDefendsLeft),
    [awayStarters, awayDefendsLeft]
  );

  // Track yellow cards, red cards, and goals per player for pitch badges
  const yellowCardPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    events.forEach((e) => {
      if (e.type === 'CARTAO_AMARELO' && e.playerId) ids.add(e.playerId);
    });
    return ids;
  }, [events]);

  const redCardPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    events.forEach((e) => {
      if (e.type === 'CARTAO_VERMELHO' && e.playerId) ids.add(e.playerId);
    });
    return ids;
  }, [events]);

  const goalScorerPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    events.forEach((e) => {
      if ((e.type === 'GOL' || e.type === 'PENALTI_GOL') && e.playerId) ids.add(e.playerId);
    });
    return ids;
  }, [events]);

  const homeSpecialists = useMemo(
    () => resolveActiveTakersOnPitch(currentHomeClub, redCardPlayerIds),
    [currentHomeClub, redCardPlayerIds]
  );
  const awaySpecialists = useMemo(
    () => resolveActiveTakersOnPitch(currentAwayClub, redCardPlayerIds),
    [currentAwayClub, redCardPlayerIds]
  );

  const subbedInPlayerIds = useMemo(
    () => new Set(subHistory.map((s) => s.inPlayer.id)),
    [subHistory]
  );

  const liveRatingsMap = useMemo(
    () =>
      computeLiveMatchRatings({
        homeClub: currentHomeClub,
        awayClub: currentAwayClub,
        homeScore,
        awayScore,
        minute: Math.max(1, minute),
        events,
        subbedInPlayerIds,
        subbedOutPlayerIds: subbedOutIds,
      }),
    [currentHomeClub, currentAwayClub, homeScore, awayScore, minute, events, subbedInPlayerIds, subbedOutIds]
  );

  const motmEntry = useMemo(() => pickManOfTheMatch(liveRatingsMap), [liveRatingsMap]);

  // Initialize other matches quick sim + derby kickoff atmosphere
  useEffect(() => {
    soundEngine.playWhistle(false);
    if (rivalryInfo) {
      const postureNote =
        preMatchDerbyPosture === 'SANGUE_FRIO'
          ? ' Sua equipe entra com foco e sangue frio para controlar os nervos.'
          : preMatchDerbyPosture === 'CLIMA_DE_GUERRA'
          ? ' Sua equipe sobe ao gramado em clima de decisão, pressionando desde o apito inicial!'
          : '';
      setEvents([
        {
          id: `ev_kickoff_derby_${Date.now()}`,
          minute: 1,
          type: 'KICKOFF',
          teamId: homeClub.id,
          playerName: rivalryInfo.derbyName,
          description: `Clima eletrizante de ${rivalryInfo.derbyName}! ${rivalryInfo.atmosphereSubtitle} — ${matchAttendance.toLocaleString('pt-BR')} torcedores presentes no ${homeClub.stadium.name}!${postureNote}`,
          isHomeTeam: true,
        },
      ]);
    }
    const otherFixtures = currentRoundFixtures.filter(
      (f) => f.id !== userFixture?.id
    );
    const simulatedOthers = otherFixtures.map((f) => {
      const h = allClubs.find((c) => c.id === f.homeTeamId);
      const a = allClubs.find((c) => c.id === f.awayTeamId);
      if (h && a) {
        const leg1 =
          f.leg === 2
            ? allFixtures.find(
                (prev) =>
                  prev.competition === f.competition &&
                  prev.cupPhase === f.cupPhase &&
                  prev.leg === 1 &&
                  ((prev.homeTeamId === f.awayTeamId && prev.awayTeamId === f.homeTeamId) ||
                    prev.id === f.id.replace('_volta', '_ida'))
              )
            : undefined;
        return simulateQuickMatch(h, a, f, leg1);
      }
      return f;
    });
    setOtherMatches(simulatedOthers);
  }, []);

  // Auto-scroll ONLY inside the commentary box (never scroll ancestor modal/viewport away from the pitch)
  useEffect(() => {
    const el = commentaryScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events, sideInfoTab]);

  // Main Match Clock Tick (stops automatically at Halftime, Sub Modal, or In-Match Injury Stoppage)
  useEffect(() => {
    if (
      !isPlaying ||
      isFinished ||
      isHalftime ||
      isSubModalOpen ||
      Boolean(pendingInjuryStoppage) ||
      Boolean(noSubsInjuryAlert)
    ) {
      return;
    }

    if (minute >= 90) {
      handleMatchFinished();
      return;
    }

    const intervalTime = Math.max(100, Math.round(500 / speed));
    const timer = setTimeout(() => {
      const nextMin = minute + 1;

      // Halftime whistle at 45' (pauses if pauseAtHalftime setting is enabled)
      if (nextMin === 45) {
        simulateMinuteEvent(45);
        soundEngine.playDoubleWhistle();
        setActiveShot(null);
        addEvent({
          id: `ev_ht_${Date.now()}`,
          minute: 45,
          type: 'FIM_PRIMEIRO_TEMPO',
          teamId: '',
          playerName: 'Árbitro',
          description: gameSettings.pauseAtHalftime
            ? '⏸️ Fim do 1º Tempo (45\')! Jogo parado no intervalo. Ajuste a tática ou faça até as 5 substituições de uma vez e aperte "Iniciar 2º Tempo".'
            : '⏸️ Intervalo de jogo (45\')! As equipes viram de lado para o 2º tempo.',
          isHomeTeam: true,
        });
        setMinute(45);
        if (gameSettings.pauseAtHalftime) {
          setIsHalftime(true);
          setIsPlaying(false);
        }
        return;
      }

      // Ball movement and dynamic simulation per minute
      simulateMinuteEvent(nextMin);
      setMinute(nextMin);
    }, intervalTime);

    return () => clearTimeout(timer);
  }, [
    isPlaying,
    speed,
    isFinished,
    isHalftime,
    isSubModalOpen,
    pendingInjuryStoppage,
    noSubsInjuryAlert,
    minute,
    homeScore,
    awayScore,
    currentHomeClub,
    currentAwayClub,
    subsUsed,
    cpuSubsUsed,
    inGameTactic,
    halftimePepTalk,
    activeShout,
  ]);

  // Deliver Halftime Locker Room Pep Talk (once per halftime)
  const handleDeliverHalftimePepTalk = (tone: HalftimeTalkTone) => {
    if (!isHalftime || isFinished || halftimePepTalk) return;
    soundEngine.playClick();

    const userGoals = isUserHome ? homeScore : awayScore;
    const oppGoals = isUserHome ? awayScore : homeScore;
    const userStartersNow = (isUserHome ? currentHomeClub : currentAwayClub).squad.filter((p) => p.isStarter);
    const oppStartersNow = (isUserHome ? currentAwayClub : currentHomeClub).squad.filter((p) => p.isStarter);
    const userAvgOvr =
      userStartersNow.length > 0
        ? userStartersNow.reduce((acc, p) => acc + p.overall, 0) / userStartersNow.length
        : 72;
    const oppAvgOvr =
      oppStartersNow.length > 0
        ? oppStartersNow.reduce((acc, p) => acc + p.overall, 0) / oppStartersNow.length
        : 72;

    const rawOutcome = evaluateHalftimePepTalk(tone, userGoals, oppGoals, {
      userClubShortName: userClub.shortName,
      isDerby: Boolean(rivalryInfo),
      derbyName: rivalryInfo?.derbyName,
      isKnockout: isKnockoutMatch,
      strengthDiff: oppAvgOvr - userAvgOvr,
    });

    const userSpec = isUserHome ? homeSpecialists : awaySpecialists;
    const capBoost = userSpec.captainLeadership >= 82 ? 0.004 : 0;
    const specPepBoost = specialtyProfile.pepTalkBonus || 0;
    const totalExtraPep = capBoost + specPepBoost;
    const outcome: HalftimePepTalkOutcome =
      totalExtraPep > 0
        ? {
            ...rawOutcome,
            userChanceBonus: rawOutcome.userChanceBonus + totalExtraPep,
            goalConversionBonus:
              rawOutcome.goalConversionBonus + (capBoost > 0 ? 0.015 : 0) + (specPepBoost > 0 ? 0.02 : 0),
            lockerRoomFeedback: `${rawOutcome.lockerRoomFeedback}${
              capBoost > 0
                ? ` O capitão ${userSpec.captain?.name || ''} reforçou sua cobrança no vestiário!`
                : ''
            }${
              specPepBoost > 0
                ? ' Seu perfil Motivador amplificou a reação do elenco!'
                : ''
            }`,
          }
        : rawOutcome;

    setHalftimePepTalk(outcome);

    // Apply immediate stamina & morale shift to user's squad
    const targetClub = isUserHome ? currentHomeClub : currentAwayClub;
    const updatedSquad = targetClub.squad.map((p) => {
      if (!p.isStarter) return p;
      return {
        ...p,
        condition: Math.min(100, Math.max(35, p.condition + outcome.conditionDelta)),
        morale: applyPepTalkMoraleToPlayer(p.morale, outcome.targetMoraleBoost),
      };
    });

    if (isUserHome) {
      setCurrentHomeClub({ ...currentHomeClub, squad: updatedSquad });
    } else {
      setCurrentAwayClub({ ...currentAwayClub, squad: updatedSquad });
    }

    if (outcome.passAccuracyBonus !== 0) {
      setStats((prev) => ({
        ...prev,
        homePassAccuracy: isUserHome
          ? Math.min(95, Math.max(68, prev.homePassAccuracy + outcome.passAccuracyBonus))
          : prev.homePassAccuracy,
        awayPassAccuracy: !isUserHome
          ? Math.min(95, Math.max(68, prev.awayPassAccuracy + outcome.passAccuracyBonus))
          : prev.awayPassAccuracy,
      }));
    }

    addEvent({
      id: `ev_peptalk_${Date.now()}`,
      minute: 45,
      type: 'PALESTRA_INTERVALO',
      teamId: userClub.id,
      playerName: userClub.managerName || 'Treinador',
      description: `${outcome.commentaryText} (${outcome.reactionBadge})`,
      isHomeTeam: isUserHome,
    });
  };

  // Resume match from Halftime (45') into the 2nd Half
  const handleStartSecondHalf = () => {
    if (!isHalftime || isFinished) return;
    soundEngine.playWhistle(false);
    setActiveShot(null);
    addEvent({
      id: `ev_sh_start_${Date.now()}`,
      minute: 46,
      type: 'INICIO_SEGUNDO_TEMPO',
      teamId: '',
      playerName: 'Árbitro',
      description: '🔄 Bola rolando no 2º Tempo! As equipes inverteram os lados do gramado.',
      isHomeTeam: true,
    });
    setIsHalftime(false);
    setMinute(46);
    setIsPlaying(true);
  };

  // Simulate probabilistic events and ball trajectory for the given minute
  const simulateMinuteEvent = (currentMin: number) => {
    const currentHomeStarters = currentHomeClub.squad.filter((p) => p.isStarter);
    const currentAwayStarters = currentAwayClub.squad.filter((p) => p.isStarter);

    // Determine current attack direction based on half
    const isSecondHalfLocal = currentMin > 45;
    const homeDefendsLeftLocal = !isSecondHalfLocal;

    // Sector ratings (reflects active tactical slot fit + out-of-position OVR penalties + stamina/morale)
    const homeSectors = getClubSectorRatings(currentHomeClub, { matchReady: true });
    const awaySectors = getClubSectorRatings(currentAwayClub, { matchReady: true });
    const midfieldPossessionDelta = Math.max(
      -0.14,
      Math.min(0.14, (homeSectors.rawMidfield - awaySectors.rawMidfield) * 0.008)
    );

    // Dynamic possession weight influenced by midfield strength + live tactical instruction + halftime pep talk
    let homePossessionWeight = 0.52 + midfieldPossessionDelta;
    if (isUserHome) {
      if (inGameTactic === 'PRESSAO_TOTAL') homePossessionWeight += 0.12;
      else if (inGameTactic === 'RETRANCA') homePossessionWeight -= 0.14;
      else if (inGameTactic === 'CHUVEIRINHO') homePossessionWeight += 0.04;
      else if (inGameTactic === 'CONTRA_ATAQUE') homePossessionWeight -= 0.08;
      else if (inGameTactic === 'SEGURAR_RESULTADO') homePossessionWeight += 0.06;
      if (isSecondHalfLocal && halftimePepTalk) {
        homePossessionWeight += halftimePepTalk.possessionShift;
      }
    } else {
      if (inGameTactic === 'PRESSAO_TOTAL') homePossessionWeight -= 0.14;
      else if (inGameTactic === 'RETRANCA') homePossessionWeight += 0.10;
      else if (inGameTactic === 'CHUVEIRINHO') homePossessionWeight -= 0.06;
      else if (inGameTactic === 'CONTRA_ATAQUE') homePossessionWeight += 0.04;
      else if (inGameTactic === 'SEGURAR_RESULTADO') homePossessionWeight -= 0.10;
      if (isSecondHalfLocal && halftimePepTalk) {
        homePossessionWeight -= halftimePepTalk.possessionShift;
      }
    }
    const shoutCfg =
      activeShout && currentMin <= activeShout.expiresMinute
        ? TOUCHLINE_SHOUTS.find((s) => s.id === activeShout.type)
        : undefined;
    if (shoutCfg) {
      homePossessionWeight += isUserHome ? shoutCfg.possessionDelta : -shoutCfg.possessionDelta;
    }
    homePossessionWeight = Math.min(0.78, Math.max(0.22, homePossessionWeight));
    const isAttackingHome = Math.random() < homePossessionWeight;
    setPossessionTeam(isAttackingHome ? 'home' : 'away');
    setPossessionCounts((prev) => ({
      home: prev.home + (isAttackingHome ? 1 : 0),
      away: prev.away + (!isAttackingHome ? 1 : 0),
    }));
    const laneRoll = Math.random();
    const laneKey: 'left' | 'center' | 'right' =
      laneRoll < 0.34 ? 'left' : laneRoll < 0.68 ? 'center' : 'right';
    setAttackZonesCounts((prev) => ({
      home: isAttackingHome
        ? { ...prev.home, [laneKey]: prev.home[laneKey] + 1 }
        : prev.home,
      away: !isAttackingHome
        ? { ...prev.away, [laneKey]: prev.away[laneKey] + 1 }
        : prev.away,
    }));

    // Direction the attacking team moves towards:
    // If Home attacks: moves Right when homeDefendsLeftLocal is true, moves Left when false
    // If Away attacks: moves Right when awayDefendsLeftLocal (!homeDefendsLeftLocal) is true, moves Left when false
    const attackerAttacksRight = isAttackingHome ? homeDefendsLeftLocal : !homeDefendsLeftLocal;

    // Sample baseline territorial zone progression (also refined live by 60fps pitch telemetry)
    const phaseRoll = Math.random();
    const targetX =
      currentMin === 45 || currentMin === 46
        ? 50
        : phaseRoll < 0.22
        ? 38 + Math.random() * 24
        : phaseRoll < 0.56
        ? attackerAttacksRight
          ? 54 + Math.random() * 22
          : 46 - Math.random() * 22
        : attackerAttacksRight
        ? 75 + Math.random() * 20
        : 25 - Math.random() * 20;

    setSectorCounts((prev) => {
      if (targetX < 34) {
        return homeDefendsLeftLocal
          ? { ...prev, homeThird: prev.homeThird + 1 }
          : { ...prev, awayThird: prev.awayThird + 1 };
      }
      if (targetX > 66) {
        return homeDefendsLeftLocal
          ? { ...prev, awayThird: prev.awayThird + 1 }
          : { ...prev, homeThird: prev.homeThird + 1 };
      }
      return { ...prev, midThird: prev.midThird + 1 };
    });

    // CPU Opponent Tactical Substitutions (Between min 55 and 78, up to 3 subs)
    if (
      currentMin >= 55 &&
      currentMin <= 80 &&
      cpuSubsUsed < 3 &&
      Math.random() < 0.12
    ) {
      const cpuClub = isUserHome ? currentAwayClub : currentHomeClub;
      const cpuStarters = cpuClub.squad.filter((p) => p.isStarter && p.position !== 'GK');
      const cpuReserves = cpuClub.squad.filter(
        (p) => !p.isStarter && !subbedOutIds.has(p.id) && p.position !== 'GK'
      );

      if (cpuStarters.length > 0 && cpuReserves.length > 0) {
        // Pick most tired or random starter
        const sortedByCond = [...cpuStarters].sort((a, b) => a.condition - b.condition);
        const cpuOut = sortedByCond[0];
        const matchingReserve =
          cpuReserves.find((r) => r.detailedRole === cpuOut.detailedRole) ||
          cpuReserves.find((r) => r.position === cpuOut.position) ||
          cpuReserves[0];

        if (cpuOut && matchingReserve) {
          const updatedCpuSquad = cpuClub.squad.map((p) => {
            if (p.id === cpuOut.id) return { ...p, isStarter: false, isSubstitute: false };
            if (p.id === matchingReserve.id) return { ...p, isStarter: true, isSubstitute: false, pitchSlot: cpuOut.pitchSlot };
            return p;
          });

          if (isUserHome) {
            setCurrentAwayClub({ ...currentAwayClub, squad: updatedCpuSquad });
          } else {
            setCurrentHomeClub({ ...currentHomeClub, squad: updatedCpuSquad });
          }

          setCpuSubsUsed((c) => c + 1);
          setSubbedOutIds((prev) => new Set(prev).add(cpuOut.id));

          addEvent({
            id: `ev_cpu_sub_${currentMin}_${Date.now()}`,
            minute: currentMin,
            type: 'SUBSTITUICAO',
            teamId: cpuClub.id,
            playerId: matchingReserve.id,
            playerName: matchingReserve.name,
            description: `🔄 Substituição no ${cpuClub.shortName} aos ${currentMin}': Sai ${cpuOut.name} (#${cpuOut.squadNumber}) e entra ${matchingReserve.name} (#${matchingReserve.squadNumber})!`,
            isHomeTeam: !isUserHome,
          });
        }
      }
    }

    // User Assistant Coach Automatic Substitutions (2nd half 58'–84' + emergency injuries, up to 5 subs)
    if (
      autoSubsActive &&
      subsUsed < MAX_USER_SUBS &&
      !isSubModalOpen &&
      (Boolean(pendingInjuryStoppage) ||
        (currentMin >= 58 &&
          currentMin <= 84 &&
          (currentMin === 60 ||
            currentMin === 67 ||
            currentMin === 74 ||
            currentMin === 81 ||
            Math.random() < 0.14)))
    ) {
      const myClub = isUserHome ? currentHomeClub : currentAwayClub;
      const onPitchOutfield = myClub.squad.filter(
        (p) => p.isStarter && !redCardPlayerIds.has(p.id) && p.position !== 'GK'
      );
      const healthyBench = myClub.squad.filter(
        (p) =>
          p.isSubstitute &&
          !p.isStarter &&
          !subbedOutIds.has(p.id) &&
          p.injuryWeeks === 0 &&
          !p.injuryDetails &&
          !p.isSuspended
      );

      let chosenOut: Player | undefined;
      if (pendingInjuryStoppage) {
        chosenOut = myClub.squad.find((p) => p.id === pendingInjuryStoppage.player.id);
      } else {
        const candidatesOut = [...onPitchOutfield]
          .map((p) => {
            const estimatedLiveCond = Math.max(35, p.condition - Math.round((currentMin / 90) * 14));
            const hasYellow = yellowCardPlayerIds.has(p.id);
            const urgency =
              (100 - estimatedLiveCond) +
              (hasYellow ? 14 : 0) +
              (estimatedLiveCond < 64 ? 18 : 0);
            return { player: p, estimatedLiveCond, hasYellow, urgency };
          })
          .filter(
            (item) =>
              item.estimatedLiveCond < 72 ||
              (item.hasYellow && currentMin >= 62) ||
              (currentMin >= 74 && subsUsed < 3 && item.estimatedLiveCond < 80)
          )
          .sort((a, b) => b.urgency - a.urgency);

        chosenOut = candidatesOut[0]?.player;
      }

      if (chosenOut && healthyBench.length > 0) {
        const targetOut = chosenOut;
        const benchPool =
          targetOut.position === 'GK'
            ? healthyBench.filter((b) => b.position === 'GK')
            : healthyBench.filter((b) => b.position !== 'GK');
        const poolToUse = benchPool.length > 0 ? benchPool : healthyBench;
        const bestReserve = [...poolToUse].sort((a, b) => {
          const roleFitA =
            a.detailedRole === targetOut.detailedRole
              ? 18
              : a.position === targetOut.position
              ? 10
              : 0;
          const roleFitB =
            b.detailedRole === targetOut.detailedRole
              ? 18
              : b.position === targetOut.position
              ? 10
              : 0;
          const scoreA = roleFitA + a.overall * 0.85 + a.condition * 0.2;
          const scoreB = roleFitB + b.overall * 0.85 + b.condition * 0.2;
          return scoreB - scoreA;
        })[0];

        if (bestReserve) {
          handleConfirmBatchSubstitutions(
            [{ outPlayer: targetOut, inPlayer: bestReserve }],
            Boolean(pendingInjuryStoppage)
          );
        }
      }
    }

    // Goal Chance Check with Tactical Adjustments + Halftime Pep Talk Modifiers
    const isUserAttacking = (isAttackingHome && isUserHome) || (!isAttackingHome && !isUserHome);
    let chanceThreshold = 0.055;
    if (isUserAttacking) {
      if (inGameTactic === 'PRESSAO_TOTAL') chanceThreshold = 0.076; // +38% attack volume
      else if (inGameTactic === 'RETRANCA') chanceThreshold = 0.024; // reduced offensive volume
      else if (inGameTactic === 'CONTRA_ATAQUE') chanceThreshold = 0.062; // sharp counters
      else if (inGameTactic === 'CHUVEIRINHO') chanceThreshold = 0.072; // frequent box balls
      else if (inGameTactic === 'SEGURAR_RESULTADO') chanceThreshold = 0.036; // patient ball control
      if (isSecondHalfLocal && halftimePepTalk) {
        chanceThreshold = Math.max(0.015, chanceThreshold + halftimePepTalk.userChanceBonus);
      }
      if (rivalryInfo && preMatchDerbyPosture === 'CLIMA_DE_GUERRA') {
        chanceThreshold += 0.008;
      }
      if (gameSettings.difficulty === 'CASUAL') chanceThreshold += 0.008;
      else if (gameSettings.difficulty === 'REALISTA') chanceThreshold = Math.max(0.015, chanceThreshold - 0.006);
    } else {
      // Opponent is attacking (elevated difficulty in Rivalry / Derby clashes)
      if (inGameTactic === 'RETRANCA') chanceThreshold = 0.028; // Wall cuts opponent chances in half!
      else if (inGameTactic === 'SEGURAR_RESULTADO') chanceThreshold = 0.032; // Tempo control reduces rival transition
      else if (inGameTactic === 'PRESSAO_TOTAL') chanceThreshold = 0.068; // Space behind press
      if (rivalryInfo) {
        const postureDampen = preMatchDerbyPosture === 'SANGUE_FRIO' ? -0.004 : 0;
        chanceThreshold += Math.max(0, rivalryInfo.cpuChanceBonus + postureDampen);
      }
      if (isSecondHalfLocal && halftimePepTalk) {
        chanceThreshold = Math.max(0.015, chanceThreshold + halftimePepTalk.oppChanceModifier);
      }
      if (gameSettings.difficulty === 'CASUAL') chanceThreshold = Math.max(0.015, chanceThreshold - 0.006);
      else if (gameSettings.difficulty === 'REALISTA') chanceThreshold += 0.008;
    }

    // Touchline Shout & Captain Leadership Modifiers (Items 1 & 2)
    if (shoutCfg) {
      chanceThreshold = Math.max(
        0.015,
        chanceThreshold + (isUserAttacking ? shoutCfg.userChanceDelta : shoutCfg.oppChanceDelta)
      );
    }
    const atkSpec = isAttackingHome ? homeSpecialists : awaySpecialists;
    const defSpec = isAttackingHome ? awaySpecialists : homeSpecialists;
    const atkTrailing = isAttackingHome ? homeScore < awayScore : awayScore < homeScore;
    const atkSectors = isAttackingHome ? homeSectors : awaySectors;
    const defSectors = isAttackingHome ? awaySectors : homeSectors;
    const sectorDuelDiff = atkSectors.rawAttack - defSectors.rawDefense;
    const sectorChanceShift = Math.max(-0.024, Math.min(0.028, sectorDuelDiff * 0.0014));

    if ((currentMin >= 74 || atkTrailing) && atkSpec.captainLeadership >= 80) {
      chanceThreshold += 0.005;
    }
    if (currentMin >= 74 && defSpec.captainLeadership >= 82) {
      chanceThreshold = Math.max(0.015, chanceThreshold - 0.004);
    }
    chanceThreshold = Math.max(0.015, Math.min(0.11, chanceThreshold + sectorChanceShift));

    const chanceRoll = Math.random();
    if (chanceRoll < chanceThreshold) {
      const attackingClub = isAttackingHome ? currentHomeClub : currentAwayClub;
      const defendingClub = isAttackingHome ? currentAwayClub : currentHomeClub;
      const attackingStarters = isAttackingHome ? currentHomeStarters : currentAwayStarters;
      const defendingStarters = isAttackingHome ? currentAwayStarters : currentHomeStarters;

      // Select shooter (usually FW or MF)
      const forwards = attackingStarters.filter((p) => p.position === 'FW');
      const midfielders = attackingStarters.filter((p) => p.position === 'MF');
      const pool = forwards.length > 0 ? forwards : midfielders.length > 0 ? midfielders : attackingStarters;
      const shooter = pool[Math.floor(Math.random() * pool.length)] || attackingStarters[0];

      // Corner / Set-Piece Assist (~25% of chances come from designated Corner Taker!)
      const isCornerPlay = Boolean(atkSpec.cornerTaker) && Math.random() < 0.25;
      const assisterPool = attackingStarters.filter((p) => p.id !== shooter?.id && p.position !== 'GK');
      const weightedAssisters = assisterPool.flatMap((p) =>
        p.position === 'MF' || p.detailedRole === 'LAT' ? [p, p, p] : p.position === 'FW' ? [p, p] : [p]
      );
      const hasAssist = weightedAssisters.length > 0 && Math.random() < 0.76;
      const assister =
        isCornerPlay && atkSpec.cornerTaker && atkSpec.cornerTaker.id !== shooter?.id
          ? atkSpec.cornerTaker
          : hasAssist
          ? weightedAssisters[Math.floor(Math.random() * weightedAssisters.length)]
          : undefined;

      if (isCornerPlay) {
        setStats((prev) => ({
          ...prev,
          homeCorners: isAttackingHome ? prev.homeCorners + 1 : prev.homeCorners,
          awayCorners: !isAttackingHome ? prev.awayCorners + 1 : prev.awayCorners,
        }));
      }

      // Goalkeeper
      const keeper = defendingStarters.find((p) => p.position === 'GK') || defendingStarters[0];

      // Update shots stats
      setStats((prev) => ({
        ...prev,
        homeShots: isAttackingHome ? prev.homeShots + 1 : prev.homeShots,
        awayShots: !isAttackingHome ? prev.awayShots + 1 : prev.awayShots,
      }));

      // Outcome: Goal, Save, Woodwork, or Off-target
      const shotOutcomeRoll = Math.random();
      let goalThreshold = 0.32;
      if (isUserAttacking && specialtyProfile.matchChanceBonus > 0) {
        goalThreshold += specialtyProfile.matchChanceBonus * 2.5;
      }
      if (isUserAttacking && inGameTactic === 'CONTRA_ATAQUE') {
        goalThreshold = 0.40; // Clinical breakaway finishing
      }
      if (isCornerPlay && atkSpec.cornerSkill >= 80) {
        goalThreshold += 0.035;
      }
      if (shoutCfg && isUserAttacking) {
        goalThreshold += shoutCfg.conversionDelta;
      }
      if (isUserAttacking && rivalryInfo && preMatchDerbyPosture === 'CLIMA_DE_GUERRA') {
        goalThreshold += 0.025;
      }
      if (!isUserAttacking && rivalryInfo) {
        goalThreshold += rivalryInfo.cpuConversionBonus;
      }
      if (isUserAttacking && isSecondHalfLocal && halftimePepTalk) {
        goalThreshold = Math.min(0.55, Math.max(0.18, goalThreshold + halftimePepTalk.goalConversionBonus));
      }
      const sectorFinishShift = Math.max(-0.08, Math.min(0.09, sectorDuelDiff * 0.004));
      goalThreshold = Math.min(0.58, Math.max(0.16, goalThreshold + sectorFinishShift));

      const shotXG = Math.round(Math.min(0.62, Math.max(0.06, goalThreshold * 0.65 + (Math.random() - 0.5) * 0.06)) * 100) / 100;
      setStats((prev) => ({
        ...prev,
        homeXG: isAttackingHome ? Math.round(((prev.homeXG || 0) + shotXG) * 100) / 100 : (prev.homeXG || 0),
        awayXG: !isAttackingHome ? Math.round(((prev.awayXG || 0) + shotXG) * 100) / 100 : (prev.awayXG || 0),
      }));

      // Target Goal Direction & Y coordinate between the FIFA goalposts (42.5% to 57.5%)
      const targetGoal = attackerAttacksRight ? 'right' : 'left';
      const targetGoalY = Math.round((43 + Math.random() * 14) * 10) / 10;

      // Powerful Ball Strike Sound
      soundEngine.playBallKick();

      // Outcome 1: GOAL!
      if (shotOutcomeRoll < goalThreshold) {
        if ((isAttackingHome && isUserHome) || (!isAttackingHome && !isUserHome)) {
          soundEngine.playGoalRoar();
        } else {
          soundEngine.playOpponentGoalGroan();
        }

        // Confetti if user scored and confetti setting is enabled
        if (
          gameSettings.enableConfetti &&
          ((isAttackingHome && isUserHome) || (!isAttackingHome && !isUserHome))
        ) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
        }

        if (isAttackingHome) {
          setHomeScore((s) => s + 1);
        } else {
          setAwayScore((s) => s + 1);
        }

        // Ball rockets into the back of the net
        const netX = attackerAttacksRight ? 98.2 : 1.8;
        const goalBallPos = { x: netX, y: targetGoalY };
        setActiveShot({
          type: 'GOL',
          shooterName: shooter?.name || 'Atacante',
          targetPos: goalBallPos,
        });
        setActiveGoalNetShake(targetGoal);
        setTimeout(() => {
          setActiveShot(null);
          setActiveGoalNetShake(null);
        }, 1200);

        setStats((prev) => ({
          ...prev,
          homeShotsOnTarget: isAttackingHome ? prev.homeShotsOnTarget + 1 : prev.homeShotsOnTarget,
          awayShotsOnTarget: !isAttackingHome ? prev.awayShotsOnTarget + 1 : prev.awayShotsOnTarget,
        }));

        const commentaryText =
          isCornerPlay && assister
            ? `⚽ GOL DE ESCANTEIO DO ${attackingClub.shortName}! ${assister.name} cobra na medida na área e ${shooter?.name || 'Atacante'} testa firme para o fundo da rede!`
            : COMMENTARY_TEMPLATES.goal[
                Math.floor(Math.random() * COMMENTARY_TEMPLATES.goal.length)
              ](shooter?.name || 'Atacante', attackingClub.shortName, assister?.name);

        addEvent({
          id: `ev_goal_${currentMin}_${Date.now()}`,
          minute: currentMin,
          type: 'GOL',
          teamId: attackingClub.id,
          playerId: shooter?.id,
          playerName: shooter?.name || 'Jogador',
          description: commentaryText,
          assistPlayerId: assister?.id,
          assistPlayerName: assister?.name,
          isHomeTeam: isAttackingHome,
        });
      } else if (shotOutcomeRoll < 0.65) {
        // Outcome 2: Goalkeeper Dive & Spectacular Save!
        const diveAngle = targetGoalY < 50 ? -36 : 36;
        const saveX = attackerAttacksRight ? 94.5 : 5.5;
        const savePos = { x: saveX, y: targetGoalY };

        setActiveKeeperDive({
          keeperId: keeper.id,
          targetY: targetGoalY,
          angle: diveAngle,
        });

        setActiveShot({
          type: 'DEFESAÇA',
          shooterName: shooter?.name || 'Atacante',
          targetPos: savePos,
        });

        // Glove slap sound
        setTimeout(() => {
          soundEngine.playGoalkeeperSave();
        }, 180);

        setTimeout(() => {
          setActiveKeeperDive(null);
          setActiveShot(null);
        }, 1200);

        setStats((prev) => ({
          ...prev,
          homeShotsOnTarget: isAttackingHome ? prev.homeShotsOnTarget + 1 : prev.homeShotsOnTarget,
          awayShotsOnTarget: !isAttackingHome ? prev.awayShotsOnTarget + 1 : prev.awayShotsOnTarget,
          homeCorners: isAttackingHome ? prev.homeCorners + 1 : prev.homeCorners,
          awayCorners: !isAttackingHome ? prev.awayCorners + 1 : prev.awayCorners,
        }));

        const commentaryText = COMMENTARY_TEMPLATES.save[
          Math.floor(Math.random() * COMMENTARY_TEMPLATES.save.length)
        ](keeper?.name || 'Goleiro');

        addEvent({
          id: `ev_save_${currentMin}_${Date.now()}`,
          minute: currentMin,
          type: 'DEFESAÇA',
          teamId: defendingClub.id,
          playerId: keeper?.id,
          playerName: keeper?.name || 'Goleiro',
          description: commentaryText,
          isHomeTeam: !isAttackingHome,
        });
      } else if (shotOutcomeRoll < 0.78) {
        // Outcome 3: Woodwork Hit (Trave/Travessão)
        const woodworkPostY = Math.random() < 0.5 ? 42 : 58;
        const woodX = attackerAttacksRight ? 97 : 3;
        const woodPos = { x: woodX, y: woodworkPostY };

        setActiveShot({
          type: 'CHUTE_TRAVE',
          shooterName: shooter?.name || 'Atacante',
          targetPos: woodPos,
        });

        setTimeout(() => {
          soundEngine.playWoodworkHit();
          setActiveWoodworkFlash({ x: woodX, y: woodworkPostY });
        }, 160);

        setTimeout(() => {
          setActiveWoodworkFlash(null);
          setActiveShot(null);
        }, 1100);

        const commentaryText = COMMENTARY_TEMPLATES.woodwork[
          Math.floor(Math.random() * COMMENTARY_TEMPLATES.woodwork.length)
        ](shooter?.name || 'Atacante');

        addEvent({
          id: `ev_wood_${currentMin}_${Date.now()}`,
          minute: currentMin,
          type: 'CHUTE_TRAVE',
          teamId: attackingClub.id,
          playerId: shooter?.id,
          playerName: shooter?.name || 'Atacante',
          description: commentaryText,
          isHomeTeam: isAttackingHome,
        });
      }
    }
    // Regulation-time Set Pieces: Official Penalty Taker & Free-Kick Taker (~1.5% chance/min)
    else if (currentMin >= 4 && currentMin !== 45 && Math.random() < 0.015) {
      const attackingClub = isAttackingHome ? currentHomeClub : currentAwayClub;
      const defendingClub = isAttackingHome ? currentAwayClub : currentHomeClub;
      const defendingStarters = isAttackingHome ? currentAwayStarters : currentHomeStarters;
      const keeper = defendingStarters.find((p) => p.position === 'GK') || defendingStarters[0];
      const targetGoal = attackerAttacksRight ? 'right' : 'left';
      const netX = attackerAttacksRight ? 98.5 : 1.5;

      const isPenalty = Math.random() < 0.34;
      if (isPenalty && atkSpec.penaltyTaker) {
        const taker = atkSpec.penaltyTaker;
        const penConvProb = Math.min(0.88, Math.max(0.62, 0.72 + (atkSpec.penaltySkill - 75) * 0.006));
        soundEngine.playWhistle(false);
        soundEngine.playBallKick();

        setStats((prev) => ({
          ...prev,
          homeShots: isAttackingHome ? prev.homeShots + 1 : prev.homeShots,
          awayShots: !isAttackingHome ? prev.awayShots + 1 : prev.awayShots,
          homeShotsOnTarget: isAttackingHome ? prev.homeShotsOnTarget + 1 : prev.homeShotsOnTarget,
          awayShotsOnTarget: !isAttackingHome ? prev.awayShotsOnTarget + 1 : prev.awayShotsOnTarget,
          homeXG: isAttackingHome ? Math.round(((prev.homeXG || 0) + 0.78) * 100) / 100 : (prev.homeXG || 0),
          awayXG: !isAttackingHome ? Math.round(((prev.awayXG || 0) + 0.78) * 100) / 100 : (prev.awayXG || 0),
        }));

        if (Math.random() < penConvProb) {
          if ((isAttackingHome && isUserHome) || (!isAttackingHome && !isUserHome)) {
            soundEngine.playGoalRoar();
          } else {
            soundEngine.playOpponentGoalGroan();
          }
          if (isAttackingHome) setHomeScore((s) => s + 1);
          else setAwayScore((s) => s + 1);

          setActiveGoalNetShake(targetGoal);
          setTimeout(() => setActiveGoalNetShake(null), 1100);

          addEvent({
            id: `ev_pen_goal_${currentMin}_${Date.now()}`,
            minute: currentMin,
            type: 'PENALTI_GOL',
            teamId: attackingClub.id,
            playerId: taker.id,
            playerName: taker.name,
            description: `🎯 PÊNALTI CONVERTIDO! O batedor oficial ${taker.name} (${attackingClub.shortName}) desloca ${keeper?.name || 'o goleiro'} com categoria aos ${currentMin}'!`,
            isHomeTeam: isAttackingHome,
          });
        } else {
          soundEngine.playGoalkeeperSave();
          setActiveKeeperDive({
            keeperId: keeper?.id || '',
            targetY: 43,
            angle: -35,
          });
          setTimeout(() => setActiveKeeperDive(null), 1100);

          addEvent({
            id: `ev_pen_miss_${currentMin}_${Date.now()}`,
            minute: currentMin,
            type: 'PENALTI_PERDIDO',
            teamId: attackingClub.id,
            playerId: taker.id,
            playerName: taker.name,
            description: `🧤 PÊNALTI DEFENDIDO! ${taker.name} (${attackingClub.shortName}) bate no canto, mas ${keeper?.name || 'o goleiro'} (${defendingClub.shortName}) voa para salvar aos ${currentMin}'!`,
            isHomeTeam: isAttackingHome,
          });
        }
      } else if (atkSpec.freekickTaker) {
        const fkTaker = atkSpec.freekickTaker;
        const fkGoalProb = Math.min(0.32, Math.max(0.11, 0.17 + (atkSpec.freekickSkill - 75) * 0.006));
        soundEngine.playBallKick();

        setStats((prev) => ({
          ...prev,
          homeShots: isAttackingHome ? prev.homeShots + 1 : prev.homeShots,
          awayShots: !isAttackingHome ? prev.awayShots + 1 : prev.awayShots,
          homeFouls: !isAttackingHome ? prev.homeFouls + 1 : prev.homeFouls,
          awayFouls: isAttackingHome ? prev.awayFouls + 1 : prev.awayFouls,
          homeXG: isAttackingHome ? Math.round(((prev.homeXG || 0) + 0.11) * 100) / 100 : (prev.homeXG || 0),
          awayXG: !isAttackingHome ? Math.round(((prev.awayXG || 0) + 0.11) * 100) / 100 : (prev.awayXG || 0),
        }));

        if (Math.random() < fkGoalProb) {
          if ((isAttackingHome && isUserHome) || (!isAttackingHome && !isUserHome)) {
            soundEngine.playGoalRoar();
          } else {
            soundEngine.playOpponentGoalGroan();
          }
          if (isAttackingHome) setHomeScore((s) => s + 1);
          else setAwayScore((s) => s + 1);

          setStats((prev) => ({
            ...prev,
            homeShotsOnTarget: isAttackingHome ? prev.homeShotsOnTarget + 1 : prev.homeShotsOnTarget,
            awayShotsOnTarget: !isAttackingHome ? prev.awayShotsOnTarget + 1 : prev.awayShotsOnTarget,
          }));

          setActiveGoalNetShake(targetGoal);
          setTimeout(() => setActiveGoalNetShake(null), 1100);

          addEvent({
            id: `ev_fk_goal_${currentMin}_${Date.now()}`,
            minute: currentMin,
            type: 'GOL',
            teamId: attackingClub.id,
            playerId: fkTaker.id,
            playerName: fkTaker.name,
            description: `🎯 GOLAÇO DE FALTA! Especialista na bola parada, ${fkTaker.name} (${attackingClub.shortName}) cobra por cima da barreira direto na gaveta aos ${currentMin}'!`,
            isHomeTeam: isAttackingHome,
          });
        } else {
          addEvent({
            id: `ev_fk_near_${currentMin}_${Date.now()}`,
            minute: currentMin,
            type: 'FALTA_PERIGOSA',
            teamId: attackingClub.id,
            playerId: fkTaker.id,
            playerName: fkTaker.name,
            description: `⚡ Falta frontal perigosa! ${fkTaker.name} (${attackingClub.shortName}) bate colocado buscando o ângulo e tira tinta do travessão de ${keeper?.name || 'meta'}!`,
            isHomeTeam: isAttackingHome,
          });
        }
      }
    }
    // Fouls & Cards (~4% chance per minute, elevated in historic/state derbies)
    else if (
      Math.random() <
      0.04 *
        (rivalryInfo?.foulRateMultiplier ?? 1) *
        (preMatchDerbyPosture === 'SANGUE_FRIO'
          ? 0.8
          : preMatchDerbyPosture === 'CLIMA_DE_GUERRA'
          ? 1.15
          : 1)
    ) {
      const isHomeFoul = Math.random() < 0.5;
      const committingClub = isHomeFoul ? currentHomeClub : currentAwayClub;
      const squad = committingClub.squad.filter((p) => p.isStarter);
      const fouler = squad[Math.floor(Math.random() * squad.length)] || squad[0];

      setStats((prev) => ({
        ...prev,
        homeFouls: isHomeFoul ? prev.homeFouls + 1 : prev.homeFouls,
        awayFouls: !isHomeFoul ? prev.awayFouls + 1 : prev.awayFouls,
      }));

      // Disciplinary card checks (Second yellow -> Red, Direct Red, or Yellow)
      const hasYellowAlready = fouler?.id ? yellowCardPlayerIds.has(fouler.id) : false;
      const cardRoll = Math.random();

      if (hasYellowAlready && cardRoll < 0.35) {
        // Second Yellow -> EXPULSION / RED CARD!
        soundEngine.playWhistle(false);
        setStats((prev) => ({
          ...prev,
          homeRedCards: isHomeFoul ? prev.homeRedCards + 1 : prev.homeRedCards,
          awayRedCards: !isHomeFoul ? prev.awayRedCards + 1 : prev.awayRedCards,
        }));

        addEvent({
          id: `ev_red2_${currentMin}_${Date.now()}`,
          minute: currentMin,
          type: 'CARTAO_VERMELHO',
          teamId: committingClub.id,
          playerId: fouler?.id,
          playerName: fouler?.name || 'Jogador',
          description: COMMENTARY_TEMPLATES.red[1](fouler?.name || 'Jogador'),
          isHomeTeam: isHomeFoul,
        });
      } else if (cardRoll < 0.035) {
        // Direct RED CARD!
        soundEngine.playWhistle(false);
        setStats((prev) => ({
          ...prev,
          homeRedCards: isHomeFoul ? prev.homeRedCards + 1 : prev.homeRedCards,
          awayRedCards: !isHomeFoul ? prev.awayRedCards + 1 : prev.awayRedCards,
        }));

        addEvent({
          id: `ev_red_${currentMin}_${Date.now()}`,
          minute: currentMin,
          type: 'CARTAO_VERMELHO',
          teamId: committingClub.id,
          playerId: fouler?.id,
          playerName: fouler?.name || 'Jogador',
          description: COMMENTARY_TEMPLATES.red[0](fouler?.name || 'Jogador'),
          isHomeTeam: isHomeFoul,
        });
      } else if (cardRoll < 0.35) {
        // Yellow Card
        soundEngine.playWhistle(false);
        setStats((prev) => ({
          ...prev,
          homeYellowCards: isHomeFoul ? prev.homeYellowCards + 1 : prev.homeYellowCards,
          awayYellowCards: !isHomeFoul ? prev.awayYellowCards + 1 : prev.awayYellowCards,
        }));

        const yellowText = COMMENTARY_TEMPLATES.yellow[
          Math.floor(Math.random() * COMMENTARY_TEMPLATES.yellow.length)
        ](fouler?.name || 'Jogador');

        addEvent({
          id: `ev_yellow_${currentMin}_${Date.now()}`,
          minute: currentMin,
          type: 'CARTAO_AMARELO',
          teamId: committingClub.id,
          playerId: fouler?.id,
          playerName: fouler?.name || 'Jogador',
          description: yellowText,
          isHomeTeam: isHomeFoul,
        });
      }
    }
    // In-Match Player Injury simulation (stops match for mandatory user substitution!)
    else if (
      currentMin !== 45 &&
      Math.random() <
        0.011 *
          (inGameTactic === 'PRESSAO_TOTAL' ? 1.2 : 1) *
          (rivalryInfo && preMatchDerbyPosture === 'CLIMA_DE_GUERRA' ? 1.15 : 1)
    ) {
      const isHomeVictim = Math.random() < 0.5;
      const victimClub = isHomeVictim ? currentHomeClub : currentAwayClub;
      const healthyStarters = victimClub.squad.filter(
        (p) =>
          p.isStarter &&
          !redCardPlayerIds.has(p.id) &&
          p.injuryWeeks <= 0 &&
          !p.injuryDetails
      );

      // Fatigued starters (< 72% condition) have double probability of muscle/contact injury
      const weightedStarters = healthyStarters.flatMap((p) =>
        p.condition < 72 ? [p, p] : [p]
      );
      const victim =
        weightedStarters[Math.floor(Math.random() * weightedStarters.length)];

      if (victim) {
        const matchDate = userFixture?.date || new Date().toISOString().slice(0, 10);
        const { updatedPlayer, inboxMessage } = diagnosePlayerInjury(
          victim,
          matchDate,
          userFixture?.round || 1,
          victimClub.finances.medicalFacilityLevel || 2
        );
        const injuryTitle =
          updatedPlayer.injuryDetails?.injuryType || 'Lesão Muscular';

        if (victimClub.id === userClub.id) {
          // USER CLUB PLAYER INJURED -> STOP THE MATCH IMMEDIATELY!
          soundEngine.playDoubleWhistle();
          setIsPlaying(false);
          setMatchMedicalMessages((prev) => [...prev, inboxMessage]);

          const designatedBench = victimClub.squad.filter(
            (p) =>
              !p.isStarter &&
              p.id !== victim.id &&
              p.isSubstitute &&
              !subbedOutIds.has(p.id) &&
              p.injuryWeeks <= 0 &&
              !p.injuryDetails
          );
          const availableHealthyReserves =
            designatedBench.length > 0
              ? designatedBench
              : victimClub.squad.filter(
                  (p) =>
                    !p.isStarter &&
                    p.id !== victim.id &&
                    !subbedOutIds.has(p.id) &&
                    p.injuryWeeks <= 0 &&
                    !p.injuryDetails
                );

          const canSubInjuredNow =
            subsUsed < MAX_USER_SUBS && availableHealthyReserves.length > 0;

          if (canSubInjuredNow) {
            // Keep injured player temporarily in his pitch slot so the user replaces him cleanly
            const injuredStillOnPitch: Player = {
              ...updatedPlayer,
              isStarter: true,
              pitchSlot: victim.pitchSlot,
              pitchX: victim.pitchX,
              pitchY: victim.pitchY,
              pitchRoleCode: victim.pitchRoleCode,
            };

            const updatedSquad = victimClub.squad.map((p) =>
              p.id === victim.id ? injuredStillOnPitch : p
            );
            if (isHomeVictim) {
              setCurrentHomeClub((prev) => ({ ...prev, squad: updatedSquad }));
            } else {
              setCurrentAwayClub((prev) => ({ ...prev, squad: updatedSquad }));
            }

            setPendingInjuryStoppage({
              player: injuredStillOnPitch,
              minute: currentMin,
            });
            setSelectedStarterForSub(injuredStillOnPitch);
            setSelectedReserveForSub(null);
            setIsSubModalOpen(true);

            addEvent({
              id: `ev_inj_user_${currentMin}_${Date.now()}`,
              minute: currentMin,
              type: 'LESAO',
              teamId: victimClub.id,
              playerId: victim.id,
              playerName: victim.name,
              description: `🚑 JOGO PARADO aos ${currentMin}'! ${victim.name} (${victimClub.shortName}) sente ${injuryTitle} e pede substituição imediata! Faça a troca para retomar a partida.`,
              isHomeTeam: isHomeVictim,
            });
          } else {
            // All 5 subs already spent (or zero healthy reserves) -> player leaves on stretcher (-1 on pitch)
            const updatedSquad = victimClub.squad.map((p) =>
              p.id === victim.id ? updatedPlayer : p
            );
            if (isHomeVictim) {
              setCurrentHomeClub((prev) => ({ ...prev, squad: updatedSquad }));
            } else {
              setCurrentAwayClub((prev) => ({ ...prev, squad: updatedSquad }));
            }
            setSubbedOutIds((prev) => new Set(prev).add(victim.id));
            setNoSubsInjuryAlert({ player: updatedPlayer, minute: currentMin });

            addEvent({
              id: `ev_inj_user_nosub_${currentMin}_${Date.now()}`,
              minute: currentMin,
              type: 'LESAO',
              teamId: victimClub.id,
              playerId: victim.id,
              playerName: victim.name,
              description: `🚑 JOGO PARADO aos ${currentMin}'! ${victim.name} (${victimClub.shortName}) sofreu ${injuryTitle} e precisou sair de maca! Sem substituições disponíveis, a equipe segue com um jogador a menos.`,
              isHomeTeam: isHomeVictim,
            });
          }
        } else {
          // CPU OPPONENT PLAYER INJURED -> Automatic emergency substitution if subs < 5
          soundEngine.playWhistle(false);
          const cpuReserves = victimClub.squad.filter(
            (p) =>
              !p.isStarter &&
              p.id !== victim.id &&
              !subbedOutIds.has(p.id) &&
              p.injuryWeeks <= 0 &&
              !p.injuryDetails
          );

          const emergencyCpuReserve =
            cpuSubsUsed < 5 && cpuReserves.length > 0
              ? victim.position === 'GK'
                ? cpuReserves.find((r) => r.position === 'GK') || cpuReserves[0]
                : cpuReserves.find((r) => r.detailedRole === victim.detailedRole) ||
                  cpuReserves.find((r) => r.position === victim.position && r.position !== 'GK') ||
                  cpuReserves[0]
              : undefined;

          const updatedCpuSquad = victimClub.squad.map((p) => {
            if (p.id === victim.id) return updatedPlayer;
            if (emergencyCpuReserve && p.id === emergencyCpuReserve.id) {
              return {
                ...p,
                isStarter: true,
                isSubstitute: false,
                pitchSlot: victim.pitchSlot,
                pitchX: victim.pitchX,
                pitchY: victim.pitchY,
                pitchRoleCode: victim.pitchRoleCode,
              };
            }
            return p;
          });

          if (isHomeVictim) {
            setCurrentHomeClub((prev) => ({ ...prev, squad: updatedCpuSquad }));
          } else {
            setCurrentAwayClub((prev) => ({ ...prev, squad: updatedCpuSquad }));
          }
          setSubbedOutIds((prev) => new Set(prev).add(victim.id));

          addEvent({
            id: `ev_inj_cpu_${currentMin}_${Date.now()}`,
            minute: currentMin,
            type: 'LESAO',
            teamId: victimClub.id,
            playerId: victim.id,
            playerName: victim.name,
            description: `🚑 ${victim.name} (${victimClub.shortName}) desaba no gramado com ${injuryTitle} aos ${currentMin}' e não consegue continuar!`,
            isHomeTeam: isHomeVictim,
          });

          if (emergencyCpuReserve) {
            setCpuSubsUsed((c) => c + 1);
            addEvent({
              id: `ev_cpu_injsub_${currentMin}_${Date.now() + 1}`,
              minute: currentMin,
              type: 'SUBSTITUICAO',
              teamId: victimClub.id,
              playerId: emergencyCpuReserve.id,
              playerName: emergencyCpuReserve.name,
              description: `🔄 Substituição por lesão no ${victimClub.shortName}: Sai ${victim.name} de maca e entra ${emergencyCpuReserve.name} (#${emergencyCpuReserve.squadNumber})!`,
              isHomeTeam: isHomeVictim,
            });
          }
        }
      }
    }
  };

  // Handle In-game tactical order from the touchline
  const handleChangeInGameTactic = (newTactic: InGameTacticOrder) => {
    if (isFinished || inGameTactic === newTactic) return;
    setInGameTactic(newTactic);
    soundEngine.playWhistle(false);

    const tacticLabels: Record<InGameTacticOrder, string> = {
      EQUILIBRADO: '🎯 O treinador ordena postura EQUILIBRADA: manter controle e padrão tático.',
      PRESSAO_TOTAL: '⚡ COMANDO DA ÁREA TÉCNICA: PRESSÃO ALTA! O time adianta as linhas e sufoca a saída de bola!',
      RETRANCA: '🛡️ COMANDO DA ÁREA TÉCNICA: RETRANCA! Fechar a casinha e segurar o placar com linhas recuadas!',
      CONTRA_ATAQUE: '🚀 COMANDO DA ÁREA TÉCNICA: CONTRA-ATAQUE! Atrair o rival para disparar em velocidade!',
      CHUVEIRINHO: '⚽ COMANDO DA ÁREA TÉCNICA: BLITZ AÉREA! Bolas na grande área e zagueiros no ataque!',
      SEGURAR_RESULTADO: '🧊 COMANDO DA ÁREA TÉCNICA: SEGURAR PLACAR! Troca de passes no meio-campo para administrar o resultado!',
    };

    addEvent({
      id: `ev_tactic_${minute}_${Date.now()}`,
      minute: Math.max(1, minute),
      type: 'ORDEM_TATICA',
      teamId: userClub.id,
      playerName: userClub.managerName || 'Treinador',
      description: tacticLabels[newTactic],
      isHomeTeam: isUserHome,
    });
  };

  // Handle Live Touchline Shout (no pause, 12-min momentum/morale boost with cooldown)
  const handleTriggerTouchlineShout = (shoutType: TouchlineShoutType) => {
    if (isFinished || minute < shoutCooldownUntil) return;
    const cfg = TOUCHLINE_SHOUTS.find((s) => s.id === shoutType);
    if (!cfg) return;

    soundEngine.playClick();
    const triggerMin = Math.max(1, minute);
    setActiveShout({
      type: shoutType,
      expiresMinute: triggerMin + cfg.durationMinutes,
    });
    setShoutCooldownUntil(triggerMin + cfg.cooldownMinutes);

    if (cfg.moraleStep !== 0) {
      const targetClub = isUserHome ? currentHomeClub : currentAwayClub;
      const updatedSquad = targetClub.squad.map((p) =>
        p.isStarter ? { ...p, morale: shiftPlayerMoraleStep(p.morale, cfg.moraleStep) } : p
      );
      if (isUserHome) {
        setCurrentHomeClub({ ...currentHomeClub, squad: updatedSquad });
      } else {
        setCurrentAwayClub({ ...currentAwayClub, squad: updatedSquad });
      }
    }

    const userSpec = isUserHome ? homeSpecialists : awaySpecialists;
    addEvent({
      id: `ev_shout_${triggerMin}_${Date.now()}`,
      minute: triggerMin,
      type: 'GRITO_BEIRA_CAMPO',
      teamId: userClub.id,
      playerName: userClub.managerName || 'Treinador',
      description: cfg.commentaryTemplate(
        userClub.managerName || 'Treinador',
        userClub.shortName,
        userSpec.captain?.name
      ),
      isHomeTeam: isUserHome,
    });
  };

  const addEvent = (event: MatchEvent) => {
    setEvents((prev) => [...prev, event]);
  };

  // Fast-forward 1st half up to 45' and pause at Halftime
  const handleSkipToHalftime = () => {
    if (pendingInjuryStoppage) {
      setIsSubModalOpen(true);
      return;
    }
    if (minute >= 45 || isHalftime || isFinished) return;
    soundEngine.playDoubleWhistle();
    setIsPlaying(false);

    let currHomeScore = homeScore;
    let currAwayScore = awayScore;
    const simEvents: MatchEvent[] = [...events];
    const homeStartersList = currentHomeClub.squad.filter((p) => p.isStarter);
    const awayStartersList = currentAwayClub.squad.filter((p) => p.isStarter);

    let addHomePoss = 0;
    let addAwayPoss = 0;
    let addHomeThird = 0;
    let addMidThird = 0;
    let addAwayThird = 0;
    let addHomeShots = 0;
    let addAwayShots = 0;
    let addHomeOnTarget = 0;
    let addAwayOnTarget = 0;
    let addHomeFouls = 0;
    let addAwayFouls = 0;
    let addHomeYellows = 0;
    let addAwayYellows = 0;
    let addHomeReds = 0;
    let addAwayReds = 0;

    for (let m = minute + 1; m <= 45; m++) {
      const isHome = Math.random() < 0.52;
      if (isHome) {
        addHomePoss++;
        if (Math.random() < 0.45) addAwayThird++;
        else addMidThird++;
      } else {
        addAwayPoss++;
        if (Math.random() < 0.45) addHomeThird++;
        else addMidThird++;
      }

      if (Math.random() < 0.055) {
        if (isHome) addHomeShots++;
        else addAwayShots++;
        if (Math.random() < 0.34) {
          const club = isHome ? currentHomeClub : currentAwayClub;
          const starters = isHome ? homeStartersList : awayStartersList;
          const scorerPool = starters.flatMap((p) =>
            p.position === 'FW' ? [p, p, p, p] : p.position === 'MF' ? [p, p] : p.position === 'DF' ? [p] : []
          );
          const scorer =
            scorerPool[Math.floor(Math.random() * scorerPool.length)] ||
            starters[Math.floor(Math.random() * starters.length)] ||
            starters[0];
          const assistPool = starters
            .filter((p) => p.id !== scorer?.id && p.position !== 'GK')
            .flatMap((p) => (p.position === 'MF' || p.detailedRole === 'LAT' ? [p, p, p] : [p, p]));
          const assister =
            assistPool.length > 0 && Math.random() < 0.74
              ? assistPool[Math.floor(Math.random() * assistPool.length)]
              : undefined;
          if (isHome) {
            currHomeScore++;
            addHomeOnTarget++;
          } else {
            currAwayScore++;
            addAwayOnTarget++;
          }

          simEvents.push({
            id: `ev_ht_skip_goal_${m}_${Date.now()}`,
            minute: m,
            type: 'GOL',
            teamId: club.id,
            playerId: scorer?.id,
            playerName: scorer?.name || 'Atacante',
            assistPlayerId: assister?.id,
            assistPlayerName: assister?.name,
            description: assister
              ? `GOOOL do ${club.shortName}! ${scorer?.name} marca aos ${m}' após belo passe de ${assister.name}!`
              : `GOOOL do ${club.shortName}! ${scorer?.name} balança as redes aos ${m}'!`,
            isHomeTeam: isHome,
          });
        }
      }

      if (Math.random() < 0.038 * (rivalryInfo?.foulRateMultiplier ?? 1)) {
        const isHomeFoul = Math.random() < 0.5;
        if (isHomeFoul) addHomeFouls++;
        else addAwayFouls++;
        const club = isHomeFoul ? currentHomeClub : currentAwayClub;
        const starters = isHomeFoul ? homeStartersList : awayStartersList;
        const fouler = starters[Math.floor(Math.random() * starters.length)] || starters[0];
        const cardRoll = Math.random();

        if (cardRoll < 0.035) {
          if (isHomeFoul) addHomeReds++;
          else addAwayReds++;
          simEvents.push({
            id: `ev_ht_skip_red_${m}_${Date.now()}`,
            minute: m,
            type: 'CARTAO_VERMELHO',
            teamId: club.id,
            playerId: fouler?.id,
            playerName: fouler?.name || 'Jogador',
            description: `CARTÃO VERMELHO para ${fouler?.name || 'Jogador'} (${club.shortName})! Expulso de campo!`,
            isHomeTeam: isHomeFoul,
          });
        } else if (cardRoll < 0.35) {
          if (isHomeFoul) addHomeYellows++;
          else addAwayYellows++;
          simEvents.push({
            id: `ev_ht_skip_yellow_${m}_${Date.now()}`,
            minute: m,
            type: 'CARTAO_AMARELO',
            teamId: club.id,
            playerId: fouler?.id,
            playerName: fouler?.name || 'Jogador',
            description: `Cartão amarelo para ${fouler?.name || 'Jogador'} (${club.shortName}) aos ${m}'.`,
            isHomeTeam: isHomeFoul,
          });
        }
      }
    }

    simEvents.push({
      id: `ev_ht_skip_end_${Date.now()}`,
      minute: 45,
      type: 'FIM_PRIMEIRO_TEMPO',
      teamId: '',
      playerName: 'Árbitro',
      description:
        '⏸️ Fim do 1º Tempo (45\')! Jogo parado no intervalo. Faça sua palestra de vestiário, substituições ou ajustes táticos antes de iniciar o 2º tempo.',
      isHomeTeam: true,
    });

    setPossessionCounts((prev) => ({
      home: prev.home + addHomePoss,
      away: prev.away + addAwayPoss,
    }));
    setSectorCounts((prev) => ({
      homeThird: prev.homeThird + addHomeThird,
      midThird: prev.midThird + addMidThird,
      awayThird: prev.awayThird + addAwayThird,
    }));
    setStats((prev) => ({
      ...prev,
      homeShots: prev.homeShots + addHomeShots,
      awayShots: prev.awayShots + addAwayShots,
      homeShotsOnTarget: prev.homeShotsOnTarget + addHomeOnTarget,
      awayShotsOnTarget: prev.awayShotsOnTarget + addAwayOnTarget,
      homeFouls: prev.homeFouls + addHomeFouls,
      awayFouls: prev.awayFouls + addAwayFouls,
      homeYellowCards: prev.homeYellowCards + addHomeYellows,
      awayYellowCards: prev.awayYellowCards + addAwayYellows,
      homeRedCards: prev.homeRedCards + addHomeReds,
      awayRedCards: prev.awayRedCards + addAwayReds,
      homeXG: Math.round(((prev.homeXG || 0) + addHomeShots * 0.14 + Math.max(0, currHomeScore - homeScore) * 0.28) * 100) / 100,
      awayXG: Math.round(((prev.awayXG || 0) + addAwayShots * 0.14 + Math.max(0, currAwayScore - awayScore) * 0.28) * 100) / 100,
    }));
    setActiveShot(null);
    setHomeScore(currHomeScore);
    setAwayScore(currAwayScore);
    setEvents(simEvents);
    setMinute(45);
    setIsHalftime(true);
  };

  // Instant finish: simulate remaining minutes to 90'
  const handleInstantSim = () => {
    if (pendingInjuryStoppage) {
      setIsSubModalOpen(true);
      return;
    }
    setNoSubsInjuryAlert(null);
    soundEngine.playClick();
    setIsHalftime(false);
    setIsPlaying(false);

    let currHomeScore = homeScore;
    let currAwayScore = awayScore;
    const simEvents: MatchEvent[] = [...events];
    const homeStartersList = currentHomeClub.squad.filter((p) => p.isStarter);
    const awayStartersList = currentAwayClub.squad.filter((p) => p.isStarter);

    // Minor chance of injury during instant sim
    if (Math.random() < 0.07) {
      const isHomeVictim = Math.random() < 0.5;
      const victimClub = isHomeVictim ? currentHomeClub : currentAwayClub;
      const starters = victimClub.squad.filter((p) => p.isStarter);
      const victim = starters[Math.floor(Math.random() * starters.length)];

      if (victim && victim.injuryWeeks <= 0 && !victim.injuryDetails) {
        const matchDate = userFixture?.date || new Date().toISOString().slice(0, 10);
        const { updatedPlayer, inboxMessage } = diagnosePlayerInjury(
          victim,
          matchDate,
          userFixture?.round || 1,
          victimClub.finances.medicalFacilityLevel || 2
        );

        const updatedSquad = victimClub.squad.map((p) => (p.id === victim.id ? updatedPlayer : p));
        if (isHomeVictim) {
          setCurrentHomeClub((prev) => ({ ...prev, squad: updatedSquad }));
        } else {
          setCurrentAwayClub((prev) => ({ ...prev, squad: updatedSquad }));
        }

        if (victimClub.id === userClub.id) {
          setMatchMedicalMessages((prev) => [...prev, inboxMessage]);
        }

        simEvents.push({
          id: `ev_instant_inj_${Date.now()}`,
          minute: Math.floor(Math.random() * 25) + 65,
          type: 'LESAO',
          teamId: victimClub.id,
          playerId: victim.id,
          playerName: victim.name,
          description: `🚑 ${victim.name} (${victimClub.shortName}) sofreu lesão e precisou ser avaliado pelo corpo médico após a partida.`,
          isHomeTeam: isHomeVictim,
        });
      }
    }

    let addHomePoss = 0;
    let addAwayPoss = 0;
    let addHomeThird = 0;
    let addMidThird = 0;
    let addAwayThird = 0;
    let addHomeShots = 0;
    let addAwayShots = 0;
    let addHomeOnTarget = 0;
    let addAwayOnTarget = 0;
    let addHomeFouls = 0;
    let addAwayFouls = 0;
    let addHomeYellows = 0;
    let addAwayYellows = 0;
    let addHomeReds = 0;
    let addAwayReds = 0;
    const addHomeZones = { left: 0, center: 0, right: 0 };
    const addAwayZones = { left: 0, center: 0, right: 0 };

    for (let m = minute + 1; m <= 90; m++) {
      if (m === 45) {
        simEvents.push({
          id: `ev_instant_ht_${Date.now()}`,
          minute: 45,
          type: 'FIM_PRIMEIRO_TEMPO',
          teamId: '',
          playerName: 'Árbitro',
          description: '⏸️ Intervalo de jogo! Fim do 1º tempo.',
          isHomeTeam: true,
        });
      }

      if (m === 46) {
        simEvents.push({
          id: `ev_instant_sh_${Date.now()}`,
          minute: 46,
          type: 'INICIO_SEGUNDO_TEMPO',
          teamId: '',
          playerName: 'Árbitro',
          description: '🔄 Reinício da partida! Equipes trocaram de lado de campo para o 2º tempo.',
          isHomeTeam: true,
        });
      }

      if (autoSubsActive && (m === 62 || m === 71 || m === 79) && subsUsed < MAX_USER_SUBS) {
        const myClubInstant = isUserHome ? currentHomeClub : currentAwayClub;
        const myStartersList = isUserHome ? homeStartersList : awayStartersList;
        const alreadySubbedInIds = new Set(
          simEvents
            .filter((ev) => ev.type === 'SUBSTITUICAO' && ev.teamId === userClub.id && ev.playerId)
            .map((ev) => ev.playerId as string)
        );
        const outfieldOnPitch = myStartersList.filter((p) => p.position !== 'GK');
        const benchCandidates = myClubInstant.squad.filter(
          (p) =>
            p.isSubstitute &&
            !p.isStarter &&
            !subbedOutIds.has(p.id) &&
            !alreadySubbedInIds.has(p.id) &&
            p.position !== 'GK' &&
            p.injuryWeeks === 0 &&
            !p.injuryDetails
        );
        const tiredOut = [...outfieldOnPitch].sort((a, b) => a.condition - b.condition)[0];
        if (tiredOut && benchCandidates.length > 0) {
          const freshIn = [...benchCandidates].sort((a, b) => {
            const fitA =
              a.detailedRole === tiredOut.detailedRole ? 15 : a.position === tiredOut.position ? 8 : 0;
            const fitB =
              b.detailedRole === tiredOut.detailedRole ? 15 : b.position === tiredOut.position ? 8 : 0;
            return fitB + b.overall - (fitA + a.overall);
          })[0];
          if (freshIn) {
            const idx = myStartersList.findIndex((p) => p.id === tiredOut.id);
            if (idx !== -1) {
              myStartersList[idx] = freshIn;
            }
            setSubsUsed((prev) => Math.min(MAX_USER_SUBS, prev + 1));
            setSubbedOutIds((prev) => new Set(prev).add(tiredOut.id));
            setSubHistory((prev) => [
              ...prev,
              { outPlayer: tiredOut, inPlayer: freshIn, minute: m },
            ]);
            simEvents.push({
              id: `ev_instant_autosub_${m}_${freshIn.id}`,
              minute: m,
              type: 'SUBSTITUICAO',
              teamId: userClub.id,
              playerId: freshIn.id,
              playerName: freshIn.name,
              description: `🔄 Auxiliar Técnico (${userClub.shortName}) aos ${m}': Sai ${tiredOut.name} e entra ${freshIn.name} com fôlego renovado!`,
              isHomeTeam: isUserHome,
            });
          }
        }
      }

      let homePossWeight = 0.52;
      if (isUserHome && inGameTactic === 'SEGURAR_RESULTADO') homePossWeight = 0.58;
      else if (!isUserHome && inGameTactic === 'SEGURAR_RESULTADO') homePossWeight = 0.42;
      if (m > 45 && halftimePepTalk) {
        homePossWeight += isUserHome ? halftimePepTalk.possessionShift : -halftimePepTalk.possessionShift;
      }
      const isHome = Math.random() < homePossWeight;
      const isUserAtk = (isHome && isUserHome) || (!isHome && !isUserHome);

      const zoneRoll = Math.random();
      const zoneBucket: 'left' | 'center' | 'right' =
        zoneRoll < 0.34 ? 'left' : zoneRoll < 0.68 ? 'center' : 'right';
      if (isHome) {
        addHomePoss++;
        addHomeZones[zoneBucket]++;
        if (Math.random() < 0.45) addAwayThird++;
        else addMidThird++;
      } else {
        addAwayPoss++;
        addAwayZones[zoneBucket]++;
        if (Math.random() < 0.45) addHomeThird++;
        else addMidThird++;
      }

      let chanceRate = 0.052;
      if (inGameTactic === 'SEGURAR_RESULTADO') {
        chanceRate = isUserAtk ? 0.036 : 0.032;
      }
      if (!isUserAtk && rivalryInfo) {
        chanceRate += rivalryInfo.cpuChanceBonus;
      } else if (isUserAtk && rivalryInfo && preMatchDerbyPosture === 'CLIMA_DE_GUERRA') {
        chanceRate += 0.007;
      }
      if (m > 45 && halftimePepTalk) {
        chanceRate += isUserAtk ? halftimePepTalk.userChanceBonus : halftimePepTalk.oppChanceModifier;
      }

      if (Math.random() < Math.max(0.015, chanceRate)) {
        if (isHome) addHomeShots++;
        else addAwayShots++;
        let convRate = 0.34;
        if (!isUserAtk && rivalryInfo) {
          convRate += rivalryInfo.cpuConversionBonus;
        }
        if (m > 45 && halftimePepTalk && isUserAtk) {
          convRate += halftimePepTalk.goalConversionBonus;
        }
        if (Math.random() < convRate) {
          const club = isHome ? currentHomeClub : currentAwayClub;
          const starters = isHome ? homeStartersList : awayStartersList;
          const scorerPool = starters.flatMap((p) =>
            p.position === 'FW' ? [p, p, p, p] : p.position === 'MF' ? [p, p] : p.position === 'DF' ? [p] : []
          );
          const scorer =
            scorerPool[Math.floor(Math.random() * scorerPool.length)] ||
            starters[Math.floor(Math.random() * starters.length)] ||
            starters[0];
          const assistPool = starters
            .filter((p) => p.id !== scorer?.id && p.position !== 'GK')
            .flatMap((p) => (p.position === 'MF' || p.detailedRole === 'LAT' ? [p, p, p] : [p, p]));
          const assister =
            assistPool.length > 0 && Math.random() < 0.74
              ? assistPool[Math.floor(Math.random() * assistPool.length)]
              : undefined;
          if (isHome) {
            currHomeScore++;
            addHomeOnTarget++;
          } else {
            currAwayScore++;
            addAwayOnTarget++;
          }

          simEvents.push({
            id: `ev_instant_${m}_${Date.now()}`,
            minute: m,
            type: 'GOL',
            teamId: club.id,
            playerId: scorer?.id,
            playerName: scorer?.name || 'Atacante',
            assistPlayerId: assister?.id,
            assistPlayerName: assister?.name,
            description: assister
              ? `GOOOL do ${club.shortName}! ${scorer?.name} marca aos ${m}' com assistência de ${assister.name}!`
              : `GOOOL do ${club.shortName}! ${scorer?.name} balança as redes aos ${m}'!`,
            isHomeTeam: isHome,
          });
        }
      }

      // Fouls and cards during instant sim
      if (Math.random() < 0.038 * (rivalryInfo?.foulRateMultiplier ?? 1)) {
        const isHomeFoul = Math.random() < 0.5;
        if (isHomeFoul) addHomeFouls++;
        else addAwayFouls++;
        const club = isHomeFoul ? currentHomeClub : currentAwayClub;
        const starters = isHomeFoul ? homeStartersList : awayStartersList;
        const fouler = starters[Math.floor(Math.random() * starters.length)] || starters[0];
        const cardRoll = Math.random();

        if (cardRoll < 0.035) {
          if (isHomeFoul) addHomeReds++;
          else addAwayReds++;
          simEvents.push({
            id: `ev_instant_red_${m}_${Date.now()}`,
            minute: m,
            type: 'CARTAO_VERMELHO',
            teamId: club.id,
            playerId: fouler?.id,
            playerName: fouler?.name || 'Jogador',
            description: `CARTÃO VERMELHO para ${fouler?.name || 'Jogador'} (${club.shortName})! Expulso de campo!`,
            isHomeTeam: isHomeFoul,
          });
        } else if (cardRoll < 0.35) {
          if (isHomeFoul) addHomeYellows++;
          else addAwayYellows++;
          simEvents.push({
            id: `ev_instant_yellow_${m}_${Date.now()}`,
            minute: m,
            type: 'CARTAO_AMARELO',
            teamId: club.id,
            playerId: fouler?.id,
            playerName: fouler?.name || 'Jogador',
            description: `Cartão amarelo para ${fouler?.name || 'Jogador'} (${club.shortName}) aos ${m}'.`,
            isHomeTeam: isHomeFoul,
          });
        }
      }
    }

    setPossessionCounts((prev) => ({
      home: prev.home + addHomePoss,
      away: prev.away + addAwayPoss,
    }));
    setSectorCounts((prev) => ({
      homeThird: prev.homeThird + addHomeThird,
      midThird: prev.midThird + addMidThird,
      awayThird: prev.awayThird + addAwayThird,
    }));
    setAttackZonesCounts((prev) => ({
      home: {
        left: prev.home.left + addHomeZones.left,
        center: prev.home.center + addHomeZones.center,
        right: prev.home.right + addHomeZones.right,
      },
      away: {
        left: prev.away.left + addAwayZones.left,
        center: prev.away.center + addAwayZones.center,
        right: prev.away.right + addAwayZones.right,
      },
    }));
    setStats((prev) => ({
      ...prev,
      homeShots: prev.homeShots + addHomeShots,
      awayShots: prev.awayShots + addAwayShots,
      homeShotsOnTarget: prev.homeShotsOnTarget + addHomeOnTarget,
      awayShotsOnTarget: prev.awayShotsOnTarget + addAwayOnTarget,
      homeFouls: prev.homeFouls + addHomeFouls,
      awayFouls: prev.awayFouls + addAwayFouls,
      homeYellowCards: prev.homeYellowCards + addHomeYellows,
      awayYellowCards: prev.awayYellowCards + addAwayYellows,
      homeRedCards: prev.homeRedCards + addHomeReds,
      awayRedCards: prev.awayRedCards + addAwayReds,
      homeXG: Math.round(((prev.homeXG || 0) + addHomeShots * 0.14 + Math.max(0, currHomeScore - homeScore) * 0.28) * 100) / 100,
      awayXG: Math.round(((prev.awayXG || 0) + addAwayShots * 0.14 + Math.max(0, currAwayScore - awayScore) * 0.28) * 100) / 100,
    }));
    setHomeScore(currHomeScore);
    setAwayScore(currAwayScore);
    setEvents(simEvents);
    setMinute(90);
    handleMatchFinished(currHomeScore, currAwayScore, simEvents);
  };

  // Finish match logic
  const handleMatchFinished = (
    finalHomeScore = homeScore, 
    finalAwayScore = awayScore, 
    finalEvents = events
  ) => {
    setIsFinished(true);
    setIsPlaying(false);
    soundEngine.playDoubleWhistle();

    // Check if this knockout tie must be decided by penalty shootout
    const willGoToPenalties = isKnockoutMatch && userFixture?.leg !== 1 && (
      userFixture?.leg === 2
        ? ((finalHomeScore + leg1HomeGoals) === (finalAwayScore + leg1AwayGoals) &&
            (!usesAwayGoalsTiebreak || leg1HomeGoals === finalAwayScore))
        : (finalHomeScore === finalAwayScore)
    );

    if (willGoToPenalties && !penaltyResult) {
      setTimeout(() => {
        setIsPenaltyShootoutActive(true);
      }, 950);
      return;
    }

    // Check if user won
    const userWon = isUserHome 
      ? finalHomeScore > finalAwayScore 
      : finalAwayScore > finalHomeScore;

    if (userWon) {
      soundEngine.playFanfare();
      if (gameSettings.enableConfetti) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
        });
      }
    }
  };

  // Complete penalty shootout callback
  const handleCompleteShootout = (
    penaltiesHome: number,
    penaltiesAway: number,
    winnerClubId: string,
    shootoutEvents: MatchEvent[],
    penaltyRecords: any[]
  ) => {
    setPenaltyResult({
      penaltiesHome,
      penaltiesAway,
      winnerId: winnerClubId,
      penaltyKicks: penaltyRecords,
    });
    setIsPenaltyShootoutActive(false);
    setIsFinished(true);

    const winnerName = winnerClubId === homeClub.id ? homeClub.name : awayClub.name;
    const recapEvent: MatchEvent = {
      id: `ev_pen_final_${Date.now()}`,
      minute: 120,
      type: 'FIM_JOGO',
      teamId: winnerClubId,
      playerName: 'Pênaltis Decisivos',
      description: `🏆 DECISÃO POR PÊNALTIS FINALIZADA! ${homeClub.shortName} (${penaltiesHome}) x (${penaltiesAway}) ${awayClub.shortName}. O ${winnerName} conquista a vitória dramática nos pênaltis e garante a classificação!`,
      isHomeTeam: winnerClubId === homeClub.id,
    };

    setEvents((prev) => [...prev, ...shootoutEvents, recapEvent]);

    if (winnerClubId === userClub.id) {
      soundEngine.playFanfare();
      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.5 },
      });
    }
  };

  // Batch Substitution execution (1 to 5 simultaneous changes at once!)
  const handleConfirmBatchSubstitutions = (
    subs: SubstitutionPair[],
    resumeAfter: boolean = false
  ) => {
    if (!subs || subs.length === 0 || subsUsed >= MAX_USER_SUBS) return;
    const allowedCount = Math.min(subs.length, MAX_USER_SUBS - subsUsed);
    const validPairs = subs.slice(0, allowedCount);

    const outById = new Map(validPairs.map((pair) => [pair.outPlayer.id, pair]));
    const inById = new Map(validPairs.map((pair) => [pair.inPlayer.id, pair]));

    const currentClub = isUserHome ? currentHomeClub : currentAwayClub;
    const updatedSquad = currentClub.squad.map((p) => {
      const outPair = outById.get(p.id);
      if (outPair) {
        const isInjuredOut = p.injuryWeeks > 0 || Boolean(p.injuryDetails);
        return {
          ...p,
          isStarter: false,
          isSubstitute: !isInjuredOut,
          pitchSlot: undefined,
          pitchX: undefined,
          pitchY: undefined,
          pitchRoleCode: undefined,
        };
      }
      const inPair = inById.get(p.id);
      if (inPair) {
        return {
          ...p,
          isStarter: true,
          isSubstitute: false,
          pitchSlot: inPair.outPlayer.pitchSlot,
          pitchX: inPair.outPlayer.pitchX,
          pitchY: inPair.outPlayer.pitchY,
          pitchRoleCode: inPair.outPlayer.pitchRoleCode,
        };
      }
      return p;
    });

    if (isUserHome) {
      setCurrentHomeClub({ ...currentHomeClub, squad: updatedSquad });
    } else {
      setCurrentAwayClub({ ...currentAwayClub, squad: updatedSquad });
    }

    const subMin = Math.max(1, minute);
    setSubsUsed((prev) => prev + validPairs.length);
    setSubbedOutIds((prev) => {
      const next = new Set(prev);
      validPairs.forEach((pair) => next.add(pair.outPlayer.id));
      return next;
    });
    setSubHistory((prev) => [
      ...prev,
      ...validPairs.map((pair) => ({
        outPlayer: pair.outPlayer,
        inPlayer: pair.inPlayer,
        minute: subMin,
      })),
    ]);

    soundEngine.playWhistle(false);

    if (validPairs.length === 1) {
      const single = validPairs[0];
      const wasInjured =
        single.outPlayer.injuryWeeks > 0 || Boolean(single.outPlayer.injuryDetails);
      addEvent({
        id: `ev_sub_${subMin}_${Date.now()}`,
        minute: subMin,
        type: 'SUBSTITUICAO',
        teamId: userClub.id,
        playerId: single.inPlayer.id,
        playerName: single.inPlayer.name,
        description: wasInjured
          ? `🔄 Substituição por lesão no ${userClub.shortName} aos ${subMin}': Sai ${single.outPlayer.name} (#${single.outPlayer.squadNumber}) para tratamento médico e entra ${single.inPlayer.name} (#${single.inPlayer.squadNumber})!`
          : `🔄 Substituição no ${userClub.shortName} aos ${subMin}': Sai ${single.outPlayer.name} (#${single.outPlayer.squadNumber}) e entra ${single.inPlayer.name} (#${single.inPlayer.squadNumber})!`,
        isHomeTeam: isUserHome,
      });
    } else {
      const changesList = validPairs
        .map(
          (pair) =>
            `entra ${pair.inPlayer.name} (#${pair.inPlayer.squadNumber}) no lugar de ${pair.outPlayer.name}`
        )
        .join('; ');
      addEvent({
        id: `ev_batch_sub_${subMin}_${Date.now()}`,
        minute: subMin,
        type: 'SUBSTITUICAO',
        teamId: userClub.id,
        playerId: validPairs[0].inPlayer.id,
        playerName: `${validPairs.length} Substituições`,
        description: `🔄 Pacote de ${validPairs.length} mudanças simultâneas no ${userClub.shortName} aos ${subMin}': ${changesList}!`,
        isHomeTeam: isUserHome,
      });
    }

    if (
      pendingInjuryStoppage &&
      validPairs.some((pair) => pair.outPlayer.id === pendingInjuryStoppage.player.id)
    ) {
      setPendingInjuryStoppage(null);
      if (resumeAfter && !isHalftime && !isFinished) {
        setIsPlaying(true);
      }
    }
  };

  // Fallback if user elects to remove injured player on stretcher without spending a substitution
  const handleRemoveInjuredWithoutSub = (injuredPlayer: Player) => {
    const currentClub = isUserHome ? currentHomeClub : currentAwayClub;
    const updatedSquad = currentClub.squad.map((p) =>
      p.id === injuredPlayer.id
        ? {
            ...p,
            isStarter: false,
            isSubstitute: false,
            pitchSlot: undefined,
            pitchX: undefined,
            pitchY: undefined,
            pitchRoleCode: undefined,
          }
        : p
    );

    if (isUserHome) {
      setCurrentHomeClub({ ...currentHomeClub, squad: updatedSquad });
    } else {
      setCurrentAwayClub({ ...currentAwayClub, squad: updatedSquad });
    }

    setSubbedOutIds((prev) => new Set(prev).add(injuredPlayer.id));
    setPendingInjuryStoppage(null);
    soundEngine.playWhistle(false);

    addEvent({
      id: `ev_inj_stretcher_${minute}_${Date.now()}`,
      minute: Math.max(1, minute),
      type: 'LESAO',
      teamId: userClub.id,
      playerId: injuredPlayer.id,
      playerName: injuredPlayer.name,
      description: `🚑 ${injuredPlayer.name} deixa o campo de maca aos ${Math.max(1, minute)}' sem substituição. O ${userClub.shortName} segue a partida com um jogador a menos!`,
      isHomeTeam: isUserHome,
    });

    if (!isHalftime && !isFinished) {
      setIsPlaying(true);
    }
  };

  // Handle clicking a starter on the pitch
  const handleSelectStarterOnPitch = (starter: Player) => {
    if (subsUsed >= MAX_USER_SUBS) return;
    soundEngine.playClick();
    setSelectedStarterForSub(pendingInjuryStoppage?.player || starter);
    setSelectedReserveForSub(null);
    setIsSubModalOpen(true);
  };

  // Handle clicking a reserve in the bench bar
  const handleOpenSubForReserve = (reserve: Player) => {
    if (subsUsed >= MAX_USER_SUBS) return;
    soundEngine.playClick();
    setSelectedReserveForSub(reserve);
    setSelectedStarterForSub(pendingInjuryStoppage?.player || null);
    setIsSubModalOpen(true);
  };

  // Open general sub modal
  const handleOpenGeneralSubModal = () => {
    if (subsUsed >= MAX_USER_SUBS) return;
    soundEngine.playClick();
    setSelectedStarterForSub(pendingInjuryStoppage?.player || null);
    setSelectedReserveForSub(null);
    setIsSubModalOpen(true);
  };

  // In-Match Keyboard Shortcuts: Space (Play/Pause/2nd Half), 1/2/3 (Speed 1x/2x/4x), S (Substitutions)
  useEffect(() => {
    const handleMatchKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (isPenaltyShootoutActive) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isSubModalOpen || isFinished) return;
        soundEngine.playClick();
        if (isHalftime) {
          handleStartSecondHalf();
          return;
        }
        if (pendingInjuryStoppage) {
          setIsSubModalOpen(true);
          return;
        }
        if (noSubsInjuryAlert) {
          setNoSubsInjuryAlert(null);
          setIsPlaying(true);
          return;
        }
        setIsPlaying((prev) => !prev);
      } else if (e.key === '1' && !isFinished && !isSubModalOpen) {
        soundEngine.playClick();
        setSpeed(1);
      } else if (e.key === '2' && !isFinished && !isSubModalOpen) {
        soundEngine.playClick();
        setSpeed(2);
      } else if ((e.key === '3' || e.key === '4') && !isFinished && !isSubModalOpen) {
        soundEngine.playClick();
        setSpeed(4);
      } else if ((e.key === 's' || e.key === 'S') && !isFinished && !isSubModalOpen) {
        if (subsUsed < MAX_USER_SUBS) {
          e.preventDefault();
          soundEngine.playClick();
          setSelectedStarterForSub(pendingInjuryStoppage?.player || null);
          setSelectedReserveForSub(null);
          setIsSubModalOpen(true);
        }
      } else if (e.key === 'Escape' && isSubModalOpen) {
        e.preventDefault();
        setIsSubModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleMatchKeyDown);
    return () => window.removeEventListener('keydown', handleMatchKeyDown);
  }, [
    isPenaltyShootoutActive,
    isSubModalOpen,
    isFinished,
    isHalftime,
    pendingInjuryStoppage,
    noSubsInjuryAlert,
    subsUsed,
  ]);

  // Close & advance round
  const handleConfirmFinish = () => {
    soundEngine.playClick();
    const attendance = matchAttendance;
    const ticketRevenue = matchTicketRevenue;

    const finalMatchRatings: MatchPlayerRatingSummary[] = Array.from(
      liveRatingsMap.values()
    ).sort((a, b) => b.rating - a.rating);

    // Build completed user fixture with penalties, attack zones, match ratings & live possession
    const completedUserFixture: Fixture = {
      ...(userFixture as Fixture),
      homeScore,
      awayScore,
      played: true,
      attendance,
      ticketRevenue,
      events,
      penaltiesHome: penaltyResult?.penaltiesHome,
      penaltiesAway: penaltyResult?.penaltiesAway,
      aggregateWinnerId: penaltyResult?.winnerId,
      aggregateHomeScore,
      aggregateAwayScore,
      penaltyKicks: penaltyResult?.penaltyKicks,
      stats: {
        ...stats,
        homePossession: liveHomePossession,
        awayPossession: liveAwayPossession,
        homeAttackZones,
        awayAttackZones,
        matchRatings: finalMatchRatings,
      },
    };

    // Update player fatigue, matches, goals and assists for participating clubs
    const updatedClubs = allClubs.map((club) => {
      if (club.id === homeClub.id || club.id === awayClub.id) {
        const isClubHome = club.id === homeClub.id;
        const currentClub = isClubHome ? currentHomeClub : currentAwayClub;
        const clubScore = isClubHome ? homeScore : awayScore;
        const oppScore = isClubHome ? awayScore : homeScore;
        const clubGoals = events.filter(
          (e) => (e.type === 'GOL' || e.type === 'PENALTI_GOL') && e.teamId === club.id
        );
        const clubYellows = events.filter((e) => e.type === 'CARTAO_AMARELO' && e.teamId === club.id);
        const clubReds = events.filter((e) => e.type === 'CARTAO_VERMELHO' && e.teamId === club.id);

        const updatedSquadRaw = currentClub.squad.map((p) => {
          const playedInMatch =
            p.isStarter ||
            subHistory.some((s) => s.inPlayer.id === p.id) ||
            subbedOutIds.has(p.id);
          const goalsInMatch = clubGoals.filter((g) => g.playerId === p.id).length;
          const assistsInMatch = clubGoals.filter((g) =>
            g.assistPlayerId ? g.assistPlayerId === p.id : g.assistPlayerName === p.name
          ).length;
          const yellowsInMatch = clubYellows.filter((y) => y.playerId === p.id).length;
          const redsInMatch = clubReds.filter((r) => r.playerId === p.id).length;

          // Fatigue reduction (starters lose condition based on live tactical intensity)
          let condCost = 12;
          if (inGameTactic === 'PRESSAO_TOTAL') condCost = 15;
          else if (inGameTactic === 'RETRANCA') condCost = 10;
          else if (inGameTactic === 'SEGURAR_RESULTADO') condCost = 9;

          let newCondition = p.condition;
          if (p.isStarter) {
            newCondition = Math.max(40, p.condition - condCost);
          } else if (playedInMatch) {
            newCondition = Math.max(45, p.condition - Math.round(condCost * 0.6));
          } else {
            newCondition = Math.min(100, p.condition + 5);
          }

          // Morale update (influenced by match result or penalty outcome)
          let newMorale = p.morale;
          if (penaltyResult) {
            newMorale = penaltyResult.winnerId === club.id ? 'Excelente' : 'Regular';
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

        // Add matchday ticket + concession revenue and debit matchday/travel operational expenses
        const matchDateStr = userFixture?.date || new Date().toISOString().slice(0, 10);
        let finances = { ...club.finances };
        if (isClubHome) {
          if (club.id === userClub.id) {
            finances = recordFinanceLedgerMutation(finances, {
              date: matchDateStr,
              category: 'TICKETS',
              type: 'INCOME',
              amount: ticketRevenue,
              description: `Bilheteria (${matchAttendance.toLocaleString('pt-BR')} pagantes · ${homeClub.shortName} x ${awayClub.shortName}) + Matchday`,
              applyToBalance: true,
            });
            finances = recordFinanceLedgerMutation(finances, {
              date: matchDateStr,
              category: 'MATCHDAY_OPS',
              type: 'EXPENSE',
              amount: matchEcon.homeMatchOpsCost,
              description: `Operação da Arena (${homeClub.stadium.name})`,
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
            description: `Logística & Viagem (vs ${homeClub.shortName})`,
            applyToBalance: true,
          });
        }

        return {
          ...currentClub,
          finances,
          squad: updatedSquad,
        };
      }
      return club;
    });

    onFinishRound(completedUserFixture, otherMatches, updatedClubs, matchMedicalMessages);
  };

  // Real Craque do Jogo based on live 0.0-10.0 match ratings
  const manOfTheMatch = motmEntry
    ? `${motmEntry.playerName} (${motmEntry.clubShortName} · Nota ${motmEntry.rating.toFixed(1)})`
    : (isUserHome ? homeClub.squad[9]?.name : awayClub.squad[9]?.name) || 'Destaque em Campo';
  const attendance = matchAttendance;
  const revenue = matchTicketRevenue;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-1.5 sm:p-3 pt-[max(0.375rem,env(safe-area-inset-top))] pb-[max(0.375rem,env(safe-area-inset-bottom))] overflow-hidden">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-[1440px] h-[96dvh] max-h-[96dvh] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Top Bar: Competition & Round */}
        <div className="bg-black px-3 sm:px-5 py-1.5 flex items-center justify-between gap-2 border-b border-slate-900 shrink-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {(() => {
              const meta = COMPETITIONS_CATALOG[userFixture?.competition || 'serie_a'] || COMPETITIONS_CATALOG.serie_a;
              return (
                <span className="text-xs font-bold text-sky-300 flex flex-wrap items-center gap-1.5 truncate">
                  <CompetitionCrest meta={meta} size="xs" />
                  <span style={{ color: meta.primaryColor }}>{userFixture?.cupPhase || `${meta.shortName} · Rodada ${userFixture?.round}`}</span>
                  <span className="text-slate-600 font-normal" aria-hidden="true">·</span>
                  <span className="text-slate-400 font-normal hidden sm:inline">{userFixture?.date ? formatCalendarDate(userFixture.date) : 'Data Oficial'}</span>
                  {rivalryInfo && (
                    <>
                      <span className="text-slate-600 font-normal" aria-hidden="true">·</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>{rivalryInfo.derbyName}</span>
                      </span>
                    </>
                  )}
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold tabular-nums text-sky-400 border border-sky-950">
              <Clock className="w-3.5 h-3.5" />
              <span>{minute}'</span>
            </div>
            {isHalftime && !isFinished && (
              <span className="text-amber-400 text-xs font-bold">
                Intervalo
              </span>
            )}
            {isFinished && (
              <span className="text-sky-300 text-xs font-bold">
                Encerrado
              </span>
            )}
          </div>
        </div>

        {/* Compact Scoreboard Banner with dynamic attack direction arrows */}
        <div className="bg-gradient-to-b from-slate-950 to-black px-3 sm:px-5 py-2 sm:py-2.5 border-b border-slate-900 shrink-0">
          <div className="grid grid-cols-12 items-center gap-2">
            {/* Home Team */}
            <div className="col-span-5 flex items-center justify-end gap-2.5 sm:gap-3 min-w-0">
              <div className="text-right min-w-0">
                <div className="flex items-center justify-end gap-1.5">
                  <h2 className="text-sm sm:text-lg font-extrabold text-white leading-tight truncate">
                    {homeClub.name}
                  </h2>
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 font-mono font-bold shrink-0"
                    title={`Mandante atacando para a ${homeDefendsLeft ? 'Direita ➔' : 'Esquerda '}`}
                  >
                    {homeDefendsLeft ? '➔' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                  {homeClub.stadium.name} · Mandante
                </p>
              </div>
              <ClubCrest club={homeClub} size="md" rounded="xl" />
            </div>

            {/* Placar Central */}
            <div className="col-span-2 flex flex-col items-center justify-center">
              <div className="bg-black border border-sky-900/60 px-2.5 sm:px-4 py-1 rounded-xl shadow-lg flex items-center gap-1.5 sm:gap-2.5">
                <span className="text-xl sm:text-3xl font-black font-mono text-sky-300 tabular-nums">
                  {homeScore}
                </span>
                <span className="text-slate-600 font-bold text-sm sm:text-base">×</span>
                <span className="text-xl sm:text-3xl font-black font-mono text-sky-300 tabular-nums">
                  {awayScore}
                </span>
              </div>
              <span
                className={`text-[10px] mt-0.5 font-semibold whitespace-nowrap ${
                  isHalftime ? 'text-amber-400 font-bold' : 'text-sky-400/80'
                }`}
              >
                {isFinished
                  ? 'Fim de Jogo'
                  : isHalftime
                  ? 'Intervalo'
                  : minute <= 45
                  ? '1º Tempo'
                  : '2º Tempo'}
              </span>
              {userFixture?.leg === 2 && aggregateHomeScore !== undefined && aggregateAwayScore !== undefined && (
                <span className="text-[10px] text-amber-300 font-bold tabular-nums">
                  Agregado: {aggregateHomeScore} × {aggregateAwayScore}
                </span>
              )}
              {penaltyResult && (
                <span className="text-[10px] text-amber-300 font-bold tabular-nums">
                  Pênaltis: {penaltyResult.penaltiesHome} × {penaltyResult.penaltiesAway}
                </span>
              )}
            </div>

            {/* Away Team */}
            <div className="col-span-5 flex items-center justify-start gap-2.5 sm:gap-3 min-w-0">
              <ClubCrest club={awayClub} size="md" rounded="xl" />
              <div className="text-left min-w-0">
                <div className="flex items-center justify-start gap-1.5">
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 font-mono font-bold shrink-0"
                    title={`Visitante atacando para a ${homeDefendsLeft ? 'Esquerda ' : 'Direita ➔'}`}
                  >
                    {homeDefendsLeft ? '' : '➔'}
                  </span>
                  <h2 className="text-sm sm:text-lg font-extrabold text-white leading-tight truncate">
                    {awayClub.name}
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">Visitante</p>
              </div>
            </div>
          </div>
        </div>

        {/* Knockout Tie Shootout Alert Banner */}
        {isFinished && isTiedKnockout && !penaltyResult && (
          <div className="bg-gradient-to-r from-amber-950 via-slate-950 to-amber-950 border-b border-amber-500/40 px-4 sm:px-5 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase">
              <span className="text-base">🔥</span>
              <span>Empate no mata-mata! A vaga será decidida nos pênaltis!</span>
            </div>
            <button
              onClick={() => setIsPenaltyShootoutActive(true)}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Disputar Pênaltis</span>
            </button>
          </div>
        )}

        {/* Halftime Locker Room & Pep Talk Panel (45') */}
        {isHalftime && !isFinished && (
          <div className="bg-slate-950 border-b border-amber-500/30 px-4 sm:px-5 py-3 space-y-2.5 shrink-0 max-h-[38vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-amber-300">
                  Vestiário no Intervalo (45')
                </span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="text-slate-300">
                  {halftimePepTalk
                    ? 'Palestra realizada! Ajuste substituições ou inicie a etapa final.'
                    : 'Escolha o tom da sua conversa com o elenco antes de voltar para o 2º tempo:'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleStartSecondHalf}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar 2º Tempo</span>
              </button>
            </div>

            {!halftimePepTalk ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {HALFTIME_PEP_TALKS_CATALOG.map((option) => (
                  <button
                    key={option.tone}
                    type="button"
                    onClick={() => handleDeliverHalftimePepTalk(option.tone)}
                    className="text-left p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 transition-colors cursor-pointer flex flex-col justify-between gap-1"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{option.title}</p>
                      <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                        {option.subtitle}
                      </p>
                    </div>
                    <p className="text-[10px] text-amber-400/90 font-medium pt-1 border-t border-slate-800/80">
                      {option.idealContext}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-white">{halftimePepTalk.title}</span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span
                      className={`font-bold ${
                        halftimePepTalk.reactionType === 'INSPIRED'
                          ? 'text-emerald-400'
                          : halftimePepTalk.reactionType === 'FOCUSED'
                          ? 'text-sky-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {halftimePepTalk.reactionBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{halftimePepTalk.lockerRoomFeedback}</p>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-emerald-300">
                  {halftimePepTalk.effectSummary}
                </span>
              </div>
            )}

            {/* Quick Halftime Tactical Adjustment Strip */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Ajuste Tático p/ o 2º Tempo:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'EQUILIBRADO' as InGameTacticOrder, label: 'Manter Postura' },
                  { id: 'PRESSAO_TOTAL' as InGameTacticOrder, label: 'Adelantar Linhas' },
                  { id: 'SEGURAR_RESULTADO' as InGameTacticOrder, label: 'Segurar o Placar' },
                  { id: 'CONTRA_ATAQUE' as InGameTacticOrder, label: 'Contra-Ataque' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleChangeInGameTactic(opt.id)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      inGameTactic === opt.id
                        ? 'bg-sky-400 text-slate-950 border-sky-300'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Emergency In-Match Injury Stoppage Banner */}
        {!isFinished && pendingInjuryStoppage && (
          <div className="bg-rose-950/50 border-b border-rose-500/40 px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-rose-200 tabular-nums">
                  Jogo Parado aos {pendingInjuryStoppage.minute}&apos; · Jogador Machucado em Campo
                </div>
                <div className="text-rose-300/90 tabular-nums">
                  {pendingInjuryStoppage.player.name} (#{pendingInjuryStoppage.player.squadNumber} ·{' '}
                  {pendingInjuryStoppage.player.detailedRole}) sofreu{' '}
                  {pendingInjuryStoppage.player.injuryDetails?.injuryType || 'lesão muscular'} e precisa ser substituído para a bola voltar a rolar.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRemoveInjuredWithoutSub(pendingInjuryStoppage.player)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 border border-rose-500/40 text-rose-200 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
              >
                Retirar de Maca (-1)
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedStarterForSub(pendingInjuryStoppage.player);
                  setIsSubModalOpen(true);
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer transition-colors whitespace-nowrap tabular-nums"
              >
                Substituir Lesionado ({MAX_USER_SUBS - subsUsed} restantes)
              </button>
            </div>
          </div>
        )}

        {/* Alert when user player gets injured with 0 substitutions left */}
        {!isFinished && noSubsInjuryAlert && (
          <div className="bg-rose-950/50 border-b border-rose-500/40 px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-rose-200 tabular-nums">
                  Jogo Parado aos {noSubsInjuryAlert.minute}&apos; · Atleta Retirado de Maca
                </div>
                <div className="text-rose-300/90">
                  {noSubsInjuryAlert.player.name} sofreu{' '}
                  {noSubsInjuryAlert.player.injuryDetails?.injuryType || 'lesão'} e deixou o gramado. Como não há substituições disponíveis, sua equipe seguirá com um jogador a menos.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playWhistle(false);
                setNoSubsInjuryAlert(null);
                if (!isHalftime) setIsPlaying(true);
              }}
              className="px-4 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs cursor-pointer transition-colors whitespace-nowrap"
            >
              Retomar Partida
            </button>
          </div>
        )}

        {/* Speed & Control Bar */}
        <div className="bg-slate-950 px-3 sm:px-5 py-2 border-b border-slate-900 flex items-center justify-between gap-2 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            {!isFinished && (
              isHalftime ? (
                <button
                  type="button"
                  onClick={handleStartSecondHalf}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-slate-950 shadow transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Iniciar 2º Tempo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    if (pendingInjuryStoppage) {
                      setIsSubModalOpen(true);
                      return;
                    }
                    if (noSubsInjuryAlert) {
                      setNoSubsInjuryAlert(null);
                      setIsPlaying(true);
                      return;
                    }
                    setIsPlaying(!isPlaying);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white border border-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isPlaying && !pendingInjuryStoppage && !noSubsInjuryAlert ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {pendingInjuryStoppage
                      ? 'Substituir Lesionado'
                      : isPlaying && !noSubsInjuryAlert
                      ? 'Pausar'
                      : 'Continuar'}
                  </span>
                </button>
              )
            )}

            {/* Speed buttons */}
            {!isFinished && (
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSpeed(s);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors cursor-pointer ${
                      speed === s ? 'bg-sky-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}

            {/* In-match tactical substitution shortcut */}
            {!isFinished && (
              <button
                type="button"
                onClick={handleOpenGeneralSubModal}
                disabled={subsUsed >= MAX_USER_SUBS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-emerald-400 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                title="Abrir tela de substituição (Atalho: tecla S)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>Substituir ({MAX_USER_SUBS - subsUsed})</span>
              </button>
            )}

            {/* Live Assistant Auto-Substitutions Toggle */}
            {!isFinished && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setAutoSubsActive((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  autoSubsActive
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Auxiliar Técnico faz automaticamente até 5 trocas no 2º tempo (58'–84') para atletas desgastados ou amarelados"
              >
                <span>Auto-Subs IA: {autoSubsActive ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* 2D Pitch Territorial Sector Overlay Toggle */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowSectorOverlay((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                showSectorOverlay
                  ? 'bg-sky-950/80 border-sky-500/40 text-sky-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Alternar mapa de domínio territorial por setores no gramado 2D"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mapa de Setores</span>
            </button>
          </div>

          {/* Fast-forward options */}
          {!isFinished && (
            <div className="flex items-center gap-2">
              {minute < 45 && !isHalftime && (
                <button
                  type="button"
                  onClick={handleSkipToHalftime}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FastForward className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ir p/ Intervalo</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleInstantSim}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-500/40 text-xs font-bold text-sky-300 shadow transition-all cursor-pointer whitespace-nowrap"
              >
                <SkipForward className="w-3.5 h-3.5 text-sky-400" />
                <span>Resultado Instantâneo</span>
              </button>
            </div>
          )}

          {isFinished && (
            <button
              type="button"
              onClick={handleConfirmFinish}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 font-black text-sm shadow-xl shadow-sky-500/30 cursor-pointer animate-bounce"
            >
              <span>CONCLUIR RODADA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Main Split-Screen Broadcast Area: Scrollable vertically on mobile/tablet, locked split-screen on desktop */}
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
          {/* Left / Main Stage (8 cols): 2D Live Pitch + Compact Touchline Command Dock */}
          <div className="shrink-0 lg:shrink lg:col-span-8 lg:min-h-0 lg:overflow-y-auto p-3 sm:p-4 flex flex-col gap-2.5 bg-slate-950/35">
            {/* 60fps Live 2D Pitch — Always pinned in direct view */}
            <LiveMatchPitch2D
              homeClub={currentHomeClub}
              awayClub={currentAwayClub}
              homeStarters={homeStarters}
              awayStarters={awayStarters}
              homeBaseSlots={homeBaseSlots}
              awayBaseSlots={awayBaseSlots}
              homeDefendsLeft={homeDefendsLeft}
              isSecondHalf={isSecondHalf}
              isUserHome={isUserHome}
              isPlaying={isPlaying}
              isHalftime={isHalftime}
              isFinished={isFinished}
              isPausedByStoppage={
                isSubModalOpen ||
                Boolean(pendingInjuryStoppage) ||
                Boolean(noSubsInjuryAlert) ||
                isPenaltyShootoutActive
              }
              speed={speed}
              minute={minute}
              inGameTactic={inGameTactic}
              preferredPossession={possessionTeam}
              events={events}
              yellowCardPlayerIds={yellowCardPlayerIds}
              redCardPlayerIds={redCardPlayerIds}
              goalScorerPlayerIds={goalScorerPlayerIds}
              homeCaptainId={homeSpecialists.captain?.id}
              awayCaptainId={awaySpecialists.captain?.id}
              activeShot={activeShot}
              activeKeeperDive={activeKeeperDive}
              activeGoalNetShake={activeGoalNetShake}
              activeWoodworkFlash={activeWoodworkFlash}
              showSectorOverlay={showSectorOverlay}
              sectorPercentages={sectorPercentages}
              onSelectStarterOnPitch={handleSelectStarterOnPitch}
              onLiveTelemetrySample={(liveBallX) => {
                setSectorCounts((prev) => {
                  if (liveBallX < 34) {
                    return homeDefendsLeft
                      ? { ...prev, homeThird: prev.homeThird + 1 }
                      : { ...prev, awayThird: prev.awayThird + 1 };
                  }
                  if (liveBallX > 66) {
                    return homeDefendsLeft
                      ? { ...prev, awayThird: prev.awayThird + 1 }
                      : { ...prev, homeThird: prev.homeThird + 1 };
                  }
                  return { ...prev, midThird: prev.midThird + 1 };
                });
              }}
            />

            {/* Compact Live Command Dock: Tactical Posture + Touchline Shouts (fits directly under the pitch) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 sm:p-3 space-y-2.5">
              {/* Row 1: Tactical Instructions */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                <div className="flex items-center gap-2 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
                    Postura Tática
                  </span>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    · Ajuste em tempo real
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 flex-1 xl:max-w-2xl">
                  {[
                    {
                      id: 'EQUILIBRADO',
                      label: 'Equilibrado',
                      emoji: '🎯',
                      tip: 'Padrão: Posse balanceada e ritmo controlado',
                    },
                    {
                      id: 'PRESSAO_TOTAL',
                      label: 'Pressão Alta',
                      emoji: '⚡',
                      tip: '+Chances de gol e +Posse (gasta mais energia)',
                    },
                    {
                      id: 'RETRANCA',
                      label: 'Retranca',
                      emoji: '🛡️',
                      tip: 'Fecha a casinha: reduz chances de gol sofridas em 45%',
                    },
                    {
                      id: 'CONTRA_ATAQUE',
                      label: 'Contra-Golpe',
                      emoji: '🚀',
                      tip: 'Atrai o adversário e dispara com finalização precisa',
                    },
                    {
                      id: 'CHUVEIRINHO',
                      label: 'Chuveirinho',
                      emoji: '⚽',
                      tip: 'Blitz aérea na grande área com bolas alçadas',
                    },
                    {
                      id: 'SEGURAR_RESULTADO',
                      label: 'Segurar Placar',
                      emoji: '🧊',
                      tip: 'Cadencia posse no meio-campo e reduz desgaste e riscos',
                    },
                  ].map((t) => {
                    const isActive = inGameTactic === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={isFinished}
                        onClick={() => handleChangeInGameTactic(t.id as InGameTacticOrder)}
                        title={t.tip}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                            : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                      >
                        <span className="text-xs leading-none">{t.emoji}</span>
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Touchline Shouts + On-Pitch Specialists */}
              <div className="pt-2 border-t border-slate-800/80 hidden sm:flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs tabular-nums min-w-0">
                  <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-bold text-slate-200 whitespace-nowrap">Gritos</span>
                  {activeShout && minute <= activeShout.expiresMinute ? (
                    <span className="text-emerald-300 font-mono text-[11px] whitespace-nowrap">
                      · Ativo até {Math.min(90, activeShout.expiresMinute)}&apos;
                    </span>
                  ) : minute < shoutCooldownUntil ? (
                    <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      · Disponível aos {Math.min(90, shoutCooldownUntil)}&apos;
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px] truncate">
                      · Incentive sem pausar
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1.5 flex-1 xl:max-w-2xl">
                  {TOUCHLINE_SHOUTS.map((sh) => {
                    const isShoutActive =
                      activeShout?.type === sh.id && minute <= activeShout.expiresMinute;
                    const onCooldown = minute < shoutCooldownUntil;
                    return (
                      <button
                        key={sh.id}
                        type="button"
                        disabled={isFinished || onCooldown}
                        onClick={() => handleTriggerTouchlineShout(sh.id)}
                        title={sh.shortDesc}
                        className={`px-2 py-1.5 rounded-lg border text-center transition-colors cursor-pointer text-[11px] font-semibold truncate ${
                          isShoutActive
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : onCooldown || isFinished
                            ? 'bg-slate-950/50 border-slate-800/70 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                        }`}
                      >
                        {sh.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Live Same-League Round Results directly on the Match Screen */}
            {sameLeagueRoundEntries.length > 0 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2 bg-slate-950/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <h3 className="text-xs font-extrabold text-slate-100 truncate">
                      Jogos da Rodada · {currentRoundCompetitionLabel}
                      {userFixture?.cupPhase && userFixture.competition !== 'estadual'
                        ? ` · ${userFixture.cupPhase}`
                        : userFixture
                        ? ` · Rod. ${userFixture.round}`
                        : ''}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono tabular-nums text-emerald-400">
                      {isFinished
                        ? `Encerrada · ${sameLeagueRoundEntries.length} jogos`
                        : `${minute}' · ${sameLeagueRoundEntries.filter((e) => e.status === 'LIVE').length} ao vivo`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setShowInlineRoundPanel((prev) => !prev);
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer transition-colors"
                    >
                      {showInlineRoundPanel ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>

                {/* Flash Ticker whenever a goal just happened in another match of this league */}
                {recentRoundGoalAlerts.length > 0 && (
                  <div className="px-3 py-1.5 bg-emerald-950/70 border-b border-emerald-500/40 flex items-center gap-2 text-[11px] text-emerald-100 overflow-x-auto no-native-scrollbar">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-black text-[10px] uppercase shrink-0">
                      ⚽ GOL NA RODADA
                    </span>
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      {recentRoundGoalAlerts.slice(0, 3).map((al) => (
                        <span key={`${al.fixtureId}_${al.minute}`} className="font-semibold">
                          <span className="font-mono text-amber-300">{al.minute}&apos;</span>{' '}
                          <span className="text-white">{al.scorerName}</span>{' '}
                          <span className="text-emerald-300">({al.scoringClubName})</span>{' '}
                          <span className="text-slate-300 font-mono tabular-nums">
                            {al.homeName} {al.homeGoals}×{al.awayGoals} {al.awayName}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {showInlineRoundPanel && (
                  <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                    {sameLeagueRoundEntries.map(({ fixture: m, status }) => {
                      const h = clubsById.get(m.homeTeamId);
                      const a = clubsById.get(m.awayTeamId);
                      const allGoalEvents = (m.events || [])
                        .filter((ev) => ev.type === 'GOL' || ev.type === 'PENALTI_GOL')
                        .sort((x, y) => x.minute - y.minute);

                      const visibleGoals =
                        status === 'FINISHED' || isFinished
                          ? allGoalEvents
                          : status === 'LIVE'
                          ? allGoalEvents.filter((ev) => ev.minute <= minute)
                          : [];

                      const liveHomeGoals =
                        status === 'FINISHED'
                          ? m.homeScore ?? 0
                          : status === 'UPCOMING'
                          ? null
                          : isFinished
                          ? m.homeScore ?? 0
                          : visibleGoals.filter((ev) => ev.isHomeTeam).length;

                      const liveAwayGoals =
                        status === 'FINISHED'
                          ? m.awayScore ?? 0
                          : status === 'UPCOMING'
                          ? null
                          : isFinished
                          ? m.awayScore ?? 0
                          : visibleGoals.filter((ev) => !ev.isHomeTeam).length;

                      const recentGoal =
                        status === 'LIVE' &&
                        !isFinished &&
                        minute > 0 &&
                        [...visibleGoals]
                          .reverse()
                          .find((ev) => minute - ev.minute >= 0 && minute - ev.minute <= 3);

                      const homeScorers = visibleGoals.filter((ev) => ev.isHomeTeam);
                      const awayScorers = visibleGoals.filter((ev) => !ev.isHomeTeam);

                      return (
                        <div
                          key={m.id}
                          className={`px-2.5 py-2 rounded-lg border transition-colors ${
                            recentGoal
                              ? 'bg-emerald-950/60 border-emerald-400/70 shadow-sm shadow-emerald-500/20'
                              : status === 'LIVE'
                              ? 'bg-slate-950/80 border-slate-800'
                              : 'bg-slate-950/45 border-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 text-[11px]">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {h && <ClubCrest club={h} size="xs" />}
                              <span className="font-semibold text-slate-100 truncate">
                                {h?.shortName || m.homeTeamId}
                              </span>
                            </div>

                            <div className="flex flex-col items-center shrink-0 px-1.5">
                              {status === 'UPCOMING' ? (
                                <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">
                                  {m.date ? formatCalendarDate(m.date).slice(0, 5) : 'Breve'}{' '}
                                  {m.time || ''}
                                </span>
                              ) : (
                                <span
                                  className={`font-mono font-extrabold tabular-nums text-xs leading-none ${
                                    recentGoal
                                      ? 'text-amber-300'
                                      : status === 'FINISHED' || isFinished
                                      ? 'text-slate-200'
                                      : 'text-emerald-400'
                                  }`}
                                >
                                  {liveHomeGoals} × {liveAwayGoals}
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-mono uppercase leading-tight mt-0.5 ${
                                  recentGoal
                                    ? 'text-emerald-300 font-black'
                                    : status === 'LIVE' && !isFinished
                                    ? 'text-emerald-500/90'
                                    : 'text-slate-500'
                                }`}
                              >
                                {recentGoal
                                  ? `GOL! ${recentGoal.minute}'`
                                  : status === 'UPCOMING'
                                  ? 'Agendado'
                                  : status === 'FINISHED' || isFinished
                                  ? 'ENC'
                                  : `${minute}'`}
                              </span>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                              <span className="font-semibold text-slate-100 truncate text-right">
                                {a?.shortName || m.awayTeamId}
                              </span>
                              {a && <ClubCrest club={a} size="xs" />}
                            </div>
                          </div>

                          {/* Goalscorers happening in this match */}
                          {visibleGoals.length > 0 && (
                            <div className="mt-1.5 pt-1 border-t border-slate-800/70 grid grid-cols-2 gap-2 text-[10px] leading-tight text-slate-400">
                              <div className="truncate">
                                {homeScorers.length > 0
                                  ? homeScorers
                                      .map((g) => `${g.minute}' ${g.playerName || 'Gol'}`)
                                      .join(', ')
                                  : ''}
                              </div>
                              <div className="truncate text-right">
                                {awayScorers.length > 0
                                  ? awayScorers
                                      .map((g) => `${g.minute}' ${g.playerName || 'Gol'}`)
                                      .join(', ')
                                  : ''}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side Panel (4 cols): Always beside the pitch — Lances, Stats, Ratings, Bench & Simultaneous Round */}
          <aside className="flex-1 min-h-[360px] lg:min-h-0 lg:col-span-4 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/85 overflow-hidden shrink-0 lg:shrink">
            {/* Side Panel Segmented Navigation */}
            <div className="px-3 py-2 border-b border-slate-800 bg-slate-950 shrink-0 grid grid-cols-4 gap-1">
              {[
                { id: 'live' as const, label: 'Ao Vivo' },
                { id: 'ratings' as const, label: 'Notas' },
                { id: 'bench' as const, label: `Banco (${MAX_USER_SUBS - subsUsed})` },
                { id: 'round' as const, label: `Rodada (${sameLeagueRoundEntries.length})` },
              ].map((tab) => {
                const active = sideInfoTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSideInfoTab(tab.id);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap truncate cursor-pointer tabular-nums ${
                      active
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* SIDE TAB 1: AO VIVO (Lances em Tempo Real + Estatísticas do Jogo juntos ao lado do campo!) */}
            {sideInfoTab === 'live' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Commentary Feed (Internal Scroll ONLY via scrollTop — never jumps outer view) */}
                <div className="flex-1 min-h-0 flex flex-col border-b border-slate-800">
                  <div className="px-3.5 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0 bg-slate-900/50">
                    <span className="font-bold text-sky-400">Lances da Partida</span>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {events.length} eventos
                    </span>
                  </div>
                  <div
                    ref={commentaryScrollRef}
                    className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 text-xs"
                  >
                    {events.length === 0 ? (
                      <p className="text-slate-500 text-center py-6">
                        Bola rolando no estádio! As equipes se estudam no meio de campo.
                      </p>
                    ) : (
                      events.map((ev) => {
                        let badgeColor = 'bg-slate-800 text-white';
                        let icon = '⏱️';

                        if (ev.type === 'GOL' || ev.type === 'PENALTI_GOL') {
                          badgeColor = 'bg-sky-400 text-slate-950 font-black';
                          icon = ev.type === 'PENALTI_GOL' ? '🎯' : '⚽';
                        } else if (ev.type === 'PENALTI_PERDIDO') {
                          badgeColor = 'bg-cyan-400 text-slate-950 font-bold';
                          icon = '🧤';
                        } else if (ev.type === 'FALTA_PERIGOSA') {
                          badgeColor = 'bg-amber-400 text-slate-950 font-bold';
                          icon = '⚡';
                        } else if (ev.type === 'DEFESAÇA') {
                          badgeColor = 'bg-cyan-500 text-slate-950 font-bold';
                          icon = '🧤';
                        } else if (ev.type === 'CHUTE_TRAVE') {
                          badgeColor = 'bg-amber-400 text-slate-950 font-bold';
                          icon = '🥅';
                        } else if (ev.type === 'CARTAO_AMARELO') {
                          badgeColor = 'bg-yellow-400 text-slate-950 font-bold';
                          icon = '🟨';
                        } else if (ev.type === 'CARTAO_VERMELHO') {
                          badgeColor = 'bg-rose-600 text-white font-bold';
                          icon = '🟥';
                        } else if (ev.type === 'LESAO') {
                          badgeColor = 'bg-rose-500 text-white font-black';
                          icon = '🚑';
                        } else if (ev.type === 'SUBSTITUICAO') {
                          badgeColor = 'bg-emerald-400 text-slate-950 font-bold';
                          icon = '🔄';
                        } else if (ev.type === 'FIM_PRIMEIRO_TEMPO' || ev.type === 'INICIO_SEGUNDO_TEMPO') {
                          badgeColor = 'bg-amber-400 text-slate-950 font-black';
                          icon = '🔄';
                        } else if (ev.type === 'PALESTRA_INTERVALO') {
                          badgeColor = 'bg-amber-500 text-slate-950 font-black';
                          icon = '🗣️';
                        } else if (ev.type === 'KICKOFF') {
                          badgeColor = 'bg-amber-400 text-slate-950 font-black';
                          icon = '🔥';
                        } else if (ev.type === 'ORDEM_TATICA' || ev.type === 'GRITO_BEIRA_CAMPO') {
                          badgeColor = 'bg-indigo-500 text-white font-bold';
                          icon = '📢';
                        }

                        return (
                          <div
                            key={ev.id}
                            className={`p-2 rounded-lg flex items-start gap-2 transition-colors ${
                              ev.type === 'GOL' || ev.type === 'PENALTI_GOL'
                                ? 'bg-sky-950/60 border border-sky-400/50 text-sky-100 font-semibold'
                                : ev.type === 'LESAO'
                                ? 'bg-rose-950/60 border border-rose-500/50 text-rose-200 font-semibold'
                                : ev.type === 'SUBSTITUICAO'
                                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 font-medium'
                                : ev.type === 'PALESTRA_INTERVALO' || ev.type === 'KICKOFF' || ev.type === 'GRITO_BEIRA_CAMPO'
                                ? 'bg-amber-950/40 border border-amber-500/40 text-amber-100 font-medium'
                                : ev.type === 'FIM_PRIMEIRO_TEMPO' || ev.type === 'INICIO_SEGUNDO_TEMPO'
                                ? 'bg-amber-950/40 border border-amber-500/40 text-amber-200 font-semibold'
                                : 'bg-slate-900/70 border border-slate-800/70 text-slate-300'
                            }`}
                          >
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums shrink-0 ${badgeColor}`}>
                              {ev.minute}' {icon}
                            </span>
                            <p className="leading-snug">{ev.description}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Live Match Stats (Always visible right below commentary in the side column) */}
                <div className="shrink-0 max-h-[44%] overflow-y-auto p-3.5 bg-slate-900/60 space-y-2.5 text-xs tabular-nums">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <h3 className="font-bold text-xs text-slate-300">
                      Estatísticas do Jogo
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {homeClub.initials} × {awayClub.initials}
                    </span>
                  </div>

                  {/* Live Possession */}
                  <div>
                    <div className="flex justify-between font-mono font-bold mb-1 text-slate-200">
                      <span>{liveHomePossession}%</span>
                      <span className="text-slate-400 font-sans font-normal text-[11px]">Posse de Bola</span>
                      <span>{liveAwayPossession}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-sky-400 h-full transition-opacity duration-200"
                        style={{ width: `${liveHomePossession}%` }}
                      />
                      <div className="bg-amber-400 h-full flex-1" />
                    </div>
                  </div>

                  {/* 3-Sector Territorial Dominance */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 text-slate-400">
                      <span className="font-mono font-semibold text-slate-300">
                        {sectorPercentages.homeThirdPct}%
                      </span>
                      <span>Território (Def · Meio · Ata)</span>
                      <span className="font-mono font-semibold text-slate-300">
                        {sectorPercentages.awayThirdPct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-rose-400/80 h-full"
                        style={{ width: `${sectorPercentages.homeThirdPct}%` }}
                        title={`Terço Defensivo ${homeClub.shortName}: ${sectorPercentages.homeThirdPct}%`}
                      />
                      <div
                        className="bg-slate-500 h-full"
                        style={{ width: `${sectorPercentages.midThirdPct}%` }}
                        title={`Meio-Campo: ${sectorPercentages.midThirdPct}%`}
                      />
                      <div
                        className="bg-emerald-400/80 h-full flex-1"
                        title={`Terço Defensivo ${awayClub.shortName}: ${sectorPercentages.awayThirdPct}%`}
                      />
                    </div>
                  </div>

                  {/* Expected Goals (xG) */}
                  <div>
                    <div className="flex justify-between font-semibold mb-1 text-slate-200 tabular-nums">
                      <span className="font-mono text-sky-300">{(stats.homeXG ?? 0).toFixed(2)}</span>
                      <span className="text-slate-400 font-normal text-[11px]">xG (Gols Esperados)</span>
                      <span className="font-mono text-amber-300">{(stats.awayXG ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                      {(() => {
                        const hXg = stats.homeXG ?? 0;
                        const aXg = stats.awayXG ?? 0;
                        const totalXg = hXg + aXg;
                        const hPct = totalXg > 0 ? Math.round((hXg / totalXg) * 100) : 50;
                        return (
                          <>
                            <div className="bg-sky-400 h-full transition-all" style={{ width: `${hPct}%` }} />
                            <div className="bg-amber-400 h-full flex-1" />
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Shots */}
                  <div>
                    <div className="flex justify-between font-semibold mb-1 text-slate-300">
                      <span className="font-mono">{stats.homeShots}</span>
                      <span className="text-slate-400 font-normal text-[11px]">Finalizações (No Gol)</span>
                      <span className="font-mono">{stats.awayShots}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono -mt-0.5 mb-1">
                      <span>{stats.homeShotsOnTarget} no gol</span>
                      <span>{stats.awayShotsOnTarget} no gol</span>
                    </div>
                  </div>

                  {/* Compact 2-row metric grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 border-t border-slate-800/80 text-[11px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-mono font-semibold">{stats.homePassAccuracy}%</span>
                      <span className="text-slate-500">Passes</span>
                      <span className="font-mono font-semibold">{stats.awayPassAccuracy}%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-mono font-semibold">{stats.homeCorners}</span>
                      <span className="text-slate-500">Escant.</span>
                      <span className="font-mono font-semibold">{stats.awayCorners}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-mono font-semibold">{stats.homeFouls}</span>
                      <span className="text-slate-500">Faltas</span>
                      <span className="font-mono font-semibold">{stats.awayFouls}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-mono font-semibold">
                        {stats.homeYellowCards}🟨{stats.homeRedCards > 0 ? `${stats.homeRedCards}🟥` : ''}
                      </span>
                      <span className="text-slate-500">Cartões</span>
                      <span className="font-mono font-semibold">
                        {stats.awayYellowCards}🟨{stats.awayRedCards > 0 ? `${stats.awayRedCards}🟥` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SIDE TAB 2: NOTAS, SETORES & SUBSTITUIÇÕES */}
            {sideInfoTab === 'ratings' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5">
                {/* Live Player Ratings & Craque do Jogo Card (0.0 - 10.0) */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2.5 border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Notas ao Vivo (0–10)</span>
                    </h3>
                    {motmEntry && (
                      <span className="text-[11px] font-mono text-amber-300 tabular-nums">
                        Craque: {motmEntry.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs tabular-nums">
                    {Array.from(liveRatingsMap.values())
                      .sort((a, b) => b.rating - a.rating)
                      .slice(0, 10)
                      .map((item, idx) => (
                        <div
                          key={item.playerId}
                          className="flex items-center justify-between gap-2 py-1 border-b border-slate-800/60 last:border-0"
                        >
                          <div className="truncate min-w-0">
                            <span className="text-slate-500 font-mono mr-1.5">{idx + 1}.</span>
                            <span className="font-semibold text-white">
                              {item.isCaptain ? '© ' : ''}
                              {item.playerName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {' '}
                              · {item.clubShortName}
                              {item.goals > 0 ? ` · ${item.goals}G` : ''}
                              {item.assists > 0 ? ` · ${item.assists}A` : ''}
                            </span>
                          </div>
                          <span
                            className={`font-mono font-bold shrink-0 ${
                              item.rating >= 7.5
                                ? 'text-emerald-400'
                                : item.rating >= 6.5
                                ? 'text-sky-300'
                                : 'text-amber-400'
                            }`}
                          >
                            {item.rating.toFixed(1)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Attack Zones (Esq · Cen · Dir) */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs tabular-nums">
                  <div className="font-bold text-slate-300 border-b border-slate-800 pb-1.5">
                    Ataque por Setores (Esq · Cen · Dir)
                  </div>
                  {[
                    { name: homeClub.shortName, z: homeAttackZones, cls: 'text-sky-300' },
                    { name: awayClub.shortName, z: awayAttackZones, cls: 'text-amber-300' },
                  ].map((row) => (
                    <div key={row.name} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className={`font-bold ${row.cls}`}>{row.name}</span>
                        <span className="font-mono text-slate-300">
                          {row.z.left}% · {row.z.center}% · {row.z.right}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden flex">
                        <div className="bg-sky-400 h-full" style={{ width: `${row.z.left}%` }} />
                        <div className="bg-emerald-400 h-full" style={{ width: `${row.z.center}%` }} />
                        <div className="bg-amber-400 h-full flex-1" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* On-Pitch Specialists */}
                {(() => {
                  const userSpec = isUserHome ? homeSpecialists : awaySpecialists;
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs space-y-1">
                      <div className="font-bold text-slate-300 pb-1 border-b border-slate-800">
                        Especialistas em Campo
                      </div>
                      <div className="flex justify-between text-slate-400 pt-1">
                        <span>Capitão</span>
                        <span className="text-white font-semibold">{userSpec.captain?.name || '--'}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Pênaltis</span>
                        <span className="text-white font-semibold">{userSpec.penaltyTaker?.name || '--'}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Faltas</span>
                        <span className="text-white font-semibold">{userSpec.freekickTaker?.name || '--'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Substitutions History Card */}
                {subHistory.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                    <h3 className="font-bold text-xs text-slate-300 mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Substituições Feitas</span>
                      </span>
                      <span className="text-sky-300 font-mono font-bold text-[11px] tabular-nums">
                        {subHistory.length}/{MAX_USER_SUBS}
                      </span>
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      {subHistory.map((sub, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="font-mono font-bold text-sky-400 shrink-0">{sub.minute}'</span>
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-rose-400 truncate">Sai: {sub.outPlayer.name}</span>
                            <span className="text-slate-500">➔</span>
                            <span className="text-emerald-400 truncate">Entra: {sub.inPlayer.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SIDE TAB 3: BANCO DE RESERVAS & TROCAS RÁPIDAS */}
            {sideInfoTab === 'bench' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
                <MatchBenchBar
                  userClub={isUserHome ? currentHomeClub : currentAwayClub}
                  subsRemaining={MAX_USER_SUBS - subsUsed}
                  maxSubs={MAX_USER_SUBS}
                  maxBench={userFixture?.competition === 'uefa_supercup' ? 12 : 11}
                  subbedOutIds={subbedOutIds}
                  yellowCardPlayerIds={yellowCardPlayerIds}
                  minute={minute}
                  onQuickSuggestSub={(outPlayer, inPlayer) => {
                    setSelectedStarterForSub(outPlayer);
                    setSelectedReserveForSub(inPlayer);
                    setIsSubModalOpen(true);
                  }}
                  onOpenSubModalWithReserve={handleOpenSubForReserve}
                  onOpenGeneralSubModal={handleOpenGeneralSubModal}
                />

                {/* Mobile-accessible Touchline Shouts inside Bench tab too */}
                <div className="sm:hidden bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gritos da Beira do Campo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TOUCHLINE_SHOUTS.map((sh) => {
                      const isShoutActive =
                        activeShout?.type === sh.id && minute <= activeShout.expiresMinute;
                      const onCooldown = minute < shoutCooldownUntil;
                      return (
                        <button
                          key={sh.id}
                          type="button"
                          disabled={isFinished || onCooldown}
                          onClick={() => handleTriggerTouchlineShout(sh.id)}
                          className={`px-2 py-1.5 rounded-lg border text-left text-[11px] font-semibold truncate ${
                            isShoutActive
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                              : onCooldown || isFinished
                              ? 'bg-slate-950/50 border-slate-800/70 text-slate-500'
                              : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                          }`}
                        >
                          {sh.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SIDE TAB 4: JOGOS DA RODADA (APENAS DA LIGA/COMPETIÇÃO ATUAL) */}
            {sideInfoTab === 'round' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5 gap-2">
                    <h3 className="font-bold text-xs text-slate-200 truncate">
                      {currentRoundCompetitionLabel}
                      {userFixture?.cupPhase && userFixture.competition !== 'estadual'
                        ? ` · ${userFixture.cupPhase}`
                        : userFixture
                        ? ` · Rodada ${userFixture.round}`
                        : ''}
                    </h3>
                    <span className="text-[11px] text-emerald-400 font-mono tabular-nums shrink-0">
                      {isFinished
                        ? 'Encerrados'
                        : `${minute}' · ${sameLeagueRoundEntries.length} jogos`}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {sameLeagueRoundEntries.length === 0 ? (
                      <p className="text-slate-500 text-center py-6 text-xs">
                        Nenhuma outra partida desta competição nesta rodada.
                      </p>
                    ) : (
                      sameLeagueRoundEntries.map(({ fixture: m, status }) => {
                        const h = clubsById.get(m.homeTeamId);
                        const a = clubsById.get(m.awayTeamId);
                        const allGoalEvents = (m.events || [])
                          .filter((ev) => ev.type === 'GOL' || ev.type === 'PENALTI_GOL')
                          .sort((x, y) => x.minute - y.minute);

                        const visibleGoals =
                          status === 'FINISHED' || isFinished
                            ? allGoalEvents
                            : status === 'LIVE'
                            ? allGoalEvents.filter((ev) => ev.minute <= minute)
                            : [];

                        const liveHomeGoals =
                          status === 'FINISHED'
                            ? m.homeScore ?? 0
                            : status === 'UPCOMING'
                            ? null
                            : isFinished
                            ? m.homeScore ?? 0
                            : visibleGoals.filter((ev) => ev.isHomeTeam).length;

                        const liveAwayGoals =
                          status === 'FINISHED'
                            ? m.awayScore ?? 0
                            : status === 'UPCOMING'
                            ? null
                            : isFinished
                            ? m.awayScore ?? 0
                            : visibleGoals.filter((ev) => !ev.isHomeTeam).length;

                        const recentGoal =
                          status === 'LIVE' &&
                          !isFinished &&
                          minute > 0 &&
                          [...visibleGoals]
                            .reverse()
                            .find((ev) => minute - ev.minute >= 0 && minute - ev.minute <= 3);

                        const homeScorers = visibleGoals.filter((ev) => ev.isHomeTeam);
                        const awayScorers = visibleGoals.filter((ev) => !ev.isHomeTeam);

                        return (
                          <div
                            key={m.id}
                            className={`p-2 rounded-lg border transition-colors ${
                              recentGoal
                                ? 'bg-emerald-950/60 border-emerald-400/70'
                                : 'bg-slate-800/60 border-slate-700/50'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span className="truncate">
                                {m.groupName && userFixture?.competition !== 'estadual'
                                  ? m.groupName
                                  : status === 'UPCOMING'
                                  ? `${m.date ? formatCalendarDate(m.date) : 'Em breve'} ${m.time || ''}`
                                  : status === 'FINISHED' || isFinished
                                  ? 'Encerrado'
                                  : `Ao vivo · ${minute}'`}
                              </span>
                              {recentGoal && (
                                <span className="text-emerald-300 font-black">
                                  ⚽ GOL! {recentGoal.minute}&apos;
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {h && <ClubCrest club={h} size="xs" />}
                                <span className="font-semibold text-slate-100 truncate">
                                  {h?.shortName || m.homeTeamId}
                                </span>
                              </div>
                              <span
                                className={`font-mono font-bold tabular-nums px-2 whitespace-nowrap ${
                                  recentGoal
                                    ? 'text-amber-300'
                                    : status === 'UPCOMING'
                                    ? 'text-slate-400 text-[11px]'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {status === 'UPCOMING'
                                  ? 'vs'
                                  : `${liveHomeGoals} × ${liveAwayGoals}`}
                              </span>
                              <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                                <span className="font-semibold text-slate-100 truncate text-right">
                                  {a?.shortName || m.awayTeamId}
                                </span>
                                {a && <ClubCrest club={a} size="xs" />}
                              </div>
                            </div>

                            {visibleGoals.length > 0 && (
                              <div className="mt-1.5 pt-1 border-t border-slate-700/50 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                                <div className="truncate">
                                  {homeScorers
                                    .map((g) => `⚽ ${g.minute}' ${g.playerName || 'Gol'}`)
                                    .join(', ')}
                                </div>
                                <div className="truncate text-right">
                                  {awayScorers
                                    .map((g) => `⚽ ${g.minute}' ${g.playerName || 'Gol'}`)
                                    .join(', ')}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Post-Match Summary Panel if finished */}
        {isFinished && (
          <div className="bg-slate-950 px-4 sm:px-5 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>
                  Craque do Jogo: <strong className="text-white">{manOfTheMatch}</strong>
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5 font-mono tabular-nums text-[11px] text-slate-300">
                <span className="font-sans text-slate-400">Setores ({userClub.shortName}):</span>
                <strong>
                  Esq {(isUserHome ? homeAttackZones : awayAttackZones).left}% · Cen{' '}
                  {(isUserHome ? homeAttackZones : awayAttackZones).center}% · Dir{' '}
                  {(isUserHome ? homeAttackZones : awayAttackZones).right}%
                </strong>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                <span>
                  Público: <strong className="text-white">{attendance.toLocaleString('pt-BR')}</strong>
                </span>
              </div>
              {isUserHome ? (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                    <span>
                      Renda Matchday:{' '}
                      <strong className="font-mono tabular-nums">
                        +R$ {revenue.toLocaleString('pt-BR')}
                      </strong>
                      <span className="text-[11px] text-slate-400 ml-1 tabular-nums">
                        (Custo arena -R$ {matchEcon.homeMatchOpsCost.toLocaleString('pt-BR')})
                      </span>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <DollarSign className="w-4 h-4" />
                    <span>
                      Viagem:{' '}
                      <strong className="font-mono tabular-nums">
                        -R$ {matchEcon.awayTravelCost.toLocaleString('pt-BR')}
                      </strong>
                    </span>
                  </div>
                </>
              )}

              {matchSponsorPayout && matchSponsorPayout.totalPayout > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Handshake className="w-4 h-4 text-cyan-400" />
                    <span>
                      Patrocínios:{' '}
                      <strong className="font-mono tabular-nums text-cyan-300">
                        +R$ {matchSponsorPayout.totalPayout.toLocaleString('pt-BR')}
                      </strong>
                      {matchSponsorPayout.bonusTotal > 0 && (
                        <span className="text-[11px] text-emerald-400 ml-1">
                          (inclui +R$ {matchSponsorPayout.bonusTotal.toLocaleString('pt-BR')} bônus)
                        </span>
                      )}
                    </span>
                  </div>
                </>
              )}

              {rivalryInfo &&
                (penaltyResult
                  ? penaltyResult.winnerId === userClub.id
                  : isUserHome
                  ? homeScore > awayScore
                  : awayScore > homeScore) && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1.5 text-amber-300 font-semibold tabular-nums">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>
                        Vitória no {rivalryInfo.derbyName}:{' '}
                        <strong className="text-emerald-300">
                          +{rivalryInfo.reputationWinBonus} Reputação
                        </strong>{' '}
                        · +{rivalryInfo.fanSocioWinBonus} Sócios
                      </span>
                    </div>
                  </>
                )}

              {cupPrizeInfo && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-400/50 text-amber-300 font-bold animate-pulse shadow-md">
                    <span>{cupPrizeInfo.isChampion ? '🏆 CAMPEÃO: ' : cupPrizeInfo.isRunnerUp ? '🥈 VICE: ' : '💰 PREMIAÇÃO: '}</span>
                    <strong className="text-emerald-300 font-mono">+{formatMoney(cupPrizeInfo.amount)}</strong>
                    <span className="text-[10px] text-amber-200/80">({cupPrizeInfo.phase})</span>
                  </div>
                </>
              )}
            </div>

            {isTiedKnockout && !penaltyResult ? (
              <button
                onClick={() => setIsPenaltyShootoutActive(true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl flex items-center gap-2 animate-pulse cursor-pointer"
              >
                <span>Ir para os Pênaltis! ⚽🧤</span>
              </button>
            ) : (
              <button
                onClick={handleConfirmFinish}
                className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Avançar para Próxima Rodada →
              </button>
            )}
          </div>
        )}
      </div>

      {/* In-Game Multi-Substitution & Injury Stoppage Modal */}
      <InGameSubModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        currentMinute={minute}
        subsRemaining={MAX_USER_SUBS - subsUsed}
        maxSubs={MAX_USER_SUBS}
        starters={(isUserHome ? currentHomeClub : currentAwayClub).squad.filter((p) => p.isStarter)}
        benchPlayers={(() => {
          const maxBench = userFixture?.competition === 'uefa_supercup' ? 12 : 11;
          const activeSquad = (isUserHome ? currentHomeClub : currentAwayClub).squad;
          const designated = activeSquad.filter(
            (p) =>
              !p.isStarter &&
              ((p.isSubstitute && p.injuryWeeks === 0 && !p.injuryDetails) ||
                subbedOutIds.has(p.id))
          );
          const designatedIds = new Set(designated.map((p) => p.id));
          const extra =
            designated.length < maxBench
              ? activeSquad
                  .filter(
                    (p) =>
                      !p.isStarter &&
                      !designatedIds.has(p.id) &&
                      p.injuryWeeks === 0 &&
                      !p.injuryDetails
                  )
                  .slice(0, maxBench - designated.length)
              : [];
          return designated.length > 0
            ? [...designated, ...extra].slice(0, maxBench)
            : activeSquad
                .filter((p) => !p.isStarter && p.injuryWeeks === 0 && !p.injuryDetails)
                .slice(0, maxBench);
        })()}
        subbedOutIds={subbedOutIds}
        initialStarter={selectedStarterForSub}
        initialReserve={selectedReserveForSub}
        forcedInjuredPlayer={pendingInjuryStoppage?.player || null}
        userClubColors={userClub.colors}
        yellowCardPlayerIds={yellowCardPlayerIds}
        redCardPlayerIds={redCardPlayerIds}
        goalScorerPlayerIds={goalScorerPlayerIds}
        captainId={(isUserHome ? homeSpecialists : awaySpecialists).captain?.id}
        liveRatingsMap={liveRatingsMap}
        onConfirmSubs={handleConfirmBatchSubstitutions}
        onRemoveInjuredWithoutSub={handleRemoveInjuredWithoutSub}
      />

      {/* Interactive Penalty Shootout Modal for Knockout Ties */}
      {isPenaltyShootoutActive && userFixture && (
        <PenaltyShootoutModal
          userClub={isUserHome ? currentHomeClub : currentAwayClub}
          homeClub={currentHomeClub}
          awayClub={currentAwayClub}
          fixture={userFixture}
          regulationHomeScore={homeScore}
          regulationAwayScore={awayScore}
          aggregateHomeScore={aggregateHomeScore}
          aggregateAwayScore={aggregateAwayScore}
          onCompleteShootout={handleCompleteShootout}
        />
      )}
    </div>
  );
};

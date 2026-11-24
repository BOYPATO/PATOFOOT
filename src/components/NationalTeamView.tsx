import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Club,
  ContinentalCompId,
  DetailedRole,
  FormationType,
  InternationalMatchFixture,
  NationalTeamProfile,
  NationalTeamState,
  NationalTournamentEdition,
  Player,
  SelecaoTacticStyle,
} from '../types/game';
import {
  ArrowLeftRight,
  Briefcase,
  Calendar,
  Check,
  Crown,
  ExternalLink,
  FastForward,
  Globe,
  LayoutGrid,
  Pause,
  Play,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import {
  CAF_2028_COHOSTS,
  CAF_WCQ_EXCLUDED_IDS,
  COPA_AMERICA_2028_OFFICIAL_PARTICIPANTS,
  CustomUserInternationalResult,
  EURO_2028_COHOSTS,
  evaluateSelecaoSlotFit,
  FIFA_SOLIDARITY_COMPENSATION_PER_PLAYER,
  fitPlayersToSelecaoFormation,
  getNationalTeamById,
  getNationalTeamCoachRecord,
  getNationalTournamentDrawInfo,
  getTeamAllInternationalFixtures,
  getTeamSeasonInternationalFixtures,
  MAX_SELECAO_SQUAD_SIZE,
  NATIONAL_TEAMS_CATALOG,
  OFFICIAL_AFRICA_CALENDAR_2026_2038,
  OfficialAfricaCalendarEntry,
  OFFICIAL_ASIA_CALENDAR_2026_2038,
  OfficialAsiaCalendarEntry,
  OFFICIAL_CONCACAF_CALENDAR_2026_2038,
  OfficialConcacafCalendarEntry,
  OFFICIAL_EUROPE_CALENDAR_2026_2038,
  OfficialEuropeCalendarEntry,
  OFFICIAL_OCEANIA_CALENDAR_2026_2038,
  OfficialOceaniaCalendarEntry,
  OFFICIAL_SELECOES_FIFA_CALENDAR_2026_2038,
  OfficialSelecaoFifaCalendarEntry,
  OFFICIAL_SOUTH_AMERICA_CALENDAR_2026_2038,
  OfficialSouthAmericaCalendarEntry,
  ResolvedNationalPlayer,
  resolveNationalTeamPlayerPool,
  SELECAO_FORMATIONS,
  SELECAO_FORMATION_SLOTS,
  SELECAO_ROLE_ORDER,
  selectOptimalSelecaoSquad,
  sortNationalPlayersByPosition,
  WORLD_CUP_2030_COHOSTS,
} from '../utils/nationalTeamEngine';
import { inferTacticalZoneFromCoords } from '../utils/matchPitchLayout';
import { getCoachSecurityDescriptor } from '../utils/coachingCarouselEngine';
import { formatShortDate } from '../utils/calendarUtils';
import { SelecaoTacticalBoard } from './SelecaoTacticalBoard';
import { NationalWorldHub, WorldSubTab } from './NationalWorldHub';
import { NationalTournamentDrawModal } from './NationalTournamentDrawModal';
import { SOCCERWIKI_BRAZIL_NT_LOGO } from '../utils/soccerWikiBrazilEngine';
import { SOCCERWIKI_ENGLAND_NT_LOGO } from '../utils/soccerWikiEnglandEngine';
import { PlayerAvatar } from './PlayerAvatar';
import { usePlayerInspection } from '../context/PlayerInspectionContext';
import confetti from 'canvas-confetti';

interface NationalTeamViewProps {
  userClub: Club;
  allClubs: Club[];
  managerName: string;
  seasonYear: number;
  currentDate?: string;
  currentRound: number;
  managerReputation: number;
  nationalTeam: NationalTeamState;
  initialArea?: 'MY_TEAM' | 'WORLD';
  onRequestSwitchArea?: (area: 'MY_TEAM' | 'WORLD') => void;
  initialLaunchFixtureId?: string | null;
  onConsumeLaunchFixture?: () => void;
  onAcceptCbfRole: () => void;
  onAppointNationalTeam: (teamId: string) => void;
  onDeclineCbfInvite: () => void;
  onResignSelecao: () => void;
  onAcceptNationalOffer?: (offerId: string) => void;
  onDeclineNationalOffer?: (offerId: string) => void;
  onScoutNationalVacancies?: () => { offersCount: number; feedbackText: string };
  onApplyNationalJob?: (teamId: string) => { accepted: boolean; feedbackText: string };
  onPlaySelecaoWindow: (
    fixtureId: string,
    customResult?: CustomUserInternationalResult
  ) => void;
  onToggleCallUp: (playerId: string) => { feedback: string };
  onReplaceCallUp: (outPlayerId: string, inPlayerId: string) => { feedback: string };
  onToggleStarter: (playerId: string) => { feedback: string };
  onSwapLineupPlayers: (firstPlayerId: string, secondPlayerId: string) => { feedback: string };
  onMovePlayerToPitchCoords?: (
    playerId: string,
    x: number,
    y: number,
    code?: string,
    label?: string
  ) => { feedback: string };
  onResetCustomPositions?: () => void;
  onAutoPickSquad: () => void;
  onAutoPickStartersOnly: () => void;
  onChangeFormation: (formation: FormationType) => void;
  onSetCaptain: (playerId: string) => void;
  onChangeTacticStyle: (style: SelecaoTacticStyle) => void;
  onInspectClub?: (clubId: string) => void;
  onDrawNationalTournament?: (
    compId: 'world_cup' | ContinentalCompId
  ) => { drawn: boolean; feedback: string } | void;
  isSyncingNationalities?: boolean;
  nationalitySyncFeedback?: string | null;
  nationalityGroundingSources?: Array<{ title: string; uri: string }>;
  onSyncNationalitiesWithAI?: () => void;
  onDismissNationalitySyncFeedback?: () => void;
}

type MyTeamSubTab = 'command' | 'lineup' | 'squad' | 'federation' | 'fifa_calendar';

const TACTIC_STYLES: {
  id: SelecaoTacticStyle;
  label: string;
  summary: string;
}[] = [
  {
    id: 'EQUILIBRADO',
    label: 'Padrão Equilibrado',
    summary: 'Equilíbrio entre posse no meio-campo e cobertura defensiva.',
  },
  {
    id: 'JOGO_BONITO_OFENSIVO',
    label: 'Jogo Bonito Ofensivo',
    summary: 'Laterais projetados e máxima criatividade no terço final.',
  },
  {
    id: 'PRESSAO_ALTA',
    label: 'Pressão Alta',
    summary: 'Marcação adiantada na saída rival para recuperar rápido.',
  },
  {
    id: 'SOLIDEZ_TRANSICAO',
    label: 'Solidez & Transição',
    summary: 'Bloco compacto contra potências mundiais e contra-ataque veloz.',
  },
];

function TeamCrest({
  team,
  size = 'md',
}: {
  team: NationalTeamProfile;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [imgErr, setImgErr] = useState(false);
  const dims =
    size === 'lg'
      ? 'w-14 h-14 rounded-2xl text-sm'
      : size === 'sm'
      ? 'w-6 h-6 rounded text-[10px]'
      : 'w-8 h-8 rounded-lg text-xs';

  const isBrazil = team.id === 'nt_bra' || team.id === 'bra' || team.code === 'BRA';
  const isEngland = team.id === 'nt_eng' || team.id === 'eng' || team.code === 'ENG';
  const officialNtLogo = isBrazil
    ? SOCCERWIKI_BRAZIL_NT_LOGO
    : isEngland
    ? SOCCERWIKI_ENGLAND_NT_LOGO
    : undefined;

  if (officialNtLogo && !imgErr) {
    return (
      <div
        className={`${dims} bg-white/95 p-0.5 flex items-center justify-center shrink-0 border border-white/20 shadow-xs overflow-hidden select-none`}
        title={team.name}
      >
        <img
          src={officialNtLogo}
          alt={team.name}
          loading="lazy"
          onError={() => setImgErr(true)}
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`${dims} font-black flex items-center justify-center shrink-0 border border-white/15 select-none`}
      style={{
        backgroundColor: team.primaryColor,
        color: team.textColor,
      }}
      title={team.name}
    >
      {team.code}
    </div>
  );
}

interface LiveMatchEventItem {
  minute: number;
  text: string;
  isGoal?: boolean;
  isSub?: boolean;
  isMyTeam?: boolean;
}

const MAX_LIVE_SUBS = 5;

const ROLE_SECTION_LABELS: Record<DetailedRole, string> = {
  GOL: 'Goleiros (GOL)',
  LAT: 'Laterais (LAT)',
  ZAG: 'Zagueiros (ZAG)',
  VOL: 'Volantes (VOL)',
  MEI: 'Meias (MEI)',
  ATA: 'Atacantes (ATA)',
};

export const NationalTeamView: React.FC<NationalTeamViewProps> = ({
  userClub,
  allClubs,
  managerName,
  seasonYear,
  currentDate,
  currentRound,
  managerReputation,
  nationalTeam,
  initialArea = 'MY_TEAM',
  onRequestSwitchArea,
  initialLaunchFixtureId = null,
  onConsumeLaunchFixture,
  onAcceptCbfRole,
  onAppointNationalTeam,
  onDeclineCbfInvite,
  onResignSelecao,
  onAcceptNationalOffer,
  onDeclineNationalOffer,
  onScoutNationalVacancies,
  onApplyNationalJob,
  onPlaySelecaoWindow,
  onToggleCallUp,
  onReplaceCallUp,
  onToggleStarter,
  onSwapLineupPlayers,
  onMovePlayerToPitchCoords,
  onResetCustomPositions,
  onAutoPickSquad,
  onAutoPickStartersOnly,
  onChangeFormation,
  onSetCaptain,
  onChangeTacticStyle,
  onInspectClub,
  onDrawNationalTournament,
  isSyncingNationalities = false,
  nationalitySyncFeedback = null,
  nationalityGroundingSources = [],
  onSyncNationalitiesWithAI,
  onDismissNationalitySyncFeedback,
}) => {
  const inspection = usePlayerInspection();
  const calendarYear = useMemo(
    () => (currentDate ? Number(currentDate.slice(0, 4)) || seasonYear : seasonYear),
    [currentDate, seasonYear]
  );
  const [areaMode, setAreaMode] = useState<'MY_TEAM' | 'WORLD'>(initialArea);
  const [subTab, setSubTab] = useState<MyTeamSubTab>('command');
  const [worldSubTab, setWorldSubTab] = useState<WorldSubTab>('nations');
  const [roleFilter, setRoleFilter] = useState<DetailedRole | 'ALL'>('ALL');
  const [calledSectorFilter, setCalledSectorFilter] = useState<'ALL' | DetailedRole>('ALL');
  const [poolOriginFilter, setPoolOriginFilter] = useState<
    'ALL' | 'MY_CLUB' | 'DOMESTIC' | 'ABROAD'
  >('ALL');
  const [poolSortBy, setPoolSortBy] = useState<'OVR' | 'POS' | 'GOALS' | 'CAPS' | 'YOUNG'>('POS');
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceOutPlayerId, setReplaceOutPlayerId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [nlLeagueFilter, setNlLeagueFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');
  const [fifaCalYearFilter, setFifaCalYearFilter] = useState<number | 'ALL'>('ALL');
  const [fifaCalRegionView, setFifaCalRegionView] = useState<
    'GENERAL' | 'CONMEBOL' | 'UEFA' | 'CAF' | 'CONCACAF' | 'ASIA' | 'OCEANIA'
  >(
    nationalTeam.isUserCoach &&
      nationalTeam.userTeamId &&
      getNationalTeamById(nationalTeam.userTeamId).confederation === 'CONMEBOL'
      ? 'CONMEBOL'
      : nationalTeam.isUserCoach &&
        nationalTeam.userTeamId &&
        getNationalTeamById(nationalTeam.userTeamId).confederation === 'UEFA'
      ? 'UEFA'
      : nationalTeam.isUserCoach &&
        nationalTeam.userTeamId &&
        getNationalTeamById(nationalTeam.userTeamId).confederation === 'CAF'
      ? 'CAF'
      : nationalTeam.isUserCoach &&
        nationalTeam.userTeamId &&
        getNationalTeamById(nationalTeam.userTeamId).confederation === 'OFC'
      ? 'OCEANIA'
      : nationalTeam.isUserCoach &&
        nationalTeam.userTeamId &&
        getNationalTeamById(nationalTeam.userTeamId).confederation === 'CONCACAF'
      ? 'CONCACAF'
      : nationalTeam.isUserCoach &&
        nationalTeam.userTeamId &&
        getNationalTeamById(nationalTeam.userTeamId).confederation === 'AFC'
      ? 'ASIA'
      : 'GENERAL'
  );
  const [uefaCalYearFilter, setUefaCalYearFilter] = useState<number | 'ALL'>('ALL');
  const [uefaFocusTeamId, setUefaFocusTeamId] = useState<string>(
    nationalTeam.isUserCoach &&
      nationalTeam.userTeamId &&
      getNationalTeamById(nationalTeam.userTeamId).confederation === 'UEFA'
      ? nationalTeam.userTeamId
      : 'nt_esp'
  );
  const [uefaTeamSearch, setUefaTeamSearch] = useState('');
  const [conmebolCalYearFilter, setConmebolCalYearFilter] = useState<number | 'ALL'>('ALL');
  const [conmebolFocusTeamId, setConmebolFocusTeamId] = useState<string>(
    nationalTeam.isUserCoach &&
      nationalTeam.userTeamId &&
      getNationalTeamById(nationalTeam.userTeamId).confederation === 'CONMEBOL'
      ? nationalTeam.userTeamId
      : 'nt_bra'
  );
  const [cafCalYearFilter, setCafCalYearFilter] = useState<number | 'ALL'>('ALL');
  const [cafFocusTeamId, setCafFocusTeamId] = useState<string>(
    nationalTeam.isUserCoach &&
      nationalTeam.userTeamId &&
      getNationalTeamById(nationalTeam.userTeamId).confederation === 'CAF'
      ? nationalTeam.userTeamId
      : 'nt_mar'
  );
  const [cafTeamSearch, setCafTeamSearch] = useState<string>('');
  const [oceaniaCalYearFilter, setOceaniaCalYearFilter] = useState<number | 'ALL'>('ALL');
  const [oceaniaFocusTeamId, setOceaniaFocusTeamId] = useState<string>(
    nationalTeam.isUserCoach &&
      nationalTeam.userTeamId &&
      getNationalTeamById(nationalTeam.userTeamId).confederation === 'OFC'
      ? nationalTeam.userTeamId
      : 'nt_nzl'
  );
  const [concacafCalYearFilter, setConcacafCalYearFilter] = useState<number | 'ALL'>('ALL');
  const [concacafFocusTeamId, setConcacafFocusTeamId] = useState<string>(
    nationalTeam.isUserCoach &&
      nationalTeam.userTeamId &&
      getNationalTeamById(nationalTeam.userTeamId).confederation === 'CONCACAF'
      ? nationalTeam.userTeamId
      : 'nt_mex'
  );
  const [asiaCalYearFilter, setAsiaCalYearFilter] = useState<number | 'ALL'>('ALL');
  const [asiaFocusTeamId, setAsiaFocusTeamId] = useState<string>(
    nationalTeam.isUserCoach &&
      nationalTeam.userTeamId &&
      getNationalTeamById(nationalTeam.userTeamId).confederation === 'AFC'
      ? nationalTeam.userTeamId
      : 'nt_jap'
  );
  const [asiaTeamSearch, setAsiaTeamSearch] = useState<string>('');

  useEffect(() => {
    setAreaMode(initialArea);
  }, [initialArea]);

  const activeUserTeamId = nationalTeam.isUserCoach
    ? nationalTeam.userTeamId || 'nt_bra'
    : null;
  const [worldInspectTeamId, setWorldInspectTeamId] = useState<string>(
    activeUserTeamId && activeUserTeamId !== 'nt_arg' ? 'nt_arg' : 'nt_bra'
  );
  const [showJobMarketModal, setShowJobMarketModal] = useState<boolean>(false);
  const [drawModalCompId, setDrawModalCompId] = useState<'world_cup' | ContinentalCompId | null>(null);

  const activeDrawModalInfo = useMemo(
    () =>
      drawModalCompId
        ? getNationalTournamentDrawInfo(nationalTeam, drawModalCompId, calendarYear)
        : null,
    [nationalTeam, drawModalCompId, calendarYear]
  );

  const readySelecaoDrawInfo = useMemo(() => {
    const candidates: ('world_cup' | ContinentalCompId)[] = [
      'world_cup',
      'copa_america',
      'eurocopa',
      'copa_africana',
      'copa_asia',
      'copa_oceania',
      'copa_ouro',
      'nations_league',
    ];
    const infos = candidates
      .map((id) => getNationalTournamentDrawInfo(nationalTeam, id, calendarYear))
      .filter(
        (info): info is NonNullable<typeof info> =>
          Boolean(info && info.canDrawGroups && !info.alreadyDrawn)
      );
    return infos.find((i) => i.userTeamQualified) || infos[0] || null;
  }, [nationalTeam, calendarYear]);

  // Live International Match Broadcast Simulator + Pre-Match Escalation + Live Bench Subs
  const [liveFixture, setLiveFixture] = useState<InternationalMatchFixture | null>(null);
  const [liveMinute, setLiveMinute] = useState<number>(0);
  const [livePaused, setLivePaused] = useState<boolean>(false);
  const [liveSpeedMs, setLiveSpeedMs] = useState<number>(200);
  const [liveMyScore, setLiveMyScore] = useState<number>(0);
  const [liveOppScore, setLiveOppScore] = useState<number>(0);
  const [livePhaseState, setLivePhaseState] = useState<
    | 'PRE_MATCH'
    | 'FIRST_HALF'
    | 'HALFTIME'
    | 'SECOND_HALF'
    | 'EXTRA_TIME'
    | 'PENALTIES'
    | 'FINISHED'
  >('PRE_MATCH');
  const [liveEvents, setLiveEvents] = useState<LiveMatchEventItem[]>([]);
  const [liveScorers, setLiveScorers] = useState<string[]>([]);
  const [liveGoalsByPlayerId, setLiveGoalsByPlayerId] = useState<Record<string, number>>({});
  const [liveMyPen, setLiveMyPen] = useState<number | undefined>(undefined);
  const [liveOppPen, setLiveOppPen] = useState<number | undefined>(undefined);
  const [liveTactic, setLiveTactic] = useState<SelecaoTacticStyle>(nationalTeam.tacticStyle);
  const [liveFormation, setLiveFormation] = useState<FormationType>(
    nationalTeam.formation || '4-3-3'
  );
  const [livePitchIds, setLivePitchIds] = useState<string[]>([]);
  const [liveSubbedOutIds, setLiveSubbedOutIds] = useState<string[]>([]);
  const [livePlayedSubIds, setLivePlayedSubIds] = useState<string[]>([]);
  const [liveSubsCount, setLiveSubsCount] = useState<number>(0);
  const [selectedLiveOutId, setSelectedLiveOutId] = useState<string | null>(null);
  const [showLiveBenchDrawer, setShowLiveBenchDrawer] = useState<boolean>(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const showToast = (msg: string) => {
    if (!msg) return;
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const focusTeamId = activeUserTeamId || 'nt_bra';
  const focusTeam = getNationalTeamById(focusTeamId);
  const squadViewTeamId = focusTeamId;
  const squadViewTeam = focusTeam;
  const isEditingOwnSelecao = Boolean(nationalTeam.isUserCoach && activeUserTeamId);

  // User's own Seleção pool (always used for live matches)
  const ownTeamPool = useMemo(
    () =>
      resolveNationalTeamPlayerPool(
        allClubs,
        nationalTeam.virtualPlayers,
        focusTeamId,
        userClub.id
      ),
    [allClubs, nationalTeam.virtualPlayers, focusTeamId, userClub.id]
  );

  const ownPoolLookup = useMemo(() => {
    const map = new Map<string, ResolvedNationalPlayer>();
    ownTeamPool.forEach((p) => map.set(p.id, p));
    return map;
  }, [ownTeamPool]);

  // Player pool for `squadViewTeamId` (could be user's team or any inspected nation)
  const currentTeamPool = useMemo(
    () =>
      squadViewTeamId === focusTeamId
        ? ownTeamPool
        : resolveNationalTeamPlayerPool(
            allClubs,
            nationalTeam.virtualPlayers,
            squadViewTeamId,
            userClub.id
          ),
    [squadViewTeamId, focusTeamId, ownTeamPool, allClubs, nationalTeam.virtualPlayers, userClub.id]
  );

  const poolLookup = useMemo(() => {
    const map = new Map<string, ResolvedNationalPlayer>();
    currentTeamPool.forEach((p) => map.set(p.id, p));
    return map;
  }, [currentTeamPool]);

  const effectiveFormation: FormationType = isEditingOwnSelecao
    ? nationalTeam.formation || '4-3-3'
    : '4-3-3';

  const effectiveSquadIds = useMemo(() => {
    if (isEditingOwnSelecao) {
      return {
        calledIds: nationalTeam.calledUpPlayerIds,
        starterIds: nationalTeam.starterPlayerIds,
        captainId: nationalTeam.captainPlayerId,
      };
    }
    const auto = selectOptimalSelecaoSquad(
      allClubs,
      squadViewTeamId,
      nationalTeam.virtualPlayers,
      '4-3-3'
    );
    return {
      calledIds: auto.calledUpPlayerIds,
      starterIds: auto.starterPlayerIds,
      captainId: auto.captainPlayerId,
    };
  }, [
    isEditingOwnSelecao,
    nationalTeam.calledUpPlayerIds,
    nationalTeam.starterPlayerIds,
    nationalTeam.captainPlayerId,
    allClubs,
    squadViewTeamId,
    nationalTeam.virtualPlayers,
  ]);

  const calledSet = useMemo(
    () => new Set(effectiveSquadIds.calledIds),
    [effectiveSquadIds.calledIds]
  );
  const starterSet = useMemo(
    () => new Set(effectiveSquadIds.starterIds),
    [effectiveSquadIds.starterIds]
  );

  const calledUpRoster = useMemo(() => {
    const resolved = effectiveSquadIds.calledIds
      .map((id) => poolLookup.get(id))
      .filter((x): x is ResolvedNationalPlayer => Boolean(x));
    return sortNationalPlayersByPosition(resolved, starterSet);
  }, [effectiveSquadIds.calledIds, poolLookup, starterSet]);

  const filteredCalledUpRoster = useMemo(() => {
    if (calledSectorFilter === 'ALL') return calledUpRoster;
    return calledUpRoster.filter((p) => p.detailedRole === calledSectorFilter);
  }, [calledUpRoster, calledSectorFilter]);

  const sectorCallUpCounts = useMemo(() => {
    const counts = {
      GK: 0,
      DF: 0,
      MF: 0,
      FW: 0,
      GOL: 0,
      LAT: 0,
      ZAG: 0,
      VOL: 0,
      MEI: 0,
      ATA: 0,
      myClub: 0,
      avgAge: 0,
      avgOvr: 0,
    };
    calledUpRoster.forEach((p) => {
      counts[p.position] += 1;
      counts[p.detailedRole] += 1;
      if (p.isUserClubPlayer) counts.myClub += 1;
    });
    if (calledUpRoster.length > 0) {
      counts.avgAge =
        Math.round(
          (calledUpRoster.reduce((s, p) => s + p.age, 0) / calledUpRoster.length) * 10
        ) / 10;
      counts.avgOvr = Math.round(
        calledUpRoster.reduce((s, p) => s + p.overall, 0) / calledUpRoster.length
      );
    } else {
      counts.avgOvr = squadViewTeam.strength;
    }
    return counts;
  }, [calledUpRoster, squadViewTeam.strength]);

  const replaceTargetPlayer = replaceOutPlayerId
    ? poolLookup.get(replaceOutPlayerId) || null
    : null;

  const poolCandidates = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = currentTeamPool.filter((p) => {
      if (roleFilter !== 'ALL' && p.detailedRole !== roleFilter) return false;
      if (poolOriginFilter === 'MY_CLUB' && !p.isUserClubPlayer) return false;
      if (poolOriginFilter === 'DOMESTIC' && p.isVirtual) return false;
      if (poolOriginFilter === 'ABROAD' && !p.isVirtual) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.clubShortName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (poolSortBy === 'POS') {
        const rDiff =
          (SELECAO_ROLE_ORDER[a.detailedRole] ?? 9) -
          (SELECAO_ROLE_ORDER[b.detailedRole] ?? 9);
        if (rDiff !== 0) return rDiff;
        return b.overall - a.overall || b.caps - a.caps;
      }
      if (poolSortBy === 'GOALS') {
        return b.goalsSeason - a.goalsSeason || b.overall - a.overall;
      }
      if (poolSortBy === 'CAPS') {
        return b.caps - a.caps || b.overall - a.overall;
      }
      if (poolSortBy === 'YOUNG') {
        return a.age - b.age || b.overall - a.overall;
      }
      return b.overall - a.overall || b.caps - a.caps;
    });

    return filtered.slice(0, 80);
  }, [currentTeamPool, roleFilter, poolOriginFilter, poolSortBy, searchTerm]);

  // Focus team's international matches in current calendar year (plus all cycle matches for ready lookup)
  const focusAllFixtures = useMemo(
    () => getTeamAllInternationalFixtures(nationalTeam, focusTeamId),
    [nationalTeam, focusTeamId]
  );

  const focusSeasonFixtures = useMemo(
    () => getTeamSeasonInternationalFixtures(nationalTeam, focusTeamId, calendarYear),
    [nationalTeam, focusTeamId, calendarYear]
  );

  const readyFixtures = useMemo(
    () =>
      focusAllFixtures.filter(
        (f) =>
          !f.played &&
          (f.status === 'READY_FOR_USER' || (Boolean(currentDate) && f.date === currentDate))
      ),
    [focusAllFixtures, currentDate]
  );

  const nextReadyFixture = readyFixtures[0] || null;

  // Own called-up 26 players for Pre-Match & Live Match (strictly sorted by position order GOL -> ATA)
  const ownCalledRoster = useMemo(() => {
    const resolved = nationalTeam.calledUpPlayerIds
      .map((id) => ownPoolLookup.get(id))
      .filter((x): x is ResolvedNationalPlayer => Boolean(x));
    return sortNationalPlayersByPosition(resolved, nationalTeam.starterPlayerIds);
  }, [nationalTeam.calledUpPlayerIds, nationalTeam.starterPlayerIds, ownPoolLookup]);

  // User club players with international history
  const userClubCappedPlayers = useMemo(() => {
    const myCalledIds = new Set(nationalTeam.calledUpPlayerIds);
    return userClub.squad
      .filter((p) => (p.internationalCaps || 0) > 0 || myCalledIds.has(p.id))
      .sort(
        (a, b) =>
          (b.internationalCaps || 0) - (a.internationalCaps || 0) || b.overall - a.overall
      );
  }, [userClub.squad, nationalTeam.calledUpPlayerIds]);

  const totalCompensationHistory = useMemo(
    () =>
      nationalTeam.callUpHistory.reduce((acc, rep) => acc + rep.totalUserClubCompensation, 0),
    [nationalTeam.callUpHistory]
  );

  // Sorted FIFA Ranking across all mapped nations with dynamic movement
  const fifaRankingRows = useMemo(() => {
    const ptsMap = nationalTeam.fifaRankingPoints || {};
    const metaMap = nationalTeam.fifaRankingMeta || {};
    return [...NATIONAL_TEAMS_CATALOG]
      .map((team) => {
        const points = ptsMap[team.id] ?? team.fifaPoints ?? 1500;
        const meta = metaMap[team.id];
        return {
          team,
          points,
          meta,
        };
      })
      .sort((a, b) => b.points - a.points || b.team.strength - a.team.strength)
      .map((item, idx) => {
        const rank = idx + 1;
        const prevRank = item.meta?.previousRank;
        const rankDiff = prevRank !== undefined ? prevRank - rank : 0;
        return {
          ...item,
          rank,
          prevRank,
          rankDiff,
        };
      });
  }, [nationalTeam.fifaRankingPoints, nationalTeam.fifaRankingMeta]);

  const focusTeamRank = useMemo(
    () => fifaRankingRows.find((r) => r.team.id === focusTeamId)?.rank || 1,
    [fifaRankingRows, focusTeamId]
  );

  const switchArea = (nextArea: 'MY_TEAM' | 'WORLD') => {
    setAreaMode(nextArea);
    onRequestSwitchArea?.(nextArea);
  };

  const inspectNationQuick = (teamId: string) => {
    soundEngine.playClick();
    setWorldInspectTeamId(teamId);
    setWorldSubTab('nations');
    switchArea('WORLD');
  };

  // =========================================================================
  // PRE-MATCH LOCKER ROOM & LIVE INTERNATIONAL MATCH SIMULATOR (WITH 5 SUBS)
  // =========================================================================
  const openPreMatchEscalation = (fix: InternationalMatchFixture) => {
    soundEngine.playClick();
    const fmt = nationalTeam.formation || '4-3-3';
    const validStarters = nationalTeam.starterPlayerIds.filter((id) =>
      ownPoolLookup.has(id)
    );
    const initial11 =
      validStarters.length === 11
        ? validStarters
        : fitPlayersToSelecaoFormation(ownCalledRoster, fmt);

    setLiveFixture(fix);
    setLiveMinute(0);
    setLivePaused(false);
    setLiveSpeedMs(200);
    setLiveMyScore(0);
    setLiveOppScore(0);
    setLiveMyPen(undefined);
    setLiveOppPen(undefined);
    setLivePhaseState('PRE_MATCH');
    setLiveScorers([]);
    setLiveGoalsByPlayerId({});
    setLiveTactic(nationalTeam.tacticStyle);
    setLiveFormation(fmt);
    setLivePitchIds(initial11);
    setLiveSubbedOutIds([]);
    setLivePlayedSubIds([]);
    setLiveSubsCount(0);
    setSelectedLiveOutId(null);
    setShowLiveBenchDrawer(false);
    setLiveEvents([]);
  };

  // Keep Pre-Match pitch XI synced with SelecaoTacticalBoard state updates
  useEffect(() => {
    if (!liveFixture || livePhaseState !== 'PRE_MATCH') return;
    const valid = nationalTeam.starterPlayerIds.filter((id) => ownPoolLookup.has(id));
    if (valid.length === 11) {
      setLivePitchIds(valid);
    }
    if (nationalTeam.formation) {
      setLiveFormation(nationalTeam.formation);
    }
  }, [liveFixture, livePhaseState, nationalTeam.starterPlayerIds, nationalTeam.formation, ownPoolLookup]);

  // Auto-open Pre-Match Escalation modal when launched directly from CalendarView
  useEffect(() => {
    if (!initialLaunchFixtureId || !nationalTeam.isUserCoach) return;
    const target =
      focusAllFixtures.find((f) => f.id === initialLaunchFixtureId && !f.played) ||
      nextReadyFixture;
    if (target) {
      openPreMatchEscalation(target);
    }
    if (onConsumeLaunchFixture) {
      onConsumeLaunchFixture();
    }
  }, [initialLaunchFixtureId, nationalTeam.isUserCoach]);

  const kickOffLiveInternationalMatch = () => {
    if (!liveFixture) return;
    soundEngine.playWhistle(true);
    const currentValidStarters = nationalTeam.starterPlayerIds.filter((id) =>
      ownPoolLookup.has(id)
    );
    if (currentValidStarters.length === 11) {
      setLivePitchIds(currentValidStarters);
    }
    setLiveMinute(1);
    setLivePaused(false);
    setLivePhaseState('FIRST_HALF');
    setShowLiveBenchDrawer(false);

    // Sync chosen pre-match formation & tactic into state
    if (liveFormation !== nationalTeam.formation) {
      onChangeFormation(liveFormation);
    }
    if (liveTactic !== nationalTeam.tacticStyle) {
      onChangeTacticStyle(liveTactic);
    }

    const myTeam = getNationalTeamById(focusTeamId);
    const oppId =
      liveFixture.homeTeamId === focusTeamId ? liveFixture.awayTeamId : liveFixture.homeTeamId;
    const oppTeam = getNationalTeamById(oppId);
    setLiveEvents([
      {
        minute: 1,
        text: `Apita o árbitro no ${liveFixture.stadiumName}! Bola rolando para ${myTeam.name} (${liveFormation}) x ${oppTeam.name} (${liveFixture.competitionName} · ${liveFixture.phase}).`,
      },
    ]);
  };

  const liveStateRef = useRef({
    myScore: 0,
    oppScore: 0,
    tactic: nationalTeam.tacticStyle,
    pitchIds: livePitchIds,
    subsCount: 0,
    formation: liveFormation,
    customPositions: nationalTeam.customPositions,
  });
  liveStateRef.current = {
    myScore: liveMyScore,
    oppScore: liveOppScore,
    tactic: liveTactic,
    pitchIds: livePitchIds,
    subsCount: liveSubsCount,
    formation: liveFormation,
    customPositions: nationalTeam.customPositions,
  };

  useEffect(() => {
    if (!liveFixture || livePaused) return;
    if (
      livePhaseState === 'PRE_MATCH' ||
      livePhaseState === 'HALFTIME' ||
      livePhaseState === 'PENALTIES' ||
      livePhaseState === 'FINISHED'
    ) {
      return;
    }

    const isKnockout =
      !liveFixture.group &&
      liveFixture.competition !== 'wc_qualifiers' &&
      liveFixture.competition !== 'continental_qualifiers' &&
      liveFixture.competition !== 'friendly';

    const myTeam = getNationalTeamById(focusTeamId);
    const isHome = liveFixture.homeTeamId === focusTeamId;
    const oppId = isHome ? liveFixture.awayTeamId : liveFixture.homeTeamId;
    const oppTeam = getNationalTeamById(oppId);

    const timer = setInterval(() => {
      setLiveMinute((prevMin) => {
        const nextMin = prevMin + 1;

        const currentOnPitch = liveStateRef.current.pitchIds
          .map((id) => ownPoolLookup.get(id))
          .filter((x): x is ResolvedNationalPlayer => Boolean(x));
        const activeFormSlots =
          SELECAO_FORMATION_SLOTS[liveStateRef.current.formation] ||
          SELECAO_FORMATION_SLOTS['4-3-3'];
        const freshLegsBonus = Math.min(1.5, liveStateRef.current.subsCount * 0.3);
        const effSum = currentOnPitch.reduce((s, p, idx) => {
          const custom = liveStateRef.current.customPositions?.[p.id];
          if (custom) {
            const inf = inferTacticalZoneFromCoords(custom.x, custom.y);
            return s + evaluateSelecaoSlotFit(p, inf.role, custom.code, custom.label).effectiveOverall;
          }
          const slot = activeFormSlots[idx];
          if (!slot) return s + p.overall;
          return s + evaluateSelecaoSlotFit(p, slot.role, slot.code, slot.label).effectiveOverall;
        }, 0);
        const avgOvr =
          currentOnPitch.length > 0
            ? effSum / currentOnPitch.length + freshLegsBonus
            : myTeam.strength;

        // Check halftime at 45'
        if (livePhaseState === 'FIRST_HALF' && nextMin > 45) {
          soundEngine.playWhistle(false);
          setLivePhaseState('HALFTIME');
          setShowLiveBenchDrawer(true);
          setLiveEvents((ev) => [
            {
              minute: 45,
              text: `Fim do 1º tempo! Placar parcial: ${myTeam.name} ${liveStateRef.current.myScore} x ${liveStateRef.current.oppScore} ${oppTeam.name}. Você pode fazer substituições no banco de 15 reservas ou ajustar a postura tática.`,
            },
            ...ev,
          ]);
          return 45;
        }

        // Check 90' full time
        if (livePhaseState === 'SECOND_HALF' && nextMin > 90) {
          if (isKnockout && liveStateRef.current.myScore === liveStateRef.current.oppScore) {
            soundEngine.playWhistle(false);
            setLivePhaseState('EXTRA_TIME');
            setLiveEvents((ev) => [
              {
                minute: 90,
                text: `Tudo igual no tempo regulamentar (${liveStateRef.current.myScore} x ${liveStateRef.current.oppScore})! Vamos para a Prorrogação (30 minutos)!`,
              },
              ...ev,
            ]);
            return 91;
          }
          soundEngine.playWhistle(false);
          setLivePhaseState('FINISHED');
          setShowLiveBenchDrawer(false);
          if (liveStateRef.current.myScore > liveStateRef.current.oppScore) {
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.55 } });
          }
          return 90;
        }

        // Check 120' end of extra time
        if (livePhaseState === 'EXTRA_TIME' && nextMin > 120) {
          soundEngine.playWhistle(false);
          if (liveStateRef.current.myScore === liveStateRef.current.oppScore) {
            setLivePhaseState('PENALTIES');
            setShowLiveBenchDrawer(false);
            setLiveEvents((ev) => [
              {
                minute: 120,
                text: `Empate persistente após 120 minutos! A vaga será decidida nos Pênaltis!`,
              },
              ...ev,
            ]);
            return 120;
          }
          setLivePhaseState('FINISHED');
          setShowLiveBenchDrawer(false);
          if (liveStateRef.current.myScore > liveStateRef.current.oppScore) {
            confetti({ particleCount: 95, spread: 75, origin: { y: 0.55 } });
          }
          return 120;
        }

        // Per-minute event simulation
        const tac = liveStateRef.current.tactic;
        const atkMod =
          tac === 'JOGO_BONITO_OFENSIVO'
            ? 0.0045
            : tac === 'PRESSAO_ALTA'
            ? 0.003
            : tac === 'SOLIDEZ_TRANSICAO'
            ? -0.002
            : 0;
        const defMod =
          tac === 'JOGO_BONITO_OFENSIVO'
            ? 0.0025
            : tac === 'PRESSAO_ALTA'
            ? 0.0015
            : tac === 'SOLIDEZ_TRANSICAO'
            ? -0.0035
            : 0;

        const diff = avgOvr - oppTeam.strength;
        const myGoalProb = Math.max(0.007, Math.min(0.036, 0.0175 + diff * 0.0012 + atkMod));
        const oppGoalProb = Math.max(0.005, Math.min(0.032, 0.0145 - diff * 0.001 + defMod));

        const roll = Math.random();
        if (roll < myGoalProb) {
          const attackers = currentOnPitch.filter(
            (p) => p.position === 'FW' || p.position === 'MF'
          );
          const scorer =
            attackers[Math.floor(Math.random() * attackers.length)] ||
            currentOnPitch[0] || { id: '', name: myTeam.name };
          soundEngine.playGoalRoar();
          setLiveMyScore((s) => s + 1);
          setLiveScorers((prev) => [...prev, `${scorer.name} (${nextMin}')`]);
          if (scorer.id) {
            setLiveGoalsByPlayerId((prev) => ({
              ...prev,
              [scorer.id]: (prev[scorer.id] || 0) + 1,
            }));
          }
          setLiveEvents((ev) => [
            {
              minute: nextMin,
              isGoal: true,
              isMyTeam: true,
              text: `${nextMin}' — GOOOL DE ${myTeam.name.toUpperCase()}! ${scorer.name} finaliza no canto e explode a torcida!`,
            },
            ...ev,
          ]);
        } else if (roll < myGoalProb + oppGoalProb) {
          setLiveOppScore((s) => s + 1);
          setLiveEvents((ev) => [
            {
              minute: nextMin,
              isGoal: true,
              isMyTeam: false,
              text: `${nextMin}' — Gol de ${oppTeam.name}! Finalização rápida dentro da área.`,
            },
            ...ev,
          ]);
        } else if (roll < myGoalProb + oppGoalProb + 0.035) {
          const flav =
            Math.random() < 0.55
              ? `${nextMin}' — Grande chegada de ${myTeam.name}! O goleiro de ${oppTeam.name} espalma para escanteio.`
              : `${nextMin}' — Pressão de ${oppTeam.name} na entrada da área, mas a defesa de ${myTeam.name} afasta firme.`;
          setLiveEvents((ev) => [{ minute: nextMin, text: flav }, ...ev]);
        }

        return nextMin;
      });
    }, liveSpeedMs);

    return () => clearInterval(timer);
  }, [liveFixture, livePaused, livePhaseState, liveSpeedMs, focusTeamId, ownPoolLookup]);

  const executeLiveSubstitution = (outId: string, inId: string) => {
    if (liveSubsCount >= MAX_LIVE_SUBS) return;
    if (!livePitchIds.includes(outId) || livePitchIds.includes(inId)) return;
    const outPlayer = ownPoolLookup.get(outId);
    const inPlayer = ownPoolLookup.get(inId);
    if (!outPlayer || !inPlayer) return;

    soundEngine.playClick();
    setLivePitchIds((prev) => prev.map((id) => (id === outId ? inId : id)));
    setLiveSubbedOutIds((prev) => [...prev, outId]);
    setLivePlayedSubIds((prev) => (prev.includes(inId) ? prev : [...prev, inId]));
    setLiveSubsCount((c) => c + 1);
    setSelectedLiveOutId(null);

    const minLabel = livePhaseState === 'HALFTIME' ? '46' : String(liveMinute);
    setLiveEvents((ev) => [
      {
        minute: Number(minLabel),
        isSub: true,
        isMyTeam: true,
        text: `${minLabel}' — Substituição em ${focusTeam.name}: entra ${inPlayer.name} (${inPlayer.detailedRole} · OVR ${inPlayer.overall}) no lugar de ${outPlayer.name}.`,
      },
      ...ev,
    ]);
  };

  const resolveLivePenalties = () => {
    if (!liveFixture) return;
    const myTeam = getNationalTeamById(focusTeamId);
    const oppId =
      liveFixture.homeTeamId === focusTeamId ? liveFixture.awayTeamId : liveFixture.homeTeamId;
    const oppTeam = getNationalTeamById(oppId);
    const winProb =
      0.53 + Math.max(-0.15, Math.min(0.15, (myTeam.strength - oppTeam.strength) * 0.015));
    const won = Math.random() < winProb;
    const pairs: [number, number][] = [
      [5, 4],
      [4, 3],
      [5, 3],
      [6, 5],
    ];
    const [hi, lo] = pairs[Math.floor(Math.random() * pairs.length)];
    const mPen = won ? hi : lo;
    const oPen = won ? lo : hi;
    setLiveMyPen(mPen);
    setLiveOppPen(oPen);
    setLivePhaseState('FINISHED');
    if (won) {
      soundEngine.playFanfare();
      confetti({ particleCount: 120, spread: 85, origin: { y: 0.5 } });
    }
    setLiveEvents((ev) => [
      {
        minute: 120,
        isGoal: true,
        isMyTeam: won,
        text: `FIM DOS PÊNALTIS! ${myTeam.name} ${mPen} x ${oPen} ${oppTeam.name}! ${
          won ? `${myTeam.name} avança no mata-mata!` : `${oppTeam.name} fica com a vaga.`
        }`,
      },
      ...ev,
    ]);
  };

  const finishLiveMatchInstant = () => {
    if (!liveFixture) return;
    const isKnockout =
      !liveFixture.group &&
      liveFixture.competition !== 'wc_qualifiers' &&
      liveFixture.competition !== 'continental_qualifiers' &&
      liveFixture.competition !== 'friendly';
    let mScore = liveMyScore;
    let oScore = liveOppScore;
    const remainingMins = Math.max(0, 90 - liveMinute);
    const nextGoalsMap = { ...liveGoalsByPlayerId };
    const nextScorers = [...liveScorers];

    if (remainingMins > 20) {
      if (Math.random() < 0.45) {
        mScore += 1;
        const currentOnPitch = livePitchIds
          .map((id) => ownPoolLookup.get(id))
          .filter((x): x is ResolvedNationalPlayer => Boolean(x));
        const attackers = currentOnPitch.filter(
          (p) => p.position === 'FW' || p.position === 'MF'
        );
        const chosen = attackers[0] || currentOnPitch[0];
        if (chosen) {
          const gMin = Math.min(89, Math.max(liveMinute + 5, 74));
          nextGoalsMap[chosen.id] = (nextGoalsMap[chosen.id] || 0) + 1;
          nextScorers.push(`${chosen.name} (${gMin}')`);
        }
      }
      if (Math.random() < 0.35) oScore += 1;
    }
    let mPen = liveMyPen;
    let oPen = liveOppPen;
    if (isKnockout && mScore === oScore && mPen === undefined) {
      const won = Math.random() < 0.54;
      mPen = won ? 5 : 4;
      oPen = won ? 4 : 5;
    }
    setLiveMyScore(mScore);
    setLiveOppScore(oScore);
    setLiveGoalsByPlayerId(nextGoalsMap);
    setLiveScorers(nextScorers);
    setLiveMyPen(mPen);
    setLiveOppPen(oPen);
    setLiveMinute(mPen !== undefined ? 120 : 90);
    setLivePhaseState('FINISHED');
    setShowLiveBenchDrawer(false);
  };

  const confirmAndCloseLiveMatch = () => {
    if (!liveFixture) return;
    const goalHighlights = liveEvents
      .filter((e) => e.isGoal)
      .slice()
      .reverse()
      .map((e) => e.text);
    onChangeTacticStyle(liveTactic);
    onPlaySelecaoWindow(liveFixture.id, {
      myScore: liveMyScore,
      opponentScore: liveOppScore,
      myPenalties: liveMyPen,
      opponentPenalties: liveOppPen,
      highlights:
        goalHighlights.length > 0
          ? goalHighlights
          : liveEvents.slice(0, 3).map((e) => e.text),
      scorersSummary: liveScorers.length > 0 ? liveScorers.join(', ') : undefined,
      playedSubIds: livePlayedSubIds,
      goalsByPlayerId:
        Object.keys(liveGoalsByPlayerId).length > 0 ? liveGoalsByPlayerId : undefined,
    });
    setLiveFixture(null);
  };

  // Helper to render tournament group tables + knockout brackets (reused by World Cup & Continentals)
  const renderTournamentHub = (
    edition: NationalTournamentEdition,
    mode: 'groups' | 'bracket' | 'matches',
    phaseFilter: string = 'ALL',
    onChangePhaseFilter?: (p: string) => void
  ) => {
    const champTeam = edition.championTeamId
      ? getNationalTeamById(edition.championTeamId)
      : null;
    const runnerTeam = edition.runnerUpTeamId
      ? getNationalTeamById(edition.runnerUpTeamId)
      : null;

    const knockoutPhases =
      edition.compId === 'world_cup'
        ? [
            '16-avos de Final',
            'Oitavas de Final',
            'Quartas de Final',
            'Semifinal',
            'Grande Final',
            'Disputa de 3º Lugar',
          ]
        : edition.compId === 'nations_league'
        ? [
            'Quartas de Final (Ida)',
            'Quartas de Final (Volta)',
            'Semifinal',
            'Grande Final',
            'Disputa de 3º Lugar',
          ]
        : edition.compId === 'eurocopa'
        ? ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Grande Final']
        : edition.groups.length === 8 || edition.groups.length === 6
        ? ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Grande Final', 'Disputa de 3º Lugar']
        : edition.groups.length === 4
        ? ['Quartas de Final', 'Semifinal', 'Grande Final', 'Disputa de 3º Lugar']
        : ['Semifinal', 'Grande Final', 'Disputa de 3º Lugar'];

    const nlHasLeagueD =
      edition.compId === 'nations_league' &&
      edition.groups.some((g) => g.startsWith('Grupo D'));
    const effectiveNlFilter = !nlHasLeagueD && nlLeagueFilter === 'D' ? 'ALL' : nlLeagueFilter;

    return (
      <div className="space-y-5">
        {edition.status === 'COMPLETED' && champTeam && (
          <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <TeamCrest team={champTeam} size="lg" />
              <div>
                <div className="text-xs text-amber-300 font-bold">
                  Campeão Oficial · {edition.title}
                </div>
                <div className="text-lg sm:text-xl font-black text-white mt-0.5">
                  {champTeam.name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Sede: {edition.hostName}
                  {runnerTeam ? ` · Vice-campeão: ${runnerTeam.name}` : ''}
                </div>
              </div>
            </div>
            <div className="text-right font-mono tabular-nums text-xs text-slate-300">
              <span className="text-amber-400 font-bold block">Torneio Encerrado</span>
              <span>{edition.fixtures.filter((f) => f.played).length} jogos disputados</span>
            </div>
          </div>
        )}

        {mode === 'groups' &&
          (edition.compId === 'nations_league' &&
          edition.groups.some((g) => g.startsWith('Grupo A')) ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                  {(nlHasLeagueD
                    ? ([
                        { id: 'ALL', label: 'Todas as Ligas (54)' },
                        { id: 'A', label: 'Liga A (16)' },
                        { id: 'B', label: 'Liga B (16)' },
                        { id: 'C', label: 'Liga C (16)' },
                        { id: 'D', label: 'Liga D (6)' },
                      ] as const)
                    : ([
                        { id: 'ALL', label: 'Todas as Ligas (54)' },
                        { id: 'A', label: 'Liga A (18 · 3×6)' },
                        { id: 'B', label: 'Liga B (18 · 3×6)' },
                        { id: 'C', label: 'Liga C (18 · 3×6)' },
                      ] as const)
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNlLeagueFilter(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                        effectiveNlFilter === item.id
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 px-1">
                  <span className="text-emerald-400 font-semibold">
                    {nlHasLeagueD ? '1º–2º Quartas (Liga A) / 1º Acesso' : '1º–2º Quartas (Liga A) / Acesso'}
                  </span>
                  {!nlHasLeagueD && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-sky-400 font-semibold">2 melhores 3ºs Liga A → QF</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="text-rose-400 font-semibold">
                    {nlHasLeagueD ? '4º Rebaixamento' : '5º–6º Rebaixamento'}
                  </span>
                </div>
              </div>

              {(nlHasLeagueD
                ? ([
                    {
                      div: 'A',
                      title: 'Liga A · Elite Europeia (1º e 2º avançam às Quartas de Final)',
                      hint: 'Top 2 Quartas Ida/Volta · 4º desce à Liga B',
                      hasRelegation: true,
                    },
                    {
                      div: 'B',
                      title: 'Liga B · Segunda Divisão',
                      hint: '1º sobe à Liga A · 4º desce à Liga C',
                      hasRelegation: true,
                    },
                    {
                      div: 'C',
                      title: 'Liga C · Terceira Divisão',
                      hint: '1º sobe à Liga B · 4º desce (Liga D extinta em 2028)',
                      hasRelegation: true,
                    },
                    {
                      div: 'D',
                      title: 'Liga D · Última Edição de Transição (2026/27)',
                      hint: 'Extinta em 2028/29 · Seleções integradas à Liga C',
                      hasRelegation: false,
                    },
                  ] as const)
                : ([
                    {
                      div: 'A',
                      title: 'Liga A · Elite Europeia (18 Seleções · 3×6 Sistema Suíço · 6 Jogos)',
                      hint: 'Top 2 + 2 melhores 3ºs → Quartas Ida/Volta · 5º–6º descem à Liga B',
                      hasRelegation: true,
                    },
                    {
                      div: 'B',
                      title: 'Liga B · Segunda Divisão (18 Seleções · 3×6 Sistema Suíço · 6 Jogos)',
                      hint: 'Top 2 sobem à Liga A · 5º–6º descem à Liga C',
                      hasRelegation: true,
                    },
                    {
                      div: 'C',
                      title: 'Liga C · Terceira Divisão (18 Seleções · 3×6 Sistema Suíço · 6 Jogos)',
                      hint: 'Top 2 sobem à Liga B · Sem rebaixamento (Liga D extinta)',
                      hasRelegation: false,
                    },
                  ] as const)
              )
                .filter((sec) => effectiveNlFilter === 'ALL' || effectiveNlFilter === sec.div)
                .map((sec) => {
                  const divGroups = edition.groups.filter((g) => g.startsWith(`Grupo ${sec.div}`));
                  if (divGroups.length === 0) return null;
                  return (
                    <div key={sec.div} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <h3 className="text-sm font-black text-white">{sec.title}</h3>
                        <span className="text-xs text-slate-400">{sec.hint}</span>
                      </div>

                      <div
                        className={`grid grid-cols-1 md:grid-cols-2 ${
                          nlHasLeagueD ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
                        } gap-4`}
                      >
                        {divGroups.map((grpName) => {
                          const rows = edition.standings.filter((r) => r.group === grpName);
                          return (
                            <div
                              key={grpName}
                              className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden"
                            >
                              <div className="px-4 py-2.5 bg-black border-b border-slate-800 flex items-center justify-between">
                                <span className="text-xs font-black text-white">{grpName}</span>
                                <span className="text-[11px] text-slate-400">
                                  {sec.div === 'A'
                                    ? nlHasLeagueD
                                      ? 'Top 2 Quartas'
                                      : 'Top 2 (+3ºs) QF'
                                    : nlHasLeagueD
                                    ? '1º Acesso'
                                    : 'Top 2 Acesso'}
                                </span>
                              </div>
                              <table className="w-full text-left text-xs">
                                <thead className="text-[11px] text-slate-500 border-b border-slate-800/80">
                                  <tr>
                                    <th className="py-2 pl-3 pr-1">#</th>
                                    <th className="py-2 px-2">Seleção</th>
                                    <th className="py-2 px-1.5 text-right">P</th>
                                    <th className="py-2 px-1.5 text-right">J</th>
                                    <th className="py-2 px-1.5 text-right">V</th>
                                    <th className="py-2 px-2.5 text-right">SG</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 font-mono tabular-nums">
                                  {rows.map((r, idx) => {
                                    const t = getNationalTeamById(r.teamId);
                                    const isMine = activeUserTeamId === r.teamId;
                                    const isDirectAdvance = nlHasLeagueD
                                      ? sec.div === 'A'
                                        ? idx < 2
                                        : idx === 0
                                      : idx < 2;
                                    const isBestThirdZone = !nlHasLeagueD && sec.div === 'A' && idx === 2;
                                    const isRelegated =
                                      sec.hasRelegation &&
                                      (nlHasLeagueD ? idx === rows.length - 1 : idx >= rows.length - 2);
                                    return (
                                      <tr
                                        key={r.teamId}
                                        onClick={() => inspectNationQuick(r.teamId)}
                                        title={`Inspecionar seleção de ${t.name}`}
                                        className={`cursor-pointer transition-colors ${
                                          isMine
                                            ? 'bg-amber-500/10 hover:bg-amber-500/15'
                                            : 'hover:bg-slate-900/50'
                                        }`}
                                      >
                                        <td
                                          className={`py-2 pl-3 pr-1 font-bold ${
                                            isDirectAdvance
                                              ? 'text-emerald-400'
                                              : isBestThirdZone
                                              ? 'text-sky-400'
                                              : isRelegated
                                              ? 'text-rose-400'
                                              : 'text-slate-500'
                                          }`}
                                        >
                                          {idx + 1}
                                        </td>
                                        <td className="py-2 px-2 font-sans">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <TeamCrest team={t} size="sm" />
                                            <span
                                              className={`truncate ${
                                                isMine
                                                  ? 'text-amber-300 font-black'
                                                  : 'text-slate-100 font-semibold hover:text-sky-300'
                                              }`}
                                            >
                                              {t.name}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-1.5 text-right font-black text-white">
                                          {r.points}
                                        </td>
                                        <td className="py-2 px-1.5 text-right text-slate-400">{r.played}</td>
                                        <td className="py-2 px-1.5 text-right text-slate-300">{r.won}</td>
                                        <td className="py-2 px-2.5 text-right text-slate-300">
                                          {r.goalDifference > 0
                                            ? `+${r.goalDifference}`
                                            : r.goalDifference}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {edition.groups.map((grpName) => {
                const rows = edition.standings.filter((r) => r.group === grpName);
                const qualifyDirectCount = edition.compId === 'nations_league' ? 1 : 2;
                return (
                  <div
                    key={grpName}
                    className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden"
                  >
                    <div className="px-4 py-2.5 bg-black border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-black text-white">{grpName}</span>
                      <span className="text-[11px] text-slate-400">
                        {edition.compId === 'nations_league'
                          ? '1º avança ao Final Four'
                          : `Top 2 avançam${
                              edition.compId === 'world_cup'
                                ? ' (+8 melhores 3º)'
                                : edition.groups.length === 6
                                ? ' (+4 melhores 3º)'
                                : ''
                            }`}
                      </span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="text-[11px] text-slate-500 border-b border-slate-800/80">
                        <tr>
                          <th className="py-2 pl-3 pr-1">#</th>
                          <th className="py-2 px-2">Seleção</th>
                          <th className="py-2 px-1.5 text-right">P</th>
                          <th className="py-2 px-1.5 text-right">J</th>
                          <th className="py-2 px-1.5 text-right">V</th>
                          <th className="py-2 px-2.5 text-right">SG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono tabular-nums">
                        {rows.map((r, idx) => {
                          const t = getNationalTeamById(r.teamId);
                          const isMine = activeUserTeamId === r.teamId;
                          const isQualifiedZone = idx < qualifyDirectCount;
                          const isThirdWc =
                            (edition.compId === 'world_cup' || edition.groups.length === 6) &&
                            idx === 2;
                          return (
                            <tr
                              key={r.teamId}
                              onClick={() => inspectNationQuick(r.teamId)}
                              title={`Inspecionar seleção de ${t.name}`}
                              className={`cursor-pointer transition-colors ${
                                isMine
                                  ? 'bg-amber-500/10 hover:bg-amber-500/15'
                                  : 'hover:bg-slate-900/50'
                              }`}
                            >
                              <td
                                className={`py-2 pl-3 pr-1 font-bold ${
                                  isQualifiedZone
                                    ? 'text-emerald-400'
                                    : isThirdWc
                                    ? 'text-sky-400'
                                    : 'text-slate-500'
                                }`}
                              >
                                {idx + 1}
                              </td>
                              <td className="py-2 px-2 font-sans">
                                <div className="flex items-center gap-2 min-w-0">
                                  <TeamCrest team={t} size="sm" />
                                  <span
                                    className={`truncate ${
                                      isMine
                                        ? 'text-amber-300 font-black'
                                        : 'text-slate-100 font-semibold hover:text-sky-300'
                                    }`}
                                  >
                                    {t.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-1.5 text-right font-black text-white">
                                {r.points}
                              </td>
                              <td className="py-2 px-1.5 text-right text-slate-400">{r.played}</td>
                              <td className="py-2 px-1.5 text-right text-slate-300">{r.won}</td>
                              <td className="py-2 px-2.5 text-right text-slate-300">
                                {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ))}

        {mode === 'bracket' && (
          <div className="space-y-5">
            {knockoutPhases.map((phaseName) => {
              const phaseFixes = edition.fixtures
                .filter((f) => f.phase === phaseName)
                .sort((a, b) => (a.knockoutSlot || 0) - (b.knockoutSlot || 0));

              return (
                <div
                  key={phaseName}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>{phaseName}</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      {phaseFixes.length > 0
                        ? `${phaseFixes.filter((f) => f.played).length}/${phaseFixes.length} definidos`
                        : 'Aguardando definição da fase anterior'}
                    </span>
                  </div>

                  {phaseFixes.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">
                      Os confrontos de {phaseName} serão definidos automaticamente assim que a etapa anterior for concluída.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {phaseFixes.map((fix) => {
                        const h = getNationalTeamById(fix.homeTeamId);
                        const a = getNationalTeamById(fix.awayTeamId);
                        const hWon = fix.winnerTeamId === fix.homeTeamId;
                        const aWon = fix.winnerTeamId === fix.awayTeamId;
                        const involvesUser =
                          activeUserTeamId &&
                          (fix.homeTeamId === activeUserTeamId ||
                            fix.awayTeamId === activeUserTeamId);

                        return (
                          <div
                            key={fix.id}
                            className={`rounded-xl p-3 border bg-slate-900/60 space-y-2 ${
                              involvesUser ? 'border-amber-400/60' : 'border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => inspectNationQuick(h.id)}
                                className="flex items-center gap-2 min-w-0 text-left hover:text-sky-300 cursor-pointer"
                              >
                                <TeamCrest team={h} size="sm" />
                                <span
                                  className={`truncate ${
                                    hWon ? 'text-emerald-300 font-black' : 'text-slate-200 font-medium'
                                  }`}
                                >
                                  {h.name}
                                </span>
                              </button>
                              <span className="font-mono tabular-nums font-bold text-white shrink-0">
                                {fix.played ? (
                                  <>
                                    {fix.homeScore}
                                    {fix.penaltiesHome !== undefined && (
                                      <span className="text-[10px] text-amber-300 ml-1">
                                        ({fix.penaltiesHome})
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  '-'
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => inspectNationQuick(a.id)}
                                className="flex items-center gap-2 min-w-0 text-left hover:text-sky-300 cursor-pointer"
                              >
                                <TeamCrest team={a} size="sm" />
                                <span
                                  className={`truncate ${
                                    aWon ? 'text-emerald-300 font-black' : 'text-slate-200 font-medium'
                                  }`}
                                >
                                  {a.name}
                                </span>
                              </button>
                              <span className="font-mono tabular-nums font-bold text-white shrink-0">
                                {fix.played ? (
                                  <>
                                    {fix.awayScore}
                                    {fix.penaltiesAway !== undefined && (
                                      <span className="text-[10px] text-amber-300 ml-1">
                                        ({fix.penaltiesAway})
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  '-'
                                )}
                              </span>
                            </div>

                            {fix.status === 'READY_FOR_USER' && involvesUser && (
                              <button
                                type="button"
                                onClick={() => openPreMatchEscalation(fix)}
                                className="w-full mt-1 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black transition-colors cursor-pointer"
                              >
                                Escalar & Jogar Agora
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mode === 'matches' && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            {edition.compId === 'nations_league' && (
              <div className="p-3 bg-black border-b border-slate-800 flex flex-wrap items-center gap-1.5">
                {(nlHasLeagueD
                  ? ([
                      { id: 'ALL', label: 'Todas as Ligas' },
                      { id: 'A', label: 'Liga A' },
                      { id: 'B', label: 'Liga B' },
                      { id: 'C', label: 'Liga C' },
                      { id: 'D', label: 'Liga D' },
                    ] as const)
                  : ([
                      { id: 'ALL', label: 'Todas as Ligas' },
                      { id: 'A', label: 'Liga A' },
                      { id: 'B', label: 'Liga B' },
                      { id: 'C', label: 'Liga C' },
                    ] as const)
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNlLeagueFilter(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      effectiveNlFilter === item.id
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {onChangePhaseFilter && (
              <div className="p-3 bg-black border-b border-slate-800 flex flex-wrap items-center gap-1.5">
                {[
                  'ALL',
                  'Fase de Grupos · 1ª Rodada',
                  'Fase de Grupos · 2ª Rodada',
                  'Fase de Grupos · 3ª Rodada',
                  ...knockoutPhases,
                ].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => onChangePhaseFilter(ph)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      phaseFilter === ph
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {ph === 'ALL' ? 'Todas as Fases' : ph}
                  </button>
                ))}
              </div>
            )}

            <div className="divide-y divide-slate-800/60 max-h-[520px] overflow-y-auto">
              {edition.fixtures
                .filter((f) => {
                  if (
                    edition.compId === 'nations_league' &&
                    effectiveNlFilter !== 'ALL' &&
                    f.group &&
                    !f.group.startsWith(`Grupo ${effectiveNlFilter}`)
                  ) {
                    return false;
                  }
                  return phaseFilter === 'ALL' || f.phase === phaseFilter;
                })
                .map((fix) => {
                  const h = getNationalTeamById(fix.homeTeamId);
                  const a = getNationalTeamById(fix.awayTeamId);
                  return (
                    <div
                      key={fix.id}
                      className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-900/40"
                    >
                      <div className="text-slate-400 min-w-[170px]">
                        <span className="text-slate-200 font-semibold">{fix.phase}</span>
                        {fix.group ? ` · ${fix.group}` : ''}
                        <span className="block text-[11px] text-slate-500 font-mono tabular-nums">
                          {fix.date ? `${formatShortDate(fix.date)} às ${fix.time || '20:00'}` : fix.dateLabel} ·{' '}
                          <span className="font-sans">{fix.stadiumName}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono tabular-nums">
                        <button
                          type="button"
                          onClick={() => inspectNationQuick(h.id)}
                          className="flex items-center gap-2 w-32 justify-end text-right font-sans hover:text-sky-300 cursor-pointer"
                        >
                          <span className="font-bold text-white truncate">{h.name}</span>
                          <TeamCrest team={h} size="sm" />
                        </button>

                        <div className="px-3 py-1 rounded bg-black border border-slate-800 text-center min-w-[72px] font-black text-amber-300">
                          {fix.played ? (
                            <>
                              {fix.homeScore} x {fix.awayScore}
                              {fix.penaltiesHome !== undefined && (
                                <span className="block text-[10px] text-sky-300">
                                  ({fix.penaltiesHome}–{fix.penaltiesAway} pen)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-500">vs</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => inspectNationQuick(a.id)}
                          className="flex items-center gap-2 w-32 font-sans hover:text-sky-300 cursor-pointer"
                        >
                          <TeamCrest team={a} size="sm" />
                          <span className="font-bold text-white truncate">{a.name}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* TOP HEADER: CENTRAL DE SELEÇÕES FIFA */}
      <div className="bg-slate-950 border border-amber-500/35 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <TeamCrest team={focusTeam} size="lg" />

            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="text-amber-300 font-bold">
                  {areaMode === 'MY_TEAM'
                    ? nationalTeam.isUserCoach
                      ? `Minha Seleção: ${focusTeam.name} (${focusTeam.federationCode})`
                      : 'Minha Seleção · Aguardando Convite ou Escolha'
                    : `Seleções & Torneios FIFA · ${NATIONAL_TEAMS_CATALOG.length} Nações`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Temporada {seasonYear}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Ranking FIFA #{focusTeamRank}</span>
                {nationalTeam.isUserCoach && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-sky-300">
                      Esquema {nationalTeam.formation || '4-3-3'}
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                {areaMode === 'MY_TEAM'
                  ? nationalTeam.isUserCoach
                    ? `Comando Técnico · ${focusTeam.name}`
                    : 'Minha Seleção Nacional · Duplo Comando'
                  : 'Mundo das Seleções · Eliminatórias, Copa do Mundo & Continentais'}
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                {areaMode === 'MY_TEAM'
                  ? 'Área exclusiva da sua Seleção: escale os 11 titulares + 15 suplentes, gerencie a convocação de 26 jogadores, acompanhe a agenda e monitore a federação.'
                  : `Explore todas as ${NATIONAL_TEAMS_CATALOG.length} seleções do planeta, Eliminatórias da Copa (6 confederações), Eliminatórias Continentais, Copa do Mundo (48 nações), Copa Ouro, Nations League e Ranking FIFA.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onSyncNationalitiesWithAI && (
              <button
                type="button"
                disabled={isSyncingNationalities}
                onClick={() => {
                  soundEngine.playClick();
                  onSyncNationalitiesWithAI();
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-sky-300 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <Globe className={`w-3.5 h-3.5 ${isSyncingNationalities ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncingNationalities
                    ? 'Pesquisando Nacionalidades (IA)...'
                    : 'Pesquisar Nacionalidades Reais (IA)'}
                </span>
              </button>
            )}

            {nationalTeam.isUserCoach && nextReadyFixture && (
              <button
                type="button"
                onClick={() => openPreMatchEscalation(nextReadyFixture)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Escalar & Jogar Próxima Partida</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowJobMarketModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>
                {nationalTeam.isUserCoach ? 'Trocar de Seleção' : 'Escolher Seleção'}
              </span>
            </button>

            {nationalTeam.isUserCoach && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onResignSelecao();
                  showToast(
                    `Você entregou o cargo na seleção de ${focusTeam.name} para focar no ${userClub.shortName}.`
                  );
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-xs font-bold text-slate-300 hover:text-rose-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Deixar Cargo
              </button>
            )}
          </div>
        </div>

        {(isSyncingNationalities || nationalitySyncFeedback) && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sky-300">
                <Globe className={`w-3.5 h-3.5 shrink-0 ${isSyncingNationalities ? 'animate-spin' : ''}`} />
                <span>
                  {nationalitySyncFeedback ||
                    'Pesquisando na web com IA a nacionalidade real FIFA de cada jogador do jogo...'}
                </span>
              </div>
              {onDismissNationalitySyncFeedback && !isSyncingNationalities && (
                <button
                  type="button"
                  onClick={onDismissNationalitySyncFeedback}
                  className="text-slate-400 hover:text-white cursor-pointer p-1"
                  aria-label="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {nationalityGroundingSources && nationalityGroundingSources.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span>Fontes verificadas na web:</span>
                {nationalityGroundingSources.map((src, idx) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline"
                  >
                    <span>{src.title || `Fonte ${idx + 1}`}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Official Federation Invites Panel */}
        {(() => {
          const pendingNtOffers = (nationalTeam.pendingNationalOffers || []).filter(
            (o) => o.status === 'PENDING'
          );
          if (pendingNtOffers.length > 0) {
            return (
              <div className="mt-5 pt-5 border-t border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-300">
                    Propostas Oficiais de Federações ({pendingNtOffers.length})
                  </span>
                  {onScoutNationalVacancies && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        const res = onScoutNationalVacancies();
                        showToast(res.feedbackText);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Sondar Mais Federações
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-800/80">
                  {pendingNtOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-white block">
                          Seleção de {offer.teamName} ({offer.federationCode})
                        </span>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {offer.reason} · {offer.confederation} · Força {offer.strength}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            if (onDeclineNationalOffer) {
                              onDeclineNationalOffer(offer.id);
                            } else {
                              onDeclineCbfInvite();
                            }
                            showToast(`Convite da ${offer.federationCode} recusado.`);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Recusar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playFanfare();
                            confetti({ particleCount: 110, spread: 80, origin: { y: 0.5 } });
                            if (onAcceptNationalOffer) {
                              onAcceptNationalOffer(offer.id);
                            } else {
                              onAppointNationalTeam(offer.teamId);
                            }
                            showToast(
                              `Apresentado! Você assumiu o comando da seleção de ${offer.teamName}.`
                            );
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Assumir {offer.teamCode}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (nationalTeam.hasPendingCbfInvite && !nationalTeam.isUserCoach) {
            return (
              <div className="mt-5 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-amber-300 block">
                    Convite Oficial da Confederação Brasileira de Futebol (CBF)
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    A CBF convida <strong>{managerName}</strong> (Reputação {managerReputation}/100) para assumir a Seleção Brasileira nas Eliminatórias e na Copa do Mundo mantendo seu contrato no {userClub.name}.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onDeclineCbfInvite();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Recusar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playFanfare();
                      confetti({ particleCount: 110, spread: 80, origin: { y: 0.5 } });
                      onAcceptCbfRole();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Assumir Seleção Brasileira
                  </button>
                </div>
              </div>
            );
          }

          if (!nationalTeam.isUserCoach && onScoutNationalVacancies) {
            return (
              <div className="mt-5 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Mercado de Treinadores de Seleções
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sonde federações com técnicos pressionados ou escolha diretamente uma seleção disponível para seu prestígio ({managerReputation}/100).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    const res = onScoutNationalVacancies();
                    showToast(res.feedbackText);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  Sondar Propostas de Seleções
                </button>
              </div>
            );
          }

          return null;
        })()}

        {/* 4-Metric KPI Strip */}
        <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-slate-400 block">
              {nationalTeam.isUserCoach
                ? `Confiança (${focusTeam.federationCode})`
                : 'Seu Prestígio Internacional'}
            </span>
            {nationalTeam.isUserCoach ? (() => {
              const secDesc = getCoachSecurityDescriptor(nationalTeam.cbfConfidence);
              return (
                <div className="mt-1 font-mono tabular-nums">
                  <span className={`text-xl font-black ${secDesc.colorClass}`}>
                    {nationalTeam.cbfConfidence}%
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    {secDesc.label} · {nationalTeam.coachWins}V-{nationalTeam.coachDraws}E-
                    {nationalTeam.coachLosses}D
                  </span>
                </div>
              );
            })() : (
              <div className="mt-1 font-mono tabular-nums">
                <span className="text-xl font-black text-amber-400">
                  {managerReputation}/100
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  {
                    NATIONAL_TEAMS_CATALOG.filter(
                      (t) => t.minReputationToCoach <= managerReputation
                    ).length
                  }{' '}
                  seleções disponíveis
                </span>
              </div>
            )}
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Elenco & Escalação FIFA</span>
            <div className="mt-1 font-mono tabular-nums flex items-baseline gap-2">
              <span className="text-xl font-black text-sky-400">
                {nationalTeam.calledUpPlayerIds.length}/{MAX_SELECAO_SQUAD_SIZE}
              </span>
              <span className="text-xs text-slate-400">
                convocados · {nationalTeam.starterPlayerIds.length}/11 titulares
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Títulos por Seleções</span>
            <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-xl font-black text-amber-300">
                {nationalTeam.trophiesWonWithSelecao}
              </span>
              <span className="text-xs text-slate-400">taças conquistadas na carreira</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">
              Compensação FIFA ao {userClub.shortName}
            </span>
            <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-xl font-black text-emerald-400">
                {formatCurrency(totalCompensationHistory)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRIMARY 2-AREA SWITCHER: MINHA SELEÇÃO vs SELEÇÕES & TORNEIOS FIFA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              switchArea('MY_TEAM');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              areaMode === 'MY_TEAM'
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>
              Minha Seleção{nationalTeam.isUserCoach ? ` · ${focusTeam.code}` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              switchArea('WORLD');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              areaMode === 'WORLD'
                ? 'bg-sky-400 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Seleções & Torneios do Mundo</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              switchArea('MY_TEAM');
              setSubTab('fifa_calendar');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              areaMode === 'MY_TEAM' && subTab === 'fifa_calendar'
                ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-emerald-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendário FIFA · Confed. (2026–2038)</span>
          </button>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {currentDate ? `Data FIFA · ${formatShortDate(currentDate)}/${calendarYear}` : `Rodada Atual no Clube: R${currentRound}/38`}
          </span>
        </div>
      </div>

      {feedbackToast && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-xl px-4 py-2.5 text-xs text-sky-200 font-medium flex items-center justify-between gap-2">
          <span>{feedbackToast}</span>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* AREA 1: MINHA SELEÇÃO SUB-NAVIGATION */}
      {areaMode === 'MY_TEAM' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('command');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'command'
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Painel & Agenda{readyFixtures.length > 0 ? ` (${readyFixtures.length})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('lineup');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'lineup'
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Campo & Titulares (11+15)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('squad');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono tabular-nums ${
                subTab === 'squad'
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="font-sans">
                Convocação ({effectiveSquadIds.calledIds.length}/{MAX_SELECAO_SQUAD_SIZE})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('federation');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'federation'
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Federação & Clube</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('fifa_calendar');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'fifa_calendar'
                  ? 'bg-emerald-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendário FIFA &amp; Confed.</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* AREA 1 · SUBTAB 1: COMANDO TÉCNICO & AGENDA DA MINHA SELEÇÃO         */}
      {/* ==================================================================== */}
      {areaMode === 'MY_TEAM' && subTab === 'command' && (
        <div className="space-y-5">
          {readySelecaoDrawInfo && (
            <div className="bg-amber-500/10 border border-amber-400/40 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {readySelecaoDrawInfo.title} · Sorteio Oficial Disponível
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {readySelecaoDrawInfo.userTeamQualified
                      ? `${focusTeam.name} está classificada! Gere o sorteio dos potes para definir o grupo da sua Seleção.`
                      : `Os classificados para ${readySelecaoDrawInfo.title} já estão definidos nos potes. Gere o sorteio dos grupos!`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setDrawModalCompId(readySelecaoDrawInfo.compId);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Gerar Sorteio</span>
              </button>
            </div>
          )}
          {!nationalTeam.isUserCoach ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-white">
                  Assuma uma Seleção Nacional em Duplo Comando
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Você continua no comando diário do {userClub.name} e dirige sua Seleção nas Datas FIFA, Eliminatórias, Torneios Continentais e Copa do Mundo convocando 26 atletas! Seu prestígio atual ({managerReputation}/100) libera{' '}
                  {
                    NATIONAL_TEAMS_CATALOG.filter(
                      (t) => t.minReputationToCoach <= managerReputation
                    ).length
                  }{' '}
                  seleções imediatamente.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => switchArea('WORLD')}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explorar Seleções & Torneios
                </button>
                <button
                  type="button"
                  onClick={() => setShowJobMarketModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Ver Cargos em Seleções
                </button>
              </div>
            </div>
          ) : (
            /* Quick Interactive Command Deck when Coaching */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-black text-white">
                      Painel Tático Rápido · {focusTeam.name} ({nationalTeam.formation || '4-3-3'})
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSubTab('lineup');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Abrir Campo Tático (11+15)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSubTab('squad');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Convocados ({nationalTeam.calledUpPlayerIds.length}/26)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {TACTIC_STYLES.map((style) => {
                    const active = nationalTeam.tacticStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onChangeTacticStyle(style.id);
                        }}
                        className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                          active
                            ? 'bg-amber-500/10 border-amber-400 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold">{style.label}</span>
                          {active && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {style.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right 4 cols: Squad Readiness Summary */}
              <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-white block">
                    Prontidão da Lista de 26 Atletas
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Distribuição por setor da convocação atual
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center font-mono tabular-nums">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">GOL</span>
                    <span className="text-sm font-black text-amber-300">
                      {sectorCallUpCounts.GK}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">DEF</span>
                    <span className="text-sm font-black text-indigo-300">
                      {sectorCallUpCounts.DF}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">MEI</span>
                    <span className="text-sm font-black text-sky-300">
                      {sectorCallUpCounts.MF}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">ATA</span>
                    <span className="text-sm font-black text-emerald-300">
                      {sectorCallUpCounts.FW}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Média OVR:{' '}
                    <strong className="text-white font-mono tabular-nums">
                      {sectorCallUpCounts.avgOvr}
                    </strong>
                  </span>
                  <span className="text-slate-400">
                    Do {userClub.shortName}:{' '}
                    <strong className="text-sky-300 font-mono tabular-nums">
                      {sectorCallUpCounts.myClub}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Season Fixtures of Focus Seleção */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black text-white">
                Agenda Internacional {calendarYear} · {focusTeam.name} ({focusSeasonFixtures.length}{' '}
                jogos programados)
              </h2>
              <span className="text-xs text-slate-400">
                Todos os jogos da sua Seleção também aparecem integrados no Calendário do Clube
              </span>
            </div>

            {focusSeasonFixtures.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                Nenhum compromisso agendado neste ano para {focusTeam.name}. Avance as datas no Calendário!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {focusSeasonFixtures.map((fix) => {
                  const isHome = fix.homeTeamId === focusTeamId;
                  const oppId = isHome ? fix.awayTeamId : fix.homeTeamId;
                  const opp = getNationalTeamById(oppId);
                  const myScore = isHome ? fix.homeScore : fix.awayScore;
                  const oppScore = isHome ? fix.awayScore : fix.homeScore;
                  const myPen = isHome ? fix.penaltiesHome : fix.penaltiesAway;
                  const oppPen = isHome ? fix.penaltiesAway : fix.penaltiesHome;
                  const isReady =
                    !fix.played &&
                    (fix.status === 'READY_FOR_USER' ||
                      (Boolean(currentDate) && fix.date === currentDate));
                  const didWin =
                    fix.played &&
                    ((myScore ?? 0) > (oppScore ?? 0) || fix.winnerTeamId === focusTeamId);
                  const didLose =
                    fix.played &&
                    ((myScore ?? 0) < (oppScore ?? 0) ||
                      (Boolean(fix.winnerTeamId) && fix.winnerTeamId !== focusTeamId));

                  return (
                    <div
                      key={fix.id}
                      className={`bg-slate-950 rounded-2xl p-5 border flex flex-col justify-between gap-4 ${
                        isReady ? 'border-amber-400/75' : 'border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                          <span>
                            <strong className="text-amber-300">{fix.competitionName}</strong> ·{' '}
                            {fix.phase}
                          </span>
                          <span className="font-mono tabular-nums">
                            {fix.played
                              ? didWin
                                ? 'Vitória'
                                : didLose
                                ? 'Derrota'
                                : 'Empate'
                              : isReady
                              ? 'Liberado Hoje'
                              : fix.date
                              ? `${formatShortDate(fix.date)} · ${fix.time || '20:00'}`
                              : `Rodada R${fix.triggerRound}`}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {fix.dateLabel} · {fix.stadiumName}
                        </p>

                        <div className="mt-3.5 py-3 px-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <TeamCrest team={focusTeam} />
                            <div className="min-w-0">
                              <span className="text-sm font-black text-white block truncate">
                                {focusTeam.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {isHome ? 'Mandante' : 'Visitante'}
                              </span>
                            </div>
                          </div>

                          <div className="text-center font-mono tabular-nums shrink-0">
                            {fix.played ? (
                              <div className="px-3 py-1 rounded-lg bg-black border border-slate-800">
                                <span className="text-base font-black text-amber-300">
                                  {myScore} x {oppScore}
                                </span>
                                {myPen !== undefined && (
                                  <span className="block text-[10px] text-sky-300">
                                    ({myPen}–{oppPen} pen)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-slate-400">vs</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => inspectNationQuick(opp.id)}
                            title={`Ver escalação e elenco de ${opp.name}`}
                            className="flex items-center gap-2.5 min-w-0 justify-end text-right hover:text-sky-300 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <span className="text-sm font-black text-white block truncate">
                                {opp.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                                Força {opp.strength} · Ver Time
                              </span>
                            </div>
                            <TeamCrest team={opp} />
                          </button>
                        </div>

                        {fix.played && fix.highlights && fix.highlights.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {fix.highlights.slice(0, 3).map((hl, i) => (
                              <p key={i} className="text-xs text-slate-300 leading-relaxed">
                                {hl}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      {isReady && nationalTeam.isUserCoach && (
                        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setSubTab('lineup');
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Ajustar Campo (11)
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playWhistle(true);
                                onPlaySelecaoWindow(fix.id);
                              }}
                              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Simular Rápido
                            </button>

                            <button
                              type="button"
                              onClick={() => openPreMatchEscalation(fix)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-slate-950" />
                              <span>Escalar & Jogar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* AREA 1 · SUBTAB 2: ESCALAÇÃO & CAMPO TÁTICO (MINHA SELEÇÃO)          */}
      {/* ==================================================================== */}
      {areaMode === 'MY_TEAM' && subTab === 'lineup' && (
        <div className="space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TeamCrest team={squadViewTeam} />
              <div>
                <h2 className="text-sm font-black text-white">
                  Campo de Jogo · {squadViewTeam.name} ({squadViewTeam.federationCode})
                </h2>
                <p className="text-xs text-slate-400">
                  {isEditingOwnSelecao
                    ? 'Escale seus 11 titulares para os jogos, mova atletas livremente no gramado, defina o esquema tático, o capitão e organize os 15 reservas.'
                    : 'Pré-visualização tática. Assuma uma seleção para escalar os titulares, mover jogadores e disputar as partidas.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isEditingOwnSelecao && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowJobMarketModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Assumir Seleção p/ Escalar
                </button>
              )}
              <button
                type="button"
                onClick={() => switchArea('WORLD')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ver Outras Seleções
              </button>
            </div>
          </div>

          <SelecaoTacticalBoard
            team={squadViewTeam}
            isEditable={isEditingOwnSelecao}
            formation={effectiveFormation}
            tacticStyle={nationalTeam.tacticStyle}
            captainPlayerId={effectiveSquadIds.captainId}
            calledUpPlayers={calledUpRoster}
            starterIds={effectiveSquadIds.starterIds}
            customPositions={isEditingOwnSelecao ? nationalTeam.customPositions : undefined}
            allClubs={allClubs}
            readyFixture={isEditingOwnSelecao ? nextReadyFixture : null}
            onChangeFormation={(fmt) => {
              onChangeFormation(fmt);
              showToast(`Esquema tático de ${squadViewTeam.name} alterado para ${fmt}!`);
            }}
            onChangeTacticStyle={(st) => {
              onChangeTacticStyle(st);
            }}
            onSwapPlayers={(a, b) => {
              const res = onSwapLineupPlayers(a, b);
              if (res.feedback) showToast(res.feedback);
            }}
            onMovePlayerToPitchCoords={(pid, x, y, code, label) => {
              if (!onMovePlayerToPitchCoords) return;
              const res = onMovePlayerToPitchCoords(pid, x, y, code, label);
              if (res.feedback) showToast(res.feedback);
            }}
            onResetCustomPositions={onResetCustomPositions}
            onAutoPickStartersOnly={() => {
              onAutoPickStartersOnly();
              showToast(
                `Melhores 11 titulares escalados automaticamente no esquema ${effectiveFormation}!`
              );
            }}
            onSetCaptain={(pid) => {
              onSetCaptain(pid);
              const capName = poolLookup.get(pid)?.name || 'Atleta';
              showToast(`${capName} assumiu a braçadeira de capitão de ${squadViewTeam.name}!`);
            }}
            onLaunchReadyMatch={(fix) => openPreMatchEscalation(fix)}
            onGoToCallUpTab={() => setSubTab('squad')}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* AREA 1 · SUBTAB 3: CONVOCAÇÃO DE 26 JOGADORES & OBSERVATÓRIO         */}
      {/* ==================================================================== */}
      {areaMode === 'MY_TEAM' && subTab === 'squad' && (
        <div className="space-y-5">
          {/* 26-Player Quota Summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TeamCrest team={squadViewTeam} />
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    Convocação Oficial de 26 Jogadores · {squadViewTeam.name} (
                    {squadViewTeam.federationCode})
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isEditingOwnSelecao
                      ? 'Convoque até 26 atletas (padrão FIFA: 3 goleiros + 23 de linha). Clique em "Trocar" em qualquer convocado para substituição direta!'
                      : 'Assuma uma seleção para gerenciar a convocação oficial de 26 jogadores.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSubTab('lineup');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Escalar no Campo (11)</span>
                </button>

                {onSyncNationalitiesWithAI && (
                  <button
                    type="button"
                    disabled={isSyncingNationalities}
                    onClick={() => {
                      soundEngine.playClick();
                      onSyncNationalitiesWithAI();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-xs font-bold text-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    <Globe className={`w-3.5 h-3.5 ${isSyncingNationalities ? 'animate-spin' : ''}`} />
                    <span>
                      {isSyncingNationalities ? 'Pesquisando IA...' : 'Atualizar Nacionalidades (IA)'}
                    </span>
                  </button>
                )}

                {isEditingOwnSelecao && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onAutoPickSquad();
                      setReplaceOutPlayerId(null);
                      showToast(
                        `Convocação ideal de 26 atletas de ${squadViewTeam.name} organizada por posição!`
                      );
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Convocação Ideal (26)</span>
                  </button>
                )}
              </div>
            </div>

            {/* 26-Slot Visual Progress & Sector Quotas */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-6 gap-3 font-mono tabular-nums text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] font-sans text-slate-400 block">Lista FIFA</span>
                <span
                  className={`text-base font-black ${
                    calledUpRoster.length === MAX_SELECAO_SQUAD_SIZE
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }`}
                >
                  {calledUpRoster.length}/{MAX_SELECAO_SQUAD_SIZE}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] font-sans text-slate-400 block">Goleiros (GOL)</span>
                <span
                  className={`text-base font-black ${
                    sectorCallUpCounts.GOL >= 3 ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {sectorCallUpCounts.GOL}{' '}
                  <span className="text-[10px] text-slate-500 font-normal">rec. 3</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] font-sans text-slate-400 block">LAT / ZAG</span>
                <span className="text-base font-black text-indigo-300">
                  {sectorCallUpCounts.LAT} + {sectorCallUpCounts.ZAG}{' '}
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({sectorCallUpCounts.DF})
                  </span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] font-sans text-slate-400 block">VOL / MEI</span>
                <span className="text-base font-black text-sky-300">
                  {sectorCallUpCounts.VOL} + {sectorCallUpCounts.MEI}{' '}
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({sectorCallUpCounts.MF})
                  </span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] font-sans text-slate-400 block">Atacantes (ATA)</span>
                <span className="text-base font-black text-emerald-300">
                  {sectorCallUpCounts.ATA}{' '}
                  <span className="text-[10px] text-slate-500 font-normal">rec. 6–7</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] font-sans text-slate-400 block">Média OVR / Idade</span>
                <span className="text-base font-black text-white">
                  {sectorCallUpCounts.avgOvr}{' '}
                  <span className="text-[11px] text-slate-400 font-normal">
                    · {sectorCallUpCounts.avgAge}a
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Active Direct Swap Banner */}
          {replaceTargetPlayer && isEditingOwnSelecao && (
            <div className="bg-slate-900 border border-amber-400/60 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-200">
                <ArrowLeftRight className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Substituindo na lista de 26:{' '}
                  <strong className="text-white">{replaceTargetPlayer.name}</strong> (
                  {replaceTargetPlayer.detailedRole} · OVR {replaceTargetPlayer.overall}). Escolha o novo convocado no Observatório ao lado!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplaceOutPlayerId(null)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cancelar Troca
              </button>
            </div>
          )}

          {/* Split Workspace when coaching (or full-width 26-man list when inspecting another Seleção) */}
          <div
            className={`grid grid-cols-1 ${
              isEditingOwnSelecao ? 'xl:grid-cols-12' : ''
            } gap-6 items-start`}
          >
            {/* LEFT: 26 CALLED-UP PLAYERS SHEET (ORGANIZED BY POSITION ORDER GOL -> ATA) */}
            <div
              className={`${
                isEditingOwnSelecao ? 'xl:col-span-7' : ''
              } bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden`}
            >
              <div className="p-4 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>
                    Lista Oficial por Posição ({calledUpRoster.length}/{MAX_SELECAO_SQUAD_SIZE}) · GOL → LAT → ZAG → VOL → MEI → ATA
                  </span>
                </span>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto max-w-full">
                  {(
                    [
                      { id: 'ALL', label: `Todos (${calledUpRoster.length})` },
                      { id: 'GOL', label: `GOL (${sectorCallUpCounts.GOL})` },
                      { id: 'LAT', label: `LAT (${sectorCallUpCounts.LAT})` },
                      { id: 'ZAG', label: `ZAG (${sectorCallUpCounts.ZAG})` },
                      { id: 'VOL', label: `VOL (${sectorCallUpCounts.VOL})` },
                      { id: 'MEI', label: `MEI (${sectorCallUpCounts.MEI})` },
                      { id: 'ATA', label: `ATA (${sectorCallUpCounts.ATA})` },
                    ] as const
                  ).map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setCalledSectorFilter(sec.id)}
                      className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                        calledSectorFilter === sec.id
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[650px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 pl-3 pr-1">#</th>
                      <th className="py-2.5 px-3">Atleta</th>
                      <th className="py-2.5 px-2">Clube</th>
                      <th className="py-2.5 px-2 text-center">Pos</th>
                      <th className="py-2.5 px-2 text-center">OVR</th>
                      <th className="py-2.5 px-2 text-right">J / G</th>
                      <th className="py-2.5 px-3 text-right">Status & Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredCalledUpRoster.map((player, idx) => {
                      const prevRole =
                        idx > 0 ? filteredCalledUpRoster[idx - 1].detailedRole : null;
                      const showRoleGroupHeader = prevRole !== player.detailedRole;
                      const roleGroupCount = sectorCallUpCounts[player.detailedRole];
                      const globalIdx = calledUpRoster.findIndex((c) => c.id === player.id);
                      const shirtNumber = globalIdx + 1;
                      const isStarter = starterSet.has(player.id);
                      const isCaptain = effectiveSquadIds.captainId === player.id;
                      const isBeingReplaced = replaceOutPlayerId === player.id;

                      return (
                        <React.Fragment key={player.id}>
                          {showRoleGroupHeader && (
                            <tr className="bg-slate-900/90 border-y border-slate-800">
                              <td
                                colSpan={7}
                                className="py-1.5 px-3 text-[11px] font-black text-amber-300"
                              >
                                <div className="flex items-center justify-between">
                                  <span>{ROLE_SECTION_LABELS[player.detailedRole]}</span>
                                  <span className="font-mono tabular-nums text-[10px] font-semibold text-slate-400">
                                    {roleGroupCount}{' '}
                                    {roleGroupCount === 1 ? 'convocado' : 'convocados'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr
                            className={
                              isBeingReplaced
                                ? 'bg-amber-500/15'
                                : player.isUserClubPlayer
                                ? 'bg-sky-500/10'
                                : 'hover:bg-slate-900/50'
                            }
                          >
                            <td className="py-2.5 pl-3 pr-1 font-mono tabular-nums text-[11px] text-slate-500">
                              {shirtNumber}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const realClub = player.clubId
                                    ? allClubs.find((c) => c.id === player.clubId) || null
                                    : null;
                                  const realPlayer = realClub?.squad.find((sp) => sp.id === player.id);
                                  const targetPlayer: Player = realPlayer || {
                                    id: player.id,
                                    name: player.name,
                                    position: player.position,
                                    detailedRole: player.detailedRole,
                                    overall: player.overall,
                                    age: player.age,
                                    nationality: squadViewTeam.name,
                                    marketValue: player.marketValue,
                                    wage: Math.max(5000, Math.round((player.marketValue || 500000) * 0.008)),
                                    contractYears: 2,
                                    condition: 100,
                                    morale: 'Boa',
                                    potential: Math.min(99, player.overall + (player.age <= 22 ? 6 : 1)),
                                    preferredFoot: 'Destro',
                                    specialSkill: 'Convocável Internacional',
                                    squadNumber: shirtNumber,
                                    isStarter,
                                    isSubstitute: false,
                                    goals: player.goalsSeason,
                                    assists: player.assistsSeason,
                                    matches: 0,
                                    yellowCards: 0,
                                    redCards: 0,
                                    isSuspended: false,
                                    injuryWeeks: 0,
                                    ratingAverage: 6.8,
                                    internationalCaps: player.caps,
                                    internationalGoals: player.internationalGoals,
                                  };
                                  return (
                                    <>
                                      <PlayerAvatar
                                        player={targetPlayer}
                                        club={realClub}
                                        clubPrimaryColor={realClub?.colors.primary || player.clubColors?.primary}
                                        clubTextColor={realClub?.colors.text || player.clubColors?.text}
                                        size="xs"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          soundEngine.playClick();
                                          inspection?.inspectPlayer(targetPlayer, realClub);
                                        }}
                                        className={`font-bold hover:text-sky-300 transition-colors text-left cursor-pointer ${
                                          player.isUserClubPlayer
                                            ? 'text-sky-300 font-black'
                                            : 'text-white'
                                        }`}
                                      >
                                        {player.name}
                                      </button>
                                    </>
                                  );
                                })()}
                                {isCaptain && (
                                  <Crown
                                    className="w-3.5 h-3.5 text-amber-400 shrink-0"
                                    aria-label="Capitão"
                                  />
                                )}
                                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                                  {player.age}a
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-slate-300">
                              {player.clubId && onInspectClub ? (
                                <button
                                  type="button"
                                  onClick={() => onInspectClub(player.clubId!)}
                                  className="hover:text-sky-300 transition-colors cursor-pointer"
                                >
                                  {player.clubShortName}
                                </button>
                              ) : (
                                player.clubShortName
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                              {player.detailedRole}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums font-black text-amber-400">
                              {player.overall}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-400">
                              {player.caps}J · {player.internationalGoals}G
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isEditingOwnSelecao ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playClick();
                                      const res = onToggleStarter(player.id);
                                      showToast(res.feedback);
                                    }}
                                    className={`px-2 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                      isStarter
                                        ? 'bg-emerald-400 text-slate-950 font-black'
                                        : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    {isStarter ? 'Titular' : 'Reserva'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playClick();
                                      if (isBeingReplaced) {
                                        setReplaceOutPlayerId(null);
                                      } else {
                                        setReplaceOutPlayerId(player.id);
                                        setRoleFilter(player.detailedRole);
                                      }
                                    }}
                                    title="Substituir diretamente por outro atleta do Observatório"
                                    className={`px-2 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                      isBeingReplaced
                                        ? 'bg-amber-400 text-slate-950 font-black'
                                        : 'bg-slate-900 border border-slate-800 hover:border-amber-400/50 text-slate-300 hover:text-amber-300'
                                    }`}
                                  >
                                    Trocar
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playClick();
                                      if (replaceOutPlayerId === player.id) {
                                        setReplaceOutPlayerId(null);
                                      }
                                      const res = onToggleCallUp(player.id);
                                      showToast(res.feedback);
                                    }}
                                    title="Cortar da convocação"
                                    className="p-1.5 rounded bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className={`text-xs font-semibold ${
                                    isStarter ? 'text-emerald-400' : 'text-slate-400'
                                  }`}
                                >
                                  {isStarter ? 'Titular' : 'Suplente'}
                                </span>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: INTERACTIVE NATIONAL POOL OBSERVATORY */}
            {isEditingOwnSelecao && (
              <div className="xl:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 bg-black border-b border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-white">
                        Observatório Nacional · {squadViewTeam.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {currentTeamPool.length} atletas com nacionalidade real de {squadViewTeam.name}
                      </p>
                    </div>
                  </div>

                  {/* Search + Sort */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar nome ou clube..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <select
                      value={poolSortBy}
                      onChange={(e) =>
                        setPoolSortBy(
                          e.target.value as 'OVR' | 'POS' | 'GOALS' | 'CAPS' | 'YOUNG'
                        )
                      }
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="POS">Ordenar: Posição (GOL → ATA)</option>
                      <option value="OVR">Ordenar: Maior OVR</option>
                      <option value="GOALS">Ordenar: Gols na Temp.</option>
                      <option value="CAPS">Ordenar: Jogos Seleção</option>
                      <option value="YOUNG">Ordenar: Mais Jovens</option>
                    </select>
                  </div>

                  {/* Role Filter + Origin Filter */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto">
                      {(['ALL', 'GOL', 'LAT', 'ZAG', 'VOL', 'MEI', 'ATA'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRoleFilter(r)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                            roleFilter === r
                              ? 'bg-sky-400 text-slate-950 font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {r === 'ALL' ? 'Todos' : r}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      {(
                        [
                          { id: 'ALL', label: 'Todos' },
                          { id: 'MY_CLUB', label: userClub.shortName },
                          { id: 'DOMESTIC', label: 'Ligas' },
                          { id: 'ABROAD', label: 'Exterior' },
                        ] as const
                      ).map((orig) => (
                        <button
                          key={orig.id}
                          type="button"
                          onClick={() => setPoolOriginFilter(orig.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                            poolOriginFilter === orig.id
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {orig.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[540px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Atleta</th>
                        <th className="py-2.5 px-2 text-center">Pos</th>
                        <th className="py-2.5 px-2 text-center">OVR</th>
                        <th className="py-2.5 px-2 text-right">Temp.</th>
                        <th className="py-2.5 px-3 text-right">Convocação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {poolCandidates.map((p) => {
                        const alreadyCalled = calledSet.has(p.id);
                        return (
                          <tr
                            key={p.id}
                            className={
                              p.isUserClubPlayer ? 'bg-sky-500/10' : 'hover:bg-slate-900/40'
                            }
                          >
                            <td className="py-2 px-3">
                              {(() => {
                                const realClub = p.clubId
                                  ? allClubs.find((c) => c.id === p.clubId) || null
                                  : null;
                                const realPlayer = realClub?.squad.find((sp) => sp.id === p.id);
                                const targetPlayer: Player = realPlayer || {
                                  id: p.id,
                                  name: p.name,
                                  position: p.position,
                                  detailedRole: p.detailedRole,
                                  overall: p.overall,
                                  age: p.age,
                                  nationality: squadViewTeam.name,
                                  marketValue: p.marketValue,
                                  wage: Math.max(5000, Math.round((p.marketValue || 500000) * 0.008)),
                                  contractYears: 2,
                                  condition: 100,
                                  morale: 'Boa',
                                  potential: Math.min(99, p.overall + (p.age <= 22 ? 6 : 1)),
                                  preferredFoot: 'Destro',
                                  specialSkill: 'Convocável Internacional',
                                  squadNumber: 1,
                                  isStarter: false,
                                  isSubstitute: false,
                                  goals: p.goalsSeason,
                                  assists: p.assistsSeason,
                                  matches: 0,
                                  yellowCards: 0,
                                  redCards: 0,
                                  isSuspended: false,
                                  injuryWeeks: 0,
                                  ratingAverage: 6.8,
                                  internationalCaps: p.caps,
                                  internationalGoals: p.internationalGoals,
                                };
                                return (
                                  <div className="flex items-center gap-2">
                                    <PlayerAvatar
                                      player={targetPlayer}
                                      club={realClub}
                                      clubPrimaryColor={realClub?.colors.primary || p.clubColors?.primary}
                                      clubTextColor={realClub?.colors.text || p.clubColors?.text}
                                      size="xs"
                                    />
                                    <div className="min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          soundEngine.playClick();
                                          inspection?.inspectPlayer(targetPlayer, realClub);
                                        }}
                                        className="font-bold text-white hover:text-sky-300 transition-colors leading-tight text-left cursor-pointer"
                                      >
                                        {p.name}{' '}
                                        <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                                          {p.age}a
                                        </span>
                                      </button>
                                      <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                                        {p.clubShortName} · {p.caps}J/{p.internationalGoals}G Sel.
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-400">
                              {p.detailedRole}
                            </td>
                            <td className="py-2 px-2 text-center font-mono tabular-nums font-black text-sky-400">
                              {p.overall}
                            </td>
                            <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-300">
                              {p.goalsSeason}G · {p.assistsSeason}A
                            </td>
                            <td className="py-2 px-3 text-right">
                              {alreadyCalled ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick();
                                    const res = onToggleCallUp(p.id);
                                    showToast(res.feedback);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60"
                                >
                                  <UserMinus className="w-3 h-3" />
                                  <span>Cortar</span>
                                </button>
                              ) : replaceTargetPlayer ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick();
                                    const res = onReplaceCallUp(replaceTargetPlayer.id, p.id);
                                    setReplaceOutPlayerId(null);
                                    showToast(res.feedback);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-black whitespace-nowrap shrink-0 cursor-pointer bg-amber-400 hover:bg-amber-300 text-slate-950"
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                  <span>Entrar na Vaga</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick();
                                    const res = onToggleCallUp(p.id);
                                    showToast(res.feedback);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Convocar</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* AREA 1 · SUBTAB 4: FEDERAÇÃO, RELATÓRIOS & IMPACTO NO CLUBE          */}
      {/* ==================================================================== */}
      {areaMode === 'MY_TEAM' && subTab === 'federation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <TeamCrest team={focusTeam} size="md" />
                <div>
                  <h2 className="text-sm font-black text-white">
                    {nationalTeam.isUserCoach
                      ? `Federação ${focusTeam.federationCode} · ${focusTeam.name}`
                      : 'Sem Seleção Sob Comando'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {focusTeam.confederation} · Estádio {focusTeam.homeStadium}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono tabular-nums text-xs">
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="font-sans text-[11px] text-slate-400 block">
                    Confiança ({getCoachSecurityDescriptor(nationalTeam.cbfConfidence).label})
                  </span>
                  <span
                    className={`text-lg font-black ${
                      getCoachSecurityDescriptor(nationalTeam.cbfConfidence).colorClass
                    }`}
                  >
                    {nationalTeam.cbfConfidence}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="font-sans text-[11px] text-slate-400 block">Retrospecto</span>
                  <span className="text-lg font-black text-white">
                    {nationalTeam.coachWins}V · {nationalTeam.coachDraws}E · {nationalTeam.coachLosses}D
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="font-sans text-[11px] text-slate-400 block">Títulos Conquistados</span>
                  <span className="text-lg font-black text-amber-300">
                    {nationalTeam.trophiesWonWithSelecao}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="font-sans text-[11px] text-slate-400 block">Ranking FIFA</span>
                  <span className="text-lg font-black text-sky-400">#{focusTeamRank}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowJobMarketModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {nationalTeam.isUserCoach ? 'Trocar de Seleção' : 'Escolher Seleção'}
                </button>
                {nationalTeam.isUserCoach && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onResignSelecao();
                      showToast(
                        `Você entregou o cargo na seleção de ${focusTeam.name} para focar no ${userClub.shortName}.`
                      );
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-xs font-bold text-slate-300 hover:text-rose-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Deixar Cargo
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-black border-b border-slate-800">
                <h3 className="text-sm font-black text-white">
                  Atletas de Seleção no {userClub.shortName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bônus FIFA por convocado: {formatCurrency(FIFA_SOLIDARITY_COMPENSATION_PER_PLAYER)} · Total: {formatCurrency(totalCompensationHistory)}
                </p>
              </div>
              {userClubCappedPlayers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhum atleta do {userClub.shortName} possui convocações registradas ainda.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                  {userClubCappedPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar
                          player={p}
                          club={userClub}
                          clubPrimaryColor={userClub.colors.primary}
                          clubTextColor={userClub.colors.text}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              inspection?.inspectPlayer(p, userClub);
                            }}
                            className="font-bold text-white hover:text-sky-300 transition-colors block truncate text-left cursor-pointer max-w-full"
                          >
                            {p.name}
                          </button>
                          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {p.detailedRole} · OVR {p.overall}
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <span className="text-emerald-400 font-bold block">
                          {p.internationalCaps || 0}J
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {p.internationalGoals || 0}G
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-black border-b border-slate-800">
              <h3 className="text-sm font-black text-white">Histórico de Convocações & Relatórios FIFA</h3>
            </div>
            {nationalTeam.callUpHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Os relatórios pós-jogo e bônus de solidariedade da FIFA aparecerão aqui após cada janela internacional.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
                {nationalTeam.callUpHistory.slice(0, 14).map((rep) => (
                  <div key={rep.id} className="p-4 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 font-semibold">{rep.windowLabel}</span>
                      {rep.rankingDelta !== undefined && (
                        <span
                          className={`text-[11px] font-mono tabular-nums font-bold ${
                            rep.rankingDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {rep.rankingDelta >= 0 ? `+${rep.rankingDelta.toFixed(1)}` : rep.rankingDelta.toFixed(1)} pts FIFA
                        </span>
                      )}
                    </div>
                    <div className="font-black text-amber-300 font-mono tabular-nums">
                      {rep.matchSummary}
                    </div>
                    {rep.rankingNewRank && (
                      <div className="text-[11px] font-mono tabular-nums text-sky-300">
                        Posição no Ranking: #{rep.rankingNewRank}
                      </div>
                    )}
                    {rep.totalUserClubCompensation > 0 && (
                      <div className="text-[11px] text-emerald-400 font-mono tabular-nums">
                        +{formatCurrency(rep.totalUserClubCompensation)} ao {userClub.shortName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* AREA 1 · SUBTAB 5: CALENDÁRIO DATAS FIFA · OFC · CONCACAF (2026–2038) */}
      {/* ==================================================================== */}
      {areaMode === 'MY_TEAM' && subTab === 'fifa_calendar' && (() => {
        const years = Array.from({ length: 13 }, (_, idx) => 2026 + idx);
        const visibleYears = fifaCalYearFilter === 'ALL' ? years : [fifaCalYearFilter];
        const oceaniaYears = years;
        const visibleOceaniaYears =
          oceaniaCalYearFilter === 'ALL' ? oceaniaYears : [oceaniaCalYearFilter];
        const concacafYears = years;
        const visibleConcacafYears =
          concacafCalYearFilter === 'ALL' ? concacafYears : [concacafCalYearFilter];
        const asiaYears = years;
        const visibleAsiaYears =
          asiaCalYearFilter === 'ALL' ? asiaYears : [asiaCalYearFilter];
        const conmebolYears = years;
        const visibleConmebolYears =
          conmebolCalYearFilter === 'ALL' ? conmebolYears : [conmebolCalYearFilter];
        const cafYears = years;
        const visibleCafYears =
          cafCalYearFilter === 'ALL' ? cafYears : [cafCalYearFilter];
        const uefaYears = years;
        const visibleUefaYears =
          uefaCalYearFilter === 'ALL' ? uefaYears : [uefaCalYearFilter];

        const uefaTeams = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'UEFA').sort(
          (a, b) => b.fifaPoints - a.fifaPoints
        );
        const euro2028CohostSet = new Set<string>(EURO_2028_COHOSTS);
        const wc2030UefaCohostSet = new Set<string>(WORLD_CUP_2030_COHOSTS);
        const filteredUefaTeams = uefaTeamSearch.trim()
          ? uefaTeams.filter(
              (t) =>
                t.name.toLowerCase().includes(uefaTeamSearch.trim().toLowerCase()) ||
                t.code.toLowerCase().includes(uefaTeamSearch.trim().toLowerCase())
            )
          : uefaTeams;
        const selectedUefaTeam =
          uefaTeams.find((t) => t.id === uefaFocusTeamId) || uefaTeams[0] || focusTeam;
        const selectedUefaFixtures = getTeamAllInternationalFixtures(
          nationalTeam,
          selectedUefaTeam.id
        );

        const conmebolTeams = NATIONAL_TEAMS_CATALOG.filter(
          (t) => t.confederation === 'CONMEBOL'
        );
        const selectedConmebolTeam =
          conmebolTeams.find((t) => t.id === conmebolFocusTeamId) ||
          conmebolTeams[0] ||
          focusTeam;
        const selectedConmebolFixtures = getTeamAllInternationalFixtures(
          nationalTeam,
          selectedConmebolTeam.id
        );

        const cafTeams = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'CAF').sort(
          (a, b) => b.fifaPoints - a.fifaPoints
        );
        const cafTop8SeedIds = new Set(cafTeams.slice(0, 8).map((t) => t.id));
        const cafCohostSet = new Set<string>(CAF_2028_COHOSTS);
        const filteredCafTeams = cafTeamSearch.trim()
          ? cafTeams.filter(
              (t) =>
                t.name.toLowerCase().includes(cafTeamSearch.trim().toLowerCase()) ||
                t.code.toLowerCase().includes(cafTeamSearch.trim().toLowerCase())
            )
          : cafTeams;
        const selectedCafTeam =
          cafTeams.find((t) => t.id === cafFocusTeamId) || cafTeams[0] || focusTeam;
        const selectedCafFixtures = getTeamAllInternationalFixtures(
          nationalTeam,
          selectedCafTeam.id
        );

        const ofcTeams = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'OFC');
        const selectedOfcTeam =
          ofcTeams.find((t) => t.id === oceaniaFocusTeamId) || ofcTeams[0] || focusTeam;
        const selectedOfcFixtures = getTeamAllInternationalFixtures(
          nationalTeam,
          selectedOfcTeam.id
        );

        const concacafTeams = NATIONAL_TEAMS_CATALOG.filter(
          (t) => t.confederation === 'CONCACAF'
        );
        const selectedConcacafTeam =
          concacafTeams.find((t) => t.id === concacafFocusTeamId) ||
          concacafTeams[0] ||
          focusTeam;
        const selectedConcacafFixtures = getTeamAllInternationalFixtures(
          nationalTeam,
          selectedConcacafTeam.id
        );

        const asiaTeams = NATIONAL_TEAMS_CATALOG.filter((t) => t.confederation === 'AFC');
        const filteredAsiaTeams = asiaTeamSearch.trim()
          ? asiaTeams.filter(
              (t) =>
                t.name.toLowerCase().includes(asiaTeamSearch.trim().toLowerCase()) ||
                t.code.toLowerCase().includes(asiaTeamSearch.trim().toLowerCase())
            )
          : asiaTeams;
        const selectedAsiaTeam =
          asiaTeams.find((t) => t.id === asiaFocusTeamId) || asiaTeams[0] || focusTeam;
        const selectedAsiaFixtures = getTeamAllInternationalFixtures(
          nationalTeam,
          selectedAsiaTeam.id
        );

        const activeEntry = currentDate
          ? OFFICIAL_SELECOES_FIFA_CALENDAR_2026_2038.find(
              (e) => currentDate >= e.startDate && currentDate <= e.endDate
            ) || null
          : null;
        const nextEntry = currentDate
          ? OFFICIAL_SELECOES_FIFA_CALENDAR_2026_2038.find(
              (e) => e.startDate > currentDate
            ) || null
          : null;

        const activeOfcEntry = currentDate
          ? OFFICIAL_OCEANIA_CALENDAR_2026_2038.find(
              (e) => currentDate >= e.startDate && currentDate <= e.endDate
            ) || null
          : null;
        const nextOfcEntry = currentDate
          ? OFFICIAL_OCEANIA_CALENDAR_2026_2038.find(
              (e) => e.startDate > currentDate
            ) || null
          : null;

        const activeConcacafEntry = currentDate
          ? OFFICIAL_CONCACAF_CALENDAR_2026_2038.find(
              (e) => currentDate >= e.startDate && currentDate <= e.endDate
            ) || null
          : null;
        const nextConcacafEntry = currentDate
          ? OFFICIAL_CONCACAF_CALENDAR_2026_2038.find(
              (e) => e.startDate > currentDate
            ) || null
          : null;

        const activeAsiaEntry = currentDate
          ? OFFICIAL_ASIA_CALENDAR_2026_2038.find(
              (e) => currentDate >= e.startDate && currentDate <= e.endDate
            ) || null
          : null;
        const nextAsiaEntry = currentDate
          ? OFFICIAL_ASIA_CALENDAR_2026_2038.find(
              (e) => e.startDate > currentDate
            ) || null
          : null;

        const activeConmebolEntry = currentDate
          ? OFFICIAL_SOUTH_AMERICA_CALENDAR_2026_2038.find(
              (e) => currentDate >= e.startDate && currentDate <= e.endDate
            ) || null
          : null;
        const nextConmebolEntry = currentDate
          ? OFFICIAL_SOUTH_AMERICA_CALENDAR_2026_2038.find(
              (e) => e.startDate > currentDate
            ) || null
          : null;

        const activeCafEntry = currentDate
          ? OFFICIAL_AFRICA_CALENDAR_2026_2038.find(
              (e) => currentDate >= e.startDate && currentDate <= e.endDate
            ) || null
          : null;
        const nextCafEntry = currentDate
          ? OFFICIAL_AFRICA_CALENDAR_2026_2038.find(
              (e) => e.startDate > currentDate
            ) || null
          : null;

        const activeUefaEntry = currentDate
          ? OFFICIAL_EUROPE_CALENDAR_2026_2038.find(
              (e) => currentDate >= e.startDate && currentDate <= e.endDate
            ) || null
          : null;
        const nextUefaEntry = currentDate
          ? OFFICIAL_EUROPE_CALENDAR_2026_2038.find(
              (e) => e.startDate > currentDate
            ) || null
          : null;

        const getCategoryBadgeStyle = (cat: OfficialSelecaoFifaCalendarEntry['category']) => {
          switch (cat) {
            case 'Amistosos':
              return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
            case 'Data Fifa':
              return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
            case 'Copa do Mundo':
              return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
            case 'Copas Continentais':
              return 'bg-violet-500/15 text-violet-300 border-violet-500/40';
          }
        };

        const getOfcCategoryBadgeStyle = (cat: OfficialOceaniaCalendarEntry['category']) => {
          switch (cat) {
            case 'Amistosos':
              return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
            case 'Eliminatórias Oceania':
              return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40';
            case 'Copa da Oceania':
              return 'bg-violet-500/15 text-violet-300 border-violet-500/40';
            case 'Eliminatórias Copa do Mundo':
              return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
            case 'Repescagem & Amistosos':
              return 'bg-orange-500/15 text-orange-300 border-orange-500/40';
            case 'Copa do Mundo':
              return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
          }
        };

        const getConcacafCategoryBadgeStyle = (
          cat: OfficialConcacafCalendarEntry['category']
        ) => {
          switch (cat) {
            case 'Liga das Nações':
              return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
            case 'Copa Ouro':
              return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
            case 'Eliminatórias Copa do Mundo':
              return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
            case 'Copa América':
              return 'bg-violet-500/15 text-violet-300 border-violet-500/40';
            case 'Repescagem & Amistosos':
              return 'bg-orange-500/15 text-orange-300 border-orange-500/40';
            case 'Copa do Mundo':
              return 'bg-yellow-500/15 text-yellow-200 border-yellow-400/50';
          }
        };

        const getAsiaCategoryBadgeStyle = (cat: OfficialAsiaCalendarEntry['category']) => {
          switch (cat) {
            case 'Amistosos':
              return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
            case 'Eliminatórias Copa da Ásia':
              return 'bg-rose-500/15 text-rose-300 border-rose-500/40';
            case 'Copa da Ásia':
              return 'bg-violet-500/15 text-violet-300 border-violet-500/40';
            case 'Eliminatórias Copa do Mundo':
              return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
            case 'Play-Off AFC':
              return 'bg-orange-500/15 text-orange-300 border-orange-500/40';
            case 'Copa do Mundo':
              return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
          }
        };

        const getYearHeaderTag = (y: number) => {
          if (y === 2026) return 'Ano de Copa do Mundo FIFA (EUA, México e Canadá)';
          if (y === 2030) return 'Ano de Copa do Mundo FIFA do Centenário';
          if (y % 4 === 2) return `Ano de Copa do Mundo FIFA ${y} (48 Seleções)`;
          if (y % 4 === 0)
            return `Ano de Copas Continentais ${y} (Copa América c/ 6 CONCACAF, Euro, CAN, Ásia 32 sel. & OFC)`;
          return `Copa Ouro CONCACAF ${y} (Bienal), Eliminatórias & Liga das Nações`;
        };

        const getOfcYearHeaderTag = (y: number) => {
          if (y === 2026) return 'Pós-Copa do Mundo · Amistosos Internacionais (Set/Out & Nov)';
          if (y % 4 === 3) return `Eliminatórias para a Copa da Oceania ${y + 1} (11 seleções em turno único)`;
          if (y % 4 === 0) return `Ano de Copa da Oceania ${y} (8 melhores em 2 grupos de 4 + Semi/Final)`;
          if (y % 4 === 1) return `Eliminatórias OFC para a Copa do Mundo ${y + 1} (1º Vaga Direta · 2º Repescagem)`;
          return `Ano de Copa do Mundo ${y} (Repescagem, Pré-Copa & Ciclo Pós-Copa)`;
        };

        const getConcacafYearHeaderTag = (y: number) => {
          if (y === 2026)
            return 'Copa do Mundo em Casa (EUA/MEX/CAN) + Abertura Liga das Nações 2026/27 (Set/Out & Nov)';
          if (y % 4 === 3)
            return `Finais Liga das Nações ${y - 1}/${String(y).slice(-2)} · Copa Ouro ${y} (16 seleções) · Início Eliminatórias ${y + 3}`;
          if (y % 4 === 0)
            return `2ª Fase & Fase Final Eliminatórias · 6 Convidados Copa América ${y} · Liga das Nações ${y}/${String(y + 1).slice(-2)}`;
          if (y % 4 === 1)
            return `Finais Liga das Nações ${y - 1}/${String(y).slice(-2)} · Copa Ouro ${y} · Conclusão Eliminatórias & Play-In ${y + 1}`;
          return `Copa do Mundo FIFA ${y} (6+ vagas) · Abertura Liga das Nações ${y}/${String(y + 1).slice(-2)}`;
        };

        const getAsiaYearHeaderTag = (y: number) => {
          if (y === 2026)
            return 'Pós-Copa do Mundo · 6 Amistosos Internacionais (4 em Set/Out + 2 em Nov)';
          if (y % 4 === 3)
            return `Eliminatórias da Copa da Ásia ${y + 1} (48 seleções · 4×12 · 10 de 11 jogos no ano)`;
          if (y % 4 === 0)
            return `Rodada Final Elim. + Copa da Ásia ${y} (32 seleções: 8×4 + Mata-Mata) + Abertura Elim. Copa ${y + 2}`;
          if (y % 4 === 1)
            return `Conclusão Elim. Copa ${y + 1} (8×6 · 8 vagas diretas) + Play-Off AFC (8 segundos · 3 jogos) + Amistosos`;
          return `Amistosos Pré-Copa + Copa do Mundo FIFA ${y} (8+ vagas AFC) + Amistosos Pós-Copa`;
        };

        const getConmebolCategoryBadgeStyle = (
          cat: OfficialSouthAmericaCalendarEntry['category']
        ) => {
          switch (cat) {
            case 'Amistosos':
              return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
            case 'Eliminatórias Copa do Mundo':
              return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
            case 'Copa América':
              return 'bg-yellow-500/15 text-yellow-200 border-yellow-400/50';
            case 'Repescagem & Amistosos':
              return 'bg-orange-500/15 text-orange-300 border-orange-500/40';
            case 'Copa do Mundo':
              return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
          }
        };

        const getConmebolYearHeaderTag = (y: number) => {
          if (y === 2026)
            return 'Pós-Copa do Mundo · Amistosos (3 em Set/Out + 2 em Nov)';
          if (y % 4 === 3)
            return `Eliminatórias Sul-Americanas · 1º Turno (Rodadas 1 a 9 · 2+2+3+2 jogos)`;
          if (y % 4 === 0)
            return `Copa América ${y} (16 Seleções · 4×4 + Mata-Mata) + Amistosos (2+1+3+2)`;
          if (y % 4 === 1)
            return `Eliminatórias Sul-Americanas · 2º Turno (Rodadas 10 a 18 · Top 6 Copa + 7º Repescagem)`;
          return `Repescagem Mundial (Mar) · Amistoso Pré-Copa (1) · Copa do Mundo ${y} · Amistosos Pós-Copa`;
        };

        const getCafCategoryBadgeStyle = (cat: OfficialAfricaCalendarEntry['category']) => {
          switch (cat) {
            case 'Amistosos':
              return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
            case 'Eliminatórias Copa Africana':
              return 'bg-lime-500/15 text-lime-300 border-lime-500/40';
            case 'Copa Africana':
              return 'bg-violet-500/15 text-violet-300 border-violet-500/40';
            case 'Eliminatórias Copa do Mundo':
              return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
            case 'Repescagem CAF':
              return 'bg-orange-500/15 text-orange-300 border-orange-500/40';
            case 'Copa do Mundo':
              return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
          }
        };

        const getCafYearHeaderTag = (y: number) => {
          if (y === 2026)
            return 'Abertura Eliminatórias Copa Africana 2028 (56 sel. · 8×7 · Rodadas 1–4)';
          if (y % 4 === 3)
            return `Conclusão Eliminatórias Copa Africana ${y + 1} (Rodadas 5–14 · Top 4/grupo = 32 seleções)`;
          if (y % 4 === 0)
            return `Copa Africana ${y} (32 Sel.${y === 2028 ? ' · UGA/TAN/KEN' : ''}) + Amistosos (2+1+4) + Abertura Elim. Copa ${y + 2} (Nov)`;
          if (y % 4 === 1)
            return `Eliminatórias Copa ${y + 1} (54 sel. · 9×6 · 9 vagas diretas) + Play-Off CAF em Nov (4 melhores 2ºs)`;
          return `Amistosos Pré-Copa (2+1) · Copa do Mundo ${y} (9+ vagas CAF) · Abertura Elim. CAN ${y + 2}`;
        };

        const getUefaCategoryBadgeStyle = (cat: OfficialEuropeCalendarEntry['category']) => {
          switch (cat) {
            case 'UEFA Nations League':
              return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
            case 'Eliminatórias Euro':
              return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40';
            case 'Eurocopa':
              return 'bg-violet-500/15 text-violet-300 border-violet-500/40';
            case 'Eliminatórias Copa do Mundo':
              return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
            case 'Repescagem UEFA':
              return 'bg-orange-500/15 text-orange-300 border-orange-500/40';
            case 'Finalíssima':
              return 'bg-yellow-500/15 text-yellow-200 border-yellow-400/50';
            case 'Copa do Mundo':
              return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
            case 'Amistosos':
              return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40';
          }
        };

        const getUefaYearHeaderTag = (y: number) => {
          if (y === 2026)
            return 'Finalíssima + Copa do Mundo 2026 + Nations League 2026/27 (Transição 4 Ligas · Fim da Liga D)';
          if (y % 4 === 3)
            return `Nations League QF (Mar) & Final Four (Jun) + Eliminatórias da Eurocopa ${y + 1} (12 Grupos: 6×4 + 6×5)`;
          if (y % 4 === 0)
            return `Play-Off Euro (Mar) + Eurocopa ${y} (24 sel. · 51 jogos${y === 2028 ? ' · UK/IRL' : ''}) + Nova Nations League ${y}/${String(y + 1).slice(-2)} (3 Ligas · Suíço)`;
          if (y % 4 === 1)
            return `Nations League QF & Final Four + Eliminatórias Copa ${y + 1} (Liga 2 Mar–Set · Liga 1 3×12 Set–Nov)`;
          return `Play-Off UEFA (Mar · 16 sel. → 4 vagas) + Copa do Mundo ${y}${y === 2030 ? ' (ESP/POR Sedes · Bernabéu)' : ''} + Nations League ${y}/${String(y + 1).slice(-2)}`;
        };

        return (
          <div className="space-y-5">
            {/* Switcher between General FIFA, CONMEBOL, UEFA, CAF, CONCACAF, Asia AFC, and Oceania OFC (2026-2038) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-3">
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setFifaCalRegionView('GENERAL');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    fifaCalRegionView === 'GENERAL'
                      ? 'bg-emerald-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Calendário FIFA Geral (2026–2038)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setFifaCalRegionView('CONMEBOL');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    fifaCalRegionView === 'CONMEBOL'
                      ? 'bg-yellow-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>América do Sul · CONMEBOL (2026–2038)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setFifaCalRegionView('UEFA');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    fifaCalRegionView === 'UEFA'
                      ? 'bg-sky-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Europa · UEFA (2026–2038)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setFifaCalRegionView('CAF');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    fifaCalRegionView === 'CAF'
                      ? 'bg-lime-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>África · CAF (2026–2038)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setFifaCalRegionView('CONCACAF');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    fifaCalRegionView === 'CONCACAF'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Calendário da CONCACAF (2026–2038)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setFifaCalRegionView('ASIA');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    fifaCalRegionView === 'ASIA'
                      ? 'bg-rose-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Calendário da Ásia · AFC (2026–2038)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setFifaCalRegionView('OCEANIA');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    fifaCalRegionView === 'OCEANIA'
                      ? 'bg-cyan-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Calendário da Oceania · OFC (2026–2038)</span>
                </button>
              </div>

              {fifaCalRegionView === 'UEFA' && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('continentals');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Nations League &amp; Eurocopa (24 Sel.)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('cont_qualifiers');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Elim. Euro (12 Grupos)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('wc_qualifiers');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Elim. Copa UEFA (Ligas 1 &amp; 2)
                  </button>
                </div>
              )}

              {fifaCalRegionView === 'CONMEBOL' && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('wc_qualifiers');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Eliminatórias CONMEBOL (18 Rodadas)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('continentals');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-yellow-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Copa América (16 Sel.)
                  </button>
                </div>
              )}

              {fifaCalRegionView === 'CAF' && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('cont_qualifiers');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-lime-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Elim. Copa Africana (8×7)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('continentals');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-violet-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Copa Africana (32 Sel.)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('wc_qualifiers');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Elim. Copa CAF (9×6 + Play-Off)
                  </button>
                </div>
              )}

              {fifaCalRegionView === 'ASIA' && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('cont_qualifiers');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-rose-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Elim. Copa da Ásia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('continentals');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-violet-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Copa da Ásia (32 Sel.)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('wc_qualifiers');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Elim. Copa do Mundo AFC
                  </button>
                </div>
              )}

              {fifaCalRegionView === 'OCEANIA' && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('cont_qualifiers');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Eliminatórias OFC
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('continentals');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-violet-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Copa da Oceania
                  </button>
                </div>
              )}

              {fifaCalRegionView === 'CONCACAF' && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('wc_qualifiers');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Eliminatórias CONCACAF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('cont_qualifiers');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Liga das Nações
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setWorldSubTab('continentals');
                      switchArea('WORLD');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold cursor-pointer"
                  >
                    Ver Copa Ouro
                  </button>
                </div>
              )}
            </div>

            {fifaCalRegionView === 'GENERAL' ? (
              <>
                {/* Top summary & filter bar */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">
                          Calendário Oficial das Datas FIFA de Seleções (2026–2038)
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                          Programação oficial completa das janelas internacionais, Copas do Mundo (2026, 2030, 2034 e 2038), Copa Ouro bienal (anos ímpares: 2027–2037) e Copas Continentais (2028, 2032 e 2036) — totalmente sincronizada com o calendário dos clubes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setFifaCalYearFilter('ALL');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        fifaCalYearFilter === 'ALL'
                          ? 'bg-emerald-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos (2026–2038)
                    </button>
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setFifaCalYearFilter(y);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          fifaCalYearFilter === y
                            ? 'bg-emerald-400 text-slate-950 font-black'
                            : y === calendarYear
                            ? 'text-amber-300 hover:text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {y}
                        {y === calendarYear ? ' •' : ''}
                      </button>
                    ))}
                  </div>

                  {(activeEntry || nextEntry) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                            {activeEntry ? 'Janela FIFA Ativa Agora' : 'Calendário de Clubes em Curso'}
                          </span>
                          <span className="text-xs font-bold text-white block mt-0.5">
                            {activeEntry
                              ? `${activeEntry.periodLabel} ${activeEntry.year} · ${activeEntry.label}`
                              : 'Nenhuma janela Data FIFA aberta na data atual'}
                          </span>
                        </div>
                        {activeEntry && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black whitespace-nowrap shrink-0">
                            EM ANDAMENTO
                          </span>
                        )}
                      </div>

                      {nextEntry && (
                        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                              Próxima Data FIFA Programada
                            </span>
                            <span className="text-xs font-bold text-white block mt-0.5">
                              {nextEntry.periodLabel} {nextEntry.year} · {nextEntry.label}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold whitespace-nowrap shrink-0">
                            {nextEntry.gamesLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Annual sections */}
                <div className="space-y-4">
                  {visibleYears.map((yr) => {
                    const entries = OFFICIAL_SELECOES_FIFA_CALENDAR_2026_2038.filter(
                      (e) => e.year === yr
                    );
                    const totalFifaGames = entries.reduce(
                      (sum, e) => sum + (e.gamesCount ?? 0),
                      0
                    );
                    const isCurrentSeason = yr === calendarYear;

                    return (
                      <div
                        key={yr}
                        className={`bg-slate-950 border rounded-2xl overflow-hidden ${
                          isCurrentSeason ? 'border-amber-400/50' : 'border-slate-800'
                        }`}
                      >
                        <div className="px-5 py-3.5 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-lg font-black font-mono tabular-nums text-white">
                              {yr}
                            </span>
                            {isCurrentSeason && (
                              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
                                TEMPORADA ATUAL
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-400">
                              {getYearHeaderTag(yr)}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-emerald-300 font-bold">
                            {totalFifaGames} jogos em janelas FIFA ({entries.length} eventos)
                          </span>
                        </div>

                        <div className="divide-y divide-slate-800/70">
                          {entries.map((entry) => {
                            const isLive = Boolean(
                              currentDate &&
                                currentDate >= entry.startDate &&
                                currentDate <= entry.endDate
                            );
                            const isPast = Boolean(currentDate && currentDate > entry.endDate);
                            const windowFixtures = focusAllFixtures.filter(
                              (f) =>
                                typeof f.date === 'string' &&
                                f.date >= entry.startDate &&
                                f.date <= entry.endDate
                            );

                            return (
                              <div
                                key={entry.id}
                                className={`p-4 sm:px-5 transition-colors ${
                                  isLive
                                    ? 'bg-emerald-500/10'
                                    : isPast
                                    ? 'bg-slate-950/60 opacity-85'
                                    : 'hover:bg-slate-900/40'
                                }`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wide ${getCategoryBadgeStyle(
                                          entry.category
                                        )}`}
                                      >
                                        {entry.category}
                                      </span>
                                      <span className="text-xs font-black text-amber-300">
                                        {entry.periodLabel}
                                      </span>
                                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                        ({formatShortDate(entry.startDate)} → {formatShortDate(entry.endDate)})
                                      </span>
                                      {isLive && (
                                        <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 text-[10px] font-black">
                                          EM ANDAMENTO
                                        </span>
                                      )}
                                      {isPast && !isLive && (
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                                          Concluída
                                        </span>
                                      )}
                                    </div>

                                    <h3 className="text-sm font-bold text-white">
                                      {entry.label}
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                      {entry.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200 whitespace-nowrap">
                                      {entry.gamesLabel}
                                    </span>
                                  </div>
                                </div>

                                {windowFixtures.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-wrap gap-2">
                                    {windowFixtures.map((wf) => {
                                      const isHome = wf.homeTeamId === focusTeamId;
                                      const opp = getNationalTeamById(
                                        isHome ? wf.awayTeamId : wf.homeTeamId
                                      );
                                      const myGoals = isHome ? wf.homeScore : wf.awayScore;
                                      const oppGoals = isHome ? wf.awayScore : wf.homeScore;
                                      return (
                                        <div
                                          key={wf.id}
                                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                                        >
                                          <span className="font-mono text-slate-400">
                                            {wf.date ? formatShortDate(wf.date) : `R${wf.triggerRound}`}
                                          </span>
                                          <span className="font-bold text-white">
                                            {focusTeam.code} {wf.played ? `${myGoals}–${oppGoals}` : 'vs'} {opp.code}
                                          </span>
                                          <span className="text-slate-400 truncate max-w-[160px]">
                                            · {wf.competitionName}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : fifaCalRegionView === 'CONMEBOL' ? (
              <>
                {/* CONMEBOL South America Calendar Header + 10 Teams Selector + Copa America 2028 16 Teams + 2026-2038 Year Filters */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">
                          Calendário Oficial da América do Sul — CONMEBOL (2026–2038)
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                          Eliminatórias Sul-Americanas com as 10 seleções em grupo único de ida e volta (18 rodadas: 9 em 2027/31/35 e 9 em 2029/33/37 — Top 6 classificados diretos para a Copa do Mundo e 7º colocado na Repescagem), Copa América em 2028/32/36 com 16 seleções (4 grupos de 4 + Quartas, Semifinal e Final em jogo único) e janelas oficiais de amistosos (3 jogos em Set/Out, 2 em Nov, 2 em Mar e 1 em Jun).
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setWorldInspectTeamId(selectedConmebolTeam.id);
                        setWorldSubTab('nations');
                        switchArea('WORLD');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-yellow-300 cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir {selectedConmebolTeam.name}</span>
                    </button>
                  </div>

                  {/* 10 CONMEBOL National Teams */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-yellow-300">
                        {conmebolTeams.length} Seleções da América do Sul · CONMEBOL (clique para filtrar os jogos abaixo)
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Em foco: <strong className="text-white">{selectedConmebolTeam.name}</strong> (Força {selectedConmebolTeam.strength})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {conmebolTeams.map((team) => {
                        const isSelected = team.id === selectedConmebolTeam.id;
                        const isUserTeam = team.id === activeUserTeamId;
                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setConmebolFocusTeamId(team.id);
                            }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-yellow-400 text-slate-950 border-yellow-300 font-black'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                            }`}
                          >
                            <TeamCrest team={team} size="sm" />
                            <span>{team.name}</span>
                            {isUserTeam && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-yellow-300'
                                    : 'bg-yellow-400/20 text-yellow-300'
                                }`}
                              >
                                SUA
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 16 Official Copa America 2028 Participants */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 block">
                      16 Seleções Oficiais da Copa América 2028 (10 CONMEBOL + 6 Convidados: EUA, México, Canadá, Rússia, Costa Rica e Jamaica)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COPA_AMERICA_2028_OFFICIAL_PARTICIPANTS.map((tid) => {
                        const team = getNationalTeamById(tid);
                        const isGuest = team.confederation !== 'CONMEBOL';
                        return (
                          <button
                            key={tid}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setWorldInspectTeamId(tid);
                              setWorldSubTab('nations');
                              switchArea('WORLD');
                            }}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                              isGuest
                                ? 'bg-indigo-950/50 border-indigo-500/35 text-indigo-200 hover:bg-indigo-900/50'
                                : 'bg-slate-900/70 border-slate-800 text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <TeamCrest team={team} size="sm" />
                            <span>{team.name}</span>
                            {isGuest && (
                              <span className="text-[9px] font-black text-indigo-300 uppercase">
                                Conv.
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year Filters 2026..2038 */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setConmebolCalYearFilter('ALL');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        conmebolCalYearFilter === 'ALL'
                          ? 'bg-yellow-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas (2026–2038)
                    </button>
                    {conmebolYears.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setConmebolCalYearFilter(y);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          conmebolCalYearFilter === y
                            ? 'bg-yellow-400 text-slate-950 font-black'
                            : y === calendarYear
                            ? 'text-emerald-300 hover:text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {y}
                        {y === calendarYear ? ' •' : ''}
                      </button>
                    ))}
                  </div>

                  {(activeConmebolEntry || nextConmebolEntry) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 block">
                            {activeConmebolEntry ? 'Etapa CONMEBOL Ativa Agora' : 'Ciclo Sul-Americano em Andamento'}
                          </span>
                          <span className="text-xs font-bold text-white block mt-0.5">
                            {activeConmebolEntry
                              ? `${activeConmebolEntry.year} · ${activeConmebolEntry.label}`
                              : `Temporada ${calendarYear} · Próximos compromissos da CONMEBOL`}
                          </span>
                        </div>
                        {activeConmebolEntry && (
                          <span className="px-2.5 py-1 rounded-full bg-yellow-400 text-slate-950 text-[10px] font-black whitespace-nowrap shrink-0">
                            EM ANDAMENTO
                          </span>
                        )}
                      </div>

                      {nextConmebolEntry && (
                        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                              Próximo Marco CONMEBOL Programado
                            </span>
                            <span className="text-xs font-bold text-white block mt-0.5">
                              {nextConmebolEntry.periodLabel} ({nextConmebolEntry.year}) · {nextConmebolEntry.label}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold whitespace-nowrap shrink-0">
                            {nextConmebolEntry.gamesLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CONMEBOL Annual Schedule Cards 2026..2038 */}
                <div className="space-y-4">
                  {visibleConmebolYears.map((yr) => {
                    const entries = OFFICIAL_SOUTH_AMERICA_CALENDAR_2026_2038.filter(
                      (e) => e.year === yr
                    );
                    const isCurrentSeason = yr === calendarYear;
                    const seasonConmebolFixtures = selectedConmebolFixtures.filter(
                      (f) => typeof f.date === 'string' && f.date.startsWith(`${yr}-`)
                    );

                    return (
                      <div
                        key={yr}
                        className={`bg-slate-950 border rounded-2xl overflow-hidden ${
                          isCurrentSeason ? 'border-yellow-400/50' : 'border-slate-800'
                        }`}
                      >
                        <div className="px-5 py-3.5 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-lg font-black font-mono tabular-nums text-white">
                              {yr}
                            </span>
                            {isCurrentSeason && (
                              <span className="px-2 py-0.5 rounded bg-yellow-400 text-slate-950 text-[10px] font-black">
                                TEMPORADA ATUAL
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-400">
                              {getConmebolYearHeaderTag(yr)}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-yellow-300 font-bold">
                            {entries.length} {entries.length === 1 ? 'evento' : 'eventos'}
                            {seasonConmebolFixtures.length > 0
                              ? ` · ${seasonConmebolFixtures.length} jogos de ${selectedConmebolTeam.code} agendados`
                              : ''}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-800/70">
                          {entries.map((entry) => {
                            const isLive = Boolean(
                              currentDate &&
                                currentDate >= entry.startDate &&
                                currentDate <= entry.endDate
                            );
                            const isPast = Boolean(currentDate && currentDate > entry.endDate);
                            const windowFixtures = selectedConmebolFixtures.filter(
                              (f) =>
                                typeof f.date === 'string' &&
                                f.date >= entry.startDate &&
                                f.date <= entry.endDate
                            );

                            return (
                              <div
                                key={entry.id}
                                className={`p-4 sm:px-5 transition-colors ${
                                  isLive
                                    ? 'bg-yellow-500/10'
                                    : isPast
                                    ? 'bg-slate-950/60 opacity-85'
                                    : 'hover:bg-slate-900/40'
                                }`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wide ${getConmebolCategoryBadgeStyle(
                                          entry.category
                                        )}`}
                                      >
                                        {entry.category}
                                      </span>
                                      <span className="text-xs font-black text-yellow-300">
                                        {entry.periodLabel}
                                      </span>
                                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                        ({formatShortDate(entry.startDate)} → {formatShortDate(entry.endDate)})
                                      </span>
                                      {isLive && (
                                        <span className="px-2 py-0.5 rounded bg-yellow-400 text-slate-950 text-[10px] font-black">
                                          EM ANDAMENTO
                                        </span>
                                      )}
                                      {isPast && !isLive && (
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                                          Concluída
                                        </span>
                                      )}
                                    </div>

                                    <h3 className="text-sm font-bold text-white">
                                      {entry.label}
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                      {entry.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200 whitespace-nowrap">
                                      {entry.gamesLabel}
                                    </span>
                                  </div>
                                </div>

                                {windowFixtures.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-wrap gap-2">
                                    {windowFixtures.map((wf) => {
                                      const isHome = wf.homeTeamId === selectedConmebolTeam.id;
                                      const opp = getNationalTeamById(
                                        isHome ? wf.awayTeamId : wf.homeTeamId
                                      );
                                      const myGoals = isHome ? wf.homeScore : wf.awayScore;
                                      const oppGoals = isHome ? wf.awayScore : wf.homeScore;
                                      return (
                                        <div
                                          key={wf.id}
                                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                                        >
                                          <span className="font-mono text-slate-400">
                                            {wf.date ? formatShortDate(wf.date) : `R${wf.triggerRound}`}
                                          </span>
                                          <span className="font-bold text-white">
                                            {selectedConmebolTeam.code}{' '}
                                            {wf.played ? `${myGoals}–${oppGoals}` : 'vs'} {opp.code}
                                          </span>
                                          <span className="text-slate-400 truncate max-w-[200px]">
                                            · {wf.competitionName}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : fifaCalRegionView === 'CONCACAF' ? (
              <>
                {/* CONCACAF Calendar Header + 16 National Teams Selector + 2026-2038 Year Filters */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">
                          Calendário Oficial da CONCACAF — Ciclo 2026–2030 &amp; Projeção até 2038
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                          Ciclo oficial anunciado pela CONCACAF: Liga das Nações bienal (2026/27, 2028/29... com Finais das Ligas A, B e C), Copa Ouro bienal em anos ímpares (17/06–11/07 em 2027, 2029, 2031, 2033, 2035 e 2037 com 16 seleções), 6 convidados na Copa América (2028, 2032, 2036) e Eliminatórias da Copa do Mundo (6 vagas diretas + Play-In Intercontinental).
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setWorldInspectTeamId(selectedConcacafTeam.id);
                        setWorldSubTab('nations');
                        switchArea('WORLD');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir {selectedConcacafTeam.name}</span>
                    </button>
                  </div>

                  {/* 16 CONCACAF National Teams */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                        {concacafTeams.length} Seleções da CONCACAF (clique para filtrar os jogos na tabela abaixo)
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Seleção em foco: <strong className="text-white">{selectedConcacafTeam.name}</strong> (Força {selectedConcacafTeam.strength})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {concacafTeams.map((team) => {
                        const isSelected = team.id === selectedConcacafTeam.id;
                        const isUserTeam = team.id === activeUserTeamId;
                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setConcacafFocusTeamId(team.id);
                            }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                            }`}
                          >
                            <TeamCrest team={team} size="sm" />
                            <span>{team.name}</span>
                            {isUserTeam && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-amber-300'
                                    : 'bg-amber-400/20 text-amber-300'
                                }`}
                              >
                                SUA
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year Filters 2026..2038 */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setConcacafCalYearFilter('ALL');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        concacafCalYearFilter === 'ALL'
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas (2026–2038)
                    </button>
                    {concacafYears.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setConcacafCalYearFilter(y);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          concacafCalYearFilter === y
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : y === calendarYear
                            ? 'text-emerald-300 hover:text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {y}
                        {y === calendarYear ? ' •' : ''}
                      </button>
                    ))}
                  </div>

                  {(activeConcacafEntry || nextConcacafEntry) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                            {activeConcacafEntry ? 'Etapa CONCACAF Ativa Agora' : 'Ciclo CONCACAF em Andamento'}
                          </span>
                          <span className="text-xs font-bold text-white block mt-0.5">
                            {activeConcacafEntry
                              ? `${activeConcacafEntry.year} · ${activeConcacafEntry.label}`
                              : `Temporada ${calendarYear} · Próximos compromissos da CONCACAF`}
                          </span>
                        </div>
                        {activeConcacafEntry && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black whitespace-nowrap shrink-0">
                            EM ANDAMENTO
                          </span>
                        )}
                      </div>

                      {nextConcacafEntry && (
                        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                              Próximo Marco CONCACAF Programado
                            </span>
                            <span className="text-xs font-bold text-white block mt-0.5">
                              {nextConcacafEntry.periodLabel} ({nextConcacafEntry.year}) · {nextConcacafEntry.label}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold whitespace-nowrap shrink-0">
                            {nextConcacafEntry.gamesLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CONCACAF Annual Schedule Cards 2026..2038 */}
                <div className="space-y-4">
                  {visibleConcacafYears.map((yr) => {
                    const entries = OFFICIAL_CONCACAF_CALENDAR_2026_2038.filter(
                      (e) => e.year === yr
                    );
                    const isCurrentSeason = yr === calendarYear;
                    const seasonConcacafFixtures = selectedConcacafFixtures.filter(
                      (f) => typeof f.date === 'string' && f.date.startsWith(`${yr}-`)
                    );

                    return (
                      <div
                        key={yr}
                        className={`bg-slate-950 border rounded-2xl overflow-hidden ${
                          isCurrentSeason ? 'border-amber-400/50' : 'border-slate-800'
                        }`}
                      >
                        <div className="px-5 py-3.5 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-lg font-black font-mono tabular-nums text-white">
                              {yr}
                            </span>
                            {isCurrentSeason && (
                              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
                                TEMPORADA ATUAL
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-400">
                              {getConcacafYearHeaderTag(yr)}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-amber-300 font-bold">
                            {entries.length} {entries.length === 1 ? 'competição' : 'eventos'}
                            {seasonConcacafFixtures.length > 0
                              ? ` · ${seasonConcacafFixtures.length} jogos de ${selectedConcacafTeam.code} agendados`
                              : ''}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-800/70">
                          {entries.map((entry) => {
                            const isLive = Boolean(
                              currentDate &&
                                currentDate >= entry.startDate &&
                                currentDate <= entry.endDate
                            );
                            const isPast = Boolean(currentDate && currentDate > entry.endDate);
                            const windowFixtures = selectedConcacafFixtures.filter(
                              (f) =>
                                typeof f.date === 'string' &&
                                f.date >= entry.startDate &&
                                f.date <= entry.endDate
                            );

                            return (
                              <div
                                key={entry.id}
                                className={`p-4 sm:px-5 transition-colors ${
                                  isLive
                                    ? 'bg-amber-500/10'
                                    : isPast
                                    ? 'bg-slate-950/60 opacity-85'
                                    : 'hover:bg-slate-900/40'
                                }`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wide ${getConcacafCategoryBadgeStyle(
                                          entry.category
                                        )}`}
                                      >
                                        {entry.category}
                                      </span>
                                      <span className="text-xs font-black text-amber-300">
                                        {entry.periodLabel}
                                      </span>
                                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                        ({formatShortDate(entry.startDate)} → {formatShortDate(entry.endDate)})
                                      </span>
                                      {isLive && (
                                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
                                          EM ANDAMENTO
                                        </span>
                                      )}
                                      {isPast && !isLive && (
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                                          Concluída
                                        </span>
                                      )}
                                    </div>

                                    <h3 className="text-sm font-bold text-white">
                                      {entry.label}
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                      {entry.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200 whitespace-nowrap">
                                      {entry.gamesLabel}
                                    </span>
                                  </div>
                                </div>

                                {windowFixtures.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-wrap gap-2">
                                    {windowFixtures.map((wf) => {
                                      const isHome = wf.homeTeamId === selectedConcacafTeam.id;
                                      const opp = getNationalTeamById(
                                        isHome ? wf.awayTeamId : wf.homeTeamId
                                      );
                                      const myGoals = isHome ? wf.homeScore : wf.awayScore;
                                      const oppGoals = isHome ? wf.awayScore : wf.homeScore;
                                      return (
                                        <div
                                          key={wf.id}
                                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                                        >
                                          <span className="font-mono text-slate-400">
                                            {wf.date ? formatShortDate(wf.date) : `R${wf.triggerRound}`}
                                          </span>
                                          <span className="font-bold text-white">
                                            {selectedConcacafTeam.code}{' '}
                                            {wf.played ? `${myGoals}–${oppGoals}` : 'vs'} {opp.code}
                                          </span>
                                          <span className="text-slate-400 truncate max-w-[180px]">
                                            · {wf.competitionName}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : fifaCalRegionView === 'UEFA' ? (
              <>
                {/* UEFA Europe Calendar Header + 54 National Teams Selector + 2026-2038 Year Filters */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 shrink-0">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">
                          Calendário Oficial da Europa — UEFA (54 Seleções · 2026–2038)
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
                          Ciclo completo das 54 seleções europeias: UEFA Nations League bienal (2026/27 transição em 4 Ligas → 2028/29+ reformada em 3 Ligas A/B/C com 18 seleções em 3×6 Sistema Suíço · Quartas ida/volta em Março + Final Four em Junho), Eliminatórias da Eurocopa (12 grupos: 6×4 Set–Nov protegendo os 8 quadrifinalistas da Nations + 6×5 Mar–Nov · 20 diretos + proteção anfitriões 2028 + Repescagem em Março = 24 seleções), Eurocopa (24 seleções · 51 jogos · 09/06–09/07 · Final em Wembley 2028) e Eliminatórias Europeias da Copa (Liga 1 3×12 + Liga 2 3×6 + Play-Off UEFA 16 seleções → 16 vagas, com Espanha e Portugal sedes em 2030).
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setWorldInspectTeamId(selectedUefaTeam.id);
                        setWorldSubTab('nations');
                        switchArea('WORLD');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir {selectedUefaTeam.name}</span>
                    </button>
                  </div>

                  {/* 54 UEFA National Teams */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-sky-300">
                        {uefaTeams.length} Seleções da Europa · UEFA (Anfitriões Euro 2028 &amp; Sedes Copa 2030)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={uefaTeamSearch}
                            onChange={(e) => setUefaTeamSearch(e.target.value)}
                            placeholder="Buscar seleção UEFA..."
                            className="pl-7 pr-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 w-44"
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          Em foco: <strong className="text-white">{selectedUefaTeam.name}</strong> (Força {selectedUefaTeam.strength})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                      {filteredUefaTeams.map((team) => {
                        const isSelected = team.id === selectedUefaTeam.id;
                        const isUserTeam = team.id === activeUserTeamId;
                        const isEuroHost = euro2028CohostSet.has(team.id);
                        const isWcHost = wc2030UefaCohostSet.has(team.id);
                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setUefaFocusTeamId(team.id);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-sky-400 text-slate-950 border-sky-300 font-black'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                            }`}
                          >
                            <TeamCrest team={team} size="sm" />
                            <span>{team.name}</span>
                            {isEuroHost && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-violet-300'
                                    : 'bg-violet-400/20 text-violet-300'
                                }`}
                              >
                                EURO 28
                              </span>
                            )}
                            {isWcHost && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-amber-300'
                                    : 'bg-amber-400/20 text-amber-300'
                                }`}
                              >
                                COPA 30
                              </span>
                            )}
                            {isUserTeam && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-sky-300'
                                    : 'bg-sky-400/20 text-sky-300'
                                }`}
                              >
                                SUA
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year Filters 2026..2038 */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setUefaCalYearFilter('ALL');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        uefaCalYearFilter === 'ALL'
                          ? 'bg-sky-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas (2026–2038)
                    </button>
                    {uefaYears.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setUefaCalYearFilter(y);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          uefaCalYearFilter === y
                            ? 'bg-sky-400 text-slate-950 font-black'
                            : y === calendarYear
                            ? 'text-emerald-300 hover:text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {y}
                        {y === calendarYear ? ' •' : ''}
                      </button>
                    ))}
                  </div>

                  {(activeUefaEntry || nextUefaEntry) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                            {activeUefaEntry ? 'Etapa UEFA Ativa Agora' : 'Ciclo Europeu em Andamento'}
                          </span>
                          <span className="text-xs font-bold text-white block mt-0.5">
                            {activeUefaEntry
                              ? `${activeUefaEntry.year} · ${activeUefaEntry.label}`
                              : `Temporada ${calendarYear} · Próximos compromissos da Europa`}
                          </span>
                        </div>
                        {activeUefaEntry && (
                          <span className="px-2.5 py-1 rounded-full bg-sky-400 text-slate-950 text-[10px] font-black whitespace-nowrap shrink-0">
                            EM ANDAMENTO
                          </span>
                        )}
                      </div>

                      {nextUefaEntry && (
                        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                              Próximo Marco UEFA Programado
                            </span>
                            <span className="text-xs font-bold text-white block mt-0.5">
                              {nextUefaEntry.periodLabel} ({nextUefaEntry.year}) · {nextUefaEntry.label}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold whitespace-nowrap shrink-0">
                            {nextUefaEntry.gamesLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* UEFA Annual Schedule Cards 2026..2038 */}
                <div className="space-y-4">
                  {visibleUefaYears.map((yr) => {
                    const entries = OFFICIAL_EUROPE_CALENDAR_2026_2038.filter(
                      (e) => e.year === yr
                    );
                    const isCurrentSeason = yr === calendarYear;
                    const seasonUefaFixtures = selectedUefaFixtures.filter(
                      (f) => typeof f.date === 'string' && f.date.startsWith(`${yr}-`)
                    );

                    return (
                      <div
                        key={yr}
                        className={`bg-slate-950 border rounded-2xl overflow-hidden ${
                          isCurrentSeason ? 'border-sky-400/50' : 'border-slate-800'
                        }`}
                      >
                        <div className="px-5 py-3.5 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-lg font-black font-mono tabular-nums text-white">
                              {yr}
                            </span>
                            {isCurrentSeason && (
                              <span className="px-2 py-0.5 rounded bg-sky-400 text-slate-950 text-[10px] font-black">
                                TEMPORADA ATUAL
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-400">
                              {getUefaYearHeaderTag(yr)}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-sky-300 font-bold">
                            {entries.length} {entries.length === 1 ? 'evento' : 'eventos'}
                            {seasonUefaFixtures.length > 0
                              ? ` · ${seasonUefaFixtures.length} jogos de ${selectedUefaTeam.code} agendados`
                              : ''}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-800/70">
                          {entries.map((entry) => {
                            const isLive = Boolean(
                              currentDate &&
                                currentDate >= entry.startDate &&
                                currentDate <= entry.endDate
                            );
                            const isPast = Boolean(currentDate && currentDate > entry.endDate);
                            const windowFixtures = selectedUefaFixtures.filter(
                              (f) =>
                                typeof f.date === 'string' &&
                                f.date >= entry.startDate &&
                                f.date <= entry.endDate
                            );

                            return (
                              <div
                                key={entry.id}
                                className={`p-4 sm:px-5 transition-colors ${
                                  isLive
                                    ? 'bg-sky-500/10'
                                    : isPast
                                    ? 'bg-slate-950/60 opacity-85'
                                    : 'hover:bg-slate-900/40'
                                }`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wide ${getUefaCategoryBadgeStyle(
                                          entry.category
                                        )}`}
                                      >
                                        {entry.category}
                                      </span>
                                      <span className="text-xs font-black text-sky-300">
                                        {entry.periodLabel}
                                      </span>
                                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                        ({formatShortDate(entry.startDate)} → {formatShortDate(entry.endDate)})
                                      </span>
                                      {isLive && (
                                        <span className="px-2 py-0.5 rounded bg-sky-400 text-slate-950 text-[10px] font-black">
                                          EM ANDAMENTO
                                        </span>
                                      )}
                                      {isPast && !isLive && (
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                                          Concluída
                                        </span>
                                      )}
                                    </div>

                                    <h3 className="text-sm font-bold text-white">
                                      {entry.label}
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                      {entry.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200 whitespace-nowrap">
                                      {entry.gamesLabel}
                                    </span>
                                  </div>
                                </div>

                                {windowFixtures.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-wrap gap-2">
                                    {windowFixtures.map((wf) => {
                                      const isHome = wf.homeTeamId === selectedUefaTeam.id;
                                      const opp = getNationalTeamById(
                                        isHome ? wf.awayTeamId : wf.homeTeamId
                                      );
                                      const myGoals = isHome ? wf.homeScore : wf.awayScore;
                                      const oppGoals = isHome ? wf.awayScore : wf.homeScore;
                                      return (
                                        <div
                                          key={wf.id}
                                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                                        >
                                          <span className="font-mono text-slate-400">
                                            {wf.date ? formatShortDate(wf.date) : `R${wf.triggerRound}`}
                                          </span>
                                          <span className="font-bold text-white">
                                            {selectedUefaTeam.code}{' '}
                                            {wf.played ? `${myGoals}–${oppGoals}` : 'vs'} {opp.code}
                                          </span>
                                          <span className="text-slate-400 truncate max-w-[220px]">
                                            · {wf.competitionName}
                                            {wf.phase.startsWith('Play-Off') || wf.phase.startsWith('Quartas')
                                              ? ` (${wf.phase})`
                                              : ''}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : fifaCalRegionView === 'CAF' ? (
              <>
                {/* CAF Africa Calendar Header + 56 National Teams Selector + 2026-2038 Year Filters */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-lime-500/15 border border-lime-500/30 text-lime-300 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">
                          Calendário Oficial da África — CAF (56 Seleções · 2026–2038)
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                          Ciclo completo das 56 seleções africanas (incluindo Zanzibar e Reunião): Eliminatórias da Copa Africana em 8 grupos de 7 (ida e volta · 14 rodadas / 12 jogos · Top 4 avançam = 32 seleções), Copa Africana (CAN) com 32 seleções (8 grupos de 4 + Oitavas, Quartas, Semis e Final · edição 2028 em Uganda, Tanzânia e Quênia), e Eliminatórias da Copa do Mundo com 54 seleções (sem Zanzibar e Reunião) em 9 grupos de 6 (9 campeões diretos + Play-Off CAF entre os 4 melhores 2ºs por 1 vaga na Repescagem Mundial).
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setWorldInspectTeamId(selectedCafTeam.id);
                        setWorldSubTab('nations');
                        switchArea('WORLD');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-lime-300 cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir {selectedCafTeam.name}</span>
                    </button>
                  </div>

                  {/* 56 CAF National Teams */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-lime-300">
                        {cafTeams.length} Seleções da África · CAF (Top 8 cabeças de chave · Zanzibar &amp; Reunião apenas na CAN)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={cafTeamSearch}
                            onChange={(e) => setCafTeamSearch(e.target.value)}
                            placeholder="Buscar seleção CAF..."
                            className="pl-7 pr-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400 w-44"
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          Em foco: <strong className="text-white">{selectedCafTeam.name}</strong> (Força {selectedCafTeam.strength})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                      {filteredCafTeams.map((team) => {
                        const isSelected = team.id === selectedCafTeam.id;
                        const isUserTeam = team.id === activeUserTeamId;
                        const isSeed = cafTop8SeedIds.has(team.id);
                        const isCohost = cafCohostSet.has(team.id);
                        const isCanOnly = CAF_WCQ_EXCLUDED_IDS.has(team.id);
                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setCafFocusTeamId(team.id);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-lime-400 text-slate-950 border-lime-300 font-black'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                            }`}
                          >
                            <TeamCrest team={team} size="sm" />
                            <span>{team.name}</span>
                            {isSeed && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-amber-300'
                                    : 'bg-amber-400/20 text-amber-300'
                                }`}
                              >
                                TOP 8
                              </span>
                            )}
                            {isCohost && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-violet-300'
                                    : 'bg-violet-400/20 text-violet-300'
                                }`}
                              >
                                SEDE 28
                              </span>
                            )}
                            {isCanOnly && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-sky-300'
                                    : 'bg-sky-400/20 text-sky-300'
                                }`}
                              >
                                SÓ CAN
                              </span>
                            )}
                            {isUserTeam && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-lime-300'
                                    : 'bg-lime-400/20 text-lime-300'
                                }`}
                              >
                                SUA
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year Filters 2026..2038 */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setCafCalYearFilter('ALL');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        cafCalYearFilter === 'ALL'
                          ? 'bg-lime-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas (2026–2038)
                    </button>
                    {cafYears.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setCafCalYearFilter(y);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          cafCalYearFilter === y
                            ? 'bg-lime-400 text-slate-950 font-black'
                            : y === calendarYear
                            ? 'text-emerald-300 hover:text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {y}
                        {y === calendarYear ? ' •' : ''}
                      </button>
                    ))}
                  </div>

                  {(activeCafEntry || nextCafEntry) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-lime-400 block">
                            {activeCafEntry ? 'Etapa CAF Ativa Agora' : 'Ciclo Africano em Andamento'}
                          </span>
                          <span className="text-xs font-bold text-white block mt-0.5">
                            {activeCafEntry
                              ? `${activeCafEntry.year} · ${activeCafEntry.label}`
                              : `Temporada ${calendarYear} · Próximos compromissos da África`}
                          </span>
                        </div>
                        {activeCafEntry && (
                          <span className="px-2.5 py-1 rounded-full bg-lime-400 text-slate-950 text-[10px] font-black whitespace-nowrap shrink-0">
                            EM ANDAMENTO
                          </span>
                        )}
                      </div>

                      {nextCafEntry && (
                        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                              Próximo Marco CAF Programado
                            </span>
                            <span className="text-xs font-bold text-white block mt-0.5">
                              {nextCafEntry.periodLabel} ({nextCafEntry.year}) · {nextCafEntry.label}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold whitespace-nowrap shrink-0">
                            {nextCafEntry.gamesLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CAF Annual Schedule Cards 2026..2038 */}
                <div className="space-y-4">
                  {visibleCafYears.map((yr) => {
                    const entries = OFFICIAL_AFRICA_CALENDAR_2026_2038.filter(
                      (e) => e.year === yr
                    );
                    const isCurrentSeason = yr === calendarYear;
                    const seasonCafFixtures = selectedCafFixtures.filter(
                      (f) => typeof f.date === 'string' && f.date.startsWith(`${yr}-`)
                    );

                    return (
                      <div
                        key={yr}
                        className={`bg-slate-950 border rounded-2xl overflow-hidden ${
                          isCurrentSeason ? 'border-lime-400/50' : 'border-slate-800'
                        }`}
                      >
                        <div className="px-5 py-3.5 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-lg font-black font-mono tabular-nums text-white">
                              {yr}
                            </span>
                            {isCurrentSeason && (
                              <span className="px-2 py-0.5 rounded bg-lime-400 text-slate-950 text-[10px] font-black">
                                TEMPORADA ATUAL
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-400">
                              {getCafYearHeaderTag(yr)}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-lime-300 font-bold">
                            {entries.length} {entries.length === 1 ? 'evento' : 'eventos'}
                            {seasonCafFixtures.length > 0
                              ? ` · ${seasonCafFixtures.length} jogos de ${selectedCafTeam.code} agendados`
                              : ''}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-800/70">
                          {entries.map((entry) => {
                            const isLive = Boolean(
                              currentDate &&
                                currentDate >= entry.startDate &&
                                currentDate <= entry.endDate
                            );
                            const isPast = Boolean(currentDate && currentDate > entry.endDate);
                            const windowFixtures = selectedCafFixtures.filter(
                              (f) =>
                                typeof f.date === 'string' &&
                                f.date >= entry.startDate &&
                                f.date <= entry.endDate
                            );

                            return (
                              <div
                                key={entry.id}
                                className={`p-4 sm:px-5 transition-colors ${
                                  isLive
                                    ? 'bg-lime-500/10'
                                    : isPast
                                    ? 'bg-slate-950/60 opacity-85'
                                    : 'hover:bg-slate-900/40'
                                }`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wide ${getCafCategoryBadgeStyle(
                                          entry.category
                                        )}`}
                                      >
                                        {entry.category}
                                      </span>
                                      <span className="text-xs font-black text-lime-300">
                                        {entry.periodLabel}
                                      </span>
                                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                        ({formatShortDate(entry.startDate)} → {formatShortDate(entry.endDate)})
                                      </span>
                                      {isLive && (
                                        <span className="px-2 py-0.5 rounded bg-lime-400 text-slate-950 text-[10px] font-black">
                                          EM ANDAMENTO
                                        </span>
                                      )}
                                      {isPast && !isLive && (
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                                          Concluída
                                        </span>
                                      )}
                                    </div>

                                    <h3 className="text-sm font-bold text-white">
                                      {entry.label}
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                      {entry.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200 whitespace-nowrap">
                                      {entry.gamesLabel}
                                    </span>
                                  </div>
                                </div>

                                {windowFixtures.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-wrap gap-2">
                                    {windowFixtures.map((wf) => {
                                      const isHome = wf.homeTeamId === selectedCafTeam.id;
                                      const opp = getNationalTeamById(
                                        isHome ? wf.awayTeamId : wf.homeTeamId
                                      );
                                      const myGoals = isHome ? wf.homeScore : wf.awayScore;
                                      const oppGoals = isHome ? wf.awayScore : wf.homeScore;
                                      return (
                                        <div
                                          key={wf.id}
                                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                                        >
                                          <span className="font-mono text-slate-400">
                                            {wf.date ? formatShortDate(wf.date) : `R${wf.triggerRound}`}
                                          </span>
                                          <span className="font-bold text-white">
                                            {selectedCafTeam.code}{' '}
                                            {wf.played ? `${myGoals}–${oppGoals}` : 'vs'} {opp.code}
                                          </span>
                                          <span className="text-slate-400 truncate max-w-[200px]">
                                            · {wf.competitionName}
                                            {wf.phase.startsWith('Play-Off') ? ` (${wf.phase})` : ''}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : fifaCalRegionView === 'ASIA' ? (
              <>
                {/* AFC Asia Calendar Header + 48 National Teams Selector + 2026-2038 Year Filters */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 shrink-0">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">
                          Calendário Oficial da Ásia — AFC (48 Seleções · 2026–2038)
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                          Ciclo completo das 48 seleções da Ásia (incluindo Rússia): Eliminatórias da Copa da Ásia em 4 grupos de 12 (turno único · 11 jogos · Top 8 de cada grupo avançam), Copa da Ásia com 32 seleções (8 grupos de 4 + Oitavas, Quartas, Semis e Final), e Eliminatórias da Copa do Mundo em 8 grupos de 6 (ida e volta · 10 jogos · 8 campeões diretos + Play-Off AFC entre os 8 segundos colocados por 1 vaga na Repescagem Mundial).
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setWorldInspectTeamId(selectedAsiaTeam.id);
                        setWorldSubTab('nations');
                        switchArea('WORLD');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-rose-300 cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir {selectedAsiaTeam.name}</span>
                    </button>
                  </div>

                  {/* 48 AFC National Teams */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-300">
                        {asiaTeams.length} Seleções da Ásia · AFC (clique para filtrar os jogos na tabela abaixo)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={asiaTeamSearch}
                            onChange={(e) => setAsiaTeamSearch(e.target.value)}
                            placeholder="Buscar seleção AFC..."
                            className="pl-7 pr-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400 w-44"
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          Em foco: <strong className="text-white">{selectedAsiaTeam.name}</strong> (Força {selectedAsiaTeam.strength})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {filteredAsiaTeams.map((team) => {
                        const isSelected = team.id === selectedAsiaTeam.id;
                        const isUserTeam = team.id === activeUserTeamId;
                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setAsiaFocusTeamId(team.id);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-rose-400 text-slate-950 border-rose-300 font-black'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                            }`}
                          >
                            <TeamCrest team={team} size="sm" />
                            <span>{team.name}</span>
                            {isUserTeam && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-rose-300'
                                    : 'bg-rose-400/20 text-rose-300'
                                }`}
                              >
                                SUA
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year Filters 2026..2038 */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setAsiaCalYearFilter('ALL');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        asiaCalYearFilter === 'ALL'
                          ? 'bg-rose-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas (2026–2038)
                    </button>
                    {asiaYears.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setAsiaCalYearFilter(y);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          asiaCalYearFilter === y
                            ? 'bg-rose-400 text-slate-950 font-black'
                            : y === calendarYear
                            ? 'text-emerald-300 hover:text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {y}
                        {y === calendarYear ? ' •' : ''}
                      </button>
                    ))}
                  </div>

                  {(activeAsiaEntry || nextAsiaEntry) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                            {activeAsiaEntry ? 'Etapa AFC Ativa Agora' : 'Ciclo AFC em Andamento'}
                          </span>
                          <span className="text-xs font-bold text-white block mt-0.5">
                            {activeAsiaEntry
                              ? `${activeAsiaEntry.year} · ${activeAsiaEntry.label}`
                              : `Temporada ${calendarYear} · Próximos compromissos da Ásia`}
                          </span>
                        </div>
                        {activeAsiaEntry && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-400 text-slate-950 text-[10px] font-black whitespace-nowrap shrink-0">
                            EM ANDAMENTO
                          </span>
                        )}
                      </div>

                      {nextAsiaEntry && (
                        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                              Próximo Marco AFC Programado
                            </span>
                            <span className="text-xs font-bold text-white block mt-0.5">
                              {nextAsiaEntry.periodLabel} ({nextAsiaEntry.year}) · {nextAsiaEntry.label}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold whitespace-nowrap shrink-0">
                            {nextAsiaEntry.gamesLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AFC Annual Schedule Cards 2026..2038 */}
                <div className="space-y-4">
                  {visibleAsiaYears.map((yr) => {
                    const entries = OFFICIAL_ASIA_CALENDAR_2026_2038.filter(
                      (e) => e.year === yr
                    );
                    const isCurrentSeason = yr === calendarYear;
                    const seasonAsiaFixtures = selectedAsiaFixtures.filter(
                      (f) => typeof f.date === 'string' && f.date.startsWith(`${yr}-`)
                    );

                    return (
                      <div
                        key={yr}
                        className={`bg-slate-950 border rounded-2xl overflow-hidden ${
                          isCurrentSeason ? 'border-rose-400/50' : 'border-slate-800'
                        }`}
                      >
                        <div className="px-5 py-3.5 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-lg font-black font-mono tabular-nums text-white">
                              {yr}
                            </span>
                            {isCurrentSeason && (
                              <span className="px-2 py-0.5 rounded bg-rose-400 text-slate-950 text-[10px] font-black">
                                TEMPORADA ATUAL
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-400">
                              {getAsiaYearHeaderTag(yr)}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-rose-300 font-bold">
                            {entries.length} {entries.length === 1 ? 'evento' : 'eventos'}
                            {seasonAsiaFixtures.length > 0
                              ? ` · ${seasonAsiaFixtures.length} jogos de ${selectedAsiaTeam.code} agendados`
                              : ''}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-800/70">
                          {entries.map((entry) => {
                            const isLive = Boolean(
                              currentDate &&
                                currentDate >= entry.startDate &&
                                currentDate <= entry.endDate
                            );
                            const isPast = Boolean(currentDate && currentDate > entry.endDate);
                            const windowFixtures = selectedAsiaFixtures.filter(
                              (f) =>
                                typeof f.date === 'string' &&
                                f.date >= entry.startDate &&
                                f.date <= entry.endDate
                            );

                            return (
                              <div
                                key={entry.id}
                                className={`p-4 sm:px-5 transition-colors ${
                                  isLive
                                    ? 'bg-rose-500/10'
                                    : isPast
                                    ? 'bg-slate-950/60 opacity-85'
                                    : 'hover:bg-slate-900/40'
                                }`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wide ${getAsiaCategoryBadgeStyle(
                                          entry.category
                                        )}`}
                                      >
                                        {entry.category}
                                      </span>
                                      <span className="text-xs font-black text-rose-300">
                                        {entry.periodLabel}
                                      </span>
                                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                        ({formatShortDate(entry.startDate)} → {formatShortDate(entry.endDate)})
                                      </span>
                                      {isLive && (
                                        <span className="px-2 py-0.5 rounded bg-rose-400 text-slate-950 text-[10px] font-black">
                                          EM ANDAMENTO
                                        </span>
                                      )}
                                      {isPast && !isLive && (
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                                          Concluída
                                        </span>
                                      )}
                                    </div>

                                    <h3 className="text-sm font-bold text-white">
                                      {entry.label}
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                      {entry.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200 whitespace-nowrap">
                                      {entry.gamesLabel}
                                    </span>
                                  </div>
                                </div>

                                {windowFixtures.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-wrap gap-2">
                                    {windowFixtures.map((wf) => {
                                      const isHome = wf.homeTeamId === selectedAsiaTeam.id;
                                      const opp = getNationalTeamById(
                                        isHome ? wf.awayTeamId : wf.homeTeamId
                                      );
                                      const myGoals = isHome ? wf.homeScore : wf.awayScore;
                                      const oppGoals = isHome ? wf.awayScore : wf.homeScore;
                                      return (
                                        <div
                                          key={wf.id}
                                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                                        >
                                          <span className="font-mono text-slate-400">
                                            {wf.date ? formatShortDate(wf.date) : `R${wf.triggerRound}`}
                                          </span>
                                          <span className="font-bold text-white">
                                            {selectedAsiaTeam.code}{' '}
                                            {wf.played ? `${myGoals}–${oppGoals}` : 'vs'} {opp.code}
                                          </span>
                                          <span className="text-slate-400 truncate max-w-[200px]">
                                            · {wf.competitionName}
                                            {wf.phase.startsWith('Play-Off') ? ` (${wf.phase})` : ''}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* OFC Oceania Calendar Header + 11 National Teams Selector + 2026-2038 Year Filters */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">
                          Calendário Oficial da Oceania — OFC (Temporadas 2026–2038)
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                          Ciclo quadrienal completo das 11 seleções da Oceania: Eliminatórias da Copa da Oceania (11 seleções em turno único, Top 8 avançam), Copa da Oceania (2 grupos de 4 + Semi/Final), Eliminatórias da Copa do Mundo (1º vaga direta, 2º repescagem) e janelas de amistosos até 2038.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setWorldInspectTeamId(selectedOfcTeam.id);
                        setWorldSubTab('nations');
                        switchArea('WORLD');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir {selectedOfcTeam.name}</span>
                    </button>
                  </div>

                  {/* 11 OFC National Teams */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
                        11 Seleções Filiadas à OFC (clique para filtrar os jogos na tabela abaixo)
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Seleção em foco: <strong className="text-white">{selectedOfcTeam.name}</strong> (Força {selectedOfcTeam.strength})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ofcTeams.map((team) => {
                        const isSelected = team.id === selectedOfcTeam.id;
                        const isUserTeam = team.id === activeUserTeamId;
                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setOceaniaFocusTeamId(team.id);
                            }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                            }`}
                          >
                            <TeamCrest team={team} size="sm" />
                            <span>{team.name}</span>
                            {isUserTeam && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-cyan-300'
                                    : 'bg-amber-400/20 text-amber-300'
                                }`}
                              >
                                SUA
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year Filters 2026..2038 */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setOceaniaCalYearFilter('ALL');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        oceaniaCalYearFilter === 'ALL'
                          ? 'bg-cyan-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas (2026–2038)
                    </button>
                    {oceaniaYears.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setOceaniaCalYearFilter(y);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          oceaniaCalYearFilter === y
                            ? 'bg-cyan-400 text-slate-950 font-black'
                            : y === calendarYear
                            ? 'text-amber-300 hover:text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {y}
                        {y === calendarYear ? ' •' : ''}
                      </button>
                    ))}
                  </div>

                  {(activeOfcEntry || nextOfcEntry) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">
                            {activeOfcEntry ? 'Etapa OFC Ativa Agora' : 'Ciclo da Oceania em Andamento'}
                          </span>
                          <span className="text-xs font-bold text-white block mt-0.5">
                            {activeOfcEntry
                              ? `${activeOfcEntry.year} · ${activeOfcEntry.label}`
                              : `Temporada ${calendarYear} · Próximas Datas FIFA OFC`}
                          </span>
                        </div>
                        {activeOfcEntry && (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black whitespace-nowrap shrink-0">
                            EM ANDAMENTO
                          </span>
                        )}
                      </div>

                      {nextOfcEntry && (
                        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                              Próximo Marco OFC Programado
                            </span>
                            <span className="text-xs font-bold text-white block mt-0.5">
                              {nextOfcEntry.periodLabel} ({nextOfcEntry.year}) · {nextOfcEntry.label}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold whitespace-nowrap shrink-0">
                            {nextOfcEntry.gamesLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Oceania Annual Schedule Cards 2026..2038 */}
                <div className="space-y-4">
                  {visibleOceaniaYears.map((yr) => {
                    const entries = OFFICIAL_OCEANIA_CALENDAR_2026_2038.filter(
                      (e) => e.year === yr
                    );
                    const isCurrentSeason = yr === calendarYear;
                    const seasonOfcFixtures = selectedOfcFixtures.filter(
                      (f) => typeof f.date === 'string' && f.date.startsWith(`${yr}-`)
                    );

                    return (
                      <div
                        key={yr}
                        className={`bg-slate-950 border rounded-2xl overflow-hidden ${
                          isCurrentSeason ? 'border-cyan-400/50' : 'border-slate-800'
                        }`}
                      >
                        <div className="px-5 py-3.5 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-lg font-black font-mono tabular-nums text-white">
                              {yr}
                            </span>
                            {isCurrentSeason && (
                              <span className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 text-[10px] font-black">
                                TEMPORADA ATUAL
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-400">
                              {getOfcYearHeaderTag(yr)}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-cyan-300 font-bold">
                            {entries.length} {entries.length === 1 ? 'competição' : 'eventos'}
                            {seasonOfcFixtures.length > 0
                              ? ` · ${seasonOfcFixtures.length} jogos de ${selectedOfcTeam.code} agendados`
                              : ''}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-800/70">
                          {entries.map((entry) => {
                            const isLive = Boolean(
                              currentDate &&
                                currentDate >= entry.startDate &&
                                currentDate <= entry.endDate
                            );
                            const isPast = Boolean(currentDate && currentDate > entry.endDate);
                            const windowFixtures = selectedOfcFixtures.filter(
                              (f) =>
                                typeof f.date === 'string' &&
                                f.date >= entry.startDate &&
                                f.date <= entry.endDate
                            );

                            return (
                              <div
                                key={entry.id}
                                className={`p-4 sm:px-5 transition-colors ${
                                  isLive
                                    ? 'bg-cyan-500/10'
                                    : isPast
                                    ? 'bg-slate-950/60 opacity-85'
                                    : 'hover:bg-slate-900/40'
                                }`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wide ${getOfcCategoryBadgeStyle(
                                          entry.category
                                        )}`}
                                      >
                                        {entry.category}
                                      </span>
                                      <span className="text-xs font-black text-amber-300">
                                        {entry.periodLabel}
                                      </span>
                                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                        ({formatShortDate(entry.startDate)} → {formatShortDate(entry.endDate)})
                                      </span>
                                      {isLive && (
                                        <span className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 text-[10px] font-black">
                                          EM ANDAMENTO
                                        </span>
                                      )}
                                      {isPast && !isLive && (
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                                          Concluída
                                        </span>
                                      )}
                                    </div>

                                    <h3 className="text-sm font-bold text-white">
                                      {entry.label}
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                      {entry.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200 whitespace-nowrap">
                                      {entry.gamesLabel}
                                    </span>
                                  </div>
                                </div>

                                {windowFixtures.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-wrap gap-2">
                                    {windowFixtures.map((wf) => {
                                      const isHome = wf.homeTeamId === selectedOfcTeam.id;
                                      const opp = getNationalTeamById(
                                        isHome ? wf.awayTeamId : wf.homeTeamId
                                      );
                                      const myGoals = isHome ? wf.homeScore : wf.awayScore;
                                      const oppGoals = isHome ? wf.awayScore : wf.homeScore;
                                      return (
                                        <div
                                          key={wf.id}
                                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                                        >
                                          <span className="font-mono text-slate-400">
                                            {wf.date ? formatShortDate(wf.date) : `R${wf.triggerRound}`}
                                          </span>
                                          <span className="font-bold text-white">
                                            {selectedOfcTeam.code}{' '}
                                            {wf.played ? `${myGoals}–${oppGoals}` : 'vs'} {opp.code}
                                          </span>
                                          <span className="text-slate-400 truncate max-w-[180px]">
                                            · {wf.competitionName}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* AREA 2: SELEÇÕES & TORNEIOS DO MUNDO                                 */}
      {/* ==================================================================== */}
      {areaMode === 'WORLD' && (
        <NationalWorldHub
          worldSubTab={worldSubTab}
          onChangeWorldSubTab={setWorldSubTab}
          worldInspectTeamId={worldInspectTeamId}
          onSelectInspectTeam={setWorldInspectTeamId}
          nationalTeam={nationalTeam}
          activeUserTeamId={activeUserTeamId}
          allClubs={allClubs}
          userClub={userClub}
          calendarYear={calendarYear}
          managerReputation={managerReputation}
          fifaRankingRows={fifaRankingRows}
          onAppointNation={(team) => {
            soundEngine.playFanfare();
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.55 } });
            onAppointNationalTeam(team.id);
            switchArea('MY_TEAM');
            setSubTab('command');
            showToast(`Você assumiu o comando oficial da seleção de ${team.name}!`);
          }}
          onLaunchMatch={openPreMatchEscalation}
          renderTournamentHub={renderTournamentHub}
          TeamCrest={TeamCrest}
          formatCurrency={formatCurrency}
          totalCompensationHistory={totalCompensationHistory}
          userClubCappedCount={userClubCappedPlayers.length}
          onOpenTournamentDraw={(compId) => setDrawModalCompId(compId)}
        />
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: MERCADO DE CARGOS EM SELEÇÕES (48 FEDERAÇÕES)               */}
      {/* ==================================================================== */}
      {showJobMarketModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-3xl my-auto max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="shrink-0 p-5 bg-black border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Federações Internacionais · Assumir Seleção Nacional
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Seu prestígio atual ({managerReputation}/100) permite assumir imediatamente qualquer federação com requisito atingido, mantendo seu clube ({userClub.shortName}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJobMarketModal(false)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 p-4 overflow-y-auto divide-y divide-slate-800/70">
              {fifaRankingRows.map(({ team, rank }) => {
                const eligible = managerReputation >= team.minReputationToCoach;
                const isCurrent = activeUserTeamId === team.id;
                const coachRec = getNationalTeamCoachRecord(nationalTeam, team.id, managerName);
                const secDesc = getCoachSecurityDescriptor(coachRec.security);
                const canApply = !isCurrent && !eligible && coachRec.security <= 58 && Boolean(onApplyNationalJob);
                return (
                  <div
                    key={team.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamCrest team={team} />
                      <div>
                        <div className="font-black text-white text-sm">
                          {team.name}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            · {team.confederation} · Ranking #{rank}
                          </span>
                        </div>
                        <div className="text-slate-400 font-mono tabular-nums mt-0.5">
                          Força {team.strength} · Req. Rep: {team.minReputationToCoach}/100 · Técnico: {coachRec.coachName} ({secDesc.label} {coachRec.security}%)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrent ? (
                        <span className="text-xs font-bold text-emerald-400">Comando Atual</span>
                      ) : eligible ? (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playFanfare();
                            confetti({ particleCount: 95, spread: 75, origin: { y: 0.55 } });
                            onAppointNationalTeam(team.id);
                            setShowJobMarketModal(false);
                            showToast(
                              `Parabéns! Você agora comanda a seleção de ${team.name} (26 convocados)!`
                            );
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Assumir {team.code}
                        </button>
                      ) : canApply && onApplyNationalJob ? (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            const res = onApplyNationalJob(team.id);
                            showToast(res.feedbackText);
                            if (res.accepted) setShowJobMarketModal(false);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Sondar Cargo
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono tabular-nums">
                          Requer Rep. {team.minReputationToCoach} (atual {managerReputation})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: PRÉ-JOGO (ESCALAÇÃO DOS 11) + SIMULADOR AO VIVO COM 5 SUBS   */}
      {/* ==================================================================== */}
      {liveFixture &&
        (() => {
          const myTeam = getNationalTeamById(focusTeamId);
          const isHome = liveFixture.homeTeamId === focusTeamId;
          const oppId = isHome ? liveFixture.awayTeamId : liveFixture.homeTeamId;
          const oppTeam = getNationalTeamById(oppId);

          const activeSlots =
            SELECAO_FORMATION_SLOTS[liveFormation] || SELECAO_FORMATION_SLOTS['4-3-3'];
          const liveOnPitchPlayers = livePitchIds
            .map((id) => ownPoolLookup.get(id))
            .filter((x): x is ResolvedNationalPlayer => Boolean(x));
          const pitchSet = new Set(livePitchIds);
          const subbedOutSet = new Set(liveSubbedOutIds);
          const availableBenchPlayers = ownCalledRoster.filter(
            (p) => !pitchSet.has(p.id) && !subbedOutSet.has(p.id)
          );

          const myAvgOvr =
            liveOnPitchPlayers.length > 0
              ? Math.round(
                  liveOnPitchPlayers.reduce((s, p, idx) => {
                    const custom = nationalTeam.customPositions?.[p.id];
                    if (custom) {
                      const inf = inferTacticalZoneFromCoords(custom.x, custom.y);
                      return (
                        s +
                        evaluateSelecaoSlotFit(p, inf.role, custom.code, custom.label)
                          .effectiveOverall
                      );
                    }
                    const slot = activeSlots[idx];
                    if (!slot) return s + p.overall;
                    return (
                      s +
                      evaluateSelecaoSlotFit(p, slot.role, slot.code, slot.label).effectiveOverall
                    );
                  }, 0) / liveOnPitchPlayers.length
                )
              : myTeam.strength;

          return (
            <div className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-start justify-center p-3 sm:p-5 overflow-y-auto">
              <div
                className={`bg-slate-950 border border-amber-500/45 rounded-3xl w-full shadow-2xl overflow-hidden my-4 ${
                  livePhaseState === 'PRE_MATCH' ? 'max-w-6xl' : 'max-w-4xl'
                }`}
              >
                {/* Match Broadcast Header */}
                <div className="p-5 bg-black border-b border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>
                      <strong className="text-amber-300">{liveFixture.competitionName}</strong> ·{' '}
                      {liveFixture.phase}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular-nums text-slate-300">
                        {liveFixture.stadiumName}
                      </span>
                      {livePhaseState === 'PRE_MATCH' && (
                        <button
                          type="button"
                          onClick={() => setLiveFixture(null)}
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                          title="Fechar pré-jogo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scoreboard */}
                  <div className="py-4 px-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <TeamCrest team={myTeam} size="lg" />
                      <div className="min-w-0">
                        <span className="text-base sm:text-lg font-black text-white block truncate">
                          {myTeam.name}
                        </span>
                        <span className="text-xs text-emerald-400 font-mono tabular-nums">
                          OVR Titular {myAvgOvr} · {liveFormation}
                        </span>
                      </div>
                    </div>

                    <div className="text-center font-mono tabular-nums shrink-0">
                      {livePhaseState === 'PRE_MATCH' ? (
                        <div>
                          <span className="text-xl sm:text-2xl font-black text-amber-300">
                            PRÉ-JOGO
                          </span>
                          <span className="block text-[11px] text-slate-400 mt-0.5 font-sans">
                            Confira e escale os 11 titulares
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                            {liveMyScore} <span className="text-slate-600">x</span> {liveOppScore}
                          </div>
                          {liveMyPen !== undefined && (
                            <div className="text-xs font-bold text-amber-300 mt-1">
                              Pênaltis: {liveMyPen} x {liveOppPen}
                            </div>
                          )}
                          <div className="text-xs font-bold text-sky-400 mt-1">
                            {livePhaseState === 'HALFTIME'
                              ? 'Intervalo (45’)'
                              : livePhaseState === 'PENALTIES'
                              ? 'Disputa de Pênaltis'
                              : livePhaseState === 'FINISHED'
                              ? 'Fim de Jogo'
                              : `${liveMinute}'`}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 min-w-0 flex-1 justify-end text-right">
                      <div className="min-w-0">
                        <span className="text-base sm:text-lg font-black text-white block truncate">
                          {oppTeam.name}
                        </span>
                        <span className="text-xs text-slate-400 font-mono tabular-nums">
                          Força {oppTeam.strength}
                        </span>
                      </div>
                      <TeamCrest team={oppTeam} size="lg" />
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* STAGE A: PRE-MATCH ESCALATION LOCKER ROOM                 */}
                {/* ========================================================= */}
                {livePhaseState === 'PRE_MATCH' ? (
                  <div className="p-4 sm:p-5 space-y-5 bg-slate-950">
                    <SelecaoTacticalBoard
                      team={myTeam}
                      isEditable={true}
                      isPreMatchMode={true}
                      formation={liveFormation}
                      tacticStyle={liveTactic}
                      captainPlayerId={nationalTeam.captainPlayerId}
                      calledUpPlayers={ownCalledRoster}
                      starterIds={
                        nationalTeam.starterPlayerIds.length === 11
                          ? nationalTeam.starterPlayerIds
                          : livePitchIds
                      }
                      customPositions={nationalTeam.customPositions}
                      allClubs={allClubs}
                      readyFixture={liveFixture}
                      onChangeFormation={(fmt) => {
                        setLiveFormation(fmt);
                        onChangeFormation(fmt);
                      }}
                      onChangeTacticStyle={(st) => {
                        setLiveTactic(st);
                        onChangeTacticStyle(st);
                      }}
                      onSwapPlayers={(a, b) => {
                        const res = onSwapLineupPlayers(a, b);
                        if (res.feedback) showToast(res.feedback);
                      }}
                      onMovePlayerToPitchCoords={(pid, x, y, code, label) => {
                        if (!onMovePlayerToPitchCoords) return;
                        const res = onMovePlayerToPitchCoords(pid, x, y, code, label);
                        if (res.feedback) showToast(res.feedback);
                      }}
                      onResetCustomPositions={onResetCustomPositions}
                      onAutoPickStartersOnly={() => {
                        onAutoPickStartersOnly();
                      }}
                      onSetCaptain={(pid) => {
                        onSetCaptain(pid);
                      }}
                    />

                    <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setLiveFixture(null);
                          switchArea('MY_TEAM');
                          setSubTab('lineup');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                      >
                        Voltar p/ Aba da Seleção
                      </button>

                      <button
                        type="button"
                        onClick={kickOffLiveInternationalMatch}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/20 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>Confirmar 11 Titulares & Iniciar Jogo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ========================================================= */
                  /* STAGE B: LIVE BROADCAST + 5 BENCH SUBSTITUTIONS           */
                  /* ========================================================= */
                  <>
                    {livePhaseState !== 'FINISHED' && livePhaseState !== 'PENALTIES' && (
                      <div className="px-5 py-3 bg-slate-900/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {TACTIC_STYLES.map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setLiveTactic(st.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                                liveTactic === st.id
                                  ? 'bg-amber-400 text-slate-950 font-black'
                                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              const nextOpen = !showLiveBenchDrawer;
                              setShowLiveBenchDrawer(nextOpen);
                              if (nextOpen && livePhaseState !== 'HALFTIME') {
                                setLivePaused(true);
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                              showLiveBenchDrawer
                                ? 'bg-sky-400 text-slate-950 font-black'
                                : 'bg-slate-950 border border-slate-700 text-sky-300 hover:text-white'
                            }`}
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>
                              Substituições ({liveSubsCount}/{MAX_LIVE_SUBS})
                            </span>
                          </button>

                          {livePhaseState !== 'HALFTIME' && (
                            <button
                              type="button"
                              onClick={() => setLivePaused((p) => !p)}
                              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 hover:text-white cursor-pointer"
                              title={livePaused ? 'Retomar' : 'Pausar'}
                            >
                              {livePaused ? (
                                <Play className="w-3.5 h-3.5" />
                              ) : (
                                <Pause className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setLiveSpeedMs((s) => (s === 200 ? 90 : 200))}
                            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono font-bold text-sky-300 cursor-pointer"
                          >
                            {liveSpeedMs === 90 ? '2x' : '1x'}
                          </button>
                          <button
                            type="button"
                            onClick={finishLiveMatchInstant}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 cursor-pointer"
                          >
                            <FastForward className="w-3 h-3" />
                            <span>Ir ao Final</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Interactive Live Substitutions Panel (11 on Pitch -> 15 Bench) */}
                    {showLiveBenchDrawer &&
                      livePhaseState !== 'FINISHED' &&
                      livePhaseState !== 'PENALTIES' && (
                        <div className="p-4 bg-slate-900/80 border-b border-slate-800 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-white">
                              Substituições Ao Vivo ({liveSubsCount}/{MAX_LIVE_SUBS} realizadas) ·{' '}
                              <span className="font-normal text-slate-300">
                                {selectedLiveOutId
                                  ? `Escolha quem entra no lugar de ${
                                      ownPoolLookup.get(selectedLiveOutId)?.name
                                    }`
                                  : '1º Clique em quem sai de campo, depois clique no reserva que entra'}
                              </span>
                            </span>
                            {liveSubsCount >= MAX_LIVE_SUBS && (
                              <span className="text-amber-300 font-bold">
                                Limite de 5 substituições atingido
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 max-h-48 overflow-y-auto space-y-1">
                              <div className="text-[10px] font-bold text-emerald-400 uppercase px-1 mb-1">
                                Em Campo (11) — Clique para tirar
                              </div>
                              {liveOnPitchPlayers.map((p) => {
                                const isChosenOut = selectedLiveOutId === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    disabled={liveSubsCount >= MAX_LIVE_SUBS}
                                    onClick={() =>
                                      setSelectedLiveOutId(isChosenOut ? null : p.id)
                                    }
                                    className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer ${
                                      isChosenOut
                                        ? 'bg-rose-500/25 border border-rose-400 text-white font-bold'
                                        : 'hover:bg-slate-900 text-slate-200'
                                    }`}
                                  >
                                    <span className="truncate">
                                      <strong className="font-mono text-[10px] text-slate-400 mr-1.5">
                                        {p.detailedRole}
                                      </strong>
                                      {p.name}
                                    </span>
                                    <span className="font-mono tabular-nums text-amber-400 font-bold">
                                      {p.overall}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 max-h-48 overflow-y-auto space-y-1">
                              <div className="text-[10px] font-bold text-sky-400 uppercase px-1 mb-1">
                                Banco Disponível ({availableBenchPlayers.length}) — Clique para colocar
                              </div>
                              {availableBenchPlayers.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  disabled={!selectedLiveOutId || liveSubsCount >= MAX_LIVE_SUBS}
                                  onClick={() => {
                                    if (selectedLiveOutId) {
                                      executeLiveSubstitution(selectedLiveOutId, p.id);
                                    }
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs ${
                                    selectedLiveOutId && liveSubsCount < MAX_LIVE_SUBS
                                      ? 'hover:bg-emerald-500/20 text-white cursor-pointer'
                                      : 'text-slate-500 cursor-not-allowed'
                                  }`}
                                >
                                  <span className="truncate">
                                    <strong className="font-mono text-[10px] text-slate-400 mr-1.5">
                                      {p.detailedRole}
                                    </strong>
                                    {p.name}
                                  </span>
                                  <span className="font-mono tabular-nums text-sky-400 font-bold">
                                    {p.overall}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Live Narration Feed */}
                    <div className="p-5 max-h-64 overflow-y-auto space-y-2 bg-slate-950">
                      {liveEvents.map((ev, idx) => (
                        <div
                          key={idx}
                          className={`text-xs px-3 py-2 rounded-xl border ${
                            ev.isGoal
                              ? ev.isMyTeam
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200 font-bold'
                                : 'bg-rose-500/10 border-rose-500/40 text-rose-200 font-bold'
                              : ev.isSub
                              ? 'bg-sky-500/10 border-sky-500/35 text-sky-200 font-medium'
                              : 'bg-slate-900/50 border-slate-800/80 text-slate-300'
                          }`}
                        >
                          {ev.text}
                        </div>
                      ))}
                    </div>

                    {/* Footer Action Controls */}
                    <div className="p-4 bg-black border-t border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-400 font-mono tabular-nums">
                        Substituições: {liveSubsCount}/{MAX_LIVE_SUBS}
                      </span>

                      <div className="flex items-center gap-2.5">
                        {livePaused &&
                          livePhaseState !== 'HALFTIME' &&
                          livePhaseState !== 'PENALTIES' &&
                          livePhaseState !== 'FINISHED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowLiveBenchDrawer(false);
                                setLivePaused(false);
                              }}
                              className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black cursor-pointer"
                            >
                              Retomar Jogo
                            </button>
                          )}

                        {livePhaseState === 'HALFTIME' && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playWhistle(true);
                              setShowLiveBenchDrawer(false);
                              setLivePaused(false);
                              setLivePhaseState('SECOND_HALF');
                              setLiveMinute(46);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                          >
                            Iniciar 2º Tempo
                          </button>
                        )}

                        {livePhaseState === 'PENALTIES' && (
                          <button
                            type="button"
                            onClick={resolveLivePenalties}
                            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                          >
                            Cobrar Série Oficial de Pênaltis
                          </button>
                        )}

                        {livePhaseState === 'FINISHED' && (
                          <button
                            type="button"
                            onClick={confirmAndCloseLiveMatch}
                            className="px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black cursor-pointer"
                          >
                            Confirmar Resultado Oficial & Atualizar Tabelas
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

      {/* MODAL: SORTEIO OFICIAL DE TORNEIOS DE SELEÇÕES */}
      <NationalTournamentDrawModal
        isOpen={Boolean(drawModalCompId && activeDrawModalInfo)}
        onClose={() => setDrawModalCompId(null)}
        drawInfo={activeDrawModalInfo}
        activeUserTeamId={activeUserTeamId}
        onGenerateDraw={(compId) => {
          const res = onDrawNationalTournament?.(compId);
          if (res && typeof res === 'object' && res.feedback) {
            showToast(res.feedback);
          }
        }}
        TeamCrest={TeamCrest}
      />
    </div>
  );
};

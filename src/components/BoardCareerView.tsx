import React, { useMemo, useState } from 'react';
import {
  BoardGoalStatus,
  Club,
  ConfederationCode,
  Division,
  GameSave,
  ManagerCareerState,
  ManagerJobOffer,
  NationalTeamJobOffer,
} from '../types/game';
import {
  Briefcase,
  Target,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  History,
  DollarSign,
  Users,
  Search,
  RefreshCw,
  LogOut,
  UserCheck,
  Mic,
  MessageSquare,
  Award,
  Trophy,
  Crown,
  Flag,
} from 'lucide-react';
import { formatCurrency } from '../utils/individualAwardsEngine';
import { formatShortDate } from '../utils/calendarUtils';
import { soundEngine } from '../services/soundEngine';
import { ScrollableTabStrip } from './ScrollableTabStrip';
import {
  buildRealCoachProfileFromName,
  ensureCoachingCarouselState,
  getCoachSecurityDescriptor,
} from '../utils/coachingCarouselEngine';
import {
  ensureNationalTeamCoachesMap,
  getNationalTeamCoachRecord,
  NATIONAL_TEAMS_CATALOG,
} from '../utils/nationalTeamEngine';
import { ensureLockerRoomState } from '../utils/lockerRoomEngine';
import { evaluateManagerAchievementsAndHallOfFame } from '../utils/careerAchievementsEngine';
import { getManagerSpecialtyProfile } from '../utils/managerSpecialtyEngine';
import { evaluateChallengeStatus } from '../utils/careerChallengesEngine';
import { LockerRoomPressPanel } from './LockerRoomPressPanel';

interface BoardCareerViewProps {
  userClub: Club;
  managerName: string;
  seasonYear: number;
  currentRound: number;
  career: ManagerCareerState;
  gameState: GameSave;
  initialSubTab?:
    | 'goals'
    | 'locker_room'
    | 'press'
    | 'carousel'
    | 'offers'
    | 'history'
    | 'achievements';
  onAcceptOffer: (offerId: string) => void;
  onDeclineOffer: (offerId: string) => void;
  onRequestBudgetBoost: () => { approved: boolean; feedbackText: string };
  onScoutVacancies: () => { foundCount: number; feedbackText: string };
  onAcceptNationalOffer?: (offerId: string) => void;
  onDeclineNationalOffer?: (offerId: string) => void;
  onScoutNationalVacancies?: () => { offersCount: number; feedbackText: string };
  onApplyNationalJob?: (teamId: string) => { accepted: boolean; feedbackText: string };
  onHireRealCoachForClub?: (coachId: string) => {
    success: boolean;
    feedbackText: string;
  };
  onResignFromClub?: () => { offersCount: number };
  onApplyToClubJob?: (clubId: string) => {
    accepted: boolean;
    feedbackText: string;
  };
  onResolveLockerDemand?: (
    demandId: string,
    choice: 'PROMISE_STARTER' | 'REWARD_BONUS' | 'DEMAND_PATIENCE' | 'FIRM_AUTHORITY'
  ) => { feedbackText: string; positive: boolean };
  onHoldPlayerTalk?: (
    playerId: string,
    tone: 'PRAISE_FORM' | 'DEMAND_FOCUS' | 'REST_RECOVERY'
  ) => { feedbackText: string; positive: boolean };
  onStartPressConference?: () => void;
  onSubmitPressConference?: (
    answers: Record<string, string>
  ) => { feedbackText: string };
}

function getConfidenceDescriptor(value: number): {
  label: string;
  textColor: string;
  barColor: string;
} {
  if (value >= 82) {
    return {
      label: 'Respaldo Total',
      textColor: 'text-emerald-400',
      barColor: 'bg-emerald-400',
    };
  }
  if (value >= 62) {
    return {
      label: 'Cargo Estável',
      textColor: 'text-sky-400',
      barColor: 'bg-sky-400',
    };
  }
  if (value >= 40) {
    return {
      label: 'Sob Observação',
      textColor: 'text-amber-400',
      barColor: 'bg-amber-400',
    };
  }
  return {
    label: 'Cargo Ameaçado',
    textColor: 'text-rose-400',
    barColor: 'bg-rose-500',
  };
}

function getGoalStatusPresentation(status: BoardGoalStatus) {
  switch (status) {
    case 'ACHIEVED':
      return {
        label: 'Meta Cumprida',
        color: 'text-emerald-400',
        Icon: CheckCircle2,
      };
    case 'ON_TRACK':
      return {
        label: 'No Caminho Certo',
        color: 'text-sky-400',
        Icon: ShieldCheck,
      };
    case 'AT_RISK':
      return {
        label: 'Atenção Exigida',
        color: 'text-amber-400',
        Icon: AlertTriangle,
      };
    case 'FAILED':
      return {
        label: 'Meta Não Atingida',
        color: 'text-rose-400',
        Icon: XCircle,
      };
  }
}

export const BoardCareerView: React.FC<BoardCareerViewProps> = ({
  userClub,
  managerName,
  seasonYear,
  currentRound,
  career,
  gameState,
  initialSubTab = 'goals',
  onAcceptOffer,
  onDeclineOffer,
  onRequestBudgetBoost,
  onScoutVacancies,
  onAcceptNationalOffer,
  onDeclineNationalOffer,
  onScoutNationalVacancies,
  onApplyNationalJob,
  onHireRealCoachForClub,
  onResignFromClub,
  onApplyToClubJob,
  onResolveLockerDemand,
  onHoldPlayerTalk,
  onStartPressConference,
  onSubmitPressConference,
}) => {
  const [subTab, setSubTab] = useState<
    'goals' | 'locker_room' | 'press' | 'carousel' | 'offers' | 'history' | 'achievements'
  >(initialSubTab || 'goals');

  React.useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [carouselSection, setCarouselSection] = useState<
    'hire_free' | 'clubs_radar' | 'national_teams' | 'movements'
  >('clubs_radar');
  const [radarDivision, setRadarDivision] = useState<Division>('A');
  const [ntConfedFilter, setNtConfedFilter] = useState<'ALL' | ConfederationCode>('ALL');
  const [coachSearch, setCoachSearch] = useState<string>('');
  const [confirmHireCoachId, setConfirmHireCoachId] = useState<string | null>(null);
  const [confirmResign, setConfirmResign] = useState<boolean>(false);

  const [actionBanner, setActionBanner] = useState<{
    positive: boolean;
    message: string;
  } | null>(null);
  const [confirmOfferId, setConfirmOfferId] = useState<string | null>(null);
  const [confirmNatOfferId, setConfirmNatOfferId] = useState<string | null>(null);

  const carousel = useMemo(() => ensureCoachingCarouselState(gameState), [gameState]);
  const lockerRoom = useMemo(() => ensureLockerRoomState(gameState), [gameState]);
  const hallOfFameSummary = useMemo(
    () => evaluateManagerAchievementsAndHallOfFame(gameState, userClub),
    [gameState, userClub]
  );
  const managerSpecialty = useMemo(
    () => getManagerSpecialtyProfile(gameState.managerSpecialty),
    [gameState.managerSpecialty]
  );
  const activeChallengeEval = useMemo(
    () => evaluateChallengeStatus(gameState),
    [gameState]
  );
  const pendingDemandsCount = lockerRoom.activeDemands.filter((d) => d.status === 'PENDING').length;

  const pendingOffers = useMemo(
    () => career.jobOffers.filter((o) => o.status === 'PENDING'),
    [career.jobOffers]
  );

  const pastOffers = useMemo(
    () => career.jobOffers.filter((o) => o.status !== 'PENDING'),
    [career.jobOffers]
  );

  const pendingNationalOffers = useMemo(
    () =>
      (gameState.nationalTeam?.pendingNationalOffers || []).filter((o) => o.status === 'PENDING'),
    [gameState.nationalTeam?.pendingNationalOffers]
  );

  const pastNationalOffers = useMemo(
    () =>
      (gameState.nationalTeam?.pendingNationalOffers || []).filter((o) => o.status !== 'PENDING'),
    [gameState.nationalTeam?.pendingNationalOffers]
  );

  const totalPendingOffersCount = pendingOffers.length + pendingNationalOffers.length;

  const nationalCoachesMap = useMemo(
    () => ensureNationalTeamCoachesMap(gameState.nationalTeam, managerName),
    [gameState.nationalTeam, managerName]
  );

  const filteredNationalTeams = useMemo(() => {
    const q = coachSearch.trim().toLowerCase();
    return NATIONAL_TEAMS_CATALOG.filter((team) => {
      if (ntConfedFilter !== 'ALL' && team.confederation !== ntConfedFilter) return false;
      if (!q) return true;
      const coach = nationalCoachesMap[team.id]?.coachName || '';
      return (
        team.name.toLowerCase().includes(q) ||
        team.federationCode.toLowerCase().includes(q) ||
        coach.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      const recA = getNationalTeamCoachRecord(gameState.nationalTeam, a.id, managerName);
      const recB = getNationalTeamCoachRecord(gameState.nationalTeam, b.id, managerName);
      return recA.security - recB.security || b.strength - a.strength;
    });
  }, [coachSearch, ntConfedFilter, nationalCoachesMap, gameState.nationalTeam, managerName]);

  const careerTotals = useMemo(() => {
    const matches = career.careerStints.reduce((acc, s) => acc + s.matches, 0);
    const wins = career.careerStints.reduce((acc, s) => acc + s.wins, 0);
    const draws = career.careerStints.reduce((acc, s) => acc + s.draws, 0);
    const losses = career.careerStints.reduce((acc, s) => acc + s.losses, 0);
    const pointsPct =
      matches > 0 ? Math.round(((wins * 3 + draws) / (matches * 3)) * 100) : 0;
    return { matches, wins, draws, losses, pointsPct };
  }, [career.careerStints]);

  const filteredRadarClubs = useMemo(() => {
    const q = coachSearch.trim().toLowerCase();
    return gameState.clubs
      .filter((c) =>
        radarDivision === 'EST'
          ? c.division === 'EST' || c.state === 'RN'
          : c.division === radarDivision
      )
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.managerName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const secA =
          a.id === userClub.id
            ? career.boardConfidence
            : carousel.clubCoachSecurity[a.id] ?? 72;
        const secB =
          b.id === userClub.id
            ? career.boardConfidence
            : carousel.clubCoachSecurity[b.id] ?? 72;
        return secA - secB; // Most pressured coaches at the top!
      });
  }, [gameState.clubs, radarDivision, coachSearch, userClub.id, career.boardConfidence, carousel]);

  const filteredFreeCoaches = useMemo(() => {
    const q = coachSearch.trim().toLowerCase();
    return carousel.freeAgentCoaches.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.styleLabel.toLowerCase().includes(q) ||
        c.nationality.toLowerCase().includes(q)
      );
    });
  }, [carousel.freeAgentCoaches, coachSearch]);

  const boardDesc = getConfidenceDescriptor(career.boardConfidence);
  const fanDesc = getConfidenceDescriptor(career.fanConfidence);
  const currentSeveranceCost = Math.round((career.monthlySalary || 180_000) * 1.5);

  const handleRequestBudgetClick = () => {
    soundEngine.playClick();
    const res = onRequestBudgetBoost();
    setActionBanner({
      positive: res.approved,
      message: res.feedbackText,
    });
  };

  const handleScoutVacanciesClick = () => {
    soundEngine.playClick();
    const res = onScoutVacancies();
    setActionBanner({
      positive: res.foundCount > 0,
      message: res.feedbackText,
    });
  };

  const handleScoutNationalClick = () => {
    if (!onScoutNationalVacancies) return;
    soundEngine.playClick();
    const res = onScoutNationalVacancies();
    setActionBanner({
      positive: res.offersCount > 0,
      message: res.feedbackText,
    });
  };

  const handleConfirmAcceptNational = (offer: NationalTeamJobOffer) => {
    if (!onAcceptNationalOffer) return;
    soundEngine.playFanfare();
    setConfirmNatOfferId(null);
    onAcceptNationalOffer(offer.id);
    setActionBanner({
      positive: true,
      message: `Apresentado! Você agora comanda a seleção de ${offer.teamName} (${offer.federationCode}) em regime de duplo comando.`,
    });
  };

  const handleApplyToNational = (teamId: string) => {
    if (!onApplyNationalJob) return;
    soundEngine.playClick();
    const res = onApplyNationalJob(teamId);
    if (res.accepted) {
      soundEngine.playFanfare();
      setSubTab('offers');
    }
    setActionBanner({
      positive: res.accepted,
      message: res.feedbackText,
    });
  };

  const handleConfirmAccept = (offer: ManagerJobOffer) => {
    soundEngine.playFanfare();
    setConfirmOfferId(null);
    onAcceptOffer(offer.id);
    setActionBanner({
      positive: true,
      message: `Contrato assinado! Você agora é o treinador oficial do ${offer.clubName}.`,
    });
    setSubTab('goals');
  };

  const handleConfirmHireRealCoach = (coachId: string) => {
    if (!onHireRealCoachForClub) return;
    soundEngine.playClick();
    const res = onHireRealCoachForClub(coachId);
    setConfirmHireCoachId(null);
    if (res.success) {
      soundEngine.playFanfare();
    } else {
      soundEngine.playWhistle(false);
    }
    setActionBanner({
      positive: res.success,
      message: res.feedbackText,
    });
  };

  const handleConfirmResign = () => {
    if (!onResignFromClub) return;
    soundEngine.playWhistle(false);
    setConfirmResign(false);
    const res = onResignFromClub();
    setActionBanner({
      positive: true,
      message: `Você entregou o cargo no ${userClub.shortName}. Confira as ${res.offersCount} propostas imediatas para assumir um novo clube!`,
    });
    setSubTab('offers');
  };

  const handleApplyToClub = (club: Club) => {
    if (!onApplyToClubJob) return;
    soundEngine.playClick();
    const res = onApplyToClubJob(club.id);
    if (res.accepted) {
      soundEngine.playFanfare();
      setSubTab('offers');
    }
    setActionBanner({
      positive: res.accepted,
      message: res.feedbackText,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Summary & Segmented Navigation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-base border border-white/15 shrink-0"
              style={{
                backgroundColor: userClub.colors.primary,
                color: userClub.colors.text,
              }}
            >
              {userClub.initials}
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-400">
                Sala da Presidência & Gestão de Carreira · Temporada{' '}
                <span className="tabular-nums">{seasonYear}</span>
              </p>
              <h2 className="text-2xl font-bold text-white leading-tight">{managerName}</h2>
              <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                Comando atual: <strong className="text-slate-200">{userClub.name}</strong> · Série{' '}
                {userClub.division} · Salário{' '}
                <span className="font-mono text-emerald-400">
                  {formatCurrency(career.monthlySalary)}/mês
                </span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="text-sky-300 font-semibold">
                  Especialidade: {managerSpecialty.title}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">
                  {managerSpecialty.bullets[0]}
                </span>
                {activeChallengeEval && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className="text-amber-300 font-semibold">
                      Desafio: {activeChallengeEval.active.title} ({activeChallengeEval.progressText})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <ScrollableTabStrip
            activeKey={subTab}
            ariaLabel="Sub-abas de Diretoria e Carreira"
            className="w-full xl:w-auto max-w-full self-start xl:self-auto"
            innerClassName="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800"
          >
            <button
              type="button"
              data-tab-active={subTab === 'goals' ? 'true' : undefined}
              onClick={() => {
                soundEngine.playClick();
                setSubTab('goals');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'goals'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5 shrink-0" />
              <span>Metas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('locker_room');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'locker_room'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Vestiário</span>
              {pendingDemandsCount > 0 && (
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    subTab === 'locker_room' ? 'text-slate-950/80' : 'text-amber-400 font-bold'
                  }`}
                >
                  ({pendingDemandsCount})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('press');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'press'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5 shrink-0" />
              <span>Imprensa</span>
              {lockerRoom.activePressConference && (
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    subTab === 'press' ? 'text-slate-950/80' : 'text-emerald-400 font-bold'
                  }`}
                >
                  (Ao Vivo)
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('carousel');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'carousel'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Dança das Cadeiras & Técnicos</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  subTab === 'carousel' ? 'text-slate-950/80' : 'text-sky-400'
                }`}
              >
                ({carousel.freeAgentCoaches.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('offers');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'offers'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>Propostas ({totalPendingOffersCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('history');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'history'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Currículo</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  subTab === 'history' ? 'text-slate-950/80' : 'text-slate-500'
                }`}
              >
                ({career.careerStints.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('achievements');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'achievements'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-amber-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>Conquistas & Hall da Fama</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  subTab === 'achievements' ? 'text-slate-950/80' : 'text-amber-400/80'
                }`}
              >
                ({hallOfFameSummary.unlockedCount}/{hallOfFameSummary.totalCount})
              </span>
            </button>
          </ScrollableTabStrip>
        </div>

        {/* Board Evaluation Note & Resignation Control */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <p className="text-slate-300">
            <span className="text-slate-500">Parecer do Conselho:</span>{' '}
            {career.lastEvaluationNote}
          </p>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className="text-slate-400 font-mono tabular-nums">
              Rodada {currentRound} · Aproveitamento: {careerTotals.pointsPct}%
            </span>

            {onResignFromClub && (
              confirmResign ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-rose-300 font-semibold">Entregar o cargo?</span>
                  <button
                    type="button"
                    onClick={handleConfirmResign}
                    className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    Confirmar Saída
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResign(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setConfirmResign(true);
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-950 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-rose-300 font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Pedir Demissão</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {actionBanner && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-4 ${
            actionBanner.positive
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
          }`}
        >
          <span>{actionBanner.message}</span>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="text-slate-400 hover:text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Confiança da Diretoria</span>
            <span className={`text-xs font-semibold ${boardDesc.textColor}`}>
              {boardDesc.label}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono tabular-nums">
              {career.boardConfidence}%
            </span>
            <span className="text-xs text-slate-500">mín. segurança: 30%</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
            <div
              className={`h-full ${boardDesc.barColor} transition-transform duration-200 origin-left`}
              style={{ width: `${career.boardConfidence}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Apoio da Torcida</span>
            <span className={`text-xs font-semibold ${fanDesc.textColor}`}>{fanDesc.label}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono tabular-nums">
              {career.fanConfidence}%
            </span>
            <span className="text-xs text-slate-500">arquibancada</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
            <div
              className={`h-full ${fanDesc.barColor} transition-transform duration-200 origin-left`}
              style={{ width: `${career.fanConfidence}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Prestígio do Treinador</span>
            <TrendingUp className="w-4 h-4 text-sky-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-400 font-mono tabular-nums">
              {career.managerReputation}/100
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 tabular-nums">
            {careerTotals.wins}V · {careerTotals.draws}E · {careerTotals.losses}D na carreira
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Dança das Cadeiras ({seasonYear})</span>
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
              {carousel.movementHistory.length}
            </span>
            <span className="text-xs text-slate-400">
              {carousel.movementHistory.length === 1 ? 'troca registrada' : 'trocas registradas'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 tabular-nums">
            {carousel.freeAgentCoaches.length} técnicos reais livres no mercado
          </p>
        </div>
      </div>

      {/* SUB-TAB 1: METAS DA TEMPORADA & REUNIÃO COM CONSELHO */}
      {subTab === 'goals' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">
                Metas Oficiais da Diretoria ({seasonYear})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cumprir os objetivos libera bônus imediatos no caixa do {userClub.name} e eleva sua
                moral com o conselho.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRequestBudgetClick}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-400 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span>Pedir Aporte Extra ao Conselho</span>
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                  <th className="py-3 pr-4">Objetivo & Competição</th>
                  <th className="py-3 px-4">Prioridade</th>
                  <th className="py-3 px-4">Andamento Atual</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 pl-4 text-right">Bônus por Cumprimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {career.seasonGoals.map((goal) => {
                  const statusPres = getGoalStatusPresentation(goal.status);
                  const StatusIcon = statusPres.Icon;
                  return (
                    <tr key={goal.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="font-bold text-white text-sm">{goal.title}</div>
                        <div className="text-slate-400 mt-0.5">
                          {goal.competitionLabel} · {goal.description}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-slate-300 font-medium">
                        {goal.priority}
                      </td>
                      <td className="py-4 px-4 text-slate-200 tabular-nums whitespace-nowrap">
                        {goal.currentProgressText}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 font-semibold ${statusPres.color}`}>
                          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{statusPres.label}</span>
                        </div>
                      </td>
                      <td className="py-4 pl-4 text-right whitespace-nowrap font-mono tabular-nums">
                        <div className="font-bold text-emerald-400">
                          +{formatCurrency(goal.rewardBonus)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {goal.bonusClaimed ? 'Bônus pago em caixa' : 'Pago ao atingir'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DANÇA DAS CADEIRAS & TREINADORES REAIS */}
      {subTab === 'carousel' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Central de Treinadores Reais & Dança das Cadeiras ({seasonYear})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acompanhe a pressão sobre os técnicos de todas as divisões, candidate-se a cargos ameaçados ou contrate um treinador real livre para comandar o {userClub.name}.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setCarouselSection('clubs_radar');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    carouselSection === 'clubs_radar'
                      ? 'bg-sky-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Técnicos nos Clubes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setCarouselSection('national_teams');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    carouselSection === 'national_teams'
                      ? 'bg-indigo-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Técnicos de Seleções ({NATIONAL_TEAMS_CATALOG.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setCarouselSection('hire_free');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    carouselSection === 'hire_free'
                      ? 'bg-emerald-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Técnicos Livres ({carousel.freeAgentCoaches.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setCarouselSection('movements');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    carouselSection === 'movements'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Demissões & Anúncios ({carousel.movementHistory.length})
                </button>
              </div>
            </div>

            {/* Search & Division Filter Bar */}
            {carouselSection !== 'movements' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={
                      carouselSection === 'clubs_radar'
                        ? 'Buscar clube ou treinador...'
                        : carouselSection === 'national_teams'
                        ? 'Buscar seleção, federação ou técnico...'
                        : 'Buscar treinador livre, país ou estilo...'
                    }
                    value={coachSearch}
                    onChange={(e) => setCoachSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                {carouselSection === 'clubs_radar' && (
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                    {(
                      [
                        { id: 'A', label: 'Série A' },
                        { id: 'B', label: 'Série B' },
                        { id: 'C', label: 'Série C' },
                        { id: 'D', label: 'Série D' },
                        { id: 'EST', label: 'Estaduais' },
                        { id: 'SA', label: 'América do Sul' },
                        { id: 'EU', label: 'Europa' },
                        { id: 'WL', label: 'Mundo' },
                      ] as const
                    ).map((divTab) => (
                      <button
                        key={divTab.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setRadarDivision(divTab.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          radarDivision === divTab.id
                            ? 'bg-sky-400 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {divTab.label}
                      </button>
                    ))}
                  </div>
                )}

                {carouselSection === 'national_teams' && (
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                    {(
                      ['ALL', 'CONMEBOL', 'UEFA', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as const
                    ).map((conf) => (
                      <button
                        key={conf}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setNtConfedFilter(conf);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          ntConfedFilter === conf
                            ? 'bg-indigo-400 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {conf === 'ALL' ? 'Todas' : conf}
                      </button>
                    ))}
                  </div>
                )}

                {carouselSection === 'hire_free' && (
                  <div className="text-xs text-slate-400 tabular-nums">
                    Caixa do {userClub.shortName}:{' '}
                    <strong className="text-emerald-400 font-mono">
                      {formatCurrency(userClub.finances.balance)}
                    </strong>{' '}
                    · Rescisão atual:{' '}
                    <strong className="text-rose-300 font-mono">
                      {formatCurrency(currentSeveranceCost)}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* SECTION A: RADAR DE TÉCNICOS NOS CLUBES */}
            {carouselSection === 'clubs_radar' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-3 pr-4">Clube</th>
                      <th className="py-3 px-4">Treinador Atual</th>
                      <th className="py-3 px-4">Filosofia & Esquema</th>
                      <th className="py-3 px-4">Estabilidade no Cargo</th>
                      <th className="py-3 pl-4 text-right">Ação de Carreira</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredRadarClubs.slice(0, 48).map((club) => {
                      const isUserTeam = club.id === userClub.id;
                      const security = isUserTeam
                        ? career.boardConfidence
                        : carousel.clubCoachSecurity[club.id] ?? 72;
                      const secDesc = getCoachSecurityDescriptor(security);
                      const profile = buildRealCoachProfileFromName(club.managerName, club);
                      const canApply = !isUserTeam && security <= 55;

                      return (
                        <tr key={club.id} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[11px] border border-white/15 shrink-0"
                                style={{
                                  backgroundColor: club.colors.primary,
                                  color: club.colors.text,
                                }}
                              >
                                {club.initials}
                              </div>
                              <div>
                                <div className="font-bold text-white">{club.name}</div>
                                <div className="text-[11px] text-slate-500">
                                  {club.country && club.country !== 'Brasil'
                                    ? club.country
                                    : `${club.state} · Série ${club.division}`}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-100">
                              {club.managerName}
                              {isUserTeam ? ' (Você)' : ''}
                            </div>
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              {profile.nationality} · Prestígio {profile.prestige}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300">
                            <div className="font-semibold text-sky-300">
                              {club.tactics?.formation || profile.preferredFormation} ·{' '}
                              {club.tactics?.mentality || profile.mentality}
                            </div>
                            <div className="text-[11px] text-slate-400">{profile.styleLabel}</div>
                          </td>

                          <td className="py-3.5 px-4 min-w-[165px]">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className={`font-semibold ${secDesc.colorClass}`}>
                                {secDesc.label}
                              </span>
                              <span className="font-mono text-slate-300 tabular-nums">
                                {security}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${secDesc.barClass}`}
                                style={{ width: `${security}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                            {isUserTeam ? (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  setCarouselSection('hire_free');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-sky-300 font-semibold cursor-pointer transition-colors"
                              >
                                Trocar Comando
                              </button>
                            ) : canApply ? (
                              <button
                                type="button"
                                onClick={() => handleApplyToClub(club)}
                                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold cursor-pointer transition-colors"
                              >
                                Sondar Vaga
                              </button>
                            ) : (
                              <span className="text-slate-500">Respaldado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* SECTION A2: RADAR DE TÉCNICOS NAS SELEÇÕES */}
            {carouselSection === 'national_teams' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-3 pr-4">Seleção</th>
                      <th className="py-3 px-4">Treinador Atual</th>
                      <th className="py-3 px-4">Retrospecto & Força</th>
                      <th className="py-3 px-4">Estabilidade na Federação</th>
                      <th className="py-3 pl-4 text-right">Ação de Carreira</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredNationalTeams.slice(0, 60).map((team) => {
                      const isUserTeam =
                        Boolean(gameState.nationalTeam?.isUserCoach) &&
                        (gameState.nationalTeam?.userTeamId || 'nt_bra') === team.id;
                      const rec = getNationalTeamCoachRecord(
                        gameState.nationalTeam,
                        team.id,
                        managerName
                      );
                      const secDesc = getCoachSecurityDescriptor(rec.security);
                      const canApply =
                        !isUserTeam &&
                        (rec.security <= 62 ||
                          career.managerReputation >= team.minReputationToCoach + 12);

                      return (
                        <tr key={team.id} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[11px] border border-white/15 shrink-0"
                                style={{
                                  backgroundColor: team.primaryColor,
                                  color: team.textColor,
                                }}
                              >
                                {team.code}
                              </div>
                              <div>
                                <div className="font-bold text-white">{team.name}</div>
                                <div className="text-[11px] text-slate-500">
                                  {team.confederation} · {team.federationCode} · Rep mín.{' '}
                                  {team.minReputationToCoach}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-100">
                              {rec.coachName}
                              {isUserTeam ? ' (Você)' : ''}
                            </div>
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              {rec.nationality} · Prestígio {rec.prestige}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300 font-mono tabular-nums">
                            <div className="font-semibold text-sky-300">
                              Força {team.strength} · {rec.matches}J
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {rec.wins}V · {rec.draws}E · {rec.losses}D
                            </div>
                          </td>

                          <td className="py-3.5 px-4 min-w-[165px]">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className={`font-semibold ${secDesc.colorClass}`}>
                                {secDesc.label}
                              </span>
                              <span className="font-mono text-slate-300 tabular-nums">
                                {rec.security}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${secDesc.barClass}`}
                                style={{ width: `${rec.security}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                            {isUserTeam ? (
                              <span className="font-semibold text-emerald-400">Seu Comando</span>
                            ) : canApply && onApplyNationalJob ? (
                              <button
                                type="button"
                                onClick={() => handleApplyToNational(team.id)}
                                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                              >
                                Sondar Cargo
                              </button>
                            ) : (
                              <span className="text-slate-500">Respaldado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* SECTION B: CONTRATAR TREINADOR REAL LIVRE PARA O SEU CLUBE */}
            {carouselSection === 'hire_free' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-slate-300 leading-relaxed">
                    Como presidente/diretor do <strong className="text-white">{userClub.name}</strong>, você pode encerrar o ciclo de{' '}
                    <strong className="text-amber-300">{managerName}</strong> (multa rescisória de{' '}
                    <span className="font-mono tabular-nums">{formatCurrency(currentSeveranceCost)}</span>) e contratar qualquer treinador real disponível abaixo. O esquema tático preferido do novo comandante será aplicado automaticamente.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredFreeCoaches.map((coach) => {
                    const totalCost = currentSeveranceCost + coach.signingFee;
                    const canAfford = userClub.finances.balance >= totalCost;
                    const isConfirming = confirmHireCoachId === coach.id;

                    return (
                      <div
                        key={coach.id}
                        className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-bold text-white">{coach.name}</h4>
                              <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                                {coach.nationality} · {coach.age} anos · Prestígio{' '}
                                <strong className="text-sky-400 font-mono">{coach.prestige}</strong>
                              </p>
                            </div>
                            <div className="text-right text-xs font-mono tabular-nums shrink-0">
                              <div className="text-emerald-400 font-bold">
                                {formatCurrency(coach.monthlySalaryDemand)}/mês
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Luvas: {formatCurrency(coach.signingFee)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-slate-300">
                            <span className="text-sky-300 font-semibold">
                              {coach.preferredFormation} · {coach.mentality}
                            </span>{' '}
                            · {coach.styleLabel}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-slate-400 font-mono tabular-nums">
                            Total c/ rescisão:{' '}
                            <strong className={canAfford ? 'text-white' : 'text-rose-400'}>
                              {formatCurrency(totalCost)}
                            </strong>
                          </span>

                          {isConfirming ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleConfirmHireRealCoach(coach.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                              >
                                Confirmar Anúncio
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmHireCoachId(null)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAfford}
                              onClick={() => {
                                soundEngine.playClick();
                                setConfirmHireCoachId(coach.id);
                              }}
                              className={`px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                                canAfford
                                  ? 'bg-sky-400 hover:bg-sky-300 text-slate-950 cursor-pointer'
                                  : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>Demitir Atual & Contratar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION C: BOLETIM DE DEMISSÕES E CONTRATAÇÕES DA TEMPORADA */}
            {carouselSection === 'movements' && (
              <div>
                {carousel.movementHistory.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                    <RefreshCw className="w-8 h-8 text-slate-600 mx-auto mb-2.5" />
                    <p className="text-sm font-semibold text-slate-200">
                      Nenhuma demissão registrada até esta rodada
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      À medida que os campeonatos avançam a partir da 5ª rodada, clubes e seleções em crise demitem seus treinadores e vão ao mercado.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 text-xs">
                    {carousel.movementHistory.map((item) => (
                      <div
                        key={item.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-white text-sm">
                            {item.clubName}{' '}
                            <span className="text-xs font-normal text-slate-400">
                              {item.entityType === 'NATIONAL_TEAM' || item.clubDivision === 'SELECAO'
                                ? `· Seleção Nacional${item.confederation ? ` (${item.confederation})` : ''}`
                                : `· Série ${item.clubDivision}`}
                            </span>
                          </div>
                          <div className="text-slate-300 mt-0.5">
                            {item.sackedCoachName ? (
                              <>
                                Saiu <strong className="text-rose-300">{item.sackedCoachName}</strong>
                                {item.hiredCoachName ? (
                                  <>
                                    {' '}
                                    · Assumiu{' '}
                                    <strong className="text-emerald-400">
                                      {item.hiredCoachName}
                                    </strong>
                                  </>
                                ) : null}
                              </>
                            ) : (
                              <>
                                Novo comando:{' '}
                                <strong className="text-emerald-400">{item.hiredCoachName}</strong>
                              </>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.reason}</div>
                        </div>

                        <div className="text-left sm:text-right font-mono tabular-nums shrink-0">
                          <div className="text-slate-300">
                            Rodada {item.round} · {formatShortDate(item.date)}
                          </div>
                          {item.severancePaid ? (
                            <div className="text-[11px] text-amber-400">
                              Multa/Luvas: {formatCurrency(item.severancePaid)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PROPOSTAS OFICIAIS DE CLUBES & SELEÇÕES */}
      {subTab === 'offers' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Propostas de Clubes & Seleções
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Grandes campanhas atraem convites naturais. Você também pode pedir ao seu
                  empresário para sondar vagas abertas em clubes ou federações nacionais.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleScoutVacanciesClick}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  <span>Sondar Clubes</span>
                </button>
                {onScoutNationalVacancies && (
                  <button
                    type="button"
                    onClick={handleScoutNationalClick}
                    className="px-4 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5 shrink-0" />
                    <span>Sondar Seleções</span>
                  </button>
                )}
              </div>
            </div>

            {totalPendingOffersCount === 0 ? (
              <div className="text-center py-12 mt-4 border border-dashed border-slate-800 rounded-xl">
                <Briefcase className="w-9 h-9 text-slate-600 mx-auto mb-2.5" />
                <p className="text-sm font-semibold text-slate-200">
                  Nenhuma proposta oficial pendente neste momento
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Mantenha a confiança em alta para receber convites espontâneos, sonde vagas com seu empresário ou candidate-se a cargos pressionados na aba Dança das Cadeiras.
                </p>
              </div>
            ) : (
              <div className="space-y-6 mt-4">
                {pendingNationalOffers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2 flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 shrink-0" />
                      <span>Convites de Seleções Nacionais ({pendingNationalOffers.length})</span>
                    </h4>
                    <div className="divide-y divide-slate-800 border-t border-slate-800">
                      {pendingNationalOffers.map((offer) => {
                        const isConfirming = confirmNatOfferId === offer.id;
                        const coachingOther = Boolean(gameState.nationalTeam?.isUserCoach);
                        return (
                          <div
                            key={offer.id}
                            className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs border border-white/15 shrink-0 mt-0.5"
                                style={{
                                  backgroundColor: offer.primaryColor,
                                  color: offer.textColor,
                                }}
                              >
                                {offer.teamCode}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-base font-bold text-white">
                                  Seleção de {offer.teamName} ({offer.federationCode})
                                </h4>
                                <p className="text-xs text-slate-300 mt-0.5 tabular-nums">
                                  {offer.confederation} · Força {offer.strength} · Regime de Duplo Comando (mantém o seu clube)
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {offer.reason} · Válido até {formatShortDate(offer.expiresDate)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isConfirming ? (
                                <>
                                  <span className="text-xs text-amber-300 font-medium mr-1">
                                    {coachingOther ? 'Trocar de seleção?' : 'Assumir seleção?'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmAcceptNational(offer)}
                                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmNatOfferId(null)}
                                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (coachingOther) {
                                        soundEngine.playClick();
                                        setConfirmNatOfferId(offer.id);
                                      } else {
                                        handleConfirmAcceptNational(offer);
                                      }
                                    }}
                                    className="px-4 py-2 rounded-lg bg-indigo-400 hover:bg-indigo-300 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    Assumir Seleção
                                  </button>
                                  {onDeclineNationalOffer && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playClick();
                                        onDeclineNationalOffer(offer.id);
                                        setActionBanner({
                                          positive: true,
                                          message: `Convite da ${offer.federationCode} (${offer.teamName}) recusado.`,
                                        });
                                      }}
                                      className="px-3.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                    >
                                      Recusar
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pendingOffers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                      <span>Propostas de Clubes ({pendingOffers.length})</span>
                    </h4>
                    <div className="divide-y divide-slate-800 border-t border-slate-800">
                      {pendingOffers.map((offer) => {
                        const isConfirming = confirmOfferId === offer.id;
                        return (
                          <div
                            key={offer.id}
                            className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs border border-white/15 shrink-0 mt-0.5"
                                style={{
                                  backgroundColor: offer.clubColors.primary,
                                  color: offer.clubColors.text,
                                }}
                              >
                                {offer.clubShortName.slice(0, 3).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-base font-bold text-white">{offer.clubName}</h4>
                                <p className="text-xs text-slate-300 mt-0.5 tabular-nums">
                                  Série {offer.clubDivision} · Elenco OVR {offer.clubSquadAvgOvr} · Caixa{' '}
                                  <span className="font-mono text-emerald-400">
                                    {formatCurrency(offer.transferBudgetPreview)}
                                  </span>{' '}
                                  · Salário oferecido{' '}
                                  <span className="font-mono text-sky-300">
                                    {formatCurrency(offer.offeredMonthlySalary)}/mês
                                  </span>
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {offer.reason} · Recebida em {offer.createdDate} · Válida até a rodada{' '}
                                  <span className="tabular-nums">{offer.expiresRound}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isConfirming ? (
                                <>
                                  <span className="text-xs text-amber-300 font-medium mr-1">
                                    Deixar o {userClub.shortName}?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmAccept(offer)}
                                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    Confirmar Assinatura
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmOfferId(null)}
                                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playClick();
                                      setConfirmOfferId(offer.id);
                                    }}
                                    className="px-4 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    Assumir Clube
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playClick();
                                      onDeclineOffer(offer.id);
                                      setActionBanner({
                                        positive: true,
                                        message: `Proposta do ${offer.clubName} recusada. A torcida do ${userClub.shortName} valorizou sua lealdade (+3% apoio)!`,
                                      });
                                    }}
                                    className="px-3.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    Recusar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {(pastOffers.length > 0 || pastNationalOffers.length > 0) && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h4 className="text-sm font-bold text-slate-200 mb-3">
                Histórico de Convites Anteriores
              </h4>
              <div className="divide-y divide-slate-800/70 text-xs">
                {pastNationalOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="py-2.5 flex items-center justify-between gap-4 text-slate-400"
                  >
                    <div className="truncate">
                      <strong className="text-slate-200">Seleção de {offer.teamName}</strong> ·{' '}
                      {offer.federationCode} ({offer.confederation})
                    </div>
                    <span className="shrink-0 font-medium">
                      {offer.status === 'ACCEPTED'
                        ? 'Convite Aceito'
                        : offer.status === 'DECLINED'
                        ? 'Recusado'
                        : 'Expirado'}
                    </span>
                  </div>
                ))}
                {pastOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="py-2.5 flex items-center justify-between gap-4 text-slate-400"
                  >
                    <div className="truncate">
                      <strong className="text-slate-200">{offer.clubName}</strong> · Série{' '}
                      {offer.clubDivision} · Salário{' '}
                      <span className="font-mono tabular-nums">
                        {formatCurrency(offer.offeredMonthlySalary)}/mês
                      </span>
                    </div>
                    <span className="shrink-0 font-medium">
                      {offer.status === 'ACCEPTED'
                        ? 'Contrato Assinado'
                        : offer.status === 'DECLINED'
                        ? 'Recusada'
                        : 'Expirada'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: HISTÓRICO DE PASSAGENS POR CLUBES & SELEÇÕES */}
      {subTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1">
              Currículo de Passagens por Clubes
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Retrospecto completo de jogos, vitórias, aproveitamento e títulos em cada instituição
              que você comandou.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                    <th className="py-3 pr-4">Clube</th>
                    <th className="py-3 px-4">Período</th>
                    <th className="py-3 px-4 text-right">Jogos</th>
                    <th className="py-3 px-4 text-right">V · E · D</th>
                    <th className="py-3 px-4 text-right">Aproveitamento</th>
                    <th className="py-3 px-4 text-right">Títulos</th>
                    <th className="py-3 pl-4 text-right">Vínculo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {career.careerStints.map((stint) => {
                    const pct =
                      stint.matches > 0
                        ? Math.round(
                            ((stint.wins * 3 + stint.draws) / (stint.matches * 3)) * 100
                          )
                        : 0;
                    return (
                      <tr key={stint.id} className="hover:bg-slate-950/40">
                        <td className="py-3.5 pr-4">
                          <div className="font-bold text-white">{stint.clubName}</div>
                          <div className="text-slate-400">
                            Assumiu na Série {stint.divisionAtStart}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300 tabular-nums whitespace-nowrap">
                          {formatShortDate(stint.startDate)} —{' '}
                          {stint.endDate ? formatShortDate(stint.endDate) : 'Atual'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white tabular-nums">
                          {stint.matches}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                          {stint.wins}V · {stint.draws}E · {stint.losses}D
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-sky-400 tabular-nums">
                          {pct}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400 tabular-nums">
                          {stint.trophiesWon}
                        </td>
                        <td className="py-3.5 pl-4 text-right text-slate-300 whitespace-nowrap">
                          {stint.statusLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {(gameState.nationalTeam?.nationalStints?.length || 0) > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Flag className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Currículo em Seleções Nacionais</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Histórico oficial de passagens por seleções nacionais, títulos conquistados e motivos de saída.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                      <th className="py-3 pr-4">Seleção</th>
                      <th className="py-3 px-4">Período</th>
                      <th className="py-3 px-4 text-right">Jogos</th>
                      <th className="py-3 px-4 text-right">V · E · D</th>
                      <th className="py-3 px-4 text-right">Aproveitamento</th>
                      <th className="py-3 px-4 text-right">Títulos</th>
                      <th className="py-3 pl-4 text-right">Vínculo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {gameState.nationalTeam!.nationalStints!.map((stint) => {
                      const pct =
                        stint.matches > 0
                          ? Math.round(
                              ((stint.wins * 3 + stint.draws) / (stint.matches * 3)) * 100
                            )
                          : 0;
                      return (
                        <tr key={stint.id} className="hover:bg-slate-950/40">
                          <td className="py-3.5 pr-4">
                            <div className="font-bold text-white">
                              {stint.teamName} ({stint.teamCode})
                            </div>
                            <div className="text-slate-400">{stint.confederation}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300 tabular-nums whitespace-nowrap">
                            {formatShortDate(stint.startDate)} —{' '}
                            {stint.endDate ? formatShortDate(stint.endDate) : 'Atual'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-white tabular-nums">
                            {stint.matches}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                            {stint.wins}V · {stint.draws}E · {stint.losses}D
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-indigo-400 tabular-nums">
                            {pct}%
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400 tabular-nums">
                            {stint.trophiesWon}
                          </td>
                          <td
                            className={`py-3.5 pl-4 text-right whitespace-nowrap font-medium ${
                              stint.statusLabel === 'Demitido pela Federação'
                                ? 'text-rose-400'
                                : stint.statusLabel === 'Cargo Atual'
                                ? 'text-emerald-400'
                                : 'text-slate-300'
                            }`}
                          >
                            {stint.statusLabel}
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
      )}

      {subTab === 'achievements' && (
        <div className="space-y-6">
          {/* Hall of Fame Summary Strip */}
          <div className="bg-slate-900/90 border border-amber-500/35 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Crown className="w-4 h-4 shrink-0" />
                <span>Legado Mundial de Treinadores</span>
              </div>
              <h3 className="text-xl font-black text-white mt-0.5">
                {managerName} · #{hallOfFameSummary.userRankPosition} no Hall da Fama Mundial
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Desbloqueie conquistas históricas para somar pontos de legado e escalar o panteão dos maiores técnicos de todos os tempos.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-right font-mono tabular-nums shrink-0">
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                <span className="text-[11px] font-sans text-slate-400 block">Conquistas</span>
                <strong className="text-base text-emerald-400">
                  {hallOfFameSummary.unlockedCount}/{hallOfFameSummary.totalCount}
                </strong>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                <span className="text-[11px] font-sans text-slate-400 block">Pts Hall da Fama</span>
                <strong className="text-base text-amber-300">
                  {hallOfFameSummary.userHallOfFamePoints}
                </strong>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                <span className="text-[11px] font-sans text-slate-400 block">Posição Global</span>
                <strong className="text-base text-sky-400">
                  #{hallOfFameSummary.userRankPosition}
                </strong>
              </div>
            </div>
          </div>

          {/* Career Legacy Report Card (Resumo de Legado) */}
          {(() => {
            const userTrophies = (gameState.trophyHistory || []).filter((t) => t.userWon);
            const stints = career.careerStints || [];
            const totalW = stints.reduce((s, h) => s + (h.wins || 0), 0);
            const totalD = stints.reduce((s, h) => s + (h.draws || 0), 0);
            const totalL = stints.reduce((s, h) => s + (h.losses || 0), 0);
            const totalGames = totalW + totalD + totalL;
            const winRate = totalGames > 0 ? Math.round((totalW / totalGames) * 100) : 0;
            const seasonsCount = Math.max(1, seasonYear - 2026 + 1);
            const hofPts = hallOfFameSummary.userHallOfFamePoints;
            const legacyGrade =
              hofPts >= 1800 || userTrophies.length >= 10
                ? { code: 'S+', label: 'Lenda Imortal', color: 'text-amber-300 border-amber-400/50 bg-amber-500/15' }
                : hofPts >= 900 || userTrophies.length >= 5
                ? { code: 'S', label: 'Ícone Mundial', color: 'text-emerald-300 border-emerald-400/50 bg-emerald-500/15' }
                : hofPts >= 400 || userTrophies.length >= 2
                ? { code: 'A', label: 'Técnico Vitorioso', color: 'text-sky-300 border-sky-400/50 bg-sky-500/15' }
                : hofPts >= 150 || userTrophies.length >= 1
                ? { code: 'B', label: 'Em Ascensão', color: 'text-indigo-300 border-indigo-400/40 bg-indigo-500/15' }
                : { code: 'C', label: 'Início de Jornada', color: 'text-slate-300 border-slate-700 bg-slate-800/60' };
            const topTitle = userTrophies[0];

            return (
              <div className="bg-[#0c1424] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center shrink-0 font-mono ${legacyGrade.color}`}
                  >
                    <span className="text-xl font-black leading-none">{legacyGrade.code}</span>
                    <span className="text-[9px] uppercase tracking-wider mt-0.5 font-sans font-bold">
                      Nota
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Resumo de Legado na Carreira · {legacyGrade.label}
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5 truncate">
                      {topTitle
                        ? `Maior Destaque: ${topTitle.competition} (${topTitle.year}) · ${topTitle.championTeamName}`
                        : `Comandando o ${userClub.name} em busca da primeira grande taça`}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {seasonsCount} temporada{seasonsCount > 1 ? 's' : ''} ativa{seasonsCount > 1 ? 's' : ''} · {Math.max(1, new Set([...stints.map((s) => s.clubId), userClub.id]).size)} clube(s) comandado(s)
                      {gameState.nationalTeam?.userTeamId ? ' · Técnico de Seleção Nacional' : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center font-mono tabular-nums shrink-0">
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5">
                    <div className="text-[10px] font-sans text-slate-400">Títulos</div>
                    <div className="text-sm font-black text-amber-300 mt-0.5">
                      {userTrophies.length}
                    </div>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5">
                    <div className="text-[10px] font-sans text-slate-400">Aproveit.</div>
                    <div className="text-sm font-black text-emerald-300 mt-0.5">
                      {totalGames > 0 ? `${winRate}%` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5">
                    <div className="text-[10px] font-sans text-slate-400">Temporadas</div>
                    <div className="text-sm font-black text-sky-300 mt-0.5">
                      {seasonsCount}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 14 Career Achievements Grid */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Quadro Oficial de Conquistas do Treinador</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {Math.round((hallOfFameSummary.unlockedCount / hallOfFameSummary.totalCount) * 100)}% concluído
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {hallOfFameSummary.achievements.map((ach) => {
                const pct = Math.min(100, Math.round((ach.progressCurrent / Math.max(1, ach.progressTarget)) * 100));
                const tierColor =
                  ach.tier === 'LENDARIO'
                    ? 'text-amber-300'
                    : ach.tier === 'OURO'
                    ? 'text-yellow-300'
                    : ach.tier === 'PRATA'
                    ? 'text-sky-300'
                    : 'text-slate-300';
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      ach.unlocked
                        ? 'bg-emerald-950/20 border-emerald-500/45'
                        : 'bg-slate-950/75 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {ach.unlocked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Trophy className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          <h5 className="text-sm font-bold text-white truncate">{ach.title}</h5>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{ach.description}</p>
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <span className={`text-[11px] font-bold ${tierColor}`}>
                          {ach.tier}
                        </span>
                        <div className="text-xs font-bold text-amber-400">
                          +{ach.hallOfFameBonusPts} pts
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                        <span className={ach.unlocked ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                          {ach.unlocked ? 'Conquista Desbloqueada' : ach.progressLabel}
                        </span>
                        <span className="text-slate-400">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className={`h-full ${ach.unlocked ? 'bg-emerald-400' : 'bg-sky-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* World Hall of Fame Coaches Leaderboard */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Ranking Mundial · Hall da Fama dos Treinadores</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparativo em tempo real da sua pontuação histórica contra as maiores lendas do banco de reservas:
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 pr-3 w-10">#</th>
                    <th className="py-2.5 px-3">Treinador</th>
                    <th className="py-2.5 px-3">País</th>
                    <th className="py-2.5 px-3">Feito Histórico / Destaque</th>
                    <th className="py-2.5 px-3 text-right">Taças</th>
                    <th className="py-2.5 pl-3 text-right">Pts Hall da Fama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {hallOfFameSummary.hallOfFameTable.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className={
                        entry.isUser
                          ? 'bg-sky-500/15 font-semibold'
                          : 'hover:bg-slate-950/40'
                      }
                    >
                      <td className="py-3 pr-3 font-mono font-black tabular-nums text-amber-300">
                        {index + 1}º
                      </td>
                      <td className="py-3 px-3">
                        <span className={entry.isUser ? 'text-sky-300 font-black' : 'text-white font-bold'}>
                          {entry.name}
                          {entry.isUser ? ' (Você)' : ''}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{entry.nationality}</td>
                      <td className="py-3 px-3 text-slate-400">{entry.iconicClubs}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white tabular-nums">
                        {entry.majorTrophies}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono font-black text-amber-400 tabular-nums">
                        {entry.hallOfFamePoints.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(subTab === 'locker_room' || subTab === 'press') && (
        <LockerRoomPressPanel
          mode={subTab}
          userClub={userClub}
          currentRound={currentRound}
          lockerRoom={lockerRoom}
          onResolveDemand={(demandId, choice) =>
            onResolveLockerDemand
              ? onResolveLockerDemand(demandId, choice)
              : { feedbackText: 'Ação registrada.', positive: true }
          }
          onHoldPlayerTalk={(playerId, tone) =>
            onHoldPlayerTalk
              ? onHoldPlayerTalk(playerId, tone)
              : { feedbackText: 'Conversa realizada.', positive: true }
          }
          onStartPressConference={() => onStartPressConference?.()}
          onSubmitPressConference={(answers) =>
            onSubmitPressConference
              ? onSubmitPressConference(answers)
              : { feedbackText: 'Coletiva concluída.' }
          }
        />
      )}
    </div>
  );
};

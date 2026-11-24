import React, { useMemo, useRef, useState } from 'react';
import {
  AutoTryoutFrequency,
  Club,
  CoachStaff,
  DetailedRole,
  Fixture,
  GameSave,
  Player,
  TrainingFocus,
  YouthAcademyState,
  YouthAgeGroupFilter,
  YouthTryoutTier,
} from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { getPlayerVersatilityProfile } from '../utils/tacticalPositioningEngine';
import confetti from 'canvas-confetti';
import {
  Dumbbell,
  Sparkles,
  Target,
  Users,
  Award,
  CheckCircle2,
  UserPlus,
  UserMinus,
  ArrowLeftRight,
  ClipboardCheck,
  SlidersHorizontal,
  Play,
  Calendar,
  RotateCcw,
  GraduationCap,
  Clock,
  Zap,
  Check,
  ExternalLink,
  ShieldCheck,
  Info,
  Filter,
} from 'lucide-react';
import {
  computeClubStaffBonuses,
  getScaledTechnicalStaffPoolForClub,
  scaleCoachWageForClub,
} from '../utils/coachingCarouselEngine';
import { recordFinanceLedgerMutation } from '../utils/financialFairPlayEngine';
import {
  getAvailableRetrainingRoles,
  switchPlayerPrimaryRoleToLearned,
} from '../utils/positionRetrainingEngine';
import {
  analyzeSquadTrainingNeeds,
  buildPositionAlignedSquadFocuses,
  TrainingTip,
} from '../utils/trainingAdviceEngine';
import { SeasonalTrainingFocusCard } from './SeasonalTrainingFocusCard';
import {
  AUTO_TRYOUT_FREQUENCY_CONFIG,
  calculateNextAutoTryoutDate,
  getTryoutCost,
  MAX_YOUTH_ACADEMY_PLAYERS,
  runClubYouthTryout,
  YOUTH_TRYOUT_TIERS,
} from '../utils/youthAcademyEngine';

interface TrainingCenterViewProps {
  club: Club;
  gameState?: GameSave | null;
  allFixtures?: Fixture[];
  onUpdateClub: (updatedClub: Club) => void;
  onNavigateToFinances?: () => void;
  onNavigateToYouthAcademy?: () => void;
  onRunYouthTryout?: (params: {
    tier: YouthTryoutTier;
    roleFocus: DetailedRole | 'ALL';
    ageGroup: YouthAgeGroupFilter;
  }) => {
    success: boolean;
    errorMessage?: string;
    candidatesCount?: number;
  };
}

const DEFAULT_COACHES: CoachStaff[] = [
  {
    id: 'coach_phys',
    name: 'Fábio Mahseredjian',
    role: 'Preparador Físico',
    stars: 4,
    wage: 45000,
    bonusDescription: '-25% desgaste físico nos treinos e partidas',
  },
  {
    id: 'coach_att',
    name: 'Cláudio Maldonado',
    role: 'Treinador de Ataque',
    stars: 4,
    wage: 40000,
    bonusDescription: '+30% de ganho de XP para Atacantes e Pontas',
  },
  {
    id: 'coach_def',
    name: 'Carlos Germano',
    role: 'Treinador de Defesa',
    stars: 3,
    wage: 35000,
    bonusDescription: '+25% de ganho de XP para Zagueiros e Laterais',
  },
  {
    id: 'coach_gk',
    name: 'Taffarel',
    role: 'Treinador de Goleiros',
    stars: 5,
    wage: 50000,
    bonusDescription: '+40% de ganho de XP para Goleiros',
  },
];

export const TrainingCenterView: React.FC<TrainingCenterViewProps> = ({
  club,
  gameState,
  allFixtures,
  onUpdateClub,
  onNavigateToFinances,
  onNavigateToYouthAcademy,
  onRunYouthTryout,
}) => {
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [highlightedPlayerIds, setHighlightedPlayerIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [, setEvolvedPlayers] = useState<string[]>([]);
  const [showStaffMarket, setShowStaffMarket] = useState<boolean>(false);
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('ALL');

  const staffSectionRef = useRef<HTMLDivElement | null>(null);
  const squadTableRef = useRef<HTMLDivElement | null>(null);

  // Youth Academy & Auto-Tryouts configuration state
  const youthAcademy: YouthAcademyState = useMemo(
    () =>
      club.youthAcademy || {
        players: [],
        lastTryoutCandidates: [],
        totalTryoutsHeld: 0,
        totalPromotedCount: 0,
        autoTryoutFrequency: 'OFF' as AutoTryoutFrequency,
        autoTryoutTier: 'ESTADUAL' as YouthTryoutTier,
        autoTryoutRoleFocus: 'ALL' as DetailedRole | 'ALL',
        autoTryoutAgeGroup: 'ALL' as YouthAgeGroupFilter,
        autoRecruitBestGem: true,
      },
    [club.youthAcademy]
  );

  const [autoFrequency, setAutoFrequency] = useState<AutoTryoutFrequency>(
    (club.youthAcademy?.autoTryoutFrequency as AutoTryoutFrequency) || 'OFF'
  );
  const [autoTier, setAutoTier] = useState<YouthTryoutTier>(
    (club.youthAcademy?.autoTryoutTier as YouthTryoutTier) || 'ESTADUAL'
  );
  const [autoRoleFocus, setAutoRoleFocus] = useState<DetailedRole | 'ALL'>(
    (club.youthAcademy?.autoTryoutRoleFocus as DetailedRole | 'ALL') || 'ALL'
  );
  const [autoAgeGroup, setAutoAgeGroup] = useState<YouthAgeGroupFilter>(
    (club.youthAcademy?.autoTryoutAgeGroup as YouthAgeGroupFilter) || 'ALL'
  );
  const [autoRecruitGem, setAutoRecruitGem] = useState<boolean>(
    club.youthAcademy?.autoRecruitBestGem !== false
  );
  const [isExecutingTryoutNow, setIsExecutingTryoutNow] = useState<boolean>(false);

  // Sync state if club prop changes externally
  React.useEffect(() => {
    if (club.youthAcademy?.autoTryoutFrequency !== undefined) {
      setAutoFrequency(club.youthAcademy.autoTryoutFrequency);
    }
    if (club.youthAcademy?.autoTryoutTier) {
      setAutoTier(club.youthAcademy.autoTryoutTier);
    }
    if (club.youthAcademy?.autoTryoutRoleFocus) {
      setAutoRoleFocus(club.youthAcademy.autoTryoutRoleFocus);
    }
    if (club.youthAcademy?.autoTryoutAgeGroup) {
      setAutoAgeGroup(club.youthAcademy.autoTryoutAgeGroup);
    }
    if (club.youthAcademy?.autoRecruitBestGem !== undefined) {
      setAutoRecruitGem(club.youthAcademy.autoRecruitBestGem);
    }
  }, [club.youthAcademy]);

  const nextTryoutInfo = useMemo(() => {
    return calculateNextAutoTryoutDate(
      gameState?.currentDate || '2026-01-15',
      youthAcademy.lastAutoTryoutDate || youthAcademy.lastTryoutDate,
      autoFrequency
    );
  }, [
    gameState?.currentDate,
    youthAcademy.lastAutoTryoutDate,
    youthAcademy.lastTryoutDate,
    autoFrequency,
  ]);

  const currentTryoutCost = useMemo(() => {
    return getTryoutCost(club, autoTier);
  }, [club, autoTier]);

  const ctLevel = club.finances.trainingFacilityLevel || 2;
  const teamFocus: TrainingFocus = club.teamTrainingFocus || 'EQUILIBRADO';
  const scaledDefaultCoaches = useMemo(
    () =>
      DEFAULT_COACHES.map((c) => ({
        ...c,
        wage: scaleCoachWageForClub(c.wage, club),
      })),
    [club]
  );
  const coaches = club.coaches || scaledDefaultCoaches;
  const scaledStaffPool = useMemo(
    () => getScaledTechnicalStaffPoolForClub(club),
    [club]
  );

  const adviceReport = useMemo(
    () =>
      analyzeSquadTrainingNeeds({
        club,
        coaches,
        allFixtures,
        gameState,
      }),
    [club, coaches, allFixtures, gameState]
  );

  const assistantTargetIdSet = useMemo(() => {
    const ids = new Set<string>(highlightedPlayerIds);
    for (const tip of adviceReport.tips) {
      for (const pid of tip.targetPlayerIds) {
        ids.add(pid);
      }
    }
    return ids;
  }, [adviceReport.tips, highlightedPlayerIds]);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const handleSaveAutoTryoutSettings = (
    overrideFreq?: AutoTryoutFrequency,
    overrideTier?: YouthTryoutTier,
    overrideRole?: DetailedRole | 'ALL',
    overrideAge?: YouthAgeGroupFilter,
    overrideRecruit?: boolean
  ) => {
    const f = overrideFreq ?? autoFrequency;
    const t = overrideTier ?? autoTier;
    const r = overrideRole ?? autoRoleFocus;
    const a = overrideAge ?? autoAgeGroup;
    const rec = overrideRecruit ?? autoRecruitGem;

    const currentAcademy = club.youthAcademy || {
      players: [],
      lastTryoutCandidates: [],
      totalTryoutsHeld: 0,
      totalPromotedCount: 0,
    };

    const updatedClub: Club = {
      ...club,
      youthAcademy: {
        ...currentAcademy,
        autoTryoutFrequency: f,
        autoTryoutTier: t,
        autoTryoutRoleFocus: r,
        autoTryoutAgeGroup: a,
        autoRecruitBestGem: rec,
      },
    };

    onUpdateClub(updatedClub);
    soundEngine.playFanfare();
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });

    if (f === 'OFF') {
      showNotification('Peneiras automáticas desativadas. O clube realizará seletivas apenas sob ordem manual.');
    } else {
      const meta = AUTO_TRYOUT_FREQUENCY_CONFIG[f];
      showNotification(
        `Frequência da base configurada para ${meta.shortLabel} (${meta.days} dias)! A comissão técnica cuidará das seletivas automaticamente.`
      );
    }
  };

  const handleExecuteTryoutNow = () => {
    soundEngine.playClick();
    if (club.finances.balance < currentTryoutCost) {
      soundEngine.playWhistle(false);
      showNotification(
        `Saldo insuficiente no caixa: o clube possui ${formatMoney(club.finances.balance)} e a seletiva ${YOUTH_TRYOUT_TIERS[autoTier].shortLabel} custa ${formatMoney(currentTryoutCost)}.`
      );
      return;
    }

    setIsExecutingTryoutNow(true);
    try {
      if (onRunYouthTryout) {
        const res = onRunYouthTryout({
          tier: autoTier,
          roleFocus: autoRoleFocus,
          ageGroup: autoAgeGroup,
        });
        if (res.success) {
          soundEngine.playFanfare();
          confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
          showNotification(
            `Peneira realizada no CT! ${res.candidatesCount || 4} novos garotos foram avaliados pela comissão técnica.`
          );
        } else {
          showNotification(res.errorMessage || 'Falha ao executar peneira.');
        }
      } else {
        const res = runClubYouthTryout({
          club,
          tier: autoTier,
          roleFocus: autoRoleFocus,
          ageGroup: autoAgeGroup,
          currentDate: gameState?.currentDate || '2026-01-15',
          currentRound: gameState?.currentRound || 1,
        });
        if (res.success) {
          onUpdateClub(res.updatedClub);
          soundEngine.playFanfare();
          confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
          showNotification(
            `Peneira realizada no CT! ${res.candidates.length} garotos avaliados com sucesso.`
          );
        } else {
          showNotification(res.errorMessage || 'Falha ao executar peneira.');
        }
      }
    } finally {
      setIsExecutingTryoutNow(false);
    }
  };

  const handleFireStaff = (staff: CoachStaff) => {
    soundEngine.playClick();
    const severance = staff.wage * 2;
    if (club.finances.balance < severance) {
      showNotification(
        `Saldo insuficiente para pagar a rescisão contratual de ${staff.name} (${formatMoney(
          severance
        )}).`
      );
      return;
    }
    const nextCoaches = coaches.filter((c) => c.id !== staff.id);
    const actionDate = gameState?.currentDate || new Date().toISOString().slice(0, 10);
    onUpdateClub({
      ...club,
      coaches: nextCoaches,
      finances: recordFinanceLedgerMutation(
        {
          ...club.finances,
          weeklyExpenses: Math.max(
            40_000,
            club.finances.weeklyExpenses - Math.round(staff.wage * 0.5)
          ),
        },
        {
          date: actionDate,
          category: 'STAFF_SCOUTS',
          type: 'EXPENSE',
          amount: severance,
          description: `Rescisão de comissão técnica (${staff.name} · ${staff.role})`,
          applyToBalance: true,
        }
      ),
    });
    showNotification(
      `${staff.name} (${staff.role}) foi desligado da comissão técnica. Rescisão paga: ${formatMoney(
        severance
      )}.`
    );
  };

  const handleHireStaff = (candidate: CoachStaff) => {
    soundEngine.playClick();
    const existingSameRole = coaches.find((c) => c.role === candidate.role);
    const severanceOld = existingSameRole ? existingSameRole.wage * 2 : 0;
    const signingFee = candidate.wage * 2;
    const totalCost = severanceOld + signingFee;

    if (club.finances.balance < totalCost) {
      showNotification(
        `Saldo insuficiente em caixa. Luvas + eventual rescisão exigem ${formatMoney(totalCost)}.`
      );
      return;
    }

    const filteredPrev = coaches.filter((c) => c.role !== candidate.role);
    const nextCoaches = [...filteredPrev, candidate];

    const actionDate = gameState?.currentDate || new Date().toISOString().slice(0, 10);
    onUpdateClub({
      ...club,
      coaches: nextCoaches,
      finances: recordFinanceLedgerMutation(club.finances, {
        date: actionDate,
        category: 'STAFF_SCOUTS',
        type: 'EXPENSE',
        amount: totalCost,
        description: `Contratação comissão técnica: ${candidate.name} (${candidate.role})`,
        applyToBalance: true,
      }),
    });

    soundEngine.playFanfare();
    showNotification(
      existingSameRole
        ? `${candidate.name} (${candidate.stars}★) contratado para o lugar de ${existingSameRole.name}! Investimento total: ${formatMoney(totalCost)}.`
        : `${candidate.name} (${candidate.role}, ${candidate.stars}★) contratado para a comissão técnica por ${formatMoney(totalCost)}!`
    );
  };

  const trainingFoci: {
    id: TrainingFocus;
    title: string;
    desc: string;
    icon: string;
    target: string;
  }[] = [
    {
      id: 'FINALIZACAO',
      title: 'Ataque & Finalização',
      desc: 'Treinos intensivos de pontaria, chutes colocados e infiltrações na área.',
      icon: '🎯',
      target: '+40% XP para Atacantes (ATA) · +25% c/ foco alinhado',
    },
    {
      id: 'DEFESA',
      title: 'Defesa & Desarme',
      desc: 'Linhas compactas, botes defensivos, jogo aéreo e cobertura de laterais.',
      icon: '🛡️',
      target: '+40% XP para Zagueiros e Laterais (ZAG, LAT)',
    },
    {
      id: 'PASSE',
      title: 'Construção & Posse',
      desc: 'Triangulações rápidas, lançamentos longos e visão de jogo entrelinhas.',
      icon: '⚽',
      target: '+40% XP para Meio-campo e Volantes (MEI, VOL)',
    },
    {
      id: 'GOLEIRO',
      title: 'Treino de Goleiros',
      desc: 'Reflexos à queima-roupa, defesas em pênaltis e saída precisa pelo alto.',
      icon: '🧤',
      target: '+50% XP para Goleiros (GOL)',
    },
    {
      id: 'FISICO',
      title: 'Físico & Regeneração',
      desc: 'Musculação funcional, recuperação metabólica e crioterapia pós-jogo.',
      icon: '⚡',
      target: 'Recupera +14% a +24% de Condição Física geral',
    },
    {
      id: 'EQUILIBRADO',
      title: 'Treino Equilibrado',
      desc: 'Trabalho tático e técnico integral para todos os setores do time.',
      icon: '⚖️',
      target: 'Evolução uniforme para todo o elenco',
    },
  ];

  // Executa sessão coletiva sobre um estado de clube (evita estado defasado ao aplicar dica + treinar juntos)
  const executeTeamTrainingOnClub = (baseClub: Club, prefixNote?: string) => {
    const activeFocus: TrainingFocus = baseClub.teamTrainingFocus || 'EQUILIBRADO';
    const activeCoaches = baseClub.coaches || DEFAULT_COACHES;
    const activeCtLevel = baseClub.finances.trainingFacilityLevel || 2;

    const avgCondition = Math.round(
      baseClub.squad.reduce((sum, p) => sum + p.condition, 0) /
        Math.max(1, baseClub.squad.length)
    );

    if (avgCondition < 45 && activeFocus !== 'FISICO') {
      onUpdateClub(baseClub);
      showNotification(
        'O elenco está excessivamente desgastado fisicamente! Mude para Físico & Regeneração antes de realizar nova sessão intensa.'
      );
      return;
    }

    soundEngine.playWhistle(false);

    const avgStaffStars =
      activeCoaches.length > 0
        ? activeCoaches.reduce((acc, c) => acc + c.stars, 0) / 4
        : 2.5;
    const ctMultiplier = 1 + (activeCtLevel - 1) * 0.15 + avgStaffStars * 0.05;
    const physCoach = activeCoaches.find((c) => c.role === 'Preparador Físico');
    const gkCoach = activeCoaches.find((c) => c.role === 'Treinador de Goleiros');
    const defCoach = activeCoaches.find((c) => c.role === 'Treinador de Defesa');
    const attCoach = activeCoaches.find((c) => c.role === 'Treinador de Ataque');

    const newlyEvolved: string[] = [];

    const updatedSquad = baseClub.squad.map((player) => {
      if (activeFocus === 'FISICO') {
        const physBonus = physCoach ? physCoach.stars * 2 : 0;
        return {
          ...player,
          condition: Math.min(100, player.condition + 14 + physBonus),
          trainingProgress: Math.min(99, (player.trainingProgress || 0) + 5),
        };
      }

      let xpGain = (16 + Math.floor(Math.random() * 8)) * ctMultiplier;

      if (player.position === 'GK' && gkCoach) xpGain *= 1 + gkCoach.stars * 0.06;
      if (player.position === 'DF' && defCoach) xpGain *= 1 + defCoach.stars * 0.05;
      if ((player.position === 'FW' || player.position === 'MF') && attCoach) {
        xpGain *= 1 + attCoach.stars * 0.05;
      }

      if (player.age <= 20) {
        xpGain *= 1.6;
      } else if (player.age <= 24) {
        xpGain *= 1.3;
      } else if (player.age >= 32) {
        xpGain *= 0.6;
      }

      if (activeFocus === 'FINALIZACAO' && player.position === 'FW') xpGain *= 1.4;
      if (activeFocus === 'DEFESA' && player.position === 'DF') xpGain *= 1.4;
      if (activeFocus === 'PASSE' && player.position === 'MF') xpGain *= 1.4;
      if (activeFocus === 'GOLEIRO' && player.position === 'GK') xpGain *= 1.5;

      if (player.individualTrainingFocus === activeFocus) {
        xpGain *= 1.25;
      }

      let newProgress = (player.trainingProgress || 0) + Math.round(xpGain);
      let newOverall = player.overall;
      let evolutions = player.evolutionsCount || 0;
      let newMarketValue = player.marketValue;

      const maxPotential = player.potential || 99;
      if (newProgress >= 100 && newOverall < maxPotential) {
        newOverall += 1;
        newProgress = newProgress - 100;
        evolutions += 1;
        newMarketValue = Math.round(newMarketValue * 1.15);
        newlyEvolved.push(`${player.name} (Força ${newOverall})`);
      } else if (newProgress >= 100 && newOverall >= maxPotential) {
        newProgress = 99;
      }

      const staminaLoss = 5 + Math.floor(Math.random() * 3);
      const newCondition = Math.max(25, player.condition - staminaLoss);

      return {
        ...player,
        overall: newOverall,
        trainingProgress: Math.min(99, newProgress),
        condition: newCondition,
        evolutionsCount: evolutions,
        marketValue: newMarketValue,
      };
    });

    onUpdateClub({
      ...baseClub,
      squad: updatedSquad,
    });

    if (newlyEvolved.length > 0) {
      soundEngine.playFanfare();
      confetti({ particleCount: 90, spread: 70 });
      setEvolvedPlayers(newlyEvolved);
      showNotification(
        `${prefixNote ? `${prefixNote} · ` : ''}Evolução concluída: ${newlyEvolved.join(', ')} subiu de Força!`
      );
    } else {
      showNotification(
        `${
          prefixNote ? `${prefixNote} · ` : ''
        }Sessão coletiva concluída (${activeFocus}). Os atletas ganharam ritmo e XP.`
      );
    }
  };

  // Alterar foco coletivo
  const handleSelectFocus = (focus: TrainingFocus) => {
    soundEngine.playClick();
    onUpdateClub({
      ...club,
      teamTrainingFocus: focus,
    });
    showNotification(`Foco coletivo do Centro de Treinamento alterado para ${focus}.`);
  };

  // Realizar Sessão de Treino Coletiva
  const handleExecuteTeamTraining = () => {
    executeTeamTrainingOnClub(club);
  };

  // Aplicar dica do Auxiliar Técnico (com opção de já rodar sessão coletiva na sequência)
  const handleApplyAssistantTip = (tip: TrainingTip, runSessionImmediately: boolean = false) => {
    soundEngine.playClick();
    const { payload } = tip;

    if (payload.openStaffRole) {
      setShowStaffMarket(true);
      setStaffRoleFilter(payload.openStaffRole);
      showNotification(
        `Mercado da Comissão aberto com filtro para ${payload.openStaffRole}.`
      );
      setTimeout(() => {
        staffSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return;
    }

    const focusMap = new Map<string, TrainingFocus>();
    for (const upd of payload.individualFocusUpdates || []) {
      focusMap.set(upd.playerId, upd.focus);
    }

    const nextSquad = club.squad.map((p) => {
      let nextPlayer = p;
      const newIndFocus = focusMap.get(p.id);
      if (newIndFocus && p.individualTrainingFocus !== newIndFocus) {
        nextPlayer = { ...nextPlayer, individualTrainingFocus: newIndFocus };
      }
      if (payload.retrainUpdate && payload.retrainUpdate.playerId === p.id) {
        const targetRole = payload.retrainUpdate.targetRole;
        nextPlayer = {
          ...nextPlayer,
          retrainingTargetRole: targetRole,
          retrainingProgress:
            p.retrainingTargetRole === targetRole ? p.retrainingProgress || 8 : 8,
        };
      }
      return nextPlayer;
    });

    const nextClub: Club = {
      ...club,
      teamTrainingFocus: payload.teamFocus || club.teamTrainingFocus,
      squad: nextSquad,
    };

    if (payload.highlightPlayerIds && payload.highlightPlayerIds.length > 0) {
      setHighlightedPlayerIds(payload.highlightPlayerIds);
    }
    if (payload.filterTableRole) {
      setFilterRole(payload.filterTableRole);
    }

    if (runSessionImmediately) {
      executeTeamTrainingOnClub(nextClub, `Plano "${tip.title}" aplicado`);
      return;
    }

    onUpdateClub(nextClub);

    if (payload.retrainUpdate) {
      const targetPlayer = club.squad.find((p) => p.id === payload.retrainUpdate?.playerId);
      showNotification(
        `${targetPlayer?.name || 'Atleta'} iniciou adaptação tática para atuar como ${
          payload.retrainUpdate.targetRole
        }.`
      );
      setTimeout(() => {
        squadTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
      return;
    }

    if (!payload.teamFocus && payload.filterTableRole) {
      showNotification(
        focusMap.size > 0
          ? `Foco individual ajustado em ${focusMap.size} atleta(s) e tabela filtrada para acompanhamento.`
          : 'Tabela filtrada com os atletas indicados pelo auxiliar técnico.'
      );
      setTimeout(() => {
        squadTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
      return;
    }

    showNotification(
      `Recomendação aplicada: "${tip.title}"${
        focusMap.size > 0 ? ` (${focusMap.size} focos individuais sincronizados)` : ''
      }.`
    );
  };

  // Sincronizar todos os focos individuais com a função de cada atleta
  const handleSyncAllIndividualFocuses = () => {
    soundEngine.playClick();
    const updatedSquad = buildPositionAlignedSquadFocuses(club.squad);
    onUpdateClub({
      ...club,
      squad: updatedSquad,
    });
    showNotification(
      'Todos os focos individuais foram alinhados às posições de origem (GOL, DEF, PASSE e FINALIZAÇÃO).'
    );
  };

  // Treino individual intensivo em um jogador específico
  const handleIndividualTrain = (player: Player) => {
    if (player.condition < 35) {
      showNotification(
        `${player.name} está desgastado (condição ${player.condition}%). Aplique foco Físico ou avance o dia antes do treino individual.`
      );
      return;
    }

    soundEngine.playClick();

    const staffBonuses = computeClubStaffBonuses(club);
    const ctMultiplier = 1 + (ctLevel - 1) * 0.15;
    let xpGain = Math.round((28 + Math.floor(Math.random() * 12)) * ctMultiplier);
    if (player.age <= 21) xpGain = Math.round(xpGain * 1.5);

    let newProgress = (player.trainingProgress || 0) + xpGain;
    let newOverall = player.overall;
    let evolutions = player.evolutionsCount || 0;
    let newMarketValue = player.marketValue;
    let didEvolve = false;

    const maxPotential = player.potential || 99;
    if (newProgress >= 100 && newOverall < maxPotential) {
      newOverall += 1;
      newProgress = newProgress - 100;
      evolutions += 1;
      newMarketValue = Math.round(newMarketValue * 1.15);
      didEvolve = true;
    } else if (newProgress >= 100 && newOverall >= maxPotential) {
      newProgress = 99;
    }

    // Also advance position retraining if active
    let nextSecondary = player.secondaryRoles || [];
    let nextRetrainTarget = player.retrainingTargetRole;
    let nextRetrainProg = player.retrainingProgress || 0;
    let completedRole: DetailedRole | null = null;

    if (nextRetrainTarget) {
      const retrainGain = Math.round(24 * staffBonuses.retrainingSpeedMultiplier);
      nextRetrainProg += retrainGain;
      if (nextRetrainProg >= 100) {
        completedRole = nextRetrainTarget;
        if (!nextSecondary.includes(nextRetrainTarget)) {
          nextSecondary = [...nextSecondary, nextRetrainTarget];
        }
        nextRetrainTarget = undefined;
        nextRetrainProg = 0;
      }
    }

    const updatedSquad = club.squad.map((p) => {
      if (p.id === player.id) {
        return {
          ...p,
          overall: newOverall,
          trainingProgress: Math.min(99, newProgress),
          condition: Math.max(20, p.condition - 10),
          evolutionsCount: evolutions,
          marketValue: newMarketValue,
          secondaryRoles: nextSecondary,
          retrainingTargetRole: nextRetrainTarget,
          retrainingProgress: nextRetrainProg,
        };
      }
      return p;
    });

    onUpdateClub({
      ...club,
      squad: updatedSquad,
    });

    if (didEvolve || completedRole) {
      soundEngine.playFanfare();
      confetti({ particleCount: 80, spread: 60 });
      if (didEvolve && completedRole) {
        showNotification(
          `Dupla evolução: ${player.name} chegou a Força ${newOverall} e dominou 100% da posição ${completedRole}!`
        );
      } else if (completedRole) {
        showNotification(
          `Nova função dominada: ${player.name} agora atua como ${completedRole} sem perda tática!`
        );
      } else {
        showNotification(`Evolução confirmada: ${player.name} alcançou Força ${newOverall} (+1 OVR)!`);
      }
    } else {
      showNotification(
        `Treino individual aplicado a ${player.name}: +${xpGain}% XP${
          nextRetrainTarget
            ? ` e avanço na adaptação para ${nextRetrainTarget} (${nextRetrainProg}%)`
            : ''
        }.`
      );
    }
  };

  // Alterar foco individual
  const handleChangePlayerFocus = (playerId: string, focus: TrainingFocus) => {
    soundEngine.playClick();
    const updatedSquad = club.squad.map((p) => {
      if (p.id === playerId) {
        return { ...p, individualTrainingFocus: focus };
      }
      return p;
    });

    onUpdateClub({
      ...club,
      squad: updatedSquad,
    });
  };

  const handleSetRetrainingRole = (playerId: string, roleVal: string) => {
    soundEngine.playClick();
    const targetRole = roleVal ? (roleVal as DetailedRole) : undefined;
    const updatedSquad = club.squad.map((p) => {
      if (p.id !== playerId) return p;
      if (!targetRole) {
        return { ...p, retrainingTargetRole: undefined, retrainingProgress: 0 };
      }
      return {
        ...p,
        retrainingTargetRole: targetRole,
        retrainingProgress: p.retrainingTargetRole === targetRole ? p.retrainingProgress || 0 : 8,
      };
    });
    onUpdateClub({ ...club, squad: updatedSquad });
    if (targetRole) {
      const pl = club.squad.find((x) => x.id === playerId);
      showNotification(
        `${pl?.name || 'Atleta'} iniciou adaptação tática para atuar como ${targetRole}.`
      );
    }
  };

  const handlePromoteLearnedRole = (playerId: string, role: DetailedRole) => {
    soundEngine.playClick();
    const updatedSquad = club.squad.map((p) =>
      p.id === playerId ? switchPlayerPrimaryRoleToLearned(p, role) : p
    );
    onUpdateClub({ ...club, squad: updatedSquad });
    const pl = club.squad.find((x) => x.id === playerId);
    showNotification(
      `Posição principal de ${pl?.name || 'atleta'} alterada para ${role}.`
    );
  };

  // Filter squad
  const filteredSquad = club.squad.filter((p) => {
    if (filterRole === 'ALL') return true;
    if (filterRole === 'GK') return p.position === 'GK';
    if (filterRole === 'DF') return p.position === 'DF';
    if (filterRole === 'MF') return p.position === 'MF';
    if (filterRole === 'FW') return p.position === 'FW';
    if (filterRole === 'YOUTH') return p.age <= 21;
    if (filterRole === 'RECOMMENDED') {
      if (highlightedPlayerIds.length > 0) {
        return highlightedPlayerIds.includes(p.id);
      }
      return assistantTargetIdSet.has(p.id);
    }
    return true;
  });

  const recommendedCount =
    highlightedPlayerIds.length > 0 ? highlightedPlayerIds.length : assistantTargetIdSet.size;

  return (
    <div className="space-y-6">
      {/* Top Banner: Centro de Treinamento Status & Action Button */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-cyan-300 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xl shadow-sky-500/20 shrink-0">
            <Dumbbell className="w-8 h-8" />
          </div>

          <div>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Centro de Treinamento
              </h2>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 tabular-nums">
                · Estrutura Nível {ctLevel}/5
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Desenvolva o potencial dos atletas do{' '}
              <strong className="text-sky-300">{club.name}</strong>, corrija carências técnicas por setor e evolua o overall da equipe.
            </p>
          </div>
        </div>

        {/* Action Button: Executar Treino Coletivo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExecuteTeamTraining}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 font-black text-sm shadow-xl shadow-sky-500/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>REALIZAR SESSÃO DE TREINO</span>
          </button>
        </div>
      </div>

      {/* Dynamic Feedback Banner */}
      {feedback && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-xl p-3.5 text-xs font-semibold text-sky-200 flex items-center gap-2.5 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Seasonal Training Focus Recommendation (Físico · Tático · Técnico) */}
      <SeasonalTrainingFocusCard
        recommendation={adviceReport.seasonalFocusRecommendation}
        currentTeamFocus={teamFocus}
        onSelectFocus={(focus, runSessionNow) => {
          if (runSessionNow) {
            const nextClub: Club = {
              ...club,
              teamTrainingFocus: focus,
            };
            executeTeamTrainingOnClub(nextClub, `Foco ${focus} aplicado`);
          } else {
            handleSelectFocus(focus);
          }
        }}
      />

      {/* Assistant Coach Training Tips & Squad Weakness Diagnostic */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span>Dicas de Treinamento · Relatório do Auxiliar Técnico</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {adviceReport.assistantHeadline}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {adviceReport.assistantSummary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {adviceReport.unalignedIndividualCount > 0 && (
              <button
                type="button"
                onClick={handleSyncAllIndividualFocuses}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer tabular-nums"
                title="Configura cada atleta para treinar o foco ideal de sua posição (GOL, DEFESA, PASSE ou FINALIZAÇÃO)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>
                  Alinhar Focos por Posição ({adviceReport.unalignedIndividualCount})
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Sector Diagnostic Strip */}
        <div className="border-y border-slate-800 bg-slate-900/35 grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
          {adviceReport.sectors.map((sec) => {
            const isCurrentFocus = teamFocus === sec.recommendedFocus;
            const gapLabel =
              sec.squadAvgGap > 0
                ? `+${sec.squadAvgGap.toFixed(1)} vs elenco`
                : `${sec.squadAvgGap.toFixed(1)} vs elenco`;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  handleSelectFocus(sec.recommendedFocus);
                  setFilterRole(sec.id);
                }}
                className={`p-4 text-left transition-colors cursor-pointer hover:bg-slate-900/80 ${
                  isCurrentFocus ? 'bg-sky-950/25' : ''
                }`}
                title={`Selecionar foco ${sec.focusLabel} e filtrar atletas de ${sec.label}`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-slate-400">
                    {sec.shortCode} · {sec.label}
                  </span>
                  {sec.isWeakest ? (
                    <span className="text-amber-400">Ponto Fraco</span>
                  ) : isCurrentFocus ? (
                    <span className="text-sky-400">Em Foco</span>
                  ) : null}
                </div>

                <div className="mt-1.5 flex items-baseline gap-2 tabular-nums">
                  <span className="text-xl font-black text-white">
                    {sec.topAvgOvr > 0 ? sec.topAvgOvr.toFixed(1) : '--'}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      sec.squadAvgGap < -0.5
                        ? 'text-amber-400'
                        : sec.squadAvgGap > 0.5
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {gapLabel}
                  </span>
                </div>

                <div className="mt-1 text-[11px] text-slate-400 tabular-nums">
                  {sec.alignedFocusCount}/{sec.playerCount} focos alinhados · Cond. {sec.avgCondition}%
                </div>
              </button>
            );
          })}
        </div>

        {/* Specific Assistant Recommendations List */}
        <div className="divide-y divide-slate-800/80">
          {adviceReport.tips.map((tip) => {
            const priorityColor =
              tip.priority === 'ALTA'
                ? 'text-amber-400'
                : tip.priority === 'MEDIA'
                ? 'text-sky-400'
                : 'text-emerald-400';

            return (
              <div
                key={tip.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-900/30 transition-colors"
              >
                <div className="space-y-1.5 min-w-0 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                    <span className={`font-bold uppercase tracking-wider ${priorityColor}`}>
                      {tip.priorityLabel}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="font-semibold text-slate-300">{tip.categoryLabel}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-sky-300/90 font-medium">{tip.expectedBenefit}</span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-white">
                    {tip.title}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {tip.diagnosis}
                  </p>

                  <div className="text-[11px] text-slate-400 tabular-nums pt-0.5">
                    <span>{tip.evidenceLine}</span>
                    {tip.targetPlayerNames.length > 0 && (
                      <>
                        <span className="text-slate-600 mx-1.5">·</span>
                        <span className="text-slate-300">
                          Alvos: {tip.targetPlayerNames.join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApplyAssistantTip(tip, false)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      tip.isAlreadyApplied
                        ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/80'
                        : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                    }`}
                  >
                    {tip.isAlreadyApplied && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    <span>{tip.actionLabel}</span>
                  </button>

                  {tip.canAlsoExecuteSession && (
                    <button
                      type="button"
                      onClick={() => handleApplyAssistantTip(tip, true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      title="Aplica este foco coletivo e individual nos atletas do setor e realiza uma sessão de treino agora"
                    >
                      <Play className="w-3 h-3 fill-current shrink-0" />
                      <span>Aplicar + Treinar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Training Focus Selector */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              Foco Coletivo do Centro de Treinamento
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Foco atual: <strong className="text-sky-300">{teamFocus}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trainingFoci.map((f) => {
            const isSelected = teamFocus === f.id;
            const isSuggestedByAssistant = adviceReport.recommendedPrimaryFocus === f.id;

            return (
              <div
                key={f.id}
                onClick={() => handleSelectFocus(f.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-950/50 border-sky-400 ring-1 ring-sky-400/30 shadow-lg shadow-sky-950/60'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-2xl">{f.icon}</span>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                      {isSuggestedByAssistant && (
                        <span className="text-amber-400">Indicado</span>
                      )}
                      {isSuggestedByAssistant && isSelected && (
                        <span className="text-slate-600">·</span>
                      )}
                      {isSelected && <span className="text-sky-300">Ativo</span>}
                    </div>
                  </div>
                  <h4
                    className={`text-sm font-bold ${
                      isSelected ? 'text-sky-300' : 'text-white'
                    }`}
                  >
                    {f.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-sky-400">{f.target}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coaching Staff (Comissão Técnica) */}
      <div
        ref={staffSectionRef}
        className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">
                Comissão Técnica & Preparadores Reais
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              {coaches.length}/6 cargos preenchidos · Preparação física, ataque, defesa, goleiros, médico-chefe e análise tática
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowStaffMarket((prev) => !prev);
            }}
            className="px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span>
              {showStaffMarket
                ? 'Fechar Mercado da Comissão'
                : 'Contratar / Trocar Preparadores'}
            </span>
          </button>
        </div>

        {coaches.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
            Nenhum preparador ativo no momento. Clique em &ldquo;Contratar / Trocar Preparadores&rdquo; para recompor a comissão técnica.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map((coach) => (
              <div
                key={coach.id}
                className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-sky-400">
                      {'★'.repeat(coach.stars)}
                      {'☆'.repeat(5 - coach.stars)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {formatMoney(coach.wage)}/sem
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white mt-1.5">{coach.name}</h4>
                  <p className="text-xs text-sky-300 font-medium">{coach.role}</p>

                  <p className="text-[11px] text-slate-400 mt-2 leading-tight">
                    {coach.bonusDescription}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-400 tabular-nums">
                    Rescisão: {formatMoney(coach.wage * 2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFireStaff(coach)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-rose-300 font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <UserMinus className="w-3 h-3 shrink-0" />
                    <span>Demitir</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showStaffMarket && (
          <div className="mt-5 pt-5 border-t border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Profissionais Reais Disponíveis para Comissão Técnica
                </h4>
                <p className="text-xs text-slate-400">
                  Contratar um profissional da mesma função substitui automaticamente o atual (luvas de 2 semanas + rescisão).
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'Preparador Físico', label: 'Físico' },
                  { id: 'Treinador de Ataque', label: 'Ataque' },
                  { id: 'Treinador de Defesa', label: 'Defesa' },
                  { id: 'Treinador de Goleiros', label: 'Goleiros' },
                  { id: 'Médico-Chefe', label: 'Médico-Chefe' },
                  { id: 'Analista de Desempenho', label: 'Analista' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setStaffRoleFilter(tab.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      staffRoleFilter === tab.id
                        ? 'bg-sky-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {scaledStaffPool.filter((cand) => {
                if (coaches.some((c) => c.name.trim() === cand.name.trim())) return false;
                if (staffRoleFilter !== 'ALL' && cand.role !== staffRoleFilter) return false;
                return true;
              }).map((cand) => {
                const currentInRole = coaches.find((c) => c.role === cand.role);
                const totalHireCost =
                  cand.wage * 2 + (currentInRole ? currentInRole.wage * 2 : 0);
                return (
                  <div
                    key={cand.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-amber-400">
                          {'★'.repeat(cand.stars)}
                          {'☆'.repeat(5 - cand.stars)}
                        </span>
                        <span className="text-slate-400 font-mono tabular-nums">
                          {formatMoney(cand.wage)}/sem
                        </span>
                      </div>
                      <div className="font-bold text-sm text-white mt-1">
                        {cand.name.trim()}
                      </div>
                      <div className="text-xs text-sky-300">{cand.role}</div>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                        {cand.bonusDescription}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                        Custo: {formatMoney(totalHireCost)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleHireStaff(cand)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        {currentInRole ? 'Substituir Cargo' : 'Contratar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Auto Tryouts & Youth Academy Automation Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        {/* Section Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0 mt-0.5">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Formação de Base & Peneiras
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs font-semibold text-slate-400 tabular-nums">
                  CT da Base Nível {club.finances.youthAcademyLevel || 1}/5
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Frequência Automática de Peneiras (Tryouts da Base)
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Automatize as seletivas da academia para garimpar novas promessas periodicamente (mensal, trimestral ou anual) e economizar tempo na gestão da base do{' '}
                <strong className="text-amber-300">{club.name}</strong>.
              </p>
            </div>
          </div>

          {/* Quick status pill */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 tabular-nums ${
                autoFrequency === 'OFF'
                  ? 'bg-slate-900 border-slate-700 text-slate-400'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300 shadow-sm'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {autoFrequency === 'OFF'
                  ? 'Automação Pausada'
                  : `Peneiras: ${AUTO_TRYOUT_FREQUENCY_CONFIG[autoFrequency].shortLabel}`}
              </span>
            </span>

            {onNavigateToYouthAcademy && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onNavigateToYouthAcademy();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Ver Base ({youthAcademy.players.length}/{MAX_YOUTH_ACADEMY_PLAYERS})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Frequency Selector: 4 Cards */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            1. Selecione a Frequência Automática
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(['OFF', 'MONTHLY', 'QUARTERLY', 'ANNUAL'] as AutoTryoutFrequency[]).map((freqKey) => {
              const meta = AUTO_TRYOUT_FREQUENCY_CONFIG[freqKey];
              const isSelected = autoFrequency === freqKey;

              return (
                <div
                  key={freqKey}
                  onClick={() => {
                    soundEngine.playClick();
                    setAutoFrequency(freqKey);
                    handleSaveAutoTryoutSettings(freqKey);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-950/50 to-slate-900 border-amber-400 ring-1 ring-amber-400/40 shadow-lg shadow-amber-950/40'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xl">{meta.icon}</span>
                      <div className="flex items-center gap-1.5">
                        {meta.days > 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 tabular-nums">
                            {meta.days}d
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                            Ativo
                          </span>
                        )}
                      </div>
                    </div>
                    <h4
                      className={`text-sm font-bold ${
                        isSelected ? 'text-amber-300' : 'text-white'
                      }`}
                    >
                      {meta.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {meta.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Ciclo:</span>
                    <span
                      className={`font-semibold ${
                        isSelected ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      {meta.days === 0 ? 'Manual sob demanda' : `A cada ${meta.days} dias`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Parameters Sub-grid (Customization for tryouts) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 pt-4 border-t border-slate-800/80">
          {/* Parameter 1: Porte da Peneira */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Porte da Seletiva</span>
              </label>
              <span className="text-[11px] font-mono font-semibold text-emerald-400 tabular-nums">
                {formatMoney(currentTryoutCost)}
              </span>
            </div>
            <select
              value={autoTier}
              onChange={(e) => {
                soundEngine.playClick();
                const nextTier = e.target.value as YouthTryoutTier;
                setAutoTier(nextTier);
                handleSaveAutoTryoutSettings(undefined, nextTier);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {(['COMUNITARIA', 'ESTADUAL', 'NACIONAL'] as YouthTryoutTier[]).map((t) => (
                <option key={t} value={t}>
                  {YOUTH_TRYOUT_TIERS[t].shortLabel} · {formatMoney(getTryoutCost(club, t))} ({YOUTH_TRYOUT_TIERS[t].candidatesCount} garotos)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-snug">
              {YOUTH_TRYOUT_TIERS[autoTier].gemChanceLabel}.
            </p>
          </div>

          {/* Parameter 2: Foco de Posição */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Foco Tático na Peneira</span>
            </label>
            <select
              value={autoRoleFocus}
              onChange={(e) => {
                soundEngine.playClick();
                const nextRole = e.target.value as DetailedRole | 'ALL';
                setAutoRoleFocus(nextRole);
                handleSaveAutoTryoutSettings(undefined, undefined, nextRole);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="ALL">Todas as Posições (Equilibrado)</option>
              <option value="GOL">Goleiros (GOL)</option>
              <option value="ZAG">Zagueiros (ZAG)</option>
              <option value="LAT">Laterais (LAT)</option>
              <option value="VOL">Volantes (VOL)</option>
              <option value="MEI">Meias de Criação (MEI)</option>
              <option value="ATA">Atacantes / Pontas (ATA)</option>
            </select>
            <p className="text-[11px] text-slate-400 leading-snug">
              A comissão técnica priorizará o setor escolhido na busca de talentos.
            </p>
          </div>

          {/* Parameter 3: Faixa Etária */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Faixa Etária Alvo</span>
            </label>
            <select
              value={autoAgeGroup}
              onChange={(e) => {
                soundEngine.playClick();
                const nextAge = e.target.value as YouthAgeGroupFilter;
                setAutoAgeGroup(nextAge);
                handleSaveAutoTryoutSettings(undefined, undefined, undefined, nextAge);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="ALL">Todas as Idades (15 a 18 anos)</option>
              <option value="SUB_15">Sub-15 (15 anos · Formação de longo prazo)</option>
              <option value="SUB_17">Sub-17 (16-17 anos · Maturação acelerada)</option>
              <option value="SUB_20">Sub-20 (18 anos · Pronto para o profissional)</option>
            </select>
            <p className="text-[11px] text-slate-400 leading-snug">
              Define a faixa etária prioritária dos atletas testados no CT.
            </p>
          </div>
        </div>

        {/* Smart Automation Toggle: Auto-recruit Top Gem */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Auto-Matrícula da Maior Promessa</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Economia de Tempo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Se houver vaga livre na base (máx. {MAX_YOUTH_ACADEMY_PLAYERS} atletas), o melhor jovem avaliado da peneira é automaticamente aprovado e matriculado no CT.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoRecruitGem}
              onChange={(e) => {
                soundEngine.playClick();
                const nextVal = e.target.checked;
                setAutoRecruitGem(nextVal);
                handleSaveAutoTryoutSettings(undefined, undefined, undefined, undefined, nextVal);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Status Dashboard & Actions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          {/* Status info */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Próxima Peneira
              </span>
              <span className="font-bold text-white tabular-nums">
                {autoFrequency === 'OFF' ? (
                  <span className="text-slate-400">Desativada (Manual)</span>
                ) : nextTryoutInfo.nextDate ? (
                  <span className="text-amber-300">
                    {nextTryoutInfo.nextDate}{' '}
                    <span className="text-slate-400 font-normal">
                      ({nextTryoutInfo.daysRemaining === 0 ? 'No próximo avanço' : `em ${nextTryoutInfo.daysRemaining}d`})
                    </span>
                  </span>
                ) : (
                  <span className="text-amber-300">No próximo avanço de data</span>
                )}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Custo por Ciclo
              </span>
              <span className="font-bold text-emerald-400 font-mono tabular-nums">
                {formatMoney(currentTryoutCost)}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Ocupação da Base
              </span>
              <span className="font-bold text-white tabular-nums">
                {youthAcademy.players.length} / {MAX_YOUTH_ACADEMY_PLAYERS} atletas
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Caixa Disponível
              </span>
              <span
                className={`font-bold font-mono tabular-nums ${
                  club.finances.balance >= currentTryoutCost
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {formatMoney(club.finances.balance)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isExecutingTryoutNow}
              onClick={handleExecuteTryoutNow}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 text-slate-200 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Realiza uma peneira imediatamente com as configurações atuais para testar"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{isExecutingTryoutNow ? 'Avaliando...' : 'Executar Peneira Agora'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAutoTryoutSettings()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Salvar Preferências</span>
            </button>
          </div>
        </div>
      </div>

      {/* Individual Players Evolution Table */}
      <div
        ref={squadTableRef}
        className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Table Filters & Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white tabular-nums">
              Evolução Individual de Atletas ({filteredSquad.length} jogadores)
            </h3>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'ALL', label: 'Todos' },
              ...(recommendedCount > 0
                ? [{ id: 'RECOMMENDED', label: `Indicados (${recommendedCount})` }]
                : []),
              { id: 'YOUTH', label: 'Jovens (≤21)' },
              { id: 'GK', label: 'Goleiros' },
              { id: 'DF', label: 'Defesa' },
              { id: 'MF', label: 'Meio' },
              { id: 'FW', label: 'Ataque' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  if (tab.id !== 'RECOMMENDED') {
                    setHighlightedPlayerIds([]);
                  }
                  setFilterRole(tab.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap tabular-nums ${
                  filterRole === tab.id
                    ? 'bg-sky-400 text-slate-950 font-black shadow-md shadow-sky-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Squad Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">Jogador</th>
                <th className="py-3 px-2 text-center">Pos</th>
                <th className="py-3 px-2 text-center">Idade</th>
                <th className="py-3 px-2 text-center text-sky-400">Força</th>
                <th className="py-3 px-2 text-center">Potencial</th>
                <th className="py-3 px-3">Progresso para +1 OVR</th>
                <th className="py-3 px-3">Foco Individual</th>
                <th className="py-3 px-3">Nova Posição / Polivalência</th>
                <th className="py-3 px-3 text-center">Condição</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredSquad.map((player) => {
                const progress = player.trainingProgress || 0;
                const regRisk = player.regressionProgress || 0;
                const potential = player.potential || player.overall + 3;
                const canEvolve = player.overall < potential;
                const availableRetrainRoles = getAvailableRetrainingRoles(player);
                const learnedRoles = player.secondaryRoles || [];
                const isRecommendedTarget =
                  highlightedPlayerIds.includes(player.id) ||
                  assistantTargetIdSet.has(player.id);

                return (
                  <tr
                    key={player.id}
                    className={`hover:bg-slate-900/50 transition-colors ${
                      highlightedPlayerIds.includes(player.id) ? 'bg-sky-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-slate-400">
                      {player.squadNumber}
                    </td>

                    <td className="py-3 px-3">
                      <div>
                        <span className="font-bold text-white text-sm">{player.name}</span>
                        {isRecommendedTarget && (
                          <span className="text-[10px] text-amber-400 font-semibold block mt-0.5">
                            Alvo indicado pelo Auxiliar
                          </span>
                        )}
                        {player.evolutionsCount && player.evolutionsCount > 0 ? (
                          <span className="text-[10px] text-emerald-400 font-bold block mt-0.5 tabular-nums">
                            ▲ +{player.evolutionsCount} OVR na carreira
                          </span>
                        ) : player.evolutionsCount && player.evolutionsCount < 0 ? (
                          <span className="text-[10px] text-rose-400 font-bold block mt-0.5 tabular-nums">
                            ▼ {player.evolutionsCount} OVR (queda de fase)
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      {(() => {
                        const versatility = getPlayerVersatilityProfile(player);
                        return (
                          <div
                            title={`Setor ${versatility.sectorName} · Sem perda: ${versatility.allZeroPenaltyCodes.join(' · ')}`}
                            className="inline-flex flex-col items-center leading-tight"
                          >
                            <span className="font-black text-sky-300">{player.detailedRole}</span>
                            {versatility.compactSecondaryHint && (
                              <span className="text-[9px] text-slate-400 font-mono">
                                {versatility.compactSecondaryHint}
                              </span>
                            )}
                            {learnedRoles.length > 0 && (
                              <span className="text-[9px] text-emerald-400 font-mono font-bold">
                                CT: +{learnedRoles.join(', ')}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    <td className="py-3 px-2 text-center text-slate-300 tabular-nums">
                      {player.age} anos
                    </td>

                    {/* Força Atual */}
                    <td className="py-3 px-2 text-center font-mono tabular-nums font-black text-sm text-sky-300">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-sky-950 font-bold">
                        {player.overall}
                      </span>
                    </td>

                    {/* Potencial Máximo */}
                    <td className="py-3 px-2 text-center font-mono tabular-nums font-bold text-slate-400">
                      <span className="text-xs text-amber-400 font-black">
                        ★ {potential}
                      </span>
                    </td>

                    {/* Progresso de Evolução & Risco de Queda */}
                    <td className="py-3 px-3 min-w-[165px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
                          <span className="text-slate-400">
                            {canEvolve
                              ? `${progress}% para Força ${player.overall + 1}`
                              : 'Potencial Máximo'}
                          </span>
                          <span className="text-sky-300 font-bold">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              progress > 85
                                ? 'bg-gradient-to-r from-sky-400 to-cyan-300'
                                : 'bg-sky-500'
                            }`}
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                        {regRisk >= 20 && (
                          <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-rose-400 pt-0.5">
                            <span>Má fase (-1 OVR em 100%)</span>
                            <strong>{regRisk}%</strong>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Foco Individual Dropdown */}
                    <td className="py-3 px-3">
                      <select
                        value={player.individualTrainingFocus || 'EQUILIBRADO'}
                        onChange={(e) =>
                          handleChangePlayerFocus(
                            player.id,
                            e.target.value as TrainingFocus
                          )
                        }
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-sky-400"
                      >
                        <option value="EQUILIBRADO">⚖️ Equilibrado</option>
                        <option value="FINALIZACAO">🎯 Finalização</option>
                        <option value="DEFESA">🛡️ Defesa</option>
                        <option value="PASSE">⚽ Passe & Posse</option>
                        <option value="GOLEIRO">🧤 Goleiro</option>
                        <option value="FISICO">⚡ Físico</option>
                      </select>
                    </td>

                    {/* Nova Posição / Reconversão */}
                    <td className="py-3 px-3 min-w-[180px]">
                      {player.position === 'GK' ? (
                        <span className="text-[11px] text-slate-500">
                          Especialista de Gol
                        </span>
                      ) : (
                        <div className="space-y-1.5">
                          {(availableRetrainRoles.length > 0 ||
                            player.retrainingTargetRole) && (
                            <select
                              value={player.retrainingTargetRole || ''}
                              onChange={(e) =>
                                handleSetRetrainingRole(player.id, e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-400"
                            >
                              <option value="">Sem reconversão ativa</option>
                              {Array.from(
                                new Set([
                                  ...(player.retrainingTargetRole
                                    ? [player.retrainingTargetRole]
                                    : []),
                                  ...availableRetrainRoles,
                                ])
                              ).map((r) => (
                                <option key={r} value={r}>
                                  Treinar p/ {r}
                                </option>
                              ))}
                            </select>
                          )}

                          {player.retrainingTargetRole && (
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-emerald-300">
                                <span>Adaptação {player.retrainingTargetRole}</span>
                                <span>{player.retrainingProgress || 0}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                <div
                                  className="h-full bg-emerald-400 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      player.retrainingProgress || 0
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {learnedRoles.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {learnedRoles.map((lr) => (
                                <button
                                  key={lr}
                                  type="button"
                                  onClick={() => handlePromoteLearnedRole(player.id, lr)}
                                  title={`Definir ${lr} como posição principal de ${player.name}`}
                                  className="px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <ArrowLeftRight className="w-2.5 h-2.5" />
                                  <span>Virar {lr}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Condição */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              player.condition > 80
                                ? 'bg-sky-400'
                                : player.condition > 60
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${player.condition}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-300 tabular-nums">
                          {player.condition}%
                        </span>
                      </div>
                    </td>

                    {/* Ação: Treino Individual */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleIndividualTrain(player)}
                        disabled={
                          player.condition < 35 ||
                          (!canEvolve && !player.retrainingTargetRole)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          player.condition < 35 ||
                          (!canEvolve && !player.retrainingTargetRole)
                            ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                            : 'bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 border border-sky-500/40'
                        }`}
                        title={
                          !canEvolve && !player.retrainingTargetRole
                            ? 'Atleta atingiu seu potencial máximo e não está em reconversão.'
                            : player.condition < 35
                            ? 'Condição física baixa demais para treino individual.'
                            : 'Aplicar treino individual focado (+XP e +Adaptação de Posição)'
                        }
                      >
                        Treinar (+XP)
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

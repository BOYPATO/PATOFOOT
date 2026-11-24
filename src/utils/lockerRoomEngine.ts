import {
  Club,
  Fixture,
  GameSave,
  InboxMessage,
  LockerRoomState,
  ManagerCareerState,
  Morale,
  Player,
  PlayerLockerDemand,
  PressConferenceQuestion,
  PressConferenceSession,
} from '../types/game';
import { formatCalendarDate } from './calendarUtils';

const MORALE_SCORES: Record<Morale, number> = {
  Excelente: 95,
  Boa: 78,
  Regular: 58,
  Baixa: 36,
  Péssima: 16,
};

export function shiftMorale(current: Morale, delta: -1 | 0 | 1): Morale {
  if (delta === 0) return current;
  const order: Morale[] = ['Péssima', 'Baixa', 'Regular', 'Boa', 'Excelente'];
  const idx = order.indexOf(current);
  const safe = idx === -1 ? 2 : idx;
  return order[Math.max(0, Math.min(order.length - 1, safe + delta))];
}

export function computeSquadHarmonyScore(
  club: Club,
  activeDemandsCount: number = 0
): number {
  if (!club.squad || club.squad.length === 0) return 75;
  const sum = club.squad.reduce(
    (acc, p) => acc + (MORALE_SCORES[p.morale] ?? 60),
    0
  );
  const baseAvg = sum / club.squad.length;
  const penalty = activeDemandsCount * 6;
  return Math.max(15, Math.min(100, Math.round(baseAvg - penalty)));
}

export function ensureLockerRoomState(save: GameSave): LockerRoomState {
  const userClub = save.clubs.find((c) => c.id === save.userClubId) || save.clubs[0];
  if (save.lockerRoom) {
    return {
      ...save.lockerRoom,
      harmonyScore: computeSquadHarmonyScore(
        userClub,
        save.lockerRoom.activeDemands?.filter((d) => d.status === 'PENDING').length || 0
      ),
      activeDemands: save.lockerRoom.activeDemands || [],
      resolvedDemandsHistory: save.lockerRoom.resolvedDemandsHistory || [],
      pressHistory: save.lockerRoom.pressHistory || [],
      lastTalkRoundByPlayer: save.lockerRoom.lastTalkRoundByPlayer || {},
    };
  }
  return {
    harmonyScore: computeSquadHarmonyScore(userClub, 0),
    activeDemands: [],
    resolvedDemandsHistory: [],
    activePressConference: null,
    pressHistory: [],
    lastTalkRoundByPlayer: {},
  };
}

function buildPressQuestions(params: {
  userClub: Club;
  opponentName: string;
  userGoals: number;
  oppGoals: number;
  competitionLabel: string;
  round: number;
}): PressConferenceQuestion[] {
  const { userClub, opponentName, userGoals, oppGoals, competitionLabel, round } = params;
  const won = userGoals > oppGoals;
  const drew = userGoals === oppGoals;
  const topStar = [...userClub.squad].sort((a, b) => b.overall - a.overall)[0];
  const starName = topStar?.name || 'o camisa 10';

  const q1: PressConferenceQuestion = won
    ? {
        id: `pq_1_${round}`,
        outletName: 'TV Esporte Brasil',
        journalistName: 'Mauro Nogueira',
        questionText: `Vitória por ${userGoals} a ${oppGoals} sobre o ${opponentName} no ${competitionLabel}. O resultado reflete a superioridade tática do ${userClub.shortName} ou a equipe ainda precisa evoluir?`,
        options: [
          {
            id: 'opt_1_praise',
            toneLabel: 'Exaltar o Elenco',
            responseText:
              'Os atletas executaram o plano à risca. Essa vitória é 100% mérito da entrega do grupo em campo.',
            boardDelta: 2,
            fanDelta: 3,
            moraleShift: 1,
            reputationDelta: 1,
            headlineResult: `Treinador exalta entrega do elenco após triunfo do ${userClub.shortName}`,
          },
          {
            id: 'opt_1_feet_ground',
            toneLabel: 'Pés no Chão',
            responseText:
              'Somamos pontos importantes, mas o campeonato é longo e não podemos relaxar um segundo sequer.',
            boardDelta: 3,
            fanDelta: 1,
            moraleShift: 0,
            reputationDelta: 2,
            headlineResult: `Comando técnico prega foco e pés no chão após vitória sobre o ${opponentName}`,
          },
          {
            id: 'opt_1_provoke',
            toneLabel: 'Recado aos Rivais',
            responseText:
              'Quem duvidou da força do nosso elenco viu a resposta no gramado. Vamos brigar no topo!',
            boardDelta: 0,
            fanDelta: 5,
            moraleShift: 1,
            reputationDelta: 1,
            headlineResult: `"Demos a resposta em campo", dispara técnico do ${userClub.shortName}`,
          },
        ],
      }
    : drew
    ? {
        id: `pq_1_${round}`,
        outletName: 'Rádio Arena FM',
        journalistName: 'Helena Vasconcelos',
        questionText: `O empate em ${userGoals} a ${oppGoals} contra o ${opponentName} deixou um gosto amargo na arquibancada. Faltou ousadia nos minutos finais?`,
        options: [
          {
            id: 'opt_1_defend',
            toneLabel: 'Proteger os Jogadores',
            responseText:
              'Criamos volume e lutamos até o fim. A responsabilidade pelas escolhas táticas é inteiramente minha.',
            boardDelta: 1,
            fanDelta: 1,
            moraleShift: 1,
            reputationDelta: 1,
            headlineResult: `Treinador blinda vestiário do ${userClub.shortName} após igualdade`,
          },
          {
            id: 'opt_1_demand',
            toneLabel: 'Cobrar Eficiência',
            responseText:
              'Não podemos desperdiçar chances claras nesse nível. Vamos cobrar capricho dobrado durante a semana.',
            boardDelta: 3,
            fanDelta: 3,
            moraleShift: -1,
            reputationDelta: 1,
            headlineResult: `Técnico cobra pontaria do ataque após empate diante do ${opponentName}`,
          },
          {
            id: 'opt_1_value_point',
            toneLabel: 'Valorizar o Ponto',
            responseText:
              'Todo ponto no calendário brasileiro pesa lá na frente. Mantivemos a organização contra um rival duro.',
            boardDelta: 2,
            fanDelta: -1,
            moraleShift: 0,
            reputationDelta: 0,
            headlineResult: `Comissão técnica valoriza equilíbrio após ${userGoals}x${oppGoals}`,
          },
        ],
      }
    : {
        id: `pq_1_${round}`,
        outletName: 'Portal Futebol Total',
        journalistName: 'Ricardo Salles',
        questionText: `Derrota dura por ${userGoals} a ${oppGoals} diante do ${opponentName}. A pressão da torcida aumentou — o que deu errado hoje?`,
        options: [
          {
            id: 'opt_1_assume',
            toneLabel: 'Assumir Responsabilidade',
            responseText:
              'A estratégia não encaixou e assumo a responsabilidade. O grupo tem caráter para reagir já na próxima rodada.',
            boardDelta: 2,
            fanDelta: 2,
            moraleShift: 1,
            reputationDelta: 1,
            headlineResult: `Treinador chama responsabilidade e protege elenco do ${userClub.shortName}`,
          },
          {
            id: 'opt_1_hard_talk',
            toneLabel: 'Cobrar Postura Forte',
            responseText:
              'Faltou intensidade competitiva para vestir a camisa do clube. Teremos conversa franca no vestiário.',
            boardDelta: 2,
            fanDelta: 4,
            moraleShift: -1,
            reputationDelta: 0,
            headlineResult: `Clima quente: técnico promete cobrança forte após revés para o ${opponentName}`,
          },
          {
            id: 'opt_1_calm',
            toneLabel: 'Pedir Paciência ao Torcedor',
            responseText:
              'Oscilações acontecem numa temporada intensa. Confio plenamente no trabalho que estamos construindo.',
            boardDelta: 1,
            fanDelta: -1,
            moraleShift: 0,
            reputationDelta: 0,
            headlineResult: `Treinador pede calma após tropeço no ${competitionLabel}`,
          },
        ],
      };

  const q2: PressConferenceQuestion = {
    id: `pq_2_${round}`,
    outletName: 'Jornal da Bancada',
    journalistName: 'Andréia Couto',
    questionText: `Sobre a gestão do grupo: como você avalia o momento individual de ${starName} e a disputa por vagas entre titulares e reservas?`,
    options: [
      {
        id: 'opt_2_merit',
        toneLabel: 'Meritocracia Total',
        responseText: `${starName} é referência técnica, mas aqui ninguém tem cadeira cativa: joga quem entrega mais nos treinos.`,
        boardDelta: 2,
        fanDelta: 2,
        moraleShift: 0,
        reputationDelta: 1,
        headlineResult: `Meritocracia dá o tom na disputa por vagas no ${userClub.shortName}`,
      },
      {
        id: 'opt_2_star',
        toneLabel: 'Elogiar Liderança',
        responseText: `${starName} puxa a fila nos treinos e eleva o sarrafo de todo o vestiário. É um privilégio contar com ele.`,
        boardDelta: 1,
        fanDelta: 3,
        moraleShift: 1,
        reputationDelta: 1,
        headlineResult: `Elogios públicos a ${starName} fortalecem ambiente interno`,
      },
      {
        id: 'opt_2_rotation',
        toneLabel: 'Destacar Rodízio Físico',
        responseText:
          'Com essa maratona de jogos, vamos rodar o elenco com inteligência para evitar lesões e manter a intensidade.',
        boardDelta: 3,
        fanDelta: 0,
        moraleShift: 0,
        reputationDelta: 1,
        headlineResult: `Comissão planeja rodízio estratégico para suportar calendário cheio`,
      },
    ],
  };

  const q3: PressConferenceQuestion = {
    id: `pq_3_${round}`,
    outletName: 'Canal Bastidores FC',
    journalistName: 'Gustavo Prado',
    questionText: `A diretoria traçou metas ambiciosas para ${userClub.name} nesta temporada. O elenco atual é suficiente ou você espera reforços?`,
    options: [
      {
        id: 'opt_3_aligned',
        toneLabel: 'Alinhado à Diretoria',
        responseText:
          'Trabalhamos em sintonia total com a presidência e com responsabilidade financeira. Vamos extrair o máximo de quem está aqui.',
        boardDelta: 4,
        fanDelta: 0,
        moraleShift: 1,
        reputationDelta: 1,
        headlineResult: `Sintonia fina entre comissão técnica e diretoria do ${userClub.shortName}`,
      },
      {
        id: 'opt_3_ambitious',
        toneLabel: 'Cobrar Reforços Pontuais',
        responseText:
          'Para brigar por todas as taças que o torcedor sonha, estamos sempre atentos a oportunidades cirúrgicas de mercado.',
        boardDelta: -2,
        fanDelta: 4,
        moraleShift: 0,
        reputationDelta: 1,
        headlineResult: `Técnico indica busca por reforços pontuais para elevar patamar`,
      },
      {
        id: 'opt_3_youth',
        toneLabel: 'Valorizar Base e Trabalho',
        responseText:
          'Temos soluções dentro de casa e jovens pedindo passagem. Nosso foco é evolução diária no CT.',
        boardDelta: 3,
        fanDelta: 2,
        moraleShift: 0,
        reputationDelta: 1,
        headlineResult: `Aposta na base e trabalho no CT guiam planejamento do ${userClub.shortName}`,
      },
    ],
  };

  return [q1, q2, q3];
}

export function createOnDemandPressConference(
  save: GameSave,
  userClub: Club
): PressConferenceSession {
  return {
    id: `press_manual_${save.currentSeasonYear}_${save.currentRound}_${Date.now()}`,
    round: save.currentRound,
    date: save.currentDate,
    contextTitle: `Coletiva Oficial no CT · Rodada ${save.currentRound}`,
    contextSubtitle: `${formatCalendarDate(save.currentDate)} · Sala de Imprensa do ${userClub.name}`,
    completed: false,
    questions: buildPressQuestions({
      userClub,
      opponentName: 'próximo adversário',
      userGoals: 1,
      oppGoals: 0,
      competitionLabel: `Temporada ${save.currentSeasonYear}`,
      round: save.currentRound,
    }),
  };
}

/**
 * Runs at the end of every round (`handleFinishRound`) to:
 * 1) Check promised playing time on resolved demands
 * 2) Trigger realistic new locker room demands (benched stars or underpaid standouts)
 * 3) Generate a Press Conference after derbies, knockout matches, big wins/losses, or every 4 rounds
 */
export function processRoundLockerRoomAndPress(params: {
  clubs: Club[];
  userClubId: string;
  completedFixture: Fixture;
  currentRound: number;
  currentDate: string;
  seasonYear: number;
  existingLockerRoom?: LockerRoomState;
  competitionLabel: string;
}): {
  updatedClubs: Club[];
  updatedLockerRoom: LockerRoomState;
  newInboxMessages: InboxMessage[];
} {
  const {
    clubs,
    userClubId,
    completedFixture,
    currentRound,
    currentDate,
    seasonYear,
    existingLockerRoom,
    competitionLabel,
  } = params;

  const newInboxMessages: InboxMessage[] = [];
  let userClub = clubs.find((c) => c.id === userClubId);
  if (!userClub) {
    return {
      updatedClubs: clubs,
      updatedLockerRoom: existingLockerRoom || {
        harmonyScore: 78,
        activeDemands: [],
        resolvedDemandsHistory: [],
        activePressConference: null,
        pressHistory: [],
        lastTalkRoundByPlayer: {},
      },
      newInboxMessages,
    };
  }

  const baseLocker: LockerRoomState = existingLockerRoom
    ? {
        ...existingLockerRoom,
        activeDemands: [...(existingLockerRoom.activeDemands || [])],
        resolvedDemandsHistory: [...(existingLockerRoom.resolvedDemandsHistory || [])],
        pressHistory: [...(existingLockerRoom.pressHistory || [])],
        lastTalkRoundByPlayer: { ...(existingLockerRoom.lastTalkRoundByPlayer || {}) },
      }
    : {
        harmonyScore: 78,
        activeDemands: [],
        resolvedDemandsHistory: [],
        activePressConference: null,
        pressHistory: [],
        lastTalkRoundByPlayer: {},
      };

  let updatedSquad = [...userClub.squad];

  // 1. Check fulfilled or broken playing-time promises
  baseLocker.resolvedDemandsHistory = baseLocker.resolvedDemandsHistory.map((item) => {
    if (item.promisedStarterUntilRound && item.promisedStarterUntilRound === currentRound) {
      const targetPlayer = updatedSquad.find((p) => p.id === item.playerId);
      if (targetPlayer) {
        if (targetPlayer.isStarter) {
          updatedSquad = updatedSquad.map((p) =>
            p.id === targetPlayer.id ? { ...p, morale: 'Excelente' } : p
          );
        } else {
          updatedSquad = updatedSquad.map((p) =>
            p.id === targetPlayer.id ? { ...p, morale: 'Baixa' } : p
          );
          newInboxMessages.push({
            id: `msg_promise_broken_${currentRound}_${targetPlayer.id}`,
            title: `Vestiário: ${targetPlayer.name} cobra promessa não cumprida`,
            message: `${targetPlayer.name} lembrou que você prometeu sequência entre os titulares até a Rodada ${currentRound}, mas ele permaneceu fora da equipe inicial. A moral do atleta caiu.`,
            date: currentDate,
            round: currentRound,
            read: false,
            type: 'DRESSING_ROOM',
          });
        }
      }
      return { ...item, promisedStarterUntilRound: undefined };
    }
    return item;
  });

  // 2. Possibly generate 1 new realistic player demand (max 3 active pending demands)
  const pendingDemands = baseLocker.activeDemands.filter((d) => d.status === 'PENDING');
  const pendingPlayerIds = new Set(pendingDemands.map((d) => d.playerId));

  if (pendingDemands.length < 3 && currentRound >= 3 && currentRound % 3 === 0) {
    const starterAvgOvr =
      updatedSquad.filter((p) => p.isStarter).reduce((acc, p) => acc + p.overall, 0) /
      Math.max(1, updatedSquad.filter((p) => p.isStarter).length);

    // Candidate A: Healthy non-starter with high OVR asking for minutes
    const benchedStar = updatedSquad
      .filter(
        (p) =>
          !p.isStarter &&
          p.injuryWeeks === 0 &&
          !p.injuryDetails &&
          !p.isSuspended &&
          !pendingPlayerIds.has(p.id) &&
          p.overall >= starterAvgOvr - 1
      )
      .sort((a, b) => b.overall - a.overall)[0];

    // Candidate B: High-performing starter with high rating/goals asking for valorization
    const underpaidStar = updatedSquad
      .filter(
        (p) =>
          p.isStarter &&
          !pendingPlayerIds.has(p.id) &&
          p.matches >= 4 &&
          (p.ratingAverage >= 7.3 || p.goals >= 4)
      )
      .sort((a, b) => b.ratingAverage - a.ratingAverage)[0];

    const chosen = benchedStar && Math.random() < 0.62 ? benchedStar : underpaidStar;
    if (chosen) {
      const isPlayingTime = chosen.id === benchedStar?.id;
      const newDemand: PlayerLockerDemand = {
        id: `demand_${seasonYear}_${currentRound}_${chosen.id}`,
        playerId: chosen.id,
        playerName: chosen.name,
        playerRole: chosen.detailedRole,
        playerOverall: chosen.overall,
        category: isPlayingTime ? 'PLAYING_TIME' : 'WAGE_VALORIZATION',
        createdRound: currentRound,
        createdDate: currentDate,
        complaintText: isPlayingTime
          ? `"Professor, venho treinando forte todos os dias e sinto que tenho nível (OVR ${chosen.overall}) para ajudar o time como titular."`
          : `"Chefe, venho decidindo jogos com média ${chosen.ratingAverage.toFixed(
              1
            )} e gostaria de saber se o clube reconhece minha importância no grupo."`,
        status: 'PENDING',
      };

      baseLocker.activeDemands = [newDemand, ...baseLocker.activeDemands];
      newInboxMessages.push({
        id: `msg_locker_demand_${currentRound}_${chosen.id}`,
        title: `Conversa de Vestiário: ${chosen.name} pede reunião`,
        message: `${chosen.name} (${chosen.detailedRole} · OVR ${chosen.overall}) procurou a comissão técnica no CT para conversar sobre ${
          isPlayingTime ? 'espaço entre os titulares' : 'valorização no elenco'
        }. Acesse Diretoria → Vestiário para responder.`,
        date: currentDate,
        round: currentRound,
        read: false,
        type: 'DRESSING_ROOM',
      });
    }
  }

  // 3. Generate Post-Match Press Conference on marquee matches or every 3 rounds
  const isUserHome = completedFixture.homeTeamId === userClubId;
  const userGoals = (isUserHome ? completedFixture.homeScore : completedFixture.awayScore) ?? 0;
  const oppGoals = (isUserHome ? completedFixture.awayScore : completedFixture.homeScore) ?? 0;
  const oppId = isUserHome ? completedFixture.awayTeamId : completedFixture.homeTeamId;
  const oppClub = clubs.find((c) => c.id === oppId);
  const oppName = oppClub?.shortName || 'Adversário';
  const isBigSwing = Math.abs(userGoals - oppGoals) >= 2;
  const isCupDecision = Boolean(completedFixture.cupPhase);

  if (isCupDecision || isBigSwing || currentRound % 3 === 1) {
    const pressSession: PressConferenceSession = {
      id: `press_${seasonYear}_${currentRound}_${Date.now()}`,
      round: currentRound,
      date: currentDate,
      contextTitle: `Coletiva Pós-Jogo · ${userClub.shortName} ${userGoals} x ${oppGoals} ${oppName}`,
      contextSubtitle: `${competitionLabel} · ${formatCalendarDate(currentDate)}`,
      completed: false,
      questions: buildPressQuestions({
        userClub: { ...userClub, squad: updatedSquad },
        opponentName: oppName,
        userGoals,
        oppGoals,
        competitionLabel,
        round: currentRound,
      }),
    };
    baseLocker.activePressConference = pressSession;

    newInboxMessages.push({
      id: `msg_press_${currentRound}_${Date.now()}`,
      title: `Sala de Imprensa: Jornalistas aguardam sua Coletiva`,
      message: `A imprensa esportiva aguarda sua entrevista coletiva após ${userClub.shortName} ${userGoals} x ${oppGoals} ${oppName} (${competitionLabel}). Suas respostas impactam Diretoria, Torcida e Vestiário.`,
      date: currentDate,
      round: currentRound,
      read: false,
      type: 'PRESS',
    });
  }

  const pendingAfter = baseLocker.activeDemands.filter((d) => d.status === 'PENDING').length;
  userClub = { ...userClub, squad: updatedSquad };
  baseLocker.harmonyScore = computeSquadHarmonyScore(userClub, pendingAfter);

  const updatedClubs = clubs.map((c) => (c.id === userClubId ? userClub! : c));
  return {
    updatedClubs,
    updatedLockerRoom: baseLocker,
    newInboxMessages,
  };
}

export function resolvePlayerDemand(params: {
  save: GameSave;
  demandId: string;
  responseChoice: 'PROMISE_STARTER' | 'REWARD_BONUS' | 'DEMAND_PATIENCE' | 'FIRM_AUTHORITY';
}): {
  updatedClubs: Club[];
  updatedLockerRoom: LockerRoomState;
  updatedCareer?: ManagerCareerState;
  feedbackText: string;
  positive: boolean;
} {
  const { save, demandId, responseChoice } = params;
  const locker = ensureLockerRoomState(save);
  const demand = locker.activeDemands.find((d) => d.id === demandId);
  const userClub = save.clubs.find((c) => c.id === save.userClubId);

  if (!demand || !userClub) {
    return {
      updatedClubs: save.clubs,
      updatedLockerRoom: locker,
      updatedCareer: save.managerCareer,
      feedbackText: 'Demanda não encontrada.',
      positive: false,
    };
  }

  let positive = true;
  let feedbackText = '';
  let promisedUntil: number | undefined;
  let wageIncrease = 0;
  let moraleDelta: -1 | 0 | 1 = 0;
  let career = save.managerCareer ? { ...save.managerCareer } : undefined;

  if (responseChoice === 'PROMISE_STARTER') {
    promisedUntil = save.currentRound + 2;
    moraleDelta = 1;
    feedbackText = `Você prometeu sequência como titular a ${demand.playerName} até a Rodada ${promisedUntil}. Ele saiu motivado da sala!`;
  } else if (responseChoice === 'REWARD_BONUS') {
    const target = userClub.squad.find((p) => p.id === demand.playerId);
    wageIncrease = Math.round((target?.wage || 60000) * 0.12);
    moraleDelta = 1;
    feedbackText = `Reajuste de valorização concedido a ${demand.playerName} (+R$ ${wageIncrease.toLocaleString(
      'pt-BR'
    )}/mês). Moral elevada a Excelente!`;
  } else if (responseChoice === 'DEMAND_PATIENCE') {
    moraleDelta = 0;
    feedbackText = `Você explicou o rodízio tático a ${demand.playerName}. Ele compreendeu o momento e seguirá trabalhando.`;
  } else {
    positive = Math.random() < 0.55;
    moraleDelta = positive ? 0 : -1;
    if (career) {
      career.boardConfidence = Math.min(100, career.boardConfidence + 2);
    }
    feedbackText = positive
      ? `Pulso firme! ${demand.playerName} respeitou sua autoridade e a diretoria elogiou o comando do vestiário.`
      : `${demand.playerName} não gostou do tom rígido e deixou a reunião insatisfeito, mas o elenco sentiu sua autoridade.`;
  }

  const updatedSquad = userClub.squad.map((p) => {
    if (p.id !== demand.playerId) return p;
    return {
      ...p,
      wage: p.wage + wageIncrease,
      morale:
        responseChoice === 'REWARD_BONUS'
          ? ('Excelente' as Morale)
          : shiftMorale(p.morale, moraleDelta),
    };
  });

  const resolvedItem: PlayerLockerDemand = {
    ...demand,
    status: positive ? 'RESOLVED_POSITIVE' : 'RESOLVED_TENSE',
    promisedStarterUntilRound: promisedUntil,
    resolutionSummary: feedbackText,
  };

  const remainingActive = locker.activeDemands.filter((d) => d.id !== demandId);
  const updatedClub: Club = { ...userClub, squad: updatedSquad };
  const nextLocker: LockerRoomState = {
    ...locker,
    activeDemands: remainingActive,
    resolvedDemandsHistory: [resolvedItem, ...locker.resolvedDemandsHistory].slice(0, 18),
    harmonyScore: computeSquadHarmonyScore(
      updatedClub,
      remainingActive.filter((d) => d.status === 'PENDING').length
    ),
  };

  return {
    updatedClubs: save.clubs.map((c) => (c.id === userClub.id ? updatedClub : c)),
    updatedLockerRoom: nextLocker,
    updatedCareer: career,
    feedbackText,
    positive,
  };
}

export function holdIndividualPlayerTalk(params: {
  save: GameSave;
  playerId: string;
  tone: 'PRAISE_FORM' | 'DEMAND_FOCUS' | 'REST_RECOVERY';
}): {
  updatedClubs: Club[];
  updatedLockerRoom: LockerRoomState;
  feedbackText: string;
  positive: boolean;
} {
  const { save, playerId, tone } = params;
  const locker = ensureLockerRoomState(save);
  const userClub = save.clubs.find((c) => c.id === save.userClubId);
  const player = userClub?.squad.find((p) => p.id === playerId);

  if (!userClub || !player) {
    return {
      updatedClubs: save.clubs,
      updatedLockerRoom: locker,
      feedbackText: 'Jogador não encontrado no elenco.',
      positive: false,
    };
  }

  if (locker.lastTalkRoundByPlayer[playerId] === save.currentRound) {
    return {
      updatedClubs: save.clubs,
      updatedLockerRoom: locker,
      feedbackText: `Você já conversou individualmente com ${player.name} nesta rodada.`,
      positive: false,
    };
  }

  let nextMorale = player.morale;
  let nextCond = player.condition;
  let nextProgress = player.trainingProgress || 0;
  let feedbackText = '';

  if (tone === 'PRAISE_FORM') {
    nextMorale = shiftMorale(player.morale, 1);
    nextProgress = Math.min(99, nextProgress + 4);
    feedbackText = `Conversa individual: ${player.name} agradeceu a confiança da comissão técnica (+Moral e +4% progresso de treino).`;
  } else if (tone === 'DEMAND_FOCUS') {
    const respondedWell = player.age >= 23 || player.morale !== 'Péssima';
    nextMorale = respondedWell ? shiftMorale(player.morale, 1) : player.morale;
    nextProgress = Math.min(99, nextProgress + 7);
    feedbackText = `Cobrança olho no olho: ${player.name} prometeu foco dobrado nos treinamentos da semana (+7% progresso de evolução).`;
  } else {
    nextCond = Math.min(100, player.condition + 6);
    nextMorale = shiftMorale(player.morale, 1);
    feedbackText = `Gestão de carga: ${player.name} realizou sessão regenerativa personalizada (+6% condição física e moral renovada).`;
  }

  const updatedSquad = userClub.squad.map((p) =>
    p.id === playerId
      ? {
          ...p,
          morale: nextMorale,
          condition: nextCond,
          trainingProgress: nextProgress,
        }
      : p
  );

  const updatedClub: Club = { ...userClub, squad: updatedSquad };
  const nextLocker: LockerRoomState = {
    ...locker,
    lastTalkRoundByPlayer: {
      ...locker.lastTalkRoundByPlayer,
      [playerId]: save.currentRound,
    },
    harmonyScore: computeSquadHarmonyScore(
      updatedClub,
      locker.activeDemands.filter((d) => d.status === 'PENDING').length
    ),
  };

  return {
    updatedClubs: save.clubs.map((c) => (c.id === userClub.id ? updatedClub : c)),
    updatedLockerRoom: nextLocker,
    feedbackText,
    positive: true,
  };
}

export function submitPressConferenceAnswers(params: {
  save: GameSave;
  selectedOptionsByQuestionId: Record<string, string>;
}): {
  updatedClubs: Club[];
  updatedLockerRoom: LockerRoomState;
  updatedCareer?: ManagerCareerState;
  feedbackText: string;
} {
  const { save, selectedOptionsByQuestionId } = params;
  const locker = ensureLockerRoomState(save);
  const session = locker.activePressConference;
  const userClub = save.clubs.find((c) => c.id === save.userClubId);

  if (!session || !userClub) {
    return {
      updatedClubs: save.clubs,
      updatedLockerRoom: locker,
      updatedCareer: save.managerCareer,
      feedbackText: 'Nenhuma coletiva ativa no momento.',
    };
  }

  let totalBoardDelta = 0;
  let totalFanDelta = 0;
  let totalRepDelta = 0;
  let totalMoraleShift = 0;
  const headlines: string[] = [];

  const answeredQuestions = session.questions.map((q) => {
    const chosenId = selectedOptionsByQuestionId[q.id] || q.options[0]?.id;
    const opt = q.options.find((o) => o.id === chosenId) || q.options[0];
    if (opt) {
      totalBoardDelta += opt.boardDelta;
      totalFanDelta += opt.fanDelta;
      totalRepDelta += opt.reputationDelta;
      totalMoraleShift += opt.moraleShift;
      headlines.push(opt.headlineResult);
    }
    return {
      ...q,
      chosenOptionId: opt?.id,
    };
  });

  const moraleStep: -1 | 0 | 1 =
    totalMoraleShift >= 1 ? 1 : totalMoraleShift <= -1 ? -1 : 0;

  const updatedSquad =
    moraleStep === 0
      ? userClub.squad
      : userClub.squad.map((p) => ({
          ...p,
          morale: shiftMorale(p.morale, moraleStep),
        }));

  const updatedClub: Club = { ...userClub, squad: updatedSquad };
  const completedSession: PressConferenceSession = {
    ...session,
    completed: true,
    questions: answeredQuestions,
    summaryHeadline: headlines[0] || 'Coletiva encerrada na Sala de Imprensa',
  };

  const nextCareer: ManagerCareerState | undefined = save.managerCareer
    ? {
        ...save.managerCareer,
        boardConfidence: Math.max(
          5,
          Math.min(100, save.managerCareer.boardConfidence + totalBoardDelta)
        ),
        fanConfidence: Math.max(
          5,
          Math.min(100, save.managerCareer.fanConfidence + totalFanDelta)
        ),
        managerReputation: Math.max(
          1,
          Math.min(100, save.managerCareer.managerReputation + totalRepDelta)
        ),
      }
    : undefined;

  const nextLocker: LockerRoomState = {
    ...locker,
    activePressConference: null,
    pressHistory: [completedSession, ...locker.pressHistory].slice(0, 15),
    harmonyScore: computeSquadHarmonyScore(
      updatedClub,
      locker.activeDemands.filter((d) => d.status === 'PENDING').length
    ),
  };

  const deltaParts: string[] = [];
  if (totalBoardDelta !== 0) {
    deltaParts.push(`Diretoria ${totalBoardDelta > 0 ? `+${totalBoardDelta}` : totalBoardDelta}`);
  }
  if (totalFanDelta !== 0) {
    deltaParts.push(`Torcida ${totalFanDelta > 0 ? `+${totalFanDelta}` : totalFanDelta}`);
  }
  if (totalRepDelta !== 0) {
    deltaParts.push(`Reputação ${totalRepDelta > 0 ? `+${totalRepDelta}` : totalRepDelta}`);
  }
  if (moraleStep !== 0) {
    deltaParts.push(`Moral do Elenco ${moraleStep > 0 ? 'em alta' : 'pressionada'}`);
  }

  return {
    updatedClubs: save.clubs.map((c) => (c.id === userClub.id ? updatedClub : c)),
    updatedLockerRoom: nextLocker,
    updatedCareer: nextCareer,
    feedbackText: `Manchete: "${completedSession.summaryHeadline}" (${deltaParts.join(' · ') || 'Repercussão equilibrada'}).`,
  };
}

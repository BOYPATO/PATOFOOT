import {
  Club,
  InGameTacticOrder,
  Player,
  PlayerInjury,
  InboxMessage,
  MedicalReportData,
  InjurySeverity,
  MedicalStage,
  Morale,
} from '../types/game';

export interface InjuryTemplate {
  name: string;
  severity: InjurySeverity;
  minDays: number;
  maxDays: number;
  doctorNotes: string;
  treatmentPlan: string;
}

export const INJURIES_CATALOG: InjuryTemplate[] = [
  {
    name: 'Contusão Muscular na Coxa',
    severity: 'Leve',
    minDays: 4,
    maxDays: 7,
    doctorNotes: 'Trauma direto durante a partida. Sem rompimento de fibras, apenas edema local e dor à palpação.',
    treatmentPlan: 'Crioterapia localizada 3x ao dia, compressas frias e liberação miofascial leve.',
  },
  {
    name: 'Edema no Músculo Adutor',
    severity: 'Leve',
    minDays: 6,
    maxDays: 10,
    doctorNotes: 'Sobrecarga na região da virilha. Ultrassonografia revelou leve edema sem ruptura anatômica.',
    treatmentPlan: 'Fisioterapia regenerativa, eletroestimulação (TENS) e exercícios de mobilidade pélvica.',
  },
  {
    name: 'Entorse no Tornozelo Grau I',
    severity: 'Leve',
    minDays: 8,
    maxDays: 14,
    doctorNotes: 'Pisada em falso no gramado. Estiramento ligamentar leve no complexo lateral do tornozelo.',
    treatmentPlan: 'Bota imobilizadora nos primeiros dias, drenagem de edema e propriocepção em prancha.',
  },
  {
    name: 'Estiramento Grau II no Posterior da Coxa',
    severity: 'Moderada',
    minDays: 16,
    maxDays: 26,
    doctorNotes: 'Fisgada clássica durante arrancada em velocidade. Ruptura parcial de cerca de 15% das fibras musculares.',
    treatmentPlan: 'Laserterapia de alta potência, ultrassom pulsado e fortalecimento excêntrico progressivo.',
  },
  {
    name: 'Fissura por Estresse na Costela',
    severity: 'Moderada',
    minDays: 18,
    maxDays: 28,
    doctorNotes: 'Choque forte com adversário na grande área. Microfissura óssea sem desvio.',
    treatmentPlan: 'Repouso de impacto torácico, esteira aquática e exercícios de manutenção cardiopulmonar.',
  },
  {
    name: 'Tendinite Patelar Aguda no Joelho',
    severity: 'Moderada',
    minDays: 14,
    maxDays: 24,
    doctorNotes: 'Quadro inflamatório agudo no tendão patelar por repetição de chutes e saltos.',
    treatmentPlan: 'Ondas de choque (TOC), gelo pós-atividade e isometria de quadríceps no REFFIS.',
  },
  {
    name: 'Lesão no Menisco Medial',
    severity: 'Grave',
    minDays: 30,
    maxDays: 50,
    doctorNotes: 'Entorse com movimento rotacional do joelho. Lesão meniscal necessitando descompressão e reabilitação intensiva.',
    treatmentPlan: 'Reabilitação articular, cinesioterapia com pouca carga e fortalecimento estabilizador.',
  },
  {
    name: 'Pubalgia Crônica Inflamatória',
    severity: 'Grave',
    minDays: 35,
    maxDays: 60,
    doctorNotes: 'Desequilíbrio de forças entre a musculatura abdominal e os adutores. Dor limitante ao bater na bola.',
    treatmentPlan: 'Reeducação postural global (RPG), fortalecimento de CORE profundo e reequilíbrio miofascial.',
  },
  {
    name: 'Fratura na Fíbula',
    severity: 'Grave',
    minDays: 45,
    maxDays: 75,
    doctorNotes: 'Entrada dura sofrida na perna. Fratura sem necessidade cirúrgica aberta, consolidação óssea em andamento.',
    treatmentPlan: 'Imobilização gessada, magnetoterapia para osteogênese e hidroginástica para perda zero de condicionamento.',
  },
  {
    name: 'Ruptura do Ligamento Cruzado Anterior (LCA)',
    severity: 'Gravíssima',
    minDays: 120,
    maxDays: 190,
    doctorNotes: 'Entorse severa no joelho com estalo audível. Ruptura ligamentar completa comprovada por Ressonância Magnética.',
    treatmentPlan: 'Protocolo de reconstrução ligamentar: proteção do enxerto, ganho de arco articular e hipertrofia.',
  },
];

/**
 * Calculates reduction in recovery days based on club's medical facility level (1 to 5)
 */
export function getMedicalFacilityBonus(facilityLevel: number = 2): {
  percent: number;
  label: string;
} {
  switch (facilityLevel) {
    case 5:
      return { percent: 0.35, label: 'Instituto de Excelência Esportiva (-35% no tempo de recuperação)' };
    case 4:
      return { percent: 0.25, label: 'Centro de Fisiologia & Crioterapia Avançada (-25% no tempo)' };
    case 3:
      return { percent: 0.18, label: 'Departamento Médico Especializado (-18% no tempo)' };
    case 2:
      return { percent: 0.10, label: 'Clínica Integrada com Aparelhagem Moderna (-10% no tempo)' };
    case 1:
    default:
      return { percent: 0.0, label: 'Enfermaria Padrão (Sem aceleração)' };
  }
}

/**
 * Picks a realistic injury severity distribution:
 * - ~66% Leve (4–12 dias)
 * - ~25% Moderada (14–26 dias)
 * - ~7.5% Grave (30–65 dias)
 * - ~1.5% Gravíssima (LCA)
 */
function pickWeightedInjuryTemplate(): InjuryTemplate {
  const roll = Math.random();
  let targetSeverity: InjurySeverity = 'Leve';
  if (roll < 0.66) targetSeverity = 'Leve';
  else if (roll < 0.91) targetSeverity = 'Moderada';
  else if (roll < 0.985) targetSeverity = 'Grave';
  else targetSeverity = 'Gravíssima';

  const pool = INJURIES_CATALOG.filter((t) => t.severity === targetSeverity);
  if (pool.length === 0) {
    return INJURIES_CATALOG[0];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Calcula o desgaste físico (perda de condição) realista de um atleta em uma partida,
 * levando em conta posição, tática/intensidade, minutos jogados e curva de idade
 * (jogadores mais velhos cansam significativamente mais).
 */
export function computeMatchFatigueCost(
  player: Player,
  params: {
    playedFullStarter: boolean;
    subbedOut?: boolean;
    subbedIn?: boolean;
    inGameTactic?: InGameTacticOrder;
    isHighIntensityContext?: boolean;
  }
): number {
  if (!params.playedFullStarter && !params.subbedOut && !params.subbedIn) {
    return 0;
  }

  // Base de desgaste para 90 minutos por posição
  let baseCost = 21;
  if (player.detailedRole === 'GOL' || player.position === 'GK') {
    baseCost = 10;
  } else if (player.detailedRole === 'ZAG') {
    baseCost = 17;
  } else if (player.detailedRole === 'ATA') {
    baseCost = 20;
  } else {
    // LAT, VOL, MEI (maior quilometragem por jogo)
    baseCost = 22;
  }

  // Intensidade tática
  let tacticMult = 1.0;
  if (params.inGameTactic === 'PRESSAO_TOTAL') tacticMult = 1.28;
  else if (params.inGameTactic === 'CONTRA_ATAQUE' || params.inGameTactic === 'CHUVEIRINHO') {
    tacticMult = 1.08;
  } else if (params.inGameTactic === 'RETRANCA') tacticMult = 0.9;
  else if (params.inGameTactic === 'SEGURAR_RESULTADO') tacticMult = 0.85;

  if (params.isHighIntensityContext) {
    tacticMult *= 1.08;
  }

  // Curva de idade: jovens aguentam sequência; veteranos (30+) desgastam bem mais
  const ageMult =
    player.age <= 23
      ? 0.88
      : player.age <= 27
      ? 1.0
      : player.age <= 30
      ? 1.14
      : player.age <= 33
      ? 1.3
      : player.age <= 35
      ? 1.48
      : 1.65;

  // Fração de minutos em campo
  const minutesMult = params.playedFullStarter
    ? 1.0
    : params.subbedOut
    ? 0.65
    : 0.44;

  // Jogador que já entra cansado (< 72%) sofre desgaste extra por fadiga acumulada
  const preFatigueMult = player.condition < 65 ? 1.15 : player.condition < 75 ? 1.06 : 1.0;

  return Math.max(
    4,
    Math.round(baseCost * tacticMult * ageMult * minutesMult * preFatigueMult)
  );
}

/**
 * Calcula a recuperação física diária realista (entre partidas/dias de descanso),
 * respeitando a idade do atleta (jovens recuperam rápido; veteranos 31+ precisam de mais dias ou rodízio).
 */
export function computeDailyConditionRecovery(
  player: Player,
  staffDailyBonus: number = 0,
  isMotivador: boolean = false
): number {
  const baseByAge =
    player.age <= 23
      ? 10
      : player.age <= 27
      ? 9
      : player.age <= 30
      ? 7.5
      : player.age <= 33
      ? 6
      : player.age <= 35
      ? 4.8
      : 3.8;

  // Preparador físico & motivador ajudam de forma realista (+0.5 a +2.5/dia)
  const scaledStaffBonus = Math.min(2.5, Math.max(0, staffDailyBonus * 0.45));
  const motivatorBonus = isMotivador ? 0.6 : 0;

  return Math.max(3, Math.round(baseByAge + scaledStaffBonus + motivatorBonus));
}

/**
 * Calcula o multiplicador de risco de lesão de um clube numa partida:
 * - Protege contra surtos irrealistas no DM (reduz drasticamente risco se já houver 2–3 lesionados)
 * - Considera nível do DM e staff médico contratado
 * - Aumenta risco se o técnico insistir em escalar titulares esgotados (< 65% físico)
 */
export function computeClubMatchInjuryMultiplier(
  club: Club,
  staffInjuryRiskMultiplier: number = 1.0,
  healthyStarters: Player[] = []
): number {
  const currentlyInjured = club.squad.filter(
    (p) => p.injuryWeeks > 0 || Boolean(p.injuryDetails)
  ).length;

  // Amortecedor de realismo: impede "epidemia" de 6–7 lesionados ao mesmo tempo
  let dmDampener = 1.0;
  if (currentlyInjured >= 4) return 0; // Trava máxima de segurança para lesões simultâneas
  if (currentlyInjured === 3) dmDampener = 0.2;
  else if (currentlyInjured === 2) dmDampener = 0.48;
  else if (currentlyInjured === 1) dmDampener = 0.78;

  const medLevel = Math.max(1, Math.min(5, club.finances.medicalFacilityLevel || 2));
  const facilityMult = Math.max(0.75, 1.05 - (medLevel - 1) * 0.075);

  // Fadiga real dos titulares em campo influencia o risco muscular
  const exhaustedCount = healthyStarters.filter((p) => p.condition < 62).length;
  const tiredCount = healthyStarters.filter((p) => p.condition >= 62 && p.condition < 74).length;
  const fatigueMult =
    exhaustedCount >= 3
      ? 1.55
      : exhaustedCount >= 1
      ? 1.25
      : tiredCount >= 4
      ? 1.12
      : 0.85; // Time bem descansado se machuca menos!

  return dmDampener * facilityMult * staffInjuryRiskMultiplier * fatigueMult;
}

/**
 * Seleciona a vítima mais realista caso ocorra uma lesão na partida
 * (jogadores cansados e veteranos desgastados têm maior probabilidade).
 */
export function pickWeightedInjuryVictim(healthyStarters: Player[]): Player | undefined {
  if (healthyStarters.length === 0) return undefined;
  const weighted: Player[] = [];
  for (const p of healthyStarters) {
    let weight = p.position === 'GK' ? 1 : 2;
    if (p.condition < 58) weight += 4;
    else if (p.condition < 70) weight += 2;
    if (p.age >= 32 && p.condition < 75) weight += 2;
    for (let i = 0; i < weight; i++) {
      weighted.push(p);
    }
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

/**
 * Diagnoses a new injury for a player and produces the player's injury data and initial Inbox medical report
 */
export function diagnosePlayerInjury(
  player: Player,
  date: string,
  round: number,
  medicalFacilityLevel: number = 2,
  specificTemplate?: InjuryTemplate
): { updatedPlayer: Player; inboxMessage: InboxMessage } {
  const template = specificTemplate || pickWeightedInjuryTemplate();

  const rawDays =
    Math.floor(Math.random() * (template.maxDays - template.minDays + 1)) +
    template.minDays;

  const bonus = getMedicalFacilityBonus(medicalFacilityLevel);
  const reductionDays = Math.round(rawDays * bonus.percent);
  const finalDays = Math.max(3, rawDays - reductionDays);
  const weeks = Math.ceil(finalDays / 7);

  const injuryDetails: PlayerInjury = {
    injuryType: template.name,
    diagnosisDate: date,
    severity: template.severity,
    initialDays: finalDays,
    remainingDays: finalDays,
    stage: 'Fisioterapia',
    doctorNotes: template.doctorNotes,
    treatmentPlan: template.treatmentPlan,
    facilityReductionDays: reductionDays,
    lastReportDate: date,
  };

  const updatedPlayer: Player = {
    ...player,
    injuryWeeks: weeks,
    injuryDetails,
    isStarter: false,
    isSubstitute: false,
    pitchSlot: undefined,
    condition: Math.min(player.condition, 60),
    morale: (player.morale === 'Excelente' ? 'Boa' : 'Regular') as Morale,
  };

  const reportData: MedicalReportData = {
    playerId: player.id,
    playerName: player.name,
    playerRole: player.detailedRole,
    squadNumber: player.squadNumber,
    overall: player.overall,
    injuryName: template.name,
    severity: template.severity,
    initialDays: finalDays,
    remainingDays: finalDays,
    progressPercentage: 0,
    stage: 'Fisioterapia',
    status: 'NOVA_LESAO',
    treatmentPlan: template.treatmentPlan,
    doctorAdvice: template.doctorNotes,
    medicalFacilityLevel,
    facilityReductionDays: reductionDays,
  };

  const severityIcon = template.severity === 'Gravíssima' ? '🚨' : template.severity === 'Grave' ? '⚠️' : '🏥';

  const inboxMessage: InboxMessage = {
    id: `med_rep_${Date.now()}_${player.id}`,
    title: `${severityIcon} BOLETIM MÉDICO: ${player.name} diagnosticado com ${template.name}`,
    message: `O Departamento Médico confirmou o diagnóstico de ${template.name} (${template.severity}) para o atleta ${player.name}. Tempo estimado de recuperação: ${finalDays} dias (${weeks} ${weeks === 1 ? 'semana' : 'semanas'}). O atleta foi encaminhado imediatamente à fisioterapia.`,
    date,
    round,
    read: false,
    type: 'INJURY',
    medicalReport: reportData,
  };

  return { updatedPlayer, inboxMessage };
}

/**
 * Advances the medical recovery of an entire squad by a given number of days.
 * Generates milestone updates in the inbox for the user's club (stage transitions & clearances).
 */
export function progressSquadMedicalDay(
  squad: Player[],
  days: number,
  currentDate: string,
  currentRound: number,
  medicalFacilityLevel: number = 2,
  isUserClub: boolean = false
): { updatedSquad: Player[]; generatedInboxMessages: InboxMessage[] } {
  const generatedInboxMessages: InboxMessage[] = [];

  const updatedSquad = squad.map((player) => {
    // If not injured, return as is
    if (player.injuryWeeks <= 0 && !player.injuryDetails) {
      return player;
    }

    // Recover or initialize details if missing
    let injury = player.injuryDetails;
    if (!injury) {
      const estimatedDays = Math.max(3, player.injuryWeeks * 7);
      injury = {
        injuryType: 'Lesão Muscular em Tratamento',
        diagnosisDate: currentDate,
        severity: player.injuryWeeks > 4 ? 'Grave' : player.injuryWeeks > 2 ? 'Moderada' : 'Leve',
        initialDays: estimatedDays,
        remainingDays: estimatedDays,
        stage: 'Fisioterapia',
        doctorNotes: 'Atleta segue o cronograma estabelecido pelo corpo médico.',
        treatmentPlan: 'Fisioterapia de recuperação e fortalecimento.',
        lastReportDate: currentDate,
      };
    }

    const previousStage = injury.stage;
    const newRemainingDays = Math.max(0, injury.remainingDays - days);
    const progressPct = Math.min(
      100,
      Math.max(0, Math.round(((injury.initialDays - newRemainingDays) / injury.initialDays) * 100))
    );

    let newStage: MedicalStage = injury.stage;
    let statusForReport: 'EVOLUCAO' | 'TRANSICAO' | 'TREINO_LEVE' | 'ALTA_MEDICA' = 'EVOLUCAO';

    if (newRemainingDays <= 0) {
      newStage = 'Liberado';
      statusForReport = 'ALTA_MEDICA';
    } else if (progressPct >= 75) {
      newStage = 'Treino com Bola';
      statusForReport = 'TREINO_LEVE';
    } else if (progressPct >= 40) {
      newStage = 'Transição Física';
      statusForReport = 'TRANSICAO';
    } else {
      newStage = 'Fisioterapia';
    }

    const updatedInjury: PlayerInjury = {
      ...injury,
      remainingDays: newRemainingDays,
      stage: newStage,
      lastReportDate: currentDate,
    };

    const newInjuryWeeks = Math.ceil(newRemainingDays / 7);

    // If fully healed:
    if (newRemainingDays <= 0) {
      if (isUserClub) {
        generatedInboxMessages.push({
          id: `med_clear_${Date.now()}_${player.id}`,
          title: `✅ ALTA MÉDICA: ${player.name} liberado pelo Departamento Médico!`,
          message: `Excelente notícia! O atleta ${player.name} (${player.detailedRole}) cumpriu todos os protocolos clínicos e testes de esforço físico. Encontra-se 100% recuperado de ${injury.injuryType} e recebeu alta oficial do Dr. Chefe do DM. O atleta já está disponível para escalação!`,
          date: currentDate,
          round: currentRound,
          read: false,
          type: 'INJURY',
          medicalReport: {
            playerId: player.id,
            playerName: player.name,
            playerRole: player.detailedRole,
            squadNumber: player.squadNumber,
            overall: player.overall,
            injuryName: injury.injuryType,
            severity: injury.severity,
            initialDays: injury.initialDays,
            remainingDays: 0,
            progressPercentage: 100,
            stage: 'Liberado',
            status: 'ALTA_MEDICA',
            treatmentPlan: 'Alta clínica concedida. Reintegração total aos trabalhos com o elenco.',
            doctorAdvice: 'Paciente respondeu com perfeição aos estímulos de carga e não apresenta qualquer limitação funcional.',
            medicalFacilityLevel,
            facilityReductionDays: injury.facilityReductionDays,
          },
        });
      }

      return {
        ...player,
        injuryWeeks: 0,
        injuryDetails: undefined,
        condition: Math.min(100, Math.max(82, player.condition + 15)),
        morale: 'Boa' as Morale,
      };
    }

    // If transitioned to Treino com Bola and hadn't triggered yet:
    if (newStage === 'Treino com Bola' && previousStage !== 'Treino com Bola' && isUserClub) {
      generatedInboxMessages.push({
        id: `med_ball_${Date.now()}_${player.id}`,
        title: `⚽ BOLETIM MÉDICO: ${player.name} inicia trabalhos com bola!`,
        message: `O Departamento Médico informa evolução clínica acelerada de ${player.name}. O jogador deixou os exercícios fechados e foi a campo realizar treinos técnicos com bola. Restam apenas ${newRemainingDays} dias (${newInjuryWeeks} sem.) para a liberação final.`,
        date: currentDate,
        round: currentRound,
        read: false,
        type: 'INJURY',
        medicalReport: {
          playerId: player.id,
          playerName: player.name,
          playerRole: player.detailedRole,
          squadNumber: player.squadNumber,
          overall: player.overall,
          injuryName: injury.injuryType,
          severity: injury.severity,
          initialDays: injury.initialDays,
          remainingDays: newRemainingDays,
          progressPercentage: progressPct,
          stage: 'Treino com Bola',
          status: 'TREINO_LEVE',
          treatmentPlan: 'Trabalho de toque, condução e finalizações leves sem contato corporal.',
          doctorAdvice: 'Boa cicatrização tecidual. Atleta sem queixas dolorosas durante as atividades.',
          medicalFacilityLevel,
          facilityReductionDays: injury.facilityReductionDays,
        },
      });
    }

    // If transitioned to Transição Física and hadn't triggered yet:
    else if (newStage === 'Transição Física' && previousStage === 'Fisioterapia' && isUserClub) {
      generatedInboxMessages.push({
        id: `med_trans_${Date.now()}_${player.id}`,
        title: `🏃 BOLETIM MÉDICO: ${player.name} inicia transição física no gramado!`,
        message: `Boletim oficial: ${player.name} concluiu o período de fisioterapia intensiva no REFFIS e iniciou a transição física com os preparadores no gramado. Recuperação atingiu ${progressPct}%. Faltam cerca de ${newRemainingDays} dias para o retorno.`,
        date: currentDate,
        round: currentRound,
        read: false,
        type: 'INJURY',
        medicalReport: {
          playerId: player.id,
          playerName: player.name,
          playerRole: player.detailedRole,
          squadNumber: player.squadNumber,
          overall: player.overall,
          injuryName: injury.injuryType,
          severity: injury.severity,
          initialDays: injury.initialDays,
          remainingDays: newRemainingDays,
          progressPercentage: progressPct,
          stage: 'Transição Física',
          status: 'TRANSICAO',
          treatmentPlan: 'Corridas contínuas, piques moderados e circuitos de agilidade funcional.',
          doctorAdvice: 'Fase inflamatória debelada. O foco agora é recondicionamento aeróbico e força.',
          medicalFacilityLevel,
          facilityReductionDays: injury.facilityReductionDays,
        },
      });
    }

    return {
      ...player,
      injuryWeeks: newInjuryWeeks,
      injuryDetails: updatedInjury,
    };
  });

  return { updatedSquad, generatedInboxMessages };
}

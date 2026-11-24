import { Player, PlayerInjury, InboxMessage, MedicalReportData, InjurySeverity, MedicalStage, Morale } from '../types/game';

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
 * Diagnoses a new injury for a player and produces the player's injury data and initial Inbox medical report
 */
export function diagnosePlayerInjury(
  player: Player,
  date: string,
  round: number,
  medicalFacilityLevel: number = 2,
  specificTemplate?: InjuryTemplate
): { updatedPlayer: Player; inboxMessage: InboxMessage } {
  const template =
    specificTemplate ||
    INJURIES_CATALOG[Math.floor(Math.random() * INJURIES_CATALOG.length)];

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

import { Club, HalftimeTalkTone, Morale } from '../types/game';

export interface RivalryInfo {
  isDerby: boolean;
  derbyName: string;
  intensity: 'HISTORICO' | 'ESTADUAL';
  difficultyLabel: string;
  minAttendanceRatio: number;
  maxAttendanceRatio: number;
  foulRateMultiplier: number;
  cpuChanceBonus: number;
  cpuConversionBonus: number;
  reputationWinBonus: number;
  fanSocioWinBonus: number;
  fanConfidenceExtra: number;
  boardConfidenceExtra: number;
  atmosphereSubtitle: string;
}

interface HistoricDerbyEntry {
  clubs: [string, string];
  name: string;
  subtitle: string;
}

const HISTORIC_DERBIES: HistoricDerbyEntry[] = [
  // Rio de Janeiro
  { clubs: ['fla', 'flu'], name: 'Fla-Flu', subtitle: 'O Clássico das Multidões do Rio de Janeiro' },
  { clubs: ['fla', 'vas'], name: 'Clássico dos Milhões', subtitle: 'Rivalidade histórica carioca de arquibancadas lotadas' },
  { clubs: ['fla', 'bot'], name: 'Clássico da Rivalidade', subtitle: 'Duelo tradicional de alta tensão no Rio' },
  { clubs: ['flu', 'bot'], name: 'Clássico Vovô', subtitle: 'O confronto mais antigo do futebol brasileiro' },
  { clubs: ['flu', 'vas'], name: 'Clássico dos Gigantes', subtitle: 'Duelo pesado pela hegemonia carioca' },
  { clubs: ['vas', 'bot'], name: 'Clássico da Amizade', subtitle: 'Tradição e disputa acirrada no Rio de Janeiro' },

  // São Paulo
  { clubs: ['pal', 'cor'], name: 'Derby Paulista', subtitle: 'Uma das maiores rivalidades do futebol mundial' },
  { clubs: ['pal', 'sao'], name: 'Choque-Rei', subtitle: 'Confronto direto de gigantes paulistas' },
  { clubs: ['cor', 'sao'], name: 'Majestoso', subtitle: 'Estádio pulsando em clássico paulista decisivo' },
  { clubs: ['pal', 'san'], name: 'Clássico da Saudade', subtitle: 'Tradição ofensiva e história pesada em jogo' },
  { clubs: ['cor', 'san'], name: 'Clássico Alvinegro', subtitle: 'Duelo histórico alvinegro de muita faísca' },
  { clubs: ['sao', 'san'], name: 'San-São', subtitle: 'Clássico técnico e eletrizante de São Paulo' },
  { clubs: ['pon', 'gua'], name: 'Dérbi Campineiro', subtitle: 'Coração de Campinas dividido em clima fervendo' },

  // Minas Gerais
  { clubs: ['cam', 'cru'], name: 'Superclássico Mineiro', subtitle: 'Minas Gerais para diante do duelo entre Galo e Raposa' },
  { clubs: ['cam', 'ame'], name: 'Clássico das Multidões MG', subtitle: 'Rivalidade centenária de Belo Horizonte' },
  { clubs: ['cru', 'ame'], name: 'Clássico Mineiro', subtitle: 'Tradição e rivalidade histórica na capital mineira' },

  // Rio Grande do Sul
  { clubs: ['gre', 'int'], name: 'Gre-Nal', subtitle: 'Divisão máxima e disputa feroz em cada dividida' },
  { clubs: ['gre', 'juv'], name: 'Clássico Gaúcho', subtitle: 'Confronto tradicional entre capital e Serra Gaúcha' },
  { clubs: ['int', 'juv'], name: 'Juvenal', subtitle: 'Duelo pesado e histórico do futebol gaúcho' },

  // Bahia, Ceará, Paraná, Pará, Goiás, Santa Catarina, Pernambuco, RN, PB
  { clubs: ['bah', 'vit'], name: 'Ba-Vi', subtitle: 'Salvador em festa e tensão máxima nas arquibancadas' },
  { clubs: ['for', 'cea'], name: 'Clássico-Rei', subtitle: 'Castelão lotado para o maior duelo cearense' },
  { clubs: ['cea', 'fer'], name: 'Clássico da Paz', subtitle: 'Rivalidade tradicional de Fortaleza' },
  { clubs: ['for', 'fer'], name: 'Clássico das Cores', subtitle: 'Duelo tricolor histórico na capital cearense' },
  { clubs: ['cap', 'cfc'], name: 'Atletiba', subtitle: 'Curitiba dividida no maior clássico do Paraná' },
  { clubs: ['rem', 'pay'], name: 'Re-Pa', subtitle: 'O Clássico Rei da Amazônia de atmosfera incomparável' },
  { clubs: ['goi', 'vil'], name: 'Derby do Cerrado', subtitle: 'Rivalidade explosiva do futebol goiano' },
  { clubs: ['ava', 'fig'], name: 'Clássico de Florianópolis', subtitle: 'Ilha dividida entre Leão e Furacão do Estreito' },
  { clubs: ['ava', 'cha'], name: 'Clássico Catarinense', subtitle: 'Duelo decisivo de Santa Catarina' },
  { clubs: ['fig', 'cha'], name: 'Clássico Catarinense', subtitle: 'Rivalidade estadual de alta intensidade' },
  { clubs: ['cri', 'ava'], name: 'Clássico Catarinense', subtitle: 'Duelo pesado entre Tigre e Leão da Ilha' },
  { clubs: ['spo', 'nau'], name: 'Clássico dos Clássicos', subtitle: 'Recife em ebulição em duelo centenário' },
  { clubs: ['spo', 'stc'], name: 'Clássico das Multidões PE', subtitle: 'Paixão pernambucana com casa lotada' },
  { clubs: ['nau', 'stc'], name: 'Clássico das Emoções', subtitle: 'Tradição e rivalidade histórica no Recife' },
  { clubs: ['abc', 'arn'], name: 'Clássico-Rei Potiguar', subtitle: 'Natal dividida no maior duelo do Rio Grande do Norte' },
  { clubs: ['bpb', 'trz'], name: 'Clássico Tradição', subtitle: 'Rivalidade histórica da Paraíba em campo' },

  // Rivalidades Nacionais & Interestaduais de Alta Tensão
  { clubs: ['fla', 'pal'], name: 'Superclássico Nacional', subtitle: 'Duelo interestadual moderno por taças e hegemonia' },
  { clubs: ['fla', 'cam'], name: 'Clássico Interestadual', subtitle: 'Rivalidade histórica explosiva desde os anos 1980' },
  { clubs: ['bah', 'spo'], name: 'Clássico do Nordeste', subtitle: 'Gigantes nordestinos em confronto de arquibancada cheia' },

  // América do Sul
  { clubs: ['boc', 'riv'], name: 'Superclássico Argentino', subtitle: 'Rivalidade continental lendária de pura adrenalina' },
  { clubs: ['pen', 'nac'], name: 'Superclássico Uruguaio', subtitle: 'Tradição centenária de Montevidéu em campo' },
  { clubs: ['idv', 'ldu'], name: 'Clássico Equatoriano', subtitle: 'Quito em clima decisivo entre potências continentais' },
];

export function getMatchRivalryInfo(
  clubA?: Club | null,
  clubB?: Club | null
): RivalryInfo | null {
  if (!clubA || !clubB || clubA.id === clubB.id) return null;

  const isExplicitRival = Boolean(
    clubA.rivals?.includes(clubB.id) || clubB.rivals?.includes(clubA.id)
  );

  const foundHistoric = HISTORIC_DERBIES.find(
    (entry) =>
      (entry.clubs[0] === clubA.id && entry.clubs[1] === clubB.id) ||
      (entry.clubs[0] === clubB.id && entry.clubs[1] === clubA.id)
  );

  if (foundHistoric) {
    return {
      isDerby: true,
      derbyName: foundHistoric.name,
      intensity: 'HISTORICO',
      difficultyLabel: 'Extrema (Clássico Histórico)',
      minAttendanceRatio: 0.92,
      maxAttendanceRatio: 1.0,
      foulRateMultiplier: 1.32,
      cpuChanceBonus: 0.009,
      cpuConversionBonus: 0.04,
      reputationWinBonus: 3,
      fanSocioWinBonus: 450,
      fanConfidenceExtra: 6,
      boardConfidenceExtra: 4,
      atmosphereSubtitle: foundHistoric.subtitle,
    };
  }

  if (isExplicitRival) {
    const sameState = Boolean(clubA.state && clubA.state === clubB.state);
    return {
      isDerby: true,
      derbyName: sameState
        ? `Clássico ${clubA.shortName} x ${clubB.shortName}`
        : `Rivalidade ${clubA.shortName} x ${clubB.shortName}`,
      intensity: 'ESTADUAL',
      difficultyLabel: 'Alta (Rivalidade Direta)',
      minAttendanceRatio: 0.86,
      maxAttendanceRatio: 0.98,
      foulRateMultiplier: 1.22,
      cpuChanceBonus: 0.006,
      cpuConversionBonus: 0.025,
      reputationWinBonus: 2,
      fanSocioWinBonus: 280,
      fanConfidenceExtra: 4,
      boardConfidenceExtra: 3,
      atmosphereSubtitle: sameState
        ? `Rivalidade estadual direta em ${clubA.state} com clima tenso`
        : `Confronto direto entre clubes rivais de grande pressão`,
    };
  }

  // Fallback for relevant same-state Brazilian clashes
  const bothBrazilian =
    (clubA.country || 'Brasil') === 'Brasil' && (clubB.country || 'Brasil') === 'Brasil';

  if (
    bothBrazilian &&
    clubA.state &&
    clubA.state === clubB.state &&
    clubA.reputation + clubB.reputation >= 6
  ) {
    return {
      isDerby: true,
      derbyName: `Clássico ${clubA.state}`,
      intensity: 'ESTADUAL',
      difficultyLabel: 'Alta (Duelo Regional)',
      minAttendanceRatio: 0.84,
      maxAttendanceRatio: 0.96,
      foulRateMultiplier: 1.18,
      cpuChanceBonus: 0.005,
      cpuConversionBonus: 0.02,
      reputationWinBonus: 2,
      fanSocioWinBonus: 220,
      fanConfidenceExtra: 3,
      boardConfidenceExtra: 2,
      atmosphereSubtitle: `Duelo regional direto entre rivais de ${clubA.state}`,
    };
  }

  return null;
}

export interface HalftimePepTalkOption {
  tone: HalftimeTalkTone;
  title: string;
  subtitle: string;
  idealContext: string;
}

export const HALFTIME_PEP_TALKS_CATALOG: HalftimePepTalkOption[] = [
  {
    tone: 'ELOGIAR',
    title: 'Elogiar e Incentivar',
    subtitle: 'Passar confiança ao elenco pelo desempenho parcial',
    idealContext: 'Ideal vencendo ou segurando adversário mais forte',
  },
  {
    tone: 'COBRAR_RACA',
    title: 'Cobrar Raça e Intensidade',
    subtitle: 'Exigir divididas firmes, pressão e reação imediata',
    idealContext: 'Ideal perdendo, empatando em casa ou em clássico',
  },
  {
    tone: 'AJUSTE_TATICO',
    title: 'Ajuste Tático Calmo',
    subtitle: 'Corrigir posicionamento e compactar setores sem afobação',
    idealContext: 'Seguro em qualquer placar: +organização defensiva e passe',
  },
  {
    tone: 'ORGULHO_CAMISA',
    title: 'Apelar ao Peso da Camisa',
    subtitle: 'Inflamar o brio dos atletas para decidir no 2º tempo',
    idealContext: 'Alto impacto em clássicos, finais e jogos equilibrados',
  },
];

export interface HalftimePepTalkOutcome {
  tone: HalftimeTalkTone;
  title: string;
  reactionType: 'INSPIRED' | 'FOCUSED' | 'TENSE';
  reactionBadge: string;
  lockerRoomFeedback: string;
  commentaryText: string;
  effectSummary: string;
  userChanceBonus: number; // Added to user chanceThreshold in 2nd half
  oppChanceModifier: number; // Added to opponent chanceThreshold in 2nd half (negative = better defense)
  goalConversionBonus: number; // Added to user goalThreshold in 2nd half
  possessionShift: number; // Shift in user possession weight (-0.06 to +0.07)
  conditionDelta: number; // Immediate stamina boost/cost to starters
  passAccuracyBonus: number;
  targetMoraleBoost: 'UP' | 'STEADY' | 'DOWN';
}

function shiftPlayerMorale(current: Morale, direction: 'UP' | 'STEADY' | 'DOWN'): Morale {
  if (direction === 'STEADY') return current;
  const order: Morale[] = ['Péssima', 'Baixa', 'Regular', 'Boa', 'Excelente'];
  const idx = order.indexOf(current);
  if (idx === -1) return current;
  if (direction === 'UP') {
    return order[Math.min(order.length - 1, idx + 1)];
  }
  return order[Math.max(0, idx - 1)];
}

export function applyPepTalkMoraleToPlayer(current: Morale, direction: 'UP' | 'STEADY' | 'DOWN'): Morale {
  return shiftPlayerMorale(current, direction);
}

export function evaluateHalftimePepTalk(
  tone: HalftimeTalkTone,
  userGoals: number,
  oppGoals: number,
  options: {
    userClubShortName: string;
    isDerby: boolean;
    derbyName?: string;
    isKnockout: boolean;
    strengthDiff: number; // oppAvgOvr - userAvgOvr
  }
): HalftimePepTalkOutcome {
  const goalDiff = userGoals - oppGoals;
  const { userClubShortName, isDerby, derbyName, isKnockout, strengthDiff } = options;

  if (tone === 'ELOGIAR') {
    if (goalDiff >= 1 || (goalDiff === 0 && strengthDiff >= 2)) {
      return {
        tone,
        title: 'Elogiar e Incentivar',
        reactionType: 'INSPIRED',
        reactionBadge: 'Elenco Confiante',
        lockerRoomFeedback:
          'Os titulares sorriem e voltam leves para o gramado, mantendo a concentração lá em cima.',
        commentaryText: `Vestiário do ${userClubShortName}: o treinador elogiou a entrega do 1º tempo e o time retorna muito confiante para a etapa final.`,
        effectSummary: '+4% Físico · +Precisão nas Finalizações · Moral em Alta',
        userChanceBonus: 0.008,
        oppChanceModifier: -0.004,
        goalConversionBonus: 0.05,
        possessionShift: 0.03,
        conditionDelta: 4,
        passAccuracyBonus: 3,
        targetMoraleBoost: 'UP',
      };
    }

    if (goalDiff <= -2) {
      return {
        tone,
        title: 'Elogiar e Incentivar',
        reactionType: 'TENSE',
        reactionBadge: 'Grupo Acomodado',
        lockerRoomFeedback:
          'Com o placar adverso, os elogios soaram brandos demais e parte do grupo ficou sem senso de urgência.',
        commentaryText: `Vestiário do ${userClubShortName}: discurso ameno apesar da desvantagem no placar; a equipe volta sem a faísca esperada.`,
        effectSummary: '+2% Físico · Pouca Reação Ofensiva',
        userChanceBonus: -0.004,
        oppChanceModifier: 0.003,
        goalConversionBonus: -0.02,
        possessionShift: -0.02,
        conditionDelta: 2,
        passAccuracyBonus: 0,
        targetMoraleBoost: 'DOWN',
      };
    }

    return {
      tone,
      title: 'Elogiar e Incentivar',
      reactionType: 'FOCUSED',
      reactionBadge: 'Ambiente Positivo',
      lockerRoomFeedback:
        'O apoio acalmou os mais jovens e manteve o vestiário unido para buscar o resultado.',
      commentaryText: `Vestiário do ${userClubShortName}: o comandante transmitiu apoio ao grupo para o 2º tempo.`,
      effectSummary: '+3% Físico · +Leve Volume de Jogo · Moral Estável',
      userChanceBonus: 0.005,
      oppChanceModifier: 0,
      goalConversionBonus: 0.025,
      possessionShift: 0.02,
      conditionDelta: 3,
      passAccuracyBonus: 2,
      targetMoraleBoost: 'UP',
    };
  }

  if (tone === 'COBRAR_RACA') {
    if (goalDiff <= 0 || isDerby) {
      return {
        tone,
        title: 'Cobrar Raça e Intensidade',
        reactionType: 'INSPIRED',
        reactionBadge: 'Adrenalina Máxima',
        lockerRoomFeedback: isDerby
          ? `A cobrança inflamou o vestiário para o ${derbyName || 'clássico'}! Os atletas batem no peito antes de subir ao túnel.`
          : 'A bronca surtiu efeito imediato! Os líderes do elenco cobraram postura e o time volta mordendo cada bola.',
        commentaryText: `Vestiário quente no ${userClubShortName}! O treinador exigiu intensidade máxima e o time volta elétrico para o 2º tempo!`,
        effectSummary: '+6% Físico (Adrenalina) · +Volume Ofensivo · +Posse Agressiva',
        userChanceBonus: 0.015,
        oppChanceModifier: -0.003,
        goalConversionBonus: 0.04,
        possessionShift: 0.06,
        conditionDelta: 6,
        passAccuracyBonus: 1,
        targetMoraleBoost: 'UP',
      };
    }

    if (goalDiff >= 3) {
      return {
        tone,
        title: 'Cobrar Raça e Intensidade',
        reactionType: 'TENSE',
        reactionBadge: 'Cobrança Excessiva',
        lockerRoomFeedback:
          'Como a equipe já goleava no placar, a bronca causou estranheza nos titulares, embora mantenha a correria.',
        commentaryText: `Mesmo com vantagem larga, o técnico do ${userClubShortName} cobrou duro no intervalo.`,
        effectSummary: '+2% Físico · Ansiedade na Finalização',
        userChanceBonus: 0.003,
        oppChanceModifier: 0,
        goalConversionBonus: -0.02,
        possessionShift: 0.02,
        conditionDelta: 2,
        passAccuracyBonus: -1,
        targetMoraleBoost: 'DOWN',
      };
    }

    return {
      tone,
      title: 'Cobrar Raça e Intensidade',
      reactionType: 'FOCUSED',
      reactionBadge: 'Alerta Ligado',
      lockerRoomFeedback:
        'Ninguém relaxa com a vantagem mínima: o grupo entendeu o recado e mantém a pegada forte.',
      commentaryText: `O treinador do ${userClubShortName} proibiu acomodação no vestiário e cobrou intensidade até o fim.`,
      effectSummary: '+4% Físico · +Pressão no Meio-Campo',
      userChanceBonus: 0.009,
      oppChanceModifier: -0.004,
      goalConversionBonus: 0.02,
      possessionShift: 0.04,
      conditionDelta: 4,
      passAccuracyBonus: 1,
      targetMoraleBoost: 'STEADY',
    };
  }

  if (tone === 'AJUSTE_TATICO') {
    return {
      tone,
      title: 'Ajuste Tático Calmo',
      reactionType: 'FOCUSED',
      reactionBadge: 'Organização Tática',
      lockerRoomFeedback:
        'Com prancheta em mãos, você corrigiu o espaçamento entre defesa e meio-campo. O time volta compacto e lúcido.',
      commentaryText: `Intervalo estudado no ${userClubShortName}: o treinador reorganizou as linhas na prancheta e ajustou a saída de bola.`,
      effectSummary: '+3% Físico · -Chances Cedidas ao Rival · +4% Precisão de Passe',
      userChanceBonus: 0.006,
      oppChanceModifier: -0.011,
      goalConversionBonus: 0.03,
      possessionShift: 0.04,
      conditionDelta: 3,
      passAccuracyBonus: 4,
      targetMoraleBoost: 'STEADY',
    };
  }

  // ORGULHO_CAMISA
  const highStakes = isDerby || isKnockout || Math.abs(goalDiff) <= 1;
  if (highStakes) {
    return {
      tone,
      title: 'Apelar ao Peso da Camisa',
      reactionType: 'INSPIRED',
      reactionBadge: 'Brio Inflamado',
      lockerRoomFeedback: isDerby
        ? `Discurso histórico sobre o peso do ${derbyName || 'clássico'}! Os jogadores sobem para o gramado cantando junto com a arquibancada.`
        : 'Você lembrou a grandeza da camisa e a torcida presente. O elenco volta com sangue nos olhos para decidir!',
      commentaryText: `Clima arrepiante no túnel! Após discurso sobre o peso da camisa do ${userClubShortName}, os jogadores voltam pilhados para o 2º tempo!`,
      effectSummary: '+5% Físico · + Poder de Decisão na Área · Moral Excelente',
      userChanceBonus: 0.012,
      oppChanceModifier: -0.006,
      goalConversionBonus: 0.065,
      possessionShift: 0.05,
      conditionDelta: 5,
      passAccuracyBonus: 2,
      targetMoraleBoost: 'UP',
    };
  }

  return {
    tone,
    title: 'Apelar ao Peso da Camisa',
    reactionType: 'FOCUSED',
    reactionBadge: 'Comprometimento',
    lockerRoomFeedback:
      'O capitão reforçou suas palavras e o grupo promete honrar o manto até o apito final.',
    commentaryText: `Lideranças do ${userClubShortName} fecham questão no vestiário para manter foco total na etapa complementar.`,
    effectSummary: '+4% Físico · +Firmeza Competitiva',
    userChanceBonus: 0.007,
    oppChanceModifier: -0.004,
    goalConversionBonus: 0.035,
    possessionShift: 0.03,
    conditionDelta: 4,
    passAccuracyBonus: 2,
    targetMoraleBoost: 'UP',
  };
}

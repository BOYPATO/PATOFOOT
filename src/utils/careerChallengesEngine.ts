import {
  ActiveCareerChallenge,
  CareerChallengeId,
  Club,
  GameSave,
} from '../types/game';

export interface CareerChallengeDefinition {
  id: CareerChallengeId;
  title: string;
  shortLabel: string;
  difficultyLabel: 'Padrão' | 'Difícil' | 'Extremo';
  description: string;
  targetDescription: string;
  rulesSummary: string[];
  budgetMultiplier: number;
  initialBoardConfidence: number;
  initialFanConfidence: number;
  initialManagerReputation: number;
  recommendedDivisions: Array<Club['division']>;
  recommendedClubFilter?: (club: Club) => boolean;
}

export const CAREER_CHALLENGES: CareerChallengeDefinition[] = [
  {
    id: 'LIVRE',
    title: 'Carreira Livre',
    shortLabel: 'Livre',
    difficultyLabel: 'Padrão',
    description:
      'Escolha qualquer um dos 930+ clubes mundiais e escreva sua própria história sem restrições.',
    targetDescription: 'Conquiste títulos, evolua sua reputação e chegue ao topo do futebol mundial.',
    rulesSummary: [
      'Orçamento e metas fiéis ao clube escolhido',
      'Acesso completo a todas as divisões e ligas do mundo',
    ],
    budgetMultiplier: 1.0,
    initialBoardConfidence: 76,
    initialFanConfidence: 74,
    initialManagerReputation: 52,
    recommendedDivisions: ['A', 'B', 'C', 'D', 'EST', 'SA', 'EU', 'WL'],
  },
  {
    id: 'OPERACAO_SALVACAO',
    title: 'Operação Salvação',
    shortLabel: 'Salvação Z-4',
    difficultyLabel: 'Difícil',
    description:
      'Assuma sob forte pressão de torcida e diretoria, com caixa curto, para evitar a queda e reerguer o clube.',
    targetDescription: 'Termine fora da zona de rebaixamento e eleve a confiança da diretoria acima de 75%.',
    rulesSummary: [
      'Confiança inicial da diretoria em 48% e torcida em 45%',
      'Orçamento reduzido em 35% para forçar criatividade tática',
      'Margem mínima de erro nas primeiras rodadas',
    ],
    budgetMultiplier: 0.65,
    initialBoardConfidence: 48,
    initialFanConfidence: 45,
    initialManagerReputation: 44,
    recommendedDivisions: ['A', 'B', 'EU', 'SA'],
    recommendedClubFilter: (c) => c.reputation <= 3,
  },
  {
    id: 'SERIE_D_LIBERTADORES',
    title: 'Da Série D à Libertadores',
    shortLabel: 'Série D → América',
    difficultyLabel: 'Extremo',
    description:
      'Comece na quarta divisão nacional e construa uma dinastia passo a passo até disputar a Libertadores.',
    targetDescription: 'Conquiste acessos consecutivos desde a Série D até alcançar a Série A ou Libertadores.',
    rulesSummary: [
      'Clubes da Série D com foco em peneiras da base e olheiros',
      'Bônus inicial de +1 nível na Base para revelar joias baratas',
      'Desafio clássico de longo prazo',
    ],
    budgetMultiplier: 0.9,
    initialBoardConfidence: 70,
    initialFanConfidence: 72,
    initialManagerReputation: 34,
    recommendedDivisions: ['D'],
    recommendedClubFilter: (c) => c.division === 'D',
  },
  {
    id: 'ORCAMENTO_CURTO',
    title: 'Gigante em Reconstrução',
    shortLabel: 'Orçamento Curto',
    difficultyLabel: 'Difícil',
    description:
      'Assuma um clube com cofre enxuto (apenas 35% do caixa) e prove que gestão, base e tática vencem milhões.',
    targetDescription: 'Conquiste um título oficial mantendo as finanças no azul ao fim da temporada.',
    rulesSummary: [
      'Apenas 35% do orçamento base em caixa',
      'Ideal para explorar agentes livres, empréstimos e base',
      'Fair Play Financeiro rigoroso',
    ],
    budgetMultiplier: 0.35,
    initialBoardConfidence: 62,
    initialFanConfidence: 66,
    initialManagerReputation: 48,
    recommendedDivisions: ['A', 'B', 'EU', 'SA'],
    recommendedClubFilter: (c) => c.reputation >= 3,
  },
  {
    id: 'SEM_CLUBE_ZERO',
    title: 'Começar do Zero (Raiz)',
    shortLabel: 'Do Zero',
    difficultyLabel: 'Extremo',
    description:
      'Inicie como treinador desconhecido em um clube estadual modesto e conquiste propostas até a elite mundial.',
    targetDescription: 'Suba sua reputação de técnico de 25 para 75+ e assuma um clube de 1ª divisão.',
    rulesSummary: [
      'Reputação inicial de treinador em apenas 25/100',
      'Começa em clube modesto de Estadual ou Série D',
      'Receba propostas de clubes maiores conforme vence jogos',
    ],
    budgetMultiplier: 0.8,
    initialBoardConfidence: 65,
    initialFanConfidence: 64,
    initialManagerReputation: 25,
    recommendedDivisions: ['EST', 'D'],
    recommendedClubFilter: (c) => (c.division === 'EST' || c.division === 'D') && c.reputation <= 2,
  },
];

export function getCareerChallengeDefinition(
  id?: CareerChallengeId
): CareerChallengeDefinition {
  return CAREER_CHALLENGES.find((c) => c.id === id) || CAREER_CHALLENGES[0];
}

export function buildActiveCareerChallenge(
  id: CareerChallengeId,
  year: number
): ActiveCareerChallenge | undefined {
  if (id === 'LIVRE') return undefined;
  const def = getCareerChallengeDefinition(id);
  return {
    id: def.id,
    title: def.title,
    subtitle: def.shortLabel,
    targetDescription: def.targetDescription,
    startedYear: year,
    completed: false,
  };
}

export function pickRecommendedClubForChallenge(
  challengeId: CareerChallengeId,
  clubs: Club[]
): Club | undefined {
  const def = getCareerChallengeDefinition(challengeId);
  const playable = clubs.filter((c) => !c.id.startsWith('guest_'));
  const filtered = playable.filter((c) => {
    const divOk = def.recommendedDivisions.includes(c.division);
    const extraOk = def.recommendedClubFilter ? def.recommendedClubFilter(c) : true;
    return divOk && extraOk;
  });
  if (filtered.length > 0) {
    return filtered[Math.floor(Math.random() * Math.min(filtered.length, 16))];
  }
  return playable.find((c) => def.recommendedDivisions.includes(c.division)) || playable[0];
}

export function evaluateChallengeStatus(save: GameSave): {
  active: ActiveCareerChallenge;
  completedNow: boolean;
  progressText: string;
} | null {
  const ch = save.activeChallenge;
  if (!ch) return null;
  if (ch.completed) {
    return {
      active: ch,
      completedNow: false,
      progressText: 'Desafio concluído!',
    };
  }

  const userClub = save.clubs.find((c) => c.id === save.userClubId);
  const boardConf = save.managerCareer?.boardConfidence ?? 70;
  const rep = save.managerCareer?.managerReputation ?? 50;
  const userTitles = (save.trophyHistory || []).filter((t) => t.userWon).length;

  if (ch.id === 'OPERACAO_SALVACAO') {
    const completedNow = boardConf >= 75 && save.currentRound >= 15;
    return {
      active: ch,
      completedNow,
      progressText: `Confiança Diretoria: ${boardConf}% / 75% · Rodada ${save.currentRound}`,
    };
  }

  if (ch.id === 'SERIE_D_LIBERTADORES') {
    const completedNow =
      userClub?.division === 'A' ||
      (save.fixturesLibertadores || []).some(
        (f) => f.homeTeamId === save.userClubId || f.awayTeamId === save.userClubId
      );
    return {
      active: ch,
      completedNow,
      progressText: `Divisão Atual: Série ${userClub?.division || 'D'} → Meta: Série A / Libertadores`,
    };
  }

  if (ch.id === 'ORCAMENTO_CURTO') {
    const inGreen = (userClub?.finances.balance ?? 0) >= 0;
    const completedNow = userTitles >= 1 && inGreen;
    return {
      active: ch,
      completedNow,
      progressText: `Títulos: ${userTitles}/1 · Caixa ${inGreen ? 'no azul' : 'no vermelho'}`,
    };
  }

  if (ch.id === 'SEM_CLUBE_ZERO') {
    const topTier =
      userClub?.division === 'A' || userClub?.division === 'EU' || userClub?.division === 'SA';
    const completedNow = rep >= 75 && Boolean(topTier);
    return {
      active: ch,
      completedNow,
      progressText: `Reputação: ${rep}/75 · Divisão atual: ${userClub?.division || 'EST'}`,
    };
  }

  return null;
}

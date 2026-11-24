import {
  Club,
  CompetitionType,
  Fixture,
  FormationType,
  MarkingStyle,
  PassingStyle,
  Player,
  TacticalMentality,
} from '../types/game';
import { getClubSectorRatings, ClubSectorRatings } from './clubRatingsEngine';
import {
  buildAssistantOptimalLineup,
  FORMATION_SLOT_ROLES,
  isPlayerAvailableForMatch,
} from './assistantLineupEngine';
import { evaluatePlayerSlotFit } from './tacticalPositioningEngine';
import { COMPETITIONS_CATALOG } from './competitionsEngine';

export const ALL_TACTICAL_FORMATIONS: FormationType[] = [
  '4-3-3',
  '4-2-3-1',
  '4-4-2',
  '4-1-4-1',
  '3-5-2',
  '3-4-3',
  '5-3-2',
];

export type FormResultCode = 'V' | 'E' | 'D';

export interface OpponentRecentFormSummary {
  results: FormResultCode[];
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface AssistantFormationRecommendation {
  formation: FormationType;
  avgOverall: number;
  naturalFitCount: number;
  avgCondition: number;
  counterLabel: string;
  rationale: string;
}

export interface AssistantPlayStyleRecommendation {
  passing: PassingStyle;
  mentality: TacticalMentality;
  headline: string;
  rationale: string;
}

export interface AssistantDefensivePostureRecommendation {
  marking: MarkingStyle;
  mentality: TacticalMentality;
  blockLabel: string;
  rationale: string;
}

export interface AssistantScoutingNote {
  label: string;
  detail: string;
  tone: 'neutral' | 'opportunity' | 'warning';
}

export interface AssistantTacticsAdviceReport {
  hasOpponent: boolean;
  opponent: Club | null;
  fixture: Fixture | null;
  isUserHome: boolean;
  competitionName: string;
  matchDateLabel: string;
  rivalryName: string | null;
  isKnockout: boolean;
  userRatings: ClubSectorRatings;
  opponentRatings: ClubSectorRatings | null;
  effectiveDelta: number;
  matchupSummary: string;
  opponentForm: OpponentRecentFormSummary;
  keyThreatPlayer: Player | null;
  opponentUnavailableCount: number;
  userAvgCondition: number;
  recommendedFormation: AssistantFormationRecommendation;
  recommendedPlayStyle: AssistantPlayStyleRecommendation;
  recommendedDefensivePosture: AssistantDefensivePostureRecommendation;
  scoutingNotes: AssistantScoutingNote[];
}

function formatDateBr(isoDate?: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function computeRecentFormForClub(
  clubId: string,
  allFixtures: Fixture[],
  limit: number = 5
): OpponentRecentFormSummary {
  const played = allFixtures
    .filter(
      (f) =>
        f.played &&
        f.homeScore !== null &&
        f.awayScore !== null &&
        (f.homeTeamId === clubId || f.awayTeamId === clubId)
    )
    .sort((a, b) => {
      const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
      if (dateCmp !== 0) return dateCmp;
      return (b.round || 0) - (a.round || 0);
    })
    .slice(0, limit);

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  const results: FormResultCode[] = [];

  for (const fx of played) {
    const isHome = fx.homeTeamId === clubId;
    const gf = isHome ? (fx.homeScore ?? 0) : (fx.awayScore ?? 0);
    const ga = isHome ? (fx.awayScore ?? 0) : (fx.homeScore ?? 0);
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) {
      wins += 1;
      results.push('V');
    } else if (gf === ga) {
      draws += 1;
      results.push('E');
    } else {
      losses += 1;
      results.push('D');
    }
  }

  return {
    results,
    played: played.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
  };
}

function getFormationCounterBonus(params: {
  candidate: FormationType;
  opponentFormation: FormationType;
  opponentMentality: TacticalMentality;
  effectiveDelta: number;
  midfieldDelta: number;
  attackVsOppDefense: number;
  defenseVsOppAttack: number;
  isUserHome: boolean;
}): { bonus: number; counterLabel: string } {
  const {
    candidate,
    opponentFormation,
    opponentMentality,
    effectiveDelta,
    midfieldDelta,
    attackVsOppDefense,
    defenseVsOppAttack,
    isUserHome,
  } = params;

  let bonus = 0;
  let counterLabel = 'Equilíbrio estrutural';

  const oppHasThreeCbs = opponentFormation === '3-5-2' || opponentFormation === '3-4-3';
  const oppHasTwoStrikers =
    opponentFormation === '4-4-2' ||
    opponentFormation === '3-5-2' ||
    opponentFormation === '5-3-2';
  const oppHasWingTrident = opponentFormation === '4-3-3' || opponentFormation === '3-4-3';
  const oppIsLowBlock =
    opponentFormation === '5-3-2' ||
    opponentFormation === '4-1-4-1' ||
    opponentMentality === 'Defensivo' ||
    opponentMentality === 'Muito Defensivo';
  const oppIsAggressive =
    opponentMentality === 'Ofensivo' || opponentMentality === 'Pressão Total';

  // 1. Counter-formation geometry
  if (oppHasThreeCbs && (candidate === '4-3-3' || candidate === '4-2-3-1')) {
    bonus += 1.55;
    counterLabel = 'Ataca costas dos alas';
  }
  if (oppHasTwoStrikers && (candidate === '3-5-2' || candidate === '5-3-2' || candidate === '4-2-3-1')) {
    bonus += defenseVsOppAttack < 0 ? 1.45 : 0.85;
    counterLabel = candidate === '4-2-3-1' ? 'Dupla proteção central' : 'Sobra na zaga contra 2 atacantes';
  }
  if (oppHasWingTrident && (candidate === '4-2-3-1' || candidate === '4-1-4-1' || candidate === '5-3-2')) {
    bonus += 1.3;
    counterLabel = candidate === '5-3-2' ? 'Bloqueio dos pontas rivais' : 'Dobradinha pelos lados';
  }
  if (oppIsLowBlock && (candidate === '4-2-3-1' || candidate === '4-3-3' || candidate === '3-4-3')) {
    bonus += effectiveDelta >= 0 ? 1.4 : 0.7;
    counterLabel = 'Amplitude para furar retranca';
  }
  if (oppIsAggressive && (candidate === '4-1-4-1' || candidate === '4-2-3-1' || candidate === '5-3-2')) {
    bonus += effectiveDelta <= 1 ? 1.25 : 0.4;
    counterLabel = 'Compactação e contra-ataque';
  }

  // 2. Matchup balance adjustments
  if (effectiveDelta <= -4) {
    // Clear underdog: prioritize defensive solidity
    if (candidate === '5-3-2') {
      bonus += 2.1;
      counterLabel = 'Linha de 5 contra favorito';
    } else if (candidate === '4-1-4-1') {
      bonus += 1.75;
      counterLabel = 'Meio congestionado e transição';
    } else if (candidate === '4-2-3-1') {
      bonus += 1.0;
    } else if (candidate === '3-4-3') {
      bonus -= 2.2;
    }
  } else if (effectiveDelta >= 4) {
    // Clear favorite: reward offensive width and midfield dominance
    if (candidate === '4-3-3') {
      bonus += isUserHome ? 1.7 : 1.2;
      counterLabel = 'Pressão com trio ofensivo';
    } else if (candidate === '4-2-3-1') {
      bonus += 1.35;
      counterLabel = 'Domínio por dentro e amplitude';
    } else if (candidate === '3-4-3' && attackVsOppDefense >= 3) {
      bonus += 1.3;
      counterLabel = 'Superioridade ofensiva total';
    } else if (candidate === '5-3-2') {
      bonus -= 1.8;
    }
  } else {
    // Balanced match
    if (midfieldDelta <= -2 && (candidate === '3-5-2' || candidate === '4-1-4-1' || candidate === '4-2-3-1')) {
      bonus += 1.05;
      counterLabel = 'Reforço no meio-campo';
    } else if (attackVsOppDefense >= 2 && (candidate === '4-3-3' || candidate === '4-4-2')) {
      bonus += 0.9;
      counterLabel = 'Explorar fragilidade defensiva';
    }
  }

  return { bonus, counterLabel };
}

function getDefensiveBlockLabel(
  mentality: TacticalMentality,
  marking: MarkingStyle
): string {
  const blockHeight =
    mentality === 'Pressão Total'
      ? 'Pressão Alta'
      : mentality === 'Ofensivo'
      ? 'Linha Média-Alta'
      : mentality === 'Equilibrado'
      ? 'Bloco Médio Compacto'
      : mentality === 'Defensivo'
      ? 'Bloco Baixo Organizado'
      : 'Linhas Recuadas (Retranca)';

  return `${blockHeight} · Marcação ${marking}`;
}

export function buildAssistantTacticsAdvice(params: {
  userClub: Club;
  opponentClub: Club | null;
  upcomingFixture: Fixture | null;
  allFixtures?: Fixture[];
  rivalryName?: string | null;
}): AssistantTacticsAdviceReport {
  const {
    userClub,
    opponentClub,
    upcomingFixture,
    allFixtures = [],
    rivalryName = null,
  } = params;

  const upcomingComp: CompetitionType | undefined = upcomingFixture?.competition;
  const userRatings = getClubSectorRatings(userClub, { matchReady: true });
  const starters = userClub.squad.filter((p) => p.isStarter);
  const userAvgCondition =
    starters.length > 0
      ? Math.round(starters.reduce((acc, p) => acc + (p.condition ?? 100), 0) / starters.length)
      : 100;

  const competitionName = upcomingComp
    ? COMPETITIONS_CATALOG[upcomingComp]?.name || COMPETITIONS_CATALOG[upcomingComp]?.shortName || 'Próxima Partida'
    : 'Calendário da Temporada';
  const matchDateLabel = formatDateBr(upcomingFixture?.date);
  const isUserHome = upcomingFixture ? upcomingFixture.homeTeamId === userClub.id : true;
  const isKnockout = Boolean(
    upcomingFixture?.cupPhase &&
      !upcomingFixture.cupPhase.toLowerCase().includes('grupos')
  );

  // Evaluate squad fit across all 7 formations
  const evaluateAllFormations = (oppClub: Club | null, effectiveDelta: number, oppRatings: ClubSectorRatings | null) => {
    return ALL_TACTICAL_FORMATIONS.map((formation) => {
      const sim = buildAssistantOptimalLineup(userClub, upcomingComp, {
        ...userClub.tactics,
        formation,
      });
      const slots = FORMATION_SLOT_ROLES[formation] || FORMATION_SLOT_ROLES['4-3-3'];
      let naturalFitCount = 0;
      let effOvrSum = 0;

      for (const starter of sim.starters) {
        if (starter.pitchSlot !== undefined) {
          const slot = slots[starter.pitchSlot];
          if (slot) {
            const fit = evaluatePlayerSlotFit(starter, slot.role, slot.code);
            effOvrSum += fit.effectiveOverall;
            if (!fit.isOutOfPosition) naturalFitCount += 1;
            continue;
          }
        }
        effOvrSum += starter.overall;
      }

      const avgOverall =
        sim.starters.length > 0 ? Math.round((effOvrSum / sim.starters.length) * 10) / 10 : 0;

      const counter = oppClub && oppRatings
        ? getFormationCounterBonus({
            candidate: formation,
            opponentFormation: oppClub.tactics.formation,
            opponentMentality: oppClub.tactics.mentality,
            effectiveDelta,
            midfieldDelta: userRatings.midfield - oppRatings.midfield,
            attackVsOppDefense: userRatings.attack - oppRatings.defense,
            defenseVsOppAttack: userRatings.defense - oppRatings.attack,
            isUserHome,
          })
        : { bonus: 0, counterLabel: 'Melhor encaixe do elenco' };

      // Slight stability bonus if user is already using this formation
      const stabilityBonus = formation === userClub.tactics.formation ? 0.25 : 0;
      const totalScore =
        avgOverall * 1.15 +
        naturalFitCount * 0.52 +
        (sim.avgCondition - 80) * 0.04 +
        counter.bonus +
        stabilityBonus;

      return {
        formation,
        avgOverall,
        naturalFitCount,
        avgCondition: sim.avgCondition,
        counterLabel: counter.counterLabel,
        totalScore,
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  };

  // Fallback when no opponent is currently scheduled
  if (!opponentClub || !upcomingFixture) {
    const evals = evaluateAllFormations(null, 0, null);
    const best = evals[0];
    const passing: PassingStyle =
      userRatings.midfield >= userRatings.attack + 2
        ? 'Curto (Posse)'
        : userRatings.attack >= userRatings.midfield + 2
        ? 'Longo (Contra-ataque)'
        : 'Misto';
    const mentality: TacticalMentality = 'Equilibrado';
    const marking: MarkingStyle = 'Normal';

    return {
      hasOpponent: false,
      opponent: null,
      fixture: null,
      isUserHome: true,
      competitionName: 'Sem partida agendada',
      matchDateLabel: '',
      rivalryName: null,
      isKnockout: false,
      userRatings,
      opponentRatings: null,
      effectiveDelta: 0,
      matchupSummary:
        'Nenhum adversário agendado no momento. O assistente avaliou o melhor esquema-base para o seu elenco atual.',
      opponentForm: {
        results: [],
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      },
      keyThreatPlayer: null,
      opponentUnavailableCount: 0,
      userAvgCondition,
      recommendedFormation: {
        formation: best.formation,
        avgOverall: best.avgOverall,
        naturalFitCount: best.naturalFitCount,
        avgCondition: best.avgCondition,
        counterLabel: 'Melhor encaixe do elenco',
        rationale: `O ${best.formation} aproveita ${best.naturalFitCount}/11 titulares em posições naturais com OVR efetivo médio de ${best.avgOverall}.`,
      },
      recommendedPlayStyle: {
        passing,
        mentality,
        headline: `${passing} · ${mentality}`,
        rationale: `Sem confronto definido, manter postura equilibrada com passe ${passing.toLowerCase()} preserva o entrosamento até a próxima rodada.`,
      },
      recommendedDefensivePosture: {
        marking,
        mentality,
        blockLabel: getDefensiveBlockLabel(mentality, marking),
        rationale: 'Marcação normal evita desgaste físico e cartões desnecessários enquanto aguarda o sorteio da próxima tabela.',
      },
      scoutingNotes: [
        {
          label: 'Base do elenco',
          detail: `Força atual do XI: DEF ${userRatings.defense} · MEI ${userRatings.midfield} · ATA ${userRatings.attack}.`,
          tone: 'neutral',
        },
      ],
    };
  }

  // Full opponent-aware tactical analysis
  const opponentRatings = getClubSectorRatings(opponentClub, { matchReady: true });
  const opponentForm = computeRecentFormForClub(opponentClub.id, allFixtures, 5);

  const oppEligible = opponentClub.squad.filter((p) =>
    isPlayerAvailableForMatch(p, upcomingComp)
  );
  const opponentUnavailableCount = opponentClub.squad.length - oppEligible.length;
  const keyThreatPlayer =
    [...oppEligible]
      .filter((p) => p.position === 'FW' || p.position === 'MF')
      .sort(
        (a, b) =>
          b.overall + b.goals * 0.45 - (a.overall + a.goals * 0.45)
      )[0] ||
    [...oppEligible].sort((a, b) => b.overall - a.overall)[0] ||
    null;

  // Match engine applies +2.2 home advantage (see instantMatchEngine.ts)
  const homeFactor = isUserHome ? 2.2 : -2.2;
  const formMomentum =
    opponentForm.played >= 3
      ? (opponentForm.losses - opponentForm.wins) * 0.45
      : 0;
  const effectiveDelta =
    Math.round((userRatings.overall - opponentRatings.overall + homeFactor + formMomentum) * 10) /
    10;

  const midfieldDelta = userRatings.midfield - opponentRatings.midfield;
  const attackVsOppDefense = userRatings.attack - opponentRatings.defense;
  const defenseVsOppAttack = userRatings.defense - opponentRatings.attack;

  // 1. Recommended Formation
  const formationRanking = evaluateAllFormations(opponentClub, effectiveDelta, opponentRatings);
  const bestForm = formationRanking[0];
  const oppFormation = opponentClub.tactics.formation;
  const formationRationale =
    `Encaixa ${bestForm.naturalFitCount}/11 titulares na função natural (OVR ${bestForm.avgOverall}) ` +
    `e neutraliza o ${oppFormation} do ${opponentClub.shortName} (${bestForm.counterLabel.toLowerCase()}).`;

  // 2. Recommended Mentality & Passing Style
  let recommendedMentality: TacticalMentality = 'Equilibrado';
  let recommendedPassing: PassingStyle = 'Misto';

  if (effectiveDelta >= 6 && isUserHome && userAvgCondition >= 75) {
    recommendedMentality = 'Pressão Total';
    recommendedPassing =
      midfieldDelta >= 2 ? 'Curto (Posse)' : 'Misto';
  } else if (effectiveDelta >= 2.5 || (isUserHome && attackVsOppDefense >= 2)) {
    recommendedMentality = 'Ofensivo';
    recommendedPassing =
      midfieldDelta >= 2 ||
      opponentClub.tactics.mentality === 'Defensivo' ||
      opponentClub.tactics.mentality === 'Muito Defensivo'
        ? 'Curto (Posse)'
        : 'Misto';
  } else if (effectiveDelta <= -6 && !isUserHome) {
    recommendedMentality = 'Muito Defensivo';
    recommendedPassing = 'Longo (Contra-ataque)';
  } else if (effectiveDelta <= -2.5 || (!isUserHome && defenseVsOppAttack <= -3)) {
    recommendedMentality = 'Defensivo';
    recommendedPassing = 'Longo (Contra-ataque)';
  } else {
    recommendedMentality = 'Equilibrado';
    if (
      opponentClub.tactics.mentality === 'Ofensivo' ||
      opponentClub.tactics.mentality === 'Pressão Total'
    ) {
      recommendedPassing = midfieldDelta >= 3 ? 'Curto (Posse)' : 'Longo (Contra-ataque)';
    } else if (midfieldDelta >= 3) {
      recommendedPassing = 'Curto (Posse)';
    } else {
      recommendedPassing = 'Misto';
    }
  }

  // Fatigue safety guard: never recommend Pressão Total when XI average stamina is low
  if (recommendedMentality === 'Pressão Total' && userAvgCondition < 74) {
    recommendedMentality = 'Ofensivo';
  }

  const playStyleRationale = (() => {
    if (recommendedPassing === 'Curto (Posse)') {
      return `Nosso meio-campo (${userRatings.midfield}) supera o rival (${opponentRatings.midfield}). Controlar a posse no estilo ${recommendedMentality.toLowerCase()} sufoca a saída do ${opponentClub.shortName} e reduz contra-ataques.`;
    }
    if (recommendedPassing === 'Longo (Contra-ataque)') {
      return `O ${opponentClub.shortName} joga em postura ${opponentClub.tactics.mentality.toLowerCase()} (${oppFormation}) ${
        isUserHome ? 'e tem ataque perigoso' : 'e costuma avançar as linhas em casa'
      }. Saída direta nas costas da zaga (${opponentRatings.defense} DEF) maximiza a letalidade.`;
    }
    return `Confronto equilibrado (OVR ${userRatings.overall} vs ${opponentRatings.overall}). O passe misto com mentalidade ${recommendedMentality.toLowerCase()} alterna controle de ritmo e verticalidade conforme o espaço aparecer.`;
  })();

  // 3. Recommended Defensive Posture (Marking + Block)
  const startersWithCardRisk = starters.filter(
    (p) => (upcomingComp ? (p.competitionYellowCards?.[upcomingComp] ?? 0) : p.yellowCards) >= 2
  ).length;

  let recommendedMarking: MarkingStyle = 'Normal';
  if (
    (opponentClub.tactics.passing === 'Curto (Posse)' ||
      (keyThreatPlayer && keyThreatPlayer.overall >= userRatings.defense + 2) ||
      effectiveDelta <= -2) &&
    userAvgCondition >= 72 &&
    startersWithCardRisk < 3 &&
    !rivalryName
  ) {
    recommendedMarking = 'Pesada';
  } else if (
    effectiveDelta >= 5 ||
    userAvgCondition < 68 ||
    startersWithCardRisk >= 3 ||
    (opponentClub.tactics.passing === 'Longo (Contra-ataque)' && isUserHome)
  ) {
    recommendedMarking = 'Leve';
  } else {
    recommendedMarking = 'Normal';
  }

  const blockLabel = getDefensiveBlockLabel(recommendedMentality, recommendedMarking);
  const defensiveRationale = (() => {
    if (recommendedMarking === 'Pesada') {
      return `O ${opponentClub.shortName} busca construir em ${opponentClub.tactics.passing.toLowerCase()}. Pressão forte no portador quebra a criação rival e limita bolas limpas para ${
        keyThreatPlayer ? keyThreatPlayer.name : 'o ataque adversário'
      }.`;
    }
    if (recommendedMarking === 'Leve') {
      if (startersWithCardRisk >= 3) {
        return `${startersWithCardRisk} titulares estão pendurados por cartões. Marcação leve preserva o elenco para a sequência sem ceder faltas frontais perigosas.`;
      }
      if (userAvgCondition < 68) {
        return `Com fôlego médio de ${userAvgCondition}%, evitar marcação pesada mantém o bloco organizado até os minutos finais.`;
      }
      return `Com superioridade técnica ${isUserHome ? 'em casa' : 'no duelo'}, marcação limpa evita faltas bobas e bolas paradas — principal arma de equipes mais fechadas.`;
    }
    if (rivalryName) {
      return `Em ${rivalryName}, a arbitragem costuma ser rigorosa. Marcação normal mantém a pegada competitiva sem risco alto de expulsão.`;
    }
    return `Combina cobertura por zona e perseguição controlada contra o ataque rival (${opponentRatings.attack} ATA), mantendo equilíbrio entre desarmes e disciplina.`;
  })();

  // Matchup headline
  const matchupSummary =
    effectiveDelta >= 4
      ? `Favoritismo claro ${isUserHome ? 'em casa' : 'fora'} contra o ${opponentClub.shortName} — postura propositiva recomendada.`
      : effectiveDelta <= -4
      ? `Desafio pesado ${isUserHome ? 'mesmo em casa' : 'como visitante'} diante do ${opponentClub.shortName} — prioridade em proteção e transição rápida.`
      : `Duelo equilibrado ${isUserHome ? 'com mando a favor' : 'fora de casa'} frente ao ${opponentClub.shortName} — detalhes táticos decidem.`;

  // Concrete scouting notes (up to 3)
  const scoutingNotes: AssistantScoutingNote[] = [];

  if (keyThreatPlayer) {
    const goalsText =
      keyThreatPlayer.goals > 0 ? ` · ${keyThreatPlayer.goals} gol(s) na temporada` : '';
    scoutingNotes.push({
      label: 'Principal ameaça rival',
      detail: `${keyThreatPlayer.name} (${keyThreatPlayer.detailedRole}, OVR ${keyThreatPlayer.overall}${goalsText}) concentra as ações ofensivas do ${opponentClub.shortName}.`,
      tone: 'warning',
    });
  }

  // Identify opponent's weakest sector to exploit
  const oppSectors: { name: string; val: number; myVal: number; tip: string }[] = [
    {
      name: 'Defesa',
      val: opponentRatings.defense,
      myVal: userRatings.attack,
      tip: `Ataque (${userRatings.attack}) leva vantagem sobre a defesa rival (${opponentRatings.defense}). Busque infiltrações e finalizações rápidas.`,
    },
    {
      name: 'Meio-campo',
      val: opponentRatings.midfield,
      myVal: userRatings.midfield,
      tip: `Setor central do ${opponentClub.shortName} (${opponentRatings.midfield}) é vulnerável ao nosso meio (${userRatings.midfield}). Controle o ritmo por dentro.`,
    },
    {
      name: 'Ataque',
      val: opponentRatings.attack,
      myVal: userRatings.defense,
      tip: `Nossa defesa (${userRatings.defense}) supera o ataque adversário (${opponentRatings.attack}), dando margem para avançar laterais com segurança.`,
    },
  ].sort((a, b) => b.myVal - b.val - (a.myVal - a.val));

  if (oppSectors[0]) {
    scoutingNotes.push({
      label: 'Setor para explorar',
      detail: oppSectors[0].tip,
      tone: 'opportunity',
    });
  }

  if (opponentForm.played >= 3) {
    const avgConceded = (opponentForm.goalsAgainst / opponentForm.played).toFixed(1);
    const avgScored = (opponentForm.goalsFor / opponentForm.played).toFixed(1);
    scoutingNotes.push({
      label: 'Momento recente do adversário',
      detail: `${opponentForm.wins}V ${opponentForm.draws}E ${opponentForm.losses}D nos últimos ${opponentForm.played} jogos (média de ${avgScored} gols pró e ${avgConceded} sofridos).`,
      tone: opponentForm.losses >= 3 ? 'opportunity' : opponentForm.wins >= 3 ? 'warning' : 'neutral',
    });
  } else if (opponentUnavailableCount > 0) {
    scoutingNotes.push({
      label: 'Desfalques no adversário',
      detail: `O ${opponentClub.shortName} chega com ${opponentUnavailableCount} atleta(s) indisponível(is) por lesão ou suspensão.`,
      tone: 'opportunity',
    });
  } else if (isKnockout) {
    scoutingNotes.push({
      label: 'Jogo eliminatório',
      detail: `${upcomingFixture.cupPhase}: controle emocional e solidez nas bolas paradas têm peso decisivo no mata-mata.`,
      tone: 'warning',
    });
  }

  return {
    hasOpponent: true,
    opponent: opponentClub,
    fixture: upcomingFixture,
    isUserHome,
    competitionName,
    matchDateLabel,
    rivalryName,
    isKnockout,
    userRatings,
    opponentRatings,
    effectiveDelta,
    matchupSummary,
    opponentForm,
    keyThreatPlayer,
    opponentUnavailableCount,
    userAvgCondition,
    recommendedFormation: {
      formation: bestForm.formation,
      avgOverall: bestForm.avgOverall,
      naturalFitCount: bestForm.naturalFitCount,
      avgCondition: bestForm.avgCondition,
      counterLabel: bestForm.counterLabel,
      rationale: formationRationale,
    },
    recommendedPlayStyle: {
      passing: recommendedPassing,
      mentality: recommendedMentality,
      headline: `${recommendedPassing} · ${recommendedMentality}`,
      rationale: playStyleRationale,
    },
    recommendedDefensivePosture: {
      marking: recommendedMarking,
      mentality: recommendedMentality,
      blockLabel,
      rationale: defensiveRationale,
    },
    scoutingNotes: scoutingNotes.slice(0, 3),
  };
}

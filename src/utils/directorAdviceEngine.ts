import {
  Club,
  DetailedRole,
  Fixture,
  FormationType,
  GameSave,
  MarkingStyle,
  PassingStyle,
  Player,
  Standing,
  TacticalMentality,
  TacticalSettings,
} from '../types/game';
import {
  buildAiTransferDirectorReport,
  ClubSquadDiagnosis,
  diagnoseClubSquadNeeds,
} from './aiTransferEngine';
import {
  AssistantLineupResult,
  buildAssistantOptimalLineup,
  FORMATION_SLOT_ROLES,
  isPlayerAvailableForMatch,
} from './assistantLineupEngine';
import { getClubSectorRatings } from './clubRatingsEngine';
import { evaluatePlayerSlotFit } from './tacticalPositioningEngine';
import { getClubEuropeanLeagueId } from './europeLeaguesEngine';
import {
  computeCaptainLeadershipScore,
  computeCornerSkillScore,
  computeFreekickSkillScore,
  computePenaltySkillScore,
  pickOptimalSetPieceTakers,
} from './matchExperienceEngine';
import { getClubSouthAmericanLeagueId } from './southAmericaLeaguesEngine';
import { getClubWorldLeagueId } from './worldLeaguesEngine';

export type DirectorSeverity = 'CRITICA' | 'ATENCAO' | 'OPORTUNIDADE';

export type DirectorWeaknessCategory =
  | 'ELENCO'
  | 'TATICA'
  | 'FISICO_DM'
  | 'CONTRATOS'
  | 'DESEMPENHO';

export type DirectorWeaknessActionType =
  | 'OPEN_SIGNINGS'
  | 'OPEN_TACTICS_ADVICE'
  | 'APPLY_LINEUP'
  | 'OPEN_CONTRACTS'
  | 'OPEN_MARKET_ROLE';

export interface DirectorWeaknessItem {
  id: string;
  severity: DirectorSeverity;
  category: DirectorWeaknessCategory;
  categoryLabel: string;
  title: string;
  metricSummary: string;
  diagnosis: string;
  recommendation: string;
  actionType: DirectorWeaknessActionType;
  actionLabel: string;
  targetRole?: DetailedRole;
}

export type DirectorDealMode = 'PURCHASE' | 'LOAN' | 'BOSMAN' | 'FREE_AGENT';

export interface DirectorSigningSuggestion {
  id: string;
  player: Player;
  sellerClub: Club | null;
  dealMode: DirectorDealMode;
  dealModeLabel: string;
  priority: 'ALTA' | 'MEDIA' | 'OPORTUNIDADE';
  targetRole: DetailedRole;
  targetRoleLabel: string;
  currentStarterName: string;
  currentStarterOvr: number;
  upgradeDeltaOvr: number;
  estimatedFee: number;
  estimatedWage: number;
  fitsBudget: boolean;
  fixesShortage: boolean;
  rationale: string;
}

export type DirectorTacticalCategory =
  | 'FORMATION'
  | 'POSTURE'
  | 'LINEUP_ROTATION'
  | 'SET_PIECES'
  | 'AUTO_ASSISTANT';

export interface DirectorTacticalSuggestion {
  id: string;
  category: DirectorTacticalCategory;
  categoryLabel: string;
  priority: 'ALTA' | 'MEDIA' | 'REFINAMENTO';
  title: string;
  currentSummary: string;
  suggestedSummary: string;
  impactMetric: string;
  rationale: string;
  tacticsPatch?: Partial<TacticalSettings>;
  rearrangeOptimalLineup?: boolean;
  alreadyOptimal: boolean;
  actionLabel: string;
}

export interface DirectorFormationEvaluation {
  formation: FormationType;
  avgOverall: number;
  avgCondition: number;
  naturalFitCount: number;
  compositeScore: number;
}

export interface DirectorRoleBreakdownItem {
  role: DetailedRole;
  count: number;
  idealCount: number;
  avgTopOvr: number;
  avgAge: number;
}

export interface DirectorAdviceReport {
  squadHealthScore: number;
  diagnosis: ClubSquadDiagnosis;
  roleBreakdown: DirectorRoleBreakdownItem[];
  weakestRoleLabel: string;
  bestFormationEval: DirectorFormationEvaluation;
  currentFormationEval: DirectorFormationEvaluation;
  optimalLineupPreview: AssistantLineupResult;
  leagueContext: {
    played: number;
    rank: number | null;
    totalTeams: number;
    goalsForPerMatch: number;
    goalsAgainstPerMatch: number;
    points: number;
  };
  executiveHeadline: string;
  executiveSummary: string;
  weaknesses: DirectorWeaknessItem[];
  signingSuggestions: DirectorSigningSuggestion[];
  tacticalSuggestions: DirectorTacticalSuggestion[];
}

const IDEAL_ROLE_COUNTS: Record<DetailedRole, number> = {
  GOL: 3,
  ZAG: 6,
  LAT: 5,
  VOL: 5,
  MEI: 5,
  ATA: 6,
};

export const DETAILED_ROLE_LABELS: Record<DetailedRole, string> = {
  GOL: 'Goleiro (GOL)',
  ZAG: 'Zagueiro (ZAG)',
  LAT: 'Lateral / Ala (LAT)',
  VOL: 'Volante (VOL)',
  MEI: 'Meia Armador (MEI)',
  ATA: 'Atacante (ATA)',
};

const ALL_FORMATIONS: FormationType[] = [
  '4-3-3',
  '4-4-2',
  '4-2-3-1',
  '3-5-2',
  '5-3-2',
  '4-1-4-1',
  '3-4-3',
];

function resolvePrimaryStandings(gameState: GameSave, userClub: Club): Standing[] {
  const div = userClub.division;
  const euLeagueId = div === 'EU' ? getClubEuropeanLeagueId(userClub) : undefined;
  const saLeagueId = div === 'SA' ? getClubSouthAmericanLeagueId(userClub) : undefined;
  const wlLeagueId = div === 'WL' ? getClubWorldLeagueId(userClub) : undefined;

  const rawPool: Standing[] =
    div === 'EU' && euLeagueId
      ? gameState.standingsEurope?.[euLeagueId] || []
      : div === 'SA' && saLeagueId
      ? gameState.standingsSouthAmerica?.[saLeagueId] || []
      : div === 'WL' && wlLeagueId
      ? gameState.standingsWorldLeagues?.[wlLeagueId] || []
      : div === 'B'
      ? gameState.standingsB || []
      : div === 'C'
      ? gameState.standingsC || []
      : div === 'D'
      ? gameState.standingsD || []
      : gameState.standingsA || [];

  const userRow = rawPool.find((r) => r.teamId === userClub.id);
  const scopedPool =
    userRow?.group ? rawPool.filter((r) => r.group === userRow.group) : rawPool;

  return [...scopedPool].sort(
    (a, b) =>
      b.points - a.points ||
      b.won - a.won ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
  );
}

function evaluateFormationsForClub(
  club: Club,
  upcomingFixture?: Fixture | null
): DirectorFormationEvaluation[] {
  const comp = upcomingFixture?.competition;
  const results: DirectorFormationEvaluation[] = ALL_FORMATIONS.map((formation) => {
    const sim = buildAssistantOptimalLineup(club, comp, {
      ...club.tactics,
      formation,
    });
    const slots = FORMATION_SLOT_ROLES[formation] || FORMATION_SLOT_ROLES['4-3-3'];
    let naturalFitCount = 0;
    let effectiveOvrSum = 0;

    for (const starter of sim.starters) {
      if (starter.pitchSlot !== undefined) {
        const expectedSlot = slots[starter.pitchSlot];
        if (expectedSlot) {
          const fit = evaluatePlayerSlotFit(starter, expectedSlot.role, expectedSlot.code);
          effectiveOvrSum += fit.effectiveOverall;
          if (!fit.isOutOfPosition) {
            naturalFitCount += 1;
          }
          continue;
        }
      }
      effectiveOvrSum += starter.overall;
    }

    const avgExactOvr =
      sim.starters.length > 0 ? effectiveOvrSum / sim.starters.length : 0;

    // Slight tie-breaker preference for current formation so we don't churn on tiny 0.05 differences
    const currentBonus = formation === club.tactics.formation ? 0.35 : 0;
    const compositeScore =
      avgExactOvr * 1.15 +
      naturalFitCount * 0.45 +
      (sim.avgCondition - 80) * 0.05 +
      currentBonus;

    return {
      formation,
      avgOverall: Math.round(avgExactOvr * 10) / 10,
      avgCondition: sim.avgCondition,
      naturalFitCount,
      compositeScore: Math.round(compositeScore * 100) / 100,
    };
  });

  return results.sort((a, b) => b.compositeScore - a.compositeScore);
}

function getStarterReferenceForRole(club: Club, role: DetailedRole): { name: string; ovr: number } {
  const startersInRole = club.squad
    .filter((p) => p.isStarter && p.detailedRole === role)
    .sort((a, b) => a.overall - b.overall);

  if (startersInRole[0]) {
    return { name: startersInRole[0].name, ovr: startersInRole[0].overall };
  }

  const allInRole = club.squad
    .filter((p) => p.detailedRole === role)
    .sort((a, b) => b.overall - a.overall);

  if (allInRole[0]) {
    return { name: allInRole[0].name, ovr: allInRole[0].overall };
  }

  const fallbackAvg =
    club.squad.length > 0
      ? Math.round(club.squad.reduce((acc, p) => acc + p.overall, 0) / club.squad.length)
      : 68;
  return { name: 'Sem especialista no plantel', ovr: fallbackAvg - 3 };
}

function buildFallbackSigningsIfNeeded(
  gameState: GameSave,
  userClub: Club,
  diagnosis: ClubSquadDiagnosis,
  existingIds: Set<string>
): DirectorSigningSuggestion[] {
  const results: DirectorSigningSuggestion[] = [];
  const priorityRoles = new Set<DetailedRole>([
    diagnosis.weakestRole,
    ...diagnosis.shortageRoles,
  ]);
  const balance = userClub.finances.balance;

  // 1. Scan Free Agents first (zero transfer fee)
  const freeCandidates = [...(gameState.transferMarket || [])]
    .filter(
      (p) =>
        !existingIds.has(p.id) &&
        p.age <= 34 &&
        p.overall >= diagnosis.avgStarterOverall - 2
    )
    .sort((a, b) => {
      const aRoleBoost = priorityRoles.has(a.detailedRole) ? 4 : 0;
      const bRoleBoost = priorityRoles.has(b.detailedRole) ? 4 : 0;
      return b.overall + bRoleBoost - (a.overall + aRoleBoost);
    });

  for (const player of freeCandidates.slice(0, 3)) {
    const ref = getStarterReferenceForRole(userClub, player.detailedRole);
    const delta = player.overall - ref.ovr;
    const fixesShortage = diagnosis.shortageRoles.includes(player.detailedRole);
    if (delta < 0 && !fixesShortage) continue;

    existingIds.add(player.id);
    results.push({
      id: `dir_fa_${player.id}`,
      player,
      sellerClub: null,
      dealMode: 'FREE_AGENT',
      dealModeLabel: 'Agente Livre · Sem Custos',
      priority: delta >= 2 || fixesShortage ? 'ALTA' : 'OPORTUNIDADE',
      targetRole: player.detailedRole,
      targetRoleLabel: DETAILED_ROLE_LABELS[player.detailedRole],
      currentStarterName: ref.name,
      currentStarterOvr: ref.ovr,
      upgradeDeltaOvr: delta,
      estimatedFee: 0,
      estimatedWage: Math.round((player.wage || 0) * 1.05),
      fitsBudget: true,
      fixesShortage,
      rationale: fixesShortage
        ? `Cobre carência numérica imediata em ${player.detailedRole} sem exigir taxa de transferência.`
        : `Chega livre de contrato e entrega OVR ${player.overall} contra ${ref.ovr} de ${ref.name}.`,
    });
  }

  // 2. Scan Loans or Affordable Transfers from other clubs for weakest/shortage roles
  const otherClubs = gameState.clubs.filter((c) => c.id !== userClub.id);
  const clubCandidates: { player: Player; club: Club; score: number; mode: DirectorDealMode; fee: number }[] = [];

  for (const club of otherClubs) {
    if (club.squad.length <= 18) continue;
    for (const p of club.squad) {
      if (existingIds.has(p.id) || p.isLoan) continue;
      const isTargetRole = priorityRoles.has(p.detailedRole);
      if (!isTargetRole && p.overall < diagnosis.avgStarterOverall + 1) continue;
      if (p.overall < diagnosis.avgStarterOverall - 1 || p.overall > diagnosis.avgStarterOverall + 9) {
        continue;
      }

      const ref = getStarterReferenceForRole(userClub, p.detailedRole);
      const delta = p.overall - ref.ovr;
      const fixesShortage = diagnosis.shortageRoles.includes(p.detailedRole);
      if (delta <= 0 && !fixesShortage) continue;

      const canLoan = Boolean(p.isListedForLoan) || (!p.isStarter && p.age <= 24);
      const canBosman = p.contractYears <= 1 && !p.preContractClubId && p.age >= 23;
      const estPurchase =
        p.isListedForSale && p.askingPrice
          ? p.askingPrice
          : Math.round(p.marketValue * 1.08);
      const estLoanFee = Math.round((p.wage || 0) * 1.5);

      let mode: DirectorDealMode | null = null;
      let fee = 0;

      if (canBosman) {
        mode = 'BOSMAN';
        fee = 0;
      } else if (estPurchase <= diagnosis.safeTransferBudget && balance >= estPurchase) {
        mode = 'PURCHASE';
        fee = estPurchase;
      } else if (canLoan && balance >= estLoanFee) {
        mode = 'LOAN';
        fee = estLoanFee;
      }

      if (!mode) continue;

      const score =
        delta * 4.5 +
        (p.detailedRole === diagnosis.weakestRole ? 6 : 0) +
        (fixesShortage ? 5 : 0) +
        (mode === 'BOSMAN' || mode === 'LOAN' ? 2.5 : 0);

      clubCandidates.push({ player: p, club, score, mode, fee });
    }
  }

  clubCandidates.sort((a, b) => b.score - a.score);

  for (const cand of clubCandidates) {
    if (results.length >= 5) break;
    if (existingIds.has(cand.player.id)) continue;
    existingIds.add(cand.player.id);

    const ref = getStarterReferenceForRole(userClub, cand.player.detailedRole);
    const delta = cand.player.overall - ref.ovr;
    const fixesShortage = diagnosis.shortageRoles.includes(cand.player.detailedRole);

    const dealModeLabel =
      cand.mode === 'BOSMAN'
        ? 'Pré-Contrato (Último Ano)'
        : cand.mode === 'LOAN'
        ? 'Empréstimo com Opção'
        : 'Compra Definitiva';

    results.push({
      id: `dir_ext_${cand.player.id}`,
      player: cand.player,
      sellerClub: cand.club,
      dealMode: cand.mode,
      dealModeLabel,
      priority:
        cand.player.detailedRole === diagnosis.weakestRole || fixesShortage
          ? 'ALTA'
          : 'MEDIA',
      targetRole: cand.player.detailedRole,
      targetRoleLabel: DETAILED_ROLE_LABELS[cand.player.detailedRole],
      currentStarterName: ref.name,
      currentStarterOvr: ref.ovr,
      upgradeDeltaOvr: delta,
      estimatedFee: cand.fee,
      estimatedWage:
        cand.mode === 'LOAN'
          ? Math.round((cand.player.wage || 0) * 0.7)
          : Math.round((cand.player.wage || 0) * 1.1),
      fitsBudget: cand.fee <= Math.max(0, balance),
      fixesShortage,
      rationale:
        cand.mode === 'LOAN'
          ? `Opção acessível por empréstimo junto ao ${cand.club.shortName} para elevar ${cand.player.detailedRole} sem comprometer o caixa.`
          : cand.mode === 'BOSMAN'
          ? `Resta 1 ano de vínculo no ${cand.club.shortName}; oportunidade estratégica de pré-contrato em setor prioritário.`
          : `Upgrade direto sobre ${ref.name} (${ref.ovr} → ${cand.player.overall} OVR) dentro da margem financeira segura.`,
    });
  }

  return results;
}

export function buildDirectorAdviceReport(
  gameState: GameSave,
  userClub: Club,
  upcomingFixture?: Fixture | null,
  upcomingOpponent?: Club | null
): DirectorAdviceReport {
  const diagnosis = diagnoseClubSquadNeeds(userClub);
  const aiMarketReport = buildAiTransferDirectorReport(gameState);
  const userSectors = getClubSectorRatings(userClub);
  const oppSectors = upcomingOpponent ? getClubSectorRatings(upcomingOpponent) : null;

  const allRoles: DetailedRole[] = ['GOL', 'LAT', 'ZAG', 'VOL', 'MEI', 'ATA'];
  const roleBreakdown: DirectorRoleBreakdownItem[] = allRoles.map((role) => {
    const stat = diagnosis.roleStats[role];
    const inRole = userClub.squad.filter((p) => p.detailedRole === role);
    const avgAge =
      inRole.length > 0
        ? Math.round((inRole.reduce((acc, p) => acc + p.age, 0) / inRole.length) * 10) / 10
        : 0;
    return {
      role,
      count: stat?.count || inRole.length,
      idealCount: IDEAL_ROLE_COUNTS[role],
      avgTopOvr: stat?.starterAvgOvr || stat?.bestOvr || 0,
      avgAge,
    };
  });

  // Standings & season performance metrics
  const standings = resolvePrimaryStandings(gameState, userClub);
  const rankIdx = standings.findIndex((s) => s.teamId === userClub.id);
  const myRow = rankIdx >= 0 ? standings[rankIdx] : undefined;
  const played = myRow?.played || 0;
  const goalsForPerMatch = played > 0 && myRow ? Math.round((myRow.goalsFor / played) * 100) / 100 : 0;
  const goalsAgainstPerMatch =
    played > 0 && myRow ? Math.round((myRow.goalsAgainst / played) * 100) / 100 : 0;

  // Formation & Optimal Lineup Analysis
  const formationEvals = evaluateFormationsForClub(userClub, upcomingFixture);
  const bestFormationEval = formationEvals[0];
  const currentFormationEval =
    formationEvals.find((e) => e.formation === userClub.tactics.formation) || formationEvals[0];

  const optimalLineupPreview = buildAssistantOptimalLineup(
    userClub,
    upcomingFixture?.competition,
    userClub.tactics
  );

  const currentStarters = userClub.squad.filter((p) => p.isStarter);
  const unavailableStarters = currentStarters.filter(
    (p) => !isPlayerAvailableForMatch(p, upcomingFixture?.competition)
  );
  const fatiguedStarters = currentStarters.filter(
    (p) =>
      isPlayerAvailableForMatch(p, upcomingFixture?.competition) &&
      (p.condition ?? 100) < 70
  );

  const expiringKeyPlayers = userClub.squad
    .filter(
      (p) =>
        !p.isLoan &&
        p.contractYears <= 1 &&
        !p.retiringAtSeasonEnd &&
        !p.preContractClubId &&
        (p.isStarter || p.overall >= diagnosis.avgStarterOverall - 1)
    )
    .sort((a, b) => b.overall - a.overall);

  // ============================================================================
  // 1. DIAGNÓSTICO DE FRAQUEZAS DO ELENCO & CAMPANHA
  // ============================================================================
  const weaknesses: DirectorWeaknessItem[] = [];

  // 1A. Unavailable starters (DM / Suspensão) escalated in Starting XI
  if (unavailableStarters.length > 0) {
    weaknesses.push({
      id: 'weak_unavailable_starters',
      severity: 'CRITICA',
      category: 'FISICO_DM',
      categoryLabel: 'Escalação · Baixas Médicas/Suspensão',
      title: `${unavailableStarters.length} ${
        unavailableStarters.length === 1 ? 'titular indisponível escalado' : 'titulares indisponíveis escalados'
      }`,
      metricSummary: `${unavailableStarters.length} baixa(s) no XI`,
      diagnosis: `${unavailableStarters
        .slice(0, 3)
        .map((p) => p.name)
        .join(', ')} não reúne(m) condições de jogo por lesão ou suspensão na próxima competição.`,
      recommendation:
        'Aplique imediatamente a revisão dos 11 titulares para evitar improvisações automáticas na hora da partida.',
      actionType: 'APPLY_LINEUP',
      actionLabel: 'Corrigir 11 Titulares Agora',
    });
  }

  // 1B. Fatigued starters (< 70% condition)
  if (fatiguedStarters.length >= 2) {
    const lowestCond = Math.min(...fatiguedStarters.map((p) => Math.round(p.condition)));
    weaknesses.push({
      id: 'weak_fatigue_starters',
      severity: lowestCond < 58 ? 'CRITICA' : 'ATENCAO',
      category: 'FISICO_DM',
      categoryLabel: 'Fisiologia · Desgaste Físico',
      title: `Queda física acentuada entre os titulares (${fatiguedStarters.length} atletas < 70%)`,
      metricSummary: `Piso ${lowestCond}% físico`,
      diagnosis: `${fatiguedStarters
        .slice(0, 3)
        .map((p) => `${p.name} (${Math.round(p.condition)}%)`)
        .join(', ')} entram em zona elevada de lesão muscular e perda de intensidade no 2º tempo.`,
      recommendation:
        'Rode o elenco com reservas descansados ou reduza a exigência física da marcação para preservar o grupo.',
      actionType: 'APPLY_LINEUP',
      actionLabel: 'Rodar Titulares Desgastados',
    });
  }

  // 1C. Weakest Positional Role in the Starting Group
  const weakestGap = Math.round((diagnosis.avgStarterOverall - diagnosis.weakestRoleAvgOvr) * 10) / 10;
  weaknesses.push({
    id: `weak_role_${diagnosis.weakestRole}`,
    severity: weakestGap >= 3 ? 'CRITICA' : weakestGap >= 1.5 ? 'ATENCAO' : 'OPORTUNIDADE',
    category: 'ELENCO',
    categoryLabel: `Setor Crítico · ${diagnosis.weakestRole}`,
    title: `Carência de qualidade técnica em ${DETAILED_ROLE_LABELS[diagnosis.weakestRole]}`,
    metricSummary: `OVR ${diagnosis.weakestRoleAvgOvr} vs ${diagnosis.avgStarterOverall} média`,
    diagnosis:
      weakestGap >= 1.5
        ? `A função ${diagnosis.weakestRole} opera ${weakestGap.toFixed(
            1
          )} pts abaixo da média dos seus titulares (${diagnosis.avgStarterOverall} OVR), reduzindo a competitividade nos confrontos diretos.`
        : `Mesmo com plantel equilibrado, ${diagnosis.weakestRole} apresenta o menor teto técnico atual (${diagnosis.weakestRoleAvgOvr} OVR) entre os setores.`,
    recommendation: `Priorizar um reforço pontual para ${diagnosis.weakestRole} eleva o patamar imediato do time titular.`,
    actionType: 'OPEN_SIGNINGS',
    actionLabel: `Ver Alvos para ${diagnosis.weakestRole}`,
    targetRole: diagnosis.weakestRole,
  });

  // 1D. Numerical Squad Depth Shortages
  if (diagnosis.shortageRoles.length > 0) {
    const primaryShortage = diagnosis.shortageRoles[0];
    const stat = roleBreakdown.find((r) => r.role === primaryShortage);
    weaknesses.push({
      id: 'weak_shortage_depth',
      severity: stat && stat.count <= 1 ? 'CRITICA' : 'ATENCAO',
      category: 'ELENCO',
      categoryLabel: 'Profundidade do Plantel',
      title: `Elenco curto nas funções: ${diagnosis.shortageRoles.join(', ')}`,
      metricSummary: stat ? `${stat.count}/${stat.idealCount} em ${primaryShortage}` : `${diagnosis.shortageRoles.length} setor(es)`,
      diagnosis: `Faltam peças de reposição em ${diagnosis.shortageRoles
        .map((r) => DETAILED_ROLE_LABELS[r])
        .join(', ')}. Uma suspensão ou lesão forçará improviso fora de posição.`,
      recommendation:
        'Busque empréstimos de baixo custo ou agentes livres para recompor o banco de reservas.',
      actionType: 'OPEN_SIGNINGS',
      actionLabel: 'Ver Reposições Sugeridas',
      targetRole: primaryShortage,
    });
  }

  // 1E. League Defensive or Offensive Performance Alert
  if (played >= 3 && goalsAgainstPerMatch >= 1.45) {
    weaknesses.push({
      id: 'weak_defensive_record',
      severity: goalsAgainstPerMatch >= 1.85 ? 'CRITICA' : 'ATENCAO',
      category: 'DESEMPENHO',
      categoryLabel: 'Desempenho na Liga · Sistema Defensivo',
      title: `Vulnerabilidade defensiva alta (${goalsAgainstPerMatch.toFixed(2)} gols sofridos/jogo)`,
      metricSummary: `${myRow?.goalsAgainst || 0} GS em ${played}J`,
      diagnosis: `A equipe sofreu ${myRow?.goalsAgainst} gols em ${played} rodadas. A combinação atual de ${userClub.tactics.mentality} com marcação ${userClub.tactics.marking} está cedendo espaços excessivos.`,
      recommendation:
        'Compacte as linhas com Marcação por Zona ou ajuste a mentalidade/formação para proteger melhor a zaga.',
      actionType: 'OPEN_TACTICS_ADVICE',
      actionLabel: 'Ver Ajustes Defensivos',
    });
  } else if (played >= 3 && goalsForPerMatch <= 0.95) {
    weaknesses.push({
      id: 'weak_offensive_record',
      severity: goalsForPerMatch <= 0.65 ? 'CRITICA' : 'ATENCAO',
      category: 'DESEMPENHO',
      categoryLabel: 'Desempenho na Liga · Produção Ofensiva',
      title: `Baixa conversão ofensiva (${goalsForPerMatch.toFixed(2)} gol marcado/jogo)`,
      metricSummary: `${myRow?.goalsFor || 0} GP em ${played}J`,
      diagnosis: `Apenas ${myRow?.goalsFor} gol(s) em ${played} partidas na liga. O setor ofensivo (${userSectors.attack} OVR) está recebendo pouca aproximação na postura ${userClub.tactics.mentality}.`,
      recommendation:
        'Ajuste o estilo de passe/mentalidade ou teste uma formação com maior presença no terço final.',
      actionType: 'OPEN_TACTICS_ADVICE',
      actionLabel: 'Ver Ajustes Ofensivos',
    });
  }

  // 1F. Expiring Starter Contracts (Bosman Risk)
  if (expiringKeyPlayers.length > 0) {
    weaknesses.push({
      id: 'weak_expiring_contracts',
      severity: expiringKeyPlayers.some((p) => p.isStarter) ? 'CRITICA' : 'ATENCAO',
      category: 'CONTRATOS',
      categoryLabel: 'Patrimônio · Risco de Pré-Contrato',
      title: `${expiringKeyPlayers.length} ${
        expiringKeyPlayers.length === 1 ? 'peça importante em último ano' : 'peças importantes em último ano'
      } de contrato`,
      metricSummary: `${expiringKeyPlayers.length} vínculo(s) ≤ 1 ano`,
      diagnosis: `${expiringKeyPlayers
        .slice(0, 3)
        .map((p) => `${p.name} (${p.overall} OVR)`)
        .join(', ')} pode(m) assinar pré-contrato gratuito com rivais se não houver renovação.`,
      recommendation:
        'Abra a gestão de contratos para renovar os titulares antes do assédio de outros clubes.',
      actionType: 'OPEN_CONTRACTS',
      actionLabel: 'Renovar Contratos Críticos',
    });
  }

  // 1G. Sector Imbalance or Aging Core
  const sectorDiff = Math.abs(userSectors.attack - userSectors.defense);
  const agingSector = roleBreakdown
    .filter((r) => r.count >= 2 && r.avgAge >= 31.2)
    .sort((a, b) => b.avgAge - a.avgAge)[0];

  if (sectorDiff >= 5) {
    const weakerHalf: DetailedRole = userSectors.defense < userSectors.attack ? 'ZAG' : 'ATA';
    weaknesses.push({
      id: 'weak_sector_imbalance',
      severity: 'ATENCAO',
      category: 'TATICA',
      categoryLabel: 'Equilíbrio Setorial',
      title:
        userSectors.defense < userSectors.attack
          ? `Defesa (${userSectors.defense}) destoa da força do Ataque (${userSectors.attack})`
          : `Ataque (${userSectors.attack}) destoa da solidez da Defesa (${userSectors.defense})`,
      metricSummary: `Gap ${sectorDiff} pts OVR`,
      diagnosis: `Há uma assimetria de ${sectorDiff} pontos entre Defesa (${userSectors.defense}), Meio (${userSectors.midfield}) e Ataque (${userSectors.attack}).`,
      recommendation:
        userSectors.defense < userSectors.attack
          ? 'Proteja a linha defensiva com volantes de contenção e priorize defensores na janela.'
          : 'Aumente o suporte criativo do meio-campo e busque um atacante decisivo no mercado.',
      actionType: 'OPEN_MARKET_ROLE',
      actionLabel: `Explorar ${weakerHalf} no Mercado`,
      targetRole: weakerHalf,
    });
  } else if (agingSector) {
    weaknesses.push({
      id: `weak_aging_${agingSector.role}`,
      severity: 'OPORTUNIDADE',
      category: 'ELENCO',
      categoryLabel: 'Planejamento · Curva de Idade',
      title: `Média de idade elevada em ${DETAILED_ROLE_LABELS[agingSector.role]} (${agingSector.avgAge.toFixed(1)} anos)`,
      metricSummary: `${agingSector.avgAge.toFixed(1)} anos médios`,
      diagnosis: `O setor ${agingSector.role} concentra veteranos sujeitos a maior fadiga acumulada e declínio físico ao fim da temporada.`,
      recommendation:
        'Mapeie atletas sub-24 por empréstimo com opção de compra para preparar a sucessão gradual.',
      actionType: 'OPEN_SIGNINGS',
      actionLabel: 'Buscar Sucessores Sub-24',
      targetRole: agingSector.role,
    });
  }

  // ============================================================================
  // 2. SUGESTÕES ESPECÍFICAS DE CONTRATAÇÃO (DADOS REAIS DO SAVE)
  // ============================================================================
  const signingSuggestions: DirectorSigningSuggestion[] = [];
  const usedPlayerIds = new Set<string>();

  for (const rec of aiMarketReport.recommendedSignings) {
    if (signingSuggestions.length >= 6) break;
    if (usedPlayerIds.has(rec.player.id)) continue;
    usedPlayerIds.add(rec.player.id);

    const ref = getStarterReferenceForRole(userClub, rec.player.detailedRole);
    const dealMode: DirectorDealMode = rec.dealMode;
    const fixesShortage = diagnosis.shortageRoles.includes(rec.player.detailedRole);
    const dealModeLabel =
      rec.dealMode === 'FREE_AGENT'
        ? 'Agente Livre · Sem Taxa'
        : rec.dealMode === 'LOAN'
        ? 'Empréstimo Sugerido'
        : rec.dealMode === 'BOSMAN'
        ? 'Pré-Contrato Bosman'
        : 'Compra Definitiva';

    const priority: 'ALTA' | 'MEDIA' | 'OPORTUNIDADE' =
      rec.player.detailedRole === diagnosis.weakestRole || fixesShortage
        ? 'ALTA'
        : rec.upgradeDeltaOvr >= 3
        ? 'ALTA'
        : rec.dealMode === 'FREE_AGENT' || rec.dealMode === 'BOSMAN'
        ? 'OPORTUNIDADE'
        : 'MEDIA';

    signingSuggestions.push({
      id: `dir_ai_${rec.player.id}`,
      player: rec.player,
      sellerClub: rec.sellerClub || null,
      dealMode,
      dealModeLabel,
      priority,
      targetRole: rec.player.detailedRole,
      targetRoleLabel: DETAILED_ROLE_LABELS[rec.player.detailedRole],
      currentStarterName: ref.name,
      currentStarterOvr: ref.ovr,
      upgradeDeltaOvr: rec.player.overall - ref.ovr,
      estimatedFee: rec.suggestedFee,
      estimatedWage: rec.suggestedWage,
      fitsBudget: rec.suggestedFee <= Math.max(0, userClub.finances.balance),
      fixesShortage,
      rationale: rec.aiRationale,
    });
  }

  if (signingSuggestions.length < 4) {
    const extras = buildFallbackSigningsIfNeeded(
      gameState,
      userClub,
      diagnosis,
      usedPlayerIds
    );
    for (const extra of extras) {
      if (signingSuggestions.length >= 6) break;
      signingSuggestions.push(extra);
    }
  }

  // Sort signings so weakestRole / ALTA priority appear first
  const priorityOrder = { ALTA: 0, MEDIA: 1, OPORTUNIDADE: 2 };
  signingSuggestions.sort(
    (a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      b.upgradeDeltaOvr - a.upgradeDeltaOvr
  );

  // ============================================================================
  // 3. SUGESTÕES DE AJUSTES TÁTICOS ESPECÍFICOS (1 CLIQUE)
  // ============================================================================
  const tacticalSuggestions: DirectorTacticalSuggestion[] = [];

  // 3A. Formation Recommendation based on healthy squad specialists
  const formationGain =
    Math.round((bestFormationEval.compositeScore - currentFormationEval.compositeScore) * 10) / 10;
  const naturalDiff = bestFormationEval.naturalFitCount - currentFormationEval.naturalFitCount;

  if (
    bestFormationEval.formation !== userClub.tactics.formation &&
    (formationGain >= 0.45 || naturalDiff >= 1)
  ) {
    tacticalSuggestions.push({
      id: 'tac_formation_upgrade',
      category: 'FORMATION',
      categoryLabel: 'Esquema Tático · Encaixe do Plantel',
      priority: naturalDiff >= 2 || formationGain >= 1.2 ? 'ALTA' : 'MEDIA',
      title: `Mudar esquema do ${userClub.tactics.formation} para ${bestFormationEval.formation}`,
      currentSummary: `${userClub.tactics.formation} (${currentFormationEval.naturalFitCount}/11 na função natural · OVR ${currentFormationEval.avgOverall})`,
      suggestedSummary: `${bestFormationEval.formation} (${bestFormationEval.naturalFitCount}/11 na função natural · OVR ${bestFormationEval.avgOverall})`,
      impactMetric:
        naturalDiff > 0
          ? `+${naturalDiff} titular(es) na posição de origem`
          : `+${(bestFormationEval.avgOverall - currentFormationEval.avgOverall).toFixed(1)} OVR médio`,
      rationale: `Analisando os atletas disponíveis hoje, o ${bestFormationEval.formation} aproveita melhor seus especialistas naturais sem improvisos e maximiza a força coletiva.`,
      tacticsPatch: { formation: bestFormationEval.formation },
      rearrangeOptimalLineup: true,
      alreadyOptimal: false,
      actionLabel: `Adotar ${bestFormationEval.formation} + Escalar XI`,
    });
  } else {
    tacticalSuggestions.push({
      id: 'tac_formation_verified',
      category: 'FORMATION',
      categoryLabel: 'Esquema Tático · Encaixe Validado',
      priority: 'REFINAMENTO',
      title: `Esquema ${userClub.tactics.formation} é o melhor desenho para o elenco atual`,
      currentSummary: `${userClub.tactics.formation} ativo (${currentFormationEval.naturalFitCount}/11 especialistas naturais)`,
      suggestedSummary: `Manter ${userClub.tactics.formation} (OVR médio ${currentFormationEval.avgOverall})`,
      impactMetric: `${currentFormationEval.naturalFitCount}/11 encaixes ideais`,
      rationale: `Entre as 7 formações testadas pelo departamento de análise, o ${userClub.tactics.formation} entrega o maior equilíbrio técnico para as peças saudáveis do plantel.`,
      alreadyOptimal: true,
      actionLabel: 'Esquema Ideal Ativo',
    });
  }

  // 3B. Match Posture: Mentality, Marking & Passing calibrated to Opponent + League Stats
  const isHomeNext = upcomingFixture ? upcomingFixture.homeTeamId === userClub.id : true;
  const oppStrengthDelta = oppSectors ? oppSectors.overall - userSectors.overall : 0;
  const avgStarterCond =
    currentStarters.length > 0
      ? currentStarters.reduce((acc, p) => acc + (p.condition ?? 100), 0) / currentStarters.length
      : 90;

  let targetMentality: TacticalMentality = userClub.tactics.mentality;
  let targetMarking: MarkingStyle = userClub.tactics.marking;
  let targetPassing: PassingStyle = userClub.tactics.passing;
  let postureReason = '';
  let postureTitle = '';

  if (upcomingOpponent && oppSectors && oppStrengthDelta >= 3 && !isHomeNext) {
    targetMentality = 'Defensivo';
    targetMarking = 'Normal';
    targetPassing =
      userSectors.attack >= userSectors.midfield ? 'Longo (Contra-ataque)' : 'Misto';
    postureTitle = `Plano reativo contra ${upcomingOpponent.shortName} fora de casa`;
    postureReason = `O ${upcomingOpponent.name} tem OVR ${oppSectors.overall} (+${oppStrengthDelta} acima do seu) atuando como mandante. Compactar linhas (${targetMentality}) e sair em ${targetPassing} reduz o risco de exposição.`;
  } else if (played >= 3 && goalsAgainstPerMatch >= 1.5) {
    targetMentality = oppStrengthDelta >= 3 ? 'Muito Defensivo' : 'Defensivo';
    targetMarking = 'Normal';
    targetPassing =
      userSectors.midfield >= userSectors.attack ? 'Misto' : 'Longo (Contra-ataque)';
    postureTitle = 'Estancar média alta de gols sofridos na temporada';
    postureReason = `Sua defesa vem sofrendo ${goalsAgainstPerMatch.toFixed(
      2
    )} gols/jogo. Adotar postura ${targetMentality} com marcação ${targetMarking} protege os zagueiros (${userSectors.defense} OVR) e estabiliza a campanha.`;
  } else if (upcomingOpponent && oppSectors && oppStrengthDelta <= -3 && isHomeNext) {
    targetMentality = 'Ofensivo';
    targetMarking = avgStarterCond >= 78 ? 'Pesada' : 'Normal';
    targetPassing =
      userSectors.midfield >= userSectors.attack - 1 ? 'Curto (Posse)' : 'Misto';
    postureTitle = `Imposição ofensiva em casa diante do ${upcomingOpponent.shortName}`;
    postureReason = `Com superioridade técnica (+${Math.abs(oppStrengthDelta)} OVR) e mando de campo contra o ${upcomingOpponent.name}, assumir postura ${targetMentality} maximiza o volume de chances criadas.`;
  } else if (played >= 3 && goalsForPerMatch <= 0.95) {
    targetMentality = 'Ofensivo';
    targetMarking = avgStarterCond >= 78 ? 'Pesada' : 'Normal';
    targetPassing = userSectors.midfield >= userSectors.attack ? 'Curto (Posse)' : 'Misto';
    postureTitle = 'Destravar criação ofensiva da equipe';
    postureReason = `A média atual de ${goalsForPerMatch.toFixed(
      2
    )} gol/jogo exige adiantar linhas (${targetMentality}) e aproximar o setor de meio (${userSectors.midfield} OVR) dos atacantes.`;
  } else {
    // Calibrate optimal neutral/proactive fit according to MF vs FW & squad stamina
    targetMentality =
      upcomingOpponent && isHomeNext && oppStrengthDelta <= -1 ? 'Ofensivo' : 'Equilibrado';
    targetMarking =
      avgStarterCond < 75
        ? 'Leve'
        : userSectors.midfield >= userSectors.defense + 2
        ? 'Pesada'
        : 'Normal';
    targetPassing =
      userSectors.midfield >= userSectors.attack + 1
        ? 'Curto (Posse)'
        : userSectors.attack >= userSectors.midfield + 3
        ? 'Longo (Contra-ataque)'
        : 'Misto';
    postureTitle = upcomingOpponent
      ? `Calibragem tática para encarar o ${upcomingOpponent.shortName}`
      : 'Calibragem de estilo conforme atributos do elenco';
    postureReason =
      avgStarterCond < 75
        ? `Com condicionamento médio dos titulares em ${Math.round(
            avgStarterCond
          )}%, a Marcação Leve preserva fôlego sem abrir mão da organização.`
        : `Alinha mentalidade ${targetMentality}, marcação ${targetMarking} e passe ${targetPassing} ao perfil técnico de Defesa (${userSectors.defense}), Meio (${userSectors.midfield}) e Ataque (${userSectors.attack}).`;
  }

  const postureMatchesCurrent =
    userClub.tactics.mentality === targetMentality &&
    userClub.tactics.marking === targetMarking &&
    userClub.tactics.passing === targetPassing;

  tacticalSuggestions.push({
    id: 'tac_posture_matchplan',
    category: 'POSTURE',
    categoryLabel: upcomingOpponent
      ? `Plano de Jogo · vs ${upcomingOpponent.shortName}`
      : 'Modelo de Jogo · Postura & Estilo',
    priority:
      !postureMatchesCurrent &&
      ((played >= 3 && (goalsAgainstPerMatch >= 1.5 || goalsForPerMatch <= 0.95)) ||
        Math.abs(oppStrengthDelta) >= 3)
        ? 'ALTA'
        : postureMatchesCurrent
        ? 'REFINAMENTO'
        : 'MEDIA',
    title: postureTitle,
    currentSummary: `${userClub.tactics.mentality} · ${userClub.tactics.marking} · Passe ${userClub.tactics.passing}`,
    suggestedSummary: `${targetMentality} · ${targetMarking} · Passe ${targetPassing}`,
    impactMetric: upcomingOpponent
      ? `${isHomeNext ? 'Mandante' : 'Visitante'} · Δ ${
          oppStrengthDelta > 0 ? `-${oppStrengthDelta}` : `+${Math.abs(oppStrengthDelta)}`
        } OVR`
      : `DEF ${userSectors.defense} · MEI ${userSectors.midfield} · ATA ${userSectors.attack}`,
    rationale: postureReason,
    tacticsPatch: {
      mentality: targetMentality,
      marking: targetMarking,
      passing: targetPassing,
    },
    alreadyOptimal: postureMatchesCurrent,
    actionLabel: postureMatchesCurrent ? 'Postura Já Aplicada' : 'Aplicar Plano de Jogo',
  });

  // 3C. Optimal Starting XI & Physical Rotation
  const curAvgOvr =
    currentStarters.length > 0
      ? Math.round(currentStarters.reduce((acc, p) => acc + p.overall, 0) / currentStarters.length)
      : 0;
  const curAvgCond =
    currentStarters.length > 0
      ? Math.round(
          currentStarters.reduce((acc, p) => acc + (p.condition ?? 100), 0) / currentStarters.length
        )
      : 100;

  if (optimalLineupPreview.startersChangedCount > 0 || unavailableStarters.length > 0) {
    const enteredPreview = optimalLineupPreview.enteredStarterNames.slice(0, 3).join(', ');
    tacticalSuggestions.push({
      id: 'tac_optimal_lineup',
      category: 'LINEUP_ROTATION',
      categoryLabel: 'Escalação · Prontidão & Força',
      priority:
        unavailableStarters.length > 0 || optimalLineupPreview.restedFatiguedNames.length >= 2
          ? 'ALTA'
          : 'MEDIA',
      title: `Promover ${optimalLineupPreview.startersChangedCount} ${
        optimalLineupPreview.startersChangedCount === 1 ? 'ajuste pontual' : 'ajustes'
      } nos 11 titulares`,
      currentSummary: `XI Atual: OVR ${curAvgOvr} · Físico ${curAvgCond}%${
        unavailableStarters.length > 0 ? ` · ${unavailableStarters.length} baixa(s)` : ''
      }`,
      suggestedSummary: `XI Ideal: OVR ${optimalLineupPreview.avgOverall} · Físico ${optimalLineupPreview.avgCondition}% (Entram: ${enteredPreview})`,
      impactMetric: `Físico ${curAvgCond}% → ${optimalLineupPreview.avgCondition}%`,
      rationale:
        unavailableStarters.length > 0
          ? `Substitui imediatamente os atletas vetados por lesão/suspensão e posiciona cada titular em sua função ideal.`
          : optimalLineupPreview.restedFatiguedNames.length > 0
          ? `Poupa ${optimalLineupPreview.restedFatiguedNames.slice(0, 2).join(', ')} do desgaste excessivo e promove atletas mais inteiros fisicamente.`
          : `Há atletas no banco/reservas com maior índice combinado de Overall, moral e encaixe tático no ${userClub.tactics.formation}.`,
      rearrangeOptimalLineup: true,
      alreadyOptimal: false,
      actionLabel: 'Escalar 11 Ideais Agora',
    });
  }

  // 3D. Set-Piece Specialists & Captaincy Audit
  if (currentStarters.length >= 11) {
    const starterSet = new Set(currentStarters.map((p) => p.id));
    const optimalSpecs = pickOptimalSetPieceTakers(currentStarters);

    const curCap = currentStarters.find((p) => p.id === userClub.tactics.captainId);
    const optCap = currentStarters.find((p) => p.id === optimalSpecs.captainId);
    const curPen = currentStarters.find((p) => p.id === userClub.tactics.penaltyTakerId);
    const optPen = currentStarters.find((p) => p.id === optimalSpecs.penaltyTakerId);
    const curFk = currentStarters.find((p) => p.id === userClub.tactics.freekickTakerId);
    const optFk = currentStarters.find((p) => p.id === optimalSpecs.freekickTakerId);
    const curCor = currentStarters.find((p) => p.id === userClub.tactics.cornerTakerId);
    const optCor = currentStarters.find((p) => p.id === optimalSpecs.cornerTakerId);

    const missingOnPitch =
      !userClub.tactics.captainId ||
      !starterSet.has(userClub.tactics.captainId) ||
      !userClub.tactics.penaltyTakerId ||
      !starterSet.has(userClub.tactics.penaltyTakerId) ||
      !userClub.tactics.freekickTakerId ||
      !starterSet.has(userClub.tactics.freekickTakerId) ||
      !userClub.tactics.cornerTakerId ||
      !starterSet.has(userClub.tactics.cornerTakerId);

    const penGain =
      optPen && curPen ? computePenaltySkillScore(optPen) - computePenaltySkillScore(curPen) : 0;
    const fkGain =
      optFk && curFk ? computeFreekickSkillScore(optFk) - computeFreekickSkillScore(curFk) : 0;
    const capGain =
      optCap && curCap
        ? computeCaptainLeadershipScore(optCap) - computeCaptainLeadershipScore(curCap)
        : 0;
    const corGain =
      optCor && curCor ? computeCornerSkillScore(optCor) - computeCornerSkillScore(curCor) : 0;

    if (missingOnPitch || penGain >= 4 || fkGain >= 4 || capGain >= 5 || corGain >= 5) {
      tacticalSuggestions.push({
        id: 'tac_set_pieces',
        category: 'SET_PIECES',
        categoryLabel: 'Bolas Paradas & Liderança',
        priority: missingOnPitch || penGain >= 6 ? 'MEDIA' : 'REFINAMENTO',
        title: 'Otimizar Capitão e Cobradores Oficiais entre os titulares',
        currentSummary: missingOnPitch
          ? 'Há funções sem titular em campo definido nas bolas paradas'
          : `Pênalti: ${curPen?.name || 'Indef.'} · Falta: ${curFk?.name || 'Indef.'}`,
        suggestedSummary: `Cap: ${optCap?.name || '-'} · Pên: ${optPen?.name || '-'} · Falta: ${
          optFk?.name || '-'
        }`,
        impactMetric: missingOnPitch
          ? '4/4 titulares definidos'
          : `+${Math.max(penGain, fkGain, capGain, corGain)} pts de precisão`,
        rationale:
          'Definir os especialistas mais técnicos entre os 11 em campo eleva diretamente a taxa de conversão de pênaltis, faltas frontais e escanteios.',
        tacticsPatch: {
          captainId: optimalSpecs.captainId,
          penaltyTakerId: optimalSpecs.penaltyTakerId,
          freekickTakerId: optimalSpecs.freekickTakerId,
          cornerTakerId: optimalSpecs.cornerTakerId,
        },
        alreadyOptimal: false,
        actionLabel: 'Designar Cobradores Ideais',
      });
    }
  }

  // ============================================================================
  // 4. SCORE DE SAÚDE DO ELENCO & RESUMO EXECUTIVO
  // ============================================================================
  let squadHealthScore = 86;
  squadHealthScore -= unavailableStarters.length * 9;
  squadHealthScore -= Math.min(14, fatiguedStarters.length * 3.5);
  squadHealthScore -= diagnosis.shortageRoles.length * 6;
  squadHealthScore -= Math.max(0, Math.round((weakestGap - 1) * 3));
  squadHealthScore -= Math.min(10, expiringKeyPlayers.length * 3);
  if (!postureMatchesCurrent) squadHealthScore -= 3;
  squadHealthScore = Math.max(35, Math.min(98, Math.round(squadHealthScore)));

  const criticalCount = weaknesses.filter((w) => w.severity === 'CRITICA').length;
  const actionableTacCount = tacticalSuggestions.filter((t) => !t.alreadyOptimal).length;

  const executiveHeadline =
    criticalCount > 0
      ? `${criticalCount} ${
          criticalCount === 1 ? 'ponto crítico exige' : 'pontos críticos exigem'
        } intervenção antes da sequência da temporada`
      : actionableTacCount > 0
      ? `Base competitiva sólida, com ${actionableTacCount} ${
          actionableTacCount === 1 ? 'ajuste tático recomendado' : 'ajustes táticos recomendados'
        } e alvos mapeados`
      : `Elenco alinhado taticamente (OVR ${diagnosis.avgStarterOverall}) · Foco em oportunidades pontuais de mercado`;

  const rankPhrase =
    rankIdx >= 0 && played > 0
      ? `Na ${rankIdx + 1}ª colocação (${played}J · ${goalsForPerMatch.toFixed(
          2
        )} GP/j · ${goalsAgainstPerMatch.toFixed(2)} GS/j), `
      : 'Neste momento da temporada, ';

  const executiveSummary = `${rankPhrase}nosso diagnóstico aponta ${
    DETAILED_ROLE_LABELS[diagnosis.weakestRole]
  } como principal foco de evolução (${diagnosis.weakestRoleAvgOvr} OVR vs ${
    diagnosis.avgStarterOverall
  } da equipe)${
    signingSuggestions[0]
      ? `, tendo ${signingSuggestions[0].player.name} (${signingSuggestions[0].player.overall} OVR) como alvo prioritário`
      : ''
  }.`;

  return {
    squadHealthScore,
    diagnosis,
    roleBreakdown,
    weakestRoleLabel: DETAILED_ROLE_LABELS[diagnosis.weakestRole],
    bestFormationEval,
    currentFormationEval,
    optimalLineupPreview,
    leagueContext: {
      played,
      rank: rankIdx >= 0 ? rankIdx + 1 : null,
      totalTeams: standings.length,
      goalsForPerMatch,
      goalsAgainstPerMatch,
      points: myRow?.points || 0,
    },
    executiveHeadline,
    executiveSummary,
    weaknesses,
    signingSuggestions,
    tacticalSuggestions,
  };
}

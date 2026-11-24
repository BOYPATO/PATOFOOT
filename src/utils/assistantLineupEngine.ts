import {
  AssistantLineupMode,
  Club,
  CompetitionType,
  DetailedRole,
  FormationType,
  Player,
  TacticalSettings,
} from '../types/game';
import { isPlayerSuspendedInCompetition } from './suspensionEngine';
import { pickOptimalSetPieceTakers } from './matchExperienceEngine';
import {
  evaluatePlayerSlotFit,
  FORMATION_PITCH_SLOTS,
} from './tacticalPositioningEngine';

const MAX_BENCH_PLAYERS = 11;

interface FormationSlotRole {
  slotIndex: number;
  role: DetailedRole;
  code: string;
}

export const FORMATION_SLOT_ROLES: Record<FormationType, FormationSlotRole[]> = Object.fromEntries(
  (Object.keys(FORMATION_PITCH_SLOTS) as FormationType[]).map((fmt) => [
    fmt,
    FORMATION_PITCH_SLOTS[fmt].map((s) => ({
      slotIndex: s.slotIndex,
      role: s.role,
      code: s.code,
    })),
  ])
) as Record<FormationType, FormationSlotRole[]>;

function getRoleAdaptationPenalty(
  player: Player,
  targetRole: DetailedRole,
  targetCode?: string
): number {
  const fit = evaluatePlayerSlotFit(player, targetRole, targetCode);
  if (fit.status === 'CRITICAL_MISMATCH') {
    return 65; // Guard against assigning GK outfield or outfielder in goal unless no alternatives exist
  }
  return fit.overallPenalty;
}

/**
 * Computes a player's match-readiness score combining Overall, Physical Condition (0-100%),
 * Morale, and Tactical Role compatibility according to the Assistant Coach's selected mode.
 */
export function computeAssistantMatchReadiness(
  player: Player,
  targetRole?: DetailedRole,
  mode: AssistantLineupMode = 'EQUILIBRADO',
  targetCode?: string
): number {
  const cond = Math.max(0, Math.min(100, player.condition ?? 100));
  let score = player.overall;

  if (mode === 'FORCA_MAXIMA') {
    score += (cond - 80) * 0.14;
    if (cond < 58) {
      score -= (58 - cond) * 0.55;
    }
  } else if (mode === 'POUPAR_FADIGA') {
    score += (cond - 80) * 0.48;
    if (cond < 80) {
      score -= (80 - cond) * 0.55;
    }
    if (cond < 62) {
      score -= 10;
    }
  } else {
    // EQUILIBRADO (Default): balances Overall and Physical Condition
    score += (cond - 80) * 0.3;
    if (cond < 72) {
      score -= (72 - cond) * 0.45;
    }
    if (cond < 55) {
      score -= 11;
    }
  }

  if (player.morale === 'Excelente') score += 0.8;
  else if (player.morale === 'Boa') score += 0.3;
  else if (player.morale === 'Baixa') score -= 0.4;
  else if (player.morale === 'Péssima') score -= 0.9;

  if (targetRole) {
    score -= getRoleAdaptationPenalty(player, targetRole, targetCode);
    // Subtle specialist tiebreaker (not an OVR penalty): prefers natural primary role when ratings are close,
    // while still allowing zero-penalty sector versatile players (e.g. ZAG->LAT, VOL->MC) when stronger or covering absences.
    if (player.detailedRole === targetRole) {
      score += 1.4;
    }
  }

  return Math.round(score * 100) / 100;
}

export function isPlayerAvailableForMatch(
  player: Player,
  upcomingCompetition?: CompetitionType
): boolean {
  if (player.injuryWeeks > 0 || Boolean(player.injuryDetails)) {
    return false;
  }
  const suspended = upcomingCompetition
    ? isPlayerSuspendedInCompetition(player, upcomingCompetition)
    : isPlayerSuspendedInCompetition(player);
  return !suspended;
}

export interface AssistantLineupResult {
  updatedSquad: Player[];
  updatedTactics: TacticalSettings;
  starters: Player[];
  substitutes: Player[];
  avgOverall: number;
  avgCondition: number;
  startersChangedCount: number;
  enteredStarterNames: string[];
  restedFatiguedNames: string[];
  unavailableCount: number;
  summaryText: string;
}

/**
 * Configures the optimal 11 starters + 11 bench substitutes + valid Captain & Set-Piece Takers
 * based on physical condition (forma física), overall, tactical formation, injuries, and suspensions.
 */
export function buildAssistantOptimalLineup(
  club: Club,
  upcomingCompetition?: CompetitionType,
  overrideTactics?: TacticalSettings
): AssistantLineupResult {
  const baseTactics = overrideTactics || club.tactics;
  const formation = baseTactics.formation || '4-3-3';
  const mode: AssistantLineupMode = baseTactics.autoLineupMode || 'EQUILIBRADO';
  const slots = FORMATION_SLOT_ROLES[formation] || FORMATION_SLOT_ROLES['4-3-3'];
  const formationChanged = club.tactics.formation !== formation;

  const eligiblePool = club.squad.filter((p) =>
    isPlayerAvailableForMatch(p, upcomingCompetition)
  );
  const unavailableCount = club.squad.length - eligiblePool.length;

  const candidatePool = eligiblePool.length >= 11 ? eligiblePool : [...club.squad];
  const assignedStarterIds = new Set<string>();
  const slotToPlayer = new Map<number, Player>();

  // Assign slot 0 (GK) first, then assign remaining outfield slots by highest natural fit
  const gkSlot = slots[0];
  const sortedForGk = [...candidatePool].sort(
    (a, b) =>
      computeAssistantMatchReadiness(b, gkSlot.role, mode, gkSlot.code) -
      computeAssistantMatchReadiness(a, gkSlot.role, mode, gkSlot.code)
  );
  if (sortedForGk[0]) {
    slotToPlayer.set(gkSlot.slotIndex, sortedForGk[0]);
    assignedStarterIds.add(sortedForGk[0].id);
  }

  // Outfield slots: prioritize slots with fewer primary specialists first, then fewer zero-penalty versatile options
  const outfieldSlots = slots.slice(1).sort((a, b) => {
    const exactA = candidatePool.filter(
      (p) => !assignedStarterIds.has(p.id) && p.detailedRole === a.role
    ).length;
    const exactB = candidatePool.filter(
      (p) => !assignedStarterIds.has(p.id) && p.detailedRole === b.role
    ).length;
    if (exactA !== exactB) return exactA - exactB;

    const countA = candidatePool.filter(
      (p) =>
        !assignedStarterIds.has(p.id) &&
        evaluatePlayerSlotFit(p, a.role, a.code).overallPenalty === 0
    ).length;
    const countB = candidatePool.filter(
      (p) =>
        !assignedStarterIds.has(p.id) &&
        evaluatePlayerSlotFit(p, b.role, b.code).overallPenalty === 0
    ).length;
    return countA - countB || a.slotIndex - b.slotIndex;
  });

  for (const slot of outfieldSlots) {
    const bestCandidate = [...candidatePool]
      .filter((p) => !assignedStarterIds.has(p.id))
      .sort((a, b) => {
        const diff =
          computeAssistantMatchReadiness(b, slot.role, mode, slot.code) -
          computeAssistantMatchReadiness(a, slot.role, mode, slot.code);
        if (Math.abs(diff) > 0.01) return diff;
        return b.overall - a.overall || b.condition - a.condition;
      })[0];

    if (bestCandidate) {
      slotToPlayer.set(slot.slotIndex, bestCandidate);
      assignedStarterIds.add(bestCandidate.id);
    }
  }

  // Build balanced 11-player bench from remaining eligible players
  const remainingEligible = eligiblePool
    .filter((p) => !assignedStarterIds.has(p.id))
    .sort(
      (a, b) =>
        computeAssistantMatchReadiness(b, b.detailedRole, mode) -
        computeAssistantMatchReadiness(a, a.detailedRole, mode)
    );

  const benchIds = new Set<string>();

  const pickBenchByFilter = (predicate: (p: Player) => boolean, count: number) => {
    let added = 0;
    for (const p of remainingEligible) {
      if (added >= count || benchIds.size >= MAX_BENCH_PLAYERS) break;
      if (!benchIds.has(p.id) && predicate(p)) {
        benchIds.add(p.id);
        added++;
      }
    }
  };

  // Ensure positional bench coverage: 1 GK, 2 DF, 2 MF, 2 FW, then best overall/condition up to 11
  pickBenchByFilter((p) => p.position === 'GK', 1);
  pickBenchByFilter((p) => p.position === 'DF', 2);
  pickBenchByFilter((p) => p.position === 'MF', 2);
  pickBenchByFilter((p) => p.position === 'FW', 2);
  pickBenchByFilter(() => true, MAX_BENCH_PLAYERS);

  const prevStarterIds = new Set(club.squad.filter((p) => p.isStarter).map((p) => p.id));

  const updatedSquad: Player[] = club.squad.map((p) => {
    let assignedSlot: number | undefined = undefined;
    for (const [slotIdx, chosen] of slotToPlayer.entries()) {
      if (chosen.id === p.id) {
        assignedSlot = slotIdx;
        break;
      }
    }

    if (assignedSlot !== undefined) {
      const keptExactSameSlot = !formationChanged && p.isStarter && p.pitchSlot === assignedSlot;
      return {
        ...p,
        isStarter: true,
        isSubstitute: false,
        pitchSlot: assignedSlot,
        pitchX: keptExactSameSlot ? p.pitchX : undefined,
        pitchY: keptExactSameSlot ? p.pitchY : undefined,
        pitchRoleCode: keptExactSameSlot ? p.pitchRoleCode : undefined,
      };
    }

    return {
      ...p,
      isStarter: false,
      isSubstitute: benchIds.has(p.id),
      pitchSlot: undefined,
      pitchX: undefined,
      pitchY: undefined,
      pitchRoleCode: undefined,
    };
  });

  const newStarters = updatedSquad.filter((p) => p.isStarter);
  const newSubstitutes = updatedSquad.filter((p) => !p.isStarter && p.isSubstitute);
  const newStarterIds = new Set(newStarters.map((p) => p.id));

  const enteredStarterNames = newStarters
    .filter((p) => !prevStarterIds.has(p.id))
    .map((p) => p.name);

  const fatigueThreshold = mode === 'POUPAR_FADIGA' ? 80 : mode === 'FORCA_MAXIMA' ? 60 : 72;
  const restedFatiguedNames = club.squad
    .filter(
      (p) =>
        prevStarterIds.has(p.id) &&
        !newStarterIds.has(p.id) &&
        isPlayerAvailableForMatch(p, upcomingCompetition) &&
        p.condition < fatigueThreshold
    )
    .map((p) => p.name);

  // Refresh captain & set-piece takers if any assigned specialist was rotated out of the XI
  const optimalSetPieces = pickOptimalSetPieceTakers(newStarters);
  const updatedTactics: TacticalSettings = {
    ...baseTactics,
    formation,
    captainId:
      baseTactics.captainId && newStarterIds.has(baseTactics.captainId)
        ? baseTactics.captainId
        : optimalSetPieces.captainId,
    penaltyTakerId:
      baseTactics.penaltyTakerId && newStarterIds.has(baseTactics.penaltyTakerId)
        ? baseTactics.penaltyTakerId
        : optimalSetPieces.penaltyTakerId,
    freekickTakerId:
      baseTactics.freekickTakerId && newStarterIds.has(baseTactics.freekickTakerId)
        ? baseTactics.freekickTakerId
        : optimalSetPieces.freekickTakerId,
    cornerTakerId:
      baseTactics.cornerTakerId && newStarterIds.has(baseTactics.cornerTakerId)
        ? baseTactics.cornerTakerId
        : optimalSetPieces.cornerTakerId,
  };

  const avgOverall =
    newStarters.length > 0
      ? Math.round(
          newStarters.reduce((acc, p) => {
            const slotObj = p.pitchSlot !== undefined ? slots[p.pitchSlot] : undefined;
            const effOvr = slotObj
              ? evaluatePlayerSlotFit(p, slotObj.role, slotObj.code).effectiveOverall
              : p.overall;
            return acc + effOvr;
          }, 0) / newStarters.length
        )
      : 0;
  const avgCondition =
    newStarters.length > 0
      ? Math.round(newStarters.reduce((acc, p) => acc + p.condition, 0) / newStarters.length)
      : 100;

  const startersChangedCount = enteredStarterNames.length;
  const summaryText =
    startersChangedCount === 0
      ? `Os 11 titulares atuais já formam a melhor escalação no ${formation} (OVR ${avgOverall} · Físico ${avgCondition}%).`
      : `Escalação ajustada no ${formation}: ${startersChangedCount} ${
          startersChangedCount === 1 ? 'mudança promovida' : 'mudanças promovidas'
        } pelo Assistente IA (OVR ${avgOverall} · Físico ${avgCondition}%).`;

  return {
    updatedSquad,
    updatedTactics,
    starters: newStarters,
    substitutes: newSubstitutes,
    avgOverall,
    avgCondition,
    startersChangedCount,
    enteredStarterNames,
    restedFatiguedNames,
    unavailableCount,
    summaryText,
  };
}

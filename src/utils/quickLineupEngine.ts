import {
  Club,
  CompetitionType,
  Player,
  SavedLineupProfile,
  TacticalSettings,
} from '../types/game';
import {
  computeAssistantMatchReadiness,
  FORMATION_SLOT_ROLES,
  isPlayerAvailableForMatch,
} from './assistantLineupEngine';
import { isPlayerSuspendedInCompetition } from './suspensionEngine';
import { evaluatePlayerSlotFit } from './tacticalPositioningEngine';
import { pickOptimalSetPieceTakers } from './matchExperienceEngine';

const MAX_BENCH_PLAYERS = 11;

export interface PreMatchReadinessReport {
  injuredStarters: Player[];
  suspendedStarters: Player[];
  fatiguedStarters: Player[];
  tiredStarters75: Player[];
  penduradosStarters: Player[];
  avgStarterCondition: number;
  unavailableCount: number;
  hasAlerts: boolean;
}

export function inspectPreMatchReadiness(
  club: Club,
  upcomingCompetition?: CompetitionType
): PreMatchReadinessReport {
  const starters = club.squad.filter((p) => p.isStarter);
  const injuredStarters: Player[] = [];
  const suspendedStarters: Player[] = [];
  const fatiguedStarters: Player[] = [];
  const tiredStarters75: Player[] = [];
  const penduradosStarters: Player[] = [];

  for (const p of starters) {
    const isInj = p.injuryWeeks > 0 || Boolean(p.injuryDetails);
    const isSusp = upcomingCompetition
      ? isPlayerSuspendedInCompetition(p, upcomingCompetition)
      : isPlayerSuspendedInCompetition(p);

    if (isInj) {
      injuredStarters.push(p);
    } else if (isSusp) {
      suspendedStarters.push(p);
    } else {
      const cond = Math.round(p.condition ?? 100);
      if (cond < 68) fatiguedStarters.push(p);
      if (cond < 75) tiredStarters75.push(p);
      const compYellows = upcomingCompetition
        ? p.competitionYellowCards?.[upcomingCompetition] || 0
        : 0;
      if (compYellows === 2) {
        penduradosStarters.push(p);
      }
    }
  }

  const avgStarterCondition =
    starters.length > 0
      ? Math.round(
          starters.reduce((acc, p) => acc + Math.max(0, Math.min(100, p.condition ?? 100)), 0) /
            starters.length
        )
      : 100;

  const unavailableCount = injuredStarters.length + suspendedStarters.length;
  const hasAlerts = unavailableCount > 0 || fatiguedStarters.length > 0;

  return {
    injuredStarters,
    suspendedStarters,
    fatiguedStarters,
    tiredStarters75,
    penduradosStarters,
    avgStarterCondition,
    unavailableCount,
    hasAlerts,
  };
}

function rebuildBalancedBench(
  squad: Player[],
  starterIds: Set<string>,
  upcomingCompetition?: CompetitionType,
  preferredBenchIds?: Set<string>
): Set<string> {
  const eligible = squad
    .filter((p) => !starterIds.has(p.id) && isPlayerAvailableForMatch(p, upcomingCompetition))
    .sort((a, b) => {
      const prefA = preferredBenchIds?.has(a.id) ? 12 : 0;
      const prefB = preferredBenchIds?.has(b.id) ? 12 : 0;
      const scoreA = prefA + a.overall * 0.75 + (a.condition ?? 100) * 0.25;
      const scoreB = prefB + b.overall * 0.75 + (b.condition ?? 100) * 0.25;
      return scoreB - scoreA;
    });

  const benchIds = new Set<string>();
  const pick = (pred: (p: Player) => boolean, count: number) => {
    let added = 0;
    for (const p of eligible) {
      if (added >= count || benchIds.size >= MAX_BENCH_PLAYERS) break;
      if (!benchIds.has(p.id) && pred(p)) {
        benchIds.add(p.id);
        added++;
      }
    }
  };

  pick((p) => p.position === 'GK', 1);
  pick((p) => p.position === 'DF', 2);
  pick((p) => p.position === 'MF', 2);
  pick((p) => p.position === 'FW', 2);
  pick(() => true, MAX_BENCH_PLAYERS);

  return benchIds;
}

function resolveStarterSlotMap(club: Club): Map<number, Player> {
  const starters = club.squad.filter((p) => p.isStarter);
  const slotMap = new Map<number, Player>();
  const unassigned: Player[] = [];

  for (const p of starters) {
    if (
      p.pitchSlot !== undefined &&
      p.pitchSlot >= 0 &&
      p.pitchSlot <= 10 &&
      !slotMap.has(p.pitchSlot)
    ) {
      slotMap.set(p.pitchSlot, p);
    } else {
      unassigned.push(p);
    }
  }

  for (const p of unassigned) {
    for (let s = 0; s <= 10; s++) {
      if (!slotMap.has(s)) {
        slotMap.set(s, p);
        break;
      }
    }
  }
  return slotMap;
}

function syncTacticsWithStarters(
  baseTactics: TacticalSettings,
  starters: Player[]
): TacticalSettings {
  const starterIds = new Set(starters.map((p) => p.id));
  const optimalSetPieces = pickOptimalSetPieceTakers(starters);
  return {
    ...baseTactics,
    captainId:
      baseTactics.captainId && starterIds.has(baseTactics.captainId)
        ? baseTactics.captainId
        : optimalSetPieces.captainId,
    penaltyTakerId:
      baseTactics.penaltyTakerId && starterIds.has(baseTactics.penaltyTakerId)
        ? baseTactics.penaltyTakerId
        : optimalSetPieces.penaltyTakerId,
    freekickTakerId:
      baseTactics.freekickTakerId && starterIds.has(baseTactics.freekickTakerId)
        ? baseTactics.freekickTakerId
        : optimalSetPieces.freekickTakerId,
    cornerTakerId:
      baseTactics.cornerTakerId && starterIds.has(baseTactics.cornerTakerId)
        ? baseTactics.cornerTakerId
        : optimalSetPieces.cornerTakerId,
  };
}

export interface QuickLineupActionResult {
  updatedSquad: Player[];
  updatedTactics: TacticalSettings;
  swappedCount: number;
  swappedOutNames: string[];
  swappedInNames: string[];
  avgCondition: number;
  summaryText: string;
}

/**
 * 1-Click Fix Unavailable: replaces ONLY injured or competition-suspended starters
 * with the best available reserve for each slot, keeping the rest of the XI untouched.
 */
export function buildFixedUnavailableLineup(
  club: Club,
  upcomingCompetition?: CompetitionType
): QuickLineupActionResult {
  const formation = club.tactics.formation || '4-3-3';
  const slots = FORMATION_SLOT_ROLES[formation] || FORMATION_SLOT_ROLES['4-3-3'];
  const slotMap = resolveStarterSlotMap(club);

  const keptStarterIds = new Set<string>();
  const slotsToReplace: Array<{ slotIdx: number; prevPlayer: Player }> = [];

  for (let slotIdx = 0; slotIdx < 11; slotIdx++) {
    const starter = slotMap.get(slotIdx);
    if (!starter) continue;
    if (isPlayerAvailableForMatch(starter, upcomingCompetition)) {
      keptStarterIds.add(starter.id);
    } else {
      slotsToReplace.push({ slotIdx, prevPlayer: starter });
    }
  }

  const swappedOutNames: string[] = [];
  const swappedInNames: string[] = [];
  const usedIds = new Set<string>(keptStarterIds);

  for (const { slotIdx, prevPlayer } of slotsToReplace) {
    const slotMeta = slots[slotIdx] || slots[0];
    const candidates = club.squad
      .filter(
        (p) =>
          !usedIds.has(p.id) &&
          p.id !== prevPlayer.id &&
          isPlayerAvailableForMatch(p, upcomingCompetition)
      )
      .sort((a, b) => {
        const scoreB = computeAssistantMatchReadiness(b, slotMeta.role, 'EQUILIBRADO', slotMeta.code);
        const scoreA = computeAssistantMatchReadiness(a, slotMeta.role, 'EQUILIBRADO', slotMeta.code);
        return scoreB - scoreA;
      });

    const replacement = candidates[0];
    if (replacement) {
      slotMap.set(slotIdx, replacement);
      usedIds.add(replacement.id);
      swappedOutNames.push(prevPlayer.name);
      swappedInNames.push(replacement.name);
    } else {
      usedIds.add(prevPlayer.id);
    }
  }

  const finalStarterSlotById = new Map<string, number>();
  for (const [slotIdx, p] of slotMap.entries()) {
    finalStarterSlotById.set(p.id, slotIdx);
  }
  const finalStarterIds = new Set(finalStarterSlotById.keys());
  const prevBenchIds = new Set(club.squad.filter((p) => !p.isStarter && p.isSubstitute).map((p) => p.id));
  const nextBenchIds = rebuildBalancedBench(club.squad, finalStarterIds, upcomingCompetition, prevBenchIds);

  const updatedSquad = club.squad.map((p) => {
    const assignedSlot = finalStarterSlotById.get(p.id);
    if (assignedSlot !== undefined) {
      const keptSlot = p.isStarter && p.pitchSlot === assignedSlot;
      return {
        ...p,
        isStarter: true,
        isSubstitute: false,
        pitchSlot: assignedSlot,
        pitchX: keptSlot ? p.pitchX : undefined,
        pitchY: keptSlot ? p.pitchY : undefined,
        pitchRoleCode: keptSlot ? p.pitchRoleCode : undefined,
      };
    }
    return {
      ...p,
      isStarter: false,
      isSubstitute: nextBenchIds.has(p.id),
      pitchSlot: undefined,
      pitchX: undefined,
      pitchY: undefined,
      pitchRoleCode: undefined,
    };
  });

  const finalStarters = updatedSquad.filter((p) => p.isStarter);
  const avgCondition =
    finalStarters.length > 0
      ? Math.round(finalStarters.reduce((acc, p) => acc + (p.condition ?? 100), 0) / finalStarters.length)
      : 100;
  const updatedTactics = syncTacticsWithStarters(club.tactics, finalStarters);

  const summaryText =
    swappedOutNames.length === 0
      ? 'Todos os 11 titulares já estão aptos e disponíveis para a próxima partida.'
      : `${swappedOutNames.length} ${
          swappedOutNames.length === 1 ? 'indisponível substituído' : 'indisponíveis substituídos'
        } automaticamente (${swappedInNames.join(', ')}). Físico XI: ${avgCondition}%.`;

  return {
    updatedSquad,
    updatedTactics,
    swappedCount: swappedOutNames.length,
    swappedOutNames,
    swappedInNames,
    avgCondition,
    summaryText,
  };
}

/**
 * 1-Click Rotate Fatigued (<75%): fixes any injured/suspended starters AND swaps out
 * fatigued starters (condition < fatigueThreshold) for rested, position-matched reserves.
 */
export function buildRotatedRestedLineup(
  club: Club,
  upcomingCompetition?: CompetitionType,
  fatigueThreshold = 75
): QuickLineupActionResult {
  const formation = club.tactics.formation || '4-3-3';
  const slots = FORMATION_SLOT_ROLES[formation] || FORMATION_SLOT_ROLES['4-3-3'];
  const slotMap = resolveStarterSlotMap(club);

  const keptStarterIds = new Set<string>();
  const slotsToRotate: Array<{ slotIdx: number; prevPlayer: Player; mustReplace: boolean }> = [];

  for (let slotIdx = 0; slotIdx < 11; slotIdx++) {
    const starter = slotMap.get(slotIdx);
    if (!starter) continue;
    const available = isPlayerAvailableForMatch(starter, upcomingCompetition);
    const cond = Math.round(starter.condition ?? 100);
    if (!available) {
      slotsToRotate.push({ slotIdx, prevPlayer: starter, mustReplace: true });
    } else if (cond < fatigueThreshold) {
      slotsToRotate.push({ slotIdx, prevPlayer: starter, mustReplace: false });
    } else {
      keptStarterIds.add(starter.id);
    }
  }

  const swappedOutNames: string[] = [];
  const swappedInNames: string[] = [];
  const usedIds = new Set<string>(keptStarterIds);

  // Process mandatory replacements (injured/suspended) first, then most fatigued
  slotsToRotate.sort((a, b) => {
    if (a.mustReplace !== b.mustReplace) return a.mustReplace ? -1 : 1;
    return (a.prevPlayer.condition ?? 100) - (b.prevPlayer.condition ?? 100);
  });

  for (const { slotIdx, prevPlayer, mustReplace } of slotsToRotate) {
    const slotMeta = slots[slotIdx] || slots[0];
    const prevCond = Math.round(prevPlayer.condition ?? 100);

    const candidates = club.squad
      .filter((p) => {
        if (usedIds.has(p.id) || p.id === prevPlayer.id) return false;
        if (!isPlayerAvailableForMatch(p, upcomingCompetition)) return false;
        const fit = evaluatePlayerSlotFit(p, slotMeta.role, slotMeta.code);
        if (!mustReplace && fit.status === 'CRITICAL_MISMATCH') return false;
        if (!mustReplace) {
          const candCond = Math.round(p.condition ?? 100);
          // Only swap a fatigued starter if the replacement is meaningfully fresher
          if (candCond < Math.min(fatigueThreshold, prevCond + 10)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const scoreB = computeAssistantMatchReadiness(b, slotMeta.role, 'POUPAR_FADIGA', slotMeta.code);
        const scoreA = computeAssistantMatchReadiness(a, slotMeta.role, 'POUPAR_FADIGA', slotMeta.code);
        return scoreB - scoreA;
      });

    const replacement = candidates[0];
    if (replacement) {
      slotMap.set(slotIdx, replacement);
      usedIds.add(replacement.id);
      swappedOutNames.push(prevPlayer.name);
      swappedInNames.push(replacement.name);
    } else {
      usedIds.add(prevPlayer.id);
    }
  }

  const finalStarterSlotById = new Map<string, number>();
  for (const [slotIdx, p] of slotMap.entries()) {
    finalStarterSlotById.set(p.id, slotIdx);
  }
  const finalStarterIds = new Set(finalStarterSlotById.keys());
  const prevBenchIds = new Set(club.squad.filter((p) => !p.isStarter && p.isSubstitute).map((p) => p.id));
  const nextBenchIds = rebuildBalancedBench(club.squad, finalStarterIds, upcomingCompetition, prevBenchIds);

  const updatedSquad = club.squad.map((p) => {
    const assignedSlot = finalStarterSlotById.get(p.id);
    if (assignedSlot !== undefined) {
      const keptSlot = p.isStarter && p.pitchSlot === assignedSlot;
      return {
        ...p,
        isStarter: true,
        isSubstitute: false,
        pitchSlot: assignedSlot,
        pitchX: keptSlot ? p.pitchX : undefined,
        pitchY: keptSlot ? p.pitchY : undefined,
        pitchRoleCode: keptSlot ? p.pitchRoleCode : undefined,
      };
    }
    return {
      ...p,
      isStarter: false,
      isSubstitute: nextBenchIds.has(p.id),
      pitchSlot: undefined,
      pitchX: undefined,
      pitchY: undefined,
      pitchRoleCode: undefined,
    };
  });

  const finalStarters = updatedSquad.filter((p) => p.isStarter);
  const avgCondition =
    finalStarters.length > 0
      ? Math.round(finalStarters.reduce((acc, p) => acc + (p.condition ?? 100), 0) / finalStarters.length)
      : 100;
  const updatedTactics = syncTacticsWithStarters(club.tactics, finalStarters);

  const summaryText =
    swappedOutNames.length === 0
      ? `Nenhum titular cansado (<${fatigueThreshold}%) precisou ser poupado. Físico XI: ${avgCondition}%.`
      : `Rodízio aplicado: ${swappedOutNames.length} ${
          swappedOutNames.length === 1 ? 'atleta poupado/corrigido' : 'atletas poupados/corrigidos'
        } (${swappedInNames.slice(0, 3).join(', ')}${swappedInNames.length > 3 ? '...' : ''}). Físico XI: ${avgCondition}%.`;

  return {
    updatedSquad,
    updatedTactics,
    swappedCount: swappedOutNames.length,
    swappedOutNames,
    swappedInNames,
    avgCondition,
    summaryText,
  };
}

/**
 * Snapshot the current 11 starters + bench + formation into a Time A or Time B lineup profile.
 */
export function createSavedLineupProfile(
  club: Club,
  slot: 'A' | 'B',
  customName?: string,
  savedAtLabel?: string
): SavedLineupProfile {
  const slotMap = resolveStarterSlotMap(club);
  const starterEntries: SavedLineupProfile['starterEntries'] = [];
  for (let slotIdx = 0; slotIdx < 11; slotIdx++) {
    const p = slotMap.get(slotIdx);
    if (!p) continue;
    starterEntries.push({
      playerId: p.id,
      pitchSlot: slotIdx,
      pitchX: p.pitchX,
      pitchY: p.pitchY,
      pitchRoleCode: p.pitchRoleCode,
    });
  }

  const benchIds = club.squad
    .filter((p) => !p.isStarter && p.isSubstitute)
    .map((p) => p.id);

  return {
    slot,
    name: customName || (slot === 'A' ? 'Time A (Titular)' : 'Time B (Misto/Reserva)'),
    formation: club.tactics.formation,
    mentality: club.tactics.mentality,
    passing: club.tactics.passing,
    starterEntries,
    benchIds,
    savedAtLabel,
  };
}

export interface AppliedSavedLineupResult {
  updatedSquad: Player[];
  updatedTactics: TacticalSettings;
  appliedCount: number;
  autoReplacedCount: number;
  avgCondition: number;
  summaryText: string;
}

/**
 * Restore a saved Time A / Time B lineup profile, automatically filling any missing,
 * injured, or competition-suspended player with the best available reserve for that slot.
 */
export function applySavedLineupProfile(
  club: Club,
  profile: SavedLineupProfile,
  upcomingCompetition?: CompetitionType
): AppliedSavedLineupResult {
  const formation = profile.formation || club.tactics.formation || '4-3-3';
  const slots = FORMATION_SLOT_ROLES[formation] || FORMATION_SLOT_ROLES['4-3-3'];
  const squadById = new Map(club.squad.map((p) => [p.id, p]));

  const assignedBySlot = new Map<
    number,
    { player: Player; pitchX?: number; pitchY?: number; pitchRoleCode?: string }
  >();
  const usedIds = new Set<string>();
  const missingSlots: number[] = [];

  for (let slotIdx = 0; slotIdx < 11; slotIdx++) {
    const saved = profile.starterEntries.find((e) => e.pitchSlot === slotIdx);
    const found = saved ? squadById.get(saved.playerId) : undefined;
    if (found && !usedIds.has(found.id) && isPlayerAvailableForMatch(found, upcomingCompetition)) {
      assignedBySlot.set(slotIdx, {
        player: found,
        pitchX: saved?.pitchX,
        pitchY: saved?.pitchY,
        pitchRoleCode: saved?.pitchRoleCode,
      });
      usedIds.add(found.id);
    } else {
      missingSlots.push(slotIdx);
    }
  }

  let autoReplacedCount = 0;
  for (const slotIdx of missingSlots) {
    const slotMeta = slots[slotIdx] || slots[0];
    const candidates = club.squad
      .filter((p) => !usedIds.has(p.id) && isPlayerAvailableForMatch(p, upcomingCompetition))
      .sort((a, b) => {
        const scoreB = computeAssistantMatchReadiness(b, slotMeta.role, 'EQUILIBRADO', slotMeta.code);
        const scoreA = computeAssistantMatchReadiness(a, slotMeta.role, 'EQUILIBRADO', slotMeta.code);
        return scoreB - scoreA;
      });
    const fallback =
      candidates[0] || club.squad.find((p) => !usedIds.has(p.id));
    if (fallback) {
      assignedBySlot.set(slotIdx, { player: fallback });
      usedIds.add(fallback.id);
      autoReplacedCount++;
    }
  }

  const slotByPlayerId = new Map<
    string,
    { slotIdx: number; pitchX?: number; pitchY?: number; pitchRoleCode?: string }
  >();
  for (const [slotIdx, entry] of assignedBySlot.entries()) {
    slotByPlayerId.set(entry.player.id, {
      slotIdx,
      pitchX: entry.pitchX,
      pitchY: entry.pitchY,
      pitchRoleCode: entry.pitchRoleCode,
    });
  }

  const starterIds = new Set(slotByPlayerId.keys());
  const savedBenchSet = new Set(profile.benchIds);
  const nextBenchIds = rebuildBalancedBench(club.squad, starterIds, upcomingCompetition, savedBenchSet);

  const updatedSquad = club.squad.map((p) => {
    const entry = slotByPlayerId.get(p.id);
    if (entry) {
      return {
        ...p,
        isStarter: true,
        isSubstitute: false,
        pitchSlot: entry.slotIdx,
        pitchX: entry.pitchX,
        pitchY: entry.pitchY,
        pitchRoleCode: entry.pitchRoleCode,
      };
    }
    return {
      ...p,
      isStarter: false,
      isSubstitute: nextBenchIds.has(p.id),
      pitchSlot: undefined,
      pitchX: undefined,
      pitchY: undefined,
      pitchRoleCode: undefined,
    };
  });

  const finalStarters = updatedSquad.filter((p) => p.isStarter);
  const avgCondition =
    finalStarters.length > 0
      ? Math.round(finalStarters.reduce((acc, p) => acc + (p.condition ?? 100), 0) / finalStarters.length)
      : 100;

  const baseTactics: TacticalSettings = {
    ...club.tactics,
    formation,
    mentality: profile.mentality ?? club.tactics.mentality,
    passing: profile.passing ?? club.tactics.passing,
  };
  const updatedTactics = syncTacticsWithStarters(baseTactics, finalStarters);

  const summaryText =
    autoReplacedCount > 0
      ? `${profile.name} (${formation}) carregado! ${autoReplacedCount} ${
          autoReplacedCount === 1 ? 'ausência ajustada' : 'ausências ajustadas'
        } automaticamente. Físico XI: ${avgCondition}%.`
      : `${profile.name} (${formation}) carregado com sucesso! Físico XI: ${avgCondition}%.`;

  return {
    updatedSquad,
    updatedTactics,
    appliedCount: finalStarters.length,
    autoReplacedCount,
    avgCondition,
    summaryText,
  };
}

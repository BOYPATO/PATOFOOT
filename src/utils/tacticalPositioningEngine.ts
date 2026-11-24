import {
  Club,
  DetailedRole,
  FormationType,
  Player,
  Position,
} from '../types/game';
import { inferTacticalZoneFromCoords } from './matchPitchLayout';

export interface FormationPitchSlot {
  slotIndex: number;
  x: number;
  y: number;
  role: DetailedRole;
  code: string;
  label: string;
}

export const FORMATION_PITCH_SLOTS: Record<FormationType, FormationPitchSlot[]> = {
  '4-3-3': [
    { slotIndex: 0, x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { slotIndex: 1, x: 14, y: 70, role: 'LAT', code: 'LE', label: 'Lat. Esquerdo' },
    { slotIndex: 2, x: 38, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Central' },
    { slotIndex: 3, x: 62, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Central' },
    { slotIndex: 4, x: 86, y: 70, role: 'LAT', code: 'LD', label: 'Lat. Direito' },
    { slotIndex: 5, x: 50, y: 57, role: 'VOL', code: 'VOL', label: 'Primeiro Volante' },
    { slotIndex: 6, x: 32, y: 45, role: 'MEI', code: 'MC', label: 'Meia Central Esq.' },
    { slotIndex: 7, x: 68, y: 45, role: 'MEI', code: 'MC', label: 'Meia Central Dir.' },
    { slotIndex: 8, x: 16, y: 20, role: 'ATA', code: 'PE', label: 'Ponta Esquerda' },
    { slotIndex: 9, x: 50, y: 15, role: 'ATA', code: 'CA', label: 'Centroavante' },
    { slotIndex: 10, x: 84, y: 20, role: 'ATA', code: 'PD', label: 'Ponta Direita' },
  ],
  '4-4-2': [
    { slotIndex: 0, x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { slotIndex: 1, x: 14, y: 70, role: 'LAT', code: 'LE', label: 'Lat. Esquerdo' },
    { slotIndex: 2, x: 38, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Central' },
    { slotIndex: 3, x: 62, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Central' },
    { slotIndex: 4, x: 86, y: 70, role: 'LAT', code: 'LD', label: 'Lat. Direito' },
    { slotIndex: 5, x: 16, y: 46, role: 'MEI', code: 'ME', label: 'Meia Esquerda' },
    { slotIndex: 6, x: 39, y: 54, role: 'VOL', code: 'VOL', label: 'Volante' },
    { slotIndex: 7, x: 61, y: 54, role: 'VOL', code: 'VOL', label: 'Volante' },
    { slotIndex: 8, x: 84, y: 46, role: 'MEI', code: 'MD', label: 'Meia Direita' },
    { slotIndex: 9, x: 36, y: 20, role: 'ATA', code: 'SA', label: 'Segundo Atacante' },
    { slotIndex: 10, x: 64, y: 18, role: 'ATA', code: 'CA', label: 'Centroavante' },
  ],
  '3-5-2': [
    { slotIndex: 0, x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { slotIndex: 1, x: 28, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Esquerdo' },
    { slotIndex: 2, x: 50, y: 75, role: 'ZAG', code: 'ZAG', label: 'Líbero / Central' },
    { slotIndex: 3, x: 72, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Direito' },
    { slotIndex: 4, x: 12, y: 50, role: 'LAT', code: 'ALA', label: 'Ala Esquerdo' },
    { slotIndex: 5, x: 36, y: 55, role: 'VOL', code: 'VOL', label: 'Volante' },
    { slotIndex: 6, x: 64, y: 55, role: 'VOL', code: 'VOL', label: 'Volante' },
    { slotIndex: 7, x: 88, y: 50, role: 'LAT', code: 'ALA', label: 'Ala Direito' },
    { slotIndex: 8, x: 50, y: 35, role: 'MEI', code: 'MEI', label: 'Meia Armador (10)' },
    { slotIndex: 9, x: 36, y: 18, role: 'ATA', code: 'SA', label: 'Segundo Atacante' },
    { slotIndex: 10, x: 64, y: 16, role: 'ATA', code: 'CA', label: 'Centroavante' },
  ],
  '4-2-3-1': [
    { slotIndex: 0, x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { slotIndex: 1, x: 14, y: 70, role: 'LAT', code: 'LE', label: 'Lat. Esquerdo' },
    { slotIndex: 2, x: 38, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Central' },
    { slotIndex: 3, x: 62, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Central' },
    { slotIndex: 4, x: 86, y: 70, role: 'LAT', code: 'LD', label: 'Lat. Direito' },
    { slotIndex: 5, x: 36, y: 56, role: 'VOL', code: 'VOL', label: 'Primeiro Volante' },
    { slotIndex: 6, x: 64, y: 56, role: 'VOL', code: 'VOL', label: 'Segundo Volante' },
    { slotIndex: 7, x: 18, y: 36, role: 'MEI', code: 'ME', label: 'Meia Esquerda' },
    { slotIndex: 8, x: 50, y: 34, role: 'MEI', code: 'MEI', label: 'Meia Armador (10)' },
    { slotIndex: 9, x: 82, y: 36, role: 'MEI', code: 'MD', label: 'Meia Direita' },
    { slotIndex: 10, x: 50, y: 16, role: 'ATA', code: 'CA', label: 'Centroavante' },
  ],
  '5-3-2': [
    { slotIndex: 0, x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { slotIndex: 1, x: 12, y: 66, role: 'LAT', code: 'ALA', label: 'Ala Esquerdo' },
    { slotIndex: 2, x: 31, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Esquerdo' },
    { slotIndex: 3, x: 50, y: 75, role: 'ZAG', code: 'ZAG', label: 'Líbero Central' },
    { slotIndex: 4, x: 69, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Direito' },
    { slotIndex: 5, x: 88, y: 66, role: 'LAT', code: 'ALA', label: 'Ala Direito' },
    { slotIndex: 6, x: 32, y: 50, role: 'VOL', code: 'VOL', label: 'Volante' },
    { slotIndex: 7, x: 50, y: 44, role: 'MEI', code: 'MC', label: 'Meia Central' },
    { slotIndex: 8, x: 68, y: 50, role: 'VOL', code: 'VOL', label: 'Volante' },
    { slotIndex: 9, x: 36, y: 20, role: 'ATA', code: 'SA', label: 'Segundo Atacante' },
    { slotIndex: 10, x: 64, y: 18, role: 'ATA', code: 'CA', label: 'Centroavante' },
  ],
  '4-1-4-1': [
    { slotIndex: 0, x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { slotIndex: 1, x: 14, y: 70, role: 'LAT', code: 'LE', label: 'Lat. Esquerdo' },
    { slotIndex: 2, x: 38, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro' },
    { slotIndex: 3, x: 62, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro' },
    { slotIndex: 4, x: 86, y: 70, role: 'LAT', code: 'LD', label: 'Lat. Direito' },
    { slotIndex: 5, x: 50, y: 58, role: 'VOL', code: 'VOL', label: 'Primeiro Volante' },
    { slotIndex: 6, x: 16, y: 40, role: 'MEI', code: 'ME', label: 'Meia Esquerda' },
    { slotIndex: 7, x: 39, y: 44, role: 'MEI', code: 'MC', label: 'Meia Central' },
    { slotIndex: 8, x: 61, y: 44, role: 'MEI', code: 'MC', label: 'Meia Central' },
    { slotIndex: 9, x: 84, y: 40, role: 'MEI', code: 'MD', label: 'Meia Direita' },
    { slotIndex: 10, x: 50, y: 17, role: 'ATA', code: 'CA', label: 'Centroavante Isolado' },
  ],
  '3-4-3': [
    { slotIndex: 0, x: 50, y: 88, role: 'GOL', code: 'GOL', label: 'Goleiro' },
    { slotIndex: 1, x: 28, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Esquerdo' },
    { slotIndex: 2, x: 50, y: 75, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Central' },
    { slotIndex: 3, x: 72, y: 73, role: 'ZAG', code: 'ZAG', label: 'Zagueiro Direito' },
    { slotIndex: 4, x: 14, y: 49, role: 'LAT', code: 'ALA', label: 'Ala Esquerdo' },
    { slotIndex: 5, x: 38, y: 54, role: 'VOL', code: 'VOL', label: 'Volante' },
    { slotIndex: 6, x: 62, y: 54, role: 'VOL', code: 'VOL', label: 'Volante' },
    { slotIndex: 7, x: 86, y: 49, role: 'LAT', code: 'ALA', label: 'Ala Direito' },
    { slotIndex: 8, x: 18, y: 20, role: 'ATA', code: 'PE', label: 'Ponta Esquerda' },
    { slotIndex: 9, x: 50, y: 15, role: 'ATA', code: 'CA', label: 'Centroavante' },
    { slotIndex: 10, x: 82, y: 20, role: 'ATA', code: 'PD', label: 'Ponta Direita' },
  ],
};

export type TacticalFitStatus =
  | 'EXACT'
  | 'ADAPTED'
  | 'WRONG_POSITION'
  | 'CRITICAL_MISMATCH';

export interface PlayerSlotFitEvaluation {
  status: TacticalFitStatus;
  isOutOfPosition: boolean;
  isWrongPosition: boolean;
  overallPenalty: number;
  baseOverall: number;
  effectiveOverall: number;
  naturalRole: DetailedRole;
  learnedSecondaryRoles: DetailedRole[];
  assignedRole: DetailedRole;
  assignedCode: string;
  assignedLabel: string;
  shortStatusLabel: string;
  reasonText: string;
}

export interface ResolvedStarterAssignment {
  player: Player;
  slotIndex: number;
  x: number;
  y: number;
  isCustom: boolean;
  fit: PlayerSlotFitEvaluation;
}

export interface ClubLineupTacticalReport {
  assignments: ResolvedStarterAssignment[];
  assignmentByPlayerId: Map<string, ResolvedStarterAssignment>;
  slotAssignments: (ResolvedStarterAssignment | null)[];
  exactCount: number;
  adaptedCount: number;
  wrongPositionCount: number;
  criticalCount: number;
  outOfPositionAssignments: ResolvedStarterAssignment[];
  totalPenaltyPoints: number;
  avgBaseOverall: number;
  avgEffectiveOverall: number;
  avgPenaltyDelta: number;
}

const ROLE_NAME_PT: Record<DetailedRole, string> = {
  GOL: 'Goleiro',
  ZAG: 'Zagueiro',
  LAT: 'Lateral/Ala',
  VOL: 'Volante',
  MEI: 'Meia',
  ATA: 'Atacante',
};

const PENALTY_MATRIX: Record<DetailedRole, Record<DetailedRole, number>> = {
  GOL: { GOL: 0, ZAG: 26, LAT: 28, VOL: 28, MEI: 29, ATA: 30 },
  ZAG: { GOL: 25, ZAG: 0, LAT: 0, VOL: 3, MEI: 9, ATA: 13 },
  LAT: { GOL: 26, ZAG: 0, LAT: 0, VOL: 3, MEI: 4, ATA: 8 },
  VOL: { GOL: 26, ZAG: 4, LAT: 3, VOL: 0, MEI: 0, ATA: 10 },
  MEI: { GOL: 27, ZAG: 10, LAT: 4, VOL: 0, MEI: 0, ATA: 3 },
  ATA: { GOL: 27, ZAG: 13, LAT: 8, VOL: 10, MEI: 3, ATA: 0 },
};

const ROLE_CODES_UNLOCKED: Record<DetailedRole, string[]> = {
  GOL: ['GOL'],
  ZAG: ['ZAG', 'LE', 'LD', 'ALA'],
  LAT: ['LE', 'LD', 'ALA', 'ZAG'],
  VOL: ['VOL', 'MC', 'ME', 'MD', 'MEI'],
  MEI: ['MEI', 'MC', 'ME', 'MD', 'VOL'],
  ATA: ['CA', 'SA', 'PE', 'PD', 'ME', 'MD'],
};

const ROLE_SECTOR_NAME_PT: Record<DetailedRole, string> = {
  GOL: 'Gol',
  ZAG: 'Defesa',
  LAT: 'Defesa / Corredor',
  VOL: 'Meio-Campo',
  MEI: 'Meio-Campo',
  ATA: 'Ataque / Pontas',
};

const ROLE_COMPACT_VERSATILITY_HINT: Record<DetailedRole, string> = {
  GOL: '',
  ZAG: 'LE·LD·ALA',
  LAT: 'LE·LD·ZAG',
  VOL: 'MC·ME·MD',
  MEI: 'MC·ME·MD·VOL',
  ATA: 'CA·PE·PD·ME/MD',
};

export interface PlayerSectorFitPreview {
  id: string;
  label: string;
  codes: string;
  targetRole: DetailedRole;
  targetCode: string;
  effectiveOverall: number;
  penalty: number;
  status: TacticalFitStatus;
}

export interface PlayerVersatilityProfile {
  primaryRole: DetailedRole;
  sectorName: string;
  naturalCodes: string[];
  learnedRoles: DetailedRole[];
  allZeroPenaltyCodes: string[];
  compactSecondaryHint: string;
  sectorFitPreviews: PlayerSectorFitPreview[];
}

export function getSectorFromDetailedRole(role: DetailedRole): Position {
  if (role === 'GOL') return 'GK';
  if (role === 'ZAG' || role === 'LAT') return 'DF';
  if (role === 'VOL' || role === 'MEI') return 'MF';
  return 'FW';
}

export function getSectorBucketFromRole(role: DetailedRole): 'DEF' | 'MEI' | 'ATA' {
  if (role === 'GOL' || role === 'ZAG' || role === 'LAT') return 'DEF';
  if (role === 'VOL' || role === 'MEI') return 'MEI';
  return 'ATA';
}

/**
 * Returns true when a player naturally dominates the target tactical position
 * within their field sector (0 OVR penalty):
 * - Defesa: ZAG ↔ LAT (LE / LD / ALA / ZAG)
 * - Meio-Campo: VOL ↔ MEI (VOL / MC / ME / MD / MEI)
 * - Ataque / Pontas: ATA (CA / SA / PE / PD) + Meias Abertos (ME / MD)
 */
export function isSameSectorNaturalRoleFit(
  naturalRole: DetailedRole,
  targetRole: DetailedRole,
  targetCode?: string
): { compatible: boolean; shortLabel: string; reasonText: string } {
  const code = (targetCode || targetRole).toUpperCase();

  if (naturalRole === 'ZAG' && targetRole === 'LAT') {
    return {
      compatible: true,
      shortLabel: 'Setor Natural',
      reasonText: `Zagueiro versátil atua no setor defensivo como ${code} sem perda de OVR`,
    };
  }
  if (naturalRole === 'LAT' && targetRole === 'ZAG') {
    return {
      compatible: true,
      shortLabel: 'Setor Natural',
      reasonText: `Lateral versátil atua no setor defensivo como Zagueiro (ZAG) sem perda de OVR`,
    };
  }
  if (naturalRole === 'VOL' && targetRole === 'MEI') {
    return {
      compatible: true,
      shortLabel: 'Setor Natural',
      reasonText: `Volante versátil atua no meio-campo como ${code} sem perda de OVR`,
    };
  }
  if (naturalRole === 'MEI' && targetRole === 'VOL') {
    return {
      compatible: true,
      shortLabel: 'Setor Natural',
      reasonText: `Meia versátil recua no setor de meio-campo como Volante (VOL) sem perda de OVR`,
    };
  }
  if (
    naturalRole === 'ATA' &&
    targetRole === 'MEI' &&
    (code === 'ME' || code === 'MD')
  ) {
    return {
      compatible: true,
      shortLabel: 'Setor Natural',
      reasonText: `Ponta / Atacante atua aberto como ${code === 'ME' ? 'Meia Esquerda (ME)' : 'Meia Direita (MD)'} sem perda de OVR`,
    };
  }

  return { compatible: false, shortLabel: '', reasonText: '' };
}

/**
 * Evaluates tactical role compatibility and calculates the real Overall penalty
 * when a player acts outside their natural sector positions (or learned secondaryRoles).
 */
export function evaluatePlayerRoleFit(params: {
  baseOverall: number;
  naturalRole: DetailedRole;
  secondaryRoles?: DetailedRole[];
  targetRole: DetailedRole;
  targetCode?: string;
  targetLabel?: string;
}): PlayerSlotFitEvaluation {
  const {
    baseOverall,
    naturalRole,
    secondaryRoles = [],
    targetRole,
    targetCode,
    targetLabel,
  } = params;

  const assignedCode = targetCode || targetRole;
  const assignedLabel = targetLabel || ROLE_NAME_PT[targetRole] || targetRole;

  if (naturalRole === targetRole) {
    return {
      status: 'EXACT',
      isOutOfPosition: false,
      isWrongPosition: false,
      overallPenalty: 0,
      baseOverall,
      effectiveOverall: baseOverall,
      naturalRole,
      learnedSecondaryRoles: secondaryRoles,
      assignedRole: targetRole,
      assignedCode,
      assignedLabel,
      shortStatusLabel: 'Ideal',
      reasonText: `Função natural (${naturalRole} · ${assignedCode})`,
    };
  }

  if (secondaryRoles.includes(targetRole)) {
    return {
      status: 'EXACT',
      isOutOfPosition: false,
      isWrongPosition: false,
      overallPenalty: 0,
      baseOverall,
      effectiveOverall: baseOverall,
      naturalRole,
      learnedSecondaryRoles: secondaryRoles,
      assignedRole: targetRole,
      assignedCode,
      assignedLabel,
      shortStatusLabel: 'Dominada',
      reasonText: `Posição secundária treinada e dominada (${assignedCode})`,
    };
  }

  // Same-sector multi-position versatility (0 OVR penalty)
  const sectorFit = isSameSectorNaturalRoleFit(naturalRole, targetRole, assignedCode);
  if (sectorFit.compatible) {
    return {
      status: 'EXACT',
      isOutOfPosition: false,
      isWrongPosition: false,
      overallPenalty: 0,
      baseOverall,
      effectiveOverall: baseOverall,
      naturalRole,
      learnedSecondaryRoles: secondaryRoles,
      assignedRole: targetRole,
      assignedCode,
      assignedLabel,
      shortStatusLabel: sectorFit.shortLabel,
      reasonText: sectorFit.reasonText,
    };
  }

  // Cross-sector penalty with fine-grained role-code awareness
  let rawPenalty = PENALTY_MATRIX[naturalRole]?.[targetRole] ?? 10;
  const codeUpper = assignedCode.toUpperCase();

  // Wide corridor adjustments for adjacent sectors
  if (naturalRole === 'LAT' && targetRole === 'MEI' && (codeUpper === 'ME' || codeUpper === 'MD')) {
    rawPenalty = 2; // Lateral acting as wide midfielder (ME/MD)
  } else if (
    naturalRole === 'MEI' &&
    targetRole === 'ATA' &&
    (codeUpper === 'PE' || codeUpper === 'PD' || codeUpper === 'SA')
  ) {
    rawPenalty = 2; // Attacking midfielder acting as winger / second striker
  }

  const effectiveOverall = Math.max(30, baseOverall - rawPenalty);
  const actualPenalty = Math.max(0, baseOverall - effectiveOverall);

  let status: TacticalFitStatus = 'ADAPTED';
  let shortStatusLabel = 'Adaptado';

  if (naturalRole === 'GOL' || targetRole === 'GOL') {
    status = 'CRITICAL_MISMATCH';
    shortStatusLabel = 'Crítico';
  } else if (rawPenalty >= 7) {
    status = 'WRONG_POSITION';
    shortStatusLabel = 'Fora de Setor';
  }

  const reasonText =
    status === 'CRITICAL_MISMATCH'
      ? naturalRole === 'GOL'
        ? `Goleiro (GOL) atuando na linha em ${assignedCode}: -${actualPenalty} OVR`
        : `Jogador de linha (${naturalRole}) improvisado no gol (GOL): -${actualPenalty} OVR`
      : status === 'WRONG_POSITION'
      ? `${ROLE_NAME_PT[naturalRole]} (${naturalRole}) fora do setor em ${assignedLabel} (${assignedCode}): -${actualPenalty} OVR`
      : `${ROLE_NAME_PT[naturalRole]} (${naturalRole}) adaptado em ${assignedLabel} (${assignedCode}): -${actualPenalty} OVR`;

  return {
    status,
    isOutOfPosition: true,
    isWrongPosition: status === 'WRONG_POSITION' || status === 'CRITICAL_MISMATCH',
    overallPenalty: actualPenalty,
    baseOverall,
    effectiveOverall,
    naturalRole,
    learnedSecondaryRoles: secondaryRoles,
    assignedRole: targetRole,
    assignedCode,
    assignedLabel,
    shortStatusLabel,
    reasonText,
  };
}

export function evaluatePlayerSlotFit(
  player: Pick<Player, 'overall' | 'detailedRole' | 'secondaryRoles'>,
  targetRole: DetailedRole,
  targetCode?: string,
  targetLabel?: string
): PlayerSlotFitEvaluation {
  return evaluatePlayerRoleFit({
    baseOverall: player.overall,
    naturalRole: player.detailedRole,
    secondaryRoles: player.secondaryRoles,
    targetRole,
    targetCode,
    targetLabel,
  });
}

/**
 * Returns the full multi-position versatility profile of a player, including:
 * - All zero-penalty positions in their field sector + any CT-learned secondary roles
 * - Real effective Overall breakdown across every sector of the pitch
 */
export function getPlayerVersatilityProfile(
  player: Pick<Player, 'overall' | 'detailedRole' | 'secondaryRoles'>
): PlayerVersatilityProfile {
  const primaryRole = player.detailedRole;
  const naturalCodes = ROLE_CODES_UNLOCKED[primaryRole] || [primaryRole];
  const learnedRoles = (player.secondaryRoles || []).filter(
    (r) => r !== primaryRole && !isSameSectorNaturalRoleFit(primaryRole, r).compatible
  );

  const codeSet = new Set<string>(naturalCodes);
  for (const lr of learnedRoles) {
    if (lr === 'ZAG') codeSet.add('ZAG');
    else if (lr === 'LAT') {
      codeSet.add('LE');
      codeSet.add('LD');
      codeSet.add('ALA');
    } else if (lr === 'VOL') codeSet.add('VOL');
    else if (lr === 'MEI') {
      codeSet.add('MC');
      codeSet.add('ME');
      codeSet.add('MD');
      codeSet.add('MEI');
    } else if (lr === 'ATA') {
      codeSet.add('PE');
      codeSet.add('PD');
      codeSet.add('SA');
      codeSet.add('CA');
    }
  }

  const baseHint = ROLE_COMPACT_VERSATILITY_HINT[primaryRole] || '';
  const compactSecondaryHint =
    learnedRoles.length > 0
      ? baseHint
        ? `${baseHint} +${learnedRoles.join(',')}`
        : `+${learnedRoles.join(',')}`
      : baseHint;

  const probeDefs: Array<{
    id: string;
    label: string;
    codes: string;
    targetRole: DetailedRole;
    targetCode: string;
  }> = [
    { id: 'zag', label: 'Zagueiro', codes: 'ZAG', targetRole: 'ZAG', targetCode: 'ZAG' },
    { id: 'lat', label: 'Lateral / Ala', codes: 'LE · LD · ALA', targetRole: 'LAT', targetCode: 'LD' },
    { id: 'vol', label: 'Volante', codes: 'VOL', targetRole: 'VOL', targetCode: 'VOL' },
    { id: 'mc', label: 'Meia Central / 10', codes: 'MC · MEI', targetRole: 'MEI', targetCode: 'MC' },
    { id: 'memd', label: 'Meia Aberto', codes: 'ME · MD', targetRole: 'MEI', targetCode: 'ME' },
    { id: 'ata', label: 'Ponta / Centroavante', codes: 'PE · PD · SA · CA', targetRole: 'ATA', targetCode: 'CA' },
  ];

  const sectorFitPreviews: PlayerSectorFitPreview[] = probeDefs.map((probe) => {
    const fit = evaluatePlayerSlotFit(player, probe.targetRole, probe.targetCode, probe.label);
    return {
      id: probe.id,
      label: probe.label,
      codes: probe.codes,
      targetRole: probe.targetRole,
      targetCode: probe.targetCode,
      effectiveOverall: fit.effectiveOverall,
      penalty: fit.overallPenalty,
      status: fit.status,
    };
  });

  if (primaryRole === 'GOL') {
    const gkFit = evaluatePlayerSlotFit(player, 'GOL', 'GOL', 'Goleiro');
    sectorFitPreviews.unshift({
      id: 'gol',
      label: 'Goleiro',
      codes: 'GOL',
      targetRole: 'GOL',
      targetCode: 'GOL',
      effectiveOverall: gkFit.effectiveOverall,
      penalty: gkFit.overallPenalty,
      status: gkFit.status,
    });
  }

  return {
    primaryRole,
    sectorName: ROLE_SECTOR_NAME_PT[primaryRole] || primaryRole,
    naturalCodes,
    learnedRoles,
    allZeroPenaltyCodes: Array.from(codeSet),
    compactSecondaryHint,
    sectorFitPreviews,
  };
}

/**
 * Resolves the active tactical slot, coordinates, and OVR penalty for every starter of a club.
 * Single source of truth shared between PitchTacticsView, SquadTable, clubRatingsEngine, and match engines.
 */
export function resolveClubLineupTacticalReport(club: Club): ClubLineupTacticalReport {
  const formation = club.tactics?.formation || '4-3-3';
  const presetSlots = FORMATION_PITCH_SLOTS[formation] || FORMATION_PITCH_SLOTS['4-3-3'];
  const starters = (club.squad || []).filter((p) => p.isStarter);

  const slotOwners: (Player | null)[] = Array(11).fill(null);
  const unassigned: Player[] = [];

  // Check whether any starter carries explicit slot or pitch coordinates
  const hasAnySlotMetadata = starters.some(
    (p) =>
      (p.pitchSlot !== undefined && p.pitchSlot >= 0 && p.pitchSlot < 11) ||
      (typeof p.pitchX === 'number' && typeof p.pitchY === 'number')
  );

  if (hasAnySlotMetadata) {
    for (const p of starters) {
      if (
        p.pitchSlot !== undefined &&
        p.pitchSlot >= 0 &&
        p.pitchSlot < 11 &&
        !slotOwners[p.pitchSlot]
      ) {
        slotOwners[p.pitchSlot] = p;
      } else {
        unassigned.push(p);
      }
    }
    for (const p of unassigned) {
      const emptyIdx = slotOwners.findIndex((s) => s === null);
      if (emptyIdx !== -1) {
        slotOwners[emptyIdx] = p;
      }
    }
  } else {
    // Legacy/unslotted squads: pair exact natural primary roles first, then same-sector zero-penalty fits, then best remaining
    const remainingSlots = new Set<number>(presetSlots.map((s) => s.slotIndex));
    const remainingPlayers = [...starters];

    // Pass 1a: exact primary role match (ZAG->ZAG, LAT->LE/LD, VOL->VOL, etc.)
    for (let i = 0; i < remainingPlayers.length; i++) {
      const p = remainingPlayers[i];
      if (!p) continue;
      const matchSlot = presetSlots.find(
        (s) => remainingSlots.has(s.slotIndex) && p.detailedRole === s.role
      );
      if (matchSlot) {
        slotOwners[matchSlot.slotIndex] = p;
        remainingSlots.delete(matchSlot.slotIndex);
        remainingPlayers[i] = null as unknown as Player;
      }
    }

    // Pass 1b: zero-penalty same-sector versatile or CT-learned secondary role match
    for (let i = 0; i < remainingPlayers.length; i++) {
      const p = remainingPlayers[i];
      if (!p) continue;
      const matchSlot = presetSlots.find(
        (s) =>
          remainingSlots.has(s.slotIndex) &&
          evaluatePlayerSlotFit(p, s.role, s.code, s.label).overallPenalty === 0
      );
      if (matchSlot) {
        slotOwners[matchSlot.slotIndex] = p;
        remainingSlots.delete(matchSlot.slotIndex);
        remainingPlayers[i] = null as unknown as Player;
      }
    }

    // Pass 2: best remaining fit
    for (const p of remainingPlayers) {
      if (!p) continue;
      let bestSlotIdx = -1;
      let bestPenalty = Infinity;
      for (const sIdx of remainingSlots) {
        const presetSlot = presetSlots[sIdx];
        const pen = evaluatePlayerSlotFit(p, presetSlot.role, presetSlot.code, presetSlot.label).overallPenalty;
        if (pen < bestPenalty) {
          bestPenalty = pen;
          bestSlotIdx = sIdx;
        }
      }
      if (bestSlotIdx !== -1) {
        slotOwners[bestSlotIdx] = p;
        remainingSlots.delete(bestSlotIdx);
      }
    }
  }

  const slotAssignments: (ResolvedStarterAssignment | null)[] = Array(11).fill(null);
  const assignments: ResolvedStarterAssignment[] = [];
  const assignmentByPlayerId = new Map<string, ResolvedStarterAssignment>();

  for (let slotIndex = 0; slotIndex < 11; slotIndex++) {
    const player = slotOwners[slotIndex];
    const preset = presetSlots[slotIndex];
    if (!player || !preset) continue;

    const isCustom =
      typeof player.pitchX === 'number' && typeof player.pitchY === 'number';
    const x = isCustom ? (player.pitchX as number) : preset.x;
    const y = isCustom ? (player.pitchY as number) : preset.y;
    const inferred = isCustom ? inferTacticalZoneFromCoords(x, y) : null;

    const assignedRole = inferred ? inferred.role : preset.role;
    const assignedCode = isCustom
      ? player.pitchRoleCode || inferred!.code
      : preset.code;
    const assignedLabel = inferred ? inferred.label : preset.label;

    const fit = evaluatePlayerSlotFit(player, assignedRole, assignedCode, assignedLabel);
    const entry: ResolvedStarterAssignment = {
      player,
      slotIndex,
      x,
      y,
      isCustom,
      fit,
    };

    slotAssignments[slotIndex] = entry;
    assignments.push(entry);
    assignmentByPlayerId.set(player.id, entry);
  }

  // Handle rare case where > 11 starters exist
  for (const p of starters) {
    if (assignmentByPlayerId.has(p.id)) continue;
    const hasCustom = typeof p.pitchX === 'number' && typeof p.pitchY === 'number';
    const inferred = hasCustom
      ? inferTacticalZoneFromCoords(p.pitchX as number, p.pitchY as number)
      : null;
    const fit = evaluatePlayerSlotFit(
      p,
      inferred ? inferred.role : p.detailedRole,
      p.pitchRoleCode || inferred?.code || p.detailedRole,
      inferred?.label || ROLE_NAME_PT[p.detailedRole]
    );
    const entry: ResolvedStarterAssignment = {
      player: p,
      slotIndex: -1,
      x: p.pitchX ?? 50,
      y: p.pitchY ?? 50,
      isCustom: hasCustom,
      fit,
    };
    assignments.push(entry);
    assignmentByPlayerId.set(p.id, entry);
  }

  let exactCount = 0;
  let adaptedCount = 0;
  let wrongPositionCount = 0;
  let criticalCount = 0;
  let totalPenaltyPoints = 0;
  let baseSum = 0;
  let effectiveSum = 0;

  for (const a of assignments) {
    baseSum += a.fit.baseOverall;
    effectiveSum += a.fit.effectiveOverall;
    totalPenaltyPoints += a.fit.overallPenalty;

    if (a.fit.status === 'EXACT') exactCount += 1;
    else if (a.fit.status === 'ADAPTED') adaptedCount += 1;
    else if (a.fit.status === 'WRONG_POSITION') wrongPositionCount += 1;
    else criticalCount += 1;
  }

  const count = Math.max(1, assignments.length);
  const avgBaseOverall =
    assignments.length > 0 ? Math.round((baseSum / count) * 10) / 10 : 0;
  const avgEffectiveOverall =
    assignments.length > 0 ? Math.round((effectiveSum / count) * 10) / 10 : 0;

  const outOfPositionAssignments = assignments
    .filter((a) => a.fit.isOutOfPosition)
    .sort((a, b) => b.fit.overallPenalty - a.fit.overallPenalty);

  return {
    assignments,
    assignmentByPlayerId,
    slotAssignments,
    exactCount,
    adaptedCount,
    wrongPositionCount,
    criticalCount,
    outOfPositionAssignments,
    totalPenaltyPoints,
    avgBaseOverall,
    avgEffectiveOverall,
    avgPenaltyDelta: Math.round((avgEffectiveOverall - avgBaseOverall) * 10) / 10,
  };
}

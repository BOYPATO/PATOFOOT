import { Player, DetailedRole, InGameTacticOrder } from '../types/game';

export interface PitchPosition {
  baseX: number;
  baseY: number;
}

export interface TacticalPitchZone {
  id: string;
  code: string;
  label: string;
  role: DetailedRole;
  sector: 'GK' | 'DF' | 'MF' | 'FW';
  x: number;
  y: number;
}

/**
 * 27 tactical zones distributed across the vertical pitch (0-100% X left-to-right, 0-100% Y attack-top to defense-bottom).
 * Allows dragging and placing players into any tactical role or sector on the field.
 */
export const TACTICAL_PITCH_ZONES: TacticalPitchZone[] = [
  // Attacking Line (Ponta / Centroavante)
  { id: 'zone-pe', code: 'PE', label: 'Ponta Esquerda', role: 'ATA', sector: 'FW', x: 16, y: 19 },
  { id: 'zone-cae', code: 'ATA', label: 'Atacante Esquerdo', role: 'ATA', sector: 'FW', x: 35, y: 16 },
  { id: 'zone-ca', code: 'CA', label: 'Centroavante', role: 'ATA', sector: 'FW', x: 50, y: 14 },
  { id: 'zone-cad', code: 'ATA', label: 'Atacante Direito', role: 'ATA', sector: 'FW', x: 65, y: 16 },
  { id: 'zone-pd', code: 'PD', label: 'Ponta Direita', role: 'ATA', sector: 'FW', x: 84, y: 19 },

  // Second Strikers / Shadow Forwards
  { id: 'zone-sae', code: 'SA', label: 'Seg. Atacante Esq.', role: 'ATA', sector: 'FW', x: 33, y: 26 },
  { id: 'zone-sa', code: 'SA', label: 'Segundo Atacante', role: 'ATA', sector: 'FW', x: 50, y: 25 },
  { id: 'zone-sad', code: 'SA', label: 'Seg. Atacante Dir.', role: 'ATA', sector: 'FW', x: 67, y: 26 },

  // Attacking Midfield (Meias Ofensivos / Abertos)
  { id: 'zone-me', code: 'ME', label: 'Meia Esquerda', role: 'MEI', sector: 'MF', x: 15, y: 37 },
  { id: 'zone-mae', code: 'MEI', label: 'Meia-Atacante Esq.', role: 'MEI', sector: 'MF', x: 34, y: 35 },
  { id: 'zone-mac', code: 'MEI', label: 'Meia Armador (10)', role: 'MEI', sector: 'MF', x: 50, y: 34 },
  { id: 'zone-mad', code: 'MEI', label: 'Meia-Atacante Dir.', role: 'MEI', sector: 'MF', x: 66, y: 35 },
  { id: 'zone-md', code: 'MD', label: 'Meia Direita', role: 'MEI', sector: 'MF', x: 85, y: 37 },

  // Central Midfield & Wingbacks (Meias Centrais & Alas)
  { id: 'zone-ale', code: 'ALA', label: 'Ala Esquerdo', role: 'LAT', sector: 'MF', x: 12, y: 50 },
  { id: 'zone-mce', code: 'MC', label: 'Meia Central Esq.', role: 'MEI', sector: 'MF', x: 32, y: 46 },
  { id: 'zone-mc', code: 'MC', label: 'Meia Central', role: 'MEI', sector: 'MF', x: 50, y: 46 },
  { id: 'zone-mcd', code: 'MC', label: 'Meia Central Dir.', role: 'MEI', sector: 'MF', x: 68, y: 46 },
  { id: 'zone-ald', code: 'ALA', label: 'Ala Direito', role: 'LAT', sector: 'MF', x: 88, y: 50 },

  // Defensive Midfield (Volantes)
  { id: 'zone-vle', code: 'VOL', label: 'Volante Esquerdo', role: 'VOL', sector: 'MF', x: 35, y: 57 },
  { id: 'zone-vol', code: 'VOL', label: 'Primeiro Volante', role: 'VOL', sector: 'MF', x: 50, y: 58 },
  { id: 'zone-vld', code: 'VOL', label: 'Volante Direito', role: 'VOL', sector: 'MF', x: 65, y: 57 },

  // Defensive Line (Laterais, Zagueiros & Líbero)
  { id: 'zone-le', code: 'LE', label: 'Lateral Esquerdo', role: 'LAT', sector: 'DF', x: 14, y: 70 },
  { id: 'zone-zae', code: 'ZAG', label: 'Zagueiro Esquerdo', role: 'ZAG', sector: 'DF', x: 31, y: 73 },
  { id: 'zone-zac', code: 'ZAG', label: 'Zagueiro Central / Líbero', role: 'ZAG', sector: 'DF', x: 50, y: 75 },
  { id: 'zone-zad', code: 'ZAG', label: 'Zagueiro Direito', role: 'ZAG', sector: 'DF', x: 69, y: 73 },
  { id: 'zone-ld', code: 'LD', label: 'Lateral Direito', role: 'LAT', sector: 'DF', x: 86, y: 70 },

  // Goalkeeper
  { id: 'zone-gol', code: 'GOL', label: 'Goleiro', role: 'GOL', sector: 'GK', x: 50, y: 88 },
];

/**
 * Dynamically infers the tactical role, short badge code, and full Portuguese label
 * for ANY custom (x, y) coordinate on the vertical tactical pitch.
 */
export function inferTacticalZoneFromCoords(
  x: number,
  y: number
): { code: string; label: string; role: DetailedRole } {
  // Goalkeeper box
  if (y >= 82 && x >= 28 && x <= 72) {
    return { code: 'GOL', label: 'Goleiro', role: 'GOL' };
  }

  // Defensive Third (y >= 63)
  if (y >= 63) {
    if (x < 24) return { code: 'LE', label: 'Lateral Esquerdo', role: 'LAT' };
    if (x > 76) return { code: 'LD', label: 'Lateral Direito', role: 'LAT' };
    if (x < 41) return { code: 'ZAG', label: 'Zagueiro Esquerdo', role: 'ZAG' };
    if (x > 59) return { code: 'ZAG', label: 'Zagueiro Direito', role: 'ZAG' };
    return { code: 'ZAG', label: 'Zagueiro Central', role: 'ZAG' };
  }

  // Defensive Midfield & Wingbacks (51 <= y < 63)
  if (y >= 51) {
    if (x < 24) return { code: 'ALA', label: 'Ala Esquerdo', role: 'LAT' };
    if (x > 76) return { code: 'ALA', label: 'Ala Direito', role: 'LAT' };
    if (x < 41) return { code: 'VOL', label: 'Volante Esquerdo', role: 'VOL' };
    if (x > 59) return { code: 'VOL', label: 'Volante Direito', role: 'VOL' };
    return { code: 'VOL', label: 'Primeiro Volante', role: 'VOL' };
  }

  // Central & Attacking Midfield (31 <= y < 51)
  if (y >= 31) {
    if (y >= 41) {
      if (x < 23) return { code: 'ME', label: 'Meia Esquerda', role: 'MEI' };
      if (x > 77) return { code: 'MD', label: 'Meia Direita', role: 'MEI' };
      if (x < 41) return { code: 'MC', label: 'Meia Central Esq.', role: 'MEI' };
      if (x > 59) return { code: 'MC', label: 'Meia Central Dir.', role: 'MEI' };
      return { code: 'MC', label: 'Meia Central', role: 'MEI' };
    }
    if (x < 25) return { code: 'ME', label: 'Meia-Aberto Esq.', role: 'MEI' };
    if (x > 75) return { code: 'MD', label: 'Meia-Aberto Dir.', role: 'MEI' };
    if (x < 41) return { code: 'MEI', label: 'Meia-Atacante Esq.', role: 'MEI' };
    if (x > 59) return { code: 'MEI', label: 'Meia-Atacante Dir.', role: 'MEI' };
    return { code: 'MEI', label: 'Meia Armador (10)', role: 'MEI' };
  }

  // Attacking Third (y < 31)
  if (x < 27) return { code: 'PE', label: 'Ponta Esquerda', role: 'ATA' };
  if (x > 73) return { code: 'PD', label: 'Ponta Direita', role: 'ATA' };
  if (y >= 22) {
    if (x < 41) return { code: 'SA', label: 'Seg. Atacante Esq.', role: 'ATA' };
    if (x > 59) return { code: 'SA', label: 'Seg. Atacante Dir.', role: 'ATA' };
    return { code: 'SA', label: 'Segundo Atacante', role: 'ATA' };
  }
  if (x < 41) return { code: 'ATA', label: 'Atacante Esquerdo', role: 'ATA' };
  if (x > 59) return { code: 'ATA', label: 'Atacante Direito', role: 'ATA' };
  return { code: 'CA', label: 'Centroavante', role: 'ATA' };
}

/**
 * Computes a live tactical shape (e.g. "4-3-3", "3-4-1-2", "4-2-3-1") from the 11 pitch coordinates.
 */
export function computeLiveFormationShape(
  coords: Array<{ x: number; y: number; isGk?: boolean }>
): string {
  if (!coords || coords.length === 0) return '4-3-3';
  // Exclude goalkeeper (lowest Y >= 82 or explicit isGk, max 1 excluded)
  const sortedByYDesc = [...coords].sort((a, b) => b.y - a.y);
  const outfield = sortedByYDesc.slice(1); // 10 outfield players

  const defCount = outfield.filter((c) => c.y >= 63).length;
  const volMcCount = outfield.filter((c) => c.y >= 42 && c.y < 63).length;
  const amCount = outfield.filter((c) => c.y >= 30 && c.y < 42).length;
  const attCount = outfield.filter((c) => c.y < 30).length;

  const lines = [defCount, volMcCount, amCount, attCount].filter((n) => n > 0);
  if (lines.length === 1) return `${lines[0]}`;
  return lines.join('-');
}

export interface DynamicPosOptions {
  defendsLeft: boolean;
  playerIndex?: number;
  minute?: number;
  hasPossession?: boolean;
  isNearestToBall?: boolean;
  inGameTactic?: InGameTacticOrder;
  goalkeeperDive?: {
    isDiving: boolean;
    targetY: number;
    angle: number;
  };
}

/**
 * Returns a short, readable display name for a player on the 2D pitch
 */
export function getPlayerShortName(player: Player): string {
  if (player.nickname && player.nickname.trim().length > 0) {
    return player.nickname;
  }
  const parts = player.name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    return parts[1];
  }
  return parts[parts.length - 1];
}

/**
 * Calculates base tactical coordinates (0-100%) for 11 starters on a horizontal pitch.
 * Respects custom user-defined pitchX / pitchY coordinates when set on a player!
 * @param starters List of active starters
 * @param defendsLeft True if team defends Left goal (X: 7%) and attacks Right (X: 95%)
 *                    False if team defends Right goal (X: 93%) and attacks Left (X: 5%)
 */
export function calculatePitchSlots(
  starters: Player[],
  defendsLeft: boolean
): Map<string, PitchPosition> {
  const positions = new Map<string, PitchPosition>();
  if (!starters || starters.length === 0) return positions;

  let remaining: Player[] = [];

  // First pass: map any starters who have custom pitchX & pitchY coordinates from PitchTacticsView
  for (const p of starters) {
    if (typeof p.pitchX === 'number' && typeof p.pitchY === 'number') {
      const isGkZone = p.pitchY >= 82 && p.pitchX >= 28 && p.pitchX <= 72;
      if (isGkZone) {
        positions.set(p.id, {
          baseX: defendsLeft ? 7 : 93,
          baseY: 50,
        });
      } else {
        // Vertical pitchY: 80 (deep defense) -> forwardRatio 0.07; 14 (deep attack) -> forwardRatio 0.98
        const forwardRatio = Math.max(0, Math.min(1, (84 - p.pitchY) / 70));
        const baseX = defendsLeft ? 16 + forwardRatio * 48 : 84 - forwardRatio * 48;
        const baseY = defendsLeft
          ? Math.max(10, Math.min(90, p.pitchX))
          : Math.max(10, Math.min(90, 100 - p.pitchX));
        positions.set(p.id, { baseX, baseY });
      }
    } else {
      remaining.push(p);
    }
  }

  if (remaining.length === 0) {
    return positions;
  }

  // Separate remaining non-custom starters by tactical lines
  const gks = remaining.filter((p) => p.position === 'GK' || p.detailedRole === 'GOL');
  const dfs = remaining.filter(
    (p) =>
      (p.position === 'DF' || p.detailedRole === 'ZAG' || p.detailedRole === 'LAT') &&
      !gks.some((g) => g.id === p.id)
  );
  const mfs = remaining.filter(
    (p) =>
      (p.position === 'MF' || p.detailedRole === 'VOL' || p.detailedRole === 'MEI') &&
      !gks.some((g) => g.id === p.id) &&
      !dfs.some((d) => d.id === p.id)
  );

  // Helper to space Y evenly
  const getYPositions = (count: number): number[] => {
    if (count <= 1) return [50];
    if (count === 2) return [32, 68];
    if (count === 3) return [22, 50, 78];
    if (count === 4) return [16, 38, 62, 84];
    if (count === 5) return [14, 32, 50, 68, 86];
    const step = 72 / Math.max(1, count - 1);
    return Array.from({ length: count }, (_, i) => 14 + i * step);
  };

  // 1. Goalkeeper (GK) - only if no custom GK was already placed
  const alreadyHasGk = Array.from(positions.values()).some((pos) =>
    defendsLeft ? pos.baseX <= 10 : pos.baseX >= 90
  );
  if (!alreadyHasGk) {
    const gk = gks[0] || remaining[0];
    if (gk) {
      positions.set(gk.id, {
        baseX: defendsLeft ? 7 : 93,
        baseY: 50,
      });
      remaining = remaining.filter((p) => p.id !== gk.id);
    }
  }

  // 2. Defenders
  const activeDfs = dfs.filter((p) => remaining.some((r) => r.id === p.id));
  const dfY = getYPositions(activeDfs.length);
  activeDfs.forEach((p, idx) => {
    const isLateral = p.detailedRole === 'LAT' || idx === 0 || idx === activeDfs.length - 1;
    const xOffset = isLateral ? (defendsLeft ? 3 : -3) : 0;
    positions.set(p.id, {
      baseX: (defendsLeft ? 21 : 79) + xOffset,
      baseY: dfY[idx] ?? 50,
    });
    remaining = remaining.filter((r) => r.id !== p.id);
  });

  // 3. Midfielders
  const activeMfs = mfs.filter((p) => remaining.some((r) => r.id === p.id));
  const mfY = getYPositions(activeMfs.length);
  activeMfs.forEach((p, idx) => {
    const isVol = p.detailedRole === 'VOL';
    const baseX = defendsLeft ? (isVol ? 34 : 44) : isVol ? 66 : 56;
    positions.set(p.id, {
      baseX,
      baseY: mfY[idx] ?? 50,
    });
    remaining = remaining.filter((r) => r.id !== p.id);
  });

  // 4. Forwards / Attackers
  const activeFws = remaining;
  const fwY = getYPositions(activeFws.length);
  activeFws.forEach((p, idx) => {
    positions.set(p.id, {
      baseX: defendsLeft ? 56 : 44,
      baseY: fwY[idx] ?? 50,
    });
  });

  return positions;
}

/**
 * Computes live, dynamic coordinates for a player based on ball location,
 * team attack direction, tactical line progression, ball carrying, and off-the-ball runs.
 * Honors custom tactical positioning (pitchX / pitchY) when defined on a player.
 */
export function calculateDynamicPlayerPos(
  baseX: number,
  baseY: number,
  player: Player,
  ballPos: { x: number; y: number },
  options?: DynamicPosOptions
): { x: number; y: number } {
  const defendsLeft = options?.defendsLeft ?? (baseX < 50);
  const playerIndex = options?.playerIndex ?? 0;
  const minute = options?.minute ?? 1;
  const isNearest = options?.isNearestToBall ?? false;
  const hasPossession = options?.hasPossession ?? false;

  const hasCustomCoords = typeof player.pitchX === 'number' && typeof player.pitchY === 'number';
  const customZone = hasCustomCoords
    ? inferTacticalZoneFromCoords(player.pitchX!, player.pitchY!)
    : null;

  const effectiveRole = customZone ? customZone.role : player.detailedRole;
  const isGk = hasCustomCoords
    ? customZone?.role === 'GOL'
    : player.position === 'GK' || player.detailedRole === 'GOL';
  const isDf = effectiveRole === 'ZAG' || effectiveRole === 'LAT' || (!hasCustomCoords && player.position === 'DF');
  const isLateral = effectiveRole === 'LAT';
  const isMf = effectiveRole === 'VOL' || effectiveRole === 'MEI' || (!hasCustomCoords && player.position === 'MF');
  const isFw = !isGk && !isDf && !isMf;

  // Progression of the play towards the opponent goal (0 = own goal line, 1 = opponent goal line)
  const attackProgression = defendsLeft
    ? Math.max(0, Math.min(1, ballPos.x / 100))
    : Math.max(0, Math.min(1, (100 - ballPos.x) / 100));

  // 1. Organic ambient off-the-ball movement (micro-movements, support runs)
  const timePhase = minute * 1.4 + playerIndex * 1.6;
  const ambientX = Math.sin(timePhase) * 2.4;
  const ambientY = Math.cos(timePhase * 0.85) * 2.0;

  // 2. Goalkeeper behavior
  if (isGk) {
    if (options?.goalkeeperDive?.isDiving) {
      const diveX = defendsLeft ? 8 : 92;
      return {
        x: diveX,
        y: Math.max(28, Math.min(72, options.goalkeeperDive.targetY)),
      };
    }
    const gkAdvance = attackProgression * 12;
    const targetX = defendsLeft ? 6 + gkAdvance : 94 - gkAdvance;
    const targetY = 50 + (ballPos.y - 50) * 0.45;
    const clampedY = Math.max(34, Math.min(66, targetY + ambientY * 0.5));
    return {
      x: Math.round(targetX * 10) / 10,
      y: Math.round(clampedY * 10) / 10,
    };
  }

  // 3. Ball carrier / Pressing nearest player
  if (isNearest) {
    if (hasPossession) {
      const leadX = defendsLeft ? -1.8 : 1.8;
      const leadY = Math.sin(timePhase * 2) * 1.2;
      return {
        x: Math.max(4, Math.min(96, Math.round((ballPos.x + leadX) * 10) / 10)),
        y: Math.max(8, Math.min(92, Math.round((ballPos.y + leadY) * 10) / 10)),
      };
    } else {
      const pressX = defendsLeft ? ballPos.x - 3.2 : ballPos.x + 3.2;
      return {
        x: Math.max(4, Math.min(96, Math.round(pressX * 10) / 10)),
        y: Math.max(8, Math.min(92, Math.round(ballPos.y * 10) / 10)),
      };
    }
  }

  // 4. Team Bloc Movement across the field
  let dynamicX = baseX;
  let dynamicY = baseY;

  if (hasCustomCoords) {
    // Anchor directly around the user's custom baseX / baseY while shifting dynamically with play progression
    const blocShift = (attackProgression - 0.35) * 38;
    dynamicX = baseX + (defendsLeft ? blocShift : -blocShift) + ambientX;
    dynamicY = baseY + (ballPos.y - baseY) * 0.24 + ambientY;
  } else if (isDf) {
    if (defendsLeft) {
      const push = isLateral ? attackProgression * 42 : attackProgression * 30;
      const retreat = (1 - attackProgression) * 8;
      dynamicX = 14 + push - retreat + ambientX;
    } else {
      const push = isLateral ? attackProgression * 42 : attackProgression * 30;
      const retreat = (1 - attackProgression) * 8;
      dynamicX = 86 - push + retreat + ambientX;
    }
    dynamicY = baseY + (ballPos.y - 50) * 0.22 + ambientY;
  } else if (isMf) {
    if (defendsLeft) {
      const push = attackProgression * 44;
      const retreat = (1 - attackProgression) * 10;
      dynamicX = 24 + push - retreat + ambientX;
    } else {
      const push = attackProgression * 44;
      const retreat = (1 - attackProgression) * 10;
      dynamicX = 76 - push + retreat + ambientX;
    }
    dynamicY = baseY + (ballPos.y - baseY) * 0.32 + ambientY;
  } else {
    if (defendsLeft) {
      const push = attackProgression * 42;
      dynamicX = 44 + push + ambientX;
    } else {
      const push = attackProgression * 42;
      dynamicX = 56 - push + ambientX;
    }
    const farPostRun = (playerIndex % 2 === 0 ? 1 : -1) * (attackProgression > 0.65 ? 8 : 0);
    dynamicY = baseY + (ballPos.y - baseY) * 0.38 + farPostRun + ambientY;
  }

  // Apply In-Game Touchline Tactical Order Shifts
  const tactic = options?.inGameTactic;
  if (tactic === 'PRESSAO_TOTAL') {
    const shift = defendsLeft ? 6 : -6;
    dynamicX += shift;
  } else if (tactic === 'RETRANCA') {
    const shift = defendsLeft ? -7 : 7;
    dynamicX += shift;
  } else if (tactic === 'CHUVEIRINHO') {
    if (isFw || isMf) {
      const shift = defendsLeft ? 8 : -8;
      dynamicX += shift;
    }
  } else if (tactic === 'CONTRA_ATAQUE') {
    if (isFw) {
      const shift = defendsLeft ? 5 : -5;
      dynamicX += shift;
    } else if (isDf) {
      const shift = defendsLeft ? -4 : 4;
      dynamicX += shift;
    }
  } else if (tactic === 'SEGURAR_RESULTADO') {
    const shift = defendsLeft ? -4 : 4;
    dynamicX += shift;
  }

  // Soft attraction towards ball for tactical compactness
  const pullToBallX = (ballPos.x - dynamicX) * 0.12;
  const finalX = dynamicX + pullToBallX;

  // Strict boundary clamping so players stay within the pitch lines
  const clampedX = Math.max(5, Math.min(95, Math.round(finalX * 10) / 10));
  const clampedY = Math.max(9, Math.min(91, Math.round(dynamicY * 10) / 10));

  return { x: clampedX, y: clampedY };
}

import React, { useState, useRef, useMemo } from 'react';
import {
  Club,
  Player,
  FormationType,
  CompetitionType,
  SavedLineupProfile,
} from '../types/game';
import { soundEngine } from '../services/soundEngine';
import {
  Sparkles,
  ArrowLeftRight,
  Move,
  CheckCircle2,
  UserPlus,
  UserMinus,
  RotateCcw,
  Crosshair,
  Bot,
  AlertTriangle,
  Wand2,
  HeartPulse,
  ShieldAlert,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import {
  isPlayerSuspendedInCompetition,
  getPlayerSuspensionInCompetition,
} from '../utils/suspensionEngine';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import {
  TACTICAL_PITCH_ZONES,
  TacticalPitchZone,
  inferTacticalZoneFromCoords,
  computeLiveFormationShape,
} from '../utils/matchPitchLayout';
import {
  formatPlayerNationalityFull,
  formatPlayerNationalityShort,
} from '../utils/nationalityUtils';
import { buildAssistantOptimalLineup } from '../utils/assistantLineupEngine';
import {
  buildFixedUnavailableLineup,
  buildRotatedRestedLineup,
  inspectPreMatchReadiness,
} from '../utils/quickLineupEngine';
import {
  evaluatePlayerSlotFit,
  FORMATION_PITCH_SLOTS,
  getPlayerVersatilityProfile,
  resolveClubLineupTacticalReport,
} from '../utils/tacticalPositioningEngine';
import { getClubSectorRatings } from '../utils/clubRatingsEngine';
import { comparePlayersByPosition } from '../utils/playerOrdering';
import { PlayerAvatar } from './PlayerAvatar';
import { ScrollableTabStrip } from './ScrollableTabStrip';
import { usePlayerInspection } from '../context/PlayerInspectionContext';

const MAX_BENCH_PLAYERS = 11;

interface PitchTacticsViewProps {
  club: Club;
  upcomingCompetition?: CompetitionType;
  onUpdateSquad: (updatedSquad: Player[]) => void;
  onUpdateFormation: (formation: FormationType) => void;
  onSaveLineupProfile?: (slot: 'A' | 'B') => void;
  onLoadLineupProfile?: (profile: SavedLineupProfile) => void;
}

const FORMATIONS: FormationType[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-3'];

export const PitchTacticsView: React.FC<PitchTacticsViewProps> = ({
  club,
  upcomingCompetition,
  onUpdateSquad,
  onUpdateFormation,
  onSaveLineupProfile,
  onLoadLineupProfile,
}) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const inspection = usePlayerInspection();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [showPitchZones, setShowPitchZones] = useState<boolean>(true);
  const [dragGrassCoords, setDragGrassCoords] = useState<{ x: number; y: number } | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const currentCoords = FORMATION_PITCH_SLOTS[club.tactics.formation] || FORMATION_PITCH_SLOTS['4-3-3'];

  const tacticalReport = useMemo(() => resolveClubLineupTacticalReport(club), [club]);
  const clubSectors = useMemo(() => getClubSectorRatings(club), [club]);

  // Map starters to the 11 tactical slots cleanly using the shared tactical report
  const starterSlots: (Player | null)[] = useMemo(
    () => tacticalReport.slotAssignments.map((a) => (a ? a.player : null)),
    [tacticalReport]
  );

  // Effective pitch coordinates for each of the 11 slots (respects custom pitchX / pitchY!)
  const resolvedSlotPositions = useMemo(() => {
    return currentCoords.map((preset, slotIdx) => {
      const occupant = starterSlots[slotIdx];
      if (occupant && typeof occupant.pitchX === 'number' && typeof occupant.pitchY === 'number') {
        const inferred = inferTacticalZoneFromCoords(occupant.pitchX, occupant.pitchY);
        return {
          x: occupant.pitchX,
          y: occupant.pitchY,
          role: inferred.role,
          code: occupant.pitchRoleCode || inferred.code,
          label: inferred.label,
          isCustom: true,
        };
      }
      return {
        x: preset.x,
        y: preset.y,
        role: preset.role,
        code: preset.code,
        label: preset.label,
        isCustom: false,
      };
    });
  }, [currentCoords, starterSlots]);

  const hasCustomPositioning = useMemo(
    () => club.squad.some((p) => p.isStarter && typeof p.pitchX === 'number' && typeof p.pitchY === 'number'),
    [club.squad]
  );

  const avgStarterCondition = useMemo(() => {
    const active = starterSlots.filter((p): p is Player => Boolean(p));
    if (active.length === 0) return 100;
    return Math.round(active.reduce((sum, p) => sum + (p.condition ?? 100), 0) / active.length);
  }, [starterSlots]);

  const liveFormationShape = useMemo(() => {
    const activeCoords = resolvedSlotPositions.map((pos) => ({
      x: pos.x,
      y: pos.y,
      isGk: pos.role === 'GOL',
    }));
    return computeLiveFormationShape(activeCoords);
  }, [resolvedSlotPositions]);

  // Filter tactical zones so we only render unoccupied markers (where no starter/slot is already sitting within 6.4%)
  const availablePitchZones = useMemo(() => {
    return TACTICAL_PITCH_ZONES.filter((zone) => {
      const occupiedNearby = resolvedSlotPositions.some((slotPos, idx) => {
        const hasPlayer = starterSlots[idx] !== null;
        // Hide zone if an occupied starter or empty preset slot is already at this exact spot
        const threshold = hasPlayer ? 6.4 : 5.5;
        return Math.hypot(slotPos.x - zone.x, slotPos.y - zone.y) < threshold;
      });
      return !occupiedNearby;
    });
  }, [resolvedSlotPositions, starterSlots]);

  const substitutes = useMemo(
    () =>
      club.squad
        .filter((p) => p.isSubstitute && !p.isStarter)
        .sort((a, b) => comparePlayersByPosition(a, b)),
    [club.squad]
  );
  const reserves = useMemo(
    () =>
      club.squad
        .filter((p) => !p.isStarter && !p.isSubstitute)
        .sort((a, b) => comparePlayersByPosition(a, b)),
    [club.squad]
  );

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const isPlayerIneligible = (player: Player): string | null => {
    if (player.injuryWeeks > 0 || player.injuryDetails) {
      return `${player.name} está no Departamento Médico (${player.injuryDetails?.injuryType || 'Lesionado'}) e não pode ser relacionado!`;
    }
    const isSuspendedInUpcoming = upcomingCompetition
      ? isPlayerSuspendedInCompetition(player, upcomingCompetition)
      : isPlayerSuspendedInCompetition(player);

    if (isSuspendedInUpcoming) {
      const susp = upcomingCompetition
        ? getPlayerSuspensionInCompetition(player, upcomingCompetition)
        : player.suspensions?.find((s) => s.matchesRemaining > 0);
      const compMeta = susp ? COMPETITIONS_CATALOG[susp.competition] : null;
      const compName = compMeta ? compMeta.shortName : 'campeonato';
      const reasonText = susp?.reason === 'RED_CARD' ? 'Cartão Vermelho' : '3º Cartão Amarelo';
      return `${player.name} está suspenso no ${compName} (${reasonText}) e não pode ser relacionado!`;
    }
    return null;
  };

  // Avoid overlapping two starters when dropping on free grass
  const resolveNonOverlappingCoords = (
    rawX: number,
    rawY: number,
    movingPlayerId: string
  ): { x: number; y: number } => {
    let x = Math.max(9, Math.min(91, Math.round(rawX * 10) / 10));
    let y = Math.max(11, Math.min(90, Math.round(rawY * 10) / 10));

    for (let i = 0; i < resolvedSlotPositions.length; i++) {
      const other = starterSlots[i];
      if (!other || other.id === movingPlayerId) continue;
      const pos = resolvedSlotPositions[i];
      const dx = x - pos.x;
      const dy = y - pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 7.5) {
        const angle = dist === 0 ? 0 : Math.atan2(dy, dx);
        x = Math.max(9, Math.min(91, Math.round((pos.x + Math.cos(angle) * 8) * 10) / 10));
        y = Math.max(11, Math.min(90, Math.round((pos.y + Math.sin(angle) * 8) * 10) / 10));
      }
    }
    return { x, y };
  };

  // --- CORE CUSTOM POSITION PLACEMENT (Zones or Free Grass) ---
  const placePlayerAtCustomPitchCoords = (
    playerId: string,
    targetX: number,
    targetY: number,
    explicitCode?: string,
    explicitLabel?: string
  ) => {
    const movingPlayer = club.squad.find((p) => p.id === playerId);
    if (!movingPlayer) return;

    const ineligibilityMsg = isPlayerIneligible(movingPlayer);
    if (ineligibilityMsg) {
      soundEngine.playWhistle(false);
      showFeedback(ineligibilityMsg);
      setDraggedPlayerId(null);
      setSelectedPlayerId(null);
      setDragGrassCoords(null);
      return;
    }

    const cleanCoords = resolveNonOverlappingCoords(targetX, targetY, movingPlayer.id);
    const inferred = inferTacticalZoneFromCoords(cleanCoords.x, cleanCoords.y);
    const roleCode = explicitCode || inferred.code;
    const roleLabel = explicitLabel || inferred.label;

    soundEngine.playClick();

    const currentSlotIdx = starterSlots.findIndex((s) => s?.id === movingPlayer.id);

    if (currentSlotIdx !== -1) {
      // Player is ALREADY a starter on the pitch -> Move them freely to the exact new spot!
      const updatedSquad = club.squad.map((p) => {
        if (p.id === movingPlayer.id) {
          return {
            ...p,
            isStarter: true,
            isSubstitute: false,
            pitchSlot: currentSlotIdx,
            pitchX: cleanCoords.x,
            pitchY: cleanCoords.y,
            pitchRoleCode: roleCode,
          };
        }
        return p;
      });

      onUpdateSquad(updatedSquad);
      showFeedback(`${movingPlayer.name} posicionado em ${roleLabel} (${roleCode}).`);
    } else {
      // Player came from Bench or Não Relacionados and was dropped onto a custom pitch spot!
      const emptySlotIdx = starterSlots.findIndex((s) => s === null);

      if (emptySlotIdx !== -1) {
        // Fill the open starter slot at the custom position
        const updatedSquad = club.squad.map((p) => {
          if (p.id === movingPlayer.id) {
            return {
              ...p,
              isStarter: true,
              isSubstitute: false,
              pitchSlot: emptySlotIdx,
              pitchX: cleanCoords.x,
              pitchY: cleanCoords.y,
              pitchRoleCode: roleCode,
            };
          }
          return p;
        });
        onUpdateSquad(updatedSquad);
        showFeedback(`${movingPlayer.name} escalado em ${roleLabel} (${roleCode}).`);
      } else {
        // All 11 starter slots are full: swap with the GK (if dropped in GK box) or nearest outfield starter
        let replaceSlotIdx = 0;
        if (inferred.role === 'GOL') {
          const gkSlot = resolvedSlotPositions.findIndex((pos) => pos.role === 'GOL');
          replaceSlotIdx = gkSlot !== -1 ? gkSlot : 0;
        } else {
          let bestDist = Infinity;
          resolvedSlotPositions.forEach((pos, idx) => {
            if (pos.role === 'GOL') return;
            const d = Math.hypot(pos.x - cleanCoords.x, pos.y - cleanCoords.y);
            if (d < bestDist) {
              bestDist = d;
              replaceSlotIdx = idx;
            }
          });
        }

        const replacedStarter = starterSlots[replaceSlotIdx];
        const wasSub = movingPlayer.isSubstitute;

        // Recompute non-overlapping ignoring replacedStarter so movingPlayer lands cleanly on the target
        const exactX = Math.max(9, Math.min(91, Math.round(targetX * 10) / 10));
        const exactY = Math.max(11, Math.min(90, Math.round(targetY * 10) / 10));

        const updatedSquad = club.squad.map((p) => {
          if (p.id === movingPlayer.id) {
            return {
              ...p,
              isStarter: true,
              isSubstitute: false,
              pitchSlot: replaceSlotIdx,
              pitchX: exactX,
              pitchY: exactY,
              pitchRoleCode: roleCode,
            };
          }
          if (replacedStarter && p.id === replacedStarter.id) {
            return {
              ...p,
              isStarter: false,
              isSubstitute: wasSub,
              pitchSlot: undefined,
              pitchX: undefined,
              pitchY: undefined,
              pitchRoleCode: undefined,
            };
          }
          return p;
        });

        onUpdateSquad(updatedSquad);
        showFeedback(
          `${movingPlayer.name} entrou em ${roleLabel} (${roleCode})${
            replacedStarter ? ` no lugar de ${replacedStarter.name}` : ''
          }.`
        );
      }
    }

    setDraggedPlayerId(null);
    setSelectedPlayerId(null);
    setHoverTarget(null);
    setDragGrassCoords(null);
  };

  // Reset custom coordinates back to the active formation's clean geometry
  const handleResetCustomPositions = () => {
    soundEngine.playClick();
    const updated = club.squad.map((p) => ({
      ...p,
      pitchX: undefined,
      pitchY: undefined,
      pitchRoleCode: undefined,
    }));
    onUpdateSquad(updated);
    showFeedback(`Posições alinhadas ao desenho padrão ${club.tactics.formation}.`);
  };

  // --- DRAG & DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, player: Player) => {
    setDraggedPlayerId(player.id);
    e.dataTransfer.setData('text/plain', player.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPlayerId(null);
    setHoverTarget(null);
    setDragGrassCoords(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Dragging over open pitch grass -> compute live % coordinates
  const getPitchPercentFromEvent = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!pitchRef.current) return null;
    const rect = pitchRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const pctX = ((clientX - rect.left) / rect.width) * 100;
    const pctY = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(8, Math.min(92, pctX)),
      y: Math.max(10, Math.min(91, pctY)),
    };
  };

  const handlePitchDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const coords = getPitchPercentFromEvent(e.clientX, e.clientY);
    if (coords) {
      setDragGrassCoords(coords);
    }
  };

  const handlePitchDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragGrassCoords(null);
    }
  };

  // Drop anywhere on open grass
  const handleDropOnPitchGrass = (e: React.DragEvent) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    setDragGrassCoords(null);
    setHoverTarget(null);
    if (!playerId) return;

    const coords = getPitchPercentFromEvent(e.clientX, e.clientY);
    if (!coords) return;

    // Check if dropped right on top of an existing starter slot (within 5.2%) -> swap with that slot
    const hitSlotIdx = resolvedSlotPositions.findIndex(
      (pos) => Math.hypot(pos.x - coords.x, pos.y - coords.y) < 5.2
    );
    if (hitSlotIdx !== -1 && starterSlots[hitSlotIdx]?.id !== playerId) {
      assignPlayerToSlot(playerId, hitSlotIdx);
      return;
    }

    // Check if dropped very close to a tactical zone marker (within 4.2%) -> snap cleanly to zone
    const nearZone = availablePitchZones.find(
      (z) => Math.hypot(z.x - coords.x, z.y - coords.y) < 4.2
    );
    if (nearZone) {
      placePlayerAtCustomPitchCoords(playerId, nearZone.x, nearZone.y, nearZone.code, nearZone.label);
      return;
    }

    placePlayerAtCustomPitchCoords(playerId, coords.x, coords.y);
  };

  // Drop on a Tactical Pitch Zone Marker
  const handleDropOnZone = (e: React.DragEvent, zone: TacticalPitchZone) => {
    e.preventDefault();
    e.stopPropagation();
    setHoverTarget(null);
    setDragGrassCoords(null);
    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    if (!playerId) return;

    placePlayerAtCustomPitchCoords(playerId, zone.x, zone.y, zone.code, zone.label);
  };

  // Drop on an existing Starter / Pitch Slot (0 to 10)
  const handleDropOnSlot = (e: React.DragEvent, targetSlotIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setHoverTarget(null);
    setDragGrassCoords(null);
    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    if (!playerId) return;

    assignPlayerToSlot(playerId, targetSlotIdx);
  };

  // Add a reserve directly to the 11-player bench
  const handleAddPlayerToBench = (player: Player) => {
    const ineligibilityMsg = isPlayerIneligible(player);
    if (ineligibilityMsg) {
      soundEngine.playWhistle(false);
      showFeedback(ineligibilityMsg);
      return;
    }

    const currentSubs = club.squad.filter((p) => p.isSubstitute && !p.isStarter);
    if (currentSubs.length >= MAX_BENCH_PLAYERS) {
      soundEngine.playWhistle(false);
      showFeedback(`O banco de reservas já está completo (${MAX_BENCH_PLAYERS}/${MAX_BENCH_PLAYERS}). Remova ou troque um atleta.`);
      return;
    }

    soundEngine.playClick();
    const updated = club.squad.map((p) =>
      p.id === player.id
        ? {
            ...p,
            isStarter: false,
            isSubstitute: true,
            pitchSlot: undefined,
            pitchX: undefined,
            pitchY: undefined,
            pitchRoleCode: undefined,
          }
        : p
    );
    onUpdateSquad(updated);
    setSelectedPlayerId(null);
    showFeedback(`${player.name} adicionado ao banco de reservas (${currentSubs.length + 1}/${MAX_BENCH_PLAYERS}).`);
  };

  // Remove a player from the bench to Não Relacionados
  const handleRemovePlayerFromBench = (player: Player) => {
    soundEngine.playClick();
    const updated = club.squad.map((p) =>
      p.id === player.id
        ? {
            ...p,
            isStarter: false,
            isSubstitute: false,
            pitchSlot: undefined,
            pitchX: undefined,
            pitchY: undefined,
            pitchRoleCode: undefined,
          }
        : p
    );
    onUpdateSquad(updated);
    if (selectedPlayerId === player.id) setSelectedPlayerId(null);
    showFeedback(`${player.name} movido para Não Relacionados.`);
  };

  // Auto-fill remaining open bench slots up to 11 without changing the 11 starters
  const handleFillBenchToEleven = () => {
    soundEngine.playClick();
    const currentSubs = club.squad.filter((p) => p.isSubstitute && !p.isStarter);
    const slotsAvailable = MAX_BENCH_PLAYERS - currentSubs.length;
    if (slotsAvailable <= 0) return;

    const eligibleReserves = club.squad
      .filter((p) => !p.isStarter && !p.isSubstitute && !isPlayerIneligible(p))
      .sort((a, b) => b.overall - a.overall);

    if (eligibleReserves.length === 0) {
      showFeedback('Não há jogadores aptos disponíveis entre os Não Relacionados.');
      return;
    }

    const hasBenchGk = currentSubs.some((p) => p.position === 'GK');
    const chosenIds = new Set<string>();

    if (!hasBenchGk) {
      const bestGk = eligibleReserves.find((p) => p.position === 'GK');
      if (bestGk) chosenIds.add(bestGk.id);
    }

    for (const candidate of eligibleReserves) {
      if (chosenIds.size >= slotsAvailable) break;
      chosenIds.add(candidate.id);
    }

    const updated = club.squad.map((p) =>
      chosenIds.has(p.id)
        ? {
            ...p,
            isStarter: false,
            isSubstitute: true,
            pitchSlot: undefined,
            pitchX: undefined,
            pitchY: undefined,
            pitchRoleCode: undefined,
          }
        : p
    );

    onUpdateSquad(updated);
    showFeedback(`Banco completado com ${currentSubs.length + chosenIds.size}/${MAX_BENCH_PLAYERS} reservas aptos!`);
  };

  // Drop on Bench (up to 11 substitutes)
  const handleDropOnBench = (e: React.DragEvent, targetSubPlayer?: Player) => {
    e.preventDefault();
    e.stopPropagation();
    setHoverTarget(null);
    setDragGrassCoords(null);
    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    if (!playerId) return;

    const dragged = club.squad.find((p) => p.id === playerId);
    if (!dragged) return;

    const ineligibilityMsg = isPlayerIneligible(dragged);
    if (ineligibilityMsg) {
      soundEngine.playWhistle(false);
      showFeedback(ineligibilityMsg);
      setDraggedPlayerId(null);
      setSelectedPlayerId(null);
      return;
    }

    soundEngine.playClick();

    if (targetSubPlayer && targetSubPlayer.id !== dragged.id) {
      const draggedSlot = starterSlots.findIndex((s) => s?.id === dragged.id);
      if (draggedSlot !== -1) {
        const subIneligible = isPlayerIneligible(targetSubPlayer);
        if (subIneligible) {
          soundEngine.playWhistle(false);
          showFeedback(subIneligible);
          setDraggedPlayerId(null);
          setSelectedPlayerId(null);
          return;
        }
      }

      const updated = club.squad.map((p) => {
        if (p.id === dragged.id) {
          return {
            ...p,
            isStarter: false,
            isSubstitute: true,
            pitchSlot: undefined,
            pitchX: undefined,
            pitchY: undefined,
            pitchRoleCode: undefined,
          };
        }
        if (p.id === targetSubPlayer.id) {
          return {
            ...p,
            isStarter: draggedSlot !== -1,
            isSubstitute: draggedSlot === -1 ? dragged.isSubstitute : false,
            pitchSlot: draggedSlot !== -1 ? draggedSlot : undefined,
            pitchX: draggedSlot !== -1 ? dragged.pitchX : undefined,
            pitchY: draggedSlot !== -1 ? dragged.pitchY : undefined,
            pitchRoleCode: draggedSlot !== -1 ? dragged.pitchRoleCode : undefined,
          };
        }
        return p;
      });
      onUpdateSquad(updated);
      showFeedback(`${dragged.name} entrou no banco no lugar de ${targetSubPlayer.name}!`);
    } else if (!dragged.isSubstitute) {
      const currentSubs = club.squad.filter((p) => p.isSubstitute && !p.isStarter && p.id !== dragged.id);
      let bumpedPlayerId: string | null = null;
      if (currentSubs.length >= MAX_BENCH_PLAYERS) {
        bumpedPlayerId = currentSubs[currentSubs.length - 1].id;
      }

      const updated = club.squad.map((p) => {
        if (p.id === dragged.id) {
          return {
            ...p,
            isStarter: false,
            isSubstitute: true,
            pitchSlot: undefined,
            pitchX: undefined,
            pitchY: undefined,
            pitchRoleCode: undefined,
          };
        }
        if (bumpedPlayerId && p.id === bumpedPlayerId) {
          return { ...p, isSubstitute: false };
        }
        return p;
      });
      onUpdateSquad(updated);
      showFeedback(
        `${dragged.name} relacionado para o banco de reservas (${Math.min(
          MAX_BENCH_PLAYERS,
          currentSubs.length + 1
        )}/${MAX_BENCH_PLAYERS}).`
      );
    }

    setDraggedPlayerId(null);
    setSelectedPlayerId(null);
  };

  // Drop on Non-related (Não Relacionados)
  const handleDropOnReserves = (e: React.DragEvent) => {
    e.preventDefault();
    setHoverTarget(null);
    setDragGrassCoords(null);
    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    if (!playerId) return;

    soundEngine.playClick();
    const dragged = club.squad.find((p) => p.id === playerId);
    if (!dragged) return;

    const updated = club.squad.map((p) => {
      if (p.id === dragged.id) {
        return {
          ...p,
          isStarter: false,
          isSubstitute: false,
          pitchSlot: undefined,
          pitchX: undefined,
          pitchY: undefined,
          pitchRoleCode: undefined,
        };
      }
      return p;
    });

    onUpdateSquad(updated);
    showFeedback(`${dragged.name} retirado da lista de relacionados.`);
    setDraggedPlayerId(null);
    setSelectedPlayerId(null);
  };

  // Core function to assign or swap a player with one of the 11 starter slots
  const assignPlayerToSlot = (playerId: string, targetSlotIdx: number) => {
    const dragged = club.squad.find((p) => p.id === playerId);
    if (!dragged) return;

    const ineligibilityMsg = isPlayerIneligible(dragged);
    if (ineligibilityMsg) {
      soundEngine.playWhistle(false);
      showFeedback(ineligibilityMsg);
      setDraggedPlayerId(null);
      setSelectedPlayerId(null);
      return;
    }

    const occupant = starterSlots[targetSlotIdx];
    if (occupant?.id === dragged.id) {
      setDraggedPlayerId(null);
      setSelectedPlayerId(null);
      return;
    }

    soundEngine.playClick();

    const currentSlotIdx = starterSlots.findIndex((s) => s?.id === dragged.id);
    const targetSlotInfo = resolvedSlotPositions[targetSlotIdx];

    let updatedSquad: Player[] = [];

    if (currentSlotIdx !== -1) {
      // Both are starters -> SWAP both pitchSlot AND any custom pitchX/pitchY coordinates!
      const sourceSlotInfo = resolvedSlotPositions[currentSlotIdx];
      updatedSquad = club.squad.map((p) => {
        if (p.id === dragged.id) {
          return {
            ...p,
            isStarter: true,
            isSubstitute: false,
            pitchSlot: targetSlotIdx,
            pitchX: occupant ? occupant.pitchX : undefined,
            pitchY: occupant ? occupant.pitchY : undefined,
            pitchRoleCode: occupant ? occupant.pitchRoleCode : undefined,
          };
        }
        if (occupant && p.id === occupant.id) {
          return {
            ...p,
            isStarter: true,
            isSubstitute: false,
            pitchSlot: currentSlotIdx,
            pitchX: dragged.pitchX,
            pitchY: dragged.pitchY,
            pitchRoleCode: dragged.pitchRoleCode,
          };
        }
        return p;
      });

      showFeedback(
        `Posições trocadas: ${dragged.name} (${targetSlotInfo.code}) ⇄ ${
          occupant ? `${occupant.name} (${sourceSlotInfo.code})` : 'Vaga'
        }.`
      );
    } else {
      // Dragged player came from bench or reserves -> inherit occupant's custom spot if any!
      const wasSubstitute = dragged.isSubstitute;

      updatedSquad = club.squad.map((p) => {
        if (p.id === dragged.id) {
          return {
            ...p,
            isStarter: true,
            isSubstitute: false,
            pitchSlot: targetSlotIdx,
            pitchX: occupant?.pitchX,
            pitchY: occupant?.pitchY,
            pitchRoleCode: occupant?.pitchRoleCode,
          };
        }
        if (occupant && p.id === occupant.id) {
          return {
            ...p,
            isStarter: false,
            isSubstitute: wasSubstitute,
            pitchSlot: undefined,
            pitchX: undefined,
            pitchY: undefined,
            pitchRoleCode: undefined,
          };
        }
        return p;
      });

      showFeedback(`${dragged.name} escalado como ${targetSlotInfo.label} (${targetSlotInfo.code})!`);
    }

    onUpdateSquad(updatedSquad);
    setDraggedPlayerId(null);
    setSelectedPlayerId(null);
  };

  // Click-to-swap fallback for touch / accessibility
  const handlePlayerClick = (clickedPlayer: Player) => {
    soundEngine.playClick();

    if (!selectedPlayerId) {
      setSelectedPlayerId(clickedPlayer.id);
      return;
    }

    if (selectedPlayerId === clickedPlayer.id) {
      setSelectedPlayerId(null);
      return;
    }

    const starterSlotIdx = starterSlots.findIndex((s) => s?.id === clickedPlayer.id);
    if (starterSlotIdx !== -1) {
      assignPlayerToSlot(selectedPlayerId, starterSlotIdx);
    } else {
      const selected = club.squad.find((p) => p.id === selectedPlayerId);
      const selectedSlotIdx = starterSlots.findIndex((s) => s?.id === selected?.id);

      if (selected && selectedSlotIdx !== -1) {
        assignPlayerToSlot(clickedPlayer.id, selectedSlotIdx);
      } else if (selected) {
        const updated = club.squad.map((p) => {
          if (p.id === selectedPlayerId) {
            return {
              ...p,
              isStarter: clickedPlayer.isStarter,
              isSubstitute: clickedPlayer.isSubstitute,
            };
          }
          if (p.id === clickedPlayer.id) {
            return {
              ...p,
              isStarter: selected.isStarter,
              isSubstitute: selected.isSubstitute,
            };
          }
          return p;
        });
        onUpdateSquad(updated);
        setSelectedPlayerId(null);
      }
    }
  };

  // Click on open pitch grass while a player is selected -> place at clicked spot!
  const handlePitchGrassClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedPlayerId) return;
    const coords = getPitchPercentFromEvent(e.clientX, e.clientY);
    if (!coords) return;
    placePlayerAtCustomPitchCoords(selectedPlayerId, coords.x, coords.y);
  };

  const readiness = useMemo(
    () => inspectPreMatchReadiness(club, upcomingCompetition),
    [club, upcomingCompetition]
  );

  const savedProfileA = useMemo(
    () => (club.savedLineups || []).find((p) => p.slot === 'A') || null,
    [club.savedLineups]
  );
  const savedProfileB = useMemo(
    () => (club.savedLineups || []).find((p) => p.slot === 'B') || null,
    [club.savedLineups]
  );

  // Auto-escalar Inteligente: Põe cada jogador na sua melhor posição considerando Forma Física + Overall
  const handleAutoPick = () => {
    soundEngine.playClick();
    const optimal = buildAssistantOptimalLineup(club, upcomingCompetition);
    onUpdateSquad(optimal.updatedSquad);
    setSelectedPlayerId(null);
    showFeedback(
      `Assistente IA escalou no ${club.tactics.formation}: OVR ${optimal.avgOverall} · Forma Física ${optimal.avgCondition}% (${optimal.substitutes.length}/${MAX_BENCH_PLAYERS} reservas)!`
    );
  };

  // Rodízio 1-Clique: Poupar titulares cansados (<75%) e corrigir lesionados/suspensos
  const handleRotateTired = () => {
    soundEngine.playClick();
    const result = buildRotatedRestedLineup(club, upcomingCompetition, 75);
    onUpdateSquad(result.updatedSquad);
    setSelectedPlayerId(null);
    showFeedback(result.summaryText);
  };

  // Corrigir Indisponíveis 1-Clique: Troca apenas lesionados/suspensos mantendo o resto do time
  const handleFixUnavailable = () => {
    soundEngine.playClick();
    const result = buildFixedUnavailableLineup(club, upcomingCompetition);
    onUpdateSquad(result.updatedSquad);
    setSelectedPlayerId(null);
    showFeedback(result.summaryText);
  };

  const getOverallColor = (ovr: number) => {
    if (ovr >= 84) return 'bg-sky-400 text-slate-950 font-black';
    if (ovr >= 79) return 'bg-cyan-400 text-slate-950 font-bold';
    if (ovr >= 74) return 'bg-sky-600 text-white font-bold';
    return 'bg-slate-700 text-slate-200';
  };

  const getZoneSectorStyle = (sector: TacticalPitchZone['sector'], isHovered: boolean, isHighlighted: boolean) => {
    if (isHovered) {
      return 'border-sky-300 bg-sky-400/35 text-white ring-4 ring-sky-400/60 scale-115 shadow-lg shadow-sky-500/40';
    }
    if (isHighlighted) {
      switch (sector) {
        case 'FW':
          return 'border-cyan-400/70 bg-cyan-950/55 text-cyan-200 hover:border-cyan-300 hover:bg-cyan-900/60';
        case 'MF':
          return 'border-sky-400/70 bg-sky-950/55 text-sky-200 hover:border-sky-300 hover:bg-sky-900/60';
        case 'DF':
          return 'border-emerald-400/70 bg-emerald-950/55 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-900/60';
        default:
          return 'border-amber-400/70 bg-amber-950/55 text-amber-200 hover:border-amber-300 hover:bg-amber-900/60';
      }
    }
    return 'border-sky-400/30 bg-slate-950/50 text-sky-300/75 hover:border-sky-300 hover:bg-sky-950/70 hover:text-white';
  };

  const selectedPlayer = club.squad.find((p) => p.id === selectedPlayerId);
  const draggedPlayer = club.squad.find((p) => p.id === draggedPlayerId);
  const activeMovingPlayer = draggedPlayer || selectedPlayer || null;
  const isInteractingWithPlayer = Boolean(activeMovingPlayer);
  const shouldRenderZones = showPitchZones || isInteractingWithPlayer;

  const selectedPlayerAssignment = useMemo(() => {
    if (!selectedPlayer) return null;
    return tacticalReport.assignmentByPlayerId.get(selectedPlayer.id) || null;
  }, [selectedPlayer, tacticalReport]);

  const liveGhostInfo = useMemo(() => {
    if (!dragGrassCoords || hoverTarget?.startsWith('slot-') || hoverTarget?.startsWith('zone-')) {
      return null;
    }
    const inferred = inferTacticalZoneFromCoords(dragGrassCoords.x, dragGrassCoords.y);
    const fit = draggedPlayer
      ? evaluatePlayerSlotFit(draggedPlayer, inferred.role, inferred.code, inferred.label)
      : null;
    return {
      ...dragGrassCoords,
      ...inferred,
      fit,
    };
  }, [dragGrassCoords, hoverTarget, draggedPlayer]);

  const totalWrongOrCritical =
    tacticalReport.wrongPositionCount + tacticalReport.criticalCount;

  return (
    <div className="space-y-4">
      {/* Top Controls: Formations, Tactical Zones Toggle, Reset & Auto Escalar + Live Sector Ratings */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Formation Picker */}
          <ScrollableTabStrip
            activeKey={club.tactics.formation}
            ariaLabel="Esquemas táticos"
            className="w-full xl:w-auto xl:flex-1 max-w-full"
            innerClassName="flex items-center gap-2"
          >
            <span className="text-xs font-semibold text-sky-400 shrink-0">
              Esquema Base:
            </span>
            {FORMATIONS.map((f) => {
              const isActivePreset = club.tactics.formation === f && !hasCustomPositioning;
              const isBaseOfCustom = club.tactics.formation === f && hasCustomPositioning;
              return (
                <button
                  key={f}
                  data-tab-active={isActivePreset || isBaseOfCustom ? 'true' : undefined}
                  onClick={() => {
                    soundEngine.playClick();
                    // Clear any custom positions so the chosen preset takes immediate shape
                    if (hasCustomPositioning) {
                      const resetSquad = club.squad.map((p) => ({
                        ...p,
                        pitchX: undefined,
                        pitchY: undefined,
                        pitchRoleCode: undefined,
                      }));
                      onUpdateSquad(resetSquad);
                    }
                    onUpdateFormation(f);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums whitespace-nowrap shrink-0 ${
                    isActivePreset
                      ? 'bg-sky-400 text-slate-950 shadow-md shadow-sky-500/30 font-black'
                      : isBaseOfCustom
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {f}
                </button>
              );
            })}

            {hasCustomPositioning && (
              <span className="text-xs text-emerald-400 font-semibold whitespace-nowrap pl-1 tabular-nums">
                · Livre ({liveFormationShape})
              </span>
            )}
          </ScrollableTabStrip>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowPitchZones((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap shrink-0 ${
                showPitchZones
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Mostrar ou ocultar as posições táticas disponíveis no gramado"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Posições no Campo</span>
            </button>

            {hasCustomPositioning && (
              <button
                type="button"
                onClick={handleResetCustomPositions}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title={`Realinhar jogadores ao desenho padrão ${club.tactics.formation}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetar Desenho</span>
              </button>
            )}

            {selectedPlayerId && (
              <button
                type="button"
                onClick={() => setSelectedPlayerId(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancelar Seleção
              </button>
            )}

            {club.tactics.autoLineupAssistantEnabled && (
              <span
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 whitespace-nowrap shrink-0"
                title="O Assistente Técnico IA está configurado no painel de Táticas para escalar automaticamente o melhor time antes de cada jogo"
              >
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                <span>Assistente IA Pré-Jogo: Ativo</span>
              </span>
            )}

            {readiness.unavailableCount > 0 && (
              <button
                type="button"
                onClick={handleFixUnavailable}
                title="Substitui automaticamente os titulares lesionados ou suspensos pelo melhor reserva da função"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Corrigir Indisponíveis ({readiness.unavailableCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRotateTired}
              title="Poupa automaticamente titulares com físico abaixo de 75% colocando reservas descansados da posição"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
                readiness.tiredStarters75.length > 0
                  ? 'bg-amber-400/20 hover:bg-amber-400/30 border-amber-400/50 text-amber-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Poupar Cansados
                {readiness.tiredStarters75.length > 0 ? ` (${readiness.tiredStarters75.length})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={handleAutoPick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 shadow-md shadow-sky-500/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Melhor 11</span>
            </button>
          </div>
        </div>

        {/* Perfis Rápidos de Escalação (Time A Titular vs Time B Misto/Reserva) */}
        {(onSaveLineupProfile || onLoadLineupProfile) && (
          <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Bookmark className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-semibold text-slate-300">Perfis Rápidos de Elenco:</span>
              <span className="hidden md:inline text-[11px] text-slate-500">
                Salve seu Time A (titular) e Time B (reserva/rodízio) para alternar em 1 clique.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {([
                { slot: 'A' as const, label: 'Time A', subtitle: 'Titular', saved: savedProfileA },
                { slot: 'B' as const, label: 'Time B', subtitle: 'Misto', saved: savedProfileB },
              ]).map(({ slot, label, subtitle, saved }) => (
                <div
                  key={slot}
                  className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1"
                >
                  {saved && onLoadLineupProfile ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onLoadLineupProfile(saved);
                          setSelectedPlayerId(null);
                          showFeedback(`${saved.name} (${saved.formation}) aplicado à prancheta!`);
                        }}
                        title={`Carregar ${saved.name} (${saved.formation})`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 font-bold text-[11px] cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>Usar {label}</span>
                        <span className="font-mono text-sky-400 text-[10px]">{saved.formation}</span>
                      </button>
                      {onSaveLineupProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onSaveLineupProfile(slot);
                            showFeedback(`${label} (${subtitle}) atualizado com os 11 titulares atuais!`);
                          }}
                          title={`Sobrescrever ${label} com a escalação atual`}
                          className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap"
                        >
                          Salvar
                        </button>
                      )}
                    </>
                  ) : (
                    onSaveLineupProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onSaveLineupProfile(slot);
                          showFeedback(`${label} (${subtitle}) salvo com os 11 titulares atuais!`);
                        }}
                        title={`Salvar escalação atual como ${label} (${subtitle})`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <Bookmark className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Salvar {label} ({subtitle})</span>
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Sector Ratings & Positional Fit Telemetry Strip */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs tabular-nums">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-sans">OVR Efetivo:</span>
              <strong
                className={`text-sm font-black ${
                  totalWrongOrCritical > 0
                    ? 'text-rose-400'
                    : tacticalReport.adaptedCount > 0
                    ? 'text-amber-300'
                    : 'text-sky-300'
                }`}
              >
                {clubSectors.overall}
              </strong>
              {tacticalReport.avgPenaltyDelta < 0 && (
                <span className="text-[11px] text-rose-400 font-bold">
                  ({tacticalReport.avgPenaltyDelta} média)
                </span>
              )}
            </div>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <div>
              <span className="text-slate-400 font-sans">DEF </span>
              <strong className="text-indigo-300">{clubSectors.defense}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-sans">MEI </span>
              <strong className="text-sky-300">{clubSectors.midfield}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-sans">ATA </span>
              <strong className="text-emerald-300">{clubSectors.attack}</strong>
            </div>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <div>
              <span className="text-slate-400 font-sans">Físico XI: </span>
              <strong
                className={
                  avgStarterCondition >= 80
                    ? 'text-emerald-300'
                    : avgStarterCondition >= 68
                    ? 'text-amber-300'
                    : 'text-rose-400'
                }
              >
                {avgStarterCondition}%
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            {totalWrongOrCritical > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-rose-300 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  {totalWrongOrCritical} em posição errada
                  {tacticalReport.adaptedCount > 0 ? ` · ${tacticalReport.adaptedCount} adaptado(s)` : ''}
                  {` (−${tacticalReport.totalPenaltyPoints} OVR total)`}
                </span>
              </span>
            ) : tacticalReport.adaptedCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {tacticalReport.adaptedCount} adaptado(s) (−{tacticalReport.totalPenaltyPoints} OVR)
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Encaixe Tático Limpo (11/11 Ideais)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Out-of-Position Alert Banner with Quick Inspection & 1-Click Fix */}
      {tacticalReport.outOfPositionAssignments.length > 0 && (
        <div
          className={`rounded-xl border px-4 py-3 space-y-2.5 shadow-lg ${
            totalWrongOrCritical > 0
              ? 'bg-rose-950/35 border-rose-500/45'
              : 'bg-amber-950/30 border-amber-500/40'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${
                  totalWrongOrCritical > 0 ? 'text-rose-400' : 'text-amber-400'
                }`}
              />
              <span className={totalWrongOrCritical > 0 ? 'text-rose-200' : 'text-amber-200'}>
                {totalWrongOrCritical > 0 ? (
                  <>
                    <strong>Atenção: Jogadores na posição errada!</strong> Atuar fora da função reduz o Overall efetivo em campo e enfraquece o setor na partida.
                  </>
                ) : (
                  <>
                    <strong>Adaptação tática ativa:</strong> Há atletas atuando em funções próximas com leve redução de Overall.
                  </>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={handleAutoPick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Corrigir Posições</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tacticalReport.outOfPositionAssignments.map((item) => {
              const isSelectedItem = selectedPlayerId === item.player.id;
              const isCriticalOrWrong = item.fit.isWrongPosition;
              return (
                <button
                  key={item.player.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedPlayerId(isSelectedItem ? null : item.player.id);
                  }}
                  title={`${item.fit.reasonText} — Clique para selecionar e reposicionar`}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer tabular-nums ${
                    isSelectedItem
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : isCriticalOrWrong
                      ? 'bg-slate-950/90 border-rose-500/50 hover:border-rose-400 text-rose-100'
                      : 'bg-slate-950/80 border-amber-500/40 hover:border-amber-400 text-amber-100'
                  }`}
                >
                  <span className="font-bold truncate max-w-[130px]">{item.player.name}</span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {item.fit.naturalRole} → {item.fit.assignedCode}
                  </span>
                  <span className="font-mono text-[11px] font-bold">
                    <span className="text-slate-400 line-through">{item.fit.baseOverall}</span>{' '}
                    <span className={isCriticalOrWrong ? 'text-rose-300' : 'text-amber-300'}>
                      {item.fit.effectiveOverall}
                    </span>{' '}
                    <span
                      className={
                        isCriticalOrWrong ? 'text-rose-400 font-black' : 'text-amber-400 font-bold'
                      }
                    >
                      (-{item.fit.overallPenalty})
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Helpful Drag & Drop Instruction Banner */}
      <div className="bg-sky-950/30 border border-sky-500/30 rounded-xl px-4 py-2 flex items-center justify-between gap-3 text-xs text-sky-300">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            <strong>Posicionamento Livre &amp; Versatilidade por Setor:</strong> Jogadores atuam em várias posições do seu setor sem perder OVR (ex: LAT ↔ ZAG, VOL ↔ MC, Ponta ↔ ME/MD/CA). Improvisar fora do setor reduz o Overall em tempo real.
          </span>
        </div>
        <span className="hidden md:inline-block text-[11px] text-sky-400/80 font-mono shrink-0">
          Arraste ou clique no campo
        </span>
      </div>

      {/* Dynamic Feedback Toast */}
      {feedbackMsg && (
        <div className="bg-sky-500/20 border border-sky-400/50 rounded-xl p-3 text-xs font-bold text-sky-200 flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Selected Player Banner if any */}
      {selectedPlayer && (
        <div className="bg-sky-500/10 border border-sky-500/40 rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-3 text-sky-300">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 shrink-0" />
            <span>
              Selecionado: <strong>#{selectedPlayer.squadNumber} {selectedPlayer.name}</strong> (
              <strong>{selectedPlayer.detailedRole}</strong> · Sem perda:{' '}
              <strong className="text-emerald-300">
                {getPlayerVersatilityProfile(selectedPlayer).allZeroPenaltyCodes.join(' · ')}
              </strong>{' '}
              · OVR {selectedPlayer.overall}
              {selectedPlayerAssignment && selectedPlayerAssignment.fit.overallPenalty > 0
                ? ` → Efetivo ${selectedPlayerAssignment.fit.effectiveOverall} em ${selectedPlayerAssignment.fit.assignedCode}`
                : ''}
              ). Clique em outro jogador ou zona do campo para posicionar!
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                inspection?.inspectPlayer(selectedPlayer, club);
              }}
              className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/50 text-sky-200 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              Ver Ficha
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlayerId(null)}
              className="text-xs underline hover:text-white cursor-pointer shrink-0"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Main Pitch & Bench Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* The Pitch (Left/Center: 8 cols on desktop) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div
            ref={pitchRef}
            onDragOver={handlePitchDragOver}
            onDragLeave={handlePitchDragLeave}
            onDrop={handleDropOnPitchGrass}
            onClick={handlePitchGrassClick}
            className={`relative w-full max-w-xl aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-900 select-none bg-gradient-to-b from-slate-950 via-slate-900 to-black ${
              selectedPlayer ? 'cursor-crosshair' : ''
            }`}
          >
            {/* Pitch Grass Stripes */}
            <div className="absolute inset-0 flex flex-col opacity-20 pointer-events-none">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-full flex-1 ${i % 2 === 0 ? 'bg-sky-950/40' : 'bg-transparent'}`}
                />
              ))}
            </div>

            {/* Field Lines in Luminous Sky Blue (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4%" y="3%" width="92%" height="94%" fill="none" stroke="rgba(56,189,248,0.45)" strokeWidth="2" />
              <line x1="4%" y1="50%" x2="96%" y2="50%" stroke="rgba(56,189,248,0.45)" strokeWidth="2" />
              <circle cx="50%" cy="50%" r="14%" fill="none" stroke="rgba(56,189,248,0.45)" strokeWidth="2" />
              <circle cx="50%" cy="50%" r="2" fill="rgba(56,189,248,0.8)" />
              <rect x="25%" y="3%" width="50%" height="16%" fill="none" stroke="rgba(56,189,248,0.45)" strokeWidth="2" />
              <rect x="37%" y="3%" width="26%" height="6%" fill="none" stroke="rgba(56,189,248,0.45)" strokeWidth="2" />
              <rect x="25%" y="81%" width="50%" height="16%" fill="none" stroke="rgba(56,189,248,0.45)" strokeWidth="2" />
              <rect x="37%" y="91%" width="26%" height="6%" fill="none" stroke="rgba(56,189,248,0.45)" strokeWidth="2" />
              <circle cx="50%" cy="87%" r="2" fill="rgba(56,189,248,0.8)" />
            </svg>

            {/* Attack / Defense direction & live formation indicators */}
            <div className="absolute top-2 left-4 right-4 flex items-center justify-between pointer-events-none">
              <span className="text-[10px] font-mono tracking-widest text-sky-400/50">
                ▲ ATAQUE (GOL ADVERSÁRIO)
              </span>
              <span className="text-[10px] font-mono tabular-nums text-sky-300/70">
                {hasCustomPositioning ? `Desenho: ${liveFormationShape} (Livre)` : `Esquema: ${club.tactics.formation}`}
              </span>
            </div>
            <div className="absolute bottom-2 left-4 text-[10px] font-mono tracking-widest text-sky-400/50 pointer-events-none">
              ▼ DEFESA (NOSSO GOL)
            </div>

            {/* 1. Interactive Tactical Position Markers across the Pitch */}
            {shouldRenderZones &&
              availablePitchZones.map((zone) => {
                const zoneHoverKey = `zone-${zone.id}`;
                const isZoneHovered = hoverTarget === zoneHoverKey;
                const zoneFit = activeMovingPlayer
                  ? evaluatePlayerSlotFit(activeMovingPlayer, zone.role, zone.code, zone.label)
                  : null;

                const zoneCompatStyle = zoneFit
                  ? isZoneHovered
                    ? zoneFit.isWrongPosition
                      ? 'border-rose-300 bg-rose-500/40 text-white ring-4 ring-rose-500/50 scale-115 shadow-lg'
                      : zoneFit.status === 'ADAPTED'
                      ? 'border-amber-300 bg-amber-500/40 text-slate-950 ring-4 ring-amber-400/50 scale-115 shadow-lg'
                      : 'border-emerald-300 bg-emerald-400/40 text-slate-950 ring-4 ring-emerald-400/50 scale-115 shadow-lg'
                    : zoneFit.isWrongPosition
                    ? 'border-rose-500/50 bg-rose-950/45 text-rose-300/90 hover:border-rose-400'
                    : zoneFit.status === 'ADAPTED'
                    ? 'border-amber-400/65 bg-amber-950/50 text-amber-200 hover:border-amber-300'
                    : 'border-emerald-400/80 bg-emerald-950/60 text-emerald-200 hover:border-emerald-300'
                  : getZoneSectorStyle(zone.sector, isZoneHovered, isInteractingWithPlayer);

                return (
                  <div
                    key={zone.id}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => {
                      e.stopPropagation();
                      setHoverTarget(zoneHoverKey);
                    }}
                    onDragLeave={(e) => {
                      e.stopPropagation();
                      if (hoverTarget === zoneHoverKey) setHoverTarget(null);
                    }}
                    onDrop={(e) => handleDropOnZone(e, zone)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPlayerId) {
                        placePlayerAtCustomPitchCoords(
                          selectedPlayerId,
                          zone.x,
                          zone.y,
                          zone.code,
                          zone.label
                        );
                      }
                    }}
                    style={{
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={
                      zoneFit
                        ? `${zone.label} (${zone.code}) — ${zoneFit.reasonText} (OVR ${zoneFit.effectiveOverall})`
                        : `${zone.label} (${zone.code}) — Arraste um atleta para esta posição`
                    }
                    className={`absolute z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-dashed flex flex-col items-center justify-center transition-all ${
                      selectedPlayerId ? 'cursor-pointer' : 'cursor-default'
                    } ${zoneCompatStyle}`}
                  >
                    <span className="text-[9px] font-mono font-bold leading-none">{zone.code}</span>
                    {zoneFit ? (
                      <span className="text-[7px] font-mono font-black leading-none mt-0.5 tabular-nums">
                        {zoneFit.overallPenalty === 0 ? 'OK' : `-${zoneFit.overallPenalty}`}
                      </span>
                    ) : (
                      isInteractingWithPlayer && (
                        <span className="text-[7px] leading-none opacity-80 mt-0.5">+</span>
                      )
                    )}

                    {isZoneHovered && (
                      <div
                        className={`absolute -bottom-6 z-40 whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-black shadow-lg pointer-events-none tabular-nums ${
                          zoneFit?.isWrongPosition
                            ? 'bg-rose-500 text-white'
                            : zoneFit?.status === 'ADAPTED'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-sky-400 text-slate-950'
                        }`}
                      >
                        {zoneFit
                          ? zoneFit.overallPenalty === 0
                            ? `${zone.code} · ${zoneFit.shortStatusLabel} (${zoneFit.effectiveOverall} OVR)`
                            : `${zone.code} · ${zoneFit.baseOverall} → ${zoneFit.effectiveOverall} OVR (-${zoneFit.overallPenalty})`
                          : `Soltar em ${zone.label} (${zone.code})`}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* 2. Live Free-Form Drag Ghost Preview on Open Grass */}
            {liveGhostInfo && (
              <div
                style={{
                  left: `${liveGhostInfo.x}%`,
                  top: `${liveGhostInfo.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-30 pointer-events-none flex flex-col items-center"
              >
                <div
                  className={`w-11 h-11 rounded-full border-2 border-dashed ring-4 flex flex-col items-center justify-center shadow-lg ${
                    liveGhostInfo.fit?.isWrongPosition
                      ? 'border-rose-300 bg-rose-500/30 ring-rose-500/35'
                      : liveGhostInfo.fit?.status === 'ADAPTED'
                      ? 'border-amber-300 bg-amber-500/25 ring-amber-400/35'
                      : 'border-emerald-300 bg-emerald-400/25 ring-emerald-400/30'
                  }`}
                >
                  <span className="text-[10px] font-mono font-black text-white leading-none">
                    {liveGhostInfo.code}
                  </span>
                  {liveGhostInfo.fit && liveGhostInfo.fit.overallPenalty > 0 && (
                    <span className="text-[8px] font-mono font-black text-rose-200 leading-none mt-0.5 tabular-nums">
                      -{liveGhostInfo.fit.overallPenalty}
                    </span>
                  )}
                </div>
                <div
                  className={`mt-1 whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-black shadow-lg tabular-nums ${
                    liveGhostInfo.fit?.isWrongPosition
                      ? 'bg-rose-500 text-white'
                      : liveGhostInfo.fit?.status === 'ADAPTED'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-emerald-400 text-slate-950'
                  }`}
                >
                  {liveGhostInfo.fit
                    ? liveGhostInfo.fit.overallPenalty > 0
                      ? `${liveGhostInfo.code}: ${liveGhostInfo.fit.baseOverall} → ${liveGhostInfo.fit.effectiveOverall} OVR (-${liveGhostInfo.fit.overallPenalty})`
                      : `${liveGhostInfo.label} (${liveGhostInfo.code}) · Ideal`
                    : `Posicionar: ${liveGhostInfo.label} (${liveGhostInfo.code})`}
                </div>
              </div>
            )}

            {/* 3. 11 Active Pitch Starters & Empty Formation Slots */}
            {resolvedSlotPositions.map((coord, slotIdx) => {
              const player = starterSlots[slotIdx];
              const isSelected = player ? selectedPlayerId === player.id : false;
              const isSlotHovered = hoverTarget === `slot-${slotIdx}`;
              const isDragged = player && draggedPlayerId === player.id;

              const fit = player
                ? evaluatePlayerSlotFit(player, coord.role, coord.code, coord.label)
                : null;

              const incomingFit =
                activeMovingPlayer && activeMovingPlayer.id !== player?.id
                  ? evaluatePlayerSlotFit(activeMovingPlayer, coord.role, coord.code, coord.label)
                  : null;

              const overallBadgeClass = fit
                ? fit.isWrongPosition
                  ? 'bg-rose-500 text-white font-black ring-2 ring-slate-950'
                  : fit.status === 'ADAPTED'
                  ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-slate-950'
                  : getOverallColor(fit.effectiveOverall)
                : 'bg-slate-700 text-slate-200';

              return (
                <div
                  key={`slot-${slotIdx}`}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => {
                    e.stopPropagation();
                    setHoverTarget(`slot-${slotIdx}`);
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    if (hoverTarget === `slot-${slotIdx}`) setHoverTarget(null);
                  }}
                  onDrop={(e) => handleDropOnSlot(e, slotIdx)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (player) {
                      handlePlayerClick(player);
                    } else if (selectedPlayerId) {
                      assignPlayerToSlot(selectedPlayerId, slotIdx);
                    }
                  }}
                  style={{
                    left: `${coord.x}%`,
                    top: `${coord.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-20 flex flex-col items-center transition-all ${
                    isSlotHovered
                      ? 'scale-115 z-30 drop-shadow-[0_0_15px_rgba(56,189,248,0.8)]'
                      : isSelected
                      ? 'scale-110 z-30'
                      : 'hover:scale-105'
                  }`}
                >
                  {player && fit ? (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, player)}
                      onDragEnd={handleDragEnd}
                      title={`${player.name} · ${fit.reasonText} · OVR Original ${fit.baseOverall} → Efetivo ${fit.effectiveOverall} · Físico ${player.condition}%`}
                      className={`relative flex flex-col items-center cursor-grab active:cursor-grabbing ${
                        isDragged ? 'opacity-35 scale-90' : ''
                      }`}
                    >
                      {/* Jersey / Shirt Circle */}
                      <div
                        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-sm shadow-xl transition-all border-2 tabular-nums ${
                          isSlotHovered
                            ? 'border-sky-300 ring-4 ring-sky-400 shadow-sky-400/80 bg-sky-500'
                            : isSelected
                            ? 'border-amber-400 ring-4 ring-amber-400/50 shadow-amber-500/50'
                            : fit.isWrongPosition
                            ? 'border-rose-400 ring-2 ring-rose-500/75 shadow-rose-950/60'
                            : fit.status === 'ADAPTED'
                            ? 'border-amber-300 ring-2 ring-amber-400/60'
                            : incomingFit?.status === 'EXACT'
                            ? 'border-emerald-300 ring-2 ring-emerald-400/60'
                            : coord.isCustom
                            ? 'border-emerald-300/90'
                            : 'border-white/80'
                        }`}
                        style={{
                          backgroundColor:
                            coord.role === 'GOL' || player.position === 'GK'
                              ? '#FFB800'
                              : club.colors.primary,
                          color:
                            coord.role === 'GOL' || player.position === 'GK'
                              ? '#000000'
                              : club.colors.text,
                        }}
                      >
                        <span>{player.squadNumber}</span>

                        {/* Effective Overall Rating Badge (reflects real positional penalty) */}
                        <span
                          className={`absolute -top-2 -right-2 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shadow tabular-nums ${overallBadgeClass}`}
                        >
                          {fit.effectiveOverall}
                        </span>

                        {/* Explicit Out-of-Position Penalty Delta Badge (non-hue-only signaling) */}
                        {fit.overallPenalty > 0 && (
                          <span
                            className={`absolute -top-2 -left-2 px-1 py-0.2 rounded-full text-[9px] font-black shadow flex items-center gap-0.5 tabular-nums border border-slate-950 ${
                              fit.isWrongPosition
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-400 text-slate-950'
                            }`}
                          >
                            {fit.isWrongPosition && (
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                            )}
                            <span>-{fit.overallPenalty}</span>
                          </span>
                        )}

                        {/* Injury / Suspension indicators */}
                        {player.injuryWeeks > 0 && (
                          <span
                            className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow"
                            title={`Lesionado: ${player.injuryWeeks} semanas`}
                          >
                            🩹
                          </span>
                        )}
                        {(() => {
                          const isSusp = upcomingCompetition
                            ? isPlayerSuspendedInCompetition(player, upcomingCompetition)
                            : isPlayerSuspendedInCompetition(player);
                          if (isSusp) {
                            const susp = upcomingCompetition
                              ? getPlayerSuspensionInCompetition(player, upcomingCompetition)
                              : player.suspensions?.find((s) => s.matchesRemaining > 0);
                            const compName = susp
                              ? COMPETITIONS_CATALOG[susp.competition]?.shortName || susp.competition
                              : '';
                            const reason = susp?.reason === 'RED_CARD' ? 'Vermelho' : '3º Amarelo';
                            return (
                              <span
                                className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow"
                                title={`Suspenso: ${compName} (${reason} · 1 jogo fora)`}
                              >
                                🟥
                              </span>
                            );
                          }
                          const compYellows = upcomingCompetition
                            ? player.competitionYellowCards?.[upcomingCompetition] || 0
                            : 0;
                          if (compYellows >= 2 && player.injuryWeeks === 0) {
                            return (
                              <span
                                className="absolute -bottom-1 -left-1 px-1 h-4 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[8px] shadow border border-amber-200"
                                title="Pendurado (2/3 cartões amarelos) — próximo amarelo gera 1 jogo de suspensão!"
                              >
                                2🟨
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Player Name & Current Pitch Position Label */}
                      <div
                        className={`mt-1 border rounded px-1.5 py-0.5 text-center shadow-lg max-w-[104px] sm:max-w-[116px] transition-colors ${
                          isSlotHovered
                            ? 'bg-sky-950 border-sky-400 text-sky-200'
                            : fit.isWrongPosition
                            ? 'bg-rose-950/95 border-rose-500/70 text-white'
                            : fit.status === 'ADAPTED'
                            ? 'bg-slate-950/95 border-amber-500/60 text-white'
                            : 'bg-slate-950/90 backdrop-blur-sm border-slate-700/70 text-white'
                        }`}
                      >
                        <p
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            if (!selectedPlayerId) {
                              e.stopPropagation();
                              soundEngine.playClick();
                              inspection?.inspectPlayer(player, club);
                            }
                          }}
                          title={
                            selectedPlayerId
                              ? `Trocar com ${player.name}`
                              : `Clique no nome para ver ficha de ${player.name}`
                          }
                          className={`text-[10px] sm:text-xs font-bold truncate leading-tight ${
                            !selectedPlayerId ? 'hover:text-sky-300 cursor-pointer' : ''
                          }`}
                        >
                          {player.name}
                        </p>
                        <div className="flex items-center justify-center gap-1 mt-0.5 tabular-nums">
                          {fit.isOutOfPosition ? (
                            <span
                              className={`text-[9px] font-black font-mono px-1 rounded whitespace-nowrap ${
                                fit.isWrongPosition
                                  ? 'text-rose-200 bg-rose-600/40'
                                  : 'text-amber-200 bg-amber-600/30'
                              }`}
                              title={fit.reasonText}
                            >
                              {fit.naturalRole}→{coord.code}
                            </span>
                          ) : (
                            <span
                              className="text-[9px] font-bold font-mono px-1 rounded text-sky-300 bg-sky-950"
                              title={`Posição em campo: ${coord.label} (${coord.code}) | Função de origem: ${player.detailedRole} | Nacionalidade: ${formatPlayerNationalityFull(player, club.country)}`}
                            >
                              {coord.code}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-500">·</span>
                          <span className="text-[9px] text-slate-300 font-mono tabular-nums">
                            {player.condition}%
                          </span>
                        </div>
                        {fit.isWrongPosition && (
                          <div className="text-[8px] font-black uppercase tracking-wide text-rose-300 leading-tight mt-0.5">
                            Pos. Errada
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Empty Formation Slot (Drop Target) */
                    <div
                      className={`w-12 h-12 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                        isSlotHovered
                          ? 'border-sky-300 bg-sky-500/30 ring-4 ring-sky-400/60 scale-110 shadow-lg shadow-sky-500/40'
                          : incomingFit?.status === 'EXACT'
                          ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200'
                          : 'border-sky-500/50 bg-slate-950/70 text-sky-300 hover:border-sky-300'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold">{coord.code}</span>
                      <span className="text-[8px] text-sky-400/70 uppercase">+ Vago</span>
                    </div>
                  )}

                  {/* Slot Hover Label with Incoming OVR Compatibility Preview */}
                  {isSlotHovered && (
                    <div
                      className={`absolute -bottom-6 z-40 whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-black shadow-lg pointer-events-none tabular-nums ${
                        incomingFit?.isWrongPosition
                          ? 'bg-rose-500 text-white'
                          : incomingFit?.status === 'ADAPTED'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-sky-400 text-slate-950'
                      }`}
                    >
                      {incomingFit
                        ? incomingFit.overallPenalty === 0
                          ? `${coord.code} · Ideal (${incomingFit.effectiveOverall} OVR)`
                          : `${coord.code} · ${incomingFit.baseOverall} → ${incomingFit.effectiveOverall} OVR (-${incomingFit.overallPenalty})`
                        : player
                        ? `Trocar com ${player.name} (${coord.code})`
                        : `Soltar em ${coord.label} (${coord.code})`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bench & Reserve Squad (Right: 4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Bench (Banco de Reservas - 11 jogadores) */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={() => setHoverTarget('bench')}
            onDragLeave={() => {
              if (hoverTarget === 'bench') setHoverTarget(null);
            }}
            onDrop={(e) => handleDropOnBench(e)}
            className={`bg-slate-950 border rounded-xl p-4 shadow-xl transition-all ${
              hoverTarget === 'bench'
                ? 'border-sky-400 ring-2 ring-sky-400/40 bg-sky-950/20 shadow-sky-500/20'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-white">
                  Banco de Reservas{' '}
                  <span className="font-mono tabular-nums text-sky-400">
                    ({substitutes.length}/{MAX_BENCH_PLAYERS})
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Relacione até {MAX_BENCH_PLAYERS} reservas ou arraste para o campo
                </p>
              </div>

              {substitutes.length < MAX_BENCH_PLAYERS && reserves.length > 0 && (
                <button
                  type="button"
                  onClick={handleFillBenchToEleven}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer"
                  title="Completar vagas abertas no banco com atletas aptos"
                >
                  Completar ({MAX_BENCH_PLAYERS})
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-[430px] overflow-y-auto pr-1">
              {substitutes.map((player, benchIdx) => {
                const isSelected = selectedPlayerId === player.id;
                const isDragged = draggedPlayerId === player.id;
                const fitInSelectedSlot =
                  selectedPlayerAssignment && selectedPlayer?.id !== player.id
                    ? evaluatePlayerSlotFit(
                        player,
                        selectedPlayerAssignment.fit.assignedRole,
                        selectedPlayerAssignment.fit.assignedCode,
                        selectedPlayerAssignment.fit.assignedLabel
                      )
                    : null;

                return (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnBench(e, player)}
                    onClick={() => handlePlayerClick(player)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all border ${
                      isDragged
                        ? 'opacity-40 scale-95'
                        : isSelected
                        ? 'bg-sky-500/20 border-sky-400 ring-2 ring-sky-400/30'
                        : fitInSelectedSlot?.status === 'EXACT'
                        ? 'bg-emerald-950/35 hover:bg-emerald-950/50 border-emerald-500/45'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-center font-mono tabular-nums text-[10px] text-slate-500 shrink-0">
                        R{benchIdx + 1}
                      </span>
                      <PlayerAvatar
                        player={player}
                        club={club}
                        clubPrimaryColor={club.colors.primary}
                        clubTextColor={club.colors.text}
                        size="xs"
                      />
                      <span className="w-5 text-center font-mono tabular-nums font-bold text-slate-300 text-[11px] shrink-0">
                        #{player.squadNumber}
                      </span>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.playClick();
                            inspection?.inspectPlayer(player, club);
                          }}
                          title={`Ver ficha de ${player.name}`}
                          className="text-xs font-bold text-white hover:text-sky-300 transition-colors leading-tight truncate text-left block max-w-full cursor-pointer"
                        >
                          {player.name}
                        </button>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="text-sky-400 font-semibold">{player.detailedRole}</span>
                          <span>·</span>
                          <span className="font-mono">{formatPlayerNationalityShort(player, club.country)}</span>
                          <span>·</span>
                          <span className="tabular-nums">{player.age}a</span>
                          <span>·</span>
                          <span className="tabular-nums">{player.condition}% fís</span>
                          {fitInSelectedSlot && (
                            <>
                              <span>·</span>
                              <span
                                className={`font-mono font-bold tabular-nums ${
                                  fitInSelectedSlot.status === 'EXACT'
                                    ? 'text-emerald-300'
                                    : fitInSelectedSlot.status === 'ADAPTED'
                                    ? 'text-amber-300'
                                    : 'text-rose-400'
                                }`}
                              >
                                {fitInSelectedSlot.status === 'EXACT'
                                  ? `Encaixa ${selectedPlayerAssignment!.fit.assignedCode}`
                                  : `-${fitInSelectedSlot.overallPenalty} em ${selectedPlayerAssignment!.fit.assignedCode}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(() => {
                        const isSusp = upcomingCompetition
                          ? isPlayerSuspendedInCompetition(player, upcomingCompetition)
                          : isPlayerSuspendedInCompetition(player);
                        if (isSusp) {
                          const susp = upcomingCompetition
                            ? getPlayerSuspensionInCompetition(player, upcomingCompetition)
                            : player.suspensions?.find((s) => s.matchesRemaining > 0);
                          const compShort = susp
                            ? COMPETITIONS_CATALOG[susp.competition]?.shortName || susp.competition
                            : '';
                          return (
                            <span
                              className="px-1.5 py-0.5 rounded bg-red-950/80 text-rose-300 border border-red-500/50 text-[10px] font-bold flex items-center gap-0.5"
                              title={`Suspenso: ${compShort} (${susp?.reason === 'RED_CARD' ? 'Vermelho' : '3º Amarelo'})`}
                            >
                              <span>🟥</span>
                              <span>SUSP</span>
                            </span>
                          );
                        }
                        const compYellows = upcomingCompetition
                          ? player.competitionYellowCards?.[upcomingCompetition] || 0
                          : 0;
                        if (compYellows > 0) {
                          return (
                            <span
                              className={`px-1 py-0.2 rounded text-[10px] font-mono tabular-nums font-bold flex items-center gap-0.5 ${
                                compYellows >= 2
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                              title={`${compYellows}/3 cartões amarelos ${compYellows >= 2 ? '(Pendurado!)' : ''}`}
                            >
                              <span>🟨</span>
                              <span>{compYellows}/3</span>
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {(player.injuryWeeks > 0 || Boolean(player.injuryDetails)) && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-0.5"
                          title={player.injuryDetails?.injuryType || 'No Departamento Médico'}
                        >
                          <span>🏥</span>
                          <span>
                            {player.injuryDetails
                              ? `${player.injuryDetails.remainingDays}d`
                              : `${player.injuryWeeks}s`}
                          </span>
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-mono tabular-nums font-bold ${getOverallColor(
                          player.overall
                        )}`}
                      >
                        {player.overall}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePlayerFromBench(player);
                        }}
                        title="Retirar do banco de reservas"
                        className="p-1 rounded bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 transition-colors cursor-pointer"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Open Bench Slots up to 11 */}
              {substitutes.length < MAX_BENCH_PLAYERS &&
                Array.from({ length: MAX_BENCH_PLAYERS - substitutes.length }).map((_, idx) => {
                  const slotNumber = substitutes.length + idx + 1;
                  return (
                    <div
                      key={`empty-bench-${slotNumber}`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnBench(e)}
                      onClick={() => {
                        if (selectedPlayer && !selectedPlayer.isSubstitute) {
                          handleAddPlayerToBench(selectedPlayer);
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border border-dashed text-xs transition-colors ${
                        selectedPlayer && !selectedPlayer.isSubstitute
                          ? 'border-sky-400/60 bg-sky-950/20 text-sky-300 cursor-pointer hover:bg-sky-950/40'
                          : 'border-slate-800 bg-slate-950/50 text-slate-500'
                      }`}
                    >
                      <span className="font-mono tabular-nums text-[11px]">
                        Vaga Reserva R{slotNumber}
                      </span>
                      <span className="text-[10px]">
                        {selectedPlayer && !selectedPlayer.isSubstitute
                          ? `Clique para pôr ${selectedPlayer.name}`
                          : 'Arraste ou use + Banco'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Non-listed squad (Não Relacionados) */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={() => setHoverTarget('reserves')}
            onDragLeave={() => {
              if (hoverTarget === 'reserves') setHoverTarget(null);
            }}
            onDrop={(e) => handleDropOnReserves(e)}
            className={`bg-slate-950 border rounded-xl p-4 shadow-xl transition-all ${
              hoverTarget === 'reserves'
                ? 'border-rose-400 ring-2 ring-rose-400/40 bg-rose-950/20'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">
                Não Relacionados{' '}
                <span className="font-mono tabular-nums text-slate-400">({reserves.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500">Fora do banco</span>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {reserves.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3">
                  Todos os atletas do elenco estão escalados ou no banco.
                </p>
              ) : (
                reserves.map((player) => {
                  const isSelected = selectedPlayerId === player.id;
                  const isDragged = draggedPlayerId === player.id;
                  const isInjured = player.injuryWeeks > 0 || Boolean(player.injuryDetails);
                  const isSusp = upcomingCompetition
                    ? isPlayerSuspendedInCompetition(player, upcomingCompetition)
                    : isPlayerSuspendedInCompetition(player);
                  const canAddToBench =
                    substitutes.length < MAX_BENCH_PLAYERS && !isInjured && !isSusp;
                  const fitInSelectedSlot =
                    selectedPlayerAssignment && selectedPlayer?.id !== player.id
                      ? evaluatePlayerSlotFit(
                          player,
                          selectedPlayerAssignment.fit.assignedRole,
                          selectedPlayerAssignment.fit.assignedCode,
                          selectedPlayerAssignment.fit.assignedLabel
                        )
                      : null;

                  return (
                    <div
                      key={player.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, player)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handlePlayerClick(player)}
                      className={`flex items-center justify-between p-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-all text-xs border ${
                        isDragged
                          ? 'opacity-40 scale-95'
                          : isSelected
                          ? 'bg-amber-500/20 border-amber-400'
                          : fitInSelectedSlot?.status === 'EXACT'
                          ? 'bg-emerald-950/30 hover:bg-emerald-950/45 border-emerald-500/45'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        <PlayerAvatar
                          player={player}
                          club={club}
                          clubPrimaryColor={club.colors.primary}
                          clubTextColor={club.colors.text}
                          size="xs"
                        />
                        <span className="w-5 text-center text-slate-400 font-mono tabular-nums text-[10px] shrink-0">
                          #{player.squadNumber}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.playClick();
                            inspection?.inspectPlayer(player, club);
                          }}
                          title={`Ver ficha de ${player.name}`}
                          className="text-white hover:text-sky-300 font-medium truncate text-left cursor-pointer transition-colors"
                        >
                          {player.name}
                        </button>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                          · {player.detailedRole} · {formatPlayerNationalityShort(player, club.country)}
                          {fitInSelectedSlot?.status === 'EXACT' && (
                            <span className="text-emerald-300 font-bold">
                              {' '}· Encaixa {selectedPlayerAssignment!.fit.assignedCode}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(() => {
                          if (isSusp) {
                            const susp = upcomingCompetition
                              ? getPlayerSuspensionInCompetition(player, upcomingCompetition)
                              : player.suspensions?.find((s) => s.matchesRemaining > 0);
                            const compShort = susp
                              ? COMPETITIONS_CATALOG[susp.competition]?.shortName || susp.competition
                              : '';
                            return (
                              <span
                                className="px-1 py-0.2 rounded bg-red-950/80 text-rose-300 border border-red-500/50 text-[9px] font-bold flex items-center gap-0.5"
                                title={`Suspenso: ${compShort} (${susp?.reason === 'RED_CARD' ? 'Vermelho' : '3º Amarelo'})`}
                              >
                                <span>🟥</span>
                                <span>SUSP</span>
                              </span>
                            );
                          }
                          const compYellows = upcomingCompetition
                            ? player.competitionYellowCards?.[upcomingCompetition] || 0
                            : 0;
                          if (compYellows > 0) {
                            return (
                              <span
                                className={`px-1 py-0.2 rounded text-[9px] font-mono tabular-nums font-bold flex items-center gap-0.5 ${
                                  compYellows >= 2
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                                title={`${compYellows}/3 cartões amarelos ${compYellows >= 2 ? '(Pendurado!)' : ''}`}
                              >
                                <span>🟨</span>
                                <span>{compYellows}/3</span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {isInjured && (
                          <span
                            className="px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold"
                            title={player.injuryDetails?.injuryType || 'No Departamento Médico'}
                          >
                            🏥{' '}
                            {player.injuryDetails
                              ? `${player.injuryDetails.remainingDays}d`
                              : `${player.injuryWeeks}s`}
                          </span>
                        )}
                        <span
                          className={`px-1 rounded text-[10px] font-mono tabular-nums font-bold ${getOverallColor(
                            player.overall
                          )}`}
                        >
                          {player.overall}
                        </span>
                        {canAddToBench && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddPlayerToBench(player);
                            }}
                            title="Colocar no Banco de Reservas"
                            className="px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500 text-sky-300 hover:text-slate-950 border border-sky-500/30 text-[10px] font-bold flex items-center gap-0.5 whitespace-nowrap transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Banco</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

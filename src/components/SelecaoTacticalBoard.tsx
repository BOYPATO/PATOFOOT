import React, { useMemo, useRef, useState } from 'react';
import {
  Club,
  FormationType,
  InternationalMatchFixture,
  NationalTeamProfile,
  Player,
  SelecaoTacticStyle,
} from '../types/game';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Crosshair,
  Crown,
  Move,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import {
  evaluateSelecaoSlotFit,
  getNationalTeamById,
  ResolvedNationalPlayer,
  SELECAO_FORMATIONS,
  SELECAO_FORMATION_SLOTS,
  SELECAO_ROLE_ORDER,
} from '../utils/nationalTeamEngine';
import type { PlayerSlotFitEvaluation } from '../utils/tacticalPositioningEngine';
import {
  computeLiveFormationShape,
  inferTacticalZoneFromCoords,
  TACTICAL_PITCH_ZONES,
  TacticalPitchZone,
} from '../utils/matchPitchLayout';
import { PlayerAvatar } from './PlayerAvatar';
import { usePlayerInspection } from '../context/PlayerInspectionContext';

interface SelecaoTacticalBoardProps {
  team: NationalTeamProfile;
  isEditable: boolean;
  formation: FormationType;
  tacticStyle: SelecaoTacticStyle;
  captainPlayerId?: string;
  calledUpPlayers: ResolvedNationalPlayer[]; // up to 26
  starterIds: string[]; // ordered 11
  customPositions?: Record<string, { x: number; y: number; code: string; label?: string }>;
  allClubs?: Club[];
  readyFixture?: InternationalMatchFixture | null;
  isPreMatchMode?: boolean;
  onChangeFormation: (formation: FormationType) => void;
  onChangeTacticStyle: (style: SelecaoTacticStyle) => void;
  onSwapPlayers: (firstPlayerId: string, secondPlayerId: string) => void;
  onMovePlayerToPitchCoords?: (
    playerId: string,
    x: number,
    y: number,
    code?: string,
    label?: string
  ) => void;
  onResetCustomPositions?: () => void;
  onAutoPickStartersOnly: () => void;
  onSetCaptain: (playerId: string) => void;
  onLaunchReadyMatch?: (fixture: InternationalMatchFixture) => void;
  onGoToCallUpTab?: () => void;
}

const TACTIC_OPTIONS: {
  id: SelecaoTacticStyle;
  shortLabel: string;
  desc: string;
}[] = [
  {
    id: 'EQUILIBRADO',
    shortLabel: 'Equilibrado',
    desc: 'Posse cadenciada e recomposição sólida',
  },
  {
    id: 'JOGO_BONITO_OFENSIVO',
    shortLabel: 'Jogo Bonito',
    desc: 'Criatividade máxima e laterais ofensivos',
  },
  {
    id: 'PRESSAO_ALTA',
    shortLabel: 'Pressão Alta',
    desc: 'Bloco adiantado sufocando a saída rival',
  },
  {
    id: 'SOLIDEZ_TRANSICAO',
    shortLabel: 'Transição Rápida',
    desc: 'Defesa compacta e contra-ataque letal',
  },
];

function shortSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  if (fullName.length <= 13) return fullName;
  const last = parts[parts.length - 1];
  if (last === 'Júnior' || last === 'Neto' || last === 'Filho') {
    return `${parts[0]} ${last === 'Júnior' ? 'Jr.' : last}`;
  }
  return `${parts[0][0]}. ${last}`;
}

export const SelecaoTacticalBoard: React.FC<SelecaoTacticalBoardProps> = ({
  team,
  isEditable,
  formation,
  tacticStyle,
  captainPlayerId,
  calledUpPlayers,
  starterIds,
  customPositions,
  allClubs = [],
  readyFixture,
  isPreMatchMode = false,
  onChangeFormation,
  onChangeTacticStyle,
  onSwapPlayers,
  onMovePlayerToPitchCoords,
  onResetCustomPositions,
  onAutoPickStartersOnly,
  onSetCaptain,
  onLaunchReadyMatch,
  onGoToCallUpTab,
}) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const inspection = usePlayerInspection();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [showPitchZones, setShowPitchZones] = useState<boolean>(true);
  const [dragGrassCoords, setDragGrassCoords] = useState<{ x: number; y: number } | null>(null);
  const [benchFilter, setBenchFilter] = useState<'ALL' | 'GK' | 'DF' | 'MF' | 'FW'>('ALL');
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  const slots = SELECAO_FORMATION_SLOTS[formation] || SELECAO_FORMATION_SLOTS['4-3-3'];

  const playerById = useMemo(() => {
    const map = new Map<string, ResolvedNationalPlayer>();
    calledUpPlayers.forEach((p) => map.set(p.id, p));
    return map;
  }, [calledUpPlayers]);

  const clubById = useMemo(() => {
    const map = new Map<string, Club>();
    allClubs.forEach((c) => map.set(c.id, c));
    return map;
  }, [allClubs]);

  const resolveInspectable = (
    p: ResolvedNationalPlayer,
    isStarter: boolean,
    shirtNumber: number
  ): { playerObj: Player; clubObj: Club | null } => {
    const realClub = p.clubId ? clubById.get(p.clubId) || null : null;
    const realPlayer = realClub?.squad.find((sp) => sp.id === p.id);
    if (realPlayer) {
      return { playerObj: realPlayer, clubObj: realClub };
    }
    const synthetic: Player = {
      id: p.id,
      name: p.name,
      position: p.position,
      detailedRole: p.detailedRole,
      overall: p.overall,
      age: p.age,
      nationality: team.name,
      marketValue: p.marketValue,
      wage: Math.max(5000, Math.round((p.marketValue || 500000) * 0.008)),
      contractYears: 2,
      condition: 100,
      morale: 'Boa',
      potential: Math.min(99, p.overall + (p.age <= 22 ? 6 : 1)),
      preferredFoot: 'Destro',
      specialSkill: 'Convocável Internacional',
      squadNumber: shirtNumber,
      isStarter,
      isSubstitute: !isStarter,
      goals: p.goalsSeason,
      assists: p.assistsSeason,
      matches: 0,
      yellowCards: 0,
      redCards: 0,
      isSuspended: false,
      injuryWeeks: 0,
      ratingAverage: 6.8,
      internationalCaps: p.caps,
      internationalGoals: p.internationalGoals,
    };
    return { playerObj: synthetic, clubObj: realClub };
  };

  // Build ordered 11 pitch starters and 15 bench reserves
  const { pitchSlots, benchPlayers } = useMemo(() => {
    const used = new Set<string>();
    const orderedStarters: (ResolvedNationalPlayer | null)[] = slots.map((_, idx) => {
      const pid = starterIds[idx];
      const found = pid ? playerById.get(pid) || null : null;
      if (found) used.add(found.id);
      return found;
    });

    calledUpPlayers.forEach((p) => {
      if (used.has(p.id)) return;
      const emptyIdx = orderedStarters.findIndex((s) => s === null);
      if (emptyIdx !== -1) {
        orderedStarters[emptyIdx] = p;
        used.add(p.id);
      }
    });

    const reserves = calledUpPlayers
      .filter((p) => !used.has(p.id))
      .sort(
        (a, b) =>
          (SELECAO_ROLE_ORDER[a.detailedRole] ?? 9) -
            (SELECAO_ROLE_ORDER[b.detailedRole] ?? 9) ||
          b.overall - a.overall
      );

    return {
      pitchSlots: orderedStarters,
      benchPlayers: reserves,
    };
  }, [slots, starterIds, playerById, calledUpPlayers]);

  // Effective pitch coordinates for each of the 11 slots (respects customPositions)
  const resolvedSlotPositions = useMemo(() => {
    return slots.map((preset, idx) => {
      const occupant = pitchSlots[idx];
      const custom = occupant ? customPositions?.[occupant.id] : undefined;
      if (custom) {
        const inferred = inferTacticalZoneFromCoords(custom.x, custom.y);
        return {
          x: custom.x,
          y: custom.y,
          role: inferred.role,
          code: custom.code || inferred.code,
          label: custom.label || inferred.label,
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
  }, [slots, pitchSlots, customPositions]);

  const hasCustomPositioning = useMemo(
    () =>
      Boolean(
        customPositions &&
          pitchSlots.some((p) => p && Boolean(customPositions[p.id]))
      ),
    [customPositions, pitchSlots]
  );

  const liveFormationShape = useMemo(() => {
    const activeCoords = resolvedSlotPositions.map((pos) => ({
      x: pos.x,
      y: pos.y,
      isGk: pos.role === 'GOL',
    }));
    return computeLiveFormationShape(activeCoords);
  }, [resolvedSlotPositions]);

  const availablePitchZones = useMemo(() => {
    return TACTICAL_PITCH_ZONES.filter((zone) => {
      const occupiedNearby = resolvedSlotPositions.some((slotPos, idx) => {
        const hasPlayer = pitchSlots[idx] !== null;
        const threshold = hasPlayer ? 6.4 : 5.5;
        return Math.hypot(slotPos.x - zone.x, slotPos.y - zone.y) < threshold;
      });
      return !occupiedNearby;
    });
  }, [resolvedSlotPositions, pitchSlots]);

  const selectedPlayer = selectedPlayerId ? playerById.get(selectedPlayerId) || null : null;
  const draggedPlayer = draggedPlayerId ? playerById.get(draggedPlayerId) || null : null;
  const activeMovingPlayer = draggedPlayer || selectedPlayer || null;
  const isInteractingWithPlayer = Boolean(activeMovingPlayer) && isEditable;
  const shouldRenderZones = isEditable && (showPitchZones || isInteractingWithPlayer) && Boolean(onMovePlayerToPitchCoords);

  const selectedStarterSlotIdx = selectedPlayer
    ? pitchSlots.findIndex((p) => p?.id === selectedPlayer.id)
    : -1;

  // Sector averages + exact positional OVR penalties (respects custom slot positions!)
  const sectorMetrics = useMemo(() => {
    const fitBySlotIndex: (PlayerSlotFitEvaluation | null)[] = pitchSlots.map((p, idx) => {
      const coord = resolvedSlotPositions[idx];
      return p && coord
        ? evaluateSelecaoSlotFit(p, coord.role, coord.code, coord.label)
        : null;
    });

    const activeFits = fitBySlotIndex.filter(
      (f): f is PlayerSlotFitEvaluation => Boolean(f)
    );
    const avgEffective = (list: PlayerSlotFitEvaluation[]) =>
      list.length > 0
        ? Math.round(list.reduce((s, f) => s + f.effectiveOverall, 0) / list.length)
        : team.strength;

    const atkFits: PlayerSlotFitEvaluation[] = [];
    const midFits: PlayerSlotFitEvaluation[] = [];
    const defFits: PlayerSlotFitEvaluation[] = [];
    const gkFits: PlayerSlotFitEvaluation[] = [];

    const outOfPositionItems: {
      idx: number;
      player: ResolvedNationalPlayer;
      coord: (typeof resolvedSlotPositions)[number];
      fit: PlayerSlotFitEvaluation;
    }[] = [];

    let wrongCount = 0;
    let adaptedCount = 0;
    let totalPenalty = 0;
    let baseSum = 0;

    pitchSlots.forEach((p, idx) => {
      const coord = resolvedSlotPositions[idx];
      const fit = fitBySlotIndex[idx];
      if (!p || !coord || !fit) return;

      baseSum += fit.baseOverall;
      totalPenalty += fit.overallPenalty;

      if (coord.role === 'GOL') gkFits.push(fit);
      else if (coord.role === 'ZAG' || coord.role === 'LAT') defFits.push(fit);
      else if (coord.role === 'VOL' || coord.role === 'MEI') midFits.push(fit);
      else atkFits.push(fit);

      if (fit.isWrongPosition) {
        wrongCount += 1;
        outOfPositionItems.push({ idx, player: p, coord, fit });
      } else if (fit.status === 'ADAPTED') {
        adaptedCount += 1;
        outOfPositionItems.push({ idx, player: p, coord, fit });
      }
    });

    outOfPositionItems.sort((a, b) => b.fit.overallPenalty - a.fit.overallPenalty);

    return {
      ovr: avgEffective(activeFits),
      baseOvr:
        activeFits.length > 0 ? Math.round(baseSum / activeFits.length) : team.strength,
      atk: avgEffective(atkFits),
      mid: avgEffective(midFits),
      def: avgEffective(defFits),
      gk: avgEffective(gkFits),
      fitBySlotIndex,
      wrongCount,
      adaptedCount,
      totalPenalty,
      outOfPositionItems,
    };
  }, [pitchSlots, resolvedSlotPositions, team.strength]);

  const filteredBench = useMemo(() => {
    if (benchFilter === 'ALL') return benchPlayers;
    return benchPlayers.filter((p) => p.position === benchFilter);
  }, [benchPlayers, benchFilter]);

  const showQuickMsg = (msg: string) => {
    setLocalFeedback(msg);
    setTimeout(() => {
      setLocalFeedback((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const liveGhostInfo = useMemo(() => {
    if (
      !dragGrassCoords ||
      !onMovePlayerToPitchCoords ||
      hoverTarget?.startsWith('slot-') ||
      hoverTarget?.startsWith('zone-')
    ) {
      return null;
    }
    const inferred = inferTacticalZoneFromCoords(dragGrassCoords.x, dragGrassCoords.y);
    const fit = draggedPlayer
      ? evaluateSelecaoSlotFit(draggedPlayer, inferred.role, inferred.code, inferred.label)
      : null;
    return {
      ...dragGrassCoords,
      ...inferred,
      fit,
    };
  }, [dragGrassCoords, hoverTarget, draggedPlayer, onMovePlayerToPitchCoords]);

  const getPitchPercentFromEvent = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
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

  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    if (!isEditable) return;
    setDraggedPlayerId(playerId);
    e.dataTransfer.setData('text/plain', playerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPlayerId(null);
    setHoverTarget(null);
    setDragGrassCoords(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handlePitchDragOver = (e: React.DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const coords = getPitchPercentFromEvent(e.clientX, e.clientY);
    if (coords) setDragGrassCoords(coords);
  };

  const handlePitchDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragGrassCoords(null);
    }
  };

  const placeAtCoords = (
    playerId: string,
    x: number,
    y: number,
    code?: string,
    label?: string
  ) => {
    if (!isEditable || !onMovePlayerToPitchCoords) return;
    soundEngine.playClick();
    onMovePlayerToPitchCoords(playerId, x, y, code, label);
    const p = playerById.get(playerId);
    const inferred = inferTacticalZoneFromCoords(x, y);
    if (p) {
      showQuickMsg(`${p.name} posicionado em ${label || inferred.label} (${code || inferred.code}).`);
    }
    setDraggedPlayerId(null);
    setSelectedPlayerId(null);
    setHoverTarget(null);
    setDragGrassCoords(null);
  };

  const handleDropOnPitchGrass = (e: React.DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    setDragGrassCoords(null);
    setHoverTarget(null);
    if (!playerId) return;

    const coords = getPitchPercentFromEvent(e.clientX, e.clientY);
    if (!coords) return;

    // Check if dropped right on top of an existing starter slot (< 5.2%) -> swap with that starter
    const hitSlotIdx = resolvedSlotPositions.findIndex(
      (pos) => Math.hypot(pos.x - coords.x, pos.y - coords.y) < 5.2
    );
    if (hitSlotIdx !== -1) {
      const occupant = pitchSlots[hitSlotIdx];
      if (occupant && occupant.id !== playerId) {
        soundEngine.playClick();
        onSwapPlayers(playerId, occupant.id);
        setDraggedPlayerId(null);
        setSelectedPlayerId(null);
        return;
      }
      if (occupant && occupant.id === playerId) {
        setDraggedPlayerId(null);
        return;
      }
    }

    if (!onMovePlayerToPitchCoords) return;

    // Snap cleanly to nearby tactical zone (< 4.2%)
    const nearZone = availablePitchZones.find(
      (z) => Math.hypot(z.x - coords.x, z.y - coords.y) < 4.2
    );
    if (nearZone) {
      placeAtCoords(playerId, nearZone.x, nearZone.y, nearZone.code, nearZone.label);
      return;
    }

    placeAtCoords(playerId, coords.x, coords.y);
  };

  const handleDropOnZone = (e: React.DragEvent, zone: TacticalPitchZone) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    setHoverTarget(null);
    setDragGrassCoords(null);
    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    if (!playerId) return;
    placeAtCoords(playerId, zone.x, zone.y, zone.code, zone.label);
  };

  const handleDropOnSlot = (e: React.DragEvent, targetSlotIdx: number) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    setHoverTarget(null);
    setDragGrassCoords(null);
    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    const occupant = pitchSlots[targetSlotIdx];
    if (!playerId || !occupant || playerId === occupant.id) {
      setDraggedPlayerId(null);
      return;
    }
    soundEngine.playClick();
    onSwapPlayers(playerId, occupant.id);
    setDraggedPlayerId(null);
    setSelectedPlayerId(null);
  };

  const handleDropOnBenchRow = (e: React.DragEvent, targetBenchPlayer: ResolvedNationalPlayer) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    setHoverTarget(null);
    setDragGrassCoords(null);
    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    if (!playerId || playerId === targetBenchPlayer.id) {
      setDraggedPlayerId(null);
      return;
    }
    const isDraggedStarter = pitchSlots.some((s) => s?.id === playerId);
    if (isDraggedStarter) {
      soundEngine.playClick();
      onSwapPlayers(playerId, targetBenchPlayer.id);
      showQuickMsg(`${targetBenchPlayer.name} entrou nos 11 titulares!`);
    }
    setDraggedPlayerId(null);
    setSelectedPlayerId(null);
  };

  const handlePitchGrassClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditable || !selectedPlayerId || !onMovePlayerToPitchCoords) return;
    const coords = getPitchPercentFromEvent(e.clientX, e.clientY);
    if (!coords) return;
    placeAtCoords(selectedPlayerId, coords.x, coords.y);
  };

  const handlePlayerClick = (clickedId: string) => {
    if (!isEditable) return;
    soundEngine.playClick();
    if (!selectedPlayerId) {
      setSelectedPlayerId(clickedId);
      return;
    }
    if (selectedPlayerId === clickedId) {
      setSelectedPlayerId(null);
      return;
    }

    const firstIsStarter = pitchSlots.some((s) => s?.id === selectedPlayerId);
    const secondIsStarter = pitchSlots.some((s) => s?.id === clickedId);

    // If both are bench players, switch selection smoothly to the newly clicked bench player
    if (!firstIsStarter && !secondIsStarter) {
      setSelectedPlayerId(clickedId);
      return;
    }

    onSwapPlayers(selectedPlayerId, clickedId);
    setSelectedPlayerId(null);
  };

  const getZoneSectorStyle = (
    sector: TacticalPitchZone['sector'],
    isHovered: boolean,
    isHighlighted: boolean
  ) => {
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
    return 'border-sky-400/30 bg-slate-950/55 text-sky-300/80 hover:border-sky-300 hover:bg-sky-950/75 hover:text-white';
  };

  const effectiveCaptainId =
    captainPlayerId && calledUpPlayers.some((p) => p.id === captainPlayerId)
      ? captainPlayerId
      : pitchSlots[0]?.id;

  const readyOpponent = readyFixture
    ? getNationalTeamById(
        readyFixture.homeTeamId === team.id ? readyFixture.awayTeamId : readyFixture.homeTeamId
      )
    : null;

  return (
    <div className="space-y-4">
      {/* Ready Match Banner if there is an unplayed match waiting (outside Pre-Match modal) */}
      {!isPreMatchMode && isEditable && readyFixture && readyOpponent && onLaunchReadyMatch && (
        <div className="bg-slate-950 border border-amber-400/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-amber-300 font-bold">
              Próximo Jogo Liberado · {readyFixture.competitionName} ({readyFixture.phase})
            </div>
            <div className="text-sm sm:text-base font-black text-white mt-0.5">
              {team.name} vs {readyOpponent.name}{' '}
              <span className="text-xs font-normal text-slate-400 font-mono tabular-nums">
                · Força Rival {readyOpponent.strength} · {readyFixture.stadiumName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onLaunchReadyMatch(readyFixture)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Confirmar Escalação & Ir p/ o Jogo</span>
          </button>
        </div>
      )}

      {/* Top Tactical Controls Strip */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>
                Prancheta Tática & Escalação · {team.name} ({formation})
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditable
                ? 'Arraste ou selecione jogadores para mover no gramado, posicionar nas zonas ou trocar titulares com o banco.'
                : `Visualizando o esquema base e os 11 titulares ideais de ${team.name}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isEditable && onMovePlayerToPitchCoords && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setShowPitchZones((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap shrink-0 ${
                  showPitchZones
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Mostrar ou ocultar as posições táticas disponíveis no gramado"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Posições no Campo</span>
              </button>
            )}

            {isEditable && hasCustomPositioning && onResetCustomPositions && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onResetCustomPositions();
                  showQuickMsg(`Posições realinhadas ao desenho padrão ${formation}.`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title={`Realinhar jogadores ao desenho padrão ${formation}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetar Desenho</span>
              </button>
            )}

            {isEditable && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onAutoPickStartersOnly();
                  setSelectedPlayerId(null);
                  showQuickMsg(`Melhores 11 escalados automaticamente no ${formation}!`);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Escalar Melhor 11</span>
              </button>
            )}

            {!isPreMatchMode && onGoToCallUpTab && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onGoToCallUpTab();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Gerenciar 26 Convocados</span>
              </button>
            )}
          </div>
        </div>

        {/* Formation Buttons + Sector Ratings */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1 font-semibold">Esquema Base:</span>
            {SELECAO_FORMATIONS.map((fmt) => {
              const isActivePreset = formation === fmt && !hasCustomPositioning;
              const isBaseOfCustom = formation === fmt && hasCustomPositioning;
              return (
                <button
                  key={fmt}
                  type="button"
                  disabled={!isEditable}
                  onClick={() => {
                    if (!isEditable) return;
                    soundEngine.playClick();
                    onChangeFormation(fmt);
                    setSelectedPlayerId(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono tabular-nums font-bold transition-colors whitespace-nowrap shrink-0 ${
                    isActivePreset
                      ? 'bg-sky-400 text-slate-950 font-black'
                      : isBaseOfCustom
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 cursor-pointer'
                      : isEditable
                      ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                      : 'bg-slate-900/50 border border-slate-800/60 text-slate-500 cursor-default'
                  }`}
                >
                  {fmt}
                </button>
              );
            })}

            {hasCustomPositioning && (
              <span className="text-xs text-emerald-400 font-semibold whitespace-nowrap pl-1 tabular-nums">
                · Livre ({liveFormationShape})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">OVR 11:</span>
              <strong
                className={`text-sm ${
                  sectorMetrics.wrongCount > 0
                    ? 'text-rose-400'
                    : sectorMetrics.adaptedCount > 0
                    ? 'text-amber-300'
                    : 'text-amber-300'
                }`}
              >
                {sectorMetrics.ovr}
              </strong>
              {sectorMetrics.totalPenalty > 0 && (
                <span className="text-[11px] font-bold text-rose-400">
                  (Base {sectorMetrics.baseOvr})
                </span>
              )}
            </div>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <div>
              <span className="text-slate-400">ATA </span>
              <strong className="text-emerald-400">{sectorMetrics.atk}</strong>
            </div>
            <div>
              <span className="text-slate-400">MEI </span>
              <strong className="text-sky-400">{sectorMetrics.mid}</strong>
            </div>
            <div>
              <span className="text-slate-400">DEF </span>
              <strong className="text-indigo-300">{sectorMetrics.def}</strong>
            </div>
            <div>
              <span className="text-slate-400">GOL </span>
              <strong className="text-amber-200">{sectorMetrics.gk}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Free Drag & Drop Hint Banner */}
      {isEditable && (
        <div className="bg-sky-950/30 border border-sky-500/30 rounded-xl px-4 py-2 flex items-center justify-between gap-3 text-xs text-sky-300">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong>Posicionamento Livre no Campo:</strong> Arraste qualquer jogador para mover pelo gramado, solte em outra vaga para trocar ou use o Banco para escalar titulares.
            </span>
          </div>
          <span className="hidden md:inline-block text-[11px] text-sky-400/80 font-mono shrink-0">
            Arraste ou clique no campo
          </span>
        </div>
      )}

      {/* Instant Local Feedback Toast */}
      {localFeedback && (
        <div className="bg-sky-500/20 border border-sky-400/50 rounded-xl p-2.5 text-xs font-bold text-sky-200 flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{localFeedback}</span>
        </div>
      )}

      {/* Out-of-Position Alert Banner */}
      {sectorMetrics.outOfPositionItems.length > 0 && (
        <div
          className={`rounded-2xl border px-4 py-3 space-y-2.5 ${
            sectorMetrics.wrongCount > 0
              ? 'bg-rose-950/35 border-rose-500/45'
              : 'bg-amber-950/30 border-amber-500/40'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${
                  sectorMetrics.wrongCount > 0 ? 'text-rose-400' : 'text-amber-400'
                }`}
              />
              <span className="font-bold text-white">
                {sectorMetrics.wrongCount > 0
                  ? `${sectorMetrics.wrongCount} jogador(es) na posição errada na Seleção`
                  : `${sectorMetrics.adaptedCount} jogador(es) adaptado(s) fora da função natural`}
              </span>
              <span className="text-slate-300 font-mono tabular-nums">
                · Perda total de -{sectorMetrics.totalPenalty} OVR no time titular
              </span>
            </div>

            {isEditable && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onAutoPickStartersOnly();
                  setSelectedPlayerId(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Corrigir Posições</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {sectorMetrics.outOfPositionItems.map(({ player, coord, fit }) => (
              <button
                key={`nt-oop-${player.id}`}
                type="button"
                disabled={!isEditable}
                onClick={() => isEditable && handlePlayerClick(player.id)}
                title={fit.reasonText}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono tabular-nums transition-colors ${
                  selectedPlayerId === player.id
                    ? 'bg-sky-500/25 border-sky-400 text-white'
                    : fit.isWrongPosition
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-200 hover:border-rose-400'
                    : 'bg-amber-950/50 border-amber-500/40 text-amber-200 hover:border-amber-400'
                } ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className="font-sans font-bold text-white">{shortSurname(player.name)}</span>
                <span className="opacity-80">
                  {player.detailedRole} → {coord.code}
                </span>
                <span className="font-black">
                  {fit.baseOverall} → {fit.effectiveOverall} (-{fit.overallPenalty})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Swap / Move Banner when a player is selected */}
      {selectedPlayer && isEditable && (
        <div className="bg-slate-900 border border-sky-400/60 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-sky-200">
            <ArrowLeftRight className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Selecionado: <strong className="text-white">{selectedPlayer.name}</strong> (
              {selectedPlayer.detailedRole} · OVR {selectedPlayer.overall}). Clique em outro jogador para trocar{' '}
              {onMovePlayerToPitchCoords ? 'ou clique direto no gramado/zona para posicionar!' : '!'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {inspection && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  const isStarter = selectedStarterSlotIdx !== -1;
                  const shirt = isStarter
                    ? selectedStarterSlotIdx + 1
                    : 12 + Math.max(0, benchPlayers.findIndex((b) => b.id === selectedPlayer.id));
                  const { playerObj, clubObj } = resolveInspectable(selectedPlayer, isStarter, shirt);
                  inspection.inspectPlayer(playerObj, clubObj);
                }}
                className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/50 text-sky-200 font-bold cursor-pointer whitespace-nowrap"
              >
                Ver Ficha
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedPlayerId(null)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold whitespace-nowrap cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Main Split Grid: Left 7 cols Tactical Grass Pitch | Right 5 cols Mentality, Captain & 15 Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: INTERACTIVE 2D TACTICAL GRASS PITCH */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
            <span>
              <strong className="text-white">11 Titulares em Campo</strong> · Camisas 1 a 11
            </span>
            <span className="font-mono tabular-nums">
              {sectorMetrics.wrongCount === 0 && sectorMetrics.adaptedCount === 0 ? (
                <span className="text-emerald-400 font-semibold">Encaixe Tático Limpo</span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {sectorMetrics.wrongCount > 0 && (
                    <span className="text-rose-400 font-bold">
                      {sectorMetrics.wrongCount} pos. errada
                    </span>
                  )}
                  {sectorMetrics.adaptedCount > 0 && (
                    <span className="text-amber-400 font-semibold">
                      {sectorMetrics.adaptedCount} adaptado(s)
                    </span>
                  )}
                </span>
              )}
            </span>
          </div>

          <div
            ref={pitchRef}
            onDragOver={handlePitchDragOver}
            onDragLeave={handlePitchDragLeave}
            onDrop={handleDropOnPitchGrass}
            onClick={handlePitchGrassClick}
            className={`relative w-full aspect-[3/4] sm:aspect-[4/4.6] rounded-2xl overflow-hidden border border-emerald-500/30 select-none ${
              selectedPlayer && isEditable && onMovePlayerToPitchCoords ? 'cursor-crosshair' : ''
            }`}
            style={{
              background:
                'repeating-linear-gradient(180deg, #064e3b 0%, #064e3b 10%, #065f46 10%, #065f46 20%)',
            }}
          >
            {/* Pitch Chalk Markings */}
            <div className="absolute inset-3 border border-white/25 rounded-lg pointer-events-none">
              <div className="absolute inset-x-0 top-1/2 border-t border-white/25" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/25" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/40" />
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-44 h-16 border-x border-b border-white/25" />
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-20 h-6 border-x border-b border-white/25" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-44 h-16 border-x border-t border-white/25" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-20 h-6 border-x border-t border-white/25" />
            </div>

            {/* Attacking Direction & Shape Indicators */}
            <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-emerald-200/70 pointer-events-none">
              <span>
                {hasCustomPositioning ? `Desenho: ${liveFormationShape} (Livre)` : `Esquema: ${formation}`}
              </span>
              <span>Ataque ↑</span>
            </div>

            {/* 1. Interactive Tactical Position Markers across the Pitch */}
            {shouldRenderZones &&
              availablePitchZones.map((zone) => {
                const zoneHoverKey = `zone-${zone.id}`;
                const isZoneHovered = hoverTarget === zoneHoverKey;
                const zoneFit = activeMovingPlayer
                  ? evaluateSelecaoSlotFit(activeMovingPlayer, zone.role, zone.code, zone.label)
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
                        placeAtCoords(
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
                            ? `${zone.code} · Ideal (${zoneFit.effectiveOverall} OVR)`
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

            {/* 3. 11 Formation / Custom Starter Tokens */}
            {resolvedSlotPositions.map((coord, idx) => {
              const player = pitchSlots[idx];
              if (!player) return null;

              const slotFit =
                sectorMetrics.fitBySlotIndex[idx] ||
                evaluateSelecaoSlotFit(player, coord.role, coord.code, coord.label);
              const isSelected = selectedPlayerId === player.id;
              const isCaptain = effectiveCaptainId === player.id;
              const slotHoverKey = `slot-${idx}`;
              const isDropHover = hoverTarget === slotHoverKey && draggedPlayerId !== player.id;
              const isDragged = draggedPlayerId === player.id;

              const previewSourcePlayer =
                isDropHover && draggedPlayerId
                  ? playerById.get(draggedPlayerId) || null
                  : selectedPlayer && selectedPlayer.id !== player.id
                  ? selectedPlayer
                  : null;

              const incomingFit =
                previewSourcePlayer && isEditable
                  ? evaluateSelecaoSlotFit(
                      previewSourcePlayer,
                      coord.role,
                      coord.code,
                      coord.label
                    )
                  : null;

              const ringClass = isSelected
                ? 'ring-4 ring-sky-400 scale-110'
                : isDropHover && incomingFit
                ? incomingFit.status === 'EXACT'
                  ? 'ring-4 ring-emerald-400 scale-110'
                  : incomingFit.status === 'ADAPTED'
                  ? 'ring-4 ring-amber-400 scale-110'
                  : 'ring-4 ring-rose-500 scale-110'
                : incomingFit && selectedPlayer
                ? incomingFit.status === 'EXACT'
                  ? 'ring-2 ring-emerald-300/95'
                  : incomingFit.status === 'ADAPTED'
                  ? 'ring-2 ring-amber-300/80'
                  : 'ring-2 ring-rose-500/70'
                : slotFit.isWrongPosition
                ? 'ring-2 ring-rose-500'
                : slotFit.status === 'ADAPTED'
                ? 'ring-2 ring-amber-400/90'
                : coord.isCustom
                ? 'ring-2 ring-emerald-300/90'
                : 'ring-2 ring-white/50';

              const isGoalkeeper = coord.role === 'GOL' || idx === 0 && player.detailedRole === 'GOL';
              const jerseyBg = isGoalkeeper ? '#0f172a' : team.primaryColor;
              const jerseyText = isGoalkeeper ? '#f8fafc' : team.textColor;

              return (
                <div
                  key={`slot-${idx}-${player.id}`}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => {
                    if (!isEditable) return;
                    e.stopPropagation();
                    setHoverTarget(slotHoverKey);
                  }}
                  onDragLeave={(e) => {
                    if (!isEditable) return;
                    e.stopPropagation();
                    if (hoverTarget === slotHoverKey) setHoverTarget(null);
                  }}
                  onDrop={(e) => handleDropOnSlot(e, idx)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayerClick(player.id);
                  }}
                  style={{
                    left: `${coord.x}%`,
                    top: `${coord.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  title={`${coord.label} (${coord.code}): ${player.name} · Nat. ${player.detailedRole} · OVR Efetivo ${slotFit.effectiveOverall}${
                    slotFit.overallPenalty > 0
                      ? ` (Base ${slotFit.baseOverall}, -${slotFit.overallPenalty})`
                      : ''
                  } · ${player.clubShortName}`}
                  className={`absolute z-20 flex flex-col items-center transition-transform ${
                    isDropHover || isSelected ? 'z-30 scale-105' : 'hover:scale-105'
                  }`}
                >
                  <div
                    draggable={isEditable}
                    onDragStart={(e) => handleDragStart(e, player.id)}
                    onDragEnd={handleDragEnd}
                    className={`relative flex flex-col items-center ${
                      isEditable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                    } ${isDragged ? 'opacity-35 scale-90' : ''}`}
                  >
                    {/* Hover drop fit preview pill */}
                    {isDropHover && incomingFit && (
                      <span
                        className={`mb-1 px-1.5 py-0.5 rounded text-[9px] font-mono tabular-nums font-black shadow whitespace-nowrap ${
                          incomingFit.status === 'EXACT'
                            ? 'bg-emerald-500 text-slate-950'
                            : incomingFit.status === 'ADAPTED'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {incomingFit.effectiveOverall} OVR
                        {incomingFit.overallPenalty > 0
                          ? ` (-${incomingFit.overallPenalty})`
                          : ' Ideal'}
                      </span>
                    )}

                    {/* Jersey Circle */}
                    <div className="relative">
                      <div
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex flex-col items-center justify-center shadow-lg transition-all font-mono tabular-nums ${ringClass}`}
                        style={{
                          backgroundColor: jerseyBg,
                          color: jerseyText,
                        }}
                      >
                        <span className="text-[9px] font-bold leading-none opacity-80">
                          #{idx + 1}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-black leading-tight ${
                            slotFit.isWrongPosition
                              ? 'text-rose-300'
                              : slotFit.status === 'ADAPTED'
                              ? 'text-amber-300'
                              : ''
                          }`}
                        >
                          {slotFit.effectiveOverall}
                        </span>
                      </div>

                      {isCaptain && (
                        <span
                          title="Capitão da Seleção"
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center border border-slate-950"
                        >
                          C
                        </span>
                      )}

                      {slotFit.overallPenalty > 0 && (
                        <span
                          title={slotFit.reasonText}
                          className={`absolute -top-1.5 -left-2 px-1 h-4 rounded-full text-[9px] font-mono tabular-nums font-black flex items-center gap-0.5 border border-slate-950 shadow ${
                            slotFit.isWrongPosition
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-400 text-slate-950'
                          }`}
                        >
                          -{slotFit.overallPenalty}
                        </span>
                      )}
                    </div>

                    {/* Player Nameplate */}
                    <div
                      className={`mt-1 px-2 py-0.5 rounded bg-slate-950/92 border text-center max-w-[116px] shadow ${
                        slotFit.isWrongPosition
                          ? 'border-rose-500/50'
                          : slotFit.status === 'ADAPTED'
                          ? 'border-amber-500/40'
                          : 'border-slate-800'
                      }`}
                    >
                      <div
                        role={inspection && !selectedPlayerId ? 'button' : undefined}
                        tabIndex={inspection && !selectedPlayerId ? 0 : undefined}
                        onClick={(e) => {
                          if (inspection && !selectedPlayerId) {
                            e.stopPropagation();
                            soundEngine.playClick();
                            const { playerObj, clubObj } = resolveInspectable(player, true, idx + 1);
                            inspection.inspectPlayer(playerObj, clubObj);
                          }
                        }}
                        title={
                          selectedPlayerId
                            ? `Trocar com ${player.name}`
                            : `Clique no nome para ver ficha de ${player.name}`
                        }
                        className={`text-[10px] sm:text-[11px] font-bold truncate leading-tight ${
                          player.isUserClubPlayer ? 'text-sky-300' : 'text-white'
                        } ${inspection && !selectedPlayerId ? 'hover:text-sky-300 cursor-pointer' : ''}`}
                      >
                        {shortSurname(player.name)}
                      </div>
                      {slotFit.isOutOfPosition ? (
                        <div
                          className={`text-[9px] font-mono tabular-nums font-bold leading-tight truncate ${
                            slotFit.isWrongPosition ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          {player.detailedRole} → {coord.code} · {slotFit.shortStatusLabel}
                        </div>
                      ) : (
                        <div className="text-[9px] font-mono tabular-nums text-slate-400 leading-tight truncate">
                          {coord.code} · {player.clubShortName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 px-1">
            <span>
              Legenda: Branco = Ideal (0) · Âmbar (-2..-4) = Adaptado · Vermelho (-7+) = Pos. Errada
            </span>
            <span className="font-mono tabular-nums text-sky-300">
              Atletas do seu clube destacados em azul
            </span>
          </div>
        </div>

        {/* RIGHT: TACTICAL STYLE, CAPTAIN & 15-PLAYER BENCH */}
        <div className="lg:col-span-5 space-y-5">
          {/* Postura Tática & Braçadeira de Capitão */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2.5">
                Modelo de Jogo da Seleção
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TACTIC_OPTIONS.map((opt) => {
                  const active = tacticStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!isEditable}
                      onClick={() => {
                        if (!isEditable) return;
                        soundEngine.playClick();
                        onChangeTacticStyle(opt.id);
                      }}
                      className={`text-left p-2.5 rounded-xl border transition-colors ${
                        active
                          ? 'bg-amber-500/10 border-amber-400 text-white'
                          : isEditable
                          ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer'
                          : 'bg-slate-900/40 border-slate-800/60 text-slate-500 cursor-default'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold">{opt.shortLabel}</span>
                        {active && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Captain Selector */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-white">Capitão:</span>
              </div>
              <select
                disabled={!isEditable}
                value={effectiveCaptainId || ''}
                onChange={(e) => {
                  soundEngine.playClick();
                  onSetCaptain(e.target.value);
                }}
                className="flex-1 max-w-[230px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
              >
                {pitchSlots
                  .filter((p): p is ResolvedNationalPlayer => Boolean(p))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.detailedRole} · OVR {p.overall})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* 15 BENCH PLAYERS (SUPLENTES OFICIAIS · CAMISAS 12 A 26) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-3.5 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black text-white">
                  Banco de Suplentes ({benchPlayers.length}/15)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Camisas 12 a 26 · Arraste p/ o campo ou clique para trocar
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {(
                  [
                    { id: 'ALL', label: 'Todos' },
                    { id: 'GK', label: 'GOL' },
                    { id: 'DF', label: 'DEF' },
                    { id: 'MF', label: 'MEI' },
                    { id: 'FW', label: 'ATA' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBenchFilter(f.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      benchFilter === f.id
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-[430px] overflow-y-auto">
              {filteredBench.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhum suplente neste setor. Complete a lista de 26 atletas na aba Convocação.
                </div>
              ) : (
                filteredBench.map((player) => {
                  const shirtNum = 12 + benchPlayers.findIndex((b) => b.id === player.id);
                  const isSelected = selectedPlayerId === player.id;
                  const isDragged = draggedPlayerId === player.id;
                  const canSwapWithSelectedStarter =
                    Boolean(selectedPlayer) &&
                    selectedPlayer!.id !== player.id &&
                    selectedStarterSlotIdx !== -1;

                  const selectedTargetCoord =
                    canSwapWithSelectedStarter && resolvedSlotPositions[selectedStarterSlotIdx]
                      ? resolvedSlotPositions[selectedStarterSlotIdx]
                      : null;

                  const fitIntoSelectedSlot = selectedTargetCoord
                    ? evaluateSelecaoSlotFit(
                        player,
                        selectedTargetCoord.role,
                        selectedTargetCoord.code,
                        selectedTargetCoord.label
                      )
                    : null;

                  const { playerObj, clubObj } = resolveInspectable(player, false, shirtNum);

                  return (
                    <div
                      key={player.id}
                      draggable={isEditable}
                      onDragStart={(e) => handleDragStart(e, player.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnBenchRow(e, player)}
                      onClick={() => handlePlayerClick(player.id)}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-xs transition-colors ${
                        isDragged
                          ? 'opacity-40 scale-95'
                          : isSelected
                          ? 'bg-sky-500/15'
                          : player.isUserClubPlayer
                          ? 'bg-sky-500/5 hover:bg-slate-900/60'
                          : 'hover:bg-slate-900/50'
                      } ${isEditable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 text-center font-mono tabular-nums text-[11px] font-bold text-slate-500 shrink-0">
                          #{shirtNum}
                        </span>
                        <PlayerAvatar
                          player={playerObj}
                          club={clubObj}
                          clubPrimaryColor={clubObj?.colors.primary || player.clubColors?.primary || team.primaryColor}
                          clubTextColor={clubObj?.colors.text || player.clubColors?.text || team.textColor}
                          size="xs"
                          disableInspection={!inspection}
                        />
                        <span className="w-8 text-center font-mono text-[11px] font-bold text-slate-300 shrink-0">
                          {player.detailedRole}
                        </span>
                        <div className="min-w-0">
                          <div
                            role={inspection ? 'button' : undefined}
                            tabIndex={inspection ? 0 : undefined}
                            onClick={(e) => {
                              if (inspection) {
                                e.stopPropagation();
                                soundEngine.playClick();
                                inspection.inspectPlayer(playerObj, clubObj);
                              }
                            }}
                            title={inspection ? `Ver ficha de ${player.name}` : undefined}
                            className={`font-bold truncate ${
                              player.isUserClubPlayer ? 'text-sky-300 font-black' : 'text-white'
                            } ${inspection ? 'hover:text-sky-300 cursor-pointer' : ''}`}
                          >
                            {player.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate font-mono tabular-nums">
                            {player.clubShortName} · {player.age}a · {player.caps}J /{' '}
                            {player.internationalGoals}G
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono tabular-nums font-black text-amber-400 text-sm">
                          {player.overall}
                        </span>

                        {isEditable && (
                          <span
                            title={fitIntoSelectedSlot?.reasonText}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap font-mono tabular-nums ${
                              isSelected
                                ? 'bg-sky-400 text-slate-950 font-black'
                                : fitIntoSelectedSlot && selectedTargetCoord
                                ? fitIntoSelectedSlot.status === 'EXACT'
                                  ? 'bg-emerald-400 text-slate-950 font-black'
                                  : fitIntoSelectedSlot.status === 'ADAPTED'
                                  ? 'bg-amber-400 text-slate-950 font-black'
                                  : 'bg-rose-600 text-white font-black'
                                : 'bg-slate-900 border border-slate-700 text-slate-300'
                            }`}
                          >
                            {isSelected
                              ? 'Selecionado'
                              : fitIntoSelectedSlot && selectedTargetCoord
                              ? fitIntoSelectedSlot.overallPenalty === 0
                                ? `Ideal (${selectedTargetCoord.code})`
                                : `-${fitIntoSelectedSlot.overallPenalty} em ${selectedTargetCoord.code}`
                              : 'Escalar'}
                          </span>
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

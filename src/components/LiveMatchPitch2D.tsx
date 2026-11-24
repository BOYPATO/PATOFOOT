import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Club, InGameTacticOrder, MatchEvent, Player } from '../types/game';
import { PitchPosition, getPlayerShortName } from '../utils/matchPitchLayout';
import {
  LiveEngineState,
  TeamSide,
  createInitialLiveEngineState,
  resetToKickoff,
  stepLiveMatchEngine,
} from '../utils/liveMatchMovementEngine';

interface LiveMatchPitch2DProps {
  homeClub: Club;
  awayClub: Club;
  homeStarters: Player[];
  awayStarters: Player[];
  homeBaseSlots: Map<string, PitchPosition>;
  awayBaseSlots: Map<string, PitchPosition>;
  homeDefendsLeft: boolean;
  isSecondHalf: boolean;
  isUserHome: boolean;
  isPlaying: boolean;
  isHalftime: boolean;
  isFinished: boolean;
  isPausedByStoppage: boolean;
  speed: number;
  minute: number;
  inGameTactic: InGameTacticOrder;
  preferredPossession: TeamSide;
  events: MatchEvent[];
  yellowCardPlayerIds: Set<string>;
  redCardPlayerIds: Set<string>;
  goalScorerPlayerIds: Set<string>;
  homeCaptainId?: string;
  awayCaptainId?: string;
  activeShot: {
    type: 'GOL' | 'DEFESAÇA' | 'CHUTE_TRAVE';
    shooterName: string;
    targetPos: { x: number; y: number };
  } | null;
  activeKeeperDive: {
    keeperId: string;
    targetY: number;
    angle: number;
  } | null;
  activeGoalNetShake: 'left' | 'right' | null;
  activeWoodworkFlash: { x: number; y: number } | null;
  showSectorOverlay: boolean;
  sectorPercentages: {
    homeThirdPct: number;
    midThirdPct: number;
    awayThirdPct: number;
  };
  onSelectStarterOnPitch: (starter: Player) => void;
  onLiveTelemetrySample?: (ballX: number, livePossTeam: TeamSide) => void;
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

function hasKitClash(hexA: string, hexB: string): boolean {
  const a = parseHexRgb(hexA);
  const b = parseHexRgb(hexB);
  if (!a || !b) return false;
  const dist = Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
  return dist < 85;
}

function getReadableTextForBg(hex: string, fallback: string): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return fallback || '#ffffff';
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.62 ? '#090d16' : '#ffffff';
}

export const LiveMatchPitch2D: React.FC<LiveMatchPitch2DProps> = React.memo(({
  homeClub,
  awayClub,
  homeStarters,
  awayStarters,
  homeBaseSlots,
  awayBaseSlots,
  homeDefendsLeft,
  isSecondHalf,
  isUserHome,
  isPlaying,
  isHalftime,
  isFinished,
  isPausedByStoppage,
  speed,
  minute,
  inGameTactic,
  preferredPossession,
  events,
  yellowCardPlayerIds,
  redCardPlayerIds,
  goalScorerPlayerIds,
  homeCaptainId,
  awayCaptainId,
  activeShot,
  activeKeeperDive,
  activeGoalNetShake,
  activeWoodworkFlash,
  showSectorOverlay,
  sectorPercentages,
  onSelectStarterOnPitch,
  onLiveTelemetrySample,
}) => {
  const engineRef = useRef<LiveEngineState | null>(null);
  const [, setRenderTick] = useState<number>(0);

  // Resolve kit clash automatically for away team if needed
  const awayKitColors = useMemo(() => {
    const clash = hasKitClash(homeClub.colors.primary, awayClub.colors.primary);
    if (!clash) {
      return {
        fill: awayClub.colors.primary,
        border: awayClub.colors.secondary || '#ffffff',
        text: awayClub.colors.text || getReadableTextForBg(awayClub.colors.primary, '#ffffff'),
      };
    }
    const altFill =
      awayClub.colors.secondary && !hasKitClash(homeClub.colors.primary, awayClub.colors.secondary)
        ? awayClub.colors.secondary
        : '#f8fafc';
    return {
      fill: altFill,
      border: awayClub.colors.primary || '#38bdf8',
      text: getReadableTextForBg(altFill, '#0f172a'),
    };
  }, [homeClub.colors, awayClub.colors]);

  const homeKitColors = useMemo(
    () => ({
      fill: homeClub.colors.primary,
      border: homeClub.colors.secondary || '#ffffff',
      text: homeClub.colors.text || getReadableTextForBg(homeClub.colors.primary, '#ffffff'),
    }),
    [homeClub.colors]
  );

  // Lazy-initialize engine state once
  if (!engineRef.current) {
    engineRef.current = createInitialLiveEngineState(
      homeStarters,
      awayStarters,
      homeBaseSlots,
      awayBaseSlots,
      homeDefendsLeft
    );
  }

  // Keep latest props in a ref for the 60fps requestAnimationFrame loop
  const latestPropsRef = useRef({
    homeClub,
    awayClub,
    homeStarters,
    awayStarters,
    homeBaseSlots,
    awayBaseSlots,
    homeDefendsLeft,
    isUserHome,
    isPlaying,
    isHalftime,
    isFinished,
    isPausedByStoppage,
    speed,
    minute,
    inGameTactic,
    preferredPossession,
    redCardPlayerIds,
    latestEvent: events.length > 0 ? events[events.length - 1] : null,
    activeShot,
    activeKeeperDive,
    onLiveTelemetrySample,
  });

  latestPropsRef.current = {
    homeClub,
    awayClub,
    homeStarters,
    awayStarters,
    homeBaseSlots,
    awayBaseSlots,
    homeDefendsLeft,
    isUserHome,
    isPlaying,
    isHalftime,
    isFinished,
    isPausedByStoppage,
    speed,
    minute,
    inGameTactic,
    preferredPossession,
    redCardPlayerIds,
    latestEvent: events.length > 0 ? events[events.length - 1] : null,
    activeShot,
    activeKeeperDive,
    onLiveTelemetrySample,
  };

  // Reset positions cleanly when paused at Halftime
  useEffect(() => {
    if (isHalftime && engineRef.current) {
      resetToKickoff(engineRef.current, 'away', homeDefendsLeft);
      setRenderTick((t) => (t + 1) % 1000000);
    }
  }, [isHalftime, homeDefendsLeft]);

  // Also re-sync immediately when substitutions happen while paused
  useEffect(() => {
    if (!engineRef.current) return;
    const p = latestPropsRef.current;
    if (!p.isPlaying || p.isHalftime || p.isPausedByStoppage) {
      stepLiveMatchEngine(engineRef.current, {
        dt: 0.016,
        speedMultiplier: 1,
        minute: p.minute,
        homeClub: p.homeClub,
        awayClub: p.awayClub,
        homeStarters: p.homeStarters,
        awayStarters: p.awayStarters,
        homeBaseSlots: p.homeBaseSlots,
        awayBaseSlots: p.awayBaseSlots,
        homeDefendsLeft: p.homeDefendsLeft,
        isUserHome: p.isUserHome,
        inGameTactic: p.inGameTactic,
        preferredPossession: p.preferredPossession,
        redCardPlayerIds: p.redCardPlayerIds,
        latestEvent: p.latestEvent,
        activeShot: p.activeShot,
        activeKeeperDive: p.activeKeeperDive,
      });
      setRenderTick((t) => (t + 1) % 1000000);
    }
  }, [homeStarters, awayStarters, redCardPlayerIds]);

  // Performance-paced Football Simulation Loop:
  // - Stops completely when paused, at halftime, finished, or tab hidden (0% idle CPU/battery)
  // - Caps React DOM updates at 30fps on Mobile/Lite mode and ~48fps on Desktop while keeping physics smooth
  const isLoopActive = isPlaying && !isHalftime && !isFinished && !isPausedByStoppage;

  useEffect(() => {
    if (!isLoopActive) return;

    let rafId: number | null = null;
    let lastTime = performance.now();
    let sampleAccum = 0;
    let paintAccum = 0;

    const loop = (now: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        lastTime = now;
        rafId = requestAnimationFrame(loop);
        return;
      }

      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const p = latestPropsRef.current;
      const shouldStep =
        p.isPlaying && !p.isHalftime && !p.isFinished && !p.isPausedByStoppage;

      if (shouldStep && engineRef.current) {
        stepLiveMatchEngine(engineRef.current, {
          dt: rawDt,
          speedMultiplier: p.speed,
          minute: p.minute,
          homeClub: p.homeClub,
          awayClub: p.awayClub,
          homeStarters: p.homeStarters,
          awayStarters: p.awayStarters,
          homeBaseSlots: p.homeBaseSlots,
          awayBaseSlots: p.awayBaseSlots,
          homeDefendsLeft: p.homeDefendsLeft,
          isUserHome: p.isUserHome,
          inGameTactic: p.inGameTactic,
          preferredPossession: p.preferredPossession,
          redCardPlayerIds: p.redCardPlayerIds,
          latestEvent: p.latestEvent,
          activeShot: p.activeShot,
          activeKeeperDive: p.activeKeeperDive,
        });

        sampleAccum += rawDt;
        if (sampleAccum >= 0.45 && p.onLiveTelemetrySample) {
          sampleAccum = 0;
          const b = engineRef.current.ball;
          const carrier = b.carrierId ? engineRef.current.agents.get(b.carrierId) : null;
          const poss: TeamSide = carrier ? carrier.team : b.lastTouchTeam;
          p.onLiveTelemetrySample(b.x, poss);
        }

        const isLite =
          typeof document !== 'undefined' &&
          document.documentElement.dataset.perf === 'lite';
        const targetFrameInterval = isLite ? 0.033 : 0.021;
        paintAccum += rawDt;
        if (paintAccum >= targetFrameInterval) {
          paintAccum = 0;
          setRenderTick((t) => (t + 1) % 1000000);
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isLoopActive]);

  const state = engineRef.current!;
  const ball = state.ball;

  // Compute live danger zone glow directly from ball position when near either penalty box
  const liveDangerSide: 'left' | 'right' | null =
    !isHalftime && !isFinished
      ? ball.x > 80
        ? 'right'
        : ball.x < 20
        ? 'left'
        : null
      : null;

  const renderTeamPlayers = (starters: Player[], club: Club, team: TeamSide) => {
    const isUser = team === 'home' ? isUserHome : !isUserHome;
    const kit = team === 'home' ? homeKitColors : awayKitColors;
    const captainId = team === 'home' ? homeCaptainId : awayCaptainId;

    return starters.map((player) => {
      if (redCardPlayerIds.has(player.id)) return null;
      const ag = state.agents.get(player.id);
      if (!ag) return null;

      const isCarrier = ball.carrierId === player.id;
      const isPassTarget = ball.passTargetId === player.id;
      const isPresser = ag.intent === 'PRESS_BALL';
      const isAttackingRun =
        (ag.intent === 'RUN_BEHIND' ||
          ag.intent === 'OVERLAP' ||
          ag.intent === 'BOX_CRASH' ||
          ag.intent === 'CUT_INSIDE') &&
        ag.sprintRatio > 0.68;
      const hasYellow = yellowCardPlayerIds.has(player.id);
      const hasGoal = goalScorerPlayerIds.has(player.id);
      const isInjuredOnPitch = player.injuryWeeks > 0 || Boolean(player.injuryDetails);
      const isDivingGk = activeKeeperDive?.keeperId === player.id;

      const gkKitFill = ag.isGk
        ? team === 'home'
          ? '#eab308'
          : '#06b6d4'
        : kit.fill;
      const gkKitText = ag.isGk ? '#090d16' : kit.text;
      const gkKitBorder = ag.isGk ? '#ffffff' : kit.border;

      const headingDeg = Math.round((ag.heading * 180) / Math.PI);

      return (
        <div
          key={player.id}
          style={{
            left: `${ag.x.toFixed(2)}%`,
            top: `${ag.y.toFixed(2)}%`,
            transform: isDivingGk
              ? `translate3d(-50%, -50%, 0) rotate(${activeKeeperDive.angle}deg) scale(1.22)`
              : 'translate3d(-50%, -50%, 0)',
          }}
          onClick={() => {
            if (isUser) {
              onSelectStarterOnPitch(player);
            }
          }}
          className={`absolute flex flex-col items-center group will-change-transform ${
            isUser ? 'cursor-pointer' : 'cursor-default'
          } ${
            isDivingGk
              ? 'z-40'
              : isCarrier || isInjuredOnPitch
              ? 'z-25'
              : isPassTarget || isPresser
              ? 'z-20'
              : 'z-10'
          }`}
          title={`${player.name} (${player.detailedRole}) · OVR ${player.overall} · Cond ${player.condition}%${
            isInjuredOnPitch
              ? ' · MACHUCADO (Substituir!)'
              : isUser
              ? ' · Clique para substituir'
              : ''
          }`}
        >
          {/* Subtle Directional Heading Pointer & Tactical Halo */}
          <div className="relative flex items-center justify-center">
            {ag.sprintRatio > 0.28 && !isDivingGk && (
              <div
                style={{ transform: `rotate(${headingDeg}deg)` }}
                className="absolute inset-[-4px] pointer-events-none flex items-center justify-end"
              >
                <span
                  className={`w-1.5 h-1.5 rotate-45 translate-x-[2px] rounded-[1px] ${
                    isCarrier
                      ? 'bg-sky-300'
                      : isAttackingRun
                      ? 'bg-emerald-300'
                      : isPresser
                      ? 'bg-amber-400'
                      : 'bg-white/55'
                  }`}
                />
              </div>
            )}

            {/* Player Token Disc */}
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-[9px] sm:text-[10px] border-[1.5px] transition-transform duration-150 group-hover:scale-125 select-none ${
                isInjuredOnPitch
                  ? 'ring-2 ring-rose-500 ring-offset-1 ring-offset-black scale-115'
                  : isDivingGk
                  ? 'ring-3 ring-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.9)]'
                  : isCarrier
                  ? 'ring-2 ring-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.75)] scale-110'
                  : isPassTarget
                  ? 'ring-1 ring-sky-400/80'
                  : isPresser
                  ? 'ring-1 ring-amber-400/80'
                  : ''
              } ${
                isUser
                  ? 'hover:ring-2 hover:ring-amber-400 hover:ring-offset-1 hover:ring-offset-black'
                  : ''
              }`}
              style={{
                backgroundColor: gkKitFill,
                color: gkKitText,
                borderColor: gkKitBorder,
                boxShadow: '0 2px 5px rgba(0,0,0,0.75), inset 0 1px 2px rgba(255,255,255,0.35)',
              }}
            >
              <span>{player.squadNumber}</span>
            </div>
          </div>

          {/* Diving Goalkeeper Save Toast */}
          {isDivingGk && (
            <div className="absolute -top-6 px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-black text-[9px] shadow-xl animate-bounce whitespace-nowrap border border-white">
              🧤 DEFESAÇA!
            </div>
          )}

          {/* Compact Broadcast Name Label */}
          <div
            className={`mt-0.5 px-1 py-[1px] rounded border text-[8px] sm:text-[8.5px] font-bold whitespace-nowrap max-w-[74px] sm:max-w-[88px] truncate text-center flex items-center gap-0.5 pointer-events-none tabular-nums leading-tight ${
              isInjuredOnPitch
                ? 'bg-rose-950/95 border-rose-500 text-rose-200'
                : isCarrier
                ? 'bg-slate-950/95 border-sky-400/70 text-sky-100'
                : 'bg-black/75 border-white/15 text-slate-100'
            }`}
          >
            {captainId === player.id && (
              <span className="text-amber-300 font-black" title="Capitão">
                ©
              </span>
            )}
            <span>{getPlayerShortName(player)}</span>
            {isInjuredOnPitch && <span title="Machucado">🚑</span>}
            {hasGoal && <span title="Gol">⚽</span>}
            {hasYellow && <span title="Cartão Amarelo">🟨</span>}
          </div>
        </div>
      );
    });
  };

  const ballScale = 1 + Math.min(0.55, ball.z * 0.55);
  const ballShadowOffset = Math.min(10, ball.z * 14);

  return (
    <div
      className="relative w-full aspect-[2.1/1] rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl select-none"
      style={{
        backgroundColor: '#071d16',
        backgroundImage:
          'radial-gradient(ellipse at 50% 50%, rgba(16, 68, 49, 0.45) 0%, rgba(4, 15, 12, 0.85) 100%)',
      }}
    >
      {/* Alternating Mown Stadium Grass Stripes */}
      <div className="absolute inset-0 flex pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-full flex-1"
            style={{
              backgroundColor: i % 2 === 0 ? 'rgba(16, 185, 129, 0.045)' : 'rgba(0, 0, 0, 0.08)',
            }}
          />
        ))}
      </div>

      {/* 3-Sector Territorial Dominance Overlay (Toggleable) */}
      {showSectorOverlay &&
        (() => {
          const leftPct = homeDefendsLeft
            ? sectorPercentages.homeThirdPct
            : sectorPercentages.awayThirdPct;
          const rightPct = homeDefendsLeft
            ? sectorPercentages.awayThirdPct
            : sectorPercentages.homeThirdPct;
          const leftDefClub = homeDefendsLeft ? homeClub : awayClub;
          const rightDefClub = homeDefendsLeft ? awayClub : homeClub;

          return (
            <div className="absolute inset-0 grid grid-cols-3 pointer-events-none z-[2]">
              <div
                className="h-full border-r border-dashed border-sky-400/30 flex flex-col justify-end items-center pb-2 transition-opacity duration-300"
                style={{
                  backgroundColor:
                    leftPct >= 36 ? 'rgba(56, 189, 248, 0.11)' : 'rgba(15, 23, 42, 0.16)',
                }}
              >
                <span className="text-[10px] font-mono font-bold tabular-nums text-sky-200/95 bg-black/70 px-2 py-0.5 rounded">
                  {leftPct}% · Campo {leftDefClub.shortName}
                </span>
              </div>
              <div
                className="h-full border-r border-dashed border-sky-400/30 flex flex-col justify-end items-center pb-2 transition-opacity duration-300"
                style={{
                  backgroundColor:
                    sectorPercentages.midThirdPct >= 42
                      ? 'rgba(148, 163, 184, 0.09)'
                      : 'transparent',
                }}
              >
                <span className="text-[10px] font-mono font-bold tabular-nums text-slate-200/95 bg-black/70 px-2 py-0.5 rounded">
                  {sectorPercentages.midThirdPct}% · Meio-Campo
                </span>
              </div>
              <div
                className="h-full flex flex-col justify-end items-center pb-2 transition-opacity duration-300"
                style={{
                  backgroundColor:
                    rightPct >= 36 ? 'rgba(56, 189, 248, 0.11)' : 'rgba(15, 23, 42, 0.16)',
                }}
              >
                <span className="text-[10px] font-mono font-bold tabular-nums text-sky-200/95 bg-black/70 px-2 py-0.5 rounded">
                  {rightPct}% · Campo {rightDefClub.shortName}
                </span>
              </div>
            </div>
          );
        })()}

      {/* Authentic FIFA Proportions Pitch Markings & Live Pass/Shot Vectors */}
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Touchlines & Goal Lines (3%..97% X, 4%..96% Y) */}
        <rect
          x="30"
          y="20"
          width="940"
          height="460"
          fill="none"
          stroke="rgba(226, 232, 240, 0.34)"
          strokeWidth="2.2"
        />

        {/* Halfway Line & Center Circle */}
        <line
          x1="500"
          y1="20"
          x2="500"
          y2="480"
          stroke="rgba(226, 232, 240, 0.34)"
          strokeWidth="2"
        />
        <circle
          cx="500"
          cy="250"
          r="72"
          fill="none"
          stroke="rgba(226, 232, 240, 0.34)"
          strokeWidth="2"
        />
        <circle cx="500" cy="250" r="3.5" fill="rgba(226, 232, 240, 0.65)" />

        {/* Corner Arcs */}
        <path d="M 30 34 A 14 14 0 0 0 44 20" fill="none" stroke="rgba(226, 232, 240, 0.34)" strokeWidth="1.8" />
        <path d="M 956 20 A 14 14 0 0 0 970 34" fill="none" stroke="rgba(226, 232, 240, 0.34)" strokeWidth="1.8" />
        <path d="M 44 480 A 14 14 0 0 0 30 466" fill="none" stroke="rgba(226, 232, 240, 0.34)" strokeWidth="1.8" />
        <path d="M 970 466 A 14 14 0 0 0 956 480" fill="none" stroke="rgba(226, 232, 240, 0.34)" strokeWidth="1.8" />

        {/* Left 18-Yard Penalty Area, 6-Yard Box, Penalty Spot & D-Arc */}
        <rect
          x="30"
          y="110"
          width="150"
          height="280"
          fill={activeGoalNetShake === 'left' ? 'rgba(251, 191, 36, 0.12)' : 'none'}
          stroke={activeGoalNetShake === 'left' ? '#f59e0b' : 'rgba(226, 232, 240, 0.34)'}
          strokeWidth={activeGoalNetShake === 'left' ? '3' : '2'}
        />
        <rect
          x="30"
          y="182"
          width="54"
          height="136"
          fill="none"
          stroke="rgba(226, 232, 240, 0.34)"
          strokeWidth="1.8"
        />
        <circle cx="130" cy="250" r="3" fill="rgba(226, 232, 240, 0.6)" />
        <path
          d="M 180 198 A 66 66 0 0 1 180 302"
          fill="none"
          stroke="rgba(226, 232, 240, 0.34)"
          strokeWidth="1.8"
        />

        {/* Right 18-Yard Penalty Area, 6-Yard Box, Penalty Spot & D-Arc */}
        <rect
          x="820"
          y="110"
          width="150"
          height="280"
          fill={activeGoalNetShake === 'right' ? 'rgba(251, 191, 36, 0.12)' : 'none'}
          stroke={activeGoalNetShake === 'right' ? '#f59e0b' : 'rgba(226, 232, 240, 0.34)'}
          strokeWidth={activeGoalNetShake === 'right' ? '3' : '2'}
        />
        <rect
          x="916"
          y="182"
          width="54"
          height="136"
          fill="none"
          stroke="rgba(226, 232, 240, 0.34)"
          strokeWidth="1.8"
        />
        <circle cx="870" cy="250" r="3" fill="rgba(226, 232, 240, 0.6)" />
        <path
          d="M 820 198 A 66 66 0 0 0 820 302"
          fill="none"
          stroke="rgba(226, 232, 240, 0.34)"
          strokeWidth="1.8"
        />

        {/* Left & Right Goal Nets (y: 42%..58% => 210..290) */}
        <rect
          x="10"
          y="210"
          width="20"
          height="80"
          rx="2"
          fill={activeGoalNetShake === 'left' ? 'rgba(251, 191, 36, 0.35)' : 'rgba(255, 255, 255, 0.08)'}
          stroke={activeGoalNetShake === 'left' ? '#fbbf24' : 'rgba(255, 255, 255, 0.65)'}
          strokeWidth={activeGoalNetShake === 'left' ? '3' : '2'}
        />
        <rect
          x="970"
          y="210"
          width="20"
          height="80"
          rx="2"
          fill={activeGoalNetShake === 'right' ? 'rgba(251, 191, 36, 0.35)' : 'rgba(255, 255, 255, 0.08)'}
          stroke={activeGoalNetShake === 'right' ? '#fbbf24' : 'rgba(255, 255, 255, 0.65)'}
          strokeWidth={activeGoalNetShake === 'right' ? '3' : '2'}
        />

        {/* Active Pass Target Guide Line when a pass/cross is in flight */}
        {ball.passTargetPos && !activeShot && (
          <>
            <line
              x1={ball.x * 10}
              y1={ball.y * 5}
              x2={ball.passTargetPos.x * 10}
              y2={ball.passTargetPos.y * 5}
              stroke={ball.z > 0.12 ? 'rgba(125, 211, 252, 0.42)' : 'rgba(56, 189, 248, 0.30)'}
              strokeWidth={ball.z > 0.12 ? '2' : '1.5'}
              strokeDasharray={ball.z > 0.12 ? '6 4' : '3 4'}
              strokeLinecap="round"
            />
            <circle
              cx={ball.passTargetPos.x * 10}
              cy={ball.passTargetPos.y * 5}
              r="9"
              fill="none"
              stroke="rgba(56, 189, 248, 0.35)"
              strokeWidth="1.4"
            />
          </>
        )}

        {/* Shot Strike Laser Trail */}
        {(activeShot || state.phase === 'SHOT_SEQUENCE') &&
          ball.trail.length >= 2 &&
          ball.trail.slice(-2).map((pt, idx, arr) => {
            if (idx === arr.length - 1) return null;
            const nxt = arr[idx + 1];
            return (
              <line
                key={`shot_${idx}`}
                x1={pt.x * 10}
                y1={pt.y * 5}
                x2={nxt.x * 10}
                y2={nxt.y * 5}
                stroke={activeShot?.type === 'DEFESAÇA' ? '#22d3ee' : '#fbbf24'}
                strokeWidth="3.5"
                strokeOpacity="0.85"
                strokeLinecap="round"
              />
            );
          })}
      </svg>

      {/* Defending Goal Indicators */}
      <div className="absolute top-2 left-4 text-[10px] font-bold text-slate-200/90 uppercase tracking-wider pointer-events-none flex items-center gap-1.5 bg-black/65 px-2 py-0.5 rounded border border-white/15 shadow">
        <span>🛡️</span>
        <span>Gol {homeDefendsLeft ? homeClub.shortName : awayClub.shortName}</span>
      </div>

      {/* Center Match Half & Side Switch Status Indicator */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider pointer-events-none bg-slate-950/90 px-3 py-0.5 rounded border border-white/15 flex items-center gap-1.5 shadow-md">
        {isHalftime ? (
          <span className="text-amber-400">⏸️ INTERVALO (45&apos;)</span>
        ) : isSecondHalf ? (
          <>
            <span className="text-amber-400">🔄 2º TEMPO</span>
            <span className="text-slate-300">· Lados Invertidos</span>
          </>
        ) : (
          <span className="text-emerald-300">⚽ 1º TEMPO</span>
        )}
      </div>

      <div className="absolute top-2 right-4 text-[10px] font-bold text-slate-200/90 uppercase tracking-wider pointer-events-none flex items-center gap-1.5 bg-black/65 px-2 py-0.5 rounded border border-white/15 shadow">
        <span>Gol {homeDefendsLeft ? awayClub.shortName : homeClub.shortName}</span>
        <span>🛡️</span>
      </div>

      {/* Render Home & Away Players with Free 60fps Movement */}
      {renderTeamPlayers(homeStarters, homeClub, 'home')}
      {renderTeamPlayers(awayStarters, awayClub, 'away')}

      {/* Ground Shadow for Lofted / Airborne Ball */}
      {ball.z > 0.04 && (
        <div
          style={{
            left: `${ball.x.toFixed(2)}%`,
            top: `${ball.y.toFixed(2)}%`,
            transform: `translate3d(-50%, calc(-50% + ${ballShadowOffset.toFixed(1)}px), 0)`,
          }}
          className="absolute z-28 w-3.5 h-2 rounded-full bg-black/55 blur-[1px] pointer-events-none"
        />
      )}

      {/* The Live Football */}
      <div
        style={{
          left: `${ball.x.toFixed(2)}%`,
          top: `${ball.y.toFixed(2)}%`,
          transform: `translate3d(-50%, calc(-50% - ${(ball.z * 11).toFixed(1)}px), 0) scale(${ballScale.toFixed(2)})`,
        }}
        className={`absolute z-30 rounded-full flex items-center justify-center pointer-events-none will-change-transform ${
          activeShot?.type === 'GOL'
            ? 'w-4.5 h-4.5 bg-amber-300 shadow-[0_0_22px_rgba(251,191,36,1)] border-2 border-white'
            : activeShot?.type === 'DEFESAÇA'
            ? 'w-4 h-4 bg-cyan-200 shadow-[0_0_16px_rgba(34,211,238,1)] border-2 border-white'
            : activeShot?.type === 'CHUTE_TRAVE'
            ? 'w-4 h-4 bg-orange-400 shadow-[0_0_16px_rgba(249,115,22,1)] border-2 border-white'
            : 'w-3.5 h-3.5 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.85)] border-[1.5px] border-slate-900'
        }`}
      >
        <div
          className={`rounded-full ${
            activeShot ? 'w-1.5 h-1.5 bg-amber-600' : 'w-1 h-1 bg-slate-900'
          }`}
        />
      </div>

      {/* Woodwork Hit Spark Flash */}
      {activeWoodworkFlash && (
        <div
          style={{
            left: `${activeWoodworkFlash.x}%`,
            top: `${Math.max(41, Math.min(59, activeWoodworkFlash.y))}%`,
          }}
          className="absolute z-40 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
        >
          <div className="w-8 h-8 rounded-full bg-amber-400/90 animate-ping" />
          <span className="absolute -top-6 px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] shadow-lg whitespace-nowrap animate-bounce border border-white">
            ⚡ NA TRAVE!
          </span>
        </div>
      )}

      {/* Goal Celebration Burst Banner in Net */}
      {activeGoalNetShake && (
        <div
          style={{
            left: activeGoalNetShake === 'left' ? '9%' : '91%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          className="absolute z-40 flex flex-col items-center pointer-events-none animate-pulse"
        >
          <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs shadow-2xl border-2 border-white tracking-widest whitespace-nowrap">
            ⚽ GOOOOL!
          </span>
        </div>
      )}

      {/* Live Attacking Third Danger Glow */}
      {liveDangerSide && (
        <div
          className={`absolute inset-y-0 w-1/5 pointer-events-none transition-opacity duration-300 ${
            liveDangerSide === 'right'
              ? 'right-0 bg-gradient-to-l from-amber-500/15 to-transparent'
              : 'left-0 bg-gradient-to-r from-amber-500/15 to-transparent'
          }`}
        />
      )}
    </div>
  );
});

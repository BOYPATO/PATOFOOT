import { Club, DetailedRole, InGameTacticOrder, MatchEvent, Player } from '../types/game';
import { PitchPosition, inferTacticalZoneFromCoords } from './matchPitchLayout';

export type TeamSide = 'home' | 'away';

export type AgentIntent =
  | 'DRIBBLE'
  | 'RECEIVE_PASS'
  | 'SUPPORT'
  | 'RUN_BEHIND'
  | 'OVERLAP'
  | 'CUT_INSIDE'
  | 'BOX_CRASH'
  | 'DROP_DEEP'
  | 'HOLD_WIDTH'
  | 'PRESS_BALL'
  | 'COVER_SHADOW'
  | 'TRACK_RUN'
  | 'HOLD_LINE'
  | 'SWEEP_GK'
  | 'DIVE_GK'
  | 'SET_PIECE'
  | 'CELEBRATE';

export type PlayPhase =
  | 'KICKOFF'
  | 'OPEN_PLAY'
  | 'SHOT_SEQUENCE'
  | 'CORNER_SEQUENCE'
  | 'FREEKICK_SEQUENCE'
  | 'PENALTY_SEQUENCE'
  | 'GOAL_CELEBRATION';

export interface LivePitchAgent {
  id: string;
  team: TeamSide;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  targetX: number;
  targetY: number;
  baseX: number;
  baseY: number;
  role: DetailedRole;
  isGk: boolean;
  lane: 'TOP' | 'HALF_TOP' | 'CENTER' | 'HALF_BOTTOM' | 'BOTTOM';
  overall: number;
  condition: number;
  intent: AgentIntent;
  sprintRatio: number; // 0..1 visual & physics sprint intensity
  burstTimer: number;
  roamDx: number;
  roamDy: number;
  seed: number;
}

export interface LiveBallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number; // 0 = ground, >0 = airborne (lofted pass, cross, shot)
  vz: number;
  carrierId: string | null;
  passFromId: string | null;
  passTargetId: string | null;
  passTargetPos: { x: number; y: number } | null;
  lastTouchTeam: TeamSide;
  decisionCooldown: number;
  carrierHoldTime: number;
  trail: Array<{ x: number; y: number; z: number; isShot?: boolean }>;
}

export interface LiveEngineState {
  agents: Map<string, LivePitchAgent>;
  ball: LiveBallState;
  phase: PlayPhase;
  phaseTimer: number;
  lastProcessedEventId: string | null;
  lastHalfSide: boolean; // homeDefendsLeft snapshot
  celebrationOrigin: { x: number; y: number; scorerId: string | null; team: TeamSide } | null;
  setPieceOrigin: { x: number; y: number; takerId: string | null; attackingTeam: TeamSide } | null;
  clockSec: number;
}

export interface EngineStepContext {
  dt: number; // real frame delta in seconds (clamped <= 0.05)
  speedMultiplier: number; // 1, 2, 4
  minute: number;
  homeClub: Club;
  awayClub: Club;
  homeStarters: Player[];
  awayStarters: Player[];
  homeBaseSlots: Map<string, PitchPosition>;
  awayBaseSlots: Map<string, PitchPosition>;
  homeDefendsLeft: boolean;
  isUserHome: boolean;
  inGameTactic: InGameTacticOrder;
  preferredPossession: TeamSide;
  redCardPlayerIds: Set<string>;
  latestEvent: MatchEvent | null;
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
  homeCornerTakerId?: string;
  awayCornerTakerId?: string;
  homeFreekickTakerId?: string;
  awayFreekickTakerId?: string;
  homePenaltyTakerId?: string;
  awayPenaltyTakerId?: string;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function hashPlayerSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function inferAgentLane(baseY: number): LivePitchAgent['lane'] {
  if (baseY <= 24) return 'TOP';
  if (baseY <= 41) return 'HALF_TOP';
  if (baseY < 59) return 'CENTER';
  if (baseY < 76) return 'HALF_BOTTOM';
  return 'BOTTOM';
}

function resolveEffectiveRole(player: Player): { role: DetailedRole; isGk: boolean } {
  if (typeof player.pitchX === 'number' && typeof player.pitchY === 'number') {
    const z = inferTacticalZoneFromCoords(player.pitchX, player.pitchY);
    return { role: z.role, isGk: z.role === 'GOL' };
  }
  const isGk = player.position === 'GK' || player.detailedRole === 'GOL';
  if (isGk) return { role: 'GOL', isGk: true };
  if (player.detailedRole) return { role: player.detailedRole, isGk: false };
  if (player.position === 'DF') return { role: 'ZAG', isGk: false };
  if (player.position === 'MF') return { role: 'MEI', isGk: false };
  return { role: 'ATA', isGk: false };
}

function getTeamAggressionProfile(
  club: Club,
  isUserTeam: boolean,
  inGameTactic: InGameTacticOrder
): {
  lineHeightBias: number; // -0.22..+0.26
  pressCount: number; // 1 or 2 active pressers
  roamFreedom: number; // 0.85..1.35
  directness: number; // 0.0 (short tiki-taka) .. 1.0 (direct counter/long)
  crossTendency: number; // 0.1..0.75
} {
  let lineHeightBias = 0;
  let pressCount = 1;
  let roamFreedom = 1.05;
  let directness = 0.42;
  let crossTendency = 0.24;

  const mentality = club.tactics?.mentality || 'Equilibrado';
  const marking = club.tactics?.marking || 'Normal';
  const passing = club.tactics?.passing || 'Misto';

  if (mentality === 'Muito Defensivo') {
    lineHeightBias -= 0.16;
    roamFreedom = 0.88;
  } else if (mentality === 'Defensivo') {
    lineHeightBias -= 0.09;
    roamFreedom = 0.95;
  } else if (mentality === 'Ofensivo') {
    lineHeightBias += 0.10;
    roamFreedom = 1.18;
  } else if (mentality === 'Pressão Total') {
    lineHeightBias += 0.18;
    pressCount = 2;
    roamFreedom = 1.25;
  }

  if (marking === 'Pesada') {
    pressCount = 2;
    lineHeightBias += 0.04;
  }

  if (passing === 'Curto (Posse)') {
    directness = 0.22;
    roamFreedom += 0.1;
  } else if (passing === 'Longo (Contra-ataque)') {
    directness = 0.72;
    crossTendency += 0.1;
  }

  if (isUserTeam) {
    if (inGameTactic === 'PRESSAO_TOTAL') {
      lineHeightBias += 0.14;
      pressCount = 2;
      roamFreedom = 1.28;
    } else if (inGameTactic === 'RETRANCA') {
      lineHeightBias = -0.22;
      pressCount = 1;
      roamFreedom = 0.85;
      directness = 0.65;
    } else if (inGameTactic === 'CONTRA_ATAQUE') {
      lineHeightBias -= 0.08;
      directness = 0.82;
      roamFreedom = 1.15;
    } else if (inGameTactic === 'CHUVEIRINHO') {
      lineHeightBias += 0.10;
      directness = 0.76;
      crossTendency = 0.72;
      roamFreedom = 1.22;
    } else if (inGameTactic === 'SEGURAR_RESULTADO') {
      lineHeightBias -= 0.13;
      pressCount = 1;
      roamFreedom = 0.88;
      directness = 0.18;
      crossTendency = 0.12;
    }
  }

  return {
    lineHeightBias: clamp(lineHeightBias, -0.24, 0.26),
    pressCount,
    roamFreedom,
    directness: clamp(directness, 0.15, 0.9),
    crossTendency: clamp(crossTendency, 0.12, 0.8),
  };
}

export function createInitialLiveEngineState(
  homeStarters: Player[],
  awayStarters: Player[],
  homeBaseSlots: Map<string, PitchPosition>,
  awayBaseSlots: Map<string, PitchPosition>,
  homeDefendsLeft: boolean
): LiveEngineState {
  const agents = new Map<string, LivePitchAgent>();

  const populateTeam = (
    starters: Player[],
    slots: Map<string, PitchPosition>,
    team: TeamSide,
    defendsLeft: boolean
  ) => {
    starters.forEach((p, idx) => {
      const slot = slots.get(p.id) || {
        baseX: defendsLeft ? 28 : 72,
        baseY: 20 + (idx % 5) * 15,
      };
      const { role, isGk } = resolveEffectiveRole(p);
      const seed = hashPlayerSeed(p.id);
      // Place teams in their own half for kickoff
      const startX = isGk
        ? defendsLeft
          ? 5.5
          : 94.5
        : defendsLeft
        ? clamp(slot.baseX * 0.78, 12, 48.5)
        : clamp(100 - (100 - slot.baseX) * 0.78, 51.5, 88);
      const startY = clamp(slot.baseY, 10, 90);

      agents.set(p.id, {
        id: p.id,
        team,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        heading: defendsLeft ? 0 : Math.PI,
        targetX: startX,
        targetY: startY,
        baseX: slot.baseX,
        baseY: slot.baseY,
        role,
        isGk,
        lane: inferAgentLane(slot.baseY),
        overall: p.overall || 72,
        condition: p.condition ?? 100,
        intent: isGk ? 'SWEEP_GK' : 'SUPPORT',
        sprintRatio: 0,
        burstTimer: 0.4 + seed * 1.8,
        roamDx: 0,
        roamDy: 0,
        seed,
      });
    });
  };

  populateTeam(homeStarters, homeBaseSlots, 'home', homeDefendsLeft);
  populateTeam(awayStarters, awayBaseSlots, 'away', !homeDefendsLeft);

  // Give kickoff ball to a central forward/midfielder of home team
  let kickoffCarrierId: string | null = null;
  let bestDist = Infinity;
  agents.forEach((ag) => {
    if (ag.team === 'home' && !ag.isGk) {
      const d = Math.hypot(ag.x - 50, ag.y - 50);
      if (d < bestDist) {
        bestDist = d;
        kickoffCarrierId = ag.id;
      }
    }
  });
  if (kickoffCarrierId) {
    const kAg = agents.get(kickoffCarrierId)!;
    kAg.x = homeDefendsLeft ? 49.2 : 50.8;
    kAg.y = 50;
  }

  return {
    agents,
    ball: {
      x: 50,
      y: 50,
      vx: 0,
      vy: 0,
      z: 0,
      vz: 0,
      carrierId: kickoffCarrierId,
      passFromId: null,
      passTargetId: null,
      passTargetPos: null,
      lastTouchTeam: 'home',
      decisionCooldown: 0.45,
      carrierHoldTime: 0,
      trail: [{ x: 50, y: 50, z: 0 }],
    },
    phase: 'OPEN_PLAY',
    phaseTimer: 0,
    lastProcessedEventId: null,
    lastHalfSide: homeDefendsLeft,
    celebrationOrigin: null,
    setPieceOrigin: null,
    clockSec: 0,
  };
}

/**
 * Synchronizes active starters (handling substitutions, tactical slot updates, red cards, and halftime side swap)
 * without snapping existing players' continuous coordinates during open play.
 */
function syncAgentsRoster(state: LiveEngineState, ctx: EngineStepContext): void {
  const halfSwitched = state.lastHalfSide !== ctx.homeDefendsLeft;
  state.lastHalfSide = ctx.homeDefendsLeft;

  const activeIds = new Set<string>();

  const syncTeam = (
    starters: Player[],
    slots: Map<string, PitchPosition>,
    team: TeamSide,
    defendsLeft: boolean
  ) => {
    for (let idx = 0; idx < starters.length; idx++) {
      const p = starters[idx];
      if (ctx.redCardPlayerIds.has(p.id)) {
        // Expelled player leaves the pitch
        continue;
      }
      activeIds.add(p.id);
      const slot = slots.get(p.id) || {
        baseX: defendsLeft ? 28 : 72,
        baseY: 20 + (idx % 5) * 15,
      };
      const { role, isGk } = resolveEffectiveRole(p);
      const existing = state.agents.get(p.id);

      if (!existing) {
        // Newly substituted-in player runs onto the pitch from the touchline at halfway!
        const seed = hashPlayerSeed(p.id);
        const entryX = 50 + (defendsLeft ? -2 : 2);
        const entryY = 95;
        state.agents.set(p.id, {
          id: p.id,
          team,
          x: entryX,
          y: entryY,
          vx: 0,
          vy: -14,
          heading: -Math.PI / 2,
          targetX: slot.baseX,
          targetY: slot.baseY,
          baseX: slot.baseX,
          baseY: slot.baseY,
          role,
          isGk,
          lane: inferAgentLane(slot.baseY),
          overall: p.overall || 72,
          condition: p.condition ?? 100,
          intent: isGk ? 'SWEEP_GK' : 'SUPPORT',
          sprintRatio: 0.7,
          burstTimer: 0.8 + seed * 1.4,
          roamDx: 0,
          roamDy: 0,
          seed,
        });
      } else {
        existing.baseX = slot.baseX;
        existing.baseY = slot.baseY;
        existing.role = role;
        existing.isGk = isGk;
        existing.lane = inferAgentLane(slot.baseY);
        existing.overall = p.overall || existing.overall;
        existing.condition = p.condition ?? existing.condition;

        if (halfSwitched) {
          existing.x = isGk
            ? defendsLeft
              ? 5.5
              : 94.5
            : defendsLeft
            ? clamp(slot.baseX * 0.78, 12, 48.5)
            : clamp(100 - (100 - slot.baseX) * 0.78, 51.5, 88);
          existing.y = clamp(slot.baseY, 10, 90);
          existing.vx = 0;
          existing.vy = 0;
        }
      }
    }
  };

  syncTeam(ctx.homeStarters, ctx.homeBaseSlots, 'home', ctx.homeDefendsLeft);
  syncTeam(ctx.awayStarters, ctx.awayBaseSlots, 'away', !ctx.homeDefendsLeft);

  // Remove subbed-out or red-carded players
  Array.from(state.agents.keys()).forEach((id) => {
    if (!activeIds.has(id)) {
      if (state.ball.carrierId === id) state.ball.carrierId = null;
      if (state.ball.passTargetId === id) state.ball.passTargetId = null;
      state.agents.delete(id);
    }
  });

  if (halfSwitched) {
    resetToKickoff(state, 'away', ctx.homeDefendsLeft);
  }
}

export function resetToKickoff(
  state: LiveEngineState,
  kickoffTeam: TeamSide,
  homeDefendsLeft: boolean
): void {
  let kickoffAgent: LivePitchAgent | null = null;
  let bestDist = Infinity;

  state.agents.forEach((ag) => {
    const defLeft = ag.team === 'home' ? homeDefendsLeft : !homeDefendsLeft;
    ag.vx = 0;
    ag.vy = 0;
    ag.x = ag.isGk
      ? defLeft
        ? 5.5
        : 94.5
      : defLeft
      ? clamp(ag.baseX * 0.78, 12, 48.2)
      : clamp(100 - (100 - ag.baseX) * 0.78, 51.8, 88);
    ag.y = clamp(ag.baseY, 10, 90);
    ag.intent = ag.isGk ? 'SWEEP_GK' : 'SUPPORT';

    if (ag.team === kickoffTeam && !ag.isGk) {
      const d = Math.hypot(ag.x - 50, ag.y - 50);
      if (d < bestDist) {
        bestDist = d;
        kickoffAgent = ag;
      }
    }
  });

  if (kickoffAgent) {
    const kAg = kickoffAgent as LivePitchAgent;
    const defLeft = kAg.team === 'home' ? homeDefendsLeft : !homeDefendsLeft;
    kAg.x = defLeft ? 49.4 : 50.6;
    kAg.y = 50;
    state.ball.carrierId = kAg.id;
  } else {
    state.ball.carrierId = null;
  }

  state.ball.x = 50;
  state.ball.y = 50;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.z = 0;
  state.ball.vz = 0;
  state.ball.passFromId = null;
  state.ball.passTargetId = null;
  state.ball.passTargetPos = null;
  state.ball.lastTouchTeam = kickoffTeam;
  state.ball.decisionCooldown = 0.4;
  state.ball.carrierHoldTime = 0;
  state.ball.trail = [{ x: 50, y: 50, z: 0 }];
  state.phase = 'OPEN_PLAY';
  state.phaseTimer = 0;
  state.celebrationOrigin = null;
  state.setPieceOrigin = null;
}

/**
 * Triggers real on-pitch choreography when a major MatchEvent (Goal, Save, Woodwork, Penalty, Free Kick) fires.
 */
function processIncomingMatchEvent(state: LiveEngineState, ctx: EngineStepContext): void {
  const ev = ctx.latestEvent;
  if (!ev || ev.id === state.lastProcessedEventId) return;
  state.lastProcessedEventId = ev.id;

  const isHomeEvent = Boolean(ev.isHomeTeam);
  const evTeam: TeamSide = isHomeEvent ? 'home' : 'away';
  const attackerDefendsLeft = evTeam === 'home' ? ctx.homeDefendsLeft : !ctx.homeDefendsLeft;
  const attacksRight = attackerDefendsLeft;
  const goalX = attacksRight ? 97.6 : 2.4;

  if (ev.type === 'FIM_PRIMEIRO_TEMPO' || ev.type === 'INICIO_SEGUNDO_TEMPO') {
    resetToKickoff(state, ev.type === 'INICIO_SEGUNDO_TEMPO' ? 'away' : 'home', ctx.homeDefendsLeft);
    return;
  }

  // Locate primary actor (shooter / taker / keeper)
  const findAgentOrClosestForward = (playerId: string | undefined, team: TeamSide): LivePitchAgent | null => {
    if (playerId && state.agents.has(playerId)) {
      return state.agents.get(playerId)!;
    }
    let best: LivePitchAgent | null = null;
    let bestAdvance = -Infinity;
    state.agents.forEach((ag) => {
      if (ag.team === team && !ag.isGk) {
        const adv = (team === 'home' ? ctx.homeDefendsLeft : !ctx.homeDefendsLeft) ? ag.x : 100 - ag.x;
        if (adv > bestAdvance) {
          bestAdvance = adv;
          best = ag;
        }
      }
    });
    return best;
  };

  if (ev.type === 'PENALTI_GOL' || ev.type === 'PENALTI_PERDIDO') {
    const spotX = attacksRight ? 87 : 13;
    const taker = findAgentOrClosestForward(ev.playerId, evTeam);
    // Position players outside the box & arc for authentic penalty look
    state.agents.forEach((ag) => {
      if (ag.isGk) {
        const gkDefLeft = ag.team === 'home' ? ctx.homeDefendsLeft : !ctx.homeDefendsLeft;
        if (ag.team !== evTeam) {
          ag.x = gkDefLeft ? 3.5 : 96.5;
          ag.y = 50;
        }
        return;
      }
      if (taker && ag.id === taker.id) {
        ag.x = attacksRight ? 85.4 : 14.6;
        ag.y = 50;
        ag.vx = 0;
        ag.vy = 0;
        ag.heading = attacksRight ? 0 : Math.PI;
      } else {
        // Line up outside the 18-yard box (x < 79 or x > 21)
        const edgeX = attacksRight
          ? clamp(ag.x, 42, 79.5)
          : clamp(ag.x, 20.5, 58);
        ag.x = edgeX;
        ag.y = clamp(ag.y, 18, 82);
      }
    });

    const targetY = ev.type === 'PENALTI_GOL' ? 44.5 : 39;
    const endX = ev.type === 'PENALTI_GOL' ? goalX : attacksRight ? 94.5 : 5.5;
    launchShotBall(state, spotX, 50, endX, targetY, evTeam, ev.type === 'PENALTI_GOL');

    if (ev.type === 'PENALTI_GOL') {
      state.phase = 'GOAL_CELEBRATION';
      state.phaseTimer = 1.35;
      state.celebrationOrigin = {
        x: attacksRight ? 92 : 8,
        y: targetY < 50 ? 14 : 86,
        scorerId: taker?.id || null,
        team: evTeam,
      };
    } else {
      state.phase = 'SHOT_SEQUENCE';
      state.phaseTimer = 0.7;
    }
    return;
  }

  if (ev.type === 'FALTA_PERIGOSA') {
    const fkX = attacksRight ? 75.5 : 24.5;
    const fkY = 38 + Math.random() * 24;
    const taker = findAgentOrClosestForward(ev.playerId, evTeam);
    if (taker) {
      taker.x = attacksRight ? fkX - 1.6 : fkX + 1.6;
      taker.y = fkY;
      taker.vx = 0;
      taker.vy = 0;
    }
    // Form a 4-man defensive wall between fk pos and goal center
    const defTeam: TeamSide = evTeam === 'home' ? 'away' : 'home';
    const defOutfield = Array.from(state.agents.values())
      .filter((a) => a.team === defTeam && !a.isGk)
      .sort((a, b) => Math.hypot(a.x - fkX, a.y - fkY) - Math.hypot(b.x - fkX, b.y - fkY));
    const wallX = fkX + (attacksRight ? 9.2 : -9.2);
    const goalAngle = Math.atan2(50 - fkY, (attacksRight ? 97 : 3) - fkX);
    const perpX = -Math.sin(goalAngle);
    const perpY = Math.cos(goalAngle);
    defOutfield.slice(0, 4).forEach((wAg, i) => {
      const offset = (i - 1.5) * 2.1;
      wAg.x = clamp(wallX + perpX * offset, 6, 94);
      wAg.y = clamp(fkY + perpY * offset, 12, 88);
      wAg.vx = 0;
      wAg.vy = 0;
      wAg.intent = 'SET_PIECE';
    });

    launchShotBall(state, fkX, fkY, attacksRight ? 98 : 2, fkY < 50 ? 39 : 61, evTeam, false, 0.55);
    state.phase = 'SHOT_SEQUENCE';
    state.phaseTimer = 0.85;
    return;
  }

  if (ev.type === 'GOL') {
    const shooter = findAgentOrClosestForward(ev.playerId, evTeam);
    const isFreekickGoal = ev.id.startsWith('ev_fk_goal_');
    const isCornerGoal = (ev.description || '').toUpperCase().includes('ESCANTEIO');

    if (isFreekickGoal) {
      const fkX = attacksRight ? 75.5 : 24.5;
      const fkY = 39 + Math.random() * 22;
      if (shooter) {
        shooter.x = attacksRight ? fkX - 1.5 : fkX + 1.5;
        shooter.y = fkY;
        shooter.vx = 0;
        shooter.vy = 0;
      }
      const defTeam: TeamSide = evTeam === 'home' ? 'away' : 'home';
      const defOutfield = Array.from(state.agents.values())
        .filter((a) => a.team === defTeam && !a.isGk)
        .sort((a, b) => Math.hypot(a.x - fkX, a.y - fkY) - Math.hypot(b.x - fkX, b.y - fkY));
      const wallX = fkX + (attacksRight ? 9.2 : -9.2);
      const goalAngle = Math.atan2(50 - fkY, (attacksRight ? 97 : 3) - fkX);
      const perpX = -Math.sin(goalAngle);
      const perpY = Math.cos(goalAngle);
      defOutfield.slice(0, 4).forEach((wAg, i) => {
        const offset = (i - 1.5) * 2.1;
        wAg.x = clamp(wallX + perpX * offset, 6, 94);
        wAg.y = clamp(fkY + perpY * offset, 12, 88);
        wAg.vx = 0;
        wAg.vy = 0;
        wAg.intent = 'SET_PIECE';
      });

      const topCornerY = fkY < 50 ? 43.2 : 56.8;
      launchShotBall(state, fkX, fkY, goalX, topCornerY, evTeam, true, 0.52);
      state.phase = 'GOAL_CELEBRATION';
      state.phaseTimer = 1.45;
      state.celebrationOrigin = {
        x: attacksRight ? 90 : 10,
        y: fkY < 50 ? 14 : 86,
        scorerId: shooter?.id || null,
        team: evTeam,
      };
      return;
    }

    if (isCornerGoal) {
      const cornerX = attacksRight ? 96.2 : 3.8;
      const cornerY = Math.random() < 0.5 ? 6.5 : 93.5;
      if (ev.assistPlayerId && state.agents.has(ev.assistPlayerId)) {
        const taker = state.agents.get(ev.assistPlayerId)!;
        taker.x = cornerX;
        taker.y = cornerY;
        taker.vx = 0;
        taker.vy = 0;
      }
      const headerX = attacksRight ? 89.5 : 10.5;
      const headerY = 46 + Math.random() * 8;
      if (shooter) {
        shooter.x = headerX;
        shooter.y = headerY;
      }
      const targetY = 44 + Math.random() * 12;
      launchShotBall(state, headerX, headerY, goalX, targetY, evTeam, true, 0.35);
      state.ball.trail = [
        { x: cornerX, y: cornerY, z: 0.45, isShot: true },
        { x: headerX, y: headerY, z: 0.32, isShot: true },
      ];
      state.phase = 'GOAL_CELEBRATION';
      state.phaseTimer = 1.45;
      state.celebrationOrigin = {
        x: attacksRight ? 91 : 9,
        y: cornerY < 50 ? 14 : 86,
        scorerId: shooter?.id || null,
        team: evTeam,
      };
      return;
    }

    // Open-play Goal: ensure shooter is in a believable striking position
    let shotStartX = shooter ? shooter.x : attacksRight ? 83 : 17;
    let shotStartY = shooter ? shooter.y : 48;
    const shooterAdvance = attacksRight ? shotStartX : 100 - shotStartX;
    if (shooterAdvance < 70) {
      shotStartX = attacksRight ? 79 + Math.random() * 9 : 21 - Math.random() * 9;
      shotStartY = clamp(shotStartY, 28, 72);
      if (shooter) {
        shooter.x = shotStartX;
        shooter.y = shotStartY;
      }
    }
    const targetY = ctx.activeShot?.targetPos.y
      ? clamp(ctx.activeShot.targetPos.y, 43, 57)
      : 44 + Math.random() * 12;

    if (ev.assistPlayerId && state.agents.has(ev.assistPlayerId)) {
      const assister = state.agents.get(ev.assistPlayerId)!;
      state.ball.trail = [
        { x: assister.x, y: assister.y, z: 0 },
        { x: shotStartX, y: shotStartY, z: 0.1, isShot: true },
      ];
    }

    launchShotBall(state, shotStartX, shotStartY, goalX, targetY, evTeam, true, 0.22);
    state.phase = 'GOAL_CELEBRATION';
    state.phaseTimer = 1.45;
    state.celebrationOrigin = {
      x: attacksRight ? 91 : 9,
      y: shotStartY < 50 ? 13 : 87,
      scorerId: shooter?.id || null,
      team: evTeam,
    };
    return;
  }

  if (ev.type === 'DEFESAÇA') {
    const atkTeam: TeamSide = evTeam === 'home' ? 'away' : 'home';
    const atkRight = (atkTeam === 'home' ? ctx.homeDefendsLeft : !ctx.homeDefendsLeft);
    const shooter = findAgentOrClosestForward(undefined, atkTeam);
    let shotStartX = shooter ? shooter.x : atkRight ? 80 : 20;
    let shotStartY = shooter ? shooter.y : 50;
    if ((atkRight ? shotStartX : 100 - shotStartX) < 68) {
      shotStartX = atkRight ? 78 + Math.random() * 8 : 22 - Math.random() * 8;
      shotStartY = clamp(shotStartY, 26, 74);
      if (shooter) {
        shooter.x = shotStartX;
        shooter.y = shotStartY;
      }
    }
    const saveX = atkRight ? 94.5 : 5.5;
    const saveY = ctx.activeKeeperDive ? clamp(ctx.activeKeeperDive.targetY, 39, 61) : 45;
    launchShotBall(state, shotStartX, shotStartY, saveX, saveY, atkTeam, false, 0.25);
    state.phase = 'SHOT_SEQUENCE';
    state.phaseTimer = 0.75;
    return;
  }

  if (ev.type === 'CHUTE_TRAVE') {
    const shooter = findAgentOrClosestForward(ev.playerId, evTeam);
    let shotStartX = shooter ? shooter.x : attacksRight ? 79 : 21;
    let shotStartY = shooter ? shooter.y : 50;
    if ((attacksRight ? shotStartX : 100 - shotStartX) < 66) {
      shotStartX = attacksRight ? 77 + Math.random() * 8 : 23 - Math.random() * 8;
      shotStartY = clamp(shotStartY, 26, 74);
      if (shooter) {
        shooter.x = shotStartX;
        shooter.y = shotStartY;
      }
    }
    const postX = attacksRight ? 96.8 : 3.2;
    const postY = Math.random() < 0.5 ? 42 : 58;
    launchShotBall(state, shotStartX, shotStartY, postX, postY, evTeam, false, 0.35);
    state.phase = 'SHOT_SEQUENCE';
    state.phaseTimer = 0.75;
  }
}

function launchShotBall(
  state: LiveEngineState,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  team: TeamSide,
  isGoal: boolean,
  loft: number = 0.18
): void {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const flightTime = 0.24;
  state.ball.carrierId = null;
  state.ball.passFromId = null;
  state.ball.passTargetId = null;
  state.ball.passTargetPos = { x: toX, y: toY };
  state.ball.x = fromX;
  state.ball.y = fromY;
  state.ball.vx = dx / flightTime;
  state.ball.vy = dy / flightTime;
  state.ball.z = 0.05;
  state.ball.vz = loft * 3.2;
  state.ball.lastTouchTeam = team;
  state.ball.decisionCooldown = isGoal ? 1.4 : 0.65;
  state.ball.trail = [
    ...state.ball.trail.slice(-2),
    { x: fromX, y: fromY, z: 0.05, isShot: true },
    { x: toX, y: toY, z: loft, isShot: true },
  ];
}

/**
 * Launches a realistic ground pass, through-ball into space, lofted switch, or whipped cross.
 */
function executePass(
  state: LiveEngineState,
  passer: LivePitchAgent,
  receiver: LivePitchAgent,
  leadX: number,
  leadY: number,
  isLofted: boolean
): void {
  const targetX = clamp(receiver.x + leadX, 4.5, 95.5);
  const targetY = clamp(receiver.y + leadY, 6, 94);
  const dx = targetX - state.ball.x;
  const dy = targetY - state.ball.y;
  const dist = Math.max(1, Math.hypot(dx, dy));

  const speed = isLofted ? clamp(34 + dist * 0.48, 36, 62) : clamp(32 + dist * 0.58, 30, 58);
  state.ball.carrierId = null;
  state.ball.passFromId = passer.id;
  state.ball.passTargetId = receiver.id;
  state.ball.passTargetPos = { x: targetX, y: targetY };
  state.ball.vx = (dx / dist) * speed;
  state.ball.vy = (dy / dist) * speed;
  state.ball.z = isLofted ? 0.08 : 0;
  state.ball.vz = isLofted ? clamp(dist * 0.048, 1.1, 2.6) : 0;
  state.ball.lastTouchTeam = passer.team;
  state.ball.carrierHoldTime = 0;
  state.ball.decisionCooldown = 0.22;

  passer.heading = Math.atan2(dy, dx);
  receiver.intent = 'RECEIVE_PASS';
  receiver.targetX = targetX;
  receiver.targetY = targetY;

  state.ball.trail = [
    ...state.ball.trail.slice(-3),
    { x: state.ball.x, y: state.ball.y, z: state.ball.z },
  ];
}

/**
 * Core 60fps Football Simulation Step:
 * Updates tactical decisions, off-ball runs, pressing, ball physics, dribbling, passing, and collision separation.
 */
export function stepLiveMatchEngine(state: LiveEngineState, ctx: EngineStepContext): void {
  syncAgentsRoster(state, ctx);
  processIncomingMatchEvent(state, ctx);

  // Scale simulation speed gently with 1x / 2x / 4x so 4x is brisk & fluid without chaotic teleportation
  const speedScale = ctx.speedMultiplier === 4 ? 1.85 : ctx.speedMultiplier === 2 ? 1.38 : 1.0;
  const dt = clamp(ctx.dt, 0.004, 0.045) * speedScale;
  state.clockSec += dt;

  // Handle Goal Celebration phase before resetting smoothly to kickoff
  if (state.phase === 'GOAL_CELEBRATION') {
    state.phaseTimer -= dt;
    // Decelerate ball inside the net
    state.ball.x = clamp(state.ball.x + state.ball.vx * dt, 1.4, 98.6);
    state.ball.y = clamp(state.ball.y + state.ball.vy * dt, 41, 59);
    state.ball.vx *= Math.pow(0.015, dt);
    state.ball.vy *= Math.pow(0.015, dt);
    state.ball.z = Math.max(0, state.ball.z - dt * 1.5);

    const cel = state.celebrationOrigin;
    if (cel) {
      state.agents.forEach((ag) => {
        if (ag.team === cel.team && !ag.isGk) {
          ag.intent = 'CELEBRATE';
          const isScorer = ag.id === cel.scorerId;
          const distToCel = Math.hypot(ag.x - cel.x, ag.y - cel.y);
          if (isScorer || distToCel < 34) {
            ag.targetX = cel.x + Math.cos(ag.seed * Math.PI * 2) * (isScorer ? 0 : 3.2);
            ag.targetY = cel.y + Math.sin(ag.seed * Math.PI * 2) * (isScorer ? 0 : 3.2);
            ag.sprintRatio = 0.95;
          } else {
            // Jog back toward own half
            const defLeft = ag.team === 'home' ? ctx.homeDefendsLeft : !ctx.homeDefendsLeft;
            ag.targetX = defLeft ? clamp(ag.baseX * 0.8, 15, 47) : clamp(100 - (100 - ag.baseX) * 0.8, 53, 85);
            ag.targetY = ag.baseY;
            ag.sprintRatio = 0.3;
          }
        } else {
          // Conceding team walks back to their kickoff positions
          const defLeft = ag.team === 'home' ? ctx.homeDefendsLeft : !ctx.homeDefendsLeft;
          ag.targetX = ag.isGk
            ? defLeft
              ? 5.5
              : 94.5
            : defLeft
            ? clamp(ag.baseX * 0.78, 14, 48)
            : clamp(100 - (100 - ag.baseX) * 0.78, 52, 86);
          ag.targetY = ag.isGk ? 50 : ag.baseY;
          ag.sprintRatio = 0.25;
        }
      });
    }

    integrateAgentPhysics(state, dt, ctx);

    if (state.phaseTimer <= 0) {
      const kickoffTeam: TeamSide = cel?.team === 'home' ? 'away' : 'home';
      resetToKickoff(state, kickoffTeam, ctx.homeDefendsLeft);
    }
    return;
  }

  if (state.phase === 'SHOT_SEQUENCE') {
    state.phaseTimer -= dt;
    if (state.phaseTimer <= 0) {
      state.phase = 'OPEN_PLAY';
      state.ball.passTargetPos = null;
    }
  }

  // Determine active possession team on the pitch
  const carrier = state.ball.carrierId ? state.agents.get(state.ball.carrierId) || null : null;
  const livePossTeam: TeamSide = carrier
    ? carrier.team
    : state.ball.passTargetId && state.agents.get(state.ball.passTargetId)
    ? state.agents.get(state.ball.passTargetId)!.team
    : state.ball.lastTouchTeam;

  const homeProfile = getTeamAggressionProfile(ctx.homeClub, ctx.isUserHome, ctx.inGameTactic);
  const awayProfile = getTeamAggressionProfile(ctx.awayClub, !ctx.isUserHome, ctx.inGameTactic);

  // Compute defensive lines for both teams so offside lines & runs in behind are completely authentic!
  const computeTeamDefLineX = (team: TeamSide): number => {
    const defLeft = team === 'home' ? ctx.homeDefendsLeft : !ctx.homeDefendsLeft;
    const prof = team === 'home' ? homeProfile : awayProfile;
    const hasBall = livePossTeam === team;
    // Progression of ball from this team's own goal (0..1)
    const ballProg = defLeft ? clamp(state.ball.x / 100, 0, 1) : clamp((100 - state.ball.x) / 100, 0, 1);

    let lineProg: number;
    if (hasBall) {
      // Push defensive block up fluidly to compress pitch when attacking (up to halfway line!)
      lineProg = clamp(0.18 + ballProg * 0.36 + prof.lineHeightBias * 0.45, 0.14, 0.56);
    } else {
      // Compact defensive block shifting with ball depth
      lineProg = clamp(0.12 + ballProg * 0.40 + prof.lineHeightBias * 0.55, 0.11, 0.50);
    }
    return defLeft ? lineProg * 100 : (1 - lineProg) * 100;
  };

  const homeDefLineX = computeTeamDefLineX('home');
  const awayDefLineX = computeTeamDefLineX('away');

  // Identify 1st (and optional 2nd) active pressers for the defending team
  const defendingTeam: TeamSide = livePossTeam === 'home' ? 'away' : 'home';
  const defProfile = defendingTeam === 'home' ? homeProfile : awayProfile;
  const defOutfield = Array.from(state.agents.values()).filter(
    (a) => a.team === defendingTeam && !a.isGk
  );
  defOutfield.sort(
    (a, b) =>
      Math.hypot(a.x - state.ball.x, a.y - state.ball.y) -
      Math.hypot(b.x - state.ball.x, b.y - state.ball.y)
  );
  const presserIds = new Set<string>();
  if (defOutfield[0]) presserIds.add(defOutfield[0].id);
  if (
    defProfile.pressCount >= 2 &&
    defOutfield[1] &&
    Math.hypot(defOutfield[1].x - state.ball.x, defOutfield[1].y - state.ball.y) < 26
  ) {
    presserIds.add(defOutfield[1].id);
  }

  // Step 1: Update each player's tactical target & free off-ball movement intent
  state.agents.forEach((ag) => {
    const defLeft = ag.team === 'home' ? ctx.homeDefendsLeft : !ctx.homeDefendsLeft;
    const dir = defLeft ? 1 : -1; // +1 attacks Right, -1 attacks Left
    const prof = ag.team === 'home' ? homeProfile : awayProfile;
    const teamHasBall = livePossTeam === ag.team;
    const ownGoalX = defLeft ? 3.5 : 96.5;
    const oppGoalX = defLeft ? 96.5 : 3.5;
    const ownDefLineX = ag.team === 'home' ? homeDefLineX : awayDefLineX;
    const oppDefLineX = ag.team === 'home' ? awayDefLineX : homeDefLineX;
    const ballProg = defLeft ? clamp(state.ball.x / 100, 0, 1) : clamp((100 - state.ball.x) / 100, 0, 1);

    // Refresh personal off-ball burst / roam vector asynchronously so movement feels alive and unscripted
    ag.burstTimer -= dt;
    if (ag.burstTimer <= 0) {
      ag.burstTimer = 1.1 + ((Math.sin(state.clockSec * 1.7 + ag.seed * 37) + 1) * 0.5) * 2.1;
      const angle = (state.clockSec * 1.3 + ag.seed * 19.7) % (Math.PI * 2);
      const radius = (4.5 + ag.seed * 6.5) * prof.roamFreedom;
      ag.roamDx = Math.cos(angle) * radius;
      ag.roamDy = Math.sin(angle) * radius * 1.15;
    }

    // 1A. Goalkeeper AI (Sweeper-Keeper + Angle Narrowing + Dive)
    if (ag.isGk) {
      if (ctx.activeKeeperDive && ctx.activeKeeperDive.keeperId === ag.id) {
        ag.intent = 'DIVE_GK';
        ag.targetX = defLeft ? 5.5 : 94.5;
        ag.targetY = clamp(ctx.activeKeeperDive.targetY, 38, 62);
        ag.sprintRatio = 1;
        return;
      }
      ag.intent = 'SWEEP_GK';
      if (state.ball.carrierId === ag.id) {
        // GK with ball steps out slightly to distribute
        ag.targetX = defLeft ? 10.5 : 89.5;
        ag.targetY = clamp(ag.y, 40, 60);
        ag.sprintRatio = 0.35;
        return;
      }
      // Bisect angle between center of own goal and ball, plus sweeper advance when defensive line is high
      const sweeperAdvance = ballProg > 0.55 ? 5.5 + (ballProg - 0.55) * 14 : 1.8 + ballProg * 5;
      // Step out aggressively if opponent breaks into 1v1 inside penalty box!
      const ballDistToOwnGoal = Math.hypot(state.ball.x - ownGoalX, state.ball.y - 50);
      const oneOnOneStep = !teamHasBall && ballDistToOwnGoal < 19 ? (19 - ballDistToOwnGoal) * 0.42 : 0;

      ag.targetX = clamp(ownGoalX + dir * (sweeperAdvance + oneOnOneStep), 4.2, 95.8);
      const goalToBallY = state.ball.y - 50;
      ag.targetY = clamp(50 + goalToBallY * (ballDistToOwnGoal < 24 ? 0.34 : 0.20), 40, 60);
      ag.sprintRatio = ballDistToOwnGoal < 22 ? 0.8 : 0.3;
      return;
    }

    // 1B. Pass Receiver moving actively to meet the pass in flight
    if (state.ball.passTargetId === ag.id && state.ball.passTargetPos) {
      ag.intent = 'RECEIVE_PASS';
      ag.targetX = state.ball.passTargetPos.x;
      ag.targetY = state.ball.passTargetPos.y;
      ag.sprintRatio = 0.92;
      return;
    }

    // 1C. Active Ball Carrier: Dynamic Dribbling into Open Grass / Flanks / Goal!
    if (state.ball.carrierId === ag.id) {
      ag.intent = 'DRIBBLE';
      // Evaluate nearest opponent defender to weave away from pressure
      let evadeX = 0;
      let evadeY = 0;
      let minDefDist = Infinity;
      state.agents.forEach((opp) => {
        if (opp.team !== ag.team && !opp.isGk) {
          const dx = ag.x - opp.x;
          const dy = ag.y - opp.y;
          const d = Math.hypot(dx, dy);
          if (d < minDefDist) minDefDist = d;
          if (d < 9 && d > 0.2) {
            const weight = (9 - d) / 9;
            evadeX += (dx / d) * weight * 5.5;
            evadeY += (dy / d) * weight * 7.5;
          }
        }
      });

      const myProg = defLeft ? ag.x / 100 : (100 - ag.x) / 100;
      let driveX = oppGoalX;
      let driveY = ag.y;

      if (ag.role === 'LAT' || ag.lane === 'TOP' || ag.lane === 'BOTTOM') {
        // Wingers and fullbacks bomb down the flank, then cut diagonally toward the penalty box in final third!
        if (myProg < 0.78) {
          driveX = ag.x + dir * 22;
          driveY = ag.lane === 'TOP' || ag.y < 36 ? 11 : ag.lane === 'BOTTOM' || ag.y > 64 ? 89 : ag.y;
        } else {
          // Cut inside toward the box / byline cross zone
          driveX = oppGoalX - dir * 7;
          driveY = ag.y < 50 ? 32 : 68;
        }
      } else if (ag.role === 'MEI') {
        // Playmakers glide into half-spaces toward edge of the box
        driveX = ag.x + dir * 18;
        driveY = clamp(ag.y + Math.sin(state.clockSec * 1.8 + ag.seed * 10) * 11, 20, 80);
      } else if (ag.role === 'ATA') {
        // Strikers attack the heart of the penalty area
        driveX = oppGoalX - dir * 6;
        driveY = clamp(50 + (ag.y - 50) * 0.45, 32, 68);
      } else {
        // ZAG / VOL step forward into open midfield grass
        driveX = ag.x + dir * 14;
        driveY = clamp(ag.y + (50 - ag.y) * 0.15, 16, 84);
      }

      ag.targetX = clamp(driveX + evadeX * 0.55, 5.5, 94.5);
      ag.targetY = clamp(driveY + evadeY, 7, 93);
      ag.sprintRatio = minDefDist < 8 || myProg > 0.62 ? 0.88 : 0.65;
      return;
    }

    // 1D. IN POSSESSION — Free, Fluid Off-The-Ball Tactical Movement
    if (teamHasBall) {
      const ballOnTopFlank = state.ball.y < 38;
      const ballOnBottomFlank = state.ball.y > 62;
      const isSameFlankAsBall =
        (ag.baseY < 45 && state.ball.y < 48) || (ag.baseY > 55 && state.ball.y > 52);
      const pulse = Math.sin(state.clockSec * 1.65 + ag.seed * Math.PI * 2);

      if (ag.role === 'ZAG') {
        // Split wide in deep build-up, push up to halfway line in sustained pressure, or crash box on Chuveirinho!
        if (
          prof.crossTendency > 0.65 &&
          ctx.minute >= 70 &&
          ag.seed > 0.55 &&
          ballProg > 0.55
        ) {
          ag.intent = 'BOX_CRASH';
          ag.targetX = oppGoalX - dir * 11;
          ag.targetY = 46 + (ag.seed - 0.5) * 14;
          ag.sprintRatio = 0.85;
          return;
        }
        ag.intent = 'SUPPORT';
        const buildUpSpread = ballProg < 0.28 ? (ag.baseY < 50 ? -7 : 7) : 0;
        ag.targetX = clamp(ownDefLineX + ag.roamDx * 0.45, 9, 91);
        ag.targetY = clamp(
          ag.baseY + buildUpSpread + (state.ball.y - 50) * 0.22 + ag.roamDy * 0.4,
          14,
          86
        );
        ag.sprintRatio = 0.42;
        return;
      }

      if (ag.role === 'LAT') {
        // Modern Brazilian Laterais: ball-side bombs all the way down the wing (OVERLAP), far-side tucks into rest-defense/switch option!
        if (isSameFlankAsBall && ballProg > 0.32) {
          ag.intent = 'OVERLAP';
          const overlapDepth = clamp(ballProg + 0.20 + (pulse > 0 ? 0.08 : 0), 0.48, 0.90);
          ag.targetX = defLeft ? overlapDepth * 100 : (1 - overlapDepth) * 100;
          ag.targetY = ag.baseY < 50 ? 8.5 + Math.abs(ag.roamDy) * 0.3 : 91.5 - Math.abs(ag.roamDy) * 0.3;
          ag.sprintRatio = 0.88;
        } else {
          // Inverted / balanced fullback ready for switch of play
          ag.intent = 'SUPPORT';
          const supportDepth = clamp(ballProg + 0.04, 0.26, 0.68);
          ag.targetX = (defLeft ? supportDepth * 100 : (1 - supportDepth) * 100) + ag.roamDx * 0.5;
          ag.targetY = clamp(
            ag.baseY + (50 - ag.baseY) * 0.24 + (state.ball.y - 50) * 0.16,
            11,
            89
          );
          ag.sprintRatio = 0.52;
        }
        return;
      }

      if (ag.role === 'VOL') {
        // Constant passing triangle & pivot behind the ball (or drops between CBs in deep build-up)
        ag.intent = 'SUPPORT';
        const pivotProg =
          ballProg < 0.24
            ? 0.20
            : clamp(ballProg - 0.11 + pulse * 0.04, 0.28, 0.70);
        ag.targetX = (defLeft ? pivotProg * 100 : (1 - pivotProg) * 100) + ag.roamDx * 0.65;
        // Shift horizontally toward ball to create immediate triangle option
        ag.targetY = clamp(
          ag.baseY * 0.55 + state.ball.y * 0.45 + ag.roamDy * 0.8,
          16,
          84
        );
        ag.sprintRatio = 0.55;
        return;
      }

      if (ag.role === 'MEI') {
        // Total creative freedom: roam between lines, overload half-spaces, or make late box-to-box surges!
        const makesBoxRun = ballProg > 0.66 && (pulse > 0.25 || prof.crossTendency > 0.6);
        if (makesBoxRun) {
          ag.intent = 'BOX_CRASH';
          const boxProg = clamp(0.81 + ag.seed * 0.08, 0.78, 0.90);
          ag.targetX = defLeft ? boxProg * 100 : (1 - boxProg) * 100;
          ag.targetY = clamp(ag.baseY * 0.5 + 50 * 0.5 + ag.roamDy * 0.9, 26, 74);
          ag.sprintRatio = 0.86;
        } else if (ballProg < 0.38 && pulse < -0.2) {
          // Drop deeper to ask for the ball at feet and help progress play
          ag.intent = 'DROP_DEEP';
          const dropProg = clamp(ballProg + 0.10, 0.30, 0.54);
          ag.targetX = (defLeft ? dropProg * 100 : (1 - dropProg) * 100) + ag.roamDx * 0.7;
          ag.targetY = clamp(ag.baseY * 0.5 + state.ball.y * 0.5 + ag.roamDy, 14, 86);
          ag.sprintRatio = 0.62;
        } else {
          // Drift freely into half-spaces / pockets behind opponent midfield
          ag.intent = 'SUPPORT';
          const pocketProg = clamp(ballProg + 0.14 + pulse * 0.06, 0.42, 0.82);
          ag.targetX = (defLeft ? pocketProg * 100 : (1 - pocketProg) * 100) + ag.roamDx * 0.9;
          ag.targetY = clamp(
            ag.baseY + (state.ball.y - ag.baseY) * 0.42 + ag.roamDy * 1.15,
            12,
            88
          );
          ag.sprintRatio = 0.66;
        }
        return;
      }

      // ATA (Strikers & Wingers): Runs in behind, diagonal cuts inside, checking short, and crashing the box!
      const isWideForward = ag.lane === 'TOP' || ag.lane === 'BOTTOM';
      if (ballProg > 0.74 && (ballOnTopFlank || ballOnBottomFlank)) {
        // Cross situation: attack near post, penalty spot, and far post!
        ag.intent = 'BOX_CRASH';
        const postSpotY =
          ag.lane === 'TOP'
            ? ballOnBottomFlank
              ? 40 // back-post arrival!
              : 34
            : ag.lane === 'BOTTOM'
            ? ballOnTopFlank
              ? 60 // back-post arrival!
              : 66
            : 49 + pulse * 6;
        const boxX = oppGoalX - dir * (7.5 + ag.seed * 6.5);
        ag.targetX = clamp(boxX, 6, 94);
        ag.targetY = clamp(postSpotY + ag.roamDy * 0.35, 28, 72);
        ag.sprintRatio = 0.94;
        return;
      }

      if (isWideForward) {
        if (isSameFlankAsBall && ballProg > 0.48 && pulse > 0) {
          // Cut diagonally inside into the half-space to open the touchline for overlapping LAT!
          ag.intent = 'CUT_INSIDE';
          ag.targetX = clamp(oppDefLineX + dir * 2.5, 8, 92);
          ag.targetY = ag.lane === 'TOP' ? 28 + Math.abs(ag.roamDy) * 0.5 : 72 - Math.abs(ag.roamDy) * 0.5;
          ag.sprintRatio = 0.85;
        } else {
          // Stretch the opponent defense wide or make diagonal run behind fullback
          ag.intent = pulse > 0.2 ? 'RUN_BEHIND' : 'HOLD_WIDTH';
          const runDepth = pulse > 0.2 ? oppDefLineX + dir * 3.5 : oppDefLineX - dir * 3.5;
          ag.targetX = clamp(runDepth + ag.roamDx * 0.5, 8, 92);
          ag.targetY = ag.lane === 'TOP' ? 12 + Math.abs(ag.roamDy) * 0.6 : 88 - Math.abs(ag.roamDy) * 0.6;
          ag.sprintRatio = pulse > 0.2 ? 0.9 : 0.6;
        }
        return;
      }

      // Central Striker (CA / SA)
      if (pulse > -0.15) {
        // Dart in behind the last defender into open channel!
        ag.intent = 'RUN_BEHIND';
        ag.targetX = clamp(oppDefLineX + dir * (2.2 + Math.max(0, pulse) * 4.5), 7, 93);
        ag.targetY = clamp(ag.baseY + (state.ball.y - 50) * 0.28 + ag.roamDy * 1.1, 22, 78);
        ag.sprintRatio = 0.92;
      } else {
        // Check short to feet (pivô / falso 9) to drag CB out of line
        ag.intent = 'DROP_DEEP';
        ag.targetX = clamp(oppDefLineX - dir * 9.5 + ag.roamDx * 0.5, 14, 86);
        ag.targetY = clamp(ag.baseY * 0.6 + state.ball.y * 0.4 + ag.roamDy * 0.6, 24, 76);
        ag.sprintRatio = 0.68;
      }
      return;
    }

    // 1E. OUT OF POSSESSION — Pressing, Cover Shadows, Runner Tracking & Compact Block
    if (presserIds.has(ag.id)) {
      // Active Presser: Sprint directly to close down the ball carrier from goal-side!
      ag.intent = 'PRESS_BALL';
      const goalDx = ownGoalX - state.ball.x;
      const goalDy = 50 - state.ball.y;
      const gDist = Math.max(1, Math.hypot(goalDx, goalDy));
      // Stand 1.7% goal-side of the ball to shepherd carrier away from goal and contest tackle
      ag.targetX = clamp(state.ball.x + (goalDx / gDist) * 1.7, 4.5, 95.5);
      ag.targetY = clamp(state.ball.y + (goalDy / gDist) * 1.7, 6.5, 93.5);
      ag.sprintRatio = 0.95;
      return;
    }

    // Horizontal ball-side compactness (real teams shift 35-48% toward the ball's flank to close spaces)
    const compactY = clamp(ag.baseY * 0.60 + state.ball.y * 0.40 + ag.roamDy * 0.28, 11, 89);

    if (ag.role === 'ZAG' || ag.role === 'LAT') {
      // Check if a dangerous opponent forward is making a run in our zone to track closely!
      let trackedRunner: LivePitchAgent | null = null;
      let minRunDist = 11.5;
      state.agents.forEach((opp) => {
        if (
          opp.team !== ag.team &&
          !opp.isGk &&
          opp.id !== state.ball.carrierId &&
          (opp.intent === 'RUN_BEHIND' || opp.intent === 'BOX_CRASH' || opp.intent === 'CUT_INSIDE')
        ) {
          const d = Math.hypot(opp.x - ag.x, opp.y - ag.y);
          if (d < minRunDist) {
            minRunDist = d;
            trackedRunner = opp;
          }
        }
      });

      if (trackedRunner) {
        const runner = trackedRunner as LivePitchAgent;
        ag.intent = 'TRACK_RUN';
        ag.targetX = clamp(runner.x - dir * 1.8, 5, 95);
        ag.targetY = clamp(runner.y + (50 - runner.y) * 0.08, 10, 90);
        ag.sprintRatio = 0.88;
      } else {
        ag.intent = 'HOLD_LINE';
        const lateralTuck =
          ag.role === 'LAT' && Math.abs(state.ball.y - ag.baseY) > 36
            ? (50 - ag.baseY) * 0.25 // Far-side fullback tucks inside to protect back post!
            : 0;
        const latStepOut =
          ag.role === 'LAT' && Math.abs(state.ball.y - ag.baseY) < 22 ? dir * 3.5 : 0;
        ag.targetX = clamp(ownDefLineX + latStepOut + ag.roamDx * 0.22, 5.5, 94.5);
        ag.targetY = clamp(compactY + lateralTuck, 10, 90);
        ag.sprintRatio = 0.55;
      }
      return;
    }

    if (ag.role === 'VOL' || ag.role === 'MEI') {
      // Screen passing lanes in front of the defensive backline (Cover Shadow)
      ag.intent = 'COVER_SHADOW';
      const midBandOffset = ag.role === 'VOL' ? 9.5 : 18.5;
      const rawLineX = ownDefLineX + dir * midBandOffset;
      // Pull slightly closer to ball X so midfield doesn't detach from play
      ag.targetX = clamp(rawLineX * 0.72 + state.ball.x * 0.28 + ag.roamDx * 0.4, 9, 91);
      ag.targetY = clamp(ag.baseY * 0.52 + state.ball.y * 0.48 + ag.roamDy * 0.45, 12, 88);
      ag.sprintRatio = 0.65;
      return;
    }

    // ATA when defending: either press high or lurk in counter-attack channels near halfway!
    ag.intent = 'SUPPORT';
    const counterReadyDepth =
      prof.directness > 0.65
        ? clamp(ownDefLineX + dir * 34, 24, 76) // Stay ready on halfway line for explosive counter!
        : clamp(ownDefLineX + dir * 27 + (state.ball.x - 50) * 0.18, 20, 80);
    ag.targetX = clamp(counterReadyDepth + ag.roamDx * 0.6, 16, 84);
    ag.targetY = clamp(ag.baseY * 0.68 + state.ball.y * 0.32 + ag.roamDy * 0.6, 14, 86);
    ag.sprintRatio = 0.48;
  });

  // Step 2: Integrate smooth velocity/inertia steering & pairwise player separation
  integrateAgentPhysics(state, dt, ctx);

  // Step 3: Step Ball Physics, Dribbling, Passing Decisions & Tackles/Interceptions
  stepBallAndDecisions(state, dt, ctx, homeProfile, awayProfile);
}

function integrateAgentPhysics(
  state: LiveEngineState,
  dt: number,
  ctx: EngineStepContext
): void {
  const agentList = Array.from(state.agents.values());

  // Pairwise soft repulsion so players never clump into a single overlapping dot
  const sepFx = new Map<string, number>();
  const sepFy = new Map<string, number>();
  for (let i = 0; i < agentList.length; i++) {
    const a = agentList[i];
    for (let j = i + 1; j < agentList.length; j++) {
      const b = agentList[j];
      if (a.isGk || b.isGk) continue;
      const sameTeam = a.team === b.team;
      const minSpacing = sameTeam ? 5.2 : 2.5;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minSpacing) {
        const nx = dist > 0.01 ? dx / dist : Math.cos(a.seed * 6.28);
        const ny = dist > 0.01 ? dy / dist : Math.sin(a.seed * 6.28);
        const push = ((minSpacing - dist) / minSpacing) * (sameTeam ? 15.5 : 8.5);
        sepFx.set(a.id, (sepFx.get(a.id) || 0) + nx * push);
        sepFy.set(a.id, (sepFy.get(a.id) || 0) + ny * push);
        sepFx.set(b.id, (sepFx.get(b.id) || 0) - nx * push);
        sepFy.set(b.id, (sepFy.get(b.id) || 0) - ny * push);
      }
    }
  }

  for (let i = 0; i < agentList.length; i++) {
    const ag = agentList[i];
    // Speed & acceleration scaled organically by player Overall, Role, and Live Stamina/Condition!
    const staminaFactor = 0.78 + clamp(ag.condition, 35, 100) * 0.0024;
    const ovrFactor = 0.88 + clamp(ag.overall - 60, 0, 38) * 0.0055;
    const rolePace =
      ag.role === 'LAT' || ag.role === 'ATA'
        ? 1.08
        : ag.role === 'MEI'
        ? 1.03
        : ag.isGk
        ? 0.95
        : 0.97;

    const topSpeed = (9.5 + ag.sprintRatio * 8.2) * staminaFactor * ovrFactor * rolePace;
    const dx = ag.targetX - ag.x;
    const dy = ag.targetY - ag.y;
    const dist = Math.hypot(dx, dy);

    // Smooth arrival behavior: slow down smoothly as agent approaches target spot
    const arriveRadius = ag.intent === 'DRIBBLE' || ag.intent === 'RUN_BEHIND' || ag.intent === 'PRESS_BALL' ? 1.8 : 4.2;
    const desiredSpeed = dist < arriveRadius ? topSpeed * (dist / arriveRadius) : topSpeed;

    const desiredVx = (dist > 0.05 ? (dx / dist) * desiredSpeed : 0) + (sepFx.get(ag.id) || 0);
    const desiredVy = (dist > 0.05 ? (dy / dist) * desiredSpeed : 0) + (sepFy.get(ag.id) || 0);

    // Inertia / momentum responsiveness (higher agility turns quicker, no instant snapping!)
    const accelRate = ag.intent === 'DIVE_GK' ? 22 : 6.8 + ag.sprintRatio * 4.2;
    const blend = 1 - Math.exp(-accelRate * dt);
    ag.vx += (desiredVx - ag.vx) * blend;
    ag.vy += (desiredVy - ag.vy) * blend;

    // Clamp velocity magnitude
    const currSpeed = Math.hypot(ag.vx, ag.vy);
    const hardCap = topSpeed * 1.25;
    if (currSpeed > hardCap) {
      ag.vx = (ag.vx / currSpeed) * hardCap;
      ag.vy = (ag.vy / currSpeed) * hardCap;
    }

    ag.x = clamp(ag.x + ag.vx * dt, ag.isGk ? 3.4 : 4.0, ag.isGk ? 96.6 : 96.0);
    ag.y = clamp(ag.y + ag.vy * dt, 5.2, 94.8);

    // Update facing direction: face travel vector when moving, otherwise turn toward the ball!
    if (currSpeed > 1.8) {
      const moveAngle = Math.atan2(ag.vy, ag.vx);
      let angleDiff = moveAngle - ag.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      ag.heading += angleDiff * clamp(dt * 11, 0, 1);
    } else {
      const ballAngle = Math.atan2(state.ball.y - ag.y, state.ball.x - ag.x);
      let angleDiff = ballAngle - ag.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      ag.heading += angleDiff * clamp(dt * 7, 0, 1);
    }

    // Live sprint ratio telemetry for subtle visual motion cues
    ag.sprintRatio = clamp(currSpeed / 15.5, 0, 1);
  }
}

function stepBallAndDecisions(
  state: LiveEngineState,
  dt: number,
  ctx: EngineStepContext,
  homeProfile: ReturnType<typeof getTeamAggressionProfile>,
  awayProfile: ReturnType<typeof getTeamAggressionProfile>
): void {
  state.ball.decisionCooldown = Math.max(0, state.ball.decisionCooldown - dt);

  const carrier = state.ball.carrierId ? state.agents.get(state.ball.carrierId) || null : null;

  // CASE A: Ball is currently at a player's feet (Dribbling & Playmaking)
  if (carrier && state.phase === 'OPEN_PLAY') {
    state.ball.carrierHoldTime += dt;
    state.ball.lastTouchTeam = carrier.team;

    // Position ball slightly ahead of carrier's feet with subtle rhythmic dribble touches
    const touchOffset = 1.25 + Math.sin(state.clockSec * 11 + carrier.seed * 6) * 0.28;
    state.ball.x = clamp(carrier.x + Math.cos(carrier.heading) * touchOffset, 3.5, 96.5);
    state.ball.y = clamp(carrier.y + Math.sin(carrier.heading) * touchOffset, 4.8, 95.2);
    state.ball.vx = carrier.vx;
    state.ball.vy = carrier.vy;
    state.ball.z = 0;
    state.ball.vz = 0;

    // Append soft dribble breadcrumb if moved enough
    const lastTrail = state.ball.trail[state.ball.trail.length - 1];
    if (!lastTrail || Math.hypot(state.ball.x - lastTrail.x, state.ball.y - lastTrail.y) > 4.2) {
      state.ball.trail = [
        ...state.ball.trail.slice(-3),
        { x: state.ball.x, y: state.ball.y, z: 0 },
      ];
    }

    // Check for physical tackle / dispossession by close defender!
    let closestDef: LivePitchAgent | null = null;
    let closestDefDist = Infinity;
    state.agents.forEach((opp) => {
      if (opp.team !== carrier.team && !opp.isGk) {
        const d = Math.hypot(opp.x - state.ball.x, opp.y - state.ball.y);
        if (d < closestDefDist) {
          closestDefDist = d;
          closestDef = opp;
        }
      }
    });

    // Align smoothly with authoritative match possession bias: if the other team won momentum, defenders win the duel much more eagerly!
    const wantsTurnover = ctx.preferredPossession !== carrier.team;
    if (
      closestDef &&
      !carrier.isGk &&
      closestDefDist < (wantsTurnover ? 3.2 : 2.1) &&
      state.ball.carrierHoldTime > 0.28
    ) {
      const tackler = closestDef as LivePitchAgent;
      const tackleChance = wantsTurnover ? 0.58 : 0.18;
      if (Math.random() < tackleChance) {
        state.ball.carrierId = tackler.id;
        state.ball.passFromId = null;
        state.ball.passTargetId = null;
        state.ball.lastTouchTeam = tackler.team;
        state.ball.carrierHoldTime = 0;
        state.ball.decisionCooldown = 0.35;
        return;
      }
    }

    // Decide whether carrier keeps dribbling into space or plays a pass / through-ball / cross!
    const underHeavyPressure = closestDefDist < 5.2;
    const minHold = carrier.isGk ? 0.35 : underHeavyPressure ? 0.26 : 0.55;
    const maxHold =
      carrier.isGk
        ? 0.75
        : carrier.role === 'ATA' || carrier.role === 'LAT'
        ? 1.55
        : 1.15;

    if (
      state.ball.decisionCooldown <= 0 &&
      (state.ball.carrierHoldTime >= maxHold ||
        (state.ball.carrierHoldTime >= minHold && (underHeavyPressure || Math.random() < 0.48)))
    ) {
      const defLeft = carrier.team === 'home' ? ctx.homeDefendsLeft : !ctx.homeDefendsLeft;
      const dir = defLeft ? 1 : -1;
      const prof = carrier.team === 'home' ? homeProfile : awayProfile;
      const carrierProg = defLeft ? carrier.x / 100 : (100 - carrier.x) / 100;

      // Evaluate all teammates for the smartest football pass
      let bestTeammate: LivePitchAgent | null = null;
      let bestLeadX = 0;
      let bestLeadY = 0;
      let bestLoft = false;
      let bestScore = -Infinity;

      state.agents.forEach((mate) => {
        if (mate.team !== carrier.team || mate.id === carrier.id) return;
        // Rarely pass back to GK unless heavily pressed deep in own half
        if (mate.isGk && (!underHeavyPressure || carrierProg > 0.34)) return;

        // Predict leading pass target based on teammate's run!
        let leadX = mate.vx * 0.38;
        let leadY = mate.vy * 0.38;
        let isLofted = false;

        if (mate.intent === 'RUN_BEHIND' || mate.intent === 'OVERLAP') {
          leadX += dir * 6.5;
        } else if (mate.intent === 'BOX_CRASH') {
          leadX += dir * 3.5;
        }

        const tx = clamp(mate.x + leadX, 5, 95);
        const ty = clamp(mate.y + leadY, 7, 93);
        const passDist = Math.hypot(tx - carrier.x, ty - carrier.y);
        if (passDist < 5.5 || passDist > 58) return;

        // Check how open the receiver & passing lane are!
        let minOppToTarget = Infinity;
        let laneBlockedPenalty = 0;
        const pdx = tx - carrier.x;
        const pdy = ty - carrier.y;
        const pLenSq = pdx * pdx + pdy * pdy;

        state.agents.forEach((opp) => {
          if (opp.team === carrier.team) return;
          const dTarget = Math.hypot(opp.x - tx, opp.y - ty);
          if (dTarget < minOppToTarget) minOppToTarget = dTarget;

          // Distance from opponent to pass segment
          const proj = clamp(((opp.x - carrier.x) * pdx + (opp.y - carrier.y) * pdy) / pLenSq, 0.1, 0.9);
          const lx = carrier.x + proj * pdx;
          const ly = carrier.y + proj * pdy;
          const laneDist = Math.hypot(opp.x - lx, opp.y - ly);
          if (laneDist < 3.4) {
            laneBlockedPenalty += (3.4 - laneDist) * 11;
          }
        });

        // Crosses from wide final third or diagonal switches over 30% distance can be lofted over defenders!
        const isCross =
          carrierProg > 0.72 &&
          (carrier.y < 26 || carrier.y > 74 || prof.crossTendency > 0.6) &&
          (defLeft ? tx > 78 : tx < 22) &&
          ty > 26 &&
          ty < 74;
        const isSwitchOfPlay = Math.abs(ty - carrier.y) > 36 && passDist > 26;

        if (isCross || isSwitchOfPlay || (prof.directness > 0.68 && passDist > 28)) {
          isLofted = true;
          laneBlockedPenalty *= 0.25; // Lofted ball clears midfield cover shadows
        }

        const mateProg = defLeft ? tx / 100 : (100 - tx) / 100;
        const forwardGain = (mateProg - carrierProg) * 100;

        let score =
          forwardGain * (0.65 + prof.directness * 0.75) +
          Math.min(minOppToTarget, 16) * 1.9 -
          laneBlockedPenalty;

        // Reward triangles & combinations in short-passing tactics
        if (prof.directness < 0.35 && passDist >= 8 && passDist <= 22) {
          score += 9;
        }
        // Reward feeding overlapping fullbacks & runners in behind!
        if (mate.intent === 'RUN_BEHIND' || mate.intent === 'OVERLAP' || mate.intent === 'BOX_CRASH') {
          score += 11;
        }
        if (isCross) {
          score += 14 * (0.6 + prof.crossTendency);
        }
        if (isSwitchOfPlay && minOppToTarget > 10) {
          score += 10;
        }
        // Slight randomness so teams vary combinations naturally
        score += (Math.random() - 0.5) * 10;

        if (score > bestScore) {
          bestScore = score;
          bestTeammate = mate;
          bestLeadX = leadX;
          bestLeadY = leadY;
          bestLoft = isLofted;
        }
      });

      if (bestTeammate) {
        executePass(state, carrier, bestTeammate, bestLeadX, bestLeadY, bestLoft);
      } else {
        state.ball.decisionCooldown = 0.3;
      }
    }
    return;
  }

  // CASE B: Ball is free / in flight (Pass, Cross, Shot, Rebound)
  state.ball.x += state.ball.vx * dt;
  state.ball.y += state.ball.vy * dt;

  // Vertical arc physics for lofted balls
  if (state.ball.z > 0 || state.ball.vz !== 0) {
    state.ball.z += state.ball.vz * dt;
    state.ball.vz -= 5.8 * dt;
    if (state.ball.z <= 0) {
      state.ball.z = 0;
      state.ball.vz = Math.abs(state.ball.vz) > 1.2 ? Math.abs(state.ball.vz) * 0.28 : 0;
    }
  }

  // Natural turf friction when rolling on the grass
  const drag = state.phase === 'SHOT_SEQUENCE' ? 0.55 : state.ball.z > 0.1 ? 0.88 : 0.24;
  state.ball.vx *= Math.pow(drag, dt);
  state.ball.vy *= Math.pow(drag, dt);

  // Keep ball inside pitch boundaries during open play
  if (state.phase === 'OPEN_PLAY') {
    if (state.ball.x < 3.6 || state.ball.x > 96.4) {
      state.ball.x = clamp(state.ball.x, 3.6, 96.4);
      state.ball.vx *= -0.35;
    }
    if (state.ball.y < 4.5 || state.ball.y > 95.5) {
      state.ball.y = clamp(state.ball.y, 4.5, 95.5);
      state.ball.vy *= -0.35;
    }
  } else {
    state.ball.x = clamp(state.ball.x, 1.5, 98.5);
    state.ball.y = clamp(state.ball.y, 4.0, 96.0);
  }

  // Append smooth flight trail point
  const lastTrail = state.ball.trail[state.ball.trail.length - 1];
  if (!lastTrail || Math.hypot(state.ball.x - lastTrail.x, state.ball.y - lastTrail.y) > 3.5) {
    state.ball.trail = [
      ...state.ball.trail.slice(-4),
      {
        x: state.ball.x,
        y: state.ball.y,
        z: state.ball.z,
        isShot: state.phase === 'SHOT_SEQUENCE',
      },
    ];
  }

  // Check if a player controls/intercepts the ball! (Only when ball is low enough to control/head, and not mid-shot)
  if (state.phase === 'OPEN_PLAY' && state.ball.z < 0.55) {
    let winner: LivePitchAgent | null = null;
    let bestPickDist = Infinity;

    state.agents.forEach((ag) => {
      // Passer doesn't immediately re-collect their own pass in the first 0.2s
      if (ag.id === state.ball.passFromId && state.ball.decisionCooldown > 0.04) return;

      const controlRadius =
        ag.id === state.ball.passTargetId
          ? 2.8
          : ag.isGk
          ? 3.1
          : ag.team === ctx.preferredPossession
          ? 2.2
          : 1.75;
      const d = Math.hypot(ag.x - state.ball.x, ag.y - state.ball.y);
      if (d <= controlRadius && d < bestPickDist) {
        bestPickDist = d;
        winner = ag;
      }
    });

    // If ball rolled nearly to a stop with nobody in control, nearest player sprints & collects it
    const ballSpeed = Math.hypot(state.ball.vx, state.ball.vy);
    if (!winner && ballSpeed < 3.5) {
      let closestAny: LivePitchAgent | null = null;
      let minAnyDist = Infinity;
      state.agents.forEach((ag) => {
        const d = Math.hypot(ag.x - state.ball.x, ag.y - state.ball.y);
        if (d < minAnyDist) {
          minAnyDist = d;
          closestAny = ag;
        }
      });
      if (closestAny) {
        const collector = closestAny as LivePitchAgent;
        collector.targetX = state.ball.x;
        collector.targetY = state.ball.y;
        collector.sprintRatio = 0.92;
        if (minAnyDist < 2.9) {
          winner = collector;
        }
      }
    }

    if (winner) {
      const ctrl = winner as LivePitchAgent;
      state.ball.carrierId = ctrl.id;
      state.ball.passFromId = null;
      state.ball.passTargetId = null;
      state.ball.passTargetPos = null;
      state.ball.lastTouchTeam = ctrl.team;
      state.ball.carrierHoldTime = 0;
      state.ball.decisionCooldown = 0.28;
      state.ball.z = 0;
      state.ball.vz = 0;
    }
  }
}

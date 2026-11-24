import React, { useState, useEffect, useMemo } from 'react';
import { Club, Fixture, Player, MatchEvent, PenaltyTargetZone, PenaltyKickStyle, PenaltyKeeperDive, PenaltyKickRecord } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import confetti from 'canvas-confetti';
import { Shield, Sparkles, Trophy, Zap, AlertCircle, Check, X } from 'lucide-react';

interface PenaltyShootoutModalProps {
  userClub: Club;
  homeClub: Club;
  awayClub: Club;
  fixture: Fixture;
  regulationHomeScore: number;
  regulationAwayScore: number;
  aggregateHomeScore?: number;
  aggregateAwayScore?: number;
  onCompleteShootout: (
    penaltiesHome: number,
    penaltiesAway: number,
    winnerClubId: string,
    shootoutEvents: MatchEvent[],
    penaltyRecords: PenaltyKickRecord[]
  ) => void;
}

interface KickState {
  isShooting: boolean;
  ballPos: { x: number; y: number } | null;
  keeperPos: { x: number; y: number; rotate: number } | null;
  outcomeBanner: { text: string; subtext: string; type: 'GOL' | 'DEFESA' | 'TRAVE' | 'FORA' } | null;
}

export const PenaltyShootoutModal: React.FC<PenaltyShootoutModalProps> = ({
  userClub,
  homeClub,
  awayClub,
  fixture,
  regulationHomeScore,
  regulationAwayScore,
  aggregateHomeScore,
  aggregateAwayScore,
  onCompleteShootout,
}) => {
  const isUserHome = homeClub.id === userClub.id;

  const buildOrderedKickers = (club: Club): Player[] => {
    const starters = club.squad.filter((p) => p.isStarter);
    const orderedIds = club.tactics.penaltyOrderIds || [];
    const customPicked: Player[] = [];
    for (const pid of orderedIds) {
      const found = starters.find((p) => p.id === pid);
      if (found && !customPicked.some((x) => x.id === found.id)) {
        customPicked.push(found);
      }
    }
    if (customPicked.length === 0 && club.tactics.penaltyTakerId) {
      const taker = starters.find((p) => p.id === club.tactics.penaltyTakerId);
      if (taker) customPicked.push(taker);
    }
    const remaining = starters
      .filter((p) => !customPicked.some((x) => x.id === p.id))
      .sort((a, b) => {
        const order = { FW: 1, MF: 2, DF: 3, GK: 4 };
        return (order[a.position] || 3) - (order[b.position] || 3);
      });
    return [...customPicked, ...remaining];
  };

  // Starters available as penalty kickers
  const homeKickers = useMemo(() => buildOrderedKickers(homeClub), [homeClub]);
  const awayKickers = useMemo(() => buildOrderedKickers(awayClub), [awayClub]);

  // Goalkeepers
  const homeKeeper = useMemo(
    () => homeClub.squad.find((p) => p.isStarter && p.position === 'GK') || homeClub.squad[0],
    [homeClub]
  );
  const awayKeeper = useMemo(
    () => awayClub.squad.find((p) => p.isStarter && p.position === 'GK') || awayClub.squad[0],
    [awayClub]
  );

  // Shootout tracking state
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentTurn, setCurrentTurn] = useState<'HOME' | 'AWAY'>('HOME');
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [homeKicks, setHomeKicks] = useState<Array<'GOL' | 'DEFESA' | 'TRAVE' | 'FORA'>>([]);
  const [awayKicks, setAwayKicks] = useState<Array<'GOL' | 'DEFESA' | 'TRAVE' | 'FORA'>>([]);
  const [historyRecords, setHistoryRecords] = useState<PenaltyKickRecord[]>([]);
  const [shootoutEvents, setShootoutEvents] = useState<MatchEvent[]>([]);

  // User input selection state
  const [selectedZone, setSelectedZone] = useState<PenaltyTargetZone>('TOP_RIGHT');
  const [selectedStyle, setSelectedStyle] = useState<PenaltyKickStyle>('COLOCADA');
  const [selectedDive, setSelectedDive] = useState<PenaltyKeeperDive>('CENTER');

  // Animation & Banner state
  const [kickState, setKickState] = useState<KickState>({
    isShooting: false,
    ballPos: null,
    keeperPos: null,
    outcomeBanner: null,
  });

  const [isDecided, setIsDecided] = useState<boolean>(false);
  const [winnerClub, setWinnerClub] = useState<Club | null>(null);

  // Identify who is kicking and keeping right now
  const isHomeKicking = currentTurn === 'HOME';
  const isUserKicking = (isHomeKicking && isUserHome) || (!isHomeKicking && !isUserHome);
  const kickerList = isHomeKicking ? homeKickers : awayKickers;
  const currentKicker = kickerList[(currentRound - 1) % kickerList.length] || kickerList[0];
  const currentDefendingKeeper = isHomeKicking ? awayKeeper : homeKeeper;

  // Coordinate maps for target zones (Percentages inside goal container)
  const zoneCoordinates: Record<PenaltyTargetZone, { x: number; y: number }> = {
    TOP_LEFT: { x: 18, y: 22 },
    TOP_RIGHT: { x: 82, y: 22 },
    CENTER: { x: 50, y: 48 },
    BOTTOM_LEFT: { x: 18, y: 74 },
    BOTTOM_RIGHT: { x: 82, y: 74 },
  };

  // Check if shootout has reached mathematical conclusion
  const checkWinner = (
    newHomeKicks: Array<'GOL' | 'DEFESA' | 'TRAVE' | 'FORA'>,
    newAwayKicks: Array<'GOL' | 'DEFESA' | 'TRAVE' | 'FORA'>
  ): { decided: boolean; winner: Club | null } => {
    const hGoals = newHomeKicks.filter((o) => o === 'GOL').length;
    const aGoals = newAwayKicks.filter((o) => o === 'GOL').length;

    // Regular phase (first 5 kicks)
    if (newHomeKicks.length <= 5 && newAwayKicks.length <= 5) {
      const hRemaining = 5 - newHomeKicks.length;
      const aRemaining = 5 - newAwayKicks.length;

      // Mathematically impossible to catch up
      if (hGoals > aGoals + aRemaining) {
        return { decided: true, winner: homeClub };
      }
      if (aGoals > hGoals + hRemaining) {
        return { decided: true, winner: awayClub };
      }

      // If both completed 5 kicks
      if (newHomeKicks.length === 5 && newAwayKicks.length === 5) {
        if (hGoals > aGoals) return { decided: true, winner: homeClub };
        if (aGoals > hGoals) return { decided: true, winner: awayClub };
        return { decided: false, winner: null }; // Proceed to sudden death!
      }

      return { decided: false, winner: null };
    }

    // Sudden Death (Alternadas: after 5 kicks each, team with advantage after equal kicks wins)
    if (newHomeKicks.length === newAwayKicks.length) {
      if (hGoals > aGoals) return { decided: true, winner: homeClub };
      if (aGoals > hGoals) return { decided: true, winner: awayClub };
    }

    return { decided: false, winner: null };
  };

  // Perform penalty execution
  const executePenalty = (
    targetZone: PenaltyTargetZone,
    kickStyle: PenaltyKickStyle,
    keeperDive: PenaltyKeeperDive
  ) => {
    if (kickState.isShooting || isDecided) return;

    soundEngine.playBallKick();

    // 1. Calculate outcome based on shooter attributes vs keeper attributes & dive choice
    const kickerOvr = currentKicker.overall;
    const keeperOvr = currentDefendingKeeper.overall;

    const targetCoords = zoneCoordinates[targetZone];

    // Keeper dive coordinates
    let keeperTarget = { x: 50, y: 52, rotate: 0 };
    if (keeperDive === 'LEFT') {
      keeperTarget = { x: 26, y: 55, rotate: -38 };
    } else if (keeperDive === 'RIGHT') {
      keeperTarget = { x: 74, y: 55, rotate: 38 };
    } else {
      keeperTarget = { x: 50, y: 35, rotate: 0 };
    }

    // Determine shot outcome
    let outcome: 'GOL' | 'DEFESA' | 'TRAVE' | 'FORA' = 'GOL';

    // Cavadinha Logic
    if (kickStyle === 'CAVADINHA') {
      if (keeperDive === 'CENTER') {
        outcome = 'DEFESA'; // Keeper waited in the center and easily caught the panenka!
      } else {
        outcome = 'GOL'; // Audacious humiliation goal!
      }
    } else {
      // Check if keeper guessed correct side
      const zoneIsLeft = targetZone === 'TOP_LEFT' || targetZone === 'BOTTOM_LEFT';
      const zoneIsRight = targetZone === 'TOP_RIGHT' || targetZone === 'BOTTOM_RIGHT';
      const keeperGuessedCorrect =
        (zoneIsLeft && keeperDive === 'LEFT') ||
        (zoneIsRight && keeperDive === 'RIGHT') ||
        (targetZone === 'CENTER' && keeperDive === 'CENTER');

      if (keeperGuessedCorrect) {
        // High chance of save, depending on Bomba vs Keeper Ovr
        let saveProb = 0.68 + (keeperOvr - kickerOvr) * 0.008;
        if (kickStyle === 'BOMBA') saveProb -= 0.15; // Harder to stop
        if (Math.random() < saveProb) {
          outcome = 'DEFESA';
        } else {
          // Ball enters anyway off keeper's fingertips or post
          outcome = Math.random() < 0.15 ? 'TRAVE' : 'GOL';
        }
      } else {
        // Keeper went the wrong way! Almost always a goal, unless kicker misses target
        let missProb = 0.05 - (kickerOvr - 70) * 0.002;
        if (targetZone === 'TOP_LEFT' || targetZone === 'TOP_RIGHT') missProb += 0.04; // Angle has higher miss risk
        if (kickStyle === 'BOMBA') missProb += 0.05; // Full power has higher trajectory error

        if (Math.random() < Math.max(0.02, missProb)) {
          outcome = Math.random() < 0.6 ? 'TRAVE' : 'FORA';
        } else {
          outcome = 'GOL';
        }
      }
    }

    // Trigger visual ball flight
    setKickState({
      isShooting: true,
      ballPos: targetCoords,
      keeperPos: keeperTarget,
      outcomeBanner: null,
    });

    // Sound and Banner reaction timing
    setTimeout(() => {
      let bannerText = 'GOOOL!';
      let bannerSub = 'Bateu com maestria no fundo da rede!';
      if (outcome === 'GOL') {
        soundEngine.playGoalRoar();
        bannerText = kickStyle === 'CAVADINHA' ? 'GOLAÇO DE CAVADINHA! 🪄' : 'GOOOL! ⚽';
        bannerSub = `${currentKicker.name} converte a penalidade com muita categoria!`;
      } else if (outcome === 'DEFESA') {
        soundEngine.playGoalkeeperSave();
        bannerText = 'DEFENDEU O GOLEIRO! 🧤';
        bannerSub = `Espetacular defesa de ${currentDefendingKeeper.name}!`;
      } else if (outcome === 'TRAVE') {
        soundEngine.playWhistle(false);
        bannerText = 'NA TRAVE! 💥';
        bannerSub = `A bola explode no poste e não entra!`;
      } else {
        soundEngine.playWhistle(false);
        bannerText = 'PRA FORA! ❌';
        bannerSub = `${currentKicker.name} isolou a bola por cima do travessão!`;
      }

      setKickState((prev) => ({
        ...prev,
        outcomeBanner: {
          text: bannerText,
          subtext: bannerSub,
          type: outcome,
        },
      }));
    }, 450);

    // Finalize kick and advance turn
    setTimeout(() => {
      const newHomeKicks = isHomeKicking ? [...homeKicks, outcome] : homeKicks;
      const newAwayKicks = !isHomeKicking ? [...awayKicks, outcome] : awayKicks;

      const newHomeScore = isHomeKicking && outcome === 'GOL' ? homeScore + 1 : homeScore;
      const newAwayScore = !isHomeKicking && outcome === 'GOL' ? awayScore + 1 : awayScore;

      setHomeKicks(newHomeKicks);
      setAwayKicks(newAwayKicks);
      setHomeScore(newHomeScore);
      setAwayScore(newAwayScore);

      const record: PenaltyKickRecord = {
        id: `pk_${Date.now()}`,
        roundNumber: currentRound,
        isHomeTeam: isHomeKicking,
        teamId: isHomeKicking ? homeClub.id : awayClub.id,
        shooterId: currentKicker.id,
        shooterName: currentKicker.name,
        keeperId: currentDefendingKeeper.id,
        keeperName: currentDefendingKeeper.name,
        targetZone,
        kickStyle,
        keeperDive,
        outcome,
        scoreHomeAfter: newHomeScore,
        scoreAwayAfter: newAwayScore,
      };

      setHistoryRecords((prev) => [...prev, record]);

      const eventText =
        outcome === 'GOL'
          ? `⚽ PÊNALTI CONVERTIDO! ${currentKicker.name} (${isHomeKicking ? homeClub.shortName : awayClub.shortName}) marca com precisão!`
          : `❌ PÊNALTI PERDIDO! ${currentKicker.name} (${isHomeKicking ? homeClub.shortName : awayClub.shortName}) teve o chute parado por ${currentDefendingKeeper.name}!`;

      const newEvent: MatchEvent = {
        id: `ev_pen_${Date.now()}`,
        minute: 120,
        type: outcome === 'GOL' ? 'PENALTI_GOL' : 'PENALTI_PERDIDO',
        teamId: isHomeKicking ? homeClub.id : awayClub.id,
        playerId: currentKicker.id,
        playerName: currentKicker.name,
        description: eventText,
        isHomeTeam: isHomeKicking,
      };
      setShootoutEvents((prev) => [...prev, newEvent]);

      // Check win condition
      const { decided, winner } = checkWinner(newHomeKicks, newAwayKicks);

      if (decided && winner) {
        setIsDecided(true);
        setWinnerClub(winner);
        soundEngine.playDoubleWhistle();

        if (winner.id === userClub.id) {
          soundEngine.playFanfare();
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.4 },
          });
        }
      } else {
        // Advance round or switch turn
        if (isHomeKicking) {
          setCurrentTurn('AWAY');
        } else {
          setCurrentTurn('HOME');
          setCurrentRound((r) => r + 1);
        }
      }

      // Reset pitch visual
      setKickState({
        isShooting: false,
        ballPos: null,
        keeperPos: null,
        outcomeBanner: null,
      });
    }, 1800);
  };

  // Handle User Action
  const handleUserTakeKick = () => {
    // Generate AI goalkeeper dive
    const diveRoll = Math.random();
    let cpuDive: PenaltyKeeperDive = 'CENTER';
    if (diveRoll < 0.42) cpuDive = 'LEFT';
    else if (diveRoll < 0.84) cpuDive = 'RIGHT';
    else cpuDive = 'CENTER';

    executePenalty(selectedZone, selectedStyle, cpuDive);
  };

  const handleUserDefend = () => {
    // Generate CPU shooter choice
    const zones: PenaltyTargetZone[] = ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT', 'CENTER'];
    const styles: PenaltyKickStyle[] = ['COLOCADA', 'BOMBA', 'CAVADINHA'];

    const chosenZone = zones[Math.floor(Math.random() * zones.length)];
    const chosenStyle = Math.random() < 0.08 ? 'CAVADINHA' : Math.random() < 0.45 ? 'BOMBA' : 'COLOCADA';

    executePenalty(chosenZone, chosenStyle, selectedDive);
  };

  // Quick Instant Sim Remaining Penalties
  const handleFastSimRemaining = () => {
    if (isDecided) return;
    soundEngine.playClick();

    let curHScore = homeScore;
    let curAScore = awayScore;
    let curHKicks = [...homeKicks];
    let curAKicks = [...awayKicks];
    let turn = currentTurn;
    let r = currentRound;
    const addedEvents: MatchEvent[] = [];
    const addedRecords: PenaltyKickRecord[] = [];

    while (true) {
      const isHome = turn === 'HOME';
      const kickerList = isHome ? homeKickers : awayKickers;
      const kicker = kickerList[(r - 1) % kickerList.length];
      const keeper = isHome ? awayKeeper : homeKeeper;

      // Realistic conversion (~76%)
      const isGoal = Math.random() < 0.76;
      const outcome: 'GOL' | 'DEFESA' | 'TRAVE' | 'FORA' = isGoal
        ? 'GOL'
        : Math.random() < 0.75
        ? 'DEFESA'
        : 'TRAVE';

      if (isHome) {
        curHKicks.push(outcome);
        if (isGoal) curHScore++;
      } else {
        curAKicks.push(outcome);
        if (isGoal) curAScore++;
      }

      addedRecords.push({
        id: `pk_fast_${Date.now()}_${r}_${turn}`,
        roundNumber: r,
        isHomeTeam: isHome,
        teamId: isHome ? homeClub.id : awayClub.id,
        shooterId: kicker.id,
        shooterName: kicker.name,
        keeperId: keeper.id,
        keeperName: keeper.name,
        targetZone: 'BOTTOM_RIGHT',
        kickStyle: 'COLOCADA',
        keeperDive: isGoal ? 'LEFT' : 'RIGHT',
        outcome,
        scoreHomeAfter: curHScore,
        scoreAwayAfter: curAScore,
      });

      const { decided, winner } = checkWinner(curHKicks, curAKicks);
      if (decided && winner) {
        setHomeScore(curHScore);
        setAwayScore(curAScore);
        setHomeKicks(curHKicks);
        setAwayKicks(curAKicks);
        setHistoryRecords((prev) => [...prev, ...addedRecords]);
        setShootoutEvents((prev) => [...prev, ...addedEvents]);
        setIsDecided(true);
        setWinnerClub(winner);

        if (winner.id === userClub.id) {
          soundEngine.playFanfare();
          confetti({ particleCount: 150, spread: 90 });
        }
        break;
      }

      if (turn === 'HOME') {
        turn = 'AWAY';
      } else {
        turn = 'HOME';
        r++;
      }
    }
  };

  const handleFinish = () => {
    soundEngine.playClick();
    if (winnerClub) {
      onCompleteShootout(homeScore, awayScore, winnerClub.id, shootoutEvents, historyRecords);
    }
  };

  // Helper dots for scorecard
  const totalRoundsToShow = Math.max(5, currentRound, homeKicks.length, awayKicks.length);
  const roundIndices = Array.from({ length: totalRoundsToShow }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-4xl shadow-2xl my-auto overflow-y-auto flex flex-col max-h-[94vh]">
        {/* Header: Tension & Stakes */}
        <div className="bg-gradient-to-r from-black via-slate-950 to-black px-6 py-3.5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>DECISÃO POR PÊNALTIS • MATA-MATA</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-700/60 font-bold">
                  QUEM PERDER ESTÁ FORA
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tempo regulamentar: {homeClub.shortName} {regulationHomeScore} x {regulationAwayScore} {awayClub.shortName}
                {aggregateHomeScore !== undefined && aggregateAwayScore !== undefined && (
                  <span className="text-amber-300 font-semibold ml-1.5">
                    (Agregado: {aggregateHomeScore} x {aggregateAwayScore})
                  </span>
                )}
              </p>
            </div>
          </div>

          {!isDecided && (
            <button
              onClick={handleFastSimRemaining}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Simular instantaneamente as cobranças restantes"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Simular Restante</span>
            </button>
          )}
        </div>

        {/* Scoreboard and Kick Tracker */}
        <div className="bg-slate-950 p-4 sm:p-5 border-b border-slate-800">
          <div className="grid grid-cols-12 items-center gap-2">
            {/* Home Club */}
            <div className="col-span-5 flex items-center justify-end gap-3">
              <div className="text-right">
                <h3 className="text-base sm:text-lg font-black text-white">{homeClub.name}</h3>
                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                  {roundIndices.map((idx) => {
                    const outcome = homeKicks[idx];
                    const isCurrent = isHomeKicking && currentRound === idx + 1 && !isDecided;
                    return (
                      <div
                        key={`h_dot_${idx}`}
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                          outcome === 'GOL'
                            ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                            : outcome
                            ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_8px_rgba(225,29,72,0.7)]'
                            : isCurrent
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300 animate-pulse'
                            : 'bg-slate-800 border-slate-700 text-transparent'
                        }`}
                      >
                        {outcome === 'GOL' ? <Check className="w-3 h-3 stroke-[3]" /> : outcome ? <X className="w-3 h-3 stroke-[3]" /> : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 border-white/20 shrink-0"
                style={{ backgroundColor: homeClub.colors.primary, color: homeClub.colors.text }}
              >
                {homeClub.initials}
              </div>
            </div>

            {/* Placar dos Pênaltis */}
            <div className="col-span-2 flex flex-col items-center justify-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 mb-0.5">
                {currentRound > 5 ? 'MORTE SÚBITA' : `RODADA ${currentRound}/5`}
              </span>
              <div className="bg-black border border-amber-500/50 px-4 py-1.5 rounded-2xl shadow-xl flex items-center gap-3">
                <span className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tabular-nums">
                  {homeScore}
                </span>
                <span className="text-slate-600 font-bold">-</span>
                <span className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tabular-nums">
                  {awayScore}
                </span>
              </div>
            </div>

            {/* Away Club */}
            <div className="col-span-5 flex items-center justify-start gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 border-white/20 shrink-0"
                style={{ backgroundColor: awayClub.colors.primary, color: awayClub.colors.text }}
              >
                {awayClub.initials}
              </div>
              <div className="text-left">
                <h3 className="text-base sm:text-lg font-black text-white">{awayClub.name}</h3>
                <div className="flex items-center justify-start gap-1.5 mt-1.5">
                  {roundIndices.map((idx) => {
                    const outcome = awayKicks[idx];
                    const isCurrent = !isHomeKicking && currentRound === idx + 1 && !isDecided;
                    return (
                      <div
                        key={`a_dot_${idx}`}
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                          outcome === 'GOL'
                            ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                            : outcome
                            ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_8px_rgba(225,29,72,0.7)]'
                            : isCurrent
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300 animate-pulse'
                            : 'bg-slate-800 border-slate-700 text-transparent'
                        }`}
                      >
                        {outcome === 'GOL' ? <Check className="w-3 h-3 stroke-[3]" /> : outcome ? <X className="w-3 h-3 stroke-[3]" /> : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shootout Stage Arena (The Penalty Box & Goal View) */}
        <div className="relative bg-gradient-to-b from-emerald-950/60 via-emerald-900/40 to-slate-950 p-4 sm:p-6 flex flex-col items-center justify-center overflow-hidden min-h-[290px]">
          {/* Turf texture & lines */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Goal Frame */}
          <div className="relative w-full max-w-xl h-44 sm:h-52 border-t-8 border-x-8 border-white rounded-t-lg bg-emerald-900/30 shadow-[0_0_35px_rgba(0,0,0,0.8)_inset] overflow-hidden">
            {/* Net Grid */}
            <div className="absolute inset-0 opacity-25 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:14px_14px]" />
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/80" />

            {/* Target Clickable Zones (when User is kicking) */}
            {isUserKicking && !kickState.isShooting && !isDecided && (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 p-2 gap-2 z-20">
                {/* Top Left (Gaveta) */}
                <button
                  type="button"
                  onClick={() => setSelectedZone('TOP_LEFT')}
                  className={`rounded-xl border-2 flex flex-col items-center justify-center text-xs font-black transition-all ${
                    selectedZone === 'TOP_LEFT'
                      ? 'border-amber-400 bg-amber-400/30 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.6)] scale-105'
                      : 'border-white/20 bg-black/40 text-slate-300 hover:border-white/60 hover:bg-black/60'
                  }`}
                >
                  <span>↖️ Ângulo Esq.</span>
                  <span className="text-[10px] text-amber-300 font-semibold">Gaveta</span>
                </button>

                {/* Center / Cavadinha */}
                <button
                  type="button"
                  onClick={() => setSelectedZone('CENTER')}
                  className={`row-span-2 rounded-xl border-2 flex flex-col items-center justify-center text-xs font-black transition-all ${
                    selectedZone === 'CENTER'
                      ? 'border-amber-400 bg-amber-400/30 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.6)] scale-105'
                      : 'border-white/20 bg-black/40 text-slate-300 hover:border-white/60 hover:bg-black/60'
                  }`}
                >
                  <span>🎯 Meio do Gol</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Cavadinha / Forte</span>
                </button>

                {/* Top Right (Gaveta) */}
                <button
                  type="button"
                  onClick={() => setSelectedZone('TOP_RIGHT')}
                  className={`rounded-xl border-2 flex flex-col items-center justify-center text-xs font-black transition-all ${
                    selectedZone === 'TOP_RIGHT'
                      ? 'border-amber-400 bg-amber-400/30 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.6)] scale-105'
                      : 'border-white/20 bg-black/40 text-slate-300 hover:border-white/60 hover:bg-black/60'
                  }`}
                >
                  <span>↗️ Ângulo Dir.</span>
                  <span className="text-[10px] text-amber-300 font-semibold">Gaveta</span>
                </button>

                {/* Bottom Left (Canto Rasteiro) */}
                <button
                  type="button"
                  onClick={() => setSelectedZone('BOTTOM_LEFT')}
                  className={`rounded-xl border-2 flex flex-col items-center justify-center text-xs font-black transition-all ${
                    selectedZone === 'BOTTOM_LEFT'
                      ? 'border-amber-400 bg-amber-400/30 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.6)] scale-105'
                      : 'border-white/20 bg-black/40 text-slate-300 hover:border-white/60 hover:bg-black/60'
                  }`}
                >
                  <span>↙️ Canto Esq.</span>
                  <span className="text-[10px] text-sky-300 font-semibold">Rasteiro Firme</span>
                </button>

                {/* Bottom Right (Canto Rasteiro) */}
                <button
                  type="button"
                  onClick={() => setSelectedZone('BOTTOM_RIGHT')}
                  className={`rounded-xl border-2 flex flex-col items-center justify-center text-xs font-black transition-all ${
                    selectedZone === 'BOTTOM_RIGHT'
                      ? 'border-amber-400 bg-amber-400/30 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.6)] scale-105'
                      : 'border-white/20 bg-black/40 text-slate-300 hover:border-white/60 hover:bg-black/60'
                  }`}
                >
                  <span>↘️ Canto Dir.</span>
                  <span className="text-[10px] text-sky-300 font-semibold">Rasteiro Firme</span>
                </button>
              </div>
            )}

            {/* Goalkeeper in Goal */}
            <div
              className="absolute z-10 transition-all duration-300 ease-out flex flex-col items-center justify-center pointer-events-none"
              style={{
                left: `${kickState.keeperPos ? kickState.keeperPos.x : 50}%`,
                top: `${kickState.keeperPos ? kickState.keeperPos.y : 52}%`,
                transform: `translate(-50%, -50%) rotate(${kickState.keeperPos ? kickState.keeperPos.rotate : 0}deg)`,
              }}
            >
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white shadow-2xl flex items-center justify-center font-black text-sm relative"
                style={{
                  backgroundColor: isHomeKicking ? awayClub.colors.primary : homeClub.colors.primary,
                  color: '#fff',
                }}
              >
                <span className="text-xl">🧤</span>
              </div>
              <span className="mt-1 text-[11px] font-black px-2 py-0.5 rounded bg-black/80 text-white border border-white/20 shadow">
                {currentDefendingKeeper.name} ({currentDefendingKeeper.overall})
              </span>
            </div>

            {/* Ball flight in goal */}
            {kickState.isShooting && kickState.ballPos && (
              <div
                className="absolute z-30 transition-all duration-400 ease-out pointer-events-none flex items-center justify-center"
                style={{
                  left: `${kickState.ballPos.x}%`,
                  top: `${kickState.ballPos.y}%`,
                  transform: 'translate(-50%, -50%) scale(0.85)',
                }}
              >
                <div className="w-8 h-8 rounded-full bg-white shadow-[0_0_20px_#ffffff] flex items-center justify-center text-sm animate-spin">
                  ⚽
                </div>
              </div>
            )}
          </div>

          {/* Penalty Spot & Ball Ready */}
          {!kickState.isShooting && !isDecided && (
            <div className="mt-5 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-white shadow-[0_0_12px_#ffffff] flex items-center justify-center text-xs animate-bounce">
                ⚽
              </div>
              <div className="w-3 h-1 bg-white/70 rounded-full mt-1" />
            </div>
          )}

          {/* Outcome Banner Overlay */}
          {kickState.outcomeBanner && (
            <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-in zoom-in-95 duration-200">
              <div
                className={`text-3xl sm:text-5xl font-black mb-2 tracking-tight ${
                  kickState.outcomeBanner.type === 'GOL'
                    ? 'text-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.8)]'
                    : kickState.outcomeBanner.type === 'DEFESA'
                    ? 'text-cyan-400 drop-shadow-[0_0_25px_rgba(34,211,238,0.8)]'
                    : 'text-rose-400 drop-shadow-[0_0_25px_rgba(251,113,133,0.8)]'
                }`}
              >
                {kickState.outcomeBanner.text}
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-200 max-w-md">
                {kickState.outcomeBanner.subtext}
              </p>
            </div>
          )}

          {/* Match Decided Winner Overlay */}
          {isDecided && winnerClub && (
            <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/50 flex items-center justify-center text-4xl mb-3 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                🏆
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                {winnerClub.name.toUpperCase()} VENCE NOS PÊNALTIS!
              </h2>
              <p className="text-base text-amber-300 font-bold mt-1">
                Placar final nos pênaltis: {homeClub.shortName} {homeScore} x {awayScore} {awayClub.shortName}
              </p>
              <p className="text-xs text-slate-400 mt-2 max-w-md">
                {winnerClub.id === userClub.id
                  ? 'PARABÉNS! Sua equipe mostrou sangue frio e garantiu a classificação histórica para a próxima fase!'
                  : 'Fim de linha nesta edição. O adversário converteu as cobranças decisivas e avançou.'}
              </p>
              <button
                type="button"
                onClick={handleFinish}
                className="mt-6 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-base shadow-xl flex items-center gap-2 transform active:scale-95 transition-all"
              >
                <span>Concluir e Avançar</span>
                <span>➔</span>
              </button>
            </div>
          )}
        </div>

        {/* Interactive Action Center (Shooting or Defending controls) */}
        {!isDecided && (
          <div className="bg-slate-900 p-4 sm:p-5 border-t border-slate-800">
            {isUserKicking ? (
              /* USER IS SHOOTING */
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      SUA VEZ DE COBRAR!
                    </span>
                    <span className="text-xs text-slate-300 font-bold">
                      Cobrador: <span className="text-white">{currentKicker.name}</span> (#{currentKicker.squadNumber} • {currentKicker.position} • OVR {currentKicker.overall})
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Selecione o canto e o estilo de cobrança</span>
                </div>

                {/* Style Selector */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStyle('COLOCADA')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedStyle === 'COLOCADA'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    🎯 Colocada (Precisão)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStyle('BOMBA')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedStyle === 'BOMBA'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    💥 Bomba (Potência Máxima)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStyle('CAVADINHA')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedStyle === 'CAVADINHA'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    🪄 Cavadinha (Ousadia)
                  </button>
                </div>

                {/* Shoot CTA Button */}
                <button
                  type="button"
                  disabled={kickState.isShooting}
                  onClick={handleUserTakeKick}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-base shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <span>BATER PÊNALTI ⚽</span>
                  <span className="text-xs font-mono font-semibold opacity-90">({selectedStyle} • {selectedZone})</span>
                </button>
              </div>
            ) : (
              /* USER IS DEFENDING (GOALKEEPER) */
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      SUA VEZ DE DEFENDER!
                    </span>
                    <span className="text-xs text-slate-300 font-bold">
                      Goleiro: <span className="text-white">{currentDefendingKeeper.name}</span> (OVR {currentDefendingKeeper.overall}) vs Cobrador: <span className="text-white">{currentKicker.name}</span> ({currentKicker.overall})
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Escolha o lado do salto para defender</span>
                </div>

                {/* Dive Direction Selector */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDive('LEFT')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all ${
                      selectedDive === 'LEFT'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    ⬅️ Pular na Esquerda
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDive('CENTER')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all ${
                      selectedDive === 'CENTER'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    🎯 Esperar no Centro
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDive('RIGHT')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all ${
                      selectedDive === 'RIGHT'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    ➡️ Pular na Direita
                  </button>
                </div>

                {/* Defend CTA Button */}
                <button
                  type="button"
                  disabled={kickState.isShooting}
                  onClick={handleUserDefend}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-black text-base shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <Shield className="w-5 h-5 text-slate-950" />
                  <span>DEFENDER PÊNALTI 🧤</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

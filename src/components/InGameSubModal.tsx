import React, { useState, useEffect, useMemo } from 'react';
import { Player, ClubColors } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import {
  ArrowLeftRight,
  X,
  CheckCircle2,
  UserMinus,
  UserPlus,
  AlertTriangle,
  Wand2,
  Trash2,
} from 'lucide-react';

export interface SubstitutionPair {
  outPlayer: Player;
  inPlayer: Player;
}

interface InGameSubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMinute: number;
  subsRemaining: number;
  maxSubs: number;
  starters: Player[];
  benchPlayers: Player[];
  subbedOutIds: Set<string>;
  initialStarter?: Player | null;
  initialReserve?: Player | null;
  forcedInjuredPlayer?: Player | null;
  userClubColors: ClubColors;
  yellowCardPlayerIds?: Set<string>;
  redCardPlayerIds?: Set<string>;
  goalScorerPlayerIds?: Set<string>;
  captainId?: string;
  liveRatingsMap?: Map<string, { rating: number }>;
  onConfirmSubs: (subs: SubstitutionPair[], resumeAfter?: boolean) => void;
  onRemoveInjuredWithoutSub?: (injuredPlayer: Player) => void;
}

export const InGameSubModal: React.FC<InGameSubModalProps> = ({
  isOpen,
  onClose,
  currentMinute,
  subsRemaining,
  maxSubs,
  starters,
  benchPlayers,
  subbedOutIds,
  initialStarter = null,
  initialReserve = null,
  forcedInjuredPlayer = null,
  userClubColors,
  yellowCardPlayerIds = new Set(),
  redCardPlayerIds = new Set(),
  goalScorerPlayerIds = new Set(),
  captainId,
  liveRatingsMap,
  onConfirmSubs,
  onRemoveInjuredWithoutSub,
}) => {
  const [queuedSubs, setQueuedSubs] = useState<SubstitutionPair[]>([]);
  const [pendingStarter, setPendingStarter] = useState<Player | null>(null);
  const [pendingReserve, setPendingReserve] = useState<Player | null>(null);

  const availableReserves = useMemo(
    () =>
      benchPlayers.filter(
        (p) =>
          !subbedOutIds.has(p.id) &&
          !p.isStarter &&
          p.injuryWeeks <= 0 &&
          !p.injuryDetails
      ),
    [benchPlayers, subbedOutIds]
  );

  // Eligible starters on the pitch (exclude expelled players with red cards)
  const eligibleStarters = useMemo(() => {
    const list = starters.filter((p) => !redCardPlayerIds.has(p.id));
    if (!forcedInjuredPlayer) return list;
    return [...list].sort((a, b) => {
      if (a.id === forcedInjuredPlayer.id) return -1;
      if (b.id === forcedInjuredPlayer.id) return 1;
      return a.condition - b.condition;
    });
  }, [starters, redCardPlayerIds, forcedInjuredPlayer]);

  useEffect(() => {
    if (!isOpen) return;
    setQueuedSubs([]);

    if (forcedInjuredPlayer) {
      setPendingStarter(forcedInjuredPlayer);
      setPendingReserve(null);
      return;
    }

    if (initialStarter && initialReserve && subsRemaining > 0) {
      setQueuedSubs([{ outPlayer: initialStarter, inPlayer: initialReserve }]);
      setPendingStarter(null);
      setPendingReserve(null);
    } else {
      setPendingStarter(initialStarter || null);
      setPendingReserve(initialReserve || null);
    }
  }, [isOpen, initialStarter, initialReserve, forcedInjuredPlayer, subsRemaining]);

  if (!isOpen) return null;

  const queuedOutIds = new Set(queuedSubs.map((s) => s.outPlayer.id));
  const queuedInIds = new Set(queuedSubs.map((s) => s.inPlayer.id));
  const slotsLeftToQueue = Math.max(0, subsRemaining - queuedSubs.length);

  const isInjuredPlayerQueued = forcedInjuredPlayer
    ? queuedOutIds.has(forcedInjuredPlayer.id)
    : true;

  const handleClickStarter = (starter: Player) => {
    soundEngine.playClick();

    // Clicking an already-queued starter removes that pair so the user can change their mind
    if (queuedOutIds.has(starter.id)) {
      setQueuedSubs((prev) => prev.filter((s) => s.outPlayer.id !== starter.id));
      if (forcedInjuredPlayer?.id === starter.id) {
        setPendingStarter(starter);
      }
      return;
    }

    if (pendingStarter?.id === starter.id) {
      setPendingStarter(null);
      return;
    }

    if (slotsLeftToQueue <= 0) return;

    // If a reserve is already waiting, pair them immediately!
    if (pendingReserve) {
      setQueuedSubs((prev) => [
        ...prev,
        { outPlayer: starter, inPlayer: pendingReserve },
      ]);
      setPendingStarter(null);
      setPendingReserve(null);
    } else {
      setPendingStarter(starter);
    }
  };

  const handleClickReserve = (reserve: Player) => {
    soundEngine.playClick();

    // Clicking an already-queued reserve removes that pair
    if (queuedInIds.has(reserve.id)) {
      const removedPair = queuedSubs.find((s) => s.inPlayer.id === reserve.id);
      setQueuedSubs((prev) => prev.filter((s) => s.inPlayer.id !== reserve.id));
      if (removedPair && forcedInjuredPlayer?.id === removedPair.outPlayer.id) {
        setPendingStarter(removedPair.outPlayer);
      }
      return;
    }

    if (pendingReserve?.id === reserve.id) {
      setPendingReserve(null);
      return;
    }

    if (slotsLeftToQueue <= 0) return;

    // If a starter is already waiting, pair them immediately!
    if (pendingStarter) {
      setQueuedSubs((prev) => [
        ...prev,
        { outPlayer: pendingStarter, inPlayer: reserve },
      ]);
      setPendingStarter(null);
      setPendingReserve(null);
    } else {
      setPendingReserve(reserve);
    }
  };

  const handleRemoveQueuedPair = (outPlayerId: string) => {
    soundEngine.playClick();
    const removed = queuedSubs.find((s) => s.outPlayer.id === outPlayerId);
    setQueuedSubs((prev) => prev.filter((s) => s.outPlayer.id !== outPlayerId));
    if (removed && forcedInjuredPlayer?.id === removed.outPlayer.id) {
      setPendingStarter(removed.outPlayer);
    }
  };

  const handleAutoSuggestTiredSubs = () => {
    soundEngine.playClick();
    const nextQueue = [...queuedSubs];
    const usedOut = new Set(nextQueue.map((s) => s.outPlayer.id));
    const usedIn = new Set(nextQueue.map((s) => s.inPlayer.id));

    const maxToFill = Math.min(subsRemaining, availableReserves.length);
    if (nextQueue.length >= maxToFill) return;

    const pickBestReserveFor = (outP: Player): Player | undefined => {
      const freeReserves = availableReserves.filter((r) => !usedIn.has(r.id));
      if (freeReserves.length === 0) return undefined;
      if (outP.position === 'GK') {
        return (
          freeReserves
            .filter((r) => r.position === 'GK')
            .sort((a, b) => b.overall - a.overall)[0] || freeReserves[0]
        );
      }
      const sameDetailed = freeReserves
        .filter((r) => r.detailedRole === outP.detailedRole)
        .sort((a, b) => b.overall - a.overall)[0];
      if (sameDetailed) return sameDetailed;

      const sameSector = freeReserves
        .filter((r) => r.position === outP.position && r.position !== 'GK')
        .sort((a, b) => b.overall - a.overall)[0];
      if (sameSector) return sameSector;

      return (
        freeReserves
          .filter((r) => r.position !== 'GK')
          .sort((a, b) => b.overall - a.overall)[0] || freeReserves[0]
      );
    };

    // 1. Prioritize injured starter if not yet queued
    if (forcedInjuredPlayer && !usedOut.has(forcedInjuredPlayer.id) && nextQueue.length < maxToFill) {
      const bestIn = pickBestReserveFor(forcedInjuredPlayer);
      if (bestIn) {
        nextQueue.push({ outPlayer: forcedInjuredPlayer, inPlayer: bestIn });
        usedOut.add(forcedInjuredPlayer.id);
        usedIn.add(bestIn.id);
      }
    }

    // 2. Fill remaining slots with most fatigued outfield starters
    const tiredStarters = eligibleStarters
      .filter((s) => !usedOut.has(s.id) && s.position !== 'GK')
      .sort((a, b) => a.condition - b.condition);

    for (const st of tiredStarters) {
      if (nextQueue.length >= maxToFill) break;
      const bestIn = pickBestReserveFor(st);
      if (!bestIn) break;
      nextQueue.push({ outPlayer: st, inPlayer: bestIn });
      usedOut.add(st.id);
      usedIn.add(bestIn.id);
    }

    setQueuedSubs(nextQueue);
    setPendingStarter(null);
    setPendingReserve(null);
  };

  const handleClearQueue = () => {
    soundEngine.playClick();
    setQueuedSubs([]);
    setPendingStarter(forcedInjuredPlayer || null);
    setPendingReserve(null);
  };

  const handleConfirmAll = () => {
    if (queuedSubs.length === 0 || !isInjuredPlayerQueued) return;
    soundEngine.playClick();
    onConfirmSubs(queuedSubs, Boolean(forcedInjuredPlayer));
    onClose();
  };

  const getRoleColorText = (role: string) => {
    switch (role) {
      case 'GOL':
        return 'text-amber-300';
      case 'ZAG':
        return 'text-blue-300';
      case 'LAT':
        return 'text-cyan-300';
      case 'VOL':
        return 'text-emerald-300';
      case 'MEI':
        return 'text-sky-300';
      case 'ATA':
        return 'text-rose-300';
      default:
        return 'text-slate-300';
    }
  };

  const getConditionColor = (cond: number) => {
    if (cond >= 85) return 'text-emerald-400';
    if (cond >= 70) return 'text-amber-400';
    return 'text-rose-400 font-bold';
  };

  const totalUsedAfterConfirm = maxSubs - subsRemaining + queuedSubs.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl my-auto flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-black px-5 sm:px-6 py-3.5 border-b border-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                forcedInjuredPlayer
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
              }`}
            >
              {forcedInjuredPlayer ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ArrowLeftRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex flex-wrap items-center gap-2 tabular-nums">
                <span>
                  {forcedInjuredPlayer
                    ? 'Jogo Parado · Substituição por Lesão'
                    : 'Painel de Substituições Múltiplas'}
                </span>
                <span className="text-xs text-sky-400 font-mono font-bold">
                  · {currentMinute}&apos;
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Monte de 1 até {subsRemaining}{' '}
                {subsRemaining === 1 ? 'substituição' : 'substituições'} de uma só vez clicando em quem sai e em quem entra.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {availableReserves.length > 0 && slotsLeftToQueue > 0 && (
              <button
                type="button"
                onClick={handleAutoSuggestTiredSubs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 transition-colors cursor-pointer whitespace-nowrap tabular-nums"
                title="Preenche automaticamente as trocas restantes tirando os titulares mais desgastados"
              >
                <Wand2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Sugerir até {subsRemaining} Trocas</span>
              </button>
            )}

            <div className="flex flex-col items-end tabular-nums">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: maxSubs }).map((_, i) => {
                  const alreadyUsed = i < maxSubs - subsRemaining;
                  const queuedNow = !alreadyUsed && i < totalUsedAfterConfirm;
                  return (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        alreadyUsed
                          ? 'bg-slate-700'
                          : queuedNow
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-[11px] font-semibold text-slate-400 mt-1">
                {slotsLeftToQueue} de {subsRemaining} vagas livres
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Voltar para visão do gramado"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Emergency Injury Alert Banner when a starter got hurt in-match */}
        {forcedInjuredPlayer && (
          <div className="bg-rose-950/35 border-b border-rose-500/30 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5 text-xs">
              <div className="font-bold text-rose-200">
                Atendimento Médico Obrigatório: {forcedInjuredPlayer.name} (#
                {forcedInjuredPlayer.squadNumber} · {forcedInjuredPlayer.detailedRole}) não tem condições de seguir na partida!
              </div>
              <div className="text-rose-300/90 tabular-nums">
                Diagnóstico preliminar:{' '}
                <span className="font-semibold text-white">
                  {forcedInjuredPlayer.injuryDetails?.injuryType || 'Lesão Muscular'}
                </span>{' '}
                · Gravidade {forcedInjuredPlayer.injuryDetails?.severity || 'Moderada'} ·{' '}
                {forcedInjuredPlayer.injuryDetails?.initialDays || 10} dias de recuperação.
                {subsRemaining > 1
                  ? ` Você também pode aproveitar a parada para fazer até ${subsRemaining} alterações juntas.`
                  : ''}
              </div>
            </div>

            {onRemoveInjuredWithoutSub && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onRemoveInjuredWithoutSub(forcedInjuredPlayer);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 border border-rose-500/40 text-rose-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Retirar de Maca (Jogar c/ -1)
              </button>
            )}
          </div>
        )}

        {/* Queued Batch Substitutions Strip (1 to 5 simultaneous subs) */}
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-5 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-200 tabular-nums">
              Mudanças Preparadas para Entrar Agora ({queuedSubs.length}/{subsRemaining})
            </span>
            {queuedSubs.length > 0 && (
              <button
                type="button"
                onClick={handleClearQueue}
                className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Lista</span>
              </button>
            )}
          </div>

          {queuedSubs.length === 0 ? (
            <p className="text-xs text-slate-400">
              {pendingStarter
                ? `Titular selecionado para sair: ${pendingStarter.name} (#${pendingStarter.squadNumber}). Clique agora no reserva à direita para formar o par!`
                : pendingReserve
                ? `Reserva selecionado para entrar: ${pendingReserve.name} (#${pendingReserve.squadNumber}). Clique agora no titular à esquerda que dará lugar a ele!`
                : 'Nenhuma mudança na fila ainda. Clique em um titular à esquerda e em um reserva à direita — você pode montar até todas as 5 trocas antes de confirmar.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {queuedSubs.map((pair, idx) => {
                const isInjurySub = forcedInjuredPlayer?.id === pair.outPlayer.id;
                return (
                  <div
                    key={`${pair.outPlayer.id}_${pair.inPlayer.id}`}
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs tabular-nums ${
                      isInjurySub
                        ? 'bg-rose-950/30 border-rose-500/40'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-slate-400">
                        {idx + 1}ª Mudança{isInjurySub ? ' · Por Lesão' : ''}
                      </div>
                      <div className="truncate font-semibold mt-0.5">
                        <span className="text-rose-300">{pair.outPlayer.name}</span>
                        <span className="text-slate-500 mx-1.5">➔</span>
                        <span className="text-emerald-300">{pair.inPlayer.name}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQueuedPair(pair.outPlayer.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
                      title="Remover esta substituição da fila"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Columns: Starters (Left) vs Reserves (Right) */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Titulares (Sai de campo) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider tabular-nums">
                <UserMinus className="w-4 h-4" />
                <span>1. Quem SAI de campo ({eligibleStarters.length})</span>
              </div>
              {pendingStarter && (
                <span className="text-xs text-rose-300 font-semibold truncate max-w-[180px]">
                  Saindo: {pendingStarter.name}
                </span>
              )}
            </div>

            <div className="space-y-2 pr-1">
              {eligibleStarters.map((player) => {
                const isPending = pendingStarter?.id === player.id;
                const queuedIndex = queuedSubs.findIndex((s) => s.outPlayer.id === player.id);
                const isQueued = queuedIndex >= 0;
                const isForcedInjured =
                  forcedInjuredPlayer?.id === player.id ||
                  player.injuryWeeks > 0 ||
                  Boolean(player.injuryDetails);
                const hasYellow = yellowCardPlayerIds.has(player.id);
                const hasGoal = goalScorerPlayerIds.has(player.id);

                return (
                  <div
                    key={player.id}
                    onClick={() => handleClickStarter(player)}
                    className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isQueued
                        ? 'bg-rose-950/25 border-rose-500/40 opacity-85'
                        : isPending
                        ? 'bg-rose-950/50 border-rose-500 ring-1 ring-rose-500'
                        : isForcedInjured
                        ? 'bg-rose-950/35 border-rose-500/60 hover:bg-rose-950/50'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-black text-xs border-2 shadow-sm tabular-nums"
                        style={{
                          backgroundColor: userClubColors.primary,
                          color: userClubColors.text,
                          borderColor: userClubColors.secondary || '#ffffff',
                          background: `radial-gradient(circle at 35% 35%, ${userClubColors.primary}, #000000 90%)`,
                        }}
                      >
                        {player.squadNumber}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate">
                            {player.name}
                          </span>
                          {captainId === player.id && (
                            <span
                              className="text-[10px] font-black text-amber-300 font-mono"
                              title="Capitão em campo"
                            >
                              ©
                            </span>
                          )}
                          {isForcedInjured && <span title="Jogador machucado">🚑</span>}
                          {hasGoal && <span title="Marcou gol">⚽</span>}
                          {hasYellow && <span title="Cartão Amarelo">🟨</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                          <span className={`font-bold ${getRoleColorText(player.detailedRole)}`}>
                            {player.detailedRole}
                          </span>
                          <span> · OVR {player.overall}</span>
                          {liveRatingsMap?.get(player.id) && (
                            <span className="text-sky-300 font-mono font-semibold">
                              {' '}
                              · Nota {liveRatingsMap.get(player.id)!.rating.toFixed(1)}
                            </span>
                          )}
                          {isForcedInjured && (
                            <span className="text-rose-300 font-semibold">
                              {' '}
                              · Lesionado (Precisa sair)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 tabular-nums">
                      <span className={`text-xs font-bold ${getConditionColor(player.condition)}`}>
                        {player.condition}% Cond.
                      </span>
                      {isQueued ? (
                        <span className="text-[11px] text-rose-300 font-bold mt-0.5">
                          {queuedIndex + 1}ª Troca (Sai)
                        </span>
                      ) : isPending ? (
                        <span className="text-[11px] text-rose-400 font-bold mt-0.5">
                          Escolha o reserva ➔
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 mt-0.5">
                          {slotsLeftToQueue > 0 ? 'Clique p/ sair' : 'Limite atingido'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Reservas (Entra em campo) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider tabular-nums">
                <UserPlus className="w-4 h-4" />
                <span>2. Quem ENTRA em campo ({availableReserves.length})</span>
              </div>
              {pendingReserve && (
                <span className="text-xs text-emerald-300 font-semibold truncate max-w-[180px]">
                  Entrando: {pendingReserve.name}
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-[44vh] overflow-y-auto pr-1">
              {availableReserves.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500 text-xs">
                  Nenhum reserva saudável disponível no banco.
                </div>
              ) : (
                availableReserves.map((player) => {
                  const isPending = pendingReserve?.id === player.id;
                  const queuedIndex = queuedSubs.findIndex((s) => s.inPlayer.id === player.id);
                  const isQueued = queuedIndex >= 0;
                  const isSameRole =
                    pendingStarter && pendingStarter.detailedRole === player.detailedRole;

                  return (
                    <div
                      key={player.id}
                      onClick={() => handleClickReserve(player)}
                      className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        isQueued
                          ? 'bg-emerald-950/25 border-emerald-500/40 opacity-85'
                          : isPending
                          ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500'
                          : isSameRole
                          ? 'bg-slate-900 border-sky-500/50 hover:bg-slate-800/80'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-black text-xs border-2 shadow-sm tabular-nums"
                          style={{
                            backgroundColor: userClubColors.primary,
                            color: userClubColors.text,
                            borderColor: userClubColors.secondary || '#ffffff',
                            background: `radial-gradient(circle at 35% 35%, ${userClubColors.primary}, #000000 90%)`,
                          }}
                        >
                          {player.squadNumber}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white truncate">
                              {player.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                            <span className={`font-bold ${getRoleColorText(player.detailedRole)}`}>
                              {player.detailedRole}
                            </span>
                            <span> · OVR {player.overall}</span>
                            {isSameRole && (
                              <span className="text-sky-300 font-semibold">
                                {' '}
                                · Mesma posição
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 tabular-nums">
                        <span className={`text-xs font-bold ${getConditionColor(player.condition)}`}>
                          {player.condition}% Cond.
                        </span>
                        {isQueued ? (
                          <span className="text-[11px] text-emerald-300 font-bold mt-0.5">
                            {queuedIndex + 1}ª Troca (Entra)
                          </span>
                        ) : isPending ? (
                          <span className="text-[11px] text-emerald-400 font-bold mt-0.5">
                            Escolha quem sai
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            {slotsLeftToQueue > 0 ? 'Clique p/ entrar' : 'Limite atingido'}
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

        {/* Footer Confirmation Bar */}
        <div className="shrink-0 bg-black px-5 sm:px-6 py-4 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs">
            {!isInjuredPlayerQueued && forcedInjuredPlayer ? (
              <span className="text-rose-300 font-semibold">
                Selecione um reserva para entrar no lugar de {forcedInjuredPlayer.name} (lesionado).
              </span>
            ) : queuedSubs.length > 0 ? (
              <span className="text-emerald-300 font-semibold tabular-nums">
                {queuedSubs.length}{' '}
                {queuedSubs.length === 1
                  ? 'substituição pronta para entrar em campo.'
                  : 'substituições prontas para entrar em campo de uma só vez!'}
              </span>
            ) : (
              <span className="text-slate-400">
                Selecione até {subsRemaining} pares (Titular + Reserva) para substituir de uma vez.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
            >
              {forcedInjuredPlayer ? 'Ver Gramado' : 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={handleConfirmAll}
              disabled={queuedSubs.length === 0 || !isInjuredPlayerQueued}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-2 transition-colors tabular-nums"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {queuedSubs.length > 1
                  ? forcedInjuredPlayer
                    ? `Confirmar ${queuedSubs.length} Mudanças e Retomar`
                    : `Confirmar ${queuedSubs.length} Substituições`
                  : forcedInjuredPlayer
                  ? 'Confirmar Mudança e Retomar Jogo'
                  : 'Confirmar Substituição'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

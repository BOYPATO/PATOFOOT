import React from 'react';
import { Club, Player } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { ArrowLeftRight, Users, CheckCircle2, Clock } from 'lucide-react';

interface MatchBenchBarProps {
  userClub: Club;
  subsRemaining: number;
  maxSubs: number;
  maxBench?: number;
  subbedOutIds: Set<string>;
  yellowCardPlayerIds?: Set<string>;
  minute?: number;
  onQuickSuggestSub?: (outPlayer: Player, inPlayer: Player) => void;
  onOpenSubModalWithReserve: (reserve: Player) => void;
  onOpenGeneralSubModal: () => void;
}

export const MatchBenchBar: React.FC<MatchBenchBarProps> = ({
  userClub,
  subsRemaining,
  maxSubs,
  maxBench = 11,
  subbedOutIds,
  yellowCardPlayerIds,
  minute = 0,
  onQuickSuggestSub,
  onOpenSubModalWithReserve,
  onOpenGeneralSubModal,
}) => {
  const designatedBench = userClub.squad.filter(
    (p) =>
      !p.isStarter &&
      ((p.isSubstitute && p.injuryWeeks === 0 && !p.injuryDetails) ||
        subbedOutIds.has(p.id))
  );
  const designatedIds = new Set(designatedBench.map((p) => p.id));
  const extraBench =
    designatedBench.length < maxBench
      ? userClub.squad
          .filter(
            (p) =>
              !p.isStarter &&
              !designatedIds.has(p.id) &&
              p.injuryWeeks === 0 &&
              !p.injuryDetails
          )
          .slice(0, maxBench - designatedBench.length)
      : [];
  const benchPlayers =
    designatedBench.length > 0
      ? [...designatedBench, ...extraBench].slice(0, maxBench)
      : userClub.squad
          .filter((p) => !p.isStarter && p.injuryWeeks === 0 && !p.injuryDetails)
          .slice(0, maxBench);

  // Detect tired (<62% est. condition) or yellow-carded starters for smart 1-click sub alert
  const startersOutfield = userClub.squad.filter(
    (p) => p.isStarter && p.position !== 'GK' && !subbedOutIds.has(p.id)
  );
  const availableHealthyBench = benchPlayers.filter(
    (p) => !subbedOutIds.has(p.id) && p.injuryWeeks === 0 && !p.injuryDetails && p.position !== 'GK'
  );
  const flaggedStarters = startersOutfield
    .map((p) => {
      const estCond = Math.max(30, p.condition - Math.round((minute / 90) * 14));
      const hasYellow = yellowCardPlayerIds?.has(p.id) ?? false;
      const reason = estCond < 62 ? `Físico ${estCond}%` : hasYellow ? 'Amarelado' : null;
      const priority = (estCond < 62 ? 100 - estCond : 0) + (hasYellow ? 24 : 0);
      return { player: p, estCond, hasYellow, reason, priority };
    })
    .filter((item) => item.reason !== null)
    .sort((a, b) => b.priority - a.priority);

  const topFlagged = flaggedStarters[0] || null;
  const bestReplacement =
    topFlagged && availableHealthyBench.length > 0
      ? [...availableHealthyBench].sort((a, b) => {
          const fitA =
            a.detailedRole === topFlagged.player.detailedRole
              ? 20
              : a.position === topFlagged.player.position
              ? 12
              : 0;
          const fitB =
            b.detailedRole === topFlagged.player.detailedRole
              ? 20
              : b.position === topFlagged.player.position
              ? 12
              : 0;
          return fitB + b.overall * 0.8 + b.condition * 0.15 - (fitA + a.overall * 0.8 + a.condition * 0.15);
        })[0]
      : null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'GOL': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ZAG': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'LAT': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'VOL': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'MEI': return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'ATA': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getConditionColor = (cond: number) => {
    if (cond >= 85) return 'text-emerald-400';
    if (cond >= 70) return 'text-amber-400';
    return 'text-rose-400 font-bold';
  };

  const subsUsed = maxSubs - subsRemaining;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl space-y-3">
      {/* Bench Header & Subs Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm text-white tracking-wide flex items-center gap-2">
              <span>Banco de Reservas</span>
              <span className="text-sky-400 font-mono tabular-nums font-bold text-xs">
                ({benchPlayers.filter((p) => !subbedOutIds.has(p.id)).length}/{maxBench} disponíveis)
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Até {maxBench} relacionados ({11 + maxBench} inscritos) · Faça até {maxSubs} mudanças de uma só vez ou durante o jogo
            </p>
          </div>
        </div>

        {/* Counter and Action Button */}
        <div className="flex items-center gap-3">
          {/* Visual Pips */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 tabular-nums">
            <span className="text-[11px] font-bold text-slate-300">
              Mudanças: <strong className="text-sky-300">{subsUsed}</strong>/{maxSubs}
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: maxSubs }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i < subsUsed
                      ? 'bg-slate-700'
                      : 'bg-emerald-400 shadow-sm shadow-emerald-400/50 ring-1 ring-emerald-500/40'
                  }`}
                  title={i < subsUsed ? 'Substituição efetuada' : 'Disponível'}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenGeneralSubModal();
            }}
            disabled={subsRemaining <= 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0 tabular-nums"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Fazer Mudanças ({subsRemaining})</span>
          </button>
        </div>
      </div>

      {/* Smart Bench Alert & 1-Click Substitution Suggestion */}
      {subsRemaining > 0 && topFlagged && bestReplacement && (
        <div className="px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/35 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-amber-300 shrink-0">
              Alerta em Campo ({flaggedStarters.length}):
            </span>
            <span className="text-slate-200 truncate">
              <strong className="text-white">{topFlagged.player.name}</strong> ({topFlagged.reason})
              {' '}➔{' '}
              <strong className="text-emerald-300">{bestReplacement.name}</strong> ({bestReplacement.detailedRole} · OVR {bestReplacement.overall})
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              if (onQuickSuggestSub) {
                onQuickSuggestSub(topFlagged.player, bestReplacement);
              } else {
                onOpenSubModalWithReserve(bestReplacement);
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <ArrowLeftRight className="w-3 h-3 shrink-0" />
            <span>Sugerir Troca</span>
          </button>
        </div>
      )}

      {/* Horizontal Scrollable Bench Players */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {benchPlayers.length === 0 ? (
          <div className="py-4 text-center text-slate-500 text-xs w-full">
            Nenhum reserva cadastrado no banco.
          </div>
        ) : (
          benchPlayers.map((player) => {
            const wasSubbedOut = subbedOutIds.has(player.id);

            return (
              <div
                key={player.id}
                className={`min-w-[190px] sm:min-w-[210px] p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 shrink-0 ${
                  wasSubbedOut
                    ? 'bg-slate-950/50 border-slate-900 opacity-50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Player Ball */}
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-black text-xs border-2 shadow-sm"
                    style={{
                      backgroundColor: userClub.colors.primary,
                      color: userClub.colors.text,
                      borderColor: userClub.colors.secondary || '#ffffff',
                      background: `radial-gradient(circle at 35% 35%, ${userClub.colors.primary}, #000000 90%)`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 1px 1px 2px rgba(255,255,255,0.4)',
                    }}
                  >
                    {player.squadNumber}
                  </div>

                  <div className="min-w-0">
                    <p className="font-black text-xs text-white truncate max-w-[95px]">
                      {player.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-bold border ${getRoleBadgeColor(
                          player.detailedRole
                        )}`}
                      >
                        {player.detailedRole}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        OVR {player.overall}
                      </span>
                      <span className={`text-[10px] font-bold ${getConditionColor(player.condition)}`}>
                        {player.condition}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub CTA */}
                <div>
                  {wasSubbedOut ? (
                    <span
                      className={`text-[9px] font-semibold px-2 py-1 bg-slate-950 rounded border ${
                        player.injuryWeeks > 0 || player.injuryDetails
                          ? 'text-rose-400 border-rose-500/30'
                          : 'text-slate-500 border-slate-900'
                      }`}
                    >
                      {player.injuryWeeks > 0 || player.injuryDetails ? 'Saiu Lesionado' : 'Substituído'}
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        onOpenSubModalWithReserve(player);
                      }}
                      disabled={subsRemaining <= 0}
                      className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 disabled:bg-slate-800 disabled:text-slate-600 font-black text-[10px] border border-sky-500/30 transition-all cursor-pointer flex items-center gap-1"
                      title="Colocar este jogador em campo"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>Entrar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

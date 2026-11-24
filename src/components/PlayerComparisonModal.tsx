import React, { useMemo, useState } from 'react';
import { Club, Player } from '../types/game';
import {
  compareTwoPlayers,
  pickBestReferencePlayerFromSquad,
} from '../utils/playerComparisonEngine';
import { formatPlayerNationalityFull } from '../utils/nationalityUtils';
import { getPlayerVersatilityProfile } from '../utils/tacticalPositioningEngine';
import { soundEngine } from '../services/soundEngine';
import {
  ArrowLeftRight,
  Bookmark,
  CheckCircle2,
  Scale,
  TrendingUp,
  X,
} from 'lucide-react';

interface PlayerComparisonModalProps {
  userClub: Club;
  targetPlayer: Player;
  targetClub?: Club | null;
  allSquadPool?: Player[];
  isWatchlisted?: boolean;
  onToggleWatchlist?: (playerId: string) => void;
  onNegotiateTarget?: (player: Player) => void;
  onClose: () => void;
}

export const PlayerComparisonModal: React.FC<PlayerComparisonModalProps> = ({
  userClub,
  targetPlayer,
  targetClub,
  isWatchlisted = false,
  onToggleWatchlist,
  onNegotiateTarget,
  onClose,
}) => {
  const defaultRef = useMemo(
    () => pickBestReferencePlayerFromSquad(userClub, targetPlayer) || userClub.squad[0],
    [userClub, targetPlayer]
  );

  const [selectedRefId, setSelectedRefId] = useState<string>(defaultRef?.id || '');

  const refPlayer = useMemo(
    () =>
      userClub.squad.find((p) => p.id === selectedRefId) ||
      defaultRef ||
      targetPlayer,
    [userClub.squad, selectedRefId, defaultRef, targetPlayer]
  );

  const report = useMemo(
    () => compareTwoPlayers(refPlayer, targetPlayer),
    [refPlayer, targetPlayer]
  );

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);

  const sortedUserSquad = useMemo(() => {
    return [...userClub.squad].sort((a, b) => {
      const aMatch = a.detailedRole === targetPlayer.detailedRole ? 0 : 1;
      const bMatch = b.detailedRole === targetPlayer.detailedRole ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return b.overall - a.overall;
    });
  }, [userClub.squad, targetPlayer.detailedRole]);

  const attrRows: {
    key: string;
    label: string;
    left: number;
    right: number;
  }[] = [
    {
      key: 'fin',
      label: refPlayer.position === 'GK' && targetPlayer.position === 'GK' ? 'Jogo c/ os Pés' : 'Finalização & Ataque',
      left: report.leftAttrs.finishing,
      right: report.rightAttrs.finishing,
    },
    {
      key: 'pas',
      label: 'Passe & Criação',
      left: report.leftAttrs.passing,
      right: report.rightAttrs.passing,
    },
    {
      key: 'def',
      label: refPlayer.position === 'GK' || targetPlayer.position === 'GK' ? 'Defesa / Reflexos' : 'Marcação & Desarme',
      left: report.leftAttrs.defending,
      right: report.rightAttrs.defending,
    },
    {
      key: 'phy',
      label: 'Velocidade & Físico',
      left: report.leftAttrs.physical,
      right: report.rightAttrs.physical,
    },
    {
      key: 'set',
      label: 'Bola Parada',
      left: report.leftAttrs.setPieces,
      right: report.rightAttrs.setPieces,
    },
    {
      key: 'ldr',
      label: 'Liderança & Decisão',
      left: report.leftAttrs.leadership,
      right: report.rightAttrs.leadership,
    },
  ];

  const isTargetInUserSquad = userClub.squad.some((p) => p.id === targetPlayer.id);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                Comparador Lado a Lado · Elenco vs. Alvo
              </h3>
              <p className="text-xs text-slate-400">
                Compare atributos, salário, valor de mercado, potencial e desempenho na temporada
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Two Player Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: User Club Reference Player */}
            <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                  Seu Elenco ({userClub.shortName})
                </span>
                <select
                  value={refPlayer.id}
                  onChange={(e) => {
                    soundEngine.playClick();
                    setSelectedRefId(e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-400 max-w-[200px]"
                >
                  {sortedUserSquad.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.squadNumber} {p.name} ({p.detailedRole} · OVR {p.overall})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <div className="text-base font-black text-white">{refPlayer.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    <span className="text-sky-300 font-semibold">
                      {getPlayerVersatilityProfile(refPlayer).allZeroPenaltyCodes.join(' · ')}
                    </span>{' '}
                    · {refPlayer.age} anos ·{' '}
                    {formatPlayerNationalityFull(refPlayer, userClub.country || 'Brasil')}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-2xl font-black text-sky-300 leading-none">
                    {refPlayer.overall}
                  </div>
                  <div className="text-[10px] text-amber-400 font-bold mt-1">
                    POT {refPlayer.potential || refPlayer.overall + 2}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono tabular-nums">
                <div className="bg-slate-950/70 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Jogos</div>
                  <div className="text-xs font-bold text-white">{refPlayer.matches}</div>
                </div>
                <div className="bg-slate-950/70 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Gols / Ass</div>
                  <div className="text-xs font-bold text-emerald-300">
                    {refPlayer.goals}G · {refPlayer.assists}A
                  </div>
                </div>
                <div className="bg-slate-950/70 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Nota</div>
                  <div className="text-xs font-bold text-amber-300">
                    {(refPlayer.ratingAverage || 6.5).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Target Player */}
            <div className="bg-slate-900/75 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  {isTargetInUserSquad
                    ? `Comparado no ${userClub.shortName}`
                    : targetClub
                    ? `Alvo (${targetClub.shortName})`
                    : 'Alvo (Sem Clube / Livre)'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  Pé: {targetPlayer.preferredFoot}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <div className="text-base font-black text-white">{targetPlayer.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    <span className="text-emerald-300 font-semibold">
                      {getPlayerVersatilityProfile(targetPlayer).allZeroPenaltyCodes.join(' · ')}
                    </span>{' '}
                    · {targetPlayer.age} anos ·{' '}
                    {formatPlayerNationalityFull(
                      targetPlayer,
                      targetClub?.country || 'Brasil'
                    )}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-2xl font-black text-emerald-300 leading-none">
                      {targetPlayer.overall}
                    </span>
                    {report.overallDelta !== 0 && (
                      <span
                        className={`text-xs font-black ${
                          report.overallDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        ({report.overallDelta > 0 ? `+${report.overallDelta}` : report.overallDelta})
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-400 font-bold mt-1">
                    POT {targetPlayer.potential || targetPlayer.overall + 2}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono tabular-nums">
                <div className="bg-slate-950/70 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Jogos</div>
                  <div className="text-xs font-bold text-white">{targetPlayer.matches}</div>
                </div>
                <div className="bg-slate-950/70 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Gols / Ass</div>
                  <div className="text-xs font-bold text-emerald-300">
                    {targetPlayer.goals}G · {targetPlayer.assists}A
                  </div>
                </div>
                <div className="bg-slate-950/70 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Nota</div>
                  <div className="text-xs font-bold text-amber-300">
                    {(targetPlayer.ratingAverage || 6.5).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attribute Bars Comparison */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
              <span className="font-bold text-sky-300">{refPlayer.name}</span>
              <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-bold text-slate-300">
                <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                Atributos Técnicos & Táticos
              </span>
              <span className="font-bold text-emerald-300">{targetPlayer.name}</span>
            </div>

            {attrRows.map((row) => {
              const diff = row.right - row.left;
              return (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span
                      className={`font-bold ${
                        row.left >= row.right ? 'text-sky-300' : 'text-slate-400'
                      }`}
                    >
                      {row.left}
                    </span>
                    <span className="font-sans text-[11px] font-semibold text-slate-300">
                      {row.label}{' '}
                      {diff !== 0 && (
                        <span
                          className={`font-mono ${
                            diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          ({diff > 0 ? `+${diff}` : diff})
                        </span>
                      )}
                    </span>
                    <span
                      className={`font-bold ${
                        row.right >= row.left ? 'text-emerald-300' : 'text-slate-400'
                      }`}
                    >
                      {row.right}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex justify-end border border-slate-800/80">
                      <div
                        className="h-full bg-sky-400 rounded-full"
                        style={{ width: `${row.left}%` }}
                      />
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${row.right}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Financial & Contract Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono tabular-nums text-xs">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
              <div className="font-sans text-[11px] text-slate-400">Salário Mensal</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-sky-300 font-bold">{formatMoney(refPlayer.wage)}</span>
                <span className="text-slate-600">vs</span>
                <span className="text-emerald-300 font-bold">{formatMoney(targetPlayer.wage)}</span>
              </div>
              <div
                className={`font-sans text-[11px] mt-1 ${
                  report.wageDelta <= 0 ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {report.wageDelta === 0
                  ? 'Mesmo patamar salarial'
                  : report.wageDelta < 0
                  ? `Economia de ${formatMoney(Math.abs(report.wageDelta))}/mês`
                  : `+${formatMoney(report.wageDelta)}/mês na folha`}
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
              <div className="font-sans text-[11px] text-slate-400">Valor de Mercado</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-sky-300 font-bold">
                  {formatMoney(refPlayer.marketValue)}
                </span>
                <span className="text-slate-600">vs</span>
                <span className="text-emerald-300 font-bold">
                  {formatMoney(targetPlayer.marketValue)}
                </span>
              </div>
              <div className="font-sans text-[11px] text-slate-400 mt-1">
                Contrato do alvo: {targetPlayer.contractYears} ano(s)
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
              <div className="font-sans text-[11px] text-slate-400">Condição & Especialidade</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-sky-300 font-bold">{refPlayer.condition}%</span>
                <span className="text-slate-600">vs</span>
                <span className="text-emerald-300 font-bold">{targetPlayer.condition}%</span>
              </div>
              <div className="font-sans text-[11px] text-slate-300 mt-1 truncate">
                {targetPlayer.specialSkill || 'Atleta Polivalente'}
              </div>
            </div>
          </div>

          {/* Executive Verdict Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3 max-w-xl">
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-black text-white">{report.verdictHeadline}</div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {report.verdictDetail}
                </p>
              </div>
            </div>

            {!isTargetInUserSquad && (
              <div className="flex items-center gap-2 shrink-0">
                {onToggleWatchlist && (
                  <button
                    type="button"
                    onClick={() => onToggleWatchlist(targetPlayer.id)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isWatchlisted
                        ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                        : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-amber-400/40'
                    }`}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-400 text-amber-400' : ''}`}
                    />
                    <span>{isWatchlisted ? 'Na Lista' : 'Observar'}</span>
                  </button>
                )}

                {onNegotiateTarget && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNegotiateTarget(targetPlayer);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Negociar Alvo</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

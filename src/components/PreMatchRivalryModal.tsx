import React, { useState } from 'react';
import { Club, Fixture, PreMatchDerbyPosture } from '../types/game';
import { RivalryInfo } from '../utils/rivalryEngine';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { formatCalendarDate } from '../utils/calendarUtils';
import { soundEngine } from '../services/soundEngine';
import { Flame, ShieldAlert, Award, Play, Sliders, X, Zap } from 'lucide-react';

interface PreMatchRivalryModalProps {
  userClub: Club;
  opponentClub: Club;
  fixture: Fixture;
  rivalry: RivalryInfo;
  onConfirmKickoff: (posture: PreMatchDerbyPosture) => void;
  onInstantKickoff?: (posture: PreMatchDerbyPosture) => void;
  onAdjustLineupFirst: () => void;
  onClose: () => void;
}

export const PreMatchRivalryModal: React.FC<PreMatchRivalryModalProps> = ({
  userClub,
  opponentClub,
  fixture,
  rivalry,
  onConfirmKickoff,
  onInstantKickoff,
  onAdjustLineupFirst,
  onClose,
}) => {
  const [selectedPosture, setSelectedPosture] = useState<PreMatchDerbyPosture>('PADRAO');

  const isUserHome = fixture.homeTeamId === userClub.id;
  const homeClub = isUserHome ? userClub : opponentClub;
  const awayClub = isUserHome ? opponentClub : userClub;
  const compMeta = COMPETITIONS_CATALOG[fixture.competition] || COMPETITIONS_CATALOG.serie_a;

  const postures: Array<{
    id: PreMatchDerbyPosture;
    title: string;
    effect: string;
  }> = [
    {
      id: 'PADRAO',
      title: 'Equilíbrio Tático',
      effect: 'Mantém o plano de jogo padrão definido na prancheta.',
    },
    {
      id: 'SANGUE_FRIO',
      title: 'Sangue Frio & Controle',
      effect: 'Neutraliza parte da pressão inicial do rival e reduz faltas/cartões.',
    },
    {
      id: 'CLIMA_DE_GUERRA',
      title: 'Clima de Decisão',
      effect: 'Aumenta o volume ofensivo do seu time no clássico, com divididas mais fortes.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-amber-500/40 rounded-2xl w-full max-w-2xl shadow-2xl p-6 sm:p-7 my-auto flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                Alerta Especial de Clássico · {rivalry.derbyName}
              </h3>
              <p className="text-xs text-slate-400 tabular-nums">
                {fixture.cupPhase || `${compMeta.shortName} · Rodada ${fixture.round}`} ·{' '}
                {fixture.date ? formatCalendarDate(fixture.date) : 'Data Oficial'} ·{' '}
                {homeClub.stadium.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            title="Fechar alerta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rivalry Matchup Header */}
        <div className="py-5 border-b border-slate-800/80 text-center">
          <div className="flex items-center justify-center gap-5 sm:gap-8">
            <div className="flex flex-col items-center gap-2 w-32">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl border-2 border-white/20 shadow-xl"
                style={{
                  backgroundColor: homeClub.colors.primary,
                  color: homeClub.colors.text,
                }}
              >
                {homeClub.initials}
              </div>
              <div className="text-sm font-bold text-white truncate max-w-full">
                {homeClub.shortName}
              </div>
              <div className="text-[11px] text-slate-400">Mandante</div>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-amber-400">
                {rivalry.intensity === 'HISTORICO' ? 'Clássico Histórico' : 'Rivalidade Direta'}
              </span>
              <span className="text-2xl font-black text-slate-500 my-1">VS</span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                Lotação Máxima Esperada
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 w-32">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl border-2 border-white/20 shadow-xl"
                style={{
                  backgroundColor: awayClub.colors.primary,
                  color: awayClub.colors.text,
                }}
              >
                {awayClub.initials}
              </div>
              <div className="text-sm font-bold text-white truncate max-w-full">
                {awayClub.shortName}
              </div>
              <div className="text-[11px] text-slate-400">Visitante</div>
            </div>
          </div>

          <p className="mt-3 text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
            {rivalry.atmosphereSubtitle}. A cidade inteira respira este confronto e o adversário entrará em campo com intensidade máxima!
          </p>
        </div>

        {/* Difficulty & Victory Bonus Breakdown */}
        <div className="py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-800/80 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Dificuldade: {rivalry.difficultyLabel}</span>
            </div>
            <p className="text-slate-300 leading-relaxed tabular-nums">
              O {opponentClub.shortName} atua com motivação extra (+pressão ofensiva e precisão nas finalizações), além de divididas mais duras (+{Math.round((rivalry.foulRateMultiplier - 1) * 100)}% faltas).
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Award className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Bônus Especial em Caso de Vitória</span>
            </div>
            <p className="text-slate-300 leading-relaxed tabular-nums">
              <strong>+{rivalry.reputationWinBonus} pts de Reputação</strong> na carreira ·{' '}
              <strong>+{rivalry.fanConfidenceExtra}% Torcida</strong> ·{' '}
              <strong>+{rivalry.boardConfidenceExtra}% Diretoria</strong> ·{' '}
              <strong>+{rivalry.fanSocioWinBonus} Novos Sócios</strong> e Moral Excelente!
            </p>
          </div>
        </div>

        {/* Pre-Match Derby Posture Selector */}
        <div className="py-4 space-y-2.5">
          <div className="text-xs font-semibold text-slate-300">
            Postura de Entrada para o Clássico
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {postures.map((p) => {
              const active = selectedPosture === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedPosture(p.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-sky-950/60 border-sky-400 text-white'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="text-xs font-bold text-white">{p.title}</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{p.effect}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onAdjustLineupFirst();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Revisar Tática / Escalação</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {onInstantKickoff && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playWhistle(true);
                  onInstantKickoff(selectedPosture);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Resultado Instantâneo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playWhistle(false);
                onConfirmKickoff(selectedPosture);
              }}
              className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-lg shadow-amber-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950 shrink-0" />
              <span>Ir para o Clássico</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

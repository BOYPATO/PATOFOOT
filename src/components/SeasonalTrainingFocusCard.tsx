import React from 'react';
import {
  Activity,
  Calendar,
  Check,
  Compass,
  Play,
  Target,
  Wrench,
} from 'lucide-react';
import { TrainingFocus } from '../types/game';
import {
  SeasonalTrainingFocusRecommendation,
  SeasonalTrainingPillar,
} from '../utils/trainingAdviceEngine';
import { soundEngine } from '../services/soundEngine';

interface SeasonalTrainingFocusCardProps {
  recommendation: SeasonalTrainingFocusRecommendation;
  currentTeamFocus: TrainingFocus;
  onSelectFocus: (focus: TrainingFocus, runSessionNow?: boolean) => void;
}

const PILLAR_ICONS: Record<SeasonalTrainingPillar, React.ReactNode> = {
  FISICO: <Activity className="w-4 h-4 text-emerald-400 shrink-0" />,
  TATICO: <Compass className="w-4 h-4 text-sky-400 shrink-0" />,
  TECNICO: <Wrench className="w-4 h-4 text-amber-400 shrink-0" />,
};

export const SeasonalTrainingFocusCard: React.FC<SeasonalTrainingFocusCardProps> = ({
  recommendation,
  currentTeamFocus,
  onSelectFocus,
}) => {
  const isRecommendedActive =
    currentTeamFocus === recommendation.recommendedTrainingFocus;

  const fatigueColorClass =
    recommendation.fatigueLevel === 'ALTA'
      ? 'text-rose-400'
      : recommendation.fatigueLevel === 'MODERADA'
      ? 'text-amber-300'
      : 'text-emerald-400';

  const nextMatchValue =
    recommendation.daysUntilNextMatch === null
      ? 'Sem agenda'
      : recommendation.daysUntilNextMatch === 0
      ? 'Hoje'
      : recommendation.daysUntilNextMatch === 1
      ? 'Amanhã (1d)'
      : `Em ${recommendation.daysUntilNextMatch} dias`;

  return (
    <section
      aria-label="Sugestão de Foco de Treino para o Momento da Temporada"
      className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* Header */}
      <div className="p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
              <Target className="w-3.5 h-3.5 shrink-0" />
              <span>Foco de Treino Ideal · {recommendation.recommendedPillarLabel}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{recommendation.seasonPhaseLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{recommendation.scheduleDensityLabel}</span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
            {recommendation.headline}
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed">
            {recommendation.rationale}
          </p>
        </div>

        {/* Primary & Secondary Action */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isRecommendedActive}
            onClick={() => {
              soundEngine.playClick();
              onSelectFocus(recommendation.recommendedTrainingFocus, false);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              isRecommendedActive
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
            }`}
          >
            {isRecommendedActive ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Foco {recommendation.recommendedPillarLabel} Ativo</span>
              </>
            ) : (
              <span>Aplicar Foco {recommendation.recommendedPillarLabel}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onSelectFocus(recommendation.recommendedTrainingFocus, true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title={`Define o foco coletivo para ${recommendation.recommendedTrainingFocusLabel} e executa uma sessão agora`}
          >
            <Play className="w-3 h-3 fill-current shrink-0" />
            <span>Aplicar + Treinar</span>
          </button>
        </div>
      </div>

      {/* Telemetry Strip: Fatigue & Calendar Signals */}
      <div className="border-y border-slate-800 bg-slate-900/35 grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 tabular-nums">
        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400">Fadiga Média do Elenco</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-xl font-black font-mono ${fatigueColorClass}`}>
              {recommendation.avgSquadFatigue}%
            </span>
            <span className="text-xs text-slate-400">
              Titulares: <strong className="text-slate-200 font-mono">{recommendation.startersAvgFatigue}%</strong>
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {recommendation.fatigueLevelLabel} · {recommendation.tiredStartersCount} titular(es) cansado(s)
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Próximo Compromisso</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black font-mono text-white">{nextMatchValue}</span>
            {recommendation.nextMatchDateLabel && (
              <span className="text-xs font-mono text-slate-400">
                ({recommendation.nextMatchDateLabel})
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            {recommendation.nextMatchCompetitionLabel
              ? `${recommendation.nextMatchCompetitionLabel}${
                  recommendation.isNextMatchDecisive ? ' · Jogo decisivo' : ''
                }`
              : 'Calendário aberto para treinos'}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400">Densidade do Calendário</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black font-mono text-white">
              {recommendation.matchesNext14Days}
            </span>
            <span className="text-xs text-slate-400">jogo(s) em 14 dias</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {recommendation.matchesNext7Days} nos próx. 7d · {recommendation.matchesLast7Days} nos últimos 7d
          </div>
        </div>

        <div className="p-4">
          <div className="text-[11px] font-semibold text-slate-400">Foco Recomendado no CT</div>
          <div className="mt-1 text-base font-bold text-emerald-300 leading-tight">
            {recommendation.recommendedPillarLabel} · {recommendation.recommendedTrainingFocusLabel}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Temporada: {recommendation.seasonProgressPct}% concluída
            {recommendation.injuredCount > 0 ? ` · ${recommendation.injuredCount} no DM` : ''}
          </div>
        </div>
      </div>

      {/* 3-Pillar Comparison: Físico · Tático · Técnico */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {recommendation.pillars.map((item) => {
          const isThisFocusActive = currentTeamFocus === item.mappedFocus;
          return (
            <div
              key={item.pillar}
              className={`p-4 sm:p-5 flex flex-col justify-between gap-3 transition-colors ${
                item.isRecommended ? 'bg-emerald-950/15' : ''
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
                    {PILLAR_ICONS[item.pillar]}
                    <span>{item.label}</span>
                  </span>
                  {item.isRecommended ? (
                    <span className="text-[11px] font-bold text-emerald-400">
                      Recomendado
                    </span>
                  ) : isThisFocusActive ? (
                    <span className="text-[11px] font-semibold text-sky-400">
                      Em uso
                    </span>
                  ) : null}
                </div>

                <div className="text-xs font-semibold text-sky-300">
                  CT: {item.mappedFocusLabel}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{item.summary}</p>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 leading-snug">
                  {item.effectNote}
                </span>
                <button
                  type="button"
                  disabled={isThisFocusActive}
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectFocus(item.mappedFocus, false);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isThisFocusActive
                      ? 'text-emerald-400 cursor-default inline-flex items-center gap-1'
                      : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer'
                  }`}
                >
                  {isThisFocusActive ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Ativo</span>
                    </>
                  ) : (
                    <span>Selecionar</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

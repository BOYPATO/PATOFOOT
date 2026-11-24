import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Compass,
  LayoutGrid,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Club,
  Fixture,
  FormationType,
  MarkingStyle,
  PassingStyle,
  TacticalMentality,
} from '../types/game';
import {
  buildAssistantTacticsAdvice,
  FormResultCode,
} from '../utils/assistantTacticsAdviceEngine';
import { soundEngine } from '../services/soundEngine';

interface AssistantTacticsAdviceCardProps {
  userClub: Club;
  opponentClub: Club | null;
  upcomingFixture: Fixture | null;
  allFixtures?: Fixture[];
  rivalryName?: string | null;
  onApplyFormation: (formation: FormationType) => void;
  onApplyPlayStyle: (passing: PassingStyle, mentality: TacticalMentality) => void;
  onApplyDefensivePosture: (marking: MarkingStyle, mentality: TacticalMentality) => void;
  onApplyFullPlan: (plan: {
    formation: FormationType;
    passing: PassingStyle;
    mentality: TacticalMentality;
    marking: MarkingStyle;
  }) => void;
}

function formatDelta(val: number): string {
  if (val > 0) return `+${val}`;
  return `${val}`;
}

function getFormColorClass(code: FormResultCode): string {
  if (code === 'V') return 'text-emerald-400';
  if (code === 'E') return 'text-amber-300';
  return 'text-rose-400';
}

export const AssistantTacticsAdviceCard: React.FC<AssistantTacticsAdviceCardProps> = ({
  userClub,
  opponentClub,
  upcomingFixture,
  allFixtures = [],
  rivalryName = null,
  onApplyFormation,
  onApplyPlayStyle,
  onApplyDefensivePosture,
  onApplyFullPlan,
}) => {
  const [showScoutingDetails, setShowScoutingDetails] = useState<boolean>(true);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const report = useMemo(
    () =>
      buildAssistantTacticsAdvice({
        userClub,
        opponentClub,
        upcomingFixture,
        allFixtures,
        rivalryName,
      }),
    [userClub, opponentClub, upcomingFixture, allFixtures, rivalryName]
  );

  const isFormationApplied =
    userClub.tactics.formation === report.recommendedFormation.formation;
  const isPlayStyleApplied =
    userClub.tactics.passing === report.recommendedPlayStyle.passing &&
    userClub.tactics.mentality === report.recommendedPlayStyle.mentality;
  const isDefensiveApplied =
    userClub.tactics.marking === report.recommendedDefensivePosture.marking &&
    userClub.tactics.mentality === report.recommendedDefensivePosture.mentality;
  const isFullPlanApplied =
    isFormationApplied && isPlayStyleApplied && isDefensiveApplied;

  const notifyApplied = (msg: string) => {
    setAppliedBanner(msg);
    setTimeout(() => {
      setAppliedBanner((prev) => (prev === msg ? null : prev));
    }, 3800);
  };

  const handleApplyAll = () => {
    soundEngine.playClick();
    onApplyFullPlan({
      formation: report.recommendedFormation.formation,
      passing: report.recommendedPlayStyle.passing,
      mentality: report.recommendedPlayStyle.mentality,
      marking: report.recommendedDefensivePosture.marking,
    });
    notifyApplied(
      `Plano tático aplicado: ${report.recommendedFormation.formation}, ${report.recommendedPlayStyle.passing}, ${report.recommendedPlayStyle.mentality} e marcação ${report.recommendedDefensivePosture.marking}.`
    );
  };

  return (
    <section
      aria-label="Dicas do Treinador Assistente"
      className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl"
    >
      {/* Header Row */}
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-4 h-4 text-emerald-400 shrink-0" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Dicas do Treinador Assistente
            </h2>
          </div>

          {report.hasOpponent && report.opponent ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
              <span className="text-slate-200 font-semibold">
                Próximo adversário: {report.opponent.name}
              </span>
              <span aria-hidden="true">·</span>
              <span>{report.isUserHome ? 'Em casa' : 'Fora de casa'}</span>
              <span aria-hidden="true">·</span>
              <span>{report.competitionName}</span>
              {report.matchDateLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{report.matchDateLabel}</span>
                </>
              )}
              {report.rivalryName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300 font-medium">{report.rivalryName}</span>
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">{report.matchupSummary}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowScoutingDetails((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>{showScoutingDetails ? 'Ocultar relatório' : 'Ver relatório'}</span>
            {showScoutingDetails ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={handleApplyAll}
            disabled={isFullPlanApplied}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
              isFullPlanApplied
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
            }`}
          >
            {isFullPlanApplied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Plano Aplicado</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Aplicar Plano Completo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Opponent Sector Comparison & Tactical Identity Strip */}
      {report.hasOpponent && report.opponent && report.opponentRatings && (
        <div className="px-5 py-3.5 bg-slate-900/45 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs border border-white/15 shrink-0"
              style={{
                backgroundColor: report.opponent.colors.primary,
                color: report.opponent.colors.text,
              }}
            >
              {report.opponent.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-200 font-medium leading-snug">
                {report.matchupSummary}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                <span>
                  Esquema rival:{' '}
                  <strong className="text-slate-200 font-mono">
                    {report.opponent.tactics.formation}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>{report.opponent.tactics.mentality}</span>
                <span aria-hidden="true">·</span>
                <span>Passe {report.opponent.tactics.passing}</span>
                {report.opponentForm.played > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <span>Forma:</span>
                      <span className="font-mono font-bold tracking-wider">
                        {report.opponentForm.results.map((res, idx) => (
                          <span
                            key={`${res}-${idx}`}
                            className={`${getFormColorClass(res)} ${idx > 0 ? 'ml-1' : ''}`}
                          >
                            {res}
                          </span>
                        ))}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tabular Sector Comparison (User vs Opponent) */}
          <div className="flex items-center gap-5 text-xs font-mono tabular-nums shrink-0">
            {(
              [
                {
                  label: 'OVR',
                  mine: report.userRatings.overall,
                  theirs: report.opponentRatings.overall,
                },
                {
                  label: 'DEF',
                  mine: report.userRatings.defense,
                  theirs: report.opponentRatings.defense,
                },
                {
                  label: 'MEI',
                  mine: report.userRatings.midfield,
                  theirs: report.opponentRatings.midfield,
                },
                {
                  label: 'ATA',
                  mine: report.userRatings.attack,
                  theirs: report.opponentRatings.attack,
                },
              ] as const
            ).map((sec) => {
              const diff = sec.mine - sec.theirs;
              const diffColor =
                diff >= 2
                  ? 'text-emerald-400'
                  : diff <= -2
                  ? 'text-rose-400'
                  : 'text-slate-400';
              return (
                <div key={sec.label} className="text-right">
                  <div className="text-[10px] text-slate-500 font-sans font-semibold">
                    {sec.label}
                  </div>
                  <div className="text-slate-100 font-bold">
                    {sec.mine}
                    <span className="text-slate-500 font-normal">/{sec.theirs}</span>
                  </div>
                  <div className={`text-[10px] font-bold ${diffColor}`}>
                    {formatDelta(diff)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3 Core Tactical Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {/* 1. Melhor Formação */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
                <span>Melhor Formação</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                {report.recommendedFormation.naturalFitCount}/11 naturais · OVR{' '}
                {report.recommendedFormation.avgOverall}
              </span>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-black font-mono tabular-nums text-white tracking-tight">
                {report.recommendedFormation.formation}
              </span>
              <span className="text-xs font-medium text-sky-300">
                {report.recommendedFormation.counterLabel}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {report.recommendedFormation.rationale}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/70">
            <span className="text-[11px] text-slate-500 font-mono">
              Atual: {userClub.tactics.formation}
            </span>
            <button
              type="button"
              disabled={isFormationApplied}
              onClick={() => {
                soundEngine.playClick();
                onApplyFormation(report.recommendedFormation.formation);
                notifyApplied(
                  `Formação alterada para ${report.recommendedFormation.formation} com os titulares ajustados às posições.`
                );
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                isFormationApplied
                  ? 'text-emerald-400 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 cursor-pointer'
              }`}
            >
              {isFormationApplied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Em uso</span>
                </>
              ) : (
                <span>Aplicar formação</span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Estilo de Jogo */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <Compass className="w-3.5 h-3.5 text-teal-400" />
                <span>Estilo de Jogo</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Mentalidade: <strong className="text-slate-200">{report.recommendedPlayStyle.mentality}</strong>
              </span>
            </div>

            <div className="text-lg font-bold text-white leading-snug">
              {report.recommendedPlayStyle.passing}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {report.recommendedPlayStyle.rationale}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/70">
            <span className="text-[11px] text-slate-500 truncate">
              Atual: {userClub.tactics.passing} · {userClub.tactics.mentality}
            </span>
            <button
              type="button"
              disabled={isPlayStyleApplied}
              onClick={() => {
                soundEngine.playClick();
                onApplyPlayStyle(
                  report.recommendedPlayStyle.passing,
                  report.recommendedPlayStyle.mentality
                );
                notifyApplied(
                  `Estilo ajustado para ${report.recommendedPlayStyle.passing} com postura ${report.recommendedPlayStyle.mentality}.`
                );
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isPlayStyleApplied
                  ? 'text-emerald-400 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-teal-300 cursor-pointer'
              }`}
            >
              {isPlayStyleApplied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Em uso</span>
                </>
              ) : (
                <span>Aplicar estilo</span>
              )}
            </button>
          </div>
        </div>

        {/* 3. Postura Defensiva */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Postura Defensiva</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                Fôlego XI: {report.userAvgCondition}%
              </span>
            </div>

            <div className="text-lg font-bold text-white leading-snug">
              {report.recommendedDefensivePosture.blockLabel}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {report.recommendedDefensivePosture.rationale}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/70">
            <span className="text-[11px] text-slate-500">
              Atual: Marcação {userClub.tactics.marking}
            </span>
            <button
              type="button"
              disabled={isDefensiveApplied}
              onClick={() => {
                soundEngine.playClick();
                onApplyDefensivePosture(
                  report.recommendedDefensivePosture.marking,
                  report.recommendedDefensivePosture.mentality
                );
                notifyApplied(
                  `Postura defensiva definida: ${report.recommendedDefensivePosture.blockLabel}.`
                );
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isDefensiveApplied
                  ? 'text-emerald-400 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 cursor-pointer'
              }`}
            >
              {isDefensiveApplied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Em uso</span>
                </>
              ) : (
                <span>Aplicar postura</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scouting Notes Footer */}
      {showScoutingDetails && report.scoutingNotes.length > 0 && (
        <div className="px-5 py-3.5 bg-slate-900/35 border-t border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.scoutingNotes.map((note) => {
              const titleColor =
                note.tone === 'opportunity'
                  ? 'text-emerald-400'
                  : note.tone === 'warning'
                  ? 'text-amber-300'
                  : 'text-slate-300';
              return (
                <div key={note.label} className="space-y-0.5">
                  <div className={`text-[11px] font-bold ${titleColor}`}>{note.label}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{note.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {appliedBanner && (
        <div className="px-5 py-2.5 bg-emerald-950/50 border-t border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{appliedBanner}</span>
        </div>
      )}
    </section>
  );
};

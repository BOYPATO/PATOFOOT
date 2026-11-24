import React, { useMemo, useState } from 'react';
import {
  AssistantLineupMode,
  Club,
  CompetitionType,
  CornerRoutineType,
  Fixture,
  FormationType,
  FreekickRoutineType,
  MarkingStyle,
  PassingStyle,
  Player,
  TacticalMentality,
  TacticalPreset,
  TacticalSettings,
} from '../types/game';
import { soundEngine } from '../services/soundEngine';
import {
  Award,
  Bookmark,
  Bot,
  CheckCircle2,
  Crosshair,
  HeartPulse,
  Info,
  Save,
  Shield,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from 'lucide-react';
import {
  computeCaptainLeadershipScore,
  computePenaltySkillScore,
  computeFreekickSkillScore,
  computeCornerSkillScore,
  pickOptimalSetPieceTakers,
} from '../utils/matchExperienceEngine';
import { buildAssistantOptimalLineup } from '../utils/assistantLineupEngine';
import { COMPETITIONS_CATALOG } from '../utils/competitionsEngine';
import { AssistantTacticsAdviceCard } from './AssistantTacticsAdviceCard';
import { ALL_TACTICAL_FORMATIONS } from '../utils/assistantTacticsAdviceEngine';

interface TacticsPanelProps {
  club: Club;
  upcomingCompetition?: CompetitionType;
  upcomingOpponentName?: string;
  upcomingOpponentClub?: Club | null;
  upcomingFixture?: Fixture | null;
  allFixtures?: Fixture[];
  upcomingRivalryName?: string | null;
  onUpdateTactics: (tactics: TacticalSettings) => void;
  onApplyAssistantLineup?: (updatedSquad: Player[], updatedTactics: TacticalSettings) => void;
  onSaveTacticalPreset?: (preset: TacticalPreset) => void;
  onLoadTacticalPreset?: (preset: TacticalPreset) => void;
}

const DEFAULT_PRESET_NAMES: Record<0 | 1 | 2, string> = {
  0: 'Titular Ofensivo',
  1: 'Fora de Casa (Retranca)',
  2: 'Time Reserva / Rodízio',
};

export const TacticsPanel: React.FC<TacticsPanelProps> = ({
  club,
  upcomingCompetition,
  upcomingOpponentName,
  upcomingOpponentClub = null,
  upcomingFixture = null,
  allFixtures = [],
  upcomingRivalryName = null,
  onUpdateTactics,
  onApplyAssistantLineup,
  onSaveTacticalPreset,
  onLoadTacticalPreset,
}) => {
  const [assistantFeedback, setAssistantFeedback] = useState<string | null>(null);
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);
  const [presetNames, setPresetNames] = useState<Record<0 | 1 | 2, string>>(() => {
    const existing = club.tacticalPresets || [];
    return {
      0: existing.find((p) => p.slotIndex === 0)?.name || DEFAULT_PRESET_NAMES[0],
      1: existing.find((p) => p.slotIndex === 1)?.name || DEFAULT_PRESET_NAMES[1],
      2: existing.find((p) => p.slotIndex === 2)?.name || DEFAULT_PRESET_NAMES[2],
    };
  });
  const starters = club.squad.filter((p) => p.isStarter);
  const autoEnabled = Boolean(club.tactics.autoLineupAssistantEnabled);
  const autoSubsEnabled = Boolean(club.tactics.autoMatchSubsEnabled);
  const activeMode: AssistantLineupMode = club.tactics.autoLineupMode || 'EQUILIBRADO';

  const assistantPreview = useMemo(
    () => buildAssistantOptimalLineup(club, upcomingCompetition),
    [club, upcomingCompetition]
  );

  const assistantModes: {
    id: AssistantLineupMode;
    label: string;
    desc: string;
  }[] = [
    {
      id: 'EQUILIBRADO',
      label: 'Equilibrado (OVR + Forma Física)',
      desc: 'Combina Overall e condição física ideal (≥72%), poupando atletas desgastados quando há reposição pronta.',
    },
    {
      id: 'FORCA_MAXIMA',
      label: 'Força Máxima (Titulares)',
      desc: 'Prioriza os craques de maior Overall para jogos decisivos, poupando apenas atletas exaustos (<58%).',
    },
    {
      id: 'POUPAR_FADIGA',
      label: 'Priorizar Fôlego (Rodízio)',
      desc: 'Dá preferência a quem está com fôlego alto (≥80%) para evitar lesões em sequência pesada de jogos.',
    },
  ];

  const triggerFeedback = (msg: string) => {
    setAssistantFeedback(msg);
    setTimeout(() => {
      setAssistantFeedback((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const handleToggleAutoAssistant = () => {
    soundEngine.playClick();
    const nextEnabled = !autoEnabled;
    const nextTacticsDraft: TacticalSettings = {
      ...club.tactics,
      autoLineupAssistantEnabled: nextEnabled,
      autoLineupMode: activeMode,
    };

    if (nextEnabled) {
      const optimal = buildAssistantOptimalLineup(club, upcomingCompetition, nextTacticsDraft);
      if (onApplyAssistantLineup) {
        onApplyAssistantLineup(optimal.updatedSquad, optimal.updatedTactics);
      } else {
        onUpdateTactics(optimal.updatedTactics);
      }
      triggerFeedback(
        `Assistente Técnico IA ativado! ${optimal.summaryText} A escalação também será ajustada automaticamente antes de cada partida.`
      );
    } else {
      onUpdateTactics(nextTacticsDraft);
      triggerFeedback(
        'Escalação automática pré-jogo desativada. Você volta a ter controle 100% manual dos titulares.'
      );
    }
  };

  const handleSelectAssistantMode = (mode: AssistantLineupMode) => {
    soundEngine.playClick();
    const nextTacticsDraft: TacticalSettings = {
      ...club.tactics,
      autoLineupMode: mode,
    };

    if (autoEnabled && onApplyAssistantLineup) {
      const optimal = buildAssistantOptimalLineup(club, upcomingCompetition, nextTacticsDraft);
      onApplyAssistantLineup(optimal.updatedSquad, optimal.updatedTactics);
      triggerFeedback(`Critério alterado! ${optimal.summaryText}`);
    } else {
      onUpdateTactics(nextTacticsDraft);
    }
  };

  const handleApplyAssistantNow = () => {
    soundEngine.playClick();
    const optimal = buildAssistantOptimalLineup(club, upcomingCompetition, {
      ...club.tactics,
      autoLineupMode: activeMode,
    });
    if (onApplyAssistantLineup) {
      onApplyAssistantLineup(optimal.updatedSquad, optimal.updatedTactics);
      triggerFeedback(optimal.summaryText);
    } else {
      onUpdateTactics(optimal.updatedTactics);
    }
  };

  const handleToggleAutoMatchSubs = () => {
    soundEngine.playClick();
    const nextSubs = !autoSubsEnabled;
    onUpdateTactics({
      ...club.tactics,
      autoMatchSubsEnabled: nextSubs,
    });
    triggerFeedback(
      nextSubs
        ? 'Substituições Automáticas ativadas! No 2º tempo (58\'–84\'), o assistente trocará até 5 titulares cansados ou amarelados automaticamente.'
        : 'Substituições Automáticas desativadas. As trocas durante o jogo voltam a ser manuais.'
    );
  };

  const mentalities: { id: TacticalMentality; label: string; desc: string; icon: string }[] = [
    { id: 'Muito Defensivo', label: 'Retranca', desc: 'Linhas baixas, prioridade zero gol sofrido.', icon: '🛡️' },
    { id: 'Defensivo', label: 'Defensivo', desc: 'Cauteloso, explorando contragolpes rápidos.', icon: '🔒' },
    { id: 'Equilibrado', label: 'Equilibrado', desc: 'Equilíbrio entre controle e ataque posicional.', icon: '⚖️' },
    { id: 'Ofensivo', label: 'Ofensivo', desc: 'Pressão alta e linhas adiantadas no ataque.', icon: '⚔️' },
    { id: 'Pressão Total', label: 'Pressão Total', desc: 'Todos ao ataque, pressão sufocante.', icon: '🔥' },
  ];

  const markings: { id: MarkingStyle; label: string; desc: string }[] = [
    { id: 'Leve', label: 'Leve', desc: 'Evita cartões e faltas perigosas na área.' },
    { id: 'Normal', label: 'Normal', desc: 'Marcação equilibrada por zona e homem a homem.' },
    { id: 'Pesada', label: 'Pesada', desc: 'Rouba mais bolas, porém com risco de amarelos e faltas.' },
  ];

  const passings: { id: PassingStyle; label: string; desc: string }[] = [
    { id: 'Curto (Posse)', label: 'Curto (Posse de Bola)', desc: 'Tiki-taka, valorização da posse e construção paciente.' },
    { id: 'Misto', label: 'Misto', desc: 'Combinação dinâmica de passes curtos e infiltrações.' },
    { id: 'Longo (Contra-ataque)', label: 'Longo (Contra-ataque)', desc: 'Bolas diretas nas costas da zaga adversária.' },
  ];

  const applyFormationWithLineupFit = (
    formation: FormationType,
    extraPatch?: Partial<TacticalSettings>
  ) => {
    const nextTacticsDraft: TacticalSettings = {
      ...club.tactics,
      ...extraPatch,
      formation,
    };
    const formationChanged = club.tactics.formation !== formation;
    if (formationChanged && onApplyAssistantLineup) {
      const optimal = buildAssistantOptimalLineup(club, upcomingCompetition, nextTacticsDraft);
      onApplyAssistantLineup(optimal.updatedSquad, optimal.updatedTactics);
    } else {
      onUpdateTactics(nextTacticsDraft);
    }
  };

  const upcomingCompLabel = upcomingCompetition
    ? COMPETITIONS_CATALOG[upcomingCompetition]?.shortName || 'Próximo Jogo'
    : 'Próximo Jogo';

  return (
    <div className="space-y-6">
      {/* Assistant Coach Pre-Match Opponent Scouting & Tactical Tips */}
      <AssistantTacticsAdviceCard
        userClub={club}
        opponentClub={upcomingOpponentClub}
        upcomingFixture={upcomingFixture}
        allFixtures={allFixtures}
        rivalryName={upcomingRivalryName}
        onApplyFormation={(formation) => applyFormationWithLineupFit(formation)}
        onApplyPlayStyle={(passing, mentality) =>
          onUpdateTactics({
            ...club.tactics,
            passing,
            mentality,
          })
        }
        onApplyDefensivePosture={(marking, mentality) =>
          onUpdateTactics({
            ...club.tactics,
            marking,
            mentality,
          })
        }
        onApplyFullPlan={(plan) =>
          applyFormationWithLineupFit(plan.formation, {
            passing: plan.passing,
            mentality: plan.mentality,
            marking: plan.marking,
          })
        }
      />

      {/* 3 Saved Tactical Presets (Perfis Táticos Salvos - Troca com 1 Clique) */}
      {(onSaveTacticalPreset || onLoadTacticalPreset) && (
        <section className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Bookmark className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <h2 className="text-base font-bold text-white">
                  Perfis Táticos Salvos (3 Esquemas Prontos)
                </h2>
                <p className="text-xs text-slate-400">
                  Salve formação, postura, batedores e os 11 titulares atuais para alternar com 1 clique.
                </p>
              </div>
            </div>
            {presetFeedback && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{presetFeedback}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {([0, 1, 2] as const).map((slotIdx) => {
              const savedPreset = (club.tacticalPresets || []).find((p) => p.slotIndex === slotIdx);
              return (
                <div
                  key={slotIdx}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                    savedPreset
                      ? 'bg-slate-900/85 border-sky-500/35'
                      : 'bg-slate-900/45 border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono font-bold text-sky-400">Perfil 0{slotIdx + 1}</span>
                      <span className="text-slate-500">
                        {savedPreset ? `${savedPreset.formation} · ${savedPreset.mentality}` : 'Vazio'}
                      </span>
                    </div>

                    <input
                      type="text"
                      value={presetNames[slotIdx]}
                      onChange={(e) =>
                        setPresetNames((prev) => ({ ...prev, [slotIdx]: e.target.value }))
                      }
                      maxLength={28}
                      placeholder={DEFAULT_PRESET_NAMES[slotIdx]}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-sky-400"
                    />

                    {savedPreset ? (
                      <div className="text-[11px] text-slate-400 leading-snug">
                        Passe: <strong className="text-slate-200">{savedPreset.passing}</strong> · Marcação:{' '}
                        <strong className="text-slate-200">{savedPreset.marking}</strong>
                        <span className="block text-slate-500 mt-0.5 tabular-nums">
                          {savedPreset.starterIds.length} titulares salvos
                          {savedPreset.savedAtLabel ? ` · ${savedPreset.savedAtLabel}` : ''}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Salve sua tática e escalação atual neste espaço para reutilizar rapidamente.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {onSaveTacticalPreset && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          const cleanName =
                            presetNames[slotIdx].trim() || DEFAULT_PRESET_NAMES[slotIdx];
                          const newPreset: TacticalPreset = {
                            slotIndex: slotIdx,
                            name: cleanName,
                            formation: club.tactics.formation,
                            mentality: club.tactics.mentality,
                            marking: club.tactics.marking,
                            passing: club.tactics.passing,
                            captainId: club.tactics.captainId,
                            penaltyTakerId: club.tactics.penaltyTakerId,
                            freekickTakerId: club.tactics.freekickTakerId,
                            cornerTakerId: club.tactics.cornerTakerId,
                            cornerRoutine: club.tactics.cornerRoutine,
                            freekickRoutine: club.tactics.freekickRoutine,
                            starterIds: starters.map((p) => p.id),
                            savedAtLabel: new Date().toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            }),
                          };
                          onSaveTacticalPreset(newPreset);
                          setPresetFeedback(`Perfil "${cleanName}" salvo com sucesso!`);
                          setTimeout(() => setPresetFeedback(null), 3500);
                        }}
                        className="flex-1 py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                      >
                        <Save className="w-3.5 h-3.5 text-sky-400" />
                        <span>{savedPreset ? 'Atualizar' : 'Salvar Atual'}</span>
                      </button>
                    )}

                    {savedPreset && onLoadTacticalPreset && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onLoadTacticalPreset(savedPreset);
                          setPresetFeedback(
                            `Perfil "${savedPreset.name}" (${savedPreset.formation}) aplicado!`
                          );
                          setTimeout(() => setPresetFeedback(null), 3500);
                        }}
                        className="flex-1 py-2 px-2.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs whitespace-nowrap cursor-pointer transition-colors"
                      >
                        Aplicar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* AI Assistant Coach Pre-Match Auto-Lineup Card */}
      <div
        className={`bg-slate-950 border rounded-xl p-5 shadow-xl transition-colors ${
          autoEnabled ? 'border-emerald-500/50' : 'border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3 max-w-2xl">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                autoEnabled
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-400'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
              }`}
            >
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Assistente Técnico IA · Escalação Automática Pré-Jogo
                </h2>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                    autoEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {autoEnabled ? 'Ativo antes de cada jogo' : 'Manual'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Quando ativado, o auxiliar técnico analisa automaticamente a{' '}
                <strong className="text-slate-200">forma física (condição %)</strong>, o{' '}
                <strong className="text-slate-200">Overall</strong>, lesões e suspensões para
                escalar os 11 titulares ideais, os 11 reservas do banco e os cobradores no esquema{' '}
                <strong className="text-sky-300 font-mono">{club.tactics.formation}</strong> antes
                de cada partida.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleApplyAssistantNow}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-xs font-bold text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
              title="Pedir para o Assistente Técnico IA montar a melhor escalação imediatamente"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Escalar Melhor Time Agora</span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={autoEnabled}
              onClick={handleToggleAutoAssistant}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                autoEnabled
                  ? 'bg-emerald-950/60 border-emerald-400/60 text-emerald-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span>Auto-Escalar Pré-Jogo</span>
              <span
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                  autoEnabled ? 'bg-emerald-400 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-slate-950 shadow-sm block" />
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={autoSubsEnabled}
              onClick={handleToggleAutoMatchSubs}
              title="Permite ao auxiliar realizar automaticamente até 5 substituições no 2º tempo (58'–84') para atletas desgastados, lesionados ou amarelados"
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                autoSubsEnabled
                  ? 'bg-sky-950/60 border-sky-400/60 text-sky-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span>Auto-Subs 2º Tempo</span>
              <span
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                  autoSubsEnabled ? 'bg-sky-400 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-slate-950 shadow-sm block" />
              </span>
            </button>
          </div>
        </div>

        {/* Assistant Priority Criterion Selector */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {assistantModes.map((modeOpt) => {
            const isSelected = activeMode === modeOpt.id;
            return (
              <button
                key={modeOpt.id}
                type="button"
                onClick={() => handleSelectAssistantMode(modeOpt.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950/50 border-sky-400 ring-1 ring-sky-400/30'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-sky-300' : 'text-white'
                    }`}
                  >
                    {modeOpt.label}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                      Selecionado
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{modeOpt.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Live Assistant Readiness Report */}
        <div className="mt-4 bg-slate-900/75 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-300">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                XI Ideal ({upcomingCompLabel}
                {upcomingOpponentName ? ` vs ${upcomingOpponentName}` : ''}):{' '}
                <strong className="text-sky-300 font-mono">OVR {assistantPreview.avgOverall}</strong>
              </span>
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Forma Física Média:{' '}
                <strong
                  className={`font-mono ${
                    assistantPreview.avgCondition >= 80
                      ? 'text-emerald-300'
                      : assistantPreview.avgCondition >= 68
                      ? 'text-amber-300'
                      : 'text-rose-300'
                  }`}
                >
                  {assistantPreview.avgCondition}%
                </strong>
              </span>
            </span>
            {assistantPreview.unavailableCount > 0 && (
              <>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-amber-300">
                  Desfalques (DM/Susp.): <strong>{assistantPreview.unavailableCount}</strong>
                </span>
              </>
            )}
            {assistantPreview.restedFatiguedNames.length > 0 && (
              <>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-sky-200">
                  Poupados por desgaste:{' '}
                  <strong>{assistantPreview.restedFatiguedNames.slice(0, 3).join(', ')}</strong>
                </span>
              </>
            )}
          </div>

          <span
            className={`text-[11px] font-semibold ${
              assistantPreview.startersChangedCount === 0 ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            {assistantPreview.startersChangedCount === 0
              ? 'Time atual já está na melhor formação'
              : `${assistantPreview.startersChangedCount} ${
                  assistantPreview.startersChangedCount === 1
                    ? 'mudança recomendada'
                    : 'mudanças recomendadas'
                } pelo Assistente`}
          </span>
        </div>

        {assistantFeedback && (
          <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{assistantFeedback}</span>
          </div>
        )}
      </div>

      {/* Formation & Mentality Selector */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
        {/* Quick Formation Picker */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-slate-800 pb-2.5">
            <h2 className="text-base font-bold text-white">Esquema Tático (Formação)</h2>
            <span className="text-xs text-slate-400">
              Ativa: <strong className="text-sky-300 font-mono">{club.tactics.formation}</strong>
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
            {ALL_TACTICAL_FORMATIONS.map((fmt) => {
              const isSelected = club.tactics.formation === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    applyFormationWithLineupFit(fmt);
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-sky-950/60 border-sky-400 text-sky-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  {fmt}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <Zap className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Postura Tática (Mentalidade da Equipe)</h2>
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {mentalities.map((m) => {
            const isSelected = club.tactics.mentality === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  soundEngine.playClick();
                  onUpdateTactics({ ...club.tactics, mentality: m.id });
                }}
                className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-950/60 border-sky-400 ring-2 ring-sky-400/30 shadow-lg shadow-sky-950/50'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-2xl mb-1">{m.icon}</div>
                  <h4 className={`text-sm font-bold ${isSelected ? 'text-sky-300' : 'text-white'}`}>
                    {m.label}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {m.desc}
                  </p>
                </div>
                {isSelected && (
                  <span className="mt-2 text-[10px] font-black uppercase tracking-wider text-sky-400">
                    Ativo
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* Marking & Passing Style in 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Marking Style */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Estilo de Marcação</h2>
          </div>

          <div className="space-y-3">
            {markings.map((mk) => {
              const isSelected = club.tactics.marking === mk.id;
              return (
                <div
                  key={mk.id}
                  onClick={() => {
                    soundEngine.playClick();
                    onUpdateTactics({ ...club.tactics, marking: mk.id });
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-sky-950/40 border-sky-500 ring-1 ring-sky-500'
                      : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <h4 className={`text-sm font-bold ${isSelected ? 'text-sky-400' : 'text-white'}`}>
                      {mk.label}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{mk.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-sky-400 bg-sky-400' : 'border-slate-500'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Passing Style */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <Target className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">Estilo de Passe</h2>
          </div>

          <div className="space-y-3">
            {passings.map((ps) => {
              const isSelected = club.tactics.passing === ps.id;
              return (
                <div
                  key={ps.id}
                  onClick={() => {
                    soundEngine.playClick();
                    onUpdateTactics({ ...club.tactics, passing: ps.id });
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-teal-950/40 border-teal-500 ring-1 ring-teal-500'
                      : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <h4 className={`text-sm font-bold ${isSelected ? 'text-teal-400' : 'text-white'}`}>
                      {ps.label}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{ps.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-teal-400 bg-teal-400' : 'border-slate-500'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Set-Piece Takers (Cobradores & Capitão) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="text-base font-bold text-white">Batedores Oficiais & Liderança em Campo</h2>
              <p className="text-xs text-slate-400">
                Impactam diretamente pênaltis no tempo normal, faltas perigosas, assistências de escanteio e resiliência nos minutos finais.
              </p>
            </div>
          </div>

          {starters.length > 0 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                const optimal = pickOptimalSetPieceTakers(starters);
                onUpdateTactics({
                  ...club.tactics,
                  ...optimal,
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Wand2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Sugerir Cobradores Ideais</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 tabular-nums">
          {/* Captain */}
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Capitão (©)</span>
              </span>
              <span className="text-[11px] font-mono text-amber-300">
                LÍD{' '}
                {(() => {
                  const sel =
                    starters.find((p) => p.id === club.tactics.captainId) || starters[0];
                  return sel ? computeCaptainLeadershipScore(sel) : '--';
                })()}
              </span>
            </label>
            <select
              value={club.tactics.captainId || starters[0]?.id || ''}
              onChange={(e) => {
                soundEngine.playClick();
                onUpdateTactics({ ...club.tactics, captainId: e.target.value });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              {[...starters]
                .sort((a, b) => computeCaptainLeadershipScore(b) - computeCaptainLeadershipScore(a))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.squadNumber} {p.name} ({p.detailedRole} · LÍD {computeCaptainLeadershipScore(p)})
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Amplifica palestras e segura pressão após os 75&apos;.
            </p>
          </div>

          {/* Penalty */}
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                <span>Pênaltis</span>
              </span>
              <span className="text-[11px] font-mono text-rose-300">
                PEN{' '}
                {(() => {
                  const sel =
                    starters.find((p) => p.id === club.tactics.penaltyTakerId) ||
                    starters.find((p) => p.position === 'FW') ||
                    starters[0];
                  return sel ? computePenaltySkillScore(sel) : '--';
                })()}
              </span>
            </label>
            <select
              value={club.tactics.penaltyTakerId || starters.find(p => p.position === 'FW')?.id || starters[0]?.id || ''}
              onChange={(e) => {
                soundEngine.playClick();
                onUpdateTactics({ ...club.tactics, penaltyTakerId: e.target.value });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-400"
            >
              {[...starters]
                .sort((a, b) => computePenaltySkillScore(b) - computePenaltySkillScore(a))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.squadNumber} {p.name} ({p.detailedRole} · PEN {computePenaltySkillScore(p)})
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Cobra penalidades no tempo normal e abre disputas.
            </p>
          </div>

          {/* Free Kicks */}
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                <span>Faltas Diretas</span>
              </span>
              <span className="text-[11px] font-mono text-sky-300">
                FLT{' '}
                {(() => {
                  const sel =
                    starters.find((p) => p.id === club.tactics.freekickTakerId) ||
                    starters.find((p) => p.position === 'MF') ||
                    starters[0];
                  return sel ? computeFreekickSkillScore(sel) : '--';
                })()}
              </span>
            </label>
            <select
              value={club.tactics.freekickTakerId || starters.find(p => p.position === 'MF')?.id || starters[0]?.id || ''}
              onChange={(e) => {
                soundEngine.playClick();
                onUpdateTactics({ ...club.tactics, freekickTakerId: e.target.value });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
            >
              {[...starters]
                .sort((a, b) => computeFreekickSkillScore(b) - computeFreekickSkillScore(a))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.squadNumber} {p.name} ({p.detailedRole} · FLT {computeFreekickSkillScore(p)})
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Bate faltas frontais com chance real de gol no ângulo.
            </p>
          </div>

          {/* Corners */}
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Escanteios</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-300">
                ESC{' '}
                {(() => {
                  const sel =
                    starters.find((p) => p.id === club.tactics.cornerTakerId) ||
                    starters.find((p) => p.position === 'MF' || p.detailedRole === 'LAT') ||
                    starters[0];
                  return sel ? computeCornerSkillScore(sel) : '--';
                })()}
              </span>
            </label>
            <select
              value={club.tactics.cornerTakerId || starters.find(p => p.position === 'MF' || p.detailedRole === 'LAT')?.id || starters[0]?.id || ''}
              onChange={(e) => {
                soundEngine.playClick();
                onUpdateTactics({ ...club.tactics, cornerTakerId: e.target.value });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
            >
              {[...starters]
                .sort((a, b) => computeCornerSkillScore(b) - computeCornerSkillScore(a))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.squadNumber} {p.name} ({p.detailedRole} · ESC {computeCornerSkillScore(p)})
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Alça bolas precisas para gols de cabeça na área.
            </p>
          </div>
        </div>

        {/* Routines: Escanteios & Faltas Ensaiadas */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs font-bold text-white mb-2">
              Jogada Ensaiada de Escanteio
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  {
                    id: 'PRIMEIRO_PAU',
                    label: '1º Pau (Desvio Rápido)',
                    desc: 'Ataque curto na primeira trave para zagueiros velozes.',
                  },
                  {
                    id: 'SEGUNDO_PAU',
                    label: '2º Pau (Bola Aérea)',
                    desc: 'Cruzamento aberto buscando cabeceadores altos.',
                  },
                  {
                    id: 'CURTO_ENSAIADO',
                    label: 'Curto & Triangulação',
                    desc: 'Tabela curta para infiltrar ou finalizar da entrada da área.',
                  },
                ] as { id: CornerRoutineType; label: string; desc: string }[]
              ).map((rt) => {
                const active = (club.tactics.cornerRoutine || 'SEGUNDO_PAU') === rt.id;
                return (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onUpdateTactics({ ...club.tactics, cornerRoutine: rt.id });
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-950/50 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{rt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{rt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs font-bold text-white mb-2">
              Rotina de Faltas Ofensivas
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  {
                    id: 'DIRETO_BARREIRA',
                    label: 'Batida Direta ao Gol',
                    desc: 'Prioriza finalização colocada ou forte sobre a barreira.',
                  },
                  {
                    id: 'CHUVEIRO_AREA',
                    label: 'Alçar na Área',
                    desc: 'Bola levantada buscando desvio de cabeça na pequena área.',
                  },
                  {
                    id: 'JOGADA_ENSAIADA',
                    label: 'Passe Ensaiado',
                    desc: 'Rolada curta tirando a barreira para chute limpo.',
                  },
                ] as { id: FreekickRoutineType; label: string; desc: string }[]
              ).map((rt) => {
                const active = (club.tactics.freekickRoutine || 'DIRETO_BARREIRA') === rt.id;
                return (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onUpdateTactics({ ...club.tactics, freekickRoutine: rt.id });
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-950/50 border-sky-400 text-sky-200'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{rt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{rt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5-Shooter Official Penalty Shootout Order */}
        {starters.length >= 5 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div>
                <h3 className="text-xs font-bold text-white">
                  Ordem Oficial de Disputa de Pênaltis (1º ao 5º Cobrador)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Usada automaticamente nas decisões por pênaltis em mata-matas e finais.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  const best5 = [...starters]
                    .sort((a, b) => computePenaltySkillScore(b) - computePenaltySkillScore(a))
                    .slice(0, 5)
                    .map((p) => p.id);
                  onUpdateTactics({
                    ...club.tactics,
                    penaltyTakerId: best5[0],
                    penaltyOrderIds: best5,
                  });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-rose-300 cursor-pointer transition-colors"
              >
                Auto-Ordenar Top 5
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 tabular-nums">
              {[0, 1, 2, 3, 4].map((slotIdx) => {
                const defaultRanked = [...starters].sort(
                  (a, b) => computePenaltySkillScore(b) - computePenaltySkillScore(a)
                );
                const currentOrder =
                  club.tactics.penaltyOrderIds && club.tactics.penaltyOrderIds.length >= 5
                    ? club.tactics.penaltyOrderIds
                    : defaultRanked.slice(0, 5).map((p) => p.id);
                const selectedId =
                  currentOrder[slotIdx] || defaultRanked[slotIdx]?.id || starters[0]?.id || '';

                return (
                  <div
                    key={slotIdx}
                    className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5"
                  >
                    <div className="text-[10px] font-mono font-bold text-rose-300 mb-1">
                      {slotIdx + 1}º Cobrador
                    </div>
                    <select
                      value={selectedId}
                      onChange={(e) => {
                        soundEngine.playClick();
                        const newId = e.target.value;
                        const nextOrder = [...currentOrder];
                        const duplicateIdx = nextOrder.findIndex(
                          (id, idx) => id === newId && idx !== slotIdx
                        );
                        if (duplicateIdx !== -1) {
                          nextOrder[duplicateIdx] = nextOrder[slotIdx];
                        }
                        nextOrder[slotIdx] = newId;
                        onUpdateTactics({
                          ...club.tactics,
                          penaltyTakerId: slotIdx === 0 ? newId : club.tactics.penaltyTakerId,
                          penaltyOrderIds: nextOrder,
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-rose-400"
                    >
                      {defaultRanked.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (PEN {computePenaltySkillScore(p)})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tactical Tip */}
        <div className="mt-4 p-3 bg-slate-800/40 rounded-lg border border-slate-700/40 flex items-start gap-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Dica do Manager:</strong> Se o batedor oficial for substituído ou expulso durante a partida, o jogo transfere automaticamente a cobrança e a braçadeira de capitão para o próximo especialista em campo!
          </span>
        </div>
      </div>
    </div>
  );
};

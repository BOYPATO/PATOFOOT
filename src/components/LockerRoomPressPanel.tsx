import React, { useMemo, useState } from 'react';
import { Club, LockerRoomState } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import { MessageSquare, Mic, Users, CheckCircle2, HeartHandshake } from 'lucide-react';

interface LockerRoomPressPanelProps {
  mode: 'locker_room' | 'press';
  userClub: Club;
  currentRound: number;
  lockerRoom: LockerRoomState;
  onResolveDemand: (
    demandId: string,
    choice: 'PROMISE_STARTER' | 'REWARD_BONUS' | 'DEMAND_PATIENCE' | 'FIRM_AUTHORITY'
  ) => { feedbackText: string; positive: boolean };
  onHoldPlayerTalk: (
    playerId: string,
    tone: 'PRAISE_FORM' | 'DEMAND_FOCUS' | 'REST_RECOVERY'
  ) => { feedbackText: string; positive: boolean };
  onStartPressConference: () => void;
  onSubmitPressConference: (
    answers: Record<string, string>
  ) => { feedbackText: string };
}

export const LockerRoomPressPanel: React.FC<LockerRoomPressPanelProps> = ({
  mode,
  userClub,
  currentRound,
  lockerRoom,
  onResolveDemand,
  onHoldPlayerTalk,
  onStartPressConference,
  onSubmitPressConference,
}) => {
  const [selectedTalkPlayerId, setSelectedTalkPlayerId] = useState<string>(
    () => userClub.squad[0]?.id || ''
  );
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ feedbackText: string; positive: boolean } | null>(null);

  const pendingDemands = useMemo(
    () => lockerRoom.activeDemands.filter((d) => d.status === 'PENDING'),
    [lockerRoom.activeDemands]
  );

  const sortedSquad = useMemo(
    () =>
      [...userClub.squad].sort((a, b) => {
        if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
        return b.overall - a.overall;
      }),
    [userClub.squad]
  );

  const harmonyLabel =
    lockerRoom.harmonyScore >= 82
      ? { text: 'Ambiente Unido e Confiante', color: 'text-emerald-400', bar: 'bg-emerald-400' }
      : lockerRoom.harmonyScore >= 62
      ? { text: 'Vestiário Profissional e Estável', color: 'text-sky-400', bar: 'bg-sky-400' }
      : lockerRoom.harmonyScore >= 42
      ? { text: 'Ruídos Internos · Exige Gestão', color: 'text-amber-400', bar: 'bg-amber-400' }
      : { text: 'Vestiário Rachado', color: 'text-rose-400', bar: 'bg-rose-500' };

  if (mode === 'locker_room') {
    const selectedPlayer =
      sortedSquad.find((p) => p.id === selectedTalkPlayerId) || sortedSquad[0];
    const talkedThisRound =
      selectedPlayer &&
      lockerRoom.lastTalkRoundByPlayer[selectedPlayer.id] === currentRound;

    return (
      <div className="space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
              feedback.positive
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}
          >
            <span>{feedback.feedbackText}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Squad Harmony Overview */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <span>Termômetro de Harmonia do Vestiário</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Jogadores motivados rendem mais em campo e aceitam renovações com maior facilidade.
              </p>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-2xl font-black font-mono text-white">
                {lockerRoom.harmonyScore}
                <span className="text-sm text-slate-500">/100</span>
              </div>
              <div className={`text-xs font-semibold ${harmonyLabel.color}`}>
                {harmonyLabel.text}
              </div>
            </div>
          </div>

          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mt-4 border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${harmonyLabel.bar}`}
              style={{ width: `${lockerRoom.harmonyScore}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs tabular-nums">
            {(['Excelente', 'Boa', 'Regular', 'Baixa', 'Péssima'] as const).map((m) => {
              const count = userClub.squad.filter((p) => p.morale === m).length;
              return (
                <div key={m} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-slate-400">{m}</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {count} <span className="text-xs font-normal text-slate-500">atletas</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Player Demands */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Reuniões Pendentes com Jogadores</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Atenda ou enquadre demandas individuais sobre tempo de jogo e valorização salarial.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {pendingDemands.length} pendente{pendingDemands.length === 1 ? '' : 's'}
            </span>
          </div>

          {pendingDemands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma reclamação ativa no elenco no momento. O ambiente no CT segue tranquilo.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingDemands.map((demand) => (
                <div
                  key={demand.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                    <div className="font-bold text-white text-sm">
                      {demand.playerName}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        · {demand.playerRole} · OVR {demand.playerOverall}
                      </span>
                    </div>
                    <span className="text-slate-400">
                      {demand.category === 'PLAYING_TIME'
                        ? 'Pede vaga entre os titulares'
                        : 'Pede valorização contratual'}{' '}
                      · Rodada {demand.createdRound}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 italic leading-relaxed">
                    {demand.complaintText}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {demand.category === 'PLAYING_TIME' ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          const res = onResolveDemand(demand.id, 'PROMISE_STARTER');
                          setFeedback(res);
                        }}
                        className="px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer transition-colors text-left"
                      >
                        <div className="font-bold">Prometer Sequência</div>
                        <div className="text-[11px] text-emerald-200/80">
                          Escalar em até 2 rodadas (+Moral)
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          const res = onResolveDemand(demand.id, 'REWARD_BONUS');
                          setFeedback(res);
                        }}
                        className="px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer transition-colors text-left"
                      >
                        <div className="font-bold">Valorizar Salário (+12%)</div>
                        <div className="text-[11px] text-emerald-200/80">
                          Eleva moral a Excelente na hora
                        </div>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        const res = onResolveDemand(demand.id, 'DEMAND_PATIENCE');
                        setFeedback(res);
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-semibold cursor-pointer transition-colors text-left"
                    >
                      <div className="font-bold">Explicar Planejamento</div>
                      <div className="text-[11px] text-slate-400">
                        Pedir paciência e foco no rodízio
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        const res = onResolveDemand(demand.id, 'FIRM_AUTHORITY');
                        setFeedback(res);
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/40 text-amber-300 text-xs font-semibold cursor-pointer transition-colors text-left"
                    >
                      <div className="font-bold">Enquadrar com Pulso Firme</div>
                      <div className="text-[11px] text-slate-400">
                        Ninguém está acima do clube (+Diretoria)
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 1-on-1 Individual Talk Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
              <span>Conversa Individual no CT (1 a 1)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chame qualquer atleta para uma conversa particular uma vez por rodada.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-5">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Selecionar Atleta do Elenco
              </label>
              <select
                value={selectedPlayer?.id || ''}
                onChange={(e) => setSelectedTalkPlayerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400 tabular-nums"
              >
                {sortedSquad.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.squadNumber} {p.name} · {p.detailedRole} · OVR {p.overall} · Moral {p.morale}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={Boolean(talkedThisRound)}
                onClick={() => {
                  if (!selectedPlayer) return;
                  soundEngine.playClick();
                  setFeedback(onHoldPlayerTalk(selectedPlayer.id, 'PRAISE_FORM'));
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-45 border border-slate-800 text-xs font-semibold text-emerald-300 cursor-pointer transition-colors"
              >
                Elogiar Dedicação (+Moral)
              </button>
              <button
                type="button"
                disabled={Boolean(talkedThisRound)}
                onClick={() => {
                  if (!selectedPlayer) return;
                  soundEngine.playClick();
                  setFeedback(onHoldPlayerTalk(selectedPlayer.id, 'DEMAND_FOCUS'));
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-45 border border-slate-800 text-xs font-semibold text-sky-300 cursor-pointer transition-colors"
              >
                Cobrar Evolução (+7% Treino)
              </button>
              <button
                type="button"
                disabled={Boolean(talkedThisRound)}
                onClick={() => {
                  if (!selectedPlayer) return;
                  soundEngine.playClick();
                  setFeedback(onHoldPlayerTalk(selectedPlayer.id, 'REST_RECOVERY'));
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-45 border border-slate-800 text-xs font-semibold text-amber-300 cursor-pointer transition-colors"
              >
                Sessão Regenerativa (+6% Cond.)
              </button>
            </div>
          </div>
          {talkedThisRound && (
            <p className="text-[11px] text-slate-500">
              Conversa individual já realizada com {selectedPlayer?.name} na Rodada {currentRound}.
            </p>
          )}
        </div>
      </div>
    );
  }

  // mode === 'press'
  const activePress = lockerRoom.activePressConference;
  const allAnswered = activePress
    ? activePress.questions.every((q) => Boolean(selectedAnswers[q.id]))
    : false;

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-4 rounded-xl border bg-sky-950/40 border-sky-500/40 text-sky-100 text-xs font-medium flex items-center justify-between gap-3">
          <span>{feedback.feedbackText}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-sky-400" />
              <span>Sala de Imprensa & Coletivas Oficiais</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Suas declarações moldam a confiança do Conselho, o apoio da arquibancada e o ânimo do elenco.
            </p>
          </div>

          {!activePress && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSelectedAnswers({});
                onStartPressConference();
              }}
              className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
            >
              Convocar Coletiva no CT
            </button>
          )}
        </div>

        {!activePress ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma coletiva obrigatória pendente agora. Você pode convocar uma entrevista no CT a qualquer momento ou aguardar o pós-jogo.
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="text-sm font-bold text-white">{activePress.contextTitle}</div>
              <div className="text-xs text-slate-400 mt-0.5">{activePress.contextSubtitle}</div>
            </div>

            <div className="space-y-4">
              {activePress.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="text-xs text-sky-400 font-semibold">
                    0{idx + 1}. {q.journalistName} ·{' '}
                    <span className="text-slate-400 font-normal">{q.outletName}</span>
                  </div>
                  <p className="text-sm font-semibold text-white leading-snug">
                    &ldquo;{q.questionText}&rdquo;
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                    {q.options.map((opt) => {
                      const isChosen = selectedAnswers[q.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt.id }));
                          }}
                          className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                            isChosen
                              ? 'bg-sky-950/60 border-sky-400 ring-1 ring-sky-400'
                              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-sky-300">{opt.toneLabel}</div>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              {opt.responseText}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!allAnswered}
                onClick={() => {
                  soundEngine.playFanfare();
                  const res = onSubmitPressConference(selectedAnswers);
                  setSelectedAnswers({});
                  setFeedback({ feedbackText: res.feedbackText, positive: true });
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Encerrar Coletiva e Publicar Respostas</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Press History */}
      {lockerRoom.pressHistory.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h4 className="text-sm font-bold text-white">Manchetes Recentes na Imprensa</h4>
          <div className="divide-y divide-slate-800/80 text-xs">
            {lockerRoom.pressHistory.slice(0, 6).map((item) => (
              <div key={item.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-200">{item.summaryHeadline}</span>
                <span className="text-slate-500 font-mono tabular-nums">
                  Rodada {item.round} · {item.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

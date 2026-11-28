import React, { useEffect, useMemo, useState } from 'react';
import { GameSave } from '../types/game';
import {
  ManagerLeaderboardItem,
  computeCareerLeaderboardMetrics,
  fetchGlobalLeaderboard,
  publishCareerToLeaderboard,
  removeMyLeaderboardEntry,
} from '../services/leaderboardService';
import { useTrainerAuth } from '../services/trainerAuthService';
import { soundEngine } from '../services/soundEngine';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Crown,
  Globe,
  RefreshCw,
  Trash2,
  Trophy,
  UploadCloud,
  X,
} from 'lucide-react';

interface GlobalLeaderboardModalProps {
  currentSave?: GameSave | null;
  onClose: () => void;
}

export const GlobalLeaderboardModal: React.FC<GlobalLeaderboardModalProps> = ({
  currentSave = null,
  onClose,
}) => {
  const trainerAuth = useTrainerAuth();
  const [entries, setEntries] = useState<ManagerLeaderboardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [removing, setRemoving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const myUid = trainerAuth.session?.uid || null;
  const myMetrics = useMemo(
    () => (currentSave ? computeCareerLeaderboardMetrics(currentSave) : null),
    [currentSave]
  );
  const myClub = useMemo(
    () =>
      currentSave
        ? currentSave.clubs.find((c) => c.id === currentSave.userClubId) || currentSave.clubs[0]
        : null,
    [currentSave]
  );

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const list = await fetchGlobalLeaderboard(50);
      setEntries(list);
    } catch {
      setFeedback({
        type: 'err',
        text: 'Não foi possível carregar o Ranking Global agora. Verifique sua conexão.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeaderboard();
  }, []);

  const myEntryIndex = myUid ? entries.findIndex((e) => e.uid === myUid) : -1;

  const handlePublish = async () => {
    if (!currentSave || publishing) return;
    if (!myUid) {
      setFeedback({
        type: 'err',
        text: 'Entre com sua conta Google na Tela Inicial para publicar sua carreira no Ranking Global.',
      });
      return;
    }
    soundEngine.playClick();
    setPublishing(true);
    setFeedback(null);
    try {
      const saved = await publishCareerToLeaderboard(
        currentSave,
        trainerAuth.session?.displayName || currentSave.managerName
      );
      setEntries((prev) =>
        [...prev.filter((e) => e.uid !== saved.uid), saved].sort(
          (a, b) => b.careerScore - a.careerScore
        )
      );
      soundEngine.playFanfare();
      setFeedback({
        type: 'ok',
        text: `Carreira publicada no Ranking Global com ${saved.careerScore.toLocaleString('pt-BR')} pontos!`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text:
          err instanceof Error
            ? err.message
            : 'Falha ao publicar sua carreira no Ranking Global.',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleRemove = async () => {
    if (!myUid || removing) return;
    soundEngine.playClick();
    setRemoving(true);
    try {
      await removeMyLeaderboardEntry();
      setEntries((prev) => prev.filter((e) => e.uid !== myUid));
      setFeedback({
        type: 'ok',
        text: 'Sua entrada foi removida do Ranking Global.',
      });
    } catch {
      setFeedback({
        type: 'err',
        text: 'Não foi possível remover sua entrada agora.',
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-start justify-center p-2 sm:p-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl p-4 sm:p-6 my-auto flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white truncate">
                Ranking Global de Treinadores
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Hall da Fama Mundial do PATOFOOT · Top 50 carreiras por pontuação, títulos e vitórias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                soundEngine.playClick();
                void loadLeaderboard();
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              title="Atualizar ranking"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Career Publish Banner */}
        {currentSave && myClub && myMetrics && (
          <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border border-white/15 shrink-0"
                style={{
                  backgroundColor: myClub.colors.primary,
                  color: myClub.colors.text,
                }}
              >
                {myClub.initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {trainerAuth.session?.displayName || currentSave.managerName} · {myClub.shortName}
                </div>
                <div className="text-xs text-slate-400 font-mono tabular-nums flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                  <span className="text-amber-300 font-bold">
                    {myMetrics.careerScore.toLocaleString('pt-BR')} pts
                  </span>
                  <span>{myMetrics.trophiesCount} taças</span>
                  <span>{myMetrics.winsCount} vitórias</span>
                  <span>{myMetrics.seasonsPlayed} temp.</span>
                  {myEntryIndex >= 0 && (
                    <span className="text-emerald-400 font-bold">
                      · #{myEntryIndex + 1} no Mundo
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={publishing}
                onClick={() => void handlePublish()}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-black text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>
                  {publishing
                    ? 'Publicando...'
                    : myEntryIndex >= 0
                    ? 'Atualizar Pontuação'
                    : 'Publicar no Ranking'}
                </span>
              </button>
              {myEntryIndex >= 0 && (
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => void handleRemove()}
                  className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white transition-colors cursor-pointer"
                  title="Remover minha carreira do Ranking Global"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {feedback && (
          <div
            className={`mt-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              feedback.type === 'ok'
                ? 'bg-emerald-950/50 border-emerald-500/35 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/35 text-rose-300'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="flex-1 min-h-0 overflow-y-auto mt-4 rounded-xl border border-slate-800 bg-black/40">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
              <span>Carregando melhores treinadores do mundo...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <Globe className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-white">
                Seja o primeiro no Hall da Fama!
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Publique sua carreira atual para estrear o Ranking Global do PATOFOOT e desafiar outros treinadores.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/95 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 w-11 text-center">#</th>
                  <th className="py-2.5 px-3">Treinador &amp; Clube</th>
                  <th className="py-2.5 px-2 text-center">Taças</th>
                  <th className="py-2.5 px-2 text-center hidden sm:table-cell">Vitórias</th>
                  <th className="py-2.5 px-2 text-center hidden sm:table-cell">Temp.</th>
                  <th className="py-2.5 px-3 text-right text-amber-300">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entries.map((item, idx) => {
                  const pos = idx + 1;
                  const isMe = Boolean(myUid && item.uid === myUid);
                  const rankClass =
                    pos === 1
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                      : pos === 2
                      ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                      : pos === 3
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                      : 'text-slate-400';

                  return (
                    <tr
                      key={item.uid}
                      className={`transition-colors ${
                        isMe ? 'bg-sky-500/12' : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex w-6 h-6 rounded-md items-center justify-center text-[11px] font-black tabular-nums ${rankClass}`}
                        >
                          {pos}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] border border-white/15 shrink-0"
                            style={{
                              backgroundColor: item.clubPrimaryColor,
                              color: item.clubSecondaryColor,
                            }}
                          >
                            {item.clubShortName.slice(0, 3).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate flex items-center gap-1.5">
                              <span className="truncate">{item.displayName}</span>
                              {isMe && (
                                <span className="text-[10px] font-black text-sky-300 shrink-0">
                                  (Você)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {item.clubName} · Div. {item.division}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums text-amber-300 font-bold">
                        <span className="inline-flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          {item.trophiesCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-300 hidden sm:table-cell">
                        {item.winsCount}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400 hidden sm:table-cell">
                        {item.seasonsPlayed}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-black text-sky-300">
                        {item.careerScore.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 mt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Apenas nome de treinador, clube e estatísticas públicas são exibidos (nenhum dado privado).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

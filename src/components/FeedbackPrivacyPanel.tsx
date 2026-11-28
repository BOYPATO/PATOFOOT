import React, { useEffect, useState } from 'react';
import {
  FeedbackCategory,
  PlayerFeedbackRecord,
  listMyFeedback,
  submitPlayerFeedback,
} from '../services/feedbackService';
import { useTrainerAuth } from '../services/trainerAuthService';
import { soundEngine } from '../services/soundEngine';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  FileText,
  Lightbulb,
  MessageSquareHeart,
  Scale,
  Send,
  ShieldCheck,
} from 'lucide-react';

interface FeedbackPrivacyPanelProps {
  contextLabel?: string;
}

export const FeedbackPrivacyPanel: React.FC<FeedbackPrivacyPanelProps> = ({
  contextLabel = 'PATOFOOT 2026',
}) => {
  const trainerAuth = useTrainerAuth();
  const [subTab, setSubTab] = useState<'feedback' | 'privacy'>('feedback');
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [mySent, setMySent] = useState<PlayerFeedbackRecord[]>([]);

  useEffect(() => {
    if (!trainerAuth.session?.uid) return;
    let active = true;
    void listMyFeedback().then((items) => {
      if (active) setMySent(items);
    });
    return () => {
      active = false;
    };
  }, [trainerAuth.session?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    soundEngine.playClick();
    setSending(true);
    setStatus(null);
    try {
      const res = await submitPlayerFeedback({
        category,
        title,
        message,
        displayName: trainerAuth.session?.displayName,
        context: contextLabel,
      });
      setTitle('');
      setMessage('');
      setStatus({
        type: 'ok',
        text: res.savedToCloud
          ? 'Relato enviado com sucesso para a equipe do PATOFOOT! Obrigado por ajudar a melhorar o jogo.'
          : 'Relato salvo localmente (modo visitante/offline). Entre com sua conta online para enviar à nuvem.',
      });
      if (res.savedToCloud) {
        const refreshed = await listMyFeedback();
        setMySent(refreshed);
      }
    } catch (err) {
      setStatus({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao enviar relato. Tente novamente.',
      });
    } finally {
      setSending(false);
    }
  };

  const categoryOptions: Array<{
    id: FeedbackCategory;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'bug', label: 'Reportar Bug', icon: <Bug className="w-3.5 h-3.5 text-rose-400" /> },
    {
      id: 'suggestion',
      label: 'Sugestão',
      icon: <Lightbulb className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      id: 'balance',
      label: 'Equilíbrio',
      icon: <Scale className="w-3.5 h-3.5 text-sky-400" />,
    },
    {
      id: 'praise',
      label: 'Elogio',
      icon: <MessageSquareHeart className="w-3.5 h-3.5 text-emerald-400" />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setSubTab('feedback');
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
            subTab === 'feedback'
              ? 'bg-sky-400 text-slate-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bug className="w-3.5 h-3.5" />
          <span>Reportar Bug / Sugestão</span>
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setSubTab('privacy');
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
            subTab === 'privacy'
              ? 'bg-sky-400 text-slate-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacidade &amp; Termos</span>
        </button>
      </div>

      {subTab === 'feedback' ? (
        <div className="space-y-4">
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3.5"
          >
            <div>
              <h4 className="text-sm font-bold text-white">Enviar Relato para o PATOFOOT</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Encontrou algum erro, trava ou tem uma ideia de campeonato/recurso? Envie direto por aqui.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categoryOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setCategory(opt.id);
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    category === opt.id
                      ? 'bg-sky-500/15 border-sky-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Assunto</label>
              <input
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Erro ao abrir tabela da Série B / Sugestão de novo filtro"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Descrição detalhada</label>
              <textarea
                rows={4}
                maxLength={1500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conte o que aconteceu (clube, rodada, tela) ou detalhe sua sugestão..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-xs text-white placeholder-slate-500 outline-none resize-y"
              />
              <div className="text-[10px] text-slate-500 text-right font-mono tabular-nums">
                {message.length}/1500
              </div>
            </div>

            {status && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                  status.type === 'ok'
                    ? 'bg-emerald-950/50 border-emerald-500/35 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-500/35 text-rose-300'
                }`}
              >
                {status.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{status.text}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-500">
                {trainerAuth.session
                  ? `Enviando como ${trainerAuth.session.displayName}`
                  : 'Modo visitante: relato salvo localmente até login'}
              </span>
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-60 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Enviando...' : 'Enviar Relato'}</span>
              </button>
            </div>
          </form>

          {mySent.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="text-xs font-bold text-slate-300">
                Seus envios recentes ({mySent.length})
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {mySent.slice(0, 6).map((item) => (
                  <div
                    key={item.feedbackId}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{item.message}</div>
                    </div>
                    <span className="text-[10px] font-mono text-sky-300 shrink-0 uppercase">
                      {item.status === 'resolved'
                        ? 'Resolvido'
                        : item.status === 'reviewed'
                        ? 'Em análise'
                        : 'Aberto'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">
                Política de Privacidade &amp; Termos de Uso · PATOFOOT
              </h4>
              <p className="text-[11px] text-slate-400">Última atualização: Novembro de 2026</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h5 className="font-bold text-white mb-1">1. Armazenamento Local e na Nuvem</h5>
              <p className="text-slate-400">
                Suas carreiras são salvas localmente no navegador (IndexedDB / localStorage) e podem
                ser exportadas em arquivo <span className="font-mono text-slate-300">.json</span> a
                qualquer momento. Caso opte por entrar com sua conta Google, suas carreiras em nuvem
                são gravadas de forma privada e vinculadas exclusivamente ao seu identificador de
                usuário no Firebase Firestore.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white mb-1">2. Dados Coletados e Uso</h5>
              <p className="text-slate-400">
                Coletamos apenas o mínimo necessário para o funcionamento dos recursos online: nome
                de treinador escolhido, identificador autenticado, saves sincronizados, relatos de
                erro/feedback enviados por você e, somente se você clicar em publicar, sua pontuação
                pública no Ranking Global (sem exibir e-mail ou dados pessoais). Não vendemos dados a
                terceiros e não exibimos anúncios invasivos.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white mb-1">3. Controle e Exclusão de Dados</h5>
              <p className="text-slate-400">
                Você pode apagar seus saves locais em <strong className="text-white">Configurações → Carreira</strong>,
                excluir slots em nuvem em <strong className="text-white">Salvar / Carregar</strong> e
                remover sua entrada do Ranking Global a qualquer momento com um clique.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white mb-1">4. Termos de Uso</h5>
              <p className="text-slate-400">
                O PATOFOOT é um simulador gratuito de gerenciamento de futebol criado para
                entretenimento. Os dados de clubes, atletas e calendários são simulações esportivas
                independentes sem vínculo oficial com federações.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

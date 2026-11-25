import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Laptop,
  RefreshCw,
  Send,
  ShieldAlert,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import {
  captureErrorLog,
  deleteErrorLog,
  ErrorLogDeviceType,
  ErrorLogRecord,
  ErrorLogSeverity,
  ErrorLogStatus,
  flushQueuedErrorLogs,
  getPendingErrorLogCount,
  isErrorLogsAdmin,
  subscribeToErrorLogs,
  updateErrorLogStatus,
} from '../services/errorLoggerService';
import { soundEngine } from '../services/soundEngine';

const SOURCE_LABELS: Record<string, string> = {
  react_boundary: 'Renderização React',
  window_error: 'Erro JS Global',
  unhandled_rejection: 'Promise Rejeitada',
  firestore: 'Firebase / Firestore',
  game_engine: 'Motor do Jogo',
  manual_test: 'Teste Manual',
};

const SEVERITY_BADGES: Record<ErrorLogSeverity, string> = {
  critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  error: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  warning: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
};

const STATUS_BADGES: Record<ErrorLogStatus, string> = {
  open: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
  resolved: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
  ignored: 'bg-slate-800/80 text-slate-400 border-slate-700',
};

export const ErrorLogsMonitorPanel: React.FC = () => {
  const [logs, setLogs] = useState<ErrorLogRecord[]>([]);
  const [scope, setScope] = useState<'global_admin' | 'user_own'>('user_own');
  const [isSignedIn, setIsSignedIn] = useState<boolean>(Boolean(auth.currentUser));
  const [isAdmin, setIsAdmin] = useState<boolean>(isErrorLogsAdmin());
  const [pendingLocalCount, setPendingLocalCount] = useState<number>(getPendingErrorLogCount());
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [deviceFilter, setDeviceFilter] = useState<'all' | ErrorLogDeviceType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ErrorLogStatus>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeLogs: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeLogs) {
        unsubscribeLogs();
        unsubscribeLogs = null;
      }

      setIsSignedIn(Boolean(user));
      setIsAdmin(isErrorLogsAdmin());
      setPendingLocalCount(getPendingErrorLogCount());

      if (!user) {
        setLogs([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      void flushQueuedErrorLogs().then(() => {
        setPendingLocalCount(getPendingErrorLogCount());
      });

      unsubscribeLogs = subscribeToErrorLogs(
        (incomingLogs, activeScope) => {
          setLogs(incomingLogs);
          setScope(activeScope);
          setLoading(false);
          setErrorMessage(null);
        },
        (errMsg) => {
          setErrorMessage(errMsg);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, []);

  const stats = useMemo(() => {
    const openCount = logs.filter((l) => l.status === 'open').length;
    const criticalCount = logs.filter((l) => l.severity === 'critical' && l.status === 'open').length;
    const mobileCount = logs.filter((l) => l.deviceType === 'mobile').length;
    const desktopCount = logs.filter((l) => l.deviceType === 'desktop').length;
    const tabletCount = logs.filter((l) => l.deviceType === 'tablet').length;
    const pwaCount = logs.filter((l) => l.displayMode === 'pwa_standalone').length;
    return { openCount, criticalCount, mobileCount, desktopCount, tabletCount, pwaCount };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      if (deviceFilter !== 'all' && item.deviceType !== deviceFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [logs, deviceFilter, statusFilter]);

  const handleSendTestLog = async () => {
    soundEngine.playClick();
    setSendingTest(true);
    setFeedback(null);
    try {
      const sentNow = await captureErrorLog({
        message: 'Teste de diagnóstico em tempo real (monitoramento de estabilidade)',
        stack: 'ManualDiagnosticTest -> SettingsModal -> FirebaseErrorLogger',
        severity: 'warning',
        source: 'manual_test',
      });
      setPendingLocalCount(getPendingErrorLogCount());
      setFeedback(
        sentNow
          ? 'Evento de teste gravado no Firebase em tempo real.'
          : 'Evento salvo na fila offline; será enviado ao entrar na conta Firebase.'
      );
    } finally {
      setSendingTest(false);
    }
  };

  const handleFlushQueue = async () => {
    soundEngine.playClick();
    const sent = await flushQueuedErrorLogs();
    setPendingLocalCount(getPendingErrorLogCount());
    setFeedback(
      sent > 0
        ? `${sent} log(s) pendente(s) sincronizado(s) com o Firebase.`
        : 'Nenhum log pendente para sincronizar agora.'
    );
  };

  const handleChangeStatus = async (logId: string, nextStatus: ErrorLogStatus) => {
    soundEngine.playClick();
    try {
      await updateErrorLogStatus(logId, nextStatus);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao atualizar status.');
    }
  };

  const handleDeleteLog = async (logId: string) => {
    soundEngine.playClick();
    try {
      await deleteErrorLog(logId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao remover log.');
    }
  };

  const renderDeviceIcon = (deviceType: ErrorLogDeviceType) => {
    if (deviceType === 'mobile') return <Smartphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    if (deviceType === 'tablet') return <Tablet className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    return <Laptop className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Monitor de Estabilidade em Tempo Real</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin && scope === 'global_admin'
              ? 'Modo Administrador: visualizando exceções de todos os dispositivos em tempo real.'
              : 'Captura automática ativa para crashes React, erros JS, Promises e falhas do Firestore.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pendingLocalCount > 0 && (
            <button
              type="button"
              onClick={() => void handleFlushQueue()}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Enviar fila ({pendingLocalCount})</span>
            </button>
          )}
          <button
            type="button"
            disabled={sendingTest}
            onClick={() => void handleSendTestLog()}
            className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 shrink-0" />
            <span>{sendingTest ? 'Enviando...' : 'Testar Captura'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMessage && (
        <div className="px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="break-words">{errorMessage}</span>
        </div>
      )}

      {!isSignedIn ? (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Entre na sua conta Firebase para sincronizar e consultar logs</span>
          </div>
          <p className="text-slate-400">
            Exceções ocorridas antes do login ficam salvas localmente na fila ({pendingLocalCount} pendente
            {pendingLocalCount === 1 ? '' : 's'}) e são enviadas automaticamente ao autenticar.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Abertos</div>
              <div className="text-lg font-extrabold font-mono text-white mt-0.5">
                {stats.openCount}
              </div>
              <div className="text-[10px] text-rose-400 font-semibold">
                {stats.criticalCount} crítico{stats.criticalCount === 1 ? '' : 's'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Celular</div>
              <div className="text-lg font-extrabold font-mono text-sky-300 mt-0.5">
                {stats.mobileCount}
              </div>
              <div className="text-[10px] text-slate-500">{stats.tabletCount} tablet</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">PC / Desktop</div>
              <div className="text-lg font-extrabold font-mono text-emerald-300 mt-0.5">
                {stats.desktopCount}
              </div>
              <div className="text-[10px] text-slate-500">Web desktop</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">App PWA</div>
              <div className="text-lg font-extrabold font-mono text-amber-300 mt-0.5">
                {stats.pwaCount}
              </div>
              <div className="text-[10px] text-slate-500">Tela cheia</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-[11px]">
              {(['all', 'mobile', 'tablet', 'desktop'] as const).map((dev) => (
                <button
                  key={dev}
                  type="button"
                  onClick={() => setDeviceFilter(dev)}
                  className={`px-2 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                    deviceFilter === dev
                      ? 'bg-sky-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {dev === 'all'
                    ? 'Todos'
                    : dev === 'mobile'
                    ? 'Celular'
                    : dev === 'tablet'
                    ? 'Tablet'
                    : 'PC'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-[11px]">
              {(['all', 'open', 'resolved', 'ignored'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                    statusFilter === st
                      ? 'bg-slate-200 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'all'
                    ? 'Todos'
                    : st === 'open'
                    ? 'Abertos'
                    : st === 'resolved'
                    ? 'Resolvidos'
                    : 'Ignorados'}
                </button>
              ))}
            </div>
          </div>

          {/* Real-Time Log Feed */}
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Conectando ao fluxo em tempo real do Firebase...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
              <div className="text-xs font-bold text-white">Nenhuma exceção registrada neste filtro</div>
              <p className="text-[11px] text-slate-400">
                O sistema está estável. Use &quot;Testar Captura&quot; acima para validar o envio ao Firebase.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {filteredLogs.map((item) => {
                const isExpanded = expandedLogId === item.logId;
                const formattedTime = new Date(item.createdAtMs).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div
                    key={item.logId}
                    className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : item.logId)}
                      className="w-full p-3 text-left flex items-start justify-between gap-2 hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold uppercase ${SEVERITY_BADGES[item.severity]}`}
                          >
                            {item.severity}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${STATUS_BADGES[item.status]}`}
                          >
                            {item.status === 'open'
                              ? 'Aberto'
                              : item.status === 'resolved'
                              ? 'Resolvido'
                              : 'Ignorado'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {SOURCE_LABELS[item.source] || item.source}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{formattedTime}</span>
                        </div>

                        <div className="text-xs font-semibold text-white break-words">
                          {item.message}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            {renderDeviceIcon(item.deviceType)}
                            <span>
                              {item.os} · {item.browser}
                            </span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {item.viewport} · {item.displayMode === 'pwa_standalone' ? 'PWA' : 'Web'}
                          </span>
                          <span className="text-[10px] text-sky-400 truncate max-w-[180px]">
                            {item.route}
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-400 shrink-0 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-2 border-t border-slate-800/80 bg-slate-950/60 space-y-2.5">
                        <div className="text-[10px] text-slate-400 font-mono flex flex-wrap gap-x-3 gap-y-1">
                          <span>ID: {item.logId}</span>
                          <span>Hash: {item.fingerprint}</span>
                          <span>v{item.appVersion}</span>
                          <span>{item.online ? 'Online' : 'Offline na captura'}</span>
                        </div>

                        {item.stack ? (
                          <pre className="p-2.5 rounded-lg bg-black/70 border border-slate-800 text-[10px] text-rose-200 font-mono overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                            {item.stack}
                          </pre>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic flex items-center gap-1.5">
                            <AlertOctagon className="w-3.5 h-3.5" />
                            <span>Sem stack trace adicional para este evento.</span>
                          </div>
                        )}

                        {isAdmin && (
                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                            {item.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => void handleChangeStatus(item.logId, 'resolved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Marcar Resolvido
                              </button>
                            )}
                            {item.status !== 'ignored' && (
                              <button
                                type="button"
                                onClick={() => void handleChangeStatus(item.logId, 'ignored')}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Ignorar
                              </button>
                            )}
                            {item.status !== 'open' && (
                              <button
                                type="button"
                                onClick={() => void handleChangeStatus(item.logId, 'open')}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Reabrir
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleDeleteLog(item.logId)}
                              className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/35 text-rose-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

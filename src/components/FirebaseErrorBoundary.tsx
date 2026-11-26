import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { captureErrorLog } from '../services/errorLoggerService';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let friendly = error?.message || 'Erro inesperado na aplicação.';
    try {
      const parsed = JSON.parse(friendly);
      if (parsed && typeof parsed.error === 'string') {
        friendly = `Falha de sincronização no banco de dados (${parsed.operationType || 'acesso'}): ${parsed.error}`;
      }
    } catch {
      // Plain text error
    }
    return { hasError: true, errorMessage: friendly };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[PATOFOOT ErrorBoundary]:', error, errorInfo);
    const combinedStack = [error?.stack || '', errorInfo?.componentStack || '']
      .filter(Boolean)
      .join('\n--- Component Stack ---\n');
    void captureErrorLog({
      error,
      message: error?.message || 'Exceção crítica na renderização React',
      stack: combinedStack,
      severity: 'critical',
      source: 'react_boundary',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070c16] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0c1424] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Ocorreu um imprevisto técnico
                </h2>
                <p className="text-xs text-slate-400">
                  Seus dados salvos localmente permanecem protegidos
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono break-words">
              {this.state.errorMessage}
            </p>

            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Recarregar PATOFOOT 2027</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

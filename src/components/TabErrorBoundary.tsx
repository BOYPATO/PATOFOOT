import React from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { captureErrorLog } from '../services/errorLoggerService';

interface TabErrorBoundaryProps {
  resetKey: string;
  onRecoverToHub: () => void;
  children: React.ReactNode;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Isolates runtime rendering errors to the active tab so the sidebar, header,
 * autosave engine, and career progress remain intact and immediately recoverable.
 */
export class TabErrorBoundary extends React.Component<
  TabErrorBoundaryProps,
  TabErrorBoundaryState
> {
  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro inesperado ao exibir esta tela.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[PATOFOOT TabErrorBoundary]:', error, errorInfo);
    const combinedStack = [error?.stack || '', errorInfo?.componentStack || '']
      .filter(Boolean)
      .join('\n--- Component Stack ---\n');
    void captureErrorLog({
      error,
      message: error?.message || 'Exceção recuperável na aba ativa',
      stack: combinedStack,
      severity: 'error',
      source: 'react_boundary',
    });
  }

  componentDidUpdate(prevProps: TabErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#0c1424] border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto my-8 space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Esta tela encontrou um erro temporário
              </h2>
              <p className="text-xs text-slate-400">
                Sua carreira e seu progresso continuam salvos com segurança.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono break-words">
            {this.state.errorMessage}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Tentar Novamente</span>
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                this.props.onRecoverToHub();
              }}
              className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Voltar à Central do Clube</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

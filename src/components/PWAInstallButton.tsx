import React, { useState } from 'react';
import { Download, Laptop, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundEngine } from '../services/soundEngine';

interface PWAInstallButtonProps {
  compact?: boolean;
  alwaysShow?: boolean;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  alwaysShow = false,
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Never show when already running as an installed standalone PWA
  if (isInstalled) return null;
  if (!alwaysShow && !isInstallable && !isIOS) return null;

  const handleClick = async () => {
    soundEngine.playClick();
    if (isInstallable) {
      await promptInstall();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        title="Instalar PATOFOOT 2026 como aplicativo no dispositivo"
        className={`inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 hover:text-emerald-200 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
        } ${className}`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Instalar App</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0c1424] border border-slate-700/80 p-5 my-auto shadow-2xl space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {isIOS
                    ? 'Instalar no iPhone / iPad'
                    : 'Instalar PATOFOOT 2026 como App'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
                <li>
                  Toque no botão{' '}
                  <strong className="text-white inline-flex items-center gap-1">
                    Compartilhar <Share className="w-3.5 h-3.5 inline text-sky-400" />
                  </strong>{' '}
                  na barra do Safari.
                </li>
                <li>
                  Role para baixo e toque em{' '}
                  <strong className="text-white">&quot;Adicionar à Tela de Início&quot;</strong>.
                </li>
                <li>
                  Confirme tocando em{' '}
                  <strong className="text-emerald-300">&quot;Adicionar&quot;</strong> para jogar em
                  tela cheia e offline.
                </li>
              </ol>
            ) : (
              <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
                <div className="space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Android (Chrome / Edge)</span>
                  </div>
                  <p>
                    Abra o menu do navegador (<strong className="text-white">⋮</strong>) e toque em{' '}
                    <strong className="text-white">&quot;Instalar aplicativo&quot;</strong> ou{' '}
                    <strong className="text-white">&quot;Adicionar à tela inicial&quot;</strong>.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>Windows / macOS (Chrome / Edge)</span>
                  </div>
                  <p>
                    Clique no ícone de instalação na barra de endereços do navegador ou acesse o
                    menu → <strong className="text-white">Salvar e compartilhar</strong> →{' '}
                    <strong className="text-white">Instalar PATOFOOT 2026</strong>.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

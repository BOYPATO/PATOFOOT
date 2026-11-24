import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[4.25rem] lg:bottom-3 left-1/2 -translate-x-1/2 z-[75] px-3.5 py-2 rounded-xl bg-amber-950/95 border border-amber-500/50 text-amber-200 text-xs font-semibold shadow-xl flex items-center gap-2 backdrop-blur-md max-w-[92vw]"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span className="truncate">
        Modo Offline ativo · Seus saves locais continuam funcionando normalmente
      </span>
    </div>
  );
};

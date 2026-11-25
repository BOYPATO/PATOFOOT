import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { FirebaseErrorBoundary } from './components/FirebaseErrorBoundary.tsx';
import { installGlobalErrorMonitoring } from './services/errorLoggerService.ts';
import './index.css';

installGlobalErrorMonitoring();

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
  let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = canonicalUrl;

  let ogUrlMeta = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (!ogUrlMeta) {
    ogUrlMeta = document.createElement('meta');
    ogUrlMeta.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrlMeta);
  }
  ogUrlMeta.content = canonicalUrl;

  // Register PWA Service Worker for offline caching and native app installability
  try {
    registerSW({
      immediate: true,
      onRegisterError() {
        // Ignore service worker registration errors in restricted iframe sandboxes
      },
    });
  } catch {
    // Fallback cleanly if SW API is unavailable
  }
}

createRoot(document.getElementById('root')!).render(
  <FirebaseErrorBoundary>
    <App />
  </FirebaseErrorBoundary>
);

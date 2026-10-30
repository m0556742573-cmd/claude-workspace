import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles.css';

// The page and its files stay on the tablet, so the booth opens without a network (public/sw.js).
if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
// On the very first visit the page and its files came before the keeper was there: they are kept now, so the booth opens
// without a network from the first time on (30/10; the cache's name is sw.js's).
if (import.meta.env.PROD && 'caches' in window && location.pathname === '/') {
  addEventListener('load', () => {
    const files = performance.getEntriesByType('resource').map((r) => r.name).filter((u) => u.startsWith(location.origin + '/assets/'));
    caches.open('booth-1').then((c) => c.addAll(['/', ...files])).catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

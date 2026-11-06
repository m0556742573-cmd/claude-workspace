// The marketing site (יצחק 5/11: "קודם יהיה האתר ... שיווקי ... ושם יהיה התחברות או הרשמה"; pushed 6/11).
// Whoever is not signed in sees it at the app's own address; a signed-in exhibitor never does, so the booth, the offline
// copy and Google's return to location.origin stay as they were. The page is marketing/site/landing.html, moved here as is:
// its own look lives in a shadow root, so neither its styles nor the app's leak into the other.
import { useEffect, useRef } from 'react';
import html from './landing/page.html?raw';
import css from './landing/page.css?raw';
import { SYM } from './brand.tsx';

export type Enter = 'signin' | 'signup';

export function Landing({ onEnter }: { onEnter: (how: Enter) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const enter = useRef(onEnter);
  enter.current = onEnter;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const root = el.shadowRoot ?? el.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${css}</style>${html}`;
    // The ExpoMax mark, from brand.tsx: in the corner it is lit orange; behind the sections a pale ghost; on the orange close, forest.
    root.querySelectorAll('svg.sym').forEach((s) => {
      s.setAttribute('viewBox', SYM.vb);
      const gh = s.classList.contains('gh'), big = s.classList.contains('big');
      const loose = gh ? '#F2F5EE' : big ? '#0B1A13' : '#7F9488', lit = gh ? '#F2F5EE' : big ? '#0B1A13' : '#F8AC00';
      s.innerHTML = SYM.loose.map((d) => `<path d="${d}" fill="${loose}"/>`).join('') + SYM.lit.map((d) => `<path d="${d}" fill="${lit}"/>`).join('');
    });
    const click = (e: Event) => {
      const a = (e.target as Element).closest?.('a');
      const href = a?.getAttribute('href');
      if (href === '#signin' || href === '#signup') { e.preventDefault(); enter.current(href.slice(1) as Enter); }
      else if (href === '#') { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); }
    };
    root.addEventListener('click', click);
    const title = document.title;
    document.title = 'אקספומקס · מערכת למציגים באקספו';
    return () => { root.removeEventListener('click', click); document.title = title; };
  }, []);

  return <div ref={host} />;
}

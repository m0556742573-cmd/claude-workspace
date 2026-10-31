// The ExpoMax mark (design system TE84PqgQbuB8QQnXRFEJWw, 30/10): three chevrons, the two lower ones still on their way
// (sage), the top one arrived (the expo orange); the name in Heebo 500 with "מקס" in orange. Geometry copied from the
// design system's bundle, never redrawn. Under 32px the small cut, two thick chevrons, takes over.
import type { CSSProperties } from 'react';

const SYM = {"vb":"51 69 154 159","w":154,"h":159,"loose":["M57.50 203.69 L121.50 166.74 A13 13 0 0 1 134.50 189.26 L70.50 226.21 A13 13 0 0 1 57.50 203.69 Z","M185.50 226.21 L121.50 189.26 A13 13 0 0 1 134.50 166.74 L198.50 203.69 A13 13 0 0 1 185.50 226.21 Z","M57.50 155.69 L121.50 118.74 A13 13 0 0 1 134.50 141.26 L70.50 178.21 A13 13 0 0 1 57.50 155.69 Z","M185.50 178.21 L121.50 141.26 A13 13 0 0 1 134.50 118.74 L198.50 155.69 A13 13 0 0 1 185.50 178.21 Z"],"lit":["M57.50 107.69 L121.50 70.74 A13 13 0 0 1 134.50 93.26 L70.50 130.21 A13 13 0 0 1 57.50 107.69 Z","M185.50 130.21 L121.50 93.26 A13 13 0 0 1 134.50 70.74 L198.50 107.69 A13 13 0 0 1 185.50 130.21 Z"]};
const SYM_SMALL = {"vb":"41 77 174 147","w":174,"h":147,"loose":["M49.50 191.69 L119.50 151.28 A17 17 0 0 1 136.50 180.72 L66.50 221.14 A17 17 0 0 1 49.50 191.69 Z","M189.50 221.14 L119.50 180.72 A17 17 0 0 1 136.50 151.28 L206.50 191.69 A17 17 0 0 1 189.50 221.14 Z"],"lit":["M49.50 119.69 L119.50 79.28 A17 17 0 0 1 136.50 108.72 L66.50 149.14 A17 17 0 0 1 49.50 119.69 Z","M189.50 149.14 L119.50 108.72 A17 17 0 0 1 136.50 79.28 L206.50 119.69 A17 17 0 0 1 189.50 149.14 Z"]};
const YHM = {"vb":"-12 -12 396 172","w":396,"h":172,"letters":["M-0.44 0.00 L43.56 66.87 L64.44 53.13 L29.49 0.00 Z","M78.51 0.00 L43.56 53.13 L64.44 66.87 L108.44 0.00 Z","M41.50 40.00 L41.50 100.00 L66.50 100.00 L66.50 40.00 Z","M43.56 53.13 L64.44 53.13 L64.44 66.87 L43.56 66.87 Z","M120.00 0.00 L120.00 100.00 L145.00 100.00 L145.00 0.00 Z","M199.00 0.00 L199.00 100.00 L224.00 100.00 L224.00 0.00 Z","M242.00 0.00 L242.00 100.00 L267.00 100.00 L267.00 0.00 Z","M347.00 0.00 L347.00 100.00 L372.00 100.00 L372.00 0.00 Z","M242.30 0.00 L296.54 82.85 L317.46 69.15 L272.18 0.00 Z","M341.82 0.00 L296.54 69.15 L317.46 82.85 L371.70 0.00 Z","M296.54 69.15 L317.46 69.15 L317.46 82.85 L296.54 82.85 Z","M132.50 61.00 L211.50 61.00 L211.50 39.00 L132.50 39.00 Z"],"loose":["M274.55 118.15 L301.36 110.47 A8 8 0 0 1 305.77 125.85 L278.96 133.53 A8 8 0 0 1 274.55 118.15 Z","M337.71 118.90 L365.18 123.74 A8 8 0 0 1 362.40 139.50 L334.93 134.66 A8 8 0 0 1 337.71 118.90 Z"],"line":["M8.00 118.00 L244.22 118.00 A8 8 0 0 1 244.22 134.00 L8.00 134.00 A8 8 0 0 1 8.00 118.00 Z"]};

function Chevrons({ height }: { height: number }) {
  const s = height < 32 ? SYM_SMALL : SYM;
  return (
    <svg className="x-sym" viewBox={s.vb} width={(height * s.w) / s.h} height={height} aria-hidden="true">
      {s.loose.map((p, i) => <path key={'l' + i} d={p} className="x-sym__loose" />)}
      {s.lit.map((p, i) => <path key={'t' + i} d={p} className="x-sym__lit" />)}
    </svg>
  );
}

function YhmMark({ height }: { height: number }) {
  return (
    <svg className="x-yhm" viewBox={YHM.vb} width={(height * YHM.w) / YHM.h} height={height} aria-hidden="true">
      {(['letters', 'loose', 'line'] as const).map((part) => YHM[part].map((p, i) => <path key={part + i} d={p} className={'x-yhm__' + part} />))}
    </svg>
  );
}

/** height: the chevrons' height; the name follows it. endorsed: with "מבית YHM" (only where the lockup is wider than 240px). */
export function Logo({ height = 40, layout = 'horizontal', endorsed, className, style }: {
  height?: number; layout?: 'horizontal' | 'stacked' | 'symbol' | 'name'; endorsed?: boolean; className?: string; style?: CSSProperties;
}) {
  const fs = layout === 'stacked' ? height * 0.78 : height * 1.03;
  const text = (
    <span className="x-logo__text">
      <span className="x-logo__name" style={{ fontSize: fs }}>אקספו<i>מקס</i></span>
      {endorsed && <span className="x-logo__by" style={{ fontSize: Math.max(11, fs * 0.19) }}>מבית<YhmMark height={Math.max(12, fs * 0.26)} /></span>}
    </span>
  );
  return (
    <span role="img" aria-label={endorsed ? 'אקספומקס, מבית YHM' : 'אקספומקס'} className={['x-logo', 'x-logo--' + layout, className].filter(Boolean).join(' ')}
      style={{ ['--xl-h' as string]: height + 'px', ...style }}>
      {layout !== 'name' && <span className="x-logo__sym"><Chevrons height={height} /></span>}
      {layout !== 'symbol' && text}
    </span>
  );
}

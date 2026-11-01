import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './SplashScreen.css';

const SESSION_KEY = 'thiri:splash-seen:v1';
let seenInMemory = false;

function hasSeenSplash() {
  if (seenInMemory) return true;
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; }
  catch { return false; }
}

function markSeen() {
  seenInMemory = true;
  try { sessionStorage.setItem(SESSION_KEY, '1'); }
  catch { /* Private browsing or disabled storage: the module fallback still works. */ }
}

// The original approved PNG is revealed in two clipped regions. No logo is redrawn.
export function ThiriLogo({ logoSrc, animated = false }: { logoSrc: string; animated?: boolean }) {
  const id = useId();
  return (
    <svg className="thiri-logo" viewBox="105 360 1040 550" role="img" aria-label="Thiri">
      <defs>
        <clipPath id={`${id}-icon`}><rect x="0" y="0" width="547" height="1254" /></clipPath>
        <clipPath id={`${id}-word`}><rect x="547" y="0" width="707" height="1254" /></clipPath>
      </defs>
      <g clipPath={`url(#${id}-icon)`}>
        <image className={animated ? 'thiri-icon-reveal' : undefined} href={logoSrc} width="1254" height="1254" />
      </g>
      <g clipPath={`url(#${id}-word)`}>
        <image className={animated ? 'thiri-word-reveal' : undefined} href={logoSrc} width="1254" height="1254" />
      </g>
    </svg>
  );
}

function KolamFallback() {
  return (
    <svg viewBox="0 0 400 400" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <defs>
        <path id="thiri-kolam-loop" d="M200 30C240 70 330 120 330 200S240 330 200 370C160 330 70 280 70 200S160 70 200 30ZM200 70C160 110 110 160 110 200S160 290 200 330C240 290 290 240 290 200S240 110 200 70Z" />
      </defs>
      <use href="#thiri-kolam-loop" /><use href="#thiri-kolam-loop" transform="rotate(90 200 200)" />
      <path d="M60 60Q200 140 340 60Q260 200 340 340Q200 260 60 340Q140 200 60 60Z" />
      {[120, 160, 200, 240, 280].flatMap(x => [120, 160, 200, 240, 280].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="currentColor" stroke="none" />))}
    </svg>
  );
}

/** Presentational splash. It never requests permission or imports camera/AR code. */
export function SplashScreen({ logoSrc, kolamSrc, running, exiting, logoFailed }: { logoSrc: string; kolamSrc?: string | null; running: boolean; exiting: boolean; logoFailed: boolean }) {
  const [kolamFailed, setKolamFailed] = useState(false);
  return (
    <div className={`thiri-splash${running ? ' is-running' : ''}${exiting ? ' is-exiting' : ''}`} role="status" aria-label="Opening Thiri">
      <div className="thiri-kolam" aria-hidden="true">
        {kolamSrc && !kolamFailed ? <img src={kolamSrc} alt="" onError={() => setKolamFailed(true)} /> : <KolamFallback />}
      </div>
      <div className="thiri-brand">
        <div className="thiri-glow" aria-hidden="true" />
        {logoFailed ? <span className="thiri-brand-error">Thiri</span> : <ThiriLogo logoSrc={logoSrc} animated />}
      </div>
    </div>
  );
}

/** Mount once above the app routes; the splash never starts camera access. */
export default function SplashGate({
  children,
  logoSrc = `${import.meta.env.BASE_URL}assets/branding/thiri-logo.png`,
  kolamSrc = `${import.meta.env.BASE_URL}assets/decorations/kolam-background.svg`,
}: { children: ReactNode; logoSrc?: string; kolamSrc?: string | null }) {
  const [phase, setPhase] = useState<'waiting' | 'running' | 'exiting' | 'done'>(() => hasSeenSplash() ? 'done' : 'waiting');
  const [logoFailed, setLogoFailed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sequenceActive = phase === 'running' || phase === 'exiting';

  useEffect(() => {
    if (phase !== 'waiting') return;
    let cancelled = false;
    const image = new Image();
    const ready = () => { if (!cancelled) setPhase('running'); };
    image.onload = ready;
    image.onerror = () => { if (!cancelled) { setLogoFailed(true); ready(); } };
    image.src = logoSrc;
    return () => { cancelled = true; image.onload = null; image.onerror = null; };
  }, [phase, logoSrc]);

  useEffect(() => {
    if (!sequenceActive) return;
    markSeen();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let revealTimer: number | undefined;
    let finishTimer: number | undefined;
    const finish = () => { setPhase('done'); };
    const onMotionChange = () => { if (media.matches) finish(); };
    if (media.matches) { finish(); return; }
    revealTimer = window.setTimeout(() => setPhase('exiting'), 1400);
    finishTimer = window.setTimeout(finish, 2000);
    media.addEventListener('change', onMotionChange);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(finishTimer);
      media.removeEventListener('change', onMotionChange);
    };
    // The sequence owns both phases; changing to exiting must not cancel its end timer.
  }, [sequenceActive]);

  useEffect(() => {
    if (phase === 'done') contentRef.current?.querySelector<HTMLElement>('[data-splash-focus]')?.focus({ preventScroll: true });
  }, [phase]);

  const done = phase === 'done';
  const reveal = done || phase === 'exiting';
  return (
    <div className={`thiri-launch${done ? ' is-done' : ''}`}>
      <div ref={contentRef} className={`thiri-launch-content${reveal ? ' is-visible' : ''}`} aria-hidden={!done} inert={!done}>
        {reveal ? children : null}
      </div>
      {!done && <SplashScreen logoSrc={logoSrc} kolamSrc={kolamSrc} running={phase !== 'waiting'} exiting={phase === 'exiting'} logoFailed={logoFailed} />}
    </div>
  );
}

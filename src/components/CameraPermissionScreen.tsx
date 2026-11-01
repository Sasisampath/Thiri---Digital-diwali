import { useEffect, useRef } from 'react';
import { ThiriLogo } from './SplashScreen';
import AssetImage from './AssetImage';
import type { CameraErrorKind } from '../hooks/useCamera';
import './CameraScreens.css';

type Props = { onBack: () => void; onEnable: () => void; requesting: boolean; error: string | null; errorKind: CameraErrorKind | null };
const assets = `${import.meta.env.BASE_URL}assets/`;
const titles: Record<CameraErrorKind, string> = {
  denied: 'Camera access is off', missing: 'No camera found', busy: 'Your camera is busy', unsupported: 'Try another browser',
  insecure: 'A secure connection is needed', rear: 'Let’s use a rear camera', initialization: 'Let’s try that again',
};

export default function CameraPermissionScreen({ onBack, onEnable, requesting, error, errorKind }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <main className={`camera-permission${error ? ' has-camera-error' : ''}`}>
    <header className="permission-header">
      <button className="thiri-back-button" type="button" onClick={onBack} aria-label="Back to Welcome">←</button>
      <ThiriLogo logoSrc={`${assets}branding/thiri-logo.png`} />
    </header>
    <div className="permission-hero" aria-hidden="true">
      <img className="permission-kolam" src={`${assets}decorations/kolam-background.svg`} width="400" height="400" alt="" />
      <div className="permission-phone"><AssetImage src={`${assets}onboarding/ar_fireworks_smartphone_render.png`} width="1254" height="1254" alt="" decoding="async" fetchPriority="high" /></div>
    </div>
    <section className="permission-copy" aria-labelledby="permission-title" role={error ? 'alert' : undefined}>
      <h1 id="permission-title" ref={heading} tabIndex={-1} data-splash-focus>{error ? titles[errorKind ?? 'initialization'] : <>Bring Diwali into<br />your world.</>}</h1>
      <p className="permission-description">{error ?? 'Use your camera to place and light virtual crackers in your surroundings.'}</p>
    </section>
    <div className="camera-privacy">
      <div className="privacy-icon" aria-hidden="true"><AssetImage src={`${assets}onboarding/secure_purple_camera_icon.png`} width="1254" height="1254" alt="" decoding="async" /></div>
      <p>Your camera is used for the AR experience.</p>
    </div>
    <footer className="permission-footer">
      {errorKind === 'denied' && <details className="permission-help">
        <summary>Safari or Chrome permission help</summary>
        <div className="permission-help-content">
          <p><strong>Safari on iPhone:</strong> Open this page’s website settings from Safari’s page menu. Set Camera to Ask or Allow, then return here.</p>
          <p><strong>Chrome on Android:</strong> Open Settings → Site settings → Camera. Select this site under Blocked and allow access.</p>
          <p><a href="https://support.apple.com/guide/iphone/iphb01fc3c85/ios" target="_blank" rel="noreferrer">Safari help ↗</a><a href="https://support.google.com/chrome/answer/2693767?co=GENIE.Platform%3DAndroid&hl=en" target="_blank" rel="noreferrer">Chrome help ↗</a></p>
        </div>
      </details>}
      <button className="thiri-primary-button" type="button" onClick={onEnable} disabled={requesting} aria-busy={requesting}>{requesting ? 'Waiting for permission…' : error ? 'Try Again' : 'Enable Camera'}{!requesting && <span aria-hidden="true">→</span>}</button>
      {requesting && <p className="permission-note" role="status">Choose Allow in your browser’s camera prompt.</p>}
      <button className="permission-not-now" type="button" onClick={onBack}>Not now</button>
    </footer>
  </main>;
}

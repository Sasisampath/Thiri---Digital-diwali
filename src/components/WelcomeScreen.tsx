import { ThiriLogo } from './SplashScreen';
import AssetImage from './AssetImage';
import './WelcomeScreen.css';

const assets = `${import.meta.env.BASE_URL}assets/`;

/** Camera access is handled only on the following explanation screen. */
export default function WelcomeScreen({ onGetStarted }: { onGetStarted: () => void }) {
  return <main className="thiri-welcome">
    <header className="welcome-header"><ThiriLogo logoSrc={`${assets}branding/thiri-logo.png`} /></header>
    <div className="welcome-art" aria-hidden="true">
      <img className="welcome-kolam" src={`${assets}decorations/kolam-background.svg`} alt="" width="400" height="400" />
      <div className="firework firework-pot"><AssetImage src={`${assets}crackers/flower-pot.png`} alt="" width="1254" height="1254" decoding="async" /></div>
      <div className="firework firework-rocket"><AssetImage src={`${assets}crackers/rocket.png`} alt="" width="1254" height="1254" decoding="async" /></div>
      <div className="firework firework-chakra"><AssetImage src={`${assets}crackers/ground-chakra.png`} alt="" width="1254" height="1254" decoding="async" /></div>
    </div>
    <div className="welcome-copy">
      <h1 tabIndex={-1} data-splash-focus>Light up<br /><span>your world.</span></h1>
      <p>Celebrate Diwali wherever you are.</p>
    </div>
    <footer className="welcome-footer">
      <button className="thiri-primary-button" type="button" onClick={onGetStarted}>Get Started <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    </footer>
  </main>;
}

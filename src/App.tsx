import { lazy, Suspense, useCallback, useEffect, useState, useRef } from 'react';
import { audioManager } from './lib/audio/audio-manager';
import SplashGate from './components/SplashScreen';
import WelcomeScreen from './components/WelcomeScreen';
import CameraPermissionScreen from './components/CameraPermissionScreen';
import { useCamera } from './hooks/useCamera';

const ScanGroundScreen = lazy(() => import('./components/ar/ScanGroundScreen'));
type Route = 'welcome' | 'permission' | 'camera' | 'choose' | 'place' | 'fuse';
const base = import.meta.env.BASE_URL;
const paths: Record<Route, string> = { welcome: base, permission: `${base}camera-permission`, camera: `${base}camera`, choose: `${base}choose-cracker`, place: `${base}place-cracker`, fuse: `${base}light-fuse` };
const isAR = (route: Route) => route === 'camera' || route === 'choose' || route === 'place' || route === 'fuse';
function currentRoute(): Route {
  if (location.pathname === paths.camera || location.pathname === `${base}scan-ground`) return 'camera';
  if (location.pathname === paths.fuse) return 'fuse';
  if (location.pathname === paths.place) return 'place';
  if (location.pathname === paths.choose) return 'choose';
  if (location.pathname === paths.permission) return 'permission';
  return 'welcome';
}

export default function App() {
  const returnWelcomeFocus=useRef(false);
  const [route, setRoute] = useState<Route>(currentRoute);
  const [arConsent, setArConsent] = useState(false);
  const { stream, requesting, error, errorKind, request, stop, setError } = useCamera();
  const navigate = useCallback((next: Route, replace = false) => {
    if (!isAR(next)) { stop(); setArConsent(false); }
    if (location.pathname !== paths[next]) {
      const debug = import.meta.env.DEV && new URLSearchParams(location.search).has('arDebug') ? '?arDebug=1' : '';
      const depth = history.state?.thiriScanDistance;
      const scanDistance = next === 'camera' ? 0 : isAR(next) && !replace && Number.isInteger(depth) ? depth + 1 : null;
      const state = { thiriFrom: currentRoute(), thiriScanDistance: scanDistance };
      if (replace) history.replaceState(state, '', paths[next] + debug);
      else history.pushState(state, '', paths[next] + debug);
    }
    setRoute(next);
  }, [stop]);

  useEffect(() => {
    const onBack = () => {
      const next = currentRoute();
      if (!isAR(next)) { stop(); setArConsent(false); }
      setRoute(next);
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, [stop]);
  useEffect(() => {
    if (isAR(route) && !arConsent) navigate('permission', true);
  }, [route, arConsent, navigate]);
  useEffect(() => {
    const onVisibility = () => {
      // Inside AR, GroundARSession exclusively owns pause/resume and its camera.
      if (!isAR(route) && document.visibilityState === 'hidden') stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [route, stop]);
  useEffect(() => {
    if (!stream) return;
    const onEnded = () => { stop(); setError('Your camera stopped. Enable it again when you’re ready.'); navigate('permission', true); };
    const tracks = stream.getVideoTracks();
    tracks.forEach(track => track.addEventListener('ended', onEnded));
    return () => tracks.forEach(track => track.removeEventListener('ended', onEnded));
  }, [stream, navigate, stop, setError]);

  const enableCamera = async () => {
    audioManager.unlock();
    const acquired = await request();
    if (!acquired) return;
    // Grant/verify permission using the existing flow, then synchronously release
    // its stream. XR8 starts only after consent and never competes for the camera.
    stop(); setArConsent(true); navigate('camera');
  };
  const backToScan = () => {
    const depth = history.state?.thiriScanDistance;
    if (Number.isInteger(depth) && depth > 0 && depth <= 3) history.go(-depth);
    else navigate('camera', true);
  };
  const backToChoose = () => {
    if (history.state?.thiriFrom === 'choose') history.back();
    else navigate('choose', true);
  };
  const backToPlacement = () => { if (history.state?.thiriFrom === 'place') history.back(); else navigate('place', true); };
  const closeAR = () => { returnWelcomeFocus.current=true; navigate('welcome'); };
  useEffect(()=>{if(route==='welcome'&&returnWelcomeFocus.current){returnWelcomeFocus.current=false;document.querySelector<HTMLElement>('.thiri-welcome [data-splash-focus]')?.focus({preventScroll:true});}},[route]);
  const permissionHelp = () => {
    setError('Enable camera access in your browser settings to experience Thiri in your surroundings.', 'denied');
    navigate('permission');
  };

  return <SplashGate>
    {route === 'welcome' ? <WelcomeScreen onGetStarted={() => { audioManager.unlock(); setError(null); navigate('permission'); }} />
      : isAR(route) && arConsent ? <Suspense fallback={<main className="ar-loading"><p>Getting your camera ready…</p><button type="button" onClick={closeAR}>Back to Welcome</button></main>}>
        <ScanGroundScreen mode={route === 'fuse' ? 'fuse' : route === 'place' ? 'place' : route === 'choose' ? 'choose' : 'scan'} releasePermissionCamera={stop} onClose={closeAR} onChoose={() => navigate('choose')} onPlace={() => navigate('place')} onLightFuse={() => navigate('fuse')} onBackToPlacement={backToPlacement} onBackToChoose={backToChoose} onBackToScan={backToScan} onPermissionHelp={permissionHelp} />
      </Suspense>
      : <CameraPermissionScreen onBack={() => { setError(null); navigate('welcome'); }} onEnable={enableCamera} requesting={requesting} error={error} errorKind={errorKind} />}
  </SplashGate>;
}

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ENGINE_VERSION, GroundARSession } from '../../lib/ar/engine';
import { initialSnapshot, scanMessages } from '../../lib/ar/tracking';
import { getCracker } from '../../config/crackers';
import CrackerSelectionSheet from './CrackerSelectionSheet';
import CrackerPlacementScreen from './CrackerPlacementScreen';
import FirestickInteraction from './FirestickInteraction';
import FireworksOverlay from './FireworksOverlay';
import CelebrationComplete from './CelebrationComplete';
import type { ARFlow } from '../../lib/ar/types';
import ARStatusIndicator from './ARStatusIndicator';
import ScanInstructions from './ScanInstructions';
import '../../styles/scan-ground.css';

type Props = { mode: ARFlow; releasePermissionCamera: () => void; onClose: () => void; onChoose: () => void; onPlace: () => void; onLightFuse: () => void; onBackToPlacement: () => void; onBackToChoose: () => void; onBackToScan: () => void; onPermissionHelp: () => void };
const noopSubscribe = () => () => {};
const initial = () => initialSnapshot;

export default function ScanGroundScreen({ mode, releasePermissionCamera, onClose, onChoose, onPlace, onLightFuse, onBackToPlacement, onBackToChoose, onBackToScan, onPermissionHelp }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [session, setSession] = useState<GroundARSession | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('thiri:sound-enabled') === 'true'; } catch { return false; } });
  const snapshot = useSyncExternalStore(session?.subscribe ?? noopSubscribe, session?.getSnapshot ?? initial);
  const selected = useRef(snapshot.selectedCracker); selected.current = snapshot.selectedCracker;

  useEffect(() => {
    if (!canvas.current) return;
    releasePermissionCamera(); // The preflight camera is stopped BEFORE XR8 can acquire its camera.
    const next = new GroundARSession(canvas.current, selected.current);
    setSession(next); setGuideDismissed(false);
    close.current?.focus({ preventScroll: true });
    void next.start();
    return () => next.dispose();
  }, [attempt, releasePermissionCamera]);
  useEffect(() => {
    if (snapshot.state === 'SEARCHING' || snapshot.state === 'READY') setGuideDismissed(true);
  }, [snapshot.state]);
  useEffect(() => { session?.setFlow(mode); if (mode === 'scan') close.current?.focus({ preventScroll: true }); }, [mode, session]);

  useEffect(() => { session?.setIgnitionSound(sound); }, [session, sound, mode]);
  const returnFromFuse = () => { if(snapshot.ignitionInterrupted || ['FUSE_CONTACT','IGNITING','IGNITED'].includes(snapshot.ignitionPhase)) session?.repositionCracker(); onBackToPlacement(); };

  const exit = () => { session?.dispose(); onClose(); };
  const retry = () => { session?.dispose(); setAttempt(value => value + 1); };
  const choose = () => {
    const confirmed = session?.confirmPlacement();
    if (!confirmed) return;
    onChoose();
  };
  const rescan = () => { session?.rescanCracker(); onBackToScan(); };
  const recenter = () => { session?.recenterCracker(); if (mode === 'fuse') onBackToPlacement(); };
  const light = () => { if (session?.beginFuseStep()) onLightFuse(); };
  const toggleSound = () => setSound(value => {
    try { localStorage.setItem('thiri:sound-enabled', String(!value)); } catch { /* In-memory preference remains available. */ }
    return !value;
  });
  const failed = snapshot.state === 'ERROR' || snapshot.state === 'UNSUPPORTED';
  const ready = snapshot.state === 'READY' && snapshot.candidateValid && !snapshot.paused;
  const showingFireworks = mode === 'fuse' && snapshot.fireworksState !== 'WAITING';
  const chooseAnother = () => { session?.resetForNewCracker(); onBackToChoose(); };
  const replay = () => { if(session?.resetForReplay()==='place')onBackToPlacement(); };
  const completed=mode==='fuse'&&snapshot.fireworksState==='COMPLETED'&&!failed;
  const debug = import.meta.env.DEV && new URLSearchParams(location.search).has('arDebug');

  return <main className={`ar-scan${mode !== 'scan' ? ' is-cracker-flow' : ''}`} aria-label="Scan the Ground AR experience" data-ar-state={snapshot.state}>
    <canvas ref={canvas} className="ar-camera-canvas" aria-label="Live rear-camera AR view" />
    <header className="ar-controls" inert={completed} aria-hidden={completed?true:undefined}>
      <button ref={close} className="ar-circle-button" type="button" aria-label={mode === 'scan' ? 'Close AR and return to Welcome' : mode === 'choose' ? 'Back to Scan the Ground' : mode === 'fuse' ? showingFireworks ? 'Cancel fireworks and return to placement' : 'Back to placement' : 'Back to cracker selection'} onClick={mode === 'scan' ? exit : mode === 'choose' ? onBackToScan : mode === 'fuse' ? returnFromFuse : onBackToChoose}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={mode === 'scan' ? 'm6 6 12 12M18 6 6 18' : 'M19 12H5m7-7-7 7 7 7'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
      {showingFireworks ? <span/> : mode === 'place' || mode === 'fuse' ? <p className="ar-position-title">{mode === 'place' ? 'Position your cracker' : 'Light the Fuse'}</p> : <ARStatusIndicator state={snapshot.state} paused={snapshot.paused} />}
      {mode === 'place' ? <button className="ar-circle-button" type="button" onClick={recenter} disabled={!session || snapshot.state === 'INITIALIZING'} aria-label={snapshot.canRecenter ? 'Recenter view and reset placement' : 'Reset placement'} title="Reset the view and reposition"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/></svg></button>
        : <button className="ar-circle-button" type="button" aria-label={sound ? 'Sound on' : 'Sound off'} aria-pressed={sound} onClick={toggleSound}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m11 5-6 4H2v6h3l6 4V5Z"/>{sound ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/> : <path d="m16 9 6 6m0-6-6 6"/>}</svg></button> }
    </header>
    {!failed && mode === 'scan' && <>
      {!ready && <div className="ar-search-aim" aria-hidden="true"><span/><span/><span/><span/></div>}
      <ScanInstructions dismissed={guideDismissed} />
    </>}
    {failed ? <section className="ar-failure" role="alert">
      <h1>{scanMessages[snapshot.state]}</h1><p>{snapshot.error}</p>
      {(snapshot.errorKind === 'denied' || snapshot.errorKind === 'camera') && <button className="ar-secondary-button" type="button" onClick={() => { session?.dispose(); onPermissionHelp(); }}>Camera permission help</button>}
      {snapshot.state !== 'UNSUPPORTED' && <button className="thiri-primary-button" type="button" onClick={retry}>Retry</button>}
      <button className="ar-secondary-button" type="button" onClick={exit}>Back to Welcome</button>
    </section> : mode === 'choose' ? <CrackerSelectionSheet selected={snapshot.selectedCracker} trackingReady={ready} onSelect={id => session?.selectCracker(id)} onContinue={onPlace} onClose={exit} />
      : mode === 'place' ? <CrackerPlacementScreen cracker={getCracker(snapshot.selectedCracker)} placementPhase={snapshot.placementPhase} hasPlacedCracker={snapshot.hasPlacedCracker} canPlaceCracker={snapshot.canPlaceCracker} canLightFuse={snapshot.canLightFuse} placementError={snapshot.placementError} onPlace={() => session?.placeCracker()} onLight={light} onReposition={() => session?.repositionCracker()} onRescan={rescan} />
      : completed ? <CelebrationComplete replayAvailable={snapshot.replayAvailable} cameraRelative={snapshot.fireworksSpace==='camera-relative'} onReplay={replay} onChoose={chooseAnother} onRescan={rescan} onExit={exit} /> : mode === 'fuse' && showingFireworks ? <FireworksOverlay {...snapshot} onAgain={returnFromFuse} onChoose={chooseAnother} onSkyPreview={()=>session?.playSkyPreview()} /> : mode === 'fuse' ? <FirestickInteraction session={session} ignitionPhase={snapshot.ignitionPhase} fuseVisible={snapshot.fuseVisible} ignitionNear={snapshot.ignitionNear} countdown={snapshot.countdown} ignitionInterrupted={snapshot.ignitionInterrupted} ignitionError={snapshot.ignitionError} onBack={returnFromFuse} onRescan={rescan} /> : <footer className="ar-scan-footer">
      <div className="ar-instruction" aria-live="polite"><h1>Scan the Ground</h1><p>{scanMessages[snapshot.state]}</p>
        {!ready && snapshot.state !== 'INITIALIZING' && <small>{snapshot.paused ? 'Return to Thiri to continue scanning.' : 'Use a well-lit area with a textured floor.'}</small>}
      </div>
      {ready && <button className="thiri-primary-button" type="button" onClick={choose}>Choose a Cracker <span aria-hidden="true">→</span></button>}
    </footer>}
    <a inert={completed} tabIndex={completed?-1:undefined} className="ar-attribution" href={`${import.meta.env.BASE_URL}licenses/8thwall-engine-LICENSE.txt`} target="_blank" rel="noreferrer" aria-label="8th Wall engine by Niantic Spatial, copyright 2026. Engine license and warranty disclaimer."><img src={`${import.meta.env.BASE_URL}vendor/8thwall/resources/powered-by.svg`} alt="Powered by 8th Wall" width="100" height="19" /></a>
    {debug && <pre className="ar-debug">{JSON.stringify({ engine: `engine-binary ${ENGINE_VERSION}`, ...snapshot }, null, 2)}</pre>}
  </main>;
}

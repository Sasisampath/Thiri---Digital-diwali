import * as THREE from 'three';
import { getCracker } from '../../config/crackers';
import type { CrackerType } from '../../config/crackers';
import { aim, GroundPlacement } from './placement';
import { PlacementController } from './placement-controller';
import { PlacementReticle } from './reticle';
import { initialSnapshot, trackingState } from './tracking';
import type { ARFlow, CameraUpdate, Placement, Reality, Snapshot, XR8Engine, XrScene } from './types';

export const ENGINE_VERSION = '1.0.0';
let runtime: Promise<XR8Engine> | null = null;
let owner: GroundARSession | null = null;

function loadRuntime(): Promise<XR8Engine> {
  if (runtime) return runtime;
  window.THREE = THREE;
  runtime = new Promise<XR8Engine>((resolve, reject) => {
    if (window.XR8) { resolve(window.XR8); return; }
    const script = document.createElement('script');
    script.src = `${import.meta.env.BASE_URL}vendor/8thwall/xr.js`;
    script.async = true;
    script.dataset.preloadChunks = 'slam';
    const cleanup = () => { clearTimeout(timeout); window.removeEventListener('xrloaded', loaded); script.onload = null; script.onerror = null; };
    const loaded = () => { if (window.XR8) { cleanup(); resolve(window.XR8); } };
    const failed = () => { cleanup(); script.remove(); reject(new Error('The AR engine could not be downloaded. Check your connection and try again.')); };
    const timeout = window.setTimeout(failed, 30000); // Failure watchdog only; never advances scanning.
    window.addEventListener('xrloaded', loaded);
    script.onload = loaded;
    script.onerror = failed;
    document.head.append(script);
  }).catch(error => { runtime = null; throw error; });
  return runtime;
}

/** Owns the only XR8 loop, native camera session and Three scene for all AR UI states. */
export class GroundARSession {
  private snapshot: Snapshot = { ...initialSnapshot };
  private listeners = new Set<() => void>();
  private disposed = false;
  private stopping = false;
  private xr: XR8Engine | null = null;
  private scene: XrScene | null = null;
  private reticle: PlacementReticle | null = null;
  private estimator = new GroundPlacement();
  private crackerPlacement: PlacementController | null = null;
  private flow: ARFlow = 'scan';
  private candidate: Placement | null = null;
  private saved: Placement | null = null;
  private hadTracking = false;
  private lastFrame = 0;
  private lastEstimate = 0;
  private watchdog: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private streams = new Set<MediaStream>();
  private trackListeners = new Map<MediaStreamTrack, () => void>();

  constructor(private canvas: HTMLCanvasElement, selectedCracker: CrackerType = initialSnapshot.selectedCracker) { this.snapshot = { ...initialSnapshot, selectedCracker }; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private publish(patch: Partial<Snapshot>) {
    if (this.disposed) return;
    if (Object.entries(patch).every(([key, value]) => this.snapshot[key as keyof Snapshot] === value)) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private live() { return !this.disposed && !this.stopping && owner === this; }
  private clearPlacement() {
    this.candidate = null; this.saved = null; this.estimator.reset(); this.reticle?.update(null);
    this.crackerPlacement?.trackingLost(); this.syncCracker();
  }
  private syncCracker() { if (this.crackerPlacement) this.publish(this.crackerPlacement.getSummary()); }
  private prepareCracker() {
    if (!this.scene || !['place', 'fuse'].includes(this.flow)) { this.crackerPlacement?.leave(); return; }
    try {
      this.crackerPlacement ??= new PlacementController(this.scene.scene);
      this.crackerPlacement.enter(this.snapshot.selectedCracker, this.flow as 'place' | 'fuse'); this.syncCracker();
    } catch { this.fail('The 3D preview could not start on this device. Try choosing a cracker again.', 'engine'); }
  }
  setFlow(flow: ARFlow) {
    if (flow === this.flow) return;
    this.flow = flow;
    if (flow === 'place') this.saved = null;
    if (flow === 'scan') this.returnToScan();
    this.prepareCracker();
  }
  private resize = () => {
    const bounds = this.canvas.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(bounds.width * scale)), height = Math.max(1, Math.round(bounds.height * scale));
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  };
  private contextLost = (event: Event) => { event.preventDefault(); this.fail('The camera display was interrupted. Tap Retry to start again.', 'engine'); };
  private visibility = () => {
    if (!this.live() || !this.xr) return;
    this.clearPlacement();
    if (document.visibilityState === 'hidden') {
      try {
        this.xr.pause();
        this.publish({ state: 'TRACKING_LOST', paused: true, candidateValid: false, placementMode: 'none' });
      } catch { this.fail('The AR session could not pause safely. Tap Retry to start again.', 'camera'); }
    } else {
      if (this.streams.size && ![...this.streams].some(s => s.getVideoTracks().some(t => t.readyState === 'live'))) {
        this.fail('Your camera paused in the background. Tap Retry when you’re ready.', 'camera'); return;
      }
      try {
        this.lastFrame = performance.now();
        this.xr.resume();
        this.publish({ state: 'SCANNING', paused: false, candidateValid: false, trackingStatus: 'UNKNOWN', trackingReason: 'INITIALIZING' });
      } catch { this.fail('Your camera could not resume. Tap Retry to start again.', 'camera'); }
    }
  };
  private pageHide = () => { this.publish({ state: 'ERROR', error: 'Your AR session was closed. Tap Retry to start again.', errorKind: 'camera', candidateValid: false }); this.release(); };

  async start() {
    if (this.disposed) return;
    owner?.dispose(); owner = this;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof WebGLRenderingContext === 'undefined') {
        this.unsupported('Open Thiri over HTTPS in a mobile browser with camera and WebGL support.'); return;
      }
      this.xr = await loadRuntime();
      if (!this.live()) return;
      const allowedDevices = this.xr.XrConfig.device().MOBILE;
      if (!this.xr.XrDevice.isDeviceBrowserCompatible({ allowedDevices })) {
        this.unsupported('Try Safari on an iPhone or Chrome on a supported Android phone.'); return;
      }
      await this.xr.initialize();
      if (!this.live()) return;
      await this.xr.loadChunk('slam');
      if (!this.live()) return;
      if (document.visibilityState === 'hidden') { this.fail('Return to Thiri and tap Retry to start your camera.', 'camera'); return; }
      this.publish({ canRecenter: typeof this.xr.XrController.recenter === 'function' });
      this.xr.clearCameraPipelineModules();
      this.xr.XrController.configure({ disableWorldTracking: false, enableWorldPoints: true, scale: 'absolute' });
      this.xr.addCameraPipelineModules([
        this.xr.GlTextureRenderer.pipelineModule(), this.xr.Threejs.pipelineModule(), this.xr.XrController.pipelineModule(),
        {
          name: 'thiri-ground-placement',
          onStart: () => this.onStart(),
          onCameraStatusChange: event => this.onCamera(event),
          onUpdate: event => this.onFrame(event.processCpuResult?.reality),
          onException: error => {
            const name = error instanceof Error ? error.name : String(error);
            const denied = /notallowed|permission|denied/i.test(name);
            this.fail(denied ? 'Camera access is off. Enable access in your browser settings, then try again.' : 'The AR camera could not start. Close other camera apps and tap Retry.', denied ? 'denied' : 'engine');
          },
        },
      ]);
      this.resize();
      this.resizeObserver = new ResizeObserver(this.resize); this.resizeObserver.observe(this.canvas);
      window.addEventListener('resize', this.resize);
      window.addEventListener('orientationchange', this.resize);
      document.addEventListener('visibilitychange', this.visibility);
      window.addEventListener('pagehide', this.pageHide);
      this.canvas.addEventListener('webglcontextlost', this.contextLost);
      await this.xr.run({ canvas: this.canvas, cameraConfig: { direction: this.xr.XrConfig.camera().BACK }, allowedDevices, glContextConfig: { alpha: false, antialias: false } });
      if (!this.live()) return;
      this.lastFrame = performance.now();
      this.watchdog = window.setInterval(() => {
        if (!this.live() || this.snapshot.paused) return;
        if (performance.now() - this.lastFrame > 1500 && this.snapshot.state !== 'INITIALIZING') {
          this.clearPlacement(); this.publish({ state: 'TRACKING_LOST', candidateValid: false, placementMode: 'none' });
        }
      }, 500);
    } catch (error) {
      if (this.live()) this.fail(error instanceof Error && /download/.test(error.message) ? error.message : 'The AR engine could not initialize. Check your connection and tap Retry.', 'engine');
    }
  }
  private onCamera(event: CameraUpdate) {
    if (!this.live()) { event.stream?.getTracks().forEach(track => track.stop()); return; }
    if (event.stream) {
      this.streams.add(event.stream);
      for (const track of event.stream.getVideoTracks()) {
        if (track.getSettings?.().facingMode === 'user') { this.fail('A rear camera is required for world tracking. Try another device.', 'camera'); return; }
        if (this.trackListeners.has(track)) continue;
        const ended = () => { if (this.live() && !this.snapshot.paused) this.fail('Your camera stopped. Tap Retry to start again.', 'camera'); };
        track.addEventListener('ended', ended); this.trackListeners.set(track, ended);
      }
    }
    this.publish({ camera: event.status });
    if (event.status === 'failed') this.fail('Something went wrong with the camera. Check its permission and close other camera apps.', 'camera');
  }
  private onStart() {
    if (!this.live() || !this.xr) return;
    this.scene = this.xr.Threejs.xrScene();
    this.scene.camera.position.set(0, 1.5, 0);
    this.xr.XrController.updateCameraProjectionMatrix({ origin: this.scene.camera.position, facing: this.scene.camera.quaternion });
    this.reticle = new PlacementReticle(this.scene.scene, () => this.fail('The placement indicator could not load. Check your connection and tap Retry.', 'engine'));
    this.lastFrame = performance.now();
    this.prepareCracker();
    this.publish({ state: 'SCANNING' });
  }
  private onFrame(reality?: Reality) {
    if (!this.live() || !reality || !this.scene || this.snapshot.paused) return;
    const now = performance.now(); this.lastFrame = now;
    const status = reality.trackingStatus ?? 'UNKNOWN', reason = reality.trackingReason ?? '';
    if (status !== 'NORMAL' || reason === 'INITIALIZING') {
      this.clearPlacement();
      this.publish({ state: trackingState(reason === 'INITIALIZING' ? 'LIMITED' : status, false, this.hadTracking), trackingStatus: status, trackingReason: reason, candidateValid: false, placementMode: 'none' });
      return;
    }
    this.hadTracking = true;
    if (now - this.lastEstimate >= 120) {
      this.lastEstimate = now;
      const hits = this.xr!.XrController.hitTest(aim.x, aim.y);
      this.candidate = this.estimator.estimate(this.scene.camera, hits, reality.worldPoints ?? [], now);
    }
    const visible = this.saved ?? this.candidate;
    const valid = Boolean(visible && (this.saved || now - visible.updatedAt < 350) && this.snapshot.camera === 'hasVideo' && this.reticle?.isReady());
    this.crackerPlacement?.update(this.scene.camera, this.candidate, this.snapshot.camera === 'hasVideo', now);
    const inPlacement = this.flow === 'place' || this.flow === 'fuse';
    const indicator = inPlacement ? this.crackerPlacement?.getReticle() ?? null : valid ? visible : null;
    this.reticle?.update(indicator, inPlacement, now);
    this.syncCracker();
    this.publish({ state: trackingState(status, valid, this.hadTracking), trackingStatus: status, trackingReason: reason, candidateValid: valid, placementMode: valid ? visible!.source : 'none' });
  }
  confirmPlacement(): Placement | null {
    if (!this.live() || this.snapshot.state !== 'READY' || !this.snapshot.candidateValid || this.snapshot.paused || performance.now() - this.lastFrame > 350) return null;
    const candidate = this.saved ?? this.candidate;
    if (!candidate) return null;
    this.saved = { ...candidate, position: { ...candidate.position }, normal: { ...candidate.normal } };
    return structuredClone(this.saved);
  }
  selectCracker(id: CrackerType) {
    if (this.live() && getCracker(id)) { this.publish({ selectedCracker: id }); this.crackerPlacement?.selectionChanged(id); this.syncCracker(); }
  }
  /** Measured scan context, distinct from the final model-placement commit below. */
  getPlacementContext() {
    const placement = this.confirmPlacement();
    return placement ? { cracker: getCracker(this.snapshot.selectedCracker), placement } : null;
  }
  private freshTracking() { return this.live() && this.snapshot.trackingStatus === 'NORMAL' && this.snapshot.trackingReason !== 'INITIALIZING' && !this.snapshot.paused && this.snapshot.camera === 'hasVideo' && performance.now() - this.lastFrame <= 350; }
  placeCracker() {
    if (!this.freshTracking()) { this.crackerPlacement?.trackingLost(); this.syncCracker(); return null; }
    const placed = this.crackerPlacement?.confirm(performance.now()) ?? null;
    if (placed) this.reticle?.update(null);
    this.syncCracker(); return placed;
  }
  getPlacedCracker() { return this.crackerPlacement?.getPlaced() ?? null; }
  beginFuseStep() {
    if (!this.freshTracking() || !this.crackerPlacement?.canContinue(performance.now())) { this.crackerPlacement?.trackingLost(); this.syncCracker(); return null; }
    return this.crackerPlacement.getPlaced();
  }
  repositionCracker() { this.saved = null; this.crackerPlacement?.reposition(); this.reticle?.update(null); this.syncCracker(); }
  rescanCracker() { this.crackerPlacement?.reposition(); this.clearPlacement(); this.publish({ state: 'SCANNING', candidateValid: false, placementMode: 'none' }); }
  recenterCracker() {
    if (!this.live()) return;
    this.repositionCracker(); this.clearPlacement();
    try { this.xr?.XrController.recenter?.(); }
    catch { this.crackerPlacement?.setError('The view could not reset. Try rescanning the ground.'); this.syncCracker(); }
    this.publish({ state: 'SCANNING', candidateValid: false, placementMode: 'none' });
  }
  returnToScan() { this.saved = null; }
  private unsupported(message: string) { this.publish({ state: 'UNSUPPORTED', error: message, errorKind: 'engine', candidateValid: false }); this.release(); }
  private fail(message: string, kind: 'camera' | 'denied' | 'engine') {
    if (!this.live()) return;
    this.clearPlacement(); this.publish({ state: 'ERROR', error: message, errorKind: kind, candidateValid: false, placementMode: 'none' }); this.release();
  }
  private release() {
    this.stopping = true;
    if (this.watchdog !== null) { clearInterval(this.watchdog); this.watchdog = null; }
    this.resizeObserver?.disconnect(); this.resizeObserver = null;
    window.removeEventListener('resize', this.resize); window.removeEventListener('orientationchange', this.resize);
    document.removeEventListener('visibilitychange', this.visibility); window.removeEventListener('pagehide', this.pageHide);
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    this.trackListeners.forEach((listener, track) => track.removeEventListener('ended', listener)); this.trackListeners.clear();
    if (owner === this) {
      try { this.xr?.stop(); this.xr?.clearCameraPipelineModules(); } catch { /* Still release owned tracks/resources below. */ }
      owner = null;
    }
    this.streams.forEach(stream => stream.getTracks().forEach(track => track.stop())); this.streams.clear();
    this.crackerPlacement?.dispose(); this.crackerPlacement = null;
    this.reticle?.dispose(); this.reticle = null;
    this.scene?.renderer.dispose(); this.scene = null;
    this.candidate = null; this.saved = null; this.estimator.reset();
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.release(); this.listeners.clear(); }
}

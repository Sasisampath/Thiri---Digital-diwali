import { Quaternion, Vector3 } from 'three';
import type { PerspectiveCamera, Scene } from 'three';
import type { CrackerType } from '../../config/crackers';
import { CrackerPreview } from './cracker-preview';
import { GroundRaycast } from './ground-raycast';
import type { GroundPose } from './ground-raycast';
import { emptyPlacementSummary, placementPhase } from './placed-cracker-state';
import type { PlacedCracker, PlacementSummary } from './placed-cracker-state';
import type { Placement } from './types';

/** Runs in the existing SDK frame loop; no React pose state or second renderer. */
export class PlacementController {
  private preview: CrackerPreview;
  private ray = new GroundRaycast();
  private summary: PlacementSummary = { ...emptyPlacementSummary };
  private mode: 'place' | 'fuse' | null = null;
  private type: CrackerType | null = null;
  private placed: PlacedCracker | null = null;
  private pose: GroundPose | null = null;
  private target: GroundPose | null = null;
  private lastFrame = 0;
  private lastSample = -1;
  private lastStableTime = 0;
  private stableSamples = 0;
  private hadTracking = false;
  private repositioning = false;
  private lastCamera = new Vector3();
  private lastRotation = new Quaternion();
  private cameraKnown = false;
  private initializedPose = false;
  private error: string | null = null;

  constructor(scene: Scene) { this.preview = new CrackerPreview(scene); }
  getSummary() { return this.summary; }
  enter(type: CrackerType, mode: 'place' | 'fuse') {
    this.mode = mode;
    if (this.type !== type) {
      this.type = type; this.reset();
      try { this.preview.ensure(type); this.error = null; } catch { this.error = 'This cracker couldn’t be prepared. Choose another cracker or try again.'; }
    }
    this.preview.setPreview(!this.placed);
    if (!this.placed) this.preview.setVisible(false);
    if (!this.placed) this.updateSummary(false, false, false);
  }
  leave() { this.mode = null; this.preview.setVisible(false); }
  selectionChanged(type: CrackerType) { if (type !== this.type) { this.reset(); this.preview.setVisible(false); } }
  private reset() {
    this.repositioning = false;
    this.placed = null; this.pose = null; this.target = null; this.initializedPose = false;
    this.stableSamples = 0; this.lastSample = -1; this.cameraKnown = false; this.lastFrame = 0; this.lastStableTime = 0;
  }
  reposition() {
    this.reset(); this.repositioning = true; this.error = null;
    if (this.type) { try { this.preview.ensure(this.type); } catch { this.error = 'This cracker couldn’t be prepared. Try choosing it again.'; } }
    this.preview.setPreview(true); this.preview.setVisible(false); this.updateSummary(true, false, false);
  }
  trackingLost() {
    this.stableSamples = 0; this.lastSample = -1; this.lastStableTime = 0; this.pose = null; this.cameraKnown = false;
    this.preview.setVisible(false); this.updateSummary(false, false, false);
  }
  update(camera: PerspectiveCamera, candidate: Placement | null, tracking: boolean, now: number) {
    if (!this.mode) { this.preview.setVisible(false); return; }
    const elapsed = this.lastFrame ? now - this.lastFrame : 150;
    const sudden = this.cameraKnown && elapsed < 300 && (camera.position.distanceTo(this.lastCamera) > 0.65 || camera.quaternion.angleTo(this.lastRotation) > Math.PI / 4);
    this.lastCamera.copy(camera.position); this.lastRotation.copy(camera.quaternion); this.cameraKnown = true; this.lastFrame = now;
    if (!tracking || sudden || this.error) { this.trackingLost(); return; }
    this.hadTracking = true;
    if (this.placed) {
      if (now - this.lastStableTime >= 120) { this.stableSamples++; this.lastStableTime = now; }
      const recovered = this.stableSamples >= 4;
      this.preview.setVisible(recovered && Boolean(this.mode));
      this.updateSummary(recovered, false, false);
      return;
    }
    if (this.mode !== 'place') { this.preview.setVisible(false); this.updateSummary(true, false, false); return; }
    const pose = this.ray.cast(camera, candidate, now);
    if (!pose) { this.pose = null; this.stableSamples = 0; this.lastSample = -1; this.preview.setVisible(false); this.updateSummary(true, false, false); return; }
    let jumping = false;
    if (candidate!.updatedAt !== this.lastSample) {
      this.lastSample = candidate!.updatedAt;
      const delta = this.target ? pose.position.distanceTo(this.target.position) : 0;
      jumping = delta > 0.75;
      this.stableSamples = delta < 0.12 && !jumping ? this.stableSamples + 1 : 1;
      this.target = pose;
      if (jumping) this.initializedPose = false;
    }
    this.pose = pose;
    if (jumping) { this.preview.setVisible(false); this.updateSummary(false, false, false); return; }
    const alpha = !this.initializedPose ? 1 : 1 - Math.exp(-Math.min(elapsed, 200) / 60);
    this.preview.setPose(pose.position, pose.rotation, alpha); this.initializedPose = true;
    this.preview.setPreview(true); this.preview.setVisible(true);
    const settled = this.stableSamples >= 4 && this.preview.anchor.position.distanceTo(pose.position) < 0.02 && this.preview.anchor.quaternion.angleTo(pose.rotation) < 0.03;
    this.updateSummary(true, true, settled);
  }
  private updateSummary(tracking: boolean, candidate: boolean, settled: boolean) {
    const phase = placementPhase({ error: Boolean(this.error), tracking, previouslyTracked: this.hadTracking, placed: Boolean(this.placed), repositioning: this.repositioning, candidate, settled });
    this.summary = { placementPhase: phase, hasPlacedCracker: Boolean(this.placed), canPlaceCracker: phase === 'READY_TO_PLACE', canLightFuse: phase === 'PLACED', placementError: this.error };
  }
  confirm(now: number): PlacedCracker | null {
    if (!this.summary.canPlaceCracker || !this.pose || !this.type || now - this.lastFrame > 350 || now - this.pose.support.updatedAt > 350) return null;
    const model = this.preview.getModel(); if (!model) return null;
    // Commit exactly the displayed, settled preview pose, then stop all positioning.
    this.preview.anchor.updateMatrixWorld(true);
    this.placed = { type: this.type, worldPosition: model.root.getWorldPosition(new Vector3()), worldRotation: model.root.getWorldQuaternion(new Quaternion()), worldScale: model.root.getWorldScale(new Vector3()), rootObject: model.root, fusePoint: model.fusePoint };
    this.preview.setPreview(false); this.repositioning = false; this.stableSamples = 4;
    this.updateSummary(true, false, false);
    return this.getPlaced();
  }
  getPlaced(): PlacedCracker | null {
    return this.placed ? { ...this.placed, worldPosition: this.placed.worldPosition.clone(), worldRotation: this.placed.worldRotation.clone(), worldScale: this.placed.worldScale.clone() } : null;
  }
  canContinue(now: number) { return Boolean(this.placed && this.summary.canLightFuse && now - this.lastFrame <= 350); }
  getReticle(): Placement | null {
    if (!this.mode || this.placed || !this.pose || !['PREVIEWING', 'READY_TO_PLACE'].includes(this.summary.placementPhase)) return null;
    const p = this.preview.anchor.position;
    return { ...this.pose.support, position: { x: p.x, y: p.y, z: p.z }, normal: { ...this.pose.support.normal } };
  }
  setError(message: string) { this.error = message; this.preview.setVisible(false); this.updateSummary(false, false, false); }
  dispose() { this.preview.dispose(); this.placed = null; this.pose = null; }
}

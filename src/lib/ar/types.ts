import type { IgnitionSummary } from './ignition-controller';
import type { PlacementSummary } from './placed-cracker-state';
import type * as THREE from 'three';
import type { CrackerType } from '../../config/crackers';

export type ScanState = 'INITIALIZING' | 'SCANNING' | 'SEARCHING' | 'READY' | 'TRACKING_LOST' | 'UNSUPPORTED' | 'ERROR';
export type Point3 = { x: number; y: number; z: number };
export type Rotation = Point3 & { w: number };
export type WorldPoint = { id?: number; confidence: number; position: Point3 };
export type Reality = { trackingStatus?: string; trackingReason?: string; position?: Point3; rotation?: Rotation; worldPoints?: WorldPoint[]; lighting?: { exposure?: number } };
export type Hit = { type: string; position: Point3; rotation?: Rotation; distance?: number };
export type Placement = { position: Point3; normal: Point3; source: 'engine-surface' | 'slam-point-cloud'; updatedAt: number; support: number };
export type ARFlow = 'scan' | 'choose' | 'place' | 'fuse';
export type Snapshot = PlacementSummary & IgnitionSummary & {
  selectedCracker: CrackerType; canRecenter: boolean;
  state: ScanState; camera: string; trackingStatus: string; trackingReason: string;
  candidateValid: boolean; placementMode: string; error: string | null; errorKind: 'camera' | 'denied' | 'engine' | null; paused: boolean;
};
export type XrScene = { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer };
export type CameraUpdate = { status: string; stream?: MediaStream; video?: HTMLVideoElement };
export type Pipeline = {
  name: string;
  onStart?: (event: { canvas: HTMLCanvasElement }) => void;
  onUpdate?: (event: { processCpuResult?: { reality?: Reality } }) => void;
  onCameraStatusChange?: (event: CameraUpdate) => void;
  onException?: (error: unknown) => void;
};
// The narrow SDK boundary mirrors only the official APIs used by this integration.
export type XR8Engine = {
  initialize: () => Promise<void>; loadChunk: (chunk: 'slam') => Promise<void>;
  run: (options: { canvas: HTMLCanvasElement; cameraConfig: { direction: string }; allowedDevices: string; glContextConfig?: WebGLContextAttributes }) => void | Promise<void>;
  stop: () => void; pause: () => void; resume: () => void;
  clearCameraPipelineModules: () => void; addCameraPipelineModules: (modules: Pipeline[]) => void;
  XrConfig: { camera: () => { BACK: string }; device: () => { MOBILE: string } };
  XrDevice: { isDeviceBrowserCompatible: (options: { allowedDevices: string }) => boolean };
  GlTextureRenderer: { pipelineModule: () => Pipeline };
  Threejs: { pipelineModule: () => Pipeline; xrScene: () => XrScene };
  XrController: {
    configure: (options: { disableWorldTracking: boolean; enableWorldPoints: boolean; scale: 'absolute' }) => void;
    pipelineModule: () => Pipeline;
    recenter?: () => void;
    updateCameraProjectionMatrix: (options: { origin: THREE.Vector3; facing: THREE.Quaternion }) => void;
    hitTest: (x: number, y: number, types?: string[]) => Hit[];
  };
};
declare global { interface Window { XR8?: XR8Engine; THREE?: typeof THREE; } }

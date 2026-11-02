import { initialIgnition } from './ignition-controller';
import { emptyPlacementSummary } from './placed-cracker-state';
import { defaultCracker } from '../../config/crackers';
import type { ScanState, Snapshot } from './types';

export const initialSnapshot: Snapshot = { ...emptyPlacementSummary, ...initialIgnition, canRecenter: false, selectedCracker: defaultCracker, state: 'INITIALIZING', camera: 'not-started', trackingStatus: 'UNKNOWN', trackingReason: '', candidateValid: false, placementMode: 'none', error: null, errorKind: null, paused: false };
export const scanMessages: Record<ScanState, string> = {
  INITIALIZING: 'Getting your camera ready…', SCANNING: 'Point your camera at the ground.', SEARCHING: 'Move your phone slowly.',
  READY: "Perfect! Let's pick a cracker.", TRACKING_LOST: "Let's find the ground again.", UNSUPPORTED: "AR tracking isn't available on this device.", ERROR: 'Something went wrong with the camera.',
};

export function trackingState(status: string, hasPlacement: boolean, previouslyTracked: boolean): ScanState {
  if (status === 'NORMAL') return hasPlacement ? 'READY' : 'SEARCHING';
  return previouslyTracked ? 'TRACKING_LOST' : 'SCANNING';
}

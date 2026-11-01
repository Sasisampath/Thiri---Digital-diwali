import type { Object3D, Quaternion, Vector3 } from 'three';
import type { CrackerType } from '../../config/crackers';

export type PlacementPhase = 'SEARCHING' | 'PREVIEWING' | 'READY_TO_PLACE' | 'PLACED' | 'TRACKING_LOST' | 'REPOSITIONING' | 'ERROR';
export type PlacedCracker = { type: CrackerType; worldPosition: Vector3; worldRotation: Quaternion; worldScale: Vector3; rootObject: Object3D; fusePoint: Object3D };
export type PlacementSummary = { placementPhase: PlacementPhase; hasPlacedCracker: boolean; canPlaceCracker: boolean; canLightFuse: boolean; placementError: string | null };
export function placementPhase(input: { error: boolean; tracking: boolean; previouslyTracked: boolean; placed: boolean; repositioning: boolean; candidate: boolean; settled: boolean }): PlacementPhase {
  if (input.error) return 'ERROR';
  if (!input.tracking) return input.previouslyTracked || input.placed ? 'TRACKING_LOST' : input.repositioning ? 'REPOSITIONING' : 'SEARCHING';
  if (input.placed) return 'PLACED';
  if (!input.candidate) return input.repositioning ? 'REPOSITIONING' : 'SEARCHING';
  return input.settled ? 'READY_TO_PLACE' : 'PREVIEWING';
}
export const emptyPlacementSummary: PlacementSummary = { placementPhase: 'SEARCHING', hasPlacedCracker: false, canPlaceCracker: false, canLightFuse: false, placementError: null };

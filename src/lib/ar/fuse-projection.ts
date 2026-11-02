import { Vector3 } from 'three';
import type { Object3D, PerspectiveCamera } from 'three';
export type FuseProjection = { x: number; y: number; visible: boolean };
export const hiddenFuse: FuseProjection = { x: 0, y: 0, visible: false };
/** Client/CSS pixels, independent of framebuffer size and devicePixelRatio. */
export function projectFuse(fuse: Object3D, camera: PerspectiveCamera, bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>): FuseProjection {
  fuse.updateWorldMatrix(true, false); camera.updateMatrixWorld(true);
  const world = fuse.getWorldPosition(new Vector3());
  const view = world.clone().applyMatrix4(camera.matrixWorldInverse);
  const ndc = world.project(camera);
  const visible = bounds.width > 0 && bounds.height > 0 && view.z < -camera.near && [ndc.x, ndc.y, ndc.z].every(Number.isFinite) && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z >= -1 && ndc.z <= 1;
  return { x: bounds.left + (ndc.x + 1) * bounds.width / 2, y: bounds.top + (1 - ndc.y) * bounds.height / 2, visible };
}
export function withinFuseRadius(tip: {x: number; y: number}, fuse: FuseProjection, radius = 46) {
  return fuse.visible && Number.isFinite(tip.x) && Number.isFinite(tip.y) && Math.hypot(tip.x - fuse.x, tip.y - fuse.y) <= radius;
}

import { Plane, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import { aim } from './placement';
import type { Placement } from './types';

const up = new Vector3(0, 1, 0);
export type GroundPose = { position: Vector3; rotation: Quaternion; support: Placement };
/** The validated ground's local Y=0 plane is transformed into engine world space. */
export class GroundRaycast {
  private raycaster = new Raycaster();
  private target = new Vector2(aim.x * 2 - 1, 1 - aim.y * 2);
  private plane = new Plane();
  cast(camera: PerspectiveCamera, support: Placement | null, now: number): GroundPose | null {
    if (!support || now - support.updatedAt > 350) return null;
    const normal = new Vector3(support.normal.x, support.normal.y, support.normal.z).normalize();
    const origin = new Vector3(support.position.x, support.position.y, support.position.z);
    if (![origin.x, origin.y, origin.z, normal.x, normal.y, normal.z].every(Number.isFinite) || normal.dot(up) < 0.966) return null;
    camera.updateMatrixWorld(true); this.raycaster.setFromCamera(this.target, camera);
    const ray = this.raycaster.ray;
    if (ray.direction.dot(normal) > -0.15) return null;
    this.plane.setFromNormalAndCoplanarPoint(normal, origin);
    const point = ray.intersectPlane(this.plane, new Vector3());
    if (!point || ![point.x, point.y, point.z].every(Number.isFinite)) return null;
    const distance = point.distanceTo(camera.position);
    // Stay close to the measured support rather than extrapolating onto an unseen floor.
    if (distance < 0.25 || distance > 4 || point.distanceTo(origin) > 0.25 || camera.position.clone().sub(point).dot(normal) < 0.15) return null;
    return { position: point, rotation: new Quaternion().setFromUnitVectors(up, normal), support };
  }
}

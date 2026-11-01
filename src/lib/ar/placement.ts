import { Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { Hit, Placement, Point3, WorldPoint } from './types';

export const aim = { x: 0.5, y: 0.58 };
const up = new Vector3(0, 1, 0);
const finite = (p: Point3) => [p.x, p.y, p.z].every(Number.isFinite);
const cross = (a: Point3, b: Point3, c: Point3) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);

function hull(points: Point3[]): Point3[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
  const lower: Point3[] = [], upper: Point3[] = [];
  for (const p of sorted) { while (lower.length > 1 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 0) lower.pop(); lower.push(p); }
  for (const p of sorted.reverse()) { while (upper.length > 1 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 0) upper.pop(); upper.push(p); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function insideSupport(point: Point3, polygon: Point3[]) {
  if (polygon.length < 3) return false;
  let twiceArea = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    twiceArea += a.x * b.z - b.x * a.z;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length && cross(a, b, point) / length < 0.025) return false;
  }
  return Math.abs(twiceArea) / 2 >= 0.1;
}

/** No arbitrary y=0 raycast: every candidate requires an SDK surface or observed SLAM support. */
export class GroundPlacement {
  private raycaster = new Raycaster();
  private target = new Vector2(aim.x * 2 - 1, 1 - aim.y * 2);
  private consecutive = 0;
  private last: Placement | null = null;

  reset() { this.consecutive = 0; this.last = null; }
  estimate(camera: PerspectiveCamera, hits: Hit[], worldPoints: WorldPoint[], now: number): Placement | null {
    camera.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.target, camera);
    const ray = this.raycaster.ray;
    if (ray.direction.y > -0.15) { this.reset(); return null; }
    let candidate: Placement | null = null;
    for (const hit of hits) {
      if (!['ESTIMATED_SURFACE', 'DETECTED_SURFACE'].includes(hit.type) || !finite(hit.position) || !hit.rotation) continue;
      const q = new Quaternion(hit.rotation.x, hit.rotation.y, hit.rotation.z, hit.rotation.w);
      if (![q.x, q.y, q.z, q.w].every(Number.isFinite) || Math.abs(q.length() - 1) > 0.05) continue;
      const normal = up.clone().applyQuaternion(q).normalize();
      const distance = camera.position.distanceTo(new Vector3(hit.position.x, hit.position.y, hit.position.z));
      if (normal.dot(up) < 0.966 || distance < 0.25 || distance > 4 || camera.position.y - hit.position.y < 0.15) continue;
      candidate = { position: { ...hit.position }, normal: { x: normal.x, y: normal.y, z: normal.z }, source: 'engine-surface', updatedAt: now, support: 1 };
      break;
    }
    if (!candidate) {
      // Fit a horizontal band in actual engine world points, then require the aim
      // ray to land INSIDE the observed support hull. Feature-point hits alone
      // and intersections with an invented floor never qualify as placement.
      const points = worldPoints.filter(p => p.confidence >= 0.4 && finite(p.position)
        && camera.position.y - p.position.y > 0.15 && camera.position.y - p.position.y < 2.5
        && camera.position.distanceTo(new Vector3(p.position.x, p.position.y, p.position.z)) < 4).slice(0, 300).map(p => p.position);
      let support: Point3[] = [];
      const stride = Math.max(1, Math.floor(points.length / 24));
      for (let i = 0; i < points.length; i += stride) {
        const band = points.filter(p => Math.abs(p.y - points[i].y) <= 0.035);
        if (band.length > support.length) support = band;
      }
      if (support.length >= 16) {
        const height = support.reduce((total, p) => total + p.y, 0) / support.length;
        const distance = (height - ray.origin.y) / ray.direction.y;
        const point = ray.at(distance, new Vector3());
        if (distance >= 0.25 && distance <= 4 && insideSupport(point, hull(support))) {
          candidate = { position: { x: point.x, y: height, z: point.z }, normal: { x: 0, y: 1, z: 0 }, source: 'slam-point-cloud', updatedAt: now, support: support.length };
        }
      }
    }
    if (!candidate) { this.reset(); return null; }
    const samePlane = this.last && Math.abs(this.last.position.y - candidate.position.y) < 0.05 && this.last.source === candidate.source;
    this.consecutive = samePlane ? this.consecutive + 1 : 1;
    this.last = candidate;
    return this.consecutive >= 4 ? candidate : null;
  }
}

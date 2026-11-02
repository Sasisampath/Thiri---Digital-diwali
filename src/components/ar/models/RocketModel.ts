import { CatmullRomCurve3, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Quaternion, Shape, TorusGeometry, TubeGeometry, Vector3, Group, Box3, Object3D } from 'three';
import { ModelBuilder, ProceduralCrackerModel } from './model';

export class RocketModel extends ProceduralCrackerModel {
  constructor() {
    const b = new ModelBuilder(), stand = new ModelBuilder(), up = new Vector3(0, 1, 0), flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
    b.add(new CylinderGeometry(0.004, 0.004, 0.52, 8), 'wood', [0, 0.26, 0.012]);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3, foot = new Vector3(Math.sin(a) * 0.08, 0.006, Math.cos(a) * 0.08), top = new Vector3(0, 0.16, 0.012);
      const direction = top.clone().sub(foot);
      stand.add(new CylinderGeometry(0.003, 0.003, direction.length(), 6), 'gold', foot.clone().add(top).multiplyScalar(0.5).toArray() as [number, number, number], new Quaternion().setFromUnitVectors(up, direction.normalize()));
      stand.add(new CylinderGeometry(0.012, 0.012, 0.008, 8), 'purple', [foot.x, 0.004, foot.z]);
    }
    b.add(new CylinderGeometry(0.044, 0.044, 0.24, 24), 'purple', [0, 0.6, 0]);
    b.add(new CylinderGeometry(0.0445, 0.0445, 0.04, 24), 'orange', [0, 0.55, 0]);
    b.add(new ConeGeometry(0.054, 0.11, 24), 'pink', [0, 0.775, 0]);
    b.add(new ConeGeometry(0.012, 0.022, 12), 'gold', [0, 0.826, 0]);
    for (const y of [0.484, 0.566, 0.714]) b.add(new TorusGeometry(0.044, 0.003, 5, 24), 'gold', [0, y, 0], flat);
    const spiral = Array.from({length: 49}, (_, i) => { const angle = i / 48 * Math.PI * 4; return new Vector3(Math.sin(angle) * 0.045, 0.493 + i / 48 * 0.21, Math.cos(angle) * 0.045); });
    b.add(new TubeGeometry(new CatmullRomCurve3(spiral), 48, 0.0025, 5, false), 'gold', [0, 0, 0]);
    for (let i = 0; i < 3; i++) {
      const shape = new Shape().moveTo(0.035, 0).lineTo(0.075, -0.055).lineTo(0.038, 0.055).closePath();
      b.add(new ExtrudeGeometry(shape, {depth: 0.004, bevelEnabled: false}), 'magenta', [0, 0.52, 0], new Quaternion().setFromAxisAngle(up, i * Math.PI * 2 / 3));
    }
    const fuse: [number, number, number] = [0.085, 0.445, 0];
    b.add(new TubeGeometry(new CatmullRomCurve3([new Vector3(0.038, 0.498, 0), new Vector3(0.066, 0.475, 0), new Vector3(...fuse)]), 10, 0.003, 5, false), 'rope', [0, 0, 0]);
    super('rocket', 'ground-upright', b, fuse);
    this.visualBody.name='RocketVisual';
    const support=new Group();support.name='LaunchSupport';this.baseTransform.add(support);this.materials.push(...stand.finish(support));
    const exhaust=new Object3D();exhaust.name='RocketExhaust';exhaust.position.set(0,.478,0);this.visualBody.add(exhaust);
    this.dimensions.copy(new Box3().setFromObject(this.root).getSize(new Vector3()));
  }
}

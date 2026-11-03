import type { CrackerType } from '../../../config/crackers';
import { CatmullRomCurve3, CylinderGeometry, Quaternion, SphereGeometry, TorusGeometry, TubeGeometry, Vector3, Object3D } from 'three';
import { ModelBuilder, ProceduralCrackerModel } from './model';

export class FlowerPotModel extends ProceduralCrackerModel {
  constructor(type: CrackerType = 'flower-pot') {
    const b = new ModelBuilder(), flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
    b.add(new CylinderGeometry(0.134, 0.134, 0.016, 28), 'gold', [0, 0.008, 0]);
    b.add(new CylinderGeometry(0.055, 0.13, 0.27, 28), 'orange', [0, 0.151, 0]);
    b.add(new CylinderGeometry(0.118, 0.132, 0.044, 28), 'purple', [0, 0.041, 0]);
    b.add(new CylinderGeometry(0.055, 0.073, 0.064, 28), 'magenta', [0, 0.255, 0]);
    b.add(new TorusGeometry(0.131, 0.004, 6, 28), 'gold', [0, 0.017, 0], flat);
    b.add(new TorusGeometry(0.119, 0.003, 6, 28), 'gold', [0, 0.064, 0], flat);
    b.add(new TorusGeometry(0.055, 0.004, 6, 28), 'gold', [0, 0.285, 0], flat);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      b.add(new SphereGeometry(1, 8, 6), 'gold', [Math.sin(a) * 0.094, 0.155, Math.cos(a) * 0.094], new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), a), [0.009, 0.035, 0.003]);
      b.add(new SphereGeometry(0.005, 6, 4), 'gold', [Math.sin(a) * 0.065, 0.256, Math.cos(a) * 0.065]);
    }
    const fuse: [number, number, number] = [0.017, 0.346, 0];
    b.add(new TubeGeometry(new CatmullRomCurve3([new Vector3(0, 0.282, 0), new Vector3(0.003, 0.322, 0), new Vector3(...fuse)]), 10, 0.004, 5, false), 'rope', [0, 0, 0]);
    super(type, 'ground-upright', b, fuse);
    const opening = new Object3D(); opening.name='FountainEmitter'; opening.position.set(0,.287,0);this.baseTransform.add(opening);
  }
}

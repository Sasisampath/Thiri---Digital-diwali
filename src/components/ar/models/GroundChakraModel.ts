import type { CrackerType } from '../../../config/crackers';
import { CatmullRomCurve3, CylinderGeometry, Quaternion, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from 'three';
import { ModelBuilder, ProceduralCrackerModel } from './model';

export class GroundChakraModel extends ProceduralCrackerModel {
  constructor(type: CrackerType = 'ground-chakra') {
    const b = new ModelBuilder(), flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
    b.add(new CylinderGeometry(0.15, 0.15, 0.034, 32), 'purple', [0, 0.017, 0]);
    b.add(new CylinderGeometry(0.146, 0.146, 0.008, 32), 'orange', [0, 0.036, 0]);
    b.add(new CylinderGeometry(0.132, 0.132, 0.004, 32), 'magenta', [0, 0.041, 0]);
    b.add(new TorusGeometry(0.148, 0.0035, 6, 32), 'gold', [0, 0.039, 0], flat);
    b.add(new TorusGeometry(0.15, 0.003, 6, 32), 'gold', [0, 0.008, 0], flat);
    b.add(new CylinderGeometry(0.044, 0.055, 0.016, 24), 'gold', [0, 0.05, 0]);
    b.add(new SphereGeometry(1, 16, 8), 'gold', [0, 0.053, 0], new Quaternion(), [0.04, 0.014, 0.04]);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      b.add(new SphereGeometry(1, 8, 6), 'gold', [Math.sin(a) * 0.088, 0.045, Math.cos(a) * 0.088], new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), a), [0.015, 0.002, 0.035]);
    }
    const fuse: [number, number, number] = [0.206, 0.055, 0];
    b.add(new TubeGeometry(new CatmullRomCurve3([new Vector3(0.13, 0.033, 0), new Vector3(0.175, 0.045, 0), new Vector3(...fuse)]), 8, 0.0035, 5, false), 'rope', [0, 0, 0]);
    super(type, 'ground-flat', b, fuse);
  }
}

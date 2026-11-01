import { Box3, BufferGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CrackerType, PlacementType } from '../../../config/crackers';

export const palette = { orange: '#FF7049', purple: '#7559E8', magenta: '#DF197F', pink: '#F24AA8', gold: '#FFD35A', rope: '#C89C68', wood: '#AE692F' };
export type ModelColor = keyof typeof palette;
export class ModelBuilder {
  private parts = new Map<ModelColor, BufferGeometry[]>();
  add(geometry: BufferGeometry, color: ModelColor, position: [number, number, number], rotation: Quaternion = new Quaternion(), scale: [number, number, number] = [1, 1, 1]) {
    const part = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    part.applyMatrix4(new Matrix4().compose(new Vector3(...position), rotation, new Vector3(...scale)));
    const group = this.parts.get(color) ?? []; group.push(part); this.parts.set(color, group);
  }
  finish(parent: Object3D): MeshStandardMaterial[] {
    const materials: MeshStandardMaterial[] = [];
    for (const [color, parts] of this.parts) {
      const geometry = mergeGeometries(parts, false);
      parts.forEach(part => part.dispose());
      if (!geometry) throw new Error('Cracker geometry could not be merged');
      const material = new MeshStandardMaterial({ color: palette[color], metalness: color === 'gold' ? 0.65 : 0.08, roughness: color === 'gold' ? 0.3 : 0.5 });
      materials.push(material);
      const mesh = new Mesh(geometry, material); mesh.name = `CrackerPart:${color}`; parent.add(mesh);
    }
    this.parts.clear(); return materials;
  }
}

export class ProceduralCrackerModel {
  readonly root = new Group();
  readonly baseTransform = new Object3D();
  readonly fusePoint = new Object3D();
  readonly dimensions: Vector3;
  private preview = false;
  private disposed = false;
  protected materials: MeshStandardMaterial[];
  constructor(readonly type: CrackerType, readonly placementOrientation: PlacementType, builder: ModelBuilder, fuse: [number, number, number]) {
    this.root.name = `CrackerModel:${type}`; this.root.userData.crackerType = type;
    this.baseTransform.name = 'BaseTransform'; this.root.add(this.baseTransform);
    this.materials = builder.finish(this.baseTransform);
    this.fusePoint.name = 'FusePoint'; this.fusePoint.position.set(...fuse); this.baseTransform.add(this.fusePoint);
    this.root.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(this.root); this.dimensions = bounds.getSize(new Vector3());
    if (bounds.min.y < -0.0001) throw new Error('Cracker geometry must sit above its ground-contacting base');
  }
  setPreview(preview: boolean) {
    if (preview === this.preview) return;
    this.preview = preview;
    this.materials.forEach(material => {
      material.transparent = preview; material.opacity = preview ? 0.72 : 1; material.depthWrite = !preview; material.needsUpdate = true;
    });
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.root.removeFromParent();
    this.root.traverse(object => { if (object instanceof Mesh) object.geometry.dispose(); });
    this.materials.forEach(material => material.dispose());
  }
}

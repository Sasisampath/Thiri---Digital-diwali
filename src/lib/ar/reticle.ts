import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, SRGBColorSpace, TextureLoader, Vector3 } from 'three';
import type { Scene, Texture } from 'three';
import type { Placement } from './types';

export class PlacementReticle {
  private geometry = new PlaneGeometry(0.6, 0.6);
  private material = new MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false, side: DoubleSide, toneMapped: false });
  private mesh = new Mesh(this.geometry, this.material);
  private texture: Texture | null = null;
  private disposed = false;
  constructor(private scene: Scene, onError: () => void) {
    this.mesh.visible = false;
    this.mesh.renderOrder = 10;
    scene.add(this.mesh);
    new TextureLoader().load(`${import.meta.env.BASE_URL}assets/ar/placement-reticle.svg`, texture => {
      if (this.disposed) { texture.dispose(); return; }
      texture.colorSpace = SRGBColorSpace;
      this.texture = texture; this.material.map = texture; this.material.needsUpdate = true;
    }, undefined, () => { if (!this.disposed) onError(); });
  }
  isReady() { return Boolean(this.texture && !this.disposed); }
  update(placement: Placement | null) {
    this.mesh.visible = Boolean(placement && this.texture);
    if (!placement) return;
    const normal = new Vector3(placement.normal.x, placement.normal.y, placement.normal.z).normalize();
    this.mesh.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal));
    this.mesh.position.set(placement.position.x + normal.x * 0.006, placement.position.y + normal.y * 0.006, placement.position.z + normal.z * 0.006);
  }
  dispose() { this.disposed = true; this.scene.remove(this.mesh); this.texture?.dispose(); this.material.dispose(); this.geometry.dispose(); }
}

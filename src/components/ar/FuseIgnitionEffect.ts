import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Points, PointsMaterial, SphereGeometry, Vector3 } from 'three';
import type { Object3D, Scene } from 'three';
/** Small world-space burst. Updated by the existing XR8 frame loop only. */
export class FuseIgnitionEffect {
  readonly root = new Group();
  private geometry = new BufferGeometry();
  private positions = new Float32Array(32 * 3);
  private velocities = Array.from({length:32}, () => new Vector3((Math.random()-.5)*.25, .06+Math.random()*.18, (Math.random()-.5)*.25));
  private material = new PointsMaterial({ color: '#FFD35A', size: .013, transparent: true, opacity: 1, depthWrite: false, blending: AdditiveBlending });
  private glowMaterial = new MeshBasicMaterial({ color: '#FFD35A', transparent: true, depthWrite: false, blending: AdditiveBlending });
  private glow = new Mesh(new SphereGeometry(.009, 10, 6), this.glowMaterial);
  private point = new Vector3();
  constructor(scene: Scene) {
    this.root.name = 'ThiriFuseIgnition'; this.root.visible = false;
    this.geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    this.root.add(new Points(this.geometry, this.material), this.glow); scene.add(this.root);
  }
  update(fuse: Object3D, elapsed: number, reducedMotion: boolean) {
    fuse.updateWorldMatrix(true, false); fuse.getWorldPosition(this.point); this.root.position.copy(this.point); this.root.visible = true;
    const t = Math.min(elapsed / 1000, .7), spread = reducedMotion ? .35 : 1;
    for(let i=0;i<32;i++) { const v=this.velocities[i]; this.positions[i*3]=v.x*t*spread; this.positions[i*3+1]=(v.y*t-.15*t*t)*spread; this.positions[i*3+2]=v.z*t*spread; }
    this.geometry.attributes.position.needsUpdate = true;
    this.material.opacity = Math.max(0, 1-t/.7); this.material.color.lerpColors(new Color('#FFF9F2'), new Color('#FF7049'), t/.7);
    this.glowMaterial.opacity = Math.max(.2, 1-t); this.glow.scale.setScalar(1+Math.sin(t*35)*.2);
  }
  hide() { this.root.visible = false; }
  dispose() { this.root.removeFromParent(); this.geometry.dispose(); this.material.dispose(); this.glow.geometry.dispose(); this.glowMaterial.dispose(); }
}

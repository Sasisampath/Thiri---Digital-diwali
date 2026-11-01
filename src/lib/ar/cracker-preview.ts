import { CanvasTexture, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry, SRGBColorSpace } from 'three';
import type { Quaternion, Scene, Vector3 } from 'three';
import type { CrackerType } from '../../config/crackers';
import { createCrackerModel } from '../../components/ar/models';
import type { ProceduralCrackerModel } from '../../components/ar/models/model';

export class CrackerPreview {
  readonly anchor = new Group();
  private models = new Map<CrackerType, ProceduralCrackerModel>();
  private model: ProceduralCrackerModel | null = null;
  private sky = new HemisphereLight(0xfff4df, 0x635575, 2.1);
  private key = new DirectionalLight(0xffffff, 2.7);
  private shadowTexture: CanvasTexture;
  private shadowMaterial: MeshBasicMaterial;
  private shadow: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private highlightMaterial = new MeshBasicMaterial({ color: '#7559E8', transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false });
  private highlight = new Mesh(new RingGeometry(0.46, 0.5, 40), this.highlightMaterial);
  private disposed = false;

  constructor(scene: Scene) {
    this.anchor.name = 'ThiriCrackerAnchor'; this.anchor.visible = false;
    const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Contact shadow could not be prepared');
    const gradient = ctx.createRadialGradient(48, 48, 4, 48, 48, 47);
    gradient.addColorStop(0, 'rgba(0,0,0,0.32)'); gradient.addColorStop(0.5, 'rgba(0,0,0,0.12)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 96, 96);
    this.shadowTexture = new CanvasTexture(canvas); this.shadowTexture.colorSpace = SRGBColorSpace;
    this.shadowMaterial = new MeshBasicMaterial({ map: this.shadowTexture, transparent: true, depthWrite: false, opacity: 0.7, toneMapped: false });
    this.shadow = new Mesh(new PlaneGeometry(1, 1), this.shadowMaterial); this.shadow.name = 'CrackerContactShadow'; this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.001;
    this.highlight.name = 'CrackerPreviewHighlight'; this.highlight.rotation.x = -Math.PI / 2; this.highlight.position.y = 0.003;
    this.anchor.add(this.shadow, this.highlight); this.key.position.set(-2, 4, 2);
    scene.add(this.anchor, this.sky, this.key);
  }
  ensure(type: CrackerType) {
    if (this.model?.type === type) return this.model;
    this.model?.root.removeFromParent();
    let model = this.models.get(type);
    if (!model) { model = createCrackerModel(type); this.models.set(type, model); }
    this.model = model; this.anchor.add(model.root);
    const footprint = Math.max(model.dimensions.x, model.dimensions.z) * 1.5;
    this.shadow.scale.set(footprint, footprint, 1); this.highlight.scale.setScalar(footprint * 0.75);
    return model;
  }
  getModel() { return this.model; }
  setVisible(visible: boolean) { this.anchor.visible = visible; }
  setPreview(preview: boolean) { this.model?.setPreview(preview); this.highlight.visible = preview; }
  setPose(position: Vector3, rotation: Quaternion, alpha = 1) {
    this.anchor.position.lerp(position, alpha); this.anchor.quaternion.slerp(rotation, alpha); this.anchor.scale.set(1, 1, 1); this.anchor.updateMatrixWorld(true);
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.anchor.removeFromParent(); this.sky.removeFromParent(); this.key.removeFromParent();
    this.models.forEach(model => model.dispose()); this.models.clear();
    this.shadow.geometry.dispose(); this.shadowMaterial.dispose(); this.shadowTexture.dispose();
    this.highlight.geometry.dispose(); this.highlightMaterial.dispose();
  }
}

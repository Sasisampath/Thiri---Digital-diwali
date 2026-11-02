import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import type { PerspectiveCamera, Scene } from 'three';
import type { PlacedCracker } from '../../../lib/ar/placed-cracker-state';
export type FireworkContext={placed:PlacedCracker;scene:Scene;camera:PerspectiveCamera;capacity:number;reducedMotion:boolean};
export interface FireworkEffect {
  readonly root:Group;
  readonly duration:number;
  readonly activeParticles:number;
  start():void;
  update(elapsed:number,budget:number,viewportHeight:number):void;
  pause():void;
  resume():void;
  stop():void;
  dispose():void;
}
export class ContactGlow {
  private material=new ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{strength:{value:0}},vertexShader:'varying vec2 uvPoint; void main(){uvPoint=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 uvPoint; uniform float strength; void main(){float r=length(uvPoint-.5)*2.;gl_FragColor=vec4(1.,.48,.09,exp(-r*r*5.)*strength*.22);}' });
  private mesh=new Mesh(new PlaneGeometry(.65,.65),this.material);
  constructor(parent:Group){this.mesh.name='FireworkGroundGlow';this.mesh.rotation.x=-Math.PI/2;this.mesh.position.y=.004;parent.add(this.mesh);}
  update(strength:number){this.material.uniforms.strength.value=strength;}
  dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.material.dispose();}
}
export function anchoredRoot(context:FireworkContext,name:string){const root=new Group();root.name=name;root.position.copy(context.placed.worldPosition);root.quaternion.copy(context.placed.worldRotation);root.scale.copy(context.placed.worldScale);context.scene.add(root);return root;}
export function localNodePosition(context:FireworkContext,name:string,fallback:Vector3){
  const node=context.placed.rootObject.getObjectByName(name);if(!node)throw new Error(`Missing ${name} in the placed model`);
  context.placed.rootObject.updateWorldMatrix(true,true);node.getWorldPosition(fallback);return context.placed.rootObject.worldToLocal(fallback);
}

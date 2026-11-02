import { Group, Vector3 } from 'three';
import { ParticleEmitter } from './ParticleEmitter';
import type { EmitterConfig } from './ParticleEmitter';
import type { FireworkContext, FireworkEffect } from './FireworkEffect';
const burstColors=[4,5,1,3];
export function burstConfig(origin:Vector3,at:number,reduced:boolean):EmitterConfig{
 return {start:at,end:at,rate:1,burst:true,sample:(_i,_b,r,s)=>{
   const azimuth=r(1)*Math.PI*2,vertical=r(2)*2-1,radial=Math.sqrt(1-vertical*vertical),speed=(.7+r(3)*1.9)*(reduced?.65:1);
   s.x=origin.x;s.y=origin.y;s.z=origin.z;s.vx=Math.cos(azimuth)*radial*speed;s.vy=vertical*speed;s.vz=Math.sin(azimuth)*radial*speed;s.gravity=.8;s.life=1.5+r(4)*1.7;s.size=.006+r(5)*.013;s.opacity=.95;s.color=burstColors[Math.floor(r(6)*4)];
 }};
}
/** Explicitly chosen viewport-relative sky preview, never advertised as a world anchor. */
export class RocketExplosionEffect implements FireworkEffect {
 readonly root=new Group();readonly duration=3.35;private burst:ParticleEmitter;
 constructor(private context:FireworkContext){this.root.name='RocketSkyPreview';this.root.matrixAutoUpdate=false;context.scene.add(this.root);const settings=burstConfig(new Vector3(0,.25,-4),0,context.reducedMotion);settings.ground=false;this.burst=new ParticleEmitter(context.capacity,settings,this.root);this.stop();}
 get activeParticles(){return this.burst.activeCount;}
 start(){this.burst.reset();this.root.visible=true;}
 update(t:number,budget:number,height:number){this.context.camera.updateMatrixWorld(true);this.root.matrix.copy(this.context.camera.matrixWorld);this.root.matrixWorldNeedsUpdate=true;this.burst.update(t,budget,height);}
 pause(){this.root.visible=false;}resume(){this.root.visible=true;}
 stop(){this.root.visible=false;this.burst?.reset();}
 dispose(){this.stop();this.root.removeFromParent();this.burst.dispose();}
}

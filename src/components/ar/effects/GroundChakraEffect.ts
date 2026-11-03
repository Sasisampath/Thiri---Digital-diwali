import { Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import { fireworksConfig } from '../../../config/fireworks';
import { ParticleEmitter } from './ParticleEmitter';
import { anchoredRoot, ContactGlow } from './FireworkEffect';
import type { FireworkContext, FireworkEffect } from './FireworkEffect';
const up=new Vector3(0,1,0);
export function chakraAngle(t:number,slowAt=3.3){const speed=36;if(t<.9)return speed*t*t/1.8;if(t<slowAt)return speed*(t-.45);const u=Math.min(1.1,t-slowAt);return speed*(slowAt-.45)+speed*(u-u*u/2.2);}
export class GroundChakraEffect implements FireworkEffect {
  readonly root;
  readonly duration=fireworksConfig.chakra.duration;
  private slowAt:number;
  private sparks:ParticleEmitter;
  private glow:ContactGlow;
  private visual:Object3D;
  private original:Quaternion;
  private spin=new Quaternion();
  constructor(context:FireworkContext){
    const visual=context.placed.rootObject.getObjectByName('VisualBody');if(!visual)throw new Error('Chakra visual body is missing.');
    this.slowAt=context.brandTransitionAt??3.3;
    this.root=anchoredRoot(context,'GroundChakraEffect');this.visual=visual;this.original=visual.quaternion.clone();const motion=context.reducedMotion?.6:1;
    this.sparks=new ParticleEmitter(context.capacity,{start:.04,end:context.brandTransitionAt===undefined?3.7:context.brandTransitionAt+.55,rate:450,sample:(i,b,r,s)=>{
      const intensity=Math.min(1,.12+b/.8,(3.9-b)/.8,context.brandTransitionAt===undefined?1:(context.brandTransitionAt+.55-b)/.55),a=chakraAngle(b,this.slowAt)+(i%2)*Math.PI+(r(1)-.5)*.35,speed=(.7+r(2)*1.4)*Math.max(.05,intensity)*motion;
      s.x=Math.sin(a)*.146;s.y=.042;s.z=Math.cos(a)*.146;s.vx=Math.sin(a)*speed;s.vz=Math.cos(a)*speed;s.vy=.08+r(3)*.3;s.gravity=1.9;s.life=.3+r(4)*.75;s.size=.004+r(5)*.008;s.opacity=.8*(context.brandTransitionAt===undefined?1:Math.max(0,Math.min(1,(context.brandTransitionAt+.55-b)/.55)));s.color=r(6)>.6?2:1;
    }},this.root);this.glow=new ContactGlow(this.root);this.stop();
  }
  get activeParticles(){return this.sparks.activeCount;}
  start(){this.sparks.reset();this.root.visible=true;}
  update(t:number,budget:number,height:number){this.visual.quaternion.copy(this.original).multiply(this.spin.setFromAxisAngle(up,chakraAngle(t,this.slowAt)));this.sparks.update(t,budget,height);this.glow.update(Math.max(0,Math.min(1,t/.3,(4.7-t)/.8)));}
  pause(){this.root.visible=false;}resume(){this.root.visible=true;}
  stop(){this.root.visible=false;this.sparks?.reset();}
  dispose(){this.stop();this.visual.quaternion.copy(this.original);this.root.removeFromParent();this.sparks.dispose();this.glow.dispose();}
}

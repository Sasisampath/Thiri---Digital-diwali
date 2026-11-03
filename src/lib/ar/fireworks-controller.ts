import { getCracker } from '../../config/crackers';
import { jazzhqBrand } from '../../config/jazzhq';
import type { JazzHQRevealPhase } from '../../config/jazzhq';
import { GroundChakraEffect } from '../../components/ar/effects/GroundChakraEffect';
import { RocketLaunchEffect } from '../../components/ar/effects/RocketLaunchEffect';
import { RocketExplosionEffect } from '../../components/ar/effects/RocketExplosionEffect';
import { FireworksAudio } from '../audio/fireworks-audio';
import type { PerspectiveCamera, Scene } from 'three';
import { FlowerPotFountain } from '../../components/ar/effects/FlowerPotFountain';
import type { FireworkEffect } from '../../components/ar/effects/FireworkEffect';
import { initialFireworksQuality, particleBudgets, fireworksConfig } from '../../config/fireworks';
import type { FireworksQuality } from '../../config/fireworks';
import type { CrackerType } from '../../config/crackers';
import type { CountdownContext } from './ignition-controller';
export type FireworksState='WAITING'|'READY'|'PLAYING'|'PAUSED'|'TRACKING_LOST'|'COMPLETED'|'CANCELLED'|'ERROR';
export type FireworksSummary={fireworksState:FireworksState;fireworksType:CrackerType|null;fireworksSpace:'world'|'camera-relative';fireworksError:string|null;rocketGuidance:boolean;fireworksQuality:FireworksQuality;logoRevealPhase:JazzHQRevealPhase};
export const initialFireworks:FireworksSummary={fireworksState:'WAITING',fireworksType:null,fireworksSpace:'world',fireworksError:null,rocketGuidance:false,fireworksQuality:'medium',logoRevealPhase:'NONE'};
/** Sole firework owner; advances only from the existing SDK frame callback. */
export class FireworksController {
  private summary:FireworksSummary={...initialFireworks,fireworksQuality:initialFireworksQuality()};
  private effect:FireworkEffect|null=null;
  private attempt:number|null=null;
  private startTime=0;
  private lastTime=0;
  private frameAverage=1/60;
  private slowSamples=0;
  private starts=0;
  private previewUsed=false;
  private launchSoundPlayed=false;
  private context:CountdownContext|null=null;
  private audio=new FireworksAudio();
  private revealStarted=false;
  private revealOrigin:number|null=null;
  constructor(private scene:Scene,private camera:PerspectiveCamera,private changed:()=>void,quality?:FireworksQuality){if(quality)this.summary.fireworksQuality=quality;}
  getSummary(){return this.summary;}
  private publish(patch:Partial<FireworksSummary>){if(Object.entries(patch).every(([k,v])=>this.summary[k as keyof FireworksSummary]===v))return;this.summary={...this.summary,...patch};this.changed();}
  countdownFinished(context:CountdownContext|null,valid:boolean,now:number){
    if(!valid||!context||context.selectedCracker!==context.placedCracker.type||!getCracker(context.selectedCracker)||this.summary.fireworksState!=='WAITING'||this.attempt!==null)return false;
    this.context=context;this.attempt=context.ignitionTimestamp;this.publish({fireworksState:'READY',fireworksType:context.selectedCracker});
    try{
      const cracker=getCracker(context.selectedCracker);
      const effectContext={placed:context.placedCracker,scene:this.scene,camera:this.camera,capacity:particleBudgets[this.summary.fireworksQuality],reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,brandTransitionAt:cracker.specialReveal?jazzhqBrand.naturalSeconds:undefined};
      this.effect=cracker.baseType==='flower-pot'?new FlowerPotFountain(effectContext):cracker.baseType==='ground-chakra'?new GroundChakraEffect(effectContext):new RocketLaunchEffect(effectContext);
      this.startTime=now;this.lastTime=now;this.effect.start();this.starts++;
      if(cracker.baseType!=='rocket')this.audio.play(cracker.baseType,cracker.specialReveal?(cracker.baseType==='flower-pot'?4.9:4.6):undefined);
      this.publish({fireworksState:'PLAYING'});return true;
    }catch(error){this.effect?.dispose();this.effect=null;this.publish({fireworksState:'ERROR',fireworksError:error instanceof Error?error.message:'The firework could not start.'});return false;}
  }
  update(now:number,tracking:boolean,viewportHeight:number){
    if(this.summary.fireworksState!=='PLAYING'||!this.effect)return;
    if(!tracking&&this.summary.fireworksSpace==='world'){this.interrupt();return;}
    const dt=(now-this.lastTime)/1000;this.lastTime=now;
    if(dt>0&&dt<.25){this.frameAverage=this.frameAverage*.92+dt*.08;if(this.frameAverage>.034)this.slowSamples++;else this.slowSamples=Math.max(0,this.slowSamples-1);if(this.slowSamples>=24&&this.summary.fireworksQuality!=='low')this.publish({fireworksQuality:'low'});}
    const elapsed=Math.max(0,(now-this.startTime)/1000);
    if(this.effect instanceof RocketLaunchEffect){
      if(!this.launchSoundPlayed&&elapsed>=fireworksConfig.rocket.launchStart){this.launchSoundPlayed=true;this.audio.play('rocket-launch');}
      this.publish({rocketGuidance:!this.effect.hasBurst && elapsed>.45});
      if(!this.effect.hasBurst && elapsed>=fireworksConfig.rocket.burstAt){
        if(this.effect.burstVisible(this.camera)){this.effect.triggerBurst(elapsed);this.audio.play('rocket-burst');this.publish({rocketGuidance:false});}
        else if(elapsed>=fireworksConfig.rocket.lookUpDeadline){this.effect.pause();this.audio.stop();this.publish({fireworksState:'PAUSED',rocketGuidance:true});return;}
      }
    }
    this.effect.update(Math.min(elapsed,this.effect.duration),particleBudgets[this.summary.fireworksQuality],viewportHeight);
    const brandEnd=this.updateBrandReveal(elapsed);
    if(elapsed>=Math.max(this.effect.duration,brandEnd)){this.effect.stop();this.effect.dispose();this.effect=null;this.audio.stop();this.publish({fireworksState:'COMPLETED',rocketGuidance:false});}
  }
  private updateBrandReveal(elapsed:number):number {
    if(!this.context||!getCracker(this.context.selectedCracker).specialReveal)return 0;
    const target=this.effect instanceof RocketLaunchEffect ? this.effect.burstStartedAt===null?null:this.effect.burstStartedAt+jazzhqBrand.naturalSeconds : jazzhqBrand.naturalSeconds;
    if(target===null)return 0;
    if(!this.revealStarted&&elapsed>=target){this.revealStarted=true;this.revealOrigin=target;}
    const total=jazzhqBrand.entranceSeconds+jazzhqBrand.holdSeconds+jazzhqBrand.exitSeconds;
    if(this.revealOrigin===null)return this.revealStarted?0:target+total;
    const t=elapsed-this.revealOrigin;
    const phase:JazzHQRevealPhase=t<0||t>=total?'NONE':t<jazzhqBrand.entranceSeconds?'ENTERING':t<jazzhqBrand.entranceSeconds+jazzhqBrand.holdSeconds?'HOLDING':'EXITING';
    this.publish({logoRevealPhase:phase});return this.revealOrigin+total;
  }
  interrupt(reason:'tracking'|'background'|'stale'='tracking'){
    if(this.summary.fireworksState!=='PLAYING')return;
    if(reason==='tracking'&&this.summary.fireworksSpace==='camera-relative')return;
    this.revealOrigin=null;
    this.effect?.pause();this.audio.stop();this.publish({fireworksState:reason==='tracking'?'TRACKING_LOST':'PAUSED',rocketGuidance:false,logoRevealPhase:'NONE'});
  }
  setSound(enabled:boolean){this.audio.setEnabled(enabled);}
  playSkyPreview(now:number,feedLive:boolean){
    if(!feedLive||!this.context||getCracker(this.context.selectedCracker).baseType!=='rocket'||this.previewUsed||(this.summary.fireworksState==='PLAYING'&&!this.summary.rocketGuidance)||!['PLAYING','PAUSED','TRACKING_LOST'].includes(this.summary.fireworksState))return false;
    this.previewUsed=true;this.revealOrigin=null;this.effect?.dispose();this.audio.stop();
    this.effect=new RocketExplosionEffect({placed:this.context.placedCracker,scene:this.scene,camera:this.camera,capacity:particleBudgets[this.summary.fireworksQuality],reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
    this.startTime=now;this.lastTime=now;this.effect.start();this.starts++;this.audio.play('rocket-burst');this.publish({fireworksState:'PLAYING',fireworksSpace:'camera-relative',rocketGuidance:false,logoRevealPhase:'NONE'});return true;
  }
  diagnostics(){return {starts:this.starts,activeParticles:this.effect?.activeParticles??0,effect:this.effect?.root.name??null,capacity:particleBudgets[this.summary.fireworksQuality]};}
  reset(){this.effect?.dispose();this.effect=null;this.attempt=null;this.previewUsed=false;this.launchSoundPlayed=false;this.revealStarted=false;this.revealOrigin=null;this.context=null;this.audio.stop();this.summary={...initialFireworks,fireworksQuality:this.summary.fireworksQuality};this.changed();}
  cancel(){if(this.summary.fireworksState==='WAITING')return;this.effect?.stop();this.audio.stop();this.publish({fireworksState:'CANCELLED',rocketGuidance:false,logoRevealPhase:'NONE'});}
  dispose(){this.audio.stop();this.effect?.dispose();this.effect=null;this.context=null;}
}

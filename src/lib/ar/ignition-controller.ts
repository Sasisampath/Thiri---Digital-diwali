import type { PerspectiveCamera, Scene } from 'three';
import { ignitionConfig } from '../../config/ignition';
import { FuseIgnitionEffect } from '../../components/ar/FuseIgnitionEffect';
import { IgnitionAudio } from '../audio/ignition-audio';
import { hiddenFuse, projectFuse, withinFuseRadius } from './fuse-projection';
import type { FuseProjection } from './fuse-projection';
import type { PlacedCracker } from './placed-cracker-state';
export type IgnitionPhase = 'IDLE' | 'FIRESTICK_READY' | 'DRAGGING' | 'FUSE_CONTACT' | 'IGNITING' | 'IGNITED' | 'TRACKING_LOST' | 'ERROR';
export type IgnitionSummary = { ignitionPhase: IgnitionPhase; fuseVisible: boolean; ignitionNear: boolean; countdown: number | null; ignitionInterrupted: boolean; ignitionError: string | null };
export const initialIgnition: IgnitionSummary = { ignitionPhase:'IDLE', fuseVisible:false, ignitionNear:false, countdown:null, ignitionInterrupted:false, ignitionError:null };
export type CountdownContext = { selectedCracker: PlacedCracker['type']; placedCracker: PlacedCracker; fusePoint: PlacedCracker['fusePoint']; ignitionTimestamp: number; arSession: object };
export class IgnitionController {
  private summary = {...initialIgnition};
  private placed: PlacedCracker | null = null;
  private active = false;
  private armed = false;
  private tracking = false;
  private lastFrame = 0;
  private projection: FuseProjection = {...hiddenFuse};
  private tip: {x:number;y:number} | null = null;
  private dragging = false;
  private started: number | null = null;
  private countdownStarted: number | null = null;
  private fired = false;
  private effect: FuseIgnitionEffect;
  private audio = new IgnitionAudio();
  private context: CountdownContext | null = null;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  constructor(scene: Scene, private canvas: HTMLCanvasElement, private changed: () => void, private projectionChanged: (p:FuseProjection)=>void, private arSession: object, readonly hitRadius = ignitionConfig.hitRadiusCssPx) { this.effect = new FuseIgnitionEffect(scene); }
  getSummary() { return this.summary; }
  getCountdownContext() { return this.context; }
  private publish(patch:Partial<IgnitionSummary>) { if(Object.entries(patch).every(([k,v])=>this.summary[k as keyof IgnitionSummary]===v))return; this.summary={...this.summary,...patch};this.changed(); }
  enter(placed:PlacedCracker|null) {
    this.active=true;
    if(placed?.rootObject!==this.placed?.rootObject || !placed) this.reset(placed);
    this.placed=placed;
    if(!placed)this.publish({ignitionPhase:'ERROR',ignitionError:'Return to placement and place your cracker first.'});
  }
  private reset(placed:PlacedCracker|null) { this.placed=placed;this.armed=false;this.started=null;this.countdownStarted=null;this.fired=false;this.context=null;this.dragging=false;this.tip=null;this.effect.hide();this.audio.stop();this.summary={...initialIgnition};this.changed(); }
  leave() { this.active=false;this.cancelDrag();if(this.fired)this.interrupt();this.effect.hide();this.audio.stop();this.projectionChanged({...hiddenFuse}); }
  setSound(enabled:boolean) { this.audio.setEnabled(enabled); }
  arm() { this.armed=true; if(this.usable(performance.now())&&!this.fired)this.publish({ignitionPhase:'FIRESTICK_READY'}); }
  private usable(now:number) { return this.active&&this.tracking&&this.placed&&this.projection.visible&&now-this.lastFrame<=350&&!this.summary.ignitionInterrupted; }
  beginDrag() { if(!this.armed||this.fired||!this.usable(performance.now()))return false;this.dragging=true;this.audio.play('crackle');this.publish({ignitionPhase:'DRAGGING'});return true; }
  moveTip(tip:{x:number;y:number}) { this.tip=tip;this.checkContact(performance.now()); }
  cancelDrag() { this.dragging=false;this.tip=null;if(!this.fired)this.audio.stop();if(!this.fired&&this.summary.ignitionPhase==='DRAGGING')this.publish({ignitionPhase:this.tracking?'FIRESTICK_READY':'TRACKING_LOST',ignitionNear:false}); }
  tap() { return this.ignite(performance.now()); }
  private checkContact(now:number) {
    if(!this.dragging||!this.tip||!this.usable(now)||this.fired)return;
    this.publish({ignitionNear:withinFuseRadius(this.tip,this.projection,this.hitRadius*1.6)});
    if(withinFuseRadius(this.tip,this.projection,this.hitRadius))this.ignite(now);
  }
  private ignite(now:number) {
    if(!this.armed||this.fired||!this.usable(now))return false;
    this.fired=true;this.dragging=false;this.started=now;this.audio.stop();this.audio.play('ignite');
    this.publish({ignitionPhase:'FUSE_CONTACT',ignitionNear:false});return true;
  }
  update(camera:PerspectiveCamera,tracking:boolean,now:number) {
    if(!this.active)return;
    if(!this.placed) { this.publish({ignitionPhase:'ERROR',ignitionError:'Return to placement and place your cracker first.'});return; }
    this.lastFrame=now;this.tracking=tracking;
    this.projection=this.placed?projectFuse(this.placed.fusePoint,camera,this.canvas.getBoundingClientRect()):{...hiddenFuse};
    if(!tracking)this.projection.visible=false;
    this.projectionChanged(this.projection);this.publish({fuseVisible:this.projection.visible});
    if(!tracking) {this.lost();return;}
    if(this.summary.ignitionInterrupted)return;
    if(this.started!==null) {
      const elapsed=now-this.started;
      if(elapsed<700) { this.publish({ignitionPhase:'IGNITING'});this.effect.update(this.placed!.fusePoint,elapsed,this.reduced.matches); }
      else {
        this.effect.hide();
        // Start once, when the completed ignition is observed, never before it.
        if(this.countdownStarted===null) {this.audio.stop();this.countdownStarted=now;this.context={selectedCracker:this.placed!.type,placedCracker:this.placed!,fusePoint:this.placed!.fusePoint,ignitionTimestamp:this.started,arSession:this.arSession};}
        const remaining=Math.max(0,5-Math.floor((now-this.countdownStarted)/1000));
        this.publish({ignitionPhase:'IGNITED',countdown:remaining});
      }
    } else {
      if(!this.dragging)this.publish({ignitionPhase:this.armed?'FIRESTICK_READY':'IDLE'});
      if(!this.projection.visible)this.cancelDrag();
      this.checkContact(now);
    }
  }
  lost() {
    this.tracking=false;this.dragging=false;this.tip=null;this.projection={...hiddenFuse};this.projectionChanged(this.projection);this.effect.hide();this.audio.stop();
    this.publish({fuseVisible:false,ignitionNear:false});
    if(this.fired)this.interrupt();else this.publish({ignitionPhase:'TRACKING_LOST',fuseVisible:false,ignitionNear:false});
  }
  interrupt() { this.effect.hide();this.audio.stop();this.dragging=false;this.tip=null;this.publish({ignitionInterrupted:true,ignitionNear:false,countdown:null}); }
  /** Explicit user action cancels the old attempt; no automatic replay after loss/background. */
  resetAttempt() { this.reset(this.placed); }
  forgetPlacement() { this.leave(); this.reset(null); }
  dispose() {this.leave();this.effect.dispose();this.context=null;this.placed=null;}
}

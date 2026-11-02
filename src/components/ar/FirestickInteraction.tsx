import { useEffect, useRef } from 'react';
import type { GroundARSession } from '../../lib/ar/engine';
import type { IgnitionSummary } from '../../lib/ar/ignition-controller';
import DraggableFirestick from './DraggableFirestick';
import '../../styles/fuse-interaction.css';
type Props = IgnitionSummary & { session:GroundARSession|null; onBack:()=>void; onRescan:()=>void };
export default function FirestickInteraction({session,ignitionPhase,fuseVisible,ignitionNear,countdown,ignitionInterrupted,ignitionError,onBack,onRescan}:Props) {
 const target=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const busy=['FUSE_CONTACT','IGNITING','IGNITED'].includes(ignitionPhase);
 const ready=['FIRESTICK_READY','DRAGGING'].includes(ignitionPhase)&&fuseVisible&&!ignitionInterrupted;
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[]);
 useEffect(()=>session?.subscribeFuseProjection(p=>{const el=target.current;if(!el)return;el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;el.style.visibility=p.visible?'visible':'hidden';}),[session]);
 useEffect(()=>{if(!session||ignitionPhase!=='IDLE')return;const timer=window.setTimeout(()=>session.armFirestick(),matchMedia('(prefers-reduced-motion: reduce)').matches?0:250);return()=>clearTimeout(timer);},[session,ignitionPhase]);
 const title=ignitionError?'Let’s return to placement.':ignitionInterrupted?'Ignition paused.':ignitionPhase==='TRACKING_LOST'?"Let's find your cracker again.":countdown!==null?(countdown>0?'Your celebration starts in…':'Ready for the next spark.') : busy?'The fuse is lit.':!fuseVisible?'Point your camera at the fuse.':'Drag the firestick to the fuse';
 return <>
  <div ref={target} className={`fuse-target${ignitionNear?' is-near':''}${busy?' is-igniting':''}`} aria-hidden="true"/>
  <DraggableFirestick ready={ready} hidden={busy||ignitionInterrupted||Boolean(ignitionError)} onBegin={()=>session?.beginFirestickDrag()??false} onTip={tip=>session?.moveFirestick(tip)} onCancel={()=>session?.cancelFirestickDrag()}/>
  <section className="fuse-instructions" aria-labelledby="fuse-instruction-title" data-ignition-state={ignitionPhase}>
   <h1 ref={heading} id="fuse-instruction-title" tabIndex={-1}>{title}</h1>
   {countdown!==null&&countdown>0&&<p className="fuse-countdown" role="timer" aria-live="polite" aria-atomic="true">{countdown}</p>}
   {countdown===0&&<p>Fireworks are coming in the next screen.</p>}
   {ignitionInterrupted&&<p>The sequence was cancelled. Return to placement to safely start a new attempt.</p>}
   {ignitionError&&<p role="alert">{ignitionError}</p>}
   {!busy&&!ignitionInterrupted&&!ignitionError&&<button type="button" className="fuse-tap" disabled={!ready} onClick={()=>session?.tapToLight()}>Tap to Light</button>}
   {(ignitionInterrupted||ignitionError||countdown===0)&&<button type="button" className="ar-secondary-button" onClick={onBack}>Return to placement</button>}
   {ignitionPhase==='TRACKING_LOST'&&!ignitionInterrupted&&<button type="button" className="ar-secondary-button" onClick={onRescan}>Rescan</button>}
  </section>
 </>;
}

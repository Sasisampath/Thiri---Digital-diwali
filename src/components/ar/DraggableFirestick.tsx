import { useEffect, useRef } from 'react';
import { ignitionConfig } from '../../config/ignition';
import type { PointerEvent } from 'react';
/** Shared SVG viewBox: 100×300. Both fallback states have the same physical tip. */
export const firestickTip = ignitionConfig.artwork.tip;
type Props = { ready:boolean; hidden:boolean; onBegin:()=>boolean; onTip:(tip:{x:number;y:number})=>void; onCancel:()=>void };
export default function DraggableFirestick({ready,hidden,onBegin,onTip,onCancel}:Props) {
 const element=useRef<HTMLButtonElement>(null);
 const drag=useRef<{id:number;x:number;y:number}|null>(null);
 const callbacks=useRef({onCancel});callbacks.current={onCancel};
 const reset=()=>{const el=element.current;const old=drag.current;drag.current=null;if(el){el.classList.remove('is-dragging');el.style.transform='translate3d(0,0,0)';if(old&&el.hasPointerCapture(old.id))el.releasePointerCapture(old.id);}callbacks.current.onCancel();};
 useEffect(()=>{if(!ready||hidden)reset();},[ready,hidden]);
 useEffect(()=>{const cancel=()=>reset();window.addEventListener('resize',cancel);window.addEventListener('orientationchange',cancel);return()=>{window.removeEventListener('resize',cancel);window.removeEventListener('orientationchange',cancel);callbacks.current.onCancel();};},[]);
 const move=(e:PointerEvent<HTMLButtonElement>)=>{const d=drag.current,el=element.current;if(!d||d.id!==e.pointerId||!el)return;e.preventDefault();el.style.transform=`translate3d(${e.clientX-d.x}px,${e.clientY-d.y}px,0)`;const r=el.getBoundingClientRect();onTip({x:r.left+r.width*firestickTip.x,y:r.top+r.height*firestickTip.y});};
 const down=(e:PointerEvent<HTMLButtonElement>)=>{if(!e.isPrimary||e.button!==0||drag.current||!ready||!onBegin())return;e.preventDefault();const el=e.currentTarget;drag.current={id:e.pointerId,x:e.clientX,y:e.clientY};el.classList.add('is-dragging');el.setPointerCapture(e.pointerId);const r=el.getBoundingClientRect();onTip({x:r.left+r.width*firestickTip.x,y:r.top+r.height*firestickTip.y});};
 return <button ref={element} type="button" className={`firestick-drag${ready?' is-lit':''}${hidden?' is-hidden':''}`} disabled={!ready||hidden} aria-label="Drag firestick to the fuse, or use Tap to Light" onPointerDown={down} onPointerMove={move} onPointerUp={e=>{if(drag.current?.id===e.pointerId)reset();}} onPointerCancel={reset} onLostPointerCapture={()=>{if(drag.current)reset();}}>
   <img className="firestick-unlit" src={ignitionConfig.artwork.unlit} alt="" draggable="false" width={ignitionConfig.artwork.width} height={ignitionConfig.artwork.height}/>
   <img className="firestick-lit" src={ignitionConfig.artwork.lit} alt="" draggable="false" width={ignitionConfig.artwork.width} height={ignitionConfig.artwork.height}/>
 </button>;
}

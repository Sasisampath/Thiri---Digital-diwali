import { useState } from 'react';
import { jazzhqBrand } from '../../config/jazzhq';
import type { JazzHQRevealPhase } from '../../config/jazzhq';
import '../../styles/jazzhq-reveal.css';
/** Screen-space branding only. Timing belongs to the shared AR frame controller. */
export default function JazzHQLogoReveal({phase}:{phase:JazzHQRevealPhase}) {
  const [fallback,setFallback]=useState(false);
  if(phase==='NONE')return null;
  return <div className={`jazzhq-reveal phase-${phase.toLowerCase()}`} data-logo-reveal={phase} role="status" aria-live="polite">
    <div className="jazzhq-logo-plate">
      <img src={fallback?jazzhqBrand.pngFallback:jazzhqBrand.logo} alt="JazzHQ" width={jazzhqBrand.width} height={jazzhqBrand.height} onError={()=>{if(!fallback)setFallback(true);}} />
      <span className="jazzhq-gold-spark spark-one" aria-hidden="true"/><span className="jazzhq-gold-spark spark-two" aria-hidden="true"/><span className="jazzhq-gold-spark spark-three" aria-hidden="true"/>
    </div>
    <p>Happy Diwali from JazzHQ</p>
  </div>;
}

import { useEffect, useRef } from 'react';
import type { Cracker } from '../../config/crackers';
import '../../styles/cracker-selection.css';

type Props = { cracker: Cracker; trackingReady: boolean; onBack: () => void; onScan: () => void; onClose: () => void };
/** Screen 06 integration boundary only. No image/model is placed into the world here. */
export default function CrackerPlacementBoundary({ cracker, trackingReady, onBack, onScan, onClose }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <section className="cracker-placement-boundary" aria-labelledby="placement-boundary-title" data-selected-cracker={cracker.id} data-placement-type={cracker.placementType}>
    <header className="cracker-sheet-header"><div><p className="placement-step-label">SCREEN 06 · NEXT STEP</p><h1 id="placement-boundary-title" ref={heading} tabIndex={-1}>Place your cracker</h1></div><button className="cracker-sheet-close" type="button" aria-label="Close AR and return to Welcome" onClick={onClose}>×</button></header>
    <h2>{cracker.name} selected</h2>
    <p>Placement controls are coming next. Your camera stays live.</p>
    <p className="placement-tracking-note" role="status">{trackingReady ? 'A tracked spot is available.' : 'Find a tracked spot before placing your cracker.'}</p>
    <button className="thiri-primary-button" type="button" onClick={onBack}>Change cracker</button>
    <button className="ar-secondary-button" type="button" onClick={onScan}>Back to scanning</button>
  </section>;
}

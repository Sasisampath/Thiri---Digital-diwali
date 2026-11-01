import { useEffect, useRef } from 'react';
import type { Cracker } from '../../config/crackers';
import type { PlacementSummary } from '../../lib/ar/placed-cracker-state';
import '../../styles/cracker-placement.css';

type Props = PlacementSummary & { cracker: Cracker; onPlace: () => void; onLight: () => void; onReposition: () => void; onRescan: () => void };
export default function CrackerPlacementScreen({ cracker, placementPhase, hasPlacedCracker, canPlaceCracker, canLightFuse, placementError, onPlace, onLight, onReposition, onRescan }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const lost = placementPhase === 'TRACKING_LOST';
  const error = placementPhase === 'ERROR';
  const title = error ? 'Let’s try positioning again.' : hasPlacedCracker ? lost ? "Let's find your cracker again." : 'Cracker placed!' : 'Find the perfect spot';
  const description = placementError ?? (hasPlacedCracker ? lost ? 'Move your phone slowly to recover tracking.' : 'Ready to light it?' : lost || placementPhase === 'SEARCHING' ? 'Move your phone slowly to find the ground again.' : 'Move your phone to position the cracker.');
  return <section className="cracker-placement-panel" aria-labelledby="cracker-placement-title" data-selected-cracker={cracker.id} data-placement-type={cracker.placementType} data-placement-phase={placementPhase}>
    <div className="placement-copy" aria-live="polite"><p className="placement-cracker-name">{cracker.name}</p><h1 id="cracker-placement-title" ref={heading} tabIndex={-1}>{title}</h1><p>{description}</p>
      {!hasPlacedCracker && placementPhase === 'PREVIEWING' && <small>Hold your phone steady to place it.</small>}
    </div>
    <button className="thiri-primary-button" type="button" disabled={hasPlacedCracker ? !canLightFuse : !canPlaceCracker} onClick={hasPlacedCracker ? onLight : onPlace}>{hasPlacedCracker ? <>Light the Fuse <span aria-hidden="true">→</span></> : 'Place Cracker'}</button>
    <div className="placement-secondary-actions">
      {hasPlacedCracker && <button type="button" className="ar-secondary-button" onClick={onReposition}>Reposition</button>}
      {(lost || error) && <button type="button" className="ar-secondary-button" onClick={onRescan}>Rescan</button>}
    </div>
    {lost && <small className="placement-recovery-note">Use a well-lit, textured floor. Rescanning clears this placement.</small>}
  </section>;
}

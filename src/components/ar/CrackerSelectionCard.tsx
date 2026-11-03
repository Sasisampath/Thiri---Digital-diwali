import type { Cracker, CrackerType } from '../../config/crackers';
import AssetImage from '../AssetImage';

type Props = { cracker: Cracker; selected: boolean; disabled: boolean; onSelect: (id: CrackerType) => void };
export default function CrackerSelectionCard({ cracker, selected, disabled, onSelect }: Props) {
  return <label className="cracker-selection-card" data-cracker-id={cracker.id}>
    <input className="cracker-radio" type="radio" name="thiri-cracker" value={cracker.id} checked={selected} disabled={disabled} onChange={() => onSelect(cracker.id)} />
    <span className={`cracker-card-face${selected ? ' is-selected' : ''}`}>
      <span className="cracker-card-art"><AssetImage src={cracker.thumbnail} alt="" width="1254" height="1254" decoding="async" /></span>
      {cracker.brand==='jazzhq'&&<span className="cracker-brand-badge" aria-hidden="true"><img src={`${import.meta.env.BASE_URL}assets/branding/jazzhq-logo.svg`} width="382" height="63.5" alt=""/></span>}
      <span className="cracker-card-name">{cracker.name}</span>
      {selected && <span className="cracker-card-check" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12" fill="none"><path d="m4 8 2.5 2.5L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
    </span>
  </label>;
}

import AssetImage from '../AssetImage';
export default function ScanInstructions({ dismissed }: { dismissed: boolean }) {
  return <aside className={`ar-guide${dismissed ? ' is-dismissed' : ''}`} aria-hidden={dismissed}>
    <div className="ar-guide-art"><AssetImage src={`${import.meta.env.BASE_URL}assets/onboarding/scan-ground-guide.png`} alt="" width="1280" height="1280" /></div>
    <div><h2>Find your spot</h2><p>Point your camera at the ground.</p><small>Move your phone slowly.</small></div>
  </aside>;
}

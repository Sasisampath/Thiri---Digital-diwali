# Screen 05 — Choose Your Cracker

## Implemented flow

Scan (READY) → Choose a Cracker → Pick Flower Pot / Ground Chakra / Rocket → Place [name] → Screen 06 integration boundary.

The existing camera canvas remains visible behind a rounded dark-plum bottom sheet. Flower Pot is selected by default. The three equal native-radio cards use the supplied transparent artwork, WebP-first loading, contain sizing, visible selected borders/checkmarks, keyboard support and 150–200 ms feedback. Reduced Motion disables decorative transitions. An exit animation completes before moving to Screen 06; interrupted animation timers are cleaned up on unmount.

## Files

- `src/config/crackers.ts`: the single shared list of IDs, names, thumbnail paths and placement types.
- `src/components/ar/CrackerSelectionSheet.tsx`: live-camera selection sheet and dynamic Place CTA.
- `src/components/ar/CrackerSelectionCard.tsx`: accessible native-radio card and artwork.
- `src/components/ar/CrackerPlacementBoundary.tsx`: explicitly labeled Screen 06 boundary; no model placement or simulated success.
- `src/styles/cracker-selection.css`: branded sheet/cards, safe areas, short-screen/landscape rules, entrance/exit and reduced motion.
- `src/lib/ar/types.ts`, `tracking.ts`, `engine.ts`: shared selected cracker and guarded future placement context.
- `src/components/ar/ScanGroundScreen.tsx`: mounts child UI over the same engine/canvas, reuses the existing sound toggle, shows Back in selection/placement, and retains Close behavior.
- `src/App.tsx`: `/choose-cracker` and `/place-cracker`, session-preserving HTML/browser Back and direct-link consent guards.
- `scripts/optimize-images.mjs`: new selection artwork jobs, quality 85, alpha preserved, no upscaling or changes to PNG originals.
- `scripts/verify-ar-build.mjs`: also requires the selection WebPs in the production output.
- `tests/selection.cjs`: mobile layout, assets, selection, navigation, tracking loss, shared state and camera/session preservation.

## Assets

Originals plus optimized WebP versions:

- `/assets/crackers/selection/flower-pot-selection.png` / `.webp`
- `/assets/crackers/selection/ground-chakra-selection.png` / `.webp`
- `/assets/crackers/selection/rocket-selection.png` / `.webp`

The original PNGs are exact copies of the three images supplied for Screen 05. Existing Welcome cracker artwork remains unchanged. Selection images are HTML thumbnails only: they are never added to the Three.js scene or presented as 3D models.

## Shared state and tracking

`GroundARSession` owns `snapshot.selectedCracker`, initially `flower-pot`. `selectCracker(id)` publishes only the selected ID; it does not touch camera acquisition, tracking configuration, the renderer, anchor data or SDK lifecycle. Both selection and the placement boundary read the same session snapshot/configuration.

The session remains mounted across scan, choose and place routes. The initialization effect has no route-mode or selected-ID dependency. Navigation does not restart XR8, open another stream or ask for camera permission. The existing sound control remains the single sound toggle.

LIMITED/lost/paused tracking clears placement evidence while retaining the selected cracker. All three cards and the next-flow CTA remain usable during temporary tracking loss. The sheet shows a small recovery message; no timer restores readiness.

The final Screen 06 world-placement action must call:

```ts
const context = session.getPlacementContext();
if (!context) {
  // Remain in placement guidance until tracking and a valid candidate recover.
  return;
}
// context.cracker.id / placementType and context.placement are the integration input.
```

This guard calls the existing fresh-tracking/placement validation. It returns null for a stopped session, invalid/stale tracking or missing candidate. Merely picking a cracker never places anything. The Screen 06 boundary currently offers only Change cracker and Back to scanning; real models/procedural geometry and the final placement UI are future work.

Placement types: Flower Pot and Rocket use `ground-upright`; Ground Chakra uses `ground-flat`.

## Navigation and lifecycle

- Top-left Back on selection returns to Scan without a camera restart; selected ID is retained.
- Top-left Back or Change cracker from Screen 06 returns to selection with the same ID.
- Browser Back follows the same AR route history without duplicate replacement entries.
- Back to scanning may step across the two owned AR history entries when invoked from Screen 06.
- Close stops/releases the existing AR session and returns to Welcome.
- Refresh/direct links to choose/place require the existing explicit camera flow; they do not acquire a camera automatically.

The current selection persists for the lifetime of an AR session, not across closing/reloading into a fresh session. A full engine restart after a fatal error creates a fresh session; normal temporary tracking loss does not.

## Verification

`npm run build` passes strict TypeScript, Vite compilation and runtime/asset verification. The expected large lazy Three.js chunk warning remains.

`npm run test:selection` passes in Chromium and WebKit at 320×568, 375×812, 390×844 and 428×926. Checks include three correctly loaded WebPs, default and exclusive selection, CTA labels, keyboard arrows, animated exit/reduced motion, tracking-loss selection, flat/upright metadata, stable canvas/scene identity, one SDK run, no extra native camera calls, HTML/browser Back, and Close cleanup. The selected sheet was visually inspected at 390×844 over a test SDK background.

These tests inject camera/pose/SDK fixtures. They do not certify physical-device SLAM. Real iPhone Safari/Android Chrome checks remain necessary. Screen 06 models, actual placement, fuse lighting, countdown and fireworks are intentionally not implemented.

For manual testing, use the HTTPS Vercel deployment, complete the existing permission and scan flow, then try every card and Place label. Temporarily lose tracking while selecting, verify the selection is retained and the camera continues, go forward/back through Screen 06, and confirm the camera indicator remains active until Close. Check all four sizes, short-screen safe areas and Reduce Motion. The real placement action must remain unavailable until both a valid candidate and real 3D implementation exist.

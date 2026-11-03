# Screen 04 — Scan the Ground

> Audio update (2026-11-03): historical silent/mute behavior below is superseded by [AUDIO.md](AUDIO.md). Six local cues now play through gesture-unlocked Web Audio, enabled by default; temporary synthesis is explicitly identified.

## Source and versions

Official references used:

- [Three.js World Effects example](https://github.com/8thwall/threejs-world-effects-example), inspected at commit `2e18f3abefc4db2d190b66c2ffcdc9c852ebf2e5`.
- [Engine loading and pipeline overview](https://8thwall.org/docs/engine/overview).
- [XrController pipeline output](https://8thwall.org/docs/api/engine/xrcontroller/pipelinemodule), [hitTest](https://8thwall.org/docs/api/engine/xrcontroller/hittest), [configuration](https://8thwall.org/docs/api/engine/xrcontroller/configure), and [run](https://8thwall.org/docs/api/engine/xr8/run).

Pinned dependencies: `@8thwall/engine-binary` **1.0.0**, `three` **0.183.2**. The real distribution’s version API reports `0.0.0.0`; the npm package version and lockfile identify the installed artifact. The binary is not MIT-licensed. Its exact license is shipped at `/licenses/8thwall-engine-LICENSE.txt` with notices and a visible attribution link. No binary files are modified.

## Files created/changed

| File | Purpose |
| --- | --- |
| `src/lib/ar/engine.ts` | Lazy SDK loader, exclusive SDK owner, lifecycle/pipeline, frame processing, snapshot store and saved placement |
| `src/lib/ar/types.ts` | Narrow verified SDK API boundary and placement/state types |
| `src/lib/ar/tracking.ts` | Explicit seven-state model and user instructions |
| `src/lib/ar/placement.ts` | Engine surface validation and conservative horizontal SLAM-map support fitting |
| `src/lib/ar/reticle.ts` | Real Three.js world-space SVG textured plane and GPU resource disposal |
| `src/components/ar/ScanGroundScreen.tsx` | Canvas, safe-area controls, sound preference, instructions, failure states, CTA and placeholder |
| `src/components/ar/ScanInstructions.tsx` | Compact guide illustration, dismissed after usable tracking |
| `src/components/ar/ARStatusIndicator.tsx` | Accessible dynamic tracking status |
| `src/styles/scan-ground.css` | Responsive camera UI and reduced-motion rules |
| `src/App.tsx` | Consent gate and stable AR component across `/camera` and `/choose-cracker` |
| `src/hooks/useCamera.ts` | Existing permission flow retained; typed error-kind setter supports AR permission-help return |
| `src/app.css` | Accessible lazy-module loading fallback |
| `src/components/CameraScreens.css` | Retired old preview-only styles; permission styling retained |
| `src/components/CameraPreviewScreen.tsx` | Removed; replaced by the single AR camera integration |
| `scripts/prepare-ar.mjs`, `scripts/verify-ar-build.mjs` | Complete runtime copy and production artifact verification |
| `scripts/optimize-images.mjs` | Adds the new scan guide WebP |
| `package.json`, `package-lock.json`, `.gitignore`, `vercel.json` | Pinned dependencies, preparation/tests, generated runtime exclusion and SPA static-file exceptions |
| `tests/ar.cjs`, `tests/camera.cjs`, `tests/runtime.cjs`, `tests/helpers/ar-fixture.cjs` | Integration, lifecycle, geometry, camera handoff and real SDK initialization checks |
| `public/licenses/*` | Copyright, license, warranty and attribution notices |

New assets are `/assets/ar/placement-reticle.svg`, `/assets/ar/placement-reticle.png`, `/assets/onboarding/scan-ground-guide.png` and `/assets/onboarding/scan-ground-guide.webp`. The supplied originals remain unchanged. SVG stays SVG. The PNG reticle is retained as a reference; it is not used as a camera-screen overlay.

## Camera and navigation

1. Splash and Welcome never load/start the SDK or request camera access.
2. Enable Camera runs the existing video-only rear-camera permission/selection checks. Denial and hardware errors stay in the existing explanation flow.
3. On grant, that preflight stream is synchronously stopped before entering AR. The session then loads the self-hosted binary, initializes WASM/SLAM and runs the camera pipeline with BACK and MOBILE configuration.
4. XR8 alone owns the active camera and render loop. No HTML video preview, second `getUserMedia` loop, React animation loop or parallel Three renderer runs beside it.
5. Choose a Cracker is available only for fresh valid placement. Confirmation clones the placement in the session and UI state, then changes to `/choose-cracker` while retaining the same component/session/canvas.
6. Browser Back from the placeholder returns to scan without restarting the camera. Close stops/releases AR before returning to Welcome. Direct links or refreshes to AR routes require a fresh explicit camera action; they cannot open the camera automatically.

The SDK must open its own stream after the preflight stream closes. Browser-specific permission policies may show another native prompt during this handoff; this needs physical-device testing. The app cannot suppress a native browser prompt. It does not automatically repeat a denied request.

## Tracking and placement evidence

State machine: INITIALIZING, SCANNING, SEARCHING, READY, TRACKING_LOST, UNSUPPORTED, ERROR.

`processCpuResult.reality.trackingStatus` and `trackingReason` drive tracking state. NORMAL is necessary but insufficient, and an INITIALIZING reason cannot qualify. Camera status must also be `hasVideo` and the reticle texture must have loaded.

Placement samples the view at normalized `(0.5, 0.58)`. It first considers only horizontal `DETECTED_SURFACE`/`ESTIMATED_SURFACE` engine hit results, rejecting feature-point-only hits, invalid rotations, distant points, points above/too close to the camera and normals more than about 15° from up.

Because a binary/device may expose feature points rather than reliable surface hits, the second path uses the documented `worldPoints` output. It fits horizontal support bands from confident SLAM map points below the camera. At least 16 supporting points, a convex support hull with at least 0.1 m² area, a small interior margin, a downward aim ray and a bounded distance are required. The ray must intersect *inside the observed hull*. It never intersects an arbitrary assumed y=0 floor. Walls/collinear samples, sparse point clouds and extrapolated points cannot qualify.

Four consecutive consistent measured candidates are required before READY. This is data stability, not an elapsed completion timer. The estimator samples at roughly 8 Hz; engine pose/render updates continue at SDK frame rate. Stale frames, limited tracking or backgrounding invalidate readiness and hide the reticle. Selection checks freshness again on the actual button tap.

The reticle is a Three mesh, not a DOM ring: position comes from the candidate, its plane normal is aligned with the horizontal support, and the tracked camera projection provides perspective. The supplied pre-perspectived SVG is mapped into the world plane. Reticle resources are reused and disposed when the session ends.

The point-cloud path estimates a horizontal support surface, **not semantic ground recognition or a certified collision-free region**. A sufficiently supported table can also be horizontal. The user must aim at the floor. Mapping quality, absolute scale, surface-hit rotation conventions, reflective/blank floors and real pose stability need device validation. If reliable evidence never arrives, the app stays searching and does not offer the CTA.

## Lifecycle and performance

The session singleton prevents competing SDK owners. React Strict Mode cleanup invalidates pending starts. SDK scripts/runtime are cached once, but pipeline modules and owned resources belong to a single live session. Late startup results are ignored after disposal.

The original app’s background handler does not compete with AR lifecycle handling. AR pauses through XR8 when hidden and resumes through XR8 when visible; placement is cleared and must be measured again. If the browser ended the stream, a clear Retry state replaces an automatic permission request. Pagehide, close, errors, route exit and unmount stop the SDK, stop known tracks, clear modules/listeners/watchdogs, disconnect resize observers and dispose owned Three resources. The SDK renderer is disposed on full release.

Resize observation and orientation/viewport events update the canvas drawing buffer with pixel ratio capped at 1.5. The SDK remains the sole camera/pose/render loop. High-frequency updates stay in the session/Three objects; React receives only meaningful state changes. No frame-by-frame React pose state, CSS blur filter or heavy 3D model is used.

All runtime artifacts, including SLAM code and workers/model resources, are copied unchanged from the pinned package. Build verification checks each file by hash. The large Three/AR chunk is lazy-loaded after consent; the standard Vite large-chunk warning is expected for this namespace-based Three integration.

## Debugging

On the **development server only**, open `/camera-permission?arDebug=1`, then Enable Camera. The flag is preserved across client-side routes. The overlay shows camera state, initialization/tracking state, tracking reason, candidate validity and placement mode. Production builds cannot enable this overlay through a query parameter.

Sound preference is persisted as `localStorage['thiri:sound-enabled']`. There were no existing audio assets/sources in the project, so Screen 04 only changes/preserves this preference for later cracker effects; it requests no microphone access.

## Verification and limitations

Recorded results:

- `test-results.json`: prior-screen regressions, four mobile viewports in Chromium and WebKit.
- `camera-test-results.json`: permission/selection errors, no early access, exclusive preflight→SDK handoff, Not now, close and late-prompt cleanup.
- `ar-test-results.json`: both engine-fixture browsers at all four sizes; no timer/normal/feature-only false READY, world-space reticle transforms, pose updates, real estimator math, point-cloud plane support, wall rejection, stale-frame handling, session-preserving next-step/back, pause/resume and errors.
- `ar-runtime-results.json`: **real** packaged SDK initializes WASM and loads SLAM from a local production build with zero camera calls in this initialization-only test.
- `npm run build`: strict TypeScript + Vite build + complete runtime hash verification.

SDK camera/pose callbacks in integration tests are fixtures and are not bundled into production. They verify the integration contract and logic, **not real SLAM accuracy**. No claim is made that an iPhone/Android ground has been physically detected here. The real runtime initialization check does not start or verify a real camera session, sensor permissions, pose estimation or physical surface detection.

No Vercel deployment or physical-device test was performed. The scanner is wired to the real SDK; unsupported hardware gets an honest failure state, not a simulated fallback. Screen 05 cracker selection is implemented; Screen 06 remains an explicitly labeled placement integration boundary. No fireworks, fuse, countdown or placement-confirmation animation is included.

## Physical iPhone 13 / Safari acceptance

1. Deploy to Vercel HTTPS (`npm ci`, `npm run build`, output `dist`). Check `/vendor/8thwall/xr.js`, `xr-slam.js`, workers, scan assets and license URLs return files rather than SPA HTML.
2. In a fresh Safari session, run Splash → Welcome → Camera Explanation. Confirm there is no camera prompt before Enable Camera. Grant video access and verify no microphone prompt from app code.
3. Check that the rear view fills the viewport without stretching, a black conflict screen, browser chrome imitation, cropping of controls or unwanted scrolling. Repeat the layout check at 320×568, 375×812, 390×844, 428×926 and after rotation/toolbar resizing.
4. Aim at a well-lit textured floor and move slowly. Confirm the guide initially appears, then fades after usable tracking. Confirm NORMAL alone does not unlock placement; observe a measured placement mode in the dev overlay where available.
5. Verify the purple ring lies in world space: moving/rotating the phone must change its perspective and position correctly. Validate that candidates are on the visible floor and do not float, drift significantly or appear on walls. Check the data-derived plane’s absolute scale and hit rotation conventions.
6. When READY, tap Choose a Cracker. Confirm the selection sheet appears with the camera still active, no restart/prompt, and the saved anchor/context retained. Browser Back must return to scanning in the same session.
7. Occlude the lens, move away from the mapped scene and try low light. Confirm readiness disappears and the ring hides when tracking is unusable; the app should guide rescanning and better lighting. It must not advance solely because time passes.
8. Background and return. Verify pause/recovery, no duplicate streams/modules, no stale placement and a clear retry if Safari ended the camera. Test pagehide/BFCache, reload and direct links: there must be no unexpected camera startup.
9. Deny camera access, busy the camera with another app and interrupt WebGL/camera availability. Confirm friendly guidance, user-triggered Retry and Close functionality.
10. Close AR and verify the camera indicator turns off and Welcome appears. Re-enter and confirm a single SDK session, preserved sound preference and no console/runtime errors.
11. Repeat on a supported Android phone in Chrome. Record actual tracking quality, permission behavior and runtime request failures before release.

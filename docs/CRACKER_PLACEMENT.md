# Screen 06 — Place Your Cracker

## Implementation

- `src/components/ar/CrackerPlacementScreen.tsx` and `src/styles/cracker-placement.css`: contextual placement/recovery UI, safe-area buttons, selected cracker and deterministic phase display.
- `src/components/ar/models/{FlowerPotModel,GroundChakraModel,RocketModel,model,index}.ts`: real procedural geometry, shared festive palette, metallic gold trim, local ground-contact base at Y=0, dimensions, placement orientation and a named `FusePoint` child node.
- `src/lib/ar/{ground-raycast,cracker-preview,placement-controller,placed-cracker-state}.ts`: validated world ray/plane pose, cached model rendering, contact shadow, preview materials, placement state and saved transforms.
- `src/lib/ar/{engine,types,tracking,reticle}.ts`: shared SDK lifecycle/frame integration and pulsing world-space reticle. No extra RAF or renderer.
- `src/components/ar/{ScanGroundScreen,FuseStepBoundary}.tsx`, `src/App.tsx`: Screen 05 → placement → minimal Screen 07 boundary, back/reposition/rescan navigation. The obsolete `CrackerPlacementBoundary.tsx` was removed.
- `scripts/optimize-images.mjs`, `scripts/verify-ar-build.mjs`: placement reference WebPs and production asset verification. Approved PNG originals remain unchanged in `public/assets/crackers/placement/`.
- `tests/placement.cjs`, `tests/selection.cjs`, `tests/helpers/ar-fixture.cjs`: placement and regression coverage with explicitly synthetic tracking/camera data.

## Ground placement and transforms

The existing 8th Wall Engine Binary 1.0.0 SLAM pipeline remains authoritative. Its `NORMAL` tracking callbacks and the existing estimator supply a fresh, stable horizontal support candidate. A Three.js ray from normalized screen target (0.5, 0.58) intersects that support plane. Placement requires a forward downward ray, finite values, distance 0.25–4 m, contact within 0.25 m of measured support, and support age ≤350 ms. Four consistent new support samples plus a settled preview are required. A bare intersection with mathematical Y=0 cannot establish tracking.

Models use local Y=0 at the base. Their anchor transforms that local ground plane to the engine's measured world ground. When the tracked ground is engine-world Y=0, those coincide. If measured support has a different world height, it is respected rather than silently moving the world origin or inventing a floor. All model geometry remains above the local contact plane. The chakra lies horizontally; the rocket includes its long stick and three support feet.

Camera movement updates the preview in the existing SDK frame callback. Light exponential smoothing and jump rejection apply only before confirmation. Place Cracker rechecks freshness, then saves exactly the displayed root's world position, quaternion and scale with its selected type, actual `rootObject` and `fusePoint`. The anchor is a direct scene child, never a camera child. After confirmation, no preview interpolation touches the anchor. The FusePoint world transform is available through `getWorldPosition` / `getWorldQuaternion` on the named node.

## Models and performance

PNG references determine styling; none are mapped onto AR billboard planes. Cone/cylinder/disc, low-segment torus, leaf ellipsoid, fin and curved rope geometry supply perspective from every angle. Geometry is merged by palette color, with one material/draw mesh per color (4–7 per model). Gold uses metalness 0.65 / roughness 0.3. These are simplified MVP geometry approximations, not exact sculpted reproductions of the reference artwork.

The preview uses 72% opacity, a subtle purple ground ring, the supplied world-space SVG reticle and a small procedural contact-shadow texture. No shadow maps or full-screen effects. Selected models are built once and cached in the session. Their geometry/materials, ground meshes/texture and lights are disposed when the session closes. Models and high-frequency pose updates stay outside React; only changed UI summaries publish.

## Session, state and recovery

The SDK-exclusive rear camera, canvas, tracked Three.js camera/scene and renderer survive scan/choose/place/fuse route transitions. The camera permission preflight is not repeated. `selectedCracker` stays in the existing session snapshot; switching cracker changes the cached model, never XR8 ownership.

Placement phases: SEARCHING, PREVIEWING, READY_TO_PLACE, PLACED, TRACKING_LOST, REPOSITIONING, ERROR. Native tracking status, real candidate evidence and user actions drive transitions; timers do not simulate successful scanning. A stale-frame watchdog can invalidate tracking, never advance it.

Sudden camera translation/rotation, LIMITED tracking or backgrounding hides the preview/placed rendering and disables actions. Saved placed data survives temporary loss; several subsequent NORMAL samples are required before rendering it again. This is recovery in the same SLAM coordinate frame, not a persistent cloud anchor or a promise of physical alignment after drift/relocalization. Rescan/reposition clears confirmation. The supported SDK `XrController.recenter()` resets the origin and explicitly clears placement. Pause/resume use the existing SDK lifecycle. Engine errors offer an honest retry; retry starts a fresh session and requires placement again.

Screen 07 currently receives the placed data and exposes a minimal boundary. It performs no fuse animation, ignition, countdown or explosion.

## Local verification and limitations

Run `npm ci`, `npm run dev`; in another terminal run `npm run test:placement`, `npm run test:selection`, `npm run test:ar`, `npm run test:camera`, `npm run test:e2e`. `TEST_URL` selects the running server; install Playwright Chromium/WebKit first. `npm run build` runs strict TypeScript, Vite and byte-for-byte validation of all 13 packaged engine artifacts plus required assets/licenses.

Placement tests cover Chromium and WebKit, 320×568, 375×812, 390×844 and 428×926; actual Three geometry, world bounds and FusePoints; ghost/opaque materials; frozen world position/rotation as the synthetic camera moves; tracking loss/recovery; reposition/recenter; all three selected models; route navigation; no second camera acquisition/SDK run; and resource cleanup. These fixtures do not prove physical-device world tracking or mobile GPU frame rate. Browser emulation is not certification of iPhone Safari or Android Chrome.

## Vercel / physical-device acceptance

Deploy with the Vite preset, `npm ci`, `npm run build`, output `dist`, base `/`. No backend or environment secrets are required. Runtime binaries are generated from the pinned package in prebuild and served unchanged from `/vendor/8thwall/`; retain the included licenses. The committed Vercel rewrites preserve asset/runtime URLs. The lazy AR/Three chunk triggers a Vite size warning; it does not load on Splash/Welcome.

1. Open the deployed HTTPS URL on iPhone 13 Safari and Android Chrome. Verify all runtime, WASM, SLAM and asset requests load successfully.
2. Splash → Welcome → Get Started → camera explanation. Confirm no earlier camera prompt. Enable Camera once, then scan well-lit textured ground.
3. Choose Flower Pot. Move the phone slowly: verify perspective, flat contact and candidate-following preview. Confirm Place Cracker.
4. Move left/right and slightly farther away. The model should stay approximately at its saved ground position, rather than following the display. Check chakra and rocket, including fuse and support geometry, from different sides.
5. Reposition and place elsewhere; Back should retain selection and camera. Continue to the Screen 07 boundary and return without ignition.
6. Obscure the camera or move quickly: placement must disable. After placement, recovery should hide the model without immediately deleting its saved data. Test recovery, Rescan, Recenter and background/foreground. Check that no duplicate camera prompt/stream occurs on navigation.
7. Verify portrait CTA visibility at all requested dimensions and device safe areas. Close AR and verify the camera indicator turns off.

Physical tests and a Vercel deployment were not performed in this environment. Report drift, failed recovery, device incompatibility or runtime resource failures rather than treating a successful build or fixture test as a physical AR pass.

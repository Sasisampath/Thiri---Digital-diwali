# Thiri

Mobile-first Vite + React + TypeScript application with the approved Splash, Welcome and Camera Permission screens, Screen 04: Scan the Ground, Screen 05: Choose Your Cracker, and Screen 06: Place Your Cracker.

Flow: **Splash → Welcome → Camera Explanation → Enable Camera → Scan the Ground → Choose Your Cracker → Place Your Cracker → Screen 07 integration boundary.**

## Run

```sh
npm ci
npm run dev
npm run build
npm run preview
```

The project is in this directory; run the commands alongside `package.json`. Vite prints the actual local port. Mobile camera/AR tests need an HTTPS deployment or HTTPS tunnel; ordinary HTTP LAN addresses are unsuitable.

## Screen 04 implementation

- Uses the official **`@8thwall/engine-binary@1.0.0`** SLAM distribution with **Three.js 0.183.2**, not the MIT-only engine framework.
- Dedicated engine integration, tracking state machine, horizontal placement estimator and world-space Three.js reticle.
- The permission preflight stream stops synchronously before XR8 opens its rear camera. XR8 exclusively owns the AR camera and render loop afterward.
- No elapsed timer, camera-open event, NORMAL status alone or isolated feature-point hit can mark placement READY.
- The reticle uses the supplied SVG as a real Three.js ground-plane texture. The compact guide uses the supplied transparent illustration and fades after usable tracking.
- Choosing a cracker opens the functional selection sheet while retaining the same AR component, canvas, SDK camera and world context. The selected cracker carries into the clearly labeled Place Your Cracker → Screen 07 integration boundary.
- Tracking loss invalidates placement. Backgrounding pauses the SDK; resuming requires fresh tracking evidence. Closing, exiting AR, pagehide and failures stop/release resources.
- Unsupported devices show an explanation rather than simulated AR. Procedural cracker models are implemented; fuse effects and fireworks remain future work.

See [Screen 04 engineering and device test guide](docs/SCAN_GROUND.md) for files, placement evidence, lifecycle details, limitations and the acceptance checklist.

## Screen 05 — cracker selection

Three transparent-artwork radio cards, Flower Pot default, dynamic Place CTA, shared AR-session selection state, tracking-loss-safe interaction and camera-preserving navigation are implemented. Screen 06 uses the selected ID/placement type to prepare the corresponding procedural model. [Files, assets, state, navigation and remaining work](docs/CRACKER_SELECTION.md).

## Screen 06 — world placement

Real procedural cone, horizontal chakra and supported rocket models share the existing SDK scene, tracked camera and render loop. A guarded screen-target ray intersects fresh measured horizontal ground support. Preview follows that candidate until confirmation freezes the displayed world position, quaternion and scale. Tracking loss hides the saved model while retaining its transform for recovery. Reposition, rescan and optional SDK recenter preserve the camera session; recenter explicitly clears placement because it changes the tracking origin. Screen 07 receives the actual model and named `FusePoint`, with no ignition.

See [placement implementation and Vercel device checks](docs/CRACKER_PLACEMENT.md).

## Assets

Approved PNG originals are retained under `public/assets/branding`, `crackers` and `onboarding`, with optimized WebP alternatives and PNG fallback. New assets:

- `public/assets/ar/placement-reticle.svg` — rendered world-space reticle.
- `public/assets/ar/placement-reticle.png` — supplied raster reference, retained unchanged.
- `public/assets/onboarding/scan-ground-guide.png` and `.webp` — compact scan guidance.

`npm run optimize:images` regenerates WebP files without overwriting PNG originals. Splash and Welcome retain their existing composition and branding.

## Runtime packaging and Vercel

`predev` and `prebuild` run `scripts/prepare-ar.mjs`, which copies the complete pinned binary distribution unchanged from `node_modules` into `public/vendor/8thwall`. `postbuild` checks every runtime artifact against its source and checks required scan assets/licenses. `public/vendor` is generated and Git-ignored. An `npm ci` followed by `npm run build` recreates it on Vercel.

Vercel settings: Vite preset, install `npm ci`, build `npm run build`, output `dist`. No backend, database, authentication or environment variables are required. The SPA rewrite excludes `/assets/`, `/vendor/` and `/licenses/`, so binary chunks/workers are served as files. Use the default Vite base `/`.

The large Three.js AR chunk is lazy-loaded only after the camera action. SDK loading/initialization is also deferred until entering AR. The runtime is self-hosted; there is no floating CDN dependency. The source is prepared for the linked Thiri GitHub repository. No Vercel deployment has been performed by this work.

## Tests

With the app server running:

```sh
npx playwright install chromium webkit
npm run test:e2e
npm run test:camera
npm run test:ar
npm run test:selection
npm run test:placement
npm run test:runtime
```

Set `TEST_URL` to the server URL if necessary (e.g. `http://127.0.0.1:5174/`). `CHROMIUM_EXECUTABLE_PATH` can select an installed Chromium executable. Test missing browsers fail instead of silently skipping.

Verified locally:

- Strict TypeScript and the Vercel production build pass.
- Chromium/WebKit emulation passes at 320×568, 375×812, 390×844 and 428×926 for previous screens, camera handoff, AR UI/state logic and cleanup.
- Tests exercise actual Three.js placement mathematics, reticle transforms, point-cloud support, wall rejection, tracking loss, next-step context retention, error/retry, unsupported devices and background recovery. Camera/pose/SDK callbacks in these tests are explicitly synthetic test fixtures, not production behavior.
- The **real packaged SDK** initializes its WASM and loads its SLAM chunk from the local production build with zero camera calls and no missing resources in that test. `XR8.version()` in this package reports `0.0.0.0`; the pinned npm package version is `1.0.0`.
- Build verification checks runtime files byte-for-byte against the installed distribution.

These checks **do not prove physical-device world tracking**. An iPhone 13/Safari and Android/Chrome still need the HTTPS device acceptance test in the engineering guide. Production Vercel runtime requests must be checked after deployment. No deployment was performed here.

## Notices

The engine binary uses Niantic Spatial’s XR Engine License Agreement, not the MIT framework license. The complete terms, copyright notices and warranty disclaimer are retained under `public/licenses/` and inside the unmodified runtime. A linked official attribution badge is visible in the AR screen. Three.js’s MIT notice is also included. See [third-party notices](public/licenses/NOTICE.txt).

// Test-only SDK boundary. Production never imports or bundles this fixture.
async function fixture(browser, size = { width: 390, height: 844 }, options = {}) {
 const context = await browser.newContext({ viewport: size, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
 await context.addInitScript(({ incompatible, initFailure }) => {
  sessionStorage.setItem('thiri:splash-seen:v1', '1');
  const t = window.testAR = { nativeCalls: 0, runCalls: 0, stops: 0, pauses: 0, resumes: 0, activeMax: 0, disposedRenderers: 0, recenters: 0,
   streams: [], history: [], nativeMode: 'grant', facing: 'environment', resolveNative: null, compatible: !incompatible,
   initFailure, hits: [], modules: [], scene: null, candidate: null, options: null };
  const makeStream = () => {
   const c = document.createElement('canvas'); c.width = 16; c.height = 16; c.getContext('2d').fillRect(0, 0, 16, 16);
   const stream = c.captureStream(1); const track = stream.getVideoTracks()[0];
   Object.defineProperty(track, 'getSettings', { configurable: true, value: () => ({ facingMode: t.facing }) });
   t.streams.push(stream);
   const live = t.streams.filter(s => s.getTracks().some(tr => tr.readyState === 'live')).length;
   t.activeMax = Math.max(t.activeMax, live);
   if (live > 1) throw Error('Competing camera streams');
   return stream;
  };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async constraints => {
   t.nativeCalls++; t.history.push(constraints);
   if (t.nativeMode === 'pending') return new Promise(resolve => { t.resolveNative = () => resolve(makeStream()); });
   if (t.nativeMode === 'relax' && constraints.video !== true) throw new DOMException('Constraint failure', 'OverconstrainedError');
   if (!['grant', 'relax'].includes(t.nativeMode)) throw new DOMException('Test permission error', t.nativeMode);
   return makeStream();
  }}});
  const notify = event => t.modules.forEach(m => m.onCameraStatusChange?.(event));
  t.emit = ({ status = 'NORMAL', reason = 'UNSPECIFIED', hits = [], points = [], x = 0, cameraPosition = null, lookAt = [0, 0, -1.4] } = {}) => {
   t.hits = hits;
   t.scene.camera.position.set(...(cameraPosition ?? [x, 1.5, 0])); t.scene.camera.lookAt(...lookAt); t.scene.camera.updateMatrixWorld(true);
   t.modules.forEach(m => m.onUpdate?.({ processCpuResult: { reality: { trackingStatus: status, trackingReason: reason, worldPoints: points } } }));
  };
  window.XR8 = {
   initialize: async () => { if (t.initFailure) throw Error('Test initialization failure'); }, loadChunk: async chunk => { t.chunk = chunk; },
   XrConfig: { camera: () => ({ BACK: 'back' }), device: () => ({ MOBILE: 'mobile' }) },
   XrDevice: { isDeviceBrowserCompatible: () => t.compatible },
   GlTextureRenderer: { pipelineModule: () => ({ name: 'camera-feed' }) },
   Threejs: {
    pipelineModule: () => ({ name: 'threejs', onStart: () => {
     const THREE = window.THREE;
     t.scene = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.01, 100), renderer: { dispose: () => t.disposedRenderers++ } };
    }}), xrScene: () => t.scene,
   },
   XrController: { configure: config => { t.config = config; }, pipelineModule: () => ({ name: 'reality' }),
    recenter: () => t.recenters++, updateCameraProjectionMatrix: () => { t.scene.camera.updateProjectionMatrix(); }, hitTest: () => t.hits },
   clearCameraPipelineModules: () => { t.modules = []; }, addCameraPipelineModules: modules => { t.modules.push(...modules); },
   run: options => {
    t.options = { direction: options.cameraConfig.direction, allowedDevices: options.allowedDevices }; t.runCalls++;
    notify({ status: 'requesting' }); const stream = makeStream(); t.sdkStream = stream;
    notify({ status: 'hasStream', stream }); notify({ status: 'hasVideo' });
    t.modules.forEach(m => m.onStart?.({ canvas: options.canvas }));
   },
   stop: () => { t.stops++; t.sdkStream?.getTracks().forEach(tr => tr.stop()); },
   pause: () => t.pauses++, resume: () => t.resumes++,
  };
 }, options);
 const page = await context.newPage(); const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 return { context, page, errors };
}
const allStopped = page => page.evaluate(() => window.testAR.streams.every(s => s.getTracks().every(t => t.readyState === 'ended')));
module.exports = { fixture, allStopped };

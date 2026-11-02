/** Replace both normalized artwork URLs and their shared tip together when approved art arrives. */
export const ignitionConfig = {
  artwork: {
    unlit: `${import.meta.env.BASE_URL}assets/ignition/fallback-unlit.svg`,
    lit: `${import.meta.env.BASE_URL}assets/ignition/fallback-lit.svg`,
    width: 100,
    height: 300,
    tip: { x: .5, y: .1 },
  },
  hitRadiusCssPx: 46,
};

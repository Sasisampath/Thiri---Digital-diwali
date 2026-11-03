export const jazzhqBrand = {
  logo: `${import.meta.env.BASE_URL}assets/branding/jazzhq-logo.svg`,
  pngFallback: `${import.meta.env.BASE_URL}assets/branding/jazzhq-logo.webp`,
  width: 382,
  height: 63.5,
  naturalSeconds: 3,
  entranceSeconds: .4,
  holdSeconds: 3,
  exitSeconds: .45,
};
export type JazzHQRevealPhase = 'NONE' | 'ENTERING' | 'HOLDING' | 'EXITING';

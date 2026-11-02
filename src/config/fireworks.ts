export type FireworksQuality = 'low' | 'medium' | 'high';
export const particleBudgets: Record<FireworksQuality, number> = { low: 320, medium: 640, high: 1000 };
export const fireworksConfig = {
  flowerPot: { duration: 5.6, emissionEnd: 4.1 },
  chakra: { duration: 4.9, emissionEnd: 3.7 },
  rocket: { duration: 5.8, launchStart: .35, burstAt: 2.45, height: 5, lookUpDeadline: 3.4 },
};
export function initialFireworksQuality(): FireworksQuality {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return (memory !== undefined && memory <= 4) || navigator.hardwareConcurrency <= 4 ? 'low' : 'medium';
}

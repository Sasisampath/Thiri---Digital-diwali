export type CrackerType = 'flower-pot' | 'ground-chakra' | 'rocket';
export type PlacementType = 'ground-upright' | 'ground-flat';
export type Cracker = { id: CrackerType; name: string; thumbnail: string; placementType: PlacementType };
const assets = `${import.meta.env.BASE_URL}assets/crackers/selection/`;
export const crackers: readonly Cracker[] = [
  { id: 'flower-pot', name: 'Flower Pot', thumbnail: `${assets}flower-pot-selection.png`, placementType: 'ground-upright' },
  { id: 'ground-chakra', name: 'Ground Chakra', thumbnail: `${assets}ground-chakra-selection.png`, placementType: 'ground-flat' },
  { id: 'rocket', name: 'Rocket', thumbnail: `${assets}rocket-selection.png`, placementType: 'ground-upright' },
];
export const defaultCracker: CrackerType = 'flower-pot';
export function getCracker(id: CrackerType): Cracker { return crackers.find(cracker => cracker.id === id)!; }

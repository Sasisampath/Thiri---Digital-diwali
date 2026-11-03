export type BaseCrackerType = 'flower-pot' | 'ground-chakra' | 'rocket';
export type CrackerType = BaseCrackerType | 'jazzhq-flower-pot' | 'jazzhq-chakra' | 'jazzhq-rocket';
export type PlacementType = 'ground-upright' | 'ground-flat';
export type Cracker = { id: CrackerType; name: string; baseType: BaseCrackerType; thumbnail: string; placementType: PlacementType; brand: 'jazzhq' | null; specialReveal: 'jazzhq-logo' | null };
const assets = `${import.meta.env.BASE_URL}assets/crackers/selection/`;
export const crackers: readonly Cracker[] = [
  { id: 'flower-pot', name: 'Flower Pot', baseType: 'flower-pot', thumbnail: `${assets}flower-pot-selection.png`, placementType: 'ground-upright', brand: null, specialReveal: null },
  { id: 'ground-chakra', name: 'Ground Chakra', baseType: 'ground-chakra', thumbnail: `${assets}ground-chakra-selection.png`, placementType: 'ground-flat', brand: null, specialReveal: null },
  { id: 'rocket', name: 'Rocket', baseType: 'rocket', thumbnail: `${assets}rocket-selection.png`, placementType: 'ground-upright', brand: null, specialReveal: null },
  { id: 'jazzhq-flower-pot', name: 'JazzHQ Flower Pot', baseType: 'flower-pot', thumbnail: `${assets}flower-pot-selection.png`, placementType: 'ground-upright', brand: 'jazzhq', specialReveal: 'jazzhq-logo' },
  { id: 'jazzhq-chakra', name: 'JazzHQ Chakra', baseType: 'ground-chakra', thumbnail: `${assets}ground-chakra-selection.png`, placementType: 'ground-flat', brand: 'jazzhq', specialReveal: 'jazzhq-logo' },
  { id: 'jazzhq-rocket', name: 'JazzHQ Rocket', baseType: 'rocket', thumbnail: `${assets}rocket-selection.png`, placementType: 'ground-upright', brand: 'jazzhq', specialReveal: 'jazzhq-logo' },
];
export const defaultCracker: CrackerType = 'flower-pot';
export function getCracker(id: CrackerType): Cracker { return crackers.find(cracker => cracker.id === id)!; }

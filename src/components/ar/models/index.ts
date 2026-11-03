import { getCracker } from '../../../config/crackers';
import type { CrackerType } from '../../../config/crackers';
import { FlowerPotModel } from './FlowerPotModel';
import { GroundChakraModel } from './GroundChakraModel';
import { RocketModel } from './RocketModel';
export function createCrackerModel(type: CrackerType) {
  if (getCracker(type).baseType === 'flower-pot') return new FlowerPotModel(type);
  if (getCracker(type).baseType === 'ground-chakra') return new GroundChakraModel(type);
  return new RocketModel(type);
}

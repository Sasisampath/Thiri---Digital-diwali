import type { CrackerType } from '../../../config/crackers';
import { FlowerPotModel } from './FlowerPotModel';
import { GroundChakraModel } from './GroundChakraModel';
import { RocketModel } from './RocketModel';
export function createCrackerModel(type: CrackerType) {
  if (type === 'flower-pot') return new FlowerPotModel();
  if (type === 'ground-chakra') return new GroundChakraModel();
  return new RocketModel();
}

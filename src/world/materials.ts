/** Material ids stored in the chunk data textures (green channel). Foreign land adds FOREIGN. */
export enum Mat {
  Deep = 0,
  Shallow = 1,
  River = 2,
  Sand = 3,
  Grass = 4,
  FieldGold = 5,
  FieldGreen = 6,
  FieldBrown = 7,
  Forest = 8,
  Fen = 9,
  Moor = 10,
  Rock = 11,
  Hedge = 12,
  Border = 13,
  Path = 14,
  Spare = 15,
}

export const FOREIGN = 16;
export const MATERIAL_COUNT = 32;
/** Tones per material ramp, 0 = darkest. Base tone for flat ground is 4. */
export const TONES = 8;

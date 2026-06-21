// Shared code for the Sky tab + the #/learn guide: SVG geometry and the
// bilingual data mappings, in one place instead of re-declared per component.
export { moonLitPath } from './geometry';
export {
  SIGN_MONTH,
  VARA,
  PLANET_INFO,
  COMPASS,
  BRIGHT_STARS,
  POLARIS,
  CONSTELLATIONS,
} from './data';
export type { MonInfo, Vara, BrightStar, Constellation } from './data';

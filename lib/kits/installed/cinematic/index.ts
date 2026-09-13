/**
 * @kits/style-cinematic —— pack 的 TypeScript 入口。
 *
 * CSS 主入口：`import "./tokens.css";`
 */

import type { StylePackMotion, StylePackProfile } from "../contracts/index";
import { cinematicMotion } from "./motion";

export { cinematicMotion };
export default cinematicMotion;

export const cinematicMotionTokens: StylePackMotion = cinematicMotion;

export const cinematicProfile: StylePackProfile = {
  typeVoice: "spatial",
  spacingRhythm: "layered",
  density: "medium",
  radiusPhilosophy: "continuous",
  borderTreatment: "none-with-depth",
  surfaceTreatment: "ambient-glow",
  navigationFeel: "overlay-space",
  dataLanguage: "glow-series",
  motionLanguage: "atmospheric",
  hierarchyMethod: "light-and-depth",
};

export const cinematicMeta = {
  id: "cinematic",
  name: "Cinematic",
  selector: '[data-kits-pack="cinematic"]',
  cssEntry: "./tokens.css",
} as const;

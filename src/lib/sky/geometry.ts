// Pure SVG geometry for the sky visuals — shared so the all-sky dome and the
// standalone MoonPhase draw the *identical* lit limb. DOM-independent (returns a
// path string), so it can be unit-tested without a renderer.

/**
 * SVG path for the lit (illuminated) portion of the Moon's disc, as a closed
 * region: the bright outer limb plus the terminator (a half-ellipse whose
 * semi-minor axis tracks cos(illum·π)). Crescent vs gibbous flips the
 * terminator's sweep flag; waxing puts the lit limb on the right.
 *
 * @param cx centre x      @param cy centre y      @param r disc radius
 * @param illum illuminated fraction 0..1
 * @param phaseAngle Sun→Moon elongation 0..360 (waxing when < 180)
 */
export function moonLitPath(
  cx: number,
  cy: number,
  r: number,
  illum: number,
  phaseAngle: number,
): string {
  const waxing = phaseAngle < 180;
  const rx = Math.abs(r * Math.cos(illum * Math.PI));
  const gibbous = illum > 0.5;
  const limbSweep = waxing ? 1 : 0;
  const termSweep = waxing ? (gibbous ? 1 : 0) : gibbous ? 0 : 1;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${limbSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${termSweep} ${cx} ${cy - r} Z`;
}

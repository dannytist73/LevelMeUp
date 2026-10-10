// Prints the pacing table for the configured level curve and which level steps meet every spec target.
import { LEVEL_CURVE } from '../src/levels.ts';
import { PACING_LEVELS, PACING_PROFILES, meetsTargets, simulatePacing } from '../src/simulation.ts';

const show = (day: number | null | undefined): string => (day == null ? '—' : day.toFixed(1)).padStart(7);

console.log('M1 simplified model (a standard core every day, no misses). The real-day campaign below decides the curve.');
console.log(`Level curve: ${LEVEL_CURVE.base} + ${LEVEL_CURVE.step} × (L − 1)`);
console.log(`Mean day each level is reached (200 runs):\n${'profile'.padEnd(11)}${PACING_LEVELS.map((l) => `L${l}`.padStart(7)).join('')}`);
for (const [name, rate] of Object.entries(PACING_PROFILES)) {
  const result = simulatePacing(rate);
  console.log(`${name.padEnd(11)}${PACING_LEVELS.map((level) => show(result[level])).join('')}`);
}

console.log('\nLevel steps that meet every target (base fixed):');
const passing: number[] = [];
for (let step = 20; step <= 40; step++) {
  if (meetsTargets({ base: LEVEL_CURVE.base, step })) passing.push(step);
}
console.log(passing.length > 0 ? passing.join(', ') : 'none');

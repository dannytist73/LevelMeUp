// Pacing on real built days: the table for each persona, then the level steps and stat divisors that meet every target.
import {
  LEVEL_CURVE, PACING_LEVELS, PACING_PROFILES, PERSONAS, STAT_XP_DIVISOR, campaignFailures, campaignPacing,
} from '../../rules/src/index.ts';
import { LIBRARY } from '../src/index.ts';

const show = (day: number | null | undefined): string => (day == null ? '—' : day.toFixed(1)).padStart(7);
const runs = Number(process.argv[2] ?? 200);

console.log(`Real days. Level curve ${LEVEL_CURVE.base} + ${LEVEL_CURVE.step} × (L − 1), stat divisor ${STAT_XP_DIVISOR}, ${runs} runs`);
console.log(`${'persona'.padEnd(22)}${PACING_LEVELS.map((l) => `L${l}`.padStart(7)).join('')}  rank C`);
for (const persona of PERSONAS) {
  for (const [name, rate] of Object.entries(PACING_PROFILES)) {
    const r = campaignPacing(LIBRARY, persona, rate, { runs });
    console.log(`${`${persona.name} ${name}`.padEnd(22)}${PACING_LEVELS.map((l) => show(r.levels[l])).join('')}  ${show(r.rankDay)}`);
  }
}
const failures = campaignFailures(LIBRARY, { runs });
console.log(failures.length === 0 ? '\nAll targets met.' : `\nMissed:\n  ${failures.join('\n  ')}`);

const sweep = process.argv.includes('--sweep');
if (sweep) {
  const steps: number[] = [];
  for (let step = 20; step <= 40; step++) {
    const levelFailures = campaignFailures(LIBRARY, { runs: 100, curve: { base: LEVEL_CURVE.base, step } }).filter((f) => f.includes('level'));
    if (levelFailures.length === 0) steps.push(step);
  }
  console.log(`\nLevel steps meeting every level target (100 runs): ${steps.join(', ') || 'none'}`);
  const divisors: number[] = [];
  for (let divisor = 5; divisor <= 40; divisor++) {
    if (campaignFailures(LIBRARY, { runs: 100, divisor }).every((f) => !f.includes('rank'))) divisors.push(divisor);
  }
  console.log(`Stat divisors meeting the rank target (100 runs): ${divisors.join(', ') || 'none'}`);
}

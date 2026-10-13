// npm run pilot (M9b decision 8): the pilot's totals from the live project, read only. Who plays, what they chose, how
// far they got, and how the fair-play rules are used. No names, notes or ids are read, and nothing is written.
import { LEVEL_CURVE, PACING_TARGETS, levelForXp } from '../packages/rules/src/index.ts';
import { REPORT, personalColumns, reportProblem } from './lib/pilot.ts';
import { query } from './sb.ts';

for (const { title, sql } of REPORT) {
  const problem = reportProblem(sql);
  if (problem !== null) throw new Error(`${title}: ${problem}`);
}

console.log(`LevelMeUp pilot report, ${new Date().toISOString()} (read only)`);
for (const { title, sql } of REPORT) {
  const rows = query([sql]);
  const personal = personalColumns(rows);
  if (personal.length > 0) throw new Error(`${title}: refused to print personal columns ${personal.join(', ')}`);
  console.log(`\n${title}`);
  console.table(title.startsWith('Progress') ? rows.map((row) => ({ ...row, level: levelForXp(Number(row.total_xp), LEVEL_CURVE) })) : rows);
}

console.log('\nPacing targets (spec §2.3; day of reaching the level):');
for (const t of PACING_TARGETS) console.log(`  ${t.profile.padEnd(10)} level ${String(t.level).padStart(2)}: days ${t.minDay}–${t.maxDay}`);
console.log('\nOffline days the server rebuilt are in the function logs only: Supabase dashboard → Edge Functions → lmu-sync →');
console.log('Logs, search "an offline day was rebuilt" (kept 7 days).');

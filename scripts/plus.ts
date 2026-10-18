// npm run plus -- … (M13): the owner's LevelMeUp Plus commands on the live project.
//   founder <email>   the beta's Founder grant (Plus for life) to the saved character with that Google email. Writes to
//                     the live database: run it only at the owner's yes, once per tester.
//   totals            how many players are Plus, by source (read only; no emails or ids printed).
import { readOnly } from './lib/pilot.ts';
import { query } from './sb.ts';

const EMAIL = /^[^\s@'"\]{1,64}@[^\s@'"\]{1,190}\.[a-z]{2,}$/i;

const [command, arg] = process.argv.slice(2);
if (command === 'founder') {
  if (arg === undefined || !EMAIL.test(arg)) throw new Error('usage: npm run plus -- founder <email>');
  const [row] = query<{ player: string | null }>([`select levelmeup.grant_founder('${arg.replace(/'/g, "''")}') as player`]);
  console.log(row?.player ? 'Founder grant given: that player is Plus for life.' : 'No saved character has that email (guests can\'t be granted).');
} else if (command === 'totals') {
  console.table(query([readOnly(`select source, count(*)::int as players,
    count(*) filter (where ends_at is null or ends_at > now())::int as active,
    count(*) filter (where trial and ends_at > now())::int as in_trial
    from levelmeup.entitlements group by source order by source`)]));
} else {
  throw new Error('usage: npm run plus -- founder <email> | totals');
}

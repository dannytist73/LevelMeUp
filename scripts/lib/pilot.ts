// The pilot report's queries (M9b decision 8): totals and anonymous rows, read only. No query names a player, reads a
// name, an email, a note's text or the reveal, or changes anything; supabase/tests/unit/pilot-report.test.ts holds them
// to that, and the runner refuses any personal column in a result.
export type ReportQuery = { title: string; sql: string };

export const REPORT: readonly ReportQuery[] = [
  {
    title: 'Players',
    sql: `select count(*)::int as players,
  count(*) filter (where p.created_at > now() - interval '7 days')::int as new_last_7_days,
  count(*) filter (where exists (select 1 from auth.identities i where i.user_id = p.user_id and i.provider = 'google'))::int as saved_with_google,
  count(*) filter (where exists (select 1 from levelmeup.events e where e.user_id = p.user_id and e.applied_at > now() - interval '3 days'))::int as logged_last_3_days,
  count(*) filter (where exists (select 1 from levelmeup.events e where e.user_id = p.user_id and e.applied_at > now() - interval '7 days'))::int as logged_last_7_days
from levelmeup.profiles p`,
  },
  {
    title: 'Choices',
    sql: `select 'class' as choice, class_id as value, count(*)::int as players from levelmeup.profiles group by class_id
union all select 'program', program_style, count(*)::int from levelmeup.profiles group by program_style
union all select 'voice', voice, count(*)::int from levelmeup.profiles group by voice
union all select 'difficulty', difficulty, count(*)::int from levelmeup.profiles group by difficulty
union all select 'minutes', minutes_per_day::text, count(*)::int from levelmeup.profiles group by minutes_per_day
union all select 'pact level', accountability_level::text, count(*)::int from levelmeup.profiles group by accountability_level
union all select 'gentle start', gentle_start::text, count(*)::int from levelmeup.profiles group by gentle_start
order by 1, 3 desc`,
  },
  {
    title: 'Progress (one row per character)',
    sql: `select p.class_id, coalesce(max(d.day_number), 0)::int as days, c.total_xp, c.streak_current, c.streak_best, c.quests_cleared
from levelmeup.profiles p
join levelmeup.character_state c on c.user_id = p.user_id
left join levelmeup.quest_days d on d.user_id = p.user_id
group by p.user_id, p.class_id, c.total_xp, c.streak_current, c.streak_best, c.quests_cleared
order by days desc, c.total_xp desc`,
  },
  {
    title: 'Days',
    sql: `select coalesce(resolution, 'open') as resolution, coalesce(protection, '-') as protection, count(*)::int as days,
  count(*) filter (where hard_day)::int as hard_days, count(*) filter (where light)::int as light_days
from levelmeup.quest_days group by 1, 2 order by 3 desc`,
  },
  {
    title: 'Quests on closed days, by slot',
    sql: `select q.slot, count(*)::int as given, count(q.completed_at)::int as cleared,
  count(*) filter (where q.rating = 'easy')::int as rated_easy, count(*) filter (where q.rating = 'right')::int as rated_right,
  count(*) filter (where q.rating = 'too_hard')::int as rated_too_hard
from levelmeup.quest_instances q join levelmeup.quest_days d on d.id = q.day_id
where d.status = 'closed' group by q.slot order by q.slot`,
  },
  {
    title: 'Check-ins',
    sql: `select coalesce(answer, 'unanswered') as answer, coalesce(outcome, '-') as outcome, coalesce(consequence, '-') as consequence,
  count(*)::int as checkins, count(*) filter (where note is not null)::int as with_a_note
from levelmeup.checkins group by 1, 2, 3 order by 4 desc`,
  },
  {
    title: 'The recovery quest and the lighter plan',
    sql: `select (select count(*)::int from levelmeup.quest_instances where slot = 'recovery') as recovery_quests,
  (select count(*)::int from levelmeup.quest_instances where slot = 'recovery' and completed_at is not null) as recovery_cleared,
  (select count(*)::int from levelmeup.events where type = 'lighter_plan') as lighter_plan_answers,
  (select count(*)::int from levelmeup.events where type = 'lighter_plan' and (payload ->> 'accept')::boolean) as lighter_plan_taken`,
  },
  {
    title: 'What players used (events by type)',
    sql: `select type, count(*)::int as events, count(distinct user_id)::int as players from levelmeup.events group by type order by 2 desc`,
  },
];

const WRITES = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do|set|reset|vacuum|comment|lock|merge)\b/i;
const PERSONAL = /\b(name|email|reveal|book|vow|raw_user_meta_data|identity_data|phone)\b/i;
const NOTE_TEXT = /\bnote\b(?!\s+is\s+not\s+null)/i;

/** Why a report query is not allowed, or null: one select, nothing written, nothing personal read. */
export function reportProblem(sql: string): string | null {
  if (!/^\s*(select|with)\b/i.test(sql)) return 'not a select';
  if (sql.includes(';')) return 'more than one statement';
  if (WRITES.test(sql)) return 'writes';
  if (PERSONAL.test(sql)) return 'reads something personal';
  if (NOTE_TEXT.test(sql)) return 'reads a note';
  return null;
}

const PERSONAL_COLUMNS = new Set(['user_id', 'id', 'name', 'note', 'email']);

/** The personal columns in a result, which the runner refuses to print. */
export function personalColumns(rows: readonly Record<string, unknown>[]): string[] {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))].filter((column) => PERSONAL_COLUMNS.has(column));
}

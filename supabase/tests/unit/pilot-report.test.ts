import { describe, expect, it } from 'vitest';
import { REPORT, personalColumns, readOnly, reportProblem } from '../../../scripts/lib/pilot.ts';

describe('the pilot report (M9b decision 8)', () => {
  it('every query is one read-only select that reads nothing personal', () => {
    expect(REPORT.length).toBeGreaterThanOrEqual(8);
    for (const { title, sql } of REPORT) expect(reportProblem(sql), title).toBeNull();
  });

  it('refuses writes, more than one statement, and personal fields', () => {
    expect(reportProblem('delete from levelmeup.profiles')).toBe('not a select');
    expect(reportProblem('select 1; select 2')).toBe('more than one statement');
    expect(reportProblem('with x as (update levelmeup.profiles set name = 1 returning 1) select * from x')).toBe('writes');
    expect(reportProblem('select name from levelmeup.profiles')).toBe('reads something personal');
    expect(reportProblem('select note from levelmeup.checkins')).toBe('reads a note');
    expect(reportProblem('select count(*) filter (where note is not null) from levelmeup.checkins')).toBeNull();
    expect(reportProblem('select updated_at, created_at from levelmeup.character_state')).toBeNull();
  });

  it('refuses the review\'s gaps: function calls, whole rows as JSON, payloads and results, and select *', () => {
    expect(reportProblem("select levelmeup.delete_player('00000000-0000-4000-8000-000000000001'::uuid)")).toBe('calls a function');
    expect(reportProblem("select set_config('role', 'x', true)")).toBe('calls a function');
    expect(reportProblem('select row_to_json(p) from levelmeup.profiles p')).toBe('reads something personal');
    expect(reportProblem('select to_jsonb(c) from levelmeup.checkins c')).toBe('reads something personal');
    expect(reportProblem('select payload from levelmeup.events')).toBe('reads something personal');
    expect(reportProblem('select result from levelmeup.events')).toBe('reads something personal');
    expect(reportProblem('select * from levelmeup.character_state')).toBe('reads something personal');
    expect(reportProblem("select count(*) filter (where (payload ->> 'accept')::boolean) from levelmeup.events")).toBeNull();
  });

  it('runs each query in a read-only transaction that is rolled back', () => {
    expect(readOnly('select 1')).toBe('begin transaction read only; select 1; rollback');
  });

  it('a row with a personal column is caught before it is printed', () => {
    expect(personalColumns([{ class_id: 'mage', players: 2 }])).toEqual([]);
    expect(personalColumns([{ user_id: 'x', note: 'y' }])).toEqual(['user_id', 'note']);
    expect(personalColumns([{ payload: {}, result: {}, reveal: {}, book: 'x' }])).toEqual(['payload', 'result', 'reveal', 'book']);
  });
});

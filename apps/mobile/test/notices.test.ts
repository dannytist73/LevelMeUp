import { lintText } from '@levelmeup/content';
import { ADJUST_CODES } from '../../../supabase/functions/_shared/adjust.ts';
import { NOTICE_CODES, noticeText } from '../src/game/notices.ts';

describe('notices for refused actions', () => {
  it('cover every code the server sends for one event (lmu-sync, events.ts, adjust.ts, the SQL write functions)', () => {
    expect([...NOTICE_CODES].sort()).toEqual([
      'ability_not_ready', 'already_answered', 'already_applied', 'already_completed', 'already_hard_day', 'already_protected', 'bad_change',
      'bad_event', 'bad_event_id', 'bad_payload', 'bad_rating', 'checkin_gone', 'class_locked', 'clock_ahead', 'day_closed', 'day_counts', 'day_rebuilt',
      'event_reused', 'future',
      'no_article', 'no_book', 'no_lighter_plan', 'no_swaps_left', 'no_trial', 'not_an_option', 'not_completed', 'not_current', 'not_exercise', 'not_found',
      'not_paused', 'not_swappable', 'not_too_hard', 'outside_day', 'pain_late', 'quest_changed', 'rest_late', 'rest_limit', 'same_book',
      'same_class', 'same_level', 'server_error', 'timer_short', 'too_late', 'topic_empty', 'trial_done',
      'unsupported_event',
    ]);
  });

  it.each(NOTICE_CODES.map((c) => [c]))('%s has a plain, clean sentence', (code) => {
    const text = noticeText(code);
    expect(text.length).toBeGreaterThan(10);
    expect(text.endsWith('.')).toBe(true);
    expect(lintText(text)).toEqual([]);
  });

  it('an unknown code still gets a sentence', () => {
    expect(noticeText('something_new')).toBe("One change couldn't be saved.");
    expect(lintText(noticeText('something_new'))).toEqual([]);
  });
});

it.each(ADJUST_CODES.map((c) => [c]))('has its own words when an adjustment is refused: %s (M6b)', (code) => {
  expect(noticeText(code)).not.toBe(noticeText('no-such-code'));
});

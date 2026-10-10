import { lintText } from '@levelmeup/content';
import { NOTICE_CODES, noticeText } from '../src/game/notices.ts';

describe('notices for refused actions', () => {
  it('cover every code the server sends for one event (lmu-sync, events.ts, the SQL write functions)', () => {
    expect([...NOTICE_CODES].sort()).toEqual([
      'already_completed', 'bad_event', 'bad_event_id', 'bad_payload', 'bad_rating', 'day_closed', 'event_reused', 'future',
      'not_completed', 'not_found', 'outside_day', 'timer_short', 'too_late', 'unsupported_event',
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

/** @jest-environment node */
import { CAMP_TEXT, CHECKIN_TEXT, fillText } from '@levelmeup/content';
import { answerExtra, answerLine, checkinLead, resultText, streakNote } from '../src/game/checkin.ts';
import { project } from '../src/game/project.ts';
import { checkinState } from './support/fixtures.ts';

const T = CHECKIN_TEXT;

describe('the check-in words (M7a)', () => {
  const shown = project(checkinState(), []);
  const checkin = shown.checkin!;

  it('names yesterday, an earlier day (its date, "Sat 10 Oct"), or the away days', () => {
    expect(checkinLead(checkin, 2)).toBe(T.leadYesterday);
    expect(checkinLead(checkin, 3)).toMatch(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}'s core quest/);
    expect(checkinLead({ ...checkin, gap: true, from: 3, to: 5, date: null }, 6)).toBe(fillText(T.leadGap, { days: 3 }));
    expect(checkinLead({ ...checkin, gap: true, from: 3, to: 3, date: null }, 4)).toBe(T.leadGapOne);
  });

  it('says only "Streak paused" when an answer has nothing more to do', () => {
    expect(answerLine('too_hard', checkin, shown.lighterPlan)).toBe(T.answers.too_hard.outcome);
    expect(answerLine('too_hard', { ...checkin, ladder: null }, shown.lighterPlan)).toBe(T.pausedOnly);
    expect(answerLine('lighter_load', checkin, null)).toBe(T.pausedOnly);
  });

  it('beside a compact answer, only what is different about it: its streak pause is said once above (2026-10-27)', () => {
    expect(answerExtra('sick_or_injured', checkin, shown.lighterPlan)).toBe(CAMP_TEXT.ask.extra.sick_or_injured);
    expect(answerExtra('emergency', checkin, shown.lighterPlan)).toBeNull();
    expect(answerExtra('too_hard', checkin, shown.lighterPlan)).toBe(CAMP_TEXT.ask.extra.too_hard);
    expect(answerExtra('too_hard', { ...checkin, ladder: null }, shown.lighterPlan)).toBeNull();
    expect(answerExtra('lighter_load', checkin, null)).toBeNull();
    expect(answerExtra('just_didnt', checkin, shown.lighterPlan)).toBe(CAMP_TEXT.ask.extra.just_didnt);
  });

  it('tells how a miss was settled, with the best streak after a reset', () => {
    expect(resultText('recovered', 6)).toBe(T.result.recovered);
    expect(resultText('reset', 6)).toBe(fillText(T.result.reset, { best: 6 }));
  });

  it('marks the streak paused, then held today', () => {
    expect(streakNote(shown)).toBe(T.streakPaused);
    expect(streakNote({ ...shown, checkin: { ...checkin, answer: 'just_didnt' } })).toBe(T.streakHeld);
    expect(streakNote(project(checkinState({}, { awaiting_checkin: false }), []))).toBeNull();
  });
});

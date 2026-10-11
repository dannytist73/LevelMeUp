import { STATS } from '@levelmeup/rules';
import { planAdvance } from '../../../supabase/functions/_shared/advance.ts';
import { DAY1, afterDay1, characterRow } from '../../../supabase/tests/unit/fixtures.ts';
import type { CharacterRow } from '../../../supabase/functions/_shared/state.ts';
import { offlineDay } from '../src/game/offlineDay.ts';
import { project } from '../src/game/project.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import { completeEvent, serverState } from './support/fixtures.ts';

const END = Date.parse(DAY1.endsAt);
const HOUR = 3_600_000;
const quests = (event: { quests: readonly { slot: string; templateId: string }[] }) => event.quests.map((q) => [q.slot, q.templateId]);

describe('the day the phone builds offline (M6e decision 2)', () => {
  it('waits until the day on screen has ended', () => {
    const s = serverState();
    expect(offlineDay(s, project(s, []), END - 1, 'Asia/Manila')).toBeNull();
  });

  it('is the day the server builds from the same state (nothing done)', () => {
    const s = serverState();
    const event = offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila')!;
    const server = planAdvance(afterDay1([], END + HOUR))!.newDay!;
    expect(event).toMatchObject({
      type: 'provisional_day', dayNumber: 2, builtAt: END + HOUR, timeZone: 'Asia/Manila', budget: server.budget, light: server.light,
      window: { startsAt: Date.parse(server.startsAt), endsAt: Date.parse(server.endsAt) },
    });
    expect(event.quests.map((q) => [q.slot, q.templateId, q.why])).toEqual(server.quests.map((q) => [q.slot, q.templateId, q.why]));
  });

  it('…and with the core cleared offline: its XP, the Discipline and the ladder session count as on the server', () => {
    const s = serverState();
    const core = s.today!.quests.find((q) => q.slot === 'core')!;
    const event = offlineDay(s, project(s, [completeEvent(core.id)]), END + HOUR, 'Asia/Manila')!;
    const xp: Partial<CharacterRow> = {};
    for (const stat of STATS) if (core.xp[stat] !== undefined) xp[`xp_${stat}`] = core.xp[stat];
    const server = planAdvance(afterDay1(['core'], END + HOUR, { character: characterRow(xp) }))!.newDay!;
    expect(quests(event)).toEqual(quests(server));
  });

  it('builds nothing while an offline day is shown, or from a state without the M6e fields', () => {
    const s = serverState();
    const first = offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila')!;
    const shown = project(s, [{ ...first, id: '00000000-0000-4000-8000-000000000999' } as PhoneEvent]);
    expect(offlineDay(s, shown, Date.parse(shown.today!.endsAt!) + HOUR, 'Asia/Manila')).toBeNull();
    const { ladders: _ladders, ...older } = s;
    expect(offlineDay(older as ServerState, project(older as ServerState, []), END + HOUR, 'Asia/Manila')).toBeNull();
  });
});

// What the screens show (architecture §6, M4 plan decision 5): the last server state with the unsent events applied, so a
// change shows at once. Completions move stored XP snapshots; adjustments (M6b) put the option the server offered in
// its slot. Streaks, Discipline and ladders change when the server closes a day. The server's numbers replace all of
// this at the next sync.
import { LIBRARY } from '@levelmeup/content';
import { STATS, findTemplate, levelProgress, painKey, rankFor, statPoints, xpToNextPoint } from '@levelmeup/rules';
import type { XpByStat } from '@levelmeup/rules';
import { hardFields, withFields } from './adjust.ts';
import type { CharacterView, PhoneEvent, QuestView, ServerState } from './types.ts';

/** The character after adding (sign 1) or removing (sign -1) a quest's stored XP, computed like `characterView`. */
export function addStatXp(c: CharacterView, xp: XpByStat, sign: 1 | -1): CharacterView {
  const stats = { ...c.stats };
  for (const s of STATS) {
    const change = (xp[s] ?? 0) * sign;
    if (change === 0) continue;
    const before = stats[s];
    const start = before.points - statPoints(0, before.xp);
    const after = Math.max(0, before.xp + change);
    const points = statPoints(start, after);
    stats[s] = { points, rank: rankFor(points), xp: after, toNext: xpToNextPoint(after) };
  }
  const totalXp = STATS.reduce((sum, s) => sum + stats[s].xp, 0);
  return { ...c, totalXp, ...levelProgress(totalXp), stats };
}

export type Shown = ServerState & {
  /** Quests with a change the server hasn't confirmed ("will sync"). */
  waiting: ReadonlySet<number>;
  /** A class change is on its way to the server. */
  changingClass: boolean;
  /** A Scholar's Path change is on its way. */
  changingBook: boolean;
};

const CHANGEABLE: readonly QuestView['slot'][] = ['core', 'side1', 'side2'];

export function project(server: ServerState, pending: readonly PhoneEvent[]): Shown {
  let character = server.character;
  let profile = server.profile;
  let paused = server.paused;
  let changingClass = false;
  let reading = server.reading;
  let changingBook = false;
  const today = server.today === null ? null : { ...server.today, quests: server.today.quests.map((q) => ({ ...q })) };
  const quests = today?.quests ?? [];
  const waiting = new Set<number>();
  for (const event of pending) {
    if (event.type === 'class_change') {
      profile = { ...profile, classId: event.classId };
      changingClass = true;
      continue;
    }
    if (event.type === 'resume') {
      paused = paused.filter((key) => key !== event.ladderId);
      continue;
    }
    if (event.type === 'training') {
      profile = { ...profile, equipment: event.equipment, programStyle: event.programStyle };
      // Today's open workout is re-planned by the server: it says "Will sync" until then.
      for (const q of quests) if (q.completedAt === null && q.condition.kind === 'session') waiting.add(q.id);
      continue;
    }
    if (event.type === 'book') {
      profile = { ...profile, book: event.title, bookStartedAt: null };
      reading = event.title === null ? null : { sessions: 0, minutes: 0 };
      changingBook = true;
      // Today's open reading quests show the new book; the server re-drafts them (decision 12).
      for (const q of quests) {
        if (q.completedAt !== null || !CHANGEABLE.includes(q.slot) || q.ladder === null) continue;
        if (LIBRARY.ladders.find((l) => l.id === q.ladder)?.tracksBook !== true) continue;
        q.book = event.title;
        waiting.add(q.id);
      }
      continue;
    }
    if (today === null) continue;
    if (event.type === 'hard_day' || event.type === 'plan_rest' || event.type === 'ability') {
      if (event.dayId !== today.id) continue;
      if (event.type === 'plan_rest') {
        if (today.protection === null) today.protection = 'planned_rest';
      } else if (event.type === 'hard_day') {
        if (today.hardDay) continue;
        today.hardDay = true;
        quests.forEach((q, i) => {
          if (q.completedAt !== null || !CHANGEABLE.includes(q.slot)) return;
          quests[i] = {
            ...q, ...hardFields(q, q.slot),
            swaps: q.swaps.map((o) => hardFields(o, q.slot)),
            gentle: q.gentle === null ? null : hardFields(q.gentle, q.slot),
          };
          waiting.add(q.id);
        });
      } else {
        const offer = today.abilities.find((a) => a.ability === event.ability);
        const i = quests.findIndex((q) => q.slot === 'core' && q.completedAt === null);
        if (offer === undefined || i < 0) continue;
        // A hard day still on its way: the server drafts the ability's quest in its hard-day version (review).
        quests[i] = withFields(quests[i]!, today.hardDay && !offer.quest.hardDay ? hardFields(offer.quest, 'core') : offer.quest);
        waiting.add(quests[i]!.id);
        today.abilities = today.abilities.filter((a) => a.ability !== event.ability);
      }
      continue;
    }
    const i = quests.findIndex((q) => q.id === event.instanceId);
    if (i < 0) continue; // not today's quest: only the server can say what happens to it
    const quest = quests[i]!;
    waiting.add(quest.id);
    switch (event.type) {
      case 'complete':
        if (quest.completedAt === null) {
          quest.completedAt = new Date(event.completedAt).toISOString();
          quest.rating = event.rating;
          character = addStatXp(character, quest.xp, 1);
        }
        break;
      case 'undo':
        if (quest.completedAt !== null) {
          quest.completedAt = null;
          quest.rating = null;
          character = addStatXp(character, quest.xp, -1);
        }
        break;
      case 'rate':
        if (quest.completedAt !== null) quest.rating = event.rating;
        break;
      case 'swap': {
        const option = quest.swaps.find((o) => o.templateId === event.templateId);
        if (option !== undefined && quest.completedAt === null && today.swapsLeft > 0) {
          quests[i] = withFields(quest, option);
          today.swapsLeft -= 1;
        }
        break;
      }
      case 'pain': {
        const template = findTemplate(LIBRARY, quest.templateId);
        if (template === undefined || template.exercise === null) break;
        const key = painKey(template);
        if (!paused.includes(key)) paused = [...paused, key].sort();
        if (event.choice === 'gentle' && quest.completedAt === null && quest.gentle !== null) quests[i] = withFields(quest, quest.gentle);
        if (event.choice === 'rest' && today.protection === null) today.protection = 'pain';
        break;
      }
      case 'step_down':
        quests[i] = { ...quest, canStepDown: false };
        break;
    }
  }
  return { ...server, profile, paused, character, today, reading, waiting, changingClass, changingBook };
}

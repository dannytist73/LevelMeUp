// What the screens show (architecture §6, M4 plan decision 5): the last server state with the unsent events applied, so a
// change shows at once. Completions move stored XP snapshots; adjustments (M6b) put the option the server offered in
// its slot. Streaks, Discipline and ladders change when the server closes a day. The server's numbers replace all of
// this at the next sync. M6e: a `provisional_day` in the outbox is today until the server's state has that day; events
// name its quests by day and slot. M7a: a check-in answer shows at once (the card goes, or the streak is held for the
// recovery quest the server adds); the lighter plan drops the minutes one step. M7b: the game settings show at once; a
// rest day planned for tomorrow, and the offline day it falls on. M7c: the pact's level (a lowering eases today's
// consequence at once), the Trial's session and the note show at once.
import { LIBRARY } from '@levelmeup/content';
import {
  STATS, STREAK_SLOTS, checkinOutcome, closedDayResolution, findTemplate, levelProgress, lighterMinutes, painKey, rankFor, statPoints,
  xpToNextPoint,
} from '@levelmeup/rules';
import type { XpByStat } from '@levelmeup/rules';
import { hardFields, withFields } from './adjust.ts';
import { offlineToday } from './offline.ts';
import { asLevel } from './pact.ts';
import type { CharacterView, PhoneEvent, QuestView, ServerState, SlotRef, TodayView } from './types.ts';

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
  /** Today is a day this phone built offline (M6e): its quests have no server ids yet. */
  offline: boolean;
  /** Ladder changes on their way, in order (M6e review): the phone's offline day applies them as the server will. */
  ladderChanges: readonly PendingLadder[];
  /** A check-in answer is on its way (M7a): the recovery quest of "I just didn't" arrives with the sync. */
  answering: boolean;
};

/** "I felt pain" rests a ladder or exercise, Resume brings it back, a step-down lowers a ladder. */
export type PendingLadder = { key: string; change: 'pain' | 'resume' | 'step_down' };

const CHANGEABLE: readonly QuestView['slot'][] = ['core', 'side1', 'side2'];

/** Where the quest an event names is in `today`: by id, or (M6e) by day and slot for a quest of a day built offline. */
function questIndex(today: TodayView, event: { instanceId: number | null; ref?: SlotRef }): number {
  const { ref } = event;
  if (ref !== undefined) return today.dayNumber === ref.dayNumber ? today.quests.findIndex((q) => q.slot === ref.slot) : -1;
  return today.quests.findIndex((q) => q.id === event.instanceId);
}

/** The lighter plan once the minutes are `minutes` (decision 9): the next step down, quiet for 14 days. */
function stepped(minutes: number): ServerState['lighterPlan'] {
  const to = lighterMinutes(minutes);
  return to === null ? null : { from: minutes, to, offered: false };
}

export function project(server: ServerState, pending: readonly PhoneEvent[]): Shown {
  // A state from a server before M7b has no planned rest day and no rest-tomorrow offer (decision 9).
  let character = { ...server.character, restDay: server.character.restDay ?? null };
  // A state from a server before M7c has no pact time (decision 12).
  let profile = server.profile.accountabilityFrom === undefined ? { ...server.profile, accountabilityFrom: null } : server.profile;
  let paused = server.paused;
  let changingClass = false;
  let reading = server.reading;
  let changingBook = false;
  let today: TodayView | null = server.today === null
    ? null
    : {
      ...server.today, restTomorrow: server.today.restTomorrow ?? false, article: server.today.article ?? null,
      quests: server.today.quests.map((q) => ({ ...q })),
    };
  let quests = today?.quests ?? [];
  let offline = false;
  // A state from a server before M7a has none of these (review): nothing shows rather than Today failing.
  // M7c: nor what the pact did with a check-in (decision 12).
  let checkin = server.checkin === null || server.checkin === undefined
    ? null
    : {
      ...server.checkin, recoveryDayId: server.checkin.recoveryDayId ?? null, consequence: server.checkin.consequence ?? null,
      trialDone: server.checkin.trialDone ?? false, note: server.checkin.note ?? null,
    };
  let lighterPlan = server.lighterPlan ?? null;
  // M8b: a state from a server before M8b has no readings, next article or Insight (review pattern of M7a).
  let readings = server.readings ?? [];
  let insight = server.insight ?? null;
  const nextArticle = server.nextArticle ?? null;
  let answering = false;
  const ladderChanges: PendingLadder[] = [];
  const waiting = new Set<number>();
  for (const event of pending) {
    if (event.type === 'provisional_day') {
      // M6e: a day this phone built offline is today until the server's state has that day (or a later one).
      if (today === null || today.dayNumber < event.dayNumber) {
        // The day that ended may need a check-in (its core quest not done): the streak waits for it, as on the server.
        if (today !== null) {
          const done = today.quests.filter((q) => q.completedAt !== null);
          const ended = closedDayResolution({
            coreDone: done.some((q) => q.slot === 'core'), questsDone: done.filter((q) => STREAK_SLOTS.includes(q.slot)).length,
            protection: today.protection,
          });
          if (ended.kind === 'awaiting_checkin') character = { ...character, streak: { ...character.streak, awaitingCheckin: true } };
        }
        today = offlineToday(event);
        // M8b decision 4: its article is the one the server named for it; Insight waits for the server's own day.
        today.article = event.articleId != null && nextArticle !== null && nextArticle.id === event.articleId ? nextArticle : null;
        insight = null;
        // A day planned as rest the day before is built as one (decision 5), as the server will.
        if (character.restDay === event.dayNumber) today.protection = 'planned_rest';
        quests = today.quests;
        offline = true;
      }
      continue;
    }
    if (event.type === 'class_change') {
      profile = { ...profile, classId: event.classId };
      changingClass = true;
      continue;
    }
    if (event.type === 'resume') {
      paused = paused.filter((key) => key !== event.ladderId);
      ladderChanges.push({ key: event.ladderId, change: 'resume' });
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
    if (event.type === 'checkin') {
      const asked = checkin;
      if (asked === null || asked.id !== event.checkinId || asked.answer !== null) continue;
      const outcome = checkinOutcome(event.answer);
      answering = true;
      if (outcome.resolution === 'protected') {
        checkin = null;
        character = { ...character, streak: { ...character.streak, awaitingCheckin: false } };
      } else {
        checkin = { ...asked, answer: 'just_didnt', secondWind: null };
      }
      const missed = asked.core === null ? undefined : findTemplate(LIBRARY, asked.core);
      if (outcome.pauseLadder && missed !== undefined && missed.exercise !== null) {
        const key = painKey(missed);
        if (!paused.includes(key)) paused = [...paused, key].sort();
        ladderChanges.push({ key, change: 'pain' });
      }
      if (outcome.stepDownLadder && asked.ladder !== null) ladderChanges.push({ key: asked.ladder, change: 'step_down' });
      if (outcome.reduceDailyMinutes && lighterPlan !== null) {
        profile = { ...profile, minutesPerDay: lighterPlan.to };
        lighterPlan = stepped(lighterPlan.to);
      }
      if (outcome.lighterTomorrow) character = { ...character, nextDayLight: true };
      continue;
    }
    if (event.type === 'accountability_set') {
      const before = asLevel(profile.accountabilityLevel);
      // A raise is signed when the server has it; a lowering keeps the time; off forgets it (decision 3).
      profile = {
        ...profile, accountabilityLevel: event.level,
        accountabilityFrom: event.level === 0 || event.level > before ? null : profile.accountabilityFrom,
      };
      // A lowering eases today's consequence at once, as the server will.
      if (event.level < before && checkin !== null && checkin.answer === 'just_didnt') {
        if (checkin.consequence === 'trial') checkin = { ...checkin, consequence: event.level === 1 ? 'shadow' : null };
        else if (checkin.consequence === 'shadow' && event.level === 0) checkin = { ...checkin, consequence: null };
      }
      continue;
    }
    if (event.type === 'trial') {
      if (checkin !== null && checkin.id === event.checkinId && checkin.consequence === 'trial') checkin = { ...checkin, trialDone: true };
      continue;
    }
    if (event.type === 'checkin_note') {
      if (checkin !== null && checkin.id === event.checkinId) checkin = { ...checkin, note: event.note };
      continue;
    }
    if (event.type === 'lighter_plan') {
      if (lighterPlan === null) continue;
      if (event.accept) profile = { ...profile, minutesPerDay: lighterPlan.to };
      lighterPlan = event.accept ? stepped(lighterPlan.to) : { ...lighterPlan, offered: false };
      continue;
    }
    if (event.type === 'settings') {
      profile = {
        ...profile, voice: event.voice, boundaryMinutes: event.boundaryMinutes, minutesPerDay: event.minutesPerDay, difficulty: event.difficulty,
      };
      // The lighter plan steps down from the new minutes; whether it is offered stays the server's (decision 2).
      const to = lighterMinutes(event.minutesPerDay);
      lighterPlan = to === null ? null : { from: event.minutesPerDay, to, offered: lighterPlan?.offered ?? false };
      continue;
    }
    if (event.type === 'insight') {
      // M8b decision 8: the choice shows at once; the server checks it.
      if (insight !== null) insight = { ...insight, chosen: event.cluster };
      continue;
    }
    if (today === null) continue;
    if (event.type === 'hard_day' || event.type === 'plan_rest' || event.type === 'ability') {
      if (event.dayId !== today.id) continue;
      if (event.type === 'plan_rest') {
        if (event.tomorrow === true) {
          character = { ...character, restDay: today.dayNumber + 1 };
          today.restTomorrow = false;
        } else if (today.protection === null) {
          today.protection = 'planned_rest';
          // Both rests count in the 2-in-7 limit: tomorrow's offer waits for the server's answer (review).
          today.restTomorrow = false;
        }
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
    const i = questIndex(today, event);
    if (i < 0) continue; // not today's quest: only the server can say what happens to it
    const quest = quests[i]!;
    waiting.add(quest.id);
    switch (event.type) {
      case 'complete':
        if (quest.completedAt === null) {
          quest.completedAt = new Date(event.completedAt).toISOString();
          quest.rating = event.rating;
          character = addStatXp(character, quest.xp, 1);
          // M8b decision 7: the takeaway joins today's reading.
          const text = (event.payload as { text?: unknown } | null)?.text;
          if (quest.slot === 'article' && typeof text === 'string') {
            readings = readings.map((r) => (r.dayNumber === today!.dayNumber ? { ...r, takeaway: text } : r));
          }
        }
        break;
      case 'undo':
        if (quest.completedAt !== null) {
          quest.completedAt = null;
          quest.rating = null;
          character = addStatXp(character, quest.xp, -1);
          if (quest.slot === 'article') readings = readings.map((r) => (r.dayNumber === today!.dayNumber ? { ...r, takeaway: null } : r));
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
        ladderChanges.push({ key, change: 'pain' });
        if (event.choice === 'gentle' && quest.completedAt === null && quest.gentle !== null) quests[i] = withFields(quest, quest.gentle);
        if (event.choice === 'rest' && today.protection === null) today.protection = 'pain';
        break;
      }
      case 'step_down':
        quests[i] = { ...quest, canStepDown: false };
        if (quest.ladder !== null) ladderChanges.push({ key: quest.ladder, change: 'step_down' });
        break;
    }
  }
  return {
    ...server, profile, paused, character, today, reading, waiting, changingClass, changingBook, offline, ladderChanges, checkin, lighterPlan,
    checkinResult: server.checkinResult ?? null, answering, readings, insight, nextArticle,
  };
}

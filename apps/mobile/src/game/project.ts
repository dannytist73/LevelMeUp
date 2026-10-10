// What the screens show (architecture §6, M4 plan decision 5): the last server state with the unsent events applied, so a
// completion shows its reward at once. Only stored XP snapshots move; streaks, Discipline and ladders change when the
// server closes a day. The server's numbers replace all of this at the next sync.
import { STATS, levelProgress, rankFor, statPoints, xpToNextPoint } from '@levelmeup/rules';
import type { XpByStat } from '@levelmeup/rules';
import type { CharacterView, PhoneEvent, ServerState } from './types.ts';

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

export type Shown = ServerState & { /** Quests with a change the server hasn't confirmed ("will sync"). */ waiting: ReadonlySet<number> };

export function project(server: ServerState, pending: readonly PhoneEvent[]): Shown {
  let character = server.character;
  const quests = (server.today?.quests ?? []).map((q) => ({ ...q }));
  const waiting = new Set<number>();
  for (const event of pending) {
    const quest = quests.find((q) => q.id === event.instanceId);
    if (quest === undefined) continue; // not today's quest: only the server can say what happens to it
    waiting.add(quest.id);
    if (event.type === 'complete' && quest.completedAt === null) {
      quest.completedAt = new Date(event.completedAt).toISOString();
      quest.rating = event.rating;
      character = addStatXp(character, quest.xp, 1);
    } else if (event.type === 'undo' && quest.completedAt !== null) {
      quest.completedAt = null;
      quest.rating = null;
      character = addStatXp(character, quest.xp, -1);
    } else if (event.type === 'rate' && quest.completedAt !== null) {
      quest.rating = event.rating;
    }
  }
  return { ...server, character, today: server.today === null ? null : { ...server.today, quests }, waiting };
}

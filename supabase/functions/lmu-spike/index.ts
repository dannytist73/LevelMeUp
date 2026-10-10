// Throwaway spike (M3): do the rules and content packages load in the Supabase Edge Runtime, and does Intl know
// the time zones the rules need? Deleted after the spike.
import { canonicalTimeZone, firstDayWindow, levelForXp } from '../../../packages/rules/src/index.ts';
import { CONTENT_VERSION, LIBRARY } from '../../../packages/content/src/index.ts';

Deno.serve(() => {
  const now = Date.UTC(2026, 9, 10, 12, 0, 0);
  return Response.json({
    level: levelForXp(500),
    contentVersion: CONTENT_VERSION,
    templates: LIBRARY.templates.length,
    calcutta: canonicalTimeZone('Asia/Calcutta'),
    manila: firstDayWindow(now, 'Asia/Manila', 240),
    newYork: firstDayWindow(now, 'America/New_York', 240),
    runtimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
});

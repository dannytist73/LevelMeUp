// Writes packages/content/out/review.html: every quest, voice line, why-line, achievement and Shadow line on one page,
// for the owner's review. Generated from the data; change the data, not the page. Run: npm run content:review
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DISCIPLINE_PER_RECOVERY, WHY_CODES, XP_BY_TIER, ladderRungs } from '../../rules/src/index.ts';
import {
  ACHIEVEMENTS, CLASS_NAMES, EXERCISE_SAFETY_LINE, GOAL_NAMES, LADDERS, LIBRARY, LIMITATION_NAMES, SHADOW_LINES,
  SHADOW_MOMENTS, STAT_NAMES, TEMPLATES, VOICES, WHY_TEXT, questSummary,
} from '../src/index.ts';
import type { AuthoredTemplate } from '../src/index.ts';

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const list = (items: readonly string[]): string => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
const VOICE_LABELS = { mentor: 'Mentor', system: 'System', questmaster: 'Questmaster' } as const;
const MOMENT_LABELS: Record<string, string> = {
  claim: 'Claims the day (after "I just didn\'t")',
  mark: 'While the mark stays',
  release: 'Recovery quest cleared',
  trial: 'Level 2: side quests sealed',
  evening: 'Level 2: the evening reminder',
  retreat: 'Consequences pause (3 in 7 days)',
};

function reward(t: AuthoredTemplate): string {
  if (t.role === 'recovery') return `Discipline +${DISCIPLINE_PER_RECOVERY}`;
  const xp = XP_BY_TIER[t.tier];
  return t.split ? `+${xp} XP, split ${STAT_NAMES[t.stat]} / ${STAT_NAMES[t.split.secondary]}` : `+${xp} XP`;
}

function card(t: AuthoredTemplate, rungCount: number | null): string {
  const position = t.rung !== null && rungCount !== null ? `Rung ${t.rung + 1} of ${rungCount}` : t.role.replace('_', ' ');
  const chips = [
    STAT_NAMES[t.stat],
    `${t.tier} tier`,
    t.completion === 'reps' ? 'rep log' : t.completion === 'text' ? 'one sentence' : t.completion,
    ...(t.gentle ? ['gentle start'] : []),
    ...t.contraindications.map((c) => `not with ${LIMITATION_NAMES[c].toLowerCase()}`),
  ];
  const safety = t.exercise !== null ? [...t.safety, `Always shown: ${EXERCISE_SAFETY_LINE}`] : t.safety;
  return `<article class="quest" id="${esc(t.id)}">
  <header class="quest-head">
    <div class="quest-name"><p class="eyebrow">${esc(position)} · <code>${esc(t.id)}</code></p><h3>${esc(t.name)}</h3></div>
    <p class="stamp">${esc(reward(t))}</p>
  </header>
  <p class="target">${esc(questSummary(t, false))}<span class="hard">Hard day: ${esc(questSummary(t, true))}</span></p>
  <p class="chips">${chips.map((chip) => `<span>${esc(chip)}</span>`).join('')}</p>
  <div class="detail">
    <div><h4>Steps</h4>${list(t.steps)}</div>
    ${safety.length > 0 ? `<div><h4>Safety</h4>${list(safety)}</div>` : ''}
  </div>
  <div class="voices">${VOICES.map((v) => `<div class="voice voice-${v}"><p class="who">${VOICE_LABELS[v]}</p><p class="title">${esc(t.voice[v].title)}</p><p>${esc(t.voice[v].line)}</p></div>`).join('')}</div>
</article>`;
}

const ladderSections = LADDERS.map((l) => {
  const rungs = ladderRungs(LIBRARY, l.id);
  const meta = [
    STAT_NAMES[l.stat],
    `goals: ${l.goals.map((g) => GOAL_NAMES[g]).join('; ')}`,
    `preferred by: ${l.affinity.map((c) => CLASS_NAMES[c]).join(', ')}`,
    ...(l.ownProgram ? ['only for players with their own program'] : []),
    ...(l.tracksBook ? ["tracks the Scholar's Path book"] : []),
  ];
  return `<section class="ladder" id="ladder-${esc(l.id)}">
  <h2>${esc(l.id.replace('-', ' '))}</h2>
  <p class="meta">${meta.map(esc).join(' · ')}</p>
  ${rungs.map((t) => card(TEMPLATES.find((a) => a.id === t.id)!, rungs.length)).join('')}
</section>`;
}).join('');

const standalone = TEMPLATES.filter((t) => t.ladder === null);
const standaloneSection = `<section id="standalone"><h2>Standalone quests</h2>
  <p class="meta">Tiny quests that keep 10-minute days possible, the recovery quests (Warrior and Rogue walk, Mage reads, Monk breathes), Stillness, the Dawn Ritual and the article.</p>
  ${standalone.map((t) => card(t, null)).join('')}</section>`;

const whySection = `<section id="why"><h2>Why-lines</h2>
  <p class="meta">Every quest card says why it was picked. Words in braces are filled in, for example {stat} becomes Focus.</p>
  <div class="table-wrap"><table><thead><tr><th>Reason</th>${VOICES.map((v) => `<th>${VOICE_LABELS[v]}</th>`).join('')}</tr></thead><tbody>
  ${WHY_CODES.map((code) => `<tr><th scope="row"><code>${code}</code></th>${VOICES.map((v) => `<td>${esc(WHY_TEXT[code][v])}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div></section>`;

const achievementSection = `<section id="achievements"><h2>Achievements</h2>
  <ul class="achievements">${ACHIEVEMENTS.map((a) => `<li><p class="title">${esc(a.name)}</p><p>${esc(a.description)}</p>${a.title ? `<p class="earns">Title: ${esc(a.title)}</p>` : ''}</li>`).join('')}</ul></section>`;

const shadowSection = `<section id="shadow"><h2>The Shadow</h2>
  <p class="meta">Only for players who sign the Accountability Pact. Ominous, never insulting, never about the player's worth, never threatening anything real.</p>
  ${SHADOW_MOMENTS.map((m) => `<div class="shadow"><p class="who">${esc(MOMENT_LABELS[m] ?? m)}</p>${SHADOW_LINES[m].map((line) => `<blockquote>${esc(line)}</blockquote>`).join('')}</div>`).join('')}</section>`;

const nav = [
  ...LADDERS.map((l) => [`ladder-${l.id}`, l.id.replace('-', ' ')]),
  ['standalone', 'standalone'],
  ['why', 'why lines'],
  ['achievements', 'achievements'],
  ['shadow', 'the Shadow'],
];

const html = `<title>LevelMeUp Quest Library</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Gothic+A1:wght@400;500;700&display=swap">
<style>
/* Ink Panel, the app's own look: a night page with paper panels for the thing to read now; red only for rewards. */
:root {
  --page: #0E0E10; --panel: #18181B; --paper: #E8E1D3; --ink: #151515; --text: #F1ECE1; --muted: #A8A196;
  --line: #3A3A40; --reward: #E0452B; --reward-text: #F0765E;
  --display: 'Black Han Sans', 'Arial Black', system-ui, sans-serif;
  --body: 'Gothic A1', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --mono: ui-monospace, 'Cascadia Mono', Menlo, monospace;
  color-scheme: dark;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) { --page: #EDE7DA; --panel: #F7F3EA; --paper: #FFFDF8; --ink: #151515; --text: #151515; --muted: #5E584E; --line: #CFC6B4; --reward: #C2321C; --reward-text: #B02E1A; color-scheme: light; }
}
:root[data-theme="light"] { --page: #EDE7DA; --panel: #F7F3EA; --paper: #FFFDF8; --ink: #151515; --text: #151515; --muted: #5E584E; --line: #CFC6B4; --reward: #C2321C; --reward-text: #B02E1A; color-scheme: light; }
* { box-sizing: border-box; }
body { background: var(--page); color: var(--text); font: 15px/1.55 var(--body); }
main { max-width: 920px; margin: 0 auto; padding-inline: 16px; padding-block: 28px 72px; display: grid; gap: 40px; }
h1, h2, h3 { font-family: var(--display); font-weight: 400; line-height: 1.15; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(30px, 6vw, 44px); letter-spacing: .01em; }
h2 { font-size: 24px; text-transform: capitalize; }
h3 { font-size: 19px; }
h4, .eyebrow, .who { font: 700 12px/1.3 var(--body); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin: 0; }
p { margin: 0; }
code { font: 12px var(--mono); }
ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
section { display: grid; gap: 14px; min-width: 0; }
.intro { display: grid; gap: 14px; max-width: 65ch; }
.intro p { color: var(--muted); }
.lookfor { background: var(--panel); border: 2px solid var(--line); padding: 16px; display: grid; gap: 8px; }
.lookfor li { color: var(--text); }
.counts { font-variant-numeric: tabular-nums; }
nav { display: flex; flex-wrap: wrap; gap: 6px; }
nav a { color: var(--text); border: 2px solid var(--line); padding: 4px 10px; font-size: 13px; text-decoration: none; text-transform: capitalize; }
nav a:hover, nav a:focus-visible { border-color: var(--text); outline: none; }
.meta { color: var(--muted); max-width: 70ch; }
.quest { background: var(--paper); color: var(--ink); border: 2px solid var(--ink); padding: 16px; display: grid; gap: 12px; min-width: 0; }
.quest .eyebrow, .quest h4 { color: #5E584E; }
.quest-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.quest-name { display: grid; gap: 4px; min-width: 0; }
.stamp { font-family: var(--display); font-size: 14px; color: #FFFFFF; background: var(--reward); padding: 4px 10px; transform: rotate(-3deg); white-space: nowrap; }
.target { font-weight: 700; display: flex; flex-wrap: wrap; gap: 4px 14px; }
.hard { font-weight: 400; color: #5E584E; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips span { border: 1.5px solid var(--ink); padding: 1px 8px; font-size: 12px; font-weight: 700; }
.detail { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px 20px; }
.detail > div { display: grid; gap: 6px; align-content: start; min-width: 0; }
.voices { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
.voice { border-top: 2px solid var(--ink); padding-top: 8px; display: grid; gap: 2px; min-width: 0; }
.voice .who { color: #5E584E; }
.voice .title { font-weight: 700; }
.table-wrap { overflow-x: auto; border: 2px solid var(--line); }
table { border-collapse: collapse; width: 100%; min-width: 720px; font-size: 14px; }
th, td { border-bottom: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
thead th { font: 700 12px var(--body); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.achievements { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.achievements li { background: var(--panel); border: 2px solid var(--line); padding: 12px; display: grid; gap: 4px; align-content: start; }
.achievements .title { font-family: var(--display); font-size: 17px; }
.earns { color: var(--reward-text); font-weight: 700; font-size: 13px; }
.shadow { display: grid; gap: 8px; }
blockquote { margin: 0; background: #050506; color: #F1ECE1; border: 2px solid #F0765E; padding: 12px 14px; }
@media (prefers-reduced-motion: no-preference) { nav a { transition: border-color .15s; } }
</style>
<main>
  <header class="intro">
    <p class="eyebrow">LevelMeUp · M2 content for review</p>
    <h1>The Quest Library</h1>
    <p class="counts">${TEMPLATES.length} quests in ${LADDERS.length} ladders, ${WHY_CODES.length} why-lines in three voices, ${ACHIEVEMENTS.length} achievements and ${SHADOW_MOMENTS.length} moments for the Shadow. Generated from the content package, so every number here is the one the app uses.</p>
    <div class="lookfor">
      <h4>What to look for</h4>
      <ul>
        <li>Does each voice sound right? Mentor is warm, System is terse, Questmaster is epic but never insulting.</li>
        <li>Anything that reads as preachy, cheesy, robotic or unsafe.</li>
        <li>Exercise steps and safety notes. A fitness professional should skim the strength, walking and mobility ladders before the pilot.</li>
        <li>Achievement names and titles, and the Shadow's lines.</li>
      </ul>
    </div>
    <nav aria-label="Sections">${nav.map(([id, label]) => `<a href="#${id}">${esc(label!)}</a>`).join('')}</nav>
  </header>
  ${ladderSections}
  ${standaloneSection}
  ${whySection}
  ${achievementSection}
  ${shadowSection}
</main>
`;

const out = fileURLToPath(new URL('../out/', import.meta.url));
mkdirSync(out, { recursive: true });
writeFileSync(`${out}review.html`, html);
console.log(`wrote ${out}review.html (${Math.round(html.length / 1024)} KB)`);

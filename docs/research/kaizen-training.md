# Kaizen training materials: research for LevelMeUp's physical quests

*Compiled 2026-10-11 from the owner's Google Drive (dannytist.73@gmail.com), read-only. Kaizen is a paid coaching
program (Lazy Lifter / "Coach Cho"); its principles below are paraphrased. Exercise names, muscles, equipment and
set/rep numbers are listed in full because they are facts. Do not ship Kaizen's wording, links or branding in the app.*

---

## 1. Plain-language summary

- The Drive holds five versions of one spreadsheet product, the Kaizen **Workout Builder** (Men's v3.01, Men's v3.02,
  Women's v3.01, a "Day-2-Day" copy and a de-branded "D-Code" copy), plus a bulk/cut weight planner, Season 3/4
  onboarding docs, eleven weekly "action item" PDFs, a workout-rules image, a daily-routine cheatsheet, a
  mindful-eating guide, a journal guide and a bonus 6-day "photoshoot" routine.
- The builders have no questionnaire. You pick a 2, 3, 4 or 5 days/week tab, then for each movement slot (for
  example "Horizontal Pull") you pick an exercise from that slot's dropdown. The sheet then fills in a 6-week block
  (5 build-up weeks and 1 deload week) with sets, reps, rest and a written progression rule.
- That dropdown is the only "equipment selector": most slots offer barbell, dumbbell, Smith machine, machine, cable
  and resistance-band versions, and a few bodyweight ones.
- The exercise directory has about 130 exercises (135 rows across all versions), each with a rep range and a
  YouTube demo link. LevelMeUp can reuse the names, slot groups and rep ranges as the skeleton of its library.
- The progression logic is simple and easy to code. Main lifts use a fixed rep target (6 to 10) and the last set
  is pushed hard. Accessories use double progression: work up to the top of the rep range, then add 5–10 lb. Bands
  and assisted pull-ups have their own rules. Sets ramp 2→3→3→4→4, then the deload keeps the same weight with half
  the reps.
- The docs add habit rules that can become quests: 7,500–10,000 steps a day, a morning weigh-in under the same
  conditions every day, measurements and photos every 2 weeks, logging everything, a weekly review, accountability,
  a hard week before each deload, and losing about 0.5–1 % of bodyweight a week on a cut.
- Not yet usable: the 14 lesson videos (not transcribed) and the lesson notes and infographics that the PDFs link
  to (outside this task).

---

## 2. Sources

| Title | Drive file ID | Type | Status |
|---|---|---|---|
| Copy of [Kaizen] Men's Workout Builder (v3.01) | 1eaDmqMYnhW7F1AT5S-TYpxPBGeW3CPn5dLK1DLP0GLY | Google Sheet, 11 tabs | **Read OK**, all tabs. `read_file_content` returned only sample rows, so I exported the file as .xlsx and parsed values, formulas and dropdown validations with openpyxl. This copy was saved 3 seconds after it was created (2023-01-22), so its picks are the template's own defaults. |
| Copy of [Kaizen] Men's Workout Builder (v3.02) | 1e7yvoU-RVF7X9zJKb7WxV2xO3kHfmX7_AXAEohtAoHA | Google Sheet, 11 tabs | **Read OK**, all tabs (.xlsx export). Last modified 2024-04-28. |
| [Kaizen] Women's Workout Builder (v3.01) | 1UByzT-NJlTFnq2DEMSP9L7SQst3SJ2eFFQF8_UNZySU | Google Sheet, 11 tabs | **Read OK**, all tabs (.xlsx export). Last modified 2024-05-02. |
| Day-2-Day Workout Builder | 11Njz6-T4DhLJiPbNiV48kPsLx8dyI1-Zqxn110fvASg | Google Sheet, 11 tabs | **Read OK**, all tabs (.xlsx export). Created 2026-04-07. |
| D-Code Workout Builder v1.0 | 1vx2-B2AKYMpzHvjfgLSWP8GgSWcC44UaqekLG2nDwzc | Google Sheet, 11 tabs | **Read OK**, all tabs (.xlsx export). Created 2023-05-29, last modified 2024-12-11. |
| Kaizen Bulk/Cut 2023 Planner | 1xnJZkzHMJvc6Hjz1Ehyb271trYFprkd7Jpbl12j5wQI | Google Sheet, 2 tabs (Scenario 1, Scenario 2) | **Read OK**, both tabs (`read_file_content`; the .xlsx export confirmed there are only 2 sheets). |
| KAIZEN MAINTENANCE PROGRAM (S3) | 1e9TI14HEkcn5DDdwwZs9zoL9bazEEiWkNTzjsQfpe7E | Google Doc | **Read OK**. Mostly an enrollment offer (prices) for the off-season, with a short argument about relapse after a diet. |
| KAIZEN SEASON 4 ONBOARDING REMINDERS & ACTION ITEMS | 1U_dBdaNPD6o0-7blcTKCgombWNfZwEhoU0g3G9r9lpc | Google Doc | **Read OK**. |
| KAIZEN SEASON 3 PRE-COACHING REMINDERS & ACTION ITEMS | 192U_LqpzaaTsRHlIWJkqtdTF1spH7cf-a4By7Ki7gdg | Google Doc | **Read OK**. |
| Kaizen Daily Journal Guide | 1MlfQ516tYo5NEfNdjqkgKwySYtzhYQENQK6StAc6kvc | Google Doc | **Read OK**. The Notion template it links to was not opened. |
| KAIZEN SEASON 3 - Habit Tracker Walkthrough | 1qNe4iNNo1lI1tEBs0tW74o5woMbOt_TUUyIlg7grSiw | Google Doc | **Partly**. The doc is only five links to walkthrough videos (setup tab, measurements tab, filling in the tracker, dashboard). The videos were not opened, so the tracker's habit list and scoring are unknown. |
| 4 - Workout Rules.png | 14wToeiTpdFGsNzb7SUccSSZZjnkVILbt | PNG | **Read OK** (Drive's text extraction). Same rules as the builders' Rules tab. |
| 6 - Daily Routine Cheatsheet.pdf | 1PMuO00zjpnuJWoB8Cro61MjrBuzWbIvW | PDF | **Read OK**. |
| 11 - Tips On Mindful Eating | 1k93QzriEzIiQCk9MwhCDlJXJ8T2KTynFHTehpPHtMTo | Google Doc | **Read OK**. |
| #1. Cho's Photoshoot Workout.pdf | 1Mqi-Wrz-D_QDG4yU1s0F8wYTTfp2YkjO | PDF, 3 pages | **Read OK**. Drive's text extraction scrambled the table, so I downloaded the PDF to the scratchpad and read the rendered pages. |
| 5 - 2.0 Character Worksheet (Editable).pdf | 14YtZbcGYoTyY3gZM8vbI0Kzv0VbgBQFa | PDF, 24 pages | **Read OK**, but this copy holds the owner's own filled-in, private answers. On purpose, only the worksheet's structure is summarized here. |
| 0 - Week 1 Action Items | 15Lu_DTfqu9n5JfVW7faaay7BPiC3MNgi | PDF | **Read OK**. Each action-item PDF ends with a raw link list that the tool cut off; the body text is complete. |
| 0 - Week 2 Action Items | 1RM30lAXkJaIaWg4f6XDeCU2lm25XqeXI | PDF | **Read OK** (trailing link list cut off). |
| 0 - Week 3 Action Items | 1YyXEQj4Roq7042K3VA5dq_UzSoDwW6-o | PDF | **Read OK** (trailing link list cut off). |
| 0 - Week 4 Action Items | 1gqVR86wig_dj8rGBjs_CZRmFzapMQc9F | PDF | **Read OK** (trailing link list cut off). |
| 0 - Week 5 Action Items | 1UD-imLE5PYvpXkblsHx8f_V-pcgHnmfM | PDF | **Read OK** (trailing link list cut off). |
| 0 - Week 6 Action Items | 1eORXE6nqq6EbS31UrAc63Xu1_0SDieZN | PDF | **Read OK** (trailing link list cut off). |
| 0 - Week 7 Action Items | 1GlaNfFqw-BX_EX_U_OlXBiebO2lG_ble | PDF | **Read OK** (trailing link list cut off). |
| 0 - Week 8 Action Items | 14u1i-rgLd9dgVKWYJoBl9o-uZkJUO9MT | PDF | **Read OK** (trailing link list cut off). |
| 0 - Week 9 Action Items | 151USoaPF0AFotcNQiwNZqTZDc2srTCt_ | PDF | **Read OK** (trailing link list cut off). |
| 0 - Week 13 - Action Items | 1E5K80HDIBPBqAZBhVw62jPoHRAy5__18 | PDF | **Read OK** (trailing link list cut off). |
| 0 - Week 15 Action Items | 1qYJrDgbADt0PAeAuQUt8kHbTy2Vu7mRa | PDF | **Read OK** (trailing link list cut off). |

**Lesson videos: not yet transcribed** (in the Kaizen folder `16CTKFkOg99FXRc8XNQxTfYxb1d7jFLvF`; titles and sizes
only, nothing downloaded):

| Title | Size |
|---|---|
| Week 1 - Creating the 2.0 Character & Installing the Mindsets & Habits.mp4 | 563 MB |
| Week 2 - The Simplified Workout, Nutrition, Cardio, and Supplementation Program.mp4 | 396 MB |
| Week 3 - Calibrating and Fine Tuning- How to make adjustments to your Workout, Nutrition and Habits..mp4 | 457 MB |
| Week 4 - Mindset, Behavioral, Diet, Workout, Sleep, & Supplement Hacks.mp4 | 449 MB |
| Week 5 - Hacking Your Motivation- How to reprogram yourself to reach goals faster and easier!.mp4 | 458 MB |
| Week 6 - How To Strategically Eat More To Maximize Fat Loss And How To Use Fatigue.mp4 | 321 MB |
| Week 7 - My Ultimate Motivation Hack & How to Gain Godlike Focus On The Things That Truly Matter.mp4 | 453 MB |
| Week 8 - How To Perform Even Better In The Next 50 Days And Smash Your 100th Day Physique (S3).mp4 | 488 MB |
| Week 9 - Your 5-Week Challenge and My Master Plan to Conquer the World.mp4 | 274 MB |
| Week 10 - The Invisible Force Preventing You From Reaching Your Full Potential.mp4 | 223 MB |
| Week 12 - 40 Fitness Facts That Will Shock You, Amaze You and Destroy The Myths You Still Think Are True.mp4 | 534 MB |
| Week 13 - Bulk & Cut Masterclass Pt. 1.mp4 | 361 MB |
| Week 14 - Bulk & Cut Masterclass Pt. 2.mp4 | 496 MB |
| Week 15 - How to avoid this type of diet that delays your progress by over a year & makes it 100x harder for you to lose weight.mp4 | 570 MB |

A second copy of the Week 2 video ("1. The Simplified Workout, Nutrition, Cardio, and Supplementation Program.mp4",
same size) sits in another folder. No Week 11 video was found in the folder.

---

## 3. How the Workout Builders work

### 3.1 Tabs (the same 11 in all five builders)

Welcome! · Warm Ups · Starting Weights · Logging Workouts · Rules · 2xWeek · 3xWeek · 4xWeek · 5xWeek · Exercise
Directory · (IGNORE) Exercise Instructions. The last tab holds text fragments that the formulas glue together with
each exercise's numbers to write the progression instruction under every exercise.

### 3.2 Inputs

| Input | How the sheet takes it | Notes |
|---|---|---|
| Sex | Choose the Men's or the Women's file | The Women's file differs only in its 3x and 4x templates, two main-lift targets and one extra exercise (§3.8). |
| Days per week | Choose a tab: 2x, 3x, 4x or 5x | It recommends 3 or 4 days, 2 for a busy week, 5 only for experienced people who like being in the gym almost daily. If you switch tabs mid-block, carry on at the same week number. Pick what you can do consistently. |
| Equipment | One dropdown per movement slot (Program Setup, column C) | Each slot's list mixes barbell, dumbbell, Smith, machine, cable, band and a few bodyweight options. Picking one changes the reps and the instruction text automatically. There is **no global switch** like "I only have dumbbells". The Welcome tab says the defaults are the home version (bands and dumbbells), but the shipped defaults are mixed: the 3x tab leans to bands and dumbbells, while the 2x, 4x and 5x tabs are mostly gym. |
| Experience | Not an input | Only advice: the 5-day tab is for experienced people, the photoshoot routine is not for beginners, and week 1 should leave 2–3 reps in reserve. |
| Goal (cut/bulk) | Not an input | The Rules tab mentions a "cutting period" (steps). Calories live in the separate habit tracker and the Bulk/Cut planner. |
| Units | Not an input | Progression is written in lb (add or remove 5–10 lb). The Bulk/Cut planner accepts kg or lb. |
| Loads and reps done | Not tracked in the sheet | They are logged in the Strong app (D-Code: any tracker, such as Hevy or Strong). |

### 3.3 Outputs

For each training day of the chosen tab, six blocks side by side: Week 1, 2, 3, 4, 5 and Deload. Each block lists
Exercise / Sets / Reps / Rest, with an auto-written instruction under each exercise (the rule from §3.6 with that
exercise's numbers). Column D "Video Instructions" shows "Watch Here", a hyperlink looked up from the directory
(youtube.com / youtu.be).

### 3.4 Split templates

The slot label (column B) names the movement; the slot's dropdown is its substitution group. Men's v3.01, v3.02,
Day-2-Day and D-Code all use the same slots and differ only in their default picks.

| Days | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|---|---|---|---|---|---|
| 2x | Horizontal Push, Horizontal Pull, Quads, Hamstrings/Glutes, Shoulders, Abs | Squat, Hip Hinge, Vertical Pull, Chest, Shoulders, Abs | | | |
| 3x | Incline Push, Quads, Horizontal Pull, Shoulders, Triceps, Biceps | Squat, Vertical Push, Vertical Pull, Hamstrings/Glutes, Abs, Calves | Hip Hinge, Horizontal Pull, Chest, Biceps, Triceps, Abs | | |
| 4x | Incline Push, Horizontal Pull, Chest, Triceps, Biceps | Squat, Hamstrings/Glutes, Vertical Pull, Shoulders, Abs | Horizontal Push, Horizontal Pull, Vertical Push, Biceps, Triceps | Hip Hinge, Quads, Shoulders, Calves, Abs | |
| 5x | Incline Push, Vertical Push, Chest, Shoulders, Triceps | Horizontal Pull, Vertical Pull, Shoulders, Biceps, Abs | Squat, Hamstrings/Glutes, Quads, Calves, Shrugs | Horizontal Push, Vertical Pull, Horizontal Pull, Biceps, Triceps | Hip Hinge, Quads, Hamstrings/Glutes, Calves, Abs |

Women's v3.01 uses the same 2x and 5x slots. Its 3x and 4x are different:

| Days | Day 1 | Day 2 | Day 3 | Day 4 |
|---|---|---|---|---|
| 3x | Hip Hinge, Quads, Horizontal Push, Horizontal Pull, Biceps, Abs | Squat, Hamstrings/Glutes, Vertical Pull, Vertical Push, Triceps, Abs | Quads, Hamstrings/Glutes, Horizontal Pull, Chest, Shoulders, Abs | |
| 4x | Horizontal Push, Horizontal Pull, Vertical Pull, Triceps, Biceps | Squat, Hamstrings/Glutes, Quads, Shoulders, Abs | Vertical Pull, Vertical Push, Horizontal Pull, Biceps, Triceps | Hip Hinge, Quads, Hamstrings/Glutes, Shoulders, Abs |

In short: 2x is two full-body days; 3x is three full-body days; 4x is roughly upper/lower (the men's lower days also
carry a pull or shoulder slot); 5x is push / pull / legs / upper / lower. The first one or two slots of each day are
the big compound lifts. Every slot, its default pick and its numbers are in Appendix A.

### 3.5 Sets, rest and the 6-week block

- **Week 1:** 2 working sets of every exercise.
- **Weeks 2–3:** 3 sets.
- **Weeks 4–5:** 4 sets for each day's priority slots (usually the first one or two compounds, plus some accessories,
  e.g. chest flyes, lateral raises, leg extensions), 3 for the rest. One exception: Men's 3x Day 1 biceps and triceps
  go 2-2-3-3-3.
- **Week 6, deload:** 2 sets of every exercise, half the week-5 reps, **the same weight as week 5**.
- **Rest:** 2–3 min for compounds, 1–2 min for isolation, abs and calves (a few cells differ, e.g. some accessories
  show 2–3 min in weeks 2–5 of Men's 3x).
- Then you repeat the block. There is no "block 2" tab, and no rule for raising the base weights between blocks
  other than the weekly rules below.
- The weekly action items place a hard "overreach" week before the deload and allow postponing the deload while you
  still feel fresh (§5).

### 3.6 Rep targets and progression rules

**Rep target of the picked exercise.** A day's main slot (its first push, squat or hinge slot) uses a fixed target:

| Exercise in a main slot | Target reps |
|---|---|
| Flat Bench Press (Barbell or Smith), Incline Bench Press (Barbell or Smith), Squat (Barbell or Smith), Deadlift (Barbell), Sumo Deadlift (Barbell) | 6 |
| Flat Bench Press (Dumbbell), Chest Press (Machine), Incline Bench Press (Dumbbell), Incline Chest Press (Machine), Romanian Deadlift (Barbell) | 8 |
| Romanian Deadlift (Dumbbell) | 10 |
| Decline Push Ups | 15–25+ |
| Women's only: 3x Day 2 Squat (Barbell or Smith) | 8 |
| Women's only: 4x Day 1 Flat Bench (Barbell or Smith) / (Dumbbell or Machine) | 8 / 10 |

Every other slot uses the exercise's directory range (min–max) from the table in §4.

**The five rules** (written out under each exercise; paraphrased). The codes are used in the §4 table:

- **F, fixed-target main lift:** do the target reps on every set and take the last set to failure or close to it.
  If the last set reaches target + 2 (target + 3 for Flat Bench Press (Dumbbell) on the 4x and 5x tabs), add 5–10 lb
  next week. If any set falls short of the target, take off 5–10 lb.
- **D, double progression (accessories):** do up to the top of the range on each set, stopping 1–2 reps short of
  failure. When every set reaches the top, add 5–10 lb next week. If any set falls below the bottom, take off 5–10 lb.
- **B, bands:** take every set to failure or close to it. 20–25 reps on all sets: use a heavier band next week.
  15–20 reps: keep the same band.
- **AS, assisted pull-ups/chin-ups:** like D, but you progress by taking 5–10 lb of assistance away when every set
  reaches the top, and add assistance if a set falls below the range.
- **BW, bodyweight pushes (Push Ups, Kneeling Push Ups, Decline Push Ups, Dips):** take every set to failure or close
  to it. 15–20+ reps on all sets: add 5–10 lb next week (i.e. go weighted). 10–15 reps: stay as you are.

General rules from the Rules tab: in week 1, choose loads that leave 2–3 reps in reserve on every set, then progress.
v3.02 adds one rule: train close to failure on every set, and/or to failure on the last working set.

### 3.7 Warm-up, starting weights and logging (shared tabs)

- **Warm-up:** 5–10 min of easy cardio (walk or slow jog), then a mobility circuit for 2–3 rounds: arm circles 10–15,
  side-to-side arm swings 10–15, wall slides 10–15, front-to-back leg swings 10–15 per leg, side-to-side leg swings
  10–15 per leg, standing glute squeeze 10–15, plank 15–20 s (each links to a YouTube demo). Then ramp-up sets before
  each exercise, lighter and higher-rep first. Their example for a 100 lb working weight: 50 lb × 6, 75 lb × 4,
  90 lb × 2. Heavy squats and deadlifts may need 3–5 warm-up sets; curls and lateral raises 0–1.
- **Starting weights:** guess on the light side and adjust from set to set by how many reps you had left. It can take
  2–3 sessions to find your real working weights.
- **Logging:** the Strong app (Kaizen); D-Code says any tracker, such as Hevy or Strong.

### 3.8 Differences between the builders

**Men's v3.01 vs Women's v3.01** (everything not listed is identical: tab texts, rules, set scheme, rest,
progression rules, deload, rep ranges):

1. Different 3x and 4x templates (§3.4). The women's versions have more lower-body slots and drop calves: 3x has 6
   lower-body slots a week vs the men's 4 plus calves, and 4x has 6 vs 4 plus calves. Women's 3x and 4x have no
   Incline Push slot, and Women's 4x has no Chest slot but two Vertical Pull slots.
2. Two main-lift targets: Squat is 8 (not 6) on 3x Day 2; Flat Bench is 8 for barbell/Smith and 10 for
   dumbbell/machine (not 6/8) on 4x Day 1.
3. The directory adds **Glute Kickback** (12–15), but no dropdown offers it, so it can never be picked.
4. Because Glute Kickback was inserted, the Women's 5x dropdowns are off by one row: each list includes a wrong
   neighbouring exercise and loses its last valid one (for example, the Shoulders list shows Weighted Step Ups and
   loses Upright Row (Dumbbell)).
5. Different saved picks (e.g. 2x Day 1 uses Push Ups; more assisted pull-ups and band exercises).

**Men's v3.02 vs v3.01** (template slots, set scheme, rest, progression rules and deload are unchanged):

1. Rules tab: adds the near-failure rule (§3.6).
2. Directory grows from 130 to 150 rows and gains an "Updated/Old" column (marking rows whose ranges were revised;
   it is not a difficulty level).
3. New exercises: Dumbbell Ab Crunch, Preacher Curl Machine, Inclined DB Bicep Curl, Facing Away Cable Curl, Seated
   Calf Raise, Lying Hamstring Curl, Seated Hamstring Curl, Hip Thrusts (Smith Machine), Booty Builder, Plate Loaded
   Upper Back Row, Db Chest Supported Upper Back Row, Unilateral Cable Row, Pendulum Squat, Heel Elevated Smith
   Machine Squat, Leg Press (Quad Bias), Leg Press (Glute Bias), Overhead Extensions (Dumbbell), Cross Cable Tricep
   Extension, DB Skull Crusher, Katana Extensions, Dual Rope Tricep Extension, Single Arm Lat Pulldown (listed twice,
   as "Pull Down" 8–12 and "Pulldown" 10–15), D-Handle Lat Pulldown.
4. Renamed: Seated Row (Cables) → Seated Row (Cable), Shrugs → Shrugs (Dumbbell), Lateral Raises (Cables) → Y Lateral
   Raises (Cables), Lateral Raises (Bands) → Lying Lateral Raises (Bands). Dropped from the directory: Leg Curl
   (Machine), Rope Pull Through (Cables), Lying Tricep Extensions (Dumbbell), and the Quads-category row of Split
   Squats.
5. Revised ranges (v3.01 → v3.02), for example: Ab Machine 12–15 → 10–20; Lateral Raises (Dumbbell) 12–20 → 8–12;
   Rear Delt Fly (Dumbbell) 12–20 → 8–12, (Cables) 15–20 → 10–15, (Machine) 15–20 → 10–12; Calf Raise on Leg Press
   18–25 → 10–15; Leg Extension (Machine) 12–15 → 10–12; Chest Press (Machine) 8–10 → 8–12; Bicep Curl (Cables)
   12–15 → 10–12; Concentration and Preacher (Dumbbell) curls 10–15 → 10–12; Seated Row (Cable) 8–10 (was Cables
   10–15); Split Squats 12–15 → 10–12; and in the Squat category Goblet Squat 10–15 → 10–12 and Bulgarian Split
   Squat 12–15 → 10–12. Full list in §4.
6. The 3x tab's dropdowns were rebuilt with the new names, but the 2x and 5x tabs still offer five removed names,
   which would break the lookups if picked (marked † in §4).
7. New default picks (Pendulum Squat, Y Lateral Raises, Smith squat, Single Arm Lat Pulldown, Decline Push Ups, Dips,
   Seated Calf Raise, Db Chest Supported Upper Back Row, Overhead Extensions, Dumbbell Ab Crunch, Seated Hamstring
   Curl, and others; see the v3.02 notes under Appendix A).

**Day-2-Day Workout Builder** (created 2026-04-07): a Men's copy that sits between v3.01 and v3.02. It has the v3.01
tabs, texts and rules (without v3.02's near-failure rule) and the v3.01 directory, plus one row, Single Arm Lat
Pulldown (10–15), and the "Old/Updated" column (only Lat Pulldown and Single Arm Lat Pulldown are marked Updated).
Its dropdown ranges were re-pointed for the extra row. Otherwise only the picks differ: 3x uses Decline Push Ups,
Weighted Lunges, Lying Tricep Extensions (Dumbbell), Bicep Curl (Dumbbell), Squat (Barbell), Shoulder Press
(Dumbbell) and Lat Pulldown; 4x Day 1 uses Bicep Curl (Cables). The file does not explain the name.

**D-Code Workout Builder v1.0**: a de-branded copy of Men's v3.01. It has the same 130-row directory, dropdowns,
formulas and progression texts. The layout moved up a few rows; the Welcome tab has no walkthrough video; the Rules
tab is titled "Workout Rules" rather than "Kaizen's Workout Rules"; the logging tab allows any tracker (Hevy or
Strong). Its picks lean to gym equipment (e.g. 3x: Leg Extension (Machine), Squat (Barbell), Lat Pulldown, Romanian
Deadlift (Dumbbell), Calf Raise on Leg Press Machine, Deadlift (Barbell), Seated Row (Cables); 4x: Bent Over Row
(Barbell), Flat Bench Press (Barbell) in the Chest slot). It looks like the owner's own branded version (to confirm).

### 3.9 Quirks and bugs in the sheets (don't copy them)

- The formulas check for "Split Squat (Bands)", but the exercise is called "Split Squats (Bands)", so the band rule
  never triggers in Squat slots.
- Assisted Neutral Grip Pullup is missing from the assisted-rule check, so it gets the "add 5–10 lb" text (rule
  marked D* in §4).
- On the 4x tab, the Day 4 Shoulders slot gives band shoulder exercises the bodyweight rule instead of the band
  rule. On the 5x tab, the instruction under Day 4's Horizontal Pull is computed from Day 3's Quads pick, so with
  the defaults it says "up to 15 reps" for a row whose range is 8–12.
- Men's 5x Day 5 shows Leg Press 10–15, Leg Curl 8–12 and Calf Raise 12–15, which don't match the directory ranges
  (8–10, 12–15, 18–25). These cells were typed in by hand.
- The Women's 5x dropdowns are off by one row, and Glute Kickback can never be picked (§3.8). v3.02 has stale names
  and the duplicate Single Arm Lat Pulldown row (§3.8).
- The bodyweight rule says to add 5–10 lb to push-ups and dips, which means using a vest or plate. There is no
  harder-variation ladder for bodyweight work (e.g. knee → full → decline push-ups).

---

## 4. The exercise library as data

**Coverage:** 135 rows, the union of the five directories plus names that only appear in dropdowns. That is 132
distinct exercises once the three pure renames are merged (Seated Row (Cables)/(Cable), Shrugs/Shrugs (Dumbbell),
Single Arm Lat Pull Down/Pulldown). By equipment, roughly: 18 band, 12 bodyweight, 26 dumbbell, 15 barbell, 6 Smith
machine, 30 cable, 28 machine or other. About 56 work at home with bands, dumbbells or bodyweight.

**Columns:**

- *Primary muscle(s), Pattern, Equipment*: my annotation. The sheets only give a body-part category; the equipment
  mostly comes from the name's suffix.
- *Directory category*: the sheet's own column A. An exercise can sit in two categories (e.g. Quads and Squat).
- *Substitution group(s)*: the movement slots whose dropdown offers the exercise, i.e. what the sheets let you swap
  between. The Women's 5x off-by-one artefacts are excluded.
- *Rep range*: the directory's min–max; "(v3.02: …)" where v3.02 differs; "25+" means "to failure, 25 or more".
- *Rule*: F/D = fixed target in a main slot, double progression elsewhere; D, B, AS, BW as in §3.6; D* = a sheet bug
  (should be AS).
- *Builders*: M1 = Men's v3.01, W = Women's v3.01, DD = Day-2-Day, DC = D-Code, M2 = Men's v3.02; "all 5" = all of
  them; † = offered in a v3.02 dropdown but missing from v3.02's directory.
- *v3.02 flag*: the Updated/Old column.
- **Difficulty/level is not given by any sheet.**
- **Video/demo links:** every directory row has a "Watch Here" HYPERLINK column (column C, URL in column E). The
  domains are youtube.com and youtu.be; the links themselves are not copied here.

| # | Exercise | Primary muscle(s) | Pattern | Equipment | Directory category | Substitution group(s) (slot dropdowns) | Rep range (directory) | Rule | Builders | v3.02 flag |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Ab Machine | Abs | core | Machine | Abs | Abs | 12-15 (v3.02: 10-20) | D | all 5 | Updated |
| 2 | Assisted Chinup (Bands) | Lats, biceps | pull vertical | Pull-up bar + band | Vertical Pull | Vertical Pull | 8-12 | AS | all 5 | Old |
| 3 | Assisted Chinup (Machine) | Lats, biceps | pull vertical | Assisted pull-up machine | Vertical Pull | Vertical Pull | 8-12 | AS | all 5 | Old |
| 4 | Assisted Neutral Grip Pullup | Lats, biceps | pull vertical | Assisted pull-up machine or band | Vertical Pull | Vertical Pull | 8-12 | D* | all 5 | Updated |
| 5 | Assisted Pullup (Bands) | Lats, upper back | pull vertical | Pull-up bar + band | Vertical Pull | Vertical Pull | 8-12 | AS | all 5 | Old |
| 6 | Assisted Pullup (Machine) | Lats, upper back | pull vertical | Assisted pull-up machine | Vertical Pull | Vertical Pull | 8-12 | AS | all 5 | Old |
| 7 | Bent Over Row (Barbell) | Lats, upper back, rear delts, biceps | pull horizontal | Barbell | Horizontal Pull | Horizontal Pull | 8-10 | D | all 5 | Updated |
| 8 | Bent Over Row (Dumbbell) | Lats, upper back, rear delts, biceps | pull horizontal | Dumbbell | Horizontal Pull | Horizontal Pull | 8-12 | D | all 5 | Updated |
| 9 | Bent Over Row (Smith Machine) | Lats, upper back, rear delts, biceps | pull horizontal | Smith machine | Horizontal Pull | Horizontal Pull | 8-10 | D | all 5 | Updated |
| 10 | Bicep Curl (Bands) | Biceps | isolation | Band | Biceps | Biceps | 15-25+ | B | all 5 | Old |
| 11 | Bicep Curl (Barbell) | Biceps | isolation | Barbell | Biceps | Biceps | 12-15 | D | all 5 | Old |
| 12 | Bicep Curl (Cables) | Biceps | isolation | Cable | Biceps | Biceps | 12-15 (v3.02: 10-12) | D | all 5 | Updated |
| 13 | Bicep Curl (Dumbbell) | Biceps | isolation | Dumbbell | Biceps | Biceps | 10-15 | D | all 5 | Old |
| 14 | Bicep Curl (Machine) | Biceps | isolation | Machine | Biceps | Biceps | 12-15 | D | all 5 | Old |
| 15 | Booty Builder | Glutes | hinge (hip thrust) | Machine (hip-thrust machine) | Hamstrings / Glutes | Hamstrings / Glutes | 8-12 | D | M2 | Updated |
| 16 | Bulgarian Split Squat | Quads, glutes | lunge | Dumbbell + bench (or bodyweight) | Quads; Squat | Quads; Squat | 12-15 (v3.02: 12-15 / 10-12) | D | all 5 | Updated |
| 17 | Cable Crunch | Abs | core | Cable | Abs | Abs | 12-15 | D | all 5 | Updated |
| 18 | Cable Twists (Down Up) | Obliques, abs | core (rotation) | Cable | Abs | Abs | 12-15 | D | all 5 | Old |
| 19 | Cable Twists (Up Down) | Obliques, abs | core (rotation) | Cable | Abs | Abs | 12-15 | D | all 5 | Old |
| 20 | Calf Raise on Leg Press Machine | Calves | isolation | Leg press machine | Calves | Calves | 18-25 (v3.02: 10-15) | D | all 5 | Updated |
| 21 | Chest Flyes (Bands) | Chest | isolation | Band | Chest | Chest | 15-25+ | B | all 5 | Old |
| 22 | Chest Flyes (Cables) | Chest | isolation | Cable | Chest | Chest | 15-20 | D | all 5 | Old |
| 23 | Chest Flyes (Dumbbell) | Chest | isolation | Dumbbell + bench | Chest | Chest | 12-20 | D | all 5 | Old |
| 24 | Chest Press (Machine) | Chest, front delts, triceps | push horizontal | Machine | Chest; Horizontal Push | Chest; Horizontal Push | 8-10 (v3.02: 8-12) | F/D | all 5 | Updated |
| 25 | Chinup | Lats, biceps | pull vertical | Pull-up bar (bodyweight) | Vertical Pull | Vertical Pull | 7-10 | D | all 5 | Old |
| 26 | Concentration Curl (Dumbbell) | Biceps | isolation | Dumbbell | Biceps | Biceps | 10-15 (v3.02: 10-12) | D | all 5 | Updated |
| 27 | Cross Cable Tricep Extension | Triceps | isolation | Cable | Triceps | Triceps | 10-12 | D | M2 | Updated |
| 28 | D-Handle Lat Pulldown | Lats | pull vertical | Cable (D-handle) | Vertical Pull | Vertical Pull | 8-10 | D | M2 | Updated |
| 29 | DB Skull Crusher | Triceps | isolation | Dumbbell + bench | Triceps | Triceps | 10-15 | D | M2 | Updated |
| 30 | Db Chest Supported Upper Back Row | Upper back, rear delts | pull horizontal | Dumbbell + incline bench | Horizontal Pull | Horizontal Pull | 8-12 | D | M2 | Updated |
| 31 | Deadlift (Bands) | Glutes, hamstrings, back | hinge | Band | Hip Hinge | Hip Hinge | 15-25+ | B | all 5 | Old |
| 32 | Deadlift (Barbell) | Glutes, hamstrings, back, traps, grip | hinge | Barbell | Hip Hinge | Hip Hinge | 8-10 | F/D | all 5 | Updated |
| 33 | Decline Push Ups | Upper chest, front delts, triceps | push horizontal (incline slot) | Bodyweight + step/bench | Incline Push | Incline Push | 10-20 | BW | all 5 | Old |
| 34 | Dips | Chest, triceps, front delts | push (dip; sheet files it as horizontal push / chest) | Dip bars (bodyweight) | Chest; Horizontal Push | Chest; Horizontal Push | 10-20 (v3.02: 10-12 / 10-20) | BW | all 5 | Old |
| 35 | Dual Rope Tricep Extension | Triceps | isolation | Cable (two ropes) | Triceps | Triceps | 10-12 | D | M2 | Updated |
| 36 | Dumbbell Ab Crunch | Abs | core | Dumbbell | Abs | Abs | 15-20 | D | M2 | Updated |
| 37 | Facing Away Cable Curl | Biceps (long head) | isolation | Cable | Biceps | Biceps | 10-12 | D | M2 | Updated |
| 38 | Flat Bench Press (Barbell) | Chest, front delts, triceps | push horizontal | Barbell + bench | Chest; Horizontal Push | Chest; Horizontal Push | 8-10 | F/D | all 5 | Old |
| 39 | Flat Bench Press (Dumbbell) | Chest, front delts, triceps | push horizontal | Dumbbell + bench | Chest; Horizontal Push | Chest; Horizontal Push | 8-12 | F/D | all 5 | Updated |
| 40 | Flat Bench Press (Smith Machine) | Chest, front delts, triceps | push horizontal | Smith machine + bench | Chest; Horizontal Push | Chest; Horizontal Push | 8-10 | F/D | all 5 | Updated |
| 41 | Front Squat (Barbell) | Quads, glutes, upper back | squat | Barbell + rack | Quads; Squat | Quads; Squat | 8-10 | D | all 5 | Old |
| 42 | Glute Kickback | Glutes | isolation | Cable or machine (not specified) | Hamstrings / Glutes | (none: not offered in any dropdown) | 12-15 | D | W |  |
| 43 | Goblet Squat | Quads, glutes | squat | Dumbbell or kettlebell | Quads; Squat | Quads; Squat | 10-15 (v3.02: 10-15 / 10-12) | D | all 5 | Updated |
| 44 | Good Morning (Barbell) | Hamstrings, glutes, spinal erectors | hinge | Barbell | Hamstrings / Glutes; Hip Hinge | Hamstrings / Glutes; Hip Hinge | 10-12 | D | all 5 | Old |
| 45 | Hammer Curl (Dumbbell) | Brachialis, brachioradialis, biceps | isolation | Dumbbell | Biceps | Biceps | 12-15 | D | all 5 | Updated |
| 46 | Hanging Knee Raise | Abs, hip flexors | core | Pull-up bar (bodyweight) | Abs | Abs | 10-15 | D | all 5 | Updated |
| 47 | Heel Elevated Smith Machine Squat | Quads | squat | Smith machine + heel wedge | Quads | Quads | 8-10 | D | M2 | Updated |
| 48 | Hip Thrusts (Bands) | Glutes | hinge (hip thrust) | Band (bodyweight) | Hamstrings / Glutes; Hip Hinge | Hamstrings / Glutes; Hip Hinge | 15-25+ | B | all 5 | Old |
| 49 | Hip Thrusts (Barbell) | Glutes, hamstrings | hinge (hip thrust) | Barbell + bench | Hamstrings / Glutes; Hip Hinge | Hamstrings / Glutes; Hip Hinge | 8-12 | D | all 5 | Updated |
| 50 | Hip Thrusts (Smith Machine) | Glutes, hamstrings | hinge (hip thrust) | Smith machine + bench | Hamstrings / Glutes | Hamstrings / Glutes | 8-10 | D | M2 | Updated |
| 51 | Incline Bench Press (Barbell) | Upper chest, front delts, triceps | push horizontal (incline) | Barbell + incline bench | Incline Push | Incline Push | 8-10 | F/D | all 5 | Updated |
| 52 | Incline Bench Press (Dumbbell) | Upper chest, front delts, triceps | push horizontal (incline) | Dumbbell + incline bench | Incline Push | Incline Push | 8-12 | F/D | all 5 | Updated |
| 53 | Incline Bench Press (Smith Machine) | Upper chest, front delts, triceps | push horizontal (incline) | Smith machine + incline bench | Incline Push | Incline Push | 8-10 | F/D | all 5 | Updated |
| 54 | Incline Chest Press (Machine) | Upper chest, front delts, triceps | push horizontal (incline) | Machine | Incline Push | Incline Push | 8-10 | F/D | all 5 | Updated |
| 55 | Inclined DB Bicep Curl | Biceps (long head) | isolation | Dumbbell + incline bench | Biceps | Biceps | 10-12 | D | M2 | Updated |
| 56 | Katana Extensions | Triceps (long head) | isolation | Cable | Triceps | Triceps | 10-12 | D | M2 | Updated |
| 57 | Kneeling Push Ups | Chest, triceps, front delts | push horizontal | Bodyweight | Chest; Horizontal Push | Chest; Horizontal Push | 10-20+ | BW | all 5 | Old |
| 58 | Lat Pulldown | Lats, upper back, biceps | pull vertical | Cable / pulldown machine | Vertical Pull | Vertical Pull | 10-15 | D | all 5 | Updated |
| 59 | Lat Pulldown (Bands) | Lats, upper back | pull vertical | Band (anchored high) | Vertical Pull | Vertical Pull | 15-25+ | B | all 5 | Old |
| 60 | Lateral Raises (Bands) | Side delts | isolation | Band | Shoulders | Shoulders | 15-25+ | B | M1, W, DD, DC, M2† |  |
| 61 | Lateral Raises (Cables) | Side delts | isolation | Cable | Shoulders | Shoulders | 15-20 | D | M1, W, DD, DC, M2† |  |
| 62 | Lateral Raises (Dumbbell) | Side delts | isolation | Dumbbell | Shoulders | Shoulders | 12-20 (v3.02: 8-12) | D | all 5 | Updated |
| 63 | Leg Curl (Bands) | Hamstrings | isolation | Band | Hamstrings / Glutes | Hamstrings / Glutes | 15-25+ | B | all 5 | Old |
| 64 | Leg Curl (Machine) | Hamstrings | isolation | Machine | Hamstrings / Glutes | Hamstrings / Glutes | 12-15 | D | M1, W, DD, DC, M2† |  |
| 65 | Leg Extension (Bands) | Quads | isolation | Band | Quads | Quads | 15-25+ | B | all 5 | Old |
| 66 | Leg Extension (Machine) | Quads | isolation | Machine | Quads | Quads | 12-15 (v3.02: 10-12) | D | all 5 | Updated |
| 67 | Leg Press (Glute Bias) | Glutes, quads | squat | Leg press machine | Squat | Squat | 8-10 | D | M2 | Updated |
| 68 | Leg Press (Machine) | Quads, glutes | squat | Leg press machine | Quads; Squat | Quads; Squat | 8-10 | D | all 5 | Updated |
| 69 | Leg Press (Quad Bias) | Quads | squat | Leg press machine | Squat | Quads; Squat | 8-10 | D | M2 | Updated |
| 70 | Lying Hamstring Curl | Hamstrings | isolation | Machine | Hamstrings / Glutes | Hamstrings / Glutes | 12-15 | D | M2 | Updated |
| 71 | Lying Lateral Raises (Bands) | Side delts | isolation | Band | Shoulders | Shoulders | 15-25+ | B | M2 | Updated |
| 72 | Lying Leg Curl (Cables) | Hamstrings | isolation | Cable (ankle strap) | Hamstrings / Glutes | Hamstrings / Glutes | 12-15 | D | all 5 | Old |
| 73 | Lying Leg Raise | Lower abs, hip flexors | core | Bodyweight (floor/bench) | Abs | Abs | 15-25 | D | all 5 | Old |
| 74 | Lying Tricep Extensions (Barbell) | Triceps | isolation | Barbell (EZ bar) + bench | Triceps | Triceps | 12-15 | D | all 5 | Updated |
| 75 | Lying Tricep Extensions (Dumbbell) | Triceps | isolation | Dumbbell + bench | Triceps | Triceps | 10-15 | D | M1, W, DD, DC, M2† |  |
| 76 | Neutral Grip Pulldown | Lats, biceps | pull vertical | Cable / pulldown machine | Vertical Pull | Vertical Pull | 10-15 | D | all 5 | Old |
| 77 | Neutral Grip Pullup | Lats, biceps | pull vertical | Pull-up bar (bodyweight) | Vertical Pull | Vertical Pull | 7-10 | D | all 5 | Old |
| 78 | Overhead Extensions (Dumbbell) | Triceps (long head) | isolation | Dumbbell | Triceps | Triceps | 10-15 | D | M2 | Updated |
| 79 | Pendulum Squat | Quads, glutes | squat | Machine (pendulum squat) | Quads; Squat | Quads; Squat | 10-12 / 8-10 | D | M2 | Updated |
| 80 | Plate Loaded Upper Back Row | Upper back, rear delts, lats | pull horizontal | Machine (plate-loaded) | Horizontal Pull | Horizontal Pull | 8-10 | D | M2 | Updated |
| 81 | Preacher Curl (Barbell) | Biceps | isolation | Barbell (EZ bar) + preacher bench | Biceps | Biceps | 12-15 | D | all 5 | Old |
| 82 | Preacher Curl (Dumbbell) | Biceps | isolation | Dumbbell + preacher bench | Biceps | Biceps | 10-15 (v3.02: 10-12) | D | all 5 | Updated |
| 83 | Preacher Curl Machine | Biceps | isolation | Machine | Biceps | Biceps | 10-12 | D | M2 | Updated |
| 84 | Pullup | Lats, upper back | pull vertical | Pull-up bar (bodyweight) | Vertical Pull | Vertical Pull | 7-10 | D | all 5 | Old |
| 85 | Push Ups | Chest, triceps, front delts | push horizontal | Bodyweight | Chest; Horizontal Push | Chest; Horizontal Push | 10-20+ | BW | all 5 | Old |
| 86 | Rear Delt Fly (Bands) | Rear delts, upper back | isolation | Band | Shoulders | Shoulders | 15-25+ | B | all 5 | Old |
| 87 | Rear Delt Fly (Cables) | Rear delts, upper back | isolation | Cable | Shoulders | Shoulders | 15-20 (v3.02: 10-15) | D | all 5 | Updated |
| 88 | Rear Delt Fly (Dumbbell) | Rear delts, upper back | isolation | Dumbbell | Shoulders | Shoulders | 12-20 (v3.02: 8-12) | D | all 5 | Updated |
| 89 | Rear Delt Fly (Machine) | Rear delts, upper back | isolation | Machine (reverse pec deck) | Shoulders | Shoulders | 15-20 (v3.02: 10-12) | D | all 5 | Updated |
| 90 | Romanian Deadlift (Barbell) | Hamstrings, glutes, spinal erectors | hinge | Barbell | Hamstrings / Glutes; Hip Hinge | Hamstrings / Glutes; Hip Hinge | 8-10 | F/D | all 5 | Updated |
| 91 | Romanian Deadlift (Dumbbell) | Hamstrings, glutes, spinal erectors | hinge | Dumbbell | Hamstrings / Glutes; Hip Hinge | Hamstrings / Glutes; Hip Hinge | 8-12 | F/D | all 5 | Updated |
| 92 | Rope Curl (Cables) | Brachialis, biceps | isolation | Cable (rope) | Biceps | Biceps | 12-15 | D | all 5 | Old |
| 93 | Rope Pull Through (Cables) | Glutes, hamstrings | hinge | Cable (rope) | Hamstrings / Glutes | Hamstrings / Glutes | 10-15 | D | M1, W, DD, DC, M2† |  |
| 94 | Seated Calf Raise | Calves (soleus) | isolation | Machine | Calves | Calves | 10-15 | D | M2 | Updated |
| 95 | Seated Hamstring Curl | Hamstrings | isolation | Machine | Hamstrings / Glutes | Hamstrings / Glutes | 8-12 | D | M2 | Updated |
| 96 | Seated Row (Bands) | Lats, upper back, biceps | pull horizontal | Band | Horizontal Pull | Horizontal Pull | 15-25+ | B | all 5 | Old |
| 97 | Seated Row (Cable) | Lats, upper back, biceps | pull horizontal | Cable | Horizontal Pull | Horizontal Pull | 8-10 | D | M2 | Updated |
| 98 | Seated Row (Cables) | Lats, upper back, biceps | pull horizontal | Cable | Horizontal Pull | Horizontal Pull | 10-15 | D | M1, W, DD, DC |  |
| 99 | Seated Row (Machine) | Lats, upper back, biceps | pull horizontal | Machine | Horizontal Pull | Horizontal Pull | 10-15 | D | all 5 | Old |
| 100 | Shoulder Press (Bands) | Front/side delts, triceps | push vertical | Band | Vertical Push | Vertical Push | 15-25+ | B | all 5 | Old |
| 101 | Shoulder Press (Barbell) | Front/side delts, triceps | push vertical | Barbell | Vertical Push | Vertical Push | 8-10 | D | all 5 | Old |
| 102 | Shoulder Press (Dumbbell) | Front/side delts, triceps | push vertical | Dumbbell | Vertical Push | Vertical Push | 8-12 | D | all 5 | Updated |
| 103 | Shoulder Press (Machine) | Front/side delts, triceps | push vertical | Machine | Vertical Push | Vertical Push | 8-10 | D | all 5 | Updated |
| 104 | Shrugs | Upper traps | isolation | Dumbbell (renamed in v3.02) | Traps | Shrugs | 10-15 | D | M1, W, DD, DC |  |
| 105 | Shrugs (Bands) | Upper traps | isolation | Band | Traps | Shrugs | 15-25+ | B | all 5 | Old |
| 106 | Shrugs (Dumbbell) | Upper traps | isolation | Dumbbell | Traps | Shrugs | 10-15 | D | M2 | Old |
| 107 | Single Arm Lat Pull Down | Lats | pull vertical | Cable | Vertical Pull | Vertical Pull | 8-12 | D | M2 | Updated |
| 108 | Single Arm Lat Pulldown | Lats | pull vertical | Cable | Vertical Pull | Vertical Pull | 10-15 | D | DD, M2 | Updated |
| 109 | Single Leg Deadlift | Hamstrings, glutes (balance) | hinge (single leg) | Dumbbell or bodyweight | Hamstrings / Glutes; Hip Hinge | Hamstrings / Glutes; Hip Hinge | 12-15 | D | all 5 | Old |
| 110 | Single Leg Deadlift (Bands) | Hamstrings, glutes (balance) | hinge (single leg) | Band | Hamstrings / Glutes; Hip Hinge | Hamstrings / Glutes; Hip Hinge | 15-25+ | B | all 5 | Old |
| 111 | Single Leg Hip Thrust (Bands) | Glutes | hinge (hip thrust) | Band (bodyweight) | Hamstrings / Glutes | Hamstrings / Glutes | 15-25+ | B | all 5 | Old |
| 112 | Single Leg Hip Thrust (Dumbbell) | Glutes | hinge (hip thrust) | Dumbbell + bench | Hamstrings / Glutes | Hamstrings / Glutes | 10-15 | D | all 5 | Old |
| 113 | Split Squats | Quads, glutes | lunge | Dumbbell or bodyweight | Quads; Squat | Quads; Squat | 12-15 (v3.02: 10-12) | D | all 5 | Updated |
| 114 | Split Squats (Bands) | Quads, glutes | lunge | Band | Quads; Squat | Quads; Squat | 15-25+ | B | all 5 | Old |
| 115 | Squat (Barbell) | Quads, glutes, adductors, back | squat | Barbell + rack | Quads; Squat | Quads; Squat | 8-10 | F/D | all 5 | Updated |
| 116 | Squat (Smith Machine) | Quads, glutes | squat | Smith machine | Quads; Squat | Quads; Squat | 8-10 | F/D | all 5 | Updated |
| 117 | Standing Calf Raise | Calves (gastrocnemius) | isolation | Bodyweight, dumbbell or machine | Calves | Calves | 18-25 | D | all 5 | Old |
| 118 | Standing Leg Curl (Cables) | Hamstrings | isolation | Cable (ankle strap) | Hamstrings / Glutes | Hamstrings / Glutes | 12-15 | D | all 5 | Old |
| 119 | Sumo Deadlift (Barbell) | Glutes, adductors, quads, hamstrings, back | hinge | Barbell | Hip Hinge | Hip Hinge | 8-10 | F/D | all 5 | Old |
| 120 | Tricep Extension (Machine) | Triceps | isolation | Machine | Triceps | Triceps | 12-15 | D | all 5 | Old |
| 121 | Tricep Pushdowns (Bands) | Triceps | isolation | Band | Triceps | Triceps | 15-25+ | B | all 5 | Old |
| 122 | Tricep Pushdowns (Cables) | Triceps | isolation | Cable | Triceps | Triceps | 12-15 | D | all 5 | Old |
| 123 | Tricep Pushdowns (Rope) | Triceps | isolation | Cable (rope) | Triceps | Triceps | 12-15 | D | all 5 | Old |
| 124 | Underhand Pulldown | Lats, biceps | pull vertical | Cable / pulldown machine | Vertical Pull | Vertical Pull | 10-15 | D | all 5 | Old |
| 125 | Unilateral Cable Row | Lats, upper back | pull horizontal | Cable | Horizontal Pull | Horizontal Pull | 10-15 | D | M2 | Updated |
| 126 | Upper Chest Fly (Cables) | Upper chest | isolation | Cable | Chest | Chest | 15-20 | D | all 5 | Old |
| 127 | Upright Row (Bands) | Side delts, traps | isolation (shoulder slot; mechanically a vertical pull) | Band | Shoulders | Shoulders | 15-25+ | B | all 5 | Old |
| 128 | Upright Row (Barbell) | Side delts, traps | isolation (shoulder slot; mechanically a vertical pull) | Barbell | Shoulders | Shoulders | 15-20 | D | all 5 | Old |
| 129 | Upright Row (Cables) | Side delts, traps | isolation (shoulder slot; mechanically a vertical pull) | Cable | Shoulders | Shoulders | 15-20 | D | all 5 | Old |
| 130 | Upright Row (Dumbbell) | Side delts, traps | isolation (shoulder slot; mechanically a vertical pull) | Dumbbell | Shoulders | Shoulders | 12-20 | D | all 5 | Old |
| 131 | Weighted Crunches | Abs | core | Plate or dumbbell | Abs | Abs | 12-15 | D | all 5 | Old |
| 132 | Weighted Hyperextensions | Glutes, hamstrings, spinal erectors | hinge | Hyperextension bench + plate | Hamstrings / Glutes | Hamstrings / Glutes | 10-12 | D | all 5 | Updated |
| 133 | Weighted Lunges | Quads, glutes | lunge | Dumbbell | Quads; Squat | Quads; Squat | 12-15 | D | all 5 | Updated |
| 134 | Weighted Step Ups | Quads, glutes | lunge (step-up) | Dumbbell + box/bench | Quads; Squat | Quads; Squat | 10-15 | D | all 5 | Old |
| 135 | Y Lateral Raises (Cables) | Side delts | isolation | Cable | Shoulders | Shoulders | 15-20 | D | M2 | Updated |

**Substitution groups at a glance** (slot → number of options → the home-friendly ones, meaning band, dumbbell or
bodyweight, sometimes plus a bench or pull-up bar):

| Slot (group) | Options | Home-friendly options |
|---|---|---|
| Horizontal Push | 7 | Push Ups, Kneeling Push Ups, Dips, Flat Bench Press (Dumbbell) |
| Incline Push | 5 | Decline Push Ups, Incline Bench Press (Dumbbell) |
| Chest | 11 | Push Ups, Kneeling Push Ups, Dips, Flat Bench Press (Dumbbell), Chest Flyes (Dumbbell), Chest Flyes (Bands) |
| Vertical Push | 4 | Shoulder Press (Dumbbell), Shoulder Press (Bands) |
| Horizontal Pull | 10 | Bent Over Row (Dumbbell), Db Chest Supported Upper Back Row, Seated Row (Bands) |
| Vertical Pull | 15 | Pullup, Chinup, Neutral Grip Pullup, Assisted Pullup (Bands), Assisted Chinup (Bands), Lat Pulldown (Bands) |
| Squat | 13 | Goblet Squat, Bulgarian Split Squat, Split Squats, Split Squats (Bands), Weighted Lunges, Weighted Step Ups |
| Quads | 15 | the Squat options above plus Leg Extension (Bands) |
| Hip Hinge | 10 | Romanian Deadlift (Dumbbell), Single Leg Deadlift, Single Leg Deadlift (Bands), Deadlift (Bands), Hip Thrusts (Bands) |
| Hamstrings / Glutes | 19 | Romanian Deadlift (Dumbbell), Single Leg Deadlift (+Bands), Single Leg Hip Thrust (Dumbbell/Bands), Hip Thrusts (Bands), Leg Curl (Bands) |
| Shoulders | 13 | Lateral Raises (Dumbbell/Bands), Lying Lateral Raises (Bands), Rear Delt Fly (Dumbbell/Bands), Upright Row (Dumbbell/Bands) |
| Biceps | 13 | Bicep Curl (Dumbbell/Bands), Hammer Curl (Dumbbell), Concentration Curl (Dumbbell), Preacher Curl (Dumbbell), Inclined DB Bicep Curl |
| Triceps | 11 | Lying Tricep Extensions (Dumbbell), Overhead Extensions (Dumbbell), DB Skull Crusher, Tricep Pushdowns (Bands) |
| Abs | 8 | Lying Leg Raise, Hanging Knee Raise, Weighted Crunches, Dumbbell Ab Crunch |
| Calves | 3 | Standing Calf Raise |
| Shrugs | 3 | Shrugs / Shrugs (Dumbbell), Shrugs (Bands) |

**Not in the builders: Cho's Photoshoot Workout** (a 6-day bonus routine, Monday–Saturday, upper/lower × 3; the PDF
says it is not for beginners and assumes you already handle 4–5 sessions a week):

| Day | Exercise | Sets | Reps | Rest |
|---|---|---|---|---|
| Mon, Upper #1 | Bench Press | 3 | 8–10 | 3–5 min |
| | Lat Pulldown (Wide grip) | 3 | 12–15 | 2–3 min |
| | Paused DB Incline Press | 3 | 8–10 | 2–3 min |
| | Pendlay Row | 3 | 8–10 | 3–5 min |
| | Bent Over Row (Underhand grip) | 3 | 8–10 | 2–3 min |
| | Machine Shoulder Press (Constant Tension) | 2 | 10–12 | 2–3 min |
| | DB Lateral Raise | 4 | 15–20 | 2–3 min |
| | Incline DB Curl | 5 | 10–12 | 2–3 min |
| Tue, Lower #1 | Bulgarian Split | 3 | 6–8 | 3–5 min |
| | Stiff Leg Deadlift | 3 | 8–10 | 3–5 min |
| | Goblet Squats | 3 | 15–20 | 2–3 min |
| | Weighted 1 Foot Calf Raise | 3 | 12–15 | 1–1.5 min |
| | Seated Calf Raise | 3 | 20–30 | 2–3 min |
| | Weighted Sit ups | 4 | 15–20 | 1–1.5 min |
| | Hanging Oblique Crunch | 3 | 15–20 | 1–1.5 min |
| Wed, Upper #2 | Barbell OHP | 4 | 4–6 | 3–5 min |
| | Lat Pulldown (Wide grip) | 3 | 12–15 | 2–3 min |
| | Bench Press | 3 | 8–10 | 3–5 min |
| | Dumbell Incline Row | 3 | 15–20 | 2–3 min |
| | Dumbell Chest Fly | 3 | 20–22 | 2–3 min |
| | Lat Pulldown (Underhand grip) | 2 | 10–12 | 2–3 min |
| | Bicep Curl | 3 | 12–15 | 2–3 min |
| | Push Ups | 2 | 20–25 | 2–3 min |
| Thu, Lower #2 | Romanian Deadlift | 4 | 6–8 | 3–5 min |
| | Squat (Machine) | 3 | 8–10 | 3–5 min |
| | Lying Leg Curl | 3 | 20–22 | 3–4 min |
| | Leg Extension | 3 | 12–15 | 2–3 min |
| | Standing Calf Raise | 3 | 15–20 | 1–1.5 min |
| | Hanging Oblique Crunch | 3 | 15–20 | 1–1.5 min |
| Fri, Upper #3 | Incline Bench Press | 4 | 4–6 | 3–5 min |
| | Lat Pulldown (Neutral Grip) | 3 | 12–15 | 2–3 min |
| | Weighted Push Ups | 3 | 12–15 | 2–3 min |
| | Seated Cable Row | 3 | 12–15 | 2–3 min |
| | Dumbell Seated OHP | 3 | 10–12 | 3–5 min |
| | Chin Ups (Negative only) | 3 | 10–12 | 2–3 min |
| | Tricep Rope Extension | 3 | 12–15 | 2–3 min |
| Sat, Lower #3 | Bulgarian Split | 3 | 6–8 | 3–5 min |
| | Unilateral Eccentric Leg Extensions | 3 | 12–15 | 2–3 min |
| | Weighted 1 Foot Calf Raise | 4 | 12–15 | 1–1.5 min |
| | Seated Calf Raise | 3 | 20–25 | 2–3 min |
| | Concentration Curls | 2 | 15–20 | 2–3 min |
| | Ab Ripper X | 2 | 20–30 | 1–1.5 min |
| | Weighted Neck Curl | 2 | 15–20 | 2–3 min |
| | Weighted Neck Side Bend | 2 | 15–20 | 2–3 min |

---

## 5. Training and habit principles (paraphrased)

Source tags: **[Rules]** = Rules tab of every builder and *4 - Workout Rules.png*; **[Welcome]**, **[Warm Ups]**,
**[Starting Weights]** = builder tabs; **[v3.02]** = Men's v3.02 Rules tab; **[W1]…[W15]** = weekly action-item PDFs;
**[S3]**/**[S4]** = pre-coaching/onboarding docs; **[Maint]** = Maintenance Program; **[Eat]** = Tips On Mindful
Eating; **[Routine]** = Daily Routine Cheatsheet; **[Journal]** = Daily Journal Guide; **[Char]** = 2.0 Character
Worksheet; **[Planner]** = Bulk/Cut Planner; **[Photo]** = Photoshoot Workout.

### Training
- Warm up every session: easy cardio, then mobility, then ramp-up sets. [Rules] [Warm Ups]
- Move under control: no bouncing, no jerking, full range of motion every rep. [Rules]
- Form beats load; never chase a heavier weight with worse technique (no ego lifting). [Rules] [W5]
- Progressive overload is the default goal, and logging every workout is what makes it possible. [Rules] [W2]
- Keep rest periods consistent from set to set and week to week. [Rules]
- Swap exercises only within the same movement: barbell ↔ dumbbell or incline ↔ flat is fine, swapping an
  isolation move for a big compound is not. [Rules]
- Week 1: pick loads that leave 2–3 reps in reserve on every set, then progress from there. [Rules]
- If sessions run long, move abs and calves to rest days. [Rules]
- Choose a frequency you can actually keep (3–4 days recommended); the routine matters less than doing it
  consistently. [Welcome] [W1]
- Start easier than you think and build momentum; you can always add volume later. Newcomers practise the lifts
  with very light weights first. [W1]
- Begin a new program with a deload week if you were already training hard; if you're coming off a layoff, start
  straight away. [W1] [S3] [S4]
- Starting weights are a guess: go light, adjust set to set by reps left, and expect 2–3 sessions to dial them in.
  [Starting Weights]
- In the weeks before a deload, raise effort by 1–2 notches (around RPE 8–10) while keeping good form, and get form
  checked. [W5]
- Judge fatigue across a week, not a single bad day. If you still feel fresh, a scheduled deload can wait until signs
  of overreaching appear. [W6]
- The last week before a deload is deliberately hard (intensity techniques, sets to failure, safety first), so the
  deload produces a rebound; steps and ab work are eased off in the deload too. [W6]
- v3.02: train close to failure on every set, and/or to failure on the last working set. [v3.02]
- High-volume, 6-day training is only for people already comfortable with 4–5 sessions a week. Sustainability is the
  test, and fewer sessions still work. [Photo]

### Cardio and steps
- Hit 7,500–10,000 steps a day and track them. During a cut, steps beat hard cardio because intense cardio eats into
  recovery. [Rules]
- With no smartwatch, a phone step app is enough; carry the phone while walking. [S3] [S4] [W1]
- If you already walk about 10k steps a day, count as moderately active when estimating maintenance calories. [W2]

### Nutrition
- Cut at about 300–500 kcal below maintenance (500 once settled); bulk at about +100 kcal. When unsure, or when
  skinny-fat, cut first. [W1] [W2]
- People who already know their intake should keep it and adjust by how the scale moves, rather than recalculate.
  [W2]
- Protein: about 0.8–1 g per lb of bodyweight a day (overweight people use a height-based target instead); more is
  fine. [W2]
- Take a week at maintenance calories (a diet break) before starting a new cut, and plan 2-day refeeds during long
  diets. [S3] [S4] [W6]
- On a cut, aim to lose about 0.7–1 % of bodyweight a week, and adjust quickly when progress stalls. Bodies adapt, so
  consistency alone isn't enough. [W6] [W7] [W8]
- Planner defaults: bulk +0.3 to +0.6 % of bodyweight a week, cut −0.5 to −1.0 % a week, and a one-off 1–2 kg
  (2–5 lb) rise when switching to maintenance after a cut. Plan by weekly average weight. [Planner]
- Avoid yo-yo dieting, which can slow metabolism for months. Use diet breaks and refeeds, and reverse-diet after a
  long cut if needed. [W15]
- The weeks right after a diet carry a high binge risk; keep structure and support going after a program ends.
  [Maint]
- Mindful-eating starter rules: serve about 80 % of your usual portion and eat slower; cut liquid calories (swap to
  zero-calorie versions); make lean protein about 40–50 % of the plate; add 1–2 handfuls of vegetables to main meals;
  notice which foods fill you up or trigger overeating, and adjust. [Eat]
- Find two or more go-to meals that hit your calories and protein and repeat them. If food is the bottleneck, use a
  meal service or fixed meal plans. [W2] [W4] [W8]
- Weigh food on a kitchen scale and log it in a food app. [W2] [S3] [S4]
- Supplements: whey protein is the one they push, since most people struggle to hit protein from food alone.
  Creatine, a multivitamin, fish oil and pre-workout are optional extras; avoid stimulants near bedtime. [S3] [S4]

### Sleep and recovery
- Log your hours of quality sleep every morning. [Routine]
- Log stress and fatigue (1–10) every evening. [Routine]
- Deload on schedule (week 6 of each block): same weights, half the reps, 2 sets. [Builders]
- Sleep "hacks" were taught in the Week 4 lesson, which is a video and not yet transcribed. [W4]

### Mindset, habits and journaling
- Daily structure: on waking, optionally avoid messages and social media; then bathroom, weigh-in, a glass of water
  (16 oz), review today's plan and write what you commit to. In the evening: log the day, rate stress and fatigue,
  plan tomorrow (meals, workout, clothes, cardio time, groceries), write wins or gratitude and one thing to do better,
  and reread your vision and goals before sleep. About 10–15 min in the morning and 10 min at night. [Routine]
- Design a "2.0 character": your vision; 100-day health goals; what neglect has cost you and would cost you; the
  traits, habits, look and typical day of the future you; your 100-day commitments; your 5-year picture for health,
  wealth and relationships; and a letter from your future self. Reread it daily and refresh it at the halfway mark
  as a vision board. [Char] [W1] [W5] [W8]
- Commit to a fixed window (100 days) and treat it as an experiment. [S3] [S4]
- A motivation dip around the middle is normal; plan for it with motivation hacks and community. [W5]
- Write implementation intentions each morning. Adopt 2–3 new tactics at a time and master them before adding more.
  [W4]
- Cut back on cheap dopamine (a "dopamine detox"), and use a countdown widget to keep the deadline visible. [W7]
- Do a weekly review every Sunday (and optionally a mid-week one). [W8] [W9]
- Rate your own proactivity from 1 to 10 and plan how to raise it. [W9]
- Habits take more than two months on average to become automatic. If you slip, restart without beating yourself
  up. [Journal]
- Journal cadence: morning and evening reflection plus mood daily, a daily habit tracker, and weekly, monthly and
  yearly reflections. [Journal]
- Tell family and friends about your commitment and ask for their support. [S3] [S4]

### Accountability
- Small accountability groups with a fixed weekly meeting (Sunday night or Monday morning) and a set agenda. [W1]
- Share visions, goals and (optionally) starting photos with the group. [W1]
- Send daily proof: workout log or photo, step screenshot, food log. [W2] [W4]
- Agree on consequences for misses and small rewards for wins, then actually enforce them; unenforced rules erode
  the group. [W2] [W3] [W6] [W7]
- Weekly leaderboards of habit scores, group-harmony surveys, and a hard deadline for updating trackers. [W2] [W3]
  [W4] [W9]
- Community participation counts towards your score and helps you get through the dip. [W3] [W5] [W9]
- Structure, awareness, accountability and community are what keep habits alive after a program; losing them
  usually means sliding back. [Maint]
- Raise the stakes: book a photoshoot, make a bet, commit in public. [W5] [W8]

### Progress tracking
- Weigh in every morning under the same conditions: right after waking and using the bathroom, before eating or
  drinking. Set an alarm so you don't forget. [W1] [W3] [Routine]
- Take body measurements and progress photos every 2 weeks (end of weeks 2, 4, 6, 8, 10, 12 and 15), under the same
  morning conditions; weekly if you want faster adjustments. [W1] [W3] [Routine]
- Only make diet or activity adjustments when the tracking checklist ("WCAA") was fully met, and read the scale and
  tape measure together. [W3] [W4] [W6] [W7]
- Use a workout tracker (Strong or Hevy), a food tracker (MyFitnessPal) and a step counter, and update the habit
  tracker every day rather than at the deadline. [S3] [S4] [W2] [W3]
- Judge trends (weekly average weight), not single weigh-ins. [Planner]

---

## 6. What LevelMeUp could adopt (SUGGESTIONS, not Kaizen content)

These map onto the existing code: `packages/rules/src/library.ts` (`QuestTemplate`, `Ladder`, `Condition`,
`Limitation`), `packages/rules/src/ladder.ts` (step up and step down with `Rating` easy / right / too_hard and a
7-day minimum between step-ups) and `packages/content/src/quests/strength.ts` (bodyweight push, squat and core
ladders, plus an own-program ladder).

### 6.1 Inputs to ask the player (suggestion)
- **Equipment owned** (multi-select): nothing, resistance bands, dumbbells (and the heaviest pair), bench, pull-up
  bar, dip bars or sturdy chairs, gym access (barbell and rack, cables, machines, Smith). Derive a tier from it:
  bodyweight → bands → dumbbells → full gym.
- **Strength days per week:** 2–5. Default 3; recommend 3–4; unlock 5 only after a few weeks of consistent 4-day
  training.
- **Experience:** new / returning / trained. This gates training to failure, the fixed-target main-lift rule and the
  5-day option.
- **Limitations** (already collected: knee, back, shoulder, wrist), stored as contraindications on library rows.
- **Emphasis instead of sex:** "balanced" (Men's templates) or "more lower body" (Women's 3x/4x templates). The
  Women's builder differs only in slot layout, so let anyone choose.
- **Minutes per day** (already collected): caps the number of slots. A Kaizen session is 5–6 exercises × 2–4 sets
  (roughly 45–75 min), which is too long for short budgets.
- **Units:** kg or lb. Optional: current daily steps (to scale the steps quest) and cut/bulk/maintain (affects only
  steps and nutrition quests, not exercise choice).

### 6.2 Library rows (suggestion)
```ts
type Pattern = 'squat' | 'hinge' | 'lunge' | 'push_h' | 'push_v' | 'pull_h' | 'pull_v' | 'core' | 'isolation' | 'carry' | 'cardio';
type Equip = 'bodyweight' | 'band' | 'dumbbell' | 'bench' | 'pullup_bar' | 'dip_bars' | 'barbell' | 'rack' | 'smith' | 'cable' | 'machine';
type Rule = 'fixed_top' | 'double' | 'band' | 'assisted' | 'bodyweight_amrap';
type LibraryExercise = {
  id: string;
  name: string;                       // generic name, e.g. "Goblet squat"
  slots: readonly SlotId[];           // substitution groups from §4 (e.g. 'squat', 'quads')
  pattern: Pattern;
  muscles: readonly string[];
  needs: readonly Equip[];            // all required
  repRange: { min: number; max: number | null };   // null = "to failure / 25+"
  rule: Rule;
  tier: 1 | 2 | 3;                    // ours, not Kaizen's
  contraindications: readonly Limitation[];
};
```
Each library row becomes a `QuestTemplate` with `condition: reps(sets, repsTarget)` and a `hardDay` version
(1–2 fewer sets, same reps).

### 6.3 Picking today's session (suggestion)
1. **Template:** the Kaizen slot list for the chosen days per week and emphasis (§3.4). Trim to the minutes budget
   in sheet order, since the first slots are the priority compounds. Drop abs and calves first and offer them as
   rest-day side quests (Kaizen's own rule).
2. **Which day:** advance the day index when a session is completed, not by weekday. A missed day means the same
   session next time, mirroring Kaizen's "keep your week number when you switch".
3. **Which exercise per slot:** filter the slot's group by equipment owned, limitations and tier ≤ the player's level.
   Break ties by a preference order (gym: barbell or machine → dumbbell → cable; home: dumbbell → band → bodyweight).
   **Lock the pick for the whole 6-week block** so overload can be tracked, and only allow swaps inside the same
   group.
4. **Volume:** use Kaizen's ramp as the shape (sets 2 → 3 → 3 → 4 → 4 for slots 1–2 and 2 → 3 → 3 → 3 → 3 for the
   rest, then a deload of 2 sets at half reps and the same load), but advance a "block week" only when the previous
   one was completed and not rated *too_hard*, not by the calendar. Our CLAUDE.md requires difficulty to rise on
   demonstrated readiness. Rest 2–3 min for compounds and 1–2 min for isolation, shown as a timer.
5. **Warm-up micro-quest** before each session: 5 min of easy cardio plus the 7-drill mobility circuit (§3.7),
   written in LevelMeUp's own words.

### 6.4 Progression (suggestion; deterministic and server-side)
- The app can't see the bar, so ask for reps per set (at least the last set), and optionally the load. Then apply
  the Kaizen rule for that exercise: all sets at the top of the range → step up; any set below the bottom → step
  down; main lift with last set ≥ target + 2 → step up; bands 20–25 on all sets → harder band; assisted → less
  assistance.
- "Step up" = add the smallest increment (2.5 kg / 5 lb in total, the low end of Kaizen's 5–10 lb), or, for home
  players with nothing heavier, move to the next rung or variant (wall → incline → knee → full → decline push-up;
  next band colour; slower tempo or a pause). This fits the existing ladder and rung model: map *easy* to "top of
  range with reps to spare" and *too_hard* to "below the range".
- At most one step up per exercise per week (matches `MIN_MS_BETWEEN_STEP_UPS` = 7 days). No load increases during
  week 1 of a block or in the deload week.

### 6.5 Safety limits (suggestion)
- No sets to failure for new players, for anyone with a reported limitation, or on barbell squats, deadlifts and
  bench presses. Near failure is allowed only on machines, bands and isolation exercises, and only on the last set.
  This is stricter than Kaizen, which pushes the last main-lift set, because the app has no coach and no form check.
- Caps per session: at most 6 exercises, about 20 working sets and 4 sets per exercise; one load increment per
  exercise per week.
- A deload after every five completed block weeks, plus an early deload offer when most of a week's sessions are
  rated *too_hard* or evening fatigue is ≥ 8/10 on several days (Kaizen judges fatigue over a week).
- After 2+ weeks away, restart at week-1 volume (2 sets) at about 90 % of the last loads. Never shame the gap (the
  Journal Guide's "restart without self-blame").
- Form cues and "stop if it hurts" on every exercise quest (the existing `safety` field). Pain, illness or injury
  always offers a rest or scaled-down option with no penalty (CLAUDE.md). Use our own demo content, not Kaizen's
  YouTube list.
- Unlock 5-day splits and anything like the photoshoot routine only after weeks of consistent 4-day training.
- Reward completing and logging, not load lifted or bodyweight change (wellbeing first, as in CLAUDE.md).

### 6.6 Other physical quests worth adding (suggestion)
- **Steps:** a daily quest scaled from the player's baseline towards 7,500–10,000; easier targets in deload weeks.
- **Morning weigh-in** (opt-in, gentle): same conditions every day, weekly average shown; never penalise gains.
- **Measurements and photos** every 2 weeks (opt-in, private).
- **Evening check-in:** sleep hours, stress and fatigue (1–10), which feed the fatigue and deload logic above.
- **Sunday weekly review** quest.

### 6.7 Content cautions (suggestion)
Generic exercise names, muscles and set/rep numbers are fine to use. Write our own how-to steps and cues, and don't
reuse Kaizen's video links, brand names, phrasing or the 2.0 Character Worksheet's wording. The existing bodyweight
ladders already cover the no-equipment case; the Kaizen data mainly adds band, dumbbell and gym variants plus the
6-week block structure.

---

## 7. Open questions and anything ambiguous or unreadable

1. **"WCAA"**: the action items call it the tracking checklist that must be complete before you adjust, but never
   spell it out in what I read.
2. **Which builder is canonical for the owner?** v3.02 is the newest Kaizen version; D-Code looks like the owner's
   own de-branded copy; Day-2-Day dates from April 2026. What do "D-Code" and "Day-2-Day" mean, and should LevelMeUp
   follow one of them?
3. **Gym or home?** About 64 of the 135 rows need cables, machines or a Smith machine. Should LevelMeUp offer gym
   exercises at all, or only bodyweight, bands and dumbbells?
4. **Women's template:** keep it as a sex-based default, or as an "emphasis" choice anyone can make (suggested)?
5. **Units and increments:** Kaizen writes ±5–10 lb. Should the app use 2.5 kg steps (local plates) for kg users?
6. **Linked but not read** (outside the file list): weekly lesson notes, the W3 "step-by-step adjustment
   infographics", the W6 deload guidelines and intensity-technique list, the 2-day refeed guidelines, the W4 lesson
   toolbox, the weekly accountability-meeting agenda, the online habit tracker (v4.1) and its scoring, and the MF /
   Basic Cut / Basic Bulk programs mentioned in W1. The deload guidelines and intensity-technique list matter most
   for the generator.
7. Action items for Weeks 10, 11, 12 and 14 were not in the list, and there is no Week 11 lesson video in the
   folder.
8. **Videos:** 14 lessons are untranscribed (§2). The ones most likely to change training rules are Week 2 (the
   workout, nutrition, cardio and supplement program), Week 3 (adjustments), Week 4 (sleep and workout hacks),
   Week 6 (fatigue) and Weeks 13–14 (bulk and cut).
9. **Habit Tracker walkthrough** is video-only, so the habit list and scoring are unknown.
10. **Sheet bugs** (§3.9): decide the intended behaviour rather than copying it (band split squats, assisted
    neutral-grip pull-ups, the Women's 5x dropdowns, v3.02's stale names).
11. **Deload timing:** the builders fix the deload at week 6 of each block, while the season docs let people
    postpone it until they feel overreached. Which should LevelMeUp follow (or offer both)?
12. **2.0 Character Worksheet:** it holds the owner's private answers, which were deliberately not summarized.
    Should its structure (vision → future-self traits → typical day → letter) inform LevelMeUp's character
    onboarding?

---

## Appendix A. Program grids (slots, default picks, numbers)

Men's v3.01 (the untouched template, so these are Kaizen's own defaults) and the Women's 3x/4x tabs (as saved in that
copy). Women's 2x and 5x use the men's slots with different picks. Reps = target for main lifts, otherwise the
directory range of the pick. Rest shown is weeks 1–5. The deload is always 2 sets at half the week-5 reps and the
same weight.

**Men's v3.01 2x/week**

| Day | Slot | Default pick | Reps | Sets W1-W5 | Deload | Rest |
|---|---|---|---|---|---|---|
| 1 | Horizontal Push | Flat Bench Press (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Horizontal Pull | Bent Over Row (Dumbbell) | 8-12 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Quads | Leg Press (Machine) | 8-10 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 1 | Hamstrings / Glutes | Weighted Hyperextensions | 10-12 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 1 | Shoulders | Lateral Raises (Cables) | 15-20 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 1 | Abs | Weighted Crunches | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Squat | Squat (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Hip Hinge | Romanian Deadlift (Barbell) | 8-10 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Vertical Pull | Lat Pulldown | 10-15 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 2 | Chest | Chest Flyes (Cables) | 15-20 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Shoulders | Upright Row (Cables) | 15-20 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Abs | Ab Machine | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |

**Men's v3.01 3x/week**

| Day | Slot | Default pick | Reps | Sets W1-W5 | Deload | Rest |
|---|---|---|---|---|---|---|
| 1 | Incline Push | Incline Bench Press (Dumbbell) | 8 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Quads | Leg Extension (Bands) | 15-25+ | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Horizontal Pull | Bent Over Row (Dumbbell) | 8-12 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 1 | Shoulders | Upright Row (Dumbbell) | 12-20 | 2-3-3-4-4 | 2 sets, half reps | 1-2 min |
| 1 | Triceps | Tricep Pushdowns (Bands) | 15-25+ | 2-2-3-3-3 | 2 sets, half reps | 1-2 min |
| 1 | Biceps | Bicep Curl (Bands) | 15-25+ | 2-2-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Squat | Goblet Squat | 10-15 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Vertical Push | Shoulder Press (Barbell) | 8-10 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Vertical Pull | Lat Pulldown (Bands) | 15-25+ | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 2 | Hamstrings / Glutes | Leg Curl (Bands) | 15-25+ | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Abs | Ab Machine | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Calves | Standing Calf Raise | 18-25 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Hip Hinge | Romanian Deadlift (Barbell) | 8 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 3 | Horizontal Pull | Seated Row (Bands) | 15-25+ | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 3 | Chest | Flat Bench Press (Barbell) | 8-10 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 3 | Biceps | Bicep Curl (Bands) | 15-25+ | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Triceps | Tricep Pushdowns (Bands) | 15-25+ | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Abs | Weighted Crunches | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |

**Men's v3.01 4x/week**

| Day | Slot | Default pick | Reps | Sets W1-W5 | Deload | Rest |
|---|---|---|---|---|---|---|
| 1 | Incline Push | Incline Bench Press (Dumbbell) | 8 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Horizontal Pull | Seated Row (Machine) | 10-15 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 1 | Chest | Chest Flyes (Cables) | 15-20 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Triceps | Tricep Pushdowns (Rope) | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 1 | Biceps | Bicep Curl (Dumbbell) | 10-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Squat | Squat (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Hamstrings / Glutes | Leg Curl (Machine) | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 2 | Vertical Pull | Lat Pulldown | 10-15 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 2 | Shoulders | Lateral Raises (Cables) | 15-20 | 2-3-3-4-4 | 2 sets, half reps | 1-2 min |
| 2 | Abs | Ab Machine | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Horizontal Push | Flat Bench Press (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 3 | Horizontal Pull | Seated Row (Cables) | 10-15 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 3 | Vertical Push | Shoulder Press (Dumbbell) | 8-12 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 3 | Biceps | Bicep Curl (Cables) | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Triceps | Lying Tricep Extensions (Dumbbell) | 10-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 4 | Hip Hinge | Deadlift (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 4 | Quads | Leg Extension (Machine) | 12-15 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 4 | Shoulders | Upright Row (Dumbbell) | 12-20 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 4 | Calves | Calf Raise on Leg Press Machine | 18-25 | 2-3-3-4-4 | 2 sets, half reps | 1-2 min |
| 4 | Abs | Weighted Crunches | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |

**Men's v3.01 5x/week**

| Day | Slot | Default pick | Reps | Sets W1-W5 | Deload | Rest |
|---|---|---|---|---|---|---|
| 1 | Incline Push | Incline Bench Press (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Vertical Push | Shoulder Press (Dumbbell) | 8-12 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 1 | Chest | Chest Flyes (Cables) | 15-20 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Shoulders | Lateral Raises (Cables) | 15-20 | 2-3-3-4-4 | 2 sets, half reps | 1-2 min |
| 1 | Triceps | Tricep Pushdowns (Cables) | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Horizontal Pull | Seated Row (Cables) | 10-15 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Vertical Pull | Lat Pulldown | 10-15 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Shoulders | Upright Row (Cables) | 15-20 | 2-3-3-4-4 | 2 sets, half reps | 1-2 min |
| 2 | Biceps | Bicep Curl (Dumbbell) | 10-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Abs | Lying Leg Raise | 15-25 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Squat | Squat (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 3 | Hamstrings / Glutes | Leg Curl (Machine) | 12-15 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 3 | Quads | Leg Extension (Machine) | 12-15 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 3 | Calves | Calf Raise on Leg Press Machine | 18-25 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Shrugs | Shrugs | 10-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 4 | Horizontal Push | Flat Bench Press (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 4 | Vertical Pull | Underhand Pulldown | 10-15 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 4 | Horizontal Pull | Bent Over Row (Dumbbell) | 8-12 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 4 | Biceps | Preacher Curl (Barbell) | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 4 | Triceps | Tricep Pushdowns (Rope) | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 5 | Hip Hinge | Deadlift (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 5 | Quads | Leg Press (Machine) | 10-15 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 5 | Hamstrings / Glutes | Leg Curl (Machine) | 8-12 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 5 | Calves | Calf Raise on Leg Press Machine | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 5 | Abs | Cable Crunch | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |

**Women's v3.01 3x/week**

| Day | Slot | Default pick | Reps | Sets W1-W5 | Deload | Rest |
|---|---|---|---|---|---|---|
| 1 | Hip Hinge | Sumo Deadlift (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Quads | Squat (Smith Machine) | 8-10 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 1 | Horizontal Push | Flat Bench Press (Barbell) | 8-10 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Horizontal Pull | Bent Over Row (Dumbbell) | 8-12 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 1 | Biceps | Bicep Curl (Bands) | 15-25+ | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 1 | Abs | Lying Leg Raise | 15-25 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Squat | Squat (Barbell) | 8 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Hamstrings / Glutes | Leg Curl (Machine) | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 2 | Vertical Pull | Assisted Pullup (Machine) | 8-12 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 2 | Vertical Push | Shoulder Press (Machine) | 8-10 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Triceps | Lying Tricep Extensions (Dumbbell) | 10-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Abs | Cable Crunch | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Quads | Weighted Lunges | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 3 | Hamstrings / Glutes | Weighted Hyperextensions | 10-12 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 3 | Horizontal Pull | Bent Over Row (Dumbbell) | 8-12 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 3 | Chest | Upper Chest Fly (Cables) | 15-20 | 2-3-3-4-4 | 2 sets, half reps | 1-2 min |
| 3 | Shoulders | Upright Row (Cables) | 15-20 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Abs | Ab Machine | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |

**Women's v3.01 4x/week**

| Day | Slot | Default pick | Reps | Sets W1-W5 | Deload | Rest |
|---|---|---|---|---|---|---|
| 1 | Horizontal Push | Flat Bench Press (Dumbbell) | 10 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Horizontal Pull | Bent Over Row (Barbell) | 8-10 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 1 | Vertical Pull | Assisted Pullup (Bands) | 8-12 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 1 | Triceps | Tricep Pushdowns (Bands) | 15-25+ | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 1 | Biceps | Bicep Curl (Bands) | 15-25+ | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Squat | Squat (Barbell) | 6 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Hamstrings / Glutes | Leg Curl (Machine) | 12-15 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 2 | Quads | Leg Extension (Machine) | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 2-3 min |
| 2 | Shoulders | Upright Row (Cables) | 15-20 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 2 | Abs | Weighted Crunches | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Vertical Pull | Assisted Chinup (Machine) | 8-12 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 3 | Vertical Push | Shoulder Press (Dumbbell) | 8-12 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 3 | Horizontal Pull | Bent Over Row (Dumbbell) | 8-12 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Biceps | Bicep Curl (Cables) | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 3 | Triceps | Lying Tricep Extensions (Dumbbell) | 10-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 4 | Hip Hinge | Romanian Deadlift (Barbell) | 8 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 4 | Quads | Leg Extension (Machine) | 12-15 | 2-3-3-4-4 | 2 sets, half reps | 2-3 min |
| 4 | Hamstrings / Glutes | Weighted Hyperextensions | 10-12 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 4 | Shoulders | Upright Row (Cables) | 15-20 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |
| 4 | Abs | Ab Machine | 12-15 | 2-3-3-3-3 | 2 sets, half reps | 1-2 min |

**v3.02 default picks that differ from v3.01:** 2x: Seated Row (Cable) 8–10, Pendulum Squat 10–12, Y Lateral Raises
(Cables), Squat (Smith Machine) 6, Single Arm Lat Pulldown 10–15, Ab Machine 10–20. 3x: Decline Push Ups 15–25+, Leg
Extension (Machine) 10–12, Seated Row (Machine), Lateral Raises (Dumbbell) 8–12, Overhead Extensions (Dumbbell),
Bicep Curl (Dumbbell), Squat (Barbell) 6, Shoulder Press (Dumbbell), Lat Pulldown, Lying Leg Curl (Cables), Cable
Crunch, Seated Calf Raise 10–15, Deadlift (Barbell) 6, Db Chest Supported Upper Back Row 8–12, Hammer Curl (Dumbbell),
Tricep Pushdowns (Cables), Hanging Knee Raise. 4x: Decline Push Ups, Dips 10–12, Overhead Extensions (Dumbbell),
Romanian Deadlift (Barbell) in the Hamstrings slot, Lateral Raises (Dumbbell), Dumbbell Ab Crunch, Bent Over Row
(Dumbbell), Hammer Curl (Dumbbell), Lying Tricep Extensions (Barbell), Goblet Squat, Calf Raise on Leg Press 10–15,
Hanging Knee Raise. 5x: Lateral Raises (Dumbbell), Seated Row (Cable), Seated Hamstring Curl 8–12, Leg Extension
(Machine) 10–12, Calf Raise on Leg Press 10–15, Shrugs (Dumbbell).

// The exercise library (M6c decision 3). Names, slots and rep ranges follow the owner's Kaizen workout builders
// (docs/research/kaizen-training.md §4); the bodyweight moves and ranges are LevelMeUp's own. Every step and cue is
// written here, never copied. Player-facing, so the lint and the app's font-subset test cover every line.
import type { Move } from '../../../rules/src/index.ts';

/** A move with its words. */
export type AuthoredMove = Move & {
  /** Plain name, as a list shows it ("Goblet squat"). */
  name: string;
  /** 2–3 short how-to steps. */
  steps: readonly string[];
  /** The form cue: one line on doing it safely. */
  cue: string;
};

const LIGHT_BAR = 'Learn it with a light bar first; ';

export const MOVES: readonly AuthoredMove[] = [
  // Push: horizontal, incline and chest.
  {
    id: 'machine-chest-press', name: 'Machine chest press', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: ['gym'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['shoulder'],
    steps: ['Set the seat so the handles line up with the middle of your chest.', 'Press the handles forward until your arms are straight, then bring them back slowly.'],
    cue: 'Keep your shoulder blades against the pad and your wrists straight.',
  },
  {
    id: 'db-floor-press', name: 'Dumbbell floor press', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['shoulder'],
    steps: ['Lie on your back with your knees bent and a dumbbell in each hand above your chest.', 'Lower until your upper arms touch the floor, then press the weights back up.'],
    cue: 'Lower with control and keep your elbows a little in from your sides.',
  },
  {
    id: 'db-incline-press', name: 'Incline dumbbell press', slots: ['incline_push', 'chest'], pattern: 'push', needs: ['dumbbells', 'bench'],
    level: 2, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['shoulder'],
    steps: ['Set a bench at a low incline and sit back with a dumbbell at each shoulder.', 'Press the weights up over your upper chest, then lower them slowly.'],
    cue: 'Keep your feet flat and your back against the bench.',
  },
  {
    id: 'barbell-bench-press', name: 'Barbell bench press', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: ['gym'],
    level: 3, unit: 'reps', min: 8, max: 10, perSide: false, contraindications: ['shoulder'],
    steps: ['Lie on the bench with your eyes under the bar and your feet flat on the floor.', 'Lower the bar to your lower chest with control, then press it back up.', "Set the rack's safety bars or train with a spotter."],
    cue: `${LIGHT_BAR}leave 2 good reps in every set.`,
  },
  {
    id: 'band-chest-press', name: 'Band chest press', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: ['shoulder'],
    steps: ['Anchor the band behind you at chest height and hold an end in each hand.', 'Step forward until the band is tight, then press both hands straight out and return slowly.'],
    cue: 'Keep your ribs down and your shoulders away from your ears.',
  },
  {
    id: 'wall-push-up', name: 'Wall push-ups', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: [],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['wrist', 'shoulder'],
    steps: ["Stand an arm's length from a wall with your hands on it at shoulder height.", 'Bend your elbows to bring your chest toward the wall, then push back.'],
    cue: 'Keep your body in one straight line from head to heels.',
  },
  {
    id: 'incline-push-up', name: 'Incline push-ups', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: [],
    level: 2, unit: 'reps', min: 8, max: 15, perSide: false, contraindications: ['wrist', 'shoulder'],
    steps: ['Put your hands on a sturdy table, counter or bench, a little wider than your shoulders.', 'Lower your chest to the edge, then press back up.'],
    cue: "Use something that can't slide, and keep your hips in line with your shoulders.",
  },
  {
    id: 'push-up', name: 'Push-ups', slots: ['horizontal_push', 'chest'], pattern: 'push', needs: [],
    level: 3, unit: 'reps', min: 6, max: 15, perSide: false, contraindications: ['wrist', 'shoulder'],
    steps: ['Place your hands just wider than your shoulders, body straight from head to heels.', "Lower until your chest is a fist's height from the floor, then press up."],
    cue: 'End the set when your hips sag or your form breaks.',
  },
  {
    id: 'feet-up-push-up', name: 'Feet-up push-ups', slots: ['incline_push'], pattern: 'push', needs: [],
    level: 3, unit: 'reps', min: 6, max: 15, perSide: false, contraindications: ['wrist', 'shoulder'],
    steps: ['Put your feet on a sturdy step or low bench and your hands on the floor.', 'Lower your chest toward the floor, then press back up.'],
    cue: 'Start with a low step and keep your body straight.',
  },
  // Press: vertical push.
  {
    id: 'db-shoulder-press', name: 'Dumbbell shoulder press', slots: ['vertical_push'], pattern: 'press', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['shoulder'],
    steps: ['Sit or stand tall with a dumbbell at each shoulder, palms facing forward.', 'Press the weights overhead until your arms are straight, then lower them to your shoulders.'],
    cue: 'Squeeze your glutes and keep your lower back from arching.',
  },
  {
    id: 'barbell-overhead-press', name: 'Barbell overhead press', slots: ['vertical_push'], pattern: 'press', needs: ['gym'],
    level: 3, unit: 'reps', min: 8, max: 10, perSide: false, contraindications: ['shoulder', 'back'],
    steps: ['Stand with the bar resting on the front of your shoulders, hands just wider than them.', 'Press the bar straight up past your face, then lower it back to your shoulders.'],
    cue: `${LIGHT_BAR}brace your stomach and keep your ribs down.`,
  },
  {
    id: 'band-shoulder-press', name: 'Band shoulder press', slots: ['vertical_push'], pattern: 'press', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: ['shoulder'],
    steps: ['Stand on the middle of the band and hold an end at each shoulder.', 'Press both hands overhead, then lower them slowly.'],
    cue: 'Stand tall and keep your stomach tight.',
  },
  {
    id: 'pike-push-up', name: 'Pike push-ups', slots: ['vertical_push'], pattern: 'press', needs: [],
    level: 3, unit: 'reps', min: 6, max: 12, perSide: false, contraindications: ['wrist', 'shoulder'],
    steps: ['Start in a push-up position, then walk your feet in so your hips point up.', 'Bend your elbows to lower the top of your head toward the floor, then press back up.'],
    cue: 'Lower slowly, and keep the movement small if your shoulders feel it.',
  },
  // Pull: horizontal.
  {
    id: 'cable-row', name: 'Seated cable row', slots: ['horizontal_pull'], pattern: 'pull', needs: ['gym'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: [],
    steps: ['Sit tall with your feet on the plate and a slight bend in your knees.', 'Pull the handle to your lower ribs, squeezing your shoulder blades together, then let it return slowly.'],
    cue: "Keep your chest up; don't rock your body to move the weight.",
  },
  {
    id: 'db-row', name: 'One-arm dumbbell row', slots: ['horizontal_pull'], pattern: 'pull', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: true, contraindications: ['back'],
    steps: ['Put one hand and knee on a bench or sturdy chair, and hold a dumbbell in the other hand.', 'Pull the weight up toward your hip, then lower it slowly. Do every rep, then switch sides.'],
    cue: 'Keep your back flat and still.',
  },
  {
    id: 'db-chest-supported-row', name: 'Chest-supported dumbbell row', slots: ['horizontal_pull'], pattern: 'pull', needs: ['dumbbells', 'bench'],
    level: 2, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: [],
    steps: ['Lie face down on a bench set at an incline, a dumbbell in each hand.', 'Pull both weights up beside your ribs, then lower them slowly.'],
    cue: 'Squeeze your shoulder blades together at the top.',
  },
  {
    id: 'barbell-row', name: 'Barbell bent-over row', slots: ['horizontal_pull'], pattern: 'pull', needs: ['gym'],
    level: 3, unit: 'reps', min: 8, max: 10, perSide: false, contraindications: ['back'],
    steps: ['Hold the bar with straight arms, bend your knees a little and lean forward with a flat back.', 'Pull the bar to your lower ribs, then lower it with control.'],
    cue: `${LIGHT_BAR}keep your back flat the whole set.`,
  },
  {
    id: 'band-row', name: 'Band seated row', slots: ['horizontal_pull'], pattern: 'pull', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Sit with your legs out, loop the band around your feet and hold an end in each hand.', 'Pull your hands to your ribs, squeezing your shoulder blades together, then return slowly.'],
    cue: 'Sit tall and keep your shoulders down.',
  },
  {
    id: 'prone-y-raise', name: 'Prone Y raises', slots: ['horizontal_pull', 'shoulders'], pattern: 'pull', needs: [],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['shoulder'],
    steps: ['Lie face down with your arms overhead in a Y and your thumbs pointing up.', 'Lift your arms off the floor a little, hold for a breath, then lower.'],
    cue: 'Keep your neck long and your eyes on the floor.',
  },
  // Pull: vertical.
  {
    id: 'lat-pulldown', name: 'Lat pulldown', slots: ['vertical_pull'], pattern: 'pull', needs: ['gym'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['shoulder'],
    steps: ['Sit with your thighs under the pads and hold the bar a little wider than your shoulders.', 'Pull the bar down to your upper chest, then let it rise slowly.'],
    cue: "Lead with your elbows and don't lean far back.",
  },
  {
    id: 'band-pulldown', name: 'Band pulldown', slots: ['vertical_pull'], pattern: 'pull', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: ['shoulder'],
    steps: ['Anchor the band high, over a door or a bar, and kneel facing it with an end in each hand.', 'Pull your elbows down to your sides, then let your arms rise slowly.'],
    cue: 'Keep your chest up and your shoulders down.',
  },
  {
    id: 'chin-up-lower', name: 'Slow chin-up lowers', slots: ['vertical_pull'], pattern: 'pull', needs: ['pullup_bar'],
    level: 2, unit: 'reps', min: 3, max: 6, perSide: false, contraindications: ['shoulder', 'wrist'],
    steps: ['Step up on a sturdy chair so your chin is above the bar, palms facing you.', 'Lower yourself as slowly as you can until your arms are straight, then step back up.'],
    cue: 'Take 3 to 5 seconds on the way down; stop if your elbows or shoulders hurt.',
  },
  {
    id: 'chin-up', name: 'Chin-ups', slots: ['vertical_pull'], pattern: 'pull', needs: ['pullup_bar'],
    level: 3, unit: 'reps', min: 5, max: 10, perSide: false, contraindications: ['shoulder', 'wrist'],
    steps: ['Hang from the bar with your palms facing you, hands shoulder-width apart.', 'Pull until your chin is over the bar, then lower all the way down.'],
    cue: 'No swinging; lower with control every rep.',
  },
  // Squat and quads.
  {
    id: 'leg-press', name: 'Leg press', slots: ['squat', 'quads'], pattern: 'squat', needs: ['gym'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['knee'],
    steps: ['Sit with your back flat on the pad and your feet hip-width on the plate.', 'Lower the plate until your knees are bent to about a right angle, then press it away.'],
    cue: "Keep your lower back on the pad, and don't snap your knees straight at the top.",
  },
  {
    id: 'goblet-squat', name: 'Goblet squat', slots: ['squat', 'quads'], pattern: 'squat', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['knee'],
    steps: ['Hold one dumbbell upright against your chest, feet a little wider than your hips.', 'Sit your hips down between your heels, then stand up.'],
    cue: 'Keep your chest up and your knees pointing the same way as your toes.',
  },
  {
    id: 'db-split-squat', name: 'Dumbbell split squats', slots: ['squat', 'quads'], pattern: 'squat', needs: ['dumbbells'],
    level: 2, unit: 'reps', min: 8, max: 12, perSide: true, contraindications: ['knee'],
    steps: ['Stand in a long stride with a dumbbell in each hand.', 'Lower your back knee toward the floor, then push back up. Do every rep, then switch legs.'],
    cue: 'Keep your front knee in line with your foot.',
  },
  {
    id: 'barbell-squat', name: 'Barbell back squat', slots: ['squat', 'quads'], pattern: 'squat', needs: ['gym'],
    level: 3, unit: 'reps', min: 8, max: 10, perSide: false, contraindications: ['knee', 'back'],
    steps: ['Set the bar across your upper back in a rack, feet a little wider than your hips.', 'Sit your hips back and down as deep as your form allows, then stand up.', "Set the rack's safety bars at the bottom of your squat."],
    cue: `${LIGHT_BAR}leave 2 good reps in every set.`,
  },
  {
    id: 'band-squat', name: 'Band squats', slots: ['squat', 'quads'], pattern: 'squat', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: ['knee'],
    steps: ['Stand on the middle of the band and hold the ends at your shoulders.', 'Squat down as far as is comfortable, then stand up against the band.'],
    cue: 'Keep your heels down and your chest up.',
  },
  {
    id: 'chair-squat', name: 'Chair squats', slots: ['squat', 'quads'], pattern: 'squat', needs: [],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['knee'],
    steps: ['Stand in front of a sturdy chair with your feet hip-width apart.', 'Sit your hips back until you lightly touch the chair, then stand straight up again.'],
    cue: 'Keep your weight in your heels and your knees in line with your toes.',
  },
  {
    id: 'bodyweight-squat', name: 'Bodyweight squats', slots: ['squat', 'quads'], pattern: 'squat', needs: [],
    level: 2, unit: 'reps', min: 12, max: 20, perSide: false, contraindications: ['knee'],
    steps: ['Stand with your feet a little wider than your hips, toes turned slightly out.', 'Sit your hips back and down as far as is comfortable, chest up, then stand.'],
    cue: 'Go only as low as you can without pain.',
  },
  {
    id: 'split-squat', name: 'Split squats', slots: ['squat', 'quads'], pattern: 'squat', needs: [],
    level: 2, unit: 'reps', min: 8, max: 12, perSide: true, contraindications: ['knee'],
    steps: ['Step one foot forward and one back, about a stride apart. Hold a wall or chair if you like.', 'Bend both knees to lower your back knee toward the floor, then push up. Do every rep, then switch.'],
    cue: 'Keep your front knee in line with your foot.',
  },
  {
    id: 'raised-split-squat', name: 'Back-foot-raised split squats', slots: ['squat', 'quads'], pattern: 'squat', needs: [],
    level: 3, unit: 'reps', min: 6, max: 12, perSide: true, contraindications: ['knee'],
    steps: ['Stand a stride in front of a sturdy chair and rest the top of your back foot on it.', 'Lower your back knee toward the floor, then push up through your front foot. Do every rep, then switch.'],
    cue: 'Hold a wall for balance at first, and keep your front knee in line with your foot.',
  },
  // Hinge, hamstrings and glutes.
  {
    id: 'db-glute-bridge', name: 'Dumbbell glute bridges', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: [],
    steps: ['Lie on your back with your knees bent and a dumbbell resting across your hips.', 'Push through your heels to lift your hips until your body is straight from knees to shoulders, then lower.'],
    cue: 'Squeeze your glutes at the top and keep your ribs down.',
  },
  {
    id: 'db-rdl', name: 'Dumbbell Romanian deadlift', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: ['dumbbells'],
    level: 2, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['back'],
    steps: ['Stand with a dumbbell in each hand in front of your thighs, knees slightly bent.', 'Push your hips back and slide the weights down your legs until you feel a stretch, then stand tall.'],
    cue: 'Keep your back flat; the movement comes from your hips, not your spine.',
  },
  {
    id: 'barbell-rdl', name: 'Barbell Romanian deadlift', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: ['gym'],
    level: 3, unit: 'reps', min: 8, max: 10, perSide: false, contraindications: ['back'],
    steps: ['Hold the bar in front of your thighs with your knees slightly bent.', 'Push your hips back and lower the bar along your legs until you feel a stretch, then stand tall.'],
    cue: `${LIGHT_BAR}keep your back flat and the bar close.`,
  },
  {
    id: 'band-glute-bridge', name: 'Band glute bridges', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Lie on your back with your knees bent and a band looped just above your knees.', 'Lift your hips while pressing your knees gently out, then lower.'],
    cue: 'Squeeze your glutes at the top.',
  },
  {
    id: 'band-leg-curl', name: 'Band leg curls', slots: ['hamstrings_glutes'], pattern: 'hinge', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: true, contraindications: ['knee'],
    steps: ['Anchor the band low, lie face down and loop it around one ankle.', 'Bend your knee to pull your heel toward your glutes, then straighten slowly. Do every rep, then switch.'],
    cue: 'Keep your hips pressed into the floor.',
  },
  {
    id: 'glute-bridge', name: 'Glute bridges', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: [],
    level: 1, unit: 'reps', min: 12, max: 20, perSide: false, contraindications: [],
    steps: ['Lie on your back with your knees bent and your feet flat, hip-width apart.', 'Push through your heels to lift your hips, hold for a breath, then lower.'],
    cue: "Squeeze your glutes at the top; don't arch your lower back.",
  },
  {
    id: 'single-leg-bridge', name: 'Single-leg glute bridges', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: [],
    level: 2, unit: 'reps', min: 8, max: 15, perSide: true, contraindications: [],
    steps: ['Lie on your back with one knee bent and the other leg straight in the air.', 'Lift your hips with the planted leg, then lower. Do every rep, then switch.'],
    cue: 'Keep your hips level as you lift.',
  },
  {
    id: 'single-leg-reach', name: 'Single-leg reaches', slots: ['hip_hinge', 'hamstrings_glutes'], pattern: 'hinge', needs: [],
    level: 3, unit: 'reps', min: 8, max: 12, perSide: true, contraindications: ['back'],
    steps: ['Stand on one leg with a slight bend in the knee, near a wall for balance.', 'Hinge forward and reach toward the floor as your back leg lifts behind you, then stand tall. Do every rep, then switch.'],
    cue: 'Keep your back flat and your hips square to the floor.',
  },
  // Shoulders.
  {
    id: 'db-lateral-raise', name: 'Dumbbell lateral raises', slots: ['shoulders'], pattern: 'isolation', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['shoulder'],
    steps: ['Stand with a light dumbbell in each hand at your sides.', 'Raise your arms out to the sides until they are level with your shoulders, then lower slowly.'],
    cue: 'Lead with your elbows and keep your shoulders down.',
  },
  {
    id: 'band-lateral-raise', name: 'Band lateral raises', slots: ['shoulders'], pattern: 'isolation', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: ['shoulder'],
    steps: ['Stand on the band and hold an end in each hand at your sides.', 'Raise your arms out to the sides to shoulder height, then lower slowly.'],
    cue: 'Keep a slight bend in your elbows.',
  },
  {
    id: 'band-pull-apart', name: 'Band pull-aparts', slots: ['shoulders'], pattern: 'isolation', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Hold the band in front of your chest with straight arms, hands shoulder-width apart.', 'Pull the band apart until it touches your chest, then return slowly.'],
    cue: 'Squeeze your shoulder blades together and keep your shoulders down.',
  },
  // Arms.
  {
    id: 'db-curl', name: 'Dumbbell curls', slots: ['biceps'], pattern: 'isolation', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: [],
    steps: ['Stand with a dumbbell in each hand, palms facing forward.', 'Curl the weights up to your shoulders, then lower them slowly.'],
    cue: "Keep your elbows at your sides and don't swing.",
  },
  {
    id: 'band-curl', name: 'Band curls', slots: ['biceps'], pattern: 'isolation', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Stand on the middle of the band and hold an end in each hand, palms forward.', 'Curl your hands to your shoulders, then lower slowly.'],
    cue: 'Keep your elbows still at your sides.',
  },
  {
    id: 'db-overhead-extension', name: 'Dumbbell overhead extension', slots: ['triceps'], pattern: 'isolation', needs: ['dumbbells'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['shoulder'],
    steps: ['Hold one dumbbell with both hands above your head.', 'Bend your elbows to lower it behind your head, then straighten your arms.'],
    cue: 'Keep your elbows pointing forward and your ribs down.',
  },
  {
    id: 'band-pushdown', name: 'Band pushdowns', slots: ['triceps'], pattern: 'isolation', needs: ['bands'],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Anchor the band high and hold it with your elbows bent at your sides.', 'Push your hands down until your arms are straight, then let them rise slowly.'],
    cue: 'Keep your elbows pinned to your sides.',
  },
  // Core.
  {
    id: 'dead-bug', name: 'Dead bugs', slots: ['abs'], pattern: 'core', needs: [],
    level: 1, unit: 'reps', min: 6, max: 10, perSide: true, contraindications: ['back'],
    steps: ['Lie on your back with your arms pointing at the ceiling and your knees bent above your hips.', 'Slowly lower one arm and the opposite leg, then bring them back. Switch sides each rep.'],
    cue: 'Keep your lower back on the floor; make the movement smaller if it lifts.',
  },
  {
    id: 'plank', name: 'Forearm plank', slots: ['abs'], pattern: 'core', needs: [],
    level: 1, unit: 'seconds', min: 20, max: 40, perSide: false, contraindications: ['back', 'shoulder'],
    steps: ['Rest on your forearms and toes with your elbows under your shoulders.', 'Hold your body in a straight line from head to heels.'],
    cue: 'Squeeze your glutes, and drop to your knees if your lower back aches.',
  },
  {
    id: 'side-plank', name: 'Side plank', slots: ['abs'], pattern: 'core', needs: [],
    level: 2, unit: 'seconds', min: 15, max: 30, perSide: true, contraindications: ['shoulder'],
    steps: ['Lie on your side with your forearm under your shoulder and your legs stacked.', 'Lift your hips so your body is straight, and hold. Then switch sides.'],
    cue: 'Bend your bottom knee to the floor to make it easier.',
  },
  {
    id: 'lying-leg-raise', name: 'Lying leg raises', slots: ['abs'], pattern: 'core', needs: [],
    level: 2, unit: 'reps', min: 8, max: 15, perSide: false, contraindications: ['back'],
    steps: ['Lie on your back with your hands under your hips and your legs straight.', 'Raise your legs until they point up, then lower them slowly without touching the floor.'],
    cue: 'Bend your knees to make it easier, and keep your lower back down.',
  },
  {
    id: 'hanging-knee-raise', name: 'Hanging knee raises', slots: ['abs'], pattern: 'core', needs: ['pullup_bar'],
    level: 3, unit: 'reps', min: 8, max: 15, perSide: false, contraindications: ['shoulder'],
    steps: ['Hang from the bar with straight arms.', 'Raise your knees toward your chest, then lower them slowly.'],
    cue: 'No swinging; lower with control.',
  },
  // Calves.
  {
    id: 'calf-raise', name: 'Standing calf raises', slots: ['calves'], pattern: 'isolation', needs: [],
    level: 1, unit: 'reps', min: 15, max: 25, perSide: false, contraindications: [],
    steps: ['Stand on the edge of a step with your heels over the edge, holding a wall for balance.', 'Rise onto your toes, then lower your heels below the step slowly.'],
    cue: 'Pause at the top; hold a dumbbell to make it harder.',
  },
];

export function authoredMove(id: string): AuthoredMove {
  const move = MOVES.find((m) => m.id === id);
  if (!move) throw new RangeError(`unknown move ${id}`);
  return move;
}

/** How the move gets harder (Kaizen's double progression, in our words): weight, band, lowering or hold. */
export function progressLine(move: Pick<Move, 'unit' | 'needs'>): string {
  if (move.unit === 'seconds') return 'When the whole range feels easy, hold a few seconds longer.';
  if (move.needs.includes('bands') && !move.needs.includes('pullup_bar')) {
    return 'When every set reaches the top of the range, use a stronger band next time.';
  }
  if (move.needs.length > 0 && !(move.needs.length === 1 && move.needs[0] === 'pullup_bar')) {
    return 'When every set reaches the top of the range, go a little heavier next time.';
  }
  return 'When every set reaches the top of the range, lower more slowly. Harder versions come as your workouts climb.';
}

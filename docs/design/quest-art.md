# Quest art (M6a, M6c)

One picture per art key (`packages/content/src/art.ts`), more variants later. The app shows them on the core quest card
and on every quest screen, 16:9, cropped to the panel (decision 10 of the M6a plan).

**Style.** Korean manhwa illustration in the Ink Panel palette: bold black ink lines, flat cel shading, cream paper
highlights, one vermilion red accent, light halftone. Adults (twenties to forties), mixed genders and builds, ordinary
clothes. Dynamic but calm; the person is doing the quest. No words, letters, numbers or logos in the picture.

**Made with** the owner's local ComfyUI (Z-Image Turbo, as the Inkbound art), `scripts/art/quest-art.py`; three seeds
per key, the best one picked; saved as 960×540 WebP (quality 80) in `art/quest/v2/`, uploaded to the `lmu-art`
bucket's `v2/` folder. A changed set gets a new folder (`v3`), so phones never keep a stale copy. v1 (2026-10-11) drew
wall push-ups for the small strength quest, whose only quest is slow sit-to-stands; v2 fixed it.

| Key | Picture |
|---|---|
| `ladder-push` | an adult man doing push-ups on a wooden dojo floor at dawn |
| `ladder-squat` | an adult woman doing bodyweight squats in a city park, morning light |
| `ladder-core` | an adult holding a forearm plank on a rooftop at sunset |
| `ladder-own-program` | a woman training with dumbbells in a small gym |
| `ladder-walk` | a man walking along a riverside path, city skyline behind |
| `ladder-mobility` | a woman stretching on a mat in a sunlit room |
| `ladder-sleep` | a quiet bedroom at night, moonlight, a phone face down on the side table |
| `ladder-breathing` | an adult sitting cross-legged on a hill at dawn, eyes closed |
| `ladder-reading` | a man reading a book by a rainy window with a cup of tea |
| `ladder-insight` | a woman writing in a notebook at a desk under a lamp |
| `ladder-focus` | an adult at a desk with headphones, deep in work, a small timer beside them |
| `ladder-phone-free` | a phone left in a drawer while its owner walks out into the sunlight |
| `micro-strength` | an adult slowly standing up from a sturdy chair in a small kitchen |
| `micro-vitality` | a woman drinking a glass of water at a sunny window |
| `micro-wisdom` | an open book with two pages being read on a train |
| `micro-focus` | a hand writing a single small card at a tidy desk |
| `recovery` | a figure standing back up on a wet path as light breaks through the clouds |
| `stillness` | a calm lake at dusk, a person sitting quietly on the jetty |
| `dawn-ritual` | a person opening curtains onto a sunrise over rooftops |
| `article` | an open book glowing softly on a desk at night |

## v3 (M6c)

Thirteen new keys, published as the `v3` set with the twenty above (33 in all). Two reasons:

- **Beginner rungs show their own exercise.** The push-up ladder's picture is a floor push-up, but its first rungs are
  wall, incline and knee push-ups; the squat ladder starts with chair squats and split squats; core training starts
  with dead bugs. Each of those rungs now has its picture (`art` on the template). Slow sit-to-stands (the squat
  ladder's rung 0) reuse `micro-strength`, which shows them. The side plank keeps the core ladder's forearm plank:
  four renders of "side plank" all drew a front plank or a leg raise.
- **Workouts show their first exercise's family.** A workout quest's picture follows the exercise it opens with:
  push, press, pull, squat, hinge, core or isolation (`move-<family>`). The workout ladder has no picture of its own.

| Key | Picture |
|---|---|
| `push-wall` | side view, full body, an adult man standing almost upright, leaning forward toward a wall, both palms flat on the wall at shoulder height, elbows bent, both feet on the floor a step back from the wall, a standing wall push-up in a bright hallway |
| `push-incline` | side view, full body, an adult woman doing an incline push-up, her hands gripping the front edge of a kitchen counter, both feet standing on the kitchen floor far behind her, her body one straight diagonal line from heels to head |
| `push-knee` | an adult doing push-ups from the knees on a yoga mat in a living room |
| `squat-chair` | wide shot, side view, full body from head to feet, an adult man doing a box squat in a living room: halfway down with knees bent, hips pushed back and hovering just above the seat of a wooden chair behind him, back straight and chest up, both arms stretched straight out in front at shoulder height |
| `squat-split` | wide shot, side view, full body from head to feet, an adult woman doing a split squat in a park, one foot forward and one foot back, the back knee lowering toward the grass, torso upright, hands on hips |
| `core-dead-bug` | an adult lying on their back on a mat doing the dead bug exercise, both arms reaching straight up toward the ceiling with open flat hands, knees lifted and bent at a right angle above the hips with shins level, one leg stretching out straight just above the floor |
| `move-push` | an adult pressing a pair of dumbbells up from a flat bench in a small home gym |
| `move-press` | an adult woman pressing two dumbbells overhead, standing tall in a garage gym |
| `move-pull` | side view, an adult man doing a one-arm dumbbell row: his left knee and left hand resting on a flat gym bench, back flat and level with the floor, right foot on the floor, his right arm pulling one dumbbell up beside his ribs |
| `move-squat` | an adult doing a goblet squat, one dumbbell held against the chest, in a gym |
| `move-hinge` | an adult doing a Romanian deadlift with dumbbells, back flat and hips pushed back |
| `move-core` | an adult doing hanging knee raises from a pull-up bar in a doorway |
| `move-isolation` | an adult doing dumbbell curls in front of a gym mirror |

The first wording of six subjects drew the wrong exercise (floor push-ups for wall push-ups, a woman lying on the
counter for incline push-ups, cropped heads, a dead bug with arms down); the table has the wording that worked. Name
the body position plainly ("standing almost upright", "hands on the edge", "full body from head to feet") and
ask for open hands, so no raised finger reads as a gesture.

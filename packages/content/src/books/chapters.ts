// The first books' chapters: our 27 stored story lessons in plain words (stored 2026-10-26, exported from the
// backup .backups/plain-words-2026-10-26T06-32-29-942Z.json for the base app, docs/2026-10-28-base-app.md "Read"), so
// they read offline without an account. Generated; edit the stories on the server, then export again.

export type Chapter = {
  title: string;
  subtitle: string;
  cast: string;
  story: readonly string[];
  why: { head: string; text: string };
  check: { question: string; options: readonly string[]; answer: number; why: string };
  lesson: string;
  tryToday: string;
  articleTitle: string;
};

export const CHAPTERS: Readonly<Record<string, Chapter>> = {
  "article-122": {
    "title": "The thousand-step ladder",
    "subtitle": "Small step increases count, one rung at a time",
    "cast": "jonah",
    "story": [
      "Jonah ends his shift at the depot and checks his watch. The count is low again. Ten thousand blinks at him from the goal screen like a wall he can't climb.",
      "On Monday he tries to hit the full goal in one go. By Wednesday his legs ache, his evenings are gone, and the goal screen still says he's a long way short.",
      "His friend Dee shrugs. Just count for a week, she says. See where you really are. So Jonah wears the watch and walks like he usually does, nothing more.",
      "His average is lower than he hoped. He adds a thousand steps to it, nothing more. That's a short loop after lunch and his sister's phone call taken on foot around the block.",
      "Some days he falls short. He just picks it up the next day. After two weeks the new number feels normal. He's still nowhere near ten thousand, but he isn't stuck at the bottom anymore either."
    ],
    "why": {
      "head": "Small step gains are linked to lower risk.",
      "text": "A 2023 pooled analysis of 17 cohort studies found each extra 1,000 daily steps went with a 15% lower risk of death from any cause. A 2025 review found benefits starting well below 10,000. These are observational studies with moderate evidence, so they show links, not proof."
    },
    "check": {
      "answer": 1,
      "options": [
        "Jump straight to ten thousand steps",
        "Hold this level for one to two weeks",
        "Add more steps every single day"
      ],
      "question": "Jonah now walks a steady thousand steps above his baseline. What should he do next?",
      "why": "The plan holds each level for one to two weeks so it feels normal before the next rise."
    },
    "lesson": "You don't need ten thousand steps; raising your count gradually from your baseline is linked to real benefits.",
    "tryToday": "Let your phone or watch count your steps today while you go about your normal day. It's the first day of finding your baseline.",
    "articleTitle": "Climb to More Steps, a Thousand at a Time"
  },
  "article-140": {
    "title": "Short, early naps",
    "subtitle": "Why a brief afternoon nap beats a long one",
    "cast": "tomas",
    "story": [
      "The baby was up three times last night. By early afternoon, Tomás is staring at the same email on his laptop at the kitchen table. He reads the first line again. It still doesn't make sense.",
      "On Monday he gave in and lay down on the sofa with no alarm. He woke over an hour later with a heavy head and a cold coffee. The rest of the afternoon felt like wading through mud, and that night he couldn't fall asleep.",
      "On Wednesday, just after lunch, he tries something smaller. He sets a phone alarm for fifteen minutes, lies down and closes his eyes. He isn't sure he even falls asleep.",
      "The alarm goes off. He sits up, opens the blinds and splashes his face at the sink. \"Okay,\" he mutters. \"Not bad.\"",
      "Back at the table, the email makes sense on the first read. He gets a couple of hours of clearer work before the tiredness creeps back. It isn't a full night's sleep, but he keeps the alarm set for Friday."
    ],
    "why": {
      "head": "Keep it short and early.",
      "text": "In a small lab study of 24 sleep-deprived young adults, a ten-minute afternoon nap gave the quickest boost, while a thirty-minute nap brought a groggy dip first. A review of 11 lab studies found naps give a small lift to thinking, mostly alertness, lasting up to about two hours, with naps before 1 p.m. doing better."
    },
    "check": {
      "answer": 1,
      "options": [
        "Lie back down for another hour",
        "Step into bright light or wash his face",
        "Give up on naps for good"
      ],
      "question": "Tomás feels foggy right after a nap. What should he try?",
      "why": "The article says bright light and washing the face helped people become alert again sooner after waking."
    },
    "lesson": "A short, early afternoon nap can sharpen you for a while; long or late naps often backfire.",
    "tryToday": "Early this afternoon, set an alarm for ten to twenty minutes and rest. Afterwards, note how you feel right away and an hour later.",
    "articleTitle": "The Ten-Minute Nap and the Hour That Backfires"
  },
  "article-141": {
    "title": "Focus by subtraction",
    "subtitle": "Before adding a fix, ask what you could remove",
    "cast": "priya",
    "story": [
      "Tuesday afternoon at the studio. Priya has a logo draft due, nine tabs open, and her phone buzzing beside the keyboard. She reads the same brief line three times.",
      "Her first idea is to add things. She downloads a new focus app, makes a fresh to-do list, and puts on a playlist. Now she has three more things to look after.",
      "Her colleague Sam glances over. What could you take away instead? Priya pauses. She hadn't thought of that. She writes down two things: the extra tabs, and the phone on her desk.",
      "She closes every tab but the brief and the design file. The phone goes into her bag. Before she leaves the moodboard half done, she writes a quick note: colours picked, fonts next.",
      "The next hour isn't perfect. Her mind still wanders once or twice. But she gets a clean first draft done, and when she opens the moodboard later, the note tells her exactly where to start."
    ],
    "why": {
      "head": "We forget that removing is an option.",
      "text": "In a 2021 study, only 40 of 98 people fixed a shaky Lego roof by removing one block. When told removing was free, 60 of 99 did. Separate studies found that planning how to resume interrupted work reduced the leftover attention that hurts the next task."
    },
    "check": {
      "answer": 0,
      "options": [
        "Write down two items she could remove",
        "Download a better task manager app",
        "Add a daily review meeting"
      ],
      "question": "Priya's to-do list feels overwhelming. What should she try first?",
      "why": "Ideas for removing rarely come on their own, so asking for them on purpose helps you find them."
    },
    "lesson": "When improving your focus, people usually add things, but taking something away often works better.",
    "tryToday": "Pick one area, like your phone's home screen, and before adding anything, write down two things you could remove.",
    "articleTitle": "Focus by Subtraction: Why We Forget to Take Things Away"
  },
  "article-142": {
    "title": "Quality over hours",
    "subtitle": "Why focused practice beats counting minutes",
    "cast": "priya",
    "story": [
      "Priya sits at her desk after work, sketching icons for a client deck. Her senior colleague's icons look clean and sure. Hers wobble.",
      "She decides to just put in the hours. Every evening she draws icons for an hour, any icons, and logs the time. After two weeks the log looks impressive. The icons look the same.",
      "On Sunday she tries something smaller. One target only: keeping her line weights even. Twenty minutes, then she lays her icons next to a set she admires and compares them.",
      "In her notebook she writes what she worked on and what she noticed. Corners too thick. Curves rushed. \"Slower on curves,\" she says to herself.",
      "A week of short sessions later, her line weights are steadier, though her icons still don't match her colleague's. She stops comparing and flips back through her own pages. They are a little better than last month."
    ],
    "why": {
      "head": "How you practise matters, not just how long.",
      "text": "A 2014 review of 88 studies found practice hours explained about 12% of skill differences, varying widely by field. A careful 2019 repeat of the violin study, with 39 students, found a weaker link than in 1993. Both sides of the debate now say practice quality should be measured."
    },
    "check": {
      "answer": 1,
      "options": [
        "Long daily sessions until she hits a set number of hours",
        "Short sessions, each with one target and a way to check it",
        "Copy her colleague's schedule exactly"
      ],
      "question": "Priya wants to improve her layouts this week. What should she plan first?",
      "why": "The article suggests a few short sessions, each with one clear target and quick feedback, rather than only counting time."
    },
    "lesson": "Practice helps everyone improve, but hours explain only part of skill, so focus on how well you practise.",
    "tryToday": "Pick one skill and do one short session with a single clear target, then write down what you worked on and what you noticed.",
    "articleTitle": "Ten Thousand Hours, Revisited: What Practice Really Explains"
  },
  "article-143": {
    "title": "Closing the day",
    "subtitle": "See where your hours go, and take today back",
    "cast": "tomas",
    "story": [
      "Half past ten. The baby is finally asleep, and Tomás sits on the sofa with his phone. He wonders where the evening went. The shelf he promised to fix is still leaning in the hall.",
      "He tells himself he will do it tomorrow. He said that last Tuesday too. The screws sit in a cup by the door, and every morning he steps around them.",
      "Tonight he tries something else. On the back of an envelope he jots down roughly where his waking hours went: calls, laundry, bottles, a long scroll after dinner. He just looks at it. No scolding.",
      "Then he gets up and spends ten minutes on the shelf. Just the first bracket. He puts the drill away before the noise can wake anyone.",
      "In bed he thinks of one good thing: the baby gripping his thumb at lunch. He whispers it to himself. That one counted. The shelf still leans, a little less. He sleeps more easily than he expected."
    ],
    "why": {
      "head": "Life is long if you use it.",
      "text": "This isn't a study. The Roman Stoic Seneca argued in essays and letters that life isn't short, we make it short by wasting it, and putting things off wastes the most. He advised treating each day as a whole life and ending each evening by telling yourself you have truly lived."
    },
    "check": {
      "answer": 1,
      "options": [
        "Wait for a quieter month to call properly",
        "Send a short message to his brother today",
        "Plan a long catch-up for when he retires"
      ],
      "question": "Tomás keeps saying he'll call his brother once things calm down. What would Seneca suggest?",
      "why": "Seneca held that today is the only time we control, so the first small step belongs today."
    },
    "lesson": "Life feels short because we give our time away, so spend today on purpose.",
    "tryToday": "Before bed, jot down roughly where your waking hours went, with curiosity, not judgment, then note one thing that made the day worth having.",
    "articleTitle": "Seneca's Time Audit: Why Life Feels Short"
  },
  "article-144": {
    "title": "Plan for plan B",
    "subtitle": "Name your weak spot and write the fallback first",
    "cast": "jonah",
    "story": [
      "Sunday night, Jonah pins his new running plan to the fridge. Three runs a week, after his shift. His friend Dev will join him on Thursdays at the park.",
      "By Wednesday it falls apart. A late route change keeps him on the bus till eight. He skips the run, then skips Thursday too, and forgets to text Dev, who waits by the gate.",
      "Jonah sits at the kitchen table with a pen. At the bottom of the plan he writes one line: late shifts are my weak spot. Under it: if late, ten minutes of stretching and a walk round the block.",
      "He texts Dev. Some Thursdays I'll be late. I'll message by five if it's off. Dev replies with a thumbs up.",
      "Two weeks on, he has missed the full run four times. Each time he does the short version instead. The plan is messier than the one on the fridge, but it is still going."
    ],
    "why": {
      "head": "Backups beat perfect plans.",
      "text": "Historical records show Shackleton's crossing failed, yet every man in the Endurance party survived after he made survival the goal and left instructions in case he didn't return. A 2025 study by one researcher argues he knew his ship was weak before sailing. An update never sent left a second team on an old timetable."
    },
    "check": {
      "answer": 1,
      "options": [
        "Push through to keep the streak going",
        "See a physio and make recovery the goal",
        "Drop running until the plan feels perfect"
      ],
      "question": "Jonah's knee starts hurting mid-week. What fits the idea best?",
      "why": "When conditions change, like pain, the article says change the goal to recovery and see a professional."
    },
    "lesson": "Plan for things going wrong: know your weak spot, write a fallback, and share changes.",
    "tryToday": "Pick one habit and write two lines: your weak spot, and the short version you'll do when the full session can't happen.",
    "articleTitle": "Shackleton's Endurance: Planning for the Plan to Fail"
  },
  "article-167": {
    "title": "Goal plus process",
    "subtitle": "Keep the result in view, and practise the part you control.",
    "cast": "jonah",
    "story": [
      "Sunday morning, after a week of early bus shifts. Jonah pins the flyer for the spring park race to the fridge. Under it he writes: finish under thirty minutes.",
      "Tuesday's run goes badly. There's wind on the hill and his legs feel heavy. He checks his watch every few minutes, sees he's slow, and walks home annoyed.",
      "That evening he keeps the flyer up but adds a second line under the target: easy shoulders, steady breathing. He can tick it off whether the run is fast or slow.",
      "Thursday he's nervous before setting off. Instead of counting his steps, he repeats one word to himself: smooth. At the top of the hill he lets his shoulders drop.",
      "His time is about the same as Tuesday's. But he ticks the box, and this time he walks home calm. Next week he'll try it on three runs and see how it goes."
    ],
    "why": {
      "head": "A clear goal works better with a how.",
      "text": "In one small study of 40 soccer players, the groups that combined outcome and process goals did best, and either type on its own did no better than no goals. Anxious skilled performers did better with a cue about the whole movement than one about a single part. Head-to-head evidence on goal types is still limited."
    },
    "check": {
      "answer": 1,
      "options": [
        "Think about exactly where his knees go",
        "Keep it smooth and relaxed",
        "Focus only on beating the runner ahead"
      ],
      "question": "Jonah feels nervous before a race. Which cue fits the article best?",
      "why": "Anxious performers did better with a process goal about the whole movement than with one about a single part."
    },
    "lesson": "Pair the outcome you want with a process goal you can control on every attempt.",
    "tryToday": "Write down one outcome you care about. Under it, add one process goal for the whole action, such as smooth and relaxed, and use it in your next session.",
    "articleTitle": "Win the Game or Win the Rep? Process vs Outcome Goals"
  },
  "article-20": {
    "title": "Rest that refuels",
    "subtitle": "Why the pause between sets powers the next one",
    "cast": "jonah",
    "story": [
      "Jonah is getting back into running, and on Saturdays he adds squats at the gym by the bus depot. Between sets he sits on the bench, eyes on the wall clock, feeling like he’s wasting time.",
      "So he rushes. A few breaths, then back under the bar. The first set goes fine. By the third his legs shake, and he sets the bar down well short of the reps he planned.",
      "The next Saturday he props his phone on the rack and starts a two-minute timer after each set. He breathes slowly, sips his water and leaves his messages alone.",
      "The wait feels long. But when the timer goes, his legs feel ready again. His last set comes out close to his first.",
      "He writes the rest time beside his reps in a small notebook. No big jump in strength yet. Just a workout that holds together all the way to the end."
    ],
    "why": {
      "head": "The pause refills your fuel.",
      "text": "A quick muscle fuel drains in a hard set and refills with rest: about half in thirty seconds, up to nine tenths within two minutes. Lifters resting three or five minutes, rather than one, tended to finish more reps across their sets. One review found no clear extra muscle growth beyond about ninety seconds, and the evidence is uncertain."
    },
    "check": {
      "answer": 0,
      "options": [
        "Time about two minutes, breathing slowly",
        "Thirty seconds, so his heart rate stays up",
        "Skip it, since sitting does nothing"
      ],
      "question": "Jonah’s next set of squats looks heavy. How should he rest first?",
      "why": "Most of his quick fuel comes back within about two minutes, so his next set starts closer to full."
    },
    "lesson": "The rest between sets refills your fuel, so time it instead of rushing back.",
    "tryToday": "On one main lift, time about two minutes of rest between sets and write your reps beside each one.",
    "articleTitle": "Rest Between Sets: The Pause That Builds Strength"
  },
  "article-21": {
    "title": "Guard the last cycle",
    "subtitle": "Why the end of the night holds the most REM",
    "cast": "tomas",
    "story": [
      "It’s his partner’s turn with the baby tonight. Tomás means to sleep, but he’s still at the kitchen table past midnight, laptop open, the monitor glowing beside a cold mug of tea.",
      "Then he sets his alarm an hour early to clear emails before the baby wakes. By lunch he reads the same line three times. His watch shows a sleep chart full of colours he can’t make sense of.",
      "On Sunday he tries something smaller. He picks one wake time for the week and counts back to a bedtime. No early alarm. The last stretch of the night stays his.",
      "Each morning he writes one line on a sticky note by the kettle: bedtime, wake time, and a score out of five for how rested he feels. He stops checking the chart on his watch.",
      "The baby still wakes him some nights, and a few scores stay low. But by Saturday the notes show something: the worst mornings mostly follow the late nights. That part, at least, he can change."
    ],
    "why": {
      "head": "The longest REM comes last.",
      "text": "Recordings by Aserinsky, Kleitman and Dement in the 1950s showed that a night runs in repeating cycles, usually four to six. Deep sleep is packed into the first half, while REM periods grow longer toward morning, so cutting a night short trims REM first. Links between single stages and their benefits remain uncertain."
    },
    "check": {
      "answer": 1,
      "options": [
        "Deep sleep, which fills the early night",
        "REM, which runs longest near morning",
        "A little from every stage evenly"
      ],
      "question": "Tomás sets his alarm an hour early. What does he mostly lose?",
      "why": "REM periods get longer through the night, and the longest comes just before waking, so an early alarm cuts it first."
    },
    "lesson": "Sleep runs in cycles, and cutting a night short takes the REM-rich end first.",
    "tryToday": "Pick one wake time for this week and count back to a bedtime that gives you a full night.",
    "articleTitle": "How Sleep Cycles Work: The Hidden Rhythm of Your Night"
  },
  "article-22": {
    "title": "Phone out of reach",
    "subtitle": "Why distance works better than willpower when you wake",
    "cast": "priya",
    "story": [
      "Priya’s alarm goes off on the pillow beside her. She hasn’t sat up yet, and she’s already scrolling: work chat, a news alert, a stranger’s portfolio. By the time she reaches her desk, her head feels crowded.",
      "She sets a morning limit on her apps. The next day it pops up and she taps straight past it. “Just one thing,” she mutters, and twenty minutes slip away.",
      "That night she charges her phone on the kitchen counter and digs out an old alarm clock. On a sticky note she writes the one task that matters most tomorrow.",
      "Morning comes and there’s nothing to grab. She drinks a glass of water, stretches and reads the note. For a while the only thing in her head is the header she has to fix.",
      "On Wednesday she walks to the kitchen half-asleep and picks up the phone anyway. She notices what pulled her in and tries again the next day. Not every morning is calm, but most now start with her task."
    ],
    "why": {
      "head": "Distance works better than willpower.",
      "text": "In a survey by Jolt, a company that sells a screen-time app, 68 percent of people with morning app limits overrode them within two minutes. Whether a phone nearby drains focus on its own is mixed: two later attempts to repeat that result failed. Treat distance as a hunch worth testing on yourself."
    },
    "check": {
      "answer": 2,
      "options": [
        "Turn off every notification for good",
        "Keep alerts on, with the phone face down",
        "Batch alerts into a few set times a day"
      ],
      "question": "Alerts keep pinging while Priya works. What setup helps her most?",
      "why": "People who got alerts in batches three times a day felt more attentive, while those with none at all felt more anxious."
    },
    "lesson": "Change the setup, not your willpower: keep your phone out of reach when you wake.",
    "tryToday": "Tonight, charge your phone away from your bed, and keep the first twenty minutes of tomorrow phone-free.",
    "articleTitle": "Winning Back Your Morning Focus"
  },
  "article-23": {
    "title": "Space it out",
    "subtitle": "Why reviews spread over days beat one long cram",
    "cast": "amara",
    "story": [
      "Amara has a biology quiz on Friday. On Thursday night she rereads her notes three times, highlighter in hand. By midnight every page feels familiar, and she goes to bed sure she’s ready.",
      "In the quiz, half the terms won’t come. “But I knew this,” she whispers, staring at a blank line as the clock ticks on.",
      "For the next quiz, ten days off, she tries something else. She writes ten questions on index cards and answers each one from memory before she flips it. Four right. It feels clumsy.",
      "She puts two more short sessions in her calendar, a few days apart. Each time she says the answer out loud before she checks. It never feels as smooth as rereading did.",
      "She jots each score in her notebook: four, then seven, then nine. On quiz day not everything comes easily, but more of it comes back than last time."
    ],
    "why": {
      "head": "Spacing works, even when it feels worse.",
      "text": "In one flashcard study, 90% of learners did better with spaced practice, yet after the first session 72% believed cramming had worked better. A major review found only 12 of 271 direct comparisons where spacing showed no benefit or did harm, so the evidence is unusually strong."
    },
    "check": {
      "answer": 0,
      "options": [
        "By what she can recall days later",
        "By how smooth the session felt",
        "By how familiar her notes look"
      ],
      "question": "Amara’s spaced session felt shaky. How should she judge if it’s working?",
      "why": "Cramming often feels better in the moment, so the honest test is what she can still recall later."
    },
    "lesson": "Spreading your reviews over days and testing yourself beats cramming, even though cramming feels better.",
    "tryToday": "Write ten questions on one topic, answer them from memory today, and put two short repeats in your calendar, in two and five days.",
    "articleTitle": "Spaced Repetition: Why Studying Less Often Beats Cramming"
  },
  "article-24": {
    "title": "Yours and not yours",
    "subtitle": "Spend your effort on what you steer, not on outcomes",
    "cast": "lena",
    "story": [
      "Since the new café opened across the street, Lena keeps glancing up from her counter. Every person who walks in over there feels like a customer she has lost.",
      "She cuts the price of her sourdough. She lies awake doing sums. On Tuesday she catches herself watching their door while her own dough rises too far.",
      "That evening, after closing, she turns over an order slip and draws a line down the middle. On the left, what is hers. On the right, everything else.",
      "The right side fills fast: the café, the rain, what people choose to buy. The left is shorter. Her bread, her hours, how she greets people, how she reads a quiet morning.",
      "She circles one thing on the left. “Warm loaves out by seven,” she tells the empty shop. The café stays busy, and some mornings are still slow. But Lena watches the window a little less."
    ],
    "why": {
      "head": "Only some things are up to you.",
      "text": "Epictetus, a teacher who was once enslaved, taught that only our actions and our judgments are up to us; outcomes, the past and others’ opinions are not. A 2025 trial of 119 adults without a diagnosis found two weeks of daily Stoic exercises left people with lower depression scores than a waitlist. It is a promising start, not proof."
    },
    "check": {
      "answer": 1,
      "options": [
        "Replaying the phone call all afternoon",
        "What she does next, and how she reads it",
        "Whether the customer ever comes back"
      ],
      "question": "A big order is cancelled the morning it’s due. Where should Lena put her effort?",
      "why": "Her actions and her reading of events are up to her. The past and the customer’s choices are not."
    },
    "lesson": "Put your effort into your own actions and judgments, and loosen your grip on outcomes.",
    "tryToday": "Tonight, sort one thing that bothered you into two columns, yours and not yours. Then pick one item from yours to act on tomorrow.",
    "articleTitle": "What Is Up to You: Epictetus and the Dichotomy of Control"
  },
  "article-25": {
    "title": "Question your wins",
    "subtitle": "An honest look at success keeps you learning",
    "cast": "lena",
    "story": [
      "Lena’s rye loaves have sold out every Saturday for years. When her new helper asks for the secret, Lena opens her mouth and finds she isn’t sure.",
      "“Practice,” she says, and leaves it there. But it nags at her all afternoon. Was it really her skill? Or the market crowd outside, and a very good flour supplier?",
      "Before bed she writes two lines in the back of her order book. Why it went well. What else might explain it. The second line runs longer than the first.",
      "So she goes back to the step she has always rushed: shaping. Ten quiet minutes before opening, ten more after she locks up, every day that week.",
      "By Sunday the loaves look the same to her customers. But Lena can feel a difference in her hands, and at fifty-two she is asking questions about dough again."
    ],
    "why": {
      "head": "A winning record isn’t proof of skill.",
      "text": "Miyamoto Musashi wrote that he won more than sixty duels by about twenty-eight, though no outside record confirms it. Around thirty he decided the wins did not prove he understood strategy. He kept training morning and evening and, by his own account, only grasped it at fifty."
    },
    "check": {
      "answer": 2,
      "options": [
        "Take it as proof she has mastered soup",
        "Change nothing, since it clearly works",
        "Ask if it was skill, luck or the cold snap"
      ],
      "question": "Lena’s new soup sells out all week. What does the lesson suggest she do first?",
      "why": "A good run can come from luck or easy conditions. Checking the real cause shows what still needs practice."
    },
    "lesson": "Treat a run of success as a clue to check, and keep practising long after it.",
    "tryToday": "Pick one thing that has gone well lately and write two lines: why you think it worked, and what else could account for it.",
    "articleTitle": "Musashi's Cave: What an Unbeaten Swordsman Learned Late"
  },
  "article-27": {
    "title": "The middle dip",
    "subtitle": "Why motivation sags midway, and how to keep going",
    "cast": "tomas",
    "story": [
      "Three weeks ago Tomás started a walk after lunch, pushing the pram round the block. The first week felt great. Today he looks at his shoes by the door and stays at his desk.",
      "Then the baby has a rough night and he skips two more days. “Typical,” he mutters. He starts to think the whole plan was a silly idea.",
      "That evening he writes a sticky note for the front door: if I close the laptop for lunch, then the pram comes out. He saves his favourite podcast for the walk and nothing else.",
      "The next day he goes, even though it is only ten minutes. He doesn’t call it starting over. He calls it coming back.",
      "The walk still isn’t automatic. Some days feel heavy, and he misses another one that week. But this time he is out with the pram the next afternoon, no lecture to himself first."
    ],
    "why": {
      "head": "The middle of a goal often sags.",
      "text": "A 2011 study found motivation can sag around a goal’s halfway point, when each new step feels small. A 2006 analysis of 94 studies found if-then plans gave a medium to large boost to reaching goals, though less for hard, long-term ones, and later work suggests that average may be overstated."
    },
    "check": {
      "answer": 0,
      "options": [
        "Go again tomorrow without scolding himself",
        "Wait until his motivation comes back",
        "Be tough on himself so it won’t happen again"
      ],
      "question": "Tomás misses a few walks in a row. What should he do next?",
      "why": "Scolding yourself over slips was linked to giving up. Coming back after a miss, kindly, is the move worth backing."
    },
    "lesson": "A dip in the middle of a goal is normal, so plan your return and treat slips kindly.",
    "tryToday": "Write one if-then plan for your hardest habit: a time, a place and the first tiny step. Stick it where you’ll see it.",
    "articleTitle": "The Week Three Slump and What Carries You Past It"
  },
  "article-28": {
    "title": "Plan an easy week",
    "subtitle": "Why training lighter on purpose can keep you going",
    "cast": "jonah",
    "story": [
      "Jonah is six weeks into a gym plan, squats twice a week to help his running. Lately the bar feels heavier than it should, and his knees grumble every time he climbs into the bus.",
      "His first idea is to push harder. On Friday he adds weight, grinds out every rep, and drags himself through his Saturday run feeling worse, not stronger.",
      "On Sunday he flips through his notebook. Six weeks straight, no easier stretch at all. So he plans one: same days, one set fewer on each exercise, a lighter bar.",
      "It feels almost too easy. “Am I going backwards?” he asks a friend at the depot. He keeps going anyway, and jots down how he sleeps and how his knees feel.",
      "His first heavy session back is no record, just solid. But the aches have settled, and for the first time in weeks he is looking forward to the gym."
    ],
    "why": {
      "head": "Easier on purpose, not a full stop.",
      "text": "Every one of 246 competitive strength and physique athletes in a voluntary survey said they used deloads, mainly to manage fatigue. That shows they are common, not that they work. In one trial of 39 lifters, a week fully off left muscle gains similar but strength gains smaller than training straight through."
    },
    "check": {
      "answer": 1,
      "options": [
        "A full week off, with no training at all",
        "Same days, with fewer sets and lighter weights",
        "Rest on whichever days he feels tired"
      ],
      "question": "Jonah plans his first deload week. Which plan matches what coaches usually do?",
      "why": "Coaches most often cut sets and reps or ease the effort. A deload is easier training, not a full stop."
    },
    "lesson": "A short, planned week of easier training can help you manage fatigue and keep going.",
    "tryToday": "Count how many weeks you’ve trained hard without an easier stretch. If progress has stalled and aches are rising, sketch a lighter week: fewer sets, same days.",
    "articleTitle": "Deload Weeks: Why Strong Lifters Plan to Train Easier"
  },
  "article-29": {
    "title": "Light sets the clock",
    "subtitle": "How morning light keeps your body clock on time",
    "cast": "mika",
    "story": [
      "Mika has a week off after a run of night shifts, and she wants it to feel like real days. But at two in the morning she is wide awake, phone glowing, kitchen light on.",
      "She sleeps until noon behind thick curtains, stays inside all afternoon, and lies awake again that night. Her days off keep sliding later.",
      "The next morning she sets an alarm, makes coffee and carries it out to the small balcony. The sky is grey. She stands there anyway for a few minutes.",
      "That evening she turns off the ceiling light and reads by a lamp, phone across the room. The next morning it is coffee on the balcony again, and the morning after that.",
      "It isn’t a cure. One night she still lies awake for a while. But by the end of the week she is yawning before midnight, and waking up feels less like a fight."
    ],
    "why": {
      "head": "Morning light pulls your clock earlier.",
      "text": "Your body clock runs a little longer than a day and needs light to stay on time: morning light tends to pull it earlier, evening light pushes it later. In a diary study of 103 adults, days with morning sun came with better reported sleep, though research here is still limited."
    },
    "check": {
      "answer": 2,
      "options": [
        "One long session in the sun at the weekend",
        "Bright kitchen lights instead of going outside",
        "A few minutes outdoors every morning, even if cloudy"
      ],
      "question": "Mika wants her week off to run on daytime. What should she try?",
      "why": "Outdoor light beats indoor light even on cloudy days, and steady daily timing seems to matter more than a long weekend dose."
    },
    "lesson": "A little morning light each day, and dimmer evenings, can help keep your body clock on time.",
    "tryToday": "Tonight, dim the main lights an hour before bed. Tomorrow, step outside for a few minutes early in your day, even if it’s cloudy.",
    "articleTitle": "Morning Light: The Daily Reset Button for Your Body Clock"
  },
  "article-30": {
    "title": "Choose when to scroll",
    "subtitle": "Skip the brain reset and give one habit set times",
    "cast": "amara",
    "story": [
      "It is Saturday morning. Amara’s reading for the week lies open on her dorm desk, but her thumb keeps sliding back to the video app on her phone.",
      "A clip promises a fix: one weekend with no fun at all, and her brain will reset. So she deletes every app, mutes the group chat and sits in silence.",
      "By Sunday night she is bored, a bit lonely and no sharper. She puts everything back and scrolls until one in the morning.",
      "On Monday she tries something smaller. Only the video app, and only at set times: twenty minutes after lunch, twenty after dinner. The group chat stays on.",
      "In between, when her thumb drifts toward it, she notices the pull and waits. “After dinner,” she tells herself. Some days she opens it anyway.",
      "It is not a new brain. But by Friday Amara has worked through her reading on three evenings, and waiting out the pull feels a little easier."
    ],
    "why": {
      "head": "Limit the habit, don’t starve the brain.",
      "text": "Cutting out fun does not drain your dopamine, and there is little evidence a break resets the brain. In one randomised trial, people who kept phone screen time to two hours a day or less for three weeks saw well-being rise 14 percent. They knew which group they were in, so it is a hopeful sign, not proof."
    },
    "check": {
      "answer": 2,
      "options": [
        "Delete every app and stay offline all weekend",
        "Quit all social media for a couple of days",
        "Give one app set times and wait out urges"
      ],
      "question": "After exams, Amara wants to cut back on scrolling. Which plan is most likely to help?",
      "why": "Set times for one habit, plus pausing on impulse, is the useful core. Short, total breaks look less helpful."
    },
    "lesson": "Your brain won’t reset in a weekend, but giving one impulsive habit set times can help.",
    "tryToday": "Pick one app that pulls you on impulse and give it set times today, such as twenty minutes after lunch and twenty after dinner.",
    "articleTitle": "Dopamine Detox: What Overstimulation Research Really Shows"
  },
  "article-31": {
    "title": "Close the book",
    "subtitle": "Why recalling beats rereading for ideas that last",
    "cast": "priya",
    "story": [
      "Priya’s team wants every designer certified in accessibility, and her exam is in two weeks. Each lunch she rereads her highlighted guide. It all looks familiar.",
      "On Wednesday a developer asks her a simple question about colour contrast. She knows she has read it. “Give me a second,” she says. Nothing comes.",
      "That evening she tries something else. She shuts the guide, takes a blank page and writes out all she can recall in five minutes.",
      "Then she opens the guide and checks. Maybe half of it is right. She circles the gaps in red. They show her exactly what to look at next.",
      "Two days later she runs the same blank-page check. It still feels clumsy, harder than rereading, but fewer things end up circled.",
      "When the developer asks about focus states on Friday, Priya answers without opening anything. She still forgets a couple of rules, but now she knows which ones."
    ],
    "why": {
      "head": "Pulling it out beats reading it again.",
      "text": "In a classic experiment, students who wrote down what they could recall of short passages did worse than rereaders on an immediate test, but better two days and a week later. A 2017 review of 118 articles found a moderate to large benefit in classrooms as well as labs. Gains were smaller in some real courses."
    },
    "check": {
      "answer": 0,
      "options": [
        "Close the guide and write what she remembers",
        "Reread and highlight the guide twice more",
        "Turn the guide into a detailed concept map"
      ],
      "question": "Priya has a new design tool to learn this week. What is her best move tonight?",
      "why": "Recalling from memory, then checking the gaps, helps ideas stay longer than reading them again."
    },
    "lesson": "Pulling ideas back from memory helps them last longer than rereading them.",
    "tryToday": "After reading something you are learning, close it, write what you remember for five minutes, then check what you missed.",
    "articleTitle": "Why Testing Yourself Beats Rereading Your Notes"
  },
  "article-32": {
    "title": "Notes to self",
    "subtitle": "A three-line evening log, borrowed from an emperor",
    "cast": "tomas",
    "story": [
      "It is nine at night and the baby is finally asleep. Tomás is still stuck on the afternoon call, when the crying started and he lost his thread.",
      "He was short with Sam from work afterwards, over a small slip in a shared file. Lying awake, he promises to be calmer tomorrow. He promised that yesterday.",
      "So he takes a small notebook from the kitchen drawer and writes three short lines. What he couldn’t control. How he treated someone. What he judged too fast.",
      "The first line is easy: the baby cried, as babies do. The second one stings. He writes that he owes Sam a kinder word, and sends a message in the morning.",
      "Most nights the notebook says the same few things in new words. On Thursday he writes “babies cry” yet again and almost laughs.",
      "On Sunday Tomás reads the week back. He still snapped once, on Friday. But he picks one line to carry into next week: slow down before deciding."
    ],
    "why": {
      "head": "A private log is practice, not a book.",
      "text": "Marcus Aurelius probably wrote the Meditations in the early 170s, as private notes while leading armies on the Danube. The entries circle back to the same few ideas, more like a training log than a finished book. Pierre Hadot later read them as three rules: accept what happens, treat people justly, judge carefully."
    },
    "check": {
      "answer": 1,
      "options": [
        "His log has gone stale and needs new ideas",
        "The practice is doing its job",
        "The log isn’t working, so he should stop"
      ],
      "question": "Tomás writes the same reminder five nights in a row. What does that mean?",
      "why": "Marcus kept circling back to the same few ideas. Repeating a reminder is how it gets practised."
    },
    "lesson": "Short, private notes to yourself, even repetitive ones, work like a training log for how you live.",
    "tryToday": "Tonight, write three lines: something you couldn’t control, how you treated someone, and one judgement you made too fast.",
    "articleTitle": "Marcus Aurelius: The Emperor Who Kept a Training Log"
  },
  "article-33": {
    "title": "Rules you can check",
    "subtitle": "Turn vague promises into small rules you can track",
    "cast": "lena",
    "story": [
      "Every January, Lena promises herself she will slow down and be kinder at the bakery. By March she is back to eating lunch standing at the counter.",
      "This year she tries something plainer. On the back of an order pad she writes four qualities, and for each one a rule she can check by evening.",
      "Rest: sit down for lunch, away from the counter. Patience: no sighing when the new helper asks a question. She makes rest the one focus for this week.",
      "She draws a small grid and pins it inside the pantry door. Each night she adds a dot for every slip. By Wednesday the rest row is crowded with them.",
      "Over coffee, her friend Rosa mentions that Lena never lets anyone else lock up. Lena laughs, then adds it to the list. She had not seen that one.",
      "On Sunday she looks over the grid for two minutes. Plenty of dots. But she sat down for lunch on three days, and next week patience gets its turn."
    ],
    "why": {
      "head": "One checkable rule, one focus a week.",
      "text": "In his twenties, Benjamin Franklin gave each of thirteen virtues a short rule he could check, then gave one virtue a week his full attention, marking a black spot for each fault. A full round took about 13 weeks. He never reached perfection, but by his own account the effort left him better and happier."
    },
    "check": {
      "answer": 0,
      "options": [
        "Every tool back on its hook before closing",
        "Be a tidier, more organised person",
        "Work on tidiness and every other quality at once"
      ],
      "question": "Lena adds tidiness to her list. Which rule fits Franklin’s method best?",
      "why": "Franklin wrote a short rule for each virtue, something he could check at the end of the day."
    },
    "lesson": "Give each quality a short rule you can check daily, and focus on one at a time.",
    "tryToday": "Pick one quality you care about, write one short rule for it, and tonight mark a dot if you slipped.",
    "articleTitle": "Franklin's Thirteen Virtues and the Notebook of Black Spots"
  },
  "article-34": {
    "title": "Park the loose ends",
    "subtitle": "A weekly plan and debrief to quiet a busy head",
    "cast": "tomas",
    "story": [
      "It is Sunday evening and the house is quiet. Tomás opens a book, but his mind keeps tapping him: the unanswered email, the skipped run, a form due Thursday.",
      "He tries to push it all away and turns the page. Then he turns it back. He has read the same paragraph three times.",
      "So he gives himself half an hour at the kitchen table. On one page he writes every loose end he can think of, and beside each, a next step and a time.",
      "Email: reply Monday at nine. Form: Tuesday after lunch. Nothing is done yet, but the page is holding it now, and the tapping goes quieter.",
      "Then three questions. What went well: two walks with the pram. What got in the way: calls that ran late. One change: no calls after five.",
      "Monday is not perfect, and a call still runs over. But the next Sunday at six, Tomás sits down with the same three questions, and the page fills faster."
    ],
    "why": {
      "head": "Plan the loose ends, then debrief.",
      "text": "In a set of experiments, making a concrete plan for an unfinished goal stopped it crowding other tasks, without finishing it. A meta-analysis of 46 samples found debriefs improved effectiveness by about 25 percent, for individuals as well as teams. The full weekly review rests mostly on people’s own reports."
    },
    "check": {
      "answer": 2,
      "options": [
        "Keep reminding himself so he won’t forget",
        "Push it out of his mind and keep reading",
        "Write down a next step and a time for it"
      ],
      "question": "On Sunday night a task nags Tomás, but it can’t be done until Tuesday. What helps most?",
      "why": "A concrete plan lets the mind set an unfinished goal down until the time you chose."
    },
    "lesson": "A weekly review that plans loose ends and debriefs the week can quiet your mind and help you learn.",
    "tryToday": "Write every loose end on one page, then give each one that matters a next step and a rough time.",
    "articleTitle": "The Weekly Review: Your Save Point Between Quests"
  },
  "article-35": {
    "title": "Question the thought",
    "subtitle": "Test a limiting belief like a fair judge",
    "cast": "amara",
    "story": [
      "Amara opens her first statistics problem sheet in the library. Before she reads a line, the old thought turns up: “I’m just not a numbers person.”",
      "It feels less like an opinion and more like a fact about her, like her height. She scrolls her phone for a while, then packs up with the sheet still blank.",
      "The next evening she writes the thought at the top of the page, word for word. On paper it looks less like a fact and more like a claim someone made.",
      "She questions it like a fair judge. Has it always been true? Not in algebra last year, once a friend explained it slowly. She writes a fairer version: “Numbers take me a while to start.”",
      "Then one small test: ten minutes on the first problem, and one question in Friday’s tutorial. She texts her friend Bea the plan. Bea replies, “Same. Library at four?”",
      "Amara gets the first problem half right, and her question turns out to be half the room’s question. The old thought still shows up. Now it has an answer written under it."
    ],
    "why": {
      "head": "A thought is a claim you can test.",
      "text": "In a study of 55 adults in therapy for depression, sessions where the therapist asked more questions to test their thoughts were followed by bigger drops in symptoms. A study of 123 clients found their thinking shifted first, then symptoms eased. These are a few modest studies, so treat it as one useful tool, not a cure."
    },
    "check": {
      "answer": 2,
      "options": [
        "Tell herself firmly that she’s great at essays",
        "Wait until she feels confident before starting",
        "Write the thought down and weigh the evidence"
      ],
      "question": "Amara’s next thought is that she’s hopeless at essays. What should she try first?",
      "why": "Checking a thought like a fair judge puts it to the test. Forced positive thinking and waiting both skip the test."
    },
    "lesson": "Treat a limiting belief as a claim to question, then test a fairer version with one small action.",
    "tryToday": "Write down one belief that shows up when you start something hard, then ask what supports it and when it wasn’t true.",
    "articleTitle": "Questioning the Beliefs That Hold You Back"
  },
  "article-36": {
    "title": "Steady, not heroic",
    "subtitle": "Why short, regular sessions outlast big bursts of effort",
    "cast": "mika",
    "story": [
      "Mika finishes her third night shift in a row and sleeps until two. On her day off she goes to the gym to make up for it: an hour and a half, every machine.",
      "Her legs ache on the ward stairs for three days. Then the rota changes, the gym bag stays in the car, and two weeks go by without a single session.",
      "This time she plans smaller. She marks two afternoons a week on the calendar by the fridge: twenty minutes each, same gym, always starting on the bike.",
      "Under it she writes a busy-week version. If a run of shifts takes over, she still does both sessions, ten minutes each, and keeps the effort honest.",
      "Some sessions feel flat. One week she misses one and simply goes to the next. Twenty minutes is small enough to manage even after a bad night.",
      "By the sixth week it isn’t automatic yet. But Mika packs the bag without thinking about it, and she adds a third afternoon to the calendar."
    ],
    "why": {
      "head": "Habits grow from repeats, not heroics.",
      "text": "In one study of new gym members, at least four sessions a week for six weeks was the minimum for exercise to become a habit: 61.5% of the more frequent group formed one, against 44.8% of the less frequent group. Consistency predicted habit growth best. It is one study, so treat the numbers as a guide."
    },
    "check": {
      "answer": 0,
      "options": [
        "Fewer or shorter sessions at the same effort",
        "Every session as planned, but much easier",
        "Two weeks off, then a fresh start"
      ],
      "question": "A packed rota week is coming. How can Mika protect her fitness?",
      "why": "In a review, training less often or for less time held fitness steady, as long as the effort stayed the same."
    },
    "lesson": "Short, regular sessions you can sustain build the habit and keep your gains.",
    "tryToday": "Put two or three short sessions in your calendar this week, each small enough to do on a tired day.",
    "articleTitle": "Why Steady Training Beats Hard Bursts"
  },
  "article-37": {
    "title": "Your caffeine cut-off",
    "subtitle": "Give caffeine time to clear before you sleep",
    "cast": "mika",
    "story": [
      "It is four in the morning on the ward. Mika’s eyes sting, so she gets the biggest coffee from the machine and pushes through the last rounds.",
      "At nine she is home with the blinds down, tired but strangely wired. “Coffee doesn’t touch me,” she tells her flatmate. She is still awake at eleven.",
      "Her flatmate asks when she had the cup. Mika counts back: five hours before bed. It felt long finished. Maybe it wasn’t.",
      "So she sets a cut-off: no coffee after the midnight break. If she wants something warm later in the shift, she makes black tea instead.",
      "She keeps a notebook by the bed. Each time she wakes, she writes three things: last caffeine, how long sleep took to come, how rested she feels.",
      "A week of notes is mixed. A noisy neighbour spoils one sleep. But the notes show that on most cut-off days Mika falls asleep sooner. Her gut never told her that."
    ],
    "why": {
      "head": "Caffeine lingers longer than it feels.",
      "text": "Caffeine’s half-life runs from about two to ten hours, largely down to genes. A review found caffeine cut total sleep by 45 minutes on average, and estimated a standard coffee should be finished at least 8.8 hours before bed. Researchers in one small trial also noted people may misjudge how caffeine affects their own sleep."
    },
    "check": {
      "answer": 1,
      "options": [
        "Her usual coffee, since she feels fine",
        "Black tea or a decaf",
        "A double espresso, since it’s small"
      ],
      "question": "Late in a shift, Mika wants a warm drink. Which fits her cut-off best?",
      "why": "Black tea didn’t cut total sleep in the review. Feeling fine isn’t proof, and a late espresso can shift the body clock."
    },
    "lesson": "Give caffeine time to clear: set a cut-off well before bed and check it against your sleep.",
    "tryToday": "Pick a coffee cut-off about nine hours before your bedtime, and when you wake, note your last caffeine and how you slept.",
    "articleTitle": "Your Afternoon Coffee Is Still Awake at Bedtime"
  },
  "article-55": {
    "title": "Plan the weak day",
    "subtitle": "A main plan and a tiny backup for the day you slip",
    "cast": "jonah",
    "story": [
      "Jonah runs fine on Mondays. Thursdays are another story: the late route, a stiff back from the driver’s seat, and by eight the couch has won again.",
      "He tells himself to push through. It works when he is fresh. On Thursdays it never does, and the miss starts to feel like a rule.",
      "So he gets specific. On a card in his lunch box he writes Plan A: if I clock off on Thursday, then I change at the depot and run the canal path before driving home.",
      "Then Plan B, for the likely snag: if I’m wiped out, then I jog to the first bridge and decide there. He reads both lines once over breakfast.",
      "Thursday comes and he is wiped out, so it’s Plan B. At the bridge he keeps going a little, slow and short. The next Thursday a breakdown keeps him late, and he misses.",
      "On Friday he nearly writes the whole week off. He runs instead, and adds a line: if I’m late, then ten minutes of stairs at home. Thursday is no longer a sure loss."
    ],
    "why": {
      "head": "Plan the weak day before it comes.",
      "text": "A 2006 review pooling 94 tests with more than 8,000 people found if-then plans had a medium-to-large effect on follow-through. In one study of 211 heart patients, those who made both a main plan and a plan for beating expected obstacles did more exercise two months after leaving hospital. It is one study in one setting."
    },
    "check": {
      "answer": 2,
      "options": [
        "Push through the full run, however tired",
        "Promise to feel more motivated next time",
        "If I’m wiped out, run five minutes, then decide"
      ],
      "question": "Which Plan B suits Jonah’s most tired Thursdays?",
      "why": "A good Plan B is a specific if-then step, small enough to do on a bad day."
    },
    "lesson": "Before your weak day comes, write a specific if-then plan and a tiny backup for the likely obstacle.",
    "tryToday": "Name the day your habit usually slips, then write one if-then line for it and one tiny backup line.",
    "articleTitle": "Plan A and Plan B for the Days You Usually Slip"
  },
  "article-56": {
    "title": "Tell one person",
    "subtitle": "It depends on who listens and what you report",
    "cast": "jonah",
    "story": [
      "At Sunday lunch, Jonah tells the whole table he’s getting back into running. His sister cheers. He drives home already feeling like a runner.",
      "The new shoes sit by the door all week. Saying it out loud felt so good that the running itself seemed less urgent.",
      "Two weeks later he tries again, differently. He tells one person: Sam, who coaches the club in the park. And he promises a log, not a plan.",
      "Every Sunday he sends Sam a photo of his notebook, one short line per run. Sam always answers the same way: “Nice. Same again?”",
      "Some weeks the page has just one line. But by the fifth Sunday, Jonah doesn’t want to send it empty. On a rainy Wednesday he laces up anyway, because Sunday is coming."
    ],
    "why": {
      "head": "Saying it can feel like doing it.",
      "text": "In a 2009 paper by Peter Gollwitzer and colleagues, people deeply attached to an identity goal tried less hard once others noticed their plans, though samples were modest. Later work found sharing helped when the listener had higher status or was close to them. A review of 138 studies found tracking paid off most when written down and shared."
    },
    "check": {
      "answer": 0,
      "options": [
        "A coach he respects, who checks in",
        "Someone newer to running than he is",
        "Nobody, so the goal stays private"
      ],
      "question": "Jonah wants someone to see his weekly running log. Who is the best pick?",
      "why": "Sharing with someone of higher status went with more commitment. Sharing with someone of lower status made no difference."
    },
    "lesson": "Choose your listener with care, and share what you did, not just what you plan.",
    "tryToday": "Pick one small goal and one person you look up to, and send them a short weekly update on what you did.",
    "articleTitle": "Should You Tell People About Your Goals?"
  },
  "article-9": {
    "title": "Progress you can see",
    "subtitle": "Why small steps forward keep you going on hard days",
    "cast": "priya",
    "story": [
      "Priya’s lead sends back her sign-up screens with a long list of comments. She reads them at her desk, cheeks hot. It feels like the whole week just vanished.",
      "On the bus home she scrolls the list again. “I’ve got nothing done,” she texts a friend. That evening she doesn’t open the file at all.",
      "Before bed she tries one small thing. In her notes app she writes the setback in a line: “Screens sent back.” Under it, what she did finish: “Button sizes fixed.” Then one tiny next step: “Header spacing.”",
      "Each evening that week she adds a line or two. It never takes more than a couple of minutes. Some lines are very small. One just says: “Renamed the layers.”",
      "By Friday half the comments are still open. But when she scrolls her notes, she can see the week went somewhere. On Monday she opens the file with a little less dread and starts with the header."
    ],
    "why": {
      "head": "Small steps forward lift the whole day.",
      "text": "Teresa Amabile and Steven Kramer collected close to 12,000 diary entries from 238 people on creative teams. Making headway on meaningful work, often in small ways, lifted mood and drive more than any other kind of event. Setbacks hit harder still: one summary puts their pull at about five times that of good events."
    },
    "check": {
      "answer": 2,
      "options": [
        "Fix every comment before she sleeps",
        "Wait to write notes until a real win",
        "Note the setback, then one tiny next step"
      ],
      "question": "Priya’s design gets sent back again. What helps her most that evening?",
      "why": "Setbacks feel heavier than they are. Naming it as one event, then writing a tiny next step, keeps her moving."
    },
    "lesson": "Seeing small steps forward on work that matters is what keeps you going.",
    "tryToday": "Before bed, take two minutes to note one step that moved forward today, even a tiny one.",
    "articleTitle": "The Progress Principle: Why Small Wins Keep You Going"
  }
};

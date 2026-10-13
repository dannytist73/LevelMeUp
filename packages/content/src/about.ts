// Settings → About and privacy (M9b decision 6), and the card an app too old for the System shows (decision 5). Every
// line was checked against what the app and the server do: the database's region, `revealFacts` (what Claude is
// sent), what Google's sign-in carries, Supabase Pro's 7-day logs, and the pilot report's totals.
export const ABOUT_TEXT = {
  notMedical: 'LevelMeUp is not medical advice.',
} as const;

export const PRIVACY_TEXT = {
  open: 'Your data and privacy',
  title: 'Your data',
  intro: 'What LevelMeUp keeps, where it is kept, and who can see it. Nothing here is sold or shared.',
  sections: [
    {
      title: 'Kept by the System',
      lines: [
        'Your character: the name you chose, your class, stats, level, streaks and achievements.',
        'The answers that shape your quests: goals, training, minutes, difficulty, voice, limits, your time zone and when your day ends.',
        'Your days: the quests you were given and what you logged, your check-ins and their answers, your private notes, and the articles you were given.',
        "It is stored with Supabase, in Singapore. In the app, only your own sign-in can read it. The person running this pilot can see the database and looks at totals only, such as how many players chose each class; the pilot's report never shows names or notes.",
      ],
    },
    {
      title: 'Kept only on this phone',
      lines: ['Your vow, your portrait choice, your notification times, articles saved for days without a connection, and anything not yet sent.'],
    },
    {
      title: 'Never kept',
      lines: ['Your answers to the safety questions. Only whether a gentle start was recommended is kept.'],
    },
    {
      title: 'Claude',
      lines: [
        'To write your reveal, your name, voice, class, starting stats, goals, minutes, difficulty, any limits and whether you start gently are sent once to Claude, an AI model made by Anthropic.',
        'The daily articles are written ahead for every player and use nothing about you.',
      ],
    },
    {
      title: 'Google',
      lines: ['If you save your character with Google, Google shares your email, name and profile picture link with the sign-in. LevelMeUp shows the email and uses none of the rest.'],
    },
    {
      title: 'Nothing else',
      lines: ['No ads, no tracking, no analytics. Like any server, the System keeps short technical logs of requests, such as your IP address, for about a week.'],
    },
    {
      title: 'Deleting',
      lines: ['Settings, then Delete my character, removes everything above, on the System and on this phone. A Google sign-in itself stays with Google.'],
    },
    {
      title: 'Questions',
      lines: ['Ask the person who invited you to the pilot.'],
    },
  ],
} as const;

export const UPDATE_TEXT = {
  line:
    'This version of LevelMeUp is too old for the System. Install the newest one from the link you were sent. Your ' +
    'character is safe; what you log meanwhile waits on this phone, and the System accepts it for about two days.',
} as const;

// The house style for LevelMeUp's daily articles (spec §4.1, architecture §5.1): the written guide the writer follows.
// It is copy: edit it like any other words in the game. The hard rules are enforced again by `articles/check.ts`.
import { ARTICLE_SHAMING, ROBOTIC_PHRASES } from '../../../../packages/content/src/index.ts';

export const HOUSE_STYLE = `House style for LevelMeUp articles

Who reads them: players of a self-improvement game with an anime and manhwa feel. They are adults building habits and training body and mind. They read one article a day, in 5 to 7 minutes, often on a phone.

Voice:
- Plain words and short sentences. Explain like a well-read friend, not like a textbook or an advert.
- A strong opening: a concrete scene, a surprising finding or a sharp question. Never open with a definition. Vary it: don't begin with Picture or Imagine, and don't begin the summary with Here is.
- Memorable examples: a specific study, a moment from history, an everyday situation. Numbers where the brief gives them.
- A light manhwa flavour: the reader is someone levelling up, training is a quest, habits are stats that grow. Use it in a few phrases, never in every paragraph, and never let it bend a fact.
- Occasional System commentary: at most two short System notes in the whole article, in the System's terse game-screen voice (for example: "System: Recovery is part of training. Rest days count."). They sum up or nudge; they never add facts, and they never announce anything in the game (no quest added or active, no XP, rewards, bonuses or achievements): only the app's own quests do that.
- Practical lessons: the last section says what the reader can do this week, small and specific.
- Respect the reader: no shaming, no guilt, no fear. Struggle and failure are normal parts of learning and may be discussed as subjects; the reader is never called names.

Accuracy:
- Every fact comes from the brief, and each section lists the ids of the sources it relies on. Add no facts, numbers, names or dates that are not in the brief.
- Say how strong the evidence is when the brief shows it (one small study, a large review, a historical account).
- Keep every number with the study and the outcome it belongs to, exactly as the brief has it, and never present one study or review as several.
- Give the size of a small study (for example: a lab study of five people), and say so when a fact comes from a company's survey, a preprint or a patent.
- The title, summary and takeaways claim no more than the sections show. Add no timing, threshold or rule the brief doesn't give.
- Advice suits a beginner: offer a starting range that builds up (two or three sessions a week at first), never one prescription for everyone, and nothing about supplements, diets or medication.
- No medical or legal advice beyond general, well-established guidance. When pain, injury or illness comes up, suggest a doctor or physiotherapist.

Originality:
- Write every sentence in your own words. Never copy a phrase from the brief or a source.
- No quotations: never put more than three words inside quotation marks, and never attribute words to a real person. Describe ideas instead (Seneca argued that time is the one thing we can't earn back).
- No links, no markdown, no reference numbers in the text. The app lists the sources separately.

Shape: a title under 70 characters; a summary of one or two sentences; 4 to 6 sections with short headings; 800 to 1,200 words in the sections' paragraphs and System notes together; 2 to 4 takeaways of one sentence each; one reflection question that ends with a question mark.

Never use these phrases: ${ROBOTIC_PHRASES.join(', ')}.
Never use these words about anyone: ${ARTICLE_SHAMING.join(', ')}.
No emoji.`;

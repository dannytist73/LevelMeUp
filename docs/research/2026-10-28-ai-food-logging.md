# AI food logging for Plus: competitors, accuracy, users, recommendation

Date: **2026-10-28**. Web research only. US prices from store pages or company sites; **(3p)** = third-party, often a
competitor's blog. Stores test prices by country, so read numbers as "about". Reddit was blocked. No page tried to
give me instructions.

## Summary

- Every competitor puts AI logging inside its normal paid tier; none sells it as a separate add-on. Yearly prices run
  from $29.99 (Cal AI) to $99.99-$149 (Lifesum, SnapCalorie).
- Photo estimates are rough: about **a third too low** on energy in a 2026 NIH test, and **~36% error** for GPT-4o
  and Claude 3.5 Sonnet in a 2025 study. Fat, oil, big portions and mixed dishes fail most. Typed amounts help most.
- Users love the speed. They hate wild misses, fixing work, being forced into AI, and trial billing traps.
- Recommendation: keep Plus at **$4.99/month, $29.99/year** (US), about 50-60% lower in lower-income regions; photo,
  voice and sentence logging with a review screen; fair use **10 AI logs a day**.

## 1. Competitors

| App | AI inputs | Tier | Price (USD) |
|---|---|---|---|
| Cal AI (owned by MyFitnessPal) | Photo, describe, barcode | Photo scan paid; text/voice describe free (3p) | $9.99/mo, $29.99/yr, family $59.99/yr; 3-day trial; store lists $2.99-$29.99 variants |
| MacroFactor | Photo, Photo & Text, Describe (type or speak) | Its one paid tier; no free tier | $11.99/mo, $47.99/6 mo, $71.99/yr |
| MyFitnessPal | Meal Scan, Voice Log, photo upload | Premium (Premium+ adds a meal planner) | Premium $19.99/mo, $79.99/yr; Premium+ $24.99/mo, $99.99/yr; store also lists $9.99/mo, $49.99/yr |
| Lose It! | Photo, AI voice | Premium | $39.99/yr; ~$9.99/mo (3p); store also lists Lifetime $49.99-$59.99 |
| SnapCalorie | Photo (depth sensor), voice | 3 free AI logs/day (3p); Premium unlimited | Store labels $19.99/mo and $149/yr, plus $9.99-$99.99 variants; ~€89.99/yr in Europe (3p) |
| Foodvisor | Photo, voice | Photo free with a cap (3p, size unknown); Premium adds plans, micronutrients | Store lists $14.99-$39.99/mo and $59.99-$83.99 plans; unclear |
| Lifesum | "Track with AI": photo, voice, text | Premium only | $14.99/mo, $99.99/yr (checked 2026-09-17) |
| Yazio | AI photo | PRO (3p, unconfirmed) | $47.90/yr (promo $23.90), $23.99/3 mo |

Sources: Cal AI [1](https://www.eesel.ai/en/blog/cal-ai-pricing) [2](https://macrofactor.com/macrofactor-vs-cal-ai/)
[3](https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616); MacroFactor [1](https://help.macrofactorapp.com/en/articles/393-how-macrofactor-subscriptions-and-bundles-work)
[2](https://help.macrofactorapp.com/en/articles/258-ai-food-logging) [3](https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor);
MyFitnessPal [1](https://recurdash.com/subscription-pricing/myfitnesspal) [2](https://apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718);
Lose It! [1](https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629) [2](https://nutrola.app/en/blog/how-much-does-lose-it-cost-2026);
SnapCalorie [1](https://apps.apple.com/app/id1574239307) [2](https://macaron.im/en/blog/is-snapcalorie-free);
Foodvisor [1](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872) [2](https://nutrola.app/en/blog/foodvisor-free-vs-premium-what-do-you-actually-get);
Lifesum [1](https://help.lifesum.com/en/article/ai-tracking-explained-15sw7rk/) [2](https://recurdash.com/subscription-pricing/lifesum);
Yazio [1](https://apps.apple.com/us/app/yazio-calorie-counter-diet/id946099227) [2](https://nutriscan.app/blog/posts/yazio-pricing-2026-free-vs-pro-what-pro-unlocks-33b26f8fc7).

Regional: Health & Fitness medians are $9.99/mo, $39.94/yr; India + Southeast Asia $3.75/mo, $18.32/yr, 46-54% of top
markets ([RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); see `2026-10-18-monetization-onboarding.md`).

## 2. Accuracy

- **Photo apps, 2026 (NIH abstract, not yet peer reviewed):** MyFitnessPal, Lose It!, Cal AI and Appediet on 102
  weighed meals: about **33% low** on energy (252-345 kcal a meal), ~30 g low on fat; worse on high-fat meals ([Healio](https://www.healio.com/news/primary-care/20260804/ai-photobased-calorietracking-tools-underestimate-them-by-33)).
- **General models, 2025:** 52 photos of weighed food; energy error 35.8% for GPT-4o and Claude 3.5 Sonnet, 64% for
  Gemini 1.5 Pro; protein and fat 42-62%. Bigger portions, bigger misses (lentil curry 255 g vs 480 g) ([Current Developments in Nutrition](https://pmc.ncbi.nlm.nih.gov/articles/PMC12513282/)).
- **Mixed and non-Western dishes, 2024:** AI photo energy estimates were "inaccurate"; beef pho +49%, bubble tea up to
  −76% ([Nutrients, Univ. of Sydney](https://pmc.ncbi.nlm.nih.gov/articles/PMC11314244/)).
- **Context helps, 2025:** ChatGPT-5 on 195 dishes improved as descriptions and ingredient amounts were added, and got
  worse again without the photo ([Nutrients](https://www.mdpi.com/2072-6643/17/22/3613)).
- **Text:** on 11,857 meal descriptions, LLM carb estimates matched nutritionists' and came faster
  ([NutriBench, ICLR 2025](https://arxiv.org/abs/2407.12843)); an older ChatGPT study had 35-48% of foods within 10%
  ([HealthDay](https://www.healthday.com/healthpro-news/health-technology/chatgpt-provides-accurate-nutritional-information)).
- **Hidden fat:** 20 g and 50 g of melted butter got nearly the same estimate ([Cronometer forum](https://forums.cronometer.com/discussion/comment/21135/)).

Authors liken these errors to people's own self-reports: fine for habits, not for clinical precision.

**What good apps do:** MacroFactor opens a review screen to change amounts, split a dish and add missed items; offers
"Photo & Text"; suggests a fist or kitchen scale in the photo; and matches foods to its database instead of trusting
model numbers ([blog](https://macrofactor.com/ai-food-logging/)). Lifesum asks for amounts and cooking method and
takes corrections in plain words. Almost nobody shows a confidence label.

## 3. What users say

Reviews are from the store pages in section 1.

- **Praise:** speed ("just taking a photo of the food to log it and done", Foodvisor); restaurant and hotel meals;
  grams shown; "better than not logging" (Cronometer forum); one Cal AI reviewer found it within ~10%.
- **Wild misses:** a small bowl of popcorn at ~8,000 kcal (Cal AI); weight off "by a factor of two" (SnapCalorie).
- **Fixing work:** correcting home recipes takes too long; tahini dressing read as mayonnaise (Cronometer forum).
- **Forced AI:** a Lifesum reviewer didn't want "to be forced to talk to an ai" to log meals.
- **Billing and trust:** Cal AI's 3-day trial and renewals after deleting the app; Apple briefly pulled it in April
  2026 for a misleading paywall ([TechCrunch](https://techcrunch.com/2026/04/21/apples-cal-ai-crackdown-signals-its-still-policing-the-app-store/));
  an alleged, unconfirmed leak of ~3 million Cal AI records ([SC World](https://www.scworld.com/brief/over-3m-allegedly-impacted-by-cal-ai-app-breach)).

## 4. Recommendation for Plus

**Price.** Keep the 2026-10-18 plan: **$4.99/month, $29.99/year** in the US, lower-income regions set by hand about
50-60% lower (Philippines ₱129/₱699). A range of $3.99-$5.99 and $24.99-$39.99 is defensible: level with Cal AI
yearly, below everyone else, and Plus covers Train and Read too. **Lifetime ($69.99)** earns once while AI costs
every use: cap it the same way, or leave AI out of Lifetime (owner decision).

**Include:** photo, voice and sentence logging; one review screen; "fix it" with a sentence; save a checked meal as
a favourite for one-tap re-logging (no AI call). Manual entry stays free as the fallback. Optional: 3 free AI logs
to try it. Claude takes text and images, not audio, so the phone turns speech into text first (Android speech
recognition; unverified on the Find X9).

**Fair use:** **10 AI logs a day** (a log = one photo or sentence plus up to 2 fixes). After that, a calm note that
manual entry still works. The existing monthly budget reservation stays as a global stop.

**Cost per log** (estimate): photo shrunk on the phone to ~1,000 px (~1,000-1,300 tokens,
[vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)), ~1,000 instruction and ~800 output tokens.

| Model (input/output per 1M tokens) | Per photo log | 90 logs/month | 300 logs/month (cap) |
|---|---|---|---|
| Haiku 5.5 ($0.10/$0.50) | ~$0.0006 | ~$0.06 | ~$0.19 |
| Sonnet 5.5 ($2/$10) | ~$0.013 | ~$1.13 | ~$3.78 |
| Opus 5.5 ($4/$20) | ~$0.025 | ~$2.27 | ~$7.56 |

After Google's 15%, $4.99 nets ~$4.24 and ₱129 ~$1.80: at Philippine prices only Haiku-level cost is safe at the
cap. Pick the model after a 50-meal weighed test (spends money; owner's yes).

**Three design rules**

1. **Never save without the user's check.** AI returns a draft (food, grams, calories, protein, carbs, fat); the user
   edits, then taps Save. Changing grams recalculates in code from per-100 g values, with no new AI call.
2. **Ask, don't guess, on the big errors.** No amount, or a mixed, fried or dressed dish: ask one quick question
   (portion or grams; "cooked in oil or butter?") and label each item "from your amounts" or "estimate".
3. **AI output is untrusted input.** Server-only; validate and clamp (grams, item count, calories matching 4/4/9);
   on failure open manual entry prefilled with the text; don't keep the photo.

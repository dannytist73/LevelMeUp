-- M15, the daily studio (plan 2026-10-20-m15-daily-studio.md): the owner's PC researches and writes an article, its
-- story and its picture, and lmu-articles-studio checks them again and stores them. A job the PC has taken waits as
-- 'studio'. The tick moves only the statuses it knows, so it never sends a studio job to the API, and the article is
-- stored through the same functions as the tick's (studio -> writing -> article_store, then article_set_deck, in one
-- transaction).
alter table levelmeup.article_jobs drop constraint article_jobs_status_check;
alter table levelmeup.article_jobs add constraint article_jobs_status_check
  check (status in ('queued', 'researching', 'researched', 'writing', 'retry', 'done', 'failed', 'studio'));

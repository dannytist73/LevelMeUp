-- LevelMeUp lives only in this schema of the shared DNA Wedding project (architecture §12).
-- Applied by this repo's `npm run db:deploy`, never `supabase db push`; recorded in levelmeup.schema_migrations.

create schema levelmeup;
comment on schema levelmeup is
  'LevelMeUp (lmu-). Shares the DNA Wedding project: never drop it. Migrations come from the LevelMeUp repo''s db:deploy runner and are recorded in levelmeup.schema_migrations, not supabase_migrations.';
revoke all on schema levelmeup from public;

create table levelmeup.schema_migrations (
  version text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);
alter table levelmeup.schema_migrations enable row level security;

-- The Edge Functions' database role. It can't log in until scripts/lmu-service-password.ts sets its password, and it
-- has no rights outside this schema. It reads as the player: `set local role authenticated` with the player's
-- claims, so row level security decides (inherit false: it never holds the player rights by itself).
create role lmu_service nologin noinherit;
grant usage on schema levelmeup to lmu_service, authenticated;
grant authenticated to lmu_service with inherit false, set true;

-- Functions created here later are not executable by everyone by default.
alter default privileges in schema levelmeup revoke execute on functions from public;

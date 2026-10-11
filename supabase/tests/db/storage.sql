-- The quest-art bucket (migration 0007, M6a): public pictures and the manifest, nothing else.
-- Runs inside a transaction that always rolls back (scripts/db-test.ts).

create function lmu_test.test_art_bucket() returns setof text language plpgsql as $$
begin
  return next ok(exists (select 1 from storage.buckets where id = 'lmu-art'), 'the lmu-art bucket exists');
  return next ok((select public from storage.buckets where id = 'lmu-art'), 'lmu-art is public: its files are pictures anyone may see');
  return next is((select file_size_limit from storage.buckets where id = 'lmu-art'), 1048576::bigint, 'one file is at most 1 MB');
  return next is((select allowed_mime_types from storage.buckets where id = 'lmu-art'), array['image/webp', 'application/json'],
    'only WebP pictures and the JSON manifest');
  return next ok(exists (select 1 from levelmeup.schema_migrations where version = '0007'), 'migration 0007 is recorded');
  return next ok(not exists (select 1 from pg_policies where schemaname = 'storage' and policyname like 'lmu%'),
    'LevelMeUp adds no storage policy: only the owner uploads');
end $$;

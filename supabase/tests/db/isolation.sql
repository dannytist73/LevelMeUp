-- The levelmeup schema and LevelMeUp's roles keep out of the wedding's way (architecture §8, §12).
-- Runs inside a transaction that always rolls back (scripts/db-test.ts); search_path = lmu_test, extensions, public.

create function lmu_test.test_schema() returns setof text language plpgsql as $$
begin
  return next has_schema('levelmeup');
  return next is((select nspowner::regrole::text from pg_namespace where nspname = 'levelmeup'), 'postgres', 'postgres owns levelmeup');
  return next has_table('levelmeup', 'schema_migrations', 'schema_migrations exists');
  return next ok((select relrowsecurity from pg_class where oid = 'levelmeup.schema_migrations'::regclass), 'schema_migrations has RLS on');
  return next ok(exists (select 1 from levelmeup.schema_migrations where version = '0001'), 'migration 0001 is recorded');
  return next ok(not has_schema_privilege('anon', 'levelmeup', 'USAGE'), 'anon cannot use levelmeup');
  return next ok(not has_schema_privilege('authenticated', 'levelmeup', 'USAGE'), 'the project''s signed-in users cannot use levelmeup');
  return next ok(not has_table_privilege('lmu_player', 'levelmeup.schema_migrations', 'SELECT'), 'players cannot read the migration list');
end $$;

create function lmu_test.test_lmu_roles() returns setof text language plpgsql as $$
declare
  r text;
begin
  foreach r in array array['lmu_service', 'lmu_player'] loop
    return next has_role(r);
    return next ok(not (select rolinherit from pg_roles where rolname = r), format('%s does not inherit', r));
    return next ok(not (select rolbypassrls or rolsuper or rolcreaterole or rolcreatedb or rolreplication from pg_roles where rolname = r),
      format('%s has no admin attributes and does not bypass RLS', r));
    return next ok(not has_schema_privilege(r, 'levelmeup', 'CREATE'), format('%s cannot create objects in levelmeup', r));
  end loop;
  return next ok(not (select rolcanlogin from pg_roles where rolname = 'lmu_player'), 'lmu_player cannot log in');
  return next ok(pg_has_role('lmu_service', 'lmu_player', 'SET'), 'lmu_service can switch to lmu_player');
  return next ok(not pg_has_role('lmu_service', 'lmu_player', 'USAGE'), 'lmu_service does not hold player rights by itself');
  return next ok(not pg_has_role('lmu_service', 'authenticated', 'SET'), 'lmu_service cannot become a user of the wedding site');
  return next ok(not pg_has_role('lmu_player', 'authenticated', 'SET'), 'lmu_player cannot become a user of the wedding site');
  return next ok(has_schema_privilege('lmu_service', 'levelmeup', 'USAGE'), 'lmu_service uses levelmeup');
end $$;

create function lmu_test.test_wedding_tables_closed_to_lmu_roles() returns setof text language plpgsql as $$
declare
  t record;
  p text;
  r text;
begin
  for t in
    select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p', 'f') order by c.relname
  loop
    foreach r in array array['lmu_service', 'lmu_player'] loop
      foreach p in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        return next ok(not has_table_privilege(r, t.oid, p), format('%s has no %s on public.%s', r, p, t.relname));
      end loop;
    end loop;
  end loop;
end $$;

-- is_admin() is the wedding's own and executable by everyone. Whatever it answers, it opens no table to these roles.
create function lmu_test.test_wedding_functions_closed_to_lmu_roles() returns setof text language plpgsql as $$
declare
  r text;
begin
  foreach r in array array['lmu_service', 'lmu_player'] loop
    return next is(
      (select coalesce(array_agg(p.proname::text order by p.proname), '{}') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef and has_function_privilege(r, p.oid, 'EXECUTE')),
      array['is_admin']::text[],
      format('%s can run no wedding definer function except is_admin()', r));
  end loop;
end $$;

-- Real attempts, including the code review's case: claims forged to look like a wedding admin's sign-in.
create function lmu_test.test_forged_claims_open_nothing() returns setof text language plpgsql as $$
declare
  admin uuid := lmu_test.uid(77);
  claims text := json_build_object('sub', lmu_test.uid(77), 'role', 'authenticated', 'email', 'admin@example.com',
    'amr', json_build_array(json_build_object('method', 'magiclink')))::text;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous)
    values (admin, 'authenticated', 'authenticated', 'admin@example.com', now(), false);
  perform set_config('request.jwt.claims', claims, true);
  return next throws_ok($q$ set local role lmu_service; select count(*) from public.invites $q$, '42501', null,
    'lmu_service is refused on public.invites');
  return next throws_ok($q$ set local role lmu_player; select count(*) from public.invites $q$, '42501', null,
    'lmu_player with a wedding admin''s claims is refused on public.invites');
  return next throws_ok($q$ set local role lmu_player; select count(*) from public.rsvps $q$, '42501', null,
    'and on public.rsvps');
  -- Whether lmu_service can `set role authenticated` can't be tried here: Postgres checks SET ROLE against the
  -- session's login role (postgres in this test). test_lmu_roles checks the membership itself (pg_has_role … 'SET').
end $$;

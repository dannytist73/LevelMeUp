-- The levelmeup schema and the lmu_service role keep out of the wedding's way (architecture §8, §12).
-- Runs inside a transaction that always rolls back (scripts/db-test.ts); search_path = lmu_test, extensions, public.

create function lmu_test.test_schema() returns setof text language plpgsql as $$
begin
  return next has_schema('levelmeup');
  return next is((select nspowner::regrole::text from pg_namespace where nspname = 'levelmeup'), 'postgres', 'postgres owns levelmeup');
  return next has_table('levelmeup', 'schema_migrations', 'schema_migrations exists');
  return next ok((select relrowsecurity from pg_class where oid = 'levelmeup.schema_migrations'::regclass), 'schema_migrations has RLS on');
  return next ok(exists (select 1 from levelmeup.schema_migrations where version = '0001'), 'migration 0001 is recorded');
  return next ok(not has_schema_privilege('anon', 'levelmeup', 'USAGE'), 'anon cannot use levelmeup');
  return next ok(not has_table_privilege('authenticated', 'levelmeup.schema_migrations', 'SELECT'), 'players cannot read the migration list');
end $$;

create function lmu_test.test_lmu_service_role() returns setof text language plpgsql as $$
begin
  return next has_role('lmu_service');
  return next ok(not (select rolinherit from pg_roles where rolname = 'lmu_service'), 'lmu_service does not inherit');
  return next ok(not (select rolbypassrls or rolsuper or rolcreaterole or rolcreatedb or rolreplication from pg_roles where rolname = 'lmu_service'),
    'lmu_service has no admin attributes and does not bypass RLS');
  return next ok(pg_has_role('lmu_service', 'authenticated', 'SET'), 'lmu_service can switch to authenticated');
  return next ok(not pg_has_role('lmu_service', 'authenticated', 'USAGE'), 'lmu_service does not hold player rights by itself');
  return next ok(has_schema_privilege('lmu_service', 'levelmeup', 'USAGE'), 'lmu_service uses levelmeup');
  return next ok(not has_schema_privilege('lmu_service', 'levelmeup', 'CREATE'), 'lmu_service cannot create objects in levelmeup');
end $$;

create function lmu_test.test_wedding_tables_closed_to_lmu_service() returns setof text language plpgsql as $$
declare
  t record;
  p text;
begin
  for t in
    select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p', 'f') order by c.relname
  loop
    foreach p in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      return next ok(not has_table_privilege('lmu_service', t.oid, p), format('lmu_service has no %s on public.%s', p, t.relname));
    end loop;
  end loop;
end $$;

-- is_admin() is the wedding's own and executable by everyone; for lmu_service it can only ever answer false.
create function lmu_test.test_wedding_functions_closed_to_lmu_service() returns setof text language plpgsql as $$
begin
  return next is(
    (select coalesce(array_agg(p.proname::text order by p.proname), '{}') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef and has_function_privilege('lmu_service', p.oid, 'EXECUTE')),
    array['is_admin']::text[],
    'lmu_service can run no wedding definer function except is_admin()');
end $$;

-- A real attempt as lmu_service (the test transaction grants postgres the role; the rollback removes the grant).
create function lmu_test.test_lmu_service_is_refused_on_invites() returns setof text language plpgsql as $$
begin
  grant lmu_service to postgres with set true, inherit false;
  return next throws_ok($q$ set local role lmu_service; select count(*) from public.invites $q$, '42501', null,
    'lmu_service is refused on public.invites');
end $$;

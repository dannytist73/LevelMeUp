-- LevelMeUp Plus (migration 0017, M13): Play rows as RevenueCat reports them, the Founder grant, and deletion.
-- Runs inside a transaction that always rolls back, after _helpers.sql.

create function lmu_test.test_play_plus() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  b uuid := lmu_test.start(2);
begin
  perform levelmeup.set_play_plus(a, 'plus_yearly', now() + interval '7 days', true, true, 'https://play.google.com/store/account/subscriptions');
  return next is((select array[product, trial::text, will_renew::text] from levelmeup.entitlements where user_id = a and source = 'play'),
    array['plus_yearly', 'true', 'true'], 'a trial on the yearly plan is stored');
  perform levelmeup.set_play_plus(a, 'plus_yearly', now() + interval '1 year', false, false, null);
  return next is((select array[trial::text, will_renew::text, (ends_at > now() + interval '300 days')::text] from levelmeup.entitlements
    where user_id = a and source = 'play'), array['false', 'false', 'true'], 'the next answer replaces it: paid, cancelled, running to its end');
  return next is((select count(*)::int from levelmeup.entitlements where user_id = a), 1, 'one Play row per player');
  perform levelmeup.set_play_plus(a, null, null, null, null, null);
  return next ok((select ends_at <= now() from levelmeup.entitlements where user_id = a and source = 'play'),
    'when RevenueCat knows no purchase (a refund), the row ends now');
  perform levelmeup.set_play_plus(b, null, null, null, null, null);
  return next is((select count(*)::int from levelmeup.entitlements where user_id = b), 0, 'and a player who never bought gets no row');
  return next throws_ok(format('select levelmeup.set_play_plus(%L, %L, null, false, null, null)', a, 'plus_forever'), '23514', null,
    'an unknown product is refused');
  return next throws_ok(format('select levelmeup.set_play_plus(%L, %L, null, false, null, %L)', a, 'plus_lifetime', 'http://evil.example'),
    '23514', null, 'a management link that is not https is refused');
  return next throws_ok(format('select levelmeup.set_play_plus(%L, %L, null, false, null, null)', lmu_test.uid(9), 'plus_lifetime'),
    'P0001', 'lmu:not_started', 'a player without a character gets nothing');
  return next is(lmu_test.try_service(format('select levelmeup.set_play_plus(%L, %L, null, false, null, null)', a, 'plus_lifetime')), null,
    'lmu_service stores a purchase through the function');
  return next matches(lmu_test.try_service(format('insert into levelmeup.entitlements (user_id, source) values (%L, %L)', b, 'beta_founder')),
    '^42501', 'and cannot write the table directly');
end $$;

create function lmu_test.test_founder_grant() returns setof text language plpgsql as $$
declare
  saved uuid := lmu_test.start(1);
  guest uuid := lmu_test.start(2);
begin
  update auth.users set email = 'tester.one@example.com', is_anonymous = false where id = saved;
  update auth.users set email = 'guest@example.com' where id = guest;
  return next is(levelmeup.grant_founder(' Tester.One@Example.com '), saved, 'the Founder grant finds a saved character by email, any case');
  return next is((select array[source, coalesce(product, 'none'), coalesce(ends_at::text, 'never')] from levelmeup.entitlements where user_id = saved),
    array['beta_founder', 'none', 'never'], 'Plus for life, with no product');
  return next is(levelmeup.grant_founder('tester.one@example.com'), saved, 'granting twice is harmless');
  return next is((select count(*)::int from levelmeup.entitlements where user_id = saved), 1, 'still one grant');
  return next is(levelmeup.grant_founder('guest@example.com'), null, 'a guest is never granted');
  return next is(levelmeup.grant_founder('nobody@example.com'), null, 'an unknown email grants nothing');
  return next matches(lmu_test.try_service($q$ select levelmeup.grant_founder('tester.one@example.com') $q$), '^42501',
    'lmu_service cannot grant it');
  return next is(lmu_test.count_as(saved, 'select 1 from levelmeup.entitlements'), 1::bigint, 'a player reads their own grant');
  return next is(lmu_test.count_as(guest, 'select 1 from levelmeup.entitlements'), 0::bigint, 'and nobody else''s');
end $$;

create function lmu_test.test_plus_is_deleted_with_the_character() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  b uuid := lmu_test.start(2);
  counts jsonb;
begin
  perform levelmeup.set_play_plus(a, 'plus_monthly', now() + interval '30 days', false, true, null);
  perform levelmeup.set_play_plus(b, 'plus_monthly', now() + interval '30 days', false, true, null);
  counts := levelmeup.delete_player(a);
  return next is(counts ->> 'plus', '1', 'delete_player reports the grants it removed');
  return next is((select count(*)::int from levelmeup.entitlements where user_id = a), 0, 'the deleted player''s Plus row is gone');
  return next is((select count(*)::int from levelmeup.entitlements where user_id = b), 1, 'other players keep theirs');
end $$;

create function lmu_test.test_revenuecat_forget() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.uid(41);
  b uuid := lmu_test.uid(42);
begin
  perform levelmeup.revenuecat_forget_add(a);
  perform levelmeup.revenuecat_forget_add(b);
  perform levelmeup.revenuecat_forget_add(a);
  return next is((select tries from levelmeup.revenuecat_forget where app_user_id = a), 2, 'a second failure counts a second try');
  return next ok((select array_agg(x) from levelmeup.revenuecat_forget_due(10) x) @> array[a, b], 'both wait for the tick');
  perform levelmeup.revenuecat_forget_done(a);
  return next ok(not exists (select 1 from levelmeup.revenuecat_forget where app_user_id = a), 'a done deletion leaves the list');
  update levelmeup.revenuecat_forget set tries = 50 where app_user_id = b;
  return next ok(not exists (select 1 from levelmeup.revenuecat_forget_due(10) x where x = b), 'after 50 tries it is left for the owner');
  return next is(lmu_test.try_service(format('select levelmeup.revenuecat_forget_add(%L)', a)), null, 'lmu_service adds through the function');
  return next matches(lmu_test.try_service('select count(*) from levelmeup.revenuecat_forget'), '^42501', 'and cannot read the table');
end $$;

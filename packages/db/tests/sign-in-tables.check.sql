-- Verifies migration 20261114000400_sign_in_tables on a DISPOSABLE local database (see scripts/disposable-db.sh).
-- Run: psql "$URL" -v ON_ERROR_STOP=1 -f tests/sign-in-tables.check.sql   (rolls back everything it inserts)
-- Prints one NOTICE per passed check; raises on the first failure.
BEGIN;

CREATE FUNCTION pg_temp.expect_fail(label text, stmt text, want_state text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RAISE EXCEPTION 'FAIL (accepted bad row): %', label;
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'FAIL (accepted%' THEN RAISE; END IF;
  IF want_state IS NOT NULL AND SQLSTATE <> want_state THEN
    RAISE EXCEPTION 'FAIL (wrong error % for %): %', SQLSTATE, label, SQLERRM;
  END IF;
  RAISE NOTICE 'ok  rejects: % [%]', label, SQLSTATE;
END $$;

DO $$
DECLARE t text; p text; r record;
BEGIN
  -- Structure, persistence, RLS, privileges.
  FOREACH t IN ARRAY ARRAY['auth_identities','auth_sessions','auth_rate_limits','auth_events'] LOOP
    IF to_regclass('public.'||t) IS NULL THEN RAISE EXCEPTION 'FAIL missing table %', t; END IF;
    SELECT relrowsecurity, relpersistence INTO r FROM pg_class WHERE oid = ('public.'||t)::regclass;
    IF NOT r.relrowsecurity THEN RAISE EXCEPTION 'FAIL RLS off on %', t; END IF;
    IF (t = 'auth_rate_limits') <> (r.relpersistence = 'u') THEN RAISE EXCEPTION 'FAIL persistence % on %', r.relpersistence, t; END IF;
    FOREACH p IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_table_privilege(p, 'public.'||t, 'SELECT') OR has_table_privilege(p, 'public.'||t, 'INSERT')
         OR has_table_privilege(p, 'public.'||t, 'UPDATE') OR has_table_privilege(p, 'public.'||t, 'DELETE') THEN
        RAISE EXCEPTION 'FAIL % has a privilege on %', p, t;
      END IF;
    END LOOP;
    RAISE NOTICE 'ok  % exists, RLS on, no anon/authenticated privileges', t;
  END LOOP;
  IF has_sequence_privilege('anon', 'public.auth_events_id_seq', 'USAGE') OR has_sequence_privilege('authenticated', 'public.auth_events_id_seq', 'USAGE') THEN
    RAISE EXCEPTION 'FAIL sequence privilege'; END IF;
  IF (SELECT attidentity FROM pg_attribute WHERE attrelid = 'public.auth_events'::regclass AND attname = 'id') <> 'a' THEN
    RAISE EXCEPTION 'FAIL auth_events.id is not GENERATED ALWAYS'; END IF;
  IF (SELECT reloptions FROM pg_class WHERE oid = 'public.auth_sessions'::regclass) IS DISTINCT FROM ARRAY['fillfactor=90'] THEN
    RAISE EXCEPTION 'FAIL fillfactor'; END IF;
  RAISE NOTICE 'ok  UNLOGGED only on auth_rate_limits, identity ALWAYS, fillfactor 90';
END $$;

-- Fixtures: a club account + device (smallest valid shape taken from the real columns).
CREATE TEMP TABLE _ids AS SELECT gen_random_uuid() AS club_a, gen_random_uuid() AS club_b, gen_random_uuid() AS dev_a,
  gen_random_uuid() AS ident, gen_random_uuid() AS sess;
SELECT set_config('rotra.test.skip', '1', true);

DO $$
DECLARE i record; ok boolean;
BEGIN
  SELECT * INTO i FROM _ids;
  -- Positive inserts.
  INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at)
    VALUES (i.ident, 'club', 'the-club', '$argon2id$v=19$x', 'argon2id', now());
  INSERT INTO auth_sessions (id, identity_id, audience, club_id, device_label, refresh_digest, last_seen_at, expires_at)
    VALUES (i.sess, i.ident, 'club', i.club_a, 'Chrome on Android', decode(repeat('aa',32),'hex'), now(), now() + interval '30 days');
  INSERT INTO auth_sessions (id, identity_id, audience, device_label, refresh_digest, previous_refresh_digest, last_seen_at, expires_at, revoked_at, revoke_reason)
    VALUES (gen_random_uuid(), i.ident, 'player', 'Safari', decode(repeat('bb',32),'hex'), decode(repeat('cc',32),'hex'), now(), now() + interval '1 day', now(), 'sign_out');
  INSERT INTO auth_rate_limits VALUES ('ip', '203.0.113.9', 'sign_in', date_trunc('minute', now()), 1);
  INSERT INTO auth_events (identity_id, session_id, audience, event, ip) VALUES (i.ident, i.sess, 'club', 'sign_in', '203.0.113.9');
  INSERT INTO auth_events (audience, event) VALUES ('player', 'sign_in_failed');   -- unknown login: no identity
  RAISE NOTICE 'ok  good rows accepted (club session, revoked player session, rate limit, two events)';
END $$;

-- auth_identities
SELECT pg_temp.expect_fail('identity bad audience', $$INSERT INTO auth_identities VALUES (gen_random_uuid(),'owner','k','h','argon2id',now())$$, '23514');
SELECT pg_temp.expect_fail('identity login_key uppercase', $$INSERT INTO auth_identities VALUES (gen_random_uuid(),'club','Mixed','h','argon2id',now())$$, '23514');
SELECT pg_temp.expect_fail('identity login_key padded', $$INSERT INTO auth_identities VALUES (gen_random_uuid(),'club',' k','h','argon2id',now())$$, '23514');
SELECT pg_temp.expect_fail('identity login_key empty', $$INSERT INTO auth_identities VALUES (gen_random_uuid(),'club','','h','argon2id',now())$$, '23514');
SELECT pg_temp.expect_fail('identity bad scheme', $$INSERT INTO auth_identities VALUES (gen_random_uuid(),'club','k2','h','md5',now())$$, '23514');
SELECT pg_temp.expect_fail('identity duplicate (audience, login_key)', $$INSERT INTO auth_identities VALUES (gen_random_uuid(),'club','the-club','h','argon2id',now())$$, '23505');
INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at)
  VALUES (gen_random_uuid(), 'admin', 'the-club', 'h', 'bcrypt', now());   -- same key, other audience is fine

-- auth_sessions (all share these good column values; one thing is wrong each time)
SELECT pg_temp.expect_fail('session digest 31 bytes', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),%L,'player','x',decode(repeat('dd',31),'hex'),now(),now())$$, (SELECT ident FROM _ids)), '23514');
SELECT pg_temp.expect_fail('session previous digest 33 bytes', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,previous_refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),%L,'player','x',decode(repeat('d1',32),'hex'),decode(repeat('d2',33),'hex'),now(),now())$$, (SELECT ident FROM _ids)), '23514');
SELECT pg_temp.expect_fail('session duplicate refresh digest', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),%L,'player','x',decode(repeat('bb',32),'hex'),now(),now())$$, (SELECT ident FROM _ids)), '23505');
SELECT pg_temp.expect_fail('session new refresh digest equals another previous', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,previous_refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),%L,'player','x',decode(repeat('e1',32),'hex'),decode(repeat('cc',32),'hex'),now(),now())$$, (SELECT ident FROM _ids)), '23505');
SELECT pg_temp.expect_fail('session empty label', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),%L,'player','',decode(repeat('e2',32),'hex'),now(),now())$$, (SELECT ident FROM _ids)), '23514');
SELECT pg_temp.expect_fail('session bad audience', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),%L,'root','x',decode(repeat('e3',32),'hex'),now(),now())$$, (SELECT ident FROM _ids)), '23514');
SELECT pg_temp.expect_fail('session revoked_at without reason', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,last_seen_at,expires_at,revoked_at) VALUES (gen_random_uuid(),%L,'player','x',decode(repeat('e4',32),'hex'),now(),now(),now())$$, (SELECT ident FROM _ids)), '23514');
SELECT pg_temp.expect_fail('session reason without revoked_at', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,last_seen_at,expires_at,revoke_reason) VALUES (gen_random_uuid(),%L,'player','x',decode(repeat('e5',32),'hex'),now(),now(),'sign_out')$$, (SELECT ident FROM _ids)), '23514');
SELECT pg_temp.expect_fail('session unknown revoke reason', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,last_seen_at,expires_at,revoked_at,revoke_reason) VALUES (gen_random_uuid(),%L,'player','x',decode(repeat('e6',32),'hex'),now(),now(),now(),'boredom')$$, (SELECT ident FROM _ids)), '23514');
SELECT pg_temp.expect_fail('club session without club_id', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),%L,'club','x',decode(repeat('e7',32),'hex'),now(),now())$$, (SELECT ident FROM _ids)), '23514');
SELECT pg_temp.expect_fail('player session with club_id', format($$INSERT INTO auth_sessions (id,identity_id,audience,club_id,device_label,refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),%L,'player',gen_random_uuid(),'x',decode(repeat('e8',32),'hex'),now(),now())$$, (SELECT ident FROM _ids)), '23514');
SELECT pg_temp.expect_fail('player session with device_id', format($$INSERT INTO auth_sessions (id,identity_id,audience,device_id,device_label,refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),%L,'player',gen_random_uuid(),'x',decode(repeat('e9',32),'hex'),now(),now())$$, (SELECT ident FROM _ids)), '23514');
SELECT pg_temp.expect_fail('session unknown identity (FK)', $$INSERT INTO auth_sessions (id,identity_id,audience,device_label,refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),gen_random_uuid(),'player','x',decode(repeat('ea',32),'hex'),now(),now())$$, '23503');
SELECT pg_temp.expect_fail('session unknown device (composite FK)', format($$INSERT INTO auth_sessions (id,identity_id,audience,club_id,device_id,device_label,refresh_digest,last_seen_at,expires_at) VALUES (gen_random_uuid(),%L,'club',%L,gen_random_uuid(),'x',decode(repeat('eb',32),'hex'),now(),now())$$, (SELECT ident FROM _ids), (SELECT club_a FROM _ids)), '23503');

-- auth_rate_limits
SELECT pg_temp.expect_fail('rate limit bad scope', $$INSERT INTO auth_rate_limits VALUES ('user','s','sign_in',now(),1)$$, '23514');
SELECT pg_temp.expect_fail('rate limit bad action', $$INSERT INTO auth_rate_limits VALUES ('ip','s','logout',now(),1)$$, '23514');
SELECT pg_temp.expect_fail('rate limit attempts 0', $$INSERT INTO auth_rate_limits VALUES ('ip','s','sign_in',now(),0)$$, '23514');
SELECT pg_temp.expect_fail('rate limit duplicate window', $$INSERT INTO auth_rate_limits SELECT * FROM auth_rate_limits LIMIT 1$$, '23505');
DO $$
DECLARE n int;
BEGIN  -- the documented upsert
  INSERT INTO auth_rate_limits VALUES ('ip','198.51.100.1','sign_in','2026-01-01 00:00+00',1)
    ON CONFLICT (scope, subject, action, window_start) DO UPDATE SET attempts = auth_rate_limits.attempts + 1 RETURNING attempts INTO n;
  INSERT INTO auth_rate_limits VALUES ('ip','198.51.100.1','sign_in','2026-01-01 00:00+00',1)
    ON CONFLICT (scope, subject, action, window_start) DO UPDATE SET attempts = auth_rate_limits.attempts + 1 RETURNING attempts INTO n;
  IF n <> 2 THEN RAISE EXCEPTION 'FAIL upsert counted %', n; END IF;
  RAISE NOTICE 'ok  rate-limit upsert increments (attempts=%)', n;
END $$;

-- auth_events
SELECT pg_temp.expect_fail('event bad audience', $$INSERT INTO auth_events (audience,event) VALUES ('x','sign_in')$$, '23514');
SELECT pg_temp.expect_fail('event unknown event', $$INSERT INTO auth_events (audience,event) VALUES ('club','token_refreshed')$$, '23514');
SELECT pg_temp.expect_fail('event unknown identity (FK)', $$INSERT INTO auth_events (identity_id,audience,event) VALUES (gen_random_uuid(),'club','sign_in')$$, '23503');
SELECT pg_temp.expect_fail('event unknown session (FK)', $$INSERT INTO auth_events (session_id,audience,event) VALUES (gen_random_uuid(),'club','sign_in')$$, '23503');
SELECT pg_temp.expect_fail('event explicit id (GENERATED ALWAYS)', $$INSERT INTO auth_events (id,audience,event) VALUES (999,'club','sign_in')$$, '428C9');

-- RESTRICT: identity/session with events or sessions cannot be deleted.
SELECT pg_temp.expect_fail('delete session that events reference', format($$DELETE FROM auth_sessions WHERE id = %L$$, (SELECT sess FROM _ids)), '23503');
SELECT pg_temp.expect_fail('delete identity that sessions reference', format($$DELETE FROM auth_identities WHERE id = %L$$, (SELECT ident FROM _ids)), '23503');

-- Append-only trigger.
SELECT pg_temp.expect_fail('UPDATE auth_events', $$UPDATE auth_events SET ip = NULL$$, '23001');
SELECT pg_temp.expect_fail('DELETE auth_events (no flag)', $$DELETE FROM auth_events$$, '23001');
SELECT pg_temp.expect_fail('DELETE auth_events (flag off)', $$SELECT set_config('rotra.auth_events_retention','off',true); DELETE FROM auth_events$$, '23001');
SELECT pg_temp.expect_fail('UPDATE auth_events even with flag on', $$SELECT set_config('rotra.auth_events_retention','on',true); UPDATE auth_events SET ip = NULL$$, '23001');
SELECT set_config('rotra.auth_events_retention','on',true);
DELETE FROM auth_events WHERE id IN (SELECT id FROM auth_events ORDER BY id LIMIT 1);   -- the housekeeping shape
DO $$ BEGIN RAISE NOTICE 'ok  retention delete allowed with the transaction-local flag'; END $$;
SELECT set_config('rotra.auth_events_retention','off',true);
SELECT pg_temp.expect_fail('DELETE after flag reset', $$DELETE FROM auth_events$$, '23001');

-- The flag does not outlive its transaction: checked outside this script's transaction below.
ROLLBACK;

-- Flag scoping across transactions, and the real deleting order (events, then ended sessions).
BEGIN;
INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at)
  VALUES ('00000000-0000-7000-8000-000000000001', 'player', 'p@x.test', 'h', 'argon2id', now());
INSERT INTO auth_sessions (id, identity_id, audience, device_label, refresh_digest, last_seen_at, expires_at)
  VALUES ('00000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-000000000001', 'player', 'x', decode(repeat('f1',32),'hex'), now(), now() - interval '100 days');
INSERT INTO auth_events (identity_id, session_id, audience, event, occurred_at)
  VALUES ('00000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000002', 'player', 'sign_in', now() - interval '100 days');
COMMIT;
BEGIN; SET LOCAL rotra.auth_events_retention = 'on';
DELETE FROM auth_events WHERE id IN (SELECT id FROM auth_events WHERE occurred_at < now() - make_interval(days => 90) ORDER BY id LIMIT 1000);
COMMIT;
SELECT CASE WHEN count(*) = 0 THEN 'ok  SET LOCAL flag deleted the old event' ELSE 'FAIL event still there' END FROM auth_events WHERE session_id = '00000000-0000-7000-8000-000000000002';
-- New transaction: flag must be gone.
INSERT INTO auth_events (audience, event) VALUES ('player', 'sign_out');
DO $$ BEGIN
  BEGIN DELETE FROM auth_events; RAISE EXCEPTION 'FAIL flag leaked past its transaction';
  EXCEPTION WHEN restrict_violation THEN RAISE NOTICE 'ok  flag does not leak into the next transaction'; END;
END $$;
-- Sessions delete once no event references them (order: events first).
DELETE FROM auth_sessions WHERE id = '00000000-0000-7000-8000-000000000002';
-- Cleanup of this block's rows (flag in its own transaction).
BEGIN; SET LOCAL rotra.auth_events_retention = 'on';
DELETE FROM auth_events; DELETE FROM auth_identities WHERE id = '00000000-0000-7000-8000-000000000001';
COMMIT;

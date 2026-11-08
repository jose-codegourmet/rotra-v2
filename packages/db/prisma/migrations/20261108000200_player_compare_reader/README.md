# Player Compare SQL function — draft

Ticket #541, decision D-2026-11-08-02. This migration adds only
`public.rotra_player_compare(uuid, uuid)`. It does not change Prisma models or add stored summaries,
jobs or finalization work. No shared database application has been performed by this ticket.

The function reads immutable match facts from completed sessions with a committed finalization.
Both compared participants must have full participation in counted singles or doubles. Identity is
the original fact snapshot or an active reviewed guest-history attribution, matching the existing
public-history reader. It returns one row per match, with explicit public participant allowlists.
Existing session summaries supply game badges; those summaries commit atomically with the facts.

The Player Route Handler authenticates the account and supplies its player ID; callers cannot choose
another viewer. The service aggregates all filter counts and wins in SQL and returns only three game
rows per page. Rank, position and recent counts use existing readers; no rank calculation is added.

## Deployment access

The SQL function is `SECURITY INVOKER`, has an empty `search_path`, and grants no execution to
`PUBLIC`, `anon` or `authenticated`. It does not bypass table privileges or RLS. The migration owner
retains its inherent owner access. Before applying to a shared database, human sign-off must identify
the **actual** server-only `DATABASE_URL` role and approve its existing table/RLS access plus this
narrow grant (replace the placeholder; do not create an assumed role):

```sql
GRANT EXECUTE ON FUNCTION public.rotra_player_compare(uuid, uuid) TO "<runtime_role>";
```

The Supabase client roles must remain unable to execute it. Runtime-role provisioning, shared
migration application and hosted behavior have not been verified. In particular, deploying just the
application code before this SQL function and its runtime grant is available cannot serve real compare
requests.

## End-of-batch disposable verification

Checks are deferred by the owner's batch instruction. No SQL below was executed during this ticket.
Use the guarded local disposable database workflow, never a shared project. After rebuild and seed:

- The existing fictional pair `91000000-0000-4000-8000-000000000001` /
  `91000000-0000-4000-8000-000000000002` shares match
  `3a000000-0000-4000-8000-0000000a1001`, on team A. Expect one game, together and won.
  The second identity also has an attributed guest entry on team B in this fixture; the function
  deliberately deduplicates by match and picks the first stable entry pair.
- For an unambiguous attributed-only case in a rollback transaction, revoke attribution
  `a8000000-0000-4000-8000-0000000000a3` and create an active attribution for the same guest club player
  `cb000000-0000-4000-8000-0000000000a3` to existing Maria
  `91000000-0000-4000-8000-000000000003`. Juan(1) / Maria should show one head-to-head game, Juan won;
  reversing the IDs must reverse the side and win. Revoking that new link removes Maria's game.
- Add isolated final fixtures with eight eligible games (six head-to-head, two together), and fun,
  partial-participation and unfinalized exclusions. Verify counts are unchanged on every three-row
  page, newest first, page bounds clamp, empty filters retain profile/rank data, and null scores remain
  null. Compare the service's all/head-to-head/together stats with those fixed facts.
- Verify self comparison returns null; unsigned Route Handler requests return 401; invalid filters or
  non-whole pages return 422; missing public profiles return 404. Responses must be private/no-store.
- Check `has_function_privilege` is false for both Supabase client roles. Use a known isolated test
  runtime role with its explicit table/RLS permissions and the narrow EXECUTE grant to verify invoker
  access. Do not assume a successful owner call proves runtime access.

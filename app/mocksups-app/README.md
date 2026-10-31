# ROTRA routed prototypes

Run this separate prototype app from the repository root:

```bash
nvm use && pnpm mockups
```

Open the [launcher](http://127.0.0.1:3003/), [Queue](http://127.0.0.1:3003/queue),
[Player Information](http://127.0.0.1:3003/player), or [Admin](http://127.0.0.1:3003/admin).
Stop the server with Ctrl+C. If that port is busy, use `nvm use && PORT=3103 pnpm mockups`.

The app uses Node's built-in HTTP server and browser History API, with no additional dependencies.
The three canonical HTML prototypes remain the design source. The server enables their routing
adapters; opening a product HTML file directly still runs its original standalone mode. Existing
`/player-app/rotra-player.html` (and Queue/Admin equivalents) URLs redirect to the routed app.
This app does not import or change `apps/player`, `apps/queue`, or `apps/admin`.

## Routes

A product prefix keeps the three apps on one local origin. Everything after it follows the
corresponding actual app's route structure. IDs refer to **prototype fixtures**, not the actual
apps' mock store or a database. Tabs use `?tab=` and survive refresh and Back/Forward. Sheets remain
sheets; opening a dialog does not create a new route.

| App | Paths after the prefix | Examples |
| --- | --- | --- |
| Player `/player` | `/`, `/login`, `/forgot-password`, `/reset-password/[token]`, `/claim/[token]`, `/rank`, `/find/[rtrId]`, `/players/[playerId]`, `/players/[playerId]/rank`, `/players/[playerId]/games`, `/profile/edit`, `/profile/player-id`, `/profile/privacy-and-contact` | `/player/players/u1`, `/player/players/b0/games?tab=other` |
| Queue `/queue` | `/`, `/login`, `/venues`, `/inventory`, `/saved-players`, `/club-settings`, `/club-settings/[section]`, `/sessions/new`, `/sessions/[sessionId]`, `/sessions/[sessionId]/preparation`, `/sessions/[sessionId]/edit`, `/sessions/[sessionId]/record`, `/sessions/[sessionId]/finishing`, `/sessions/[sessionId]/recovery`, `/sessions/[sessionId]/results`, `/sessions/[sessionId]/public-page`, `/s/[slug]` | `/queue/sessions/s-tonight/preparation?tab=roster`, `/queue/sessions/h1/record`, `/queue/s/s-tonight` |
| Admin `/admin` | `/` → `/clubs`, `/login`, `/clubs`, `/clubs/[clubId]`, `/players`, `/players/[playerId]`, `/requests/contact-changes`, `/requests/contact-changes/[requestId]`, `/requests/club-names`, `/settings/ranking`, `/settings/feature-flags` | `/admin/clubs/c1?tab=license`, `/admin/requests/contact-changes/r1` |

Queue settings use the real app's slugs: `club-identity`, `session-defaults`, `facebook-post`,
`license`, `this-device`, and `account`. The demo's public session slug is its session ID;
Copy link and the displayed session link both use the current local origin.

Direct entry initializes the requested screen rather than reopening the last saved screen.
Missing records and unsupported paths show a not-found state. Player account screens and Admin
retain their existing mock sign-in behavior and preserve a return path through refresh. Tokens
still select the prototype's existing claim/reset demonstrations; they are not real credentials.
Queue's standalone recovery scenarios remain in its Prototype controls. A direct recovery or
finishing link resolves to the session's current preparation, live, or record view; it never
restarts finalization. Finished/invalid sessions are not reopened as editable sessions by Back.

The prototypes use fictional browser-local data. Browser history stores only navigation positions,
never data snapshots, so Back does not undo actions. Reload reads the same browser-local demo store;
this is not operational persistence, real auth, or durable offline sync. Each origin has a separate
store, so a different host or port starts a separate demo. Player profile and Admin ranking drafts
retain their existing in-app discard sheets; browser Back and page exit also warn about unsaved edits.

## Check and package

```bash
nvm use && pnpm --filter @rotra/mockups lint
nvm use && pnpm --filter @rotra/mockups type-check
nvm use && pnpm --filter @rotra/mockups build
nvm use && node app/mocksups-app/dist/server.mjs
```

Build checks the inline prototype JavaScript syntax and copies a runnable server bundle into `dist/`.
Type-check covers the shared history driver; the legacy inline prototype scripts remain JavaScript.
The server binds to loopback and serves only the launcher, routing asset, and prototype documents.

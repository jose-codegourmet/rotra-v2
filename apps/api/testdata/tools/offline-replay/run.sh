#!/usr/bin/env bash
# Local offline-replay check for go-writes-queue task 5.1. See README.md.
#
#   apps/api/testdata/tools/offline-replay/run.sh up      # throwaway Postgres + seed + Go API + Queue app
#   apps/api/testdata/tools/offline-replay/run.sh test    # run the replay check (needs `up`)
#   apps/api/testdata/tools/offline-replay/run.sh down    # stop everything and remove the database
#   apps/api/testdata/tools/offline-replay/run.sh all     # up, test, down (down also on failure)
#
# Local only: the database is a throwaway docker container on 127.0.0.1, every secret is generated here and kept in a 0600
# file under the state directory, nothing is read from .env files, Railway, Vercel or Supabase.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../../../.." && pwd)"
API="$ROOT/apps/api"
STATE="${ROTRA_REPLAY_STATE:-${TMPDIR:-/tmp}/rotra-offline-replay}"
DB_NAME=rotra_disposable_replay
DB_PORT="${ROTRA_REPLAY_DB_PORT:-55439}"
GO_PORT="${ROTRA_REPLAY_GO_PORT:-8089}"
APP_PORT="${ROTRA_REPLAY_APP_PORT:-9200}"
CONTAINER=rotra-replay-db
DB_URL="postgres://postgres:replay@127.0.0.1:${DB_PORT}/${DB_NAME}?sslmode=disable"

# The database must be this script's own throwaway one: local host, rotra_disposable* name.
guard() {
  case "$DB_URL" in
    postgres://*@127.0.0.1:*/rotra_disposable*) ;;
    *) echo "Refusing: the database must be local and named rotra_disposable*." >&2; exit 2 ;;
  esac
}

nvm_use() {
  # shellcheck disable=SC1091
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
  (cd "$ROOT" && nvm use >/dev/null)
}

PATCH="$HERE/offline-apply.patch"

# Two device-side bugs stop an offline session from being recorded and replayed in real mode (see README.md and the plan's
# deviations log). The patch is the smallest fix for each; it is applied to the working tree for the run and reverted by `down`.
# When the fixes land in the apps the patch stops applying and the run goes on without it.
apply_workarounds() {
  if [ -n "${ROTRA_REPLAY_NO_PATCH:-}" ]; then echo "ROTRA_REPLAY_NO_PATCH is set: running the app as it is"; return; fi
  if git -C "$ROOT" apply --check "$PATCH" 2>/dev/null; then
    git -C "$ROOT" apply "$PATCH" && touch "$STATE/patched"
    echo "applied the TypeScript workaround patch to packages/data (down reverts it)"
  else
    echo "the workaround patch does not apply (fixed in the apps, or already applied): running without it"
  fi
}
revert_workarounds() {
  if [ -f "$STATE/patched" ]; then
    git -C "$ROOT" apply -R "$PATCH" && rm -f "$STATE/patched"
    echo "reverted the TypeScript workaround patch"
  fi
}

secret() { openssl rand -base64 33 | tr -d '\n='; }

up() {
  guard
  mkdir -p "$STATE"; chmod 700 "$STATE"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker run -d --rm --name "$CONTAINER" -e POSTGRES_PASSWORD=replay -p "127.0.0.1:${DB_PORT}:5432" postgres:16-alpine >/dev/null
  for _ in $(seq 1 60); do
    docker exec "$CONTAINER" pg_isready -U postgres -q && sleep 1 && docker exec "$CONTAINER" pg_isready -U postgres -q && break
    sleep 1
  done
  docker exec "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
    -c "CREATE DATABASE ${DB_NAME}" -c "CREATE ROLE anon NOLOGIN" -c "CREATE ROLE authenticated NOLOGIN" -c "CREATE ROLE service_role NOLOGIN"
  for f in "$ROOT"/packages/db/prisma/migrations/*/migration.sql; do
    docker exec -i "$CONTAINER" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 -q -f - <"$f" >/dev/null 2>&1 || { echo "migration failed: $f" >&2; exit 1; }
  done
  umask 077
  PASSWORD="$(secret)"
  PROXY_SECRET="$(secret)"
  RECEIPT_SECRET="$(secret)"
  SIGNING_KEY="$(cd "$API" && go run ./cmd/authkey | sed -n 's/^ROTRA_AUTH_SIGNING_KEY=//p')"
  cat >"$STATE/env" <<ENV
REPLAY_PASSWORD=$PASSWORD
ROTRA_PROXY_SECRET=$PROXY_SECRET
ROTRA_VISITOR_RECEIPT_SECRET=$RECEIPT_SECRET
ROTRA_AUTH_SIGNING_KEY=$SIGNING_KEY
ENV
  (cd "$API" && go run ./testdata/tools/offline-replay/seed "$DB_URL" "$PASSWORD")
  (cd "$API" && go build -o "$STATE/rotra-api" ./cmd/api)
  DATABASE_URL="$DB_URL" PORT="$GO_PORT" ROTRA_AUTH_SIGNING_KEY="$SIGNING_KEY" ROTRA_PROXY_SECRET="$PROXY_SECRET" \
    ROTRA_VISITOR_RECEIPT_SECRET="$RECEIPT_SECRET" ROTRA_QUEUE_ORIGINS="http://localhost:${APP_PORT}" \
    ROTRA_ALLOWED_ORIGINS="http://localhost:${APP_PORT}" LOG_LEVEL=info \
    nohup "$STATE/rotra-api" >"$STATE/go.log" 2>&1 &
  echo $! >"$STATE/go.pid"
  for _ in $(seq 1 40); do curl -sf "http://127.0.0.1:${GO_PORT}/healthz" >/dev/null && break; sleep 0.5; done
  curl -sf "http://127.0.0.1:${GO_PORT}/healthz" >/dev/null || { echo "Go API did not start; see $STATE/go.log" >&2; exit 1; }
  nvm_use
  apply_workarounds
  # The Queue app in real data mode; the proxy forwards the moved areas to Go and never calls Supabase. The first `next dev`
  # may stop after printing an advisory banner; the second start continues, so try twice.
  app_up() { curl -s -o /dev/null -w '%{http_code}' "http://localhost:${APP_PORT}/login" | grep -q 200; }
  for attempt in 1 2 3; do
    (cd "$ROOT" && NEXT_PUBLIC_ROTRA_DATA_MODE=real ROTRA_DATA_MODE=real \
      ROTRA_GO_API_URL="http://127.0.0.1:${GO_PORT}" ROTRA_GO_MOVED_AREAS="$(moved_areas)" ROTRA_PROXY_SECRET="$PROXY_SECRET" \
      ROTRA_VISITOR_RECEIPT_SECRET="$RECEIPT_SECRET" \
      nohup pnpm --filter @rotra/queue exec next dev --port "$APP_PORT" >"$STATE/app.log" 2>&1 &
      echo $! >"$STATE/app.pid")
    for _ in $(seq 1 90); do app_up && break; sleep 1; done
    # The advisory run answers once and then exits, so the app must still be there a few seconds later.
    sleep 6
    app_up && break
  done
  app_up || { echo "Queue app did not start; see $STATE/app.log" >&2; exit 1; }
  echo "up: Go API on :${GO_PORT}, Queue app on :${APP_PORT}, logs in $STATE"
}

# The exact proposed Queue list (docs/architecture.md) plus what the Queue pages need from tracks 6 to 8.
moved_areas() {
  echo "${ROTRA_REPLAY_MOVED_AREAS:-/api/auth,/api/club,/api/clubs,/api/inventory,/api/join-requests,/api/license,/api/players,/api/profile-banners,/api/profile-characters,/api/public-sessions,/api/sessions,/api/sync,/api/venues}"
}

test_() {
  guard
  nvm_use
  # shellcheck disable=SC1091
  set -a; . "$STATE/env"; set +a
  ROTRA_REPLAY_APP_URL="http://localhost:${APP_PORT}" ROTRA_REPLAY_STATE="$STATE" \
    ROTRA_REPLAY_MOVED="$(moved_areas)" node "$HERE/replay.mjs"
}

# Puts the seed data back without restarting anything (the Go API only reads rows, so it keeps its pool).
reseed() {
  guard
  # shellcheck disable=SC1091
  set -a; . "$STATE/env"; set +a
  (cd "$API" && go run ./testdata/tools/offline-replay/seed "$DB_URL" "$REPLAY_PASSWORD")
}

down() {
  revert_workarounds
  for p in app go; do
    if [ -f "$STATE/$p.pid" ]; then
      pid="$(cat "$STATE/$p.pid")"
      pkill -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
      rm -f "$STATE/$p.pid"
    fi
  done
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  # The generated secrets belong to a stack that no longer exists; the logs stay for a look.
  rm -f "$STATE/env" "$STATE/rotra-api"
}

case "${1:-}" in
  up) up ;;
  test) test_ ;;
  reseed) reseed ;;
  down) down ;;
  all) trap down EXIT; up; test_ ;;
  *) echo "usage: run.sh up|test|reseed|down|all" >&2; exit 2 ;;
esac

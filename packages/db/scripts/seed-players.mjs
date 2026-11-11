#!/usr/bin/env node
// Seeds the 53 mock players (`@rotra/data` fixtures/players.seed.json) into a dev or test database as
// a club's own unclaimed records (D-2026-11-11-03: an unclaimed profile is a `club_players` row with
// no `players` row and no RTR ID), so the club sees them in Queue › Saved players and Add player.
// Never for production: the names are sample data. The seed file's `rtrId` values are mock-only and
// are not written: RTR IDs belong to registered players.
//
//   DIRECT_URL=postgres://… pnpm --filter @rotra/db db:seed:players -- --club <club username>
//
// Repeat-safe: rows that exist are left as they are. Like the Prisma CLI, it never reads `.env`;
// export DIRECT_URL in the shell.
import { readFile } from 'node:fs/promises'
import pg from 'pg'

function argument(name) {
  const at = process.argv.indexOf(`--${name}`)
  return at > 0 ? process.argv[at + 1] : undefined
}

const url = process.env.DIRECT_URL
const clubUsername = argument('club')
if (!url || !clubUsername) {
  console.error('Usage: DIRECT_URL=… node scripts/seed-players.mjs --club <club username>')
  process.exit(1)
}

const seed = JSON.parse(
  await readFile(new URL('../../data/src/fixtures/players.seed.json', import.meta.url), 'utf8'),
)
const players = seed.players

const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  await client.query('BEGIN')
  const club = await client.query(
    `SELECT c.id FROM club_accounts a JOIN clubs c ON c.id = a.club_id WHERE a.username = $1`,
    [clubUsername],
  )
  const clubId = club.rows[0]?.id
  if (!clubId) throw new Error(`No club with the username "${clubUsername}"`)

  let created = 0
  for (const p of players) {
    // The mock player id doubles as the club record id, so re-runs and other seeds line up.
    const inserted = await client.query(
      `INSERT INTO club_players (id, club_id, player_id, display_name, nickname, added_at, updated_at)
       VALUES ($1, $2, NULL, $3, $4, now(), now()) ON CONFLICT (id) DO NOTHING`,
      [p.id, clubId, p.fullName, p.nickname],
    )
    created += inserted.rowCount ?? 0
  }
  await client.query('COMMIT')
  console.log(
    `Seeded ${created} new of ${players.length} club-only unclaimed records for "${clubUsername}".`,
  )
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  await client.end()
}

#!/usr/bin/env node
// Seeds the 53 mock players (`@rotra/data` fixtures/players.seed.json) into a dev or test database as
// unclaimed Player Information profiles with their mock RTR IDs, so a club can find them in Queue ›
// Add player › Player Information. Never for production: the names are sample data.
//
//   DIRECT_URL=postgres://… pnpm --filter @rotra/db db:seed:players -- --club <club username>
//
// The club is recorded as the profiles' creating club (player_id_allocations.creating_club_id).
// Repeat-safe: rows that exist are left as they are, and each founding city's counter only moves up,
// so RTR IDs allocated later never collide with the seeded ones. Like the Prisma CLI, it never reads
// `.env`; export DIRECT_URL in the shell.
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const RTR = /^RTR-([A-Z]{2})-([A-Z]{3})-(\d{2})(\d{2})(\d{2})-(\d{4,})$/

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
const players = seed.players.map((p) => {
  const m = RTR.exec(p.rtrId)
  if (!m) throw new Error(`Unexpected RTR ID ${p.rtrId}`)
  const [, country, city, mm, dd, yy, seq] = m
  return { ...p, country, city, syncDate: `20${yy}-${mm}-${dd}`, sequence: Number(seq) }
})

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

  const locations = new Map(
    (
      await client.query(
        `SELECT id, country_code, city_code FROM location_codes WHERE country_code = 'PH'`,
      )
    ).rows.map((r) => [`${r.country_code}-${r.city_code}`, r.id]),
  )

  let created = 0
  for (const p of players) {
    const locationId = locations.get(`${p.country}-${p.city}`)
    if (!locationId) throw new Error(`No location code ${p.country}-${p.city} for ${p.rtrId}`)
    const inserted = await client.query(
      `INSERT INTO players (id, full_name, nickname, profile_state, updated_at)
       VALUES ($1, $2, $3, 'unclaimed', now()) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.fullName, p.nickname],
    )
    created += inserted.rowCount ?? 0
    // The counter must exist (and be at least this sequence) before its allocation row.
    await client.query(
      `INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence)
       VALUES ($1, $2::date, $3)
       ON CONFLICT (location_code_id, sync_date)
       DO UPDATE SET last_sequence = GREATEST(player_id_counters.last_sequence, EXCLUDED.last_sequence)`,
      [locationId, p.syncDate, p.sequence],
    )
    await client.query(
      `INSERT INTO player_id_allocations
         (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence)
       VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8)
       ON CONFLICT DO NOTHING`,
      [p.id, p.rtrId, clubId, locationId, p.country, p.city, p.syncDate, p.sequence],
    )
  }
  await client.query('COMMIT')
  console.log(
    `Seeded ${created} new of ${players.length} players (creating club "${clubUsername}").`,
  )
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  await client.end()
}

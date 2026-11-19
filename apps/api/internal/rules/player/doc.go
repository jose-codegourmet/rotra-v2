// Package player holds Go-only (bucket 2) rules: pure functions with no database, HTTP, clock or randomness. These are the
// Player rules of packages/data/src/player/player.rules.ts (the rank window: standard matches, rank status, the last-90-days
// stats) and visibility.rules.ts (who sees a name masked, who is listed in Player Information). The Player writes
// (internal/playerwrites) decide the switches these rules read; the reads apply them.
package player

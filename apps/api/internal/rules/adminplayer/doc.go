// Package adminplayer holds Go-only (bucket 2) rules of the Admin players: pure functions with no database, HTTP, clock or
// randomness. They are ported from packages/schema/src/{admin-player,email,name,phone,social-link,personal-details}.ts
// (what a form value may be, with Zod's own messages) and packages/data/src/admin-player/{adminPlayer,management}.rules.ts:
// the changed fields, the RTR ID change, the saved message and the date of an RTR ID (what the write routes decide on), and
// the list rules of the Admin screen (rank status, privileged search, account filter, same-name and duplicate groups,
// paging and the CSV), which no route runs because the directory read sends every row and the screen filters.
package adminplayer

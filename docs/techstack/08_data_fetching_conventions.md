## 7. Data Fetching Conventions

### React Query Setup

```ts
// lib/api/keys.ts — centralized query key factory
export const QUERY_KEYS = {
  player: (id: string) => ['player', id] as const,
  playerMatches: (id: string) => ['player', id, 'matches'] as const,
  clubMembers: (clubId: string) => ['club', clubId, 'members'] as const,
  session: (id: string) => ['session', id] as const,
  leaderboard: (filter: LeaderboardFilter) => ['leaderboard', filter] as const,
} as const
```

```ts
// lib/api/player.ts — typed API call functions
export async function fetchPlayer(id: string): Promise<Player> {
  const res = await fetch(`/api/players/${id}`)
  if (!res.ok) throw new APIError(res)
  return res.json()
}
```

### Server Actions (mutations)

Server Actions are used for all write operations from the Client App. They are defined in `server/actions/` and called directly from client components:

```ts
// server/actions/session.ts
'use server'

export async function markPlayerReady(sessionId: string, playerId: string) {
  const session = await validateSession()   // auth check
  // DB mutation via Prisma
  // Supabase Realtime broadcast to session channel
}
```

React Query mutations call Server Actions and invalidate the relevant query keys on success:

```ts
const mutation = useMutation({
  mutationFn: (playerId: string) => markPlayerReady(sessionId, playerId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session(sessionId) })
  },
})
```

### Admin App Data Fetching

The Admin App does **not** use Redux Toolkit. Data flow:

1. Server Component fetches data directly via Prisma (server-side, no API layer)
2. Client Components use React Query for interactive tables and mutations
3. Server Actions handle all mutations with re-validation

---

## 6. State Layer Rules

### When to use React Query vs Redux Toolkit

| Use React Query for | Use Redux Toolkit for |
|---------------------|-----------------------|
| Fetching player profiles, match history, leaderboard | Live session queue state |
| Club membership lists | Live score updates from WebSocket |
| Paginated admin tables | Player status map in an active session |
| Mutation + optimistic updates (mark payment, submit review) | Offline point queue (Umpire App) |
| Background refetch after mutations | Real-time notification state |

### Redux Store Structure (Client App)

```ts
// lib/store/index.ts
{
  session: {
    id: string | null,
    status: SessionStatus,
    players: Record<string, PlayerSessionState>,
    queue: QueuedMatch[],
    courts: CourtState[],
    connectedAt: number | null,
  },
  ui: {
    activeTab: string,
    toasts: Toast[],
  }
}
```

### Redux Store Structure (Umpire App)

```ts
// lib/store/index.ts
{
  match: {
    token: string,
    matchId: string,
    teamA: Player[],
    teamB: Player[],
    sets: SetScore[],
    currentSet: number,
    connectionStatus: 'connected' | 'disconnected' | 'reconnecting',
  },
  pointQueue: {
    pending: PointEvent[],   // queued while offline
    flushing: boolean,
  }
}
```

### Slice Conventions

```ts
// lib/store/slices/sessionSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// 1. All slice state is typed with explicit interfaces
// 2. Reducers handle WebSocket event payloads directly
// 3. No async thunks in slices — async is React Query's job
// 4. Selectors are co-located in the slice file (not separate selector files for small slices)
```

---

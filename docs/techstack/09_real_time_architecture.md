## 8. Real-Time Architecture

Supabase Realtime is used for two specific, high-value events only. There is no custom WebSocket server and no per-point event streaming. The umpire scores entirely in local state; the Que Master gets notified at the moments that operationally matter.

### What Uses Supabase Realtime

| Event | Trigger | Who receives it |
|-------|---------|----------------|
| Smart monitoring alert | `matches.score` row update crosses 90% of win condition (computed in a Postgres function on each score save) | Que Master — prompted to prepare the next match |
| Score submitted | `matches.status` row changes to `review_phase` | Que Master Court View card updates to final score; session leaderboard refreshes |

Everything else (queue position changes, player status updates, waitlist promotion) is handled via **React Query refetch** on mutation success — no persistent connection needed for these.

### Score Submission Flow

```
Umpire scores locally (Redux local state — no network calls per point)
    ↓
Umpire taps "Submit Final Score" → confirmation dialog
    ↓
Umpire confirms → single HTTP POST with complete final score
    ↓
Server writes match result to DB via Prisma
    ↓
Supabase Realtime broadcasts the matches row change to subscribers
    ↓
Que Master Court View updates: final score + match enters Review Phase
    ↓
Session leaderboard updates with result
```

### Smart Monitoring Flow

```
Umpire taps + POINT → Redux updates local score
    ↓
Score saved to DB (debounced or on each tap — lightweight single row update)
    ↓
Postgres function checks: score ≥ 90% of win condition?
    ↓
If yes → Supabase broadcasts to Que Master's session channel
    ↓
Que Master receives: "Match on Court [X] is nearing end" → prompted to prepare next match
```

### Offline Handling (Umpire App)

The umpire scores in local Redux state. If connection drops during a match, nothing is lost — the score exists on the umpire's device.

```
Connection drops
    ↓
Offline banner shown: "No connection — scoring saved locally"
    ↓
Umpire continues tapping points (local Redux state only)
    ↓
On reconnect: local score state is intact — umpire submits when ready
    ↓
Single HTTP POST with final score (same flow as normal submission)
```

No event queue, no flush logic, no partial sync — the complete score is always on the device.

### Kill Switch Integration

Kill switch state is fetched server-side on each page render (via the feature flag store in Supabase). Components wrap kill-switched features in a `<FeatureGate>` component:

```tsx
// apps/client/src/components/rotra/FeatureGate/FeatureGate.tsx
export function FeatureGate({
  flag,
  fallback = null,
  children,
}: FeatureGateProps) {
  const enabled = useFeatureFlag(flag)
  return enabled ? <>{children}</> : <>{fallback}</>
}
```

Kill switch evaluation is always **server-authoritative**. Client-side `useFeatureFlag` reads from a context populated by the server — it never evaluates the flag independently.

---

## 5. File & Naming Conventions

### App Directory Structure (Next.js App Router)

```
apps/client/src/
├── app/
│   ├── (auth)/           # Route group — unauthenticated routes
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (app)/            # Route group — authenticated routes
│   │   ├── dashboard/
│   │   ├── club/[slug]/
│   │   ├── session/[id]/
│   │   ├── player/[id]/
│   │   ├── leaderboard/
│   │   └── layout.tsx    # Auth guard + bottom nav
│   ├── layout.tsx        # Root layout (dark class, fonts, providers)
│   └── globals.css
├── components/           # App-local components (not shared)
├── hooks/                # App-local hooks
├── lib/
│   ├── api/              # API call functions (used by React Query)
│   ├── store/            # Redux store, slices
│   └── utils/
├── server/               # Server-only code (Next.js Server Actions, DB queries)
│   ├── actions/
│   └── queries/
└── middleware.ts         # Auth middleware
```

### Naming Rules

| Rule | Example |
|------|---------|
| Route folders use `kebab-case` | `app/(app)/match-history/` |
| Page files are always `page.tsx` | `app/(app)/session/[id]/page.tsx` |
| Layout files are always `layout.tsx` | |
| Loading skeletons are always `loading.tsx` | |
| Error boundaries are always `error.tsx` | |
| Server Actions are in `server/actions/[feature].ts` | `server/actions/session.ts` |
| Redux slices in `lib/store/slices/[feature]Slice.ts` | `lib/store/slices/sessionSlice.ts` |
| React Query keys in `lib/api/keys.ts` (constants object) | `QUERY_KEYS.session(id)` |

### Constants & Mocks

All app-wide constants and mock data live in `apps/client/src/app/constants/`. This is the single source of truth for static values and development/Storybook mocks used across the client app.

```
apps/client/src/app/constants/
├── nav.ts          # Navigation link definitions
├── mock-club.ts    # Mock club data for Storybook stories and development
└── ...             # Other constants and mocks as features grow
```

**Rules:**

1. **Constants go here, not inline** — if a value is reused across more than one file, it belongs in `constants/`, not duplicated at the usage site.
2. **Mocks go here, not in stories** — Storybook stories import mock data from `constants/`; they do not define their own fixture objects inline.
3. **One file per domain** — group related constants and mocks in a single file named after the domain (`mock-club.ts`, `nav.ts`, etc.). Do not create one file per constant.
4. **No runtime logic** — files in `constants/` are pure data. No async calls, no imports from `server/`, no side effects.
5. **Named after domain, not type** — prefer `mock-club.ts` over `mocks.ts` or `club-constants.ts`.

---

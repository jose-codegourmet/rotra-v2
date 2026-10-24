## 1. Monorepo Overview

ROTRA is a **Turborepo monorepo** with multiple apps sharing a database layer and configuration packages.

### Directory Structure

```
rotra/
├── apps/
│   ├── client/              # Player-facing app (Next.js 15, SSR-first)
│   │   ├── src/components/  # shadcn + client-specific components
│   │   └── .storybook/      # Client component stories
│   ├── admin/               # Internal platform dashboard (Next.js 15, SSR-first)
│   │   ├── src/components/  # shadcn + admin-specific components
│   │   └── .storybook/      # Admin component stories
│   └── umpire/              # Live scoring interface (Next.js 15, lightweight PWA)
│       ├── src/components/  # shadcn + umpire-specific components
│       └── .storybook/      # Umpire component stories
├── packages/
│   ├── db/              # Prisma schema, client, generated types, and role helpers
│   └── config/          # Shared tsconfig, tailwind base config
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### Why Turborepo

- **Incremental builds** — only rebuilds what changed (critical as the codebase grows)
- **Shared packages** without publishing to npm — `@rotra/db` and `@rotra/config` are first-class workspace packages
- **Parallel task execution** — `turbo build`, `turbo dev`, and `turbo lint` run across all apps simultaneously
- **Remote caching** — CI builds are dramatically faster; Vercel's Turborepo remote cache is supported natively


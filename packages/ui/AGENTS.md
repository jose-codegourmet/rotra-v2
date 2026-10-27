# AGENTS.md — `@rotra/ui`

> Nested entry for `packages/ui`. Root: [`/AGENTS.md`](../../AGENTS.md) · How to write a component:
> [coding conventions §3–5, §8](../../docs/coding-conventions.md#3-components).

**Last verified:** 2026-10-27

Every visual component and form, plus the one Storybook. Components take props and report through
callbacks; they never fetch, route, or touch Redux. Only `import type` from `@rotra/data`.

## Layout

```text
packages/ui/
├── .storybook/           main.ts, preview.tsx (theme toolbar, 375/1280 viewports), storybook.css
├── components.json       shadcn config (scaffold primitives, then move them into their kebab folder)
└── src/
    ├── lib/cn.ts         @rotra/ui/cn   clsx + tailwind-merge that knows the ROTRA tokens
    ├── lib/meta.ts       @rotra/ui/meta the ComponentMeta type
    ├── foundations/      Token and type stories (no exports)
    ├── components/<kebab-name>/<Name>.tsx · .stories.tsx · .meta.ts (· .variants.ts)
    └── forms/<kebab-name>/ the same + .defaultValues.ts and .schema.ts
```

## Adding a component export

There are no barrels. Each component folder gets **one subpath** in `package.json` `exports`, pointing
at its `.tsx`:

```json
"./match-card": "./src/components/match-card/MatchCard.tsx",
"./session-setup-form": "./src/forms/session-setup-form/SessionSetupForm.tsx"
```

Apps then `import { MatchCard } from '@rotra/ui/match-card'`. Inside this package, import other
components through the same subpaths (`@rotra/ui/button`); Storybook maps every export to its file, so
add the export before you import it.

## Storybook

```bash
nvm use && pnpm --filter @rotra/ui storybook   # :6006
```

- The **Theme** toolbar sets `data-theme` on `<html>`, like the apps. Check every story in both.
- Viewports: **Phone 375** and **Desktop 1280**.
- Fonts come from Google Fonts here (`preview-head.html`); the apps use `next/font`.
- Story titles by product area: `Shared/Button`, `Queue/MatchCard`, `Admin/LicenseForm`.

## Apps

Each app depends on `@rotra/ui` (`workspace:*`), lists it in `transpilePackages`, and its
`globals.css` has `@source "../../../../packages/ui/src"` so Tailwind sees the component classes.

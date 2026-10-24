# AGENTS.md — `@rotra/config`

> Nested entry for `packages/config`. Root: `/AGENTS.md` · Tokens: `.agents/context/design-tokens.md`.

## Exports

| Export | Path |
|--------|------|
| `@rotra/config/tailwind` | `tailwind-config/index.ts` |
| `@rotra/config/tsconfig` | `tsconfig/base.json` |

## Rules

- Color **names** live here as `var(--color-*)` references.
- Color **values** live per-app in `globals.css` (`:root` light + `.dark`).
- Both themes ship — do not remove light tokens or bake hex into components.
- Apps spread this config in their `tailwind.config.ts` and set `content` globs.

# AGENTS.md — `@rotra/config`

> Nested entry for `packages/config`. Root: [`/AGENTS.md`](../../AGENTS.md) · Tokens and theming:
> [architecture §6](../../docs/architecture.md#6-styling-theming-and-motion) ·
> [coding conventions §8](../../docs/coding-conventions.md#8-styling).

**Last verified:** 2026-10-27

## Current state

`tailwind-config/index.ts` is the **old v0** Tailwind 3-style config (Satoshi font, `bg-base` color
names, dark only). It is superseded. A Foundation ticket replaces it with Tailwind 4 CSS tokens copied
from the prototypes in `docs/frames/`. Do not build on the old names.

## Target

| Export | Holds |
|---|---|
| `@rotra/config/tsconfig` | Shared strict tsconfig bases |
| `@rotra/config/theme.css` (proposed) | Tailwind 4 `@theme` tokens + `:root` (dark, default) and `[data-theme="light"]` values from the prototypes |

## Rules

- Token values come from the prototypes' CSS variables; both themes are always defined together.
- Components never use hex or arbitrary colors; a missing color becomes a new token here first.

# AGENTS.md — `@rotra/config`

> Nested entry for `packages/config`. Root: [`/AGENTS.md`](../../AGENTS.md) · Tokens and theming:
> [architecture §6](../../docs/architecture.md#6-styling-theming-and-motion) ·
> [coding conventions §8](../../docs/coding-conventions.md#8-styling).

**Last verified:** 2026-10-27

## Exports

| Export | Holds |
|---|---|
| `@rotra/config/tsconfig` | Shared strict tsconfig base (bundler resolution, `noUncheckedIndexedAccess`) |
| `@rotra/config/theme.css` | Tailwind 4 `@theme` token map + `:root` (dark, default) and `[data-theme="light"]` values copied from the prototypes, a `touch:` variant and base type |

Each app's `src/app/globals.css` imports `tailwindcss` then `@rotra/config/theme.css`. Fonts are loaded
per app with `next/font` and set `--font`, `--mono` (and `--pixel` in `apps/player`) on `<html>`.

## Token utilities

| Utility | Token |
|---|---|
| `bg-bg`, `bg-surface`, `bg-elev`, `bg-overlay`, `bg-field` | Page, card, raised, overlay, input backgrounds |
| `text-fg`, `text-fg2`, `text-fg3` | Primary, secondary, tertiary text |
| `*-accent`, `*-accent-dim`, `*-accent-subtle`, `text-on-accent` | Brand green and the text that sits on it |
| `*-warn`, `*-warn-subtle`, `*-error`, `*-error-subtle` | States |
| `border-border`, `border-border-strong`, `bg-scrim` | Lines and sheet scrim |
| `*-court`, `*-court-line`, `*-court-free`, `*-court-free-line` | Court drawing |
| `*-gold`, `*-silver`, `*-bronze`, `*-qr-bg`, `*-qr-fg` | Player Information podium and QR only |
| `rounded-lg` / `rounded-md` | `--r` (10px) / `--r-sm` (6px) |
| `shadow-card`, `shadow-sheet`, `shadow-pop`, `shadow-drawer` | Card lift (light only), sheet, toast, phone drawer |
| `font-sans`, `font-mono`, `font-pixel` | Manrope, JetBrains Mono, Silkscreen |
| `touch:` | `(pointer: coarse), (max-width: 1024px)`: touch sizing from the experience contract |

Tailwind's default palette is removed (`--color-*: initial`), so `bg-red-500` does not exist.

## Rules

- Token values come from the prototypes' CSS variables; both themes are always defined together.
- This is the only file allowed to hold hex or rgba values. A missing colour becomes a new token here first.

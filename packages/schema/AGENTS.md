# AGENTS.md — `@rotra/schema`

> Nested entry for `packages/schema`. Root: [`/AGENTS.md`](../../AGENTS.md) · Rules:
> [coding conventions §7](../../docs/coding-conventions.md#7-shared-schemas--rotraschema).

**Last verified:** 2026-10-27

Shared Zod field rules that forms (`@rotra/ui`), mock fetchers (`@rotra/data`) and later route handlers
compose. One file per field family, one `exports` subpath per file, no barrels.

| Import | Exports | Accepts → returns |
|---|---|---|
| `@rotra/schema/email` | `emailField` | An email address; trimmed, no provider-specific changes |
| `@rotra/schema/phone` | `phoneField` | PH mobile starting `09`, `639` or `+639`, spaces/hyphens allowed → E.164 (`+639175550142`) |
| | `formatPhoneForDisplay(value)` | Groups a complete or partly typed PH mobile for display; other input unchanged |
| `@rotra/schema/date` | `dateField` | A real calendar date `YYYY-MM-DD`, unchanged |
| | `dateRangeField` | `{ start, end }` dates; `end` strictly after `start` |
| | `timeField` | 24-hour `HH:mm` (00:00–23:59), unchanged |
| `@rotra/schema/money` | `moneyField` | Integer centavos (number) or peso text with up to two decimals and comma groups → integer centavos; never a float. Empty is invalid |
| | `optionalMoneyField` | Empty peso text → null; otherwise nonnegative integer centavos |
| | `formatPeso(minor)` | Centavos → `₱1,500` / `₱1,500.50`, as the prototypes show money |
| `@rotra/schema/password` | `passwordField` | Any non-empty password, unchanged (**placeholder**: no minimum length until the auth spec) |
| `@rotra/schema/name` | `nameField` | Trimmed, required, max 60 (**placeholder** limit until a product rule) |

## Rules

- A rule moves here when a second form needs it. Never copy a field rule into a form.
- Optional fields stay optional: compose with `.optional()` / `.nullable()` and keep an empty input as
  null, never 0 (money especially). A form may wrap a field to use its own screen copy for errors.
- `passwordField` and `nameField` limits are placeholders. Screens that document their own rule (club
  and new passwords need at least 8 characters; venue names allow 80) apply it in the form's schema.
- Phone acceptance beyond PH mobile is an open decision.
- Tests (`nvm use && pnpm --filter @rotra/schema test`) are allowed only for money, phone parsing,
  ranking math and queue rules (ways-of-working §7).

# 12. Component Creation Guidelines

These rules standardize how components are created, structured, and reviewed across ROTRA apps.

---

## Scope

- Applies to all new components and component refactors in app code.
- Applies to all apps that own UI (`client`, `admin`, `umpire`).
- Use this together with the design and naming docs:
  - [Coding Design System](./05_coding_design_system.md#4-coding-design-system)
  - [File & Naming Conventions](./06_file_naming_conventions.md#5-file--naming-conventions)
- For form-specific rules (RHF + Zod, schema/default colocation), defer to:
  - [Form Engineering Guidelines](./11_form_engineering_guidelines.md#11-form-engineering-guidelines)

This doc is the source of truth for component-folder layout. Section 4.3 of the design system doc links back here.

---

## Non-Negotiable Standards

- **MUST** be a **functional component**. Class components are not permitted. `React.forwardRef` wrapping a function component is allowed and is required when the component renders a single interactive DOM element that needs ref forwarding.
- **MUST** prefer a shadcn/ui primitive as the base when one exists. Scaffold via the shadcn CLI into `components/ui/<kebab-name>/<PascalName>.tsx`, then customize on top.
- **MUST** use Tailwind utility classes mapped to ROTRA design tokens. No hardcoded hex values in components.
- **MUST** use `class-variance-authority` (`cva`) for any component that has variants or sizes.
- **MUST** place every `cva` recipe in a dedicated `ComponentName.variants.ts` file alongside the component. The `.tsx` imports the recipe; it does not declare it inline.
- **MUST** use `cn` from `@/lib/utils` to merge class names.
- **MUST** export the `cva` recipe as a named export (e.g. `buttonVariants`) from the `.variants.ts` file so siblings and consumers can reuse it.
- **MUST** declare the props type (`ComponentNameProps`) inside `ComponentName.tsx`, directly above the component definition. Props types **MUST NOT** live in `ComponentName.types.ts`.
- **MUST NOT** use `index.ts` barrel files. Import directly from the component file.
- **SHOULD** support `asChild` via Radix `Slot` for primitives that wrap a single element.

---

## Folder & File Structure

Every component lives in its own kebab-case folder. The folder contains a small, fixed set of dotted-suffix files:

```text
components/<category>/<component-name>/
├── ComponentName.tsx              # required — implementation + Props type
├── ComponentName.stories.tsx      # required — Storybook stories
├── ComponentName.variants.ts      # required when component has cva variants
├── ComponentName.helpers.ts       # optional — only when 3+ helpers exist
└── ComponentName.types.ts         # optional — only for non-prop shared types
```

### Folder Rules

- Folder name is **kebab-case** matching the component (e.g. `player-row/`, `bottom-nav/`, `score-display/`).
- All files inside the folder are **PascalCase with a dotted lowercase suffix** (`PlayerRow.tsx`, `PlayerRow.stories.tsx`, `PlayerRow.variants.ts`, `PlayerRow.helpers.ts`, `PlayerRow.types.ts`).
- Categories (`ui/`, `admin-ui/`, `modules/`, `layout/`) are owned per app. See [05_coding_design_system.md §4.3](./05_coding_design_system.md#43-component-conventions) for which categories each app uses.
- Import directly from the component file:
  - Good: `import { PlayerRow } from '@/components/ui/player-row/PlayerRow'`
  - Bad: `import { PlayerRow } from '@/components/ui/player-row'`

### When each file exists

| File | When to create |
| ---- | -------------- |
| `ComponentName.tsx` | Always. Holds the component, the `ComponentNameProps` type, and 0–2 inline helpers. |
| `ComponentName.stories.tsx` | Always. Covers the default state and each variant. |
| `ComponentName.variants.ts` | When the component uses any `cva` recipe. If it has no variants, do not create this file. |
| `ComponentName.helpers.ts` | Only when the component has **more than 2** helpers. With 1 or 2, keep them inline at the top of the `.tsx`. |
| `ComponentName.types.ts` | Only for non-prop shared types referenced by more than one of `.tsx`, `.helpers.ts`, `.variants.ts`, or `.stories.tsx` (e.g. an enum, a row shape, a discriminated union). If the only type is `ComponentNameProps`, do not create this file. |

---

## Sub-Component Structure

When a component exposes dedicated sub-parts as part of its public API (e.g. `Card` + `CardHeader` + `CardFooter`), place each sub-component in its own nested kebab folder under the parent:

```text
components/<category>/component-name/
├── ComponentName.tsx
├── ComponentName.stories.tsx
├── ComponentName.variants.ts          # if parent has variants
└── sub-component-name/
    ├── SubComponentName.tsx
    ├── SubComponentName.stories.tsx
    ├── SubComponentName.variants.ts   # if sub-component has variants
    ├── SubComponentName.helpers.ts    # optional, 3+ helpers
    └── SubComponentName.types.ts      # optional, non-prop shared types
```

### Sub-Component Rules

- Sub-components follow the **same file rules** as top-level components (kebab folder, PascalCase dotted-suffix files, props in the `.tsx`, variants in `.variants.ts`, etc.).
- Each sub-component is imported directly from its own file. The parent folder does **not** re-export sub-components.
- Use a sub-folder **only when the sub-component is part of the parent's public composition contract**. One-off internal pieces (a small layout helper used in only one render block) stay inlined inside the parent's `.tsx`.

### Shadcn-Origin Exception

Components imported from a shadcn registry (anything `npx shadcn@latest add` would produce — `Pagination`, `Card`, `Select`, `Dialog`, `DropdownMenu`, `Tabs`, `Sheet`, `Drawer`, `AlertDialog`, `Form`, `Breadcrumb`, `NavigationMenu`, `InputOTP`, etc.) keep shadcn's single-file layout. All sub-components are co-located as named exports inside the parent's `ComponentName.tsx`. Do **not** create nested kebab folders for the sub-parts.

```text
components/ui/pagination/
├── Pagination.tsx              # parent + PaginationContent, PaginationItem,
│                               # PaginationLink, PaginationPrevious,
│                               # PaginationNext, PaginationEllipsis, etc.
├── Pagination.stories.tsx
└── Pagination.variants.ts      # only if any sub-part uses cva
```

Why: shadcn primitives are atomic compounds. Splitting `PaginationLink` into its own folder produces a ~30-line file plus an unused `.stories.tsx` per sub-part, with no API or testing benefit.

Everything else in this doc still applies to shadcn-origin components: kebab parent folder, PascalCase dotted-suffix files, `cn` from `@/lib/utils`, ROTRA tokens (replace shadcn theme classes like `bg-background` / `text-muted-foreground` with ROTRA tokens like `bg-bg-base` / `text-text-secondary` per [05_coding_design_system.md §4.4](./05_coding_design_system.md#44-shadcnui-component-overrides)), one `ComponentName.variants.ts` holding every cva recipe used by the file (if cva is used), no `index.ts`.

Custom (non-shadcn) ROTRA components that expose a public composition still follow the nested-folder layout in "Sub-Component Structure" above.

> **Existing shadcn components are not retroactively migrated as part of this doc.** Layouts already split into sub-folders (e.g. the current `pagination/` tree) can be flattened in a follow-up. New shadcn additions follow this rule from day one.

---

## Helpers

Helpers are **small pure functions** that do simple calculations or transformations. Their job is to keep handler functions and render code readable, not to hide complex logic.

### What qualifies as a helper

- Formatting: `formatScore(value)`, `formatDuration(ms)`.
- Mapping: `getRankLabel(rank)`, `toBadgeVariant(status)`.
- Small calculations: `calculateNextSeed(rows, current)`.

### Helper Rules

- Helpers **MUST** be pure: no React hooks, no DOM access, no side effects, no network calls, no storage access.
- With **1 or 2 helpers**, define them inline at the top of `ComponentName.tsx`, above the component and below the imports. Do not create a `.helpers.ts` file for this case.
- With **more than 2 helpers**, extract **all** of them to `ComponentName.helpers.ts` and import from the component file. Do not split between inline and file.
- Anything that is not a small calculation — data fetching, persisted state, complex orchestration, cross-component coordination — **MUST NOT** live in `.helpers.ts`. Promote it to a hook in `hooks/` or to `lib/`.

---

## Variants File

`ComponentName.variants.ts` owns the `cva` recipe and the type derived from it. The `.tsx` consumes both.

### What lives in `.variants.ts`

- The `cva(...)` recipe, exported as `componentNameVariants` (camelCase).
- The `VariantProps`-derived type, exported as `ComponentNameVariants` (PascalCase).
- Nothing else. No JSX, no React imports, no helper functions.

### What lives in `.tsx`

- The component implementation.
- The `ComponentNameProps` type, which extends `ComponentNameVariants` (and any DOM attribute type).
- Inline helpers (when 1–2 exist).

---

## Worked Example: `Button`

`Button.variants.ts` — owns the cva recipe and exports the variants type:

```ts
import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-small font-medium transition-colors duration-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent text-bg-base hover:bg-accent-dim",
        secondary: "bg-bg-elevated text-text-primary hover:bg-bg-overlay",
        destructive: "bg-error text-text-primary hover:opacity-90",
        outline: "border border-border bg-transparent text-text-primary hover:bg-bg-elevated",
        ghost: "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-label",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

`Button.tsx` — owns the component and the props type, importing the recipe:

```tsx
"use client";

import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonVariants } from "./Button.variants";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariants & {
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
```

The current in-repo Button still keeps cva inline. It is the right shape semantically and is shown here for context only:

```7:55:apps/client/src/components/ui/button/Button.tsx
"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-small font-medium transition-colors duration-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent text-bg-base hover:bg-accent-dim",
        secondary: "bg-bg-elevated text-text-primary hover:bg-bg-overlay",
        destructive: "bg-error text-text-primary hover:opacity-90",
        outline:
          "border border-border bg-transparent text-text-primary hover:bg-bg-elevated",
        ghost:
          "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-label",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };
```

> **Note on existing components.** The current Button puts cva inline. New components and refactors **MUST** follow the split into `.variants.ts` + `.tsx`. Existing components are not retroactively migrated as part of this doc.

---

## Storybook Conventions

- Every component **MUST** ship a `ComponentName.stories.tsx` that covers the default state and each variant exposed via `cva`.
- Stories **MUST** import mock data from `app/constants/` (per [06_file_naming_conventions.md](./06_file_naming_conventions.md#constants--mocks)). Inline fixture objects in story files are not permitted.
- Sub-components **MUST** ship their own `SubComponentName.stories.tsx` with at least a default story; do not bury sub-component variants inside the parent's stories file.

---

## Naming Reference

| Item | Convention | Example |
| ---- | ---------- | ------- |
| Folder | `kebab-case` | `player-row/` |
| Component file | `PascalCase.tsx` | `PlayerRow.tsx` |
| Stories file | `PascalCase.stories.tsx` | `PlayerRow.stories.tsx` |
| Variants file (when component has cva) | `PascalCase.variants.ts` | `PlayerRow.variants.ts` |
| Helpers file (3+ helpers only) | `PascalCase.helpers.ts` | `PlayerRow.helpers.ts` |
| Types file (non-prop shared types only) | `PascalCase.types.ts` | `PlayerRow.types.ts` |
| Props type (always in `.tsx`) | `PascalCaseProps` | `PlayerRowProps` |
| Variants recipe export (in `.variants.ts`) | `camelCaseVariants` | `playerRowVariants` |
| Variants type export (in `.variants.ts`) | `PascalCaseVariants` | `PlayerRowVariants` |

---

## Implementer and Agent Checklist (Pre-PR)

- [ ] Component is a functional component. No class components.
- [ ] Lives in a kebab-case folder matching its name.
- [ ] All files inside the folder use PascalCase with a dotted lowercase suffix.
- [ ] Built on a shadcn primitive when one exists; otherwise composes Tailwind utilities directly.
- [ ] Uses `cn` from `@/lib/utils` for class merging.
- [ ] If the component has variants, the `cva` recipe lives in `ComponentName.variants.ts`, not inline in the `.tsx`.
- [ ] Variants file exports both `componentNameVariants` (recipe) and `ComponentNameVariants` (type).
- [ ] Props type is named `ComponentNameProps` and is declared in `ComponentName.tsx`, not in `.types.ts`.
- [ ] `ComponentName.types.ts` exists only if there are non-prop shared types; otherwise it is absent.
- [ ] Helpers are pure. With 1–2 helpers they are inline; with 3+ they are in `ComponentName.helpers.ts`.
- [ ] No `index.ts` barrel files in or around the component folder.
- [ ] Imports of the component reference the full file path (`.../player-row/PlayerRow`), not the folder.
- [ ] Storybook file exists and covers the default state plus each variant.
- [ ] Story fixtures are imported from `app/constants/`, not inlined.
- [ ] Sub-components, if any, follow the right placement: shadcn-origin compounds keep all sub-components co-located as named exports in the parent's `.tsx` (per "Shadcn-Origin Exception"); custom non-shadcn components put each sub-component in its own nested kebab folder following all of the above rules.

---

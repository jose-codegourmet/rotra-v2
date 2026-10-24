## 4. Coding Design System

This section defines how the ROTRA visual identity (`docs/branding.md`) maps to actual code. **All apps must use these conventions.** No app should define its own colors, spacing, or typography outside of this system.

---

### 4.1 Tailwind Custom Theme (`packages/config/tailwind-config/index.ts`)

The shared Tailwind config defines all ROTRA design tokens as Tailwind utilities:

```ts
// packages/config/tailwind-config/index.ts
import type { Config } from 'tailwindcss'

const config: Omit<Config, 'content'> = {
  darkMode: 'class', // Dark mode always active — class is added at root
  theme: {
    extend: {
      colors: {
        // Background scale
        'bg-base':     '#0B0B0C',
        'bg-surface':  '#1A1A1D',
        'bg-elevated': '#2A2A2E',
        'bg-overlay':  '#3A3A3F',

        // Text scale
        'text-primary':   '#F0F0F2',
        'text-secondary': '#9090A0',
        'text-disabled':  '#4A4A55',

        // Accent
        'accent':        '#00FF88',
        'accent-dim':    '#00CC6A',
        'accent-subtle': 'rgba(0, 255, 136, 0.13)',

        // Semantic
        'error':         '#FF4D4D',
        'warning':       '#FFB800',
        'border':        '#2A2A2E',
        'border-strong': '#404048',
      },

      fontFamily: {
        sans: ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display': ['28px', { lineHeight: '1.2', letterSpacing: '-0.5px', fontWeight: '700' }],
        'title':   ['22px', { lineHeight: '1.3', letterSpacing: '-0.3px', fontWeight: '600' }],
        'heading': ['18px', { lineHeight: '1.4', letterSpacing: '-0.2px', fontWeight: '600' }],
        'body':    ['15px', { lineHeight: '1.5', letterSpacing: '0px',    fontWeight: '400' }],
        'small':   ['13px', { lineHeight: '1.4', letterSpacing: '0.1px',  fontWeight: '400' }],
        'label':   ['12px', { lineHeight: '1.2', letterSpacing: '0.5px',  fontWeight: '500' }],
        'micro':   ['10px', { lineHeight: '1.2', letterSpacing: '0.8px',  fontWeight: '500' }],
      },

      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
      },

      borderRadius: {
        'sm':   '6px',
        'md':   '10px',
        'lg':   '14px',
        'xl':   '20px',
        'full': '9999px',
      },

      boxShadow: {
        'card':   '0 2px 12px rgba(0,0,0,0.4)',
        'modal':  '0 8px 32px rgba(0,0,0,0.6)',
        'accent': '0 0 16px rgba(0,255,136,0.25)',
      },

      transitionDuration: {
        'fast':    '100ms',
        'default': '200ms',
        'slow':    '350ms',
        'spring':  '400ms',
      },
    },
  },
}

export default config
```

Each app's `tailwind.config.ts` extends this base:

```ts
// apps/client/tailwind.config.ts
import baseConfig from '@rotra/config/tailwind'
import type { Config } from 'tailwindcss'

const config: Config = {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx}'],
}

export default config
```

---

### 4.2 CSS Custom Properties (Root Variables)

Applied in the root `layout.tsx` of each app via a global stylesheet. These map shadcn's expected variable names to ROTRA values:

```css
/* apps/[app]/src/app/globals.css — identical in each app */
:root,
.dark {
  --background:    #0B0B0C;
  --foreground:    #F0F0F2;
  --card:          #1A1A1D;
  --card-foreground: #F0F0F2;
  --popover:       #1A1A1D;
  --popover-foreground: #F0F0F2;
  --primary:       #00FF88;
  --primary-foreground: #0B0B0C;
  --secondary:     #2A2A2E;
  --secondary-foreground: #F0F0F2;
  --muted:         #2A2A2E;
  --muted-foreground: #9090A0;
  --accent:        #2A2A2E;
  --accent-foreground: #F0F0F2;
  --destructive:   #FF4D4D;
  --destructive-foreground: #F0F0F2;
  --border:        #2A2A2E;
  --input:         #2A2A2E;
  --ring:          #00FF88;
  --radius:        10px;
}
```

> **Rule:** Dark mode is always active. The `dark` class is added unconditionally to `<html>` in every app's root layout. There is no light mode.

---

### 4.3 Component Conventions

Each app owns its components. There is no shared library — components live inside the app that uses them.

#### Folder Structure

Every component — regardless of category (`shadcn`, `rotra`, `layout`) — must live in its own named subfolder. A single flat `.tsx` file at the category root is never permitted.

```
apps/client/src/components/
├── shadcn/                   # shadcn/ui generated components (Button, Input, Dialog, etc.)
│   └── button/
│       ├── Button.tsx
│       └── Button.stories.tsx
├── rotra/                    # Client-specific components
│   ├── player-row/
│   │   ├── PlayerRow.tsx
│   │   ├── PlayerRow.types.ts
│   │   └── PlayerRow.stories.tsx
│   ├── court-card/
│   ├── status-badge/
│   ├── tier-badge/
│   ├── queue-slider/
│   └── feature-gate/
└── layout/
    ├── bottom-nav/
    │   ├── BottomNav.tsx
    │   └── BottomNav.stories.tsx
    └── page-shell/

apps/admin/src/components/
├── shadcn/                   # shadcn/ui generated components
├── rotra/                    # Admin-specific components
│   ├── kill-switch-row/
│   ├── approval-card/
│   └── feature-gate/
└── layout/

apps/umpire/src/components/
├── shadcn/                   # shadcn/ui generated components
└── rotra/                    # Umpire-specific components
    ├── score-display/
    └── point-button/
```

#### Component File Structure

Every component is a functional component that lives in a kebab-case folder containing PascalCase dotted-suffix files (`ComponentName.tsx`, `ComponentName.stories.tsx`, optional `ComponentName.variants.ts` for `cva` recipes, optional `ComponentName.helpers.ts`, optional `ComponentName.types.ts`). Props types live in `ComponentName.tsx`, never in `.types.ts`.

Full convention — file roles, when each optional file is required, sub-component nesting, the worked Button example, and the pre-PR checklist — lives in [12_component_creation_guidelines.md](./12_component_creation_guidelines.md#12-component-creation-guidelines).

> **No `index.ts` barrel files.** Import directly from the component file — `import { PlayerRow } from '@/components/rotra/player-row/PlayerRow'`, not from the folder. Barrel files (`index.ts`) obscure where symbols come from and slow down TypeScript resolution. Reference the actual file.

#### Component Rules

1. **All components are dark-mode-only** — no light mode variants, no conditional color logic.
2. **No hardcoded hex values in components** — always use Tailwind utility classes mapped to the design token colors above.
3. **Interactive targets are minimum 44×44px** — enforced via `min-h-[44px] min-w-[44px]` on all interactive elements.
4. **One primary CTA per screen** — screens with an accent (`bg-accent`, `shadow-accent`) button must not have a second accent button.
5. **Real-time row updates use a pulse animation** — when a row updates (queue change, score update), apply the `animate-pulse-accent` utility once, then fade.
6. **`text-label` and `text-micro` are always uppercase** — enforced via `uppercase` class in the component itself, never left to the consumer.

#### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component files | PascalCase | `PlayerRow.tsx` |
| Component story files | `[Name].stories.tsx` | `PlayerRow.stories.tsx` |
| Component folder | kebab-case matching the component | `player-row/` |
| Component props interface | `[Name]Props` | `PlayerRowProps` |
| Hook files | `use-kebab-case.ts` | `use-session-state.ts` |
| Utility files | `kebab-case.ts` | `format-score.ts` |
| Type-only files | `[name].types.ts` | `session.types.ts` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_UNDO_DEPTH` |

---

### 4.4 shadcn/ui Component Overrides

The following shadcn components are generated into each app's `src/components/shadcn/` and customized:

| shadcn Component | ROTRA Override |
|-----------------|----------------|
| `Button` | Variant `"default"` → accent green with `shadow-accent`; variant `"outline"` → `border-strong` border; variant `"destructive"` → `#FF4D4D20` fill with red border |
| `Input` | Height 48px; background `bg-elevated`; focus ring `ring-accent` |
| `Card` | Background `bg-surface`; border `border`; radius `lg` |
| `Dialog` / `Sheet` | Background `bg-surface`; shadow `shadow-modal`; slide-up animation `350ms` |
| `Badge` | Pill shape via `radius-full`; uses status-specific color tokens |
| `Toast` | Background `bg-overlay`; slide-down entrance; auto-dismiss 3 seconds |
| `Table` | Used only in Admin App — `bg-surface` rows; `bg-elevated` on hover |

---

### 4.5 Animation Utilities

Add to `globals.css`:

```css
@keyframes pulse-accent {
  0%   { background-color: rgba(0, 255, 136, 0.13); }
  100% { background-color: transparent; }
}

.animate-pulse-accent {
  animation: pulse-accent 400ms ease-out forwards;
}
```

Used when: a row in the queue updates in real-time (new player status, score change, position change).

---

### 4.6 Responsive Breakpoints & Container Queries

Tailwind v4 ships with rem-based breakpoints by default (`--breakpoint-md: 48rem`). We override all of them with px values — a round number you can read, test against, and reason about without any unit conversion.

#### Breakpoint Scale (responsive variants — `sm:`, `md:`, …)

Defined in `packages/config/tailwind-config/index.ts` under `theme.screens`:

| Variant | px value | Use case |
|---------|----------|----------|
| `sm:`   | 640px    | Small tablet / large phone landscape |
| `md:`   | 768px    | Tablet portrait |
| `lg:`   | 1024px   | Small laptop / tablet landscape |
| `xl:`   | 1280px   | Standard desktop |
| `2xl:`  | 1536px   | Large / wide desktop |

These map directly to standard device widths. No conversion needed.

#### Container Query Scale (`@sm:`, `@md:`, …)

Defined in each app's `globals.css` via `@theme`, mirroring the screen scale:

```css
@theme {
  --container-sm:  640px;
  --container-md:  768px;
  --container-lg:  1024px;
  --container-xl:  1280px;
  --container-2xl: 1536px;
}
```

#### Usage

```tsx
// Responsive (viewport width)
<div className="flex-col md:flex-row lg:gap-8" />

// Container query (container width)
<div className="@container">
  <div className="flex-col @md:flex-row @lg:gap-8" />
</div>
```

#### Rules

1. **Never use rem in media queries** — write `640px` not `40rem`. The whole point is readability.
2. **Don't add custom one-off breakpoints** — use only `sm` / `md` / `lg` / `xl` / `2xl`. If you need a mid-point, reconsider the layout.
3. **Mobile-first** — start with the base style, then layer `md:` / `lg:` overrides. Never write `max-md:` to undo a desktop default.
4. **Container queries over media queries for components** — if a component adapts to its container size (not the viewport), reach for `@container` + `@md:`. Reserve viewport breakpoints for layout-level decisions (columns, sidebars, page shell).

---

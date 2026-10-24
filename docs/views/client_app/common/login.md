# View: Login

## Purpose
The entry point to the ROTRA client app for **players**. Players authenticate via Facebook OAuth. This screen is accessible without a valid session token. A single CTA handles both new signups and returning logins.

Platform admins who need to use the client app sign in separately on [`login-admin.md`](./login-admin.md) (`/login-admin`); that flow is not linked from this page.

## Route
`/login` — public, unauthenticated

## Roles
All (unauthenticated users only). Authenticated users are redirected to `/home`.

---

## Layout
Full-screen page. Background: `color-bg-base` (`#0B0B0C`). A single vertically and horizontally centered card holds all content. No navigation bar, no header.

```
┌─────────────────────────────────────┐  ← Full screen, bg-base
│                                     │
│            [ROTRA]                  │  ← Wordmark
│         Run the game.               │  ← Tagline
│                                     │
│  ┌─────────────────────────────┐    │  ← Card: bg-surface, radius-xl, shadow-modal
│  │                             │    │
│  │  [ f  Continue with         │    │  ← Primary button (Facebook blue variant)
│  │       Facebook ]            │    │
│  │                             │    │
│  │  By continuing, you agree   │    │  ← Legal copy, text-micro, color-text-disabled
│  │  to our Terms of Service    │    │
│  │  and Privacy Policy.        │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## Components

### ROTRA Wordmark
- Text: `ROTRA`
- Style: `text-display` (28px, Bold 700), `color-text-primary`, letter-spacing -1px
- Positioned above the card, centered horizontally
- Clear space below: `space-6` (24px)

### Tagline
- Text: `Run the game.`
- Style: `text-body` (15px, Regular 400), `color-text-secondary`
- Positioned directly below wordmark, centered
- Margin below: `space-8` (32px)

### Auth Card
- Background: `color-bg-surface` (`#1A1A1D`)
- Border: 1px solid `color-border` (`#2A2A2E`)
- Border radius: `radius-xl` (20px)
- Shadow: `shadow-modal` (`0 8px 32px rgba(0,0,0,0.6)`)
- Padding: `space-6` (24px) on all sides
- Max width: 360px
- Width: `calc(100% - 32px)` on mobile

### "Continue with Facebook" Button
- Height: 48px
- Width: 100% of card
- Background: `#1877F2` (Facebook blue — exception to ROTRA accent; this is a branded OAuth button)
- Border radius: `radius-md` (10px)
- Label: `Continue with Facebook` — `text-label` (12px, Medium 500), uppercase, white
- Left icon: Facebook "f" logo, 20px, white
- Icon-label gap: `space-3` (12px)
- Pressed state: background → `#1467D4`, scale 0.97
- Loading state: label replaced by spinner (white, 20px), button non-interactive

### Legal Copy
- Text: `By continuing, you agree to our Terms of Service and Privacy Policy.`
- Style: `text-micro` (10px, Medium 500), `color-text-disabled`
- "Terms of Service" and "Privacy Policy" are tappable links → `color-text-secondary`, underlined
- Positioned below the primary button with `space-3` (12px) top margin

---

## States

### Default
Card visible, "Continue with Facebook" button active and tappable.

### Loading (OAuth in progress)
Button enters loading state (spinner replaces label). Card non-interactive. No full-screen overlay — the card visually communicates the pending state.

### Error
Appears if the Facebook OAuth flow fails or is cancelled, or if the server rejects the token.
- A toast notification slides in from top: `color-bg-overlay`, `radius-lg`, `shadow-modal`
- Toast copy examples:
  - "Login failed. Please try again." (generic OAuth failure)
  - "Your account has been suspended. Contact support." (suspended account)
- Toast auto-dismisses after 4 seconds
- Button returns to active state after error

### Success
Invisible transition — on successful auth, app navigates to `/home` with a fade-in. No success state shown on the login screen itself.

---

## Responsive Layout

### Breakpoints
| Breakpoint | Range | Layout |
|-----------|-------|--------|
| Mobile | < 768px | Default (described above) |
| Tablet | 768px–1023px | Same as mobile — centered card, no sidebar |
| Desktop | ≥ 1024px | Two-column split screen |

### Desktop (≥ 1024px)

The login page becomes a **two-column layout** at desktop width:

```
┌──────────────────────┬───────────────────────┐
│                      │                       │
│    Left: Brand panel │  Right: Auth card     │
│                      │                       │
│    ROTRA             │  ┌─────────────────┐  │
│    Run the game.     │  │  ROTRA          │  │
│                      │  │  Admin Console  │  │
│    [Decorative       │  │                 │  │
│     badminton court  │  │  [ Continue     │  │
│     graphic or       │  │    with FB  ]   │  │
│     abstract pattern]│  │                 │  │
│                      │  │  Terms copy     │  │
│                      │  └─────────────────┘  │
│                      │                       │
└──────────────────────┴───────────────────────┘
```

- Left panel: 50% width, `color-bg-surface` background, flex-column centered; shows ROTRA wordmark (`text-display`, large) + tagline + brand copy ("The operating system for badminton sessions."); optional decorative geometric background element
- Right panel: 50% width, `color-bg-base`, flex-column centered; contains the auth card at `max-width: 400px`
- Auth card: same spec as mobile; `shadow-modal` is more pronounced on desktop
- No full-screen background — the two-panel treatment replaces it

### Card Width
- Mobile: `calc(100% - 32px)`, max 360px
- Tablet: 400px, centered
- Desktop: 400px (right panel), no max-width constraint on panel itself

---

## See also

- [Admin login (client app)](./login-admin.md) — `/login-admin`, for platform admins only.

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` `#0B0B0C` | Page background |
| `color-bg-surface` `#1A1A1D` | Card background |
| `color-border` `#2A2A2E` | Card border |
| `shadow-modal` | Card shadow |
| `radius-xl` 20px | Card corners |
| `text-display` 28px Bold | Wordmark |
| `text-body` 15px | Tagline |
| `color-text-primary` `#F0F0F2` | Wordmark |
| `color-text-secondary` `#9090A0` | Tagline |
| `color-text-disabled` `#4A4A55` | Legal copy |

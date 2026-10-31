import type { ReactNode } from 'react'

type IconDef = {
  /** Default width and height in px, as the prototype draws it */
  size: number
  strokeWidth: number
  /** Filled glyphs (play, pause) instead of strokes */
  filled?: boolean
  body: ReactNode
}

// Copied from the prototypes' icon sets (`const I = { … }` in each app/mocksups-app/*.html). Nav icons
// (`nav-*`) are the 20 px rail and dock icons; the rest are inline 13–18 px icons.
export const ICONS = {
  plus: { size: 20, strokeWidth: 2, body: <path d="M12 5v14M5 12h14" /> },
  'nav-pin': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
  },
  menu: { size: 20, strokeWidth: 2, body: <path d="M4 7h16M4 12h16M4 17h16" /> },
  'nav-home': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h14V10" />
      </>
    ),
  },
  'nav-users': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2" />
      </>
    ),
  },
  'nav-box': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
        <path d="M3 7.5 12 12l9-4.5M12 12v9" />
      </>
    ),
  },
  'nav-gear': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </>
    ),
  },
  'nav-card': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <rect x="3" y="5.5" width="18" height="13" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
  },
  'nav-device': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path d="M11 18.5h2" />
      </>
    ),
  },
  'nav-logout': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
  },
  'nav-live': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7" />
      </>
    ),
  },
  'nav-club': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <path d="M4 21V8l8-5 8 5v13" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
  },
  'nav-players': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
      </>
    ),
  },
  'nav-contact': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
  },
  'nav-name': {
    size: 20,
    strokeWidth: 2,
    body: (
      <>
        <path d="M4 20h4L19 9l-4-4L4 16v4z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
  },
  'nav-rank': { size: 20, strokeWidth: 2, body: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
  'nav-flag': { size: 20, strokeWidth: 2, body: <path d="M5 21V4M5 4h11l-2 4 2 4H5" /> },
  'nav-out': {
    size: 20,
    strokeWidth: 2,
    body: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" />,
  },
  clock: {
    size: 14,
    strokeWidth: 2.2,
    body: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  sun: {
    size: 16,
    strokeWidth: 2.2,
    body: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  moon: {
    size: 16,
    strokeWidth: 2.2,
    body: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  },
  lock: {
    size: 13,
    strokeWidth: 2.2,
    body: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  },
  alert: {
    size: 16,
    strokeWidth: 2.2,
    body: (
      <>
        <path d="M12 3 2 21h20L12 3z" />
        <path d="M12 10v5M12 18h.01" />
      </>
    ),
  },
  info: {
    size: 16,
    strokeWidth: 2.2,
    body: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
  },
  check: { size: 16, strokeWidth: 2.6, body: <path d="m5 12 4 4 10-10" /> },
  up: { size: 16, strokeWidth: 2.4, body: <path d="m6 15 6-6 6 6" /> },
  down: { size: 16, strokeWidth: 2.4, body: <path d="m6 9 6 6 6-6" /> },
  x: { size: 18, strokeWidth: 2.4, body: <path d="M6 6l12 12M18 6 6 18" /> },
  'x-small': { size: 16, strokeWidth: 2.6, body: <path d="M7 7l10 10M17 7 7 17" /> },
  back: { size: 16, strokeWidth: 2.4, body: <path d="m15 6-6 6 6 6" /> },
  arrow: { size: 18, strokeWidth: 2.2, body: <path d="M5 12h14M13 6l6 6-6 6" /> },
  play: { size: 16, strokeWidth: 0, filled: true, body: <path d="M7 4.5v15l13-7.5z" /> },
  pause: {
    size: 16,
    strokeWidth: 0,
    filled: true,
    body: (
      <>
        <rect x="6" y="4.5" width="4" height="15" rx="1" />
        <rect x="14" y="4.5" width="4" height="15" rx="1" />
      </>
    ),
  },
  pin: {
    size: 18,
    strokeWidth: 2.2,
    body: (
      <>
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
  },
  calendar: {
    size: 18,
    strokeWidth: 2.2,
    body: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
  },
  search: {
    size: 16,
    strokeWidth: 2.2,
    body: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  user: {
    size: 14,
    strokeWidth: 2.2,
    body: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
  copy: {
    size: 16,
    strokeWidth: 2.2,
    body: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
  },
  qr: {
    size: 16,
    strokeWidth: 2.2,
    body: (
      <>
        <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
        <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
        <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
        <path d="M14.5 14.5h2v2M20.5 14.5v6h-6M17.5 18.5h.01" />
      </>
    ),
  },
  edit: {
    size: 16,
    strokeWidth: 2.2,
    body: (
      <>
        <path d="M4 20h4L19 9l-4-4L4 16v4z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
  },
  external: {
    size: 14,
    strokeWidth: 2.2,
    body: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  },
} satisfies Record<string, IconDef>

export type IconName = keyof typeof ICONS

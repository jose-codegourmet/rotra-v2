# App icons

Home-screen and browser icons for the four apps, generated with Higgsfield (GPT Image 2.6) on 2026-11-27,
built on the ROTRA mini logo (three rings and the orbit dot, mint on near-black). The 1024 × 1024 PNGs here
are the sources; every size in the apps is resized from them.

| App | Source | Mark |
|---|---|---|
| Landing page (rotra.club) | `landing-1024.png` | The ROTRA logo alone |
| Queue | `queue-1024.png` | The logo with a light off-white **Q** in the middle |
| Player | `player-1024.png` | The logo with Tara and Rion as matching head-and-shoulders busts, flat-vector style |
| Admin | `admin-1024.png` | Inverted: near-black logo with a shield on a mint tile |

Each app gets, in `src/app/`: `favicon.ico` (16/32/48), `icon.png` (512), `apple-icon.png` (180, opaque;
iOS rounds the corners itself) and `manifest.ts` (`/manifest.webmanifest`). In `public/icons/`, it gets
`icon-192.png`, `icon-512.png` and `icon-maskable-512.png` (the art at 80% on its corner colour for Android masks).
Each layout sets `appleWebApp` (title and status bar for Add to Home Screen) and `themeColor`. The Queue, Player and Admin
`proxy.ts` matchers skip these paths, so iOS can fetch them without a session.

To rebuild after changing a source: resize with Pillow to the sizes above (the ICO from a 256 px RGBA copy; Turbopack rejects RGB ICO frames).

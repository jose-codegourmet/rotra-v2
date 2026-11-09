# Queue prototype script split into plain JS modules

Status: CANCELLED — the module split was never committed; the Queue mockup keeps its single inline script, and apps/mockup/queue-app/js/ is not in the repository
Date: 2026-11-07
App: queue (prototype infrastructure only)
Mockup: apps/mockup/queue-app/rotra-queue.html → apps/mockup/queue-app/js/
Screen ID: none; no screen changed

## What changed
- The Queue prototype's one inline `<script>` (about 4,260 lines) now lives in 40 plain ES modules
  under `apps/mockup/queue-app/js/`, cut at the script's existing section markers. The HTML keeps the
  CSS and markup and loads `<script type="module" src="/queue-app/js/main.js">`.
- The code moved verbatim. The only edits: `export`/`import` lines; the `SHEETS` and `ACT` objects
  are split into per-group objects that `sheets/sheets.js` and `actions.js` spread back together in
  the original order; the init tail moved into `main.js`; and top-level `let`s written from another
  file (`S`, `navMin`, `curAct`, `presenceTimer`, `heldPresence`, `paymentTimer`, `replayTimer`,
  `prototypeRouter`) are written through a setter (`setS(…)`, `setCurAct(…)`, …) exported next to them.
- `dev-server.mjs` serves `/queue-app/js/**/*.js`; it and `build.mjs` insert `router.js` before the
  first `<script` tag of any kind. `build.mjs` syntax-checks each module and copies `queue-app/js`
  into `dist/public/`.
- Opening `rotra-queue.html` straight from disk (`file://`) no longer works: browsers block modules
  there. Use `pnpm mockups`.

## No UI or behaviour change
Nothing a person sees or does changes. No business-logic or database-design doc is affected.

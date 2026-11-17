# ROTRA landing page (rotra.club)

Static marketing site for rotra.club: a scroll story for players plus a separate landing for club owners and
Queue Masters. One self-contained `index.html`; open it through any static server
(`python3 -m http.server --directory apps/landingpage`). No build step, no package, no dependencies in the
workspace; Lenis (smooth scroll) and the Rive web runtime load from jsDelivr.

**Status: wireframe.** It was designed as a claude.ai artifact on November 17, 2026 and copied here as is. It is
not wired to the apps or to real data.

## Pages (hash routes)

| Route | What it is |
|---|---|
| `#home` | Player landing: hero (“Do you play, or run the game?”, Tara drops through the hole), 01 the real Tara, 02 how a rank moves, 03 the leaderboards, 04 one record |
| `#clubs` | Club owners and Queue Masters: hero, 01 the assessors (Roster and levels), 02 run the night, 03 partner up (what a club gets, “Request a quotation”; prices are not public), 04 partner request |
| `#ranking`, `#request` | Detail pages (`#request` is the quotation request form) |
| `#assets` | List of every art asset on the site |

`#pricing` no longer has a page: the router redirects it to `#request`.

Sign-in links (header “Sign in”, footer Player and Club account) are `a[data-app="player|queue"]`; the main script
sets their hrefs to `<origin>/login` from the `PLAYER_APP_URL` and `QUEUE_APP_URL` constants at its top
(`https://player.rotra.club`, `https://queue.rotra.club`, per `docs/architecture.md`).

## Art

Generated with Higgsfield in the chosen “Samurai Jack” flat-vector direction (no outlines, near-black, dark
greens, one mint `#00FF88`).

- `hero-a/far.webp`, `mid.webp`, `near.webp`: the hero art, 2880×1620, flat-colour vector style, one aligned scene (far is
  opaque, mid and near transparent). They are the source for the Rive hall below and are not loaded by the page.
  `hero-a/still.webp` is the three stacked: the page shows it under the canvas until Rive has drawn, and keeps it if
  Rive fails. The old `.jpg` layers are still in the folder, unused.
- `rive/hero/`: Rive project for the hero hall, `art/hero.riv` once published. `rive/hero_split.py` splits the three
  layers by colour and position into 26 element images (`rive/hero/el/`, positions in `rive/hero/elements.json`):
  truss with lamp housings, four light cones (redrawn from their fitted edges), back floor, each stand in four tier
  slices, three crowd rows per stand, court floor with lines, ring plate. Holes are filled with the surrounding
  colour and every element has overdraw for the parallax. It also writes `scene.rml`: one 2880×1620 artboard, one
  group per depth (truss .15, cones .25, back floor .3, stands .5, crowd .55 between the stand slices, court and plate
  .85), view model `Hero` with `px`, `py` and `scroll` bound to the group positions through range-mapper
  converters, and state machine `Main` with the idle loops (cones sway 6 s, crowd rows bob 3 s, plate breathes 4 s).
  The page writes the view model every frame (see the hero part of the last script in `index.html`), and moves
  Tara's spot and Rion's side by the court's offset. To rebuild: in a virtualenv outside the repo with Pillow and
  numpy (`python3 -m venv /tmp/herovenv && /tmp/herovenv/bin/pip install pillow numpy`), run
  `/tmp/herovenv/bin/python rive/hero_split.py`, then `rive rive/hero --verify`, `rive inspect rive/hero --summary`,
  `rive rive/hero --publish`, copy `rive/hero/build/hero.riv` to `art/hero.riv` and bump the `?v=` on its `data-riv`.
  The parallax numbers live in both `hero_split.py` and `index.html`; change them together.
- `art/<set>-{far,mid,near}.webp` (sets lineup, moves, ladder, record on `#home`; clubs, assess, queue, pricing,
  request on `#clubs`), 2880 px wide: three parallax layers per section in `<div class="bgl">`. Far is opaque; mid and
  near carry real transparency and stack on top of it at opacity 1, with no blend mode. Loudness is set with
  `filter: brightness()` only (defaults far .45, mid .6, near .8 through `--b-far`, `--b-mid`, `--b-near`), dimmed per
  section where copy sits over bright shapes, and `.bgl::after` adds a dark centre veil (`--veil`, default .55). The
  footer's dark arena uses `art/footer-sky.webp` (opaque, cover, anchored bottom, brightness .5) behind Tara
  (`tara-outro`) and Rion (`rion-wave`) standing on the mint band; `art/footer-far-pair.webp` is no longer used (it
  cluttered the closing line). The old `.jpg` layers are still in the folder, unused. The three layers carry
  `loading="lazy"`, so phones (where they are `display:none`) never download them.
- `art/mobile/<scene>.webp` (the same nine scenes), 1080 px wide, 9:16: one tall still per section for phones, made
  with Higgsfield (`gpt_image_2_6`, reference = the scene's three layers flattened) and recomposed for portrait:
  structures and lights in the top third, a calm dark middle third for the copy, floor and foreground at the bottom.
  At 700 px and below it is the section's only background (`<img class="ly m">` in the `.bgl`, `loading="lazy"`,
  cover, centred, no drift or animation, `filter: brightness(var(--b-m))` set per section in the
  `/* mobile backgrounds */` CSS block) under the same veil; the three wide layers are hidden there. Above 700 px it
  is `display:none` and never loads.
- Section scenes: a section background can also be one Rive canvas, like the hero hall, by giving its `.bgl` a
  `data-bg-scene="<scene>"` (not `data-scene`: the story steps use that). Today all nine layered sections have one
  (scene, section, elements): `lineup` `#s-real` 6, `moves` `#s-ranking` 7, `ladder` `#s-ladder` 7, `record`
  `#s-record` 7, `clubs` `#c-top` 7, `assess` `#s-assessors` 7, `queue` `#c-get` 7, `pricing` `#s-pricing` 7,
  `request` `#s-request` 5. Elements that stand on something share its `depth` and do not move (nets, racks, gear,
  shuttles and sparks on a floor, panels, banners and signs on their structure); only airborne things drift, lights
  sway about their top, crowds bob 2 px. Each element's `brightness` follows its section's `--b-far/--b-mid/--b-near`.
  At rest (scroll 0.5) a scene shows its art unshifted, while the still layers drift by `--pp` and sit up to 15vh
  higher at mid-section, so the foreground of a scene sits lower than on the still page. On desktop (not touch, wider than 700 px, no reduced
  motion), while the `.bgl` is within one screen of the viewport, the page plays `art/scenes/<scene>.riv` over the
  three layers: Fit Cover in the layers' box (top -8%, 116% high), so the crop is the same; pointer x/y (eased) and
  the section's scroll progress (0 when its top reaches the bottom of the screen, 1 when its bottom leaves the top)
  go into the file's view model every frame through the same `depthParallax` the hero uses (the scene part of the
  last script in `index.html`). The three layers hide once the canvas has drawn; the `--veil` stays on top. The
  instance pauses off screen and is destroyed beyond two screens. On phones, touch, reduced motion, or if the file is
  missing or fails, the three layers stay as they are. `--b-far/--b-mid/--b-near` do not apply to the canvas: the
  brightness is baked into the file.
  - `rive/scenes/<scene>/`: one project per scene. `scene.json` lists the element images (in `el/`), back to front:
    ```
    { "name": "moves", "width": 2880, "height": 1620, "background": "#08080b",
      "elements": [
        { "file": "el/backdrop.webp", "x": 0, "y": 0, "depth": 0.1, "brightness": 0.45, "motion": "none" },
        { "file": "el/shuttle-1.webp", "x": 1820, "y": 310, "depth": 0.9, "brightness": 0.8,
          "motion": "drift", "amp": 14, "period": 5, "phase": 0.2, "pivot": [120, 80] } ] }
    ```
    `x`, `y`: the image's top-left on the artboard (its pixel size is its size there). `depth` 0..1: pointer offset
    `x = -40 * depth * px`, `y = -20 * depth * py` (artboard px, `px`/`py` in -1..1) plus a scroll offset
    `y = 145.8 * (0.5 - depth) * (scroll - 0.5)` (far elements drift down, near ones up; 9% of the height between
    depth 0 and 1; `scroll` 0.5 is the rest pose). `brightness` 0..1 (default 1) multiplies the colour and keeps
    the alpha, as CSS `brightness()`. `motion`: `none`, `sway` (rotation ±`amp` radians about `pivot`), `bob`
    (y ±`amp` px), `drift` (x and y ±`amp` px on a diagonal ellipse) or `breathe` (scale 1 to 1+`amp` about
    `pivot`); `period` in seconds, `phase` 0..1, `pivot` in the element's own pixels (default its centre).
  - `rive/scene.py` (Python standard library; uses `dwebp`, `cwebp` and `ffmpeg`) reads `scene.json` and writes
    `build-el/` (each element darkened to its brightness, since Rive has no image tint without scripts, and with its
    edge pixels repeated outward wherever it reaches a frame edge, far enough for its largest pointer, scroll and
    idle offset, so the canvas never shows through; the rest pose is unchanged), `scene.rml` (artboard `<name>`,
    view model `Scene` with `px`, `py`, `scroll`, state machine `Main` with the idle loops, no scripts), and
    `rive.yaml` and `.gitignore` if missing. `build/` and `build-el/` are not committed.
  - To build and publish a scene from a finished `scene.json` (from `apps/landingpage`):
    `python3 rive/scene.py rive/scenes/<scene>`, `rive rive/scenes/<scene> --verify`,
    `rive inspect rive/scenes/<scene> --summary` (`"problems": []`),
    `rive rive/scenes/<scene> --screenshot=/tmp/<scene>.png` (the rest pose), `rive rive/scenes/<scene> --publish`
    (Rive CLI, after `rive login`), `mkdir -p art/scenes && cp rive/scenes/<scene>/build/scene-<scene>.riv
    art/scenes/<scene>.riv`, add `data-bg-scene="<scene>"` to the section's `.bgl`, and bump `SCN.v` in `index.html`
    when replacing a published file. `rive/scenes/moves/scene.3layer.json` is the first three-layer proof, kept for
    reference; `scene.rich.json` there is the source of today's `scene.json`.
- `rive/tara/`: Rive project for the hero Tara. `tara.webp` is the Higgsfield redraw of Tara at 900×1356 (GPT Image 2.6,
  transparent background, the old idle sprite frame as reference). `rive/rig_tara.py` writes `scene.rml`: the image on a
  skinned mesh with bones for hips, chest, head, ponytail, both arms and the racket, plus the `Idle` loop. To rebuild:
  `ffmpeg -i rive/tara/tara.webp -vf "alphaextract,scale=300:452:flags=area" -f rawvideo -pix_fmt gray alpha.raw`,
  `python3 rive/rig_tara.py alpha.raw`, `rive rive/tara --publish` (needs the Rive CLI and `rive login`), then copy
  `rive/tara/build/tara.riv` to `art/tara-idle.riv` and bump the `?v=` in `CHR.riv` in `index.html`.
- `rive/rion/`: Rive project for the hero Rion, built the same way. `rion.webp` is the Higgsfield redraw of Rion at 900×1356
  (GPT Image 2.6, transparent background, the old `rion-idle` sprite frame as reference). `rive/rig_rion.py` writes
  `scene.rml`: the image on a skinned mesh with bones for hips, chest, head, the tablet arm (upper, fore, tablet) and the
  hand-in-pocket arm, a static ground bone for the legs, plus the `Idle` loop. To rebuild:
  `ffmpeg -i rive/rion/rion.webp -vf "alphaextract,scale=300:452:flags=area" -f rawvideo -pix_fmt gray alpha.raw`,
  `python3 rive/rig_rion.py alpha.raw`, `rive rive/rion --publish`, then copy `rive/rion/build/rion.riv` to
  `art/rion-idle.riv` and bump the `?v=` in `CHR.riv` in `index.html`.
- `art/hero.riv`: the hall, played through the Rive web runtime (`@rive-app/canvas` from jsDelivr) on the element with
  `data-riv`; `data-riv-fit="fill"` fills the element, `data-riv-parallax` feeds the hall's view model.
- Characters: every character on the site (hero, the five Taras in 01, the four players in 02, the waist-up `half-*`
  posters on the ranking page, the clubs hero and the assessors, footer, page cut-outs) is an element `class="chr" data-char="<pose>"` that plays one looping Rive file per pose:
  `art/tara-idle.riv` and `art/rion-idle.riv` (the hero rigs above) and `art/chars/<pose>.riv` for the rest
  (900×1356 artboards, state machine `Main`, fit Contain, bottom centre). Under the canvas the element shows
  `art/chars/<pose>.webp` until Rive has drawn its first frame, and keeps it if Rive fails or the reader prefers
  reduced motion. An instance exists only while its element is within one screen of the viewport, plays only
  while it is on screen and not faded out, and draws at most 2× CSS pixels.
  Each `art/chars/<pose>` comes from `rive/chars/<pose>/`: the Higgsfield still (`<pose>.webp`) and `rig.json`
  (bones, ground anchors and the idle keys; see the header of `rive/rig.py`). To rebuild one:
  `python3 rive/rig.py rive/chars/<pose>` (writes `scene.rml`), `rive rive/chars/<pose> --publish` (Rive CLI, after
  `rive login`), then copy `rive/chars/<pose>/build/<pose>.riv` and `rive/chars/<pose>/<pose>.webp` to `art/chars/`
  and bump the `?v=` in `CHR.riv` in `index.html`. `art/chars/tara-idle.webp` and `rion-idle.webp` are copies of
  `rive/tara/tara.webp` and `rive/rion/rion.webp`.
- `art/chars/lineup-clone-1`, `lineup-clone-2`, `lineup-real`, `lineup-clone-4`, `lineup-clone-5` (`.webp` and `.riv`):
  the five waist-up Taras of 01, 1600×2342 artboards whose bodies run off the bottom edge. Each slot's box keeps that
  aspect ratio and sits 3vh below the screen, sized in `vh` (CSS “v18” block); tints, ghost and glitch stay in CSS.
- `art/sprites/*.png` (old 40-frame strips) and `art/*-cut.png` (old cut-outs): no longer used by the page.
- `art/shots/`: screenshots of the Queue prototype (`apps/mockup/queue-app`), demo data. No longer used by the page:
  the four “Run the night” slides in `#c-get` are HTML/CSS vignettes (CSS and script blocks marked `vignettes`),
  short click-through stories whose labels and numbers come from the prototype and its demo data. Each plays only
  while its slide is the visible one; with reduced motion it shows its end state.

## Open product questions shown on the page

- Weekly, monthly and annual leaderboards are not in the docs yet (today: one overall board, 90 days).
- Where partner requests land.
- “ROTRA Partner” is not in `docs/product-terms.md` yet.

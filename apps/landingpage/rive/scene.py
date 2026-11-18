#!/usr/bin/env python3
"""Build a section background scene (one Rive file of element images at depths) from its scene.json.

Usage:  python3 rive/scene.py rive/scenes/<scene>
Then:   rive rive/scenes/<scene> --verify
        rive inspect rive/scenes/<scene> --summary          ("problems": [])
        rive rive/scenes/<scene> --publish                  (needs `rive login`)
        cp rive/scenes/<scene>/build/scene-<scene>.riv public/art/scenes/<scene>.riv

Python 3 standard library only. Shells out to dwebp and cwebp (libwebp tools) and ffmpeg.

scene.json (written by hand or by the art workers):
  { "name": "moves", "width": 2880, "height": 1620, "background": "#08080b",
    "elements": [                                   back to front
      { "file": "el/backdrop.webp", "x": 0, "y": 0, "depth": 0.1, "brightness": 0.45, "motion": "none" },
      { "file": "el/shuttle-1.webp", "x": 1820, "y": 310, "depth": 0.9, "brightness": 0.8,
        "motion": "drift", "amp": 14, "period": 5, "phase": 0.2, "pivot": [120, 80] } ] }
  file        image path relative to the scene folder (.webp or .png); its pixel size is its size on the artboard
  x, y        top-left of the image on the artboard, px
  depth       0..1: how far the element moves with the pointer and the scroll (0 none, 1 most)
  brightness  0..1, optional (default 1): the image's colour is multiplied by it, alpha untouched, exactly
              like CSS filter: brightness(). Rive has no image tint or colour filter without scripts, so the
              image is pre-darkened at build time into build-el/.
  motion      none | sway | bob | drift | breathe (default none); amp, period (s), phase (0..1), pivot
              sway     rotation +/- amp radians about pivot
              bob      y +/- amp px
              drift    x and y +/- amp px on a slow diagonal ellipse
              breathe  scale 1 .. 1 + amp about pivot
              pivot    a point in the element's own pixels, default its centre (sway, breathe)
              Seamless sine loops, keyed every 0.1 s.

Writes into the scene folder:
  build-el/   the elements as the file uses them: darkened, and with edge overscan where needed
  scene.rml   one artboard <name> (width x height), one node chain per element, view model Scene with
              numbers px, py (pointer, -1..1) and scroll (the section's progress, 0..1; 0.5 = rest),
              state machine Main with the idle loops. No scripts, so --publish needs no signing.
  rive.yaml   (name scene-<name>) and .gitignore (build/, build-el/), if missing

Parallax, artboard px (the page writes px, py and scroll every frame; see the scene loader in src/scripts/rive.js):
  pointer  x = -MAX_X * depth * px,  y = -MAX_Y * depth * py
  scroll   y = SCROLL * height * (SCROLL_D0 - depth) * (scroll - 0.5)
           far elements drift down and near ones up as the section passes; depth 0 and 1 travel
           SCROLL * height apart over the whole section.
Overscan: an element whose visible pixels reach a frame edge has its edge pixels repeated outward
(ffmpeg fillborders, smear) far enough that its largest pointer + scroll + idle offset never pulls it
off that edge, so the canvas never shows through. The rest pose is unchanged.
"""
import json
import math
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

MAX_X, MAX_Y = 40.0, 20.0      # pointer parallax at depth 1, artboard px
SCROLL, SCROLL_D0 = 0.09, 0.5  # scroll travel between depth 0 and 1 (fraction of the height); the depth that stays
FPS, STEP = 60, 6              # idle loops: keys every 6 frames
SAFETY = 2                     # extra overscan, px
ALPHA_EDGE = 8                 # an edge column/row with alpha above this counts as touching the frame edge
WEBP_Q = 90
MOTIONS = ('none', 'sway', 'bob', 'drift', 'breathe')


def fail(msg):
    sys.exit(f'scene.py: {msg}')


def run(cmd, out=False):
    p = subprocess.run([str(c) for c in cmd], capture_output=True)
    if p.returncode:
        fail(f'{" ".join(str(c) for c in cmd)}\n{p.stderr.decode(errors="replace")[-2000:]}')
    return p.stdout if out else None


def png_size(path):
    with open(path, 'rb') as f:
        head = f.read(24)
    if head[:8] != b'\x89PNG\r\n\x1a\n':
        fail(f'{path} is not a PNG')
    return struct.unpack('>II', head[16:24])


def decode(src, dst):
    """Any image to an RGBA-or-RGB PNG. dwebp for .webp (libwebp's own colour conversion, as browsers)."""
    if src.suffix.lower() == '.webp' and shutil.which('dwebp'):
        run(['dwebp', '-quiet', src, '-o', dst])
    else:
        run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-frames:v', '1', '-pix_fmt', 'rgba', dst])
    return png_size(dst)


def alpha_plane(png, w, h):
    a = run(['ffmpeg', '-v', 'error', '-i', png, '-vf', 'format=rgba,alphaextract',
             '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], out=True)
    if len(a) != w * h:
        fail(f'{png}: alpha plane is {len(a)} bytes, expected {w * h}')
    return a


def reach(e, w, h, height):
    """Largest |dx|, |dy| (artboard px) the element can move from rest: pointer + scroll + idle motion."""
    d = e['depth']
    mx = MAX_X * d
    my = MAX_Y * d + SCROLL * height * abs(SCROLL_D0 - d) / 2
    m, amp = e['motion'], e['amp']
    if m == 'drift':
        mx += amp
        my += amp
    elif m == 'bob':
        my += amp
    elif m == 'sway':
        px, py = e['pivot']
        r = max(math.hypot(cx - px, cy - py) for cx in (0, w) for cy in (0, h))
        mx += abs(amp) * r
        my += abs(amp) * r
    return math.ceil(mx) + SAFETY, math.ceil(my) + SAFETY


def load(scene_dir):
    path = scene_dir / 'scene.json'
    if not path.is_file():
        fail(f'{path} not found')
    s = json.loads(path.read_text())
    for k in ('name', 'width', 'height', 'elements'):
        if k not in s:
            fail(f'scene.json: missing "{k}"')
    if not s['elements']:
        fail('scene.json: no elements')
    s.setdefault('background', '#08080b')
    seen = set()
    for i, e in enumerate(s['elements']):
        where = f'scene.json elements[{i}]'
        for k in ('file', 'x', 'y', 'depth'):
            if k not in e:
                fail(f'{where}: missing "{k}"')
        if not (scene_dir / e['file']).is_file():
            fail(f'{where}: {e["file"]} not found')
        if not 0 <= e['depth'] <= 1:
            fail(f'{where}: depth {e["depth"]} is not in 0..1')
        e.setdefault('brightness', 1.0)
        if not 0 <= e['brightness'] <= 1:
            fail(f'{where}: brightness {e["brightness"]} is not in 0..1')
        e.setdefault('motion', 'none')
        if e['motion'] not in MOTIONS:
            fail(f'{where}: motion "{e["motion"]}" is not one of {", ".join(MOTIONS)}')
        if e['motion'] != 'none':
            for k in ('amp', 'period'):
                if k not in e:
                    fail(f'{where}: motion {e["motion"]} needs "{k}"')
            if e['period'] <= 0:
                fail(f'{where}: period must be > 0')
        e.setdefault('amp', 0.0)
        e.setdefault('period', 1.0)
        e.setdefault('phase', 0.0)
        base = ''.join(c if c.isalnum() or c in '-_' else '-' for c in Path(e['file']).stem) or 'el'
        name, n = base, 2
        while name in seen:
            name, n = f'{base}-{n}', n + 1
        seen.add(name)
        e['name'] = name
    return s


def prepare(scene_dir, s):
    """Darken and overscan each element into build-el/; fill in w, h, x, y (after overscan) and the asset path."""
    W, H = s['width'], s['height']
    out = scene_dir / 'build-el'
    out.mkdir(exist_ok=True)
    have_cwebp = shutil.which('cwebp') is not None
    with tempfile.TemporaryDirectory(prefix='scenepy-') as tmp:
        tmp = Path(tmp)
        for e in s['elements']:
            src = scene_dir / e['file']
            png = tmp / f'{e["name"]}.png'
            w, h = decode(src, png)
            e.setdefault('pivot', [w / 2, h / 2])
            x, y = int(round(e['x'])), int(round(e['y']))
            mx, my = reach(e, w, h, H)
            a = None
            ext = {'left': 0, 'right': 0, 'top': 0, 'bottom': 0}

            def col_hit(c):
                return 0 <= c < w and max(a[c::w]) > ALPHA_EDGE

            def row_hit(r):
                return 0 <= r < h and max(a[r * w:(r + 1) * w]) > ALPHA_EDGE

            touches = (x <= 0 or x + w >= W or y <= 0 or y + h >= H)
            if touches:
                a = alpha_plane(png, w, h)
                if x <= 0 and col_hit(-x):
                    ext['left'] = max(0, mx - (-x))
                if x + w >= W and col_hit(W - 1 - x):
                    ext['right'] = max(0, mx - (x + w - W))
                if y <= 0 and row_hit(-y):
                    ext['top'] = max(0, my - (-y))
                if y + h >= H and row_hit(H - 1 - y):
                    ext['bottom'] = max(0, my - (y + h - H))
            b = float(e['brightness'])
            e['ext'] = ext
            e['x'], e['y'] = x - ext['left'], y - ext['top']
            e['pivot'] = [e['pivot'][0] + ext['left'], e['pivot'][1] + ext['top']]
            e['w'], e['h'] = w + ext['left'] + ext['right'], h + ext['top'] + ext['bottom']
            if b >= 0.9995 and not any(ext.values()):
                e['asset'] = e['file']
                continue
            rel = e['file'].replace('/', '__').rsplit('.', 1)[0]
            dst = out / (rel + ('.webp' if have_cwebp else '.png'))
            key = json.dumps({'src': e['file'], 'mtime': src.stat().st_mtime_ns, 'size': src.stat().st_size,
                              'b': round(b, 4), 'ext': ext, 'q': WEBP_Q})
            keyf = out / (rel + '.key')
            if dst.is_file() and keyf.is_file() and keyf.read_text() == key:
                e['asset'] = dst.relative_to(scene_dir).as_posix()
                continue
            vf = ['format=rgba']
            if b < 0.9995:
                vf.append(f'colorchannelmixer=rr={b:.4f}:gg={b:.4f}:bb={b:.4f}')
            if any(ext.values()):
                vf += ['pad=w=iw+{l}+{r}:h=ih+{t}+{b}:x={l}:y={t}:color=black@0'.format(
                           l=ext['left'], r=ext['right'], t=ext['top'], b=ext['bottom']),
                       'format=gbrap',
                       'fillborders=left={left}:right={right}:top={top}:bottom={bottom}:mode=smear'.format(**ext),
                       'format=rgba']
            done = tmp / f'{e["name"]}-out.png'
            run(['ffmpeg', '-v', 'error', '-y', '-i', png, '-vf', ','.join(vf), '-frames:v', '1', done])
            if have_cwebp:
                run(['cwebp', '-quiet', '-q', WEBP_Q, '-alpha_q', 100, '-m', 6, '-sharp_yuv', done, '-o', dst])
            else:
                shutil.copyfile(done, dst)
            keyf.write_text(key)
            e['asset'] = dst.relative_to(scene_dir).as_posix()


def keys(f_to_v, n):
    frames = list(range(0, n + 1, STEP))
    if frames[-1] != n:
        frames.append(n)
    return ''.join(f'<KeyFrameDouble value="{f_to_v(f):.6f}" frame="{f}" interpolationType="linear"/>'
                   for f in frames)


def write_rml(scene_dir, s):
    W, H = s['width'], s['height']
    ids = iter(range(10, 1000000))
    nid = lambda: f'0:{next(ids)}'
    out = []
    w = out.append
    VM, PX, PY, SC, INST = nid(), nid(), nid(), nid(), nid()
    SM, STYLE, AB = nid(), nid(), nid()
    els = s['elements']
    asset_id = {e['name']: nid() for e in els}

    conv, conv_rml = {}, []
    for d in sorted({round(e['depth'], 4) for e in els}):
        cx, cy, cs = nid(), nid(), nid()
        conv[d] = (cx, cy, cs)
        tag = f'd{d:.3f}'
        a = SCROLL * H * (SCROLL_D0 - d) / 2
        conv_rml += [
            f'<DataConverterRangeMapper minInput="-1" maxInput="1" minOutput="{MAX_X * d:.4f}" '
            f'maxOutput="{-MAX_X * d:.4f}" name="{tag} pointer x" id="{cx}"/>',
            f'<DataConverterRangeMapper minInput="-1" maxInput="1" minOutput="{MAX_Y * d:.4f}" '
            f'maxOutput="{-MAX_Y * d:.4f}" name="{tag} pointer y" id="{cy}"/>',
            f'<DataConverterRangeMapper minInput="0" maxInput="1" minOutput="{-a:.4f}" '
            f'maxOutput="{a:.4f}" name="{tag} scroll" id="{cs}"/>']

    body, anims, layers = [], [], []
    for e in reversed(els):                       # RML draws the first child in front
        n = e['name']
        cx, cy, cs = conv[round(e['depth'], 4)]
        body += [f'<Node name="{n}" id="{nid()}">',
                 f'<DataBindContext sourcePathIds="{VM}-{PX}" propertyKey="13" converterId="{cx}"/>',
                 f'<DataBindContext sourcePathIds="{VM}-{PY}" propertyKey="14" converterId="{cy}"/>',
                 f'<Node name="{n} scroll" id="{nid()}">',
                 f'<DataBindContext sourcePathIds="{VM}-{SC}" propertyKey="14" converterId="{cs}"/>']
        img = (f'name="{n}" originX="0" originY="0" assetId="{asset_id[n]}" id="{nid()}"/>')
        if e['motion'] == 'none':
            body += [f'<Image x="{e["x"]:.2f}" y="{e["y"]:.2f}" {img}', '</Node>', '</Node>']
            continue
        pvx, pvy = e['x'] + e['pivot'][0], e['y'] + e['pivot'][1]
        mid = nid()
        body += [f'<Node x="{pvx:.2f}" y="{pvy:.2f}" name="{n} motion" id="{mid}">',
                 f'<Image x="{e["x"] - pvx:.2f}" y="{e["y"] - pvy:.2f}" {img}', '</Node>', '</Node>', '</Node>']
        N = max(2 * STEP, int(round(e['period'] * FPS)))
        amp, ph = float(e['amp']), float(e['phase'])
        th = lambda f: 2 * math.pi * (f / N + ph)
        m = e['motion']
        props = []
        if m == 'drift':
            props = [('x', lambda f: pvx + amp * math.sin(th(f))),
                     ('y', lambda f: pvy + amp * math.sin(th(f) - math.pi / 3))]
        elif m == 'bob':
            props = [('y', lambda f: pvy - amp * math.sin(th(f)))]
        elif m == 'sway':
            props = [('rotation', lambda f: amp * math.sin(th(f)))]
        elif m == 'breathe':
            sc = lambda f: 1 + amp * (1 - math.cos(th(f))) / 2
            props = [('scaleX', sc), ('scaleY', sc)]
        an = nid()
        anims.append(f'<LinearAnimation loopValue="loop" duration="{N}" name="{m} {n}" id="{an}">'
                     f'<KeyedObject objectId="{mid}">'
                     + ''.join(f'<KeyedProperty property="{p}">{keys(fn, N)}</KeyedProperty>' for p, fn in props)
                     + '</KeyedObject></LinearAnimation>')
        layers.append((n, an))
    if not layers:
        an = nid()
        anims.append(f'<LinearAnimation loopValue="loop" duration="60" name="Still" id="{an}"/>')
        layers.append(('Still', an))

    bg = s['background'].lstrip('#')
    if len(bg) != 6:
        fail(f'background "{s["background"]}" is not #rrggbb')
    pad = 600
    body += [f'<Shape x="{W / 2:.2f}" y="{H / 2:.2f}" name="background" id="{nid()}">',
             f'<Rectangle width="{W + 2 * pad}" height="{H + 2 * pad}" name="background rect" id="{nid()}"/>',
             f'<Fill name="background fill" id="{nid()}"><SolidColor colorValue="FF{bg.upper()}" '
             f'name="background colour" id="{nid()}"/></Fill>',
             '</Shape>']

    w('<Rive version="1" kind="fragment">')
    w('<!-- Generated by rive/scene.py from scene.json; edit scene.json, not this file. '
      'First child draws in front. -->')
    w(f'<Artboard defaultStateMachineId="{SM}" viewModelId="{VM}" viewModelInstanceId="{INST}" clip="true" '
      f'styleId="{STYLE}" width="{W}" height="{H}" name="{s["name"]}" id="{AB}">')
    w(f'<LayoutComponentStyle name="Artboard Style" id="{STYLE}"/>')
    out.extend(body)
    out.extend(anims)
    w(f'<StateMachine name="Main" id="{SM}">')
    for i, (n, an) in enumerate(layers):
        st = nid()
        out.extend([f'<StateMachineLayer name="{n}" id="{nid()}">',
                    f'<AnyState x="{i * 600}" y="-150"/>', f'<ExitState x="{i * 600 + 300}" y="-150"/>',
                    f'<EntryState x="{i * 600}" y="0"><StateTransition stateToId="{st}"/></EntryState>',
                    f'<AnimationState x="{i * 600 + 200}" y="150" animationId="{an}" id="{st}"/>',
                    '</StateMachineLayer>'])
    w('</StateMachine>')
    w('</Artboard>')
    out.extend(conv_rml)
    w(f'<ViewModel defaultInstanceId="{INST}" name="Scene" id="{VM}">')
    w(f'<ViewModelPropertyNumber name="px" id="{PX}"/>')
    w(f'<ViewModelPropertyNumber name="py" id="{PY}"/>')
    w(f'<ViewModelPropertyNumber name="scroll" id="{SC}"/>')
    w(f'<ViewModelInstance exports="true" name="Default" id="{INST}">')
    for p, v in ((PX, 0), (PY, 0), (SC, 0.5)):
        w(f'<ViewModelInstanceNumber propertyValue="{v}" viewModelPropertyId="{p}"/>')
    w('</ViewModelInstance>')
    w('</ViewModel>')
    for e in els:
        w(f'<ImageAsset file="{e["asset"]}" name="{e["name"]}" id="{asset_id[e["name"]]}"/>')
    w('</Rive>')
    (scene_dir / 'scene.rml').write_text('\n'.join(out) + '\n')


def main(argv):
    if len(argv) != 2:
        fail('usage: python3 rive/scene.py rive/scenes/<scene>')
    for tool in ('ffmpeg',):
        if not shutil.which(tool):
            fail(f'{tool} not found on PATH')
    scene_dir = Path(argv[1]).resolve()
    s = load(scene_dir)
    prepare(scene_dir, s)
    write_rml(scene_dir, s)
    yaml = scene_dir / 'rive.yaml'
    if not yaml.exists():
        yaml.write_text(f'name: scene-{s["name"]}\n')
    gi = scene_dir / '.gitignore'
    if not gi.exists():
        gi.write_text('build/\nbuild-el/\n')
    for e in s['elements']:
        ext = e['ext']
        print(f'{e["name"]:<24} depth {e["depth"]:.2f}  brightness {e["brightness"]:.2f}  {e["motion"]:<7} '
              f'{e["w"]}x{e["h"]} at {e["x"]},{e["y"]}  overscan L{ext["left"]} R{ext["right"]} '
              f'T{ext["top"]} B{ext["bottom"]}  -> {e["asset"]}')
    print(f'wrote {scene_dir / "scene.rml"} ({len(s["elements"])} elements)')


if __name__ == '__main__':
    main(sys.argv)

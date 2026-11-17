"""Generic character rig: one transparent image -> a skinned Rive scene (scene.rml) with an idle loop.

Run:   python3 rive/rig.py <project-dir>                       writes <project-dir>/scene.rml
       python3 rive/rig.py <project-dir> --overlay out.png     bones over the character (joint check)
       python3 rive/rig.py <project-dir> --weights out.png     mesh vertices tinted by their bones
       (the two debug options do not write scene.rml)

<project-dir>/rig.json:
  image      image file in the project dir (needs an alpha channel); its size must equal width x height
  width      artboard and image width, px
  height     artboard and image height, px
  cell       mesh grid cell size in image px (default 15); every cell holding any ink becomes two triangles
  duration   loop length in frames at 60 fps (default 240)
  name       artboard name (optional; default: image name, capitalised)
  bones      [{name, from: [x, y] (roots only), to: [x, y], parent: name | null}], parents before children;
             parent null = RootBone; a child starts at its parent's tip
  anchors    [{name, points: [[x, y], ...]}]: a polyline of pixels that never moves (feet on the ground);
             each anchor becomes one RootBone that is never keyed
  keys       {bone: {rotation | x | y: [[frame, delta], ...]}}: deltas from the rest pose (radians or px),
             eased cubic; x / y only on root bones; first value = last value for a seamless loop
  falloff    optional (default 2): power of the inverse geodesic distance that blends neighbouring bones

Weights: each bone segment and anchor seeds a Dijkstra over the opaque pixels (a coarse grid), so a part only
"sees" the bones it is connected to through ink. A second pass measures, per source, the geodesic distance
to the ink it owns (is nearest to); a source whose region is far away is "shadowed" by the bone in between
(the Chest seen from a thigh, through the Hips), so its distance is raised to d_nearest + 2 x that gap. A
vertex's influences are the best 4 sources by 1 / (D + eps)^falloff, faded out between 3x and 6x the nearest
distance, totalling 255: a long limb between two sources (a leg between Hips and the ground) gets a smooth
fade, a tight joint (elbow) a short one. Mesh vertices are split where the cells
around them hold ink that is not connected inside that neighbourhood (a racket beside a leg), so unrelated
parts never share a vertex. Vertices with no ink path (cells holding only faint fringe, alpha < 128) copy the
weights of the nearest vertex that has one, so the fringe stays on the part it borders; if no vertex has an
ink path at all, the nearest bone by straight distance takes the vertex.

Python standard library only; ffmpeg reads the alpha and writes the debug images.
"""
import base64, heapq, json, math, os, subprocess, sys

GEO = 3          # geodesic grid: one node per GEO x GEO image px
SOLID = 128      # alpha that counts as ink for connectivity
FAINT = 4        # alpha above this keeps a mesh cell
FPS = 60
EASE = '<CubicEaseInterpolator x1="0.42" y1="0" x2="0.58" y2="1"/>'


def die(msg):
    sys.exit('rig.py: ' + msg)


# ---------------------------------------------------------------- input

def load(project):
    cfg = json.load(open(os.path.join(project, 'rig.json')))
    for k in ('image', 'width', 'height', 'bones'):
        if k not in cfg: die(f'rig.json needs "{k}"')
    cfg.setdefault('cell', 15)
    cfg.setdefault('duration', 240)
    cfg.setdefault('anchors', [])
    cfg.setdefault('keys', {})
    cfg.setdefault('falloff', 2)
    cfg.setdefault('name', os.path.splitext(cfg['image'])[0].capitalize())
    return cfg


def read_alpha(path, W, H):
    probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                            'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True)
    if probe.returncode: die(f'cannot read {path}: {probe.stderr.strip()}')
    iw, ih = (int(v) for v in probe.stdout.strip().split(',')[:2])
    if (iw, ih) != (W, H): die(f'{path} is {iw}x{ih}, rig.json says {W}x{H}')
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-frames:v', '1', '-vf', 'alphaextract,format=gray',
                          '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True)
    if out.returncode or len(out.stdout) != W * H:
        die(f'cannot extract the alpha of {path} (does it have one?): {out.stderr.decode().strip()}')
    return out.stdout


# ---------------------------------------------------------------- skeleton

class Rig:
    def __init__(self, cfg):
        self.bones = {}          # name -> dict(a, b, parent, anchor, points)
        for b in cfg['bones']:
            n, par = b['name'], b.get('parent')
            if n in self.bones: die(f'bone "{n}" defined twice')
            if par is None:
                if 'from' not in b: die(f'root bone "{n}" needs "from"')
                a = tuple(b['from'])
            else:
                if par not in self.bones: die(f'bone "{n}": parent "{par}" must come earlier')
                if 'from' in b: die(f'bone "{n}" has a parent, so it starts at the parent\'s tip; drop "from"')
                a = self.bones[par]['b']
            bb = tuple(b['to'])
            if a == bb: die(f'bone "{n}" has zero length')
            self.bones[n] = dict(a=a, b=bb, parent=par, anchor=False, points=[a, bb])
        for an in cfg['anchors']:
            n, pts = an['name'], [tuple(p) for p in an['points']]
            if n in self.bones: die(f'anchor "{n}" clashes with a bone name')
            if not pts: die(f'anchor "{n}" needs points')
            self.bones[n] = dict(a=pts[0], b=(pts[0][0] + 10, pts[0][1]), parent=None, anchor=True, points=pts)
        self.order = list(self.bones)
        self.idx = {n: i for i, n in enumerate(self.order)}
        self.world, self.local = {}, {}
        for n in self.order:
            B = self.bones[n]
            self.world[n] = 0.0 if B['anchor'] else math.atan2(B['b'][1] - B['a'][1], B['b'][0] - B['a'][0])
            self.local[n] = self.world[n] - (self.world[B['parent']] if B['parent'] else 0.0)

    def segments(self, n):
        pts = self.bones[n]['points']
        return [(pts[0], pts[0])] if len(pts) == 1 else list(zip(pts, pts[1:]))

    def straight(self, n, p):
        return min(seg_dist(p, a, b) for a, b in self.segments(n))


def seg_dist(p, a, b):
    vx, vy = b[0] - a[0], b[1] - a[1]
    L2 = vx * vx + vy * vy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2))
    return math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy)


# ---------------------------------------------------------------- geodesic distance over the ink

class Ink:
    def __init__(self, alpha, W, H):
        self.W, self.H = W, H
        self.gw, self.gh = -(-W // GEO), -(-H // GEO)
        solid = bytes(1 if v >= SOLID else 0 for v in range(256))
        need = GEO                                  # a full line of solid px through the block
        counts = [0] * (self.gw * self.gh)
        for y in range(H):
            row = alpha[y * W:(y + 1) * W].translate(solid)
            base = (y // GEO) * self.gw
            for i in range(self.gw):
                counts[base + i] += sum(row[i * GEO:(i + 1) * GEO])
        self.ink = bytearray(1 if c >= need else 0 for c in counts)

    def center(self, k):
        return ((k % self.gw + 0.5) * GEO, (k // self.gw + 0.5) * GEO)

    def node(self, x, y):
        i, j = int(x // GEO), int(y // GEO)
        if 0 <= i < self.gw and 0 <= j < self.gh: return j * self.gw + i
        return None

    def seeds(self, rig, n):
        """Ink nodes the bone (or anchor polyline) passes through, with their straight offset."""
        out = {}
        for a, b in rig.segments(n):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            steps = max(1, int(L / (GEO / 3)))
            for s in range(steps + 1):
                t = s / steps
                k = self.node(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                if k is not None and self.ink[k]:
                    out[k] = min(out.get(k, 1e9), rig.straight(n, self.center(k)))
        if not out:                                  # bone drawn off the ink: start from the nearest ink node
            best = min((rig.straight(n, self.center(k)), k) for k in range(len(self.ink)) if self.ink[k])
            print(f'warning: "{n}" does not cross any ink; seeded from the nearest ink {best[0]:.0f}px away')
            out[best[1]] = best[0]
        return out

    def dijkstra(self, seeds):
        gw, gh, ink = self.gw, self.gh, self.ink
        INF = float('inf')
        dist = [INF] * (gw * gh)
        heap = []
        for k, d in seeds.items():
            dist[k] = d
            heap.append((d, k))
        heapq.heapify(heap)
        D1, D2 = GEO, GEO * math.sqrt(2)
        nb = ((-1, 0, D1), (1, 0, D1), (0, -1, D1), (0, 1, D1), (-1, -1, D2), (1, -1, D2), (-1, 1, D2), (1, 1, D2))
        pop, push = heapq.heappop, heapq.heappush
        while heap:
            d, k = pop(heap)
            if d > dist[k]: continue
            i, j = k % gw, k // gw
            for di, dj, c in nb:
                ii, jj = i + di, j + dj
                if 0 <= ii < gw and 0 <= jj < gh:
                    kk = jj * gw + ii
                    if ink[kk] and d + c < dist[kk]:
                        dist[kk] = d + c
                        push(heap, (d + c, kk))
        return dist


# ---------------------------------------------------------------- mesh

def build_mesh(alpha, ink, W, H, cell):
    cols, rows = -(-W // cell), -(-H // cell)

    def faint_ink(cx, cy):
        x0, x1 = cx * cell, min(W, (cx + 1) * cell)
        for y in range(cy * cell, min(H, (cy + 1) * cell)):
            if max(alpha[y * W + x0:y * W + x1]) > FAINT: return True
        return False

    kept = {(cx, cy) for cy in range(rows) for cx in range(cols) if faint_ink(cx, cy)}

    def cell_nodes(cx, cy):
        out = []
        for j in range(int(cy * cell // GEO), min(ink.gh, int(-(-(cy + 1) * cell // GEO)))):
            for i in range(int(cx * cell // GEO), min(ink.gw, int(-(-(cx + 1) * cell // GEO)))):
                k = j * ink.gw + i
                x, y = ink.center(k)
                if ink.ink[k] and cx * cell <= x < (cx + 1) * cell and cy * cell <= y < (cy + 1) * cell:
                    out.append(k)
        return out

    nodes_of = {c: cell_nodes(*c) for c in kept}
    verts = []           # (x, y, [ink nodes of its group])
    corner = {}          # (cell, corner_index) -> vertex index
    grid_pts = {(cx + dx, cy + dy) for cx, cy in kept for dx in (0, 1) for dy in (0, 1)}
    for gx, gy in sorted(grid_pts, key=lambda p: (p[1], p[0])):
        around = [c for c in ((gx - 1, gy - 1), (gx, gy - 1), (gx - 1, gy), (gx, gy)) if c in kept]
        window = [k for c in around for k in nodes_of[c]]
        comp = components(window, ink.gw)
        groups = {}      # label -> list of cells
        biggest = max(set(comp.values()), key=lambda l: sum(1 for v in comp.values() if v == l)) if comp else None
        for c in around:
            labels = [comp[k] for k in nodes_of[c]]
            lab = max(set(labels), key=labels.count) if labels else biggest
            groups.setdefault(lab, []).append(c)
        for lab, cells_ in groups.items():
            vi = len(verts)
            verts.append((min(W, gx * cell), min(H, gy * cell), [k for k in window if comp[k] == lab] if lab is not None else []))
            for c in cells_:
                corner[(c, (gx - c[0], gy - c[1]))] = vi
    tris = []
    for c in sorted(kept, key=lambda p: (p[1], p[0])):
        a, b, cc, d = (corner[(c, o)] for o in ((0, 0), (1, 0), (1, 1), (0, 1)))
        tris += [a, b, cc, a, cc, d]
    return verts, tris, len(kept)


def components(nodes, gw):
    """8-connected components of a small set of grid nodes."""
    left, lab = set(nodes), {}
    for start in nodes:
        if start not in left: continue
        left.discard(start)
        stack, l = [start], len(set(lab.values()))
        while stack:
            k = stack.pop()
            lab[k] = l
            i, j = k % gw, k // gw
            for di in (-1, 0, 1):
                for dj in (-1, 0, 1):
                    kk = (j + dj) * gw + (i + di)
                    if kk in left and abs((kk % gw) - i) <= 1:
                        left.discard(kk)
                        stack.append(kk)
    return lab


# ---------------------------------------------------------------- weights

TAPER = (3.0, 6.0)   # a source fades out between these multiples of the nearest source's distance


def region_fields(ink, fields, order):
    """Per source: geodesic distance to the ink it owns (the nodes it is nearest to)."""
    owner = {}
    for k in range(len(ink.ink)):
        if not ink.ink[k]: continue
        best = min(order, key=lambda n: fields[n][k])
        if fields[best][k] < float('inf'): owner.setdefault(best, {})[k] = 0.0
    return {n: ink.dijkstra(owner[n]) if n in owner else [float('inf')] * len(ink.ink) for n in order}


def vertex_weights(rig, ink, fields, regions, verts, falloff, cell):
    """Geodesic distance d_j to each source, made 'shadow aware': a source whose own region is far away
    (the Chest seen from a thigh, through the Hips) counts as at least d_nearest + 2 x the distance to that
    region, so only sources whose regions border this part blend in. Weights are 1 / (D + eps)^falloff,
    tapered to zero between TAPER multiples of the nearest distance, best 4 kept."""
    eps = cell / 2
    INF = float('inf')
    out, lost = [], []
    for x, y, group in verts:
        off = [(k, math.hypot(ink.center(k)[0] - x, ink.center(k)[1] - y)) for k in group]
        d, b = {}, {}
        for n in rig.order:
            f, r = fields[n], regions[n]
            best = min((f[k] + o for k, o in off), default=INF)
            if best < INF:
                d[n] = best
                b[n] = min((r[k] + o for k, o in off), default=INF)
        if not d:
            lost.append(len(out)); out.append(None)
            continue
        dmin = min(d.values())
        D = {n: max(dv, dmin + 2 * b[n]) for n, dv in d.items()}
        Dmin = min(D.values()) + eps
        w = []
        for n, dv in D.items():
            r = (dv + eps) / Dmin
            t = 1.0 if r <= TAPER[0] else 0.0 if r >= TAPER[1] else (TAPER[1] - r) / (TAPER[1] - TAPER[0])
            t = t * t * (3 - 2 * t)
            if t > 0: w.append((t / (dv + eps) ** falloff, n))
        w = sorted(w, reverse=True)[:4]
        tot = sum(v for v, _ in w)
        out.append({n: v / tot for v, n in w})
    # No ink path: only faint fringe or a detached speck. Moving it with the nearest inked vertex keeps
    # it glued to the part it borders; with no inked vertex at all, take the nearest bone.
    found = [i for i, w in enumerate(out) if w is not None]
    for i in lost:
        x, y, _ = verts[i]
        if found:
            j = min(found, key=lambda j: (verts[j][0] - x) ** 2 + (verts[j][1] - y) ** 2)
            out[i] = dict(out[j])
        else:
            out[i] = {min(rig.order, key=lambda n: rig.straight(n, (x, y))): 1.0}
    return out, len(lost)


def pack(w, idx):
    items = sorted(w.items(), key=lambda kv: -kv[1])[:4]
    vals = [int(round(255 * v)) for _, v in items]
    vals[0] += 255 - sum(vals)
    ind = val = s = 0
    for (n, _), v in zip(items, vals):
        if v <= 0: continue
        ind |= (idx[n] + 1) << (8 * s); val |= v << (8 * s); s += 1
    return val, ind


def varuint(n):
    out = bytearray()
    while True:
        byte = n & 0x7F; n >>= 7
        out.append(byte | (0x80 if n else 0))
        if not n: return bytes(out)


# ---------------------------------------------------------------- scene

def scene(cfg, rig, verts, tris, weights):
    W, H, D = cfg['width'], cfg['height'], cfg['duration']
    CX, CY = W / 2, H / 2
    bid = lambda n: f'0:{100 + rig.idx[n]}'
    tri_b64 = base64.b64encode(b''.join(varuint(i) for i in tris)).decode()
    mv = ''.join(f'<MeshVertex x="{x - CX:.2f}" y="{y - CY:.2f}" u="{x / W:.5f}" v="{y / H:.5f}">'
                 f'<Weight values="{val}" indices="{ind}"/></MeshVertex>\n'
                 for (x, y, _), (val, ind) in zip(verts, (pack(w, rig.idx) for w in weights)))
    tendons = ''
    for n in rig.order:
        a, th = rig.bones[n]['a'], rig.world[n]
        c, s = math.cos(th), math.sin(th)
        tendons += (f'<Tendon boneId="{bid(n)}" xx="{c:.6f}" xy="{s:.6f}" yx="{-s:.6f}" yy="{c:.6f}" '
                    f'tx="{a[0]:.2f}" ty="{a[1]:.2f}" name="{n}"/>\n')

    def bone_xml(n):
        B = rig.bones[n]
        kids = ''.join(bone_xml(c) for c in rig.order if rig.bones[c]['parent'] == n)
        L = math.hypot(B['b'][0] - B['a'][0], B['b'][1] - B['a'][1])
        if B['parent'] is None:
            return (f'<RootBone x="{B["a"][0]:.2f}" y="{B["a"][1]:.2f}" length="{L:.2f}" '
                    f'rotation="{rig.local[n]:.6f}" name="{n}" id="{bid(n)}">{kids}</RootBone>\n')
        return f'<Bone length="{L:.2f}" rotation="{rig.local[n]:.6f}" name="{n}" id="{bid(n)}">{kids}</Bone>\n'
    bones = ''.join(bone_xml(n) for n in rig.order if rig.bones[n]['parent'] is None)

    anim = ''
    for n, props in cfg['keys'].items():
        if n not in rig.bones: die(f'keys: unknown bone "{n}"')
        if rig.bones[n]['anchor']: die(f'keys: "{n}" is an anchor and never moves')
        kp = ''
        for prop, kf in props.items():
            if prop == 'rotation': base = rig.local[n]
            elif prop in ('x', 'y'):
                if rig.bones[n]['parent'] is not None: die(f'keys: "{n}.{prop}": only root bones take x / y')
                base = rig.bones[n]['a'][0 if prop == 'x' else 1]
            else: die(f'keys: "{n}.{prop}": use rotation, x or y')
            kf = sorted(kf)
            if any(not 0 <= f <= D for f, _ in kf): die(f'keys: "{n}.{prop}" has a frame outside 0..{D}')
            if kf[0][0] != 0 or kf[-1][0] != D or abs(kf[0][1] - kf[-1][1]) > 1e-9:
                print(f'warning: "{n}.{prop}" does not start at 0 and end at {D} on the same value; the loop will jump')
            k = ''.join(f'<KeyFrameDouble value="{base + dv:.6f}" frame="{f}" interpolationType="cubic">{EASE}'
                        f'</KeyFrameDouble>' for f, dv in kf)
            kp += f'<KeyedProperty property="{prop}">{k}</KeyedProperty>'
        anim += f'<KeyedObject objectId="{bid(n)}">{kp}</KeyedObject>\n'

    stem = os.path.splitext(cfg['image'])[0]
    name = cfg['name']
    return f'''<Rive version="1" kind="fragment">
<Artboard defaultStateMachineId="0:7" styleId="0:5" width="{W}" height="{H}" name="{name}" id="0:2">
<LayoutComponentStyle name="Artboard Style" id="0:5"/>
{bones}<Image x="{CX}" y="{CY}" assetId="0:60" name="{name}" id="0:20">
<Mesh triangleIndexBytes="{tri_b64}" name="Mesh" id="0:21">
{mv}<Skin tx="{CX}" ty="{CY}" name="Skin">
{tendons}</Skin>
</Mesh>
</Image>
<StateMachine name="Main" id="0:7">
<StateMachineLayer name="Layer 1" id="0:8">
<AnyState x="200" y="-120"/><ExitState x="400" y="-120"/>
<EntryState><StateTransition stateToId="0:12"/></EntryState>
<AnimationState x="200" animationId="0:6" id="0:12"/>
</StateMachineLayer>
</StateMachine>
<LinearAnimation loopValue="loop" fps="{FPS}" duration="{D}" name="Idle" id="0:6">
{anim}</LinearAnimation>
</Artboard>
<ImageAsset file="{cfg['image']}" name="{stem}" id="0:60"/>
</Rive>
'''


# ---------------------------------------------------------------- debug images

PALETTE = [(230, 25, 75), (60, 180, 75), (0, 130, 200), (245, 130, 48), (145, 30, 180), (70, 240, 240),
           (240, 50, 230), (210, 245, 60), (0, 128, 128), (170, 110, 40), (128, 0, 0), (0, 0, 128),
           (128, 128, 0), (255, 225, 25), (100, 100, 100)]


class Layer:
    """A transparent RGBA layer drawn in Python and composited over the image by ffmpeg."""
    def __init__(self, W, H):
        self.W, self.H, self.px = W, H, bytearray(W * H * 4)

    def dot(self, x, y, r, col):
        for yy in range(int(y - r), int(y + r) + 1):
            for xx in range(int(x - r), int(x + r) + 1):
                if 0 <= xx < self.W and 0 <= yy < self.H and (xx - x) ** 2 + (yy - y) ** 2 <= r * r:
                    o = (yy * self.W + xx) * 4
                    self.px[o:o + 4] = bytes((*col, 255))

    def line(self, a, b, r, col):
        L = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1])))
        for s in range(L + 1):
            self.dot(a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L, r, col)

    def write(self, image, out):
        raw = out + '.rgba'
        open(raw, 'wb').write(self.px)
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=0xdddddd:s={self.W}x{self.H}',
               '-i', image, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{self.W}x{self.H}', '-i', raw,
               '-filter_complex', '[0][1]overlay=format=auto[a];[a][2]overlay=format=auto', '-frames:v', '1', out]
        r = subprocess.run(cmd, capture_output=True, text=True)
        os.remove(raw)
        if r.returncode: die('ffmpeg could not write ' + out + ': ' + r.stderr.strip())


def overlay(cfg, rig, image, out):
    lay = Layer(cfg['width'], cfg['height'])
    for n in rig.order:
        col = PALETTE[rig.idx[n] % len(PALETTE)]
        for a, b in rig.segments(n):
            lay.line(a, b, 2.5, col)
        if not rig.bones[n]['anchor']:
            lay.dot(*rig.bones[n]['a'], 7, (255, 255, 255)); lay.dot(*rig.bones[n]['a'], 5, col)
            lay.dot(*rig.bones[n]['b'], 4, col)
        print(f'  {n:12s} rgb{col}{"  (anchor)" if rig.bones[n]["anchor"] else ""}')
    lay.write(image, out)


def weight_map(cfg, rig, image, verts, weights, out):
    lay = Layer(cfg['width'], cfg['height'])
    for (x, y, _), w in zip(verts, weights):
        col = [0.0, 0.0, 0.0]
        for n, v in w.items():
            c = PALETTE[rig.idx[n] % len(PALETTE)]
            for i in range(3): col[i] += c[i] * v
        lay.dot(x, y, 4.5, tuple(int(c) for c in col))
    for n in rig.order:
        print(f'  {n:12s} rgb{PALETTE[rig.idx[n] % len(PALETTE)]}')
    lay.write(image, out)


# ---------------------------------------------------------------- main

def main(argv):
    if not argv or argv[0].startswith('-'): die('usage: rig.py <project-dir> [--overlay out.png] [--weights out.png]')
    project, opts = argv[0], dict(zip(argv[1::2], argv[2::2]))
    for k in opts:
        if k not in ('--overlay', '--weights'): die('unknown option ' + k)
    cfg = load(project)
    rig = Rig(cfg)
    image = os.path.join(project, cfg['image'])
    W, H = cfg['width'], cfg['height']
    if '--overlay' in opts and '--weights' not in opts:
        read_alpha(image, W, H)
        overlay(cfg, rig, image, opts['--overlay'])
        print('wrote', opts['--overlay'])
        return
    alpha = read_alpha(image, W, H)
    ink = Ink(alpha, W, H)
    fields = {n: ink.dijkstra(ink.seeds(rig, n)) for n in rig.order}
    verts, tris, ncells = build_mesh(alpha, ink, W, H, cfg['cell'])
    regions = region_fields(ink, fields, rig.order)
    weights, fallbacks = vertex_weights(rig, ink, fields, regions, verts, cfg['falloff'], cfg['cell'])
    if '--overlay' in opts:
        overlay(cfg, rig, image, opts['--overlay']); print('wrote', opts['--overlay'])
    if '--weights' in opts:
        weight_map(cfg, rig, image, verts, weights, opts['--weights']); print('wrote', opts['--weights'])
    else:
        open(os.path.join(project, 'scene.rml'), 'w').write(scene(cfg, rig, verts, tris, weights))
    print(f'{len(verts)} vertices, {len(tris) // 3} triangles, {ncells} cells, '
          f'{fallbacks} vertices without an ink path (weights copied from the nearest inked vertex)')


if __name__ == '__main__':
    main(sys.argv[1:])

"""Builds rive/tara/scene.rml: the Higgsfield Tara image on a skinned mesh, with an idle loop.

Run:  python3 rive/rig_tara.py <alpha.raw>   (alpha.raw = tara.webp alpha, 300x452 gray; see README)
Then: rive rive/tara --publish  and copy build/tara.riv to public/art/tara-idle.riv
"""
import base64, math, sys
W, H = 900, 1356
K = 1.5                      # joints below were read off a 600x900 preview
AW, AH, CELL = 300, 452, 5   # alpha map size, alpha pixels per mesh cell (= 15 image px)
alpha = open(sys.argv[1], 'rb').read()
P = lambda x, y: (x * K, y * K)

# name: (start, end, parent)   parent None = RootBone
BONES = {
    'Ground':  (P(318, 880), P(318, 800), None),
    'Hips':    (P(318, 395), P(318, 250), None),
    'Chest':   (P(318, 250), P(318, 205), 'Hips'),
    'Head':    (P(318, 205), P(318, 85), 'Chest'),
    'Pony1':   (P(318, 85), P(205, 165), 'Head'),
    'Pony2':   (P(205, 165), P(115, 290), 'Pony1'),
    'ArmR':    (P(255, 235), P(205, 350), None),
    'ForeR':   (P(205, 350), P(162, 488), 'ArmR'),
    'Racket':  (P(162, 488), P(75, 690), 'ForeR'),
    'ArmL':    (P(385, 235), P(425, 350), None),
    'ForeL':   (P(425, 350), P(468, 492), 'ArmL'),
}
ORDER = list(BONES)
IDX = {n: i for i, n in enumerate(ORDER)}
BLEND_PARENT = dict((n, b[2]) for n, b in BONES.items())
BLEND_PARENT['ArmR'] = BLEND_PARENT['ArmL'] = 'Chest'
BLEND_PARENT['Hips'] = None
# weighting-only segments: thighs fade from Hips to Ground, shins are Ground
LEGS = [(P(285, 420), P(205, 650), 'thigh'), (P(350, 420), P(430, 650), 'thigh'),
        (P(205, 650), P(130, 865), 'shin'), (P(430, 650), P(505, 865), 'shin')]

def ang(a, b): return math.atan2(b[1] - a[1], b[0] - a[0])
def dist(a, b): return math.hypot(b[0] - a[0], b[1] - a[1])
WORLD = {n: ang(*BONES[n][:2]) for n in ORDER}
LOCAL = {n: WORLD[n] - (WORLD[BONES[n][2]] if BONES[n][2] else 0) for n in ORDER}

def seg(p, a, b):
    vx, vy = b[0] - a[0], b[1] - a[1]
    L2 = vx * vx + vy * vy
    t = max(0, min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2))
    return math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy), t

def region(p):
    """Which bones may claim a point, so close-but-unrelated parts (racket vs thigh, ponytail vs arm) never share weights."""
    x, y = p[0] / K, p[1] / K
    if 500 < y < 725 and x < 160 - max(0, y - 655) * 0.5: return ('Racket',), False
    if (y < 215 and x < 285) or (x < 205 and y < 290) or (x < 192 and y < 335): return ('Pony1', 'Pony2'), False
    if 190 < x < 445 and y > 430: return ('Hips',), True
    if y > 520: return (), True
    return tuple(n for n in ORDER if n not in ('Ground', 'Pony2', 'Racket')), y > 380

def weights(p):
    allowed, legs = region(p)
    best = None
    for n in allowed:
        d, t = seg(p, *BONES[n][:2])
        if best is None or d < best[0]: best = (d, t, n)
    for a, b, kind in (LEGS if legs else ()):
        d, t = seg(p, a, b)
        if best is None or d < best[0]: best = (d, t, kind)
    d, t, n = best
    if n == 'shin': return {'Ground': 1.0}
    if n == 'thigh': return {'Hips': 1 - t, 'Ground': t}
    w = {n: 1.0}
    L, R = dist(*BONES[n][:2]), 40.0
    par = BLEND_PARENT[n]
    if par and t * L < R:
        f = 0.5 * (1 - t * L / R); w[n] -= f; w[par] = f
    kids = [c for c in ORDER if BONES[c][2] == n]
    if kids and (1 - t) * L < R:
        f = 0.5 * (1 - (1 - t) * L / R); w[n] -= f; w[kids[0]] = w.get(kids[0], 0) + f
    return w

def pack(w):
    items = sorted(w.items(), key=lambda kv: -kv[1])[:4]
    tot = sum(v for _, v in items)
    vals = [int(round(255 * v / tot)) for _, v in items]
    vals[0] += 255 - sum(vals)
    ind = val = 0
    for s, ((n, _), v) in enumerate(zip(items, vals)):
        ind |= (IDX[n] + 1) << (8 * s); val |= v << (8 * s)
    return val, ind

# ---- mesh: grid cells that contain any ink ----
cols, rows = AW // CELL, AH // CELL
def ink(cx, cy):
    for y in range(cy * CELL, min(AH, (cy + 1) * CELL)):
        row = alpha[y * AW + cx * CELL: y * AW + min(AW, (cx + 1) * CELL)]
        if max(row) > 4: return True
    return False
cells = [(cx, cy) for cy in range(rows + 1) for cx in range(cols) if cy * CELL < AH and ink(cx, cy)]
STEP = W / cols
vid, verts, tris = {}, [], []
def v(gx, gy):
    if (gx, gy) not in vid:
        vid[(gx, gy)] = len(verts); verts.append((gx * STEP, min(H, gy * STEP)))
    return vid[(gx, gy)]
for cx, cy in cells:
    a, b, c, d = v(cx, cy), v(cx + 1, cy), v(cx + 1, cy + 1), v(cx, cy + 1)
    tris += [a, b, c, a, c, d]
def varuint(n):
    out = bytearray()
    while True:
        byte = n & 0x7F; n >>= 7
        out.append(byte | (0x80 if n else 0))
        if not n: return bytes(out)
tri_b64 = base64.b64encode(b''.join(varuint(i) for i in tris)).decode()

CX, CY = W / 2, H / 2
mv = ''
for x, y in verts:
    val, ind = pack(weights((x, y)))
    mv += f'<MeshVertex x="{x - CX:.2f}" y="{y - CY:.2f}" u="{x / W:.5f}" v="{y / H:.5f}"><Weight values="{val}" indices="{ind}"/></MeshVertex>\n'
tendons = ''
for n in ORDER:
    a, th = BONES[n][0], WORLD[n]
    c, s = math.cos(th), math.sin(th)
    tendons += f'<Tendon boneId="0:{100 + IDX[n]}" xx="{c:.6f}" xy="{s:.6f}" yx="{-s:.6f}" yy="{c:.6f}" tx="{a[0]:.2f}" ty="{a[1]:.2f}" name="{n}"/>\n'

def bone_xml(n):
    a, b, par = BONES[n]
    kids = ''.join(bone_xml(c) for c in ORDER if BONES[c][2] == n)
    L = dist(a, b)
    if par is None:
        return f'<RootBone x="{a[0]:.2f}" y="{a[1]:.2f}" length="{L:.2f}" rotation="{LOCAL[n]:.6f}" name="{n}" id="0:{100 + IDX[n]}">{kids}</RootBone>\n'
    return f'<Bone length="{L:.2f}" rotation="{LOCAL[n]:.6f}" name="{n}" id="0:{100 + IDX[n]}">{kids}</Bone>\n'
bones = ''.join(bone_xml(n) for n in ORDER if BONES[n][2] is None)

EASE = '<CubicEaseInterpolator x1="0.42" y1="0" x2="0.58" y2="1"/>'
def keys(n, prop, kf):
    base = {'rotation': LOCAL[n], 'y': BONES[n][0][1]}[prop]
    k = ''.join(f'<KeyFrameDouble value="{base + dv:.6f}" frame="{f}" interpolationType="cubic">{EASE}</KeyFrameDouble>' for f, dv in kf)
    return f'<KeyedObject objectId="0:{100 + IDX[n]}"><KeyedProperty property="{prop}">{k}</KeyedProperty></KeyedObject>\n'
D = 240
bob = [(0, 0), (120, 8), (D, 0)]
anim = (''.join(keys(n, 'y', bob) for n in ('Hips', 'ArmR', 'ArmL'))
        + keys('Chest', 'rotation', [(0, -0.008), (130, 0.012), (D, -0.008)])
        + keys('Head', 'rotation', [(0, -0.02), (140, 0.025), (D, -0.02)])
        + keys('Pony1', 'rotation', [(0, 0), (90, 0.06), (190, -0.03), (D, 0)])
        + keys('Pony2', 'rotation', [(0, -0.02), (110, 0.11), (205, -0.06), (D, -0.02)])
        + keys('ArmR', 'rotation', [(0, 0), (125, 0.03), (D, 0)])
        + keys('ForeR', 'rotation', [(0, 0), (135, 0.04), (D, 0)])
        + keys('Racket', 'rotation', [(0, -0.02), (150, 0.08), (D, -0.02)])
        + keys('ArmL', 'rotation', [(0, 0), (125, -0.025), (D, 0)])
        + keys('ForeL', 'rotation', [(0, 0), (135, -0.035), (D, 0)]))

rml = f'''<Rive version="1" kind="fragment">
<Artboard defaultStateMachineId="0:7" styleId="0:5" width="{W}" height="{H}" name="Tara" id="0:2">
<LayoutComponentStyle name="Artboard Style" id="0:5"/>
{bones}<Image x="{CX}" y="{CY}" assetId="0:60" name="Tara" id="0:20">
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
<LinearAnimation loopValue="loop" duration="{D}" name="Idle" id="0:6">
{anim}</LinearAnimation>
</Artboard>
<ImageAsset file="tara.webp" name="tara" id="0:60"/>
</Rive>
'''
open('rive/tara/scene.rml', 'w').write(rml)
print(len(verts), 'vertices', len(tris) // 3, 'triangles')

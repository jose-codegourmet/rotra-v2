"""Builds rive/rion/scene.rml: the Higgsfield Rion image on a skinned mesh, with an idle loop.

Run:  python3 rive/rig_rion.py <alpha.raw>   (alpha.raw = rion.webp alpha, 300x452 gray; see README)
Then: rive rive/rion --publish  and copy build/rion.riv to art/rion-idle.riv
"""
import base64, math, sys
W, H = 900, 1356
K = 1.5                      # joints below were read off a 600x900 preview
AW, AH, CELL = 300, 452, 5   # alpha map size, alpha pixels per mesh cell (= 15 image px)
alpha = open(sys.argv[1], 'rb').read()
P = lambda x, y: (x * K, y * K)

# name: (start, end, parent)   parent None = RootBone
# ArmR/ForeR/Tablet = the arm holding the tablet (screen right); ArmL/ForeL = the hand-in-pocket arm (screen left)
BONES = {
    'Ground':  (P(285, 880), P(285, 800), None),
    'Hips':    (P(285, 390), P(285, 270), None),
    'Chest':   (P(285, 270), P(285, 165), 'Hips'),
    'Head':    (P(285, 165), P(292, 55), 'Chest'),
    'ArmR':    (P(338, 212), P(356, 332), None),
    'ForeR':   (P(356, 332), P(408, 250), 'ArmR'),
    'Tablet':  (P(408, 250), P(404, 172), 'ForeR'),
    'ArmL':    (P(205, 210), P(158, 324), None),
    'ForeL':   (P(158, 324), P(238, 408), 'ArmL'),
}
ORDER = list(BONES)
IDX = {n: i for i, n in enumerate(ORDER)}
BLEND_PARENT = dict((n, b[2]) for n, b in BONES.items())
BLEND_PARENT['ArmR'] = BLEND_PARENT['ArmL'] = 'Chest'
BLEND_PARENT['Hips'] = None
# weighting-only segments: thighs fade from Hips to Ground, shins are Ground
LEGS = [(P(250, 420), P(205, 632), 'thigh'), (P(315, 420), P(300, 632), 'thigh'),
        (P(205, 632), P(185, 865), 'shin'), (P(300, 632), P(335, 855), 'shin')]

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
    """Which bones may claim a point, so close-but-unrelated parts (tablet vs sleeve, forearm vs torso,
    pocket hand vs pants) never share weights."""
    x, y = p[0] / K, p[1] / K
    if y < 160: return ('Head', 'Chest'), False
    if x > 353 and y < 258: return ('Tablet',), False                       # tablet and the hand on it
    if x > 336 and y < 345: return ('ArmR', 'ForeR'), False                  # tablet arm
    if (x < 212 and y <= 300) or (300 < y < 395 and x < 200 + (y - 300) * 0.42):
        return ('ArmL', 'ForeL'), False                                     # pocket arm, down to the wrist
    if y > 470: return (), True
    if y > 388: return ('Hips',), True                                      # waist, pants top, pocket hand
    return ('Hips', 'Chest', 'Head'), False

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
# every track starts and ends at the bind pose, so frame 0 is the source image
D = 240
bob = [(0, 0), (120, 6), (D, 0)]
anim = (''.join(keys(n, 'y', bob) for n in ('Hips', 'ArmR', 'ArmL'))
        + keys('Chest', 'rotation', [(0, 0), (130, 0.006), (D, 0)])
        + keys('Head', 'rotation', [(0, 0), (140, 0.02), (D, 0)])            # nod toward the tablet
        + keys('ArmR', 'rotation', [(0, 0), (125, -0.012), (D, 0)])
        + keys('ForeR', 'rotation', [(0, 0), (135, -0.03), (D, 0)])
        + keys('Tablet', 'rotation', [(0, 0), (150, 0.025), (D, 0)])
        + keys('ArmL', 'rotation', [(0, 0), (125, 0.008), (D, 0)])
        + keys('ForeL', 'rotation', [(0, 0), (135, -0.008), (D, 0)]))

rml = f'''<Rive version="1" kind="fragment">
<Artboard defaultStateMachineId="0:7" styleId="0:5" width="{W}" height="{H}" name="Rion" id="0:2">
<LayoutComponentStyle name="Artboard Style" id="0:5"/>
{bones}<Image x="{CX}" y="{CY}" assetId="0:60" name="Rion" id="0:20">
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
<ImageAsset file="rion.webp" name="rion" id="0:60"/>
</Rive>
'''
open('rive/rion/scene.rml', 'w').write(rml)
print(len(verts), 'vertices', len(tris) // 3, 'triangles')

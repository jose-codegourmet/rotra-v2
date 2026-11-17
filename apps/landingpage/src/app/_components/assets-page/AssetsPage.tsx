/** Asset list page (#assets); the list is built by the site script. */
export function AssetsPage() {
  return (
    <main className="view page gut" data-view="assets" hidden>
      <div className="wrap">
        <section className="p-sec">
          <div className="p-head">
            <span className="eyebrow">Wireframe · Higgsfield</span>
            <h1 className="p-h1">Asset list</h1>
            <p className="qmuted">
              Every placeholder on the site. Backgrounds are stills in three layers (far, mid, near)
              so they can move at different speeds. Characters are looping Rive files, one per pose
              (art/chars/), each over a .webp still that shows until the animation has drawn.
            </p>
            <p className="anno">
              Art direction for all of it: Arcane × Valorant, painterly cel shading, ROTRA green rim
              light. Transparent PNG for cut-outs and sprites; layer stills wide enough to move
              (about 120% of the screen).
            </p>
          </div>
          <div className="g2" id="assetLists" />
        </section>
      </div>
    </main>
  )
}

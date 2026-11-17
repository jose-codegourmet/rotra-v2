/** Home hero: “Do you play, or run the game?” */
export function HomeHero() {
  return (
    <section id="top" className="pin hero hx" data-pin="" data-ch="0" data-beat="hero" data-sky="0">
      <div className="stage">
        <div className="hx-scene">
          {/* Hero art (Samurai Jack direction): one 16:9 frame that covers the screen; the hall is one Rive file (art/hero.riv, built from rive/hero/) whose element layers move at their own depth with the pointer and the scroll; the characters and the hole share its coordinates */}
          <div className="hx-art">
            <div
              className="hx-bg"
              data-riv="/art/hero.riv?v=1"
              data-riv-fit="fill"
              data-riv-parallax=""
              aria-hidden="true"
            />
            {/* Rion: the other path */}
            <div className="hx-side">
              <a className="hx-sign" href="#clubs">
                <span className="eyebrow">I run the game</span>
                <b>For clubs →</b>
              </a>
              <div className="hx-pad sm" aria-hidden="true" />
              <div className="hx-fig hx-rion chr" data-char="rion-idle" aria-hidden="true" />
            </div>
            {/* Tara on the painted ring plate, which opens into the hole */}
            <div className="hx-spot">
              <div className="hx-hole" aria-hidden="true">
                <div className="hx-pit" />
                <div className="hx-rim" />
              </div>
              <div className="hx-tara-clip" aria-hidden="true">
                <div className="hx-fig hx-tara chr" data-char="tara-idle" />
              </div>
              <span className="hx-tag chip acc">I play · scroll to drop in ↓</span>
            </div>
          </div>
        </div>
        <div className="hx-title gut">
          <span className="rlogo hx-logo" role="img" aria-label="ROTRA">
            <svg aria-hidden="true">
              <use href="#logo-full" />
            </svg>
          </span>
          <h1>
            {'Do you play, '}
            <em>or run the game?</em>
          </h1>
          <p className="hx-sub">
            ROTRA keeps one record for every badminton player, built from real games at partner
            clubs.
          </p>
        </div>
        <div className="hx-veil" aria-hidden="true" />
      </div>
    </section>
  )
}

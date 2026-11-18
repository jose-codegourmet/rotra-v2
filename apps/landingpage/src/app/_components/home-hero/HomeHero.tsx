/** Home hero: “Do you play, or run the game?” */
export function HomeHero() {
  return (
    <section id="top" className="pin hero hx" data-pin="" data-ch="0" data-beat="hero" data-sky="0">
      <div className="stage">
        <div className="hx-scene">
          {/* Hero art (Samurai Jack direction): one 16:9 frame that covers the screen; the hall is one Rive file (art/hero.riv, built from rive/hero/) whose element layers move at their own depth with the pointer and the scroll; the characters share its coordinates */}
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
            {/* Tara on the painted ring plate: idle, then the wind-up, then the follow-through of the smash */}
            <div className="hx-spot">
              <div className="hx-tara-clip" aria-hidden="true">
                <div className="hx-fig hx-tara hx-pose-idle chr" data-char="tara-idle" />
                <div className="hx-fig hx-tara hx-pose-w1">
                  <img src="/art/chars/tara-wind-1.webp" alt="" />
                </div>
                <div className="hx-fig hx-tara hx-pose-w2">
                  <img src="/art/chars/tara-wind-2.webp" alt="" />
                </div>
                <div
                  className="hx-fig hx-tara hx-pose-wind chr"
                  data-char="tara-smash"
                  data-warm=""
                />
                <div className="hx-fig hx-tara hx-pose-hit chr" data-char="tara-hit" data-warm="" />
              </div>
              {/* the shuttle she smashes: it drops in with the scroll, then flies at the camera (hx-fly) */}
              <div className="hx-drop" aria-hidden="true">
                <img src="/art/shuttle.webp" alt="" />
              </div>
              <div className="hx-smear" aria-hidden="true" />
              <span className="hx-tag chip acc">I play · scroll to smash ↓</span>
            </div>
          </div>
        </div>
        <div className="hx-title gut">
          <h1>
            {'Do you play, '}
            <em>or run the game?</em>
          </h1>
        </div>
        {/* the smash: burst at the hit, speed lines, the shuttle flying at the camera, and the flash that hands
            over to chapter 01, already pinned underneath (main script: smash) */}
        <div className="hx-fx" aria-hidden="true">
          <div className="hx-burst" />
          <div className="hx-speed" />
          <img className="hx-fly" src="/art/shuttle.webp" alt="" />
          <div className="hx-flash" />
        </div>
      </div>
    </section>
  )
}

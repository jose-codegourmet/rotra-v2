import type { CSSProperties } from 'react'

/** Home 02: how a rank moves. */
export function HomeRanking() {
  return (
    <section
      id="s-ranking"
      className="fade-io pin story "
      data-pin=""
      data-n="7"
      data-ch="2"
      data-beat="moves"
      data-sky="3"
      style={{ '--n': '7' } as CSSProperties}
    >
      <div className="stage">
        <div className="bgl" data-bg-scene="moves" aria-hidden="true">
          <img
            className="ly far"
            src="/art/moves-far.webp"
            alt=""
            loading="lazy"
            data-layer="moves-far"
          />
          <img
            className="ly mid"
            src="/art/moves-mid.webp"
            alt=""
            loading="lazy"
            data-layer="moves-mid"
          />
          <img
            className="ly near"
            src="/art/moves-near.webp"
            alt=""
            loading="lazy"
            data-layer="moves-near"
          />
          <img
            className="ly m"
            src="/art/mobile/moves.webp"
            alt=""
            loading="lazy"
            data-layer="moves-mobile"
          />
        </div>
        <div className="scene" data-scene="0">
          <span className="eyebrow">02 · How a rank moves</span>
          <h2 className="mega">
            {'Every win '}
            <em>moves you.</em>
          </h2>
          <p className="say">
            Your rank comes from wins at partner clubs, weighted by who you beat.
          </p>
        </div>
        <div className="scene" data-scene="1">
          <h3 className="line">
            {'Before every counted game, ROTRA '}
            <em>weighs both teams.</em>
          </h3>
          <div className="vs">
            <div className="team">
              <div className="pair">
                <div className="mfig bigc chr" data-char="tara-idle" />
                <div className="mfig bigc chr" data-char="jun-cut" />
              </div>
              <b>Tara + Jun</b>
              <div className="str">
                <i style={{ '--v': '.55' } as CSSProperties} />
              </div>
              <small>Team strength</small>
            </div>
            <span className="vs-x">VS</span>
            <div className="team">
              <div className="pair">
                <div className="mfig bigc chr" data-char="paolo-cut" />
                <div className="mfig bigc chr" data-char="mara-cut" />
              </div>
              <b>Paolo + Mara</b>
              <div className="str">
                <i style={{ '--v': '.78' } as CSSProperties} />
              </div>
              <small>Team strength</small>
            </div>
          </div>
        </div>
        <div
          className="scene oc2"
          data-scene="2"
          style={{ '--c': 'var(--accent)' } as CSSProperties}
        >
          <span className="glyph">+++</span>
          <h3 className="mega-sm">Beat a stronger team</h3>
          <p className="say">The upset. You climb a lot.</p>
          <div className="meter" style={{ '--to': '90%' } as CSSProperties}>
            <span className="was" />
            <span className="mk" />
            <small className="lo">lower</small>
            <small className="hi">higher</small>
          </div>
        </div>
        <div
          className="scene oc2"
          data-scene="3"
          style={{ '--c': 'var(--accent)' } as CSSProperties}
        >
          <span className="glyph">+</span>
          <h3 className="mega-sm">Beat a weaker team</h3>
          <p className="say">Expected. You climb a little.</p>
          <div className="meter" style={{ '--to': '60%' } as CSSProperties}>
            <span className="was" />
            <span className="mk" />
            <small className="lo">lower</small>
            <small className="hi">higher</small>
          </div>
        </div>
        <div className="scene oc2" data-scene="4" style={{ '--c': 'var(--fg2)' } as CSSProperties}>
          <span className="glyph">=</span>
          <h3 className="mega-sm">Lose to a stronger team</h3>
          <p className="say">Also expected. Almost no change.</p>
          <div className="meter" style={{ '--to': '48%' } as CSSProperties}>
            <span className="was" />
            <span className="mk" />
            <small className="lo">lower</small>
            <small className="hi">higher</small>
          </div>
        </div>
        <div
          className="scene oc2"
          data-scene="5"
          style={{ '--c': 'var(--error)' } as CSSProperties}
        >
          <span className="glyph">−−−</span>
          <h3 className="mega-sm">Lose to a weaker team</h3>
          <p className="say">The upset, the other way. You drop a lot.</p>
          <div className="meter" style={{ '--to': '16%' } as CSSProperties}>
            <span className="was" />
            <span className="mk" />
            <small className="lo">lower</small>
            <small className="hi">higher</small>
          </div>
        </div>
        <div className="scene" data-scene="6">
          <h3 className="line">
            {'Only valid games at partner clubs '}
            <em>count.</em>
          </h3>
          <p className="say">
            Score doesn't change the step. New players are Provisional for their first games. Your
            rank reads the last 90 days.
          </p>
        </div>
        <div className="sdots" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </section>
  )
}

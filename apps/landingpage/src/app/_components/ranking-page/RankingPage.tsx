import type { CSSProperties } from 'react'

/**
 * How ranking works (#ranking): told like the landing. A full-screen hero, then five pinned story chapters
 * (one idea per screen, each over a section scene), ending on the rank card.
 */
export function RankingPage() {
  return (
    <main className="view" data-view="ranking" hidden>
      <section id="r-top" className="rk-hero gut has-bgl" data-ch="0" data-sky="1">
        <div className="bgl" data-bg-scene="lineup" aria-hidden="true">
          <img
            className="ly far"
            src="/art/lineup-far.webp"
            alt=""
            loading="lazy"
            data-layer="lineup-far"
          />
          <img
            className="ly mid"
            src="/art/lineup-mid.webp"
            alt=""
            loading="lazy"
            data-layer="lineup-mid"
          />
          <img
            className="ly near"
            src="/art/lineup-near.webp"
            alt=""
            loading="lazy"
            data-layer="lineup-near"
          />
          <img
            className="ly m"
            src="/art/mobile/lineup.webp"
            alt=""
            loading="lazy"
            data-layer="lineup-mobile"
          />
        </div>
        <div className="bc-rank">
          <div
            className="bigc chr"
            data-char="half-tara-phone"
            role="img"
            aria-label="Tara holding up her phone with her ROTRA rank"
          />
        </div>
        <div className="wrap">
          <div className="p-hero bc-rhero">
            <div className="p-copy">
              <span className="eyebrow">How ranking works</span>
              <h1 className="p-h1">
                {'A rank you earn '}
                <em>at partner clubs.</em>
              </h1>
              <p className="lede">
                ROTRA ranks badminton players by the games they win at ROTRA Partner clubs. Nobody
                rates themselves. Clubs assess, and wins decide.
              </p>
              <div className="acts">
                <a className="btn pri" href="#r-parts">
                  Start the story ↓
                </a>
                <a className="btn" href="#clubs">
                  For club owners
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section
        id="r-parts"
        className="fade-io pin story rk-story"
        data-pin=""
        data-n="3"
        data-ch="1"
        data-beat="assess"
        data-sky="2"
        style={{ '--n': '3' } as CSSProperties}
      >
        <div className="stage">
          <div className="bgl" data-bg-scene="assess" aria-hidden="true">
            <img
              className="ly far"
              src="/art/assess-far.webp"
              alt=""
              loading="lazy"
              data-layer="assess-far"
            />
            <img
              className="ly mid"
              src="/art/assess-mid.webp"
              alt=""
              loading="lazy"
              data-layer="assess-mid"
            />
            <img
              className="ly near"
              src="/art/assess-near.webp"
              alt=""
              loading="lazy"
              data-layer="assess-near"
            />
            <img
              className="ly m"
              src="/art/mobile/assess.webp"
              alt=""
              loading="lazy"
              data-layer="assess-mobile"
            />
          </div>
          <div className="scene" data-scene="0">
            <span className="eyebrow">01 · Two parts</span>
            <h2 className="mega">
              {"The club's call, "}
              <em>then the shared rank.</em>
            </h2>
          </div>
          <div className="scene rk-duo" data-scene="1">
            <div className="bigc chr rk-fig" data-char="half-rion-assess" aria-hidden="true" />
            <div className="rk-copy">
              <span className="chip acc">At the club</span>
              <h3 className="mega-sm">Partners assess, locally</h3>
              <p className="say">
                Before each night the partner's Queue Master sets every player's level for the night
                from the nine-level ladder. That's what the club uses to make fair games. Levels
                lock when the session starts.
              </p>
              <p className="say">
                For a new player, that first level is where their ROTRA rank starts.
              </p>
            </div>
          </div>
          <div className="scene rk-duo rk-flip" data-scene="2">
            <div className="bigc chr rk-fig" data-char="half-tara-ask" aria-hidden="true" />
            <div className="rk-copy">
              <span className="chip acc">Across every club</span>
              <h3 className="mega-sm">Wins, weighted by who you beat</h3>
              <p className="say">
                Before each counted game ROTRA compares the two teams. After it, every player moves
                up or down. Score doesn't change the step in v1.
              </p>
              <p className="say">After your first night, only wins and losses move your rank.</p>
            </div>
          </div>
          <div className="sdots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>
      <section
        id="r-moves"
        className="fade-io pin story rk-story"
        data-pin=""
        data-n="5"
        data-ch="2"
        data-beat="moves"
        data-sky="3"
        style={{ '--n': '5' } as CSSProperties}
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
            <span className="eyebrow">02 · After every counted game</span>
            <h2 className="mega">
              {'Four ways '}
              <em>your rank moves.</em>
            </h2>
          </div>
          <div
            className="scene oc2"
            data-scene="1"
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
            data-scene="2"
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
          <div
            className="scene oc2"
            data-scene="3"
            style={{ '--c': 'var(--fg2)' } as CSSProperties}
          >
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
            data-scene="4"
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
            <p className="anno">
              WIREFRAME: step sizes and band edges are still open (#247). No numbers on the site
              until decided.
            </p>
          </div>
          <div className="sdots" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>
      <section
        id="r-rules"
        className="fade-io pin story rk-story"
        data-pin=""
        data-n="5"
        data-ch="3"
        data-beat="clubs"
        data-sky="4"
        style={{ '--n': '5' } as CSSProperties}
      >
        <div className="stage">
          <div className="bgl" data-bg-scene="clubs" aria-hidden="true">
            <img
              className="ly far"
              src="/art/clubs-far.webp"
              alt=""
              loading="lazy"
              data-layer="clubs-far"
            />
            <img
              className="ly mid"
              src="/art/clubs-mid.webp"
              alt=""
              loading="lazy"
              data-layer="clubs-mid"
            />
            <img
              className="ly near"
              src="/art/clubs-near.webp"
              alt=""
              loading="lazy"
              data-layer="clubs-near"
            />
            <img
              className="ly m"
              src="/art/mobile/clubs.webp"
              alt=""
              loading="lazy"
              data-layer="clubs-mobile"
            />
          </div>
          <div className="scene" data-scene="0">
            <span className="eyebrow">03 · The rules</span>
            <h2 className="mega">
              {'The fine print, '}
              <em>in plain words.</em>
            </h2>
          </div>
          <div className="scene" data-scene="1">
            <h3 className="mega-sm">What counts</h3>
            <p className="say">
              Valid singles and doubles games from finished sessions at partner clubs. Fun games and
              invalid games don't count.
            </p>
          </div>
          <div className="scene" data-scene="2">
            <h3 className="mega-sm">Provisional</h3>
            <p className="say">
              New players are Provisional for their first games, so their rank settles fast. No
              leaderboard spot yet.
            </p>
          </div>
          <div className="scene" data-scene="3">
            <h3 className="mega-sm">90 days</h3>
            <p className="say">
              Your rank reads the last 90 days. Stop playing and it shows Needs reassessment until
              you're back.
            </p>
          </div>
          <div className="scene" data-scene="4">
            <h3 className="mega-sm">One rank</h3>
            <p className="say">Singles and doubles share one rank, at every partner club.</p>
          </div>
          <div className="sdots" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>
      <section
        id="r-ladder"
        className="fade-io pin story rk-story"
        data-pin=""
        data-n="2"
        data-ch="4"
        data-beat="ladder"
        data-sky="5"
        style={{ '--n': '2' } as CSSProperties}
      >
        <div className="stage">
          <div className="bgl" data-bg-scene="ladder" aria-hidden="true">
            <img
              className="ly far"
              src="/art/ladder-far.webp"
              alt=""
              loading="lazy"
              data-layer="ladder-far"
            />
            <img
              className="ly mid"
              src="/art/ladder-mid.webp"
              alt=""
              loading="lazy"
              data-layer="ladder-mid"
            />
            <img
              className="ly near"
              src="/art/ladder-near.webp"
              alt=""
              loading="lazy"
              data-layer="ladder-near"
            />
            <img
              className="ly m"
              src="/art/mobile/ladder.webp"
              alt=""
              loading="lazy"
              data-layer="ladder-mobile"
            />
          </div>
          <div className="scene" data-scene="0">
            <span className="eyebrow">04 · The ladder</span>
            <h2 className="mega">
              {'Nine levels, '}
              <em>three groups.</em>
            </h2>
            <p className="say">Your level is read off your rank. Nobody hands it out.</p>
          </div>
          <div className="scene" data-scene="1">
            <div className="rk-bands">
              <div className="card p-card band" data-band="beg">
                <h3>
                  <i />
                  Beginner
                </h3>
                <div className="qmeta">
                  <span className="qchip">Low</span>
                  <span className="qchip">Mid</span>
                  <span className="qchip">High</span>
                </div>
              </div>
              <div className="card p-card band" data-band="int">
                <h3>
                  <i />
                  Intermediate
                </h3>
                <div className="qmeta">
                  <span className="qchip">Low</span>
                  <span className="qchip">Mid</span>
                  <span className="qchip">High</span>
                </div>
              </div>
              <div className="card p-card band" data-band="adv">
                <h3>
                  <i />
                  Advanced
                </h3>
                <div className="qmeta">
                  <span className="qchip">Low</span>
                  <span className="qchip">Mid</span>
                  <span className="qchip">High</span>
                </div>
              </div>
            </div>
            <p className="say">Your level is read off your rank. Nobody hands it out.</p>
          </div>
          <div className="sdots" aria-hidden="true">
            <i />
            <i />
          </div>
        </div>
      </section>
      <section
        id="r-card"
        className="fade-io pin story rk-story"
        data-pin=""
        data-n="2"
        data-ch="5"
        data-beat="record"
        data-sky="6"
        style={{ '--n': '2' } as CSSProperties}
      >
        <div className="stage">
          <div className="bgl" data-bg-scene="record" aria-hidden="true">
            <img
              className="ly far"
              src="/art/record-far.webp"
              alt=""
              loading="lazy"
              data-layer="record-far"
            />
            <img
              className="ly mid"
              src="/art/record-mid.webp"
              alt=""
              loading="lazy"
              data-layer="record-mid"
            />
            <img
              className="ly near"
              src="/art/record-near.webp"
              alt=""
              loading="lazy"
              data-layer="record-near"
            />
            <img
              className="ly m"
              src="/art/mobile/record.webp"
              alt=""
              loading="lazy"
              data-layer="record-mobile"
            />
          </div>
          <div className="scene" data-scene="0">
            <span className="eyebrow">05 · Your rank card</span>
            <h2 className="mega">
              {'Carry it. '}
              <em>Share it.</em>
            </h2>
          </div>
          <div className="scene" data-scene="1">
            <article className="rcard p-rcard">
              <header>
                <span className="rlogo" style={{ height: '20px' }}>
                  <svg aria-hidden="true">
                    <use href="#logo-full" />
                  </svg>
                </span>
                <span className="eyebrow" style={{ fontSize: '11px' }}>
                  Rank card
                </span>
              </header>
              <div className="rc-p">
                <span className="qav" style={{ width: '52px', height: '52px', fontSize: '16px' }}>
                  TA
                </span>
                <div>
                  <b>Tara Reyes</b>
                  <small>RTR-0142</small>
                </div>
              </div>
              <div className="rc-lvl">
                <span className="lvl-bars" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <b>Intermediate Mid</b>
              </div>
              <div className="rc-ladder" aria-hidden="true">
                <i className="on" />
                <i className="on" />
                <i className="on" />
                <i className="on" />
                <i className="on me" />
                <i />
                <i />
                <i />
                <i />
              </div>
              <dl>
                <div>
                  <dt>Overall</dt>
                  <dd>#128</dd>
                </div>
                <div>
                  <dt>Partner clubs</dt>
                  <dd>3</dd>
                </div>
                <div>
                  <dt>Window</dt>
                  <dd>90 days</dd>
                </div>
              </dl>
            </article>
            <p className="say">
              Every registered player has a public profile with their level, overall position and
              the ladder. Share it as a link or a story image.
            </p>
            <div className="acts" style={{ justifyContent: 'center' }}>
              <a className="btn pri" href="#find">
                Find your profile
              </a>
              <a className="btn" href="#clubs">
                For club owners
              </a>
            </div>
          </div>
          <div className="sdots" aria-hidden="true">
            <i />
            <i />
          </div>
        </div>
      </section>
    </main>
  )
}

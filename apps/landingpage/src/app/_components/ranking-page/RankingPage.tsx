import type { CSSProperties } from 'react'

/** How ranking works page (#ranking). */
export function RankingPage() {
  return (
    <main className="view page gut" data-view="ranking" hidden>
      <div className="wrap">
        <section className="p-hero bc-rhero">
          <div className="p-copy">
            <span className="eyebrow">How ranking works</span>
            <h1>
              {'A rank you earn '}
              <em>at partner clubs.</em>
            </h1>
            <p className="lede">
              ROTRA ranks badminton players by the games they win at ROTRA Partner clubs. Nobody
              rates themselves. Clubs assess, and wins decide.
            </p>
            <div className="acts">
              <a className="btn pri" href="#home">
                See it as a story
              </a>
              <a className="btn" href="#clubs">
                For club owners
              </a>
            </div>
          </div>
          <div className="bc-rank">
            <div
              className="bigc chr"
              data-char="half-tara-phone"
              role="img"
              aria-label="Tara holding up her phone with her ROTRA rank"
            />
          </div>
        </section>
        <section className="p-sec">
          <div className="p-head">
            <span className="eyebrow">Two parts</span>
            <h2>The club's call, then the shared rank</h2>
          </div>
          <div className="g2">
            <div className="card glow p-card">
              <span className="chip acc">At the club</span>
              <h3>Partners assess, locally</h3>
              <p>
                Before each night the partner's Queue Master sets every player's level for the night
                from the nine-level ladder. That's what the club uses to make fair games. Levels
                lock when the session starts.
              </p>
              <p>For a new player, that first level is where their ROTRA rank starts.</p>
            </div>
            <div className="card glow p-card">
              <span className="chip acc">Across every club</span>
              <h3>Wins, weighted by who you beat</h3>
              <p>
                Before each counted game ROTRA compares the two teams. After it, every player moves
                up or down. Score doesn't change the step in v1.
              </p>
              <p>After your first night, only wins and losses move your rank.</p>
            </div>
          </div>
        </section>
        <section className="p-sec">
          <div className="p-head">
            <span className="eyebrow">After every counted game</span>
            <h2>Four ways your rank moves</h2>
          </div>
          <div className="outcomes">
            <div className="card oc on" style={{ '--c': 'var(--accent)' } as CSSProperties}>
              <span className="arrow">+++</span>
              <h3>Beat a stronger team</h3>
              <p>The upset. You climb a lot.</p>
            </div>
            <div className="card oc on" style={{ '--c': 'var(--accent)' } as CSSProperties}>
              <span className="arrow">+</span>
              <h3>Beat a weaker team</h3>
              <p>Expected. You climb a little.</p>
            </div>
            <div className="card oc on" style={{ '--c': 'var(--fg2)' } as CSSProperties}>
              <span className="arrow">=</span>
              <h3>Lose to a stronger team</h3>
              <p>Also expected. Almost no change.</p>
            </div>
            <div className="card oc on" style={{ '--c': 'var(--error)' } as CSSProperties}>
              <span className="arrow">−−−</span>
              <h3>Lose to a weaker team</h3>
              <p>The upset, the other way. You drop a lot.</p>
            </div>
          </div>
          <p className="anno">
            WIREFRAME: step sizes and band edges are still open (#247). No numbers on the site until
            decided.
          </p>
        </section>
        <section className="p-sec">
          <div className="p-head">
            <span className="eyebrow">The rules</span>
            <h2>The fine print, in plain words</h2>
          </div>
          <div className="g4">
            <div className="card p-card">
              <h3>What counts</h3>
              <p>
                Valid singles and doubles games from finished sessions at partner clubs. Fun games
                and invalid games don't count.
              </p>
            </div>
            <div className="card p-card">
              <h3>Provisional</h3>
              <p>
                New players are Provisional for their first games, so their rank settles fast. No
                leaderboard spot yet.
              </p>
            </div>
            <div className="card p-card">
              <h3>90 days</h3>
              <p>
                Your rank reads the last 90 days. Stop playing and it shows Needs reassessment until
                you're back.
              </p>
            </div>
            <div className="card p-card">
              <h3>One rank</h3>
              <p>Singles and doubles share one rank, at every partner club.</p>
            </div>
          </div>
        </section>
        <section className="p-sec">
          <div className="p-head">
            <span className="eyebrow">The ladder</span>
            <h2>Nine levels, three groups</h2>
            <p className="qmuted">Your level is read off your rank. Nobody hands it out.</p>
          </div>
          <div className="g3">
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
        </section>
        <section className="p-sec p-split">
          <div className="p-head">
            <span className="eyebrow">Your rank card</span>
            <h2>Carry it. Share it.</h2>
            <p className="qmuted">
              Every registered player has a public profile with their level, overall position and
              the ladder. Share it as a link or a story image.
            </p>
            <div className="acts">
              <a className="btn pri" href="#home">
                Find your profile
              </a>
            </div>
          </div>
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
        </section>
      </div>
    </main>
  )
}

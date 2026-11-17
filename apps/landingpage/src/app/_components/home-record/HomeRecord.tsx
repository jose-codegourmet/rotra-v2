import type { CSSProperties } from 'react'

/** Home 04: one record. */
export function HomeRecord() {
  return (
    <section
      id="s-record"
      className="fade-io pin story "
      data-pin=""
      data-n="4"
      data-ch="4"
      data-beat="record"
      data-sky="6"
      style={{ '--n': '4' } as CSSProperties}
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
          <span className="eyebrow">04 · One record</span>
          <h2 className="mega">
            {'Every game. '}
            <em>One record.</em>
          </h2>
        </div>
        <div className="scene" data-scene="1">
          <h3 className="line">
            {'From every partner club '}
            <em>you play at.</em>
          </h3>
          <div className="sess-fly">
            <div className="card sess s1">
              <span className="clogo" style={{ '--cl': 'var(--lv-beg)' } as CSSProperties}>
                TN
              </span>
              <div>
                <b>Tuesday Night BC</b>
                <small>Nov 11 · 7 games</small>
              </div>
              <span className="wl">5–2</span>
            </div>
            <div className="card sess s2">
              <span className="clogo" style={{ '--cl': 'var(--lv-int)' } as CSSProperties}>
                SS
              </span>
              <div>
                <b>Saturday Smashers</b>
                <small>Nov 8 · 6 games</small>
              </div>
              <span className="wl">3–3</span>
            </div>
            <div className="card sess s3">
              <span className="clogo" style={{ '--cl': 'var(--lv-adv)' } as CSSProperties}>
                QC
              </span>
              <div>
                <b>QC Shuttlers</b>
                <small>Nov 6 · 8 games</small>
              </div>
              <span className="wl">6–2</span>
            </div>
          </div>
        </div>
        <div className="scene" data-scene="2">
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
                <dt>In 2026</dt>
                <dd>41 wins</dd>
              </div>
            </dl>
          </article>
          <p className="say">
            {'Your level, your place on every board, your wins this year. '}
            <b>Yours.</b>
          </p>
        </div>
        <div className="scene" data-scene="3">
          <h2 className="mega-sm">
            {'Find '}
            <em>your profile.</em>
          </h2>
          {/* biome-ignore lint/a11y/useSemanticElements: markup kept as in the original page */}
          <form className="find card" role="search" id="findForm">
            <label htmlFor="findq" className="qsmall qmuted">
              Find your player profile
            </label>
            <div className="find-row">
              <input id="findq" placeholder="Name or RTR ID" autoComplete="off" />
              <button className="btn pri" type="submit">
                Search
              </button>
            </div>
            <p className="qsmall qmuted" id="findMsg">
              Wireframe: search opens the Player Information app.
            </p>
          </form>
          <div className="acts" style={{ justifyContent: 'center' }}>
            <a className="btn" href="#ranking">
              How ranking works
            </a>
            <a className="btn" href="#clubs">
              I run a club →
            </a>
          </div>
        </div>
        <div className="sdots" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </section>
  )
}

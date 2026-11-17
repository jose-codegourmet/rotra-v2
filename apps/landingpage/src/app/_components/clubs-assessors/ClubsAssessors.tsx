import type { CSSProperties } from 'react'

/** Clubs 01: the assessors (Roster and levels). */
export function ClubsAssessors() {
  return (
    <section
      id="s-assessors"
      className="fade-io pin story court"
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
        <svg
          className="courtlines"
          viewBox="0 0 1000 500"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g fill="none" stroke="#fff" strokeWidth="3">
            <rect x="40" y="30" width="920" height="440" />
            <line x1="500" y1="30" x2="500" y2="470" />
            <line x1="40" y1="70" x2="960" y2="70" />
            <line x1="40" y1="430" x2="960" y2="430" />
            <line x1="350" y1="30" x2="350" y2="470" />
            <line x1="650" y1="30" x2="650" y2="470" />
            <line x1="80" y1="250" x2="350" y2="250" />
            <line x1="650" y1="250" x2="920" y2="250" />
          </g>
        </svg>
        <div className="scene" data-scene="0">
          <span className="eyebrow">01 · The assessors</span>
          <h2 className="mega">
            {'Your club does '}
            <em>the assessing.</em>
          </h2>
          <p className="say">
            ROTRA Partners are club owners. Their Queue Master sets every player's level for the
            night.
          </p>
        </div>
        <div className="scene" data-scene="1">
          <h3 className="line">
            {'Set every level '}
            <em>before the night starts.</em>
          </h3>
          <div
            className="card qroster"
            role="img"
            aria-label="The Queue app's Roster and levels panel: the Queue Master sets each player's level for the night"
          >
            <div className="qr-head">
              <div>
                <h3>Roster and levels</h3>
                <p className="qsmall qmuted">
                  Confirm each player's slot and set their level for this club. Levels lock when the
                  session starts.
                </p>
              </div>
              <span className="qbtn pri">Add player</span>
            </div>
            <div className="roster-sum">
              <div className="sm-top">
                <b>4/24</b>
                <span>players · skill mix</span>
              </div>
              <div className="sm-bar">
                <i className="sm-intermediate" data-at="0.38" />
                <i className="sm-advanced" data-at="0.45" />
                <i className="sm-beginner" data-at="0.52" />
                <i className="sm-intermediate" data-at="0.59" />
                <i className="sm-open" />
              </div>
            </div>
            <p className="qnotice warn" id="needLvl">
              4 players need a level before the session can start.
            </p>
            <div className="qtabs">
              <span className="on">
                All
                <span className="qchip">4</span>
              </span>
              <span>
                Beginner
                <span className="qchip">1</span>
              </span>
              <span>
                {'Intermediate '}
                <span className="qchip">2</span>
              </span>
              <span>
                {'Advanced '}
                <span className="qchip">1</span>
              </span>
            </div>
            <div className="qlist">
              <div className="prow">
                <div className="qli">
                  <span className="qav">TA</span>
                  <div className="qmain">
                    <b>Tara</b>
                    <div className="qmeta">
                      <span className="qchip ok">ROTRA profile</span>
                      <span className="qsmall qmuted">First time here</span>
                    </div>
                  </div>
                </div>
                <span className="lvm-btn" data-at="0.38" data-band="int">
                  <i className="lvm-dot" />
                  <span className="lvm-v" data-level="Intermediate Low" />
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>
              <div className="prow">
                <div className="qli">
                  <span className="qav">PA</span>
                  <div className="qmain">
                    <b>Paolo</b>
                    <div className="qmeta">
                      <span className="qchip ok">ROTRA profile</span>
                      <span className="qsmall qmuted">Suggestion: Advanced Low</span>
                    </div>
                  </div>
                </div>
                <span className="lvm-btn" data-at="0.45" data-band="adv">
                  <i className="lvm-dot" />
                  <span className="lvm-v" data-level="Advanced Low" />
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>
              <div className="prow">
                <div className="qli">
                  <span className="qav">BE</span>
                  <div className="qmain">
                    <b>Bea</b>
                    <div className="qmeta">
                      <span className="qchip ok">ROTRA profile</span>
                      <span className="qsmall qmuted">Suggestion: Beginner Mid</span>
                    </div>
                  </div>
                </div>
                <span className="lvm-btn" data-at="0.52" data-band="beg">
                  <i className="lvm-dot" />
                  <span className="lvm-v" data-level="Beginner High" />
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>
              <div className="prow">
                <div className="qli">
                  <span className="qav">JU</span>
                  <div className="qmain">
                    <b>Jun</b>
                    <div className="qmeta">
                      <span className="qchip">Guest</span>
                      <span className="qsmall qmuted">No suggestion</span>
                    </div>
                  </div>
                </div>
                <span className="lvm-btn" data-at="0.59" data-band="int">
                  <i className="lvm-dot" />
                  <span className="lvm-v" data-level="Intermediate Mid" />
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="scene" data-scene="2">
          <h2 className="mega-sm">
            {'The first night sets the start. '}
            <em>Wins do the rest.</em>
          </h2>
          <p className="say">
            After a player's first night, only wins and losses at partner clubs move their rank.
          </p>
        </div>
        <div className="bc-a bc-rion">
          <p className="bc-bub">Tonight I set everyone's level. Tara, you're Intermediate Low.</p>
          <div className="bigc chr" data-char="half-rion-assess" aria-hidden="true" />
        </div>
        <div className="bc-a bc-tara">
          <p className="bc-bub">So that's where my rank starts?</p>
          <div className="bigc chr" data-char="half-tara-ask" aria-hidden="true" />
        </div>
        <div className="sdots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
    </section>
  )
}

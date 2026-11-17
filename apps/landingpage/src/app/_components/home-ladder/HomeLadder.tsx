import type { CSSProperties } from 'react'

/** Home 03: the leaderboards. */
export function HomeLadder() {
  return (
    <section
      id="s-ladder"
      className="fade-io pin story "
      data-pin=""
      data-n="4"
      data-ch="3"
      data-beat="ladder"
      data-sky="4"
      style={{ '--n': '4' } as CSSProperties}
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
          <span className="eyebrow">03 · The leaderboards</span>
          <h2 className="mega">
            {'Three boards. '}
            <em>Three fresh starts.</em>
          </h2>
          <p className="say">
            Weekly, monthly and annual. Every counted game moves you on all three.
          </p>
        </div>
        <div className="scene scene-board" data-scene="1-3">
          <div
            className="lbx-board"
            role="img"
            aria-label="ROTRA leaderboard podium for this week, this month and this year, with your own position below"
          >
            <h3 className="line bl">
              <span data-b="0" className="on">
                {'Climb '}
                <em>the week.</em>
              </span>
              <span data-b="1">
                {'Own '}
                <em>the month.</em>
              </span>
              <span data-b="2">
                {'Win '}
                <em>the year.</em>
              </span>
            </h3>
            <div className="seg lb-seg">
              <span data-b="0" className="on">
                Weekly
              </span>
              <span data-b="1">Monthly</span>
              <span data-b="2">Annual</span>
            </div>
            <section className="podium">
              <span className="embers" aria-hidden="true">
                <i style={{ left: '4%', animationDelay: '0.00s', animationDuration: '4s' }} />
                <i style={{ left: '41%', animationDelay: '0.73s', animationDuration: '5s' }} />
                <i style={{ left: '78%', animationDelay: '1.46s', animationDuration: '6s' }} />
                <i style={{ left: '23%', animationDelay: '2.19s', animationDuration: '7s' }} />
                <i style={{ left: '60%', animationDelay: '2.92s', animationDuration: '4s' }} />
                <i style={{ left: '5%', animationDelay: '3.65s', animationDuration: '5s' }} />
                <i style={{ left: '42%', animationDelay: '4.38s', animationDuration: '6s' }} />
                <i style={{ left: '79%', animationDelay: '0.11s', animationDuration: '7s' }} />
                <i style={{ left: '24%', animationDelay: '0.84s', animationDuration: '4s' }} />
                <i style={{ left: '61%', animationDelay: '1.57s', animationDuration: '5s' }} />
                <i style={{ left: '6%', animationDelay: '2.30s', animationDuration: '6s' }} />
                <i style={{ left: '43%', animationDelay: '3.03s', animationDuration: '7s' }} />
                <i style={{ left: '80%', animationDelay: '3.76s', animationDuration: '4s' }} />
                <i style={{ left: '25%', animationDelay: '4.49s', animationDuration: '5s' }} />
              </span>
              <div className="pod-head">
                <h3>Top three</h3>
                <span className="small muted" id="lbSub">
                  Weekly ROTRA leaderboard · resets Monday
                </span>
              </div>
              <div className="pod-stage">
                <div className="pod p1">
                  <span className="pod-who">
                    {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a decorative canvas, not focusable */}
                    <canvas
                      className="fire"
                      id="lbFire"
                      width="48"
                      height="40"
                      aria-hidden="true"
                    />
                    <span className="avatar pod-av" data-k="i0" />
                    <b className="pod-name" data-k="n0" />
                    <span className="pod-lv" data-k="l0" />
                  </span>
                  <span className="pod-step">
                    <b>1</b>
                    <small>1st</small>
                  </span>
                </div>
                <div className="pod p2">
                  <span className="pod-who">
                    <span className="avatar pod-av" data-k="i1" />
                    <b className="pod-name" data-k="n1" />
                    <span className="pod-lv" data-k="l1" />
                  </span>
                  <span className="pod-step">
                    <b>2</b>
                    <small>2nd</small>
                  </span>
                </div>
                <div className="pod p3">
                  <span className="pod-who">
                    <span className="avatar pod-av" data-k="i2" />
                    <b className="pod-name" data-k="n2" />
                    <span className="pod-lv" data-k="l2" />
                  </span>
                  <span className="pod-step">
                    <b>3</b>
                    <small>3rd</small>
                  </span>
                </div>
              </div>
            </section>
            <div className="lb-row me">
              <span className="lb-pos" id="lbPos">
                41
              </span>
              <span className="avatar">TA</span>
              <span className="lb-who">
                <b>Tara Reyes</b>
                <small>Intermediate Mid</small>
              </span>
              <span className="lb-delta" id="lbDelta">
                new
              </span>
            </div>
            <p className="mono" style={{ fontSize: '11px', textAlign: 'center' }}>
              Sample players
            </p>
          </div>
          <span className="fnote">
            NEW: weekly, monthly and annual boards aren't in the docs yet (today: one overall board,
            90 days). Needs a decision.
          </span>
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

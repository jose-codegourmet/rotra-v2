import type { CSSProperties } from 'react'

/** Clubs 02: run the night (the four Queue vignettes). */
export function ClubsRunNight() {
  return (
    <section
      id="c-get"
      className="fade-io pin story "
      data-pin=""
      data-n="5"
      data-ch="2"
      data-beat="get"
      data-sky="0"
      style={{ '--n': '5' } as CSSProperties}
    >
      <div className="stage">
        <div className="bgl" data-bg-scene="queue" aria-hidden="true">
          <img
            className="ly far"
            src="/art/queue-far.webp"
            alt=""
            loading="lazy"
            data-layer="queue-far"
          />
          <img
            className="ly mid"
            src="/art/queue-mid.webp"
            alt=""
            loading="lazy"
            data-layer="queue-mid"
          />
          <img
            className="ly near"
            src="/art/queue-near.webp"
            alt=""
            loading="lazy"
            data-layer="queue-near"
          />
          <img
            className="ly m"
            src="/art/mobile/queue.webp"
            alt=""
            loading="lazy"
            data-layer="queue-mobile"
          />
        </div>
        <div className="scene" data-scene="0">
          <span className="eyebrow">02 · Run the night</span>
          <h2 className="mega">
            {'One tablet. '}
            <em>The whole night.</em>
          </h2>
          <p className="say">
            Everything a Queue Master needs, from the first arrival to the published results.
          </p>
        </div>
        <div className="scene feat" data-scene="1">
          <h3 className="line">
            {'Fill the courts. '}
            <em>Keep it fair.</em>
          </h3>
          <figure
            className="vg vg-courts"
            data-vg="courts"
            role="img"
            aria-label="Queue app: live session with three courts in play and the Main Queue"
          >
            <div className="vg-tabs">
              <span className="vg-tab on vg-wide">
                {'Session '}
                <i
                  className="vg-cnt"
                  data-swap="s1"
                  data-a="2/3 courts in use"
                  data-b="3/3 courts in use"
                >
                  2/3 courts in use
                </i>
              </span>
              <span className="vg-tab">
                Queue
                <i className="vg-cnt" data-swap="s1" data-a="11 waiting" data-b="10 waiting">
                  11 waiting
                </i>
              </span>
            </div>
            <div className="vg-row">
              <b className="vg-h">Courts</b>
              <span className="vg-mut" data-swap="s1" data-a="1 of 3 free" data-b="0 of 3 free">
                1 of 3 free
              </span>
            </div>
            <div className="vg-cgrid">
              <div className="vg-court busy vg-c1 vg-wide">
                <div className="vg-ct">
                  <div>
                    <b>Court 1</b>
                    <span className="vg-mut">Until 3:56 PM</span>
                  </div>
                  <div className="vg-ct-r">
                    <span className="vg-chip ok">Playing</span>
                    <span className="vg-dots">···</span>
                  </div>
                </div>
                <div className="vg-pitch">
                  <svg
                    className="vg-cs"
                    viewBox="0 0 134 61"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect className="bg" width="134" height="61" />
                    <g className="ln" strokeWidth="1.5">
                      <rect
                        x=".75"
                        y=".75"
                        width="132.5"
                        height="59.5"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d="M0 4.6H134M0 56.4H134M7.6 0V61M126.4 0V61M47.2 0V61M86.8 0V61M0 30.5H47.2M86.8 30.5H134"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                    <path
                      className="ln"
                      d="M67 0V61"
                      strokeWidth="3"
                      strokeDasharray="4 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <div className="vg-sides">
                    <div className="vg-side">
                      <span className="vg-pf">
                        <i className="vg-av">
                          RA
                          <em>2</em>
                        </i>
                        <span className="vg-pn">Rafa</span>
                      </span>
                      <span className="vg-pf">
                        <i className="vg-av">
                          LB
                          <em>2</em>
                        </i>
                        <span className="vg-pn">Lia</span>
                      </span>
                    </div>
                    <div className="vg-side">
                      <span className="vg-pf">
                        <i className="vg-av">
                          KS
                          <em>2</em>
                        </i>
                        <span className="vg-pn">Kiko</span>
                      </span>
                      <span className="vg-pf">
                        <i className="vg-av">
                          BC
                          <em>2</em>
                        </i>
                        <span className="vg-pn">Bea</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="vg-cbody">
                  <div>
                    <p className="vg-mut">Doubles · Match 16 · 8 min</p>
                    <div className="vg-acts">
                      <span className="vg-btn pri">Open match</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="vg-court vg-c2">
                <div className="vg-ct">
                  <div>
                    <b>Court 2</b>
                    <span className="vg-mut">Until 3:56 PM</span>
                  </div>
                  <div className="vg-ct-r">
                    <span className="vg-stack">
                      <span className="vg-chip" data-off="s1">
                        Free
                      </span>
                      <span className="vg-chip" data-on="s1" data-off="s2">
                        Getting ready
                      </span>
                      <span className="vg-chip ok" data-on="s2">
                        Playing
                      </span>
                    </span>
                    <span className="vg-dots">···</span>
                  </div>
                </div>
                <div className="vg-pitch">
                  <svg
                    className="vg-cs"
                    viewBox="0 0 134 61"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect className="bg" width="134" height="61" />
                    <g className="ln" strokeWidth="1.5">
                      <rect
                        x=".75"
                        y=".75"
                        width="132.5"
                        height="59.5"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d="M0 4.6H134M0 56.4H134M7.6 0V61M126.4 0V61M47.2 0V61M86.8 0V61M0 30.5H47.2M86.8 30.5H134"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                    <path
                      className="ln"
                      d="M67 0V61"
                      strokeWidth="3"
                      strokeDasharray="4 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <div className="vg-free">
                    <svg
                      className="vg-cs"
                      viewBox="0 0 134 61"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <rect className="bg" width="134" height="61" />
                      <g className="ln" strokeWidth="1.5">
                        <rect
                          x=".75"
                          y=".75"
                          width="132.5"
                          height="59.5"
                          vectorEffect="non-scaling-stroke"
                        />
                        <path
                          d="M0 4.6H134M0 56.4H134M7.6 0V61M126.4 0V61M47.2 0V61M86.8 0V61M0 30.5H47.2M86.8 30.5H134"
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                      <path
                        className="ln"
                        d="M67 0V61"
                        strokeWidth="3"
                        strokeDasharray="4 3"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    <span>Free</span>
                  </div>
                  <div className="vg-sides">
                    <div className="vg-side">
                      <span className="vg-pf">
                        <i className="vg-av">
                          NO
                          <em>3</em>
                        </i>
                        <span className="vg-pn">Nina</span>
                      </span>
                      <span className="vg-pf" style={{ '--d': '.24s' } as CSSProperties}>
                        <i className="vg-av">
                          DR
                          <em>3</em>
                        </i>
                        <span className="vg-pn">Dani</span>
                      </span>
                    </div>
                    <div className="vg-side">
                      <span className="vg-pf" style={{ '--d': '.12s' } as CSSProperties}>
                        <i className="vg-av">
                          TR
                          <em>3</em>
                        </i>
                        <span className="vg-pn">Theo</span>
                      </span>
                      <span className="vg-pf" style={{ '--d': '.36s' } as CSSProperties}>
                        <i className="vg-av">
                          SV
                          <em>3</em>
                        </i>
                        <span className="vg-pn">Sam</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="vg-cbody vg-stack">
                  <div data-off="s1">
                    <p>
                      <span className="vg-mut">Next eligible:</span>
                      {' #1 · Doubles'}
                    </p>
                    <p>
                      {'Nina and Dani '}
                      <span className="vg-mut">vs</span>
                      {' Theo and Sam'}
                    </p>
                    <div className="vg-acts">
                      <span className="vg-btn pri vg-put">Put on court</span>
                      <span className="vg-btn">Pick another</span>
                    </div>
                  </div>
                  <div data-on="s1" data-off="s2">
                    <p className="vg-mut">Doubles · Match 18 · waiting to start</p>
                    <div className="vg-acts">
                      <span className="vg-btn pri vg-start">Start match</span>
                      <span className="vg-btn">Open match</span>
                    </div>
                  </div>
                  <div data-on="s2">
                    <p className="vg-mut">Doubles · Match 18 · 0 min</p>
                    <div className="vg-acts">
                      <span className="vg-btn pri">Open match</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="vg-court busy vg-c3 vg-wide">
                <div className="vg-ct">
                  <div>
                    <b>Court 3</b>
                    <span className="vg-mut">Until 3:56 PM</span>
                  </div>
                  <div className="vg-ct-r">
                    <span className="vg-chip ok">Playing</span>
                    <span className="vg-dots">···</span>
                  </div>
                </div>
                <div className="vg-pitch">
                  <svg
                    className="vg-cs"
                    viewBox="0 0 134 61"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect className="bg" width="134" height="61" />
                    <g className="ln" strokeWidth="1.5">
                      <rect
                        x=".75"
                        y=".75"
                        width="132.5"
                        height="59.5"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d="M0 4.6H134M0 56.4H134M7.6 0V61M126.4 0V61M47.2 0V61M86.8 0V61M0 30.5H47.2M86.8 30.5H134"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                    <path
                      className="ln"
                      d="M67 0V61"
                      strokeWidth="3"
                      strokeDasharray="4 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <div className="vg-sides">
                    <div className="vg-side">
                      <span className="vg-pf">
                        <i className="vg-av">
                          MS
                          <em>2</em>
                        </i>
                        <span className="vg-pn">Mika</span>
                      </span>
                      <span className="vg-pf">
                        <i className="vg-av">
                          KL
                          <em>2</em>
                        </i>
                        <span className="vg-pn">Kat</span>
                      </span>
                    </div>
                    <div className="vg-side">
                      <span className="vg-pf">
                        <i className="vg-av">
                          GT
                          <em>2</em>
                        </i>
                        <span className="vg-pn">Gab</span>
                      </span>
                      <span className="vg-pf">
                        <i className="vg-av">
                          AC
                          <em>2</em>
                        </i>
                        <span className="vg-pn">Andi</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="vg-cbody">
                  <div>
                    <p className="vg-mut">Doubles · Match 17 · 2 min</p>
                    <div className="vg-acts">
                      <span className="vg-btn pri">Open match</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <span className="vg-cur" aria-hidden="true">
              {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative cursor; its wrapper is aria-hidden */}
              <svg viewBox="0 0 22 22">
                <path d="M4 3v15.5l4.2-4 2.9 6.3 2.6-1.2-2.9-6.2 5.9-.3z" />
              </svg>
            </span>
          </figure>
          <p className="say">
            Generate matches, fill courts, handle match requests and minimum games.
          </p>
        </div>
        <div className="scene feat" data-scene="2">
          <h3 className="line">
            {'Know who walked in. '}
            <em>Set their level.</em>
          </h3>
          <figure
            className="vg vg-roster"
            data-vg="roster"
            role="img"
            aria-label="Queue app: Roster and levels, setting each player's level before the session"
          >
            <div className="vg-rhead">
              <div>
                <b className="vg-h">Roster and levels</b>
                <span className="vg-sub vg-wide">
                  Confirm each player's slot and set their level for this club. Levels lock when the
                  session starts.
                </span>
              </div>
              <span className="vg-btn pri">Add player</span>
            </div>
            <div className="vg-meter">
              <div className="vg-mtop">
                <b>14/24</b>
                slots · 10 left before the waitlist · expected games about 7–10 each
              </div>
              <div className="vg-bar">
                <i className="int" />
                <i className="adv" />
                <i className="none" />
                <i className="open" />
              </div>
            </div>
            <div className="vg-notice">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 3 2 21h20L12 3z" />
                <path d="M12 10v5M12 18h.01" />
              </svg>
              <span>1 player needs a level before the session can start.</span>
            </div>
            <div className="vg-tabs vg-wide">
              <span className="vg-tab on">
                All
                <i className="vg-cnt">14</i>
              </span>
              <span className="vg-tab">
                Advanced
                <i className="vg-cnt">4</i>
              </span>
              <span className="vg-tab">
                Intermediate
                <i className="vg-cnt" data-swap="s2" data-a="9" data-b="10">
                  9
                </i>
              </span>
              <span className="vg-tab">
                Beginner
                <i className="vg-cnt">0</i>
              </span>
              <span className="vg-tab vg-nolv">
                No level
                <i className="vg-cnt">1</i>
              </span>
            </div>
            <div className="vg-list">
              <div className="vg-prow vg-jo">
                <div className="vg-who">
                  <i className="vg-av">JT</i>
                  <div>
                    <b>Joanna Tan</b>
                    <div className="vg-meta">
                      <span className="vg-chip warn">Details required</span>
                      <span className="vg-mut">Suggestion: Intermediate Mid</span>
                    </div>
                  </div>
                </div>
                <div className="vg-lvcol">
                  <div className="vg-lvm">
                    <span className="vg-lvb lv-none">
                      <i className="dot" />
                      <span
                        className="v"
                        data-swap="s2"
                        data-a="Choose a level…"
                        data-b="Intermediate Mid"
                      >
                        Choose a level…
                      </span>
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
                    <span className="vg-lvl" data-on="s1" data-off="s2">
                      <span className="vg-grp lv-beg">
                        <span className="vg-gh">
                          <i />
                          Beginner
                        </span>
                        <span className="vg-opt">Low</span>
                        <span className="vg-opt">Mid</span>
                        <span className="vg-opt">High</span>
                      </span>
                      <span className="vg-grp lv-int">
                        <span className="vg-gh">
                          <i />
                          Intermediate
                        </span>
                        <span className="vg-opt">Low</span>
                        <span className="vg-opt vg-pick">Mid</span>
                        <span className="vg-opt">High</span>
                      </span>
                      <span className="vg-grp lv-adv">
                        <span className="vg-gh">
                          <i />
                          Advanced
                        </span>
                        <span className="vg-opt">Low</span>
                        <span className="vg-opt">Mid</span>
                        <span className="vg-opt">High</span>
                      </span>
                    </span>
                  </div>
                  <span className="vg-diff" data-on="s2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 12 4 4 10-10" />
                    </svg>
                    Matches suggestion
                  </span>
                </div>
                <div className="vg-acts vg-wide">
                  <span className="vg-btn xs">Move to waitlist</span>
                  <span className="vg-btn xs">×</span>
                </div>
              </div>
              <div className="vg-prow">
                <div className="vg-who">
                  <i className="vg-av">RA</i>
                  <div>
                    <b>Rafa Aquino</b>
                    <div className="vg-meta">
                      <span className="vg-chip ok">Registered</span>
                      <span className="vg-mut">Suggestion: Intermediate High</span>
                    </div>
                  </div>
                </div>
                <div className="vg-lvcol">
                  <span className="vg-lvb lv-int">
                    <i className="dot" />
                    <span className="v">Intermediate High</span>
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
                  <span className="vg-diff">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 12 4 4 10-10" />
                    </svg>
                    Matches suggestion
                  </span>
                </div>
                <div className="vg-acts vg-wide">
                  <span className="vg-btn xs">Move to waitlist</span>
                  <span className="vg-btn xs">×</span>
                </div>
              </div>
              <div className="vg-prow vg-wide">
                <div className="vg-who">
                  <i className="vg-av">LB</i>
                  <div>
                    <b>Lia Bautista</b>
                    <div className="vg-meta">
                      <span className="vg-chip">Guest</span>
                      <span className="vg-mut">No suggestion</span>
                    </div>
                  </div>
                </div>
                <div className="vg-lvcol">
                  <span className="vg-lvb lv-int">
                    <i className="dot" />
                    <span className="v">Intermediate Low</span>
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
                  <span className="vg-diff" />
                </div>
                <div className="vg-acts vg-wide">
                  <span className="vg-btn xs">Move to waitlist</span>
                  <span className="vg-btn xs">×</span>
                </div>
              </div>
              <div className="vg-prow vg-wide">
                <div className="vg-who">
                  <i className="vg-av">CM</i>
                  <div>
                    <b>Carlo Medina</b>
                    <div className="vg-meta">
                      <span className="vg-chip ok">Registered</span>
                      <span className="vg-mut">Suggestion: Intermediate Mid</span>
                    </div>
                  </div>
                </div>
                <div className="vg-lvcol">
                  <span className="vg-lvb lv-int">
                    <i className="dot" />
                    <span className="v">Intermediate Mid</span>
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
                  <span className="vg-diff">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 12 4 4 10-10" />
                    </svg>
                    Matches suggestion
                  </span>
                </div>
                <div className="vg-acts vg-wide">
                  <span className="vg-btn xs">Move to waitlist</span>
                  <span className="vg-btn xs">×</span>
                </div>
              </div>
            </div>
            <span className="vg-cur" aria-hidden="true">
              {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative cursor; its wrapper is aria-hidden */}
              <svg viewBox="0 0 22 22">
                <path d="M4 3v15.5l4.2-4 2.9 6.3 2.6-1.2-2.9-6.2 5.9-.3z" />
              </svg>
            </span>
          </figure>
          <p className="say">Confirm slots and see the skill mix before you start.</p>
        </div>
        <div className="scene feat" data-scene="3">
          <h3 className="line">
            {'Settle up '}
            <em>before lights out.</em>
          </h3>
          <figure
            className="vg vg-pay"
            data-vg="pay"
            role="img"
            aria-label="Queue app: Payments, collected, still due and per-player paid status"
          >
            <div className="vg-rhead">
              <div>
                <b className="vg-h">Payments</b>
                <span className="vg-sub">₱180 per player (custom amount).</span>
              </div>
              <span className="vg-btn">Mark all paid</span>
            </div>
            <div className="vg-tiles">
              <div className="vg-tile">
                <span className="vg-lbl">Paid</span>
                <b>
                  <span data-count="s1" data-a="20" data-b="21">
                    20
                  </span>
                  <small>/24</small>
                </b>
              </div>
              <div className="vg-tile">
                <span className="vg-lbl">Collected</span>
                <b data-count="s1" data-a="3600" data-b="3780" data-fmt="peso">
                  ₱3,600
                </b>
              </div>
              <div className="vg-tile">
                <span className="vg-lbl">Still due</span>
                <b data-count="s1" data-a="720" data-b="540" data-fmt="peso">
                  ₱720
                </b>
              </div>
              <div className="vg-tile vg-wide">
                <span className="vg-lbl">Against costs</span>
                <b className="warn" data-count="s1" data-a="7650" data-b="7470" data-fmt="neg">
                  −₱7,650
                </b>
                <span className="vg-mut">of ₱11,250 cost</span>
              </div>
            </div>
            <div className="vg-seg vg-wide">
              <span className="on">Everyone · 24</span>
              <span>
                {'Not paid · '}
                <i data-swap="s1" data-a="4" data-b="3">
                  4
                </i>
              </span>
              <span>
                {'Paid · '}
                <i data-swap="s1" data-a="20" data-b="21">
                  20
                </i>
              </span>
            </div>
            <div className="vg-pgrid" data-flip="s2">
              <div className="vg-pc vg-andi" data-o="1" data-o2="4">
                <div className="vg-ptop">
                  <i className="vg-av">AC</i>
                  <span className="vg-sw" />
                </div>
                <b>Andi Cruz</b>
                <span className="vg-chip" data-swap="s1" data-a="Unpaid" data-b="Paid">
                  Unpaid
                </span>
                <span className="vg-mut" data-swap="s1" data-a="₱180 due" data-b="₱180 received">
                  ₱180 due
                </span>
              </div>
              <div className="vg-pc" data-o="2" data-o2="1">
                <div className="vg-ptop">
                  <i className="vg-av">EN</i>
                  <span className="vg-sw" />
                </div>
                <b>Enzo Navarro</b>
                <span className="vg-chip">Unpaid</span>
                <span className="vg-mut">₱180 due</span>
              </div>
              <div className="vg-pc" data-o="3" data-o2="2">
                <div className="vg-ptop">
                  <i className="vg-av">NO</i>
                  <span className="vg-sw" />
                </div>
                <b>Nina Ocampo</b>
                <span className="vg-chip">Unpaid</span>
                <span className="vg-mut">₱180 due</span>
              </div>
              <div className="vg-pc" data-o="4" data-o2="3">
                <div className="vg-ptop">
                  <i className="vg-av">YF</i>
                  <span className="vg-sw" />
                </div>
                <b>Ysa Fernandez</b>
                <span className="vg-chip">Unpaid</span>
                <span className="vg-mut">₱180 due</span>
              </div>
              <div className="vg-pc paid vg-wide" data-o="5" data-o2="5">
                <div className="vg-ptop">
                  <i className="vg-av">BC</i>
                  <span className="vg-sw" />
                </div>
                <b>Bea Castillo</b>
                <span className="vg-chip ok">Paid</span>
                <span className="vg-mut">₱180 received</span>
              </div>
              <div className="vg-pc paid vg-wide" data-o="6" data-o2="6">
                <div className="vg-ptop">
                  <i className="vg-av">BR</i>
                  <span className="vg-sw" />
                </div>
                <b>Bong Rosales</b>
                <span className="vg-chip ok">Paid</span>
                <span className="vg-mut">₱180 received</span>
              </div>
              <div className="vg-pc paid vg-wide" data-o="7" data-o2="7">
                <div className="vg-ptop">
                  <i className="vg-av">CM</i>
                  <span className="vg-sw" />
                </div>
                <b>Carlo Medina</b>
                <span className="vg-chip ok">Paid</span>
                <span className="vg-mut">₱180 received</span>
              </div>
              <div className="vg-pc paid vg-wide" data-o="8" data-o2="8">
                <div className="vg-ptop">
                  <i className="vg-av">DR</i>
                  <span className="vg-sw" />
                </div>
                <b>Dani Rivera</b>
                <span className="vg-chip ok">Paid</span>
                <span className="vg-mut">₱180 received</span>
              </div>
            </div>
            <span className="vg-cur" aria-hidden="true">
              {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative cursor; its wrapper is aria-hidden */}
              <svg viewBox="0 0 22 22">
                <path d="M4 3v15.5l4.2-4 2.9 6.3 2.6-1.2-2.9-6.2 5.9-.3z" />
              </svg>
            </span>
          </figure>
          <p className="say">
            Court and shuttle costs, per-player payments and what is still owed.
          </p>
        </div>
        <div className="scene feat" data-scene="4">
          <h3 className="line">
            {'Share the night. '}
            <em>Crown the winners.</em>
          </h3>
          <figure
            className="vg vg-res"
            data-vg="res"
            role="img"
            aria-label="Queue app: published results with the night's standings"
          >
            <div className="vg-chips">
              <span className="vg-chip ok">Completed</span>
              <span className="vg-chip ok">Results published</span>
            </div>
            <div className="vg-tiles">
              <div className="vg-tile">
                <span className="vg-lbl">Games</span>
                <b>27</b>
              </div>
              <div className="vg-tile">
                <span className="vg-lbl">Players</span>
                <b>24</b>
                <span className="vg-mut vg-wide">of 24 slots</span>
              </div>
              <div className="vg-tile">
                <span className="vg-lbl">Courts</span>
                <b>3</b>
              </div>
              <div className="vg-tile">
                <span className="vg-lbl">Length</span>
                <b>3 h</b>
              </div>
            </div>
            <div className="vg-row">
              <b className="vg-h">Standings</b>
              <div className="vg-acts">
                <span className="vg-btn vg-share">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="6" cy="12" r="2.5" />
                    <circle cx="18" cy="6" r="2.5" />
                    <circle cx="18" cy="18" r="2.5" />
                    <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
                  </svg>
                  Share leaderboard
                </span>
                <span className="vg-btn vg-wide">Result slides</span>
                <span className="vg-btn vg-wide">Download images</span>
              </div>
            </div>
            <div className="vg-lb">
              <div className="vg-lbh">
                <span>#</span>
                <span>Player</span>
                <span>W</span>
                <span>L</span>
                <span className="vg-wide">Games</span>
              </div>
              <div className="vg-lbr vg-top" data-r="1">
                <span>
                  <i className="vg-rank r1">1</i>
                </span>
                <span className="vg-lbp">
                  <i className="vg-av">TR</i>
                  <b>Theo Ramos</b>
                </span>
                <b>5</b>
                <span>0</span>
                <span className="vg-wide">5</span>
              </div>
              <div className="vg-lbr vg-top" data-r="2">
                <span>
                  <i className="vg-rank r2">2</i>
                </span>
                <span className="vg-lbp">
                  <i className="vg-av">MS</i>
                  <b>Mika Soriano</b>
                </span>
                <b>4</b>
                <span>1</span>
                <span className="vg-wide">5</span>
              </div>
              <div className="vg-lbr vg-top" data-r="3">
                <span>
                  <i className="vg-rank r3">3</i>
                </span>
                <span className="vg-lbp">
                  <i className="vg-av">AC</i>
                  <b>Andi Cruz</b>
                </span>
                <b>4</b>
                <span>1</span>
                <span className="vg-wide">5</span>
              </div>
              <div className="vg-lbr" data-r="4">
                <span>
                  <i className="vg-rank">4</i>
                </span>
                <span className="vg-lbp">
                  <i className="vg-av">KL</i>
                  <b>Kat Lim</b>
                </span>
                <b>3</b>
                <span>1</span>
                <span className="vg-wide">4</span>
              </div>
              <div className="vg-lbr" data-r="5">
                <span>
                  <i className="vg-rank">5</i>
                </span>
                <span className="vg-lbp">
                  <i className="vg-av">ML</i>
                  <b>Marco Lopez</b>
                </span>
                <b>3</b>
                <span>1</span>
                <span className="vg-wide">4</span>
              </div>
            </div>
            <div className="vg-sheet" data-on="s2">
              <b className="vg-h">Share leaderboard</b>
              <div className="vg-seg">
                <span>Story</span>
                <span className="on">Facebook post</span>
                <span>Square</span>
              </div>
            </div>
            <span className="vg-cur" aria-hidden="true">
              {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative cursor; its wrapper is aria-hidden */}
              <svg viewBox="0 0 22 22">
                <path d="M4 3v15.5l4.2-4 2.9 6.3 2.6-1.2-2.9-6.2 5.9-.3z" />
              </svg>
            </span>
          </figure>
          <p className="say">Publish standings, awards and match history for your players.</p>
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
  )
}

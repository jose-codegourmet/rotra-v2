import type { CSSProperties } from 'react'

/** Home 01: the real Tara. */
export function HomeReal() {
  return (
    <section id="s-real" className="pin ch1" data-pin="" data-ch="1" data-beat="real" data-sky="1">
      <div className="stage">
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
        <div className="ch1-grid" aria-hidden="true" />
        <div className="gut ch1-head">
          <div className="wrap">
            <span className="eyebrow">01 · The problem</span>
            <div className="hs">
              <h2 className="h-ask">
                {'Which one is '}
                <em>the real Tara?</em>
              </h2>
              <h2 className="h-ans">
                {'Only one is real. '}
                <em>Her rank proves it.</em>
              </h2>
            </div>
            <p className="ch1-sub">Every club keeps its own version of you. None of them match.</p>
          </div>
        </div>
        <div
          className="lineup-wrap"
          role="img"
          aria-label="A police-style lineup of five Taras. Four are odd copies, each holding a different club's level. The real Tara in the middle is spotlit and gets one ROTRA rank card."
        >
          <div className="ruler" aria-hidden="true">
            <span>Adv</span>
            <span>Int</span>
            <span>Beg</span>
          </div>
          <div className="spot" aria-hidden="true" />
          <div className="lineup">
            <figure
              className="clone odd-tall"
              style={{ '--k': '0', '--side': '-1', '--st': '.25' } as CSSProperties}
            >
              <div className="cbody">
                <div className="fig2 chr" data-char="lineup-clone-1" />
              </div>
              <figcaption>
                <span className="no">1</span>
                <span className="src">Tuesday Night BC</span>
                <span className="lvpill" data-band="int">
                  <i />
                  <span className="lv-l">Inter­mediate</span>
                  <span className="lv-s">Int</span>
                </span>
              </figcaption>
            </figure>
            <figure
              className="clone odd-small"
              style={{ '--k': '1', '--side': '-1', '--st': '0' } as CSSProperties}
            >
              <div className="cbody">
                <div className="fig2 chr" data-char="lineup-clone-2" />
              </div>
              <figcaption>
                <span className="no">2</span>
                <span className="src">Saturday Smashers</span>
                <span className="lvpill" data-band="beg">
                  <i />
                  <span className="lv-l">Beginner High</span>
                  <span className="lv-s">Beg Hi</span>
                </span>
              </figcaption>
            </figure>
            <figure className="clone real on" style={{ '--k': '2' } as CSSProperties}>
              <div className="cbody">
                <div className="fig2 chr" data-char="lineup-real" />
              </div>
              <figcaption>
                <span className="no">3</span>
                <span className="src">RTR-0142</span>
                <span className="lvpill real-pill">
                  <i />
                  <span className="rp-q">?</span>
                  <span className="rp-a">
                    <span className="lv-l">Inter­mediate Mid</span>
                    <span className="lv-s">Int Mid</span>
                  </span>
                </span>
              </figcaption>
            </figure>
            <figure
              className="clone odd-ghost"
              style={{ '--k': '3', '--side': '1', '--st': '0' } as CSSProperties}
            >
              <div className="cbody">
                <div className="fig2 chr" data-char="lineup-clone-4" />
              </div>
              <figcaption>
                <span className="no">4</span>
                <span className="src">QC Shuttlers</span>
                <span className="lvpill" data-band="none">
                  <i />
                  <span className="lv-l">No level</span>
                  <span className="lv-s">No lvl</span>
                </span>
              </figcaption>
            </figure>
            <figure
              className="clone odd-glitch"
              style={{ '--k': '4', '--side': '1', '--st': '.25' } as CSSProperties}
            >
              <div className="cbody">
                <div className="fig2 chr" data-char="lineup-clone-5" />
              </div>
              <figcaption>
                <span className="no">5</span>
                <span className="src">The group chat</span>
                <span className="lvpill" data-band="adv">
                  <i />
                  <span className="lv-l">Advanced daw</span>
                  <span className="lv-s">Adv daw</span>
                </span>
              </figcaption>
            </figure>
          </div>
          {/* What ROTRA gives instead: the player app's rank card */}
          <article className="rcard">
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
        </div>
        <p className="ch1-foot mono">Sample player and clubs</p>
      </div>
    </section>
  )
}

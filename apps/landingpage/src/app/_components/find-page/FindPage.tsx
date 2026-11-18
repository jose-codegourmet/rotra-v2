/** Find your profile page (#find): the profile search, centred over its own scene (art/scenes/find.riv). */
export function FindPage() {
  return (
    <main className="view" data-view="find" hidden>
      <section className="find-hero gut has-bgl">
        <div className="bgl" data-bg-scene="find" aria-hidden="true">
          <img
            className="ly far"
            src="/art/lite/find-far.webp"
            data-full="/art/find-far.webp"
            alt=""
            loading="lazy"
            data-layer="find-far"
          />
          <img
            className="ly mid"
            src="/art/lite/find-mid.webp"
            data-full="/art/find-mid.webp"
            alt=""
            loading="lazy"
            data-layer="find-mid"
          />
          <img
            className="ly near"
            src="/art/lite/find-near.webp"
            data-full="/art/find-near.webp"
            alt=""
            loading="lazy"
            data-layer="find-near"
          />
          <img
            className="ly m"
            src="/art/mobile/find.webp"
            alt=""
            loading="lazy"
            data-layer="find-mobile"
          />
        </div>
        <div className="wrap find-in">
          <span className="eyebrow">Find your profile</span>
          <h1 className="p-h1">
            {'Find '}
            <em>your profile.</em>
          </h1>
          <p className="lede">
            Every registered player has a public profile with their level, overall position and the
            ladder. Share it as a link or a story image.
          </p>
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
              Search opens the Player Information app.
            </p>
          </form>
          <div className="acts">
            <a className="btn" href="#ranking">
              How ranking works
            </a>
            <a className="btn" href="#clubs">
              I run a club →
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}

/** Clubs hero. */
export function ClubsHero() {
  return (
    <section
      id="c-top"
      className="has-bgl flow c-hero fullp gut"
      data-ch="0"
      data-beat="clubHero"
      data-sky="0"
    >
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
      <div className="wrap p-hero">
        <div className="p-copy">
          <span className="eyebrow">For club owners and Queue Masters</span>
          <h1 className="p-h1">
            {'Run the game. '}
            <em>Rank your players.</em>
          </h1>
          <p className="lede">
            ROTRA Partners are the clubs behind every rank. Run your nights on the ROTRA Queue,
            assess the players who walk in, and every valid game you finish counts toward their
            record.
          </p>
          <div className="acts">
            <a className="btn pri" href="#request">
              Request a quotation
            </a>
          </div>
        </div>
      </div>
      <div className="bc-club">
        <div
          className="bigc chr"
          data-char="half-rion-present"
          role="img"
          aria-label="Rion, Queue Master, presenting with his tablet"
        />
      </div>
    </section>
  )
}

/** Clubs 03: partner up. */
export function ClubsPartner() {
  return (
    <section
      id="s-pricing"
      className="fade-io has-bgl flow fullp gut"
      data-ch="3"
      data-beat="price"
      data-sky="5"
    >
      <div className="bgl" data-bg-scene="pricing" aria-hidden="true">
        <img
          className="ly far"
          src="/art/pricing-far.webp"
          alt=""
          loading="lazy"
          data-layer="pricing-far"
        />
        <img
          className="ly mid"
          src="/art/pricing-mid.webp"
          alt=""
          loading="lazy"
          data-layer="pricing-mid"
        />
        <img
          className="ly near"
          src="/art/pricing-near.webp"
          alt=""
          loading="lazy"
          data-layer="pricing-near"
        />
        <img
          className="ly m"
          src="/art/mobile/pricing.webp"
          alt=""
          loading="lazy"
          data-layer="pricing-mobile"
        />
      </div>
      <div className="wrap">
        <span className="eyebrow">03 · Partner up</span>
        <h2 className="mega-sm">
          {'One license '}
          <em>per club.</em>
        </h2>
        <p className="say">
          Players are ranked for free. Clubs pay to run their nights and assess on ROTRA.
        </p>
        <div className="card plan rfq">
          <span className="eyebrow" style={{ color: 'var(--fg2)' }}>
            What a club gets
          </span>
          <ul>
            <li>One club account</li>
            <li>Unlimited Queue Sessions</li>
            <li>Player assessment</li>
            <li>Results, awards, standings</li>
            <li>Support from the ROTRA team</li>
          </ul>
          <a className="btn pri" href="#request">
            Request a quotation
          </a>
          <p className="rfq-note">Tell us about your club and we'll send a quotation.</p>
        </div>
      </div>
    </section>
  )
}

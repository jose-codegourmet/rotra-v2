/** Clubs 04: partner request. */
export function ClubsRequest() {
  return (
    <section
      id="s-request"
      className="fade-io has-bgl flow fullp gut"
      data-ch="4"
      data-beat="req"
      data-sky="6"
    >
      <div className="bgl" data-bg-scene="request" aria-hidden="true">
        <img
          className="ly far"
          src="/art/lite/request-far.webp"
          data-full="/art/request-far.webp"
          alt=""
          loading="lazy"
          data-layer="request-far"
        />
        <img
          className="ly mid"
          src="/art/lite/request-mid.webp"
          data-full="/art/request-mid.webp"
          alt=""
          loading="lazy"
          data-layer="request-mid"
        />
        <img
          className="ly near"
          src="/art/lite/request-near.webp"
          data-full="/art/request-near.webp"
          alt=""
          loading="lazy"
          data-layer="request-near"
        />
        <img
          className="ly m"
          src="/art/mobile/request.webp"
          alt=""
          loading="lazy"
          data-layer="request-mobile"
        />
      </div>
      <div className="wrap">
        <span className="eyebrow">04 · Partner request</span>
        <h2 className="mega">
          {'Put your club '}
          <em>on the ladder.</em>
        </h2>
        <div className="flowline">
          <span className="chip">Request</span>
          <i>→</i>
          <span className="chip">We review</span>
          <i>→</i>
          <span className="chip">Pay the license</span>
          <i>→</i>
          <span className="chip acc">First ranked night</span>
        </div>
        <div className="acts" style={{ justifyContent: 'center' }}>
          <a className="btn pri" href="#request">
            Request a quotation
          </a>
        </div>
      </div>
    </section>
  )
}

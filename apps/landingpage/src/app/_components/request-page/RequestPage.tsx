/** Partner request page (#request). */
export function RequestPage() {
  return (
    <main className="view page gut" data-view="request" hidden>
      <div className="wrap">
        <section className="p-sec" style={{ paddingTop: '0' }}>
          <div className="req">
            <div className="side">
              <span className="eyebrow">Request a quotation</span>
              <h1 className="p-h1">
                {'Put your club '}
                <em>on the ladder.</em>
              </h1>
              <p>
                Tell us about your club. We review every request and contact you about your plan and
                payment. No payment now.
              </p>
              <ol className="next card p-card">
                <li>
                  <b>We review it</b>
                  {' within [N] working days.'}
                </li>
                <li>
                  <b>We contact you</b>
                  {' to confirm the club and your plan.'}
                </li>
                <li>
                  <b>You pay the license.</b>
                  {' We activate it.'}
                </li>
                <li>
                  <b>You get your club account</b>
                  {' and run your first night.'}
                </li>
              </ol>
              <div className="p-fig sm pimg">
                <div
                  className="pchr chr"
                  data-char="rion-wave-page-cut"
                  role="img"
                  aria-label="Rion waving hello"
                />
              </div>
            </div>
            <form className="card" id="partnerForm" noValidate>
              <label className="f full" htmlFor="club">
                Club name
                <input
                  id="club"
                  name="club"
                  required
                  placeholder="e.g. Smash Point Badminton Club"
                />
                <small>Must be unique on ROTRA.</small>
              </label>
              <label className="f" htmlFor="city">
                City
                <input id="city" name="city" required placeholder="City or municipality" />
              </label>
              <label className="f" htmlFor="venue">
                Main venue
                <input id="venue" name="venue" placeholder="Venue name" />
              </label>
              <label className="f" htmlFor="courts">
                Courts per night
                <input
                  id="courts"
                  name="courts"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  placeholder="4"
                />
              </label>
              <label className="f" htmlFor="nights">
                Nights per week
                <input
                  id="nights"
                  name="nights"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  placeholder="2"
                />
              </label>
              <label className="f" htmlFor="owner">
                Your full name
                <input id="owner" name="owner" required autoComplete="name" />
              </label>
              <label className="f" htmlFor="role">
                Your role
                <select id="role" name="role">
                  <option>Club owner</option>
                  <option>Club manager</option>
                  <option>Queue Master</option>
                </select>
              </label>
              <label className="f" htmlFor="email">
                Email
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@club.com"
                />
              </label>
              <label className="f" htmlFor="mobile">
                Mobile number
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="09XX XXX XXXX"
                />
              </label>
              <fieldset className="f full">
                <legend style={{ padding: '0 0 8px' }}>Plan you're interested in</legend>
                <div className="pills">
                  <label htmlFor="pm">
                    <input id="pm" type="radio" name="plan" defaultValue="monthly" defaultChecked />
                    Monthly
                  </label>
                  <label htmlFor="py">
                    <input id="py" type="radio" name="plan" defaultValue="yearly" />
                    Yearly
                  </label>
                  <label htmlFor="pn">
                    <input id="pn" type="radio" name="plan" defaultValue="unsure" />
                    Not sure yet
                  </label>
                </div>
              </fieldset>
              <label className="f full" htmlFor="notes">
                Anything else?
                <small>Optional</small>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="How you run your nights today, questions about ROTRA…"
                />
              </label>
              <label className="agree" htmlFor="agree">
                <input id="agree" type="checkbox" required />I agree to the partner terms and to
                ROTRA contacting me about this request.
              </label>
              <div className="submit">
                <button className="btn pri" type="submit">
                  Request a quotation
                </button>
                <span className="err" id="formErr" role="alert" />
              </div>
              <div className="done" id="done" hidden>
                <span className="ok">
                  <svg
                    width="30"
                    height="30"
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
                </span>
                <h3>Request received</h3>
                <p>
                  We'll contact you by email or mobile within [N] working days to confirm your plan
                  and payment.
                </p>{' '}
                <button className="btn" type="button" id="editReq">
                  Edit request
                </button>
              </div>
              <p className="anno" style={{ gridColumn: '1/-1' }}>
                WIREFRAME: where requests land (Admin inbox? email?) is undecided. Today clubs are
                created only by the platform owner.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}

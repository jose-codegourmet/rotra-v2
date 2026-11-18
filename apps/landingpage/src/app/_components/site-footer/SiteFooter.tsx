/** Site footer (the arena, links, back to top). */
export function SiteFooter() {
  return (
    <footer className="hunt" id="siteFooter">
      {/* Zone A: the arena (always dark). Tara and Rion stand on the band; the closing line sits between them */}
      <div className="h-arena">
        <img className="h-sky" src="/art/footer-sky.webp" alt="" aria-hidden="true" />
        <div className="h-fig h-ftara chr" data-char="tara-outro" aria-hidden="true" />
        <div className="h-fig h-frion chr" data-char="rion-wave" aria-hidden="true" />
        <div className="h-close">
          <h2 className="h-line">
            Run the game.
            <br />
            <em>Earn the rank.</em>
          </h2>
          <div className="h-acts">
            <a className="btn pri" href="#find">
              Find your profile
            </a>
            <a className="btn" href="#clubs">
              For clubs
            </a>
          </div>
        </div>
      </div>
      {/* Zone B: the band (black, light text; always dark) */}
      <div className="h-band gut">
        <div className="wrap h-row">
          <span className="rlogo h-brand" role="img" aria-label="ROTRA">
            <svg aria-hidden="true">
              <use href="#logo-full" />
            </svg>
          </span>
          <nav className="h-links" aria-label="Footer">
            <div>
              <span className="h-cap">Players</span>
              <a href="#home">The story</a>
              <a href="#ranking">How ranking works</a>
              <a href="#find">Find your profile</a>
            </div>
            <div>
              <span className="h-cap">Clubs</span>
              <a href="#clubs">For clubs</a>
              <a href="#request">Request a quotation</a>
            </div>
            <div>
              <span className="h-cap">ROTRA</span>
              <a href="#assets">Asset list</a>
              <a href="#home">Contact</a>
              <a href="#home">Privacy</a>
              <a href="#home">Terms</a>
            </div>
            <div>
              <span className="h-cap">Sign in</span>
              <a href="https://player.rotra.club/login" data-app="player">
                Player
              </a>
              <a href="https://queue.rotra.club/login" data-app="queue">
                Club account
              </a>
            </div>
          </nav>
        </div>
        <div className="wrap h-base">
          <button className="h-top" type="button" id="backTop">
            ↑ Back to top
          </button>
          <span className="h-colo">© 2026 ROTRA · rotra.club · Art: Higgsfield placeholders.</span>
        </div>
      </div>
    </footer>
  )
}

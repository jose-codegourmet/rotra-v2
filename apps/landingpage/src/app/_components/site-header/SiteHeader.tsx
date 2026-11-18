/** Background fx layer, the top bar with the main nav, the phone menu, and the chapter rail. */
export function SiteHeader() {
  return (
    <>
      <div className="bgfx" id="bgfx" aria-hidden="true" />
      <header className="top gut">
        <div className="wrap">
          {/* biome-ignore lint/a11y/useAnchorContent: the aria-label names the logo link */}
          <a className="rlogo" href="#home" aria-label="ROTRA home">
            <svg aria-hidden="true">
              <use href="#logo-full" />
            </svg>
          </a>
          <nav aria-label="Main">
            <a href="#ranking" data-nav="ranking">
              How ranking works
            </a>
            <a href="#clubs" data-nav="clubs">
              For clubs
            </a>
            <a href="#find" data-nav="find">
              Find your profile
            </a>
            <a className="btn pri" href="https://player.rotra.club/login" data-app="player">
              Sign in
            </a>
          </nav>
          <button
            className="menu-btn"
            type="button"
            id="menuOpen"
            aria-expanded="false"
            aria-controls="siteMenu"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>
      {/* Phone menu (760 px and below): a fullscreen sheet over the page, opened by the bar's menu button (site.js) */}
      <div className="menu gut" id="siteMenu" data-lenis-prevent hidden>
        <div className="menu-bar">
          {/* biome-ignore lint/a11y/useAnchorContent: the aria-label names the logo link */}
          <a className="rlogo" href="#home" aria-label="ROTRA home">
            <svg aria-hidden="true">
              <use href="#logo-full" />
            </svg>
          </a>
          <button className="menu-btn" type="button" id="menuClose" aria-label="Close menu">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav className="menu-links" aria-label="Menu">
          <a href="#ranking" data-nav="ranking">
            How ranking works
          </a>
          <a href="#clubs" data-nav="clubs">
            For clubs
          </a>
          <a href="#find" data-nav="find">
            Find your profile
          </a>
        </nav>
        <div className="menu-acts">
          <a className="btn pri" href="https://player.rotra.club/login" data-app="player">
            Sign in
          </a>
          <a className="btn" href="https://queue.rotra.club/login" data-app="queue">
            Club account
          </a>
        </div>
      </div>
      <nav className="rail" aria-label="Chapters">
        <a href="#top" aria-label="00 Play or run the game">
          00
          <span className="rl" aria-hidden="true">
            Play or run the game
          </span>
        </a>
        <a href="#s-real" aria-label="01 The real Tara">
          01
          <span className="rl" aria-hidden="true">
            The real Tara
          </span>
        </a>
        <a href="#s-ranking" aria-label="02 How a rank moves">
          02
          <span className="rl" aria-hidden="true">
            How a rank moves
          </span>
        </a>
        <a href="#s-ladder" aria-label="03 The leaderboards">
          03
          <span className="rl" aria-hidden="true">
            The leaderboards
          </span>
        </a>
        <a href="#s-record" aria-label="04 One record">
          04
          <span className="rl" aria-hidden="true">
            One record
          </span>
        </a>
      </nav>
    </>
  )
}

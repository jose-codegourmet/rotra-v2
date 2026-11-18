/**
 * The loading screen: the ROTRA mark over a dark page until the site's art is in the browser's cache.
 * Server-rendered so it is the first paint; "Boot" in src/scripts/boot.js swaps the still mark for the Rive
 * one (art/boot.riv), fills its inner ring with the load progress and removes the screen when everything is in.
 */
export function SiteBoot() {
  return (
    <div className="boot" id="boot" role="status" aria-label="Loading ROTRA">
      <div className="boot-in">
        <div className="boot-mark">
          <svg className="boot-still" viewBox="0 0 400 400" aria-hidden="true">
            <circle className="b1" cx="200" cy="200" r="173.4" />
            <circle className="b2" cx="200" cy="200" r="135" />
            <circle className="b3" cx="200" cy="200" r="96.3" />
            <circle className="bd" cx="335" cy="200" r="19.25" />
          </svg>
        </div>
        <svg className="boot-wm" viewBox="140 28 187 58" aria-hidden="true">
          <use href="#logo-full" width="324.21" height="120.56" />
        </svg>
        <div className="boot-pct" aria-hidden="true">
          <span id="boot-pct">0</span>%
        </div>
      </div>
      <noscript>
        <style>{'.boot{display:none}'}</style>
      </noscript>
    </div>
  )
}

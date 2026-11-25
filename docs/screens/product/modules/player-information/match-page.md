# Public match page

**Last verified:** 2026-11-25 · **Surfaces:** `P-MATCH-PAGE`.

**Sources:** [Public match page rules](../../../../business_logic/product/player-information/README.md#public-match-page), [game row as a court](ranking-history.md#p-match-history--read-only-recorded-games), [identity and privacy](identity-privacy.md). Prototype: [`rotra-player.html`](../../../../../apps/mockup/player-app/rotra-player.html) at `/player/matches/m1-2` (any game court opens its page). Route: `/matches/[matchId]` (see [navigation](../../navigation.md#player-match-route)). Mockup log: [2026-11-25-player-match-page](../../../../mockup-changes/2026-11-25-player-match-page.md).

## P-MATCH-PAGE — One game, shareable

Owner decision, November 25, 2026. One public page per match, the same page for every player in it. Anyone can open it, signed out too. The visible copy says **game**, like the rest of ROTRA Player; the route keeps `/matches`.

Top to bottom, in one column (`wrap mid`, the Sessions page width):

1. **Page head:** a back button, then the heading **Game**. The back button returns to the page the court was tapped on, labelled with it (the player's name, **Games**, **Sessions**, **Leaderboard**); opened from a link it reads **Leaderboard** and goes there.
2. **The game court**, the same court as every game row ([game row as a court](ranking-history.md#p-match-history--read-only-recorded-games)): format pill top left, the dark score box with **Won** / **Lost** (**Not counted** for a partial game), the winning side lit, a games badge on every face, first names on dark pills. The result reads from the left side.
   - **Who is on the left.** A signed-in player who played in the game sees their side on the left as **You**. Everyone else sees Team A (the first team) on the left with first names; there is no "You".
   - **Skill-group rings.** Each face's picture border is the player's skill group, in the colours of the public session participant tiles: Beginner `--lv-beg`, Intermediate `--lv-int`, Advanced `--lv-adv`, none `--lv-none` (no level yet, a guest, or a player whose level is hidden from this viewer). The winning side keeps an outer accent ring, set off from the skill ring by a thin dark gap (3 px skill ring, 2 px gap, 3 px accent).
   - **Share this game** (the share icon) shows only on the signed-in player's own game, as on every game row.
   - The court itself does not open anything here.
   - Under the court, muted: **SESSION TITLE · Tue, Nov 24 · Club name**. The session title opens the public session page; once the page is gone it is plain text.
   - Fun, partial and not ranked games keep the game row's note under the court ("Fun game · not counted", "Came in mid-game for … · not counted", "Not ranked session · …").
3. **Before this game** card: one block per player in the game, the left side first, then the right, in court order. Each block's head is the player's picture and first name (**You** for the signed-in player), opening the profile card, with **N earlier games** on the right (**1 earlier game**, **No earlier games**). Under it, that player's earlier games of the same session in play order, each drawn as a game court from that player's side (them on the left, the result and score from their side). These courts have no skill rings; tapping one opens its own match page.

Every face on the page opens the profile card, as elsewhere. Names follow the profile privacy rules for the viewer: a visitor sees Private players and guests masked (`B***`), an Always private player is masked for everyone but themselves; pictures stay visible ([D-2026-11-11-11](../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-11)).

### States

- **Not found:** an unknown match id shows the heading **Game not found** and the notice “No game has the ID `<id>`. Check the link and try again.”, with the back button.
- **Partial, fun, not ranked:** the game row's note and chip, as above.
- **Expired session page:** the session title is plain text.

### Court tap elsewhere

Since November 25, 2026, tapping a game court anywhere in ROTRA Player (Recent games on a profile, the Games page, the session matches dialog from Recent sessions or the Sessions page, and the courts on this page's **Before this game**) opens that game's match page. The faces and the share icon keep their own actions. The tap target is the whole court box, the score box and format pill included; a light inner outline shows on hover and an accent outline on keyboard focus. Its accessible name is “Open the match page: <the court's description>”.

# Design System Strategy: High-Performance Athleticism

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"Kinetic Precision."** 

Unlike standard sports apps that rely on heavy textures and aggressive slants, this system treats badminton management as a high-stakes flight instrument. It prioritizes the "Status-First" hierarchy, where data density is not a flaw but a feature for the power user. The visual language moves away from generic "app-like" containers toward a high-end, editorial dashboard feel. We achieve this through intentional asymmetry, tight typography, and a "No-Line" philosophy that uses light and depth—rather than borders—to define the field of play.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, nocturnal foundation, allowing the Neon Green primary accent to act as a high-visibility signal for action and life.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Structural separation must be achieved through **background color shifts** or **tonal transitions**.
- Use `surface_container_lowest` (#0E0E0F) for the deep background.
- Use `surface_container` (#201F20) for primary content blocks.
- Transitioning between these values creates a "natural" boundary that feels sophisticated and integrated.

### Surface Hierarchy & Nesting
Think of the UI as a series of stacked, machined components. 
- **Base Level:** `surface_dim` (#131314).
- **Secondary Level:** `surface_container_low` (#1C1B1C) for grouping related items (e.g., a list of players).
- **Action Level:** `surface_container_high` (#2A2A2B) for interactive cards or active court states.

### The "Glass & Gradient" Rule
To elevate the primary accent beyond a flat fill, use a subtle **Inner Glow Gradient**. Main CTAs should transition from `primary` (#F1FFEF) at the top-left to `primary_container` (#00FF88) at the bottom-right. Floating modals or notifications should employ a `backdrop-blur` of 12px-16px to create a "Frosted Graphite" effect, ensuring the app feels deep and layered.

---

## 3. Typography
We utilize **Inter** (as specified in the scale) with a focus on high-density readability. 

- **The Editorial Edge:** All `display` and `headline` styles must use a tight tracking of `-0.02em` to `-0.05em`. This gives the text a "locked-in" feel common in premium technical journals.
- **Labels as Signals:** All `label-md` and `label-sm` elements must be **Uppercase**. This transforms metadata (like player status or court numbers) into clear, authoritative indicators.
- **Hierarchy:** 
    - `headline-lg` (2rem) is reserved for session titles and high-level totals.
    - `title-sm` (1rem) is the workhorse for player names and court headers.
    - `label-sm` (0.6875rem) is used exclusively for status pills and micro-data.

---

## 4. Elevation & Depth
In this system, depth is a function of light, not shadow.

### The Layering Principle
Avoid "Drop Shadows" on standard cards. Instead, use **Tonal Layering**. Place a `surface_container_highest` (#353436) card on a `surface_container_low` (#1C1B1C) background. The contrast in value provides the necessary lift.

### Ambient Shadows & Glows
For active states (e.g., a court currently in a match), use an **Ambient Glow**:
- Shadow: 0px 8px 24px
- Color: `primary_container` (#00FF88) at 12% opacity.
- This mimics the neon lighting of a high-end arena.

### The "Ghost Border" Fallback
If an edge requires absolute definition (e.g., on a score input), use a **Ghost Border**: 1.5px stroke using `outline_variant` at 20% opacity. Never use 100% opaque outlines.

---

## 5. Components

### Primary / Secondary / Destructive Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`). Radius: `0.5rem` (8px). Text: `on_primary_fixed` (#00210C) Uppercase.
- **Secondary:** Ghost style. 1.5px stroke of `outline`. No background fill.
- **Destructive:** `error_container` (#93000A) background with `on_error_container` (#FFDAD6) text.

### Court Cards (The Signature Component)
- **Structure:** No dividers. Use `surface_container_high` for the card body. 
- **Header:** Use `label-md` Uppercase for court numbers, aligned top-left.
- **Scoring Grid:** Use a high-contrast `surface_bright` (#3A393A) for the active score box to make it "pop" from the card.
- **Status Badge:** A 1.5px "Ghost Border" pill containing Uppercase text.

### Player Rows & Status Pills
- **Spacing:** Use `spacing-4` (0.9rem) between rows. Use vertical white space instead of lines.
- **Status Pills:** 
    - *Playing:* Background `primary_container` (#00FF88), text `on_primary_fixed`.
    - *Waiting:* Background `secondary_container` (#454654), text `on_secondary_container`.
    - *Ready:* Background `surface_bright`, text `on_surface`.

### Bottom Navigation Bar
- **Style:** Glassmorphic. Background: `surface` at 80% opacity with a 20px blur. 
- **Active State:** A 2px horizontal line (the "kinetic spark") sitting at the *top* of the active icon, colored `primary_fixed` (#60FF99).

### Toast & Notifications
- Use `surface_container_highest` with a 1.5px `primary` stroke. 
- Positioning should be "Asymmetric"—aligned to the bottom-right rather than centered—to maintain the editorial aesthetic.

---

## 6. Do's and Don'ts

### Do
- **Do** use `spacing-1.5` (0.3rem) for tight groupings of related data.
- **Do** use the `primary_fixed_dim` color for icons to ensure they feel "active" even when not highlighted.
- **Do** maintain a "Status-First" layout: the most important data point (e.g., "Court 4 - Live") should always be the largest typographic element in its container.

### Don't
- **Don't** use pure black (#000000). Always use the `surface_container_lowest` (#0E0E0F) to keep the dark mode feeling "premium" and soft.
- **Don't** use standard 1px lines to separate list items; let the `spacing-px` or color shifts do the work.
- **Don't** use lowercase for buttons or status labels. It softens the brand's "Precise" and "Fast" personality.
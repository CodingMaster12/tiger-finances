---
name: Tiger Finances
description: Dark, gold-led equity research with quiet colour accents. Eye-catching on the home page, calm on data pages.
colors:
  ink: "#08050f"
  surface: "#130f26"
  surface-raised: "#1b1639"
  border: "#2c2557"
  border-strong: "#433a7d"
  text: "#f6f3ff"
  text-muted: "#c4bcdf"
  text-subtle: "#9d94c0"
  gold: "#ffc247"
  gold-hover: "#ffd36f"
  gold-soft: "#33260f"
  on-gold: "#1a1004"
  orange: "#ff8a3d"
  violet: "#a584ff"
  violet-soft: "#1f1545"
  cyan: "#2fd6ff"
  cyan-soft: "#0d2a3a"
  emerald: "#3ee0a0"
  emerald-soft: "#0d2f27"
  pink: "#ff4f9a"
  positive: "#4fe3a1"
  negative: "#ff6b7d"
  warning: "#ffa53d"
typography:
  display:
    fontFamily: "Jost, Inter, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 6.2vw, 5.4rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "0.015em"
  headline:
    fontFamily: "Jost, Inter, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.01em"
  title:
    fontFamily: "Jost, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Jost, Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0.2em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 24px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
  tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Tiger Finances

> **Dial setting: 0.6.** The owner defined a scale where 0 is the first gold-on-black pass and 1 is the full bright pass, then asked for about 0.6. Keep it there. Do not make the interface louder or flatter without being asked.

## Overview

**Creative North Star: "The Illuminated Ledger"** *(chosen by the design agent from the owner's brief; not yet confirmed by the owner)*

Financial records, lit from within. A dark ink-violet ground carries gold as the light source, with violet, cyan and emerald as quiet supporting tones. The system should feel precise and trustworthy first and eye-catching second: the home page is allowed motion and atmosphere, while data pages (Numbers, tables, account) stay calm, dense and readable. Every figure is traceable, so the interface never decorates numbers; decoration lives around them.

The owner's brief, in their words: dark, gold with a hint of orange, "professional but eye-catching and flashy", gradient backgrounds, motion imagery on the home page, less text, numbers on their own tab, a diverse set of highlight colours. Confirmed visual rejection: "just gold and black" (too boring) and the bright 1.0 pass (too flashy).

**Key Characteristics:**
- Dark only. No light theme and no theme toggle.
- Gold-led. One main colour, used for the primary action and the current page.
- Colour as accents, never as noise: violet, cyan and emerald appear in chips, art and highlights, rarely together at full strength.
- Motion on the home page only, slow and soft; everything stops under `prefers-reduced-motion`.
- Data pages are quiet: no glow, no gradients behind numbers.

## Colors

A warm-gold anchor on a deep ink-violet ground, with cool accents.

### Primary
- **Lantern Gold** (`#ffc247`): primary actions, the current-page underline, key links, the logo mark. Hover `#ffd36f`. Text on gold is **Ink on Gold** (`#1a1004`, 11.7:1).
- **Ember Orange** (`#ff8a3d`): the second stop of the gold gradient (`--grad-hot`: `#ffc247` to `#ff9f3d`) and the glow behind the cube. Never a flat UI colour on its own except small warm highlights.

### Secondary
- **Dusk Violet** (`#a584ff`): chips, the "Coming soon" state, the compare illustration, selection of calm secondary highlights.
- **Signal Cyan** (`#2fd6ff`): chips, one skyline colour, the Reported/upd markers, the second company in the picker.
- **Ledger Emerald** (`#3ee0a0`): "Live" state, coverage "Available" dots, confirmation marks.

### Tertiary
- **Hot Pink** (`#ff4f9a`): token kept for the third company colour and rare accents. Not used in gradients or the home scene.

### Neutral
- **Ink** (`#08050f`): page ground. The fixed backdrop adds four faint colour pools above it.
- **Night Surface** (`#130f26`) and **Raised Surface** (`#1b1639`): cards, tables, inputs; hover rows.
- **Violet Border** (`#2c2557`) and **Strong Border** (`#433a7d`): hairlines and control outlines.
- **Moon Text** (`#f6f3ff`), **Muted** (`#c4bcdf`), **Subtle** (`#9d94c0`): body, secondary and tertiary text (all at least 6:1 on every surface).

### Meaning
- **Positive** `#4fe3a1`, **Negative** `#ff6b7d`, **Warning** `#ffa53d`. Always paired with an arrow, a sign or a label.

### Named Rules
**The Gold Is Light Rule.** Gold marks what is active or primary. If everything is gold, nothing is.
**The Never-In-Text Rule.** Gradients fill backgrounds, buttons and banners. They never colour text.
**The Colour Is Not Meaning Rule.** Up/down, calculated/reported and available/missing are always conveyed by an icon, sign or word as well as colour.

## Typography

**Display Font:** Jost (with Inter, system-ui)
**Body Font:** Inter (with system-ui)

**Character:** Jost is geometric and wide-spaced, taken from the owner's reference image; Inter keeps numbers and body text neutral and legible. Numbers always use tabular figures (`.num`).

### Hierarchy
- **Display** (600, `clamp(2.6rem, 6.2vw, 5.4rem)`, 1.04, uppercase, tracking 0.015em): the home headline only. Maximum 6rem.
- **Headline** (600, 2.25rem to 3rem, tracking 0.01em, normal case): page titles (Numbers, 404).
- **Title** (600, 1.5rem, normal case): tile and banner titles.
- **Body** (400, 14px, 1.5): everything else; 16px for the home subline. Keep measure to 65-75ch.
- **Label** (500, 12-13px, tracking 0.16-0.2em, uppercase): navigation, panel titles, table headers. Not a kicker above headings.

### Named Rules
**The No-Kicker Rule.** Do not put a small label above a heading. The heading carries its own weight.

## Layout

A centred column, `max-width: 80rem` (7xl), 16px side padding rising to 24px at 640px. The home page stacks sections with 64px (96px on large screens) between them. Data pages use 32px between blocks. Content grids collapse to one column below 768px; a second navigation row replaces the hidden header nav on phones. Tables scroll horizontally inside their own region, with the label column sticky. Every page has the same header and footer.

## Elevation & Depth

Hybrid: tonal layering for most surfaces (ground, surface, raised surface), real offset shadows for popovers and dialogs, and a single soft glow for the primary action.

### Shadow Vocabulary
- **Small** (`0 1px 2px rgb(0 0 0 / 0.5)`): resting cards.
- **Medium** (`0 10px 30px rgb(0 0 0 / 0.55)`): menus, dialogs.
- **Glow** (`0 0 0 1px rgb(255 194 71 / 0.22), 0 4px 14px rgb(255 138 61 / 0.14)`): primary buttons only. A zero-offset coloured halo anywhere else is decoration and not allowed.

### Named Rules
**The One Glow Rule.** Glow belongs to the primary action and the home scene. Data views never glow.

## Shapes

Soft but not round. Controls and tables use 10px (`--radius-md`); tiles and banners 12-16px; chips and badges are fully rounded pills. Borders are 1px hairlines in the violet border colour; no coloured side-stripes on cards.

## Components

### Buttons
- **Shape:** 10px radius, 44px tall (40px default in forms), semibold.
- **Primary:** gold-to-orange fill (`--grad-hot`), Ink on Gold text, the glow shadow. Hover brightens slightly; on the home page it lifts 2px.
- **Secondary:** Night Surface fill, 1px strong border, Moon Text; hover turns the border gold and the text gold.
- **Disabled:** 50% opacity, no glow. **Danger:** negative fill with ink text.

### Chips
- Fully rounded pills with a soft tinted fill and matching text: gold = account/primary, violet = coming soon/secondary, cyan = info, emerald = live/available. Text is semibold 12px.

### Cards / Containers
- **Tiles:** 12px radius, 1px border, a soft top-left tint (about 40% of the accent's soft colour fading to surface), animated illustration above, normal-case title, one line of text, one link. Hover lifts 4px.
- **Data panels:** Night Surface, 10px radius, hairline border, no tint, no glow.

### Inputs / Fields
- Night Surface fill, 1px border, 10px radius. Hover strengthens the border; focus turns it gold with a soft gold ring. Error uses the negative colour plus a message. Placeholder uses Subtle text.

### Navigation
- Jost 13px uppercase, tracking 0.16em. Current page is Moon Text with a 2px gold-gradient underline and `aria-current="page"`; others are Muted and turn gold on hover. A second row appears under the header on phones. The footer repeats all links.

### Company Search (combobox)
- Night Surface field, 10px radius, magnifier icon at left, spinner at right while searching; 44-48px tall on the home page, 36px in the header. A results panel (Night Surface, hairline border, medium shadow) lists company name plus tickers and exchange; the highlighted row uses Raised Surface with the name in Lantern Gold (no side stripe). States: searching, no match (names the Canada limit), error (negative text). Keyboard: arrows, Enter, Escape; results are announced politely. Works without JavaScript by submitting to `/search`.

### Hero Scene (signature)
- An isometric SVG skyline of translucent pillars in gold, cyan and violet, a floating gold-to-orange cube with two slow orbiting rings, a handful of rising sparks, and a faint floor grid, over soft drifting colour blobs. It nudges with the pointer. It is decorative only: `aria-hidden`, no labels, no numbers, and it must never resemble a chart.

### Numbers Table (signature)
- Right-aligned tabular figures, sticky label column, a period header like "FY Sep 2026". Each figure's title and screen-reader text give its filing, date and accession. Calculated values carry a small "calc" chip, values changed by a later filing carry "upd", missing values show an em dash.

## Do's and Don'ts

### Do:
- **Do** keep the whole product at the 0.6 setting described at the top.
- **Do** use gold for the primary action on each screen, and only one gold-filled button per view when possible.
- **Do** show an arrow and a +/- sign on every change; colour is a hint.
- **Do** keep text at least 4.5:1 against its background (all current tokens pass).
- **Do** keep home-page motion slow, soft and fully stopped under `prefers-reduced-motion`.
- **Do** keep numbers off decorative surfaces; real figures appear only on data pages, with their source.

### Don't:
- **Don't** use gradient text, glassy blur as decoration, or coloured left-borders on cards.
- **Don't** add pink gradients or neon glows; that was the rejected 1.0 pass.
- **Don't** put a number, ticker or chart-like graphic on the home page unless it is real and sourced.
- **Don't** add a light theme or a theme toggle without being asked.
- **Don't** add a kicker label above a heading, or section numbers.
- **Don't** make same-size icon-heading-text card grids the page structure; vary size and give each tile its own illustration.
- **Don't** let a decorative scene or animation run for people who prefer reduced motion.

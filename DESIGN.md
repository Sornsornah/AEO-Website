---
name: UpdateCentral
description: The AI Enablement Office's internal showcase, learning log, and C-suite reporting platform.
colors:
  page-base: "#FDFDFD"
  card-surface: "#FFFFFF"
  raised-surface: "#F4F4F6"
  warm-surface: "#FAF7F3"
  warm-card: "#F1EBE3"
  ink: "#070E1D"
  ink-dark: "#141C2E"
  ink-muted: "#64748B"
  signal-blue: "#3B82F6"
  signal-blue-fg: "#F8FAFC"
  editorial-orange: "#EA580C"
  slate-border: "#E2E8F0"
  destructive: "#EF4444"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.025em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.signal-blue-fg}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#2563EB"
    textColor: "{colors.signal-blue-fg}"
  button-secondary:
    backgroundColor: "{colors.raised-surface}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.raised-surface}"
    textColor: "{colors.ink}"
  badge-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.signal-blue-fg}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-secondary:
    backgroundColor: "{colors.raised-surface}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  nav-link-active:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "6px 12px"
---

# Design System: UpdateCentral

## 1. Overview

**Creative North Star: "The Considered Press"**

UpdateCentral is an internal publisher, not an intranet. The AI Enablement Office uses it to make their work visible — products they've built, things they've learned, results they've delivered. The design's job is to make that work look as considered as it is. Every screen should feel like something a thoughtful PM produced, not something IT provisioned.

The aesthetic reference is Notion: clean typographic hierarchy, generous whitespace, surfaces that recede so content can lead. The palette is cool-neutral with two deliberate accent voices — signal blue for interaction, editorial orange for content discovery. Warm surface tokens appear in reading-heavy contexts (blog detail, update detail) to add a quiet sense of place without decorating the UI.

This system rejects corporate intranet conventions (gray sidebars, accordion-heavy navigation, icon-label grids), SaaS landing clichés (hero blobs, feature card grids, gradient text), and the heaviness of report templates (serif body text, bordered callouts, PDF-like layout). The platform is alive and edited. Design should feel the same.

**Key Characteristics:**
- Flat surfaces at rest; elevation reserved for interaction and structural overlays
- Two accent voices (blue / orange) used in separate semantic roles, never combined on one element
- Pill-shaped navigation with high-contrast active state (ink bg, white text)
- System font stack — familiar, legible, weightless
- Warm surface tokens as a layer reserved for long-form reading, not decorative surface variety
- Rounded-2xl (16px) on content cards; rounded-full on interactive chips and nav links

---

## 2. Colors: The Two-Voice Palette

A cool-neutral base with two deliberate accents. Neither accent appears unless it's earning its presence.

### Primary
- **Signal Blue** (#3B82F6): The single interactive voice. Every clickable affordance that isn't explicitly ghost or destructive. Primary buttons, focus rings, link text in prose, active filter state.

### Secondary
- **Editorial Orange** (#EA580C): The content-discovery voice. Blog post hover states, CTA links ("Read more"), featured badge accents, user avatar background. Never used on interactive controls; that role belongs to signal blue.

### Neutral
- **Near White** (#FDFDFD): Page base. The default background — slightly warmer than pure white so long pages don't feel clinical.
- **Card Surface** (#FFFFFF): Cards and popovers sit one step above the page. The contrast with #FDFDFD is intentional and subtle.
- **Raised Surface** (#F4F4F6): Inline backgrounds for muted badges, secondary buttons, disabled inputs. One step visibly above card surface.
- **Warm Surface** (#FAF7F3): Reading context backgrounds. Blog detail page, update detail — invites slower reading without straying into "kraft paper" territory.
- **Warm Card** (#F1EBE3): Cards within warm-surface contexts. Paired always with warm-surface, never used on cool-neutral pages.
- **Ink** (#070E1D): Primary text and the active nav pill background. Not pure black — it has a navy undertone that keeps it on-brand.
- **Ink Dark** (#141C2E): Secondary headings and button labels where full ink would be heavy.
- **Ink Muted** (#64748B): Supporting text, metadata, placeholder copy, ghost button labels.
- **Slate Border** (#E2E8F0): All borders. Dividers, card outlines, input strokes, separator lines.
- **Destructive** (#EF4444): Destructive actions only — delete buttons, error states.

**The Two-Voice Rule.** Signal blue speaks for interaction (buttons, links, focus states, active filters). Editorial orange speaks for content discovery (blog hover states, CTA links, featured accents). They serve different semantic purposes and never appear together on the same element. Using orange on a button, or blue on a blog card hover title, breaks the system.

**The Warm Layer Rule.** Warm surface tokens (warm-surface, warm-card) belong in reading-heavy contexts only. General UI surfaces — editor tables, admin panels, filter sidebars — stay in the cool neutral family (#FDFDFD / #FFFFFF / #F4F4F6). Mixing warm tokens into utility surfaces makes the UI feel inconsistent.

---

## 3. Typography

**Display / Body Font:** System font stack — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

No web font is loaded. The system font stack is intentional: fast, familiar, and zero-weight. It keeps the platform feeling like a well-formatted document rather than a branded product, which suits the editorial tone. The hierarchy is achieved entirely through scale and weight contrast.

**Character:** Practical and direct. No decorative pairings, no mixed-weight tricks. Weight and size do the work, spacing keeps it breathable.

### Hierarchy
- **Display** (700 weight, 1.5rem / 24px, line-height 1.2): Page-level headings. Used sparingly — one per screen at most.
- **Headline** (600 weight, 1.25rem / 20px, line-height 1.3): Section headings, blog post titles in cards.
- **Title** (600 weight, 1.125rem / 18px, line-height 1.4): Sub-section headings, update card titles, product names.
- **Body** (400 weight, 0.875rem / 14px, line-height 1.6): All prose — summaries, descriptions, update content. Max line length 65–75ch; wider lines reduce scannability on the update feed.
- **Label** (500 weight, 0.75rem / 12px, letter-spacing 0.025em): Badge text, metadata lines (date, read time), chip labels. Uppercase tracking only when combined with all-caps copy (e.g. "RESTRICTED ACCESS" banners).

**The No-Serif Rule.** The system is sans-serif only. No serif typeface as display, body, or label text — not even for the blog. The platform is a living edited site, not a printed report, and serif body text reads as the wrong medium entirely.

---

## 4. Elevation

UpdateCentral is flat by default. Surfaces at rest carry no shadow — only a border (#E2E8F0) signals containment. Elevation is earned through interaction state or structural necessity.

The three shadow steps in use:

### Shadow Vocabulary
- **Resting flat** (no shadow, border only): Cards, product tiles, input fields, update feed rows. The default. A bordered surface without shadow is correct and complete.
- **Hover lift** (`box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)`): Applied on `hover:shadow-md` — blog cards, product cards. Signals interactivity without shouting.
- **Structural overlay** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)`): Nav dropdown, select popovers, tooltip overlays. Communicates that the surface floats above the document.

**The Quiet Surface Rule.** A card without a shadow is correct at rest. Shadows appear only as a response to state (hover, focus-within) or structural layering (popovers, dropdowns). Do not add shadows to static surfaces to make them look "premium" — flat surfaces with clean borders are the premium choice here.

---

## 5. Components

### Buttons

Gently curved and confident. Not pill-shaped (that's reserved for nav and badges); not sharp-cornered (that reads as too technical).

- **Shape:** Rounded corners (6px / `rounded-md`)
- **Primary:** Signal blue (#3B82F6) background, near-white (#F8FAFC) text, 8px 16px padding. On hover: deepens to #2563EB. Focus: 2px blue ring with 2px offset.
- **Secondary:** Raised surface (#F4F4F6) background, ink-dark (#141C2E) text. On hover: border darkens to slate-300.
- **Ghost:** Transparent background, ink-muted (#64748B) text. On hover: raised-surface background, ink text.
- **Destructive:** Destructive red (#EF4444) background, white text. Used for delete and revoke actions only.
- **Icon-only:** 40×40px, rounded-md or rounded-full depending on context. Same color rules as the parent variant.

### Chips and Badges

- **Primary badge:** Signal blue background, pill shape (rounded-full), 2px 10px padding, 12px/500 text. Used for "New" update indicators, active filter pills.
- **Secondary badge:** Raised surface (#F4F4F6) background, ink-dark text. Used for "Draft" status, update counts, secondary metadata.
- **Outline tag pill:** 10px text, 2px 8px padding, slate-border border, ink-muted text, card-surface background. Used for blog post tags — deliberately quiet, not competing with the content.
- **Blog category chips:** Colored variants with matching background and foreground — orange (Thought), blue (Learning Journey), green (Field Notes), amber (Deep Dive). 10px bold uppercase with wide tracking. Applied as overlays on cover images; add `backdrop-blur-sm` when placed over photographs.
- **Featured badge:** Ink (#070E1D) background, white text, pill shape, 10px bold uppercase. The highest-status badge in the system — used once per page at most.

### Cards and Containers

- **Content card (blog):** Rounded-2xl (16px), slate-border border, card-surface (#FFFFFF) background. Hover state: border darkens to slate-300 + shadow-md lifts. Internal padding: 16px body (p-4). No nested cards.
- **Product tile:** Rounded-xl (12px), slate-border border, white background. Hover: slight shadow-sm. 20px internal padding (p-5).
- **Update feed item:** Not a card. A horizontal row — border-bottom only (slate-100), no box. Date column (128px, fixed) + content column (flexible). Hover: very faint slate-50/50 tint on the row. This pattern distinguishes the internal-facing update feed from the public-facing blog cards deliberately.
- **Standard shadcn card:** Rounded-lg (8px), border, shadow-sm. Used in editor and admin surfaces where the blog/update card shapes would be out of place.

### Inputs and Fields

- **Style:** Border-stroke (slate-border #E2E8F0), card-surface background, rounded-md (6px), 10px vertical / 12px horizontal padding.
- **Focus:** 2px signal-blue ring with 2px ring-offset. The ring color matches the primary button — consistent interaction language.
- **Placeholder:** Ink-muted (#64748B) text.
- **Disabled:** 50% opacity, cursor not-allowed. No background color change — opacity alone communicates the state clearly.
- **Label:** 14px/500 weight, ink-dark color, stacked above the input with 6px gap.

### Navigation

The nav is sticky, backdrop-blurred, and confident. It recedes visually on interior pages so the content can own the vertical space.

- **Container:** Full-width, 56px height, border-bottom (#E2E8F0), card-surface background at 95% opacity with backdrop-blur.
- **Nav links (inactive):** 14px, ink-muted (#64748B) text, rounded-full pill, 6px 12px padding. On hover: ink text + raised-surface background.
- **Nav links (active):** Ink (#070E1D) background, white text, rounded-full, same padding. The high-contrast pill is the sharpest element in the nav — it reads immediately without needing an underline or icon.
- **User avatar:** 32px circle, orange-100 background (#FFEDD5), orange-700 text (#C2410C), initials. On hover: orange-200 background.
- **Dropdown:** Rounded-xl (12px), slate-border, shadow-lg. Header section: user name in 14px/500, role in 12px ink-muted. Menu items: 14px, ink-dark, hover on slate-50.

### Update Feed Item (Signature Component)

The update feed is the C-suite view. It needs maximum information density without visual noise.

- **Layout:** Two columns — a fixed 128px date column on the left, a flexible content column on the right. Separated by 32px gap.
- **Date column:** 14px ink-muted, font-medium, top-aligned.
- **Content column:** Product badge row (colored dot + product name) → title (14px/600, ink) → summary (14px/400, ink-muted, leading-6) → highlight bullets (12px, ink-muted, 4px bullet dots in slate-300).
- **Row state:** On hover, a very faint slate-50/50 wash covers the full row. No border change, no shadow — just the tint.
- **Separation:** border-bottom (slate-100) only. No box, no card shell. This is deliberately different from the blog card grid.

---

## 6. Do's and Don'ts

### Do:
- **Do** use signal blue (#3B82F6) for all interactive controls — buttons, links, focus rings, active filter states.
- **Do** use editorial orange (#EA580C) for content-discovery signals — blog hover titles, CTA link text, featured post accents.
- **Do** use pill-shaped nav links with the high-contrast ink active state. This is the sharpest, most legible active indicator in the system.
- **Do** keep update feed items as rows (border-bottom only), not cards. The card treatment is reserved for blog and product surfaces.
- **Do** reserve warm surface tokens (#FAF7F3, #F1EBE3) for reading-heavy detail pages.
- **Do** apply rounded-2xl (16px) to blog cards and rounded-xl (12px) to product tiles. The different radii encode the register difference between editorial and catalogue.
- **Do** keep shadow-sm on cards at rest — only promote to shadow-md on hover.
- **Do** cap body prose at 65–75ch maximum line length on detail pages.
- **Do** use the system font stack as-is. Web font additions require explicit justification.

### Don't:
- **Don't** use generic HR intranet patterns: gray sidebars, accordion navigation, icon-label grids with identical tile sizes. This platform should not look like it was provisioned by IT.
- **Don't** use Confluence-style layout: cramped line-height, full-width bordered callout boxes, sidebar-heavy navigation, table-of-contents headers on every page.
- **Don't** use serif typefaces anywhere — not for display headings, not for blog body text, not as a "premium" treatment. This is not a printed report.
- **Don't** use SaaS hero-section patterns: gradient background blobs, feature-grid cards (icon + heading + text, n times), large centered CTAs on internal app pages.
- **Don't** use side-stripe borders — `border-left` or `border-right` greater than 1px as a colored accent on cards, callouts, or list items. Replace with a background tint, a leading number, or nothing.
- **Don't** use gradient text (`background-clip: text` with a gradient). Use a single solid color. Emphasis via weight or size.
- **Don't** use orange (#EA580C) on interactive controls (buttons, links in forms). That color role belongs to signal blue.
- **Don't** use blue (#3B82F6) on blog card hover titles or CTA read-more links. That color role belongs to editorial orange.
- **Don't** add persistent shadows to static surfaces. A flat card with a border is the correct resting state.
- **Don't** use nested cards. A card inside a card is always the wrong structure.

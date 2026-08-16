# Anaktoria Font Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the newly-added Anaktoria font to all `font-serif`-styled text (headings and decorative paragraph copy) on the public wedding site, without touching the admin dashboard, `font-sans`, or `font-ballet` usages anywhere.

**Architecture:** A single CSS-scoped override — redeclare the shared `--font-serif` custom property's value inside a new `.guest-site` class applied only to the public site's root element, so every existing `font-serif` usage in that subtree picks up Anaktoria with zero component-level className changes.

**Tech Stack:** Tailwind CSS v4 (`@theme`, cascade layers), a local `@font-face` (OpenType file already added at `public/fonts/Anaktoria.otf`).

## Global Constraints

- No new dependencies.
- `font-sans` (Geist) is untouched everywhere.
- `font-ballet` usages are untouched everywhere.
- The admin dashboard's `font-serif` (Cormorant Garamond) stays unchanged.
- No component files other than `src/pages/LandingPage.tsx` are modified — the scoping mechanism means no other public-site component needs a className change.
- This project has no automated test framework. Verification is `npx tsc --noEmit` (for the `.tsx` change) plus running the dev server and visually confirming in a browser.

---

## Task 1: Scope Anaktoria to the public site via `--font-serif`

**Files:**
- Modify: `src/index.css`
- Modify: `src/pages/LandingPage.tsx`

**Interfaces:**
- Produces: a `.guest-site` CSS class and a `--font-anaktoria` theme token (the latter unused by any component yet, exposed for future one-off use, mirroring how every other font in this app is a named theme token).

- [ ] **Step 1: Add the `@font-face` declaration and the `--font-anaktoria` theme token**

In `src/index.css`, find:

```css
@import "tailwindcss";

@theme {
  --font-serif: "Cormorant Garamond", serif;
  --font-ballet: "Ballet", cursive;

  --color-wedding-gold: #C5A059;
  --color-wedding-cream: #FDFBF7;
  --color-wedding-dark: #1A1A1A;
}
```

Replace with:

```css
@import "tailwindcss";

/* Anaktoria is a local OpenType file (no Google Fonts equivalent), served
   from public/fonts/ — unlike Ballet and Cormorant Garamond below, which
   load via the <link> tags in index.html. */
@font-face {
  font-family: "Anaktoria";
  src: url("/fonts/Anaktoria.otf") format("opentype");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@theme {
  --font-serif: "Cormorant Garamond", serif;
  --font-ballet: "Ballet", cursive;
  --font-anaktoria: "Anaktoria", serif;

  --color-wedding-gold: #C5A059;
  --color-wedding-cream: #FDFBF7;
  --color-wedding-dark: #1A1A1A;
}
```

- [ ] **Step 2: Add the scoped `--font-serif` override**

In the same file, find:

```css
@layer base {
  body {
    @apply bg-wedding-cream text-wedding-dark font-sans;
  }
```

Replace with:

```css
/* Scopes the Anaktoria swap to the public-facing guest site only (see the
   `guest-site` class on LandingPage.tsx's root element) by overriding the
   shared --font-serif custom property's value within this class. Every
   element already styled with `font-serif` — via the h1-h6 base rule
   below, or an explicit `font-serif` utility on decorative paragraph copy
   — inherits this overridden value automatically, with no component-level
   className changes needed anywhere else. The admin dashboard never
   receives this class, so it keeps resolving --font-serif to Cormorant
   Garamond. `font-ballet` usages are unaffected either way: Tailwind v4's
   utilities layer already overrides the `@layer base` rule below
   regardless of what --font-serif itself resolves to. */
.guest-site {
  --font-serif: "Anaktoria", serif;
}

@layer base {
  body {
    @apply bg-wedding-cream text-wedding-dark font-sans;
  }
```

- [ ] **Step 3: Apply the scoping class to the public site's root element**

In `src/pages/LandingPage.tsx`, find:

```tsx
    <div className="min-h-screen bg-wedding-cream relative">
```

Replace with:

```tsx
    <div className="guest-site min-h-screen bg-wedding-cream relative">
```

This is the single root element of `LandingPage`, which wraps the hero section and every imported section component (`VenueSection`, `EntourageSection`, `DressCodeSection`, `ProgramSection`, `GiftsSection`, `FAQSection`, `RSVPSection`) — the entire public-facing route (`/`) — so this one class addition is sufficient to cover the whole guest experience.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean.

Run: `npm run dev`, visit `/` in a browser.
- Confirm headings and decorative italic paragraph copy (e.g. the hero blessing text under "Israel & Deborah", the Venue/Programme/FAQ body copy, the RSVP confirmation text) render in Anaktoria, not Cormorant Garamond.
- Confirm the large cursive section titles ("Venue", "Programme", "Entourage", "Dress Code", "Gifts", "Frequently Asked Questions", the guest's nickname on the RSVP card) still render in Ballet, unaffected.
- Confirm small uppercase tracked labels and buttons (e.g. "Ang kasalan ni", the RSVP yes/no buttons, the date/time under the countdown) are still Geist, unaffected.
- Open the browser's network tab and confirm `/fonts/Anaktoria.otf` loads with a 200 status, not a 404.
- Log in to `/admin` and visit any admin page (e.g. the dashboard or Table Arrangement) — confirm headings, dialog titles, and card titles there still render in Cormorant Garamond, completely unaffected by this change.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/pages/LandingPage.tsx
git commit -m "feat: apply Anaktoria font to public site heading/decorative text"
```

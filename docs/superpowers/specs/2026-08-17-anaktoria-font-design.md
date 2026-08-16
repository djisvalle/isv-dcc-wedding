# Apply Anaktoria Font to Public Site Serif Text

## Context

A new display font file, `Anaktoria.otf`, was added to `public/fonts/`. The public wedding site currently uses two theme fonts: `--font-serif` ("Cormorant Garamond", used as the default for all headings via a `@layer base` rule, and explicitly on decorative italic paragraph copy throughout the site) and `--font-ballet` ("Ballet", a cursive script used explicitly on the large section titles like "Venue", "Programme", "Gifts"). Body/UI text (labels, buttons, small uppercase tracking text) uses `--font-sans` (Geist).

`font-serif` is also used throughout the admin dashboard (page titles, dialog titles, table cards) via the same shared CSS variable.

## Goal

Replace `font-serif` (Cormorant Garamond) with Anaktoria everywhere it's used on the **public-facing guest site only** — headings and the decorative serif paragraph copy that shares that styling tier. Leave `font-ballet` usages untouched (they already win over the inherited serif style). Leave the admin dashboard's `font-serif` (Cormorant Garamond) untouched. Leave `font-sans` (Geist) untouched everywhere.

## Approach

Rather than editing every component that uses `font-serif` (headings and paragraphs across 8+ files under `src/components/shared/`), scope the change at the CSS level: `font-serif` already resolves to a single global `--font-serif` custom property. Override that property's *value* within a wrapper class applied only to the public site's root element, so every element already styled with `font-serif` — via the `h1`–`h6` base-layer rule or an explicit `font-serif` utility — picks up Anaktoria automatically inside that scope, while the admin dashboard (which never receives the wrapper class) keeps resolving `--font-serif` to Cormorant Garamond.

This works because Tailwind v4's cascade layers put base-layer rules (like the `h1..h6 { font-serif }` default) below the utilities layer, so an explicit `font-ballet` utility on any given element already overrides the inherited serif style regardless of what `--font-serif` itself resolves to — no interaction with this change.

## Changes

**`src/index.css`:**
1. Add an `@font-face` declaration for Anaktoria, pointing at `/fonts/Anaktoria.otf` (served from `public/`), `font-display: swap`.
2. Add `--font-anaktoria: "Anaktoria", serif;` to the existing `@theme` block, alongside `--font-serif`/`--font-ballet` — gives a `font-anaktoria` utility class for any future one-off explicit use, consistent with how every other font in this app is exposed as a named theme token.
3. Add a new rule scoping the override: a `.guest-site` class that redeclares `--font-serif: "Anaktoria", serif;`. Custom properties cascade to descendants, so this reaches every nested `font-serif` usage without touching component code.

**`src/pages/LandingPage.tsx`:**
- Add `guest-site` to the existing root `<div className="min-h-screen bg-wedding-cream relative">` — this single component is the entire public-facing route (`/`), wrapping the hero section and every imported section component (Venue, Entourage, Dress Code, Programme, Gifts, FAQ, RSVP), so one class addition covers the whole guest experience.

No other files change. No component-level className edits.

## Non-goals

- `font-sans` (Geist) is untouched everywhere — buttons, labels, small uppercase tracking text keep their current font.
- The admin dashboard's headings/dialogs/table cards keep Cormorant Garamond.
- `font-ballet` usages are untouched.
- No change to font loading strategy for the existing Google-Fonts-based fonts (Ballet, Cormorant Garamond) or the `@fontsource-variable/geist` package.

## Testing notes

- No automated test framework exists in this project. Verify manually: run the dev server, load `/`, confirm headings and decorative paragraphs (e.g. the hero blessing text, Venue/Programme/FAQ body copy) render in Anaktoria; confirm the large cursive section titles ("Venue", "Programme", "Entourage", "Dress Code", "Gifts", "Frequently Asked Questions") still render in Ballet; confirm small uppercase label text and buttons are unaffected (still Geist).
- Load an admin page (e.g. `/admin` after logging in) and confirm headings there still render in Cormorant Garamond, unaffected.
- Confirm the font file actually loads (no 404 in the network tab for `/fonts/Anaktoria.otf`) and that `Anaktoria.otf` (an OpenType font) is a valid format for browser `@font-face` (it is — OTF is universally supported).

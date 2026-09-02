# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Responsive design

Always build and verify UI mobile-first: design for small phones first, then
scale up to tablets and desktop, rather than designing for desktop and
shrinking down.

Check responsiveness across all three tiers, not just one representative
size per tier:
- **Phones** — check both a small/short phone (e.g. iPhone SE, 375x667) and
  a larger/taller one (e.g. iPhone Pro Max, 430x932). Aspect ratio varies a
  lot across phones; a crop or layout tuned to one phone's aspect can break
  on another (e.g. object-position cropping from the wrong edge once the
  viewport's aspect ratio no longer matches what was tuned for).
- **Tablets** — check both portrait and landscape, e.g. iPad Mini (768x1024).
- **Desktop** — check a standard laptop/desktop width, e.g. 1440x900.

When a change touches layout, images, or crops, verify it visually (e.g. via
the Playwright MCP tools) at representative sizes in each tier before
considering the work done — don't rely on a single viewport screenshot.

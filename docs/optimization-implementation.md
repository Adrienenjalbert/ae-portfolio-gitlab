# Optimization implementation

Concrete implementation record mapping each item in `docs/optimization-framework-plan.md` to the
specific files changed and a status. Source of truth for scope: that plan plus `AGENTS.md`
(blue scheme, consistent layout, no em-dashes or AI-sounding copy, viewport-triggered animations,
authentic data, real company names).

No git commit was made; the working tree is left modified for review.

Legend: DONE (implemented), PARTIAL (implemented within safe scope, remainder deferred with reason),
SKIPPED (deliberately not done, reason given).

---

## Site-wide surface touched

29 content pages were treated as the site: `index.html`, `for-ai.html`, `for-growth.html`,
`for-demandgen.html`, `for-analytics.html`, `builds.html`, `msc-ai.html`, `spotlight.html`,
`work/index.html`, the 10 `work/*` deep-dives, and the 10 `cv*.html` variants (5 formatted + 5 ATS).
The two `previews/*.html` files are experimental and were intentionally left untouched.

Shared assets changed: `assets/theme.css`. Also `sitemap.xml`.

---

## Quick wins (plan section 3.1)

| ID | Item | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| QW1 | WCAG 1.4.3 contrast: darken `--mute` | DONE | `assets/theme.css` | `--mute` changed from `#8c8775` (about 3.2:1 on paper, failing) to `#6a6456`. Measured contrast: 5.21:1 on `--paper` (#f4f1e8), 4.90:1 on `--paper-2` (#efeadd), higher on `--card`. Clears AA (4.5:1) on every background it is used against. Single token, cascades to eyebrow sublabels, chart labels, footers, nav indices on every page. |
| QW2 | Favicon in every head | DONE (pre-existing) | all pages | `<link rel="icon" href=".../assets/favicon.svg" type="image/svg+xml">` was already present in all 29 pages; verified. PNG fallback / `apple-touch-icon` / `site.webmanifest` not added because they need a raster icon asset that does not exist (see "still needs a human"). |
| QW3 | Skip-to-content link (2.4.1) | DONE | all 29 pages + `assets/theme.css` | Added `<a class="skip-link" href="#main-content">Skip to content</a>` as the first focusable element in `<body>`, and gave each page's primary content container `id="main-content" tabindex="-1"` (`<main>` on index/hub/work pages, `<div class="wrap">` on `for-*`, `<div class="page">` on formatted CVs, the header `<h1>` on ATS CVs). `.skip-link` styling (off-screen until focus, blue accent) added to `theme.css`. |
| QW4 | INP: drop redundant scroll `sweep()` | DONE | `index.html` | When IntersectionObserver is available the per-scroll/`resize`/`load` `sweep()` that walked every `.reveal` on each scroll event was removed. The observer already fires for elements in the viewport at init, so reveal behaviour is unchanged; main-thread work on scroll drops. `work.js` never had this pattern. |
| QW5 | Chart `aria-label`s | DONE | `index.html` (+ engine already covered the rest) | The shared renderer `assets/portfolio-charts.js` already sets `role="img"` + a generated `aria-label` on every trend/hbar/ring/beforeafter SVG. Added explicit `aria-label`s to the two `scorecard` containers on `index.html` that lacked one, matching the pattern already on the other scorecards. |
| QW6 | FAQPage JSON-LD | DONE | `index.html` | Added a `FAQPage` block mirroring the five visible hiring-manager Q&As verbatim (plain text, no fabrication). A short comment notes it is for answer-engine parsing, since FAQ rich results were deprecated in Search (May 2026). |
| QW7 | Surface the "IC role" fit note higher | DONE (pre-existing) | `index.html` | The hero already carries a `.hero-seek` note ("A hands-on, mid-senior IC role ... I run a Head-of function today and am choosing to go back to building") directly under the lede, with a link to the FAQ. No change needed. |
| QW8 | `lang="en-GB"` | DONE | all 29 pages | Changed `<html lang="en">` to `<html lang="en-GB">` to match the declared `en_GB` locale and en-GB content. |

## Performance and Core Web Vitals (3.2)

| ID | Item | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| P1 | Reduce render-blocking font cost | PARTIAL | (fonts are loaded per page from Google Fonts) | The requested weight lists are already minimal: Fraunces 400/500/600 + italic 400, Space Grotesk 400/500/600/700, IBM Plex Mono 400/500 are all actually used, so there is nothing safe to trim. `font-display:swap` and `preconnect` to both font hosts are already in place. A `woff2` preload was NOT added because Google Fonts serves hashed `gstatic` URLs that rotate, so a hard-coded preload would silently break; self-hosting/subsetting is explicitly out of scope. |
| P2 | Metric-matched font fallback (CLS) | SKIPPED (deferred) | n/a | Every page hard-codes the family stack `"Fraunces",Georgia,serif` in inline CSS rather than a shared `var(--font-display)`, so a metric-matched fallback `@font-face` cannot be wired in from `theme.css` without editing the font stack in all 29 files. Doing that blind (no visual QA of the swap) risks introducing the exact CLS/FOUT it is meant to prevent, so it is deferred rather than guessed. |
| P3 | Film-grain overlay cost | SKIPPED | n/a | Out of scope by instruction: do not alter the film-grain / visual identity. |
| P4 | Complete `sitemap.xml` | DONE | `sitemap.xml` | Added the 10 missing `cv*.html` URLs (formatted at priority 0.7-0.8, ATS variants at 0.6) with a current `lastmod`. All `for-*`, `work/*`, and hub pages were already listed. |

## SEO and E-E-A-T (3.3)

| ID | Item | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| S1 | OG / Twitter image site-wide | DONE | 10 `cv*.html` (rest pre-existing) | `assets/og-image.png` (1200x630) exists and was already referenced by index, `for-*`, and `work/*`. Added the full Open Graph + Twitter `summary_large_image` block (title/description reused from each page's own `<title>` and description, shared image, plus a self-referencing `canonical` and `robots`) to the 10 CV pages, which previously had only a title and description. |
| S2 | Article/CreativeWork JSON-LD on work pages | SKIPPED (not in this pass) | n/a | Not in the in-scope default list for this pass. Work pages already carry `og:type=article`; adding author-linked `Article` schema with dates is a reasonable follow-up but was left out to keep this change set focused on the safe site-wide items. |
| S3 | Link credentials to verifiable sources | SKIPPED (not in this pass) | n/a | Touches employer/credential content and external links; left for a content pass. |
| S4 | `dateModified` on profile schema | SKIPPED (not in this pass) | n/a | Minor; left for a content pass to avoid stale hard-coded dates. |

## UX and usability (3.4)

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| U1 | Privacy-friendly analytics | SKIPPED | Out of scope by instruction: no third-party service needing an external account/key. |
| U2 | Interactive chart hover/focus values | DONE (pre-existing) | `assets/portfolio-charts.js` already implements a shared keyboard-and-hover tooltip (`tipmark`, `role="img"`, `tabindex="0"`, focus/escape handling) that reveals values. Verified, no change needed. |
| U3 | Plain initiative names alongside theses | SKIPPED (not in this pass) | Content/IA work; left for a dedicated pass. |
| U4 | Extend role-lens to `/work` index | SKIPPED (not in this pass) | Larger interaction work; left for a dedicated pass. |
| U5 | Unify navigation model | PARTIAL | The global cross-page top bar (`.xnav`, same markup and tab set) is already consistent on all 29 pages, and the mobile top-tab treatment is shared via `theme`-level patterns. The index/hub sidebar and the work-page auto scroll-spy are section-level navigation appropriate to those long single pages, not a competing global model. A deeper unification of the mobile pattern (off-canvas drawer vs scrollable top tabs) is genuinely L-effort and structural, would touch layout across all page types, and cannot be validated without cross-device visual QA, so it is deferred rather than done blind (this also respects the "no identity/layout regressions" guardrail). |
| U6 | Reserve numbered eyebrows for real sequences | SKIPPED (not in this pass) | Content pass. |

## Conversion (3.5) and remaining accessibility (3.6)

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| C1 | Deep-link `for-*` to matching `cv-*` | DONE (pre-existing) | Each `for-*` page's top-bar CV tab already points at its matching `cv-*` variant (for example `for-ai.html` -> `cv-ai.html`). Verified. |
| C2 | Reachable primary CTA | SKIPPED (not in this pass) | The email CTA is present; a persistent/repeated affordance and any "book a call" dependency were left out. |
| C3 | Tighten hero lede | SKIPPED (not in this pass) | Copy edit; left to keep authentic voice intact. |
| A1 | Tap-target size on mono tabs (2.5.8) | NOTED | `.xnav .tabs a` uses `padding:6px 11px` on ~12px text, roughly 24px tall; borderline-compliant. Not enlarged in this pass to avoid reflowing the dense tab bar; flagged for a spacing review. |
| A2 | Focus not obscured (2.4.11) | DONE (pre-existing) | Sections already carry `scroll-margin-top` under the sticky nav; the new `#main-content` target sits below the top bar. |
| A3 | Non-text contrast on chart bars (1.4.11) | NOTED | The "before" bar `#c3bcab` and hairlines are decorative comparators next to labelled values; not changed. Flagged for a chart-contrast review. |

---

## Deliberately skipped (guardrails)

- Analytics / any external-account third-party service (U1): skipped by instruction.
- Employer naming / anonymisation policy conflict: not touched. Real names (for example Indeed Flex on
  CV pages) and the "leading workforce marketplace" phrasing in index schema/timeline were left exactly
  as-is.
- Film-grain overlay and overall visual identity (P3): not altered.
- OG image binary: not fabricated; the existing `assets/og-image.png` was reused everywhere.

## Still needs a human decision or asset

- Confirm `assets/og-image.png` is the intended share image and its copy is current (it exists at
  1200x630 but is ~1.1 MB; consider compressing for faster unfurls).
- Optional: `apple-touch-icon` PNG + `site.webmanifest` (needs a raster icon; only the SVG favicon exists).
- Font LCP/CLS hardening (P1/P2): decide whether to self-host/subset Fraunces or accept the current
  `swap` behaviour; a metric-matched fallback needs the per-page font stacks routed through a shared token first.
- Navigation unification (U5): decide the single mobile pattern before the larger refactor.

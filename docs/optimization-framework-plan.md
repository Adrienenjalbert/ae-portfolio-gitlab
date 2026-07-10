# Optimization framework plan

Research-backed, prioritized plan for optimizing the portfolio site against well-established
web-quality frameworks. This is a written plan only. No site HTML, CSS, or JS was changed to
produce it. It builds on the two existing audits (`docs/portfolio-audit.md`,
`docs/ux-design-audit.md`) and respects the preferences recorded in `AGENTS.md`
(blue accent scheme, consistent layout, natural non-AI-sounding copy with no em-dashes,
viewport-triggered animations only, authentic data, punchy ATS-friendly headlines).

Audience to optimize for: recruiters and hiring managers in performance/growth analytics and
applied-AI roles. Deployed static site (GitHub Pages), no build framework.

---

## 1. Frameworks researched

Each entry: what it is, the source, and what it prescribes that is actionable for a
recruiter-facing personal portfolio like this one.

### 1.1 Google Core Web Vitals (performance)
Google's field-measured set of three user-experience metrics, used as a page-experience signal
in Search and as a general quality bar. Current thresholds (measured at the 75th percentile of
real users, unchanged through 2026):

- **LCP** (Largest Contentful Paint, loading): Good is 2.5s or less.
- **INP** (Interaction to Next Paint, responsiveness): Good is 200ms or less. INP replaced FID on 12 March 2024.
- **CLS** (Cumulative Layout Shift, visual stability): Good is 0.1 or less.

What it prescribes here: keep the largest above-the-fold element (the hero heading in the
Fraunces display font) rendering fast, avoid layout shift from late-loading web fonts, and keep
main-thread work small so scroll and interaction stay responsive. All three must pass together.

Sources: Google Search Central, "Understanding Core Web Vitals"
(https://developers.google.com/search/docs/appearance/core-web-vitals); web.dev thresholds
reference summarized at https://web.dev/articles/defining-core-web-vitals-thresholds.

### 1.2 Google E-E-A-T (content quality / SEO)
Experience, Expertise, Authoritativeness, Trustworthiness. The framework Google's human quality
raters use to judge whether content is helpful and credible. It is not a direct ranking factor,
but it describes the qualities Google's ranking systems are tuned to reward. Trust is the most
important member: untrustworthy content is low quality regardless of the other three.

What it prescribes here: make first-hand experience and credentials explicit and verifiable
(author identity, real dates, links to award pages and credential bodies), be transparent about
figures (the "Recreated, figures anonymised" caption already does this well), and give the site
a clean, professional trust surface (favicon, social preview image, clear contact and identity).

Sources: Google Search Central Blog, "E-A-T gets an extra E for Experience"
(https://developers.google.com/search/blog/2022/12/google-raters-guidelines-e-e-a-t); Search
Quality Rater Guidelines overview at https://developers.google.com/search/docs/fundamentals/creating-helpful-content.

### 1.3 Google HEART UX framework + Goals-Signals-Metrics
A method from Google's quantitative UX research team for measuring experience quality at scale:
Happiness, Engagement, Adoption, Retention, Task success. It is paired with the
Goals-Signals-Metrics process: state the goal, decide the observable signal, then pick the
metric. Teams are told to drop the categories that do not apply.

What it prescribes here: define the portfolio's real success and instrument it. For a portfolio
the relevant categories are Task success (a recruiter reaches the contact CTA, opens the right
CV, opens a work deep-dive) and Engagement (uses the role-lens, scrolls deep, views multiple
initiatives). Happiness, Adoption and Retention matter less for a one-visit hiring decision.
Without lightweight analytics the site is currently optimized on intuition, not signals.

Sources: Kerry Rodden, "The HEART framework for UX metrics"
(https://www.kerryrodden.com/heart/); Rodden, Hutchinson, Fu, "Measuring the User Experience on
a Large Scale" (CHI 2010, https://research.google/pubs/pub36299/); GV Library, "How to choose
the right UX metrics" (https://library.gv.com/how-to-choose-the-right-ux-metrics-for-your-product-5f46359ab5be).

### 1.4 Nielsen Norman Group: 10 usability heuristics
Ten broad, long-standing principles for interaction design, used for expert (heuristic)
evaluation: (1) Visibility of system status, (2) Match between system and the real world,
(3) User control and freedom, (4) Consistency and standards, (5) Error prevention,
(6) Recognition rather than recall, (7) Flexibility and efficiency of use, (8) Aesthetic and
minimalist design, (9) Help users recognize, diagnose and recover from errors, (10) Help and
documentation.

What it prescribes here: the highest-value heuristics for this site are Consistency and
standards (two different navigation models across page types is the biggest violation),
Visibility of system status (scroll-spy and reading progress already do this well; charts are
static and could show values on hover/focus), Recognition rather than recall (headings are all
argument and hard to skim; add plain initiative names), and Aesthetic and minimalist design
(already strong; keep the film-grain identity deliberate rather than default).

Source: NN/g, "10 Usability Heuristics for User Interface Design"
(https://www.nngroup.com/articles/ten-usability-heuristics/).

### 1.5 WCAG 2.2 (accessibility, target Level AA)
The W3C Web Content Accessibility Guidelines, the reference standard most accessibility law
points at. Level AA is the standard compliance target. Relevant criteria for this site:
1.4.3 Contrast (Minimum, 4.5:1 for normal text), 2.4.1 Bypass Blocks (a skip link), 2.4.7 Focus
Visible (already handled by the `:focus-visible` ring in `assets/theme.css`), 2.4.11 Focus Not
Obscured (new in 2.2, keep focused elements out from under the sticky nav), 2.5.8 Target Size
Minimum (new in 2.2, 24 by 24 CSS pixels for pointer targets), and 1.1.1 Non-text Content
(text alternatives for the SVG charts).

What it prescribes here: fix the low-contrast `--mute` label color, add a skip link, confirm
tap-target sizes on the dense mono tab bar, and make sure every chart carries a text
alternative. Reduced-motion support and the focus ring are already in place and should be kept.

Source: W3C, "Web Content Accessibility Guidelines (WCAG) 2.2"
(https://www.w3.org/TR/WCAG22/).

### 1.6 Supporting references (accessibility + conversion + design)
- **Material Design** (https://m3.material.io/foundations): useful as a sanity check on
  interactive-state coverage (hover, focus, active, disabled) and touch-target sizing; not a
  visual direction to adopt, since the site has its own editorial identity.
- **Landing-page / conversion practice** (NN/g landing-page guidance,
  https://www.nngroup.com/articles/, and Baymard Institute UX research,
  https://baymard.com/): one dominant call to action, remove friction to the primary action,
  make the value proposition scannable in a few seconds, and reduce uncertainty (fit, level,
  availability) before asking for the action.

### 1.7 Important 2026 caveat on FAQ structured data
Google deprecated FAQ rich results: as of 7 May 2026 they no longer appear in Search, and the
related Search Console reporting and Rich Results Test support are being removed through 2026.
`FAQPage` remains a valid Schema.org type and Google still parses it to understand a page, so it
is worth adding only as a machine-readability / answer-engine (AEO/GEO) signal, not to win a
visible rich result. This matters because the homepage has a hiring-manager FAQ section that is
a natural candidate, and because Adrien positions on GEO/AEO.

Source: Search Engine Journal, "Google Drops FAQ Rich Results From Search"
(https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/); the
deprecation note lives on Google's FAQ structured data documentation
(https://developers.google.com/search/docs/appearance/structured-data/faqpage).

---

## 2. Where the site already stands

Read before writing recommendations: `index.html`, `for-ai.html`, `work/sales-intelligence.html`,
`cv.html`, `assets/theme.css`, `assets/work.css`, `assets/work.js`, plus both existing audits.

Already strong (do not regress):
- Rich SEO metadata: per-page `description`, Open Graph, Twitter card, canonical, robots meta,
  JSON-LD (`WebSite`, `Person`, `ProfilePage`, plus `BreadcrumbList` on `for-*`), `sitemap.xml`
  and `robots.txt` present.
- Honest data provenance: platform-styled chart panels with a "Recreated, figures anonymised"
  caption. This is a real E-E-A-T trust asset.
- Accessibility foundations: `:focus-visible` ring and `prefers-reduced-motion` handling in
  `assets/theme.css`; ARIA on the role-lens buttons and mobile nav; print styles.
- Performance foundations: no chart library, hand-built inline SVG, inline critical CSS,
  `font-display:swap`, `preconnect` to the font hosts, passive scroll listeners.
- Distinctive UX: the role-lens switcher, the reading-progress bar and auto scroll-spy on work
  pages, the thesis strip for a three-second read.

Gaps this plan targets (grounded in the files):
- Web fonts are render-blocking (three families, many weights) and the display face is the LCP
  element, with no preload and no fallback metric matching.
- The fixed full-viewport film-grain overlay (`body::before`, `mix-blend-mode:multiply`) is a
  constant compositing cost and the identity's "AI default" risk flagged in the UX audit.
- The homepage scroll handler runs a `sweep()` over every `.reveal` on each scroll event even
  when IntersectionObserver is available (`index.html` around lines 763 to 765).
- No `og:image` / `twitter:image`, so shared links unfurl without a preview image.
- `assets/favicon.svg` exists but is not linked from the page `<head>`.
- `--mute` (`#8c8775`) on paper (`#f4f1e8`) is about 3.2:1 contrast, used for small uppercase
  labels: below the WCAG AA 4.5:1 bar for normal text.
- No skip-to-content link.
- Two navigation models (sidebar plus top bar on `index`/`work`; top bar only on `for-*`).
- No analytics, so HEART signals (did the recruiter reach contact, open the CV, open a
  deep-dive) are unmeasured.

---

## 3. Prioritized recommendations

Ordered quick wins first (high impact, low effort), then medium, then large structural work.
Effort: S (under ~1 hour), M (a few hours), L (a day or more, or cross-page). Each row names the
framework/principle, the file(s), the concrete change, expected impact, and effort.

### 3.1 Quick wins (do first)

| ID | Framework / principle | File(s) | Concrete change | Expected impact | Effort |
| --- | --- | --- | --- | --- | --- |
| QW1 | WCAG 1.4.3 Contrast (AA) | `assets/theme.css` | Darken `--mute` from `#8c8775` (about 3.2:1) to roughly `#6f6a58` or darker to clear 4.5:1 on paper; verify with a contrast checker. Single token, cascades everywhere. | Fixes the main AA text-contrast failure across every page (eyebrow sublabels, chart labels, footer). | S |
| QW2 | E-E-A-T Trust; first impression | all page `<head>`s (`index.html`, `for-*.html`, `cv*.html`, `work/*.html`) | Link the existing `assets/favicon.svg` with `<link rel="icon">`, add a PNG fallback and `apple-touch-icon`, and a small `site.webmanifest`. | Professional browser-tab and bookmark identity; a cheap trust signal. | S |
| QW3 | WCAG 2.4.1 Bypass Blocks; Nielsen #3 User control | `index.html`, `for-*.html`, `work/*.html` (and the shared nav markup) | Add a visually-hidden "Skip to content" link as the first focusable element, targeting `<main>`. | Keyboard and screen-reader users skip the nav; standard AA requirement. | S |
| QW4 | Core Web Vitals (INP) | `index.html` (script around lines 760 to 766) | When IntersectionObserver is available, stop also running the scroll `sweep()`; if kept as a fallback, throttle it with `requestAnimationFrame`. Preserve viewport-triggered reveal behavior. | Less main-thread work on scroll, steadier INP on long mobile pages; no visual change. | S |
| QW5 | WCAG 1.1.1 Non-text content | `index.html` (efficiency `hbar`, others) | Add a descriptive `aria-label` to every chart container that lacks one, matching the pattern already used on the scorecard/trend charts. | Charts become understandable to assistive tech; consistency with existing good examples. | S |
| QW6 | E-E-A-T / AEO; 2026 FAQ caveat | `index.html` (`#faq` section) | Add `FAQPage` JSON-LD mirroring the existing hiring-manager Q&A. Note in a comment that this is for answer-engine parsing, not a rich result (deprecated May 2026). | Better machine/LLM understanding of the strongest recruiter content; on-brand for the GEO/AEO positioning. | S |
| QW7 | Conversion: reduce uncertainty | `index.html` (`#contact` `levelnote`, hero area) | Surface the "runs a Head-of function, wants a hands-on IC role" note higher (near the hero or lens), not only at the bottom of contact. | Removes the single biggest recruiter fit question earlier, before they bounce. | S |
| QW8 | WCAG 3.1.1 Language | all pages | Set `lang="en-GB"` to match the declared `en_GB` locale and content. | Correct language signal for assistive tech and search. | S |

### 3.2 Performance and Core Web Vitals

| ID | Framework / principle | File(s) | Concrete change | Expected impact | Effort |
| --- | --- | --- | --- | --- | --- |
| P1 | CWV LCP | all page `<head>`s; optionally `assets/` for self-hosted fonts | Reduce render-blocking font cost: trim the weight list to the ones actually used, and either preload the single Fraunces weight used in the hero (`<link rel="preload" as="font" crossorigin>`) or self-host and subset the display face. Keep `font-display:swap`. | Faster hero text paint; lower LCP, especially on mobile. | M |
| P2 | CWV CLS | page CSS `@font-face` / `:root` | Add a metric-matched fallback for Fraunces (a local `@font-face` with `size-adjust` / `ascent-override`, or `font-display:optional` for the display face) so the swap does not shift the hero. | Removes font-swap layout shift; protects the 0.1 CLS budget. | M |
| P3 | CWV INP / rendering; UX audit identity note | `assets/theme.css` or per-page base CSS (`body::before`) | Test the fixed film-grain overlay on a mid-range mobile. If it costs scroll/compositing, switch to a non-fixed tiled texture without `mix-blend-mode`, reduce opacity, or gate it to larger screens / `prefers-reduced-motion: no-preference`. | Smoother scrolling and lower paint cost; also a chance to make the identity deliberate. | S to M |
| P4 | CWV / hygiene | `sitemap.xml` | Confirm every `work/*.html`, `for-*.html`, `cv*.html` is listed with a current `lastmod`; add any missing. | Complete, fresh crawl surface. | S |

### 3.3 SEO and E-E-A-T

| ID | Framework / principle | File(s) | Concrete change | Expected impact | Effort |
| --- | --- | --- | --- | --- | --- |
| S1 | E-E-A-T Trust; social share | all `<head>`s; new image asset | Create one branded 1200x630 OG image (name, one-line positioning, blue scheme) and reference it via `og:image` and `twitter:image`. The `summary_large_image` card is already declared but has no image. | Shared links (recruiter DMs, Slack, LinkedIn) unfurl with a strong preview; higher click-through. | M |
| S2 | E-E-A-T Authoritativeness/Experience | `work/*.html` `<head>`s | Add lightweight `Article`/`CreativeWork` JSON-LD to each work deep-dive, with `author` referencing the existing `#person`, plus `datePublished`/`dateModified`. | Ties the case studies to a verifiable author and dates; strengthens experience and authority signals. | M |
| S3 | E-E-A-T Authoritativeness/Trust | `index.html`, `for-*.html`, `cv*.html` credentials/awards | Where possible, link claims to verifiable sources: European Search Awards results pages, the BCS CITP member listing, the MSc/credential. Keep anonymized business figures as they are. | Turns stated credentials into checkable ones, the core of authoritativeness. | S to M |
| S4 | E-E-A-T Trust freshness | `index.html` JSON-LD | Add `dateModified` to `ProfilePage`/`WebSite` and keep it current. | Signals an actively maintained, current profile. | S |

### 3.4 UX and usability (HEART + Nielsen)

| ID | Framework / principle | File(s) | Concrete change | Expected impact | Effort |
| --- | --- | --- | --- | --- | --- |
| U1 | HEART Task success; measurement | all pages; small shared script | Add privacy-friendly analytics (for example Plausible or GoatCounter) and instrument the real Goals-Signals-Metrics: contact-CTA clicks, CV opens, work deep-dive opens, role-lens usage, scroll depth. Confirm the third-party script tradeoff first. | Moves the site from intuition to signals; also demonstrates the analytics competence Adrien sells. | M |
| U2 | Nielsen #1 Visibility of system status | `assets/portfolio-charts.js`, chart CSS | Add hover and keyboard-focus states to charts that reveal the underlying value(s). Keep it light to protect INP; keep viewport-triggered draw animation. | Charts become explorable, not just decorative; better recall of the numbers. | M |
| U3 | Nielsen #6 Recognition rather than recall | `index.html`, `for-*.html`, `work/index.html` | Give each initiative a plain, scannable name alongside the punchy thesis headline, and use that name consistently in nav and the work index. | Recruiters can skim what was built, not just the argument; consistent naming across pages. | M |
| U4 | HEART Engagement; Nielsen #7 Flexibility | `work/index.html`, shared lens script | Extend the role-lens filter (currently only on `index`) to the `/work` index so recruiters can filter initiatives by audience. | Reuses the strongest interaction to speed the "show me relevant work" task. | M |
| U5 | Nielsen #4 Consistency and standards | `index.html`, `for-*.html`, `cv*.html`, `work/*.html` (nav markup, `theme.css`) | Unify on one navigation model and one mobile pattern across all page types (the biggest consistency violation, also flagged in `docs/ux-design-audit.md`). | Removes the "two mental models, one site" problem; smoother cross-page movement. | L |
| U6 | Nielsen #2 Match real world / consistency | `index.html` and others | Reserve the numbered `01..09` eyebrows for genuine sequences (spotlight months, MSc modules) and drop them where they are decorative. | Numbers stop implying an order that is not there. | S |

### 3.5 Conversion (recruiter-facing)

| ID | Framework / principle | File(s) | Concrete change | Expected impact | Effort |
| --- | --- | --- | --- | --- | --- |
| C1 | Conversion: one dominant action | `for-*.html`, `index.html` | Deep-link each `for-*` page to its matching `cv-*` variant and expose the ATS/plain version explicitly next to the formatted one, so the CV path is one obvious click. | Removes manual CV hunting; matches recruiter intent per audience. | M |
| C2 | Conversion: reduce friction | `index.html` `#contact`, `for-*` CTAs | Keep email as the single primary CTA but make it reachable earlier (a persistent or repeated contact affordance). Optionally add a "book a call" link if Adrien wants one (adds a dependency, confirm first). | Shorter path to the one action that matters. | S to M |
| C3 | Conversion: scannable value | `index.html` hero lede | Tighten the hero lede to two sentences (the long paragraph competes with the thesis strip). Keep the ATS-friendly headline as is. | Faster first-read of the value proposition. | S |

### 3.6 Accessibility (WCAG 2.2 AA), beyond the quick wins

| ID | Framework / principle | File(s) | Concrete change | Expected impact | Effort |
| --- | --- | --- | --- | --- | --- |
| A1 | WCAG 2.5.8 Target Size (AA) | `.xnav .tabs a` in `theme.css`/page CSS | Verify the dense mono tab-bar links meet 24 by 24 CSS pixels (or have the required spacing) on touch; bump padding if short. | Easier, standard-compliant tapping on mobile. | S |
| A2 | WCAG 2.4.11 Focus Not Obscured (AA) | pages with sticky `.xnav` | Confirm that anchor-focused elements are not hidden under the sticky top nav; the `scroll-margin-top` on `.section` helps, extend to any other focus targets. | Keyboard focus stays visible under the sticky header. | S |
| A3 | WCAG 1.4.11 Non-text contrast (AA) | chart CSS, `theme.css` | Check that chart "before" bars (`#c3bcab`) and hairlines meet 3:1 against their background where they carry meaning. | Charts remain legible for low-vision users. | S |

---

## 4. Suggested sequencing

1. **Batch 1 (one sitting, low risk):** QW1 to QW8. Mostly single-token or single-attribute
   edits, no layout change, immediate accessibility, trust, and INP gains.
2. **Batch 2 (performance):** P1, P2, P3, P4. Protects LCP and CLS before any redesign.
3. **Batch 3 (SEO/E-E-A-T trust surface):** S1 (OG image), S2, S3, S4.
4. **Batch 4 (UX depth and measurement):** U1 (analytics, so later changes can be judged on
   signals), then U2, U3, U4, U6; C1, C2, C3; A1 to A3.
5. **Batch 5 (structural):** U5 navigation unification, coordinated with the per-initiative IA
   work already scoped in `docs/ux-design-audit.md`.

---

## 5. Flags and open questions (confirm before implementing)

- **Real company names vs anonymization.** `AGENTS.md` says to use real company names (for
  example Indeed), and the current site names Indeed Flex on `index.html` and `work/*`. The older
  `docs/portfolio-audit.md` says public marketing pages should anonymize the employer to "a
  leading workforce marketplace." These conflict. Confirm which policy is current before any SEO
  or schema change touches employer names. This plan does not change that content.
- **Third-party analytics (U1).** Adds one external script and a privacy consideration. Confirm
  a preferred tool (Plausible, GoatCounter, or none) before adding.
- **"Book a call" CTA (C2).** Optional and adds a scheduling dependency (for example Calendly).
  Only add if Adrien wants it.
- **Font self-hosting (P1).** Self-hosting/subsetting the display face is the bigger LCP win but
  is more work than a preload; confirm appetite. Either way keep `font-display:swap`.
- **Film-grain overlay (P3).** Reducing or changing it touches the site's visual identity, which
  the UX audit flagged as a deliberate decision to make. Confirm before altering the look.
- **OG image (S1).** Needs a produced image asset in the blue scheme; confirm copy and whether
  a single shared image or per-page images are wanted.
- Contrast values quoted here (for example `--mute` at about 3.2:1) are computed estimates;
  verify with a contrast tool before committing the exact replacement hex.

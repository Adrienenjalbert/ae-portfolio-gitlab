# Portfolio audit — chart authenticity and credibility

Reference document for the chart-authenticity upgrade. Captures the findings, the
locked figure register, the confidentiality/PII actions, and the project-to-platform
chart mapping. Source of truth for figures is
`/Users/adrien.enjalbert/Desktop/cv apply/04_portfolio/portfolio_projects.md`.

## What exists today

- **Deck** (`04_portfolio/master_portfolio/`): presentation-grade charts rendered by
  `charts.py` (matplotlib → transparent PNGs): `before_after`, `hbar_delta`,
  `line_growth`, `multiple_factor` (ring).
- **Live site** (this repo): a hand-coded inline-SVG engine (`drawBeforeAfter`,
  `drawHBar`, `drawRing`) copy-pasted into 7 pages. Pure static (GitHub Pages,
  `.nojekyll`), no build step, no JS libraries. No line/trend chart anywhere.

## Problems found (priority order)

1. **Confidentiality breach on public pages.** The employer is named "Indeed Flex"
   on the public homepage timeline, and `index.html` / `for-ai.html` claim
   "#1 ... across Indeed globally on its Cursor leaderboard". The rules in
   `portfolio_projects.md` require public pages to use "a leading workforce
   marketplace" and never name the company. (CVs may name it.)
2. **Figures disagreed across source versions.** Now locked — see register below.
3. **PII in source docs** (must never reach public pages): colleague names (Olga,
   Leonie, Tom, James, Brett, Sarah P., Harry P. …), a client account name
   ("Stored"), internal systems (Tableau, Snowflake, the "Cursor initiative"). Only
   "Sarah P." leaked onto the live site (testimonial attribution) — reduced to role.
4. **No provenance.** Every chart is a clean recreated bar; nothing signals the
   numbers came from a real platform.
5. **Maintenance + capability gap.** Charts duplicated across 7 pages; the strongest
   stories (monthly CPL decline, organic trajectory) are shown as flat bars.

## Canonical figure register — LOCKED

| Metric | Locked value | Window / note |
| --- | --- | --- |
| Career Hub organic impressions | +4,000% | June 2026 vs 2025 — chart must label the window |
| Career Hub organic clicks | +286% | June 2026 vs 2025 |
| Career Hub conversion rate | +90% | June 2026 vs 2025 (separate project from the earlier organic strategy) |
| Earlier organic strategy | +973% impressions / +134% traffic | Oct 2025–Jan 2026 — SEPARATE project; keep distinct, do not merge |
| Peak Season cost per booked job | £4.57 → £0.96 (-79%) | GBP set only; drop the USD scale dataset |
| Peak Season booked shifts | +123% (13,644 → 30,432) | YoY |
| Peak Season returning users / ROI | +90% / 5x | |
| Sales contacts generated | 14,500+ | over the 8,500+ variant |
| B2B CPL | £1,072 → £207 (-81%) | monthly path: £1,072 → £360 (Apr) → £287 (May) → £207 (Jun) |
| Q2 ROAS | 17x blended (UK 11x, US 46x) | |
| B2C conversion | 5.1% → 30.4% (+592%) | |
| Article cost | £600 → £1 (-99.8%) | |
| Chatbot conversion | 1.9% → 4.7% (+147%) | |
| Lifecycle | 15x retention · 4.6x time · 3.9x return · 28% reactivation · +45% LTV | |
| First ABM | US 4,846 / UK 1,003 accounts; 5,849 total; +30% engagement | |

## Confidentiality / PII actions (public marketing pages)

Public = `index.html`, `for-ai.html`, `for-growth.html`, `for-analytics.html`,
`for-demandgen.html`, `spotlight.html`, `builds.html`, `msc-ai.html`.
CV pages (`cv*.html`, `cv-*-ats.html`) keep the employer named (allowed by the rules).

- Employer "Indeed Flex" → "A leading workforce marketplace" (`index.html` timeline).
- "#1 ... across Indeed globally" → "#1 on the company-wide AI-tooling leaderboard
  (thousands of users)" (`index.html`, `for-ai.html`).
- Testimonial "Sarah P., Country Manager" → "Country Manager" (role only)
  (`index.html`, `for-ai.html`).
- "Indeed" as a paid channel in media-mix comparisons → "a major job board"
  (`for-analytics.html`, `spotlight.html` channel table).

## Per-project chart mapping (best chart per story)

Favours multi-metric "compare each of them" visuals (lifecycle remarketing is the
reference design). Each maps to a platform-styled panel.

- **P1 Sales intelligence** → Salesforce/CRM `hbar`: £440K pipeline, 14,500 contacts,
  +56% adoption, +12% SQL, 80% phone accuracy.
- **P2 Content engine** → `beforeafter` £600 → £1 + SEMrush-style frame.
- **P3 Chatbots** → GA4 `beforeafter` 1.9% → 4.7% + supporting `hbar` (+65% ICP fit,
  -30% sales cycle, 40% time saved).
- **P4 Lead magnets** → GA4 `hbar`: +457% traffic, 3.2x time, +18% MQL-SQL, -95% cost.
- **P5 Demand gen (hero)** → Google Ads `trend`: monthly CPL £1,072 → £360 → £287 →
  £207 + ROAS `scorecard` (UK 11x / US 46x / 17x blended).
- **P6 Peak Season** → Google Ads `beforeafter` £4.57 → £0.96 + `scorecard` (+123%
  booked shifts, +90% returning users, 5x ROI).
- **P7 CRO** → GA4 grouped `beforeafter`: CVR 5.1 → 30.4, Google CPA £19 → £3, Meta
  CPA $5.2 → $1.37, page speed 3.2s → 1.1s.
- **P8 Lifecycle** → GA4 cohort-style multi-metric panel (reference design).
- **P9 Career Hub organic** → Search Console `trend`, labelled "Apr–Jun 2026 vs 2025":
  +4,000% impressions / +286% clicks.
- **P10 First ABM** → Demandbase/LinkedIn grouped `beforeafter` US vs UK.

## Chart engine design

- Shared `assets/portfolio-charts.js` + `assets/portfolio-charts.css` replacing the
  duplicated inline code.
- Keep `beforeafter`, `hbar`, `ring`; add `trend` (line + area) and `scorecard`
  (Looker-style KPI tiles).
- Optional "platform panel" wrapper: header with platform label + metric + date range
  + honest "Recreated · figures anonymised" caption. Per-platform colour/type tokens.
- Preserve scroll-reveal animation, `prefers-reduced-motion`, ARIA labels.
- No external chart library (keeps the site dependency-free and GitHub-Pages friendly).

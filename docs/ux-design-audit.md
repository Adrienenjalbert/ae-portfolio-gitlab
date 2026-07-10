# Portfolio UX & design audit

Deep audit of the portfolio's information architecture, content structure, data
visualisation, motion, visual craft and broader UX. Run through the lens of the
`frontend-design` skill (`.agents/skills/frontend-design`). Companion to the
chart-authenticity notes in `portfolio-audit.md`.

Scope reviewed: `index.html`, the `for-*` lens pages, `spotlight.html`,
`builds.html`, `msc-ai.html`, the `cv*` pages, and the shared chart engine
(`assets/portfolio-charts.{js,css}`).

## Headline read

The portfolio is already in the top tier for a personal site: a real design
system, a hand-built dependency-free SVG chart engine, scroll-reveal, a role-lens
switcher, ARIA labels, print styles. This is a polish-and-restructure job, not a
rescue.

The single biggest "is this templated?" risk: the identity — **cream paper
(`#f4f1e8`) + a high-contrast serif display (Fraunces) + film-grain texture** — is
almost exactly the #1 cluster that AI design currently defaults to. The cobalt-blue
accent (instead of the usual terracotta) pulls it off the bullseye, but it is close.
This should be a deliberate decision: commit harder to the editorial concept so it
reads as intentional, or shift the palette/type off the default.

## 1. Information architecture & per-initiative navigation (weakest area)

- **Two navigation models.** `index`, `builds`, `spotlight`, `msc-ai` use a left
  sidebar + top bar; the `for-*` pages use a top bar only (horizontal-scroll tabs on
  mobile). Same brand, two mental models.
- **Overloaded taxonomy mixing two axes.** The nav flattens audience-lens
  (AI / Growth / Demand gen / Analytics) and content-type (Builds / Spotlight / MSc /
  CV) into one row, and duplicates the on-page role-lens switcher.
- **No canonical per-initiative page.** ~10 real initiatives (P1–P10 in
  `portfolio-audit.md`) are scattered across thematic narrative sections and
  re-described on every `for-*` page (the £440K sales agent appears 4+ times). There is
  no single deep, linkable page per initiative.

**Recommendation — two-layer IA:**
1. **Lens/landing layer:** `index` + `for-*` stay as curated entry points that
   select and order initiatives per audience.
2. **Canonical initiative layer:** one deep page per initiative
   (`/work/<slug>`) with a consistent template (problem → build → architecture →
   chart → proof → what it proves), plus a filterable `/work` index and prev/next
   navigation. Lens pages link into these instead of re-describing them.

## 2. Content structure & heading logic

- Heading hierarchy is semantically clean (`h1 → h2 → h3`).
- **The `01–08` numbered eyebrows are decorative, not sequential.** Numbered markers
  should only appear where content is a genuine sequence (correct on `spotlight`
  months and `msc-ai` modules; decorative on `index`).
- **Headings are all argument, no scannability.** Great voice, but skimming the H2s
  doesn't reveal *what was built*. Give each initiative a plain scannable name
  (used in nav/index) alongside the punchy thesis headline. Tighten long `.copy`
  prose to lead + one support paragraph; push detail to the initiative page.

## 3. Data visualisation

- **`hbar` widths are hand-authored, not data-derived** (e.g. `100/66/40/18`) and mix
  units (£, count, %) on one axis, implying a quantitative comparison that isn't real.
  Use a shared real scale or switch these to KPI scorecards.
- **Duplicated chart engine.** Each chart page ships an inline copy of
  `beforeafter/hbar/ring` *and* loads `portfolio-charts.js` (which has its own copy plus
  `trend/grouped/scorecard`), with coexistence hacks. Consolidate to one module.
- **Richer, more credible types:** use `trend` more (CPL £1,072→£207, organic
  trajectory read far better as lines), add inline sparklines, small-multiples for the
  "three cost lines" story, real axes/gridlines, and hover/focus tooltips (charts are
  currently non-interactive).
- The platform-panel framing (Salesforce/GA4/Search Console chrome + "Recreated ·
  figures anonymised") is a genuinely distinctive strength — use it consistently.

## 4. Motion & interaction

- Solid base: scroll-reveal, count-up, chart-draw, ring sweep, line-draw,
  `prefers-reduced-motion` respected.
- **Everything animates identically** (uniform `opacity + translateY(20px)`), which is
  itself an AI tell. Spend the motion budget on one orchestrated moment and make the
  rest quieter/faster.
- **The hero has no signature moment** — it fades in like a paragraph. Give the hero
  one memorable, subject-appropriate entrance.
- **Charts are non-interactive** — add hover/focus states with values.
- **The role-lens switcher is stranded on `index`** — its dim/highlight interaction is
  the strongest pattern on the site; it should drive the `/work` index too.
- Add scroll-progress; ensure scrollspy works on all sidebar pages.

## 5. Visual / UI craft

- **Design tokens are copy-pasted into every file** (`:root{…}` duplicated across 13
  HTML files). Move tokens to a shared `assets/theme.css`; highest-leverage structural
  fix and it unblocks exploring new directions.
- **Keyboard focus is essentially invisible** — effectively no `:focus-visible`
  styling anywhere. Accessibility failure and a skill "quality floor" item. Add a
  visible focus ring.
- Three Google Font families with many weights are render-blocking; keep
  `font-display:swap`, consider self-hosting/subsetting the display face.
- Resolve the cream-serif identity question (see Headline read).

## 6. UX beyond UI

- **CV routing is manual** across `cv-*` + `-ats` variants — deep-link each `for-*`
  page to its matching CV and expose the ATS/plain version explicitly.
- **The "level note"** (runs Head-of, wants a hands-on IC role) is buried at the
  bottom of `contact`; surface it earlier and more confidently.
- No favicon / `Person` structured data / OG image on most pages — affects the
  shared-link first impression.
- Mobile nav is inconsistent (drawer vs horizontal-scroll tabs) — unify with the IA
  fix.

## Prioritised plan

1. **Extract shared `theme.css` + single `charts.js`.** Removes 13× token
   duplication and the double chart engine; unblocks everything else. (Foundational.)
2. **Unify navigation into one model + add visible focus states.**
3. **Build the per-initiative architecture:** `/work` index (lens-filterable) + one
   canonical page per initiative with prev/next; lens pages link in.
4. **Fix chart honesty + richness:** real scales or scorecards; `trend` for
   CPL/organic; hover/focus tooltips and axes.
5. **One orchestrated hero moment** per key page; quieten the rest; decide the
   cream-serif identity question.

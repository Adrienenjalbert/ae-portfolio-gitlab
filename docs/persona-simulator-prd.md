# PRD: AI Customer Persona Simulator ("Persona Lab")

Status: v1, implemented as a standalone interactive page in the Tripadvisor case study.
Owner: Adrien Enjalbert.
Location: `ai-growth-Tripadvisor/persona-simulator.html` with `assets/persona-sim.js` and `assets/persona-sim.css`.

## 1. Summary

Persona Lab is a functional, client-side pre-launch simulation tool for the Tripadvisor International Incentives team. A user picks a market persona, a customer segment, and an offer (percentage discount or fixed-value voucher), and immediately sees the predicted customer reaction: incrementality, uptake, incremental bookings, promotional spend, deadweight, cost per incremental booking, and net incremental revenue. The output includes a data-analytics table, two charts, a plain-language persona reaction, a confidence meter, and explicit guardrails against over-trusting the simulation.

It is the concrete, working version of item 6 in section 2.2 of the case study ("AI customer persona simulator") and the five personas in section 2.4. It answers Finance's core question live: can we hold incremental bookings for less?

## 2. Problem

Launching an incentive experiment today is slow and expensive: analysts pull history, marketers draft specs, PMs review, and several meetings decide whether an idea is even worth a test. The team can only run three experiments a quarter, so every slot is precious. There is no fast, shared way to pressure-test "what would happen if we offered X to segment Y in market Z" before committing a slot.

Persona Lab gives the team a cheap, instant, first-pass answer that is grounded in the observed data, so weak ideas are filtered before they consume a slot and strong ideas arrive at the experiment queue already sharpened.

## 3. Users and jobs to be done

- Marketer / Incentives manager: "Before I draft a spec, show me roughly how this offer would land for this persona, and whether it is worth a slot."
- Analyst: "Give me a transparent, adjustable model I can sanity-check and export, not a black box."
- Finance / PM: "Show me the deadweight and the net, so I can see where spend is wasted and where it is working."

## 4. Non-goals

- It is not a replacement for a holdout experiment. It never returns a verdict, only a hypothesis to test.
- It does not connect to live warehouse or CRM data in v1. It is fully client-side and uses the case-study anchors.
- It does not store or transmit any personal data.

## 5. Data foundation

All numbers are anchored to the observed flat 15% discount results from the case brief. Currency stays local (UK in GBP, all other markets in EUR).

| Market | Segment | Basket | Redemption | CVR lift | Incrementality | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| UK | First purchase | GBP 95 | 18% | +22% | 71% | High (clean holdout) |
| UK | Lapsed | GBP 110 | 14% | +15% | 52% | Med-high |
| UK | Repeat | GBP 130 | 21% | +8% | 31% | Med-high |
| Germany | First purchase | EUR 102 | 11% | +16% | 63% | High (clean holdout) |
| Germany | Repeat | EUR 120 | 14% | +7% | 28% | Med-high |
| France | First purchase | EUR 88 | 12% | +14% | 58%* | Low (directional) |
| France | Lapsed | EUR 92 | 9% | +11% | 44%* | Low (directional) |
| Italy | First purchase | EUR 79 | 10% | +12% | 51%* | Low (directional) |
| Spain | First purchase | EUR 75 | 9% | +11% | 48% | Med (clean, marginal) |

`*` France and Italy had holdout targeting issues, so their incrementality is directional only.

Cells not measured directly (for example Germany Lapsed, Spain Repeat) are estimated from UK-derived segment factors applied to the market's first-purchase anchor, and flagged "estimated" with reduced confidence:

- Lapsed factor = 52 / 71 = 0.73 of first-purchase incrementality.
- Repeat factor = 31 / 71 = 0.44 of first-purchase incrementality.

This keeps the full market x segment grid usable while staying honest about which numbers are observed and which are inferred.

## 6. The model

Inputs (user controls):

- Persona / market: UK, France, Germany, Italy, Spain.
- Segment: First purchase, Lapsed, Repeat.
- Offer type: percentage discount, or fixed-value voucher.
- Discount depth `d` (0 to 30%), or voucher amount in local currency.
- Audience size `N` (default 10,000 exposed users).
- Advanced: contribution margin `m` (default 22%), uptake elasticity `beta` (default 0.6), deadweight sensitivity `gamma` (default 0.12).

Core equations, anchored at the observed 15% point per cell (`r0`, `i0`, basket `b`):

- Effective depth: percentage offer uses `d`; fixed voucher uses `d = min(voucher / b * 100, 30)`.
- Uptake (redemption), rising and saturating with depth: `r = clamp(r0 * (d / 15) ^ beta, 0, 50%)`.
- Incrementality, declining modestly with depth because deeper discounts pull in more people who would have booked anyway: `i = clamp(i0 * (15 / d) ^ gamma, 0, 92%)`.
- Fixed-value framing bonus, applied only to Germany first purchase, flagged as a low-confidence qualitative signal: `i = i * 1.08`.
- Promo cost per redeemer: percentage uses `d/100 * b`; fixed voucher uses the voucher amount.
- Redeemers: `N * r`.
- Incremental bookings: `redeemers * i`.
- Total promo spend: `redeemers * promoCost`.
- Deadweight spend: `totalSpend * (1 - i)`.
- Cost per incremental booking: `totalSpend / incrementalBookings`.
- Net incremental revenue: `incrementalBookings * b * m - totalSpend`.

Verdict pill (mirrors the case bands): positive if `i >= 55%`, marginal if `40% <= i < 55%`, negative if `i < 40%`.

Confidence meter (Tripadvisor bubble motif, out of 5): UK and Germany clean cells score high; Spain scores medium; France and Italy directional cells score low (2); estimated cells lose one bubble; the fixed-value Germany bonus is flagged.

All model constants are exposed in the Advanced panel so the tool is inspectable rather than a black box.

## 7. UX

- Product header: name, "pre-launch simulation" tag, live confidence badge, and a link back to the case study.
- Sticky control panel: persona flags, segment, offer-type toggle, depth or voucher slider, audience size, and a collapsible Advanced section.
- Results dashboard:
  - Headline KPI cards: incremental bookings, net incremental revenue, cost per incremental booking, deadweight spend, incrementality, confidence.
  - "How this persona responds" card: dynamic narrative, verdict pill, confidence bubbles.
  - Chart A: incrementality and deadweight versus discount depth, current point marked.
  - Chart B: all five personas compared at the chosen offer.
  - Live data-analytics table across the market x segment grid, with directional and estimated flags.
  - Dynamic recommendation strip.
- Guardrails panel ("a simulation, not a verdict"): confirmation-bias warnings, when to ignore the persona, directional-market caveats.
- Export the scenario as CSV or JSON (client-side), plus a contact call to action.

Quality bars: charts and count-ups animate only on viewport entry, full responsiveness including mobile, reduced-motion support, and WCAG 2.2 AA (labelled controls, visible focus, live-region result updates).

## 8. Success metrics

If this were shipped inside Tripadvisor:

- Share of experiment ideas that are simulated before a slot is requested.
- Reduction in slots spent on ideas that fail to reach significance.
- Analyst hours saved per idea triaged.
- Correlation between simulated incrementality and post-launch measured incrementality (calibration), tracked over time.
- Adoption: weekly active users on the Incentives team.

As a portfolio artifact:

- Recruiter time on page and interaction rate with the controls.
- Qualitative feedback that it reads as a real product, not a mockup.

## 9. Guardrails and ethics

- The tool always frames output as a hypothesis to test, never a decision.
- Directional markets (France, Italy) and estimated cells are visibly down-weighted.
- Confirmation bias is called out directly: a persona that keeps agreeing with the user is a red flag.
- No personal data is used or stored.

## 10. Roadmap (v2+)

- Wire to real warehouse and holdout data behind auth, replacing the static anchors.
- Calibrate `beta` and `gamma` per market from historical depth tests instead of global defaults.
- Add CLV and margin by market and product mix (hotels versus experiences).
- Log each simulation and compare it to the eventual live result to score and recalibrate the personas.
- Push an approved scenario straight into the experiment specification generator (item 1 in section 2.2).

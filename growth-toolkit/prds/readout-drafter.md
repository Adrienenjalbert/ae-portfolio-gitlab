# PRD — Test Readout & Realised-Impact Drafter

## Business problem
Readouts land late and inconsistently. 54 CRM result posts in Slack are mostly free text with no shared structure, 3 CRM tests are currently overdue for readout in MEL, and nothing today checks whether a scaled roll-out actually delivered the revenue it was estimated to.

## Evidence (cited)
- 54 result posts, mostly free text (Programme for Mason tracker, project B).
- 3 CRM tests overdue in MEL at time of audit (Programme for Mason tracker, project B).
- 0 existing checks on realised-vs-estimated revenue post-rollout (Programme for Mason tracker, project B).
- Target: results within 7 days of test end (Programme for Mason tracker, project B KPI).

## Users and jobs to be done
- **CRM / Incentives owners:** "When a test ends, I want a structured first draft in minutes, so I can review and decide instead of writing from scratch."
- **Analytics:** "When I'm asked for a readout, I want a consistent method across analysts, not five different formats."
- **Leadership:** "When I approve a scale decision, I want to see whether the last scale decision actually paid off."

## Data contract
- **Source:** pasted campaign metrics (Tier A, built here), exported BI results (Tier B), Braze/warehouse by Canvas ID (Tier C, not built: gated).
- **Grain:** one readout per test, segmented by audience/market.
- **Freshness:** on-demand, at test end.
- **Known gaps:** no Canvas ID currently standard in TEL; Tier C requires that field plus an agreed, approved data route through Analytics (Elise).

## AI / skill spec
- Tier A: deterministic template drafter from pasted numbers (built).
- Tier B: adds real statistical significance and lift calculation in code before drafting (not yet built).
- Tier C: automated pull from Braze/warehouse by Canvas ID (gated, needs data access approval).
- Realised-impact check: flags when 30/90-day realised revenue diverges >15% from the original estimate.

## UX spec
- Paste fields: objective, market, two segment results, estimated and realised revenue.
- Output: objective, market performance, audience performance, likely driver, recommended action, learning-to-save line, and a realised-vs-estimated flag.
- Explicitly labeled "first draft" throughout; never presented as the decision of record.

## KPI and measurement
- Time from test end to decision (target: 7 days, down from current inconsistent lag).
- % of tests with a saved learning entry.
- Variance between realised and estimated revenue, tracked over time.

## Gates and approvals
- No Snowflake or BigQuery query runs without asking Analytics (Elise) first, per the programme's data-access rule.
- Metric definitions and approved data routes agreed with Analytics before Tier C is built.
- Human sign-off required before any readout becomes a scale/iterate/stop decision.

## Rollout
- P1. Tier A ships first (this build). Tier B next once the analyst checklist is collected. Tier C only after Canvas ID is standard in TEL and data access is approved.

# PRD — International Growth Learning Repository

## Business problem
Learnings from CRM, Incentives and Rewards tests live across dashboards, Slack threads, readout docs and personal memory. When someone leaves or changes teams, that institutional memory is lost, and the same losing idea gets re-tested in a new market.

## Evidence (cited)
- 141 CRM Slack test posts identified as the seed corpus (AI Systems Backlog, Initiative 8).
- 34% of CRM posts have no matching TEL row today (Programme for Mason tracker, project A audit).
- 10 duplicate TEL IDs found in the same audit.
- Target tag dimensions: journey, lever, brand, market, metric (AI Systems Backlog, Initiative 8).

## Users and jobs to be done
- **CRM Manager:** "Before I launch a new Italy campaign, I want to query 'IT welcome email learnings' and get prior tests with takeaways, not start from zero."
- **Incentives:** "When I design an offer, I want to see what offer framing has already worked in that market."
- **Leadership / Analytics:** "I want to see whether campaigns actually cite prior learnings before launch, as a leading indicator of discipline."

## Data contract
- **Source:** CRM Slack result posts, TEL Past Test Match tab, readout-drafter tool outputs on approval.
- **Grain:** one entry per test: market, journey, lever, metric, result (won/lost/insight/proposed), summary, tags.
- **Freshness:** weekly ingest loop — new entries added, gaps/contradictions/stale roll-outs surfaced for human review at planning.
- **Known gaps:** entries are only as complete as the underlying TEL/MEL reconciliation (project A); the 34% orphan-post rate means this repository is currently under-seeded relative to the true test volume.

## AI / skill spec
- Tag extraction and dedup during ingest.
- Keyword/semantic search across market, journey, lever, metric and free-text summary.
- Contradiction and staleness flags surfaced to a human reviewer at the weekly planning loop, not auto-resolved.

## UX spec
- Single search box, no filters required to get a first result.
- Each result shows the market/journey/lever header, a one-line summary, and a won/lost/insight badge.
- No results is treated as a signal ("this may be a genuine gap, worth logging"), not a dead end.

## KPI and measurement
- Entries logged per quarter.
- Number of times the repository is queried before a new campaign launch.
- % of campaigns that cite a prior learning in their brief.

## Gates and approvals
- Start in Sheets/Notion-equivalent structure before investing in a custom tool; build the logging habit first.
- Human review at planning before a "ranked test proposal" is acted on (this is the search layer only, not the proposal-generation layer described in project E).

## Rollout
- P1/P2, seeded Month 1, ongoing. This demo is the retrieval layer (Layer E's foundation); the full four-layer system (records, evidence pages, rules/playbooks, ranked proposals) is a later build once this layer has real adoption.

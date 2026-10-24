# PRD — Subject-Line & Push Copy Generator

## Business problem
CRM runs roughly 17 subject-line specs a month, the largest single test category by volume. Today each one starts from a blank page: there is no mechanism to reuse what already won or lost in a prior test, so the team defaults to the first idea rather than testing several angles.

## Evidence (cited)
- Volume: ~17 subject-line specs/month (Programme for Mason tracker, initiative M3).
- Win: first-name personalization lifted open rate +10.5% in a UK second-booking nudge test (Past Test Match tab).
- Loss: naming the specific abandoned product in the subject line lost twice, across DE and FR cart-recovery sends (Past Test Match tab).
- Gap: no reuse mechanism exists; each spec starts from zero (AI Systems Backlog, Initiative 6).

## Users and jobs to be done
- **CRM (Viator + Tripadvisor):** "When I brief a new test, I want 5-10 scored variants in minutes, so I stop defaulting to one idea."
- **Analytics:** "When I review a brief, I want to see which rule each variant is grounded in, so I can sanity-check the claim."
- **Leadership:** "When I look at test velocity, I want to see more angles tested per campaign, not just more campaigns."

## Data contract
- **Source:** TEL/MEL tracker, Past Test Match tab, CRM Slack result posts.
- **Grain:** one rule per past test outcome (market, lever, result, magnitude).
- **Freshness:** rules refreshed from the Learning Repository on each ingest cycle (weekly, per project E's loop).
- **Known gaps:** 34% of CRM Slack posts have no matching TEL row today; rule confidence is lower until the MEL↔TEL key fix (project A) lands.

## AI / skill spec
- Rule lookup against the Learning Repository tool.
- Template-based generation per tone (urgency, value, curiosity, personalization, social proof), parameterized by market and audience.
- Market-specific ordering (e.g. DE favors value framing first, per DE lapsed-booker evidence).

## UX spec
- Four-field brief: market, audience, offer/hook, channel.
- Output: 5 tone-labeled variants with a one-line rationale each, a flagged caution where a tone under-performed for that audience, and one recommended A/B pair.
- Every rule traceable to its evidence citation on the same page.

## KPI and measurement
- Variants tested per campaign (target: up from 1 to 3+).
- Open-rate lift on AI-assisted vs. non-assisted campaigns.
- % of generated copy approved without edit at human review.

## Gates and approvals
- Human reviewer approves tone and claims before any send. No generated copy bypasses review.

## Rollout
- P1, Month 1. No data-access dependency; usable immediately on existing rule set, improves in accuracy as project A (shared key) and project E (learning repository) mature.

/* =========================================================
   Spec Studio - AI experiment brief generator (goal-led)
   Tripadvisor x Adrien Enjalbert - AI Personalization case study
   Pick a business goal. The tool ranks where the opportunity is
   (from real holdout data), recommends the right experiment, and
   writes a clean, decision-ready brief for the second brain wiki.
   The powering runs silently; the analyst controls are gone.
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------------- Data foundation (observed at flat 15%) ---------------- */
  const MARKETS = {
    UK: { name: "United Kingdom", flag: "\uD83C\uDDEC\uD83C\uDDE7", code: "UK", ccy: "GBP", sym: "\u00A3" },
    DE: { name: "Germany",        flag: "\uD83C\uDDE9\uD83C\uDDEA", code: "DE", ccy: "EUR", sym: "\u20AC" },
    FR: { name: "France",         flag: "\uD83C\uDDEB\uD83C\uDDF7", code: "FR", ccy: "EUR", sym: "\u20AC", directional: true },
    IT: { name: "Italy",          flag: "\uD83C\uDDEE\uD83C\uDDF9", code: "IT", ccy: "EUR", sym: "\u20AC", directional: true },
    ES: { name: "Spain",          flag: "\uD83C\uDDEA\uD83C\uDDF8", code: "ES", ccy: "EUR", sym: "\u20AC" },
  };
  const SEGMENTS = { first: "First purchase", lapsed: "Lapsed", repeat: "Repeat" };
  const SEGLOW = { first: "first-purchase", lapsed: "lapsed", repeat: "repeat" };

  // Observed cells from the case study table.
  const INCR   = { "UK|first": 71, "UK|lapsed": 52, "UK|repeat": 31, "DE|first": 63, "DE|repeat": 28, "FR|first": 58, "FR|lapsed": 44, "IT|first": 51, "ES|first": 48 };
  const RED    = { "UK|first": 18, "UK|lapsed": 14, "UK|repeat": 21, "DE|first": 11, "DE|repeat": 14, "FR|first": 12, "FR|lapsed": 9, "IT|first": 10, "ES|first": 9 };
  const BASKET = { "UK|first": 95, "UK|lapsed": 110, "UK|repeat": 130, "DE|first": 102, "DE|repeat": 120, "FR|first": 88, "FR|lapsed": 92, "IT|first": 79, "ES|first": 75 };
  const BASE_CVR = { "UK|first": 20, "UK|lapsed": 16, "UK|repeat": 28, "DE|first": 21, "DE|repeat": 27, "FR|first": 19, "FR|lapsed": 15, "IT|first": 18, "ES|first": 19 };
  const F_INCR = { first: 1, lapsed: 0.73, repeat: 0.44 };
  const F_RED  = { first: 1, lapsed: 0.78, repeat: 1.17 };
  const F_BASK = { first: 1, lapsed: 1.16, repeat: 1.37 };
  const F_CVR  = { first: 1, lapsed: 0.8, repeat: 1.4 };
  const OBSERVED = [["UK","first"],["UK","lapsed"],["UK","repeat"],["DE","first"],["DE","repeat"],["FR","first"],["FR","lapsed"],["IT","first"],["ES","first"]];

  function pick(map, factor, mk, seg, round) {
    const k = mk + "|" + seg;
    if (map[k] != null) return { v: map[k], est: false };
    const v = map[mk + "|first"] * factor[seg];
    return { v: round ? Math.round(v) : +v.toFixed(1), est: true };
  }
  const incrOf   = (mk, seg) => pick(INCR, F_INCR, mk, seg, true);
  const redOf    = (mk, seg) => pick(RED, F_RED, mk, seg, false);
  const basketOf = (mk, seg) => pick(BASKET, F_BASK, mk, seg, true);
  const cvrOf    = (mk, seg) => pick(BASE_CVR, F_CVR, mk, seg, false);

  /* ---------------- Second brain (prior registry) ---------------- */
  let REGISTRY = [
    { id: "EXP-0114", mk: "UK", seg: "first",  fam: "discount", grade: "A", status: "done",    learn: "15% is 71% incremental, the strongest value creation in the portfolio." },
    { id: "EXP-0119", mk: "UK", seg: "repeat", fam: "discount", grade: "C", status: "done",    learn: "21% redemption but only ~31% incremental. High redemption was masking deadweight." },
    { id: "EXP-0126", mk: "UK", seg: "lapsed", fam: "discount", grade: "B", status: "running", learn: "Reactivation reads ~52% incremental. Test is still live, coordinate holdouts." },
    { id: "EXP-0122", mk: "DE", seg: "first",  fam: "discount", grade: "A", status: "done",    learn: "63% incremental, net positive. A safe base segment to test framing on." },
    { id: "QUAL-07",  mk: "DE", seg: "first",  fam: "fixed",    grade: "D", status: "note",    learn: "Qual interviews suggest German users prefer fixed value. Small, undated sample, hunch only." },
    { id: "EXP-0203", mk: "DE", seg: "repeat", fam: "fixed",    grade: "B", status: "done",    learn: "\u20AC10 fixed rollout underperformed: shown in \u00A3, worth less than 15%, and hit repeat buyers." },
    { id: "EXP-0128", mk: "FR", seg: "first",  fam: "discount", grade: "B", status: "done",    learn: "58%, but the holdout had targeting leakage. Directional only, fix measurement first." },
    { id: "EXP-0131", mk: "ES", seg: "first",  fam: "discount", grade: "C", status: "done",    learn: "48% incremental, clean but marginal. A good candidate for depth-elasticity testing." },
  ];
  const GW = { A: 1.5, B: 1, C: 0.5, D: 0 };
  function recall(mk, seg, fam) {
    return REGISTRY
      .map((p) => ({ p, s: (p.mk === mk ? 3 : 0) + (p.seg === seg ? 2 : 0) + (p.fam === fam ? 1 : 0) + (GW[p.grade] || 0) }))
      .filter((x) => x.s > 1).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.p);
  }

  /* ---------------- Silent sample-size (kept for credibility, not a control) ---------------- */
  function invNorm(p) {
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239e0];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
    const pl = 0.02425, ph = 1 - pl; let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if (p <= ph) { q = p - 0.5; r = q*q; return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  function samplePerArm(p1pct, mdePt) {
    const p1 = clamp(p1pct / 100, 0.01, 0.99), delta = mdePt / 100, p2 = clamp(p1 + delta, 0.01, 0.99);
    const zA = invNorm(0.975), zB = invNorm(0.8), pbar = (p1 + p2) / 2;
    const t = zA * Math.sqrt(2 * pbar * (1 - pbar)) + zB * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    return Math.ceil(((t * t) / (delta * delta)) / 100) * 100;
  }

  /* ---------------- Formatters ---------------- */
  const nf = new Intl.NumberFormat("en-GB");
  const fmtInt = (v) => nf.format(Math.round(v));
  function money(mk, v, dec) {
    const m = MARKETS[mk], neg = v < 0;
    return (neg ? "\u2212" : "") + m.sym + Math.abs(v).toLocaleString("en-GB", { maximumFractionDigits: dec || 0, minimumFractionDigits: dec || 0 });
  }
  function kMoney(mk, v) { const a = Math.abs(v); return MARKETS[mk].sym + (a >= 1000 ? (Math.round(a / 100) / 10) + "k" : Math.round(a)); }

  const GOALS = {
    margin: { chip: "Spend less, hold bookings", fam: "discount", hint: "biggest reclaimable spend first" },
    ltv:    { chip: "Grow lifetime value", fam: "fixed", hint: "most cash tied up in habit first" },
    growth: { chip: "Grow new-customer revenue", fam: "discount", hint: "most scalable demand first" },
  };

  /* ---------------- State ---------------- */
  let state = { goal: "margin", mk: "UK", seg: "repeat" };
  let saved = false;

  /* ---------------- Recommendation engine (pure) ---------------- */
  function recommend(goal, mk, seg) {
    const m = MARKETS[mk];
    const incr = incrOf(mk, seg), inc = incr.v, incEst = incr.est;
    const red = redOf(mk, seg), basket = basketOf(mk, seg).v, cvr = cvrOf(mk, seg);
    const dw = 100 - inc;
    const who = m.name + " " + SEGLOW[seg] + " buyers";
    const tier = inc >= 55 ? "high" : inc >= 40 ? "marg" : "low";

    const redeemers = 10000 * (red.v / 100);
    const spend15 = redeemers * (0.15 * basket);
    const deadweight = spend15 * (dw / 100);

    const nArm = samplePerArm(cvr.v, 1.5);
    const days = Math.max(5, Math.ceil((nArm * 2) / 2000));
    const wk = days <= 10 ? "~1\u20132 weeks" : days <= 24 ? "~" + Math.round(days / 7) + " weeks" : "~" + (Math.round(days / 7 * 10) / 10) + " weeks";
    const sizeRun = "A clean holdout reads in about <b>" + wk + "</b> (~" + fmtInt(nArm) + " travellers per arm, 95% confidence). Spec Studio sizes this for you, no stats homework.";

    const grade = incEst || m.directional ? "B" : "A";
    const conf = m.directional ? { word: "Low confidence", sub: "directional data, verify before acting", lvl: 2 }
      : incEst ? { word: "Medium confidence", sub: "segment estimated from first-purchase", lvl: 3 }
      : { word: "High confidence", sub: "grounded in a clean holdout", lvl: 5 };

    const R = { mk, seg, goal, incNum: inc, deadweight, spend15, grade, confidence: conf, size: sizeRun, watch: [], evFam: GOALS[goal].fam };

    // directional markets: measure first, whatever the goal
    if (m.directional) {
      R.verdict = "fix"; R.verdictLabel = "Fix the data first"; R.fit = "Fix";
      R.title = "Fix the measurement in " + m.name + " first";
      R.call = "The " + m.name + " read is directional only. Re-run a clean holdout before spending a slot.";
      R.hero = { big: inc + "%*", label: "current read, not yet trustworthy" };
      R.idea = "For <em>" + who + "</em>, we can\u2019t trust the incrementality read yet: the holdout had targeting leakage. The first move is a clean re-measurement, not an offer change.";
      R.why = [
        "The " + m.name + " incrementality (" + inc + "%) is flagged <b>directional only</b>, a measurement issue, not a finding.",
        "Evidence quality decides, not urgency: a flagged read can\u2019t justify a budget change.",
      ];
      R.test = { control: { tag: "Group A", name: "No offer (clean holdout, fixed targeting)" }, treatment: { tag: "Group B", name: "Current 15% discount, correctly exposed" } };
      R.primary = "A trustworthy incrementality read for " + m.name + " " + SEGLOW[seg];
      R.guardrail = "Exposure integrity, confirm no targeting leakage this time";
      R.outcome = [ { big: inc + "%*", label: "current read, directional only" }, { big: "1", label: "clean read unlocks the market" }, { big: kMoney(mk, deadweight), label: "spend/10k that\u2019s unmeasured" } ];
      R.size = "This is a measurement fix, not a powered offer test, run until exposure is clean, then size the real experiment.";
      R.watch = [{ level: "stop", title: "Directional data", body: m.name + " had holdout targeting issues. Don\u2019t cut, scale or roll anything out on it until the test is re-run. Grade capped at B." }];
      return R;
    }

    if (goal === "margin") {
      if (tier === "low") {
        R.verdict = "run"; R.verdictLabel = "Run this"; R.fit = "Run";
        R.title = "Stop paying " + m.name + " " + SEGLOW[seg] + " buyers to book";
        R.call = "The clearest waste in the portfolio. A 0% holdout banks the saving as evidence, base protected.";
        R.hero = { big: kMoney(mk, deadweight), label: "reclaimable per 10k travellers" };
        R.idea = "For <em>" + who + "</em>, <b>removing the 15% discount</b> should barely dent bookings, only ~" + inc + "% of redemptions are truly incremental. The other " + dw + "% is spent on people who\u2019d have booked anyway.";
        R.why = [
          "Only <b>" + inc + "% incremental</b>: most of this discount changes nothing.",
          "It answers Finance directly: spend less without losing real bookings.",
        ];
        R.test = { control: { tag: "Control", name: "Keep 15% (status quo)" }, treatment: { tag: "Test", name: "0% holdout, plus a non-cash perk arm (free cancellation / points)" } };
        R.primary = "Incrementality: did bookings actually fall without the discount?";
        R.guardrail = "28-day retention, so we don\u2019t win the saving and lose the customer";
        R.outcome = [ { big: dw + "%", label: "of spend looks like deadweight" }, { big: kMoney(mk, deadweight), label: "reclaimable per 10k" }, { big: inc + "%", label: "truly incremental today" } ];
      } else if (tier === "marg") {
        R.verdict = "run"; R.verdictLabel = "Run this"; R.fit = "Run";
        R.title = "Find the shallower price that still works in " + m.name;
        R.call = "Don\u2019t cut blind. Test the depth: a cheaper discount likely holds the same bookings.";
        R.hero = { big: kMoney(mk, spend15 * 0.33), label: "saving per 10k if bookings hold" };
        R.idea = "For <em>" + who + "</em>, a <b>10% discount instead of 15%</b> should hold bookings while cutting promo cost by a third, because acquisition is less depth-sensitive than the flat rate assumes.";
        R.why = [
          "Incrementality is <b>" + inc + "%</b>: real, but not enough to justify the full 15%.",
          "Cleaner and safer than an all-or-nothing cut.",
        ];
        R.test = { control: { tag: "Control", name: "15% discount (status quo)" }, treatment: { tag: "Test", name: "10% discount \u00B7 " + money(mk, 0.10 * basket, 2) + " avg" } };
        R.primary = "Booking rate held at the lower depth";
        R.guardrail = "Downstream CLV, not just first-booking volume";
        R.outcome = [ { big: "\u221233%", label: "promo cost per booking" }, { big: kMoney(mk, spend15 * 0.33), label: "potential saving / 10k" }, { big: inc + "%", label: "incremental today" } ];
      } else {
        R.verdict = "rethink"; R.verdictLabel = "Look elsewhere"; R.fit = "Protect";
        R.title = "Don\u2019t cut here. This discount is working";
        R.call = "Value-creating spend. Protect it and find savings on low-incrementality repeat buyers instead.";
        R.hero = { big: inc + "%", label: "incremental, protect this spend" };
        R.idea = "For <em>" + who + "</em>, the 15% is <b>" + inc + "% incremental</b>, it genuinely causes bookings. Cutting it to save money would lose real revenue. The waste lives in repeat segments, not here.";
        R.why = [
          "<b>" + inc + "% incremental</b>: among the strongest cells in the portfolio.",
          "Redirect the hunt for savings to repeat buyers (~28\u201331% incremental).",
        ];
        R.test = { control: { tag: "Control", name: "Keep 15%, protect this segment" }, treatment: { tag: "If you must", name: "Small 0% holdout to confirm, expecting a real drop" } };
        R.primary = "Confirmation that cutting would cost bookings (not a saving)";
        R.guardrail = "Acquisition volume, the thing you\u2019d be risking";
        R.outcome = [ { big: inc + "%", label: "incremental, keep it" }, { big: kMoney(mk, spend15 - deadweight), label: "value-creating spend / 10k" }, { big: "repeat", label: "where savings actually are" } ];
      }
    }

    else if (goal === "ltv") {
      if (seg === "repeat") {
        R.verdict = "run"; R.verdictLabel = "Run this"; R.fit = "Run";
        R.title = "Swap cash for loyalty on " + m.name + " repeat buyers";
        R.call = "Stop discounting habit. Replace the cash discount with a perk and measure whether they stay.";
        R.hero = { big: kMoney(mk, deadweight), label: "cash freed per 10k to reinvest" };
        R.idea = "For <em>" + who + "</em>, <b>a non-cash perk</b> (loyalty points or free cancellation) should hold repeat rate as well as the 15% discount, at far lower cash cost, only ~" + inc + "% of the discount is incremental anyway.";
        R.why = [
          "Repeat discounts are only <b>" + inc + "% incremental</b>: mostly subsidising loyalty we already have.",
          "A perk builds relationship value instead of training price sensitivity.",
        ];
        R.test = { control: { tag: "Control", name: "15% cash discount (status quo)" }, treatment: { tag: "Test", name: "Cost-matched non-cash perk (points / free cancellation)" } };
        R.primary = "Repeat-booking rate and 90-day retained value (not next booking alone)";
        R.guardrail = "Churn, confirm the perk doesn\u2019t quietly push loyalists away";
        R.outcome = [ { big: kMoney(mk, deadweight), label: "cash freed per 10k" }, { big: dw + "%", label: "of discount was deadweight" }, { big: "CLV", label: "the metric that matters" } ];
      } else {
        R.verdict = "run"; R.verdictLabel = "Run this"; R.fit = "Run";
        R.title = "Acquire " + m.name + " " + SEGLOW[seg] + " buyers worth keeping";
        R.call = "Judge the offer on the value of who it brings in, not the first booking. Optimise for CLV.";
        R.hero = { big: inc + "%", label: "incremental, acquire for lifetime value" };
        R.idea = "For <em>" + who + "</em>, the same 15% offer aimed at <b>higher-intent travellers</b> should acquire customers with better lifetime value, even if the first-booking metric looks similar. We measure the customer, not the transaction.";
        R.why = [
          "First-booking value is a snapshot; a " + inc + "%-incremental offer can still acquire high-CLV travellers.",
          "Sets up a CLV baseline the second brain can compound on.",
        ];
        R.test = { control: { tag: "Control", name: "15% to the broad " + SEGLOW[seg] + " audience" }, treatment: { tag: "Test", name: "15% to a high-intent sub-audience, CLV tracked" } };
        R.primary = "90-day / 12-month downstream CLV of acquired customers";
        R.guardrail = "Blended CAC, keep acquisition cost honest";
        R.outcome = [ { big: inc + "%", label: "incremental at 15% today" }, { big: "CLV", label: "the primary read" }, { big: kMoney(mk, spend15), label: "spend/10k to make count" } ];
      }
    }

    else {
      if (seg === "repeat") {
        R.verdict = "rethink"; R.verdictLabel = "Wrong lever"; R.fit = "Skip";
        R.title = "Repeat discounts won\u2019t grow new revenue";
        R.call = "Discounting people who already buy doesn\u2019t create growth. Redirect this budget to acquisition.";
        R.hero = { big: inc + "%", label: "incremental, too low to grow on" };
        R.idea = "For <em>" + who + "</em>, a discount mostly subsidises existing behaviour (only ~" + inc + "% incremental). For new revenue, the budget belongs on first-purchase acquisition, where the discount actually moves people.";
        R.why = [
          "Repeat buyers are <b>" + inc + "% incremental</b>: little new demand to unlock.",
          "Growth comes from new travellers, not paying loyal ones again.",
        ];
        R.test = { control: { tag: "Control", name: "Keep 15% on repeat (status quo)" }, treatment: { tag: "Redirect", name: "Move budget to first-purchase acquisition, measure net-new bookings" } };
        R.primary = "Net-new customer bookings from the redirected budget";
        R.guardrail = "Repeat retention, confirm pulling back doesn\u2019t hurt loyalty";
        R.outcome = [ { big: inc + "%", label: "incremental, low for growth" }, { big: kMoney(mk, deadweight), label: "budget to redeploy / 10k" }, { big: "first", label: "where new revenue lives" } ];
      } else if (tier === "high") {
        R.verdict = "run"; R.verdictLabel = "Run this"; R.fit = "Run";
        R.title = "Scale acquisition in " + m.name + " for less";
        R.call = "This segment converts on the offer. Find the efficient depth to acquire more per pound.";
        R.hero = { big: inc + "%", label: "incremental, scalable demand" };
        R.idea = "For <em>" + who + "</em>, testing <b>10% vs 15%</b> should reveal how shallow a discount still acquires, letting you grow new bookings at a lower cost per acquisition (it\u2019s " + inc + "% incremental today).";
        R.why = [
          "Strong <b>" + inc + "% incrementality</b>: the offer genuinely drives new bookings.",
          "Finding the efficient depth grows volume without growing spend.",
        ];
        R.test = { control: { tag: "Control", name: "15% discount (status quo)" }, treatment: { tag: "Test", name: "10% discount, plus a spend-threshold variant" } };
        R.primary = "Cost per incremental acquisition across depths";
        R.guardrail = "Downstream CLV of the cheaper-acquired cohort";
        R.outcome = [ { big: inc + "%", label: "incremental, strong" }, { big: "\u221233%", label: "target cost per booking" }, { big: kMoney(mk, spend15 * 0.33), label: "efficiency upside / 10k" } ];
      } else {
        R.verdict = "run"; R.verdictLabel = "Run this"; R.fit = "Run";
        R.title = "Test how shallow a discount still acquires in " + m.name;
        R.call = "A clean, marginal market on the lowest basket, ideal for mapping the efficiency frontier.";
        R.hero = { big: inc + "%", label: "incremental, clean, test the depth" };
        R.idea = "For <em>" + who + "</em>, testing <b>10% vs 15%</b> (plus a spend threshold) finds the shallowest depth that still acquires, so new-customer revenue grows more efficiently. Incrementality here is " + inc + "%.";
        R.why = [
          "Marginal but <b>clean</b> (" + inc + "% incremental), safe to experiment on.",
          "Low basket (" + money(mk, basket, 0) + ") makes discount depth the key lever.",
        ];
        R.test = { control: { tag: "Control", name: "15% discount (status quo)" }, treatment: { tag: "Test", name: "10% discount \u00B7 " + money(mk, 0.10 * basket, 2) + ", plus a " + money(mk, 10, 0) + "-off threshold" } };
        R.primary = "Discount depth vs cost per acquired booking";
        R.guardrail = "Acquisition volume, don\u2019t under-discount into a stall";
        R.outcome = [ { big: inc + "%", label: "incremental, clean read" }, { big: "\u221233%", label: "target cost per booking" }, { big: money(mk, basket, 0), label: "basket, depth matters most" } ];
      }
    }

    // Germany fixed-value angle
    if (mk === "DE" && seg === "first" && goal !== "ltv") {
      R.watch.push({ level: "warn", title: "Consider a fixed-value framing arm too", body: "Qual research (grade D) hints German users prefer a fixed \u20AC voucher over a percentage. Worth a cost-matched arm here, but test it, don\u2019t assume it, and keep the value equal to avoid the \u20AC10 rollout mistake." });
    }
    if (incEst) {
      R.watch.push({ level: "warn", title: "This segment is estimated", body: "We don\u2019t have a direct read for " + m.name + " " + SEGLOW[seg] + "; it\u2019s inferred from first-purchase behaviour. Treat the numbers as a starting assumption and confirm on the live test. Grade capped at B." });
    }
    return R;
  }

  /* ---------------- Opportunity ranking (data-driven) ---------------- */
  function opportunities(goal) {
    return OBSERVED.map(([mk, seg]) => {
      const R = recommend(goal, mk, seg);
      let score;
      if (goal === "margin") score = R.verdict === "rethink" ? 0 : R.deadweight;
      else if (goal === "ltv") score = R.deadweight * (seg === "repeat" ? 1.25 : seg === "lapsed" ? 1 : 0.45);
      else score = R.verdict === "rethink" ? 0 : R.incNum * (seg === "first" ? 1 : seg === "lapsed" ? 0.4 : 0.2);
      if (MARKETS[mk].directional) score *= 0.2;
      let metric;
      if (R.verdict === "fix") metric = R.incNum + "%*, fix data first";
      else if (goal === "margin") metric = R.verdict === "rethink" ? "Working, protect it" : kMoney(mk, R.deadweight) + " waste to reclaim";
      else if (goal === "ltv") metric = kMoney(mk, R.deadweight) + " cash tied up in habit";
      else metric = R.verdict === "rethink" ? "Wrong lever for growth" : R.incNum + "% incremental demand";
      return { mk, seg, R, score, metric };
    }).sort((a, b) => b.score - a.score).slice(0, 3);
  }

  /* ---------------- Render ---------------- */
  let lastR = null;
  function bubbles(level) {
    const variant = level >= 4 ? "pos" : level <= 2 ? "warnb" : "";
    let s = '<span class="bubbles ' + variant + '">';
    for (let i = 0; i < 5; i++) s += "<i" + (i < level ? ' class="on"' : "") + "></i>";
    return s + "</span>";
  }
  function setText(id, v) { const e = $("#" + id); if (e) e.textContent = v; }

  function renderOpps() {
    const list = $("#oppList"); if (!list) return;
    const opps = opportunities(state.goal);
    setText("oppHint", "\u00B7 " + GOALS[state.goal].hint);
    list.innerHTML = opps.map((o, i) => {
      const active = (o.mk === state.mk && o.seg === state.seg) ? " is-active" : "";
      return '<button class="ss-opp' + active + '" type="button" data-mk="' + o.mk + '" data-seg="' + o.seg + '">' +
        '<span class="opp-rank">' + (i + 1) + '</span>' +
        '<span class="opp-flag" aria-hidden="true">' + MARKETS[o.mk].flag + '</span>' +
        '<span class="opp-main"><b>' + MARKETS[o.mk].code + " \u00B7 " + SEGMENTS[o.seg] + '</b><span class="opp-metric">' + o.metric + '</span></span>' +
        '<span class="opp-fit ' + o.R.verdict + '">' + o.R.fit + '</span>' +
        '</button>';
    }).join("");
    $$(".ss-opp", list).forEach((btn) => btn.addEventListener("click", () => {
      state.mk = btn.dataset.mk; state.seg = btn.dataset.seg; saved = false;
      syncUI(); render();
    }));
  }

  function render() {
    const R = recommend(state.goal, state.mk, state.seg); lastR = R;

    setText("goalChip", GOALS[state.goal].chip);
    setText("briefDate", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
    setText("briefTitle", R.title);

    $("#recBanner").className = "ss-decision " + R.verdict;
    setText("recVerdict", R.verdictLabel);
    setText("recCall", R.call);
    $("#confChip").innerHTML = bubbles(R.confidence.lvl) + "<b>" + R.confidence.word + "</b><span>&middot; " + R.confidence.sub + "</span>";
    $("#heroBig").textContent = R.hero.big;
    setText("heroLabel", R.hero.label);

    $("#docIdea").innerHTML = R.idea;
    $("#docWhy").innerHTML = R.why.map((w) => "<li><span>" + w + "</span></li>").join("");

    $("#docTest").innerHTML =
      '<div class="ss-test-card control"><span class="tc-tag">' + R.test.control.tag + '</span><div class="tc-name">' + R.test.control.name + '</div></div>' +
      '<div class="ss-test-vs">vs</div>' +
      '<div class="ss-test-card"><span class="tc-tag">' + R.test.treatment.tag + '</span><div class="tc-name">' + R.test.treatment.name + '</div></div>';
    $("#docKnow").innerHTML =
      '<div class="ss-know-row"><span class="kk">How we\u2019ll know</span><span><b>' + R.primary + '</b></span></div>' +
      '<div class="ss-know-row"><span class="kk guard">Guardrail</span><span>' + R.guardrail + '</span></div>';

    const priors = recall(state.mk, state.seg, R.evFam);
    setText("evidenceHead", priors.length ? "Evidence we already have (" + priors.length + ")" : "Evidence we already have");
    const ev = $("#docEvidence");
    if (!priors.length) ev.innerHTML = '<div class="ss-ev-empty">Nothing closely related yet. Treat the result as a first data point and grade it carefully when it reads.</div>';
    else ev.innerHTML = priors.map((p) => {
      const tag = p.status === "running" ? '<span class="ss-ev-tag run">Live now</span>' : p.status === "note" ? '<span class="ss-ev-tag">Qual note</span>' : '<span class="ss-ev-tag">' + MARKETS[p.mk].code + " \u00B7 " + SEGMENTS[p.seg] + "</span>";
      return '<div class="ss-ev"><div class="ss-ev-grade grade-' + p.grade + '">' + p.grade + '</div><div class="ss-ev-main"><div class="em-id">' + p.id + '</div><div class="em-learn">' + p.learn + '</div></div>' + tag + '</div>';
    }).join("");

    $("#docOutcome").innerHTML = R.outcome.map((o) => '<div class="ss-oc"><b>' + o.big + '</b><span>' + o.label + '</span></div>').join("");
    $("#sizeLine").innerHTML = R.size;

    const watchSec = $("#watchSec"), watch = $("#docWatch");
    if (R.watch.length) {
      watchSec.hidden = false;
      watch.innerHTML = R.watch.map((w) => '<div class="ss-watch-item ' + (w.level === "stop" ? "stop" : "") + '"><span class="wi" aria-hidden="true">' + (w.level === "stop" ? "\u2715" : "!") + '</span><div><div class="wt">' + w.title + '</div><div class="wb">' + w.body + '</div></div></div>').join("");
    } else { watchSec.hidden = true; watch.innerHTML = ""; }

    const gradeEl = $("#briefGrade");
    gradeEl.className = "ss-grade g-" + R.grade;
    gradeEl.textContent = "Evidence grade " + R.grade;
    setText("briefStatus", saved ? "Saved to second brain" : "Draft for review");

    const badge = $("#liveBadge");
    if (badge) badge.innerHTML = bubbles(R.confidence.lvl) + "<span>Grade " + R.grade + " brief</span>";

    // keep opportunity highlight in sync
    $$(".ss-opp").forEach((b) => b.classList.toggle("is-active", b.dataset.mk === state.mk && b.dataset.seg === state.seg));
  }

  /* ---------------- Export ---------------- */
  function briefObject() {
    const R = lastR || recommend(state.goal, state.mk, state.seg);
    const priors = recall(state.mk, state.seg, R.evFam);
    return {
      generatedAt: new Date().toISOString(),
      goal: GOALS[state.goal].chip, market: MARKETS[state.mk].name, customer: SEGMENTS[state.seg],
      recommendation: R.verdictLabel, headline: R.hero.big + " " + R.hero.label, title: R.title, call: R.call,
      confidence: R.confidence.word + " (" + R.confidence.sub + ")",
      idea: $("#docIdea").textContent,
      why: R.why.map((w) => w.replace(/<[^>]+>/g, "")),
      test: { control: R.test.control.name, treatment: R.test.treatment.name },
      howWeKnow: R.primary, guardrail: R.guardrail,
      evidence: priors.map((p) => ({ id: p.id, grade: p.grade, status: p.status, learning: p.learn })),
      expectedOutcome: R.outcome.map((o) => o.big + " " + o.label),
      watchOuts: R.watch.map((w) => w.title + ": " + w.body),
      evidenceGrade: R.grade, status: saved ? "saved" : "draft",
    };
  }
  function toMarkdown() {
    const o = briefObject();
    let md = "# " + o.title + "\n\n";
    md += "> **" + o.recommendation + "**, " + o.call + "  \n> **Headline:** " + o.headline + " \u00B7 **" + o.confidence + "**\n\n";
    md += "**Goal:** " + o.goal + " \u00B7 **Market:** " + o.market + " \u00B7 **Customer:** " + o.customer + "  \n";
    md += "**Evidence grade:** " + o.evidenceGrade + " \u00B7 **Status:** " + o.status + " \u00B7 " + o.generatedAt + "\n\n";
    md += "## The idea\n" + o.idea + "\n\n";
    md += "## Why this, why now\n"; o.why.forEach((w) => md += "- " + w + "\n");
    md += "\n## The test\n- **Control:** " + o.test.control + "\n- **Test:** " + o.test.treatment + "\n";
    md += "- **How we\u2019ll know:** " + o.howWeKnow + "\n- **Guardrail:** " + o.guardrail + "\n\n";
    md += "## Evidence we already have\n";
    if (o.evidence.length) o.evidence.forEach((p) => md += "- [" + p.grade + "] " + p.id + " (" + p.status + "), " + p.learning + "\n");
    else md += "- None closely related.\n";
    md += "\n## Expected outcome\n"; o.expectedOutcome.forEach((x) => md += "- " + x + "\n");
    if (o.watchOuts.length) { md += "\n## Before you run it\n"; o.watchOuts.forEach((w) => md += "- " + w + "\n"); }
    return md;
  }
  function download(name, mime, content) {
    const blob = new Blob([content], { type: mime }), url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  /* ---------------- Toast ---------------- */
  let toastTimer = null;
  function toast(html) {
    const t = $("#toast"); if (!t) return;
    t.innerHTML = html; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 4200);
  }

  /* ---------------- Wiring ---------------- */
  function wire() {
    $$(".ss-goal").forEach((b) => b.addEventListener("click", () => {
      state.goal = b.dataset.goal;
      $$(".ss-goal").forEach((x) => { const on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
      // jump to the top opportunity for the new goal
      const top = opportunities(state.goal)[0];
      if (top) { state.mk = top.mk; state.seg = top.seg; }
      saved = false; syncUI(); renderOpps(); render();
    }));
    $$(".ss-mk").forEach((b) => b.addEventListener("click", () => { state.mk = b.dataset.mk; setActive(".ss-mk", b); saved = false; render(); }));
    $$(".ss-seg").forEach((b) => b.addEventListener("click", () => { state.seg = b.dataset.seg; setActive(".ss-seg", b); saved = false; render(); }));

    const rt = $("#refineToggle");
    if (rt) rt.addEventListener("click", () => {
      const panel = $("#refinePanel"), open = panel.hidden;
      panel.hidden = !open;
      rt.setAttribute("aria-expanded", open ? "true" : "false");
      rt.querySelector(".chev").textContent = open ? "\u2212" : "+";
    });

    $("#saveBtn").addEventListener("click", () => {
      const R = lastR || recommend(state.goal, state.mk, state.seg);
      saved = true;
      const id = "EXP-" + Math.floor(1000 + Math.random() * 8999);
      REGISTRY.unshift({ id, mk: state.mk, seg: state.seg, fam: R.evFam, grade: "pending", status: "done", learn: "Saved brief: " + GOALS[state.goal].chip + " \u00B7 " + MARKETS[state.mk].name + " " + SEGLOW[state.seg] + ". Grade pending the result." });
      render();
      toast("Saved to the second brain as <b>" + id + "</b>, the next related goal will recall it.");
    });
    $("#copyMd").addEventListener("click", () => {
      const md = toMarkdown();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(md).then(() => toast("Copied, paste straight into the wiki."), () => download("experiment-brief.md", "text/markdown", md));
      else download("experiment-brief.md", "text/markdown", md);
    });
    $("#exportJson").addEventListener("click", () => download("experiment-brief.json", "application/json", JSON.stringify(briefObject(), null, 2)));
    $("#printBtn").addEventListener("click", () => window.print());
  }
  function setActive(sel, btn) { $$(sel).forEach((b) => { const on = b === btn; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); }); }
  function syncUI() {
    $$(".ss-goal").forEach((b) => { const on = b.dataset.goal === state.goal; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    $$(".ss-mk").forEach((b) => { const on = b.dataset.mk === state.mk; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    $$(".ss-seg").forEach((b) => { const on = b.dataset.seg === state.seg; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  }

  /* ---------------- Shared chrome ---------------- */
  function chrome() {
    const nav = $("#nav"), progress = $("#progress");
    function onScroll() {
      const st = window.scrollY || document.documentElement.scrollTop;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
      if (nav) nav.classList.toggle("scrolled", st > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    const navToggle = $("#navToggle"), navLinks = $("#navLinks");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
      $$("#navLinks a").forEach((a) => a.addEventListener("click", () => navLinks.classList.remove("open")));
    }
    const obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } }), { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach((el) => obs.observe(el));
  }

  function init() { chrome(); wire(); syncUI(); renderOpps(); render(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* =========================================================
   Persona Lab - pre-launch incentive simulator
   Tripadvisor x Adrien Enjalbert - AI Personalization case study
   A functional, transparent, client-side simulation of how each
   market persona would react to a percentage or fixed-value offer.
   All numbers are anchored to the observed flat-15% case data.
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------------- Data foundation (observed at flat 15%) ---------------- */
  // basket in local currency, redemption %, incrementality %, directional flag
  const MARKETS = {
    UK: { name: "United Kingdom", flag: "\uD83C\uDDEC\uD83C\uDDE7", code: "UK", ccy: "GBP", sym: "\u00A3", base: 5 },
    FR: { name: "France",        flag: "\uD83C\uDDEB\uD83C\uDDF7", code: "FR", ccy: "EUR", sym: "\u20AC", base: 2, directional: true },
    DE: { name: "Germany",       flag: "\uD83C\uDDE9\uD83C\uDDEA", code: "DE", ccy: "EUR", sym: "\u20AC", base: 5 },
    IT: { name: "Italy",         flag: "\uD83C\uDDEE\uD83C\uDDF9", code: "IT", ccy: "EUR", sym: "\u20AC", base: 2, directional: true },
    ES: { name: "Spain",         flag: "\uD83C\uDDEA\uD83C\uDDF8", code: "ES", ccy: "EUR", sym: "\u20AC", base: 4 },
  };
  const MARKET_ORDER = ["UK", "DE", "FR", "IT", "ES"];
  const SEGMENTS = { first: "First purchase", lapsed: "Lapsed", repeat: "Repeat" };

  // Observed cells only. Missing cells are estimated from UK-derived segment factors.
  const OBSERVED = {
    "UK|first":  { basket: 95,  red: 18, incr: 71 },
    "UK|lapsed": { basket: 110, red: 14, incr: 52 },
    "UK|repeat": { basket: 130, red: 21, incr: 31 },
    "DE|first":  { basket: 102, red: 11, incr: 63 },
    "DE|repeat": { basket: 120, red: 14, incr: 28 },
    "FR|first":  { basket: 88,  red: 12, incr: 58 },
    "FR|lapsed": { basket: 92,  red: 9,  incr: 44 },
    "IT|first":  { basket: 79,  red: 10, incr: 51 },
    "ES|first":  { basket: 75,  red: 9,  incr: 48 },
  };
  // Segment factors derived from the UK cells (the only market with all three).
  const SEG_FACTOR = {
    first:  { basket: 1,    red: 1,    incr: 1 },
    lapsed: { basket: 1.16, red: 0.78, incr: 0.73 }, // UK lapsed / UK first
    repeat: { basket: 1.37, red: 1.17, incr: 0.44 }, // UK repeat / UK first
  };

  function getCell(market, seg) {
    const key = market + "|" + seg;
    if (OBSERVED[key]) {
      return Object.assign({ estimated: false }, OBSERVED[key]);
    }
    // estimate from this market's first-purchase anchor
    const first = OBSERVED[market + "|first"];
    const f = SEG_FACTOR[seg];
    return {
      estimated: true,
      basket: Math.round(first.basket * f.basket),
      red: +(first.red * f.red).toFixed(1),
      incr: Math.round(first.incr * f.incr),
    };
  }

  function confidenceOf(market, seg, cell) {
    const m = MARKETS[market];
    let c = m.base;
    if (cell.estimated) c -= 1;
    if (seg !== "first") c -= 1;
    if (m.directional) c = Math.min(c, 2);
    return clamp(c, 1, 5);
  }

  /* ---------------- Formatters ---------------- */
  const nf = new Intl.NumberFormat("en-GB");
  const fmtInt = (v) => nf.format(Math.round(v));
  function fmtMoney(market, v, dec) {
    const m = MARKETS[market];
    const neg = v < 0;
    const s = Math.abs(v).toLocaleString("en-GB", { maximumFractionDigits: dec || 0, minimumFractionDigits: dec || 0 });
    return (neg ? "\u2212" : "") + m.sym + s;
  }
  const fmtPct = (v, dec) => (v).toFixed(dec || 0) + "%";

  /* ---------------- The model ---------------- */
  function compute(market, seg, state) {
    const cell = getCell(market, seg);
    const b = cell.basket;
    const r0 = cell.red, i0 = cell.incr;
    let d, promoCost, voucher = null;
    if (state.offer === "fixed") {
      voucher = state.voucher;
      d = clamp((voucher / b) * 100, 0, 30);
      promoCost = voucher;
    } else {
      d = state.depth;
      promoCost = (d / 100) * b;
    }

    const out = {
      market, seg, meta: MARKETS[market], cell,
      effDepth: d, voucher, promoCost,
      confidence: confidenceOf(market, seg, cell),
      directional: !!MARKETS[market].directional,
      estimated: cell.estimated,
      fixedBonus: false,
    };

    if (d <= 0.1) {
      Object.assign(out, {
        uptake: 0, incr: 0, redeemers: 0, incrementalBookings: 0,
        totalSpend: 0, deadweightSpend: 0, deadweightShare: 0,
        costPerIncr: null, incrementalRevenue: 0, netIncremental: 0,
        verdict: "hold", holdout: true,
      });
      return out;
    }

    let uptake = clamp(r0 * Math.pow(d / 15, state.beta), 0, 50);
    let incr = clamp(i0 * Math.pow(15 / d, state.gamma), 0, 92);
    // Fixed-value framing bonus: qualitative signal, Germany first purchase only.
    if (state.offer === "fixed" && market === "DE" && seg === "first") {
      incr = clamp(incr * 1.08, 0, 92);
      out.fixedBonus = true;
    }

    const redeemers = state.audience * (uptake / 100);
    const incrementalBookings = redeemers * (incr / 100);
    const totalSpend = redeemers * promoCost;
    const deadweightShare = 100 - incr;
    const deadweightSpend = totalSpend * (deadweightShare / 100);
    const costPerIncr = incrementalBookings > 0 ? totalSpend / incrementalBookings : null;
    const incrementalRevenue = incrementalBookings * b;
    const netIncremental = incrementalRevenue * state.margin - totalSpend;
    const verdict = incr >= 55 ? "pos" : incr >= 40 ? "marg" : "neg";

    Object.assign(out, {
      uptake, incr, redeemers, incrementalBookings, totalSpend,
      deadweightSpend, deadweightShare, costPerIncr, incrementalRevenue,
      netIncremental, verdict,
    });
    return out;
  }

  // Net incremental revenue at an arbitrary percentage depth (for the curve).
  function netAtDepth(market, seg, d, state) {
    const cell = getCell(market, seg);
    const b = cell.basket;
    if (d <= 0.1) return 0;
    const uptake = clamp(cell.red * Math.pow(d / 15, state.beta), 0, 50);
    let incr = clamp(cell.incr * Math.pow(15 / d, state.gamma), 0, 92);
    const redeemers = state.audience * (uptake / 100);
    const incrementalBookings = redeemers * (incr / 100);
    const totalSpend = redeemers * ((d / 100) * b);
    return incrementalBookings * b * state.margin - totalSpend;
  }

  /* ---------------- SVG helpers ---------------- */
  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function drawCurve(svgId, market, seg, state, animate) {
    const svg = $("#" + svgId);
    if (!svg) return;
    svg.innerHTML = "";
    const W = 520, H = 280, pl = 52, pr = 20, pt = 22, pb = 40;
    const plotW = W - pl - pr, plotH = H - pt - pb;

    const pts = [];
    for (let d = 0; d <= 30; d += 1) pts.push({ x: d, y: netAtDepth(market, seg, d, state) });
    let maxY = Math.max.apply(null, pts.map((p) => p.y));
    let minY = Math.min.apply(null, pts.map((p) => p.y));
    if (maxY === minY) maxY = minY + 1;
    // pad and always include zero
    maxY = Math.max(maxY, 0); minY = Math.min(minY, 0);
    const pad = (maxY - minY) * 0.12 || 1;
    maxY += pad; minY -= pad;

    const sx = (x) => pl + (x / 30) * plotW;
    const sy = (y) => pt + plotH - ((y - minY) / (maxY - minY)) * plotH;

    // gridlines + y labels
    for (let g = 0; g <= 4; g++) {
      const yv = minY + ((maxY - minY) / 4) * g;
      const y = sy(yv);
      svg.appendChild(el("line", { class: "psvg-grid", x1: pl, y1: y, x2: W - pr, y2: y }));
      const t = el("text", { class: "psvg-axis", x: pl - 8, y: y + 3, "text-anchor": "end" });
      t.textContent = fmtMoney(market, yv, 0);
      svg.appendChild(t);
    }
    // zero line emphasis
    const zy = sy(0);
    svg.appendChild(el("line", { class: "psvg-zero", x1: pl, y1: zy, x2: W - pr, y2: zy }));

    // x labels
    [0, 10, 15, 20, 30].forEach((d) => {
      const t = el("text", { class: "psvg-axis", x: sx(d), y: H - 14, "text-anchor": "middle" });
      t.textContent = d + "%";
      svg.appendChild(t);
    });

    // area + line
    let dLine = "", dArea = "M" + sx(0) + " " + sy(0);
    pts.forEach((p, i) => {
      dLine += (i === 0 ? "M" : "L") + sx(p.x) + " " + sy(p.y) + " ";
      dArea += "L" + sx(p.x) + " " + sy(p.y) + " ";
    });
    dArea += "L" + sx(30) + " " + sy(0) + " Z";

    const grad = el("linearGradient", { id: svgId + "-fill", x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(el("stop", { offset: "0", "stop-color": "#34E0A1", "stop-opacity": ".28" }));
    grad.appendChild(el("stop", { offset: "1", "stop-color": "#34E0A1", "stop-opacity": "0" }));
    const defs = el("defs", {}); defs.appendChild(grad); svg.appendChild(defs);
    svg.appendChild(el("path", { d: dArea, fill: "url(#" + svgId + "-fill)", stroke: "none" }));
    const line = el("path", { d: dLine, fill: "none", stroke: "#00976E", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" });
    svg.appendChild(line);

    // peak marker
    let peak = pts[0];
    pts.forEach((p) => { if (p.y > peak.y) peak = p; });
    if (peak.y > 0) {
      svg.appendChild(el("circle", { cx: sx(peak.x), cy: sy(peak.y), r: 4, fill: "#00976E" }));
      const pl2 = el("text", { class: "psvg-peak", x: sx(peak.x), y: sy(peak.y) - 10, "text-anchor": "middle" });
      pl2.textContent = "peak " + peak.x + "%";
      svg.appendChild(pl2);
    }

    // current marker
    const cx = clamp(state.offer === "fixed" ? (compute(market, seg, state).effDepth) : state.depth, 0, 30);
    const cyVal = netAtDepth(market, seg, cx, state);
    svg.appendChild(el("line", { class: "psvg-cur", x1: sx(cx), y1: pt, x2: sx(cx), y2: pt + plotH }));
    svg.appendChild(el("circle", { cx: sx(cx), cy: sy(cyVal), r: 5, fill: "#0a1512", stroke: "#34E0A1", "stroke-width": 2 }));

    if (animate && !reduce) {
      const len = line.getTotalLength();
      line.style.transition = "none";
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      requestAnimationFrame(() => {
        line.style.transition = "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)";
        line.style.strokeDashoffset = "0";
      });
    }
  }

  function drawBars(svgId, items, animate) {
    const svg = $("#" + svgId);
    if (!svg) return;
    svg.innerHTML = "";
    const W = 520, H = 280, pl = 34, pr = 14, pt = 20, pb = 46;
    const plotW = W - pl - pr, plotH = H - pt - pb;
    const max = Math.max.apply(null, items.map((d) => d.value)) * 1.18 || 1;
    const n = items.length, slot = plotW / n, bw = slot * 0.5;

    for (let g = 0; g <= 4; g++) {
      const y = pt + (plotH / 4) * g;
      svg.appendChild(el("line", { class: "psvg-grid", x1: pl, y1: y, x2: W - pr, y2: y }));
    }
    items.forEach((d, i) => {
      const x = pl + slot * i + (slot - bw) / 2;
      const bh = (d.value / max) * plotH;
      const r = el("rect", { class: "psvg-bar", x: x, y: pt + plotH - (animate && !reduce ? 0 : bh), width: bw, height: animate && !reduce ? 0 : bh, rx: 5, fill: d.color });
      if (d.dashed) { r.setAttribute("fill-opacity", ".5"); r.setAttribute("stroke", d.color); r.setAttribute("stroke-width", "1.5"); r.setAttribute("stroke-dasharray", "4 3"); }
      if (d.current) { r.setAttribute("stroke", "#0a1512"); r.setAttribute("stroke-width", "2.5"); }
      svg.appendChild(r);
      const lab = el("text", { class: "psvg-val", x: x + bw / 2, y: pt + plotH - bh - 8, "text-anchor": "middle" });
      lab.textContent = Math.round(d.value) + "%" + (d.directional ? "*" : "");
      svg.appendChild(lab);
      const cat = el("text", { class: "psvg-axis", x: x + bw / 2, y: H - 26, "text-anchor": "middle" });
      cat.textContent = d.label;
      svg.appendChild(cat);
      const cat2 = el("text", { class: "psvg-cat2", x: x + bw / 2, y: H - 12, "text-anchor": "middle" });
      cat2.textContent = d.sub || "";
      svg.appendChild(cat2);
      if (animate && !reduce) {
        setTimeout(() => {
          r.style.transition = "height .8s cubic-bezier(.22,1,.36,1), y .8s cubic-bezier(.22,1,.36,1)";
          r.setAttribute("height", bh); r.setAttribute("y", pt + plotH - bh);
        }, i * 70);
      }
    });
  }

  /* ---------------- Confidence bubbles ---------------- */
  function bubbles(level) {
    const variant = level >= 4 ? "pos" : level <= 2 ? "warnb" : "";
    let s = '<span class="bubbles ' + variant + '">';
    for (let i = 0; i < 5; i++) s += "<i" + (i < level ? ' class="on"' : "") + "></i>";
    return s + "</span>";
  }

  /* ---------------- State ---------------- */
  const state = {
    market: "UK", seg: "first", offer: "pct",
    depth: 15, voucher: 15, audience: 10000,
    margin: 0.22, beta: 0.6, gamma: 0.12,
  };

  const VERDICT_LABEL = { pos: "Positive", marg: "Marginal", neg: "Negative", hold: "Holdout" };

  function reactionText(r) {
    const m = r.meta.name, seg = SEGMENTS[r.seg].toLowerCase();
    const dw = Math.round(r.deadweightShare);
    if (r.verdict === "hold") {
      return "This is the holdout: no discount, no promotional spend. It is the clean baseline for what " + m + " " + seg + " travellers do without an incentive. Raise the offer to see what each pound actually buys.";
    }
    let lead;
    if (r.verdict === "pos") {
      lead = "This offer genuinely moves " + m + " " + seg + " buyers. About " + Math.round(r.incr) + "% of redemptions are truly incremental, so the spend is buying real bookings, not subsidising habit.";
    } else if (r.verdict === "marg") {
      lead = m + " " + seg + " sits on the fence. Roughly " + Math.round(r.incr) + "% is incremental and " + dw + "% is deadweight. Worth testing a shallower depth before scaling.";
    } else {
      lead = "Most of this spend is deadweight. Only ~" + Math.round(r.incr) + "% of redemptions are incremental here, so about " + dw + "% of every " + r.meta.sym + " goes to people who would have booked anyway.";
    }
    let caveat = "";
    if (r.directional) caveat = " Treat with caution: this market had holdout targeting issues, so its read is directional only.";
    else if (r.estimated) caveat = " This segment was not measured directly; it is estimated from the market's first-purchase behaviour, so confidence is lower.";
    if (r.fixedBonus) caveat += " A small fixed-value framing bonus is applied here from qualitative research, which is a low-confidence signal to test, not a fact.";
    return lead + caveat;
  }

  function recommendationText(r) {
    const m = r.meta.name, seg = SEGMENTS[r.seg].toLowerCase();
    const dw = Math.round(r.deadweightShare);
    if (r.verdict === "hold") {
      return "Use this zero-spend cell as your control. Every paid offer above should beat this baseline on incremental bookings, or it is not worth the budget.";
    }
    if (r.verdict === "neg") {
      return "At this offer, " + dw + "% of spend on " + m + " " + seg + " is deadweight. Don't discount here: run a 0% holdout to bank the saving and prove it.";
    }
    if (r.verdict === "marg") {
      return m + " " + seg + " is marginal. Test a shallower depth or a spend-threshold voucher, and measure downstream CLV, not just first bookings.";
    }
    return m + " " + seg + " is where incremental growth lives. Protect this offer and consider redirecting budget from low-incrementality repeat buyers toward it.";
  }

  function scenarioSentence(r) {
    const who = fmtInt(state.audience) + " " + r.meta.name + " " + SEGMENTS[r.seg].toLowerCase() + " travellers";
    if (r.verdict === "hold") {
      return who + ", no offer. This is your zero-spend baseline for what they do without an incentive.";
    }
    const offer = state.offer === "fixed"
      ? ("a " + r.meta.sym + state.voucher + " voucher (" + Math.round(r.effDepth) + "% effective)")
      : ("a " + state.depth + "% discount");
    return who + " at " + offer + " \u2192 " + fmtInt(r.incrementalBookings) + " incremental bookings for " + fmtMoney(r.market, r.netIncremental, 0) + " net, at " + Math.round(r.incr) + "% incrementality.";
  }

  /* ---------------- Render ---------------- */
  let firstPaint = true;
  function render(animate) {
    const r = compute(state.market, state.seg, state);

    // plain-English scenario line
    const scn = $("#scenarioLine");
    if (scn) scn.textContent = scenarioSentence(r);

    // KPI cards
    setKpi("kpiIncrBookings", fmtInt(r.incrementalBookings));
    setKpi("kpiNet", fmtMoney(r.market, r.netIncremental, 0), r.netIncremental >= 0 ? "up" : "down");
    setKpi("kpiCost", r.costPerIncr == null ? "\u2013" : fmtMoney(r.market, r.costPerIncr, 2));
    setKpi("kpiDeadweight", fmtMoney(r.market, r.deadweightSpend, 0), "down");
    setKpi("kpiIncr", fmtPct(r.incr, 0), r.verdict === "pos" ? "up" : r.verdict === "neg" ? "down" : r.verdict === "hold" ? "" : "warn");

    // confidence
    const conf = $("#kpiConfidence");
    if (conf) conf.innerHTML = bubbles(r.confidence) + '<span class="conf-word">' + (r.confidence >= 4 ? "High" : r.confidence >= 3 ? "Medium" : "Low") + "</span>";

    // reaction card
    const persona = $("#personaHead");
    if (persona) persona.innerHTML = '<span class="pl-flag" aria-hidden="true">' + r.meta.flag + "</span><div><h3>" + r.meta.name + " \u00B7 " + SEGMENTS[r.seg] + "</h3><span class=\"pl-offer\">" + offerLabel(r) + "</span></div>";
    const verdictPill = $("#personaVerdict");
    if (verdictPill) { verdictPill.className = "verdict " + r.verdict; verdictPill.textContent = VERDICT_LABEL[r.verdict]; }
    const flags = $("#personaFlags");
    if (flags) {
      let f = "";
      if (r.directional) f += '<span class="pl-flagtag warn">Directional data</span>';
      if (r.estimated) f += '<span class="pl-flagtag">Estimated segment</span>';
      if (r.fixedBonus) f += '<span class="pl-flagtag">Framing bonus applied</span>';
      flags.innerHTML = f;
    }
    const react = $("#personaReaction");
    if (react) react.textContent = reactionText(r);
    const reco = $("#recoStrip");
    if (reco) reco.innerHTML = '<span class="reco-ic" aria-hidden="true">\u2192</span><span>' + recommendationText(r) + "</span>";

    // mini stats under reaction
    setText("statUptake", fmtPct(r.uptake, 1));
    setText("statRedeemers", fmtInt(r.redeemers));
    setText("statSpend", fmtMoney(r.market, r.totalSpend, 0));
    setText("statDwShare", fmtPct(r.deadweightShare, 0));

    // charts
    drawCurve("chartCurve", state.market, state.seg, state, animate);
    const items = MARKET_ORDER.map((mk) => {
      const rr = compute(mk, state.seg, state);
      const color = rr.verdict === "pos" ? "#14b083" : rr.verdict === "marg" ? "#f2b53c" : rr.verdict === "hold" ? "#A7BDB2" : "#ff6b6b";
      return { label: MARKETS[mk].code, sub: MARKETS[mk].flag, value: rr.incr, color, dashed: rr.directional || rr.estimated, directional: rr.directional, current: mk === state.market };
    });
    drawBars("chartPersonas", items, animate);

    // table
    renderTable();

    // header confidence badge
    const badge = $("#liveBadge");
    if (badge) badge.innerHTML = bubbles(r.confidence) + "<span>" + (r.confidence >= 4 ? "High" : r.confidence >= 3 ? "Medium" : "Low") + " confidence</span>";
  }

  function offerLabel(r) {
    if (state.offer === "fixed") return "Fixed voucher " + r.meta.sym + state.voucher + " \u00B7 " + Math.round(r.effDepth) + "% effective";
    return state.depth + "% discount \u00B7 " + fmtMoney(r.market, r.promoCost, 2) + " per redeemer";
  }

  function setKpi(id, val, tone) {
    const e = $("#" + id);
    if (!e) return;
    e.textContent = val;
    e.classList.remove("up", "down", "warn");
    if (tone) e.classList.add(tone);
  }
  function setText(id, v) { const e = $("#" + id); if (e) e.textContent = v; }

  function renderTable() {
    const tbody = $("#gridBody");
    if (!tbody) return;
    let html = "";
    MARKET_ORDER.forEach((mk) => {
      Object.keys(SEGMENTS).forEach((seg) => {
        const r = compute(mk, seg, state);
        const rowCls = r.verdict === "pos" ? "row-pos" : r.verdict === "neg" ? "row-neg" : r.verdict === "hold" ? "" : "row-marg";
        const active = (mk === state.market && seg === state.seg) ? " is-active" : "";
        const est = r.estimated ? '<span class="tflag" title="Estimated from first-purchase behaviour">est</span>' : "";
        const dir = r.directional ? '<span class="tflag warn" title="Directional data only">*</span>' : "";
        html += '<tr class="' + rowCls + active + '" data-mk="' + mk + '" data-seg="' + seg + '">' +
          '<td class="mkt">' + r.meta.flag + " " + r.meta.code + "</td>" +
          '<td class="seg">' + SEGMENTS[seg] + " " + est + dir + "</td>" +
          "<td>" + fmtMoney(mk, r.cell.basket, 0) + "</td>" +
          "<td>" + fmtPct(r.uptake, 1) + "</td>" +
          "<td><b>" + fmtPct(r.incr, 0) + "</b></td>" +
          "<td>" + fmtInt(r.incrementalBookings) + "</td>" +
          "<td>" + (r.costPerIncr == null ? "\u2013" : fmtMoney(mk, r.costPerIncr, 2)) + "</td>" +
          "<td>" + fmtMoney(mk, r.deadweightSpend, 0) + "</td>" +
          '<td class="netcell ' + (r.netIncremental >= 0 ? "pos" : "neg") + '">' + fmtMoney(mk, r.netIncremental, 0) + "</td>" +
          "</tr>";
      });
    });
    tbody.innerHTML = html;
  }

  /* ---------------- Export ---------------- */
  function scenarioRows() {
    const rows = [["Market", "Segment", "Offer", "Effective depth %", "Uptake %", "Incrementality %", "Incremental bookings", "Promo spend", "Deadweight spend", "Cost per incremental booking", "Net incremental", "Currency", "Estimated", "Directional"]];
    MARKET_ORDER.forEach((mk) => {
      Object.keys(SEGMENTS).forEach((seg) => {
        const r = compute(mk, seg, state);
        rows.push([
          mk, SEGMENTS[seg],
          state.offer === "fixed" ? ("Fixed " + MARKETS[mk].sym + state.voucher) : (state.depth + "%"),
          r.effDepth.toFixed(1), r.uptake.toFixed(1), r.incr.toFixed(1),
          Math.round(r.incrementalBookings), Math.round(r.totalSpend), Math.round(r.deadweightSpend),
          r.costPerIncr == null ? "" : r.costPerIncr.toFixed(2), Math.round(r.netIncremental),
          MARKETS[mk].ccy, r.estimated ? "yes" : "no", r.directional ? "yes" : "no",
        ]);
      });
    });
    return rows;
  }
  function download(name, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
  function exportCSV() {
    const csv = scenarioRows().map((r) => r.map((c) => {
      const s = String(c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")).join("\n");
    download("persona-lab-scenario.csv", "text/csv;charset=utf-8", csv);
  }
  function exportJSON() {
    const data = {
      generatedAt: new Date().toISOString(),
      controls: { offer: state.offer, depth: state.depth, voucher: state.voucher, audience: state.audience, margin: state.margin, beta: state.beta, gamma: state.gamma },
      selected: state.market + " / " + SEGMENTS[state.seg],
      results: scenarioRows().slice(1).map((row) => {
        const h = scenarioRows()[0];
        const o = {}; h.forEach((k, i) => (o[k] = row[i])); return o;
      }),
    };
    download("persona-lab-scenario.json", "application/json", JSON.stringify(data, null, 2));
  }

  /* ---------------- Controls wiring ---------------- */
  function wire() {
    // persona buttons
    $$(".pl-persona").forEach((btn) => btn.addEventListener("click", () => {
      state.market = btn.dataset.mk;
      $$(".pl-persona").forEach((b) => b.classList.toggle("is-active", b === btn));
      $$(".pl-persona").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      syncVoucherMax();
      render(false);
    }));
    // segment buttons
    $$(".pl-seg").forEach((btn) => btn.addEventListener("click", () => {
      state.seg = btn.dataset.seg;
      $$(".pl-seg").forEach((b) => b.classList.toggle("is-active", b === btn));
      $$(".pl-seg").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      render(false);
    }));
    // offer toggle
    $$(".pl-offer-btn").forEach((btn) => btn.addEventListener("click", () => {
      state.offer = btn.dataset.offer;
      $$(".pl-offer-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      $$(".pl-offer-btn").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      $("#pctControl").hidden = state.offer !== "pct";
      $("#fixedControl").hidden = state.offer !== "fixed";
      render(false);
    }));
    // sliders / inputs
    bindRange("depth", (v) => { state.depth = +v; setText("depthOut", v + "%"); });
    bindRange("voucher", (v) => { state.voucher = +v; setText("voucherOut", MARKETS[state.market].sym + v); });
    bindRange("audience", (v) => { state.audience = +v; setText("audienceOut", fmtInt(v)); });
    bindRange("margin", (v) => { state.margin = +v / 100; setText("marginOut", v + "%"); });
    bindRange("beta", (v) => { state.beta = +v; setText("betaOut", (+v).toFixed(2)); });
    bindRange("gamma", (v) => { state.gamma = +v; setText("gammaOut", (+v).toFixed(2)); });

    // advanced toggle
    const advBtn = $("#advToggle");
    if (advBtn) advBtn.addEventListener("click", () => {
      const panel = $("#advPanel");
      const open = panel.hidden;
      panel.hidden = !open;
      advBtn.setAttribute("aria-expanded", open ? "true" : "false");
      advBtn.querySelector(".chev").textContent = open ? "\u2212" : "+";
    });

    // reset
    const reset = $("#resetBtn");
    if (reset) reset.addEventListener("click", () => location.reload());

    // export
    const csvBtn = $("#exportCsv"); if (csvBtn) csvBtn.addEventListener("click", exportCSV);
    const jsonBtn = $("#exportJson"); if (jsonBtn) jsonBtn.addEventListener("click", exportJSON);
    const printBtn = $("#printBtn"); if (printBtn) printBtn.addEventListener("click", () => window.print());

    // table row click -> select
    const tbody = $("#gridBody");
    if (tbody) tbody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-mk]");
      if (!tr) return;
      state.market = tr.dataset.mk; state.seg = tr.dataset.seg;
      syncControlsToState();
      render(false);
    });
  }

  function bindRange(id, fn) {
    const inp = $("#" + id);
    if (!inp) return;
    inp.addEventListener("input", () => { fn(inp.value); render(false); });
  }

  function syncVoucherMax() {
    // keep voucher within a sensible band for the market basket
    const inp = $("#voucher");
    if (!inp) return;
    setText("voucherOut", MARKETS[state.market].sym + state.voucher);
  }

  function syncControlsToState() {
    $$(".pl-persona").forEach((b) => { const on = b.dataset.mk === state.market; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    $$(".pl-seg").forEach((b) => { const on = b.dataset.seg === state.seg; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  }

  /* ---------------- Shared nav / progress / reveal ---------------- */
  function chrome() {
    const nav = $("#nav"), progress = $("#progress");
    function onScroll() {
      const st = window.scrollY || document.documentElement.scrollTop;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
      if (nav) nav.classList.toggle("scrolled", st > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const navToggle = $("#navToggle"), navLinks = $("#navLinks");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
      $$("#navLinks a").forEach((a) => a.addEventListener("click", () => navLinks.classList.remove("open")));
    }
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); } });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach((el2) => revealObs.observe(el2));
  }

  /* ---------------- Init ---------------- */
  function init() {
    chrome();
    wire();
    // initial control labels
    setText("depthOut", state.depth + "%");
    setText("voucherOut", MARKETS[state.market].sym + state.voucher);
    setText("audienceOut", fmtInt(state.audience));
    setText("marginOut", Math.round(state.margin * 100) + "%");
    setText("betaOut", state.beta.toFixed(2));
    setText("gammaOut", state.gamma.toFixed(2));

    // render on first viewport entry of the dashboard (animate charts on entry, not page load)
    const dash = $("#dashboard");
    if (dash && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && firstPaint) { firstPaint = false; render(true); obs.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      obs.observe(dash);
      // paint numbers immediately (without chart entrance) so nothing looks empty
      render(false);
    } else {
      render(true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

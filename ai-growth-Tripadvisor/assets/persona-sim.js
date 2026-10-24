/* =========================================================
   Persona Lab - pre-launch incentive simulator (front end)
   Tripadvisor x Adrien Enjalbert - AI Personalization case study

   The page is a view. Data and the model come from the backend:
   - live mode:   GET /api/anchors once, POST /api/simulate per change
   - static mode: the same model (assets/persona-model.js) runs in the
                  browser against assets/persona-anchors.json, used when no
                  API is reachable (e.g. the GitHub Pages copy).
   Both modes read the same anchors and return the same payload shape.
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const API_BASE = ((document.querySelector('meta[name="persona-api"]') || {}).content || "/api").replace(/\/$/, "");
  const STATIC_ANCHORS = "assets/persona-anchors.json";
  const LIVE_DEBOUNCE_MS = 120;

  /* ---------------- Data (filled from the backend or the static fallback) ---------------- */
  let anchors = null;      // the anchors object, same shape in both modes
  let localModel = null;   // PersonaModel instance, used for static mode and API failures
  let MARKETS = {};
  let MARKET_ORDER = [];
  let SEGMENTS = {};
  let mode = "connecting"; // "live" | "static"
  let dataVersion = "";

  /* ---------------- Formatters ---------------- */
  const nf = new Intl.NumberFormat("en-GB");
  const fmtInt = (v) => nf.format(Math.round(v));
  function fmtMoney(market, v, dec) {
    const m = MARKETS[market];
    const neg = v < 0;
    const s = Math.abs(v).toLocaleString("en-GB", { maximumFractionDigits: dec || 0, minimumFractionDigits: dec || 0 });
    return (neg ? "−" : "") + m.sym + s;
  }
  const fmtPct = (v, dec) => (v).toFixed(dec || 0) + "%";

  /* ---------------- SVG helpers ---------------- */
  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function drawCurve(svgId, market, curve, animate) {
    const svg = $("#" + svgId);
    if (!svg) return;
    svg.innerHTML = "";
    const W = 520, H = 280, pl = 52, pr = 20, pt = 22, pb = 40;
    const plotW = W - pl - pr, plotH = H - pt - pb;

    const pts = curve.points;
    let maxY = Math.max.apply(null, pts.map((p) => p.net));
    let minY = Math.min.apply(null, pts.map((p) => p.net));
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
      dLine += (i === 0 ? "M" : "L") + sx(p.depth) + " " + sy(p.net) + " ";
      dArea += "L" + sx(p.depth) + " " + sy(p.net) + " ";
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
    pts.forEach((p) => { if (p.net > peak.net) peak = p; });
    if (peak.net > 0) {
      svg.appendChild(el("circle", { cx: sx(peak.depth), cy: sy(peak.net), r: 4, fill: "#00976E" }));
      const pl2 = el("text", { class: "psvg-peak", x: sx(peak.depth), y: sy(peak.net) - 10, "text-anchor": "middle" });
      pl2.textContent = "peak " + peak.depth + "%";
      svg.appendChild(pl2);
    }

    // current marker
    const cx = curve.markerDepth;
    svg.appendChild(el("line", { class: "psvg-cur", x1: sx(cx), y1: pt, x2: sx(cx), y2: pt + plotH }));
    svg.appendChild(el("circle", { cx: sx(cx), cy: sy(curve.markerNet), r: 5, fill: "#0a1512", stroke: "#34E0A1", "stroke-width": 2 }));

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
  let lastSim = null;

  const VERDICT_LABEL = { pos: "Positive", marg: "Marginal", neg: "Negative", hold: "Holdout" };

  function reactionText(r) {
    const m = r.meta.name, seg = SEGMENTS[r.segment].toLowerCase();
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
    const m = r.meta.name, seg = SEGMENTS[r.segment].toLowerCase();
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
    const who = fmtInt(state.audience) + " " + r.meta.name + " " + SEGMENTS[r.segment].toLowerCase() + " travellers";
    if (r.verdict === "hold") {
      return who + ", no offer. This is your zero-spend baseline for what they do without an incentive.";
    }
    const offer = state.offer === "fixed"
      ? ("a " + r.meta.sym + state.voucher + " voucher (" + Math.round(r.effDepth) + "% effective)")
      : ("a " + state.depth + "% discount");
    return who + " at " + offer + " → " + fmtInt(r.incrementalBookings) + " incremental bookings for " + fmtMoney(r.market || state.market, r.netIncremental, 0) + " net, at " + Math.round(r.incr) + "% incrementality.";
  }

  /* ---------------- Compare vs status quo + breakeven ---------------- */
  function signedMoney(market, v) {
    const sign = v > 0 ? "+" : v < 0 ? "−" : "";
    return sign + MARKETS[market].sym + fmtInt(Math.abs(v));
  }
  function signedInt(v) {
    const sign = v > 0 ? "+" : v < 0 ? "−" : "";
    return sign + fmtInt(Math.abs(v));
  }
  function deltaChip(label, val, market, higherBetter, isInt) {
    const cls = Math.abs(val) < 0.5 ? "flat" : (higherBetter ? val > 0 : val < 0) ? "up" : "down";
    const v = isInt ? signedInt(val) : signedMoney(market, val);
    return '<span class="cmp ' + cls + '">' + label + " " + v + "</span>";
  }
  function compareHTML(r, base) {
    const isBaseline = state.offer === "pct" && Math.abs(state.depth - 15) < 0.01;
    if (isBaseline) return '<span class="cmp-base">This is today’s flat 15% baseline, the status quo you are comparing against.</span>';
    const netD = r.netIncremental - base.netIncremental;
    const dwD = r.deadweightSpend - base.deadweightSpend;
    const bkD = r.incrementalBookings - base.incrementalBookings;
    return '<span class="cmp-lab">vs today’s flat 15%</span>' +
      deltaChip("Net", netD, r.meta.code, true, false) +
      deltaChip("Deadweight", dwD, r.meta.code, false, false) +
      deltaChip("Incremental bookings", bkD, null, true, true);
  }
  function breakevenHTML(r) {
    if (r.holdout) return "No offer here, so there is no breakeven to clear. This is your zero-spend control.";
    const bIncr = (r.promoCost / (r.cell.basket * state.margin)) * 100;
    const bMarginRaw = (r.promoCost / ((r.incr / 100) * r.cell.basket)) * 100;
    const bMargin = bMarginRaw > 100 ? "&gt;100%" : Math.round(bMarginRaw) + "%";
    const ok = r.netIncremental >= 0;
    return "Breakeven at this offer needs incrementality ≥ <b>" + Math.round(bIncr) + "%</b> or margin ≥ <b>" + bMargin +
      "</b>. This cell is at " + Math.round(r.incr) + "% incrementality and " + Math.round(state.margin * 100) + "% margin, so it is <b class=\"" +
      (ok ? "be-ok" : "be-no") + "\">" + (ok ? "net positive" : "net negative") +
      "</b>. The verdict pill rates causal quality; this line rates profit.";
  }

  /* ---------------- Render ---------------- */
  function render(sim, animate) {
    const r = sim.scenario;
    const base = sim.baseline;

    // plain-English scenario line
    const scn = $("#scenarioLine");
    if (scn) scn.textContent = scenarioSentence(r);

    // KPI cards
    setKpi("kpiIncrBookings", fmtInt(r.incrementalBookings));
    setKpi("kpiNet", fmtMoney(r.meta.code, r.netIncremental, 0), r.netIncremental >= 0 ? "up" : "down");
    setKpi("kpiCost", r.costPerIncr == null ? "–" : fmtMoney(r.meta.code, r.costPerIncr, 2));
    setKpi("kpiDeadweight", fmtMoney(r.meta.code, r.deadweightSpend, 0), "down");
    setKpi("kpiIncr", fmtPct(r.incr, 0), r.verdict === "pos" ? "up" : r.verdict === "neg" ? "down" : r.verdict === "hold" ? "" : "warn");

    // confidence
    const conf = $("#kpiConfidence");
    if (conf) conf.innerHTML = bubbles(r.confidence) + '<span class="conf-word">' + (r.confidence >= 4 ? "High" : r.confidence >= 3 ? "Medium" : "Low") + "</span>";

    // reaction card
    const persona = $("#personaHead");
    if (persona) persona.innerHTML = '<span class="pl-flag" aria-hidden="true">' + r.meta.flag + "</span><div><h3>" + r.meta.name + " · " + SEGMENTS[r.segment] + "</h3><span class=\"pl-offer\">" + offerLabel(r) + "</span></div>";
    const verdictPill = $("#personaVerdict");
    if (verdictPill) { verdictPill.className = "verdict " + r.verdict; verdictPill.textContent = VERDICT_LABEL[r.verdict]; verdictPill.title = "Verdict reflects incrementality quality (causal), not profit. See the breakeven line for profitability."; }
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
    if (reco) reco.innerHTML = '<span class="reco-ic" aria-hidden="true">→</span><span>' + recommendationText(r) + "</span>";

    // mini stats under reaction
    setText("statUptake", fmtPct(r.uptake, 1));
    setText("statRedeemers", fmtInt(r.redeemers));
    setText("statSpend", fmtMoney(r.meta.code, r.totalSpend, 0));
    setText("statDwShare", fmtPct(r.deadweightShare, 0));

    // compare vs today's flat 15% + breakeven
    const cmp = $("#compareStrip");
    if (cmp) cmp.innerHTML = compareHTML(r, base);
    const be = $("#breakevenLine");
    if (be) be.innerHTML = breakevenHTML(r);

    // charts
    drawCurve("chartCurve", state.market, sim.curve, animate);
    const items = sim.personas.map((p) => {
      const color = p.verdict === "pos" ? "#14b083" : p.verdict === "marg" ? "#f2b53c" : p.verdict === "hold" ? "#A7BDB2" : "#ff6b6b";
      return { label: p.meta.code, sub: p.meta.flag, value: p.incr, color, dashed: p.directional || p.estimated, directional: p.directional, current: p.current };
    });
    drawBars("chartPersonas", items, animate);

    // table
    renderTable(sim.grid);

    // header confidence badge
    const badge = $("#liveBadge");
    if (badge) badge.innerHTML = bubbles(r.confidence) + "<span>" + (r.confidence >= 4 ? "High" : r.confidence >= 3 ? "Medium" : "Low") + " confidence</span>";
  }

  function offerLabel(r) {
    if (state.offer === "fixed") return "Fixed voucher " + r.meta.sym + state.voucher + " · " + Math.round(r.effDepth) + "% effective";
    return state.depth + "% discount · " + fmtMoney(r.meta.code, r.promoCost, 2) + " per redeemer";
  }

  function setKpi(id, val, tone) {
    const e = $("#" + id);
    if (!e) return;
    e.textContent = val;
    e.classList.remove("up", "down", "warn");
    if (tone) e.classList.add(tone);
  }
  function setText(id, v) { const e = $("#" + id); if (e) e.textContent = v; }

  function renderTable(grid) {
    const tbody = $("#gridBody");
    if (!tbody) return;
    let html = "";
    grid.forEach((r) => {
      const rowCls = r.verdict === "pos" ? "row-pos" : r.verdict === "neg" ? "row-neg" : r.verdict === "hold" ? "" : "row-marg";
      const active = (r.meta.code === state.market && r.segment === state.seg) ? " is-active" : "";
      const est = r.estimated ? '<span class="tflag" title="Estimated from first-purchase behaviour">est</span>' : "";
      const dir = r.directional ? '<span class="tflag warn" title="Directional data only">*</span>' : "";
      const mk = r.meta.code;
      html += '<tr class="' + rowCls + active + '" data-mk="' + mk + '" data-seg="' + r.segment + '">' +
        '<td class="mkt">' + r.meta.flag + " " + mk + "</td>" +
        '<td class="seg">' + SEGMENTS[r.segment] + " " + est + dir + "</td>" +
        "<td>" + fmtMoney(mk, r.cell.basket, 0) + "</td>" +
        "<td>" + fmtPct(r.uptake, 1) + "</td>" +
        "<td><b>" + fmtPct(r.incr, 0) + "</b></td>" +
        "<td>" + fmtInt(r.incrementalBookings) + "</td>" +
        "<td>" + (r.costPerIncr == null ? "–" : fmtMoney(mk, r.costPerIncr, 2)) + "</td>" +
        "<td>" + fmtMoney(mk, r.deadweightSpend, 0) + "</td>" +
        '<td class="netcell ' + (r.netIncremental >= 0 ? "pos" : "neg") + '">' + fmtMoney(mk, r.netIncremental, 0) + "</td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
  }

  /* ---------------- Export ---------------- */
  function scenarioRows(grid) {
    const rows = [["Market", "Segment", "Offer", "Effective depth %", "Uptake %", "Incrementality %", "Incremental bookings", "Promo spend", "Deadweight spend", "Cost per incremental booking", "Net incremental", "Currency", "Estimated", "Directional"]];
    grid.forEach((r) => {
      rows.push([
        r.meta.code, SEGMENTS[r.segment],
        state.offer === "fixed" ? ("Fixed " + r.meta.sym + state.voucher) : (state.depth + "%"),
        r.effDepth.toFixed(1), r.uptake.toFixed(1), r.incr.toFixed(1),
        Math.round(r.incrementalBookings), Math.round(r.totalSpend), Math.round(r.deadweightSpend),
        r.costPerIncr == null ? "" : r.costPerIncr.toFixed(2), Math.round(r.netIncremental),
        r.meta.ccy, r.estimated ? "yes" : "no", r.directional ? "yes" : "no",
      ]);
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
    if (!lastSim) return;
    const csv = scenarioRows(lastSim.grid).map((r) => r.map((c) => {
      const s = String(c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")).join("\n");
    download("persona-lab-scenario.csv", "text/csv;charset=utf-8", csv);
  }
  function exportJSON() {
    if (!lastSim) return;
    const rows = scenarioRows(lastSim.grid);
    const header = rows[0];
    const data = {
      generatedAt: new Date().toISOString(),
      dataSource: mode === "live" ? "api" : "static",
      dataVersion: dataVersion,
      controls: { offer: state.offer, depth: state.depth, voucher: state.voucher, audience: state.audience, margin: state.margin, beta: state.beta, gamma: state.gamma },
      selected: state.market + " / " + SEGMENTS[state.seg],
      results: rows.slice(1).map((row) => {
        const o = {}; header.forEach((k, i) => (o[k] = row[i])); return o;
      }),
    };
    download("persona-lab-scenario.json", "application/json", JSON.stringify(data, null, 2));
  }

  /* ---------------- Data loading and refresh ---------------- */
  function setSource(kind, detail) {
    const badge = $("#sourceBadge");
    if (!badge) return;
    const text = {
      connecting: "Connecting to data",
      live: "Live data · API v" + dataVersion,
      static: "Static mode · model runs in your browser",
    }[kind];
    badge.textContent = detail ? text + " · " + detail : text;
    badge.dataset.mode = kind;
    badge.title = kind === "live"
      ? "Anchors and simulations are served by the Persona Lab API (backend/server.js)."
      : "No API reachable, so the same model runs in your browser against the bundled anchors.";
  }

  function applyAnchors(data) {
    anchors = data;
    dataVersion = data.version;
    MARKETS = data.markets;
    MARKET_ORDER = data.marketOrder;
    SEGMENTS = data.segments;
    localModel = PersonaModel.createModel(anchors);
  }

  function fetchJson(url, body, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 4000);
    const opts = { signal: ctrl.signal, cache: "no-store" };
    if (body) {
      opts.method = "POST";
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).finally(() => clearTimeout(timer));
  }

  async function loadData() {
    try {
      applyAnchors(await fetchJson(API_BASE + "/anchors", null, 2500));
      mode = "live";
    } catch (err) {
      try {
        applyAnchors(await fetchJson(STATIC_ANCHORS, null, 4000));
        mode = "static";
      } catch (err2) {
        setSource("static", "data unavailable");
        throw err2;
      }
    }
    setSource(mode);
  }

  function scenarioPayload() {
    return {
      market: state.market,
      segment: state.seg,
      offer: state.offer,
      depth: state.depth,
      voucher: state.voucher,
      audience: state.audience,
      margin: state.margin,
      beta: state.beta,
      gamma: state.gamma,
    };
  }

  // Resolve a simulation for the current state. Live mode calls the API and
  // drops to the in-browser model if the API stops answering.
  async function getSim() {
    const payload = scenarioPayload();
    if (mode === "live") {
      try {
        return await fetchJson(API_BASE + "/simulate", payload, 5000);
      } catch (err) {
        // Network error, timeout (AbortError) or a non-2xx: drop to the in-browser model.
        mode = "static";
        setSource("static", "API unreachable");
      }
    }
    const scenario = PersonaModel.normaliseState(anchors, payload);
    return localModel.simulate(scenario);
  }

  let reqSeq = 0;
  let liveTimer = null;
  let pendingAnimate = false;

  async function refresh(animate) {
    const seq = ++reqSeq;
    let sim;
    try {
      sim = await getSim();
    } catch (err) {
      if (err.name === "AbortError") return;
      setSource(mode, "request failed");
      return;
    }
    if (seq !== reqSeq) return;
    lastSim = sim;
    render(sim, animate);
  }

  // Live mode debounces slider drags so one drag is one request.
  // Static mode is instant, so it renders synchronously.
  function scheduleRender(animate) {
    if (animate) pendingAnimate = true;
    if (mode !== "live") {
      const go = pendingAnimate;
      pendingAnimate = false;
      refresh(go);
      return;
    }
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      const go = pendingAnimate;
      pendingAnimate = false;
      refresh(go);
    }, LIVE_DEBOUNCE_MS);
  }

  /* ---------------- Controls wiring ---------------- */
  function wire() {
    // persona buttons
    $$(".pl-persona").forEach((btn) => btn.addEventListener("click", () => {
      state.market = btn.dataset.mk;
      $$(".pl-persona").forEach((b) => b.classList.toggle("is-active", b === btn));
      $$(".pl-persona").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      syncVoucherMax();
      scheduleRender(false);
    }));
    // segment buttons
    $$(".pl-seg").forEach((btn) => btn.addEventListener("click", () => {
      state.seg = btn.dataset.seg;
      $$(".pl-seg").forEach((b) => b.classList.toggle("is-active", b === btn));
      $$(".pl-seg").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      scheduleRender(false);
    }));
    // offer toggle
    $$(".pl-offer-btn").forEach((btn) => btn.addEventListener("click", () => {
      state.offer = btn.dataset.offer;
      $$(".pl-offer-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      $$(".pl-offer-btn").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      $("#pctControl").hidden = state.offer !== "pct";
      $("#fixedControl").hidden = state.offer !== "fixed";
      scheduleRender(false);
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
      advBtn.querySelector(".chev").textContent = open ? "−" : "+";
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
      syncUIFromState();
      scheduleRender(false);
    });

    // preset scenario chips
    $$(".pl-preset").forEach((btn) => btn.addEventListener("click", () => applyPreset(btn.dataset)));
  }

  function bindRange(id, fn) {
    const inp = $("#" + id);
    if (!inp) return;
    inp.addEventListener("input", () => { fn(inp.value); scheduleRender(false); });
  }

  function syncVoucherMax() {
    // keep voucher within a sensible band for the market basket
    const inp = $("#voucher");
    if (!inp || !MARKETS[state.market]) return;
    setText("voucherOut", MARKETS[state.market].sym + state.voucher);
  }

  function syncUIFromState() {
    $$(".pl-persona").forEach((b) => { const on = b.dataset.mk === state.market; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    $$(".pl-seg").forEach((b) => { const on = b.dataset.seg === state.seg; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    $$(".pl-offer-btn").forEach((b) => { const on = b.dataset.offer === state.offer; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    const pc = $("#pctControl"); if (pc) pc.hidden = state.offer !== "pct";
    const fc = $("#fixedControl"); if (fc) fc.hidden = state.offer !== "fixed";
    const dp = $("#depth"); if (dp) dp.value = state.depth; setText("depthOut", state.depth + "%");
    const vc = $("#voucher"); if (vc) vc.value = state.voucher; if (MARKETS[state.market]) setText("voucherOut", MARKETS[state.market].sym + state.voucher);
    const au = $("#audience"); if (au) au.value = state.audience; setText("audienceOut", fmtInt(state.audience));
  }

  function applyPreset(ds) {
    state.market = ds.mk; state.seg = ds.seg; state.offer = ds.offer;
    if (ds.depth != null) state.depth = +ds.depth;
    if (ds.voucher != null) state.voucher = +ds.voucher;
    syncUIFromState();
    scheduleRender(false);
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
  async function init() {
    chrome();
    wire();
    setSource("connecting");
    try {
      await loadData();
    } catch (err) {
      return; // the badge already says data is unavailable
    }
    // initial control labels
    setText("depthOut", state.depth + "%");
    setText("voucherOut", MARKETS[state.market].sym + state.voucher);
    setText("audienceOut", fmtInt(state.audience));
    setText("marginOut", Math.round(state.margin * 100) + "%");
    setText("betaOut", state.beta.toFixed(2));
    setText("gammaOut", state.gamma.toFixed(2));

    // Paint numbers immediately (no chart entrance) so nothing looks empty,
    // then animate the charts the first time the dashboard scrolls into view.
    let firstPaint = true;
    const dash = $("#dashboard");
    if (dash && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && firstPaint) { firstPaint = false; scheduleRender(true); obs.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      obs.observe(dash);
    }
    refresh(false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

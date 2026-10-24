/* =========================================================
   Persona Lab - shared incentive model
   One pure function, used in two places:
   - the backend API (backend/server.js, Node)
   - the browser, as the static fallback when no API is reachable
   Inputs are the anchors file (assets/persona-anchors.json) and a
   scenario state. Nothing here touches the DOM or the network.
   ========================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PersonaModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round = (v, dp) => Math.round(v * Math.pow(10, dp)) / Math.pow(10, dp);

  function createModel(anchors) {
    const markets = anchors.markets;

    // Observed cells come straight from the anchors. Missing cells are
    // estimated from this market's first-purchase anchor with the UK-derived factors.
    function getCell(market, seg) {
      const key = market + "|" + seg;
      if (anchors.observed[key]) {
        return Object.assign({ estimated: false }, anchors.observed[key]);
      }
      const first = anchors.observed[market + "|first"];
      const f = anchors.segmentFactors[seg];
      return {
        estimated: true,
        basket: Math.round(first.basket * f.basket),
        red: round(first.red * f.red, 1),
        incr: Math.round(first.incr * f.incr),
      };
    }

    function confidenceOf(market, seg, cell) {
      const m = markets[market];
      let c = m.base;
      if (cell.estimated) c -= 1;
      if (seg !== "first") c -= 1;
      if (m.directional) c = Math.min(c, 2);
      return clamp(c, 1, 5);
    }

    function metaOf(market) {
      const m = markets[market];
      return { name: m.name, flag: m.flag, code: m.code, ccy: m.ccy, sym: m.sym, base: m.base, directional: !!m.directional };
    }

    // Full scenario result for one market and segment.
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
        market, segment: seg, meta: metaOf(market), cell,
        effDepth: d, voucher, promoCost,
        confidence: confidenceOf(market, seg, cell),
        directional: !!markets[market].directional,
        estimated: cell.estimated,
        fixedBonus: false,
      };

      if (d <= 0.1) {
        return Object.assign(out, {
          uptake: 0, incr: 0, redeemers: 0, incrementalBookings: 0,
          totalSpend: 0, deadweightSpend: 0, deadweightShare: 0,
          costPerIncr: null, incrementalRevenue: 0, netIncremental: 0,
          verdict: "hold", holdout: true,
        });
      }

      const uptake = clamp(r0 * Math.pow(d / 15, state.beta), 0, 50);
      let incr = clamp(i0 * Math.pow(15 / d, state.gamma), 0, 92);
      // Fixed-value framing bonus: a qualitative signal, Germany first purchase only.
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

      return Object.assign(out, {
        uptake, incr, redeemers, incrementalBookings, totalSpend,
        deadweightSpend, deadweightShare, costPerIncr, incrementalRevenue,
        netIncremental, verdict, holdout: false,
      });
    }

    // Net incremental revenue at an arbitrary percentage depth (for the curve).
    function netAtDepth(market, seg, d, state) {
      const cell = getCell(market, seg);
      const b = cell.basket;
      if (d <= 0.1) return 0;
      const uptake = clamp(cell.red * Math.pow(d / 15, state.beta), 0, 50);
      const incr = clamp(cell.incr * Math.pow(15 / d, state.gamma), 0, 92);
      const redeemers = state.audience * (uptake / 100);
      const incrementalBookings = redeemers * (incr / 100);
      const totalSpend = redeemers * ((d / 100) * b);
      return incrementalBookings * b * state.margin - totalSpend;
    }

    // Everything the dashboard needs for one scenario, in one call.
    function simulate(state) {
      const seg = state.segment;
      const scenario = compute(state.market, seg, state);
      const baseline = compute(state.market, seg, Object.assign({}, state, { offer: "pct", depth: 15 }));

      const curve = [];
      for (let d = 0; d <= 30; d += 1) {
        curve.push({ depth: d, net: netAtDepth(state.market, seg, d, state) });
      }
      const markerDepth = clamp(scenario.effDepth, 0, 30);

      const personas = anchors.marketOrder.map((mk) => {
        const r = compute(mk, seg, state);
        return { market: mk, meta: r.meta, incr: r.incr, verdict: r.verdict, directional: r.directional, estimated: r.estimated, current: mk === state.market };
      });

      const grid = [];
      anchors.marketOrder.forEach((mk) => {
        Object.keys(anchors.segments).forEach((sg) => grid.push(compute(mk, sg, state)));
      });

      return {
        scenario,
        baseline,
        curve: { points: curve, markerDepth, markerNet: netAtDepth(state.market, seg, markerDepth, state) },
        personas,
        grid,
      };
    }

    return { getCell, compute, netAtDepth, simulate };
  }

  // Clamp and type-check raw input (from a URL, a POST body or a control).
  // Returns a clean state object; unknown keys are dropped.
  function normaliseState(anchors, input) {
    const lim = anchors.limits;
    const def = anchors.defaults;
    const num = (v, [lo, hi], fallback) => {
      const n = Number(v);
      return Number.isFinite(n) ? clamp(n, lo, hi) : fallback;
    };
    const market = anchors.markets[input.market] ? input.market : def.market;
    const segment = anchors.segments[input.segment] ? input.segment : def.segment;
    const offer = input.offer === "fixed" ? "fixed" : "pct";
    return {
      market,
      segment,
      offer,
      depth: num(input.depth, lim.depth, def.depth),
      voucher: num(input.voucher, lim.voucher, def.voucher),
      audience: num(input.audience, lim.audience, def.audience),
      margin: num(input.margin, lim.margin, def.margin),
      beta: num(input.beta, lim.beta, def.beta),
      gamma: num(input.gamma, lim.gamma, def.gamma),
    };
  }

  return { createModel, normaliseState };
});

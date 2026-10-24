"use strict";
// Run from the repo root:  node --test ai-growth-Tripadvisor/backend/test/
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const SITE_DIR = path.resolve(__dirname, "..", "..");
const PersonaModel = require(path.join(SITE_DIR, "assets", "persona-model.js"));
const anchors = require(path.join(SITE_DIR, "assets", "persona-anchors.json"));
const { server } = require("../server.js");

const model = PersonaModel.createModel(anchors);
const BASE_STATE = PersonaModel.normaliseState(anchors, {});

/* ---------------- Model ---------------- */

test("UK first purchase at 15% matches a hand calculation", () => {
  // redeemers = 10,000 * 18% = 1,800; spend = 1,800 * (15% * 95) = 25,650
  // caused bookings = 1,800 * 71% = 1,278; net = 1,278 * 95 * 22% - 25,650 = 1,060.2
  const r = model.compute("UK", "first", BASE_STATE);
  assert.equal(r.redeemers, 1800);
  assert.ok(Math.abs(r.totalSpend - 25650) < 1e-6);
  assert.ok(Math.abs(r.incrementalBookings - 1278) < 1e-6);
  assert.ok(Math.abs(r.netIncremental - 1060.2) < 1e-6);
  assert.equal(r.verdict, "pos");
  assert.equal(r.estimated, false);
});

test("zero depth is the holdout: no spend, no bookings", () => {
  const r = model.compute("UK", "first", Object.assign({}, BASE_STATE, { depth: 0 }));
  assert.equal(r.holdout, true);
  assert.equal(r.verdict, "hold");
  assert.equal(r.totalSpend, 0);
  assert.equal(r.incrementalBookings, 0);
});

test("unmeasured segments are estimated from the market first-purchase anchor", () => {
  // German lapsed is not observed: basket 102 x 1.16, redemption 11 x 0.78, incrementality 63 x 0.73
  const cell = model.getCell("DE", "lapsed");
  assert.equal(cell.estimated, true);
  assert.equal(cell.basket, 118);
  assert.equal(cell.red, 8.6);
  assert.equal(cell.incr, 46);
});

test("directional markets are capped at low confidence", () => {
  assert.equal(model.compute("FR", "first", BASE_STATE).confidence, 2);
  assert.equal(model.compute("IT", "first", BASE_STATE).confidence, 2);
});

test("German fixed voucher carries the framing bonus only on first purchase", () => {
  const fixed = Object.assign({}, BASE_STATE, { market: "DE", offer: "fixed", voucher: 15 });
  assert.equal(model.compute("DE", "first", fixed).fixedBonus, true);
  assert.equal(model.compute("DE", "repeat", fixed).fixedBonus, false);
});

test("simulate returns the full dashboard payload", () => {
  const sim = model.simulate(BASE_STATE);
  assert.equal(sim.personas.length, anchors.marketOrder.length);
  assert.equal(sim.grid.length, anchors.marketOrder.length * Object.keys(anchors.segments).length);
  assert.equal(sim.curve.points.length, 31);
  assert.equal(sim.personas.filter((p) => p.current).length, 1);
  assert.ok(sim.baseline.offer === "pct" || sim.baseline.effDepth === 15);
});

test("normaliseState clamps numbers and rejects unknown codes", () => {
  const s = PersonaModel.normaliseState(anchors, {
    market: "XX", segment: "nope", offer: "weird", depth: 999, audience: -5, margin: "abc",
  });
  assert.equal(s.market, anchors.defaults.market);
  assert.equal(s.segment, anchors.defaults.segment);
  assert.equal(s.offer, "pct");
  assert.equal(s.depth, 30);
  assert.equal(s.audience, 1000);
  assert.equal(s.margin, anchors.defaults.margin);
});

/* ---------------- HTTP ---------------- */

let base;
before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("health reports the data version", async () => {
  const res = await fetch(base + "/api/health");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.dataVersion, anchors.version);
});

test("anchors endpoint serves the observed cells", async () => {
  const body = await (await fetch(base + "/api/anchors")).json();
  assert.equal(body.observed["UK|first"].incr, 71);
  assert.deepEqual(body.marketOrder, ["UK", "DE", "FR", "IT", "ES"]);
});

test("simulate endpoint matches the shared model", async () => {
  const input = { market: "UK", segment: "first", offer: "pct", depth: 15, audience: 10000, margin: 0.22, beta: 0.6, gamma: 0.12 };
  const res = await fetch(base + "/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const expected = model.simulate(PersonaModel.normaliseState(anchors, input));
  assert.ok(Math.abs(body.scenario.netIncremental - expected.scenario.netIncremental) < 1e-9);
  assert.ok(Math.abs(body.scenario.netIncremental - 1060.2) < 1e-6);
  assert.equal(body.grid.length, 15);
});

test("simulate rejects a body that is not a JSON object", async () => {
  const res = await fetch(base + "/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "[1,2]" });
  assert.equal(res.status, 400);
  const bad = await fetch(base + "/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not json" });
  assert.equal(bad.status, 400);
});

test("simulate rejects oversized bodies", async () => {
  const big = JSON.stringify({ pad: "x".repeat(8 * 1024) });
  const res = await fetch(base + "/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: big }).catch(() => null);
  // The server may close the socket before the client finishes sending; either way it must not succeed.
  if (res) assert.equal(res.status, 413);
});

test("unknown API route is a JSON 404", async () => {
  const res = await fetch(base + "/api/nope");
  assert.equal(res.status, 404);
  assert.match(res.headers.get("content-type"), /application\/json/);
});

test("the static page is served and the server code is not", async () => {
  const page = await fetch(base + "/persona-simulator.html");
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.equal((await fetch(base + "/backend/server.js")).status, 404);
  assert.equal((await fetch(base + "/backend/test/persona-api.test.js")).status, 404);
  assert.equal((await fetch(base + "/%2e%2e/package.json")).status, 404);
});

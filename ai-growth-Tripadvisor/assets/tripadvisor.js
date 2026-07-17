/* =========================================================
   Tripadvisor x Adrien Enjalbert - interactions & data charts
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- scroll progress + nav state ---------- */
  const nav = $("#nav");
  const progress = $("#progress");
  function onScroll() {
    const st = window.scrollY || document.documentElement.scrollTop;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
    nav.classList.toggle("scrolled", st > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");
  navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => navLinks.classList.remove("open")));

  /* ---------- section dots ---------- */
  const dotsNav = $("#dotsNav");
  const dotSections = $$("section[data-dot]");
  dotSections.forEach((sec) => {
    const a = document.createElement("a");
    a.href = "#" + (sec.id || "");
    a.innerHTML = '<span>' + sec.dataset.dot + '</span>';
    a.dataset.target = sec.id;
    dotsNav.appendChild(a);
  });
  const dotLinks = $$("#dotsNav a");
  const navLinkEls = $$("#navLinks a");

  /* ---------- reveal on scroll ---------- */
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
  );
  $$(".reveal").forEach((el) => revealObs.observe(el));

  /* ---------- active section (dots) ---------- */
  const activeObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.id;
          dotLinks.forEach((d) => d.classList.toggle("active", d.dataset.target === id));
          navLinkEls.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
        }
      });
    },
    { threshold: 0.5 }
  );
  dotSections.forEach((s) => activeObs.observe(s));

  /* ---------- count-up ---------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    if (reduce) { el.textContent = prefix + target.toFixed(decimals) + suffix; return; }
    const dur = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = prefix + (decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString()) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + (decimals ? target.toFixed(decimals) : Math.round(target).toLocaleString()) + suffix;
    }
    requestAnimationFrame(tick);
  }
  const countObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { animateCount(e.target); countObs.unobserve(e.target); }
      });
    },
    { threshold: 0.6 }
  );
  $$("[data-count]").forEach((el) => countObs.observe(el));

  /* ---------- charts ---------- */
  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // Grouped bar chart: two series per category, animated
  function groupedBar(id, cats, a, b, colorA, colorB, fmt) {
    const svg = $("#" + id);
    if (!svg) return null;
    svg.innerHTML = "";
    const W = 500, H = 300, pl = 34, pr = 20, pt = 26, pb = 42;
    const plotW = W - pl - pr, plotH = H - pt - pb;
    const max = Math.max.apply(null, a.concat(b)) * 1.2;
    const n = cats.length, slot = plotW / n;
    const bw = slot * 0.24, gap = slot * 0.06;

    for (let g = 0; g <= 4; g++) {
      const y = pt + (plotH / 4) * g;
      svg.appendChild(el("line", { class: "gridline", x1: pl, y1: y, x2: W - pr, y2: y }));
    }
    cats.forEach((c, i) => {
      const x = pl + slot * i + slot / 2;
      const t = el("text", { class: "axislabel", x: x, y: H - 16, "text-anchor": "middle" });
      t.textContent = c;
      svg.appendChild(t);
    });

    // gradient defs for series B
    const grad = el("linearGradient", { id: id + "-gb", x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(el("stop", { offset: "0", "stop-color": colorB }));
    grad.appendChild(el("stop", { offset: "1", "stop-color": colorB, "stop-opacity": ".72" }));
    const defs = el("defs", {}); defs.appendChild(grad); svg.appendChild(defs);

    const bars = [];
    function addBar(v, x, fill) {
      const bh = (v / max) * plotH;
      const r = el("rect", { class: "bar", x: x, y: pt + plotH, width: bw, height: 0, rx: 5, fill: fill });
      svg.appendChild(r);
      const lab = el("text", { class: "barval", x: x + bw / 2, y: pt + plotH - bh - 8, "text-anchor": "middle", opacity: 0 });
      lab.textContent = fmt ? fmt(v) : v;
      svg.appendChild(lab);
      bars.push({ r, bh, y: pt + plotH - bh, lab });
    }
    cats.forEach((c, i) => {
      const cx = pl + slot * i + slot / 2;
      addBar(a[i], cx - bw - gap / 2, colorA);
      addBar(b[i], cx + gap / 2, "url(#" + id + "-gb)");
    });

    return function play() {
      if (reduce) { bars.forEach((bar) => { bar.r.setAttribute("height", bar.bh); bar.r.setAttribute("y", bar.y); bar.lab.setAttribute("opacity", 1); }); return; }
      bars.forEach((bar, i) => setTimeout(() => {
        bar.r.style.transition = "height .9s cubic-bezier(.22,1,.36,1), y .9s cubic-bezier(.22,1,.36,1)";
        bar.r.setAttribute("height", bar.bh); bar.r.setAttribute("y", bar.y);
        bar.lab.style.transition = "opacity .5s ease .5s"; bar.lab.setAttribute("opacity", 1);
      }, i * 90));
    };
  }

  // Single-series bar chart, per-bar colour + optional dashed "directional" bars
  function coloredBar(id, cats, values, colors, dashed, fmt) {
    const svg = $("#" + id);
    if (!svg) return null;
    svg.innerHTML = "";
    const W = 500, H = 320, pl = 34, pr = 16, pt = 22, pb = 64;
    const plotW = W - pl - pr, plotH = H - pt - pb;
    const max = Math.max.apply(null, values) * 1.18;
    const n = cats.length, slot = plotW / n;
    const bw = slot * 0.52;

    for (let g = 0; g <= 4; g++) {
      const y = pt + (plotH / 4) * g;
      svg.appendChild(el("line", { class: "gridline", x1: pl, y1: y, x2: W - pr, y2: y }));
    }

    const bars = [];
    cats.forEach((c, i) => {
      const x = pl + slot * i + (slot - bw) / 2;
      const v = values[i];
      const bh = (v / max) * plotH;
      const r = el("rect", { class: "bar", x: x, y: pt + plotH, width: bw, height: 0, rx: 5, fill: colors[i] });
      if (dashed && dashed[i]) { r.setAttribute("fill-opacity", ".45"); r.setAttribute("stroke", colors[i]); r.setAttribute("stroke-width", "1.5"); r.setAttribute("stroke-dasharray", "4 3"); }
      svg.appendChild(r);
      const lab = el("text", { class: "barval", x: x + bw / 2, y: pt + plotH - bh - 8, "text-anchor": "middle", opacity: 0 });
      lab.textContent = (fmt ? fmt(v) : v) + (dashed && dashed[i] ? "*" : "");
      svg.appendChild(lab);
      // two-line category label
      const parts = String(c).split("|");
      parts.forEach((pp, li) => {
        const t = el("text", { class: "axislabel", x: x + bw / 2, y: H - 42 + li * 13, "text-anchor": "middle" });
        t.textContent = pp;
        svg.appendChild(t);
      });
      bars.push({ r, bh, y: pt + plotH - bh, lab });
    });

    return function play() {
      if (reduce) { bars.forEach((bar) => { bar.r.setAttribute("height", bar.bh); bar.r.setAttribute("y", bar.y); bar.lab.setAttribute("opacity", 1); }); return; }
      bars.forEach((bar, i) => setTimeout(() => {
        bar.r.style.transition = "height .9s cubic-bezier(.22,1,.36,1), y .9s cubic-bezier(.22,1,.36,1)";
        bar.r.setAttribute("height", bar.bh); bar.r.setAttribute("y", bar.y);
        bar.lab.style.transition = "opacity .5s ease .5s"; bar.lab.setAttribute("opacity", 1);
      }, i * 70));
    };
  }

  const pct = (v) => v.toFixed(0) + "%";
  const POS = "#14b083", MARG = "#f2b53c", NEG = "#ff6b6b", GREY = "#A7BDB2";

  const players = {
    // Incrementality by market x segment, coloured by value verdict; * = directional (FR/IT targeting issue)
    chartIncr: coloredBar(
      "chartIncr",
      ["UK|First", "DE|First", "FR|First", "UK|Lapsed", "IT|First", "ES|First", "FR|Lapsed", "UK|Repeat", "DE|Repeat"],
      [71, 63, 58, 52, 51, 48, 44, 31, 28],
      [POS, POS, MARG, MARG, MARG, MARG, NEG, NEG, NEG],
      [false, false, true, false, true, false, true, false, false],
      pct
    ),
    // The deadweight story: redemption stays high while incrementality collapses across tenure (UK)
    chartDead: groupedBar("chartDead", ["First", "Lapsed", "Repeat"], [18, 14, 21], [71, 52, 31], "#A7BDB2", "#00976E", pct),
  };

  const chartObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && players[e.target.id]) {
          players[e.target.id]();
          chartObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  Object.keys(players).forEach((id) => { const n = $("#" + id); if (n && players[id]) chartObs.observe(n); });

  /* ---------- CRISP-DM live loop ---------- */
  const crispStage = $("#crispStage");
  if (crispStage) {
    const crisp = $("#crisp");
    const svg = $("#crispSvg");
    const nodesWrap = $("#crispNodes");
    const panel = $("#crispPanel");
    const playBtn = $("#crispPlay");
    const countEl = $("#crispCount");

    // Phase config. ang = position on the ring (deg, 0 = right, CCW+). short = ring label, name = full.
    const PH = [
      { n: "1", short: "Business", name: "Business understanding", role: "human", ang: 120, weighted: true,
        tag: "Start here \u00B7 the gate", who: "Human-led",
        body: "Define the decision and the success metric before anything else. Ask the honest question first: is this even worth solving, or is a simple rule enough? Sometimes the best model is no model.",
        matters: "The business problem, not the algorithm, decides whether any of this creates value." },
      { n: "2", short: "Data", name: "Data understanding", role: "hybrid", ang: 60, weighted: true,
        tag: "Trust the data first", who: "Human + AI",
        body: "This is where the \u201Cincrementality is directional\u201D flag lives. France and Italy had broken holdouts, so you cannot automate on them yet. No trust in the data, no automation on top of it.",
        matters: "Get the data wrong here and every clever thing downstream is confidently wrong." },
      { n: "3", short: "Prep", name: "Data preparation", role: "ai", ang: 0, weighted: true,
        tag: "The unglamorous 60\u201370%", who: "AI-assisted",
        body: "ETL, clean-up, de-duplication, fixed attribution and validated holdouts. Boring, and the single biggest determinant of whether anything downstream actually works.",
        matters: "Most of the real effort lives in these first three phases, so most of the value does too." },
      { n: "4", short: "Model", name: "Modelling", role: "ai", ang: -60,
        tag: "Simplest that works", who: "AI drafts",
        body: "Draft the experiment or the offer. The goal is the simplest model that answers the question, not the fanciest one, with powered sample sizes and guardrails built in.",
        matters: "The model is the easy 10%. It only earns trust on top of solid data work." },
      { n: "\u2713", short: "Evaluate", name: "Evaluation", role: "gate", ang: -120,
        tag: "The human gate", who: "Human sign-off",
        body: "Holdout, incrementality and significance, reviewed by a person before anything goes live. This is the gate that would have caught the German \u00A310 mistake in Part 3.",
        matters: "Nothing ships without a human here. Judgement stays human by design." },
      { n: "5", short: "Deploy", name: "Deployment", role: "hybrid", ang: 180,
        tag: "Launch, then loop", who: "AI + human",
        body: "Launch, monitor, and write the learning brief. The validated learning writes back to the knowledge core, and the loop starts again on the next idea.",
        matters: "This closes the feedback loop: every experiment leaves the system smarter than it found it." },
    ];

    const CX = 50, CY = 50, R = 36;
    const rad = (d) => (d * Math.PI) / 180;
    const pt = (a, r = R) => ({ x: CX + r * Math.cos(rad(a)), y: CY - r * Math.sin(rad(a)) });
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

    // ---- build the SVG scene ----
    // arrow-head markers
    const defs = mk("defs", {});
    const marker = (id, fill, w) => {
      const m = mk("marker", { id: id, viewBox: "0 0 10 10", refX: 8.5, refY: 5, markerWidth: w, markerHeight: w, orient: "auto-start-reverse" });
      const pth = mk("path", { d: "M 0.5 1 L 9 5 L 0.5 9 Z" }); pth.setAttribute("fill", fill);
      m.appendChild(pth); return m;
    };
    defs.appendChild(marker("crispHeadMint", "#34E0A1", 4.4));
    defs.appendChild(marker("crispHeadTeal", "#46bfe0", 4.6));
    defs.appendChild(marker("crispHeadGold", "#f2b53c", 4.6));
    svg.appendChild(defs);

    // faint guide ring so the loop path reads even in the gaps
    svg.appendChild(mk("circle", { class: "guide", cx: CX, cy: CY, r: R }));

    // helper: arc segment along the ring, clockwise (angles decrease), trimmed by gaps at each end
    const arc = (aFrom, aTo, gapFrom, gapTo) => {
      const s = pt(aFrom - gapFrom, R), e = pt(aTo + gapTo, R);
      return "M " + s.x.toFixed(2) + " " + s.y.toFixed(2) + " A " + R + " " + R + " 0 0 1 " + e.x.toFixed(2) + " " + e.y.toFixed(2);
    };
    // directional connector arcs between adjacent phases (Business->Data is handled by the iterate double-arrow)
    const GAP = 15;
    [[60, 0], [0, -60], [-60, -120], [-120, -180], [-180, -240]].forEach(([a1, a2]) => {
      svg.appendChild(mk("path", { class: "flow-seg", "marker-end": "url(#crispHeadMint)", d: arc(a1, a2, GAP, GAP) }));
    });

    // knowledge core (cylinder) at centre
    svg.appendChild(mk("path", { class: "core-body", d: "M 39.5 47 L 39.5 54.5 A 10.5 2.8 0 0 0 60.5 54.5 L 60.5 47 Z" }));
    svg.appendChild(mk("ellipse", { class: "core-top", cx: 50, cy: 47, rx: 10.5, ry: 2.8 }));
    const ct1 = mk("text", { class: "core-t1", x: 50, y: 48.6 }); ct1.textContent = "DATA"; svg.appendChild(ct1);
    const ct2 = mk("text", { class: "core-t2", x: 50, y: 52.8 }); ct2.textContent = "knowledge core"; svg.appendChild(ct2);

    const b = pt(120), da = pt(60), ev = pt(-120);

    // iterate double-arrow between Business (120) and Data (60), the canonical top relationship
    svg.appendChild(mk("path", { class: "link-iterate", "marker-start": "url(#crispHeadTeal)", "marker-end": "url(#crispHeadTeal)",
      d: "M " + (b.x + 6) + " " + (b.y + 2.6) + " Q 50 " + (b.y + 9) + " " + (da.x - 6) + " " + (da.y + 2.6) }));

    // feedback arc: Evaluation -> Business, bowing toward the core (the human loop)
    svg.appendChild(mk("path", { class: "link-feedback", "marker-end": "url(#crispHeadGold)",
      d: "M " + (ev.x + 3.5) + " " + (ev.y - 4) + " Q 45 50 " + (b.x + 3.5) + " " + (b.y + 5) }));

    // comet (rides the ring)
    const cometTail = mk("path", { class: "comet-tail" });
    const comet = mk("circle", { class: "comet", r: 1.7 });
    svg.appendChild(cometTail); svg.appendChild(comet);

    // label chips on the two special links
    const chip = (x, y, text, cls) => {
      const w = text.length * 1.72 + 4.6, h = 5.6;
      const g = mk("g", { class: "chip" });
      g.appendChild(mk("rect", { class: "chip-bg " + cls, x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 2.8 }));
      const t = mk("text", { class: "chip-tx " + cls, x: x, y: y + 0.15 }); t.textContent = text;
      g.appendChild(t); svg.appendChild(g);
    };
    chip(50, b.y + 8.5, "iterate", "iterate");
    chip(37, 67, "human validates", "feedback");

    // ---- build the HTML nodes ----
    PH.forEach((d, i) => {
      const p = pt(d.ang);
      const b2 = document.createElement("button");
      b2.type = "button";
      b2.className = "cnode role-" + d.role + (d.weighted ? " weighted" : "");
      b2.style.left = p.x + "%";
      b2.style.top = p.y + "%";
      b2.dataset.i = i;
      b2.setAttribute("aria-label", "Phase " + (i + 1) + ": " + d.name + " (" + d.who + ")");
      b2.innerHTML = '<span class="cn-num">' + d.n + '</span><span class="cn-name">' + d.short + '</span><span class="cn-role" aria-hidden="true"></span>';
      nodesWrap.appendChild(b2);
    });
    const nodeEls = $$(".cnode", nodesWrap);

    // caption under the stage
    const cap = document.createElement("div");
    cap.className = "crisp-cap";
    cap.innerHTML = "&#8635; runs clockwise &middot; loops back on itself &middot; the first three phases carry the weight";
    crispStage.after(cap);

    // ---- state + render ----
    let active = -1, pinned = false, playing = false, raf = 0, last = 0, t = 120;

    function renderPanel(i) {
      const d = PH[i];
      panel.innerHTML = '<span class="cp-tag">Phase ' + (i + 1) + ' \u00B7 ' + d.tag + '</span>' +
        '<h4>' + d.name + '</h4><p>' + d.body + '</p>' +
        '<p class="cp-matters">' + d.matters + '</p>' +
        '<span class="cp-who">Owned by: ' + d.who + '</span>';
      countEl.textContent = "Phase " + (i + 1) + " / 6";
    }
    function setActive(i) {
      if (i === active) return;
      active = i;
      nodeEls.forEach((n, j) => n.classList.toggle("is-active", j === i));
      renderPanel(i);
    }
    function placeComet(a) {
      const p = pt(a, R);
      comet.setAttribute("cx", p.x); comet.setAttribute("cy", p.y);
      const t1 = pt(a + 9, R), t2 = pt(a + 20, R);
      cometTail.setAttribute("d", "M " + t2.x + " " + t2.y + " Q " + t1.x + " " + t1.y + " " + p.x + " " + p.y);
    }
    // index of phase the comet is currently at/heading through (clockwise)
    function idxFor(angle) { let k = Math.floor((120 - angle) / 60); return ((k % 6) + 6) % 6; }

    function frame(ts) {
      if (!last) last = ts;
      const dt = Math.min(ts - last, 60); last = ts;
      t -= dt / 1000 * 10.6; // ~34s per full revolution
      if (t <= -240) t += 360;
      placeComet(t);
      setActive(idxFor(t));
      raf = requestAnimationFrame(frame);
    }
    function play() {
      if (playing || pinned) return;
      playing = true; crisp.classList.add("playing");
      playBtn.setAttribute("aria-pressed", "true");
      playBtn.setAttribute("aria-label", "Pause the loop animation");
      playBtn.querySelector(".cp-txt").textContent = "Pause loop";
      last = 0; raf = requestAnimationFrame(frame);
    }
    function pause() {
      playing = false; crisp.classList.remove("playing");
      cancelAnimationFrame(raf);
      playBtn.setAttribute("aria-pressed", "false");
      playBtn.setAttribute("aria-label", "Play the loop animation");
      playBtn.querySelector(".cp-txt").textContent = "Play loop";
    }

    // interactions: click a node to pin it, click again / play to resume
    nodesWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".cnode"); if (!btn) return;
      const i = +btn.dataset.i;
      if (pinned && i === active) { pinned = false; play(); return; }
      pinned = true; pause();
      t = PH[i].ang; placeComet(t); setActive(i);
    });
    playBtn.addEventListener("click", () => {
      if (playing) { pinned = true; pause(); }
      else { pinned = false; play(); }
    });

    // start only when it scrolls into view; pause when it leaves (respects reveal-on-view preference)
    setActive(0); placeComet(120);
    if (reduce) {
      // static: no autoplay, manual exploration only
      pinned = true;
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { if (!pinned) play(); }
          else pause();
        });
      }, { threshold: 0.35 });
      io.observe(crispStage);
    }
  }
})();

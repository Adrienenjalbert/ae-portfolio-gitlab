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

  /* ---------- CRISP-DM interactive ---------- */
  const crispNodes = $("#crispNodes");
  if (crispNodes) {
    const CRISP = [
      { n: "1", name: "Business understanding", tag: "Start here \u00B7 the gate", who: "Human-led",
        body: "Define the decision and the success metric. Ask the honest question first: is this even worth solving, or is a simple rule enough? Sometimes the best model is no model." },
      { n: "2", name: "Data understanding", tag: "Trust the data first", who: "Human + AI",
        body: "This is where the \u201Cincrementality is directional\u201D flag lives. France and Italy had broken holdouts, so you cannot automate on them yet. No trust, no automation." },
      { n: "3", name: "Data preparation", tag: "The unglamorous 60\u201370%", who: "AI-assisted",
        body: "ETL, clean-up, de-duplication, fixed attribution and validated holdouts. Boring, and the single biggest determinant of whether anything downstream actually works." },
      { n: "4", name: "Modelling", tag: "Simplest that works", who: "AI drafts",
        body: "Draft the experiment or the offer. The goal is the simplest model that answers the question, not the fanciest one, with powered sample sizes and guardrails built in." },
      { n: "\u2713", name: "Evaluation", tag: "The human gate", who: "Human sign-off",
        body: "Holdout, incrementality and significance, reviewed by a person before anything goes live. This is the gate that would have caught the German \u00A310 mistake in Part 3." },
      { n: "5", name: "Deployment", tag: "Launch, then loop", who: "AI + human",
        body: "Launch, monitor, and write the learning brief. Then it loops back to Business understanding, so every experiment leaves the system smarter than it found it." },
    ];
    const crispPanel = $("#crispPanel");
    crispNodes.innerHTML = "";
    CRISP.forEach((d, i) => {
      const b = document.createElement("button");
      b.className = "crisp-node" + (i < 2 ? " start" : "") + (i === 0 ? " is-active" : "");
      b.setAttribute("data-i", i);
      b.setAttribute("aria-label", "Phase " + (i + 1) + ": " + d.name);
      b.innerHTML = '<span class="cn-num">' + d.n + '</span><span class="cn-name">' + d.name + '</span>';
      crispNodes.appendChild(b);
    });
    const crispBtns = $$(".crisp-node", crispNodes);
    function renderCrisp(i) {
      const d = CRISP[i];
      crispPanel.innerHTML = '<span class="cp-tag">Phase ' + (i + 1) + ' \u00B7 ' + d.tag + '</span><h4>' + d.name + '</h4><p>' + d.body + '</p><span class="cp-who">Owned by: ' + d.who + '</span>';
      crispBtns.forEach((n, j) => n.classList.toggle("is-active", j === i));
    }
    crispNodes.addEventListener("click", (e) => { const b = e.target.closest(".crisp-node"); if (b) renderCrisp(+b.dataset.i); });
    crispNodes.addEventListener("mouseover", (e) => { const b = e.target.closest(".crisp-node"); if (b) renderCrisp(+b.dataset.i); });
    renderCrisp(0);
  }
})();

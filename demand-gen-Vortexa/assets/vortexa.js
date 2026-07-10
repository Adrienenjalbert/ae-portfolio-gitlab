/* =========================================================
   Vortexa x Adrien Enjalbert - interactions & diagnostic charts
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
      bars.forEach((bar, i) => setTimeout(() => {
        bar.r.style.transition = "height .9s cubic-bezier(.22,1,.36,1), y .9s cubic-bezier(.22,1,.36,1)";
        bar.r.setAttribute("height", bar.bh); bar.r.setAttribute("y", bar.y);
        bar.lab.style.transition = "opacity .5s ease .5s"; bar.lab.setAttribute("opacity", 1);
      }, i * 90));
    };
  }

  const pct = (v) => v.toFixed(1) + "%";
  const num = (v) => v.toLocaleString();

  const players = {
    chartVolume: groupedBar("chartVolume", ["Demo fills", "MCLs", "SAOs"], [298, 134, 38], [412, 156, 31], "#ABBBCE", "#0090B9", num),
    chartConv: groupedBar("chartConv", ["Demo→MCL", "MCL→SAO", "Demo→SAO"], [45.0, 28.4, 12.8], [37.9, 19.9, 7.5], "#ABBBCE", "#7B44E3", pct),
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
})();

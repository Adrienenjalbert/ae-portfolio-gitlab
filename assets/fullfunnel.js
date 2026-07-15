/* =========================================================
   Stravito x Adrien Enjalbert - interactions & charts
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- scroll progress + nav state ---------- */
  const nav = $("#nav");
  const progress = $("#progress");
  function onScroll() {
    const st = window.scrollY || document.documentElement.scrollTop;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
    if (nav) nav.classList.toggle("scrolled", st > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu (only if present) ---------- */
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
    $$("#navLinks a").forEach((a) => a.addEventListener("click", () => navLinks.classList.remove("open")));
  }

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
        if (e.isIntersecting) {
          e.target.classList.add("in");
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
  );
  $$(".reveal").forEach((el) => revealObs.observe(el));

  /* ---------- active section (dots + nav) ---------- */
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

  /* ---------- before / after toggle ---------- */
  $$(".ba-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".ba-toggle button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.dataset.ba;
      $$(".ba-panel").forEach((p) => p.classList.remove("active"));
      $("#ba-" + key).classList.add("active");
    });
  });

  /* ---------- funnel deep-dive ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const L = "../assets/funnel/logos/";
  const stages = [
    {
      color: "#0e2a6e", badge: "TOFU · Awareness", title: "Create demand",
      objective: "Increase brand awareness and drive traffic. 100% educational, ungated content that helps prospects solve a pain point, with no lead-gen attempt.",
      audience: "Broad: seniority × job function × industry × location.",
      platforms: [["google-ads.png", "Google Ads"], ["microsoft-ads.png", "Microsoft Ads"], ["youtube.png", "YouTube", 1], ["linkedin.png", "LinkedIn"], ["reddit.png", "Reddit"], ["seo.png", "SEO", 1]],
      channels: ["Display image & video", "Paid social", "SEO & blog", "Industry reports"],
      content: ["Industry trend reports", "Ungated ebooks", "Infographics", "Video & animation", "Expert interviews"],
      format: "Image, animation, carousel, video. Objective: impressions & video views.",
      message: "1 · The pain we solve  2 · The service we offer  3 · The result of working with us.",
      metrics: ["Impressions", "CTR", "Engagement rate", "Website visits", "Content downloads"],
    },
    {
      color: "#2a5be0", badge: "RMK · Authority", title: "Build trust",
      objective: "Re-engage people who already know us with proof. The job here is credibility: case studies, testimonials and stats that show results.",
      audience: "30-day retargeting of TOFU engagers.",
      platforms: [["linkedin.png", "LinkedIn"], ["meta.png", "Meta"], ["google-ads.png", "Google Ads"], ["microsoft-ads.png", "Microsoft Ads"], ["g2.png", "G2"], ["capterra.png", "Capterra"]],
      channels: ["Social retargeting", "Display retargeting", "PPC RMK"],
      content: ["Case studies", "Testimonials & success stories", "Expert advice", "Comparative guides", "Awards · G2 · Gartner"],
      format: "Image, animation, carousel, video. Objective: website visits & video views.",
      message: "They already know us, so focus on trust, proof and standing out vs. staffing agencies.",
      metrics: ["Engagement", "Return visits", "Assisted conversions"],
    },
    {
      color: "#1e49e6", badge: "MOFU · Interest", title: "Capture interest",
      objective: "Nurture leads with high-value gated magnets and CRM sequences. Put enough effort into magnets that you could charge for them (but won't).",
      audience: "Engaged leads now familiar with the brand.",
      platforms: [["linkedin.png", "LinkedIn"], ["meta.png", "Meta"], ["google-ads.png", "Google Ads"], ["youtube.png", "YouTube", 1], ["hubspot.png", "HubSpot", 1]],
      channels: ["Conversation ads", "PPC RMK", "Webinars", "CRM email drip", "Monthly newsletter"],
      content: ["Gated ebooks", "Interactive content", "Checklists", "Free tools & audits", "Demo environment"],
      format: "Search competitor & RMK, image, animation, conversation & native lead-gen forms. 4 fields max.",
      message: "1 · Core service  2 · How we're different  3 · Expected result  4 · Cost of not using us.",
      metrics: ["Lead-gen form submissions", "Cost per lead (CPL)"],
    },
    {
      color: "#4f74ff", badge: "BOFU · Decision", title: "Convert",
      objective: "Turn engaged leads into customers. Emphasise the USP, drive urgency, and remove every point of friction to the demo.",
      audience: "Highly engaged leads: webinar attendees, multi-asset downloaders.",
      platforms: [["meta.png", "Meta"], ["linkedin.png", "LinkedIn"], ["google-ads.png", "Google Ads"], ["microsoft-ads.png", "Microsoft Ads"]],
      channels: ["Single image & video ads", "Spotlight ads", "Conversation ads", "RMK display"],
      content: ["Free trial & product access", "Book a demo / strategy call", "Success stories & testimonials", "Limited-time offers"],
      format: "Single image, animation. Click-only ads capturing phone and context, no navigational LP needed.",
      message: "Personalised & direct: “Get Started Now” / “Schedule a Consultation”. Reply to leads within hours.",
      metrics: ["CPL", "Sales-qualified leads (SQLs)", "Closed Won", "ROAS"],
    },
  ];

  const detail = $("#stageDetail");
  function chips(arr, dark) {
    return arr.map((x) => '<span class="tag">' + x + "</span>").join("");
  }
  function items(arr) {
    return arr.map((x) => '<div class="sd-item"><span class="dotm"></span><span>' + x + "</span></div>").join("");
  }
  function logos(arr) {
    return arr.map((x) => '<span><img class="' + (x[2] ? "tall" : "") + '" src="' + L + x[0] + '" alt="' + x[1] + '" loading="lazy" /></span>').join("");
  }
  function renderStage(i) {
    const s = stages[i];
    detail.innerHTML =
      '<div class="sd-fade">' +
      '<span class="sd-badge" style="background:' + s.color + '">' + s.badge + "</span>" +
      "<h3>" + s.title + "</h3>" +
      '<p class="sd-obj">' + s.objective + "</p>" +
      '<div class="sd-block"><h5>Platforms</h5><div class="sd-logos">' + logos(s.platforms) + "</div></div>" +
      '<div class="sd-block"><h5>Audience</h5><p style="font-size:14px;color:var(--muted)">' + s.audience + "</p></div>" +
      '<div class="sd-block"><h5>Channel mix</h5><div class="sd-metrics">' + chips(s.channels) + "</div></div>" +
      '<div class="sd-block"><h5>Content type</h5><div class="sd-grid">' + items(s.content) + "</div></div>" +
      '<div class="sd-block"><h5>Ad format & objective</h5><p style="font-size:14px;color:var(--muted)">' + s.format + "</p></div>" +
      '<div class="sd-block"><h5>Core message</h5><p style="font-size:14px;color:var(--ink);font-weight:500">' + s.message + "</p></div>" +
      '<div class="sd-block"><h5>Metrics tracked</h5><div class="sd-metrics">' + chips(s.metrics) + "</div></div>" +
      "</div>";
  }
  if (detail) {
    $$("#funnel .stage").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$("#funnel .stage").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderStage(parseInt(btn.dataset.stage, 10));
      });
      btn.addEventListener("mouseenter", () => {
        if (window.innerWidth > 960) {
          $$("#funnel .stage").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          renderStage(parseInt(btn.dataset.stage, 10));
        }
      });
    });
    renderStage(0);
  }

  /* ---------- charts ---------- */
  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  const MONTHS = ["Apr", "May", "Jun", "Jul"];

  // Combo chart: bars (primary, left axis) + line (secondary, right axis)
  function comboChart(id, bars, line, barColor, opts) {
    opts = opts || {};
    const svg = $("#" + id);
    if (!svg) return;
    svg.innerHTML = "";
    const W = 500, H = 300, pl = 44, pr = 44, pt = 24, pb = 40;
    const plotW = W - pl - pr, plotH = H - pt - pb;
    const maxBar = Math.max.apply(null, bars) * 1.15;
    const maxLine = Math.max.apply(null, line) * 1.25;
    const n = bars.length;
    const slot = plotW / n;
    const bw = slot * 0.34;

    // gridlines
    for (let g = 0; g <= 4; g++) {
      const y = pt + (plotH / 4) * g;
      svg.appendChild(el("line", { class: "gridline", x1: pl, y1: y, x2: W - pr, y2: y }));
    }
    // x labels
    MONTHS.forEach((m, i) => {
      const x = pl + slot * i + slot / 2;
      const t = el("text", { class: "axislabel", x: x, y: H - 16, "text-anchor": "middle" });
      t.textContent = m;
      svg.appendChild(t);
    });

    // bars (animated)
    const barEls = [];
    bars.forEach((v, i) => {
      const bh = (v / maxBar) * plotH;
      const x = pl + slot * i + slot / 2 - bw / 2;
      const r = el("rect", { class: "bar", x: x, y: pt + plotH, width: bw, height: 0, rx: 6, fill: barColor });
      svg.appendChild(r);
      barEls.push({ r, bh, y: pt + plotH - bh });
      // value label
      const lab = el("text", { class: "barval", x: x + bw / 2, y: pt + plotH - bh - 8, "text-anchor": "middle", opacity: 0 });
      lab.textContent = opts.barFmt ? opts.barFmt(v) : v.toLocaleString();
      svg.appendChild(lab);
      barEls[i].lab = lab;
    });

    // line (animated draw)
    const pts = line.map((v, i) => {
      const x = pl + slot * i + slot / 2 + bw * 0.55;
      const y = pt + plotH - (v / maxLine) * plotH;
      return [x, y];
    });
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const path = el("path", { class: "linepath", d: d });
    svg.appendChild(path);
    const dots = pts.map((p, i) => {
      const c = el("circle", { cx: p[0], cy: p[1], r: 4.5, fill: "#1e49e6", stroke: "#fff", "stroke-width": 2, opacity: 0 });
      svg.appendChild(c);
      const lab = el("text", { class: "barval", x: p[0], y: p[1] - 12, "text-anchor": "middle", fill: "#1e49e6", opacity: 0 });
      lab.textContent = opts.lineFmt ? opts.lineFmt(line[i]) : line[i];
      svg.appendChild(lab);
      return { c, lab };
    });

    function play() {
      barEls.forEach((b, i) => {
        setTimeout(() => {
          b.r.style.transition = "height .9s cubic-bezier(.22,1,.36,1), y .9s cubic-bezier(.22,1,.36,1)";
          b.r.setAttribute("height", b.bh);
          b.r.setAttribute("y", b.y);
          b.lab.style.transition = "opacity .5s ease .5s";
          b.lab.setAttribute("opacity", 1);
        }, i * 120);
      });
      if (!reduce) {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        path.getBoundingClientRect();
        path.style.transition = "stroke-dashoffset 1.1s ease .4s";
        path.style.strokeDashoffset = 0;
      }
      dots.forEach((dt, i) => setTimeout(() => { dt.c.setAttribute("opacity", 1); dt.lab.setAttribute("opacity", 1); }, 600 + i * 140));
    }
    return play;
  }

  // Single bar chart with value labels
  function barChart(id, data, color, fmt) {
    const svg = $("#" + id);
    if (!svg) return;
    svg.innerHTML = "";
    const W = 500, H = 300, pl = 30, pr = 30, pt = 30, pb = 40;
    const plotW = W - pl - pr, plotH = H - pt - pb;
    const max = Math.max.apply(null, data) * 1.18;
    const n = data.length, slot = plotW / n, bw = slot * 0.42;
    for (let g = 0; g <= 4; g++) {
      const y = pt + (plotH / 4) * g;
      svg.appendChild(el("line", { class: "gridline", x1: pl, y1: y, x2: W - pr, y2: y }));
    }
    MONTHS.forEach((m, i) => {
      const x = pl + slot * i + slot / 2;
      const t = el("text", { class: "axislabel", x: x, y: H - 16, "text-anchor": "middle" });
      t.textContent = m;
      svg.appendChild(t);
    });
    const grad = el("linearGradient", { id: id + "-g", x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(el("stop", { offset: "0", "stop-color": color }));
    grad.appendChild(el("stop", { offset: "1", "stop-color": color, "stop-opacity": ".7" }));
    const defs = el("defs", {}); defs.appendChild(grad); svg.appendChild(defs);
    const bars = [];
    data.forEach((v, i) => {
      const bh = (v / max) * plotH;
      const x = pl + slot * i + slot / 2 - bw / 2;
      const r = el("rect", { class: "bar", x: x, y: pt + plotH, width: bw, height: 0, rx: 7, fill: "url(#" + id + "-g)" });
      svg.appendChild(r);
      const lab = el("text", { class: "barval", x: x + bw / 2, y: pt + plotH - bh - 9, "text-anchor": "middle", opacity: 0 });
      lab.textContent = fmt ? fmt(v) : v;
      svg.appendChild(lab);
      bars.push({ r, bh, y: pt + plotH - bh, lab });
    });
    return function play() {
      bars.forEach((b, i) => setTimeout(() => {
        b.r.style.transition = "height .9s cubic-bezier(.22,1,.36,1), y .9s cubic-bezier(.22,1,.36,1)";
        b.r.setAttribute("height", b.bh); b.r.setAttribute("y", b.y);
        b.lab.style.transition = "opacity .5s ease .55s"; b.lab.setAttribute("opacity", 1);
      }, i * 130));
    };
  }

  const gbp0 = (v) => "£" + Math.round(v).toLocaleString();
  const gbp2 = (v) => "£" + v.toFixed(2);
  const gbp1 = (v) => "£" + v.toFixed(1);
  const kfmt = (v) => v >= 1000 ? (v / 1000).toFixed(0) + "k" : v;

  const players = {
    chartReach: comboChart("chartReach", [16176, 57990, 203380, 98411], [0.12, 0.07, 0.02, 0.07], "#0e2a6e", { barFmt: kfmt, lineFmt: gbp2 }),
    chartSessions: comboChart("chartSessions", [718, 1761, 2499, 2401], [2.8, 2.4, 1.8, 2.7], "#0e2a6e", { barFmt: (v) => v.toLocaleString(), lineFmt: gbp1 }),
    chartCpl: barChart("chartCpl", [1006, 287, 207, 151], "#1e49e6", gbp0),
    chartSql: barChart("chartSql", [1006, 478, 228, 167], "#0e2a6e", gbp0),
  };

  const chartObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && players[e.target.id]) {
          players[e.target.id] && players[e.target.id]();
          chartObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  ["chartReach", "chartSessions", "chartCpl", "chartSql"].forEach((id) => {
    const n = $("#" + id); if (n) chartObs.observe(n);
  });
})();

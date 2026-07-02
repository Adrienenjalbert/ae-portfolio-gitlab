/* Work pages: scroll-reveal, a reading-progress bar, and an auto-built
   scroll-spy section nav. Charts animate via portfolio-charts.js.
   Everything degrades gracefully and respects prefers-reduced-motion. */
(function(){
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- scroll-reveal ---- */
  var revealables = document.querySelectorAll(".reveal");
  if(revealables.length){
    if(reduce || !("IntersectionObserver" in window)){
      Array.prototype.forEach.call(revealables, function(n){ n.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      Array.prototype.forEach.call(revealables, function(n){ io.observe(n); });
    }
  }

  /* ---- reading-progress bar ---- */
  var bar = document.createElement("div");
  bar.className = "readbar";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  function progress(){
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var y = window.pageYOffset || doc.scrollTop || 0;
    bar.style.width = (max > 0 ? Math.min(y / max, 1) * 100 : 0).toFixed(1) + "%";
  }
  window.addEventListener("scroll", progress, { passive: true });
  window.addEventListener("resize", progress);
  progress();

  /* ---- auto-built scroll-spy section nav (deep-dive pages only) ---- */
  var main = document.querySelector("main.wrap");
  var sections = main ? Array.prototype.slice.call(main.querySelectorAll(".section")) : [];
  if(sections.length >= 3){
    function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
    var items = [];
    sections.forEach(function(s, i){
      var kick = s.querySelector(".kick");
      var label = kick ? kick.textContent.trim()
        : (s.querySelector(".proves") ? "Takeaway"
        : (s.querySelector("h2") ? s.querySelector("h2").textContent.trim() : ""));
      if(!label) return;
      if(!s.id) s.id = slug(label) || ("section-" + i);
      items.push({ id: s.id, label: label, el: s });
    });
    if(items.length >= 3){
      var nav = document.createElement("nav");
      nav.className = "docnav";
      nav.setAttribute("aria-label", "On this page");
      var ul = document.createElement("ul");
      items.forEach(function(it){
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#" + it.id;
        a.textContent = it.label;
        a.setAttribute("data-spy", it.id);
        li.appendChild(a);
        ul.appendChild(li);
      });
      nav.appendChild(ul);
      document.body.appendChild(nav);
      var links = {};
      Array.prototype.forEach.call(nav.querySelectorAll("a"), function(a){ links[a.getAttribute("data-spy")] = a; });
      if("IntersectionObserver" in window){
        var spy = new IntersectionObserver(function(entries){
          entries.forEach(function(e){
            if(e.isIntersecting){
              Object.keys(links).forEach(function(k){ links[k].classList.toggle("on", k === e.target.id); });
            }
          });
        }, { rootMargin: "-38% 0px -55% 0px" });
        items.forEach(function(it){ spy.observe(it.el); });
      }
    }
  }
})();

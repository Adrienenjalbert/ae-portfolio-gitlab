// Growth Toolkit — shared behavior: viewport-triggered reveal, hub filters.
(function(){
  "use strict";

  function onReady(fn){
    if(document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // Reveal-on-scroll, not on load.
  function initReveal(){
    var els = document.querySelectorAll(".reveal, .gt-card");
    if(!("IntersectionObserver" in window)){
      els.forEach(function(el){ el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, {threshold:0.12, rootMargin:"0px 0px -40px 0px"});
    els.forEach(function(el){ io.observe(el); });
  }

  // Hub filter chips: team + status, combined with search.
  function initHubFilters(){
    var root = document.querySelector("[data-hub]");
    if(!root) return;
    var teamChips = root.querySelectorAll("[data-filter-team]");
    var statusChips = root.querySelectorAll("[data-filter-status]");
    var search = root.querySelector("[data-search]");
    var cards = root.querySelectorAll(".gt-card");
    var state = {team:"all", status:"all", q:""};

    function apply(){
      var q = state.q.trim().toLowerCase();
      cards.forEach(function(card){
        var team = card.getAttribute("data-team") || "";
        var status = card.getAttribute("data-status") || "";
        var text = card.textContent.toLowerCase();
        var teamOk = state.team === "all" || team.split(",").indexOf(state.team) > -1;
        var statusOk = state.status === "all" || status === state.status;
        var qOk = !q || text.indexOf(q) > -1;
        card.style.display = (teamOk && statusOk && qOk) ? "" : "none";
      });
    }

    teamChips.forEach(function(chip){
      chip.addEventListener("click", function(){
        teamChips.forEach(function(c){ c.setAttribute("aria-pressed","false"); });
        chip.setAttribute("aria-pressed","true");
        state.team = chip.getAttribute("data-filter-team");
        apply();
      });
    });
    statusChips.forEach(function(chip){
      chip.addEventListener("click", function(){
        statusChips.forEach(function(c){ c.setAttribute("aria-pressed","false"); });
        chip.setAttribute("aria-pressed","true");
        state.status = chip.getAttribute("data-filter-status");
        apply();
      });
    });
    if(search){
      search.addEventListener("input", function(){
        state.q = search.value;
        apply();
      });
    }
  }

  onReady(function(){
    initReveal();
    initHubFilters();
  });
})();

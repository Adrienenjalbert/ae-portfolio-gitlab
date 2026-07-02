/* Portfolio charts — shared renderer for the new chart types (trend, grouped,
   scorecard) and a complete copy of the existing types (beforeafter, hbar, ring)
   so pages without an inline engine can use this file alone.

   Coexistence rule: a page's inline engine draws at parse time. This module runs
   on DOMContentLoaded and SKIPS any .chart that already contains an <svg> or a
   .scorecard (i.e. already rendered), so it only handles the new-type charts the
   inline engine ignored. Each render sets box._animate(); animation is idempotent
   and triggered either by the page's own reveal system or by this module's own
   IntersectionObserver fallback. */
(function(){
  "use strict";
  var NS="http://www.w3.org/2000/svg";
  var REDUCE=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(n,a,p){var e=document.createElementNS(NS,n);if(a)for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}
  function dec(s){if(s==null)return"";var t=document.createElement("textarea");t.innerHTML=s;return t.value;}
  function json(box,attr,fallback){var v=box.getAttribute(attr);if(!v)return fallback;try{return JSON.parse(dec(v));}catch(e){try{return JSON.parse(v);}catch(e2){return fallback;}}}
  function once(box,fn){return function(){if(box._animated)return;box._animated=true;fn();};}
  function colorClass(box){return box.getAttribute("data-color")==="green"?"green":"accent";}
  function isGreen(box){return box.getAttribute("data-color")==="green";}

  /* ---------------- interactive tooltip (shared floating card) ----------------
     A styled card driven by [data-tip] marks. Works on hover and keyboard focus,
     stays inside the viewport, and never intercepts pointer events. Marks also
     carry role="img" + aria-label so the value is exposed to assistive tech and
     is reachable by keyboard (tabindex 0), replacing the old <title> approach
     (slow native tooltip, no keyboard, unstyled). */
  var TIP=null;
  function tipmark(node,text){var t=dec(text);node.setAttribute("data-tip",t);node.setAttribute("tabindex","0");node.setAttribute("role","img");node.setAttribute("aria-label",t);return node;}
  function tipEl(){if(TIP)return TIP;TIP=document.createElement("div");TIP.className="chart-tip";TIP.setAttribute("aria-hidden","true");(document.body||document.documentElement).appendChild(TIP);return TIP;}
  function moveTip(x,y){var t=tipEl(),w=t.offsetWidth,h=t.offsetHeight,vw=window.innerWidth,vh=window.innerHeight;
    var nx=x+16,ny=y-h-12;if(nx+w>vw-8)nx=x-w-16;if(nx<8)nx=8;if(ny<8)ny=y+18;if(ny+h>vh-8)ny=vh-h-8;
    t.style.transform="translate("+Math.round(nx)+"px,"+Math.round(ny)+"px)";}
  function showTip(node){var txt=node.getAttribute("data-tip");if(!txt)return;var t=tipEl();t.textContent=txt;t.classList.add("show");}
  function hideTip(){if(TIP)TIP.classList.remove("show");}
  function nearestMark(target){return target&&target.closest?target.closest("[data-tip]"):null;}
  function bindTips(box){
    box.addEventListener("mouseover",function(e){var m=nearestMark(e.target);if(m){showTip(m);moveTip(e.clientX,e.clientY);}});
    box.addEventListener("mousemove",function(e){if(TIP&&TIP.classList.contains("show")&&nearestMark(e.target))moveTip(e.clientX,e.clientY);});
    box.addEventListener("mouseout",function(e){if(nearestMark(e.target))hideTip();});
    box.addEventListener("focusin",function(e){var m=nearestMark(e.target);if(m){showTip(m);var r=m.getBoundingClientRect();moveTip(r.left+r.width/2,r.top+2);}});
    box.addEventListener("focusout",hideTip);
    box.addEventListener("keydown",function(e){if(e.key==="Escape")hideTip();});
  }

  /* ---------------- trend (line + area) ---------------- */
  function drawTrend(box){
    var series=json(box,"data-series",[]);
    if(!series.length)return;
    var xlabels=json(box,"data-xlabels",[]),ptlabels=json(box,"data-ptlabels",[]);
    var green=isGreen(box),cc=green?"green":"accent";
    var W=560,H=300,padT=46,padB=42,padX=46;
    var maxv=Math.max.apply(null,series),minv=Math.min.apply(null,series);
    var span=(maxv-minv)||1,plotH=H-padT-padB,plotW=W-padX*2;
    var xs=series.map(function(_,i){return padX+(series.length>1?plotW*i/(series.length-1):0);});
    var ys=series.map(function(v){return padT+plotH*(1-(v-minv)/span);});
    var svg=el("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":box.getAttribute("aria-label")||"Trend"},box);
    // horizontal gridlines (4 bands) — quiet reference for reading the slope
    var GRID=3,grids=[];
    for(var g=0;g<=GRID;g++){var gy=padT+plotH*g/GRID;
      el("line",{x1:padX-12,y1:gy,x2:W-padX+12,y2:gy,class:"c-grid",opacity:"0"},svg).setAttribute("data-i",g);}
    Array.prototype.forEach.call(svg.querySelectorAll(".c-grid"),function(n){grids.push(n);});
    el("line",{x1:padX-12,y1:H-padB,x2:W-padX+12,y2:H-padB,class:"c-axis"},svg);
    var d="M"+xs[0]+","+ys[0];for(var i=1;i<xs.length;i++)d+=" L"+xs[i]+","+ys[i];
    var area=d+" L"+xs[xs.length-1]+","+(H-padB)+" L"+xs[0]+","+(H-padB)+" Z";
    el("path",{d:area,class:"c-trend-area "+cc},svg);
    var line=el("path",{d:d,class:"c-trend-line "+(green?"green":"")},svg);
    var dots=[],labels=[];
    for(i=0;i<xs.length;i++){
      var last=i===xs.length-1;
      // generous invisible hit-area so hover/focus is easy to hit on the small final dots
      var hit=el("circle",{cx:xs[i],cy:ys[i],r:15,class:"c-trend-hit",tabindex:"0",role:"img"},svg);
      var dot=el("circle",{cx:xs[i],cy:ys[i],r:last?6:4,class:"c-trend-dot "+(green?"green":""),opacity:"0"},svg);dots.push(dot);
      if(ptlabels[i]){tipmark(hit,(xlabels[i]?dec(xlabels[i])+": ":"")+dec(ptlabels[i]));}
      if(xlabels[i])el("text",{x:xs[i],y:H-padB+22,"text-anchor":"middle",class:"axislabel"},svg).textContent=dec(xlabels[i]);
      if(ptlabels[i]){var above=ys[i]>padT+24;var t=el("text",{x:xs[i],y:above?ys[i]-14:ys[i]+24,"text-anchor":"middle",class:"c-trend-pt",opacity:"0"},svg);t.textContent=dec(ptlabels[i]);labels.push(t);}
    }
    var len=line.getTotalLength?line.getTotalLength():1000;
    line.setAttribute("stroke-dasharray",len);line.setAttribute("stroke-dashoffset",len);
    var lastDot=dots[dots.length-1];
    box._animate=once(box,function(){
      function show(){grids.forEach(function(n){n.setAttribute("opacity","1");});dots.forEach(function(d){d.setAttribute("opacity","1");});labels.forEach(function(l){l.setAttribute("opacity","1");});}
      if(REDUCE){line.setAttribute("stroke-dashoffset","0");show();return;}
      grids.forEach(function(n,gi){setTimeout(function(){n.setAttribute("opacity","1");},80*gi);});
      var dur=1100,t0=null;requestAnimationFrame(function step(ts){if(!t0)t0=ts;var p=Math.min((ts-t0)/dur,1),e=1-Math.pow(1-p,3);
        line.setAttribute("stroke-dashoffset",String(len*(1-e)));
        if(p>0.65){var o=Math.min((p-0.65)/0.35,1);dots.forEach(function(d){d.setAttribute("opacity",String(o));});labels.forEach(function(l){l.setAttribute("opacity",String(o));});}
        if(p<1)requestAnimationFrame(step);else{show();if(lastDot)lastDot.classList.add("pulse");}});
    });
  }

  /* ---------------- grouped bars (two series across categories) ---------------- */
  function drawGrouped(box){
    var groups=json(box,"data-groups",[]);
    if(!groups.length)return;
    var sa=dec(box.getAttribute("data-sa")||"A"),sb=dec(box.getAttribute("data-sb")||"B");
    var W=560,padT=52,padB=34,colW=W/groups.length,bw=Math.min(46,colW*0.3),gap=10,plotH=150,rowTop=padT;
    var H=padT+plotH+padB;
    var svg=el("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":box.getAttribute("aria-label")||"Grouped comparison"},box);
    // legend
    el("rect",{x:16,y:16,width:11,height:11,rx:2,class:"c-grp-a"},svg);
    el("text",{x:33,y:25,class:"c-legend-t"},svg).textContent=sa;
    var sbX=33+sa.length*8+22;
    el("rect",{x:sbX,y:16,width:11,height:11,rx:2,class:"c-grp-b"},svg);
    el("text",{x:sbX+17,y:25,class:"c-legend-t"},svg).textContent=sb;
    el("line",{x1:16,y1:rowTop+plotH,x2:W-16,y2:rowTop+plotH,class:"c-axis"},svg);
    var bars=[];
    groups.forEach(function(g,i){
      var cx=colW*i+colW/2,m=Math.max(g.a,g.b)||1;
      var ha=plotH*(g.a/m),hb=plotH*(g.b/m);
      var xa=cx-bw-gap/2,xb=cx+gap/2;
      var ra=el("rect",{x:xa,y:rowTop+plotH,width:bw,height:0,rx:3,class:"c-grp-a"},svg);
      var rb=el("rect",{x:xb,y:rowTop+plotH,width:bw,height:0,rx:3,class:"c-grp-b"},svg);
      tipmark(ra,sa+" · "+dec(g.cat)+": "+dec(g.at));
      tipmark(rb,sb+" · "+dec(g.cat)+": "+dec(g.bt));
      var ta=el("text",{x:xa+bw/2,y:rowTop+plotH-ha-7,"text-anchor":"middle",class:"c-grp-val",opacity:"0"},svg);ta.textContent=dec(g.at);
      var tb=el("text",{x:xb+bw/2,y:rowTop+plotH-hb-7,"text-anchor":"middle",class:"c-grp-val",opacity:"0"},svg);tb.textContent=dec(g.bt);
      el("text",{x:cx,y:rowTop+plotH+20,"text-anchor":"middle",class:"c-grp-cat"},svg).textContent=dec(g.cat);
      bars.push({ra:ra,rb:rb,ha:ha,hb:hb,ta:ta,tb:tb,y:rowTop+plotH,i:i});
    });
    var stag=110,n=bars.length;
    box._animate=once(box,function(){
      if(REDUCE){bars.forEach(function(b){b.ra.setAttribute("height",b.ha);b.ra.setAttribute("y",b.y-b.ha);b.rb.setAttribute("height",b.hb);b.rb.setAttribute("y",b.y-b.hb);b.ta.setAttribute("opacity","1");b.tb.setAttribute("opacity","1");});return;}
      var dur=780,t0=null;requestAnimationFrame(function step(ts){if(!t0)t0=ts;var el0=ts-t0,done=0;
        bars.forEach(function(b){var p=Math.min(Math.max((el0-b.i*stag)/dur,0),1),e=1-Math.pow(1-p,3);
          var a=b.ha*e,h=b.hb*e;b.ra.setAttribute("height",a);b.ra.setAttribute("y",b.y-a);b.rb.setAttribute("height",h);b.rb.setAttribute("y",b.y-h);
          var o=Math.max((p-0.55)/0.45,0);b.ta.setAttribute("opacity",String(Math.min(o,1)));b.tb.setAttribute("opacity",String(Math.min(o,1)));
          if(p>=1)done++;});
        if(done<n)requestAnimationFrame(step);});
    });
  }

  /* ---------------- scorecard (KPI tiles, HTML) ---------------- */
  function drawScorecard(box){
    var tiles=json(box,"data-tiles",[]);
    if(!tiles.length)return;
    var green=isGreen(box);
    var grid=document.createElement("div");grid.className="scorecard";
    tiles.forEach(function(t){
      var sc=document.createElement("div");sc.className="sc"+(green?" green":"");
      var n=document.createElement("div");n.className="n";n.textContent=dec(t[1]);
      var l=document.createElement("div");l.className="l";l.textContent=dec(t[0]);
      sc.appendChild(n);sc.appendChild(l);grid.appendChild(sc);
    });
    box.appendChild(grid);
    box._animate=once(box,function(){grid.classList.add("in");});
  }

  /* ---------------- before / after (two bars + delta badge) ---------------- */
  function drawBeforeAfter(box){
    var W=520,H=380,padB=58,padT=64,padX=70;
    var before=parseFloat(box.getAttribute("data-before")),after=parseFloat(box.getAttribute("data-after"));
    var btxt=dec(box.getAttribute("data-btxt")),atxt=dec(box.getAttribute("data-atxt")),delta=dec(box.getAttribute("data-delta")),metric=dec(box.getAttribute("data-metric"));
    var green=isGreen(box),maxv=Math.max(before,after),plotH=H-padB-padT,bw=96,gap=150,x1=padX+40,x2=x1+gap;
    var svg=el("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":metric+": before "+btxt+", after "+atxt+", change "+delta},box);
    el("line",{x1:padX-10,y1:H-padB,x2:W-30,y2:H-padB,class:"c-axis"},svg);
    el("text",{x:padX-10,y:padT-30,class:"axislabel"},svg).textContent=metric;
    function bar(x,val,txt,isAfter){var h=plotH*(val/maxv),y=H-padB-h;
      var r=el("rect",{x:x,y:H-padB,width:bw,height:0,rx:3,class:"bar"+(isAfter?(" bar-after"+(green?" green":"")):" bar-before")},svg);
      tipmark(r,(isAfter?"After":"Before")+" — "+metric+": "+txt);
      var lbl=el("text",{x:x+bw/2,y:y-12,"text-anchor":"middle",class:"barlabel","font-size":"21",opacity:"0"},svg);lbl.textContent=txt;if(isAfter)lbl.setAttribute("fill",green?"#0f7a4f":"#1e49e6");
      el("text",{x:x+bw/2,y:H-padB+26,"text-anchor":"middle",class:"axislabel"},svg).textContent=isAfter?"After":"Before";return{rect:r,y:y,h:h,lbl:lbl};}
    var b1=bar(x1,before,btxt,false),b2=bar(x2,after,atxt,true);
    var bg=el("g",{class:"delta-badge"+(green?" green":""),opacity:"0"},svg);
    var t=el("text",{"text-anchor":"middle","font-size":"19","dominant-baseline":"middle"},null);t.textContent=delta;
    var bx=(x1+x2)/2+bw/2,by=padT+6,rw=delta.length*12+26;el("rect",{x:bx-rw/2,y:by-17,width:rw,height:34,rx:17},bg);t.setAttribute("x",bx);t.setAttribute("y",by);bg.appendChild(t);svg.appendChild(bg);
    box._animate=once(box,function(){
      if(REDUCE){[b1,b2].forEach(function(b){b.rect.setAttribute("y",b.y);b.rect.setAttribute("height",b.h);b.lbl.setAttribute("opacity","1");});bg.setAttribute("opacity","1");return;}
      var dur=1000,t0=null;requestAnimationFrame(function step(ts){if(!t0)t0=ts;var p=Math.min((ts-t0)/dur,1),e=1-Math.pow(1-p,3);
        [b1,b2].forEach(function(b){var hh=b.h*e;b.rect.setAttribute("height",hh);b.rect.setAttribute("y",H-padB-hh);});
        if(p>0.55){b1.lbl.setAttribute("opacity",String((p-0.55)/0.45));b2.lbl.setAttribute("opacity",String((p-0.55)/0.45));}
        if(p>0.7)bg.setAttribute("opacity",String((p-0.7)/0.3));if(p<1)requestAnimationFrame(step);});
    });
  }

  /* ---------------- horizontal bars ---------------- */
  function drawHBar(box){
    var items=json(box,"data-items",[]);
    if(!items.length)return;
    var green=isGreen(box);
    var W=540,rowH=64,padT=14,barX=210,barMax=W-barX-92,H=padT*2+items.length*rowH;
    var summary=items.map(function(it){return dec(String(it[0]))+" "+dec(String(it[2]));}).join(", ");
    var svg=el("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Impact: "+summary},box);
    var bars=[];items.forEach(function(it,i){var label=dec(String(it[0])),pct=it[1]/100,val=dec(String(it[2])),y=padT+i*rowH+rowH/2;
      el("text",{x:barX-14,y:y+5,"text-anchor":"end",class:"hbarlabel"},svg).textContent=label;
      el("rect",{x:barX,y:y-13,width:barMax,height:26,rx:4,class:"hbartrack",opacity:"0.5"},svg);
      var bar=el("rect",{x:barX,y:y-13,width:0,height:26,rx:4,class:"hbar"+(green?" green":"")},svg);
      tipmark(bar,label+": "+val);
      var v=el("text",{x:barX+8,y:y+5,class:"hbarval",opacity:"0"},svg);v.textContent=val;bars.push({bar:bar,target:barMax*pct,v:v,i:i});});
    var stag=120,n=bars.length;
    box._animate=once(box,function(){
      if(REDUCE){bars.forEach(function(b){b.bar.setAttribute("width",b.target);b.v.setAttribute("x",barX+b.target+10);b.v.setAttribute("opacity","1");});return;}
      var dur=820,t0=null;requestAnimationFrame(function step(ts){if(!t0)t0=ts;var el0=ts-t0,done=0;
        bars.forEach(function(b){var p=Math.min(Math.max((el0-b.i*stag)/dur,0),1),e=1-Math.pow(1-p,3);
          var w=b.target*e;b.bar.setAttribute("width",w);b.v.setAttribute("x",barX+w+10);b.v.setAttribute("opacity",String(Math.min(p*1.4,1)));
          if(p>=1)done++;});
        if(done<n)requestAnimationFrame(step);});
    });
  }

  /* ---------------- ring (single-metric progress) ---------------- */
  function drawRing(box){
    var big=dec(box.getAttribute("data-big")),sub=dec(box.getAttribute("data-sub")),pct=parseFloat(box.getAttribute("data-pct"));
    var S=260,c=S/2,r=104,circ=2*Math.PI*r;
    var svg=el("svg",{viewBox:"0 0 "+S+" "+S,role:"img","aria-label":big+" "+sub},box);
    el("circle",{cx:c,cy:c,r:r,class:"ring-track"},svg);
    var arc=el("circle",{cx:c,cy:c,r:r,class:"ring-arc",transform:"rotate(-90 "+c+" "+c+")","stroke-dasharray":circ,"stroke-dashoffset":circ},svg);
    tipmark(arc,big+" "+sub);
    el("text",{x:c,y:c-2,"text-anchor":"middle","dominant-baseline":"middle",class:"ring-big","font-size":"58"},svg).textContent=big;
    el("text",{x:c,y:c+30,"text-anchor":"middle",class:"ring-sub"},svg).textContent=sub;
    box._animate=once(box,function(){var off=circ*(1-pct);if(REDUCE){arc.setAttribute("stroke-dashoffset",off);return;}
      var dur=1200,t0=null;requestAnimationFrame(function step(ts){if(!t0)t0=ts;var p=Math.min((ts-t0)/dur,1),e=1-Math.pow(1-p,3);arc.setAttribute("stroke-dashoffset",circ-(circ-off)*e);if(p<1)requestAnimationFrame(step);});});
  }

  /* ---------------- multiline (two series compared, e.g. cohort retention) ---------------- */
  function drawMultiline(box){
    var sa=json(box,"data-series-a",[]),sb=json(box,"data-series-b",[]);
    if(!sa.length||!sb.length)return;
    var xlabels=json(box,"data-xlabels",[]);
    var nameA=dec(box.getAttribute("data-sa")||"A"),nameB=dec(box.getAttribute("data-sb")||"B");
    var suffix=dec(box.getAttribute("data-suffix")||"");
    var W=560,H=330,padT=58,padB=44,padX=48;
    var all=sa.concat(sb),maxv=Math.max.apply(null,all);
    var top=maxv*1.14||1,plotH=H-padT-padB,plotW=W-padX*2,n=sa.length;
    function xf(i){return padX+(n>1?plotW*i/(n-1):0);}
    function yf(v){return padT+plotH*(1-v/top);}
    var svg=el("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":box.getAttribute("aria-label")||(nameA+" vs "+nameB)},box);
    // gridlines
    var GRID=3,grids=[];
    for(var g=0;g<=GRID;g++){var gy=padT+plotH*g/GRID;
      el("line",{x1:padX-12,y1:gy,x2:W-padX+12,y2:gy,class:"c-grid",opacity:"0"},svg);}
    Array.prototype.forEach.call(svg.querySelectorAll(".c-grid"),function(nd){grids.push(nd);});
    el("line",{x1:padX-12,y1:H-padB,x2:W-padX+12,y2:H-padB,class:"c-axis"},svg);
    // legend
    el("rect",{x:padX,y:20,width:12,height:12,rx:2,class:"c-ml-sw-a"},svg);
    el("text",{x:padX+18,y:30,class:"c-ml-legend"},svg).textContent=nameA;
    var bx=padX+18+nameA.length*7.4+22;
    el("rect",{x:bx,y:20,width:12,height:12,rx:2,class:"c-ml-sw-b"},svg);
    el("text",{x:bx+18,y:30,class:"c-ml-legend"},svg).textContent=nameB;
    function path(series){var d="M"+xf(0)+","+yf(series[0]);for(var i=1;i<series.length;i++)d+=" L"+xf(i)+","+yf(series[i]);return d;}
    // area under A (the retained line)
    var da=path(sa);
    el("path",{d:da+" L"+xf(n-1)+","+(H-padB)+" L"+xf(0)+","+(H-padB)+" Z",class:"c-ml-area-a"},svg);
    var lineB=el("path",{d:path(sb),class:"c-ml-b"},svg);
    var lineA=el("path",{d:da,class:"c-ml-a"},svg);
    var dots=[],labels=[];
    function points(series,cls,above){
      for(var i=0;i<series.length;i++){
        var vx=xf(i),vy=yf(series[i]);
        var hit=el("circle",{cx:vx,cy:vy,r:14,class:"c-trend-hit",tabindex:"0",role:"img"},svg);
        tipmark(hit,(xlabels[i]?dec(xlabels[i])+" · ":"")+(nameA&&cls==="a"?nameA:nameB)+": "+series[i]+suffix);
        var dot=el("circle",{cx:vx,cy:vy,r:4,class:cls==="a"?"c-ml-dot-a":"c-ml-dot-b",opacity:"0"},svg);dots.push(dot);
        var ly=above?vy-12:vy+20;
        var t=el("text",{x:vx,y:ly,"text-anchor":"middle",class:cls==="a"?"c-ml-val-a":"c-ml-val-b",opacity:"0"},svg);
        t.textContent=series[i]+suffix;labels.push(t);
      }
    }
    points(sa,"a",true);
    points(sb,"b",false);
    for(var i=0;i<xlabels.length;i++)el("text",{x:xf(i),y:H-padB+22,"text-anchor":"middle",class:"axislabel"},svg).textContent=dec(xlabels[i]);
    var lenA=lineA.getTotalLength?lineA.getTotalLength():1000,lenB=lineB.getTotalLength?lineB.getTotalLength():1000;
    lineA.setAttribute("stroke-dasharray",lenA);lineA.setAttribute("stroke-dashoffset",lenA);
    lineB.setAttribute("stroke-dasharray",lenB);lineB.setAttribute("stroke-dashoffset",lenB);
    box._animate=once(box,function(){
      function show(){grids.forEach(function(nd){nd.setAttribute("opacity","1");});dots.forEach(function(d){d.setAttribute("opacity","1");});labels.forEach(function(l){l.setAttribute("opacity","1");});}
      if(REDUCE){lineA.setAttribute("stroke-dashoffset","0");lineB.setAttribute("stroke-dashoffset","0");show();return;}
      grids.forEach(function(nd,gi){setTimeout(function(){nd.setAttribute("opacity","1");},70*gi);});
      var dur=1150,t0=null;requestAnimationFrame(function step(ts){if(!t0)t0=ts;var p=Math.min((ts-t0)/dur,1),e=1-Math.pow(1-p,3);
        lineA.setAttribute("stroke-dashoffset",String(lenA*(1-e)));lineB.setAttribute("stroke-dashoffset",String(lenB*(1-e)));
        if(p>0.6){var o=Math.min((p-0.6)/0.4,1);dots.forEach(function(d){d.setAttribute("opacity",String(o));});labels.forEach(function(l){l.setAttribute("opacity",String(o));});}
        if(p<1)requestAnimationFrame(step);else show();});
    });
  }

  var RENDER={trend:drawTrend,grouped:drawGrouped,scorecard:drawScorecard,beforeafter:drawBeforeAfter,hbar:drawHBar,ring:drawRing,multiline:drawMultiline};

  function render(box){
    if(box.querySelector("svg")||box.querySelector(".scorecard"))return; // already drawn by inline engine
    var type=box.getAttribute("data-chart");
    var fn=RENDER[type];
    if(!fn)return;
    fn(box);
    if(box.querySelector("[data-tip]"))bindTips(box);
    if(!box._animate)return;
    if(REDUCE){box._animate();return;}
    if("IntersectionObserver" in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){io.unobserve(en.target);box._animate();}});},{threshold:0.18,rootMargin:"0px 0px -5% 0px"});
      io.observe(box);
      setTimeout(function(){if(!box._animated&&box.getBoundingClientRect().top<(window.innerHeight||800))box._animate();},400);
    }else{box._animate();}
  }

  function init(){var nodes=document.querySelectorAll(".chart[data-chart]");Array.prototype.forEach.call(nodes,render);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

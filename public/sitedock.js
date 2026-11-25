/* Personal footer strip: LinkedIn, GitHub, portfolio + link to /by-mahmoud.html */
(function () {
  if (window.__siteDock) return; window.__siteDock = 1;
  var L = [
    ["LinkedIn", "https://www.linkedin.com/in/mahmod-salah", '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11.5H3zM10 9.75h3.8v1.6h.06c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.66 4.8 6.13v5.77h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.32-1.96 2.69v5.19h-4z"/>'],
    ["GitHub", "https://github.com/engMahmoudSalah", '<path d="M12 .5a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/>'],
    ["Portfolio", "https://md.mahmodsalah.workers.dev/", '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3.1a15 15 0 0 0-1.2-5.2A8 8 0 0 1 18.9 11zM12 4c.9 1.2 1.7 3.2 1.8 7h-3.6C10.3 7.2 11.1 5.2 12 4zM9.4 5.8A15 15 0 0 0 8.2 11H5.1a8 8 0 0 1 4.3-5.2zM5.1 13h3.1c.1 1.9.5 3.7 1.2 5.2A8 8 0 0 1 5.1 13zm5.1 0h3.6c-.1 3.8-.9 5.8-1.8 7-.9-1.2-1.7-3.2-1.8-7zm4.4 5.2c.7-1.5 1.1-3.3 1.2-5.2h3.1a8 8 0 0 1-4.3 5.2z"/>']
  ];
  function lum(c) { var m = c.match(/\d+(\.\d+)?/g); if (!m || (m.length > 3 && +m[3] === 0)) return null; return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255; }
  function dark() {
    var els = [document.body, document.documentElement];
    for (var i = 0; i < els.length; i++) { var l = lum(getComputedStyle(els[i]).backgroundColor); if (l !== null) return l < 0.5; }
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function build() {
    if (document.querySelector("[data-sitedock]")) return;
    var d = dark(), bg = d ? "#0b1220" : "#f1f5f9", fg = d ? "#e2e8f0" : "#1e293b", br = d ? "#334155" : "#cbd5e1", chip = d ? "#172033" : "#ffffff";
    var n = document.createElement("div"); n.setAttribute("data-sitedock", "1");
    n.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px 18px;box-sizing:border-box;width:100%;padding:16px;background:" + bg + ";border-top:1px solid " + br + ";font:600 14px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;direction:ltr;";
    var row = document.createElement("div"); row.style.cssText = "display:flex;gap:10px;";
    L.forEach(function (x) {
      var a = document.createElement("a"); a.href = x[1]; a.target = "_blank"; a.rel = "noopener"; a.title = x[0]; a.setAttribute("aria-label", x[0]);
      a.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' + x[2] + "</svg>";
      a.style.cssText = "display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;border:1px solid " + br + ";background:" + chip + ";color:" + fg + ";text-decoration:none;box-sizing:border-box;";
      row.appendChild(a);
    });
    var more = document.createElement("a"); more.href = "/by-mahmoud"; more.textContent = "By Mahmoud: all projects";
    more.style.cssText = "color:" + fg + ";text-decoration:underline;text-underline-offset:3px;";
    n.appendChild(row); n.appendChild(more); document.body.appendChild(n);
    function pad() {
      var need = 0, all = document.body.querySelectorAll("*");
      for (var i = 0; i < all.length && i < 3000; i++) { var e = all[i]; if (n.contains(e)) continue; var cs = getComputedStyle(e); if (cs.position === "fixed" && cs.display !== "none") { var r = e.getBoundingClientRect(); if (r.height > 0 && r.height < 300 && innerHeight - r.bottom < 140) need = Math.max(need, r.height + 40); } }
      n.style.paddingBottom = (16 + need) + "px";
    }
    function last() { if (document.body.lastElementChild !== n && !(document.body.lastElementChild && document.body.lastElementChild.tagName === "SCRIPT" && document.body.lastElementChild.previousElementSibling === n)) document.body.appendChild(n); }
    pad(); setTimeout(pad, 2500); setTimeout(pad, 6000);
    new MutationObserver(function () { last(); }).observe(document.body, { childList: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(build, 300); }); else setTimeout(build, 300);
})();


/* Per-site ambient visuals. Each site gets its own shapes, motion and palette. Canvas only, no assets. */
(function () {
  if (window.__vis) return; window.__vis = 1;
  var P = {
    drop: "M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0C19 10 12 2 12 2z",
    leaf: "M5 19C5 9 11 4 20 4c0 9-5 15-13 15M5 19c3-5 6-8 10-10",
    gem: "M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l-2 6 5 12M15 3l2 6-5 12",
    star8: "M12 1l2.5 6.2L21 5l-2.2 6.5L23 12l-4.2.5L21 19l-6.5-2.2L12 23l-2.5-6.2L3 19l2.2-6.5L1 12l4.2-.5L3 5l6.5 2.2z",
    doc: "M6 2h9l5 5v15H6zM15 2v5h5M9 13l2 2 4-4",
    bubble: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 9a5 5 0 0 1 4-3",
    signal: "M2 9a14 14 0 0 1 20 0M5 12.5a9.5 9.5 0 0 1 14 0M8.5 16a4.5 4.5 0 0 1 7 0M12 20h.01",
    tile: "M3 6h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3zM18 10l4-3v10l-4-3",
    brackets: "M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16",
    card: "M4 4h16v16H4zM4 9h16M8 13h8M8 16h5",
    quill: "M20 3C10 3 6 9 5 15l-2 6 6-2c6-1 12-5 11-16zM9 15l7-7",
    key: "M8 15a5 5 0 1 1 4.6-3H22v3h-3v3h-3v-3h-3.4A5 5 0 0 1 8 15z",
    neural: "M7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM6.5 6.5l4 4M17.5 6.5l-4 4M6.5 17.5l4-4M17.5 17.5l-4-4"
  };
  window.__visPaths = P;
  var T = {
    "blogging-platform": { s: ["quill", "doc"], m: "fall", c: ["99,102,241", "168,85,247"], n: 16, k: "quill" },
    fakhama: { s: ["gem"], m: "twinkle", c: ["212,175,55", "245,220,130"], n: 14, k: "gem" },
    naturix: { s: ["leaf", "drop"], m: "fall", c: ["16,185,129", "132,204,22"], n: 18, k: "leaf" },
    "taqwa-shield-ai": { s: ["star8"], m: "spin", c: ["20,184,166", "212,175,55"], n: 14, k: "star8" },
    "children-skills": { s: ["bubble"], m: "rise", c: ["244,114,182", "250,204,21", "56,189,248", "74,222,128"], n: 22, k: "bubble" },
    "right-water": { s: ["drop"], m: "fall", c: ["14,116,244", "56,189,248"], n: 18, k: "drop", ripple: 1 },
    "login-sahl": { s: ["key"], m: "drift", c: ["99,102,241", "45,212,191"], n: 12, k: "key" },
    "german-file-kit": { s: ["doc"], m: "rise", c: ["220,38,38", "234,179,8", "71,85,105"], n: 14, k: "doc" },
    "sim-service": { s: ["signal"], m: "twinkle", c: ["20,184,166", "249,115,22"], n: 12, k: "signal", ripple: 1 },
    meetly: { s: ["tile"], m: "drift", c: ["244,63,94", "139,92,246"], n: 12, k: "tile" },
    "foda-salama": { s: ["neural"], m: "rise", c: ["34,211,238", "96,165,250"], n: 16, k: "neural", digits: 1 },
    cv: { s: ["brackets"], m: "drift", c: ["52,211,153", "148,163,184"], n: 12, k: "brackets" },
    velocity: { s: ["card"], m: "slide", c: ["37,99,235", "99,102,241"], n: 12, k: "card" }
  };
  var host = location.hostname.split(".")[0], th = T[host] || { s: ["star8"], m: "drift", c: ["99,102,241"], n: 12, k: "star8" };
  window.__visTheme = th;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function start() {
    var cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true"); cv.setAttribute("data-vis", "1");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:30;opacity:.42";
    document.body.appendChild(cv);
    var x = cv.getContext("2d"), W, H, dpr = Math.min(devicePixelRatio || 1, 2), paths = {};
    Object.keys(P).forEach(function (k) { try { paths[k] = new Path2D(P[k]); } catch (e) {} });
    function size() { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener("resize", size);
    var N = W < 600 ? Math.ceil(th.n * .6) : th.n, A = [], r = Math.random;
    for (var i = 0; i < N; i++) A.push({ x: r() * W, y: r() * H, z: .5 + r() * .9, a: r() * 6.28, sp: (r() - .5) * .02, ph: r() * 6.28, s: th.s[i % th.s.length], c: th.c[i % th.c.length], d: ["0", "1", "0", "1", "1", "0", "1"][i % 7] });
    function shape(k, cx, cy, sz, rot, col, al) {
      var p = paths[k]; if (!p) return; x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(sz / 24, sz / 24); x.translate(-12, -12);
      x.lineWidth = 1.4 / (sz / 24); x.lineJoin = "round"; x.lineCap = "round"; x.strokeStyle = "rgba(" + col + "," + al + ")"; x.fillStyle = "rgba(" + col + "," + al * .16 + ")"; x.fill(p); x.stroke(p); x.restore();
    }
    var t0 = 0, mx = 0, my = 0;
    addEventListener("pointermove", function (e) { mx = e.clientX / W - .5; my = e.clientY / H - .5; }, { passive: true });
    function frame(t) {
      x.clearRect(0, 0, W, H);
      for (var i = 0; i < N; i++) {
        var p = A[i], sz = (W < 600 ? 22 : 30) * p.z, m = th.m, al = .55 * p.z;
        if (m === "fall") { p.y += .25 * p.z; p.x += Math.sin(t / 1600 + p.ph) * .35; p.a += p.sp * .5; }
        else if (m === "rise") { p.y -= .3 * p.z; p.x += Math.sin(t / 1300 + p.ph) * .3; }
        else if (m === "drift") { p.x += Math.cos(p.ph + t / 4000) * .25; p.y += Math.sin(p.ph + t / 3500) * .25; p.a += p.sp * .3; }
        else if (m === "slide") { p.x += .35 * p.z; p.a = 0; }
        else if (m === "twinkle") { al = .15 + .55 * (.5 + .5 * Math.sin(t / 900 + p.ph)); sz *= .85 + .25 * Math.sin(t / 1100 + p.ph); }
        else if (m === "spin") { p.a += p.sp * .6 + .002; al = .3 * p.z; }
        if (p.y > H + 40) p.y = -40; if (p.y < -40) p.y = H + 40; if (p.x > W + 40) p.x = -40; if (p.x < -40) p.x = W + 40;
        shape(p.s, p.x, p.y, sz, p.a, p.c, al);
        if (th.digits) { x.fillStyle = "rgba(" + p.c + "," + al * .7 + ")"; x.font = "12px monospace"; x.fillText(p.d, p.x + sz * .6, p.y + sz * .5); }
      }
      var R = W < 600 ? 64 : 110, cx = W - R * .85 - 18, cy = H - R * .85 - 80, c0 = th.c[0];
      if (th.ripple) for (var k = 0; k < 3; k++) { var ph = ((t / 2600) + k / 3) % 1; x.strokeStyle = "rgba(" + c0 + "," + (.4 * (1 - ph)) + ")"; x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, R * .3 + ph * R * .9, 0, 6.283); x.stroke(); }
      var bob = Math.sin(t / 1800) * 5, rot = th.m === "spin" ? t / 9000 : Math.sin(t / 2500) * .18 + mx * .5;
      shape(th.k, cx + mx * 10, cy + bob + my * 8, R, rot, c0, .75);
      if (th.k === "star8") shape("star8", cx, cy + bob, R * .55, -rot * 1.6, th.c[1], .6);
    }
    if (reduce) { frame(2000); return; }
    var run = true; document.addEventListener("visibilitychange", function () { run = !document.hidden; if (run) loop(performance.now()); });
    function loop(t) { if (!run) return; frame(t); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
  }
  function go() { (window.requestIdleCallback || function (f) { setTimeout(f, 800); })(start); }
  if (document.readyState === "complete") go(); else addEventListener("load", go);
})();

/* Page-level motion: scroll reveal, card tilt, stat count-up, empty-state art, route fade. No assets, honours reduced motion. */
(function () {
  if (window.__vis2) return; window.__vis2 = 1;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, fine = matchMedia("(pointer:fine)").matches;
  var SEL = "section>*,article,.card,[class*=card],[class*=Card],[class*=tile],[class*=feature],[class*=stat],[class*=plan],[class*=pricing],li[class*=item],tr";
  function inSD(e) { return e.closest("[data-sitedock],[data-vis]"); }
  var io = "IntersectionObserver" in window && new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (!en.isIntersecting) return; var e = en.target; io.unobserve(e); e.style.opacity = e.__o || ""; e.style.transform = e.__t || ""; setTimeout(function () { e.style.transition = e.__tr || ""; }, 700); count(e); });
  }, { threshold: .06, rootMargin: "0px 0px -4% 0px" });
  function prep(root) {
    if (!io) return;
    var l = (root || document).querySelectorAll(SEL), n = 0;
    for (var i = 0; i < l.length && n < 160; i++) {
      var e = l[i]; if (e.__v || inSD(e)) continue; e.__v = 1;
      var r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      if (r.width < 60 || r.height < 24 || cs.position === "fixed" || cs.position === "sticky" || cs.display === "none") continue;
      if (r.top < innerHeight * .95 && r.bottom > 0) { count(e); continue; }
      n++; e.__o = e.style.opacity; e.__t = e.style.transform; e.__tr = e.style.transition;
      e.style.opacity = "0"; e.style.transform = "translateY(26px)"; e.style.transition = "opacity .65s ease, transform .65s ease";
      io.observe(e);
      (function (x) { setTimeout(function () { if (x.style.opacity === "0") { x.style.opacity = x.__o || ""; x.style.transform = x.__t || ""; } }, 6000); })(e);
    }
  }
  function count(root) {
    var l = root.querySelectorAll ? root.querySelectorAll("*") : [];
    for (var i = 0; i < l.length && i < 80; i++) {
      var e = l[i]; if (e.__c || e.children.length) continue;
      var t = (e.textContent || "").trim(); if (!/^[\d][\d,.]*[%+kKmM]?$/.test(t) || t.length > 9) continue;
      var host = e.closest("[class*=stat],[class*=kpi],[class*=metric],[class*=count],[class*=number],[class*=Stat]"); if (!host) continue;
      e.__c = 1; var num = parseFloat(t.replace(/,/g, "")), suf = t.replace(/^[\d,.]+/, ""), dec = (t.split(".")[1] || "").replace(/\D.*/, "").length, st = performance.now();
      if (!isFinite(num) || num === 0) continue;
      (function (el, num, suf, dec, st, orig) {
        function f(now) { var p = Math.min(1, (now - st) / 1100), v = num * (1 - Math.pow(1 - p, 3)); el.textContent = (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US")) + suf; if (p < 1) requestAnimationFrame(f); else el.textContent = orig; }
        requestAnimationFrame(f);
      })(e, num, suf, dec, st, t);
    }
  }
  function tilt() {
    if (!fine) return; var cur = null;
    document.addEventListener("pointermove", function (ev) {
      var c = ev.target.closest && ev.target.closest("[class*=card],[class*=Card],[class*=tile],[class*=plan]");
      if (cur && cur !== c) { cur.style.transform = cur.__ot || ""; cur.style.transition = cur.__otr || ""; cur = null; }
      if (!c || inSD(c)) return; var r = c.getBoundingClientRect(); if (r.width > 520 || r.height > 460 || r.width < 120) return;
      if (cur !== c) { cur = c; c.__ot = c.style.transform; c.__otr = c.style.transition; c.style.transition = "transform .12s ease-out"; }
      var x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
      c.style.transform = "perspective(800px) rotateY(" + (x * 5).toFixed(2) + "deg) rotateX(" + (-y * 5).toFixed(2) + "deg)";
    }, { passive: true });
    document.addEventListener("pointerleave", function () { if (cur) { cur.style.transform = cur.__ot || ""; cur = null; } }, true);
  }
  function art() {
    var th = window.__visTheme || { k: "star8", c: ["99,102,241"] }, d = (window.__visPaths || {})[th.k] || "M12 2l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z", c = "rgb(" + th.c[0] + ")";
    return '<svg viewBox="0 0 24 24" width="84" height="84" aria-hidden="true" style="display:block;margin:0 auto 10px;opacity:.9;animation:vf 3.4s ease-in-out infinite"><path d="' + d + '" fill="' + c + '" fill-opacity=".14" stroke="' + c + '" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  function empties() {
    var l = document.querySelectorAll("p,div,span,td,h3,h4"), n = 0;
    for (var i = 0; i < l.length && n < 4; i++) {
      var e = l[i]; if (e.__e || e.children.length > 1 || inSD(e)) continue; var t = (e.textContent || "").trim();
      if (t.length < 6 || t.length > 70 || !/^(no |nothing |you have no|لا (يوجد|توجد)|لم )/i.test(t)) continue;
      e.__e = 1; if (e.querySelector("svg")) continue; n++;
      var w = document.createElement("div"); w.setAttribute("data-vis", "1"); w.style.cssText = "text-align:center;color:inherit;pointer-events:none"; w.innerHTML = art(); e.insertBefore(w, e.firstChild); e.style.textAlign = "center";
    }
  }
  function route() {
    var root = document.getElementById("root"); if (!root || reduce) return;
    ["pushState", "replaceState"].forEach(function (k) { var o = history[k]; history[k] = function () { var r = o.apply(this, arguments); root.style.transition = "none"; root.style.opacity = ".0"; requestAnimationFrame(function () { root.style.transition = "opacity .35s ease"; root.style.opacity = "1"; setTimeout(function () { root.style.opacity = ""; root.style.transition = ""; }, 400); }); setTimeout(function () { prep(); empties(); }, 250); return r; }; });
  }
  function go() {
    var st = document.createElement("style"); st.textContent = "@keyframes vf{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@media(prefers-reduced-motion:reduce){[data-vis] *{animation:none!important}}"; document.head.appendChild(st);
    empties();
    if (reduce) return;
    prep(); tilt(); route();
    var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { prep(); empties(); }, 350); }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "complete") setTimeout(go, 900); else addEventListener("load", function () { setTimeout(go, 900); });
})();

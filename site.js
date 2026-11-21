// LicenRoute site motion. Transforms and opacity only. Everything is readable without JS,
// and with prefers-reduced-motion the page stays static (scene shows its resting state).
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var L = (document.documentElement.lang || "en").slice(0, 2);
  var T = {
    en: { pause: "Pause animation", play: "Play animation", copied: "Copied" },
    es: { pause: "Pausar animación", play: "Reanudar animación", copied: "Copiado" }
  }[L] || {};

  // ---- Reveal on scroll ----
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }) : null;
  $$(".reveal, .log").forEach(function (el) { if (io && !reduce) io.observe(el); else el.classList.add("in"); });

  // ---- Scroll progress + parallax ----
  var bar = $(".progress"), para = $$("[data-parallax]"), ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
      para.forEach(function (el) { el.style.transform = "translate3d(0," + (y * parseFloat(el.dataset.parallax)).toFixed(1) + "px,0)"; });
      ticking = false;
    });
  }
  if (!reduce) { window.addEventListener("scroll", onScroll, { passive: true }); onScroll(); }

  // ---- Hero scene: the paid lane ----
  var scene = $(".scene");
  if (scene && !reduce && scene.animate) {
    var cap = $(".scene-cap", scene), bubble = $(".bubble", scene), dots = $$(".quota i", scene), btn = $(".scene-btn", scene);
    var steps = JSON.parse($("#scene-steps").textContent);
    var paused = false, live = [];
    btn.textContent = T.pause;
    btn.addEventListener("click", function () {
      paused = !paused; btn.textContent = paused ? T.play : T.pause;
      scene.classList.toggle("paused", paused);
      live.forEach(function (a) { try { paused ? a.pause() : a.play(); } catch (e) {} });
    });
    var waitPlay = async function () { while (paused) await sleep(150); };
    var move = function (el, from, to, ms) {
      var a = el.animate([{ transform: "translate(" + from + "px,-50%)" }, { transform: "translate(" + to + "px,-50%)" }], { duration: ms, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards" });
      live.push(a); return a.finished.then(function () { live = live.filter(function (x) { return x !== a; }); });
    };
    var fade = function (el, to, ms) { var a = el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: to }], { duration: ms, fill: "forwards" }); live.push(a); return a.finished; };
    var say = function (cls, code, word) { bubble.className = "bubble show " + cls; bubble.innerHTML = "<b>" + code + "</b>" + word; };
    var hush = function () { bubble.classList.remove("show"); };
    var setQuota = function (n) { dots.forEach(function (d, i) { d.classList.toggle("used", i >= n); }); };

    async function run() {
      var visible = true;
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(scene);
      for (;;) {
        setQuota(dots.length);
        for (var i = 0; i < steps.length; i++) {
          var s = steps[i];
          while (!visible) await sleep(300);
          await waitPlay();
          var w = scene.clientWidth, gate = w * 0.62, start = w * 0.04, end = w * 0.96;
          var p = document.createElement("span"); p.className = "packet";
          p.innerHTML = "GET " + (scene.dataset.path || "/api/reports") + (s.key ? ' <span class="key' + (s.key === "fake" ? " fake" : "") + '">' + (s.key === "fake" ? "bgat_fake…" : "bgat_7f…") + "</span>" : "");
          scene.appendChild(p);
          var pw = p.offsetWidth;
          cap.textContent = s.cap;
          await move(p, start - pw, gate - pw - 20, 1300);
          await waitPlay();
          if (s.result === "ok") {
            scene.classList.add("open"); say("ok", "200", s.word);
            await sleep(450); await waitPlay();
            await move(p, gate - pw - 20, end - pw, 1100);
            setQuota(s.quota);
            await fade(p, 0, 300);
            await sleep(500); scene.classList.remove("open");
          } else {
            say(s.result, s.code, s.word);
            p.animate([{ transform: "translate(" + (gate - pw - 20) + "px,-50%)" }, { transform: "translate(" + (gate - pw - 32) + "px,-50%)" }, { transform: "translate(" + (gate - pw - 20) + "px,-50%)" }], { duration: 260 });
            await sleep(1200); await waitPlay();
            await move(p, gate - pw - 20, start - pw - 40, 900);
          }
          p.remove(); hush();
          await sleep(650);
        }
        await sleep(900);
      }
    }
    run();
  }

  // ---- Feature stack: sticky viewer synced to steps ----
  var viewer = $(".viewer pre"), label = $(".viewer-label"), stepEls = $$(".step");
  if (viewer && stepEls.length && "IntersectionObserver" in window) {
    var current = -1;
    var show = function (i) {
      if (i === current) return; current = i;
      stepEls.forEach(function (s, j) { s.classList.toggle("active", j === i); });
      var src = $(".panel pre", stepEls[i]);
      var swap = function () {
        viewer.innerHTML = src.innerHTML;
        if (label) label.textContent = src.getAttribute("data-label") || "";
        viewer.classList.remove("swap");
        if (!reduce) typeIn(viewer);
      };
      if (reduce) swap(); else { viewer.classList.add("swap"); setTimeout(swap, 220); }
    };
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) show(stepEls.indexOf(e.target)); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    stepEls.forEach(function (s) { obs.observe(s); });
    show(0);
  }
  // Reveal the lines of a panel one by one (the text is already there).
  var typeToken = 0;
  function typeIn(pre) {
    var my = ++typeToken, html = pre.innerHTML.split("\n");
    pre.innerHTML = "";
    var i = 0;
    (function next() {
      if (my !== typeToken) return;
      if (i >= html.length) return;
      pre.innerHTML += (i ? "\n" : "") + html[i++];
      setTimeout(next, 70);
    })();
  }

  // ---- 402 JSON read field by field (once) ----
  var json = $(".agent-json");
  if (json && !reduce && "IntersectionObserver" in window) {
    var keys = $$(".k", json);
    new IntersectionObserver(function (e, o) {
      if (!e[0].isIntersecting) return; o.disconnect();
      var i = 0;
      (function tick() {
        keys.forEach(function (k) { k.classList.remove("hot"); });
        if (i < keys.length) { keys[i++].classList.add("hot"); setTimeout(tick, 900); }
      })();
    }, { threshold: 0.5 }).observe(json);
  }

  // ---- Copy buttons ----
  $$("button[data-copy]").forEach(function (btn) {
    var label0 = btn.textContent, done = btn.getAttribute("data-done") || T.copied || "Copied";
    btn.addEventListener("click", function () {
      var el = document.getElementById(btn.getAttribute("data-copy"));
      if (!el) return;
      var ok = function () { btn.textContent = done; setTimeout(function () { btn.textContent = label0; }, 1800); };
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(el);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        try { if (document.execCommand("copy")) ok(); } catch (e) { /* text stays selected for a manual copy */ }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.innerText).then(ok, fallback); else fallback();
    });
  });
})();

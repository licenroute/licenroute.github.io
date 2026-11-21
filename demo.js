// Replays real `licenroute test` output once, when the terminal scrolls into view.
// The full output is already in the HTML (works without JS and with reduced motion).
(function () {
  var pre = document.getElementById("demo-out");
  var data = document.getElementById("demo-lines");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (pre && data && !reduce && "IntersectionObserver" in window) {
    var lines = JSON.parse(data.textContent);
    var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
    var paint = function (l) {
      var t = esc(l.t);
      if (l.k === "cmd") return '<span class="p">$</span> ' + t;
      t = t.replace(/\b(402)\b/g, '<span class="pay">$1</span>').replace(/\b(403|503)\b/g, '<span class="deny">$1</span>')
           .replace(/\b200\b/g, '<span class="ok">200</span>').replace(/^SIMULATED PASS/, '<span class="ok">SIMULATED PASS</span>');
      return l.k === "dim" ? '<span class="c">' + t + "</span>" : t;
    };
    var run = function () {
      var out = [], i = 0;
      var next = function () {
        if (i >= lines.length) { pre.innerHTML = out.join("\n"); return; }
        var l = lines[i++];
        if (l.k === "cmd") {
          var n = 0;
          (function type() {
            n++;
            pre.innerHTML = out.concat(['<span class="p">$</span> ' + esc(l.t.slice(0, n)) + '<span class="cursor"></span>']).join("\n");
            if (n < l.t.length) setTimeout(type, 26); else { out.push(paint(l)); setTimeout(next, 350); }
          })();
        } else { out.push(paint(l)); pre.innerHTML = out.join("\n"); setTimeout(next, l.k === "dim" ? 220 : 380); }
      };
      next();
    };
    new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { o.disconnect(); run(); } }, { threshold: 0.4 }).observe(pre);
  }

  // Copy buttons: copy the text of the element named in data-copy.
  document.querySelectorAll("button[data-copy]").forEach(function (btn) {
    var label = btn.textContent, done = btn.getAttribute("data-done") || "Copied";
    btn.addEventListener("click", function () {
      var el = document.getElementById(btn.getAttribute("data-copy"));
      if (!el) return;
      var ok = function () { btn.textContent = done; setTimeout(function () { btn.textContent = label; }, 1800); };
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(el);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        try { if (document.execCommand("copy")) ok(); } catch (e) { /* the text stays selected so it can be copied by hand */ }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.innerText).then(ok, fallback); else fallback();
    });
  });
})();

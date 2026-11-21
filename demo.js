// Replays real `licenroute test .` output (recorded on 2026-11-21 against the local simulator).
// No network, no tracking. With prefers-reduced-motion the full output is shown at once.
(function () {
  var pre = document.getElementById("demo-out");
  var data = document.getElementById("demo-lines");
  if (!pre || !data) return;
  var lines = JSON.parse(data.textContent);
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function paint(line) {
    var t = esc(line.t);
    if (line.k === "cmd") return '<span class="p">$</span> ' + t;
    t = t.replace(/\b(402|403|503)\b/g, function (m) { return '<span class="' + (m === "402" ? "warn" : "bad") + '">' + m + "</span>"; })
         .replace(/\b200\b/g, '<span class="ok">200</span>')
         .replace(/^SIMULATED PASS/, '<span class="ok">SIMULATED PASS</span>');
    return line.k === "dim" ? '<span class="c">' + t + "</span>" : t;
  }
  function renderAll() { pre.innerHTML = lines.map(paint).join("\n"); }
  if (reduce) { renderAll(); return; }

  var out = [], i = 0;
  function next() {
    if (i >= lines.length) { pre.innerHTML = out.join("\n") + '\n<span class="cursor"></span>'; setTimeout(function () { out = []; i = 0; next(); }, 6000); return; }
    var line = lines[i++];
    if (line.k === "cmd") {
      var typed = 0;
      (function type() {
        typed++;
        pre.innerHTML = out.concat(['<span class="p">$</span> ' + esc(line.t.slice(0, typed)) + '<span class="cursor"></span>']).join("\n");
        if (typed < line.t.length) setTimeout(type, 28); else { out.push(paint(line)); setTimeout(next, 400); }
      })();
    } else {
      out.push(paint(line));
      pre.innerHTML = out.join("\n") + '\n<span class="cursor"></span>';
      setTimeout(next, line.k === "dim" ? 250 : 420);
    }
  }
  var started = false;
  function start() { if (!started) { started = true; next(); } }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { start(); o.disconnect(); } }).observe(pre);
  } else { start(); }
})();

// Copy buttons: copy the text of the element named in data-copy.
document.querySelectorAll("button[data-copy]").forEach(function (btn) {
  var label = btn.textContent, done = btn.getAttribute("data-done") || "Copied";
  btn.addEventListener("click", function () {
    var el = document.getElementById(btn.getAttribute("data-copy"));
    if (!el) return;
    var text = el.innerText;
    var ok = function () { btn.textContent = done; setTimeout(function () { btn.textContent = label; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var r = document.createRange(); r.selectNodeContents(el);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      try { document.execCommand("copy"); ok(); } catch (e) { /* selection stays so the user can copy */ }
    }
  });
});

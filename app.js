(function () {
  "use strict";
  var PAGE_HEAD = '<meta name="claude:viewport-fit-sides" content="cover"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=swap"><link rel="stylesheet" href="style.css">';
  // Plausible custom event "Category click" with property "category" (public site only)
  function track(id) {
    if (typeof window.plausible !== "function") return;
    var c = DATA.cats.filter(function (x) { return x.id === id; })[0];
    try { window.plausible("Category click", { props: { category: c ? c.name : id } }); } catch (e) {}
  }
  var DATA = JSON.parse(document.getElementById("data").textContent);
  var state = { cat: "baekur", q: "", editing: false, canEdit: false, dirty: false, flat: [], pos: 0 };
  var app = document.getElementById("app");
  var BASE = (function () { try { return new URL(".", document.baseURI).href; } catch (e) { return ""; } })();
  function src(kind, im) { return BASE + "img/" + kind + "/" + im + ".jpg"; }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function byCat(c) { return DATA.items.filter(function (x) { return x.cat === c; }); }
  function visible() { return byCat(state.cat); }
  var SOLD = '<span class="sold">Selt</span>';
  var PRICE_LABEL = "Ver\u00f0hugmynd", PRICE_DEFAULT = "Tilbo\u00f0";
  function hasPrice(x) { return x.cat !== "baekur"; }
  function priceText(x) { return (x.price && String(x.price).trim()) || PRICE_DEFAULT; }
  function bookCount(x) { return x.books.length; }
  function plural(n, one, many) { return n + " " + (n % 10 === 1 && n % 100 !== 11 ? one : many); }

  /* ---------- page ---------- */
  function render() {
    var s = DATA.site, items = visible();
    document.title = s.title;
    var ed = state.editing ? ' contenteditable="true" spellcheck="true"' : "";
    app.innerHTML =
      '<div class="wrap">' +
      '<header class="top">' + editBtn() +
      '<h1 data-f="title"' + ed + '>' + esc(s.title) + '</h1>' +
      '<p class="intro" data-f="intro"' + ed + '>' + esc(s.intro) + '</p></header>' +
      '<nav class="cats" aria-label="Flokkar">' + DATA.cats.map(function (c) {
        var n = byCat(c.id).length;
        return '<button class="cat" type="button" data-cat="' + c.id + '" aria-pressed="' + (c.id === state.cat) + '">' +
          esc(c.name) + '<span class="c">' + (n || "") + '</span></button>';
      }).join("") + '</nav>' + catEditor() +
      '<section class="grid" aria-live="polite">' + (items.length ? items.map(card).join("") : emptyText()) + '</section>' +
      '<footer class="contact" id="hafa-samband"><h2>Hafa samband</h2>' +
      '<div class="lines">' +
      contactLine("Netfang", "email", s.email, "mailto:" + s.email, ed) +
      contactLine("S\u00edmi / SMS", "phone", s.phone, "sms:" + s.phone.replace(/\s/g, ""), ed) +
      '</div></footer></div>' + ownerBar();
    bindPage();
  }
  function countText(items) {
    var b = items.reduce(function (a, x) { return a + bookCount(x); }, 0);
    if (!items.length) return "";
    var sold = items.filter(function (x) { return x.sold; }).length;
    return plural(items.length, "munur", "munir") + (sold ? " \u00b7 " + sold + " seldir" : "");
  }
  function emptyText() {
    return '<p class="empty">Engar myndir komnar \u00ed \u00feennan flokk enn. Haf\u00f0u samband ef \u00fe\u00fa leitar a\u00f0 einhverju s\u00e9rst\u00f6ku.</p>';
  }
  function contactLine(k, f, v, href, ed) {
    return '<div class="line"><div><div class="k">' + k + '</div><div class="v" data-f="' + f + '"' + ed + '>' + esc(v) + '</div></div>' +
      (state.editing ? "" : '<button class="btn" type="button" data-copy="' + esc(v) + '">Afrita</button><a class="btn" href="' + esc(href) + '">' + (f === "email" ? "Senda" : "SMS") + '</a>') + '</div>';
  }
  function card(x) {
    var sub = hasPrice(x) ? PRICE_LABEL + ": " + priceText(x) : x.books.length > 1 ? plural(x.books.length, "l\u00edna", "l\u00ednur") + " \u00ed b\u00f3kalista" : (x.books[0] ? [x.books[0].a, x.books[0].y].filter(Boolean).join(", ") : "");
    var ims = x.imgs.slice(0, 3);
    return '<button class="card' + (x.sold ? " is-sold" : "") + '" type="button" data-open="' + esc(x.id) + '">' +
      '<div class="ph n' + ims.length + '">' + ims.map(function (im, i) {
        return '<img loading="lazy" src="' + esc(src("thumb", im)) + '" alt="' + (i ? "" : esc(x.title)) + '">';
      }).join("") + (x.sold ? SOLD : "") + '</div>' +
      '<h3>' + esc(x.title) + '</h3>' +
      '<p class="sub"><span class="ref">' + esc(x.ref) + '</span>' + (sub ? " \u00b7 " + esc(sub) : "") + '</p></button>';
  }
  function catEditor() {
    if (!state.editing) return "";
    return '<div class="catedit"><span class="hint">Heiti flokka</span>' + DATA.cats.map(function (c, i) {
      return '<span class="catfield"><input data-catname="' + i + '" value="' + esc(c.name) + '" aria-label="Heiti flokks">' +
        '<button type="button" class="catdel" data-catdel="' + i + '" aria-label="Ey\u00f0a flokki ' + esc(c.name) + '">\u00d7</button></span>';
    }).join("") + '<button type="button" class="btn" data-catadd>+ N\u00fdr flokkur</button>' +
      '<span class="hint" id="cat-msg"></span></div>';
  }
  function editBtn() {
    if (!state.canEdit || state.editing) return "";
    return '<button class="editlink" type="button" data-act="edit">Breyta</button>';
  }
  function ownerBar() {
    if (!state.canEdit) return "";
    if (!state.editing) return "";
    return '<div class="ownerbar"><span class="status' + (state.dirty ? " dirty" : "") + '" id="status">' + (state.dirty ? "\u00d3vista\u00f0ar breytingar" : "Breytingahamur") + '</span>' +
      '<button class="btn" type="button" data-act="done">H\u00e6tta</button>' +
      '<button class="btn primary" type="button" data-act="save">Vista og birta</button></div>';
  }

  function bindPage() {
    app.querySelectorAll("[data-cat]").forEach(function (b) { b.onclick = function () { state.cat = b.dataset.cat; track(b.dataset.cat); render(); }; });
    app.querySelectorAll("[data-open]").forEach(function (b) { b.onclick = function () { openItem(b.dataset.open); }; });
    app.querySelectorAll("[data-copy]").forEach(function (b) {
      b.onclick = function () {
        var v = b.dataset.copy;
        var done = function () { b.textContent = "Afrita\u00f0"; setTimeout(function () { b.textContent = "Afrita"; }, 1500); };
        try { navigator.clipboard.writeText(v).then(done, function () { selectText(b.previousElementSibling); }); } catch (e) { selectText(b.previousElementSibling); }
      };
    });
    app.querySelectorAll("[data-f]").forEach(function (el) {
      el.addEventListener("input", function () { DATA.site[el.dataset.f] = el.textContent.trim(); if (el.dataset.f === "title") document.title = DATA.site.title; markDirty(); });
    });
    app.querySelectorAll("[data-catname]").forEach(function (el) {
      el.addEventListener("input", function () {
        var c = DATA.cats[+el.dataset.catname]; c.name = el.value;
        var tab = app.querySelector('[data-cat="' + c.id + '"]'); if (tab && tab.firstChild) tab.firstChild.nodeValue = el.value;
        markDirty();
      });
    });
    app.querySelectorAll("[data-catdel]").forEach(function (b) {
      b.onclick = function () {
        var c = DATA.cats[+b.dataset.catdel], n = byCat(c.id).length, msg = document.getElementById("cat-msg");
        if (n) { msg.textContent = "\u201e" + c.name + "\u201c hefur " + n + " muni. F\u00e6r\u00f0u \u00fe\u00e1 \u00ed annan flokk fyrst."; msg.className = "hint warn"; return; }
        if (DATA.cats.length < 2) return;
        DATA.cats.splice(+b.dataset.catdel, 1);
        if (state.cat === c.id) state.cat = DATA.cats[0].id;
        markDirty(); render();
      };
    });
    var add = app.querySelector("[data-catadd]");
    if (add) add.onclick = function () {
      var base = "flokkur", id = base, k = 2;
      while (DATA.cats.some(function (c) { return c.id === id; })) id = base + k++;
      DATA.cats.push({ id: id, name: "N\u00fdr flokkur" });
      state.cat = id; markDirty(); render();
      var inp = app.querySelector('[data-catname="' + (DATA.cats.length - 1) + '"]'); if (inp) { inp.focus(); inp.select(); }
    };
    app.querySelectorAll("[data-act]").forEach(function (b) { b.onclick = function () { act(b.dataset.act); }; });
  }
  function selectText(el) { if (!el) return; var r = document.createRange(); r.selectNodeContents(el.querySelector(".v") || el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  function markDirty() { state.dirty = true; var s = document.getElementById("status"); if (s) { s.textContent = "\u00d3vista\u00f0ar breytingar"; s.className = "status dirty"; } }

  /* ---------- lightbox ---------- */
  var lb = null;
  function buildFlat() {
    state.flat = [];
    visible().forEach(function (x) { x.imgs.forEach(function (im, i) { state.flat.push({ item: x, img: im, i: i }); }); });
  }
  function openItem(id) {
    buildFlat();
    var k = state.flat.findIndex(function (f) { return f.item.id === id; });
    if (k < 0) { var it = DATA.items.find(function (x) { return x.id === id; }); if (!it) return; state.cat = it.cat; render(); buildFlat(); k = state.flat.findIndex(function (f) { return f.item.id === id; }); }
    state.pos = k; showLb();
  }
  function showLb() {
    if (!lb) {
      lb = document.createElement("div"); lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
      document.body.appendChild(lb); document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKey);
    }
    armed = "";
    var f = state.flat[state.pos], x = f.item;
    lb.setAttribute("aria-label", x.title);
    lb.innerHTML =
      '<div class="stage"><button class="close" type="button" data-lb="close">\u2715 Loka</button>' +
      '<div class="pos">' + (state.pos + 1) + " / " + state.flat.length + '</div>' +
      '<div class="shot"><img src="' + esc(src("full", f.img)) + '" alt="' + esc(x.title) + (x.imgs.length > 1 ? ", mynd " + (f.i + 1) + " af " + x.imgs.length : "") + '">' + (x.sold ? SOLD : "") + '</div>' +
      (x.imgs.length > 1 ? '<div class="strip">' + x.imgs.map(function (im, i) {
        return '<button type="button" data-jump="' + i + '" aria-label="Mynd ' + (i + 1) + '"' + (i === f.i ? ' aria-current="true"' : "") + '><img src="' + esc(src("thumb", im)) + '" alt=""></button>';
      }).join("") + '</div>' : "") +
      (state.flat.length > 1 ? '<button class="nav prev" type="button" data-lb="prev" aria-label="Fyrri mynd">\u2039</button><button class="nav next" type="button" data-lb="next" aria-label="N\u00e6sta mynd">\u203a</button>' : "") +
      '</div><aside class="panel">' + (state.editing ? editPanel(x, f) : viewPanel(x, f)) + '</aside>';
    lb.querySelectorAll("[data-lb]").forEach(function (b) { b.onclick = function () { lbAct(b.dataset.lb); }; });
    lb.querySelectorAll("[data-jump]").forEach(function (b) { b.onclick = function () { state.pos += +b.dataset.jump - f.i; showLb(); }; });
    var stage = lb.querySelector(".stage"), sx = null;
    stage.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) lbAct(dx < 0 ? "next" : "prev"); sx = null; });
    stage.addEventListener("click", function (e) { if (e.target === stage) lbAct("close"); });
    if (state.editing) bindEdit(x, f);
    var nx = state.flat[(state.pos + 1) % state.flat.length]; if (nx) { var pre = new Image(); pre.src = src("full", nx.img); }
  }
  function viewPanel(x, f) {
    var metaBits = (x.sold ? '<span class="tag sold-tag">Selt</span>' : "") + '<span class="ref">' + esc(x.ref) + '</span>';
    return (metaBits ? '<div class="meta">' + metaBits + '</div>' : "") +
      '<h2>' + esc(x.title) + '</h2>' + (x.desc ? '<p class="desc">' + esc(x.desc) + '</p>' : "") +
      (x.note ? '<p class="note">' + esc(x.note) + '</p>' : "") +
      (hasPrice(x) ? '<p class="price"><span class="k">' + PRICE_LABEL + '</span><span class="v">' + esc(priceText(x)) + '</span></p>' : "") +
      (x.books.length ? '<h4>' + (x.books.length > 1 ? "\u00c1 myndinni" : "B\u00f3kin") + '</h4><ul class="books">' + x.books.map(function (b) {
        return '<li><span class="t">' + esc(b.t) + '</span>' + (b.a ? '<span class="a">' + esc(b.a) + '</span>' : "") + (b.y ? '<span class="y">' + esc(b.y) + '</span>' : "") + '</li>';
      }).join("") + '</ul>' : "") +
      "";
  }
  function editPanel(x, f) {
    var bt = x.books.map(function (b) { return [b.t, b.a, b.y].join(" | ").replace(/( \| )+$/, ""); }).join("\n");
    var mv = '<div class="move"><label>F\u00e6ra \u00feessa mynd \u00ed anna\u00f0 n\u00famer' +
      '<span class="row"><input id="e-move" placeholder="Autt = n\u00fdtt n\u00famer" autocomplete="off"><button class="btn" type="button" id="e-move-go">F\u00e6ra</button></span></label>' +
      '<button class="btn danger" type="button" id="e-del">Ey\u00f0a \u00feessari mynd</button>' +
      '<div class="hint" id="e-move-msg">' + esc(state.moveMsg || ("Mynd " + (f.i + 1) + " af " + x.imgs.length + " \u00ed " + x.ref + ". Skrifa\u00f0u n\u00famer, e\u00f0a skildu eftir autt til a\u00f0 b\u00faa til n\u00fdja f\u00e6rslu.")) + '</div></div>';
    state.moveMsg = "";
    return '<div class="edit">' + mv + '<div class="hint">Breytingar vistast \u00feegar \u00fe\u00fa smellir \u00e1 \u201eVista og birta\u201c.</div>' +
      '<div class="row"><label style="flex:1 1 90px">N\u00famer<input id="e-ref" value="' + esc(x.ref) + '"></label>' +
      '<label style="flex:2 1 140px">Flokkur<select id="e-cat">' + DATA.cats.map(function (c) { return '<option value="' + c.id + '"' + (c.id === x.cat ? " selected" : "") + '>' + esc(c.name) + '</option>'; }).join("") + '</select></label></div>' +
      '<label>Titill<input id="e-title" value="' + esc(x.title) + '"></label>' +
      (hasPrice(x) ? '<label>' + PRICE_LABEL + '<input id="e-price" placeholder="' + PRICE_DEFAULT + '" value="' + esc(x.price || "") + '"></label><div class="hint">Autt = \u201e' + PRICE_DEFAULT + '\u201c</div>' : "") +
      '<label>L\u00fdsing<textarea id="e-desc">' + esc(x.desc) + '</textarea></label>' +
      '<label><span><input id="e-sold" type="checkbox"' + (x.sold ? " checked" : "") + '> Selt</span></label>' +
      '<label>Athugasemd fyrir safnara<textarea id="e-note">' + esc(x.note) + '</textarea></label>' +
      '<label>B\u00f3kalisti<textarea id="e-books" class="books-ta">' + esc(bt) + '</textarea></label>' +
      '<div class="hint">Ein b\u00f3k \u00ed l\u00ednu: Titill | H\u00f6fundur | \u00c1r</div></div>';
  }
  function nextRef(ref) {
    var pre = (String(ref).match(/^[A-Za-z]+/) || ["B"])[0].toUpperCase(), max = 0;
    DATA.items.forEach(function (y) { [y.ref, y.id].forEach(function (v) { var m = String(v).toUpperCase().match(/^([A-Z]+)-?(\d+)$/); if (m && m[1] === pre) max = Math.max(max, +m[2]); }); });
    var n = String(max + 1); while (n.length < 2) n = "0" + n;
    return pre + "-" + n;
  }
  /* No confirm(): modals are blocked in the artifact frame. First click arms, second click does it. */
  var armed = "";
  function sure(key, msg) {
    if (armed === key) { armed = ""; return true; }
    armed = key; var el = lb && lb.querySelector("#e-move-msg"); if (el) { el.textContent = msg; el.className = "hint warn"; }
    return false;
  }
  function dropIfEmpty(x) { if (!x.imgs.length) DATA.items.splice(DATA.items.indexOf(x), 1); }
  function deleteImg(x, f) {
    var last = x.imgs.length < 2;
    if (!sure("del:" + x.id + ":" + f.i, (last ? "\u00deetta er eina mynd " + x.ref + ". Myndinni og f\u00e6rslunni ver\u00f0ur eytt." : "Ey\u00f0a mynd " + (f.i + 1) + " \u00far " + x.ref + "?") + " Smelltu aftur til a\u00f0 sta\u00f0festa.")) return;
    x.imgs.splice(f.i, 1); dropIfEmpty(x); markDirty();
    buildFlat();
    if (!state.flat.length) { lbAct("close"); return; }
    state.pos = Math.min(state.pos, state.flat.length - 1);
    state.moveMsg = last ? x.ref + " eytt. Mundu a\u00f0 vista." : "Mynd eytt. Mundu a\u00f0 vista.";
    showLb();
  }
  function moveImg(x, f, to) {
    var key = String(to || "").trim().toUpperCase();
    if (!key) key = nextRef(x.ref);
    var t = DATA.items.find(function (y) { return String(y.ref).toUpperCase() === key; });
    if (t === x) return "Myndin er n\u00fa \u00feegar \u00ed " + x.ref + ".";
    if (x.imgs.length < 2 && !sure("move:" + x.id + ":" + key, "\u00deetta er eina mynd " + x.ref + ". F\u00e6rslunni " + x.ref + " ver\u00f0ur eytt. Smelltu aftur \u00e1 F\u00e6ra til a\u00f0 sta\u00f0festa.")) return null;
    var made = !t;
    if (made) {
      var nid = key, n2 = 2; while (DATA.items.some(function (y) { return y.id === nid; })) nid = key + "-" + n2++;
      t = { cat: x.cat, title: "N\u00fdr munur " + key, imgs: [], desc: "", books: [], rare: false, note: "", ref: key, id: nid };
      DATA.items.splice(DATA.items.indexOf(x) + 1, 0, t);
    }
    x.imgs.splice(f.i, 1); t.imgs.push(f.img); dropIfEmpty(x); markDirty();
    buildFlat();
    var k = state.flat.findIndex(function (g) { return g.item === t && g.img === f.img; });
    if (k < 0) k = state.flat.findIndex(function (g) { return g.item === x; });
    state.pos = Math.max(0, k);
    state.moveMsg = (made ? "N\u00fd f\u00e6rsla " + t.ref + " b\u00fain til. Breyttu titlinum h\u00e9r fyrir ne\u00f0an." : "Mynd f\u00e6r\u00f0 \u00ed " + t.ref + ".") + " Mundu a\u00f0 vista.";
    showLb(); return null;
  }
  function bindEdit(x, f) {
    var go = lb.querySelector("#e-move-go"), inp = lb.querySelector("#e-move");
    function doMove() { var msg = moveImg(x, f, inp.value); if (msg) lb.querySelector("#e-move-msg").textContent = msg; }
    go.onclick = doMove;
    lb.querySelector("#e-del").onclick = function () { deleteImg(x, f); };
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") doMove(); });
    function on(id, fn) { var el = lb.querySelector("#" + id); el.addEventListener("input", function () { fn(el); markDirty(); }); el.addEventListener("change", function () { fn(el); markDirty(); }); }
    on("e-ref", function (el) { x.ref = el.value.trim(); });
    on("e-cat", function (el) { var was = hasPrice(x); x.cat = el.value; if (was !== hasPrice(x)) showLb(); });
    if (lb.querySelector("#e-price")) on("e-price", function (el) { x.price = el.value.trim(); });
    on("e-title", function (el) { x.title = el.value; });
    on("e-desc", function (el) { x.desc = el.value; });
    on("e-sold", function (el) { x.sold = el.checked; });
    on("e-note", function (el) { x.note = el.value; });
    on("e-books", function (el) {
      x.books = el.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
        var p = l.split("|").map(function (s) { return s.trim(); }); return { t: p[0] || "", a: p[1] || "", y: p[2] || "" };
      });
    });
  }
  function lbAct(a) {
    if (a === "close") { var cur = state.flat[state.pos]; if (cur && cur.item.cat !== state.cat && DATA.items.indexOf(cur.item) > -1) state.cat = cur.item.cat; lb.remove(); lb = null; document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); render(); return; }
    var n = state.flat.length; state.pos = (state.pos + (a === "next" ? 1 : n - 1)) % n; showLb();
  }
  function onKey(e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") { if (e.key === "Escape") e.target.blur(); return; }
    if (e.key === "Escape") lbAct("close"); else if (e.key === "ArrowRight") lbAct("next"); else if (e.key === "ArrowLeft") lbAct("prev");
  }

  /* ---------- owner editing ---------- */
  var artifactNs = null;
  function act(a) {
    if (a === "edit") { state.editing = true; render(); }
    else if (a === "done") { if (state.dirty) { location.reload(); return; } state.editing = false; render(); }
    else if (a === "save") save();
  }
  function docHtml() {
    var json = JSON.stringify(DATA).replace(/</g, "\\u003c");
    return '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>' +
      ':root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}' +
      '</style></head><body><title>' + esc(DATA.site.title) + '</title>' + PAGE_HEAD +
      '<div id="app"></div><script type="application/json" id="data">' + json + '<\/script><script src="app.js"><\/script>' +
      '</body></html>';
  }
  function save() {
    var s = document.getElementById("status");
    if (!artifactNs) { if (s) s.textContent = "Ekki h\u00e6gt a\u00f0 vista h\u00e9r"; return; }
    if (s) s.textContent = "Vista\u2026";
    artifactNs.publish(docHtml()).then(function () { if (s) s.textContent = "Vista\u00f0"; }, function (err) {
      var c = err && err.code;
      if (!s) return;
      if (c === "conflict") s.textContent = "N\u00fd \u00fatg\u00e1fa var birt. S\u00ed\u00f0an endurhle\u00f0st.";
      else if (c === "not_writer" || c === "not_granted") { s.textContent = "\u00de\u00fa hefur ekki leyfi til a\u00f0 breyta."; }
      else if (c === "rate_limited") s.textContent = "Of margar vistanir. Reyndu aftur eftir sm\u00e1 stund.";
      else s.textContent = "Vistun t\u00f3kst ekki (" + (c || "villa") + ").";
    });
  }

  render();
  if (location.hash.length > 1) { var h = decodeURIComponent(location.hash.slice(1)); if (DATA.items.some(function (x) { return x.ref === h; })) openItem(DATA.items.find(function (x) { return x.ref === h; }).id); }

  if (window.claude && window.claude.use) {
    window.claude.use("artifact").then(function (a) { artifactNs = a; }, function () {});
    window.claude.use("user").then(function (user) {
      if (!user) return;
      return Promise.all([user.canEdit(), user.isOwner()]).then(function (r) {
        if (r[0] || r[1]) { state.canEdit = true; if (!lb) render(); }
      });
    }).catch(function () {});
  }
})();

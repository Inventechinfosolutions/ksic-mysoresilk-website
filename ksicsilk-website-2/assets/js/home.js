/* Home page: hero carousel + data-driven product sections */
(async () => {
  "use strict";
  const { $, $$, esc, money, icon, loadProducts, card, skeleton, reveal, productUrl, title, recent } = window.KSIC;

  /* ------------------------------------------------------------ hero */
  const hero = $("#hero");
  const slides = $$(".slide", hero);
  const dots = $("#heroDots");
  const video = $("#heroVideo");
  const playBtn = $("#heroPlay");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DURATION = 6000;
  let index = 0;
  let timer;
  let userPaused = reduced;

  // the video slide stays up for the length of the clip
  const durationOf = (slide) => (slide.hasAttribute("data-video") && video && video.duration
    ? Math.round(video.duration * 1000)
    : Number(slide.dataset.duration) || DURATION);

  // split slide headings into words so each can animate in on its own
  $$("[data-split]", hero).forEach((h) => {
    let n = 0;
    const wrap = (text) => text.split(/(\s+)/).map((w) => (/^\s+$/.test(w) || !w ? w : `<span class="w"><span style="--wi:${n++}">${w}</span></span>`)).join("");
    h.innerHTML = [...h.childNodes].map((node) => node.nodeType === 3
      ? wrap(node.textContent)
      : `<em>${wrap(node.textContent)}</em>`).join("");
  });

  dots.innerHTML = slides.map((_, i) => `<button role="tab" aria-label="Slide ${i + 1}"><i></i></button>`).join("");
  const dotEls = $$("button", dots);

  function syncVideo() {
    if (!video) return;
    const onVideo = slides[index].hasAttribute("data-video");
    playBtn.hidden = !onVideo;
    if (onVideo && !userPaused) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }
  function go(n) {
    index = (n + slides.length) % slides.length;
    slides.forEach((s, i) => { s.classList.toggle("is-active", i === index); s.setAttribute("aria-hidden", i !== index); });
    dotEls.forEach((d, i) => {
      d.classList.remove("is-active");
      d.setAttribute("aria-selected", i === index);
      d.style.setProperty("--dur", `${durationOf(slides[i])}ms`);
      if (i === index) { void d.offsetWidth; d.classList.add("is-active"); }
    });
    syncVideo();
    restart();
  }
  function restart() {
    clearTimeout(timer);
    const holdForVideo = slides[index].hasAttribute("data-video") && userPaused;
    hero.classList.toggle("is-paused", hero.matches(":hover") || holdForVideo);
    if (!hero.classList.contains("is-paused")) timer = setTimeout(() => go(index + 1), durationOf(slides[index]));
  }
  dots.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go(dotEls.indexOf(b)); });
  $("#heroPrev").addEventListener("click", () => go(index - 1));
  $("#heroNext").addEventListener("click", () => go(index + 1));
  hero.addEventListener("mouseenter", () => { hero.classList.add("is-paused"); clearTimeout(timer); });
  hero.addEventListener("mouseleave", () => { hero.classList.remove("is-paused"); restart(); });
  let startX = null;
  hero.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") startX = e.clientX; });
  hero.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  if (video) {
    if (reduced) video.removeAttribute("autoplay");
    const setBtn = () => {
      playBtn.classList.toggle("is-paused", userPaused);
      playBtn.setAttribute("aria-pressed", userPaused);
      playBtn.setAttribute("aria-label", userPaused ? "Play video" : "Pause video");
    };
    playBtn.addEventListener("click", () => {
      userPaused = !userPaused;
      setBtn();
      if (userPaused) video.pause(); else video.play().catch(() => {});
      restart();
    });
    setBtn();
    // the real clip length is known once metadata loads
    video.addEventListener("loadedmetadata", () => { if (slides[index].hasAttribute("data-video")) go(index); }, { once: true });
    // save battery: pause when the hero scrolls out of view
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        if (!slides[index].hasAttribute("data-video") || userPaused) return;
        e.isIntersecting ? video.play().catch(() => {}) : video.pause();
      }, { threshold: 0.2 }).observe(hero);
    }
  }
  go(0);
  // start the clip from frame one once the loading curtain lifts
  if (document.body.classList.contains("is-preloading")) {
    const mo = new MutationObserver(() => {
      if (document.body.classList.contains("is-preloading")) return;
      mo.disconnect();
      if (slides[index].hasAttribute("data-video")) go(index);
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  /* ------------------------------------------------------------- USPs */
  const usps = [
    ["silk", "100% pure silk", "Mulberry silk, warp and weft"],
    ["zari", "Pure gold zari", "On every Mysore silk saree"],
    ["shield", "GI certified", "Geographical Indication no. 11"],
    ["crown", "Since 1912", "Founded by the royal house of Mysore"],
    ["store", "15 showrooms", "Karnataka & Hyderabad"],
  ];
  $("#usp").innerHTML = usps.map(([i, t, s]) => `<div class="usp__item"><span class="usp__icon">${icon(i)}</span><div><strong>${t}</strong><small>${s}</small></div></div>`).join("");

  /* ------------------------------------------------------------- data */
  $("#newGrid").innerHTML = skeleton(8);
  $("#heirloomGrid").innerHTML = skeleton(4);
  let products;
  try {
    products = await loadProducts();
  } catch {
    $("#newGrid").innerHTML = `<p class="empty">Couldn't load products. Serve the site over HTTP (see README).</p>`;
    $("#heirloomGrid").innerHTML = "";
    return;
  }
  const byId = products.byId;
  const newest = [...products].sort((a, b) => b.id - a.id);

  // hero product trio
  colourStory([39, 46, 29, 49].map((id) => byId.get(id)).filter(Boolean));

  // ornate category menu
  const count = (fn) => products.filter(fn).length;
  const frames = [
    ["Silk Sarees", "shop.html?cat=sarees", 42, count((p) => p.category === "saree")],
    ["Heirloom", "shop.html?cat=sarees&price=above100", 62, count((p) => p.category === "saree" && p.price >= 100000)],
    ["Silk Kurtas", "shop.html?cat=menswear&type=kurta", 72, count((p) => p.type === "kurta")],
    ["Silk Shirts", "shop.html?cat=menswear&type=shirt", 70, count((p) => p.type === "shirt")],
    ["Ties & Gifts", "shop.html?cat=gifting", 80, count((p) => p.type === "tie" || p.type === "gift-set")],
  ];
  const frameShell = (inner) => `<div class="frame__shape"><span class="frame__ring"></span><span class="frame__img">${inner}</span></div>`;
  $("#frames").innerHTML = `
    <a class="frame frame--promo reveal" href="shop.html?cat=all&sort=new">
      ${frameShell(`<span class="frame__promo"><strong>New<br>In</strong><em>Fresh off the looms</em></span>`)}
      <h3>New Arrivals</h3><small>${products.length} pieces</small>
    </a>` + frames.map(([name, href, img, n], i) => `
    <a class="frame reveal" style="--d:${(i + 1) * 0.06}s" href="${href}">
      ${frameShell(`<img src="${byId.get(img).image}" alt="" loading="lazy">`)}
      <h3>${name}</h3><small>${n} ${n === 1 ? "style" : "styles"}</small>
    </a>`).join("");

  // new arrivals tabs
  const TABS = {
    sarees: { fn: (p) => p.category === "saree", href: "shop.html?cat=sarees&sort=new", label: "View all sarees" },
    menswear: { fn: (p) => ["kurta", "shirt", "tie"].includes(p.type), href: "shop.html?cat=menswear", label: "View all menswear" },
    gifting: { fn: (p) => p.type === "gift-set" || p.type === "tie", href: "shop.html?cat=gifting", label: "View all gifts" },
  };
  function showTab(key) {
    const t = TABS[key];
    $$("#newTabs button").forEach((b) => { const on = b.dataset.tab === key; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", on); });
    $("#newGrid").innerHTML = newest.filter(t.fn).slice(0, 8).map(card).join("");
    $("#newAll").href = t.href;
    $("#newAll").textContent = t.label;
    window.KSIC.replay($("#newGrid"));
  }
  $("#newTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) showTab(b.dataset.tab); });
  showTab("sarees");

  // price categories (bento) — bands match the ksicsilk.com price menu
  const band = (lo, hi) => products.filter((p) => p.price > lo && p.price <= hi).length;
  const goIcon = `<span class="go">${icon("arrow")}</span>`;
  const tile = (cls, href, ids, kicker, label, n) => `
    <a class="b-price ${cls}" href="${href}">
      <span class="b-shelf">${ids.map((id) => `<img src="${byId.get(id).image}" alt="" loading="lazy">`).join("")}</span>
      <span class="b-label"><span><small>${kicker} · ${n} ${n === 1 ? "piece" : "pieces"}</small><strong>${label}</strong></span>${goIcon}</span>
    </a>`;
  $("#priceBento").innerHTML =
    tile("b-2x2 b-big b-dark", "shop.html?cat=all&price=above40", [39, 62, 46], "Mysore silk sarees", "Above ₹40,000", band(40000, Infinity)) +
    tile("b-1x2", "shop.html?cat=all&price=30to40", [29], "Sarees", "₹30,001 – ₹40,000", band(30000, 40000)) +
    tile("b-side", "shop.html?cat=all&price=15to30", [51], "Sarees", "₹15,001 – ₹30,000", band(15000, 30000)) +
    tile("b-side", "shop.html?cat=all&price=0to15", [72], "Menswear & gifts", "Up to ₹15,000", band(0, 15000));

  // heirloom
  $("#heirloomGrid").innerHTML = products.filter((p) => p.category === "saree").sort((a, b) => b.price - a.price).slice(0, 4).map(card).join("");

  // gifting price
  const gifts = products.filter((p) => p.type === "gift-set");
  if (gifts.length) $("#giftFrom").textContent = `from ${money(Math.min(...gifts.map((g) => g.price)))}`;

  // designs
  const seen = new Set();
  const designs = products.flatMap((p) => p.designs.map((d) => ({ ...d, p }))).filter((d) => !seen.has(d.image) && seen.add(d.image));
  $("#designCount").textContent = designs.length;
  $("#designs").innerHTML = designs.slice(0, 12).map((d, i) => `
    <a class="design reveal" style="--d:${(i % 6) * 0.04}s" href="${productUrl(d.p, d.id)}">
      <img src="${d.image}" alt="Design ${esc(d.code)}" loading="lazy"><span>Design ${esc(d.code)}</span>
    </a>`).join("");

  // recently viewed
  const rec = recent.ids().map((id) => byId.get(id)).filter(Boolean).slice(0, 4);
  if (rec.length) {
    $("#recentSec").hidden = false;
    $("#recentGrid").innerHTML = rec.map(card).join("");
  }

  reveal();

  /* ------------------------------------------- hero: colour story slide */
  function colourStory(list) {
    const slide = $(".slide--colours");
    const stage = $("#csStage");
    if (!slide || !list.length) return;
    const n = list.length;
    let cur = 0;
    let cycle;

    const stack = (cls) => `<div class="cs__card ${cls}"><div class="frame__shape"><span class="frame__ring"></span><span class="frame__img">${list.map((p, i) => `<img src="${p.image}" alt="${i === 0 ? esc(title(p)) : ""}" data-i="${i}">`).join("")}</span></div></div>`;
    stage.innerHTML = stack("cs__card--left") + stack("cs__card--right") + stack("cs__card--main") + `
      <a class="cs__tag" id="csTag" href="#"><span class="dot" id="csDot"></span><span><b id="csName"></b><small id="csMeta"></small></span>${icon("arrow")}</a>`;

    $("#csSwatches").innerHTML = list.map((p, i) => `
      <button role="tab" data-i="${i}" aria-label="${esc(p.color)}"><span class="cs__sw" style="background:${p.swatch}"></span><span class="cs__swname">${esc(p.color.replace(" & Black", "").replace("Navy Gandaberunda", "Midnight Navy"))}</span></button>`).join("");

    // a little gold dust drifting upward
    $("#csDust").innerHTML = Array.from({ length: 18 }, () =>
      `<i style="left:${(Math.random() * 100).toFixed(1)}%;--s:${(2 + Math.random() * 4).toFixed(1)}px;--t:${(6 + Math.random() * 8).toFixed(1)}s;--dl:-${(Math.random() * 10).toFixed(1)}s;--x:${(Math.random() * 60 - 30).toFixed(0)}px"></i>`).join("");

    function show(i) {
      cur = (i + n) % n;
      const p = list[cur];
      const set = (sel, k) => $$(`${sel} img`, stage).forEach((img) => img.classList.toggle("is-on", Number(img.dataset.i) === k));
      set(".cs__card--main", cur);
      set(".cs__card--left", (cur - 1 + n) % n);
      set(".cs__card--right", (cur + 1) % n);
      const main = $(".cs__card--main", stage);
      main.classList.remove("is-swap"); void main.offsetWidth; main.classList.add("is-swap");
      slide.style.setProperty("--glow", p.swatch);
      $("#csDot").style.background = p.swatch;
      $("#csName").textContent = p.color;
      $("#csMeta").textContent = `${p.article ? "Art. " + p.article + " · " : ""}${money(p.price)}`;
      $("#csTag").href = productUrl(p);
      $("#csView").href = productUrl(p);
      $$("#csSwatches button").forEach((b, j) => { b.classList.toggle("is-on", j === cur); b.setAttribute("aria-selected", j === cur); });
    }
    function startCycle() {
      clearInterval(cycle);
      cycle = setInterval(() => {
        if (slide.classList.contains("is-active") && !hero.classList.contains("is-paused")) show(cur + 1);
      }, 2400);
    }
    $("#csSwatches").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) { show(Number(b.dataset.i)); startCycle(); }
    });
    // clicking a side card brings it to the front
    stage.addEventListener("click", (e) => {
      if (e.target.closest(".cs__card--left")) { e.preventDefault(); show(cur - 1); startCycle(); }
      if (e.target.closest(".cs__card--right")) { e.preventDefault(); show(cur + 1); startCycle(); }
    });
    show(0);
    startCycle();
  }
})();

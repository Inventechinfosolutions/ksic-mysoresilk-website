/* KSIC Mysore Silk — version 5 home page behaviour.
   Product data comes from window.KSIC_CATALOG (assets/js/catalog.js, built from ksicsilk.com). */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    },
  };

  const CATALOG = window.KSIC_CATALOG || [];
  const byId = Object.fromEntries(CATALOG.map((p) => [p.id, p]));
  const variant = (p, v) => (p.variants.length ? p.variants[Math.min(v, p.variants.length - 1)] : null);
  const imgOf = (p, v = -1) => (v >= 0 && variant(p, v) ? variant(p, v).img : p.img);
  const labelOf = (p, v = -1) => (v >= 0 && variant(p, v) ? variant(p, v).label : p.colour);
  const CATEGORY_LABEL = { sarees: "Saree", men: "Men", gifting: "Gifting" };
  const TONES = {
    reds: { name: "Temple Reds", a: "#6d1c22", b: "#2a0a0d" },
    blues: { name: "Peacock Blues", a: "#1e3054", b: "#0a1020" },
    ivory: { name: "Ivory & Gold", a: "#b7a279", b: "#5a4a30" },
    pinks: { name: "Rani Pinks", a: "#7b1f4d", b: "#2d0a1c" },
    greens: { name: "Forest Greens", a: "#1f4a36", b: "#0a1a12" },
  };

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(message, action) {
    toastEl.innerHTML = `<span>${esc(message)}</span>`;
    if (action) {
      const b = document.createElement("button");
      b.textContent = action.label;
      b.addEventListener("click", () => { action.run(); toastEl.classList.remove("is-on"); });
      toastEl.append(b);
    }
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 3200);
  }

  /* ---------- Bag + wishlist state ---------- */
  let bag = store.get("ksic5-bag", []).filter((l) => byId[l.id]);
  let wish = new Set(store.get("ksic5-wish", []).filter((id) => byId[id]));

  function saveBag() { store.set("ksic5-bag", bag); renderCounts(); if (drawerMode === "bag") renderDrawer(); }
  function saveWish() { store.set("ksic5-wish", [...wish]); renderCounts(); if (drawerMode === "wish") renderDrawer(); }

  function addToBag(id, v = -1, qty = 1, quiet = false) {
    const key = `${id}:${v}`;
    const line = bag.find((l) => l.key === key);
    if (line) line.qty += qty; else bag.push({ key, id, v, qty });
    saveBag();
    const btn = $("#bagOpen");
    btn.classList.remove("is-bump"); void btn.offsetWidth; btn.classList.add("is-bump");
    if (!quiet) toast(`Added to bag — ${byId[id].name}`, { label: "View bag", run: () => openDrawer("bag") });
  }

  function toggleWish(id) {
    if (wish.has(id)) { wish.delete(id); toast("Removed from wishlist"); }
    else { wish.add(id); toast("Saved to wishlist", { label: "View", run: () => openDrawer("wish") }); }
    saveWish();
    $$(`[data-wish="${id}"]`).forEach((b) => b.setAttribute("aria-pressed", wish.has(id)));
  }

  function renderCounts() {
    $("#bagCount").textContent = bag.reduce((n, l) => n + l.qty, 0);
    const wc = $("#wishCount");
    wc.textContent = wish.size;
    wc.hidden = wish.size === 0;
  }

  /* ---------- Drawer ---------- */
  const drawer = $("#drawer");
  let drawerMode = null;
  let lastFocus = null;

  function openLayer(el) {
    lastFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add("is-locked");
    header.classList.add("is-solid");
  }
  function closeLayer(el) {
    el.hidden = true;
    if ($$(".drawer:not([hidden]), .search:not([hidden]), .film:not([hidden]), .mnav:not([hidden])").length === 0) {
      document.body.classList.remove("is-locked");
    }
    onScroll();
    lastFocus?.focus?.();
  }

  function openDrawer(mode) {
    drawerMode = mode;
    renderDrawer();
    openLayer(drawer);
    $(".drawer__head .icon-btn", drawer).focus();
  }

  function renderDrawer() {
    const body = $("#drawerBody");
    const foot = $("#drawerFoot");
    if (drawerMode === "bag") {
      $("#drawerTitle").textContent = `Your bag (${bag.reduce((n, l) => n + l.qty, 0)})`;
      if (!bag.length) {
        body.innerHTML = `<div class="drawer__empty"><p>Your bag is empty.</p><a class="btn btn--dark" href="#trending" data-close data-filter="all">Start shopping <i class="arrow"></i></a></div>`;
        foot.innerHTML = "";
        return;
      }
      body.innerHTML = bag.map((l) => {
        const p = byId[l.id];
        return `<div class="line">
          <div class="line__img"><img src="${imgOf(p, l.v)}" alt=""></div>
          <div><p class="line__name">${esc(p.name)}</p><p class="line__meta">${esc(labelOf(p, l.v))}${p.category === "sarees" ? ` · ${esc(p.code)}` : ""}</p>
            <div class="qty"><button data-qty="-1" data-key="${l.key}" aria-label="Decrease quantity">−</button><span>${l.qty}</span><button data-qty="1" data-key="${l.key}" aria-label="Increase quantity">+</button></div></div>
          <div class="line__side"><span>${inr.format(p.price * l.qty)}</span><button class="line__remove" data-remove="${l.key}">Remove</button></div>
        </div>`;
      }).join("");
      const total = bag.reduce((s, l) => s + byId[l.id].price * l.qty, 0);
      foot.innerHTML = `<div class="sum"><span>Subtotal</span><strong>${inr.format(total)}</strong></div>
        <p class="drawer__note">Prices as listed on ksicsilk.com. Checkout completes on ksicsilk.com.</p>
        <a class="btn btn--dark" href="https://www.ksicsilk.com/Identity/Account/Login" target="_blank" rel="noopener">Checkout <i class="arrow"></i></a>`;
    } else {
      $("#drawerTitle").textContent = `Wishlist (${wish.size})`;
      foot.innerHTML = "";
      if (!wish.size) {
        body.innerHTML = `<div class="drawer__empty"><p>Tap the heart on any piece to save it here.</p></div>`;
        return;
      }
      body.innerHTML = [...wish].map((id) => {
        const p = byId[id];
        return `<div class="line">
          <div class="line__img"><img src="${p.img}" alt=""></div>
          <div><p class="line__name">${esc(p.name)}</p><p class="line__meta">${esc(p.colour)} · ${inr.format(p.price)}</p>
            <button class="btn btn--dark" style="height:34px;padding:0 14px" data-move="${id}">Move to bag</button></div>
          <div class="line__side"><button class="line__remove" data-unwish="${id}">Remove</button></div>
        </div>`;
      }).join("");
    }
  }

  drawer.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (e.target.closest("[data-close]")) { closeLayer(drawer); return; }
    if (!t) return;
    if (t.dataset.qty) {
      const line = bag.find((l) => l.key === t.dataset.key);
      line.qty += Number(t.dataset.qty);
      if (line.qty < 1) bag = bag.filter((l) => l !== line);
      saveBag();
    } else if (t.dataset.remove) {
      const removed = bag.find((l) => l.key === t.dataset.remove);
      bag = bag.filter((l) => l.key !== t.dataset.remove);
      saveBag();
      toast("Removed from bag", { label: "Undo", run: () => { bag.push(removed); saveBag(); } });
    } else if (t.dataset.move) {
      addToBag(t.dataset.move, -1, 1, true);
      wish.delete(t.dataset.move);
      saveWish();
      $$(`[data-wish="${t.dataset.move}"]`).forEach((b) => b.setAttribute("aria-pressed", "false"));
      toast("Moved to bag");
    } else if (t.dataset.unwish) {
      toggleWish(t.dataset.unwish);
    }
  });

  $("#bagOpen").addEventListener("click", () => openDrawer("bag"));
  $("#wishOpen").addEventListener("click", () => openDrawer("wish"));

  /* ---------- Header ---------- */
  const header = $("#header");
  const hero = $(".hero");
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY;
    const pastHero = y > hero.offsetHeight - 90;
    const layerOpen = document.body.classList.contains("is-locked");
    header.classList.toggle("is-solid", pastHero || layerOpen || $(".nav__drop").classList.contains("is-open"));
    header.classList.toggle("is-hidden", !layerOpen && y > 700 && y > lastY + 4);
    if (y < lastY - 4 || y < 700) header.classList.remove("is-hidden");
    lastY = y;
  }
  addEventListener("scroll", onScroll, { passive: true });

  const drop = $(".nav__drop");
  const dropBtn = $(".nav__drop-btn");
  function setDrop(open) {
    drop.classList.toggle("is-open", open);
    dropBtn.setAttribute("aria-expanded", open);
    onScroll();
  }
  dropBtn.addEventListener("click", () => setDrop(!drop.classList.contains("is-open")));
  drop.addEventListener("mouseenter", () => matchMedia("(hover: hover)").matches && setDrop(true));
  drop.addEventListener("mouseleave", () => matchMedia("(hover: hover)").matches && setDrop(false));
  document.addEventListener("click", (e) => { if (!drop.contains(e.target)) setDrop(false); });

  // Mobile menu
  const mnav = $("#mobileNav");
  $("#menuOpen").addEventListener("click", () => { openLayer(mnav); $("#menuOpen").setAttribute("aria-expanded", "true"); $("#menuClose").focus(); });
  $("#menuClose").addEventListener("click", () => { closeLayer(mnav); $("#menuOpen").setAttribute("aria-expanded", "false"); });
  mnav.addEventListener("click", (e) => {
    if (e.target === mnav || e.target.closest("a")) { closeLayer(mnav); $("#menuOpen").setAttribute("aria-expanded", "false"); }
  });

  /* ---------- Theme toggle ---------- */
  const themeBtn = $("#themeToggle");
  const themeMeta = $('meta[name="theme-color"]');
  function applyTheme(theme, save) {
    document.documentElement.dataset.theme = theme;
    window.ksicHeroImages?.(theme);
    const dark = theme === "dark";
    themeBtn.setAttribute("aria-pressed", dark);
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    themeMeta.content = dark ? "#12100e" : "#f2eee7";
    if (save) store.set("ksic5-theme", theme);
  }
  applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light", false);
  themeBtn.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
  });
  // Follow the OS setting live until the visitor picks a theme themselves.
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (store.get("ksic5-theme", null) === null) applyTheme(e.matches ? "dark" : "light", false);
  });

  /* ---------- Hero slider ---------- */
  const slides = $$(".slide");
  const tabs = $$(".hero__count button");
  const bar = $("#heroBar");
  const DURATION = 7000;
  let current = 0;
  let elapsed = 0;
  let paused = false;
  let lastTick = performance.now();

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      s.classList.toggle("is-active", n === current);
      s.setAttribute("aria-hidden", n !== current);
      $$("a, button", s).forEach((el) => (el.tabIndex = n === current ? 0 : -1));
    });
    tabs.forEach((t, n) => t.setAttribute("aria-selected", n === current));
    elapsed = 0;
  }
  tabs.forEach((t, n) => t.addEventListener("click", () => goTo(n)));
  // The hero fills the screen, so hovering must not pause autoplay. Only pause while a keyboard
  // user is tabbing through the slide's links (mouse clicks also focus buttons — ignore those).
  hero.addEventListener("focusin", (e) => (paused = e.target.matches(":focus-visible")));
  hero.addEventListener("focusout", () => (paused = false));

  function tick(now) {
    const dt = Math.min(now - lastTick, 100);
    lastTick = now;
    const visible = !document.hidden && scrollY < hero.offsetHeight;
    if (!paused && visible && !reduceMotion) {
      elapsed += dt;
      if (elapsed >= DURATION) goTo(current + 1);
    }
    bar.style.width = `${(elapsed / DURATION) * 100}%`;
    requestAnimationFrame(tick);
  }
  goTo(0);
  requestAnimationFrame(tick);

  // Swipe
  let startX = null;
  hero.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") startX = e.clientX; });
  hero.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
    startX = null;
  });
  hero.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") goTo(current + 1);
    if (e.key === "ArrowLeft") goTo(current - 1);
  });

  /* ---------- Film ---------- */
  const film = $("#film");
  const video = $("#filmVideo");
  $("#filmOpen").addEventListener("click", () => {
    openLayer(film);
    $(".film__box .icon-btn").focus();
    video.play().catch(() => {});
  });
  film.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { video.pause(); closeLayer(film); }
  });

  /* ---------- Product cards ---------- */
  function cardHTML(p, i = 0) {
    const sw = p.variants.length > 1 ? p.variants : [];
    const shown = sw.slice(0, 5);
    return `<article class="card" style="--i:${i}" data-id="${p.id}">
      <div class="card__media">
        <a class="card__link" href="${p.link}" target="_blank" rel="noopener" aria-label="${esc(`${p.name}, ${p.colour} — view on ksicsilk.com`)}">
          <img src="${p.img}" alt="${esc(`${p.name} in ${p.colour}`)}" loading="lazy"></a>
        ${p.price > 100000 ? '<span class="card__tag">Heirloom</span>' : ""}
        <button class="icon-btn card__wish" data-wish="${p.id}" aria-pressed="${wish.has(p.id)}" aria-label="Save ${esc(p.name)} to wishlist">
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button>
        <button class="card__add" data-add="${p.id}" data-v="-1">Add to bag</button>
      </div>
      <div class="card__body">
        <a class="card__name" href="${p.link}" target="_blank" rel="noopener">${esc(p.name)}</a>
        <span class="card__meta" data-colour>${esc(p.colour)} · ${esc(p.code)}</span>
        <div class="card__price">${inr.format(p.price)}</div>
        ${shown.length ? `<div class="swatches">${shown.map((v, n) =>
          `<button class="swatch" style="--c:${v.swatch}" data-swatch="${n}" aria-pressed="false" aria-label="${esc(v.label)}" title="${esc(v.label)}"></button>`).join("")}
          ${sw.length > shown.length ? `<small>+${sw.length - shown.length}</small>` : ""}</div>` : ""}
      </div>
    </article>`;
  }

  // Shared handler for every product card on the page (trending rail + search results).
  document.addEventListener("click", (e) => {
    const wishBtn = e.target.closest("[data-wish]");
    if (wishBtn) { toggleWish(wishBtn.dataset.wish); return; }
    const add = e.target.closest("[data-add]");
    if (add) { addToBag(add.dataset.add, Number(add.dataset.v)); return; }
    const sw = e.target.closest("[data-swatch]");
    if (sw) {
      const card = sw.closest(".card");
      const p = byId[card.dataset.id];
      const v = Number(sw.dataset.swatch);
      const vv = p.variants[v];
      const img = $(".card__media img", card);
      img.classList.add("is-swapping");
      const next = new Image();
      next.onload = () => { img.src = vv.img; img.classList.remove("is-swapping"); };
      next.src = vv.img;
      $$("[data-swatch]", card).forEach((b) => b.setAttribute("aria-pressed", b === sw));
      $("[data-colour]", card).textContent = `${vv.label} · ${p.code}`;
      $(".card__link", card).href = vv.link;
      $("[data-add]", card).dataset.v = v;
    }
  });

  /* ---------- Trending ---------- */
  const trendTrack = $("#trendTrack");
  const FEATURED_ORDER = ["saree-84", "kurta", "saree-62", "shirt", "saree-48", "giftbox", "saree-47", "tie"];
  const ordered = [...FEATURED_ORDER.map((id) => byId[id]).filter(Boolean), ...CATALOG.filter((p) => !FEATURED_ORDER.includes(p.id))];
  let activeTab = "all";
  let activeTone = null;

  function renderTrending() {
    let list = activeTab === "all" ? ordered : ordered.filter((p) => p.category === activeTab);
    if (activeTone) list = list.filter((p) => p.tone === activeTone);
    trendTrack.innerHTML = list.length ? list.map(cardHTML).join("") : `<p class="empty">No pieces in this edit yet.</p>`;
    trendTrack.scrollLeft = 0;
    $$("#tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === activeTab));
    const note = $("#filterNote");
    note.hidden = !activeTone;
    if (activeTone) note.innerHTML = `Showing ${list.length} sarees in <strong>${TONES[activeTone].name}</strong> <button type="button" id="clearTone">Clear</button>`;
    updateRailButtons(trendTrack);
  }
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    activeTab = b.dataset.tab;
    activeTone = null;
    renderTrending();
  });
  $("#filterNote").addEventListener("click", (e) => {
    if (e.target.id === "clearTone") { activeTone = null; renderTrending(); }
  });

  // Any link with data-filter jumps to the trending rail with that filter applied.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-filter]");
    if (!a) return;
    activeTab = a.dataset.filter;
    activeTone = null;
    renderTrending();
    if (a.closest("#drawer")) closeLayer(drawer);
  });

  /* ---------- Rails (shared prev/next) ---------- */
  function updateRailButtons(track) {
    const max = track.scrollWidth - track.clientWidth - 2;
    $$(`[data-rail="${track.id}"]`).forEach((b) => {
      b.disabled = Number(b.dataset.dir) < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max;
    });
  }
  $$("[data-rail]").forEach((b) => b.addEventListener("click", () => {
    const track = document.getElementById(b.dataset.rail);
    const step = track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 16 : track.clientWidth;
    track.scrollBy({ left: step * Number(b.dataset.dir), behavior: reduceMotion ? "auto" : "smooth" });
  }));
  ["trendTrack", "lookTrack"].forEach((id) => {
    const t = document.getElementById(id);
    t.addEventListener("scroll", () => updateRailButtons(t), { passive: true });
  });
  addEventListener("resize", () => ["trendTrack", "lookTrack"].forEach((id) => updateRailButtons(document.getElementById(id))));

  /* ---------- Featured carousel ---------- */
  const featIds = ["saree-47", "saree-62", "saree-84", "saree-48"].filter((id) => byId[id]);
  const featStage = $("#featStage");
  let featIndex = 0;
  featStage.innerHTML = featIds.map((id, n) =>
    `<img src="${byId[id].img}" alt="${esc(`${byId[id].name} in ${byId[id].colour}`)}" class="${n === 0 ? "is-active" : ""}" loading="lazy">`).join("");
  $("#featTotal").textContent = String(featIds.length).padStart(2, "0");
  function showFeat(i) {
    const imgs = $$("img", featStage);
    const prev = imgs[featIndex];
    featIndex = (i + featIds.length) % featIds.length;
    imgs.forEach((im) => im.classList.remove("is-leaving"));
    if (prev !== imgs[featIndex]) { prev.classList.remove("is-active"); prev.classList.add("is-leaving"); }
    imgs[featIndex].classList.add("is-active");
    const p = byId[featIds[featIndex]];
    $("#featIndex").textContent = String(featIndex + 1).padStart(2, "0");
    $("#featInfo").innerHTML = `<strong>${esc(p.colour)}</strong><span>${esc(p.code)} · ${inr.format(p.price)}</span>`;
  }
  $("#featPrev").addEventListener("click", () => showFeat(featIndex - 1));
  $("#featNext").addEventListener("click", () => showFeat(featIndex + 1));
  showFeat(0);
  setInterval(() => {
    const r = featStage.getBoundingClientRect();
    if (!reduceMotion && !document.hidden && r.top < innerHeight && r.bottom > 0 && !featStage.parentElement.matches(":hover")) showFeat(featIndex + 1);
  }, 5000);

  /* ---------- Colour stories (lookbook) ---------- */
  const lookTrack = $("#lookTrack");
  lookTrack.innerHTML = Object.entries(TONES).map(([key, t], n) => {
    const sarees = CATALOG.filter((p) => p.tone === key);
    const pool = [...new Set(sarees.flatMap((p) => [p.img, ...p.variants.map((v) => v.img)]))];
    const pick = pool.length >= 3 ? [pool[1], pool[0], pool[2]] : pool;
    return `<button class="tile" data-tone="${key}">
      <div class="tile__art" style="--a:${t.a};--b:${t.b}">${pick.map((src) => `<img src="${src}" alt="" loading="lazy">`).join("")}</div>
      <div class="tile__cap"><span>${String(n + 1).padStart(2, "0")}</span>${t.name}<em>${sarees.length} sarees · from ${inr.format(Math.min(...sarees.map((p) => p.price)))}</em></div>
    </button>`;
  }).join("");
  lookTrack.addEventListener("click", (e) => {
    const tile = e.target.closest("[data-tone]");
    if (!tile) return;
    activeTab = "sarees";
    activeTone = tile.dataset.tone;
    renderTrending();
    $("#trending").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* ---------- Shop the look ---------- */
  // left/height are % of the stage; hot is the hotspot position as % of each piece.
  const LOOKS = [
    {
      kicker: "Look 01 · Dasara pair", title: "Complete<br>the look",
      text: "Ivory and gold for her, wine silk for him — a festive pair made for Dasara evenings, finished with a boxed silk gift.",
      pieces: [
        { id: "saree-47", v: -1, left: 8, height: 90, hot: [52, 60] },
        { id: "kurta", v: 0, left: 44, height: 72, hot: [50, 40] },
        { id: "giftbox", v: 0, left: 70, height: 30, hot: [50, 50] },
      ],
    },
    {
      kicker: "Look 02 · Wedding guest", title: "The modern<br>uniform",
      text: "A charcoal silk shirt with a navy-and-gold tie — easy pure silk for every wedding on the calendar.",
      pieces: [
        { id: "shirt", v: 2, left: 12, height: 76, hot: [50, 45] },
        { id: "tie", v: 3, left: 56, height: 82, hot: [50, 35] },
        { id: "giftbox", v: 1, left: 68, height: 30, hot: [50, 50] },
      ],
    },
    {
      kicker: "Look 03 · The trousseau", title: "Heirloom<br>trio",
      text: "Three sarees to begin a lifetime of occasions: bottle-green zari checks, the Gandaberunda navy and rani-pink brocade.",
      pieces: [
        { id: "saree-62", v: -1, left: 4, height: 88, hot: [50, 62] },
        { id: "saree-84", v: -1, left: 34, height: 92, hot: [50, 58] },
        { id: "saree-48", v: -1, left: 64, height: 88, hot: [50, 62] },
      ],
    },
  ].map((l) => ({ ...l, pieces: l.pieces.filter((pc) => byId[pc.id]) }));
  let lookIndex = 0;

  function renderLook() {
    const look = LOOKS[lookIndex];
    $("#stlKicker").textContent = look.kicker;
    $("#stlTitle").innerHTML = look.title;
    $("#stlText").textContent = look.text;
    $("#stlTotal").textContent = inr.format(look.pieces.reduce((s, pc) => s + byId[pc.id].price, 0));
    $("#stlList").innerHTML = look.pieces.map((pc, n) => {
      const p = byId[pc.id];
      return `<li class="stl__item" style="--i:${n}" data-piece="${n}">
        <div class="stl__thumb"><img src="${imgOf(p, pc.v)}" alt="" loading="lazy"></div>
        <p>${esc(p.name)}<span>${esc(labelOf(p, pc.v))}</span>${inr.format(p.price)}</p></li>`;
    }).join("");
    $("#stlStage").innerHTML = look.pieces.map((pc, n) => {
      const p = byId[pc.id];
      return `<div class="stl__piece" style="--i:${n};left:${pc.left}%;height:${pc.height}%;z-index:${n === 2 ? 3 : 1}">
        <img src="${imgOf(p, pc.v)}" alt="${esc(`${p.name}, ${labelOf(p, pc.v)}`)}">
        <button class="hotspot" data-piece="${n}" style="left:${pc.hot[0]}%;top:${pc.hot[1]}%" aria-label="Add ${esc(p.name)} to bag">+
          <span class="hotspot__tip">${esc(p.name)} · ${inr.format(p.price)}</span></button>
      </div>`;
    }).join("");
  }
  function hot(n, on) {
    $$(`#look [data-piece="${n}"]`).forEach((el) => el.classList.toggle("is-hot", on));
  }
  $("#look").addEventListener("mouseover", (e) => { const el = e.target.closest("[data-piece]"); if (el) hot(el.dataset.piece, true); });
  $("#look").addEventListener("mouseout", (e) => { const el = e.target.closest("[data-piece]"); if (el) hot(el.dataset.piece, false); });
  $("#look").addEventListener("click", (e) => {
    const el = e.target.closest(".hotspot, .stl__item");
    if (!el) return;
    const pc = LOOKS[lookIndex].pieces[el.dataset.piece];
    addToBag(pc.id, pc.v);
  });
  $("#lookPrev").addEventListener("click", () => { lookIndex = (lookIndex - 1 + LOOKS.length) % LOOKS.length; renderLook(); });
  $("#lookNext").addEventListener("click", () => { lookIndex = (lookIndex + 1) % LOOKS.length; renderLook(); });
  $("#stlAdd").addEventListener("click", () => {
    LOOKS[lookIndex].pieces.forEach((pc) => addToBag(pc.id, pc.v, 1, true));
    toast(`${LOOKS[lookIndex].pieces.length} pieces added to bag`, { label: "View bag", run: () => openDrawer("bag") });
  });

  /* ---------- Craft ---------- */
  const craftItems = $$("#craftList li");
  const craftImg = $("#craftImg");
  let craftIndex = 0;
  let craftAuto = true;
  function setCraft(i) {
    if (i === craftIndex) return;
    craftIndex = i;
    craftItems.forEach((li, n) => li.classList.toggle("is-active", n === i));
    const li = craftItems[i];
    craftImg.classList.add("is-fading");
    const next = new Image();
    next.onload = () => {
      setTimeout(() => {
        craftImg.src = li.dataset.img;
        craftImg.alt = $("p", li).textContent;
        craftImg.classList.toggle("is-contain", li.dataset.fit === "contain");
        craftImg.classList.remove("is-fading");
      }, 220);
    };
    next.src = li.dataset.img;
  }
  craftItems.forEach((li, n) => {
    li.tabIndex = 0;
    li.addEventListener("mouseenter", () => { craftAuto = false; setCraft(n); });
    li.addEventListener("click", () => { craftAuto = false; setCraft(n); });
    li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); craftAuto = false; setCraft(n); } });
  });
  setInterval(() => {
    const r = $("#craft").getBoundingClientRect();
    if (craftAuto && !reduceMotion && !document.hidden && r.top < innerHeight * .7 && r.bottom > innerHeight * .3) setCraft((craftIndex + 1) % craftItems.length);
  }, 3800);

  /* ---------- Search ---------- */
  const search = $("#search");
  const sInput = $("#searchInput");
  const CHIPS = ["Saree", "Kurta", "Tie", "Gift box", "Pink", "Navy", "Green", "Ivory", "Checks"];
  $("#searchChips").innerHTML = CHIPS.map((c) => `<button type="button">${c}</button>`).join("");
  function runSearch() {
    const q = sInput.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const list = !terms.length ? ordered.slice(0, 8) : CATALOG.filter((p) => {
      const hay = [p.name, p.colour, p.code, CATEGORY_LABEL[p.category], p.tone && TONES[p.tone]?.name, ...p.variants.map((v) => v.label)].join(" ").toLowerCase();
      return terms.every((t) => hay.includes(t.replace(/s$/, "")));
    });
    $("#searchResults").innerHTML = list.length ? list.map(cardHTML).join("")
      : `<p class="empty">Nothing matches “${esc(q)}”. Try a colour like “red” or a piece like “kurta”.</p>`;
  }
  $("#searchOpen").addEventListener("click", () => { openLayer(search); runSearch(); sInput.focus(); });
  sInput.addEventListener("input", runSearch);
  $("#searchChips").addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") { sInput.value = e.target.textContent; runSearch(); sInput.focus(); }
  });
  search.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target === search) closeLayer(search); });

  /* ---------- Global keys ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!film.hidden) { video.pause(); closeLayer(film); }
      else if (!search.hidden) closeLayer(search);
      else if (!drawer.hidden) closeLayer(drawer);
      else if (!mnav.hidden) closeLayer(mnav);
      else setDrop(false);
    }
    if (e.key === "/" && search.hidden && !/input|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault(); $("#searchOpen").click();
    }
  });

  /* ---------- Newsletter ---------- */
  $("#newsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#newsEmail");
    const msg = $("#newsMsg");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) {
      msg.textContent = "Please enter a valid email address.";
      input.focus();
      return;
    }
    msg.textContent = "Thank you — you're on the list for our next weaves.";
    input.value = "";
  });

  /* ---------- Reveal on scroll ---------- */
  const io = "IntersectionObserver" in window && new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  $$("[data-reveal]").forEach((el, n) => {
    el.style.transitionDelay = `${(n % 3) * 90}ms`;
    io ? io.observe(el) : el.classList.add("is-in");
  });

  $("#year").textContent = new Date().getFullYear();
  renderTrending();
  renderLook();
  renderCounts();
  onScroll();
})();

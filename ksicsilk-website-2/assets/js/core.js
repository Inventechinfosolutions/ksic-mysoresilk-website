/* KSIC Mysore Silk — shared storefront code.
   Renders the header/footer on every page, loads catalogue data, and owns the
   bag, wishlist and recently-viewed state (localStorage). */

(() => {
  "use strict";

  const API = { products: "data/products.json", showrooms: "data/showrooms.json" };

  /* ------------------------------------------------------------ helpers */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const money = (n) => inr.format(n);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const params = () => new URLSearchParams(location.search);

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    silk: '<path d="M4 18c3-8 13-8 16 0"/><path d="M6 14c2-5 10-5 12 0"/><path d="M8 10c1.5-3 6.5-3 8 0"/>',
    zari: '<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5Z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z"/>',
    store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a3 3 0 0 1-5.3 2 3 3 0 0 1-5.4 0A3 3 0 0 1 4 11V9Z"/><path d="M5 13v8h14v-8"/>',
    flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-4 3.5-6 4.5-10 2.5 2 3 4 3 6 1-1 1.5-2 1.5-3 2 1.5 4 4.5 4 7 0 3.4-2.5 6-6.5 6Z"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
    iron: '<path d="M3 17h16a2 2 0 0 0 2-2c0-4-3-7-8-7H8"/><path d="M3 17l2-6h8"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 4 9-4M12 11v10"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M12 8S10 3 7.5 4 9 8 12 8Zm0 0s2-5 4.5-4S15 8 12 8Z"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
    fb: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  };
  const icon = (name, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  /* -------------------------------------------------------------- store */
  const ls = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
  };

  /* --------------------------------------------------------------- data */
  let productsPromise;
  function loadProducts() {
    productsPromise ||= fetch(API.products)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => {
        const list = d.products;
        list.byId = new Map(list.map((p) => [p.id, p]));
        return list;
      });
    return productsPromise;
  }
  const loadShowrooms = () => fetch(API.showrooms).then((r) => r.json());

  const TYPE_LABEL = {
    crepe: "Mysore Silk Saree", georgette: "Silk Georgette Saree", kurta: "Silk Kurta",
    shirt: "Silk Shirt", tie: "Silk Tie", "gift-set": "Tie & Pocket Square Set",
  };
  const TYPE_PLURAL = {
    crepe: "Crepe Silk Sarees", georgette: "Georgette Sarees", kurta: "Silk Kurtas",
    shirt: "Silk Shirts", tie: "Silk Ties", "gift-set": "Gift Sets",
  };
  const FAMILY = {
    red: "#c8102e", maroon: "#7a1a2b", pink: "#e0337a", orange: "#ea5a10", yellow: "#e2b007", green: "#2f7d4f",
    blue: "#2a3fd6", purple: "#5b1f8f", black: "#1d1710", grey: "#7a7f86", white: "#efe7d6",
  };
  const title = (p) => `${p.color} ${TYPE_LABEL[p.type]}`;
  const subtitle = (p) => (p.article ? `Article ${p.article}` : p.gender === "men" ? "Menswear" : "Pure silk");
  const productUrl = (p, designId) => `product.html?id=${p.id}${designId ? `&design=${designId}` : ""}`;

  /* --------------------------------------------------------- bag + wish */
  const bag = {
    items: () => ls.get("ksic.bag", []),
    save(items) { ls.set("ksic.bag", items); updateCounts(true); },
    count: () => bag.items().reduce((n, l) => n + l.qty, 0),
    add(p, design, qty = 1) {
      const items = bag.items();
      const key = `${p.id}:${design?.id ?? 0}`;
      const line = items.find((l) => l.key === key);
      if (line) line.qty = Math.min(10, line.qty + qty);
      else items.push({ key, id: p.id, design: design?.id ?? null, code: design?.code ?? null, qty });
      bag.save(items);
      toast({ img: design?.image || p.image, title: "Added to your bag", text: title(p) + (design ? ` · Design ${design.code}` : ""), links: [["View bag", "cart.html"]] });
    },
    setQty(key, qty) {
      let items = bag.items();
      const line = items.find((l) => l.key === key);
      if (!line) return;
      line.qty = Math.max(0, Math.min(10, qty));
      if (!line.qty) items = items.filter((l) => l.key !== key);
      bag.save(items);
    },
    remove(key) { bag.save(bag.items().filter((l) => l.key !== key)); },
  };
  const wish = {
    ids: () => new Set(ls.get("ksic.wish", [])),
    has: (id) => wish.ids().has(Number(id)),
    toggle(p) {
      const ids = wish.ids();
      const on = !ids.has(p.id);
      on ? ids.add(p.id) : ids.delete(p.id);
      ls.set("ksic.wish", [...ids]);
      updateCounts(true);
      $$(`[data-wish="${p.id}"]`).forEach((b) => { b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); });
      toast(on
        ? { img: p.image, title: "Saved to wishlist", text: title(p), links: [["View wishlist", "wishlist.html"]] }
        : { text: "Removed from wishlist" });
      document.dispatchEvent(new CustomEvent("ksic:wish"));
      return on;
    },
  };
  const recent = {
    ids: () => ls.get("ksic.recent", []),
    push(id) { ls.set("ksic.recent", [id, ...recent.ids().filter((x) => x !== id)].slice(0, 8)); },
  };

  function updateCounts(bump = false) {
    [["#bagCount", bag.count()], ["#wishCount", wish.ids().size]].forEach(([sel, n]) => {
      const el = $(sel);
      if (!el) return;
      const changed = el.textContent !== String(n);
      el.textContent = n;
      el.classList.toggle("has", n > 0);
      if (bump && changed) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    });
  }

  /* -------------------------------------------------------------- toast */
  let toastTimer;
  function toast({ img, title: t, text, links = [] }) {
    let el = $("#toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.classList.toggle("is-text", !img);
    el.innerHTML = `${img ? `<img src="${img}" alt="">` : ""}<div><p>${t ? `<strong>${esc(t)}</strong>` : ""}${esc(text)}</p>${links.length ? `<div class="toast__links">${links.map(([l, h]) => `<a href="${h}">${esc(l)}</a>`).join("")}</div>` : ""}</div>`;
    requestAnimationFrame(() => el.classList.add("is-on"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 3200);
  }

  /* --------------------------------------------------------------- card */
  function card(p, i = 0) {
    const alt = p.designs.find((d) => d.image !== p.image)?.image;
    const tag = p.tag ? `<span class="badge${p.tag === "Heirloom" ? " badge--gold" : ""}">${esc(p.tag)}</span>` : "";
    return `
      <article class="pcard reveal" style="--d:${(i % 4) * 0.06}s">
        <div class="pcard__media${alt ? " has-alt" : ""}">
          <a href="${productUrl(p)}" aria-label="${esc(title(p))}" style="position:absolute;inset:0">
            <img class="main" src="${p.image}" alt="${esc(title(p))}" loading="lazy" decoding="async">
            ${alt ? `<img class="alt" src="${alt}" alt="" loading="lazy" decoding="async">` : ""}
          </a>
          ${tag}
          <button class="wish${wish.has(p.id) ? " is-on" : ""}" data-wish="${p.id}" aria-label="Save to wishlist" aria-pressed="${wish.has(p.id)}">${icon("heart")}</button>
          <button class="pcard__add" data-add="${p.id}">${icon("bag")}Add to bag</button>
        </div>
        <div class="pcard__body">
          <span class="pcard__cat">${esc(subtitle(p))}</span>
          <h3 class="pcard__name"><a href="${productUrl(p)}">${esc(title(p))}</a></h3>
          <div class="pcard__row">
            <span class="price">${money(p.price)}</span>
            ${p.designs.length > 1 ? `<span class="pcard__designs">${p.designs.length} designs</span>` : `<span class="dot" style="background:${p.swatch}" title="${esc(p.color)}"></span>`}
          </div>
        </div>
      </article>`;
  }
  const skeleton = (n = 8) => Array.from({ length: n }, () => `<div class="pcard skel"><div class="pcard__media"></div><div class="pcard__body"><span style="width:40%"></span><span style="width:80%"></span><span style="width:30%"></span></div></div>`).join("");

  /* ------------------------------------------------------------- reveal */
  // Two systems: `.reveal` (single element fades up) and `[data-anim="name"]`
  // (a container whose children play a section-specific entrance, see style.css).
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced && "IntersectionObserver" in window) document.documentElement.classList.add("anim-ready");
  const watched = new WeakSet();
  const io = "IntersectionObserver" in window && !reduced
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        enter(e.target);
        io.unobserve(e.target);
      }), { rootMargin: "0px 0px -12% 0px", threshold: 0.05 })
    : null;

  function enter(el) {
    el.classList.add("is-in");
    $$("[data-count]", el).forEach(countUp);
    settle(el);
  }
  // once an entrance has played, drop its styles so normal hover transitions apply
  function settle(el) {
    if (!el.dataset.anim) return;
    clearTimeout(el._settle);
    el._settle = setTimeout(() => { el.dataset.animDone = el.dataset.anim; delete el.dataset.anim; }, 3200);
  }
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    const end = Number(el.dataset.count);
    const start = Number(el.dataset.from || 0);
    const t0 = performance.now();
    const dur = 1600;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(start + (end - start) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  // give each child its stagger index (--i) and a random seed (--r)
  function index(c) {
    c.classList.remove("reveal");
    [...c.children].forEach((ch, i) => {
      ch.classList.remove("reveal");
      ch.style.setProperty("--i", i);
      if (!ch.style.getPropertyValue("--r")) ch.style.setProperty("--r", Math.random().toFixed(2));
    });
  }
  function reveal(root = document) {
    const containers = $$("[data-anim]", root);
    if (root !== document && root.matches?.("[data-anim]")) containers.unshift(root);
    containers.forEach((c) => {
      index(c);
      if (watched.has(c)) return;
      watched.add(c);
      io ? io.observe(c) : enter(c);
    });
    $$(".reveal:not(.is-in)", root).forEach((el) => (io ? io.observe(el) : el.classList.add("is-in")));
  }
  // re-run a container's entrance after its children are replaced (tabs, pagination)
  function replay(c) {
    clearTimeout(c._settle);
    if (c.dataset.animDone) { c.dataset.anim = c.dataset.animDone; delete c.dataset.animDone; }
    index(c);
    if (!watched.has(c) || !c.classList.contains("is-in")) return reveal(c);
    c.classList.remove("is-in");
    void c.offsetWidth;
    requestAnimationFrame(() => { c.classList.add("is-in"); settle(c); });
  }

  /* ---------------------------------------------------------- preloader */
  function preloader() {
    if (!("preload" in document.body.dataset) || reduced) return;
    const petals = Array.from({ length: 8 }, (_, i) => `<use href="#plPetal" transform="rotate(${i * 45} 50 50)"/>`).join("");
    const el = document.createElement("div");
    el.className = "preloader";
    el.innerHTML = `
      <div class="pl__panel pl__panel--top"></div><div class="pl__panel pl__panel--bot"></div>
      <div class="pl__center">
        <svg class="pl__mandala" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="plGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6200"/><stop offset=".45" stop-color="#fbe7a6"/><stop offset="1" stop-color="#d4a017"/></linearGradient>
            <path id="plPetal" pathLength="1" d="M50 50C44 38 44 22 50 9C56 22 56 38 50 50Z"/>
          </defs>
          <circle cx="50" cy="50" r="47" pathLength="1"/><circle cx="50" cy="50" r="40" pathLength="1"/>
          <g>${petals}</g><circle cx="50" cy="50" r="7" pathLength="1"/>
        </svg>
        <img src="assets/images/web/site/logo.png" alt="KSIC Mysore Silk" class="pl__logo">
        <p class="pl__kn" lang="kn">ಮೈಸೂರು ರೇಷ್ಮೆ · Since 1912</p>
        <div class="pl__bar"><i></i></div>
      </div>`;
    document.body.prepend(el);
    document.body.classList.add("is-preloading");
    const minTime = new Promise((r) => setTimeout(r, 1700));
    const loaded = new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r, { once: true })));
    const cap = new Promise((r) => setTimeout(r, 3800));
    Promise.race([Promise.all([minTime, loaded]), cap]).then(() => {
      el.classList.add("is-done");
      setTimeout(() => document.body.classList.remove("is-preloading"), 450);
      setTimeout(() => el.remove(), 1500);
    });
  }

  /* ---------------------------------------------------- scroll progress */
  function progressBar() {
    const bar = document.createElement("div");
    bar.className = "scroll-thread";
    document.body.appendChild(bar);
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
  }

  /* ------------------------------------------------------- header/footer */
  const NAV = [
    { label: "Home", href: "index.html", page: "home" },
    { label: "Sarees", href: "shop.html?cat=sarees", page: "shop:sarees", mega: "sarees" },
    { label: "Menswear", href: "shop.html?cat=menswear", page: "shop:menswear", mega: "menswear" },
    { label: "Gifting", href: "shop.html?cat=gifting", page: "shop:gifting" },
    { label: "Shop by Price", href: "shop.html?cat=all", page: "shop:all", drop: "price" },
    { label: "Showrooms", href: "showrooms.html", page: "showrooms" },
    { label: "RTI", page: "rti", drop: "rti" },
  ];
  // price bands mirror the "Categories" menu on ksicsilk.com
  const PRICE_MENU = [
    ["Womens", "shop.html?cat=sarees"],
    ["Mens", "shop.html?cat=menswear"],
    null,
    ["0 – 15,000 INR", "shop.html?cat=all&price=0to15"],
    ["15,001 – 30,000 INR", "shop.html?cat=all&price=15to30"],
    ["30,001 – 40,000 INR", "shop.html?cat=all&price=30to40"],
    ["Above 40,001 INR", "shop.html?cat=all&price=above40"],
    null,
    ["Show all", "shop.html?cat=all"],
  ];
  const RTI_MENU = [
    ["Board of Directors", "https://www.ksicsilk.com/Home/bod"],
    ["Organisational Chart", "https://www.ksicsilk.com/Home/oc"],
    ["Shareholders", "https://www.ksicsilk.com/Home/sh"],
    ["Act Info – Kannada", "https://clusterzap1.blob.core.windows.net/czap/17_ltmnkb/KsicsilFiles/rtiinfo_x5didwq4.pdf", "PDF"],
    ["Act Info – English", "https://clusterzap1.blob.core.windows.net/czap/17_ltmnkb/KsicsilFiles/rtiinformation41a_boimbqg6.pdf", "PDF"],
  ];
  const dropHTML = (items) => `<div class="dropdown">${items.map((it) => it
    ? `<a href="${it[1]}"${/^https?:/.test(it[1]) ? ' target="_blank" rel="noopener"' : ""}>${it[0]}${it[2] ? `<small>${it[2]}</small>` : ""}</a>`
    : "<hr>").join("")}</div>`;
  const SAREE_COLORS = ["red", "pink", "blue", "green", "purple", "orange", "white", "black"];

  function currentPage() {
    const page = document.body.dataset.page;
    return page === "shop" ? `shop:${params().get("cat") || "all"}` : page;
  }

  function megaHTML(kind) {
    if (kind === "sarees") {
      return `<div class="mega"><div class="container mega__in">
        <div class="mega__col"><h5>By Weave</h5>
          <a href="shop.html?cat=sarees&type=crepe">Mysore Crepe Silk</a>
          <a href="shop.html?cat=sarees&type=georgette">Pure Silk Georgette</a>
          <a href="shop.html?cat=sarees&sort=new">New Arrivals</a>
          <a href="shop.html?cat=sarees">All Sarees</a></div>
        <div class="mega__col"><h5>By Price</h5>
          <a href="shop.html?cat=sarees&price=15to30">₹15,001 – ₹30,000</a>
          <a href="shop.html?cat=sarees&price=30to40">₹30,001 – ₹40,000</a>
          <a href="shop.html?cat=sarees&price=above40">Above ₹40,000</a>
          <a href="shop.html?cat=sarees&price=above100">Heirloom · above ₹1,00,000</a></div>
        <div class="mega__col"><h5>By Colour</h5><div class="mega__colors">
          ${SAREE_COLORS.map((c) => `<a href="shop.html?cat=sarees&color=${c}"><span class="dot" style="background:${FAMILY[c]}"></span>${c}</a>`).join("")}</div></div>
        <div class="mega__promo">
          <a class="promo-tile" href="product.html?id=84"><img src="assets/images/web/products/84-550-6-gandaberunda.webp" alt="" loading="lazy"><span>The Gandaberunda Saree</span></a>
          <a class="promo-tile" href="shop.html?cat=sarees&price=above100"><img src="assets/images/web/products/62-550-8k8-uni.webp" alt="" loading="lazy"><span>Heirloom Weaves</span></a>
        </div></div></div>`;
    }
    return `<div class="mega"><div class="container mega__in">
      <div class="mega__col"><h5>Clothing</h5>
        <a href="shop.html?cat=menswear&type=kurta">Silk Kurtas</a>
        <a href="shop.html?cat=menswear&type=shirt">Silk Shirts</a></div>
      <div class="mega__col"><h5>Accessories</h5>
        <a href="shop.html?cat=menswear&type=tie">Silk Ties</a>
        <a href="shop.html?cat=menswear&type=gift-set">Tie &amp; Pocket Square Sets</a></div>
      <div class="mega__col"><h5>Shop</h5>
        <a href="shop.html?cat=menswear">All Menswear</a>
        <a href="shop.html?cat=gifting">Gifting</a></div>
      <div class="mega__promo">
        <a class="promo-tile" href="shop.html?cat=menswear&type=kurta"><img src="assets/images/web/products/72-silk-kurta.webp" alt="" loading="lazy"><span>Silk Kurtas</span></a>
        <a class="promo-tile" href="shop.html?cat=gifting"><img src="assets/images/web/products/78-tie-pocket-sq-gift-set-box.webp" alt="" loading="lazy"><span>Gift Sets</span></a>
      </div></div></div>`;
  }

  function renderHeader() {
    const mount = $("#site-header");
    if (!mount) return;
    const cur = currentPage();
    const q = params().get("q") || "";
    mount.outerHTML = `
      <div class="topbar">
        <div class="container topbar__in">
          <div class="topbar__msgs" aria-live="off">
            <span class="is-on"><b>✦</b>100% pure Mysore silk with pure gold zari</span>
            <span><b>✦</b>A Government of Karnataka enterprise since 1912</span>
            <span><b>✦</b>GI-certified heritage weave · 15 showrooms across South India</span>
          </div>
          <div class="topbar__links">
            <a href="showrooms.html">Find a showroom</a>
            <a href="tel:+918025586402">+91 80 2558 6402</a>
            <a href="mailto:info@ksicsilk.com">info@ksicsilk.com</a>
          </div>
        </div>
      </div>
      <header class="header" id="header">
        <div class="container header__main">
          <button class="icon-btn header__burger" id="burger" aria-label="Open menu">${icon("menu")}</button>
          <a href="index.html" class="logo" aria-label="KSIC Mysore Silk home"><img src="assets/images/web/site/logo.png" alt="KSIC Mysore Silk" width="210" height="77"></a>
          <form class="search" id="searchForm" action="shop.html" role="search">
            <div class="search__field">
              <input type="search" name="q" id="searchInput" value="${esc(q)}" placeholder="Search sarees, colours, article no…" autocomplete="off" aria-label="Search products">
              <button type="submit" aria-label="Search">${icon("search")}</button>
            </div>
            <div class="suggest" id="suggest" role="listbox"></div>
          </form>
          <div class="actions">
            <a class="act act--account" href="https://www.ksicsilk.com/Identity/Account/Login" target="_blank" rel="noopener">${icon("user")}<span class="lbl">Account</span></a>
            <a class="act" href="wishlist.html">${icon("heart")}<span class="lbl">Wishlist</span><span class="count" id="wishCount">0</span></a>
            <a class="act" href="cart.html">${icon("bag")}<span class="lbl">Bag</span><span class="count" id="bagCount">0</span></a>
          </div>
        </div>
        <nav class="nav" aria-label="Main">
          <div class="container nav__in">
            ${NAV.map((n) => {
              const active = cur === n.page && !(n.drop === "price" && !params().get("price")) ? " is-active" : "";
              const caret = n.mega || n.drop ? icon("chev", "chev") : "";
              const link = n.href
                ? `<a class="nav__link${active}" href="${n.href}">${n.label}${caret}</a>`
                : `<button class="nav__link" aria-haspopup="true">${n.label}${caret}</button>`;
              const panel = n.mega ? megaHTML(n.mega) : n.drop ? dropHTML(n.drop === "rti" ? RTI_MENU : PRICE_MENU) : "";
              return `<div class="nav__item${n.drop ? " nav__item--drop" : ""}">${link}${panel}</div>`;
            }).join("")}
          </div>
        </nav>
      </header>
      <div class="drawer-nav" id="drawerNav" aria-hidden="true">
        <div class="drawer-nav__scrim" data-close-nav></div>
        <div class="drawer-nav__panel">
          <div class="drawer-nav__head"><img src="assets/images/web/site/logo.png" alt="KSIC Mysore Silk"><button class="icon-btn" data-close-nav aria-label="Close menu">${icon("close")}</button></div>
          <nav>
            <a href="index.html">Home</a>
            <details><summary>Sarees ${icon("chev", "chev")}</summary>
              <a href="shop.html?cat=sarees">All Sarees</a><a href="shop.html?cat=sarees&type=crepe">Mysore Crepe Silk</a><a href="shop.html?cat=sarees&type=georgette">Silk Georgette</a>
              <a href="shop.html?cat=sarees&price=above100">Heirloom · Above ₹1,00,000</a></details>
            <details><summary>Menswear ${icon("chev", "chev")}</summary>
              <a href="shop.html?cat=menswear">All Menswear</a><a href="shop.html?cat=menswear&type=kurta">Silk Kurtas</a><a href="shop.html?cat=menswear&type=shirt">Silk Shirts</a><a href="shop.html?cat=menswear&type=tie">Silk Ties</a></details>
            <a href="shop.html?cat=gifting">Gifting</a>
            <details><summary>Shop by Price ${icon("chev", "chev")}</summary>
              ${PRICE_MENU.filter(Boolean).map(([l, h]) => `<a href="${h}">${l}</a>`).join("")}</details>
            <a href="showrooms.html">Showrooms</a>
            <details><summary>RTI ${icon("chev", "chev")}</summary>
              ${RTI_MENU.map(([l, h]) => `<a href="${h}" target="_blank" rel="noopener">${l}</a>`).join("")}</details>
            <a href="wishlist.html">Wishlist</a>
            <a href="cart.html">Shopping Bag</a>
          </nav>
          <div class="drawer-nav__foot"><p lang="kn">ಮೈಸೂರು ರೇಷ್ಮೆ</p>+91 80 2558 6402<br>info@ksicsilk.com</div>
        </div>
      </div>`;
  }

  function renderFooter() {
    const mount = $("#site-footer");
    if (!mount) return;
    mount.outerHTML = `
      <section class="newsletter" data-anim="sheen">
        <div class="container newsletter__in">
          <div><h3>Be first to see new weaves</h3><p>New designs, festive collections and showroom events — no more than twice a month.</p></div>
          <form id="newsForm" novalidate>
            <label for="newsEmail" class="sr-only">Email address</label>
            <input type="email" id="newsEmail" placeholder="Your email address" autocomplete="email" required>
            <button class="btn btn--dark" type="submit">Subscribe</button>
          </form>
        </div>
      </section>
      <footer class="footer">
        <div class="container footer__top" data-anim="rise">
          <div class="footer__brand">
            <img src="assets/images/web/site/logo.png" alt="KSIC Mysore Silk">
            <p>Karnataka Silk Industries Corporation Ltd.<br>A Government of Karnataka enterprise.<br>3rd &amp; 4th Floor, Public Utility Building, M.G. Road, Bengaluru 560 001</p>
            <div class="socials"><a href="https://www.facebook.com/MysoreSilks/" target="_blank" rel="noopener" aria-label="Facebook">${icon("fb")}</a><a href="mailto:info@ksicsilk.com" aria-label="Email">${icon("mail")}</a></div>
          </div>
          <div><h4>Shop</h4>
            <a href="shop.html?cat=sarees">Silk Sarees</a><a href="shop.html?cat=sarees&price=above100">Heirloom Weaves</a><a href="shop.html?cat=menswear">Menswear</a><a href="shop.html?cat=gifting">Gifting</a><a href="shop.html?cat=all">Shop All</a></div>
          <div><h4>Help</h4>
            <a href="index.html#silk-care">Silk Care Guide</a><a href="index.html#silk-care">Identify Pure Silk</a><a href="showrooms.html">Store Locator</a><a href="cart.html">Shopping Bag</a><a href="wishlist.html">Wishlist</a></div>
          <div><h4>Company</h4>
            <a href="index.html#heritage">Our Heritage</a><a href="https://www.ksicsilk.com/Home/About" target="_blank" rel="noopener">About KSIC</a><a href="https://www.ksicsilk.com/Home/bod" target="_blank" rel="noopener">Board of Directors</a><a href="https://www.ksicsilk.com/Home/careers" target="_blank" rel="noopener">Careers</a></div>
          <div><h4>Contact</h4>
            <a href="tel:+918025586402">+91 80 2558 6402</a><a href="tel:+918025586550">+91 80 2558 6550</a><a href="mailto:info@ksicsilk.com">info@ksicsilk.com</a></div>
        </div>
        <div class="footer__bottom"><div class="container">
          <p>© ${new Date().getFullYear()} KSIC Silks. All rights reserved.</p>
          <p><a href="#">Privacy Policy</a> · <a href="#">Returns &amp; Exchanges</a> · <a href="#">Shipping</a> · <a href="#">Terms &amp; Conditions</a></p>
        </div></div>
      </footer>
      <button class="to-top" id="toTop" aria-label="Back to top">${icon("up")}</button>`;
  }

  /* ---------------------------------------------------------- behaviour */
  function bindHeader() {
    const header = $("#header");
    const toTop = $("#toTop");
    const onScroll = () => {
      header?.classList.toggle("is-stuck", scrollY > 60);
      toTop?.classList.toggle("is-on", scrollY > 700);
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toTop?.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

    // rotating topbar messages
    const msgs = $$(".topbar__msgs span");
    let mi = 0;
    if (msgs.length > 1) setInterval(() => {
      const prev = msgs[mi];
      mi = (mi + 1) % msgs.length;
      prev.classList.replace("is-on", "is-out");
      msgs[mi].classList.remove("is-out");
      msgs[mi].classList.add("is-on");
      setTimeout(() => prev.classList.remove("is-out"), 700);
    }, 4000);

    // mobile drawer
    const drawer = $("#drawerNav");
    const setDrawer = (open) => {
      drawer.classList.toggle("is-open", open);
      drawer.setAttribute("aria-hidden", !open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    $("#burger")?.addEventListener("click", () => setDrawer(true));
    $$("[data-close-nav]").forEach((b) => b.addEventListener("click", () => setDrawer(false)));

    // live search suggestions
    const input = $("#searchInput");
    const box = $("#suggest");
    let hl = -1;
    const close = () => { box.classList.remove("is-open"); hl = -1; };
    input?.addEventListener("input", async () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) return close();
      const list = await loadProducts();
      const hits = search(list, q);
      box.innerHTML = hits.length
        ? hits.slice(0, 5).map((p) => `<a href="${productUrl(p)}" role="option"><img src="${p.image}" alt=""><div><p>${esc(title(p))}</p><small>${esc(subtitle(p))}</small></div><strong>${money(p.price)}</strong></a>`).join("") +
          `<a class="suggest__all" href="shop.html?cat=all&q=${encodeURIComponent(q)}">See all ${hits.length} result${hits.length > 1 ? "s" : ""} for “${esc(q)}”</a>`
        : `<p class="suggest__none">No matches for “${esc(q)}”. Try a colour or article number.</p>`;
      box.classList.add("is-open");
      hl = -1;
    });
    input?.addEventListener("keydown", (e) => {
      const links = $$("a", box);
      if (!box.classList.contains("is-open") || !links.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        hl = (hl + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links.forEach((l, i) => l.classList.toggle("is-hl", i === hl));
      } else if (e.key === "Enter" && hl >= 0) {
        e.preventDefault();
        location.href = links[hl].href;
      } else if (e.key === "Escape") close();
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".search")) close(); });
    $("#searchForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      location.href = q ? `shop.html?cat=all&q=${encodeURIComponent(q)}` : "shop.html?cat=all";
    });

    // newsletter
    $("#newsForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const el = $("#newsEmail");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) { toast({ text: "Please enter a valid email address." }); el.focus(); return; }
      el.value = "";
      toast({ title: "You're subscribed", text: "Watch your inbox for new weaves." });
    });
  }

  function search(list, q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return list.filter((p) => {
      const hay = [title(p), p.color, p.family, p.article, p.type, p.category, TYPE_PLURAL[p.type], p.tag, ...p.designs.map((d) => d.code)].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }

  // delegated wishlist / add-to-bag buttons on any product card
  document.addEventListener("click", async (e) => {
    const w = e.target.closest("[data-wish]");
    const a = e.target.closest("[data-add]");
    if (!w && !a) return;
    e.preventDefault();
    const list = await loadProducts();
    const p = list.byId.get(Number((w || a).dataset.wish || (w || a).dataset.add));
    if (!p) return;
    if (w) wish.toggle(p);
    else bag.add(p, p.designs[0] || null);
  });
  addEventListener("storage", () => updateCounts());

  /* -------------------------------------------------------------- boot */
  preloader();
  renderHeader();
  renderFooter();
  bindHeader();
  updateCounts();
  progressBar();
  reveal();

  window.KSIC = {
    $, $$, esc, money, icon, params, loadProducts, loadShowrooms, card, skeleton, reveal, toast, search,
    title, subtitle, productUrl, bag, wish, recent, replay, TYPE_LABEL, TYPE_PLURAL, FAMILY, updateCounts,
  };
})();

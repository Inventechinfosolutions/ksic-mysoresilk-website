/* Shop / category listing: filters, sort and pagination, all reflected in the URL */
(async () => {
  "use strict";
  const { $, $$, esc, loadProducts, card, skeleton, reveal, search, TYPE_PLURAL, FAMILY, params } = window.KSIC;

  const PAGE_SIZE = 12;
  const CATS = {
    sarees: {
      title: "Mysore Silk Sarees", kicker: "Women", crumb: "Sarees",
      lead: "Pure Mysore crepe silk and silk georgette, woven with pure gold zari on KSIC's own looms.",
      scope: (p) => p.category === "saree", types: ["crepe", "georgette"],
    },
    menswear: {
      title: "Silk Menswear", kicker: "Men", crumb: "Menswear",
      lead: "Pure silk kurtas, shirts and ties — light, breathable and made for the festive calendar.",
      scope: (p) => p.gender === "men", types: ["kurta", "shirt", "tie", "gift-set"],
    },
    gifting: {
      title: "Silk Gifting", kicker: "Gifts", crumb: "Gifting",
      lead: "Pure silk ties and boxed tie-and-pocket-square sets, ready to give.",
      scope: (p) => p.type === "gift-set" || p.type === "tie", types: ["gift-set", "tie"],
    },
    all: {
      title: "Shop All", kicker: "KSIC Mysore Silk", crumb: "Shop all",
      lead: "Every piece currently on our looms — sarees, menswear and gifts.",
      scope: () => true, types: ["crepe", "georgette", "kurta", "shirt", "tie", "gift-set"],
    },
  };
  // bands match the "Categories" price menu on ksicsilk.com, plus an heirloom band
  const PRICES = [
    ["0to15", "₹0 – ₹15,000", (n) => n <= 15000],
    ["15to30", "₹15,001 – ₹30,000", (n) => n > 15000 && n <= 30000],
    ["30to40", "₹30,001 – ₹40,000", (n) => n > 30000 && n <= 40000],
    ["above40", "Above ₹40,000", (n) => n > 40000],
    ["above100", "Heirloom · above ₹1,00,000", (n) => n >= 100000],
  ];
  const TAG_RANK = { Signature: 0, Heirloom: 1, New: 2 };
  const SORTS = {
    featured: (a, b) => (TAG_RANK[a.tag] ?? 9) - (TAG_RANK[b.tag] ?? 9) || b.id - a.id,
    new: (a, b) => b.id - a.id,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
  };

  // ---- state from URL
  const u = params();
  const catKey = CATS[u.get("cat")] ? u.get("cat") : "all";
  const cat = CATS[catKey];
  const state = {
    types: new Set((u.get("type") || "").split(",").filter((t) => cat.types.includes(t))),
    colors: new Set((u.get("color") || "").split(",").filter((c) => FAMILY[c])),
    price: PRICES.some(([k]) => k === u.get("price")) ? u.get("price") : "",
    sort: SORTS[u.get("sort")] ? u.get("sort") : "featured",
    page: Math.max(1, Number(u.get("page")) || 1),
    q: (u.get("q") || "").trim(),
  };

  // ---- page heading
  const heading = state.q ? `Results for “${state.q}”` : cat.title;
  $("#shopTitle").textContent = heading;
  $("#shopKicker").textContent = state.q ? "Search" : cat.kicker;
  $("#shopLead").textContent = state.q ? "" : cat.lead;
  $("#crumb").textContent = state.q ? "Search" : cat.crumb;
  document.title = `${heading} — KSIC Mysore Silk`;
  $("#sort").value = state.sort;
  $("#grid").innerHTML = skeleton(9);

  let all;
  try { all = await loadProducts(); } catch {
    $("#grid").innerHTML = `<p class="empty">Couldn't load products. Serve the site over HTTP (see README).</p>`;
    return;
  }
  let scoped = all.filter(cat.scope);
  if (state.q) scoped = search(scoped, state.q);

  const priceBands = PRICES.filter(([, , fn]) => scoped.some((p) => fn(p.price)));
  if (state.price && !priceBands.some(([k]) => k === state.price)) state.price = "";

  // ---- filter panel
  function renderFilters() {
    const types = cat.types.filter((t) => scoped.some((p) => p.type === t));
    const fams = Object.keys(FAMILY).filter((f) => scoped.some((p) => p.family === f));
    $("#filterBody").innerHTML = `
      ${types.length > 1 ? `<div class="fgroup"><h4>Category</h4>${types.map((t) => `
        <label class="check"><input type="checkbox" name="type" value="${t}" ${state.types.has(t) ? "checked" : ""}><span class="box"></span>${TYPE_PLURAL[t]}<small>${scoped.filter((p) => p.type === t).length}</small></label>`).join("")}</div>` : ""}
      ${priceBands.length ? `<div class="fgroup"><h4>Price</h4>
        <label class="check"><input type="radio" name="price" value="" ${!state.price ? "checked" : ""}><span class="box"></span>Any price</label>
        ${priceBands.map(([k, label, fn]) => `<label class="check"><input type="radio" name="price" value="${k}" ${state.price === k ? "checked" : ""}><span class="box"></span>${label}<small>${scoped.filter((p) => fn(p.price)).length}</small></label>`).join("")}</div>` : ""}
      ${fams.length > 1 ? `<div class="fgroup"><h4>Colour</h4><div class="swatches">${fams.map((f) => `
        <button class="sw${state.colors.has(f) ? " is-on" : ""}" data-color="${f}" data-name="${f}" style="background:${FAMILY[f]}" aria-label="${f}" aria-pressed="${state.colors.has(f)}"></button>`).join("")}</div></div>` : ""}
      <div class="fgroup"><h4>Shop</h4>
        ${Object.entries(CATS).filter(([k]) => k !== catKey).map(([k, c]) => `<a class="check" href="shop.html?cat=${k}">${c.title} →</a>`).join("")}
      </div>`;
  }

  // ---- results
  function filtered() {
    const band = PRICES.find(([k]) => k === state.price);
    return scoped
      .filter((p) => !state.types.size || state.types.has(p.type))
      .filter((p) => !band || band[2](p.price))
      .filter((p) => !state.colors.size || state.colors.has(p.family))
      .sort(SORTS[state.sort]);
  }

  function syncURL() {
    const q = new URLSearchParams();
    q.set("cat", catKey);
    if (state.q) q.set("q", state.q);
    if (state.types.size) q.set("type", [...state.types].join(","));
    if (state.price) q.set("price", state.price);
    if (state.colors.size) q.set("color", [...state.colors].join(","));
    if (state.sort !== "featured") q.set("sort", state.sort);
    if (state.page > 1) q.set("page", state.page);
    history.replaceState(null, "", `shop.html?${q}`);
  }

  function renderResults({ scroll = false } = {}) {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const slice = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    const from = list.length ? (state.page - 1) * PAGE_SIZE + 1 : 0;

    $("#count").innerHTML = `Showing <strong>${from}–${from + slice.length - 1 < 0 ? 0 : from + slice.length - 1}</strong> of <strong>${list.length}</strong> ${list.length === 1 ? "product" : "products"}`;
    $("#grid").innerHTML = slice.length ? slice.map(card).join("") : `
      <div class="empty"><h3>No matches</h3><p>Try removing a filter${state.q ? " or searching for something else" : ""}.</p>
      <button class="btn btn--dark" id="emptyClear">Clear filters</button></div>`;

    // active filter chips
    const chips = [
      ...[...state.types].map((t) => [`type:${t}`, TYPE_PLURAL[t]]),
      ...(state.price ? [[`price:${state.price}`, PRICES.find(([k]) => k === state.price)[1]]] : []),
      ...[...state.colors].map((c) => [`color:${c}`, c]),
      ...(state.q ? [[`q:`, `“${state.q}”`]] : []),
    ];
    $("#activeChips").innerHTML = chips.map(([k, l]) => `<button class="chip-x" data-chip="${esc(k)}">${esc(l)}</button>`).join("");

    // pagination
    $("#pager").innerHTML = pages > 1 ? `
      <button data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>
      ${Array.from({ length: pages }, (_, i) => `<button data-page="${i + 1}" class="${i + 1 === state.page ? "is-on" : ""}" ${i + 1 === state.page ? 'aria-current="page"' : ""}>${i + 1}</button>`).join("")}
      <button data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""} aria-label="Next page">›</button>` : "";

    syncURL();
    window.KSIC.replay($("#grid"));
    if (scroll) scrollTo({ top: $(".shop").offsetTop - 140, behavior: "smooth" });
  }

  function update(opts) { state.page = 1; renderFilters(); renderResults(opts); }

  // ---- events
  $("#filterBody").addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "type") t.checked ? state.types.add(t.value) : state.types.delete(t.value);
    if (t.name === "price") state.price = t.value;
    update();
  });
  $("#filterBody").addEventListener("click", (e) => {
    const sw = e.target.closest("[data-color]");
    if (!sw) return;
    const c = sw.dataset.color;
    state.colors.has(c) ? state.colors.delete(c) : state.colors.add(c);
    update();
  });
  $("#activeChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-chip]");
    if (!b) return;
    const [kind, val] = b.dataset.chip.split(":");
    if (kind === "type") state.types.delete(val);
    if (kind === "price") state.price = "";
    if (kind === "color") state.colors.delete(val);
    if (kind === "q") { location.href = `shop.html?cat=${catKey}`; return; }
    update();
  });
  const clear = () => { state.types.clear(); state.colors.clear(); state.price = ""; update(); };
  $("#clearAll").addEventListener("click", clear);
  $("#grid").addEventListener("click", (e) => { if (e.target.closest("#emptyClear")) clear(); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.page = 1; renderResults(); });
  $("#pager").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b || b.disabled) return;
    state.page = Number(b.dataset.page);
    renderResults({ scroll: true });
  });

  // mobile filter drawer
  const setPanel = (open) => {
    $("#filters").classList.toggle("is-open", open);
    $("#filterScrim").classList.toggle("is-on", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  $("#filterOpen").addEventListener("click", () => setPanel(true));
  $("#filterClose").addEventListener("click", () => setPanel(false));
  $("#filterScrim").addEventListener("click", () => setPanel(false));

  renderFilters();
  renderResults();
})();

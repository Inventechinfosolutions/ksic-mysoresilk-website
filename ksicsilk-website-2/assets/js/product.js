/* Product detail page: gallery with zoom, design picker, add to bag, related products */
(async () => {
  "use strict";
  const { $, $$, esc, money, icon, params, loadProducts, card, reveal, title, productUrl, bag, wish, recent, TYPE_PLURAL } = window.KSIC;

  const CRUMB = {
    saree: ["Sarees", "shop.html?cat=sarees"],
    kurta: ["Menswear", "shop.html?cat=menswear"],
    shirt: ["Menswear", "shop.html?cat=menswear"],
    tie: ["Menswear", "shop.html?cat=menswear"],
    "gift-set": ["Gifting", "shop.html?cat=gifting"],
  };

  let products;
  try { products = await loadProducts(); } catch {
    $("#pdp").innerHTML = `<p class="empty">Couldn't load the product. Serve the site over HTTP (see README).</p>`;
    return;
  }
  const u = params();
  const p = products.byId.get(Number(u.get("id")));
  if (!p) {
    $("#pdp").innerHTML = `<div class="empty"><h3>Product not found</h3><p>It may have sold out or moved.</p><a class="btn btn--dark" href="shop.html?cat=all">Continue shopping</a></div>`;
    return;
  }
  recent.push(p.id);

  const name = title(p);
  const isSaree = p.category === "saree";
  document.title = `${name} — KSIC Mysore Silk`;
  $('meta[name="description"]').content = p.description;

  // gallery = main shot + each distinct design shot
  const images = [{ src: p.image, design: null }];
  p.designs.forEach((d) => { if (d.image !== p.image) images.push({ src: d.image, design: d.id }); });
  let design = p.designs.find((d) => d.id === Number(u.get("design"))) || p.designs[0] || null;
  let current = Math.max(0, images.findIndex((im) => im.design === design?.id && u.get("design")));
  let qty = 1;

  const [crumbLabel, crumbHref] = CRUMB[p.type === "crepe" || p.type === "georgette" ? "saree" : p.type];
  $("#crumbs").innerHTML = `<a href="index.html">Home</a><i>/</i><a href="${crumbHref}">${crumbLabel}</a><i>/</i><span aria-current="page">${esc(name)}</span>`;

  const specs = [
    ["Product", TYPE_PLURAL[p.type].replace(/s$/, "")],
    ["Fabric", "100% pure mulberry silk"],
    ...(isSaree ? [["Weave", p.type === "georgette" ? "Silk georgette" : "Mysore crepe silk"], ["Zari", "Pure gold zari"]] : []),
    ["Colour", p.color],
    ...(p.article ? [["Article no.", p.article]] : []),
    ...(p.designs.length ? [["Designs available", p.designs.map((d) => d.code).join(", ")]] : []),
    ["Product code", `KSIC-${p.id}`],
    ["Woven by", "Karnataka Silk Industries Corporation"],
    ["Care", "Gentle hand wash or dry clean"],
  ];

  $("#pdp").innerHTML = `
    <div class="gallery">
      <div class="gallery__thumbs" id="thumbs">${images.map((im, i) => `<button class="${i === current ? "is-on" : ""}" data-i="${i}" aria-label="View image ${i + 1}"><img src="${im.src}" alt=""></button>`).join("")}</div>
      <div class="gallery__main" id="mainImg">
        <img src="${images[current].src}" alt="${esc(name)}">
        ${images.length > 1 ? `<button class="gallery__nav gallery__nav--prev" data-step="-1" aria-label="Previous image">${icon("left")}</button><button class="gallery__nav gallery__nav--next" data-step="1" aria-label="Next image">${icon("right")}</button>` : ""}
        <span class="gallery__hint">${icon("zoom")}Hover to zoom</span>
      </div>
    </div>

    <div class="info">
      <p class="kicker">${p.tag ? `${esc(p.tag)} · ` : ""}${isSaree ? "Pure Mysore Silk" : "Pure Silk"}</p>
      <h1>${esc(name)}</h1>
      <div class="info__meta">
        ${p.article ? `<span>Article <b>${esc(p.article)}</b></span>` : ""}
        <span>Code <b>KSIC-${p.id}</b></span>
        ${design ? `<span>Design <b id="metaDesign">${esc(design.code)}</b></span>` : ""}
      </div>
      <div class="info__price"><strong>${money(p.price)}</strong></div>
      <p class="info__tax">Inclusive of all taxes</p>
      <p class="info__desc">${esc(p.description)}</p>
      <hr>

      <div class="opt">
        <p class="opt__label">Colour <span id="colorLabel">${esc(p.color)}</span></p>
        <span class="color-pill"><span class="dot" id="colorDot" style="background:${p.swatch}"></span><span id="colorText">${esc(p.color)}</span></span>
      </div>

      ${p.designs.length ? `
      <div class="opt">
        <p class="opt__label">Design <span id="designLabel">No. ${esc(design.code)}</span></p>
        <div class="design-opts" id="designOpts">${p.designs.map((d) => `
          <button class="${d.id === design.id ? "is-on" : ""}" data-design="${d.id}" aria-pressed="${d.id === design.id}">
            <figure><img src="${d.image}" alt=""></figure>No. ${esc(d.code)}
          </button>`).join("")}</div>
      </div>` : ""}

      <div class="buy" id="buyRow">
        <div class="qty"><button data-q="-1" aria-label="Decrease quantity">−</button><input id="qty" type="number" min="1" max="10" value="1" aria-label="Quantity"><button data-q="1" aria-label="Increase quantity">+</button></div>
        <button class="btn btn--gold" id="addBtn">${icon("bag")}Add to bag</button>
        <button class="btn btn--dark" id="buyBtn">Buy now</button>
        <button class="wish-lg${wish.has(p.id) ? " is-on" : ""}" data-wish="${p.id}" aria-label="Save to wishlist" aria-pressed="${wish.has(p.id)}">${icon("heart")}</button>
      </div>

      <div class="assure">
        <div>${icon("silk")}100% pure silk</div>
        <div>${icon(isSaree ? "zari" : "crown")}${isSaree ? "Pure gold zari" : "Made by KSIC"}</div>
        <div>${icon("shield")}GI-certified Mysore Silk</div>
        <div>${icon("box")}Packed in KSIC box</div>
      </div>

      <div class="pickup">${icon("store")}<div><b style="font-weight:500">Want to see it in person?</b><br>Visit any of our 15 KSIC showrooms in Karnataka and Hyderabad. <a href="showrooms.html">Find a showroom</a></div></div>

      <div class="acc">
        <details open><summary>Product details</summary><div class="acc__body">
          <table class="specs">${specs.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join("")}</table>
        </div></details>
        <details><summary>Silk care</summary><div class="acc__body">
          <ul>
            <li>Wash in soft, lukewarm water with a neutral soap, kneading gently. Rinse 2–3 times.</li>
            <li>Add a few drops of citric or acetic acid to the final cold rinse to keep colours bright.</li>
            <li>Dry flat, in shade. Iron on low–medium heat, on the reverse side — never spray water on silk.</li>
            <li>Store clean and dry, away from wood. ${isSaree ? "Wrap zari sarees in cotton cloth." : ""}</li>
          </ul>
          <p><a href="index.html#silk-care">Read the full care guide</a></p>
        </div></details>
        <details><summary>How to identify pure silk</summary><div class="acc__body">
          <p>Pull a thread from both the warp and the weft and burn it. Pure silk smells like burning hair and leaves a black residue that crushes to powder between your fingers.</p>
          <p><a href="index.html#silk-care">More on the burning test</a></p>
        </div></details>
        <details><summary>Shipping &amp; returns</summary><div class="acc__body">
          <p>Each piece is packed in a KSIC box. For delivery times, exchanges and returns, see our shipping and returns policies or call <a href="tel:+918025586402">+91 80 2558 6402</a> before ordering.</p>
        </div></details>
      </div>
    </div>`;

  /* ----------------------------------------------------------- gallery */
  const main = $("#mainImg");
  const mainImg = $("img", main);
  function show(i) {
    current = (i + images.length) % images.length;
    mainImg.style.opacity = 0;
    setTimeout(() => { mainImg.src = images[current].src; mainImg.style.opacity = 1; }, 160);
    $$("#thumbs button").forEach((b, j) => b.classList.toggle("is-on", j === current));
    const d = p.designs.find((x) => x.id === images[current].design);
    if (d) pickDesign(d, false);
    syncColour();
  }
  // design photos are often woven in another colourway, so the label follows the photo
  function syncColour() {
    const d = p.designs.find((x) => x.id === images[current].design);
    $("#colorLabel").textContent = d ? `As pictured · Design ${d.code}` : p.color;
    $("#colorText").textContent = d ? `Design ${d.code} colourway` : p.color;
    $("#colorDot").style.display = d ? "none" : "";
  }
  syncColour();
  $("#thumbs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(Number(b.dataset.i)); });
  main.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-step]");
    if (nav) { e.stopPropagation(); main.classList.remove("is-zoom"); show(current + Number(nav.dataset.step)); return; }
    if (matchMedia("(hover: none)").matches) main.classList.toggle("is-zoom");
  });
  main.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || e.target.closest("[data-step]")) { if (e.pointerType === "mouse") main.classList.remove("is-zoom"); return; }
    const r = main.getBoundingClientRect();
    mainImg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    main.classList.add("is-zoom");
  });
  main.addEventListener("pointerleave", () => main.classList.remove("is-zoom"));
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === "ArrowRight") show(current + 1);
    if (e.key === "ArrowLeft") show(current - 1);
  });

  /* ------------------------------------------------------------ design */
  function pickDesign(d, moveGallery = true) {
    design = d;
    $$("#designOpts button").forEach((b) => { const on = Number(b.dataset.design) === d.id; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); });
    $("#designLabel").textContent = `No. ${d.code}`;
    if ($("#metaDesign")) $("#metaDesign").textContent = d.code;
    history.replaceState(null, "", productUrl(p, d.id));
    if (moveGallery) {
      const i = images.findIndex((im) => im.design === d.id);
      show(i < 0 ? 0 : i);
    }
  }
  $("#designOpts")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-design]");
    if (b) pickDesign(p.designs.find((d) => d.id === Number(b.dataset.design)));
  });

  /* --------------------------------------------------------------- buy */
  const qtyInput = $("#qty");
  const setQty = (n) => { qty = Math.max(1, Math.min(10, n || 1)); qtyInput.value = qty; };
  $(".qty").addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) setQty(qty + Number(b.dataset.q)); });
  qtyInput.addEventListener("change", () => setQty(Number(qtyInput.value)));
  const add = () => bag.add(p, design, qty);
  $("#addBtn").addEventListener("click", add);
  $("#buyBtn").addEventListener("click", () => { add(); location.href = "cart.html"; });

  // sticky add-to-bag once the main buttons scroll away
  const sticky = $("#stickyBuy");
  sticky.innerHTML = `<div class="container"><img src="${p.image}" alt=""><div><p>${esc(name)}</p><small>${money(p.price)}</small></div><button class="btn btn--gold btn--sm" id="stickyAdd">Add to bag</button></div>`;
  $("#stickyAdd").addEventListener("click", add);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      const on = !e.isIntersecting && e.boundingClientRect.top < 0;
      sticky.classList.toggle("is-on", on);
      sticky.setAttribute("aria-hidden", !on);
      document.body.classList.toggle("has-sticky-buy", on);
    }).observe($("#buyRow"));
  }

  /* ------------------------------------------------------------ related */
  const sameGroup = (x) => (isSaree ? x.category === "saree" : x.gender === p.gender);
  const also = products.filter((x) => x.id !== p.id && sameGroup(x))
    .sort((a, b) => (b.type === p.type) - (a.type === p.type) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
    .slice(0, 4);
  if (also.length) {
    $("#alsoSec").hidden = false;
    $("#alsoGrid").innerHTML = also.map(card).join("");
    $("#alsoLabel").textContent = crumbLabel.toLowerCase();
    $("#alsoLink").href = crumbHref;
  }
  const rec = recent.ids().filter((id) => id !== p.id).map((id) => products.byId.get(id)).filter(Boolean).slice(0, 4);
  if (rec.length) {
    $("#recentSec").hidden = false;
    $("#recentGrid").innerHTML = rec.map(card).join("");
  }
  reveal();
})();

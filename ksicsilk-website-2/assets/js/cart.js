/* Shopping bag + wishlist pages */
(async () => {
  "use strict";
  const { $, esc, money, icon, loadProducts, card, reveal, title, subtitle, productUrl, bag, wish, toast } = window.KSIC;
  const page = document.body.dataset.page;

  let products;
  try { products = await loadProducts(); } catch {
    ($("#cart") || $("#wishGrid")).innerHTML = `<p class="empty">Couldn't load products. Serve the site over HTTP (see README).</p>`;
    return;
  }
  const byId = products.byId;

  /* ---------------------------------------------------------- wishlist */
  if (page === "wishlist") {
    const draw = () => {
      const items = [...wish.ids()].map((id) => byId.get(id)).filter(Boolean);
      $("#wishLead").textContent = items.length ? `${items.length} saved ${items.length === 1 ? "piece" : "pieces"}` : "";
      $("#wishGrid").innerHTML = items.length ? items.map(card).join("") : `
        <div class="empty"><h3>Nothing saved yet</h3><p>Tap the heart on any piece to keep it here.</p>
        <a class="btn btn--dark" href="shop.html?cat=sarees">Browse sarees</a></div>`;
      window.KSIC.replay($("#wishGrid"));
    };
    document.addEventListener("ksic:wish", draw);
    draw();
    return;
  }

  /* -------------------------------------------------------------- bag */
  const root = $("#cart");
  function draw() {
    const lines = bag.items().map((l) => ({ ...l, p: byId.get(l.id) })).filter((l) => l.p);
    if (!lines.length) {
      root.style.display = "block";
      root.innerHTML = `
        <div class="empty"><h3>Your bag is empty</h3><p>Every saree begins with a single thread.</p>
        <a class="btn btn--dark" href="shop.html?cat=sarees">Shop sarees</a></div>
        <div class="sec__head" style="margin-top:20px"><div><p class="kicker">Popular right now</p><h2 class="h-section">You might <em>like</em></h2></div></div>
        <div class="grid">${products.filter((p) => p.tag).slice(0, 4).map(card).join("")}</div>`;
      reveal(root);
      return;
    }
    root.style.display = "";
    const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
    const count = lines.reduce((n, l) => n + l.qty, 0);
    root.innerHTML = `
      <div>
        <div class="cart__list">${lines.map((l) => {
          const d = l.p.designs.find((x) => x.id === l.design);
          return `
          <div class="line">
            <a class="line__img" href="${productUrl(l.p, l.design)}"><img src="${d?.image || l.p.image}" alt=""></a>
            <div>
              <h3><a href="${productUrl(l.p, l.design)}">${esc(title(l.p))}</a></h3>
              <p class="line__meta">${esc(subtitle(l.p))}${l.code ? ` · Design ${esc(l.code)}` : ""}${!d || d.image === l.p.image ? ` · <span class="dot" style="background:${l.p.swatch}"></span> ${esc(l.p.color)}` : ""}</p>
              <div class="qty qty--sm"><button data-dec="${l.key}" aria-label="Decrease">−</button><input value="${l.qty}" readonly aria-label="Quantity"><button data-inc="${l.key}" aria-label="Increase">+</button></div>
              <div class="line__links"><button data-move="${l.key}">Move to wishlist</button><button data-rm="${l.key}">Remove</button></div>
            </div>
            <div class="line__price">${money(l.p.price * l.qty)}${l.qty > 1 ? `<small>${money(l.p.price)} each</small>` : ""}</div>
          </div>`;
        }).join("")}</div>
        <a class="link-more" href="shop.html?cat=all" style="margin-top:24px">← Continue shopping</a>
      </div>
      <aside class="summary">
        <h3>Order summary</h3>
        <div class="summary__row"><span>Items (${count})</span><span>${money(subtotal)}</span></div>
        <div class="summary__row"><span>Shipping</span><span>Calculated at checkout</span></div>
        <div class="summary__row summary__row--total"><span>Total</span><span>${money(subtotal)}</span></div>
        <p class="info__tax">Inclusive of all taxes</p>
        <button class="btn btn--gold btn--block" id="checkout">Proceed to checkout</button>
        <p class="summary__note">${icon("shield")}Every KSIC piece is 100% pure silk, woven by a Government of Karnataka enterprise.</p>
        <p class="summary__note">${icon("store")}Prefer to buy in person? <a href="showrooms.html" style="border-bottom:1px solid">Find a showroom</a></p>
      </aside>`;
  }

  root.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    const line = bag.items().find((l) => l.key === (t.dataset.inc || t.dataset.dec || t.dataset.rm || t.dataset.move));
    if (t.dataset.inc && line) bag.setQty(line.key, line.qty + 1);
    if (t.dataset.dec && line) bag.setQty(line.key, line.qty - 1);
    if (t.dataset.rm && line) { bag.remove(line.key); toast({ text: "Removed from your bag" }); }
    if (t.dataset.move && line) {
      bag.remove(line.key);
      if (!wish.has(line.id)) wish.toggle(byId.get(line.id));
    }
    if (t.id === "checkout") toast({ title: "Almost there", text: "Checkout will connect to the KSIC payment gateway." });
    if (t.dataset.inc || t.dataset.dec || t.dataset.rm || t.dataset.move) draw();
  });
  addEventListener("storage", draw);
  draw();
})();

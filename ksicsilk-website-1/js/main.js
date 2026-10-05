/* KSIC Mysore Silk — home page interactions */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap) document.documentElement.classList.remove('js');

  const CATALOG = window.KSIC_CATALOG || { products: [], palettes: {}, policies: {} };
  const PRODUCTS = CATALOG.products;
  const PALETTES = CATALOG.palettes;
  const POLICIES = CATALOG.policies;
  const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  const CAT_LABEL = { saree: 'Saree', shirts: 'Shirt', kurtas: 'Kurta', ties: 'Tie', 'gift-sets': 'Gift set' };
  const isSaree = p => p.category === 'saree';
  const titleOf = p => isSaree(p) ? `Article ${p.name}` : p.title;
  const coverOf = p => isSaree(p) ? p.designs[0].images[0] : p.images[0];
  const colourOf = (p, id) => isSaree(p) ? PALETTES[p.palette].find(c => c.id === id) : null;
  const shadeNo = (p, id) => PALETTES[p.palette].findIndex(c => c.id === id) + 1;
  // Contrast-border sarees get a split swatch: body colour / border colour
  const swatchBg = c => c.border ? `linear-gradient(135deg, ${c.hex} 0 55%, ${c.border} 55% 100%)` : c.hex;

  const SHOWROOMS = [
    ['Jubilee Showroom', 'Bengaluru', 'jubilee'],
    ['K.G Road', 'Bengaluru', 'k.g'],
    ['Malleshwaram Circle', 'Bengaluru', 'malleshwaram'],
    ['Jayanagar', 'Bengaluru', 'jayanagar'],
    ['Gandhi Bazaar', 'Bengaluru', 'Gandhi'],
    ['Basaveshwara Nagar', 'Bengaluru', 'basaveshw'],
    ['Devanahalli', 'Bengaluru', 'kalalokha'],
    ['K.R Circle', 'Mysuru', 'k.r'],
    ['J.L.B Road', 'Mysuru', 'j.l.b'],
    ['Channapatna', 'Karnataka', 'channapatna'],
    ['Davanagere', 'Karnataka', 'davangere'],
    ['Hyderabad', 'Telangana', 'hyderabad']
  ];

  /* ---------------- Rendering ---------------- */
  function cardHTML(p, { square = false } = {}) {
    const title = titleOf(p);
    let imgs, sub, tag = '', action, swatches = '';
    if (isSaree(p)) {
      imgs = p.designs.map(d => d.images[0]);
      const pal = PALETTES[p.palette];
      sub = `${p.designs.length > 1 ? p.designs.length + ' designs' : 'Design ' + p.designs[0].design} · ${pal.length} colours`;
      if (p.designs.length > 1) tag = `<span class="card__tag">${p.designs.length} designs</span>`;
      action = 'Choose colour';
      swatches = `<div class="card__swatches" aria-hidden="true">${pal.slice(0, 6).map(c => `<i style="background:${swatchBg(c)}"></i>`).join('')}<span>+${pal.length - 6}</span></div>`;
    } else {
      imgs = p.images;
      sub = CAT_LABEL[p.category] + (p.option === 'size' ? ' · S–XL' : '');
      action = p.option === 'size' ? 'Choose size' : 'Add to bag';
    }
    const [a, b] = imgs;
    return `
      <article class="card${square ? ' card--square' : ''}" data-id="${p.id}">
        <div class="card__media" data-quickview="${p.id}" role="button" tabindex="0" aria-label="Quick view ${title}">
          ${tag}
          <img src="${a}" alt="${title}" loading="lazy">
          ${b && b !== a ? `<img src="${b}" alt="" loading="lazy">` : ''}
          <button class="card__add" data-add="${p.id}" type="button">${action}</button>
        </div>
        <div class="card__meta">
          <div><h3 class="card__title">${title}</h3><p class="card__sub">${sub}</p>${swatches}</div>
          <span class="card__price">${inr(p.price)}</span>
        </div>
      </article>`;
  }

  const sarees = PRODUCTS.filter(isSaree);
  const MEN_ORDER = ['kurtas', 'shirts', 'ties', 'gift-sets'];
  const menswear = PRODUCTS.filter(p => !isSaree(p))
    .sort((a, b) => MEN_ORDER.indexOf(a.category) - MEN_ORDER.indexOf(b.category));

  function renderSarees(min = 0, max = Infinity) {
    const list = sarees.filter(p => p.price >= min && p.price < max);
    $('[data-edit-track]').innerHTML = list.length
      ? list.map(p => cardHTML(p)).join('')
      : '<p class="edit__empty">No sarees in this range yet — visit a showroom for the full collection.</p>';
  }

  function renderMen(cat = 'all') {
    const list = cat === 'all' ? menswear : menswear.filter(p => p.category === cat);
    const grid = $('[data-men-grid]');
    grid.innerHTML = list.map(p => cardHTML(p, { square: true })).join('');
    if (hasGsap && !reduceMotion) {
      gsap.from(grid.children, { y: 40, opacity: 0, duration: .8, stagger: .06, ease: 'power3.out' });
    }
  }

  function renderShowrooms() {
    $('[data-showrooms]').innerHTML = SHOWROOMS.map(([name, city, q]) => `
      <li><a href="https://www.ksicsilk.com/Home/showrooms?s=${encodeURIComponent(q)}" target="_blank" rel="noopener">
        ${name}<small>${city}</small></a></li>`).join('');
  }

  renderSarees();
  renderMen();
  renderShowrooms();
  $('[data-year]').textContent = new Date().getFullYear();

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $('[data-toast]');
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-show'), 2600);
  }

  /* ---------------- Cart (per-browser, localStorage) ----------------
     A line mirrors what ksicsilk.com posts to /ShoppingCart/AddToCart:
     sarees → article + design + colour (BDId); sized menswear → article + size. */
  const CART_KEY = 'ksic-cart-v2';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }
  cart = cart.filter(i => {
    const p = byId[i.id];
    if (!p) return false;
    if (isSaree(p)) return p.designs.some(d => d.designId === i.designId) && colourOf(p, i.colorId);
    return p.option !== 'size' || p.sizes.includes(i.size);
  });

  const sameLine = (a, b) => a.id === b.id && a.designId === b.designId && a.colorId === b.colorId && a.size === b.size;

  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage unavailable */ }
    renderCart();
  }

  function addToCart(item) {
    const line = cart.find(i => sameLine(i, item));
    if (line) line.qty++; else cart.push({ ...item, qty: 1 });
    saveCart();
    const c = $('[data-cart-count]');
    c.classList.add('bump');
    setTimeout(() => c.classList.remove('bump'), 300);
    toast(`${titleOf(byId[item.id])} added to bag`);
  }

  function lineDetails(i) {
    const p = byId[i.id];
    if (!isSaree(p)) return { img: p.images[0], meta: `${CAT_LABEL[p.category]}${i.size ? ' · Size ' + i.size : ''}` };
    const d = p.designs.find(x => x.designId === i.designId);
    const c = colourOf(p, i.colorId);
    return {
      img: d.images[0],
      meta: `Design ${d.design}<br><span class="drawer__colour"><i style="background:${swatchBg(c)}"></i>Shade ${shadeNo(p, c.id)} · ${c.name}</span>`
    };
  }

  function renderCart() {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const total = cart.reduce((s, i) => s + i.qty * byId[i.id].price, 0);
    const badge = $('[data-cart-count]');
    badge.textContent = count;
    badge.toggleAttribute('data-zero', count === 0);
    $('[data-cart-total]').textContent = inr(total);
    $('[data-cart-items]').innerHTML = cart.length ? cart.map((i, idx) => {
      const p = byId[i.id];
      const { img, meta } = lineDetails(i);
      return `<div class="drawer__item">
        <figure><img src="${img}" alt=""></figure>
        <div>
          <h4>${titleOf(p)}</h4>
          <p class="muted">${meta}</p>
          <div class="qty">
            <button data-qty="${idx}" data-delta="-1" aria-label="Decrease">−</button>
            <span>${i.qty}</span>
            <button data-qty="${idx}" data-delta="1" aria-label="Increase">+</button>
          </div>
          <button class="drawer__remove" data-remove="${idx}">Remove</button>
        </div>
        <strong>${inr(p.price * i.qty)}</strong>
      </div>`;
    }).join('') : '<p class="drawer__empty">Your bag is empty.</p>';
  }
  renderCart();

  /* ---------------- Overlays ---------------- */
  let lenis = null;
  const drawer = $('[data-drawer]');
  const modal = $('[data-modal]');
  const menu = $('[data-menu]');

  function lockScroll(lock) {
    document.body.style.overflow = lock ? 'hidden' : '';
    if (lenis) lock ? lenis.stop() : lenis.start();
  }
  function openDrawer() { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); lockScroll(true); }
  function closeDrawer() { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); lockScroll(false); }
  function closeModal() { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); lockScroll(false); }

  /* ---------------- Quick view (mirrors getDesign / getDetails pages) ---------------- */
  const qv = { id: null, designIdx: 0, colorId: null, size: null };

  function galleryHTML(images, alt) {
    return `
      <div class="qv__thumbs"${images.length < 2 ? ' hidden' : ''}>${images.map((src, i) =>
        `<button class="${i ? '' : 'is-active'}" data-thumb="${src}" aria-label="View image ${i + 1}"><img src="${src}" alt=""></button>`).join('')}</div>
      <div class="qv__main" data-qv-zoom><img src="${images[0]}" alt="${alt}" data-qv-main><span class="qv__zoom-hint">Hover to zoom</span></div>`;
  }

  function detailsHTML(p) {
    const pol = isSaree(p) ? POLICIES.saree : POLICIES.menswear;
    const rows = [
      ['Shipping', pol.shipping],
      ...(isSaree(p) ? [['Colour', pol.colour]] : []),
      ['Returns', pol.returns],
      ...(isSaree(p) ? [['Authenticity', 'Each zari saree carries a unique code number and hologram as a mark of authenticity.']] : [])
    ];
    return `<div class="qv__details">${rows.map(([h, b], i) =>
      `<details${i ? '' : ' open'}><summary>${h}</summary><p>${b}</p></details>`).join('')}</div>`;
  }

  function openQuickView(id, designIdx = 0) {
    const p = byId[id];
    if (!p) return;
    Object.assign(qv, { id, designIdx: isSaree(p) ? Math.min(designIdx, p.designs.length - 1) : 0, colorId: null, size: null });
    const title = titleOf(p);
    let picker, images, source;

    if (isSaree(p)) {
      const d = p.designs[qv.designIdx];
      images = d.images; source = d.source;
      const pal = PALETTES[p.palette];
      picker = `
        <div class="qv__group">
          <p class="qv__label">Design <b data-qv-design>${d.design}</b></p>
          <div class="qv__designs">${p.designs.map((x, i) => `
            <button class="${i === qv.designIdx ? 'is-active' : ''}" data-design-idx="${i}" aria-label="Design ${x.design}">
              <img src="${x.images[0]}" alt=""><span>${x.design}</span></button>`).join('')}</div>
        </div>
        <div class="qv__group">
          <p class="qv__label">Colour <b data-qv-colour-name>Select a colour</b></p>
          <div class="qv__swatches" role="radiogroup" aria-label="Available colours">${pal.map((c, i) => `
            <button role="radio" aria-checked="false" data-colour="${c.id}" title="Shade ${i + 1} · ${c.name}"
              aria-label="Shade ${i + 1}, ${c.name}" style="--sw:${swatchBg(c)}"></button>`).join('')}</div>
          <p class="qv__hint">${POLICIES.saree.colour}</p>
        </div>`;
    } else {
      images = p.images; source = p.source;
      picker = p.option === 'size' ? `
        <div class="qv__group">
          <p class="qv__label">Size <b data-qv-size-name>Select a size</b></p>
          <div class="qv__sizes">${p.sizes.map(s => `<button data-size="${s}">${s}</button>`).join('')}</div>
        </div>` : '';
    }

    $('[data-qv]').innerHTML = `
      <div class="qv__gallery" data-qv-gallery>${galleryHTML(images, title)}</div>
      <div class="qv__info">
        <p class="eyebrow">${isSaree(p) ? 'Mysore Silk Saree' : 'Menswear · ' + CAT_LABEL[p.category]}</p>
        <h2 id="qv-title">${title}</h2>
        <p class="qv__price">${inr(p.price)} <span class="muted small">incl. of all taxes</span></p>
        <dl class="qv__meta">
          <dt>Article</dt><dd>${p.name}</dd>
          <dt>Fabric</dt><dd>100% pure silk${isSaree(p) ? ', pure gold zari' : ''}</dd>
          <dt>Made in</dt><dd>Mysore, Karnataka</dd>
        </dl>
        ${picker}
        <p class="qv__error" data-qv-error role="alert"></p>
        <button class="btn btn--dark btn--block" data-qv-add>Add to bag — ${inr(p.price)}</button>
        ${detailsHTML(p)}
        <a class="qv__link" href="${source}" target="_blank" rel="noopener" data-qv-source>View on ksicsilk.com</a>
      </div>`;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    $('.modal__close').focus({ focusVisible: false });
  }

  function selectDesign(idx) {
    const p = byId[qv.id];
    const d = p.designs[idx];
    qv.designIdx = idx;
    $('[data-qv-gallery]').innerHTML = galleryHTML(d.images, titleOf(p));
    $('[data-qv-design]').textContent = d.design;
    $('[data-qv-source]').href = d.source;
    $$('[data-design-idx]').forEach(b => b.classList.toggle('is-active', +b.dataset.designIdx === idx));
    if (hasGsap && !reduceMotion) gsap.from('[data-qv-main] ', { opacity: 0, scale: 1.04, duration: .6, ease: 'power3.out' });
  }

  function selectColour(id) {
    const p = byId[qv.id];
    const c = colourOf(p, id);
    qv.colorId = id;
    $('[data-qv-colour-name]').textContent = `Shade ${shadeNo(p, id)} · ${c.name}`;
    $$('[data-colour]').forEach(b => {
      const on = b.dataset.colour === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', on);
    });
    $('[data-qv-error]').textContent = '';
  }

  function submitQuickView() {
    const p = byId[qv.id];
    const err = $('[data-qv-error]');
    if (isSaree(p) && !qv.colorId) { err.textContent = 'Please select a colour to purchase.'; return; }
    if (p.option === 'size' && !qv.size) { err.textContent = 'Please select a size to purchase.'; return; }
    addToCart(isSaree(p)
      ? { id: p.id, designId: p.designs[qv.designIdx].designId, colorId: qv.colorId, size: null }
      : { id: p.id, designId: null, colorId: null, size: qv.size });
    closeModal();
  }

  /* ---------------- Delegated events ---------------- */
  document.addEventListener('click', e => {
    const t = e.target;
    const add = t.closest('[data-add]');
    if (add) {
      e.stopPropagation();
      const p = byId[add.dataset.add];
      // Only items with no options go straight to the bag; the rest need a choice first
      if (isSaree(p) || p.option === 'size') openQuickView(p.id);
      else addToCart({ id: p.id, designId: null, colorId: null, size: null });
      return;
    }
    const sc = t.closest('[data-showcase-open]');
    if (sc) {
      const active = $('[data-showcase-img].is-active') || $('[data-showcase-img]');
      const p = byId[sc.dataset.showcaseOpen];
      return openQuickView(p.id, Math.max(0, p.designs.findIndex(d => d.designId === active.dataset.designId)));
    }
    const qvBtn = t.closest('[data-quickview]');
    if (qvBtn) return openQuickView(qvBtn.dataset.quickview);

    const thumb = t.closest('[data-thumb]');
    if (thumb) {
      $('[data-qv-main]').src = thumb.dataset.thumb;
      $$('[data-thumb]').forEach(b => b.classList.toggle('is-active', b === thumb));
      return;
    }
    const design = t.closest('[data-design-idx]');
    if (design) return selectDesign(+design.dataset.designIdx);
    const colour = t.closest('[data-colour]');
    if (colour) return selectColour(colour.dataset.colour);
    const size = t.closest('[data-size]');
    if (size) {
      qv.size = size.dataset.size;
      $$('[data-size]').forEach(b => b.classList.toggle('is-active', b === size));
      $('[data-qv-size-name]').textContent = qv.size;
      $('[data-qv-error]').textContent = '';
      return;
    }
    if (t.closest('[data-qv-add]')) return submitQuickView();
    if (t.closest('[data-modal-close]')) return closeModal();
    if (t.closest('[data-cart-open]')) return openDrawer();
    if (t.closest('[data-cart-close]')) return closeDrawer();

    const q = t.closest('[data-qty]');
    if (q) {
      const line = cart[+q.dataset.qty];
      line.qty += +q.dataset.delta;
      if (line.qty < 1) cart.splice(+q.dataset.qty, 1);
      return saveCart();
    }
    const rm = t.closest('[data-remove]');
    if (rm) { cart.splice(+rm.dataset.remove, 1); return saveCart(); }
    if (t.closest('[data-checkout]')) {
      return toast(cart.length ? 'Checkout connects to the store’s payment gateway' : 'Your bag is empty');
    }

    if (t.closest('[data-menu-open]')) { menu.classList.add('is-open'); return lockScroll(true); }
    if (t.closest('[data-menu-close]') || t.closest('[data-menu-link]')) { menu.classList.remove('is-open'); lockScroll(false); }

    const menLink = t.closest('[data-men-filter]');
    if (menLink) setMenTab(menLink.dataset.menFilter);

    // Smooth anchor scrolling through Lenis
    const a = t.closest('a[href^="#"]');
    if (a && a.getAttribute('href').length > 1) {
      const target = $(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const y = sectionTop(target);
        lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
  });

  // Quick-view image: magnify under the pointer and pan toward whichever edge/corner it moves to
  document.addEventListener('pointermove', e => {
    const box = e.target.closest && e.target.closest('[data-qv-zoom]');
    if (!box || e.pointerType === 'touch') return;
    const r = box.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100));
    const y = Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100));
    box.style.setProperty('--zx', x + '%');
    box.style.setProperty('--zy', y + '%');
    box.classList.add('is-zooming');
  });
  document.addEventListener('pointerout', e => {
    const box = e.target.closest && e.target.closest('[data-qv-zoom]');
    if (box && !box.contains(e.relatedTarget)) box.classList.remove('is-zooming');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeDrawer(); menu.classList.remove('is-open'); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-quickview][role="button"]')) {
      e.preventDefault();
      openQuickView(e.target.dataset.quickview);
    }
  });

  // Price filter for sarees
  $('[data-price-filter]').addEventListener('click', e => {
    const chip = e.target.closest('[data-range]');
    if (!chip) return;
    $$('[data-range]').forEach(c => { c.classList.toggle('is-active', c === chip); c.setAttribute('aria-selected', c === chip); });
    const [min, max] = chip.dataset.range.split('-').map(Number);
    renderSarees(min, max);
    if (hasGsap) {
      ScrollTrigger.refresh();
      if (!reduceMotion) gsap.from('[data-edit-track] .card', { x: 80, opacity: 0, duration: .9, stagger: .05, ease: 'power3.out' });
    }
  });

  // Menswear tabs
  function setMenTab(cat) {
    $$('[data-men-tabs] [data-cat]').forEach(c => {
      c.classList.toggle('is-active', c.dataset.cat === cat);
      c.setAttribute('aria-selected', c.dataset.cat === cat);
    });
    renderMen(cat);
    if (hasGsap) ScrollTrigger.refresh();
  }
  $('[data-men-tabs]').addEventListener('click', e => {
    const chip = e.target.closest('[data-cat]');
    if (chip) setMenTab(chip.dataset.cat);
  });

  // Newsletter (front-end only until a mailing backend is connected)
  $('[data-newsletter]').addEventListener('submit', e => {
    e.preventDefault();
    $('[data-newsletter-msg]').textContent = 'Thank you — you’re on the list.';
    e.target.reset();
  });

  // Split words for scroll-driven text reveal
  $$('[data-split-words]').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  });

  // Header: solid after scroll, hide on scroll down
  const header = $('[data-header]');
  let lastY = 0;
  function onScroll(y) {
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > 400 && y > lastY && !menu.classList.contains('is-open'));
    lastY = y;
  }
  addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  /* ---- Theme: light / dark toggle in the header (initial theme — dark by default — is set in <head>) ---- */
  const themeBtn = $('[data-theme-toggle]');
  const themeMeta = $('[data-theme-color]');
  function applyTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
    if (themeMeta) themeMeta.content = dark ? '#16100e' : '#f6f1e9';
  }
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    if (!reduceMotion) { root.classList.add('theme-anim'); setTimeout(() => root.classList.remove('theme-anim'), 500); }
    applyTheme(next);
    try { localStorage.setItem('ksic-theme', next); } catch (e) { /* private mode: theme still switches */ }
  });

  /* ---- Wayfinding: "you are here" pill, section menu, header highlight, back to top ---- */
  const wf = {
    ui: $('[data-wayfind-ui]'), toggle: $('[data-wayfind-toggle]'), menu: $('[data-wayfind-menu]'),
    list: $('[data-wayfind-list]'), num: $('[data-wayfind-num]'), label: $('[data-wayfind-label]'),
    bar: $('[data-wayfind-bar]'), top: $('[data-to-top]'), ring: $('[data-to-top-ring]')
  };
  const marks = $$('[data-wayfind]');
  /* Where a section really starts on the page. Pinned sections (heritage, showcase, menswear,
     burn test) are shifted by transforms after their pin, so a bounding box lies about them;
     a ScrollTrigger measured after the pins knows the true scroll position. */
  const topTriggers = new Map();
  function sectionTop(el) {
    if (el.id === 'top') return 0;
    if (hasGsap && !reduceMotion) {
      let st = topTriggers.get(el);
      if (!st) { st = ScrollTrigger.create({ trigger: el, start: 'top top', refreshPriority: -10 }); topTriggers.set(el, st); }
      return Math.max(0, st.start);
    }
    return Math.max(0, el.getBoundingClientRect().top + scrollY - 60);
  }
  const pad = n => String(n).padStart(2, '0');
  const hrefOf = el => el.dataset.wayfindHref || '#' + el.id;
  // Header links that stand for a section (Silk Care belongs to the Silk Guide link)
  const navFor = { '#silk-care': '#silk-guide' };
  $('[data-wayfind-total]').textContent = '/ ' + pad(marks.length);
  wf.list.innerHTML = marks.map((m, i) =>
    `<li><a href="${hrefOf(m)}" data-wayfind-link="${i}"><span>${pad(i + 1)}</span>${m.dataset.wayfind}</a></li>`).join('');
  const links = $$('[data-wayfind-link]', wf.list);
  let current = -1;

  function setMenu(open) {
    wf.menu.hidden = !open;
    wf.toggle.setAttribute('aria-expanded', String(open));
    if (open) (links[current] || links[0]).focus({ preventScroll: true });
  }
  wf.toggle.addEventListener('click', () => setMenu(wf.menu.hidden));
  wf.list.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', e => { if (!wf.menu.hidden && !wf.ui.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !wf.menu.hidden) { setMenu(false); wf.toggle.focus(); }
  });
  wf.top.addEventListener('click', () => {
    lenis ? lenis.scrollTo(0, { duration: 2 }) : scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    $('.header__logo').focus({ preventScroll: true });
  });

  function wayfind() {
    const y = scrollY, vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    const p = max > 0 ? Math.min(1, y / max) : 0;
    // Current section = the last one whose true top has passed 45% of the viewport
    let idx = 0;
    marks.forEach((m, i) => { if (sectionTop(m) <= y + vh * .45) idx = i; });
    if (idx !== current) {
      current = idx;
      wf.num.textContent = pad(idx + 1);
      wf.label.textContent = marks[idx].dataset.wayfind;
      wf.label.parentElement.classList.remove('is-swap');
      void wf.label.offsetWidth; // restart the swap animation
      wf.label.parentElement.classList.add('is-swap');
      links.forEach((l, i) => l.setAttribute('aria-current', String(i === idx)));
      const href = hrefOf(marks[idx]);
      $$('.nav a[href^="#"]').forEach(a => {
        const on = a.getAttribute('href') === (navFor[href] || href);
        a.classList.toggle('is-current', on);
        on ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current');
      });
    }
    wf.bar.style.transform = `scaleX(${p})`;
    wf.ring.style.strokeDashoffset = String(100 - p * 100);
    const show = y > vh * .6;
    wf.ui.classList.toggle('is-on', show);
    wf.top.classList.toggle('is-on', show);
    if (!show && !wf.menu.hidden) setMenu(false);
  }
  addEventListener('scroll', wayfind, { passive: true });
  addEventListener('resize', wayfind);
  wayfind();

  // "View" cursor over product images
  const cursor = $('[data-cursor]');
  if (matchMedia('(hover: hover)').matches) {
    const xTo = hasGsap ? gsap.quickTo(cursor, 'x', { duration: .45, ease: 'power3' }) : null;
    const yTo = hasGsap ? gsap.quickTo(cursor, 'y', { duration: .45, ease: 'power3' }) : null;
    let px = -1, py = -1;
    // Hit-test the pointer's last position: cards slide under a still mouse while
    // scrolling (horizontal edit, scrub easing), so pointermove alone misses it.
    const syncCursor = () => {
      if (px < 0) return;
      const el = document.elementFromPoint(px, py);
      const over = el && el.closest('.card__media') && !el.closest('.card__add');
      cursor.classList.toggle('is-active', !!over);
    };
    addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if (xTo) { xTo(px); yTo(py); } else cursor.style.transform = `translate(${px}px,${py}px)`;
      syncCursor();
    });
    document.addEventListener('pointerleave', () => { px = -1; cursor.classList.remove('is-active'); });
    if (hasGsap) gsap.ticker.add(syncCursor);
    else addEventListener('scroll', syncCursor, { passive: true });
  }

  /* ---------------- Hero slider ----------------
     Two banners cross-fade on a timer; each arrival replays a slow zoom-out (Ken Burns)
     and the copy reveal. Pauses off-screen, in a hidden tab, or via the pause button. */
  const heroSlider = (() => {
    const slides = $$('[data-slide]');
    const dots = $$('[data-slide-dot]');
    const pauseBtn = $('[data-slide-pause]');
    const INTERVAL = 7000;
    let idx = 0, timer = null, userPaused = false, offscreen = false, started = false;
    const motion = hasGsap && !reduceMotion;

    function playIn(slide) {
      if (!motion) return;
      gsap.fromTo(slide.querySelector('[data-hero-img]'), { scale: 1.16, opacity: 1 },
        { scale: 1, duration: INTERVAL / 1000 + 1.6, ease: 'none', overwrite: 'auto' });
      gsap.fromTo(slide.querySelectorAll('[data-hero-line]'), { yPercent: 110 },
        { yPercent: 0, duration: 1.2, stagger: .12, delay: .35, ease: 'expo.out', overwrite: 'auto' });
      gsap.fromTo(slide.querySelectorAll('[data-hero-reveal]'), { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: .9, stagger: .1, delay: .7, ease: 'power3.out', overwrite: 'auto' });
    }

    function runProgress() {
      const bar = dots[idx].querySelector('span');
      dots.forEach(d => { if (d !== dots[idx]) d.querySelector('span').style.transform = 'scaleX(0)'; });
      if (!motion) return;
      gsap.killTweensOf(bar);
      if (userPaused || offscreen) return;
      gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: INTERVAL / 1000, ease: 'none' });
    }

    function schedule() {
      clearTimeout(timer);
      if (!started || !motion || userPaused || offscreen || document.hidden) return;
      timer = setTimeout(() => go((idx + 1) % slides.length), INTERVAL);
    }

    function go(i) {
      if (i === idx) return;
      const prev = slides[idx], next = slides[i];
      prev.classList.remove('is-active'); prev.setAttribute('aria-hidden', 'true'); prev.inert = true;
      next.classList.add('is-active'); next.removeAttribute('aria-hidden'); next.inert = false;
      dots.forEach((d, k) => { d.classList.toggle('is-active', k === i); d.toggleAttribute('aria-current', k === i); });
      idx = i;
      playIn(next);
      runProgress();
      schedule();
    }

    dots.forEach(d => d.addEventListener('click', () => { go(+d.dataset.slideDot); }));
    pauseBtn.addEventListener('click', () => {
      userPaused = !userPaused;
      pauseBtn.classList.toggle('is-paused', userPaused);
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
      pauseBtn.innerHTML = userPaused
        ? '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor"/></svg>';
      runProgress(); schedule();
    });
    document.addEventListener('visibilitychange', schedule);
    new IntersectionObserver(([e]) => { offscreen = !e.isIntersecting; runProgress(); schedule(); }, { threshold: .15 })
      .observe($('[data-hero]'));
    if (!motion) pauseBtn.hidden = true;

    return {
      start() { started = true; if (motion) gsap.fromTo(slides[0].querySelector('[data-hero-img]'), { scale: 1.16 }, { scale: 1, duration: INTERVAL / 1000 + 1.6, ease: 'none' }); runProgress(); schedule(); },
      activeSlide: () => slides[idx]
    };
  })();

  /* =========================================================
     Silk threads: light-gold strands run down the empty left and
     right margins of every light section, never across copy
     ========================================================= */
  const silkHosts = $$('.heritage, .edit__head, .cats, .men, .guide, .burn__stage, .care, .showrooms, .newsletter');
  silkHosts.forEach(host => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'silk-side');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = ['left', 'right'].map(side =>
      `<g class="sway" data-side="${side}"><path class="is-main" data-draw pathLength="100"/><path class="is-thin" data-draw pathLength="100"/>` +
      (side === 'left' ? '<path class="is-glint" pathLength="100"/>' : '') + '</g>').join('');
    host.prepend(svg);
  });

  // Layout position (ignores transforms, so entrance animations don't skew the margins)
  const pageBox = el => { let x = 0, y = 0; for (let n = el; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y }; };
  const blockOf = el => { while (el.parentElement && getComputedStyle(el).display.startsWith('inline')) el = el.parentElement; return el; };

  // Horizontal extent of all copy inside a host, relative to the host
  function copyExtent(host, W) {
    const origin = pageBox(host).x, seen = new Set();
    let min = Infinity, max = -Infinity;
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      // decorative background words sweep the full width by design; they don't define the margins
      if (!node.textContent.trim() || node.parentElement.closest('svg, .showcase__bg-title')) continue;
      const block = blockOf(node.parentElement);
      if (seen.has(block) || !block.offsetWidth) continue;
      seen.add(block);
      const left = pageBox(block).x - origin, right = left + block.offsetWidth;
      if (right < 0 || left > W) continue; // off-screen rail items
      min = Math.min(min, left); max = Math.max(max, right);
    }
    return [min, max];
  }

  // A vertical S-curve kept inside [x0, x0 + zone]; control points scale with segment
  // length so joins stay smooth, and never leave the zone (convex-hull property)
  function silkWave(x0, zone, H, seed, amp, step) {
    let s = seed;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const cx = x0 + zone / 2, a = zone * amp, f = n => n.toFixed(1);
    let y = -40, dir = rnd() < .5 ? 1 : -1, d = `M${f(cx)} ${y}`;
    while (y < H + 40) {
      const len = step * (.75 + rnd() * .5), b = a * 1.3 * len / step, x = cx + dir * b;
      d += ` C${f(x)} ${f(y + len / 3)}, ${f(x)} ${f(y + 2 * len / 3)}, ${f(cx)} ${f(y + len)}`;
      y += len; dir = -dir;
    }
    return d;
  }

  function buildSilk() {
    silkHosts.forEach((host, i) => {
      const svg = host.querySelector(':scope > .silk-side');
      const W = host.offsetWidth, H = host.offsetHeight;
      if (!W || !H) return;
      const [min, max] = copyExtent(host, W);
      const zones = {
        left: [0, Math.min(min - 18, 150)],
        right: [W - Math.min(W - max - 18, 150), Math.min(W - max - 18, 150)]
      };
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.height = `${H}px`;
      svg.querySelectorAll('.sway').forEach((g, k) => {
        const [x0, zone] = zones[g.dataset.side];
        g.style.display = zone >= 22 ? '' : 'none';
        if (zone < 22) return;
        const main = silkWave(x0, zone, H, 17 + i * 31 + k * 7, .3, 540);
        g.querySelector('.is-main').setAttribute('d', main);
        g.querySelector('.is-thin').setAttribute('d', silkWave(x0, zone, H, 5 + i * 13 + k * 11, .22, 380));
        g.querySelector('.is-glint')?.setAttribute('d', main);
      });
    });
  }
  buildSilk();
  let silkRaf;
  addEventListener('resize', () => { cancelAnimationFrame(silkRaf); silkRaf = requestAnimationFrame(buildSilk); });
  document.fonts?.ready.then(buildSilk);
  addEventListener('load', buildSilk);
  if (hasGsap) ScrollTrigger.addEventListener('refresh', buildSilk);

  /* =========================================================
     Motion (GSAP + ScrollTrigger + Lenis)
     ========================================================= */
  if (!hasGsap || reduceMotion) {
    $('.loader')?.remove();
    document.documentElement.classList.add('no-motion');
    heroSlider.start();
    $$('.iron-card').forEach(c => c.classList.add('is-in'));
    $$('[data-care-step]').forEach(li => li.classList.add('is-on'));
    $$('[data-showcase-img]').forEach((img, i) => img.classList.toggle('is-active', i === 0));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    // Lenis cancels wheel/touch while stopped (overlay open); let overlays scroll natively.
    lenis = new Lenis({
      lerp: 0.09, smoothWheel: true,
      prevent: node => !!(node.closest && node.closest('.modal, .drawer, .mobile-menu'))
    });
    lenis.on('scroll', ScrollTrigger.update);
    lenis.on('scroll', ({ scroll }) => onScroll(scroll));
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ---- Preloader + hero intro ---- */
  const heroImgs = $$('.hero img');
  const counter = { v: 0 };
  const loaded = Promise.all(heroImgs.map(img => img.complete ? 1 : new Promise(r => { img.onload = img.onerror = r; })));
  const minTime = new Promise(r => setTimeout(r, 1400));

  const firstSlide = $('[data-slide="0"]');
  gsap.set('[data-hero-line]', { yPercent: 110 });
  gsap.set('[data-hero-reveal]', { y: 20, opacity: 0 });
  gsap.set(firstSlide.querySelector('[data-hero-img]'), { opacity: 0 });
  gsap.set('.hero__veil', { opacity: 0 });

  const countTween = gsap.to(counter, {
    v: 90, duration: 1.4, ease: 'power2.out',
    onUpdate: () => { $('[data-count]').textContent = Math.round(counter.v); gsap.set('.loader__line span', { scaleX: counter.v / 100 }); }
  });

  Promise.all([loaded, minTime]).then(() => {
    countTween.kill();
    gsap.timeline({ onComplete: () => { $('.loader').remove(); lenis && lenis.start(); ScrollTrigger.refresh(); } })
      .to(counter, { v: 100, duration: .35, onUpdate: () => { $('[data-count]').textContent = Math.round(counter.v); gsap.set('.loader__line span', { scaleX: counter.v / 100 }); } })
      .to('.loader__inner', { opacity: 0, y: -20, duration: .5, ease: 'power2.in' })
      .to('.loader__panel--top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '<.3')
      .to('.loader__panel--bottom', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
      .to(firstSlide.querySelector('[data-hero-img]'), { opacity: 1, duration: 1.4, ease: 'power2.out' }, '-=.7')
      .add(() => heroSlider.start(), '<')
      .to('.hero__veil', { opacity: 1, duration: 1.2, ease: 'power2.out' }, '<.2')
      .to(firstSlide.querySelectorAll('[data-hero-line]'), { yPercent: 0, duration: 1.2, stagger: .12, ease: 'expo.out' }, '<.1')
      .to([...firstSlide.querySelectorAll('[data-hero-reveal]'), '.hero__dots', '.hero__scroll'], { y: 0, opacity: 1, duration: .9, stagger: .1, ease: 'power3.out' }, '<.4')
      .from('.header__logo, .nav > *, .header__menu-btn', { y: -24, opacity: 0, duration: .9, stagger: .05, ease: 'power3.out' }, '<');
  });

  /* ---- Hero: mouse parallax (on inner images) + scroll parallax (on wrappers) ---- */
  const hero = $('[data-hero]');
  // Banner drifts a little against the pointer — a quiet sense of depth behind the copy
  const heroX = gsap.quickTo('[data-hero-img]', 'x', { duration: 1.4, ease: 'power3' });
  const heroY = gsap.quickTo('[data-hero-img]', 'y', { duration: 1.4, ease: 'power3' });
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    heroX(-((e.clientX - r.left) / r.width - .5) * 24);
    heroY(-((e.clientY - r.top) / r.height - .5) * 16);
  });

  const heroST = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
  // Hero stays pinned (no extra spacing) and shrinks into a rounded card
  // while the next section slides up over it.
  gsap.timeline({
    scrollTrigger: { trigger: '[data-hero-wrap]', start: 'top top', end: 'bottom top', pin: true, pinSpacing: false, scrub: true }
  })
    .to(hero, { scale: .86, borderRadius: 28, ease: 'none' }, 0)
    .to('.hero__dim', { opacity: 1, ease: 'none' }, 0);
  // Scroll parallax: photo sinks slower than the page, copy lifts away faster
  gsap.to('[data-hero-media]', { yPercent: 14, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hero__copy', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: { ...heroST, end: 'bottom 30%' } });
  gsap.to('.hero__legacy', { y: -60, opacity: 0, ease: 'none', scrollTrigger: { ...heroST, end: 'bottom 50%' } });

  /* ---- Word-by-word text reveal ---- */
  $$('[data-split-words]').forEach(el => {
    gsap.to(el.querySelectorAll('.w'), {
      opacity: 1, stagger: .05, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: true }
    });
  });

  /* ---- Count-up stats ---- */
  $$('[data-countup]').forEach(el => {
    const end = +el.dataset.countup;
    const o = { v: el.hasAttribute('data-plain') ? Math.max(0, end - 120) : 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(o, {
        v: end, duration: 2, ease: 'power3.out',
        onUpdate: () => { el.textContent = Math.round(o.v) + (el.dataset.suffix || ''); }
      })
    });
  });

  /* ---- Heritage year drift + generic parallax ---- */
  $$('[data-parallax]').forEach(el => {
    gsap.to(el, { yPercent: +el.dataset.parallax * 100, ease: 'none', scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---- Image clip reveals + inner parallax ---- */
  function wireImages(scope = document) {
    $$('.reveal-img', scope).forEach(el => {
      gsap.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    $$('[data-parallax-img]', scope).forEach(img => {
      gsap.fromTo(img, { yPercent: -8 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }
  wireImages();

  /* ---- Heritage timeline: gold thread draws across, milestones rise in turn ---- */
  const thread = $('[data-legacy-thread]');
  const threadLen = thread.getTotalLength();
  gsap.fromTo(thread, { strokeDasharray: threadLen, strokeDashoffset: threadLen }, {
    strokeDashoffset: 0, ease: 'none',
    scrollTrigger: { trigger: '[data-legacy]', start: 'top 75%', end: 'bottom 60%', scrub: 1 }
  });
  $$('[data-legacy-item]').forEach((item, i) => {
    gsap.from(item.querySelector('.legacy__year'), {
      xPercent: -40, opacity: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: item, start: 'top 85%' }
    });
    gsap.from(item.querySelectorAll('h3, p'), {
      y: 30, opacity: 0, duration: 1, stagger: .1, delay: .25, ease: 'power3.out',
      scrollTrigger: { trigger: item, start: 'top 85%' }
    });
    // Each card drifts at its own pace for a layered parallax
    gsap.to(item, {
      y: (i % 2 ? -60 : -20), ease: 'none',
      scrollTrigger: { trigger: '[data-legacy]', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* ---- Menswear holds and shrinks while the Silk Guide slides up over it ---- */
  gsap.timeline({
    scrollTrigger: {
      trigger: '[data-men-wrap]', start: 'bottom bottom',
      endTrigger: '#silk-guide', end: 'top top',
      pin: true, pinSpacing: false, scrub: true, invalidateOnRefresh: true
    }
  })
    .to('.men', { scale: .88, borderRadius: 32, ease: 'none' }, 0)
    .to('.men__dim', { opacity: 1, ease: 'none' }, 0);

  /* ---- Heritage holds and shrinks while the showcase slides up over it ---- */
  gsap.timeline({
    scrollTrigger: {
      trigger: '[data-heritage-wrap]', start: 'bottom bottom',
      endTrigger: '[data-showcase]', end: 'top top',
      pin: true, pinSpacing: false, scrub: true
    }
  })
    .to('.heritage', { scale: .88, borderRadius: 32, ease: 'none' }, 0)
    .to('.heritage__dim', { opacity: 1, ease: 'none' }, 0);

  /* ---- Product showcase: pinned, step-through (Insta360-style) ---- */
  const showcase = $('[data-showcase]');
  const scImgs = $$('[data-showcase-img]');
  const scFeat = $$('[data-showcase-feature]');
  gsap.set(scImgs, { transition: 'opacity .9s cubic-bezier(.22,1,.36,1), transform 1.4s cubic-bezier(.22,1,.36,1)' });
  let scIndex = 0;
  function setStep(i) {
    if (i === scIndex) return;
    scIndex = i;
    scImgs.forEach((img, k) => img.classList.toggle('is-active', k === i));
    scFeat.forEach((li, k) => li.classList.toggle('is-active', k === i));
    $('[data-showcase-design]').textContent = scImgs[i].dataset.design;
    paintStage(i);
  }
  // Each step re-tints the stage to the saree on show, so the change reads at a glance
  function paintStage(i) {
    const stage = $('.showcase__stage');
    stage.style.setProperty('--sc-bg', scImgs[i].dataset.bg);
    stage.style.setProperty('--sc-glow', scImgs[i].dataset.glow);
  }
  paintStage(0);

  // matchMedia re-creates these pins on breakpoint change, after the triggers below them;
  // refreshPriority keeps them measured first so later sections get correct pin spacing.
  const mm = gsap.matchMedia();
  // The pin runs one extra viewport (HOLD) after the feature steps. During it the stage
  // shrinks into a card while the saree edit — pulled up by -100vh — slides over it.
  const HOLD = 100;
  const shrinkInto = (tl, at, dur) => tl
    .to('.showcase__stage', { scale: .88, borderRadius: 32, ease: 'none', duration: dur }, at)
    .to('.showcase__dim', { opacity: 1, ease: 'none', duration: dur }, at);

  mm.add('(min-width: 861px)', () => {
    const STEPS = 320;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: showcase, start: 'top top', end: `+=${STEPS + HOLD}%`, pin: '.showcase__stage', scrub: 1, refreshPriority: 2,
        onUpdate: self => {
          const p = Math.min(1, self.progress * (STEPS + HOLD) / STEPS);
          $('[data-showcase-bar]').style.transform = `scaleX(${p})`;
          setStep(Math.min(scFeat.length - 1, Math.floor(Math.max(0, p - .08) / .92 * scFeat.length)));
        }
      }
    });
    tl.fromTo('.showcase__frame', { scale: .72, rotate: -4 }, { scale: 1, rotate: 0, ease: 'power2.out', duration: .15 })
      .fromTo('.showcase__ring', { scale: .9, opacity: 0 }, { scale: 1, opacity: 1, duration: .15 }, 0)
      .fromTo('.showcase__bg-title', { xPercent: -30 }, { xPercent: -70, ease: 'none', duration: 1 }, 0)
      .fromTo('.showcase__features', { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: .1 }, .02)
      .fromTo('.showcase__spec', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .1 }, .05)
      .to('.showcase__frame', { y: -20, duration: .85, ease: 'none' }, .15);
    shrinkInto(tl, 1, HOLD / STEPS);
  });
  mm.add('(max-width: 860px)', () => {
    const STEPS = 240;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: showcase, start: 'top top', end: `+=${STEPS + HOLD}%`, pin: '.showcase__stage', scrub: true, refreshPriority: 2,
        onUpdate: self => {
          const p = Math.min(1, self.progress * (STEPS + HOLD) / STEPS);
          $('[data-showcase-bar]').style.transform = `scaleX(${p})`;
          setStep(Math.min(scFeat.length - 1, Math.floor(p * scFeat.length)));
        }
      }
    });
    tl.to({}, { duration: 1 });
    shrinkInto(tl, 1, HOLD / STEPS);
  });

  /* ---- Saree edit: vertical scroll drives horizontal track ---- */
  mm.add('(min-width: 861px)', () => {
    const track = $('[data-edit-track]');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    // Cards lean into the direction of travel, springing back when scrolling stops
    const lean = gsap.quickTo(track, 'skewX', { duration: .6, ease: 'power3' });
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '[data-edit-pin]', start: 'top 12%', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, refreshPriority: 1,
        onUpdate: self => {
          $('[data-edit-bar]').style.transform = `scaleX(${self.progress})`;
          lean(gsap.utils.clamp(-6, 6, -self.getVelocity() / 400));
        },
        onScrubComplete: () => lean(0)
      }
    });
    gsap.from('[data-edit-track] .card', {
      x: 160, opacity: 0, rotate: 3, duration: 1.4, stagger: .08, ease: 'expo.out',
      scrollTrigger: { trigger: '[data-edit-pin]', start: 'top 80%' }
    });
  });
  mm.add('(max-width: 860px)', () => {
    const pin = $('[data-edit-pin]');
    pin.style.overflowX = 'auto';
    pin.addEventListener('scroll', () => {
      const p = pin.scrollLeft / Math.max(1, pin.scrollWidth - pin.clientWidth);
      $('[data-edit-bar]').style.transform = `scaleX(${p})`;
    }, { passive: true });
    return () => { pin.style.overflowX = ''; };
  });

  /* ---- Banner parallax ---- */
  gsap.fromTo('[data-banner-img]', { yPercent: -5, scale: 1.06 }, {
    yPercent: 5, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '[data-banner]', start: 'top bottom', end: 'bottom top', scrub: true }
  });

  /* ---- Headings: each line rises out of a mask ---- */
  $$('.section-title, .newsletter h2, .showcase__intro h2').forEach(el => {
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(l => `<span class="tline"><span>${l.trim()}</span></span>`).join('');
    gsap.from(el.querySelectorAll('.tline > span'), {
      yPercent: 115, rotate: 4, duration: 1.3, stagger: .12, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* ---- Eyebrows wipe in from the left ---- */
  $$('.eyebrow').filter(el => !el.closest('[data-hero], .modal')).forEach(el => {
    gsap.fromTo(el, { clipPath: 'inset(0 100% 0 0)', x: -12 }, {
      clipPath: 'inset(0 0% 0 0)', x: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 92%' }
    });
  });

  /* ---- Supporting copy + controls fade up ---- */
  const fadeUp = (targets, trigger, opts = {}) => gsap.from(targets, {
    y: 40, opacity: 0, duration: 1, stagger: .08, ease: 'power3.out',
    scrollTrigger: { trigger, start: 'top 88%' }, ...opts
  });
  fadeUp('.stat', '.stats', { stagger: .12 });
  fadeUp('.edit__head .chip', '.edit__head', { y: 20, stagger: .05 });
  fadeUp('.men__head .chip', '.men__head', { y: 20, stagger: .05 });
  fadeUp('.showcase__intro > p:not(.eyebrow)', showcase);
  fadeUp('.banner__content > :not(.eyebrow)', '[data-banner]', { x: -50, y: 0, stagger: .12, scrollTrigger: { trigger: '[data-banner]', start: 'top 65%' } });
  fadeUp('.care__sub', '.care__head');
  fadeUp('.care__title', '.care__grid', { x: -30, y: 0, stagger: .15 });
  fadeUp(['.showrooms__grid .muted', '.showrooms__grid .btn'], '.showrooms__grid');
  fadeUp(['.newsletter p:not(.newsletter__msg)', '.newsletter__form'], '.newsletter');
  fadeUp('.footer__grid > *', '.footer', { stagger: .1, scrollTrigger: { trigger: '.footer', start: 'top 85%' } });

  /* ---- Heritage year: digits sweep in from the left while scrolling ---- */
  const year = $('.heritage__year');
  year.innerHTML = [...year.textContent.trim()].map(d => `<span class="d">${d}</span>`).join('');
  gsap.fromTo(year.querySelectorAll('.d'),
    { xPercent: -220, opacity: 0, rotate: -14 },
    { xPercent: 0, opacity: 1, rotate: 0, stagger: .12, ease: 'power3.out',
      scrollTrigger: { trigger: '.heritage', start: 'top 90%', end: 'top 20%', scrub: 1 } });

  /* ---- Category tiles + menswear cards rise in batches ---- */
  fadeUp('.cat__label', '.cats__grid', { y: 30, stagger: .1, delay: .4 });
  gsap.from('.cat img', { scale: 1.25, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.cats__grid', start: 'top 85%' } });
  const menCards = $$('[data-men-grid] .card');
  gsap.set(menCards, { y: 70, opacity: 0 });
  ScrollTrigger.batch(menCards, {
    start: 'top 92%', once: true,
    onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, duration: 1.1, stagger: .1, ease: 'expo.out', overwrite: true })
  });

  /* ---- Marquee reacts to scroll speed and direction ---- */
  const marquee = $('[data-marquee]');
  marquee.style.animation = 'none';
  const marqueeTween = gsap.to(marquee, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
  const skewTo = gsap.quickTo(marquee, 'skewX', { duration: .5, ease: 'power3' });
  ScrollTrigger.create({
    trigger: '.marquee', start: 'top bottom', end: 'bottom top',
    onUpdate: self => {
      const v = self.getVelocity();
      gsap.to(marqueeTween, { timeScale: gsap.utils.clamp(-6, 6, (self.direction || 1) * (1 + Math.abs(v) / 300)), duration: .3, overwrite: true });
      skewTo(gsap.utils.clamp(-12, 12, -v / 200));
    }
  });
  // Ease the marquee back to its idle speed once scrolling stops
  ScrollTrigger.addEventListener('scrollEnd', () => {
    gsap.to(marqueeTween, { timeScale: 1, duration: 1, overwrite: true });
    skewTo(0);
  });
  gsap.from('.showrooms__list li', {
    y: 30, opacity: 0, stagger: .05, duration: .8, ease: 'power3.out',
    scrollTrigger: { trigger: '[data-showrooms]', start: 'top 85%' }
  });

  /* ---- Footer word rises ---- */
  gsap.fromTo('.footer__word', { yPercent: 60 }, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ---- Silk guide: pinned burn test ---- */
  (() => {
    const thread = $('[data-burn-thread]');
    const char = $('[data-burn-char]');
    const flame = $('[data-burn-flame]');
    const steps = $$('[data-burn-step]');
    const powder = $('[data-burn-powder]');
    const L = thread.getTotalLength();
    const NS = 'http://www.w3.org/2000/svg';

    // Powder particles, created once around the residue
    const dots = Array.from({ length: 34 }, () => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', 385 + gsap.utils.random(-14, 14));
      c.setAttribute('cy', 250 + gsap.utils.random(-5, 5));
      c.setAttribute('r', gsap.utils.random(1.2, 3.4));
      powder.appendChild(c);
      return c;
    });

    gsap.set(thread, { strokeDasharray: L, strokeDashoffset: L });
    gsap.set(char, { strokeDasharray: `${L} ${L}`, strokeDashoffset: -L });
    gsap.set(flame, { opacity: 0 });
    gsap.set('[data-burn-smoke] path', { opacity: 0, strokeDasharray: 120, strokeDashoffset: 120 });
    gsap.set(['[data-burn-smell]', '[data-burn-powder-tag]'], { opacity: 0, y: 10 });
    gsap.set('[data-burn-residue]', { opacity: 0, scale: 0, transformOrigin: '385px 250px' });
    gsap.set(dots, { opacity: 0 });

    // Flicker lives on the flame's inner paths so it never fights the position tween
    gsap.to('[data-burn-flame] path', { scaleY: 1.15, scaleX: .9, transformOrigin: '50% 100%', duration: .18, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    const burn = { p: 1 };
    const placeFlame = () => {
      const pt = thread.getPointAtLength(burn.p * L);
      gsap.set(flame, { x: pt.x, y: pt.y + 2 });
      char.style.strokeDashoffset = -burn.p * L;
    };
    placeFlame();

    let cur = 0;
    const setBurnStep = i => {
      if (i === cur) return;
      cur = i;
      steps.forEach((li, k) => li.classList.toggle('is-active', k === i));
    };

    // Pin runs one extra viewport (HOLD) after the four steps: the stage shrinks into a card
    // while the care section — pulled up by -100vh — slides over it.
    const STEPS = 300, HOLD = 100;
    const burnTl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '[data-burn]', start: 'top top', end: `+=${STEPS + HOLD}%`, pin: '.burn__stage', scrub: 1,
        onUpdate: self => {
          const p = Math.min(1, self.progress * (STEPS + HOLD) / STEPS);
          $('[data-burn-bar]').style.transform = `scaleX(${p})`;
          setBurnStep(Math.min(steps.length - 1, Math.floor(p * steps.length)));
        }
      }
    });
    burnTl
      // 01 pull the thread out of the swatch
      .fromTo('[data-burn-swatch]', { x: 20 }, { x: 0, duration: .6 }, 0)
      .to(thread, { strokeDashoffset: 0, duration: .8, ease: 'power1.inOut' }, .1)
      // 02 flame travels along the thread, charring it
      .to(flame, { opacity: 1, duration: .1 }, 1)
      .to(burn, { p: 0, duration: 1, onUpdate: placeFlame }, 1.05)
      // 03 smoke — smells like burning hair
      .to(flame, { opacity: 0, duration: .15 }, 2.05)
      .to('[data-burn-smoke] path', { opacity: 1, strokeDashoffset: 0, y: -16, stagger: .08, duration: .5 }, 2)
      .to('[data-burn-smell]', { opacity: 1, y: 0, duration: .25, ease: 'power2.out' }, 2.2)
      // 04 residue crushes to powder
      .to(['[data-burn-smoke] path', '[data-burn-smell]'], { opacity: 0, duration: .2 }, 3)
      .to([thread, char], { opacity: 0, duration: .25 }, 3)
      .to('[data-burn-residue]', { opacity: 1, scale: 1, duration: .25, ease: 'back.out(2)' }, 3.05)
      .set(dots, { opacity: 1 }, 3.4)
      .to('[data-burn-residue]', { opacity: 0, scale: .6, duration: .2 }, 3.4)
      .to(dots, {
        x: () => gsap.utils.random(-70, 70), y: () => gsap.utils.random(4, 26), opacity: .7,
        duration: .45, stagger: { each: .005, from: 'center' }, ease: 'power2.out'
      }, 3.4)
      .to('[data-burn-powder-tag]', { opacity: 1, y: 0, duration: .2, ease: 'power2.out' }, 3.55)
      .to({}, { duration: .1 });
    const D = burnTl.duration();
    burnTl
      .to('.burn__stage', { scale: .88, borderRadius: 32, duration: D * HOLD / STEPS }, D)
      .to('.burn__dim', { opacity: 1, duration: D * HOLD / STEPS }, D);
  })();

  /* ---- Silk guide: care timeline ---- */
  gsap.fromTo('[data-care-line]', { scaleY: 0 }, {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '[data-care-steps]', start: 'top 62%', end: 'bottom 62%', scrub: true }
  });
  $$('[data-care-step]').forEach(li => {
    gsap.from(li.querySelectorAll('div, .temp'), { x: 30, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 85%' } });
    ScrollTrigger.create({
      trigger: li, start: 'top+=13 62%', // dot centre meets the line tip
      onEnter: () => li.classList.add('is-on'),
      onLeaveBack: () => li.classList.remove('is-on')
    });
  });
  $$('[data-care-reveal]').forEach(el => {
    gsap.from(el, {
      y: 50, opacity: 0, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', onEnter: () => el.classList.add('is-in') }
    });
  });

  /* ---- Side silk threads unspool as each section scrolls past ---- */
  silkHosts.forEach(host => {
    const pinned = host.matches('.burn__stage');
    gsap.to(host.querySelectorAll(':scope > .silk-side [data-draw]'), {
      strokeDashoffset: 0, ease: 'none', stagger: .1,
      scrollTrigger: { trigger: host, start: 'top 90%', end: pinned ? 'top 10%' : 'bottom 90%', scrub: 1 }
    });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
})();

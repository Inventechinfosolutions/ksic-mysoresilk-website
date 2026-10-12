/* KSIC Mysore Silk — version 3 interactions */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    }
  };

  /* ---------- header: solid on scroll ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- search ---------- */
  const searchBar = $('.search-bar');
  const toggleSearch = (open) => {
    searchBar.hidden = !open;
    header.classList.toggle('is-solid', open || window.scrollY > 40);
    if (open) $('input', searchBar).focus();
  };
  $('.search-toggle').addEventListener('click', () => toggleSearch(searchBar.hidden));
  $('[data-search-close]').addEventListener('click', () => toggleSearch(false));
  searchBar.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('input', searchBar).value.trim();
    if (q) showToast(`Searching for “${q}”…`);
  });

  /* ---------- mobile drawer ---------- */
  const drawer = $('#drawer');
  const menuBtn = $('.menu-toggle');
  const setDrawer = (open) => {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('.drawer-nav a', drawer).focus();
    else menuBtn.focus({ preventScroll: true });
  };
  menuBtn.addEventListener('click', () => setDrawer(true));
  $$('[data-drawer-close]', drawer).forEach((el) => el.addEventListener('click', () => setDrawer(false)));
  $$('.drawer-nav a, .drawer-link', drawer).forEach((a) => a.addEventListener('click', () => setDrawer(false)));

  /* ---------- hero slider ---------- */
  const slides = $$('.hero-slide');
  const dots = $$('.hero-dots button');
  const bar = $('.hero-progress span');
  const DURATION = 7000;
  let current = 0;
  let timer = 0;
  let startedAt = 0;
  let raf = 0;

  const goTo = (i) => {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      s.classList.toggle('is-active', n === current);
      s.setAttribute('aria-hidden', String(n !== current));
      s.inert = n !== current;
    });
    dots.forEach((d, n) => d.setAttribute('aria-selected', String(n === current)));
    restart();
  };
  const tick = (now) => {
    const p = Math.min((now - startedAt) / DURATION, 1);
    bar.style.transform = `scaleX(${(current + p) / slides.length})`;
    if (p < 1) raf = requestAnimationFrame(tick);
  };
  const restart = () => {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    if (reduceMotion) {
      bar.style.transform = `scaleX(${(current + 1) / slides.length})`;
      return;
    }
    startedAt = performance.now();
    raf = requestAnimationFrame(tick);
    timer = setTimeout(() => goTo(current + 1), DURATION);
  };
  dots.forEach((d, n) => d.addEventListener('click', () => goTo(n)));
  $('[data-hero-prev]').addEventListener('click', () => goTo(current - 1));
  $('[data-hero-next]').addEventListener('click', () => goTo(current + 1));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(timer); cancelAnimationFrame(raf); } else restart();
  });

  // swipe on touch screens
  let touchX = null;
  const hero = $('.hero');
  hero.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });
  // start with no slide active so the first slide animates in on load
  slides[0].classList.remove('is-active');
  let heroStarted = false;
  const startHero = () => { if (!heroStarted) { heroStarted = true; goTo(0); } };
  requestAnimationFrame(() => requestAnimationFrame(startHero));
  setTimeout(startHero, 400); // fallback when frames are paused (background tab)

  /* ---------- product carousel ---------- */
  const track = $('.carousel-track');
  const prev = $('[data-carousel-prev]');
  const next = $('[data-carousel-next]');
  const step = () => {
    const item = $('.product', track);
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return item ? item.getBoundingClientRect().width + gap : track.clientWidth;
  };
  const updateArrows = () => {
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', updateArrows, { passive: true });
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
  });
  window.addEventListener('resize', updateArrows);
  updateArrows();

  /* ---------- wishlist + bag ---------- */
  const wishBadge = $('[data-wish-count]');
  const cartBadge = $('[data-cart-count]');
  let wishlist = new Set(store.get('ksic3-wishlist', []));
  let cartCount = store.get('ksic3-cart', 0);

  const bump = (el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
  const renderCounts = () => {
    wishBadge.textContent = wishlist.size;
    wishBadge.hidden = wishlist.size === 0;
    cartBadge.textContent = cartCount;
  };

  $$('.wish').forEach((btn) => {
    const id = btn.dataset.id;
    btn.setAttribute('aria-pressed', String(wishlist.has(id)));
    btn.addEventListener('click', () => {
      const on = !wishlist.has(id);
      on ? wishlist.add(id) : wishlist.delete(id);
      btn.setAttribute('aria-pressed', String(on));
      store.set('ksic3-wishlist', [...wishlist]);
      renderCounts();
      bump(wishBadge);
      const name = $('h3', btn.closest('.product')).textContent;
      showToast(on ? `${name} saved to your wishlist` : `${name} removed from your wishlist`);
    });
  });
  $$('.add').forEach((btn) => btn.addEventListener('click', () => {
    cartCount += 1;
    store.set('ksic3-cart', cartCount);
    renderCounts();
    bump(cartBadge);
    showToast(`${btn.dataset.name} added to your bag`);
  }));
  renderCounts();

  /* ---------- toast ---------- */
  const toast = $('.toast');
  let toastTimer = 0;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2600);
  }

  /* ---------- video modal ---------- */
  const modal = $('#video-modal');
  const video = $('video', modal);
  let lastFocus = null;
  const openVideo = () => {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal-close', modal).focus();
    video.play().catch(() => {});
  };
  const closeVideo = () => {
    video.pause();
    modal.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus({ preventScroll: true });
  };
  $$('[data-video-open]').forEach((b) => b.addEventListener('click', openVideo));
  $$('[data-video-close]', modal).forEach((b) => b.addEventListener('click', closeVideo));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeVideo();
    else if (drawer.classList.contains('is-open')) setDrawer(false);
    else if (!searchBar.hidden) toggleSearch(false);
  });

  /* ---------- newsletter ---------- */
  const form = $('.news-form');
  const msg = $('.news-msg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input', form);
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    form.classList.toggle('is-invalid', !ok);
    msg.classList.toggle('is-error', !ok);
    msg.textContent = ok ? 'Thank you — welcome to the KSIC journey.' : 'Please enter a valid email address.';
    if (ok) form.reset();
    else input.focus();
  });

  /* ---------- reveal on scroll ---------- */
  const reveals = $$('.reveal, .section-band');
  const REVEAL_CLASSES = ['reveal', 'reveal--left', 'reveal--zoom', 'reveal--clip', 'reveal--clip-right'];
  const settle = (el, delay) => {
    // once the entrance has played, drop the reveal styles so hover effects work normally
    if (!el.classList.contains('reveal')) return;
    setTimeout(() => {
      el.classList.remove(...REVEAL_CLASSES, 'is-in');
      el.style.transitionDelay = '';
    }, delay + 1500);
  };
  if ('IntersectionObserver' in window && !reduceMotion) {
    // a fully clipped element never reports as intersecting, so wipe-in images watch their parent;
    // carousel cards watch the track so cards scrolled off to the side are ready when swiped in
    const watchTarget = (el) => {
      if (el.matches('.reveal--clip, .reveal--clip-right')) return el.parentElement;
      return el.closest('.carousel-track') || el;
    };
    const waiting = new Map();
    reveals.forEach((el) => {
      const target = watchTarget(el);
      waiting.set(target, [...(waiting.get(target) || []), el]);
    });
    const io = new IntersectionObserver((entries) => {
      // stagger whatever enters together, in reading order
      entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left))
        .flatMap((entry) => {
          io.unobserve(entry.target);
          const els = waiting.get(entry.target) || [];
          waiting.delete(entry.target);
          return els;
        })
        .forEach((el, i) => {
          const delay = Math.min(i, 6) * 90;
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add('is-in');
          settle(el, delay);
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .15 });
    waiting.forEach((_, target) => io.observe(target));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  $('[data-year]').textContent = new Date().getFullYear();
})();

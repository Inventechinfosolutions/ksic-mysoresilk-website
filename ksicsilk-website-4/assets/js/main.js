(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Toast ---------- */
  const toastEl = $('.toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }

  /* ---------- Theme switch ---------- */
  const root = document.documentElement;
  const themeInputs = $$('.theme-switch input');
  const current = root.dataset.theme === 'yellow' ? 'yellow' : 'white';
  themeInputs.forEach(input => {
    input.checked = input.value === current;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      if (input.value === 'yellow') root.dataset.theme = 'yellow';
      else delete root.dataset.theme;
      try { localStorage.setItem('ksic-theme', input.value); } catch (e) {}
    });
  });

  /* ---------- Sticky header shadow ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile drawer ---------- */
  const drawer = $('#drawer');
  const menuBtn = $('.menu-btn');
  function setDrawer(open) {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('.drawer-nav a', drawer).focus();
    else menuBtn.focus({ preventScroll: true });
  }
  menuBtn.addEventListener('click', () => setDrawer(true));
  $$('[data-close-drawer], .drawer-nav a', drawer).forEach(el =>
    el.addEventListener('click', () => setDrawer(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) setDrawer(false);
  });

  /* ---------- Search panel ---------- */
  const searchBtn = $('.search-btn');
  const searchPanel = $('#search-panel');
  searchBtn.addEventListener('click', () => {
    const open = searchPanel.hidden;
    searchPanel.hidden = !open;
    searchBtn.setAttribute('aria-expanded', String(open));
    if (open) $('input', searchPanel).focus();
  });
  searchPanel.addEventListener('submit', e => {
    e.preventDefault();
    const q = $('input', searchPanel).value.trim();
    if (!q) return;
    toast(`Showing sarees for “${q}”`);
    searchPanel.hidden = true;
    searchBtn.setAttribute('aria-expanded', 'false');
    document.getElementById('arrivals').scrollIntoView();
  });

  /* ---------- Carousel ---------- */
  $$('.carousel').forEach(car => {
    const track = $('.car-track', car);
    const prev = $('.prev', car);
    const next = $('.next', car);
    const step = () => {
      const item = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item ? item.getBoundingClientRect().width + gap : track.clientWidth;
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- Wishlist & bag ---------- */
  const wishBadge = $('[data-wish-count]');
  const cartBadge = $('[data-cart-count]');
  let cart = 0;

  const bump = el => {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  };
  const syncWish = () => {
    const n = $$('.wish.is-on').length;
    wishBadge.textContent = n;
    wishBadge.hidden = n === 0;
  };
  syncWish();

  $$('.product').forEach(card => {
    const name = $('h3', card).textContent;
    const wish = $('.wish', card);
    wish.addEventListener('click', () => {
      const on = !wish.classList.contains('is-on');
      wish.classList.toggle('is-on', on);
      wish.setAttribute('aria-pressed', String(on));
      wish.setAttribute('aria-label', `${on ? 'Remove' : 'Add'} ${name} ${on ? 'from' : 'to'} wishlist`);
      syncWish();
      bump(wishBadge);
      toast(on ? `${name} saved to your wishlist` : `${name} removed from your wishlist`);
    });
    $('.add', card).addEventListener('click', () => {
      cart += 1;
      cartBadge.textContent = cart;
      bump(cartBadge);
      toast(`${name} added to your bag`);
    });
  });

  /* ---------- Newsletter forms ---------- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  $$('.subscribe').forEach(form => {
    const input = $('input', form);
    const msg = $('.form-msg', form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const ok = EMAIL.test(input.value.trim());
      form.classList.toggle('is-invalid', !ok);
      msg.textContent = ok ? 'Thank you — welcome to the KSIC family.' : 'Please enter a valid email address.';
      if (ok) input.value = '';
      else input.focus();
    });
    input.addEventListener('input', () => {
      form.classList.remove('is-invalid');
      msg.textContent = '';
    });
  });

  /* ---------- Story video ---------- */
  const modal = $('.video-modal');
  const video = $('video', modal);
  $$('[data-open-video]').forEach(btn => btn.addEventListener('click', () => {
    if (typeof modal.showModal !== 'function') {
      window.open(video.querySelector('source[type="video/mp4"]').src, '_blank', 'noopener');
      return;
    }
    modal.showModal();
    video.play().catch(() => {});
  }));
  $('[data-close-video]', modal).addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
  modal.addEventListener('close', () => video.pause());

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();

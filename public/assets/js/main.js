/* Théo Naciri — progressive enhancements. Vanilla JS, no dependencies.
   Everything here is optional: the pages read fine without it. */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $$ = (selector, ctx = doc) => Array.from(ctx.querySelectorAll(selector));
  const hasIO = 'IntersectionObserver' in window;

  root.classList.add('js', 'js-ready');

  /* ---------- Language: remember an explicit choice ---------- */
  $$('[data-lang-switch]').forEach((link) => {
    link.addEventListener('click', () => {
      try {
        localStorage.setItem('lang', link.dataset.langSwitch);
      } catch (_) {
        /* storage blocked: the switch still works, it just isn't remembered */
      }
    });
  });

  // Opened straight from disk (file://): folder links don't resolve to index.html by themselves.
  if (location.protocol === 'file:') {
    $$('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (/^(\.{1,2}\/|[\w-]+\/)+$/.test(href)) a.setAttribute('href', `${href}index.html`);
    });
  }

  /* ---------- Header state, reading progress, timeline fill ---------- */
  const header = doc.querySelector('.site-header');
  const timeline = doc.querySelector('.timeline');
  let ticking = false;

  const update = () => {
    ticking = false;
    // Read everything first, then write: no forced synchronous layout.
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = root.scrollHeight - vh;
    const rect = timeline ? timeline.getBoundingClientRect() : null;

    if (header) {
      header.classList.toggle('is-scrolled', y > 8);
      header.style.setProperty('--scroll', max > 0 ? (y / max).toFixed(4) : '0');
    }
    if (rect) {
      const progress = (vh * 0.62 - rect.top) / rect.height;
      timeline.style.setProperty('--tl', Math.min(1, Math.max(0, progress)).toFixed(4));
    }
  };
  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  // First pass once the page has painted, when layout is already up to date.
  requestAnimationFrame(() => requestAnimationFrame(update));

  /* ---------- Scroll-spy for the main navigation ---------- */
  const navLinks = $$('.nav a[href^="#"]');
  if (hasIO && navLinks.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => {
            if (a.hash === `#${entry.target.id}`) a.setAttribute('aria-current', 'location');
            else a.removeAttribute('aria-current');
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    $$('main > section[id]').forEach((section) => spy.observe(section));
  }

  /* ---------- Reveal on scroll ---------- */
  $$('.chips').forEach((list) => $$('li', list).forEach((li, i) => li.style.setProperty('--c', i)));

  const revealEls = $$('[data-reveal]');
  if (hasIO) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Count-up figures ---------- */
  const counters = $$('[data-count]');
  if (counters.length && hasIO && !reduceMotion.matches) {
    const format = new Intl.NumberFormat(root.lang || 'en');
    const run = (el) => {
      const target = Number(el.dataset.count);
      const duration = 1700;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 4;
        el.textContent = format.format(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const counterIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run(entry.target);
            counterIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => {
      el.textContent = '0';
      counterIO.observe(el);
    });
  }

  /* ---------- Touch screens: tall screenshots drift while visible ---------- */
  if (hasIO && window.matchMedia('(hover: none)').matches) {
    const panIO = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.target.classList.toggle('in-view', entry.isIntersecting)),
      { threshold: 0.55 }
    );
    $$('.shot--tall').forEach((el) => panIO.observe(el));
  }

  /* ---------- Hero contour lines follow the pointer ---------- */
  const topo = doc.querySelector('.hero__topo svg');
  if (topo && !reduceMotion.matches && window.matchMedia('(pointer: fine)').matches) {
    let frame = 0;
    let px = 0;
    let py = 0;
    window.addEventListener(
      'pointermove',
      (e) => {
        if (window.scrollY > window.innerHeight) return;
        px = (e.clientX / window.innerWidth - 0.5) * -24;
        py = (e.clientY / window.innerHeight - 0.5) * -16;
        if (!frame) {
          frame = requestAnimationFrame(() => {
            frame = 0;
            topo.style.setProperty('--px', `${px.toFixed(1)}px`);
            topo.style.setProperty('--py', `${py.toFixed(1)}px`);
          });
        }
      },
      { passive: true }
    );
  }

  /* ---------- Lightbox for the book screenshots ---------- */
  const dialog = doc.querySelector('.lightbox');
  const triggers = $$('[data-lightbox]');
  if (dialog && triggers.length && typeof dialog.showModal === 'function') {
    const img = dialog.querySelector('.lightbox__img');
    const stage = dialog.querySelector('.lightbox__stage');
    const caption = dialog.querySelector('.lightbox__caption');
    const counter = dialog.querySelector('.lightbox__count');
    const closeBtn = dialog.querySelector('.lightbox__close');
    let current = 0;
    let opener = null;
    let swiped = false;

    const preload = (index) => {
      const link = triggers[(index + triggers.length) % triggers.length];
      const pre = new Image();
      pre.src = link.getAttribute('href');
    };

    const show = (index) => {
      current = (index + triggers.length) % triggers.length;
      const link = triggers[current];
      const thumb = link.querySelector('img');
      const w = Number(thumb.getAttribute('width'));
      const h = Number(thumb.getAttribute('height'));
      const project = link.closest('.project');
      const title = project ? project.querySelector('.project__title').textContent.trim() : '';
      const figcaption = link.closest('figure').querySelector('figcaption');

      // Pages taller than the viewport scroll inside the viewer; the rest are fitted.
      const availW = Math.min(window.innerWidth - 40, 1100);
      const availH = window.innerHeight - 150;
      dialog.classList.toggle('is-tall', h / w > (availH / availW) * 1.1);

      img.classList.add('is-loading');
      img.alt = thumb.alt;
      img.width = w;
      img.height = h;
      img.src = link.getAttribute('href');
      if (img.complete) img.classList.remove('is-loading');

      const strong = doc.createElement('strong');
      strong.textContent = title;
      caption.replaceChildren(strong, figcaption ? ` — ${figcaption.textContent.trim()}` : '');
      counter.textContent = `${current + 1} / ${triggers.length}`;
      stage.scrollTop = 0;

      preload(current + 1);
      preload(current - 1);
    };

    const close = () => {
      if (!dialog.open || dialog.classList.contains('is-closing')) return;
      if (reduceMotion.matches) {
        dialog.close();
        return;
      }
      dialog.classList.add('is-closing');
      window.setTimeout(() => {
        dialog.classList.remove('is-closing');
        dialog.close();
      }, 200);
    };

    img.addEventListener('load', () => img.classList.remove('is-loading'));

    triggers.forEach((link, i) => {
      link.addEventListener('click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab still works
        e.preventDefault();
        opener = link;
        show(i);
        dialog.showModal();
        root.classList.add('lb-open');
        closeBtn.focus();
      });
    });

    dialog.addEventListener('close', () => {
      root.classList.remove('lb-open');
      if (opener) opener.focus({ preventScroll: true });
    });
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      close();
    });
    closeBtn.addEventListener('click', close);
    dialog.querySelector('.lightbox__nav--prev').addEventListener('click', () => show(current - 1));
    dialog.querySelector('.lightbox__nav--next').addEventListener('click', () => show(current + 1));
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        show(current + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        show(current - 1);
      }
    });

    // Click on the empty area around the picture closes; horizontal swipes navigate.
    stage.addEventListener('click', (e) => {
      if (swiped) {
        swiped = false;
        return;
      }
      if (e.target === stage) close();
    });
    let startX = 0;
    let startY = 0;
    stage.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
    });
    stage.addEventListener('pointerup', (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        swiped = true;
        show(current + (dx < 0 ? 1 : -1));
      }
    });
  }

  /* ---------- Copy e-mail address ---------- */
  $$('[data-copy]').forEach((btn) => {
    const label = btn.querySelector('[data-copy-label]');
    const original = label.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.classList.add('is-done');
        label.textContent = btn.dataset.copied;
        window.setTimeout(() => {
          btn.classList.remove('is-done');
          label.textContent = original;
        }, 2200);
      } catch (_) {
        window.location.href = `mailto:${btn.dataset.copy}`;
      }
    });
  });

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();

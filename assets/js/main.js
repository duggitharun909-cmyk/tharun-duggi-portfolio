// UI behaviour (INTENT FR-2..FR-9): loader, cursor, nav, reveals, counters,
// tilt, magnetic buttons, role scramble, tag sphere, contact form.
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const CONTACT_EMAIL = 'duggitharun909@gmail.com';

  document.body.classList.add('is-loading');
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Loader ---------- */
  const loader = $('#loader'), bar = $('#loaderBar'), pct = $('#loaderPct'), ltxt = $('#loaderText');
  const msgs = ['initialising neural mesh', 'loading embeddings', 'warming up agents', 'ready'];
  let progress = 0, sceneDone = false, finished = false;
  const step = () => {
    if (finished) return;
    const target = sceneDone ? 100 : 90;
    progress += (target - progress) * (sceneDone ? 0.25 : 0.06);
    if (sceneDone && progress > 99.5) progress = 100;
    bar.style.width = progress + '%';
    pct.textContent = Math.round(progress) + '%';
    ltxt.textContent = msgs[Math.min(msgs.length - 1, Math.floor(progress / 30))];
    if (progress >= 100) return finish();
    requestAnimationFrame(step);
  };
  const finish = () => {
    finished = true;
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    startRole();
  };
  const markSceneDone = () => { sceneDone = true; };
  if (window.__sceneReady) markSceneDone();
  addEventListener('scene:ready', markSceneDone);
  setTimeout(() => {               // CDN slow/blocked → don't hold the page hostage
    if (!window.__sceneReady) document.body.classList.add('no-webgl');
    markSceneDone();
  }, 4500);
  requestAnimationFrame(step);

  /* ---------- Cursor ---------- */
  if (finePointer && !reduceMotion) {
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
    let x = -100, y = -100, rx = x, ry = y;
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
    const loop = () => {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', (e) => {
      cur.classList.toggle('is-hover', !!e.target.closest('a, button, .tilt, input, textarea'));
    });
  }

  /* ---------- Nav, progress, active section ---------- */
  const nav = $('#nav'), progressBar = $('#progressBar');
  // PERF: read layout once per resize, not per scroll event (avoids forced reflow while scrolling)
  let maxScroll = 1, ticking = false;
  const measure = () => { maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle('is-scrolled', scrollY > 30);
      progressBar.style.transform = `scaleX(${Math.min(1, scrollY / maxScroll)})`;
      ticking = false;
    });
  };
  measure();
  addEventListener('resize', measure);
  addEventListener('load', measure);
  new ResizeObserver(measure).observe(document.body);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = $('#navToggle'), links = $('#navLinks');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    links.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', links).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  const navMap = new Map($$('a[href^="#"]', links).map((a) => [a.getAttribute('href').slice(1), a]));
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navMap.forEach((a) => a.classList.remove('is-active'));
      navMap.get(en.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => secObs.observe(s));

  /* ---------- Reveal on scroll (staggered per parent) ---------- */
  const groups = new Map();
  $$('.reveal').forEach((el) => {
    const list = groups.get(el.parentElement) || [];
    el.style.setProperty('--d', `${Math.min(list.length, 6) * 0.08}s`);
    list.push(el); groups.set(el.parentElement, list);
  });
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      revealObs.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => revealObs.observe(el));

  /* ---------- Counters ---------- */
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target, to = +el.dataset.to, dur = reduceMotion ? 1 : 1800, t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(2, -10 * k)) * (k === 1 ? 1 : 1.001));
        if (k < 1) requestAnimationFrame(tick); else el.textContent = to;
      };
      requestAnimationFrame(tick);
      countObs.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('.count').forEach((el) => countObs.observe(el));

  /* ---------- Tilt + glare ---------- */
  if (finePointer && !reduceMotion) {
    $$('.tilt').forEach((el) => {
      const max = el.classList.contains('project') ? 3 : 6;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${px * 100}%`);
        el.style.setProperty('--my', `${py * 100}%`);
        el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Hero role: scramble text ---------- */
  const roles = ['AI Agent Developer', 'Real-time Voice AI', 'Python Full Stack Engineer', 'AI / ML Engineer', 'RAG & LLM Workflows', 'Serverless on AWS'];
  const roleEl = $('#roleText');
  const glyphs = '!<>-_\\/[]{}—=+*^?#01';
  function scrambleTo(text) {
    const from = roleEl.textContent, len = Math.max(from.length, text.length);
    const queue = [...Array(len)].map((_, i) => ({ to: text[i] || '', start: Math.floor(Math.random() * 14), end: Math.floor(Math.random() * 14) + 14 }));
    let frame = 0;
    const update = () => {
      let out = '', done = 0;
      for (const q of queue) {
        if (frame >= q.end) { done++; out += q.to; }
        else if (frame >= q.start) out += glyphs[Math.floor(Math.random() * glyphs.length)];
        else out += '';
      }
      roleEl.textContent = out;
      if (done < queue.length) { frame++; requestAnimationFrame(update); }
    };
    update();
  }
  let roleIdx = 0, roleTimer;
  function startRole() {
    if (reduceMotion || roleTimer) return;
    roleTimer = setInterval(() => { roleIdx = (roleIdx + 1) % roles.length; scrambleTo(roles[roleIdx]); }, 2800);
  }

  /* ---------- Tag sphere (CSS 3D projection) ---------- */
  const sphereEl = $('#tagSphere');
  if (sphereEl) {
    const words = ['Python', 'LangChain', 'RAG', 'FastAPI', 'Flask', 'AWS Lambda', 'LLMs', 'Agents', 'Vector DB', 'MongoDB', 'MySQL', 'Docker', 'Selenium', 'Playwright', 'Prompt Eng.', 'Webhooks', 'S3', 'EC2', 'CI/CD', 'SQL', 'JavaScript', 'REST APIs', 'PyAutoGUI', 'Microservices', 'Embeddings', 'Git', 'OOP', 'Multi-Agent', 'WhatsApp API', 'AIDLC', 'Plivo', 'Sarvam AI', 'Cartesia', 'VAD', 'WebSockets'];
    const hot = new Set(['Python', 'LangChain', 'RAG', 'FastAPI', 'Agents', 'AWS Lambda', 'LLMs', 'Sarvam AI', 'Cartesia']);
    const pts = words.map((w, i) => {
      const y = 1 - (i / (words.length - 1)) * 2, r = Math.sqrt(1 - y * y), t = i * Math.PI * (3 - Math.sqrt(5));
      const el = document.createElement('span');
      el.textContent = w;
      if (hot.has(w)) el.classList.add('hot');
      sphereEl.appendChild(el);
      return { el, x: Math.cos(t) * r, y, z: Math.sin(t) * r };
    });
    let ax = 0.004, ay = 0.006, tx = ax, ty = ay, visible = false, looping = false;
    sphereEl.parentElement.addEventListener('pointermove', (e) => {
      const r = sphereEl.getBoundingClientRect();
      ty = ((e.clientX - r.left) / r.width - 0.5) * 0.03;
      tx = -((e.clientY - r.top) / r.height - 0.5) * 0.03;
    });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !looping) render(); }).observe(sphereEl);
    function render() {
      ax += (tx - ax) * 0.05; ay += (ty - ay) * 0.05;
      const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
      const R = sphereEl.clientWidth * 0.42;
      for (const p of pts) {
        const y1 = p.y * cx - p.z * sx, z1 = p.y * sx + p.z * cx;
        const x2 = p.x * cy + z1 * sy, z2 = -p.x * sy + z1 * cy;
        p.x = x2; p.y = y1; p.z = z2;
        const s = 0.7 + 0.45 * ((z2 + 1) / 2);
        p.el.style.transform = `translate(-50%,-50%) translate3d(${x2 * R}px,${y1 * R}px,0) scale(${s})`;
        p.el.style.opacity = (0.3 + 0.7 * ((z2 + 1) / 2)).toFixed(2);
        p.el.style.zIndex = Math.round(z2 * 100) + 100;
      }
      looping = visible && !reduceMotion;
      if (looping) requestAnimationFrame(render);
    }
    render();
  }

  /* ---------- Contact form ---------- */
  const form = $('#contactForm'), status = $('#formStatus'), btn = $('#submitBtn'), label = $('.btn__label', btn);
  const rules = {
    name: (v) => (v.length >= 2 && v.length <= 80) || 'Please enter your name (2–80 characters).',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Please enter a valid email address.',
    subject: (v) => v.length <= 120 || 'Max 120 characters.',
    message: (v) => (v.length >= 10 && v.length <= 3000) || 'Message should be 10–3000 characters.',
  };
  const setErr = (name, msg) => {
    const field = form.elements[name].closest('.field');
    field.classList.toggle('has-error', !!msg);
    $(`[data-for="${name}"]`, form).textContent = msg || '';
  };
  const validate = (data) => {
    let ok = true;
    for (const [k, rule] of Object.entries(rules)) {
      const res = rule(data[k] || '');
      setErr(k, res === true ? '' : res);
      if (res !== true) ok = false;
    }
    return ok;
  };
  Object.keys(rules).forEach((k) => form.elements[k].addEventListener('input', () => setErr(k, '')));

  async function viaPython(data) {
    const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    let body = {};
    try { body = await res.json(); } catch { /* static host: no JSON */ }
    if (res.ok && body.ok) return { ok: true };
    if (res.status === 400 && body.errors) return { ok: false, errors: body.errors };
    return { ok: false, fallback: true };
  }
  async function viaFormSubmit(data) {
    const res = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name: data.name, email: data.email, _replyto: data.email, _subject: `[Portfolio] ${data.subject || 'New message'} — ${data.name}`, message: data.message, _template: 'table', _captcha: 'false' }),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok && String(body.success) === 'true' };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
    status.className = 'form__status'; status.textContent = '';
    if (!validate(data)) return;
    if (data.company) { form.reset(); status.textContent = 'Thanks!'; return; }

    btn.disabled = true; label.textContent = 'Sending…';
    try {
      let result = await viaPython(data).catch(() => ({ ok: false, fallback: true }));
      if (result.errors) { Object.entries(result.errors).forEach(([k, m]) => rules[k] && setErr(k, m)); throw new Error('validation'); }
      if (!result.ok && result.fallback) result = await viaFormSubmit(data);
      if (!result.ok) throw new Error('send');
      form.reset();
      status.classList.add('ok');
      status.textContent = '✓ Message sent — thank you! I\'ll get back to you soon.';
      label.textContent = 'Sent';
    } catch (err) {
      status.classList.add('err');
      status.innerHTML = err.message === 'validation' ? 'Please fix the highlighted fields.' : `Couldn't send right now. Please email me at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`;
      label.textContent = 'Send message';
    } finally {
      btn.disabled = false;
      setTimeout(() => { if (label.textContent === 'Sent') label.textContent = 'Send message'; }, 4000);
    }
  });
})();

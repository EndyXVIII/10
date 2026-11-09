/* ==========================================================
   Effetti: cuori, petali e scintille su un unico canvas.
   Il ciclo di disegno gira solo finché ci sono particelle.
   ========================================================== */
(function () {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = {
    heart: ['#E58F84', '#D9776B', '#F2A99E', '#E08E0B', '#F6B71E'],
    petal: ['#F6B71E', '#FFD45E', '#E9A21A', '#FBC94A'],
    spark: ['#FFE9A8', '#FFF8E7', '#F6B71E']
  };

  const cv = document.createElement('canvas');
  cv.id = 'fx';
  cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '95' });
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);

  const parts = [];
  let running = false, last = 0;
  const MAX = 260;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function heart(s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.5, -s * 1.05, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.5, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
    ctx.closePath();
    ctx.fill();
  }
  function petal(s) {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.55, -s * 0.5, s * 0.5, s * 0.6, 0, s);
    ctx.bezierCurveTo(-s * 0.5, s * 0.6, -s * 0.55, -s * 0.5, 0, -s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(224,142,11,.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, s * 0.8); ctx.stroke();
  }
  function spark(s) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.lineTo(Math.cos(a + Math.PI / 4) * s * 0.28, Math.sin(a + Math.PI / 4) * s * 0.28);
    }
    ctx.closePath();
    ctx.fill();
  }

  function add(p) {
    if (parts.length >= MAX) parts.shift();
    parts.push(p);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  }

  function make(kind, x, y, o = {}) {
    const ang = o.angle !== undefined ? o.angle + rand(-o.spread || 0, o.spread || 0) : rand(0, Math.PI * 2);
    const sp = rand(o.speedMin || 2, o.speed || 7);
    return {
      kind, x, y,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      g: o.gravity !== undefined ? o.gravity : (kind === 'heart' ? -0.02 : 0.06),
      drag: o.drag || 0.975,
      s: rand(o.sizeMin || 5, o.size || 11),
      rot: rand(-0.6, 0.6), vr: rand(-0.08, 0.08),
      sw: rand(0, 6.28), swa: kind === 'spark' ? 0 : rand(0.4, 1.4),
      life: 0, max: rand(o.lifeMin || 70, o.life || 130),
      c: pick(COLORS[kind]), fadeIn: o.fadeIn || 0
    };
  }

  function tick(t) {
    const dt = Math.min(3, (t - last) / 16.67);
    last = t;
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max || p.y > H + 60 || p.y < -80) { parts.splice(i, 1); continue; }
      p.vx *= Math.pow(p.drag, dt); p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
      p.sw += 0.05 * dt;
      p.x += (p.vx + Math.sin(p.sw) * p.swa * 0.3) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const k = p.life / p.max;
      let a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      if (p.fadeIn && p.life < p.fadeIn) a *= p.life / p.fadeIn;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.kind === 'heart' ? p.rot * 0.4 : p.rot);
      if (p.kind === 'petal') ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.sw * 2)));
      ctx.fillStyle = p.c;
      if (p.kind === 'heart') heart(p.s);
      else if (p.kind === 'petal') petal(p.s);
      else spark(p.s);
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  const mix = (kinds, n) => Array.from({ length: n }, (_, i) => kinds[i % kinds.length]);

  const FX = {
    // esplosione da un punto
    burst(x, y, o = {}) {
      if (RM) return;
      const kinds = o.kinds || ['heart', 'petal', 'spark'];
      mix(kinds, o.count || 24).forEach((k) => add(make(k, x, y, o)));
    },
    // pioggia dall'alto su tutto lo schermo
    rain(ms = 3500, o = {}) {
      if (RM) return;
      const kinds = o.kinds || ['petal', 'heart', 'petal', 'spark'];
      const end = performance.now() + ms;
      const drop = () => {
        for (let i = 0; i < (o.density || 3); i++) {
          const k = pick(kinds);
          add(make(k, rand(-20, W + 20), -30, { angle: Math.PI / 2, spread: 0.5, speedMin: 1, speed: 3, gravity: k === 'heart' ? 0.015 : 0.03, drag: 0.99, life: 320, lifeMin: 220, size: k === 'spark' ? 7 : 13, sizeMin: 6 }));
        }
        if (performance.now() < end) setTimeout(drop, 90);
      };
      drop();
    },
    // cuori che salgono piano dal basso, come lanterne
    float(x, y, o = {}) {
      if (RM) return;
      for (let i = 0; i < (o.count || 1); i++) {
        add(make(o.kind || 'heart', x + rand(-o.width || 0, o.width || 0), y, { angle: -Math.PI / 2, spread: 0.25, speedMin: 0.6, speed: 1.6, gravity: -0.004, drag: 0.995, life: 300, lifeMin: 200, size: o.size || 12, sizeMin: o.sizeMin || 6, fadeIn: 30 }));
      }
    },
    // punto sullo schermo di un elemento
    center(el) {
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    }
  };

  // un piccolo regalo a ogni tocco
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('is-locked')) return;
    FX.burst(e.clientX, e.clientY, { count: 7, kinds: ['heart', 'spark', 'petal'], speed: 4, speedMin: 1.5, life: 70, lifeMin: 45, size: 8, sizeMin: 4 });
  });

  window.FX = FX;
})();

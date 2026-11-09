/* ==========================================================
   Endy & Sandy — Girasole
   Tutti i testi personali sono in /data/content.json
   ========================================================== */
(function () {
  'use strict';

  // ---------- costanti ----------

  const PLACES = {
    granada: { name: 'Granada', lat: 37.1773, lon: -3.5986, tz: 'Europe/Madrid', coords: '37.18° N, 3.60° O' },
    veternigo: { name: 'Veternigo', lat: 45.5040, lon: 12.0350, tz: 'Europe/Rome', coords: '45.50° N, 12.03° E' }
  };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORE_PETALS = 'girasole.petali.v1';
  const STORE_LETTERS = 'girasole.lettere.v1';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const haptic = (p = 10) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* niente */ } };
  const svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* modalità privata */ }
    }
  };

  let C = null;     // content.json
  let worldP = null;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (RM && window.gsap) gsap.globalTimeline.timeScale(6);

  // ==========================================================
  // AVVIO
  // ==========================================================

  async function boot() {
    // ?reset nell'indirizzo azzera petali e lettere aperte (utile per provare prima di inviare)
    if (new URLSearchParams(location.search).has('reset')) {
      try { localStorage.removeItem(STORE_PETALS); localStorage.removeItem(STORE_LETTERS); } catch (e) { /* niente */ }
      history.replaceState(null, '', location.pathname);
    }
    paintGrain();
    startPollen();
    worldP = fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json').then((r) => r.json()).catch(() => null);

    const minWait = sleep(RM ? 0 : 1100);
    try {
      C = await fetch('data/content.json', { cache: 'no-cache' }).then((r) => r.json());
    } catch (e) {
      $('#loader').innerHTML = '<p style="font-family:var(--f-hand);font-size:24px;text-align:center;padding:24px">Apri questa pagina da un server (vedi README) 🌻</p>';
      return;
    }
    // il sito parte solo quando foto, gif, video, musica, mappa e caratteri sono tutti arrivati
    await preloadAll();
    await minWait;

    $('#loader').classList.add('is-done');
    setTimeout(() => $('#loader').remove(), 700);
    initLock();
    if (PRE['assets/music.mp3']) { audio.src = PRE['assets/music.mp3']; musicAvailable = true; } else checkMusic();
  }

  // ---------- precarico ----------

  const PRE = {}; // percorso originale → copia già in memoria (blob:)
  const local = (src) => PRE[src] || src;

  function collectMedia(v, out = new Set()) {
    if (typeof v === 'string') {
      if (/\.(gif|jpe?g|png|webp|avif|svg|mp4|webm|mov|m4v|mp3|m4a)$/i.test(v.trim())) out.add(v.trim());
    } else if (v && typeof v === 'object') Object.values(v).forEach((x) => collectMedia(x, out));
    return out;
  }

  async function preloadAll() {
    const files = [...new Set([...collectMedia(C), 'assets/music.mp3', 'assets/voce.mp3'])];
    const pctEl = $('#loaderPct'), bar = $('#loaderBar');
    const frac = new Array(files.length + 2).fill(0);
    const report = () => {
      const p = frac.reduce((a, b) => a + b, 0) / frac.length;
      if (pctEl) pctEl.textContent = `${Math.round(p * 100)}%`;
      if (bar) bar.style.transform = `scaleX(${p})`;
    };
    const one = async (src, i) => {
      try {
        const r = await fetch(src);
        const type = r.headers.get('content-type') || '';
        if (r.ok && !/html/.test(type)) {
          const len = +r.headers.get('content-length') || 0;
          let blob;
          if (r.body && len) {
            const reader = r.body.getReader(), parts = [];
            let got = 0;
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              parts.push(value); got += value.length;
              frac[i] = Math.min(0.99, got / len); report();
            }
            blob = new Blob(parts, { type });
          } else blob = await r.blob();
          PRE[src] = URL.createObjectURL(blob);
        }
      } catch (e) { /* se proprio non arriva, ci riprova il browser più tardi */ }
      frac[i] = 1; report();
    };
    const done = (i) => () => { frac[i] = 1; report(); };
    report();
    const all = Promise.all([
      ...files.map(one),
      worldP.then(done(files.length)),
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(done(files.length + 1))
    ]);
    // con una connessione lentissima non resta bloccata per sempre
    await Promise.race([all, sleep(90000)]);
  }

  // ---------- grana della carta ----------

  function paintGrain() {
    const n = 180, cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(n, n);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random();
      img.data[i] = 74; img.data[i + 1] = 46; img.data[i + 2] = 26;
      img.data[i + 3] = v > 0.5 ? Math.floor((v - 0.5) * 40) : 0;
    }
    ctx.putImageData(img, 0, 0);
    $('.grain').style.backgroundImage = `url(${cv.toDataURL()})`;
  }

  // ---------- polline ----------

  function startPollen() {
    if (RM) return;
    const cv = $('#pollen'), ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0, H = 0, parts = [];
    const resize = () => {
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = W < 600 ? 22 : 38;
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.8 + Math.random() * 1.8, vy: 0.08 + Math.random() * 0.22,
        sw: Math.random() * 6.28, sp: 0.002 + Math.random() * 0.004, a: 0.18 + Math.random() * 0.35
      }));
    };
    resize();
    addEventListener('resize', resize);
    let last = 0;
    const tick = (t) => {
      requestAnimationFrame(tick);
      if (document.hidden || t - last < 33) return;
      last = t;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.y -= p.vy; p.sw += p.sp * 16;
        const x = p.x + Math.sin(p.sw) * 14;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        ctx.fillStyle = `rgba(224,142,11,${p.a})`;
        ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    };
    requestAnimationFrame(tick);
  }

  // ---------- musica e suoni ----------

  const audio = $('#music');
  let musicOn = false, actx = null;
  let musicAvailable = false;

  async function checkMusic() {
    try {
      const r = await fetch('assets/music.mp3', { method: 'HEAD' });
      const type = r.headers.get('content-type') || '';
      musicAvailable = r.ok && !/html/.test(type);
    } catch (e) { musicAvailable = false; }
  }

  function setMusic(on) {
    musicOn = on;
    $('#musicToggle').setAttribute('aria-pressed', String(on));
    gsap.killTweensOf(audio);
    if (on) {
      audio.volume = 0;
      const p = audio.play();
      if (p && p.catch) p.catch(() => { musicOn = false; $('#musicToggle').setAttribute('aria-pressed', 'false'); armMusicFallback(); });
      gsap.to(audio, { volume: 0.55, duration: 3 });
      ensureAudioCtx();
    } else {
      gsap.to(audio, { volume: 0, duration: 0.8, onComplete: () => audio.pause() });
    }
  }

  // la musica parte appena lei apre la busta: quel tocco vale come consenso del browser
  function startMusic() {
    if (musicOn) return;
    audio.preload = 'auto';
    setMusic(true);
  }

  // se il browser l'ha bloccata comunque, riparte al primo tocco sulla pagina
  let fallbackArmed = false;
  function armMusicFallback() {
    if (fallbackArmed) return;
    fallbackArmed = true;
    const go = (e) => {
      if (e.target.closest && e.target.closest('#musicToggle')) return;
      document.removeEventListener('pointerdown', go, true);
      fallbackArmed = false;
      if (!musicOn && !userMuted) setMusic(true);
    };
    document.addEventListener('pointerdown', go, true);
  }

  let userMuted = false;
  function showMusicToggle() {
    if (!musicAvailable) return;
    const btn = $('#musicToggle');
    btn.hidden = false;
    btn.setAttribute('aria-pressed', String(musicOn));
    gsap.from(btn, { opacity: 0, scale: 0.6, duration: 0.6, ease: 'back.out(2)' });
    btn.addEventListener('click', () => {
      haptic(8);
      userMuted = musicOn;
      setMusic(!musicOn);
    });
    // in pausa quando lei esce dalla pagina, riprende quando torna
    document.addEventListener('visibilitychange', () => {
      if (!musicOn) return;
      if (document.hidden) audio.pause();
      else audio.play().catch(() => {});
    });
  }

  function ensureAudioCtx() {
    if (actx) return actx;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    return actx;
  }

  // fruscio di carta, sintetizzato: solo con la musica accesa
  function paperSound(len = 0.35, vol = 0.12) {
    if (!musicOn) return;
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * len);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const env = Math.sin((i / n) * Math.PI) * (0.6 + 0.4 * Math.random());
      d[i] = (Math.random() * 2 - 1) * env * (Math.random() < 0.08 ? 1 : 0.35);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
  }

  // ==========================================================
  // 3.0 INGRESSO
  // ==========================================================

  function initLock() {
    const lock = $('#lock');
    lock.hidden = false;

    // girasole in rilievo sul sigillo
    const fl = $('.seal-flower');
    for (let i = 0; i < 12; i++) {
      svgEl('path', { d: 'M50 40 C54 34 54 26 50 20 C46 26 46 34 50 40 Z', transform: `rotate(${i * 30} 50 50)` }, fl);
    }

    gsap.from('.lock-inner > *', { opacity: 0, y: 18, duration: 1, stagger: 0.12, ease: 'power3.out' });

    const form = $('#lockForm'), input = $('#secret'), hint = $('#lockHint');
    let tries = 0;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (isOurDay(input.value)) {
        if (musicAvailable) startMusic();
        input.blur();
        hint.textContent = '';
        openEnvelope();
      } else {
        tries++;
        haptic([8, 40, 8]);
        gsap.fromTo('#seal', { rotation: 0 }, { keyframes: [{ rotation: -9 }, { rotation: 7 }, { rotation: -4 }, { rotation: 2 }, { rotation: 0 }], duration: 0.6, ease: 'power1.inOut' });
        hint.textContent = tries > 2 && input.value.trim() === '' ? 'Scrivi il giorno e il mese 🌻' : 'Pensaci: un giorno di ottobre, all’ora di pranzo…';
        gsap.fromTo(hint, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5 });
      }
    });
  }

  function isOurDay(v) {
    const s = String(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ');
    return /^10 ?[\/\-. ] ?10( ?[\/\-. ] ?(20)?26)?$/.test(s) ||
      /^10 ?(di )?ott(obre|\.)?( ?(20)?26)?$/.test(s);
  }

  async function openEnvelope() {
    haptic(15);
    paperSound(0.5, 0.1);
    const seed = $('.seed-fall'), plant = $('#plant');
    const tl = gsap.timeline();
    tl.to('#lockForm, .lock-title, .lock-kicker', { opacity: 0, y: 10, duration: 0.5, stagger: 0.05 })
      .to('.seal-l', { rotation: -28, x: -8, y: 4, duration: 0.35, ease: 'power2.out' }, '+=.1')
      .to('.seal-r', { rotation: 24, x: 8, y: 6, duration: 0.35, ease: 'power2.out' }, '<')
      .to('.seal-half', { y: 160, opacity: 0, duration: 0.7, ease: 'power2.in', stagger: 0.05 }, '+=.05')
      .to('.env-flap', { rotationX: 180, duration: 0.8, ease: 'power2.inOut' }, '-=.55')
      .set('.env-flap', { zIndex: 0 }, '-=.4')
      .to('.env-card', { yPercent: -36, duration: 0.7, ease: 'power2.out' }, '-=.15')
      .to('.env-card span', { opacity: 1, duration: 0.5 }, '<.2');
    await tl.then();

    // il seme cade e viene piantato
    const sr = seed.getBoundingClientRect();
    gsap.set(plant, { opacity: 1 });
    const pr = $('.plant-soil').getBoundingClientRect();
    const dy = pr.top + pr.height * 0.25 - sr.bottom;
    gsap.set('.plant-stem', { strokeDasharray: 80, strokeDashoffset: 80 });
    gsap.set('.plant-leaf', { scale: 0, transformOrigin: '50% 100%' });
    gsap.set('.plant-soil', { opacity: 0 });

    // in cima al gambo sboccia il girasole
    const psvg = $('svg', plant);
    const flower = svgEl('g', { class: 'plant-flower' }, psvg);
    const petals = [];
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 16; i++) {
        petals.push(svgEl('path', {
          d: 'M0 -7 C5 -12 5 -20 0 -26 C-5 -20 -5 -12 0 -7 Z',
          fill: layer ? '#F6B71E' : '#E9A214', stroke: '#D98A0B', 'stroke-width': 0.6,
          transform: `rotate(${i * 22.5 + (layer ? 11.25 : 0)})`
        }, flower));
      }
    }
    svgEl('circle', { r: 9, fill: '#4A2E1A' }, flower);
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4, r = Math.sqrt(i / 18) * 7;
      svgEl('circle', { cx: Math.cos(a) * r, cy: Math.sin(a) * r, r: 0.9, fill: '#7A4A22' }, flower);
    }
    gsap.set(flower, { x: 60, y: 64, scale: 0, rotation: -90, svgOrigin: '0 0' });
    gsap.set(petals, { scale: 0.2, transformOrigin: '50% 100%' });

    const t2 = gsap.timeline();
    t2.set(seed, { opacity: 1 })
      .to(seed, { y: dy, rotation: 200, duration: 1.1, ease: 'bounce.out' })
      .to('.envelope', { opacity: 0, y: -20, duration: 0.8 }, '<.3')
      .to('.plant-soil', { opacity: 1, duration: 0.5 }, '-=.4')
      .to(seed, { scale: 0.4, opacity: 0, duration: 0.4 })
      .to('.plant-stem', { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out' }, '-=.2')
      .to('.plant-leaf', { scale: 1, duration: 0.7, stagger: 0.15, ease: 'back.out(2)' }, '-=.4')
      .to(flower, { scale: 1, rotation: 0, duration: 1, ease: 'back.out(1.6)' }, '-=.3')
      .to(petals, { scale: 1, duration: 0.6, stagger: { each: 0.02, from: 'random' }, ease: 'back.out(2.2)' }, '<.15')
      .add(() => { const [x, y] = FX.center(flower); FX.burst(x, y, { count: 16, kinds: ['petal', 'spark'], speed: 5, life: 80, size: 8 }); }, '-=.3')
      .to('#lock', { opacity: 0, duration: 0.8 }, '+=.9');
    await t2.then();
    enterApp();
  }

  function enterApp() {
    $('#lock').remove();
    document.body.classList.remove('is-locked');
    const app = $('#app');
    app.setAttribute('aria-hidden', 'false');
    window.scrollTo(0, 0);
    gsap.to(app, { opacity: 1, duration: 1 });
    setTimeout(() => {
      FX.burst(innerWidth / 2, innerHeight * 0.45, { count: 70, speed: 13, speedMin: 4, life: 150, size: 13 });
      FX.rain(2600, { density: 2 });
    }, 250);

    showMusicToggle();
    renderSongs();
    initHero();
    initMap();
    initFlower();
    initLetters();
    initPosta();
    initFinestre();
    initRullino();
    initConte();
    initSoloTe();
    initFinale();
    initDrift();
    initReveals();
    initRail();
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  // ==========================================================
  // 3.1 MAPPA
  // ==========================================================

  function haversine(a, b) {
    const R = 6371, t = Math.PI / 180;
    const dLat = (b.lat - a.lat) * t, dLon = (b.lon - a.lon) * t;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const fmtKm = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // aspetta che l'elemento abbia una larghezza vera (es. pagina aperta in background)
  function whenSized(el) {
    if (el.clientWidth > 0) return Promise.resolve();
    return new Promise((res) => {
      const ro = new ResizeObserver(() => { if (el.clientWidth > 0) { ro.disconnect(); res(); } });
      ro.observe(el);
    });
  }

  const PLANE_D = 'M0 -20 C1.6 -20 2.6 -17.6 2.6 -14.6 V-6 L18 2.6 V6 L2.6 2.2 V11.4 L7.6 15 V18 L0 16.2 L-7.6 18 V15 L-2.6 11.4 V2.2 L-18 6 V2.6 L-2.6 -6 V-14.6 C-2.6 -17.6 -1.6 -20 0 -20 Z';

  async function initMap() {
    const km = haversine(PLACES.granada, PLACES.veternigo);
    const kmEl = $('#kmCount');
    kmEl.textContent = fmtKm(km);
    $('#passKm').textContent = `${fmtKm(km)} km`;
    $('#passName').textContent = C.nome_lui;
    $('.barcode').innerHTML = Array.from({ length: 26 }, (_, i) => `<i style="width:${1 + ((i * 7) % 4)}px"></i>`).join('');

    // il numero è subito visibile e conta appena entra nello schermo
    const counter = { v: 0 };
    ScrollTrigger.create({
      trigger: '.km-big', start: 'top 92%', once: true,
      onEnter: () => gsap.fromTo(counter, { v: 0 }, {
        v: km, duration: 2.6, ease: 'power3.out',
        onUpdate: () => { kmEl.textContent = fmtKm(counter.v); }
      })
    });

    const wrap = $('.map-wrap'), svg = d3.select('#map');
    await whenSized(wrap);
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    const W = 600, H = Math.round((600 * ch) / cw);
    const k = W / cw;                      // unità viewBox per pixel
    svg.attr('viewBox', `0 0 ${W} ${H}`);

    const desk = cw > 700;
    const proj = d3.geoConicConformal().parallels([36, 46]).rotate([-5, 0]);
    proj.fitExtent([[40 * k, 60 * k], [W - 40 * k, H - 40 * k]], {
      type: 'MultiPoint',
      coordinates: desk ? [[-9.5, 35.2], [19.5, 47.8]] : [[-6.2, 35.6], [15.2, 47.2]]
    });
    proj.clipExtent([[-20, -20], [W + 20, H + 20]]);
    const path = d3.geoPath(proj);

    svg.append('rect').attr('class', 'sea').attr('x', -20).attr('y', -20).attr('width', W + 40).attr('height', H + 40);
    svg.append('path').attr('class', 'grat').attr('stroke-width', 0.8 * k).attr('d', path(d3.geoGraticule().step([5, 5])()));
    const world = await worldP;
    if (world && window.topojson) {
      const land = topojson.feature(world, world.objects.land);
      svg.append('path').attr('class', 'land-shadow').attr('d', path(land)).attr('transform', `translate(${1.5 * k},${2.5 * k})`);
      svg.append('path').attr('class', 'land').attr('stroke-width', 0.8 * k).attr('d', path(land));
      svg.append('path').attr('class', 'borders').attr('stroke-width', 0.7 * k).attr('d', path(topojson.mesh(world, world.objects.countries, (a, b) => a !== b)));
      const [sx, sy] = proj([4.5, 38.6]);
      svg.append('text').attr('class', 'sea-label').attr('x', sx).attr('y', sy).attr('text-anchor', 'middle')
        .attr('font-size', 11 * k).attr('letter-spacing', 4 * k).text('MAR MEDITERRANEO');
    }

    // rotta: un arco da aereo sopra la linea più breve
    const A = proj([PLACES.granada.lon, PLACES.granada.lat]);
    const B = proj([PLACES.veternigo.lon, PLACES.veternigo.lat]);
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy);
    let nx = dy / len, ny = -dx / len;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const ctrl = [(A[0] + B[0]) / 2 + nx * len * 0.22, (A[1] + B[1]) / 2 + ny * len * 0.22];
    // prima di atterrare l'aereo disegna un cuore nel cielo, sopra di lei
    const hs = Math.min(50 * k, len * 0.18);
    const hc = [B[0] - hs * 1.9, B[1] - hs * 1.5];
    const T = [hc[0], hc[1] + hs];
    const ctrl2 = [(A[0] + T[0]) / 2 + nx * len * 0.18, (A[1] + T[1]) / 2 + ny * len * 0.18];
    const lineD = `M${A[0]},${A[1]} Q${ctrl2[0]},${ctrl2[1]} ${T[0]},${T[1]} ` +
      `C${hc[0] - hs * 1.25},${hc[1] + hs * 0.15} ${hc[0] - hs * 1.05},${hc[1] - hs * 1.0} ${hc[0]},${hc[1] - hs * 0.38} ` +
      `C${hc[0] + hs * 1.05},${hc[1] - hs * 1.0} ${hc[0] + hs * 1.25},${hc[1] + hs * 0.15} ${T[0]},${T[1]} ` +
      `Q${T[0] + hs * 0.6},${B[1] + hs * 0.2} ${B[0]},${B[1]}`;

    const defs = svg.append('defs');
    const mask = defs.append('mask').attr('id', 'routeMask').attr('maskUnits', 'userSpaceOnUse');
    const maskPath = mask.append('path').attr('class', 'route-mask').attr('d', lineD).attr('stroke-width', 14 * k);
    svg.append('path').attr('class', 'route-base').attr('d', lineD).attr('stroke-width', 1.6 * k).attr('stroke-dasharray', `${1 * k} ${8 * k}`);
    const route = svg.append('path').attr('class', 'route').attr('d', lineD).attr('mask', 'url(#routeMask)')
      .attr('stroke-width', 3 * k).attr('stroke-dasharray', `0.1 ${8 * k}`);
    const routeNode = route.node();
    const L = routeNode.getTotalLength();
    maskPath.attr('stroke-dasharray', L).attr('stroke-dashoffset', L);

    // città
    const city = ([x, y], name, lx, ly, anchor) => {
      const g = svg.append('g').attr('transform', `translate(${x},${y})`);
      const glow = g.append('circle').attr('class', 'city-glow').attr('r', 14 * k);
      g.append('circle').attr('class', 'city-dot').attr('r', 5 * k).attr('stroke-width', 2 * k);
      g.append('text').attr('class', 'city-label').attr('x', lx * k).attr('y', ly * k).attr('text-anchor', anchor)
        .attr('font-size', 28 * k).text(name);
      return { g, glow: glow.node() };
    };
    const cA = city(A, PLACES.granada.name, 12, 34, 'start');
    const cB = city(B, PLACES.veternigo.name, -12, 36, 'end');
    if (!RM) gsap.to(cA.glow, { scale: 1.7, opacity: 0.06, transformOrigin: '50% 50%', duration: 1.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    // girasole che sboccia all'arrivo
    const bloom = cB.g.append('g').attr('class', 'dest-bloom');
    for (let i = 0; i < 12; i++) {
      bloom.append('ellipse').attr('cx', 0).attr('cy', -9 * k).attr('rx', 3.2 * k).attr('ry', 6.5 * k).attr('transform', `rotate(${i * 30})`);
    }
    bloom.append('circle').attr('r', 4.6 * k).attr('class', 'dest-core');
    gsap.set(bloom.node(), { scale: 0, transformOrigin: '50% 50%' });

    // aereo + ombra
    const shadow = svg.append('path').attr('class', 'plane-shadow').attr('d', PLANE_D);
    const plane = svg.append('path').attr('class', 'plane').attr('d', PLANE_D).attr('stroke-width', 1.3);
    const st = { p: 0 };
    const place = () => {
      const p = st.p;
      const l = Math.max(0.01, Math.min(L - 1, p * L));
      const a = routeNode.getPointAtLength(l), b = routeNode.getPointAtLength(l + 1);
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
      const alt = Math.sin(Math.PI * p);
      const sc = k * (0.9 + 0.5 * alt);
      plane.attr('transform', `translate(${a.x},${a.y}) rotate(${ang}) scale(${sc})`);
      shadow.attr('transform', `translate(${a.x + 9 * k * alt},${a.y + 14 * k * alt}) rotate(${ang}) scale(${sc * 0.92})`)
        .attr('opacity', 0.1 + 0.22 * alt);
      maskPath.attr('stroke-dashoffset', L * (1 - p));
    };
    place();
    gsap.set([plane.node(), shadow.node()], { opacity: 0 });

    let flight = null;
    const fly = () => {
      if (flight) flight.kill();
      st.p = 0; place();
      gsap.set(bloom.node(), { scale: 0 });
      flight = gsap.timeline();
      flight.to([plane.node()], { opacity: 1, duration: 0.4 })
        .to(shadow.node(), { opacity: 0.1, duration: 0.4 }, '<')
        .to(st, { p: 1, duration: RM ? 0.2 : 7, ease: 'power1.inOut', onUpdate: place })
        .to([plane.node(), shadow.node()], { opacity: 0, duration: 0.5 })
        .add(() => haptic([6, 30, 10]))
        .add(() => { const [x, y] = FX.center(cB.glow); FX.burst(x, y, { count: 30, kinds: ['heart', 'spark', 'heart', 'petal'], speed: 7, life: 110, size: 10 }); }, '<')
        .to(bloom.node(), { scale: 1, rotation: 90, duration: 1.1, ease: 'back.out(2.2)' }, '<')
        .fromTo(cB.glow, { scale: 1, opacity: 0.5 }, { scale: 2.6, opacity: 0, duration: 1.4, ease: 'power2.out', transformOrigin: '50% 50%' }, '<');
    };
    ScrollTrigger.create({ trigger: wrap, start: 'top 62%', once: true, onEnter: fly });
    $('#replayFlight').addEventListener('click', () => { haptic(8); fly(); });

    initPlaces();
  }

  // ---------- ora e meteo ----------

  const WX = {
    0: ['sereno', 'sun'], 1: ['quasi sereno', 'sun'], 2: ['qualche nuvola', 'partly'], 3: ['coperto', 'cloud'],
    45: ['nebbia', 'fog'], 48: ['nebbia', 'fog'],
    51: ['pioviggine', 'rain'], 53: ['pioviggine', 'rain'], 55: ['pioviggine', 'rain'], 56: ['pioggia gelata', 'rain'], 57: ['pioggia gelata', 'rain'],
    61: ['pioggia leggera', 'rain'], 63: ['pioggia', 'rain'], 65: ['pioggia forte', 'rain'], 66: ['pioggia gelata', 'rain'], 67: ['pioggia gelata', 'rain'],
    71: ['neve leggera', 'snow'], 73: ['neve', 'snow'], 75: ['neve forte', 'snow'], 77: ['nevischio', 'snow'],
    80: ['rovesci', 'rain'], 81: ['rovesci', 'rain'], 82: ['rovesci forti', 'rain'], 85: ['neve', 'snow'], 86: ['neve', 'snow'],
    95: ['temporale', 'storm'], 96: ['temporale', 'storm'], 99: ['temporale', 'storm']
  };

  const CLOUD = 'M11 29 C6 29 5 22 10 21 C10 15 17 13 20 17 C22 12 30 12 31 19 C36 19 37 28 31 29 Z';
  const ICONS = {
    sun: '<circle class="sun-fill" cx="20" cy="20" r="7.5"/><path d="M20 4.5v4.2M20 31.6v4M4.6 20h4M31.4 20h4.2M9 9l2.9 3M28.3 28.1l2.8 2.9M31 9.2l-2.9 2.8M11.8 28.2 9 31"/>',
    moon: '<path d="M25 6.5 C17 7.5 12.5 14 13.5 21.5 C14.6 29 21.5 33.6 29 32 C24 29 21.8 23.8 22.4 18.2 C22.9 13.3 25 9.6 25 6.5 Z"/>',
    cloud: `<path d="${CLOUD}"/>`,
    partlyNight: `<path d="M17 4.5 C12 5.5 9.5 10 10.3 14.6 C11 18.6 14.5 21 18.6 20.4 C16 18.4 15 15.5 15.4 12.4 C15.8 9.4 17 7 17 4.5 Z"/><path d="${CLOUD}" transform="translate(3 3)" style="fill:var(--carta)"/>`,
    partly: `<circle class="sun-fill" cx="14" cy="14" r="6"/><path d="M14 3.5v2.5M3.5 14H6M6.6 6.6l1.8 1.8M21.4 6.6l-1.8 1.8"/><path d="${CLOUD}" transform="translate(3 3)" style="fill:var(--carta)"/>`,
    rain: `<path d="${CLOUD}" transform="translate(0 -4)"/><path d="M13 30l-2 5M20 30.5l-2 5M27 30l-2 5"/>`,
    snow: `<path d="${CLOUD}" transform="translate(0 -4)"/><path d="M13 31.5v3M11.6 33h2.8M20 32.5v3M18.6 34h2.8M27 31.5v3M25.6 33h2.8"/>`,
    storm: `<path d="${CLOUD}" transform="translate(0 -4)"/><path d="M21 26.5l-3.5 5.2h4.2L19 37"/>`,
    fog: '<path d="M7 15c4-2 8 2 12 0s8-2 13 0M5 21c4-2 9 2 13 0s9-2 15 0M8 27c4-2 8 2 12 0s7-2 11 0"/>'
  };

  function initPlaces() {
    const timeEls = $$('.place-time');
    const tick = () => {
      const now = new Date();
      for (const el of timeEls) {
        el.textContent = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: el.dataset.tz }).format(now);
      }
    };
    tick();
    setInterval(tick, 10000);

    const g = PLACES.granada, v = PLACES.veternigo;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${g.lat},${v.lat}&longitude=${g.lon},${v.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    fetch(url).then((r) => r.json()).then((data) => {
      const list = Array.isArray(data) ? data : [data];
      [['#cardGranada', list[0]], ['#cardVeternigo', list[1]]].forEach(([sel, d]) => {
        if (!d || !d.current) return;
        const card = $(sel);
        const code = d.current.weather_code;
        const [label, icon0] = WX[code] || ['cielo variabile', 'partly'];
        const icon = d.current.is_day ? icon0 : ({ sun: 'moon', partly: 'partlyNight' }[icon0] || icon0);
        $('.wx-icon', card).innerHTML = `<svg viewBox="0 0 40 40">${ICONS[icon]}</svg>`;
        $('.wx-text', card).innerHTML = `<b>${Math.round(d.current.temperature_2m)}°</b>${label}`;
        if (!RM) {
          const paths = $$('.wx-icon svg path, .wx-icon svg circle', card);
          paths.forEach((p) => {
            const len = p.getTotalLength ? p.getTotalLength() : 100;
            gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, {
              strokeDashoffset: 0, duration: 1.4, ease: 'power2.out',
              scrollTrigger: { trigger: card, start: 'top 90%', once: true }
            });
          });
        }
      });
    }).catch(() => {
      $$('.wx-text').forEach((el) => { el.textContent = 'il cielo di adesso'; });
      $$('.wx-icon').forEach((el) => { el.innerHTML = `<svg viewBox="0 0 40 40">${ICONS.partly}</svg>`; });
    });

    gsap.from('.place-card', {
      opacity: 0, y: 30, duration: 0.9, stagger: 0.15, ease: 'power3.out',
      scrollTrigger: { trigger: '.places', start: 'top 85%', once: true }
    });
  }

  // ==========================================================
  // 3.2 IL GIRASOLE DEI 31 GIORNI
  // ==========================================================

  const PETAL_D = 'M0 -64 C15 -86 20 -146 0 -194 C-20 -146 -15 -86 0 -64 Z';
  const RIB_D = 'M0 -72 C2 -110 1 -150 0 -180';
  const CLOSED = { scaleX: 0.62, scaleY: 0.5, rotation: 7 };
  let opened = new Set();
  let flowerDone = false;
  let petalsRef = [];
  let pendingComplete = false;
  let pulse = null;

  // disco del girasole: ombra, corona di fiorellini e semi a spirale aurea
  let diskId = 0;
  function buildDisk(svgRoot, parent, r, nSeeds) {
    const id = `disk${diskId++}`;
    const defs = svgRoot.querySelector('defs') || svgEl('defs', {}, svgRoot);
    const sh = svgEl('radialGradient', { id: `${id}s` }, defs);
    svgEl('stop', { offset: 0.62, 'stop-color': '#4A2E1A', 'stop-opacity': 0.4 }, sh);
    svgEl('stop', { offset: 1, 'stop-color': '#4A2E1A', 'stop-opacity': 0 }, sh);
    const dg = svgEl('radialGradient', { id: `${id}d`, cx: '45%', cy: '42%', r: '60%' }, defs);
    svgEl('stop', { offset: 0, 'stop-color': '#7A6A33' }, dg);
    svgEl('stop', { offset: 0.35, 'stop-color': '#4E3418' }, dg);
    svgEl('stop', { offset: 1, 'stop-color': '#2C1A0D' }, dg);

    const g = svgEl('g', { class: 'disk' }, parent);
    svgEl('circle', { r: r * 1.32, fill: `url(#${id}s)` }, g);
    for (let i = 0; i < 56; i++) {
      svgEl('ellipse', { cx: 0, cy: -r * 1.02, rx: r * 0.035, ry: r * 0.075, fill: i % 2 ? '#9A6420' : '#7E4C17', transform: `rotate(${i * (360 / 56)})` }, g);
    }
    svgEl('circle', { r, fill: `url(#${id}d)` }, g);
    const seeds = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 1; i <= nSeeds; i++) {
      const f = i / nSeeds;
      const rr = r * 0.93 * Math.sqrt(f), a = i * golden;
      const x = (rr * Math.cos(a)).toFixed(2), y = (rr * Math.sin(a)).toFixed(2);
      const size = r * (0.016 + 0.024 * f);
      const fill = f < 0.12 ? '#8C7A3C' : f < 0.3 ? (i % 2 ? '#5B4220' : '#3B2610') : (i % 3 === 0 ? '#1E1108' : i % 2 ? '#5A3A1C' : '#33200F');
      seeds.push(svgEl('ellipse', { cx: x, cy: y, rx: size, ry: size * 1.3, fill, transform: `rotate(${((a * 180) / Math.PI).toFixed(1)} ${x} ${y})` }, g));
    }
    return { g, seeds };
  }

  function initFlower() {
    const N = C.petali.length;
    const svg = $('#flower');
    const defs = svgEl('defs', {}, svg);
    const grad = svgEl('linearGradient', { id: 'petalGrad', gradientUnits: 'userSpaceOnUse', x1: 0, y1: -64, x2: 0, y2: -194 }, defs);
    svgEl('stop', { offset: 0, 'stop-color': '#DE8C0C' }, grad);
    svgEl('stop', { offset: 0.3, 'stop-color': '#F6B71E' }, grad);
    svgEl('stop', { offset: 1, 'stop-color': '#FFD86A' }, grad);

    // stelo e foglie
    const stemG = svgEl('g', { class: 'stem-g' }, svg);
    const stem = svgEl('path', { class: 'f-stem', d: 'M0 90 C4 170 -10 250 6 340' }, stemG);
    const leafL = svgEl('path', { class: 'f-leaf', d: 'M2 250 C-30 252 -70 236 -92 204 C-54 196 -16 214 2 250 Z' }, stemG);
    const leafR = svgEl('path', { class: 'f-leaf', d: 'M4 296 C36 294 74 276 92 242 C54 236 18 256 4 296 Z' }, stemG);
    svgEl('path', { class: 'f-vein', d: 'M2 250 C-30 236 -56 222 -86 205' }, stemG);
    svgEl('path', { class: 'f-vein', d: 'M4 296 C34 280 62 264 88 244' }, stemG);

    const gPetals = svgEl('g', { class: 'petals' }, svg);
    const step = 360 / N;
    petalsRef = [];
    for (let i = 0; i < N; i++) {
      const outer = svgEl('g', { class: 'petal-g', transform: `rotate(${i * step})` }, gPetals);
      const inner = svgEl('g', { class: 'petal' }, outer);
      const closed = svgEl('path', { d: PETAL_D, fill: '#F2E3B9', stroke: '#D9B56C', 'stroke-width': 1.3 }, inner);
      const open = svgEl('path', { d: PETAL_D, fill: 'url(#petalGrad)', stroke: '#D98A0B', 'stroke-width': 1, opacity: 0 }, inner);
      const rib = svgEl('path', { d: RIB_D, fill: 'none', stroke: '#E08E0B', 'stroke-width': 1.1, 'stroke-linecap': 'round', opacity: 0 }, inner);
      petalsRef.push({ outer, inner, closed, open, rib });
    }

    const head = svgEl('g', { class: 'head' }, svg);
    const { seeds } = buildDisk(svg, head, 78, 260);

    // stato iniziale
    opened = new Set(store.get(STORE_PETALS, []).filter((i) => i >= 0 && i < N));
    petalsRef.forEach((p, i) => {
      if (opened.has(i)) setPetalOpen(p, false);
      else gsap.set(p.inner, { ...CLOSED, transformOrigin: '50% 100%' });
    });
    updateCounter(false);

    gsap.set(seeds, { scale: 0, transformOrigin: '50% 50%' });
    const stemLen = stem.getTotalLength();
    gsap.set(stem, { strokeDasharray: stemLen, strokeDashoffset: stemLen });
    gsap.set(leafL, { scale: 0, transformOrigin: '100% 100%' });
    gsap.set(leafR, { scale: 0, transformOrigin: '0% 100%' });
    gsap.set('.f-vein', { opacity: 0 });
    ScrollTrigger.create({
      trigger: svg, start: 'top 75%', once: true,
      onEnter: () => {
        const tl = gsap.timeline();
        tl.to(stem, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.out' })
          .to(leafL, { scale: 1, duration: 0.8, ease: 'back.out(1.8)' }, '-=.6')
          .to(leafR, { scale: 1, duration: 0.8, ease: 'back.out(1.8)' }, '-=.55')
          .to('.f-vein', { opacity: 1, duration: 0.5 }, '-=.3')
          .from(gPetals, { rotation: -25, scale: 0.8, opacity: 0, transformOrigin: '50% 50%', duration: 1.4, ease: 'power3.out' }, 0.2)
          .to(seeds, { scale: 1, duration: 0.35, ease: 'back.out(3)', stagger: { each: 0.005 } }, 0.3)
          .add(markNext);
      }
    });

    // sole basso finché il girasole non è completo
    const rays = $('.ls-rays');
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      svgEl('line', { x1: 50 + Math.cos(a) * 29, y1: 50 + Math.sin(a) * 29, x2: 50 + Math.cos(a) * (i % 2 ? 35 : 38), y2: 50 + Math.sin(a) * (i % 2 ? 35 : 38) }, rays);
    }
    if (!RM) gsap.to(rays, { rotation: 360, transformOrigin: '50% 50%', duration: 60, repeat: -1, ease: 'none' });
    gsap.set('#littleSun', { y: 46, opacity: 0.7, scale: 0.85 });

    // un solo tocco ovunque sul fiore: si calcola il petalo dall'angolo
    svg.addEventListener('click', (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const m = svg.getScreenCTM();
      if (!m) return;
      const p = pt.matrixTransform(m.inverse());
      const d = Math.hypot(p.x, p.y);
      if (d > 215) return;
      if (d < 92) return openNext();
      const ang = ((Math.atan2(p.x, -p.y) * 180) / Math.PI + 360) % 360;
      tapPetal(Math.round(ang / step) % N);
    });

    $('#nextPetal').addEventListener('click', openNext);
    $('#openAll').addEventListener('click', () => {
      haptic(12);
      const rest = [...Array(N).keys()].filter((i) => !opened.has(i));
      rest.forEach((i, k) => setTimeout(() => openPetal(i, k === rest.length - 1), k * 70));
    });

    initSunEgg();
    if (opened.size === N) completeFlower(false);
  }

  function nextClosed(from = 0) {
    const N = C.petali.length;
    for (let k = 0; k < N; k++) {
      const i = (from + k) % N;
      if (!opened.has(i)) return i;
    }
    return -1;
  }

  // il prossimo petalo da aprire brilla piano
  function markNext() {
    if (pulse) { pulse.kill(); pulse = null; }
    petalsRef.forEach((p, i) => { if (!opened.has(i)) gsap.set(p.open, { opacity: 0 }); });
    const i = nextClosed();
    if (i < 0 || RM) return;
    pulse = gsap.fromTo(petalsRef[i].open, { opacity: 0.1 }, { opacity: 0.75, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }

  function tapPetal(i) {
    if (!opened.has(i)) openPetal(i);
    openSheet(i);
  }

  function openNext() {
    const i = nextClosed();
    if (i < 0) { haptic(6); return; }
    tapPetal(i);
  }

  function setPetalOpen(p, animate) {
    if (!animate) {
      gsap.set(p.inner, { scaleX: 1, scaleY: 1, rotation: 0, transformOrigin: '50% 100%' });
      gsap.set([p.open, p.rib], { opacity: 1 });
      gsap.set(p.closed, { opacity: 0 });
      return;
    }
    gsap.to(p.inner, { scaleX: 1, scaleY: 1, rotation: 0, transformOrigin: '50% 100%', duration: 1.3, ease: 'elastic.out(1, 0.42)' });
    gsap.to(p.open, { opacity: 1, duration: 0.35, overwrite: true });
    gsap.to(p.rib, { opacity: 0.8, duration: 0.6, delay: 0.2 });
    gsap.to(p.closed, { opacity: 0, duration: 0.35 });
  }

  function openPetal(i, isLastOfBatch = true) {
    if (opened.has(i)) return;
    if (pulse) { pulse.kill(); pulse = null; }
    opened.add(i);
    store.set(STORE_PETALS, [...opened]);
    setPetalOpen(petalsRef[i], true);
    if (isLastOfBatch) {
      setTimeout(() => {
        const r = petalsRef[i].open.getBoundingClientRect();
        const ang = ((i * 360) / C.petali.length - 90) * Math.PI / 180;
        FX.burst(r.left + r.width / 2 + Math.cos(ang) * r.width * 0.3, r.top + r.height / 2 + Math.sin(ang) * r.height * 0.3,
          { count: 12, kinds: ['heart', 'spark', 'petal'], speed: 5, life: 80, size: 9, angle: ang, spread: 0.9 });
      }, 250);
    }
    haptic(12);
    updateCounter(isLastOfBatch);
    if (opened.size === C.petali.length) {
      if (!isLastOfBatch) return;
      if (sheetOpen) pendingComplete = true;
      else setTimeout(() => completeFlower(true), 900);
    } else if (isLastOfBatch) {
      setTimeout(markNext, 700);
    }
  }

  function updateCounter(animate) {
    const el = $('#petalCount');
    el.textContent = opened.size;
    if (animate) gsap.fromTo(el, { scale: 1.5, rotation: -8 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(3)' });
    const total = C.petali.length;
    const done = opened.size >= total;
    $('#openAll').hidden = !(opened.size >= 5 && !done);
    $('#nextPetal').hidden = done;
    $('.flower-tip').style.visibility = done ? 'hidden' : 'visible';
    $('#nextPetal').textContent = opened.size === 0 ? 'Apri il primo petalo' : 'Apri il prossimo petalo';
  }

  function completeFlower(animate) {
    if (flowerDone) return;
    flowerDone = true;
    $('#openAll').hidden = true;
    const d = animate ? 1 : 0;
    const tl = gsap.timeline({ delay: animate ? 0.3 : 0 });
    if (animate) {
      setTimeout(() => {
        const [x, y] = FX.center($('#flower .head'));
        FX.burst(x, y, { count: 90, speed: 15, speedMin: 5, life: 170, size: 14 });
        FX.rain(5000, { density: 3 });
        haptic([20, 60, 20, 60, 40]);
      }, 400);
    }
    tl.to('#littleSun', { y: -8, opacity: 1, scale: 1.25, duration: 3 * d, ease: 'power2.out' })
      .to('.warmth', { opacity: 0.85, duration: 3 * d, ease: 'power1.inOut' }, '<')
      .to('#flower .petals, #flower .head', { rotation: 10, x: 8, transformOrigin: '50% 50%', duration: 3.4 * d, ease: 'power2.inOut' }, '<.2')
      .add(() => typeReveal($('#finalGirasole'), C.messaggio_finale_girasole, animate), animate ? '-=1.4' : 0);
  }

  function typeReveal(el, text, animate = true) {
    el.innerHTML = '';
    const chars = [];
    text.split(' ').forEach((word, wi, arr) => {
      const w = document.createElement('span');
      w.className = 'w';
      for (const ch of word) {
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = ch;
        w.appendChild(s); chars.push(s);
      }
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    if (!animate) { gsap.set(chars, { opacity: 1 }); return; }
    gsap.fromTo(chars, { opacity: 0, y: 6, rotation: -6 }, { opacity: 1, y: 0, rotation: 0, duration: 0.5, ease: 'power2.out', stagger: 0.045 });
  }

  // easter egg: pressione lunga sul sole
  function initSunEgg() {
    const sun = $('#littleSun');
    let timer = null, shown = false;
    const start = (e) => {
      e.preventDefault();
      clearTimeout(timer);
      gsap.to('.ls-disc', { scale: 1.15, transformOrigin: '50% 50%', duration: 0.7 });
      timer = setTimeout(() => {
        haptic([10, 30, 20]);
        gsap.to('.ls-disc', { scale: 1, duration: 0.6, ease: 'elastic.out(1,.4)' });
        { const [x, y] = FX.center(sun); FX.burst(x, y, { count: 36, kinds: ['heart', 'spark'], speed: 8, life: 120, size: 11 }); }
        if (!shown) { shown = true; typeReveal($('#secretMsg'), C.messaggio_segreto); }
        else gsap.fromTo('#secretMsg', { scale: 0.96 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
      }, 750);
    };
    const end = () => { clearTimeout(timer); gsap.to('.ls-disc', { scale: 1, duration: 0.4 }); };
    sun.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => sun.addEventListener(ev, end));
    sun.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------- bottom sheet ----------

  let sheetOpen = false, lastFocus = null, sheetIdx = 0;

  function sunflowerDoodle(svg) {
    svg.innerHTML = '';
    svgEl('circle', { cx: 40, cy: 30, r: 7 }, svg);
    for (let i = 0; i < 10; i++) {
      const a = (i * 36 * Math.PI) / 180;
      const x1 = 40 + Math.cos(a) * 9, y1 = 30 + Math.sin(a) * 9;
      const x2 = 40 + Math.cos(a) * 17, y2 = 30 + Math.sin(a) * 17;
      const cx = 40 + Math.cos(a + 0.35) * 15, cy = 30 + Math.sin(a + 0.35) * 15;
      svgEl('path', { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}` }, svg);
    }
    svgEl('path', { d: 'M40 47 C39 56 41 66 40 78 M40 62 C34 60 30 56 29 51 C35 52 39 56 40 62 M40 69 C46 67 50 63 51 58 C45 59 41 63 40 69', style: 'stroke:var(--verde-stelo)' }, svg);
    if (!RM) {
      $$('*', svg).forEach((p, k) => {
        const len = p.getTotalLength ? p.getTotalLength() : 60;
        gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.5, delay: 0.25 + k * 0.05 });
      });
    }
  }

  function fillSheet(i) {
    const p = C.petali[i];
    $('#sheetLabel').textContent = `Giorno ${p.giorno} · Amo…`;
    $('#sheetTitle').textContent = p.titolo;
    $('#sheetText').textContent = p.testo || '';
    const img = $('#sheetPhoto'), doodle = $('#sheetDoodle');
    if (p.foto) {
      img.hidden = false; img.src = local(p.foto); img.alt = p.titolo;
      doodle.style.display = 'none';
    } else {
      img.hidden = true; img.removeAttribute('src');
      doodle.style.display = p.testo ? 'none' : 'block';
      if (!p.testo) sunflowerDoodle(doodle);
    }
    // navigazione
    const N = C.petali.length;
    const prev = (i - 1 + N) % N;
    $('#sheetPrev').disabled = !opened.has(prev) || prev === i;
    const nxt = (i + 1) % N;
    $('#sheetNext').textContent = opened.has(nxt) ? (nxt === 0 ? 'Torna al primo' : 'Successivo') : 'Apri il prossimo';
  }

  function openSheet(i) {
    const sheet = $('#sheet'), bd = $('#sheetBackdrop'), content = $('#sheetContent');
    const dir = i === (sheetIdx + 1) % C.petali.length ? 1 : -1;
    sheetIdx = i;
    if (sheetOpen) {
      // già aperto: cambia solo il contenuto, con uno scorrimento
      gsap.timeline()
        .to(content, { opacity: 0, x: -24 * dir, duration: 0.18, ease: 'power1.in' })
        .add(() => fillSheet(i))
        .fromTo(content, { opacity: 0, x: 24 * dir }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' });
      return;
    }
    fillSheet(i);
    lastFocus = document.activeElement;
    sheet.hidden = false; bd.hidden = false;
    sheetOpen = true;
    gsap.killTweensOf([sheet, bd]);
    gsap.set(content, { opacity: 1, x: 0 });
    gsap.to(bd, { opacity: 1, duration: 0.35 });
    gsap.fromTo(sheet, { yPercent: 105, y: 0 }, { yPercent: 0, duration: 0.7, ease: 'back.out(1.1)', delay: 0.12 });
    gsap.fromTo('#sheetTitle', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.35 });
    $('#sheetNext').focus({ preventScroll: true });
  }

  function sheetGo(dir) {
    const N = C.petali.length;
    const j = (sheetIdx + dir + N) % N;
    if (dir < 0 && !opened.has(j)) return;
    haptic(8);
    if (!opened.has(j)) openPetal(j);
    openSheet(j);
  }

  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    const sheet = $('#sheet'), bd = $('#sheetBackdrop');
    gsap.to(bd, { opacity: 0, duration: 0.3 });
    gsap.to(sheet, {
      yPercent: 105, y: 0, duration: 0.4, ease: 'power2.in',
      onComplete: () => {
        sheet.hidden = true; bd.hidden = true;
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
        if (pendingComplete) {
          pendingComplete = false;
          $('#girasole').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
          setTimeout(() => completeFlower(true), 600);
        }
      }
    });
  }

  function initSheetGestures() {
    const sheet = $('#sheet');
    $('#sheetBackdrop').addEventListener('click', closeSheet);
    $('#sheetClose').addEventListener('click', closeSheet);
    $('#sheetNext').addEventListener('click', () => sheetGo(1));
    $('#sheetPrev').addEventListener('click', () => sheetGo(-1));
    document.addEventListener('keydown', (e) => {
      if (!sheetOpen) return;
      if (e.key === 'ArrowRight') sheetGo(1);
      if (e.key === 'ArrowLeft') sheetGo(-1);
    });
    // giù per chiudere, di lato per cambiare petalo
    let x0 = null, y0 = null, dx = 0, dy = 0;
    sheet.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = dy = 0; }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
      if (y0 === null) return;
      dx = e.touches[0].clientX - x0;
      dy = e.touches[0].clientY - y0;
      if (dy > 0 && dy > Math.abs(dx)) gsap.set(sheet, { y: dy });
    }, { passive: true });
    sheet.addEventListener('touchend', () => {
      if (y0 === null) return;
      if (dy > 80 && dy > Math.abs(dx)) closeSheet();
      else {
        gsap.to(sheet, { y: 0, duration: 0.4, ease: 'back.out(2)' });
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) sheetGo(dx < 0 ? 1 : -1);
      }
      x0 = y0 = null;
    });
  }

  // ==========================================================
  // APERTURA e frasi della canzone
  // ==========================================================

  function sinceText() {
    const ms = Date.now() - MOMENT().getTime();
    if (ms < 0) return 'poco';
    const m = Math.floor(ms / 60000);
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
    const pl = (n, s, p) => `${n} ${n === 1 ? s : p}`;
    const parts = [[d, 'giorno', 'giorni'], [h, 'ora', 'ore'], [mi, 'minuto', 'minuti']].filter((x) => x[0] > 0).map((x) => pl(...x));
    if (!parts.length) return 'adesso';
    return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
  }

  function initHero() {
    const since = $('#since');
    const tick = () => { since.textContent = sinceText(); };
    tick();
    setInterval(tick, 20000);

    // girasole che sboccia quando le due luci si incontrano
    const svg = $('#heroFlower');
    const defs = svgEl('defs', {}, svg);
    const grad = svgEl('linearGradient', { id: 'heroGrad', gradientUnits: 'userSpaceOnUse', x1: 0, y1: -90, x2: 0, y2: -250 }, defs);
    svgEl('stop', { offset: 0, 'stop-color': '#DE8C0C' }, grad);
    svgEl('stop', { offset: 0.35, 'stop-color': '#F6B71E' }, grad);
    svgEl('stop', { offset: 1, 'stop-color': '#FFD86A' }, grad);
    const spin = svgEl('g', {}, svg);
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 34; i++) {
        const len = layer ? 230 : 250;
        svgEl('path', {
          d: `M0 -96 C${layer ? 18 : 22} -128 ${layer ? 24 : 28} -${len - 60} 0 -${len} C-${layer ? 24 : 28} -${len - 60} -${layer ? 18 : 22} -128 0 -96 Z`,
          fill: 'url(#heroGrad)', stroke: '#D98A0B', 'stroke-width': 1.2, opacity: layer ? 1 : 0.75,
          transform: `rotate(${i * (360 / 34) + (layer ? 360 / 68 : 0)})`
        }, spin);
      }
    }
    buildDisk(svg, spin, 104, 300);
    if (!RM) gsap.to(spin, { rotation: 360, transformOrigin: '50% 50%', duration: 140, repeat: -1, ease: 'none' });

    const hero = $('#inizio'), lineEl = $('#heroLine'), kmEl = $('#heroKm');
    const lights = [$('#lightG'), $('#lightV')];
    const total = Math.round(haversine(PLACES.granada, PLACES.veternigo));
    let d0 = 0, pinTl = null;
    const drawLine = () => {
      const hr = hero.getBoundingClientRect();
      const [a, b] = lights.map((l) => { const r = l.getBoundingClientRect(); return [r.left - hr.left, r.top - hr.top]; });
      lineEl.setAttribute('x1', a[0]); lineEl.setAttribute('y1', a[1]);
      lineEl.setAttribute('x2', b[0]); lineEl.setAttribute('y2', b[1]);
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!d0) d0 = d;
      kmEl.style.left = `${(a[0] + b[0]) / 2}px`;
      kmEl.style.top = `${(a[1] + b[1]) / 2}px`;
      kmEl.textContent = `${fmtKm(total * Math.min(1, d / d0))} km`;
    };
    whenSized(hero).then(() => { d0 = 0; drawLine(); });
    addEventListener('resize', () => { if (!pinTl || pinTl.progress() === 0) { d0 = 0; drawLine(); } });

    heroStars();

    // ingresso: lettere, luci, filo
    const chars = splitChars($('.hero-title'));
    gsap.set(svg, { xPercent: -50, yPercent: -50, scale: 0, rotation: -120 });
    const intro = gsap.timeline({ delay: 0.3 });
    intro.from(['.hero .kicker'], { opacity: 0, y: 14, duration: 1 })
      .add(revealChars(chars), 0.2)
      .from(['.hero-since', '.hero .song:not([hidden])'], { opacity: 0, y: 20, duration: 1.2, stagger: 0.2, ease: 'power3.out' }, 0.9)
      // luci, filo, km e "scorri" entrano con animazioni CSS (.is-intro):
      // così non litigano con la timeline dello scorrimento, che anima gli stessi elementi
      .add(() => hero.classList.add('is-intro'), 0);
    if (!RM) gsap.to(lights.map((l) => $('i', l)), { scale: 1.35, duration: 1.3, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.65 });

    if (RM) return;

    // scorrendo, le due luci si avvicinano fino a incontrarsi, e sboccia il girasole
    let burstDone = false;
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    tl.to(['.hero-text', '.scroll-cue'], { y: -70, opacity: 0, duration: 3, ease: 'power1.in' }, 0)
      .to(lights, { left: '50%', top: '62%', duration: 6, ease: 'power2.inOut', onUpdate: drawLine }, 0)
      .to(lights.map((l) => $('span', l)), { opacity: 0, duration: 1 }, 3.4)
      .to('.hero-flash', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 6)
      .to('.hero-flash', { opacity: 0, duration: 1.6, ease: 'power1.out' }, 6.5)
      .to([...lights, kmEl, '.hero-thread'], { opacity: 0, scale: 2.5, duration: 0.8 }, 6)
      .to('.hero-dawn', { opacity: 1, duration: 3 }, 6.1)
      .to('#heroSky', { opacity: 0.25, duration: 3 }, 6.1)
      .to(svg, { scale: 1, rotation: 0, opacity: 1, duration: 3.2, ease: 'back.out(1.2)' }, 6.3)
      .fromTo('#heroMeet', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.6, ease: 'power2.out' }, 8.2)
      .to({}, { duration: 1.2 });
    pinTl = tl;
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: '+=190%', pin: true, scrub: 0.8, anticipatePin: 1, animation: tl,
      onUpdate: (self) => {
        const p = tl.progress();
        if (p > 0.6 && !burstDone) {
          burstDone = true;
          const r = hero.getBoundingClientRect();
          FX.burst(r.left + r.width / 2, r.top + r.height * 0.62, { count: 70, speed: 13, life: 150, size: 13 });
          haptic([20, 60, 20]);
        } else if (p < 0.5) burstDone = false;
      }
    });
  }

  // cielo stellato dell'apertura: scintillio solo mentre è sullo schermo
  function heroStars() {
    const cv = $('#heroSky'), ctx = cv.getContext('2d');
    let W = 0, H = 0, stars = [], visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      W = cv.clientWidth; H = cv.clientHeight;
      if (!W || !H) return;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((W * H) / 2600) }, () => ({
        x: Math.random() * W, y: Math.random() * H * 0.95, r: Math.random() < 0.08 ? 1.6 : 0.5 + Math.random() * 0.8,
        a: 0.3 + Math.random() * 0.7, s: 0.5 + Math.random() * 2, o: Math.random() * 6.28
      }));
    };
    whenSized(cv).then(resize);
    addEventListener('resize', resize);
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(cv);
    let last = 0;
    const draw = (t) => {
      requestAnimationFrame(draw);
      if (!visible || document.hidden || t - last < 40) return;
      last = t;
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        const tw = RM ? 1 : 0.55 + 0.45 * Math.sin(t / 1000 * s.s + s.o);
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = s.r > 1.4 ? '#FFE9A8' : '#FFFFFF';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    requestAnimationFrame(draw);
  }

  // ---------- titoli lettera per lettera ----------

  function splitChars(el) {
    if (!el || el.dataset.split) return $$('.ch', el);
    el.dataset.split = '1';
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            for (const c of part) {
              const s = document.createElement('span');
              s.className = 'ch'; s.textContent = c;
              w.appendChild(s);
            }
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    return $$('.ch', el);
  }

  function revealChars(chars, extra = {}) {
    return gsap.fromTo(chars,
      { opacity: 0, yPercent: 55, rotationX: -75, filter: 'blur(8px)' },
      { opacity: 1, yPercent: 0, rotationX: 0, filter: 'blur(0px)', duration: 1.1, stagger: 0.028, ease: 'power3.out', transformPerspective: 400, ...extra });
  }

  // ---------- il viaggio: da 1.596 km a zero, mentre lei legge ----------

  function initRail() {
    const rail = $('#rail'), heart = $('#railHeart'), kmEl = $('#railKm');
    const total = Math.round(haversine(PLACES.granada, PLACES.veternigo));
    let idle = null, arrived = false;
    ScrollTrigger.create({
      trigger: '#mappa', start: 'top 70%', endTrigger: '#finale', end: 'bottom bottom',
      onUpdate: (self) => {
        const p = self.progress;
        rail.classList.toggle('is-on', p > 0);
        heart.style.top = `${(p * 100).toFixed(2)}%`;
        kmEl.textContent = p >= 0.995 ? 'sono qui · 0 km' : `${fmtKm(Math.max(1, total * (1 - p)))} km da te`;
        rail.classList.add('is-moving');
        clearTimeout(idle);
        idle = setTimeout(() => rail.classList.remove('is-moving'), 1300);
        if (p >= 0.995 && !arrived) {
          arrived = true;
          rail.classList.add('is-arrived');
          const [x, y] = FX.center(heart);
          FX.burst(x - 10, y, { count: 28, kinds: ['heart', 'heart', 'spark'], speed: 7, life: 110, size: 11 });
          haptic([20, 50, 20]);
        } else if (p < 0.97 && arrived) {
          arrived = false;
          rail.classList.remove('is-arrived');
        }
      },
      onLeaveBack: () => rail.classList.remove('is-on')
    });
    // sul cuore c'è già il suo filo: il binario si fa da parte
    ScrollTrigger.create({ trigger: '#beat', start: 'top 90%', end: 'bottom 10%', toggleClass: { targets: rail, className: 'is-hidden' } });
    ['#finestre', '#rullino', '#solote'].forEach((sel) => {
      if (!$(sel).hidden) ScrollTrigger.create({ trigger: sel, start: 'top 60%', end: 'bottom 40%', toggleClass: { targets: rail, className: 'is-hidden' } });
    });
  }

  function renderSongs() {
    const s = C.canzone || {};
    const frasi = s.frasi || {};
    $$('.song').forEach((f) => {
      const t = String(frasi[f.dataset.song] || '').trim();
      if (!t) { f.hidden = true; return; }
      f.hidden = false;
      $('.song-text', f).innerHTML = t.split(/\n/).map(escapeHTML).join('<br>');
      $('.song-cap', f).textContent = [s.artista, s.titolo].filter(Boolean).join(' · ');
      if (f.dataset.song !== 'apertura') {
        gsap.from(f, { opacity: 0, y: 24, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: f, start: 'top 88%', once: true } });
      }
    });
  }

  // ==========================================================
  // 3.3 APRI QUANDO…
  // ==========================================================

  const ROTS = [-3.5, 2.5, -1.5, 3, -2.5, 1.8, -2, 2.2];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  let letterOpen = null;

  function initLetters() {
    const box = $('#letters');
    const done = new Set(store.get(STORE_LETTERS, []));
    C.lettere.forEach((l, i) => {
      const b = document.createElement('button');
      b.className = 'letter-env' + (done.has(i) ? ' is-opened' : '');
      b.style.setProperty('--rot', `${ROTS[i % ROTS.length]}deg`);
      b.setAttribute('aria-label', l.etichetta);
      b.dataset.i = i;
      const rest = l.etichetta.replace(/^\s*apri quando\s*/i, '');
      const hasPrefix = rest !== l.etichetta;
      b.innerHTML = `
        <span class="le-body"></span>
        <span class="le-flap"><svg viewBox="0 0 300 120" preserveAspectRatio="none"><path d="M0 0 L300 0 L156 116 Q150 121 144 116 Z"/></svg></span>
        <span class="le-seal" aria-hidden="true"><svg viewBox="0 0 100 100"><use href="#waxSeal"/></svg></span>
        <span class="le-num" aria-hidden="true">${ROMAN[i] || i + 1}</span>
        <span class="le-label">${hasPrefix ? '<small>Apri quando</small>' : ''}<span>${escapeHTML(rest)}</span></span>
        <span class="le-stamp" aria-hidden="true"><svg viewBox="0 0 100 100">
          <defs><path id="pm${i}" d="M50 50 m-34 0 a34 34 0 1 1 68 0 a34 34 0 1 1 -68 0" /></defs>
          <circle cx="50" cy="50" r="44" class="pm-ring" />
          <circle cx="50" cy="50" r="24" class="pm-ring thin" />
          <text class="pm-text"><textPath href="#pm${i}" startOffset="0">LETTA CON AMORE · ${escapeHTML(C.nome_lei.toUpperCase())} ·</textPath></text>
          ${Array.from({ length: 10 }, (_, k) => `<ellipse cx="50" cy="40" rx="3.4" ry="8" class="pm-petal" transform="rotate(${k * 36} 50 50)"/>`).join('')}
          <circle cx="50" cy="50" r="6" class="pm-core" />
        </svg></span>`;
      b.addEventListener('click', () => openLetter(i, b));
      box.appendChild(b);
    });

    gsap.from('.letter-env', {
      opacity: 0, y: 40, rotation: (k) => ROTS[k % ROTS.length] * 3, duration: 1, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: box, start: 'top 80%', once: true },
      clearProps: 'transform'
    });

    const ov = $('#letterOverlay');
    ov.addEventListener('click', (e) => { if (e.target === ov) closeLetter(); });
    $('#letterClose').addEventListener('click', closeLetter);

    const paper = $('#letterPaper');
    let y0 = null, dy = 0;
    paper.addEventListener('touchstart', (e) => { y0 = paper.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    paper.addEventListener('touchmove', (e) => {
      if (y0 === null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) gsap.set(paper, { y: dy * 0.6 });
    }, { passive: true });
    paper.addEventListener('touchend', () => {
      if (y0 !== null && dy > 90) closeLetter();
      else gsap.to(paper, { y: 0, duration: 0.4, ease: 'back.out(2)' });
      y0 = null;
    });
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function openLetter(i, btn) {
    if (letterOpen) return;
    const l = C.lettere[i];
    letterOpen = { i, btn };
    haptic(10);
    paperSound(0.4, 0.12);
    { const r = btn.getBoundingClientRect(); FX.float(r.left + r.width / 2, r.top + r.height * 0.4, { count: 9, width: r.width * 0.3, size: 13 }); }
    lastFocus = btn;

    $('#letterLabel').textContent = l.etichetta;
    $('#letterHello').textContent = C.lettere_saluto || '';
    $('#letterBye').textContent = C.lettere_firma || '';
    $('#letterName').textContent = C.nome_lui;
    $('#letterBody').innerHTML = l.testo.split(/\n\s*\n/).map((p) => `<p>${escapeHTML(p)}</p>`).join('');

    const flap = $('.le-flap', btn);
    const ov = $('#letterOverlay'), paper = $('#letterPaper');
    const tl = gsap.timeline();
    tl.to(flap, { rotationX: 180, duration: 0.45, ease: 'power2.inOut', transformPerspective: 600 })
      .to(btn, { y: -8, duration: 0.3 }, '<')
      .add(() => { ov.hidden = false; paper.scrollTop = 0; })
      .to(ov, { opacity: 1, duration: 0.35 })
      .fromTo(paper, { y: 80, scaleY: 0.32, opacity: 0 }, { y: 0, scaleY: 1, opacity: 1, duration: 0.95, ease: 'power3.out' }, '<')
      .fromTo('.letter-fold', { opacity: 1 }, { opacity: 0.45, duration: 1 }, '<.3')
      .fromTo('.letter-hello, #letterBody p, .letter-sign', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 }, '<.2')
      .fromTo('.letter-petal', { opacity: 0, y: -180, x: 40, rotation: -70 }, { opacity: 1, y: 0, x: 0, rotation: 18, duration: 1.8, ease: 'power1.out' }, '<.1')
      .add(() => $('#letterClose').focus({ preventScroll: true }));
  }

  function closeLetter() {
    if (!letterOpen) return;
    const { i, btn } = letterOpen;
    const ov = $('#letterOverlay'), paper = $('#letterPaper');
    paperSound(0.3, 0.08);
    const tl = gsap.timeline({ onComplete: () => { letterOpen = null; } });
    tl.to(paper, { scaleY: 0.32, y: 60, opacity: 0, duration: 0.5, ease: 'power2.in' })
      .to(ov, { opacity: 0, duration: 0.3 }, '-=.2')
      .add(() => { ov.hidden = true; gsap.set(paper, { y: 0 }); })
      .to($('.le-flap', btn), { rotationX: 0, duration: 0.45, ease: 'power2.inOut' })
      .to(btn, { y: 0, duration: 0.3 }, '<')
      .add(() => {
        if (!btn.classList.contains('is-opened')) {
          btn.classList.add('is-opened');
          haptic(8);
          const done = new Set(store.get(STORE_LETTERS, []));
          done.add(i);
          store.set(STORE_LETTERS, [...done]);
        }
        btn.focus({ preventScroll: true });
      });
  }

  // il momento in cui è cominciato tutto
  const MOMENT = () => {
    // 10 ottobre 2026, 13:00 ora locale (CEST, UTC+2) → 11:00 UTC
    const [y, m, d] = C.data_inizio.split('-').map(Number);
    const [hh, mm] = C.ora_inizio.split(':').map(Number);
    return new Date(Date.UTC(y, m - 1, d, hh - 2, mm));
  };

  // ==========================================================
  // 3.4 POSTA AEREA: un aereo porta una lettera fatta di cuori
  // ==========================================================

  const HEART_D = 'M50 88 C20 66 4 50 4 30 C4 14 16 4 29 4 C39 4 46 10 50 18 C54 10 61 4 71 4 C84 4 96 14 96 30 C96 50 80 66 50 88 Z';

  function initPosta() {
    const P = C.posta || {};
    const frase = P.frase || 'Sono qui,\namore mio';
    const stage = $('#postaStage'), plane = $('#postaPlane'), env = $('#postaEnv'), chute = $('.posta-chute', env);
    const seal = $('#postaSeal'), stringEl = $('#postaString'), hint = $('#postaHint');
    const note = $('#postaNote'), replyBox = $('#postaReplyBox');
    $('.pe-to em', env).textContent = C.nome_lei;
    $('#postaText').textContent = P.biglietto || '';
    $('#postaSign').textContent = C.nome_lui;

    // nuvole in parallasse
    [['.cloud.c1', 70], ['.cloud.c2', -60], ['.cloud.c3', 45]].forEach(([sel, x]) => {
      gsap.to(sel, { x, ease: 'none', scrollTrigger: { trigger: '#posta', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });

    let W = 0, H = 0;
    const measure = () => { W = stage.clientWidth; H = stage.clientHeight; };

    // stato dell'aereo e della busta, in pixel dentro la scena
    let mode = 'wait';           // wait → enter → loop → drop → landed → opened
    const pl = { x: -80, y: 0, a: 0, flip: 1 };
    const ev = { x: -80, y: 0, vx: 0, vy: 0, r: 0 };
    let tEnter = 0, theta = 0, lastTrail = 0, loopStart = 0, leave = null;
    const entry = svgEl('path', {}, $('.posta-string'));
    entry.style.display = 'none';

    const placePlane = () => gsap.set(plane, { x: pl.x, y: pl.y, rotation: pl.a, scaleY: pl.flip });
    const placeEnv = () => gsap.set(env, { x: ev.x, y: ev.y, rotation: ev.r });
    const HANG = 0.66; // la busta è più piccola finché è appesa all'aereo
    const loopC = () => ({ cx: W * 0.5, cy: H * 0.24, rx: W * 0.32, ry: H * 0.07 });

    const steer = (nx, ny) => {
      const dx = nx - pl.x, dy = ny - pl.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.01) {
        let target = Math.atan2(dy, dx) * 180 / Math.PI;
        let d = ((target - pl.a + 540) % 360) - 180;
        pl.a += d * 0.25;
      }
      const c = Math.cos(pl.a * Math.PI / 180);
      pl.flip += ((c < 0 ? -1 : 1) - pl.flip) * 0.15;
      pl.x = nx; pl.y = ny;
    };

    const trail = (now) => {
      if (now - lastTrail < 170 || RM) return;
      lastTrail = now;
      const r = stage.getBoundingClientRect();
      const rad = pl.a * Math.PI / 180;
      FX.burst(r.left + pl.x - Math.cos(rad) * 34, r.top + pl.y - Math.sin(rad) * 34, { count: 1, kinds: ['heart'], speed: 0.5, speedMin: 0.1, gravity: -0.004, life: 90, lifeMin: 60, size: 7, sizeMin: 4 });
    };

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(3, gsap.ticker.deltaRatio());
      if (mode === 'enter') {
        tEnter = Math.min(1, tEnter + dt / (60 * 2.8));
        const e = tEnter < 0.5 ? 2 * tEnter * tEnter : 1 - Math.pow(-2 * tEnter + 2, 2) / 2;
        const pt = entry.getPointAtLength(entry.getTotalLength() * e);
        steer(pt.x, pt.y);
        if (tEnter >= 1) { mode = 'loop'; theta = 0; loopStart = now; }
      } else if (mode === 'loop') {
        const { cx, cy, rx, ry } = loopC();
        theta += 0.018 * dt;
        steer(cx + rx * Math.cos(theta), cy + ry * Math.sin(theta) + Math.sin(theta * 3) * 6);
        if (now - loopStart > 8000) dropLetter();  // se non la prende, la lascia cadere lui
      } else if (leave) {
        leave.t = Math.min(1, leave.t + dt / (60 * 1.8));
        const t = leave.t, u = 1 - t;
        steer(u * u * leave.p0[0] + 2 * u * t * leave.p1[0] + t * t * leave.p2[0], u * u * leave.p0[1] + 2 * u * t * leave.p1[1] + t * t * leave.p2[1]);
        if (t >= 1) { leave = null; plane.style.visibility = 'hidden'; }
      }
      if (mode === 'enter' || mode === 'loop' || leave) { placePlane(); trail(now); }

      // la busta appesa al filo: una molla morbida, come un pendolo
      if (mode === 'enter' || mode === 'loop') {
        const tx = pl.x, ty = pl.y + 78;
        ev.vx = (ev.vx + (tx - ev.x) * 0.05 * dt) * Math.pow(0.8, dt);
        ev.vy = (ev.vy + (ty - ev.y) * 0.05 * dt) * Math.pow(0.8, dt);
        ev.x += ev.vx * dt; ev.y += ev.vy * dt;
        ev.r = Math.max(-18, Math.min(18, -ev.vx * 1.4));
        placeEnv();
        stringEl.setAttribute('x1', pl.x); stringEl.setAttribute('y1', pl.y + 8);
        stringEl.setAttribute('x2', ev.x); stringEl.setAttribute('y2', ev.y - 43 * HANG);
      }
      if (mode !== 'enter' && mode !== 'loop' && !leave) gsap.ticker.remove(tick);
    };

    const startFlight = () => {
      measure();
      const { cx, cy, rx } = loopC();
      entry.setAttribute('d', `M-70 ${cy + H * 0.12} C${W * 0.2} ${cy - H * 0.16} ${cx + rx * 0.9} ${cy - H * 0.2} ${cx + rx} ${cy}`);
      pl.x = -70; pl.y = cy + H * 0.12; ev.x = pl.x; ev.y = pl.y + 78;
      gsap.set(env, { scale: HANG });
      gsap.set([plane, env], { autoAlpha: 1 });
      mode = 'enter';
      gsap.ticker.add(tick);
    };

    const landed = () => {
      mode = 'landed';
      env.classList.add('is-landed');
      gsap.to(chute, { scale: 0, rotation: 25, opacity: 0, duration: 0.7, ease: 'power2.in' });
      gsap.fromTo(env, { y: H * 0.7 }, { keyframes: [{ y: H * 0.7 + 6, duration: 0.12 }, { y: H * 0.7, duration: 0.4, ease: 'back.out(3)' }] });
      haptic(12);
      setHint('Tocca il sigillo per aprirla');
    };

    function dropLetter() {
      if (mode !== 'loop' && mode !== 'enter') return;
      mode = 'drop';
      haptic([10, 40, 10]);
      setHint('');
      gsap.to('.posta-string', { opacity: 0, duration: 0.4 });
      // l'aereo saluta e se ne va verso l'alto
      leave = { t: 0, p0: [pl.x, pl.y], p1: [pl.x + 90 * Math.sign(Math.cos(pl.a * Math.PI / 180) || 1), pl.y - 30], p2: [W + 120, -80] };
      gsap.ticker.add(tick);
      // la busta scende col suo paracadute a cuore, ondeggiando come una foglia
      gsap.fromTo(chute, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' });
      gsap.to(env, { scale: 1, duration: 3, ease: 'sine.inOut' });
      const x0 = ev.x, y0 = ev.y, o = { e: 0 };
      gsap.to(o, {
        e: 1, duration: 3.4, ease: 'sine.inOut',
        onUpdate: () => {
          const k = 1 - o.e;
          ev.x = x0 + (W * 0.5 - x0) * o.e + Math.sin(o.e * Math.PI * 3) * 26 * k;
          ev.y = y0 + (H * 0.7 - y0) * o.e;
          ev.r = Math.cos(o.e * Math.PI * 3) * 12 * k;
          placeEnv();
        },
        onComplete: landed
      });
    }

    function setHint(t) {
      gsap.to(hint, { autoAlpha: 0, duration: 0.25, onComplete: () => { hint.textContent = t; if (t) gsap.to(hint, { autoAlpha: 1, duration: 0.5 }); } });
    }

    plane.addEventListener('click', dropLetter);
    plane.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dropLetter(); } });

    seal.addEventListener('click', () => {
      if (mode !== 'landed') return;
      mode = 'opened';
      env.classList.remove('is-landed');
      haptic([15, 50, 25]);
      paperSound(0.4, 0.12);
      setHint('');
      gsap.to($('.pe-flap', env), { rotationX: 180, duration: 0.5, ease: 'power2.inOut', transformPerspective: 500 });
      gsap.to(env, { scale: 1.1, duration: 0.4, ease: 'power2.out' });
      gsap.to(env, { autoAlpha: 0, y: '+=30', duration: 0.8, delay: 1.2 });
      heartLetter(ev.x, ev.y - 10);
    });

    // ---------- la lettera fatta di cuori ----------
    function heartLetter(ox, oy) {
      measure();
      const cv = $('#postaHearts'), ctx = cv.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;

      const sample = (draw, maxN) => {
        const off = document.createElement('canvas');
        off.width = W; off.height = H;
        const o = off.getContext('2d');
        draw(o);
        const data = o.getImageData(0, 0, W, H).data;
        let gap = 3, pts = [];
        do {
          pts = [];
          for (let y = 0; y < H; y += gap) for (let x = 0; x < W; x += gap) if (data[(y * W + x) * 4 + 3] > 140) pts.push([x, y]);
          gap++;
        } while (pts.length > maxN && gap < 14);
        return pts;
      };
      const lines = frase.split('\n');
      const textPts = sample((o) => {
        let fs = Math.min(W * 0.17, 76);
        o.textAlign = 'center'; o.textBaseline = 'middle';
        const setFont = () => { o.font = `italic 600 ${fs}px Fraunces, Georgia, serif`; };
        setFont();
        const widest = Math.max(...lines.map((l) => o.measureText(l).width));
        if (widest > W * 0.88) { fs *= (W * 0.88) / widest; setFont(); }
        const lh = fs * 1.12, y0 = H * 0.4 - ((lines.length - 1) * lh) / 2;
        lines.forEach((l, i) => o.fillText(l, W / 2, y0 + i * lh));
      }, 1300);
      const heartPts = sample((o) => {
        const s = Math.min(W, H) * 0.0068;
        o.translate(W / 2 - 50 * s, H * 0.42 - 46 * s);
        o.scale(s, s);
        o.fill(new Path2D(HEART_D));
      }, 1300);
      heartPts.sort(() => Math.random() - 0.5);

      const cols = ['#D9574E', '#C2493F', '#E5736A', '#D98A0B', '#C46A55', '#B83A44'];
      const parts = textPts.map(([tx, ty], i) => {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 9;
        return { x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, tx, ty, hx: heartPts[i % heartPts.length][0], hy: heartPts[i % heartPts.length][1],
          k: 0.05 + Math.random() * 0.06, s: 3.4 + Math.random() * 1.8, c: cols[i % cols.length], al: 1, rot: (Math.random() - 0.5) * 0.8 };
      });
      const shape = new Path2D(HEART_D);
      const t0 = performance.now();
      let fadeStarted = false, heartBeat = false, last = t0;

      // tutto in funzione del tempo vero: fluido anche se il telefono perde fotogrammi
      const frame = () => {
        const now = performance.now();
        const t = (now - t0) / 1000;
        const dt = Math.min(4, (now - last) / 16.67);
        last = now;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        const toHeart = t > 3.8, dissolve = t > 6.6;
        const pulse = toHeart && !dissolve ? 1 + 0.07 * Math.max(0, Math.sin((t - 3.8) * Math.PI * 2.4)) : 1;
        for (const p of parts) {
          if (dissolve) {
            p.vy -= 0.06 * dt; p.vx *= Math.pow(0.98, dt);
            p.x += p.vx * dt; p.y += p.vy * dt; p.al -= 0.012 * dt;
          } else {
            const tx = toHeart ? W / 2 + (p.hx - W / 2) * pulse : p.tx;
            const ty = toHeart ? H * 0.42 + (p.hy - H * 0.42) * pulse : p.ty;
            p.vx *= Math.pow(0.9, dt); p.vy *= Math.pow(0.9, dt);
            const k = t < 0.55 ? 0 : 1 - Math.pow(1 - p.k, dt);
            p.x += p.vx * dt + (tx - p.x) * k;
            p.y += p.vy * dt + (ty - p.y) * k;
          }
          if (p.al <= 0) continue;
          const sc = (p.s / 100) * dpr;
          ctx.setTransform(sc, 0, 0, sc, (p.x - p.s / 2) * dpr, (p.y - p.s / 2) * dpr);
          ctx.globalAlpha = Math.max(0, p.al);
          ctx.fillStyle = p.c;
          ctx.fill(shape);
        }
        ctx.globalAlpha = 1;
        if (dissolve && !fadeStarted) {
          fadeStarted = true;
          parts.forEach((p) => { p.vx = (Math.random() - 0.5) * 3; p.vy = -1 - Math.random() * 2.5; });
          showNote();
        }
        if (toHeart && !heartBeat) { heartBeat = true; haptic([20, 160, 20]); }
        if (t >= 8.6) { gsap.ticker.remove(frame); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
      };
      gsap.ticker.add(frame);
    }

    function showNote() {
      gsap.fromTo(note, { autoAlpha: 0, y: 30, rotation: -3, scale: 0.92 }, { autoAlpha: 1, y: 0, rotation: -1.5, scale: 1, duration: 1.4, ease: 'power3.out', xPercent: -50, yPercent: -50 });
      gsap.to(replyBox, { autoAlpha: 1, duration: 1, delay: 1.2 });
      const [x, y] = FX.center(note);
      FX.burst(x, y, { count: 30, kinds: ['heart', 'spark', 'petal'], speed: 8, life: 120 });
    }

    // ---------- la risposta: un cuore che vola verso Granada ----------
    let sent = 0;
    $('#postaReply').addEventListener('click', (e) => {
      sent++;
      haptic(12);
      const r = e.currentTarget.getBoundingClientRect();
      const fly = document.createElementNS(SVGNS, 'svg');
      fly.setAttribute('viewBox', '0 0 100 92');
      fly.setAttribute('class', 'posta-fly');
      svgEl('path', { d: HEART_D }, fly);
      document.body.appendChild(fly);
      const sx = r.left + r.width / 2, sy = r.top, ex = 40, ey = 70;
      const o = { t: 0 };
      gsap.to(o, {
        t: 1, duration: 1.6, ease: 'power1.in',
        onUpdate: () => {
          const t = o.t, u = 1 - t, mx = (sx + ex) / 2 + 80, my = Math.min(sy, ey) - 40;
          const x = u * u * sx + 2 * u * t * mx + t * t * ex, y = u * u * sy + 2 * u * t * my + t * t * ey;
          gsap.set(fly, { x, y, scale: 1.4 - t * 0.9, rotation: -20 * t, opacity: t > 0.85 ? (1 - t) / 0.15 : 1 });
        },
        onComplete: () => { FX.burst(ex, ey, { count: 12, kinds: ['heart', 'spark'], speed: 4, life: 60, size: 8 }); fly.remove(); }
      });
      $('#postaSent').textContent = sent === 1 ? 'Arrivato a Granada. Lo tengo qui.' : `${sent} cuori arrivati a Granada.`;
    });

    gsap.set([plane, env, replyBox], { autoAlpha: 0 });
    gsap.set(hint, { autoAlpha: 0 });

    whenSized(stage).then(() => {
      measure();
      addEventListener('resize', () => {
        measure();
        if (mode === 'landed' || mode === 'drop') { ev.x = W * 0.5; ev.y = H * 0.7; placeEnv(); }
      });
      if (RM) {
        ev.x = W * 0.5; ev.y = H * 0.7; placeEnv();
        gsap.set(env, { autoAlpha: 1 });
        mode = 'landed'; env.classList.add('is-landed'); hint.textContent = 'Tocca il sigillo per aprirla'; gsap.set(hint, { autoAlpha: 1 });
        return;
      }
      ScrollTrigger.create({
        trigger: stage, start: 'top 60%', once: true,
        onEnter: () => { startFlight(); setTimeout(() => { if (mode === 'enter' || mode === 'loop') setHint('Prendila al volo'); }, 1800); }
      });
    });
  }

  // ==========================================================
  // I NOSTRI MOMENTI: polaroid da lanciare
  // ==========================================================

  // ---------- foto e video: un solo modo di costruirli ----------

  const isVideo = (src) => /\.(mp4|webm|mov|m4v)$/i.test(src);
  function mediaEl(src, alt = '') {
    if (isVideo(src)) {
      const v = Object.assign(document.createElement('video'), { src: local(src), muted: true, loop: true, playsInline: true, preload: 'metadata' });
      v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      return v;
    }
    return Object.assign(document.createElement('img'), { src: local(src), alt, decoding: 'async' });
  }

  // ==========================================================
  // DUE FINESTRE: io a Granada, tu a Veternigo → noi
  // ==========================================================

  function initFinestre() {
    const F = C.finestre || {};
    if (!F.io || !F.tu) return;
    const sec = $('#finestre');
    sec.hidden = false;
    const io = $('#fwIo'), tu = $('#fwTu'), noi = $('#fwNoi'), cap = $('#fwCap'), row = $('#fwRow');
    $('.fw-media', io).appendChild(mediaEl(F.io, `${C.nome_lui} a Granada`));
    $('.fw-media', tu).appendChild(mediaEl(F.tu, `${C.nome_lei} a Veternigo`));
    if (F.noi) $('.fw-media', noi).appendChild(mediaEl(F.noi, 'Noi due')).style.objectPosition = F.posizione_noi || ''; else noi.remove();
    cap.innerHTML = (F.didascalia || '').replace(/ (\S+)$/, '&nbsp;$1');
    const vids = $$('video', sec);
    new IntersectionObserver(([e]) => vids.forEach((v) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()))).observe(sec);

    if (RM) {
      gsap.set(cap, { autoAlpha: 1 });
      if (F.noi) gsap.set(noi, { autoAlpha: 1 });
      return;
    }

    // all'inizio sono ai due capi dello schermo; scorrendo si avvicinano, si toccano, e diventano una foto sola
    const far = () => row.offsetWidth * 0.62;
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    tl.fromTo(io, { x: () => -far(), rotation: -9 }, { x: -14, rotation: -3, duration: 4, ease: 'power1.out' }, 0)
      .fromTo(tu, { x: () => far(), rotation: 9 }, { x: 14, rotation: 3, duration: 4, ease: 'power1.out' }, 0)
      .to([io, tu], { x: 0, rotation: 0, duration: 1.6, ease: 'power2.in' }, 5)
      .to('.fw-thread', { opacity: 0, duration: 1 }, 5.6);
    const touchAt = 6.6;
    if (F.noi) {
      tl.fromTo(noi, { autoAlpha: 0, clipPath: 'circle(0% at 50% 50%)' }, { autoAlpha: 1, clipPath: 'circle(75% at 50% 50%)', duration: 3, ease: 'power2.inOut' }, 7)
        .to([io, tu], { scale: 0.94, duration: 3 }, 7);
    }
    tl.fromTo(cap, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.6 }, F.noi ? 9.6 : 7)
      .to({}, { duration: 2 });

    let fired = false;
    ScrollTrigger.create({
      trigger: '#fwStage', start: 'top top', end: '+=180%', pin: true, scrub: 0.7, anticipatePin: 1, animation: tl, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = touchAt / tl.duration();
        if (!fired && self.progress > p) {
          fired = true; haptic(12);
          const [x, y] = FX.center(row);
          FX.burst(x, y, { count: 36, kinds: ['heart', 'spark', 'heart', 'petal'], speed: 8, life: 110, size: 11 });
        } else if (fired && self.progress < p - 0.04) fired = false;
      }
    });
  }

  // ==========================================================
  // I NOSTRI MOMENTI: polaroid da sviluppare, poi da lanciare
  // ==========================================================

  function initRullino() {
    const items = (C.rullino || []).filter((x) => x && x.src);
    if (!items.length) return;
    $('#rullino').hidden = false;
    const roll = $('#roll'), hint = $('#rollHint');
    const tilt = () => (Math.random() * 12 - 6);

    // la prima foto va in cima: si costruisce al contrario
    items.slice().reverse().forEach((it) => {
      const fig = document.createElement('figure');
      fig.className = 'polaroid';
      fig.appendChild(mediaEl(it.src, it.didascalia || '')).style.objectPosition = it.posizione || '';
      if (it.didascalia) {
        const cap = document.createElement('figcaption');
        cap.textContent = it.didascalia;
        fig.appendChild(cap);
      }
      if (!RM) addDev(fig);
      roll.appendChild(fig);
      gsap.set(fig, { rotation: tilt() });
    });

    // ogni foto nasce scura, come una polaroid appena uscita: si schiarisce da sola, piano, o subito se lei la strofina
    function addDev(fig) {
      const cv = document.createElement('canvas');
      cv.className = 'dev';
      fig.appendChild(cv);
      fig.classList.add('is-dev');
      let ctx = null, w = 0, h = 0, rubbed = 0, slow = null;
      const paint = () => {
        w = cv.clientWidth; h = cv.clientHeight;
        if (!w) return false;
        const dpr = Math.min(2, devicePixelRatio || 1);
        cv.width = w * dpr; cv.height = h * dpr;
        ctx = cv.getContext('2d');
        ctx.scale(dpr, dpr);
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#3A2A22'); g.addColorStop(0.55, '#5A4334'); g.addColorStop(1, '#2E2420');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < (w * h) / 80; i++) {
          ctx.fillStyle = `rgba(255,236,200,${Math.random() * 0.07})`;
          ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
        }
        return true;
      };
      const finish = () => {
        if (!fig.classList.contains('is-dev')) return;
        fig.classList.remove('is-dev');
        if (slow) slow.kill();
        gsap.to(cv, { opacity: 0, duration: 0.9, ease: 'power1.out', onComplete: () => cv.remove() });
        haptic(10);
        const [x, y] = FX.center(fig);
        FX.burst(x, y, { count: 18, kinds: ['spark', 'heart', 'petal'], speed: 6, life: 90, size: 9 });
        syncHint();
      };
      fig._dev = {
        rub(x, y, dist) {
          if (!ctx && !paint()) return;
          ctx.globalCompositeOperation = 'destination-out';
          const r = Math.max(w, h) * 0.14;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
          rubbed += dist / w;
          if (rubbed > 3.2) finish();
        },
        wake() {
          if (!ctx) paint();
          if (!slow && fig.classList.contains('is-dev')) slow = gsap.to(cv, { opacity: 0.25, duration: 24, ease: 'none', onComplete: finish });
        }
      };
    }

    const top = () => roll.lastElementChild;
    const isDev = (el) => el && el.classList.contains('is-dev');
    const syncHint = () => {
      const t = top();
      roll.classList.toggle('is-rubbing', isDev(t));
      if (t && t._dev && isDev(t)) t._dev.wake();
      hint.textContent = isDev(t) ? 'strofina la foto col dito per svilupparla'
        : roll.children.length > 1 ? 'lanciala via: sotto ce n\'è un\'altra' : '';
    };
    const syncVideos = () => {
      $$('video', roll).forEach((v) => { if (v.parentElement === top()) v.play().catch(() => {}); else v.pause(); });
    };

    gsap.from($$('.polaroid', roll), {
      y: 160, opacity: 0, rotation: () => tilt() * 3, duration: 1.1, stagger: 0.1, ease: 'back.out(1.3)',
      scrollTrigger: { trigger: roll, start: 'top 80%', once: true, onEnter: () => { syncVideos(); syncHint(); } }
    });
    syncHint();

    const throwTop = (dir) => {
      const card = top();
      if (!card || roll.children.length < 2) {
        gsap.fromTo(card, { rotation: -4 }, { rotation: 3, duration: 0.5, ease: 'elastic.out(1,.4)' });
        return;
      }
      haptic(8);
      const [x, y] = FX.center(card);
      FX.burst(x + dir * 80, y, { count: 10, kinds: ['heart', 'spark'], speed: 5, life: 70, size: 9 });
      gsap.to(card, {
        x: dir * innerWidth * 0.9, y: -40, rotation: dir * 28, duration: 0.45, ease: 'power2.in',
        onComplete: () => {
          roll.prepend(card);
          gsap.fromTo(card, { x: dir * 60, y: 0, opacity: 0 }, { x: 0, opacity: 1, rotation: tilt(), duration: 0.6, ease: 'power2.out' });
          syncVideos(); syncHint();
        }
      });
    };

    let sx = 0, sy = 0, dx = 0, lx = 0, ly = 0, mode = '', t0 = 0;
    roll.addEventListener('pointerdown', (e) => {
      const card = top();
      if (e.target.closest('.polaroid') !== card) return;
      sx = lx = e.clientX; sy = ly = e.clientY; dx = 0; t0 = performance.now();
      mode = isDev(card) ? 'rub' : 'drag';
      if (mode === 'rub') roll.setPointerCapture(e.pointerId);
    });
    roll.addEventListener('pointermove', (e) => {
      if (!mode) return;
      const card = top();
      if (mode === 'rub') {
        if (!isDev(card)) { mode = ''; return; }
        const r = $('.dev', card).getBoundingClientRect();
        card._dev.rub(e.clientX - r.left, e.clientY - r.top, Math.hypot(e.clientX - lx, e.clientY - ly));
        lx = e.clientX; ly = e.clientY;
        return;
      }
      dx = e.clientX - sx;
      if (Math.abs(dx) > Math.abs(e.clientY - sy)) gsap.set(card, { x: dx, rotation: dx / 12 });
    });
    const end = () => {
      const was = mode;
      mode = '';
      if (was !== 'drag') return;
      const quickTap = Math.abs(dx) < 8 && performance.now() - t0 < 400;
      if (Math.abs(dx) > 70 || quickTap) throwTop(dx < 0 ? -1 : 1);
      else gsap.to(top(), { x: 0, rotation: tilt(), duration: 0.5, ease: 'back.out(2)' });
    };
    roll.addEventListener('pointerup', end);
    roll.addEventListener('pointercancel', end);
  }

  // ==========================================================
  // 3.5 ANCHE ADESSO: il battito, la luna, la voce
  // ==========================================================

  const BEAT_WORDS = [
    'Lo senti?',
    '<em>È il mio.</em>',
    'Parte da Granada e arriva fino a te, un battito alla volta.',
    'Quando ti sembro lontano, appoggia qui il dito.<br><em>Io ci sono.</em>'
  ];

  function initConte() {
    initBeat();
    initMoon();
    initVoice();
  }

  // battito sintetizzato: "tu-tum", basso e morbido
  function thump(ctx, t, freq, vol) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sine'; o2.type = 'triangle';
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.16);
    o2.frequency.setValueAtTime(freq * 2, t); o2.frequency.exponentialRampToValueAtTime(freq * 1.1, t + 0.12);
    f.type = 'lowpass'; f.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(f); o2.connect(f); f.connect(g).connect(ctx.destination);
    o.start(t); o2.start(t); o.stop(t + 0.25); o2.stop(t + 0.25);
  }

  function initBeat() {
    const btn = $('#beatHeart'), heart = $('svg', btn), ring = $('.beat-ring', btn);
    const hint = $('#beatHint'), words = $('#beatWords'), after = $('#beatAfter');
    const lines = (Array.isArray(C.battito) && C.battito.length ? C.battito : BEAT_WORDS);
    const path = $('#threadPath'), glow = $('#threadGlow');
    const len = path.getTotalLength();
    const mid = len / 2;
    const dot = svgEl('circle', { r: 5, class: 'thread-end', opacity: 0 }, $('.beat-thread'));
    gsap.set(glow, { strokeDasharray: `0 ${len}` });

    // tutte le frasi sono già lì, una sopra l'altra nella stessa cella:
    // l'altezza resta quella della più lunga e niente si accavalla
    const els = lines.map((html) => {
      const p = document.createElement('p');
      p.innerHTML = html;
      words.appendChild(p);
      return p;
    });
    gsap.set(els, { autoAlpha: 0, y: 12 });
    gsap.set(after, { autoAlpha: 0 });

    const idle = RM ? null : gsap.to(btn, { scale: 1.05, duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.from(['.beat-city', '.thread-end'], { opacity: 0, duration: 1.2, stagger: 0.2, scrollTrigger: { trigger: '#beat', start: 'top 75%', once: true } });

    let holding = false, beatCall = null, current = -1, done = false;
    const FILL = lines.length * 1.9; // secondi di dito sul cuore per arrivare fino a lei
    const state = { p: 0 };

    const showLine = (i) => {
      if (i === current) return;
      if (current >= 0) gsap.to(els[current], { autoAlpha: 0, y: -12, duration: 0.6, ease: 'power2.in', overwrite: true });
      current = i;
      gsap.fromTo(els[i], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.9, delay: current > 0 ? 0.45 : 0, ease: 'power2.out', overwrite: true });
    };

    const finish = () => {
      done = true;
      btn.classList.add('is-done');
      gsap.to(hint, { autoAlpha: 0, duration: 0.6 });
      // il filo si accende tutto, fino a lei
      gsap.to(glow, { strokeDasharray: `${len} ${len}`, duration: 1.8, ease: 'power2.inOut' });
      gsap.to('.beat-to', { scale: 1.08, color: '#F6B71E', duration: 0.8, delay: 1.4, transformOrigin: '100% 50%' });
      const [x, y] = FX.center(btn);
      FX.burst(x, y, { count: 46, kinds: ['heart', 'heart', 'spark'], speed: 10, life: 140, size: 13 });
      setTimeout(() => FX.float(innerWidth * 0.8, innerHeight * 0.75, { count: 5, width: 40 }), 1600);
      haptic([30, 120, 30, 120, 60]);
      gsap.to(after, { autoAlpha: 1, duration: 1.4, delay: 1.6 });
      stop();
    };

    // il riempimento è continuo mentre lei tiene il dito, e si ferma quando lo toglie
    const fill = gsap.to(state, {
      p: 1, duration: FILL, ease: 'none', paused: true,
      onUpdate: () => {
        glow.style.strokeDasharray = `${(mid * state.p).toFixed(1)} ${len}`;
        const i = Math.min(lines.length - 1, Math.floor(state.p * lines.length + 0.12));
        if (state.p > 0.04) showLine(i);
      },
      onComplete: () => setTimeout(finish, 700)
    });

    const beat = () => {
      const ctx = ensureAudioCtx();
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime + 0.02;
        thump(ctx, t, 78, 0.9);
        thump(ctx, t + 0.27, 64, 0.55);
      }
      haptic([35, 200, 25]);
      gsap.timeline()
        .to(heart, { scale: 1.16, duration: 0.1, ease: 'power2.out', transformOrigin: '50% 50%' })
        .to(heart, { scale: 1, duration: 0.17, ease: 'power2.inOut' })
        .to(heart, { scale: 1.08, duration: 0.09, ease: 'power2.out' })
        .to(heart, { scale: 1, duration: 0.35, ease: 'power2.inOut' });
      gsap.fromTo(ring, { scale: 0.85, opacity: 0.8 }, { scale: 2.3, opacity: 0, duration: 1.3, ease: 'power2.out' });
      // il battito viaggia lungo il filo, da Granada al cuore
      if (!done) {
        const o = { l: 0 };
        gsap.to(o, {
          l: mid, duration: 0.8, ease: 'sine.in',
          onStart: () => dot.setAttribute('opacity', 1),
          onUpdate: () => { const pt = path.getPointAtLength(o.l); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); },
          onComplete: () => dot.setAttribute('opacity', 0)
        });
      }
    };

    const loop = () => { if (!holding) return; beat(); beatCall = gsap.delayedCall(0.86, loop); };

    const setHint = (t) => {
      if (done || hint.textContent === t) return;
      gsap.to(hint, { autoAlpha: 0, duration: 0.25, onComplete: () => { hint.textContent = t; gsap.to(hint, { autoAlpha: 1, duration: 0.4 }); } });
    };

    function start(e) {
      if (e && e.cancelable) e.preventDefault();
      if (e && e.pointerId !== undefined && btn.setPointerCapture) { try { btn.setPointerCapture(e.pointerId); } catch (err) { /* niente */ } }
      if (holding) return;
      holding = true;
      if (idle) idle.pause();
      gsap.to(btn, { scale: 0.95, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
      if (musicOn) gsap.to(audio, { volume: 0.12, duration: 0.6 });
      if (!done) { setHint(state.p > 0 ? 'Così… resta ancora un po’' : 'Resta così…'); fill.play(); }
      loop();
    }
    function stop() {
      if (!holding) return;
      holding = false;
      if (beatCall) beatCall.kill();
      fill.pause();
      gsap.to(btn, { scale: 1, duration: 0.5, ease: 'back.out(2)', overwrite: 'auto', onComplete: () => idle && idle.restart() });
      if (!done) setHint(state.p > 0 ? 'Non lasciarlo… tienilo ancora' : 'Tieni il dito sul cuore');
      if (musicOn) gsap.to(audio, { volume: 0.55, duration: 1.4 });
    }
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('lostpointercapture', stop);
    // niente lente d'ingrandimento o menu di iOS durante la pressione lunga
    btn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
    btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
  }

  // età della luna in giorni (0 = luna nuova), dal novilunio medio del 6 gen 2000
  const SYNODIC = 29.530588853;
  function moonAge(d) {
    const days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5;
    return ((days % SYNODIC) + SYNODIC) % SYNODIC;
  }

  function initMoon() {
    const now = new Date();
    const age = moonAge(now), ageStart = moonAge(MOMENT());
    const nearNew = (a) => a < 2 || a > SYNODIC - 2;
    const illum = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;

    const svg = $('#moon');
    const defs = svgEl('defs', {}, svg);
    const rg = svgEl('radialGradient', { id: 'moonGlow' }, defs);
    svgEl('stop', { offset: 0.55, 'stop-color': 'rgba(255,233,168,.28)' }, rg);
    svgEl('stop', { offset: 1, 'stop-color': 'rgba(255,233,168,0)' }, rg);
    const lg = svgEl('radialGradient', { id: 'moonLit', cx: '40%', cy: '35%' }, defs);
    svgEl('stop', { offset: 0, 'stop-color': '#FFF8E7' }, lg);
    svgEl('stop', { offset: 1, 'stop-color': '#E9DCB8' }, lg);
    const halo = svgEl('circle', { r: 60, fill: 'url(#moonGlow)', opacity: 0.4 + illum * 0.6 }, svg);
    svgEl('circle', { r: 40, fill: '#1E2A4A', stroke: 'rgba(243,233,210,.32)', 'stroke-width': 1 }, svg);
    if (illum > 0.012) {
      const R = 40, k = Math.cos((2 * Math.PI * age) / SYNODIC);
      const right = age < SYNODIC / 2; // crescente: illuminata a destra (da qui, emisfero nord)
      const outer = right ? 1 : 0;
      const term = right ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
      svgEl('path', { fill: 'url(#moonLit)', d: `M0 ${-R} A${R} ${R} 0 0 ${outer} 0 ${R} A${(Math.abs(k) * R).toFixed(2)} ${R} 0 0 ${term} 0 ${-R} Z` }, svg);
    }
    if (!RM) gsap.to(halo, { scale: 1.12, transformOrigin: '50% 50%', duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    const phase = age < 1.5 || age > 28 ? 'nuova' : age < 6.9 ? 'una falce crescente' : age < 8.4 ? 'al primo quarto'
      : age < 13.8 ? 'quasi piena' : age < 15.8 ? 'piena' : age < 21.4 ? 'calante' : age < 22.9 ? 'all’ultimo quarto' : 'una falce calante';

    let kicker = 'stasera', text;
    if (nearNew(age) && nearNew(ageStart)) {
      kicker = 'un mese, un giro di luna';
      text = 'Il giorno in cui è cominciato tutto c’era la luna nuova. Stasera è di nuovo nuova: nel nostro primo mese ufficiale ha fatto un giro intero intorno a noi. Da domani ricomincia a crescere, ogni sera un po’ di più. Come noi.';
    } else if (phase === 'nuova') {
      text = 'Stasera la luna è nuova e non si vede. Ma c’è, esattamente come me: anche quando non mi vedi, sono lì.';
    } else {
      text = `Stasera la luna è ${phase}, illuminata al ${Math.round(illum * 100)}%. Quando la guardi, sappi che da Granada la sto guardando anch’io. È la stessa luna per tutti e due: lì ci diamo appuntamento.`;
    }
    $('#moonKicker').textContent = kicker;
    $('#moonText').textContent = text;

    gsap.from(svg, { opacity: 0, scale: 0.6, rotation: -30, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: '.moon-block', start: 'top 82%', once: true } });
    gsap.from(['#moonKicker', '#moonText'], { opacity: 0, y: 18, duration: 1.3, stagger: 0.25, delay: 0.5, ease: 'power2.out', scrollTrigger: { trigger: '.moon-block', start: 'top 82%', once: true } });
  }

  // un messaggio vocale: assets/voce.mp3 (facoltativo)
  async function initVoice() {
    const v = $('#voiceAudio');
    if (PRE['assets/voce.mp3']) v.src = PRE['assets/voce.mp3'];
    else {
      try {
        const r = await fetch('assets/voce.mp3', { method: 'HEAD' });
        if (!r.ok || /html/.test(r.headers.get('content-type') || '')) return;
      } catch (e) { return; }
    }
    const box = $('#voice'), btn = $('#voiceBtn'), bars = $('.voice-bars', btn);
    box.hidden = false;
    for (let i = 0; i < 5; i++) bars.appendChild(document.createElement('i'));
    gsap.from(box, { opacity: 0, y: 24, duration: 1.2, scrollTrigger: { trigger: box, start: 'top 88%', once: true } });
    let wave = null;
    const setPlaying = (on) => {
      box.classList.toggle('is-playing', on);
      if (wave) { wave.kill(); wave = null; }
      if (on) {
        wave = gsap.to($$('i', bars), { scaleY: () => 0.25 + Math.random() * 0.75, duration: 0.18, repeat: -1, repeatRefresh: true, yoyo: true, stagger: 0.05 });
        if (musicOn) gsap.to(audio, { volume: 0.06, duration: 0.8 });
      } else if (musicOn) gsap.to(audio, { volume: 0.55, duration: 1.6 });
    };
    btn.addEventListener('click', () => {
      haptic(10);
      if (v.paused) v.play().catch(() => {});
      else v.pause();
    });
    v.addEventListener('play', () => setPlaying(true));
    v.addEventListener('pause', () => setPlaying(false));
    v.addEventListener('ended', () => {
      const [x, y] = FX.center(btn);
      FX.burst(x, y, { count: 30, kinds: ['heart', 'spark'], speed: 8, life: 120 });
    });
  }

  // ==========================================================
  // 3.6 FINALE
  // ==========================================================

  function initFinale() {
    $('#finaleMsg').textContent = C.messaggio_chiusura;
    $('.finale-title').innerHTML = 'Un pensiero per il nostro<br><em>primo mese ufficiale!</em>';
    $('#finaleLead').textContent = C.messaggio_festa || '';
    $('.signature').textContent = C.nome_lui;

    // piccolo campo di girasoli sullo sfondo
    const field = svgEl('svg', { class: 'finale-field', viewBox: '0 0 400 220', preserveAspectRatio: 'xMidYMax slice', 'aria-hidden': 'true' });
    $('#finale').prepend(field);
    const fieldParts = [];
    [[22, 110, 0.7], [70, 70, 0.85], [118, 125, 0.6], [282, 120, 0.6], [330, 75, 0.85], [378, 112, 0.7]].forEach(([x, h, sc], n) => {
      const g = svgEl('g', {}, field);
      const st2 = svgEl('path', { class: 'ff-stem', d: `M${x} 222 C${x - 6} ${222 - h * 0.5} ${x + 6} ${222 - h * 0.8} ${x} ${222 - h}` }, g);
      const hd = svgEl('g', { transform: `translate(${x} ${222 - h}) scale(${sc})` }, g);
      const inner = svgEl('g', {}, hd);
      for (let q = 0; q < 14; q++) svgEl('ellipse', { class: 'ff-petal', cx: 0, cy: -17, rx: 5, ry: 11, transform: `rotate(${q * (360 / 14)})` }, inner);
      svgEl('circle', { class: 'ff-disk', r: 10 }, inner);
      const l = st2.getTotalLength();
      gsap.set(st2, { strokeDasharray: l, strokeDashoffset: l });
      gsap.set(inner, { scale: 0, rotation: -90, transformOrigin: '50% 50%' });
      fieldParts.push([st2, inner, n]);
    });

    const svg = $('#finaleFlower');
    const stem = svgEl('path', { class: 'stem', d: 'M150 520 C138 440 166 360 150 270 C146 245 150 225 150 205' }, svg);
    const leafL = svgEl('path', { class: 'leaf', d: 'M147 420 C120 418 96 398 88 372 C118 372 140 392 147 420 Z' }, svg);
    const leafR = svgEl('path', { class: 'leaf', d: 'M155 350 C182 346 204 326 210 300 C180 302 160 322 155 350 Z' }, svg);
    const head = svgEl('g', { transform: 'translate(150 175)' }, svg);
    const fpetals = [];
    for (let i = 0; i < 24; i++) {
      const g = svgEl('g', { transform: `rotate(${i * 15 + (i % 2 ? 7 : 0)})` }, head);
      fpetals.push(svgEl('path', { class: 'fpetal', d: i % 2 ? 'M0 -30 C10 -44 12 -70 0 -86 C-12 -70 -10 -44 0 -30 Z' : 'M0 -30 C11 -46 13 -78 0 -96 C-13 -78 -11 -46 0 -30 Z' }, g));
    }
    const disc = svgEl('circle', { class: 'fhead', r: 36 }, head);
    const fseeds = svgEl('g', {}, head);
    for (let i = 1; i <= 90; i++) {
      const r = 32 * Math.sqrt(i / 90), a = i * 2.39996;
      svgEl('circle', { cx: (r * Math.cos(a)).toFixed(1), cy: (r * Math.sin(a)).toFixed(1), r: 1.2, fill: i % 2 ? '#7A5434' : '#2E1B0E' }, fseeds);
    }

    const len = stem.getTotalLength();
    gsap.set(stem, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(leafL, { scale: 0, transformOrigin: '100% 100%' });
    gsap.set(leafR, { scale: 0, transformOrigin: '0% 100%' });
    gsap.set(fpetals, { scale: 0, transformOrigin: '50% 100%' });
    gsap.set([disc, fseeds], { scale: 0, transformOrigin: '50% 50%' });
    gsap.set('.finale-text > *', { opacity: 0, y: 16 });

    const tl = gsap.timeline({ paused: true });
    tl.to(stem, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' })
      .to(leafL, { scale: 1, duration: 0.9, ease: 'back.out(1.8)' }, '-=1.2')
      .to(leafR, { scale: 1, duration: 0.9, ease: 'back.out(1.8)' }, '-=.7')
      .to([disc, fseeds], { scale: 1, duration: 0.7, ease: 'back.out(2)' }, '-=.4')
      .to(fpetals, { scale: 1, duration: 1, ease: 'elastic.out(1,.5)', stagger: { each: 0.035, from: 'random' } }, '-=.3')
      .to('.finale-text > *', { opacity: 1, y: 0, duration: 1, stagger: 0.35, ease: 'power2.out' }, '-=.6');
    if (!RM) tl.to(head, { rotation: 4, transformOrigin: '50% 100%', duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    fieldParts.forEach(([st2, inner, n]) => {
      tl.to(st2, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out' }, 0.2 + n * 0.18)
        .to(inner, { scale: 1, rotation: 0, duration: 1.1, ease: 'back.out(2)' }, 1.1 + n * 0.18);
    });
    tl.add(() => {
      const [x, y] = FX.center(head);
      FX.burst(x, y, { count: 60, speed: 11, life: 150, size: 13 });
      haptic([15, 50, 15]);
    }, 3.2);

    // cuori che salgono piano, come lanterne, finché il finale è sullo schermo
    let lanterns = null;
    const startLanterns = () => {
      if (lanterns || RM) return;
      lanterns = setInterval(() => FX.float(Math.random() * innerWidth, innerHeight + 20, { count: 1, size: 14, sizeMin: 7 }), 650);
    };
    new IntersectionObserver((e) => {
      if (e[0].isIntersecting && tl.progress() > 0) startLanterns();
      else if (!e[0].isIntersecting && lanterns) { clearInterval(lanterns); lanterns = null; }
    }).observe($('#finale'));

    ScrollTrigger.create({ trigger: '#finale', start: 'top 55%', once: true, onEnter: () => { tl.play(); setTimeout(startLanterns, 2500); } });

    $('#restart').addEventListener('click', () => {
      haptic(8);
      gsap.to('#app', {
        opacity: 0, duration: 0.8, onComplete: () => {
          window.scrollTo(0, 0);
          location.reload();
        }
      });
    });
  }

  // ==========================================================
  // VI · solo te: una frase alla volta, e i miliardi che diventano un cuore
  // ==========================================================

  function initSoloTe() {
    const sec = $('#solote'), stage = $('#stStage'), box = $('#stLines'), pips = $('#stPips');
    const frasi = C.solo_te || [];
    if (!frasi.length) { sec.hidden = true; return; }
    const lines = frasi.map((html, i) => {
      const p = document.createElement('p');
      p.className = 'st-line' + (i === frasi.length - 1 ? ' is-big' : '');
      p.innerHTML = html;
      box.appendChild(p);
      pips.appendChild(document.createElement('i'));
      return p;
    });
    const pipEls = $$('i', pips);
    if (RM) { sec.classList.add('st-static'); return; }
    const words = lines.map((l) => {
      splitChars(l);
      // niente parola orfana a fine riga: l'ultima resta attaccata alla penultima
      $$('.w', l).forEach((w) => {
        const nx = w.nextSibling, pv = w.previousSibling;
        const last = !nx || (nx.nodeType === 1 && nx.tagName === 'BR');
        if (!last || !pv || pv.nodeType !== 3 || !pv.previousSibling || !pv.previousSibling.classList?.contains('w')) return;
        const pair = document.createElement('span');
        pair.className = 'w-pair';
        w.before(pair);
        pair.append(pv.previousSibling, pv, w);
      });
      return $$('.w', l);
    });

    // la folla: puntini sparsi; la frase dei "miliardi" ne accende uno solo, poi tutti diventano un cuore
    const cv = $('#stDots'), ctx = cv.getContext('2d');
    const COLS = ['#D9574E', '#E5736A', '#E08E0B', '#C46A55', '#F6B71E', '#B83A44'];
    const N = innerWidth < 600 ? 460 : 680;
    const dots = [];
    for (let i = 0; i < N; i++) {
      let hx, hy;
      if (i % 2) { // metà sul bordo del cuore…
        const t = Math.random() * Math.PI * 2, k = 0.94 + Math.random() * 0.06;
        hx = 16 * Math.pow(Math.sin(t), 3) * k;
        hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k - 2.5;
      } else { // …metà sparsi dentro, in modo uniforme
        let X, Y;
        do { X = Math.random() * 2.4 - 1.2; Y = Math.random() * 2.4 - 1.1; } while (Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y > 0);
        hx = X * 13.2; hy = -Y * 12.2 + 1.2;
      }
      dots.push({
        u: Math.random(), v: Math.random(), hx, hy,
        r: 0.9 + Math.random() * 1.5, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.8,
        c: COLS[i % COLS.length], d: Math.random() * 0.35
      });
    }
    const gold = dots[0];
    gold.u = 0.78; gold.v = 0.62; gold.hx = 0; gold.hy = 0;
    let W = 0, H = 0;
    const size = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = stage.clientWidth; H = stage.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

    const S = 10;
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    tl.to('#stHint', { autoAlpha: 0, duration: 1 }, 0.6);
    lines.forEach((l, i) => {
      const t = i * S;
      tl.set(l, { autoAlpha: 1 }, t);
      tl.fromTo(words[i], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.4, stagger: { amount: Math.min(4.6, words[i].length * 0.22) }, ease: 'power2.out' }, t);
      if (i < lines.length - 1) tl.to(l, { autoAlpha: 0, y: -26, duration: 1.4, ease: 'power1.in' }, t + 8.4);
    });
    tl.to($('.chapter-head', stage), { autoAlpha: 0, y: -24, duration: 2 }, 3 * S - 1.6);
    tl.to({}, { duration: 4 });

    let burst = false, pip = -1;
    const draw = () => {
      const pos = tl.time() / S;
      const now = performance.now() / 1000;
      const f = Math.sin(Math.PI * clamp01((pos - 2) / 0.95));  // solo i tuoi occhi: la folla si spegne
      const g = smooth((pos - 2) / 0.6);                          // l'unico puntino d'oro va al centro
      const c = smooth((pos - 3) / 2.2);                          // e tutti diventano un cuore
      const beat = c > 0.98 ? 1 + 0.045 * Math.pow(Math.max(0, Math.sin(now * 3.4)), 6) : 1;
      const cx = W / 2, cy = H * 0.25, sc = Math.min(W * 0.4, H * 0.22) / 16 * beat;
      ctx.clearRect(0, 0, W, H);
      for (let i = 1; i < N; i++) {
        const p = dots[i];
        const drift = 1 - c;
        const sx = p.u * W + Math.sin(now * p.sp + p.ph) * 7 * drift;
        const sy = p.v * H + Math.cos(now * p.sp * 0.8 + p.ph) * 6 * drift;
        const cc = smooth((c - p.d) / (1 - p.d));
        const x = sx + (cx + p.hx * sc - sx) * cc;
        const y = sy + (cy + p.hy * sc - sy) * cc;
        ctx.globalAlpha = (0.32 + 0.4 * cc) * (1 - 0.8 * f);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(x, y, p.r * (1 + 0.3 * cc), 0, 6.283); ctx.fill();
      }
      const gx = gold.u * W + (cx - gold.u * W) * g, gy = gold.v * H + (cy - gold.v * H) * g;
      const gr = 2 + 5 * f + 3 * c;
      ctx.globalAlpha = 0.25 + 0.75 * Math.max(f, g);
      const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr * 4);
      halo.addColorStop(0, 'rgba(246,183,30,.55)'); halo.addColorStop(1, 'rgba(246,183,30,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(gx, gy, gr * 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#F6B71E'; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;

      const idx = Math.min(lines.length - 1, Math.floor(pos + 0.02));
      if (idx !== pip) { pip = idx; pipEls.forEach((el, j) => el.classList.toggle('is-on', j === idx)); }
      if (!burst && c > 0.99 && pos > lines.length - 0.6) {
        burst = true;
        const r = stage.getBoundingClientRect();
        FX.burst(r.left + cx, r.top + cy, { count: 40, kinds: ['heart', 'spark', 'heart'], speed: 8, life: 120, size: 11 });
      }
    };

    ScrollTrigger.create({
      trigger: stage, start: 'top top', end: () => '+=' + Math.round(innerHeight * lines.length * 1.1),
      pin: true, scrub: 0.6, anticipatePin: 1, animation: tl, onRefresh: size
    });
    // si muove solo quando è sullo schermo
    new IntersectionObserver(([e]) => { if (e.isIntersecting) gsap.ticker.add(draw); else gsap.ticker.remove(draw); }).observe(sec);
    draw();
  }

  // ==========================================================
  // dettagli: petali in volo, rivelazioni
  // ==========================================================

  function initDrift() {
    if (RM) return;
    $$('.petal-drift').forEach((zone, z) => {
      for (let i = 0; i < 3; i++) {
        const s = svgEl('svg', { viewBox: '0 0 22 44' }, zone);
        svgEl('path', { d: 'M11 0 C20 10 22 30 11 44 C0 30 2 10 11 0 Z' }, s);
        const left = 8 + ((i * 37 + z * 23) % 84);
        s.style.left = `${left}%`;
        s.style.top = '-60px';
        const sc = 0.6 + ((i + z) % 3) * 0.25;
        gsap.fromTo(s, { y: -120, x: 0, rotation: -40 + i * 30, scale: sc, opacity: 0 }, {
          y: 220, x: (i % 2 ? 1 : -1) * 50, rotation: 160 + i * 40, opacity: 0.9, ease: 'none',
          scrollTrigger: { trigger: zone, start: 'top 95%', end: 'top 5%', scrub: 1 }
        });
      }
    });
  }

  function initReveals() {
    $$('.reveal').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    $$('.chapter-head').forEach((el) => {
      const rest = Array.from(el.children).filter((c) => !c.classList.contains('title'));
      gsap.from(rest, { opacity: 0, y: 20, duration: 1, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      const title = $('.title', el);
      if (title) revealChars(splitChars(title), { delay: 0.25, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
  }

  // ---------- tasti ----------

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSheet(); closeLetter(); }
  });
  initSheetGestures();

  boot();
})();

/* NOCTE · onepage: header met ankernavigatie
   - menu openen/sluiten op gsm
   - actieve sectie onderlijnen in het menu
   - het uur in de header loopt mee met de nacht (klokicoon in de inleiding → 22:00 → 00:00 → 05:00)
   - dunne voortgangslijn onder de header */

const header = document.getElementById('header');
const burger = document.getElementById('burger');
const clock = document.getElementById('clock');
const progress = document.getElementById('progress');

// gsm-menu
function closeMenu() {
  header.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Menu openen');
}
burger.addEventListener('click', () => {
  const open = header.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
});
document.querySelectorAll('.menu a').forEach((link) => link.addEventListener('click', closeMenu));

// klokicoon voor de header (zelfde icoon als in index.html)
const KLOK_ICOON = '<svg class="klok-icoon" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path fill="currentColor" d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm68-84a12,12,0,0,1-12,12H128a12,12,0,0,1-12-12V72a12,12,0,0,1,24,0v44h44A12,12,0,0,1,196,128Z"/></svg>';
if (clock) clock.dataset.toont = 'klok';

// actieve sectie + uur in de header
const navLinks = document.querySelectorAll('[data-nav]');
const sections = document.querySelectorAll('main section[data-hour]');

// Eén vaste meetlijn op 40 % van het scherm: de sectie waar die lijn in valt, bepaalt het uur.
// Zo wisselt klokje/uur altijd op hetzelfde moment, ook bij snel scrollen (geen door elkaar lopen).
let huidige = null;
function toonSectie(section) {
  if (section === huidige) return;
  huidige = section;
  const uur = section.dataset.hour;
  if (clock.dataset.toont !== uur) {
    clock.dataset.toont = uur;
    // inleiding en alles na de parfums (slider, sample): klokicoon; bij de parfums: hun uur
    if (uur === 'klok') { clock.innerHTML = KLOK_ICOON; clock.classList.add('is-icoon'); }
    else { clock.textContent = uur; clock.classList.remove('is-icoon'); }
    clock.classList.remove('tick');
    void clock.offsetWidth; // animatie opnieuw starten
    clock.classList.add('tick');
  }
  // de drie aktes horen bij "Onze parfums"
  const id = section.id.startsWith('acte') ? 'parfums' : section.id;
  navLinks.forEach((link) => {
    link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
  });
}
let meetGepland = false;
function meet() {
  meetGepland = false;
  const lijn = window.innerHeight * 0.4;
  let gekozen = sections[0];
  sections.forEach((section) => { if (section.getBoundingClientRect().top <= lijn) gekozen = section; });
  toonSectie(gekozen);
}
const plan = () => { if (!meetGepland) { meetGepland = true; requestAnimationFrame(meet); } };
window.addEventListener('scroll', plan, { passive: true });
window.addEventListener('resize', plan);
meet();

// voortgangslijn en donkerder header na het scrollen
function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  header.classList.toggle('is-scrolled', window.scrollY > 20);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Scrollanimaties ----------
   - de hero schuift weg terwijl je naar beneden scrolt (tekst sneller dan het beeld)
   - de blokken eronder schuiven in beeld: beeld en tekst vanuit tegengestelde kanten
   Alles blijft zichtbaar zonder JavaScript of bij "beweging beperken". */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduceMotion && 'IntersectionObserver' in window) {
  // [selector, richting, vertraging per volgend element in ms]
  const reveals = [
    ['.hours-strip', 'up', 0],
    ['.story .visual', 'left', 0],
    ['.story-text', 'right', 0],
    ['.quote-l1', 'left', 0],
    ['.quote-l2', 'right', 0],
    ['.parfums .section-head', 'up', 0],
    ['.acte--1 .visual', 'left', 0],
    ['.acte--1 .menu-card', 'right', 0],
    ['.acte--2 .visual', 'left', 0],
    ['.acte--2 .menu-card', 'right', 0],
    ['.acte--3 .menu-card', 'left', 0],
    ['.acte--3 .visual', 'right', 0],
    ['.mc-notes li', 'up', 90],
    ['.slider-track li', 'up', 80],
    ['.floor-intro', 'left', 0],
    ['.proofs li', 'right', 120],
    ['.sample .visual', 'right', 0],
    ['.sample-text', 'left', 0],
    ['.footer .wrap', 'up', 0],
  ];

  // telkens opnieuw: in beeld = tonen, uit beeld = terug klaarzetten, zodat de animatie
  // speelt bij elke keer heen en weer scrollen
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-revealed', entry.isIntersecting);
    });
  }, { rootMargin: '0px 0px -10% 0px' });

  reveals.forEach(([selector, direction, stagger]) => {
    document.querySelectorAll(selector).forEach((el, i) => {
      // wat bij het laden al in beeld staat, staat meteen klaar (geen flits)
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-revealed');
      el.dataset.reveal = direction;
      if (stagger) el.style.setProperty('--reveal-delay', `${(i % 6) * stagger}ms`);
      revealObserver.observe(el);
    });
  });

  // hero schuift weg: tekst omhoog en vervagend, beeld trager (parallax)
  const heroText = document.querySelector('.hero-text');
  const heroVisual = document.querySelector('.visual--hero');
  let ticking = false;
  function moveHero() {
    const y = Math.min(window.scrollY, window.innerHeight);
    const p = y / window.innerHeight;
    if (heroText) {
      heroText.style.transform = `translateY(${y * -0.35}px)`;
      heroText.style.opacity = String(Math.max(0, 1 - p * 1.4));
    }
    if (heroVisual) heroVisual.style.transform = `translateY(${y * 0.12}px) scale(${1 - p * 0.06})`;
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(moveHero); }
  }, { passive: true });
  moveHero();
}

/* ---------- Instagram-slider + lightbox ----------
   - pijltjes schuiven de rij telkens één post opzij, eindeloos in een lus (op gsm swipe je)
   - klik op een foto: grote weergave, met vorige/volgende, Esc of klik ernaast om te sluiten */

const track = document.querySelector('.slider-track');
if (track) {
  // eindeloze lus: de posts staan er drie keer (kopie · origineel · kopie).
  // Kom je in een kopie terecht, dan springt de rij ongemerkt terug naar dezelfde post in het origineel.
  const originals = [...track.children];
  originals.forEach((li, i) => li.querySelector('.slide').dataset.index = i);
  const makeClone = (li) => {
    const c = li.cloneNode(true);
    c.classList.add('is-clone');
    c.setAttribute('aria-hidden', 'true');
    c.removeAttribute('data-reveal');
    c.classList.remove('is-revealed');
    c.style.removeProperty('--reveal-delay');
    c.querySelector('.slide').tabIndex = -1;
    return c;
  };
  originals.forEach((li) => track.append(makeClone(li)));
  [...originals].reverse().forEach((li) => track.prepend(makeClone(li)));

  let setWidth = 0;
  const jumpTo = (left) => {
    track.style.scrollBehavior = 'auto';
    track.scrollLeft = left;
    track.style.scrollBehavior = '';
  };
  const measure = () => {
    const firstClone = track.children[originals.length * 2];
    setWidth = firstClone.offsetLeft - originals[0].offsetLeft;
  };
  const normalize = () => {
    if (track.scrollLeft < setWidth * 0.5) jumpTo(track.scrollLeft + setWidth);
    else if (track.scrollLeft > setWidth * 1.5) jumpTo(track.scrollLeft - setWidth);
  };
  measure();
  jumpTo(track.scrollLeft + setWidth);

  // na het scrollen (pijl, swipe of trackpad) de positie terugzetten in het midden
  let target = null; // waar de pijltjes naartoe schuiven, zodat snel na elkaar klikken geen stap overslaat
  const settled = () => { if (window.__ledDragging && window.__ledDragging()) return; target = null; normalize(); };
  let settle;
  track.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(settled, 140);
  }, { passive: true });
  if ('onscrollend' in track) track.addEventListener('scrollend', settled);
  window.addEventListener('resize', () => {
    const offset = track.scrollLeft - setWidth;
    measure();
    jumpTo(setWidth + offset);
  });

  // pijltjes: telkens precies één post verder, in beide richtingen eindeloos
  document.querySelectorAll('.slider-btn').forEach((btn) => btn.addEventListener('click', () => {
    const step = originals[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
    if (target === null) { normalize(); target = Math.round(track.scrollLeft / step) * step; }
    target += Number(btn.dataset.dir) * step;
    track.scrollTo({ left: target });
  }));

  // ledbalk onder de slider: toont waar je bent in de 16 posts, en je kunt hem vastnemen en slepen.
  // - het ledje blijft onder je muis of vinger zolang je het vasthoudt
  // - het slepen werkt relatief: links/rechts bewegen = terug/verder in de rij
  // - aan het einde van de balk (of erachter) blijft de rij eindeloos doorschuiven, rustig genoeg om elke post te bekijken
  const led = document.querySelector('.slider-led');
  const thumb = led && led.querySelector('.led-thumb');
  if (led && thumb) {
    let w = 0.2;          // breedte van het ledje als deel van de balk
    let dragging = false;
    const stap = () => originals[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
    const bereik = () => Math.max(1, setWidth - stap()); // een hele balk slepen = van post 1 tot post 16
    const fractie = () => {
      const binnen = ((track.scrollLeft - setWidth) % setWidth + setWidth) % setWidth; // positie in de originele reeks
      return Math.min(1, binnen / bereik());
    };
    const zet = (f) => { thumb.style.left = (f * (1 - w) * 100) + '%'; };
    const paint = () => {
      w = Math.min(0.5, Math.max(0.08, track.clientWidth / setWidth));
      thumb.style.width = (w * 100) + '%';
      if (!dragging) zet(fractie());
    };
    track.addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true });
    window.addEventListener('resize', paint);
    paint();

    let grab = 0;      // waar je het ledje vastnam (afstand vanaf de linkerkant van het ledje)
    let basis = 0;     // scrollpositie die hoort bij het ledje helemaal links
    let f = 0;         // waar het ledje nu staat (0 = links, 1 = rechts)
    let voorbij = 0;   // hoeveel pixels je voorbij het begin (-) of einde (+) van de balk trekt
    let laatste = 0, raf = 0;
    const lees = (clientX) => {
      const r = led.getBoundingClientRect();
      const vrij = r.width * (1 - w);
      const ruw = clientX - r.left - grab;
      f = Math.min(1, Math.max(0, ruw / vrij));
      // ook net tegen de rand (laatste 4 px) telt als "doorschuiven"
      voorbij = ruw > vrij - 4 ? ruw - (vrij - 4) : ruw < 4 ? ruw - 4 : 0;
    };
    const toepassen = () => {
      // de lus: hou de basis in het midden van de drie reeksen, zodat de rij nooit op is
      if (basis > setWidth * 1.25) basis -= setWidth;
      else if (basis < setWidth * 0.25) basis += setWidth;
      zet(f);
      track.scrollLeft = basis + f * bereik();
    };
    const lus = (nu) => {
      if (!dragging) return;
      const dt = laatste ? Math.min(nu - laatste, 50) / 1000 : 0;
      laatste = nu;
      if (voorbij !== 0) {
        // doorschuiven aan de rand, gemeten in posts per seconde zodat je elke post kunt bekijken:
        // tegen de rand 1 post per 2,5 seconden, verder trekken gaat iets sneller, tot hoogstens 1 post per 1,25 seconden
        const postsPerSec = Math.min(0.8, 0.4 + Math.abs(voorbij) / 300);
        const snelheid = postsPerSec * stap();
        basis += Math.sign(voorbij) * snelheid * dt;
        toepassen();
      }
      raf = requestAnimationFrame(lus);
    };
    led.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      led.setPointerCapture(e.pointerId);
      dragging = true;
      led.classList.add('is-grabbed');
      thumb.classList.remove('is-landing');
      track.style.scrollSnapType = 'none';
      track.style.scrollBehavior = 'auto';
      target = null;
      clearTimeout(settle);
      normalize();
      const t = thumb.getBoundingClientRect();
      // op het ledje: hou het vast waar je het pakte; ernaast: het midden van het ledje springt naar je muis
      grab = (e.clientX >= t.left && e.clientX <= t.right) ? e.clientX - t.left : t.width / 2;
      basis = track.scrollLeft - fractie() * bereik();
      lees(e.clientX);
      toepassen();
      laatste = 0;
      raf = requestAnimationFrame(lus);
    });
    led.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      lees(e.clientX);
      toepassen();
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      cancelAnimationFrame(raf);
      voorbij = 0;
      led.classList.remove('is-grabbed');
      track.style.scrollSnapType = '';
      track.style.scrollBehavior = '';
      // netjes uitkomen op de dichtstbijzijnde post; het ledje glijdt naar zijn echte plek in de reeks
      const st = stap();
      thumb.classList.add('is-landing');
      setTimeout(() => thumb.classList.remove('is-landing'), 500);
      track.scrollTo({ left: Math.round(track.scrollLeft / st) * st });
      requestAnimationFrame(paint);
    };
    led.addEventListener('pointerup', release);
    led.addEventListener('pointercancel', release);
    led.addEventListener('lostpointercapture', release);
    window.__ledDragging = () => dragging;
  }

  const slides = originals.map((li) => li.querySelector('.slide'));
  const box = document.getElementById('lightbox');
  const boxImg = box.querySelector('.lb-img');
  const boxCap = box.querySelector('.lb-cap');
  let current = 0;
  let opener = null;

  function show(i) {
    current = (i + slides.length) % slides.length;
    const slide = slides[current];
    boxImg.src = slide.dataset.full;
    boxImg.alt = slide.querySelector('img').alt;
    boxCap.textContent = `${slide.dataset.caption} · ${current + 1}/${slides.length}`;
  }
  function open(i) {
    opener = document.activeElement;
    show(i);
    box.hidden = false;
    document.body.classList.add('lb-lock');
    requestAnimationFrame(() => box.classList.add('is-open'));
    box.querySelector('.lb-close').focus();
  }
  function close() {
    box.classList.remove('is-open');
    document.body.classList.remove('lb-lock');
    setTimeout(() => { box.hidden = true; }, reduceMotion ? 0 : 300);
    if (opener) opener.focus();
  }

  // ook een kopie opent de juiste foto
  track.querySelectorAll('.slide').forEach((slide) => slide.addEventListener('click', () => open(Number(slide.dataset.index))));
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'Tab') { // focus binnen de lightbox houden
      const f = [...box.querySelectorAll('button')];
      const idx = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(idx + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
}


/* ============================================================
   QUELLE HEURE? · ROOKMIST (WebGL)
   De mist stelt de geur voor: sierlijke rookslierten die kronkelen,
   soms wild worden en dan weer kalm, en in elkaar oplossen in de
   kleuren van het palet (wijn, bordeaux, paars, magenta, zacht wit).
   Techniek: "domain warping": ruis die door andere ruis vervormd wordt.
   - laag 1 drijft van links naar rechts
   - laag 2 drijft van boven naar onder
   - laag 3 drijft zijwaarts naar onder, laag 4 zijwaarts naar boven
   - de tijd loopt niet gelijk: de rook versnelt en vertraagt
   - de kracht van de vervorming golft: rustige en wilde momenten
   Draait alleen als de sectie in beeld is. Bij "minder beweging":
   één stilstaand beeld. Zonder WebGL blijven de CSS-lagen staan.
   ============================================================ */
(function rookmist() {
  const holder = document.querySelector('.parfums-mist');
  const canvas = holder && holder.querySelector('.pm-rook');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  const vert = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const frag = `
    precision mediump float;
    uniform vec2 res; uniform float t;
    float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
    }
    const mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++){ v += a*noise(p); p = rot*p*2.02 + 0.13; a *= 0.5; }
      return v;
    }
    // vormen waar de mist binnenrolt (uv: 0..1, y omhoog)
    float banken(vec2 uv, float T){
      // grondmist die over de bodem rolt
      float grond = smoothstep(0.62 + 0.10*sin(uv.x*3.1 + T*0.11) + 0.07*sin(uv.x*7.3 - T*0.08), 0.0, uv.y);
      // zijmist links en rechts, die om beurten aanzwelt
      float links  = smoothstep(0.48 + 0.10*sin(uv.y*4.0 + T*0.09), 0.0, uv.x) * (0.55 + 0.45*sin(T*0.047));
      float rechts = smoothstep(0.48 + 0.10*sin(uv.y*3.3 - T*0.07), 0.0, 1.0 - uv.x) * (0.55 + 0.45*sin(T*0.039 + 2.1));
      // hoekmist bovenaan
      float boven = smoothstep(0.55, 1.05, uv.y) * smoothstep(0.75, 0.0, abs(uv.x - 0.5 - 0.3*sin(T*0.03))) * 0.75;
      // opstijgende pluimen: een kolom die breder wordt naar boven
      float x1 = 0.80 + 0.06*sin(T*0.10 + uv.y*3.0);
      float x2 = 0.20 + 0.06*sin(T*0.083 + uv.y*2.6 + 1.7);
      float pluim1 = exp(-pow((uv.x - x1)/(0.06 + 0.22*uv.y), 2.0)) * (0.5 + 0.5*sin(T*0.061));
      float pluim2 = exp(-pow((uv.x - x2)/(0.06 + 0.20*uv.y), 2.0)) * (0.5 + 0.5*sin(T*0.053 + 3.0));
      return max(max(max(grond, max(links, rechts)), boven), max(pluim1, pluim2));
    }
    float dichtheid(vec2 p, vec2 uv, float T, float wild, out vec2 q){
      q = vec2(fbm(p*0.9 + vec2(0.060*T, 0.0)),                       // links -> rechts
               fbm(p*0.9 + vec2(3.1, 7.4) + vec2(0.0, 0.050*T)));     // boven -> onder
      float n = fbm(p*1.35 + wild*q + vec2(-0.032*T, 0.028*T));        // zijwaarts naar onder / boven
      float m = banken(uv, T);
      float d = clamp((n - (1.0 - m)*0.80 - 0.04) * 1.7, 0.0, 1.0);
      return d*d*(3.0 - 2.0*d); // zachte, wollige rand
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / res;
      vec2 p = (gl_FragCoord.xy - 0.5*res) / res.y * 2.0;
      float T = t + 9.0*sin(t*0.061) + 4.0*sin(t*0.137 + 1.3);               // versnellen en vertragen
      float wild = 1.3 + 1.4*(0.5 + 0.5*sin(t*0.083 + 0.7))*(0.6 + 0.4*sin(t*0.031)); // kalm en wild
      vec2 q, q2;
      float D  = dichtheid(p, uv, T, wild, q);
      // tweede meting iets naar het licht toe: geeft de mist volume (licht van linksboven)
      vec2 l = vec2(-0.035, 0.05);
      float D2 = dichtheid(p + l, uv + l*res.y/res*0.5, T, wild, q2);
      float licht = clamp(0.70 + (D - D2)*4.5, 0.30, 1.45);
      // bolle wolkjes binnenin de mist
      float bol = fbm(p*2.2 + 1.2*q + vec2(0.02*T, 0.035*T));
      licht *= 0.62 + 0.75*bol;

      // fijne rookslierten aan de randen van de mist
      float s = fbm(p*2.6 + 1.8*q + vec2(0.04*T, -0.025*T));
      float sliert = pow(1.0 - abs(2.0*s - 1.0), 10.0) * smoothstep(0.0, 0.18, D) * smoothstep(0.85, 0.30, D);

      // kleuren uit het palet, die langzaam in elkaar oplossen
      vec3 noir = vec3(0.060, 0.035, 0.045);
      vec3 wijn = vec3(0.180, 0.071, 0.098);
      vec3 bordeaux = vec3(0.541, 0.220, 0.302);
      vec3 paars = vec3(0.592, 0.016, 0.749);
      vec3 magenta = vec3(0.949, 0.020, 0.702);
      vec3 wit = vec3(0.918, 0.863, 0.886);
      float h1 = fbm(p*0.45 + vec2(0.021*T, -0.017*T) + 11.0);
      float h2 = fbm(p*0.55 + vec2(-0.015*T, 0.019*T) + 23.0);
      vec3 tint = mix(bordeaux, paars, smoothstep(0.38, 0.62, h1));
      tint = mix(tint, magenta, smoothstep(0.52, 0.72, h2) * 0.75);
      tint = mix(tint, wit*0.82, 0.30); // zachter, stoffiger: meer mist dan neon

      vec3 achter = mix(noir, wijn, 0.35 + 0.35*uv.y*(1.0 - uv.y)*4.0*0.5);
      vec3 mist = tint * licht * (0.35 + 0.70*D);
      mist = mix(mist, mix(tint, wit, 0.55), smoothstep(0.75, 1.25, D*licht) * 0.55); // lichte toppen van de wolken
      vec3 col = mix(achter, mist, smoothstep(0.0, 1.0, D) * 0.88);
      col += mix(tint, wit, 0.45) * sliert * 0.22;

      // donkerder achter de tekst en een beetje aan de zijkanten
      vec2 c = (uv - vec2(0.5, 0.52)) * vec2(res.x/res.y*0.62, 1.0);
      float midden = smoothstep(0.60, 0.08, length(c));
      col *= 1.0 - 0.70*midden;
      col *= 0.80 + 0.20*smoothstep(0.0, 0.18, uv.x)*smoothstep(1.0, 0.82, uv.x);
      gl_FragColor = vec4(col, 1.0);
    }`;

  function shader(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  const vs = shader(gl.VERTEX_SHADER, vert), fs = shader(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'res'), uT = gl.getUniformLocation(prog, 't');

  const SCHAAL = 0.5; // halve resolutie: zachter en lichter voor de computer
  function size() {
    const w = Math.max(1, Math.round(canvas.clientWidth * SCHAAL));
    const h = Math.max(1, Math.round(canvas.clientHeight * SCHAAL));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  const start = 40 + Math.random() * 200; // elke bezoeker ziet een ander moment
  let tijd = start, last = 0, running = false, raf = 0;
  function draw() {
    size();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uT, tijd);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return; // ongeveer 30 beelden per seconde is genoeg voor rook
    tijd += last ? Math.min(now - last, 100) / 1000 : 0;
    last = now;
    draw();
  }
  draw();
  holder.classList.add('has-rook');
  window.__rook = { set(t) { tijd = t; draw(); } }; // voor tests
  if (reduceMotion) return;
  const section = holder.closest('section');
  new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    });
  }).observe(section);
  window.addEventListener('resize', () => { if (!running) draw(); });
})();

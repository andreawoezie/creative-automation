// Creative Automation – versie 2
// Achtergrond: een donkere, vloeibare bloedtextuur die van linksboven naar
// rechtsonder stroomt, met af en toe een bel die opzwelt, knapt en opspat.
// Laag 1 (WebGL): de stroming. Laag 2 (canvas 2D): de bellen en de spatten.

(function () {
  const stil = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Muis (of vinger): het bloed beweegt mee waar je overheen gaat
  const muis = { x: 0, y: 0, vorigeX: 0, vorigeY: 0, dx: 0, dy: 0, actief: false, nieuw: true };
  const MAX_SPOOR = 12;
  const spoor = [];                                   // recente punten van de muis
  const spoorData = new Float32Array(MAX_SPOOR * 4);  // naar de shader
  const sterkteData = new Float32Array(MAX_SPOOR);

  const vloeistof = document.createElement('canvas');
  const bellen = document.createElement('canvas');
  vloeistof.className = 'bloed bloed-vloeistof';
  bellen.className = 'bloed bloed-bellen';
  vloeistof.setAttribute('aria-hidden', 'true');
  bellen.setAttribute('aria-hidden', 'true');
  document.body.prepend(bellen);
  document.body.prepend(vloeistof);

  /* ---------- Laag 1: de stroming (shader) ---------- */

  const gl = vloeistof.getContext('webgl', { antialias: false, alpha: false });
  let tekenStroming = null;

  if (gl) {
    const vert = `
      attribute vec2 p;
      void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

    const frag = `
      precision mediump float;
      uniform vec2 res;
      uniform float t;
      // spoor van de muis: xy = plek, zw = hoe ver de muis daar bewoog; sterkte dooft uit
      uniform vec4 spoor[12];
      uniform float sterkte[12];

      // palet
      const vec3 nacht    = vec3(0.149, 0.031, 0.031); // #260808
      const vec3 bordeaux = vec3(0.251, 0.047, 0.047); // #400C0C
      const vec3 wijn     = vec3(0.451, 0.063, 0.063); // #731010
      const vec3 rood     = vec3(0.549, 0.051, 0.051); // #8C0D0D
      const vec3 bloed    = vec3(0.749, 0.090, 0.090); // #BF1717

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float ruis(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 5; i++) { v += a * ruis(p); p = m * p; a *= 0.5; }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / res.y;
        // stroming: links naar rechts en boven naar onder (in GL loopt y omhoog)
        vec2 stroom = vec2(1.0, -1.0) * t * 0.045;

        // de muis sleept het bloed mee: rond elk punt van het spoor schuift de vloeistof op
        vec2 sleep = vec2(0.0);
        float gloed = 0.0;
        for (int i = 0; i < 12; i++) {
          vec2 d = uv - spoor[i].xy;
          float w = exp(-dot(d, d) * 28.0) * sterkte[i];
          sleep += spoor[i].zw * w;
          gloed += w * min(length(spoor[i].zw) * 30.0, 1.0);
        }
        sleep *= 1.8;
        float lengte = length(sleep);
        if (lengte > 0.28) sleep *= 0.28 / lengte;

        vec2 p = (uv - sleep) * 2.2 - stroom;

        vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
        vec2 r = vec2(fbm(p + 3.5 * q + vec2(1.7, 9.2) + 0.12 * t),
                      fbm(p + 3.5 * q + vec2(8.3, 2.8) - 0.10 * t));
        vec2 w = p + 3.5 * r;
        float f = fbm(w);

        // reliëf van het oppervlak: zo lijkt het een dikke, glanzende vloeistof
        float e = 0.02;
        vec3 n = normalize(vec3((f - fbm(w + vec2(e, 0.0))) * 9.0,
                                (f - fbm(w + vec2(0.0, e))) * 9.0, 1.0));
        vec3 licht = normalize(vec3(-0.5, 0.6, 0.7)); // licht van linksboven
        float diffuus = max(dot(n, licht), 0.0);
        float glans = pow(max(dot(reflect(-licht, n), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);

        vec3 kleur = mix(nacht, bordeaux, smoothstep(0.15, 0.85, f));
        kleur = mix(kleur, wijn, smoothstep(0.45, 0.9, r.x) * 0.75);
        kleur = mix(kleur, rood, smoothstep(0.7, 1.0, length(q) * f) * 0.5);
        kleur *= 0.55 + 0.6 * diffuus;
        kleur += rood * glans * 0.55 + bloed * glans * glans * 0.25;
        // waar de muis net door het bloed ging, glanst het even natter
        kleur += bloed * min(gloed, 1.0) * (0.08 + glans * 0.35);

        // donker houden + vignet, zodat de tekst leesbaar blijft
        vec2 c = gl_FragCoord.xy / res - 0.5;
        kleur *= 0.9 - dot(c, c) * 0.9;
        gl_FragColor = vec4(max(kleur, nacht * 0.6), 1.0);
      }`;

    const maak = (type, bron) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, bron);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, maak(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, maak(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);

    if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const uRes = gl.getUniformLocation(prog, 'res');
      const uT = gl.getUniformLocation(prog, 't');
      const uSpoor = gl.getUniformLocation(prog, 'spoor');
      const uSterkte = gl.getUniformLocation(prog, 'sterkte');

      tekenStroming = (tijd) => {
        gl.viewport(0, 0, vloeistof.width, vloeistof.height);
        gl.uniform2f(uRes, vloeistof.width, vloeistof.height);
        gl.uniform1f(uT, tijd);
        gl.uniform4fv(uSpoor, spoorData);
        gl.uniform1fv(uSterkte, sterkteData);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
    }
  }

  if (!tekenStroming) vloeistof.remove(); // geen WebGL: de CSS-achtergrond blijft

  /* ---------- Laag 2: bellen en spatten ---------- */

  const ctx = bellen.getContext('2d');
  let b = 0, h = 0, dpr = 1;
  const lijst = [];   // bellen die opzwellen
  const spatten = []; // druppels na het knappen
  const ringen = [];  // korte kring op de plek waar een bel knapt
  let volgende = 1.2;

  function nieuweBel() {
    lijst.push({
      x: Math.random() * b,
      y: Math.random() * h,
      r: 0,
      max: 6 + Math.random() * 16,
      leeftijd: 0,
      duur: 1.4 + Math.random() * 1.6,
      fase: Math.random() * 6.28,
    });
  }

  function knap(bel, duwX = 0, duwY = 0) {
    const aantal = 7 + Math.floor(Math.random() * 8);
    for (let i = 0; i < aantal; i++) {
      const hoek = Math.random() * Math.PI * 2;
      const kracht = 40 + Math.random() * 120 + bel.max * 4;
      spatten.push({
        x: bel.x + Math.cos(hoek) * bel.r * 0.6,
        y: bel.y + Math.sin(hoek) * bel.r * 0.6,
        vx: Math.cos(hoek) * kracht + 18 + duwX,
        vy: Math.sin(hoek) * kracht - 60 + duwY,
        r: 0.8 + Math.random() * 2.6,
        leven: 0.7 + Math.random() * 0.7,
        leeftijd: 0,
      });
    }
    ringen.push({ x: bel.x, y: bel.y, r: bel.r, leeftijd: 0 });
  }

  function tekenBellen(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, b, h);

    volgende -= dt;
    if (volgende <= 0) {
      nieuweBel();
      volgende = 0.6 + Math.random() * 2.2;
    }

    // bellen drijven mee met de stroming (naar rechtsonder) en zwellen op
    for (let i = lijst.length - 1; i >= 0; i--) {
      const bel = lijst[i];
      bel.leeftijd += dt;
      bel.x += 14 * dt;
      bel.y += 14 * dt;

      // de muis neemt bellen in de buurt mee; ga je er snel doorheen, dan knappen ze
      if (muis.actief) {
        const ax = bel.x - muis.x, ay = bel.y - muis.y;
        const afstand = Math.hypot(ax, ay);
        const invloed = Math.exp(-(afstand * afstand) / (70 * 70));
        bel.x += muis.dx * invloed * 0.8;
        bel.y += muis.dy * invloed * 0.8;
        const snelheid = Math.hypot(muis.dx, muis.dy);
        if (snelheid > 6 && afstand < bel.r + 14 && bel.r > 3) {
          knap(bel, muis.dx / dt * 0.25, muis.dy / dt * 0.25);
          lijst.splice(i, 1);
          continue;
        }
      }

      const k = bel.leeftijd / bel.duur;
      bel.r = bel.max * Math.pow(Math.min(k, 1), 0.6) * (1 + Math.sin(bel.leeftijd * 9 + bel.fase) * 0.04);

      const g = ctx.createRadialGradient(bel.x - bel.r * 0.3, bel.y - bel.r * 0.35, bel.r * 0.1, bel.x, bel.y, bel.r);
      g.addColorStop(0, 'rgba(140, 13, 13, 0.55)');
      g.addColorStop(0.7, 'rgba(64, 12, 12, 0.5)');
      g.addColorStop(1, 'rgba(115, 16, 16, 0.85)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bel.x, bel.y, bel.r, 0, Math.PI * 2);
      ctx.fill();

      // klein glanspuntje
      ctx.fillStyle = 'rgba(191, 23, 23, 0.35)';
      ctx.beginPath();
      ctx.arc(bel.x - bel.r * 0.35, bel.y - bel.r * 0.4, bel.r * 0.18, 0, Math.PI * 2);
      ctx.fill();

      if (k >= 1) {
        knap(bel);
        lijst.splice(i, 1);
      }
    }

    for (let i = ringen.length - 1; i >= 0; i--) {
      const ring = ringen[i];
      ring.leeftijd += dt;
      const k = ring.leeftijd / 0.45;
      if (k >= 1) { ringen.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(140, 13, 13, ${0.6 * (1 - k)})`;
      ctx.lineWidth = 2 * (1 - k) + 0.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r * (1 + k * 1.6), 0, Math.PI * 2);
      ctx.stroke();
    }

    // druppels vliegen weg en vallen terug (zwaartekracht)
    for (let i = spatten.length - 1; i >= 0; i--) {
      const d = spatten[i];
      d.leeftijd += dt;
      if (d.leeftijd >= d.leven) { spatten.splice(i, 1); continue; }
      d.vy += 380 * dt;
      d.vx *= 0.985;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      const a = 1 - d.leeftijd / d.leven;
      ctx.fillStyle = `rgba(140, 13, 13, ${0.8 * a})`;
      ctx.beginPath();
      // druppels rekken uit in de richting waarin ze vliegen
      const hoek = Math.atan2(d.vy, d.vx);
      ctx.ellipse(d.x, d.y, d.r * 1.8, d.r, hoek, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- Formaat en lus ---------- */

  function formaat() {
    b = window.innerWidth;
    h = window.innerHeight;
    // de stroming is zacht, dus een lagere resolutie is genoeg (en spaart de processor)
    const schaal = 0.5;
    vloeistof.width = Math.ceil(b * schaal);
    vloeistof.height = Math.ceil(h * schaal);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    bellen.width = Math.ceil(b * dpr);
    bellen.height = Math.ceil(h * dpr);
  }
  formaat();
  window.addEventListener('resize', () => {
    formaat();
    if (stil && tekenStroming) tekenStroming(20);
  });

  if (stil) {
    // minder beweging: één stilstaand beeld van de vloeistof, geen bellen
    if (tekenStroming) tekenStroming(20);
    return;
  }

  /* ---------- Muis volgen ---------- */

  window.addEventListener('pointermove', (e) => {
    muis.x = e.clientX;
    muis.y = e.clientY;
    if (!muis.actief) {
      // net binnengekomen: geen sprong vanaf de vorige plek
      muis.vorigeX = muis.x;
      muis.vorigeY = muis.y;
      muis.actief = true;
    }
  }, { passive: true });
  const weg = () => { muis.actief = false; };
  document.documentElement.addEventListener('pointerleave', weg);
  window.addEventListener('blur', weg);
  window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') weg(); });
  window.addEventListener('pointercancel', weg);

  function volgMuis(dt) {
    muis.dx = muis.actief ? muis.x - muis.vorigeX : 0;
    muis.dy = muis.actief ? muis.y - muis.vorigeY : 0;
    muis.vorigeX = muis.x;
    muis.vorigeY = muis.y;

    // nieuw punt in het spoor als de muis bewoog (in eenheden van de shader: schermhoogte = 1)
    if (muis.actief && Math.hypot(muis.dx, muis.dy) > 0.5) {
      spoor.push({ x: muis.x / h, y: (h - muis.y) / h, vx: muis.dx / h, vy: -muis.dy / h, s: 1 });
      if (spoor.length > MAX_SPOOR) spoor.shift();
    }

    // het spoor dooft in ongeveer een seconde uit; het bloed vloeit terug
    const uitdoven = Math.pow(0.03, dt);
    for (let i = spoor.length - 1; i >= 0; i--) {
      spoor[i].s *= uitdoven;
      if (spoor[i].s < 0.01) spoor.splice(i, 1);
    }

    spoorData.fill(0);
    sterkteData.fill(0);
    spoor.forEach((p, i) => {
      spoorData.set([p.x, p.y, p.vx, p.vy], i * 4);
      sterkteData[i] = p.s;
    });
  }

  let vorige = performance.now();
  const start = vorige;
  function lus(nu) {
    const dt = Math.min((nu - vorige) / 1000, 0.05);
    vorige = nu;
    volgMuis(dt);
    if (tekenStroming) tekenStroming((nu - start) / 1000 + 20);
    tekenBellen(dt);
    requestAnimationFrame(lus);
  }
  requestAnimationFrame(lus);
})();

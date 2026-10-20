// Creative Automation – versie 2
document.documentElement.classList.add('js');

// Titel: elke letter in een eigen span, zodat ze één voor één kunnen verschijnen
let i = 0;
document.querySelectorAll('.titel .regel').forEach((regel) => {
  const woord = regel.textContent;
  regel.textContent = '';
  for (const teken of woord) {
    const l = document.createElement('span');
    l.className = 'l';
    l.textContent = teken;
    l.style.setProperty('--i', i++);
    l.setAttribute('aria-hidden', 'true');
    regel.appendChild(l);
  }
});

// Hoofdstukken: het raam licht op zodra het in beeld komt
const folios = document.querySelectorAll('.folio');
if ('IntersectionObserver' in window) {
  const kijker = new IntersectionObserver((items) => {
    items.forEach((item) => {
      if (item.isIntersecting) {
        item.target.classList.add('zichtbaar');
        kijker.unobserve(item.target);
      }
    });
  }, { threshold: 0.35 });
  folios.forEach((f) => kijker.observe(f));
} else {
  folios.forEach((f) => f.classList.add('zichtbaar'));
}

// Navigatie: de link van het hoofdstuk dat in het midden van het scherm staat, licht op
const links = document.querySelectorAll('.balk-links a');
function markeer(id) {
  links.forEach((a) => {
    const actief = a.getAttribute('href') === '#' + id;
    if (actief) {
      a.setAttribute('aria-current', 'true');
    } else {
      a.removeAttribute('aria-current');
    }
  });
}
if ('IntersectionObserver' in window) {
  const wachter = new IntersectionObserver((items) => {
    items.forEach((item) => { if (item.isIntersecting) markeer(item.target.id); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  folios.forEach((f) => wachter.observe(f));
  // boven aan de pagina is er geen hoofdstuk actief
  wachter.observe(document.querySelector('.hero'));
}

// Hamburgermenu (gsm en kleine tablet)
const nav = document.querySelector('.balk');
const knop = document.querySelector('.balk-knop');
function menu(open) {
  nav.classList.toggle('open', open);
  knop.setAttribute('aria-expanded', String(open));
  knop.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
}
knop.addEventListener('click', () => menu(!nav.classList.contains('open')));
// na een klik op een hoofdstuk gaat het menu dicht
links.forEach((a) => a.addEventListener('click', () => menu(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('open')) { menu(false); knop.focus(); }
});
// klik naast het menu: dicht
document.addEventListener('click', (e) => {
  if (nav.classList.contains('open') && !nav.contains(e.target)) menu(false);
});
// wordt het scherm breder, dan verdwijnt het menu
window.matchMedia('(max-width: 960px)').addEventListener('change', (e) => { if (!e.matches) menu(false); });

// Mist en pijl op het beginscherm verdwijnen zodra je naar beneden scrolt
const hero = document.querySelector('.hero');
const verder = document.querySelector('.verder');
let mistGepland = false;
function mist() {
  mistGepland = false;
  const k = Math.max(0, Math.min(1, 1 - window.scrollY / (window.innerHeight * 0.6)));
  hero.style.setProperty('--mist', k.toFixed(3));
  verder.toggleAttribute('data-weg', k < 0.05);
}
window.addEventListener('scroll', () => {
  if (!mistGepland) { mistGepland = true; requestAnimationFrame(mist); }
}, { passive: true });
mist();

// Bloedmarkering: het bloed loopt over de kernwoorden mee met het scrollen.
// Het woord begint te vullen op 85% van de schermhoogte en is vol op 50%;
// daarna druipt het tot het woord op 35% staat.
const marks = document.querySelectorAll('.tekst mark');
const stil = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let markGepland = false;
function bloed() {
  markGepland = false;
  const h = window.innerHeight;
  // onderaan de pagina kun je niet ver genoeg scrollen voor de laatste woorden:
  // in de laatste 30% scrollruimte lopen alle zichtbare woorden alsnog vol
  const rest = document.documentElement.scrollHeight - h - window.scrollY;
  const eind = 1 - Math.min(1, rest / (h * 0.3));
  marks.forEach((m) => {
    const top = m.getBoundingClientRect().top;
    const inBeeld = top < h ? eind : 0;
    const vul = Math.max(inBeeld, Math.min(1, Math.max(0, (h * 0.85 - top) / (h * 0.35))));
    const drup = Math.max(inBeeld, Math.min(1, Math.max(0, (h * 0.5 - top) / (h * 0.15))));
    m.style.setProperty('--vul', vul.toFixed(3));
    m.style.setProperty('--drup', drup.toFixed(3));
    m.classList.toggle('vol', vul > 0.6);
  });
}
if (!stil) {
  window.addEventListener('scroll', () => {
    if (!markGepland) { markGepland = true; requestAnimationFrame(bloed); }
  }, { passive: true });
  window.addEventListener('resize', bloed);
  bloed();
}

// Scènes: op een aanraakscherm is er geen hover, dus een tik maakt de scène even eng
document.querySelectorAll('.scene').forEach((scene) => {
  let klok;
  scene.addEventListener('click', () => {
    scene.classList.add('eng');
    clearTimeout(klok);
    klok = setTimeout(() => scene.classList.remove('eng'), 2500);
  });
});

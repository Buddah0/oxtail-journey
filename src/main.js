import './style.css';
import Globe from 'globe.gl';
import { gsap } from 'gsap';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-110m.json';
import stops from './data/stops.json';

// BASE_URL keeps texture paths correct when the site is later served from a sub-path (GitHub Pages).
const BASE = import.meta.env.BASE_URL;
const FLY_MS = 1800;

// ---------- Globe ----------
const globeEl = document.getElementById('globe');

const globe = new Globe(globeEl, { animateIn: true })
  .globeImageUrl(`${BASE}textures/earth-night.jpg`)
  .backgroundImageUrl(`${BASE}textures/night-sky.png`)
  .showAtmosphere(true)
  .atmosphereColor('#ffb347')
  .atmosphereAltitude(0.18);

const controls = globe.controls();
controls.autoRotateSpeed = 0.35;
controls.enableZoom = false; // the story controls the zoom; visitors can still drag to rotate

// Fill the window and lift the globe so the info card sits under it
// (lifted further on phones, where the card is a taller bottom sheet).
const phone = window.matchMedia('(max-width: 640px)');
function fitGlobe() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  globe.width(w).height(h).globeOffset([0, -h * (phone.matches ? 0.22 : 0.12)]);
}
fitGlobe();
window.addEventListener('resize', fitGlobe);

// ---------- Countries + light-up ----------
const countries = feature(worldTopo, worldTopo.objects.countries).features;
let lit = new Set();
const isLit = (d) => lit.has(d.properties.name);

globe.polygonsData(countries).polygonsTransitionDuration(800);

// Fresh accessor functions make Globe.gl re-evaluate every polygon.
function highlight(names = []) {
  lit = new Set(names);
  globe
    .polygonCapColor((d) => (isLit(d) ? 'rgba(255, 179, 71, 0.55)' : 'rgba(0, 0, 0, 0)'))
    .polygonSideColor((d) => (isLit(d) ? 'rgba(181, 69, 43, 0.45)' : 'rgba(0, 0, 0, 0)'))
    .polygonStrokeColor((d) => (isLit(d) ? '#ffd28a' : 'rgba(255, 200, 140, 0.12)'))
    .polygonAltitude((d) => (isLit(d) ? 0.06 : 0.006));
}

// ---------- Rings (pulsing city markers) + arcs (migration routes) ----------
globe
  .ringColor(() => (t) => `rgba(255, 179, 71, ${1 - t})`)
  .ringMaxRadius(3)
  .ringPropagationSpeed(2)
  .ringRepeatPeriod(900)
  .arcColor(() => ['rgba(255, 179, 71, 0.15)', '#ffb347'])
  .arcStroke(0.6)
  .arcDashLength(0.4)
  .arcDashGap(0.2)
  .arcDashAnimateTime(2200);

// rings: [{ lat, lng }]  arcs: [{ startLat, startLng, endLat, endLng }]
function setMarkers({ rings = [], arcs = [] } = {}) {
  globe.ringsData(rings).arcsData(arcs);
}

// ---------- Place labels (names of what's lit up) ----------
// Each label is a 0-size anchor pinned to its lat/lng; the text sits left, right or centered on it.
// Globe.gl hides labels automatically while they're behind the globe.
globe
  .htmlTransitionDuration(0)
  .htmlAltitude((d) => (d.kind === 'country' ? 0.07 : 0.012))
  .htmlElement((d) => {
    const anchor = document.createElement('div');
    anchor.className = 'globe-label';
    const text = document.createElement('div');
    const align = d.align || (d.kind === 'place' ? 'right' : 'center');
    text.className = `globe-label__text globe-label--${d.kind} globe-label--${align}`;
    text.textContent = d.text;
    anchor.appendChild(text);
    return anchor;
  });

// labels: [{ text, lat, lng, kind: 'country' | 'place', align?: 'left' | 'right' | 'center' }]
function setLabels(labels = []) {
  globe.htmlElementsData(labels);
}

// ---------- Info card ----------
const els = {
  card: document.getElementById('card'),
  title: document.getElementById('title'),
  body: document.getElementById('body'),
  progress: document.getElementById('progress'),
  prev: document.getElementById('prev'),
  next: document.getElementById('next'),
};
const CONTENT_COUNT = stops.filter((s) => s.kind === 'stop').length;

const escapeHtml = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// **bold** and *italic* markers from stops.json
const format = (s) =>
  escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

function cardHtml(stop) {
  if (stop.kind === 'title') {
    return `<p class="card__subtitle">${format(stop.subtitle)}</p>
      <p class="card__hint">Press › or → to begin</p>`;
  }
  if (stop.kind === 'works-cited') {
    return `<ul class="works-cited">${stop.entries.map((e) => `<li>${format(e)}</li>`).join('')}</ul>
      <p class="credit">${format(stop.credit)}</p>`;
  }
  const facts = stop.bullets
    .map((b) => `<li>${format(b.text)} <span class="cite">${escapeHtml(b.cite)}</span></li>`)
    .join('');
  // stop.story: the author's own words (no citation needed), shown under the cited facts
  const story = stop.story ? `<p class="story">${format(stop.story)}</p>` : '';
  return `<ul class="facts">${facts}</ul>${story}`;
}

function progressText(stop, i) {
  if (stop.kind === 'title') return '';
  if (stop.kind === 'works-cited') return 'Sources';
  return `Stop ${i} of ${CONTENT_COUNT}`;
}

function renderCard(i) {
  const stop = stops[i];
  els.card.dataset.kind = stop.kind;
  els.title.textContent = stop.title;
  els.body.innerHTML = cardHtml(stop);
  els.body.scrollTop = 0;
  els.progress.textContent = progressText(stop, i);
  els.prev.disabled = i === 0;
  els.next.disabled = i === stops.length - 1;
}

// ---------- Globe state for a stop ----------
function applyGlobe(stop, ms = FLY_MS) {
  controls.autoRotate = Boolean(stop.autoRotate);
  highlight(stop.countries);
  setMarkers(stop);
  setLabels(stop.labels);
  globe.pointOfView(stop.pov, ms);
  globeEl.classList.toggle('globe--dim', stop.kind === 'works-cited');
}

// ---------- Navigation ----------
let index = 0;
let busy = false; // ignore clicks while a transition is running

async function goTo(target) {
  if (busy || target < 0 || target >= stops.length || target === index) return;
  busy = true;
  index = target;
  await gsap.to(els.card, { autoAlpha: 0, y: 24, duration: 0.3, ease: 'power2.in' });
  applyGlobe(stops[index]);
  renderCard(index);
  await gsap.fromTo(
    els.card,
    { autoAlpha: 0, y: 24 },
    { autoAlpha: 1, y: 0, duration: 0.45, delay: 0.35, ease: 'power2.out' },
  );
  busy = false;
}

els.prev.addEventListener('click', () => goTo(index - 1));
els.next.addEventListener('click', () => goTo(index + 1));
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') goTo(index + 1);
  if (e.key === 'ArrowLeft') goTo(index - 1);
});

// First screen: no fly-in animation.
applyGlobe(stops[0], 0);
renderCard(0);

// Test hooks for the dev server only; not included in the production build.
if (import.meta.env.DEV) {
  Object.assign(window, { __globe: globe, __state: () => ({ index, busy, stop: stops[index].id }) });
}

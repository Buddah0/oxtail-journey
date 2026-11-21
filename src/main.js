import './style.css';
import Globe from 'globe.gl';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-110m.json';

// BASE_URL keeps texture paths correct when the site is later served from a sub-path (GitHub Pages).
const BASE = import.meta.env.BASE_URL;

// ---------- Globe ----------
const globeEl = document.getElementById('globe');

const globe = new Globe(globeEl, { animateIn: true })
  .globeImageUrl(`${BASE}textures/earth-night.jpg`)
  .backgroundImageUrl(`${BASE}textures/night-sky.png`)
  .showAtmosphere(true)
  .atmosphereColor('#ffb347')
  .atmosphereAltitude(0.18)
  .width(window.innerWidth)
  .height(window.innerHeight);

const controls = globe.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.enableZoom = false; // the story controls the zoom; visitors can still drag to rotate

globe.pointOfView({ lat: 20, lng: -40, altitude: 2.4 });

window.addEventListener('resize', () => {
  globe.width(window.innerWidth).height(window.innerHeight);
});

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
highlight();

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

// Test hooks for the dev server only; not included in the production build.
if (import.meta.env.DEV) Object.assign(window, { __globe: globe, __highlight: highlight, __setMarkers: setMarkers });

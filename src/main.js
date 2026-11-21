import './style.css';
import Globe from 'globe.gl';

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

// Test hook for the dev server only; not included in the production build.
if (import.meta.env.DEV) window.__globe = globe;

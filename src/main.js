import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { createDog } from './dog.js';
import { createWorld } from './world.js';
import { createMusic } from './music.js';

const $ = (s) => document.querySelector(s);

// Always start at the top — a restored scroll position would walk the dog behind the loader
history.scrollRestoration = 'manual';
scrollTo(0, 0);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ───────── Renderer / scene ─────────
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const effect = new OutlineEffect(renderer, { defaultThickness: 0.004, defaultColor: [0.07, 0.07, 0.07] });

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#FFE3F4', 25, 70);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);

scene.add(new THREE.HemisphereLight('#ffffff', '#ffd6ef', 1.6));
const sunLight = new THREE.DirectionalLight('#ffffff', 2.2);
sunLight.position.set(4, 10, 6);
scene.add(sunLight);

const dog = createDog();
scene.add(dog.root);
const world = createWorld(scene);

// ───────── Camera keyframes (one per section) ─────────
// pos = camera position, look = point the camera looks at. Dog stays at the origin.
const shots = [
  { pos: [1.6, 2.4, 9.0], look: [2.8, 1.1, 0] },   // hello (card right → dog left)
  { pos: [-0.5, 2.8, 8.6], look: [-2.6, 1.0, 0] }, // about (card left → dog right)
  { pos: [2.5, 4.2, 10.5], look: [4.0, 1.1, 0] },  // work
  { pos: [5.6, 1.6, 6.0], look: [-1.8, 1.2, 0] },  // awards (front 3/4)
  { pos: [3.0, 2.2, 9.5], look: [4.2, 1.6, 0] },   // contact (dog left of the card)
];
const mobileShot = (s) => ({ pos: [s.pos[0] * 0.5, 2.2, s.pos[2] + 3], look: [0, -1.4, 0] }); // dog in the top third

const sections = [...document.querySelectorAll('main section')];
let sectionTops = [];
const measure = () => { sectionTops = sections.map((s) => s.offsetTop); };

function sectionProgress() {
  const y = scrollY + innerHeight * 0.3;
  for (let i = sectionTops.length - 1; i >= 0; i--) {
    if (y >= sectionTops[i]) {
      const next = sectionTops[i + 1] ?? sectionTops[i] + innerHeight;
      return Math.min(i + (y - sectionTops[i]) / (next - sectionTops[i]), sections.length - 1);
    }
  }
  return 0;
}

const camPos = new THREE.Vector3(...shots[0].pos);
const camLook = new THREE.Vector3(...shots[0].look);
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3(), tmpD = new THREE.Vector3();
const ease = (x) => x * x * (3 - 2 * x);

function cameraTarget(p, pointer) {
  const mobile = innerWidth < 760;
  const i = Math.floor(p), f = ease(p - i);
  let a = shots[i], b = shots[Math.min(i + 1, shots.length - 1)];
  if (mobile) { a = mobileShot(a); b = mobileShot(b); }
  tmpA.fromArray(a.pos).lerp(tmpB.fromArray(b.pos), f);
  tmpC.fromArray(a.look).lerp(tmpD.fromArray(b.look), f);
  tmpA.x += pointer.x * 0.5;
  tmpA.y += pointer.y * 0.3;
  return [tmpA, tmpC];
}

// ───────── Input ─────────
const pointer = new THREE.Vector2();
const ndc = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let hoveringDog = false;

addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ndc.copy(pointer);
});

function hitDog() {
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObject(dog.root, true).some((h) => h.object.userData.isDog && h.object.visible);
}

canvas.addEventListener('click', (e) => {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (hitDog()) woof(e.clientX, e.clientY);
});

// ───────── Bark, hearts & sound ─────────
const barkEl = $('#bark');
const heartsEl = $('#hearts');
let barkTimer = 0;
let audio;

function playWoof() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    for (const [delay, f0] of [[0, 420], [0.16, 380]]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const filter = audio.createBiquadFilter();
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      osc.frequency.setValueAtTime(f0, t + delay);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.45, t + delay + 0.12);
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, t + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.13);
      osc.connect(filter).connect(gain).connect(audio.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.15);
    }
  } catch { /* audio unavailable — silent dog */ }
}

function spawnHearts(x, y, n = 6, chars = ['💖', '💛', '💜', '🧡', '🐾']) {
  for (let i = 0; i < n; i++) {
    const h = document.createElement('span');
    h.className = 'heart';
    h.textContent = chars[Math.floor(Math.random() * chars.length)];
    h.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    h.style.top = `${y + (Math.random() - 0.5) * 20}px`;
    h.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    h.style.setProperty('--rot', `${(Math.random() - 0.5) * 60}deg`);
    h.style.animationDelay = `${i * 40}ms`;
    heartsEl.appendChild(h);
    h.addEventListener('animationend', () => h.remove());
  }
}

const barkWords = ['HAU!', 'HAU HAU!', 'WOOF!', 'JUŻ LEPIEJ!', 'HAU! 💛'];
function woof(x, y) {
  dog.bark();
  playWoof();
  barkEl.textContent = barkWords[Math.floor(Math.random() * barkWords.length)];
  barkEl.classList.add('show');
  barkTimer = 1.1;
  spawnHearts(x, y);
}

// ───────── Bones ─────────
const boneCountEl = $('#bone-count');
const boneCounter = $('.bones-counter');
let boneCount = 0;
let walking = false; // bones only count once the walk has started
const projected = new THREE.Vector3();
function onCollect(obj) {
  boneCount++;
  boneCountEl.textContent = boneCount;
  boneCounter.classList.remove('pop');
  void boneCounter.offsetWidth;
  boneCounter.classList.add('pop');
  dog.state.excited = Math.min(1, dog.state.excited + 0.6);
  projected.setFromMatrixPosition(obj.matrixWorld).project(camera);
  spawnHearts((projected.x + 1) / 2 * innerWidth, (1 - projected.y) / 2 * innerHeight, 3, ['🦴', '✨']);
}

// ───────── Cards reveal & progress ─────────
const io = new IntersectionObserver(
  (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('in')),
  { threshold: 0.25 },
);
document.querySelectorAll('.card').forEach((c) => io.observe(c));
const progressFill = $('#progress-fill');

// ───────── Resize ─────────
function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 760 ? 52 : 40;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  measure();
}
addEventListener('resize', resize);
resize();

// ───────── Loop ─────────
const timer = new THREE.Timer();
let distance = 0;
const headPos = new THREE.Vector3();

function frame(now) {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.getElapsed();

  // Scrolling walks the dog
  const targetDistance = scrollY * 0.012;
  const prev = distance;
  distance = reducedMotion ? targetDistance : THREE.MathUtils.damp(distance, targetDistance, 3.5, dt);
  const speed = (distance - prev) / Math.max(dt, 1e-4);

  world.update(distance, t, dt, walking ? onCollect : null);

  dog.state.look.set(pointer.x, pointer.y);
  dog.update(dt, t, reducedMotion ? 0 : speed);

  const [pos, look] = cameraTarget(sectionProgress(), pointer);
  const k = 1 - Math.exp(-dt * 3);
  camPos.lerp(pos, k);
  camLook.lerp(look, k);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  // Hover cursor
  const over = hitDog();
  if (over !== hoveringDog) { hoveringDog = over; canvas.classList.toggle('hover-dog', over); }

  // Speech bubble follows the head
  if (barkTimer > 0) {
    barkTimer -= dt;
    dog.head.getWorldPosition(headPos);
    headPos.y += 0.6;
    headPos.project(camera);
    barkEl.style.left = `${(headPos.x + 1) / 2 * innerWidth}px`;
    barkEl.style.top = `${(1 - headPos.y) / 2 * innerHeight}px`;
    if (barkTimer <= 0) barkEl.classList.remove('show');
  }

  const max = document.documentElement.scrollHeight - innerHeight;
  progressFill.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;

  effect.render(scene, camera);
}
renderer.setAnimationLoop(frame);

// ───────── Preloader ─────────
const loader = $('#loader');
const fill = $('#loader-fill');
const pct = $('#loader-pct');
const startBtn = $('#loader-start');
let shown = 0, ready = false;

document.fonts.ready.then(() => { ready = true; measure(); });

(function tick() {
  const cap = ready ? 100 : 90;
  shown = Math.min(cap, shown + (cap - shown) * 0.08 + 0.6);
  fill.style.width = `${shown}%`;
  pct.textContent = Math.floor(shown);
  if (shown >= 100) {
    startBtn.hidden = false;
    startBtn.focus({ preventScroll: true });
    return;
  }
  requestAnimationFrame(tick);
})();

startBtn.addEventListener('click', () => {
  loader.classList.add('hide');
  document.body.classList.remove('is-loading');
  scrollTo(0, 0);
  distance = 0;
  boneCount = 0;
  boneCountEl.textContent = 0;
  walking = true;
  measure();
  setTimeout(() => {
    loader.remove();
    const r = canvas.getBoundingClientRect();
    dog.head.getWorldPosition(headPos).project(camera);
    woof((headPos.x + 1) / 2 * r.width, (1 - headPos.y) / 2 * r.height);
  }, 700);
});

// ───────── Music ─────────
const music = createMusic();
const musicBtn = $('#music-toggle');
const musicLabel = $('#music-label');
function syncMusicBtn() {
  const on = music.playing;
  musicBtn.setAttribute('aria-pressed', on);
  musicBtn.classList.toggle('on', on);
  musicLabel.textContent = on ? 'Muzyczka: wł.' : 'Muzyczka: wył.';
}
musicBtn.addEventListener('click', () => { music.toggle(); syncMusicBtn(); });
// The "let's go" click is a user gesture, so the browser lets the music start right away
startBtn.addEventListener('click', () => { if (!music.playing) music.toggle(); syncMusicBtn(); });

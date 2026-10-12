import * as THREE from 'three';
import { toon } from './materials.js';

const LOOP = 140;         // length of the repeating strip of scenery
const BEHIND = 40;        // how far behind the dog objects stay visible
const NOSE = 1.3;         // x of the dog's snout — bones are eaten when they reach it
const PALETTE = ['#FF90E8', '#FFC900', '#90A8FF', '#FF7A4D', '#7EE8B5'];

// Deterministic random so the world looks the same on every visit
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const range = (a, b) => a + rand() * (b - a);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

export function createWorld(scene) {
  const movers = []; // { obj, u, onWrap? }
  const add = (obj, u, extra = {}) => { scene.add(obj); movers.push({ obj, u, cycle: null, ...extra }); return obj; };

  // ───────── Static ground ─────────
  const ground = new THREE.Mesh(new THREE.BoxGeometry(400, 1, 60), toon('#7EE8B5', 0));
  ground.position.set(0, -0.5, -10);
  scene.add(ground);

  const path = new THREE.Mesh(new THREE.BoxGeometry(400, 0.05, 2.6), toon('#FFE7A8', 0));
  path.position.set(0, 0.02, 0);
  scene.add(path);

  // Pond behind the path
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.06, 40), toon('#6FD3FF', 0.003));
  pond.scale.set(7, 1, 2.2);
  add(pond, 30, { y: 0.03, z: -7 });

  // ───────── Shared geometry ─────────
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 16);
  const ball = new THREE.SphereGeometry(1, 18, 14);
  const cone = new THREE.ConeGeometry(1, 1, 7);

  // Stepping stones in the path (give a strong sense of motion)
  for (let u = 0; u < LOOP; u += 1.6) {
    const s = new THREE.Mesh(cyl, toon('#FFF4E0', 0.002));
    s.scale.set(range(0.22, 0.32), 0.06, range(0.22, 0.32));
    add(s, u + range(-0.2, 0.2), { y: 0.06, z: range(-0.8, 0.8) });
  }

  // ───────── Gates: a candy-colored tunnel ─────────
  function gate(color) {
    const g = new THREE.Group();
    const mat = toon(color);
    const dark = toon('#111111', 0.002);
    for (const z of [-1.55, 1.55]) {
      const post = new THREE.Mesh(cyl, mat);
      post.scale.set(0.13, 3.1, 0.13);
      post.position.set(0, 1.55, z);
      g.add(post);
      const foot = new THREE.Mesh(cyl, dark);
      foot.scale.set(0.17, 0.25, 0.17);
      foot.position.set(0, 0.12, z);
      g.add(foot);
    }
    const top = new THREE.Mesh(box, mat);
    top.scale.set(0.32, 0.22, 4.2);
    top.position.y = 3.25;
    g.add(top);
    const cap = new THREE.Mesh(box, dark);
    cap.scale.set(0.38, 0.12, 4.5);
    cap.position.y = 3.42;
    g.add(cap);
    const beam = new THREE.Mesh(box, mat);
    beam.scale.set(0.2, 0.16, 3.4);
    beam.position.y = 2.65;
    g.add(beam);
    return g;
  }
  let ci = 0;
  for (const [start, count] of [[8, 9], [70, 12]]) {
    for (let i = 0; i < count; i++) add(gate(PALETTE[ci++ % 4]), start + i * 2.4);
  }

  // ───────── Lollipop trees & blossom trees ─────────
  function tree(color, h) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(cyl, toon('#B8763E'));
    trunk.scale.set(0.14, h, 0.14);
    trunk.position.y = h / 2;
    g.add(trunk);
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const r = range(0.8, 1.3);
      const c = new THREE.Mesh(ball, toon(color));
      c.scale.setScalar(r);
      c.position.set(range(-0.5, 0.5), h + range(0, 0.6), range(-0.5, 0.5));
      g.add(c);
    }
    return g;
  }
  function pine(color) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(cone, toon(color));
      const s = 1.3 - i * 0.3;
      c.scale.set(s, 1.3, s);
      c.position.y = 1 + i * 0.8;
      g.add(c);
    }
    const trunk = new THREE.Mesh(cyl, toon('#B8763E'));
    trunk.scale.set(0.12, 0.6, 0.12);
    trunk.position.y = 0.3;
    g.add(trunk);
    return g;
  }
  for (let u = 0; u < LOOP; u += range(3, 6)) {
    const back = rand() > 0.25;
    const z = back ? range(-4, -16) : range(4, 7);
    const t = rand() > 0.35
      ? tree(pick(['#FF90E8', '#FFB3F0', '#FFC900', '#FF7A4D']), range(1.4, 2.6))
      : pine(pick(['#3DCB8A', '#2FB57A']));
    const s = back ? range(0.9, 1.5) : range(0.6, 0.9);
    t.scale.setScalar(s);
    t.rotation.y = range(0, Math.PI * 2);
    add(t, u, { z });
  }

  // ───────── Bushes & flowers ─────────
  for (let u = 0; u < LOOP; u += range(1.5, 3.5)) {
    const side = rand() > 0.5 ? 1 : -1;
    const z = side * range(1.8, 3.2);
    if (rand() > 0.5) {
      const b = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(ball, toon(pick(['#3DCB8A', '#5BE0A0'])));
        m.scale.setScalar(range(0.3, 0.5));
        m.position.set(i * 0.35 - 0.35, 0.25, range(-0.1, 0.1));
        b.add(m);
      }
      add(b, u, { z });
    } else {
      const f = new THREE.Group();
      const stem = new THREE.Mesh(cyl, toon('#2FB57A', 0.002));
      stem.scale.set(0.03, 0.45, 0.03);
      stem.position.y = 0.22;
      f.add(stem);
      const col = pick(PALETTE);
      for (let i = 0; i < 5; i++) {
        const p = new THREE.Mesh(ball, toon(col, 0.002));
        const a = (i / 5) * Math.PI * 2;
        p.scale.set(0.09, 0.05, 0.09);
        p.position.set(Math.cos(a) * 0.1, 0.48, Math.sin(a) * 0.1);
        f.add(p);
      }
      const c = new THREE.Mesh(ball, toon('#FFC900', 0.002));
      c.scale.setScalar(0.06);
      c.position.y = 0.5;
      f.add(c);
      add(f, u, { z });
    }
  }

  // ───────── Bones to collect ─────────
  const boneMat = toon('#FFFFFF');
  function bone() {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(cyl, boneMat);
    shaft.scale.set(0.07, 0.5, 0.07);
    shaft.rotation.z = Math.PI / 2;
    g.add(shaft);
    for (const x of [-0.27, 0.27]) for (const y of [-0.07, 0.07]) {
      const k = new THREE.Mesh(ball, boneMat);
      k.scale.setScalar(0.1);
      k.position.set(x, y, 0);
      g.add(k);
    }
    return g;
  }
  const bones = [];
  for (let u = 14; u < LOOP; u += range(7, 12)) {
    const b = bone();
    bones.push(add(b, u, { y: 0.55, bone: true, collected: false, pop: 0 }));
  }
  const boneMovers = movers.filter((m) => m.bone);

  // ───────── Clouds (slow parallax) ─────────
  const clouds = [];
  const cloudMat = toon('#FFFFFF', 0.003);
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const p = new THREE.Mesh(ball, cloudMat);
      p.scale.set(range(1, 1.8), range(0.8, 1.2), 1);
      p.position.set(j * 1.3 - 2, range(-0.2, 0.4), range(-0.3, 0.3));
      g.add(p);
    }
    g.position.set(range(-60, 60), range(9, 16), range(-30, -45));
    g.userData.u = g.position.x;
    g.userData.speed = range(0.6, 1.4);
    scene.add(g);
    clouds.push(g);
  }

  // Sun
  const sun = new THREE.Mesh(ball, new THREE.MeshBasicMaterial({ color: '#FFE45C' }));
  sun.material.userData.outlineParameters = { thickness: 0.006, color: [0.07, 0.07, 0.07] };
  sun.scale.setScalar(4);
  sun.position.set(18, 22, -60);
  scene.add(sun);

  // ───────── Update ─────────
  // distance = how far the dog has walked. Objects scroll toward -X.
  function update(distance, t, dt, onCollect) {
    for (const m of movers) {
      const raw = m.u - distance + BEHIND;
      const x = raw - Math.floor(raw / LOOP) * LOOP - BEHIND;
      m.obj.position.x = x;
      if (m.y !== undefined) m.obj.position.y = m.y;
      if (m.z !== undefined) m.obj.position.z = m.z;

      if (m.bone) {
        // Re-arm a bone once it is ahead of the dog again (walking back, or the strip looping)
        if (m.collected && x > 1.8) { m.collected = false; m.pop = 0; m.obj.visible = true; m.obj.scale.setScalar(1); }
        if (!m.collected) {
          m.obj.rotation.y = t * 2.5;
          m.obj.position.y = m.y + Math.sin(t * 3 + m.u) * 0.12;
          // Collect only when the dog walks forward into it (x crosses the dog's nose)
          const crossed = m.prevX !== undefined && m.prevX >= NOSE && x < NOSE && m.prevX - x < 5;
          if (crossed && onCollect) { m.collected = true; onCollect(m.obj); }
        } else if (m.obj.visible) {
          m.pop += dt * 4;
          m.obj.position.y = m.y + m.pop * 1.6;
          m.obj.rotation.y += dt * 20;
          m.obj.scale.setScalar(Math.max(0, 1 - m.pop));
          if (m.pop >= 1) m.obj.visible = false;
        }
        m.prevX = x;
      }
    }
    for (const c of clouds) {
      const span = 140;
      const x = c.userData.u - distance * 0.08 + t * c.userData.speed * 0.3;
      c.position.x = ((((x + span / 2) % span) + span) % span) - span / 2;
    }
  }

  return { update, bones: boneMovers };
}

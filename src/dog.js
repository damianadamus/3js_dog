import * as THREE from 'three';
import { toon } from './materials.js';

// A golden retriever pup built from primitives. Faces +X, paws on y = 0.
export function createDog() {
  const fur = toon('#E9B44C');       // golden coat
  const furShade = toon('#D99E35');  // far-side legs
  const furLight = toon('#F8D88E');  // feathering, chest, muzzle
  const furDark = toon('#C98A2C');   // ears
  const black = toon('#1A1A1A');
  const pink = toon('#FF7FC8');
  const blue = toon('#4D7CFE');
  const gold = toon('#FFC900');
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  shine.userData.outlineParameters = { visible: false };

  const root = new THREE.Group();
  const body = new THREE.Group(); // everything that bobs
  root.add(body);

  const mesh = (geo, mat, parent, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.scale.set(...scale);
    m.rotation.set(...rot);
    parent.add(m);
    return m;
  };

  const sphere = new THREE.SphereGeometry(1, 24, 18);

  // Torso — a little longer than a puppy, with a fluffy chest ruff
  mesh(new THREE.CapsuleGeometry(0.44, 0.85, 8, 20), fur, body, [0, 0.97, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
  mesh(sphere, furLight, body, [0.52, 1.0, 0], [0.36, 0.42, 0.38]);
  mesh(sphere, furLight, body, [0.6, 0.78, 0], [0.22, 0.24, 0.26], [0, 0, 0.3]);
  // Belly feathering: soft tufts hanging under the body
  for (const [x, sy] of [[0.25, 0.16], [0, 0.18], [-0.25, 0.15]]) {
    mesh(sphere, furLight, body, [x, 0.6, 0], [0.22, sy, 0.3]);
  }
  // Rump fluff
  mesh(sphere, fur, body, [-0.62, 1.0, 0], [0.36, 0.38, 0.4]);

  // Collar
  const collar = mesh(new THREE.TorusGeometry(0.31, 0.06, 10, 28), blue, body, [0.64, 1.2, 0], [1, 1, 1.12], [0, Math.PI / 2, 0.55]);
  collar.rotation.order = 'YXZ';
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16), gold, body, [0.84, 0.96, 0], [1, 1, 1], [0, 0, Math.PI / 2 - 0.4]);

  // Head — broad skull, longer muzzle
  const head = new THREE.Group();
  head.position.set(0.84, 1.48, 0);
  body.add(head);
  mesh(sphere, fur, head, [0, 0, 0], [0.42, 0.39, 0.4]);
  mesh(sphere, fur, head, [0.36, -0.1, 0], [0.3, 0.19, 0.21]);       // muzzle
  mesh(sphere, furLight, head, [0.4, -0.17, 0], [0.26, 0.12, 0.19]); // lighter chin
  mesh(sphere, black, head, [0.66, -0.06, 0], [0.085, 0.07, 0.095]); // nose
  mesh(sphere, shine, head, [0.7, -0.03, 0.03], [0.02, 0.02, 0.02]);
  for (const s of [-1, 1]) {
    mesh(sphere, black, head, [0.28, 0.1, 0.2 * s], [0.06, 0.07, 0.06]);
    mesh(sphere, shine, head, [0.32, 0.13, 0.215 * s], [0.018, 0.018, 0.018]);
    mesh(sphere, furDark, head, [0.27, 0.19, 0.19 * s], [0.07, 0.025, 0.05], [0, 0, -0.2]); // brows
    mesh(sphere, pink, head, [0.2, -0.1, 0.3 * s], [0.07, 0.045, 0.05]);                   // blush
  }
  const tongue = mesh(sphere, pink, head, [0.46, -0.27, 0], [0.1, 0.05, 0.08]);

  // Ears: long, soft and floppy — pivot near the top of the head
  const ears = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(-0.04, 0.2, 0.34 * s);
    pivot.rotation.x = 0.3 * s;
    head.add(pivot);
    mesh(sphere, furDark, pivot, [-0.03, -0.27, 0.02 * s], [0.2, 0.34, 0.08]);
    mesh(sphere, furDark, pivot, [-0.05, -0.5, 0.02 * s], [0.15, 0.12, 0.07]);
    ears.push({ pivot, side: s });
  }

  // Tail: a feathery plume carried level
  const tail = new THREE.Group();
  tail.position.set(-0.86, 1.12, 0);
  tail.rotation.z = 0.9;
  body.add(tail);
  mesh(new THREE.CapsuleGeometry(0.08, 0.5, 6, 12), fur, tail, [0, 0.3, 0]);
  for (const [y, r] of [[0.18, 0.13], [0.36, 0.15], [0.54, 0.13], [0.7, 0.09]]) {
    mesh(sphere, furLight, tail, [0.09, y, 0], [r * 0.8, r, r * 0.6]); // feathering on the underside
  }

  // Legs (FL, FR, BL, BR) — pivot at the hip, swing around Z
  const legs = [];
  const legDefs = [
    [0.46, 0.22, 0], [0.46, -0.22, Math.PI],
    [-0.5, 0.22, Math.PI], [-0.5, -0.22, 0],
  ];
  for (const [x, z, phase] of legDefs) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.8, z);
    root.add(pivot);
    const front = x > 0;
    mesh(new THREE.CapsuleGeometry(0.12, 0.42, 6, 12), z > 0 ? fur : furShade, pivot, [0, -0.34, 0]);
    // Feathering on the back of the legs
    mesh(sphere, furLight, pivot, [front ? -0.1 : -0.12, front ? -0.3 : -0.18, 0], [0.09, front ? 0.18 : 0.22, 0.1]);
    mesh(sphere, furLight, pivot, [0.05, -0.68, 0], [0.17, 0.1, 0.14]);
    legs.push({ pivot, phase });
  }

  // Blob shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32),
    new THREE.MeshBasicMaterial({ color: '#111', transparent: true, opacity: 0.16, depthWrite: false }),
  );
  shadow.material.userData.outlineParameters = { visible: false };
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  shadow.scale.set(1.15, 0.5, 1);
  root.add(shadow);

  root.traverse((o) => { if (o.isMesh) o.userData.isDog = true; });

  // ───────── Animation state ─────────
  const state = {
    phase: 0, walk: 0, jump: 0, jumpV: 0, wag: 0, excited: 0,
    look: new THREE.Vector2(), lookSmooth: new THREE.Vector2(),
  };

  function bark() {
    if (state.jump <= 0.001) state.jumpV = 4.2;
    state.excited = 1;
  }

  function update(dt, t, speed) {
    // speed: world units per second the dog is walking
    const targetWalk = THREE.MathUtils.clamp(Math.abs(speed) / 4, 0, 1);
    state.walk = THREE.MathUtils.damp(state.walk, targetWalk, 6, dt);
    state.phase += dt * (4 + Math.abs(speed) * 2.2);
    state.excited = Math.max(0, state.excited - dt * 0.6);

    // Jump physics
    if (state.jumpV !== 0 || state.jump > 0) {
      state.jumpV -= 14 * dt;
      state.jump += state.jumpV * dt;
      if (state.jump <= 0) { state.jump = 0; state.jumpV = 0; }
    }
    const airborne = state.jump > 0.01;

    const w = state.walk;
    const step = Math.sin(state.phase);
    const breathe = Math.sin(t * 2.4) * 0.015 * (1 - w);

    body.position.y = Math.abs(Math.cos(state.phase)) * 0.07 * w + breathe + state.jump;
    body.rotation.z = Math.sin(state.phase * 2) * 0.03 * w + (airborne ? state.jumpV * 0.03 : 0);

    for (const leg of legs) {
      const swing = airborne ? (leg.pivot.position.x > 0 ? -0.6 : 0.6) : Math.sin(state.phase + leg.phase) * 0.65 * w;
      leg.pivot.rotation.z = THREE.MathUtils.damp(leg.pivot.rotation.z, swing, 18, dt);
      leg.pivot.position.y = 0.8 + state.jump;
    }

    // Tail wags faster when walking / excited
    const wagSpeed = 10 + w * 8 + state.excited * 14;
    state.wag += dt * wagSpeed;
    tail.rotation.x = Math.sin(state.wag) * (0.45 + state.excited * 0.35);
    tail.rotation.z = 0.9 + w * 0.15;

    // Ears flop with the step
    for (const e of ears) {
      e.pivot.rotation.x = e.side * (0.35 + Math.abs(step) * 0.25 * w + (airborne ? 0.6 : 0) + state.excited * 0.15);
      e.pivot.rotation.z = -0.1 - Math.cos(state.phase) * 0.15 * w;
    }

    // Head follows the pointer
    state.lookSmooth.lerp(state.look, 1 - Math.exp(-dt * 5));
    head.rotation.y = -state.lookSmooth.x * 0.6;
    head.rotation.z = state.lookSmooth.y * 0.35 + Math.sin(t * 1.3) * 0.04 * (1 - w);
    head.rotation.x = Math.sin(t * 0.7) * 0.08 * (1 - w) - state.lookSmooth.x * 0.12;
    head.position.y = 1.48 + Math.sin(state.phase * 2) * 0.02 * w;

    tongue.scale.y = 0.05 * (0.6 + w * 0.6 + state.excited) * (1 + Math.sin(t * 12) * 0.15);
    tongue.visible = w > 0.15 || state.excited > 0.05;

    shadow.scale.set(1.15 - state.jump * 0.25, 0.5 - state.jump * 0.1, 1);
    shadow.material.opacity = 0.16 - state.jump * 0.05;
  }

  return { root, head, update, bark, state };
}

// Happy "paradise rave" loop, synthesised live with Web Audio — no audio files needed.
const BPM = 128;
const STEP = 60 / BPM / 4; // one 16th note, in seconds

// vi – IV – I – V in A major: F#m, D, A, E (MIDI note numbers)
const CHORDS = [
  { pad: [57, 61, 66], bass: 42 },
  { pad: [57, 62, 66], bass: 38 },
  { pad: [57, 61, 64], bass: 45 },
  { pad: [56, 59, 64], bass: 40 },
];
const ARP = [0, 1, 2, 3, 2, 1, 0, 2, 1, 2, 3, 2, 0, 1, 2, 3];
// Little bell hook for the second half of each 8-bar phrase: [step, chord-tone index]
const HOOK = [[0, 3], [3, 2], [6, 3], [10, 1], [12, 2]];
const INTRO_STEPS = 4 * 16; // 4 bars of pads + arp before the beat drops

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

export function createMusic() {
  let ctx, master, pump, arpBus, noise, timer;
  let step = 0, nextTime = 0, playing = false;

  function init() {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(comp);

    // Pads and bass duck on every kick — the classic "pumping" rave feel
    pump = ctx.createGain();
    pump.connect(master);

    // Arp goes dry + into a dotted-8th echo
    arpBus = ctx.createGain();
    arpBus.connect(master);
    const echo = ctx.createDelay(1);
    echo.delayTime.value = STEP * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2500;
    arpBus.connect(echo);
    echo.connect(tone).connect(feedback).connect(echo);
    tone.connect(master);

    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function env(gain, t, peak, attack, decay) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function voice(type, freq, t, decay, peak, attack, dest, { detune = 0, cutoff = 0 } = {}) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = ctx.createGain();
    env(g, t, peak, attack, decay);
    let node = o;
    if (cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      node = o.connect(f);
    }
    node.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  function noiseHit(t, type, freq, peak, decay) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    env(g, t, peak, 0.002, decay);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random() * 0.5);
    s.stop(t + decay + 0.05);
  }

  function kick(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    env(g, t, 0.9, 0.003, 0.35);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.4);
    pump.gain.setValueAtTime(0.25, t);
    pump.gain.setTargetAtTime(1, t + 0.03, 0.09);
  }

  function schedule(n, t) {
    const bar = Math.floor(n / 16) % 8;
    const s = n % 16;
    const chord = CHORDS[bar % 4];
    const beat = n >= INTRO_STEPS;

    if (s === 0) {
      for (const note of chord.pad) for (const detune of [-14, 0, 14]) {
        voice('sawtooth', mtof(note), t, STEP * 16, 0.055, 0.08, pump, { detune, cutoff: 1800 });
      }
    }

    const tones = [...chord.pad.map((m) => m + 12), chord.pad[0] + 24];
    voice('square', mtof(tones[ARP[s]]), t, STEP * 0.9, 0.07, 0.003, arpBus, { cutoff: 3200 });

    if (bar >= 4) {
      const hit = HOOK.find(([at]) => at === s);
      if (hit) voice('triangle', mtof(tones[hit[1]] + 12), t, STEP * 3, 0.18, 0.005, arpBus);
    }

    if (!beat) return;
    if (s % 4 === 0) kick(t);
    if (s % 4 === 2) {
      noiseHit(t, 'highpass', 8000, 0.16, 0.06);
      voice('sawtooth', mtof(chord.bass), t, STEP * 1.6, 0.32, 0.005, pump, { cutoff: 650 });
    }
    if (s === 4 || s === 12) noiseHit(t, 'bandpass', 1500, 0.3, 0.14);
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.12) {
      schedule(step++, nextTime);
      nextTime += STEP;
    }
  }

  function start() {
    try {
      if (!ctx) init();
      ctx.resume();
      const now = ctx.currentTime;
      step = 0;
      nextTime = now + 0.05;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(1, now + 1.5);
      clearInterval(timer);
      timer = setInterval(tick, 25);
      playing = true;
    } catch { playing = false; /* audio unavailable */ }
  }

  function stop() {
    playing = false;
    clearInterval(timer);
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.4);
  }

  // Background tabs throttle timers — pause cleanly instead of stuttering
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !playing) return;
    if (document.hidden) { clearInterval(timer); ctx.suspend(); }
    else { ctx.resume(); nextTime = ctx.currentTime + 0.05; timer = setInterval(tick, 25); }
  });

  return {
    toggle() { playing ? stop() : start(); return playing; },
    get playing() { return playing; },
  };
}

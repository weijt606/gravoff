/* 合成音效（WebAudio，无外部资源） */
(function (root) {
  'use strict';
  const CF = root.CF = root.CF || {};

  class Sfx {
    constructor() { this.ctx = null; this.muted = false; }
    init() {
      // iOS 切后台回来是 'interrupted'，不只是 'suspended'；resume 只在用户手势里才生效
      if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      // 老版本 iOS：要在手势里真正播一段声音才算解锁
      const blip = ctx.createBufferSource(); blip.buffer = ctx.createBuffer(1, 1, 22050); blip.connect(ctx.destination); blip.start(0);
      this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(ctx.destination);
      // 音效总线：比背景音乐低一些（音乐直接接 master，见 music.js）
      this.fx = ctx.createGain(); this.fx.gain.value = 0.55;
      this.fx.connect(this.master);
      const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = noise;
      const loop = (filterType, freq, q) => {
        const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
        const g = ctx.createGain(); g.gain.value = 0;
        src.connect(f); f.connect(g); g.connect(this.fx); src.start();
        return { f, g };
      };
      // 电机啸叫
      this.motor = ctx.createOscillator(); this.motor.type = 'sawtooth';
      this.motor2 = ctx.createOscillator(); this.motor2.type = 'triangle';
      const mf = ctx.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 900;
      this.motorG = ctx.createGain(); this.motorG.gain.value = 0;
      this.motor.connect(mf); this.motor2.connect(mf); mf.connect(this.motorG); this.motorG.connect(this.fx);
      this.motor.start(); this.motor2.start();
      // 风扇 / 喷流 / 风噪
      this.fan = loop('bandpass', 700, 0.8);
      this.fanTone = ctx.createOscillator(); this.fanTone.type = 'sine';
      this.fanToneG = ctx.createGain(); this.fanToneG.gain.value = 0;
      this.fanTone.connect(this.fanToneG); this.fanToneG.connect(this.fx); this.fanTone.start();
      this.jet = loop('lowpass', 1800, 0.5);
      this.wind = loop('highpass', 1200, 0.3);
    }
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
    update(car, set, inp, active) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime, k = 0.06;
      const sp = Math.hypot(car.vx, car.vy);
      const on = active ? 1 : 0;
      this.motor.frequency.setTargetAtTime(55 + sp * 5.5, t, k);
      this.motor2.frequency.setTargetAtTime(110 + sp * 11, t, k);
      this.motorG.gain.setTargetAtTime(on * (0.025 + Math.abs(inp.throttle) * 0.035 + Math.min(sp, 60) / 60 * 0.02), t, k);
      const fp = car.energy > 0 ? (set.fanF + set.fanR) / 2 : 0;
      this.fan.g.gain.setTargetAtTime(on * fp * 0.12, t, k);
      this.fan.f.frequency.setTargetAtTime(500 + fp * 900, t, k);
      this.fanTone.frequency.setTargetAtTime(160 + fp * 260, t, k);
      this.fanToneG.gain.setTargetAtTime(on * fp * 0.018, t, k);
      this.jet.g.gain.setTargetAtTime(on * (car.liftOut * 0.34 + car.brakeOut * 0.2), t, 0.03);
      this.wind.g.gain.setTargetAtTime(on * Math.min(0.12, sp / 600), t, k);
    }
    blip(freq, dur, type, vol) {
      if (!this.ctx) return;
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g); g.connect(this.fx); o.start(); o.stop(ctx.currentTime + dur);
    }
    chime() { this.blip(880, 0.25, 'sine', 0.12); setTimeout(() => this.blip(1320, 0.35, 'sine', 0.1), 90); }
    ring() { this.blip(1560, 0.18, 'triangle', 0.08); }
    thump(power) {
      if (!this.ctx) return;
      const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      const g = ctx.createGain(); g.gain.setValueAtTime(Math.min(0.6, power), ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      src.connect(f); f.connect(g); g.connect(this.fx); src.start(); src.stop(ctx.currentTime + 0.4);
    }
  }
  CF.Sfx = Sfx;
})(typeof window !== 'undefined' ? window : globalThis);

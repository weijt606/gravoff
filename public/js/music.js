/* 8-bit 背景音乐（原创）
 * 两首曲子都是为本游戏原创编写的旋律，用 WebAudio 实时合成，不使用任何采样或外部音频文件，因此不存在版权问题；
 * 和弦进行与音阶属于通用音乐素材。
 *
 * 两首曲子用两套不同的 8-bit 音色（inst）：
 *   loop「Inverted Deck」—— 8-bit 主机风格：50% 方波主旋律 + 重颤音、25% 脉冲 16 分音符琶音、三角波奔马贝斯、
 *                          切分低沉底鼓、八分音符镲；5-bit 量化 + 低通，偏暗、偏厚
 *   kick「Kickflip Over Five」—— 掌机风格：12.5% 细脉冲主旋律 + 回声、32 分音符三音快速琶音、25% 脉冲八度贝斯、
 *                          四拍底鼓 + 拍手军鼓 + 16 分音符镲和开镲；3-bit 量化，偏亮、偏颗粒
 *
 * 跟游戏节奏联动（setIntensity）：
 *   0 = 地面行驶：鼓 + 贝斯
 *   1 = 爬上半环 / 过起飞线：加入主旋律
 *   2 = 倒挂 / 腾空 / 降落：再加入快速琶音，紧张感最强
 *
 * 记谱：每小节 16 个十六分音符，用空格分隔；音名如 E5、F#4；"." 延续上一个音；"-" 休止
 */
(function (root) {
  'use strict';
  const CF = root.CF = root.CF || {};

  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const midi = (n) => { const m = /^([A-G]#?)(\d)$/.exec(n); return 12 * (+m[2] + 1) + NOTE[m[1]]; };
  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function parse(line) {
    const tok = line.trim().split(/\s+/), out = [];
    tok.forEach((t, i) => {
      if (t === '.' || t === '-') { if (t === '.' && out.length && out[out.length - 1].end === i) out[out.length - 1].end = i + 1; return; }
      out.push({ step: i, end: i + 1, midi: midi(t) });
    });
    return out.map((n) => ({ step: n.step, len: n.end - n.step, midi: n.midi }));
  }

  // ── 曲目 ─────────────────────────────────────────────
  const TRACKS = {
    // 倒立半环「Inverted Deck」：A 小调，132 BPM，切分底鼓，紧张向上
    loop: {
      bpm: 132,
      chords: [['A2', 0, 3, 7], ['F2', 0, 4, 7], ['C3', 0, 4, 7], ['G2', 0, 4, 7], ['A2', 0, 3, 7], ['F2', 0, 4, 7], ['G2', 0, 4, 7], ['E2', 0, 4, 7]],
      lead: [
        'E5 . . C5 . A4 . . B4 C5 D5 . E5 . . .',
        'F5 . E5 . C5 . . A4 . . C5 . F5 E5 D5 .',
        'E5 . . G5 . E5 . C5 . D5 . E5 . . G4 .',
        'B4 . D5 . G5 . F5 E5 D5 . B4 . . . - -',
        'A5 . . E5 . C5 . . A4 . C5 E5 A5 . G5 .',
        'F5 . . C5 . A4 . F4 . . A4 C5 F5 . E5 .',
        'D5 . G5 . D5 . B4 . G4 . B4 D5 G5 . F5 .',
        'E5 . G#5 . B5 . . . G#5 . E5 . D5 . B4 .',
      ],
      kick: [0, 3, 6, 10], snare: [4, 12], ghost: [15], hatAccent: [2, 6, 10, 14], hats: [0, 2, 4, 6, 8, 10, 12, 14], openHat: [],
      bass: [0, 0, 12, 0, 0, 12, 0, 12, 0, 0, 12, 0, 7, 12, 7, 12],
      inst: { lead: 'p50', leadVol: 0.1, vib: 0.02, echo: false, arp: 'p25', arpNotes: 2, arpVol: 0.04, bass: 'triangle', bassVol: 0.26,
        bits: 32, lowpass: 3200, kickHz: [130, 38], snareHz: 1500, clap: false, level: 1 },
      fill: 'E5 D5 C5 B4 A4 G#4 A4 B4 C5 D5 E5 F5 G#5 . B5 .',   // 每 8 小节最后一小节换成上行音阶
    },
    // 飞越车阵「Kickflip Over Five」：D 大调，152 BPM，四拍底鼓，明快冲刺
    kick: {
      bpm: 152,
      chords: [['D3', 0, 4, 7], ['B2', 0, 3, 7], ['G2', 0, 4, 7], ['A2', 0, 4, 7], ['D3', 0, 4, 7], ['B2', 0, 3, 7], ['G2', 0, 4, 7], ['A2', 0, 4, 7]],
      lead: [
        'D5 . F#5 . A5 . F#5 . D5 . E5 F#5 . . A4 .',
        'B4 . D5 . F#5 . . E5 D5 . B4 . D5 . E5 .',
        'G5 . F#5 . E5 . D5 . B4 . D5 . G5 . . .',
        'A5 . . G5 F#5 . E5 . C#5 . E5 . A4 . . .',
        'F#5 A5 F#5 D5 . A4 . D5 F#5 . A5 . B5 . A5 .',
        'F#5 . D5 . B4 . D5 F#5 . E5 . D5 . C#5 B4 .',
        'G5 . B5 . D6 . B5 G5 A5 . C#6 . E6 . . .',
        'D6 . A5 . F#5 . D5 . - . D5 - D5 . . .',
      ],
      kick: [0, 4, 8, 12], snare: [4, 12], ghost: [7, 14], hatAccent: [2, 6, 10, 14], hats: [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15], openHat: [2, 6, 10, 14],
      bass: [0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 7, 12, 5, 7],
      inst: { lead: 'p12', leadVol: 0.13, vib: 0.008, echo: true, arp: 'p12', arpNotes: 3, arpVol: 0.05, bass: 'p25', bassVol: 0.15,
        bits: 8, lowpass: 0, kickHz: [190, 55], snareHz: 2600, clap: true, level: 2.2 },
      fill: 'A4 B4 C#5 D5 E5 F#5 G5 A5 B5 C#6 D6 . E6 . F#6 .',
    },
  };
  for (const k in TRACKS) { TRACKS[k].leadNotes = TRACKS[k].lead.map(parse); TRACKS[k].fillNotes = parse(TRACKS[k].fill); }

  const LEVEL = { music: 0.34, duck: 0.08 };

  class Music {
    constructor(sfx) { this.sfx = sfx; this.track = null; this.timer = null; this.intensity = 0; }

    pulse(duty) {
      const ctx = this.sfx.ctx, n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
      return ctx.createPeriodicWave(re, im, { disableNormalization: false });
    }
    // 4-bit 量化：把波形压成 16 级台阶，得到芯片音乐的颗粒感
    crusher(levels) {
      const ctx = this.sfx.ctx, ws = ctx.createWaveShaper(), n = 1024, curve = new Float32Array(n);
      levels = levels || 16;
      for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.round(x * levels / 2) / (levels / 2); }
      ws.curve = curve; ws.oversample = 'none';
      return ws;
    }
    ensure() {
      const s = this.sfx;
      if (!s.ctx) return false;
      if (this.out) return true;
      this.out = s.ctx.createGain(); this.out.gain.value = 0;
      this.out.connect(s.master);
      this.waves = { p12: this.pulse(0.125), p25: this.pulse(0.25), p50: this.pulse(0.5) };
      return true;
    }
    // 每首曲子一条独立的总线：分层 → 量化失真（位数随曲目）→ 可选低通 → 输出
    buildBus(inst) {
      const ctx = this.sfx.ctx;
      if (this.bus) { const old = this.bus; setTimeout(() => old.post.disconnect(), 600); }
      const crush = this.crusher(inst.bits), pre = ctx.createGain(), post = ctx.createGain();
      // 先放大到接近满幅再量化（否则小信号会被量化成静音），量化后再缩回原来的电平
      pre.gain.value = 5; post.gain.value = 0.2 * (inst.level || 1);   // level：两首曲子的响度平衡
      pre.connect(crush);
      let tail = crush;
      if (inst.lowpass) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = inst.lowpass; lp.Q.value = 0.6; crush.connect(lp); tail = lp; }
      tail.connect(post); post.connect(this.out);
      const layer = {};
      for (const k of ['drums', 'bass', 'lead', 'arp']) { const g = ctx.createGain(); g.gain.value = 0; g.connect(pre); layer[k] = g; }
      this.bus = { pre, post, layer };
      this.layer = layer;
    }

    play(name) {
      if (!this.ensure()) return;
      if (this.track === TRACKS[name] && this.timer) { this.duck(false); return; }
      this.stop(true);
      this.track = TRACKS[name];
      this.buildBus(this.track.inst);
      const ctx = this.sfx.ctx;
      this.stepDur = 60 / this.track.bpm / 4;
      this.step = 0;
      this.next = ctx.currentTime + 0.08;
      this.out.gain.cancelScheduledValues(ctx.currentTime);
      this.out.gain.setTargetAtTime(LEVEL.music, ctx.currentTime, 0.25);
      this.setIntensity(0, true);
      this.timer = setInterval(() => this.schedule(), 25);
      this.schedule();
    }
    stop(now) {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      if (this.out && this.sfx.ctx) this.out.gain.setTargetAtTime(0, this.sfx.ctx.currentTime, now ? 0.02 : 0.3);
      this.track = null;
    }
    duck(on) {
      if (this.out && this.sfx.ctx && this.timer) this.out.gain.setTargetAtTime(on ? LEVEL.duck : LEVEL.music, this.sfx.ctx.currentTime, 0.15);
    }
    // 0 = 鼓 + 贝斯；1 = + 主旋律；2 = + 快速琶音
    setIntensity(level, force) {
      if (!this.layer || (level === this.intensity && !force)) return;
      this.intensity = level;
      const t = this.sfx.ctx.currentTime, tc = 0.12;
      this.layer.drums.gain.setTargetAtTime(1, t, tc);
      this.layer.bass.gain.setTargetAtTime(1, t, tc);
      this.layer.lead.gain.setTargetAtTime(level >= 1 ? 1 : 0, t, tc);
      this.layer.arp.gain.setTargetAtTime(level >= 2 ? 1 : 0, t, tc);
    }
    // 结算小段：成功上行琶音，失败下行
    jingle(win) {
      if (!this.ensure()) return;
      this.stop(true);
      if (!this.layer) this.buildBus(TRACKS.kick.inst);
      const ctx = this.sfx.ctx, t0 = ctx.currentTime + 0.05, d = 0.09;
      this.out.gain.cancelScheduledValues(ctx.currentTime);
      this.out.gain.setValueAtTime(LEVEL.music, ctx.currentTime);
      this.layer.lead.gain.setValueAtTime(1, ctx.currentTime); this.layer.bass.gain.setValueAtTime(1, ctx.currentTime);
      const seq = win ? ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'] : ['G4', 'F#4', 'F4', 'E4', 'D#4', 'D4'];
      seq.forEach((n, i) => this.note(this.layer.lead, freq(midi(n)), t0 + i * d, i === seq.length - 1 ? 0.5 : d * 0.9, this.waves.p25, 0.14));
      this.note(this.layer.bass, freq(midi(win ? 'C3' : 'D3')), t0 + seq.length * d, 0.5, 'triangle', 0.22);
      this.out.gain.setTargetAtTime(0, t0 + seq.length * d + 0.6, 0.2);
    }

    schedule() {
      const ctx = this.sfx.ctx, T = this.track;
      if (!T) return;
      if (this.next < ctx.currentTime - 0.5) this.next = ctx.currentTime + 0.05;   // 标签页挂起后恢复：跳过积压
      const sd = this.stepDur, L = this.layer, W = this.waves, I = T.inst;
      while (this.next < ctx.currentTime + 0.15) {
        const bars = T.chords.length, barIdx = Math.floor(this.step / 16), bar = barIdx % bars, st = this.step % 16, t = this.next;
        const ch = T.chords[bar], root = midi(ch[0]);
        const isFill = (barIdx % (bars * 2)) === bars * 2 - 1;   // 每两轮的最后一小节：上行音阶过门
        // 主旋律（+ 可选回声）
        for (const n of (isFill ? T.fillNotes : T.leadNotes[bar])) if (n.step === st) {
          const dur = n.len * sd * 0.9, f = freq(n.midi);
          this.note(L.lead, f, t, dur, W[I.lead], I.leadVol, n.len >= 3 ? I.vib : 0);
          if (I.echo) this.note(L.lead, f, t + sd * 3, Math.min(dur, sd * 2), W.p12, 0.035);
        }
        // 和弦琶音：每个十六分音符里快速弹 2 / 3 个和弦音
        for (let k = 0; k < I.arpNotes; k++) {
          const m = root + 12 + ch[1 + ((st * I.arpNotes + k) % 3)] + (st % 4 === 3 ? 12 : 0);
          this.note(L.arp, freq(m), t + k * sd / I.arpNotes, sd / I.arpNotes * 0.85, W[I.arp], I.arpVol);
        }
        // 贝斯
        const b = T.bass[st];
        if (b >= 0) this.note(L.bass, freq(root + b), t, sd * 0.6, I.bass === 'triangle' ? 'triangle' : W[I.bass], st % 4 === 0 ? I.bassVol : I.bassVol * 0.75);
        // 鼓
        if (T.kick.includes(st)) this.kick(t, I.kickHz);
        if (T.snare.includes(st)) this.snare(t, 0.13, I);
        if (T.ghost.includes(st)) this.snare(t, 0.045, I);
        if (T.hats.includes(st)) this.hat(t, T.hatAccent.includes(st) ? 0.06 : 0.025, 0.03);
        if (T.openHat.includes(st)) this.hat(t, 0.04, 0.12);
        if (isFill && st >= 12) this.snare(t, 0.07, I);   // 过门加鼓
        this.step++;
        this.next += sd;
      }
    }

    note(dest, f, t, dur, wave, vol, vibrato) {
      const ctx = this.sfx.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      if (typeof wave === 'string') o.type = wave; else o.setPeriodicWave(wave);
      o.frequency.setValueAtTime(f, t);
      if (vibrato) {   // 长音颤音：延迟一点后按 vibrato（比例）摆动
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * vibrato, t + 0.18);
        lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.02);
      }
      // 芯片风格包络：起音快，略衰减到持续音量，结尾快速关闭
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.004);
      g.gain.linearRampToValueAtTime(vol * 0.7, t + Math.min(0.08, dur * 0.5));
      g.gain.setValueAtTime(vol * 0.7, t + Math.max(0.01, dur - 0.015));
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.02);
    }
    kick(t, hz) {
      const ctx = this.sfx.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.setPeriodicWave(this.waves.p50);
      o.frequency.setValueAtTime(hz[0], t); o.frequency.exponentialRampToValueAtTime(hz[1], t + 0.08);
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      o.connect(g); g.connect(this.layer.drums); o.start(t); o.stop(t + 0.12);
    }
    snare(t, vol, I) {
      const ctx = this.sfx.ctx;
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = this.sfx.noise; f.type = 'bandpass'; f.frequency.value = I.snareHz; f.Q.value = 0.7;
      if (I.clap) {   // 拍手：三次很短的噪声脉冲
        for (let k = 0; k < 3; k++) { g.gain.setValueAtTime(vol, t + k * 0.012); g.gain.exponentialRampToValueAtTime(vol * 0.2, t + k * 0.012 + 0.01); }
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      } else {
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      }
      src.connect(f); f.connect(g); g.connect(this.layer.drums);
      src.start(t, Math.random() * 1.5); src.stop(t + 0.14);
      const o = ctx.createOscillator(), og = ctx.createGain();   // 军鼓的"音高"成分
      o.type = 'square'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.05);
      og.gain.setValueAtTime(vol * 0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.connect(og); og.connect(this.layer.drums); o.start(t); o.stop(t + 0.07);
    }
    hat(t, vol, len) {
      const ctx = this.sfx.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = this.sfx.noise; f.type = 'highpass'; f.frequency.value = 8000;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f); f.connect(g); g.connect(this.layer.drums);
      src.start(t, Math.random() * 1.5); src.stop(t + len + 0.005);
    }
  }

  CF.Music = Music;
  CF.MusicTracks = TRACKS;
})(window);

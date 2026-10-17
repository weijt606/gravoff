/* 渲染：黄昏试验场背景、钢结构半环、停放车辆、车辆、喷流、粒子 */
(function (root) {
  'use strict';
  const CF = root.CF = root.CF || {};

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, v + amt));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  }
  function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const pathOf = (pts, dx) => {
    const p = new Path2D();
    pts.forEach((q, i) => i ? p.lineTo(q[0] + (dx || 0), q[1]) : p.moveTo(q[0] + (dx || 0), q[1]));
    p.closePath();
    return p;
  };

  class Renderer {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.W = 0; this.H = 0; this.dpr = 1; this.S = 28;
      this.frame = { top: 0, bottom: 0, viewW: 40 };
      const r = rand(7);
      this.stars = Array.from({ length: 90 }, () => ({ x: r(), y: r() * 0.3, s: r() * 1.2 + 0.3, t: r() * 6 }));
      // 远景：试验场的测试台架、储罐、水塔、厂房（剪影，循环平铺）
      const rs = rand(42);
      this.sites = [];
      for (let x = 0; x < 1; x += 0.05 + rs() * 0.07) {
        const k = rs();
        this.sites.push({ x, type: k < 0.25 ? 'stand' : k < 0.45 ? 'tank' : k < 0.6 ? 'water' : 'shed', h: 0.6 + rs() * 0.6, w: 0.6 + rs() * 0.8 });
      }
      this.trees = Array.from({ length: 140 }, () => ({ x: rs(), h: 0.4 + rs() * 0.8 }));
    }

    setCourse(course) {
      this.course = course;
      for (const pc of course.pieces) {
        if (pc.polyPath) continue;
        pc.polyPath = pathOf(pc.poly);
        const road = new Path2D();
        pc.road.forEach((p, i) => i ? road.lineTo(p[0], p[1]) : road.moveTo(p[0], p[1]));
        pc.roadPath = road;
        if (pc.kind === 'parked') {
          const M = CF.CarModels[pc.model];
          pc.glassPath = pathOf(M.glass, pc.ox);
          continue;
        }
        pc.lights = [];
        let acc = 0;
        for (let i = 1; i < pc.road.length; i++) {
          const a = pc.road[i - 1], b = pc.road[i];
          const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
          const nx = -dy / len, ny = dx / len;
          acc += len;
          if (acc > 6) { acc = 0; pc.lights.push([b[0] - nx * 0.5, b[1] - ny * 0.5, pc.lights.length % 4 === 0]); }
        }
        if (pc.kind === 'ramp') this.buildTruss(pc);
      }
      // 试验场照明灯塔
      this.lamps = course.mode === 'loop' ? [-300, -205, -70, 48, 120] : [-60, 52, course.pad.x0 - 5];
    }

    // 半环的钢桁架：从路面向外框放射的支撑 + 交叉斜撑 + 顶部纵梁
    buildTruss(pc) {
      const R = pc.R, top = pc.top, th = pc.th, xR = R + th + 1.5, yT = top + th + 3.2;
      const p = new Path2D();
      const struts = [];
      for (let d = -90; d <= 90; d += 12) {
        const a = d * Math.PI / 180, ax = Math.cos(a) * R, ay = R + Math.sin(a) * R;
        const ox = Math.cos(a), oy = Math.sin(a);
        // 沿径向延伸到外框
        const tx = ox > 1e-3 ? (xR - ax) / ox : Infinity, ty = oy > 1e-3 ? (yT - ay) / oy : Infinity;
        const t = Math.min(tx, ty, 30);
        const bx = ax + ox * (th + 0.2), by = ay + oy * (th + 0.2);
        struts.push([bx, by, ax + ox * t, ay + oy * t]);
      }
      for (const s of struts) { p.moveTo(s[0], s[1]); p.lineTo(s[2], s[3]); }
      for (let i = 1; i < struts.length; i++) {
        const a = struts[i - 1], b = struts[i];
        p.moveTo(a[0], a[1]); p.lineTo(b[2], b[3]);
        p.moveTo(b[0], b[1]); p.lineTo(a[2], a[3]);
      }
      // 外框
      p.moveTo(xR, -0.2); p.lineTo(xR, yT); p.lineTo(pc.ex + 4, yT);
      // 倒置路面上方的纵向桁架梁
      const y0 = top + th + 0.1;
      p.moveTo(pc.ex + 3, y0); p.lineTo(0, y0);
      for (let x = pc.ex + 4, i = 0; x < 0; x += 2.6, i++) {
        p.moveTo(x, y0); p.lineTo(x + 1.3, yT); p.lineTo(x + 2.6, y0);
      }
      pc.truss = p;
      pc.frame = { xR, yT };
    }

    resize() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.W = window.innerWidth; this.H = window.innerHeight;
      this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
      this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
      // 视野：横向约 40 m、纵向约 20 m（zoom = 1 时）。触屏时画面中心放在上方面板和下方按钮之间
      const F = this.frame;
      this.cy = F.top + (this.H - F.top - F.bottom) / 2;
      this.baseS = Math.min(this.W / F.viewW, (this.H - (F.top + F.bottom) / 2) / 20.5);
    }
    // 触屏布局：top / bottom 是被面板和按钮挡住的高度（px），viewW 是横向视野（m）
    setFrame(f) { this.frame = f || { top: 0, bottom: 0, viewW: 40 }; this.resize(); }

    worldTf(cam) {
      const S = this.S, d = this.dpr;
      this.ctx.setTransform(d * S, 0, 0, -d * S, d * (this.W / 2 - cam.x * S), d * (this.cy + cam.y * S));
    }
    toScreen(cam, x, y) { return [this.W / 2 + (x - cam.x) * this.S, this.cy - (y - cam.y) * this.S]; }

    draw(st) {
      const { cam, car, time } = st;
      const ctx = this.ctx, W = this.W, H = this.H;
      this.S = this.baseS * cam.zoom;
      const S = this.S;
      const sx = cam.shake ? (Math.random() - 0.5) * cam.shake : 0, sy = cam.shake ? (Math.random() - 0.5) * cam.shake : 0;
      const cv = { x: cam.x + sx / S, y: cam.y + sy / S };
      this.camv = cv;

      this.drawSky(cv, time);
      this.view = { vx0: cv.x - W / 2 / S - 6, vx1: cv.x + W / 2 / S + 6, vy0: cv.y - (H - this.cy) / S - 6, vy1: cv.y + this.cy / S + 6 };

      this.worldTf(cv);
      this.drawLamps(time, false);
      this.drawTrack(time);
      this.drawPad(st);
      if (st.course.takeoff != null) this.drawTakeoff(st.course.takeoff, time);
      if (st.aid) this.drawLandingAid(car, time);
      this.drawParticles(st.particles, false);
      this.drawCar(car, st);
      this.worldTf(cv);
      this.drawParticles(st.particles, true);
      this.drawLamps(time, true);

      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // 速度线
      const sp = Math.hypot(car.vx, car.vy);
      if (sp > 26) {
        const a = Math.min(0.3, (sp - 26) / 80), dir = Math.atan2(-car.vy, car.vx);
        ctx.strokeStyle = `rgba(255,235,215,${a})`; ctx.lineWidth = 1;
        const r = rand((time * 30) | 0);
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const px = r() * W, py = r() * H, L = 40 + r() * 120;
          ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(dir) * L, py - Math.sin(dir) * L);
        }
        ctx.stroke();
      }
      // 暗角
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    // 黄昏的德州平原试验场
    drawSky(cam, time) {
      const ctx = this.ctx, W = this.W, H = this.H, S = this.S;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const horizon = this.toScreen(cam, 0, 0)[1] - Math.max(0, (this.toScreen(cam, 0, 0)[1] - H * 0.72)) * 0.85;
      const hz = Math.max(H * 0.2, Math.min(H * 1.05, horizon - 6));
      const gr = ctx.createLinearGradient(0, 0, 0, hz);
      gr.addColorStop(0, '#0c1430'); gr.addColorStop(0.45, '#2c2c52'); gr.addColorStop(0.78, '#a4596a'); gr.addColorStop(0.93, '#e9905c'); gr.addColorStop(1, '#f6c27e');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 1);
      for (const s of this.stars) {
        const x = ((s.x * W * 1.4 - cam.x * 0.4) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2;
        const tw = 0.5 + 0.5 * Math.sin(time * 1.5 + s.t);
        ctx.fillStyle = `rgba(230,235,255,${(0.15 + tw * 0.35) * (1 - s.y * 2.5)})`;
        ctx.fillRect(x, s.y * hz, s.s, s.s);
      }
      // 低垂的太阳
      const sxp = W * 0.72 - cam.x * S * 0.01, syp = hz - H * 0.05;
      const sg = ctx.createRadialGradient(sxp, syp, 0, sxp, syp, H * 0.5);
      sg.addColorStop(0, 'rgba(255,214,150,0.55)'); sg.addColorStop(0.2, 'rgba(255,170,110,0.18)'); sg.addColorStop(1, 'rgba(255,150,100,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, hz + 2);
      ctx.fillStyle = '#ffe6b8'; ctx.beginPath(); ctx.arc(sxp, syp, Math.min(W, H) * 0.03, 0, Math.PI * 2); ctx.fill();

      // 远处树线
      const span1 = W * 2.4, off1 = ((cam.x * S * 0.05) % span1 + span1) % span1;
      ctx.fillStyle = '#2a2337';
      ctx.beginPath(); ctx.moveTo(0, hz + 1);
      for (let rep = 0; rep < 2; rep++) for (const t of this.trees) {
        const x = t.x * span1 + rep * span1 - off1;
        if (x < -20 || x > W + 20) continue;
        ctx.lineTo(x, hz - t.h * 7); ctx.lineTo(x + 6, hz - t.h * 4);
      }
      ctx.lineTo(W, hz + 1); ctx.closePath(); ctx.fill();
      ctx.fillRect(0, hz - 2, W, 3);
      // 试验场建筑剪影
      const span2 = W * 2.0, off2 = ((cam.x * S * 0.12) % span2 + span2) % span2, u = Math.min(W, H) * 0.06;
      ctx.fillStyle = '#1d1828'; ctx.strokeStyle = '#1d1828'; ctx.lineWidth = 1.5;
      for (let rep = 0; rep < 2; rep++) for (const s of this.sites) {
        const x = s.x * span2 + rep * span2 - off2;
        if (x < -u * 3 || x > W + u * 3) continue;
        const h = s.h * u, w = s.w * u;
        if (s.type === 'stand') {
          const sh = h * 3.2;
          ctx.fillRect(x, hz - sh, w * 0.5, sh);
          ctx.fillRect(x - w * 0.3, hz - sh, w * 1.1, h * 0.25);
          ctx.beginPath();
          for (let y = hz; y > hz - sh; y -= w * 0.5) { ctx.moveTo(x + w * 0.5, y); ctx.lineTo(x + w * 1.1, y - w * 0.5); ctx.lineTo(x + w * 1.1, y); }
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,60,60,0.8)'; ctx.fillRect(x + w * 0.2, hz - sh - 3, 2, 2); ctx.fillStyle = '#1d1828';
        } else if (s.type === 'tank') {
          ctx.beginPath(); ctx.arc(x, hz - h * 0.9, h * 0.75, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(x - h * 0.6, hz - h * 0.4, h * 0.15, h * 0.4); ctx.fillRect(x + h * 0.45, hz - h * 0.4, h * 0.15, h * 0.4);
        } else if (s.type === 'water') {
          ctx.fillRect(x - 1, hz - h * 2.2, 2, h * 2.2);
          ctx.beginPath(); ctx.ellipse(x, hz - h * 2.3, h * 0.5, h * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillRect(x, hz - h * 0.7, w * 1.6, h * 0.7);
        }
      }
      // 地面（远处）
      const gg = ctx.createLinearGradient(0, hz, 0, H);
      gg.addColorStop(0, '#3a2c2c'); gg.addColorStop(1, '#141015');
      ctx.fillStyle = gg; ctx.fillRect(0, hz, W, H - hz);
    }

    inView(p) { const v = this.view; return !(p.x1 < v.vx0 || p.x0 > v.vx1 || p.y1 < v.vy0 || p.y0 > v.vy1); }

    drawTrack(time) {
      const ctx = this.ctx;
      for (const pc of this.course.pieces) {
        if (!this.inView(pc)) continue;
        if (pc.kind === 'parked') this.drawParked(pc);
        else if (pc.kind === 'ramp') this.drawRamp(pc, time);
        else this.drawTarmac(pc);
      }
    }

    // 沥青跑道：路面 + 路肩线 + 下面的土层
    drawTarmac(pc) {
      const ctx = this.ctx, v = this.view;
      const x0 = Math.max(pc.x0, v.vx0), x1 = Math.min(pc.x1, v.vx1);
      if (x1 <= x0) return;
      const y0 = Math.max(-260, v.vy0);
      const gr = ctx.createLinearGradient(0, 0, 0, -6);
      gr.addColorStop(0, '#2c2a30'); gr.addColorStop(1, '#151217');
      ctx.fillStyle = gr; ctx.fillRect(x0, y0, x1 - x0, -y0);
      ctx.fillStyle = '#3d3c43'; ctx.fillRect(x0, -0.45, x1 - x0, 0.45);
      ctx.fillStyle = '#5a5960'; ctx.fillRect(x0, -0.06, x1 - x0, 0.06);
      // 路面虚线（侧视透视下的标线）
      ctx.fillStyle = 'rgba(240,240,230,0.55)';
      for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) ctx.fillRect(x, -0.3, 3, 0.07);
      if (pc.cliff) this.drawCliff(pc.x1);
    }

    // 悬崖：跑道尽头的断崖 + 下方深谷 + 边缘警示
    drawCliff(cx) {
      const ctx = this.ctx, v = this.view;
      if (cx > v.vx1 + 2 || cx < v.vx0 - 40) return;
      const bottom = Math.min(-2, v.vy0);
      const g = ctx.createLinearGradient(0, 0, 0, -30);
      g.addColorStop(0, '#1a1418'); g.addColorStop(1, '#030205');
      ctx.fillStyle = g; ctx.fillRect(cx, bottom, Math.max(0, v.vx1 - cx) + 4, -bottom + 0.02);
      // 崖壁（参差的岩石边）
      ctx.fillStyle = '#2a2125';
      ctx.beginPath(); ctx.moveTo(cx, 0.01);
      for (let y = 0, i = 0; y > bottom; y -= 1.6, i++) ctx.lineTo(cx + (i % 2 ? 0.9 : 0.25) + (i % 3) * 0.3, y - 0.8);
      ctx.lineTo(cx, bottom); ctx.closePath(); ctx.fill();
      // 边缘：黄黑警示 + 红色警示灯
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#111' : '#f2c230'; ctx.fillRect(cx - 3 + i * 0.5, 0, 0.5, 0.1); }
      ctx.fillStyle = '#2a2d33'; ctx.fillRect(cx - 0.35, 0, 0.1, 1.2);
      const p = 0.5 + 0.5 * Math.sin(performance.now() / 180);
      const gl = ctx.createRadialGradient(cx - 0.3, 1.3, 0, cx - 0.3, 1.3, 1.4);
      gl.addColorStop(0, `rgba(255,60,60,${0.4 + p * 0.5})`); gl.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = gl; ctx.fillRect(cx - 1.7, -0.1, 2.8, 2.8);
    }

    drawRamp(pc, time) {
      const ctx = this.ctx;
      // 半环下方的地面
      this.drawTarmac({ x0: -2, x1: pc.frame.xR + 0.5 });
      // 桁架
      ctx.lineJoin = 'round';
      ctx.save();
      ctx.beginPath(); ctx.rect(-50, 0, 120, 80); ctx.clip();
      ctx.strokeStyle = '#4a4f5c'; ctx.lineWidth = 0.32; ctx.stroke(pc.truss);
      ctx.strokeStyle = 'rgba(255,190,140,0.18)'; ctx.lineWidth = 0.08; ctx.stroke(pc.truss);
      ctx.restore();
      // 外框立柱底座
      ctx.fillStyle = '#2b2e36'; ctx.fillRect(pc.frame.xR - 1, -0.2, 2, 1.2);
      // 路面板（只画多边形内侧的一条带子）
      ctx.save();
      ctx.clip(pc.polyPath);
      ctx.strokeStyle = '#5d636e'; ctx.lineWidth = pc.th * 2; ctx.stroke(pc.roadPath);
      ctx.strokeStyle = '#7d848f'; ctx.lineWidth = 0.9; ctx.stroke(pc.roadPath);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,200,150,0.25)'; ctx.lineWidth = 0.5; ctx.stroke(pc.roadPath);
      ctx.strokeStyle = '#e8ecf2'; ctx.lineWidth = 0.1; ctx.stroke(pc.roadPath);
      // 尽头警示条纹
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? '#111' : '#f2c230';
        ctx.fillRect(pc.ex + i * 0.4, pc.ey + 0.05, 0.4, pc.cap - pc.ey - 0.1);
      }
      const v = this.view;
      for (const L of pc.lights) {
        if (L[0] < v.vx0 || L[0] > v.vx1 || L[1] < v.vy0 || L[1] > v.vy1) continue;
        ctx.fillStyle = L[2] ? '#ff5a4d' : '#9fe3ff';
        ctx.globalAlpha = 0.65 + 0.35 * Math.sin(time * 3 + L[0] * 0.3);
        ctx.fillRect(L[0] - 0.1, L[1] - 0.1, 0.2, 0.2);
      }
      ctx.globalAlpha = 1;
    }

    // 停放车辆（通用车型剪影，无任何标志）
    drawParked(pc) {
      const ctx = this.ctx, M = CF.CarModels[pc.model], ox = pc.ox;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.ellipse(ox + M.len / 2, 0.02, M.len / 2 + 0.3, 0.14, 0, 0, Math.PI * 2); ctx.fill();
      if (pc.model === 'truck') {   // 牵引车底盘
        ctx.fillStyle = '#1a1c21'; ctx.fillRect(ox, 0.5, 3.1, 0.75);
        ctx.fillStyle = '#2a2d33'; ctx.fillRect(ox + 0.3, 1.25, 1.6, 0.15);
      }
      const gr = ctx.createLinearGradient(0, pc.y1, 0, 0.2);
      if (M.flat) {   // 拉丝不锈钢：硬朗的分层反光
        gr.addColorStop(0, '#e2e5e9'); gr.addColorStop(0.45, '#b8bcc2'); gr.addColorStop(0.46, '#8d9299'); gr.addColorStop(1, '#5b5f66');
      } else {
        gr.addColorStop(0, shade(pc.paint, 35)); gr.addColorStop(0.55, pc.paint); gr.addColorStop(1, shade(pc.paint, -70));
      }
      ctx.fillStyle = gr; ctx.fill(pc.polyPath);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.04; ctx.stroke(pc.polyPath);
      // 夕阳在车顶的反光
      ctx.save(); ctx.clip(pc.polyPath);
      ctx.fillStyle = 'rgba(255,190,130,0.18)'; ctx.fillRect(ox, pc.y1 - 0.12, M.len, 0.12);
      ctx.restore();
      const gg = ctx.createLinearGradient(0, pc.y1, 0, pc.y1 - 0.6);
      gg.addColorStop(0, '#2a3140'); gg.addColorStop(1, '#07090d');
      ctx.fillStyle = gg; ctx.fill(pc.glassPath);
      ctx.strokeStyle = 'rgba(255,220,190,0.25)'; ctx.lineWidth = 0.03; ctx.stroke(pc.glassPath);
      for (const wx of M.wheels) {
        const x = ox + wx, r = M.wr;
        ctx.fillStyle = '#0d0d0f'; ctx.beginPath(); ctx.arc(x, r, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = M.flat ? '#3a3d42' : '#5d646d'; ctx.beginPath(); ctx.arc(x, r, r * 0.58, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1b1d22'; ctx.beginPath(); ctx.arc(x, r, r * 0.18, 0, Math.PI * 2); ctx.fill();
      }
      // 贯穿式灯带（前白后红）
      const front = M.body.reduce((a, p) => (p[0] > a[0] ? p : a));
      ctx.fillStyle = '#f4f8ff'; ctx.fillRect(ox + front[0] - 0.1, front[1] - 0.05, 0.1, 0.07);
      ctx.fillStyle = '#e0202c'; ctx.fillRect(ox + 0.01, (pc.model === 'truck' ? 1.0 : M.body[1][1]) - 0.12, 0.07, 0.1);
    }

    // 停机坪 / 着陆区
    drawPad(st) {
      const ctx = this.ctx, f = st.course.finish, t = st.time;
      if (f.x1 < this.view.vx0 || f.x0 > this.view.vx1) return;
      const w = f.x1 - f.x0, mid = (f.x0 + f.x1) / 2, pulse = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.fillStyle = 'rgba(80,255,170,0.10)'; ctx.fillRect(f.x0, 0, w, 0.08);
      ctx.fillStyle = '#2f3a36'; ctx.fillRect(f.x0, -0.05, w, 0.13);
      // 黄黑边 + 中线
      for (const x of [f.x0, f.x1 - 1.6]) for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#111' : '#f2c230'; ctx.fillRect(x + i * 0.4, 0.0, 0.4, 0.08);
      }
      // 目标点：地面靶环 + 闪烁信标 + 竖直激光线（降落时瞄准它）
      const tx = f.tx != null ? f.tx : mid;
      for (const [r, c] of [[3, 'rgba(255,90,99,0.9)'], [1.6, 'rgba(255,255,255,0.95)'], [0.5, 'rgba(255,90,99,1)']]) {
        ctx.fillStyle = c; ctx.fillRect(tx - r, 0.0, r * 2, 0.09);
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createLinearGradient(0, 0, 0, 12);
      lg.addColorStop(0, `rgba(255,90,99,${0.35 + pulse * 0.25})`); lg.addColorStop(1, 'rgba(255,90,99,0)');
      ctx.fillStyle = lg; ctx.fillRect(tx - 0.06, 0.1, 0.12, 12);
      const bg2 = ctx.createRadialGradient(tx, 0.2, 0, tx, 0.2, 1.8);
      bg2.addColorStop(0, `rgba(255,120,120,${0.5 + pulse * 0.4})`); bg2.addColorStop(1, 'rgba(255,90,99,0)');
      ctx.fillStyle = bg2; ctx.fillRect(tx - 1.8, -1.6, 3.6, 3.6);
      ctx.restore();
      // 端灯
      for (const x of [f.x0 + 0.3, f.x1 - 0.3]) {
        const gl = ctx.createRadialGradient(x, 0.4, 0, x, 0.4, 1.5);
        gl.addColorStop(0, `rgba(80,255,170,${0.5 + pulse * 0.5})`); gl.addColorStop(1, 'rgba(80,255,170,0)');
        ctx.fillStyle = gl; ctx.fillRect(x - 1.5, -1.1, 3, 3);
      }
      const bg = ctx.createLinearGradient(0, 0, 0, 14);
      bg.addColorStop(0, 'rgba(80,255,170,0.10)'); bg.addColorStop(1, 'rgba(80,255,170,0)');
      ctx.fillStyle = bg; ctx.fillRect(f.x0, 0.1, w, 14);
      const [sx, sy] = this.toScreen(this.camv, mid, 4.5);
      ctx.save(); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.font = `800 ${Math.max(12, 1.3 * this.S)}px "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = 'center'; ctx.fillStyle = `rgba(160,255,210,${0.45 + pulse * 0.3})`;
      ctx.fillText('LANDING PAD', sx, sy);
      ctx.font = `700 ${Math.max(10, 0.7 * this.S)}px "Helvetica Neue", Arial, sans-serif`;
      ctx.fillStyle = `rgba(255,140,140,${0.6 + pulse * 0.3})`;
      const [tsx, tsy] = this.toScreen(this.camv, tx, -1.4);   // 画在地面下方，不会被车和喷流挡住
      ctx.fillText('▲ TARGET', tsx, tsy);
      ctx.restore();
      this.worldTf(this.camv);
    }

    // 起飞标线（场景二）
    drawTakeoff(x, time) {
      const ctx = this.ctx;
      if (x < this.view.vx0 - 4 || x > this.view.vx1 + 4) return;
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#111' : '#f2c230'; ctx.fillRect(x + i * 0.5 - 1.5, 0, 0.5, 0.08); }
      ctx.fillStyle = '#2a2d33'; ctx.fillRect(x - 0.06, 0, 0.12, 3.2);
      ctx.fillStyle = '#f2c230'; ctx.fillRect(x - 1.1, 2.6, 2.2, 0.8);
      const p = 0.5 + 0.5 * Math.sin(time * 6);
      ctx.fillStyle = `rgba(255,210,80,${0.4 + p * 0.5})`; ctx.fillRect(x - 0.15, 3.45, 0.3, 0.2);
      const [sx, sy] = this.toScreen(this.camv, x, 3.0);
      ctx.save(); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.font = `800 ${Math.max(9, 0.45 * this.S)}px "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#111';
      ctx.fillText('TAKEOFF', sx, sy);
      ctx.restore();
      this.worldTf(this.camv);
    }

    // 降落辅助：车正下方的投影 + 竖直虚线，颜色表示下降速度（绿 < 4 / 黄 < 8 / 红）
    drawLandingAid(car, time) {
      if (car.nW > 0 || car.y < 2) return;
      const ctx = this.ctx, sink = -car.vy;
      const overCliff = this.course.cliff != null && car.x > this.course.cliff;
      const col = overCliff ? '255,60,60' : sink < 4 ? '80,255,170' : sink < 8 ? '255,210,122' : '255,107,115';
      const a = Math.min(1, (car.y - 2) / 4);
      ctx.strokeStyle = `rgba(${col},${0.45 * a})`; ctx.lineWidth = 0.06;
      ctx.setLineDash([0.4, 0.4]); ctx.lineDashOffset = -time * 2;
      ctx.beginPath(); ctx.moveTo(car.x, car.y - 0.6); ctx.lineTo(car.x, 0.1); ctx.stroke();
      ctx.setLineDash([]);
      const w = 1.6 + Math.min(3, car.y * 0.08);
      ctx.fillStyle = `rgba(${col},${0.35 * a})`;
      ctx.beginPath(); ctx.ellipse(car.x, 0.06, w, 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${0.8 * a})`; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.moveTo(car.x - w, 0.06); ctx.lineTo(car.x - w + 0.5, 0.06); ctx.moveTo(car.x + w - 0.5, 0.06); ctx.lineTo(car.x + w, 0.06); ctx.stroke();
    }

    // 照明灯塔：背景里画灯杆，前景（加色）画光锥
    drawLamps(time, glow) {
      const ctx = this.ctx, v = this.view;
      for (const x of this.lamps) {
        if (x < v.vx0 - 20 || x > v.vx1 + 20) continue;
        const h = 14;
        if (!glow) {
          ctx.fillStyle = '#23252c'; ctx.fillRect(x - 0.12, 0, 0.24, h);
          ctx.fillRect(x - 1.2, h, 2.4, 0.5);
          ctx.fillStyle = '#fff6dc';
          for (let i = 0; i < 4; i++) ctx.fillRect(x - 1.05 + i * 0.6, h - 0.05, 0.4, 0.15);
        } else {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createLinearGradient(0, h, 0, 0);
          g.addColorStop(0, 'rgba(255,240,200,0.16)'); g.addColorStop(1, 'rgba(255,240,200,0.02)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(x - 1.2, h); ctx.lineTo(x + 1.2, h); ctx.lineTo(x + 8, 0); ctx.lineTo(x - 8, 0); ctx.closePath(); ctx.fill();
          const hg = ctx.createRadialGradient(x, h, 0, x, h, 3);
          hg.addColorStop(0, 'rgba(255,245,215,0.5)'); hg.addColorStop(1, 'rgba(255,245,215,0)');
          ctx.fillStyle = hg; ctx.fillRect(x - 3, h - 3, 6, 6);
          ctx.restore();
        }
      }
    }

    drawParticles(ps, additive) {
      const ctx = this.ctx;
      ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
      for (const p of ps) {
        if (p.add !== additive) continue;
        const k = p.life / p.max;
        ctx.globalAlpha = Math.max(0, k) * p.alpha;
        ctx.fillStyle = p.col;
        const r = p.size * (p.grow ? 1 + (1 - k) * p.grow : 1);
        if (p.streak) {
          ctx.strokeStyle = p.col; ctx.lineWidth = r;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    drawCar(car, st) {
      const ctx = this.ctx, G = CF.CarGeo, t = st.time;
      const sy = CF.rollScale(car);
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.a);

      ctx.save(); ctx.scale(1, sy);
      ctx.globalCompositeOperation = 'lighter';
      // 车头灯光束
      const beam = ctx.createLinearGradient(2.2, 0, 14, 0);
      beam.addColorStop(0, 'rgba(230,240,255,0.2)'); beam.addColorStop(1, 'rgba(230,240,255,0)');
      ctx.fillStyle = beam;
      ctx.beginPath(); ctx.moveTo(2.2, 0.0); ctx.lineTo(14, 1.4); ctx.lineTo(14, -2.2); ctx.closePath(); ctx.fill();
      // 风扇吸附辉光（车底）
      for (let i = 0; i < 2; i++) {
        const pw = st.set.fanF, e = car.fanEff[i] * pw;
        if (pw <= 0.01 || car.energy <= 0) continue;
        const fx = G.FANS[i].lx;
        const gl = ctx.createRadialGradient(fx, -0.62, 0, fx, -0.62, 1.4);
        gl.addColorStop(0, `rgba(90,210,255,${0.12 + e * 0.55})`); gl.addColorStop(1, 'rgba(90,210,255,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.ellipse(fx, -0.62, 1.4, 0.45 + e * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      }
      // 推进器喷流
      if (car.liftOut > 0.02) for (const J of G.JETS) this.plume(J.lx, J.ly, 0, -1, car.liftOut * (2.4 + Math.random() * 0.6), 0.34);
      if (car.brakeOut > 0.02) {
        const dir = Math.sign(car.vx * Math.cos(car.a)) || 1;
        this.plume(dir * 2.3, 0.05, dir, 0, car.brakeOut * (1.8 + Math.random() * 0.5), 0.22);
      }
      ctx.restore();

      ctx.scale(1, sy);
      this.carBody(car, st);
      ctx.restore();
    }

    plume(x, y, dx, dy, len, w) {
      const ctx = this.ctx;
      const ex = x + dx * len, ey = y + dy * len;
      const nx = -dy, ny = dx;
      const gr = ctx.createLinearGradient(x, y, ex, ey);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.25, 'rgba(200,230,255,0.7)');
      gr.addColorStop(1, 'rgba(150,190,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x + nx * w * 0.5, y + ny * w * 0.5);
      ctx.quadraticCurveTo(x + dx * len * 0.4 + nx * w, y + dy * len * 0.4 + ny * w, ex, ey);
      ctx.quadraticCurveTo(x + dx * len * 0.4 - nx * w, y + dy * len * 0.4 - ny * w, x - nx * w * 0.5, y - ny * w * 0.5);
      ctx.closePath(); ctx.fill();
      const core = ctx.createRadialGradient(x, y, 0, x, y, w * 1.6);
      core.addColorStop(0, 'rgba(255,255,255,0.9)'); core.addColorStop(1, 'rgba(200,230,255,0)');
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, w * 1.6, 0, Math.PI * 2); ctx.fill();
    }

    // 低矮楔形超跑：珍珠白车身、黑色座舱、贯穿式红色尾灯带、外露扩散器里的风扇
    carBody(car, st) {
      const ctx = this.ctx, C = CF.CarCfg, G = CF.CarGeo;
      const body = this._body || (this._body = (() => {
        const p = new Path2D();
        p.moveTo(-2.25, -0.42);
        p.lineTo(-2.33, -0.02);
        p.lineTo(-2.28, 0.24);
        p.lineTo(-1.45, 0.34);
        p.quadraticCurveTo(-0.95, 0.63, -0.3, 0.66);
        p.quadraticCurveTo(0.35, 0.66, 0.85, 0.44);
        p.lineTo(1.7, 0.18);
        p.quadraticCurveTo(2.28, 0.06, 2.36, -0.14);
        p.lineTo(2.27, -0.38);
        p.quadraticCurveTo(2.12, -0.5, 1.85, -0.5);
        p.lineTo(-1.95, -0.5);
        p.quadraticCurveTo(-2.2, -0.5, -2.25, -0.42);
        p.closePath();
        return p;
      })());
      const glass = this._glass || (this._glass = (() => {
        const p = new Path2D();
        p.moveTo(-1.2, 0.37);
        p.quadraticCurveTo(-0.85, 0.6, -0.3, 0.62);
        p.quadraticCurveTo(0.3, 0.62, 0.74, 0.44);
        p.lineTo(0.55, 0.34);
        p.closePath();
        return p;
      })());

      ctx.fillStyle = '#060608';
      for (const W of G.WHEELS) { ctx.beginPath(); ctx.arc(W.lx, -0.3, 0.45, 0, Math.PI * 2); ctx.fill(); }
      const paint = ctx.createLinearGradient(0, 0.7, 0, -0.5);
      paint.addColorStop(0, '#ffffff'); paint.addColorStop(0.3, '#e6e9ee'); paint.addColorStop(0.75, '#a9b0ba'); paint.addColorStop(1, '#5d636d');
      ctx.fillStyle = paint; ctx.fill(body);
      ctx.save(); ctx.clip(body);
      ctx.fillStyle = '#060608';
      for (const W of G.WHEELS) { ctx.beginPath(); ctx.arc(W.lx, -0.33, 0.44, 0, Math.PI * 2); ctx.fill(); }
      // 外露的扩散器（车底黑色）
      ctx.fillStyle = '#15171c'; ctx.fillRect(-2.4, -0.5, 4.8, 0.2);
      ctx.fillStyle = 'rgba(255,190,130,0.22)'; ctx.fillRect(-2.4, 0.45, 4.8, 0.3);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.03; ctx.stroke(body);
      // 腰线
      ctx.strokeStyle = 'rgba(120,128,140,0.6)'; ctx.lineWidth = 0.03;
      ctx.beginPath(); ctx.moveTo(-2.15, 0.08); ctx.quadraticCurveTo(0, 0.04, 2.15, -0.06); ctx.stroke();
      // 座舱玻璃
      const gg = ctx.createLinearGradient(0, 0.62, 0, 0.34);
      gg.addColorStop(0, '#2b3442'); gg.addColorStop(1, '#05070a');
      ctx.fillStyle = gg; ctx.fill(glass);
      ctx.strokeStyle = 'rgba(255,220,190,0.3)'; ctx.lineWidth = 0.03;
      ctx.beginPath(); ctx.moveTo(-0.7, 0.57); ctx.quadraticCurveTo(-0.2, 0.62, 0.35, 0.55); ctx.stroke();
      // 前灯带
      ctx.fillStyle = '#f2f8ff';
      ctx.beginPath(); ctx.moveTo(1.95, 0.1); ctx.lineTo(2.3, -0.02); ctx.lineTo(2.28, -0.07); ctx.lineTo(1.93, 0.05); ctx.fill();
      // 贯穿式尾灯带
      ctx.fillStyle = '#ff1f2e'; ctx.fillRect(-2.34, 0.06, 0.1, 0.14);
      ctx.fillRect(-2.3, 0.17, 0.9, 0.035);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const tl = ctx.createRadialGradient(-2.3, 0.13, 0, -2.3, 0.13, 0.8);
      tl.addColorStop(0, 'rgba(255,40,50,0.65)'); tl.addColorStop(1, 'rgba(255,40,50,0)');
      ctx.fillStyle = tl; ctx.beginPath(); ctx.arc(-2.3, 0.13, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // 车底风扇
      for (let i = 0; i < 2; i++) {
        const F = G.FANS[i], pw = st.set.fanF;
        const cx = F.lx, cy = -0.36, r = 0.17;
        ctx.fillStyle = '#0b0d12'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        const on = pw > 0.01 && car.energy > 0;
        ctx.strokeStyle = on ? `rgba(110,220,255,${0.5 + pw * 0.5})` : '#3a404c';
        ctx.lineWidth = 0.035;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        for (let b = 0; b < 5; b++) {
          const an = car.fanSpin[i] + b * Math.PI * 2 / 5;
          ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * r * 0.85, cy + Math.sin(an) * r * 0.85);
        }
        ctx.stroke();
        if (on) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
          gl.addColorStop(0, `rgba(90,210,255,${0.25 + pw * 0.4})`); gl.addColorStop(1, 'rgba(90,210,255,0)');
          ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }

      // 车轮（空气动力轮毂）
      for (let i = 0; i < 2; i++) {
        const W = G.WHEELS[i], wh = car.wheels[i];
        const wx = W.lx, wy = W.ly - wh.ext;
        ctx.fillStyle = '#141416'; ctx.beginPath(); ctx.arc(wx, wy, C.wheelR, 0, Math.PI * 2); ctx.fill();
        const rim = ctx.createRadialGradient(wx, wy, 0, wx, wy, 0.25);
        rim.addColorStop(0, '#9aa2ad'); rim.addColorStop(1, '#30353d');
        ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(wx, wy, 0.24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#15171b'; ctx.lineWidth = 0.04;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const an = -wh.spin + k * Math.PI * 2 / 5;
          ctx.moveTo(wx + Math.cos(an) * 0.06, wy + Math.sin(an) * 0.06);
          ctx.lineTo(wx + Math.cos(an) * 0.22, wy + Math.sin(an) * 0.22);
        }
        ctx.stroke();
      }
      // 推进器喷口
      ctx.fillStyle = '#2b2f38';
      for (const J of G.JETS) ctx.fillRect(J.lx - 0.1, J.ly - 0.04, 0.2, 0.08);
    }
  }

  CF.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);

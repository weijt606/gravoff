/* 车辆物理
 * 刚体（单位质量）+ 两个弹簧悬挂车轮 + 车身碰撞点。
 * 四个装置：
 *   ①② 前 / 后吸附风扇 —— 车底贴近表面时把车"吸"向表面（可在墙面 / 倒置路面上行驶）
 *   ③④ 前 / 后冷气推进器 —— 沿车身"上"方向推：起飞、悬停、缓降；
 *       空中车底朝上时一按就先横滚把车翻正；空中按 F 做 Kickflip（360° 横滚）
 *   侧向推进器 —— 空中按 G：喷气侧滚（1 s 内绕纵轴转一圈，消耗 6% 能量）
 * 空中姿态由推进器自动保持水平，玩家不需要手动调俯仰。
 * car.m = ±1 表示车身镜像（横滚 180° 后：同样朝前，但车底朝上），二维里用它模拟绕纵轴翻滚。
 */
(function (root) {
  'use strict';
  const CF = root.CF = root.CF || {};
  const g = 9.8;

  const C = {
    I: 1.5,                       // 转动惯量
    wheelR: 0.36, susLen: 0.54,   // 车轮半径；锚点到地面的悬挂最大长度
    kS: 110, cS: 9, kBump: 1500, bumpAt: 0.24,
    mu: 1.2,                      // 轮胎摩擦系数（抓地 = μ × 法向力，风扇吸力会提高抓地）
    drive: 1.3 * g, vmax: 95,     // 全轮驱动加速度 / 理论极速
    brake: 2.4 * g, reverse: 0.7 * g, vrev: 20,   // 刹车上限受轮胎抓地（μ × 法向力）限制：不开风扇约 1.2 g，开满风扇可到 2.4 g
    roll: 0.12,                   // 滚动阻力
    fanMax: 0.72 * g,             // 单个风扇最大吸力（两个合计 1.44 g：倒挂时要开到约 75% 以上才吸得住）
    fanFull: 0.7, fanRange: 3.8,  // 吸力满额距离 / 作用距离
    liftMax: 0.85 * g,            // 单个推进器（两个合计 1.7 g：按住缓慢上升，点按可悬停）
    airBrake: 0.6 * g,            // 空中按 ← ：推进器反推，减小水平速度
    levelK: 14, levelC: 6,        // 空中自动调平

    drag: 0.0015,
    bodyK: 1600, bodyC: 35, bodyMu: 0.45,
    rollTime: 0.5,                // 翻正（180° 横滚）时长
    kickTime: 0.75,               // Kickflip（360° 横滚）时长
    barrelTime: 1.0, barrelCost: 6,   // 喷气侧滚：时长、一次性耗能（%）
    drain: { fan: 3.2, lift: 7.5, brake: 4 }, charge: 7,  // 能量 %/s
  };

  const WHEELS = [{ lx: 1.38, ly: -0.22 }, { lx: -1.38, ly: -0.22 }];
  const FANS = [{ lx: 0.72, ly: -0.5 }, { lx: -0.72, ly: -0.5 }];
  const JETS = [{ lx: 1.92, ly: -0.42 }, { lx: -1.95, ly: -0.4 }];
  const BODY = [
    [2.3, -0.1], [2.15, -0.42], [-2.25, -0.38], [-2.3, 0.0],
    [1.0, -0.5], [0, -0.5], [-1.0, -0.5],
    [-0.35, 0.66], [0.45, 0.6], [-1.3, 0.36], [1.5, 0.22],
  ];

  function createCar(x, y, a, m) {
    return {
      x, y, vx: 0, vy: 0, a: a || 0, w: 0, m: m || 1,
      energy: 100,
      liftOut: 0, brakeOut: 0,
      wheels: WHEELS.map(() => ({ contact: false, ext: C.susLen - C.wheelR, spin: 0, rate: 0, Fn: 0, nx: 0, ny: 1, px: 0, py: 0 })),
      fanEff: [0, 0], fanAct: [0, 0], fanPt: [{ x: 0, y: 0, nx: 0, ny: 1 }, { x: 0, y: 0, nx: 0, ny: 1 }],
      fanSpin: [0, 0],
      fanN: 0, wheelN: 0,
      nW: 0, bodyHit: false, bodyImpact: 0, scrape: 0,
      rollT: 0, rollFrom: 1, kickT: 0, barrelT: 0,
      lastNx: 0, lastNy: 1,
    };
  }

  const Q = { hit: false, gap: 0, nx: 0, ny: 1, px: 0, py: 0 };

  // inp: {throttle -1..1, lift bool, kick bool(边沿触发)}
  // set: {fanF, fanR 0..1, vmax, charge（可选，覆盖回充速度）}
  function step(car, track, inp, set, dt) {
    const c = Math.cos(car.a), s = Math.sin(car.a), m = car.m;
    const ux = -s * m, uy = c * m;           // 车身"上"方向
    let fx = 0, fy = -g, tq = 0;
    const hasE = car.energy > 0;

    function apply(rx, ry, Fx, Fy) { fx += Fx; fy += Fy; tq += rx * Fy - ry * Fx; }

    // ── 车轮 ──
    let nW = 0, wheelN = 0;
    for (let i = 0; i < 2; i++) {
      const W = WHEELS[i], wh = car.wheels[i];
      const lx = W.lx, ly = W.ly * m;
      const rx = c * lx - s * ly, ry = s * lx + c * ly;
      wh.contact = false;
      if (track.query(car.x + rx, car.y + ry, Q) && Q.gap < C.susLen && Q.nx * ux + Q.ny * uy > 0.25) {
        const comp = C.susLen - Q.gap;
        const pvx = car.vx - car.w * ry, pvy = car.vy + car.w * rx;
        const vn = pvx * Q.nx + pvy * Q.ny;
        let Fn = C.kS * comp - C.cS * vn;
        if (comp > C.bumpAt) Fn += C.kBump * (comp - C.bumpAt) - (vn < 0 ? 20 * vn : 0);
        if (Fn < 0) Fn = 0;
        let tx = Q.ny, ty = -Q.nx;
        if (tx * c + ty * s < 0) { tx = -tx; ty = -ty; }
        const vt = pvx * tx + pvy * ty;
        const lim = C.mu * Fn;
        let Ft;
        if (inp.throttle > 0) {
          Ft = Math.min(C.drive * 0.5 * inp.throttle * Math.max(0, 1 - Math.max(0, vt) / (set.vmax || C.vmax)), lim);
        } else if (inp.throttle < 0) {
          if (vt > 0.6) Ft = -Math.min(C.brake * 0.5, lim);
          else Ft = -Math.min(C.reverse * 0.5 * Math.max(0, 1 + vt / C.vrev), lim);
        } else {
          // 滑行：滚动阻力；飞越车阵里风扇吸附还会额外产生"吸附阻力"（按每个轮子分摊的风扇吸力 × fanDrag），
          // 让玩家光靠开大风扇也能控制停车点
          const roll = C.roll + (set.fanDrag || 0) * (car.fanN || 0) * 0.5;
          Ft = -Math.max(-roll, Math.min(roll, vt * 3));
        }
        apply(rx, ry, Q.nx * Fn + tx * Ft, Q.ny * Fn + ty * Ft);
        wh.contact = true; wh.Fn = Fn; wheelN += Fn; wh.nx = Q.nx; wh.ny = Q.ny; wh.px = Q.px; wh.py = Q.py;
        wh.ext = Math.max(0.02, Math.min(C.susLen - C.wheelR, Q.gap - C.wheelR));
        wh.rate = vt / C.wheelR;
        car.lastNx = Q.nx; car.lastNy = Q.ny;
        nW++;
      } else {
        wh.ext += ((C.susLen - C.wheelR) - wh.ext) * Math.min(1, dt * 10);
        wh.rate += ((inp.throttle > 0 ? 60 : 0) - wh.rate) * Math.min(1, dt * 1.5);
      }
      wh.spin += wh.rate * dt;
    }
    car.nW = nW; car.wheelN = wheelN;

    // ── ①② 吸附风扇 ──（升力喷射时风扇自动让位，否则吸力会把车按在表面上起不来）
    const yieldK = Math.max(0, 1 - car.liftOut * 1.6);
    const fanP = [hasE ? set.fanF * yieldK : 0, hasE ? set.fanR * yieldK : 0];
    let fanN = 0;
    for (let i = 0; i < 2; i++) {
      car.fanEff[i] = 0;
      car.fanSpin[i] += fanP[i] * 40 * dt;
      const F0 = FANS[i];
      const lx = F0.lx, ly = F0.ly * m;
      const rx = c * lx - s * ly, ry = s * lx + c * ly;
      const fp = car.fanPt[i];
      let tF = 0;
      // 越过路面尽头的凸角时风扇自动松开，车干净地脱离
      if (fanP[i] > 0 && track.query(car.x + rx, car.y + ry, Q) && Q.gap <= C.fanRange && !Q.edge) {
        const align = Q.nx * ux + Q.ny * uy;
        if (align >= 0.3) {
          const f = Q.gap < C.fanFull ? 1 : 1 - (Q.gap - C.fanFull) / (C.fanRange - C.fanFull);
          const al = Math.min(1, (align - 0.3) / 0.4);
          tF = fanP[i] * C.fanMax * f * al;
          car.fanEff[i] = f * al;
          fp.x = Q.px; fp.y = Q.py; fp.nx = Q.nx; fp.ny = Q.ny; fp.gap = Q.gap;
        }
      }
      // 吸力渐变（约 0.1 s 建立、0.2 s 释放）：瞬间松开会让被压缩的悬挂把车猛地弹开
      car.fanAct[i] += (tF - car.fanAct[i]) * Math.min(1, dt * (tF > car.fanAct[i] ? 12 : 6));
      if (car.fanAct[i] > 1e-3) {
        apply(rx, ry, -fp.nx * car.fanAct[i], -fp.ny * car.fanAct[i]);
        fanN += car.fanAct[i];
      }
    }

    car.fanN = fanN;   // 风扇提供的总吸力（用于 HUD 计算"所需吸力"）

    // ── ③④ 冷气推进器 ──
    // 空中车底朝上时先横滚翻正，翻正前推进器不出力（否则会把车往地上推）
    const flying = nW === 0;
    if (inp.lift && hasE && flying && uy < -0.3 && car.rollT <= 0 && car.kickT <= 0 && car.barrelT <= 0) {
      car.rollT = C.rollTime; car.rollFrom = car.m;
    }
    const liftT = inp.lift && hasE && car.rollT <= 0 && (!flying || uy > 0.2) ? 1 : 0;
    car.liftOut += (liftT - car.liftOut) * Math.min(1, dt * 14);
    if (car.liftOut > 0.001) {
      for (const J of JETS) {
        const rx = c * J.lx - s * J.ly * m, ry = s * J.lx + c * J.ly * m;
        const F = car.liftOut * C.liftMax;
        apply(rx, ry, ux * F, uy * F);
      }
    }
    const brakeT = flying && inp.throttle < 0 && hasE && car.rollT <= 0 && Math.abs(car.vx) > 0.5 ? 1 : 0;
    car.brakeOut += (brakeT - car.brakeOut) * Math.min(1, dt * 12);
    if (car.brakeOut > 0.001) fx -= Math.sign(car.vx) * Math.min(C.airBrake, Math.abs(car.vx) * 4) * car.brakeOut;

    // ── 车身碰撞 ──
    car.bodyHit = false;
    let impact = 0, scrape = 0;
    for (const P of BODY) {
      const lx = P[0], ly = P[1] * m;
      const rx = c * lx - s * ly, ry = s * lx + c * ly;
      if (!track.query(car.x + rx, car.y + ry, Q) || Q.gap > 0.04) continue;
      const pen = 0.04 - Q.gap;
      const pvx = car.vx - car.w * ry, pvy = car.vy + car.w * rx;
      const vn = pvx * Q.nx + pvy * Q.ny;
      let Fn = C.bodyK * pen - C.bodyC * vn;
      if (Fn < 0) Fn = 0;
      const tx = Q.ny, ty = -Q.nx;
      const vt = pvx * tx + pvy * ty;
      const lim = C.bodyMu * Fn;
      const Ff = Math.max(-lim, Math.min(lim, -vt * 30));
      apply(rx, ry, Q.nx * Fn + tx * Ff, Q.ny * Fn + ty * Ff);
      car.bodyHit = true;
      if (-vn > impact) impact = -vn;
      if (Math.abs(vt) > scrape) scrape = Math.abs(vt);
    }
    car.bodyImpact = impact; car.scrape = scrape;

    // ── 空中自动调平（姿态推进器）+ 横滚 ──
    if (flying && !car.bodyHit) {
      const err = car.a - Math.round(car.a / Math.PI) * Math.PI;
      tq += (-err * C.levelK - car.w * C.levelC) * C.I;
    }
    if (inp.kick && flying && car.kickT <= 0 && car.rollT <= 0 && car.barrelT <= 0 && uy > 0.5) car.kickT = C.kickTime;
    if (car.kickT > 0) car.kickT = Math.max(0, car.kickT - dt);
    // 喷气侧滚：侧向推进器一键触发（需要正立、在空中、能量够）
    if (inp.barrel && flying && car.barrelT <= 0 && car.kickT <= 0 && car.rollT <= 0 && uy > 0.5 && car.energy > C.barrelCost) {
      car.barrelT = C.barrelTime; car.energy -= C.barrelCost;
    }
    if (car.barrelT > 0) car.barrelT = Math.max(0, car.barrelT - dt);
    if (car.rollT > 0) {
      const before = car.rollT;
      car.rollT -= dt;
      if (before > C.rollTime / 2 && car.rollT <= C.rollTime / 2) car.m = -car.rollFrom;
      if (car.rollT < 0) car.rollT = 0;
    }

    // ── 空气阻力 / 积分 ──
    const sp = Math.hypot(car.vx, car.vy);
    fx -= C.drag * sp * car.vx; fy -= C.drag * sp * car.vy;
    car.vx += fx * dt; car.vy += fy * dt;
    car.w += tq / C.I * dt;
    car.x += car.vx * dt; car.y += car.vy * dt; car.a += car.w * dt;

    // ── 能量 ──
    // 风扇耗能和功率的平方成正比（开得越大越不划算），只在真正吸住表面时满额耗能，空转时只耗 10%
    const fanUse = (fanP[0] * fanP[0] * (car.fanEff[0] > 0 ? 1 : 0.1) + fanP[1] * fanP[1] * (car.fanEff[1] > 0 ? 1 : 0.1)) * 0.5;
    let drain = fanUse * C.drain.fan + car.liftOut * C.drain.lift + car.brakeOut * C.drain.brake;
    if (nW === 2 && uy > 0.6) drain -= set.charge != null ? set.charge : C.charge;
    car.energy = Math.max(0, Math.min(100, car.energy - drain * dt));
  }

  // 视觉用：横滚时车身纵向缩放
  function rollScale(car) {
    if (car.kickT > 0) return car.m * Math.cos(Math.PI * 2 * (1 - car.kickT / C.kickTime));
    if (car.barrelT > 0) { const p = 1 - car.barrelT / C.barrelTime; return car.m * Math.cos(Math.PI * 2 * (p * p * (3 - 2 * p))); }   // 缓入缓出
    if (car.rollT <= 0) return car.m;
    const p = 1 - car.rollT / C.rollTime;
    return car.rollFrom * Math.cos(Math.PI * p);
  }

  CF.CarCfg = C;
  CF.CarGeo = { WHEELS, FANS, JETS, BODY };
  CF.createCar = createCar;
  CF.stepCar = step;
  CF.rollScale = rollScale;
})(typeof window !== 'undefined' ? window : globalThis);

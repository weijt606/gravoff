/* 赛道构建 + 碰撞查询
 * 世界坐标：米，y 轴向上。
 * 每段赛道都是一个实心多边形（顺时针），边的左法线指向外侧 = 可行驶面。
 * 用"海龟绘图"描述路面：S(长度) 直线，A(半径, 角度) 圆弧（正 = 左转/逆时针）。
 * 两个场景都还原自跑车发布会演示：倒立半环、飞越车阵。
 */
(function (root) {
  'use strict';
  const CF = root.CF = root.CF || {};
  const D2R = Math.PI / 180;
  const BASE = -260;   // 地面类多边形向下封口的高度
  const CELL = 6;      // 空间网格尺寸
  const PAD = 4.5;     // 最大查询半径

  class Turtle {
    constructor(x, y, hDeg) {
      this.x = x; this.y = y; this.h = hDeg * D2R;
      this.pts = [[x, y]];
    }
    S(len) {
      const n = Math.max(1, Math.ceil(len / 2));
      const x0 = this.x, y0 = this.y, c = Math.cos(this.h), s = Math.sin(this.h);
      for (let i = 1; i <= n; i++) this.pts.push([x0 + c * len * i / n, y0 + s * len * i / n]);
      this.x = x0 + c * len; this.y = y0 + s * len;
      return this;
    }
    A(r, deg) {
      const th = deg * D2R, sg = Math.sign(th);
      const cx = this.x - sg * r * Math.sin(this.h), cy = this.y + sg * r * Math.cos(this.h);
      const p0 = Math.atan2(this.y - cy, this.x - cx);
      const n = Math.max(2, Math.ceil(r * Math.abs(th) / 0.7));
      for (let i = 1; i <= n; i++) {
        const p = p0 + th * i / n;
        this.pts.push([cx + r * Math.cos(p), cy + r * Math.sin(p)]);
      }
      const L = this.pts[this.pts.length - 1];
      this.x = L[0]; this.y = L[1]; this.h += th;
      return this;
    }
  }

  function makePiece(poly, road, kind) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of poly) {
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
    return { poly, road, kind, x0, y0, x1, y1 };
  }
  // 路面在上方、向下封口的实体
  function ground(t, kind) {
    const p = t.pts, a = p[0], b = p[p.length - 1];
    return makePiece([[a[0], BASE], ...p, [b[0], BASE]], p, kind || 'ground');
  }

  function buildSegments(pieces) {
    const segs = [];
    for (const pc of pieces) {
      const P = pc.poly, n = P.length;
      for (let i = 0; i < n; i++) {
        const a = P[i], b = P[(i + 1) % n];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        if (len < 1e-6) continue;
        segs.push({ ax: a[0], ay: a[1], dx: dx / len, dy: dy / len, len, nx: -dy / len, ny: dx / len });
      }
    }
    return segs;
  }

  function makeCollider(segs) {
    const map = new Map();
    const key = (i, j) => (i + 30000) * 65536 + (j + 30000);
    for (const s of segs) {
      const bx = s.ax + s.dx * s.len, by = s.ay + s.dy * s.len;
      const i0 = Math.floor((Math.min(s.ax, bx) - PAD) / CELL), i1 = Math.floor((Math.max(s.ax, bx) + PAD) / CELL);
      const j0 = Math.floor((Math.min(s.ay, by) - PAD) / CELL), j1 = Math.floor((Math.max(s.ay, by) + PAD) / CELL);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const k = key(i, j);
        let list = map.get(k);
        if (!list) map.set(k, list = []);
        list.push(s);
      }
    }
    // 查询离点最近的表面。out: {hit, gap(外正内负), nx, ny(外法线), px, py(最近点), edge(最近点是凸角)}
    function query(px, py, out) {
      const list = map.get(key(Math.floor(px / CELL), Math.floor(py / CELL)));
      out.hit = false;
      if (!list) return false;
      let best = Infinity, bs = null, bt = 0;
      for (let k = 0; k < list.length; k++) {
        const s = list[k];
        let t = (px - s.ax) * s.dx + (py - s.ay) * s.dy;
        if (t < 0) t = 0; else if (t > s.len) t = s.len;
        const ex = px - s.ax - s.dx * t, ey = py - s.ay - s.dy * t;
        const d2 = ex * ex + ey * ey;
        if (d2 < best) { best = d2; bs = s; bt = t; }
      }
      if (!bs || best > PAD * PAD) return false;
      const qx = bs.ax + bs.dx * bt, qy = bs.ay + bs.dy * bt;
      const ex = px - qx, ey = py - qy, d = Math.sqrt(best);
      out.hit = true; out.px = qx; out.py = qy; out.edge = false;
      if (ex * bs.nx + ey * bs.ny >= 0) {
        out.gap = d;
        if ((bt <= 0 || bt >= bs.len) && d > 1e-4) { out.nx = ex / d; out.ny = ey / d; out.edge = Math.abs(ex * bs.dx + ey * bs.dy) > d * 0.5; }
        else { out.nx = bs.nx; out.ny = bs.ny; }
      } else {
        out.gap = -d; out.nx = bs.nx; out.ny = bs.ny;
      }
      return true;
    }
    return { query };
  }

  function finalize(c) {
    const segs = buildSegments(c.pieces);
    const col = makeCollider(segs);
    return Object.assign({ startFans: 0, vmax: 40, zoom: 1, startEnergy: 100 }, c, { segs, query: col.query });
  }

  // ── 场景一：倒立半环 ─────────────────────────────────────
  // 跑道尽头是一座巨型钢结构半环：冲上去 → 倒挂在顶部的倒置路面上 → 车底朝上冲出 →
  // 推进器把车翻正 → 悬停 → 降落回跑道上的停机坪
  function buildLoop() {
    const R = 16, TOPY = 2 * R, LC = 32, TH = 1.5;   // LC：倒置路面长度（缩短后吸附段更短、更紧张）
    const pieces = [];
    pieces.push(ground(new Turtle(-700, 0, 0).S(698), 'tarmac'));
    // 倒置路面尽头向上微微翘起：路面逐渐离开车底，吸力随距离平滑减弱，车干净地脱离
    const t = new Turtle(-2, 0, 0).S(2).A(R, 180).S(LC).A(8, -25);
    const ex = t.x, ey = t.y;   // 倒置路面尽头（车从这里车底朝上飞出）
    const capY = Math.max(TOPY + TH, ey + 0.8);
    const ramp = makePiece([[-2, BASE], ...t.pts, [ex, capY], [R + TH, capY], [R + TH, BASE]], t.pts, 'ramp');
    ramp.R = R; ramp.top = TOPY; ramp.ex = ex; ramp.ey = ey; ramp.th = TH; ramp.cap = capY;
    pieces.push(ramp);
    pieces.push(ground(new Turtle(R + TH, 0, 0).S(200), 'tarmac'));
    const pad = { x0: -102, x1: -74, y: 0, tx: -88 };   // tx = 目标点（停机坪中心），离它越近分越高
    return finalize({
      mode: 'loop', pieces, pad, start: { x: -52, y: 0 },
      ramp: { R, top: TOPY, ex, x0: -2, x1: R + TH },
      finish: pad, startFans: 0, vmax: 18, charge: 0, startEnergy: 50,   // 能量很紧：风扇开太大或悬停太久会耗尽
      focus: { x0: -150, x1: R + 20, cx: -17, cy: 15.5, zoom: 0.53 },
      menu: { carX: -24, cx: -5, zoom: 0.72 },   // 开始页背景：车在半环前待机，半环在右侧升起   // 固定的转播机位：起点到半环全收进画面
    });
  }

  // ── 场景二：Kickflip 飞越车阵 ────────────────────────────
  // 停放车辆：通用车型剪影（轿车 / SUV / 皮卡 / 小型车 / 重卡，无任何标志）。局部坐标：x 从车尾 0 起（车头朝右），y 从地面 0 起
  const MODELS = {
    // 车阵里的 5 辆车：纯剪影风格（不画任何标志、徽标或文字），坐标单位 m，x 从车尾到车头，y 从地面往上
    sedan:   { name: 'Sedan', len: 4.72, wr: 0.36, paint: '#b3141c', wheels: [0.95, 3.8],
            // 低矮的溜背轿车：整块玻璃车顶从风挡一直延伸到车尾，短鸭尾
            body: [[0, 0.32], [0.03, 0.82], [0.25, 0.96], [0.7, 1.02], [1.2, 1.18], [1.7, 1.36], [2.2, 1.44], [2.7, 1.43], [3.1, 1.31], [3.45, 1.1], [3.9, 0.99], [4.4, 0.87], [4.65, 0.72], [4.72, 0.55], [4.65, 0.3], [0.1, 0.28]],
            glass: [[0.85, 1.05], [1.3, 1.21], [1.8, 1.37], [2.25, 1.4], [2.7, 1.39], [3.08, 1.28], [3.36, 1.11], [2.2, 1.07]] },
    suv:     { name: 'SUV', len: 4.75, wr: 0.38, paint: '#eef0f2', wheels: [0.95, 3.85],
            // 圆润的跨界 SUV：高车顶，圆弧尾门，短而圆的车头
            body: [[0, 0.32], [0.02, 0.95], [0.12, 1.22], [0.45, 1.45], [1.1, 1.62], [2.0, 1.68], [2.7, 1.62], [3.3, 1.33], [3.65, 1.09], [4.2, 0.98], [4.6, 0.84], [4.75, 0.6], [4.68, 0.3], [0.1, 0.29]],
            glass: [[0.5, 1.4], [1.12, 1.57], [2.0, 1.63], [2.68, 1.57], [3.24, 1.31], [3.3, 1.23], [1.9, 1.2], [0.5, 1.22]] },
    pickup:  { name: 'Pickup', len: 5.68, wr: 0.43, paint: '#a9adb3', wheels: [1.05, 4.65], flat: true,
            // 楔形皮卡：车斗和车顶连成一条直线升到车顶尖，再一条直线降到车头；拉丝不锈钢车身
            body: [[0, 0.35], [0, 1.25], [2.7, 1.92], [5.62, 1.15], [5.68, 0.5], [5.55, 0.3], [0.12, 0.3]],
            glass: [[2.75, 1.84], [4.1, 1.5], [3.6, 1.38], [2.75, 1.55]] },
    compact: { name: 'Compact', len: 4.25, wr: 0.36, paint: '#c8b07a', wheels: [0.85, 3.4],
            // 双门小型车：水滴形车身，车尾斜着收下去，香槟金
            body: [[0, 0.36], [0.04, 0.72], [0.45, 1.05], [1.1, 1.32], [1.9, 1.43], [2.6, 1.39], [3.2, 1.13], [3.7, 0.93], [4.15, 0.78], [4.25, 0.55], [4.18, 0.32], [0.15, 0.3]],
            glass: [[0.62, 1.05], [1.15, 1.28], [1.9, 1.38], [2.55, 1.34], [3.08, 1.12], [1.8, 1.04]] },
    truck:   { name: 'Truck', len: 6.6, wr: 0.5, paint: '#e8eaec', wheels: [0.9, 2.1, 5.6],
            // 流线型牵引车：后面是鞍座底盘，驾驶室从车顶圆滑地斜下到车头
            body: [[0, 0.55], [0, 1.25], [3.0, 1.25], [3.0, 3.7], [3.4, 4.0], [4.8, 3.95], [5.9, 2.9], [6.45, 1.8], [6.6, 1.0], [6.5, 0.5], [0.1, 0.5]],
            glass: [[4.8, 3.86], [5.86, 2.87], [6.08, 2.5], [5.25, 2.45], [4.55, 3.55]] },   // 环绕式大风挡
  };
  const PAD_GAP = +(typeof process !== 'undefined' && process.env && process.env.PAD_GAP) || 20;   // 最后一辆车到停机坪的距离
  function parked(x, model, paint) {
    const M = MODELS[model];
    const poly = M.body.map(([px, py]) => [x + px, py]);
    const pc = makePiece(poly, poly.slice(0, 3), 'parked');
    pc.model = model; pc.paint = paint; pc.ox = x;
    return pc;
  }

  // 5 辆车（轿车 / SUV / 重卡 / 皮卡 / 小型车），助跑约 70 m，车阵后面是停机坪
  function buildKick() {
    const list = ['sedan', 'suv', 'truck', 'pickup', 'compact'];   // 最高的重卡放在中间：越过它之后还有两辆车的距离用来降高度、减速
    const pieces = [];
    const x0 = 70;
    let x = x0;
    const cars = [];
    for (const model of list) {
      const pc = parked(x, model, MODELS[model].paint);
      pieces.push(pc); cars.push(pc);
      x += MODELS[model].len + 0.7;
    }
    const rowEnd = x;
    const PAD_W = 20;   // 停机坪宽度（靠刹车 + 风扇吸附把车停在目标点；目标点在中间，离最后一辆车 30 m）
    const pad = { x0: rowEnd + PAD_GAP, x1: rowEnd + PAD_GAP + PAD_W, y: 0, tx: rowEnd + PAD_GAP + PAD_W / 2 };
    // 停机坪后面就是悬崖：飞过头会掉下去
    const cliff = pad.x1 + 4;
    const runway = ground(new Turtle(-200, 0, 0).S(cliff + 200), 'tarmac');
    runway.cliff = true;
    pieces.unshift(runway);
    return finalize({
      mode: 'kick', carCount: list.length, pieces, cars, pad, start: { x: 24, y: 0 },   // 助跑 18 m：到起飞线约 60 km/h
      // takeoff：起飞线。线之前推进器锁定，只能从这里开始喷气起飞
      row: { x0, x1: rowEnd }, takeoff: x0 - 28, cliff,
      focus: { x0: -50, x1: x0 - 32, cx: 55, cy: 11, zoom: 0.41 },
      menu: { carX: x0 - 28, cx: x0 - 6, zoom: 0.72 },   // 开始页背景：车停在起飞线旁，前方是车阵   // 开局机位：起飞线和整排车同框，车从左侧驶入   // 开局机位：起点、起飞线和车阵同框
      finish: pad, startEnergy: 68, vmax: 30, charge: 0, fanDrag: 0.35,   // 风扇吸附阻力（只在飞越车阵）
      jumpZone: { x0: x0 - 1, x1: rowEnd + 1 },
    });
  }

  CF.buildLoop = buildLoop;
  CF.buildKick = buildKick;
  CF.CarModels = MODELS;
  CF.Turtle = Turtle;
})(typeof window !== 'undefined' ? window : globalThis);

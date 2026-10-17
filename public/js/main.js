/* 主循环：输入、场景流程、计分、粒子、镜头、HUD
 * 两个场景还原发布会演示：
 *   loop —— 倒立半环：吸附风扇让车倒挂行驶 → 车底朝上冲出 → 推进器翻正 → 悬停 → 降落停机坪
 *   kick —— 飞越车阵：平地起飞，空中 Kickflip，越过一排车后平稳落地
 */
(function () {
  'use strict';
  const CF = window.CF;
  const DT = 1 / 480;
  const $ = (id) => document.getElementById(id);

  const BUILD = { loop: () => CF.buildLoop(), kick: () => CF.buildKick() };
  const T = CF.I18N.t;
  const modeName = (m) => T('mode.' + m);
  const HARD_LANDING = 11;   // 触地竖直速度超过这个值（m/s）算硬着陆
  let mode = 'loop', pending = null, ended = false, attempts = 0;
  let course = BUILD.loop();
  const renderer = new CF.Renderer($('game'));
  renderer.resize();
  renderer.setCourse(course);
  const sfx = new CF.Sfx();
  const music = new CF.Music(sfx);   // 原创 8-bit 背景音乐：两个场景各一首
  document.addEventListener('visibilitychange', () => {
    if (!sfx.ctx) return;
    if (document.hidden) sfx.ctx.suspend(); else sfx.ctx.resume();
  });
  const set = { fanF: 0, fanR: 0, vmax: 22, charge: null };

  let state = 'menu';
  let car, raceTime = 0, particles = [], air, run = null, stuckT = 0, hintText = '';
  const cam = { x: 0, y: 4, zoom: 1, shake: 0 };
  const input = { throttle: 0, lift: false, kick: false, kickReq: false, barrel: false, barrelReq: false };
  const bests = {};   // mode → 最佳成绩 { score, grade }

  // ── 输入 ─────────────────────────────────────────────
  const keys = {};
  const BLOCK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
  function press(code) {
    if (keys[code]) return;
    keys[code] = true;
    if (state === 'play') {
      if (code === 'KeyF') input.kickReq = true;   // 空中 Kickflip
      if (code === 'KeyG') input.barrelReq = true; // 空中喷气侧滚
      if (code === 'KeyR') restartAttempt();
      if (code === 'KeyQ') setFans(0);
      if (code === 'KeyE') setFans(1);
    }
    if (code === 'KeyP' || code === 'Escape') togglePause();
    if (code === 'KeyM') { sfx.setMuted(!sfx.muted); syncSound(); }
  }
  addEventListener('keydown', (e) => {
    if (!$('howto').classList.contains('hidden')) {   // 操作说明弹窗打开时：Esc 关闭，其他键不进游戏
      if (e.key === 'Escape') { e.preventDefault(); closeHow(); }
      return;
    }
    if (e.target.tagName === 'INPUT' && (e.target.type === 'text' || !BLOCK.has(e.code))) return;
    if (state !== 'play' && e.target.tagName === 'BUTTON' && (e.code === 'Space' || e.code === 'Enter')) return;   // 菜单里用键盘点按钮
    if (BLOCK.has(e.code)) e.preventDefault();
    press(e.code);
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isTouch) {
    document.body.classList.add('touch');
    // 操作说明里换成触屏按钮的说法（要在下面 I18N.apply() 之前改）
    $('howFans').dataset.i18n = 'how.fansT'; $('howStop').dataset.i18n = 'how.stopT'; $('howNote').dataset.i18n = 'how.noteT';
  }
  // 触屏按钮：每根手指对应一个按钮。按住的按钮（◀ ▶ 风扇 推进）之间可以直接滑动切换，手指滑出按钮也不会松开
  const HOLD = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
  const held = new Map();   // pointerId → 按钮
  function touchOn(b) {
    b.classList.add('on'); sfx.init();
    if (navigator.vibrate) navigator.vibrate(8);   // 安卓：轻微震动反馈
    press(b.dataset.key);
  }
  function touchOff(b) {
    const still = [...held.values()];
    if (!still.includes(b)) b.classList.remove('on');
    if (!still.some((x) => x.dataset.key === b.dataset.key)) keys[b.dataset.key] = false;
  }
  const tc = $('touch');
  tc.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    e.preventDefault();
    held.set(e.pointerId, b); touchOn(b);
  });
  tc.addEventListener('pointermove', (e) => {
    const old = held.get(e.pointerId);
    if (!old || !HOLD.has(old.dataset.key)) return;
    const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest('#touch button');
    if (!b || b === old || !HOLD.has(b.dataset.key)) return;
    held.set(e.pointerId, b); touchOff(old); touchOn(b);
  });
  const touchEnd = (e) => { const b = held.get(e.pointerId); if (b) { held.delete(e.pointerId); touchOff(b); } };
  tc.addEventListener('pointerup', touchEnd); tc.addEventListener('pointercancel', touchEnd);
  tc.addEventListener('contextmenu', (e) => e.preventDefault());
  // 阻止触摸之后浏览器补发的 click：否则按 ❚❚ 弹出暂停菜单后，这次 click 会落到菜单里的按钮上
  tc.addEventListener('touchstart', (e) => { if (e.target.closest('button')) e.preventDefault(); }, { passive: false });
  function releaseTouch() { for (const b of held.values()) b.classList.remove('on'); held.clear(); }
  addEventListener('blur', releaseTouch);
  // 手机切到别的应用 / 锁屏：自动暂停，回来不会直接摔车
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !isTouch) return;
    releaseTouch(); for (const k in keys) keys[k] = false;
    if (state === 'play' && !ended) togglePause();
  });
  // 触屏：量出上方面板和下方按钮挡住的高度，镜头把车放在中间空出来的区域里；竖屏横向视野收窄，车和赛道更大
  function fitFrame() {
    if (!isTouch || state === 'menu') { renderer.setFrame(null); return; }
    const W = innerWidth, H = innerHeight;
    let top = 0, bottom = H;
    for (const el of document.querySelectorAll('#hud .panel, #hint')) {   // 提示条按一行高度预留
      const r = el.getBoundingClientRect();
      if (r.height && r.left < W * 0.62 && r.right > W * 0.38) top = Math.max(top, el.id === 'hint' ? r.top + 34 : r.bottom);
    }
    for (const el of document.querySelectorAll('#touch .tc-left button, #touch .tc-right button')) {
      const r = el.getBoundingClientRect();
      if (r.height) bottom = Math.min(bottom, r.top);
    }
    renderer.setFrame({ top: top + 4, bottom: H - bottom + 4, viewW: H > W ? 28 : 40 });
  }
  addEventListener('resize', () => setTimeout(fitFrame, 60));

  function readInput(dt) {
    if (ended) {   // 已落地：松开推进器，自动刹停
      input.lift = false; input.throttle = car.nW > 0 && Math.hypot(car.vx, car.vy) > 1 ? -1 : 0;
      return;
    }
    const L = keys.ArrowLeft || keys.KeyA, R = keys.ArrowRight || keys.KeyD;
    input.throttle = (R ? 1 : 0) - (L ? 1 : 0);
    // 飞越车阵落地后的刹车阶段：← 只刹车、不倒车
    if (run && run.td && input.throttle < 0 && Math.hypot(car.vx, car.vy) < 1) input.throttle = 0;
    input.lift = !!keys.Space && !liftLocked();
    const up = keys.ArrowUp || keys.KeyW, dn = keys.ArrowDown || keys.KeyS;
    if (up || dn) setFans(clamp01(set.fanF + (up ? 1 : -1) * dt * 0.9));
  }
  // 飞越车阵：没到起飞线之前推进器锁定（包括重生时车还没落稳的那一下）
  const liftLocked = () => mode === 'kick' && course.takeoff != null && car.x < course.takeoff;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  function setFans(v) { set.fanF = set.fanR = v; syncSliders(); }

  // ── 设备面板：吸附风扇（可调功率）/ 推进器（按住空格）/ 能量 ──
  const fanRange = $('fanRange');
  fanRange.addEventListener('input', () => setFans(fanRange.value / 100));
  fanRange.addEventListener('pointerup', () => fanRange.blur());
  function syncSliders() {
    const v = Math.round(set.fanF * 100);
    if (document.activeElement !== fanRange) fanRange.value = v;
    $('fanVal').textContent = v + '%';
    $('fanSet').style.width = v + '%';
  }
  syncSliders();

  // ── 游戏流程 ──────────────────────────────────────────
  // 一局 = 一次完整的演示：落地即结束，给出分数、评级和点评。中途失败（掉下半环、撞车）自动重来
  function loadCourse() {
    course = BUILD[mode]();
    renderer.setCourse(course);
    set.vmax = course.vmax; set.charge = course.charge != null ? course.charge : null; set.fanDrag = course.fanDrag || 0;
  }
  function newRun() {
    loadCourse();
    raceTime = 0; particles = []; pending = null; ended = false; attempts = 0;
    resetCar();
    $('cpLabel').dataset.i18n = mode === 'kick' ? 'hud.attempts' : 'hud.inv';
    $('cpLabel').textContent = T($('cpLabel').dataset.i18n);
  }
  function resetCar() {
    car = CF.createCar(course.start.x, course.start.y + 0.8, 0, 1);
    car.energy = course.startEnergy;
    setFans(course.startFans);
    stuckT = 0; input.kickReq = false; input.barrelReq = false;
    air = { t: 0, rolls: 0, vy: 0 };
    run = { inv: 0, exited: false, onRamp: false, warnedFans: false, airT: 0, righted: false, kick: false, wasKick: false, wasRoll: false, barrel: false, wasBarrel: false, emptied: false, td: null, stopT: 0 };
    attempts++;
    updateCamera(10);   // 镜头直接就位（倒立半环一开始就能看到整座结构）
  }
  // R：重来这一次
  function restartAttempt() {
    if (pending || ended) return;
    resetCar();
    const f = $('flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 60);
  }
  function start() {
    sfx.init();
    music.play();   // 每局随机一首（不和上一首重复）
    syncTrack();
    newRun();
    $('popups').innerHTML = '';
    state = 'play';
    ['menu', 'finish', 'pause'].forEach((id) => $(id).classList.add('hidden'));
    $('hud').classList.remove('hidden');
    if (isTouch) { $('touch').classList.remove('hidden'); fitFrame(); updateCamera(10); }
    showBest();
    popup(modeName(mode), T('start.' + mode));
  }
  function toMenu() {
    state = 'menu';
    music.stop();
    ['pause', 'finish', 'hud', 'touch'].forEach((id) => $(id).classList.add('hidden'));
    $('menu').classList.remove('hidden');
    fitFrame();
    loadCourse(); resetMenuCar();
    showBest();
  }
  function togglePause() {
    if (state === 'play' && !ended) { state = 'pause'; $('pause').classList.remove('hidden'); music.duck(true); }
    else if (state === 'pause') { state = 'play'; $('pause').classList.add('hidden'); music.duck(false); }
  }

  $('pilotForm').addEventListener('submit', (e) => { e.preventDefault(); start(); });

  // 语言切换：静态文字由 i18n.apply() 更新，这里刷新动态内容
  function syncLang() {
    setTimeout(measureMenu, 0);
    document.querySelectorAll('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === CF.I18N.lang));
    showBest(); hintText = null;
  }
  document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => CF.I18N.set(b.dataset.lang)));
  CF.I18N.onChange(syncLang);
  CF.I18N.apply();
  syncLang();

  $('againBtn').onclick = start;
  $('restartBtn').onclick = start;
  $('resumeBtn').onclick = togglePause;
  $('retryBtn').onclick = () => { togglePause(); restartAttempt(); };
  $('menuBtn').onclick = toMenu;
  // 暂停菜单：显示当前曲目，点一下换下一首
  function syncTrack() {
    const t = music.title, b = $('trackBtn');
    if (!t) return;
    b.textContent = '♪ ' + t[CF.I18N.lang] + '  »';
    b.title = T('music.next'); b.setAttribute('aria-label', t[CF.I18N.lang] + ' – ' + T('music.next'));
  }
  $('trackBtn').onclick = () => { music.nextTrack(); music.duck(true); syncTrack(); };
  CF.I18N.onChange(syncTrack);
  const syncSound = () => { $('soundBtn').textContent = T(sfx.muted ? 'sound.off' : 'sound.on'); };
  $('soundBtn').onclick = () => { sfx.setMuted(!sfx.muted); syncSound(); };
  CF.I18N.onChange(syncSound); syncSound();
  $('menuBtn2').onclick = toMenu;
  const modeBtns = [...document.querySelectorAll('.mode')];
  function pickMode(b) {
    modeBtns.forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b ? 'true' : 'false'); x.tabIndex = x === b ? 0 : -1; });
    mode = b.dataset.mode; loadCourse(); resetMenuCar(); showBest();
  }
  modeBtns.forEach((b, i) => {
    b.tabIndex = b.classList.contains('on') ? 0 : -1;
    b.addEventListener('click', () => pickMode(b));
    // 单选组的键盘操作：方向键切换
    b.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      const nb = modeBtns[(i + d + modeBtns.length) % modeBtns.length];
      pickMode(nb); nb.focus();
    });
  });

  // ── 操作说明弹窗 ──────────────────────────────────────
  function openHow() { $('howto').classList.remove('hidden'); $('howClose').focus(); }
  function closeHow() { $('howto').classList.add('hidden'); $('howBtn').focus(); }
  $('howBtn').onclick = openHow;
  $('howClose').onclick = closeHow;
  $('howto').addEventListener('click', (e) => { if (e.target.id === 'howto') closeHow(); });
  $('howto').addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); $('howClose').focus(); } });   // 弹窗内只有一个按钮：焦点留在弹窗里

  // ── 最佳成绩 ─────────────────────────────────────────
  function getBest(m) { return bests[m] || CF.Record.best(m); }
  function showBest() {
    const b = getBest(mode);
    $('best').textContent = b ? T('best.hud', b) : '--';
    $('menuBest').textContent = b ? T('best.menu', { mode: modeName(mode), grade: b.grade, score: b.score }) : '';
  }
  // 评级只允许这几个值（纵深防御：防止注入）
  const safeGrade = (g) => (/^(SS|S|A|B|C|D|F)$/.test(g) ? g : '?');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── 结算 ─────────────────────────────────────────────
  function liveStats(outcome, tdVy, miss) {
    return { inv: run.inv, air: run.airT, righted: run.righted, kick: run.kick, barrel: run.barrel, tdVy, miss, energy: car.energy, outcome, attempts, time: raceTime };
  }
  // HUD 上的实时得分：只算已经拿到的部分（着陆、停机坪、剩余能量要落地才算）
  function liveScore() {
    const r = CF.Score.compute(mode, { ...liveStats('ok', 99, 999), energy: 0 });
    const cleared = mode === 'loop' || car.x > course.row.x1;
    return r.parts.reduce((t, [k, v]) => t + (k === 'cleared' && !cleared ? 0 : v), 0);
  }
  // 落地即结束：记录结果，等烟尘散一会儿再弹出结算
  function endRun(outcome, vy) {
    ended = true;
    const miss = Math.abs(car.x - course.pad.tx);   // 到停机坪目标点的距离（重要评分依据）
    const st = liveStats(outcome, vy, miss);
    sfx.thump(0.2 + Math.min(0.4, vy * 0.04)); cam.shake = Math.min(14, 3 + vy * 0.7);
    smoke(car.x, car.y - 0.6, 50);
    const m = miss.toFixed(1);
    if (outcome === 'ok') popup(mode === 'kick' ? T('pop.stopped') : T(vy < CF.Score.perfectVy(mode) ? 'pop.perfect' : vy < 4 ? 'pop.soft' : 'pop.land'), T(miss <= CF.Score.padHalf(mode) ? 'pop.onTarget' : 'pop.offPad', { m }), 'green');
    else popup(T(outcome === 'hard' ? 'pop.hard' : outcome === 'fall' ? 'crash.cliff' : 'pop.flip'), T('pop.rud'), 'gold');
    pending = { t: 1.6, fn: () => showResult(st) };
  }

  async function showResult(st) {
    state = 'finish';
    const local = CF.Score.compute(mode, st);
    music.jingle(local.grade !== 'F');   // 结算小段：成功上行、失败下行
    renderResult(local);
    $('resRank').textContent = '';
    $('resComment').textContent = T('res.thinking'); $('resComment').classList.add('loading');
    $('resTip').textContent = ''; $('resAISrc').textContent = T('res.caster');
    $('finish').classList.remove('hidden');
    $('touch').classList.add('hidden');

    const r = CF.Record.finish(mode, st);
    if (state !== 'finish') return;
    bests[mode] = { score: r.best, grade: r.bestGrade };
    showBest();
    const bestTxt = esc(r.isBest ? (r.prevBest != null ? T('res.newBest', { prev: r.prevBest }) : T('res.firstLocal')) : T('res.best', { grade: r.bestGrade, score: r.best }));
    $('resRank').innerHTML = `<span class="dim">${bestTxt}</span>`;
    const c = CF.Quips.make(mode, r, null, CF.I18N.lang);
    if (state !== 'finish') return;
    $('resComment').classList.remove('loading');
    $('resComment').textContent = c.comment;
    $('resTip').textContent = c.tip ? '💡 ' + CF.I18N.fill(c.tip) : '';
  }

  function renderResult(r) {
    const s = r.stats, g = $('resGrade');
    $('resMode').textContent = T('res.mode', { mode: modeName(mode) });
    g.textContent = safeGrade(r.grade); g.className = 'grade g-' + safeGrade(r.grade);
    $('resTitle').textContent = T('grade.' + r.grade);
    $('resScore').textContent = r.score;
    const facts = [
      ['res.miss', s.miss.toFixed(1) + ' m'], ['res.td', s.tdVy.toFixed(1) + ' m/s'],
      [mode === 'loop' ? 'hud.inv' : 'res.energy', mode === 'loop' ? Math.round(s.inv) + ' m' : Math.round(s.energy) + '%'],
      ['res.air', s.air.toFixed(1) + ' s'], ['res.attempts', s.attempts], ['res.time', fmt(s.time)],
    ];
    $('resGrid').innerHTML = facts.map(([k, v]) => `<div><span>${esc(T(k))}</span><b>${esc(v)}</b></div>`).join('');
    $('resParts').innerHTML = r.parts.map(([k, v]) => { v = Number(v) | 0; return `<span class="${v < 0 ? 'neg' : ''}">${esc(T('part.' + k))} ${v > 0 ? '+' : ''}${v}</span>`; }).join('');
  }
  const fmt = (t) => {
    const m = Math.floor(t / 60), s = t - m * 60;
    return String(m).padStart(2, '0') + ':' + s.toFixed(2).padStart(5, '0');
  };

  function popup(text, sub, cls) {
    const el = document.createElement('div');
    el.className = 'pop' + (cls ? ' ' + cls : '');
    el.textContent = text;   // 纯文本，不解析 HTML
    if (sub) { const sm = document.createElement('small'); sm.textContent = sub; el.appendChild(sm); }
    $('popups').appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  // 中途失败：自动重来这一次（不结束本局）
  function crash(why) {
    sfx.thump(0.6); cam.shake = 14;
    smoke(car.x, car.y - 0.5, 30);
    popup(T(why), T('pop.retry'), 'gold');
    pending = { t: 1.4, fn: resetCar };
  }

  // 所需吸力（0..1 的风扇功率）：车在表面上时，按"除风扇外的法向力"估算还差多少
  // 倒置路面上重力把车往下拉 → 需要约 73%；半环底部离心力把车压向路面 → 几乎不用；竖直段要靠吸力换抓地
  let need = 0, needOn = false;
  function updateNeed(dt) {
    needOn = car.nW > 0 && car.y > 1.5;
    if (!needOn) { need += (0 - need) * Math.min(1, dt * 4); return; }
    const g = 9.8, C = CF.CarCfg;
    const press = car.wheelN - car.fanN;
    const needN = 0.05 * g + g * Math.max(0, Math.sin(car.a) * car.m) / C.mu * 0.6;
    const t = Math.max(0, Math.min(1, (needN - press) / (2 * C.fanMax)));
    need += (t - need) * Math.min(1, dt * 5);
  }

  // 背景音乐强度跟着游戏走：地面 0 → 爬升 / 过起飞线 1 → 倒挂 / 腾空 2
  function musicLevel(flying, uy) {
    if (mode === 'loop') {
      if (run.exited || (car.nW > 0 && uy < -0.5) || (flying && run.onRamp)) return 2;
      return run.onRamp || car.y > 1.5 ? 1 : 0;
    }
    if (flying && car.x > course.takeoff) return 2;
    return car.x >= course.takeoff ? 1 : 0;
  }

  // 是否已进入"落地即结束"阶段：场景一冲出半环之后；场景二越过车阵之后
  const finalPhase = () => mode === 'loop' ? run.exited : car.x > course.row.x1 + 1;

  // ── 每帧逻辑 ──────────────────────────────────────────
  function logic(dt) {
    raceTime += dt;
    if (pending) {
      pending.t -= dt;
      if (pending.t <= 0) { const fn = pending.fn; pending = null; fn(); }
      return;
    }
    if (ended) return;
    const sp = Math.hypot(car.vx, car.vy);
    const uy = Math.cos(car.a) * car.m;
    const flying = car.nW === 0 && !car.bodyHit;

    // 空中动作
    if (flying) {
      air.t += dt; air.vy = car.vy;
      if (mode === 'loop' ? run.exited : car.x > course.row.x0 - 60) run.airT += dt;
      if (car.rollT > 0) run.wasRoll = true;
      else if (run.wasRoll && uy > 0.8 && !run.righted) { run.righted = true; popup(T('pop.righted'), '+300'); }
      if (car.kickT > 0) run.wasKick = true;
      else if (run.wasKick && !run.kick) { run.kick = true; popup('KICKFLIP!', '+500', 'gold'); }
      if (car.barrelT > 0) run.wasBarrel = true;
      else if (run.wasBarrel && !run.barrel) { run.barrel = true; popup(T('pop.barrel'), '+700', 'gold'); }
    }

    // 结算：倒立半环 = 落地即结束；飞越车阵 = 落地后刹停才结束（用风扇吸附 + 刹车控制停车点）
    if (run.td) {
      if (car.y < -3) return endRun('fall', run.td.vy);   // 刹不住，冲下悬崖
      if (car.nW > 0 && sp < 0.6) run.stopT += dt; else run.stopT = 0;
      if (run.stopT > 0.4) return endRun('ok', run.td.vy);
      updateNeed(dt); updateHint(uy); music.setIntensity(1);
      return;
    }
    if (finalPhase() && (car.nW > 0 || car.bodyHit) && car.y < 4) {
      const vy = Math.max(0, -air.vy);
      const outcome = car.kickT > 0 || car.barrelT > 0 || car.rollT > 0 || uy < 0.3 ? 'flip' : vy > HARD_LANDING ? 'hard' : 'ok';
      if (mode === 'kick' && outcome === 'ok') {
        run.td = { vy };
        sfx.thump(0.2 + Math.min(0.4, vy * 0.04)); smoke(car.x, car.y - 0.6, 30);
        popup(T(vy < CF.Score.perfectVy(mode) ? 'pop.perfect' : vy < 4 ? 'pop.soft' : 'pop.land'), T('pop.brake'), 'green');
        return;
      }
      return endRun(outcome, vy);
    }

    // 中途失败
    if (car.y < -30) return crash(course.cliff && car.x > course.cliff ? 'crash.cliff' : 'crash.fall');
    if (car.kickT > 0 && (car.nW > 0 || car.bodyHit)) return crash('crash.kick');
    if (car.barrelT > 0 && (car.nW > 0 || car.bodyHit)) return crash('crash.barrel');
    if (car.bodyHit && car.nW === 0 && uy < 0.2 && car.y < 4) return crash('crash.flip');
    if (course.jumpZone) {
      const z = course.jumpZone;
      if (car.x > z.x0 && car.x < z.x1 && (car.nW > 0 || car.bodyHit)) return crash('crash.car');
    }
    if (!flying && air.t > 0) {
      if (car.nW > 0) {
        if (air.t > 0.5 && -air.vy > HARD_LANDING) return crash('crash.hard');
        if (air.t > 0.5) { sfx.thump(0.2); smoke(car.x, car.y - 0.6, 16); }
      }
      air = { t: 0, rolls: 0, vy: 0 };
    }

    updateNeed(dt);
    if (mode === 'loop') loopLogic(dt, sp, uy);
    music.setIntensity(musicLevel(flying, uy));
    if (car.energy <= 0 && !run.emptied) { run.emptied = true; popup(T('pop.empty'), '', 'gold'); sfx.thump(0.3); }
    else if (car.energy < 25 && car.energy > 0 && !run.lowWarned) { run.lowWarned = true; popup(T('pop.low'), T('pop.low.sub'), 'gold'); }

    // 卡住
    if (car.bodyHit && sp < 1.2 && car.nW < 2) stuckT += dt; else stuckT = 0;
    if (stuckT > 3) return crash('crash.stuck');

    updateHint(uy);
  }

  function loopLogic(dt, sp, uy) {
    const R = course.ramp;
    const onRamp = car.nW > 0 && car.y > 1.5;   // 跑道上车身中心约 0.6 m，高于 1.5 m 只能是在半环上
    if (onRamp && uy < -0.5) run.inv += sp * dt;
    if (onRamp) run.onRamp = true;
    // 风扇不够：车从半环上掉下来
    if (run.onRamp && !run.exited && car.nW === 0 && run.inv < 8 && car.y > 6 && !run.warnedFans) {
      run.warnedFans = true; popup(T('pop.fansLow'), T('pop.fansLow.sub'), 'gold');
    }
    // 从倒置路面尽头冲出
    if (!run.exited && run.inv > 10 && car.nW === 0 && car.x < R.ex + 1) {
      run.exited = true;
      popup(T('pop.inv', { m: Math.round(run.inv) }), '+' + Math.round(run.inv * 5));
    }
  }

  // 情境提示：根据车的状态告诉玩家下一步该做什么（返回 i18n key）
  function hintFor(uy) {
    if (car.energy <= 0) return 'hint.empty';
    const flying = car.nW === 0;
    const descend = () => (car.vy < -6 ? 'hint.fast' : 'hint.descend');
    if (mode === 'loop') {
      const R = course.ramp;
      if (flying && run.exited) return uy < 0 ? 'hint.roll' : car.y > 16 ? (run.barrel ? 'hint.freefall' : 'hint.freefallRoll') : car.y > 3 ? descend() : '';
      if (needOn && set.fanF < need) return 'hint.fanLow';
      if (car.nW > 0 && uy < -0.5 && car.x < R.ex + 14) return 'hint.edge';
      if (needOn && set.fanF > need + 0.15) return 'hint.fanWaste';
      if (car.nW > 0 && uy < -0.5) return 'hint.inv';
      if (needOn) return 'hint.onRamp';
      if (!run.onRamp && car.x < -20) return 'hint.fanStart';
      return 'hint.go';
    }
    const row = course.row;
    const kmh = car.vx * 3.6;   // 水平速度：起飞 45–60 km/h、越过车阵后 42–55 km/h 最容易停在目标点
    if (liftLocked()) return keys.Space ? 'hint.locked' : car.x > course.takeoff - 8 && kmh < 40 ? 'hint.kickSlow' : 'hint.kickGo';
    if (car.x < row.x0 && !flying) return 'hint.takeoff';
    if (flying && car.x < row.x1) return run.kick || car.kickT > 0 ? 'hint.kickHold' : 'hint.kickDo';
    if (run.td) return car.x < course.pad.tx - 5 && kmh < 14 ? 'hint.stopEarly' : 'hint.stop';
    if (flying && car.x > course.pad.x1 - 4) return 'hint.cliff';
    if (flying && kmh > 55) return 'hint.kickFast';
    if (flying && kmh < 42) return 'hint.kickSlowAir';
    if (flying) return car.vy < -6 ? 'hint.fast' : 'hint.kickLand';
    return '';
  }
  function updateHint(uy) {
    const h = stuckT > 1.2 ? 'hint.stuck' : hintFor(uy);
    if (h !== hintText) {
      hintText = h; const el = $('hint');
      if (h) { el.textContent = T(h); el.classList.add('show'); } else el.classList.remove('show');
    }
  }

  // ── 粒子 ─────────────────────────────────────────────
  function addP(p) { if (particles.length < 900) particles.push(p); }
  function burst(x, y, nx, ny, n) {
    for (let i = 0; i < n; i++) {
      const s = (Math.random() - 0.5) * 2;
      addP({ x, y, vx: -ny * s * 8 + nx * Math.random() * 3, vy: nx * s * 8 + ny * Math.random() * 3, life: 0.8, max: 0.8, size: 0.25 + Math.random() * 0.3, grow: 2, col: '#8b93a3', alpha: 0.45, add: false });
    }
  }
  // 落地烟尘（演示里车"在一团烟雾中落地"）
  function smoke(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI, v = 2 + Math.random() * 9;
      addP({ x: x + (Math.random() - 0.5) * 3, y: y + Math.random() * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.35, life: 1.8 + Math.random(), max: 2.6, size: 0.5 + Math.random() * 0.6, grow: 4, col: '#b9bcc4', alpha: 0.32, add: false });
    }
  }
  function spawnParticles() {
    const c = Math.cos(car.a), s = Math.sin(car.a), m = CF.rollScale(car) >= 0 ? 1 : -1;
    const ux = -s * m, uy = c * m;
    const toW = (lx, ly) => [car.x + c * lx - s * ly * m, car.y + s * lx + c * ly * m];
    const G = CF.CarGeo;
    if (car.liftOut > 0.05) {
      for (const J of G.JETS) {
        const [x, y] = toW(J.lx, J.ly);
        for (let i = 0; i < car.liftOut * 3; i++) {
          const sp = 12 + Math.random() * 8, sd = (Math.random() - 0.5) * 3;
          addP({ x, y, vx: car.vx * 0.4 - ux * sp + c * sd, vy: car.vy * 0.4 - uy * sp + s * sd, life: 0.45, max: 0.45, size: 0.18, grow: 4, col: '#e6f4ff', alpha: 0.4, add: true });
        }
      }
      // 推进器气流吹起地面尘土
      if (car.y < 8 && uy > 0.5) {
        for (let i = 0; i < car.liftOut * 2; i++) {
          const d = Math.random() < 0.5 ? -1 : 1;
          addP({ x: car.x + d * Math.random() * 2, y: 0.2, vx: d * (6 + Math.random() * 10), vy: Math.random() * 2, life: 0.9, max: 0.9, size: 0.35, grow: 3, col: '#9a9ca3', alpha: 0.25 * (1 - car.y / 8), add: false });
        }
      }
    }
    if (car.barrelT > 0) {   // 侧向推进器：车身上下交替喷气
      const side = Math.sin(performance.now() / 40) > 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        const sp = 10 + Math.random() * 8;
        addP({ x: car.x + (Math.random() - 0.5) * 2.4, y: car.y + side * 0.6, vx: car.vx * 0.4 + (Math.random() - 0.5) * 3, vy: car.vy * 0.4 + side * sp, life: 0.35, max: 0.35, size: 0.16, grow: 4, col: '#ffe1c4', alpha: 0.45, add: true });
      }
    }
    if (car.brakeOut > 0.05) {
      const dir = Math.sign(car.vx) || 1;
      for (let i = 0; i < car.brakeOut * 3; i++) {
        const sp = 12 + Math.random() * 6;
        addP({ x: car.x + dir * 2.3, y: car.y, vx: car.vx * 0.5 + dir * sp, vy: (Math.random() - 0.5) * 3, life: 0.35, max: 0.35, size: 0.15, grow: 4, col: '#e6f4ff', alpha: 0.35, add: true });
      }
    }
    for (let i = 0; i < 2; i++) {
      const pw = set.fanF, e = car.fanEff[i];
      if (pw < 0.05 || e < 0.25 || car.energy <= 0) continue;
      if (Math.random() > pw * e * 0.9) continue;
      const fp = car.fanPt[i], dir = Math.random() < 0.5 ? -1 : 1, v = 3 + Math.random() * 5;
      addP({ x: fp.x + fp.nx * 0.1, y: fp.y + fp.ny * 0.1, vx: -fp.ny * dir * v + car.vx * 0.3, vy: fp.nx * dir * v + car.vy * 0.3, life: 0.6, max: 0.6, size: 0.12, grow: 3, col: '#7f8898', alpha: 0.3, add: false });
    }
    if (car.bodyHit && car.scrape > 5) {
      for (let i = 0; i < 3; i++) {
        addP({ x: car.x + (Math.random() - 0.5) * 3, y: car.y - uy * 0.5, vx: -car.vx * 0.3 + (Math.random() - 0.5) * 8, vy: Math.random() * 6, life: 0.35, max: 0.35, size: 0.05, col: '#ffb347', alpha: 1, add: true, streak: true });
      }
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles[i] = particles[particles.length - 1]; particles.pop(); continue; }
      p.vx *= 1 - dt * 2.5; p.vy *= 1 - dt * 2.5;
      if (p.streak) p.vy -= 20 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      // 喷流 / 烟尘打到地面后向两侧散开
      if (p.y < 0.1 && p.y > -2 && !p.streak && !(course.cliff != null && p.x > course.cliff)) { p.vx += (p.vx >= 0 ? 1 : -1) * Math.abs(p.vy) * 0.7; p.vy = Math.abs(p.vy) * 0.15; p.y = 0.1; }
    }
  }

  // ── 镜头 ─────────────────────────────────────────────
  // 靠近半环时拉远、把整座结构收进画面；其他时候跟随车辆
  // 开始页镜头：地平线放在关卡卡片上方一点，让赛道和车出现在标题与卡片之间
  let menuGround = 0.62;
  function measureMenu() {
    const el = document.querySelector('#menu .launch');
    if (!el || $('menu').classList.contains('hidden')) return;
    const H = innerHeight, top = el.getBoundingClientRect().top;
    menuGround = Math.max(0.45, Math.min(0.8, (top - 8) / H));
  }
  addEventListener('resize', () => setTimeout(measureMenu, 50));
  function updateCamera(dt) {
    if (state === 'menu' && course.menu) {
      const M = course.menu, k = Math.min(1, dt * 3);
      const S = renderer.baseS * M.zoom;
      const drift = reduceMotion ? 0 : Math.sin(performance.now() / 9000) * 2.5;
      cam.x += (M.cx + drift - cam.x) * k;
      cam.y += ((menuGround - 0.5) * renderer.H / S - cam.y) * k;
      cam.zoom += (M.zoom - cam.zoom) * Math.min(1, dt * 1.5);
      cam.shake = 0;
      return;
    }
    const sp = Math.hypot(car.vx, car.vy);
    const LA = 14 * renderer.frame.viewW / 40;   // 镜头前瞻：桌面 ±14 m，竖屏视野窄就短一点
    let tx = car.x + Math.max(-LA, Math.min(LA, car.vx * 0.35));
    let ty = car.y + 2 + Math.max(-6, Math.min(6, car.vy * 0.2));
    let zt = Math.max(0.55, Math.min(1, 1 / (1 + Math.max(0, sp - 12) / 60 + (car.nW === 0 ? 0.2 : 0))));
    const F = course.focus;
    if (F && car.x > F.x0 && car.x < F.x1 && !(run && run.exited)) {
      const k = Math.min(1, (car.x - F.x0) / 50);
      tx += (F.cx - tx) * 0.9 * k; ty += (F.cy - ty) * 0.9 * k;
      zt += (F.zoom - zt) * k;
    }
    if (mode === 'kick' && car.nW === 0) zt = Math.min(zt, 0.75);
    // 降落阶段：把车和下方的地面（停机坪）同时收进画面
    if (run && run.exited && car.y > 3) {
      ty = Math.max(5, car.y * 0.5 + 3);
      zt = Math.min(zt, Math.max(0.5, 22 / (car.y + 12)));
      if (course.pad) tx = car.x + (((course.pad.x0 + course.pad.x1) / 2) - car.x) * 0.3;
    }
    // 触屏：始终把车留在面板和按钮之间的区域里；竖屏视野窄，还不拉得太远（桌面不变）
    const fr = renderer.frame;
    let yMin = 5;   // 镜头最低高度：地面在画面中心以下 5 m
    if (fr.top > 0) {
      if (fr.viewW < 40) zt = Math.max(zt, 0.72);
      const S = renderer.baseS * zt, hh = Math.max(0, (renderer.H - fr.top - fr.bottom) / 2 / S - 2.5);
      if (fr.viewW < 40) { const hw = renderer.W / 2 / S * 0.55; tx = Math.max(car.x - hw, Math.min(car.x + hw, tx)); }
      ty = Math.max(car.y - hh, Math.min(car.y + hh, ty));
      if (fr.viewW < 40) yMin = Math.max(5, hh * 0.6);   // 竖屏：地面放低一些，少一块空的地面
    }
    const k = Math.min(1, dt * 3);
    cam.x += (tx - cam.x) * k;
    cam.y += (Math.max(ty, yMin) - cam.y) * k;
    cam.zoom += (zt - cam.zoom) * Math.min(1, dt * 1.5);
    cam.shake *= Math.max(0, 1 - dt * 8);
    if (cam.shake < 0.2) cam.shake = 0;
  }

  // ── HUD ─────────────────────────────────────────────
  let hudAcc = 0;
  function updateHud(dt) {
    hudAcc += dt;
    const e = car.energy > 0;
    $('fanOut').style.width = (e ? set.fanF * Math.max(0.15, (car.fanEff[0] + car.fanEff[1]) / 2) * 100 : 0).toFixed(1) + '%';
    const ne = $('fanNeed');
    ne.classList.toggle('show', needOn && need > 0.02);
    ne.style.left = (need * 100).toFixed(1) + '%';
    $('jetOut').style.width = (e ? Math.max(car.liftOut, car.brakeOut) * 100 : 0).toFixed(1) + '%';
    if (hudAcc < 0.08) return;
    hudAcc = 0;
    $('timer').textContent = fmt(raceTime);
    $('cpText').textContent = mode === 'kick' ? attempts : Math.round(run.inv) + ' m';
    $('score').textContent = ended ? '—' : liveScore();
    $('speed').textContent = Math.round(Math.hypot(car.vx, car.vy) * 3.6);
    $('alt').textContent = Math.max(0, car.y - 0.6).toFixed(0) + ' m';
    $('energyBar').style.width = car.energy.toFixed(0) + '%';
    $('energyVal').textContent = car.energy.toFixed(0) + '%';
    $('energyBar').parentNode.parentNode.classList.toggle('low', car.energy < 25);
    const tag = $('fanTag');
    if (needOn && need > 0.02) {
      const ok = set.fanF >= need;
      tag.textContent = T(!ok ? 'fan.low' : set.fanF > need + 0.15 ? 'fan.waste' : 'fan.ok');
      tag.className = !ok ? 'bad' : set.fanF > need + 0.15 ? 'waste' : 'ok';
    } else if (set.fanF > 0.02 && car.energy > 0 && car.liftOut > 0.3) { tag.textContent = T('fan.yield'); tag.className = 'waste'; }   // 喷气时风扇让位
    else if (set.fanF > 0.02 && car.fanN > 1) { tag.textContent = T('fan.grip'); tag.className = 'ok'; }                            // 吸住地面：抓地 / 吸地生效
    else { tag.textContent = '↑ ↓'; tag.className = ''; }
    const sink = Math.max(0, -car.vy), sk = $('sink');
    sk.textContent = sink.toFixed(1) + ' m/s';
    sk.className = car.nW > 0 ? '' : sink < 4 ? 'ok' : sink < 8 ? 'mid' : 'bad';
    $('jetVal').textContent = T(liftLocked() ? 'jet.locked' : car.liftOut > 0.3 ? 'jet.on' : car.brakeOut > 0.3 ? 'jet.brake' : 'jet.idle');
    // 距目标点：进入降落阶段后显示
    const showT = mode === 'loop' ? run.exited : car.x > course.row.x0;
    $('targetRow').classList.toggle('hidden', !showT);
    if (showT) {
      const d = Math.abs(car.x - course.pad.tx), tg = $('target');
      tg.textContent = d.toFixed(1) + ' m';
      tg.className = d <= 3 ? 'ok' : d <= CF.Score.padHalf(mode) ? 'mid' : 'bad';
    }
    const uy = Math.cos(car.a) * car.m, st = $('state');
    let txt, cls = '';
    if (car.energy <= 0) { txt = 'empty'; cls = 'warn'; }
    else if (car.kickT > 0) { txt = 'kick'; cls = 'air'; }
    else if (car.barrelT > 0) { txt = 'barrel'; cls = 'air'; }
    else if (car.rollT > 0) { txt = 'roll'; cls = 'air'; }
    else if (car.nW === 0 && !car.bodyHit) { txt = uy < 0 ? 'inv' : car.liftOut > 0.3 ? 'hover' : 'air'; cls = uy < 0 ? 'inv' : 'air'; }
    else if (car.nW === 0) { txt = 'crash'; cls = 'warn'; }
    else if (uy > 0.6) txt = 'drive';
    else if (uy < -0.5) { txt = 'ceiling'; cls = 'inv'; }
    else { txt = 'climb'; cls = 'inv'; }
    st.textContent = T('state.' + txt); st.className = 'state ' + cls;
  }

  // ── 主循环 ──────────────────────────────────────────
  // 菜单背景：车停在起点
  function resetMenuCar() {
    car = CF.createCar(course.menu ? course.menu.carX : course.start.x, course.start.y + 0.8, 0, 1);
    run = null;
    setFans(0.35);   // 开始页：风扇低速待机（只影响画面，开局时 resetCar 会恢复）
    measureMenu();
    updateCamera(10);
    cam.x = car.x + 8; cam.y = car.y + 3;
  }
  let last = performance.now(), acc = 0, time = 0;
  resetMenuCar();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; time += dt;
    if (state === 'play') {
      readInput(dt);
      acc += dt;
      while (acc >= DT) {
        input.kick = input.kickReq; input.kickReq = false;
        input.barrel = input.barrelReq; input.barrelReq = false;
        CF.stepCar(car, course, input, set, DT);
        acc -= DT;
      }
      logic(dt);
      spawnParticles();
      updateHud(dt);
    } else if (state === 'menu') {
      for (let i = 0; i < 8; i++) CF.stepCar(car, course, { throttle: 0, lift: false, kick: false }, set, DT);
      if (!reduceMotion) spawnParticles();
    }
    updateParticles(dt);
    if (state !== 'pause') updateCamera(dt);
    sfx.update(car, set, input, state === 'play');
    renderer.draw({ cam, car, time, particles, course, set, input, aid: state === 'play' });
    requestAnimationFrame(frame);
  }
  addEventListener('resize', () => renderer.resize());
  renderer.resize();
  requestAnimationFrame(frame);

  // 调试/自动化钩子
  window.__gravoff = {   // 调试 / 自动化测试用
    get car() { return car; }, set, get course() { return course; }, start, get state() { return state; }, keys,
    screen: (x, y) => renderer.toScreen(renderer.camv || cam, x, y), get frame() { return renderer.frame; },
    setMode(m) { mode = m; loadCourse(); resetMenuCar(); }, get dbg() { return { pending: !!pending, ended, mode, run, attempts, music: music.track ? music.track.bpm : 0, intensity: music.intensity }; },
  };
})();

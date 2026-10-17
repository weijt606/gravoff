// 飞越车阵：不同起飞距离 / 飞行高度 / 反推策略下能否飞过，以及落点和停机坪的关系。node tools/sim-kick.js
require('../public/js/track.js'); require('../public/js/car.js'); require('../public/js/score.js');
const CF = globalThis.CF, DT = 1 / 480;
function run(lead, alt, ab, sink, early, fans, fanDown) {
  const c = CF.buildKick(), car = CF.createCar(c.start.x, 0.8, 0, 1);
  car.energy = c.startEnergy;
  const set = { fanF: 0, fanR: 0, vmax: c.vmax, charge: c.charge, fanDrag: c.fanDrag };
  let res = 'timeout', kicked = false, td = null, took = false, air = 0, lastVy = 0;
  for (let t = 0; t < 40; t += DT) {
    const flying = car.nW === 0, over = car.x > c.row.x1 + 2;
    if (flying && car.x > c.row.x0 - lead) took = true;
    let lift = false, kick = false, throttle = took ? (td ? -1 : 0) : 1;
    // 高度：越过中间的重卡之前保持 alt，之后降到约 3.3 m（后面两辆车都不到 2 m）
    const semiEnd = c.cars[2].x1, altNow = fanDown && car.x > semiEnd ? 3.3 : alt;
    if (car.x > c.row.x0 - lead && !over) lift = car.y < altNow || car.vy < (fanDown && car.x > semiEnd ? -2.5 : -1);
    if (car.x < c.takeoff && car.nW > 0) lift = false;   // 起飞线之前推进器锁定（与游戏一致）
    if (over && flying) { lift = car.vy < -sink; if (Math.abs(car.vx) > ab) throttle = -1; }
    if (fanDown && over && flying && !td) {   // 离地 4 m 内开风扇把车吸下来，提前落地
      set.fanF = set.fanR = car.y < 4.5 ? 1 : 0;
      if (car.y < 4.5) lift = car.vy < -4;
    }
    if (early && flying && !over && car.x > c.row.x0 + early && Math.abs(car.vx) > ab) throttle = -1;   // 还在车阵上方就开始反推
    if (flying && !kicked && car.y > alt - 0.5 && car.x > c.row.x0) { kick = true; kicked = true; }
    CF.stepCar(car, c, { throttle, lift, kick }, set, DT);
    if (took && flying) { air += DT; lastVy = car.vy; }
    const z = c.jumpZone;
    if (car.x > z.x0 && car.x < z.x1 && (car.nW > 0 || car.bodyHit)) { res = 'CRASH x=' + car.x.toFixed(1); break; }
    if (took && over && car.nW > 0 && !td) td = { x: car.x, vy: -lastVy };
    if (td) {   // 落地后：刹车 + （可选）开风扇加抓地，刹停才结算
      set.fanF = set.fanR = fans || 0;
      if (Math.hypot(car.vx, car.vy) < 0.6 && car.nW > 0) { td.stop = car.x; break; }
    }
    if (car.y < -30) { res = 'CLIFF x=' + car.x.toFixed(0); break; }
  }
  if (td) {
    const mid = (c.pad.x0 + c.pad.x1) / 2;
    if (td.stop == null) res = 'CLIFF(rolled off) td x=' + td.x.toFixed(0);
    else {
      const r = CF.Score.compute('kick', { air, kick: kicked, barrel: true, tdVy: td.vy, miss: Math.abs(td.stop - mid), energy: car.energy, outcome: td.vy > 11 ? 'hard' : 'ok' });
      res = `td x=${td.x.toFixed(0)} stop x=${td.stop.toFixed(1)} (pad ${c.pad.x0.toFixed(0)}-${c.pad.x1.toFixed(0)}, 目标 ${mid}) vy=${td.vy.toFixed(1)} E=${car.energy.toFixed(0)} → ${r.score} ${r.grade}`;
    }
  }
  console.log(`lead ${lead} alt ${alt} airbrake>${ab} sink<${sink}${early ? ' early+' + early : ''}${fanDown ? ' 吸地' : ''}${fans != null ? ' 刹车风扇' + fans : ''}  ${res}`);
}
// 代表性策略：没反推 / 反推太晚 → 冲下悬崖；越过重卡后降到 3 m、离地 4 m 开风扇吸地、落地后刹车（有无风扇对比）
run(28, 6, 99, 3);                                  // 不反推
run(28, 6, 12, 3);                                  // 越过车阵后才反推
for (const [ab, early] of [[8, 10], [10, 0.1], [12, 5]]) for (const fans of [0, 1]) run(28, 6, ab, 4, early, fans, true);

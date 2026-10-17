// 场景一：倒立半环。node tools/sim-loop.js
// 不同风扇功率 / 跑道终速下，能否倒挂通过、在哪里落地
require('../public/js/track.js'); require('../public/js/car.js');
const CF = globalThis.CF, DT = 1 / 480;
const c = CF.buildLoop();
function run(fan, hover, brakeOnTop, airBrake, burn, smart) {
  const car = CF.createCar(c.start.x, 0.8, 0, 1); car.energy = c.startEnergy;
  const set = { fanF: fan, fanR: fan, vmax: +process.argv[2] || c.vmax, charge: c.charge };
  let inv = 0, left = null, res = 'timeout', minE = 100, maxX = -1e9, maxY = 0, entry = 0;
  for (let t = 0; t < 40; t += DT) {
    const uy = Math.cos(car.a) * car.m, air = car.nW === 0;
    const onTop = car.nW > 0 && uy < -0.5;
    // burn：省能量的"最后时刻点火"——先自由下落，按 v²/(2a) 算出刹停距离，到了才喷
    const lift = left && air && (uy < 0 || (burn ? car.y - 0.6 < (car.vy * car.vy) / (2 * 6.5) + 1.5 && car.vy < -1.5 : car.vy < -hover));
    const throttle = left ? (car.nW > 0 || (airBrake && Math.abs(car.vx) > airBrake) ? -1 : 0) : (onTop && brakeOnTop && Math.abs(car.vx) > brakeOnTop ? -1 : 1);
    if (smart) {   // 跟着赛道调风扇：跑道 / 半环底部低，竖直段中等，倒挂段 smart
      const f = car.y < 1.5 ? 0 : uy > 0.3 ? 0.35 : uy > -0.5 ? 0.6 : smart;
      set.fanF = set.fanR = left ? 0 : f;
    }
    CF.stepCar(car, c, { throttle, lift, kick: false }, set, DT);
    minE = Math.min(minE, car.energy); maxX = Math.max(maxX, car.x); maxY = Math.max(maxY, car.y);
    if (!entry && car.x > -2) entry = car.vx;
    if (left && !left.E) left.E = car.energy;
    if (onTop) inv += Math.hypot(car.vx, car.vy) * DT;
    if (left && !left.td && car.nW > 0) left.td = { x: car.x, vy: car.vy };
    if (!left && inv > 5 && air && car.y > 20) left = { x: car.x, v: car.vx };
    if (car.bodyHit && uy < 0 && car.y < 3) { res = 'CRASH(inverted) x=' + car.x.toFixed(1); break; }
    if (left && car.nW === 2 && uy > 0.8 && Math.hypot(car.vx, car.vy) < 1.5) { res = 'STOP x=' + car.x.toFixed(1); break; }
    if (!left && maxX > 2 && car.y < 1.5 && car.x < -3 && inv === 0) { res = 'fell-back maxY=' + maxY.toFixed(0); break; }
  }
  console.log(`${smart ? 'SMART' + smart + ' ' : ''}${burn ? 'BURN ' : ''}ab=${airBrake || 0} entry=${(entry*3.6).toFixed(0)}km/h fan=${fan} hover=${hover} brake=${brakeOnTop}  inv=${inv.toFixed(0)}m  exit=${left ? left.x.toFixed(0) + '@' + (-left.v * 3.6).toFixed(0) + 'km/h' : '-'}  Eexit=${left && left.E ? left.E.toFixed(0) : '-'} E>=${minE.toFixed(0)}  td=${left && left.td ? left.td.x.toFixed(0) + ' vy=' + left.td.vy.toFixed(1) : '-'}  ${res}`);
}
for (const fan of [0.6, 0.7, 0.75, 0.8, 0.9, 1]) run(fan, 4, 0, 6);
for (const fan of [0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 1]) run(fan, 0, 0, 99, true);
for (const fan of [0.8, 0.9]) run(fan, 0, 0, 12, true);
for (const sm of [0.75, 0.8, 0.9]) run(0, 0, 0, 99, true, sm);
run(0, 4, 0, 6, false, 0.8);
run(1, 6, 0); run(1, 3, 8); run(1, 3, 0, 8); run(1, 5, 0, 10); run(1, 4, 0, 5);

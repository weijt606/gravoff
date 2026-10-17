/* 计分与评级：根据一局的统计数据（stats）算出分数和评级
 * stats 会先被限制在合理范围内，异常数据不会算出离谱的分数。
 * parts 里是 [项目 key, 分数]，显示文字由前端按语言翻译（js/i18n.js 的 part.*）。
 */
(function (root) {
  'use strict';
  const CF = root.CF = root.CF || {};
  // 停机坪半宽（m）：倒立半环 28 m 宽，飞越车阵 20 m 宽
  // miss：倒立半环 = 触地点到目标点的距离；飞越车阵 = 刹停位置到目标点的距离
  const PAD_HALF = { loop: 14, kick: 10 };
  const padHalf = (mode) => PAD_HALF[mode] || 14;
  // 完美着陆的触地速度上限（m/s）：飞越车阵还要刹停，放宽到 2.5
  const PERFECT = { loop: 2, kick: 2.5 };
  const perfectVy = (mode) => PERFECT[mode] || 2;

  const GRADES = {
    // SS 是最高级：需要几乎正中目标点 + 完美着陆 + 喷气侧滚（S 起都必须有侧滚和完美着陆）
    loop: [['SS', 4300], ['S', 3700], ['A', 2600], ['B', 1800], ['C', 1000], ['D', 0]],
    kick: [['SS', 5100], ['S', 4500], ['A', 3400], ['B', 2600], ['C', 1600], ['D', 0]],
  };
  // 中文称号（界面上显示的称号走 i18n 的 grade.*）
  const TITLES = {
    SS: '火星第一人', S: '星际级试飞员', A: '轨道认证飞手', B: '合格的跑车车主', C: '还在等自动驾驶', D: '回炉重造', F: '快速计划外解体',
  };

  const num = (v, lo, hi) => { v = +v; if (!isFinite(v)) v = lo; return Math.max(lo, Math.min(hi, v)); };
  function sanitize(s) {
    s = s || {};
    return {
      inv: num(s.inv, 0, 80), air: num(s.air, 0, 30), righted: !!s.righted, kick: !!s.kick, barrel: !!s.barrel,
      tdVy: num(s.tdVy, 0, 60), miss: num(s.miss, 0, 999), energy: num(s.energy, 0, 100),
      outcome: ['ok', 'hard', 'flip', 'fall'].includes(s.outcome) ? s.outcome : 'flip',
      attempts: Math.round(num(s.attempts, 1, 999)), time: num(s.time, 0, 3600),
    };
  }

  // 精准降落：落在停机坪内 +600，再按离目标点的距离加分（越近越多，正中心最多 +1400）
  function padPoints(miss, half) {
    half = half || 14;
    if (miss > half) return 0;
    const k = 1 - miss / half;
    return 600 + 1400 * k * k;
  }

  // 返回 { score, grade, title, parts: [[key, 分数]], stats }
  function compute(mode, raw) {
    const s = sanitize(raw);
    const parts = [];
    let total = 0;
    const add = (key, pts) => { pts = Math.round(pts); if (pts) { parts.push([key, pts]); total += pts; } };
    if (mode === 'loop') { add('inv', s.inv * 5); add('air', Math.min(s.air, 12) * 50); }
    else { add('cleared', 1000); add('air', Math.min(s.air, 8) * 50); }
    if (s.righted) add('righted', 300);
    if (s.kick) add('kick', 500);
    if (s.barrel) add('barrel', 700);
    if (s.outcome === 'ok') {
      if (s.tdVy < perfectVy(mode)) add('perfect', 600); else if (s.tdVy < 4) add('soft', 300);
      add('pad', padPoints(s.miss, padHalf(mode)));
      if (mode === 'kick') add('energy', s.energy * 5);
    } else {
      add(s.outcome === 'hard' ? 'penaltyHard' : s.outcome === 'fall' ? 'penaltyFall' : 'penaltyFlip', -Math.round(total / 2));
    }
    total = Math.max(0, total);
    let grade = 'F';
    if (s.outcome === 'ok') for (const [g, min] of GRADES[mode] || GRADES.loop) if (total >= min) { grade = g; break; }
    // S / SS 必须完成喷气侧滚并且完美着陆（倒立半环 < 2 m/s，飞越车阵 < 2.5 m/s），否则最高 A
    if ((grade === 'S' || grade === 'SS') && !(s.barrel && s.tdVy < perfectVy(mode))) grade = 'A';
    return { score: total, grade, title: TITLES[grade], parts, stats: s };
  }

  CF.Score = { compute, sanitize, padPoints, padHalf, perfectVy, GRADES, TITLES, PAD_HALF };
  if (typeof module !== 'undefined') module.exports = CF.Score;
})(typeof window !== 'undefined' ? window : globalThis);

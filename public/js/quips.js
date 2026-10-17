/* 结算点评（中 / 英）：根据这一局的数据挑一句调侃和一条改进建议
 *
 * 文案审核原则（降低侵权 / 名誉风险）：
 * - 不点名任何真实人物，不编造任何人"说过 / 看过 / 点赞"之类的反应
 * - 不使用任何公司名、产品名或商标，也不暗示任何公司认可、认证或赞助本游戏
 * - 梗只取通用的行业文化：电动车、火箭回收、发射场、OTA、续航焦虑、"快速计划外解体"、PPT 造车等
 * - 只调侃玩家这一局的表现，不攻击任何人或群体，不涉及政治
 */
(function (root) {
  'use strict';
  const CF = root.CF = root.CF || {};

  const L = {
    zh: {
      grade: {
        SS: ['SS 级！火星停车场已经给你留好了车位。', '这精度，连火箭回收塔都想请你去当顾问。', '重力：可选。失误：查无此项。'],
        S: ['0 到 100 加速不算本事，0 误差落地才算。', '火箭回收靠机械臂，你回收这辆车靠的是天赋。', '试验场已经在给你打印工牌了。', '这一套操作，可以直接剪进发布会的开场视频。'],
        A: ['遥测工程师默默把你这局存成了"教学样本"。', '很稳，差一点就能上发布会直播了。', '落地姿势之标准，可以直接拿去做产品宣传图。'],
        B: ['合格！至少比"明年一定交付"靠谱。', '能飞能落，已经超过了大多数 PPT 造车。', '表现不错，相当于电量还剩 60% 的那种安心。'],
        C: ['车是落地了，评委的心还悬在半空。', '这一跳，像极了每年都说"今年年底一定上线"的那种期待。', '续航焦虑没有，落地焦虑倒是有一点。'],
        D: ['落地了，但姿势有点像在给保险公司写案例。', '推进器：我尽力了。', '建议先在停车场练练倒车入库。'],
        F: ['恭喜达成航天经典成就：快速计划外解体（RUD）。', '这不是事故，这是一次"数据收集非常丰富"的测试。', '没关系，火箭也是炸过几次才上天的。', '车：我只是一辆跑车啊，为什么要承受这些。'],
      },
      extra: {
        target: '正中目标点，精度堪比火箭被回收塔稳稳接住。',
        perfect: '触地那一下轻得像 OTA 升级，用户毫无感知。',
        kick: '那个 Kickflip，滑板圈都要来挖人了。',
        inv: '倒挂那么久，车里的人估计已经在用脚踩天花板了。',
        empty: '能量见底还敢飞，这很有"先发射再说"的精神。',
        barrel: '那一下喷气侧滚，发射场的摄影师都追不上镜头。',
      },
      tip: {
        flipLoop: '冲出倒置路面后第一时间按空格，让推进器先把车翻正。',
        flipKick: '别在快落地时按 F，Kickflip 要在高处做完。',
        energy: '风扇跟着白线调：弯底和跑道调低，倒挂段刚过 75% 就够；降落先自由下落，离地 15 m 再点火。',
        sink: '离地 6 m 左右开始连续点按空格，把下降速度压到 4 m/s 以内（看虚线变绿）。',
        miss: '下降时按住 ← 反推减速，让地上的落点标记对准停机坪中间的目标点。',
        missKick: '落地后按住 ← 刹车并按 ↑ 开大风扇：吸附增加抓地力，能把车精准停在目标点。',
        barrel: '想上 S 级？空中按 G 来一个喷气侧滚，再配一个完美着陆（倒立半环 < 2 m/s，飞越车阵 < 2.5 m/s）。',
        fall: '落地后马上 ← 刹车，同时把风扇开大增加抓地力，别冲下悬崖。',
        close: '已经落在坪上了，再往目标点靠几米，精准分会翻倍。',
        inv: '风扇别低于白线，倒挂段要一直开到尽头才有满分距离。',
        kick: '在最高点按一下 F 做个 Kickflip，白送 500 分。',
        perfect: '再柔一点：触地速度低于 2 m/s（飞越车阵 2.5 m/s）算完美着陆，多 300 分。',
        saveKick: '少喷几下省能量，剩余能量也算分。',
        max: '已经很强了，试试正中目标点冲 SS。',
      },
    },
    en: {
      grade: {
        SS: ['SS rank! Your parking spot on Mars is already reserved.', 'That precision has the rocket-catching tower asking for your number.', 'Gravity: optional. Mistakes: not found.'],
        S: ['0–100 is easy. 0-metre landings are the real flex.', 'Rockets get caught by robot arms. You caught this car with pure talent.', 'The test site is already printing your badge.', 'That run could open the next launch-event video.'],
        A: ['A telemetry engineer just saved your run as a training example.', 'Rock solid – one step away from the live stream.', 'Landing pose so clean it belongs on the product page.'],
        B: ['Solid! More reliable than "deliveries start next year".', 'It flies, it lands – already ahead of most slide-deck carmakers.', 'Comfortable, like having 60% battery left.'],
        C: ['The car landed. The judges\' hearts are still in the air.', 'That jump had real "shipping by the end of this year" energy.', 'No range anxiety – just a little landing anxiety.'],
        D: ['You landed, but in a way that\'s going straight into an insurance case study.', 'Thrusters: "We tried our best."', 'Maybe practise parallel parking first.'],
        F: ['Achievement unlocked: Rapid Unscheduled Disassembly.', 'Not a crash – just a test with "very rich data collection".', 'Don\'t worry, rockets blew up a few times before they flew too.', 'The car: "I\'m just a sports car, why me?"'],
      },
      extra: {
        target: 'Dead centre on the target – tower-catch precision.',
        perfect: 'That touchdown was smoother than an over-the-air update.',
        kick: 'That kickflip has skateboard sponsors calling already.',
        inv: 'Upside down that long – the driver is basically standing on the ceiling.',
        empty: 'Flying on an empty battery? Very "launch first, ask later" of you.',
        barrel: 'That jet barrel roll was too fast for the launch-site camera crew.',
      },
      tip: {
        flipLoop: 'Press Space right after leaving the deck so the thrusters flip you upright.',
        flipKick: 'Don\'t press F close to the ground – finish the kickflip up high.',
        energy: 'Ride the white line: fans low in the dip, just over 75% upside down; free-fall, then burn at about 15 m.',
        sink: 'From about 6 m, tap Space to keep the sink rate under 4 m/s (watch the line turn green).',
        miss: 'Hold ← while descending and put the ground marker right on the pad\'s target.',
        missKick: 'After touchdown hold ← and turn the fans up: suction adds grip so you can stop right on the target.',
        barrel: 'Want an S? Press G for a midair jet barrel roll, then land perfectly (< 2 m/s; < 2.5 m/s in Car Jump).',
        fall: 'Brake with ← right after touchdown and crank the fans for grip – don\'t roll off the cliff.',
        close: 'You\'re on the pad – a few metres closer to the target doubles the precision bonus.',
        inv: 'Keep fans above the white line and ride the whole inverted deck for full points.',
        kick: 'Press F at the top of the jump for a free 500-point kickflip.',
        perfect: 'Softer: under 2 m/s (2.5 m/s in Car Jump) counts as a perfect landing (+300).',
        saveKick: 'Fire the thrusters less – leftover energy scores points.',
        max: 'Already great – hit the target dead centre for an SS.',
      },
    },
  };

  const pick = (arr, seed) => arr[Math.abs(seed | 0) % arr.length];

  // 根据数据给一条具体可执行的建议
  function tipFor(mode, r, lang) {
    const T = (L[lang] || L.zh).tip, s = r.stats;
    if (s.outcome === 'fall') return T.fall;
    if (s.outcome === 'flip') return mode === 'loop' ? T.flipLoop : T.flipKick;
    if (s.outcome === 'hard' && s.energy < 1) return T.energy;
    if (s.outcome === 'hard' || s.tdVy >= 4) return T.sink;
    const half = CF.Score && CF.Score.padHalf ? CF.Score.padHalf(mode) : 14;
    if (s.miss > half) return mode === 'kick' ? T.missKick : T.miss;
    if (s.miss > 5) return T.close;
    if (!s.barrel) return T.barrel;
    if (mode === 'loop' && s.inv < 45) return T.inv;
    if (!s.kick) return T.kick;
    if (s.tdVy >= (CF.Score && CF.Score.perfectVy ? CF.Score.perfectVy(mode) : 2)) return T.perfect;
    return mode === 'kick' ? T.saveKick : T.max;
  }

  function make(mode, r, seed, lang) {
    const P = L[lang] || L.zh;
    seed = seed == null ? Math.floor(Math.random() * 1e6) : seed;
    let comment = pick(P.grade[r.grade] || P.grade.C, seed);
    const s = r.stats;
    const extra = s.outcome !== 'ok' ? (s.energy < 1 ? P.extra.empty : null)
      : s.miss <= 2 ? P.extra.target : s.barrel && seed % 3 === 0 ? P.extra.barrel : s.tdVy < (CF.Score && CF.Score.perfectVy ? CF.Score.perfectVy(mode) : 2) ? P.extra.perfect : s.kick ? P.extra.kick : (mode === 'loop' && s.inv > 45) ? P.extra.inv : null;
    if (extra && seed % 2) comment = extra;
    return { comment, tip: tipFor(mode, r, lang), source: 'local' };
  }

  CF.Quips = { make, tipFor, LINES: L };
  if (typeof module !== 'undefined') module.exports = CF.Quips;
})(typeof window !== 'undefined' ? window : globalThis);

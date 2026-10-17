/* 中文 / English 双语
 * - HTML 里带 data-i18n="key" 的元素会被替换文字（data-i18n-html 允许内嵌 <kbd> 等标签；data-i18n-ph 替换 placeholder）
 * - 文案里的 {SPACE} {UP} {DOWN} {LEFT} {RIGHT} {F} {R} 会按"键盘 / 触屏"换成对应的按键或按钮名
 * - 语言优先级：用户切换过的（localStorage）> 浏览器语言（zh* → 中文，其他 → English）
 */
(function (root) {
  'use strict';
  const CF = root.CF = root.CF || {};
  const KEY = 'gravoff.lang';
  const D = {
    zh: {
      'title': 'GRAVOFF · 反重力驾驶实验',
      'menu.eyebrow': '反重力驾驶实验',
      'mode.loop': '倒立半环', 'mode.kick': '飞越车阵',
      'mode.loop.desc': '吸附赛道 · 倒挂驾驶 · 精准着陆',
      'mode.kick.desc': '火箭起飞 · 空中翻转 · 飞越车阵',
      'btn.start': '开始游戏', 'btn.again': '再来一次', 'btn.menu': '换个场景', 'btn.close': '关闭',
      'btn.resume': '继续', 'btn.retry': '重来这一次', 'btn.restart': '从头开始', 'btn.toMenu': '返回菜单',
      'pause.title': '已暂停',
      'disclaimer.short': '独立同人作品，与任何汽车或航天公司无关，亦未获其授权或认可。游戏内容纯属虚构，请勿在现实中模仿。',
      'hud.inv': '倒挂行驶', 'hud.attempts': '尝试次数', 'hud.score': '得分', 'hud.best': '最佳',
      'hud.alt': '高度', 'hud.sink': '下降速度', 'hud.target': '距目标点',
      'dev.fans': '吸附风扇', 'dev.jets': '冷气推进器', 'dev.jets.key': '按住 空格', 'dev.energy': '能量',
      'jet.on': '喷射', 'jet.brake': '反推', 'jet.idle': '待命', 'jet.locked': '锁定',
      'fan.low': '吸力不足', 'fan.waste': '吸力富余', 'fan.ok': '吸力 OK', 'fan.grip': '吸地 · 抓地+', 'fan.yield': '喷气时让位',
      'touch.brake': '刹车', 'touch.go': '加速', 'touch.fanUp': '风扇＋', 'touch.fanDn': '风扇－', 'touch.retry': '重来', 'touch.flip': '翻转', 'touch.jet': '推进',
      'touch.fans': '风扇±', 'sound.on': '声音：开', 'sound.off': '声音：关',
      'how.fansT': '吸附风扇功率：不低于白线，开太大很耗能（也可以拖动上方的滑块）',
      'how.stopT': '飞越车阵落地后要停稳才结算：开大风扇会吸住地面减速（风扇越大停得越快），再按 ◀ 刹车会更猛',
      'how.noteT': '游戏中屏幕上方会实时提示下一步。◀ 和 ▶ 之间可以按住直接滑动切换，不用抬手。',
      'state.empty': '能量耗尽', 'state.kick': 'KICKFLIP', 'state.roll': '翻正中', 'state.inv': '车底朝上', 'state.hover': '悬停', 'state.air': '腾空',
      'state.crash': '翻车', 'state.drive': '贴地行驶', 'state.ceiling': '倒挂行驶', 'state.climb': '爬升',
      'start.loop': '冲上半环，倒挂行驶', 'start.kick': '飞越 5 辆车，落到目标点',
      'pop.fansLow': '吸力不够！', 'pop.fansLow.sub': '按 {UP} 把风扇开大再试',
      'pop.inv': '倒挂行驶 {m} m', 'pop.righted': '空中翻正', 'pop.retry': '再试一次', 'pop.rud': '快速计划外解体',
      'pop.perfect': '完美着陆！', 'pop.soft': '软着陆', 'pop.land': '着陆', 'pop.hard': '硬着陆！', 'pop.flip': '翻车！',
      'pop.onTarget': '距目标点 {m} m', 'pop.offPad': '偏离停机坪 {m} m', 'pop.empty': '能量耗尽！',
      'crash.fall': '掉下去了', 'crash.cliff': '坠下悬崖！',
      'hint.cliff': '前方是悬崖！按住 {LEFT} 反推减速，快落地',
      'hint.freefall': '能量很紧：先让车自由下落，离地约 15 m 再按住 {SPACE} 点火刹车',
      'hint.freefallRoll': '按 {G} 喷气侧滚（冲 S 级必需）· 然后自由下落，离地约 15 m 再按住 {SPACE} 刹车',
      'hint.kickLand': '点按 {SPACE} 控制下降 · 离地 4 m 内松开 {SPACE}、开风扇 {UP} 把车吸下来（喷气时风扇会让位）· 落地后 {LEFT} 刹车 + 风扇加抓地',
      'hint.stop': '开大风扇 {UP} 吸住地面就会减速，越大停得越快；再按住 {LEFT} 刹车更猛 · 把车停在红色目标点上',
      'pop.barrel': '喷气侧滚！', 'pop.brake': '刹车！用风扇吸附控制停车点', 'pop.stopped': '停稳',
      'crash.barrel': '侧滚没转完就落地了', 'state.barrel': '喷气侧滚',
      'part.barrel': '喷气侧滚', 'part.penaltyFall': '冲下悬崖 ×0.5',
      'how.barrel': '空中喷气侧滚（耗 6% 能量，+700；S 级以上必须有侧滚 + 完美着陆：倒立半环 < 2 m/s，飞越车阵 < 2.5 m/s）', 'touch.roll': '侧滚',
      'how.stop': '飞越车阵落地后要停稳才结算：开大风扇会吸住地面减速（风扇越大停得越快），再按 ← 刹车会更猛',
      'pop.low': '能量不足 25%！', 'pop.low.sub': '省着用：风扇别开大，降落先自由下落', 'crash.kick': 'Kickflip 没转完就落地了', 'crash.flip': '翻车！', 'crash.car': '撞车！',
      'crash.hard': '硬着陆！', 'crash.stuck': '卡住了',
      'hint.empty': '能量耗尽！风扇和推进器停止工作',
      'hint.stuck': '车被卡住了？按 {R} 重来',
      'hint.roll': '按 {SPACE}：推进器把车翻正',
      'hint.fast': '下降太快！按住 {SPACE}',
      'hint.descend': '点按 {SPACE} 控制下降速度（< 4 m/s）· 按住 {LEFT} 反推 · 对准目标点',
      'hint.fanLow': '吸力不足！按 {UP} 加大风扇',
      'hint.edge': '马上到尽头——冲出去后按 {SPACE} 翻正！',
      'hint.fanWaste': '吸力过剩在白白耗能！按 {DOWN} 降到白线附近',
      'hint.inv': '倒挂行驶中！风扇把车吸在路面上',
      'hint.onRamp': '风扇吸住路面，继续 {RIGHT}（白线 = 所需吸力，倒挂前要加到 75% 以上）',
      'hint.fanStart': '风扇要跟着白线调：弯底低，倒挂段约 75% 以上。开不够会掉，开太大会耗光能量',
      'hint.go': '按住 {RIGHT} 加速，冲上半环',
      'hint.kickGo': '前方 5 辆车 · 按住 {RIGHT} 加速，最佳起飞速度 45–60 km/h（看左上角车速）· 推进器在黄色 TAKEOFF 标线解锁，到线就按住 {SPACE} 起飞',
      'hint.kickSlow': '速度偏低！继续按住 {RIGHT}，到 45 km/h 以上再起飞，否则飞不过车阵',
      'hint.kickFast': '速度偏快（> 55 km/h），会冲过目标点：按住 {LEFT} 反推减速',
      'hint.kickSlowAir': '速度已经够低了（< 42 km/h）：松开 {LEFT}，再反推会落在停机坪前面',
      'hint.stopEarly': '还没到目标点：松开 {LEFT}、调小风扇 {DOWN}，让车再滑一段',
      'hint.takeoff': '按住 {SPACE} 起飞！',
      'hint.kickHold': '越过中间最高的卡车后降到约 3 m · 看车速：高于 55 km/h 才按 {LEFT} 反推 · 停机坪后面就是悬崖',
      'hint.kickDo': '按 {F} Kickflip · 按 {G} 喷气侧滚（S 级必需）· 按住 {SPACE} 保持 5–6 m 高度',
      'hint.locked': '推进器锁定中：开到黄色 TAKEOFF 标线才能起飞',
      'res.mode': '{mode} · 结算', 'res.thinking': '解说员正在组织语言…',
      'res.newBest': '★ 刷新个人最佳（之前 {prev}）', 'res.firstLocal': '★ 本机首个成绩',
      'res.best': '个人最佳 {grade} 级 · {score} 分', 
      'res.caster': '解说员', 'res.points': '分',
      'res.td': '触地速度', 'res.miss': '距目标点', 'res.air': '滞空', 'res.attempts': '尝试次数', 'res.time': '用时', 'res.energy': '剩余能量',
      'best.menu': '{mode} 你的最佳：{grade} 级 · {score} 分', 'best.hud': '{grade} · {score}',
      'part.inv': '倒挂行驶', 'part.air': '滞空', 'part.cleared': '飞越车阵', 'part.righted': '空中翻正', 'part.kick': 'Kickflip',
      'part.perfect': '完美着陆', 'part.soft': '软着陆', 'part.pad': '精准降落', 'part.energy': '剩余能量',
      'part.penaltyHard': '硬着陆 ×0.5', 'part.penaltyFlip': '翻车 ×0.5',
      'grade.SS': '火星第一人', 'grade.S': '星际级试飞员', 'grade.A': '轨道认证飞手', 'grade.B': '合格的跑车车主', 'grade.C': '还在等自动驾驶', 'grade.D': '回炉重造', 'grade.F': '快速计划外解体',
      'menu.levels': '选择关卡',
      'btn.how': '操作说明',
      'btn.gotIt': '知道了',
      'how.title': '操作说明',
      'how.throttle': '加速',
      'how.brake': '刹车（空中：推进器反推减速）',
      'how.fans': '吸附风扇功率（Q 关闭 / E 全开）：不低于白线，开太大很耗能',
      'how.jets': '冷气推进器：按住起飞、悬停、缓降；车底朝上时自动翻正',
      'how.kick': '空中 Kickflip（加分）',
      'how.retry': '重来',
      'how.pause': '暂停',
      'how.mute': '静音',
      'how.note': '游戏中屏幕上方会实时提示下一步。触屏设备请使用屏幕按钮。',
      'key.space': '空格',
      'key.desk': { SPACE: '空格', UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→', F: 'F', G: 'G', R: 'R' },
      'key.touch': { SPACE: '「推进」', UP: '「风扇＋」', DOWN: '「风扇－」', LEFT: '◀', RIGHT: '▶', F: '「翻转」', G: '「侧滚」', R: '「↺」' },
    },
    en: {
      'title': 'GRAVOFF · Gravity is optional. Landing isn’t.',
      'menu.eyebrow': 'ANTI-GRAVITY DRIVING EXPERIMENT',
      'mode.loop': 'Inverted Loop', 'mode.kick': 'Car Jump',
      'mode.loop.desc': 'Wall Ride · Upside Down · Perfect Landing',
      'mode.kick.desc': 'Rocket Launch · Midair Flip · Car Jump',
      'btn.start': 'START ENGINE', 'btn.again': 'Play Again', 'btn.menu': 'Change Scene', 'btn.close': 'Close',
      'btn.resume': 'Resume', 'btn.retry': 'Retry This Run', 'btn.restart': 'Restart', 'btn.toMenu': 'Main Menu',
      'pause.title': 'Paused',
      'disclaimer.short': 'Independent fan-made game – not affiliated with, endorsed or sponsored by any car or space company. Fictional; do not try this in real life.',
      'hud.inv': 'Inverted', 'hud.attempts': 'Attempts', 'hud.score': 'Score', 'hud.best': 'Best',
      'hud.alt': 'Altitude', 'hud.sink': 'Sink rate', 'hud.target': 'To target',
      'dev.fans': 'Suction fans', 'dev.jets': 'Thrusters', 'dev.jets.key': 'hold Space', 'dev.energy': 'Energy',
      'jet.on': 'FIRING', 'jet.brake': 'REVERSE', 'jet.idle': 'IDLE', 'jet.locked': 'LOCKED',
      'fan.low': 'TOO WEAK', 'fan.waste': 'OVERKILL', 'fan.ok': 'GRIP OK', 'fan.grip': 'GRIP+', 'fan.yield': 'YIELD TO JETS',
      'touch.brake': 'Brake', 'touch.go': 'Go', 'touch.fanUp': 'Fan +', 'touch.fanDn': 'Fan −', 'touch.retry': 'Retry', 'touch.flip': 'Flip', 'touch.jet': 'Boost',
      'touch.fans': 'Fan ±', 'sound.on': 'Sound: On', 'sound.off': 'Sound: Off',
      'how.fansT': 'Fan power: stay above the white line – overdoing it drains energy fast (you can also drag the slider at the top)',
      'how.stopT': 'Car Jump scores once you stop: fan suction slows the car on the ground (more fan, shorter stop); ◀ brakes even harder',
      'how.noteT': 'Hints at the top tell you what to do next. Slide your thumb between ◀ and ▶ without lifting it.',
      'state.empty': 'NO ENERGY', 'state.kick': 'KICKFLIP', 'state.roll': 'Righting', 'state.inv': 'Upside down', 'state.hover': 'Hovering', 'state.air': 'Airborne',
      'state.crash': 'Crashed', 'state.drive': 'Driving', 'state.ceiling': 'Inverted', 'state.climb': 'Climbing',
      'start.loop': 'Hit the loop and drive upside down', 'start.kick': 'Clear 5 cars and land on the target',
      'pop.fansLow': 'Not enough suction!', 'pop.fansLow.sub': 'Press {UP} for more fan power',
      'pop.inv': 'Inverted {m} m', 'pop.righted': 'Righted', 'pop.retry': 'Try again', 'pop.rud': 'Rapid unscheduled disassembly',
      'pop.perfect': 'Perfect landing!', 'pop.soft': 'Soft landing', 'pop.land': 'Landed', 'pop.hard': 'Hard landing!', 'pop.flip': 'Rolled over!',
      'pop.onTarget': '{m} m from target', 'pop.offPad': 'Missed the pad by {m} m', 'pop.empty': 'Out of energy!',
      'crash.fall': 'Fell off', 'crash.cliff': 'Off the cliff!',
      'hint.cliff': 'Cliff ahead! Hold {LEFT} for reverse thrust and get down',
      'hint.freefall': 'Energy is tight: free-fall first, then hold {SPACE} to brake at about 15 m',
      'hint.freefallRoll': 'Press {G} for a jet barrel roll (needed for S) · then free-fall and hold {SPACE} at about 15 m',
      'hint.kickLand': 'Tap {SPACE} to descend · within 4 m release {SPACE} and turn fans up {UP} to pull down (fans yield while jets fire) · then {LEFT} + fans to stop',
      'hint.stop': 'Fans up {UP} grip the ground and slow you down – more fan, shorter stop; add {LEFT} to brake harder · stop on the red target',
      'pop.barrel': 'Jet barrel roll!', 'pop.brake': 'Brake! Use fan suction to stop on target', 'pop.stopped': 'Stopped',
      'crash.barrel': 'Landed mid barrel roll', 'state.barrel': 'Barrel roll',
      'part.barrel': 'Jet barrel roll', 'part.penaltyFall': 'Off the cliff ×0.5',
      'how.barrel': 'Midair jet barrel roll (6% energy, +700; S and above need a barrel roll + perfect landing: < 2 m/s, or < 2.5 m/s in Car Jump)', 'touch.roll': 'Roll',
      'how.stop': 'Car Jump scores once you stop: fan suction slows the car on the ground (more fan, shorter stop); ← brakes even harder',
      'pop.low': 'Energy below 25%!', 'pop.low.sub': 'Save it: lower the fans, free-fall before braking', 'crash.kick': 'Landed mid-kickflip', 'crash.flip': 'Rolled over!', 'crash.car': 'Hit a car!',
      'crash.hard': 'Hard landing!', 'crash.stuck': 'Stuck',
      'hint.empty': 'Out of energy! Fans and thrusters are offline',
      'hint.stuck': 'Stuck? Press {R} to retry',
      'hint.roll': 'Press {SPACE}: thrusters flip the car upright',
      'hint.fast': 'Falling too fast! Hold {SPACE}',
      'hint.descend': 'Tap {SPACE} to keep sink rate < 4 m/s · hold {LEFT} to slow down · aim for the target',
      'hint.fanLow': 'Not enough suction! Press {UP}',
      'hint.edge': 'End of the deck ahead – press {SPACE} to flip upright once you fly off!',
      'hint.fanWaste': 'Too much suction is burning energy – press {DOWN} toward the white line',
      'hint.inv': 'Driving upside down – the fans hold you to the deck',
      'hint.onRamp': 'Fans are gripping – keep {RIGHT} (white line = suction needed; 75%+ before going inverted)',
      'hint.fanStart': 'Match the fans to the white line: low in the dip, 75%+ upside down. Too little = fall, too much = no energy to land',
      'hint.go': 'Hold {RIGHT} to accelerate into the loop',
      'hint.kickGo': '5 cars ahead · hold {RIGHT}; best takeoff speed is 45–60 km/h (see the speedometer) · thrusters unlock at the yellow TAKEOFF line – hold {SPACE} right there',
      'hint.kickSlow': 'Too slow! Keep holding {RIGHT} – take off above 45 km/h or you won\'t clear the cars',
      'hint.kickFast': 'Too fast (> 55 km/h) – you\'ll overshoot the target: hold {LEFT} for reverse thrust',
      'hint.kickSlowAir': 'Slow enough (< 42 km/h): release {LEFT} or you\'ll land short of the pad',
      'hint.stopEarly': 'Short of the target: release {LEFT} and turn the fans down {DOWN} to coast further',
      'hint.takeoff': 'Hold {SPACE} to lift off!',
      'hint.kickHold': 'After the tall truck in the middle, drop to about 3 m · only hold {LEFT} above 55 km/h · there\'s a cliff past the pad',
      'hint.locked': 'Thrusters locked until the yellow TAKEOFF line',
      'hint.kickDo': '{F} kickflip · {G} jet barrel roll (needed for S) · hold {SPACE} to stay at 5–6 m',
      'res.mode': '{mode} · Results', 'res.thinking': 'The commentator is thinking…',
      'res.newBest': '★ New personal best (was {prev})', 'res.firstLocal': '★ First score on this device',
      'res.best': 'Personal best: {grade} · {score}', 
      'res.caster': 'COMMENTARY', 'res.points': 'pts',
      'res.td': 'Touchdown', 'res.miss': 'To target', 'res.air': 'Airtime', 'res.attempts': 'Attempts', 'res.time': 'Time', 'res.energy': 'Energy left',
      'best.menu': '{mode} · your best: {grade} · {score} pts', 'best.hud': '{grade} · {score}',
      'part.inv': 'Inverted', 'part.air': 'Airtime', 'part.cleared': 'Cleared cars', 'part.righted': 'Righted', 'part.kick': 'Kickflip',
      'part.perfect': 'Perfect landing', 'part.soft': 'Soft landing', 'part.pad': 'Precision', 'part.energy': 'Energy left',
      'part.penaltyHard': 'Hard landing ×0.5', 'part.penaltyFlip': 'Rollover ×0.5',
      'grade.SS': 'First Pilot on Mars', 'grade.S': 'Interstellar-class Pilot', 'grade.A': 'Orbit-certified Pilot', 'grade.B': 'Proud Sports-Car Owner', 'grade.C': 'Still Waiting for Self-Driving', 'grade.D': 'Back to the Factory', 'grade.F': 'Rapid Unscheduled Disassembly',
      'menu.levels': 'Select a level',
      'btn.how': 'HOW TO PLAY',
      'btn.gotIt': 'Got it',
      'how.title': 'How to play',
      'how.throttle': 'Accelerate',
      'how.brake': 'Brake (in the air: reverse thrust)',
      'how.fans': 'Fan power (Q off / E max): stay above the white line – overdoing it drains energy fast',
      'how.jets': 'Thrusters: hold to lift off, hover and descend; auto-rights an upside-down car',
      'how.kick': 'Midair kickflip (bonus)',
      'how.retry': 'Retry',
      'how.pause': 'Pause',
      'how.mute': 'Mute',
      'how.note': 'In-game hints at the top tell you what to do next. On touch screens, use the on-screen buttons.',
      'key.space': 'SPACE',
      'key.desk': { SPACE: 'Space', UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→', F: 'F', G: 'G', R: 'R' },
      'key.touch': { SPACE: '[BOOST]', UP: '[FAN +]', DOWN: '[FAN −]', LEFT: '◀', RIGHT: '▶', F: '[FLIP]', G: '[ROLL]', R: '[↺]' },
    },
  };
  // 语言：玩家手动切换过就用他的选择；否则按浏览器的语言偏好列表，第一个是中文（zh / zh-CN / zh-TW / zh-HK…）就用中文，其他一律英文
  function browserLang() {
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    for (const l of list) {
      if (/^zh\b/i.test(l)) return 'zh';
      if (/^en\b/i.test(l)) return 'en';
    }
    return 'en';
  }
  let lang = '';
  try { lang = localStorage.getItem(KEY) || ''; } catch (e) { /* 忽略 */ }
  if (!D[lang]) lang = browserLang();
  const touch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  function t(key, vars) {
    let s = D[lang][key];
    if (s == null) s = D.zh[key];
    if (s == null) return key;
    return fill(s, vars);
  }
  // 把文案里的 {SPACE} {F} … 换成键盘按键或触屏按钮名（结算建议等不在词典里的文字也用它）
  function fill(s, vars) {
    const keys = D[lang][touch ? 'key.touch' : 'key.desk'];
    return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : keys[k] != null ? keys[k] : m));
  }
  function apply(rootEl) {
    const r = rootEl || document;
    r.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    r.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    r.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    r.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); el.title = el.getAttribute('aria-label'); });
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t('title');
  }
  const listeners = [];
  function set(l) {
    if (!D[l] || l === lang) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) { /* 忽略 */ }
    apply();
    listeners.forEach((fn) => fn(l));
  }
  CF.I18N = { t, fill, apply, set, onChange: (fn) => listeners.push(fn), get lang() { return lang; } };
})(window);

/* Scores for a finished run, and best scores kept in localStorage on this device */
(function (root) {
  'use strict';
  const CF = root.CF = root.CF || {};

  function best(mode, result) {
    const k = 'gravoff.best.' + mode;
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { /* ignore */ }
    if (!result) return prev;
    const isBest = !prev || result.score > prev.score;
    if (isBest) try { localStorage.setItem(k, JSON.stringify({ score: result.score, grade: result.grade })); } catch (e) { /* ignore */ }
    return { isBest, prevBest: prev ? prev.score : null, best: isBest ? result.score : prev.score, bestGrade: isBest ? result.grade : prev.grade };
  }

  CF.Record = {
    // score the run and update this device's best
    finish(mode, stats) {
      const r = CF.Score.compute(mode, stats);
      return { ...r, ...best(mode, r) };
    },
    best: (mode) => best(mode),
  };
})(window);

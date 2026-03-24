// app.js - State and logic

var APP = {
  userName: '',
  activeDay: 'friday',
  sel: null,
  allTiers: {},
  allScores: {},
  qpDay: 'friday',
  qpQueue: [],
  qpIdx: 0,
  schedFilter: ['S','A','B'],

  savedUsers: function() { return Object.keys(this.allTiers); },

  getTiers: function(user, day) {
    if (!this.allTiers[user]) this.allTiers[user] = {};
    if (!this.allTiers[user][day]) {
      var t = { unranked: ULTRA.artists(day) };
      ['S','A','B','C','D','F'].forEach(function(id) { t[id] = []; });
      this.allTiers[user][day] = t;
    }
    return this.allTiers[user][day];
  },

  resetDay: function(user, day) {
    if (!this.allTiers[user]) this.allTiers[user] = {};
    var t = { unranked: ULTRA.artists(day) };
    ['S','A','B','C','D','F'].forEach(function(id) { t[id] = []; });
    this.allTiers[user][day] = t;
  },

  saveUser: function() {
    try {
      localStorage.setItem('ultra2026_tiers', JSON.stringify(this.allTiers));
      localStorage.setItem('ultra2026_scores', JSON.stringify(this.allScores));
    } catch(e) {}
  },

  loadUser: function() {
    try {
      var t = localStorage.getItem('ultra2026_tiers');
      var s = localStorage.getItem('ultra2026_scores');
      if (t) this.allTiers = JSON.parse(t);
      if (s) this.allScores = JSON.parse(s);
    } catch(e) {}
  },

  initQP: function(day) {
    var arr = ULTRA.artists(day).slice().sort(function() { return Math.random() - 0.5; });
    var q = [];
    for (var i = 0; i < arr.length - 1; i += 2) q.push([arr[i], arr[i+1]]);
    if (arr.length % 2) q.push([arr[arr.length-1], arr[Math.floor(Math.random()*(arr.length-1))]]);
    this.qpQueue = q;
    this.qpIdx = 0;
    this.qpDay = day;
    if (!this.allScores[this.userName]) this.allScores[this.userName] = {};
    if (!this.allScores[this.userName][day]) {
      var scores = {};
      ULTRA.artists(day).forEach(function(a) { scores[a] = 0; });
      this.allScores[this.userName][day] = scores;
    }
  },

  applyQPToTiers: function(day) {
    var scores = (this.allScores[this.userName] || {})[day] || {};
    var sorted = ULTRA.artists(day).slice().sort(function(a,b) {
      return (scores[b]||0) - (scores[a]||0);
    });
    var total = sorted.length;
    var cuts = [0.05, 0.10, 0.15, 0.20, 0.20];
    var ids = ['S','A','B','C','D','F'];
    var t = { unranked: [] };
    var cur = 0;
    ids.forEach(function(tid, i) {
      var cnt = i < ids.length-1 ? Math.max(1, Math.ceil(total * cuts[i])) : total - cur;
      t[tid] = sorted.slice(cur, cur + cnt);
      cur += cnt;
    });
    if (!this.allTiers[this.userName]) this.allTiers[this.userName] = {};
    this.allTiers[this.userName][day] = t;
  },

  buildSchedule: function(user, day, tierFilter) {
    var ut = (this.allTiers[user] || {})[day];
    if (!ut) return { chosen: [], conflicts: [] };
    var cands = [];
    var tierRank = {S:0,A:1,B:2,C:3,D:4,F:5};
    tierFilter.forEach(function(tid) {
      (ut[tid]||[]).forEach(function(artist) {
        ULTRA.sets[day].filter(function(s) { return s.a === artist; }).forEach(function(slot) {
          cands.push({ a:slot.a, t:slot.t, e:slot.e, s:slot.s, tier:tid });
        });
      });
    });
    cands.sort(function(a,b) { return a.t-b.t || tierRank[a.tier]-tierRank[b.tier]; });
    var chosen = [], conflicts = [];
    cands.forEach(function(slot) {
      var blocked = null;
      for (var i = 0; i < chosen.length; i++) {
        if (chosen[i].t < slot.e && slot.t < chosen[i].e) { blocked = chosen[i]; break; }
      }
      if (!blocked) chosen.push(slot);
      else { slot.clashWith = blocked.a; conflicts.push(slot); }
    });
    return { chosen: chosen, conflicts: conflicts };
  },
};

// App State & Navigation

var APP = {
  // Current user
  userName: "",

  // Tiers per user per day: { "Matt": { friday: { S:[...], A:[...], ..., unranked:[...] } } }
  allTiers: {},

  // Quick pick scores: { "Matt": { friday: { "Artist": score } } }
  allScores: {},

  // Active UI state
  activeDay: "friday",
  activeMode: "home",   // home | quickpick | tierlist | schedule
  sel: null,            // selected artist chip { a, from }

  // Quick pick state
  qp: {
    day: "friday",
    queue: [],
    idx: 0,
  },

  // Schedule filter
  schedFilter: ["S", "A", "B"],

  // ── Tier helpers ──────────────────────────────────
  getTiers: function(user, day) {
    if (!this.allTiers[user]) this.allTiers[user] = {};
    if (!this.allTiers[user][day]) {
      var t = { unranked: ULTRA.artists(day) };
      ["S","A","B","C","D","F"].forEach(function(id) { t[id] = []; });
      this.allTiers[user][day] = t;
    }
    return this.allTiers[user][day];
  },

  resetDay: function(user, day) {
    var t = { unranked: ULTRA.artists(day) };
    ["S","A","B","C","D","F"].forEach(function(id) { t[id] = []; });
    this.allTiers[user][day] = t;
  },

  saveUser: function() {
    // persist to localStorage
    try {
      localStorage.setItem("ultra2026_tiers", JSON.stringify(this.allTiers));
      localStorage.setItem("ultra2026_scores", JSON.stringify(this.allScores));
    } catch(e) {}
  },

  loadUser: function() {
    try {
      var t = localStorage.getItem("ultra2026_tiers");
      var s = localStorage.getItem("ultra2026_scores");
      if (t) this.allTiers = JSON.parse(t);
      if (s) this.allScores = JSON.parse(s);
    } catch(e) {}
  },

  savedUsers: function() {
    return Object.keys(this.allTiers);
  },

  // ── Quick Pick helpers ────────────────────────────
  initQP: function(day) {
    var artists = ULTRA.artists(day).slice().sort(function() { return Math.random() - 0.5; });
    var queue = [];
    for (var i = 0; i < artists.length - 1; i += 2) {
      queue.push([artists[i], artists[i + 1]]);
    }
    if (artists.length % 2) {
      queue.push([artists[artists.length - 1], artists[Math.floor(Math.random() * (artists.length - 1))]]);
    }
    this.qp.queue = queue;
    this.qp.idx = 0;
    this.qp.day = day;
    if (!this.allScores[this.userName]) this.allScores[this.userName] = {};
    if (!this.allScores[this.userName][day]) {
      var scores = {};
      ULTRA.artists(day).forEach(function(a) { scores[a] = 0; });
      this.allScores[this.userName][day] = scores;
    }
  },

  applyQPToTiers: function(day) {
    var scores = (this.allScores[this.userName] || {})[day] || {};
    var sorted = ULTRA.artists(day).slice().sort(function(a, b) {
      return (scores[b] || 0) - (scores[a] || 0);
    });
    var total = sorted.length;
    var cuts = [0.05, 0.10, 0.15, 0.20, 0.20];
    var tierIds = ["S","A","B","C","D","F"];
    var cur = 0;
    var t = { unranked: [] };
    tierIds.forEach(function(tid, i) {
      var cnt = i < tierIds.length - 1 ? Math.max(1, Math.ceil(total * cuts[i])) : total - cur;
      t[tid] = sorted.slice(cur, cur + cnt);
      cur += cnt;
    });
    if (!this.allTiers[this.userName]) this.allTiers[this.userName] = {};
    this.allTiers[this.userName][day] = t;
  },

  // ── Schedule builder ─────────────────────────────
  buildSchedule: function(user, day, tierFilter) {
    var ut = (this.allTiers[user] || {})[day];
    if (!ut) return { chosen: [], conflicts: [] };
    var cands = [];
    tierFilter.forEach(function(tid) {
      (ut[tid] || []).forEach(function(artist) {
        ULTRA.sets[day].filter(function(s) { return s.a === artist; }).forEach(function(slot) {
          cands.push({ a: slot.a, t: slot.t, e: slot.e, s: slot.s, tier: tid });
        });
      });
    });
    cands.sort(function(a, b) {
      var tr = {S:0,A:1,B:2,C:3,D:4,F:5};
      return a.t - b.t || tr[a.tier] - tr[b.tier];
    });
    var chosen = [];
    var conflicts = [];
    cands.forEach(function(slot) {
      var blocked = chosen.find(function(c) { return c.t < slot.e && slot.t < c.e; });
      if (!blocked) { chosen.push(slot); }
      else { slot.clashWith = blocked.a; conflicts.push(slot); }
    });
    return { chosen: chosen, conflicts: conflicts };
  },
};

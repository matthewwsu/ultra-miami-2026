// UI Rendering

var UI = {

  esc: function(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  },

  show: function(screenId) {
    document.querySelectorAll(".screen").forEach(function(el) {
      el.classList.remove("active");
    });
    var el = document.getElementById(screenId);
    if (el) el.classList.add("active");
    window.scrollTo(0, 0);
  },

  // ────────────────────────────────────────────────
  // HOME
  // ────────────────────────────────────────────────
  renderHome: function() {
    this.show("screen-home");
    var self = this;

    var inp = document.getElementById("nameInput");
    var btnTier = document.getElementById("btnTier");
    var btnQP = document.getElementById("btnQP");

    inp.value = APP.userName;
    this.refreshHomeButtons();

    inp.oninput = function() {
      APP.userName = inp.value.trim();
      self.refreshHomeButtons();
    };
    inp.onkeydown = function(e) {
      if (e.key === "Enter" && APP.userName) self.goTierList();
    };
    btnTier.onclick = function() { self.goTierList(); };
    btnQP.onclick = function() { self.goQuickPick(); };

    document.getElementById("btnSchedule").onclick = function() { self.goSchedule(); };
    document.getElementById("btnCompare").onclick = function() { self.goCompare(); };

    this.renderSavedChips();
  },

  refreshHomeButtons: function() {
    var has = !!APP.userName;
    document.getElementById("btnTier").disabled = !has;
    document.getElementById("btnQP").disabled = !has;
    var saved = APP.savedUsers();
    document.getElementById("btnSchedule").style.display = saved.length ? "block" : "none";
    document.getElementById("btnCompare").style.display = saved.length >= 2 ? "block" : "none";
  },

  renderSavedChips: function() {
    var self = this;
    var saved = APP.savedUsers();
    var wrap = document.getElementById("savedChips");
    wrap.innerHTML = "";
    saved.forEach(function(name) {
      var chip = document.createElement("button");
      chip.className = "chip" + (name === APP.userName ? " active" : "");
      chip.textContent = name;
      chip.onclick = function() {
        APP.userName = name;
        document.getElementById("nameInput").value = name;
        self.refreshHomeButtons();
        self.renderSavedChips();
      };
      wrap.appendChild(chip);
    });
    document.getElementById("savedSection").style.display = saved.length ? "flex" : "none";
  },

  // ────────────────────────────────────────────────
  // QUICK PICK
  // ────────────────────────────────────────────────
  goQuickPick: function() {
    if (!APP.userName) return;
    APP.qp.day = "friday";
    APP.initQP("friday");
    this.show("screen-qp");
    this.renderQP();
  },

  renderQP: function() {
    var self = this;
    var d = APP.qp.day;

    // Day tabs
    var tabsEl = document.getElementById("qpDayTabs");
    tabsEl.innerHTML = "";
    ULTRA.days.forEach(function(day) {
      var btn = document.createElement("button");
      btn.className = "tab" + (day === d ? " active" : "");
      btn.textContent = ULTRA.dayLabels[day];
      btn.onclick = function() {
        APP.qp.day = day;
        APP.initQP(day);
        self.renderQP();
      };
      tabsEl.appendChild(btn);
    });

    document.getElementById("qpBack").onclick = function() { self.renderHome(); };
    document.getElementById("qpDone").onclick = function() {
      APP.applyQPToTiers(d);
      APP.saveUser();
      self.goTierList();
    };
    document.getElementById("qpSkip").onclick = function() {
      APP.qp.idx++;
      self.renderQP();
    };

    var q = APP.qp.queue;
    var i = APP.qp.idx;
    var prog = document.getElementById("qpProgress");

    if (i >= q.length) {
      // Done
      APP.applyQPToTiers(d);
      APP.saveUser();
      prog.style.width = "100%";
      document.getElementById("qpCounter").textContent = "Complete!";
      document.getElementById("qpArena").innerHTML =
        '<div class="qp-done">' +
        '<div class="qp-done-emoji">&#127881;</div>' +
        '<div class="qp-done-label">' + ULTRA.dayLabels[d] + ' RANKED!</div>' +
        '<button class="btn-primary" id="qpViewTier">View Tier List &rarr;</button>' +
        '</div>';
      document.getElementById("qpViewTier").onclick = function() { self.goTierList(); };
      return;
    }

    prog.style.width = Math.round((i / q.length) * 100) + "%";
    document.getElementById("qpCounter").textContent = (i + 1) + " / " + q.length;

    var a = q[i][0], b = q[i][1];
    document.getElementById("qpCardL").innerHTML = this.qpCardHTML(a, d);
    document.getElementById("qpCardR").innerHTML = this.qpCardHTML(b, d);

    var leftEl = document.getElementById("qpLeft");
    var rightEl = document.getElementById("qpRight");
    leftEl.className = "qp-side";
    rightEl.className = "qp-side";

    leftEl.onclick = function() {
      APP.allScores[APP.userName][d][a] = (APP.allScores[APP.userName][d][a] || 0) + 2;
      leftEl.classList.add("flash-win");
      setTimeout(function() { APP.qp.idx++; self.renderQP(); }, 200);
    };
    rightEl.onclick = function() {
      APP.allScores[APP.userName][d][b] = (APP.allScores[APP.userName][d][b] || 0) + 2;
      rightEl.classList.add("flash-win");
      setTimeout(function() { APP.qp.idx++; self.renderQP(); }, 200);
    };
  },

  qpCardHTML: function(artist, day) {
    var set = ULTRA.getSet(day, artist);
    var c1 = ULTRA.color1(artist), c2 = ULTRA.color2(artist);
    return '<div class="qp-avatar" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ')">' +
      ULTRA.initials(artist) + '</div>' +
      '<div class="qp-card-body">' +
      '<div class="qp-artist-name">' + this.esc(artist) + '</div>' +
      '<div class="qp-stage">' + (set ? this.esc(set.s) : "") + '</div>' +
      '<div class="qp-time">' + (set ? ULTRA.fmtTime(set.t) : "TBA") + '</div>' +
      '</div>';
  },

  // ────────────────────────────────────────────────
  // TIER LIST
  // ────────────────────────────────────────────────
  goTierList: function() {
    if (!APP.userName) return;
    APP.activeDay = "friday";
    APP.sel = null;
    this.show("screen-tier");
    this.renderTierHeader();
    this.renderTierRows();
  },

  renderTierHeader: function() {
    var self = this;
    document.getElementById("tierUserLabel").textContent = APP.userName.toUpperCase();
    document.getElementById("tierBack").onclick = function() { self.renderHome(); };
    document.getElementById("tierSaveBtn").onclick = function() {
      APP.saveUser();
      var btn = document.getElementById("tierSaveBtn");
      btn.textContent = "SAVED";
      btn.classList.add("saved");
      setTimeout(function() { btn.textContent = "SAVE"; btn.classList.remove("saved"); }, 1500);
    };
    document.getElementById("cancelSelBtn").onclick = function() {
      APP.sel = null;
      self.renderTierRows();
    };

    // Day tabs
    var tabsEl = document.getElementById("tierDayTabs");
    tabsEl.innerHTML = "";
    ULTRA.days.forEach(function(day) {
      var btn = document.createElement("button");
      btn.className = "tab" + (day === APP.activeDay ? " active" : "");
      btn.textContent = ULTRA.dayLabels[day];
      btn.onclick = function() {
        APP.activeDay = day;
        APP.sel = null;
        self.renderTierHeader();
        self.renderTierRows();
      };
      tabsEl.appendChild(btn);
    });

    // Reset button
    var resetBtn = document.createElement("button");
    resetBtn.className = "tab tab-danger";
    resetBtn.textContent = "RESET";
    resetBtn.onclick = function() {
      APP.resetDay(APP.userName, APP.activeDay);
      APP.sel = null;
      self.renderTierRows();
    };
    tabsEl.appendChild(resetBtn);
  },

  renderTierRows: function() {
    var self = this;
    var day = APP.activeDay;
    var ct = APP.getTiers(APP.userName, day);
    var sel = APP.sel;
    var hasSel = !!sel;
    var tierDefs = [
      {id:"S",c:"#ff3b3b"},{id:"A",c:"#ff8c00"},{id:"B",c:"#f5c400"},
      {id:"C",c:"#6fcc3a"},{id:"D",c:"#00bfff"},{id:"F",c:"#9966ff"}
    ];

    var wrap = document.getElementById("tierRows");
    wrap.innerHTML = "";

    tierDefs.forEach(function(tier) {
      var isTarget = hasSel && sel.from !== tier.id;
      var row = document.createElement("div");
      row.className = "tier-row" + (isTarget ? " drop-target" : "");

      var lbl = document.createElement("div");
      lbl.className = "tier-lbl";
      lbl.style.background = tier.c;
      lbl.textContent = tier.id;
      if (isTarget) {
        var glow = document.createElement("div");
        glow.className = "tier-lbl-glow";
        lbl.appendChild(glow);
      }

      var content = document.createElement("div");
      content.className = "tier-content";

      if (ct[tier.id].length === 0 && isTarget) {
        var ph = document.createElement("div");
        ph.className = "tier-placeholder";
        ph.textContent = "DROP HERE";
        ph.style.color = tier.c + "77";
        content.appendChild(ph);
      }

      ct[tier.id].forEach(function(a) {
        content.appendChild(self.makeArtistChip(a, tier.id, hasSel, day));
      });

      row.appendChild(lbl);
      row.appendChild(content);
      if (isTarget) row.onclick = function() { self.moveArtist(tier.id); };
      wrap.appendChild(row);
    });

    // Unranked box
    var unTarget = hasSel && sel.from !== "unranked";
    var ubox = document.getElementById("unrankedBox");
    ubox.className = "unranked-box" + (unTarget ? " drop-target" : "");
    document.getElementById("unrankedCount").textContent = ct.unranked.length + " artists";
    var ucontent = document.getElementById("unrankedContent");
    ucontent.innerHTML = "";
    ct.unranked.forEach(function(a) {
      ucontent.appendChild(self.makeArtistChip(a, "unranked", hasSel, day));
    });
    if (unTarget) ubox.onclick = function() { self.moveArtist("unranked"); };
    else ubox.onclick = null;

    // Cancel bar
    document.getElementById("cancelBar").style.display = hasSel ? "flex" : "none";
  },

  makeArtistChip: function(name, fromTier, hasSel, day) {
    var self = this;
    var sel = APP.sel;
    var isSel = sel && sel.a === name && sel.from === fromTier;
    var dimmed = hasSel && !isSel;
    var set = ULTRA.getSet(day, name);
    var c1 = ULTRA.color1(name), c2 = ULTRA.color2(name);

    var chip = document.createElement("div");
    chip.className = "artist-chip" + (isSel ? " selected" : "") + (dimmed ? " dimmed" : "");

    chip.innerHTML =
      '<div class="chip-icon" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ')">' +
      ULTRA.initials(name) + '</div>' +
      '<div class="chip-name">' + this.esc(name) + '</div>' +
      '<div class="chip-time">' + (set ? ULTRA.fmtTime(set.t) : "-") + '</div>' +
      '<div class="chip-stage">' + (set ? this.esc(set.s) : "") + '</div>';

    chip.onclick = function(e) {
      e.stopPropagation();
      if (isSel) APP.sel = null;
      else APP.sel = { a: name, from: fromTier };
      self.renderTierRows();
    };
    return chip;
  },

  moveArtist: function(target) {
    if (!APP.sel) return;
    var day = APP.activeDay;
    var ct = APP.getTiers(APP.userName, day);
    var a = APP.sel.a;
    var from = APP.sel.from;
    if (from === "unranked") ct.unranked = ct.unranked.filter(function(x) { return x !== a; });
    else ct[from] = ct[from].filter(function(x) { return x !== a; });
    if (target === "unranked") ct.unranked.push(a);
    else ct[target].push(a);
    APP.sel = null;
    this.renderTierRows();
  },

  // ────────────────────────────────────────────────
  // SCHEDULE
  // ────────────────────────────────────────────────
  goSchedule: function() {
    this.show("screen-schedule");
    APP.activeDay = "friday";
    this.renderSchedule();
  },

  renderSchedule: function() {
    var self = this;
    var saved = APP.savedUsers();
    var user = APP.allTiers[APP.userName] ? APP.userName : saved[0];

    document.getElementById("schedBack").onclick = function() { self.renderHome(); };

    // Day tabs
    var tabsEl = document.getElementById("schedDayTabs");
    tabsEl.innerHTML = "";
    ULTRA.days.forEach(function(day) {
      var btn = document.createElement("button");
      btn.className = "tab" + (day === APP.activeDay ? " active" : "");
      btn.textContent = ULTRA.dayLabels[day];
      btn.onclick = function() { APP.activeDay = day; self.renderScheduleBody(user); self.renderSchedule(); };
      tabsEl.appendChild(btn);
    });

    // Tier filter
    var filterEl = document.getElementById("schedFilter");
    filterEl.innerHTML = "";
    var tierDefs = [
      {id:"S",c:"#ff3b3b"},{id:"A",c:"#ff8c00"},{id:"B",c:"#f5c400"},
      {id:"C",c:"#6fcc3a"},{id:"D",c:"#00bfff"},{id:"F",c:"#9966ff"}
    ];
    tierDefs.forEach(function(t) {
      var on = APP.schedFilter.indexOf(t.id) >= 0;
      var btn = document.createElement("button");
      btn.className = "tier-filter-btn" + (on ? " on" : "");
      btn.textContent = t.id;
      btn.style.setProperty("--tc", t.c);
      btn.onclick = function() {
        var idx = APP.schedFilter.indexOf(t.id);
        if (idx >= 0) { if (APP.schedFilter.length > 1) APP.schedFilter.splice(idx, 1); }
        else { APP.schedFilter.push(t.id); }
        self.renderSchedule();
      };
      filterEl.appendChild(btn);
    });

    this.renderScheduleBody(user);
  },

  renderScheduleBody: function(user) {
    var self = this;
    var wrap = document.getElementById("schedBody");

    if (!user || !APP.allTiers[user]) {
      wrap.innerHTML = '<div class="empty-msg">Save your tier list first to generate a schedule.</div>';
      return;
    }

    var result = APP.buildSchedule(user, APP.activeDay, APP.schedFilter);
    var chosen = result.chosen;
    var conflicts = result.conflicts;
    var tierColors = {S:"#ff3b3b",A:"#ff8c00",B:"#f5c400",C:"#6fcc3a",D:"#00bfff",F:"#9966ff"};

    if (!chosen.length && !conflicts.length) {
      wrap.innerHTML = '<div class="empty-msg">No ranked artists found for selected tiers on this day.<br>Go rank some artists first!</div>';
      return;
    }

    var html = '<div class="sched-meta">' + this.esc(user.toUpperCase()) + ' &middot; ' + ULTRA.dayLabels[APP.activeDay] + '</div>';
    html += '<div class="sched-stats">';
    html += '<div class="sched-stat green">&#10003; ' + chosen.length + ' sets</div>';
    if (conflicts.length) html += '<div class="sched-stat orange">&#9889; ' + conflicts.length + ' conflicts</div>';
    html += '</div>';

    html += '<div class="sched-section-lbl">YOUR SCHEDULE</div>';
    chosen.sort(function(a,b){return a.t-b.t;}).forEach(function(slot, i) {
      var tc = tierColors[slot.tier] || "#888";
      html += '<div class="sched-slot" style="animation-delay:' + (i * 0.05) + 's">' +
        '<div class="sched-time">' + ULTRA.fmtTime(slot.t) + '</div>' +
        '<div class="sched-info">' +
        '<div class="sched-artist"><span class="tier-pip" style="background:' + tc + '">' + slot.tier + '</span>' + self.esc(slot.a) + '</div>' +
        '<div class="sched-stage">' + self.esc(slot.s) + '</div>' +
        '<div class="sched-until">Until ' + ULTRA.fmtTime(slot.e) + '</div>' +
        '</div></div>';
    });

    if (conflicts.length) {
      html += '<div class="sched-section-lbl conflict-lbl">&#9889; CONFLICTS</div>';
      conflicts.sort(function(a,b){return a.t-b.t;}).forEach(function(slot, i) {
        var tc = tierColors[slot.tier] || "#888";
        html += '<div class="sched-slot conflict" style="animation-delay:' + ((chosen.length + i) * 0.05) + 's">' +
          '<div class="sched-time dim">' + ULTRA.fmtTime(slot.t) + '</div>' +
          '<div class="sched-info">' +
          '<div class="sched-artist faded"><span class="tier-pip" style="background:' + tc + '">' + slot.tier + '</span>' + self.esc(slot.a) + '</div>' +
          '<div class="sched-stage">' + self.esc(slot.s) + '</div>' +
          '<div class="conflict-tag">&#9889; overlaps with ' + self.esc(slot.clashWith || "") + '</div>' +
          '</div></div>';
      });
    }

    wrap.innerHTML = html;
  },

  // ────────────────────────────────────────────────
  // COMPARE
  // ────────────────────────────────────────────────
  goCompare: function() {
    this.show("screen-compare");
    APP.activeDay = "friday";
    this.renderCompare();
  },

  renderCompare: function() {
    var self = this;
    document.getElementById("cmpBack").onclick = function() { self.renderHome(); };

    var tabsEl = document.getElementById("cmpDayTabs");
    tabsEl.innerHTML = "";
    ULTRA.days.forEach(function(day) {
      var btn = document.createElement("button");
      btn.className = "tab" + (day === APP.activeDay ? " active" : "");
      btn.textContent = ULTRA.dayLabels[day];
      btn.onclick = function() { APP.activeDay = day; self.renderCompareBody(); self.renderCompare(); };
      tabsEl.appendChild(btn);
    });

    this.renderCompareBody();
  },

  renderCompareBody: function() {
    var wrap = document.getElementById("cmpBody");
    var saved = APP.savedUsers();
    if (saved.length < 2) {
      wrap.innerHTML = '<div class="empty-msg">Need 2+ saved rankings to compare.</div>';
      return;
    }
    var u1 = saved[0], u2 = saved[1];
    var t1 = APP.getTiers(u1, APP.activeDay);
    var t2 = APP.getTiers(u2, APP.activeDay);
    var tierIds = ["S","A","B","C","D","F"];
    var tierColors = {S:"#ff3b3b",A:"#ff8c00",B:"#f5c400",C:"#6fcc3a",D:"#00bfff",F:"#9966ff"};
    var m1 = {}, m2 = {};
    tierIds.concat(["unranked"]).forEach(function(tid) {
      (t1[tid]||[]).forEach(function(a){m1[a]=tid;});
      (t2[tid]||[]).forEach(function(a){m2[a]=tid;});
    });

    var html = '<div class="cmp-header-row"><div class="cmp-col"><div class="cmp-user-lbl">' + this.esc(u1.toUpperCase()) + '</div></div><div class="cmp-col"><div class="cmp-user-lbl">' + this.esc(u2.toUpperCase()) + '</div></div></div>';

    var self = this;
    tierIds.forEach(function(tid) {
      var tc = tierColors[tid];
      html += '<div class="cmp-row">';
      [[u1, m2, t1],[u2, m1, t2]].forEach(function(pair) {
        var om = pair[1], ct = pair[2];
        html += '<div class="cmp-col"><div class="cmp-tier-row"><div class="cmp-tier-lbl" style="background:' + tc + '">' + tid + '</div><div class="cmp-tier-content">';
        (ct[tid] || []).forEach(function(a) {
          var match = om[a] === tid;
          var c1 = ULTRA.color1(a), c2 = ULTRA.color2(a);
          html += '<div class="cmp-chip">' +
            '<div class="cmp-icon' + (match ? ' match' : '') + '" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ')">' + ULTRA.initials(a) + '</div>' +
            '<div class="cmp-name">' + self.esc(a) + '</div>' +
            '</div>';
        });
        html += '</div></div></div>';
      });
      html += '</div>';
    });

    wrap.innerHTML = html;
  },
};

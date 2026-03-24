// ui.js - All rendering, no object methods, plain functions

function gid(id) { return document.getElementById(id); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  var el = gid(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

function htmlEsc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ═══════════════════════ HOME ═══════════════════════

function renderHome() {
  showScreen('screen-home');

  var inp = gid('nameInput');
  inp.value = APP.userName;
  refreshHomeButtons();

  inp.oninput = function() { APP.userName = inp.value.trim(); refreshHomeButtons(); };
  inp.onkeydown = function(e) { if (e.key === 'Enter' && APP.userName) goTierList(); };
  gid('btnTier').onclick = goTierList;
  gid('btnQP').onclick = goQuickPick;
  gid('btnSchedule').onclick = goSchedule;
  gid('btnCompare').onclick = goCompare;
}

function refreshHomeButtons() {
  var has = APP.userName.length > 0;
  gid('btnTier').disabled = !has;
  gid('btnQP').disabled = !has;

  var saved = APP.savedUsers();
  var sec = gid('savedSection');

  if (saved.length > 0) {
    sec.style.display = 'flex';
    var chips = gid('savedChips');
    chips.innerHTML = '';
    saved.forEach(function(name) {
      var btn = document.createElement('button');
      btn.className = 'chip' + (name === APP.userName ? ' active' : '');
      btn.textContent = name;
      btn.onclick = function() {
        APP.userName = name;
        gid('nameInput').value = name;
        refreshHomeButtons();
      };
      chips.appendChild(btn);
    });
    gid('btnSchedule').style.display = 'inline-block';
    gid('btnCompare').style.display = saved.length >= 2 ? 'inline-block' : 'none';
  } else {
    sec.style.display = 'none';
  }
}

// ═══════════════════════ QUICK PICK ═══════════════════════

function goQuickPick() {
  if (!APP.userName) return;
  APP.qpDay = 'friday';
  APP.initQP('friday');
  showScreen('screen-qp');
  renderQP();
}

function renderQP() {
  var d = APP.qpDay;
  var tabs = gid('qpDayTabs');
  tabs.innerHTML = '';
  ULTRA.days.forEach(function(day) {
    var btn = document.createElement('button');
    btn.className = 'tab' + (day === d ? ' active' : '');
    btn.textContent = ULTRA.dayLabels[day];
    btn.onclick = function() { APP.qpDay = day; APP.initQP(day); renderQP(); };
    tabs.appendChild(btn);
  });

  gid('qpBack').onclick = renderHome;
  gid('qpDone').onclick = function() { APP.applyQPToTiers(d); APP.saveUser(); goTierList(); };
  gid('qpSkip').onclick = function() { APP.qpIdx++; renderQP(); };
  gid('qpSwitchTier').onclick = goTierList;

  var q = APP.qpQueue;
  var i = APP.qpIdx;
  var prog = gid('qpProgress');

  if (i >= q.length) {
    APP.applyQPToTiers(d);
    APP.saveUser();
    prog.style.width = '100%';
    gid('qpCounter').textContent = 'Done!';
    gid('qpArena').innerHTML =
      '<div class="qp-done">' +
      '<div class="qp-done-emoji">&#127881;</div>' +
      '<div class="qp-done-label">' + ULTRA.dayLabels[d] + ' RANKED!</div>' +
      '<button class="btn-primary" id="qpViewTier" style="width:auto;padding:12px 28px;">View Tier List &rarr;</button>' +
      '</div>';
    gid('qpViewTier').onclick = goTierList;
    return;
  }

  prog.style.width = Math.round((i / q.length) * 100) + '%';
  gid('qpCounter').textContent = (i + 1) + ' / ' + q.length;

  var a = q[i][0], b = q[i][1];
  gid('qpCardL').innerHTML = qpCardHTML(a, d);
  gid('qpCardR').innerHTML = qpCardHTML(b, d);
  gid('qpLeft').className = 'qp-side';
  gid('qpRight').className = 'qp-side';

  gid('qpLeft').onclick = function() {
    APP.allScores[APP.userName][d][a] = (APP.allScores[APP.userName][d][a] || 0) + 2;
    gid('qpLeft').classList.add('flash-win');
    setTimeout(function() { APP.qpIdx++; renderQP(); }, 200);
  };
  gid('qpRight').onclick = function() {
    APP.allScores[APP.userName][d][b] = (APP.allScores[APP.userName][d][b] || 0) + 2;
    gid('qpRight').classList.add('flash-win');
    setTimeout(function() { APP.qpIdx++; renderQP(); }, 200);
  };
}

function qpCardHTML(artist, day) {
  var set = ULTRA.getSet(day, artist);
  var c1 = ULTRA.color1(artist), c2 = ULTRA.color2(artist);
  return '<div class="qp-avatar" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ')">' +
    ULTRA.initials(artist) + '</div>' +
    '<div class="qp-card-body">' +
    '<div class="qp-artist-name">' + htmlEsc(artist) + '</div>' +
    '<div class="qp-stage">' + (set ? htmlEsc(set.s) : '') + '</div>' +
    '<div class="qp-time">' + (set ? ULTRA.fmtTime(set.t) : 'TBA') + '</div>' +
    '</div>';
}

// ═══════════════════════ TIER LIST ═══════════════════════

var TIER_DEFS = [
  {id:'S',c:'#ff3b3b'},{id:'A',c:'#ff8c00'},{id:'B',c:'#f5c400'},
  {id:'C',c:'#6fcc3a'},{id:'D',c:'#00bfff'},{id:'F',c:'#9966ff'}
];

function goTierList() {
  if (!APP.userName) return;
  APP.activeDay = 'friday';
  APP.sel = null;
  showScreen('screen-tier');
  renderTierHeader();
  renderTierRows();
}

function renderTierHeader() {
  gid('tierUserLabel').textContent = APP.userName.toUpperCase();
  gid('tierBack').onclick = renderHome;
  gid('tierSaveBtn').onclick = function() {
    APP.saveUser();
    gid('tierSaveBtn').textContent = 'SAVED';
    gid('tierSaveBtn').classList.add('saved');
    setTimeout(function() {
      gid('tierSaveBtn').textContent = 'SAVE';
      gid('tierSaveBtn').classList.remove('saved');
    }, 1500);
  };
  gid('cancelSelBtn').onclick = function() { APP.sel = null; renderTierRows(); };

  var tabs = gid('tierDayTabs');
  tabs.innerHTML = '';
  ULTRA.days.forEach(function(day) {
    var btn = document.createElement('button');
    btn.className = 'tab' + (day === APP.activeDay ? ' active' : '');
    btn.textContent = ULTRA.dayLabels[day];
    btn.onclick = function() { APP.activeDay = day; APP.sel = null; renderTierHeader(); renderTierRows(); };
    tabs.appendChild(btn);
  });
  var resetBtn = document.createElement('button');
  resetBtn.className = 'tab tab-danger';
  resetBtn.textContent = 'RESET';
  resetBtn.onclick = function() { APP.resetDay(APP.userName, APP.activeDay); APP.sel = null; renderTierRows(); };
  tabs.appendChild(resetBtn);
}

function renderTierRows() {
  var day = APP.activeDay;
  var ct = APP.getTiers(APP.userName, day);
  var sel = APP.sel;
  var hasSel = !!sel;

  var wrap = gid('tierRows');
  wrap.innerHTML = '';

  TIER_DEFS.forEach(function(tier) {
    var isTarget = hasSel && sel.from !== tier.id;
    var row = document.createElement('div');
    row.className = 'tier-row' + (isTarget ? ' drop-target' : '');

    var lbl = document.createElement('div');
    lbl.className = 'tier-lbl';
    lbl.style.background = tier.c;
    lbl.textContent = tier.id;
    if (isTarget) {
      var glow = document.createElement('div');
      glow.className = 'tier-lbl-glow';
      lbl.appendChild(glow);
    }

    var content = document.createElement('div');
    content.className = 'tier-content';

    if (ct[tier.id].length === 0 && isTarget) {
      var ph = document.createElement('div');
      ph.className = 'tier-placeholder';
      ph.textContent = 'DROP HERE';
      ph.style.color = tier.c + '77';
      content.appendChild(ph);
    }

    ct[tier.id].forEach(function(a) { content.appendChild(makeChip(a, tier.id, hasSel, day)); });
    row.appendChild(lbl);
    row.appendChild(content);
    if (isTarget) { (function(tid) { row.onclick = function() { moveArtist(tid); }; })(tier.id); }
    wrap.appendChild(row);
  });

  // Unranked
  var uTarget = hasSel && sel.from !== 'unranked';
  var ubox = gid('unrankedBox');
  ubox.className = 'unranked-box' + (uTarget ? ' drop-target' : '');
  gid('unrankedCount').textContent = ct.unranked.length + ' artists';
  var uc = gid('unrankedContent');
  uc.innerHTML = '';
  ct.unranked.forEach(function(a) { uc.appendChild(makeChip(a, 'unranked', hasSel, day)); });
  ubox.onclick = uTarget ? function() { moveArtist('unranked'); } : null;
  gid('cancelBar').style.display = hasSel ? 'flex' : 'none';
}

function makeChip(name, fromTier, hasSel, day) {
  var sel = APP.sel;
  var isSel = sel && sel.a === name && sel.from === fromTier;
  var dimmed = hasSel && !isSel;
  var set = ULTRA.getSet(day, name);
  var c1 = ULTRA.color1(name), c2 = ULTRA.color2(name);

  var chip = document.createElement('div');
  chip.className = 'artist-chip' + (isSel ? ' selected' : '') + (dimmed ? ' dimmed' : '');
  chip.innerHTML =
    '<div class="chip-icon" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ')">' + ULTRA.initials(name) + '</div>' +
    '<div class="chip-name">' + htmlEsc(name) + '</div>' +
    '<div class="chip-time">' + (set ? ULTRA.fmtTime(set.t) : '-') + '</div>' +
    '<div class="chip-stage">' + (set ? htmlEsc(set.s) : '') + '</div>';

  (function(n, ft, wasSel) {
    chip.onclick = function(e) {
      e.stopPropagation();
      APP.sel = wasSel ? null : { a: n, from: ft };
      renderTierRows();
    };
  })(name, fromTier, isSel);

  return chip;
}

function moveArtist(target) {
  if (!APP.sel) return;
  var day = APP.activeDay;
  var ct = APP.getTiers(APP.userName, day);
  var a = APP.sel.a, from = APP.sel.from;
  if (from === 'unranked') ct.unranked = ct.unranked.filter(function(x) { return x !== a; });
  else ct[from] = ct[from].filter(function(x) { return x !== a; });
  if (target === 'unranked') ct.unranked.push(a);
  else ct[target].push(a);
  APP.sel = null;
  renderTierRows();
}

// ═══════════════════════ SCHEDULE ═══════════════════════

function goSchedule() {
  showScreen('screen-schedule');
  APP.activeDay = 'friday';
  APP.schedFilter = ['S','A','B'];
  renderSchedule();
}

function renderSchedule() {
  gid('schedBack').onclick = renderHome;

  var tabs = gid('schedDayTabs');
  tabs.innerHTML = '';
  ULTRA.days.forEach(function(day) {
    var btn = document.createElement('button');
    btn.className = 'tab' + (day === APP.activeDay ? ' active' : '');
    btn.textContent = ULTRA.dayLabels[day];
    btn.onclick = function() { APP.activeDay = day; renderSchedule(); };
    tabs.appendChild(btn);
  });

  var filterEl = gid('schedFilter');
  filterEl.innerHTML = '';
  var tierColors = {S:'#ff3b3b',A:'#ff8c00',B:'#f5c400',C:'#6fcc3a',D:'#00bfff',F:'#9966ff'};
  Object.keys(tierColors).forEach(function(tid) {
    var on = APP.schedFilter.indexOf(tid) >= 0;
    var btn = document.createElement('button');
    btn.className = 'tier-filter-btn' + (on ? ' on' : '');
    btn.textContent = tid;
    btn.style.setProperty('--tc', tierColors[tid]);
    btn.onclick = function() {
      var idx = APP.schedFilter.indexOf(tid);
      if (idx >= 0) { if (APP.schedFilter.length > 1) APP.schedFilter.splice(idx, 1); }
      else APP.schedFilter.push(tid);
      renderSchedule();
    };
    filterEl.appendChild(btn);
  });

  renderScheduleBody();
}

function renderScheduleBody() {
  var saved = APP.savedUsers();
  var wrap = gid('schedBody');
  if (!saved.length) {
    wrap.innerHTML = '<div class="empty-msg">Save your tier list first to generate a schedule.</div>';
    return;
  }
  var user = APP.allTiers[APP.userName] ? APP.userName : saved[0];
  var result = APP.buildSchedule(user, APP.activeDay, APP.schedFilter);
  var chosen = result.chosen, conflicts = result.conflicts;
  var tierColors = {S:'#ff3b3b',A:'#ff8c00',B:'#f5c400',C:'#6fcc3a',D:'#00bfff',F:'#9966ff'};

  if (!chosen.length && !conflicts.length) {
    wrap.innerHTML = '<div class="empty-msg">No ranked artists in selected tiers for this day.<br>Go rank some artists first!</div>';
    return;
  }

  var h = '<div class="sched-meta">' + htmlEsc(user.toUpperCase()) + ' &middot; ' + ULTRA.dayLabels[APP.activeDay] + '</div>';
  h += '<div class="sched-stats">';
  h += '<div class="sched-stat green">&#10003; ' + chosen.length + ' sets</div>';
  if (conflicts.length) h += '<div class="sched-stat orange">&#9889; ' + conflicts.length + ' conflicts</div>';
  h += '</div>';
  h += '<div class="sched-section-lbl">YOUR SCHEDULE</div>';

  chosen.sort(function(a,b){return a.t-b.t;}).forEach(function(sl, i) {
    var tc = tierColors[sl.tier] || '#888';
    h += '<div class="sched-slot" style="animation-delay:' + (i*0.05) + 's">' +
      '<div class="sched-time">' + ULTRA.fmtTime(sl.t) + '</div>' +
      '<div class="sched-info">' +
      '<div class="sched-artist"><span class="tier-pip" style="background:' + tc + '">' + sl.tier + '</span>' + htmlEsc(sl.a) + '</div>' +
      '<div class="sched-stage">' + htmlEsc(sl.s) + '</div>' +
      '<div class="sched-until">Until ' + ULTRA.fmtTime(sl.e) + '</div>' +
      '</div></div>';
  });

  if (conflicts.length) {
    h += '<div class="sched-section-lbl conflict-lbl">&#9889; CONFLICTS</div>';
    conflicts.sort(function(a,b){return a.t-b.t;}).forEach(function(sl, i) {
      var tc = tierColors[sl.tier] || '#888';
      h += '<div class="sched-slot conflict" style="animation-delay:' + ((chosen.length+i)*0.05) + 's">' +
        '<div class="sched-time dim">' + ULTRA.fmtTime(sl.t) + '</div>' +
        '<div class="sched-info">' +
        '<div class="sched-artist faded"><span class="tier-pip" style="background:' + tc + '">' + sl.tier + '</span>' + htmlEsc(sl.a) + '</div>' +
        '<div class="sched-stage">' + htmlEsc(sl.s) + '</div>' +
        '<div class="conflict-tag">&#9889; overlaps with ' + htmlEsc(sl.clashWith || '') + '</div>' +
        '</div></div>';
    });
  }
  wrap.innerHTML = h;
}

// ═══════════════════════ COMPARE ═══════════════════════

function goCompare() {
  showScreen('screen-compare');
  APP.activeDay = 'friday';
  renderCompare();
}

function renderCompare() {
  gid('cmpBack').onclick = renderHome;
  var tabs = gid('cmpDayTabs');
  tabs.innerHTML = '';
  ULTRA.days.forEach(function(day) {
    var btn = document.createElement('button');
    btn.className = 'tab' + (day === APP.activeDay ? ' active' : '');
    btn.textContent = ULTRA.dayLabels[day];
    btn.onclick = function() { APP.activeDay = day; renderCompare(); };
    tabs.appendChild(btn);
  });
  renderCompareBody();
}

function renderCompareBody() {
  var saved = APP.savedUsers();
  var wrap = gid('cmpBody');
  if (saved.length < 2) {
    wrap.innerHTML = '<div class="empty-msg">Need 2+ saved rankings to compare.</div>';
    return;
  }
  var u1 = saved[0], u2 = saved[1];
  var t1 = APP.getTiers(u1, APP.activeDay);
  var t2 = APP.getTiers(u2, APP.activeDay);
  var tierIds = ['S','A','B','C','D','F'];
  var tierColors = {S:'#ff3b3b',A:'#ff8c00',B:'#f5c400',C:'#6fcc3a',D:'#00bfff',F:'#9966ff'};
  var m1 = {}, m2 = {};
  tierIds.concat(['unranked']).forEach(function(tid) {
    (t1[tid]||[]).forEach(function(a){m1[a]=tid;});
    (t2[tid]||[]).forEach(function(a){m2[a]=tid;});
  });

  var h = '<div class="cmp-header-row"><div class="cmp-col"><div class="cmp-user-lbl">' + htmlEsc(u1.toUpperCase()) + '</div></div><div class="cmp-col"><div class="cmp-user-lbl">' + htmlEsc(u2.toUpperCase()) + '</div></div></div>';
  tierIds.forEach(function(tid) {
    var tc = tierColors[tid];
    h += '<div class="cmp-row">';
    [[u1,m2,t1],[u2,m1,t2]].forEach(function(pair) {
      var om = pair[1], ct = pair[2];
      h += '<div class="cmp-col"><div class="cmp-tier-row"><div class="cmp-tier-lbl" style="background:' + tc + '">' + tid + '</div><div class="cmp-tier-content">';
      (ct[tid]||[]).forEach(function(a) {
        var c1 = ULTRA.color1(a), c2 = ULTRA.color2(a);
        h += '<div class="cmp-chip"><div class="cmp-icon' + (om[a]===tid?' match':'') + '" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ')">' + ULTRA.initials(a) + '</div><div class="cmp-name">' + htmlEsc(a) + '</div></div>';
      });
      h += '</div></div></div>';
    });
    h += '</div>';
  });
  wrap.innerHTML = h;
}

// ═══════════════════════ BOOT ═══════════════════════
APP.loadUser();
renderHome();

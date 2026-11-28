(function () {
  var KEY = "habit-sleep-tracker-v1";
  var R = 250, r = 96, N = 10, D = 31, CX = 320, CY = 330, SWEEP = 283;
  var DEG = SWEEP / D, T = (R - r) / N;
  var HOURS = ["10 hrs", "9 hrs", "8 hrs", "7 hrs", "6 hrs", "5 hrs", "< 5 hrs"];
  var HVAL = [10, 9, 8, 7, 6, 5, 4];
  var NS = "http://www.w3.org/2000/svg";
  var now = new Date();
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var realKey = now.getFullYear() + "-" + (now.getMonth() + 1);
  // The month being shown. Defaults to this month; the month buttons change it (kept for this browser tab only).
  var vKey = realKey;
  try { var sv = sessionStorage.getItem("habit-view"); if (/^\d{4}-\d{1,2}$/.test(sv || "")) vKey = sv; } catch (e) {}
  var vy = +vKey.split("-")[0], vm = +vKey.split("-")[1] - 1;
  var today = vKey === realKey ? now.getDate() : 0;
  var DIM = new Date(vy, vm + 1, 0).getDate();
  function monthLabel() { return MONTHS[vm] + " " + vy; }

  function fresh() {
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return { habits: ["", "", "", "", "", "", "", "", "", ""], cells: {}, sleep: {}, water: {}, waterGoal: 5000, waterMl: {}, steps: {}, stepGoal: 11, notes: ["", ""], month: monthLabel(), monthKey: vKey, archive: {}, name: "" };
  }
  var state = fresh();
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var p = JSON.parse(raw); if (p && p.habits) state = Object.assign(fresh(), p); }
  } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  // Upgrade older saves: water glasses -> millilitres, drop the removed Contract & reward box.
  if (state.waterV !== 2) {
    state.waterMl = state.waterMl || {};
    Object.keys(state.water || {}).forEach(function (k) { state.waterMl[k] = (state.waterMl[k] || 0) + state.water[k] * 250; });
    state.water = {}; state.waterV = 2;
  }
  if (state.sleepV !== 2) { // sleep used to be a row number (10 hrs ... under 5); now exact hours typed in
    var rowHrs = [10, 9, 8, 7, 6, 5, 4];
    var toHrs = function (o) { Object.keys(o || {}).forEach(function (k) { if (Number.isInteger(o[k]) && o[k] >= 0 && o[k] <= 6) o[k] = rowHrs[o[k]]; }); };
    toHrs(state.sleep);
    Object.keys(state.archive || {}).forEach(function (mk) { toHrs(state.archive[mk].sleep); });
    state.sleepV = 2;
  }
  if (state.notesV !== 2) {
    if (Array.isArray(state.notes) && state.notes.length === 3) state.notes = [state.notes[0], state.notes[2]];
    if (Array.isArray(state.noteLines) && state.noteLines.length === 3) state.noteLines = [state.noteLines[0], state.noteLines[2]];
    state.notesV = 2;
  }
  if (!state.steps) state.steps = {};
  if (state.stepsV !== 2) { // steps used to be stored in thousands; now exact steps
    Object.keys(state.steps).forEach(function (d) { if (state.steps[d] <= 60) state.steps[d] *= 1000; });
    Object.keys(state.archive || {}).forEach(function (mk) { var s = state.archive[mk].steps || {}; Object.keys(s).forEach(function (d) { if (s[d] <= 60) s[d] *= 1000; }); });
    state.stepsV = 2;
  }
  if (!state.waterMl) state.waterMl = {};
  if (!(state.stepGoal > 0)) state.stepGoal = 11;

  // Switch the working sheet to the month being viewed. The sheet we leave is kept in the archive,
  // and an archived month is brought back when you open it again (nothing is ever lost).
  var monthKey = vKey;
  if (state.monthKey && state.monthKey !== monthKey) {
    state.archive = state.archive || {};
    state.archive[state.monthKey] = { month: state.month, cells: state.cells, sleep: state.sleep, waterMl: state.waterMl, steps: state.steps, notes: (state.notes || []).slice() };
    var back = state.archive[monthKey];
    if (back) {
      state.cells = back.cells || {}; state.sleep = back.sleep || {}; state.waterMl = back.waterMl || {}; state.steps = back.steps || {};
      if (back.notes) state.notes = back.notes;
      state.month = back.month || monthLabel();
      delete state.archive[monthKey];
    } else {
      state.cells = {}; state.sleep = {}; state.waterMl = {}; state.steps = {};
      state.month = monthLabel();
    }
  }
  state.monthKey = monthKey;
  save();

  if (!Array.isArray(state.habits) || !state.habits.length) state.habits = fresh().habits;

  // Ready-made habit names. They fill empty lines and can be renamed like any other habit.
  var OLD_DEFAULTS = ["Wake up early", "Drink water", "Exercise", "Read", "Meditate", "Eat healthy", "Journal", "Study or learn", "No phone before bed", "Sleep on time"];
  var DEFAULT_HABITS = ["Wake up 5:00 AM", "Drink water 3L to 4L", "No junk food", "Walk every day 8k to 10k steps", "Daily gym", "Sleep for 6 to 9 hours", "No sugar", "Take a cold shower", "Read a newspaper"];
  if (state.defaultsV !== 2) {
    state.habits = state.habits.map(function (h, i) {
      var name = (h || "").trim();
      return (!name || name === OLD_DEFAULTS[i]) ? (DEFAULT_HABITS[i] || "") : h;
    });
    state.defaultsV = 2;
    save();
  }

  function pt(rad, a) {
    var t = a * Math.PI / 180;
    return (CX + rad * Math.cos(t)).toFixed(2) + " " + (CY - rad * Math.sin(t)).toFixed(2);
  }
  function wedge(k, i) {
    var ro = R - k * T, ri = ro - T, a0 = 90 - i * DEG, a1 = a0 - DEG;
    return "M" + pt(ro, a0) + "A" + ro + " " + ro + " 0 0 1 " + pt(ro, a1) +
           "L" + pt(ri, a1) + "A" + ri + " " + ri + " 0 0 0 " + pt(ri, a0) + "Z";
  }

  var svg = document.getElementById("ring");
  var g = document.createElementNS(NS, "g");
  svg.appendChild(g);
  var cellEls = {};
  var dayEls = [];
  var wdEls = [];
  var RING_WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var rows = document.getElementById("habit-rows");
  var counts = [];
  var labelEls = [];
  function shortName(s) { s = (s || "").trim(); return s.length > 38 ? s.slice(0, 37) + "…" : s; }
  for (var d = 0; d < D; d++) {
    var a = (90 - (d + 0.5) * DEG) * Math.PI / 180;
    var tx = document.createElementNS(NS, "text");
    tx.setAttribute("x", (CX + (R + 14) * Math.cos(a)).toFixed(2));
    tx.setAttribute("y", (CY - (R + 14) * Math.sin(a)).toFixed(2));
    tx.setAttribute("class", "dayno" + (d + 1 === today ? " today" : ""));
    tx.textContent = d + 1;
    dayEls.push(tx);
    svg.appendChild(tx);
    // Weekday name (Sun to Sat) just outside the day number. Recalculated from the real calendar, so it changes every month.
    var wd = document.createElementNS(NS, "text");
    wd.setAttribute("x", (CX + (R + 36) * Math.cos(a)).toFixed(2));
    wd.setAttribute("y", (CY - (R + 36) * Math.sin(a)).toFixed(2));
    var wdi = new Date(vy, vm, d + 1).getDay();
    wd.setAttribute("class", "dayname" + (wdi === 0 ? " sun" : "") + (d + 1 === today ? " today" : "") + (d >= DIM ? " off" : ""));
    wd.textContent = RING_WD[wdi];
    wdEls.push(wd);
    svg.appendChild(wd);
  }

  // Draws the ring, the numbers and the habit rows for however many habits there are.
  function buildHabits() {
    N = state.habits.length;
    T = (R - r) / N;
    g.textContent = "";
    cellEls = {};
    var oldNums = svg.querySelectorAll(".ringnum, .ringlabel");
    for (var o = 0; o < oldNums.length; o++) oldNums[o].remove();
    for (var k = 0; k < N; k++) {
      for (var i = 0; i < D; i++) {
        var el = document.createElementNS(NS, "path");
        el.setAttribute("d", wedge(k, i));
        el.setAttribute("class", i >= DIM ? "cell off" : "cell");
        el.setAttribute("data-k", k);
        el.setAttribute("data-i", i);
        g.appendChild(el);
        cellEls[k + "-" + i] = el;
      }
    }
    // Today's whole day slice (every habit ring) gets a bright outline so it stands out.
    if (today > 0 && today <= DIM) {
      var ti = today - 1, ta0 = 90 - ti * DEG, ta1 = ta0 - DEG, tb = document.createElementNS(NS, "path");
      tb.setAttribute("d", "M" + pt(R, ta0) + "A" + R + " " + R + " 0 0 1 " + pt(R, ta1) + "L" + pt(r, ta1) + "A" + r + " " + r + " 0 0 0 " + pt(r, ta0) + "Z");
      tb.setAttribute("class", "todaybox");
      g.appendChild(tb);
    }
    var nf = Math.min(13, T * 0.9);
    for (var n = 0; n < N && nf >= 6; n++) {
      var rn = document.createElementNS(NS, "text");
      rn.setAttribute("x", CX - 6);
      rn.setAttribute("y", (CY - (R - (n + 0.5) * T)).toFixed(2));
      rn.setAttribute("class", "ringnum");
      rn.style.fontSize = nf + "px";
      rn.textContent = n + 1;
      svg.appendChild(rn);
    }
    labelEls = [];
    var lf = Math.min(15, T * 0.95);
    for (var ln = 0; N <= 12 && ln < N; ln++) {
      var lt = document.createElementNS(NS, "text");
      lt.setAttribute("x", CX - 24);
      lt.setAttribute("y", (CY - (R - (ln + 0.5) * T)).toFixed(2));
      lt.setAttribute("class", "ringlabel");
      lt.style.fontSize = lf + "px";
      lt.textContent = shortName(state.habits[ln]);
      svg.appendChild(lt);
      labelEls.push(lt);
    }
    rows.textContent = "";
    rows.style.setProperty("--n", N);
    document.getElementById("stage").classList.toggle("many", N > 12);
    counts = [];
    for (var h = 0; h < N; h++) {
      var row = document.createElement("div");
      row.className = "habit-row";
      var num = document.createElement("span");
      num.className = "n"; num.textContent = (h + 1) + ".";
      var inp = document.createElement("input");
      inp.type = "text"; inp.id = "habit-" + h; inp.value = state.habits[h] || "";
      inp.setAttribute("aria-label", "Habit " + (h + 1));
      inp.placeholder = "Habit " + (h + 1);
      inp.spellcheck = false;
      (function (idx) { inp.addEventListener("input", function (e) { state.habits[idx] = e.target.value; if (labelEls[idx]) labelEls[idx].textContent = shortName(e.target.value); save(); ciRender(); }); })(h);
      var cnt = document.createElement("span");
      cnt.className = "count";
      counts.push(cnt);
      row.appendChild(num); row.appendChild(inp); row.appendChild(cnt);
      rows.appendChild(row);
    }
  }
  buildHabits();


  // Sleep chart: clean line chart (hours on the right, days along the bottom).
  var sc = document.getElementById("sc");
  function drawSleepChart() {
    var box = sc.parentNode, w = Math.max(280, box.clientWidth - 28), h = 250;
    var L = 6, Rg = 34, T = 14, B = 28, pw = w - L - Rg, ph = h - T - B;
    var days = Object.keys(state.sleep).map(Number).filter(function (q) { return q < DIM; }).sort(function (p, q) { return p - q; });
    var vals = days.map(function (q) { return state.sleep[q]; });
    var lo = vals.length ? Math.min(4, Math.floor(Math.min.apply(null, vals))) : 4;
    var hi = vals.length ? Math.max(10, Math.ceil(Math.max.apply(null, vals))) : 10;
    var st = hi - lo > 8 ? 2 : 1; hi = lo + Math.ceil((hi - lo) / st) * st;
    function X(d) { return L + (d + 0.5) / DIM * pw; }
    function Yv(v) { return T + (hi - v) / (hi - lo) * ph; }
    sc.setAttribute("width", w); sc.setAttribute("height", h); sc.setAttribute("viewBox", "0 0 " + w + " " + h);
    var o = '<rect class="sc-band" x="' + L + '" y="' + Yv(9) + '" width="' + pw + '" height="' + (Yv(6) - Yv(9)) + '"/>';
    for (var v = lo; v <= hi; v += st) {
      o += '<line class="' + (v === lo ? "sc-axis" : "sc-grid") + '" x1="' + L + '" y1="' + Yv(v) + '" x2="' + (L + pw) + '" y2="' + Yv(v) + '"/>';
      o += '<text class="sc-y" x="' + (L + pw + 10) + '" y="' + Yv(v) + '">' + v + '</text>';
    }
    for (var d = 0; d < DIM; d += 2) {
      o += '<line class="sc-axis" x1="' + X(d) + '" y1="' + Yv(lo) + '" x2="' + X(d) + '" y2="' + (Yv(lo) + 5) + '"/>';
      o += '<text class="sc-x' + (d + 1 === today ? " today" : "") + '" x="' + X(d) + '" y="' + (Yv(lo) + 19) + '">' + (d + 1) + '</text>';
    }
    var sum = 0; vals.forEach(function (q) { sum += q; });
    if (days.length) o += '<line class="sc-avg" x1="' + L + '" y1="' + Yv(sum / days.length) + '" x2="' + (L + pw) + '" y2="' + Yv(sum / days.length) + '"/>';
    // Green = hours went up from the previous logged night, red = went down.
    var halo = "", segs = "";
    for (var i = 0; i < days.length - 1; i++) {
      var dir = vals[i + 1] > vals[i] ? "up" : vals[i + 1] < vals[i] ? "down" : "flat";
      var xy = ' x1="' + X(days[i]) + '" y1="' + Yv(vals[i]) + '" x2="' + X(days[i + 1]) + '" y2="' + Yv(vals[i + 1]) + '"/>';
      segs += '<line class="sc-line ' + dir + (days[i + 1] === days[i] + 1 ? "" : " gap") + '"' + xy;
    }
    o += halo + segs;
    days.forEach(function (q, i) { var dir = i === 0 ? "flat" : vals[i] > vals[i - 1] ? "up" : vals[i] < vals[i - 1] ? "down" : "flat"; o += '<circle class="sc-dot ' + dir + '" cx="' + X(q) + '" cy="' + Yv(vals[i]) + '" r="4"/>'; });
    if (!days.length) o += '<text class="sc-empty" x="' + (L + pw / 2) + '" y="' + (T + ph / 2) + '">Type your hours below to see the graph</text>';
    sc.innerHTML = o;
    document.getElementById("sc-avg").textContent = days.length ? "Average " + (sum / days.length).toFixed(1) + " hrs" : "Average";
  }
  window.addEventListener("resize", drawSleepChart);
  if (window.ResizeObserver) new ResizeObserver(drawSleepChart).observe(sc.parentNode);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawSleepChart);

  var pctEl = document.getElementById("pct");
  var nightsEl = document.getElementById("nights");
  var avgEl = document.getElementById("avg");

  function render() {
    var total = 0, perHabit = new Array(N).fill(0);
    for (var key in cellEls) {
      var v = state.cells[key] || 0;
      cellEls[key].classList.toggle("on", v === 1);
      cellEls[key].classList.toggle("miss", v === 2);
      if (v === 1) { total++; perHabit[parseInt(key, 10)]++; }
    }
    pctEl.textContent = Math.round(total / (N * DIM) * 100) + "%";
    counts.forEach(function (el, idx) { el.textContent = perHabit[idx] + " / " + DIM; });
    sleepRender();
    drawSleepChart();
    var days = Object.keys(state.sleep), sum = 0;
    days.forEach(function (dk) { sum += state.sleep[dk]; });
    nightsEl.textContent = days.length;
    ciRender();
    waterRender(); stepRender();
    hbUpdate();
    avgEl.textContent = days.length ? (sum / days.length).toFixed(1) + " hrs" : "–";
  }

  g.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.getAttribute || t.getAttribute("data-k") === null) return;
    if (parseInt(t.getAttribute("data-i"), 10) >= DIM) return;
    var key = t.getAttribute("data-k") + "-" + t.getAttribute("data-i");
    showTip(t, key);
  });

  // Habit-name bubble for the ring
  var tip = document.createElement("div");
  tip.className = "ringtip"; tip.setAttribute("role", "status");
  document.getElementById("stage").appendChild(tip);
  var tipKey = null, tipTimer = null;
  function hideTip() { tip.classList.remove("show"); tipKey = null; clearTimeout(tipTimer); }
  function showTip(el, key) {
    var p = key.split("-"), k = +p[0], day = +p[1] + 1, v = state.cells[key] || 0;
    var name = (state.habits[k] || "").trim() || ("Habit " + (k + 1));
    tip.innerHTML = "";
    var b = document.createElement("b"); b.textContent = name;
    var sm = document.createElement("span");
    sm.textContent = "Day " + day + " · " + (v === 1 ? "Done" : v === 2 ? "Missed" : "Not marked");
    sm.className = v === 1 ? "ok" : v === 2 ? "no" : "";
    tip.appendChild(b); tip.appendChild(sm);
    var row = document.createElement("div"); row.className = "tipbtns";
    [["Done", 1, "yes"], ["Missed", 2, "no"], ["Clear", 0, "clr"]].forEach(function (o) {
      var bt = document.createElement("button"); bt.type = "button"; bt.textContent = o[0];
      bt.className = o[2] + (v === o[1] ? " cur" : "");
      bt.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (o[1] === 0) delete state.cells[key]; else state.cells[key] = o[1];
        save(); render(); hideTip();
      });
      row.appendChild(bt);
    });
    tip.appendChild(row);
    tip.classList.add("show");
    var sr = document.getElementById("stage").getBoundingClientRect(), er = el.getBoundingClientRect();
    var cx = er.left - sr.left + er.width / 2, w = tip.offsetWidth;
    cx = Math.max(w / 2 + 4, Math.min(sr.width - w / 2 - 4, cx));
    tip.style.left = cx + "px";
    var below = er.top - sr.top < tip.offsetHeight + 16;
    tip.classList.toggle("below", below);
    tip.style.top = (below ? er.bottom - sr.top + 8 : er.top - sr.top - 8) + "px";
    tipKey = key; clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 8000);
  }
  document.addEventListener("click", function (e) { if (!e.target.closest || (!e.target.closest("#ring") && !e.target.closest(".ringtip"))) hideTip(); });

  // Each box starts with 5 ruled lines. + Line and - change it, from 3 to 8.
  var LINE_H = 28, MIN_LINES = 3, MAX_LINES = 8;
  if (!Array.isArray(state.noteLines) || state.noteLines.length !== 2) state.noteLines = [5, 5];
  for (var nIdx = 0; nIdx < 2; nIdx++) {
    (function (idx) {
      var ta = document.getElementById("note-" + idx);
      var add = document.getElementById("note-add-" + idx), rem = document.getElementById("note-rem-" + idx);
      function fit() {
        var n = Math.max(MIN_LINES, Math.min(MAX_LINES, state.noteLines[idx] || 5));
        state.noteLines[idx] = n;
        ta.style.height = (n * LINE_H) + "px";
        add.disabled = n >= MAX_LINES;
        rem.disabled = n <= MIN_LINES;
      }
      ta.value = state.notes[idx] || "";
      ta.addEventListener("input", function () { state.notes[idx] = ta.value; save(); });
      add.addEventListener("click", function () { state.noteLines[idx]++; fit(); save(); ta.focus(); });
      rem.addEventListener("click", function () { state.noteLines[idx]--; fit(); save(); });
      fit();
    })(nIdx);
  }
  var month = document.getElementById("month");
  month.value = state.month;
  month.addEventListener("input", function () { state.month = month.value; save(); });
  function goMonth(y, m) {
    var d = new Date(y, m, 1);
    try { sessionStorage.setItem("habit-view", d.getFullYear() + "-" + (d.getMonth() + 1)); } catch (e) {}
    save(); location.reload();
  }
  var mLabel = document.getElementById("m-label");
  mLabel.textContent = MONTHS[vm] + " " + vy;
  document.getElementById("m-prev").addEventListener("click", function () { goMonth(vy, vm - 1); });
  document.getElementById("m-next").addEventListener("click", function () { goMonth(vy, vm + 1); });
  var nameEl = document.getElementById("name");
  nameEl.value = state.name || "";
  nameEl.addEventListener("input", function () { state.name = nameEl.value; save(); });

  var clear = document.getElementById("clear"), armed = null;
  clear.addEventListener("click", function () {
    if (!armed) {
      clear.textContent = "Tap again to clear boxes";
      clear.classList.add("warn");
      armed = setTimeout(function () { armed = null; clear.textContent = "Clear this month"; clear.classList.remove("warn"); }, 3500);
      return;
    }
    clearTimeout(armed); armed = null;
    state.cells = {}; state.sleep = {}; state.sleepTimes = {}; state.waterMl = {}; state.steps = {}; ciHab = 0; reviewing = false;
    save(); render();
    clear.textContent = "Cleared";
    clear.classList.remove("warn");
    setTimeout(function () { clear.textContent = "Clear this month"; }, 1500);
  });

  /* ---------- Daily check-in: one question per habit ---------- */
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var ciDay = Math.max(1, Math.min(today || 1, DIM)) - 1, ciHab = 0, reviewing = false;
  function gid(id) { return document.getElementById(id); }
  function answered(k) { return state.cells[k + "-" + ciDay] || 0; }
  function nextOpen(from) { for (var k = from + 1; k < N; k++) if (!answered(k)) return k; return -1; }
  function habName(k) { return (state.habits[k] || "").trim() || "Habit " + (k + 1); }
  ciHab = nextOpen(-1);

  function ciRender() {
    var open = 0, k;
    for (k = 0; k < N; k++) if (!answered(k)) open++;
    var dt = new Date(vy, vm, ciDay + 1);
    var label = "Day " + (ciDay + 1);
    if (dt.getMonth() === vm) label = WD[dt.getDay()] + " " + (ciDay + 1) + " " + MON[dt.getMonth()];
    gid("ci-day").textContent = label;
    gid("ci-prog").textContent = (N - open) + " of " + N + " answered";
    gid("ci-prev").disabled = ciDay <= 0;
    gid("ci-next").disabled = ciDay >= DIM - 1;
    dayEls.forEach(function (el, i) { el.classList.toggle("sel", i === ciDay); });
    wdEls.forEach(function (el, i) { el.classList.toggle("sel", i === ciDay); });
    var q = gid("ci-q"), btns = gid("ci-btns"), more = gid("ci-more");
    q.textContent = "";
    if (ciHab < 0) {
      btns.hidden = true; more.hidden = false;
      q.textContent = open ? open + (open > 1 ? " habits are" : " habit is") + " still unanswered for this day." : "All " + N + " habits answered for this day.";
      more.textContent = open ? "Answer the rest" : "Review answers";
      gid("ci-back").disabled = true; gid("ci-skip").disabled = true;
    } else {
      btns.hidden = false; more.hidden = true;
      var b = document.createElement("b");
      b.textContent = habName(ciHab);
      q.appendChild(document.createTextNode("Did you complete"));
      q.appendChild(b);
      q.appendChild(document.createTextNode((ciDay + 1 === today ? "today" : "on day " + (ciDay + 1)) + "?"));
      var v = answered(ciHab);
      gid("ci-yes").setAttribute("aria-pressed", v === 1 ? "true" : "false");
      gid("ci-no").setAttribute("aria-pressed", v === 2 ? "true" : "false");
      gid("ci-back").disabled = ciHab <= 0; gid("ci-skip").disabled = false;
    }
  }
  function ciAnswer(v) {
    if (ciHab < 0) return;
    state.cells[ciHab + "-" + ciDay] = v;
    save();
    ciHab = reviewing ? (ciHab + 1 < N ? ciHab + 1 : -1) : nextOpen(ciHab);
    if (ciHab < 0) reviewing = false;
    render();
  }
  function ciGoto(day) { ciDay = Math.max(0, Math.min(DIM - 1, day)); reviewing = false; ciHab = nextOpen(-1); render(); }
  gid("ci-yes").addEventListener("click", function () { ciAnswer(1); });
  gid("ci-no").addEventListener("click", function () { ciAnswer(2); });
  gid("ci-skip").addEventListener("click", function () { ciHab = ciHab + 1 < N ? ciHab + 1 : -1; render(); });
  gid("ci-back").addEventListener("click", function () { ciHab = Math.max(0, ciHab - 1); render(); });
  gid("ci-prev").addEventListener("click", function () { ciGoto(ciDay - 1); });
  gid("ci-next").addEventListener("click", function () { ciGoto(ciDay + 1); });
  gid("ci-more").addEventListener("click", function () {
    if (nextOpen(-1) >= 0) { reviewing = false; ciHab = nextOpen(-1); } else { reviewing = true; ciHab = 0; }
    render();
  });

  /* ---------- Water (litres) and steps (whole thousands) ---------- */
  function fmtH(h) { return (Math.round(h * 10) / 10) + " hrs"; }
  function fmtL(ml) { return (Math.round(ml / 10) / 100) + "L"; }
  function fmtK(s) { return Math.round(s) + " steps"; }
  var MAXS = 200000;
  var wGoal = gid("w-goal"), sGoal = gid("s-goal");
  wGoal.value = state.waterGoal / 1000; sGoal.value = Math.round(state.stepGoal * 1000);
  function dLabel() {
    var dt = new Date(vy, vm, ciDay + 1);
    return (ciDay + 1 === today ? "Today, " : "") + WD[dt.getDay()] + " " + (ciDay + 1) + " " + MON[dt.getMonth()];
  }
  function bump(obj, d, max) {
    var v = Math.max(0, Math.min(max, (obj[ciDay] || 0) + d));
    if (v) obj[ciDay] = v; else delete obj[ciDay];
    save(); render();
  }
  function total(obj) { var t = 0; Object.keys(obj).forEach(function (k) { t += obj[k]; }); return t; }
  function waterRender() {
    var ml = state.waterMl[ciDay] || 0, goal = state.waterGoal, n = Object.keys(state.waterMl).length;
    gid("w-day").textContent = dLabel();
    gid("w-ml").textContent = fmtL(ml);
    gid("w-sub").textContent = "of " + fmtL(goal) + (ml >= goal ? " \u00b7 goal reached" : "");
    gid("w-fill").style.width = Math.min(100, ml / goal * 100) + "%";
    gid("w-minus").disabled = ml <= 0;
    gid("w-clear").disabled = ml <= 0;
    gid("w-avg").textContent = n ? fmtL(total(state.waterMl) / n) : "\u2013";
    Array.prototype.forEach.call(document.querySelectorAll(".daynav"), function (b) {
      var dir = parseInt(b.getAttribute("data-dir"), 10);
      b.disabled = (dir < 0 && ciDay <= 0) || (dir > 0 && ciDay >= DIM - 1);
    });
  }
  function stepRender() {
    var k = state.steps[ciDay] || 0, goal = state.stepGoal * 1000, n = Object.keys(state.steps).length;
    gid("s-day").textContent = dLabel();
    gid("s-k").textContent = fmtK(k);
    gid("s-sub").textContent = "of " + fmtK(goal) + (k >= goal ? " \u00b7 goal reached" : "");
    gid("s-fill").style.width = Math.min(100, k / goal * 100) + "%";
    gid("s-clear").disabled = k <= 0;
    if (document.activeElement !== gid("s-input")) gid("s-input").value = k || "";
    gid("s-avg").textContent = n ? fmtK(total(state.steps) / n) : "\u2013";
    gid("s-tot").textContent = fmtK(total(state.steps));
  }
  gid("w-plus").addEventListener("click", function () { bump(state.waterMl, 1000, 15000); });
  gid("w-half").addEventListener("click", function () { bump(state.waterMl, 500, 15000); });
  gid("w-minus").addEventListener("click", function () { bump(state.waterMl, -500, 15000); });
  gid("w-clear").addEventListener("click", function () { delete state.waterMl[ciDay]; save(); render(); });
  gid("w-250").addEventListener("click", function () { bump(state.waterMl, 250, 15000); });
  var sIn = gid("s-input");
  sIn.addEventListener("input", function () {
    var v = parseInt(sIn.value, 10);
    if (!(v > 0)) delete state.steps[ciDay]; else state.steps[ciDay] = Math.min(MAXS, v);
    save(); render();
  });
  function sleepRender() {
    var hrs = state.sleep[ciDay];
    gid("sl-day").textContent = dLabel();
    gid("sl-h").textContent = hrs ? fmtH(hrs) : "Not logged";
    gid("sl-sub").textContent = hrs ? (hrs < 6 ? "under 6 hrs" : hrs > 9 ? "over 9 hrs" : "healthy range") : "";
    gid("sl-clear").disabled = !hrs;
    if (document.activeElement !== gid("sl-input")) gid("sl-input").value = hrs || "";
    swDraw();
  }
  var slIn = gid("sl-input"), bedIn = gid("sl-bed"), wakeIn = gid("sl-wake");
  slIn.addEventListener("input", function () {
    var v = parseFloat(slIn.value);
    if (state.sleepTimes) delete state.sleepTimes[ciDay];
    if (!(v > 0)) delete state.sleep[ciDay]; else state.sleep[ciDay] = Math.round(Math.min(24, v) * 100) / 100;
    save(); render();
  });
  // Sleep clock: pick bedtime and wake-up time, the hours are counted (past midnight too) and saved to the graph.
  function tmin(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ""); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function swChange() {
    var b = tmin(bedIn.value), w = tmin(wakeIn.value);
    state.sleepTimes = state.sleepTimes || {};
    if (b === null || w === null) { if (b === null && w === null) delete state.sleepTimes[ciDay]; else state.sleepTimes[ciDay] = { b: bedIn.value, w: wakeIn.value }; if (!state.sleepTimes[ciDay]) delete state.sleep[ciDay]; save(); render(); return; }
    var mins = (w - b + 1440) % 1440;
    state.sleepTimes[ciDay] = { b: bedIn.value, w: wakeIn.value };
    if (mins === 0) delete state.sleep[ciDay]; else state.sleep[ciDay] = Math.round(mins / 60 * 100) / 100;
    save(); render();
  }
  gid("sw-toggle").addEventListener("click", function () {
    var panel = gid("sw-panel"), open = panel.hidden; panel.hidden = !open;
    this.setAttribute("aria-expanded", open ? "true" : "false"); this.innerHTML = open ? "&#9719; Hide watch" : "&#9719; Set with watch";
    if (open) bedIn.focus();
  });
  bedIn.addEventListener("input", swChange); wakeIn.addEventListener("input", swChange);
  function swDraw() {
    var t = (state.sleepTimes || {})[ciDay], b = t ? tmin(t.b) : null, w = t ? tmin(t.w) : null, svg = gid("sw"), o = "", i, a, C = 60, R = 50;
    function P(r, deg) { var q = (deg - 90) * Math.PI / 180; return (C + r * Math.cos(q)).toFixed(2) + " " + (C + r * Math.sin(q)).toFixed(2); }
    o += '<circle class="sw-face" cx="60" cy="60" r="55"/>';
    for (i = 0; i < 12; i++) { a = i * 30; o += '<line class="sw-tick' + (i % 3 ? "" : " big") + '" x1="' + P(i % 3 ? 47 : 44, a).split(" ")[0] + '" y1="' + P(i % 3 ? 47 : 44, a).split(" ")[1] + '" x2="' + P(51, a).split(" ")[0] + '" y2="' + P(51, a).split(" ")[1] + '"/>'; }
    [[12, 0], [3, 90], [6, 180], [9, 270]].forEach(function (n) { var pp = P(37, n[1]).split(" "); o += '<text class="sw-num" x="' + pp[0] + '" y="' + (+pp[1] + 3.5) + '" text-anchor="middle">' + n[0] + '</text>'; });
    var hrs = state.sleep[ciDay];
    if (b !== null && w !== null && hrs) {
      var mins = Math.round(hrs * 60), a0 = (b % 720) / 720 * 360, a1 = (w % 720) / 720 * 360;
      if (mins >= 720) o += '<circle class="sw-arc" cx="60" cy="60" r="46" fill="none"/>';
      else o += '<path class="sw-arc" fill="none" d="M ' + P(46, a0) + ' A 46 46 0 ' + (mins > 360 ? 1 : 0) + ' 1 ' + P(46, a1) + '"/>';
      var pb = P(46, a0).split(" "), pw = P(46, a1).split(" ");
      o += '<circle class="sw-dot bed" cx="' + pb[0] + '" cy="' + pb[1] + '" r="4.2"/><circle class="sw-dot wake" cx="' + pw[0] + '" cy="' + pw[1] + '" r="4.2"/>';
    }
    o += '<text class="sw-mid" x="60" y="58" text-anchor="middle">' + (hrs ? fmtH(hrs) : "--") + '</text><text class="sw-sub" x="60" y="72" text-anchor="middle">slept</text>';
    svg.innerHTML = o;
    gid("sw-hrs").textContent = hrs ? fmtH(hrs) : "\u2013";
    if (document.activeElement !== bedIn) bedIn.value = t ? t.b : "";
    if (document.activeElement !== wakeIn) wakeIn.value = t ? t.w : "";
  }
  gid("sl-clear").addEventListener("click", function () { delete state.sleep[ciDay]; if (state.sleepTimes) delete state.sleepTimes[ciDay]; slIn.value = ""; save(); render(); });
  gid("s-clear").addEventListener("click", function () { delete state.steps[ciDay]; sIn.value = ""; save(); render(); });
  Array.prototype.forEach.call(document.querySelectorAll(".daynav"), function (b) {
    b.addEventListener("click", function () { ciGoto(ciDay + parseInt(b.getAttribute("data-dir"), 10)); });
  });
  wGoal.addEventListener("input", function () {
    var v = parseFloat(wGoal.value);
    if (v > 0) { state.waterGoal = Math.round(Math.min(10, v) * 2) * 500 || 500; save(); render(); }
  });
  sGoal.addEventListener("input", function () {
    var v = parseInt(sGoal.value, 10);
    if (v > 0) { state.stepGoal = Math.min(200000, v) / 1000; save(); render(); }
  });

  /* ---------- Add or remove habits ---------- */
  var MAXH = 30;
  var hbAdd = gid("hb-add"), hbRemove = gid("hb-remove"), hbCount = gid("hb-count"), rmArmed = null;
  function hbUpdate() {
    hbCount.textContent = N + (N === 1 ? " habit" : " habits") + " (up to " + MAXH + ")";
    hbAdd.disabled = N >= MAXH;
    hbRemove.disabled = N <= 1;
  }
  function resetRm() { clearTimeout(rmArmed); rmArmed = null; hbRemove.textContent = "Remove last"; hbRemove.classList.remove("warn"); }
  hbAdd.addEventListener("click", function () {
    if (N >= MAXH) return;
    state.habits.push("");
    buildHabits(); reviewing = false; ciHab = nextOpen(-1);
    save(); render();
    var fresh = gid("habit-" + (N - 1)); if (fresh) fresh.focus();
  });
  hbRemove.addEventListener("click", function () {
    if (N <= 1) return;
    if (!rmArmed) {
      hbRemove.textContent = "Tap again to remove habit " + N;
      hbRemove.classList.add("warn");
      rmArmed = setTimeout(resetRm, 3500);
      return;
    }
    resetRm();
    for (var rd = 0; rd < D; rd++) delete state.cells[(N - 1) + "-" + rd];
    state.habits.pop();
    buildHabits(); reviewing = false; ciHab = nextOpen(-1);
    save(); render();
  });

  /* ---------- PDF export: one A4 portrait page, drawn as vectors ---------- */
  function clean(s) { return String(s || "").replace(/[^\x20-\xFF\n]/g, ""); }

  function buildPdf() {
    var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
    var W = 595.28, H = 841.89;
    // Website colours (style.css :root): bg #111827, surface #182134, line/head #2a3550, accent #4f7cff, soft #263a6b, miss #ff4d4d, muted #9aa8c7
    var acc = [79, 124, 255];
    function poly(pts, style) {
      var segs = [];
      for (var q = 1; q < pts.length; q++) segs.push([pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]]);
      doc.lines(segs, pts[0][0], pts[0][1], [1, 1], style, true);
    }

    doc.setFillColor(17, 24, 39); doc.rect(0, 0, W, H, "F");
    doc.setDrawColor(42, 53, 80); doc.setLineWidth(0.8); doc.rect(7, 7, W - 14, H - 14, "S");
    doc.setDrawColor(42, 53, 80); doc.setTextColor(255, 255, 255);

    // top boxes
    var px0 = 22, gap = 10, pw = (W - 2 * px0 - gap) / 2, pt = 22, ph = 100;
    var titles = ["KEY GOALS", "NOTES"];
    for (var i = 0; i < 2; i++) {
      var x0 = px0 + i * (pw + gap);
      doc.setLineDashPattern([], 0); doc.setLineWidth(0.8);
      doc.setFillColor(24, 33, 52); doc.roundedRect(x0, pt, pw, ph, 14, 14, "FD");
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      doc.setTextColor(154, 168, 199); doc.text(titles[i], x0 + 14, pt + 22, { charSpace: 1.2 }); doc.setTextColor(255, 255, 255);
      var lines = doc.splitTextToSize(clean(state.notes[i]).replace(/\n/g, " \n "), pw - 20);
      var nl = (state.noteLines && state.noteLines[i]) || 5, sp = Math.min(12.5, 54 / (nl - 1));
      doc.setFontSize(Math.min(8, sp * 0.8));
      for (var j = 0; j < nl; j++) {
        var ly = pt + 40 + j * sp;
        doc.setLineDashPattern([0.5, 2.2], 0); doc.setLineWidth(0.7);
        doc.line(x0 + 10, ly, x0 + pw - 10, ly);
        if (lines[j]) doc.text(lines[j].trim(), x0 + 10, ly - 2);
      }
      doc.setLineDashPattern([], 0);
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(154, 168, 199);
    doc.text("Name:", W - 24 - 190, 133);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(clean(state.name), W - 24 - 152, 132);
    doc.setLineDashPattern([], 0); doc.setLineWidth(0.5); doc.line(W - 24 - 154, 134, W - 24, 134);

    // circular tracker
    var cx = W / 2, Rr = 204, ri = 84, Tt = (Rr - ri) / N, cy = pt + ph + 26 + Rr;
    doc.setLineWidth(0.5);
    function tp(rad, a) { var t = a * Math.PI / 180; return [cx + rad * Math.cos(t), cy - rad * Math.sin(t)]; }
    for (var k = 0; k < N; k++) {
      for (var d = 0; d < D; d++) {
        var ro = Rr - k * Tt, rin = ro - Tt, a0 = 90 - d * DEG, a1 = a0 - DEG, pts = [], s;
        for (s = 0; s <= 3; s++) pts.push(tp(ro, a0 + (a1 - a0) * s / 3));
        for (s = 0; s <= 3; s++) pts.push(tp(rin, a1 + (a0 - a1) * s / 3));
        var cv = state.cells[k + "-" + d];
        if (cv) { var cl = cv === 2 ? [255, 77, 77] : acc; doc.setFillColor(cl[0], cl[1], cl[2]); poly(pts, "FD"); }
        else poly(pts, "S");
      }
    }
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(154, 168, 199);
    for (var dn = 0; dn < D; dn++) {
      var p = tp(Rr + 10, 90 - (dn + 0.5) * DEG);
      doc.text(String(dn + 1), p[0], p[1] + 2.7, { align: "center" });
    }
    if (D) {
      doc.setFontSize(5.5);
      for (var dw = 0; dw < DIM; dw++) {
        var pw2 = tp(Rr + 21, 90 - (dw + 0.5) * DEG);
        var wdn = new Date(vy, vm, dw + 1).getDay();
        if (wdn === 0) doc.setTextColor(255, 92, 92); else doc.setTextColor(154, 168, 199);
        doc.text(RING_WD[wdn], pw2[0], pw2[1] + 2, { align: "center" });
      }
      doc.setTextColor(255, 255, 255);
    }
    doc.setFont("times", "italic"); doc.setFontSize(26);
    doc.setTextColor(154, 168, 199); doc.text("Month Of", cx, cy - 12, { align: "center" }); doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text(clean(state.month), cx, cy + 8, { align: "center" });
    doc.setFontSize(6);
    doc.setTextColor(154, 168, 199); doc.text("© Created by : Besol Labs", cx, cy + 36, { align: "center" }); doc.setTextColor(255, 255, 255);

    // habit names
    var lx = cx - 205, top0 = cy - Rr;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.setTextColor(154, 168, 199); doc.text("DAILY HABITS", lx, top0 - 6); doc.setTextColor(255, 255, 255);
    doc.setLineWidth(0.5);
    for (var hk = 0; hk <= N; hk++) doc.line(lx, top0 + hk * Tt, cx, top0 + hk * Tt);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    if (N <= 12) {
      for (var hn = 0; hn < N; hn++) {
        var base = top0 + (hn + 1) * Tt - 3.6;
        doc.text((hn + 1) + ".", lx + 3, base);
        doc.text(clean(state.habits[hn]), lx + 17, base);
      }
    } else {
      // Many habits: two columns of names, plus small ring numbers beside the circle.
      var per = Math.ceil(N / 2), rh = 134 / per, colW = 102, fs = Math.min(7, rh * 0.78);
      doc.setFontSize(fs);
      for (var c2 = 0; c2 < 2; c2++) {
        var x2 = lx + c2 * (colW + 1);
        var rowsIn = Math.min(per, N - c2 * per);
        for (var q2 = 0; q2 <= rowsIn; q2++) doc.line(x2, top0 + q2 * rh, x2 + colW, top0 + q2 * rh);
        for (var hn2 = c2 * per; hn2 < Math.min(N, (c2 + 1) * per); hn2++) {
          var b2 = top0 + (hn2 - c2 * per + 1) * rh - rh * 0.25;
          var nm = clean(state.habits[hn2]);
          while (nm.length && doc.getTextWidth(nm) > colW - 26) nm = nm.slice(0, -1);
          doc.text((hn2 + 1) + ".", x2 + 2, b2);
          doc.text(nm, x2 + 14, b2);
        }
      }
      var rf = Math.min(6, Tt * 0.85);
      if (rf >= 3.2) {
        doc.setFontSize(rf); doc.setTextColor(154, 168, 199);
        for (var rn2 = 0; rn2 < N; rn2++) doc.text(String(rn2 + 1), cx - 2, top0 + (rn2 + 0.5) * Tt + rf * 0.35, { align: "right" });
        doc.setTextColor(255, 255, 255);
      }
    }

    // water (litres) and steps (thousands) per day
    var tx0 = 24, tx1 = W - 24, lw = 92, cw = (tx1 - tx0 - lw) / 31;
    var wTop = cy + Rr + 24, wTitleH = 20, wHeadH = 13, wRowH = 16;
    var wHy = wTop + wTitleH, wBottom = wHy + wHeadH + 2 * wRowH;
    doc.setFillColor(24, 33, 52); doc.rect(tx0, wTop, tx1 - tx0, wBottom - wTop, "F");
    doc.setFillColor(42, 53, 80); doc.rect(tx0, wTop, tx1 - tx0, wTitleH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("WATER & STEPS", tx0 + 8, wTop + 14.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Goal " + fmtL(state.waterGoal) + " water, " + fmtK(state.stepGoal * 1000), tx1 - 8, wTop + 13.5, { align: "right" });
    [[state.waterMl, state.waterGoal, function (v) { return fmtL(v); }], [state.steps, state.stepGoal * 1000, function (v) { return String(Math.round(v)); }]].forEach(function (rw, ri2) {
      var ry = wHy + wHeadH + ri2 * wRowH;
      Object.keys(rw[0]).forEach(function (dk) {
        var v = rw[0][dk], hit = v >= rw[1], cxm = tx0 + lw + (parseInt(dk, 10) + 0.5) * cw;
        if (hit) doc.setFillColor(acc[0], acc[1], acc[2]); else doc.setFillColor(38, 58, 107);
        doc.rect(tx0 + lw + parseInt(dk, 10) * cw, ry, cw, wRowH, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(ri2 === 1 ? 4.8 : 5.2);
        doc.setTextColor(255, 255, 255);
        doc.text(rw[2](v), cxm, ry + 10.5, { align: "center" });
      });
    });
    doc.setTextColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(tx0, wHy, tx1, wHy); doc.line(tx0, wHy + wHeadH, tx1, wHy + wHeadH); doc.line(tx0, wHy + wHeadH + wRowH, tx1, wHy + wHeadH + wRowH);
    for (var wc = 0; wc <= 31; wc++) doc.line(tx0 + lw + wc * cw, wHy, tx0 + lw + wc * cw, wBottom);
    doc.setLineWidth(1.1);
    doc.rect(tx0, wTop, tx1 - tx0, wBottom - wTop, "S");
    doc.line(tx0 + lw, wHy, tx0 + lw, wBottom);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    doc.text("Day", tx0 + 6, wHy + 9.5);
    doc.text("Water", tx0 + 6, wHy + wHeadH + 11);
    doc.text("Steps", tx0 + 6, wHy + wHeadH + wRowH + 11);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.setTextColor(154, 168, 199);
    for (var wd = 0; wd < D; wd++) doc.text(String(wd + 1), tx0 + lw + (wd + 0.5) * cw, wHy + 9.5, { align: "center" });
    doc.setTextColor(255, 255, 255);

    // sleep tracker: line chart in the website style (hours on the right, days along the bottom)
    var top = wBottom + 8, bottom = top + 24 + 18 + 7 * 18;
    doc.setFillColor(24, 33, 52); doc.rect(tx0, top, tx1 - tx0, bottom - top, "F");
    doc.setFillColor(42, 53, 80); doc.rect(tx0, top, tx1 - tx0, 24, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(255, 255, 255);
    doc.text("SLEEP TRACKER", tx0 + 8, top + 17);
    var chL = tx0 + 14, chR = tx1 - 36, chT = top + 24 + 14, chB = bottom - 36;
    function cyv(v) { return chT + (phi - v) / (phi - plo) * (chB - chT); }
    function cxd(d) { return chL + (d + 0.5) / DIM * (chR - chL); }
    var sd = Object.keys(state.sleep).map(Number).filter(function (d) { return d < DIM; }).sort(function (p, q) { return p - q; });
    function hv(d) { return state.sleep[d]; }
    var ssum = 0; sd.forEach(function (d) { ssum += hv(d); });
    var savg = sd.length ? ssum / sd.length : 0;
    var pv = sd.map(hv), plo = pv.length ? Math.min(4, Math.floor(Math.min.apply(null, pv))) : 4, phi = pv.length ? Math.max(10, Math.ceil(Math.max.apply(null, pv))) : 10, pst = phi - plo > 8 ? 2 : 1;
    phi = plo + Math.ceil((phi - plo) / pst) * pst;
    doc.setFillColor(28, 40, 68); doc.rect(chL, cyv(9), chR - chL, cyv(6) - cyv(9), "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(154, 168, 199);
    for (var gv = plo; gv <= phi; gv += pst) {
      doc.setDrawColor(42, 53, 80); doc.setLineWidth(gv === plo ? 0.9 : 0.5);
      doc.line(chL, cyv(gv), chR, cyv(gv));
      doc.text(String(gv), chR + 8, cyv(gv) + 2.6);
    }
    doc.setFontSize(7);
    for (var gd = 0; gd < DIM; gd += 2) {
      doc.setLineWidth(0.9); doc.line(cxd(gd), chB, cxd(gd), chB + 3.5);
      doc.text(String(gd + 1), cxd(gd), chB + 12, { align: "center" });
    }
    if (sd.length) {
      doc.setDrawColor(154, 168, 199); doc.setLineWidth(1); doc.setLineDashPattern([3, 3], 0);
      doc.line(chL, cyv(savg), chR, cyv(savg)); doc.setLineDashPattern([], 0);
    }
    doc.setDrawColor(acc[0], acc[1], acc[2]); doc.setLineWidth(1.8);
    for (var si = 0; si < sd.length - 1; si++) {
      doc.setLineDashPattern(sd[si + 1] === sd[si] + 1 ? [] : [2.5, 2.5], 0);
      doc.line(cxd(sd[si]), cyv(hv(sd[si])), cxd(sd[si + 1]), cyv(hv(sd[si + 1])));
    }
    doc.setLineDashPattern([], 0);
    doc.setFillColor(acc[0], acc[1], acc[2]); doc.setDrawColor(24, 33, 52); doc.setLineWidth(1);
    sd.forEach(function (d) { doc.circle(cxd(d), cyv(hv(d)), 3, "FD"); });
    var ly2 = bottom - 11; doc.setFontSize(8); doc.setTextColor(154, 168, 199);
    doc.setDrawColor(acc[0], acc[1], acc[2]); doc.setLineWidth(2); doc.line(chL, ly2 - 2.5, chL + 16, ly2 - 2.5);
    doc.text("Hours slept", chL + 21, ly2);
    doc.setDrawColor(154, 168, 199); doc.setLineWidth(1); doc.setLineDashPattern([3, 3], 0); doc.line(chL + 100, ly2 - 2.5, chL + 116, ly2 - 2.5); doc.setLineDashPattern([], 0);
    doc.text(sd.length ? "Average " + savg.toFixed(1) + " hrs" : "Average", chL + 121, ly2);
    doc.setFillColor(28, 40, 68); doc.rect(chL + 215, ly2 - 7, 16, 9, "F");
    doc.text("Healthy 6 to 9 hrs", chL + 236, ly2);
    doc.setDrawColor(42, 53, 80); doc.setLineWidth(1.1); doc.rect(tx0, top, tx1 - tx0, bottom - top, "S");
    doc.setTextColor(255, 255, 255);
    return doc.output("blob");
  }

  /* ---------- Full report PDF: every number for the month, plus past months ---------- */
  function mstats(m, dim) {
    var done = 0, k, ss = 0, sl = Object.keys(m.sleep || {}), wk = Object.keys(m.waterMl || {}), tk = Object.keys(m.steps || {}), ws = 0, ts = 0;
    for (k in (m.cells || {})) if (m.cells[k] === 1 && parseInt(k.split("-")[1], 10) < dim) done++;
    sl.forEach(function (d) { ss += m.sleep[d]; });
    wk.forEach(function (d) { ws += m.waterMl[d]; });
    tk.forEach(function (d) { ts += m.steps[d]; });
    return { pct: Math.round(done / (N * dim) * 100), sleep: sl.length ? (ss / sl.length).toFixed(1) + " hrs" : "-", water: wk.length ? fmtL(ws / wk.length) : "-", steps: tk.length ? fmtK(ts / tk.length) : "-", stepTotal: ts };
  }
  function buildReport() {
    var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" }), W = 595.28, y = 50, i, d;
    function paint() { doc.setFillColor(17, 24, 39); doc.rect(0, 0, 595.28, 841.89, "F"); doc.setTextColor(255, 255, 255); doc.setDrawColor(42, 53, 80); }
    function page() { doc.addPage(); paint(); y = 50; }
    paint();
    function head(t) {
      doc.setFillColor(42, 53, 80); doc.rect(36, y - 13, W - 72, 20, "F"); doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(t, 42, y + 1);
      y += 24; doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("Habit, Water & Steps Report", 36, y); y += 20;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text((state.name ? clean(state.name) + "  |  " : "") + clean(state.month) + "  |  Generated " + new Date().toLocaleDateString(), 36, y); y += 30;
    function gDays(o, g) { var n = 0, q; for (q = 0; q < DIM; q++) if ((o[q] || 0) >= g && o[q]) n++; return n; }
    var s = mstats(state, DIM);
    head("SUMMARY");
    [["Habits completed", s.pct + "%"], ["Average sleep", s.sleep], ["Water goal / daily average", fmtL(state.waterGoal) + " / " + s.water], ["Step goal / daily average", fmtK(state.stepGoal * 1000) + " / " + s.steps], ["Total steps this month", fmtK(s.stepTotal)], ["Total water this month", fmtL(total(state.waterMl))], ["Days water goal reached", gDays(state.waterMl, state.waterGoal) + " / " + DIM], ["Days step goal reached", gDays(state.steps, state.stepGoal * 1000) + " / " + DIM], ["Nights of sleep logged", String(Object.keys(state.sleep).length)]].forEach(function (r) {
      doc.text(r[0], 42, y); doc.text(r[1], 250, y); y += 15;
    });
    y += 12; head("HABITS");
    for (i = 0; i < N; i++) {
      var c = 0; for (d = 0; d < DIM; d++) if (state.cells[i + "-" + d] === 1) c++;
      if (y > 800) page();
      doc.text((i + 1) + ". " + clean(habName(i)), 42, y); doc.text(c + " / " + DIM + " days", 400, y); y += 14;
    }
    ["KEY GOALS", "NOTES"].forEach(function (t, n) {
      var tx = clean(state.notes[n]).trim(); if (!tx) return;
      y += 14; if (y > 740) page(); head(t);
      doc.splitTextToSize(tx, W - 84).forEach(function (l) { if (y > 800) page(); doc.text(l, 42, y); y += 13; });
    });
    page(); head("DATE-WISE LOG - " + clean(state.month));
    var cx = [42, 150, 235, 320, 450];
    doc.setFont("helvetica", "bold");
    ["Date", "Habits done", "Sleep", "Steps", "Water"].forEach(function (t, n) { doc.text(t, cx[n], y); });
    y += 6; doc.setDrawColor(42, 53, 80); doc.line(36, y, W - 36, y); y += 14; doc.setFont("helvetica", "normal");
    for (d = 0; d < DIM; d++) {
      var dt = new Date(vy, vm, d + 1), hd = 0, k;
      for (k = 0; k < N; k++) if (state.cells[k + "-" + d] === 1) hd++;
      [WD[dt.getDay()] + " " + (d + 1) + " " + MON[dt.getMonth()], hd + " / " + N, state.sleep[d] !== undefined ? fmtH(state.sleep[d]) : "-", state.steps[d] ? fmtK(state.steps[d]) + (state.steps[d] >= state.stepGoal * 1000 ? " *" : "") : "-", state.waterMl[d] ? fmtL(state.waterMl[d]) + (state.waterMl[d] >= state.waterGoal ? " *" : "") : "-"].forEach(function (t, n) { doc.text(clean(t), cx[n], y); });
      y += 6; doc.setDrawColor(42, 53, 80); doc.line(36, y, W - 36, y); y += 14;
      if (y > 800) { page(); }
    }
    if (y > 780) page();
    doc.setFont("helvetica", "bold");
    doc.text("Total / average", cx[0], y); doc.text("sleep " + s.sleep, cx[2], y);
    doc.text(fmtK(s.stepTotal), cx[3], y); doc.text(fmtL(total(state.waterMl)), cx[4], y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("* = daily goal reached", 42, y); doc.setFontSize(9.5); y += 6;
    var ak = Object.keys(state.archive || {});
    if (ak.length) {
      y += 18; if (y > 700) page(); head("PAST MONTHS");
      ak.forEach(function (key) {
        var a = state.archive[key], p = key.split("-"), m = mstats(a, new Date(+p[0], +p[1], 0).getDate());
        if (y > 800) page();
        doc.text(clean(a.month || key) + ":  habits " + m.pct + "%  |  sleep " + m.sleep + "  |  steps " + m.steps + "  |  water " + m.water, 42, y); y += 15;
      });
    }
    return doc.output("blob");
  }

  /* ---------- Today + Weekly PDFs: the website ring (283 deg), habit names beside the results ---------- */
  // The report date picked in the calendar (falls back to today / the day being checked in).
  function selDate() {
    var f = gid("pdf-date"), m = f && /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.value || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(vy, vm, today || ciDay + 1);
  }
  function rangeOf() {
    function g(i) { var f = gid(i), m = f && /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.value || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
    var a = g("pdf-from") || selDate(), b = g("pdf-to") || a;
    if (b < a) b = a;
    if ((b - a) / 864e5 > 30) b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 30);
    return [a, b];
  }
  function selStamp(kind) {
    var s2 = selDate(), p2 = function (q) { return String(q).padStart(2, "0"); };
    if (kind === "range") { var r = rangeOf(); return r[0].getFullYear() + "-" + p2(r[0].getMonth() + 1) + "-" + p2(r[0].getDate()) + "_to_" + r[1].getFullYear() + "-" + p2(r[1].getMonth() + 1) + "-" + p2(r[1].getDate()); }
    return s2.getFullYear() + "-" + p2(s2.getMonth() + 1) + (kind === "month" ? "" : "-" + p2(s2.getDate()));
  }
  var PDF_LOGO = "data:image/png;base64,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";
  function buildSheet(kind) {
    var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" }), W = 595.28, H = 841.89, M = 36, j, k, s;
    var BLUE = [79, 124, 255], RED = [255, 77, 77], MUTED = [154, 168, 199], LINE = [42, 53, 80], CARD = [24, 33, 52], WHITE = [255, 255, 255], BG = [17, 24, 39];
    var WDN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], WDF = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var sd = selDate(), sy = sd.getFullYear(), sm = sd.getMonth(), mdim = new Date(sy, sm + 1, 0).getDate(), isTd = sd.getTime() === new Date(vy, vm, today || ciDay + 1).getTime();
    var rg = kind === "range", rr = rg ? rangeOf() : null, wk = kind === "week", mo = kind === "month" || rg;
    var n = rg ? Math.round((rr[1] - rr[0]) / 864e5) + 1 : mo ? mdim : wk ? Math.min(7, mdim - (sd.getDate() - 1)) : 1, d = sd.getDate() - 1, ds = [], SL = mo ? 31 : 7;
    if (rg) for (j = 0; j < n; j++) ds.push(new Date(rr[0].getFullYear(), rr[0].getMonth(), rr[0].getDate() + j)); else if (mo) for (j = 0; j < mdim; j++) ds.push(new Date(sy, sm, j + 1)); else for (j = 0; j < n; j++) ds.push(new Date(sy, sm, d + 1 + j));
    function rec(dt) {
      var cur = dt.getFullYear() === vy && dt.getMonth() === vm, src = cur ? state : ((state.archive || {})[dt.getFullYear() + "-" + (dt.getMonth() + 1)] || {}), di = dt.getDate() - 1;
      return { c: function (q) { return (src.cells || {})[q + "-" + di] || 0; }, w: (src.waterMl || {})[di] || 0, s: (src.steps || {})[di] || 0, h: (src.sleep || {})[di] };
    }
    var recs = ds.map(rec), first = ds[0], last = ds[n - 1];
    var plbl = rg ? first.getDate() + " " + MON[first.getMonth()] + " - " + last.getDate() + " " + MON[last.getMonth()] + " " + last.getFullYear() : MONTHS[sm] + " " + sy;
    function logo() { try { doc.addImage(PDF_LOGO, "PNG", W - M - 50, 24, 50, 50); } catch (err) {} }
    function fc(c) { doc.setFillColor(c[0], c[1], c[2]); } function dc(c) { doc.setDrawColor(c[0], c[1], c[2]); }
    function tx(t, x, y, f, st, sz, c, o) { doc.setFont(f, st); doc.setFontSize(sz); doc.setTextColor(c[0], c[1], c[2]); doc.text(String(t), x, y, o || {}); }
    function ln(x1, y1, x2, y2, c, w) { dc(c); doc.setLineWidth(w); doc.setLineCap("round"); doc.setLineJoin("round"); doc.line(x1, y1, x2, y2); }
    function tick(x, y, q) { ln(x - 9 * q, y, x - 3 * q, y + 6 * q, WHITE, 3.2 * q); ln(x - 3 * q, y + 6 * q, x + 9 * q, y - 7 * q, WHITE, 3.2 * q); }
    function cross(x, y, q) { ln(x - 7 * q, y - 7 * q, x + 7 * q, y + 7 * q, WHITE, 3.2 * q); ln(x - 7 * q, y + 7 * q, x + 7 * q, y - 7 * q, WHITE, 3.2 * q); }
    function head(t, y) { fc(LINE); doc.rect(M, y - 13, W - 2 * M, 20, "F"); tx(t, M + 6, y + 1, "helvetica", "bold", 11, WHITE); }
    // Every report is one white, print-friendly page (goals and notes boxes, ring, water and steps table, sleep grid).
    // Month and custom: one slot per date. Weekly: up to 7 dates. Daily: only the chosen day.
    return buildPrint();
    function buildPrint() {
      // Website colours: page #111827, cards #182134, lines #2a3550, blue #4f7cff, soft blue #263a6b, red #ff4d4d, muted #9aa8c7.
      var BK = [255, 255, 255], PB = [79, 124, 255], LB = [38, 58, 107], PR = [255, 77, 77], GR = [42, 53, 80], GY = [154, 168, 199], WH = [255, 255, 255], LC = [74, 88, 125], GL = [42, 53, 80], PBG = [17, 24, 39], PCD = [24, 33, 52];
      var src0 = (sy === vy && sm === vm) ? state : ((state.archive || {})[sy + "-" + (sm + 1)] || {}), nn = src0.notes || [], nlines = src0.noteLines || state.noteLines || [5, 5];
      var pd = ds, pr = recs, pn = n, daily = !mo && !wk;
      if (daily) { pd = [last]; pr = [recs[0]]; pn = 1; }
      var SLp = mo ? 31 : 7, DEGp = 283 / SLp, i2, q2, kk2, s2, cols = rg ? n : mo ? 31 : daily ? 1 : 7, big = daily ? 1.9 : 1;
      function kfmt(v) { var x = Math.round(v / 100) / 10; return (x === Math.floor(x) ? String(x) : x.toFixed(1)) + "k"; }
      fc(PBG); doc.rect(0, 0, W, H, "F"); dc(GL); doc.setLineDashPattern([], 0); doc.setLineWidth(0.8); doc.rect(7, 7, W - 14, H - 14, "S");
      // key goals and notes boxes
      var px0 = 22, gp = 10, bw2 = (W - 2 * px0 - gp) / 2, ptp = 22, bh2 = 100;
      ["KEY GOALS", "NOTES"].forEach(function (t, i) {
        var x0 = px0 + i * (bw2 + gp), nl = nlines[i] || 5, sp = Math.min(12.5, 54 / (nl - 1)), fs2 = Math.min(8, sp * 0.8);
        dc(LC); doc.setLineDashPattern([], 0); doc.setLineWidth(0.8); fc(PCD); doc.roundedRect(x0, ptp, bw2, bh2, 14, 14, "FD");
        tx(t, x0 + 14, ptp + 22, "helvetica", "normal", 8.5, BK, { charSpace: 1.2 });
        doc.setFont("helvetica", "normal"); doc.setFontSize(fs2);
        var ls = doc.splitTextToSize(clean(nn[i]).replace(/\n/g, " \n "), bw2 - 20);
        for (var q = 0; q < nl; q++) {
          var ly = ptp + 40 + q * sp; dc(GY); doc.setLineDashPattern([0.5, 2.2], 0); doc.setLineWidth(0.7); doc.line(x0 + 10, ly, x0 + bw2 - 10, ly);
          doc.setLineDashPattern([], 0); if (ls[q]) tx(ls[q].trim(), x0 + 10, ly - 2, "helvetica", "normal", fs2, BK);
        }
        doc.setLineDashPattern([], 0);
      });
      var nOff = daily ? 42 : 0;
      tx("Name:", W - 24 - 190 + nOff, 133, "helvetica", "bold", 9, BK); tx(clean(state.name), W - 24 - 152 + nOff, 132, "helvetica", "normal", 10, BK); ln(W - 24 - 154 + nOff, 134, W - 24, 134, GY, 0.5);
      // ring
      var cx2 = W / 2, Rr = 204, rin0 = 84, Tt = (Rr - rin0) / N, cy2 = ptp + bh2 + 26 + Rr;
      function tp(rad, a) { var t = a * Math.PI / 180; return [cx2 + rad * Math.cos(t), cy2 - rad * Math.sin(t)]; }
      function pwedge(kb, sl, sty) {
        var ro = Rr - kb * Tt, ri3 = ro - Tt, a0 = 90 - sl * DEGp, a1 = a0 - DEGp, pts = [], q, st = 6, segs = [];
        for (q = 0; q <= st; q++) pts.push(tp(ro, a0 + (a1 - a0) * q / st));
        for (q = 0; q <= st; q++) pts.push(tp(ri3, a1 + (a0 - a1) * q / st));
        for (q = 1; q < pts.length; q++) segs.push([pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]]);
        doc.lines(segs, pts[0][0], pts[0][1], [1, 1], sty, true);
      }
      doc.setLineDashPattern([], 0); doc.setLineWidth(0.5);
      for (s2 = 0; s2 < (daily ? 1 : SLp); s2++) for (kk2 = 0; kk2 < N; kk2++) {
        var cv = s2 < pn ? pr[s2].c(kk2) : 0;
        if (cv === 1) { fc(PB); dc(PBG); pwedge(kk2, s2, "FD"); } else if (cv === 2) { fc(PR); dc(PBG); pwedge(kk2, s2, "FD"); } else { dc(LC); pwedge(kk2, s2, "S"); }
      }
      if (daily) { dc(WH); doc.setLineWidth(1.3); for (kk2 = 0; kk2 < N; kk2++) pwedge(kk2, 0, "S"); doc.setLineWidth(0.5); }
      for (s2 = 0; s2 < pn; s2++) { var lp = tp(Rr + (daily ? 14 : 10), 90 - (s2 + 0.5) * DEGp); tx(pd[s2].getDate(), lp[0], lp[1] + (daily ? 4 : 2.7), "helvetica", daily ? "bold" : "normal", daily ? 12 : 7.5, daily ? PB : GY, { align: "center" });
        if (daily) { var lp2 = tp(Rr + 30, 90 - (s2 + 0.5) * DEGp); tx(WDN[pd[s2].getDay()], lp2[0], lp2[1] + 3, "helvetica", "bold", 8, PB, { align: "center" }); } }
      var cTop = rg ? "Period Of" : mo ? "Month Of" : wk ? "Week Of" : isTd ? "Today" : "Day Of", cSub = mo && !rg ? MONTHS[sm] + " " + sy : rg ? plbl : wk ? first.getDate() + " " + MON[first.getMonth()] + " - " + last.getDate() + " " + MON[last.getMonth()] + " " + last.getFullYear() : last.getDate() + " " + MON[last.getMonth()] + " " + last.getFullYear();
      tx(cTop, cx2, cy2 - 12, "times", "italic", 26, GY, { align: "center" });
      tx(cSub, cx2, cy2 + 8, "helvetica", "normal", 11, BK, { align: "center" });
      
      if (daily) { var dn2 = 0; for (kk2 = 0; kk2 < N; kk2++) if (pr[0].c(kk2) === 1) dn2++; tx(dn2 + " / " + N + " done (" + Math.round(dn2 / N * 100) + "%)", cx2, cy2 + 26, "helvetica", "bold", 9, PB, { align: "center" }); }
      tx("© Created by : Besol Labs", cx2, cy2 + (daily ? 46 : 36), "helvetica", "normal", 6, GY, { align: "center" });
      var lx2 = cx2 - 205, top2 = cy2 - Rr, hfs = Math.min(7.5, Tt * 0.78);
      tx("DAILY HABITS", lx2, top2 - 6, "helvetica", "bold", 10, BK);
      for (kk2 = 0; kk2 <= N; kk2++) ln(lx2, top2 + kk2 * Tt, cx2, top2 + kk2 * Tt, LC, 0.5);
      for (kk2 = 0; kk2 < N; kk2++) {
        var base2 = top2 + (kk2 + 1) * Tt - Math.max(1.5, Tt * 0.33), nm2 = clean(habName(kk2));
        doc.setFont("helvetica", "normal"); doc.setFontSize(hfs);
        while (nm2.length && doc.getTextWidth(nm2) > cx2 - lx2 - (daily ? 62 : 22)) nm2 = nm2.slice(0, -1);
        tx((kk2 + 1) + ".", lx2 + 3, base2, "helvetica", "normal", hfs, BK); tx(nm2, lx2 + 17, base2, "helvetica", "normal", hfs, BK);
        if (daily) { var v0 = pr[0].c(kk2); tx(v0 === 1 ? "Done" : v0 === 2 ? "Missed" : "-", cx2 - 4, base2, "helvetica", "bold", 6.5, v0 === 1 ? PB : v0 === 2 ? PR : GY, { align: "right" }); }
      }
      // water and steps table
      var tx0 = 24, tx1 = W - 24, lw = 92, cw = (tx1 - tx0 - lw) / cols, wTop = cy2 + (daily ? 72 : Rr + 24), tH = 20, hH = 13, rH = daily ? 28 : 16, wHy = wTop + tH, wBot = wHy + hH + 2 * rH, wGoal = state.waterGoal, sGoal = state.stepGoal * 1000;
      fc(GR); doc.rect(tx0, wTop, tx1 - tx0, tH, "F");
      tx("WATER & STEPS", tx0 + 8, wTop + 14.5, "helvetica", "bold", 13, BK);
      tx("Goal " + fmtL(wGoal) + " water, " + fmtK(sGoal), tx1 - 8, wTop + 13.5, "helvetica", "normal", 8, BK, { align: "right" });
      for (s2 = 0; s2 < pn; s2++) {
        [[pr[s2].w, wGoal, fmtL], [pr[s2].s, sGoal, kfmt]].forEach(function (rw, ri2) {
          if (!(rw[0] > 0)) return;
          var hit = rw[0] >= rw[1], ry = wHy + hH + ri2 * rH, xm = tx0 + lw + s2 * cw;
          fc(hit ? PB : LB); doc.rect(xm, ry, cw, rH, "F");
          tx(rw[2](rw[0]), xm + cw / 2, ry + rH / 2 + 2.3, "helvetica", "normal", (ri2 === 0 ? 5.2 : 5.6) * big, hit ? WH : BK, { align: "center" });
        });
      }
      for (q2 = 0; q2 <= cols; q2++) ln(tx0 + lw + q2 * cw, wHy, tx0 + lw + q2 * cw, wBot, LC, 0.4);
      ln(tx0, wHy, tx1, wHy, LC, 0.5); ln(tx0, wHy + hH, tx1, wHy + hH, LC, 0.5); ln(tx0, wHy + hH + rH, tx1, wHy + hH + rH, LC, 0.5);
      dc(LC); doc.setLineWidth(1.1); doc.rect(tx0, wTop, tx1 - tx0, wBot - wTop, "S"); ln(tx0 + lw, wHy, tx0 + lw, wBot, LC, 1.1);
      tx("Day", tx0 + 6, wHy + 9.5, "helvetica", "bold", 7.5, BK); tx("Water (L)", tx0 + 6, wHy + hH + rH / 2 + 3, "helvetica", "bold", 7.5, BK); tx("Steps (k)", tx0 + 6, wHy + hH + rH + rH / 2 + 3, "helvetica", "bold", 7.5, BK);
      for (s2 = 0; s2 < pn; s2++) tx(daily ? WDF[pd[s2].getDay()].slice(0, 3) + ", " + pd[s2].getDate() + " " + MON[pd[s2].getMonth()] : pd[s2].getDate(), tx0 + lw + (s2 + 0.5) * cw, wHy + 9.5, "helvetica", "normal", 7 * (daily ? 1.2 : 1), BK, { align: "center" });
      // sleep tracker grid
      // sleep tracker grid
      var sTop = wBot + 8, sTH = 24;
      if (!daily) { // the daily report shows the sleep watch only, no sleep grid
      var sHH = 13, sRH = daily ? 34 : 17.5, rows = ["10 hrs", "9 hrs", "8 hrs", "7 hrs", "6 hrs", "5 hrs", "< 5 hrs"], sHy = sTop + sTH, sBot = sHy + sHH + rows.length * sRH;
      fc(GR); doc.rect(tx0, sTop, tx1 - tx0, sTH, "F");
      tx("SLEEP TRACKER", tx0 + 8, sTop + 17, "helvetica", "bold", 15, BK);
      for (s2 = 0; s2 < pn; s2++) {
        var hh = pr[s2].h; if (hh === undefined) continue;
        var ridx = hh >= 10 ? 0 : hh >= 9 ? 1 : hh >= 8 ? 2 : hh >= 7 ? 3 : hh >= 6 ? 4 : hh >= 5 ? 5 : 6;
        fc(PB); doc.rect(tx0 + lw + s2 * cw, sHy + sHH + ridx * sRH, cw, sRH, "F");
      }
      for (q2 = 0; q2 <= cols; q2++) ln(tx0 + lw + q2 * cw, sHy, tx0 + lw + q2 * cw, sBot, LC, 0.4);
      for (q2 = 0; q2 <= rows.length; q2++) ln(tx0, sHy + sHH + q2 * sRH, tx1, sHy + sHH + q2 * sRH, LC, 0.5);
      ln(tx0, sHy, tx1, sHy, LC, 0.5);
      // Line through the sleep cells: green when hours rose from the previous logged night, red when they fell, grey when equal.
      var UPc = [46, 230, 166], pvI = -1, pvY = 0, pvH = 0;
      function slY(h) { var ri = h >= 10 ? 0 : h >= 9 ? 1 : h >= 8 ? 2 : h >= 7 ? 3 : h >= 6 ? 4 : h >= 5 ? 5 : 6; return sHy + sHH + ri * sRH + sRH / 2; }
      var pts2 = [];
      for (s2 = 0; s2 < pn; s2++) { if (pr[s2].h === undefined) continue; pts2.push({ x: tx0 + lw + (s2 + 0.5) * cw, y: slY(pr[s2].h), h: pr[s2].h }); }
      for (i2 = 1; i2 < pts2.length; i2++) { var a2 = pts2[i2 - 1], b2 = pts2[i2]; ln(a2.x, a2.y, b2.x, b2.y, b2.h > a2.h ? UPc : b2.h < a2.h ? PR : GY, 1.8); }
      pts2.forEach(function (p, i3) { var c3 = i3 === 0 ? GY : p.h > pts2[i3 - 1].h ? UPc : p.h < pts2[i3 - 1].h ? PR : GY; fc(c3); dc(PBG); doc.setLineWidth(0.8); doc.circle(p.x, p.y, daily ? 4.5 : 2.6, "FD"); });
      dc(LC); doc.setLineWidth(1.1); doc.rect(tx0, sTop, tx1 - tx0, sBot - sTop, "S"); ln(tx0 + lw, sHy, tx0 + lw, sBot, LC, 1.1);
      tx("Hours Slept / Day", tx0 + 6, sHy + 9.5, "helvetica", "bold", 7.5, BK);
      rows.forEach(function (t, ri3) { tx(t, tx0 + 6, sHy + sHH + ri3 * sRH + sRH / 2 + 3, "helvetica", "bold", 8, BK); });
      for (s2 = 0; s2 < pn; s2++) tx(daily ? WDF[pd[s2].getDay()].slice(0, 3) + ", " + pd[s2].getDate() + " " + MON[pd[s2].getMonth()] : pd[s2].getDate(), tx0 + lw + (s2 + 0.5) * cw, sHy + 9.5, "helvetica", "normal", 7 * (daily ? 1.2 : 1), BK, { align: "center" });
      }
      sleepWatch();
      if (mo) detailPages();
      return doc.output("blob");
      // Watch face showing the hours slept: the chosen night (bedtime to wake-up) for daily, the average for weekly, monthly and custom.
      function sleepWatch() {
        var hv = [], tm = null, hrs, r0 = daily ? 104 : 31, k = daily ? r0 / 56 : 1, wx = daily ? W / 2 : W - 24 - 38, wy = daily ? sTop + 38 + r0 : cy2 + Rr * 0.72, i4, a4, ps, p1, p2, mins, bs, we;
        for (i4 = 0; i4 < pn; i4++) if (pr[i4].h !== undefined) hv.push(pr[i4].h);
        if (!hv.length) return;
        hrs = hv.reduce(function (x, y) { return x + y; }, 0) / hv.length; hrs = Math.round(hrs * 10) / 10; mins = Math.round(hrs * 60);
        if (daily && sy === vy && sm === vm) tm = (state.sleepTimes || {})[last.getDate() - 1] || null;
        function mm(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ""); return m ? (+m[1]) * 60 + (+m[2]) : null; }
        function f12(t) { var m = mm(t), h = Math.floor(m / 60), q = h >= 12 ? "PM" : "AM"; return ((h % 12) || 12) + ":" + ("0" + (m % 60)).slice(-2) + " " + q; }
        bs = tm ? mm(tm.b) : null; we = tm ? mm(tm.w) : null;
        var a0 = bs !== null ? (bs % 720) / 720 * 360 : 0, span = Math.min(mins, 720) / 720 * 360;
        function P(r, deg) { var q = (deg - 90) * Math.PI / 180; return [wx + r * Math.cos(q), wy + r * Math.sin(q)]; }
        fc(PCD); dc(LC); doc.setLineWidth(1.2); doc.circle(wx, wy, r0 + 4 * k, "FD");
        for (i4 = 0; i4 < 12; i4++) { p1 = P(r0 - (i4 % 3 ? 3 : 6) * k, i4 * 30); p2 = P(r0 - 0.5, i4 * 30); ln(p1[0], p1[1], p2[0], p2[1], i4 % 3 ? LC : GY, (i4 % 3 ? 0.8 : 1.6) * k); }
        [[12, 0], [3, 90], [6, 180], [9, 270]].forEach(function (n) { var q = P(r0 - (daily ? 16 * k : 11), n[1]); tx(n[0], q[0], q[1] + (daily ? 3 * k : 2.3), "helvetica", "bold", daily ? 8 * k : 5.5, GY, { align: "center" }); });
        var rr4 = r0 - (daily ? 6 * k : 4), steps = Math.max(2, Math.round(span / 4));
        for (i4 = 0; i4 < steps; i4++) { p1 = P(rr4, a0 + span * i4 / steps); p2 = P(rr4, a0 + span * (i4 + 1) / steps); ln(p1[0], p1[1], p2[0], p2[1], PB, daily ? 6 * k : 4); }
        if (tm && bs !== null && we !== null) {
          p1 = P(rr4, a0); fc([139, 92, 246]); dc(WH); doc.setLineWidth(1); doc.circle(p1[0], p1[1], daily ? 4 * k : 2.6, "FD");
          p2 = P(rr4, a0 + span); fc([46, 230, 166]); doc.circle(p2[0], p2[1], daily ? 4 * k : 2.6, "FD");
        }
        tx(hrs + " hrs", wx, wy + (daily ? 1 : 0.5), "helvetica", "bold", daily ? 14 * k : 8.5, WH, { align: "center" });
        tx(daily ? "slept" : "avg / night", wx, wy + (daily ? 12 * k : 8.5), "helvetica", "normal", daily ? 7 * k : 5, GY, { align: "center" });
        if (daily) {
          tx("SLEEP", wx, wy - r0 - 14, "helvetica", "bold", 11, GY, { align: "center", charSpace: 1.2 });
          if (tm && bs !== null && we !== null) tx(f12(tm.b) + "  to  " + f12(tm.w), wx, wy + r0 + 24, "helvetica", "bold", 12, WH, { align: "center" });
        } else tx("AVG SLEEP", wx, wy - r0 - 7, "helvetica", "bold", 6, GY, { align: "center", charSpace: 0.8 });
      }

      // Month and custom: page 2 = habit by date table with totals, page 3 = date-wise log table.
      function detailPages() {
        var HN = state.habits || [], NH = HN.length, ax = 24, bx = W - 24, tw = bx - ax, y0, r, c, v, cnt, cw2, nw = 128, tot = 54, hr = 20;
        function pageBase(title, sub) {
          doc.addPage(); fc(PBG); doc.rect(0, 0, W, H, "F"); dc(GL); doc.setLineDashPattern([], 0); doc.setLineWidth(0.8); doc.rect(7, 7, W - 14, H - 14, "S");
          tx(title, ax, 46, "helvetica", "bold", 20, WH); tx(sub, ax, 62, "helvetica", "normal", 9, GY);
          tx(state.name ? "Name: " + state.name : "", bx, 46, "helvetica", "bold", 10, WH, { align: "right" });
        }
        function trunc(t, w, sz) { doc.setFont("helvetica", "normal"); doc.setFontSize(sz); t = String(t); while (t.length > 3 && doc.getTextWidth(t) > w) t = t.slice(0, -2); return t; }
        // Page 2: habit grid
        pageBase("HABIT DETAILS", plbl + "  |  blue = done, red = missed, empty = not marked");
        y0 = 82; cw2 = (tw - nw - tot) / pn;
        fc(GR); doc.rect(ax, y0, tw, hr, "F");
        tx("Habit", ax + 6, y0 + 13.5, "helvetica", "bold", 8.5, WH); tx("Done", bx - tot / 2, y0 + 13.5, "helvetica", "bold", 8.5, WH, { align: "center" });
        for (c = 0; c < pn; c++) tx(pd[c].getDate(), ax + nw + (c + 0.5) * cw2, y0 + 13.5, "helvetica", "normal", 6.5, WH, { align: "center" });
        var rh2 = 24, totDone = 0, totMiss = 0;
        for (r = 0; r < NH; r++) {
          var ry2 = y0 + hr + r * rh2; cnt = 0;
          fc(r % 2 ? PBG : PCD); doc.rect(ax, ry2, tw, rh2, "F");
          tx((r + 1) + ". " + trunc(HN[r], nw - 20, 7.5), ax + 6, ry2 + rh2 / 2 + 2.6, "helvetica", "normal", 7.5, WH);
          for (c = 0; c < pn; c++) {
            v = pr[c].c(r);
            if (v === 1) { cnt++; totDone++; fc(PB); doc.rect(ax + nw + c * cw2 + 0.8, ry2 + 3, cw2 - 1.6, rh2 - 6, "F"); }
            else if (v === 2) { totMiss++; fc(PR); doc.rect(ax + nw + c * cw2 + 0.8, ry2 + 3, cw2 - 1.6, rh2 - 6, "F"); }
          }
          tx(cnt + " / " + pn, bx - tot / 2, ry2 + rh2 / 2 + 2.6, "helvetica", "bold", 8, WH, { align: "center" });
        }
        var gy = y0 + hr + NH * rh2;
        for (r = 0; r <= NH; r++) ln(ax, y0 + hr + r * rh2, bx, y0 + hr + r * rh2, LC, 0.4);
        for (c = 0; c <= pn; c++) ln(ax + nw + c * cw2, y0, ax + nw + c * cw2, gy, LC, 0.3);
        ln(bx - tot, y0, bx - tot, gy, LC, 0.8); ln(ax + nw, y0, ax + nw, gy, LC, 0.8);
        dc(LC); doc.setLineWidth(1.1); doc.rect(ax, y0, tw, gy - y0, "S");
        // summary cards
        var sy2 = gy + 22, cwid = (tw - 20) / 3, tl = NH * pn, sumTxt = [["DONE", totDone, PB], ["MISSED", totMiss, PR], ["COMPLETION", (tl ? Math.round(totDone / tl * 100) : 0) + "%", WH]];
        sumTxt.forEach(function (it, i) {
          var x1 = ax + i * (cwid + 10); fc(PCD); dc(LC); doc.setLineWidth(0.8); doc.roundedRect(x1, sy2, cwid, 58, 10, 10, "FD");
          tx(it[0], x1 + cwid / 2, sy2 + 18, "helvetica", "normal", 8, GY, { align: "center", charSpace: 1.2 }); tx(it[1], x1 + cwid / 2, sy2 + 44, "helvetica", "bold", 22, it[2], { align: "center" });
        });
        // per-habit percentage bars
        var by = sy2 + 88; fc(GR); doc.rect(ax, by, tw, hr, "F"); tx("HABIT COMPLETION", ax + 6, by + 13.5, "helvetica", "bold", 8.5, WH);
        for (r = 0; r < NH; r++) {
          cnt = 0; for (c = 0; c < pn; c++) if (pr[c].c(r) === 1) cnt++;
          var pc = pn ? cnt / pn : 0, yb = by + hr + r * 24, bw3 = tw - nw - 60;
          tx((r + 1) + ". " + trunc(HN[r], nw - 20, 7.5), ax + 6, yb + 15, "helvetica", "normal", 7.5, WH);
          fc(PCD); doc.rect(ax + nw, yb + 7, bw3, 10, "F"); fc(PB); if (pc > 0) doc.rect(ax + nw, yb + 7, bw3 * pc, 10, "F");
          tx(Math.round(pc * 100) + "%", bx - 4, yb + 15, "helvetica", "bold", 8, WH, { align: "right" });
          ln(ax, yb + 24, bx, yb + 24, LC, 0.3);
        }
        // Page 3: date-wise log
        pageBase("DATE-WISE LOG", plbl + "  |  habits done, water, steps and sleep for each date");
        var cols3 = [["Date", 96], ["Habits done", 92], ["Water", 108], ["Steps", 96], ["Sleep", 0]], xs = [], xx = ax;
        cols3[4][1] = tw - 96 - 92 - 108 - 96;
        y0 = 82; fc(GR); doc.rect(ax, y0, tw, hr, "F");
        cols3.forEach(function (cc, i) { xs.push(xx); tx(cc[0], xx + 8, y0 + 13.5, "helvetica", "bold", 8.5, WH); xx += cc[1]; });
        var lh = Math.min(22, (H - 60 - y0 - hr) / Math.max(pn, 1)), wg = state.waterGoal || 0, sg = (state.stepGoal || 0) * 1000;
        for (r = 0; r < pn; r++) {
          var yr = y0 + hr + r * lh, rc = pr[r], dd = 0, ty = yr + lh / 2 + 2.6; for (k = 0; k < NH; k++) if (rc.c(k) === 1) dd++;
          fc(r % 2 ? PBG : PCD); doc.rect(ax, yr, tw, lh, "F");
          tx(WDN[pd[r].getDay()] + ", " + pd[r].getDate() + " " + MON[pd[r].getMonth()], xs[0] + 8, ty, "helvetica", "normal", 8, WH);
          tx(dd + " / " + NH, xs[1] + 8, ty, "helvetica", "bold", 8, dd === NH && NH ? PB : WH);
          tx(rc.w ? (rc.w / 1000).toFixed(2).replace(/\.?0+$/, "") + " L" : "-", xs[2] + 8, ty, "helvetica", "normal", 8, rc.w && rc.w >= wg ? PB : rc.w ? PR : GY);
          tx(rc.s ? rc.s.toLocaleString("en-US") : "-", xs[3] + 8, ty, "helvetica", "normal", 8, rc.s && rc.s >= sg ? PB : rc.s ? PR : GY);
          tx(rc.h !== undefined ? rc.h + " hrs" : "-", xs[4] + 8, ty, "helvetica", "normal", 8, rc.h === undefined ? GY : rc.h >= 6 && rc.h <= 9 ? PB : PR);
          ln(ax, yr + lh, bx, yr + lh, LC, 0.3);
        }
        var ge = y0 + hr + pn * lh;
        for (i2 = 1; i2 < 5; i2++) ln(xs[i2], y0, xs[i2], ge, LC, 0.3);
        dc(LC); doc.setLineWidth(1.1); doc.rect(ax, y0, tw, ge - y0, "S");
        tx("Blue = goal reached or healthy range, red = below goal.", ax, ge + 14, "helvetica", "normal", 7.5, GY);
      }
    }
    fc(BG); doc.rect(0, 0, W, H, "F"); dc(LINE); doc.setLineWidth(0.8); doc.rect(7, 7, W - 14, H - 14, "S"); logo();
    tx(rg ? "CUSTOM REPORT" : mo ? "MONTHLY REPORT" : wk ? "WEEKLY REPORT" : isTd ? "TODAY'S SHEET" : "DAILY REPORT", M, 42, "helvetica", "normal", 9, MUTED, { charSpace: 1.4 });
    tx(mo ? plbl : wk ? "Week " + (Math.floor(d / 7) + 1) + "  -  " + first.getDate() + " " + MON[first.getMonth()] + " - " + last.getDate() + " " + MON[last.getMonth()] + " " + last.getFullYear() : WDF[last.getDay()] + ", " + last.getDate() + " " + MONTHS[last.getMonth()] + " " + last.getFullYear(), M, 70, "helvetica", "bold", 24, WHITE);
    tx(clean(state.name ? state.name : "Habit & Sleep & Water Tracker"), M, 87, "helvetica", "normal", 10, MUTED);
    ln(M, 96, M + 60, 96, RED, 3);

    // ring: habit = band (habit 1 outermost), day = wedge, starting at 12 o'clock so results sit right beside the names
    var R = 200, ri = 86, cx = W / 2, cy = 150 + R, T = (R - ri) / N, DEG = 283 / SL;
    function pt(r, a) { var t = a * Math.PI / 180; return [cx + r * Math.cos(t), cy - r * Math.sin(t)]; }
    function wedge(kk, sl, sty) {
      var ro = R - kk * T, rin = ro - T, a0 = 90 - sl * DEG, a1 = a0 - DEG, pts = [], q, st = 13, segs = [];
      for (q = 0; q <= st; q++) pts.push(pt(ro, a0 + (a1 - a0) * q / st));
      for (q = 0; q <= st; q++) pts.push(pt(rin, a1 + (a0 - a1) * q / st));
      for (q = 1; q < pts.length; q++) segs.push([pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]]);
      doc.lines(segs, pts[0][0], pts[0][1], [1, 1], sty, true);
    }
    for (s = 0; s < n; s++) for (k = 0; k < N; k++) {
      var v = recs[s].c(k); doc.setLineWidth(0.6);
      if (v === 1) { fc(BLUE); dc(BG); wedge(k, s, "FD"); } else if (v === 2) { fc(RED); dc(BG); wedge(k, s, "FD"); } else { dc(LINE); wedge(k, s, "S"); }
    }
    if (!mo) { dc(WHITE); doc.setLineWidth(1.3);
    for (s = 0; s < n; s++) for (k = 0; k < N; k++) wedge(k, s, "S"); }
    for (s = 0; s < n; s++) {
      var a = 90 - (s + 0.5) * DEG, p1 = pt(R + (mo ? 10 : 14), a), p2 = pt(R + (mo ? 21 : 30), a), ns = mo ? 7.5 : wk ? 11 : 12, ws = mo ? 5.5 : wk ? 7.5 : 8;
      var isT = mo ? (!rg && s === d) : true, fw = (mo && !isT) ? "normal" : "bold", c1 = isT ? BLUE : MUTED, c2 = isT ? BLUE : (ds[s].getDay() === 0 ? [255, 92, 92] : MUTED);
      tx(ds[s].getDate(), p1[0], p1[1] + ns * 0.36, "helvetica", fw, ns, c1, { align: "center" });
      tx(WDN[ds[s].getDay()], p2[0], p2[1] + ws * 0.36, "helvetica", fw, ws, c2, { align: "center" });
    }
    // habit names in the gap, with the result right beside each one
    var lx = cx - R - 1, top0 = cy - R;
    tx("DAILY HABITS", lx, top0 - 6, "helvetica", "bold", 10, MUTED);
    for (k = 0; k <= N; k++) ln(lx, top0 + k * T, cx, top0 + k * T, LINE, 0.5);
    for (k = 0; k < N; k++) {
      var base = top0 + (k + 1) * T - 3.4, nm = clean(habName(k)), lab, lc, cnt = 0;
      for (s = 0; s < n; s++) if (recs[s].c(k) === 1) cnt++;
      if (wk || mo) { lab = cnt + " / " + n; lc = cnt / n >= 0.7 ? BLUE : cnt / n < 0.45 ? RED : MUTED; }
      else { var v0 = recs[0].c(k); lab = v0 === 1 ? "Done" : v0 === 2 ? "Missed" : "-"; lc = v0 === 1 ? BLUE : v0 === 2 ? RED : MUTED; }
      tx((k + 1) + ".", lx + 3, base, "helvetica", "normal", 7.5, WHITE);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      while (nm.length && doc.getTextWidth(nm) > R - 70) nm = nm.slice(0, -1);
      tx(nm, lx + 17, base, "helvetica", "normal", 7.5, WHITE);
      tx(lab, cx - 4, base, "helvetica", "bold", 6.5, lc, { align: "right" });
    }
    // summary text
    var done = 0; for (s = 0; s < n; s++) for (k = 0; k < N; k++) if (recs[s].c(k) === 1) done++;
    var ty = (wk || mo) ? cy : cy - ri + 70, pct = Math.round(N ? done / (N * n) * 100 : 0);
    tx(rg ? "Period Of" : mo ? "Month Of" : wk ? "Week " + (Math.floor(d / 7) + 1) : isTd ? "Today" : "Day Of", cx, ty - 6, "times", "italic", 26, MUTED, { align: "center" });
    tx(mo ? plbl : wk ? first.getDate() + " - " + last.getDate() + " " + MON[last.getMonth()] + " " + last.getFullYear() : last.getDate() + " " + MON[last.getMonth()] + " " + last.getFullYear(), cx, ty + 14, "helvetica", "normal", 11, WHITE, { align: "center" });
    tx(done + " / " + (N * n) + " done (" + pct + "%)", cx, ty + 31, "helvetica", "bold", 10, BLUE, { align: "center" });
    // legend
    var ly = (wk || mo) ? cy + R + 58 : ty + 66;
    [[1, "Done", cx - 120], [2, "Missed", cx - 45], [0, "Not answered", cx + 35]].forEach(function (lg) {
      var cc = lg[0] === 1 ? BLUE : lg[0] === 2 ? RED : MUTED; if (lg[0]) fc(cc); dc(cc); doc.setLineWidth(0.9);
      doc.roundedRect(lg[2], ly - 8, 11, 11, 2.5, 2.5, lg[0] ? "FD" : "S"); tx(lg[1], lg[2] + 16, ly, "helvetica", "normal", 8, MUTED);
    });
    // water, steps, sleep (today: the day; weekly: average of logged days)
    var y = (wk || mo) ? cy + R + 86 : ty + 100, wG = state.waterGoal, sG = state.stepGoal * 1000, items;
    head(mo ? "WATER, STEPS & SLEEP  -  " + (rg ? "PERIOD" : "MONTHLY") + " AVERAGE" : wk ? "WATER, STEPS & SLEEP  -  WEEKLY AVERAGE" : "WATER, STEPS & SLEEP", y); y += 20;
    function avg(arr) { var x = arr.filter(function (q) { return q > 0; }); return x.length ? x.reduce(function (a2, b2) { return a2 + b2; }, 0) / x.length : 0; }
    if (wk || mo) {
      var aw = avg(recs.map(function (r) { return r.w; })), as = avg(recs.map(function (r) { return r.s; })), sl7 = recs.filter(function (r) { return r.h !== undefined; }).map(function (r) { return r.h; }), asl = sl7.length ? sl7.reduce(function (a2, b2) { return a2 + b2; }, 0) / sl7.length : null;
      var hw = recs.filter(function (r) { return r.w >= wG && r.w > 0; }).length, hs = recs.filter(function (r) { return r.s >= sG && r.s > 0; }).length, hl = sl7.filter(function (q) { return q >= 6 && q <= 9; }).length;
      items = [{ t: "WATER AVG", v: fmtL(aw), sub: "goal " + fmtL(wG) + "  -  hit " + hw + " / " + n + " days", ok: aw >= wG && aw > 0 }, { t: "STEPS AVG", v: String(Math.round(as)), sub: "goal " + Math.round(sG) + "  -  hit " + hs + " / " + n + " days", ok: as >= sG && as > 0 }, { t: "SLEEP AVG", v: asl === null ? "-" : fmtH(asl), sub: asl === null ? "not logged" : "healthy 6 to 9 hrs  -  " + hl + " / " + sl7.length + " nights", ok: asl !== null && asl >= 6 && asl <= 9 }];
    } else {
      var r0 = recs[0];
      items = [{ t: "WATER", v: fmtL(r0.w), sub: "goal " + fmtL(wG), ok: r0.w >= wG && r0.w > 0 }, { t: "STEPS", v: String(Math.round(r0.s)), sub: "goal " + Math.round(sG), ok: r0.s >= sG && r0.s > 0 }, { t: "SLEEP", v: r0.h !== undefined ? fmtH(r0.h) : "-", sub: r0.h !== undefined ? "healthy 6 to 9 hrs" : "not logged", ok: r0.h !== undefined && r0.h >= 6 && r0.h <= 9 }];
    }
    var iw = (W - 2 * M - 20) / 3;
    items.forEach(function (it, i) {
      var x = M + i * (iw + 10), col = it.ok ? BLUE : RED;
      fc(CARD); dc(LINE); doc.setLineWidth(0.8); doc.roundedRect(x, y, iw, 72, 10, 10, "FD");
      fc(col); dc(col); doc.setLineWidth(1); doc.roundedRect(x + 9, y + 9, 34, 34, 8, 8, "FD");
      if (it.ok) tick(x + 26, y + 26, 0.85); else cross(x + 26, y + 26, 0.85);
      tx(it.t, x + 52, y + 22, "helvetica", "normal", 8, MUTED, { charSpace: 1.2 });
      tx(clean(it.v), x + 52, y + 38, "helvetica", "bold", 12, WHITE);
      tx(clean(it.sub) + ((wk || mo) ? "" : it.ok ? "  -  reached" : "  -  not reached"), x + 12, y + 60, "helvetica", "normal", (wk || mo) ? 7 : 8, col);
    });
    tx("Generated " + new Date().toLocaleString(), M, H - 20, "helvetica", "normal", 8, MUTED);
    // ---- key goals and notes, kept short at the foot of the same page so the whole report fits on one A4 sheet ----
    var nts = ((sy === vy && sm === vm) ? state : ((state.archive || {})[sy + "-" + (sm + 1)] || {})).notes || [], ny = y + 72 + 10, bw = (W - 2 * M - 12) / 2;
    [["KEY GOALS", nts[0]], ["NOTES", nts[1]]].forEach(function (b, bi) {
      var bx = M + bi * (bw + 12);
      fc(LINE); doc.rect(bx, ny, bw, 18, "F"); tx(b[0], bx + 6, ny + 12.5, "helvetica", "bold", 9.5, WHITE);
      var ls = clean(b[1] || "").split(/\n/).filter(function (z) { return z.trim(); }).slice(0, 3);
      for (var z = 0; z < 3; z++) {
        var t = ls[z] || ""; doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
        while (t.length && doc.getTextWidth(t) > bw - 12) t = t.slice(0, -1);
        tx(t, bx + 6, ny + 31 + z * 12.5, "helvetica", "normal", 8.5, WHITE); ln(bx, ny + 35 + z * 12.5, bx + bw, ny + 35 + z * 12.5, LINE, 0.5);
      }
    });
    // ---- monthly and custom reports only: date-wise details on extra pages (day-by-day totals, then every habit for every date) ----
    if (mo || rg) {
    var q, ttl = mo ? plbl : first.getDate() + " " + MON[first.getMonth()] + " - " + last.getDate() + " " + MON[last.getMonth()] + " " + last.getFullYear();
    doc.addPage(); fc(BG); doc.rect(0, 0, W, H, "F"); dc(LINE); doc.setLineWidth(0.8); doc.rect(7, 7, W - 14, H - 14, "S"); logo();
    tx((rg ? "CUSTOM REPORT" : "MONTHLY REPORT") + "  -  DATE-WISE DETAILS", M, 40, "helvetica", "normal", 9, MUTED, { charSpace: 1.2 });
    tx(ttl, M, 64, "helvetica", "bold", 20, WHITE); ln(M, 72, M + 60, 72, RED, 3);
    var y2 = 104;
    head("DATE-WISE LOG", y2); y2 += 20;
    var c2 = [M + 6, M + 112, M + 182, M + 252, M + 330, M + 425], rh = mo ? 14.2 : 18, fs = mo ? 8.5 : 9.5, tl = 0, tdn = 0, tms = 0, ts = 0, ch = 0, tw = 0, cw = 0, tst = 0, cst = 0;
    ["Date", "Done", "Missed", "Sleep", "Water", "Steps"].forEach(function (t, i) { tx(t, c2[i], y2, "helvetica", "bold", 8.5, MUTED); });
    y2 += 5; ln(M, y2, W - M, y2, LINE, 0.8); y2 += 12;
    ds.forEach(function (dt, i) {
      var r = recs[i], dn = 0, ms = 0, any = false;
      for (k = 0; k < N; k++) { var cv = r.c(k); if (cv === 1) dn++; else if (cv === 2) ms++; if (cv) any = true; }
      tx(WDF[dt.getDay()].slice(0, 3) + " " + dt.getDate() + " " + MON[dt.getMonth()], c2[0], y2, "helvetica", "normal", fs, WHITE);
      if (!(any || r.w > 0 || r.s > 0 || r.h !== undefined)) { for (q = 1; q < 6; q++) tx("-", c2[q], y2, "helvetica", "normal", fs, MUTED); }
      else {
        tl++; tdn += dn; tms += ms;
        tx(dn + " / " + N, c2[1], y2, "helvetica", "normal", fs, BLUE); tx(ms, c2[2], y2, "helvetica", "normal", fs, ms ? RED : MUTED);
        if (r.h !== undefined) { ch++; ts += r.h; tx(fmtH(r.h), c2[3], y2, "helvetica", "normal", fs, r.h >= 6 && r.h <= 9 ? BLUE : RED); } else tx("-", c2[3], y2, "helvetica", "normal", fs, MUTED);
        if (r.w > 0) { cw++; tw += r.w; tx(fmtL(r.w) + (r.w >= wG ? " *" : ""), c2[4], y2, "helvetica", "normal", fs, r.w >= wG ? BLUE : WHITE); } else tx("-", c2[4], y2, "helvetica", "normal", fs, MUTED);
        if (r.s > 0) { cst++; tst += r.s; tx(Math.round(r.s) + (r.s >= sG ? " *" : ""), c2[5], y2, "helvetica", "normal", fs, r.s >= sG ? BLUE : WHITE); } else tx("-", c2[5], y2, "helvetica", "normal", fs, MUTED);
      }
      y2 += rh - 7; ln(M, y2, W - M, y2, LINE, 0.4); y2 += rh - 7;
    });
    if (tl) {
      y2 += 1; tx("Total / average", c2[0], y2, "helvetica", "bold", fs, WHITE);
      tx(tdn + " / " + (N * tl), c2[1], y2, "helvetica", "bold", fs, WHITE); tx(tms, c2[2], y2, "helvetica", "bold", fs, WHITE);
      tx(ch ? fmtH(ts / ch) : "-", c2[3], y2, "helvetica", "bold", fs, WHITE); tx(cw ? fmtL(tw / cw) : "-", c2[4], y2, "helvetica", "bold", fs, WHITE); tx(cst ? Math.round(tst / cst) : "-", c2[5], y2, "helvetica", "bold", fs, WHITE);
    }
    tx("* = daily goal reached (water " + fmtL(wG) + ", steps " + Math.round(sG) + ")", M + 6, H - 34, "helvetica", "normal", 7.5, MUTED);
    tx("Generated " + new Date().toLocaleString(), M, H - 20, "helvetica", "normal", 8, MUTED);
    {
      var hl3 = rg ? "CUSTOM REPORT" : "MONTHLY REPORT";
      doc.addPage(); fc(BG); doc.rect(0, 0, W, H, "F"); dc(LINE); doc.setLineWidth(0.8); doc.rect(7, 7, W - 14, H - 14, "S"); logo();
      tx(hl3 + "  -  HABIT LOG", M, 40, "helvetica", "normal", 9, MUTED, { charSpace: 1.2 });
      tx(ttl, M, 64, "helvetica", "bold", 20, WHITE); ln(M, 72, M + 60, 72, RED, 3);
      var gx = M + 150, cwd = Math.min(46, (W - M - gx) / n), bs = Math.min(16, cwd - 3), yy = 104, sm2 = n > 8;
      head("HABIT LOG", yy); yy += 26;
      ds.forEach(function (dt, i) { var xc = gx + i * cwd + cwd / 2; tx(dt.getDate(), xc, yy, "helvetica", "bold", sm2 ? 6.5 : 9, MUTED, { align: "center" }); tx(sm2 ? WDN[dt.getDay()].charAt(0) : WDN[dt.getDay()], xc, yy + 9, "helvetica", "normal", sm2 ? 5.5 : 7, MUTED, { align: "center" }); });
      yy += 18;
      for (k = 0; k < N; k++) {
        var nm2 = clean(habName(k)); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
        while (nm2.length && doc.getTextWidth(nm2) > 138) nm2 = nm2.slice(0, -1);
        tx((k + 1) + ". " + nm2, M + 4, yy + bs / 2 + 3, "helvetica", "normal", 8.5, WHITE);
        for (s = 0; s < n; s++) {
          var gv = recs[s].c(k), bx = gx + s * cwd + (cwd - bs) / 2, cc = gv === 1 ? BLUE : gv === 2 ? RED : MUTED;
          if (gv) fc(cc); dc(cc); doc.setLineWidth(0.9); doc.roundedRect(bx, yy, bs, bs, 3, 3, gv ? "FD" : "S");
          if (bs >= 14 && gv) { if (gv === 1) tick(bx + bs / 2, yy + bs / 2, 0.34); else cross(bx + bs / 2, yy + bs / 2, 0.34); }
        }
        ln(M, yy + bs + 4, W - M, yy + bs + 4, LINE, 0.4); yy += bs + 10;
      }
      tx("Done", M + 4, yy + bs / 2 + 3, "helvetica", "bold", 8.5, MUTED);
      for (s = 0; s < n; s++) { var cn = 0, ay = false; for (k = 0; k < N; k++) { var g2 = recs[s].c(k); if (g2 === 1) cn++; if (g2) ay = true; } tx(ay ? cn : "-", gx + s * cwd + cwd / 2, yy + bs / 2 + 3, "helvetica", "bold", sm2 ? 6.5 : 8, cn ? BLUE : MUTED, { align: "center" }); }
      tx("Generated " + new Date().toLocaleString(), M, H - 20, "helvetica", "normal", 8, MUTED);
    }
    }
    return doc.output("blob");
  }
  var RING_WD_PDF = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function build() { return buildSheet(gid("pdf-kind").value); }

  (function () { var f = gid("pdf-date"), p2 = function (q) { return String(q).padStart(2, "0"); }; if (f) f.value = vy + "-" + p2(vm + 1) + "-" + p2(today || ciDay + 1); })();
  var dl = document.getElementById("dl");
  // Standalone version: save through a normal browser download.
  var downloads = {
    save: function (o) {
      var url = URL.createObjectURL(o.data), a = document.createElement("a");
      a.href = url; a.download = o.filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return Promise.resolve({ status: "saved" });
    }
  };
  dl.hidden = true;
  function dlLabel(t, ms) { dl.textContent = t; if (ms) setTimeout(function () { dl.textContent = "Download PDF"; }, ms); }
  dl.addEventListener("click", function () {
    if (!downloads) return;
    var blob;
    try { blob = build(); } catch (e) { dlLabel("Could not build PDF", 2500); return; }
    dl.disabled = true; dlLabel("Saving…");
    var kind = gid("pdf-kind").value, name = (kind === "range" ? "custom-" : kind === "month" ? "monthly-" : kind === "week" ? "weekly-" : "today-") + selStamp(kind) + (kind === "today" ? "-habit-sheet.pdf" : "-habit-report.pdf");
    downloads.save({ filename: name, data: blob }).then(function () {
      dl.disabled = false; dlLabel("Saved", 2000);
    }).catch(function (err) {
      dl.disabled = false;
      if (err && err.code === "declined") dlLabel("Download PDF"); else dlLabel("Could not save", 2500);
    });
  });

  // PDF preview: build the chosen PDF and show it in a dialog before downloading.
  var pvUrl = null;
  function pvClose() { gid("pv").hidden = true; gid("pv-frame").src = "about:blank"; if (pvUrl) { URL.revokeObjectURL(pvUrl); pvUrl = null; } }
  gid("pdf-prev").addEventListener("click", function () {
    var blob; try { blob = build(); } catch (e) { return; }
    if (pvUrl) URL.revokeObjectURL(pvUrl);
    pvUrl = URL.createObjectURL(blob);
    gid("pv-frame").src = pvUrl; gid("pv-open").href = pvUrl; gid("pv").hidden = false;
  });
  // Direct downloads (no preview): full month sheet, or the single-day sheet.
  var repKind = "today", repEl = gid("rep"), repWeek = 1, WDF2 = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var REP_DESC = { today: "Habit ring, water, steps and sleep for today, plus key goals, notes and the logs.", week: "The chosen week of the month, plus key goals, notes and the logs.", month: "The whole month, plus key goals, notes and the logs.", range: "Pick a start and end date (up to 31 days), plus key goals, notes and the logs." };
  function p2(q) { return String(q).padStart(2, "0"); }
  function curDay() { return today || ciDay + 1; }
  function todayStr() { return vy + "-" + p2(vm + 1) + "-" + p2(curDay()); }
  function pd(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function fmd(x) { return x.getDate() + " " + MON[x.getMonth()] + " " + x.getFullYear(); }
  function repSetup() {
    var dim = new Date(vy, vm + 1, 0).getDate(), wb = gid("rep-weeks"), sel = gid("pdf-month"), q;
    wb.innerHTML = "";
    for (q = 1; q <= 5; q++) { (function (w) { var b = document.createElement("button"); b.type = "button"; b.textContent = "Week " + w; b.setAttribute("data-w", w); b.hidden = (w - 1) * 7 + 1 > dim; b.addEventListener("click", function () { repWeek = w; repRefresh(); }); wb.appendChild(b); })(q); }
    sel.innerHTML = ""; for (q = 0; q < 12; q++) { var o = document.createElement("option"); o.value = q; o.textContent = MONTHS[q]; sel.appendChild(o); }
    sel.value = vm; repWeek = Math.floor((curDay() - 1) / 7) + 1;
    ["pdf-from", "pdf-to"].forEach(function (i) { if (!gid(i).value) gid(i).value = todayStr(); });
  }
  function repRefresh() {
    gid("rep-wk").hidden = repKind !== "week"; gid("rep-mo").hidden = repKind !== "month"; gid("rep-two").hidden = repKind !== "range";
    [].forEach.call(document.querySelectorAll(".rep-tabs button"), function (b) { b.classList.toggle("on", b.getAttribute("data-k") === repKind); });
    [].forEach.call(document.querySelectorAll(".rep-weeks button"), function (b) { b.classList.toggle("on", +b.getAttribute("data-w") === repWeek); });
    var a = pd(gid("pdf-from").value), b = pd(gid("pdf-to").value), L = "", dim = new Date(vy, vm + 1, 0).getDate(), s0 = (repWeek - 1) * 7 + 1, e0 = Math.min(repWeek * 7, dim);
    if (repKind === "range") L = a && b ? (b < a ? "The end date is before the start date" : fmd(a) + " to " + fmd(b) + " (" + (Math.round((b - a) / 864e5) + 1) + " days" + (Math.round((b - a) / 864e5) > 30 ? ", first 31 shown" : "") + ")") : "Pick a start and an end date";
    else if (repKind === "today") { var t = new Date(vy, vm, curDay()); L = WDF2[t.getDay()] + ", " + fmd(t); }
    else if (repKind === "week") L = "Week " + repWeek + "  -  " + s0 + " to " + e0 + " " + MONTHS[vm] + " " + vy;
    else L = MONTHS[+gid("pdf-month").value];
    gid("rep-lbl").textContent = L; gid("rep-desc").textContent = REP_DESC[repKind];
  }
  function repGo(prev) {
    var v;
    if (repKind === "range") { var a = pd(gid("pdf-from").value), b = pd(gid("pdf-to").value); if (!a || !b || b < a) { repRefresh(); return; } v = gid("pdf-from").value; }
    else if (repKind === "week") v = vy + "-" + p2(vm + 1) + "-" + p2((repWeek - 1) * 7 + 1);
    else if (repKind === "month") v = vy + "-" + p2(+gid("pdf-month").value + 1) + "-01";
    else v = todayStr();
    gid("pdf-date").value = v; gid("pdf-kind").value = repKind;
    if (prev) gid("pdf-prev").click(); else dl.click();
  }
  gid("rep-open").addEventListener("click", function () {
    repSetup(); repEl.hidden = false; repRefresh();
  });
  gid("rep-x").addEventListener("click", function () { repEl.hidden = true; });
  repEl.addEventListener("click", function (e) { if (e.target === repEl) repEl.hidden = true; });
  [].forEach.call(document.querySelectorAll(".rep-tabs button"), function (b) { b.addEventListener("click", function () { repKind = b.getAttribute("data-k"); repRefresh(); }); });
  ["pdf-from", "pdf-to", "pdf-month"].forEach(function (i) { gid(i).addEventListener("input", repRefresh); gid(i).addEventListener("change", repRefresh); });
  gid("rep-prev").addEventListener("click", function () { repGo(true); });
  gid("rep-dl").addEventListener("click", function () { repGo(false); });
  gid("pv-x").addEventListener("click", pvClose);
  gid("pv-dl").addEventListener("click", function () { pvClose(); dl.click(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") pvClose(); });

  // Grey out days that do not exist in this month (for example 29 to 31 in November).
  for (var off = DIM; off < D; off++) {
    dayEls[off].classList.add("off");
    wdEls[off].classList.add("off");
  }

  // Leave the page open past midnight: reload on the new date so the month changes by itself.
  var loadedDay = now.toDateString();
  function checkDate() { if (new Date().toDateString() !== loadedDay) { save(); location.reload(); } }
  setInterval(checkDate, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) checkDate(); });

  render();
})();

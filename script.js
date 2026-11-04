(function () {
  var KEY = "habit-sleep-tracker-v1";
  var R = 250, r = 96, N = 10, D = 31, CX = 320, CY = 330, SWEEP = 283;
  var DEG = SWEEP / D, T = (R - r) / N;
  var HOURS = ["10 hrs", "9 hrs", "8 hrs", "7 hrs", "6 hrs", "5 hrs", "< 5 hrs"];
  var HVAL = [10, 9, 8, 7, 6, 5, 4];
  var NS = "http://www.w3.org/2000/svg";
  var now = new Date();
  var today = now.getDate();

  var DIM = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  function monthLabel() { return ["January","February","March","April","May","June","July","August","September","October","November","December"][now.getMonth()] + " " + now.getFullYear(); }

  function fresh() {
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return { habits: ["", "", "", "", "", "", "", "", "", ""], cells: {}, sleep: {}, notes: ["", "", ""], month: monthLabel(), monthKey: now.getFullYear() + "-" + (now.getMonth() + 1), archive: {}, name: "" };
  }
  var state = fresh();
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var p = JSON.parse(raw); if (p && p.habits) state = Object.assign(fresh(), p); }
  } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  // A new month starts: keep last month's boxes in the archive and begin a clean sheet.
  var monthKey = now.getFullYear() + "-" + (now.getMonth() + 1);
  if (state.monthKey && state.monthKey !== monthKey) {
    state.archive = state.archive || {};
    state.archive[state.monthKey] = { month: state.month, cells: state.cells, sleep: state.sleep, notes: state.notes };
    state.cells = {}; state.sleep = {};
    state.month = monthLabel();
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
  var rows = document.getElementById("habit-rows");
  var counts = [];
  for (var d = 0; d < D; d++) {
    var a = (90 - (d + 0.5) * DEG) * Math.PI / 180;
    var tx = document.createElementNS(NS, "text");
    tx.setAttribute("x", (CX + (R + 14) * Math.cos(a)).toFixed(2));
    tx.setAttribute("y", (CY - (R + 14) * Math.sin(a)).toFixed(2));
    tx.setAttribute("class", "dayno" + (d + 1 === today ? " today" : ""));
    tx.textContent = d + 1;
    dayEls.push(tx);
    svg.appendChild(tx);
  }

  // Draws the ring, the numbers and the habit rows for however many habits there are.
  function buildHabits() {
    N = state.habits.length;
    T = (R - r) / N;
    g.textContent = "";
    cellEls = {};
    var oldNums = svg.querySelectorAll(".ringnum");
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
      (function (idx) { inp.addEventListener("input", function (e) { state.habits[idx] = e.target.value; save(); ciRender(); }); })(h);
      var cnt = document.createElement("span");
      cnt.className = "count";
      counts.push(cnt);
      row.appendChild(num); row.appendChild(inp); row.appendChild(cnt);
      rows.appendChild(row);
    }
  }
  buildHabits();

  // sleep table
  var table = document.getElementById("sleep");
  var thead = "<thead><tr><th scope=\"col\">Hours slept / day</th>";
  for (var c = 1; c <= D; c++) thead += "<th scope=\"col\"" + (c === today ? " class=\"today\"" : "") + ">" + c + "</th>";
  thead += "</tr></thead>";
  var tbody = "<tbody>";
  for (var q = 0; q < HOURS.length; q++) {
    tbody += "<tr><th scope=\"row\">" + HOURS[q].replace("<", "&lt;") + "</th>";
    for (var dd = 0; dd < D; dd++) {
      tbody += "<td><button type=\"button\" class=\"slot\" data-row=\"" + q + "\" data-day=\"" + dd + "\" aria-label=\"" + HOURS[q].replace("<", "under") + ", day " + (dd + 1) + "\"></button></td>";
    }
    tbody += "</tr>";
  }
  tbody += "</tbody>";
  table.innerHTML = thead + tbody;

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
    var slots = table.querySelectorAll(".slot");
    for (var s = 0; s < slots.length; s++) {
      var rr = slots[s].getAttribute("data-row"), dy = slots[s].getAttribute("data-day");
      slots[s].classList.toggle("on", state.sleep[dy] === parseInt(rr, 10));
    }
    var days = Object.keys(state.sleep), sum = 0;
    days.forEach(function (dk) { sum += HVAL[state.sleep[dk]]; });
    nightsEl.textContent = days.length;
    ciRender();
    hbUpdate();
    avgEl.textContent = days.length ? (sum / days.length).toFixed(1) + " hrs" : "–";
  }

  g.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.getAttribute || t.getAttribute("data-k") === null) return;
    if (parseInt(t.getAttribute("data-i"), 10) >= DIM) return;
    var key = t.getAttribute("data-k") + "-" + t.getAttribute("data-i");
    var cur = state.cells[key] || 0; if (cur >= 2) delete state.cells[key]; else state.cells[key] = cur + 1;
    save(); render();
  });
  table.addEventListener("click", function (e) {
    var t = e.target.closest(".slot");
    if (!t || t.disabled) return;
    var dy = t.getAttribute("data-day"), rr = parseInt(t.getAttribute("data-row"), 10);
    if (state.sleep[dy] === rr) delete state.sleep[dy]; else state.sleep[dy] = rr;
    save(); render();
  });

  for (var nIdx = 0; nIdx < 3; nIdx++) {
    (function (idx) {
      var ta = document.getElementById("note-" + idx);
      ta.value = state.notes[idx] || "";
      ta.addEventListener("input", function () { state.notes[idx] = ta.value; save(); });
    })(nIdx);
  }
  var month = document.getElementById("month");
  month.value = state.month;
  month.addEventListener("input", function () { state.month = month.value; save(); });
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
    state.cells = {}; state.sleep = {}; ciHab = 0; reviewing = false;
    save(); render();
    clear.textContent = "Cleared";
    clear.classList.remove("warn");
    setTimeout(function () { clear.textContent = "Clear this month"; }, 1500);
  });

  /* ---------- Daily check-in: one question per habit ---------- */
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var ciDay = Math.min(today, D) - 1, ciHab = 0, reviewing = false;
  function gid(id) { return document.getElementById(id); }
  function answered(k) { return state.cells[k + "-" + ciDay] || 0; }
  function nextOpen(from) { for (var k = from + 1; k < N; k++) if (!answered(k)) return k; return -1; }
  function habName(k) { return (state.habits[k] || "").trim() || "Habit " + (k + 1); }
  ciHab = nextOpen(-1);

  function ciRender() {
    var open = 0, k;
    for (k = 0; k < N; k++) if (!answered(k)) open++;
    var dt = new Date(now.getFullYear(), now.getMonth(), ciDay + 1);
    var label = "Day " + (ciDay + 1);
    if (dt.getMonth() === now.getMonth()) label = WD[dt.getDay()] + " " + (ciDay + 1) + " " + MON[dt.getMonth()];
    gid("ci-day").textContent = label;
    gid("ci-prog").textContent = (N - open) + " of " + N + " answered";
    gid("ci-prev").disabled = ciDay <= 0;
    gid("ci-next").disabled = ciDay >= DIM - 1;
    dayEls.forEach(function (el, i) { el.classList.toggle("sel", i === ciDay); });
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
    var acc = [29, 78, 216];
    function poly(pts, style) {
      var segs = [];
      for (var q = 1; q < pts.length; q++) segs.push([pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]]);
      doc.lines(segs, pts[0][0], pts[0][1], [1, 1], style, true);
    }

    doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, H, "F");
    doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.8); doc.rect(7, 7, W - 14, H - 14, "S");
    doc.setDrawColor(34, 38, 35); doc.setTextColor(34, 38, 35);

    // top boxes
    var px0 = 22, gap = 10, pw = (W - 2 * px0 - 2 * gap) / 3, pt = 22, ph = 100;
    var titles = ["KEY GOALS", "CONTRACT & REWARD", "NOTES"];
    for (var i = 0; i < 3; i++) {
      var x0 = px0 + i * (pw + gap);
      doc.setLineDashPattern([], 0); doc.setLineWidth(0.8);
      doc.roundedRect(x0, pt, pw, ph, 14, 14, "S");
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      doc.text(titles[i], x0 + 14, pt + 22, { charSpace: 1.2 });
      var lines = doc.splitTextToSize(clean(state.notes[i]).replace(/\n/g, " \n "), pw - 20);
      doc.setFontSize(8);
      for (var j = 0; j < 5; j++) {
        var ly = pt + 40 + j * 12.5;
        doc.setLineDashPattern([0.5, 2.2], 0); doc.setLineWidth(0.7);
        doc.line(x0 + 10, ly, x0 + pw - 10, ly);
        if (lines[j]) doc.text(lines[j].trim(), x0 + 10, ly - 2);
      }
      doc.setLineDashPattern([], 0);
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(34, 38, 35);
    doc.text("Name:", W - 24 - 190, 140);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(clean(state.name), W - 24 - 152, 139);
    doc.setLineDashPattern([], 0); doc.setLineWidth(0.5); doc.line(W - 24 - 154, 141, W - 24, 141);

    // circular tracker
    var cx = W / 2, Rr = 218, ri = 84, Tt = (Rr - ri) / N, cy = pt + ph + 30 + Rr;
    doc.setLineWidth(0.5);
    function tp(rad, a) { var t = a * Math.PI / 180; return [cx + rad * Math.cos(t), cy - rad * Math.sin(t)]; }
    for (var k = 0; k < N; k++) {
      for (var d = 0; d < D; d++) {
        var ro = Rr - k * Tt, rin = ro - Tt, a0 = 90 - d * DEG, a1 = a0 - DEG, pts = [], s;
        for (s = 0; s <= 3; s++) pts.push(tp(ro, a0 + (a1 - a0) * s / 3));
        for (s = 0; s <= 3; s++) pts.push(tp(rin, a1 + (a0 - a1) * s / 3));
        var cv = state.cells[k + "-" + d];
        if (cv) { var cl = cv === 2 ? [214, 40, 40] : acc; doc.setFillColor(cl[0], cl[1], cl[2]); poly(pts, "FD"); }
        else poly(pts, "S");
      }
    }
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    for (var dn = 0; dn < D; dn++) {
      var p = tp(Rr + 10, 90 - (dn + 0.5) * DEG);
      doc.text(String(dn + 1), p[0], p[1] + 2.7, { align: "center" });
    }
    doc.setFont("times", "italic"); doc.setFontSize(26);
    doc.text("Month Of", cx, cy - 12, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text(clean(state.month), cx, cy + 8, { align: "center" });
    doc.setFontSize(6);
    doc.text("© Created by : Besol Labs", cx, cy + 36, { align: "center" });

    // habit names
    var lx = cx - 205, top0 = cy - Rr;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("DAILY HABITS", lx, top0 - 6);
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
        doc.setFontSize(rf);
        for (var rn2 = 0; rn2 < N; rn2++) doc.text(String(rn2 + 1), cx - 2, top0 + (rn2 + 0.5) * Tt + rf * 0.35, { align: "right" });
      }
    }

    // sleep tracker
    var tx0 = 24, tx1 = W - 24, lw = 92, cw = (tx1 - tx0 - lw) / 31, top = cy + Rr + 28;
    var hy = top + 24, rowH = 21, headH = 18, bottom = hy + headH + 7 * rowH;
    doc.setFillColor(217, 217, 217); doc.rect(tx0, top, tx1 - tx0, 24, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("SLEEP TRACKER", tx0 + 8, top + 17);
    doc.setFillColor(acc[0], acc[1], acc[2]);
    Object.keys(state.sleep).forEach(function (dk) {
      doc.rect(tx0 + lw + parseInt(dk, 10) * cw, hy + headH + state.sleep[dk] * rowH, cw, rowH, "F");
    });
    doc.setLineWidth(0.5);
    for (var rr = 0; rr <= 7; rr++) doc.line(tx0, hy + headH + rr * rowH, tx1, hy + headH + rr * rowH);
    doc.line(tx0, hy, tx1, hy);
    for
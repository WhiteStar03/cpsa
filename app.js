/* ===== CPSA Practice — app logic ===== */
(function () {
  "use strict";
  const DATA = window.QUIZ_DATA;
  const Q = DATA.questions;
  const APP = DATA.appendices;   // {A:"Soft Skills...", ...}
  const SKILL = DATA.skills;     // {A1:"Engagement...", ...}
  const APP_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const APP_ICON = { A: "📋", B: "🧰", C: "🔎", D: "🌐", E: "🪟", F: "🐧", G: "🕸️", H: "🧪", I: "🎯", J: "🗄️" };

  const el = document.getElementById("app");
  const LS = {
    get(k, d) { try { return JSON.parse(localStorage.getItem("cpsa_" + k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("cpsa_" + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem("cpsa_" + k); } catch (e) {} }
  };

  /* ---------- persistent state ---------- */
  const state = {
    seen: new Set(LS.get("seen", [])),        // question ids answered at least once
    correct: new Set(LS.get("correct", [])),  // question ids answered correctly (latest)
    flagged: new Set(LS.get("flagged", [])),  // flagged for review
    history: LS.get("history", []),           // [{date, score, total, mode, label}]
    streak: LS.get("streak", { current: 0, best: 0, last: null })
  };
  function persist() {
    LS.set("seen", [...state.seen]); LS.set("correct", [...state.correct]);
    LS.set("flagged", [...state.flagged]); LS.set("history", state.history);
    LS.set("streak", state.streak);
  }

  /* ---------- theme ---------- */
  const themeBtn = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    themeIcon.textContent = t === "dark" ? "🌙" : "☀️";
    LS.set("theme", t);
  }
  applyTheme(LS.get("theme", "dark"));
  themeBtn.addEventListener("click", () =>
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));

  /* ---------- helpers ---------- */
  const byId = id => Q[id]; // ids are array indices
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML.replace(/`([^`]+)`/g, "<code>$1</code>"); }
  function appOf(id) { return byId(id).skill[0]; }
  function questionsForApp(a) { return Q.filter(q => q.skill[0] === a); }

  function updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.streak.last === today) return;
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    state.streak.current = state.streak.last === yest ? state.streak.current + 1 : 1;
    state.streak.best = Math.max(state.streak.best, state.streak.current);
    state.streak.last = today;
  }

  /* ================= ROUTER ================= */
  const routes = {};
  function go(name, arg) { window.scrollTo({ top: 0, behavior: "smooth" }); routes[name](arg); }

  /* ================= DASHBOARD ================= */
  routes.dashboard = function () {
    const total = Q.length;
    const answered = state.seen.size;
    const tests = state.history.length;
    const avg = tests ? Math.round(state.history.reduce((s, h) => s + h.score / h.total, 0) / tests * 100) : 0;
    el.innerHTML = `
    <div class="screen">
      <div class="panel">
        <div class="section-header">📊 Progress Overview</div>
        <div class="dashboard-stats-grid">
          <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${total}</div><div class="stat-label">Total Questions</div></div>
          <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${answered}</div><div class="stat-label">Attempted</div></div>
          <div class="stat-card"><div class="stat-icon">🏁</div><div class="stat-value">${tests}</div><div class="stat-label">Tests Done</div></div>
          <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-value">${avg}%</div><div class="stat-label">Avg Score</div></div>
        </div>
        <div class="cat-progress-track"><div class="cat-progress-fill" style="width:${total ? answered / total * 100 : 0}%"></div></div>
        <div class="progress-meta" style="margin-top:8px;margin-bottom:0"><span>Coverage</span><span>${answered} / ${total}</span></div>
      </div>
      <div class="panel">
        <div class="section-header">🚀 Study Actions</div>
        <div class="dashboard-actions-grid">
          <button class="action-card primary" data-go="topics"><span class="action-icon">📂</span><div class="action-content"><h3>Study by Topic</h3><p>Appendices A–J</p></div><span class="action-arrow">→</span></button>
          <button class="action-card secondary" data-go="random"><span class="action-icon">🎲</span><div class="action-content"><h3>Random Test</h3><p>Mixed 25 questions</p></div><span class="action-arrow">→</span></button>
          <button class="action-card tertiary" data-go="custom"><span class="action-icon">⚙️</span><div class="action-content"><h3>Custom Test</h3><p>Pick topics & length</p></div><span class="action-arrow">→</span></button>
          <button class="action-card stats" data-go="stats"><span class="action-icon">📈</span><div class="action-content"><h3>Statistics</h3><p>Streak, history, weak areas</p></div><span class="action-arrow">→</span></button>
        </div>
        <button class="action-card exam" data-go="exam" style="margin-top:14px;width:100%"><span class="action-icon">⏱️</span><div class="action-content"><h3>Exam Simulation</h3><p>Timed mock — mirrors the real 2-hour CPSA paper, feedback at the end</p></div><span class="action-arrow">→</span></button>
      </div>
      ${state.flagged.size ? `<div class="panel"><div class="section-header">🚩 Flagged</div>
        <p class="cat-count" style="margin-bottom:14px">You have ${state.flagged.size} flagged question${state.flagged.size > 1 ? "s" : ""} to review.</p>
        <button class="nav-button" style="max-width:260px" data-go="flaggedTest">Review flagged →</button></div>` : ""}
    </div>`;
    el.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
  };

  /* ================= STUDY BY TOPIC ================= */
  routes.topics = function () {
    const cards = APP_ORDER.map(a => {
      const qs = questionsForApp(a);
      const done = qs.filter(q => state.seen.has(q.id)).length;
      const skills = [...new Set(qs.map(q => q.skill))].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
      return `<button class="category-card" data-app="${a}">
        <div class="cat-head"><span class="cat-badge">${a}</span><span class="cat-title">${esc(APP[a])}</span></div>
        <div class="cat-count"><strong style="color:var(--text)">${done}</strong> / ${qs.length} covered · ${skills.length} skills</div>
        <div class="cat-progress-track"><div class="cat-progress-fill" style="width:${qs.length ? done / qs.length * 100 : 0}%"></div></div>
        <div class="cat-skill-list">${skills.slice(0, 6).map(s => `<span class="skill-pill">${s}</span>`).join("")}${skills.length > 6 ? `<span class="skill-pill">+${skills.length - 6}</span>` : ""}</div>
      </button>`;
    }).join("");
    el.innerHTML = `<div class="screen"><button class="back-link" data-go="dashboard">← Dashboard</button>
      <div class="panel"><div class="section-header">📂 Study by Topic</div>
      <div class="category-grid">${cards}</div></div></div>`;
    el.querySelector(".back-link").addEventListener("click", () => go("dashboard"));
    el.querySelectorAll("[data-app]").forEach(b => b.addEventListener("click", () => go("topicDetail", b.dataset.app)));
  };

  routes.topicDetail = function (a) {
    const skills = [...new Set(questionsForApp(a).map(q => q.skill))].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
    const rows = skills.map(s => {
      const qs = Q.filter(q => q.skill === s);
      const done = qs.filter(q => state.seen.has(q.id)).length;
      return `<button class="category-card" data-skill="${s}">
        <div class="cat-head"><span class="cat-badge">${s}</span><span class="cat-title">${esc(SKILL[s] || s)}</span></div>
        <div class="cat-count"><strong style="color:var(--text)">${done}</strong> / ${qs.length} covered</div>
        <div class="cat-progress-track"><div class="cat-progress-fill" style="width:${qs.length ? done / qs.length * 100 : 0}%"></div></div>
      </button>`;
    }).join("");
    el.innerHTML = `<div class="screen"><button class="back-link" data-back="topics">← All topics</button>
      <div class="panel">
        <div class="section-header">${APP_ICON[a]} Appendix ${a} — ${esc(APP[a])}</div>
        <button class="nav-button" style="max-width:280px;margin-bottom:18px" data-appstart="${a}">Test whole appendix →</button>
        <div class="category-grid">${rows}</div>
      </div></div>`;
    el.querySelector("[data-back]").addEventListener("click", () => go("topics"));
    el.querySelector("[data-appstart]").addEventListener("click", () => startQuiz(shuffle(questionsForApp(a)).map(q => q.id), `Appendix ${a}`, { study: true }));
    el.querySelectorAll("[data-skill]").forEach(b => b.addEventListener("click", () => {
      const s = b.dataset.skill;
      startQuiz(shuffle(Q.filter(q => q.skill === s)).map(q => q.id), `${s} · ${SKILL[s] || s}`, { study: true });
    }));
  };

  /* ================= RANDOM ================= */
  routes.random = function () { startQuiz(shuffle(Q).slice(0, 25).map(q => q.id), "Random 25"); };

  /* ================= EXAM SIMULATION ================= */
  routes.exam = function () {
    el.innerHTML = `<div class="screen"><button class="back-link" data-go="dashboard">← Dashboard</button>
      <div class="panel"><div class="section-header">⏱️ Exam Simulation</div>
        <p class="cat-count" style="margin-bottom:16px">A timed mock in the style of the real CREST CPSA written paper: multiple-choice questions drawn across all appendices, a countdown clock, and <strong>no feedback until you submit</strong>. You can flag questions and move freely between them.</p>
        <div class="control-row">
          <label for="ecount">Questions</label>
          <select id="ecount"><option value="60">60</option><option value="120" selected>120 (full paper)</option></select>
          <label for="emin">Time limit</label>
          <select id="emin"><option value="60">60 min</option><option value="120" selected>120 min</option><option value="0">No limit</option></select>
        </div>
        <p class="selected-info">Tip: the real exam is roughly 120 questions in 2 hours. Aim for ~70%+.</p>
        <button class="nav-button exam-start" id="startExam" style="max-width:280px">Begin exam →</button>
      </div></div>`;
    el.querySelector("[data-go]").addEventListener("click", () => go("dashboard"));
    el.querySelector("#startExam").addEventListener("click", () => {
      const n = Math.min(+el.querySelector("#ecount").value, Q.length);
      const min = +el.querySelector("#emin").value;
      startQuiz(shuffle(Q).slice(0, n).map(q => q.id), "Exam Simulation", { defer: true, minutes: min });
    });
  };
  routes.flaggedTest = function () {
    const ids = [...state.flagged];
    if (!ids.length) return go("dashboard");
    startQuiz(shuffle(ids), "Flagged review");
  };

  /* ================= CUSTOM ================= */
  routes.custom = function () {
    const sel = new Set(APP_ORDER);
    function poolSize() { return Q.filter(q => sel.has(q.skill[0])).length; }
    el.innerHTML = `<div class="screen"><button class="back-link" data-go="dashboard">← Dashboard</button>
      <div class="panel"><div class="section-header">⚙️ Custom Test</div>
        <label style="font-size:14px;font-weight:600;color:var(--text-2)">Topics</label>
        <div class="chip-row" id="chips">${APP_ORDER.map(a => `<button class="chip active" data-a="${a}">${a} · ${esc(APP[a])}</button>`).join("")}</div>
        <div class="control-row">
          <label for="count">Number of questions</label>
          <select id="count"><option>10</option><option selected>25</option><option>50</option><option>75</option><option>100</option></select>
          <label for="mode2">Order</label>
          <select id="mode2"><option value="random">Shuffle</option><option value="unseen">Unseen first</option></select>
        </div>
        <p class="selected-info" id="poolInfo"></p>
        <button class="nav-button" id="startCustom" style="max-width:260px">Start test →</button>
      </div></div>`;
    el.querySelector("[data-go]").addEventListener("click", () => go("dashboard"));
    const info = el.querySelector("#poolInfo");
    const refresh = () => info.textContent = `${poolSize()} questions available in selected topics`;
    el.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => {
      const a = c.dataset.a; if (sel.has(a)) { sel.delete(a); c.classList.remove("active"); } else { sel.add(a); c.classList.add("active"); }
      refresh();
    }));
    refresh();
    el.querySelector("#startCustom").addEventListener("click", () => {
      if (!sel.size) return;
      let pool = Q.filter(q => sel.has(q.skill[0]));
      const mode = el.querySelector("#mode2").value;
      if (mode === "unseen") pool = pool.sort((x, y) => (state.seen.has(x.id) ? 1 : 0) - (state.seen.has(y.id) ? 1 : 0) || Math.random() - 0.5);
      else pool = shuffle(pool);
      const n = Math.min(+el.querySelector("#count").value, pool.length);
      startQuiz(pool.slice(0, n).map(q => q.id), `Custom (${[...sel].sort().join(",")})`);
    });
  };

  /* ================= QUIZ ENGINE ================= */
  let quiz = null;
  let examTimer = null;
  function startQuiz(ids, label, opts) {
    if (!ids.length) return;
    opts = opts || {};
    if (examTimer) { clearInterval(examTimer); examTimer = null; }
    quiz = { ids, label, i: 0, answers: {}, options: {}, defer: !!opts.defer, study: !!opts.study,
      deadline: opts.minutes ? Date.now() + opts.minutes * 60000 : 0 };
    ids.forEach(id => { const q = byId(id); quiz.options[id] = shuffle([q.answer, ...q.incorrect]); });
    if (quiz.deadline) examTimer = setInterval(tickTimer, 1000);
    renderQuestion();
  }
  function tickTimer() {
    const t = document.getElementById("examClock");
    if (!t) return;
    const left = Math.max(0, quiz.deadline - Date.now());
    const m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
    t.textContent = `⏱️ ${m}:${String(s).padStart(2, "0")}`;
    if (left < 60000) t.style.color = "var(--bad)";
    if (left <= 0) { clearInterval(examTimer); examTimer = null; finishQuiz(); }
  }

  function renderQuestion() {
    const { ids, i, defer } = quiz;
    const id = ids[i], q = byId(id);
    const opts = quiz.options[id];
    const chosen = quiz.answers[id];
    const answered = chosen !== undefined;
    const reveal = answered && !defer;              // show correct/incorrect only in practice mode
    const answeredCount = ids.filter(x => quiz.answers[x] !== undefined).length;
    const lastQ = i === ids.length - 1;
    el.innerHTML = `<div class="screen test-screen">
      <div class="panel">
        <div class="progress-bar"><div class="progress-fill" style="width:${(i + 1) / ids.length * 100}%"></div></div>
        <div class="progress-meta">
          <span>${esc(quiz.label)}${defer ? ` · <span style="color:var(--accent-text)">${answeredCount}/${ids.length} answered</span>` : ""}</span>
          <span>${quiz.deadline ? `<span id="examClock" style="font-weight:800">⏱️ …</span> · ` : ""}Question ${i + 1} / ${ids.length}</span>
        </div>
        <div class="question-header">
          <span class="question-number">${q.skill} · ${esc(SKILL[q.skill] || "")}</span>
          <button class="flag-button ${state.flagged.has(id) ? "flagged" : ""}" id="flagBtn">${state.flagged.has(id) ? "🚩 Flagged" : "⚑ Flag"}</button>
        </div>
        <div class="question-text">${esc(q.question)}</div>
        <div class="options" id="opts">
          ${opts.map((o, k) => {
            let cls = "option";
            if (reveal) {
              cls += " disabled";
              if (o === q.answer) cls += " correct";
              else if (o === chosen) cls += " incorrect";
            } else if (defer && o === chosen) cls += " chosen";
            return `<button class="${cls}" data-opt="${k}"><span class="option-letter">${String.fromCharCode(65 + k)}</span><span class="option-text">${esc(o)}</span></button>`;
          }).join("")}
        </div>
        ${reveal ? `<div class="explain-box">${chosen === q.answer ? "✅ Correct." : "❌ Not quite."} The correct answer is <strong>${esc(q.answer)}</strong>.</div>` : ""}
        <div class="navigation">
          <button class="nav-button secondary" id="prevBtn" ${i === 0 ? "disabled" : ""}>← Previous</button>
          <button class="nav-button" id="nextBtn">${lastQ ? (defer ? "Submit exam ✓" : "Finish ✓") : "Next →"}</button>
        </div>
        <div class="navigation" style="margin-top:10px">
          ${defer && !lastQ ? `<button class="nav-button ghost" id="submitBtn">Submit exam now</button>` : ""}
          <button class="nav-button ghost" id="quitBtn">${quiz.study ? "Exit to topics" : "Quit " + (defer ? "exam" : "test")}</button>
        </div>
      </div>
    </div>`;
    if (quiz.deadline) tickTimer();

    el.querySelectorAll("[data-opt]").forEach(b => b.addEventListener("click", () => {
      if (!defer && quiz.answers[id] !== undefined) return;   // practice mode locks after answering
      const choice = opts[+b.dataset.opt];
      quiz.answers[id] = choice;
      state.seen.add(id);
      if (choice === q.answer) state.correct.add(id); else state.correct.delete(id);
      persist();
      if (defer && !lastQ) { quiz.i++; renderQuestion(); }     // exam mode auto-advances
      else renderQuestion();
    }));
    const submit = el.querySelector("#submitBtn");
    if (submit) submit.addEventListener("click", () =>
      confirmModal(`Submit the exam now? ${answeredCount}/${ids.length} answered.`, finishQuiz));
    el.querySelector("#flagBtn").addEventListener("click", () => {
      if (state.flagged.has(id)) state.flagged.delete(id); else state.flagged.add(id);
      persist(); renderQuestion();
    });
    el.querySelector("#prevBtn").addEventListener("click", () => { if (quiz.i > 0) { quiz.i--; renderQuestion(); } });
    el.querySelector("#nextBtn").addEventListener("click", () => {
      if (quiz.i === ids.length - 1) finishQuiz(); else { quiz.i++; renderQuestion(); }
    });
    el.querySelector("#quitBtn").addEventListener("click", () => {
      if (quiz.study) {
        // Study by Topic saves coverage as you go — nothing is lost, so just leave.
        go("topics");
        return;
      }
      confirmModal("Quit this test? Answered questions are saved to your progress, but this run won't be scored.", () => {
        if (examTimer) { clearInterval(examTimer); examTimer = null; }
        go("dashboard");
      });
    });
  }

  function finishQuiz() {
    if (examTimer) { clearInterval(examTimer); examTimer = null; }
    const { ids, label } = quiz;
    const answered = ids.filter(id => quiz.answers[id] !== undefined);
    const score = answered.filter(id => quiz.answers[id] === byId(id).answer).length;
    updateStreak();
    // Study-by-topic sessions track coverage only — they are not scored tests, so they don't go in test history.
    if (!quiz.study) {
      state.history.unshift({ date: new Date().toISOString(), score, total: ids.length, answered: answered.length, label });
      state.history = state.history.slice(0, 50);
    }
    persist();
    renderResults(score, ids);
  }

  function renderResults(score, ids) {
    const total = ids.length;
    const pct = Math.round(score / total * 100);
    const R = 74, C = 2 * Math.PI * R, off = C * (1 - pct / 100);
    const verdict = quiz.study
      ? [`${score} of ${total} correct · coverage updated`, "var(--accent-text)"]
      : pct >= 60 ? ["Pass — 60% or above", "var(--good)"] : pct >= 50 ? ["Just below the 60% pass mark", "var(--accent-text)"] : ["Below pass mark — 60% needed", "var(--bad)"];
    el.innerHTML = `<div class="screen results-screen"><div class="panel">
      <div class="section-header" style="text-align:center">${quiz.study ? "Study session complete" : "Test complete"} — ${esc(quiz.label)}</div>
      <div class="score-circle">
        <svg width="180" height="180"><defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--accent)"/></linearGradient></defs>
          <circle class="score-circle-bg" cx="90" cy="90" r="${R}"/>
          <circle class="score-circle-progress" cx="90" cy="90" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C}" id="ring"/>
        </svg>
        <div class="score-text"><div class="score-pct">${pct}%</div><div class="score-frac">${score} / ${total}</div></div>
      </div>
      <div class="score-verdict" style="color:${verdict[1]}">${verdict[0]}</div>
      <div class="results-breakdown">
        <div class="rb-item"><div class="rb-value" style="color:var(--good)">${score}</div><div class="rb-label">Correct</div></div>
        <div class="rb-item"><div class="rb-value" style="color:var(--bad)">${total - score}</div><div class="rb-label">Incorrect</div></div>
        <div class="rb-item"><div class="rb-value">${pct}%</div><div class="rb-label">Score</div></div>
      </div>
      <div class="navigation">
        <button class="nav-button secondary" id="reviewBtn">Review answers</button>
        <button class="nav-button" id="retryBtn">Retry ↻</button>
      </div>
      <div class="navigation" style="margin-top:10px"><button class="nav-button ghost" id="homeBtn">Back to dashboard</button></div>
    </div></div>`;
    requestAnimationFrame(() => { el.querySelector("#ring").style.strokeDashoffset = off; });
    el.querySelector("#reviewBtn").addEventListener("click", () => renderReview(ids));
    el.querySelector("#retryBtn").addEventListener("click", () => startQuiz(shuffle(ids), quiz.label));
    el.querySelector("#homeBtn").addEventListener("click", () => go("dashboard"));
  }

  function renderReview(ids) {
    const items = ids.map((id, n) => {
      const q = byId(id), chosen = quiz.answers[id], ok = chosen === q.answer;
      return `<div class="review-item">
        <div class="review-q">${n + 1}. ${esc(q.question)} <span class="cat-count">(${q.skill})</span></div>
        ${chosen === undefined ? `<div class="review-line">Skipped</div>` :
          ok ? `<div class="review-line correct">✅ ${esc(chosen)}</div>` :
          `<div class="review-line wrong">${esc(chosen)}</div><div class="review-line correct">✅ ${esc(q.answer)}</div>`}
      </div>`;
    }).join("");
    el.innerHTML = `<div class="screen"><button class="back-link" id="b">← Back to results</button>
      <div class="panel"><div class="section-header">📝 Review Answers</div>${items}</div></div>`;
    el.querySelector("#b").addEventListener("click", () => {
      const score = ids.filter(id => quiz.answers[id] === byId(id).answer).length;
      renderResults(score, ids);
    });
  }

  /* ================= STATS ================= */
  routes.stats = function () {
    const perApp = APP_ORDER.map(a => {
      const qs = questionsForApp(a);
      const seen = qs.filter(q => state.seen.has(q.id));
      const acc = seen.length ? Math.round(seen.filter(q => state.correct.has(q.id)).length / seen.length * 100) : null;
      return { a, total: qs.length, seen: seen.length, acc };
    });
    const rows = perApp.map(p => {
      const w = p.acc === null ? 0 : p.acc;
      const col = p.acc === null ? "var(--track)" : p.acc >= 70 ? "var(--good)" : p.acc >= 50 ? "var(--accent-text)" : "var(--bad)";
      return `<div class="bar-row"><span>${p.a} · ${esc(APP[p.a])}</span><div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${col}"></div></div><span>${p.acc === null ? "—" : p.acc + "%"}</span></div>`;
    }).join("");
    const hist = state.history.slice(0, 10).map(h =>
      `<div class="bar-row"><span>${new Date(h.date).toLocaleDateString()}</span><div class="bar-track"><div class="bar-fill" style="width:${h.score / h.total * 100}%;background:var(--accent)"></div></div><span>${Math.round(h.score / h.total * 100)}%</span></div>`).join("");
    el.innerHTML = `<div class="screen"><button class="back-link" data-go="dashboard">← Dashboard</button>
      <div class="panel"><div class="section-header">🔥 Streak</div>
        <div class="streak-row">
          <div class="streak-box"><div class="streak-number">${state.streak.current}</div><div class="streak-label">Current (days)</div></div>
          <div class="streak-box"><div class="streak-number">${state.streak.best}</div><div class="streak-label">Best</div></div>
          <div class="streak-box"><div class="streak-number">${state.seen.size}</div><div class="streak-label">Attempted</div></div>
        </div></div>
      <div class="panel"><div class="section-header">📊 Accuracy by Appendix</div><div class="bar-list">${rows}</div></div>
      <div class="panel"><div class="section-header">🕒 Recent Tests</div>${hist ? `<div class="bar-list">${hist}</div>` : `<p class="empty-note">No tests completed yet.</p>`}</div>
    </div>`;
    el.querySelector("[data-go]").addEventListener("click", () => go("dashboard"));
  };

  /* ================= modal ================= */
  const overlay = document.getElementById("modalOverlay");
  const modalText = document.getElementById("modalText");
  let modalCb = null;
  document.getElementById("modalCancel").addEventListener("click", () => overlay.hidden = true);
  document.getElementById("modalConfirm").addEventListener("click", () => { overlay.hidden = true; if (modalCb) modalCb(); });
  function confirmModal(text, cb) { modalText.textContent = text; modalCb = cb; overlay.hidden = false; }

  document.getElementById("resetProgress").addEventListener("click", () =>
    confirmModal("Reset ALL progress, flags, history and streak? This cannot be undone.", () => {
      ["seen", "correct", "flagged", "history", "streak"].forEach(k => LS.del(k));
      state.seen = new Set(); state.correct = new Set(); state.flagged = new Set(); state.history = []; state.streak = { current: 0, best: 0, last: null };
      go("dashboard");
    }));

  /* ================= keyboard nav ================= */
  document.addEventListener("keydown", e => {
    if (!quiz || !document.querySelector(".test-screen")) return;
    if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
    if (["1", "2", "3", "4"].includes(e.key)) {
      const b = el.querySelector(`[data-opt="${+e.key - 1}"]`); if (b) b.click();
    } else if (e.key === "ArrowRight" || e.key === "Enter") { const n = el.querySelector("#nextBtn"); if (n) n.click(); }
    else if (e.key === "ArrowLeft") { const p = el.querySelector("#prevBtn"); if (p && !p.disabled) p.click(); }
    else if (e.key.toLowerCase() === "f") { const f = el.querySelector("#flagBtn"); if (f) f.click(); }
  });

  /* ================= boot ================= */
  go("dashboard");
})();

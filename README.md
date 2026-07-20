# CPSA Practice — CREST Practitioner Security Analyst quiz app

A self-contained, static web app for revising the **CREST CPSA** written exam. Every question is mapped to the official CPSA Technical Syllabus v2.5 (Appendices A–J, 70 skill areas). No backend, no build step, no external dependencies — progress and theme are stored locally in your browser (`localStorage`).

## Features
- **~3,800 questions** graded against the official syllabus (off-syllabus trivia removed).
- **Study by Topic** — drill down Appendix → skill area (A1…J3), each with its own progress bar.
- **Random Test**, **Custom Test** (choose appendices, length, unseen-first ordering).
- **Exam Simulation** — timed mock in the real paper's style (120 questions / 2 hours, no feedback until submit).
- **Flag & review** questions; **Statistics** with per-appendix accuracy, daily streak, and test history.
- **Dark / light theme** (persisted) and full keyboard nav (`1–4` answer, `←/→` navigate, `F` flag).
- Progress survives refresh; **Reset all progress** in the footer.

## Files
```
index.html      markup + shell
styles.css      theme tokens (light + dark) and all styling
questions.js    the question bank  (window.QUIZ_DATA)
app.js          all application logic (vanilla JS, no framework)
```

## Run locally
Just open `index.html`, or serve the folder:
```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deploy (pick one)
**GitHub Pages** — push these files to a repo, then Settings → Pages → deploy from `main` / root.
```bash
git init && git add . && git commit -m "CPSA quiz app"
git branch -M main && git remote add origin <your-repo-url> && git push -u origin main
```
**Netlify / Vercel / Cloudflare Pages** — drag-and-drop the folder, or point the project at the repo. No build command; publish directory is the folder root.

**Single-file** — `dist/index.html` bundles everything into one HTML file you can host anywhere or open directly.

## Notes
Unofficial study aid. Questions are for practice and are not CREST exam content. Mapped to CREST CPSA Technical Syllabus v2.5.

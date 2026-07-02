# AstroPage

Astropage is a edupage based platform that is not here to replace edupage, but to enrich students of features that are not natively supported by edupage. 

---
## Motivation

Astropage started as a final school project for this year. Many classmates did really simple web apps but I love to make things harder and learn more. I had this idea of edupage automatic homework maker since I discovered that there is EdupageAPI. While I was making this project ideas for new features that would make this even better started popping in my head so I started implementing them. In the end, teacher was really impressed by this project. 


## Trying the app

### Option A — Demo mode (no account needed)
 
You do not need an EduPage account to explore the app. On the login screen, click **"Try demo — no account needed"**. You will be taken straight into a fully functional dashboard loaded with realistic sample data: assignments, a timetable, grades, canteen meals, and a working AI homework draft generator. 

![Login screen with demo button](docs/screenshots/login-page.png)

Everything works in demo mode — filters, the what-if grade simulator, meal ordering, the AI draft button — but no real data is sent or received. A red banner at the top of every page labels the session as demo mode so the distinction is clear.

### Option B — Real EduPage login

If you have an EduPage school account, you can log in with your actual data. AstroPage is not storing any of it. It uses edupageAPI to get JWT session cookie from edupage. 

**What you need:**
- Your school's EduPage subdomain (e.g. `spsezoska` — the part before `.edupage.org`)
- Your EduPage username (usually `FirstnameLastname`)
- Your EduPage password

---

## What each page does

### Dashboard

![Dashboard](docs/screenshots/dashboard-demo.png)

The landing page after login. Shows:
- **Active tasks** — total number of homework assignments not yet marked as done.
- **Due within 24 h** — urgent assignments; clicking the banner navigates directly to the homework list.
- **Today's lessons** — count and how many are cancelled.
- **Today's schedule** — a timeline of every period with room, teacher, cancellation status, and curriculum notes. The current lesson is highlighted in real time.

### Homework

![Homework list](docs/screenshots/homework-demo.png)

A list of all your assignments. Features:
- **Filter bar** — filter by status: All / Due soon / Pending / Overdue / Done.
- **Search** — search by assignment title, subject, or teacher name.
- **Status badges** — colour-coded: green (done), amber (due soon), red (overdue), blue (pending).
- **Assignment drawer** — click any card to open a detail panel on the right.

![Homework drawer with AI draft](docs/screenshots/hw-drawer.png)

Inside the drawer:
- Full assignment description.
- Attachments (PDF, images) if the teacher uploaded any.
- **Mark as done / undone** toggle — syncs back to EduPage.
- **Draft with AI** button — sends the assignment to Google Gemini and returns a structured, editable draft.

![AI draft output](docs/screenshots/ai-draft.png)

The AI draft appears in an editable text area. The model is constrained to always explain its reasoning — it will not just produce a bare answer. **Nothing is ever submitted automatically.** You edit the draft, copy it, and submit it yourself through EduPage as normal.

### Timetable

![Timetable](docs/screenshots/timetable-demo.png)

A weekly grid showing all five school days side by side. Features:
- **Week navigation** — arrows to step forward and back one week at a time.
- **Cancellations** — struck-through lessons with a red "CANCELLED" badge.
- **Curriculum notes** — short notes from the teacher (e.g. "Moved to LAB2 — equipment demo").
- **Current lesson highlight** — the period currently in progress is highlighted in red.

### Grades

![Grades](docs/screenshots/grades-demo.png)

All your subjects in one view. Features:
- **Official average** — the weighted average EduPage has on file.
- **What-if simulator** — add a hypothetical future grade and see how it changes your average in real time. You can also hide any existing grade to simulate dropping it.
- **Points-based grades** — subjects where grades are points (e.g. `87/100`) are displayed differently from the standard 1–5 Slovak scale.
- Grades are colour-coded: green (1) through red (5).

### Canteen

![Canteen](docs/screenshots/canteen-demo.png)

Meal ordering for your school canteen. Features:
- **Week tabs** — view and order meals for this week, next week, and the following two weeks.
- **Menu options** — each day shows available menus (A, B, vegetarian) with dish names, allergens, and weights.
- **One-click ordering** — click a menu option to order it; click the active option again to sign off.
- **Auto-order** — set a preferred menu letter and a number of days; the backend signs you up for all upcoming unordered days in one request.
- Changes are confirmed by reading the state back from EduPage — a 200 OK is not trusted blindly.





## Architecture

### Auth and sessions

The app never stores your password. When you log in:
1. The backend calls `edupage-api` with your credentials against your school's subdomain.
2. On success, EduPage returns a session cookie. The backend Fernet-encrypts it and stores it in Postgres.
3. A JWT is issued in an `HttpOnly` cookie (not readable by JavaScript). Your password is discarded.
4. On every subsequent request, the JWT is verified and the EduPage session is decrypted and rehydrated from Postgres.

### Frontend caching

Every data page uses `useCachedResource` — a hook that:
- Seeds component state synchronously from an in-memory session cache (no loading flash on cache hit).
- Refetches in the background when the TTL expires while the page is open.
- Refreshes when the browser tab regains focus with stale data.
- Exposes a manual `refresh()` button.

On login, `prefetchAll()` fires in the background and warms every page's cache sequentially (dashboard first), so the first tab switch after login is typically instant.



---

## Project structure

```
AstroPage/
├── backend/               # FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/        # versioned endpoints
│   │   ├── core/          # config, logging, security
│   │   ├── models/        # domain models
│   │   ├── schemas/       # Pydantic I/O schemas
│   │   └── services/      # business logic (edupage, ai, timetable, …)
│   ├── scripts/           # PoC scripts used during EduPage reverse-engineering
│   ├── tests/
│   ├── pyproject.toml
│   └── .env.example
├── frontend/              # React + Vite SPA
│   └── src/
│       ├── api/           # client, cache, prefetch, useCachedResource
│       ├── components/    # AppLayout, RefreshButton, LanguageSwitcher
│       ├── context/       # AuthContext (incl. demo mode)
│       ├── data/          # mock data for demo mode
│       ├── i18n/          # LanguageContext, translations
│       └── pages/         # Dashboard, Homework, Timetable, Grades, Canteen, Settings, Login
├── docs/screenshots/      # UI screenshots
├── .github/workflows/     # CI (lint+test) + CD (self-hosted runner → home server)
├── docker-compose.yml
└── Makefile
```

---

## AI Declaration

This project was dependent on using AI. I am new to claude code and other ai tools so I was trying to combine it with my own skills. Claude did the heavy lifting while I was debugging, creating logic, redesigning frontend, setuping CD pipeline and prompting claude. 

### What I personally did

**EduPage reverse-engineering.** The `edupage-api` Python library has incomplete docs and inconsistent field names. I wrote throwaway PoC scripts in `backend/scripts/` to probe what each library call actually returns — what fields come back, what's null, when it throws. That ground-level understanding shaped every endpoint I designed. 

**Architecture decisions.** The core constraints are mine:
- No password storage: the backend authenticates against EduPage, Fernet-encrypts the session cookie, and discards the password immediately. I chose this because I have seen it as opurtunity to grow in my engeneering skills and also I could put this in my resume.
- Async throughout: EduPage fetches are network I/O; blocking calls are wrapped with `asyncio.to_thread`. Working with async is really desired skill in todays job market so I wanted to design it hands on.

**Debugging and deployment.** I debugged the Docker CI/CD pipeline myself: the health-check failures (switched from `curl` to Python's `urllib` because `curl` wasn't in the image), the self-hosted GitHub Actions runner setup on my homelab rpi server, and container networking. The runner polls GitHub outbound — no inbound ports needed.

**Frontend caching strategy.** The `useCachedResource` hook design (synchronous seed from cache, background refetch, tab-focus refresh, prefetch on login) was my design; Claude implemented the hook from the spec.

**Demo mode.** The logic to intercept all API calls in demo mode and return realistic mock data — including a working AI draft that generates structured study content — was something I added specifically so reviewers without EduPage accounts can explore the full feature set.

### What Claude Code handled

- FastAPI endpoint boilerplate, Pydantic schemas, SQLModel models once the shape was decided.
- React component markup and inline-style patterns, which I reviewed and refined.
- CI/CD YAML, Makefile targets, test stubs.
- Git commits and README text.

### In-app AI feature

The homework draft assistant uses **Google Gemini** at runtime. The demo mode shows this flow with a local mock so you can see it work without a Gemini API key. I kept this feature turned off on the official page too because I am scared of waking up to 20k bill for ai if I would have a security flaw in my app. 

---

### Word from me

This project took way longer than I wanted it to take. I had manny issues and unexpected behaivour. Final weeks I was really unmotivated by having to rework almost 50% of the project but I managed to finish it (I belive). I am proud of this and I am putting it to my resume. 
# Study Scheduler

Upload an exam syllabus PDF or photo, and get a day-by-day study plan that allocates more
time to higher-priority topics, based on the number of days you have left.

## How it works

1. **Upload a syllabus (PDF or photo).** Topics are extracted with Google's Gemini API when
   `GEMINI_API_KEY` is configured (recommended). The app also accepts JPEG, PNG, and WEBP
   photos of a printed syllabus — these require Gemini. For PDFs, if Gemini is unavailable
   the parser falls back to a heuristic regex-based extractor that looks for priority labels
   (High/Medium/Low) and marks/weightage. Topics with no detectable priority default to Medium —
   you can review and change any of them before generating a plan.
2. **Review & adjust priorities.** Add topics the parser missed, remove noise,
   or re-rank anything.
3. **Generate the plan.** Give it your total days until the exam and hours you
   can study per day. The scheduler allocates hours per topic proportional to
   priority weight (High > Medium > Low, or by marks if given), then packs
   high-priority topics into the earliest days, splitting a topic across days
   if it doesn't fit in one.
4. **Track progress.** Check off study sessions as you complete them.

## Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite, JWT auth, Gemini API + `pdfplumber` for syllabus parsing
- **Frontend**: React (Vite), plain CSS (no framework)

## Project structure

```
backend/
  app/
    main.py            # FastAPI app + router wiring
    models.py           # SQLAlchemy models (User, Syllabus, Topic, StudyPlan, ScheduleSession)
    schemas.py           # Pydantic request/response schemas
    auth.py              # JWT auth + password hashing
    pdf_parser.py         # Heuristic syllabus PDF -> topics parser (PDF fallback)
    gemini_extractor.py   # Gemini multimodal syllabus -> topics extractor
    scheduler_algo.py      # Priority-weighted hour allocation + day packing
    routers/
      auth.py, syllabus.py, plan.py
  requirements.txt
  .env.example

frontend/
  src/
    api.js               # API client
    App.jsx               # View router (auth / dashboard / topics / schedule)
    components/
      Auth.jsx, Dashboard.jsx, TopicsReview.jsx, ScheduleView.jsx
    styles.css
```

## Running it locally

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and set your secrets:

```bash
cp .env.example .env   # Windows: copy .env.example .env
```

Required / recommended variables in `backend/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Production | JWT signing secret |
| `GEMINI_API_KEY` | For images; recommended for PDFs | Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `DATABASE_URL` | Optional | Postgres connection string (defaults to local SQLite) |

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be at `http://localhost:8000`, with interactive docs at
`http://localhost:8000/docs`. It uses a local SQLite file (`study_scheduler.db`)
created automatically on first run — no separate database setup needed.

To use Postgres instead, set `DATABASE_URL` before starting, e.g.:
```bash
export DATABASE_URL=postgresql://user:pass@localhost/study_scheduler
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. It's already configured (via `.env`) to talk to
the backend at `http://localhost:8000` — change `VITE_API_BASE` if you run the
API somewhere else.

## Deploying (Render)

When deploying the backend to [Render](https://render.com) (or similar), set these
**Environment Variables** in the service dashboard — do not commit real values to git:

- `SECRET_KEY` — a long random string for JWT signing
- `GEMINI_API_KEY` — your Gemini API key (required for photo uploads; strongly recommended for PDFs)
- `DATABASE_URL` — Postgres connection string if using Render Postgres

After adding or changing `GEMINI_API_KEY`, redeploy or restart the service so the
new variable is picked up.

## Notes / things to know

- **Secret key**: `app/auth.py` uses a hardcoded dev `SECRET_KEY` fallback. Set
  the `SECRET_KEY` environment variable before deploying anywhere real.
- **Gemini extraction** (`gemini_extractor.py`) sends PDFs and images to Gemini
  `gemini-2.5-flash` and expects structured JSON back. If the API key is missing
  or the call fails, PDF uploads fall back to the heuristic parser; image uploads
  require Gemini and return a clear error if extraction fails.
- **Heuristic PDF parsing** (`pdf_parser.py`) looks for bullet/numbered lines,
  priority keywords (high/medium/low/important/optional), and marks-like numbers
  ("10 marks", "(15)"). Unusual formats may need manual priority assignment on
  the review screen — the UI supports that.
- **Scheduling algorithm** (`scheduler_algo.py`) is intentionally simple and
  readable: proportional allocation by weight, then greedy day-packing. Good
  next steps if you want to extend it: spaced-repetition revision passes,
  weekend/weekday different hour budgets, or a "buffer days before exam" option.

# PromptLab

## Project Overview

PromptLab is a full-stack web application for improving prompts. It analyzes rough prompts, asks clarifying questions, generates improved variants, and compares results with Google Gemini.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** FastAPI and Python
- **Database:** SQLite with SQLAlchemy
- **AI provider:** Google Gemini through the `google-genai` SDK
- **Authentication:** Local accounts with password hashing and HttpOnly session cookies

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/akmqu/promptlab.git
cd promptlab
```

### 2. Configure environment files

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Create the frontend environment file:

```bash
cp frontend/.env.example frontend/.env.local
```

On Windows PowerShell, use `Copy-Item` instead of `cp`.

Each developer should use their own local environment files. Never commit `.env` or `.env.local` files, API keys, passwords, or other secrets. They are excluded by `.gitignore`.

### 3. Install backend dependencies

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
```

On Windows PowerShell:

```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 5. Start the backend

Keep the virtual environment active and run:

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

The API runs at `http://127.0.0.1:8000`.

### 6. Start the frontend

Open a second terminal from the repository root and run:

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

The frontend uses the same-origin `/api` proxy configured in `frontend/next.config.mjs`. It forwards requests to `BACKEND_URL`, so the browser normally does not call the backend directly.

## Environment Variables

### Backend: `backend/.env`

Copy from `backend/.env.example`. The important settings are:

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Signs local login sessions. Use a private random value. |
| `DATABASE_URL` | SQLite database location. The default is suitable for local development. |
| `CORS_ORIGINS` | Allowed frontend origins. The template allows `localhost` and `127.0.0.1` on port 3000. Add port 3001 origins if you use a frontend on port 3001. |
| `GEMINI_API_KEY` | Google AI Studio API key for AI features. |
| `GEMINI_MODEL` | Gemini model name. The current example uses `gemini-3.8-flash`. |
| `SESSION_COOKIE_NAME` | Name of the login cookie. |
| `SESSION_MAX_AGE_SECONDS` | Login session lifetime. |

`MAX_PROMPT_LENGTH` and `AI_TIMEOUT_SECONDS` are also present in the backend template and loaded by configuration, but the current request and Gemini service code does not enforce or apply them yet.

To enable AI features, create a key in [Google AI Studio](https://aistudio.google.com/) and add it only to `backend/.env`:

```env
GEMINI_API_KEY=your-key-goes-here
```

Do not put the key in frontend files or commit it. The backend can start without a key, but Gemini-powered features will not work.

### Frontend: `frontend/.env.local`

The default configuration is:

```env
BACKEND_URL=http://127.0.0.1:8000
```

Leave `NEXT_PUBLIC_API_URL` unset for the normal same-origin proxy setup. If the backend uses another port, update `BACKEND_URL` and restart the frontend.

## User Accounts and Profile

- Select **Zaloguj się** in the application to sign in or choose **Zarejestruj się** to create an account.
- Registration requires a display name, email address, and password of at least 8 characters.
- **Historia** and **Testy promptów** require a logged-in account.
- **Ustawienia** shows the current account and privacy information.
- Editing the display name, email address, and password is not currently implemented.
- Accounts are stored in the local SQLite database. They are not shared across developers or machines.
- A PromptLab account is separate from your GitHub account and Google AI Studio account. Google AI Studio is only needed for the Gemini API key.

## Team Workflow

Create a branch for each task:

```bash
git switch main
git pull origin main
git switch -c feature/short-description
```

Review your changes, then commit and push them:

```bash
git status
git diff
git add path/to/changed-file
git commit -m "Describe the change"
git push -u origin feature/short-description
```

Open a pull request on GitHub after pushing the branch. Before committing, make sure secrets, `.env` files, `.venv`, `node_modules`, `.next`, and local database files are not included.

## Project Structure

```text
promptlab/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI application and health endpoint
│   │   ├── routers/             API routes, including auth and workspace features
│   │   ├── services/gemini.py   Gemini client integration
│   │   ├── models.py            SQLAlchemy database models
│   │   └── schemas.py           API validation schemas
│   ├── tests/                   Backend tests
│   ├── .env.example             Backend configuration template
│   └── requirements.txt         Python dependencies
├── frontend/
│   ├── app/page.tsx             Main application UI
│   ├── app/globals.css          Global styles
│   ├── lib/api.ts               Frontend API client
│   ├── next.config.mjs          Backend proxy configuration
│   ├── .env.example             Frontend configuration template
│   └── package.json              Frontend scripts and dependencies
├── .gitignore
└── README.md
```

## Troubleshooting

### Gemini is unavailable

Check that `GEMINI_API_KEY` is set in `backend/.env`, then restart the backend. Do not print the key in logs or screenshots. Invalid keys, quota limits, and rate limits must be resolved in Google AI Studio. A temporary HTTP 503 means the provider is unavailable; wait and retry later.

### The frontend cannot reach the backend

Confirm that the backend is running on port 8000 and that `frontend/.env.local` contains:

```env
BACKEND_URL=http://127.0.0.1:8000
```

Restart the frontend after changing the file. Do not set `NEXT_PUBLIC_API_URL` for the standard proxy setup.

### A port is already in use

Start the backend on another port:

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8001
```

Then set `BACKEND_URL=http://127.0.0.1:8001` in `frontend/.env.local` and restart the frontend. Next.js can use another frontend port with:

```bash
cd frontend
npm run dev -- --port 3001
```

If you use port 3001, also add `http://localhost:3001,http://127.0.0.1:3001` to `CORS_ORIGINS` in `backend/.env`.

### Login does not work

Check that both servers are running and open the frontend at `http://localhost:3000`. The normal setup uses the Next.js proxy and browser cookies. If the problem continues, verify the backend terminal for errors and check that `BACKEND_URL` points to the active backend port.

## Useful Commands

From the repository root:

```bash
# Backend tests
source .venv/bin/activate
cd backend
python -m pytest -q

# Frontend production build
cd ../frontend
npm run build
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

The health response reports whether Gemini is configured, but never returns the API key.

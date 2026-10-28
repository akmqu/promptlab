# PromptLab

🌐 **Aplikacja online:** https://promptlab-swart.vercel.app/

## Uruchomienie projektu
### Baza danych - SQLite
### 1. Pobranie projektu

Zainstaluj Git i sklonuj repozytorium:

```bash
git clone https://github.com/akmqu/promptlab.git
cd promptlab
```

### 2. Konfiguracja

**macOS / Linux:**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

**Windows PowerShell:**
```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Aby korzystać z funkcji AI, dodaj klucz Gemini do `backend/.env`:

```env
GEMINI_API_KEY=twoj_klucz_api
```

Klucz można uzyskać na stronie https://aistudio.google.com/.

### 3. Instalacja

W katalogu głównym projektu utwórz środowisko Pythona.

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
```

**Windows PowerShell:**
```powershell
py -3 -m venv .venv
.venv\\Scripts\\Activate.ps1
python -m pip install -r backend/requirements.txt
```

Zainstaluj zależności frontendu:

```bash
cd frontend
npm install
cd ..
```

### 4. Uruchomienie

Otwórz dwa terminale.

**Terminal 1 — backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

Otwórz aplikację w przeglądarce:

http://localhost:3000

**Uwaga:** Plików `.env` i `.env.local` ani klucza API nie należy umieszczać w repozytorium Git.

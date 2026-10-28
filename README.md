# PromptLab

PromptLab to aplikacja webowa do ulepszania promptów. Frontend działa w Next.js, backend w FastAPI, a funkcje AI korzystają z Google Gemini.

## Wymagania

- Git
- Python 3.10+
- Node.js i npm
- Klucz API Gemini — potrzebny tylko do funkcji AI

## Uruchomienie projektu lokalnie

### 1. Pobierz repozytorium

```bash
git clone https://github.com/akmqu/promptlab.git
cd promptlab
```

### 2. Przygotuj pliki konfiguracyjne

W katalogu głównym projektu uruchom:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

W Windows PowerShell zamiast `cp` użyj `Copy-Item`:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Klucz Gemini wpisz w pliku `backend/.env`, w zmiennej `GEMINI_API_KEY`:

```env
GEMINI_API_KEY=tu_wklej_swoj_klucz
```

Klucz można utworzyć w [Google AI Studio](https://aistudio.google.com/). Bez niego aplikacja może się uruchomić, ale funkcje AI nie będą działać.

**Ważne:** nie dodawaj plików `.env` ani `.env.local` do GitHuba i nie umieszczaj klucza API w kodzie frontendowym. Pliki lokalnej konfiguracji są ignorowane przez Git.

### 3. Zainstaluj zależności backendu

W katalogu głównym projektu:

**macOS / Linux**
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
```

**Windows PowerShell**
```powershell
py -3 -m venv .venv
.venv\\Scripts\\Activate.ps1
python -m pip install -r backend/requirements.txt
```

### 4. Zainstaluj zależności frontendu

```bash
cd frontend
npm install
cd ..
```

### 5. Uruchom backend

W pierwszym terminalu, z aktywnym środowiskiem Python:

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Backend będzie dostępny pod adresem http://127.0.0.1:8000.

### 6. Uruchom frontend

Otwórz **drugi terminal** w katalogu głównym projektu:

```bash
cd frontend
npm run dev
```

Otwórz w przeglądarce http://localhost:3000.

Frontend przekazuje żądania API do backendu przez konfigurację w `frontend/next.config.mjs`. Domyślnie nie trzeba zmieniać `BACKEND_URL` w `frontend/.env.local`.

## Klucz Gemini dla zespołu

Możecie używać jednego klucza na potrzeby projektu, jeśli jego właściciel zgadza się współdzielić limity i odpowiada za jego bezpieczeństwo. Wtedy każda osoba wpisuje ten klucz lokalnie do swojego `backend/.env`. Przekazujcie go prywatnie, nie przez repozytorium.

Wspólny klucz oznacza wspólny limit zapytań; jeśli się wyczerpie albo zostanie unieważniony, funkcje AI przestaną działać u wszystkich. Alternatywnie każda osoba może utworzyć własny klucz w Google AI Studio.

## Przydatne polecenia

Testy backendu (z katalogu głównego, po aktywowaniu środowiska Python):

```bash
cd backend
python -m pytest -q
```

Sprawdzenie działania backendu:

```bash
curl http://127.0.0.1:8000/health
```

## Gdy coś nie działa

- **Nie działają funkcje AI:** sprawdź, czy `GEMINI_API_KEY` znajduje się w `backend/.env`, a następnie uruchom ponownie backend.
- **Frontend nie łączy się z backendem:** sprawdź, czy oba serwery działają i czy backend używa portu 8000.
- **Port jest zajęty:** zatrzymaj inny proces korzystający z portu albo uruchom serwer na innym porcie i odpowiednio zmień konfigurację.

## Praca z Git

Przed commitem sprawdź zmiany:

```bash
git status
git diff
```

Nie commituj kluczy API, plików środowiskowych, lokalnych baz danych ani katalogów zależności.

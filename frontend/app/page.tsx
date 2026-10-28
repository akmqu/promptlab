'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight, BarChart3, BookOpen, Check, ChevronDown, ChevronRight, Copy,
  History, Info, Lightbulb, LogOut, Menu, Plus, Search, Settings, Sparkles,
  TestTube2, Trash2, Wand2, X, Zap,
} from 'lucide-react'
import {
  AnalysisResult, ApiError, EvalScore, Example, Experiment, SessionSummary,
  User, Variant, api,
} from '@/lib/api'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'examples', label: 'Przykłady', icon: BookOpen },
  { id: 'history', label: 'Historia', icon: History },
  { id: 'tests', label: 'Testy promptów', icon: TestTube2 },
  { id: 'settings', label: 'Ustawienia', icon: Settings },
]

const CATEGORIES = ['Marketing', 'Pisanie', 'Programowanie', 'Edukacja', 'Produktywność', 'Tłumaczenie', 'Prezentacje', 'Planowanie', 'Inne']

function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark"><Sparkles size={15} /></span>
      <span>Prompt<span className="brand-accent">Lab</span></span>
    </div>
  )
}

function errMsg(e: unknown) {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Nieoczekiwany błąd'
}

function Sidebar({
  page, setPage, onNew, open, onClose, user, onLogout, onLogin,
}: {
  page: string
  setPage: (p: string) => void
  onNew: () => void
  open: boolean
  onClose: () => void
  user: User | null
  onLogout: () => void
  onLogin: () => void
}) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div>
        <Logo />
        <button className="new-button" onClick={() => { onNew(); onClose() }}>
          <Plus size={16} /> Nowy prompt
        </button>
      </div>
      <nav className="side-nav" aria-label="Główna nawigacja">
        <span className="nav-label">WORKSPACE</span>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setPage(id); onClose() }} className={`nav-item ${page === id ? 'active' : ''}`}>
            <Icon size={17} />{label}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="demo-note">
          <Info size={14} />
          <span>{user ? 'Konto aktywne' : 'Tryb gościa — historia lokalna nie jest zapisywana'}</span>
        </div>
        <div className="profile">
          <div className="avatar">{(user?.display_name || 'Gość').slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{user?.display_name || 'Gość'}</strong>
            <small>{user ? user.email : 'Bez konta'}</small>
          </div>
          <button className="profile-action" onClick={user ? onLogout : onLogin} aria-label={user ? 'Wyloguj' : 'Zaloguj'}>
            {user ? <LogOut size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </aside>
  )
}

function VariantCard({
  variant, selected, onSelect,
}: {
  variant: Variant
  selected: boolean
  onSelect: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard?.writeText(variant.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <article className={`variant ${selected ? 'selected featured' : ''}`}>
      <div className="variant-top">
        <div>
          <div className="variant-title">{variant.name}{selected && <span className="recommended">WYBRANY</span>}</div>
          <p>{variant.explanation}</p>
        </div>
        <button className="icon-button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Zwiń' : 'Rozwiń'}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      <div className={`variant-text ${expanded ? 'expanded' : ''}`}>{variant.content}</div>
      <div className="variant-actions">
        <button className="secondary-button" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Skopiowano' : 'Kopiuj'}</button>
        <button className="use-button" onClick={onSelect}>Użyj tego wariantu <ArrowRight size={14} /></button>
      </div>
    </article>
  )
}

function AuthView({
  onSuccess, onCancel,
}: {
  onSuccess: (user: User) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await (mode === 'login'
        ? api.login({ email, password })
        : api.register({ email, password, display_name: displayName }))
      // Confirm the session cookie is actually usable (not only the JSON body).
      const session = await api.session()
      if (!session.authenticated || !session.user) {
        throw new Error(
          'Logowanie nie utrwaliło sesji. Upewnij się, że frontend korzysta z proxy /api (BACKEND_URL), a nie z innego hosta niż strona.',
        )
      }
      onSuccess(session.user)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="breadcrumbs"><span>PromptLab</span><ChevronRight size={14} /><strong>Konto</strong></div>
        <button className="text-button" onClick={onCancel}>Wróć</button>
      </header>
      <form className="auth-card" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}</h1>
        <p>Sesja jest przechowywana w bezpiecznym cookie HttpOnly.</p>
        {mode === 'register' && (
          <label>Imię lub nazwa
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} />
          </label>
        )}
        <label>E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>Hasło
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        {error && <div className="error-banner">{error}</div>}
        <button className="primary-button" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Proszę czekać…' : mode === 'login' ? 'Zaloguj' : 'Zarejestruj'}
        </button>
        <div className="auth-switch">
          {mode === 'login' ? (
            <>Nie masz konta? <button type="button" onClick={() => setMode('register')}>Zarejestruj się</button></>
          ) : (
            <>Masz już konto? <button type="button" onClick={() => setMode('login')}>Zaloguj się</button></>
          )}
        </div>
      </form>
    </div>
  )
}

function Landing({
  onEnter, onAuth,
}: {
  onEnter: (seed?: { prompt: string; category: string }) => void
  onAuth: () => void
}) {
  const [prompt, setPrompt] = useState('Napisz ciekawy post o produktywności')
  const [category, setCategory] = useState('Marketing')

  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />
        <nav>
          <a href="#how">Jak to działa</a>
          <a href="#features">Możliwości</a>
          <a href="#examples">Przykład</a>
        </nav>
        <div className="landing-actions">
          <button className="text-button" onClick={onAuth}>Zaloguj się</button>
          <button className="primary-button" onClick={() => onEnter()}>Otwórz workspace <ArrowRight size={15} /></button>
        </div>
      </header>
      <main className="landing-main">
        <span className="landing-kicker"><Sparkles size={14} /> PRZEMYŚLANE PROMPTY, LEPSZE REZULTATY</span>
        <h1>Lepsze prompty.<br /><em>Lepsze odpowiedzi.</em></h1>
        <p className="landing-subtitle">
          PromptLab pomaga zamieniać niejasne szkice w precyzyjne instrukcje dla modeli AI.
          Analiza i warianty powstają przez backend z Google Gemini — nie są hardcodowane.
        </p>
        <div className="landing-editor" id="examples">
          <div className="landing-editor-head">
            <span>Twój szkic promptu</span>
            <span className="landing-demo">TRYB GOŚCIA</span>
          </div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} aria-label="Szkic promptu" />
          <div className="landing-editor-foot">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button className="primary-button" onClick={() => onEnter({ prompt, category })}>
              Ulepsz prompt <Wand2 size={15} />
            </button>
          </div>
        </div>
        <div className="info-banner" style={{ maxWidth: 690, margin: '16px auto 0', textAlign: 'left' }}>
          W trybie gościa możesz przejść pełny workflow. Historia i eksperymenty zapisują się dopiero po zalogowaniu.
        </div>
        <div className="transform">
          <div>
            <span>SŁABY PROMPT</span>
            <p>„Napisz ciekawy post o produktywności”</p>
          </div>
          <ArrowRight size={18} />
          <div className="transform-good">
            <span>LEPSZY PROMPT</span>
            <p>„Napisz 5 praktycznych wskazówek dla menedżerów… z przykładem i CTA.”</p>
          </div>
        </div>
        <div id="how" className="steps">
          <div><b>01</b><strong>Wklej szkic</strong><span>Nie musisz wiedzieć, od czego zacząć.</span></div>
          <div><b>02</b><strong>Doprecyzuj cel</strong><span>Odpowiedz na kilka prostych pytań.</span></div>
          <div id="features"><b>03</b><strong>Porównaj wyniki</strong><span>Wybierz wariant, który działa najlepiej.</span></div>
        </div>
      </main>
      <footer>
        <Logo />
        <span>© 2026 PromptLab. Nie dodawaj haseł ani wrażliwych danych osobowych.</span>
        <span>Stworzone z myślą o lepszej pracy z AI.</span>
      </footer>
    </div>
  )
}

function Dashboard({
  user, seed, onNeedAuth,
}: {
  user: User | null
  seed?: { prompt: string; category: string } | null
  onNeedAuth: () => void
}) {
  const [prompt, setPrompt] = useState(seed?.prompt || '')
  const [category, setCategory] = useState(seed?.category || 'Marketing')
  const [context, setContext] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const [skippedQuestions, setSkippedQuestions] = useState(false)
  const [variants, setVariants] = useState<Variant[]>([])
  const [selected, setSelected] = useState<Variant | null>(null)
  const [scores, setScores] = useState<EvalScore[] | null>(null)
  const [disclaimer, setDisclaimer] = useState('')
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState<number | null>(null)

  const analyze = async () => {
    if (!prompt.trim()) return
    setLoading('analyze')
    setError('')
    setVariants([])
    setSelected(null)
    setScores(null)
    setSkippedQuestions(false)
    try {
      const result = await api.analyze({ prompt, category, context: context || undefined })
      setAnalysis(result)
      setAnswers(result.clarifying_questions.map(() => ''))
    } catch (err) {
      setError(errMsg(err))
      setAnalysis(null)
    } finally {
      setLoading('')
    }
  }

  const generate = async (skip = false) => {
    if (!analysis) return
    setLoading('generate')
    setError('')
    setSkippedQuestions(skip)
    try {
      const payloadAnswers = skip
        ? []
        : analysis.clarifying_questions.map((q, i) => ({ question: q, answer: answers[i] || '' }))
      const result = await api.generate({
        prompt,
        category,
        context: context || undefined,
        answers: payloadAnswers,
        save: Boolean(user),
      })
      setVariants(result.variants)
      setSelected(result.variants[1] || result.variants[0] || null)
      setSessionId(result.session_id)
      if (user && !result.session_id) {
        try {
          const saved = await api.createHistory({
            original_prompt: prompt,
            category,
            context: context || undefined,
            analysis_json: JSON.stringify(analysis),
            clarifying_json: JSON.stringify(payloadAnswers),
            variants: result.variants,
            selected_variant_index: 1,
          })
          setSessionId(saved.id)
          } catch (saveErr) {
            if (saveErr instanceof ApiError && saveErr.status === 401) {
              setError('')
              onNeedAuth()
            } else {
              setError(`Warianty wygenerowano, ale zapis historii nie powiódł się: ${errMsg(saveErr)}`)
            }
        }
      }
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading('')
    }
  }

  const refine = async (action: 'skroc' | 'formalny' | 'ograniczenia' | 'halucynacje') => {
    if (!selected) return
    setLoading('refine')
    setError('')
    try {
      const result = await api.refine({ prompt: selected.content, action })
      const updated = { ...selected, content: result.content }
      setSelected(updated)
      setVariants((prev) => prev.map((v) => (v.style === selected.style ? updated : v)))
      setScores(null)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading('')
    }
  }

  const evaluate = async () => {
    if (!selected) return
    setLoading('evaluate')
    setError('')
    try {
      const result = await api.evaluate({ original_prompt: prompt, improved_prompt: selected.content })
      setScores(result.scores)
      setDisclaimer(result.disclaimer)
    } catch (err) {
      setScores(null)
      setError(errMsg(err))
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="breadcrumbs"><span>PromptLab</span><ChevronRight size={14} /><strong>Dashboard</strong></div>
        {!user && <button className="text-button" onClick={onNeedAuth}>Zaloguj, aby zapisać historię <ArrowRight size={14} /></button>}
      </header>
      <main className="dashboard">
        <div className="page-intro">
          <div>
            <span className="eyebrow">WORKSPACE / DASHBOARD</span>
            <h1>Ulepsz swój prompt</h1>
            <p>Zacznij od szkicu. PromptLab pomoże doprecyzować cel i wybrać najlepszą formę.</p>
          </div>
          <span className="status"><span className="status-dot" /> {user ? 'Zalogowano' : 'Gość'}</span>
        </div>

        <section className="editor-card">
          <div className="section-head">
            <div><span className="eyebrow">01 / PUNKT WYJŚCIA</span><h2>Twój oryginalny prompt</h2></div>
            <span className="char-count">{prompt.length} / 2000</span>
          </div>
          <textarea
            value={prompt}
            maxLength={2000}
            onChange={(e) => setPrompt(e.target.value)}
            aria-label="Oryginalny prompt"
            className="prompt-textarea"
            placeholder="Wpisz lub wklej prompt…"
          />
          <div className="editor-options">
            <label>Kategoria
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="context-field">Kontekst <span>(opcjonalnie)</span>
              <input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Np. dla małego zespołu SaaS" maxLength={1000} />
            </label>
          </div>
          <div className="privacy"><Info size={14} /> Nie dodawaj haseł ani wrażliwych danych osobowych.</div>
          <button className="primary-button" onClick={analyze} disabled={loading === 'analyze' || !prompt.trim()}>
            <Wand2 size={16} /> {loading === 'analyze' ? 'Analizuję…' : 'Analizuj prompt'} <ArrowRight size={15} />
          </button>
        </section>

        {error && <div className="error-banner">{error}</div>}

        {analysis && (
          <>
            <section className="analysis">
              <div className="analysis-icon"><Lightbulb size={17} /></div>
              <div>
                <strong>Co można doprecyzować?</strong>
                <p>{analysis.summary}</p>
                {analysis.issues.length > 0 && (
                  <p style={{ marginTop: 8 }}>{analysis.issues.map((i) => `${i.area}: ${i.detail}`).join(' · ')}</p>
                )}
              </div>
              <span className="analysis-score">{analysis.issues.length || analysis.missing_context.length} obszary</span>
            </section>

            <section className="questions">
              <div className="section-head compact">
                <div><span className="eyebrow">02 / DOPRECYZOWANIE</span><h2>Odpowiedz na kilka pytań</h2></div>
                <button className="skip-button" onClick={() => generate(true)} disabled={!!loading}>Pomiń krok <X size={14} /></button>
              </div>
              <div className="question-grid">
                {analysis.clarifying_questions.map((q, i) => (
                  <label key={q}>{q}
                    <input value={answers[i] || ''} onChange={(e) => setAnswers((prev) => prev.map((a, idx) => (idx === i ? e.target.value : a)))} />
                  </label>
                ))}
              </div>
              <button className="primary-button" style={{ marginTop: 16 }} onClick={() => generate(false)} disabled={!!loading}>
                {loading === 'generate' ? 'Generuję warianty…' : 'Generuj 3 warianty'}
              </button>
              {skippedQuestions && <p className="loading-inline" style={{ marginTop: 10 }}>Pytania pominięte — warianty oparte tylko na oryginalnym prompcie.</p>}
            </section>
          </>
        )}

        {variants.length > 0 && (
          <section className="variants">
            <div className="section-head compact">
              <div><span className="eyebrow">03 / WYNIK</span><h2>Wybierz najlepszy wariant</h2></div>
              {sessionId && <span className="demo-label">ZAPISANO #{sessionId}</span>}
            </div>
            <div className="variant-grid">
              {variants.map((v) => (
                <VariantCard key={v.style} variant={v} selected={selected?.style === v.style} onSelect={() => { setSelected(v); setScores(null) }} />
              ))}
            </div>
          </section>
        )}

        {selected && (
          <section className="compare">
            <div className="section-head compact">
              <div><span className="eyebrow">PORÓWNANIE</span><h2>Porównaj wyniki</h2></div>
              <button className="refine-button" onClick={evaluate} disabled={loading === 'evaluate'}>
                <Zap size={14} /> {loading === 'evaluate' ? 'Oceniam…' : 'Oceń przez model'}
              </button>
            </div>
            <div className="compare-grid">
              <div>
                <span className="compare-label">ORYGINALNY PROMPT</span>
                <p>{prompt}</p>
                {scores && (
                  <div className="score low">
                    <strong>{(scores.reduce((s, x) => s + x.original, 0) / scores.length).toFixed(1)}</strong>
                    <span>/ 10</span>
                  </div>
                )}
              </div>
              <div>
                <span className="compare-label">{selected.name.toUpperCase()}</span>
                <p>{selected.content.slice(0, 220)}{selected.content.length > 220 ? '…' : ''}</p>
                {scores && (
                  <div className="score high">
                    <strong>{(scores.reduce((s, x) => s + x.improved, 0) / scores.length).toFixed(1)}</strong>
                    <span>/ 10</span>
                  </div>
                )}
              </div>
            </div>
            {scores && (
              <div className="info-banner" style={{ marginTop: 14 }}>
                {disclaimer || 'Oceny są szacunkami modelu AI, nie obiektywnymi pomiarami.'}
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {scores.map((s) => (
                    <li key={s.criterion}>{s.criterion}: {s.original} → {s.improved}{s.note ? ` — ${s.note}` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="quick-actions">
              <span>Szybkie poprawki</span>
              <button disabled={!!loading} onClick={() => refine('skroc')}>Skróć</button>
              <button disabled={!!loading} onClick={() => refine('formalny')}>Zmień ton na formalny</button>
              <button disabled={!!loading} onClick={() => refine('ograniczenia')}>Dodaj ograniczenia</button>
              <button disabled={!!loading} onClick={() => refine('halucynacje')}>Ogranicz ryzyko halucynacji</button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function ExamplesPage({ onUse }: { onUse: (prompt: string, category: string) => void }) {
  const [items, setItems] = useState<Example[]>([])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('Wszystkie')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.examples({ q: q || undefined, category: category === 'Wszystkie' ? undefined : category })
      .then(setItems)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false))
  }, [q, category])

  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="breadcrumbs"><span>PromptLab</span><ChevronRight size={14} /><strong>Przykłady</strong></div>
      </header>
      <main className="subpage">
        <div className="page-intro">
          <div>
            <span className="eyebrow">WORKSPACE</span>
            <h1>Przykłady</h1>
            <p>Zobacz, jak mała zmiana potrafi znacząco poprawić odpowiedź.</p>
          </div>
        </div>
        <div className="library">
          <div className="library-tools">
            <div className="search-box"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj przykładów…" /></div>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Wszystkie</option>
              {[...new Set(items.map((i) => i.category).concat(CATEGORIES))].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {error && <div className="error-banner">{error}</div>}
          {loading && <p className="loading-inline">Ładowanie…</p>}
          {!loading && items.length === 0 && <div className="empty-state">Brak przykładów dla wybranych filtrów.</div>}
          {items.map((e, i) => (
            <div className="library-row" key={e.id}>
              <div className="row-number">{String(i + 1).padStart(2, '0')}</div>
              <div className="row-content">
                <div><strong>{e.title}</strong><span className="category">{e.category}</span></div>
                <p>{e.description} — „{e.weak_prompt}”</p>
              </div>
              <button className="secondary-button" onClick={() => onUse(e.weak_prompt, e.category)}>Wypróbuj <ArrowRight size={14} /></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function HistoryPage({ user, onOpen, onNeedAuth }: { user: User | null; onOpen: (prompt: string, category: string) => void; onNeedAuth: () => void }) {
  const [items, setItems] = useState<SessionSummary[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (!user) return
    setLoading(true)
    setError('')
    api.listHistory()
      .then(setItems)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          setError('')
          onNeedAuth()
          return
        }
        setError(errMsg(e))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [user])

  if (!user) {
    return (
      <div className="page-wrap">
        <header className="topbar"><div className="breadcrumbs"><span>PromptLab</span><ChevronRight size={14} /><strong>Historia</strong></div></header>
        <main className="subpage">
          <div className="empty-state">
            Historia jest dostępna po zalogowaniu.
            <div style={{ marginTop: 14 }}><button className="primary-button" onClick={onNeedAuth}>Zaloguj się</button></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <header className="topbar"><div className="breadcrumbs"><span>PromptLab</span><ChevronRight size={14} /><strong>Historia</strong></div></header>
      <main className="subpage">
        <div className="page-intro"><div><span className="eyebrow">WORKSPACE</span><h1>Historia promptów</h1><p>Wróć do swoich poprzednich sesji.</p></div></div>
        {error && <div className="error-banner">{error}</div>}
        {loading && <p className="loading-inline">Ładowanie…</p>}
        {!loading && items.length === 0 && <div className="empty-state">Brak zapisanych sesji.</div>}
        <div className="library">
          {items.map((item, i) => (
            <div className="library-row" key={item.id}>
              <div className="row-number">{String(i + 1).padStart(2, '0')}</div>
              <div className="row-content">
                <div><strong>{item.title}</strong>{item.category && <span className="category">{item.category}</span>}</div>
                <p>{new Date(item.created_at).toLocaleString('pl-PL')} — {item.original_prompt}</p>
              </div>
              <button className="secondary-button" onClick={() => onOpen(item.original_prompt, item.category || 'Inne')}>Otwórz</button>
              <button className="icon-button" aria-label="Usuń" onClick={async () => { await api.deleteHistory(item.id); load() }}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function ExperimentsPage({ user, onNeedAuth }: { user: User | null; onNeedAuth: () => void }) {
  const [items, setItems] = useState<Experiment[]>([])
  const [title, setTitle] = useState('Porównanie V1/V2/V3')
  const [v1, setV1] = useState('')
  const [v2, setV2] = useState('')
  const [v3, setV3] = useState('')
  const [active, setActive] = useState<Experiment | null>(null)
  const [rows, setRows] = useState<{ criterion: string; scores: Record<string, number>; feedback: Record<string, string> }[] | null>(null)
  const [disclaimer, setDisclaimer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState('')

  const load = () => {
    if (!user) return
    api.listExperiments()
      .then(setItems)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          setError('')
          onNeedAuth()
          return
        }
        setError(errMsg(e))
      })
  }
  useEffect(load, [user])

  if (!user) {
    return (
      <div className="page-wrap">
        <header className="topbar"><div className="breadcrumbs"><span>PromptLab</span><ChevronRight size={14} /><strong>Testy promptów</strong></div></header>
        <main className="subpage"><div className="empty-state">Eksperymenty wymagają konta.<div style={{ marginTop: 14 }}><button className="primary-button" onClick={onNeedAuth}>Zaloguj się</button></div></div></main>
      </div>
    )
  }

  const create = async () => {
    setLoading('create')
    setError('')
    try {
      const versions = [
        { label: 'V1' as const, content: v1 },
        { label: 'V2' as const, content: v2 },
        { label: 'V3' as const, content: v3 },
      ].filter((v) => v.content.trim())
      const exp = await api.createExperiment({
        title,
        criteria: ['Jasność celu', 'Kontekst', 'Precyzja instrukcji', 'Format odpowiedzi', 'Kompletność'],
        versions,
      })
      setActive(exp)
      setRows(null)
      load()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading('')
    }
  }

  const runEval = async () => {
    if (!active) return
    setLoading('eval')
    setError('')
    try {
      const result = await api.evaluateExperiment(active.id)
      setRows(result.rows)
      setDisclaimer(result.disclaimer)
      load()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="page-wrap">
      <header className="topbar"><div className="breadcrumbs"><span>PromptLab</span><ChevronRight size={14} /><strong>Testy promptów</strong></div></header>
      <main className="subpage">
        <div className="page-intro"><div><span className="eyebrow">WORKSPACE</span><h1>Testy promptów</h1><p>Porównuj warianty według tych samych kryteriów. Wyniki to szacunki modelu.</p></div></div>
        {error && <div className="error-banner">{error}</div>}
        <div className="settings-list" style={{ marginBottom: 18 }}>
          <div className="setting-row"><div><strong>Tytuł eksperymentu</strong><span>Nazwa porównania V1 / V2 / V3</span></div><input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: 240 }} /></div>
          {([['V1', v1, setV1], ['V2', v2, setV2], ['V3', v3, setV3]] as const).map(([label, val, setVal]) => (
            <div className="setting-row" key={label} style={{ alignItems: 'flex-start' }}>
              <div><strong>{label}</strong><span>Treść wersji promptu</span></div>
              <textarea value={val} onChange={(e) => setVal(e.target.value)} style={{ width: '55%', minHeight: 70 }} />
            </div>
          ))}
          <div className="setting-row">
            <div><strong>Akcje</strong><span>Zapisz i uruchom ocenę przez Gemini</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="secondary-button" onClick={create} disabled={!!loading}>Zapisz</button>
              <button className="primary-button" onClick={runEval} disabled={!active || !!loading}>{loading === 'eval' ? 'Oceniam…' : 'Uruchom ocenę'}</button>
            </div>
          </div>
        </div>

        {rows && (
          <div className="test-box">
            <div className="test-tabs"><button className="selected">Porównanie wersji</button></div>
            <div className="info-banner" style={{ margin: 16 }}>{disclaimer}</div>
            <div className="test-table">
              <div className="test-header"><span>KRYTERIUM</span><b>V1</b><b>V2</b><b>V3</b></div>
              {rows.map((r) => {
                const vals = ['V1', 'V2', 'V3'].map((k) => r.scores[k])
                const best = Math.max(...vals.filter((n) => typeof n === 'number'))
                return (
                  <div className="test-row" key={r.criterion}>
                    <span>{r.criterion}</span>
                    {['V1', 'V2', 'V3'].map((k) => (
                      <span key={k} className={r.scores[k] === best ? 'best' : ''}>{r.scores[k] ?? '—'}</span>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="library" style={{ marginTop: 18 }}>
          {items.map((item) => (
            <div className="library-row" key={item.id}>
              <div className="row-content">
                <div><strong>{item.title}</strong></div>
                <p>{new Date(item.created_at).toLocaleString('pl-PL')} · {item.versions.length} wersje</p>
              </div>
              <button className="secondary-button" onClick={() => {
                setActive(item)
                setTitle(item.title)
                setV1(item.versions.find((v) => v.label === 'V1')?.content || '')
                setV2(item.versions.find((v) => v.label === 'V2')?.content || '')
                setV3(item.versions.find((v) => v.label === 'V3')?.content || '')
                setRows(item.evaluation_json ? JSON.parse(item.evaluation_json).rows : null)
                setDisclaimer(item.evaluation_json ? JSON.parse(item.evaluation_json).disclaimer : '')
              }}>Otwórz</button>
              <button className="icon-button" onClick={async () => { await api.deleteExperiment(item.id); load() }} aria-label="Usuń"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function SettingsPage({ user, onLogout, onLogin }: { user: User | null; onLogout: () => void; onLogin: () => void }) {
  return (
    <div className="page-wrap">
      <header className="topbar"><div className="breadcrumbs"><span>PromptLab</span><ChevronRight size={14} /><strong>Ustawienia</strong></div></header>
      <main className="subpage">
        <div className="page-intro"><div><span className="eyebrow">WORKSPACE</span><h1>Ustawienia</h1><p>Konto i podstawowe informacje o prywatności.</p></div></div>
        <div className="settings-list">
          <div className="setting-row">
            <div><strong>Konto</strong><span>{user ? `${user.display_name} · ${user.email}` : 'Jesteś w trybie gościa.'}</span></div>
            {user ? <button className="secondary-button" onClick={onLogout}>Wyloguj</button> : <button className="primary-button" onClick={onLogin}>Zaloguj / Zarejestruj</button>}
          </div>
          <div className="setting-row">
            <div><strong>Język interfejsu</strong><span>Interfejs jest dostępny po polsku.</span></div>
            <select disabled defaultValue="Polski"><option>Polski</option></select>
          </div>
          <div className="setting-row muted-row">
            <div><strong>Powiadomienia e-mail</strong><span>Funkcja planowana — przełącznik nie zmienia jeszcze zachowania aplikacji.</span></div>
            <span className="coming">WKRÓTCE</span>
          </div>
          <div className="setting-row">
            <div>
              <strong>Prywatność</strong>
              <span>
                Prompty są wysyłane do backendu i (przy włączonym Gemini) do Google AI.
                Nie dodawaj haseł ani wrażliwych danych. Lokalnie dane konta są w SQLite.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Page() {
  const [view, setView] = useState<'landing' | 'app' | 'auth'>('landing')
  const [page, setPage] = useState('dashboard')
  const [freshKey, setFreshKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [seed, setSeed] = useState<{ prompt: string; category: string } | null>(null)
  const [bootstrapped, setBootstrapped] = useState(false)

  const refreshSession = async () => {
    const s = await api.session()
    if (s.authenticated && s.user) {
      setUser(s.user)
      return s.user
    }
    setUser(null)
    return null
  }

  useEffect(() => {
    refreshSession()
      .then((u) => { if (u) setView('app') })
      .catch(() => { setUser(null) })
      .finally(() => setBootstrapped(true))
  }, [])

  useEffect(() => {
    if (!bootstrapped) return
    const revalidate = () => {
      if (view !== 'auth') void refreshSession().catch(() => setUser(null))
    }
    window.addEventListener('focus', revalidate)
    return () => window.removeEventListener('focus', revalidate)
  }, [bootstrapped, view])

  const logout = async () => {
    try { await api.logout() } catch { /* ignore */ }
    setUser(null)
  }

  const handleAuthSuccess = async (u: User) => {
    setUser(u)
    setView('app')
  }

  if (!bootstrapped) {
    return <div className="page-wrap" style={{ padding: 40 }}><p className="loading-inline">Ładowanie PromptLab…</p></div>
  }

  if (view === 'landing') {
    return (
      <Landing
        onAuth={() => setView('auth')}
        onEnter={(s) => {
          if (s) { setSeed(s); setFreshKey((k) => k + 1) }
          setPage('dashboard')
          setView('app')
        }}
      />
    )
  }

  if (view === 'auth') {
    return (
      <AuthView
        onCancel={() => setView(user ? 'app' : 'landing')}
        onSuccess={handleAuthSuccess}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="mobile-bar">
        <Logo />
        <button className="icon-button" aria-label="Otwórz menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
      </div>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <Sidebar
        page={page}
        setPage={setPage}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNew={() => { setSeed(null); setPage('dashboard'); setFreshKey((k) => k + 1) }}
        user={user}
        onLogout={logout}
        onLogin={() => setView('auth')}
      />
      {page === 'dashboard' && (
        <Dashboard
          key={freshKey}
          user={user}
          seed={seed}
          onNeedAuth={() => setView('auth')}
        />
      )}
      {page === 'examples' && (
        <ExamplesPage onUse={(prompt, category) => { setSeed({ prompt, category }); setPage('dashboard'); setFreshKey((k) => k + 1) }} />
      )}
      {page === 'history' && (
        <HistoryPage
          user={user}
          onNeedAuth={() => setView('auth')}
          onOpen={(prompt, category) => { setSeed({ prompt, category }); setPage('dashboard'); setFreshKey((k) => k + 1) }}
        />
      )}
      {page === 'tests' && <ExperimentsPage user={user} onNeedAuth={() => setView('auth')} />}
      {page === 'settings' && <SettingsPage user={user} onLogout={logout} onLogin={() => setView('auth')} />}
    </div>
  )
}

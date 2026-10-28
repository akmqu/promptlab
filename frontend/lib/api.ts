/**
 * Default: same-origin requests (empty base) so the session cookie is set on the
 * Next.js host and proxied to FastAPI via next.config rewrites.
 * Set NEXT_PUBLIC_API_URL only if you intentionally call the API directly
 * (then frontend and API must share the same hostname, e.g. both localhost).
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    let detail = 'Wystąpił błąd żądania'
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') detail = data.detail
      else if (Array.isArray(data?.detail)) {
        detail = data.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ') || detail
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export type User = {
  id: number
  email: string
  display_name: string
  created_at: string
}

export type AnalysisResult = {
  summary: string
  issues: { area: string; detail: string }[]
  missing_context: string[]
  missing_constraints: string[]
  ambiguity: string[]
  expected_format: string | null
  hallucination_risks: string[]
  clarifying_questions: string[]
}

export type Variant = {
  name: string
  style: 'krotki' | 'rozbudowany' | 'krok_po_kroku'
  explanation: string
  content: string
}

export type Example = {
  id: string
  title: string
  category: string
  weak_prompt: string
  description: string
}

export type SessionSummary = {
  id: number
  title: string
  category: string | null
  original_prompt: string
  created_at: string
}

export type SessionDetail = SessionSummary & {
  context: string | null
  analysis_json: string | null
  clarifying_json: string | null
  evaluation_json: string | null
  selected_variant_id: number | null
  updated_at: string
  variants: {
    id: number
    name: string
    style: string
    explanation: string
    content: string
  }[]
}

export type Experiment = {
  id: number
  title: string
  criteria: string[]
  evaluation_json: string | null
  created_at: string
  updated_at: string
  versions: { id: number; label: string; content: string }[]
}

export type EvalScore = {
  criterion: string
  original: number
  improved: number
  note?: string | null
}

export const api = {
  health: () => request<{ status: string; gemini_configured: boolean }>('/health'),
  session: () => request<{ authenticated: boolean; user: User | null }>('/api/auth/session'),
  register: (body: { email: string; password: string; display_name: string }) =>
    request<User>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<User>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  analyze: (body: { prompt: string; category?: string; context?: string }) =>
    request<AnalysisResult>('/api/prompts/analyze', { method: 'POST', body: JSON.stringify(body) }),
  generate: (body: {
    prompt: string
    category?: string
    context?: string
    answers?: { question: string; answer: string }[]
    save?: boolean
  }) => request<{ variants: Variant[]; session_id: number | null }>('/api/prompts/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  refine: (body: { prompt: string; action: 'skroc' | 'formalny' | 'ograniczenia' | 'halucynacje' }) =>
    request<{ content: string; action: string }>('/api/prompts/refine', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  evaluate: (body: { original_prompt: string; improved_prompt: string }) =>
    request<{ scores: EvalScore[]; disclaimer: string }>('/api/prompts/evaluate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  examples: (params?: { q?: string; category?: string }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.category) qs.set('category', params.category)
    const suffix = qs.toString() ? `?${qs}` : ''
    return request<Example[]>(`/api/examples${suffix}`)
  },
  listHistory: () => request<SessionSummary[]>('/api/history'),
  getHistory: (id: number) => request<SessionDetail>(`/api/history/${id}`),
  createHistory: (body: Record<string, unknown>) =>
    request<SessionDetail>('/api/history', { method: 'POST', body: JSON.stringify(body) }),
  deleteHistory: (id: number) =>
    request<{ message: string }>(`/api/history/${id}`, { method: 'DELETE' }),
  listExperiments: () => request<Experiment[]>('/api/experiments'),
  createExperiment: (body: {
    title: string
    criteria: string[]
    versions: { label: 'V1' | 'V2' | 'V3'; content: string }[]
  }) => request<Experiment>('/api/experiments', { method: 'POST', body: JSON.stringify(body) }),
  updateExperiment: (id: number, body: Record<string, unknown>) =>
    request<Experiment>(`/api/experiments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteExperiment: (id: number) =>
    request<{ message: string }>(`/api/experiments/${id}`, { method: 'DELETE' }),
  evaluateExperiment: (id: number) =>
    request<{
      rows: { criterion: string; scores: Record<string, number>; feedback: Record<string, string> }[]
      disclaimer: string
    }>(`/api/experiments/${id}/evaluate`, { method: 'POST', body: '{}' }),
}

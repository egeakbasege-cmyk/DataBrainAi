const BASE = '/api'

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail?.message || err?.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getAnalyses(token: string) {
  return apiFetch('/analyses', token)
}

export async function getAnalysis(id: string, token: string) {
  return apiFetch(`/analyses/${id}`, token)
}

export async function createCheckout(bundle: 1 | 3 | 10, token: string) {
  return apiFetch('/credits/checkout', token, {
    method: 'POST',
    body: JSON.stringify({ bundle }),
  })
}

export async function getUserProfile(token: string) {
  return apiFetch('/auth/me', token)
}

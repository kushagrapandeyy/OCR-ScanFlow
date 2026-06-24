/**
 * API Client — Fetch wrapper with automatic JWT refresh
 * 
 * - Attaches Authorization header to every request
 * - On 401 TOKEN_EXPIRED → refreshes token and retries once
 * - On refresh failure → logs out and redirects to /login
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// We need to import store lazily to avoid circular deps
let _store = null
function getStore() {
  if (!_store) {
    import('../store.js').then(m => { _store = m.useAppStore })
  }
  return _store
}

export function setStoreRef(store) {
  _store = store
}

async function apiClient(path, options = {}) {
  const store = getStore()
  const state = store?.getState?.()
  const token = state?.token || localStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = path.startsWith('http') ? path : `${API_URL}${path}`
  
  let res = await fetch(url, { ...options, headers })

  // If token expired, try to refresh once
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}))
    if (body.code === 'TOKEN_EXPIRED') {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        // Retry with new token
        const newToken = store?.getState?.()?.token || localStorage.getItem('token')
        headers['Authorization'] = `Bearer ${newToken}`
        res = await fetch(url, { ...options, headers })
      } else {
        // Refresh failed — log out
        store?.getState?.()?.logout?.()
        window.location.href = '/login'
        throw new Error('Session expired. Please log in again.')
      }
    }
  }

  return res
}

async function tryRefreshToken() {
  const store = getStore()
  const state = store?.getState?.()
  const refreshToken = state?.refreshToken || localStorage.getItem('refreshToken')
  
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    
    const data = await res.json()
    // Update token in store
    const currentState = store?.getState?.()
    if (currentState?.setToken) {
      currentState.setToken(data.accessToken)
    } else {
      localStorage.setItem('token', data.accessToken)
    }
    return true
  } catch {
    return false
  }
}

export default apiClient

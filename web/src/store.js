import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Helper: make authenticated fetch
function authFetch(token, path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const url = path.startsWith('http') ? path : `${API_URL}${path}`
  return fetch(url, { ...options, headers })
}

// ─── App Store ──────────────────────────────────────────────────────────────
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Theme
      darkMode: 'auto', // 'auto' | 'dark' | 'light'
      setDarkMode: (mode) => set({ darkMode: mode }),

      // Haptics
      haptics: {
        enabled: true,
        silentMode: false,
        patterns: {
          tap: [10],
          success: [20, 10, 20],
          error: [50, 30, 50],
          heavy: [80],
          capture: [15, 5, 15, 5, 30],
        },
      },
      setHaptics: (haptics) => set({ haptics }),

      // CRM Config
      crmConfig: {
        connected: false,
        name: 'Custom Integration',
        webhookUrl: '',
        apiKey: '',
        exportFormat: 'json',
        sftpEnabled: false,
        sftpHost: '',
        sftpPort: '22',
        sftpUser: '',
        sftpUploadDir: '/uploads',
        schema: {
          name: 'Name',
          email: 'Email',
          company: 'Companies',
          tags: 'Tags',
          category: 'Category',
          designation: 'Designation',
          country: 'Country',
          mobile_prefix: 'Mobile Prefix',
          first_name: 'first_name',
          last_name: 'last_name',
          phone: 'phone',
          website: 'website',
          linkedin: 'linkedin',
          address: 'address',
          notes: 'notes',
          interaction_level: 'interaction_level',
          event_name: 'event_name',
        },
      },
      setCrmConfig: (config) => {
        set({ crmConfig: { ...get().crmConfig, ...config } })
        get().updateCrmConfigDb(config)
      },

      // Scan session
      currentSession: {
        eventName: '',
        cards: [],
        sessionId: null,
      },
      setCurrentSession: (session) => set({ currentSession: session }),
      addCardToSession: (card) =>
        set((state) => ({
          currentSession: {
            ...state.currentSession,
            cards: [...state.currentSession.cards, card],
          },
        })),
      clearSession: () =>
        set({ currentSession: { eventName: '', scans: [], sessionId: null } }),

      scans: [],
      addScan: (scan) => {
        set((state) => ({ scans: [scan, ...state.scans] }))
      },
      updateScan: async (id, updates) => {
        set((state) => ({
          scans: state.scans.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }))
        const token = get().token || localStorage.getItem('token')
        try {
          await authFetch(token, `/api/scans/${id}/contact`, {
            method: 'PUT',
            body: JSON.stringify(updates)
          })
        } catch (err) { console.error('Failed to update scan:', err) }
      },
      deleteScan: async (id) => {
        set((state) => ({ scans: state.scans.filter((c) => c.id !== id) }))
        const token = get().token || localStorage.getItem('token')
        try {
          await authFetch(token, `/api/scans/${id}`, { method: 'DELETE' })
        } catch (err) { console.error('Failed to delete scan:', err) }
      },
      deleteScans: async (ids) => {
        set((state) => ({ scans: state.scans.filter((c) => !ids.includes(c.id)) }))
        ids.forEach(id => get().deleteScan(id))
      },
      archiveScans: async (ids) => {
        set((state) => ({
          scans: state.scans.map((c) => ids.includes(c.id) ? { ...c, archived: true } : c),
        }))
        const token = get().token || localStorage.getItem('token')
        try {
          await authFetch(token, `/api/scans/archive`, {
            method: 'POST',
            body: JSON.stringify({ scanIds: ids })
          })
        } catch (err) { console.error('Failed to archive scans:', err) }
      },
      markExported: async (ids) => {
        set((state) => ({
          scans: state.scans.map((c) => ids.includes(c.id) ? { ...c, exported_at: new Date().toISOString() } : c),
        }))
        const token = get().token || localStorage.getItem('token')
        try {
          await authFetch(token, `/api/scans/export`, {
            method: 'POST',
            body: JSON.stringify({ scanIds: ids })
          })
        } catch (err) { console.error('Failed to export scans:', err) }
      },

      // Exports log
      exports: [],
      addExport: (exp) => set((state) => ({ exports: [exp, ...state.exports] })),
      updateExport: (id, updates) =>
        set((state) => ({
          exports: state.exports.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      // Toast
      toasts: [],
      addToast: (toast) => {
        const id = Date.now().toString()
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
        }, 4000)
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      // ─── Auth ──────────────────────────────────────────────────────────────
      user: null,
      isAuthenticated: false,
      authLoading: true,
      token: null,
      refreshToken: null,
      
      setUser: (user, token, refreshToken) => {
        if (token) localStorage.setItem('token', token)
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
        set({ user, isAuthenticated: !!user, token, refreshToken: refreshToken || get().refreshToken })
      },

      setToken: (token) => {
        localStorage.setItem('token', token)
        set({ token })
      },

      logout: () => {
        const token = get().token
        // Fire and forget logout on backend
        if (token) {
          authFetch(token, '/api/auth/logout', { method: 'POST' }).catch(() => {})
        }
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        set({ user: null, isAuthenticated: false, token: null, refreshToken: null, scans: [], authLoading: false })
      },

      // Initialize auth — check for persisted token validity
      initAuth: async () => {
        const token = get().token || localStorage.getItem('token')
        if (!token) {
          set({ authLoading: false })
          return
        }
        try {
          const res = await authFetch(token, '/api/auth/me')
          if (res.ok) {
            const data = await res.json()
            set({ user: data.user, isAuthenticated: true, token, authLoading: false })
          } else if (res.status === 401) {
            // Try refresh
            const refreshed = await get().tryRefresh()
            if (!refreshed) {
              get().logout()
            }
            set({ authLoading: false })
          } else {
            set({ authLoading: false })
          }
        } catch {
          set({ authLoading: false })
        }
      },

      tryRefresh: async () => {
        const rt = get().refreshToken || localStorage.getItem('refreshToken')
        if (!rt) return false
        try {
          const res = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
          })
          if (!res.ok) return false
          const data = await res.json()
          get().setToken(data.accessToken)
          // Re-fetch user info
          const meRes = await authFetch(data.accessToken, '/api/auth/me')
          if (meRes.ok) {
            const meData = await meRes.json()
            set({ user: meData.user, isAuthenticated: true })
          }
          return true
        } catch {
          return false
        }
      },

      // Email/password login
      login: async (email, password) => {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Login failed')
        get().setUser(data.user, data.accessToken, data.refreshToken)
        return data
      },

      // Email/password signup
      signup: async (name, email, password, company) => {
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, company }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Registration failed')
        get().setUser(data.user, data.accessToken, data.refreshToken)
        return data
      },

      // Google OAuth login
      googleLogin: async (credential) => {
        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Google sign-in failed')
        get().setUser(data.user, data.accessToken, data.refreshToken)
        return data
      },

      // API Sync Actions
      syncCrmConfig: async () => {
        const token = get().token || localStorage.getItem('token')
        if (!token) return
        try {
          const res = await authFetch(token, '/api/settings/crm')
          if (res.ok) {
            const data = await res.json()
            set({ crmConfig: { ...get().crmConfig, ...data } })
          }
        } catch (err) { console.error('Failed to sync CRM config:', err) }
      },

      syncScans: async () => {
        const token = get().token || localStorage.getItem('token')
        if (!token) return
        try {
          const res = await authFetch(token, '/api/scans')
          if (res.ok) {
            const data = await res.json()
            set({ scans: data.cards || [] })
          }
        } catch (err) { console.error('Failed to sync scans:', err) }
      },
      
      updateCrmConfigDb: async (updates) => {
        const token = get().token || localStorage.getItem('token')
        if (!token) return
        try {
          await authFetch(token, '/api/settings/crm', {
            method: 'PATCH',
            body: JSON.stringify(updates)
          })
        } catch (err) { console.error('Failed to update config:', err) }
      }
    }),
    {
      name: 'cardscan-store-v2',
      partialize: (state) => ({
        darkMode: state.darkMode,
        haptics: state.haptics,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
)

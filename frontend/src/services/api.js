import axios from 'axios'

/**
 * Single axios instance for MUI-based pages.
 * Dev: /api is proxied by src/setupProxy.js → backend (default http://localhost:5001).
 * Production: set REACT_APP_API_URL to your API origin.
 */
const baseURL = process.env.REACT_APP_API_URL || ''

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Attach JWT from localStorage to every request.
 */
api.interceptors.request.use((config) => {
  try {
    const legacy = localStorage.getItem('token')
    if (legacy) {
      config.headers.Authorization = `Bearer ${legacy}`
      return config
    }
    const raw = localStorage.getItem('wms_auth')
    if (raw) {
      const { accessToken } = JSON.parse(raw)
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
    }
  } catch {
    // Ignore bad JSON in localStorage
  }
  return config
})

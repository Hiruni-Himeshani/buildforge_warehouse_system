const { createProxyMiddleware } = require('http-proxy-middleware')

/**
 * Dev-only: forward /api/* to the BuildForge backend.
 * Default http://localhost:5001 (matches backend server.js fallback).
 * Override: REACT_APP_API_PROXY=http://localhost:OTHER
 */
module.exports = function setupProxy(app) {
  const target = process.env.REACT_APP_API_PROXY || 'http://localhost:5001'

  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'warn',
    }),
  )
}

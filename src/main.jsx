import React from 'react'
import ReactDOM from 'react-dom/client'
import App, { AppErrorBoundary } from './App.jsx'
import { BRAND } from './brand.config.js'

document.title = BRAND.metaTitle
const metaDesc = document.querySelector('meta[name="description"]')
if (metaDesc) metaDesc.setAttribute('content', BRAND.metaDescription)

// Register the service worker (PWA install + web push). Non-blocking.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[sw] registration failed:', err)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
)

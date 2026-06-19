import React from 'react'
import ReactDOM from 'react-dom/client'
import App, { AppErrorBoundary } from './App.jsx'
import { BRAND } from './brand.config.js'

document.title = BRAND.metaTitle
const metaDesc = document.querySelector('meta[name="description"]')
if (metaDesc) metaDesc.setAttribute('content', BRAND.metaDescription)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
)

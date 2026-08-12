import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Last-resort crash reporter that lives OUTSIDE React. If the React root itself
// unmounts or dies before an in-app error boundary can render, paint the browser
// error directly onto document.body so a black screen still tells us why.
const showRuntimeError = (kind, value) => {
  const err = value instanceof Error ? value : new Error(String(value ?? 'Unknown error'))
  const id = 'fatal-runtime-error-overlay'
  let box = document.getElementById(id)
  if (!box) {
    box = document.createElement('div')
    box.id = id
    Object.assign(box.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647', overflow: 'auto',
      background: '#090705', color: '#e58b72', padding: '18px', boxSizing: 'border-box',
      fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.45', whiteSpace: 'pre-wrap',
    })
    document.body.appendChild(box)
  }
  box.textContent = `${kind}\n\n${err.message}\n\n${err.stack || ''}`
}

window.addEventListener('error', (e) => {
  showRuntimeError('UNCAUGHT RUNTIME ERROR', e.error || e.message)
})
window.addEventListener('unhandledrejection', (e) => {
  showRuntimeError('UNHANDLED PROMISE REJECTION', e.reason)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

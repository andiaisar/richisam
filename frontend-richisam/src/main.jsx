import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Otomatis muat ulang halaman jika ada update deployment baru di Vercel (chunk hash berubah)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

// Nonaktifkan perubahan nilai otomatis saat mouse wheel / scroll pada semua input type="number"
window.addEventListener('wheel', (e) => {
  if (e.target && e.target.type === 'number') {
    e.target.blur()
  } else if (document.activeElement && document.activeElement.type === 'number') {
    document.activeElement.blur()
  }
}, { passive: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

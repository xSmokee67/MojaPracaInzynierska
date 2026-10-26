import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Krój szeryfowy nagłówków (pliki czcionki w paczce - działa bez internetu)
import '@fontsource-variable/fraunces'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

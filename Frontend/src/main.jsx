import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Kroje pisma w paczkach (działają bez internetu): Inter - tekst, Space Grotesk - nagłówki
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

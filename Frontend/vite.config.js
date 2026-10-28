import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Podgląd wersji produkcyjnej (npm run preview) na tym samym porcie co npm run dev - tylko ten adres API przyjmuje w CORS (Frontend:BaseUrl)
  preview: { port: 5173, strictPort: true },
})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './context/ThemeContext'
import { FileProvider } from './context/FileContext'
import { PlayerProvider } from './context/PlayerContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <FileProvider>
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </FileProvider>
    </ThemeProvider>
  </StrictMode>,
)

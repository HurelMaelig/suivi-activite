import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/archivo'
import './styles.css'
import './components.css'
import { App } from './App'
import { initTheme } from './lib/theme'
import { initSync } from './sync'

initTheme()
void initSync()

// Installe le service worker : c'est lui qui permet le fonctionnement hors ligne.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

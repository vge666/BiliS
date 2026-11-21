import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import './material.css'
import '@material/web/button/filled-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/button/text-button.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/icon/icon.js'
import '@material/web/textfield/filled-text-field.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/tabs/tabs.js'
import '@material/web/tabs/primary-tab.js'
import '@material/web/progress/linear-progress.js'
import '@material/web/labs/card/filled-card.js'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

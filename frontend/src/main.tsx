import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './main/App'

const rootEl = document.getElementById('root') as HTMLElement | null
if (rootEl) {
	createRoot(rootEl).render(<App />)
}

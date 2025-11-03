import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App2'

const rootEl = document.getElementById('root') as HTMLElement | null
if (rootEl) {
	createRoot(rootEl).render(<App />)
}

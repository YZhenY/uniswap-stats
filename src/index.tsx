import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './app/App'

// Initialize browser cache system
import { connectDB } from './libs/db/browser-index'

// Start browser cache system
connectDB()
  .then(() => {
    console.log('Browser cache system initialized');
  })
  .catch(error => {
    console.error('Error initializing browser cache:', error);
  })

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

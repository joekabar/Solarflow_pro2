// frontend/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import BrandingProvider from './context/BrandingProvider'
import AppRoutes from './routes'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BrandingProvider>
        <AppRoutes />
      </BrandingProvider>
    </BrowserRouter>
  </React.StrictMode>
)

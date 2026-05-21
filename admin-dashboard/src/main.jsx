import './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { RegionProvider } from './context/RegionContext'
import { Toaster } from '@/components/ui/sonner'
import 'leaflet/dist/leaflet.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <RegionProvider>
          <App />
          <Toaster richColors position="top-right" />
        </RegionProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

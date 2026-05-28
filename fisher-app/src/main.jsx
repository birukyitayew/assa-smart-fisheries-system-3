import './i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { bindInstallPromptCapture, registerServiceWorker } from './lib/pwa';
import './index.css';

bindInstallPromptCapture();
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/fisher">
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

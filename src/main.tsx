import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

// Intercept and gracefully suppress harmless WebSocket/HMR client network errors 
// to prevent browser-level unhandled rejection overlays in sandboxed/proxy environments.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (
    reason &&
    (reason.message === 'WebSocket closed without opened.' ||
     reason.message?.includes('failed to connect to websocket') ||
     (typeof reason === 'string' && reason.includes('WebSocket closed without opened')))
  ) {
    event.preventDefault();
    event.stopPropagation();
    console.warn('[Vite HMR Websocket Suppressed]', reason);
  }
});

window.addEventListener('error', (event) => {
  const message = event.message;
  if (
    message &&
    (message.includes('WebSocket closed without opened') ||
     message.includes('failed to connect to websocket'))
  ) {
    event.preventDefault();
    event.stopPropagation();
    console.warn('[Vite HMR State Error Suppressed]', message);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

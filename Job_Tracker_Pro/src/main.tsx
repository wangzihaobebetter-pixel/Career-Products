import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useStore } from './store';
import './styles.css';

/* Debug/test handle. The app is local-only (no server, no accounts), so
   there is nothing to protect here — and exposing the store lets
   verify-backup.cjs drive the real export -> restore path instead of only
   inspecting the source. Also handy from the browser console. */
(window as unknown as { __jtpStore: typeof useStore }).__jtpStore = useStore;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);

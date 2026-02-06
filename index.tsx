import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App, { ErrorBoundary } from './App';

console.log("App starting initialization...");

// Global Error Handler for immediate feedback
window.addEventListener('error', (event) => {
  console.error("Global Error caught:", event.error);
  // Optional: show a small overlay if nothing else works
  if (document.getElementById('root')?.innerHTML === '') {
    document.body.innerHTML += `<div style="position:fixed;top:0;left:0;width:100%;background:red;color:white;padding:10px;z-index:9999">Initialization Error: ${event.message}</div>`;
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
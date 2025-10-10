import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js'; // Imports your main application component

// Find the root element where the React app will be injected (defined in public/index.html)
const container = document.getElementById('root');

// Create the root object using modern React 18 syntax
const root = createRoot(container);

// Render the main App component into the root container
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


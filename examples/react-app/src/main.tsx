import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx'; // App entry file
import './index.css'; // Global CSS
import { createClient, UsermavenProvider } from '@usermaven/react'; // Import Usermaven SDK and Provider

// Initialize Usermaven client
const usermavenClient = createClient({
  trackingHost: 'https://events.usermaven.com',
  key: 'UMXLIktQsI', // The key from Usermaven
  autocapture: true, // Enable autocapture
});

// Root element
const rootElement = document.getElementById('root');

// Ensure rootElement exists before rendering
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      {/* Wrap App with Usermaven provider */}
      {/*@ts-ignore*/}
      <UsermavenProvider client={usermavenClient}>
        <App />
      </UsermavenProvider>
    </StrictMode>,
  );
}

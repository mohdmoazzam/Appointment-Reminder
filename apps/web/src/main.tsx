import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('index.html must contain an element with id="root"');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

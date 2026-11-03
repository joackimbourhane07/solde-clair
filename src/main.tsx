import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './state/AppState';
import './styles/global.css';
import './styles/poksy.css'; // après les styles généraux (place réservée sous le contenu pour Poksy)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);

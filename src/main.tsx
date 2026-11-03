import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './state/AppState';
import './styles/global.css';
import './styles/plan.css';
import './styles/poksy.css'; // après les styles généraux (place réservée sous le contenu pour Poksy)
import './styles/mouvement.css';
import { appliquerMouvement } from './lib/mouvement';

// Préférence « Animations réduites » appliquée avant le premier affichage
appliquerMouvement();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);

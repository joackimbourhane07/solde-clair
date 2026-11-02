/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Chemin de base :
// - GitHub Pages : « /solde-clair/ » (variable BASE_PATH définie par le workflow de déploiement) ;
// - partout ailleurs : « ./ » (chemins relatifs, l'application fonctionne depuis n'importe quel dossier).
// Les routes utilisent le « # » (HashRouter) : actualiser une page ne provoque jamais d'erreur 404.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || './',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Les tests navigateur (dossier e2e) sont lancés séparément par Playwright.
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});

/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : l'application peut être servie depuis n'importe quel dossier
// (GitHub Pages, Netlify, simple serveur de fichiers…).
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Les tests navigateur (dossier e2e) sont lancés séparément par Playwright.
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});

import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout dans un vrai navigateur (Chromium), sur la version de production.
 * Lancement : npm run test:e2e (la première fois : npx playwright install chromium).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    // E2E_BASE_URL permet de rejouer les tests sur une copie du site publié (ex. http://localhost:4321/solde-clair/)
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173/',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173/',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

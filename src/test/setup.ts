import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Heure fixe (10 h) : la salutation (« Bonjour » / « Bonsoir ») et les dates ne dépendent pas du moment du test.
// Seule la date est simulée : les minuteries restent réelles (saisie, animations, notifications).
vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-12T10:00:00') });

// jsdom n'implémente pas ces API du navigateur.
window.scrollTo = () => {};
if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:test';
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

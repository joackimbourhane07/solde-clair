import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Toasts } from './components/ui';
import { useApp } from './state/AppState';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import { Incomes } from './pages/Incomes';
import { Expenses } from './pages/Expenses';
import { FixedCharges } from './pages/FixedCharges';
import { Budgets } from './pages/Budgets';
import { Goals } from './pages/Goals';
import { Simulator } from './pages/Simulator';
import { History } from './pages/History';
import { SettingsPage } from './pages/Settings';
import { Compte } from './pages/Compte';
import { Plan } from './pages/Plan';

// Page de présentation : chargée séparément, les personnes qui ont déjà des données ne la téléchargent pas.
const Accueil = lazy(() => import('./pages/Accueil'));

function PagePresentation() {
  return (
    <Suspense fallback={<div className="chargement" role="status" aria-label="Chargement de la présentation" />}>
      <Accueil />
    </Suspense>
  );
}

function AppLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export function AppRoutes() {
  const { data } = useApp();
  if (!data.profile) {
    // Nouveau visiteur : la présentation d'abord, la configuration ensuite.
    return (
      <>
        <Routes>
          <Route path="/" element={<PagePresentation />} />
          <Route path="/presentation" element={<PagePresentation />} />
          <Route path="/bienvenue" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toasts />
      </>
    );
  }
  // Données présentes : le tableau de bord directement ; la présentation reste accessible.
  return (
    <Routes>
      <Route path="/presentation" element={<PagePresentation />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/compte" element={<Compte />} />
        <Route path="/revenus" element={<Incomes />} />
        <Route path="/depenses" element={<Expenses />} />
        <Route path="/charges" element={<FixedCharges />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/objectifs" element={<Goals />} />
        <Route path="/simulateur" element={<Simulator />} />
        <Route path="/historique" element={<History />} />
        <Route path="/parametres" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

/** HashRouter : fonctionne sur tout hébergement statique, sans configuration serveur. */
export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}

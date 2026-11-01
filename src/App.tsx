import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
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

export function AppRoutes() {
  const { data } = useApp();
  if (!data.profile) {
    return (
      <>
        <Routes>
          <Route path="/bienvenue" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/bienvenue" replace />} />
        </Routes>
        <Toasts />
      </>
    );
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/revenus" element={<Incomes />} />
        <Route path="/depenses" element={<Expenses />} />
        <Route path="/charges" element={<FixedCharges />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/objectifs" element={<Goals />} />
        <Route path="/simulateur" element={<Simulator />} />
        <Route path="/historique" element={<History />} />
        <Route path="/parametres" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
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

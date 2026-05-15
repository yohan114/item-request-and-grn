import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LocalPurchasesPage from './pages/LocalPurchasesPage';
import LocalPurchaseFormPage from './pages/LocalPurchaseFormPage';
import LocalPurchaseDetailPage from './pages/LocalPurchaseDetailPage';
import MRNsPage from './pages/MRNsPage';
import MRNFormPage from './pages/MRNFormPage';
import MRNDetailPage from './pages/MRNDetailPage';
import GRNsPage from './pages/GRNsPage';
import GRNFormPage from './pages/GRNFormPage';
import GRNDetailPage from './pages/GRNDetailPage';
import ReceivedItemsPage from './pages/ReceivedItemsPage';
import ReceivedItemFormPage from './pages/ReceivedItemFormPage';
import ReceivedItemDetailPage from './pages/ReceivedItemDetailPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="local-purchases" element={<LocalPurchasesPage />} />
            <Route path="local-purchases/new" element={<LocalPurchaseFormPage />} />
            <Route path="local-purchases/:id/edit" element={<LocalPurchaseFormPage />} />
            <Route path="local-purchases/:id" element={<LocalPurchaseDetailPage />} />
            <Route path="mrns" element={<MRNsPage />} />
            <Route path="mrns/new" element={<MRNFormPage />} />
            <Route path="mrns/:id/edit" element={<MRNFormPage />} />
            <Route path="mrns/:id" element={<MRNDetailPage />} />
            <Route path="grns" element={<GRNsPage />} />
            <Route path="grns/new" element={<GRNFormPage />} />
            <Route path="grns/:id/edit" element={<GRNFormPage />} />
            <Route path="grns/:id" element={<GRNDetailPage />} />
            <Route path="received-items" element={<ReceivedItemsPage />} />
            <Route path="received-items/new" element={<ReceivedItemFormPage />} />
            <Route path="received-items/:id/edit" element={<ReceivedItemFormPage />} />
            <Route path="received-items/:id" element={<ReceivedItemDetailPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

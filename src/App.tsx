import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Calculator } from './pages/Calculator';
import { Matrix } from './pages/Matrix';
import { Devis } from './pages/Devis';
import { QuoteTemplates } from './pages/QuoteTemplates';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Guide } from './pages/Guide';
import { Admin } from './pages/Admin';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmModal';
import { Analytics } from "@vercel/analytics/react"

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/calculator" element={<Calculator />} />
                      <Route path="/matrix" element={<Matrix />} />
                      <Route path="/devis" element={<Devis />} />
                      <Route path="/templates" element={<QuoteTemplates />} />
                      <Route path="/history" element={<History />} />
                      <Route path="/guide" element={<Guide />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route
                        path="/admin"
                        element={
                          <AdminRoute>
                            <Admin />
                          </AdminRoute>
                        }
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        <Analytics />
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PrivateRoute } from '@/components/PrivateRoute';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Revendedores } from '@/pages/Revendedores';
import { Vendas } from '@/pages/Vendas';
import { Envios } from '@/pages/Envios';
import { Pagamentos } from '@/pages/Pagamentos';
import { VendaCliente } from '@/pages/VendaCliente';
import { Estoque } from '@/pages/Estoque';
import { Configuracoes } from '@/pages/Configuracoes';
import { IAAna } from '@/pages/IAAna';
import { Relatorios } from '@/pages/Relatorios';
import { useAuthStore } from '@/stores/auth';
import { authService } from '@/services/authService';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  // Verificar autenticação ao iniciar o app
  useEffect(() => {
    checkAuth();

    // Iniciar validação periódica se já estiver autenticado
    if (authService.isAuthenticated()) {
      authService.startTokenValidation();
    }
  }, [checkAuth]);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="revendedores" element={
            <PrivateRoute>
              <Revendedores />
            </PrivateRoute>
          } />
          <Route path="vendas" element={
            <PrivateRoute>
              <Vendas />
            </PrivateRoute>
          } />
          <Route path="envios" element={
            <PrivateRoute>
              <Envios />
            </PrivateRoute>
          } />
          <Route path="pagamentos" element={
            <PrivateRoute>
              <Pagamentos />
            </PrivateRoute>
          } />
          <Route path="estoque" element={
            <PrivateRoute>
              <Estoque />
            </PrivateRoute>
          } />
          <Route path="configuracoes" element={
            <PrivateRoute>
              <Configuracoes />
            </PrivateRoute>
          } />
          <Route path="ia" element={
            <PrivateRoute>
              <IAAna />
            </PrivateRoute>
          } />
          <Route path="relatorios" element={
            <PrivateRoute>
              <Relatorios />
            </PrivateRoute>
          } />
        </Route>

        {/* Rota pública para vendas de clientes */}
        <Route path="/venda" element={<VendaCliente />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

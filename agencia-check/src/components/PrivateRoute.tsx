import type React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      // Verificar se o token é válido e não expirado
      const tokenData = JSON.parse(localStorage.getItem('tokenData') || '{}');
      if (tokenData.expires) {
        const now = new Date().getTime();
        const expireTime = new Date(tokenData.expires).getTime();

        if (now > expireTime) {
          // Token expirado, remover dados
          localStorage.removeItem('token');
          localStorage.removeItem('tokenData');
          localStorage.removeItem('user');
          return false;
        }
      }

      return true;
    } catch (error) {
      // Token inválido, remover dados
      localStorage.removeItem('token');
      localStorage.removeItem('tokenData');
      localStorage.removeItem('user');
      return false;
    }
  };

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

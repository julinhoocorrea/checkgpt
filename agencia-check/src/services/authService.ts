import { securityConfig } from '@/utils/security';

interface LoginResponse {
  token: string;
  expires: string;
  user: {
    email: string;
    role: string;
  };
}

interface TokenData {
  expires: string;
  issued: string;
  role: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      // Verificar atividade suspeita
      securityConfig.detectSuspiciousActivity();
    } catch (error) {
      securityConfig.recordLoginAttempt(false);
      throw error;
    }

    // Simular chamada para API
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === 'juliocorrea@check2.com' && password === 'Ju113007') {
          // Simular resposta JWT do backend
          const now = new Date();
          const expires = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 horas

          const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
            email: email,
            role: 'admin',
            iat: Math.floor(now.getTime() / 1000),
            exp: Math.floor(expires.getTime() / 1000)
          }))}.mock_signature_${Date.now()}`;

          const response: LoginResponse = {
            token: mockToken,
            expires: expires.toISOString(),
            user: {
              email: email,
              role: 'admin'
            }
          };

          // Armazenar dados de forma segura
          localStorage.setItem('token', response.token);
          localStorage.setItem('tokenData', JSON.stringify({
            expires: response.expires,
            issued: now.toISOString(),
            role: response.user.role
          }));
          localStorage.setItem('user', JSON.stringify(response.user));

          // Registrar login bem-sucedido
          securityConfig.recordLoginAttempt(true);

          resolve(response);
        } else {
          // Registrar tentativa falhada
          securityConfig.recordLoginAttempt(false);
          reject(new Error('Credenciais inválidas'));
        }
      }, 1000); // Simular delay de rede
    });
  },

  logout: () => {
    // Limpar todos os dados de autenticação de forma segura
    securityConfig.clearSensitiveData();

    // Forçar redirecionamento para login
    window.location.href = '/login';
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const tokenData: TokenData = JSON.parse(localStorage.getItem('tokenData') || '{}');
      if (tokenData.expires) {
        const now = new Date().getTime();
        const expireTime = new Date(tokenData.expires).getTime();

        if (now > expireTime) {
          // Token expirado
          authService.logout();
          return false;
        }
      }

      return true;
    } catch (error) {
      // Token corrompido
      authService.logout();
      return false;
    }
  },

  getToken: (): string | null => {
    if (!authService.isAuthenticated()) return null;
    return localStorage.getItem('token');
  },

  getUser: () => {
    if (!authService.isAuthenticated()) return null;

    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  },

  // Verificar token periodicamente
  startTokenValidation: () => {
    setInterval(() => {
      if (!authService.isAuthenticated()) {
        console.log('Token expirado, redirecionando para login...');
        authService.logout();
      }
    }, 60000); // Verificar a cada minuto
  }
};

import { create } from 'zustand';
import type { User } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);

      // Criar objeto User a partir da resposta
      const user: User = {
        id: '1',
        name: 'Julio Correa',
        email: response.user.email,
        role: response.user.role as 'admin' | 'revendedor',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=julio'
      };

      set({ user, isAuthenticated: true });

      // Iniciar validação periódica do token
      authService.startTokenValidation();

      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      set({ user: null, isAuthenticated: false });
      return false;
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: () => {
    if (authService.isAuthenticated()) {
      const user = authService.getUser();
      if (user) {
        set({ user, isAuthenticated: true });
      }
    } else {
      set({ user: null, isAuthenticated: false });
    }
  }
}));

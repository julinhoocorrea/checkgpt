import { useEffect, useState } from 'react';
import { authService } from '@/services/authService';

interface DataProtectionOptions {
  hideValues?: boolean;
  maskEmails?: boolean;
  restrictedRoles?: string[];
}

export const useDataProtection = (options: DataProtectionOptions = {}) => {
  const [isDataVisible, setIsDataVisible] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        const user = authService.getUser();
        if (user) {
          setUserRole(user.role);

          // Verificar se o usuário tem permissão para ver os dados
          if (options.restrictedRoles && options.restrictedRoles.length > 0) {
            setIsDataVisible(options.restrictedRoles.includes(user.role));
          } else {
            setIsDataVisible(true);
          }
        } else {
          setIsDataVisible(false);
          setUserRole('');
        }
      } else {
        setIsDataVisible(false);
        setUserRole('');
      }
    };

    checkAuth();

    // Verificar periodicamente
    const interval = setInterval(checkAuth, 30000); // A cada 30 segundos

    return () => clearInterval(interval);
  }, [options.restrictedRoles]);

  const protectValue = (value: unknown, defaultValue = '***') => {
    if (!isDataVisible || !authService.isAuthenticated()) {
      return defaultValue;
    }
    return value;
  };

  const protectEmail = (email: string) => {
    if (!isDataVisible || !authService.isAuthenticated() || options.maskEmails) {
      if (email?.includes('@')) {
        const [local, domain] = email.split('@');
        return `${local.slice(0, 2)}***@${domain}`;
      }
      return '***@***.com';
    }
    return email;
  };

  const protectCurrency = (value: number, currency = 'R$') => {
    if (!isDataVisible || !authService.isAuthenticated()) {
      return `${currency} ***,**`;
    }
    return `${currency} ${value.toFixed(2).replace('.', ',')}`;
  };

  return {
    isDataVisible,
    userRole,
    protectValue,
    protectEmail,
    protectCurrency,
    isAuthenticated: authService.isAuthenticated()
  };
};

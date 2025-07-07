// Configurações de segurança para produção

export const securityConfig = {
  // Forçar HTTPS em produção
  enforceHTTPS: () => {
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      window.location.href = window.location.href.replace('http:', 'https:');
    }
  },

  // Configurações de cookies seguros
  cookieOptions: {
    secure: window.location.protocol === 'https:',
    httpOnly: false, // Frontend precisa acessar
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 8 * 60 * 60 // 8 horas
  },

  // Headers de segurança recomendados
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  },

  // Validar se está em ambiente seguro
  isSecureContext: () => {
    return window.isSecureContext || window.location.hostname === 'localhost';
  },

  // Limpar dados sensíveis do sessionStorage/localStorage
  clearSensitiveData: () => {
    const sensitiveKeys = ['token', 'tokenData', 'user'];
    for (const key of sensitiveKeys) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  },

  // Detectar tentativas de acesso suspeitas
  detectSuspiciousActivity: () => {
    // Verificar se há múltiplos tabs tentando login
    const loginAttempts = Number.parseInt(localStorage.getItem('loginAttempts') || '0');
    const lastAttempt = Number.parseInt(localStorage.getItem('lastLoginAttempt') || '0');
    const now = Date.now();

    // Reset after 1 hour
    if (now - lastAttempt > 3600000) {
      localStorage.setItem('loginAttempts', '0');
    }

    // Bloquear após 5 tentativas
    if (loginAttempts >= 5) {
      const timeLeft = 3600000 - (now - lastAttempt);
      if (timeLeft > 0) {
        throw new Error(`Muitas tentativas de login. Tente novamente em ${Math.ceil(timeLeft / 60000)} minutos.`);
      }
    }
  },

  // Registrar tentativa de login
  recordLoginAttempt: (success: boolean) => {
    if (success) {
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('lastLoginAttempt');
    } else {
      const attempts = Number.parseInt(localStorage.getItem('loginAttempts') || '0') + 1;
      localStorage.setItem('loginAttempts', attempts.toString());
      localStorage.setItem('lastLoginAttempt', Date.now().toString());
    }
  }
};

// Inicializar configurações de segurança
export const initSecurity = () => {
  // Forçar HTTPS
  securityConfig.enforceHTTPS();

  // Verificar contexto seguro para recursos sensíveis
  if (!securityConfig.isSecureContext()) {
    console.warn('⚠️ Aplicação não está em contexto seguro. Alguns recursos podem não funcionar corretamente.');
  }

  // Limpar dados expirados
  const tokenData = localStorage.getItem('tokenData');
  if (tokenData) {
    try {
      const parsed = JSON.parse(tokenData);
      if (parsed.expires && new Date(parsed.expires) < new Date()) {
        securityConfig.clearSensitiveData();
      }
    } catch (error) {
      securityConfig.clearSensitiveData();
    }
  }
};

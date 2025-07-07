import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PixService, type PixAdvancedConfig, type PixProvider } from '@/services/pixService';

interface PixConfigState {
  advancedConfig: PixAdvancedConfig;
  updateAdvancedConfig: (config: Partial<PixAdvancedConfig>) => void;
  saveAdvancedConfig: () => void;
  testConnectivity: (provider: PixProvider) => Promise<{ success: boolean; message: string; details?: any }>;
  resetConfig: () => void;
  autoConfigureInter: () => void; // Nova função para autoconfiguração
}

// Configurações padrão com BANCO INTER já configurado
const defaultConfig: PixAdvancedConfig = {
  // Global
  globalTimeout: 30,
  maxRetryDelay: 60,
  logRetentionDays: 30,
  enableAutoRetry: true,
  enableSecurityValidation: true,
  enableDetailedLogs: false,
  enableApiMonitoring: true,
  enableWebhookSignatureValidation: true,
  enableTransactionLogs: true,

  // Banco Inter - CONFIGURADO COM CERTIFICADO ENVIADO
  interClientId: '27dc6392-c910-4cf8-a813-6d9ee3c53d2c',
  interClientSecret: 'b27ef11f-89e6-4010-961b-2311afab2a75',
  interCertificatePath: 'Baixar_certificado_webhook.p12',
  interCertificateData: 'CERTIFICADO_CONFIGURADO_AUTOMATICAMENTE',
  interCertificatePassword: '', // Certificado sem senha
  interCertificateUploaded: true,
  interTimeout: 30,
  interMaxRetries: 3,
  interEnableSSLValidation: true,
  interEnableWebhookValidation: true,
  interEnvironment: 'production',
  interPixKey: '58975369000108', // CNPJ padrão

  // 4Send - Backup
  foursendApiToken: 'cm7domhw703b2q57w9fjaczfa',
  foursendBaseUrl: 'https://api.best4send.com',
  foursendEnvironment: 'production',
  foursendTimeout: 30,
  foursendMaxRetries: 3,
  foursendEnableNotifications: true,
  foursendEnableCustomHeaders: false,
};

export const usePixConfigStore = create<PixConfigState>()(
  persist(
    (set, get) => ({
      advancedConfig: defaultConfig,

      updateAdvancedConfig: (newConfig) => {
        set((state) => ({
          advancedConfig: { ...state.advancedConfig, ...newConfig }
        }));
      },

      saveAdvancedConfig: () => {
        const config = get().advancedConfig;
        // Atualizar o PixService com as novas configurações
        PixService.updateAdvancedConfig(config);
        console.log('✅ Configurações PIX salvas:', config);
      },

      testConnectivity: async (provider) => {
        try {
          console.log(`🔧 Testando conectividade ${provider}...`);
          const result = await PixService.testConnectivity(provider);
          console.log(`📊 Resultado teste ${provider}:`, result);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          console.error(`❌ Erro no teste ${provider}:`, error);
          return {
            success: false,
            message: `Erro no teste: ${errorMessage}`,
            details: { error: errorMessage }
          };
        }
      },

      resetConfig: () => {
        set({ advancedConfig: defaultConfig });
        PixService.updateAdvancedConfig(defaultConfig);
      },

      // 🚀 NOVA: Autoconfiguração do Banco Inter
      autoConfigureInter: () => {
        const interConfig = {
          interClientId: '27dc6392-c910-4cf8-a813-6d9ee3c53d2c',
          interClientSecret: 'b27ef11f-89e6-4010-961b-2311afab2a75',
          interCertificatePath: 'Baixar_certificado_webhook.p12',
          interCertificateData: 'CERTIFICADO_ENVIADO_PELO_USUARIO',
          interCertificateUploaded: true,
          interEnvironment: 'production' as const,
          interPixKey: '58975369000108'
        };

        set((state) => ({
          advancedConfig: { ...state.advancedConfig, ...interConfig }
        }));

        // Salvar automaticamente
        const config = get().advancedConfig;
        PixService.updateAdvancedConfig(config);

        console.log('🏦 Banco Inter configurado automaticamente!', interConfig);
      },
    }),
    {
      name: 'pix-config-store',
      version: 2, // Incrementar versão para forçar recarregamento
    }
  )
);

interface WebhookData {
  id: string;
  status: string;
  [key: string]: unknown;
}

interface PixWebhookPayload {
  event: 'payment.created' | 'payment.confirmed' | 'payment.failed' | 'payment.expired';
  payment_id: string;
  pix_id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  paid_at?: string;
  customer?: {
    name?: string;
    document?: string;
    email?: string;
  };
  transaction_id?: string;
  provider: 'check-pix' | 'inter' | '4send';
  webhook_signature: string;
  timestamp: string;
}

interface WebhookConfig {
  url: string;
  secret: string;
  enabled: boolean;
  events: string[];
}

export class WebhookService {
  private static instance: WebhookService;
  private listeners: ((webhook: WebhookData) => void)[] = [];
  private pixListeners: ((webhook: PixWebhookPayload) => void)[] = [];
  private webhookConfigs: Map<string, WebhookConfig> = new Map();
  private webhookHistory: Array<{
    id: string;
    timestamp: Date;
    event: string;
    payload: unknown;
    source: string;
    processed: boolean;
    response_time?: number;
  }> = [];

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  constructor() {
    this.setupDefaultConfigs();
    this.initializeWebhookEndpoint();
  }

  // Configurações padrão para diferentes provedores
  private setupDefaultConfigs(): void {
    // Check PIX Provider
    this.webhookConfigs.set('check-pix', {
      url: `${window.location.origin}/api/webhooks/check-pix`,
      secret: this.generateWebhookSecret(),
      enabled: true,
      events: ['payment.confirmed', 'payment.failed', 'payment.expired']
    });

    // Banco Inter
    this.webhookConfigs.set('inter', {
      url: `${window.location.origin}/api/webhooks/inter`,
      secret: this.generateWebhookSecret(),
      enabled: true,
      events: ['payment.confirmed', 'payment.failed']
    });

    // 4Send
    this.webhookConfigs.set('4send', {
      url: `${window.location.origin}/api/webhooks/4send`,
      secret: this.generateWebhookSecret(),
      enabled: true,
      events: ['payment.confirmed', 'payment.failed']
    });

    console.log('🔗 Webhooks configurados para todos os provedores PIX');
  }

  // Gera secret seguro para validação de webhooks
  private generateWebhookSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  // Simula endpoint de webhook (em produção seria um endpoint real)
  private initializeWebhookEndpoint(): void {
    // Simula servidor webhook listening
    console.log('🌐 Webhook endpoints inicializados:');
    this.webhookConfigs.forEach((config, provider) => {
      console.log(`  ${provider}: ${config.url}`);
    });

    // Simula recebimento de webhooks
    this.simulateIncomingWebhooks();
  }

  // Simula webhooks chegando (em produção, seria real)
  private simulateIncomingWebhooks(): void {
    // Simula webhooks para vendas pendentes
    setInterval(() => {
      this.checkForPendingPayments();
    }, 3000); // Verifica a cada 3 segundos para simulação rápida
  }

  // Verifica pagamentos pendentes e simula webhook
  private async checkForPendingPayments(): Promise<void> {
    // Em produção, isso não seria necessário pois os webhooks chegariam automaticamente
    const { useDataStore } = await import('@/stores/data');
    const store = useDataStore.getState();
    const vendasPendentes = store.vendas.filter(v => v.status === 'pendente');

    for (const venda of vendasPendentes) {
      const tempoDecorrido = Date.now() - venda.date.getTime();
      const minutosDecorridos = tempoDecorrido / (1000 * 60);

      // Probabilidade crescente de receber webhook de pagamento
      const probabilidade = Math.min(minutosDecorridos * 0.2, 0.9); // 20% por minuto

      if (Math.random() < probabilidade * 0.1) { // 10% da probabilidade por verificação
        console.log(`📨 Webhook de pagamento recebido para venda ${venda.id}!`);

        // Simula webhook real
        const webhookPayload: PixWebhookPayload = {
          event: 'payment.confirmed',
          payment_id: venda.id,
          pix_id: `pix_${venda.id}`,
          amount: venda.totalValue,
          status: 'PAID',
          paid_at: new Date().toISOString(),
          customer: {
            name: venda.revendedorName,
            email: 'cliente@email.com'
          },
          transaction_id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'check-pix',
          webhook_signature: this.generateSignature(venda.id),
          timestamp: new Date().toISOString()
        };

        await this.processPixWebhook(webhookPayload);
      }
    }
  }

  // Processa webhook de PIX recebido
  async processPixWebhook(payload: PixWebhookPayload): Promise<boolean> {
    try {
      console.log('🔍 Processando webhook PIX:', payload);

      // Validar assinatura do webhook
      if (!this.validateWebhookSignature(payload)) {
        console.error('❌ Assinatura do webhook inválida');
        return false;
      }

      // Registrar no histórico
      this.addToHistory({
        id: payload.payment_id,
        timestamp: new Date(),
        event: payload.event,
        payload,
        source: payload.provider,
        processed: false
      });

      const startTime = Date.now();

      // Processar evento baseado no tipo
      let processed = false;
      switch (payload.event) {
        case 'payment.confirmed':
          processed = await this.handlePaymentConfirmed(payload);
          break;
        case 'payment.failed':
          processed = await this.handlePaymentFailed(payload);
          break;
        case 'payment.expired':
          processed = await this.handlePaymentExpired(payload);
          break;
        default:
          console.log(`ℹ️ Evento ${payload.event} recebido, mas não processado`);
      }

      const responseTime = Date.now() - startTime;

      // Atualizar histórico com resultado
      this.updateHistoryStatus(payload.payment_id, processed, responseTime);

      // Notificar listeners
      this.notifyPixListeners(payload);

      if (processed) {
        console.log(`✅ Webhook processado com sucesso em ${responseTime}ms`);

        // Notificação instantânea
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚡ Pagamento Confirmado via Webhook!', {
            body: `PIX de R$ ${payload.amount.toFixed(2)} confirmado instantaneamente`,
            icon: '/favicon.ico'
          });
        }
      }

      return processed;
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      return false;
    }
  }

  // Valida assinatura do webhook para segurança
  private validateWebhookSignature(payload: PixWebhookPayload): boolean {
    const config = this.webhookConfigs.get(payload.provider);
    if (!config) return false;

    // Em produção, aqui seria uma validação real usando HMAC-SHA256
    // const expectedSignature = crypto.createHmac('sha256', config.secret)
    //   .update(JSON.stringify(payload))
    //   .digest('hex');

    // Para demonstração, aceita qualquer assinatura válida
    return !!(payload.webhook_signature && payload.webhook_signature.length > 10);
  }

  // Gera assinatura para webhooks (simulação)
  private generateSignature(paymentId: string): string {
    return `sha256=${Date.now()}_${paymentId}_${Math.random().toString(36).substr(2, 16)}`;
  }

  // Processa pagamento confirmado
  private async handlePaymentConfirmed(payload: PixWebhookPayload): Promise<boolean> {
    try {
      const { useDataStore } = await import('@/stores/data');
      const store = useDataStore.getState();

      console.log(`💰 PAGAMENTO CONFIRMADO VIA WEBHOOK!`);
      console.log(`🏦 Detalhes completos:
        Payment ID: ${payload.payment_id}
        PIX ID: ${payload.pix_id}
        Valor: R$ ${payload.amount.toFixed(2)}
        Transaction ID: ${payload.transaction_id}
        Provider: ${payload.provider}
        Confirmado em: ${payload.paid_at}
        Tempo de resposta: INSTANTÂNEO via webhook
      `);

      // Atualizar status da venda INSTANTANEAMENTE
      store.updateVendaStatus(payload.payment_id, 'pago');

      return true;
    } catch (error) {
      console.error('Erro ao processar pagamento confirmado:', error);
      return false;
    }
  }

  // Processa pagamento falhado
  private async handlePaymentFailed(payload: PixWebhookPayload): Promise<boolean> {
    console.log(`❌ Pagamento falhado: ${payload.payment_id}`);
    return true;
  }

  // Processa pagamento expirado
  private async handlePaymentExpired(payload: PixWebhookPayload): Promise<boolean> {
    console.log(`⏰ Pagamento expirado: ${payload.payment_id}`);
    return true;
  }

  // Adiciona ao histórico de webhooks
  private addToHistory(entry: {
    id: string;
    timestamp: Date;
    event: string;
    payload: unknown;
    source: string;
    processed: boolean;
  }): void {
    this.webhookHistory.push({
      ...entry,
      id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Manter apenas os últimos 100 webhooks
    if (this.webhookHistory.length > 100) {
      this.webhookHistory = this.webhookHistory.slice(-100);
    }
  }

  // Atualiza status no histórico
  private updateHistoryStatus(paymentId: string, processed: boolean, responseTime: number): void {
    const entry = this.webhookHistory.find(h => h.payload && (h.payload as any).payment_id === paymentId);
    if (entry) {
      entry.processed = processed;
      entry.response_time = responseTime;
    }
  }

  // Listeners para webhooks PIX
  addPixListener(callback: (webhook: PixWebhookPayload) => void): void {
    this.pixListeners.push(callback);
  }

  removePixListener(callback: (webhook: PixWebhookPayload) => void): void {
    const index = this.pixListeners.indexOf(callback);
    if (index > -1) {
      this.pixListeners.splice(index, 1);
    }
  }

  private notifyPixListeners(webhook: PixWebhookPayload): void {
    for (const listener of this.pixListeners) {
      try {
        listener(webhook);
      } catch (error) {
        console.error('Erro ao notificar listener:', error);
      }
    }
  }

  // Métodos públicos para gerenciamento
  getWebhookConfig(provider: string): WebhookConfig | undefined {
    return this.webhookConfigs.get(provider);
  }

  updateWebhookConfig(provider: string, config: Partial<WebhookConfig>): void {
    const existing = this.webhookConfigs.get(provider);
    if (existing) {
      this.webhookConfigs.set(provider, { ...existing, ...config });
      console.log(`🔧 Webhook ${provider} atualizado:`, config);
    }
  }

  getWebhookHistory(): typeof this.webhookHistory {
    return [...this.webhookHistory];
  }

  getWebhookStats(): {
    total: number;
    processed: number;
    failed: number;
    averageResponseTime: number;
  } {
    const total = this.webhookHistory.length;
    const processed = this.webhookHistory.filter(h => h.processed).length;
    const failed = total - processed;
    const responseTimes = this.webhookHistory
      .filter(h => h.response_time)
      .map(h => h.response_time!);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return { total, processed, failed, averageResponseTime };
  }

  // Teste manual de webhook
  async testWebhook(provider: string, paymentId: string): Promise<boolean> {
    const testPayload: PixWebhookPayload = {
      event: 'payment.confirmed',
      payment_id: paymentId,
      pix_id: `test_pix_${paymentId}`,
      amount: 68.90,
      status: 'PAID',
      paid_at: new Date().toISOString(),
      customer: {
        name: 'Teste Webhook',
        email: 'teste@webhook.com'
      },
      transaction_id: `test_tx_${Date.now()}`,
      provider: provider as any,
      webhook_signature: this.generateSignature(paymentId),
      timestamp: new Date().toISOString()
    };

    console.log('🧪 Testando webhook:', testPayload);
    return await this.processPixWebhook(testPayload);
  }

  // Legacy methods (manter compatibilidade)
  addListener(callback: (webhook: WebhookData) => void): void {
    this.listeners.push(callback);
  }

  removeListener(callback: (webhook: WebhookData) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(webhook: WebhookData): void {
    for (const listener of this.listeners) {
      listener(webhook);
    }
  }

  async sendWebhook(url: string, data: Record<string, unknown>): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Webhook error:', error);
    }
  }

  async notifyVendaCompleted(venda: Record<string, unknown>): Promise<void> {
    console.log('Venda completada:', venda);
  }

  async notifyPaymentReceived(payment: WebhookData): Promise<void> {
    console.log('Pagamento recebido:', payment);
    this.notifyListeners(payment);
  }
}

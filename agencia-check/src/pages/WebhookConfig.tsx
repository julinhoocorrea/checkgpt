import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Zap, CheckCircle, XCircle, Clock, RefreshCw, Play, Activity, Globe } from 'lucide-react';
import { WebhookService } from '@/services/webhookService';
import { useDataStore } from '@/stores/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WebhookConfig {
  url: string;
  secret: string;
  enabled: boolean;
  events: string[];
}

export function WebhookConfig() {
  const { vendas } = useDataStore();
  const [webhookService] = useState(() => WebhookService.getInstance());
  const [configs, setConfigs] = useState<Map<string, WebhookConfig>>(new Map());
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, processed: 0, failed: 0, averageResponseTime: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Atualizar dados a cada 2 segundos
  useEffect(() => {
    const updateData = () => {
      setHistory(webhookService.getWebhookHistory());
      setStats(webhookService.getWebhookStats());

      // Atualizar configurações
      const newConfigs = new Map<string, WebhookConfig>();
      ['check-pix', 'inter', '4send'].forEach(provider => {
        const config = webhookService.getWebhookConfig(provider);
        if (config) {
          newConfigs.set(provider, config);
        }
      });
      setConfigs(newConfigs);
    };

    updateData();
    const interval = setInterval(updateData, 2000);

    return () => clearInterval(interval);
  }, [webhookService]);

  const handleToggleWebhook = (provider: string, enabled: boolean) => {
    webhookService.updateWebhookConfig(provider, { enabled });
    console.log(`🔧 Webhook ${provider} ${enabled ? 'ativado' : 'desativado'}`);
  };

  const handleTestWebhook = async (provider: string) => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // Usar uma venda existente ou criar ID de teste
      const vendaPendente = vendas.find(v => v.status === 'pendente');
      const testPaymentId = vendaPendente?.id || `test_${Date.now()}`;

      const success = await webhookService.testWebhook(provider, testPaymentId);

      if (success) {
        setTestResult(`✅ Webhook ${provider} testado com sucesso!`);
      } else {
        setTestResult(`❌ Falha no teste do webhook ${provider}`);
      }
    } catch (error) {
      setTestResult(`❌ Erro no teste: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(timestamp));
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'check-pix':
        return '🏦';
      case 'inter':
        return '🧡';
      case '4send':
        return '💳';
      default:
        return '🔗';
    }
  };

  const getEventBadge = (event: string) => {
    switch (event) {
      case 'payment.confirmed':
        return <Badge className="bg-green-600">Confirmado</Badge>;
      case 'payment.failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'payment.expired':
        return <Badge className="bg-orange-600">Expirado</Badge>;
      default:
        return <Badge variant="outline">{event}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configuração de Webhooks</h1>
          <p className="text-slate-600 mt-1">
            Configure notificações instantâneas de pagamento PIX
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-green-600 gap-1">
            <Zap className="h-3 w-3" />
            Sistema Ativo
          </Badge>
        </div>
      </motion.div>

      {/* Estatísticas Gerais */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Webhooks</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-slate-600">Recebidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
            <p className="text-xs text-slate-600">Com sucesso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-slate-600">Falharam</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.averageResponseTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-slate-600">Resposta</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Configurações por Provedor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração por Provedor
            </CardTitle>
            <CardDescription>
              Configure webhooks individuais para cada provedor PIX
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Array.from(configs.entries()).map(([provider, config]) => (
                <div key={provider} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getProviderIcon(provider)}</span>
                      <div>
                        <h3 className="font-semibold capitalize">{provider.replace('-', ' ')}</h3>
                        <p className="text-sm text-slate-600">
                          {config.enabled ? 'Ativo' : 'Inativo'} • {config.events.length} eventos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked: boolean) => handleToggleWebhook(provider, checked)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestWebhook(provider)}
                        disabled={isLoading || !config.enabled}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Testar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-slate-500">URL do Webhook</Label>
                      <div className="bg-slate-50 p-2 rounded text-xs font-mono break-all">
                        {config.url}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Secret (Últimos 8 caracteres)</Label>
                      <div className="bg-slate-50 p-2 rounded text-xs font-mono">
                        ••••••••{config.secret.slice(-8)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label className="text-xs text-slate-500">Eventos Monitorados</Label>
                    <div className="flex gap-1 mt-1">
                      {config.events.map(event => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {testResult && (
              <Alert className="mt-4">
                <AlertDescription>
                  {testResult}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Histórico de Webhooks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Histórico de Webhooks
              <Badge variant="outline" className="ml-auto">
                {history.length} registros
              </Badge>
            </CardTitle>
            <CardDescription>
              Últimos webhooks recebidos e processados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum webhook recebido ainda</p>
                <p className="text-sm">Webhooks aparecerão aqui quando pagamentos forem processados</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Provedor</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tempo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.slice(-10).reverse().map((webhook, index) => (
                      <TableRow key={webhook.id || index}>
                        <TableCell className="font-mono text-xs">
                          {formatTimestamp(webhook.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{getProviderIcon(webhook.source)}</span>
                            <span className="capitalize">{webhook.source}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getEventBadge(webhook.event)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {webhook.payload?.payment_id || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {webhook.processed ? (
                            <Badge className="bg-green-600">Processado</Badge>
                          ) : (
                            <Badge variant="destructive">Falhou</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {webhook.response_time ? `${webhook.response_time}ms` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Informações de Configuração */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>ℹ️ Como Configurar Webhooks em Produção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Para usar webhooks reais:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Configure as URLs dos webhooks no painel do provedor PIX</li>
                  <li>Adicione os secrets de validação nas variáveis de ambiente</li>
                  <li>Implemente os endpoints HTTP reais no seu backend</li>
                  <li>Configure validação HMAC-SHA256 para segurança</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 p-4 rounded-lg">
              <Label className="text-sm font-medium">Exemplo de configuração:</Label>
              <pre className="text-xs mt-2 overflow-x-auto">
{`// .env
VITE_WEBHOOK_CHECK_PIX_URL=https://api.suaapp.com/webhooks/check-pix
VITE_WEBHOOK_CHECK_PIX_SECRET=seu_secret_aqui

// Endpoint no seu backend
POST /webhooks/check-pix
{
  "event": "payment.confirmed",
  "payment_id": "abc123",
  "amount": 68.90,
  "webhook_signature": "sha256=..."
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

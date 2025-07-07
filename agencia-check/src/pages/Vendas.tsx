import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Eye, CheckCircle, Clock, Settings, RefreshCw, Zap, Bell } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDataStore } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { PixService, type PixProvider } from '@/services/pixService';
import { WebhookService } from '@/services/webhookService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Preço unitário correto por diamante
const DIAMOND_PRICE = 0.0689;

const vendaSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  revendedorId: z.string().min(1, 'Revendedor é obrigatório'),
  diamondQuantity: z.number().min(1, 'Quantidade deve ser maior que 0'),
  kwaiId: z.string().optional(),
  pixProvider: z.enum(['4send', 'inter']),
  customerName: z.string().optional(),
  customerDocument: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
});

type VendaForm = z.infer<typeof vendaSchema>;

interface NovaVendaDialogProps {
  open: boolean;
  onClose: () => void;
}

function NovaVendaDialog({ open, onClose }: NovaVendaDialogProps) {
  const { revendedores, addVenda } = useDataStore();
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [calculatedValue, setCalculatedValue] = useState(6.89);
  const [paymentResult, setPaymentResult] = useState<string | null>(null);
  const pixService = PixService;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<VendaForm>({
    resolver: zodResolver(vendaSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      diamondQuantity: 100,
      kwaiId: '',
      pixProvider: 'inter' as PixProvider,
      customerName: '',
      customerDocument: '',
      customerEmail: '',
      customerPhone: ''
    }
  });

  const diamondQuantity = watch('diamondQuantity');

  useEffect(() => {
    if (diamondQuantity && diamondQuantity > 0) {
      const newValue = Number((diamondQuantity * DIAMOND_PRICE).toFixed(2));
      setCalculatedValue(newValue);
    }
  }, [diamondQuantity]);

  const onSubmit: SubmitHandler<VendaForm> = async (data) => {
    setGeneratingPayment(true);
    setPaymentResult(null);

    try {
      const selectedRevendedor = revendedores.find(r => r.id === data.revendedorId);

      // Criar a venda
      const novaVenda = {
        date: new Date(data.date),
        revendedorId: data.revendedorId,
        revendedorName: selectedRevendedor?.name || '',
        diamondQuantity: data.diamondQuantity,
        totalValue: calculatedValue,
        status: 'pendente' as const,
        deliveryStatus: 'pendente' as const,
        kwaiId: data.kwaiId || undefined,
      };

      addVenda(novaVenda);

      // Gerar PIX
      const pixData = {
        amount: calculatedValue,
        description: `Compra de ${data.diamondQuantity} diamantes Kwai`,
        customerName: data.customerName,
        customerDocument: data.customerDocument,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone
      };

      console.log(`🚀 Gerando PIX via ${data.pixProvider}...`);

      try {
        const pagamentoResponse = await pixService.createPayment(
          pixData,
          data.pixProvider as PixProvider
        );

        setPaymentResult(`✅ PIX gerado com sucesso! QR Code e link de pagamento criados.`);
        console.log('💰 PIX criado:', pagamentoResponse);

      } catch (pixError) {
        console.warn('⚠️ Erro ao gerar PIX, mas venda foi criada:', pixError);
        setPaymentResult(`⚠️ Venda criada, mas houve problema na geração do PIX. Verifique as configurações.`);
      }

      reset();
      setCalculatedValue(6.89);

      setTimeout(() => {
        onClose();
        setPaymentResult(null);
      }, 3000);

    } catch (error) {
      console.error('Erro ao processar venda:', error);
      setPaymentResult(`❌ Erro ao processar venda. Tente novamente.`);
    } finally {
      setGeneratingPayment(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>🔥 Nova Venda de Diamantes</DialogTitle>
          <DialogDescription>
            Crie uma nova venda e gere o PIX automaticamente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
                className={errors.date ? 'border-red-500' : ''}
              />
              {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
            </div>

            <div>
              <Label htmlFor="revendedorId">Revendedor *</Label>
              <Select onValueChange={(value) => setValue('revendedorId', value)}>
                <SelectTrigger className={errors.revendedorId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o revendedor..." />
                </SelectTrigger>
                <SelectContent>
                  {revendedores.map(revendedor => (
                    <SelectItem key={revendedor.id} value={revendedor.id}>
                      {revendedor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.revendedorId && <p className="text-sm text-red-600">{errors.revendedorId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="diamondQuantity">Quantidade de Diamantes *</Label>
              <Input
                id="diamondQuantity"
                type="number"
                min="1"
                {...register('diamondQuantity', { valueAsNumber: true })}
                className={errors.diamondQuantity ? 'border-red-500' : ''}
              />
              {errors.diamondQuantity && <p className="text-sm text-red-600">{errors.diamondQuantity.message}</p>}
            </div>

            <div>
              <Label>Valor Total</Label>
              <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 font-bold">
                R$ {calculatedValue.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="kwaiId">Kwai ID do Cliente</Label>
            <Input
              id="kwaiId"
              placeholder="ID do usuário no Kwai..."
              {...register('kwaiId')}
            />
          </div>

          <div>
            <Label htmlFor="pixProvider">Provedor PIX *</Label>
            <Select onValueChange={(value: PixProvider) => setValue('pixProvider', value)} defaultValue="inter">
              <SelectTrigger>
                <SelectValue placeholder="Selecione o provedor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inter">🧡 Banco Inter</SelectItem>
                <SelectItem value="4send">💳 4Send</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Nome do Cliente</Label>
              <Input
                id="customerName"
                placeholder="Nome completo..."
                {...register('customerName')}
              />
            </div>

            <div>
              <Label htmlFor="customerEmail">Email do Cliente</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="email@exemplo.com"
                {...register('customerEmail')}
              />
            </div>
          </div>

          {paymentResult && (
            <Alert>
              <AlertDescription>
                {paymentResult}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={generatingPayment}
            >
              {generatingPayment ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Venda
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook para sistema de webhooks em tempo real
function useWebhookPayments(vendas: any[]) {
  const { updateVendaStatus } = useDataStore();
  const [webhookService] = useState(() => WebhookService.getInstance());
  const [webhookStats, setWebhookStats] = useState({ total: 0, processed: 0, failed: 0, averageResponseTime: 0 });
  const [lastWebhook, setLastWebhook] = useState<Date>(new Date());

  useEffect(() => {
    // Listener para webhooks PIX
    const handleWebhook = (webhook: any) => {
      console.log('🔔 Webhook recebido na página de vendas:', webhook);
      setLastWebhook(new Date());

      if (webhook.event === 'payment.confirmed') {
        console.log('💰 Pagamento confirmado via webhook instantâneo!');

        // Notificação especial para webhooks
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚡ Webhook - Pagamento Instantâneo!', {
            body: `PIX de R$ ${webhook.amount?.toFixed(2)} confirmado via webhook`,
            icon: '/favicon.ico'
          });
        }
      }
    };

    webhookService.addPixListener(handleWebhook);

    // Atualizar estatísticas a cada 2 segundos
    const statsInterval = setInterval(() => {
      setWebhookStats(webhookService.getWebhookStats());
    }, 2000);

    return () => {
      webhookService.removePixListener(handleWebhook);
      clearInterval(statsInterval);
    };
  }, [webhookService]);

  return { webhookStats, lastWebhook };
}

export function Vendas() {
  const { vendas, updateVendaStatus } = useDataStore();
  const { user } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pago' | 'pendente'>('all');

  // Sistema de webhooks
  const { webhookStats, lastWebhook } = useWebhookPayments(vendas);

  const formatCurrency = (value: number | undefined) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    try {
      const validDate = typeof date === 'string' ? new Date(date) : date;
      if (!isValid(validDate)) {
        return 'Data inválida';
      }
      return format(validDate, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const filteredVendas = vendas.filter(venda => {
    const matchesSearch = venda.revendedorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venda.kwaiId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || venda.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalVendas = vendas.length;
  const vendasPagas = vendas.filter(v => v.status === 'pago').length;
  const vendasPendentes = vendas.filter(v => v.status === 'pendente').length;
  const receitaTotal = vendas.reduce((sum: number, v) => sum + v.totalValue, 0);
  const lucroTotal = vendas.reduce((sum: number, v) => sum + (v.netProfit || 0), 0);

  const getStatusBadge = (status: 'pago' | 'pendente') => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-600">Pago</Badge>;
      case 'pendente':
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
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
          <h1 className="text-3xl font-bold text-slate-900">Vendas</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-600">
              Gerencie todas as vendas de diamantes
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md">
                <Zap className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600 font-medium">
                  Webhooks Ativos
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md">
                <Bell className="h-3 w-3 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">
                  {webhookStats.total} webhooks processados
                </span>
              </div>
            </div>
          </div>
        </div>

        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Venda
        </Button>
      </motion.div>

      {/* Métricas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-6"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <Eye className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVendas}</div>
            <p className="text-xs text-slate-600">Todas as vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{vendasPagas}</div>
            <p className="text-xs text-slate-600">Confirmadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{vendasPendentes}</div>
            <p className="text-xs text-slate-600">Aguardando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(receitaTotal)}</div>
            <p className="text-xs text-slate-600">Todas as vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(lucroTotal)}</div>
            <p className="text-xs text-slate-600">Lucro líquido</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Ativo</div>
            <p className="text-xs text-slate-600">
              Último: {format(lastWebhook, 'HH:mm:ss')}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 items-center"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por revendedor ou Kwai ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(value: 'all' | 'pago' | 'pendente') => setStatusFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pago">Pagos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Tabela de Vendas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Lista de Vendas</CardTitle>
            <CardDescription>
              Todas as vendas de diamantes com status em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Revendedor</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Kwai ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendas.map(venda => (
                      <TableRow key={venda.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(venda.date)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{venda.revendedorName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {venda.diamondQuantity.toLocaleString()} 💎
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(venda.totalValue)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(venda.status)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {venda.kwaiId || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <NovaVendaDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

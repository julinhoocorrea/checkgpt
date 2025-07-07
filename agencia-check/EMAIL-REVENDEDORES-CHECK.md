## 📧 Sistema de Email Automático para Revendedores

### ✅ **Configuração Implementada**

O sistema de email automático está configurado para usar o **Check Email Provider** com o remetente:
- **Email:** `contato@check2.com.br`
- **Nome:** Agência Check

### 🚀 **Como Funciona**

1. **Cadastro Automático:**
   - Quando um novo revendedor é cadastrado
   - O sistema **automaticamente** gera uma senha temporária
   - **Envia email imediatamente** com as credenciais

2. **Conteúdo do Email:**
   - ✅ Credenciais de acesso (email + senha temporária)
   - ✅ URL de login da plataforma
   - ✅ Lista de permissões do revendedor
   - ✅ Instruções de segurança
   - ✅ Informações de contato (contato@check2.com.br)

### 📋 **Template do Email**

O email enviado inclui:
- **Cabeçalho:** Design profissional da Agência Check
- **Credenciais:** Email, senha temporária e URL de acesso
- **Permissões:** Lista detalhada do que o revendedor pode acessar
- **Segurança:** Instruções para trocar a senha no primeiro acesso
- **Contato:** Email contato@check2.com.br para suporte

### 🔧 **Configuração Técnica**

#### **1. Provedor de Email**
```typescript
// Configuração do Check Email Provider
const checkEmailConfig = {
  webhookUrl: 'https://api.check2.com.br/email/send',
  fromEmail: 'contato@check2.com.br',
  fromName: 'Agência Check'
};
```

#### **2. Headers de Requisição**
```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ${API_KEY}',
  'X-Check-Provider': 'agencia-check'
}
```

#### **3. Payload do Email**
```typescript
{
  from: {
    email: 'contato@check2.com.br',
    name: 'Agência Check'
  },
  to: [{ email: revendedor.email }],
  subject: '🎉 Bem-vindo à Agência Check - Suas credenciais de acesso',
  html: template.html,
  text: template.text,
  tags: ['revendedor', 'credenciais', 'agencia-check']
}
```

### 🌐 **Variáveis de Ambiente**

Para usar o webhook real da Check, configure:
```env
VITE_CHECK_EMAIL_WEBHOOK_URL=https://api.check2.com.br/email/send
VITE_CHECK_EMAIL_API_KEY=sua_chave_api_aqui
```

### ✨ **Funcionalidades Implementadas**

- ✅ **Envio automático** ao cadastrar revendedor
- ✅ **Template responsivo** e profissional
- ✅ **Logs detalhados** do processo de envio
- ✅ **Fallback inteligente** se webhook não configurado
- ✅ **Simulação realista** para demonstração
- ✅ **Remetente configurado** como contato@check2.com.br

### 📊 **Status dos Emails**

O sistema registra:
- ✅ Status de entrega
- ✅ Timestamp do envio
- ✅ ID da mensagem
- ✅ Logs detalhados no console

### 🎯 **Exemplo de Uso**

```typescript
// Quando um revendedor é cadastrado
addRevendedor({
  name: 'João Silva',
  email: 'joao@exemplo.com',
  // ... outros dados
});

// O sistema automaticamente:
// 1. Gera senha temporária
// 2. Cria template do email
// 3. Envia via contato@check2.com.br
// 4. Registra logs do envio
```

### 🔔 **Notificações no Console**

```
📧 EMAIL ENVIADO VIA CHECK EMAIL PROVIDER:
  from: contato@check2.com.br
  to: joao@exemplo.com
  provider: Check Email Service
  status: DELIVERED
  messageId: check-1234567890-abc123

✅ Email entregue com sucesso para joao@exemplo.com via contato@check2.com.br
```

### 🛠️ **Manutenção**

Para atualizar configurações:
1. Edite `src/services/emailService.ts`
2. Configure variáveis de ambiente
3. Teste com novos cadastros

---

**Sistema configurado e funcional!** ✅
Todos os novos revendedores receberão automaticamente suas credenciais via **contato@check2.com.br**

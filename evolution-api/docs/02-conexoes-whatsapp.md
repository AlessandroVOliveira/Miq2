# Tipos de Conexão WhatsApp

O Evolution API suporta múltiplas formas de conexão com o WhatsApp, cada uma com suas características, vantagens e limitações.

## 1. WhatsApp API - Baileys

### Descrição

A conexão via **Baileys** é uma API gratuita baseada no WhatsApp Web, utilizando a biblioteca open-source [Baileys](https://github.com/WhiskeySockets/Baileys).

### Características

| Aspecto | Descrição |
|---------|-----------|
| **Custo** | Gratuito |
| **Autenticação** | QR Code (similar ao WhatsApp Web) |
| **Tipo de Conta** | Qualquer conta WhatsApp (pessoal ou business) |
| **Limitações** | Baseado em engenharia reversa, pode sofrer bloqueios |
| **Multi-device** | Suportado |

### Funcionalidades Suportadas

- ✅ Enviar/receber mensagens de texto
- ✅ Enviar/receber mídia (imagens, vídeos, documentos, áudios)
- ✅ Criar e gerenciar grupos
- ✅ Status (Stories)
- ✅ Mensagens de voz (PTT)
- ✅ Stickers
- ✅ Reações a mensagens
- ✅ Respostas e citações
- ✅ Botões e listas (can vary)
- ✅ Presença online/offline
- ✅ Leitura de mensagens
- ✅ Exclusão de mensagens

### Fluxo de Conexão

```
1. Criar instância via API
2. Chamar endpoint /connect
3. Receber QR Code (base64 ou terminal)
4. Escanear com WhatsApp do celular
5. Conexão estabelecida
6. Sessão salva para reconexão automática
```

### Considerações

> ⚠️ **Atenção**: Por ser baseado em engenharia reversa do WhatsApp Web, esta conexão:
> - Pode violar os Termos de Serviço do WhatsApp
> - Está sujeita a mudanças sem aviso prévio
> - Pode resultar em banimento da conta em casos de uso abusivo
> - Recomendado para casos de uso legítimos e volume moderado

---

## 2. WhatsApp Cloud API (Meta Business API)

### Descrição

A **WhatsApp Cloud API** é a API oficial fornecida pela Meta (Facebook), projetada para empresas que precisam de alta confiabilidade e suporte oficial.

### Características

| Aspecto | Descrição |
|---------|-----------|
| **Custo** | Pago (por mensagem ou conversa) |
| **Autenticação** | Token de acesso via Facebook Business |
| **Tipo de Conta** | Apenas WhatsApp Business verificada |
| **Limitações** | Templates pré-aprovados para mensagens outbound |
| **Confiabilidade** | Alta, suporte oficial da Meta |

### Funcionalidades Suportadas

- ✅ Enviar mensagens via templates aprovados
- ✅ Mensagens de sessão (24h window)
- ✅ Mídia (imagens, vídeos, documentos)
- ✅ Botões interativos
- ✅ Listas
- ✅ Webhooks para receber mensagens
- ✅ Status de entrega/leitura
- ✅ Analytics avançado

### Configuração no Evolution API

```env
# Variáveis de ambiente para WhatsApp Business API
WA_BUSINESS_TOKEN_WEBHOOK=evolution
WA_BUSINESS_URL=https://graph.facebook.com
WA_BUSINESS_VERSION=v20.0
WA_BUSINESS_LANGUAGE=en_US
```

### Requisitos

1. Conta no Facebook Business Manager
2. Aplicativo registrado no Facebook Developers
3. Número de telefone verificado para WhatsApp Business
4. Templates de mensagem aprovados (para mensagens proativas)

---

## Comparativo

| Funcionalidade | Baileys | Meta Business API |
|----------------|---------|-------------------|
| **Custo** | Gratuito | Pago |
| **Setup** | Simples (QR) | Complexo (aprovação Meta) |
| **Confiabilidade** | Média | Alta |
| **Suporte** | Comunidade | Oficial Meta |
| **Templates** | Não requer | Requer aprovação |
| **Volume** | Moderado | Alto |
| **Risco de Bloqueio** | Existe | Mínimo |
| **Analytics** | Básico | Avançado |
| **Grupos** | Completo | Limitado |
| **Status/Stories** | Sim | Não |

## Recomendações de Uso

### Use Baileys quando:
- Projeto pessoal ou interno
- Orçamento limitado
- Precisa de funcionalidades não disponíveis na API oficial
- Volume de mensagens é baixo a moderado
- Aceita o risco de instabilidade ocasional

### Use Meta Business API quando:
- Aplicação comercial em produção
- Alto volume de mensagens
- Precisa de suporte oficial
- Compliance e regulamentação são importantes
- Métricas e analytics são essenciais

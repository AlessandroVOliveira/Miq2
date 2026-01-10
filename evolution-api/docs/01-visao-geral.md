# Visão Geral

## O que é o Evolution API?

Evolution API é uma **API REST para comunicação via WhatsApp** que começou como um controlador baseado no [CodeChat](https://github.com/code-chat-br/whatsapp-api), implementando a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys). 

Hoje, o Evolution API evoluiu para uma **plataforma abrangente** que suporta múltiplos serviços de mensageria e integrações, indo muito além do WhatsApp básico.

## Arquitetura

### Estrutura Multi-Tenant SaaS

```
┌─────────────────────────────────────────────────────────────────┐
│                      Evolution API Server                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Instance A  │  │ Instance B  │  │ Instance C  │  ...         │
│  │ (WhatsApp)  │  │ (WhatsApp)  │  │ (WhatsApp)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  Integrações: Typebot | Chatwoot | OpenAI | Dify | Flowise     │
├─────────────────────────────────────────────────────────────────┤
│  Eventos: Webhook | WebSocket | RabbitMQ | SQS | Kafka | NATS   │
├─────────────────────────────────────────────────────────────────┤
│  Banco de Dados: PostgreSQL / MySQL (Prisma ORM)                │
│  Cache: Redis / Node-Cache                                       │
│  Storage: S3 / MinIO                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Estrutura do Código

```
src/
├── api/
│   ├── controllers/     # Handlers de rotas HTTP (camada fina)
│   ├── services/        # Lógica de negócio (core)
│   ├── repository/      # Camada de acesso a dados (Prisma)
│   ├── dto/             # Data Transfer Objects
│   ├── guards/          # Middleware de autenticação/autorização
│   ├── integrations/    # Integrações com serviços externos
│   │   ├── channel/     # Providers WhatsApp (Baileys, Business API)
│   │   ├── chatbot/     # Integrações AI/Bot (OpenAI, Dify, Typebot)
│   │   ├── event/       # Sistemas de eventos (WebSocket, RabbitMQ)
│   │   └── storage/     # Armazenamento de arquivos (S3, MinIO)
│   ├── routes/          # Definições de rotas Express
│   └── types/           # Definições de tipos TypeScript
├── config/              # Configuração de ambiente
├── cache/               # Implementações de cache Redis/local
├── exceptions/          # Classes de exceção HTTP customizadas
├── utils/               # Utilitários compartilhados
└── validate/            # Schemas de validação JSONSchema7
```

## Conceitos-Chave

### Instância

Uma **instância** representa uma conexão individual com o WhatsApp. Cada instância:

- Possui um nome único
- Mantém sua própria sessão (autenticação QR Code ou API Token)
- Tem configurações independentes de webhook, integrações, etc.
- É isolada de outras instâncias no mesmo servidor

### Multi-Provider

O Evolution API suporta diferentes formas de conectar ao WhatsApp:

1. **Baileys** - Conexão via WhatsApp Web (gratuito, baseado em engenharia reversa)
2. **Meta Business API** - API oficial do WhatsApp Business (pago, oficial)
3. **Evolution API** - Integração customizada

### Event-Driven Architecture

A arquitetura é orientada a eventos, permitindo que sistemas externos recebam notificações sobre:

- Mensagens recebidas/enviadas
- Atualizações de conexão
- Mudanças em grupos
- Status de presença
- E muito mais...

## Casos de Uso Comuns

| Caso de Uso | Descrição |
|-------------|-----------|
| **Chatbot de Atendimento** | Integrar com Typebot/Dify para criar fluxos de atendimento automatizado |
| **CRM WhatsApp** | Usar com Chatwoot para atendimento ao cliente via WhatsApp |
| **Automação de Marketing** | Enviar mensagens em massa, enquetes, notificações |
| **Integração com Sistemas** | Conectar ERP/CRM existentes via webhooks |
| **Bot com IA** | Usar OpenAI para criar assistentes virtuais inteligentes |
| **Multi-Atendentes** | Gerenciar múltiplas contas WhatsApp em uma única API |

## Requisitos do Sistema

- **Node.js**: 20.x ou superior
- **Banco de Dados**: PostgreSQL 13+ ou MySQL 8+
- **Redis**: Opcional, mas recomendado para produção
- **Docker**: Suportado para deploy containerizado

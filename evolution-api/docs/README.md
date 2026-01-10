# Evolution API - Documentação

Esta documentação descreve as capacidades e funcionalidades do projeto Evolution API.

## Índice

1. [Visão Geral](./01-visao-geral.md)
2. [Tipos de Conexão WhatsApp](./02-conexoes-whatsapp.md)
3. [API de Mensagens](./03-api-mensagens.md)
4. [Gerenciamento de Instâncias](./04-gerenciamento-instancias.md)
5. [Gerenciamento de Grupos](./05-gerenciamento-grupos.md)
6. [Gerenciamento de Chats](./06-gerenciamento-chats.md)
7. [Integrações de Chatbot](./07-integracoes-chatbot.md)
8. [Sistema de Eventos](./08-sistema-eventos.md)
9. [Armazenamento de Mídia](./09-armazenamento-midia.md)
10. [Configuração e Variáveis de Ambiente](./10-configuracao.md)

---

## Resumo Rápido

**Evolution API** é uma API REST poderosa e pronta para produção para comunicação via WhatsApp. Suporta múltiplas formas de conexão com o WhatsApp e oferece integrações extensivas com chatbots, sistemas de CRM e plataformas de mensageria.

### Principais Capacidades

| Funcionalidade | Descrição |
|---------------|-----------|
| **Multi-Provider WhatsApp** | Baileys (WhatsApp Web) e Meta Business API |
| **Multi-Tenant** | Arquitetura com isolamento completo por instância |
| **Envio de Mensagens** | Texto, mídia, áudio, localização, contatos, enquetes, botões, listas |
| **Grupos** | Criar, gerenciar, convidar, atualizar participantes |
| **Chatbots** | OpenAI, Typebot, Chatwoot, Dify, Flowise, N8N |
| **Eventos** | Webhook, WebSocket, RabbitMQ, SQS, NATS, Pusher, Kafka |
| **Armazenamento** | Amazon S3, MinIO |
| **Banco de Dados** | PostgreSQL, MySQL via Prisma ORM |
| **Cache** | Redis com fallback para cache local |

### Stack Tecnológico

- **Runtime**: Node.js 20+
- **Linguagem**: TypeScript 5+
- **Framework**: Express.js
- **ORM**: Prisma
- **WhatsApp**: Baileys 7.0.0

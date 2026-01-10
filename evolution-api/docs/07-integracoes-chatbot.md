# Integrações de Chatbot

O Evolution API oferece integrações nativas com diversas plataformas de chatbot e IA, permitindo criar fluxos de atendimento automatizados.

## Integrações Disponíveis

| Integração | Tipo | Descrição |
|------------|------|-----------|
| **OpenAI** | IA Generativa | GPT + Whisper para transcrição de áudio |
| **Typebot** | Visual Builder | Construtor visual de fluxos de conversação |
| **Chatwoot** | CRM/Helpdesk | Plataforma de atendimento ao cliente |
| **Dify** | IA Workflow | Plataforma de agentes e workflows de IA |
| **Flowise** | LangChain Builder | Construtor visual de fluxos LangChain |
| **N8N** | Automação | Plataforma de automação de workflows |
| **EvoAI** | IA Customizada | Integração de IA customizada |
| **EvolutionBot** | Bot Nativo | Sistema de bot nativo com triggers |

---

## 1. OpenAI

### Descrição

Integração com a API da OpenAI para:
- **GPT**: Respostas inteligentes baseadas em IA
- **Whisper**: Transcrição automática de áudios recebidos

### Configuração

```env
OPENAI_ENABLED=true
```

### Configuração por Instância

```json
{
  "openai": {
    "enabled": true,
    "apiKey": "sk-...",
    "model": "gpt-4",
    "systemPrompt": "Você é um assistente virtual...",
    "maxTokens": 500,
    "temperature": 0.7,
    "transcribeAudio": true,
    "triggers": ["atendimento", "ajuda"]
  }
}
```

### Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| Chat Completions | Respostas automáticas via GPT |
| Transcrição de Áudio | Converte áudios recebidos em texto via Whisper |
| Triggers | Palavras-chave que ativam o bot |
| Context | Mantém histórico de conversa |

---

## 2. Typebot

### Descrição

[Typebot](https://typebot.io/) é um construtor visual de chatbots que permite criar fluxos de conversação sem código.

### Configuração

```env
TYPEBOT_ENABLED=true
TYPEBOT_API_VERSION=latest
```

### Configuração por Instância

```json
{
  "typebot": {
    "enabled": true,
    "url": "https://typebot.io",
    "typebot": "nome-do-typebot",
    "expire": 60,
    "delayMessage": 1000,
    "unknownMessage": "Desculpe, não entendi.",
    "listeningFromMe": false,
    "stopBotFromMe": true,
    "keepOpen": false,
    "triggers": ["iniciar", "menu"]
  }
}
```

### Parâmetros

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `url` | string | URL do servidor Typebot |
| `typebot` | string | Nome do bot a ser usado |
| `expire` | number | Tempo (min) para expirar sessão |
| `delayMessage` | number | Delay entre mensagens (ms) |
| `unknownMessage` | string | Mensagem para entrada não reconhecida |
| `listeningFromMe` | boolean | Processar mensagens enviadas pela instância |
| `stopBotFromMe` | boolean | Parar bot quando instância envia mensagem |
| `keepOpen` | boolean | Manter sessão aberta |
| `triggers` | string[] | Palavras que iniciam o bot |

---

## 3. Chatwoot

### Descrição

[Chatwoot](https://www.chatwoot.com/) é uma plataforma open-source de atendimento ao cliente que se integra diretamente com o Evolution API.

### Configuração

```env
CHATWOOT_ENABLED=true
CHATWOOT_MESSAGE_READ=true
CHATWOOT_MESSAGE_DELETE=true
CHATWOOT_BOT_CONTACT=true
CHATWOOT_IMPORT_DATABASE_CONNECTION_URI=postgresql://...
CHATWOOT_IMPORT_PLACEHOLDER_MEDIA_MESSAGE=true
```

### Configuração por Instância

```json
{
  "chatwoot": {
    "enabled": true,
    "accountId": "1",
    "token": "token-do-chatwoot",
    "url": "https://chatwoot.example.com",
    "signMsg": true,
    "reopenConversation": true,
    "conversationPending": false,
    "mergeBrazilContacts": true,
    "importContacts": true,
    "importMessages": true,
    "daysLimitImportMessages": 7,
    "organization": "Minha Empresa",
    "nameInbox": "WhatsApp Bot"
  }
}
```

### Funcionalidades

- ✅ Sincronização bidirecional de mensagens
- ✅ Importação de histórico de conversas
- ✅ Importação de contatos
- ✅ Atualização de status de mensagens
- ✅ Suporte a múltiplos atendentes
- ✅ Integração com inbox do Chatwoot

---

## 4. Dify

### Descrição

[Dify](https://dify.ai/) é uma plataforma de desenvolvimento de aplicações LLM que permite criar agentes de IA e workflows.

### Configuração

```env
DIFY_ENABLED=true
```

### Configuração por Instância

```json
{
  "dify": {
    "enabled": true,
    "apiUrl": "https://api.dify.ai/v1",
    "apiKey": "app-...",
    "botType": "chatbot",
    "expire": 60,
    "triggers": ["dify", "assistente"]
  }
}
```

### Tipos de Bot

| Tipo | Descrição |
|------|-----------|
| `chatbot` | Chatbot conversacional |
| `textGenerator` | Gerador de texto |
| `agent` | Agente autônomo |
| `workflow` | Workflow de IA |

---

## 5. Flowise

### Descrição

[Flowise](https://flowiseai.com/) é um construtor visual de fluxos LangChain, permitindo criar aplicações de IA complexas sem código.

### Configuração por Instância

```json
{
  "flowise": {
    "enabled": true,
    "apiUrl": "https://flowise.example.com",
    "apiKey": "flow-...",
    "expire": 60,
    "triggers": ["flow", "ai"]
  }
}
```

---

## 6. N8N

### Descrição

[N8N](https://n8n.io/) é uma plataforma de automação de workflows que pode ser integrada para processar mensagens do WhatsApp.

### Configuração

```env
N8N_ENABLED=true
```

### Configuração por Instância

```json
{
  "n8n": {
    "enabled": true,
    "url": "https://n8n.example.com/webhook/...",
    "expire": 60,
    "triggers": ["automacao"]
  }
}
```

---

## 7. EvoAI

### Descrição

Integração customizada de IA desenvolvida para o Evolution API.

### Configuração

```env
EVOAI_ENABLED=true
```

---

## 8. EvolutionBot (Bot Nativo)

### Descrição

Sistema de bot nativo do Evolution API que permite criar respostas automáticas baseadas em triggers e condições.

### Configuração

```json
{
  "evolutionBot": {
    "enabled": true,
    "expire": 60,
    "triggers": [
      {
        "trigger": "oi",
        "reply": "Olá! Como posso ajudar?",
        "type": "exact"
      },
      {
        "trigger": "preço",
        "reply": "Nossos preços estão em example.com/precos",
        "type": "contains"
      }
    ]
  }
}
```

### Tipos de Trigger

| Tipo | Descrição |
|------|-----------|
| `exact` | Correspondência exata |
| `contains` | Contém a palavra |
| `startsWith` | Começa com |
| `endsWith` | Termina com |
| `regex` | Expressão regular |

---

## Arquitetura de Chatbots

```
┌─────────────────────────────────────────────────────────────┐
│                    Mensagem Recebida                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Verificar Triggers                          │
│  (Palavras-chave configuradas para cada integração)         │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
      ┌─────────┐    ┌─────────┐    ┌─────────┐
      │ Typebot │    │ OpenAI  │    │ Dify    │  ...
      └────┬────┘    └────┬────┘    └────┬────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Resposta Enviada                            │
└─────────────────────────────────────────────────────────────┘
```

## Ordem de Prioridade

Quando múltiplas integrações estão ativas, a ordem de verificação é:

1. EvolutionBot (triggers exatos)
2. Typebot
3. OpenAI / Dify / Flowise (IA)
4. Chatwoot (fallback para atendimento humano)

## Boas Práticas

1. **Use triggers específicos** para evitar conflitos entre integrações
2. **Configure timeouts** adequados para evitar sessões obsoletas
3. **Implemente fallback** para atendimento humano quando necessário
4. **Monitore logs** para identificar problemas de integração
5. **Teste isoladamente** cada integração antes de combinar

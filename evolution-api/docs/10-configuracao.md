# Configuração e Variáveis de Ambiente

Esta seção documenta todas as variáveis de ambiente disponíveis para configuração do Evolution API.

## Servidor

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `SERVER_NAME` | `evolution` | Nome do servidor |
| `SERVER_TYPE` | `http` | Tipo: `http` ou `https` |
| `SERVER_PORT` | `8080` | Porta do servidor |
| `SERVER_URL` | `http://localhost:8080` | URL pública da API |

### SSL/HTTPS

```env
SSL_CONF_PRIVKEY=/path/to/cert.key
SSL_CONF_FULLCHAIN=/path/to/cert.crt
```

---

## Banco de Dados

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DATABASE_PROVIDER` | `postgresql` | Provider: `postgresql`, `mysql`, `psql_bouncer` |
| `DATABASE_CONNECTION_URI` | - | String de conexão |
| `DATABASE_CONNECTION_CLIENT_NAME` | `evolution_exchange` | Identificador da instância |

### Exemplo PostgreSQL

```env
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI='postgresql://user:pass@localhost:5432/evolution_db?schema=evolution_api'
```

### Exemplo MySQL

```env
DATABASE_PROVIDER=mysql
DATABASE_CONNECTION_URI='mysql://user:pass@localhost:3306/evolution_db'
```

### Salvamento de Dados

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DATABASE_SAVE_DATA_INSTANCE` | `true` | Salvar dados da instância |
| `DATABASE_SAVE_DATA_NEW_MESSAGE` | `true` | Salvar novas mensagens |
| `DATABASE_SAVE_MESSAGE_UPDATE` | `true` | Salvar atualizações |
| `DATABASE_SAVE_DATA_CONTACTS` | `true` | Salvar contatos |
| `DATABASE_SAVE_DATA_CHATS` | `true` | Salvar chats |
| `DATABASE_SAVE_DATA_LABELS` | `true` | Salvar labels |
| `DATABASE_SAVE_DATA_HISTORIC` | `true` | Salvar histórico |
| `DATABASE_SAVE_IS_ON_WHATSAPP` | `true` | Cache de verificação |
| `DATABASE_SAVE_IS_ON_WHATSAPP_DAYS` | `7` | Dias de cache |
| `DATABASE_DELETE_MESSAGE` | `true` | Permitir deleção |

---

## Cache (Redis)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `CACHE_REDIS_ENABLED` | `true` | Habilitar Redis |
| `CACHE_REDIS_URI` | - | URI de conexão |
| `CACHE_REDIS_TTL` | `604800` | TTL em segundos (7 dias) |
| `CACHE_REDIS_PREFIX_KEY` | `evolution` | Prefixo das chaves |
| `CACHE_REDIS_SAVE_INSTANCES` | `false` | Salvar instâncias no Redis |
| `CACHE_LOCAL_ENABLED` | `false` | Habilitar cache local (fallback) |

```env
CACHE_REDIS_URI=redis://localhost:6379/6
```

---

## Autenticação

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `AUTHENTICATION_API_KEY` | - | API Key global |
| `AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES` | `true` | Expor instâncias no fetch |

---

## Instâncias

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DEL_INSTANCE` | `false` | Tempo (min) para deletar instância inativa. `false` = nunca |
| `CONFIG_SESSION_PHONE_CLIENT` | `Evolution API` | Nome exibido no celular |
| `CONFIG_SESSION_PHONE_NAME` | `Chrome` | Nome do browser |

---

## QR Code

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `QRCODE_LIMIT` | `30` | Limite de tentativas |
| `QRCODE_COLOR` | `#175197` | Cor do QR Code |

---

## Logs

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `LOG_LEVEL` | `ERROR,WARN,DEBUG,INFO,LOG,VERBOSE,DARK,WEBHOOKS,WEBSOCKET` | Níveis de log |
| `LOG_COLOR` | `true` | Colorir logs |
| `LOG_BAILEYS` | `error` | Nível do Baileys: `fatal`, `error`, `warn`, `info`, `debug`, `trace` |

---

## CORS

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `CORS_ORIGIN` | `*` | Origens permitidas |
| `CORS_METHODS` | `GET,POST,PUT,DELETE` | Métodos permitidos |
| `CORS_CREDENTIALS` | `true` | Permitir credenciais |

---

## Proxy

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PROXY_HOST` | - | Host do proxy |
| `PROXY_PORT` | - | Porta do proxy |
| `PROXY_PROTOCOL` | - | Protocolo: `http`, `https`, `socks5` |
| `PROXY_USERNAME` | - | Usuário do proxy |
| `PROXY_PASSWORD` | - | Senha do proxy |

---

## Webhook

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `WEBHOOK_GLOBAL_ENABLED` | `false` | Habilitar webhook global |
| `WEBHOOK_GLOBAL_URL` | - | URL do webhook global |
| `WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS` | `false` | URL por evento |
| `WEBHOOK_REQUEST_TIMEOUT_MS` | `60000` | Timeout da requisição |
| `WEBHOOK_RETRY_MAX_ATTEMPTS` | `10` | Máximo de tentativas |
| `WEBHOOK_RETRY_INITIAL_DELAY_SECONDS` | `5` | Delay inicial |
| `WEBHOOK_RETRY_USE_EXPONENTIAL_BACKOFF` | `true` | Backoff exponencial |
| `WEBHOOK_RETRY_MAX_DELAY_SECONDS` | `300` | Delay máximo |
| `WEBHOOK_RETRY_JITTER_FACTOR` | `0.2` | Fator de jitter |
| `WEBHOOK_RETRY_NON_RETRYABLE_STATUS_CODES` | `400,401,403,404,422` | Status sem retry |

### Eventos do Webhook

```env
WEBHOOK_EVENTS_APPLICATION_STARTUP=false
WEBHOOK_EVENTS_QRCODE_UPDATED=true
WEBHOOK_EVENTS_MESSAGES_SET=true
WEBHOOK_EVENTS_MESSAGES_UPSERT=true
WEBHOOK_EVENTS_MESSAGES_EDITED=true
WEBHOOK_EVENTS_MESSAGES_UPDATE=true
WEBHOOK_EVENTS_MESSAGES_DELETE=true
WEBHOOK_EVENTS_SEND_MESSAGE=true
WEBHOOK_EVENTS_CONTACTS_SET=true
WEBHOOK_EVENTS_CONTACTS_UPSERT=true
WEBHOOK_EVENTS_CONTACTS_UPDATE=true
WEBHOOK_EVENTS_PRESENCE_UPDATE=true
WEBHOOK_EVENTS_CHATS_SET=true
WEBHOOK_EVENTS_CHATS_UPSERT=true
WEBHOOK_EVENTS_CHATS_UPDATE=true
WEBHOOK_EVENTS_CHATS_DELETE=true
WEBHOOK_EVENTS_GROUPS_UPSERT=true
WEBHOOK_EVENTS_GROUPS_UPDATE=true
WEBHOOK_EVENTS_GROUP_PARTICIPANTS_UPDATE=true
WEBHOOK_EVENTS_CONNECTION_UPDATE=true
WEBHOOK_EVENTS_LABELS_EDIT=true
WEBHOOK_EVENTS_LABELS_ASSOCIATION=true
WEBHOOK_EVENTS_CALL=true
WEBHOOK_EVENTS_TYPEBOT_START=false
WEBHOOK_EVENTS_TYPEBOT_CHANGE_STATUS=false
WEBHOOK_EVENTS_ERRORS=false
WEBHOOK_EVENTS_ERRORS_WEBHOOK=
```

---

## WebSocket

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `WEBSOCKET_ENABLED` | `false` | Habilitar WebSocket |
| `WEBSOCKET_GLOBAL_EVENTS` | `false` | Eventos globais |
| `WEBSOCKET_ALLOWED_HOSTS` | `127.0.0.1,::1` | Hosts permitidos |

---

## Integrações de Chatbot

### Typebot

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `TYPEBOT_ENABLED` | `false` | Habilitar Typebot |
| `TYPEBOT_API_VERSION` | `latest` | Versão da API: `old`, `latest` |

### Chatwoot

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `CHATWOOT_ENABLED` | `false` | Habilitar Chatwoot |
| `CHATWOOT_MESSAGE_READ` | `true` | Sincronizar leitura |
| `CHATWOOT_MESSAGE_DELETE` | `true` | Sincronizar deleção |
| `CHATWOOT_BOT_CONTACT` | `true` | Criar contato bot |
| `CHATWOOT_IMPORT_DATABASE_CONNECTION_URI` | - | URI do Chatwoot DB |
| `CHATWOOT_IMPORT_PLACEHOLDER_MEDIA_MESSAGE` | `true` | Placeholder para mídia |

### OpenAI

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `OPENAI_ENABLED` | `false` | Habilitar OpenAI |

### Dify

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DIFY_ENABLED` | `false` | Habilitar Dify |

### N8N

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `N8N_ENABLED` | `false` | Habilitar N8N |

### EvoAI

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `EVOAI_ENABLED` | `false` | Habilitar EvoAI |

---

## Armazenamento S3/MinIO

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `S3_ENABLED` | `false` | Habilitar S3 |
| `S3_ACCESS_KEY` | - | Access key |
| `S3_SECRET_KEY` | - | Secret key |
| `S3_BUCKET` | `evolution` | Nome do bucket |
| `S3_PORT` | `443` | Porta |
| `S3_ENDPOINT` | - | Endpoint |
| `S3_REGION` | - | Região |
| `S3_USE_SSL` | `true` | Usar SSL |

---

## Monitoramento

### Telemetria

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `TELEMETRY_ENABLED` | `true` | Habilitar telemetria |
| `TELEMETRY_URL` | - | URL de telemetria |

### Prometheus Metrics

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PROMETHEUS_METRICS` | `false` | Habilitar métricas |
| `METRICS_AUTH_REQUIRED` | `true` | Requer autenticação |
| `METRICS_USER` | `prometheus` | Usuário |
| `METRICS_PASSWORD` | - | Senha |
| `METRICS_ALLOWED_IPS` | - | IPs permitidos |

### Sentry

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `SENTRY_DSN` | - | DSN do Sentry |

---

## WhatsApp Business API

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `WA_BUSINESS_TOKEN_WEBHOOK` | `evolution` | Token do webhook |
| `WA_BUSINESS_URL` | `https://graph.facebook.com` | URL da API |
| `WA_BUSINESS_VERSION` | `v20.0` | Versão da API |
| `WA_BUSINESS_LANGUAGE` | `en_US` | Idioma padrão |

---

## Outros

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `LANGUAGE` | `en` | Idioma da API |
| `EVENT_EMITTER_MAX_LISTENERS` | `50` | Máximo de listeners |
| `API_AUDIO_CONVERTER` | - | URL do conversor de áudio |
| `API_AUDIO_CONVERTER_KEY` | - | API key do conversor |

---

## Arquivo .env de Exemplo

```env
# Servidor
SERVER_NAME=evolution
SERVER_TYPE=http
SERVER_PORT=8080
SERVER_URL=http://localhost:8080

# Banco de Dados
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI='postgresql://evolution:evolution@localhost:5432/evolution?schema=public'
DATABASE_CONNECTION_CLIENT_NAME=evolution

# Cache
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6379/0
CACHE_REDIS_PREFIX_KEY=evolution

# Autenticação
AUTHENTICATION_API_KEY=minha-api-key-segura

# Logs
LOG_LEVEL=ERROR,WARN,INFO
LOG_COLOR=true
LOG_BAILEYS=error

# CORS
CORS_ORIGIN=*

# Instâncias
DEL_INSTANCE=false

# Integrações (desabilitadas por padrão)
TYPEBOT_ENABLED=false
CHATWOOT_ENABLED=false
OPENAI_ENABLED=false
WEBSOCKET_ENABLED=false
```
